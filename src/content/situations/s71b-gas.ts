// Song 71 "Fill It Up" (part 2) → an American gas station: Gas & Go, cashier Dot (inside).
// US prepay: "Forty on pump three" / "Fill it up on pump three"; foreign cards usually fail at the
// pump because it asks for a ZIP code, so you pay inside. Grades (regular / premium / diesel) are
// chosen at the pump. Also: coffee and snacks, debit or credit, a receipt, the restroom key,
// directions to the highway, air for the tires, and (cash fill-up) coming back for the change.
// Twists: pump out of order (use another one); car trouble (visits ≥ 1): the car won't start /
// a flat tire → a mechanic nearby, or Dot calls roadside assistance.
//
// NEEDS (engine, not changed here): the NLU gives the expected-intent bonus to every segment, so
// one answer can be cut into several segments ("for" + "three" …). Handlers are idempotent.

import type { Ctx, EntityDef, SituationDef, Tip } from "../types";
import { ent, t } from "../dsl";

// ---------------------------------------------------------------------------

const SNACKS: EntityDef[] = [
  ent("coffee", "coffee", "kava/kavos/kavai/kavą/kava/kavoje", "f", { forms: ["a coffee", "cup of coffee", "a cup of coffee", "coffees", "large coffee"], attrs: { price: 199 } }),
  ent("water", "bottle | of water", "buteliukas/buteliuko/buteliukui/buteliuką/buteliuku/buteliuke | vandens", "m", {
    forms: ["water", "a water", "bottle of water", "a bottle of water", "bottled water", "waters"], chip: "vandens buteliukas", attrs: { price: 150 } }),
  ent("chips", "bag | of chips", "pakelis/pakelio/pakeliui/pakelį/pakeliu/pakelyje | traškučių", "m", {
    forms: ["chips", "bag of chips", "a bag of chips", "crisps", "potato chips"], chip: "traškučių pakelis", attrs: { price: 199 } }),
  ent("candy", "candy | bar", "šokoladinis/šokoladinio/šokoladiniam/šokoladinį/šokoladiniu/šokoladiniame | batonėlis/batonėlio/batonėliui/batonėlį/batonėliu/batonėlyje", "m", {
    forms: ["candy bar", "a candy bar", "chocolate bar", "a chocolate bar", "snickers", "a snickers"], chip: "šokoladinis batonėlis", attrs: { price: 179 } }),
  ent("map", "map", "žemėlapis/žemėlapio/žemėlapiui/žemėlapį/žemėlapiu/žemėlapyje", "m", {
    forms: ["a map", "road map", "a road map", "map of the area"], attrs: { price: 499 } }),
];
const byId = (id: string) => SNACKS.find((e) => e.id === id)!;

const GALLON = 349; // regular, per gallon
const FILL_COSTS = [3860, 4175, 4362];

// ---------------------------------------------------------------------------
// State helpers

const snacks = (c: Ctx) => c.s.snacks as string[];
const snackTotal = (c: Ctx) => snacks(c).reduce((a, id) => a + (byId(id).attrs!.price as number), 0);
/** What is paid now: the prepaid amount (or the cash left for a fill-up) plus snacks. */
const payNow = (c: Ctx) => (c.s.fill ? (c.s.leave ?? 0) : (c.s.amount ?? 0)) + snackTotal(c);
const allTags = (slots: any, seg: { tags: string[] }): string[] => {
  const out = [...seg.tags];
  const walk = (v: any) => { if (v && typeof v === "object") { if (Array.isArray(v.__tags)) out.push(...v.__tags); for (const [k, x] of Object.entries(v)) if (k !== "__tags") walk(x); } };
  walk(slots);
  return out;
};
const pumpOf = (v: any): number | undefined => (v ? Number(v) : undefined);

const TIPS: Record<string, Tip> = {
  uk_petrol: { key: "uk_petrol", lt: "Suprasta! Amerikoje degalai – „gas“, degalinė – „gas station“.", better: "Forty dollars on pump three, please." },
  uk_motorway: { key: "uk_motorway", lt: "Suprasta! Amerikoje greitkelis – „highway“ arba „freeway“.", better: "How do I get to the highway?" },
  uk_tyre: { key: "uk_tyre", lt: "Suprasta! Amerikoje rašoma „tire“ (padanga).", better: "I have a flat tire." },
  uk_toilet: { key: "uk_toilet", lt: "Suprasta! Amerikoje mandagiau sakyti „restroom“.", better: "Can I use the restroom?" },
  prepay: { key: "prepay", lt: "JAV degalinėse dažnai mokama iš anksto: pasakykite sumą ir kolonėlės numerį, pvz., „Forty on pump three“.", better: "Forty dollars on pump three, please." },
};

// Automatic answers the simulation uses when Dot asks an optional question.
const AUTO: Record<string, string> = {
  order: "Forty dollars on pump three, please.", pump: "Pump three.", out_of_order: "Sure, no problem.", amount: "Forty dollars, please.",
  leave: "Fifty dollars.", extras: "No, thanks. Just the gas.", pay: "Card, please.", debit: "Credit.", receipt: "No, thanks.",
  pump_on: "Thank you!", after: "Thanks!", anything: "No, that's all. Thanks!", trouble: "My car won't start.",
  trouble_help: "Could you call roadside assistance?",
};
const omit = (o: Record<string, string>, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

// ---------------------------------------------------------------------------

export const gas: SituationDef = {
  id: "s71b-gas",
  song: 71,
  songTitle: "Fill It Up",
  title: { en: "Fill It Up", lt: "Pilną baką" },
  topic: { en: "At the gas station", lt: "Degalinėje" },
  chapter: 6,
  order: 4,
  location: "gas-station",
  npc: "dot",
  goal: "Užsipilk degalų ir susimokėk kasoje.",
  intro: "„Gas & Go“ – degalinė prie kelio, kasoje dirba Dot. JAV dažnai mokama iš anksto: pasakyk kolonėlės numerį ir sumą. Užsienio kortelės prie kolonėlės dažnai neveikia, nes kolonėlė prašo pašto kodo (ZIP).",
  entities: { snack: SNACKS },

  grammar: {
    macros: {
      pumpw: "(pump | number | pump number)",
      // "A … would be great": restating the answer as a wish
      nice_: "(would be (great | nice | good | perfect | fine | lovely | wonderful) | sounds (good | great | nice | perfect) | is (fine | good | great | perfect | okay))",
      gasw: "[of] (gas | regular | unleaded | premium | diesel | petrol #tip:uk_petrol | fuel)",
      grade: "(regular #regular | unleaded #regular | eighty seven #regular | 87 #regular | mid grade #mid | midgrade #mid | plus #mid | premium #premium | super #premium | diesel #diesel)",
      get: "(can i get | could i get | can i have | could i have | may i have | i would like | i will take | i will have | let me get | give me #blunt | i want #blunt | i need | put | can you put | could you put | can i do | i will do | i will go with)",
    },
    slots: {
      pnum: { lexicon: [
        ["1", "one"], ["2", "two"], ["3", "three"], ["4", "four"], ["5", "five"], ["6", "six"], ["7", "seven"], ["8", "eight"],
      ].map(([d, w]) => ({ id: d, forms: [d, w] })) },
      money: { pattern: ["{price} [worth] [@gasw]", "{price} dollars worth [@gasw]"] },
      dol: { pattern: ["{number} (dollars | dollar | bucks) [worth] [@gasw] #dol", "{number} dollars and {number} cents #dolc"] },
    },
  },

  intents: {
    prepay: { patterns: [
      "[@get] {money} on [@pumpw] {pnum} #h:prepay", "[@get] {money} (for | at) [@pumpw] {pnum}",
      "[@get] {dol} [please] #h:amount", "[@get] {money} of @grade on [@pumpw] {pnum}",
      "(pump | on pump) {pnum} {money}", "(i would like | i want) to (prepay | put) {money} on [@pumpw] {pnum} #h:prepay_long",
      "(i would like | i want) to (prepay | put in) {dol}",
      "(i would like | i want) to pay (for | on) [@pumpw] {pnum} {money}", "(can | could) i prepay {money} (on | for | at) [@pumpw] {pnum}",
      "{money} (on | for) [@pumpw] {pnum} [please]", "{money} [on | for] @pumpw {pnum}", "{money} (on | for) [@pumpw] {pnum} @nice_",
    ] },
    // "I need gas": Dot asks which pump (or how much)
    want_gas: { patterns: ["(i | we) (need | want | would like) [some] (gas | fuel | petrol #tip:uk_petrol)", "(i | we) (want | would like | need) to (buy | get) [some] (gas | fuel | petrol #tip:uk_petrol)",
      "(can | could) i (get | buy) [some] (gas | fuel | petrol #tip:uk_petrol)"] },
    fill: { patterns: [
      "fill it up [on [@pumpw] {pnum}] #h:fill", "(can | could) you fill it up [on [@pumpw] {pnum}]", "(i would like | i want) to fill (it | the tank) up [on [@pumpw] {pnum}]",
      "[(i would like | can i get | i will take | i need | i want)] a full tank [on [@pumpw] {pnum}]", "fill up [@pumpw] {pnum}", "fill (her | it) up [on [@pumpw] {pnum}]",
      "(i want | i would like) to fill up [on [@pumpw] {pnum}]",
      "[a] full tank [on | for | at] @pumpw {pnum}", "(fill | fill up) (the tank | my tank | my car | the car) [on [@pumpw] {pnum}]",
      "(i want | i would like | i need) to fill [up] (my car | the car | the tank | my tank | it) [up] [on [@pumpw] {pnum}]",
    ] },
    pump_ctx: { patterns: ["[@pumpw] {pnum} #h:pump_num", "(i am | i'm | it is | it's) (on | at) [@pumpw] {pnum} #h:pump_on", "(on | at) [@pumpw] {pnum}", "{pnum} [please]",
      "[i need] [some] (gas | fuel) (on | for | at) [@pumpw] {pnum}", "[@pumpw] {pnum} is (fine | okay | good | no problem)",
      "i will (move | go | drive | switch) to [@pumpw] {pnum}", "i will (use | take) [@pumpw] {pnum}",
      "(can | could) you (turn on | activate | switch on | start) [@pumpw] {pnum}", "it is @pumpw {pnum}", "(my car | the car) is (on | at) [@pumpw] {pnum}"] },
    amount_ctx: { patterns: ["{money} #h:amount", "[just] {money}", "make it {money}", "{money} is fine", "(i will leave | here is) {money} #h:leave",
      "let us say {money}", "(i will give you | take | i will pay) {money}", "i [will] leave [you] {money}", "i (want | would like) to leave {money}"] },
    // "Actually, make it forty.": a new prepay amount after the first one
    amount_change_ctx: { patterns: [
      "make (it | that) {money} [instead]", "(can | could) you make (it | that) {money} [instead]", "(can | could) (i | we) (make it | change it to | do) {money} [instead]",
      "(change | switch) (it | that) to {money}", "{money} instead", "(let us | let me) (do | make it) {money} [instead]", "i will (do | take) {money} instead",
      "(i would like | i want) {money} instead",
    ] },
    grade_ans: { patterns: ["@grade [please | gas]", "(i need | i want | it takes | it needs) @grade [gas]", "(this car | my car | it) takes @grade"] },
    grade_q: { patterns: ["which (one | pump | button | nozzle) is (diesel #diesel | regular #regular | premium #premium) #h:q_grade", "which (pump | pumps) (has | have) (diesel #diesel | premium #premium)", "do you have diesel #diesel", "(is | what is) regular (okay | fine | good) for (my car | the car | a rental [car])", "what [kind of] gas (does it | should i) (take | use)"] },
    gas_price_q: { patterns: ["how much is (gas | regular | diesel | premium | a gallon) [per gallon | a gallon]", "what is the price (of | for) (gas | regular | diesel)", "how much is a (liter | litre) #liter"] },
    zip_problem: { patterns: [
      "the pump (is asking | asks | wants | needs) [for] [a | my | the] (zip code | zip | postal code) #h:zip",
      "the pump (does not | did not | will not) work with my card", "my card (does not | did not | will not) work (with | in) the pump", "it (is asking | asks) for a zip code",
      "(i do not | i don't) have a zip code", "my card (does not | doesn't | did not | will not) work at the pump #h:card_pump",
      "the pump (is not | isn't | did not | will not) (taking | take | accept | accepting) my card", "the pump says see [the] cashier", "(it | the pump) (says | said) pay inside",
      "the pump (does not | doesn't) (take | accept) my card", "i have a (foreign | european | lithuanian | international) card", "my card is (foreign | european | from europe | from lithuania)",
      "(the | my) card (does not | did not | will not) work (outside | at the pump | there)", "my card was (declined | rejected) [at the pump | outside]", "it (wants | needs) a zip code",
      "my card (not | is not) (working | work) (on | at | with) the pump",
    ] },
    pay_pump_q: { patterns: ["(can | could) i pay at the pump #h:q_pay_pump", "(can | could) i pay for (gas | the gas) here", "(can | could) i pay here [for (gas | the gas)]", "do i pay (here | inside) [for (gas | the gas)]", "do i (have to | need to) pay (inside | first | here)", "do i pay (first | inside | before)", "(can | do) i pay after"] },
    snack_order: { patterns: [
      "[@get] [a | an | some | two] {snack} [too | as well] #h:snack_can", "and [a | an | some] {snack} [too] #h:snack_too", "(also | plus) [a | an | some] {snack}",
      "(i will | i would) also (take | like | have) [a | an | some] {snack}", "{snack} too",
    ] },
    coffee_where: { patterns: ["where is the coffee #h:q_coffee", "(do you have | is there) (coffee | hot coffee)", "where (can i get | do you have) coffee", "is the coffee (fresh | free)"] },
    restroom: { patterns: [
      "(can | could | may) i use the (restroom | bathroom) #h:q_restroom", "where is the (restroom | bathroom | ladies room | mens room)", "where is the (toilet | toilets) #tip:uk_toilet",
      "(can | could | may) i (have | get) the (restroom | bathroom) key #h:q_key", "(do you have | is there) a (restroom | bathroom)",
    ] },
    key_back: { patterns: ["here is (the | your) key [back]", "(i am | i'm) (bringing | returning) the key", "(thanks for | thank you for) the key"] },
    directions: { patterns: [
      "how do i get to the (highway | freeway | interstate | motorway #tip:uk_motorway) #h:q_highway", "which way [is it] to the (highway | freeway | interstate | motorway #tip:uk_motorway)",
      "how (do | can) i get to (i ninety five | ninety five | route one | the interstate | boston | portland)", "how (i | we) (get | go) to [the] (highway | freeway | interstate | motorway #tip:uk_motorway)", "(is | where is) the (highway | interstate) [far | near here | from here]",
      "which way is (boston | portland | the highway | north | south | the interstate | the freeway)",
    ] },
    air: { patterns: [
      "where can i (put | get) air",
      "where can i (put | get) air (in | for | into) my (tires | tire | tyres #tip:uk_tyre) #h:q_air", "(do you have | is there) an air (pump | machine | compressor)",
      "i need (air | to put air) [in my (tires | tire)]", "where is the air (pump | machine)", "(can | could) i (put | get) [some] air in my (tires | tire)",
    ] },
    atm: { patterns: ["(do you have | is there) an (atm | cash machine #tip:uk_cashpoint | cashpoint #tip:uk_cashpoint) [here | nearby | near here | inside]", "where is the (atm | cash machine #tip:uk_cashpoint)", "where can i get cash"] },
    trouble: { patterns: [
      "my car (will not | won't | does not | doesn't | did not | didn't) start #h:car_wont_start", "(i have | i've got | i got | there is) a flat (tire | tyre #tip:uk_tyre) #h:flat_tire",
      "[i think] i have a flat", "my (tire | tyre #tip:uk_tyre) is flat", "my (battery | car battery) is dead", "(my car | the car) (broke down | is broken | is making a (strange | weird) noise)",
      "(something is | there is something) wrong with (my | the) car", "(i have | i've got) (a problem | car trouble) with (my | the) car", "i have car trouble",
      "(the | my) (engine | car) (will not | does not | did not) start", "my (car | engine) (not | no) (start | starting | starts)",
    ] },
    ask_mechanic: { patterns: ["i need a (mechanic | garage)","is there a (mechanic | garage | repair shop | auto shop) (nearby | near here | around here | close by) #h:q_mechanic", "where is the nearest (mechanic | garage | repair shop)", "do you know a [good] (mechanic | garage)"] },
    call_help: { patterns: [
      "(can | could) you call (roadside assistance | a tow truck | a mechanic | someone | for help) [for me] #h:call_roadside", "please call (roadside assistance | a tow truck | someone)",
      "(can | could) you help me", "who (can | should) i call", "(i need | can i get) (roadside assistance | a tow truck | help)", "(can | could) i use your phone",
    ] },
    receipt_ask: { patterns: ["(can | could | may) i (get | have) a receipt #h:receipt", "(i would like | i need) a receipt", "receipt please", "[and] a receipt [please]", "(give me | i will take) [the | a] receipt"] },
    // "No, I don't need it" (to "Receipt?")
    receipt_no_ctx: { patterns: ["[no] i do not need (it | one | that)", "[no] (it is | that is) not necessary"] },
    no_receipt: { patterns: ["(no | i do not need a) receipt [thanks]", "(i do not | i don't) need (a | the) receipt"] },
    pay_card: { patterns: [
      "[can | could] i pay (by | with) (card | credit card | debit card | my card | credit) #h:pay_card", "(by | with) card", "card #h:pay_card_short",
      "(i will | i would like to | i am going to) pay (by | with) (card | credit card | debit card | my card | a card)", "do you (take | accept) (cards | credit cards | visa | mastercard)", "(can | could) i (use | tap) my (card | phone)",
      "(can | could) i pay with (my phone | apple pay | google pay)",
      "here is my (card | credit card | debit card)", "(can | could) i tap [it | my card | here]", "(apple pay | google pay | visa | mastercard | contactless)",
      "(can | could) i pay (with | by) (visa | mastercard | amex | american express)", "do you (take | accept) (american express | amex | apple pay | debit cards)", "take my card",
      "(with | by) (my phone | phone)", "i will pay with my phone",
    ] },
    // "I don't have cash": so it's the card (never read as "cash")
    no_cash: { patterns: ["(i | we) do not have [any | enough] cash", "no cash [sorry]", "(i | we) (can not | do not want to) pay (in | with) cash", "i have no cash"] },
    pay_cash: { patterns: ["[can | could] i pay (in | with) cash", "(in | with) cash", "cash #h:pay_cash_short", "(i will | i would like to | i am going to) pay (in | with) cash #h:pay_cash", "i will pay cash"] },
    here_you_go: { patterns: ["here you (go | are) #h:here_you_go", "there you go", "here it is", "here is (the | my) money", "here is {price}"] },
    credit_debit: { patterns: ["credit [please | card] #credit #h:credit", "debit [please | card] #debit #h:debit", "(it is | it's) [a] (credit #credit | debit #debit) [card]",
      "[it is] [a] (visa | mastercard) (credit #credit | debit #debit) [card]"] },
    more_no: { patterns: [
      "(that is | that will be) (all | it | everything) [for now] #h:more_no", "[no] that is it", "nothing else [thanks]", "[no] (i am | we are) (good | fine | all set)",
      "just the gas [thanks | please] #h:just_gas", "[i think] that is (all | it)",
      "[no] nothing [else] [thanks]", "no {snack} [thanks | please]", "[no] i do not (need | want) anything [else]", "that is all just the gas", "[no] only [the] gas [thanks]", "[no] i do not (want | need) [a | any] {snack}",
    ] },
    ok_ack: { patterns: ["(okay | ok | sure | great | perfect | no problem | fine) [thanks | no problem | that is fine] #h:ok_ack", "(that is | that is totally) (fine | okay)", "(got it | will do | sounds good)"] },
  },

  lines: {
    greet: [
      t("Hi, | hon! | What | can | I | do | for you?", "Sveiki, | {m:mielasis|f:mieloji}! | Ką | galiu | aš | padaryti | jums?", "Sveiki, {m:mielasis|f:mieloji}! Kuo galiu padėti?"),
      t("Morning! | What | pump | are | you | on?", "Labas rytas! | Prie kurios | kolonėlės | stovite | jūs | —?", "Labas rytas! Prie kurios kolonėlės stovite?",
        { flags: { 1: "Stranded “on” (… are you on?): Lithuanian puts the preposition prie before the question word, so it is glossed here.", 3: "“are” (be at a pump) = stovite.", 5: "“on”: carried by prie at the front (linked to “What”)." } }),
      t("Hi there! | How | can | I | help | you?", "Sveiki! | Kaip | galiu | aš | padėti | jums?", "Sveiki! Kuo galiu padėti?"),
    ],
    ask_what: [t("What | can | I | get | you?", "Ką | galiu | aš | duoti | jums?", "Ko jums reikia?")],
    ask_pump: [
      t("Sure. | What | pump | are | you | on?", "Žinoma. | Prie kurios | kolonėlės | stovite | jūs | —?", "Žinoma. Prie kurios kolonėlės stovite?",
        { flags: { 1: "Stranded “on” (… are you on?): Lithuanian puts the preposition prie before the question word, so it is glossed here.", 3: "“are” (be at a pump) = stovite.", 5: "“on”: carried by prie at the front (linked to “What”)." } }),
      t("Which | pump?", "Kuri | kolonėlė?", "Kuri kolonėlė?"),
    ],
    ask_amount: [
      t("How much | do | you | want?", "Kiek | — | jūs | norite?", "Kiek norite?", { flags: { 1: "Question “do” has no Lithuanian word (linked to “want”)." } }),
      t("How much | would | you | like | to put | on | it?", "Kiek | — | jūs | norėtumėte | įpilti | — | —?", "Už kiek norėtumėte įpilti?",
        { flags: { 1: "“would”: the conditional ending of norėtumėte carries it (linked to “like”).", 5: "“on it” (put … on the pump): įpilti already covers it; no separate word.", 6: "“it” (the pump): no separate word in Lithuanian here." } }),
    ],
    out_of_order: [
      t("Oh, | sorry, | pump | {$num} | is | out of order | today. | Could | you | use | pump | five?",
        "O, | atsiprašau, | kolonėlė | Nr. {$num} | yra | neveikianti | šiandien. | Ar galėtumėte | jūs | naudoti | kolonėlę | Nr. 5?",
        "O, atsiprašau, kolonėlė Nr. {$num} šiandien neveikia. Ar galėtumėte naudotis kolonėle Nr. 5?"),
    ],
    // the same question again after a side question (the pump problem was already explained)
    ooo_again: [
      t("So, | could | you | use | pump | five?", "Tai | ar galėtumėte | jūs | naudoti | kolonėlę | Nr. 5?", "Tai ar galėtumėte naudotis kolonėle Nr. 5?"),
    ],
    fill_how_pay: [
      t("Sure. | Are | you | paying | with | cash | or | card?", "Žinoma. | Ar | jūs | mokate | — | grynaisiais | ar | kortele?", "Žinoma. Mokėsite grynaisiais ar kortele?",
        { flags: { 1: "Question “Are” = the particle ar; the present of mokate carries the progressive (linked to “paying”).", 4: "“with”: the instrumental grynaisiais / kortele carries it." } }),
    ],
    fill_card: [
      t("Okay. | I'll put | a | hold | on | your | card, | and | you'll pay | only | for | what | you | pump.",
        "Gerai. | Užblokuosiu | — | sumą | — | jūsų | kortelėje, | ir | jūs sumokėsite | tik | už | tiek, kiek | jūs | įsipilsite.",
        "Gerai. Užblokuosiu sumą jūsų kortelėje, o sumokėsite tik už tiek, kiek įsipilsite.",
        { flags: { 4: "“on”: the locative kortelėje carries it (C-CASE-DASH, “your” intervenes)." } }),
    ],
    ask_leave: [
      t("Okay, | how much | do | you | want | to leave? | I'll give | you | your | change | after.", "Gerai, | kiek | — | jūs | norite | palikti? | Duosiu | jums | jūsų | grąžą | vėliau.",
        "Gerai, kiek norite palikti? Grąžą atiduosiu vėliau.", { flags: { 2: "Question “do” has no Lithuanian word (linked to “want”)." } }),
    ],
    leave_ok: [
      t("Okay, | {$price} | on | pump | {$num}. | Come | back | in | for | your | change.", "Gerai, | {$price} | į | kolonėlę | Nr. {$num}. | Užeikite | atgal | — | — | jūsų | grąžos.",
        "Gerai, {$price} į kolonėlę Nr. {$num}. Užeikite atsiimti grąžos.",
        { flags: { 7: "“in”: užeikite (come in) already contains it.", 8: "“for”: the genitive grąžos carries it (C-CASE-DASH, “your” intervenes)." } }),
    ],
    ask_extras: [
      t("Anything | else? | Coffee, | snacks?", "Ką nors | daugiau? | Kavos, | užkandžių?", "Dar ko nors? Kavos, užkandžių?"),
      t("Anything | else | for you | today?", "Ką nors | daugiau | jums | šiandien?", "Ar dar ko nors šiandien?"),
    ],
    snack_ok: [
      t("Sure! | Coffee | is | right | over | there. | Help yourself.", "Žinoma! | Kava | yra | štai | — | ten. | Vaišinkitės.", "Žinoma! Kava – štai ten. Įsipilkite patys.",
        { flags: { 4: "“over” (over there): no separate word; ten carries it." } }),
    ],
    snack_added: [t("Sure, | I'll add | that.", "Žinoma, | pridėsiu | tai.", "Žinoma, pridėsiu.")],
    coffee_where: [
      t("Coffee | is | right | over | there | by | the | window. | Help yourself!", "Kava | yra | štai | — | ten | prie | — | lango. | Vaišinkitės!", "Kava – štai ten, prie lango. Įsipilkite patys!",
        { flags: { 3: "“over” (over there): no separate word; ten carries it." } }),
    ],
    say_total: [
      t("That'll be | {$price}.", "Tai bus | {$price}.", "Iš viso {$price}."),
      t("Okay, | that's | {$price}.", "Gerai, | tai yra | {$price}.", "Gerai, iš viso {$price}."),
    ],
    ask_pay: [t("Cash | or | card?", "Grynaisiais | ar | kortele?", "Grynaisiais ar kortele?")],
    card_ok: [t("Go ahead | and | tap | your | card.", "Prašom | — | pridėti | savo | kortelę.", "Prašom pridėti kortelę.",
      { flags: { 1: "“and” (go ahead and …): Lithuanian joins the request directly." } })],
    cash_ok: [t("Thanks! | And | here's | your | change.", "Ačiū! | Ir | štai | jūsų | grąža.", "Ačiū! Štai jūsų grąža.")],
    cash_exact: [t("Thanks, | hon!", "Ačiū, | {m:mielasis|f:mieloji}!", "Ačiū, {m:mielasis|f:mieloji}!")],
    ask_debit: [t("Debit | or | credit?", "Debetinė | ar | kredito?", "Debetinė ar kredito kortelė?")],
    pin: [t("Okay, | go ahead | and | enter | your | PIN.", "Gerai, | prašom | — | įvesti | savo | PIN kodą.", "Gerai, įveskite PIN kodą.",
      { flags: { 2: "“and” (go ahead and …): Lithuanian joins the request directly." } })],
    ask_receipt: [
      t("Do | you | want | a | receipt?", "Ar | jūs | norite | — | čekio?", "Ar reikia čekio?", { flags: { 0: "Question “Do” = the particle ar." } }),
      t("Receipt?", "Čekio?", "Čekio?"),
    ],
    receipt_here: [t("Here's | your | receipt.", "Štai | jūsų | čekis.", "Štai jūsų čekis.")],
    pump_on: [
      t("You're all set! | Pump | {$num} | is | on.", "Viskas sutvarkyta! | Kolonėlė | Nr. {$num} | yra | įjungta.", "Viskas! Kolonėlė Nr. {$num} įjungta."),
      t("Okay, | pump | {$num} | is | ready. | Just | pick | your | grade | at the pump.", "Gerai, | kolonėlė | Nr. {$num} | yra | paruošta. | Tiesiog | pasirinkite | savo | degalų rūšį | prie kolonėlės.",
        "Gerai, kolonėlė Nr. {$num} paruošta. Degalų rūšį pasirinkite prie kolonėlės."),
    ],
    after_fill: [
      t("All | done? | That | came to | {$price}.", "Viskas | baigta? | Tai | kainavo | {$price}.", "Baigėte? Kainavo {$price}.",
        { flags: { 3: "“came to”: kainavo covers the whole verb (linked to “That”)." } }),
    ],
    change_is: [t("Here's | your | change: | {$price}.", "Štai | jūsų | grąža: | {$price}.", "Štai jūsų grąža: {$price}.")],
    grade_info: [
      t("Just | pick | it | at the pump. | Regular | is | the | first | button.", "Tiesiog | pasirinkite | tai | prie kolonėlės. | Paprastas | yra | — | pirmas | mygtukas.",
        "Tiesiog pasirinkite prie kolonėlės. Paprastas benzinas – pirmas mygtukas."),
    ],
    diesel_info: [
      t("Diesel | is | the | green | handle, | on | pumps | seven | and | eight.", "Dyzelinas | yra | — | žalias | pistoletas, | — | kolonėlėse | Nr. 7 | ir | Nr. 8.",
        "Dyzelinas – žalias pistoletas, septintoje ir aštuntoje kolonėlėse.", { flags: { 5: "“on”: the locative kolonėlėse carries it (C-CASE-DASH)." } }),
    ],
    regular_fine: [t("Regular | is | fine | for | most | rental | cars.", "Paprastas | yra | tinkamas | — | daugumai | nuomojamų | automobilių.", "Daugumai nuomojamų automobilių tinka paprastas benzinas.",
      { flags: { 3: "“for”: the dative daugumai carries it (C-CASE-DASH, “most” intervenes)." } })],
    gas_price: [t("Regular | is | {$price} | a | gallon.", "Paprastas | yra | {$price} | už | galoną.", "Paprastas benzinas – {$price} už galoną.",
      { flags: { 3: "“a” (a gallon = per gallon): už carries it." } })],
    liter_joke: [t("We | sell | it | by | the | gallon | here, | hon!", "Mes | parduodame | jį | — | — | galonais | čia, | {m:mielasis|f:mieloji}!", "Čia pardavinėjame galonais, {m:mielasis|f:mieloji}!",
      { flags: { 3: "“by the gallon”: the instrumental galonais carries “by”." } })],
    zip_explain: [
      t("Yeah, | foreign | cards | don't work | at the pump | because | it | asks | for | a | ZIP code. | Just | prepay | in | here.",
        "Taip, | užsienio | kortelės | neveikia | prie kolonėlės | nes | ji | prašo | — | — | pašto kodo. | Tiesiog | sumokėkite iš anksto | — | čia.",
        "Taip, užsienio kortelės prie kolonėlės neveikia, nes ji prašo pašto kodo. Tiesiog sumokėkite iš anksto čia.",
        { flags: { 8: "“for”: prašyti takes the genitive pašto kodo directly.", 13: "“in” (in here): čia covers both words (linked to “here”)." } }),
    ],
    pay_pump_answer: [
      t("You | can, | but | with | a | foreign | card | it's | easier | to prepay | in | here.", "Jūs | galite, | bet | su | — | užsienio | kortele | tai yra | paprasčiau | sumokėti iš anksto | — | čia.",
        "Galite, bet su užsienio kortele paprasčiau sumokėti iš anksto čia.", { flags: { 10: "“in” (in here): čia covers both words (linked to “here”)." } }),
    ],
    restroom_key: [
      t("Sure, | here's | the | key. | It's | around | the | side | of | the | building.", "Žinoma, | štai | — | raktas. | Jis yra | už | — | kampo | — | — | pastato.",
        "Žinoma, štai raktas. Tualetas – už pastato kampo.", { flags: { 7: "“side” = kampas here (around the side = už kampo).", 8: "“of the building”: the genitive pastato carries “of”." } }),
    ],
    key_thanks: [t("Thanks, | hon.", "Ačiū, | {m:mielasis|f:mieloji}.", "Ačiū, {m:mielasis|f:mieloji}.")],
    directions: [
      t("Take | a | right | out of here, | go | straight | through | two | lights, | and | follow | the | signs | for | 95 North.",
        "Pasukite | — | dešinėn | išvažiavę iš čia, | važiuokite | tiesiai | per | dvi | šviesoforų sankryžas, | ir | sekite | — | ženklus | — | į 95 šiaurę.",
        "Išvažiavę pasukite dešinėn, važiuokite tiesiai per dvi sankryžas su šviesoforais ir sekite ženklus į 95-ąjį greitkelį šiaurės kryptimi.",
        { say: "Take a right out of here, go straight through two lights, and follow the signs for ninety-five North.", flags: { 13: "“for”: the direction is carried by į (linked to “95 North”)." } }),
    ],
    air: [
      t("The | air | machine | is | around | the | back. | It's | a | dollar | fifty.", "— | Oro | aparatas | yra | už | — | pastato. | Tai kainuoja | — | dolerį | penkiasdešimt.",
        "Oro pripūtimo aparatas – už pastato. Kainuoja dolerį penkiasdešimt.", { flags: { 6: "“back” (around the back) = behind the building: už pastato." } }),
    ],
    atm: [t("The | ATM | is | right | by | the | door.", "— | Bankomatas | yra | tiesiai | prie | — | durų.", "Bankomatas – visai prie durų.")],
    // --- car trouble (twist)
    back_already: [
      t("Hey, | you're back! | Everything | okay?", "Ei, | jūs grįžote! | Viskas | gerai?", "Ei, jūs grįžote! Viskas gerai?"),
    ],
    trouble_reply: [
      t("Oh | no! | There's | a | mechanic | two | blocks | down, | or | I | can | call | roadside assistance | for you.",
        "O | ne! | Yra | — | autoservisas | dviem | kvartalais | toliau, | arba | aš | galiu | iškviesti | techninę pagalbą kelyje | jums.",
        "O ne! Už dviejų kvartalų yra autoservisas, arba galiu jums iškviesti techninę pagalbą kelyje."),
    ],
    flat_reply: [
      t("Oh | no! | Is | it | a | rental? | Call | the | number | on | your | key | tag, | and | they'll send | someone.",
        "O | ne! | Ar | tai | — | nuomojamas? | Skambinkite | — | numeriu | ant | jūsų | rakto | pakabuko, | ir | jie atsiųs | ką nors.",
        "O ne! Ar automobilis nuomotas? Skambinkite numeriu, nurodytu ant rakto pakabuko, ir jie ką nors atsiųs.",
        { flags: { 2: "“Is” in a yes/no question = the particle ar; the copula has no separate word here." } }),
    ],
    mechanic: [
      t("Sure, | Mike's Auto Repair | is | just | two | blocks | down | on the left.", "Žinoma, | „Mike's Auto Repair“ | yra | tik | už dviejų | kvartalų | — | kairėje.",
        "Žinoma, „Mike's Auto Repair“ – vos už dviejų kvartalų, kairėje.", { flags: { 6: "“down” (two blocks down): už … kvartalų carries it." } }),
    ],
    calling: [
      t("Sure, | hon, | I'll call | them | right now. | They | usually | get | here | in | about | thirty | minutes.",
        "Žinoma, | {m:mielasis|f:mieloji}, | paskambinsiu | jiems | tuoj pat. | Jie | paprastai | atvyksta | čia | per | maždaug | trisdešimt | minučių.",
        "Žinoma, {m:mielasis|f:mieloji}, tuoj paskambinsiu. Jie paprastai atvyksta per maždaug pusvalandį."),
    ],
    all_good: [t("Great! | Drive | safe!", "Puiku! | Vairuokite | atsargiai!", "Puiku! Saugaus kelio!")],
    anything_else: [t("Anything | else | I | can | do | for you?", "Ką nors | daugiau | aš | galiu | padaryti | jums?", "Ar dar kuo nors galiu padėti?")],
    bye: [
      t("Have | a | good | one!", "Linkiu | — | geros | dienos!", "Geros dienos!", { flags: { 3: "“one” (have a good one): a stand-in for “day”; Lithuanian names it (dienos)." } }),
      t("Drive | safe, | hon!", "Vairuokite | atsargiai, | {m:mielasis|f:mieloji}!", "Saugaus kelio, {m:mielasis|f:mieloji}!"),
      t("Thanks, | and | have | a | great | trip!", "Ačiū, | ir | linkiu | — | puikios | kelionės!", "Ačiū ir geros kelionės!"),
    ],
    ack: [t("Okay.", "Gerai.", "Gerai."), t("Got it.", "Supratau.", "Supratau."), t("Sure.", "Žinoma.", "Žinoma.")],
    no_problem: [t("No | problem.", "Jokių | problemų.", "Jokių problemų.")],
  },

  domains: {
    price: () => {
      const s = new Set<number>([GALLON]);
      const snackPrices = SNACKS.map((e) => e.attrs!.price as number);
      const sums = new Set<number>([0]);
      for (const a of snackPrices) { sums.add(a); for (const b of snackPrices) sums.add(a + b); }
      for (let d = 5; d <= 100; d += 5) for (const x of sums) s.add(d * 100 + x);
      for (const x of sums) if (x) s.add(x);
      for (const f of FILL_COSTS) { s.add(f); for (const leave of [5000, 6000, 7000, 8000, 10000]) s.add(leave - f); }
      return [...s].sort((a, b) => a - b);
    },
    num: () => [1, 2, 3, 4, 5, 6, 7, 8],
  },

  hints: {
    prepay: {
      lt: "Susimokėti už degalus iš anksto",
      items: [
        { id: "prepay", s: t("Forty | dollars | on | pump | three, | please.", "Keturiasdešimt | dolerių | į | kolonėlę | Nr. 3, | prašau.", "Keturiasdešimt dolerių į trečią kolonėlę, prašau."),
          note: "JAV degalinėse sakoma suma ir kolonėlės numeris. Trumpai: „Forty on three“." },
        { id: "fill", s: t("Fill | it | up | on | pump | three, | please.", "Pripilkite | jį | — | — | kolonėlėje | Nr. 3, | prašau.", "Pilną baką trečioje kolonėlėje, prašau.",
          { flags: { 2: "“up” (fill … up): the prefix pri- of pripilkite carries it.", 3: "“on”: the locative kolonėlėje carries it." } }) },
        { id: "pump_num", s: t("Pump | three.", "Kolonėlė | Nr. 3.", "Trečia kolonėlė.") },
        { id: "pump_on", s: t("I'm | on | pump | five.", "Aš esu | prie | kolonėlės | Nr. 5.", "Esu prie penktos kolonėlės.") },
        { id: "prepay_long", s: t("I'd like | to put | twenty | dollars | on | pump | two.", "Norėčiau | įpilti | už dvidešimt | dolerių | — | kolonėlėje | Nr. 2.", "Norėčiau įpilti už dvidešimt dolerių antroje kolonėlėje.",
          { flags: { 4: "“on”: the locative kolonėlėje carries it." } }) },
      ],
    },
    pump: {
      lt: "Pasakyti kolonėlės numerį",
      items: [
        { id: "pump_num", s: t("Pump | three.", "Kolonėlė | Nr. 3.", "Trečia kolonėlė.") },
        { id: "pump_on", s: t("I'm | on | pump | five.", "Aš esu | prie | kolonėlės | Nr. 5.", "Esu prie penktos kolonėlės.") },
      ],
    },
    agree: {
      lt: "Sutikti",
      items: [
        { id: "ok_ack", s: t("Sure, | no | problem.", "Žinoma, | jokių | problemų.", "Žinoma, jokių problemų.") },
        { id: "ok_ack", s: t("Okay, | thanks.", "Gerai, | ačiū.", "Gerai, ačiū.") },
      ],
    },
    amount: {
      lt: "Pasakyti sumą (arba „pilną baką“)",
      items: [
        { id: "amount", s: t("Forty | dollars, | please.", "Keturiasdešimt | dolerių, | prašau.", "Už keturiasdešimt dolerių, prašau.") },
        { id: "fill", s: t("Fill | it | up, | please.", "Pripilkite | jį | —, | prašau.", "Pilną baką, prašau.",
          { flags: { 2: "“up” (fill … up): the prefix pri- of pripilkite carries it." } }) },
      ],
    },
    leave: {
      lt: "Pasakyti, kiek pinigų palieki",
      items: [
        { id: "amount", s: t("Fifty | dollars.", "Penkiasdešimt | dolerių.", "Penkiasdešimt dolerių.") },
        { id: "leave", s: t("I'll leave | sixty | dollars.", "Paliksiu | šešiasdešimt | dolerių.", "Paliksiu šešiasdešimt dolerių.") },
      ],
    },
    debit: {
      lt: "Pasakyti: debetinė ar kredito kortelė",
      items: [
        { id: "credit", s: t("Credit, | please.", "Kredito, | prašau.", "Kredito kortele, prašau."), note: "JAV kasininkai dažnai klausia „Debit or credit?“." },
        { id: "debit", s: t("Debit, | please.", "Debetine, | prašau.", "Debetine kortele, prašau."), note: "Su debetine kortele gali tekti įvesti PIN kodą." },
      ],
    },
    help: {
      lt: "Paprašyti pagalbos",
      items: [
        { id: "q_mechanic", s: t("Is | there | a | mechanic | nearby?", "Ar yra | — | — | autoservisas | netoliese?", "Ar netoliese yra autoservisas?",
          { flags: { 1: "Existential “there”: no Lithuanian word; yra carries it (linked to “Is”)." } }) },
        { id: "call_roadside", s: t("Could | you | call | roadside assistance?", "Ar galėtumėte | jūs | iškviesti | techninę pagalbą kelyje?", "Ar galėtumėte iškviesti techninę pagalbą kelyje?") },
      ],
    },
    anything: {
      lt: "Padėkoti arba paklausti ko nors",
      items: [
        { id: "more_no", s: t("No, | that's | all. | Thanks!", "Ne, | tai | viskas. | Ačiū!", "Ne, tai viskas. Ačiū!") },
        { id: "q_restroom", s: t("Can | I | use | the | restroom?", "Ar galiu | aš | pasinaudoti | — | tualetu?", "Ar galiu pasinaudoti tualetu?") },
        { id: "q_highway", s: t("How | do | I | get | to | the | highway?", "Kaip | — | man | nuvažiuoti | iki | — | greitkelio?", "Kaip nuvažiuoti iki greitkelio?",
          { flags: { 1: "Question “do” has no Lithuanian word; Lithuanian uses the dative man + infinitive (linked to “get”)." } }) },
      ],
    },
    pump_problem: {
      lt: "Kolonėlė nepriima kortelės",
      items: [
        { id: "zip", s: t("The | pump | is asking | for | a | ZIP code.", "— | Kolonėlė | prašo | — | — | pašto kodo.", "Kolonėlė prašo pašto kodo.",
          { flags: { 3: "“for”: prašyti takes the genitive pašto kodo directly." } }) },
        { id: "card_pump", s: t("My | card | doesn't work | at the pump.", "Mano | kortelė | neveikia | prie kolonėlės.", "Mano kortelė prie kolonėlės neveikia.") },
        { id: "q_pay_pump", s: t("Can | I | pay | at the pump?", "Ar galiu | aš | sumokėti | prie kolonėlės?", "Ar galiu sumokėti prie kolonėlės?") },
      ],
    },
    shop: {
      lt: "Atsakyti, ar dar ko nors reikia", slot: "snack", examples: ["coffee", "water", "chips", "candy"],
      items: [
        { id: "just_gas", s: t("Just | the | gas, | thanks.", "Tik | — | degalus, | ačiū.", "Tik degalus, ačiū.") },
        { id: "snack_too", s: t("And | {X.np}, | please.", "Ir | {X.np:acc}, | prašau.", "Ir {X.np:acc}, prašau.") },
        { id: "snack_can", s: t("Can | I | get | {X.np} | too?", "Ar galiu | aš | gauti | {X.np:acc} | irgi?", "Ar galiu dar gauti {X.np:acc}?") },
        { id: "q_coffee", s: t("Where's | the | coffee?", "Kur yra | — | kava?", "Kur kava?") },
      ],
    },
    pay: {
      lt: "Susimokėti",
      items: [
        { id: "pay_card_short", s: t("Card, | please.", "Kortele, | prašau.", "Kortele, prašau.") },
        { id: "pay_cash_short", s: t("Cash, | please.", "Grynaisiais, | prašau.", "Grynaisiais, prašau.") },
        { id: "pay_card", s: t("Can | I | pay | by card?", "Ar galiu | aš | sumokėti | kortele?", "Ar galiu sumokėti kortele?") },
        { id: "pay_cash", s: t("I'll pay | in cash.", "Sumokėsiu | grynaisiais.", "Sumokėsiu grynaisiais.") },
        { id: "here_you_go", s: t("Here you go.", "Prašom.", "Prašom.") },
        { id: "credit", s: t("Credit, | please.", "Kredito, | prašau.", "Kredito kortele, prašau."), note: "JAV kasininkai dažnai klausia „Debit or credit?“." },
        { id: "receipt", s: t("Can | I | get | a | receipt?", "Ar galiu | aš | gauti | — | čekį?", "Ar galiu gauti čekį?") },
      ],
    },
    ask: {
      lt: "Paklausti (tualetas, kelias, oras padangoms)",
      items: [
        { id: "q_restroom", s: t("Can | I | use | the | restroom?", "Ar galiu | aš | pasinaudoti | — | tualetu?", "Ar galiu pasinaudoti tualetu?") },
        { id: "q_key", s: t("Could | I | have | the | restroom | key?", "Ar galėčiau | aš | gauti | — | tualeto | raktą?", "Ar galėčiau gauti tualeto raktą?") },
        { id: "q_highway", s: t("How | do | I | get | to | the | highway?", "Kaip | — | man | nuvažiuoti | iki | — | greitkelio?", "Kaip nuvažiuoti iki greitkelio?",
          { flags: { 1: "Question “do” has no Lithuanian word; Lithuanian uses the dative man + infinitive (linked to “get”)." } }) },
        { id: "q_air", s: t("Where | can | I | put | air | in | my | tires?", "Kur | galiu | aš | pripūsti | oro | į | savo | padangas?", "Kur galiu pripūsti padangas?") },
        { id: "q_grade", s: t("Which | one | is | diesel?", "Kuris | — | yra | dyzelinas?", "Kuris dyzelinas?", { flags: { 1: "Prop-word “one”: kuris already refers to the pump/handle." } }) },
      ],
    },
    trouble: {
      lt: "Automobilio gedimas",
      items: [
        { id: "car_wont_start", s: t("My | car | won't start.", "Mano | automobilis | neužsiveda.", "Mano automobilis neužsiveda.") },
        { id: "flat_tire", s: t("I | have | a | flat | tire.", "Aš | turiu | — | nuleistą | padangą.", "Man nuleista padanga.") },
        { id: "q_mechanic", s: t("Is | there | a | mechanic | nearby?", "Ar yra | — | — | autoservisas | netoliese?", "Ar netoliese yra autoservisas?",
          { flags: { 1: "Existential “there”: no Lithuanian word; yra carries it (linked to “Is”)." } }) },
        { id: "call_roadside", s: t("Could | you | call | roadside assistance?", "Ar galėtumėte | jūs | iškviesti | techninę pagalbą kelyje?", "Ar galėtumėte iškviesti techninę pagalbą kelyje?") },
      ],
    },
  },

  tips: TIPS,

  merges: {
    "how much": { reason: "lexical_expression", split: "how → kaip + much → daug is false; asking an amount = kiek.", minimal: "Two words." },
    "out of order": { reason: "lexical_expression", split: "out → lauke, of → —, order → tvarka is false; a machine that does not work = neveikianti.", minimal: "Three words form the expression." },
    "zip code": { reason: "lexical_expression", split: "zip → užtrauktukas + code → kodas is false; the US postal code = pašto kodas.", minimal: "Two words, one noun." },
    "at the pump": { reason: "grammatical_fusion", split: "at → prie + the → — + pump → kolonėlė: prie kolonėlės covers the phrase with its case.", minimal: "No independent adjective inside (C-CASE)." },
    "go ahead": { reason: "lexical_expression", split: "go → eikite + ahead → pirmyn is false; an invitation to do something = prašom.", minimal: "Two words." },
    "you're back": { reason: "grammatical_fusion", split: "you're → jūs esate + back → atgal gives a stative calque; = jūs grįžote.", minimal: "Two words." },
    "95 north": { reason: "lexical_expression", split: "A highway name: the number and the direction form one sign (į 95 šiaurę).", minimal: "One road name." },
    "came to": { reason: "lexical_expression", split: "came → atėjo + to → į is false; a total that came to X = kainavo.", minimal: "Two words." },
    "they'll send": { reason: "grammatical_fusion", split: "they'll → jie + send drops “will”; the Lithuanian future is the verb ending (atsiųs).", minimal: "Object stays outside (C-FUT)." },
    "doesn't work": { reason: "grammatical_fusion", split: "Negation with auxiliary: = neveikia.", minimal: "Two words (C-NEG)." },
    "won't start": { reason: "grammatical_fusion", split: "won't → nebus + start → pradėti: a car that won't start = neužsiveda.", minimal: "Two words (C-NEG)." },
    "roadside assistance": { reason: "lexical_expression", split: "roadside → pakelės + assistance → pagalba names no service; the breakdown service = techninė pagalba kelyje.", minimal: "Two words, one service." },
    "out of here": { reason: "lexical_expression", split: "out → lauk, of → iš, here → čia: leaving a place by car = išvažiavę iš čia.", minimal: "Three words form the expression." },
    "help yourself": { reason: "lexical_expression", split: "help → padėkite + yourself → sau is a calque; an invitation to take something = vaišinkitės.", minimal: "Two words." },
    "mike's auto repair": { reason: "lexical_expression", split: "A business name; mike's → Maiko, auto → auto, repair → remontas would translate a proper name.", minimal: "One name." },
    "you're all set": { reason: "lexical_expression", split: "You're → jūs esate, all → visi, set → nustatyti is false; = viskas sutvarkyta.", minimal: "The formula needs all three." },
  },

  mission: [
    { lt: "Pasakyk sumą arba „pilną baką“", done: (c) => !!c.s.amount || !!c.s.fill },
    { lt: "Pasakyk kolonėlės numerį", done: (c) => !!c.s.pump },
    { lt: "Susimokėk kasoje", done: (c) => !!c.s.paid },
    { lt: "Papasakok apie gedimą", optional: true, when: (c) => !!c.s.troubleAsked || !!c.s.trouble, done: (c) => !!c.s.troubleDone },
  ],

  // -------------------------------------------------------------------------

  steps: [
    { id: "order", done: (c) => !!c.s.amount || !!c.s.fill,
      ask: (c) => {
        if (!c.s.greeted) { c.s.greeted = true; c.say("greet"); return; }
        c.say(c.s.pump ? "ask_amount" : "ask_what");
      },
      expects: ["prepay", "fill", "zip_problem", "pay_pump_q", "pump_ctx", "want_gas"],
      suggest: [
        { lt: "Pasakyti sumą ir kolonėlės numerį (arba „pilną baką“)", hint: "prepay" },
        { lt: "Pasakyti, kad kolonėlė nepriima kortelės", hint: "pump_problem" },
      ] },
    { id: "pump", when: (c) => (!!c.s.amount || !!c.s.fill) && !c.s.pump, done: (c) => !!c.s.pump,
      ask: (c) => c.say("ask_pump"), expects: ["pump_ctx", "amount_change_ctx"],
      suggest: [{ lt: "Pasakyti kolonėlės numerį", hint: "pump" }] },
    { id: "out_of_order", when: (c) => !!c.s.pump && c.s.oooTwist && c.s.pump !== 5 && !c.s.oooDone, done: (c) => !!c.s.oooDone,
      // explained once; after a side question Dot only asks again ("So, could you use pump five?")
      ask: (c) => {
        c.s.oooAsks = (c.s.oooAsks || 0) + 1;
        if (c.s.oooAsks > 1) { c.say("ooo_again"); return; }
        c.twist("out_of_order"); c.say("out_of_order", { num: c.s.pump });
      },
      expects: ["pump_ctx", "ok_ack"],
      suggest: [{ lt: "Sutikti naudoti kitą kolonėlę", hint: "agree" }],
      yes: (c) => { c.s.pump = 5; c.s.oooDone = true; c.say("ack"); },
      no: (c) => { c.s.pump = 5; c.s.oooDone = true; c.say("ack"); } },
    { id: "amount", when: (c) => !!c.s.pump && !c.s.amount && !c.s.fill, done: (c) => !!c.s.amount || !!c.s.fill,
      ask: (c) => c.say("ask_amount"), expects: ["amount_ctx", "fill", "prepay"],
      suggest: [{ lt: "Pasakyti sumą (arba „pilną baką“)", hint: "amount" }] },
    { id: "extras", when: (c) => !!c.s.pump && (!!c.s.amount || !!c.s.fill) && c.s.askExtras && c.s.extrasDone === undefined && !c.s.paid, done: (c) => c.s.extrasDone !== undefined,
      ask: (c) => c.say("ask_extras"), expects: ["snack_order", "more_no", "amount_change_ctx"],
      suggest: [{ lt: "Atsakyti, ar dar ko nors reikia", hint: "shop", options: "snack" }],
      yes: (c) => { c.s.extrasDone = false; c.say("snack_ok"); c.hold(); },
      no: (c) => { c.s.extrasDone = true; } },
    { id: "fill_pay", when: (c) => !!c.s.fill && !!c.s.pump && !c.s.method, done: (c) => !!c.s.method,
      ask: (c) => c.say("fill_how_pay"), expects: ["pay_card", "pay_cash", "amount_change_ctx"],
      suggest: [{ lt: "Pasakyti, kaip mokėsi", hint: "pay" }] },
    { id: "leave", when: (c) => !!c.s.fill && c.s.method === "cash" && !c.s.leave, done: (c) => !!c.s.leave,
      ask: (c) => c.say("ask_leave"), expects: ["amount_ctx", "here_you_go"],
      suggest: [{ lt: "Pasakyti, kiek pinigų palieki", hint: "leave" }] },
    { id: "pay", when: (c) => !!c.s.pump && (!!c.s.amount || (!!c.s.fill && (c.s.method === "card" || !!c.s.leave))), done: (c) => !!c.s.paid,
      ask: (c) => {
        if (c.s.fill && c.s.method === "card") { c.s.paid = true; c.say("fill_card"); c.say("card_ok"); c.event("pay", { method: "card", hold: true }); return; }
        if (c.s.fill && c.s.method === "cash" && !c.s.totalSaid) { c.s.totalSaid = true; return; } // "Okay, $60 on pump 2" was just said
        if (!c.s.totalSaid) {
          c.s.totalSaid = true;
          c.say("say_total", { price: payNow(c) });
          if (c.s.method) { finishPay(c, c.s.method); return; }
          if (c.chance(0.5)) c.say("ask_pay");
          return;
        }
        c.say("ask_pay");
      },
      expects: ["pay_card", "pay_cash", "here_you_go", "no_cash", "amount_change_ctx"],
      suggest: [{ lt: "Susimokėti kortele ar grynaisiais", hint: "pay" }] },
    { id: "debit", when: (c) => c.s.method === "card" && c.s.askDebit && !c.s.cardType && !!c.s.paid && !c.s.fill, done: (c) => !!c.s.cardType,
      ask: (c) => c.say("ask_debit"), expects: ["credit_debit"],
      suggest: [{ lt: "Pasakyti: debetinė ar kredito kortelė", hint: "debit" }] },
    { id: "receipt", when: (c) => !!c.s.paid && c.s.askReceipt && c.s.receipt === undefined, done: (c) => c.s.receipt !== undefined,
      ask: (c) => c.say("ask_receipt"), expects: ["receipt_ask", "no_receipt", "receipt_no_ctx"],
      suggest: [{ lt: "Atsakyti, ar reikia čekio", hint: "g_yesno" }],
      yes: (c) => { c.s.receipt = true; c.say("receipt_here"); c.event("give", { item: "receipt" }); },
      no: (c) => { c.s.receipt = false; c.say("no_problem"); } },
    { id: "pump_on", when: (c) => !!c.s.paid, done: (c) => !!c.s.pumpOn,
      ask: (c) => { c.s.pumpOn = true; c.complete(); c.say("pump_on", { num: c.s.pump }); c.event("fuel", { pump: c.s.pump, amount: c.s.amount, fill: !!c.s.fill }); },
      suggest: [
        { lt: "Padėkoti", hint: "g_social" },
        { lt: "Paklausti (tualetas, kelias į greitkelį, oras padangoms)", hint: "ask" },
      ] },
    { id: "after", when: (c) => !!c.s.pumpOn && !!c.s.fill && c.s.method === "cash" && !c.s.changeBack, done: (c) => !!c.s.changeBack,
      ask: (c) => {
        c.s.changeBack = true;
        c.say("after_fill", { price: c.s.fillCost });
        c.say("change_is", { price: Math.max(0, c.s.leave - c.s.fillCost) });
      },
      suggest: [{ lt: "Padėkoti", hint: "g_social" }] },
    { id: "trouble", when: (c) => !!c.s.pumpOn && c.s.troubleTwist && !c.s.troubleDone && !c.s.trouble && (!c.s.fill || c.s.method !== "cash" || !!c.s.changeBack), done: (c) => !!c.s.trouble || !!c.s.troubleDone,
      ask: (c) => { c.s.troubleAsked = true; c.twist("car_trouble"); c.say("back_already"); },
      expects: ["trouble", "ok_ack"],
      suggest: [
        { lt: "Papasakoti apie gedimą (neužsiveda, nuleista padanga)", hint: "trouble" },
      ],
      yes: (c) => { c.s.troubleDone = true; c.say("all_good"); } },
    { id: "trouble_help", when: (c) => !!c.s.trouble && !c.s.troubleDone, done: (c) => !!c.s.troubleDone,
      ask: (c) => {
        if (!c.s.troubleReplied) { c.s.troubleReplied = true; c.say(c.s.trouble === "flat" ? "flat_reply" : "trouble_reply"); return; }
        c.say("anything_else");
      },
      expects: ["ask_mechanic", "call_help", "more_no"],
      suggest: [{ lt: "Paklausti apie autoservisą arba paprašyti iškviesti pagalbą", hint: "help" }],
      no: (c) => { c.s.troubleDone = true; } },
    { id: "anything", when: (c) => !!c.s.pumpOn && c.s.askAnything && !c.s.anythingDone && !c.s.troubleTwist, done: (c) => !!c.s.anythingDone,
      ask: (c) => c.say("anything_else"),
      expects: ["restroom", "directions", "air", "more_no", "atm"],
      suggest: [{ lt: "Padėkoti arba paklausti ko nors", hint: "anything" }],
      no: (c) => { c.s.anythingDone = true; } },
  ],

  init: (c) => {
    c.s.snacks = [];
    c.s.askExtras = c.chance(0.5);
    c.s.askDebit = c.chance(0.35);
    c.s.askReceipt = c.chance(0.45);
    c.s.askAnything = c.chance(0.5);
    c.s.oooTwist = c.chance(0.2);
    c.s.troubleTwist = c.visits >= 1 && c.chance(0.45);
    c.s.fillCost = c.pick(FILL_COSTS);
  },

  start: () => { /* the first step greets */ },

  handlers: {
    prepay(c, slots, seg) {
      if (c.s.paid) return;
      const cents = (slots.money?.price as number | undefined) ?? dolCents(slots.dol);
      if (cents && cents >= 500 && cents <= 20000) {
        if (c.s.totalSaid && c.s.amount !== cents) c.s.totalSaid = false; // a new amount: Dot says the new total
        c.s.amount = cents;
      }
      const p = pumpOf(slots.pnum);
      if (p) c.s.pump = p;
      if (allTags(slots, seg).includes("diesel")) c.s.grade = "diesel";
      if (c.s.fill) c.s.fill = false;
    },
    fill(c, slots) {
      if (c.s.paid) return;
      c.s.fill = true; c.s.amount = undefined;
      const p = pumpOf(slots.pnum);
      if (p) c.s.pump = p;
    },
    pump_ctx(c, slots) {
      const p = pumpOf(slots.pnum);
      if (!p) return;
      if (c.step === "out_of_order") { c.s.pump = p; c.s.oooDone = true; c.say("ack"); return; }
      if (!c.s.paid) c.s.pump = p;
    },
    amount_ctx(c, slots) {
      const cents = slots.money?.price as number | undefined;
      if (!cents) return;
      if (c.step === "leave" || (c.s.fill && c.s.method === "cash")) {
        if (cents >= c.s.fillCost) { c.s.leave = cents; c.say("leave_ok", { price: cents, num: c.s.pump }); }
        else { c.s.fill = false; c.s.amount = cents; } // not enough for a full tank: prepay that amount
        return;
      }
      if (!c.s.paid && cents >= 500) c.s.amount = cents;
    },
    amount_change_ctx(c, slots) {
      const cents = slots.money?.price as number | undefined;
      if (!cents || c.s.paid || cents < 500 || cents > 20000) return;
      c.s.fill = false; c.s.amount = cents;
      // at the paying step the pay step says the new total; before it, a short okay
      if (c.s.totalSaid) c.s.totalSaid = false; else c.say("ack");
    },
    grade_ans(c, _slots, seg) {
      const tags = seg.tags;
      c.s.grade = tags.includes("diesel") ? "diesel" : tags.includes("premium") ? "premium" : tags.includes("mid") ? "mid" : "regular";
      c.say(c.s.grade === "diesel" ? "diesel_info" : "grade_info");
    },
    grade_q(c, _slots, seg) {
      if (seg.tags.includes("diesel")) c.say("diesel_info");
      else if (/\brental\b|\bokay\b|\bfine\b|\bgood\b/i.test(c.heard)) c.say("regular_fine");
      else c.say("grade_info");
    },
    gas_price_q(c, _slots, seg) { if (seg.tags.includes("liter")) c.say("liter_joke"); else c.say("gas_price", { price: GALLON }); },
    zip_problem(c) { c.say("zip_explain"); c.tip(TIPS.prepay); },
    want_gas(c) { if (c.s.paid) return; c.say(c.s.pump ? "ask_amount" : "ask_pump"); c.hold(); },
    receipt_no_ctx(c, slots, seg) { gas.handlers.no_receipt(c, slots, seg); },
    pay_pump_q(c) { c.say("pay_pump_answer"); },
    snack_order(c, slots) {
      const id = slots.snack as string | undefined;
      if (!id) return;
      if ((c as any).__snackSet?.includes(id)) return;
      ((c as any).__snackSet ??= []).push(id);
      if (!c.s.paid) { snacks(c).push(id); c.s.totalSaid = false; }
      c.s.extrasDone = true;
      if (c.step === "extras" || c.step === "order" || c.step === "pump" || c.step === "amount") c.say(id === "coffee" ? "snack_ok" : "snack_added");
      else c.say("snack_added");
    },
    coffee_where(c) { c.say("coffee_where"); },
    restroom(c) { if (/\btoilet/i.test(c.heard)) c.tip(TIPS.uk_toilet); c.say("restroom_key"); c.s.keyGiven = true; },
    key_back(c) { c.say("key_thanks"); },
    directions(c) { c.say("directions"); if (c.step === "anything") c.s.anythingDone = true; },
    air(c) { c.say("air"); if (c.step === "anything") c.s.anythingDone = true; },
    atm(c) { c.say("atm"); },
    trouble(c, _slots, seg) {
      if (c.s.trouble) return;
      c.s.trouble = seg.tags.includes("h:flat_tire") || /\bflat\b/i.test(c.heard) ? "flat" : "start";
      c.s.troublePhase ??= 1;
      // told without Dot asking (after paying, or at goodbye): she answers right away
      if (c.step !== "trouble") c.ask("trouble_help");
    },
    ask_mechanic(c) { c.say("mechanic"); if (c.s.trouble || c.s.troubleTwist) c.s.troubleDone = true; },
    call_help(c) { c.say("calling"); if (c.s.trouble || c.s.troubleTwist) c.s.troubleDone = true; },
    receipt_ask(c) { if (c.s.receipt !== true) { c.s.receipt = true; c.say("receipt_here"); c.event("give", { item: "receipt" }); } },
    no_receipt(c) { if (c.s.receipt === undefined) { c.s.receipt = false; c.say("no_problem"); } },
    pay_card(c) { choosePay(c, "card"); },
    pay_cash(c) { choosePay(c, "cash"); },
    no_cash(c) { choosePay(c, "card"); },
    here_you_go(c, slots, seg) {
      // "Here's sixty dollars" = the amount left for a fill-up
      if (c.step === "leave") { if (typeof slots.price === "number") gas.handlers.amount_ctx(c, { money: { price: slots.price } }, seg); return; }
      if (c.s.totalSaid && !c.s.paid) finishPay(c, c.s.method ?? "cash");
    },
    credit_debit(c, _slots, seg) {
      if (c.s.cardType) return;
      c.s.cardType = seg.tags.includes("debit") ? "debit" : "credit";
      if (c.s.cardType === "debit") c.say("pin"); else c.say("ack");
    },
    more_no(c) {
      if (c.step === "extras") c.s.extrasDone = true;
      if (c.step === "anything") c.s.anythingDone = true;
      if (c.step === "trouble_help") c.s.troubleDone = true;
    },
    ok_ack(c) {
      if (c.step === "out_of_order" && !c.s.oooDone) { c.s.pump = 5; c.s.oooDone = true; }
      // "Sure, thanks!" to "Do you want a receipt?"
      if (c.step === "receipt" && c.s.receipt === undefined) { c.s.receipt = true; c.say("receipt_here"); c.event("give", { item: "receipt" }); }
    },
    // "Thank you!" after "Pump 3 is on.": the task is done there, but the conversation goes on to Dot's
    // next question (or the twist) and her goodbye. The global handler would hold it at "Pump 3 is on." for good.
    g_thanks(c) {
      c.say("g_welcome");
      if (c.s.__finished) c.hold();
    },
  },

  finish: (c) => {
    c.complete();
    if (c.s.keyGiven) c.say("key_thanks");
    c.say("bye");
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
    { say: "Forty dollars on pump three, please.", intent: "prepay", slots: { pnum: "3" } },
    { say: "Forty on three.", intent: "prepay", slots: { pnum: "3" } },
    { say: "Twenty bucks on pump five.", intent: "prepay", slots: { pnum: "5" } },
    { say: "I'd like to put twenty dollars on pump two.", intent: "prepay" },
    { say: "$30 of regular on pump 4, please.", intent: "prepay" },
    { say: "Fill it up on pump three, please.", intent: "fill", slots: { pnum: "3" } },
    { say: "Can you fill it up?", intent: "fill" },
    { say: "A full tank on pump six.", intent: "fill" },
    { say: "Pump three.", intent: "pump_ctx", step: "pump", slots: { pnum: "3" } },
    { say: "I'm on pump five.", intent: "pump_ctx", step: "pump" },
    { say: "Three", intent: "pump_ctx", step: "pump" },
    { say: "Three", intent: "none" },
    { say: "Forty dollars, please.", intent: "amount_ctx", step: "amount" },
    { say: "Forty dollars, please.", intent: "prepay" },
    { say: "Fifty dollars.", intent: "amount_ctx", step: "leave" },
    { say: "The pump is asking for a ZIP code.", intent: "zip_problem" },
    { say: "My card doesn't work at the pump.", intent: "zip_problem" },
    { say: "Can I pay at the pump?", intent: "pay_pump_q" },
    { say: "And a coffee, please.", intent: "snack_order", slots: { snack: "coffee" } },
    { say: "Can I get a bottle of water too?", intent: "snack_order", slots: { snack: "water" } },
    { say: "Just the gas, thanks.", intent: "more_no", step: "extras" },
    { say: "Where's the coffee?", intent: "coffee_where" },
    { say: "Credit, please.", intent: "credit_debit", step: "debit" },
    { say: "Debit", intent: "credit_debit", step: "debit" },
    { say: "Can I pay by card?", intent: "pay_card", step: "pay" },
    { say: "Cash", intent: "pay_cash", step: "pay" },
    { say: "Can I get a receipt?", intent: "receipt_ask" },
    { say: "Can I use the restroom?", intent: "restroom" },
    { say: "Could I have the restroom key?", intent: "restroom" },
    { say: "How do I get to the highway?", intent: "directions" },
    { say: "Which way to the motorway?", intent: "directions" },
    { say: "Where can I put air in my tires?", intent: "air" },
    { say: "Which one is diesel?", intent: "grade_q" },
    { say: "How much is regular?", intent: "gas_price_q" },
    { say: "My car won't start.", intent: "trouble" },
    { say: "I have a flat tire.", intent: "trouble" },
    { say: "I've got a flat tyre.", intent: "trouble" },
    { say: "Is there a mechanic nearby?", intent: "ask_mechanic" },
    { say: "Could you call roadside assistance?", intent: "call_help" },
    { say: "I don't need a receipt.", intent: "no_receipt", not: ["receipt_ask"] },
    { say: "My card didn't work at the pump.", intent: "zip_problem", not: ["pay_card"] },
    { say: "No receipt, thanks.", intent: "no_receipt", step: "receipt", not: ["receipt_ask"] },
    { say: "banana gasoline purple sky", intent: "none" },
    { say: "the tires are singing opera", intent: "none" },
    // more ways to say it (dev corpus tests/corpus/s71b-gas.json)
    { say: "Pump three, forty dollars", intent: "prepay", slots: { pnum: "3" } },
    { say: "Can I have twenty on six?", intent: "prepay", slots: { pnum: "6" } },
    { say: "Could I prepay forty dollars for pump three?", intent: "prepay", slots: { pnum: "3" } },
    { say: "Full tank, pump two", intent: "fill", slots: { pnum: "2" } },
    { say: "I want to fill my car", intent: "fill" },
    { say: "I need gas", intent: "want_gas", step: "order" },
    { say: "Could you turn on pump three?", intent: "pump_ctx", step: "order", slots: { pnum: "3" } },
    { say: "It's pump four", intent: "pump_ctx", step: "pump", slots: { pnum: "4" } },
    { say: "I have a foreign card", intent: "zip_problem" },
    { say: "My card was declined at the pump", intent: "zip_problem" },
    { say: "Here's my card", intent: "pay_card", step: "pay", not: ["here_you_go"] },
    { say: "Can I tap?", intent: "pay_card", step: "pay" },
    { say: "It's a Visa debit", intent: "credit_debit", step: "debit" },
    { say: "No, I don't need it", intent: "receipt_no_ctx", step: "receipt", not: ["receipt_ask"] },
    { say: "Yes, pump five is fine", intent: "pump_ctx", step: "out_of_order", slots: { pnum: "5" } },
    { say: "Nothing, thank you", intent: "more_no", step: "extras" },
    { say: "No coffee, thanks", intent: "more_no", step: "extras", not: ["snack_order"] },
    { say: "I'm paying with cash", intent: "pay_cash", step: "fill_pay" },
    { say: "Let's say fifty", intent: "amount_ctx", step: "leave" },
    // changing the prepay amount
    { say: "Actually, make it forty.", intent: "amount_change_ctx", step: "pay" },
    { say: "Can you make it fifty instead?", intent: "amount_change_ctx", step: "pay" },
    { say: "Forty instead, please.", intent: "amount_change_ctx", step: "extras" },
    { say: "Here's forty dollars.", intent: "here_you_go", step: "pay", not: ["amount_change_ctx"] },
    { say: "The engine doesn't start", intent: "trouble" },
    { say: "I need a mechanic", intent: "ask_mechanic" },
    { say: "Where can I put air?", intent: "air" },
    { say: "I don't need gas", intent: "none", step: "order" },
    // learner English
    { say: "I want full tank", intent: "fill", step: "order" },
    { say: "My card not working on pump", intent: "zip_problem", not: ["pay_card"] },
    { say: "How I go to highway?", intent: "directions" },
    { say: "My car not start", intent: "trouble" },
    { say: "No, only gas", intent: "more_no", step: "extras" },
    { say: "I don't have cash", intent: "no_cash", step: "pay", not: ["pay_cash"] },
    { say: "I don't want a coffee", intent: "more_no", step: "extras", not: ["snack_order"] },
  ],

  sims: [
    // pump 3 works (the out-of-order twist has its own sim)
    { name: "prepay forty on pump three, card",
      turns: ["Hi! Forty dollars on pump three, please.", "Can I pay by card?", "Thank you!"],
      auto: omit(AUTO, ["order", "pay"]), expect: { complete: true }, setup: (s) => { s.oooTwist = false; } },
    // "Thanks!" answers "Pump 2 is on." and "Thank you!" the change (no auto answers there)
    { name: "ZIP problem, fill up with cash, change",
      turns: ["Hi. The pump is asking for a ZIP code.", "Fill it up on pump two, please.", "Cash.", "Sixty dollars.", "Here you go.", "Thanks!", "Thank you!"],
      auto: omit(AUTO, ["order", "fill_pay", "leave", "pump_on", "after"]), expect: { complete: true } },
    { name: "snacks, questions and a flat tire",
      turns: ["Twenty on pump five, and a coffee, please.", "Where's the coffee?", "Card.", "Debit.", "Can I use the restroom?", "I have a flat tire.",
        "Is there a mechanic nearby?", "How do I get to the highway?", "Bye!"],
      auto: omit(AUTO, ["order", "pay"]), expect: { complete: true }, setup: (s) => { s.troubleTwist = true; s.askDebit = true; } },
    // "Can I pay by card?" before the total gets a "Sure." (then Dot's question again, briefly: asked twice, explained once)
    { name: "pump out of order (twist)",
      turns: ["Forty on pump three, please.", "Can I pay by card?", "Sure, no problem.", "Thanks!"],
      auto: omit(AUTO, ["order", "out_of_order", "pay"]), expect: { complete: true, state: { oooAsks: 2, oooDone: true, pump: 5 } }, setup: (s) => { s.oooTwist = true; } },
    { name: "gas first, the pump after",
      turns: ["Hi! I need gas.", "Twenty dollars, please.", "I'm at pump four.", "Card, please.", "Thank you!"],
      auto: omit(AUTO, ["order", "pump", "pay"]), expect: { complete: true } },
    { name: "changing the amount",
      turns: ["Thirty on pump six, please.", "Actually, make it forty.", "Card, please.", "Thanks!"],
      auto: omit(AUTO, ["order", "pay"]), expect: { complete: true } },
  ],
};

// ---------------------------------------------------------------------------

function dolCents(v: any): number | undefined {
  if (!v) return undefined;
  const n = Array.isArray(v.number) ? v.number : [v.number];
  if (typeof n[0] !== "number") return undefined;
  return n[0] * 100 + (typeof n[1] === "number" && n[1] < 100 ? n[1] : 0);
}

function choosePay(c: Ctx, method: "card" | "cash") {
  if (c.s.paid) return;
  c.s.method = method;
  if (c.s.fill) return; // fill-up: the fill_pay / leave / pay steps continue
  if (c.s.totalSaid) finishPay(c, method);
  else c.say("ack"); // "Can I pay by card?" before the total: "Sure." (not silence; the total comes next)
}

function finishPay(c: Ctx, method: "card" | "cash") {
  if (c.s.paid) return;
  c.s.paid = true;
  c.s.method = method;
  if (method === "card") c.say("card_ok"); else c.say(c.s.fill ? "cash_exact" : "cash_ok");
  c.event("pay", { method, amount: payNow(c) });
}

export default gas;
