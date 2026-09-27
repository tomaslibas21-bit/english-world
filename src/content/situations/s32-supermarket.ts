// Song 32 "Unexpected Item" · Harbor Market, register four · cashier Marcus (formal: jūs).
// An American grocery checkout: "Did you find everything okay?", the loyalty (rewards) card or a lookup
// by phone number (or joining), a price check on the chips ("It's two for five": one bag is $4.49, two
// are $5, so the second one is almost free), bags (paper or plastic, ten cents each, or your own bag),
// the total, "Cash or card?", debit or credit, "Tap it here and enter your PIN", cash back, the receipt.
// Side questions: where things are (aisles), "Do you have…?", the restroom, an ATM.
// The basket is fixed: a gallon of milk $3.99, a loaf of bread $2.99, bananas $1.29, one bag of chips $4.49
// (+ a bottle of wine $8.99 in the ID twist). Groceries are not taxed. Bags are 10¢ each.
// Twists (visits ≥ 1): the self-checkout machine (speaker "sco", a recorded voice) says "Unexpected item
// in the bagging area. Please wait for assistance." and the learner calls Marcus, who fixes it and takes
// them to his register; wine in the basket: "Can I see your ID?" (no ID: the wine comes off).
// The price check is part of the core (always on the first visit, then on some visits); the learner can
// also bring it up at any time ("The chips are on sale, right?").

import type { Ctx, EntityDef, SituationDef, Tip } from "../types";
import { ent, t } from "../dsl";
import { expectHowAreYou } from "../global";

// ---------------------------------------------------------------------------
// Products the learner may ask about (where they are, "Do you have…?")

export const PRODUCTS: EntityDef[] = [
  ent("eggs", "eggs", "kiaušiniai/kiaušinių/kiaušiniams/kiaušinius/kiaušiniais/kiaušiniuose", "m", { art: "", chip: "kiaušiniai",
    forms: ["egg", "a dozen eggs", "dozen eggs", "carton of eggs", "a carton of eggs"], attrs: { loc: "dairy", enPl: true } }),
  ent("milk", "milk", "pienas/pieno/pienui/pieną/pienu/piene", "m", { art: "", forms: ["a gallon of milk", "gallon of milk", "whole milk", "skim milk", "oat milk", "almond milk", "soy milk", "lactose free milk"], attrs: { loc: "dairy" } }),
  ent("cheese", "cheese", "sūris/sūrio/sūriui/sūrį/sūriu/sūryje", "m", { art: "", forms: ["cheddar", "sliced cheese"], attrs: { loc: "dairy" } }),
  ent("butter", "butter", "sviestas/sviesto/sviestui/sviestą/sviestu/svieste", "m", { art: "", attrs: { loc: "dairy" } }),
  ent("yogurt", "yogurt", "jogurtas/jogurto/jogurtui/jogurtą/jogurtu/jogurte", "m", { art: "", forms: ["yoghurt", "yogurts"], attrs: { loc: "dairy" } }),
  ent("coffee", "coffee", "kava/kavos/kavai/kavą/kava/kavoje", "f", { art: "", forms: ["ground coffee", "coffee beans"], attrs: { loc: "a4" } }),
  ent("tea", "tea", "arbata/arbatos/arbatai/arbatą/arbata/arbatoje", "f", { art: "", forms: ["tea bags", "green tea", "black tea"], attrs: { loc: "a4" } }),
  ent("rice", "rice", "ryžiai/ryžių/ryžiams/ryžius/ryžiais/ryžiuose", "m", { art: "", attrs: { loc: "a3" } }),
  ent("pasta", "pasta", "makaronai/makaronų/makaronams/makaronus/makaronais/makaronuose", "m", { art: "", forms: ["spaghetti", "noodles"], attrs: { loc: "a3" } }),
  ent("water", "water", "vanduo/vandens/vandeniui/vandenį/vandeniu/vandenyje", "m", { art: "", forms: ["bottled water", "sparkling water", "a bottle of water"], attrs: { loc: "a5" } }),
  ent("juice", "juice", "sultys/sulčių/sultims/sultis/sultimis/sultyse", "f", { art: "", forms: ["orange juice", "apple juice", "soda", "soft drinks", "drinks"], attrs: { loc: "a5" } }),
  ent("snacks", "snacks", "užkandžiai/užkandžių/užkandžiams/užkandžius/užkandžiais/užkandžiuose", "m", { art: "", chip: "užkandžiai",
    forms: ["snack", "chips", "potato chips", "crisps", "cookies", "crackers"], attrs: { loc: "a5", enPl: true } }),
  ent("bread", "bread", "duona/duonos/duonai/duoną/duona/duonoje", "f", { art: "", forms: ["a loaf of bread", "loaf of bread", "the bakery", "bakery", "rolls", "bagels"], attrs: { loc: "front" } }),
  ent("fruit", "fruit", "vaisiai/vaisių/vaisiams/vaisius/vaisiais/vaisiuose", "m", { art: "", chip: "vaisiai",
    forms: ["fruits", "apples", "bananas", "oranges", "grapes", "produce", "strawberries"], attrs: { loc: "front" } }),
  ent("vegetables", "vegetables", "daržovės/daržovių/daržovėms/daržoves/daržovėmis/daržovėse", "f", { art: "", chip: "daržovės",
    forms: ["vegetable", "veggies", "tomatoes", "potatoes", "salad", "lettuce", "onions", "carrots"], attrs: { loc: "front", enPl: true } }),
  ent("toilet_paper", "toilet | paper", "tualetinis/tualetinio/tualetiniam/tualetinį/tualetiniu/tualetiniame | popierius/popieriaus/popieriui/popierių/popieriumi/popieriuje", "m",
    { art: "", forms: ["paper towels", "tissues", "toilet roll"], attrs: { loc: "a9" } }),
  ent("wine", "wine", "vynas/vyno/vynui/vyną/vynu/vyne", "m", { art: "", forms: ["beer", "alcohol", "red wine", "white wine"], attrs: { loc: "a11" } }),
];

const LOC_LINE: Record<string, string> = { dairy: "loc_dairy", a4: "loc_a4", a3: "loc_a3", a5: "loc_a5", a9: "loc_a9", front: "loc_front", a11: "loc_a11" };
const productById = (id: string) => PRODUCTS.find((e) => e.id === id);

// ---------------------------------------------------------------------------
// The basket (cents)

const BASE = 399 + 299 + 129; // a gallon of milk, a loaf of bread, bananas
const CHIPS_ONE = 449;
const CHIPS_TWO = 500; // "two for five"
const WINE = 899;
const BAG = 10;
const chipsCost = (n: number) => (n >= 2 ? CHIPS_TWO : n === 1 ? CHIPS_ONE : 0);
const total = (c: Ctx) => BASE + chipsCost(c.s.chips ?? 1) + (c.s.wine ? WINE : 0) + (c.s.bags ?? 0) * BAG;
/** Every total the basket can come to (chips 0/1/2, wine or not, 0–3 bags). */
const TOTALS = (() => {
  const s = new Set<number>();
  for (const ch of [0, 1, 2]) for (const w of [0, 1]) for (let b = 0; b <= 3; b++) s.add(BASE + chipsCost(ch) + w * WINE + b * BAG);
  return [...s].sort((a, b) => a - b);
})();
/** Money a customer typically hands over for a total: the next dollar, the next five, a 10, 20, 50 or 100. */
const tenders = (t: number) => [...new Set([Math.ceil(t / 100) * 100, Math.ceil(t / 500) * 500, 1000, 2000, 5000, 10000])].filter((x) => x > t);
/** The change Marcus says aloud (recorded); any other amount gets "here's your change" without the sum. */
const CHANGES = [...new Set(TOTALS.flatMap((t) => tenders(t).map((x) => x - t)))].sort((a, b) => a - b);
const CHANGE_SET = new Set(CHANGES);
/** "Out of twenty": said when a common bill is handed over. */
const BILL_LINE: Record<number, string> = { 1000: "out_of_10", 2000: "out_of_20", 5000: "out_of_50", 10000: "out_of_100" };

const FLAG_DO = "Question “Do” = the particle ar.";
const FLAG_WOULD = "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte.";
const FLAG_TAKE_OFF = "Discontinuous “take … off”: the prefix iš- of išimsiu carries “off” (linked to “I'll take”).";

const TIPS: Record<string, Tip> = {
  uk_crisps: { key: "uk_crisps", lt: "Suprasta! Amerikoje traškučiai – „chips“.", better: "I think the chips are on sale." },
  uk_carrier: { key: "uk_carrier", lt: "Suprasta! Amerikoje sakoma tiesiog „bag“ (maišelis).", better: "Can I get a bag, please?" },
  us_restroom: { key: "us_restroom", lt: "Suprasta! Amerikoje mandagiau sakyti „restroom“.", better: "Where's the restroom?" },
  uk_cashpoint: { key: "uk_cashpoint", lt: "Suprasta! Amerikoje bankomatas – „ATM“.", better: "Is there an ATM here?" },
  uk_till: { key: "uk_till", lt: "Suprasta! Amerikoje kasa – „register“ arba „checkout“.", better: "The machine isn't working." },
  uk_offer: { key: "uk_offer", lt: "Suprasta! Amerikoje sakoma „on sale“ (su nuolaida).", better: "I think they're on sale." },
};

// Automatic answers the simulation uses when Marcus (or the machine) asks an optional question.
const AUTO: Record<string, string> = {
  sco: "Excuse me! The machine says unexpected item in the bagging area.", sco_explain: "It says unexpected item in the bagging area.",
  find: "Yes, thanks.", missing: "The eggs.", rewards: "No, I don't have one.", join: "No, thanks.", phone: "It's 555-0142.",
  id: "Sure, here you go.", price: "I think they're on sale.", second: "Sure, I'll take another one.",
  bags: "Paper, please.", bag_kind: "Paper, please.", pay: "Card, please.", debit: "Debit, please.", cashback: "No, thanks.",
  cb_amount: "Twenty dollars, please.", charge: "Okay.", cash: "Here you go.", receipt: "Yes, please.",
};
const omit = (o: Record<string, string>, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

// ---------------------------------------------------------------------------
// Helpers

/** The self-checkout machine speaks (its own recorded voice), then Marcus is the speaker again. */
function machine(c: Ctx, line: string) { c.speaker("sco"); c.say(line); c.speaker("marcus"); }

/** Something changed the total after Marcus said it: he says the new total. */
function changed(c: Ctx) { if (c.s.totalSaid && !c.s.paid) c.s.totalSaid = false; }

/** Ask the next unfinished step right away (after a handler that held the turn). */
function chain(c: Ctx) {
  const st = supermarket.steps.find((x) => (!x.when || x.when(c)) && !x.done(c));
  if (st) c.ask(st.id);
}

function fixSco(c: Ctx, tags: string[] = []) {
  if (c.s.scoFixed) return;
  c.s.scoFixed = true;
  if (tags.includes("bag")) c.s.scoCause = "bag";
  if (!c.s.scoCalled) c.say("sco_look");
  if (c.s.scoCause === "bag") { c.say("sco_fix_bag"); c.s.ownBag = true; }
  else { c.say("sco_fix_glitch"); c.say("sco_fixed"); }
  if (c.s.scoAgain) { machine(c, "sco_unexpected"); c.say("sco_come_on"); }
  c.say("sco_come_over");
}

function sayWhere(c: Ctx, id: string | undefined) {
  const p = id ? productById(id) : undefined;
  if (!p) { c.say("where_unknown"); return; }
  c.say(LOC_LINE[p.attrs?.loc as string] ?? "where_unknown");
}

function rewardsNo(c: Ctx) {
  if (c.s.rewards !== undefined && c.s.rewards !== "lookup") return;
  c.s.rewards = "none";
  c.s.phoneFor = undefined;
  if (!c.s.joinOffer) c.say("rewards_no_ok");
}

function lookup(c: Ctx) {
  if (c.s.rewards === "card" || c.s.rewards === "app" || c.s.rewards === "phone" || c.s.rewards === "joined") { c.say("ack"); return; }
  c.s.rewards = "lookup";
  c.s.phoneFor = "lookup";
  c.s.phoneSkip = false;
}

function idShown(c: Ctx) {
  if (!c.s.wine || c.s.idDone) { c.say("ack"); return; }
  c.s.idDone = true;
  c.say("id_thanks");
}
function idNone(c: Ctx) {
  if (!c.s.wine || c.s.idDone) { c.say("ack"); return; }
  c.s.idDone = true;
  c.s.wine = false;
  changed(c);
  c.say("id_none_remove");
}

function priceCheck(c: Ctx, claimed: boolean) {
  if (c.s.paid || !c.s.chips) { c.say("chips_price_sale"); return; }
  if (c.s.checked) { c.say("chips_price_sale"); return; }
  c.s.checked = true;
  c.s.priceDone = true;
  c.twist("price_check");
  c.say("price_check_start");
  c.say("price_phone");
  c.say(claimed ? "price_result_right" : "price_result");
  if (c.s.chips === 1) { c.say("price_explain"); c.ask("second"); }
}
function priceAccept(c: Ctx) {
  if (c.s.priceDone) { c.say("ack"); return; }
  c.s.priceDone = true;
  c.say("price_ok_ack");
}

function bagKindFrom(tags: string[]): string | undefined {
  return tags.includes("paper") ? "paper" : tags.includes("plastic") ? "plastic" : tags.includes("either") ? "paper" : undefined;
}

/** The money has been handed over (`tendered`: the amount, when the learner said it). */
function paidCash(c: Ctx, tendered?: number) {
  if (c.s.paid) return;
  const due = total(c);
  c.s.paid = true;
  c.s.method = "cash";
  c.complete();
  c.event("pay", { method: "cash", amount: due, tendered });
  if (typeof tendered !== "number" || tendered < due) { c.say("change_back"); return; } // amount unknown: no sum
  if (tendered === due) { c.say("cash_exact"); return; }
  if (BILL_LINE[tendered]) c.say(BILL_LINE[tendered]);
  const change = tendered - due;
  if (CHANGE_SET.has(change)) c.say("change_is", { price: change }); else c.say("change_back");
}

/** The learner hands money (an amount, or none said): too little → Marcus repeats the total. */
function handMoney(c: Ctx, amount: number | undefined) {
  if (c.s.paid) { c.say("paid_thanks"); return; }
  if (!c.s.totalSaid) { c.say("ack"); return; }
  if (typeof amount === "number" && amount < total(c)) { c.say("short_cash", { total: total(c) }); c.hold(); return; }
  if (c.s.method === "card" || c.s.method === "phone") { charged(c); return; }
  paidCash(c, typeof amount === "number" ? amount : c.s.tender);
}

/** A total changed after Marcus said it: he says the new one (before the total: the running total). */
function sayNewTotal(c: Ctx) {
  if (c.s.totalAnnounced) { c.s.totalSaid = true; c.say("new_total", { total: total(c) }); c.hold(); }
  else c.say("total_so_far", { total: total(c) });
}

/** "Just one" / "I don't need the second bag of chips": back to one bag of chips (the deal no longer applies). */
function chipsOne(c: Ctx) {
  if (c.s.paid) { c.say("ack"); return; }
  if (c.s.checked && c.s.chips === 1 && !c.s.secondDone) { c.s.secondDone = true; c.say("second_no_ok"); return; } // the answer to "Want another one?"
  if (c.s.chips !== 2) { c.say("ack"); return; }
  c.s.chips = 1; c.s.secondDone = true;
  c.say("second_undo");
  sayNewTotal(c);
}

/** "I'll take two bags of chips after all": two for five. */
function chipsTwo(c: Ctx) {
  if (c.s.paid || c.s.chips === 2) { c.say("ack"); return; }
  const later = !!c.s.secondDone || !c.s.checked; // not the answer to "Want another one?": a change of mind
  c.s.chips = 2; c.s.secondDone = true;
  c.say("second_yes_ok");
  if (later) sayNewTotal(c); else changed(c);
}

function charged(c: Ctx) {
  if (c.s.paid) return;
  c.s.paid = true;
  c.complete();
  c.event("pay", { method: c.s.method ?? "card", amount: total(c), cashBack: c.s.cbAmount ?? 0 });
  c.say("paid_thanks");
  if (c.s.cbAmount) c.say("cashback_here", { amount: c.s.cbAmount });
}

function setCashback(c: Ctx, cents: number | undefined) {
  if (c.s.paid) return;
  c.s.cashback = true;
  if (typeof cents !== "number") return;
  if (cents >= 500 && cents <= 10000 && cents % 500 === 0) { c.s.cbAmount = cents; c.say("cashback_ok", { amount: cents }); }
  else { c.say("cashback_bad"); c.hold(); }
}

// ---------------------------------------------------------------------------

export const supermarket: SituationDef = {
  id: "s32-supermarket",
  song: 32,
  songTitle: "Unexpected Item",
  title: { en: "Unexpected Item", lt: "Netikėta prekė" },
  topic: { en: "At the supermarket checkout", lt: "Prekybos centro kasoje" },
  chapter: 2,
  order: 5,
  location: "market",
  npc: "marcus",
  npcs: ["sco"],
  goal: "Susimokėk už pirkinius kasoje ir susitvarkyk su netikėtumais.",
  intro: "„Harbor Market“ – prekybos centras miesto centre. Tavo krepšelyje – pieno galonas, duonos kepalas, bananai ir traškučių pakelis (lentynoje prie traškučių kabojo užrašas „2 for $5“). Prie ketvirtos kasos dirba kasininkas Marcus.",
  entities: { product: PRODUCTS },

  merges: {
    "right here": { reason: "lexical_expression", split: "right → dešinėje/teisingai + here → čia is false; the intensifier = čia pat.", minimal: "Two words." },
    "go ahead": { reason: "lexical_expression", split: "go → eikite + ahead → pirmyn is misleading; an invitation to act = prašom.", minimal: "Two words (C-LEX)." },
    "looking for": { reason: "grammatical_fusion", split: "looking → žiūrintis + for → už is false; “look for” = ieškoti (+ genitive).", minimal: "Two words." },
    "on sale": { reason: "lexical_expression", split: "on → ant + sale → išpardavimas is a literal reading; “on sale” = su nuolaida.", minimal: "Two words." },
    "came up": { reason: "lexical_expression", split: "came → atėjo + up → aukštyn is false; an item that “came up” at a price at the register = nuskaityti (po …).", minimal: "Two words (C-PHR)." },
    "second one": { reason: "grammatical_fusion", split: "one → vienas would add a false numeral; the prop-word is absorbed by the ordinal (antrasis).", minimal: "Two words (C-ONE)." },
    "my own": { reason: "lexical_expression", split: "my → mano + own → nuosavas doubles the possessive; “my own bag” = savo maišelį.", minimal: "Two words." },
    "sign up": { reason: "lexical_expression", split: "sign → pasirašyti + up → aukštyn is false; to join a program = užsiregistruoti.", minimal: "Two words (C-PHR)." },
    "cash back": { reason: "lexical_expression", split: "cash → grynieji + back → atgal is false; money taken out at the register = grynieji (išgryninimas).", minimal: "Two words, one service." },
    "there you go": { reason: "lexical_expression", split: "there → ten, you → jūs, go → einate is false; handing over / done = štai.", minimal: "All three words." },
    "what's going on": { reason: "lexical_expression", split: "What's → kas yra, going → einantis, on → ant is a literal reading of a set question; = kas vyksta.", minimal: "The question needs all three." },
    "let me check": { reason: "lexical_expression", split: "let → leiskite, me → man, check → patikrinti is a calque; a clerk's “let me check” = tuoj patikrinsiu.", minimal: "All three words." },
    "let me see": { reason: "lexical_expression", split: "let → leiskite, me → man, see → matyti is a calque; a clerk's “let me see” = tuoj pažiūrėsiu.", minimal: "All three words." },
    "you know what": { reason: "lexical_expression", split: "you → jūs, know → žinote, what → ką reads as a question about knowledge; the set opener = žinote ką.", minimal: "All three words." },
    "all the time": { reason: "lexical_expression", split: "all → visas + the → — + time → laikas gives “all the time (duration)”; the frequency = nuolat.", minimal: "All three words." },
    "come on": { reason: "lexical_expression", split: "come → ateikite + on → ant is false; an exasperated “come on” = nagi.", minimal: "Two words." },
    "comes to": { reason: "lexical_expression", split: "comes → ateina + to → į is false; a total “comes to” = sudaro.", minimal: "Two words." },
    "have to": { reason: "lexical_expression", split: "have → turiu + to → į is false; the modal of obligation = turiu / privalau.", minimal: "Two words." },
    "customer service": { reason: "lexical_expression", split: "customer → klientas + service → paslauga names nothing; the store desk = klientų aptarnavimo skyrius.", minimal: "Two words, one place." },
    "so far": { reason: "lexical_expression", split: "so → taip + far → toli is false; = kol kas.", minimal: "Two words." },
    "i've got": { reason: "grammatical_fusion", split: "I've → aš turiu + got → gavau doubles the verb; “have got” = turiu.", minimal: "Two words." },
    "good one": { reason: "grammatical_fusion", split: "one → vienas would add a false numeral; the prop-word “one” (= a joke) is named by the noun pokštas.", minimal: "Two words (C-ONE)." },
    "excuse me": { reason: "lexical_expression", split: "excuse → atleiskite + me → mane is a calque; getting someone's attention = atsiprašau.", minimal: "Two words." },
    "out of": { reason: "lexical_expression", split: "out → lauk + of → — is false; a cashier's “out of twenty” (paid with a twenty) = iš dvidešimties.", minimal: "Two words." },
    "harbor rewards": { reason: "lexical_expression", split: "A program name; harbor → uostas, rewards → apdovanojimai would translate a proper name.", minimal: "One name." },
  },

  grammar: {
    macros: {
      chips: "[the | these | those | this | my | that | a] [bag of | bags of | packet of #tip:uk_crisps] (chips | potato chips | crisps #tip:uk_crisps)",
      it_chips: "(it | them | this | that | these | those | @chips)",
      // the second bag of chips (never part of @chips: "I don't want another bag of chips" keeps the first one)
      chips_second: "(another | the second | the other | a second | the extra | one more | the 2nd) (bag | pack | packet) [of (chips | crisps #tip:uk_crisps)]",
      chips_bags: "(two | 2) (bags | packs | packets) of (chips | crisps #tip:uk_crisps)",
      sale: "(on sale | on special | discounted | cheaper | in the sale | on offer #tip:uk_offer | a special)",
      twofive: "((two | 2) (for | 4 | four) (five | 5) [dollars | bucks] | 245 | two for five dollars)",
      sco_obj: "(the | this) (machine | screen | self checkout | scanner | computer | register | till #tip:uk_till)",
      sco_msg: "(unexpected item [in [the] bagging area] #h:sco_says | [there is] (an | a) unexpected item [in [the] bagging area] #h:sco_says | [please] wait for (assistance | help) #h:sco_wait_says | [an] item in the bagging area | [please] remove [the] item [from the bagging area] | [please] call (for help | an attendant) | help is on the way)",
      idw: "[my | a | an | the] (id | passport | driver s license | drivers license | driver license | license | id card | identity card | lithuanian id | lithuanian passport | european id | foreign id | residence card | green card)",
      bagw: "(bag | sack | carrier bag #tip:uk_carrier)",
      bagsw: "(bags | sacks | carrier bags #tip:uk_carrier)",
      kind: "(paper #paper | plastic #plastic)",
      cardw: "(card | a card | my card | a rewards card | a loyalty card | my rewards card | my loyalty card | a club card | the card | an account | a membership)",
    },
  },

  intents: {
    // --- self-checkout (twist) ------------------------------------------------------------
    call_help_ctx: { patterns: [
      "excuse me", "(hi | hello | hey)", "(sir | marcus)",
      "(can | could) (you | somebody | someone | anyone | anybody) help me #h:sco_help",
      "(can | could) (you | somebody | someone) come (here | over here | over)",
      "(i need | we need) (help | some help | assistance | a hand)", "help [me]",
      "(is anybody | is anyone | is someone) there",
      "(can | could) you (check | look at) (this | the machine | it)",
      "(i have | there is) a problem [here | with the machine]",
    ] },
    sco_problem: { patterns: [
      "(@sco_obj | it) (says | said | is saying | keeps saying | shows | is showing) @sco_msg",
      "@sco_msg",
      "(@sco_obj | it) (says | said | keeps saying) (something | an error | a problem)",
      "@sco_obj (is not working | does not work | is broken | stopped working | is not scanning | froze | is frozen | is stuck | is beeping | stopped) #h:sco_broken",
      "(it | the machine) (is not | does not | will not | did not) (work | working)",
      "(it | the machine | this) (does not | will not) let me (continue | pay | scan | finish)",
      "(something is | there is something) wrong with @sco_obj",
      "i think (it | @sco_obj) is broken",
      "(it | @sco_obj) (wants | needs | is asking for) (help | assistance | an employee | a person | someone | an attendant)",
      "the [red] light is (flashing | blinking | on)",
      "i do not know what (happened | to do | is wrong)",
      "it is beeping", "(it | there) is (an | a) (unexpected | strange) item",
      "i put my (bag | own bag | shopping bag) (there | in the bagging area | on the scale | on it) #bag",
      "(my | the) bag is in the bagging area #bag",
      "i (can not | could not) (scan | pay | continue)",
      "(it | the machine | the screen) (stopped | froze | is frozen | is stuck)", "(it | the screen | the light) (is | went | turned) red",
    ] },

    // --- "Did you find everything okay?" and side questions ----------------------------------
    found_all: { patterns: [
      "i found everything [i (need | needed | wanted | was looking for)] #h:found_all",
      "i (found | got) (it all | all of it | everything i (need | needed | wanted) | what i (need | needed | wanted | was looking for))",
      "everything (is | was) (fine | good | great | okay | perfect | easy to find)",
      "i found (it | them) all", "i found all [of it | of them]", "(it was | that was) easy",
      "i think i (got | found) everything", "i have everything [i need]", "i got (all | everything) [i (need | needed)]",
    ] },
    found_ctx: { patterns: ["i did [thanks | thank you] #h:found_did", "(everything | all of it)", "all good", "found (it | them | everything)"] },
    not_found: { patterns: [
      "i (could not | can not | did not) find [the | any | some] {product} #h:nf_product",
      "i (could not | can not | did not) find (everything | one thing | something | what i (need | needed | wanted | was looking for))",
      "i (was | am) looking for [the | some] {product} [but i (could not | can not | did not) find (it | them)]",
      "i (needed | wanted) [some | the] {product} [but i (could not | can not | did not) find (it | them)]",
      "(not | not quite | almost) everything", "i found (almost | mostly) everything",
      "i found everything (but | except) [the] {product}",
      "i did not (see | find) [the | any] {product}",
      "(there | there were | there was) no {product} #soldout", "no {product} #soldout",
      "(you | you guys) (do not have | are out of | ran out of | have no) [any] {product} #soldout",
      "(the | your) {product} (is | are) (gone | sold out | not there) #soldout", "{product} (is | are) (sold out | gone) #soldout",
    ] },
    not_found_ctx: { patterns: ["[no] i (could not | can not | did not) find (it | them | one)"] },
    product_ctx: { patterns: ["[the | some] {product} #h:need_product", "(i need | i wanted | i was looking for | i am looking for) [the | some] {product}"] },
    ask_where: { patterns: [
      "where (is | are) [the] {product} #h:q_where",
      "where can i find [the | some] {product}", "where do you (have | keep | sell | put) [the] {product}",
      "(which | what) aisle (is | are) [the] {product} [in | on]", "(which | what) aisle [for] [the] {product}",
      "[the] {product} where", "(do you know | can you tell me) where [the] {product} (is | are)", "where would i find [the] {product}",
      "i am looking for [the | some] {product}",
    ] },
    ask_have: { patterns: [
      "do you (have | sell | carry) [any] {product} #h:q_have", "(is there | are there) [any] {product} [here]",
      "have you got [any] {product}", "you (have | sell) {product}", "(can | could) i (buy | get | find) {product} here",
    ] },
    ask_have_unknown: { patterns: ["do you (have | sell | carry) [any] {w:any}"] },
    ask_where_unknown: { patterns: ["where (is | are) [the] {w:any}", "where can i find [the] {w:any}"] },
    ask_restroom: { patterns: [
      "where is the (restroom | bathroom | ladies room | mens room) #h:q_restroom", "where (is | are) the (toilet | toilets) #tip:us_restroom",
      "(do you have | is there) a (restroom | bathroom | toilet)", "(can | could | may) i use the (restroom | bathroom | toilet)",
    ] },
    ask_atm: { patterns: [
      "(is there | do you have) an (atm | cash machine #tip:uk_cashpoint | cashpoint #tip:uk_cashpoint) [here | nearby | in the store] #h:q_atm",
      "where is the (atm | cash machine #tip:uk_cashpoint | cashpoint #tip:uk_cashpoint)", "where can i get cash",
    ] },
    ask_bags: { patterns: ["do you have (bags | a bag | paper bags | plastic bags)", "where (are | is) the (bags | bag)", "(can | could) i buy a bag"] },

    // --- rewards card --------------------------------------------------------------------------
    rewards_have: { patterns: [
      "[yes] i (have | got) (@cardw | one) [here] #h:rw_have_card", "[yes] (here is | this is) (my | the) (card | rewards card | loyalty card | club card)",
      "[yes] i am [already] a member #h:rw_member", "[yes] i am in the (program | rewards program)",
      "[yes] (it is | i have it) (on my phone | in the app) #app #h:rw_app", "[yes] i have the app #app", "[yes] (can | could) i (use | scan) (my | the) (app | phone) #app",
    ] },
    rewards_have_ctx: { patterns: ["[yes] here (it is | you go | you are) #h:rw_have"] },
    rewards_no: { patterns: [
      "[no] i do not have @cardw #h:rw_no", "[no] i am not a member", "[no] no card", "[no] not a member",
      "[no] i am (just visiting | a tourist | visiting | not from here | new here | new in town) #visitor",
      "[no] [but] (i have | i have got | i got) a [big] heart #heart #h:rw_heart",
    ] },
    // a bare "I don't (have)": only as the answer to "Do you have a loyalty card?"
    rewards_no_ctx: { patterns: ["[no] (i do not | we do not) #h:rw_no", "[no] i do not have [one | it | any]"] },
    rewards_forgot: { patterns: [
      "[yes] [but] i (forgot | left) (my card | my rewards card | my loyalty card | the card) [at home | in the car | at the hotel] #h:rw_forgot",
      "[yes] [but] i do not have my (card | rewards card | loyalty card) [with me | today | here]",
      "i (lost | can not find) my (card | rewards card | loyalty card)",
    ] },
    rewards_forgot_ctx: { patterns: [
      "[yes] [but] i (forgot | left) it [at home | in the car | at the hotel]", "[yes] [but] i do not have it [with me | today | here]",
      "[yes] [but] not with me", "[yes] [but] i (can not | could not) find it", "[yes] [but] (it is | i left it) at home",
    ] },
    rewards_lookup: { patterns: [
      "(can | could) you look me up [by | with] [my] [phone number | number | phone] #h:rw_lookup",
      "(can | could) you (find me | look up my (number | phone number)) [by | with] [my] [phone number | number]",
      "(can | could) (i | you) use my (phone number | number)", "(can | could) i give you my (phone number | number)",
      "i can give you my (phone number | number)", "(use | try) my (phone number | number)", "(by | with) (my | the) phone number",
    ] },
    phone_ctx: { patterns: ["[my number is | it is | my phone number is | my phone is | the number is | my cell is | my cell number is] {digits} #h:ph_its"] },
    phone_none: { patterns: [
      "i do not have a (us | american | local) (number | phone number | phone | cell phone) [yet] #h:ph_none", "i (only | just) have a (lithuanian | foreign | european) (number | phone number)",
      "i do not (know | remember) my (number | phone number)", "i do not remember (it | the number)", "i would rather not (say | give it)",
      "i do not have a (phone | phone number | number) [here]",
    ] },
    rewards_what: { patterns: [
      "what is (a | the) (loyalty | rewards | club) (card | program) #h:rw_what", "is the (card | loyalty card | rewards card | program) free",
      "what are the (benefits | points) [of the card]", "(loyalty | rewards) card what is (that | it)", "how does the (card | loyalty card | rewards card | program) work",
    ] },
    rewards_what_ctx: { patterns: ["what is (that | it) [card]", "what (do i | does it) (get | give me)", "(is it | is that) free", "how does it work"] },
    join_no_ctx: { patterns: [
      "[no] i do not (want | need) (to join | to sign up | one | a card | it) [today | now]", "[no] i am not interested", "[no] i will pass", "[no] maybe (later | next time)",
    ] },
    rewards_join: { patterns: [
      "(can | could | may) i (sign up | join | get a card | register) [now | today | here] #h:rw_join",
      "i would like to (sign up | join | get a card)", "how (do | can) i (sign up | join | get a card)", "sign me up",
      "[yes] i (want | would like) a (card | loyalty card | rewards card) [please]", "i want to (join | sign up) #blunt", "[yes] (let us | i will) (sign up | join)",
    ] },
    rewards_join_ctx: { patterns: ["(can | could | may) i (get | make) one [now | today | here]", "i would like to get one", "how (do | can) i get one", "[yes] i (want | would like) one [please]", "[yes] let us do it"] },

    // --- ID for the wine (twist) ----------------------------------------------------------------
    id_show: { patterns: [
      "[sure | yes | of course] (here is | this is) @idw #h:id_here_passport",
      "i [only | just] (have | have got) @idw [here | right here | with me]", "[sure] (let me | i will | i can) (get | show [you] | give you) @idw",
    ] },
    id_show_ctx: { patterns: ["[sure | yes] here (it is | you go | you are) #h:id_here", "[sure] (i can | i will | let me) show you [it]", "[sure] (let me | i will) (get | find) it"] },
    id_ask_ok: { patterns: [
      "is @idw (okay | ok | fine | all right | good) #h:id_passport", "(can | could | may) i (use | show [you] | give you) @idw", "do you (take | accept) @idw",
      "will @idw (work | do)", "would @idw be (okay | ok | fine | all right | good)", "@idw is (okay | ok | fine | good) [for you]",
      "(is it | is that) (okay | ok | fine) if i (show | use) [you] @idw", "(is | are) (european | foreign | lithuanian) (id | ids | id cards) (okay | ok | fine)",
    ] },
    id_none: { patterns: [
      "[sorry] i do not have (@idw | any id) [with me | on me | here | today]",
      "i (forgot | left) (@idw | my wallet) [at home | at the hotel | in the car]", "[sorry] no id [with me]",
      "i did not bring @idw", "i have no (id | passport | license | driver s license)",
    ] },
    id_none_ctx: { patterns: [
      "[sorry] i do not have (it | one) [with me | on me | here | today] #h:id_none", "i (forgot | left) it [at home | at the hotel | in the car]", "[no] i did not bring it",
    ] },
    id_age: { patterns: [
      "i am (over | older than) (twenty one | 21 | eighteen | 18) [years old]", "i am {number} [years old] #age", "(i am | i was) born in {year}",
      "(i am | i look) old enough", "do i look (under | younger than) (twenty one | 21)", "(are you | you are) (kidding | joking)",
      "i am (older | much older) than (that | twenty one)",
    ] },
    id_why: { patterns: ["why do you need (my id | to see my id | my passport)", "do you (really)? need my (id | passport)", "why do you need to see (it | my id)"] },
    id_why_ctx: { patterns: ["why [do you need it]", "do you (really)? need (it | to see it)", "(is it | is that) (necessary | the law | required)", "what for"] },
    wine_remove: { patterns: [
      "[then] (never mind | forget it) (the | about the) wine", "[then] forget (the wine | about the wine)", "[then] i do not (want | need) the wine [then | anymore]",
      "(take | put) the wine (off | back | away)", "(you can | just) take (it | the wine) off", "[okay] [then] (no | without) wine [then]",
      "[okay] [then] leave the wine", "(i will | i can) (leave | skip) the wine",
    ] },

    wine_remove_ctx: { patterns: ["[then] (never mind | forget it)", "[then] i do not (want | need) it [then | anymore]"] },

    // --- the price check -----------------------------------------------------------------------
    sale_claim: { patterns: [
      "i think (they are | it is | @chips (are | is)) @sale #h:pc_sale", "@chips (are | were | is) @sale", "(they are | it is) @sale",
      "(the | there was a | there is a) (sign | shelf | tag | price tag | label) (said | says) [that] [(they | it) (were | was | are | is)] (@sale | @twofive) #h:pc_sign",
      "(it | they | @chips) (is | are | was | were) @twofive", "(it is | they are) (supposed | meant) to be @sale", "@twofive",
      "it (said | says) @twofive", "(are not | is not) (they | it | @chips) (@sale | @twofive)", "(are | is) (they | it | @chips) @sale",
      "on the shelf (it | they) (was | were | said) (@sale | @twofive)", "the shelf (price | tag) (was | is | said) (lower | different | @twofive)",
      "i saw a (sale | sale sign | sign) [on the shelf]",
    ] },
    price_wrong: { patterns: [
      "(the | that | this) price is (wrong | not right | too (much | high) | incorrect)",
      "i think (the | that | this) price is (wrong | not right | too high | incorrect) #h:pc_wrong",
      "the price (does not | did not) (look | seem) right", "(they are | the chips are | it was | they were) (cheaper | less) on the shelf",
      "that is not the (price | right price) on the shelf", "@chips (should | must) be (cheaper | less)",
    ] },
    price_wrong_ctx: { patterns: [
      "(that | it) is (wrong | not right | too (much | high) | incorrect)", "i think (that | it) is (wrong | not right | too high | incorrect)",
      "that (does not | did not) (look | seem) right", "(it is | that is | they are) (cheaper | less)", "(that | it) (should | must) be (cheaper | less)",
    ] },
    price_check_req: { patterns: [
      "(can | could) you (do | run | make) a price check [on @it_chips] #h:pc_check",
      "(can | could | may) i (have | get) a price check [on @it_chips] #h:pc_have",
      "(can | could) you check the price [of | on | for] [@it_chips]", "check the price [of | on] [@it_chips]", "price check",
    ] },
    price_check_ctx: { patterns: ["(can | could) you check (it | that | them | again)", "(can | could) you check"] },
    price_ok_ctx: { patterns: [
      "(that is | it is) (fine | okay | no problem) #h:pc_ok", "(that is | it is) (right | correct) #right", "(okay | fine) [no problem]", "no problem",
      "(i will | i can) (take | pay) (it | them) [anyway]", "never mind", "(four forty nine | 4.49) is (fine | okay)",
    ] },
    no_sign_ctx: { patterns: ["i did not (see | notice) (one | a sign | anything | it | a sale sign)", "(no | not) sign"] },
    chips_remove: { patterns: [
      "[then] i do not (want | need) @chips [then | anymore | at all]", "(never mind | forget) (the chips | about the chips)",
      "(take | put) @chips (off | back | away)", "(you can | just) take @chips off",
      "[okay] [then] (no | without) @chips [then]", "[okay] [then] leave @chips", "(cancel | remove) @chips", "(i will | i can) (leave | skip) @chips",
    ] },
    chips_remove_ctx: { patterns: [
      "[then] i do not (want | need) (them | it) [then | anymore | at all]", "(never mind | forget) them", "(take | put) (them | it) (off | back | away)",
      "(you can | just) take (them | it) off", "[okay] [then] leave them", "(cancel | remove) them", "(i will | i can) (leave | skip) them",
    ] },
    // back to one bag of chips (any time before paying), or two after all
    chips_one: { patterns: [
      "(just | only) one (bag | pack | packet) of (chips | crisps #tip:uk_crisps) [please | then | is fine | is enough]",
      "i (only | just) (need | want) one (bag | pack | packet) of (chips | crisps #tip:uk_crisps)", "one (bag | pack) of (chips | crisps) is (enough | fine | okay)",
      "i do not (need | want) (@chips_second | @chips_bags | (another | the second | the other | a second | the extra) one) [then | anymore | after all]",
      "(cancel | remove | take off | put back) (@chips_second | the second one | the other one | the extra one)",
      "(you can | please) (take | put) (@chips_second | the second one | the other one) (off | back)",
      "(no | not) @chips_bags [(just | only) one]", "(forget | never mind) (@chips_second | the second one)",
    ] },
    chips_two: { patterns: [
      "i will (take | get | have) @chips_bags [after all]", "(i will | let me) (take | get | grab) (@chips_second | one more bag of chips) [after all]",
      "(give me | i want | i would like) (@chips_second | the second one | another one) after all", "i will take (the second one | another one) after all",
      "@chips_bags [then] [please]",
    ] },
    // a bare "just one": only as an answer (at the bag question it means one shopping bag)
    qty_one_ctx: { patterns: [
      "(just | only) one [please | is fine | is enough | then]", "one is (enough | fine | okay)", "(make it | make that) [just | only] one",
      "i (only | just) (need | want) one", "not (two | 2) [(just | only) one]",
    ] },
    chips_price_q: { patterns: ["how much (are | is) @chips", "what is the price (of | for) @chips", "(how much | what) do @chips cost"] },
    second_yes_ctx: { patterns: [
      "[sure | yes] (i will | let me | can i) (take | get | grab | have) (another | another one | one more | two | a second one | another bag) #h:pc_another",
      "[yes] (two | 2) [bags | then] #h:pc_two", "[yes] (give me | i want) (another | one more | two) [one | bag]", "[sure] i will take two [then]",
      "[yes] (another one | one more | another bag)", "[yes] (i would like | i need) (another | another one | one more | two | a second one)",
      "[yes] (that is | sounds like) a (good | great) deal", "[yes] (make it | i will do) two",
    ] },
    second_no_ctx: { patterns: [
      "[no] (just | only) (one | the one) [bag] [is fine | is enough] #h:pc_just_one", "[no] one is (enough | fine | okay)",
      "[no] i (only | just) (need | want) one", "[no] i do not (need | want) (another | two | another one | a second one | more | more chips | another bag | two bags)",
      "[no] one bag is (enough | fine)", "[no] i am (fine | good) with one",
    ] },

    // --- bags ----------------------------------------------------------------------------------------
    bag_want: { patterns: [
      "(a | one) [@kind] @bagw #h:bag_one", "just (one | a) [@kind] @bagw", "(two | 2) [@kind] @bagsw #two", "(three | 3) [@kind] @bagsw #three",
      "a couple of [@kind] @bagsw #two", "i (need | would like | want) (a | one) [@kind] @bagw", "i (need | would like | want) (two | 2) [@kind] @bagsw #two",
      "(can | could | may) i (have | get) (a | one) [@kind] @bagw #h:bag_can", "(can | could | may) i (have | get) (two | 2) [@kind] @bagsw #two",
      "a @bagw would be (great | nice | good)", "i will (take | need) (a | one) [@kind] @bagw", "give me (a | one) [@kind] @bagw #blunt",
    ] },
    bag_kind_ctx: { patterns: [
      "paper [bag | one | bags] #paper #h:bag_paper", "plastic [bag | one | bags] #plastic #h:bag_plastic",
      "paper (is | would be) (fine | okay | good | great | better) #paper #h:bag_paper", "plastic (is | would be) (fine | okay | good | great | better) #plastic #h:bag_plastic",
      "(i prefer | i would prefer | i would like | i will take | let us do | let us go with | i will go with) @kind",
      "(either | either one | any | whatever | whichever | both are fine) [one] [is fine | is okay | works] #either #h:bag_either",
      "it does not matter #either", "i do not (care | mind) #either",
    ] },
    bag_kind_neg_ctx: { patterns: [
      "not plastic [paper] #paper", "no plastic #paper", "not paper [plastic] #plastic", "no paper #plastic",
      "paper not plastic #paper", "plastic not paper #plastic", "i do not (want | like | need) plastic #paper", "i do not (want | like | need) paper #plastic",
    ] },
    bag_no: { patterns: [
      "i (have | brought | got) my own [@bagw | @bagsw] #own #h:bag_own", "i (have | brought | got) (a | my) @bagw #own", "i (have | brought) bags #own",
      "i do not need (a bag | bags | any bags) #h:bag_none", "no (bag | bags) [needed]", "i will carry (it | them | everything) #h:bag_carry",
      "i am (fine | good | okay) without (a bag | bags)", "i can carry (it | them | everything)",
      "i will put (it | them | everything) in my (bag | backpack | purse) #own", "(it is | that is) (fine | okay) i have (a bag | one | my own) #own",
      "i do not want (a bag | bags)",
    ] },
    bag_no_ctx: { patterns: ["[no] i do not (need | want) (it | one | any)", "[no] i am (fine | good | okay) without (one | it)", "[no] i (have | brought) one #own"] },
    bag_price_ctx: { patterns: ["(is | are) (it | they) free", "(does | do) (it | they) cost [money | extra | anything]"] },
    bag_price_q: { patterns: [
      "how much (is | are) (a bag | the bags | bags | a paper bag | a plastic bag | one bag) #h:q_bag_price", "(do | does) (the bags | bags | a bag) cost [money | extra | anything]",
      "(are | is) (the bags | bags | a bag | the bag) free", "how much (do | does) (the bags | a bag) cost",
    ] },

    // --- paying ------------------------------------------------------------------------------------------
    total_q: { patterns: [
      "how much (is it | is that | is everything | is the total) [all together | altogether | in total] #h:q_total", "what is (the | my) total",
      "(what | how much) do i (owe | pay) [you]", "how much [is it] (all together | altogether | in total)", "how much",
    ] },
    pay_card: { patterns: [
      "[can | could] i pay (by | with) (card | credit card | debit card | my card | credit | debit) #h:pay_card", "(by | with) card", "card #h:pay_card_short",
      "(i will | i would like to | i am going to | i want to) pay (by | with) (card | credit card | debit card | my card | a card)", "do you (take | accept) (cards | credit cards | card | visa | mastercard | debit cards)",
      "(can | could) i (use | tap | insert) my card", "(can | could) i tap", "(contactless | visa | mastercard)", "here is my (card | credit card | debit card)", "card is (fine | okay | ok)", "(just | only) card", "not (cash | in cash) [but] [by | with] card",
    ] },
    no_cash: { patterns: ["(i | we) do not have [any | enough] cash", "no cash [sorry]", "not [in] cash", "(i | we) (can not | do not want to) pay (in | with) cash", "i have no cash"] },
    no_card: { patterns: ["i do not have a card", "i (can not | do not want to) pay (by | with) card", "i left my card [at home | at the hotel]"] },
    pay_cash: { patterns: ["[can | could] i pay (in | with) cash", "(in | with) cash", "cash #h:pay_cash_short", "(i will | i would like to | i am going to) pay (in | with) cash #h:pay_cash", "i will pay cash", "cash is (fine | okay | ok)", "not (card | by card) [but] [in | with] cash"] },
    pay_phone: { patterns: [
      "(can | could) i pay (with | by) (my phone | apple pay | google pay | phone)", "(can | could) i use (apple pay | google pay | my phone)",
      "(i will | i would like to | i am going to) pay (with | by) (my phone | phone | apple pay | google pay)", "do you (take | accept | have) (apple pay | google pay) #h:apple_pay",
      "apple pay", "google pay",
    ] },
    here_you_go: { patterns: ["here you (go | are) #h:here_you_go", "there you go", "here it is", "here is [a] {price} #h:cash_twenty", "here is (the | my) money", "take {price}"] },
    keep_change: { patterns: ["keep the change", "you can keep the change"] },
    // at the "cash" step: the money handed over ("Twenty.", "I only have a fifty.")
    cash_given_ctx: { patterns: [
      "{price} [dollars]", "[sorry] i (only | just) have [a] {price} [bill | dollar bill] #h:cash_fifty", "[sorry] i have [a] {price} [bill | dollar bill]",
      "(take | here is) [a] {price} [bill | dollar bill]",
    ] },
    change_q_ctx: { patterns: ["do you have change for [a] {price} [bill]", "(can | could) you (break | change) [a] {price} [bill]", "is [a] {price} [bill] (okay | ok | fine)"] },
    debit_credit: { patterns: [
      "credit [card] #credit #h:credit", "debit [card] #debit #h:debit", "(it is | it's) [a] (credit #credit | debit #debit) [card]",
      "[it is] [a] (visa | mastercard) (credit #credit | debit #debit) [card]", "(credit #credit | debit #debit) is (fine | okay | better)",
      "i (will use | want | would like) (credit #credit | debit #debit)", "not credit [debit] #debit", "not debit [credit] #credit",
    ] },
    no_pin: { patterns: [
      "i (do not know | forgot | can not remember | do not remember) my pin #h:no_pin", "i do not have a pin", "my card (does not have | has no) a pin",
      "i (can not | could not) (enter | remember) (my | the) pin",
    ] },
    pin_q: { patterns: ["do i (need to | have to) (enter | type | put in) (my | the | a) pin", "(do i need | is there) a pin", "(pin | my pin) [now]", "where do i (tap | put my card)"] },
    cashback_yes: { patterns: [
      "[yes] (can i get | can i have | i would like | i will take | i need) [some] cash back", "[yes] (can i get | can i have | i would like | i will take | i need) {price} (cash back | back | in cash)",
      "{price} cash back", "[yes] cash back", "i (want | need) [some] cash back #blunt",
    ] },
    cashback_amount_ctx: { patterns: ["{price} #h:cb_amount", "(can i get | can i have | i would like | i will take | i need | give me) {price} #h:cb_can", "{price} (cash back | back | in cash)", "just {price}"] },
    cashback_no: { patterns: ["no cash back #h:cb_no", "i do not (need | want) [any] cash [back] [today]", "no (cash | money) [back] (today | thanks) #h:cb_no"] },
    cashback_what: { patterns: ["what is cash back", "what (is | does) (that | cash back) mean", "how does cash back work"] },
    done_ctx: { patterns: [
      "(okay | ok | all right) [done | there] #h:done_ok", "(done | all done | finished)", "(it is | that is) done", "i did it", "like this #h:done_like",
      "is (that | it) (okay | ok | right | good)", "(it | that) worked", "i (tapped | entered) (it | my card | my pin)", "(thank you | thanks)", "(yes | yeah) done",
      "(here | right here | there)",
    ] },
    card_fail: { patterns: [
      "(it | the card | my card) (does not | did not) work", "(it | my card | the card) (was | is) declined", "it (says | said) declined",
      "(it | the machine | the reader) (does not | did not | will not) (take | read) (it | my card)", "nothing (happened | happens)",
    ] },

    // --- receipt --------------------------------------------------------------------------------------------
    receipt_no: { patterns: [
      "(i do not need | no need for | i do not want) [a | the | my] receipt #h:no_receipt_need", "no receipt #h:no_receipt", "(you can | just) keep the receipt",
      "(throw it | throw the receipt) (away | out)", "(it is | that is) (fine | okay) no receipt",
    ] },
    receipt_yes: { patterns: [
      "(can | could | may) i (have | get) (a | the | my) receipt #h:receipt", "(i would like | i need | i want) (a | the | my) receipt", "(a | the) receipt", "receipt",
      "(can | could) you put (it | the receipt) in the bag", "[yes] in the bag",
    ] },
    receipt_no_ctx: { patterns: ["[no] i do not need (it | one) [thanks | thank you]", "[no] (it is | that is) not necessary"] },
  },

  lines: {
    // --- the self-checkout machine (speaker "sco")
    sco_unexpected: [
      t("Unexpected | item | in | the | bagging | area.", "Netikėta | prekė | — | — | pakavimo | zonoje.", "Pakavimo zonoje – netikėta prekė.",
        { flags: { 2: "“in”: the locative zonoje carries it (C-CASE-DASH, “bagging” intervenes)." } }),
    ],
    sco_wait: [
      t("Please | wait | for | assistance.", "Prašome | palaukti | — | pagalbos.", "Prašome palaukti pagalbos.", { flags: { 2: "“for”: laukti takes the genitive pagalbos directly." } }),
    ],
    // --- Marcus at the self-checkout
    sco_what: [
      t("Hi! | What's | the | problem?", "Sveiki! | Kokia yra | — | problema?", "Sveiki! Kas nutiko?"),
      t("Sure! | What's going on?", "Žinoma! | Kas vyksta?", "Žinoma! Kas nutiko?"),
    ],
    sco_what_again: [
      t("What | does | the | screen | say?", "Ką | — | — | ekranas | rodo?", "Ką rodo ekranas?", { flags: { 1: "Question “does” has no Lithuanian word (linked to “say”)." } }),
    ],
    sco_look: [
      t("Sure, | let me see.", "Žinoma, | tuoj pažiūrėsiu.", "Žinoma, tuoj pažiūrėsiu."),
      t("No | problem, | let me see.", "Jokių | problemų, | tuoj pažiūrėsiu.", "Jokių problemų, tuoj pažiūrėsiu."),
    ],
    sco_fix_bag: [
      t("Oh, | it's | just | your | bag. | I'll fix | it.", "O, | tai yra | tik | jūsų | maišelis. | Sutvarkysiu | tai.", "O, tai tik jūsų maišelis. Tuoj sutvarkysiu."),
    ],
    sco_fix_glitch: [
      t("It's | not | you. | These | machines | do | that | all the time.", "Tai yra | ne | jūs. | Šie | aparatai | daro | taip | nuolat.", "Čia ne jūsų kaltė – šie aparatai taip daro nuolat."),
    ],
    sco_fixed: [t("There you go! | All | fixed.", "Štai! | Viskas | sutvarkyta.", "Štai! Viskas sutvarkyta.")],
    sco_come_on: [t("Oh, | come on!", "O, | nagi!", "O, na jau!")],
    sco_come_over: [
      t("You know what? | My | register | is | open. | Come | with | me, | and | I'll ring | you | up.",
        "Žinote ką? | Mano | kasa | yra | atidaryta. | Eikite | su | manimi, | ir | aptarnausiu | jus | —.",
        "Žinote ką? Mano kasa atidaryta. Eikite su manimi – aš jus aptarnausiu.",
        { flags: { 11: "Discontinuous “ring … up”: aptarnausiu covers the whole verb (linked to “I'll ring”)." } }),
    ],

    // --- greeting: "Did you find everything okay?"
    greet_howareyou: [
      t("Hi there! | How | are | you | doing | today?", "Sveiki! | Kaip | — | jums | sekasi | šiandien?", "Sveiki! Kaip jums šiandien sekasi?",
        { flags: { 2: "Progressive “are” has no Lithuanian word; sekasi carries the tense (linked to “doing”)." } }),
      t("Hey! | How's it going?", "Labas! | Kaip sekasi?", "Labas! Kaip sekasi?"),
    ],
    greet_find: [
      t("Hi there! | Did | you | find | everything | okay?", "Sveiki! | Ar | jūs | radote | viską | be problemų?", "Sveiki! Ar viską radote?",
        { flags: { 1: "“Did” in a yes/no question = the particle ar; the past tense sits on radote (linked to “find”)." } }),
      t("Good | morning! | Did | you | find | everything | okay?", "Labas | rytas! | Ar | jūs | radote | viską | be problemų?", "Labas rytas! Ar viską radote?",
        { flags: { 2: "“Did” in a yes/no question = the particle ar; the past tense sits on radote (linked to “find”)." } }),
      t("Hi! | Find | everything | okay | today?", "Sveiki! | Radote | viską | be problemų | šiandien?", "Sveiki! Ar šiandien viską radote?"),
    ],
    greet_back: [
      t("Hey, | welcome | back! | Did | you | find | everything | okay?", "Labas, | sveiki | sugrįžę! | Ar | jūs | radote | viską | be problemų?", "Sveiki sugrįžę! Ar viską radote?",
        { flags: { 3: "“Did” in a yes/no question = the particle ar; the past tense sits on radote (linked to “find”)." } }),
    ],
    find_q: [
      t("Did | you | find | everything | okay?", "Ar | jūs | radote | viską | be problemų?", "Ar viską radote?",
        { flags: { 0: "“Did” in a yes/no question = the particle ar; the past tense sits on radote (linked to “find”)." } }),
      t("Find | everything | okay?", "Radote | viską | be problemų?", "Viską radote?"),
    ],
    found_great: [t("Great!", "Puiku!", "Puiku!"), t("Awesome!", "Puiku!", "Nuostabu!"), t("Good | to hear!", "Gera | girdėti!", "Gera girdėti!")],
    missing_what: [
      t("Oh | no! | What | were | you | looking for?", "O | ne! | Ko | — | jūs | ieškojote?", "O ne! Ko ieškojote?",
        { flags: { 3: "Progressive “were” has no Lithuanian word; ieškojote carries the past (linked to “looking for”)." } }),
      t("Oh, | no! | What | did | you | need?", "O, | ne! | Ko | — | jums | reikėjo?", "O ne! Ko jums reikėjo?",
        { flags: { 3: "Question “did” has no Lithuanian word; the past tense sits on reikėjo (linked to “need”)." } }),
    ],
    sorry_missed: [t("Oh, | sorry | about | that!", "O, | atsiprašau | dėl | to!", "O, atsiprašau!")],
    sold_out: [t("Oh, | sorry! | We | get | more | tomorrow | morning.", "O, | atsiprašau! | Mes | gausime | daugiau | rytoj | ryte.", "O, atsiprašau! Rytoj ryte gausime daugiau.")],
    // where things are
    loc_dairy: [
      t("Aisle | seven, | in the back.", "Eilėje | Nr. 7, | gale.", "Septintoje eilėje, parduotuvės gale."),
      t("That's | aisle | seven, | in the back.", "Tai yra | eilė | Nr. 7, | gale.", "Tai septinta eilė, parduotuvės gale."),
    ],
    loc_a4: [
      t("Aisle | four, | on the left.", "Eilėje | Nr. 4, | kairėje.", "Ketvirtoje eilėje, kairėje."),
      t("That's | aisle | four, | on the left.", "Tai yra | eilė | Nr. 4, | kairėje.", "Tai ketvirta eilė, kairėje."),
    ],
    loc_a3: [
      t("Aisle | three, | on the right.", "Eilėje | Nr. 3, | dešinėje.", "Trečioje eilėje, dešinėje."),
      t("That's | aisle | three, | on the right.", "Tai yra | eilė | Nr. 3, | dešinėje.", "Tai trečia eilė, dešinėje."),
    ],
    loc_a5: [
      t("Aisle | five, | in the middle.", "Eilėje | Nr. 5, | viduryje.", "Penktoje eilėje, per vidurį."),
      t("That's | aisle | five, | in the middle.", "Tai yra | eilė | Nr. 5, | viduryje.", "Tai penkta eilė, per vidurį."),
    ],
    loc_a9: [
      t("Aisle | nine, | at the end.", "Eilėje | Nr. 9, | gale.", "Devintoje eilėje, gale."),
      t("That's | aisle | nine, | at the end.", "Tai yra | eilė | Nr. 9, | gale.", "Tai devinta eilė, gale."),
    ],
    loc_front: [
      t("Right | at the front, | by | the | entrance.", "Visai | priekyje, | prie | — | įėjimo.", "Visai priekyje, prie įėjimo."),
      t("Up | at the front, | by | the | entrance.", "Ten | priekyje, | prie | — | įėjimo.", "Priekyje, prie įėjimo."),
    ],
    loc_a11: [
      t("Aisle | eleven, | by | the | windows.", "Eilėje | Nr. 11, | prie | — | langų.", "Vienuoliktoje eilėje, prie langų."),
    ],
    where_unknown: [
      t("Hmm, | good | question! | Ask | at | customer service, | by | the | entrance.", "Hmm, | geras | klausimas! | Paklauskite | — | klientų aptarnavimo skyriuje, | prie | — | įėjimo.",
        "Hmm, geras klausimas! Paklauskite klientų aptarnavimo skyriuje prie įėjimo.", { flags: { 4: "“at”: the locative skyriuje carries it (linked to “customer service”)." } }),
    ],
    have_yes: [
      t("Yes, | we | do!", "Taip, | mes | turime!", "Taip, turime!", { flags: { 2: "“do” (elliptical): Lithuanian repeats the verb, turime." } }),
      t("Sure | do!", "Žinoma, | turime!", "Žinoma, turime!"),
    ],
    have_no: [t("Sorry, | we | don't have | that.", "Atsiprašau, | mes | neturime | to.", "Atsiprašau, to neturime.")],
    restroom: [
      t("The | restrooms | are | in the back, | by | the | pharmacy.", "— | Tualetai | yra | gale, | prie | — | vaistinės.", "Tualetai – gale, prie vaistinės."),
    ],
    atm: [
      t("There's | an | ATM | by | the | door, | but | you | can | get | cash back | here.", "Yra | — | bankomatas | prie | — | durų, | bet | jūs | galite | gauti | grynųjų | čia.",
        "Prie durų yra bankomatas, bet grynųjų galite gauti ir čia, prie kasos."),
    ],

    // --- the rewards card
    rewards_q: [
      t("Do | you | have | a | loyalty | card?", "Ar | jūs | turite | — | lojalumo | kortelę?", "Ar turite lojalumo kortelę?", { flags: { 0: FLAG_DO } }),
      t("Do | you | have | a | rewards | card | with | us?", "Ar | jūs | turite | — | lojalumo | kortelę | pas | mus?", "Ar turite mūsų lojalumo kortelę?", { flags: { 0: FLAG_DO } }),
    ],
    rewards_scan: [
      t("Great! | Go ahead | and | scan | it | right here.", "Puiku! | Prašom | — | nuskenuoti | ją | čia pat.", "Puiku! Nuskenuokite ją štai čia.",
        { flags: { 2: "“and” (go ahead and …): Lithuanian joins the request directly.", 4: "“it” = the card (kortelė), hence ją." } }),
      t("Perfect! | Just | scan | it | right here.", "Puiku! | Tiesiog | nuskenuokite | ją | čia pat.", "Puiku! Tiesiog nuskenuokite ją štai čia.",
        { flags: { 3: "“it” = the card (kortelė), hence ją." } }),
    ],
    rewards_thanks: [t("Thanks!", "Ačiū!", "Ačiū!"), t("Perfect, | thank | you!", "Puiku, | dėkoju | jums!", "Puiku, ačiū!")],
    rewards_app: [
      t("Sure! | Just | scan | the | barcode | on | your | phone.", "Žinoma! | Tiesiog | nuskenuokite | — | brūkšninį kodą | — | savo | telefone.",
        "Žinoma! Tiesiog nuskenuokite brūkšninį kodą telefone.", { flags: { 5: "“on”: the locative telefone carries it (C-CASE-DASH, “your” intervenes)." } }),
    ],
    lookup_offer: [
      t("No | problem. | I | can | look | you | up | by | phone | number.", "Jokių | problemų. | Aš | galiu | surasti | jus | — | pagal | telefono | numerį.",
        "Jokių problemų. Galiu jus surasti pagal telefono numerį.", { flags: { 6: "Discontinuous “look … up”: surasti carries “up” (linked to “look”)." } }),
    ],
    ask_phone: [
      t("What's | your | phone | number?", "Koks yra | jūsų | telefono | numeris?", "Koks jūsų telefono numeris?"),
      t("And | what's | the | number?", "O | koks yra | — | numeris?", "O koks numeris?"),
    ],
    phone_found: [
      t("Got | you! | Thanks.", "Radau | jus! | Ačiū.", "Radau jus! Ačiū."),
      t("Okay, | I | found | you.", "Gerai, | aš | radau | jus.", "Gerai, radau jus."),
    ],
    rewards_explain: [
      t("It's | a | free | card. | You | get | sale | prices | and | points.", "Tai yra | — | nemokama | kortelė. | Jūs | gaunate | akcijų | kainas | ir | taškus.",
        "Tai nemokama kortelė: gaunate akcijų kainas ir kaupiate taškus."),
    ],
    join_offer: [
      t("Would | you | like | to join? | It's | free.", "Ar | jūs | norėtumėte | prisijungti? | Tai yra | nemokama.", "Gal norėtumėte prisijungti? Tai nemokama.", { flags: { 0: FLAG_WOULD } }),
      t("Would | you | like | to join | Harbor Rewards? | It's | free.", "Ar | jūs | norėtumėte | prisijungti | prie „Harbor Rewards“? | Tai yra | nemokama.",
        "Gal norėtumėte prisijungti prie „Harbor Rewards“? Tai nemokama.", { flags: { 0: FLAG_WOULD, 4: "“to join”'s object: prisijungti takes prie + genitive, glossed with the name." } }),
    ],
    join_phone: [
      t("Great! | I | just | need | your | phone | number.", "Puiku! | Man | tik | reikia | jūsų | telefono | numerio.", "Puiku! Man tereikia jūsų telefono numerio.",
        { flags: { 1: "“I” → dative man: Lithuanian says “to me (it) is needed”." } }),
    ],
    joined: [t("Done! | You're | a | member | now.", "Atlikta! | Jūs esate | — | {m:narys|f:narė} | dabar.", "Atlikta! Dabar esate {m:narys|f:narė}.")],
    rewards_no_ok: [t("No | problem!", "Jokių | problemų!", "Jokių problemų!"), t("No | worries!", "Jokių | rūpesčių!", "Nieko tokio!")],
    heart_joke: [t("Ha! | That's | a | good one.", "Cha! | Tai yra | — | geras pokštas.", "Cha! Geras pokštas.")],

    // --- ID for the wine
    id_q: [
      t("I'll need | to see | your | ID | for | the | wine.", "Man reikės | pamatyti | jūsų | asmens dokumentą | dėl | — | vyno.", "Dėl vyno turėsiu pamatyti jūsų asmens dokumentą."),
      t("Can | I | see | your | ID, | please? | It's | for | the | wine.", "Ar galiu | aš | pamatyti | jūsų | asmens dokumentą, | prašau? | Tai yra | dėl | — | vyno.",
        "Ar galėčiau pamatyti jūsų asmens dokumentą? Tai dėl vyno."),
    ],
    id_ask_again: [t("Could | I | see | your | ID?", "Ar galėčiau | aš | pamatyti | jūsų | asmens dokumentą?", "Ar galėčiau pamatyti jūsų asmens dokumentą?")],
    id_thanks: [t("Perfect, | thank | you.", "Puiku, | dėkoju | jums.", "Puiku, ačiū."), t("Thanks, | that's | all | I | needed.", "Ačiū, | tai yra | viskas, ko | man | reikėjo.", "Ačiū, daugiau nieko nereikia.", { flags: { 2: "The relative ko (“all [that] I needed”) has no English word; it is glossed with “all”." } })],
    id_ok_passport: [t("Sure, | a | passport | is fine.", "Žinoma, | — | pasas | tinka.", "Žinoma, pasas tinka.")],
    id_none_remove: [
      t("Sorry, | I | can't sell | you | the | wine | without | an | ID. | I'll take | it | off.", "Atsiprašau, | aš | negaliu parduoti | jums | — | vyno | be | — | asmens dokumento. | Išimsiu | jį | —.",
        "Atsiprašau, be asmens dokumento vyno parduoti negaliu. Išimsiu jį iš pirkinių.", { flags: { 11: FLAG_TAKE_OFF } }),
    ],
    id_policy: [
      t("Sorry, | I | have to | check | everyone's | ID. | It's | the | law.", "Atsiprašau, | aš | turiu | patikrinti | visų | asmens dokumentus. | Toks yra | — | įstatymas.",
        "Atsiprašau, privalau patikrinti visų asmens dokumentus. Toks įstatymas."),
    ],
    id_age_reply: [t("Ha, | thanks! | But | I | have to | ask | everyone.", "Cha, | ačiū! | Bet | aš | turiu | paprašyti | visų.", "Cha, ačiū! Bet privalau paprašyti visų.")],
    wine_removed: [
      t("Okay, | I'll take | the | wine | off.", "Gerai, | išimsiu | — | vyną | —.", "Gerai, vyną išimsiu.", { flags: { 4: FLAG_TAKE_OFF } }),
    ],

    // --- the price check
    price_q_right: [
      t("Hmm, | the | chips | came up | at | $4.49. | Is | that | right?", "Hmm, | — | traškučiai | nuskaityti | po | 4,49 $. | Ar | tai | teisinga?",
        "Hmm, traškučiai nuskaityti po 4,49 $. Ar teisingai?",
        { say: "Hmm, the chips came up at four forty-nine. Is that right?", flags: { 6: "“Is” in a question = the particle ar; Lithuanian needs no copula here." } }),
    ],
    price_q_sign: [
      t("The | chips | came up | at | $4.49. | Did | you | see | a | sale | sign?", "— | Traškučiai | nuskaityti | po | 4,49 $. | Ar | jūs | matėte | — | akcijos | etiketę?",
        "Traškučiai nuskaityti po 4,49 $. Ar matėte akcijos etiketę?",
        { say: "The chips came up at four forty-nine. Did you see a sale sign?", flags: { 5: "“Did” in a yes/no question = the particle ar; the past tense sits on matėte (linked to “see”)." } }),
    ],
    price_check_start: [
      t("Let me check.", "Tuoj patikrinsiu.", "Tuoj patikrinsiu."),
      t("I'll do | a | quick | price | check.", "Padarysiu | — | greitą | kainos | patikrinimą.", "Greitai patikrinsiu kainą."),
    ],
    price_phone: [
      t("Hi, | can | I | have | a | price | check | on | register | four?", "Sveiki, | ar galiu | aš | gauti | — | kainos | patikrinimą | prie | kasos | Nr. 4?",
        "Sveiki, ar galima patikrinti kainą prie ketvirtos kasos?"),
    ],
    price_result_right: [
      t("Okay, | thanks! | You're | right, | they're | on sale. | It's | two | for | five.", "Gerai, | ačiū! | Jūs esate | {m:teisus|f:teisi}, | jie yra | su nuolaida. | Tai yra | du | už | penkis.",
        "Gerai, ačiū! Jūs {m:teisus|f:teisi} – jiems taikoma nuolaida: du už penkis dolerius."),
    ],
    price_result: [
      t("Okay, | thanks! | They're | on sale. | It's | two | for | five.", "Gerai, | ačiū! | Jie yra | su nuolaida. | Tai yra | du | už | penkis.",
        "Gerai, ačiū! Jiems taikoma nuolaida: du už penkis dolerius."),
    ],
    price_explain: [
      t("One | bag | is | $4.49, | but | two | are | just | $5.", "Vienas | pakelis | kainuoja | 4,49 $, | bet | du | kainuoja | tik | 5 $.", "Vienas pakelis kainuoja 4,49 $, o du – tik 5 $.",
        { say: "One bag is four forty-nine, but two are just five dollars." }),
    ],
    second_q: [
      t("The | second one | is | almost | free! | Do | you | want | another | bag?", "— | Antrasis | yra | beveik | nemokamas! | Ar | jūs | norite | dar vieno | pakelio?",
        "Antras pakelis – beveik nemokamai! Ar norite dar vieno?", { flags: { 5: FLAG_DO } }),
      t("Want | another | one? | The | second one | is | almost | free.", "Norite | dar | vieno? | — | Antrasis | yra | beveik | nemokamas.", "Norite dar vieno? Antras – beveik nemokamai."),
    ],
    second_yes_ok: [
      t("Great! | I | have | some | right here.", "Puiku! | Aš | turiu | jų | čia pat.", "Puiku! Turiu jų štai čia.", { flags: { 3: "“some”: the partitive genitive jų (of them) carries it." } }),
      t("Smart | move! | Two | for | five | dollars.", "Protingas | sprendimas! | Du | už | penkis | dolerius.", "Protingas sprendimas! Du už penkis dolerius."),
    ],
    second_no_ok: [t("No | problem. | Just | the | one, | then.", "Jokių | problemų. | Tik | — | vienas, | tada.", "Jokių problemų, tada tik vienas.")],
    second_undo: [
      t("No | problem, | just | the | one | bag | of chips, | then.", "Jokių | problemų, | tik | — | vienas | pakelis | traškučių, | tada.", "Jokių problemų, tada tik vienas traškučių pakelis."),
      t("Sure, | I'll put | it | back.", "Žinoma, | padėsiu | jį | atgal.", "Žinoma, padėsiu jį atgal."),
    ],
    chips_removed: [
      t("Okay, | I'll take | the | chips | off.", "Gerai, | išimsiu | — | traškučius | —.", "Gerai, traškučius išimsiu.", { flags: { 4: FLAG_TAKE_OFF } }),
    ],
    price_ok_ack: [t("Okay!", "Gerai!", "Gerai!"), t("Alright.", "Gerai.", "Gerai.")],
    chips_price: [t("They | came up | at | $4.49.", "Jie | nuskaityti | po | 4,49 $.", "Jie nuskaityti po 4,49 $.", { say: "They came up at four forty-nine." })],
    chips_price_sale: [t("They're | two | for | five.", "Jie kainuoja | du | už | penkis.", "Du už penkis dolerius.")],

    // --- bags
    bag_q_would: [
      t("Would | you | like | a | bag? | They're | ten | cents | each.", "Ar | jūs | norėtumėte | — | maišelio? | Jie kainuoja | dešimt | centų | kiekvienas.",
        "Ar norėtumėte maišelio? Jie kainuoja po dešimt centų.", { flags: { 0: FLAG_WOULD } }),
      t("Would | you | like | a | bag?", "Ar | jūs | norėtumėte | — | maišelio?", "Ar norėtumėte maišelio?", { flags: { 0: FLAG_WOULD } }),
    ],
    bag_q_kind: [t("Paper | or | plastic?", "Popierinį | ar | plastikinį?", "Popierinį ar plastikinį maišelį?")],
    bag_q_need: [
      t("Do | you | need | a | bag | today?", "Ar | jums | reikia | — | maišelio | šiandien?", "Ar šiandien reikia maišelio?", { flags: { 0: FLAG_DO } }),
    ],
    bag_kind_q: [
      t("Paper | or | plastic?", "Popierinį | ar | plastikinį?", "Popierinį ar plastikinį?"),
      t("Sure! | Paper | or | plastic?", "Žinoma! | Popierinį | ar | plastikinį?", "Žinoma! Popierinį ar plastikinį?"),
    ],
    bag_ok: [t("Sure!", "Žinoma!", "Žinoma!"), t("Okay!", "Gerai!", "Gerai!")],
    bags_two: [t("Sure, | two | bags.", "Žinoma, | du | maišeliai.", "Žinoma, du maišeliai.")],
    bags_three: [t("Sure, | three | bags.", "Žinoma, | trys | maišeliai.", "Žinoma, trys maišeliai.")],
    bag_own_ok: [t("Perfect! | I'll use | your | bag.", "Puiku! | Naudosiu | jūsų | maišelį.", "Puiku! Sudėsiu į jūsų maišelį.")],
    bag_price: [t("They're | ten | cents | each.", "Jie kainuoja | dešimt | centų | kiekvienas.", "Jie kainuoja po dešimt centų.")],

    // --- the total and paying
    say_total: [
      t("Your | total | is | {$total}.", "Jūsų | suma | yra | {$total}.", "Iš viso {$total}."),
      t("That'll be | {$total}.", "Tai bus | {$total}.", "Iš viso {$total}."),
      t("Okay, | that | comes to | {$total}.", "Gerai, | tai | sudaro | {$total}.", "Gerai, iš viso {$total}."),
    ],
    total_so_far: [t("It's | {$total} | so far.", "Tai yra | {$total} | kol kas.", "Kol kas – {$total}.")],
    new_total: [
      t("Your | new | total | is | {$total}.", "Jūsų | nauja | suma | yra | {$total}.", "Nauja suma – {$total}."),
      t("So | that's | {$total} | now.", "Taigi | tai yra | {$total} | dabar.", "Taigi dabar iš viso {$total}."),
    ],
    ask_pay: [
      t("Cash | or | card?", "Grynaisiais | ar | kortele?", "Grynaisiais ar kortele?"),
      t("Will | that | be | cash | or | card?", "Ar | tai | bus | grynaisiais | ar | kortele?", "Mokėsite grynaisiais ar kortele?",
        { flags: { 0: "“Will” in a question = the particle ar; the future sits on bus (linked to “be”)." } }),
    ],
    card_later: [t("Sure, | card | is fine.", "Žinoma, | kortele | galima.", "Žinoma, galima ir kortele.")],
    phone_later: [t("Sure, | Apple Pay | is fine.", "Žinoma, | „Apple Pay“ | tinka.", "Žinoma, galima ir „Apple Pay“.")],
    cash_ok: [t("Sure, | cash | is fine.", "Žinoma, | grynaisiais | galima.", "Žinoma, galima ir grynaisiais.")],
    ask_debit: [t("Debit | or | credit?", "Debetinė | ar | kredito?", "Debetinė ar kredito kortelė?")],
    tap_pin: [
      t("Great! | Just | tap | it | here | and | enter | your | PIN.", "Puiku! | Tiesiog | pridėkite | ją | čia | ir | įveskite | savo | PIN kodą.",
        "Puiku! Tiesiog pridėkite kortelę čia ir įveskite PIN kodą.", { flags: { 3: "“it” = the card (kortelė), hence ją." } }),
      t("Now | just | tap | it | here | and | enter | your | PIN.", "Dabar | tiesiog | pridėkite | ją | čia | ir | įveskite | savo | PIN kodą.",
        "Dabar tiesiog pridėkite kortelę čia ir įveskite PIN kodą.", { flags: { 3: "“it” = the card (kortelė), hence ją." } }),
    ],
    tap_credit: [t("Okay, | just | tap | it | here.", "Gerai, | tiesiog | pridėkite | ją | čia.", "Gerai, tiesiog pridėkite kortelę čia.", { flags: { 3: "“it” = the card (kortelė), hence ją." } })],
    tap_phone: [t("Sure! | Just | hold | your | phone | here.", "Žinoma! | Tiesiog | prilaikykite | savo | telefoną | čia.", "Žinoma! Tiesiog prilaikykite telefoną čia.")],
    tap_again: [t("Go ahead | whenever | you're | ready.", "Prašom | kai tik | jūs esate | {m:pasiruošęs|f:pasiruošusi}.", "Prašom, kai tik būsite {m:pasiruošęs|f:pasiruošusi}.")],
    pin_yes: [t("Yes, | please | enter | your | PIN.", "Taip, | prašom | įvesti | savo | PIN kodą.", "Taip, įveskite PIN kodą.")],
    pin_credit: [t("No, | just | tap | it.", "Ne, | tiesiog | pridėkite | ją.", "Ne, tiesiog pridėkite kortelę.", { flags: { 3: "“it” = the card (kortelė), hence ją." } })],
    no_pin_reply: [
      t("No | problem. | Choose | credit, | and | you | won't need | a | PIN.", "Jokių | problemų. | Pasirinkite | „Credit“, | ir | jums | nereikės | — | PIN kodo.",
        "Jokių problemų. Pasirinkite „Credit“ – tada PIN kodo nereikės."),
    ],
    ask_cashback: [
      t("Would | you | like | any | cash back?", "Ar | jūs | norėtumėte | — | grynųjų?", "Ar norėtumėte išsiimti grynųjų?",
        { flags: { 0: FLAG_WOULD, 3: "Partitive: the genitive grynųjų carries “any”." } }),
      t("Any | cash back | today?", "Ar | grynųjų | šiandien?", "Ar išsiimsite grynųjų?", { flags: { 0: "“Any” in a question = the particle ar; the genitive grynųjų carries the partitive." } }),
    ],
    cashback_explain: [
      t("You | can | get | cash | with | your | card | right here.", "Jūs | galite | gauti | grynųjų | su | savo | kortele | čia pat.", "Galite čia pat kortele išsiimti grynųjų."),
    ],
    debit_explain: [
      t("With | debit, | you | enter | your | PIN. | With | credit, | you | just | tap.", "Su | debetine kortele, | jūs | įvedate | savo | PIN kodą. | Su | kredito kortele, | jūs | tiesiog | pridedate.",
        "Su debetine kortele įvedate PIN kodą, o su kredito – tiesiog pridedate kortelę."),
    ],
    card_retry: [t("Hmm, | try | inserting | it | instead.", "Hmm, | pabandykite | įkišti | ją | vietoj to.", "Hmm, pabandykite kortelę įkišti.", { flags: { 3: "“it” = the card (kortelė), hence ją." } })],
    card_retry_phone: [t("Hmm, | try | it | one | more | time.", "Hmm, | pabandykite | tai | — | dar | kartą.", "Hmm, pabandykite dar kartą.", { flags: { 3: "“one” (one more time): dar kartą carries it (linked to “more”)." } })],
    cashback_how_much: [t("Sure! | How much?", "Žinoma! | Kiek?", "Žinoma! Kiek?")],
    cashback_ok: [t("Okay, | {$amount} | cash back.", "Gerai, | {$amount} | grynaisiais.", "Gerai, {$amount} grynaisiais.")],
    cashback_here: [t("And | here's | your | {$amount}.", "Ir | štai | jūsų | {$amount}.", "Ir štai jūsų {$amount}.")],
    cashback_bad: [
      t("Sorry, | I | can't do | that | amount. | Twenty | or | forty?", "Atsiprašau, | aš | negaliu išmokėti | tokios | sumos. | Dvidešimt | ar | keturiasdešimt?",
        "Atsiprašau, tokios sumos išmokėti negaliu. Dvidešimt ar keturiasdešimt?"),
    ],
    cash_wait: [
      t("Sure! | That's | {$total}.", "Žinoma! | Tai yra | {$total}.", "Žinoma! Iš viso {$total}."),
      t("Okay, | {$total}, | please.", "Gerai, | {$total}, | prašom.", "Gerai, {$total}, prašom."),
    ],
    cash_again: [
      t("That's | {$total}, | whenever | you're | ready.", "Tai yra | {$total}, | kai tik | jūs esate | {m:pasiruošęs|f:pasiruošusi}.",
        "Iš viso {$total} – kai tik būsite {m:pasiruošęs|f:pasiruošusi}."),
    ],
    out_of_10: [t("Out of | ten.", "Iš | dešimties.", "Iš dešimties.")],
    out_of_20: [t("Out of | twenty.", "Iš | dvidešimties.", "Iš dvidešimties.")],
    out_of_50: [t("Out of | fifty.", "Iš | penkiasdešimties.", "Iš penkiasdešimties.")],
    out_of_100: [t("Out of | a | hundred.", "Iš | — | šimto.", "Iš šimto.")],
    change_is: [
      t("Thanks! | Here's | your | change: | {$price}.", "Ačiū! | Štai | jūsų | grąža: | {$price}.", "Ačiū! Štai jūsų grąža: {$price}."),
      t("And | {$price} | is | your | change.", "Ir | {$price} | yra | jūsų | grąža.", "Jūsų grąža – {$price}."),
    ],
    cash_exact: [t("Perfect, | thank | you!", "Puiku, | dėkoju | jums!", "Puiku, ačiū!")],
    change_back: [t("Thanks! | And | here's | your | change.", "Ačiū! | Ir | štai | jūsų | grąža.", "Ačiū! Štai jūsų grąža."), t("Thank | you! | Here's | your | change.", "Dėkoju | jums! | Štai | jūsų | grąža.", "Ačiū! Štai jūsų grąža.")],
    paid_thanks: [t("Perfect, | thanks!", "Puiku, | ačiū!", "Puiku, ačiū!"), t("Thank | you!", "Dėkoju | jums!", "Ačiū!")],
    short_cash: [t("Oh, | the | total | is | {$total}.", "O, | — | suma | yra | {$total}.", "O, iš viso {$total}.")],
    no_tips: [t("That's | very | kind, | but | I | can't take | tips.", "Tai yra | labai | malonu, | bet | aš | negaliu priimti | arbatpinigių.", "Labai malonu, bet arbatpinigių priimti negaliu.")],

    // --- receipt and goodbye
    ask_receipt: [
      t("Do | you | want | your | receipt?", "Ar | jūs | norite | savo | čekio?", "Ar reikia čekio?", { flags: { 0: FLAG_DO } }),
      t("Receipt?", "Čekio?", "Čekio?"),
    ],
    receipt_here: [t("Here's | your | receipt.", "Štai | jūsų | čekis.", "Štai jūsų čekis."), t("And | here's | your | receipt.", "Ir | štai | jūsų | čekis.", "Ir štai jūsų čekis.")],
    receipt_later: [t("Sure! | It'll print | when | you | pay.", "Žinoma! | Jis atsispausdins, | kai | jūs | sumokėsite.", "Žinoma! Jis atsispausdins, kai sumokėsite.")],
    receipt_no_ok: [t("No | receipt? | No | problem.", "Be | čekio? | Jokių | problemų.", "Čekio nereikia? Jokių problemų.")],
    bye_after: [
      t("Have | a | nice | day!", "Linkiu | — | geros | dienos!", "Geros dienos!"),
      t("Have | a | good | one!", "Linkiu | — | geros | dienos!", "Geros dienos!", { flags: { 3: "“one” (have a good one) = the day; Lithuanian names it, dienos." } }),
      t("Thanks | for | shopping | with us!", "Ačiū, | kad | apsipirkote | pas mus!", "Ačiū, kad apsipirkote pas mus!"),
    ],

    // --- small replies
    ack: [t("Okay.", "Gerai.", "Gerai."), t("Got it.", "Supratau.", "Supratau."), t("Sure.", "Žinoma.", "Žinoma.")],
    sure: [t("Sure!", "Žinoma!", "Žinoma!"), t("Of course!", "Žinoma!", "Žinoma!")],
    no_problem: [t("No | problem.", "Jokių | problemų.", "Jokių problemų.")],
  },

  domains: {
    total: () => TOTALS,
    price: () => CHANGES, // the change counted back after paying cash
    amount: () => Array.from({ length: 20 }, (_, i) => (i + 1) * 500),
  },

  hints: {
    sco: {
      lt: "Pasikviesti kasininką ir paaiškinti, kas nutiko",
      items: [
        { id: "sco_help", s: t("Excuse me, | can | you | help | me?", "Atsiprašau, | ar galite | jūs | padėti | man?", "Atsiprašau, ar galite man padėti?") },
        { id: "sco_says", s: t("The | machine | says | “Unexpected | item | in | the | bagging | area.”", "— | Aparatas | rašo | „Netikėta | prekė | — | — | pakavimo | zonoje.“",
          "Aparatas rašo: „Netikėta prekė pakavimo zonoje.“", { flags: { 5: "“in”: the locative zonoje carries it (C-CASE-DASH, “bagging” intervenes)." } }),
          note: "Tai dainos pavadinimo frazė – savitarnos kasa ją sako, kai svarstyklės „mato“ ką nors netikėto." },
        { id: "sco_broken", s: t("This | machine | isn't working.", "Šis | aparatas | neveikia.", "Šis aparatas neveikia.") },
      ],
    },
    sco_what: {
      lt: "Paaiškinti, kas nutiko su savitarnos kasa",
      items: [
        { id: "sco_says", s: t("The | machine | says | “Unexpected | item | in | the | bagging | area.”", "— | Aparatas | rašo | „Netikėta | prekė | — | — | pakavimo | zonoje.“",
          "Aparatas rašo: „Netikėta prekė pakavimo zonoje.“", { flags: { 5: "“in”: the locative zonoje carries it (C-CASE-DASH, “bagging” intervenes)." } }) },
        { id: "sco_wait_says", s: t("It | says | “Please | wait | for | assistance.”", "Jis | rašo | „Prašome | palaukti | — | pagalbos.“", "Rašo: „Prašome palaukti pagalbos.“",
          { flags: { 4: "“for”: laukti takes the genitive pagalbos directly." } }) },
        { id: "sco_broken", s: t("This | machine | isn't working.", "Šis | aparatas | neveikia.", "Šis aparatas neveikia.") },
      ],
    },
    found: {
      lt: "Atsakyti, ar viską radai", slot: "product", examples: ["eggs", "coffee", "rice", "toilet_paper"],
      items: [
        { id: "found_all", s: t("Yes, | I | found | everything, | thanks.", "Taip, | aš | radau | viską, | ačiū.", "Taip, viską radau, ačiū.") },
        { id: "found_did", s: t("Yes, | I | did, | thanks!", "Taip, | aš | radau, | ačiū!", "Taip, radau, ačiū!", { flags: { 2: "Elliptical “did” (= did find): Lithuanian repeats the verb, radau." } }) },
        { id: "nf_product", s: t("I | couldn't find | {X.the}.", "Aš | neradau | {X.the:gen}.", "Neradau {X:gen}.") },
        { id: "q_where", s: t("Where | are | {X.the}?", "Kur | yra | {X.the:nom}?", "Kur yra {X:nom}?"), only: (e) => !!e.attrs?.enPl },
        { id: "q_where", s: t("Where's | {X.the}?", "Kur yra | {X.the:nom}?", "Kur yra {X:nom}?"), only: (e) => !e.attrs?.enPl },
      ],
    },
    missing: {
      lt: "Pasakyti, ko neradai", slot: "product", examples: ["eggs", "coffee", "rice", "butter"],
      items: [
        { id: "need_product", s: t("{X}.", "{X:gen}.", "{X:gen}."), note: "Užtenka pasakyti prekės pavadinimą." },
        { id: "nf_product", s: t("I | couldn't find | {X.the}.", "Aš | neradau | {X.the:gen}.", "Neradau {X:gen}.") },
        { id: "q_where", s: t("Where | are | {X.the}?", "Kur | yra | {X.the:nom}?", "Kur yra {X:nom}?"), only: (e) => !!e.attrs?.enPl },
        { id: "q_where", s: t("Where's | {X.the}?", "Kur yra | {X.the:nom}?", "Kur yra {X:nom}?"), only: (e) => !e.attrs?.enPl },
      ],
    },
    ask: {
      lt: "Paklausti, kur rasti prekę", slot: "product", examples: ["eggs", "coffee", "bread", "water"],
      items: [
        { id: "q_where", s: t("Where | are | {X.the}?", "Kur | yra | {X.the:nom}?", "Kur yra {X:nom}?"), only: (e) => !!e.attrs?.enPl },
        { id: "q_where", s: t("Where's | {X.the}?", "Kur yra | {X.the:nom}?", "Kur yra {X:nom}?"), only: (e) => !e.attrs?.enPl },
        { id: "q_have", s: t("Do | you | have | {X}?", "Ar | jūs | turite | {X:gen}?", "Ar turite {X:gen}?", { flags: { 0: FLAG_DO } }) },
        { id: "q_restroom", s: t("Where's | the | restroom?", "Kur yra | — | tualetas?", "Kur yra tualetas?") },
        { id: "q_atm", s: t("Is | there | an | ATM | here?", "Ar yra | — | — | bankomatas | čia?", "Ar čia yra bankomatas?",
          { flags: { 1: "Existential “there”: no Lithuanian word; yra carries it (linked to “Is”)." } }) },
      ],
    },
    rewards: {
      lt: "Atsakyti apie lojalumo kortelę",
      items: [
        { id: "rw_no", s: t("No, | I | don't.", "Ne, | aš | neturiu.", "Ne, neturiu.", { flags: { 2: "Elliptical “don't” (= don't have): Lithuanian repeats the verb, neturiu." } }) },
        { id: "rw_have", s: t("Yes, | here you go.", "Taip, | prašom.", "Taip, prašom.") },
        { id: "rw_forgot", s: t("I | forgot | my | card | at home.", "Aš | pamiršau | savo | kortelę | namie.", "Kortelę pamiršau namie.") },
        { id: "rw_lookup", s: t("Can | you | look | me | up | by | phone | number?", "Ar galite | jūs | surasti | mane | — | pagal | telefono | numerį?",
          "Ar galite mane surasti pagal telefono numerį?", { flags: { 4: "Discontinuous “look … up”: surasti carries “up” (linked to “look”)." } }) },
        { id: "rw_app", s: t("It's | on | my | phone.", "Ji yra | — | mano | telefone.", "Ji mano telefone.", { flags: { 1: "“on”: the locative telefone carries it (C-CASE-DASH, “my” intervenes)." } }) },
        { id: "rw_what", s: t("What's | a | loyalty | card?", "Kas yra | — | lojalumo | kortelė?", "Kas yra lojalumo kortelė?") },
        { id: "rw_join", s: t("Can | I | sign up?", "Ar galiu | aš | užsiregistruoti?", "Ar galiu užsiregistruoti?") },
        { id: "rw_heart", s: t("No, | but | I've got | a | heart!", "Ne, | bet | aš turiu | — | širdį!", "Ne, bet turiu širdį!"), note: "Eilutė iš dainos – Marcus supras juoką." },
      ],
    },
    join: {
      lt: "Atsakyti, ar nori prisijungti",
      items: [
        { id: "rw_join", s: t("Sure! | Can | I | sign up?", "Žinoma! | Ar galiu | aš | užsiregistruoti?", "Žinoma! Ar galiu užsiregistruoti?") },
        { id: "rw_what", s: t("What's | a | loyalty | card?", "Kas yra | — | lojalumo | kortelė?", "Kas yra lojalumo kortelė?") },
        { id: "yn_no_thanks", s: t("No, | thanks.", "Ne, | ačiū.", "Ne, ačiū.") },
      ],
    },
    phone: {
      lt: "Pasakyti telefono numerį",
      items: [
        { id: "ph_its", s: t("It's | 555-0142.", "Tai | 555-0142.", "555-0142.", { say: "It's five five five, oh one four two." }) },
        { id: "ph_none", s: t("Sorry, | I | don't have | a | US | number.", "Atsiprašau, | aš | neturiu | — | JAV | numerio.", "Atsiprašau, neturiu JAV telefono numerio.") },
      ],
    },
    id: {
      lt: "Parodyti asmens dokumentą",
      items: [
        { id: "id_here", s: t("Sure, | here you go.", "Žinoma, | prašom.", "Žinoma, prašom.") },
        { id: "id_here_passport", s: t("Here's | my | passport.", "Štai | mano | pasas.", "Štai mano pasas.") },
        { id: "id_passport", s: t("Is | a | passport | okay?", "Ar | — | pasas | tinka?", "Ar tinka pasas?",
          { flags: { 0: "“Is” in a yes/no question = the particle ar; the verb tinka takes over the copula (linked to “okay”)." } }) },
        { id: "id_none", s: t("Sorry, | I | don't have | it | with me.", "Atsiprašau, | aš | neturiu | jo | su savimi.", "Atsiprašau, neturiu jo su savimi.") },
      ],
    },
    price: {
      lt: "Pasakyti apie akciją arba paprašyti patikrinti kainą",
      items: [
        { id: "pc_sale", s: t("I | think | they're | on sale.", "Aš | manau, | jie yra | su nuolaida.", "Manau, jie su nuolaida.") },
        { id: "pc_sign", s: t("The | sign | said | two | for | five.", "— | Etiketėje | buvo parašyta | du | už | penkis.", "Etiketėje buvo parašyta: du už penkis."),
          note: "„Two for five“ – du už penkis dolerius." },
        { id: "pc_check", s: t("Could | you | do | a | price | check?", "Ar galėtumėte | jūs | atlikti | — | kainos | patikrinimą?", "Ar galėtumėte patikrinti kainą?") },
        { id: "pc_have", s: t("Can | I | have | a | price | check?", "Ar galiu | aš | gauti | — | kainos | patikrinimą?", "Ar galima patikrinti kainą?") },
        { id: "pc_wrong", s: t("I | think | that | price | is | wrong.", "Aš | manau, | ta | kaina | yra | neteisinga.", "Manau, ta kaina neteisinga.") },
        { id: "pc_ok", s: t("That's | fine.", "Tai | tinka.", "Tinka."), note: "Jei sutinki su kaina." },
      ],
    },
    second: {
      lt: "Nuspręsti, ar imsi antrą pakelį",
      items: [
        { id: "pc_another", s: t("Sure, | I'll take | another | one.", "Žinoma, | paimsiu | dar | vieną.", "Žinoma, paimsiu dar vieną.") },
        { id: "pc_two", s: t("Two, | please!", "Du, | prašau!", "Du, prašau!") },
        { id: "pc_just_one", s: t("No, | just | one, | thanks.", "Ne, | tik | vieną, | ačiū.", "Ne, tik vieną, ačiū.") },
      ],
    },
    bags: {
      lt: "Atsakyti, ar reikia maišelio",
      items: [
        { id: "bag_paper", s: t("Paper, | please.", "Popierinį, | prašau.", "Popierinį, prašau.") },
        { id: "bag_plastic", s: t("Plastic | is fine.", "Plastikinis | tinka.", "Plastikinis tinka.") },
        { id: "bag_own", s: t("I | brought | my own | bag.", "Aš | atsinešiau | savo | maišelį.", "Atsinešiau savo maišelį.") },
        { id: "bag_none", s: t("No, | thanks, | I | don't need | a | bag.", "Ne, | ačiū, | man | nereikia | — | maišelio.", "Ne, ačiū, maišelio nereikia.",
          { flags: { 2: "“I” → dative man: Lithuanian says “to me (it) is not needed”." } }) },
        { id: "bag_one", s: t("One | bag, | please.", "Vieną | maišelį, | prašau.", "Vieną maišelį, prašau.") },
        { id: "q_bag_price", s: t("How much | are | the | bags?", "Kiek | kainuoja | — | maišeliai?", "Kiek kainuoja maišeliai?") },
      ],
    },
    bag_kind: {
      lt: "Pasirinkti: popierinis ar plastikinis",
      items: [
        { id: "bag_paper", s: t("Paper, | please.", "Popierinį, | prašau.", "Popierinį, prašau.") },
        { id: "bag_plastic", s: t("Plastic | is fine.", "Plastikinis | tinka.", "Plastikinis tinka.") },
        { id: "bag_either", s: t("Either | is fine.", "Bet kuris | tinka.", "Tinka bet kuris.") },
      ],
    },
    pay: {
      lt: "Susimokėti",
      items: [
        { id: "pay_card_short", s: t("Card, | please.", "Kortele, | prašau.", "Kortele, prašau.") },
        { id: "pay_cash_short", s: t("Cash, | please.", "Grynaisiais, | prašau.", "Grynaisiais, prašau.") },
        { id: "pay_card", s: t("Can | I | pay | by card?", "Ar galiu | aš | sumokėti | kortele?", "Ar galiu sumokėti kortele?") },
        { id: "here_you_go", s: t("Here you go.", "Prašom.", "Prašom.") },
        { id: "apple_pay", s: t("Do | you | take | Apple Pay?", "Ar | jūs | priimate | „Apple Pay“?", "Ar priimate „Apple Pay“?", { flags: { 0: FLAG_DO } }) },
        { id: "q_total", s: t("How much | is | it?", "Kiek | kainuoja | tai?", "Kiek kainuoja?") },
      ],
    },
    cash: {
      lt: "Paduoti pinigus",
      items: [
        { id: "here_you_go", s: t("Here you go.", "Prašom.", "Prašom.") },
        { id: "cash_twenty", s: t("Here's | twenty.", "Štai | dvidešimt.", "Štai dvidešimt dolerių.") },
        { id: "cash_fifty", s: t("Sorry, | I | only | have | a | fifty.", "Atsiprašau, | aš | tik | turiu | — | penkiasdešimties banknotą.",
          "Atsiprašau, turiu tik penkiasdešimties dolerių banknotą.") },
      ],
    },
    debit: {
      lt: "Pasakyti: debetinė ar kredito kortelė",
      items: [
        { id: "debit", s: t("Debit, | please.", "Debetine, | prašau.", "Debetine kortele, prašau."), note: "Su debetine kortele paprastai įvedamas PIN kodas." },
        { id: "credit", s: t("Credit, | please.", "Kredito, | prašau.", "Kredito kortele, prašau."), note: "JAV kasininkai dažnai klausia „Debit or credit?“." },
        { id: "no_pin", s: t("I | don't know | my | PIN.", "Aš | nežinau | savo | PIN kodo.", "Nežinau savo PIN kodo.") },
      ],
    },
    cashback: {
      lt: "Atsakyti, ar išsiimsi grynųjų",
      items: [
        { id: "cb_no", s: t("No | cash back, | thanks.", "Be | grynųjų, | ačiū.", "Grynųjų nereikia, ačiū.") },
        { id: "cb_amount", s: t("Yes, | twenty | dollars, | please.", "Taip, | dvidešimt | dolerių, | prašau.", "Taip, dvidešimt dolerių, prašau."),
          note: "„Cash back“ – kasoje kartu su pirkiniais nuo kortelės nurašomi ir grynieji, kuriuos kasininkas iškart atiduoda." },
        { id: "cb_can", s: t("Can | I | get | forty | dollars?", "Ar galiu | aš | gauti | keturiasdešimt | dolerių?", "Ar galiu gauti keturiasdešimt dolerių?") },
      ],
    },
    charge: {
      lt: "Pridėti kortelę (ir įvesti PIN kodą)",
      items: [
        { id: "done_ok", s: t("Okay, | done.", "Gerai, | atlikta.", "Gerai, atlikta.") },
        { id: "done_like", s: t("Like | this?", "Štai | taip?", "Taip?") },
        { id: "no_pin", s: t("I | don't know | my | PIN.", "Aš | nežinau | savo | PIN kodo.", "Nežinau savo PIN kodo.") },
      ],
    },
    receipt: {
      lt: "Atsakyti, ar reikia čekio",
      items: [
        { id: "yn_yes_please", s: t("Yes, | please.", "Taip, | prašau.", "Taip, prašau.") },
        { id: "no_receipt", s: t("No | receipt, | thanks.", "Be | čekio, | ačiū.", "Čekio nereikia, ačiū.") },
        { id: "receipt", s: t("Can | I | get | a | receipt?", "Ar galiu | aš | gauti | — | čekį?", "Ar galiu gauti čekį?") },
      ],
    },
  },

  tips: TIPS,

  mission: [
    { lt: "Pasikviesk pagalbą prie savitarnos kasos", optional: true, when: (c) => !!c.s.sco, done: (c) => !!c.s.scoFixed },
    { lt: "Atsakyk apie lojalumo kortelę", done: (c) => c.s.rewards !== undefined && !(c.s.phoneFor && !c.s.phone && !c.s.phoneSkip) && !(c.s.joinOffer && c.s.rewards === "none" && c.s.join === undefined) },
    { lt: "Parodyk asmens dokumentą (dėl vyno)", optional: true, when: (c) => !!c.s.wineTwist, done: (c) => !!c.s.idDone },
    { lt: "Išsiaiškink traškučių kainą", optional: true, when: (c) => !!c.s.priceCheck || !!c.s.checked,
      done: (c) => !!c.s.priceDone && !(c.s.checked && c.s.chips === 1 && !c.s.secondDone) },
    { lt: "Pasakyk, ar reikia maišelio", optional: true, when: (c) => !c.s.ownBag, done: (c) => c.s.bags !== undefined && !((c.s.bags ?? 0) > 0 && c.s.askKind && !c.s.bagKind) },
    { lt: "Susimokėk", done: (c) => !!c.s.paid },
  ],

  // -------------------------------------------------------------------------

  steps: [
    // the self-checkout twist: the machine speaks until the learner calls Marcus or explains
    { id: "sco", when: (c) => !!c.s.sco && !c.s.scoFixed && !c.s.scoCalled, done: () => false,
      ask: (c) => { if (!c.s.scoAsked) { c.s.scoAsked = true; machine(c, "sco_unexpected"); } machine(c, "sco_wait"); },
      expects: ["call_help_ctx", "sco_problem"],
      suggest: [{ lt: "Pasikviesti kasininką ir paaiškinti, kas nutiko", hint: "sco" }],
      help: (c) => { c.s.scoCalled = true; c.say("sco_what"); } },
    { id: "sco_explain", when: (c) => !!c.s.sco && !!c.s.scoCalled && !c.s.scoFixed, done: () => false,
      ask: (c) => { c.say(c.s.scoWhatAsked ? "sco_what_again" : "sco_what"); c.s.scoWhatAsked = true; },
      expects: ["sco_problem"],
      suggest: [{ lt: "Paaiškinti, kas nutiko su savitarnos kasa", hint: "sco_what" }],
      help: (c) => { fixSco(c); chain(c); } },
    { id: "find", when: (c) => !c.s.sco, done: (c) => c.s.found !== undefined,
      ask: (c) => {
        if (c.s.greeted) c.say("find_q");
        else c.say(c.visits >= 1 && c.chance(0.4) ? "greet_back" : "greet_find");
        c.s.greeted = true;
      },
      expects: ["found_all", "found_ctx", "not_found", "not_found_ctx", "ask_where", "ask_have", "product_ctx"],
      suggest: [
        { lt: "Atsakyti, ar viską radai", hint: "found", options: ["eggs", "coffee", "rice", "butter"] },
        { lt: "Paklausti, kur rasti prekę", hint: "ask", options: "product" },
      ],
      yes: (c) => { c.s.found = true; c.say("found_great"); },
      no: (c) => {
        c.s.found = false;
        c.say("missing_what");
        c.expect({ id: "missing", optional: true, expects: ["product_ctx", "not_found", "not_found_ctx", "ask_where", "ask_have"],
          suggest: [{ lt: "Pasakyti, ko neradai", hint: "missing", options: "product" }],
          ask: (cc) => cc.say("missing_what") });
      } },
    { id: "rewards", done: (c) => c.s.rewards !== undefined,
      ask: (c) => c.say("rewards_q"),
      expects: ["rewards_have", "rewards_have_ctx", "rewards_no", "rewards_no_ctx", "rewards_forgot", "rewards_forgot_ctx", "rewards_lookup", "rewards_what", "rewards_what_ctx", "rewards_join", "rewards_join_ctx"],
      suggest: [
        { lt: "Atsakyti, ar turi lojalumo kortelę", hint: "rewards" },
        { lt: "Paklausti, kur rasti prekę", hint: "ask", options: "product" },
      ],
      yes: (c) => { c.s.rewards = "card"; c.say("rewards_scan"); },
      no: (c) => rewardsNo(c),
      help: (c) => { lookup(c); c.say("lookup_offer"); chain(c); } },
    { id: "join", when: (c) => c.s.rewards === "none" && !!c.s.joinOffer && c.s.join === undefined, done: (c) => c.s.join !== undefined,
      ask: (c) => c.say("join_offer"), expects: ["rewards_join", "rewards_join_ctx", "rewards_what", "rewards_what_ctx", "join_no_ctx", "rewards_no", "rewards_no_ctx"],
      suggest: [{ lt: "Atsakyti, ar nori prisijungti prie lojalumo programos", hint: "join" }],
      yes: (c) => supermarket.handlers.rewards_join(c, {}, { intent: "rewards_join", slots: {}, tags: [] }),
      no: (c) => { c.s.join = false; c.say("rewards_no_ok"); },
      help: (c) => { c.say("rewards_explain"); c.say("join_offer"); } },
    { id: "phone", when: (c) => !!c.s.phoneFor && !c.s.phone && !c.s.phoneSkip, done: (c) => !!c.s.phone || !!c.s.phoneSkip,
      ask: (c) => { if (c.s.phonePrompted) { c.s.phonePrompted = false; return; } c.say("ask_phone"); },
      expects: ["phone_ctx", "phone_none"],
      suggest: [{ lt: "Pasakyti telefono numerį", hint: "phone" }],
      no: (c) => { c.s.phoneSkip = true; if (c.s.rewards === "lookup") c.s.rewards = "none"; c.say("rewards_no_ok"); } },
    { id: "id", when: (c) => !!c.s.wine && !c.s.idDone, done: (c) => !!c.s.idDone,
      ask: (c) => { if (!c.s.idAsked) { c.s.idAsked = true; c.twist("id_check"); c.say("id_q"); } else c.say("id_ask_again"); },
      expects: ["id_show", "id_show_ctx", "id_ask_ok", "id_none", "id_none_ctx", "id_age", "id_why", "id_why_ctx", "wine_remove", "wine_remove_ctx"],
      suggest: [{ lt: "Parodyti asmens dokumentą", hint: "id" }],
      yes: (c) => idShown(c), no: (c) => idNone(c) },
    { id: "price", when: (c) => !!c.s.priceCheck && !c.s.priceDone, done: (c) => !!c.s.priceDone,
      ask: (c) => {
        if (!c.s.priceQ) c.s.priceQ = c.chance(0.5) ? "sign" : "right";
        c.say(c.s.priceQ === "sign" ? "price_q_sign" : "price_q_right");
      },
      expects: ["sale_claim", "price_wrong", "price_wrong_ctx", "price_check_req", "price_check_ctx", "price_ok_ctx", "no_sign_ctx", "chips_remove", "chips_remove_ctx"],
      suggest: [{ lt: "Pasakyti, kad lentynoje buvo akcija („2 for $5“), arba sutikti su kaina", hint: "price" }],
      yes: (c) => { if (c.s.priceQ === "sign") priceCheck(c, true); else priceAccept(c); },
      no: (c) => { if (c.s.priceQ === "sign") priceAccept(c); else priceCheck(c, true); },
      help: (c) => priceCheck(c, false) },
    { id: "second", when: (c) => !!c.s.checked && c.s.chips === 1 && !c.s.secondDone && !c.s.paid, done: (c) => !!c.s.secondDone,
      ask: (c) => c.say("second_q"), expects: ["second_yes_ctx", "second_no_ctx", "chips_remove", "chips_remove_ctx", "qty_one_ctx"],
      suggest: [{ lt: "Nuspręsti, ar imsi antrą traškučių pakelį", hint: "second" }],
      yes: (c) => supermarket.handlers.second_yes_ctx(c, {}, { intent: "second_yes_ctx", slots: {}, tags: [] }),
      no: (c) => supermarket.handlers.second_no_ctx(c, {}, { intent: "second_no_ctx", slots: {}, tags: [] }) },
    { id: "bags", when: (c) => !c.s.ownBag, done: (c) => c.s.bags !== undefined,
      ask: (c) => {
        if (!c.s.bagQ) c.s.bagQ = c.pick(["would", "kind", "need"]);
        c.say(c.s.bagQ === "kind" ? "bag_q_kind" : c.s.bagQ === "need" ? "bag_q_need" : "bag_q_would");
      },
      expects: ["bag_want", "bag_kind_ctx", "bag_kind_neg_ctx", "bag_no", "bag_no_ctx", "bag_price_q", "bag_price_ctx", "ask_bags", "qty_one_ctx"],
      suggest: [{ lt: "Atsakyti, ar reikia maišelio (popierinis ar plastikinis)", hint: "bags" }],
      // "Yes" (even to "Paper or plastic?"): a bag; the kind question follows once (a second "yes" = paper)
      yes: (c) => { c.s.bags = 1; c.s.askKind = true; changed(c); },
      no: (c) => { c.s.bags = 0; c.say("no_problem"); } },
    { id: "bag_kind", when: (c) => (c.s.bags ?? 0) > 0 && !!c.s.askKind && !c.s.bagKind, done: (c) => !!c.s.bagKind,
      ask: (c) => c.say("bag_kind_q"), expects: ["bag_kind_ctx", "bag_kind_neg_ctx", "bag_want", "bag_no", "bag_no_ctx", "bag_price_ctx", "qty_one_ctx"],
      suggest: [{ lt: "Pasirinkti: popierinis ar plastikinis", hint: "bag_kind" }],
      yes: (c) => { c.s.bagKind = "paper"; c.say("bag_ok"); },
      no: (c) => { c.s.bags = 0; c.s.bagKind = "none"; changed(c); c.say("no_problem"); } },
    { id: "pay", done: (c) => !!c.s.paid || (!!c.s.totalSaid && !!c.s.method),
      ask: (c) => {
        if (c.s.totalSaid) { c.say("ask_pay"); return; } // asked again: the total hasn't changed
        const first = !c.s.totalAnnounced;
        c.s.totalSaid = true; c.s.totalAnnounced = true;
        c.say("say_total", { total: total(c) });
        if (c.s.method === "cash") { c.s.cashAsked = true; return; } // "Cash" said before: Marcus waits for the money
        if (c.s.method) { chain(c); return; }
        if (!first || c.chance(0.75)) c.say("ask_pay");
      },
      expects: ["pay_card", "pay_cash", "pay_phone", "here_you_go", "no_cash", "no_card", "total_q", "price_wrong_ctx", "qty_one_ctx", "chips_one", "chips_two"],
      suggest: [{ lt: "Susimokėti kortele, grynaisiais ar telefonu", hint: "pay" }] },
    // cash: Marcus waits until the money is handed over, then counts the change
    { id: "cash", when: (c) => c.s.method === "cash" && !c.s.paid && !!c.s.totalSaid, done: (c) => !!c.s.paid,
      ask: (c) => { const first = !c.s.cashAsked; c.s.cashAsked = true; c.say(first ? "cash_wait" : "cash_again", { total: total(c) }); },
      expects: ["here_you_go", "cash_given_ctx", "change_q_ctx", "pay_card", "pay_phone", "no_cash", "keep_change", "total_q", "qty_one_ctx", "chips_one", "chips_two"],
      suggest: [{ lt: "Paduoti pinigus", hint: "cash" }],
      yes: (c) => paidCash(c, c.s.tender) },
    { id: "debit", when: (c) => c.s.method === "card" && !!c.s.askDebit && !c.s.cardType && !c.s.paid, done: (c) => !!c.s.cardType,
      ask: (c) => c.say("ask_debit"), expects: ["debit_credit", "no_pin", "qty_one_ctx"],
      suggest: [{ lt: "Pasakyti: debetinė ar kredito kortelė", hint: "debit" }],
      help: (c) => { c.say("debit_explain"); } },
    { id: "cashback", when: (c) => c.s.method === "card" && c.s.cardType !== "credit" && !!c.s.askCashback && c.s.cashback === undefined && !c.s.paid,
      done: (c) => c.s.cashback !== undefined,
      ask: (c) => c.say("ask_cashback"), expects: ["cashback_yes", "cashback_no", "cashback_amount_ctx", "cashback_what"],
      suggest: [{ lt: "Atsakyti, ar išsiimsi grynųjų (cash back)", hint: "cashback" }],
      yes: (c) => { c.s.cashback = true; },
      no: (c) => { c.s.cashback = false; } },
    { id: "cb_amount", when: (c) => c.s.method === "card" && c.s.cashback === true && !c.s.cbAmount && !c.s.paid, done: (c) => !!c.s.cbAmount || c.s.cashback !== true,
      ask: (c) => c.say("cashback_how_much"), expects: ["cashback_amount_ctx", "cashback_yes", "cashback_no"],
      suggest: [{ lt: "Pasakyti, kiek grynųjų nori", hint: "cashback" }],
      no: (c) => { c.s.cashback = false; c.say("no_problem"); } },
    { id: "charge", when: (c) => (c.s.method === "card" || c.s.method === "phone") && !c.s.paid, done: (c) => !!c.s.paid,
      ask: (c) => {
        if (c.s.tapSaid) { c.say("tap_again"); return; }
        c.s.tapSaid = true;
        c.say(c.s.method === "phone" ? "tap_phone" : c.s.cardType === "credit" ? "tap_credit" : "tap_pin");
      },
      expects: ["done_ctx", "here_you_go", "no_pin", "pin_q", "card_fail", "qty_one_ctx", "chips_one", "chips_two"],
      suggest: [{ lt: "Pridėti kortelę ir patvirtinti („Okay“)", hint: "charge" }],
      yes: (c) => charged(c) },
    { id: "receipt", when: (c) => !!c.s.paid && !!c.s.askReceipt && c.s.receipt === undefined, done: (c) => c.s.receipt !== undefined,
      ask: (c) => c.say("ask_receipt"), expects: ["receipt_no", "receipt_yes", "receipt_no_ctx"],
      suggest: [{ lt: "Atsakyti, ar reikia čekio", hint: "receipt" }],
      yes: (c) => supermarket.handlers.receipt_yes(c, {}, { intent: "receipt_yes", slots: {}, tags: [] }),
      no: (c) => supermarket.handlers.receipt_no(c, {}, { intent: "receipt_no", slots: {}, tags: [] }) },
  ],

  init: (c) => {
    c.s.chips = 1;
    c.s.sco = c.visits >= 1 && c.chance(0.35);
    c.s.scoCause = c.chance(0.5) ? "bag" : "glitch";
    c.s.scoAgain = c.chance(0.4);
    c.s.wineTwist = c.visits >= 1 && c.chance(0.35);
    c.s.wine = c.s.wineTwist;
    c.s.priceCheck = c.visits === 0 || c.chance(0.5);
    c.s.joinOffer = c.chance(0.5);
    c.s.askDebit = c.chance(0.4);
    c.s.askCashback = c.chance(0.4);
    c.s.askReceipt = c.chance(0.3);
  },

  start: (c) => {
    if (c.s.sco) { c.twist("self_checkout"); return; } // the machine speaks first (the "sco" step)
    if (c.chance(0.3)) { c.say("greet_howareyou"); c.s.greeted = true; expectHowAreYou(c); }
    // otherwise the "find" step greets: "Hi there! Did you find everything okay?"
  },

  handlers: {
    // --- self-checkout
    call_help_ctx(c) {
      if (!c.s.sco || c.s.scoFixed) { c.say("g_yes_what"); c.hold(); return; }
      c.s.scoCalled = true;
    },
    sco_problem(c, _slots, seg) {
      if (!c.s.sco || c.s.scoFixed) { c.say("ack"); return; }
      fixSco(c, seg.tags);
    },

    // --- found everything? where things are
    found_all(c) { if (c.s.found === undefined) { c.s.found = true; c.say("found_great"); } else c.say("ack"); },
    found_ctx(c) { if (c.s.found === undefined) { c.s.found = true; c.say("found_great"); } else c.say("ack"); },
    not_found(c, slots, seg) {
      if (c.s.found === undefined) c.s.found = false;
      const id = slots.product as string | undefined;
      if (seg.tags.includes("soldout")) { c.say("sold_out"); return; }
      if (!id) {
        c.say("missing_what");
        c.expect({ id: "missing", optional: true, expects: ["product_ctx", "not_found", "ask_where", "ask_have"],
          suggest: [{ lt: "Pasakyti, ko neradai", hint: "missing", options: "product" }], ask: (cc) => cc.say("missing_what") });
        return;
      }
      c.say("sorry_missed");
      sayWhere(c, id);
    },
    not_found_ctx(c, slots, seg) { supermarket.handlers.not_found(c, slots, seg); },
    product_ctx(c, slots) {
      if (c.s.found === undefined) c.s.found = false;
      sayWhere(c, slots.product);
    },
    ask_where(c, slots) {
      if (c.step === "find" && c.s.found === undefined) c.s.found = false;
      sayWhere(c, slots.product);
    },
    ask_have(c, slots) {
      if (c.step === "find" && c.s.found === undefined) c.s.found = false;
      c.say("have_yes");
      sayWhere(c, slots.product);
    },
    ask_have_unknown(c) { c.say("have_no"); },
    ask_where_unknown(c) { c.say("where_unknown"); },
    ask_restroom(c) { c.say("restroom"); },
    ask_atm(c) { c.say("atm"); },
    ask_bags(c) { c.say("bag_price"); if (c.step === "bags" || c.step === "bag_kind") c.hold(); },

    // --- rewards
    rewards_have(c, _slots, seg) {
      if (c.s.rewards !== undefined && c.s.rewards !== "none" && c.s.rewards !== "lookup") { c.say("ack"); return; }
      const app = seg.tags.includes("app");
      c.s.rewards = app ? "app" : "card";
      c.s.phoneFor = undefined;
      c.say(app ? "rewards_app" : c.step === "rewards" && /\bhere\b/i.test(c.heard) ? "rewards_thanks" : "rewards_scan");
    },
    rewards_have_ctx(c, slots, seg) { supermarket.handlers.rewards_have(c, slots, seg); },
    rewards_no(c, _slots, seg) {
      if (seg.tags.includes("heart")) c.say("heart_joke");
      if (c.step === "join" && c.s.join === undefined) { c.s.join = false; c.say("rewards_no_ok"); return; }
      rewardsNo(c);
    },
    rewards_no_ctx(c, slots, seg) { supermarket.handlers.rewards_no(c, slots, seg); },
    join_no_ctx(c) {
      if (c.s.join !== undefined || c.s.rewards !== "none") { c.say("no_problem"); return; }
      c.s.join = false; c.say("rewards_no_ok");
    },
    rewards_forgot(c) { lookup(c); if (c.s.rewards === "lookup") c.say("lookup_offer"); },
    rewards_forgot_ctx(c) { lookup(c); if (c.s.rewards === "lookup") c.say("lookup_offer"); },
    rewards_lookup(c) { lookup(c); if (c.s.rewards === "lookup") c.say("sure"); },
    phone_ctx(c, slots) {
      if (!c.s.phoneFor || c.s.phone) { c.say("ack"); return; }
      c.s.phone = slots.digits;
      if (c.s.phoneFor === "join") { c.s.rewards = "joined"; c.say("joined"); }
      else { c.s.rewards = "phone"; c.say("phone_found"); }
    },
    phone_none(c) {
      if (!c.s.phoneFor || c.s.phone) { c.say("no_problem"); return; }
      c.s.phoneSkip = true;
      if (c.s.rewards === "lookup") c.s.rewards = "none";
      c.say("rewards_no_ok");
    },
    rewards_what(c) {
      c.say("rewards_explain");
      if (c.s.rewards === undefined || c.s.rewards === "none") { c.s.rewards = "none"; c.s.joinOffer = true; }
    },
    rewards_what_ctx(c, slots, seg) { supermarket.handlers.rewards_what(c, slots, seg); },
    rewards_join_ctx(c, slots, seg) { supermarket.handlers.rewards_join(c, slots, seg); },
    rewards_join(c) {
      if (c.s.rewards === "joined" || c.s.rewards === "card" || c.s.rewards === "app" || c.s.rewards === "phone") { c.say("ack"); return; }
      c.s.rewards = "none"; c.s.joinOffer = true; c.s.join = true;
      c.s.phoneFor = "join"; c.s.phoneSkip = false;
      c.say("join_phone"); c.s.phonePrompted = true;
    },

    // --- ID for the wine
    id_show(c) { idShown(c); },
    id_show_ctx(c) { idShown(c); },
    id_ask_ok(c) { if (c.s.wine && !c.s.idDone) c.say("id_ok_passport"); idShown(c); },
    id_none(c) { idNone(c); },
    id_none_ctx(c) { idNone(c); },
    id_age(c) { if (c.s.wine && !c.s.idDone) c.say("id_age_reply"); else c.say("ack"); },
    id_why(c) { if (c.s.wine && !c.s.idDone) c.say("id_policy"); else c.say("ack"); },
    id_why_ctx(c, slots, seg) { supermarket.handlers.id_why(c, slots, seg); },
    wine_remove(c) {
      if (!c.s.wine) { c.say("ack"); return; }
      c.s.wine = false; c.s.idDone = true; changed(c);
      c.say("wine_removed");
    },

    wine_remove_ctx(c, slots, seg) { supermarket.handlers.wine_remove(c, slots, seg); },

    // --- the price check
    sale_claim(c) { priceCheck(c, true); },
    price_wrong(c) { priceCheck(c, true); },
    price_wrong_ctx(c) { priceCheck(c, true); },
    price_check_req(c) { priceCheck(c, false); },
    price_check_ctx(c) { priceCheck(c, false); },
    price_ok_ctx(c, _slots, seg) {
      // "That's right" to "Did you see a sale sign?" = yes, I saw it
      if (seg.tags.includes("right") && c.s.priceQ === "sign" && c.step === "price") { priceCheck(c, true); return; }
      priceAccept(c);
    },
    no_sign_ctx(c) { priceAccept(c); },
    chips_remove(c) {
      if (!c.s.chips || c.s.paid) { c.say("ack"); return; }
      c.s.chips = 0; c.s.priceDone = true; c.s.secondDone = true; changed(c);
      c.say("chips_removed");
    },
    chips_remove_ctx(c, slots, seg) { supermarket.handlers.chips_remove(c, slots, seg); },
    chips_price_q(c) { c.say(c.s.checked ? "chips_price_sale" : "chips_price"); if (c.step === "price") c.hold(); },
    second_yes_ctx(c) {
      if (c.s.secondDone || c.s.chips !== 1 || c.s.paid) { c.say("ack"); return; }
      c.s.chips = 2; c.s.secondDone = true; changed(c);
      c.say("second_yes_ok");
    },
    second_no_ctx(c) { chipsOne(c); },
    chips_one(c) { chipsOne(c); },
    chips_two(c) { chipsTwo(c); },
    qty_one_ctx(c) {
      // at the bag question, "just one" is one shopping bag; elsewhere it takes the second bag of chips back
      if (c.step === "bags" || c.step === "bag_kind") { supermarket.handlers.bag_want(c, {}, { intent: "bag_want", slots: {}, tags: [] }); return; }
      chipsOne(c);
    },

    // --- bags
    bag_want(c, _slots, seg) {
      if (c.s.ownBag && c.s.bags === undefined) c.s.ownBag = false;
      const n = seg.tags.includes("three") ? 3 : seg.tags.includes("two") ? 2 : 1;
      c.s.bags = n; changed(c);
      const k = bagKindFrom(seg.tags);
      const many = n === 3 ? "bags_three" : n === 2 ? "bags_two" : undefined;
      if (k) { c.s.bagKind = k; c.say(many ?? "bag_ok"); }
      else { c.s.askKind = true; if (many) c.say(many); }
    },
    bag_kind_ctx(c, _slots, seg) {
      if (c.s.paid) { c.say("ack"); return; }
      if (!c.s.bags) { c.s.bags = 1; changed(c); }
      c.s.bagKind = bagKindFrom(seg.tags) ?? "paper";
      c.say("bag_ok");
    },
    bag_kind_neg_ctx(c, _slots, seg) { supermarket.handlers.bag_kind_ctx(c, _slots, seg); },
    bag_no(c, _slots, seg) {
      if (c.s.paid) { c.say("no_problem"); return; }
      c.s.bags = 0; c.s.bagKind = "none"; changed(c);
      c.say(seg.tags.includes("own") ? "bag_own_ok" : "no_problem");
    },
    bag_no_ctx(c, slots, seg) { supermarket.handlers.bag_no(c, slots, seg); },
    bag_price_ctx(c, slots, seg) { supermarket.handlers.bag_price_q(c, slots, seg); },
    bag_price_q(c) { c.say("bag_price"); if (c.step === "bags" || c.step === "bag_kind") c.hold(); },

    // --- paying
    total_q(c) {
      if (c.step === "pay" || c.s.totalSaid) { c.s.totalSaid = true; c.say("say_total", { total: total(c) }); if (!c.s.method && !c.s.paid) c.hold(); return; }
      c.say("total_so_far", { total: total(c) });
    },
    pay_card(c) {
      if (c.s.paid) { c.say("ack"); return; }
      if (c.s.method === "card") { if (c.step === "charge") c.hold(); return; }
      c.s.method = "card";
      if (!c.s.totalSaid) c.say("card_later");
    },
    no_cash(c, slots, seg) { supermarket.handlers.pay_card(c, slots, seg); },
    no_card(c, slots, seg) { supermarket.handlers.pay_cash(c, slots, seg); },
    pay_cash(c) {
      if (c.s.paid) { c.say("paid_thanks"); return; }
      // "Cash?" to "Would you like any cash back?" is no change of payment method: the question is asked again
      if (c.s.method === "card" && (c.step === "cashback" || c.step === "cb_amount")) { c.say("ack"); return; }
      c.s.method = "cash";
      if (!c.s.totalSaid) c.say("cash_ok");
      // after the total, the "cash" step waits for the money: "Sure! That's $12.76."
    },
    pay_phone(c) {
      if (c.s.paid) { c.say("ack"); return; }
      c.s.method = "phone"; c.s.tapSaid = false;
      if (!c.s.totalSaid) c.say("phone_later");
    },
    here_you_go(c, slots) {
      switch (c.step) {
        case "rewards": supermarket.handlers.rewards_have(c, {}, { intent: "rewards_have", slots: {}, tags: [] }); return;
        case "id": idShown(c); return;
        case "charge": charged(c); return;
      }
      handMoney(c, slots.price as number | undefined);
    },
    cash_given_ctx(c, slots) { handMoney(c, slots.price as number | undefined); },
    change_q_ctx(c, slots) {
      const p = slots.price as number | undefined;
      if (c.s.paid || typeof p !== "number") { c.say("ack"); return; }
      if (c.s.totalSaid && p < total(c)) { c.say("short_cash", { total: total(c) }); c.hold(); return; }
      c.s.tender = p; c.say("sure"); c.hold(); // the learner then hands it over
    },
    keep_change(c) {
      c.say("no_tips");
      if (!c.s.paid && c.s.totalSaid) paidCash(c, c.s.tender);
    },
    debit_credit(c, _slots, seg) {
      if (c.s.paid) { c.say("ack"); return; }
      c.s.method = c.s.method ?? "card";
      c.s.cardType = seg.tags.includes("debit") ? "debit" : "credit";
      if (c.s.cardType === "credit" && c.s.tapSaid) c.say("pin_credit");
    },
    no_pin(c) {
      if (c.s.paid) { c.say("ack"); return; }
      c.s.method = c.s.method ?? "card";
      c.s.cardType = "credit";
      c.say("no_pin_reply");
      if (c.step === "charge") c.hold();
    },
    pin_q(c) {
      c.say(c.s.cardType === "credit" || c.s.method === "phone" ? "pin_credit" : "pin_yes");
      if (c.step === "charge") c.hold();
    },
    cashback_yes(c, slots) {
      if (c.s.paid || c.s.cardType === "credit") { c.say("ack"); return; }
      setCashback(c, slots.price);
    },
    cashback_amount_ctx(c, slots) {
      if (c.s.paid) { c.say("ack"); return; }
      setCashback(c, slots.price);
    },
    cashback_no(c) { if (!c.s.paid) c.s.cashback = false; },
    cashback_what(c) { c.say("cashback_explain"); },
    card_fail(c) {
      if (c.s.paid || (c.s.method !== "card" && c.s.method !== "phone")) { c.say("ack"); return; }
      c.say(c.s.method === "phone" ? "card_retry_phone" : "card_retry");
      if (c.step === "charge") c.hold();
    },
    done_ctx(c) {
      if ((c.s.method === "card" || c.s.method === "phone") && !c.s.paid) { charged(c); return; }
      c.say("ack");
    },

    // --- receipt
    receipt_no(c) {
      if (c.s.receipt === false) return;
      c.s.receipt = false;
      c.say(c.s.paid ? "no_problem" : "receipt_no_ok");
    },
    receipt_no_ctx(c, slots, seg) { supermarket.handlers.receipt_no(c, slots, seg); },
    receipt_yes(c) {
      c.s.receipt = true;
      if (c.s.paid && !c.s.receiptGiven) { c.s.receiptGiven = true; c.say("receipt_here"); c.event("give", { item: "receipt" }); }
      else if (!c.s.paid) c.say("receipt_later");
    },
  },

  finish: (c) => {
    c.complete();
    if (c.s.receipt !== false && !c.s.receiptGiven) { c.s.receiptGiven = true; c.say("receipt_here"); c.event("give", { item: "receipt" }); }
    c.event("give", { item: "groceries" });
    c.say("bye_after");
    c.expect({ id: "closing", optional: true, hints: ["g_social"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // self-checkout
    { say: "Excuse me!", intent: "call_help_ctx", step: "sco" },
    { say: "Excuse me, can you help me?", intent: "call_help_ctx", step: "sco" },
    { say: "Excuse me, the machine says unexpected item in the bagging area.", intent: "sco_problem", step: "sco" },
    { say: "Unexpected item in the bagging area!", intent: "sco_problem", step: "sco" },
    { say: "It says please wait for assistance.", intent: "sco_problem", step: "sco_explain" },
    { say: "This machine isn't working.", intent: "sco_problem", step: "sco" },
    { say: "The self-checkout is broken, I think.", intent: "sco_problem", step: "sco" },
    { say: "I put my bag in the bagging area.", intent: "sco_problem", step: "sco_explain" },
    { say: "Excuse me", intent: "g_repeat" },
    // found everything?
    { say: "Yes, I found everything, thanks.", intent: "found_all", step: "find" },
    { say: "I did, thanks!", intent: "found_ctx", step: "find" },
    { say: "Everything was fine.", intent: "found_all", step: "find" },
    { say: "I couldn't find the eggs.", intent: "not_found", step: "find", slots: { product: "eggs" } },
    { say: "No, I couldn't find the coffee.", intent: "not_found", step: "find", slots: { product: "coffee" } },
    { say: "Not everything.", intent: "not_found", step: "find" },
    { say: "You're out of eggs.", intent: "not_found", step: "find" },
    { say: "Where are the eggs?", intent: "ask_where", slots: { product: "eggs" } },
    { say: "Where's the toilet paper?", intent: "ask_where", slots: { product: "toilet_paper" } },
    { say: "Which aisle is the rice in?", intent: "ask_where", slots: { product: "rice" } },
    { say: "Eggs where?", intent: "ask_where", slots: { product: "eggs" } },
    { say: "Do you have oat milk?", intent: "ask_have" },
    { say: "Do you sell coffee?", intent: "ask_have", slots: { product: "coffee" } },
    { say: "Do you have batteries?", intent: "ask_have_unknown" },
    { say: "Where's the restroom?", intent: "ask_restroom" },
    { say: "Where is the toilet?", intent: "ask_restroom" },
    { say: "Is there an ATM here?", intent: "ask_atm" },
    { say: "The eggs.", intent: "product_ctx", step: "find", not: ["found_all"] },
    // rewards
    { say: "No, I don't.", intent: "rewards_no_ctx", step: "rewards" },
    { say: "I'm not sure.", intent: "g_dontknow", step: "price", not: ["rewards_no", "rewards_no_ctx", "price_ok_ctx"] },
    { say: "I'm not sure.", intent: "g_dontknow", step: "join", not: ["rewards_no", "rewards_no_ctx", "price_ok_ctx"] },
    { say: "I'm not sure.", intent: "g_dontknow", step: "rewards", not: ["rewards_no", "rewards_no_ctx", "price_ok_ctx"] },
    { say: "Not cash, card.", intent: "pay_card", step: "pay", not: ["pay_cash"] },
    { say: "Not card, cash.", intent: "pay_cash", step: "pay", not: ["pay_card"] },
    { say: "No, I don't have one.", intent: "rewards_no_ctx", step: "rewards", not: ["rewards_have"] },
    { say: "I don't have a rewards card.", intent: "rewards_no", step: "rewards", not: ["rewards_have"] },
    { say: "I'm just visiting.", intent: "rewards_no", step: "rewards" },
    { say: "No, but I've got a heart!", intent: "rewards_no", step: "rewards" },
    { say: "Yes, here you go.", intent: "rewards_have_ctx", step: "rewards" },
    { say: "Yes, I'm a member.", intent: "rewards_have", step: "rewards" },
    { say: "It's on my phone.", intent: "rewards_have", step: "rewards" },
    { say: "I forgot my card at home.", intent: "rewards_forgot", step: "rewards" },
    { say: "Yes, but I don't have it with me.", intent: "rewards_forgot_ctx", step: "rewards", not: ["rewards_have"] },
    { say: "Can you look me up by phone number?", intent: "rewards_lookup", step: "rewards" },
    { say: "What's a loyalty card?", intent: "rewards_what", step: "rewards" },
    { say: "Can I sign up?", intent: "rewards_join", step: "join" },
    { say: "It's 555-0142.", intent: "phone_ctx", step: "phone", slots: { digits: "5550142" } },
    { say: "555 0142", intent: "phone_ctx", step: "phone" },
    { say: "Sorry, I don't have a US number.", intent: "phone_none", step: "phone" },
    // ID
    { say: "Sure, here you go.", intent: "id_show_ctx", step: "id" },
    { say: "Here's my passport.", intent: "id_show", step: "id" },
    { say: "Is a passport okay?", intent: "id_ask_ok", step: "id" },
    { say: "Sorry, I don't have it with me.", intent: "id_none_ctx", step: "id", not: ["id_show"] },
    { say: "I don't want it.", intent: "wine_remove_ctx", step: "id", not: ["chips_remove", "chips_remove_ctx"] },
    { say: "I don't need it.", intent: "none", step: "pay" },
    { say: "I don't think so.", intent: "yn:no", step: "price", not: ["price_ok_ctx", "no_sign_ctx"] },
    { say: "I left my passport at the hotel.", intent: "id_none", step: "id" },
    { say: "I'm 45!", intent: "id_age", step: "id" },
    { say: "Why?", intent: "id_why_ctx", step: "id" },
    { say: "Why?", intent: "none", step: "rewards" },
    { say: "Never mind.", intent: "none", step: "find" },
    { say: "Is it free?", intent: "bag_price_ctx", step: "bags", not: ["rewards_what", "rewards_what_ctx"] },
    { say: "Here you go.", intent: "here_you_go", step: "find", not: ["rewards_have_ctx", "id_show_ctx"] },
    { say: "Never mind, I don't need the wine.", intent: "wine_remove_ctx", step: "id", not: ["id_show"] },
    // price check
    { say: "I think they're on sale.", intent: "sale_claim", step: "price" },
    { say: "The sign said two for five.", intent: "sale_claim", step: "price" },
    { say: "The shelf said 2 for $5.", intent: "sale_claim", step: "price" },
    { say: "Excuse me, the chips are on sale.", intent: "sale_claim" },
    { say: "Aren't they on sale?", intent: "sale_claim", step: "price" },
    { say: "Could you do a price check?", intent: "price_check_req", step: "price" },
    { say: "Can I have a price check on these chips?", intent: "price_check_req" },
    { say: "I think that price is wrong.", intent: "price_wrong", step: "price" },
    { say: "That's fine.", intent: "price_ok_ctx", step: "price" },
    { say: "I didn't see one.", intent: "no_sign_ctx", step: "price" },
    { say: "Then I don't want the chips.", intent: "chips_remove", step: "price", not: ["sale_claim"] },
    { say: "Then I don't want them.", intent: "chips_remove_ctx", step: "price", not: ["sale_claim"] },
    { say: "The crisps are on sale.", intent: "sale_claim", step: "price" },
    { say: "Sure, I'll take another one.", intent: "second_yes_ctx", step: "second" },
    { say: "Two, please!", intent: "second_yes_ctx", step: "second" },
    { say: "No, just one, thanks.", intent: "second_no_ctx", step: "second", not: ["second_yes_ctx"] },
    { say: "I don't want another one.", intent: "second_no_ctx", step: "second", not: ["second_yes_ctx"] },
    { say: "How much are the chips?", intent: "chips_price_q" },
    // bags
    { say: "Paper, please.", intent: "bag_kind_ctx", step: "bags" },
    { say: "Plastic is fine.", intent: "bag_kind_ctx", step: "bags" },
    { say: "Either is fine.", intent: "bag_kind_ctx", step: "bag_kind" },
    { say: "I brought my own bag.", intent: "bag_no", step: "bags" },
    { say: "No, thanks, I don't need a bag.", intent: "bag_no", step: "bags", not: ["bag_want"] },
    { say: "No bag, thanks.", intent: "bag_no", step: "bags", not: ["bag_want"] },
    { say: "One bag, please.", intent: "bag_want", step: "bags" },
    { say: "Two paper bags, please.", intent: "bag_want", step: "bags" },
    { say: "Can I get a carrier bag?", intent: "bag_want", step: "bags" },
    { say: "Not plastic, paper.", intent: "bag_kind_neg_ctx", step: "bag_kind", not: ["bag_kind_ctx"] },
    { say: "No plastic, please.", intent: "bag_kind_neg_ctx", step: "bag_kind" },
    { say: "How much are the bags?", intent: "bag_price_q", step: "bags" },
    { say: "I'll carry it.", intent: "bag_no", step: "bags" },
    // paying
    { say: "Card, please.", intent: "pay_card", step: "pay" },
    { say: "Can I pay by card?", intent: "pay_card", step: "pay" },
    { say: "Cash, please.", intent: "pay_cash", step: "pay" },
    { say: "I'll pay in cash.", intent: "pay_cash", step: "pay" },
    { say: "I don't have cash.", intent: "no_cash", step: "pay", not: ["pay_cash"] },
    { say: "Do you take Apple Pay?", intent: "pay_phone", step: "pay" },
    { say: "Here you go.", intent: "here_you_go", step: "pay" },
    { say: "Here's twenty.", intent: "here_you_go", step: "pay" },
    { say: "How much is it?", intent: "total_q", step: "pay" },
    { say: "Debit, please.", intent: "debit_credit", step: "debit" },
    { say: "Credit.", intent: "debit_credit", step: "debit" },
    { say: "I don't know my PIN.", intent: "no_pin", step: "debit" },
    { say: "No cash back, thanks.", intent: "cashback_no", step: "cashback", not: ["cashback_yes"] },
    { say: "Yes, twenty dollars, please.", intent: "cashback_amount_ctx", step: "cashback" },
    { say: "Can I get forty dollars?", intent: "cashback_amount_ctx", step: "cb_amount" },
    { say: "I don't want cash back.", intent: "cashback_no", step: "cashback", not: ["cashback_yes"] },
    { say: "Okay, done.", intent: "done_ctx", step: "charge" },
    { say: "Like this?", intent: "done_ctx", step: "charge" },
    { say: "Do I need to enter my PIN?", intent: "pin_q", step: "charge" },
    { say: "No receipt, thanks.", intent: "receipt_no", step: "receipt", not: ["receipt_yes"] },
    { say: "I don't need a receipt.", intent: "receipt_no", step: "receipt", not: ["receipt_yes"] },
    { say: "Can I get a receipt?", intent: "receipt_yes", step: "receipt" },
    { say: "Keep the change.", intent: "keep_change" },
    // global skills still work
    { say: "Could you say that again?", intent: "g_repeat" },
    { say: "Could you speak more slowly, please?", intent: "g_slower" },
    // gibberish and unrelated
    { say: "purple elephants dance on the moon", intent: "none" },
    { say: "banana banana register chips", intent: "none" },
    { say: "Three", intent: "none" },
    // learner English
    { say: "Where eggs?", intent: "ask_where", slots: { product: "eggs" } },
    { say: "I no find eggs", intent: "none" },
    { say: "I want pay card", intent: "pay_card", step: "pay" },
    { say: "Chips is on sale", intent: "sale_claim", step: "price" },
    { say: "I have my bag", intent: "bag_no", step: "bags" },
    { say: "I not have card", intent: "rewards_no", step: "rewards" },
    { say: "I have my driver's license.", intent: "id_show", step: "id" },
    // review fixes: offering a passport, changing your mind about the second bag of chips, paying cash
    { say: "Can I show my passport?", intent: "id_ask_ok", step: "id" },
    { say: "Could I show you my ID card?", intent: "id_ask_ok", step: "id" },
    { say: "Can I give you my passport?", intent: "id_ask_ok", step: "id" },
    { say: "Would a passport be okay?", intent: "id_ask_ok", step: "id" },
    { say: "I only have my Lithuanian passport.", intent: "id_show", step: "id", not: ["id_none"] },
    { say: "Let me show you my passport.", intent: "id_show", step: "id" },
    { say: "Sure, I can show you.", intent: "id_show_ctx", step: "id" },
    { say: "Actually, I don't need another bag of chips.", intent: "chips_one", step: "bags", not: ["chips_remove", "bag_want", "second_yes_ctx", "chips_two"] },
    { say: "I don't want another bag of chips.", intent: "chips_one", not: ["chips_remove", "chips_two", "second_yes_ctx"] },
    { say: "I don't need the second one.", intent: "chips_one", step: "pay" },
    { say: "Just one bag of chips, please.", intent: "chips_one", step: "pay" },
    { say: "Please take the second bag of chips off.", intent: "chips_one", step: "cash" },
    { say: "Actually, just one.", intent: "qty_one_ctx", step: "pay" },
    { say: "Just one.", intent: "qty_one_ctx", step: "bags" },
    { say: "Just one.", intent: "none", step: "rewards" },
    { say: "I'll take two bags of chips after all.", intent: "chips_two", step: "pay", not: ["chips_one"] },
    { say: "Here's twenty.", intent: "here_you_go", step: "cash" },
    { say: "Twenty.", intent: "cash_given_ctx", step: "cash" },
    { say: "Twenty.", intent: "none", step: "find" },
    { say: "Sorry, I only have a fifty.", intent: "cash_given_ctx", step: "cash" },
    { say: "Do you have change for a hundred?", intent: "change_q_ctx", step: "cash" },
  ],

  sims: [
    { name: "happy path: card and PIN", auto: AUTO, expect: { complete: true },
      turns: ["Hi! Yes, I found everything, thanks.", "No, I don't have one.", "Paper, please.", "Card, please.", "Okay.", "Thank you, bye!"] },
    { name: "short answers", expect: { complete: true },
      auto: { ...AUTO, sco: "Excuse me!", sco_explain: "Unexpected item in the bagging area.", find: "No.", missing: "Eggs.", rewards: "No.", join: "No.", id: "Yes.", price: "No.",
        second: "No.", bags: "Yes.", bag_kind: "Paper.", pay: "Card.", debit: "Debit.", cashback: "Yes.", cb_amount: "Twenty.", charge: "Okay.", receipt: "No.", phone: "555-0142" },
      turns: ["No.", "Eggs.", "No.", "Yes.", "Paper.", "Card.", "Okay.", "Bye!"] },
    { name: "questions first, joining rewards, Apple Pay", expect: { complete: true },
      auto: { sco: AUTO.sco, sco_explain: AUTO.sco_explain, id: AUTO.id, price: AUTO.price, second: AUTO.second, charge: "Okay.", receipt: "No, thanks.", missing: "The eggs." },
      turns: ["Hi! Where are the eggs?", "Do you sell coffee?", "What's a loyalty card?", "Yes, please. Can I sign up?", "It's 555-0142.",
        "How much are the bags?", "I brought my own bag.", "Can I pay with Apple Pay?", "Okay.", "Bye!"] },
    // (no automatic bag answer: when Marcus doesn't ask about the chips, the learner brings it up at the bag question)
    { name: "price check: two for five", auto: omit(AUTO, ["bags", "bag_kind"]), expect: { complete: true },
      turns: ["No, I don't have one.", "Excuse me, the chips are on sale. The sign said two for five.", "Sure, I'll take another one.",
        "No, thanks, I don't need a bag.", "Cash, please.", "Here you go.", "Thanks, bye!"] },
    { name: "self-checkout, ID and cash back", auto: AUTO, expect: { complete: true },
      turns: ["Excuse me! Can you help me?", "The machine says unexpected item in the bagging area.", "I forgot my card at home.", "It's 555-0142.",
        "Here's my passport.", "Card, please.", "Debit.", "Yes, twenty dollars, please.", "Okay.", "Thanks, bye!"] },
    { name: "change of mind: back to one bag of chips", auto: omit(AUTO, ["bags", "bag_kind"]), expect: { complete: true },
      turns: ["No, I don't have one.", "I think they're on sale.", "Sure, I'll take another one.", "Actually, I don't need another bag of chips.",
        "Paper, please.", "Card, please.", "Hmm, I'll take two bags of chips after all.", "Okay.", "Thanks, bye!"] },
    { name: "cash: the change after the money", auto: AUTO, expect: { complete: true },
      turns: ["No, I don't have one.", "No, thanks, I don't need a bag.", "Cash.", "Here's ten.", "Oh, sorry. Here's fifty dollars.", "Thanks, bye!"] },
    { name: "eggs missing, cash, no bag, no receipt", auto: AUTO, expect: { complete: true },
      turns: ["Hi! No, I couldn't find the eggs.", "No, I'm not a member.", "I'll carry it.", "Here's twenty.", "No receipt, thanks.", "Bye!"] },
  ],
};

export default supermarket;
