// Song 72 "Eat In or Take Away?" → American: "For Here or To Go?"
// Sunny Cup Café, barista Mia. The flagship situation and the reference example
// for authoring (see AUTHORING.md).

import type { Ctx, EntityDef, SituationDef } from "../types";
import { ent, t } from "../dsl";
import { expectHowAreYou } from "../global";

// ---------------------------------------------------------------------------
// Menu

const PIENAS = "pienas/pieno/pienui/pieną/pienu/piene";
const KAVA = "kava/kavos/kavai/kavą/kava/kavoje";
const ARBATA = "arbata/arbatos/arbatai/arbatą/arbata/arbatoje";

export const DRINKS: EntityDef[] = [
  ent("latte", "latte", "latė/latės/latei/latę/late/latėje", "f", { pl: "lattes", ltPl: "latės/lačių/latėms/lates/latėmis/latėse",
    forms: ["cafe latte", "caffe latte", "latte coffee", "lattes", "late", "lotte"], attrs: { sized: true, milky: true, iced: true, price: [425, 475, 525] } }),
  ent("cappuccino", "cappuccino", "kapučino", "m", { pl: "cappuccinos",
    forms: ["cappuccinos", "cappucino", "capuccino", "capuchino", "cappuccino coffee"], attrs: { sized: true, milky: true, price: [400, 450, 500] } }),
  ent("americano", "americano", "amerikano", "m", { pl: "americanos",
    forms: ["americanos", "americano coffee", "caffe americano", "black americano"], attrs: { sized: true, iced: true, price: [300, 350, 400] } }),
  ent("espresso", "espresso", "espresas/espreso/espresui/espresą/espresu/esprese", "m", { pl: "espressos",
    forms: ["espressos", "expresso", "a shot of espresso", "single espresso"], attrs: { price: 275 } }),
  ent("flat_white", "flat white", "„flat white“", "m", { pl: "flat whites",
    forms: ["flat whites", "flat white coffee"], attrs: { milky: true, price: 450, oneSize: true } }),
  ent("mocha", "mocha", "moka/mokos/mokai/moką/moka/mokoje", "f", { pl: "mochas",
    forms: ["mochas", "mocha latte", "cafe mocha", "mocca", "moka"], attrs: { sized: true, milky: true, iced: true, price: [475, 525, 575] } }),
  ent("drip_coffee", "drip | coffee", `filtruota/filtruotos/filtruotai/filtruotą/filtruota/filtruotoje | ${KAVA}`, "f",
    { forms: ["regular coffee", "house coffee", "filter coffee", "black coffee", "brewed coffee", "plain coffee", "normal coffee", "coffee of the day", "just coffee", "regular drip coffee",
      "normal one", "regular one", "plain one", "the normal one", "the regular one", "filter", "drip"],
      attrs: { sized: true, iced: true, price: [250, 300, 350], cup: true } }),
  ent("coffee", "coffee", KAVA, "f", { forms: ["coffees"], attrs: { generic: "coffee", sized: true, cup: true } }),
  ent("hot_chocolate", "hot | chocolate", "karštas/karšto/karštam/karštą/karštu/karštame | šokoladas/šokolado/šokoladui/šokoladą/šokoladu/šokolade", "m",
    { pl: "hot | chocolates", forms: ["hot cocoa", "cocoa", "hot chocolates", "hot choc"], attrs: { sized: true, price: [350, 400, 450], cup: true } }),
  ent("tea", "tea", ARBATA, "f", { forms: ["teas", "hot tea", "herbal tea"], attrs: { generic: "tea", price: 300, cup: true } }),
  ent("black_tea", "black | tea", `juodoji/juodosios/juodajai/juodąją/juodąja/juodojoje | ${ARBATA}`, "f",
    { forms: ["english breakfast", "english breakfast tea", "earl grey", "earl grey tea", "black teas"], attrs: { price: 300, iced: true, cup: true } }),
  ent("green_tea", "green | tea", `žalioji/žaliosios/žaliajai/žaliąją/žaliąja/žaliojoje | ${ARBATA}`, "f",
    { forms: ["green teas"], attrs: { price: 300, iced: true, cup: true } }),
  ent("mint_tea", "mint | tea", `mėtų | ${ARBATA}`, "f", { forms: ["peppermint tea", "peppermint", "mint"], attrs: { price: 300, cup: true } }),
  ent("chamomile_tea", "chamomile | tea", `ramunėlių | ${ARBATA}`, "f", { forms: ["chamomile", "camomile tea", "camomile"], attrs: { price: 300, cup: true } }),
];

export const FOODS: EntityDef[] = [
  ent("croissant", "croissant", "kruasanas/kruasano/kruasanui/kruasaną/kruasanu/kruasane", "m", { pl: "croissants",
    ltPl: "kruasanai/kruasanų/kruasanams/kruasanus/kruasanais/kruasanuose", forms: ["butter croissant", "crossant", "croissan", "croissants"], attrs: { price: 325 } }),
  ent("muffin", "muffin", "keksiukas/keksiuko/keksiukui/keksiuką/keksiuku/keksiuke", "m", { pl: "muffins", attrs: { generic: "muffin", price: 350 } }),
  ent("blueberry_muffin", "blueberry | muffin", "mėlynių | keksiukas/keksiuko/keksiukui/keksiuką/keksiuku/keksiuke", "m",
    { pl: "blueberry | muffins", forms: ["blueberry"], attrs: { price: 350 } }),
  ent("chocolate_muffin", "chocolate | muffin", "šokoladinis/šokoladinio/šokoladiniam/šokoladinį/šokoladiniu/šokoladiniame | keksiukas/keksiuko/keksiukui/keksiuką/keksiuku/keksiuke", "m",
    { pl: "chocolate | muffins", forms: ["chocolate chip muffin", "double chocolate muffin"], attrs: { price: 350 } }),
  ent("cinnamon_roll", "cinnamon | roll", "cinamoninė/cinamoninės/cinamoninei/cinamoninę/cinamonine/cinamoninėje | bandelė/bandelės/bandelei/bandelę/bandele/bandelėje", "f",
    { pl: "cinnamon | rolls", forms: ["cinnamon bun", "cinnamon buns", "cinnamon rolls"], attrs: { price: 375 } }),
  ent("bagel", "bagel", "riestainis/riestainio/riestainiui/riestainį/riestainiu/riestainyje", "m", { pl: "bagels", forms: ["bagels", "bagel with cream cheese"], attrs: { price: 300 } }),
  ent("cookie", "cookie", "sausainis/sausainio/sausainiui/sausainį/sausainiu/sausainyje", "m", { pl: "cookies",
    ltPl: "sausainiai/sausainių/sausainiams/sausainius/sausainiais/sausainiuose", forms: ["cookies", "chocolate chip cookie", "biscuit"], attrs: { price: 250 } }),
  ent("sandwich", "turkey | sandwich", "kalakutienos | sumuštinis/sumuštinio/sumuštiniui/sumuštinį/sumuštiniu/sumuštinyje", "m",
    { forms: ["sandwich", "sandwiches", "turkey sandwiches"], attrs: { price: 725, warm: true } }),
];

const SIZES: EntityDef[] = [
  ent("small", "small", "mažas/mažo/mažam/mažą/mažu/mažame", "m", { forms: ["tall", "short", "little", "smallest", "the smallest", "smaller"], chip: "mažas" }),
  ent("medium", "medium", "vidutinis/vidutinio/vidutiniam/vidutinį/vidutiniu/vidutiniame", "m", { forms: ["regular", "regular size", "grande", "normal", "middle"], chip: "vidutinis" }),
  ent("large", "large", "didelis/didelio/dideliam/didelį/dideliu/dideliame", "m", { forms: ["big", "venti", "extra large", "biggest", "the biggest", "largest", "the largest", "bigger", "larger"], chip: "didelis" }),
];

const MILKS: EntityDef[] = [
  ent("whole", "whole | milk", `nenugriebtas/nenugriebto/nenugriebtam/nenugriebtą/nenugriebtu/nenugriebtame | ${PIENAS}`, "m", { forms: ["whole", "full fat milk", "full fat", "regular milk", "normal milk", "regular", "normal", "two percent", "2 percent milk", "cow milk", "cows milk", "dairy", "dairy milk"], chip: "nenugriebtas pienas" }),
  ent("skim", "skim | milk", `liesas/lieso/liesam/liesą/liesu/liesame | ${PIENAS}`, "m", { forms: ["skim", "skimmed milk", "skimmed", "nonfat milk", "nonfat", "non fat", "fat free milk", "low fat milk", "low fat", "light milk"], chip: "liesas pienas" }),
  ent("oat", "oat | milk", `avižų | ${PIENAS}`, "m", { forms: ["oat", "oatmilk", "oats milk"], chip: "avižų pienas", attrs: { extra: 75 } }),
  ent("almond", "almond | milk", `migdolų | ${PIENAS}`, "m", { forms: ["almond"], chip: "migdolų pienas", attrs: { extra: 75 } }),
  ent("soy", "soy | milk", `sojų | ${PIENAS}`, "m", { forms: ["soy", "soya milk", "soya"], chip: "sojų pienas", attrs: { extra: 75 } }),
];

const TEMPS: EntityDef[] = [
  ent("hot", "hot", "karštas/karšto/karštam/karštą/karštu/karštame", "m", { forms: ["warm"], chip: "karštas" }),
  ent("iced", "iced", "ledinis/ledinio/lediniam/ledinį/lediniu/lediniame", "m", { forms: ["ice", "cold", "on ice", "with ice"], chip: "su ledu" }),
];

const byId = (id: string) => [...DRINKS, ...FOODS, ...SIZES, ...MILKS, ...TEMPS].find((e) => e.id === id)!;
const SIZE_IDX: Record<string, number> = { small: 0, medium: 1, large: 2 };

// ---------------------------------------------------------------------------
// State helpers

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
  let base = Array.isArray(p) ? p[SIZE_IDX[it.size || "medium"]] : (p ?? 300);
  if (it.milk) base += byId(it.milk).attrs?.extra ?? 0;
  if (it.temp === "iced") base += 50;
  if (it.extraShot) base += 75;
  return base * it.qty;
}
const total = (c: Ctx) => (c.s.items as Item[]).reduce((a, it) => a + itemPrice(it), 0);

function fromSlot(v: any): Item | null {
  if (!v) return null;
  const tags: string[] = v.__tags || [];
  const qty = tags.includes("q3") ? 3 : tags.includes("q2") ? 2 : 1;
  if (v.drink) {
    let id = v.drink as string;
    if (id === "coffee" && (tags.includes("cupof") || v.kind === "plain")) id = "drip_coffee";
    const it: Item = { cat: "drink", id, qty, size: v.size, milk: v.milk, temp: v.temp, cupOf: tags.includes("cupof") };
    if (tags.includes("nomilk")) it.noMilk = true;
    if (tags.includes("extra_shot")) it.extraShot = true;
    if (tags.includes("decaf")) it.decaf = true;
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
const np = (it: Item) => ({ id: it.id, mods: [it.size && byId(it.id).attrs?.sized ? it.size : null, it.temp === "iced" ? "iced" : null].filter(Boolean) as string[], qty: it.qty });

/** Adds the ordered items; returns how many already-ordered items only changed their number. */
function addItems(c: Ctx, list: Item[], tags: string[]): number {
  // "(Actually,) just one cappuccino": a drink already ordered, not another one
  const only = tags.includes("only") && !tags.includes("another");
  const qtySaid = tags.some((x) => /^q\d$/.test(x));
  let fixed = 0;
  for (const it of list) {
    // Answering "What kind of coffee/tea/muffin?": replace the generic item, keep details.
    const g = items(c).find((x) => generic(x) && byId(x.id).attrs?.generic === (byId(it.id).attrs?.generic ?? kindOf(it.id)));
    if (g && !generic(it)) {
      Object.assign(g, { ...it, size: it.size ?? g.size, milk: it.milk ?? g.milk, temp: it.temp ?? g.temp, qty: g.qty });
      continue;
    }
    // "Just one cappuccino" after ordering two: set the number. "Just the latte" at "Anything else?": that's all.
    const prev = only ? items(c).find((x) => x.id === it.id) : undefined;
    if (prev) {
      if (qtySaid && prev.qty !== it.qty) { prev.qty = it.qty; fixed++; } else if (c.step === "more") c.s.moreDone = true;
      for (const k of ["size", "milk", "temp"] as const) if (it[k]) prev[k] = it[k];
      continue;
    }
    // Same drink already ordered without details: treat as a clarification, not a second drink ("another" is a second one).
    const same = !tags.includes("another") && items(c).find((x) => x.id === it.id && !it.size && !it.milk && it.qty === 1 && x === items(c)[items(c).length - 1] && c.step !== "more");
    if (same) { Object.assign(same, { ...same, ...Object.fromEntries(Object.entries(it).filter(([, v]) => v != null)) }); continue; }
    items(c).push(it);
  }
  if (tags.includes("togo")) c.s.dine = "togo";
  if (tags.includes("here")) c.s.dine = "here";
  return fixed;
}
function kindOf(id: string): string | undefined {
  if (["latte", "cappuccino", "americano", "espresso", "flat_white", "mocha", "drip_coffee"].includes(id)) return "coffee";
  if (id.endsWith("_tea")) return "tea";
  if (id.endsWith("_muffin")) return "muffin";
  return undefined;
}

function applyDetail(c: Ctx, key: "size" | "milk" | "temp", value: string | null, extra: Partial<Item> = {}) {
  const target = key === "size"
    ? drinks(c).find((d) => !d.size && byId(d.id).attrs?.sized) ?? drinks(c).at(-1)
    : key === "milk"
      ? drinks(c).find((d) => !d.milk && !d.noMilk && (byId(d.id).attrs?.milky || c.step === "milk")) ?? drinks(c).at(-1)
      : drinks(c).find((d) => !d.temp) ?? drinks(c).at(-1);
  if (!target) return false;
  if (key === "size" && byId(target.id).attrs?.oneSize) { c.say("one_size"); return true; }
  if (value) (target as any)[key] = value;
  Object.assign(target, extra);
  return true;
}

// Automatic answers the simulation uses when Mia asks one of her optional questions.
const CAFE_AUTO: Record<string, string> = {
  order: "A latte, please", kind: "A latte", size: "Medium", milk: "Whole milk", whole_ok: "Yes", alt_milk: "Yes, that's fine",
  temp: "Hot, please", warm: "Yes, please", more: "That's all", dine: "To go", name: "Tomas", pay: "Card",
  receipt: "No, thanks", usual: "Yes, please",
};

// ---------------------------------------------------------------------------

export const cafe: SituationDef = {
  id: "s72-cafe",
  song: 72,
  songTitle: "Eat In or Take Away?",
  title: { en: "For Here or To Go?", lt: "Čia ar išsinešti?" },
  topic: { en: "At the café", lt: "Kavinėje" },
  chapter: 2,
  order: 2,
  location: "sunny-cup",
  npc: "mia",
  goal: "Užsisakyk gėrimą (ir, jei nori, ką nors užkąsti), pasakyk, ar gersi čia, ar išsineši, ir susimokėk.",
  intro: "„Sunny Cup“ – jauki kavinė aikštėje. Už prekystalio – barista Mia. Meniu kabo ant lentos už jos.",
  entities: { drink: DRINKS, food: FOODS, size: SIZES, milk: MILKS, temp: TEMPS },

  grammar: {
    macros: {
      order_prefix: [
        "i will have #h:ill_have", "i will just have #h:ill_have", "i will take #h:ill_get", "i will get #h:ill_get",
        "i would like #h:id_like", "i would just like #h:id_like", "i would love #h:id_like", "i would like to (have | get | order | eat | drink | try) #h:id_like",
        "(how | what) about", "and (how | what) about", "i would also like #h:id_like", "can i also (get | have) #h:food_also", "i would like to eat", "i want to eat #blunt",
        "can i (get | have) #h:can_i_get", "can i just (get | have) #h:can_i_get", "can i please (get | have) #h:can_i_get",
        "could i (get | have) #h:could_i_have", "could i just (get | have) #h:could_i_have", "could i please (get | have) #h:could_i_have",
        "may i (have | get) #h:may_i_have", "may i please have #h:may_i_have",
        "let me (get | have) #h:let_me_get", "let me just get #h:let_me_get",
        "i will go (with | for) #h:go_with", "i think i will (have | get | take | go with) #h:think_ill", "i am going to (have | get) #h:think_ill",
        "i want #blunt #h:i_want", "i need #blunt", "give me #blunt", "get me #blunt",
        "can you (get | give | make) me #h:can_i_get", "could you (get | give | make) me #h:could_i_have",
        "we will have", "we would like", "can we (get | have)", "could we (get | have)",
        "i will do", "i would do", "i would like to try", "can i try",
        // "I'm gonna go with…", "Let's do…", "Is it possible to get…", "For me…" (Man…), "I take…" (Aš imu…)
        "i am going to go (with | for) #h:go_with", "let us (do | get | have)", "is it possible to (get | have | order)", "for me", "i take", "(can | could) i order", "i will try",
        "i want to (have | get | order | drink | try) #blunt", "i (need | want) to order #blunt",
      ],
      qty: "(a #q1 | an #q1 | one #q1 | two #q2 | three #q3 | another #q1 #another | a cup of #cupof | one cup of #cupof | a mug of #cupof | just a #q1 #only | just one #q1 #only | only one #q1 #only | just #only)",
      dine: "(to go #togo | for here #here | to stay #here | here #here | for takeout #togo | takeout #togo | to take out #togo | to take away #togo #tip:uk_takeaway | take away #togo #tip:uk_takeaway | takeaway #togo #tip:uk_takeaway | to eat in #here #tip:uk_eatin | eat in #here #tip:uk_eatin)",
      drink_pre: "({size} [size] | {temp} | decaf #decaf | extra hot #extrahot | {milk} [milk] | {kind} | double #extra_shot)",
      drink_post: "(with {milk} [milk] | with milk | no milk #nomilk | without milk #nomilk | black #nomilk | with an extra shot #extra_shot | with a double shot #extra_shot | extra hot #extrahot | decaf #decaf | {temp} | no sugar | with sugar | @dine | in a {size} [size | cup] | {size} [size]"
        + " | double #extra_shot | with (lemon | honey | a slice of lemon) | [with] (extra | no | less) foam | with foam | with whipped cream | with (a little | some) sugar | for (me | my (son | daughter | wife | husband | friend | kid | colleague | partner | boyfriend | girlfriend)))",
    },
    slots: {
      kind: { lexicon: [{ id: "plain", forms: ["regular", "plain", "normal", "drip", "house", "filter", "brewed"] }] },
      item: { pattern: [
        "[@qty] [@drink_pre] [@drink_pre] [@drink_pre] {drink} [@drink_post] [@drink_post] [@drink_post]",
        "[@qty] {food} [with cream cheese | warmed up | toasted | @dine]",
      ] },
      items: { pattern: "{item} [(and | and a | and an | plus | with | and also | and then | also) {item}] [(and | plus) {item}]" },
      thing: { pattern: "({drink} | {food} | {milk} [milk] | decaf #decaf | sugar #sugar | wi fi #wifi | wifi #wifi)" },
    },
  },

  intents: {
    order: { patterns: ["@order_prefix {items} [@dine]", "[just #only] {items} [@dine]", "@dine {items}", "{items} (is | would be | will be) (fine | good | great | perfect | nice | lovely)", "{items} sounds (good | great | nice)"] },
    size_ans: { patterns: [
      "[a | the] {size} [one | size]", "@order_prefix [a | the] {size} [one | size] #h2:size",
      "make (it | that) [a] {size} #h:make_it", "{size} (is fine | is good | is great | will do | works) #h:size_fine", "[the] {size} [one] (is enough | is perfect | is okay)",
      "(let us | let me) go (with | for) [a] {size}", "[i think] (a | the) {size} [one] (is fine | will do)",
      "not (too big | too large) [[a | the] {size} [one]] #small",
    ] },
    milk_ans: { patterns: [
      "[just] {milk} [milk] #h:milk_please", "with {milk} [milk] #h:milk_with", "(i will have | i would like | can i (get | have) | could i (get | have)) {milk} [milk] #h:milk_can",
      "(no | without) milk #nomilk #h:milk_none", "[just] black #nomilk", "none #nomilk", "no milk for me #nomilk",
      "[just] (regular | normal) milk #regular #h:milk_regular",
      "[just] (a little | a bit of | some) milk #regular", "(let us do | let us go with | i will go with | i will take | i will do) {milk} [milk]",
      "{milk} [milk] (is fine | is good | is okay | would be fine | works | is perfect | is great)", "{milk} [milk] would be (great | good | perfect | nice | lovely)", "(any | whatever) [milk] is fine #regular", "then [just] {milk} [milk]", "then [just] black #nomilk", "(no | without) sugar [and] (no | without) milk #nomilk", "(no | without) milk [and] (no | without) sugar #nomilk",
      "(whatever | anything) you have #regular",
    ] },
    temp_ans: { patterns: ["{temp}", "(i will have | i would like | can i (get | have)) it {temp}", "make it {temp}", "{temp} (is fine | would be great | please)", "{temp} [is] (good | okay | better)"] },
    dine_ans: { patterns: [
      "@dine #h:dine_short", "(it is | that is | it will be | that will be) @dine #h:dine_its",
      "i will (have | drink | eat) it here #here #h:dine_have_here", "i will take it (with me | to go) #togo #h:dine_take",
      "(can | could) i (get | have) it @dine #h:dine_can", "i am (staying | sitting) here #here", "i am taking it with me #togo",
      "[to] take [it] with me #togo", "with me #togo", "in here #here", "i am staying #here", "i will (sit | stay) here #here", "[@dine] i am in a hurry #togo",
      "(i am going to | i want to | i would like to) (drink | have | eat) it here #here", "(i am going to | i want to | i would like to) take it (with me | to go) #togo",
      "i (drink | eat | stay | sit) [it] here #here", "i take it (with me | away) #togo",
      "i will take it [away | out] #togo", "take it away #togo #tip:uk_takeaway", "i am (leaving | not staying) #togo",
    ] },
    more_no: { patterns: [
      "(that is | that will be | that would be) (all | it | everything) #h:more_all", "[no] that is it #h:more_its",
      "nothing else #h:more_nothing", "[no] i am (good | fine | okay) #h:more_good", "that is all [for now]", "just (that | the drink | the coffee | the tea)",
      "[no] nothing [else]", "i think that is (all | it)", "no more", "[no] that is enough",
      "[no] i do not (want | need) anything (else | to eat | more)", "[no] i do not want (food | anything) [thanks]", "nothing to eat [thanks]", "just the (drink | coffee) [thanks]",
      "[no] i am not (hungry | that hungry) [thanks]", "[no] nothing to eat", "[no] (it is | is) enough [thanks]",
    ] },
    more_yes: { patterns: ["(yes | yeah) (actually | please)", "actually yes", "(one | just one) more thing", "i would like something else", "something else"] },
    pay_card: { patterns: [
      "[can | could] i pay (by | with) (card | credit card | debit card | my card | credit) #h:pay_card", "(by | with) card", "card #h:pay_card_short",
      "(is | are) (card | cards | credit card | visa | mastercard) (okay | ok | fine | accepted)", "contactless", "(i will | can i) tap [it | my card]", "(put it | charge it) on my card",
      "card is (fine | okay | ok | good)",
      "(i will | i would like to | i am going to) pay (by | with) (card | credit card | debit card | my card | a card)", "do you (take | accept) (cards | credit cards | card | visa | mastercard) #h:take_cards",
      "can i (use | tap) my card", "[a] (credit | debit) card",
    ] },
    // "I don't have cash": so it's the card (never read as "cash")
    no_cash: { patterns: ["(i | we) do not have [any | enough] cash", "no cash [sorry]", "(i | we) (can not | do not want to) pay (in | with) cash", "i have no cash"] },
    pay_cash: { patterns: ["[can | could] i pay (in | with) cash", "(in | with) cash", "cash", "(i will | i would like to | i am going to) pay (in | with) cash #h:pay_cash", "i will pay cash"] },
    pay_phone: { patterns: ["(can | could) i pay (with | by) (my phone | apple pay | google pay | phone)", "(can | could) i use (my phone | apple pay | google pay)", "(with | by) (my phone | phone)",
      "(i will | i am going to | i would like to) pay (with | by) (my phone | phone | apple pay | google pay)", "do you (take | accept) (apple pay | google pay | phone payments) #h:apple_pay", "apple pay", "google pay"] },
    here_you_go: { patterns: ["here you (go | are) #h:here_you_go", "there you go", "here it is", "here is my card", "here is {price}", "here is (the | my) money", "here is (twenty | ten | five | fifty) [dollars]"] },
    keep_change: { patterns: ["keep the change #h:keep_change", "you can keep the change", "keep it"] },
    ask_price: { patterns: [
      "how much (is | does) [a | an | the | one] {item} [cost] #h:q_price", "how much (is | does) (it | that | this) [cost | come to]",
      "how much (are | do) (the)? {drink} cost", "what is the price (of | for) [a | an | the] {item}", "how much do i owe you", "what do i owe you",
      "what is the total", "how much is (a | an | the) {size} [one]", "how much for [a | an | the] {item}",
      // learner word order: "What cost latte?", "How much cost cappuccino?", "Latte is how much?"
      "(what | how much) (cost | costs) [a | an | the | one] {item}", "[a | an | the] {item} (is | costs) how much",
    ] },
    ask_menu: { patterns: [
      "what do you have #h:q_menu", "what (kinds | kind | types | sort) of (coffee | drinks | tea | teas | pastries | food | milk) do you have #h:q_kinds",
      "what (drinks | coffees | teas | pastries) do you have", "(can | could) i see the menu", "do you have a menu", "what is on the menu",
      "what are my options", "what (sizes | milks) do you have #h:q_sizes", "what kind of milk do you have", "what (sizes | kinds of milk) are there",
    ] },
    ask_recommend: { patterns: [
      "what (do | would) you recommend #h:q_recommend", "what is (good | popular | your favorite | the most popular | good here)", "any recommendations", "what should i (get | have | try)",
      "what (do | would) you suggest", "what (do | would) you (recommend | suggest) (to eat | for food | to drink | for a drink) #h:q_recommend",
      "what is good to (eat | drink)", "can you recommend (something | anything) [to eat | to drink]", "what should i (eat | drink)", "(any | do you have any) suggestions",
    ] },
    want_food: { patterns: [
      "(i would like | i want | i will have | can i (get | have) | could i (get | have) | may i have) something to eat #h:want_food",
      "(i would like | i want) to eat something", "(something | anything) to eat", "i am [a bit | a little | really | so] hungry",
      "what (do you have | have you got | do you guys have) (to eat | for food)", "what (food | snacks | pastries) do you have",
      "what is there to eat", "what (can | could) i eat", "what food (is there | do you have)", "(is there | do you have) (anything | something) to eat",
      "what (kind of | kinds of) food (is there | do you have)", "what (do | can) you (have | offer) to eat",
      "(what | how) about (food | something to eat | something to eat too)", "do you have (any | some) food", "(and | also) something to eat",
      "[and | also] something (sweet | small | small to eat)", "what (cakes | desserts | sweets | snacks) do you have", "do you have (any)? (cakes | desserts | sweets | snacks)",
    ] },
    ask_have: { patterns: ["do you (have | sell | serve | make | do) [any] {thing} #h:q_have", "(is there | have you got) [any] {thing}", "(can | could) i get {thing} [instead]?"] },
    ask_have_unknown: { patterns: ["do you (have | sell | serve | make | do) [any] {w:any}"] },
    ask_wifi: { patterns: ["do you have (wi fi | wifi | internet) #h:q_wifi", "is there (wi fi | wifi)", "what is the (wi fi | wifi | internet) password #h:q_password", "(wi fi | wifi) password", "(can | could) i (get | have) the (wi fi | wifi) password", "is the (wi fi | wifi) free"] },
    ask_restroom: { patterns: [
      "where is the (restroom | bathroom | washroom | ladies room | mens room) #h:q_restroom", "where is the toilet #tip:us_restroom",
      "do you have a (restroom | bathroom | toilet)", "(can | could | may) i use the (restroom | bathroom | toilet)",
    ] },
    ask_water: { patterns: ["(can | could | may) i (have | get) [a glass of | some | a cup of] water #h:q_water", "[some] water", "a glass of water", "tap water"] },
    ask_sugar: { patterns: ["(can | could) i (have | get) (some | a little) sugar", "where is the sugar", "do you have sugar", "sugar", "(where are | do you have) (napkins | straws | lids)"] },
    change: { patterns: [
      "[actually] (can | could) i (change | switch) (that | it) (to | for) {item} #h:change", "[actually] make (that | it) {item}",
      "[actually] (make | change) (that | it) (a | to a | into a) {size}", "actually {item} instead", "{item} instead",
      "actually (can | could) i (get | have) {item} instead",
    ] },
    reject: { patterns: [
      "[actually] i (do not | will not) (want | need) {item}", "[actually] no {item}", "not {item}", "[actually] (cancel | forget) the {item}", "i do not drink {item}",
      "[actually] i do not want (it | that) anymore", "[actually] never mind [the {item}]", "[actually] without the {item}", "i changed my mind",
    ] },
    correction: { patterns: ["[no] not {item} [but] {item}", "no i said {item}", "{item} not {item}"] },
    // "Actually, just one." after ordering two
    qty_one: { patterns: ["(just | only) one [of them]", "make (it | that) [just | only] one", "[just] one is (enough | fine)", "i (only | just) (need | want) one"] },
    order_unknown: { patterns: ["@order_prefix {w:any}"] },
    order_partial: { patterns: ["@order_prefix {items} (and | plus | with | and also | and a | and an) {w:any}", "{items} (and | plus | with) {w:any}"] },
    name_ctx: { patterns: ["[it is | my name is | the name is | i am | put it under | under] {name} #h:name_its", "(my name is | it is) {name} #h:name_mine", "call me {name}", "(it is | the order is | that is) for {name}",
      "[it is | my name is] {name} [that is | it is spelled | spelled] {letters}"] },
    no_receipt: { patterns: ["(i do not need | no need for) a receipt", "no receipt"] },
    // "No, I don't need it" (to "Do you need a receipt?")
    no_receipt_ctx: { patterns: ["[no] i do not need (it | one | that)", "[no] (it is | that is) not necessary", "[no] i am (fine | good | okay) [thanks]"] },
    // "Yes, I need it" (to "Do you need a receipt?")
    receipt_yes_ctx: { patterns: ["[yes] i (need | want | would like) (it | one)", "[yes] (give me | i will take) (it | one)"] },
    want_receipt: { patterns: ["(can | could | may) i (have | get) (a | the) receipt", "(i would like | i need | i want) (a | the) receipt", "[yes] (a | the) receipt please", "give me (a | the) receipt"] },
    togo_bag: { patterns: ["(can | could) i (get | have) a (bag | lid | sleeve)"] },
  },

  lines: {
    food_menu: [
      t("For | food, | we | have | croissants, | muffins, | bagels | and | cookies.", "Iš | maisto, | mes | turime | kruasanų, | keksiukų, | riestainių | ir | sausainių.", "Iš maisto turime kruasanų, keksiukų, riestainių ir sausainių."),
      t("We | have | croissants, | muffins, | bagels, | cookies | and | sandwiches.", "Mes | turime | kruasanų, | keksiukų, | riestainių, | sausainių | ir | sumuštinių.", "Turime kruasanų, keksiukų, riestainių, sausainių ir sumuštinių."),
    ],
    rec_food: [
      t("The | cinnamon | rolls | are | amazing.", "— | Cinamoninės | bandelės | yra | nuostabios.", "Cinamoninės bandelės – nuostabios."),
      t("Try | a | blueberry | muffin. | They're | really | good.", "Paragaukite | — | mėlynių | keksiuko. | Jie yra | tikrai | skanūs.", "Paragaukite mėlynių keksiuko – jie tikrai skanūs."),
    ],
    food_pick: [
      t("Would | you | like | something?", "Ar | jūs | norėtumėte | ko nors?", "Gal norėtumėte ko nors?",
        { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte (linked to “like”)." } }),
    ],
    ask_food_more: [
      t("Would | you | like | anything | to eat | with | that?", "Ar | jūs | norėtumėte | ko nors | užkąsti | prie | to?", "Gal norėtumėte ko nors užkąsti?",
        { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte (linked to “like”)." } }),
    ],
    greet_howareyou: [
      t("Hi there! | How | are | you | doing | today?", "Sveiki! | Kaip | — | jums | sekasi | šiandien?", "Sveiki! Kaip jums šiandien sekasi?",
        { flags: { 2: "Progressive “are” has no Lithuanian word; sekasi carries the tense (linked to “doing”)." } }),
      t("Good | morning! | How | are | you?", "Labas | rytas! | Kaip | sekasi | jums?", "Labas rytas! Kaip sekasi?"),
      t("Hey! | How's it going?", "Labas! | Kaip sekasi?", "Labas! Kaip sekasi?"),
    ],
    greet_order: [
      t("Hi! | What | can | I | get | you?", "Sveiki! | Ką | galiu | aš | paduoti | jums?", "Sveiki! Ką jums paduoti?"),
      t("Good | morning! | What | can | I | get started | for you?", "Labas | rytas! | Ką | galiu | aš | pradėti ruošti | jums?", "Labas rytas! Ką jums paruošti?"),
      t("Hi there! | What | would | you | like?", "Sveiki! | Ko | — | jūs | norėtumėte?", "Sveiki! Ko norėtumėte?",
        { flags: { 2: "“would” has no separate word: the conditional ending of norėtumėte carries it (linked to “like”)." } }),
      t("Hey! | What | can | I | get | for you | today?", "Labas! | Ką | galiu | aš | paduoti | jums | šiandien?", "Labas! Ką jums šiandien paduoti?"),
    ],
    greet_back: [
      t("Hey, | welcome | back! | What | can | I | get | you?", "Labas, | sveiki | sugrįžę! | Ką | galiu | aš | paduoti | jums?", "Sveiki sugrįžę! Ką jums paduoti?"),
      t("Good | to see | you | again! | What | would | you | like | today?", "Gera | matyti | jus | vėl! | Ko | — | jūs | norėtumėte | šiandien?", "Smagu jus vėl matyti! Ko šiandien norėtumėte?",
        { flags: { 5: "“would” has no separate word: the conditional ending of norėtumėte carries it (linked to “like”)." } }),
    ],
    usual: [
      t("Hey, | welcome | back! | The | usual? | {X.np}?", "Labas, | sveiki | sugrįžę! | — | Kaip įprastai? | {X.np:acc}?", "Sveiki sugrįžę! Kaip įprastai – {X.np:acc}?"),
    ],
    ask_order: [
      t("What | can | I | get | you?", "Ką | galiu | aš | paduoti | jums?", "Ką jums paduoti?"),
      t("What | would | you | like?", "Ko | — | jūs | norėtumėte?", "Ko norėtumėte?", { flags: { 1: "“would”: the conditional ending of norėtumėte carries it (linked to “like”)." } }),
      t("So, | what | can | I | get | for you?", "Tai | ką | galiu | aš | paduoti | jums?", "Tai ką jums paduoti?"),
    ],
    ask_what_else: [
      t("Sure! | What | else | can | I | get | you?", "Žinoma! | Ką | dar | galiu | aš | paduoti | jums?", "Žinoma! Ką dar jums paduoti?"),
      t("Of course. | What | else | would | you | like?", "Žinoma. | Ko | dar | — | jūs | norėtumėte?", "Žinoma. Ko dar norėtumėte?", { flags: { 3: "“would”: the conditional ending of norėtumėte carries it." } }),
    ],
    ask_kind_coffee: [
      t("Sure! | What | kind | of coffee | would | you | like?", "Žinoma! | Kokios | rūšies | kavos | — | jūs | norėtumėte?", "Žinoma! Kokios kavos norėtumėte?", { flags: { 4: "“would”: the conditional ending of norėtumėte carries it." } }),
      t("What | kind | of coffee?", "Kokios | rūšies | kavos?", "Kokios kavos?"),
    ],
    coffee_list: [
      t("We | have | lattes, | cappuccinos, | americanos | and | drip | coffee.", "Mes | turime | lates, | kapučino, | amerikano | ir | filtruotą | kavą.", "Turime latės, kapučino, amerikano ir filtruotos kavos."),
    ],
    ask_kind_tea: [
      t("What | kind | of tea? | We | have | black, | green, | mint | and | chamomile.", "Kokios | rūšies | arbatos? | Mes | turime | juodosios, | žaliosios, | mėtų | ir | ramunėlių.", "Kokios arbatos? Turime juodosios, žaliosios, mėtų ir ramunėlių."),
    ],
    ask_kind_muffin: [
      t("Blueberry | or | chocolate?", "Mėlynių | ar | šokoladinį?", "Su mėlynėmis ar šokoladinį?"),
      t("We | have | blueberry | and | chocolate | muffins. | Which one?", "Mes | turime | mėlynių | ir | šokoladinių | keksiukų. | Kurį?", "Turime keksiukų su mėlynėmis ir šokoladinių. Kurį norėtumėte?"),
    ],
    ask_size: [
      t("What | size | would | you | like?", "Kokio | dydžio | — | jūs | norėtumėte?", "Kokio dydžio norėtumėte?", { flags: { 2: "“would”: the conditional ending of norėtumėte carries it." } }),
      t("Small, | medium, | or | large?", "Mažą, | vidutinį | ar | didelį?", "Mažą, vidutinį ar didelį?"),
      t("And | what | size?", "O | kokio | dydžio?", "O kokio dydžio?"),
    ],
    ask_milk: [
      t("What | kind | of milk | would | you | like?", "Kokios | rūšies | pieno | — | jūs | norėtumėte?", "Kokio pieno norėtumėte?", { flags: { 3: "“would”: the conditional ending of norėtumėte carries it." } }),
      t("Which | milk? | We | have | whole, | skim, | oat | and | almond.", "Kokį | pieną? | Mes | turime | nenugriebtą, | liesą, | avižų | ir | migdolų.", "Kokio pieno? Turime nenugriebto, lieso, avižų ir migdolų."),
    ],
    ask_whole_ok: [
      t("Is | whole | milk | okay?", "Ar | nenugriebtas | pienas | tinka?", "Ar tinka nenugriebtas pienas?", { flags: { 0: "“Is” in a yes/no question = the particle ar; the verb tinka takes over the copula (linked to “okay”)." } }),
    ],
    ask_temp: [
      t("Hot | or | iced?", "Karštą | ar | su ledu?", "Karštą ar su ledu?"),
      t("Hot | or | iced | today?", "Karštą | ar | su ledu | šiandien?", "Šiandien karštą ar su ledu?"),
    ],
    ask_more: [
      t("Anything | else?", "Ką nors | daugiau?", "Dar ko nors?"),
      t("Can | I | get | you | anything | else?", "Ar galiu | aš | paduoti | jums | ką nors | daugiau?", "Ar dar ko nors norėtumėte?"),
    ],
    ask_dine: [
      t("For here | or | to go?", "Čia | ar | išsinešti?", "Čia ar išsinešti?"),
      t("Is | that | for here | or | to go?", "Ar | tai | čia | ar | išsinešti?", "Gersite čia ar išsinešite?", { flags: { 0: "“Is” in a question = the particle ar; Lithuanian needs no copula here." } }),
      t("And | is | that | for here | or | to go?", "O | ar | tai | čia | ar | išsinešti?", "O gersite čia ar išsinešite?", { flags: { 1: "“is” in a question = the particle ar." } }),
    ],
    ask_name: [
      t("Can | I | get | a | name | for the order?", "Ar galiu | aš | gauti | — | vardą | užsakymui?", "Kokiu vardu užrašyti užsakymą?"),
      t("And | what's | the | name | for the order?", "O | koks yra | — | vardas | užsakymui?", "O kokiu vardu užsakymas?"),
    ],
    name_thanks: [
      t("Thanks! | I'll write | it | on | the | cup.", "Ačiū! | Užrašysiu | jį | ant | — | puodelio.", "Ačiū! Užrašysiu ant puodelio."),
      t("Great, | thanks!", "Puiku, | ačiū!", "Puiku, ačiū!"),
    ],
    name_again: [
      t("Sorry, | what | was | the | name?", "Atsiprašau, | koks | buvo | — | vardas?", "Atsiprašau, koks vardas?"),
    ],
    ack_order: [
      t("Sure!", "Žinoma!", "Žinoma!"),
      t("Great | choice!", "Puikus | pasirinkimas!", "Puikus pasirinkimas!"),
      t("Perfect.", "Puiku.", "Puiku."),
      t("Sounds | good!", "Skamba | gerai!", "Puiku!"),
    ],
    ack: [
      t("Okay.", "Gerai.", "Gerai."),
      t("Got it.", "Supratau.", "Supratau."),
      t("Perfect.", "Puiku.", "Puiku."),
    ],
    one_size: [
      t("We | only | have | one | size | for that.", "Mes | tik | turime | vieną | dydį | tam.", "Jo turime tik vieno dydžio."),
    ],
    say_total: [
      t("That'll be | {$price}.", "Tai bus | {$price}.", "Iš viso {$price}."),
      t("Your | total | is | {$price}.", "Jūsų | suma | yra | {$price}.", "Iš viso {$price}."),
    ],
    pre_total: [
      t("Alright.", "Gerai.", "Gerai."),
      t("Perfect.", "Puiku.", "Puiku."),
      t("Great.", "Puiku.", "Puiku."),
    ],
    ask_pay_method: [
      t("Cash | or | card?", "Grynaisiais | ar | kortele?", "Grynaisiais ar kortele?"),
    ],
    card_tap: [
      t("Sure, | just | tap | your | card | here.", "Žinoma, | tiesiog | pridėkite | savo | kortelę | čia.", "Žinoma, tiesiog pridėkite kortelę čia."),
      t("Of course. | Go | ahead | and | tap | here.", "Žinoma. | {j:Pirmyn|t:Pirmyn} | — | ir | pridėkite | čia.", "Žinoma. Pridėkite kortelę čia.", { flags: { 3: "“ahead” (go ahead): part of the invitation, carried by Pirmyn." } }),
    ],
    card_later: [
      t("Sure, | card | is fine.", "Žinoma, | kortele | galima.", "Žinoma, galima ir kortele."),
    ],
    phone_ok: [
      t("Of course! | Just | hold | your | phone | here.", "Žinoma! | Tiesiog | prilaikykite | savo | telefoną | čia.", "Žinoma! Tiesiog prilaikykite telefoną čia."),
    ],
    cash_ok: [
      t("Sure, | cash | is | fine.", "Žinoma, | grynieji | yra | gerai.", "Žinoma, galima ir grynaisiais."),
    ],
    change_back: [
      t("And | here's | your | change.", "Ir | štai | jūsų | grąža.", "Štai jūsų grąža."),
      t("Here's | your | change.", "Štai | jūsų | grąža.", "Štai jūsų grąža."),
    ],
    thanks_tip: [
      t("Oh, | thank | you | so much!", "O, | dėkoju | jums | labai!", "O, labai ačiū!"),
    ],
    paid: [
      t("Thank | you!", "Dėkoju | jums!", "Ačiū!"),
      t("Perfect, | thanks!", "Puiku, | ačiū!", "Puiku, ačiū!"),
    ],
    ask_receipt: [
      t("Would | you | like | a | receipt?", "Ar | jūs | norėtumėte | — | čekio?", "Ar norėtumėte čekio?", { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte." } }),
      t("Do | you | need | a | receipt?", "Ar | jums | reikia | — | čekio?", "Ar reikia čekio?", { flags: { 0: "Question “Do” = the particle ar." } }),
    ],
    receipt_here: [t("Here's | your | receipt.", "Štai | jūsų | čekis.", "Štai jūsų čekis.")],
    no_problem: [t("No | problem.", "Jokių | problemų.", "Jokių problemų.")],
    closing_here: [
      t("Perfect! | Have a seat, | and | I'll bring | it | over.", "Puiku! | Prisėskite, | ir | atnešiu | tai | —.", "Puiku! Prisėskite, aš atnešiu.",
        { flags: { 5: "“over” (bring it over): atnešti already includes the movement to you." } }),
      t("Great! | I'll bring | it | to | your | table.", "Puiku! | Atnešiu | tai | prie | jūsų | staliuko.", "Puiku! Atnešiu prie jūsų staliuko."),
    ],
    closing_togo: [
      t("Coming right up! | It'll be | ready | at the end | of the counter.", "Tuoj bus! | Bus | paruošta | gale | prekystalio.", "Tuoj bus! Pasiimsite prekystalio gale."),
      t("Perfect! | It'll be | ready | at the end | of the counter.", "Puiku! | Bus | paruošta | gale | prekystalio.", "Puiku! Pasiimsite prekystalio gale."),
      t("Great! | Your | drink | will be | ready | in | a | minute.", "Puiku! | Jūsų | gėrimas | bus | paruoštas | per | — | minutę.", "Puiku! Jūsų gėrimas bus paruoštas po minutės."),
    ],
    bye_after: [
      t("Have | a | great | day!", "Linkiu | — | puikios | dienos!", "Puikios dienos!"),
      t("Enjoy!", "Skanaus!", "Skanaus!"),
      t("Enjoy | your | drink!", "Mėgaukitės | savo | gėrimu!", "Skanaus!"),
    ],
    served_here: [
      t("Here | you | are. | Enjoy!", "Štai | jums | —. | Skanaus!", "Prašom. Skanaus!", { flags: { 2: "“are” (here you are): no Lithuanian word; Štai jums hands it over." } }),
    ],
    menu_line: [
      t("We | have | coffee, | tea, | hot | chocolate | and | pastries.", "Mes | turime | kavos, | arbatos, | karšto | šokolado | ir | pyragaičių.", "Turime kavos, arbatos, karšto šokolado ir pyragaičių."),
      t("Our | menu | is | on | the | board | behind | me.", "Mūsų | meniu | yra | ant | — | lentos | už | manęs.", "Meniu – ant lentos už manęs."),
    ],
    size_list: [
      t("We | have | small, | medium | and | large.", "Mes | turime | mažą, | vidutinį | ir | didelį.", "Turime mažą, vidutinį ir didelį."),
    ],
    milk_list: [
      t("We | have | whole, | skim, | oat, | almond | and | soy | milk.", "Mes | turime | nenugriebto, | lieso, | avižų, | migdolų | ir | sojų | pieno.", "Turime nenugriebto, lieso, avižų, migdolų ir sojų pieno."),
    ],
    food_list: [
      t("We | have | croissants, | muffins, | cinnamon | rolls, | bagels | and | cookies.", "Mes | turime | kruasanų, | keksiukų, | cinamoninių | bandelių, | riestainių | ir | sausainių.", "Turime kruasanų, keksiukų, cinamoninių bandelių, riestainių ir sausainių."),
    ],
    recommend: [
      t("Our | lattes | are | really | popular.", "Mūsų | latės | yra | tikrai | populiarios.", "Mūsų latės labai populiarios."),
      t("I | love | the | cinnamon | rolls! | They're | fresh | from | the | oven.", "Aš | dievinu | — | cinamonines | bandeles! | Jos yra | šviežios | iš | — | krosnies.", "Man labai patinka cinamoninės bandelės! Jos ką tik iškeptos."),
      t("Try | the | flat white. | It's | my | favorite!", "Paragaukite | — | „flat white“. | Tai yra | mano | mėgstamiausias!", "Paragaukite „flat white“ – tai mano mėgstamiausias!"),
    ],
    price_is: [
      t("{X.np} | is | {$price}.", "{X.np:nom} | kainuoja | {$price}.", "{X.np:nom} kainuoja {$price}."),
    ],
    which_item: [
      t("Which one?", "Kurį?", "Kurį?"),
    ],
    have_yes: [
      t("Yes, | we | do!", "Taip, | mes | turime!", "Taip, turime!", { flags: { 2: "“do” (elliptical): Lithuanian repeats the verb, turime." } }),
      t("Sure | do!", "Žinoma, | turime!", "Žinoma, turime!"),
    ],
    have_no: [
      t("Sorry, | we | don't have | that.", "Atsiprašau, | mes | neturime | to.", "Atsiprašau, to neturime."),
    ],
    unknown_order: [
      t("Hmm, | sorry, | we | don't have | that | here.", "Hmm, | atsiprašau, | mes | neturime | to | čia.", "Hmm, atsiprašau, to neturime."),
    ],
    wifi: [
      t("Yes! | The | password | is | sunnycup22.", "Taip! | — | Slaptažodis | yra | sunnycup22.", "Taip! Slaptažodis – sunnycup22.",
        { say: "Yes! The password is sunny cup two two.", spell: "sunnycup22", write: "Wi-Fi: SunnyCup · password: sunnycup22" }),
      t("Sure, | it's | free. | The | password | is | on | the | board: | sunnycup22.", "Žinoma, | jis yra | nemokamas. | — | Slaptažodis | yra | ant | — | lentos: | sunnycup22.", "Žinoma, jis nemokamas. Slaptažodis ant lentos: sunnycup22.",
        { say: "Sure, it's free. The password is on the board: sunny cup two two.", spell: "sunnycup22", write: "Wi-Fi: SunnyCup · password: sunnycup22" }),
    ],
    restroom: [
      t("It's | in the back, | on the left.", "Jis yra | gale, | kairėje.", "Gale, kairėje."),
      t("Right | over | there, | by | the | window.", "Tiesiai | — | ten, | prie | — | lango.", "Štai ten, prie lango.", { flags: { 1: "“over” (over there): no separate Lithuanian word; ten carries the direction." } }),
    ],
    water: [
      t("Sure! | Here's | a | glass | of water.", "Žinoma! | Štai | — | stiklinė | vandens.", "Žinoma! Štai stiklinė vandens."),
    ],
    sugar: [
      t("The | sugar | is | on | the | counter | by | the | window.", "— | Cukrus | yra | ant | — | prekystalio | prie | — | lango.", "Cukrus – ant prekystalio prie lango."),
    ],
    reject_ok: [
      t("No | problem! | What | would | you | like | instead?", "Jokių | problemų! | Ko | — | jūs | norėtumėte | vietoj to?", "Jokių problemų! Ko norėtumėte vietoj to?", { flags: { 3: "“would”: the conditional ending of norėtumėte carries it." } }),
    ],
    removed: [
      t("Okay, | no | {X}.", "Gerai, | be | {X:gen}.", "Gerai, be {X:gen}."),
    ],
    changed: [
      t("Sure, | no | problem.", "Žinoma, | jokių | problemų.", "Žinoma, jokių problemų."),
      t("Okay, | I | changed | it.", "Gerai, | aš | pakeičiau | tai.", "Gerai, pakeičiau."),
    ],
    out_of_oat: [
      t("Oh, | sorry, | we're out of | oat | milk | today.", "O, | atsiprašau, | mums baigėsi | avižų | pienas | šiandien.", "O, atsiprašau, šiandien baigėsi avižų pienas."),
    ],
    offer_alt_milk: [
      t("Would | almond | or | soy | milk | be okay?", "Ar | migdolų | ar | sojų | pienas | tiktų?", "Ar tiktų migdolų ar sojų pienas?", { flags: { 0: "“Would” in a question = the particle ar; the conditional sits on tiktų (linked to “be okay”)." } }),
    ],
    card_down: [
      t("Sorry, | our | card | machine | is down | right now.", "Atsiprašau, | mūsų | kortelių | aparatas | neveikia | šiuo metu.", "Atsiprašau, šiuo metu mūsų kortelių aparatas neveikia."),
    ],
    card_back: [
      t("Oh | wait, | it's working | again!", "O | palaukite, | jis veikia | vėl!", "O, palaukite, jis vėl veikia!"),
    ],
    ask_warm: [
      t("Would | you | like | it | warmed up?", "Ar | jūs | norėtumėte | jį | pašildytą?", "Ar pašildyti?", { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte." } }),
    ],
    bag: [
      t("Sure, | here you go.", "Žinoma, | prašom.", "Žinoma, prašom."),
    ],
  },

  domains: {
    price: () => {
      const s = new Set<number>();
      for (let c = 200; c <= 4000; c += 25) s.add(c);
      return [...s];
    },
  },

  hints: {
    order_drink: {
      lt: "Užsisakyti gėrimą", slot: "drink", examples: ["latte", "cappuccino", "americano", "hot_chocolate"],
      items: [
        { id: "ill_have", s: t("I'll have | {X.np}.", "Imsiu | {X.np:acc}.", "Imsiu {X.np:acc}.") },
        { id: "id_like", s: t("I'd like | {X.np}, | please.", "Norėčiau | {X.np:gen}, | prašau.", "Norėčiau {X.np:gen}, prašau.") },
        { id: "could_i_have", s: t("Could | I | have | {X.np}, | please?", "Ar galėčiau | aš | gauti | {X.np:acc}, | prašau?", "Ar galėčiau gauti {X.np:acc}?") },
        { id: "can_i_get", s: t("Can | I | get | {X.np}?", "Ar galiu | aš | gauti | {X.np:acc}?", "Ar galiu gauti {X.np:acc}?"), register: "casual" },
        { id: "please_only", s: t("{X.np}, | please.", "{X.np:acc}, | prašau.", "{X.np:acc}, prašau.") },
        { id: "may_i_have", s: t("May | I | have | {X.np}?", "Ar galėčiau | aš | gauti | {X.np:acc}?", "Ar galėčiau gauti {X.np:acc}?"), register: "polite",
          note: "Labai mandagu." },
        { id: "ill_get", s: t("I'll get | {X.np}.", "Paimsiu | {X.np:acc}.", "Paimsiu {X.np:acc}."), register: "casual" },
        { id: "go_with", s: t("I'll go with | {X.np}.", "Rinksiuosi | {X.np:acc}.", "Rinksiuosi {X.np:acc}."), register: "casual" },
        { id: "cup_of", s: t("I'd like | a | cup | of {X}, | please.", "Norėčiau | — | puodelio | {X:gen}, | prašau.", "Norėčiau puodelio {X:gen}, prašau."),
          only: (e) => !!e.attrs?.cup && !e.en.includes(" | ") },
        { id: "let_me_get", s: t("Let me get | {X.np}.", "Paimsiu | {X.np:acc}.", "Paimsiu {X.np:acc}."), register: "casual" },
        { id: "think_ill", s: t("I | think | I'll have | {X.np}.", "Aš | manau, | imsiu | {X.np:acc}.", "Manau, imsiu {X.np:acc}.") },
      ],
    },
    order_food: {
      lt: "Užsisakyti ką nors užkąsti", slot: "food", examples: ["croissant", "blueberry_muffin", "cinnamon_roll"],
      items: [
        { id: "food_also", s: t("Can | I | also | get | {X.np}?", "Ar galiu | aš | taip pat | gauti | {X.np:acc}?", "Ar galiu dar gauti {X.np:acc}?") },
        { id: "food_and", s: t("And | {X.np}, | please.", "Ir | {X.np:acc}, | prašau.", "Ir {X.np:acc}, prašau.") },
        { id: "food_id_also", s: t("I'd | also | like | {X.np}.", "Aš | taip pat | norėčiau | {X.np:gen}.", "Dar norėčiau {X.np:gen}.",
          { flags: { 0: "“'d” (would) is carried by the conditional ending of norėčiau (linked to “like”)." } }) },
        { id: "food_too", s: t("Could | I | get | {X.np} | too?", "Ar galėčiau | aš | gauti | {X.np:acc} | irgi?", "Ar galėčiau gauti ir {X.np:acc}?") },
        { id: "food_as_well", s: t("{X.np} | as well, | please.", "{X.np:acc} | taip pat, | prašau.", "Ir {X.np:acc}, prašau.") },
        { id: "ill_have", s: t("I'll have | {X.np}.", "Imsiu | {X.np:acc}.", "Imsiu {X.np:acc}.") },
      ],
    },
    size: {
      lt: "Pasirinkti dydį", slot: "size", examples: ["large", "medium", "small"],
      items: [
        { id: "size_please", s: t("{X}, | please.", "{X:acc}, | prašau.", "{X:acc}, prašau.") },
        { id: "size_a", s: t("A | {X}, | please.", "— | {X:acc}, | prašau.", "{X:acc}, prašau.") },
        { id: "size_fine", s: t("{X} | is fine.", "{X:nom} | tinka.", "{X:nom} tinka.") },
        { id: "size_ill_have", s: t("I'll have | a | {X}.", "Imsiu | — | {X:acc}.", "Imsiu {X:acc}.") },
        { id: "make_it", s: t("Make | it | a | {X}.", "Padarykite | jį | — | {X:acc}.", "Tegul būna {X:nom}."), register: "casual" },
        { id: "q_sizes", s: t("What | sizes | do | you | have?", "Kokių | dydžių | — | jūs | turite?", "Kokių dydžių turite?", { flags: { 2: "Question “do” has no Lithuanian word (linked to “have”)." } }) },
      ],
    },
    milk: {
      lt: "Pasirinkti pieną", slot: "milk", examples: ["oat", "whole", "almond"],
      items: [
        { id: "milk_please", s: t("{X}, | please.", "{X:acc}, | prašau.", "{X:acc}, prašau.") },
        { id: "milk_with", s: t("With | {X}, | please.", "Su | {X:ins}, | prašau.", "Su {X:ins}, prašau.") },
        { id: "milk_can", s: t("Can | I | get | {X}?", "Ar galiu | aš | gauti | {X:gen}?", "Ar galima {X:gen}?") },
        { id: "q_have", s: t("Do | you | have | {X}?", "Ar | jūs | turite | {X:gen}?", "Ar turite {X:gen}?", { flags: { 0: "Question “Do” = the particle ar." } }) },
        { id: "milk_none", s: t("No | milk, | thanks.", "Be | pieno, | ačiū.", "Be pieno, ačiū.") },
        { id: "milk_regular", s: t("Just | regular | milk.", "Tiesiog | paprastą | pieną.", "Tiesiog paprastą pieną.") },
      ],
    },
    temp: {
      lt: "Karštą ar su ledu", slot: "temp", examples: ["hot", "iced"],
      items: [
        { id: "temp_please", s: t("{X}, | please.", "{X:acc}, | prašau.", "{X:acc}, prašau.") },
        { id: "temp_make", s: t("Make | it | {X}, | please.", "Padarykite | jį | {X:acc}, | prašau.", "Tegul būna {X:nom}, prašau."), register: "casual" },
      ],
    },
    dine: {
      lt: "Pasakyti: čia ar išsinešti",
      items: [
        { id: "dine_short", s: t("For here, | please.", "Čia, | prašau.", "Čia, prašau.") },
        { id: "dine_short", s: t("To go, | please.", "Išsinešti, | prašau.", "Išsinešti, prašau.") },
        { id: "dine_its", s: t("It's | to go.", "Tai yra | išsinešti.", "Išsinešiu.") },
        { id: "dine_have_here", s: t("I'll have | it | here.", "Išgersiu | tai | čia.", "Išgersiu čia.") },
        { id: "dine_take", s: t("I'll take | it | to go.", "Pasiimsiu | tai | išsinešti.", "Pasiimsiu su savimi.") },
        { id: "dine_can", s: t("Can | I | get | it | to go?", "Ar galiu | aš | gauti | tai | išsinešti?", "Ar galiu išsinešti?") },
      ],
    },
    more: {
      lt: "Pasakyti, kad tai viskas",
      items: [
        { id: "more_all", s: t("That's | all, | thanks.", "Tai yra | viskas, | ačiū.", "Tai viskas, ačiū.") },
        { id: "more_its", s: t("No, | that's | it.", "Ne, | tai yra | viskas.", "Ne, tai viskas.") },
        { id: "more_nothing", s: t("Nothing | else, | thanks.", "Nieko | daugiau, | ačiū.", "Nieko daugiau, ačiū.") },
        { id: "more_good", s: t("I'm | good, | thanks.", "Man | užtenka, | ačiū.", "Man užtenka, ačiū."), note: "„I'm good“ čia reiškia mandagų „ne, ačiū“." },
      ],
    },
    name: {
      lt: "Pasakyti savo vardą",
      items: [
        { id: "name_its", s: t("It's | {$name}.", "Tai | {$name}.", "{$name}.") },
        { id: "name_mine", s: t("My | name | is | {$name}.", "Mano | vardas | yra | {$name}.", "Mano vardas – {$name}.") },
      ],
    },
    pay: {
      lt: "Susimokėti",
      items: [
        { id: "pay_card", s: t("Can | I | pay | by card?", "Ar galiu | aš | sumokėti | kortele?", "Ar galiu sumokėti kortele?") },
        { id: "pay_card_short", s: t("Card, | please.", "Kortele, | prašau.", "Kortele, prašau.") },
        { id: "pay_cash", s: t("I'll pay | in cash.", "Sumokėsiu | grynaisiais.", "Sumokėsiu grynaisiais.") },
        { id: "here_you_go", s: t("Here you go.", "Prašom.", "Prašom.") },
        { id: "apple_pay", s: t("Do | you | take | Apple Pay?", "Ar | jūs | priimate | „Apple Pay“?", "Ar priimate „Apple Pay“?", { flags: { 0: "Question “Do” = the particle ar." } }) },
        { id: "keep_change", s: t("Keep | the | change.", "Pasilikite | — | grąžą.", "Grąžos nereikia.") },
      ],
    },
    ask: {
      lt: "Paklausti apie meniu ir kavinę",
      items: [
        { id: "q_recommend", s: t("What | do | you | recommend?", "Ką | — | jūs | rekomenduojate?", "Ką rekomenduojate?", { flags: { 1: "Question “do” has no Lithuanian word (linked to “recommend”)." } }) },
        { id: "q_kinds", s: t("What | kinds | of coffee | do | you | have?", "Kokių | rūšių | kavos | — | jūs | turite?", "Kokios kavos turite?", { flags: { 3: "Question “do” has no Lithuanian word (linked to “have”)." } }) },
        { id: "q_menu", s: t("What | do | you | have?", "Ką | — | jūs | turite?", "Ką turite?", { flags: { 1: "Question “do” has no Lithuanian word (linked to “have”)." } }) },
        { id: "q_wifi", s: t("Do | you | have | Wi-Fi?", "Ar | jūs | turite | „Wi-Fi“?", "Ar turite „Wi-Fi“?", { flags: { 0: "Question “Do” = the particle ar." } }) },
        { id: "q_password", s: t("What's | the | Wi-Fi | password?", "Koks yra | — | „Wi-Fi“ | slaptažodis?", "Koks „Wi-Fi“ slaptažodis?") },
        { id: "q_restroom", s: t("Where's | the | restroom?", "Kur yra | — | tualetas?", "Kur yra tualetas?") },
        { id: "q_water", s: t("Could | I | get | some | water?", "Ar galėčiau | aš | gauti | — | vandens?", "Ar galėčiau gauti vandens?",
          { flags: { 3: "Partitive: the genitive vandens carries “some”." } }) },
      ],
    },
    ask_price: {
      lt: "Paklausti kainos", slot: "drink", examples: ["latte", "cappuccino"],
      items: [
        { id: "q_price", s: t("How much | is | {X.np}?", "Kiek | kainuoja | {X.np:nom}?", "Kiek kainuoja {X.np:nom}?") },
        { id: "q_price2", s: t("How much | does | {X.np} | cost?", "Kiek | — | {X.np:nom} | kainuoja?", "Kiek kainuoja {X.np:nom}?", { flags: { 1: "Question “does” has no Lithuanian word (linked to “cost”)." } }) },
      ],
    },
  },

  tips: {
    uk_takeaway: { key: "uk_takeaway", lt: "Suprasta! Amerikoje dažniau sakoma „to go“ (išsinešti), o „for here“ – čia.", better: "To go, please." },
    uk_eatin: { key: "uk_eatin", lt: "Suprasta! Amerikoje dažniau sakoma „for here“ (čia).", better: "For here, please." },
    us_restroom: { key: "us_restroom", lt: "Suprasta! Amerikoje mandagiau sakyti „restroom“ arba „bathroom“.", better: "Where's the restroom?" },
  },

  // -------------------------------------------------------------------------

  mission: [
    { step: "order", lt: "Užsisakyk gėrimą" },
    { step: "kind", lt: "Pasakyk, kokios kavos", optional: true },
    { step: "size", lt: "Pasirink dydį", optional: true },
    { step: "milk", lt: "Pasirink pieną", optional: true },
    { step: "temp", lt: "Karšta ar su ledu?", optional: true },
    { step: "warm", lt: "Pašildyti ar ne?", optional: true },
    { step: "more", lt: "Baik užsakymą (užkandis – jei nori)" },
    { step: "dine", lt: "Čia ar išsinešti?" },
    { step: "name", lt: "Pasakyk savo vardą", optional: true },
    { step: "pay", lt: "Susimokėk" },
  ],
  steps: [
    { id: "order", done: (c) => items(c).length > 0, ask: (c) => c.say("ask_order"),
      // "reject" too, so "No coffee for me" is read as a whole (not as "no" + an order)
      expects: ["order", "reject"],
      suggest: [
        { lt: "Užsisakyti kavos ar kito gėrimo", hint: "order_drink", options: "drink" },
        { lt: "Užsisakyti ką nors užkąsti", hint: "order_food", options: "food" },
        { lt: "Paklausti, ką jie turi ar ką rekomenduoja", hint: "ask" },
        { lt: "Paklausti, kiek kainuoja", hint: "ask_price", options: "drink" },
      ],
      help: (c) => { c.say("menu_line"); c.say("ask_order"); } },
    { id: "kind", when: (c) => items(c).some((i) => generic(i)), done: () => false,
      ask: (c) => {
        const g = generic(items(c).find((i) => generic(i))!);
        if (g === "coffee") { c.say("ask_kind_coffee"); if (c.chance(0.6)) c.say("coffee_list"); }
        else if (g === "tea") c.say("ask_kind_tea");
        else c.say("ask_kind_muffin");
      },
      expects: ["order"],
      suggest: [{ lt: "Pasirinkti rūšį", hint: "order_drink", options: ["latte", "cappuccino", "americano", "drip_coffee", "black_tea", "green_tea", "mint_tea", "chamomile_tea", "blueberry_muffin", "chocolate_muffin"] }],
      help: (c) => { c.say("coffee_list"); } },
    { id: "size", when: (c) => drinks(c).some((d) => byId(d.id).attrs?.sized && !d.size && !generic(d)), done: () => false,
      ask: (c) => c.say("ask_size"), expects: ["size_ans", "order"],
      suggest: [{ lt: "Pasirinkti dydį", hint: "size", options: "size" }, { lt: "Paklausti kainos", hint: "ask_price", options: "drink" }],
      help: (c) => { c.say("size_list"); } },
    { id: "milk", when: (c) => c.s.askMilk && drinks(c).some((d) => byId(d.id).attrs?.milky && !d.milk && !d.noMilk && !generic(d)), done: () => false,
      ask: (c) => {
        if (c.chance(0.3)) {
          c.say("ask_whole_ok");
          c.expect({ id: "whole_ok", expects: ["milk_ans"], hints: ["milk"], suggest: [{ lt: "Sutikti arba pasirinkti kitą pieną", hint: "milk", options: "milk" }],
            yes: (cc) => { applyDetail(cc, "milk", "whole"); },
            no: (cc) => { cc.say("milk_list"); cc.ask("milk"); },
            on: { milk_ans: (cc, sl, seg) => { cafe.handlers.milk_ans(cc, sl, seg); } },
            ask: (cc) => cc.say("ask_whole_ok") });
        } else c.say("ask_milk");
      },
      expects: ["milk_ans"],
      suggest: [{ lt: "Pasirinkti pieną (arba be pieno)", hint: "milk", options: "milk" }],
      help: (c) => { c.say("milk_list"); } },
    { id: "temp", when: (c) => c.s.askTemp && drinks(c).some((d) => byId(d.id).attrs?.iced && !d.temp && !generic(d)), done: () => false,
      ask: (c) => c.say("ask_temp"), expects: ["temp_ans"],
      suggest: [{ lt: "Karštą ar su ledu", hint: "temp", options: "temp" }] },
    { id: "warm", when: (c) => items(c).some((i) => i.id === "sandwich") && c.s.warm === undefined, done: () => false,
      ask: (c) => {
        c.say("ask_warm");
        c.expect({ id: "warm", hints: ["g_yesno"], yes: (cc) => { cc.s.warm = true; cc.say("ack"); }, no: (cc) => { cc.s.warm = false; cc.say("ack"); }, ask: (cc) => cc.say("ask_warm") });
      } },
    { id: "more", when: (c) => items(c).length > 0, done: (c) => !!c.s.moreDone,
      ask: (c) => c.say(!foods(c).length && c.chance(0.5) ? "ask_food_more" : "ask_more"), expects: ["more_no", "order", "more_yes", "want_food"],
      suggest: [{ lt: "Pasakyti, kad tai viskas", hint: "more" }, { lt: "Užsisakyti dar ką nors", hint: "order_food", options: "food" }],
      yes: (c) => { c.say("ask_what_else"); c.hold(); },
      no: (c) => { c.s.moreDone = true; } },
    { id: "dine", done: (c) => !!c.s.dine, ask: (c) => c.say("ask_dine"), expects: ["dine_ans"],
      suggest: [{ lt: "Pasakyti, ar gersi čia, ar išsineši", hint: "dine" }] },
    { id: "name", when: (c) => c.s.dine === "togo" && c.s.askName, done: (c) => !!c.s.name,
      ask: (c) => c.say("ask_name"), expects: ["name_ctx"],
      suggest: [{ lt: "Pasakyti savo vardą", hint: "name" }] },
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
      suggest: [{ lt: "Susimokėti kortele, grynaisiais ar telefonu", hint: "pay" }] },
    { id: "receipt", when: (c) => c.s.askReceipt, done: (c) => c.s.receipt !== undefined,
      ask: (c) => c.say("ask_receipt"), expects: ["no_receipt", "no_receipt_ctx", "want_receipt", "receipt_yes_ctx"],
      suggest: [{ lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
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
        suggest: [{ lt: "Sutikti (taip) arba užsisakyti ką kita", hint: "order_drink", options: "drink" }],
        yes: (cc) => { items(cc).push({ ...last, qty: 1 }); cc.say("ack_order"); },
        no: (cc) => { cc.say("ask_order"); cc.hold(); },
        ask: (cc) => cc.say("usual", { X: np(last) }),
      });
      return;
    }
    if (c.chance(0.4)) {
      c.say("greet_howareyou");
      expectHowAreYou(c); // after the small talk the order step asks "What can I get you?" (once)
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
      // Out of oat milk (twist)
      const oat = list.find((i) => i.milk === "oat");
      const fixed = addItems(c, list, [...seg.tags, ...toArr(slots.items?.item).flatMap((x: any) => x.__tags || [])]);
      if (fixed) c.say("changed");
      if (oat && c.s.outOfOat) {
        c.twist("out_of_oat");
        const d = items(c).find((i) => i.milk === "oat");
        if (d) d.milk = undefined;
        c.say("out_of_oat"); c.say("offer_alt_milk");
        c.expect({ id: "alt_milk", expects: ["milk_ans"], hints: ["milk"], suggest: [{ lt: "Pasirinkti kitą pieną", hint: "milk", options: ["almond", "soy", "whole"] }],
          yes: (cc) => { applyDetail(cc, "milk", "almond"); cc.say("ack"); },
          no: (cc) => { cc.say("ask_milk"); cc.ask("milk"); },
          on: { milk_ans: (cc, sl, sg) => { cafe.handlers.milk_ans(cc, sl, sg); } },
          ask: (cc) => cc.say("offer_alt_milk") });
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
      // "Black" to "What kind of coffee?": a black drip coffee
      if (seg.tags.includes("nomilk") && c.step === "kind") { const g = drinks(c).find((d) => d.id === "coffee"); if (g) { g.id = "drip_coffee"; g.noMilk = true; return; } }
      if (seg.tags.includes("nomilk")) { applyDetail(c, "milk", null, { noMilk: true }); return; }
      let m = slots.milk as string | undefined;
      if (!m && seg.tags.includes("regular")) m = "whole";
      if (m === "oat" && c.s.outOfOat) { c.say("out_of_oat"); c.say("offer_alt_milk"); c.hold(); return; }
      applyDetail(c, "milk", m ?? "whole");
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
      if (c.s.paid) { c.say("paid"); return; } // already paid: no second change
      c.say("cash_ok"); c.s.payMethod = "cash";
      if (c.s.totalSaid) { c.s.paid = true; c.event("pay", { method: "cash" }); c.say("change_back"); }
    },
    here_you_go(c) {
      if (!c.s.totalSaid) { c.say("no_problem"); return; }
      if (c.s.paid) { c.say("paid"); return; } // "Cash" already paid: just thanks, no second change
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
        // at the paying step this answers it: don't say the total a second time
        if (c.step === "pay") { c.s.totalSaid = true; c.hold(); }
        return;
      }
      c.say("which_item"); c.hold();
    },
    ask_menu(c, _slots, seg) {
      const txt = c.heard.toLowerCase();
      if (/size/.test(txt)) c.say("size_list");
      else if (/milk/.test(txt)) c.say("milk_list");
      else if (/tea/.test(txt)) c.say("ask_kind_tea");
      // asked about food, or "What do you have?" right after "Anything to eat with that?": the food, then a question
      else if (/pastr|food|eat/.test(txt) || c.step === "more") { c.say("food_list"); c.say("food_pick"); c.hold(); }
      else if (/coffee/.test(txt)) c.say("coffee_list");
      else c.say("menu_line");
    },
    ask_recommend(c) { c.say(/\b(eat|food|hungry|snack|pastr)/i.test(c.heard) ? "rec_food" : "recommend"); },
    want_food(c) { c.say("food_menu"); c.say(items(c).length ? "food_pick" : "ask_order"); c.hold(); },
    order_partial(c, slots, seg) {
      // "A hot chocolate and a burger": say no to the unknown part, take the rest
      c.say("unknown_order");
      cafe.handlers.order(c, slots, seg);
    },
    ask_have(c, slots) {
      const thing = slots.thing || {};
      if (thing.drink || thing.food || thing.milk || (thing.__tags || []).some((x: string) => ["decaf", "sugar", "wifi"].includes(x))) {
        if (thing.milk === "oat" && c.s.outOfOat) { c.say("out_of_oat"); return; }
        if ((thing.__tags || []).includes("wifi")) { c.say("wifi"); return; }
        c.say("have_yes");
      } else c.say("have_no");
    },
    ask_have_unknown(c) { c.say("have_no"); c.say("menu_line"); },
    ask_wifi(c) { c.say("wifi"); },
    ask_restroom(c) { c.say("restroom"); },
    ask_water(c) { c.say("water"); c.event("give", { item: "water" }); },
    ask_sugar(c) { c.say("sugar"); },
    change(c, slots) {
      const it = fromSlot(slots.item);
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
      const [wrong, right] = toArr(slots.item).map(fromSlot) as Item[];
      const txt = c.heard.toLowerCase();
      // "no, a latte, not a cappuccino": the first item is the right one
      const [bad, good] = /^\s*(no[, ]+)?not\b/.test(txt) || /\bi said\b/.test(txt) ? [wrong, right] : [right, wrong];
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
  },

  finish: (c) => {
    c.complete();
    if (drinks(c)[0]) c.remember({ lastDrink: drinks(c)[0] });
    c.say(c.s.dine === "here" ? "closing_here" : "closing_togo");
    c.event("serve", { items: items(c), dine: c.s.dine });
    c.say("bye_after");
    c.expect({ id: "closing", optional: true, hints: ["g_social"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    { say: "How about an espresso", intent: "order", slots: { items: { item: { drink: "espresso" } } } },
    { say: "What do you suggest?", intent: "ask_recommend" },
    { say: "What do you recommend to eat?", intent: "ask_recommend" },
    { say: "Also I would like a bagel", intent: "order", slots: { items: { item: { food: "bagel" } } } },
    { say: "I would like to eat something", intent: "want_food" },
    { say: "Can I have something to eat?", intent: "want_food" },
    { say: "What about food?", intent: "want_food" },
    { say: "A hot chocolate and a burger", intent: "order_partial" },
    { say: "Okay, yes, what is there to eat?", intent: "want_food", step: "more" },
    { say: "What can I eat here?", intent: "want_food", step: "more" },
    { say: "Is there anything to eat?", intent: "want_food" },
    { say: "I don't want anything to eat", intent: "more_no", step: "more" },
    { say: "Hi, can I get a large latte with oat milk to go?", intent: "order", slots: { items: { item: { drink: "latte", size: "large", milk: "oat" } } } },
    { say: "A coffee, please.", intent: "order", slots: { items: { item: { drink: "coffee" } } } },
    { say: "I'd like a cup of tea", intent: "order", slots: { items: { item: { drink: "tea" } } } },
    { say: "I'll have a cappuccino", intent: "order", slots: { items: { item: { drink: "cappuccino" } } } },
    { say: "Could I have an americano, please?", intent: "order" },
    { say: "Let me get a flat white", intent: "order", slots: { items: { item: { drink: "flat_white" } } } },
    { say: "Two cappuccinos and a croissant", intent: "order" },
    { say: "I want a latte", intent: "order" },
    { say: "Cappuccino", intent: "order" },
    { say: "Just regular coffee", intent: "order", slots: { items: { item: { drink: "coffee", kind: "plain" } } } },
    { say: "Card", intent: "pay_card", step: "name" },
    { say: "I don't want a cappuccino", intent: "reject", not: ["order"] },
    { say: "No cappuccino", intent: "reject" },
    { say: "Not a cappuccino, a latte", intent: "correction" },
    { say: "To go, please.", intent: "dine_ans", step: "dine" },
    { say: "For here", intent: "dine_ans", step: "dine" },
    { say: "Take away please", intent: "dine_ans", step: "dine" },
    { say: "Large", intent: "size_ans", step: "size", slots: { size: "large" } },
    { say: "A medium, please", intent: "size_ans", step: "size" },
    { say: "Oat milk, please", intent: "milk_ans", step: "milk", slots: { milk: "oat" } },
    { say: "No milk", intent: "milk_ans", step: "milk" },
    { say: "Regular, please", intent: "milk_ans", step: "milk" },
    { say: "That's all, thanks", intent: "more_no", step: "more" },
    { say: "No, I'm good", intent: "more_no", step: "more" },
    { say: "Can I pay by card?", intent: "pay_card", step: "pay" },
    { say: "Here you go", intent: "here_you_go", step: "pay" },
    { say: "Do you have Wi-Fi?", intent: "ask_wifi" },
    { say: "Where's the restroom?", intent: "ask_restroom" },
    { say: "How much is a large latte?", intent: "ask_price" },
    { say: "What do you recommend?", intent: "ask_recommend" },
    { say: "Could you say that again?", intent: "g_repeat" },
    { say: "Could you speak more slowly, please?", intent: "g_slower" },
    { say: "latte machine is broken banana", intent: "none" },
    { say: "Tomas", intent: "none" },
    { say: "Tomas", intent: "name_ctx", step: "name" },
    { say: "Can I get a pizza?", intent: "order_unknown" },
    { say: "Do you have oat milk?", intent: "ask_have" },
    { say: "Good, thanks. And you? Can I get a latte?", intent: "g_howareyou_answer" },
    // more ways to say it (dev corpus tests/corpus/s72-cafe.json)
    { say: "I'm gonna go with a medium latte", intent: "order", slots: { items: { item: { drink: "latte", size: "medium" } } } },
    { say: "Let's do a cappuccino", intent: "order", slots: { items: { item: { drink: "cappuccino" } } } },
    { say: "I take a latte", intent: "order", slots: { items: { item: { drink: "latte" } } } },
    { say: "Is it possible to get a latte?", intent: "order" },
    { say: "Hot chocolate for my son and a latte for me", intent: "order" },
    { say: "A cappuccino with extra foam", intent: "order", not: ["order_partial"] },
    { say: "A black americano", intent: "order", slots: { items: { item: { drink: "americano" } } } },
    { say: "A black tea", intent: "order", slots: { items: { item: { drink: "black_tea" } } } },
    { say: "Latte in a big cup", intent: "order", slots: { items: { item: { drink: "latte", size: "large" } } } },
    { say: "A latte with vanilla syrup", intent: "order_partial" },
    { say: "No coffee for me", intent: "reject", step: "order", not: ["order"] },
    { say: "I don't drink coffee", intent: "reject", step: "order", not: ["order"] },
    { say: "The biggest one", intent: "size_ans", step: "size", slots: { size: "large" } },
    { say: "Small is enough", intent: "size_ans", step: "size", slots: { size: "small" } },
    { say: "Cow's milk", intent: "milk_ans", step: "milk", slots: { milk: "whole" } },
    { say: "Let's do almond", intent: "milk_ans", step: "milk", slots: { milk: "almond" } },
    { say: "With ice", intent: "temp_ans", step: "temp", slots: { temp: "iced" } },
    { say: "I'm not hungry, thanks", intent: "more_no", step: "more" },
    { say: "Maybe something sweet", intent: "want_food", step: "more" },
    { say: "To take with me", intent: "dine_ans", step: "dine" },
    { say: "I'll take it", intent: "dine_ans", step: "dine", not: ["order_unknown"] },
    { say: "I'm going to drink it here", intent: "dine_ans", step: "dine", not: ["order_unknown"] },
    { say: "Call me Tom", intent: "name_ctx", step: "name" },
    { say: "Is card okay?", intent: "pay_card", step: "pay" },
    { say: "Can I have a receipt?", intent: "want_receipt", step: "receipt", not: ["order_unknown"] },
    { say: "Yes, please, I need it", intent: "receipt_yes_ctx", step: "receipt", not: ["order_unknown"] },
    { say: "No, I don't need it", intent: "no_receipt_ctx", step: "receipt" },
    // learner English
    { say: "What cost latte?", intent: "ask_price" },
    { say: "I drink here", intent: "dine_ans", step: "dine" },
    { say: "Is enough, thank you", intent: "more_no", step: "more" },
    { say: "I want one latte big", intent: "order", slots: { items: { item: { drink: "latte", size: "large" } } } },
    { say: "I'll pay by credit card", intent: "pay_card", step: "pay" },
    { say: "I don't have cash", intent: "no_cash", step: "pay", not: ["pay_cash"] },
    { say: "No sugar, no milk", intent: "milk_ans", step: "milk" },
    { say: "A blueberry muffin would be nice", intent: "order", step: "more", slots: { items: { item: { food: "blueberry_muffin" } } } },
    // changing the number: "just one" after ordering two
    { say: "Actually, just one cappuccino", intent: "order", step: "more", slots: { items: { item: { drink: "cappuccino" } } } },
    { say: "Sorry, only one croissant", intent: "order", step: "more", slots: { items: { item: { food: "croissant" } } } },
    { say: "Actually, just one.", intent: "qty_one", step: "size" },
    { say: "I only need one", intent: "qty_one", step: "more" },
    { say: "Just one more thing", intent: "more_yes", step: "more", not: ["qty_one"] },
    { say: "Here's twenty", intent: "here_you_go", step: "pay" },
  ],

  sims: [
    { name: "full order, card", turns: ["Hi!", "Can I get a large latte with oat milk?", "To go, please", "That's all, thanks", "Card", "Thank you!"], expect: { complete: true }, auto: CAFE_AUTO },
    { name: "short answers", turns: ["A coffee, please.", "A latte", "Medium", "Whole milk", "Hot", "No, that's it", "For here", "Here you go", "Thanks, bye!"], expect: { complete: true }, auto: CAFE_AUTO },
    { name: "tea and a muffin, questions first", turns: ["What do you recommend?", "Do you have Wi-Fi?", "I'd like a cup of tea", "Green tea, please", "And a muffin", "Blueberry", "That's all", "To go", "It's Tomas", "Can I pay by card?", "No receipt, thanks", "Bye!"], expect: { complete: true }, auto: CAFE_AUTO },
    { name: "change of mind", turns: ["I'll have a cappuccino", "Actually, I don't want a cappuccino", "Could I have a mocha instead?", "Small", "Oat milk", "Iced", "Nothing else", "For here", "Cash", "Thanks!"], expect: { complete: true }, auto: CAFE_AUTO },
    { name: "two, then just one", turns: ["Two cappuccinos, please.", "Actually, just one cappuccino.", "That's all, thanks.", "For here.", "Cash.", "Thanks, bye!"], expect: { complete: true }, auto: CAFE_AUTO },
  ],
};

export default cafe;
