// Song 73 "This Isn't What I Ordered" → an American sit-down dinner at Lucia's Trattoria.
// Host Lucia (npc marco_host) greets and seats the learner (reservation or walk-in, party
// size, wait time, table preference); server Marco takes the drink and food order (specials,
// questions about the menu, allergies, steak doneness, sides), serves the food, checks back,
// offers dessert, brings the check (together or separate) and the card reader asks for the tip
// (not included in the US: 15–20 %).
// Twists (visits ≥ 1): the wrong dish arrives; the soup is cold. Other variation: the window
// tables are taken, a wait for walk-ins, specials, "How are you doing tonight?", a to-go box.
//
// NEEDS (engine, not changed here): the NLU gives the expected-intent bonus to every segment, so
// one answer is often cut into several segments ("a glass of red" + "wine", "the minestrone" +
// "soup", "medium" + "rare"). freshItems() drops such bare tails and doneFromText() reads the
// doneness from the heard text; one bonus per parse would make both unnecessary.

import type { Ctx, EntityDef, SituationDef, Tip } from "../types";
import { ent, t } from "../dsl";
import { expectHowAreYou } from "../global";

// ---------------------------------------------------------------------------
// Menu

const VANDUO = "vanduo/vandens/vandeniui/vandenį/vandeniu/vandenyje";
const VYNAS = "vynas/vyno/vynui/vyną/vynu/vyne";
const KOLA = "kola/kolos/kolai/kolą/kola/koloje";
const KAVA = "kava/kavos/kavai/kavą/kava/kavoje";
const ARBATA = "arbata/arbatos/arbatai/arbatą/arbata/arbatoje";
const SALOTOS = "salotos/salotų/salotoms/salotas/salotomis/salotose";
const GRILLED_F = "ant grotelių kepta/ant grotelių keptos/ant grotelių keptai/ant grotelių keptą/ant grotelių kepta/ant grotelių keptoje";

const DRINKS: EntityDef[] = [
  ent("water", "water", VANDUO, "m", { art: "", forms: ["waters", "glass of water", "just water"], chip: "vanduo", attrs: { generic: "water", price: 0 } }),
  ent("tap_water", "tap | water", `vandentiekio | ${VANDUO}`, "m", { art: "",
    forms: ["tap water", "ice water", "tap", "plain water", "regular water", "water from the tap", "the free one", "free one", "free water", "the free water"], chip: "vanduo iš čiaupo", attrs: { family: "water", price: 0 } }),
  ent("still_water", "still | water", `negazuotas/negazuoto/negazuotam/negazuotą/negazuotu/negazuotame | ${VANDUO}`, "m", { art: "",
    forms: ["still water", "still", "flat water", "bottled water", "still mineral water", "bottled", "flat", "without gas", "no gas", "water without gas"], chip: "negazuotas vanduo", attrs: { family: "water", price: 400 } }),
  ent("sparkling_water", "sparkling | water", `gazuotas/gazuoto/gazuotam/gazuotą/gazuotu/gazuotame | ${VANDUO}`, "m", { art: "",
    forms: ["sparkling water", "sparkling", "fizzy water", "soda water", "club soda", "seltzer", "mineral water", "carbonated water",
      "pellegrino", "san pellegrino", "perrier", "water with gas", "sparkling mineral water", "with gas", "fizzy", "bubbly water"], chip: "gazuotas vanduo", attrs: { family: "water", price: 400 } }),
  ent("lemonade", "lemonade", "limonadas/limonado/limonadui/limonadą/limonadu/limonade", "m", { pl: "lemonades",
    forms: ["lemonades", "pink lemonade", "fresh lemonade", "homemade lemonade", "lemonde"], attrs: { price: 400, refill: true } }),
  ent("iced_tea", "iced | tea", `ledinė/ledinės/ledinei/ledinę/ledine/ledinėje | ${ARBATA}`, "f", {
    forms: ["iced tea", "ice tea", "iced teas", "sweet tea", "unsweetened iced tea", "unsweet tea"], attrs: { price: 400, refill: true } }),
  ent("soda", "soda", "gazuotas gėrimas/gazuoto gėrimo/gazuotam gėrimui/gazuotą gėrimą/gazuotu gėrimu/gazuotame gėrime", "m", {
    forms: ["sodas", "soft drink", "soft drinks", "pop", "fizzy drink", "a fizzy drink"], chip: "gazuotas gėrimas", attrs: { generic: "soda", price: 300 } }),
  ent("coke", "Coke", KOLA, "f", { pl: "Cokes", forms: ["coke", "cokes", "coca cola", "cola", "pepsi", "coca-cola"], attrs: { family: "soda", price: 300, refill: true } }),
  ent("diet_coke", "Diet | Coke", `dietinė/dietinės/dietinei/dietinę/dietine/dietinėje | ${KOLA}`, "f", {
    forms: ["diet coke", "diet cokes", "coke zero", "diet pepsi", "diet cola"], chip: "dietinė kola", attrs: { family: "soda", price: 300, refill: true } }),
  ent("sprite", "Sprite", "„Sprite“", "m", { forms: ["sprite", "sprites", "seven up", "7 up", "7up", "lemon lime soda"], attrs: { family: "soda", price: 300, refill: true } }),
  ent("red_wine", "red | wine", `raudonas/raudono/raudonam/raudoną/raudonu/raudoname | ${VYNAS}`, "m", {
    forms: ["red wine", "red", "house red", "the house red", "red wines", "chianti", "a chianti", "merlot", "cabernet", "pinot noir"],
    chip: "raudonas vynas", attrs: { family: "wine", wine: true, price: 1100 } }),
  ent("white_wine", "white | wine", `baltas/balto/baltam/baltą/baltu/baltame | ${VYNAS}`, "m", {
    forms: ["white wine", "white", "house white", "the house white", "pinot grigio", "chardonnay", "sauvignon blanc", "white wines"],
    chip: "baltas vynas", attrs: { family: "wine", wine: true, price: 1000 } }),
  ent("wine", "wine", VYNAS, "m", { forms: ["wines", "house wine", "the house wine", "vino"], attrs: { generic: "wine", wine: true, price: 1000 } }),
  ent("beer", "beer", "alus/alaus/alui/alų/alumi/aluje", "m", { pl: "beers",
    forms: ["beers", "draft beer", "peroni", "lager", "ipa", "bottle of beer", "a bottle of beer"], attrs: { price: 700 } }),
  ent("coffee", "coffee", KAVA, "f", { forms: ["coffees", "cup of coffee"], attrs: { generic: "coffee", price: 300 } }),
  ent("regular_coffee", "regular | coffee", `paprasta/paprastos/paprastai/paprastą/paprasta/paprastoje | ${KAVA}`, "f", {
    forms: ["regular coffee", "normal coffee", "caffeinated coffee"], chip: "paprasta kava", attrs: { family: "coffee", price: 300 } }),
  ent("decaf", "decaf", "kava be kofeino/kavos be kofeino/kavai be kofeino/kavą be kofeino/kava be kofeino/kavoje be kofeino", "f", {
    forms: ["decaf", "decaf coffee", "decaffeinated coffee", "decaffeinated", "decafe"], chip: "kava be kofeino", attrs: { family: "coffee", price: 300 } }),
  ent("espresso", "espresso", "espresas/espreso/espresui/espresą/espresu/esprese", "m", { pl: "espressos",
    forms: ["espressos", "expresso"], attrs: { family: "coffee", price: 400 } }),
  ent("cappuccino", "cappuccino", "kapučino", "m", { pl: "cappuccinos", forms: ["cappuccinos", "cappucino", "capuccino"], attrs: { family: "coffee", price: 500 } }),
  ent("tea", "tea", ARBATA, "f", { forms: ["teas", "hot tea", "herbal tea", "green tea", "black tea"], attrs: { price: 300 } }),
];

const STARTERS: EntityDef[] = [
  ent("bruschetta", "bruschetta", "brusketa/brusketos/brusketai/brusketą/brusketa/brusketoje", "f", {
    forms: ["bruschettas", "brusketta", "bruscetta", "brushetta", "bruschetta bread"], attrs: { price: 900, veg: true, desc: "desc_bruschetta" } }),
  ent("caesar_salad", "Caesar | salad", `Cezario | ${SALOTOS}`, "f", {
    forms: ["caesar salad", "caesar", "caesar salads", "cesar salad", "seasar salad"], chip: "Cezario salotos", attrs: { price: 1000, meat: false } }),
  ent("minestrone", "minestrone | soup", "minestrone | sriuba/sriubos/sriubai/sriubą/sriuba/sriuboje", "f", {
    forms: ["minestrone", "soup", "soup of the day", "vegetable soup", "minestrone soups", "a bowl of soup", "cup of soup", "the soup"],
    chip: "minestrone sriuba", attrs: { price: 700, veg: true, soup: true, desc: "desc_minestrone" } }),
  ent("garlic_bread", "garlic | bread", "česnakinė/česnakinės/česnakinei/česnakinę/česnakine/česnakinėje | duona/duonos/duonai/duoną/duona/duonoje", "f", {
    art: "", forms: ["garlic bread", "garlic breads", "bread with garlic"], chip: "česnakinė duona", attrs: { price: 600, veg: true } }),
];

const MAINS: EntityDef[] = [
  ent("lasagna", "lasagna", "lazanija/lazanijos/lazanijai/lazaniją/lazanija/lazanijoje", "f", { pl: "lasagnas",
    ltPl: "lazanijos/lazanijų/lazanijoms/lazanijas/lazanijomis/lazanijose",
    forms: ["lasagne", "lasagnas", "meat lasagna", "beef lasagna", "lazagna", "lasana"], attrs: { family: "pasta", price: 1900, comes: "salad", meat: true } }),
  ent("penne", "penne | arrabbiata", "penne | arabiata", "m", {
    forms: ["penne", "arrabbiata", "arrabiata", "arabiata", "penne arrabiata", "penne arabiata", "spicy pasta", "spicy penne", "the spicy pasta"],
    chip: "penne arabiata", attrs: { family: "pasta", price: 1700, spicy: true, veg: true, comes: "salad", desc: "desc_penne" } }),
  ent("risotto", "mushroom | risotto", "grybų | rizotas/rizoto/rizotui/rizotą/rizotu/rizote", "m", {
    forms: ["risotto", "mushroom risotto", "risottos", "rizotto", "mushroom rice"], chip: "grybų rizotas", attrs: { price: 1800, veg: true, gf: true, comes: "salad", desc: "desc_risotto" } }),
  ent("chicken_parm", "chicken | parmesan", "vištiena/vištienos/vištienai/vištieną/vištiena/vištienoje | su parmezanu", "f", {
    forms: ["chicken parmesan", "chicken parm", "chicken parmigiana", "chicken", "chicken parmesans", "chicken parmesean"],
    chip: "vištiena su parmezanu", attrs: { price: 2100, meat: true, comes: "spaghetti", desc: "desc_chicken" } }),
  ent("salmon", "grilled | salmon", `${GRILLED_F} | lašiša/lašišos/lašišai/lašišą/lašiša/lašišoje`, "f", {
    forms: ["salmon", "fish", "grilled fish", "salmon fillet", "grilled salmon", "the fish", "salmons"], chip: "lašiša", attrs: { price: 2600, side: true, gf: true, meat: true } }),
  ent("steak", "steak", "jautienos kepsnys/jautienos kepsnio/jautienos kepsniui/jautienos kepsnį/jautienos kepsniu/jautienos kepsnyje", "m", { pl: "steaks",
    ltPl: "jautienos kepsniai/jautienos kepsnių/jautienos kepsniams/jautienos kepsnius/jautienos kepsniais/jautienos kepsniuose",
    forms: ["steaks", "ribeye", "rib eye", "ribeye steak", "new york strip", "sirloin", "beef steak", "stake", "a steak"],
    chip: "jautienos kepsnys", attrs: { price: 3200, side: true, doneness: true, gf: true, meat: true } }),
  ent("burger", "burger", "mėsainis/mėsainio/mėsainiui/mėsainį/mėsainiu/mėsainyje", "m", { pl: "burgers",
    ltPl: "mėsainiai/mėsainių/mėsainiams/mėsainius/mėsainiais/mėsainiuose",
    forms: ["burgers", "hamburger", "hamburgers", "cheeseburger", "cheeseburgers"], attrs: { price: 1600, side: true, meat: true } }),
  ent("pizza", "margherita | pizza", "„Margarita“ | pica/picos/picai/picą/pica/picoje", "f", {
    forms: ["pizza", "margherita", "margarita pizza", "margherita pizza", "cheese pizza", "pizzas", "margarita", "pizza margherita", "pizza margarita"], chip: "pica „Margarita“", attrs: { price: 1500, veg: true } }),
  ent("pasta", "pasta", "makaronai/makaronų/makaronams/makaronus/makaronais/makaronuose", "m", { art: "",
    forms: ["pastas", "pasta dish", "spaghetti", "noodles"], chip: "makaronai", attrs: { generic: "pasta" } }),
];

const SIDES: EntityDef[] = [
  ent("fries", "fries", "bulvytės/bulvyčių/bulvytėms/bulvytes/bulvytėmis/bulvytėse", "f", { art: "",
    forms: ["french fries", "chips", "potato fries", "frites", "fry"], attrs: { price: 500 } }),
  ent("potatoes", "roasted | potatoes", "keptos/keptų/keptoms/keptas/keptomis/keptose | bulvės/bulvių/bulvėms/bulves/bulvėmis/bulvėse", "f", { art: "",
    forms: ["roasted potatoes", "roast potatoes", "potatoes", "roasted potato", "baked potato", "a baked potato", "potato"], chip: "keptos bulvės", attrs: { price: 500 } }),
  ent("green_salad", "green | salad", `žalios/žalių/žalioms/žalias/žaliomis/žaliose | ${SALOTOS}`, "f", {
    forms: ["side salad", "green salad", "salad", "house salad", "garden salad", "small salad", "mixed salad", "a side salad"], chip: "žalios salotos", attrs: { price: 500 } }),
  ent("vegetables", "grilled | vegetables", "ant grotelių keptos/ant grotelių keptų/ant grotelių keptoms/ant grotelių keptas/ant grotelių keptomis/ant grotelių keptose | daržovės/daržovių/daržovėms/daržoves/daržovėmis/daržovėse", "f", {
    art: "", forms: ["vegetables", "veggies", "grilled vegetables", "grilled veggies", "steamed vegetables", "mixed vegetables", "vegetable"], chip: "ant grotelių keptos daržovės", attrs: { price: 500 } }),
];

const DONENESS: EntityDef[] = [
  ent("rare", "rare", "mažai iškeptas/mažai iškepto/mažai iškeptam/mažai iškeptą/mažai iškeptu/mažai iškeptame", "m", { forms: ["bloody", "a little bloody", "with blood"], chip: "mažai iškeptas (rare)" }),
  ent("medium_rare", "medium-rare", "vidutiniškai mažai iškeptas/vidutiniškai mažai iškepto/vidutiniškai mažai iškeptam/vidutiniškai mažai iškeptą/vidutiniškai mažai iškeptu/vidutiniškai mažai iškeptame", "m", {
    forms: ["medium rare", "mid rare", "pink in the middle", "pink inside", "a little pink"], chip: "vidutiniškai mažai (medium-rare)" }),
  ent("medium", "medium", "vidutiniškai iškeptas/vidutiniškai iškepto/vidutiniškai iškeptam/vidutiniškai iškeptą/vidutiniškai iškeptu/vidutiniškai iškeptame", "m", { forms: ["in the middle", "normal"], chip: "vidutiniškai (medium)" }),
  ent("medium_well", "medium-well", "beveik gerai iškeptas/beveik gerai iškepto/beveik gerai iškeptam/beveik gerai iškeptą/beveik gerai iškeptu/beveik gerai iškeptame", "m", {
    forms: ["medium well", "medium to well"], chip: "beveik gerai (medium-well)" }),
  ent("well_done", "well-done", "gerai iškeptas/gerai iškepto/gerai iškeptam/gerai iškeptą/gerai iškeptu/gerai iškeptame", "m", {
    forms: ["well done", "fully cooked", "cooked through", "well cooked", "cooked well", "very well done", "no blood", "without blood"], chip: "gerai iškeptas (well-done)" }),
];

const DESSERTS: EntityDef[] = [
  ent("tiramisu", "tiramisu", "tiramisu", "m", { forms: ["tiramisus", "tirami su", "tiramisú"], attrs: { price: 900, desc: "desc_tiramisu" } }),
  ent("chocolate_cake", "chocolate | cake", "šokoladinis/šokoladinio/šokoladiniam/šokoladinį/šokoladiniu/šokoladiniame | tortas/torto/tortui/tortą/tortu/torte", "m", {
    forms: ["chocolate cake", "chocolate cakes", "cake", "a piece of chocolate cake", "slice of chocolate cake"], chip: "šokoladinis tortas", attrs: { price: 900, nuts: true } }),
  ent("cheesecake", "cheesecake", "sūrio pyragas/sūrio pyrago/sūrio pyragui/sūrio pyragą/sūrio pyragu/sūrio pyrage", "m", {
    forms: ["cheesecakes", "cheese cake", "new york cheesecake"], chip: "sūrio pyragas", attrs: { price: 800 } }),
  ent("panna_cotta", "panna cotta", "panakota/panakotos/panakotai/panakotą/panakota/panakotoje", "f", {
    forms: ["pannacotta", "panacotta", "pana cotta", "panna cottas"], chip: "panakota", attrs: { price: 800, desc: "desc_panna_cotta" } }),
  ent("gelato", "gelato", "ledai/ledų/ledams/ledus/ledais/leduose", "m", { art: "",
    forms: ["ice cream", "ice creams", "vanilla ice cream", "chocolate ice cream", "gelatos", "vanilla gelato", "a scoop of ice cream"], chip: "ledai", attrs: { price: 700, desc: "desc_gelato" } }),
];

const ALL = [...DRINKS, ...STARTERS, ...MAINS, ...SIDES, ...DONENESS, ...DESSERTS];
const byId = (id: string) => ALL.find((e) => e.id === id)!;

// ---------------------------------------------------------------------------
// State helpers

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
const family = (id: string) => (byId(id).attrs?.generic ?? byId(id).attrs?.family) as string | undefined;
const needsSide = (it: Item) => it.cat === "main" && !!byId(it.id).attrs?.side;
const needsDone = (it: Item) => it.cat === "main" && !!byId(it.id).attrs?.doneness;
const soupItem = (c: Ctx) => starters(c).find((i) => byId(i.id).attrs?.soup);
const mainDish = (c: Ctx) => mains(c).find((i) => !generic(i));
const party = (c: Ctx) => (c.s.party as number | undefined) ?? 1;

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

// The NLU may cut one answer into several segments ("the minestrone" + "soup", "a glass of red" +
// "wine"). A bare tail that only repeats the previous item of the same utterance is dropped.
function freshItems(c: Ctx, list: Item[]): Item[] {
  const seen: Item[] = ((c as any).__uttItems ??= []);
  const out: Item[] = [];
  for (const it of list) {
    const prev = seen[seen.length - 1];
    if (prev && it.bare) {
      const pe = byId(prev.id);
      const lastWord = pe.en.split(" | ").at(-1)!.toLowerCase();
      const e = byId(it.id);
      const forms = [e.en.split(" | ").join(" "), ...(e.forms || [])].map((f) => f.toLowerCase());
      if (it.id === prev.id || (generic(it) && family(prev.id) === generic(it)) || forms.includes(lastWord)) continue;
    }
    out.push(it);
    seen.push(it);
  }
  return out;
}

/** Steak doneness from the words actually said ("medium rare" may reach us as two segments). */
function doneFromText(txt: string): string | undefined {
  const s = txt.toLowerCase().replace(/-/g, " ");
  if (/\b(medium|mid) rare\b/.test(s)) return "medium_rare";
  if (/\bmedium (to )?well\b/.test(s)) return "medium_well";
  if (/\bwell (done|cooked)\b|\bfully cooked\b|\bcooked through\b/.test(s)) return "well_done";
  if (/\brare\b|\bbloody\b/.test(s)) return "rare";
  if (/\bmedium\b/.test(s)) return "medium";
  return undefined;
}
function dishOf(v: any): string | undefined {
  if (!v) return undefined;
  return v.main ?? v.starter ?? v.dessert ?? v.side ?? v.drink;
}

function addItems(c: Ctx, list: Item[]) {
  for (const it of list) {
    // Answering "Still or sparkling?" / "Which one?": the specific item replaces the generic one.
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
  return p * it.qty;
}
const total = (c: Ctx) => items(c).reduce((a, it) => a + itemPrice(it), 0);

const TIPS: Record<string, Tip> = {
  uk_bill: { key: "uk_bill", lt: "Suprasta! Amerikoje restorano sąskaita vadinama „the check“.", better: "Could we get the check, please?" },
  uk_chips: { key: "uk_chips", lt: "Suprasta! Amerikoje bulvytės vadinamos „fries“ („chips“ – tai traškučiai).", better: "Fries, please." },
  uk_service: { key: "uk_service", lt: "Suprasta! Amerikoje klausiama „Is the tip included?“ – arbatpinigiai paprastai neįskaičiuoti.", better: "Is the tip included?" },
  us_restroom: { key: "us_restroom", lt: "Suprasta! Amerikoje mandagiau sakyti „restroom“ arba „bathroom“.", better: "Where's the restroom?" },
  tipping: { key: "tipping", lt: "JAV restoranuose įprasta palikti 15–20 % arbatpinigių: padavėjų atlyginimas labai priklauso nuo jų.", better: "I'll leave twenty percent." },
};

// Automatic answers the simulation uses when Lucia or Marco asks an optional question.
const omit = (o: Record<string, string>, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));
const AUTO: Record<string, string> = {
  resv: "Yes, I have a reservation.", resv_name: "It's under Tomas.", party: "Two, please.", wait: "Sure, that's fine.",
  seatpref: "Inside, please.", drinks: "A lemonade, please.", drink_kind: "Still, please.", drinks_ack: "Thank you!",
  order: "I'll have the lasagna, please.", food_kind: "The lasagna, please.", doneness: "Medium, please.", side: "Fries, please.",
  main_q: "No, that's all, thanks.", soup_offer: "No, thank you.", placed: "Thank you!", serve_wrong: "Thank you!",
  serve: "Thank you!", checkback_soup: "The soup is a little cold. Could you warm it up?",
  checkback: "Everything is delicious, thank you!", enjoy: "Thank you!", fix: "Thank you!", box: "No, thanks.",
  dessert: "No, thanks, I'm full.", dessert_ack: "Thank you!", dessert_serve: "Thank you!", check: "Could we get the check, please?",
  check_coming: "Together, please.", split: "Together, please.", pay: "Card, please.", tip: "Twenty percent.", change: "Keep the change.",
};

// ---------------------------------------------------------------------------

export const restaurant: SituationDef = {
  id: "s73-restaurant",
  song: 73,
  songTitle: "This Isn't What I Ordered",
  title: { en: "This Isn't What I Ordered", lt: "Ne tai užsisakiau" },
  topic: { en: "Dinner at a restaurant", lt: "Vakarienė restorane" },
  chapter: 2,
  order: 5,
  location: "trattoria",
  npc: "marco_host",
  npcs: ["marco"],
  goal: "Pavakarieniauk restorane: užsisakyk, jei reikia – pasiskųsk, ir paprašyk sąskaitos.",
  intro: "„Lucia's Trattoria“ – jaukus itališkas restoranas pagrindinėje gatvėje. Prie durų svečius pasitinka administratorė Lucia, prie staliuko aptarnaus padavėjas Marco. Amerikoje arbatpinigiai į sąskaitą paprastai neįskaičiuojami.",
  entities: { drink: DRINKS, starter: STARTERS, main: MAINS, side: SIDES, doneness: DONENESS, dessert: DESSERTS },

  grammar: {
    macros: {
      order_prefix: [
        "i will have #h:ill_have", "i will just have #h:ill_have", "i will take", "i will get", "i will try",
        "i would like #h:id_like", "i would just like #h:id_like", "i would love", "i would like to (have | get | order | try) #h:id_like",
        "can i (get | have) #h:can_i_get", "can i just (get | have) #h:can_i_get", "can i please (get | have) #h:can_i_get",
        "could i (get | have) #h:could_i_have", "could i just (get | have) #h:could_i_have", "could i please (get | have) #h:could_i_have",
        "may i (have | get)", "let me (get | have | try)",
        "i will go (with | for) #h:think_ill", "i think i will (have | get | take | try | go with | go for) #h:think_ill", "i am going to (have | get | go with | try)",
        "i want #blunt", "i need #blunt", "give me #blunt", "get me #blunt", "bring me #blunt",
        "(can | could) you (get | give | bring) (me | us)",
        "we will have", "we would like", "we will take", "we will get", "(can | could) we (get | have)", "we would like to (have | get | order)",
        "(we will | can we | could we | we would like to) share",
        "(for me | and for me | for her | and for her | for him | and for him | for my (wife | husband | friend)) [i will have | i would like | i will take | can i get | could i get] #h:for_me",
        "to start [with] [i will have | i would like | can i get | could i get | could we get | can we get | we will have | we would like] #h:start_with",
        "(first | as a starter | as an appetizer | for a starter | for an appetizer | for starters | for appetizers) [i will have | i would like | can i get | could we get | we will have]",
        "(for (my | the | our) (main | main course | entree | mains) | as a main [course] | as my main [course] | and then) [i will have | i would like | can i get | could i get | we will have]",
        "(i will | we will | can i | can we | could i | could we) start with #h:start_with", "(let us | i would like to | we would like to) start with #h:start_with",
        "for dessert [i will have | i would like | can i get | could we get | we will have]",
      ],
      qty: "(a #q1 | an #q1 | one #q1 | the #q1 | two #q2 | three #q3 | four #q4 | another #q1 | just the #q1 | just a #q1 | just one #q1 | just #q1 | some #q1 | some more #q1 | a glass of #glass #h:glass_wine | one glass of #glass | two glasses of #q2 #glass | a bottle of #bottle | another glass of #glass | another bottle of #bottle | a cup of | a bowl of | a slice of | a piece of | a scoop of | an order of | two orders of #q2 | a side of | a pitcher of)",
      drink_post: "(with ice | with no ice | no ice | without ice | with lemon | with a slice of lemon | with milk | with cream | black | with sugar | on the rocks | for the table | to share | for (me | her | him | my (wife | husband | friend | son | daughter)))",
      done: "({doneness} | cooked {doneness} | done {doneness})",
      main_post: "(with {side} [on the side] | with a side of {side} | and a side of {side} | gluten free #gf | with gluten free pasta #gf | without (cheese | onions | tomatoes | mushrooms | the sauce | sauce | the bun) #mod | no (cheese | onions | tomatoes | mushrooms | sauce | bun) #mod | extra spicy #mod | [but] not too spicy #mod | mild #mod | extra cheese #mod | to share | for (me | her | him | my (wife | husband | friend | son | daughter)))",
      dessert_post: "(with ice cream | a la mode | with a scoop of ice cream | without [the] cream #nocream | with no cream #nocream | no cream #nocream | without whipped cream #nocream | no whipped cream #nocream | with (two | 2) spoons #h:dessert_share | and (two | 2) spoons | to share | for the table)",
      det: "[a | an | the | some]",
    },
    slots: {
      item: { pattern: [
        "[@qty] {drink} [@drink_post] [@drink_post]",
        "[@qty] {starter} [to share #h:to_share]",
        "[@qty] {main} [@done] [@main_post] [@main_post]",
        "[@qty] {main} @main_post [@main_post] @done",
        "[@qty] {side} [on the side]",
        "[@qty] {dessert} [@dessert_post] [@dessert_post]",
      ] },
      items: { pattern: "{item} [(and | and a | and an | and the | and one | with | plus | and also | and then | also | and for me | and for her | and for him | and for my (wife | husband | friend)) {item}] [(and | and a | and the | and one | plus | and for me | and for her | and for him) {item}]" },
      dish: { pattern: "({starter} | {main} | {side} | {dessert} | {drink})" },
      party: { pattern: [
        "{number} [people | persons | guests | of us | adults]",
        "(just | only) (me | myself | one | one person) #p1",
        "(one person | myself | me) #p1",
        "(the two of us | two of us | us two | a couple) #p2",
        "(me and my | my) (wife | husband | friend | partner | girlfriend | boyfriend | colleague | son | daughter) [and me | and i] #p2",
      ] },
      req: { lexicon: [
        { id: "bread", forms: ["bread", "bread basket", "rolls", "bread rolls"] },
        { id: "water", forms: ["water", "tap water", "ice water"] },
        { id: "refill", forms: ["refill", "refills", "top up"] },
        { id: "napkins", forms: ["napkin", "napkins", "serviette", "serviettes"] },
        { id: "salt", forms: ["salt", "salt and pepper", "pepper", "black pepper", "fresh pepper"] },
        { id: "parmesan", forms: ["parmesan", "parmesan cheese", "cheese", "grated cheese"] },
        { id: "cup", forms: ["cup", "clean cup", "new cup", "glass", "clean glass", "new glass", "wine glass"] },
        { id: "fork", forms: ["fork", "clean fork", "knife", "spoon", "steak knife", "silverware", "cutlery"] },
        { id: "ice", forms: ["ice", "lemon", "lemon slice", "straw", "straws"] },
        { id: "oil", forms: ["olive oil", "oil", "chili flakes", "red pepper flakes", "hot sauce", "ketchup", "mustard"] },
        { id: "wine_list", forms: ["wine list", "wine menu"] },
        { id: "high_chair", forms: ["high chair", "booster seat"] },
      ] },
      thing: { pattern: "({drink} | {starter} | {main} | {side} | {dessert} | gluten free (pasta | options | dishes | bread) #gf | (a | any) (kids menu | children's menu) #kids | kids menu #kids | vegetarian (options | dishes | food) #veg | vegan (options | dishes | food) #veg | (a | the) wine list #winelist | wine list #winelist | (a | any) high chair #chair | high chairs #chair)" },
    },
  },

  intents: {
    // --- Host
    resv_yes: { patterns: [
      "(i | we) have a reservation [for {party}] [(at | for) {time}] #h:resv_have",
      "(i | we) have a reservation (under | for | in the name of) {name} [for {party}] [at {time}] #h:resv_have",
      "(i | we) have a reservation for {party} [at {time}] (under | in the name of) {name} #h:resv_have",
      "(i | we) (made | booked) a reservation [for {party}] [(at | for) {time}] [(under | in the name of) {name}]",
      "(i | we) (booked | reserved) a table [for {party}] [(at | for) {time}] [(under | in the name of) {name}] #h:resv_booked",
      "(i | we) (booked | reserved) a table for {time} [oclock] #h:resv_booked", "(i | we) have a table (booked | reserved) [for {party}] [(at | for) {time}] [(under | in the name of) {name}]",
      "(i | we) have a booking [for {party}] [at {time}]",
      "(a | the) table for {party} (at | for) {time}",
      "(the reservation is | the booking is | it should be) (under | in the name of) {name} #h:resv_under",
      "(i | we) called (earlier | ahead | this morning)",
      // "Yes, for two at seven", "We booked online", "My wife made a reservation"
      "(i | we) (booked | reserved) (online | by phone | on the phone | on your website | on the website)",
      "(my (wife | husband | friend | colleague | boss | partner) | someone) (made | booked) a (reservation | table | booking) [for us]",
      "[a] table for {party} (under | in the name of) {name}", "[the] (reservation | booking) (under | in the name of) {name}",
      "[a | the] (reservation | booking) for {party} [(under | in the name of | name) {name}]", "(i | we) have [a] (reservation | booking) (on | in | under | for) [the] name [of] {name}",
    ] },
    // "Yes, for two at seven" / "At 8 pm": only as an answer to "Do you have a reservation?"
    resv_time_ctx: { patterns: ["for {party} (at | for) {time}", "at {time} [for {party}]", "[for] {time} (pm | am | oclock | in the evening | tonight) [for {party}]"] },
    resv_no: { patterns: [
      "(i | we) (do not | did not) have a reservation #h:no_resv",
      "(i | we) (did not | do not) (book | reserve | make a reservation) [a table]",
      "no reservation", "(we are | i am) (a walk in | walk ins | walking in)", "(i | we) [just] walked in",
      "(i | we) (did not | do not) have (a | one)",
    ] },
    // "No, we don't." to "Do you have a reservation?" (the built-in no-forms only have "no, I don't")
    resv_no_ctx: { patterns: ["[no] (we | i) (do not | did not) [have one]"] },
    table_for: { patterns: [
      "(a | one) table for {party} [tonight | right now] #h:table_for",
      "(is there | do you have) a (free | open | available) table [for {party}]", "(i | we) would like (to have dinner | to eat | a table | dinner) [for {party}]",
      "[but] (do you have | is there | have you got) (a table | room | space) [for {party}] [tonight | right now]",
      "(we are | i am) (here | looking) for (dinner | a table)",
      // "We don't have a reservation. Could we get a table for two?" as one answer
      "(i | we) (do not | did not) have a reservation #noresv [but] (can | could | may) (i | we) (get | have) a table for {party} [tonight | right now] [by the window #window | near the window #window | outside #patio | on the patio #patio | inside #inside | somewhere quiet #quiet]",
      "table for {party}",
      "(can | could | may) (i | we) (get | have) a table for {party} [tonight | right now] #h:table_can",
      "(do you have | is there | have you got) (a table | room | space | anything) for {party} [tonight | right now]",
      "(i | we) (would like | need | want) a table for {party}",
      "(can | could | may) (i | we) (get | have) a table for {party} (by the window #window | near the window #window | outside #patio | on the patio #patio | inside #inside | somewhere quiet #quiet)",
      "(a | one) table for {party} (by the window #window | outside #patio | on the patio #patio | inside #inside | somewhere quiet #quiet)",
    ] },
    party_ctx: { patterns: [
      "(just | only) (me | myself | one | one person) [tonight | today] #h:party_just_me",
      "{party} [tonight] #h:party_two",
      "(there are | there will be | we are | it is | it will be) {party} [of us] [tonight]",
      "it is (just | only) (me | us two | the two of us)",
      "for {party}",
    ] },
    // "Great, and hungry!" to the host's greeting: never the name "Hungry"
    hungry: { patterns: [
      "[i am | we are] [doing] (good | fine | great | very good | really good | pretty good | okay | not bad | wonderful) [thanks | thank you] and [i am | we are] [very | really | so | super | a (little | bit)] (hungry | starving)",
      "(i am | we are) [very | really | so | super | a (little | bit)] (hungry | starving) [tonight]",
      "[very | really | so | super] (hungry | starving)",
    ] },
    name_ctx: { patterns: [
      "[it is | my name is] {name} #h:resv_under", "the name is {name} #h:name_is",
      "my (surname | last name | family name) is {name}", "[it is | my name is | under] {name} [spelled | it is spelled] {letters}",
      "[it should be | maybe] under my (wifes | wife is | husbands | husband is | friends | friend is) name [{name}]", "[it is] under my name",
      "[yes] [it is | it should be | the reservation is | the booking is] (under | for) {name} #h:resv_under",
    ] },
    ask_wait: { patterns: [
      "how long is the wait #h:q_wait", "is there a wait", "how long (do | will) (we | i) (have to | need to) wait",
      "how long will it (take | be)", "(is it | will it be) a long wait", "how long (do | will) (i | we) wait",
      "how long exactly", "how many minutes",
    ] },
    wait_ok_ctx: { patterns: ["(we | i) (can | will) wait #h:wait_can", "(we | i) do not mind waiting", "no problem [we can wait]", "that is not (too long | a problem)", "(that is | it is) (fine | okay) #h:wait_fine",
      "{number} minutes is (fine | okay | ok | no problem)", "(we | i) (can | will) wait (at the bar | here | outside)", "(can | could) (we | i) wait (here | at the bar | outside)", "(we | i) do not mind"] },
    wait_no_ctx: { patterns: ["(we | i) can not wait [that long]", "that is too long", "(we are | i am) in a (hurry | rush) #h:wait_hurry", "(we | i) do not have (time | that much time)",
      "(we | i) will come back (later | another time | tomorrow)", "maybe (another time | next time)"] },
    seat_req: { patterns: [
      "(can | could | may) (we | i) (sit | have a table | get a table | be seated) (by | near | at) the window #window #h:seat_window",
      "(can | could | may) (we | i) sit (outside #patio | outdoors #patio | on the patio #patio | on the terrace #patio | inside #inside | indoors #inside | somewhere quiet #quiet | in the back #quiet) #h:seat_patio",
      "(is there | do you have | have you got) a table (by the window #window | near the window #window | outside #patio | on the patio #patio | somewhere quiet #quiet)",
      "(somewhere quiet | a quiet table) #quiet",
      "(we would | i would) (like | prefer) (to sit | a table) (by the window #window | outside #patio | on the patio #patio | inside #inside | somewhere quiet #quiet)",
      "a table by the window #window",
    ] },
    seat_ans: { patterns: [
      "(inside | indoors | in here) [is fine | is good | would be great | would be nice] #inside #h:seat_inside",
      "(outside | outdoors | on the patio | the patio | on the terrace) [is fine | is good | would be great | would be nice] #patio #h:seat_patio_ans",
      "(outside | on the patio) [it is a (nice | beautiful | warm) (evening | day | night)] #patio",
      "(by | near | at) the window [is fine | is good | would be great | would be nice] #window", "[the] terrace #patio", "any table [is fine | is good] #any",
      "(we will | i will | we would like to | i would like to | let us) sit (inside #inside | outside #patio | on the patio #patio | by the window #window)",
      "(either | anywhere | wherever | either one | anywhere is fine | either is fine | either one is fine) #any",
      "(it does not matter | we do not mind | i do not mind) #any",
    ] },
    // --- Ordering
    order: { patterns: [
      "@order_prefix {items}",
      "[just] {items} #h:please_only",
      "[just] {items} (is fine | will do | is good | would be great | sounds good | would be nice | would be good | would be perfect | would be lovely | sounds great)",
      "just tap water is fine #h:tap_water",
      "{items} for (me | her | him | my (wife | husband | friend | son | daughter) | the table | everyone | everybody | all of us | us)",
    ] },
    order_unknown: { patterns: ["@order_prefix {w:any}"] },
    kind_ctx: { patterns: ["(regular #regular | normal #regular | regular one #regular | caffeinated #regular | diet #diet | the diet one #diet) [is fine | coffee]"] },
    ready_yes: { patterns: [
      "(i am | we are) ready [to order] [now] #h:ready", "i think (i am | we are) ready [to order]", "ready [to order]",
      "(i | we) know what (i | we) want", "(i | we) have decided", "(i | we) would like to order [now]", "can (i | we) order [now]",
    ] },
    same: { patterns: [
      "(i will have | i will take | i would like | can i (get | have) | could i (get | have)) the same [thing] [please] #h:same",
      "(the same | same) for me", "make (that | it) two", "(two | 2) of those",
      "(i will have | i will take | i would like | the same as) what (she | he | my (wife | husband | friend)) (is having | has | ordered)",
    ] },
    need_time: { patterns: [
      "(can | could | may) (i | we) (have | get) a (few | couple of | couple) [more] minutes #h:need_minutes",
      "(i | we) need a (few | couple of | couple) [more] minutes", "(i | we) need (more | a little more | a bit more) time",
      "(can | could) you give (me | us) a (few | couple of | couple) [more] minutes", "give (me | us) a (few | couple of | couple) [more] minutes",
      "(i am | we are) still (deciding | looking | thinking) #h:still_deciding", "still (deciding | looking)",
      "not (yet | quite) [ready]", "(i am | we are) not ready [yet]", "(i | we) have not decided [yet]", "(i | we) need a minute",
      "not (yet | quite) [ready] [(i | we) need] [a] (few | couple of | couple) [more] minutes", "give (me | us) a (minute | second | moment)",
    ] },
    drinks_no: { patterns: [
      "maybe later", "(not | nothing) (right now | yet | for now) [thanks]",
      "(nothing | no drinks) [for me | for now | right now | for us] #h:drinks_none",
      "(no | nothing) to drink [for me | for now]",
      "(i | we) do not want (anything | a drink) [to drink]",
    ] },
    more_no: { patterns: [
      "(that is | that will be | that would be) (all | it | everything) [for now]",
      "[no] that is it [for now]", "nothing else [for now | for me]",
      "[no] (i am | we are) (good | fine | okay | all good | all set) [for now]",
      "(i think | we think) (that is | we are) (all | it | good)",
      "no more", "[no] that is enough", "just (that | the {dish})", "[no] just the main [course | dish]",
    ] },
    its_ok: { patterns: ["(no problem | no worries | that is okay | it is okay | it is fine | no big deal | it happens | do not worry [about it])"] },
    ask_menu: { patterns: [
      "(can | could | may) (i | we) (see | have | get) (the | a) menu",
      "(can | could | may) (i | we) (see | have | get) the (dessert #dessert | wine #wine | drinks #drinks | drink #drinks) (menu | list) #h:dessert_menu",
      "what do you have [to drink #drinks | for dessert #dessert | for starters #starters | on the menu] #h:q_drinks",
      "what (drinks #drinks | wines #wine | beers #drinks | sodas #drinks | desserts #dessert | appetizers #starters | starters #starters | soups #starters | pastas #pasta | sides #sides | side dishes #sides | pizzas #mains | mains #mains | main courses #mains) do you have",
      "what (kind | kinds | type | types | sort) of (wine #wine | beer #drinks | soda #drinks | drinks #drinks | dessert #dessert | desserts #dessert | pasta #pasta | soup #starters | sides #sides | side dishes #sides) do you have",
      "what (is | do you have) for dessert #dessert", "what is on the menu", "what are (my | our | the) options",
      "(something | anything) (non alcoholic | without alcohol | alcohol free) #drinks",
      "what (are | is) the (sides #sides | desserts #dessert | side dishes #sides | appetizers #starters | starters #starters | main courses #mains | mains #mains)",
    ] },
    ask_specials: { patterns: [
      "(are there | do you have | have you got) any specials [tonight | today] #h:q_specials",
      "what are (the | your | tonight's | today's) specials [tonight | today]",
      "what is (the | tonight's | today's) special [tonight | today]", "(any | what) specials [tonight | today]", "what is the special of the day",
    ] },
    ask_recommend: { patterns: [
      "what (do | would) you recommend [for dessert #dessert | tonight | here] #h:q_recommend",
      "what is (good | popular | your favorite | the best | good here | best here | your favorite dish | the most popular dish) [here | tonight | on the menu]",
      "(any | do you have any) recommendations", "what should (i | we) (get | have | try | order)",
      "what is your (specialty | signature dish)", "what would you (get | have | order)", "(can | could) you recommend something",
      "is (the | a) {dish} (good | tasty | nice | popular)", "what (wine | drink | dessert #dessert | dish | pasta) (do | would) you recommend",
    ] },
    ask_desc: { patterns: [
      "what is (the | a | an) {dish}", "what is in (the | a | an) {dish}", "what is {dish}",
      "(can | could) you tell (me | us) (about | what is in) the {dish}", "what kind of dish is (the | a) {dish}", "what (kind | type) of {dish} [is it]",
    ] },
    ask_spicy: { patterns: [
      "is (it | that | this) spicy #h:q_spicy", "is (the | that | this) {dish} spicy #h:q_spicy", "is {dish} spicy",
      "how spicy is (it | that | the {dish})", "is (it | the {dish}) (very | too | really) spicy",
      "is anything spicy", "(which | what) (dishes are | dish is | one is) spicy", "do you have anything spicy",
    ] },
    ask_comes: { patterns: [
      "what comes with (it | that | the {dish}) #h:q_comes_with", "what does (it | that | the {dish}) come with",
      "does (it | that | the {dish}) come with (anything | a side | sides | fries | a salad | {side})",
      "is (it | that | the {dish}) served with (anything | a side | {side})", "what is it served with",
    ] },
    ask_veg: { patterns: [
      "(do you have | are there | have you got) [any] vegetarian (options | dishes | food | meals) #h:q_veg",
      "(i am | we are | she is | he is) (vegetarian | a vegetarian | vegetarians | vegan | a vegan)",
      "(i | we) do not eat meat", "what is vegetarian [on the menu | here]",
      "(do you have | is there) (anything | something) without meat", "(do you have | is there) [(anything | something)] vegetarian", "(something | anything) vegetarian",
      "is (it | that | the {dish}) vegetarian", "does (it | that | the {dish}) have meat [in it]",
    ] },
    ask_allergy: { patterns: [
      "i am allergic to (nuts #nuts | peanuts #nuts | tree nuts #nuts | pine nuts #nuts | gluten #gluten | wheat #gluten | dairy #dairy | milk #dairy | lactose #dairy | shellfish #shellfish | seafood #shellfish | eggs #eggs | fish #fish) #h:allergy_nuts",
      "(i | she | he) (has | have) a (nut #nuts | peanut #nuts | gluten #gluten | dairy #dairy | shellfish #shellfish | seafood #shellfish) allergy",
      "(does | do) (it | that | this | the {dish}) (have | contain) [any] (nuts #nuts | peanuts #nuts | gluten #gluten | dairy #dairy | eggs #eggs | shellfish #shellfish) [in it] #h:q_nuts",
      "(are there | is there) [any] (nuts #nuts | gluten #gluten | dairy #dairy) in (it | that | the {dish})",
      "is (it | that | this | the {dish}) (gluten free #gluten | nut free #nuts | dairy free #dairy) #h:q_gluten",
      "(do you have | is there) (anything | something) (gluten free #gluten | without gluten #gluten | nut free #nuts | without nuts #nuts | dairy free #dairy)",
      "(do you have | can i get | could i get) gluten free (pasta | options | bread) #gluten",
      "i can not (eat | have) (nuts #nuts | gluten #gluten | dairy #dairy | eggs #eggs | shellfish #shellfish)",
      "(i am | she is | he is) (gluten intolerant #gluten | lactose intolerant #dairy | celiac #gluten | coeliac #gluten)",
    ] },
    ask_price: { patterns: [
      "how much (is | does) (the | a | an) {dish} [cost] #h:q_price", "how much (is | does) (it | that | this) [cost]",
      "what does (the | a | an) {dish} cost", "how much for (the | a | an) {dish}", "what is the price of (the | a | an) {dish}",
    ] },
    ask_have: { patterns: ["(do you have | have you got | is there | are there) [any] {thing}", "do you (serve | make) [any] {thing}"] },
    ask_have_unknown: { patterns: ["(do you have | have you got | do you serve) [any] {w:any}"] },
    ask_restroom: { patterns: [
      "where is the (restroom | bathroom | ladies room | mens room | washroom) #h:q_restroom",
      "where is the (toilet | toilets | loo | gents | ladies) #tip:us_restroom",
      "(do you have | is there) a (restroom | bathroom | toilet)", "(can | could | may) i use the (restroom | bathroom | toilet)",
    ] },
    doneness_ans: { patterns: [
      "{doneness} #h:done_short", "{doneness} (is fine | is good | would be great | sounds good)",
      "(i would like | i would prefer) it {doneness} #h:done_like", "(i will have | i will take) it {doneness} #h:done_please",
      "(can | could | may) i (get | have) it {doneness} #h:done_can",
      "make it {doneness}", "(cooked | done) {doneness}", "i (like | prefer) it {doneness}",
      // "Medium, not too red": never read "rare" out of "not too rare"
      "[{doneness}] [but] not [too] (red | raw | bloody | pink | rare) #notrare",
    ] },
    side_ans: { patterns: [
      "[just] @det {side} #h:side_short", "with @det {side} #h:side_with", "@det {side} on the side",
      "(i will have | i will take) @det {side} [with (it | that)] #h:side_please", "(i would like | i will go with | i will do) @det {side} [with (it | that)]",
      "(let us do | let us go with | let us have) @det {side}",
      "(can | could | may) i (get | have) @det {side} [with (it | that)] #h:side_can",
      "@det {side} (is fine | is good | would be great | sounds good)",
    ] },
    // --- During the meal
    all_good: { patterns: [
      "(everything | it | this | the food | the {dish} | my {dish} | dinner) (is | was | tastes | looks) [really | very | so | absolutely] (great | delicious | good | wonderful | perfect | amazing | excellent | lovely | fantastic | fine | tasty) #h:all_good",
      "(it is | this is | that is | it was | that was) [really | very | so | absolutely] (delicious | great | amazing | excellent | good | perfect | wonderful | tasty | lovely)",
      "[my | our] compliments to the chef #h:compliments",
      "all good", "(we are | i am) (enjoying | loving) it", "(really | very | so) (good | delicious | tasty)", "delicious",
      "[yes] (it is | this is | everything is) [really | very | so] nice", "(it | this | everything) looks (great | delicious | good | amazing)",
    ] },
    all_good_ctx: { patterns: ["(great | good | fine | perfect | lovely | wonderful | excellent | amazing | fantastic | tasty)", "[yes] (it is | everything is) (okay | ok | fine | all right | nice)"] },
    complain_cold: { patterns: [
      "(my | the | this | our) (soup | food | dish | pasta | {dish}) is (cold | not hot | not warm [enough] | lukewarm | a little cold | a bit cold | kind of cold | too cold) #h:cold",
      "(it is | this is) [a little | a bit | kind of] (cold | lukewarm | not hot) #h:cold_little",
      "(could | can) you (warm | heat) (it | this | that | the soup | my soup | the {dish}) up [a little | a bit] #h:warm_up",
      "(could | can) you (warm | heat) up (it | this | the soup | my soup | the {dish})",
      "(could | can) you (make | get) (it | this) (hot | hotter | warmer)",
      "(could | can) (i | we) (get | have) (it | this | the soup | my soup) (warmed up | heated up | hot | hotter)",
      "(it | the soup | my soup) (needs | could use) (heating | warming) up",
      "(could | can) you (heat | warm) (it | this | the soup)",
      "[(it is | the soup is | this is)] not (very | that | really | too)? (hot | warm) [enough]", "(it | the soup | this) (should | could) be (hotter | warmer)",
      "[a little | a bit | kind of | too] (cold | lukewarm)", "(warm | heat) it up", "(good | nice | tasty | delicious) but (a little | a bit | kind of | too)? (cold | lukewarm)",
    ] },
    complain_other: { patterns: [
      "(this | it | the {dish} | my {dish}) is (too salty | too spicy | burnt | overcooked | undercooked | raw | not cooked | too dry | too rare | not done)",
      "(my | the) steak is (too rare | overcooked | undercooked | not cooked enough | too well done | too bloody)",
      "(this | it) (tastes | is) (strange | funny | weird | off | bad)",
      "(this | it | the {dish} | my {dish} | the food) is (a bit | a little | really | very | way) (too salty | salty | too spicy | burnt | overcooked | undercooked | raw | too dry | dry | too rare)",
      // "The steak is not good": a complaint, never "steak" + "not good"
      "(this | it | the {dish} | my {dish} | the food | everything) (is | was | tastes) not [very | so | that | really] (good | great | okay | ok | tasty | nice | right | fresh | hot | warm)",
      "(this | it | the {dish} | my {dish} | the food) (does not | did not) taste (good | right | fresh)", "i do not like (it | the {dish} | this | my {dish})",
    ] },
    complain_wrong: { patterns: [
      "(this | that | it) is not what (i | we) ordered #h:not_ordered",
      "(i | we) (did not | never) order (this | that | it | the {dish} | a {dish} | {dish}) #h:didnt_order",
      "(i | we) ordered (the | a | an) {dish} #h:i_ordered", "(i | we) ordered {dish}",
      "(i | we) ordered [the | a | an] {dish} (but | and) (this | that | it) is [a | an | the] {dish}",
      "(i | we) ordered [the | a | an] {dish} not [the | a | an] {dish}",
      "[i think] (you made | there is) a mistake",
      "(this | that | it) is (a | an | the) {dish} (but | and) (i | we) ordered (the | a | an) {dish}",
      "(this | that) is not (my | our) (order | dish | food | plate)", "(this | that | it) is not (mine | ours)",
      "i think (this | there) is (a mistake | the wrong (dish | order | plate)) #h:wrong_dish",
      "i think you (brought | gave) (me | us) the wrong (dish | order | plate)",
      "(this | it) is the wrong (dish | order | plate)", "wrong (dish | order | plate)",
      "(this | that) is not (the | a | an) {dish}",
      "(this | that | it) is wrong", "(this | that | it) is (for | from) (another | a different) table", "where is my {dish}", "(i | we) (had | asked for) (the | a | an) {dish}",
    ] },
    request: { patterns: [
      "(can | could | may) (i | we) (get | have) [some] more {req} #h:more_bread",
      "(can | could | may) (i | we) (get | have) a {req} [on (my | our) (drink | drinks)] #h:refill",
      "(can | could | may) (i | we) (get | have) a clean {req} #h:clean_cup",
      "(can | could | may) (i | we) (get | have) (some | another | an | a new | the | extra) {req}",
      "(some | more | some more | another | a clean | a new | extra) {req}",
      "(i | we) need (a | some | another | a clean | a new | more | extra) {req}",
      "(can | could) you bring (me | us) (a | some | more | another | a clean | the | extra) {req}",
      "(two | 2 | three | 3) {req} [please]",
    ] },
    box_ask: { patterns: [
      "(can | could | may) (i | we) (get | have) a (box | to go box | takeout box | container | doggy bag) [for (this | the rest | that | it | the leftovers)] #h:box",
      "(can | could | may) (i | we) take (this | the rest | it | that | the leftovers) (home | to go | with (me | us)) #h:box_take",
      "(can | could) you (box | pack | wrap) (this | it | that) [up] [for (me | us)]", "(i | we) would like a (box | to go box)",
      "(i | we) will take (it | this | the rest) (to go | home)",
    ] },
    dessert_no: { patterns: [
      "(no | nothing) (dessert | desserts) [for (me | us)] [tonight]", "(i am | we are) (full | stuffed | too full | so full) #h:im_full",
      "(i | we) (can not | could not) eat (another bite | anything else | any more)", "no dessert tonight", "not tonight",
      "(i | we) will skip (dessert | the dessert)", "(i | we) do not (need | want) (dessert | any dessert | anything else)",
      "(i am | we are) on a diet", "nothing sweet [for (me | us)]", "no {dessert} [for (me | us)]", "i do not eat (sweets | sugar | dessert)",
    ] },
    // --- Paying
    check_ask: { patterns: [
      "(could | may) (i | we) (get | have | see) the check #h:check_can",
      "can (i | we) (get | have | see) the check #h:check_can2",
      "the check", "check #h:check_please", "(i | we) (are | am) ready for the check",
      "(can | could) you bring (me | us) the check", "(i | we) would like the check",
      "(can | could | may) (i | we) (get | have | see) the bill #tip:uk_bill", "[the] bill #tip:uk_bill",
      "(i | we) would like to pay [now]", "(can | could) (i | we) pay [now]", "(i | we) are ready to pay",
      "just the check #h:just_check", "just the bill #tip:uk_bill",
      "how much do (i | we) owe [you]", "how much is it (all together | altogether | in total)", "what is the total", "(i | we) would like the bill #tip:uk_bill",
      "(i am | we are) (done | finished) [eating]", "(can | could) you bring [me | us] the (check | bill #tip:uk_bill)",
      "[the check | the bill #tip:uk_bill] when you (have a (moment | minute | second) | get a chance | can)",
    ] },
    split_ans: { patterns: [
      "together #together #h:split_together", "(all | all of it | it is all) together #together",
      "(one | a single) (check | bill #tip:uk_bill) #together", "[put it | put it all | all] on one (check | bill #tip:uk_bill) #together",
      "split it (in two | in half | two ways | evenly | fifty fifty) #split", "(all | all of it | it is all | everything) together #together",
      "(each | everyone) (pays | will pay) [for (himself | herself | themselves)] #separate", "i will pay for (both of us | us | everyone | everybody) #together",
      "(it is | it is all) on me #together", "i will (pay | get) (it | this | for everything | for both | for all of us) #together",
      "(separate | separately) #separate #h:split_sep", "separate checks #separate #h:split_sep", "(two | 2) checks #separate",
      "(can | could) (we | you) split (it | the check | the bill #tip:uk_bill) [two ways | evenly | four ways] #split #h:split_it",
      "(can | could) (we | you) split (it | the check) in half #split #h:split_half",
      "(we will | we would like to | we want to | we are going to) (split it #split | pay separately #separate | split the check #split)",
      "split it [in half | evenly] #split", "(let us | we can) split it #split",
      "(we are | we will be) paying (together #together | separately #separate)",
      "all on one [check | bill #tip:uk_bill] #together", "i am paying [for (everything | both of us | all of us | us)] #together", "let us split [it | the check | the bill #tip:uk_bill] #split",
      "(fifty fifty | half and half) #split", "separate bills #separate #tip:uk_bill", "together is fine #together", "(can | could) we pay separately #separate",
      "(we | i) [will] pay (separate | separately) #separate", "(we | i) [will] pay together #together", "on separate (checks | bills #tip:uk_bill) #separate",
    ] },
    pay_card: { patterns: [
      "[can | could] (i | we) pay (by | with) (card | credit card | debit card | my card | credit | visa | mastercard) #h:pay_card", "(by | with) card",
      "card #h:pay_card_short", "(i will | i would like to | i am going to) pay (by | with) (card | credit card | debit card | my card | a card)",
      "do you (take | accept) (cards | credit cards | card | visa | mastercard | american express | amex)",
      "can i (use | tap) my card", "[a] (credit | debit) card", "(here is | this is) my card",
      "(visa | mastercard | amex | american express)", "(can | could) i tap [it | my card]", "i will tap",
      "(here is | this is) my (credit card | debit card | visa)", "contactless",
    ] },
    pay_cash: { patterns: ["[can | could] (i | we) pay (in | with) cash", "(in | with) cash", "cash", "(i will | i would like to | i am going to) pay (in | with) cash #h:pay_cash", "i will pay cash"] },
    // "I don't have cash": so it's the card (never read as "cash")
    no_cash: { patterns: ["(i | we) do not have [any | enough] cash", "no cash [sorry]", "(i | we) (can not | do not want to) pay (in | with) cash", "i have no cash"] },
    pay_phone: { patterns: ["(can | could) (i | we) pay (with | by) (my phone | apple pay | google pay | phone)", "do you (take | accept) (apple pay | google pay)", "apple pay", "google pay"] },
    here_you_go: { patterns: ["here you (go | are) #h:here_you_go", "there you go", "here it is", "here is (the | my) money", "here (is | are) {price}"] },
    keep_change: { patterns: ["keep the change #h:keep_change", "you can keep the change", "(i do not need | no) change", "keep it"] },
    ask_tip: { patterns: [
      "is [the | a] (tip | gratuity) included #h:q_tip_included", "what do people (usually | normally) (leave | tip | give)", "how much do people [usually | normally] (tip | leave | give)",
      "is (service | the service | the service charge | a service charge) included #tip:uk_service",
      "(is | does) (the | this) (price | total | check | bill) include (the | a) (tip | gratuity | service)",
      "(do | should) (i | we) (leave | add | give) a tip", "how much (should | do) (i | we) tip #h:q_tip_how",
      "how much is (the | a) [usual | normal | standard] tip", "what is (the | a) (usual | normal | standard) tip", "(do | should) (i | we) tip",
      "what is (normal | usual | customary) [here | in america]", "how much is (normal | usual)",
    ] },
    tip_ctx: { patterns: [
      "{number} percent #h:tip_percent", "{number} [percent] (is fine | please) #h:tip_percent", "{number}",
      "(i will | let me | i would like to) (add | leave | give | do | tip) {number} percent",
      "is {number} [percent] (okay | ok | enough | fine | normal)",
      // "Let's do twenty percent." "Make it eighteen." "A twenty percent tip."
      "(let us | we will | i will) (do | go with | leave | add | give) {number} [percent]", "make it {number} [percent]",
      "(add | leave) {number} percent", "[a] {number} percent tip", "{number} percent for the tip",
    ] },
    tip_give: { patterns: [
      "(this | here) is (a tip | something | a little something) for you", "(this | that) is for you", "here is (a | your) tip",
      "(i will | i would like to | let me) leave a tip", "(i will | i would like to | let me) (add | leave | give) {number} percent",
      "(i will | let me) tip [{number} [percent]]",
    ] },
    tip_none: { patterns: ["(no | without) tip", "(i will | we will) not (tip | leave a tip)", "(i | we) do not want to (tip | leave a tip)", "(skip | no) the tip", "zero percent"] },
    // --- Changes of mind
    reject: { patterns: [
      "[actually] (i | we) (do not | will not) want [the | a | an] {item}", "[actually] no {item}", "not [the | a | an] {item}",
      "[actually] (cancel | forget) the {item}", "[actually] (i | we) do not want (it | that) anymore", "i changed my mind",
    ] },
    change: { patterns: [
      "[actually] (can | could) i (change | switch) (that | it | my order) (to | for) {item}", "[actually] make (that | it) {item}",
      "actually {item} instead", "{item} instead", "(can | could) i (get | have) {item} instead", "i would like {item} instead",
    ] },
    correction: { patterns: ["[no] not [the | a | an] {item} [but] {item}", "no i said {item}"] },
  },

  lines: {
    // --- Lucia, the host
    greet: [
      t("Good | evening! | Welcome | to | Lucia's! | Do | you | have | a | reservation?",
        "Labas | vakaras! | Sveiki atvykę | į | „Lucia's“! | Ar | jūs | turite | — | rezervaciją?",
        "Labas vakaras! Sveiki atvykę į „Lucia's“! Ar rezervavote staliuką?", { flags: { 5: "Question “Do” = the particle ar." } }),
      t("Hi, | welcome | to | Lucia's! | Do | you | have | a | reservation | with | us | tonight?",
        "Sveiki, | sveiki atvykę | į | „Lucia's“! | Ar | jūs | turite | — | rezervaciją | pas | mus | šįvakar?",
        "Sveiki atvykę į „Lucia's“! Ar šįvakar rezervavote pas mus staliuką?", { flags: { 4: "Question “Do” = the particle ar." } }),
      t("Good | evening, | and | welcome! | Do | you | have | a | reservation?",
        "Labas | vakaras, | ir | sveiki atvykę! | Ar | jūs | turite | — | rezervaciją?",
        "Labas vakaras, sveiki atvykę! Ar rezervavote staliuką?", { flags: { 4: "Question “Do” = the particle ar." } }),
    ],
    greet_back: [
      t("Welcome | back! | Do | you | have | a | reservation | tonight?",
        "Sveiki | sugrįžę! | Ar | jūs | turite | — | rezervaciją | šįvakar?",
        "Sveiki sugrįžę! Ar šįvakar rezervavote staliuką?", { flags: { 2: "Question “Do” = the particle ar." } }),
    ],
    right_place: [
      t("Ha! | You're | in | the | right | place!", "Cha! | Jūs esate | — | — | reikiamoje | vietoje!", "Cha! Jūs atėjote ten, kur reikia!",
        { flags: { 2: "“in” has no separate word: the locative vietoje carries it across “right”." } }),
    ],
    ask_resv: [
      t("Do | you | have | a | reservation?", "Ar | jūs | turite | — | rezervaciją?", "Ar rezervavote staliuką?", { flags: { 0: "Question “Do” = the particle ar." } }),
      t("And | do | you | have | a | reservation?", "O | ar | jūs | turite | — | rezervaciją?", "O ar rezervavote staliuką?", { flags: { 1: "Question “do” = the particle ar." } }),
    ],
    ask_resv_name: [
      t("Great! | What's | the | name?", "Puiku! | Koks yra | — | vardas?", "Puiku! Kokiu vardu?"),
      t("Perfect. | Under | what | name?", "Puiku. | — | Kokiu | vardu?", "Puiku. Kokiu vardu?",
        { flags: { 1: "“Under” (a reservation under a name): the instrumental kokiu vardu carries it." } }),
    ],
    resv_found: [
      t("Perfect, | I | have | you | right here.", "Puiku, | aš | turiu | jus | čia pat.", "Puiku, radau jūsų rezervaciją."),
      t("Great, | I | found | your | reservation.", "Puiku, | aš | radau | jūsų | rezervaciją.", "Puiku, radau jūsų rezervaciją."),
    ],
    ask_party: [
      t("How many | people?", "Kiek | žmonių?", "Keliese būsite?"),
      t("How many | in | your | party?", "Kiek | — | jūsų | kompanijoje?", "Keliese būsite?",
        { flags: { 1: "“in”: the locative ending of kompanijoje carries it (C-CASE-DASH, “your” intervenes)." } }),
      t("Okay! | How many | of you | tonight?", "Gerai! | Kiek | jūsų | šįvakar?", "Gerai! Keliese būsite šįvakar?"),
    ],
    ask_just_one: [
      t("Just | one | tonight?", "Tik | {m:vienas|f:viena} | šįvakar?", "Šįvakar {m:vienas|f:viena}?"),
    ],
    wait_10: [
      t("It'll be | about | a | ten-minute | wait. | Is | that | okay?",
        "Bus | maždaug | — | dešimties minučių | laukimas. | Ar | tai | tinka?",
        "Teks palaukti maždaug dešimt minučių. Ar tinka?",
        { flags: { 5: "“Is” in a yes/no question = the particle ar; tinka carries the verb (linked to “okay”)." } }),
    ],
    wait_15: [
      t("We're | pretty | busy | tonight. | It'll be | about | fifteen | minutes. | Is | that | okay?",
        "Mes esame | gana | užimti | šįvakar. | Bus | maždaug | penkiolika | minučių. | Ar | tai | tinka?",
        "Šįvakar pas mus daug žmonių. Teks palaukti maždaug penkiolika minučių. Ar tinka?",
        { flags: { 8: "“Is” in a yes/no question = the particle ar; tinka carries the verb (linked to “okay”)." } }),
    ],
    wait_is_10: [t("About | ten | minutes.", "Maždaug | dešimt | minučių.", "Maždaug dešimt minučių.")],
    wait_is_15: [t("About | fifteen | minutes.", "Maždaug | penkiolika | minučių.", "Maždaug penkiolika minučių.")],
    no_wait: [
      t("There's | no | wait | right now.", "Nėra | jokio | laukimo | šiuo metu.", "Šiuo metu laukti nereikia.",
        { flags: { 0: "Negative concord: nėra takes its ne- from “no” (C-CONCORD)." } }),
    ],
    wait_ok: [
      t("Great. | It | won't take | long.", "Puiku. | Tai | neužtruks | ilgai.", "Puiku. Tai neužtruks ilgai."),
    ],
    table_ready: [
      t("Okay, | your | table | is | ready!", "Gerai, | jūsų | staliukas | yra | paruoštas!", "Gerai, jūsų staliukas paruoštas!"),
    ],
    table_opened: [
      t("Oh, | wait, | a | table | just | opened up!", "O, | palaukite, | — | staliukas | ką tik | atsilaisvino!", "O, palaukite – ką tik atsilaisvino staliukas!"),
    ],
    ask_seat: [
      t("Would | you | like | to sit | inside | or | on the patio?", "Ar | jūs | norėtumėte | sėdėti | viduje | ar | terasoje?", "Norėtumėte sėdėti viduje ar terasoje?",
        { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte (linked to “like”)." } }),
      t("Inside | or | on the patio?", "Viduje | ar | terasoje?", "Viduje ar terasoje?"),
    ],
    seat_window_ok: [
      t("Of course! | We | have | a | nice | table | by | the | window.", "Žinoma! | Mes | turime | — | gražų | staliuką | prie | — | lango.", "Žinoma! Turime gražų staliuką prie lango."),
    ],
    seat_window_full: [
      t("I'm sorry, | the | window | tables | are | all | taken | right now. | But | I | have | a | nice | quiet | table | in the back.",
        "Atsiprašau, | — | prie lango | staliukai | yra | visi | užimti | šiuo metu. | Bet | aš | turiu | — | gražų | ramų | staliuką | gale.",
        "Atsiprašau, šiuo metu visi staliukai prie lango užimti. Bet turiu gražų ramų staliuką gale."),
    ],
    seat_can_do: [
      t("Sure, | we | can | do | that.", "Žinoma, | mes | galime | padaryti | tai.", "Žinoma, galime."),
    ],
    seat_patio_ok: [
      t("Sure! | The | patio | is | lovely | tonight.", "Žinoma! | — | Terasa | yra | nuostabi | šįvakar.", "Žinoma! Šįvakar terasoje nuostabu."),
    ],
    seat_quiet_ok: [
      t("Of course. | I | have | a | quiet | table | in the back.", "Žinoma. | Aš | turiu | — | ramų | staliuką | gale.", "Žinoma. Turiu ramų staliuką gale."),
    ],
    seating: [
      t("Right this way. | Here | are | your | menus. | Marco | will be | right | with | you.",
        "Prašom čia. | Štai | — | jūsų | meniu. | Marco | bus | tuoj | pas | jus.",
        "Prašom čia. Štai jūsų meniu. Marco tuoj prieis.",
        { flags: { 2: "“are” (here are): no Lithuanian word; štai presents the menus." } }),
      t("Follow | me, | please. | Here's | your | table. | Your | server | will be | right | with | you.",
        "Sekite | mane, | prašau. | Štai | jūsų | staliukas. | Jūsų | padavėjas | bus | tuoj | pas | jus.",
        "Sekite mane. Štai jūsų staliukas. Padavėjas tuoj prieis."),
    ],
    host_order: [
      t("Sure! | I'll let | your | server | know.", "Žinoma! | Pranešiu | jūsų | padavėjui | —.", "Žinoma! Pranešiu padavėjui.",
        { flags: { 4: "“know” (let … know): pranešti already means “let know”." } }),
    ],

    // --- Marco, the server
    m_greet: [
      t("Hi, | I'm | Marco. | I'll be | your | server | tonight.", "Sveiki, | aš esu | Marco. | Būsiu | jūsų | padavėjas | šįvakar.", "Sveiki, aš Marco. Šįvakar jus aptarnausiu."),
      t("Hello! | My | name | is | Marco, | and | I'll be | your | server.", "Sveiki! | Mano | vardas | yra | Marco, | ir | būsiu | jūsų | padavėjas.", "Sveiki! Mano vardas Marco, aš jus aptarnausiu."),
    ],
    m_greet_hay: [
      t("Hi, | I'm | Marco, | your | server. | How | are | you | doing | tonight?", "Sveiki, | aš esu | Marco, | jūsų | padavėjas. | Kaip | — | jums | sekasi | šįvakar?",
        "Sveiki, aš Marco, jūsų padavėjas. Kaip jums sekasi šįvakar?",
        { flags: { 6: "Progressive “are” has no Lithuanian word; sekasi carries the tense (linked to “doing”)." } }),
    ],
    ask_drinks: [
      t("Can | I | get | you | something | to drink?", "Ar galiu | aš | atnešti | jums | ko nors | atsigerti?", "Ar atnešti jums ko nors atsigerti?"),
      t("What | can | I | get | you | to drink?", "Ką | galiu | aš | atnešti | jums | atsigerti?", "Ką jums atnešti atsigerti?"),
      t("Would | you | like | something | to drink?", "Ar | jūs | norėtumėte | ko nors | atsigerti?", "Norėtumėte ko nors atsigerti?",
        { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte (linked to “like”)." } }),
    ],
    ask_drinks_again: [
      t("And | anything | to drink?", "O | ko nors | atsigerti?", "O ko nors atsigerti?"),
    ],
    what_drink: [
      t("Sure! | What | would | you | like?", "Žinoma! | Ko | — | jūs | norėtumėte?", "Žinoma! Ko norėtumėte?", { flags: { 2: "“would”: the conditional ending of norėtumėte carries it (linked to “like”)." } }),
    ],
    ask_water_kind: [
      t("Still | or | sparkling?", "Negazuoto | ar | gazuoto?", "Negazuoto ar gazuoto?"),
      t("Sure! | Tap, | still | or | sparkling?", "Žinoma! | Iš čiaupo, | negazuoto | ar | gazuoto?", "Žinoma! Vandens iš čiaupo, negazuoto ar gazuoto?"),
    ],
    ask_wine_kind: [
      t("Red | or | white?", "Raudono | ar | balto?", "Raudono ar balto?"),
      t("Sure. | Would | you | like | red | or | white?", "Žinoma. | Ar | jūs | norėtumėte | raudono | ar | balto?", "Žinoma. Norėtumėte raudono ar balto?",
        { flags: { 1: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte (linked to “like”)." } }),
    ],
    ask_soda_kind: [
      t("We | have | Coke, | Diet | Coke | and | Sprite.", "Mes | turime | kolos, | dietinės | kolos | ir | „Sprite“.", "Turime kolos, dietinės kolos ir „Sprite“."),
      t("Sure! | Coke, | Diet | Coke | or | Sprite?", "Žinoma! | Kolos, | dietinės | kolos | ar | „Sprite“?", "Žinoma! Kolos, dietinės kolos ar „Sprite“?"),
    ],
    ask_coffee_kind: [
      t("Regular | or | decaf?", "Paprastos | ar | be kofeino?", "Paprastos ar be kofeino?"),
    ],
    ask_pasta_kind: [
      t("Which one? | We | have | the | lasagna | and | the | penne | arrabbiata.", "Kurį? | Mes | turime | — | lazaniją | ir | — | penne | arabiata.", "Kurį patiekalą? Turime lazaniją ir penne arabiata."),
    ],
    drinks_ack: [
      t("Great, | I'll bring | that | right | out.", "Puiku, | atnešiu | tai | tuoj | —.", "Puiku, tuoj atnešiu.",
        { flags: { 4: "“out” (bring … out): atnešti already includes the movement; no separate word." } }),
      t("Coming right up!", "Tuoj bus!", "Tuoj bus!"),
    ],
    drinks_served: [
      t("Here | are | your | drinks.", "Štai | — | jūsų | gėrimai.", "Štai jūsų gėrimai.", { flags: { 1: "“are” (here are): no Lithuanian word; štai presents them." } }),
    ],
    drink_served: [
      t("Here's | your | {X}.", "Štai | jūsų | {X:nom}.", "Štai jūsų {X:nom}."),
    ],
    specials: [
      t("Our | specials | tonight | are | the | grilled | salmon | and | a | mushroom | risotto.",
        "Mūsų | pasiūlymai | šįvakar | yra | — | ant grotelių kepta | lašiša | ir | — | grybų | rizotas.",
        "Šįvakar siūlome ant grotelių keptą lašišą ir grybų rizotą."),
      t("Tonight's | special | is | the | grilled | salmon. | It's | really | fresh.",
        "Šio vakaro | pasiūlymas | yra | — | ant grotelių kepta | lašiša. | Ji yra | tikrai | šviežia.",
        "Šio vakaro pasiūlymas – ant grotelių kepta lašiša. Ji tikrai šviežia."),
    ],
    ask_ready: [
      t("Are | you | ready | to order?", "Ar esate | jūs | {m:pasiruošęs|f:pasiruošusi} | užsisakyti?", "Ar jau išsirinkote?"),
      t("Have | you | decided?", "Ar | jūs | išsirinkote?", "Ar jau išsirinkote?",
        { flags: { 0: "Question “Have” = the particle ar; the past tense sits on išsirinkote (linked to “decided”)." } }),
      t("Are | you | ready | to order, | or | do | you | need | a | few | more | minutes?",
        "Ar esate | jūs | {m:pasiruošęs|f:pasiruošusi} | užsisakyti, | ar | — | jums | reikia | — | kelių | papildomų | minučių?",
        "Ar jau išsirinkote, ar dar reikia kelių minučių?",
        { flags: { 5: "Question “do”: the question is already marked by ar (“or”); no separate word." } }),
    ],
    ask_order: [
      t("What | can | I | get | for you?", "Ką | galiu | aš | atnešti | jums?", "Ką jums atnešti?"),
      t("So, | what | can | I | get | you | tonight?", "Tai, | ką | galiu | aš | atnešti | jums | šįvakar?", "Tai ką jums šįvakar atnešti?"),
    ],
    ready_ok: [
      t("Great! | What | can | I | get | for you?", "Puiku! | Ką | galiu | aš | atnešti | jums?", "Puiku! Ką jums atnešti?"),
    ],
    take_time: [
      t("Of course, | take your time. | Just | let me know | when | you're | ready.",
        "Žinoma, | neskubėkite. | Tiesiog | praneškite | kai | būsite | {m:pasiruošęs|f:pasiruošusi}.",
        "Žinoma, neskubėkite. Tiesiog pasakykite, kai būsite {m:pasiruošęs|f:pasiruošusi}."),
      t("No | rush! | Take your time.", "Jokio | skubėjimo! | Neskubėkite.", "Neskubėkite!"),
    ],
    ack_order: [
      t("Great | choice!", "Puikus | pasirinkimas!", "Puikus pasirinkimas!"),
      t("Excellent.", "Puiku.", "Puiku."),
      t("Sounds | good.", "Skamba | gerai.", "Puiku."),
    ],
    ack: [
      t("Okay.", "Gerai.", "Gerai."),
      t("Got it.", "Supratau.", "Supratau."),
      t("Perfect.", "Puiku.", "Puiku."),
    ],
    ask_doneness: [
      t("How | would | you | like | your | steak | cooked?", "Kaip | — | jūs | norėtumėte | savo | kepsnį | iškeptą?", "Kaip iškepti kepsnį?",
        { flags: { 1: "“would”: the conditional ending of norėtumėte carries it (linked to “like”)." } }),
      t("And | how | would | you | like | that | cooked?", "O | kaip | — | jūs | norėtumėte | jį | iškeptą?", "O kaip jį iškepti?",
        { flags: { 2: "“would”: the conditional ending of norėtumėte carries it (linked to “like”)." } }),
    ],
    doneness_options: [
      t("Rare, | medium | or | well-done?", "Mažai iškeptą, | vidutiniškai iškeptą | ar | gerai iškeptą?", "Mažai, vidutiniškai ar gerai iškeptą?"),
    ],
    doneness_list: [
      t("We | can | do | rare, | medium-rare, | medium, | medium-well | or | well-done.",
        "Mes | galime | iškepti | mažai, | vidutiniškai mažai, | vidutiniškai, | beveik gerai | arba | gerai.",
        "Galime iškepti mažai, vidutiniškai mažai, vidutiniškai, beveik gerai arba gerai."),
    ],
    doneness_ok: [
      t("Perfect, | {X}.", "Puiku, | {X:nom}.", "Puiku, {X:nom}."),
    ],
    for_which: [
      t("Sorry, | for | which | dish?", "Atsiprašau, | — | kuriam | patiekalui?", "Atsiprašau, kuriam patiekalui?",
        { flags: { 1: "“for”: the dative ending of kuriam patiekalui carries it (C-CASE-DASH, “which” intervenes)." } }),
    ],
    ask_side: [
      t("Great, | it | comes | with | a | side. | Would | you | like | fries, | roasted | potatoes, | a | green | salad | or | grilled | vegetables?",
        "Puiku, | {jis@X:nom} | {patiekiamas@X:nom} | su | — | garnyru. | Ar | jūs | norėtumėte | bulvyčių, | keptų | bulvių, | — | žalių | salotų | ar | ant grotelių keptų | daržovių?",
        "Puiku, prie {jis@X:gen} patiekiamas garnyras. Norėtumėte bulvyčių, keptų bulvių, žalių salotų ar ant grotelių keptų daržovių?",
        { flags: { 6: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte (linked to “like”)." } }),
      t("And | what | side | would | you | like | with | that?", "O | kokio | garnyro | — | jūs | norėtumėte | prie | to?", "O kokio garnyro norėtumėte?",
        { flags: { 3: "“would”: the conditional ending of norėtumėte carries it (linked to “like”)." } }),
    ],
    side_list: [
      t("We | have | fries, | roasted | potatoes, | a | green | salad | and | grilled | vegetables.",
        "Mes | turime | bulvyčių, | keptų | bulvių, | — | žalių | salotų | ir | ant grotelių keptų | daržovių.",
        "Turime bulvyčių, keptų bulvių, žalių salotų ir ant grotelių keptų daržovių."),
    ],
    side_changed: [
      t("Sure, | no | problem.", "Žinoma, | jokių | problemų.", "Žinoma, jokių problemų."),
    ],
    ask_main: [
      t("And | for | your | main | course?", "O | — | jūsų | pagrindiniam | patiekalui?", "O ką imsite pagrindiniam patiekalui?",
        { flags: { 1: "“for”: the dative ending of patiekalui carries it (C-CASE-DASH, “your main” intervenes)." } }),
      t("And | what | would | you | like | for | your | main | course?", "O | ko | — | jūs | norėtumėte | — | savo | pagrindiniam | patiekalui?", "O ko norėtumėte pagrindiniam patiekalui?",
        { flags: { 2: "“would”: the conditional ending of norėtumėte carries it (linked to “like”).", 5: "“for”: the dative ending of patiekalui carries it (C-CASE-DASH, “your main” intervenes)." } }),
    ],
    soup_offer: [
      t("Would | you | like | to start | with | a | cup | of | our | minestrone | soup? | It's | homemade.",
        "Ar | jūs | norėtumėte | pradėti | nuo | — | puodelio | — | mūsų | minestrone | sriubos? | Ji yra | naminė.",
        "Gal norėtumėte pradėti nuo puodelio mūsų minestrone sriubos? Ji naminė.",
        { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte (linked to “like”).", 7: "“of”: the genitive ending of sriubos carries it (C-CASE-DASH, “our minestrone” intervenes)." } }),
    ],
    placed: [
      t("Great! | I'll send | your | order | to | the | kitchen.", "Puiku! | Nusiųsiu | jūsų | užsakymą | į | — | virtuvę.", "Puiku! Perduosiu jūsų užsakymą į virtuvę."),
      t("Excellent | choice. | It | won't take | long.", "Puikus | pasirinkimas. | Tai | neužtruks | ilgai.", "Puikus pasirinkimas. Tai neužtruks ilgai."),
    ],
    serve: [
      t("Here you go: | {X.the}. | Enjoy!", "Prašom: | {X.the:nom}. | Skanaus!", "Prašom: {X:nom}. Skanaus!"),
      t("And | here's | {X.the}. | Enjoy | your | meal!", "O | štai | {X.the:nom}. | Mėgaukitės | savo | patiekalu!", "O štai {X:nom}. Skanaus!"),
    ],
    serve_starter: [
      t("Here's | {X.the} | to start.", "Štai | {X.the:nom} | pradžiai.", "Štai {X:nom} pradžiai."),
    ],
    wrong_sorry: [
      t("Oh, | I'm | so | sorry! | That's | for | another | table. | I'll bring | {X.the} | right away.",
        "O, | aš | labai | atsiprašau! | Tai yra | — | kitam | staliukui. | Atnešiu | {X.the:acc} | tuoj pat.",
        "O, labai atsiprašau! Tai kitam staliukui. Tuoj pat atnešiu {X:acc}.",
        { flags: { 1: "“I'm … sorry”: the apology verb atsiprašau carries “am … sorry”; no copula here.", 5: "“for”: the dative ending of staliukui carries it (C-CASE-DASH, “another” intervenes)." } }),
      t("I'm | so | sorry | about | that! | Let | me | fix | it | right away.",
        "Aš | labai | atsiprašau | dėl | to! | Leiskite | man | pataisyti | tai | tuoj pat.",
        "Labai atsiprašau! Tuoj pat pataisysiu.",
        { flags: { 0: "“I'm … sorry”: the apology verb atsiprašau carries “am … sorry”; no copula here." } }),
    ],
    wrong_noticed: [
      t("Wait, | you | ordered | {X.the}, | didn't you? | I'm | so | sorry! | This | is | for | another | table.",
        "Palaukite, | jūs | užsisakėte | {X.the:acc}, | ar ne? | Aš | labai | atsiprašau! | Šis | yra | — | kitam | staliukui.",
        "Palaukite, jūs juk užsisakėte {X:acc}, ar ne? Labai atsiprašau! Šis patiekalas – kitam staliukui.",
        { flags: { 5: "“I'm … sorry”: the apology verb atsiprašau carries “am … sorry”; no copula here.", 10: "“for”: the dative ending of staliukui carries it (C-CASE-DASH, “another” intervenes)." } }),
    ],
    serve_fixed: [
      t("Here's | {X.the}. | Sorry | about | the | wait!", "Štai | {X.the:nom}. | Atsiprašau | dėl | — | laukimo!", "Štai {X:nom}. Atsiprašau, kad teko palaukti!"),
    ],
    ordered_coming: [
      t("Don't worry, | {X.the} | is | coming right up!", "Nesijaudinkite, | {X.the:nom} | — | tuoj bus!", "Nesijaudinkite, {X:nom} tuoj bus!",
        { flags: { 2: "Progressive “is” has no separate Lithuanian word; tuoj bus carries it (linked to “coming right up”)." } }),
    ],
    ask_checkback: [
      t("How | is | everything?", "Kaip | patinka | viskas?", "Ar viskas patinka?"),
      t("Is | everything | okay | here?", "Ar | viskas | gerai | čia?", "Ar viskas gerai?",
        { flags: { 0: "“Is” in a yes/no question = the particle ar; the copula has no separate word here (linked to “okay”)." } }),
      t("How | is | everything | tonight?", "Kaip | patinka | viskas | šįvakar?", "Ar viskas patinka?"),
    ],
    ask_checkback_soup: [
      t("How's | the | soup?", "Kaip patinka | — | sriuba?", "Kaip patinka sriuba?"),
    ],
    all_good_reply: [
      t("Glad | to hear | it! | Enjoy!", "Smagu | girdėti | tai! | Skanaus!", "Smagu girdėti! Skanaus!"),
      t("Great! | Let me know | if | you | need | anything.", "Puiku! | Praneškite | jei | jums | prireiks | ko nors.", "Puiku! Jei ko nors prireiks, pasakykite."),
    ],
    compliments_reply: [
      t("Thank | you! | I'll tell | the | chef.", "Dėkoju | jums! | Pasakysiu | — | virėjui.", "Ačiū! Perduosiu virėjui."),
    ],
    what_wrong: [
      t("Oh | no! | What's | wrong?", "O | ne! | Kas yra | negerai?", "O ne! Kas negerai?"),
    ],
    cold_sorry: [
      t("Oh, | I'm | so | sorry! | I'll warm | it | up | right away.", "O, | aš | labai | atsiprašau! | Pašildysiu | {jis@X:acc} | — | tuoj pat.", "O, labai atsiprašau! Tuoj pat pašildysiu.",
        { flags: { 1: "“I'm … sorry”: the apology verb atsiprašau carries “am … sorry”; no copula here.", 6: "“up” (warm … up): the prefix pa- of pašildysiu carries it." } }),
    ],
    cold_fixed: [
      t("Here you go, | nice and hot.", "Prašom, | {karštutėlis@X:nom}.", "Prašom – dabar {karštutėlis@X:nom}!"),
    ],
    other_sorry: [
      t("I'm | so | sorry | about | that. | Let | me | take | it | back | to | the | kitchen.",
        "Aš | labai | atsiprašau | dėl | to. | Leiskite | man | nunešti | tai | atgal | į | — | virtuvę.",
        "Labai atsiprašau. Leiskite nunešti atgal į virtuvę.",
        { flags: { 0: "“I'm … sorry”: the apology verb atsiprašau carries “am … sorry”; no copula here." } }),
    ],
    other_fixed: [
      t("Here you go, | freshly | made. | Sorry | again!", "Prašom, | ką tik | {pagamintas@X:nom}. | Atsiprašau | dar kartą!", "Prašom, ką tik {pagamintas@X:nom}. Dar kartą atsiprašau!"),
    ],
    request_ok: [
      t("Sure, | coming right up!", "Žinoma, | tuoj bus!", "Žinoma, tuoj bus!"),
      t("Of course! | I'll bring | that | right | over.", "Žinoma! | Atnešiu | tai | tuoj | —.", "Žinoma! Tuoj atnešiu.",
        { flags: { 4: "“over” (bring … over): atnešti already includes the movement to you." } }),
    ],
    bread_ok: [
      t("Sure! | I'll bring | you | some | more | bread.", "Žinoma! | Atnešiu | jums | — | daugiau | duonos.", "Žinoma! Atnešiu jums daugiau duonos.",
        { flags: { 3: "Partitive “some”: the genitive duonos carries it." } }),
    ],
    refill_ok: [
      t("Of course! | Refills | are | free.", "Žinoma! | Papildymai | yra | nemokami.", "Žinoma! Papildomai įpilame nemokamai."),
    ],
    recommend: [
      t("The | lasagna | is | my | favorite. | It's | homemade.", "— | Lazanija | yra | mano | mėgstamiausia. | Ji yra | naminė.", "Mano mėgstamiausia – lazanija. Ji naminė."),
      t("The | salmon | is | really | fresh | tonight.", "— | Lašiša | yra | tikrai | šviežia | šįvakar.", "Šįvakar lašiša tikrai šviežia."),
      t("Everybody | loves | our | chicken | parmesan.", "Visi | dievina | mūsų | vištieną | su parmezanu.", "Visi dievina mūsų vištieną su parmezanu."),
    ],
    recommend_dessert: [
      t("The | tiramisu | is | amazing. | It's | homemade.", "— | Tiramisu | yra | nuostabus. | Jis yra | naminis.", "Tiramisu nuostabus – naminis."),
    ],
    menu_line: [
      t("We | have | pasta, | pizza, | steak | and | fish.", "Mes | turime | makaronų, | picų, | kepsnių | ir | žuvies.", "Turime makaronų, picų, kepsnių ir žuvies."),
    ],
    drinks_list: [
      t("We | have | lemonade, | iced | tea, | soda, | red | and | white | wine, | and | beer.",
        "Mes | turime | limonado, | ledinės | arbatos, | gazuotų gėrimų, | raudono | ir | balto | vyno, | ir | alaus.",
        "Turime limonado, ledinės arbatos, gazuotų gėrimų, raudono ir balto vyno bei alaus."),
    ],
    starters_list: [
      t("For starters | we | have | bruschetta, | Caesar | salad, | minestrone | soup | and | garlic | bread.",
        "Užkandžiams | mes | turime | brusketų, | Cezario | salotų, | minestrone | sriubos | ir | česnakinės | duonos.",
        "Užkandžiams turime brusketų, Cezario salotų, minestrone sriubos ir česnakinės duonos."),
    ],
    mains_list: [
      t("Our | mains | are | lasagna, | penne | arrabbiata, | risotto, | chicken | parmesan, | salmon, | steak | and | a | burger.",
        "Mūsų | pagrindiniai patiekalai | yra | lazanija, | penne | arabiata, | rizotas, | vištiena | su parmezanu, | lašiša, | kepsnys | ir | — | mėsainis.",
        "Pagrindiniai patiekalai: lazanija, penne arabiata, rizotas, vištiena su parmezanu, lašiša, jautienos kepsnys ir mėsainis."),
    ],
    dessert_list: [
      t("We | have | tiramisu, | chocolate | cake, | cheesecake, | panna cotta | and | gelato.",
        "Mes | turime | tiramisu, | šokoladinio | torto, | sūrio pyrago, | panakotos | ir | ledų.",
        "Turime tiramisu, šokoladinio torto, sūrio pyrago, panakotos ir ledų."),
    ],
    desc_bruschetta: [t("It's | toasted | bread | with | tomatoes, | garlic | and | basil.", "Tai yra | skrudinta | duona | su | pomidorais, | česnakais | ir | baziliku.", "Tai skrudinta duona su pomidorais, česnakais ir baziliku.")],
    desc_minestrone: [t("It's | a | vegetable | soup | with | beans | and | pasta.", "Tai yra | — | daržovių | sriuba | su | pupelėmis | ir | makaronais.", "Tai daržovių sriuba su pupelėmis ir makaronais.")],
    desc_penne: [t("It's | pasta | in | a | spicy | tomato | sauce.", "Tai yra | makaronai | — | — | aštriame | pomidorų | padaže.", "Tai makaronai aštriame pomidorų padaže.",
      { flags: { 2: "“in”: the locative ending of padaže carries it (C-CASE-DASH, “a spicy tomato” intervenes)." } })],
    desc_risotto: [t("It's | creamy | rice | with | mushrooms | and | parmesan.", "Tai yra | kreminiai | ryžiai | su | grybais | ir | parmezanu.", "Tai kreminiai ryžiai su grybais ir parmezanu.")],
    desc_chicken: [t("It's | breaded | chicken | with | tomato | sauce | and | melted | cheese.", "Tai yra | paniruota | vištiena | su | pomidorų | padažu | ir | išlydytu | sūriu.", "Tai paniruota vištiena su pomidorų padažu ir išlydytu sūriu.")],
    desc_tiramisu: [t("It's | an | Italian | dessert | with | coffee | and | mascarpone.", "Tai yra | — | itališkas | desertas | su | kava | ir | maskarponės sūriu.", "Tai itališkas desertas su kava ir maskarponės sūriu.")],
    desc_panna_cotta: [t("It's | a | cream | dessert | with | berry | sauce.", "Tai yra | — | grietinėlės | desertas | su | uogų | padažu.", "Tai grietinėlės desertas su uogų padažu.")],
    desc_gelato: [t("It's | Italian | ice cream.", "Tai yra | itališki | ledai.", "Tai itališki ledai.")],
    desc_generic: [
      t("It's | one | of | our | most | popular | dishes.", "Tai yra | vienas | iš | mūsų | — | populiariausių | patiekalų.", "Tai vienas populiariausių mūsų patiekalų.",
        { flags: { 4: "“most”: the superlative suffix of populiariausių carries it." } }),
    ],
    comes_side: [
      t("Sure, | {X.the} | comes | with | a | side: | fries, | roasted | potatoes, | a | green | salad | or | grilled | vegetables.",
        "Žinoma, | {X.the:nom} | {patiekiamas@X:nom} | su | — | garnyru: | bulvytėmis, | keptomis | bulvėmis, | — | žaliomis | salotomis | arba | ant grotelių keptomis | daržovėmis.",
        "Prie {X:gen} patiekiamas garnyras: bulvytės, keptos bulvės, žalios salotos arba ant grotelių keptos daržovės."),
    ],
    comes_spaghetti: [
      t("Sure, | {X.the} | comes | with | spaghetti.", "Žinoma, | {X.the:nom} | {patiekiamas@X:nom} | su | spagečiais.", "Žinoma, {X:nom} {patiekiamas@X:nom} su spagečiais."),
    ],
    comes_salad: [
      t("Sure, | {X.the} | comes | with | a | small | salad.", "Žinoma, | {X.the:nom} | {patiekiamas@X:nom} | su | — | mažomis | salotomis.", "Žinoma, {X:nom} {patiekiamas@X:nom} su mažomis salotomis."),
    ],
    comes_alone: [
      t("Oh, | {X.the} | comes | on its own.", "O, | {X.the:nom} | {patiekiamas@X:nom} | be priedų.", "O, {X:nom} {patiekiamas@X:nom} be priedų."),
    ],
    spicy_yes: [t("Yes, | it's | pretty | spicy.", "Taip, | tai yra | gana | aštru.", "Taip, gana aštru.")],
    spicy_no: [t("No, | not at all.", "Ne, | visai ne.", "Ne, visai neaštru.")],
    spicy_which: [
      t("The | arrabbiata | is | the | only | spicy | dish.", "— | Arabiata | yra | — | vienintelis | aštrus | patiekalas.", "Aštrus tik penne arabiata patiekalas."),
    ],
    veg_list: [
      t("Yes! | The | mushroom | risotto, | the | pizza | and | the | penne | are | all | vegetarian.",
        "Taip! | — | Grybų | rizotas, | — | pica | ir | — | penne | yra | visi | vegetariški.",
        "Taip! Grybų rizotas, pica „Margarita“ ir penne arabiata – vegetariški patiekalai."),
    ],
    veg_yes: [t("Yes, | it's | vegetarian.", "Taip, | tai yra | vegetariška.", "Taip, tai vegetariška.")],
    veg_no: [t("No, | it | has | meat.", "Ne, | {jis@X:loc} | yra | mėsos.", "Ne, {jis@X:loc} yra mėsos.")],
    allergy_check: [
      t("Let | me | check | with | the | chef.", "Leiskite | man | pasitikslinti | pas | — | virėją.", "Tuoj pasitikslinsiu pas virėją."),
    ],
    nuts_ok: [
      t("Good | news: | {X.the} | is | nut-free.", "Geros | naujienos: | {X.the:nom} | yra | be riešutų.", "Geros naujienos: {X:nom} – be riešutų."),
    ],
    nuts_bad: [
      t("Sorry, | {X.the} | has | hazelnuts.", "Atsiprašau, | {X.the:nom} | turi | lazdyno riešutų.", "Atsiprašau, {X:nom} su lazdyno riešutais."),
    ],
    nuts_general: [
      t("Most | of | our | dishes | are | nut-free. | Only | the | chocolate | cake | has | hazelnuts.",
        "Dauguma | — | mūsų | patiekalų | yra | be riešutų. | Tik | — | šokoladinis | tortas | turi | lazdyno riešutų.",
        "Dauguma mūsų patiekalų – be riešutų. Lazdyno riešutų yra tik šokoladiniame torte.",
        { flags: { 1: "“of”: the genitive ending of patiekalų carries it (C-CASE-DASH, “our” intervenes)." } }),
    ],
    gluten_info: [
      t("We | have | gluten-free | pasta, | and | the | risotto | is | gluten-free | too.",
        "Mes | turime | be glitimo | makaronų, | ir | — | rizotas | yra | be glitimo | taip pat.",
        "Turime makaronų be glitimo, o rizotas irgi be glitimo."),
    ],
    allergy_noted: [
      t("Thanks | for | telling | me. | I'll let | the | kitchen | know.", "Ačiū | kad | pasakėte | man. | Pranešiu | — | virtuvei | —.", "Ačiū, kad pasakėte. Pranešiu virtuvei.",
        { flags: { 7: "“know” (let … know): pranešti already means “let know”." } }),
    ],
    price_is: [
      t("It's | {$price}.", "Kainuoja | {$price}.", "Kainuoja {$price}."),
    ],
    not_long: [
      t("It | won't take | long.", "Tai | neužtruks | ilgai.", "Tai neužtruks ilgai."),
    ],
    which_item: [t("Which one?", "Kurį?", "Kurį patiekalą?")],
    have_yes: [
      t("Yes, | we | do!", "Taip, | mes | turime!", "Taip, turime!", { flags: { 2: "“do” (elliptical): Lithuanian repeats the verb, turime." } }),
    ],
    have_no: [
      t("Sorry, | we | don't have | that.", "Atsiprašau, | mes | neturime | to.", "Atsiprašau, to neturime."),
    ],
    unknown_order: [
      t("Hmm, | sorry, | we | don't have | that | here.", "Hmm, | atsiprašau, | mes | neturime | to | čia.", "Hmm, atsiprašau, to neturime."),
    ],
    restroom: [
      t("It's | down | the | hall, | on the right.", "Jis yra | gale | — | koridoriaus, | dešinėje.", "Koridoriaus gale, dešinėje."),
    ],
    reject_ok: [
      t("No | problem! | What | would | you | like | instead?", "Jokių | problemų! | Ko | — | jūs | norėtumėte | vietoj to?", "Jokių problemų! Ko norėtumėte vietoj to?",
        { flags: { 3: "“would”: the conditional ending of norėtumėte carries it (linked to “like”)." } }),
    ],
    removed: [t("Okay, | no | {X}.", "Gerai, | be | {X:gen}.", "Gerai, be {X:gen}.")],
    changed: [
      t("Sure, | no | problem.", "Žinoma, | jokių | problemų.", "Žinoma, jokių problemų."),
      t("Okay, | I | changed | it.", "Gerai, | aš | pakeičiau | tai.", "Gerai, pakeičiau."),
    ],
    no_problem: [t("No | problem.", "Jokių | problemų.", "Jokių problemų.")],
    ask_box: [
      t("Would | you | like | a | box | for that?", "Ar | jūs | norėtumėte | — | dėžutės | tam?", "Gal supakuoti likučius išsinešti?",
        { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte (linked to “like”)." } }),
      t("Can | I | get | you | a | box | for the rest?", "Ar galiu | aš | atnešti | jums | — | dėžutę | likučiams?", "Gal atnešti dėžutę likučiams?"),
    ],
    box_ok: [t("Sure, | I'll bring | you | a | box.", "Žinoma, | atnešiu | jums | — | dėžutę.", "Žinoma, atnešiu jums dėžutę.")],
    ask_dessert: [
      t("Did | you | save | room | for dessert?", "Ar | jūs | palikote | vietos | desertui?", "Ar dar liko vietos desertui?",
        { flags: { 0: "Question “Did” = the particle ar; the past tense sits on palikote (linked to “save”)." } }),
      t("Would | you | like | to see | the | dessert | menu?", "Ar | jūs | norėtumėte | pamatyti | — | desertų | meniu?", "Gal norėtumėte pažiūrėti desertų meniu?",
        { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte (linked to “like”)." } }),
      t("Can | I | get | you | some | dessert | or | coffee?", "Ar galiu | aš | atnešti | jums | — | deserto | ar | kavos?", "Gal atnešti deserto ar kavos?",
        { flags: { 4: "Partitive “some”: the genitive endings of deserto and kavos carry it." } }),
    ],
    dessert_ack: [
      t("Coming right up!", "Tuoj bus!", "Tuoj bus!"),
      t("Great | choice! | I'll bring | it | right | out.", "Puikus | pasirinkimas! | Atnešiu | tai | tuoj | —.", "Puikus pasirinkimas! Tuoj atnešiu.",
        { flags: { 5: "“out” (bring … out): atnešti already includes the movement; no separate word." } }),
    ],
    serve_dessert: [
      t("Here's | {X.the}. | Enjoy!", "Štai | {X.the:nom}. | Skanaus!", "Štai {X:nom}. Skanaus!"),
    ],
    ask_check_else: [
      t("Can | I | get | you | anything | else?", "Ar galiu | aš | atnešti | jums | ką nors | daugiau?", "Ar dar ko nors norėtumėte?"),
      t("Anything | else | I | can | get | for you | tonight?", "Ką nors | daugiau | aš | galiu | atnešti | jums | šįvakar?", "Gal dar ko nors šįvakar?"),
    ],
    what_else: [
      t("Sure! | What | else | can | I | get | you?", "Žinoma! | Ką | dar | galiu | aš | atnešti | jums?", "Žinoma! Ką dar jums atnešti?"),
    ],
    check_coming: [
      t("Sure! | I'll bring | the | check | right | over.", "Žinoma! | Atnešiu | — | sąskaitą | tuoj | —.", "Žinoma! Tuoj atnešiu sąskaitą.",
        { flags: { 5: "“over” (bring … over): atnešti already includes the movement to you." } }),
      t("Of course. | I'll get | your | check.", "Žinoma. | Atnešiu | jūsų | sąskaitą.", "Žinoma. Atnešiu jūsų sąskaitą."),
    ],
    check_later: [
      t("Of course! | I'll bring | it | after | your | meal.", "Žinoma! | Atnešiu | ją | po | jūsų | valgio.", "Žinoma! Atnešiu po valgio."),
    ],
    check_whenever: [
      t("Alright. | Just | let me know | when | you | want | the | check.", "Gerai. | Tiesiog | praneškite | kai | jūs | norėsite | — | sąskaitos.",
        "Gerai. Tiesiog pasakykite, kai norėsite sąskaitos."),
    ],
    ask_split: [
      t("Will | this | be | together | or | separate?", "Ar | tai | bus | kartu | ar | atskirai?", "Mokėsite kartu ar atskirai?",
        { flags: { 0: "Question “Will” = the particle ar; the future sits on bus (linked to “be”)." } }),
      t("Is | this | all | on | one | check, | or | separate?", "Ar | tai | viskas | — | vienoje | sąskaitoje, | ar | atskirai?", "Viskas vienoje sąskaitoje ar atskirai?",
        { flags: { 0: "“Is” in a yes/no question = the particle ar; the copula has no separate word here.", 3: "“on”: the locative ending of sąskaitoje carries it (C-CASE-DASH, “one” intervenes)." } }),
    ],
    split_together_ok: [t("Perfect, | one | check.", "Puiku, | viena | sąskaita.", "Puiku, viena sąskaita.")],
    split_sep_ok: [t("No | problem, | I'll split | it | for you.", "Jokių | problemų, | padalinsiu | ją | jums.", "Jokių problemų, padalinsiu sąskaitą.")],
    bring_check: [
      t("Here's | your | check.", "Štai | jūsų | sąskaita.", "Štai jūsų sąskaita."),
      t("Here you go, | here's | your | check.", "Prašom, | štai | jūsų | sąskaita.", "Prašom, štai jūsų sąskaita."),
    ],
    total_is: [
      t("Your | total | is | {$price}.", "Jūsų | suma | yra | {$price}.", "Iš viso {$price}."),
    ],
    no_rush: [
      t("No | rush.", "Jokio | skubėjimo.", "Neskubėkite."),
    ],
    bring_checks: [
      t("Here | are | your | checks. | No | rush.", "Štai | — | jūsų | sąskaitos. | Jokio | skubėjimo.", "Štai jūsų sąskaitos. Neskubėkite.",
        { flags: { 1: "“are” (here are): no Lithuanian word; štai presents them." } }),
    ],
    ask_pay_method: [t("Card | or | cash?", "Kortele | ar | grynaisiais?", "Kortele ar grynaisiais?")],
    card_reader: [
      t("Sure! | Just | tap | your | card | here. | It'll ask | you | about | the | tip | first.",
        "Žinoma! | Tiesiog | pridėkite | savo | kortelę | čia. | Paklaus | jūsų | apie | — | arbatpinigius | pirmiausia.",
        "Žinoma! Tiesiog pridėkite kortelę čia. Pirmiausia aparatas paklaus apie arbatpinigius."),
    ],
    // with the check, when the learner said earlier they'd pay by card
    reader_here: [
      t("And | here's | the | card | reader. | It'll ask | you | about | the | tip | first.",
        "Ir | štai | — | kortelių | skaitytuvas. | Paklaus | jūsų | apie | — | arbatpinigius | pirmiausia.",
        "O štai ir mokėjimo terminalas. Pirmiausia jis paklaus apie arbatpinigius."),
    ],
    tip_screen: [
      t("Just | choose | the | tip | on the screen.", "Tiesiog | pasirinkite | — | arbatpinigius | ekrane.", "Tiesiog pasirinkite arbatpinigius ekrane."),
    ],
    tip_included_no: [
      t("No, | it's | not included. | Most | people | leave | fifteen | to | twenty | percent.",
        "Ne, | jie yra | neįskaičiuoti. | Dauguma | žmonių | palieka | penkiolika | iki | dvidešimties | procentų.",
        "Ne, jie neįskaičiuoti. Dauguma žmonių palieka nuo 15 iki 20 procentų."),
      t("No, | the | tip | isn't included. | Most | people | leave | about | twenty | percent.",
        "Ne, | — | arbatpinigiai | neįskaičiuoti. | Dauguma | žmonių | palieka | apie | dvidešimt | procentų.",
        "Ne, arbatpinigiai neįskaičiuoti. Dauguma žmonių palieka apie 20 procentų."),
    ],
    tip_thanks: [
      t("Perfect, | you're all set.", "Puiku, | viskas sutvarkyta.", "Puiku, viskas sutvarkyta."),
      t("That's | very | kind. | You're all set!", "Tai yra | labai | malonu. | Viskas sutvarkyta!", "Labai malonu. Viskas sutvarkyta!"),
    ],
    tip_none_ok: [t("Oh... | okay. | You're all set.", "O... | gerai. | Viskas sutvarkyta.", "O... gerai. Viskas sutvarkyta.")],
    cash_ok: [
      t("Great, | I'll bring | your | change | right | over.", "Puiku, | atnešiu | jūsų | grąžą | tuoj | —.", "Puiku, tuoj atnešiu grąžą.",
        { flags: { 5: "“over” (bring … over): atnešti already includes the movement to you." } }),
    ],
    change_back: [
      t("And | here's | your | change.", "Ir | štai | jūsų | grąža.", "Štai jūsų grąža."),
      t("Here's | your | change.", "Štai | jūsų | grąža.", "Štai jūsų grąža."),
    ],
    thanks_tip: [
      t("Oh, | thank | you! | That's | very | generous.", "O, | dėkoju | jums! | Tai yra | labai | dosnu.", "O, ačiū! Labai dosnu."),
    ],
    bye_marco: [
      t("Have | a | great | night!", "Linkiu | — | puikaus | vakaro!", "Gero vakaro!"),
      t("Thanks | for coming! | Come | back | soon!", "Ačiū | kad atėjote! | Ateikite | vėl | greitai!", "Ačiū, kad atėjote! Užsukite dar!"),
    ],
    bye_lucia: [
      t("Good | night! | Thanks | for coming!", "Labos | nakties! | Ačiū | kad atėjote!", "Labos nakties! Ačiū, kad atėjote!"),
      t("Have | a | lovely | evening! | Come | again!", "Linkiu | — | nuostabaus | vakaro! | Užsukite | dar!", "Nuostabaus vakaro! Užsukite dar!"),
    ],
  },

  domains: {
    price: () => {
      const s: number[] = [];
      for (let c = 100; c <= 25000; c += 100) s.push(c);
      return s;
    },
  },

  hints: {
    resv: {
      lt: "Pasakyti apie rezervaciją",
      items: [
        { id: "resv_have", s: t("I | have | a | reservation.", "Aš | turiu | — | rezervaciją.", "Esu {m:rezervavęs|f:rezervavusi} staliuką.") },
        { id: "resv_under", s: t("It's | under | {$name}.", "Ji yra | vardu | {$name}.", "Rezervacija vardu {$name}."), note: "Pasakykite vardą ar pavardę, kuria rezervavote." },
        { id: "no_resv", s: t("No, | we | don't have | a | reservation.", "Ne, | mes | neturime | — | rezervacijos.", "Ne, rezervacijos neturime.") },
        { id: "resv_booked", s: t("We | booked | a | table | for | seven | o'clock.", "Mes | rezervavome | — | staliuką | — | septintai | valandai.", "Rezervavome staliuką septintai valandai.",
          { flags: { 4: "“for”: the dative of septintai valandai carries it." } }) },
      ],
    },
    resv_name: {
      lt: "Pasakyti vardą",
      items: [
        { id: "resv_under", s: t("It's | under | {$name}.", "Ji yra | vardu | {$name}.", "Rezervacija vardu {$name}.") },
        { id: "name_is", s: t("The | name | is | {$name}.", "— | Vardas | yra | {$name}.", "Vardas – {$name}.") },
      ],
    },
    party: {
      lt: "Pasakyti, keliese esate",
      items: [
        { id: "party_two", s: t("Two, | please.", "Dviem, | prašau.", "Dviem, prašau."), note: "Padavėjai klausia „How many?“ – pakanka pasakyti skaičių." },
        { id: "party_just_me", s: t("Just | me, | thanks.", "Tik | aš, | ačiū.", "Tik aš, ačiū.") },
        { id: "table_for", s: t("A | table | for two, | please.", "— | Staliuką | dviem, | prašau.", "Staliuką dviem, prašau.") },
      ],
    },
    wait: {
      lt: "Atsakyti dėl laukimo",
      items: [
        { id: "wait_fine", s: t("That's | fine.", "Tai yra | gerai.", "Tinka.") },
        { id: "wait_can", s: t("Sure, | we | can | wait.", "Žinoma, | mes | galime | palaukti.", "Žinoma, galime palaukti.") },
        { id: "wait_hurry", s: t("Sorry, | we're | in a hurry.", "Atsiprašau, | mes | skubame.", "Atsiprašau, mes skubame.",
          { flags: { 1: "“we're … in a hurry” = skubame: the copula has no separate word (linked to “in a hurry”)." } }) },
      ],
    },
    seat: {
      lt: "Pasirinkti vietą",
      items: [
        { id: "seat_inside", s: t("Inside, | please.", "Viduje, | prašau.", "Viduje, prašau.") },
        { id: "seat_patio_ans", s: t("On the patio, | please.", "Terasoje, | prašau.", "Terasoje, prašau.") },
        { id: "seat_window", s: t("Could | we | sit | by | the | window?", "Ar galėtume | mes | sėdėti | prie | — | lango?", "Ar galėtume sėsti prie lango?") },
      ],
    },
    table: {
      lt: "Paprašyti staliuko",
      items: [
        { id: "table_for", s: t("A | table | for two, | please.", "— | Staliuką | dviem, | prašau.", "Staliuką dviem, prašau.") },
        { id: "table_can", s: t("Can | we | get | a | table | for two?", "Ar galime | mes | gauti | — | staliuką | dviem?", "Ar galėtume gauti staliuką dviem?") },
        { id: "party_just_me", s: t("Just | me, | thanks.", "Tik | aš, | ačiū.", "Tik aš, ačiū.") },
        { id: "q_wait", s: t("How long | is | the | wait?", "Kiek laiko | reikės | — | laukti?", "Kiek laiko reikės laukti?") },
        { id: "seat_window", s: t("Could | we | sit | by | the | window?", "Ar galėtume | mes | sėdėti | prie | — | lango?", "Ar galėtume sėsti prie lango?") },
        { id: "seat_patio", s: t("Could | we | sit | outside?", "Ar galėtume | mes | sėdėti | lauke?", "Ar galėtume sėsti lauke?") },
      ],
    },
    drink: {
      lt: "Užsisakyti gėrimą", slot: "drink", examples: ["lemonade", "sparkling_water", "iced_tea", "red_wine"],
      items: [
        { id: "please_only", s: t("{X.np}, | please.", "{X.np:acc}, | prašau.", "{X.np:acc}, prašau.") },
        { id: "ill_have", s: t("I'll have | {X.np}.", "Imsiu | {X.np:acc}.", "Imsiu {X.np:acc}.") },
        { id: "id_like", s: t("I'd like | {X.np}, | please.", "Norėčiau | {X.np:gen}, | prašau.", "Norėčiau {X.np:gen}, prašau.") },
        { id: "can_i_get", s: t("Can | I | get | {X.np}?", "Ar galiu | aš | gauti | {X.np:acc}?", "Ar galiu gauti {X.np:acc}?"), register: "casual" },
        { id: "could_i_have", s: t("Could | I | have | {X.np}, | please?", "Ar galėčiau | aš | gauti | {X.np:acc}, | prašau?", "Ar galėčiau gauti {X.np:acc}?") },
        { id: "glass_wine", s: t("A | glass | of | {X}, | please.", "— | Taurę | — | {X:gen}, | prašau.", "Taurę {X:gen}, prašau.",
          { flags: { 2: "“of”: the genitive ending carries it." } }), only: (e) => !!e.attrs?.wine && !e.attrs?.generic },
        { id: "tap_water", s: t("Just | tap | water | is fine.", "Tiesiog | vandentiekio | vanduo | tinka.", "Užteks vandens iš čiaupo."),
          note: "JAV restoranuose vanduo iš čiaupo (su ledu) nemokamas." },
        { id: "drinks_none", s: t("Nothing | for me, | thanks.", "Nieko | man, | ačiū.", "Man nieko, ačiū.") },
        { id: "q_drinks", s: t("What | do | you | have | to drink?", "Ką | — | jūs | turite | atsigerti?", "Ką turite atsigerti?",
          { flags: { 1: "Question “do” has no Lithuanian word (linked to “have”)." } }) },
      ],
    },
    starter: {
      lt: "Užsisakyti užkandį", slot: "starter", examples: ["bruschetta", "minestrone", "caesar_salad", "garlic_bread"],
      items: [
        { id: "start_with", s: t("To start, | I'll have | {X.the}.", "Pradžiai, | imsiu | {X.the:acc}.", "Pradžiai imsiu {X.the:acc}.") },
        { id: "to_share", s: t("Could | we | get | {X.the} | to share?", "Ar galėtume | mes | gauti | {X.the:acc} | pasidalinti?", "Ar galėtume gauti {X.the:acc} pasidalinti?"),
          only: (e) => e.id !== "minestrone" },
        { id: "ill_have", s: t("I'll have | {X.the}.", "Imsiu | {X.the:acc}.", "Imsiu {X.the:acc}.") },
      ],
    },
    order_food: {
      lt: "Užsisakyti pagrindinį patiekalą", slot: "main", examples: ["lasagna", "salmon", "steak", "risotto"],
      items: [
        { id: "ill_have", s: t("I'll have | {X.the}, | please.", "Imsiu | {X.the:acc}, | prašau.", "Imsiu {X.the:acc}, prašau."),
          note: "Restorane patiekalas dažnai įvardijamas su „the“: „the lasagna“, „the steak“." },
        { id: "id_like", s: t("I'd like | {X.the}.", "Norėčiau | {X.the:gen}.", "Norėčiau {X.the:gen}.") },
        { id: "could_i_have", s: t("Could | I | get | {X.the}?", "Ar galėčiau | aš | gauti | {X.the:acc}?", "Ar galėčiau gauti {X.the:acc}?") },
        { id: "can_i_get", s: t("Can | I | have | {X.the}, | please?", "Ar galiu | aš | gauti | {X.the:acc}, | prašau?", "Ar galiu gauti {X.the:acc}?"), register: "casual" },
        { id: "for_me", s: t("For me, | {X.the}, | please.", "Man, | {X.the:acc}, | prašau.", "Man {X.the:acc}, prašau.") },
        { id: "think_ill", s: t("I | think | I'll go with | {X.the}.", "Aš | manau | rinksiuosi | {X.the:acc}.", "Manau, rinksiuosi {X.the:acc}.") },
        { id: "same", s: t("I'll have | the | same.", "Imsiu | — | tą patį.", "Imsiu tą patį."), note: "Kai norite to paties, ką užsisakė jūsų draugas." },
      ],
    },
    doneness: {
      lt: "Pasakyti, kaip iškepti kepsnį", slot: "doneness", examples: ["medium_rare", "medium", "well_done"],
      items: [
        { id: "done_short", s: t("{X}, | please.", "{X:acc}, | prašau.", "{X:acc}, prašau."),
          note: "Rare – su krauju, medium – vidutiniškai, well-done – gerai iškeptas." },
        { id: "done_please", s: t("I'll have | it | {X}, | please.", "Imsiu | jį | {X:acc}, | prašau.", "Imsiu {X:acc}, prašau.") },
        { id: "done_like", s: t("I'd like | it | {X}.", "Norėčiau | jo | {X:gen}.", "Norėčiau {X:gen}.") },
        { id: "done_can", s: t("Can | I | get | it | {X}?", "Ar galiu | aš | gauti | jį | {X:acc}?", "Ar galima {X:acc}?") },
      ],
    },
    side: {
      lt: "Pasirinkti garnyrą", slot: "side", examples: ["fries", "potatoes", "green_salad", "vegetables"],
      items: [
        { id: "side_short", s: t("{X.np}, | please.", "{X.np:acc}, | prašau.", "{X.np:acc}, prašau.") },
        { id: "side_please", s: t("I'll have | {X.np}, | please.", "Imsiu | {X.np:acc}, | prašau.", "Imsiu {X.np:acc}, prašau.") },
        { id: "side_with", s: t("With | {X.np}, | please.", "Su | {X.np:ins}, | prašau.", "Su {X.np:ins}, prašau.") },
        { id: "side_can", s: t("Can | I | get | {X.np} | with | that?", "Ar galiu | aš | gauti | {X.np:acc} | prie | to?", "Ar galiu gauti {X.np:acc} prie to?") },
      ],
    },
    ask_food: {
      lt: "Paklausti apie patiekalus",
      items: [
        { id: "q_recommend", s: t("What | do | you | recommend?", "Ką | — | jūs | rekomenduojate?", "Ką rekomenduojate?",
          { flags: { 1: "Question “do” has no Lithuanian word (linked to “recommend”)." } }) },
        { id: "q_specials", s: t("Are | there | any | specials | tonight?", "Ar yra | — | kokių nors | pasiūlymų | šįvakar?", "Ar šįvakar yra ypatingų pasiūlymų?",
          { flags: { 1: "Existential “there”: no Lithuanian word; yra carries it (linked to “Are”)." } }) },
        { id: "q_spicy", s: t("Is | it | spicy?", "Ar | tai | aštru?", "Ar aštru?",
          { flags: { 0: "“Is” in a yes/no question = the particle ar; Lithuanian uses the neuter adjective aštru without a copula." } }) },
        { id: "q_comes_with", s: t("What | comes | with | it?", "Kas | patiekiama | prie | jo?", "Kas patiekiama kartu?") },
        { id: "q_veg", s: t("Do | you | have | any | vegetarian | dishes?", "Ar | jūs | turite | kokių nors | vegetariškų | patiekalų?", "Ar turite vegetariškų patiekalų?",
          { flags: { 0: "Question “Do” = the particle ar." } }) },
        { id: "allergy_nuts", s: t("I'm | allergic | to nuts.", "Aš esu | {m:alergiškas|f:alergiška} | riešutams.", "Esu {m:alergiškas|f:alergiška} riešutams.") },
        { id: "q_nuts", s: t("Does | it | have | nuts?", "Ar | jame | yra | riešutų?", "Ar jame yra riešutų?", { flags: { 0: "Question “Does” = the particle ar." } }) },
        { id: "q_gluten", s: t("Is | it | gluten-free?", "Ar | tai | be glitimo?", "Ar tai be glitimo?",
          { flags: { 0: "“Is” in a yes/no question = the particle ar; the copula has no separate word here." } }) },
        { id: "q_price", s: t("How much | is | the | steak?", "Kiek | kainuoja | — | kepsnys?", "Kiek kainuoja jautienos kepsnys?") },
      ],
    },
    meal: {
      lt: "Pagirti maistą ar paprašyti ko nors",
      items: [
        { id: "all_good", s: t("Everything | is | delicious, | thank | you!", "Viskas | yra | labai skanu, | dėkoju | jums!", "Viskas labai skanu, ačiū!") },
        { id: "compliments", s: t("Compliments | to the chef!", "Komplimentai | virėjui!", "Komplimentai virėjui!") },
        { id: "more_bread", s: t("Could | we | get | some | more | bread?", "Ar galėtume | mes | gauti | — | daugiau | duonos?", "Ar galėtume gauti daugiau duonos?",
          { flags: { 3: "Partitive “some”: the genitive duonos carries it." } }) },
        { id: "refill", s: t("Could | I | get | a | refill?", "Ar galėčiau | aš | gauti | — | papildomą stiklinę?", "Ar galėtumėte įpilti dar?"),
          note: "JAV gaivieji gėrimai ir ledinė arbata dažnai papildomi nemokamai." },
        { id: "clean_cup", s: t("Could | we | have | a | clean | glass?", "Ar galėtume | mes | gauti | — | švarią | stiklinę?", "Ar galėtume gauti švarią stiklinę?") },
        { id: "q_restroom", s: t("Where's | the | restroom?", "Kur yra | — | tualetas?", "Kur yra tualetas?") },
      ],
    },
    complain: {
      lt: "Mandagiai pasiskųsti", slot: "main", examples: ["salmon", "lasagna", "steak"],
      items: [
        { id: "not_ordered", s: t("Excuse me, | this | isn't | what | I | ordered.", "Atsiprašau, | tai | nėra | tai, ką | aš | užsisakiau.", "Atsiprašau, aš ne tai užsisakiau.") },
        { id: "i_ordered", s: t("I | ordered | {X.the}.", "Aš | užsisakiau | {X.the:acc}.", "Aš užsisakiau {X.the:acc}.") },
        { id: "didnt_order", s: t("Sorry, | I | didn't order | this.", "Atsiprašau, | aš | neužsisakiau | šito.", "Atsiprašau, šito neužsisakiau.") },
        { id: "wrong_dish", s: t("I | think | there's | a | mistake.", "Aš | manau | yra | — | klaida.", "Manau, įvyko klaida.") },
      ],
    },
    cold: {
      lt: "Paprašyti pašildyti sriubą",
      items: [
        { id: "cold", s: t("My | soup | is | cold.", "Mano | sriuba | yra | šalta.", "Mano sriuba šalta.") },
        { id: "warm_up", s: t("Could | you | warm | it | up, | please?", "Ar galėtumėte | jūs | pašildyti | ją | —, | prašau?", "Ar galėtumėte ją pašildyti?",
          { flags: { 4: "“up” (warm … up): the prefix pa- of pašildyti carries it." } }) },
        { id: "cold_little", s: t("It's | a | little | cold.", "Ji yra | — | truputį | šalta.", "Ji truputį atšalusi.") },
      ],
    },
    check: {
      lt: "Paprašyti sąskaitos",
      items: [
        { id: "check_can", s: t("Could | we | get | the | check, | please?", "Ar galėtume | mes | gauti | — | sąskaitą, | prašau?", "Ar galėtume gauti sąskaitą?"),
          note: "Amerikoje restorano sąskaita – „the check“ (britai sako „the bill“)." },
        { id: "check_please", s: t("Check, | please!", "Sąskaitą, | prašau!", "Sąskaitą, prašau!"), register: "casual" },
        { id: "check_can2", s: t("Can | I | get | the | check?", "Ar galiu | aš | gauti | — | sąskaitą?", "Ar galiu gauti sąskaitą?") },
        { id: "just_check", s: t("Just | the | check, | thanks.", "Tik | — | sąskaitą, | ačiū.", "Tik sąskaitą, ačiū.") },
      ],
    },
    split: {
      lt: "Mokėti kartu ar atskirai",
      items: [
        { id: "split_together", s: t("Together, | please.", "Kartu, | prašau.", "Kartu, prašau.") },
        { id: "split_sep", s: t("Separate | checks, | please.", "Atskiras | sąskaitas, | prašau.", "Atskiras sąskaitas, prašau.") },
        { id: "split_it", s: t("Could | we | split | the | check?", "Ar galėtume | mes | padalyti | — | sąskaitą?", "Ar galėtume padalyti sąskaitą?") },
        { id: "split_half", s: t("Can | we | split | it | in half?", "Ar galime | mes | padalyti | ją | per pusę?", "Ar galime padalyti per pusę?") },
      ],
    },
    pay: {
      lt: "Susimokėti ir palikti arbatpinigių",
      items: [
        { id: "pay_card_short", s: t("Card, | please.", "Kortele, | prašau.", "Kortele, prašau.") },
        { id: "pay_card", s: t("Can | I | pay | by card?", "Ar galiu | aš | sumokėti | kortele?", "Ar galiu sumokėti kortele?") },
        { id: "pay_cash", s: t("I'll pay | in cash.", "Sumokėsiu | grynaisiais.", "Sumokėsiu grynaisiais.") },
        { id: "here_you_go", s: t("Here you go.", "Prašom.", "Prašom.") },
      ],
    },
    tip: {
      lt: "Palikti arbatpinigių",
      items: [
        { id: "tip_percent", s: t("Twenty | percent.", "Dvidešimt | procentų.", "Dvidešimt procentų."), note: "JAV įprasta palikti 15–20 % arbatpinigių." },
        { id: "q_tip_included", s: t("Is | the | tip | included?", "Ar | — | arbatpinigiai | įskaičiuoti?", "Ar arbatpinigiai įskaičiuoti?",
          { flags: { 0: "“Is” in a yes/no question = the particle ar; the copula has no separate word here (linked to “included”)." } }),
          note: "JAV arbatpinigiai paprastai neįskaičiuoti: įprasta palikti 15–20 %." },
        { id: "tip_percent", s: t("Eighteen | percent, | please.", "Aštuoniolika | procentų, | prašau.", "Aštuoniolika procentų, prašau.") },
      ],
    },
    tip_ask: {
      lt: "Paklausti apie arbatpinigius",
      items: [
        { id: "q_tip_included", s: t("Is | the | tip | included?", "Ar | — | arbatpinigiai | įskaičiuoti?", "Ar arbatpinigiai įskaičiuoti?",
          { flags: { 0: "“Is” in a yes/no question = the particle ar; the copula has no separate word here (linked to “included”)." } }),
          note: "JAV arbatpinigiai paprastai neįskaičiuoti: įprasta palikti 15–20 %." },
        { id: "q_tip_how", s: t("How much | should | I | tip?", "Kiek | turėčiau | aš | palikti arbatpinigių?", "Kiek turėčiau palikti arbatpinigių?") },
      ],
    },
    change: {
      lt: "Palikti grąžą arbatpinigiams",
      items: [
        { id: "keep_change", s: t("Keep | the | change.", "Pasilikite | — | grąžą.", "Grąžos nereikia."), note: "Taip paliekate grąžą kaip arbatpinigius." },
        { id: "s_thanks", s: t("Thank | you!", "Dėkoju | jums!", "Ačiū!") },
      ],
    },
    dessert: {
      lt: "Užsisakyti desertą (ar atsisakyti)", slot: "dessert", examples: ["tiramisu", "chocolate_cake", "cheesecake", "gelato"],
      items: [
        { id: "ill_have", s: t("I'll have | {X.the}.", "Imsiu | {X.the:acc}.", "Imsiu {X.the:acc}.") },
        { id: "im_full", s: t("No, | thanks, | I'm | full.", "Ne, | ačiū, | aš esu | {m:sotus|f:soti}.", "Ne, ačiū, esu {m:sotus|f:soti}.") },
        { id: "dessert_menu", s: t("Could | we | see | the | dessert | menu?", "Ar galėtume | mes | pamatyti | — | desertų | meniu?", "Ar galėtume pažiūrėti desertų meniu?") },
        { id: "dessert_share", s: t("Could | we | get | {X.the} | with | two | spoons?", "Ar galėtume | mes | gauti | {X.the:acc} | su | dviem | šaukšteliais?", "Ar galėtume gauti {X.the:acc} su dviem šaukšteliais?") },
      ],
    },
    box: {
      lt: "Pasiimti likučius",
      items: [
        { id: "box", s: t("Could | I | get | a | to-go | box?", "Ar galėčiau | aš | gauti | — | išsinešimo | dėžutę?", "Ar galėčiau gauti dėžutę likučiams?"),
          note: "Amerikoje įprasta pasiimti nesuvalgytą maistą namo." },
        { id: "box_take", s: t("Can | I | take | this | home?", "Ar galiu | aš | pasiimti | tai | namo?", "Ar galiu pasiimti tai namo?") },
      ],
    },
    ready: {
      lt: "Pasakyti, ar jau išsirinkote",
      items: [
        { id: "ready", s: t("Yes, | we're | ready.", "Taip, | mes esame | pasiruošę.", "Taip, jau išsirinkome.") },
        { id: "need_minutes", s: t("Could | we | have | a | few | more | minutes?", "Ar galėtume | mes | gauti | — | kelias | papildomas | minutes?", "Ar galėtume dar kelias minutes pagalvoti?") },
        { id: "still_deciding", s: t("I'm | still | deciding.", "Aš | vis dar | renkuosi.", "Dar renkuosi.",
          { flags: { 0: "Progressive “am” has no separate Lithuanian word; the present tense of renkuosi carries it." } }) },
      ],
    },
  },

  tips: TIPS,

  merges: {
    "how many": { reason: "lexical_expression", split: "how → kaip + many → daug is false; asking for a number = kiek.", minimal: "Two words, both needed." },
    "how long": { reason: "lexical_expression", split: "how → kaip + long → ilgas is false; asking about duration = kiek laiko.", minimal: "Two words, both needed." },
    "right here": { reason: "lexical_expression", split: "right → dešinėje/teisingai + here → čia is false; the intensifier = čia pat.", minimal: "Two words." },
    "right this way": { reason: "lexical_expression", split: "right → dešinėn, this → šiuo, way → keliu is a false literal; a host's invitation = prašom čia.", minimal: "All three words form the formula." },
    "right away": { reason: "lexical_expression", split: "right → dešinėn + away → toli is false; = tuoj pat.", minimal: "Two words." },
    "opened up": { reason: "lexical_expression", split: "opened → atidarė + up → aukštyn is false; a table opened up = atsilaisvino.", minimal: "Two words (C-PHR)." },
    "let me know": { reason: "lexical_expression", split: "let → leiskite, me → man, know → žinoti is a calque; = praneškite.", minimal: "Three words form the request." },
    "nice and hot": { reason: "lexical_expression", split: "nice → graži, and → ir, hot → karšta lists two qualities; the idiom means “properly hot” (= karštutėlė).", minimal: "Three words form the idiom." },
    "not at all": { reason: "lexical_expression", split: "not → ne + at all → visai gives “ne visai” (= not quite), the opposite; = visai ne.", minimal: "Three words." },
    "not included": { reason: "grammatical_fusion", split: "not → ne + included → įskaičiuoti: Lithuanian writes the negated participle as one word (neįskaičiuoti).", minimal: "Two words (C-NEG)." },
    "you're all set": { reason: "lexical_expression", split: "You're → jūs esate, all → visi, set → nustatyti is false; = viskas sutvarkyta.", minimal: "The formula needs all three." },
    "excuse me": { reason: "lexical_expression", split: "excuse → atleiskite + me → man is literal; the attention-getter = atsiprašau.", minimal: "Two words." },
    "panna cotta": { reason: "lexical_expression", split: "An Italian dish name; panna → grietinėlė + cotta → virta names no dessert in English; = panakota.", minimal: "Two words, one name." },
    "ice cream": { reason: "lexical_expression", split: "ice → ledas + cream → grietinėlė names no dessert; = ledai.", minimal: "Two words, one noun." },
    "in half": { reason: "lexical_expression", split: "in → į + half → pusę is a calque; dividing in two = per pusę.", minimal: "Two words." },
    "in a hurry": { reason: "lexical_expression", split: "in → į, a → —, hurry → skubėjimas is false; being in a hurry = skubėti (skubame).", minimal: "Three words form the expression." },
    "on its own": { reason: "lexical_expression", split: "on → ant, its → savo, own → nuosavas is false; served on its own = be priedų.", minimal: "Three words form the expression." },
  },

  mission: [
    { step: "resv", lt: "Pasakyk apie rezervaciją" },
    { step: "drinks", lt: "Užsisakyk gėrimą" },
    { step: "order", lt: "Užsisakyk patiekalą" },
    { lt: "Pasiskųsk, jei kas negerai", optional: true, when: (c) => twistShown(c), done: (c) => twistSettled(c) },
    { lt: "Paprašyk sąskaitos", done: (c) => !!c.s.checkAsked },
    { lt: "Susimokėk (su arbatpinigiais)", done: (c) => !!c.s.paid },
  ],

  // -------------------------------------------------------------------------
  // Handlers only record what the learner said (and answer side questions); the steps below do
  // the talking, one step per turn, so a pause ("I'll bring that right out") is a real turn.

  steps: [
    // Host: reservation, party, wait, table
    { id: "resv", when: (c) => !c.s.seated, done: (c) => c.s.resv !== undefined,
      ask: (c) => {
        if (!c.s.greeted) { c.s.greeted = true; c.say(c.visits >= 1 && c.chance(0.4) ? "greet_back" : "greet"); return; }
        c.say("ask_resv");
      },
      expects: ["resv_yes", "resv_no", "resv_no_ctx", "table_for", "name_ctx", "party_ctx", "resv_time_ctx", "hungry"],
      suggest: [
        { lt: "Pasakyti, kad rezervavote staliuką (ir kuo vardu)", hint: "resv" },
        { lt: "Pasakyti, kad rezervacijos neturite, ir paprašyti staliuko", hint: "table" },
      ],
      yes: (c) => { c.s.resv = true; },
      no: (c) => { c.s.resv = false; } },
    { id: "resv_name", when: (c) => c.s.resv === true && !c.s.seated, done: (c) => !!c.s.name,
      ask: (c) => c.say("ask_resv_name"), expects: ["name_ctx", "resv_yes", "hungry"],
      suggest: [{ lt: "Pasakyti vardą, kuriuo rezervavote", hint: "resv_name" }] },
    { id: "party", when: (c) => c.s.resv === false && !c.s.seated, done: (c) => c.s.party !== undefined,
      ask: (c) => {
        if (!c.s.partyAsked && c.chance(0.3)) { c.s.partyAsked = true; c.s.justOne = true; c.say("ask_just_one"); return; }
        c.s.partyAsked = true; c.s.justOne = false; c.say("ask_party");
      },
      expects: ["party_ctx", "table_for"],
      suggest: [{ lt: "Pasakyti, keliese esate", hint: "party" }],
      yes: (c) => { if (c.s.justOne) c.s.party = 1; },
      no: (c) => { c.s.justOne = false; } },
    { id: "wait", when: (c) => c.s.resv === false && c.s.waitTwist && !c.s.seated, done: (c) => !!c.s.waitDone,
      ask: (c) => {
        if (c.s.waitOk === undefined) { c.twist("wait"); c.say(c.s.waitLine); return; }
        c.s.waitDone = true;
        c.say("table_ready");
        c.ask("seat");
      },
      expects: ["wait_ok_ctx", "wait_no_ctx", "ask_wait", "its_ok"],
      suggest: [{ lt: "Sutikti palaukti arba pasakyti, kad skubate", hint: "wait" }],
      yes: (c) => { waitAnswer(c, true); },
      no: (c) => { waitAnswer(c, false); } },
    { id: "seatpref", when: (c) => c.s.askSeat && !c.s.seated, done: (c) => !!c.s.seatPref,
      ask: (c) => c.say("ask_seat"), expects: ["seat_ans", "seat_req"],
      suggest: [{ lt: "Pasirinkti: viduje ar terasoje", hint: "seat" }],
      help: (c) => { c.say("ask_seat"); } },
    { id: "seat", when: (c) => !c.s.seated, done: (c) => !!c.s.seated,
      ask: (c) => {
        c.say("seating");
        c.s.seated = true;
        c.speaker("marco");
        if (c.s.hay) { c.s.marcoGreeted = true; c.say("m_greet_hay"); expectHowAreYou(c); return; }
        // Something was ordered at the host stand: Marco knows it and goes on from there
        // ("Here's your Coke. Are you ready to order?"), instead of asking for drinks again.
        if (items(c).length) {
          c.s.marcoGreeted = true; c.say("m_greet");
          const next = restaurant.steps.find((st) => (!st.when || st.when(c)) && !st.done(c));
          if (next) c.ask(next.id);
          return;
        }
        c.ask("drinks");
      } },
    // Marco: drinks
    { id: "drinks", when: (c) => !!c.s.seated, done: (c) => !!c.s.drinksDone || drinks(c).length > 0,
      ask: (c) => {
        if (!c.s.marcoGreeted) { c.s.marcoGreeted = true; c.say("m_greet"); c.say("ask_drinks"); return; }
        c.say(food(c).length ? "ask_drinks_again" : "ask_drinks");
      },
      // "reject" too, so "No wine for me" is read as a whole (not as "no" + an order)
      expects: ["order", "drinks_no", "ask_menu", "more_no", "reject"],
      suggest: [
        { lt: "Užsisakyti gėrimą", hint: "drink", options: ["lemonade", "iced_tea", "sparkling_water", "still_water", "tap_water", "coke", "red_wine", "white_wine", "beer"] },
        { lt: "Paklausti, ką turi atsigerti", hint: "drink" },
      ],
      yes: (c) => { c.say("what_drink"); c.hold(); },
      no: (c) => { c.s.drinksDone = true; c.say("no_problem"); },
      help: (c) => { c.say("drinks_list"); } },
    { id: "drink_kind", when: (c) => drinks(c).some((d) => generic(d)), done: () => false,
      ask: (c) => {
        const g = generic(drinks(c).find((d) => generic(d))!);
        c.say(g === "water" ? "ask_water_kind" : g === "wine" ? "ask_wine_kind" : g === "soda" ? "ask_soda_kind" : "ask_coffee_kind");
      },
      expects: ["order", "kind_ctx"],
      suggest: [{ lt: "Patikslinti gėrimą", hint: "drink", options: ["still_water", "sparkling_water", "tap_water", "red_wine", "white_wine", "coke", "diet_coke", "sprite", "regular_coffee", "decaf"] }],
      help: (c) => { c.say("drinks_list"); } },
    { id: "drinks_ack", when: (c) => !!c.s.drinksDone && drinks(c).length > 0 && !food(c).length && !c.s.served, done: (c) => !!c.s.drinksAcked,
      ask: (c) => { c.s.drinksAcked = true; c.say("drinks_ack"); },
      suggest: [{ lt: "Padėkoti", hint: "g_social" }, { lt: "Paklausti apie patiekalus", hint: "ask_food" }] },
    // Food
    { id: "order", when: (c) => !!c.s.seated && !!c.s.drinksDone, done: (c) => food(c).length > 0,
      ask: (c) => {
        if (drinks(c).length && !c.s.drinksServed) {
          c.s.drinksServed = true;
          const d = drinks(c);
          if (d.length === 1 && d[0].qty === 1) c.say("drink_served", { X: d[0].id }); else c.say("drinks_served");
        }
        if (c.s.specials && !c.s.specialsSaid) { c.s.specialsSaid = true; c.say("specials"); }
        if (c.s.readyNow) { c.s.readyNow = false; c.say("ready_ok"); return; }
        // After a side question the server does not re-ask every time.
        c.s.orderAsks = (c.s.orderAsks ?? 0) + 1;
        if (c.s.orderAsks > 1 && c.s.orderAsks % 2 === 0) return;
        c.say(c.s.moreTime ? "ask_order" : "ask_ready");
      },
      expects: ["order", "ready_yes", "need_time", "ask_recommend", "ask_specials", "ask_menu"],
      suggest: [
        { lt: "Užsisakyti pagrindinį patiekalą", hint: "order_food", options: "main" },
        { lt: "Užsisakyti užkandį", hint: "starter", options: "starter" },
        { lt: "Paklausti apie patiekalus (rekomendacijos, aštrumas, alergijos)", hint: "ask_food" },
        { lt: "Paprašyti dar kelių minučių", hint: "ready" },
      ],
      yes: (c) => { c.s.readyNow = true; },
      no: (c) => { c.s.moreTime = true; c.say("take_time"); c.hold(); },
      help: (c) => { c.say("recommend"); } },
    { id: "food_kind", when: (c) => food(c).some((i) => generic(i)), done: () => false,
      ask: (c) => c.say("ask_pasta_kind"), expects: ["order"],
      suggest: [{ lt: "Pasirinkti patiekalą", hint: "order_food", options: ["lasagna", "penne"] }] },
    { id: "doneness", when: (c) => mains(c).some((m) => needsDone(m) && !m.done), done: () => false,
      ask: (c) => { c.say("ask_doneness"); if (c.chance(0.4)) c.say("doneness_options"); },
      expects: ["doneness_ans", "order"],
      suggest: [{ lt: "Pasakyti, kaip iškepti kepsnį", hint: "doneness", options: "doneness" }],
      help: (c) => { c.say("doneness_list"); } },
    { id: "side", when: (c) => mains(c).some((m) => needsSide(m) && !m.side), done: () => false,
      ask: (c) => c.say("ask_side", { X: mains(c).find((m) => needsSide(m) && !m.side)!.id }),
      expects: ["side_ans", "order", "reject"],
      suggest: [{ lt: "Pasirinkti garnyrą", hint: "side", options: "side" }],
      help: (c) => { c.say("side_list"); } },
    { id: "main_q", when: (c) => starters(c).length > 0 && !mains(c).length && !c.s.noMain && !c.s.placed, done: () => false,
      ask: (c) => c.say("ask_main"), expects: ["order", "more_no"],
      suggest: [{ lt: "Užsisakyti pagrindinį patiekalą (arba pasakyti, kad užteks)", hint: "order_food", options: "main" }],
      no: (c) => { c.s.noMain = true; } },
    { id: "soup_offer", when: (c) => c.s.soupTwist && !soupItem(c) && c.s.soupOffer === undefined && mains(c).length > 0 && !c.s.placed, done: () => false,
      ask: (c) => c.say("soup_offer"),
      expects: ["order"],
      suggest: [{ lt: "Atsakyti: taip ar ne", hint: "g_yesno" }],
      yes: (c) => { c.s.soupOffer = true; items(c).push({ cat: "starter", id: "minestrone", qty: 1 }); },
      no: (c) => { c.s.soupOffer = false; } },
    { id: "placed", when: (c) => food(c).length > 0, done: (c) => !!c.s.placed,
      ask: (c) => {
        c.s.placed = true;
        c.say("placed");
        if (drinks(c).length && !c.s.drinksServed) { c.s.drinksServed = true; c.say("drinks_served"); }
      },
      suggest: [
        { lt: "Padėkoti ir palaukti", hint: "g_social" },
        { lt: "Paprašyti ko nors (duonos, vandens)", hint: "meal" },
      ] },
    // The food arrives (twist: the wrong dish)
    { id: "serve_wrong", when: (c) => c.s.wrongTwist && !!mainDish(c) && !!c.s.placed && !c.s.served, done: () => false,
      ask: (c) => {
        const main = mainDish(c)!;
        if (!c.s.wrongPhase) {
          c.s.wrongPhase = 1;
          c.s.wrongDish = main.id === "burger" ? "lasagna" : "burger";
          c.twist("wrong_dish");
          const st = starters(c)[0]; // the starter comes too (it was never served on this path)
          if (st) c.say("serve_starter", { X: st.id });
          c.say("serve", { X: c.s.wrongDish });
          return;
        }
        if (c.s.wrongPhase === 1) { c.s.wrongPhase = 2; c.say(c.s.wrongComplained ? "wrong_sorry" : "wrong_noticed", { X: main.id }); return; }
        c.s.served = true;
        c.say("serve_fixed", { X: main.id });
      },
      expects: ["complain_wrong", "its_ok"],
      suggest: [
        { lt: "Pasakyti, kad atnešė ne tą patiekalą", hint: "complain", options: "main" },
      ] },
    { id: "serve", when: (c) => !!c.s.placed && !c.s.served, done: (c) => !!c.s.served,
      ask: (c) => {
        c.s.served = true;
        const st = starters(c)[0];
        const main = mainDish(c);
        if (st && main) c.say("serve_starter", { X: st.id });
        c.say("serve", { X: (main ?? st ?? food(c)[0]).id });
      },
      suggest: [
        { lt: "Padėkoti", hint: "g_social" },
        { lt: "Paprašyti daugiau duonos ar gėrimo", hint: "meal" },
      ] },
    // Checking back (twist: cold soup)
    { id: "checkback_soup", when: (c) => c.s.soupTwist && !!soupItem(c) && !!c.s.served && !c.s.cb, done: (c) => !!c.s.cb,
      ask: (c) => { c.twist("cold_soup"); c.say("ask_checkback_soup"); },
      expects: ["complain_cold", "all_good", "all_good_ctx", "complain_other", "request", "more_no"],
      suggest: [
        { lt: "Pasakyti, kad sriuba šalta, ir paprašyti pašildyti", hint: "cold" },
        { lt: "Pasakyti, kad viskas skanu", hint: "meal" },
      ],
      yes: (c) => { c.s.cb = "good"; },
      no: (c) => { c.say("what_wrong"); c.hold(); } },
    { id: "checkback", when: (c) => !!c.s.served && !c.s.cb, done: (c) => !!c.s.cb,
      ask: (c) => c.say("ask_checkback"),
      expects: ["all_good", "all_good_ctx", "complain_cold", "complain_other", "request", "more_no"],
      suggest: [
        { lt: "Pasakyti, kad viskas skanu", hint: "meal" },
        { lt: "Paprašyti daugiau duonos ar gėrimo", hint: "meal" },
        { lt: "Pasiskųsti, jei kas negerai", hint: "complain" },
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
      suggest: [{ lt: "Padėkoti", hint: "g_social" }, { lt: "Paprašyti ko nors", hint: "meal" }] },
    { id: "fix", when: (c) => !!c.s.fixing && (c.s.fixPhase ?? 0) < 2, done: (c) => (c.s.fixPhase ?? 0) >= 2,
      ask: (c) => {
        const x = c.s.fixing as string;
        if (!c.s.fixPhase) { c.s.fixPhase = 1; c.say(c.s.fixKind === "cold" ? "cold_sorry" : "other_sorry", { X: x }); return; }
        c.s.fixPhase = 2;
        c.say(c.s.fixKind === "cold" ? "cold_fixed" : "other_fixed", { X: x });
      },
      expects: ["its_ok"],
      suggest: [{ lt: "Padėkoti", hint: "g_social" }] },
    { id: "box", when: (c) => c.s.askBox && mealOver(c) && c.s.box === undefined && !c.s.checkAsked, done: () => false,
      ask: (c) => c.say("ask_box"),
      expects: ["box_ask"],
      suggest: [{ lt: "Atsakyti: taip ar ne", hint: "g_yesno" }, { lt: "Paprašyti dėžutės likučiams", hint: "box" }],
      yes: (c) => { c.s.box = true; c.say("box_ok"); },
      no: (c) => { c.s.box = false; c.say("no_problem"); } },
    // Dessert
    { id: "dessert", when: (c) => c.s.askDessert && mealOver(c) && !c.s.checkAsked, done: (c) => !!c.s.dessertDone,
      ask: (c) => c.say(c.s.dessertMenu ? "what_else" : "ask_dessert"),
      expects: ["order", "dessert_no", "check_ask", "ask_menu", "ask_recommend", "more_no"],
      suggest: [
        { lt: "Užsisakyti desertą ar kavos", hint: "dessert", options: ["tiramisu", "chocolate_cake", "cheesecake", "panna_cotta", "gelato", "coffee", "espresso"] },
        { lt: "Atsisakyti ir paprašyti sąskaitos", hint: "check" },
      ],
      yes: (c) => { c.s.dessertMenu = true; c.say("dessert_list"); c.hold(); },
      no: (c) => { c.s.dessertDone = true; c.s.dessertDeclined = true; },
      help: (c) => { c.say("dessert_list"); } },
    { id: "dessert_ack", when: (c) => !!c.s.dessertOrdered && !c.s.dessertAcked, done: (c) => !!c.s.dessertAcked,
      ask: (c) => { c.s.dessertAcked = true; c.say("dessert_ack"); },
      suggest: [{ lt: "Padėkoti", hint: "g_social" }] },
    { id: "dessert_serve", when: (c) => !!c.s.dessertAcked && !c.s.dessertServed, done: (c) => !!c.s.dessertServed,
      ask: (c) => {
        c.s.dessertServed = true;
        const d = desserts(c).at(-1) ?? drinks(c).at(-1) ?? food(c).at(-1);
        if (d) c.say("serve_dessert", { X: d.id }); else c.say("no_problem");
      },
      suggest: [{ lt: "Padėkoti", hint: "g_social" }] },
    // The check
    { id: "check", when: (c) => mealOver(c) && !c.s.checkAsked && (!c.s.dessertOrdered || !!c.s.dessertServed), done: (c) => !!c.s.checkAsked,
      ask: (c) => {
        if (c.s.dessertDeclined && !c.s.wheneverSaid) { c.s.wheneverSaid = true; c.say("check_whenever"); return; }
        c.say("ask_check_else");
      },
      expects: ["check_ask", "more_no", "order", "ask_menu", "box_ask", "dessert_no"],
      suggest: [
        { lt: "Paprašyti sąskaitos", hint: "check" },
        { lt: "Užsisakyti desertą", hint: "dessert", options: "dessert" },
      ],
      yes: (c) => { c.say("what_else"); c.hold(); },
      no: (c) => { c.s.checkAsked = true; } },
    { id: "check_coming", when: (c) => !!c.s.checkAsked && mealOver(c) && !c.s.checkComing, done: (c) => !!c.s.checkComing,
      ask: (c) => {
        c.s.checkComing = true;
        c.say("check_coming");
        if (needSplit(c)) { c.s.splitAsked = true; c.ask("split"); } // the split question comes with it
      },
      expects: ["split_ans"],
      suggest: [{ lt: "Padėkoti", hint: "g_social" }] },
    { id: "split", when: (c) => !!c.s.checkComing && needSplit(c), done: () => false,
      ask: (c) => c.say("ask_split"), expects: ["split_ans"],
      suggest: [{ lt: "Pasakyti: mokėsite kartu ar atskirai", hint: "split" }] },
    { id: "pay", when: (c) => !!c.s.checkComing && !c.s.payMethod, done: (c) => !!c.s.payMethod,
      ask: (c) => {
        if (!c.s.checkBrought) {
          c.s.checkBrought = true;
          if (c.s.split === "separate") c.say("bring_checks");
          else { c.say("bring_check"); c.say("total_is", { price: total(c) }); }
          if (c.s.wantPay) {
            c.s.payMethod = c.s.wantPay;
            // the card was chosen before the check came: Marco brings the card reader with it, so the
            // tip question comes now ("Twenty percent." was not understood while the check lay there)
            if (c.s.payMethod === "card") c.ask("tip");
            return;
          }
          if (c.s.split !== "separate" && c.chance(0.5)) c.say("no_rush"); // "Here are your checks. No rush." has it
          return;
        }
        c.say("ask_pay_method");
      },
      expects: ["pay_card", "pay_cash", "pay_phone", "here_you_go", "ask_tip", "no_cash"],
      suggest: [
        { lt: "Susimokėti kortele ar grynaisiais", hint: "pay" },
        { lt: "Paklausti, ar arbatpinigiai įskaičiuoti", hint: "tip_ask" },
      ] },
    { id: "tip", when: (c) => c.s.payMethod === "card" && !c.s.paid, done: (c) => !!c.s.paid,
      ask: (c) => {
        if (!c.s.readerSaid) { c.s.readerSaid = true; c.say(c.s.wantPay ? "reader_here" : "card_reader"); return; }
        c.say("tip_screen");
      },
      expects: ["tip_ctx", "tip_give", "tip_none", "ask_tip"],
      suggest: [
        { lt: "Pasirinkti arbatpinigius (paprastai 15–20 %)", hint: "tip" },
      ] },
    { id: "change", when: (c) => c.s.payMethod === "cash" && !c.s.paid, done: (c) => !!c.s.paid,
      ask: (c) => {
        if (!c.s.changeOffered) { c.s.changeOffered = true; c.say("cash_ok"); return; }
        c.s.paid = true; c.complete(); c.say("change_back"); c.event("pay", { method: "cash" });
      },
      expects: ["keep_change", "tip_give"],
      suggest: [{ lt: "Palikti grąžą arbatpinigiams arba palaukti grąžos", hint: "change" }] },
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
  },

  start: (c) => {
    c.speaker("marco_host");
  },

  handlers: {
    // --- Host
    resv_yes(c, slots) {
      c.s.resv = true;
      let p = partyOf(slots.party);
      let time = slots.time;
      if (p && p >= 7 && !time) { time = { h: p, m: 0 }; p = undefined; } // "a reservation for seven" = at seven
      if (p) c.s.party = p;
      if (time) c.s.time = time;
      if (slots.name && !c.s.name) { c.s.name = slots.name; c.s.party ??= 2; c.say("resv_found"); }
    },
    resv_no(c) { c.s.resv = false; },
    resv_time_ctx(c, slots, seg) { restaurant.handlers.resv_yes(c, slots, seg); },
    resv_no_ctx(c) { if (c.s.resv === undefined) c.s.resv = false; },
    table_for(c, slots, seg) {
      const p = partyOf(slots.party);
      if (p) c.s.party = p;
      if (seg.tags.includes("noresv")) c.s.resv = false;
      if (c.s.resv === undefined && c.step !== "resv") c.s.resv = false;
      if (["window", "patio", "inside", "quiet"].some((x) => seg.tags.includes(x))) seatPref(c, seg.tags);
    },
    party_ctx(c, slots, seg) {
      const p = partyOf(slots.party) ?? (seg.tags.includes("h:party_just_me") ? 1 : undefined);
      if (p) c.s.party = p;
    },
    // "Great, and hungry!": a smile back, once; the open question comes again
    hungry(c) { if (!c.s.hungrySaid) { c.s.hungrySaid = true; c.say("right_place"); } },
    name_ctx(c, slots) {
      if (c.s.name) return;
      if (!slots.name) { c.say("ask_resv_name"); c.hold(); return; }
      c.s.resv = true;
      c.s.name = slots.name;
      const p = partyOf(slots.party);
      if (p) c.s.party = p;
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
    // --- Ordering
    order(c, slots, seg) {
      // "A burger? I ordered the lasagna": naming a dish while the wrong one is on the table is not a new order
      if (c.step === "serve_wrong" && c.s.wrongPhase === 1) { restaurant.handlers.complain_wrong(c, {}, seg); return; }
      const list = freshItems(c, toArr(slots.items?.item).map(fromSlot).filter(Boolean) as Item[]);
      if (!list.length) return;
      if (/\bchips\b/i.test(c.heard)) c.tip(TIPS.uk_chips);
      for (const it of list) if (it.cat === "main" && byId(it.id).attrs?.doneness) it.done = doneFromText(c.heard) ?? it.done;
      addItems(c, list);
      if (!c.s.seated) {
        // A drink ordered at the host stand is the drink order: Lucia passes it on, and Marco brings it
        // (without this, no step asked for the food and the dinner ended right after seating).
        if (list.some((i) => i.cat === "drink") && !drinks(c).some((d) => generic(d))) { c.s.drinksDone = true; c.s.drinksAcked = true; }
        if (!c.s.hostOrderSaid) { c.s.hostOrderSaid = true; c.say("host_order"); }
        return;
      }
      // After the meal: dessert, coffee or another drink.
      if (c.s.served) {
        if (drinks(c).some((d) => generic(d))) return; // "Regular or decaf?" first
        c.s.dessertOrdered = true; c.s.dessertDone = true; c.s.dessertAcked = false; c.s.dessertServed = false;
        return;
      }
      if (list.some((i) => i.cat === "drink") && !drinks(c).some((d) => generic(d))) c.s.drinksDone = true;
      const food = list.filter((i) => i.cat !== "drink");
      if (!food.length) return;
      if (c.s.placed) { c.say("ack_order"); return; }
      if (mains(c).some((m) => (needsDone(m) && !m.done) || (needsSide(m) && !m.side)) && c.chance(0.6)) c.say("ack_order");
    },
    order_unknown(c) { c.say("unknown_order"); c.say("menu_line"); },
    kind_ctx(c, _slots, seg) {
      const g = drinks(c).find((d) => generic(d));
      if (!g) return;
      if (seg.tags.includes("regular") && generic(g) === "coffee") g.id = "regular_coffee";
      else if (seg.tags.includes("diet") && generic(g) === "soda") g.id = "diet_coke";
      if (!drinks(c).some((d) => generic(d)) && !c.s.served) c.s.drinksDone = true;
      if (c.s.served && !drinks(c).some((d) => generic(d))) { c.s.dessertOrdered = true; c.s.dessertDone = true; c.s.dessertAcked = false; c.s.dessertServed = false; }
    },
    ready_yes(c) { if (c.step === "order" || c.step === "drinks") c.s.readyNow = true; },
    need_time(c) { c.s.moreTime = true; c.say("take_time"); c.hold(); },
    drinks_no(c) { if (!c.s.drinksDone) { c.s.drinksDone = true; c.say("no_problem"); } },
    more_no(c) {
      switch (c.step) {
        case "main_q": c.s.noMain = true; return;
        case "dessert": c.s.dessertDone = true; c.s.dessertDeclined = true; return;
        case "check": c.s.checkAsked = true; return;
        case "drinks": if (!c.s.drinksDone) { c.s.drinksDone = true; c.say("no_problem"); } return;
        case "checkback": case "checkback_soup": c.s.cb ??= "good"; return;
        case "soup_offer": c.s.soupOffer = false; return;
      }
    },
    its_ok(c) {
      // "That's okay / no problem": accepting a wait, but a polite "no, thanks" to an offer.
      if (c.step === "wait") { waitAnswer(c, true); return; }
      if (c.step === "box" || c.step === "dessert" || c.step === "soup_offer") restaurant.steps.find((x) => x.id === c.step)?.no?.(c);
    },
    ask_menu(c, _slots, seg) {
      const tags = seg.tags;
      if (tags.includes("dessert")) { c.s.dessertMenu = true; c.say("dessert_list"); }
      else if (tags.includes("drinks") || tags.includes("wine")) c.say("drinks_list");
      else if (tags.includes("starters")) c.say("starters_list");
      else if (tags.includes("sides")) c.say("side_list");
      else if (tags.includes("pasta")) c.say("ask_pasta_kind");
      else if (tags.includes("mains")) c.say("mains_list");
      else if (c.step === "drinks" || c.step === "drink_kind") c.say("drinks_list");
      else if (c.step === "dessert" || c.step === "check") { c.s.dessertMenu = true; c.say("dessert_list"); }
      else { c.say("menu_line"); c.say("mains_list"); }
    },
    ask_specials(c) { c.s.specialsSaid = true; c.say("specials"); },
    ask_recommend(c, _slots, seg) {
      if (seg.tags.includes("dessert") || c.step === "dessert" || c.s.served) c.say("recommend_dessert");
      else c.say("recommend");
    },
    same(c) {
      const last = items(c).filter((i) => i.cat !== "side").at(-1);
      if (!last || c.s.placed) { c.say("which_item"); return; }
      last.qty += 1;
      c.say("ack");
    },
    ask_desc(c, slots) {
      const id = dishOf(slots.dish);
      if (!id) { c.say("which_item"); return; }
      c.s.mentioned = id;
      c.say((byId(id).attrs?.desc as string | undefined) ?? "desc_generic");
    },
    ask_spicy(c, slots) {
      const id = dishOf(slots.dish) ?? (/\b(it|that|this)\b/i.test(c.heard) ? lastDish(c) : undefined);
      if (!id) { c.say("spicy_which"); return; }
      c.s.mentioned = id;
      c.say(byId(id).attrs?.spicy ? "spicy_yes" : "spicy_no");
    },
    ask_comes(c, slots) {
      const id = dishOf(slots.dish) ?? lastDish(c);
      if (!id) { c.say("which_item"); return; }
      c.s.mentioned = id;
      const a = byId(id).attrs || {};
      c.say(a.side ? "comes_side" : a.comes === "spaghetti" ? "comes_spaghetti" : a.comes === "salad" ? "comes_salad" : "comes_alone", { X: id });
    },
    ask_veg(c, slots) {
      const id = dishOf(slots.dish) ?? (/\b(it|that|this)\b/i.test(c.heard) ? lastDish(c) : undefined);
      if (id && /\b(is|does)\b/i.test(c.heard)) { c.say(byId(id).attrs?.meat ? "veg_no" : "veg_yes", { X: id }); return; }
      c.say("veg_list");
    },
    ask_allergy(c, slots, seg) {
      const tags = seg.tags;
      const id = dishOf(slots.dish) ?? (/\b(it|this|that)\b/i.test(c.heard) ? lastDish(c) : undefined);
      if (tags.includes("nuts")) {
        c.s.allergy = "nuts";
        if (id) { c.say("allergy_check"); c.say(byId(id).attrs?.nuts ? "nuts_bad" : "nuts_ok", { X: id }); }
        else c.say("nuts_general");
        return;
      }
      if (tags.includes("gluten")) { c.s.allergy = "gluten"; c.say("gluten_info"); return; }
      c.say("allergy_noted");
    },
    ask_price(c, slots) {
      // "How much is it?" with the (one) check on the table: the total, not the last dish's price
      if (!slots.dish && c.s.checkBrought && c.s.split !== "separate") { c.say("total_is", { price: total(c) }); return; }
      const id = dishOf(slots.dish) ?? lastDish(c);
      if (!id || byId(id).attrs?.generic) { c.say("which_item"); return; }
      c.s.mentioned = id;
      c.say("price_is", { price: byId(id).attrs?.price ?? 0 });
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
      if (seg.tags.includes("notrare")) { steak.done = slots.doneness && slots.doneness !== "rare" ? slots.doneness : "medium"; if (c.chance(0.5)) c.say("doneness_ok", { X: steak.done }); return; }
      steak.done = doneFromText(c.heard) ?? slots.doneness;
      if (c.chance(0.5)) c.say("doneness_ok", { X: steak.done });
    },
    side_ans(c, slots) {
      const m = mains(c).find((x) => needsSide(x) && !x.side);
      if (m) { m.side = slots.side; return; }
      const withSide = mains(c).find((x) => needsSide(x));
      if (withSide) { if (withSide.side !== slots.side) { withSide.side = slots.side; c.say("side_changed"); } return; }
      if (!items(c).some((i) => i.id === slots.side)) { items(c).push({ cat: "side", id: slots.side, qty: 1 }); c.say("ack"); }
    },
    // --- During the meal
    all_good(c, _slots, seg) {
      if (!c.s.served) return;
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
      // "I ordered the salmon" while it is still on its way.
      const said = toArr(slots.dish).map(dishOf).find(Boolean) as string | undefined;
      if (!c.s.served && (said || main)) { c.say("ordered_coming", { X: said ?? main!.id }); return; }
      if (c.s.served && main && !c.s.fixing) { c.s.cb ??= "fix"; c.s.fixing = main.id; c.s.fixKind = "other"; return; }
      c.say("no_problem");
    },
    request(c, slots) {
      if (c.s.served && !c.s.cb) { c.s.cb = "request:" + slots.req; return; }
      c.say(requestLine(slots.req));
    },
    box_ask(c) { if (!c.s.box) { c.s.box = true; c.say("box_ok"); } },
    dessert_no(c) {
      c.s.dessertDone = true;
      c.s.dessertDeclined = true;
      if (c.step === "check") c.s.checkAsked = true;
    },
    // --- Paying
    check_ask(c) {
      c.s.dessertDone = true;
      if (c.s.checkAsked) return;
      c.s.checkAsked = true;
      if (!c.s.served) c.say("check_later");
    },
    split_ans(c, _slots, seg) {
      if (c.s.split) return;
      if (seg.tags.includes("separate") || seg.tags.includes("split")) { c.s.split = "separate"; c.say("split_sep_ok"); }
      else { c.s.split = "together"; if (party(c) >= 2) c.say("split_together_ok"); }
      if (!c.s.checkAsked) c.s.checkAsked = true;
    },
    pay_card(c) { choosePay(c, "card"); },
    pay_phone(c) { choosePay(c, "card"); },
    pay_cash(c) { choosePay(c, "cash"); },
    no_cash(c) { choosePay(c, "card"); },
    here_you_go(c, slots) {
      // "Here's forty dollars": cash
      if (typeof slots.price === "number" && !c.s.payMethod) { choosePay(c, "cash"); if (c.s.payMethod !== "cash") return; }
      if (c.s.payMethod === "cash" && !c.s.paid) { c.s.paid = true; c.complete(); c.event("pay", { method: "cash" }); c.say("change_back"); return; }
      if (c.s.checkBrought && !c.s.payMethod) choosePay(c, "card");
    },
    keep_change(c) {
      if (c.s.paid) return;
      c.s.payMethod = "cash"; c.s.paid = true; c.complete(); c.s.tip = true;
      c.event("pay", { method: "cash", tip: true });
      c.say("thanks_tip");
    },
    ask_tip(c) { c.say("tip_included_no"); c.tip(TIPS.tipping); },
    tip_ctx(c, slots) {
      if (c.s.payMethod !== "card" || c.s.paid) return;
      const n = Number(slots.number ?? 0);
      c.s.tip = n; c.s.paid = true; c.complete();
      c.event("pay", { method: "card", tip: n });
      c.say(n > 0 ? "tip_thanks" : "tip_none_ok");
      if (n < 15) c.tip(TIPS.tipping);
    },
    tip_give(c, slots) {
      if (c.s.paid) return;
      c.s.tip = slots.number ?? true;
      if (c.s.payMethod) { c.s.paid = true; c.complete(); c.event("pay", { method: c.s.payMethod, tip: c.s.tip }); }
      c.say(c.s.payMethod === "card" ? "tip_thanks" : "thanks_tip");
    },
    tip_none(c) {
      c.tip(TIPS.tipping);
      if (c.s.payMethod === "card" && !c.s.paid) { c.s.paid = true; c.complete(); c.s.tip = 0; c.event("pay", { method: "card", tip: 0 }); c.say("tip_none_ok"); }
    },
    // --- Changes of mind
    reject(c, slots) {
      const it = fromSlot(slots.item);
      if (c.s.placed) { c.say("no_problem"); return; }
      if (it) {
        const idx = items(c).findIndex((i) => i.id === it.id || (generic(i) && family(it.id) === generic(i)));
        if (idx >= 0) {
          items(c).splice(idx, 1);
          c.say("removed", { X: it.id });
          if (!food(c).length && c.s.drinksDone) { c.say("reject_ok"); c.hold(); }
          return;
        }
      }
      c.say("reject_ok"); c.hold();
    },
    change(c, slots) {
      const it = fromSlot(slots.item);
      if (!it || c.s.placed) { c.say("no_problem"); return; }
      const last = items(c).filter((i) => i.cat === it.cat).at(-1);
      if (last) { Object.assign(last, { ...it, done: it.done ?? doneFromText(c.heard) }); c.say("changed"); return; }
      addItems(c, [it]);
    },
    correction(c, slots) {
      if (c.s.placed) { c.say("no_problem"); return; }
      const list = toArr(slots.item).map(fromSlot).filter(Boolean) as Item[];
      const [bad, good] = /^\s*(no[, ]+)?not\b/i.test(c.heard) ? [list[0], list[1]] : [undefined, list[0]];
      if (bad) { const idx = items(c).findIndex((i) => i.id === bad.id); if (idx >= 0) items(c).splice(idx, 1); }
      if (good) {
        const same = items(c).filter((i) => i.cat === good.cat).at(-1);
        if (same && !bad) Object.assign(same, good); else addItems(c, [good]);
      }
      c.say("changed");
    },
  },

  finish: (c) => {
    c.complete();
    const m = mainDish(c);
    if (m) c.remember({ lastMain: m.id });
    c.say("bye_marco");
    if (c.chance(0.5)) { c.speaker("marco_host"); c.say("bye_lucia"); }
    c.expect({
      id: "closing", hints: ["g_social"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); },
    });
  },

  tests: [
    { say: "No, we don't.", intent: "resv_no_ctx", step: "resv" },
    { say: "Just me, thanks.", intent: "party_ctx", step: "resv" },
    // host
    { say: "Hi, I have a reservation for two at seven.", intent: "resv_yes", slots: { party: { number: 2 } } },
    { say: "Yes, it's under Tomas.", intent: "name_ctx", step: "resv_name" },
    { say: "Tomas Mikalauskas", intent: "name_ctx", step: "resv_name" },
    { say: "Tomas", intent: "none" },
    { say: "We booked a table for seven o'clock.", intent: "resv_yes" },
    { say: "No, we don't have a reservation.", intent: "resv_no", not: ["resv_yes"] },
    { say: "A table for two, please.", intent: "table_for", slots: { party: { number: 2 } } },
    { say: "Two", intent: "party_ctx", step: "party" },
    { say: "Just me, thanks.", intent: "party_ctx", step: "party" },
    { say: "How long is the wait?", intent: "ask_wait" },
    { say: "Could we sit by the window?", intent: "seat_req" },
    { say: "On the patio, please.", intent: "seat_ans", step: "seatpref" },
    // drinks
    { say: "I'll have a lemonade.", intent: "order", slots: { items: { item: { drink: "lemonade" } } } },
    { say: "A glass of red wine, please.", intent: "order", slots: { items: { item: { drink: "red_wine" } } } },
    { say: "Sparkling, please.", intent: "order", step: "drink_kind", slots: { items: { item: { drink: "sparkling_water" } } } },
    { say: "Just tap water is fine.", intent: "order" },
    { say: "Nothing for me, thanks.", intent: "drinks_no", step: "drinks" },
    // food
    { say: "I'll have the lasagna, please.", intent: "order", slots: { items: { item: { main: "lasagna" } } } },
    { say: "Could I get the steak, medium rare, with fries?", intent: "order", slots: { items: { item: { main: "steak", doneness: "medium_rare", side: "fries" } } } },
    { say: "To start, I'll have the bruschetta.", intent: "order", slots: { items: { item: { starter: "bruschetta" } } } },
    { say: "For me, the fish.", intent: "order", slots: { items: { item: { main: "salmon" } } } },
    { say: "I think I'll go with the chicken parmesan.", intent: "order" },
    { say: "I want a pizza", intent: "order" },
    { say: "Can I get a hot dog?", intent: "order_unknown" },
    { say: "Medium rare, please.", intent: "doneness_ans", step: "doneness" },
    { say: "Rare, please.", intent: "doneness_ans", step: "doneness", slots: { doneness: "rare" } },
    { say: "Well done", intent: "doneness_ans", step: "doneness" },
    { say: "Fries, please.", intent: "side_ans", step: "side", slots: { side: "fries" } },
    { say: "Chips, please.", intent: "side_ans", step: "side", slots: { side: "fries" } },
    { say: "Could we have a few more minutes?", intent: "need_time", step: "order" },
    { say: "We're still deciding.", intent: "need_time", step: "order" },
    { say: "What do you recommend?", intent: "ask_recommend" },
    { say: "Are there any specials tonight?", intent: "ask_specials" },
    { say: "Is the penne spicy?", intent: "ask_spicy" },
    { say: "I'm allergic to nuts.", intent: "ask_allergy" },
    { say: "Does the chocolate cake have nuts?", intent: "ask_allergy" },
    { say: "Do you have any vegetarian dishes?", intent: "ask_veg" },
    { say: "What comes with the steak?", intent: "ask_comes" },
    { say: "How much is the salmon?", intent: "ask_price" },
    { say: "What's in the bruschetta?", intent: "ask_desc" },
    { say: "I'll have the same.", intent: "same" },
    { say: "We don't need dessert, thanks.", intent: "dessert_no", step: "dessert", not: ["order"] },
    { say: "Is the risotto vegetarian?", intent: "ask_veg" },
    { say: "Do you have gluten-free pasta?", intent: "ask_allergy" },
    { say: "Could I get a refill?", intent: "request", slots: { req: "refill" } },
    // meal
    { say: "Excuse me, this isn't what I ordered.", intent: "complain_wrong" },
    { say: "I ordered the fish, but this is a burger.", intent: "complain_wrong" },
    { say: "My soup is cold. Could you warm it up?", intent: "complain_cold" },
    { say: "Everything is delicious, thank you!", intent: "all_good" },
    { say: "Great", intent: "all_good_ctx", step: "checkback" },
    { say: "Could we get some more bread?", intent: "request" },
    { say: "Where's the restroom?", intent: "ask_restroom" },
    { say: "No, thanks, I'm full.", intent: "dessert_no", step: "dessert" },
    { say: "The tiramisu, please.", intent: "order", step: "dessert", slots: { items: { item: { dessert: "tiramisu" } } } },
    // check
    { say: "Could we get the check, please?", intent: "check_ask" },
    { say: "Can we have the bill, please?", intent: "check_ask" },
    { say: "Separate checks, please.", intent: "split_ans", step: "split" },
    { say: "Could we split it in half?", intent: "split_ans", step: "split" },
    { say: "Is the tip included?", intent: "ask_tip" },
    { say: "Is service included?", intent: "ask_tip" },
    { say: "Twenty percent", intent: "tip_ctx", step: "tip" },
    { say: "Let's do twenty percent.", intent: "tip_ctx", step: "tip", slots: { number: 20 } },
    { say: "Make it eighteen.", intent: "tip_ctx", step: "tip", slots: { number: 18 } },
    { say: "A twenty percent tip.", intent: "tip_ctx", step: "tip" },
    { say: "Twenty percent is too much.", intent: "none", step: "tip" },
    { say: "Not twenty percent.", intent: "none", step: "tip" },
    { say: "Can I pay by card?", intent: "pay_card", step: "pay" },
    { say: "Could I get a to-go box?", intent: "box_ask" },
    // meaning / negation
    { say: "I don't want the steak.", intent: "reject", not: ["order"] },
    { say: "Not the burger, the salmon.", intent: "correction", not: ["order"] },
    { say: "I didn't order this.", intent: "complain_wrong", not: ["order"] },
    { say: "We don't have a reservation", intent: "resv_no", step: "resv", not: ["resv_yes"] },
    { say: "No dessert for me, thanks.", intent: "dessert_no", not: ["order"] },
    // not understood
    { say: "purple elephant bicycle window", intent: "none" },
    { say: "the lasagna flies on Tuesday banana", intent: "none" },
    // more ways to say it (dev corpus tests/corpus/s73-restaurant.json)
    { say: "Yes, we booked online", intent: "resv_yes", step: "resv" },
    { say: "I think my wife made a reservation", intent: "resv_yes", step: "resv", not: ["party_ctx"] },
    { say: "Yes, for 8 pm", intent: "resv_time_ctx", step: "resv", not: ["name_ctx"] },
    // "Great, and hungry!" is no name (BUG-REVIEW, still open: s73)
    { say: "Great, and hungry!", intent: "hungry", step: "resv", not: ["name_ctx"] },
    { say: "Hungry!", intent: "hungry", step: "resv_name", not: ["name_ctx"] },
    { say: "Very hungry.", intent: "hungry", step: "resv", not: ["name_ctx"] },
    { say: "Good, thanks, and very hungry.", intent: "hungry", step: "resv", not: ["name_ctx"] },
    { say: "We're starving!", intent: "hungry" },
    { say: "I'm not hungry.", intent: "none" },
    { say: "Yes, it's under Tomas.", intent: "name_ctx", step: "resv", not: ["hungry"] },
    { say: "Good evening, reservation for two, name Tomas", intent: "resv_yes", slots: { name: "Tomas" } },
    { say: "Is there a free table?", intent: "table_for", step: "resv" },
    { say: "Hi, we'd like to have dinner", intent: "table_for", step: "resv", not: ["order_unknown"] },
    { say: "My surname is Mikalauskas", intent: "name_ctx", step: "resv_name", slots: { name: "Mikalauskas" } },
    { say: "Maybe later", intent: "drinks_no", step: "drinks", not: ["order"] },
    { say: "No wine for me", intent: "reject", step: "drinks", not: ["order"] },
    { say: "With gas", intent: "order", step: "drink_kind", slots: { items: { item: { drink: "sparkling_water" } } } },
    { say: "The free one", intent: "order", step: "drink_kind", slots: { items: { item: { drink: "tap_water" } } } },
    { say: "The lasagna for me and the steak for my wife", intent: "order", not: ["order_unknown"] },
    { say: "Give us a minute", intent: "need_time", step: "order" },
    { say: "I'll have what she's having", intent: "same", step: "order", not: ["order_unknown"] },
    { say: "Medium, not too red", intent: "doneness_ans", step: "doneness", slots: { doneness: "medium" }, not: ["reject"] },
    { say: "No blood, please", intent: "doneness_ans", step: "doneness", slots: { doneness: "well_done" } },
    { say: "No fries", intent: "reject", step: "side", not: ["side_ans"] },
    { say: "It's okay", intent: "all_good_ctx", step: "checkback", not: ["its_ok"] },
    { say: "The steak is a bit overcooked", intent: "complain_other", step: "checkback" },
    { say: "Not very hot", intent: "complain_cold", step: "checkback_soup" },
    { say: "No cake for me", intent: "dessert_no", step: "dessert", not: ["order"] },
    { say: "I'm on a diet", intent: "dessert_no", step: "dessert", not: ["order_unknown"] },
    { say: "How much do we owe you?", intent: "check_ask", step: "check" },
    { say: "Split it in two", intent: "split_ans", step: "split", not: ["resv_yes", "resv_time_ctx"] },
    { say: "I'll pay for both of us", intent: "split_ans", step: "split", not: ["order_unknown"] },
    { say: "Here's forty dollars", intent: "here_you_go", step: "pay" },
    { say: "I don't have cash", intent: "no_cash", step: "pay", not: ["pay_cash"] },
    { say: "I'll tip twenty", intent: "tip_give", step: "tip", not: ["order_unknown"] },
    { say: "I think you made a mistake", intent: "complain_wrong", step: "serve_wrong", not: ["order_unknown"] },
    { say: "Excuse me, I ordered lasagna, not burger", intent: "complain_wrong", step: "serve_wrong", not: ["order"] },
    { say: "We'll come back later", intent: "wait_no_ctx", step: "wait" },
    // learner English
    { say: "We have reservation on name Tomas", intent: "resv_yes", step: "resv", slots: { name: "Tomas" } },
    { say: "We pay separate", intent: "split_ans", step: "split" },
    { say: "This is not my food, I order lasagna", intent: "complain_wrong", step: "serve_wrong", not: ["order"] },
    { say: "Tip is included?", intent: "ask_tip" },
    { say: "The steak is not good", intent: "complain_other", step: "checkback", not: ["order"] },
    { say: "Can I have the penne but not too spicy?", intent: "order", slots: { items: { item: { main: "penne" } } } },
  ],

  sims: [
    { name: "reservation, lasagna, card and tip",
      turns: ["Hi! I have a reservation for two at seven.", "It's under Tomas.", "A lemonade and a glass of red wine, please.",
        "I'll have the lasagna, please.", "Could we get the check, please?", "Can I pay by card?", "Twenty percent."],
      // the plain dinner: the complaint twists have their own sim
      setup: (s) => { s.wrongTwist = false; s.soupTwist = false; },
      auto: omit(AUTO, ["resv", "resv_name", "drinks", "order", "check", "pay", "tip"]), expect: { complete: true } },
    { name: "walk-in, questions, steak with sides, dessert",
      turns: ["Hi! We don't have a reservation. Could we get a table for two by the window?", "What do you have to drink?", "Just water, please.",
        "Sparkling, please.", "What do you recommend?", "Is the penne spicy?", "I'd like the steak, please.", "Medium rare.", "Fries, please.",
        "It's delicious. Compliments to the chef!", "Could we see the dessert menu?", "The tiramisu, please.", "Could we get the check?",
        "Separate checks, please.", "Is the tip included?", "Card, please.", "Eighteen percent."],
      setup: (s) => { s.wrongTwist = false; s.soupTwist = false; },
      auto: omit(AUTO, ["resv", "drinks", "order", "doneness", "side", "check", "pay", "tip"]), expect: { complete: true } },
    { name: "complaints: wrong dish and cold soup",
      turns: ["Good evening! We have a reservation under Tomas.", "Nothing for me, thanks.", "I'll have the minestrone soup and the grilled salmon.",
        "Roasted potatoes, please.", "Excuse me, this isn't what I ordered. I ordered the salmon.", "No problem.",
        "My soup is cold. Could you warm it up?", "No problem.", "Cash.", "Keep the change."],
      // the wrong-dish twist on every seed; the cold soup is the learner's own complaint at the check-back
      // (the two twists never come together; the "How's the soup?" twist has its own sim)
      setup: (s) => { s.wrongTwist = true; s.soupTwist = false; },
      auto: omit(AUTO, ["resv", "resv_name", "drinks", "order", "side", "pay"]), expect: { complete: true } },
    { name: "cold soup twist: soup offered, warmed up",
      turns: ["Good evening! We have a reservation under Tomas.", "An iced tea, please.", "I'll have the mushroom risotto.", "Yes, please.",
        "It's a little cold.", "Just the check, please.", "Card, please.", "Eighteen percent."],
      setup: (s) => { s.soupTwist = true; s.wrongTwist = false; },
      auto: omit(AUTO, ["resv", "resv_name", "drinks", "order", "soup_offer", "checkback_soup", "check", "pay", "tip"]), expect: { complete: true } },
    { name: "changes of mind and British words",
      turns: ["Hello, a table for one, please.", "No, I don't.", "I'll have a Coke.", "We're still deciding.", "Okay, I'm ready. I'll have the burger.",
        "Actually, I don't want the burger.", "Could I have the chicken parmesan instead?", "The bill, please.", "Is service included?", "Card",
        "Fifteen percent", "Goodbye!"],
      setup: (s) => { s.wrongTwist = false; s.soupTwist = false; },
      auto: omit(AUTO, ["resv", "drinks", "order", "side", "check", "pay", "tip"]), expect: { complete: true } },
  ],
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
  c.say("side_changed");
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

function requestLine(req: string): string {
  return req === "bread" ? "bread_ok" : req === "refill" || req === "water" ? "refill_ok" : "request_ok";
}

function choosePay(c: Ctx, method: "card" | "cash") {
  if (c.s.payMethod) return;
  if (!c.s.checkBrought) {
    // "Can I pay by card?" during the meal (or while the check is on its way) gets an answer; after the
    // meal, "I'll bring the check right over" answers it.
    if (!c.s.wantPay && (!mealOver(c) || c.s.checkComing)) c.say("no_problem");
    c.s.wantPay = method; c.s.checkAsked = true; c.s.dessertDone = true;
    return;
  }
  c.s.payMethod = method;
}

export default restaurant;
