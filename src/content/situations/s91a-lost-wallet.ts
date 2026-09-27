// Song 91 "Can You Help Me, Please?" (part 1): asking a stranger for help.
// Town Square, Sunday market. The learner has lost their wallet (or phone / bag) and asks
// Mrs. Lee at the flower stall for help: when did you last have it, what does it look like,
// where is the police station, should I call 911. Twist (some visits): a boy finds it.
//
// Mrs. Lee "marks it on your map": c.event("mark-location", { to: "police" }) (handled by the world).
//
// Mrs. Lee is formal (jūs) and warm ("dear" → {m:mielasis|f:mieloji}, the player's gender).

import type { Ctx, EntityDef, HintItem, Pending, SituationDef } from "../types";
import { ent, t } from "../dsl";
import { expectHowAreYou } from "../global";

// ---------------------------------------------------------------------------
// Entities

export const ITEMS: EntityDef[] = [
  ent("wallet", "wallet", "piniginė/piniginės/piniginei/piniginę/pinigine/piniginėje", "f",
    { forms: ["wallets", "my wallet", "billfold", "money clip", "purse", "money", "cash", "card holder", "cardholder"], chip: "piniginę" }),
  ent("phone", "phone", "telefonas/telefono/telefonui/telefoną/telefonu/telefone", "m",
    { forms: ["cell phone", "cellphone", "cell", "smartphone", "iphone", "mobile phone", "mobile"], chip: "telefoną" }),
  ent("bag", "bag", "rankinė/rankinės/rankinei/rankinę/rankine/rankinėje", "f",
    { forms: ["handbag", "shoulder bag", "tote bag", "tote"], chip: "rankinę" }),
  ent("backpack", "backpack", "kuprinė/kuprinės/kuprinei/kuprinę/kuprine/kuprinėje", "f",
    { forms: ["rucksack", "back pack"], chip: "kuprinę" }),
];

// Places where the learner last had it. prep: the Lithuanian preposition used with "go back to …".
const P = (id: string, en: string, lt: string, g: "m" | "f", kind: "shop" | "outdoor" | "bus" | "taxi", prep: "i" | "prie", forms: string[] = [], chip?: string) =>
  ent(id, en, lt, g, { forms, attrs: { kind, prep }, chip });
export const PLACES: EntityDef[] = [
  P("cafe", "café", "kavinė/kavinės/kavinei/kavinę/kavine/kavinėje", "f", "shop", "i", ["cafe", "coffee shop", "sunny cup", "the sunny cup", "sunny cup cafe", "coffee place"], "kavinėje"),
  P("bakery", "bakery", "kepykla/kepyklos/kepyklai/kepyklą/kepykla/kepykloje", "f", "shop", "i", ["bread stand", "bakery stand"], "kepykloje"),
  P("fruit_stand", "fruit | stand", "vaisių | prekystalis/prekystalio/prekystaliui/prekystalį/prekystaliu/prekystalyje", "m", "outdoor", "prie",
    ["fruit stall", "strawberry stand", "vegetable stand", "farm stand", "the market stall", "market stall", "stall"], "prie vaisių prekystalio"),
  P("market", "market", "turgus/turgaus/turgui/turgų/turgumi/turguje", "m", "outdoor", "i", ["farmers market", "farmer's market", "farmers' market", "the market", "town square", "the square", "the town square"], "turguje"),
  P("bank", "bank", "bankas/banko/bankui/banką/banku/banke", "m", "shop", "i", ["harbor bank"], "banke"),
  P("atm", "ATM", "bankomatas/bankomato/bankomatui/bankomatą/bankomatu/bankomate", "m", "outdoor", "prie", ["a t m", "cash machine", "cashpoint"], "prie bankomato"),
  P("pharmacy", "pharmacy", "vaistinė/vaistinės/vaistinei/vaistinę/vaistine/vaistinėje", "f", "shop", "i", ["drugstore", "chemist", "chemists"], "vaistinėje"),
  P("post_office", "post | office", "pašto | skyrius/skyriaus/skyriui/skyrių/skyriumi/skyriuje", "m", "shop", "i", ["post office", "the post office", "post"], "pašte"),
  P("supermarket", "supermarket", "prekybos centras/prekybos centro/prekybos centrui/prekybos centrą/prekybos centru/prekybos centre", "m", "shop", "i",
    ["grocery store", "store", "shop", "grocery", "the store"], "parduotuvėje"),
  P("museum", "museum", "muziejus/muziejaus/muziejui/muziejų/muziejumi/muziejuje", "m", "shop", "i", ["art museum"], "muziejuje"),
  P("restaurant", "restaurant", "restoranas/restorano/restoranui/restoraną/restoranu/restorane", "m", "shop", "i", ["the trattoria", "trattoria", "diner"], "restorane"),
  P("park", "park", "parkas/parko/parkui/parką/parku/parke", "m", "outdoor", "i", [], "parke"),
  P("bench", "bench", "suoliukas/suoliuko/suoliukui/suoliuką/suoliuku/suoliuke", "m", "outdoor", "prie", ["park bench"], "ant suoliuko"),
  P("fountain", "fountain", "fontanas/fontano/fontanui/fontaną/fontanu/fontane", "m", "outdoor", "prie", [], "prie fontano"),
  P("station", "station", "stotis/stoties/stočiai/stotį/stotimi/stotyje", "f", "shop", "i", ["train station", "union station", "bus station"], "stotyje"),
  P("bus", "bus", "autobusas/autobuso/autobusui/autobusą/autobusu/autobuse", "m", "bus", "i", ["the bus", "a bus", "bus number"], "autobuse"),
  P("taxi", "taxi", "taksi", "m", "taxi", "i", ["cab", "uber", "a taxi", "the taxi", "an uber"], "taksi"),
];

// Adjectives used as modifiers take the masculine lemma; the composer makes them agree.
export const COLORS: EntityDef[] = [
  ent("brown", "brown", "rudas/rudo/rudam/rudą/rudu/rudame", "m", { chip: "ruda", forms: ["dark brown", "light brown", "tan"] }),
  ent("black", "black", "juodas/juodo/juodam/juodą/juodu/juodame", "m", { chip: "juoda" }),
  ent("red", "red", "raudonas/raudono/raudonam/raudoną/raudonu/raudoname", "m", { chip: "raudona" }),
  ent("blue", "blue", "mėlynas/mėlyno/mėlynam/mėlyną/mėlynu/mėlyname", "m", { chip: "mėlyna", forms: ["light blue"] }),
  ent("navy", "navy", "tamsiai mėlynas/tamsiai mėlyno/tamsiai mėlynam/tamsiai mėlyną/tamsiai mėlynu/tamsiai mėlyname", "m", { chip: "tamsiai mėlyna", forms: ["navy blue", "dark blue"] }),
  ent("green", "green", "žalias/žalio/žaliam/žalią/žaliu/žaliame", "m", { chip: "žalia" }),
  ent("gray", "gray", "pilkas/pilko/pilkam/pilką/pilku/pilkame", "m", { chip: "pilka", forms: ["grey", "silver"] }),
  ent("white", "white", "baltas/balto/baltam/baltą/baltu/baltame", "m", { chip: "balta" }),
  ent("pink", "pink", "rožinis/rožinio/rožiniam/rožinį/rožiniu/rožiniame", "m", { chip: "rožinė" }),
  ent("yellow", "yellow", "geltonas/geltono/geltonam/geltoną/geltonu/geltoname", "m", { chip: "geltona" }),
  ent("purple", "purple", "violetinis/violetinio/violetiniam/violetinį/violetiniu/violetiniame", "m", { chip: "violetinė" }),
];
export const MATERIALS: EntityDef[] = [
  ent("leather", "leather", "odinis/odinio/odiniam/odinį/odiniu/odiniame", "m", { chip: "odinė", forms: ["real leather", "a leather"] }),
  ent("fabric", "fabric", "medžiaginis/medžiaginio/medžiaginiam/medžiaginį/medžiaginiu/medžiaginiame", "m", { chip: "medžiaginė", forms: ["cloth", "canvas", "nylon"] }),
  ent("plastic", "plastic", "plastikinis/plastikinio/plastikiniam/plastikinį/plastikiniu/plastikiniame", "m", { chip: "plastikinė" }),
];
export const SIZES: EntityDef[] = [
  ent("small", "small", "mažas/mažo/mažam/mažą/mažu/mažame", "m", { chip: "maža", forms: ["little", "tiny", "thin", "slim"] }),
  ent("big", "big", "didelis/didelio/dideliam/didelį/dideliu/dideliame", "m", { chip: "didelė", forms: ["large", "huge"] }),
];

const ALL = [...ITEMS, ...PLACES, ...COLORS, ...MATERIALS, ...SIZES];
const byId = (id: string) => ALL.find((e) => e.id === id)!;

// ---------------------------------------------------------------------------
// Helpers

const F_DID = "Wh-question “did”: no Lithuanian word; the past tense sits on the verb.";
const F_IS_Q = "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here.";

const item = (c: Ctx) => (c.s.item as string) || "wallet";
/** The lost thing as a noun phrase, with the description the learner gave (size, color, material). */
const itemNp = (c: Ctx) => ({ id: item(c), mods: [c.s.size, c.s.color, c.s.material].filter(Boolean) as string[] });

/** The current learner turn: the engine builds a fresh ctx object for every input, so the same
 *  sentence said on two different turns gets two different keys (c.heard alone would not). */
const turnIds = new WeakMap<object, number>();
let turnSeq = 0;
const turn = (c: Ctx) => { let t = turnIds.get(c); if (t === undefined) { t = ++turnSeq; turnIds.set(c, t); } return `${t}:${c.heard}`; };
/** The wallet is back (the boy found it, or the learner found it themselves). */
const gotBack = (c: Ctx) => c.s.found === "mine" || c.s.found === "self";

function mark(c: Ctx) {
  if (c.s.byeSaid) return false;
  return true;
}

function describeFrom(c: Ctx, slots: any) {
  const parts = ([] as any[]).concat(slots.dp ?? []);
  for (const p of parts) {
    if (p?.color) c.s.color = p.color;
    if (p?.material) c.s.material = p.material;
    if (p?.size) c.s.size = p.size;
  }
  if (slots.item) c.s.item = slots.item;
}

function bye(c: Ctx, thanked = false) {
  if (!c.s.byeSaid) { c.s.byeSaid = true; c.say(thanked ? "closing_welcome" : "closing_bye"); }
  c.hold();
  c.end();
}

// Hint items shared by several groups (the guide shows a group's first items as model answers).
export const IN_PLACE = (e: EntityDef) => e.attrs?.prep === "i" && !["bus", "taxi"].includes(e.attrs?.kind);
const H_HELP: HintItem = { id: "help_me", s: t("Excuse me, | can | you | help | me, | please?", "Atsiprašau, | ar galite | jūs | padėti | man, | prašau?", "Atsiprašau, ar galite man padėti?") };
const H_LOST: HintItem = { id: "lost_item", s: t("I've lost | my | {X}.", "Pamečiau | savo | {X:acc}.", "Pamečiau {X:acc}.") };
const H_CANT_FIND: HintItem = { id: "cant_find", s: t("I | can't find | my | {X}.", "Aš | nerandu | savo | {X:gen}.", "Nerandu savo {X:gen}.") };
const H_GONE: HintItem = { id: "gone", s: t("My | {X} | is gone.", "Mano | {X:nom} | dingo.", "Dingo mano {X:nom}.") };
export const H_AT_PLACE: HintItem = { id: "ls_place", only: IN_PLACE,
  s: t("At | {X.the}.", "— | {X.the:loc}.", "{X:loc}.", { flags: { 0: "“At”: the locative ending of the noun carries it (the article stands between)." } }) };
export const H_WAS_AT: HintItem = { id: "ls_place", only: IN_PLACE,
  s: t("I | was | at | {X.the}.", "Aš | buvau | — | {X.the:loc}.", "Buvau {X:loc}.", { flags: { 2: "“at”: the locative ending of the noun carries it." } }) };
export const H_NEAR: HintItem = { id: "ls_place", only: (e) => e.attrs?.prep === "prie",
  s: t("Near | {X.the}.", "Prie | {X.the:gen}.", "Prie {X:gen}.") };
export const H_ON_BUS: HintItem = { id: "ls_place", only: (e) => e.attrs?.kind === "bus",
  s: t("On | {X.the}.", "— | {X.the:loc}.", "{X:loc}.", { flags: { 0: "“On”: the locative ending of the noun carries it (the article stands between)." } }) };
export const H_IN_TAXI: HintItem = { id: "ls_place", only: (e) => e.attrs?.kind === "taxi",
  s: t("In | {X.the}.", "— | {X.the:loc}.", "{X:loc}.", { flags: { 0: "“In”: the (indeclinable) noun taksi stands alone; Lithuanian needs no preposition here." } }) };

const AUTO: Record<string, string> = {
  problem: "I've lost my wallet.",
  pockets: "Yes, I checked.",
  last_seen: "At the café, when I paid for my coffee.",
  where_then: "At the café.",
  describe: "It's brown, leather, and small.",
  police: "No, where is it?",
  found: "Yes, that's mine!",
  all_there: "Yes, everything's here.",
  closing: "Thank you so much! Bye!",
};

// ---------------------------------------------------------------------------

export const lostWallet: SituationDef = {
  id: "s91a-lost-wallet",
  song: 91,
  songTitle: "Can You Help Me, Please?",
  title: { en: "Can You Help Me, Please?", lt: "Ar galite man padėti?" },
  topic: { en: "Lost wallet", lt: "Pamesta piniginė" },
  chapter: 7,
  order: 1,
  location: "town-square",
  npc: "mrs_lee",
  goal: "Paprašyk pagalbos: pametei piniginę.",
  intro: "Sekmadienis, ūkininkų turgus aikštėje. Nori susimokėti už braškes, kiši ranką į kišenę – piniginės nėra! Prie gėlių prekystalio stovi malonioji ponia Li. Paprašyk jos pagalbos.",
  entities: { item: ITEMS, place: PLACES, color: COLORS, material: MATERIALS, size: SIZES },

  grammar: {
    macros: {
      my_item: "[my | the | our] {item}",
      when_paid: "when i (paid | was paying | bought | was buying | got | paid for) [for] [some | my | a | an | the] [{w:any}]",
      ago: "((an | one) hour | half an hour | a few minutes | a couple of minutes | {number} (minutes | hours | minute | hour) | a little while | an hour or so | a while) ago",
      when_time: "(@ago | this morning | earlier [today] | just now | a minute ago | at {time} | around {time} | about {time} | at about {time} | before lunch | an hour ago)",
      at_place: "(at | in | on | near | by | next to | inside) [the | a | that] {place}",
    },
    slots: {
      seen: { pattern: [
        "[i (had | used | took out | still had) it] @at_place [@when_paid] #h:ls_place",
        "[i (had | used | took out | still had) it] [about | around | maybe] @when_time [(at | in | on) [the] {place}] [@when_paid] #h:ls_time",
        "@when_paid [(at | in) [the] {place}] #h:ls_paid",
        "(i think | maybe | probably | i guess) [i (left | dropped | lost | had) it] [here | somewhere | right here | somewhere here] @at_place",
        "i (left | dropped | put | lost) it [here | somewhere | right here | somewhere here] @at_place [@when_time]",
        "i paid for [my | a | some] {w:any} (at | in) [the] {place}",
        "i bought [some | a | my] {w:any} (at | in | from) [the] {place} [and i [still] had it [then]]",
        "(a | an | some | my) {w:any} (at | from | in) [the] {place}",
        "i (got | had) (a | an | some | my) {w:any} (at | from | in) [the] {place}",
        "i was (at | in) [the] {place} [@when_time]",
        "i (took | got | took out | withdrew) (money | cash | some money | some cash) (from | at) [the] {place} [@when_time]",
        "[about | around] @when_time at home", "at home [@when_time]", "@at_place [@when_time] i (bought | paid for | got | was buying) [some | a | my] {w:any}", "when i was (at | in | on | near) [the] {place}",
        "i was (shopping | walking | sitting | eating | buying something | having coffee | waiting) (at | in | on | near | by) [the] {place} [@when_time]",
      ] },
      dp: { pattern: [
        "[and] [it is | it was | it is a | it was a | a | an | kind of | sort of | really | very | quite | pretty] {color} [color | colored]",
        "[and] [it is | it was | it is a | it was a | a | an | made of] {material}",
        "[and] [it is | it was | it is a | it was a | a | an | quite | pretty | very | really] {size}",
        "[and] (it has | with) (a | my) (zipper | zip | button | logo | strap | name inside | initials on it) #feature",
        "[and] (it has | with) (a | my) (picture | photo) [of my (kids | children | family | wife | husband | son | daughter | dog)] [inside] #feature",
        "[and] [it is | it was | a | an] (old | new | normal | ordinary | simple | cheap | expensive | nice) #feature",
      ] },
    },
  },

  intents: {
    help_req: { patterns: [
      "(can | could) you help me #h:help_me",
      "(can | could) you (please | ) help me [out] [a little]",
      "i need (help | your help | some help)",
      "help me [please]",
      "help",
      "(can | could | may) i ask you something",
      "i have a problem",
      "i think i need help",
      "[no] i am not (okay | fine | all right) [actually]", "[yes] [they are (lovely | beautiful | very nice)] [but] i have a (problem | little problem | big problem | question)",
      "(can | could) i ask you for (help | a favor)",
    ] },
    lost: { patterns: [
      "[i think] i (have | ) lost my {item} #h:lost_item", "[i think] i [have] lost [a | the | my] {item}", "i (can not | can't) find [my | the] {item} [anywhere]",
      "[i think] i (have | ) lost my {item} and my keys #keys",
      "[i think] i (have | ) lost my keys and my {item} #keys",
      "i (can not | can't) find my {item} [anywhere] #h:cant_find",
      "my {item} is (gone | missing) #h:gone",
      "i do not (have | know where) my {item} [is]",
      "where is my {item}",
      "[i think] i dropped my {item} [somewhere]",
      "[i think] (someone | somebody) (took | stole | has taken | has stolen) my {item} #stolen #h:stolen",
      "my {item} (was | has been) stolen #stolen",
      "i (have | ) lost my {item} [i do not know how | i do not know where]",
      "my {item} (disappeared | is lost | is not here | is not in my (bag | pocket | pockets)) [anymore]", "i (do not | don't) have my {item} [anymore | with me]",
      "i am looking for my {item}", "(did | have) you (see | seen | find | found) (a | my) [{color}] [{material}] {item} [here | around here | anywhere]",
      "my {item} i (can not | can't) find it", "it is my {item} [it is (gone | missing | lost)]", "[i think] i (left | forgot) my {item} somewhere",
    ] },
    not_lost: { patterns: [
      "i did not lose (my {item} | anything)",
      "i have not lost (my {item} | anything)",
      "my {item} is not (lost | missing | gone)",
      "i (have | ) found my {item} [again]",
    ] },
    last_seen: { patterns: [
      "{seen}", "i (do not | don't) (remember | know) [exactly] [maybe | i think | probably] {seen}", "i am not sure [maybe] {seen}",
      "[the] last time i (had | saw | used) it was {seen}",
      "i last (had | saw | used) it {seen}",
      "i (still | ) had it {seen}",
    ] },
    place_ctx: { patterns: ["[the] {place}", "(the | a) {place} i think"] },
    describe: { patterns: [
      "[it is | it was | it is a | it was a | a | an | my {item} is] {dp} [{dp}] [{dp}] [{dp}] [{item} | one] [{dp}] #h:describe",
      "(is | is a | was | was a) {dp} [{dp}] [{dp}] [{item} | one]",
      "it is (just | ) (a | an) (normal | ordinary | regular) {item}",
      "[just] [a | an] [normal | ordinary | regular | simple] {dp} [{dp}] [{dp}] [{item} | one]",
    ] },
    police_where: { patterns: [
      "where is the (nearest | closest) police station #h:q_police",
      "where is the police station",
      "is there a police station (near here | nearby | around here | close by)",
      "how do i get to the police station",
      "where (is | can i find) the police",
      "(can | could) you tell me where the police station is",
      "where is it",
      "police station",
      "[no] i am (new here | not from here | a tourist | not from around here)", "(where is | do you know where) the lost and found [office] [is]",
      "[no] i (do not | don't) know (where it is | the way | where the police station is | where)",
    ] },
    police_known: { patterns: ["i know where it is", "yes i know [where it is]", "i know the (way | place)", "[yes | i think so] [i think] it is (near | next to | by | behind | across from) the {place} [right]", "(i think so | yes) (near | next to | by) the {place}"] },
    map: { patterns: [
      "(can | could) you show me [where it is] on (the | a | my) map #h:q_map",
      "(can | could) you show me [on your phone]",
      "(can | could) you (show | mark) it on (the | my) map",
      "do you have a map",
      "(can | could) you (draw | mark | show | put) it on (the | my | a) map", "(can | could) you show me (the way | where it is)",
    ] },
    far: { patterns: ["is it far [from here] #h:q_far", "how far is it", "is it close", "is it near here", "is it a long walk"] },
    how_get: { patterns: ["how do i get there #h:q_get_there", "which way [is it]", "how can i get there", "(can | could) you tell me how to get there", "is it on this (street | road)", "which direction [is it]"] },
    call911: { patterns: [
      "should i call (911 | nine one one | nine eleven | the police) #h:q_911",
      "do i (need | have) to call (911 | nine one one | the police)",
      "(can | should) i call the emergency number",
      "should i call (999 | 112 | nine nine nine | one one two | one hundred and twelve) #tip:us_911",
    ] },
    emergency_number: { patterns: [
      "what is the emergency number [here | in america | in the us] #h:q_number",
      "what number do i call [in an emergency]",
      "is it (112 | one one two | 999 | nine nine nine) here #tip:us_911",
    ] },
    cancel_cards: { patterns: [
      "should i (cancel | block | freeze) my (cards | bank cards | credit cards | card | credit card) #h:q_cards",
      "should i call my bank",
      "what about my (cards | credit cards | bank cards)",
    ] },
    what_do: { patterns: ["what should i do [now]", "what do i do [now]", "what can i do", "what if it is not there", "and if (it is not there | nobody has it | they do not have it)"] },
    will_go_back: { patterns: ["[okay] i will go back [there | to the {place}] [and (ask | check | look)]", "(good | great) idea [thank you | thanks]", "[okay] i will go and (check | ask | look)", "[okay] i will (ask | check) there"] },
    hope_so: { patterns: ["i hope so [too]", "me too"] },
    checked: { patterns: [
      "i (checked | looked) [everywhere | all my pockets | in my bag | my pockets]", "it is not (there | in my pockets | in my bag)", "i already checked",
      "[yes] (twice | two times | many times | three times)", "[yes] [and] in my (bag | backpack | car | jacket | coat) too", "[no] [wait] [no] it is not (here | there | in my pockets | in my bag)",
      "[yes] i looked everywhere",
    ] },
    its_mine: { patterns: [
      "[yes] (that is | it is) mine #h:its_mine",
      "[yes] that is my {item}",
      "[yes] that is it",
      "[oh] thank (god | goodness) [that is mine | that is it]",
      "it is mine",
      "(oh my god | oh my gosh | wow | really) [yes] [it is | that is] mine", "[yes] (it is | that is) (my | really my) {item} [thank you]", "yes [it] is (my {item} | mine)",
    ] },
    not_mine: { patterns: ["[no] (that is | it is) not mine #h:not_mine", "[no] that is not my {item}", "mine is (different | {w:any})", "[no] my {item} is (smaller | bigger | different | older | newer | {color} | {material})", "[no] [it] is not (my | mine) [{item}]"] },
    all_there: { patterns: [
      "[yes] everything is (here | there | still here | still there | inside | in it) #h:all_there",
      "nothing is missing",
      "[yes] it is all (here | there)",
      "[yes] my (cards | money) (is | are) still (here | there)",
      "[yes] my (money | cash | cards | documents | id) [and my (money | cash | cards | documents | id | driver s license)] (is | are) [still] (here | there | inside | in it)",
      "[yes] all my (documents | cards | money | things) (is | are) (here | there | inside | in it)", "[yes] everything is (okay | fine | in it)", "[yes] all is (here | there | inside | okay | fine)",
    ] },
    some_missing: { patterns: [
      "[no] [my cards are here] [but] (my | the) (money | cash | cards | card | id | driver s license) (is | are) (gone | missing | not there)",
      "[no] (some | my) money is (gone | missing)", "[no] (the | my) (money | cash) is not there",
    ] },
    thanks_kind: { patterns: [
      "you are (very | so | really) kind #h:kind",
      "you have been (very | so | really) helpful",
      "thank you (so much | very much) for your help",
      "that is (very | so) kind of you",
      "you (helped | have helped) me (a lot | so much | very much)", "thank you for (everything | helping me | all your help)", "you are (very | so | really) (good | nice | helpful | kind | sweet)", "(thanks | thank you) again",
    ] },
    flowers: { patterns: [
      "(i would like | can i (get | have) | could i (get | have)) (some | these | those | a bunch of | a bouquet of) (flowers | roses | tulips | sunflowers)",
      "how much (are | is) (the | these | those) (flowers | roses | tulips | sunflowers)",
      "(these | the) flowers are (beautiful | lovely)",
    ] },
  },

  lines: {
    greet: [
      t("Good | morning! | Can | I | help | you | with anything?", "Labas | rytas! | Ar galiu | aš | padėti | jums | kuo nors?", "Labas rytas! Ar galiu kuo nors padėti?"),
      t("Hello | there! | Aren't | these | tulips | lovely?", "Sveiki | —! | Ar ne | šios | tulpės | nuostabios?", "Sveiki! Ar ne nuostabios šios tulpės?",
        { flags: { 1: "“there” (hello there): part of the greeting; no separate Lithuanian word." } }),
    ],
    greet_worried: [
      t("Hi! | Are | you | okay? | You | look | worried.", "Sveiki! | Ar | jums | viskas gerai? | Jūs | atrodote | {m:susirūpinęs|f:susirūpinusi}.", "Sveiki! Ar jums viskas gerai? Atrodote {m:susirūpinęs|f:susirūpinusi}.",
        { flags: { 1: "“Are” in a yes/no question = the particle ar; jums … viskas gerai carries “you are okay”." } }),
    ],
    ask_problem: [
      t("What's | wrong, | dear?", "Kas yra | negerai, | {m:mielasis|f:mieloji}?", "Kas nutiko, {m:mielasis|f:mieloji}?"),
      t("What | happened?", "Kas | atsitiko?", "Kas atsitiko?"),
    ],
    help_ok: [
      t("Of course, | dear. | What's | wrong?", "Žinoma, | {m:mielasis|f:mieloji}. | Kas yra | negerai?", "Žinoma, {m:mielasis|f:mieloji}. Kas nutiko?"),
      t("Sure! | What | happened?", "Žinoma! | Kas | atsitiko?", "Žinoma! Kas atsitiko?"),
    ],
    lost_react: [
      t("Oh | no! | Okay, | stay | calm.", "O | ne! | Gerai, | išlikite | {m:ramus|f:rami}.", "O ne! Gerai, nusiraminkite."),
      t("Oh, dear! | Don't panic.", "Oi, vargeli! | Nepanikuokite.", "Oi, vargeli! Tik nepanikuokite."),
      t("Oh | no! | Don't worry, | we'll figure | it | out.", "O | ne! | Nesijaudinkite, | išsiaiškinsime | tai | —.", "O ne! Nesijaudinkite, ką nors sugalvosime.",
        { flags: { 5: "“out” (figure … out): the prefix iš- of išsiaiškinsime carries it (linked to “we'll figure”)." } }),
    ],
    stolen_react: [
      t("Oh | no! | Are | you | sure? | Maybe | you | just | dropped | it.", "O | ne! | Ar | jūs | {m:tikras|f:tikra}? | Galbūt | jūs | tiesiog | pametėte | {jis@X:acc}.", "O ne! Ar tikrai? Galbūt tiesiog {jis@X:acc} pametėte.",
        { flags: { 3: "“Are” in a yes/no question = the particle ar; the adjective carries the rest." } }),
    ],
    keys_too: [
      t("Your | keys | too?", "Ir | raktus | taip pat?", "Ir raktus?"),
    ],
    ask_pockets: [
      t("Did | you | check | all | your | pockets?", "Ar | jūs | patikrinote | visas | savo | kišenes?", "Ar patikrinote visas kišenes?",
        { flags: { 0: "Past “Did” in a yes/no question = the particle ar; the past tense sits on patikrinote." } }),
    ],
    check_again: [
      t("Take | a | quick | look, | just in case.", "Pažiūrėkite | — | greitai | —, | dėl viso pikto.", "Greitai pažiūrėkite, dėl viso pikto.",
        { flags: { 3: "“look” (take a look): the verb pažiūrėkite under “Take” carries it." } }),
    ],
    ask_last: [
      t("When | did | you | last | have | it?", "Kada | — | jūs | paskutinį kartą | turėjote | {jis@X:acc}?", "Kada paskutinį kartą {jis@X:acc} turėjote?", { flags: { 1: F_DID } }),
      t("Where | did | you | last | have | it?", "Kur | — | jūs | paskutinį kartą | turėjote | {jis@X:acc}?", "Kur paskutinį kartą {jis@X:acc} turėjote?", { flags: { 1: F_DID } }),
      t("Okay, | let's think. | When | did | you | last | see | it?", "Gerai, | pagalvokime. | Kada | — | jūs | paskutinį kartą | matėte | {jis@X:acc}?", "Gerai, pagalvokime. Kada paskutinį kartą {jis@X:acc} matėte?", { flags: { 3: F_DID } }),
    ],
    where_was_that: [
      t("Oh? | Where | was | that?", "O? | Kur | tai | buvo?", "O? Kur tai buvo?"),
    ],
    ask_where_then: [
      t("And | where | were | you | then?", "O | kur | buvote | jūs | tada?", "O kur tada buvote?"),
    ],
    think_help: [
      t("Think | for | a | moment. | Did | you | buy | anything | this | morning?", "Pagalvokite | — | — | akimirką. | Ar | jūs | pirkote | ką nors | šį | rytą?", "Pagalvokite akimirką. Ar šį rytą ką nors pirkote?",
        { flags: { 1: "“for”: the accusative of time akimirką carries it.", 4: "Past “Did” in a yes/no question = the particle ar." } }),
    ],
    go_back_i: [
      t("Then | go | back | to | {X.the} | and | ask.", "Tada | eikite | atgal | į | {X.the:acc} | ir | paklauskite.", "Tada grįžkite į {X.the:acc} ir paklauskite."),
    ],
    go_back_prie: [
      t("Then | go | back | to | {X.the} | and | look.", "Tada | eikite | atgal | prie | {X.the:gen} | ir | pažiūrėkite.", "Tada grįžkite prie {X.the:gen} ir pažiūrėkite."),
    ],
    go_back_look_i: [
      t("Then | go | back | to | {X.the} | and | look | around.", "Tada | eikite | atgal | į | {X.the:acc} | ir | pažiūrėkite | aplink.", "Tada grįžkite į {X.the:acc} ir apsidairykite."),
    ],
    maybe_found: [
      t("Maybe | someone | found | it.", "Galbūt | kas nors | rado | {jis@X:acc}.", "Galbūt kas nors {jis@X:acc} rado."),
      t("Maybe | it's | still | there.", "Galbūt | {jis@X:nom} yra | vis dar | ten.", "Galbūt {jis@X:nom} vis dar ten."),
    ],
    call_bus: [
      t("Then | call | the | bus | company. | They | have | a | lost and found.", "Tada | paskambinkite | — | autobusų | bendrovei. | Jie | turi | — | radinių skyrių.", "Tada paskambinkite autobusų bendrovei. Jie turi radinių skyrių."),
    ],
    call_taxi: [
      t("Then | call | the | taxi | company. | Drivers | often | find | things.", "Tada | paskambinkite | — | taksi | bendrovei. | Vairuotojai | dažnai | randa | daiktų.", "Tada paskambinkite taksi bendrovei. Vairuotojai dažnai randa pamestų daiktų."),
    ],
    ask_describe: [
      t("What | does | it | look | like? | I'll keep an eye out.", "Kaip | — | {jis@X:nom} | atrodo | —? | Pasidairysiu.", "Kaip {jis@X:nom} atrodo? Aš pasidairysiu.",
        { flags: { 1: "Question “does”: no Lithuanian word; the tense sits on atrodo.", 4: "“like” (look like): kaip … atrodo already says it." } }),
      t("What | does | it | look | like, | in case | someone | brings | it | here?", "Kaip | — | {jis@X:nom} | atrodo | —, | jeigu | kas nors | atneštų | {jis@X:acc} | čia?", "Kaip {jis@X:nom} atrodo – jeigu kas nors atneštų čia?",
        { flags: { 1: "Question “does”: no Lithuanian word; the tense sits on atrodo.", 4: "“like” (look like): kaip … atrodo already says it." } }),
    ],
    describe_echo: [
      t("Okay, | {X.np}. | Got it.", "Gerai, | {X.np:nom}. | Supratau.", "Gerai, {X.np:nom}. Supratau."),
      t("Okay, | {X.np}. | I'll remember | that.", "Gerai, | {X.np:nom}. | Įsiminsiu | tai.", "Gerai, {X.np:nom}. Įsiminsiu."),
    ],
    found_reask: [
      t("So, | is | it | yours?", "Tai | ar | {jis@X:nom} | jūsų?", "Tai ar {jis@X:nom} jūsų?", { flags: { 1: F_IS_Q } }),
    ],
    police_suggest: [
      t("And | if | it's | not | there, | go | to | the | police | station.", "O | jei | {jis@X:gen} | nėra | ten, | eikite | į | — | policijos | nuovadą.", "O jei {jis@X:gen} ten nėra, eikite į policijos nuovadą.",
        { flags: { 2: "“'s” (is) takes the negation in Lithuanian (nėra), and the subject goes into the genitive." } }),
    ],
    ask_know_police: [
      t("Do | you | know | where | it | is?", "Ar | jūs | žinote, | kur | ji | yra?", "Ar žinote, kur ji?", { flags: { 0: "Question “Do” = the particle ar." } }),
    ],
    directions: [
      t("It's | just | around the corner.", "Ji yra | visai | už kampo.", "Ji visai netoli, už kampo."),
    ],
    directions2: [
      t("Go | down | this | street, | and | it's | on the left.", "Eikite | — | šia | gatve, | ir | ji yra | kairėje.", "Eikite šia gatve – nuovada bus kairėje.",
        { flags: { 1: "“down”: the instrumental šia gatve carries the direction." } }),
      t("Go | straight | down | this | street. | It's | on the left.", "Eikite | tiesiai | — | šia | gatve. | Ji yra | kairėje.", "Eikite tiesiai šia gatve. Ji bus kairėje.",
        { flags: { 2: "“down”: the instrumental šia gatve carries the direction." } }),
    ],
    map_show: [
      t("Sure, | look. | Here | it | is, | on | my | phone.", "Žinoma, | žiūrėkite. | Štai | ji | —, | — | mano | telefone.", "Žinoma, žiūrėkite. Štai ji, mano telefone.",
        { flags: { 4: "“is”: štai ji needs no copula.", 5: "“on”: the locative telefone carries it; the possessive mano stands between." } }),
    ],
    map_mark: [
      t("Here, | I'll mark | it | on | your | map.", "Štai, | pažymėsiu | ją | — | jūsų | žemėlapyje.", "Štai, pažymėsiu ją jūsų žemėlapyje.",
        { flags: { 3: "“on”: the locative žemėlapyje carries it; the possessive jūsų stands between." } }),
    ],
    far: [
      t("No, | it's | very | close. | Just | two | minutes | on foot.", "Ne, | tai yra | labai | arti. | Tik | dvi | minutės | pėsčiomis.", "Ne, labai arti. Tik dvi minutės pėsčiomis."),
    ],
    police_known_ok: [
      t("Good.", "Puiku.", "Puiku."),
    ],
    no911: [
      t("No, | 911 | is | only | for emergencies.", "Ne, | 911 | yra | tik | nelaimės atvejams.", "Ne, 911 – tik nelaimės atvejams.", { say: "No, nine-one-one is only for emergencies." }),
    ],
    no911b: [
      t("Like | a | fire | or | a | car | accident.", "Kaip | — | gaisras | ar | — | automobilio | avarija.", "Pavyzdžiui, gaisras ar autoavarija."),
    ],
    no911c: [
      t("For | a | lost | {X}, | just | go | to | the | police | station.", "Dėl | — | {pamestas@X:gen} | {X:gen} | tiesiog | eikite | į | — | policijos | nuovadą.", "Dėl {pamestas@X:gen} {X:gen} tiesiog eikite į policijos nuovadą."),
    ],
    number911: [
      t("It's | 911. | But | only | for | real | emergencies.", "Tai yra | 911. | Bet | tik | — | tikroms | nelaimėms.", "911. Bet tik tikroms nelaimėms.",
        { say: "It's nine-one-one. But only for real emergencies.", flags: { 4: "“for”: the dative tikroms nelaimėms carries it; the adjective stands between." } }),
    ],
    cards: [
      t("Yes, | I'd | call | your | bank | right away, | just in case.", "Taip, | aš | paskambinčiau į | jūsų | banką | iš karto, | dėl viso pikto.", "Taip, aš iš karto paskambinčiau į banką, dėl viso pikto.",
        { flags: { 1: "“'d” (would): the conditional ending of paskambinčiau carries it; skambinti į banką needs į, which belongs to “call”." } }),
    ],
    what_do: [
      t("First, | go | back | and | ask. | Then | go | to | the | police.", "Pirmiausia | eikite | atgal | ir | paklauskite. | Tada | eikite | į | — | policiją.", "Pirmiausia grįžkite ir paklauskite. Paskui eikite į policiją."),
    ],
    ok: [
      t("Okay.", "Gerai.", "Gerai."),
      t("All right.", "Gerai.", "Gerai."),
    ],
    found: [
      t("Oh, | wait! | This | little | boy | found | {X.np} | by | the | fountain!", "O, | palaukite! | Šis | mažas | berniukas | rado | {X.np:acc} | prie | — | fontano!", "O, palaukite! Šis berniukas rado {X.np:acc} prie fontano!"),
    ],
    found_ask: [
      t("Is | it | yours?", "Ar | {jis@X:nom} | jūsų?", "Ar {jis@X:nom} jūsų?", { flags: { 0: F_IS_Q } }),
    ],
    found_yes: [
      t("Oh, | wonderful! | Is | everything | still | there?", "O, | nuostabu! | Ar | viskas | vis dar | vietoje?", "O, nuostabu! Ar viskas vietoje?", { flags: { 2: F_IS_Q } }),
    ],
    found_yes_phone: [
      t("Oh, | wonderful! | Is | it | okay?", "O, | nuostabu! | Ar | jis | sveikas?", "O, nuostabu! Ar jis sveikas?", { flags: { 2: F_IS_Q } }),
    ],
    glad: [
      t("Oh, | I'm | so | glad!", "O, | man | taip | smagu!", "O, kaip smagu!"),
    ],
    boy_thanks: [
      t("Thank | him, | not | me!", "Padėkokite | jam, | ne | man!", "Padėkokite jam, ne man!"),
    ],
    not_yours: [
      t("Oh, | too bad.", "O, | kaip gaila.", "O, kaip gaila."),
    ],
    missing_some: [
      t("Oh | no. | Then | you | should | still | go | to | the | police.", "O | ne. | Tada | jums | vertėtų | vis tiek | eiti | į | — | policiją.", "O ne. Tada vis tiek verta nueiti į policiją.",
        { flags: { 3: "“you should”: the dative jums with vertėtų (it would be worth) carries “should”." } }),
    ],
    not_lost_resp: [
      t("Oh, | good! | How | can | I | help | you, | then?", "O, | puiku! | Kaip | galiu | aš | padėti | jums, | tada?", "O, puiku! Tai kuo galiu padėti?"),
    ],
    flowers_first: [
      t("Of course! | But | you | look | worried, | dear. | Is | everything | all right?", "Žinoma! | Bet | jūs | atrodote | {m:susirūpinęs|f:susirūpinusi}, | {m:mielasis|f:mieloji}. | Ar | viskas | gerai?", "Žinoma! Bet atrodote {m:susirūpinęs|f:susirūpinusi}, {m:mielasis|f:mieloji}. Ar viskas gerai?",
        { flags: { 6: F_IS_Q } }),
    ],
    good_luck: [
      t("Good luck! | I | hope | you | find | it.", "Sėkmės! | Aš | tikiuosi, kad | jūs | rasite | {jis@X:acc}.", "Sėkmės! Tikiuosi, kad {jis@X:acc} rasite."),
      t("Good luck, | dear!", "Sėkmės, | {m:mielasis|f:mieloji}!", "Sėkmės, {m:mielasis|f:mieloji}!"),
    ],
    kind_resp: [
      t("Oh, | it's | nothing.", "O, | tai | nieko.", "O, nėra už ką."),
      t("You're welcome, | dear.", "Prašom, | {m:mielasis|f:mieloji}.", "Prašom, {m:mielasis|f:mieloji}."),
    ],
    closing_welcome: [
      t("You're welcome, | dear.", "Prašom, | {m:mielasis|f:mieloji}.", "Prašom, {m:mielasis|f:mieloji}."),
    ],
    closing_bye: [
      t("Bye, | dear!", "Viso gero, | {m:mielasis|f:mieloji}!", "Viso gero, {m:mielasis|f:mieloji}!"),
    ],
    enjoy_day: [
      t("Take care, | dear! | Enjoy | the | rest | of | your | day.", "Laikykitės, | {m:mielasis|f:mieloji}! | Mėgaukitės | — | likusia | — | savo | diena.", "Laikykitės, {m:mielasis|f:mieloji}! Gražios likusios dienos.",
        { flags: { 5: "“of”: the instrumental savo diena carries it; the possessive stands between." } }),
    ],
  },

  hints: {
    problem: {
      lt: "Paprašyti pagalbos ir pasakyti, kas nutiko", slot: "item", examples: ["wallet"],
      items: [H_HELP, H_LOST, H_CANT_FIND, H_GONE,
        { id: "stolen", s: t("I | think | someone | took | my | {X}.", "Aš | manau, | kas nors | paėmė | mano | {X:acc}.", "Manau, kažkas paėmė mano {X:acc}.") },
      ],
    },
    lost: {
      lt: "Pasakyti, ką pametei", slot: "item", examples: ["wallet"],
      items: [H_LOST, H_CANT_FIND, H_GONE],
    },
    pockets: {
      lt: "Atsakyti, ar patikrinai kišenes",
      items: [
        { id: "checked", s: t("Yes, | I | checked.", "Taip, | aš | patikrinau.", "Taip, patikrinau.") },
        { id: "checked", s: t("Yes, | I | looked | everywhere.", "Taip, | aš | ieškojau | visur.", "Taip, ieškojau visur.") },
      ],
    },
    last_seen: {
      lt: "Pasakyti, kur ir kada ją paskutinį kartą turėjai", slot: "place", examples: ["cafe", "bakery", "fruit_stand"],
      items: [
        H_AT_PLACE,
        { id: "ls_paid", s: t("When | I | paid | for | my | coffee.", "Kai | aš | mokėjau | už | savo | kavą.", "Kai mokėjau už kavą.") },
        { id: "ls_time", s: t("About | an | hour | ago.", "Maždaug | — | valandą | prieš.", "Maždaug prieš valandą.", { flags: { 3: "“ago” = prieš; Lithuanian puts it before the noun (prieš valandą)." } }) },
        { id: "ls_time", s: t("This | morning, | at | {X.the}.", "Šį | rytą, | — | {X.the:loc}.", "Šį rytą, {X:loc}.", { flags: { 2: "“at”: the locative ending of the noun carries it." } }),
          only: IN_PLACE },
        H_WAS_AT, H_NEAR, H_ON_BUS, H_IN_TAXI,
      ],
    },
    where_then: {
      lt: "Pasakyti, kur buvai", slot: "place", examples: ["cafe", "bakery", "fruit_stand"],
      items: [H_AT_PLACE, H_WAS_AT, H_NEAR, H_ON_BUS, H_IN_TAXI],
    },
    describe: {
      lt: "Apibūdinti piniginę",
      items: [
        { id: "describe", s: t("It's | small | and | brown.", "Ji yra | maža | ir | ruda.", "Ji maža ir ruda.") },
        { id: "describe", s: t("It's | a | black | leather | wallet.", "Tai yra | — | juoda | odinė | piniginė.", "Tai juoda odinė piniginė.") },
        { id: "describe", s: t("It's | brown, | leather, | and | small.", "Ji yra | ruda, | odinė | ir | maža.", "Ji ruda, odinė ir maža.") },
        { id: "describe", s: t("It's | a | small | black | wallet.", "Tai yra | — | maža | juoda | piniginė.", "Tai maža juoda piniginė.") },
      ],
    },
    police_know: {
      lt: "Atsakyti, ar žinai, kur policija",
      items: [
        { id: "no_where", s: t("No, | where | is | it?", "Ne, | kur | yra | ji?", "Ne, o kur ji?") },
        { id: "q_map", s: t("No. | Could | you | show | me | on the map?", "Ne. | Ar galėtumėte | jūs | parodyti | man | žemėlapyje?", "Ne. Ar galėtumėte parodyti žemėlapyje?") },
        { id: "i_know", s: t("Yes, | I | know | where | it | is.", "Taip, | aš | žinau, | kur | ji | yra.", "Taip, žinau, kur ji.") },
      ],
    },
    police: {
      lt: "Paklausti, kur policija ir kaip ten nueiti",
      items: [
        { id: "q_police", s: t("Where's | the | nearest | police | station?", "Kur yra | — | artimiausia | policijos | nuovada?", "Kur artimiausia policijos nuovada?") },
        { id: "q_map", s: t("Could | you | show | me | on the map?", "Ar galėtumėte | jūs | parodyti | man | žemėlapyje?", "Ar galėtumėte parodyti žemėlapyje?") },
        { id: "q_get_there", s: t("How | do | I | get | there?", "Kaip | — | man | nueiti | ten?", "Kaip ten nueiti?", { flags: { 1: "Question “do”: no Lithuanian word; the dative man + infinitive carries it." } }) },
        { id: "q_far", s: t("Is | it | far?", "Ar | tai | toli?", "Ar toli?", { flags: { 0: F_IS_Q } }) },
      ],
    },
    emergency: {
      lt: "Paklausti apie skubios pagalbos numerį ir korteles",
      items: [
        { id: "q_911", s: t("Should | I | call | 911?", "Ar | man | skambinti | 911?", "Ar man skambinti 911?", { say: "Should I call nine-one-one?", flags: { 0: "“Should” in a yes/no question = the particle ar; the dative man with the infinitive carries “should I”." } }) },
        { id: "q_number", s: t("What's | the | emergency | number | here?", "Koks yra | — | pagalbos | numeris | čia?", "Koks čia pagalbos numeris?") },
        { id: "q_cards", s: t("Should | I | cancel | my | cards?", "Ar | man | blokuoti | savo | korteles?", "Ar man užblokuoti korteles?", { flags: { 0: "“Should” in a yes/no question = the particle ar; the dative man with the infinitive carries “should I”." } }) },
      ],
    },
    thanks: {
      lt: "Padėkoti ir atsisveikinti",
      items: [
        { id: "thanks_help", s: t("Thanks | for | your | help!", "Ačiū | už | jūsų | pagalbą!", "Ačiū už pagalbą!") },
        { id: "kind", s: t("Thank | you | so much! | You're | very | kind.", "Dėkoju | jums | labai! | Jūs esate | labai | maloni.", "Labai ačiū! Jūs labai maloni.") },
        { id: "thanks_bye", s: t("Thank | you! | Goodbye!", "Dėkoju | jums! | Viso gero!", "Ačiū! Viso gero!") },
      ],
    },
    found: {
      lt: "Atsakyti, ar tai tavo daiktas",
      items: [
        { id: "its_mine", s: t("Yes, | that's | mine!", "Taip, | tai yra | mano!", "Taip, tai mano!") },
        { id: "not_mine", s: t("No, | that's | not | mine.", "Ne, | tai | nėra | mano.", "Ne, tai ne mano.", { flags: { 1: "“'s” (is) takes the negation in Lithuanian: nėra stands under “not”." } }) },
      ],
    },
    all_there: {
      lt: "Pasakyti, ar viskas vietoje",
      items: [
        { id: "all_there", s: t("Yes, | everything's | here.", "Taip, | viskas yra | čia.", "Taip, viskas vietoje.") },
        { id: "all_there", s: t("Yes, | my | cards | are | still | here.", "Taip, | mano | kortelės | yra | vis dar | čia.", "Taip, kortelės vis dar čia.") },
      ],
    },
  },

  tips: {
    us_911: { key: "us_911", lt: "Suprasta! JAV skubios pagalbos numeris – 911 (ne 112 ar 999).", better: "Should I call 911?" },
    us_wallet: { key: "us_wallet", lt: "Suprasta! Amerikoje „purse“ – tai rankinė. Piniginė – „wallet“.", better: "I've lost my wallet." },
  },

  merges: {
    "excuse me": { reason: "lexical_expression", split: "excuse → atleiskite + me → mane is a calque; getting someone's attention = atsiprašau.", minimal: "Two words." },
    "all right": { reason: "lexical_expression", split: "all → visi + right → teisingai is false; = gerai.", minimal: "Two words." },
    "i've lost": { reason: "grammatical_fusion", split: "I've → aš turiu + lost → pamestas is false; the perfect auxiliary has no Lithuanian word: pamečiau.", minimal: "Object stays outside." },
    "is gone": { reason: "lexical_expression", split: "is → yra + gone → nuėjęs is false; something “is gone” = dingo.", minimal: "Two words." },
    "oh, dear": { reason: "lexical_expression", split: "dear → brangusis is false; the interjection “oh dear” = oi, vargeli.", minimal: "Two words." },
    "oh dear": { reason: "lexical_expression", split: "dear → brangusis is false; the interjection “oh dear” = oi, vargeli.", minimal: "Two words." },
    "we'll figure": { reason: "grammatical_fusion", split: "“'ll” (will): the future ending of išsiaiškinsime carries it (C-FUT).", minimal: "Object and particle stay outside." },
    "let's think": { reason: "grammatical_fusion", split: "Let's → leiskime + think → galvoti is a calque; the first person plural imperative pagalvokime carries “let's”.", minimal: "Two words." },
    "just in case": { reason: "lexical_expression", split: "just → tik, in → į, case → atvejis is false; = dėl viso pikto.", minimal: "All three words form the expression." },
    "i'll keep an eye out": { reason: "lexical_expression", split: "keep → laikysiu, an → —, eye → akį, out → lauke is false; the idiom = pasidairysiu (future ending carries “'ll”).", minimal: "The whole idiom; no part is independently glossable." },
    "in case": { reason: "lexical_expression", split: "in → į + case → atvejis is false; the conjunction “in case” = jeigu (netyčia).", minimal: "Two words." },
    "too bad": { reason: "lexical_expression", split: "too → per + bad → blogai gives “too badly”; the reaction “too bad” = kaip gaila.", minimal: "Two words." },
    "lost and found": { reason: "lexical_expression", split: "lost → pamestas, and → ir, found → rastas names no office; = radinių skyrius.", minimal: "All three words name the office." },
    "around the corner": { reason: "lexical_expression", split: "around → aplink, the → —, corner → kampas gives a false “around a corner”; = už kampo (very near).", minimal: "All three words form the expression." },
    "on the left": { reason: "grammatical_fusion", split: "The locative kairėje carries “on the” (C-CASE).", minimal: "No adjective inside." },
    "right away": { reason: "lexical_expression", split: "right → dešinė + away → toli is false; = iš karto.", minimal: "Two words." },
    "good luck": { reason: "lexical_expression", split: "good → geras + luck → sėkmė as a noun phrase is not the wish; = sėkmės!", minimal: "Two words." },
    "aren't": { reason: "grammatical_fusion", split: "One English word: are + n't → ar ne (question particle + negation).", minimal: "One word." },
    "with anything": { reason: "grammatical_fusion", split: "with → su + anything → kas nors: the instrumental kuo nors carries “with” (C-CASE).", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Pasakyk, kad pametei piniginę", step: "problem" },
    { lt: "Pasakyk, kur ją turėjai", done: (c) => !!(c.s.place || c.s.placeSkipped) },
    { lt: "Apibūdink piniginę", optional: true,
      when: (c) => !!c.s.askDescribe && !c.s.found && !c.s.policeInfo,
      done: (c) => !!(c.s.color || c.s.material || c.s.size || c.s.describeSkipped) },
    { lt: "Pasakyk, ar tai tavo", optional: true, when: (c) => !!c.s.foundAsked, done: (c) => !!c.s.foundAsked && !!c.s.found },
    { lt: "Patikrink, ar viskas vietoje", optional: true, when: (c) => c.s.found === "mine", done: (c) => !!c.s.checkedInside },
    { lt: "Paklausk, kur policija", optional: true, when: (c) => !gotBack(c), done: (c) => !!(c.s.policeInfo || c.s.policeKnown) },
  ],

  steps: [
    { id: "problem", done: (c) => !!c.s.lost,
      ask: (c) => c.say("ask_problem"),
      expects: ["help_req", "lost", "not_lost"],
      suggest: [{ lt: "Paprašyti pagalbos ir pasakyti, ką pametei", hint: "problem", options: "item" }] },
    { id: "last_seen", when: (c) => !!c.s.lost && !c.s.found, done: (c) => !!c.s.lastSeen,
      ask: (c) => c.say("ask_last", { X: item(c) }),
      expects: ["last_seen", "place_ctx"],
      suggest: [{ lt: "Pasakyti, kur ir kada paskutinį kartą ją turėjai", hint: "last_seen", options: "place" }],
      yes: (c) => { c.say("where_was_that"); c.hold(); },
      no: (c) => { c.say("ask_last", { X: item(c) }); c.hold(); },
      help: (c) => { c.say("think_help"); } },
    { id: "where_then", when: (c) => !!c.s.lastSeen && !c.s.place && !c.s.found, done: (c) => !!c.s.place || !!c.s.placeSkipped,
      ask: (c) => c.say("ask_where_then"),
      expects: ["last_seen", "place_ctx"],
      suggest: [{ lt: "Pasakyti, kur buvai", hint: "where_then", options: "place" }],
      help: (c) => { c.s.placeSkipped = true; c.say("ok"); } },
    { id: "advice", when: (c) => !!c.s.lastSeen && !c.s.found, done: (c) => !!c.s.advised,
      ask: (c) => {
        c.s.advised = true;
        const p = c.s.place ? byId(c.s.place) : null;
        if (!p) { c.say("what_do"); return; }
        const kind = p.attrs?.kind;
        if (kind === "bus") c.say("call_bus");
        else if (kind === "taxi") c.say("call_taxi");
        else if (p.attrs?.prep === "prie") { c.say("go_back_prie", { X: p.id }); c.say("maybe_found", { X: item(c) }); }
        else if (kind === "outdoor") { c.say("go_back_look_i", { X: p.id }); c.say("maybe_found", { X: item(c) }); }
        else { c.say("go_back_i", { X: p.id }); c.say("maybe_found", { X: item(c) }); }
        // (on a found-it visit the boy turns up right after the description)
        if (c.s.askDescribe && !c.s.color && !c.s.material) { c.ask("describe"); return; }
      },
      suggest: [{ lt: "Paklausti, kur policija", hint: "police" }, { lt: "Paklausti apie 911 ar korteles", hint: "emergency" }] },
    { id: "found", when: (c) => !!c.s.foundTwist && !!c.s.advised, done: (c) => !!c.s.found,
      ask: (c) => {
        if (c.s.foundAsked) { c.say("found_reask", { X: item(c) }); return; }
        c.s.foundAsked = true;
        c.twist("found_it");
        c.say("found", { X: itemNp(c) }); c.say("found_ask", { X: item(c) });
      },
      expects: ["its_mine", "not_mine"],
      suggest: [{ lt: "Atsakyti, ar tai tavo", hint: "found" }],
      yes: (c) => { lostWallet.handlers.its_mine(c, {}, { intent: "its_mine", slots: {}, tags: [] }); },
      no: (c) => { lostWallet.handlers.not_mine(c, {}, { intent: "not_mine", slots: {}, tags: [] }); } },
    { id: "all_there", when: (c) => c.s.found === "mine", done: (c) => !!c.s.checkedInside,
      ask: (c) => c.say(item(c) === "phone" ? "found_yes_phone" : "found_yes"),
      expects: ["all_there", "some_missing"],
      suggest: [{ lt: "Pasakyti, ar viskas vietoje", hint: "all_there" }],
      yes: (c) => { c.s.checkedInside = true; c.say("glad"); c.complete(); },
      no: (c) => { c.s.checkedInside = true; c.s.found = "partial"; c.say("missing_some"); } },
    { id: "describe", when: (c) => !!c.s.askDescribe && !!c.s.lost && !c.s.found && !c.s.policeInfo, done: (c) => !!(c.s.color || c.s.material || c.s.size || c.s.describeSkipped),
      ask: (c) => c.say("ask_describe", { X: item(c) }),
      // no "expects": the ranking bonus is per segment and would split one description into several
      suggest: [{ lt: "Apibūdinti, kaip ji atrodo", hint: "describe" }],
      help: (c) => { c.s.describeSkipped = true; c.say("ok"); } },
    { id: "police", when: (c) => !!c.s.lost && !!c.s.advised && !gotBack(c), done: (c) => !!(c.s.policeInfo || c.s.policeKnown),
      ask: (c) => {
        if (!c.s.policeSuggested) { c.s.policeSuggested = true; c.say("police_suggest", { X: item(c) }); }
        c.say("ask_know_police");
      },
      expects: ["police_where", "police_known", "map"],
      suggest: [{ lt: "Atsakyti, ar žinai, kur policija", hint: "police_know" }, { lt: "Paklausti kelio", hint: "police" }],
      yes: (c) => { c.s.policeKnown = true; c.say("police_known_ok"); },
      no: (c) => { lostWallet.handlers.police_where(c, {}, { intent: "police_where", slots: {}, tags: [] }); },
      // "I don't know" / "No idea" = no, tell me the way
      help: (c) => { lostWallet.handlers.police_where(c, {}, { intent: "police_where", slots: {}, tags: [] }); } },
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
  },

  handlers: {
    help_req(c) {
      if (!mark(c)) return;
      if (c.s.lost) { c.say("ok"); return; }
      c.say("help_ok");
      c.expect({
        // optional: "I had it at the fruit stand…" (last seen) also tells the problem; the step takes over
        id: "what_happened", optional: true, expects: ["lost", "not_lost"], hints: ["problem"],
        suggest: [{ lt: "Pasakyti, ką pametei", hint: "lost", options: "item" }],
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
      if (/\bpurse\b/i.test(c.heard)) c.tip(lostWallet.tips!.us_wallet);
      if (!first) return;
      if (seg.tags.includes("stolen")) { c.s.stolen = true; c.say("stolen_react", { X: item(c) }); }
      else c.say("lost_react");
      if (seg.tags.includes("keys")) { c.s.keys = true; c.say("keys_too"); }
      if (c.s.askPockets) {
        c.say("ask_pockets");
        c.expect({
          id: "pockets", optional: true, expects: ["checked"], hints: ["pockets"],
          suggest: [{ lt: "Atsakyti, ar patikrinai kišenes", hint: "pockets" }],
          yes: (cc) => { cc.say("ok"); },
          no: (cc) => { cc.say("check_again"); cc.hold(); },
          on: { checked: (cc) => { cc.say("ok"); } },
        });
      }
    },
    not_lost(c) {
      if (!mark(c)) return;
      if (c.s.lost) { c.say("glad"); if (!c.s.found) c.s.found = "self"; return; }
      c.say("not_lost_resp"); c.hold();
    },
    last_seen(c, slots) {
      if (!mark(c)) return;
      const seen = slots.seen || {};
      c.s.lastSeen = true;
      if (seen.place) c.s.place = seen.place;
      if (!c.s.lost) c.s.lost = true;
      if (!seen.place && c.s.lastSeenOnce) c.s.placeSkipped = true;
      c.s.lastSeenOnce = true;
    },
    place_ctx(c, slots) {
      if (!mark(c)) return;
      c.s.lastSeen = true;
      if (slots.place) c.s.place = slots.place;
    },
    describe(c, slots) {
      if (!mark(c)) return;
      describeFrom(c, slots);
      if (c.s.__echoed === turn(c)) return; // one echo per utterance
      c.s.__echoed = turn(c);
      if (!c.s.color && !c.s.material && !c.s.size) { c.s.describeSkipped = true; c.say("ok"); return; }
      c.say("describe_echo", { X: itemNp(c) });
    },
    police_where(c) {
      if (!mark(c)) return;
      c.s.policeInfo = true; c.s.policeSuggested = true;
      c.say("directions"); c.say("directions2");
    },
    police_known(c) { if (!mark(c)) return; c.s.policeKnown = true; c.say("police_known_ok"); },
    map(c) {
      if (!mark(c)) return;
      c.s.policeInfo = true; c.s.policeSuggested = true;
      c.say("map_show"); c.say("map_mark");
      c.event("mark-location", { to: "police" });
    },
    far(c) { if (!mark(c)) return; c.s.policeInfo = true; c.say("far"); },
    how_get(c) { if (!mark(c)) return; c.s.policeInfo = true; c.say("directions2"); },
    call911(c) {
      if (!mark(c)) return;
      c.say("no911"); c.say("no911b"); c.say("no911c", { X: item(c) });
    },
    emergency_number(c) { if (!mark(c)) return; c.say("number911"); },
    cancel_cards(c) { if (!mark(c)) return; c.say("cards"); },
    what_do(c) { if (!mark(c)) return; c.say("what_do"); c.s.policeSuggested = true; },
    checked(c) { if (!mark(c)) return; c.s.pocketsDone = true; c.say("ok"); },
    will_go_back(c) { if (!mark(c)) return; c.say("ok"); },
    hope_so(c) { if (!mark(c)) return; c.say("ok"); },
    some_missing(c) {
      if (!mark(c)) return;
      if (c.s.found !== "mine") { c.say("ok"); return; }
      c.s.checkedInside = true; c.s.found = "partial"; c.say("missing_some");
    },
    its_mine(c) {
      if (!mark(c)) return;
      if (!c.s.foundTwist || !c.s.advised) { c.say("ok"); return; }
      c.s.found = "mine";
    },
    not_mine(c) {
      if (!mark(c)) return;
      if (!c.s.foundTwist) { c.say("ok"); return; }
      c.s.found = "no"; c.s.foundTwist = false;
      c.say("not_yours");
    },
    all_there(c) {
      if (!mark(c)) return;
      if (c.s.found !== "mine") { c.say("ok"); return; }
      c.s.checkedInside = true; c.say("glad"); c.complete();
    },
    thanks_kind(c) {
      if (!mark(c)) return;
      if (c.s.found === "mine" && !c.s.boyThanked) { c.s.boyThanked = true; c.say("boy_thanks"); return; }
      c.say("kind_resp");
    },
    flowers(c) {
      if (!mark(c)) return;
      if (c.s.lost) { c.say("ok"); return; }
      c.say("flowers_first");
      c.expect({
        id: "flowers_q", expects: ["lost", "help_req"], hints: ["problem"],
        suggest: [{ lt: "Pasakyti, kas nutiko", hint: "lost", options: "item" }],
        yes: (cc) => { cc.say("ask_problem"); cc.hold(); },
        no: (cc) => { cc.say("ask_problem"); cc.hold(); },
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
    else { if (c.s.lost) c.complete(); c.say("good_luck", { X: item(c) }); }
    const closing: Pending = {
      id: "closing", hints: ["thanks"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "thanks" }],
      on: {
        g_thanks: (cc) => bye(cc, true),
        thanks_kind: (cc) => bye(cc, true),
        hope_so: (cc) => bye(cc, true),
        g_bye: (cc) => bye(cc),
        g_ok: (cc) => bye(cc),
        // "How are you?" at the very end: answer it, then back to the goodbye
        g_howareyou: (cc) => { cc.say("g_howareyou_reply"); expectHowAreYou(cc, (x) => x.expect(closing)); },
      },
      yes: (cc) => bye(cc),
      no: (cc) => bye(cc),
    };
    c.expect(closing);
  },

  tests: [
    { say: "Excuse me, can you help me, please?", intent: "help_req" },
    { say: "Excuse me! Can you help me? I've lost my wallet.", intent: "lost" },
    { say: "I've lost my wallet.", intent: "lost", slots: { item: "wallet" } },
    { say: "I can't find my wallet anywhere.", intent: "lost" },
    { say: "My wallet is gone!", intent: "lost" },
    { say: "I think someone stole my wallet.", intent: "lost" },
    { say: "I don't know where my wallet is.", intent: "lost", not: ["not_lost"] },
    { say: "I lost my purse.", intent: "lost" },
    { say: "I lost my phone.", intent: "lost", slots: { item: "phone" } },
    { say: "I didn't lose my wallet.", intent: "not_lost", not: ["lost"] },
    { say: "At the café, when I paid for my coffee.", intent: "last_seen", slots: { seen: { place: "cafe" } } },
    { say: "About an hour ago.", intent: "last_seen", step: "last_seen" },
    { say: "I think I left it on the bus.", intent: "last_seen", slots: { seen: { place: "bus" } } },
    { say: "I had it at the bakery this morning.", intent: "last_seen" },
    { say: "The fruit stand.", intent: "place_ctx", step: "last_seen" },
    { say: "It's brown, leather, and small.", intent: "describe", step: "describe" },
    { say: "A small black wallet.", intent: "describe", step: "describe" },
    { say: "Where's the nearest police station?", intent: "police_where" },
    { say: "Could you show me on the map?", intent: "map" },
    { say: "Is it far?", intent: "far" },
    { say: "Should I call 911?", intent: "call911" },
    { say: "Should I call 112?", intent: "call911" },
    { say: "Should I cancel my cards?", intent: "cancel_cards" },
    { say: "Yes, that's mine!", intent: "its_mine" },
    { say: "No, that's not mine.", intent: "not_mine", not: ["its_mine"] },
    { say: "Nothing is missing.", intent: "all_there" },
    { say: "You're very kind.", intent: "thanks_kind" },
    { say: "Could I have some tulips?", intent: "flowers" },
    { say: "potato helicopter seventeen", intent: "none" },
    { say: "Could you say that again?", intent: "g_repeat" },
    // more ways to say it (dev corpus: tests/corpus/s91a-lost-wallet.json)
    { say: "My wallet disappeared", intent: "lost", slots: { item: "wallet" } },
    { say: "I don't have my wallet anymore", intent: "lost" },
    { say: "Hello, I'm looking for my wallet", intent: "lost" },
    { say: "Sorry, have you seen a black wallet?", intent: "lost" },
    { say: "No, I'm not okay", intent: "help_req" },
    { say: "I took money from the ATM", intent: "last_seen", slots: { seen: { place: "atm" } } },
    { say: "I don't remember, maybe at the market", intent: "last_seen", slots: { seen: { place: "market" } } },
    { say: "I was shopping at the market", intent: "last_seen", step: "where_then" },
    { say: "It's an old brown leather wallet", intent: "describe", step: "describe" },
    { say: "It has a picture of my kids inside", intent: "describe", step: "describe" },
    { say: "No, I'm not from here", intent: "police_where", step: "police" },
    { say: "Can you draw it on my map?", intent: "map" },
    { say: "Yes, it's near the bank, right?", intent: "police_known", step: "police" },
    { say: "Oh my God, yes, it's mine!", intent: "its_mine", step: "found" },
    { say: "Yes, my money and my cards are here", intent: "all_there", step: "all_there" },
    { say: "Yes, twice", intent: "checked" },
    { say: "You helped me a lot, thank you", intent: "thanks_kind" },
    { say: "Okay, I'll go back there", intent: "will_go_back" },
    { say: "What if it's not there?", intent: "what_do" },
    { say: "No, my wallet is smaller", intent: "not_mine", step: "found", not: ["its_mine"] },
    { say: "My cards are here, but the money is gone", intent: "some_missing", step: "all_there", not: ["all_there"] },
    { say: "My wallet is not lost", intent: "not_lost", not: ["lost"] },
    { say: "I don't know", intent: "g_dontknow", step: "last_seen", not: ["police_where"] },
    { say: "I think I lost it here at the market.", intent: "last_seen", step: "last_seen", slots: { seen: { place: "market" } } },
    { say: "I lost it at the market.", intent: "last_seen", step: "last_seen" },
    { say: "I didn't lose it at the market.", intent: "none", step: "last_seen" },
  ],

  sims: [
    { name: "happy path", turns: ["Excuse me, can you help me, please?", "I've lost my wallet.", "At the café, when I paid for my coffee.", "It's brown, leather, and small.", "Where's the nearest police station?", "Thank you so much!"], expect: { complete: true }, auto: AUTO },
    // the script goes on to the police station: no found wallet (twist) here
    { name: "short answers, questions", setup: (s) => { s.foundTwist = false; }, turns: ["Hi! I can't find my wallet.", "About an hour ago.", "At the bakery.", "Should I call 911?", "Could you show me on the map?", "Thanks, bye!"], expect: { complete: true }, auto: AUTO },
    { name: "stolen, bus, cards", turns: ["I think someone stole my wallet.", "I think I left it on the bus.", "Should I cancel my cards?", "No, where is it?", "Is it far?", "Thank you, you're very kind."], expect: { complete: true }, auto: AUTO },
  ],
};

export default lostWallet;
