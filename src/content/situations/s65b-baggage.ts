// Song 65 "Business or Pleasure?" (part 2): the bag didn't arrive. Priya at the airline's
// baggage service desk files a delayed-bag report: flight, claim tag, a description of the bag
// (type, color, size, material, marks, brand), what's inside, delivery to the hotel, a phone
// number, an overnight kit / reimbursement of essentials, and a file reference number the
// learner can ask to spell or write down. Twist (visits ≥ 1): "Good news, we found it — it's on
// the next flight."
//
// "How do you spell that?" / "Could you write it down?" after the reference number are answered by
// local g_spell / g_write handlers (they keep the question about the number open and fall back to
// GLOBAL_HANDLERS elsewhere).

import type { Ctx, EntityDef, Pending, Segment, SituationDef } from "../types";
import type { SlotFn } from "../../convo/grammar";
import { ent, t } from "../dsl";
import { GLOBAL_HANDLERS, GLOBAL_INTENTS } from "../global";
import { numberSlot } from "../../convo/slots";

/** A number of 10 or more that was really said as a number ("too expensive" is not flight 2). */
const bigNumber: SlotFn = (toks, pos, prefix) => numberSlot(toks, pos, prefix).filter((r) => !r.cost && typeof r.value === "number" && r.value >= 10);

// ---------------------------------------------------------------------------
// Entities

const BAG_TYPES: EntityDef[] = [
  ent("suitcase", "suitcase", "lagaminas/lagamino/lagaminui/lagaminą/lagaminu/lagamine", "m", { chip: "lagaminas",
    forms: ["suitcases", "case", "roller bag", "rolling suitcase", "roller suitcase", "trolley bag", "trolley", "luggage"] }),
  ent("backpack", "backpack", "kuprinė/kuprinės/kuprinei/kuprinę/kuprine/kuprinėje", "f", { chip: "kuprinė", forms: ["back pack", "rucksack", "backpacks"] }),
  ent("duffel", "duffel | bag", "kelioninis/kelioninio/kelioniniam/kelioninį/kelioniniu/kelioniniame | krepšys/krepšio/krepšiui/krepšį/krepšiu/krepšyje", "m",
    { chip: "kelioninis krepšys", forms: ["duffle bag", "duffel", "duffle", "sports bag", "travel bag", "holdall", "gym bag"] }),
  ent("bag", "bag", "krepšys/krepšio/krepšiui/krepšį/krepšiu/krepšyje", "m", { chip: "krepšys", attrs: { generic: true } }),
];

const COLORS: EntityDef[] = [
  ent("black", "black", "juodas/juodo/juodam/juodą/juodu/juodame", "m", { chip: "juodas" }),
  ent("blue", "blue", "mėlynas/mėlyno/mėlynam/mėlyną/mėlynu/mėlyname", "m", { chip: "mėlynas", forms: ["light blue", "sky blue"] }),
  ent("navy", "navy", "tamsiai mėlynas/tamsiai mėlyno/tamsiai mėlynam/tamsiai mėlyną/tamsiai mėlynu/tamsiai mėlyname", "m", { chip: "tamsiai mėlynas", forms: ["dark blue", "navy blue"] }),
  ent("red", "red", "raudonas/raudono/raudonam/raudoną/raudonu/raudoname", "m", { chip: "raudonas", forms: ["dark red", "burgundy", "maroon"] }),
  ent("green", "green", "žalias/žalio/žaliam/žalią/žaliu/žaliame", "m", { chip: "žalias", forms: ["dark green", "olive", "olive green"] }),
  ent("gray", "gray", "pilkas/pilko/pilkam/pilką/pilku/pilkame", "m", { chip: "pilkas", forms: ["grey", "dark gray", "dark grey", "light gray", "light grey", "charcoal"] }),
  ent("silver", "silver", "sidabrinis/sidabrinio/sidabriniam/sidabrinį/sidabriniu/sidabriniame", "m", { chip: "sidabrinis" }),
  ent("white", "white", "baltas/balto/baltam/baltą/baltu/baltame", "m", { chip: "baltas" }),
  ent("yellow", "yellow", "geltonas/geltono/geltonam/geltoną/geltonu/geltoname", "m", { chip: "geltonas" }),
  ent("orange", "orange", "oranžinis/oranžinio/oranžiniam/oranžinį/oranžiniu/oranžiniame", "m", { chip: "oranžinis" }),
  ent("purple", "purple", "violetinis/violetinio/violetiniam/violetinį/violetiniu/violetiniame", "m", { chip: "violetinis", forms: ["violet"] }),
  ent("pink", "pink", "rožinis/rožinio/rožiniam/rožinį/rožiniu/rožiniame", "m", { chip: "rožinis" }),
  ent("brown", "brown", "rudas/rudo/rudam/rudą/rudu/rudame", "m", { chip: "rudas", forms: ["dark brown", "light brown"] }),
  ent("beige", "beige", "smėlinis/smėlinio/smėliniam/smėlinį/smėliniu/smėliniame", "m", { chip: "smėlinis", forms: ["tan", "cream"] }),
];

const SIZES: EntityDef[] = [
  ent("small", "small", "mažas/mažo/mažam/mažą/mažu/mažame", "m", { chip: "mažas", forms: ["little", "carry on size", "cabin size", "smallest", "the smallest", "carry on", "cabin bag", "hand luggage size"] }),
  ent("medium", "medium", "vidutinis/vidutinio/vidutiniam/vidutinį/vidutiniu/vidutiniame", "m", { chip: "vidutinis", forms: ["medium sized", "medium size", "normal size", "regular size",
    "standard", "standard size", "average", "average size", "middle size", "mid size", "midsize"] }),
  ent("large", "large", "didelis/didelio/dideliam/didelį/dideliu/dideliame", "m", { chip: "didelis", forms: ["big", "huge", "very big", "large size", "really big",
    "biggest", "the biggest", "extra large", "xl", "enormous", "the big size", "quite large"] }),
];

const MATERIALS: EntityDef[] = [
  ent("hard", "hard-shell", "kietas/kieto/kietam/kietą/kietu/kietame", "m", { chip: "kietas", forms: ["hard", "hard shell", "hardshell", "hard sided", "plastic", "hard plastic", "hard case",
    "polycarbonate", "aluminum", "aluminium", "metal", "hard material"] }),
  ent("soft", "soft", "minkštas/minkšto/minkštam/minkštą/minkštu/minkštame", "m", { chip: "minkštas", forms: ["soft sided", "soft shell", "fabric", "cloth", "canvas", "nylon", "material",
    "soft material", "textile", "polyester", "soft fabric"] }),
  ent("leather", "leather", "odinis/odinio/odiniam/odinį/odiniu/odiniame", "m", { chip: "odinis", forms: ["real leather"] }),
];

const CITIES: EntityDef[] = [
  ent("new_york", "New York", "Niujorkas/Niujorko/Niujorkui/Niujorką/Niujorku/Niujorke", "m", { forms: ["new york city", "nyc", "jfk", "newark"] }),
  ent("chicago", "Chicago", "Čikaga/Čikagos/Čikagai/Čikagą/Čikaga/Čikagoje", "f", { forms: ["o hare"] }),
  ent("boston", "Boston", "Bostonas/Bostono/Bostonui/Bostoną/Bostonu/Bostone", "m"),
  ent("frankfurt", "Frankfurt", "Frankfurtas/Frankfurto/Frankfurtui/Frankfurtą/Frankfurtu/Frankfurte", "m"),
  ent("london", "London", "Londonas/Londono/Londonui/Londoną/Londonu/Londone", "m", { forms: ["heathrow"] }),
  ent("amsterdam", "Amsterdam", "Amsterdamas/Amsterdamo/Amsterdamui/Amsterdamą/Amsterdamu/Amsterdame", "m"),
  ent("copenhagen", "Copenhagen", "Kopenhaga/Kopenhagos/Kopenhagai/Kopenhagą/Kopenhaga/Kopenhagoje", "f"),
  ent("warsaw", "Warsaw", "Varšuva/Varšuvos/Varšuvai/Varšuvą/Varšuva/Varšuvoje", "f"),
  ent("helsinki", "Helsinki", "Helsinkis/Helsinkio/Helsinkiui/Helsinkį/Helsinkiu/Helsinkyje", "m"),
  ent("riga", "Riga", "Ryga/Rygos/Rygai/Rygą/Ryga/Rygoje", "f"),
  ent("stockholm", "Stockholm", "Stokholmas/Stokholmo/Stokholmui/Stokholmą/Stokholmu/Stokholme", "m"),
  ent("paris", "Paris", "Paryžius/Paryžiaus/Paryžiui/Paryžių/Paryžiumi/Paryžiuje", "m"),
  ent("oslo", "Oslo", "Oslas/Oslo/Oslui/Oslą/Oslu/Osle", "m"),
  ent("toronto", "Toronto", "Torontas/Toronto/Torontui/Torontą/Torontu/Toronte", "m"),
  ent("vilnius", "Vilnius", "Vilnius/Vilniaus/Vilniui/Vilnių/Vilniumi/Vilniuje", "m"),
];

const L = (id: string, forms: string[], tags?: string[]) => ({ id, forms, tags });

const FEATURES = [
  L("wheels", ["wheels", "two wheels", "four wheels", "little wheels"]),
  L("stripe", ["stripe", "stripes", "a stripe", "a line", "a band"]),
  L("ribbon", ["ribbon", "a ribbon", "ribbons", "a scarf", "a bow"]),
  L("nametag", ["name tag", "a name tag", "luggage tag", "a luggage tag", "a tag with my name", "my name on it", "a label", "an address tag"]),
  L("sticker", ["sticker", "stickers", "a sticker", "some stickers"]),
  L("strap", ["strap", "a strap", "a belt", "a luggage strap", "a luggage belt"]),
  L("lock", ["lock", "a lock", "a padlock", "a combination lock"]),
  L("handle", ["a broken handle", "a black handle"]),
];

const BRANDS = ["samsonite", "american tourister", "delsey", "travelpro", "rimowa", "tumi", "swissgear", "swiss gear", "victorinox", "nike",
  "adidas", "osprey", "the north face", "north face", "eastpak", "herschel", "away", "london fog", "ikea", "decathlon",
  "kipling", "wenger", "hartmann", "antler", "lipault", "vera bradley", "calvin klein", "tommy hilfiger", "puma", "jansport", "carlton",
  "roncato", "it luggage", "high sierra", "eagle creek", "briggs and riley", "monos", "lacoste", "guess", "under armour", "the north face"].map((b) => L(b.replace(/ /g, "_"), [b]));
// recogniser spellings of the most common brand
BRANDS.push(L("samsonite", ["samsonight", "sam sonite", "samsonit", "samson"]));

// Airline codes / names before a flight number ("BA 482", "Lufthansa 482"). A bare {letters} slot
// is not used here: it also reads ordinary words ("the biggest one", "a hard one") as a code.
const AIRLINES = [
  L("aa", ["aa", "a a", "american", "american airlines"]), L("ua", ["ua", "u a", "united", "united airlines"]), L("dl", ["dl", "d l", "delta"]),
  L("ba", ["ba", "b a", "british airways"]), L("lh", ["lh", "l h", "lufthansa"]), L("lo", ["lo", "l o", "lot", "lot polish airlines"]),
  L("ay", ["ay", "a y", "finnair"]), L("bt", ["bt", "b t", "air baltic", "airbaltic"]), L("sk", ["sk", "s k", "sas"]),
  L("kl", ["kl", "k l", "klm"]), L("af", ["af", "a f", "air france"]), L("ac", ["ac", "a c", "air canada"]),
  L("b6", ["b6", "jetblue", "jet blue"]), L("dy", ["dy", "d y", "norwegian"]), L("mh", ["mh", "m h"]), L("fr", ["fr", "f r", "ryanair"]),
  L("w6", ["w6", "wizz", "wizz air", "wizzair"]),
];

const CONTENTS = [
  L("clothes", ["clothes", "my clothes", "clothing", "shirts", "a jacket", "jeans", "a dress", "personal things", "personal stuff", "personal items",
    "personal belongings", "my things", "my stuff", "things", "stuff", "t shirts", "pants", "trousers", "sweaters", "a coat", "underwear", "socks", "a suit", "dresses"]),
  L("shoes", ["shoes", "my shoes", "boots", "sneakers", "sandals"]),
  L("gifts", ["gifts", "presents", "souvenirs", "some gifts", "a gift", "a present"]),
  L("toiletries", ["toiletries", "my toothbrush", "shampoo", "cosmetics", "makeup", "make up", "perfume", "a toothbrush", "toothpaste"]),
  L("medicine", ["medicine", "my medicine", "medication", "my medication", "pills", "my pills", "medicines", "my medicines", "insulin", "vitamins"], ["valuable:med"]),
  L("laptop", ["laptop", "my laptop", "a laptop", "computer", "a camera", "my camera", "jewelry", "my jewelry", "a tablet", "camera", "an ipad",
    "a watch", "headphones", "electronics", "money", "cash", "jewellery", "a computer", "gold"], ["valuable:yes"]),
  L("documents", ["documents", "papers", "my documents", "important documents", "work documents", "passport"], ["valuable:yes"]),
  L("books", ["books", "a book"]),
  L("food", ["food", "cheese", "chocolate", "candy", "sweets", "coffee", "bread", "sausage"]),
];

// ---------------------------------------------------------------------------
// Helpers

const toArr = (x: any): any[] => (x == null ? [] : Array.isArray(x) ? x : [x]);
const TURN = new WeakMap<object, Record<string, any>>();
const turn = (c: Ctx) => { let x = TURN.get(c); if (!x) { x = {}; TURN.set(c, x); } return x; };
function ack(c: Ctx, p = 0.5, line = "ack") { const T = turn(c); if (T.acked) return; T.acked = true; if (c.chance(p)) c.say(line); }
function once(c: Ctx, key: string, line: string, vars?: Record<string, any>) { const T = turn(c); if (T["said_" + key]) return; T["said_" + key] = true; c.say(line, vars); }
const allTags = (v: any, seg?: Segment): string[] => {
  const out: string[] = [...(seg?.tags || [])];
  const walk = (o: any) => { if (!o || typeof o !== "object") return; if (Array.isArray(o)) { o.forEach(walk); return; } out.push(...(o.__tags || [])); for (const [k, x] of Object.entries(o)) if (k !== "__tags") walk(x); };
  walk(v);
  return out;
};
const pickFirst = (v: any, key: string): string | undefined => {
  const walk = (o: any): string | undefined => {
    if (!o || typeof o !== "object") return undefined;
    if (Array.isArray(o)) { for (const x of o) { const r = walk(x); if (r) return r; } return undefined; }
    if (typeof o[key] === "string") return o[key];
    for (const [k, x] of Object.entries(o)) if (k !== "__tags") { const r = walk(x); if (r) return r; }
    return undefined;
  };
  return walk(v);
};

const REFS: Record<string, { write: string }> = { a: { write: "Baggage file: MHR-47219" }, b: { write: "Baggage file: MHR-58306" } };

/** Fold everything the learner said about the bag into the state (several segments may arrive in one turn). */
function takeDescription(c: Ctx, slots: any, seg: Segment) {
  const tags = allTags(slots, seg);
  const type = pickFirst(slots, "bagtype");
  const color = pickFirst(slots, "color");
  const size = pickFirst(slots, "size");
  const material = pickFirst(slots, "material");
  const brand = pickFirst(slots, "brand");
  const feats = tags.filter((x) => x.startsWith("f:")).map((x) => x.slice(2));
  const feat = pickFirst(slots, "feature");
  if (feat) feats.push(feat);
  if (type && !(type === "bag" && c.s.type && c.s.type !== "bag")) c.s.type = type;
  if (color) c.s.color = color;
  if (size) c.s.size = size;
  if (material) c.s.material = material;
  if (brand) c.s.brand = brand;
  if (feats.length) { c.s.marks = [...new Set([...(c.s.marks || []), ...feats])]; turn(c).newMarks = true; }
  if (tags.includes("wheels")) c.s.marks = [...new Set([...(c.s.marks || []), "wheels"])];
  const T = turn(c);
  T.described = true;
}

/** After a description turn: echo type + color once, or a short acknowledgement. */
function echoDescription(c: Ctx) {
  const T = turn(c);
  if (T.echoed) return;
  T.echoed = true;
  if (c.s.type && c.s.type !== "bag" && c.s.color && !c.s.echoedOnce) {
    c.s.echoedOnce = true;
    c.say("echo", { X: { id: c.s.type, mods: [c.s.size, c.s.color].filter(Boolean) } });
  } else if (T.newMarks) c.say("helpful");
  else if (c.chance(0.6)) c.say("ack");
}

function binding(c: Ctx) { return c.s.type && c.s.type !== "bag" ? c.s.type : "suitcase"; }

const omit = (o: Record<string, string>, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

// Answers the simulation gives when Priya asks an optional question.
const BG_AUTO: Record<string, string> = {
  problem: "My bag didn't arrive.", flight: "It was flight 482 from New York.", tag: "Yes, here it is.",
  describe: "It's a large blue suitcase.", size: "Large.", material: "Hard-shell.", marks: "It has a red stripe on the side.",
  brand: "I'm not sure.", contents: "Just clothes and shoes.", delivery: "Yes, please deliver it to my hotel.",
  hotel: "At the Harborview Hotel.", phone: "My number is 555 0142.", kit: "Yes, please.", ref: "Thank you.",
  connection: "Yes, in New York.",
};

// ---------------------------------------------------------------------------

export const baggage: SituationDef = {
  id: "s65b-baggage",
  song: 65,
  songTitle: "Business or Pleasure?",
  title: { en: "My Bag Didn't Arrive", lt: "Mano lagaminas neatvyko" },
  topic: { en: "Lost luggage", lt: "Dingęs bagažas" },
  chapter: 1,
  order: 2,
  location: "airport",
  npc: "priya",
  goal: "Pranešk, kad neatvyko tavo lagaminas, ir susitark dėl pristatymo.",
  intro: "Bagažo atsiėmimo salė. Juosta sustojo, visi išsiskirstė, o tavo lagamino nėra. Eini prie bagažo tarnybos langelio. (Tavo lagaminas – didelis mėlynas su raudona juostele šone.)",
  entities: { bagtype: BAG_TYPES, color: COLORS, size: SIZES, material: MATERIALS, city: CITIES },

  grammar: {
    macros: {
      bagword: "(bag | suitcase | luggage | backpack | case | baggage | bags | suitcases)",
      bagnoun: "(bag | bags | suitcase | suitcases | luggage | baggage | backpack | case)",
      my_bag: "(my | our | the | one) (bag | suitcase | luggage | backpack | baggage | case | bags | suitcases) | one of my (bags | suitcases) | my (other | second | big | blue) (bag | suitcase)",
      // "…didn't arrive", "…is not arrived", "…never showed up" (after @my_bag)
      not_came: "(did not arrive | did not come | has not arrived | has not come | did not come out | is not here | is missing | never came | never arrived | was not on the (belt | carousel) | did not show up | never showed up | has not come out | never came out | is still not here | is not on the (belt | carousel) | is not arrived | not arrived | not came | not come | did not get here | is still missing | did not make it | has not shown up | was not there | is not there)",
      belt_tail: "(on the (belt | carousel | conveyor | conveyor belt | baggage belt) | with (my | the) flight | from (my | the) flight | yet | at all | again)",
      waited: "i (waited | have been waiting | was waiting | am waiting | wait) [here] [for] (a long time | an hour | one hour | two hours | half an hour | thirty minutes | so long | ages | a while | forever)",
      country: "(lithuania | germany | the netherlands | holland | poland | finland | latvia | sweden | france | norway | canada | england | the uk | britain | denmark | the us | the usa | america)",
      ago: "((an | one | two | three | half an) (hour | hours) ago | today | this morning | this afternoon | this evening | tonight | just now | a few minutes ago)",
      hotel_tail: "(downtown | in town | in the city | in the center | [here] in maple harbor | on {street} | at {number} {street} | (near | by | next to | close to) the (airport | harbor | beach | station | center | port | museum | park) | [in] room {number} | for ({number} | a | one) (night | nights | day | days | week | weeks) | until {day})",
      it_is: "(it is | it was | my bag is | my suitcase is | the bag is | the suitcase is | it is just)",
      stay_verb: "(i am staying | i will stay | i will be staying | we are staying | i am | i will be)",
      with_feats: "with {feat_phrase} [and {feat_phrase}]",
      cont_tail: "([and] i need (it | them) [tonight | every day | today] | (it is | they are | that is) [very | quite | really] (expensive | valuable | important | new))",
    },
    slots: {
      feature: { lexicon: FEATURES },
      brand: { lexicon: BRANDS },
      content: { lexicon: CONTENTS },
      airline: { lexicon: AIRLINES },
      hotel: { lexicon: [L("harborview", ["harborview hotel", "harborview", "harbor view hotel", "harbor view", "the harborview hotel", "hotel harborview", "harbourview", "harbourview hotel", "harbour view hotel", "harbour view", "harbor view inn"]),
        L("other_hotel", ["hilton", "marriott", "holiday inn", "hyatt", "sheraton", "best western", "hampton inn", "radisson", "motel 6", "days inn", "comfort inn", "westin", "ritz carlton"])] },
      street: { lexicon: [L("oak", ["oak avenue"]), L("maple", ["maple street"]), L("main", ["main street"]), L("harbor", ["harbor road"]), L("elm", ["elm street"]), L("ocean", ["ocean drive"])] },
      bignum: { fn: bigNumber },
      fnum: { pattern: ["{digits}", "{bignum}", "{number} {number}", "{airline} ({digits} | {bignum} | {number} {number})"] },
      np_desc: { pattern: [
        "[a | an | the | my] [normal | ordinary | simple | plain | typical | classic] [{size}] [{color} [and {color2:color}] [color | colored]] [{material}] {bagtype} [@with_feats | on wheels #f:wheels]",
        "[a | an | the | my] {color} [and {color2:color}] [{material}] {size} {bagtype} [@with_feats | on wheels #f:wheels]",
      ] },
      feat_phrase: { pattern: [
        "(wheels #f:wheels | two wheels #f:wheels | four wheels #f:wheels)",
        "(a | one | two | some) [{fcolor:color}] (stripe | stripes | line | band) #f:stripe [on (it | the side | the front | the top)]",
        "(a | one | two) [{fcolor:color}] (ribbon | ribbons | scarf | bow) #f:ribbon [on (it | the handle | the side)]",
        "(a | my) (name tag | luggage tag | tag | label) #f:nametag [with my name [on it]]", "my name [and (address | phone number | number)] on it #f:nametag",
        "(my | a | the) (name tag | luggage tag | tag | label) #f:nametag (is on | on) (it | the handle | the side | the front | the top)",
        "(stickers | a sticker | some stickers | a lot of stickers | lots of stickers | many stickers) #f:sticker [on it]",
        "(a | one) [{fcolor:color}] (strap | belt | luggage strap) #f:strap [around it]", "(a lock | a padlock) #f:lock",
      ] },
      // "clothes, shoes and some gifts", "my laptop and my camera", "presents for my family"
      cont_item: { pattern: "[my | some | a | an | the | old | new | a few | two | lots of | a lot of | many | all my] {content} [for (my | the) (family | kids | children | wife | husband | friends | mother | mom | parents | work | trip)]" },
      cont_list: { pattern: "{cont_item} [[and | plus | and also | also] {cont_item}] [[and | plus] {cont_item}] [[and] {cont_item}]" },
    },
    // (macros referenced from slots)
  },

  intents: {
    problem: { patterns: [
      "@my_bag (did not arrive | did not come | has not arrived | did not come out | is not here | is missing | never came | never arrived | was not on the (belt | carousel) | did not show up | never showed up | has not come out | never came out | is still not here | is not on the (belt | carousel)) #h:pr_didnt",
      "i (have been | was | am) waiting [for a long time | for an hour] [but] @my_bag (is not here | did not come | never came | is still not here | did not arrive)",
      "i can not find (my | our) (bag | suitcase | luggage | backpack | baggage) #h:pr_cant_find",
      "i think @my_bag (is lost | got lost | was lost | is missing) #h:pr_lost", "@my_bag (is lost | got lost | was lost)",
      "(i lost | you lost | the airline lost | somebody lost) (my | our) (bag | luggage | suitcase)",
      "i (am | have been) waiting for (my | our) (bag | suitcase | luggage) [but it (did not come | is not here | never came)]",
      "i (would like | want | need) to report a (lost | missing | delayed) (bag | suitcase | luggage) #h:pr_report",
      "where is (my | our) (bag | suitcase | luggage)", "(my | our) (luggage | bags | suitcases) did not (arrive | come)",
      "i did not get my (bag | suitcase | luggage)", "(no | there is no) (bag | suitcase) for me",
      // more ways to say it: "My luggage never came out on the carousel", "Bag not arrived", "I didn't receive my luggage"
      "@my_bag @not_came [@belt_tail] [@waited] #h:pr_didnt", "[my | the] @bagnoun (not arrived | not come | not came | not here | missing) [@belt_tail]",
      "(i lost | you lost | the airline lost | you guys lost | somebody lost | they lost) (my | our) @bagnoun",
      "i think (the airline | you | they | you guys) lost (my | our) @bagnoun",
      "i did not (get | receive | find | see) (my | our | one of my) @bagnoun [@belt_tail]",
      "i am missing (a | one | my | two | one of my) @bagnoun", "(i have | there is) a (missing | lost | delayed) @bagnoun",
      "(everybody | everyone | other people | all the people) (got | have | took) their (bags | luggage | suitcases) [but] (not me | i did not | except me | but not me)",
      "where (can | do) i report a (lost | missing | delayed) @bagnoun #h:pr_report",
      "i am looking for (my | our) @bagnoun [(it | and it) @not_came]",
      "i have lost (my | our | one of my) @bagnoun", "@my_bag is lost [somewhere]", "i can not find (my | our) @bagnoun (anywhere | on the belt | on the carousel)",
      "there is no my @bagnoun", "@waited [and | but] @my_bag [still] @not_came",
    ] },
    need_help: { patterns: ["[can you | could you] help me", "i need (help | some help)", "i have a problem", "i have a question",
      "(i have | there is) a problem with (my | our) @bagnoun"] },
    flight: { patterns: [
      "(it was | i was on | i came on | my flight was | i flew on | i came in on) [flight] {fnum} [from {city}] #h:f_num",
      "flight {fnum} [from {city}] #h:f_short", "(the | my) [flight] number (was | is) {fnum}", "[the | my] flight number [is | was] {fnum} [from {city}]", "(it was | i was on) the (flight | plane) from {city} #h:f_from_short",
      "(i | we) (flew | came | was flying | arrived | traveled | travelled) [here | in] from {city} [in @country] [(via | through | with a connection in) {via:city}] [@ago] #h:f_from",
      "from {city} [in @country] [(via | through) {via:city}] #h:f_from_city", "i (had a connection | had a layover | changed planes | changed flights) in {via:city} #h:f_conn", "(via | through) {via:city}",
      // "The New York flight", "My flight was from Amsterdam", "I took the flight from Paris"
      "[it was | i was on | i came on] the {city} flight", "(it was | my flight was | the flight was | i was) from {city} [in @country] [@ago]",
      "[it was | i was on | i took | i came on] the [morning | afternoon | evening | night | early | late] (flight | plane) from {city} [(via | through) {via:city}] #h:f_from_short",
      "(i | we) (flew | came | traveled | travelled) (via | through) {via:city}",
      "(i | we) (came | flew | was | traveled) (with | on) [the] flight {fnum} [from {city}]", "(i | we) (flew | came) (with | on) {airline} [from {city}] [(via | through) {via:city}]",
      "[the] flight from {city} [the] number [is] {fnum}",
    ] },
    via_ctx: { patterns: ["[yes] in {via:city} #h:cn_in", "[yes] (i changed | we changed) (planes | flights) in {via:city}", "[yes] {via:city}", "[yes] (i had | there was) (one | a connection) in {via:city}",
      "[yes] (only | just) one [connection | stop] in {via:city}", "[yes] (one | a) (stop | stopover | layover | connection | transfer) in {via:city}",
      "[yes] (i | we) (changed | transferred) in {via:city}", "[yes] (two | 2) (connections | stops | layovers) [in] {via:city} and {via2:city}",
      "[yes] in {via:city} [in] @country"] },
    flight_num_ctx: { patterns: ["{fnum}", "[the] number is {fnum}", "[it is] {fnum}"] },
    city_ctx: { patterns: ["{city}", "i think [from] {city}", "{city} [in] @country"] },
    no_connection: { patterns: ["[no] it was (a direct flight | direct | nonstop) #h:cn_direct", "[no] (no connection | a direct flight | direct | nonstop | non stop | a nonstop flight | straight)",
      "[no] (only one flight | just one flight | one flight only | only one plane)", "[no] (i | we) flew (straight | directly | direct | nonstop) [here] [from {city}]",
      "[no] i did not (change planes | change flights | have a connection) [in {city}]"] },
    dunno_ctx: { patterns: [
      "i do not (remember | know) [the (flight number | number | brand | name)] #h:f_dunno", "i am not sure #h:b_dunno", "no idea", "i have no idea",
      "i do not remember", "i forgot [the number]", "i can not remember [the (flight number | number | brand | name)]", "i forgot the (flight number | number | brand | name)",
      // no brand at all: "It's a cheap one, no brand"
      "[@it_is] [a | just a] cheap (one | suitcase | bag) [[there is | it has] no (brand | name)]", "[there is] no (brand | name) [just a cheap (one | suitcase | bag)]",
      "(it does not have | it has no) (a brand | brand | a name)", "i do not think (it has | there is) a brand",
    ] },
    hand_over: { patterns: [
      "here you go #h:t_here", "here you are", "here it is #h:t_here", "there you go", "here", "[here] take it", "here is it", "[yes] it is (here | right here)",
      "here is (my | the) (tag | bag tag | claim tag | claim check | boarding pass | ticket | baggage tag | sticker) #h:t_heres",
      "(it is | the tag is | my tag is) on my boarding pass #h:t_on_bp", "it is (stuck | right here) on my boarding pass",
      "[yes] i have (it | the tag | my tag | the claim tag | the sticker | the baggage tag | my boarding pass) [here | right here | with me]",
      "(it is | the tag is | my tag is | the sticker is) (in | on | inside) my (passport | ticket | boarding pass | wallet | phone)",
      "(it is | the tag is) on the back of my (boarding pass | ticket | passport)",
    ] },
    tag_lost: { patterns: ["[no] i [think i] (lost | can not find | do not have) (it | the tag | my tag | the claim tag | the sticker) #h:t_lost", "[no] i do not know where it is",
      "[no] i [think i] (threw it away | threw it out | left it on the plane | do not have it anymore)",
      "[no] (i did not get | they did not give me | nobody gave me | i never got | i did not receive) (a | the | any) (tag | sticker | claim tag | baggage tag)"] },
    describe: { patterns: [
      "@it_is {np_desc} #h:d_its", "{np_desc}", "[@it_is] {np_desc} [and] [quite | very | pretty] {size}",
      "@it_is {color} [and {color2:color}] #h:d_color", "@it_is {color} [and {color2:color}] with {feat_phrase} [and {feat_phrase}]",
      "@it_is [quite | very | pretty] {size}", "@it_is (a | an) {size} one", "@it_is (a | an) {color} one", "@it_is {material} #h:mt_its",
      "it (has | has got) {feat_phrase} [and {feat_phrase}] #h:d_has", "(there is | there are) {feat_phrase} [and {feat_phrase}] #h:d_there",
      "{color} [and {color2:color}] with {feat_phrase} [and {feat_phrase}]",
      "[@it_is] (a | an) [{size}] [{color}] {brand} [{bagtype}] [@with_feats]",
      // lists of adjectives without a noun: "Big, blue, hard plastic", "The suitcase is blue and big"
      "[@it_is] [quite | very | pretty] {size} [and] {color} [and {color2:color}] [[and] {material}] [@with_feats]",
      "[@it_is] {color} [and {color2:color}] [and] [quite | very | pretty] {size} [[and] {material}] [@with_feats]",
      "[the | its] (color | colour) is {color} [and {color2:color}]", "(color | colour) {color}", "{color} [and {color2:color}] (color | colour | colored)",
      "@it_is (made of | made from) {material}",
    ] },
    describe_fix: { patterns: [
      "[no] (it is | it was) not (a | an) {wrong:bagtype} [it is (a | an) {bagtype}]", "[no] not (a | an) {wrong:bagtype} [(a | an) {bagtype}]",
      "[no] (it is | it was) not {wrong:color} [it is {color}]", "[no] not {wrong:color} [{color}]",
    ] },
    color_ctx: { patterns: ["{color} [and {color2:color}] #h:c_short", "(a | an) {color} one"] },
    type_ctx: { patterns: ["[a | an] {bagtype} #h:tp_short", "it is (a | an) {bagtype} #h:tp_its", "(the first | the first one) (a | an) {bagtype}", "[a | an] {bagtype} the first one"] },
    size_ctx: { patterns: ["{size} [one] #h:sz_short", "(quite | pretty | very) {size}", "(a | an) {size} one", "it is {size} #h:sz_its",
      "[the] {size} size", "not (very | so | too | that) (big | large) [just | only | so | it is] {size}", "(a | an | the) {size}",
      // a measurement: "It's about 70 centimeters" (the handler turns it into small / medium / large)
      "[it is] [about | around | maybe | approximately | roughly | like] {cm:number} (centimeters | centimeter | centimetres | cm)",
      "[it is] [about | around | maybe | approximately | roughly | like] {inch:number} (inches | inch)"] },
    material_ctx: { patterns: ["{material} #h:mt_short", "(a | an) {material} one", "{material} @with_feats", "@it_is (a | an) {material} one", "[@it_is] {material} [and] not {wrong:material}", "[it is] made of {material}"] },
    // the answer to "Any ribbons, stickers or name tags on it?" without a verb: "A red stripe", "Just a lot of stickers"
    marks_ctx: { patterns: ["[just | only] {feat_phrase} [and {feat_phrase}]"] },
    marks_none: { patterns: ["[no] nothing special #h:m_none", "[no] (it does not have (any | anything) | no marks | nothing on it | it is just a (plain | normal) (suitcase | bag))", "[no] it (does not have | has no) (anything | stickers | ribbons | tags) [on it]",
      "[no] nothing [at all | really]", "[no] there is nothing on it",
      "no (ribbons | stickers | tags | marks | name tags | ribbon | sticker | tag) [(and | or | nor) [no] (ribbons | stickers | tags | marks | name tags | ribbon | sticker | tag)]"] },
    brand: { patterns: ["@it_is (a | an) {brand} #h:b_its", "{brand} #h:b_short", "the brand is {brand}", "i think (it is | it is a) {brand}",
      "(it is | i bought it) from {brand}", "@it_is [a | an] {brand} brand", "{brand} brand", "@it_is {brand}"] },
    contents: { patterns: [
      "[just | only | mostly] [some] {content} [(and | and some | and my | and a) {content}] [and {content}] #h:c_clothes",
      "(there is | there are | i have) [just | only | mostly] [my] {content} [(and | and my) {content}] [in it | in there] #h:c_in",
      "my {content} (is | are) in (it | there) #h:c_med", "[no] nothing valuable [just {content} [and {content}]] #h:c_nothing",
      "[no] (just | only) (clothes | my clothes | personal things | personal stuff) [and {content}] #h:c_clothes",
      // lists and extra detail: "My clothes, my shoes, my makeup", "Some presents for my family", "A laptop, it's very expensive"
      "[not really] [just | only | mostly] {cont_list} [@cont_tail] #h:c_clothes",
      "[no | not really] nothing [(valuable | expensive | special | important | much)] [(just | only | mostly) {cont_list}] #h:c_nothing",
      "(there is | there are | i have) [just | only | mostly] {cont_list} (inside | in it | in there | in the bag | in the suitcase) [@cont_tail] #h:c_in",
      "[no] i do not have anything (valuable | expensive | special | important) [in (it | there | the bag | the suitcase)]",
    ] },
    delivery: { patterns: [
      "[yes] (can you | could you) deliver it [to (my | the) hotel] #h:dl_deliver", "[yes] [please] deliver it [to (my | the) hotel] [please] #h:dl_yes",
      "[yes] (please | can you | could you) (bring | send) it to (my | the) hotel", "[yes] to my hotel [please]",
      "[yes] [(can you | could you)] (deliver | send | bring) it to [the] {hotel}",
      "[yes] (delivery | deliver | home delivery | delivery to (my | the) hotel) [would be (great | good | nice | perfect)]",
      "[yes] (send | bring) it [to (my | the) hotel | there]",
      "[yes] [(can you | could you)] (deliver | send | bring) it to (my friends (house | place | apartment) | my address | my house | my apartment | this address | my airbnb)",
      "[yes] i would like (delivery | it delivered | you to deliver it) [to (my | the) hotel]",
    ] },
    pickup: { patterns: ["i will (pick it up | come back for it | come and get it) [myself | here | later] #h:dl_pickup", "i (can | will) come back [to (get | pick up) it]", "i will get it [myself]",
      "[no] i will (pick it up | collect it | come back for it | come and get it | get it | come back and (pick it up | get it | collect it)) [myself] [later | tomorrow | tonight] [here | at the airport | at the desk | at this desk] #h:dl_pickup",
      "[no] i would (rather | prefer to) (pick it up | collect it | come and get it | come back for it | get it) [myself] [here | later]",
      "(can | could) i (pick it up | collect it | come and get it | get it) [myself] [here | later | tomorrow | at the airport | at the desk]",
      "[no] i (do not need | do not want) (delivery | it delivered | a delivery) [i will (pick it up | collect it | come back for it)]",
      "[no] (do not | please do not) (deliver | send) it [i will (pick it up | collect it | come back for it)]",
      "[no] i (want | prefer) to (pick it up | collect it | come back for it) [myself]"] },
    stay: { patterns: [
      "(at | in) [the] {hotel} [@hotel_tail] [@hotel_tail] #h:h_at", "[the] {hotel} [@hotel_tail] [@hotel_tail]", "@stay_verb (at | in) [the] {hotel} [@hotel_tail] [@hotel_tail] #h:h_hotel",
      "[@stay_verb] (at | with) (a friend | my friend | my sister | my family | my brother | my daughter | my son) [@hotel_tail] #fam",
      "[@stay_verb] at {number} {street}", "[it is] {number} {street}", "my address is {number} {street}",
      "[@stay_verb] (at | in) (my friends | a friends | my sisters | my brothers | my daughters | my sons) (house | place | apartment | home) #fam",
      "[@stay_verb] (in | at) (an airbnb | an apartment | a rental | a rental apartment | a guest house | a hostel | a motel) [@hotel_tail]",
      "(an airbnb | an apartment | a rental apartment | a guest house) [@hotel_tail]",
    ] },
    phone: { patterns: [
      "[my] [cell] [phone] number is [plus] {digits} #h:ph_mine", "(it is | you can call me at | call me at) [plus] {digits} #h:ph_its",
      "[it is] plus {digits} #h:ph_mine",
      "my (cell | mobile | cell phone | mobile phone | phone | whatsapp) [number] is [plus] {digits}", "(the | my) [cell] [phone] number is [plus] {digits}",
      "(you can (reach | call | text) me | reach me | call me | text me) (at | on) [plus] {digits}",
    ] },
    phone_ctx: { patterns: ["[plus] {digits}"] },
    phone_none: { patterns: ["i do not have a (us | american | local) (phone | number | phone number | cell phone) [yet] #h:ph_none", "[no] i do not have a (phone | number) here", "my phone does not work here",
      "i [only | just] have a (lithuanian | foreign | european) (number | phone | phone number)",
      "my phone (does not work | is not working | will not work) (here | in america | in the us | in the usa | in the states | in this country)",
      "[you can | just] call (the | my) hotel [instead]", "i do not have a (sim | sim card | local sim | us sim | american sim) [card] [here | yet]"] },
    q_when: { patterns: ["when will i get it [back] #h:q_when", "how long will it take", "when will it (arrive | come | be here | get here)", "how long does it [usually] take"] },
    q_meantime: { patterns: [
      "what (should | can) i do (in the meantime | until then | tonight) [without (my | a) (clothes | things | bag | suitcase | toothbrush | luggage)] #h:q_meantime", "what about tonight", "what (do | should) i do now", "what now",
      "i do not have (anything | my things | any clothes | a toothbrush) [for tonight]", "(can i | could i) (get | have) (an overnight kit | a toothbrush | a kit | a t shirt)",
      "do you have (an overnight kit | a toothbrush | a kit)",
    ] },
    q_reimburse: { patterns: [
      "will you pay (for it | for things | for clothes | for a toothbrush | for what i buy | me back) #h:q_reimburse", "will you pay for (new clothes | my clothes | new things | the clothes)",
      "(can i | do i) (get | have) my money back", "can i buy (some clothes | a toothbrush | things) and get (reimbursed | paid back | my money back)",
      "who pays for (it | that | my things)", "do you (pay for | cover) (it | that | things | clothes | new clothes | my things | a toothbrush | toiletries | the things i buy)",
      "who pays [for it] (if | when) i buy (clothes | things | a toothbrush | something | new clothes)",
      "(is the airline | are you | is the company) (going to pay | paying) (for (it | my things | clothes | that | new clothes) | me back)",
      "will the airline (pay | cover) (for (it | my things | clothes | that) | me back | the costs | it)",
    ] },
    // the overnight kit (answers to "Would you like an overnight kit?")
    kit_yes_ctx: { patterns: [
      "[yes] i (need | would like | would love | will take | could use) (that | it | one | the kit | a kit | an overnight kit | the overnight kit)",
      "[yes] (a | the) (toothbrush | kit | t shirt | overnight kit) would be (great | nice | good | helpful | perfect | wonderful)",
      "[yes] that (is | would be) (very | so | really) (kind | nice | helpful) [of you]",
      "[yes] i need (a toothbrush | a t shirt | toothpaste | something for tonight)",
    ] },
    kit_no_ctx: { patterns: [
      "[no] i do not need (it | that | one | a kit | the kit | anything)",
      "[no] i have (everything | my things | my own things | what i need | a toothbrush | my toothbrush | everything i need) [in my (carry on | hand luggage | backpack | bag | cabin bag)]",
      "[no] i (am | will be) (fine | okay | good | all right)",
      "[no] i have my (things | toothbrush | stuff) in my (carry on | hand luggage | backpack | bag)",
    ] },
    q_call: { patterns: ["will you call me #h:q_call", "(how | when) will i know", "will you let me know", "will you (text | email) me"] },
    q_track: { patterns: ["can i track it [online] #h:q_track", "how can i (check | track) (it | the status | where it is)", "is there a website"] },
    q_free: { patterns: ["is (the | that | delivery | the delivery) free #h:q_free", "do i (have to | need to) pay [for (the delivery | it)]", "how much is (the delivery | it)"] },
    q_what_if: { patterns: ["what if you (do not | can not) find it #h:q_what_if", "what (happens | will happen) if (it is lost | you do not find it)", "is it lost [forever]"] },
    q_copy: { patterns: ["(can | could) i (have | get) a copy [of the report] #h:q_copy", "do i get a copy"] },
    q_taxi: { patterns: ["where (can i | do i) (get | find) a (taxi | cab)", "where is the taxi (stand | rank #tip:uk_taxi_rank)", "where are the (taxis | cabs)"] },
    q_shop: { patterns: ["where can i buy (a toothbrush | some clothes | things | a t shirt)", "is there a (shop | store) [here | nearby]"] },
    q_ref: { patterns: ["(do i get | is there) a (reference | file | report) number", "what is my (reference | file) number",
      "what (was | is) (the | my) (number | reference number | reference | file number | report number) [again]",
      "(can | could) you (repeat | say) (the | my) (number | reference number | reference | file number) [again]"] },
    g_spell: { patterns: GLOBAL_INTENTS.g_spell.patterns },
    g_write: { patterns: [...GLOBAL_INTENTS.g_write.patterns, "(can | could) i (have | get) (it | that | the number) (on paper | in writing | written down)"] },
  },

  lines: {
    greet: [
      t("Hi there! | How | can | I | help | you?", "Sveiki! | Kuo | galiu | aš | padėti | jums?", "Sveiki! Kuo galiu padėti?"),
      t("Hi! | What | can | I | do | for you?", "Sveiki! | Ką | galiu | aš | padaryti | jums?", "Sveiki! Kuo galiu padėti?"),
      t("Next, | please! | How | can | I | help?", "Kitas, | prašau! | Kuo | galiu | aš | padėti?", "Kitas, prašau! Kuo galiu padėti?"),
    ],
    ask_help: [t("How | can | I | help | you?", "Kuo | galiu | aš | padėti | jums?", "Kuo galiu padėti?")],
    problem_help: [t("Is | it | about | a | lost | bag?", "Ar | tai | dėl | — | dingusio | lagamino?", "Ar dėl dingusio lagamino?",
      { flags: { 0: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } })],
    what_happened: [t("Of course. | What | happened?", "Žinoma. | Kas | atsitiko?", "Žinoma. Kas atsitiko?")],
    sorry_bag: [
      t("Oh | no, | I'm sorry | about | that.", "O | ne, | apgailestauju | dėl | to.", "O ne, labai apgailestauju."),
      t("I'm sorry | to hear | that. | Let's see | what | we | can | do.", "Man gaila | girdėti | tai. | Pažiūrėkime, | ką | mes | galime | padaryti.", "Labai gaila. Pažiūrėkime, ką galime padaryti."),
      t("Oh | no! | Don't worry, | we'll find | it.", "O | ne! | Nesijaudinkite, | surasime | jį.", "O ne! Nesijaudinkite, surasime jį."),
    ],
    ack: [
      t("Okay.", "Gerai.", "Gerai."),
      t("Got it.", "Supratau.", "Supratau."),
      t("Perfect.", "Puiku.", "Puiku."),
    ],
    thank_you: [t("Thank | you.", "Dėkoju | jums.", "Ačiū."), t("Thanks.", "Ačiū.", "Ačiū.")],
    // Flight and tag
    ask_flight: [
      t("What | flight | were | you | on?", "Kokiu | skrydžiu | skridote | jūs | —?", "Kokiu skrydžiu skridote?",
        { flags: { 4: "Stranded “on”: no separate word; the instrumental kokiu skrydžiu carries it." } }),
      t("Can | I | have | your | flight | number?", "Ar galiu | aš | gauti | jūsų | skrydžio | numerį?", "Koks jūsų skrydžio numeris?"),
    ],
    flight_help: [t("It's | on | your | boarding | pass.", "Jis yra | ant | jūsų | įlaipinimo | kortelės.", "Jis nurodytas įlaipinimo kortelėje.")],
    ask_from: [t("That's | okay. | From | which | city?", "Tai yra | gerai. | Iš | kokio | miesto?", "Nieko tokio. Iš kokio miesto atskridote?")],
    ask_connection: [t("Did | you | have | a | connection?", "Ar | jūs | turėjote | — | persėdimą?", "Ar turėjote persėdimą?",
      { flags: { 0: "Question “Did” = the particle ar; the past tense sits on turėjote (linked to “have”)." } })],
    ask_tag: [
      t("Do | you | have | your | baggage | claim | tag?", "Ar | jūs | turite | savo | bagažo | atsiėmimo | žymą?", "Ar turite bagažo žymą?"),
      t("Can | I | see | your | bag | tag? | It's | usually | on | your | boarding | pass.", "Ar galiu | aš | pamatyti | jūsų | bagažo | žymą? | Ji yra | paprastai | ant | jūsų | įlaipinimo | kortelės.",
        "Ar galiu pamatyti bagažo žymą? Paprastai ji priklijuota prie įlaipinimo kortelės."),
    ],
    tag_thanks: [t("Perfect, | thank | you.", "Puiku, | dėkoju | jums.", "Puiku, ačiū.")],
    tag_none: [t("No | problem. | I | can | find | it | with | your | boarding | pass.", "Jokių | problemų. | Aš | galiu | rasti | jį | pagal | jūsų | įlaipinimo | kortelę.", "Nieko tokio, rasiu pagal įlaipinimo kortelę.")],
    checking: [
      t("Let | me | check | the | system.", "Leiskite | man | patikrinti | — | sistemą.", "Tuoj patikrinsiu sistemoje."),
      t("One | moment, | let | me | look.", "Vieną | akimirką, | leiskite | man | pažiūrėti.", "Akimirką, pažiūrėsiu."),
    ],
    not_in_system: [
      t("Hmm, | I | can't see | it | in the system | yet. | Let's file | a | report.", "Hmm, | aš | nematau | jo | sistemoje | dar. | Užregistruokime | — | pranešimą.", "Hmm, sistemoje jo dar nematau. Užregistruokime pranešimą."),
      t("It's | not | in the system | yet, | so | let's file | a | report.", "Jo | nėra | sistemoje | dar, | tad | užregistruokime | — | pranešimą.", "Sistemoje jo dar nėra, tad užregistruokime pranešimą.",
        { flags: { 0: "“It's … not”: Lithuanian uses the negated existential nėra with the genitive jo (the copula of It's is carried by nėra)." } }),
    ],
    found_it: [
      t("Good | news! | We | found | it.", "Geros | naujienos! | Mes | radome | jį.", "Geros naujienos! Radome jį."),
      t("Oh, | good | news: | I | can | see | it | in the system.", "O, | geros | naujienos: | aš | galiu | matyti | jį | sistemoje.", "O, geros naujienos: matau jį sistemoje."),
    ],
    still_in: [t("Your | bag | is | still | in {X}.", "Jūsų | lagaminas | yra | vis dar | {X:loc}.", "Jūsų lagaminas vis dar {X:loc}.")],
    next_flight: [
      t("It's | on | the | next | flight. | It | lands | at | 6 | p.m.", "Jis yra | — | — | kitame | skrydyje. | Jis | nusileidžia | — | 6 | val. vakaro.", "Jis atskris kitu reisu ir nusileis 6 val. vakaro.",
        { say: "It's on the next flight. It lands at six p.m.", flags: { 1: "“on”: no separate word; the locative kitame skrydyje carries it.", 7: "“at”: clock times take no preposition in Lithuanian." } }),
    ],
    // Description
    ask_describe: [
      t("Can | you | describe | your | bag?", "Ar galite | jūs | apibūdinti | savo | lagaminą?", "Ar galite apibūdinti savo lagaminą?"),
      t("What | does | your | bag | look like?", "Kaip | — | jūsų | lagaminas | atrodo?", "Kaip atrodo jūsų lagaminas?",
        { flags: { 1: "Question “does” has no Lithuanian word (linked to “look like”)." } }),
    ],
    ask_type: [
      t("Is | it | a | suitcase, | a | backpack | or | a | duffel | bag?", "Ar | tai | — | lagaminas, | — | kuprinė | ar | — | kelioninis | krepšys?", "Ar tai lagaminas, kuprinė, ar kelioninis krepšys?",
        { flags: { 0: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }),
    ],
    ask_color: [
      t("What | color | is | it?", "Kokios | spalvos | yra | {jis@X:nom}?", "Kokios {jis@X:nom} spalvos?"),
      t("And | what | color?", "O | kokios | spalvos?", "O kokios spalvos?"),
    ],
    ask_size: [
      t("What | size | is | it? | Small, | medium | or | large?", "Kokio | dydžio | yra | {jis@X:nom}? | Mažo, | vidutinio | ar | didelio?", "Kokio {jis@X:nom} dydžio? Mažo, vidutinio ar didelio?"),
      t("How | big | is | it?", "Kokio | dydžio | yra | {jis@X:nom}?", "Kokio {jis@X:nom} dydžio?"),
    ],
    ask_material: [t("Is | it | hard-shell | or | soft?", "Ar | jis | kietas | ar | minkštas?", "Ar jis kietas, ar minkštas?",
      { flags: { 0: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } })],
    ask_marks: [
      t("Any | ribbons, | stickers | or | name | tags | on | it?", "Kokių nors | kaspinų, | lipdukų | ar | vardo | žymų | ant | {jis@X:gen}?", "Ar ant {jis@X:gen} yra kokių nors kaspinų, lipdukų ar žymų su vardu?"),
      t("Does | it | have | anything | special | on | it?", "Ar | {jis@X:nom} | turi | ką nors | ypatingo | ant | savęs?", "Ar ant {jis@X:gen} yra kas nors ypatinga?",
        { flags: { 0: "Question “Does” = the particle ar." } }),
    ],
    ask_brand: [t("Do | you | know | the | brand?", "Ar | jūs | žinote | — | markę?", "Ar žinote, kokios markės?")],
    echo: [
      t("So, | {X.np}.", "Taigi, | {X.np:nom}.", "Taigi, {X.np:nom}."),
      t("Okay, | {X.np}. | Got it.", "Gerai, | {X.np:nom}. | Supratau.", "Gerai, {X.np:nom}. Supratau."),
    ],
    helpful: [
      t("Great, | that | helps | a lot.", "Puiku, | tai | padeda | labai.", "Puiku, tai labai padės."),
      t("Perfect, | that's | very | helpful.", "Puiku, | tai yra | labai | naudinga.", "Puiku, tai labai naudinga."),
    ],
    no_problem: [t("No | problem.", "Jokių | problemų.", "Nieko tokio.")],
    marks_what: [t("What's | on | it?", "Kas yra | ant | {jis@X:gen}?", "Kas ant {jis@X:gen} yra?")],
    brand_which: [t("Which | brand?", "Kokia | markė?", "Kokia markė?")],
    fix_ok: [t("Oh, | sorry. | Let | me | fix | that.", "O, | atsiprašau. | Leiskite | man | pataisyti | tai.", "O, atsiprašau, pataisysiu.")],
    // Contents
    ask_contents: [
      t("What's | in it, | roughly?", "Kas yra | {jis@X:loc}, | apytiksliai?", "Kas {jis@X:loc} yra, apytiksliai?"),
      t("Is | there | anything | valuable | in it?", "Ar | yra | ko nors | vertingo | {jis@X:loc}?", "Ar {jis@X:loc} yra ko nors vertingo?",
        { flags: { 0: "“Is” in the question = the particle ar; the existential yra is carried by “there”." } }),
    ],
    contents_ok: [t("Okay, | I'll note | that.", "Gerai, | užsirašysiu | tai.", "Gerai, užsirašysiu.")],
    contents_valuables: [
      t("I'll note | it. | Next | time, | keep | valuables | in | your | carry-on.", "Užsirašysiu | tai. | Kitą | kartą | laikykite | vertingus daiktus | — | savo | rankiniame bagaže.",
        "Užsirašysiu. Kitą kartą vertingus daiktus laikykite rankiniame bagaže.", { flags: { 6: "“in”: no separate word; the locative rankiniame bagaže carries it." } }),
    ],
    advice_valuables: [t("Next | time, | keep | valuables | in | your | carry-on.", "Kitą | kartą | laikykite | vertingus daiktus | — | savo | rankiniame bagaže.", "Kitą kartą vertingus daiktus laikykite rankiniame bagaže.",
      { flags: { 4: "“in”: no separate word; the locative rankiniame bagaže carries it." } })],
    advice_medicine: [t("And | if | you | need | your | medicine | tonight, | buy | some | at a pharmacy.", "O | jei | jums | reikia | jūsų | vaistų | šiąnakt, | nusipirkite | — | vaistinėje.", "O jei vaistų reikia šiąnakt, nusipirkite vaistinėje.",
      { flags: { 8: "Partitive “some”: no separate word; nusipirkite (vaistų) carries it." } })],
    contents_medicine: [
      t("If | you | need | it | tonight, | buy | some | at a pharmacy | and | keep | the | receipt.", "Jei | jums | reikia | jų | šiąnakt, | nusipirkite | — | vaistinėje | ir | pasilikite | — | čekį.",
        "Jei vaistų reikia šiąnakt, nusipirkite vaistinėje ir pasilikite čekį.", { flags: { 6: "Partitive “some”: no separate word; nusipirkite (vaistų) carries it." } }),
    ],
    // Delivery, hotel, phone
    ask_delivery: [
      t("We | can | deliver | it | to | your | hotel. | Would | you | like | that?", "Mes | galime | pristatyti | jį | į | jūsų | viešbutį. | Ar | jūs | norėtumėte | to?", "Galime pristatyti jį į jūsų viešbutį. Ar norėtumėte?",
        { flags: { 7: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte (linked to “like”)." } }),
      t("Would | you | like | us | to deliver | it | to | your | hotel?", "Ar | jūs | norėtumėte, kad | mes | pristatytume | jį | į | jūsų | viešbutį?", "Ar norėtumėte, kad pristatytume jį į jūsų viešbutį?",
        { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte (linked to “like”)." } }),
    ],
    delivery_ok: [
      t("Great. | We'll deliver | it | within | 24 | hours.", "Puiku. | Pristatysime | jį | per | 24 | valandas.", "Puiku. Pristatysime per 24 valandas.", { say: "Great. We'll deliver it within twenty-four hours." }),
      t("Perfect. | It | usually | takes | less | than | a | day.", "Puiku. | Tai | paprastai | užtrunka | mažiau | nei | — | dieną.", "Puiku. Paprastai tai užtrunka mažiau nei parą."),
    ],
    pickup_ok: [t("Okay, | you | can | collect | it | here, | at | this | desk.", "Gerai, | jūs | galite | atsiimti | jį | čia, | prie | šio | langelio.", "Gerai, galėsite atsiimti čia, prie šio langelio.")],
    ask_hotel: [
      t("Where | are | you | staying?", "Kur | — | jūs | apsistosite?", "Kur apsistosite?", { flags: { 1: "“are” (+ staying): no separate word; the future apsistosite carries it." } }),
      t("And | where | are | you | staying?", "O | kur | — | jūs | apsistosite?", "O kur apsistosite?", { flags: { 2: "“are” (+ staying): no separate word; the future apsistosite carries it." } }),
    ],
    ask_deliver_where: [
      t("Where | should | we | deliver | it?", "Kur | turėtume | mes | pristatyti | jį?", "Kur jį pristatyti?"),
    ],
    ask_phone: [
      t("What's | the | best | phone | number | to reach | you?", "Koks yra | — | geriausias | telefono | numeris | susisiekti | su jumis?", "Kokiu telefono numeriu galime su jumis susisiekti?"),
      t("And | a | phone | number, | please?", "Ir | — | telefono | numerį, | prašau?", "Ir telefono numerį, prašau."),
    ],
    phone_ok: [t("Got it, | thank | you.", "Supratau, | dėkoju | jums.", "Supratau, ačiū.")],
    phone_none_ok: [t("That's | okay. | We'll call | your | hotel.", "Tai yra | gerai. | Paskambinsime į | jūsų | viešbutį.", "Nieko tokio. Paskambinsime į viešbutį.")],
    // Overnight kit and reimbursement
    offer_kit: [
      t("Would | you | like | an | overnight | kit? | It | has | a | toothbrush, | toothpaste | and | a | T-shirt.", "Ar | jūs | norėtumėte | — | nakvynės | rinkinio? | Jame | yra | — | dantų šepetėlis, | dantų pasta | ir | — | marškinėliai.",
        "Ar norėtumėte nakvynės rinkinio? Jame yra dantų šepetėlis, dantų pasta ir marškinėliai.",
        { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte.", 6: "“It has”: Lithuanian says “in it there is” (jame yra)." } }),
    ],
    kit_here: [
      t("Here | you | are.", "Štai | jums | —.", "Prašom.", { flags: { 2: "“are” (here you are): no Lithuanian word; Štai jums hands it over." } }),
      t("There | you | go.", "Štai | jums | —.", "Prašom.", { flags: { 2: "“go” (there you go): no Lithuanian word; Štai jums hands it over." } }),
    ],
    buy_basics: [
      t("You | can | buy | basic | things | tonight.", "Jūs | galite | nusipirkti | būtiniausių | daiktų | šiąnakt.", "Šiąnakt galite nusipirkti būtiniausių daiktų."),
    ],
    receipts: [
      t("Keep | your | receipts, | and | we'll pay | you | back.", "Pasilikite | savo | čekius, | ir | grąžinsime pinigus | jums | —.", "Pasilikite čekius, ir mes grąžinsime jums pinigus.",
        { flags: { 6: "Discontinuous “pay … back”: “back” has no separate word; grąžinsime (pinigus) carries it." } }),
    ],
    // Reference number
    ref_a: [t("Here's | your | file | reference | number: | MHR-47219.", "Štai | jūsų | bylos | registracijos | numeris: | MHR-47219.", "Štai jūsų bylos numeris: MHR-47219.",
      { say: "Here's your file reference number: M H R, four seven two one nine.", write: "Baggage file: MHR-47219" })],
    ref_b: [t("Here's | your | file | reference | number: | MHR-58306.", "Štai | jūsų | bylos | registracijos | numeris: | MHR-58306.", "Štai jūsų bylos numeris: MHR-58306.",
      { say: "Here's your file reference number: M H R, five eight three oh six.", write: "Baggage file: MHR-58306" })],
    ref_track: [
      t("You | can | track | your | bag | online.", "Jūs | galite | sekti | savo | lagaminą | internetu.", "Lagaminą galite sekti internetu."),
      t("It's | on | this | copy | of | the | report.", "Jis yra | ant | šios | kopijos | — | — | pranešimo.", "Jis užrašytas ant šios pranešimo kopijos.",
        { flags: { 4: "“of”: no separate word; the genitive pranešimo carries it." } }),
    ],
    spell_a: [t("Sure: | M-H-R, | 4-7-2-1-9.", "Žinoma: | M-H-R, | 4-7-2-1-9.", "Žinoma: M-H-R, 4-7-2-1-9.", { say: "Sure. M, H, R. Four, seven, two, one, nine." })],
    spell_b: [t("Sure: | M-H-R, | 5-8-3-0-6.", "Žinoma: | M-H-R, | 5-8-3-0-6.", "Žinoma: M-H-R, 5-8-3-0-6.", { say: "Sure. M, H, R. Five, eight, three, oh, six." })],
    write_ref: [t("Sure, | it's | on | this | card.", "Žinoma, | jis yra | ant | šios | kortelės.", "Žinoma, jis užrašytas ant šios kortelės.")],
    ref_soon: [t("You'll get | it | in | a | minute.", "Gausite | jį | po | — | minutės.", "Gausite jį po minutės.")],
    // Closing
    anything_else: [
      t("Can | I | help | you | with | anything | else?", "Ar galiu | aš | padėti | jums | — | kuo nors | dar?", "Ar dar kuo nors galiu padėti?",
        { flags: { 4: "“with”: no separate word; the instrumental kuo nors carries it." } }),
      t("Anything | else | I | can | do | for you?", "Ką nors | dar | aš | galiu | padaryti | jums?", "Ar dar ką nors galiu dėl jūsų padaryti?"),
    ],
    closing: [
      t("Again, | I'm sorry | about | the | trouble.", "Dar kartą | apgailestauju | dėl | — | nepatogumų.", "Dar kartą atsiprašau dėl nepatogumų."),
      t("Have | a | good | evening!", "Linkiu | — | gero | vakaro!", "Gero vakaro!"),
    ],
    you_welcome: [t("You're welcome. | Have | a | good | evening!", "Prašom. | Linkiu | — | gero | vakaro!", "Prašom. Gero vakaro!")],
    // Answers to the learner's questions
    ans_when: [t("Usually | within | 24 | hours.", "Paprastai | per | 24 | valandas.", "Paprastai per 24 valandas.", { say: "Usually within twenty-four hours." })],
    ans_when_found: [t("Probably | tonight. | The | flight | lands | at | 6.", "Tikriausiai | šįvakar. | — | Skrydis | nusileidžia | — | 6 val.", "Tikriausiai šįvakar – skrydis nusileidžia 6 val.",
      { say: "Probably tonight. The flight lands at six.", flags: { 5: "“at”: clock times take no preposition in Lithuanian." } })],
    ans_call: [t("Yes, | we'll call | or | text | you | when | it | arrives.", "Taip, | paskambinsime | arba | parašysime | jums, | kai | jis | atkeliaus.", "Taip, paskambinsime arba parašysime, kai jis atkeliaus.")],
    ans_track: [t("Yes, | online, | with | your | reference | number.", "Taip, | internetu, | su | jūsų | registracijos | numeriu.", "Taip, internetu, pagal registracijos numerį.")],
    ans_free: [t("Yes, | the | delivery | is | free.", "Taip, | — | pristatymas | yra | nemokamas.", "Taip, pristatymas nemokamas.")],
    ans_what_if: [t("Don't worry. | Almost | all | bags | are | found | within | a | few | days.", "Nesijaudinkite. | Beveik | visi | lagaminai | yra | randami | per | — | kelias | dienas.", "Nesijaudinkite. Beveik visi lagaminai atsiranda per kelias dienas.")],
    ans_copy: [t("Sure, | you'll get | a | copy | of | the | report.", "Žinoma, | gausite | — | kopiją | — | — | pranešimo.", "Žinoma, gausite pranešimo kopiją.",
      { flags: { 4: "“of”: no separate word; the genitive pranešimo carries it." } })],
    ans_taxi: [t("The | taxi | stand | is | right | outside, | on the left.", "— | Taksi | stotelė | yra | iškart | lauke, | kairėje.", "Taksi stotelė – iškart už durų, kairėje.")],
    ans_shop: [t("There's | a | shop | near | the | exit.", "Yra | — | parduotuvė | prie | — | išėjimo.", "Prie išėjimo yra parduotuvė.")],
  },

  domains: {},

  hints: {
    problem: {
      lt: "Pasakyti, kad neatvyko lagaminas",
      items: [
        { id: "pr_didnt", s: t("My | bag | didn't arrive.", "Mano | lagaminas | neatvyko.", "Mano lagaminas neatvyko.") },
        { id: "pr_didnt", s: t("My | suitcase | didn't come | out.", "Mano | lagaminas | neatkeliavo | —.", "Mano lagaminas neatkeliavo.",
          { flags: { 3: "“out”: no separate word; neatkeliavo (did not come) already covers coming out onto the belt." } }) },
        { id: "pr_cant_find", s: t("I | can't find | my | luggage.", "Aš | nerandu | savo | bagažo.", "Nerandu savo bagažo.") },
        { id: "pr_lost", s: t("I | think | my | bag | is | lost.", "Aš | manau, | mano | lagaminas | yra | dingęs.", "Manau, mano lagaminas dingo.") },
        { id: "pr_report", s: t("I'd like | to report | a | missing | bag.", "Norėčiau | pranešti apie | — | dingusį | lagaminą.", "Norėčiau pranešti apie dingusį lagaminą.") },
      ],
    },
    flight: {
      lt: "Pasakyti skrydį", slot: "city", examples: ["new_york", "frankfurt", "chicago", "london"],
      items: [
        { id: "f_short", s: t("Flight | 482.", "Skrydis | 482.", "Skrydis 482.", { say: "Flight four eight two." }) },
        { id: "f_num", s: t("It | was | flight | 482 | from | {X}.", "Tai | buvo | skrydis | 482 | iš | {X:gen}.", "Skridau skrydžiu 482 iš {X:gen}.", { say: "It was flight four eight two from {X}." }) },
        { id: "f_dunno", s: t("I | don't remember | the | flight | number.", "Aš | neprisimenu | — | skrydžio | numerio.", "Neprisimenu skrydžio numerio.") },
        { id: "f_from", s: t("I | flew | in | from | {X}.", "Aš | atskridau | — | iš | {X:gen}.", "Atskridau iš {X:gen}.", { flags: { 2: "“in”: no separate word; the prefix at- of atskridau carries it." } }) },
        { id: "f_conn", s: t("I | had | a | connection | in {X}.", "Aš | turėjau | — | persėdimą | {X:loc}.", "Persėdau {X:loc}.") },
      ],
    },
    // "That's okay. From which city?"
    from: {
      lt: "Pasakyti, iš kokio miesto skridai", slot: "city", examples: ["new_york", "frankfurt", "chicago", "london"],
      items: [
        { id: "f_from_city", s: t("From | {X}.", "Iš | {X:gen}.", "Iš {X:gen}.") },
        { id: "f_from", s: t("I | flew | in | from | {X}.", "Aš | atskridau | — | iš | {X:gen}.", "Atskridau iš {X:gen}.", { flags: { 2: "“in”: no separate word; the prefix at- of atskridau carries it." } }) },
      ],
    },
    // "Did you have a connection?"
    connection: {
      lt: "Pasakyti, ar persėdai", slot: "city", examples: ["new_york", "frankfurt", "chicago", "london"],
      items: [
        { id: "cn_in", s: t("Yes, | in {X}.", "Taip, | {X:loc}.", "Taip, {X:loc}.") },
        { id: "cn_direct", s: t("No, | it | was | a | direct | flight.", "Ne, | tai | buvo | — | tiesioginis | skrydis.", "Ne, skrydis buvo tiesioginis.") },
        { id: "f_conn", s: t("I | had | a | connection | in {X}.", "Aš | turėjau | — | persėdimą | {X:loc}.", "Persėdau {X:loc}.") },
      ],
    },
    tag: {
      lt: "Parodyti bagažo žymą",
      items: [
        { id: "t_here", s: t("Here | it | is.", "Štai | ji | —.", "Štai ji.", { flags: { 2: "“is”: no copula after štai (štai ji = here it is)." } }) },
        { id: "t_on_bp", s: t("It's | on | my | boarding | pass.", "Ji yra | ant | mano | įlaipinimo | kortelės.", "Ji ant mano įlaipinimo kortelės.") },
        { id: "t_heres", s: t("Here's | my | boarding | pass.", "Štai | mano | įlaipinimo | kortelė.", "Štai mano įlaipinimo kortelė.") },
        { id: "t_lost", s: t("I | think | I | lost | it.", "Aš | manau, | aš | pamečiau | ją.", "Manau, ją pamečiau.") },
      ],
    },
    describe: {
      lt: "Apibūdinti lagaminą", slot: "color", examples: ["blue", "black", "red", "gray", "green"],
      items: [
        { id: "d_its", s: t("It's | a | large | {X} | suitcase.", "Tai yra | — | didelis | {X:nom} | lagaminas.", "Tai didelis {X:nom} lagaminas.") },
        { id: "d_color", s: t("It's | {X}.", "Jis yra | {X:nom}.", "Jis {X:nom}.") },
        { id: "d_its", s: t("It's | a | hard-shell | suitcase | with | wheels.", "Tai yra | — | kietas | lagaminas | su | ratukais.", "Tai kietas lagaminas su ratukais.") },
        { id: "d_its", s: t("It's | a | black | backpack.", "Tai yra | — | juoda | kuprinė.", "Tai juoda kuprinė.") },
        { id: "d_has", s: t("It | has | a | red | stripe | on | the | side.", "Jis | turi | — | raudoną | juostelę | — | — | šone.", "Jis turi raudoną juostelę šone.",
          { flags: { 5: "“on”: no separate word; the locative šone carries it." } }) },
        { id: "d_there", s: t("There's | a | yellow | ribbon | on | the | handle.", "Yra | — | geltonas | kaspinas | ant | — | rankenos.", "Ant rankenos yra geltonas kaspinas.") },
      ],
    },
    // "What color is it?"
    color: {
      lt: "Pasakyti spalvą", slot: "color", examples: ["black", "blue", "red", "gray", "green"],
      items: [
        { id: "d_color", s: t("It's | {X}.", "Jis yra | {X:nom}.", "Jis {X:nom}.") },
        { id: "c_short", s: t("{X}.", "{X:nom}.", "{X:nom}.") },
      ],
    },
    bagtype: {
      lt: "Pasakyti, koks tai krepšys", slot: "bagtype", examples: ["suitcase", "backpack", "duffel"],
      items: [
        { id: "tp_its", s: t("It's | a | {X}.", "Tai yra | — | {X:nom}.", "Tai {X:nom}.") },
        { id: "tp_short", s: t("A | {X}.", "— | {X:nom}.", "Tai {X:nom}.") },
      ],
    },
    size: {
      lt: "Pasakyti dydį", slot: "size", examples: ["large", "medium", "small"],
      items: [
        { id: "sz_its", s: t("It's | {X}.", "Jis yra | {X:nom}.", "Jis {X:nom}.") },
        { id: "sz_short", s: t("{X}.", "{X:nom}.", "{X:nom}."), note: "Užtenka ir vieno žodžio: „Large.“" },
      ],
    },
    material: {
      lt: "Pasakyti, ar kietas, ar minkštas", slot: "material", examples: ["hard", "soft", "leather"],
      items: [
        { id: "mt_its", s: t("It's | {X}.", "Jis yra | {X:nom}.", "Jis {X:nom}.") },
        { id: "mt_short", s: t("{X}.", "{X:nom}.", "{X:nom}.") },
      ],
    },
    marks: {
      lt: "Pasakyti, ar yra žymių",
      items: [
        { id: "d_has", s: t("It | has | a | name | tag.", "Jis | turi | — | vardo | žymą.", "Ant jo yra žyma su vardu.") },
        { id: "d_there", s: t("There's | a | yellow | ribbon | on | the | handle.", "Yra | — | geltonas | kaspinas | ant | — | rankenos.", "Ant rankenos yra geltonas kaspinas.") },
        { id: "m_none", s: t("No, | nothing | special.", "Ne, | nieko | ypatingo.", "Ne, nieko ypatingo.") },
      ],
    },
    brand: {
      lt: "Pasakyti markę",
      items: [
        { id: "b_its", s: t("It's | a | Samsonite.", "Tai yra | — | „Samsonite“.", "Tai „Samsonite“.") },
        { id: "b_dunno", s: t("I'm | not | sure.", "Aš | nesu | {m:tikras|f:tikra}.", "Nesu {m:tikras|f:tikra}.", { flags: { 1: "“not” + the copula of “I'm”: Lithuanian negates the verb itself (nesu)." } }) },
      ],
    },
    contents: {
      lt: "Pasakyti, kas lagamine",
      items: [
        { id: "c_clothes", s: t("Just | clothes | and | shoes.", "Tik | drabužiai | ir | batai.", "Tik drabužiai ir batai.") },
        { id: "c_in", s: t("There | are | some | gifts | in it.", "— | Yra | — | dovanų | jame.", "Jame yra dovanų.",
          { flags: { 0: "Existential “There”: no Lithuanian word; yra carries it.", 2: "Partitive: the genitive dovanų carries “some”." } }) },
        { id: "c_med", s: t("My | medicine | is | in it.", "Mano | vaistai | yra | jame.", "Jame mano vaistai.") },
        { id: "c_nothing", s: t("Nothing | valuable.", "Nieko | vertingo.", "Nieko vertingo.") },
      ],
    },
    delivery: {
      lt: "Atsiimti pačiam arba paklausti",
      items: [
        { id: "dl_pickup", s: t("I'll pick | it | up | here.", "Atsiimsiu | jį | — | čia.", "Atsiimsiu čia.", { flags: { 2: "Discontinuous “pick … up”: the prefix at- of atsiimsiu carries “up”." } }) },
        { id: "q_when", s: t("When | will | I | get | it?", "Kada | — | aš | gausiu | jį?", "Kada jį gausiu?", { flags: { 1: "“will”: no separate word; the future ending of gausiu carries it." } }) },
        { id: "dl_deliver", s: t("Could | you | deliver | it | to | my | hotel?", "Ar galėtumėte | jūs | pristatyti | jį | į | mano | viešbutį?", "Ar galėtumėte pristatyti jį į mano viešbutį?") },
        { id: "dl_yes", s: t("Yes, | please | deliver | it.", "Taip, | prašau | pristatyti | jį.", "Taip, prašau pristatyti.") },
        { id: "q_free", s: t("Is | the | delivery | free?", "Ar | — | pristatymas | nemokamas?", "Ar pristatymas nemokamas?",
          { flags: { 0: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }) },
      ],
    },
    hotel: {
      lt: "Pasakyti, kur apsistosi",
      items: [
        { id: "h_hotel", s: t("I'm staying | at | the | Harborview | Hotel.", "Apsistosiu | — | — | „Harborview“ | viešbutyje.", "Apsistosiu „Harborview“ viešbutyje.",
          { flags: { 1: "“at”: no separate word; the locative viešbutyje carries it." } }) },
        { id: "h_at", s: t("At | the | Harborview | Hotel.", "— | — | „Harborview“ | viešbutyje.", "„Harborview“ viešbutyje.",
          { flags: { 0: "“At”: no separate word; the locative viešbutyje carries it." } }) },
      ],
    },
    phone: {
      lt: "Pasakyti telefono numerį",
      items: [
        { id: "ph_mine", s: t("My | number | is | +370 | 612 | 34567.", "Mano | numeris | yra | +370 | 612 | 34567.", "Mano numeris +370 612 34567.",
          { say: "My number is plus three seven zero, six one two, three four five six seven." }) },
        { id: "ph_its", s: t("It's | 555 | 0142.", "Tai yra | 555 | 0142.", "Numeris 555 0142.", { say: "It's five five five, oh one four two." }) },
        { id: "ph_none", s: t("I | don't have | a | US | number.", "Aš | neturiu | — | JAV | numerio.", "Neturiu JAV telefono numerio.") },
      ],
    },
    ask: {
      lt: "Paklausti apie lagaminą",
      items: [
        { id: "q_when", s: t("When | will | I | get | it?", "Kada | — | aš | gausiu | jį?", "Kada jį gausiu?", { flags: { 1: "“will”: no separate word; the future ending of gausiu carries it." } }) },
        { id: "q_meantime", s: t("What | should | I | do | in the meantime?", "Ką | turėčiau | aš | daryti | kol kas?", "Ką man daryti kol kas?") },
        { id: "q_reimburse", s: t("Will | you | pay | for | a | toothbrush | and | clothes?", "Ar | jūs | apmokėsite | — | — | dantų šepetėlį | ir | drabužius?", "Ar apmokėsite dantų šepetėlį ir drabužius?",
          { flags: { 0: "“Will” in a yes/no question = the particle ar; the future sits on apmokėsite (linked to “pay”).", 3: "“for”: no separate word; apmokėti takes a direct object (accusative)." } }) },
        { id: "q_call", s: t("Will | you | call | me?", "Ar | jūs | paskambinsite | man?", "Ar man paskambinsite?",
          { flags: { 0: "“Will” in a yes/no question = the particle ar; the future sits on paskambinsite (linked to “call”)." } }) },
        { id: "q_track", s: t("Can | I | track | it | online?", "Ar galiu | aš | sekti | jį | internetu?", "Ar galiu sekti jį internetu?") },
        { id: "q_what_if", s: t("What | if | you | can't find | it?", "O | jei | jūs | nerasite | jo?", "O jei jo nerasite?") },
        { id: "q_copy", s: t("Could | I | get | a | copy?", "Ar galėčiau | aš | gauti | — | kopiją?", "Ar galėčiau gauti kopiją?") },
      ],
    },
    // The reference number: spell it or write it down
    spell_write: {
      lt: "Paprašyti paraidžiui ar užrašyti",
      items: [
        { id: "c_spell", s: t("How | do | you | spell | that?", "Kaip | — | {j:jūs|t:tu} | {j:rašote|t:rašai} | tai?", "Kaip tai rašoma?", { flags: { 1: "Question “do” has no Lithuanian word; the tense sits on the verb (linked to “spell”)." } }) },
        { id: "c_write", s: t("Could | you | write | it | down, | please?", "Ar {j:galėtumėte|t:galėtum} | {j:jūs|t:tu} | užrašyti | tai | —, | prašau?", "Ar {j:galėtumėte|t:galėtum} užrašyti?", { flags: { 4: "Discontinuous “write … down”: the prefix už- of užrašyti carries “down” (linked to “write”)." } }) },
      ],
    },
    kit: {
      lt: "Paklausti apie būtiniausius daiktus",
      items: [
        { id: "q_meantime", s: t("What | should | I | do | in the meantime?", "Ką | turėčiau | aš | daryti | kol kas?", "Ką man daryti kol kas?") },
        { id: "q_reimburse", s: t("Will | you | pay | for | a | toothbrush | and | clothes?", "Ar | jūs | apmokėsite | — | — | dantų šepetėlį | ir | drabužius?", "Ar apmokėsite dantų šepetėlį ir drabužius?",
          { flags: { 0: "“Will” in a yes/no question = the particle ar; the future sits on apmokėsite (linked to “pay”).", 3: "“for”: no separate word; apmokėti takes a direct object (accusative)." } }) },
      ],
    },
  },

  tips: {
    uk_taxi_rank: { key: "uk_taxi_rank", lt: "Suprasta! Amerikoje sakoma „taxi stand“.", better: "Where's the taxi stand?" },
  },

  merges: {
    "let's see": { reason: "lexical_expression", split: "Let's → leiskime + see → matyti is a calque; the suggestion = pažiūrėkime (one verb form).", minimal: "Two words, one verb form." },
    "let's file": { reason: "grammatical_fusion", split: "Let's → leiskime + file → registruoti; Lithuanian expresses “let us” with the 1st person plural imperative ending (užregistruokime).", minimal: "The object stays outside." },
    "a lot": { reason: "lexical_expression", split: "a → — + lot → partija/daug gives a false noun reading; the intensifier “a lot” = labai.", minimal: "Two words, one adverb." },
    "look like": { reason: "lexical_expression", split: "look → žiūrėti + like → kaip/patinka is false; “look like” (appearance) = atrodyti.", minimal: "Two words." },
    "in the meantime": { reason: "lexical_expression", split: "in → į + the → — + meantime → tarpinis laikas is false; = kol kas / tuo tarpu.", minimal: "Three words, one adverbial." },
  },

  // -------------------------------------------------------------------------

  // The learner's plan: report the bag, identify the flight, describe the bag, arrange delivery, leave contacts.
  mission: [
    { step: "problem", lt: "Pasakyk, kad neatvyko lagaminas" },
    { lt: "Pasakyk, kokiu skrydžiu skridai", done: (c) => !!c.s.flight && !stepOpen(c, "connection") },
    { step: "tag", lt: "Parodyk bagažo žymą", optional: true },
    { lt: "Apibūdink lagaminą", optional: true, when: (c) => !c.s.found, done: (c) => !c.s.found && !DESCRIBE.some((id) => stepOpen(c, id)) },
    { step: "delivery", lt: "Susitark dėl pristatymo" },
    { lt: "Nurodyk viešbutį ir telefoną", done: (c) => !!c.s.hotel && !!c.s.phone },
    { lt: "Gauk bylos numerį", done: (c) => !!c.s.refGiven },
  ],

  steps: [
    { id: "problem", done: (c) => !!c.s.problem,
      ask: (c) => c.say(c.s.greeted ? "ask_help" : "greet"),
      expects: ["problem", "need_help"],
      suggest: [{ lt: "Pasakyti, kad neatvyko lagaminas", hint: "problem" }],
      yes: (c) => { c.s.problem = true; c.say("sorry_bag"); },
      help: (c) => { c.say("problem_help"); } },
    { id: "flight", done: (c) => !!c.s.flight,
      ask: (c) => c.say(c.s.askFrom ? "ask_from" : "ask_flight"),
      expects: ["flight", "flight_num_ctx", "dunno_ctx"],
      suggest: [{ lt: "Pasakyti skrydžio numerį", hint: "flight", options: "city" }],
      help: (c) => { c.say("flight_help"); } },
    { id: "connection", when: (c) => c.s.askConnection && !c.s.via && c.s.via !== null, done: (c) => c.s.via !== undefined,
      ask: (c) => c.say("ask_connection"),
      expects: ["flight", "no_connection", "via_ctx"],
      suggest: [{ lt: "Pasakyti, ar persėdai (ir kur)", hint: "connection", options: "city" }],
      yes: (c) => { c.s.via = "yes"; ack(c, 0.7); },
      no: (c) => { c.s.via = null; ack(c, 0.7); } },
    { id: "tag", when: (c) => c.s.askTag, done: (c) => c.s.tag !== undefined,
      ask: (c) => c.say("ask_tag"),
      expects: ["hand_over", "tag_lost"],
      suggest: [{ lt: "Parodyti bagažo žymą", hint: "tag" }],
      yes: (c) => { c.s.tag = true; c.say("tag_thanks"); },
      no: (c) => { c.s.tag = false; c.say("tag_none"); } },
    { id: "lookup", done: (c) => !!c.s.looked,
      ask: (c) => {
        c.s.looked = true;
        c.say("checking");
        if (c.s.foundTwist) {
          c.s.found = true;
          c.twist("found_it");
          c.say("found_it");
          const city = c.s.viaCity ?? c.s.fromCity;
          if (city && city !== "vilnius") c.say("still_in", { X: city });
          c.say("next_flight");
        } else c.say("not_in_system");
        askNext(c);
      } },
    { id: "describe", when: (c) => !c.s.found, done: (c) => !!c.s.type || !!c.s.color,
      ask: (c) => c.say("ask_describe"),
      expects: ["describe", "describe_fix", "color_ctx", "type_ctx", "size_ctx", "material_ctx", "brand", "marks_none"],
      suggest: [
        { lt: "Apibūdinti lagaminą: spalva, dydis, rūšis", hint: "describe", options: "color" },
        { lt: "Pasirinkti rūšį", hint: "bagtype", options: "bagtype" },
      ],
      help: (c) => { c.say("ask_type"); } },
    { id: "type", when: (c) => !c.s.found, done: (c) => !!c.s.type && c.s.type !== "bag",
      ask: (c) => c.say("ask_type"),
      expects: ["describe", "type_ctx", "describe_fix"],
      suggest: [{ lt: "Pasakyti, ar tai lagaminas, kuprinė ar krepšys", hint: "bagtype", options: "bagtype" }] },
    { id: "color", when: (c) => !c.s.found, done: (c) => !!c.s.color,
      ask: (c) => c.say("ask_color", { X: binding(c) }),
      expects: ["describe", "color_ctx", "describe_fix"],
      suggest: [{ lt: "Pasakyti spalvą", hint: "color", options: "color" }] },
    { id: "size", when: (c) => !c.s.found && c.s.askSize && c.s.type !== "backpack", done: (c) => !!c.s.size,
      ask: (c) => c.say("ask_size", { X: binding(c) }),
      expects: ["describe", "size_ctx"],
      suggest: [{ lt: "Pasakyti dydį", hint: "size", options: "size" }] },
    { id: "material", when: (c) => !c.s.found && c.s.askMaterial && c.s.type === "suitcase", done: (c) => !!c.s.material,
      ask: (c) => c.say("ask_material"),
      expects: ["describe", "material_ctx"],
      suggest: [{ lt: "Pasakyti, ar kietas, ar minkštas", hint: "material", options: "material" }] },
    { id: "marks", when: (c) => !c.s.found && c.s.askMarks, done: (c) => c.s.marks !== undefined,
      ask: (c) => c.say("ask_marks", { X: binding(c) }),
      expects: ["describe", "marks_none", "marks_ctx"],
      suggest: [{ lt: "Pasakyti, ar yra žymių (juostelė, kaspinas, žyma su vardu)", hint: "marks" }],
      yes: (c) => { c.s.marks = c.s.marks ?? []; c.say("marks_what", { X: binding(c) }); c.hold(); },
      no: (c) => { c.s.marks = []; c.say("no_problem"); } },
    { id: "brand", when: (c) => !c.s.found && c.s.askBrand, done: (c) => c.s.brand !== undefined,
      ask: (c) => c.say("ask_brand"),
      expects: ["brand", "dunno_ctx"],
      suggest: [{ lt: "Pasakyti markę (arba kad nežinai)", hint: "brand" }],
      yes: (c) => { c.s.brand = "unknown"; c.say("brand_which"); c.hold(); },
      no: (c) => { c.s.brand = "none"; c.say("no_problem"); } },
    { id: "contents", when: (c) => !c.s.found && c.s.askContents, done: (c) => c.s.contents !== undefined,
      ask: (c) => { c.s.contentsQ = c.chance(0.5) ? "what" : "valuable"; c.say("ask_contents", { X: binding(c) }); },
      expects: ["contents"],
      suggest: [{ lt: "Pasakyti, kas lagamine", hint: "contents" }],
      yes: (c) => { c.s.contents = "valuable"; c.say("contents_valuables"); },
      no: (c) => { c.s.contents = "nothing"; c.say("contents_ok"); } },
    { id: "delivery", done: (c) => !!c.s.delivery,
      ask: (c) => c.say("ask_delivery"),
      expects: ["delivery", "pickup"],
      suggest: [{ lt: "Sutikti, kad pristatytų į viešbutį", hint: "g_yesno" }, { lt: "Atsiimti pačiam arba paklausti", hint: "delivery" }],
      yes: (c) => { c.s.delivery = "deliver"; once(c, "dl", "delivery_ok"); turn(c).said_when = true; },
      no: (c) => { c.s.delivery = "pickup"; c.say("pickup_ok"); } },
    { id: "hotel", done: (c) => !!c.s.hotel,
      ask: (c) => c.say(c.s.delivery === "deliver" && c.chance(0.5) ? "ask_deliver_where" : "ask_hotel"),
      expects: ["stay"],
      suggest: [{ lt: "Pasakyti, kur apsistosi", hint: "hotel" }] },
    { id: "phone", done: (c) => !!c.s.phone,
      ask: (c) => c.say("ask_phone"),
      expects: ["phone", "phone_ctx", "phone_none"],
      suggest: [{ lt: "Pasakyti telefono numerį", hint: "phone" }] },
    { id: "kit", when: (c) => c.s.offerKit && !c.s.kitDone, done: (c) => !!c.s.kitDone,
      ask: (c) => c.say("offer_kit"),
      expects: ["q_reimburse", "q_meantime", "kit_yes_ctx", "kit_no_ctx"],
      suggest: [{ lt: "Priimti rinkinį (taip / ne)", hint: "g_yesno" }, { lt: "Paklausti apie išlaidas", hint: "kit" }],
      yes: (c) => { c.s.kitDone = true; c.say("kit_here"); c.event("give", { item: "overnight kit" }); },
      no: (c) => { c.s.kitDone = true; c.say("no_problem"); } },
    { id: "ref", done: (c) => !!c.s.refAck,
      ask: (c) => {
        if (!c.s.refGiven) { c.s.refGiven = true; c.complete(); c.say(c.s.ref === "a" ? "ref_a" : "ref_b"); c.event("give", { item: "baggage report", text: REFS[c.s.ref].write }); }
        c.say("ref_track");
        c.expect(refPending());
      },
      suggest: [{ lt: "Padėkoti", hint: "g_social" }, { lt: "Paprašyti paraidžiui ar užrašyti", hint: "spell_write" }] },
  ],

  init: (c) => {
    c.s.askConnection = c.chance(0.35);
    c.s.askTag = c.chance(0.75);
    c.s.foundTwist = c.visits >= 1 && c.chance(0.45);
    c.s.askSize = c.chance(0.6);
    c.s.askMaterial = c.chance(0.4);
    c.s.askMarks = c.chance(0.7);
    c.s.askBrand = c.chance(0.35);
    c.s.askContents = c.chance(0.4);
    c.s.offerKit = c.chance(0.55);
    c.s.ref = c.chance(0.5) ? "a" : "b";
  },

  start: (c) => {
    c.say("greet");
    c.s.greeted = true;
    c.hold();
  },

  handlers: {
    problem(c) {
      if (c.s.problem) { ack(c, 1); return; }
      c.s.problem = true;
      once(c, "sorry", "sorry_bag");
    },
    need_help(c) { if (!c.s.problem) c.say("what_happened"); else c.say("ack"); c.hold(); },
    flight(c, slots) {
      if (slots.city) c.s.fromCity = slots.city;
      if (slots.via) { c.s.viaCity = slots.via; c.s.via = "yes"; }
      if (slots.fnum || slots.city || slots.via) c.s.flight = true;
      ack(c, 0.5);
    },
    flight_num_ctx(c) { c.s.flight = true; ack(c, 0.6); },
    city_ctx(c, slots) { if (slots.city) { c.s.fromCity = slots.city; c.s.flight = true; } ack(c, 0.6); },
    no_connection(c, slots) { if (slots.city && !c.s.fromCity) c.s.fromCity = slots.city; c.s.via = null; ack(c, 0.7); },
    via_ctx(c, slots) { if (slots.via) { c.s.viaCity = slots.via; c.s.via = "yes"; } ack(c, 0.7); },
    dunno_ctx(c) {
      if (c.step === "flight") {
        c.s.askFrom = true;
        if (c.s.askFromDone) { c.s.flight = true; c.say("no_problem"); } else { c.s.askFromDone = true; c.say("ask_from"); c.expect(fromPending()); }
        return;
      }
      if (c.step === "brand") { c.s.brand = "unknown"; c.say("no_problem"); return; }
      c.say("no_problem");
    },
    hand_over(c) {
      if (c.step === "tag" || (!c.s.tag && c.s.askTag)) { c.s.tag = true; once(c, "tag", "tag_thanks"); return; }
      c.say("thank_you");
    },
    tag_lost(c) { c.s.tag = false; c.say("tag_none"); },
    describe(c, slots, seg) { takeDescription(c, slots, seg); echoDescription(c); },
    color_ctx(c, slots, seg) { takeDescription(c, slots, seg); echoDescription(c); },
    type_ctx(c, slots, seg) { takeDescription(c, slots, seg); echoDescription(c); },
    size_ctx(c, slots, seg) {
      // "about 70 centimeters" / "28 inches": turn a measurement into a size
      if (!slots.size && typeof slots.cm === "number") slots.size = slots.cm >= 70 ? "large" : slots.cm >= 55 ? "medium" : "small";
      if (!slots.size && typeof slots.inch === "number") slots.size = slots.inch >= 27 ? "large" : slots.inch >= 22 ? "medium" : "small";
      takeDescription(c, slots, seg); echoDescription(c);
    },
    material_ctx(c, slots, seg) { takeDescription(c, slots, seg); echoDescription(c); },
    describe_fix(c, slots) {
      if (slots.wrong && (c.s.type === slots.wrong || c.s.color === slots.wrong)) {
        if (c.s.type === slots.wrong) c.s.type = undefined;
        if (c.s.color === slots.wrong) c.s.color = undefined;
        c.s.echoedOnce = false;
      }
      if (slots.bagtype) c.s.type = slots.bagtype;
      if (slots.color) c.s.color = slots.color;
      once(c, "fix", "fix_ok");
      if (c.s.type && c.s.color && c.s.type !== "bag") { c.s.echoedOnce = true; c.say("echo", { X: { id: c.s.type, mods: [c.s.size, c.s.color].filter(Boolean) } }); }
    },
    marks_ctx(c, slots, seg) { takeDescription(c, slots, seg); echoDescription(c); },
    marks_none(c) { c.s.marks = c.s.marks?.length ? c.s.marks : []; once(c, "np", "no_problem"); },
    brand(c, slots) { c.s.brand = slots.brand; ack(c, 0.6); },
    contents(c, slots, seg) {
      // A list may arrive split into several segments: speak once, then only add advice if a later part needs it.
      const tags = allTags(slots, seg);
      const level = tags.includes("valuable:med") ? 3 : tags.includes("valuable:yes") ? 2 : 1;
      const T = turn(c);
      c.s.contents = level === 3 ? "medicine" : level === 2 ? "valuable" : (pickFirst(slots, "content") ? "items" : "nothing");
      if (!T.contSaid) { T.contSaid = level; c.say(level === 3 ? "contents_medicine" : level === 2 ? "contents_valuables" : "contents_ok"); return; }
      if (level > T.contSaid) { T.contSaid = level; c.say(level === 3 ? "advice_medicine" : "advice_valuables"); }
    },
    delivery(c, slots) {
      c.s.delivery = "deliver";
      if (slots.hotel) c.s.hotel = slots.hotel;
      if (turn(c).said_when) once(c, "dl", "ack"); else { once(c, "dl", "delivery_ok"); turn(c).said_when = true; }
    },
    pickup(c) { c.s.delivery = "pickup"; once(c, "dl", "pickup_ok"); },
    stay(c, slots, seg) { c.s.hotel = slots.hotel ?? (seg.tags.includes("fam") ? "friend" : "address"); ack(c, 0.6); },
    phone(c) { c.s.phone = true; once(c, "ph", "phone_ok"); },
    phone_ctx(c) { c.s.phone = true; once(c, "ph", "phone_ok"); },
    phone_none(c) { c.s.phone = "none"; once(c, "ph", "phone_none_ok"); },
    q_when(c) { once(c, "when", c.s.found ? "ans_when_found" : "ans_when"); },
    q_meantime(c) {
      c.s.kitDone = true;
      if (!c.s.kitGiven) { c.s.kitGiven = true; c.say("offer_kit"); c.expect(kitPending()); return; }
      c.say("buy_basics"); c.say("receipts");
    },
    q_reimburse(c) { if (c.step === "kit") c.s.kitDone = true; c.say("buy_basics"); c.say("receipts"); },
    kit_yes_ctx(c) { c.s.kitDone = true; c.say("kit_here"); c.event("give", { item: "overnight kit" }); },
    kit_no_ctx(c) { c.s.kitDone = true; c.say("no_problem"); },
    q_call(c) { c.say("ans_call"); },
    q_track(c) { c.say("ans_track"); },
    q_free(c) { c.say("ans_free"); },
    q_what_if(c) { c.say("ans_what_if"); },
    q_copy(c) { c.say("ans_copy"); },
    q_taxi(c) { c.say("ans_taxi"); },
    q_shop(c) { c.say("ans_shop"); },
    q_ref(c) { if (c.s.refGiven) c.say(c.s.ref === "a" ? "ref_a" : "ref_b"); else c.say("ref_soon"); },
    g_spell(c) {
      if (c.s.refGiven) { c.say(c.s.ref === "a" ? "spell_a" : "spell_b"); c.hold(); return; }
      GLOBAL_HANDLERS.g_spell(c as any, {});
    },
    g_write(c) {
      if (c.s.refGiven) {
        c.say("write_ref");
        (c as any).conv?.addNote?.({ en: REFS[c.s.ref].write });
        c.hold();
        return;
      }
      GLOBAL_HANDLERS.g_write(c as any, {});
    },
  },

  finish: (c) => {
    c.complete();
    c.say("anything_else");
    c.expect({
      id: "closing", hints: ["g_social", "ask"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "g_social" }, { lt: "Paklausti dar ko nors", hint: "ask" }],
      on: {
        g_thanks: (cc) => { once(cc, "close", "you_welcome"); cc.end(); },
        g_bye: (cc) => { once(cc, "close", "you_welcome"); cc.end(); },
      },
      no: (cc) => { cc.say("closing"); cc.end(); },
      yes: (cc) => { cc.say("what_happened"); cc.hold(); },
      ask: (cc) => cc.say("anything_else"),
    });
  },

  tests: [
    { say: "Hi, my bag didn't arrive.", intent: "problem" },
    { say: "My suitcase didn't come out.", intent: "problem" },
    { say: "I can't find my luggage.", intent: "problem" },
    { say: "I think my bag is lost.", intent: "problem" },
    { say: "I'd like to report a missing bag.", intent: "problem" },
    { say: "It was flight 482 from New York.", intent: "flight", slots: { city: "new_york" } },
    { say: "Flight 482.", intent: "flight", step: "flight" },
    { say: "Four eight two.", intent: "flight_num_ctx", step: "flight" },
    { say: "I flew in from Frankfurt via Chicago.", intent: "flight", slots: { city: "frankfurt", via: "chicago" } },
    { say: "I don't remember the flight number.", intent: "dunno_ctx", step: "flight" },
    { say: "No, it was a direct flight.", intent: "no_connection", step: "connection" },
    { say: "Here it is.", intent: "hand_over", step: "tag" },
    { say: "It's on my boarding pass.", intent: "hand_over", step: "tag" },
    { say: "I think I lost it.", intent: "tag_lost", step: "tag" },
    { say: "It's a large blue suitcase.", intent: "describe", slots: { np_desc: { size: "large", color: "blue", bagtype: "suitcase" } } },
    { say: "A black backpack.", intent: "describe", step: "describe" },
    { say: "It's dark blue with a red stripe on the side.", intent: "describe", step: "describe" },
    { say: "It's a gray hard-shell suitcase with wheels.", intent: "describe", step: "describe" },
    { say: "Blue.", intent: "color_ctx", step: "color", slots: { color: "blue" } },
    { say: "A suitcase.", intent: "type_ctx", step: "type", slots: { bagtype: "suitcase" } },
    { say: "Blue.", intent: "none" },
    { say: "Medium.", intent: "size_ctx", step: "size" },
    { say: "Hard-shell.", intent: "material_ctx", step: "material" },
    { say: "It has a name tag.", intent: "describe", step: "marks" },
    { say: "No, nothing special.", intent: "marks_none", step: "marks" },
    { say: "It's a Samsonite.", intent: "brand", step: "brand" },
    { say: "I'm not sure.", intent: "dunno_ctx", step: "brand" },
    { say: "Just clothes and shoes.", intent: "contents", step: "contents" },
    { say: "My medicine is in it.", intent: "contents", step: "contents" },
    { say: "Could you deliver it to my hotel?", intent: "delivery" },
    { say: "I'll pick it up here.", intent: "pickup" },
    { say: "I'm staying at the Harborview Hotel.", intent: "stay", step: "hotel" },
    { say: "My number is plus three seven zero six one two three four five six seven.", intent: "phone", step: "phone" },
    { say: "555 0142", intent: "phone_ctx", step: "phone" },
    { say: "I don't have a US number.", intent: "phone_none", step: "phone", not: ["phone"] },
    { say: "What should I do in the meantime?", intent: "q_meantime" },
    { say: "Will you pay for a toothbrush and clothes?", intent: "q_reimburse" },
    { say: "When will I get it?", intent: "q_when" },
    { say: "What if you can't find it?", intent: "q_what_if" },
    { say: "Could you spell that?", intent: "g_spell" },
    { say: "Could you write it down, please?", intent: "g_write" },
    { say: "My bag didn't arrive, it's a black backpack.", intent: "problem" },
    { say: "It's not a backpack, it's a suitcase.", intent: "describe_fix", step: "describe" },
    { say: "Yes, in New York.", intent: "via_ctx", step: "connection", slots: { via: "new_york" } },
    { say: "No, not red. Blue.", intent: "describe_fix", step: "color" },
    { say: "purple elephant airport dance", intent: "none" },
    { say: "My cat likes the moon", intent: "none" },
    // more ways to say it (dev corpus tests/corpus/s65b-baggage.json)
    { say: "My luggage never came out on the carousel.", intent: "problem" },
    { say: "I didn't receive my luggage.", intent: "problem" },
    { say: "Bag not arrived.", intent: "problem" },
    { say: "I'm missing a bag.", intent: "problem" },
    { say: "My flight was from Amsterdam.", intent: "flight", slots: { city: "amsterdam" } },
    { say: "BA 482", intent: "flight_num_ctx", step: "flight" },
    { say: "It's in my passport.", intent: "hand_over", step: "tag" },
    { say: "I didn't get a tag.", intent: "tag_lost", step: "tag" },
    { say: "Big, blue, hard plastic.", intent: "describe", step: "describe" },
    { say: "It's a hard one.", intent: "material_ctx", step: "material", slots: { material: "hard" } },
    { say: "It's about 70 centimeters.", intent: "size_ctx", step: "size" },
    { say: "A lot of stickers.", intent: "marks_ctx", step: "marks" },
    { say: "No ribbons, no stickers.", intent: "marks_none", step: "marks" },
    { say: "It's a cheap one, no brand.", intent: "dunno_ctx", step: "brand" },
    { say: "Some presents for my family.", intent: "contents", step: "contents" },
    { say: "I don't have anything valuable.", intent: "contents", step: "contents" },
    { say: "No, I'll collect it at the airport.", intent: "pickup", step: "delivery" },
    { say: "I'm at the Harborview, room 305.", intent: "stay", step: "hotel", slots: { hotel: "harborview" } },
    { say: "My phone doesn't work in America.", intent: "phone_none", step: "phone" },
    { say: "Yes, a toothbrush would be great.", intent: "kit_yes_ctx", step: "kit" },
    { say: "No, I have everything in my carry-on.", intent: "kit_no_ctx", step: "kit" },
    { say: "Yes, one stop in London.", intent: "via_ctx", step: "connection", slots: { via: "london" } },
    { say: "What was the number again?", intent: "q_ref" },
    // meaning must not flip
    { say: "No, don't deliver it.", intent: "pickup", not: ["delivery"] },
    { say: "No, I don't need a kit.", intent: "kit_no_ctx", step: "kit", not: ["kit_yes_ctx"] },
    { say: "No, I didn't change planes in Frankfurt.", intent: "no_connection", step: "connection", not: ["via_ctx"] },
    { say: "I don't know the hotel.", intent: "none", step: "hotel" },
    // more ways (played paths, 25 Sep 2026)
    { say: "A big one.", intent: "size_ctx", step: "describe", slots: { size: "large" } },
    { say: "Hard plastic.", intent: "material_ctx", step: "describe", slots: { material: "hard" } },
    { say: "It's a big black suitcase with wheels.", intent: "describe", step: "describe", not: ["size_ctx", "color_ctx"] },
    { say: "I have a Lithuanian number.", intent: "phone_none", step: "phone" },
    { say: "Will you pay for new clothes?", intent: "q_reimburse", step: "kit" },
  ],

  sims: [
    { name: "happy path: report, describe, deliver", turns: ["Hi, my bag didn't arrive.", "It was flight 482 from New York.", "Yes, here it is.", "It's a large blue suitcase with a red stripe on the side.", "Please deliver it to my hotel.", "At the Harborview Hotel.", "My number is 555 0142."],
      expect: { complete: true }, auto: BG_AUTO },
    { name: "short answers, side questions, spelling the reference", turns: ["I can't find my luggage.", "Flight 482.", "Blue.", "A suitcase.", "Please deliver it. When will I get it?", "Harborview.", "555 0142", "Could you spell that?", "Thanks, bye!"],
      expect: { complete: true }, auto: omit(BG_AUTO, ["flight", "describe", "type", "delivery", "hotel", "phone", "ref"]) },
    { name: "no tag, no number, pick up, spell the reference", turns: ["Hello. I think my bag is lost.", "I don't remember the flight number.", "From Frankfurt.", "I think I lost it.", "It's a black backpack.", "I'll pick it up here.", "I'm staying at the Harborview Hotel.", "I don't have a US number.", "Could you write it down, please?", "Thank you!"],
      expect: { complete: true }, auto: omit(BG_AUTO, ["flight", "tag", "describe", "delivery", "hotel", "phone"]) },
  ],
};

/** After the reference number: thanks, spell / write requests, or questions; then "Anything else?". */
function refPending(): Pending {
  const ok = (cc: Ctx) => { cc.s.refAck = true; };
  return {
    id: "ref", optional: false, hints: ["g_clarify", "ask"],
    suggest: [{ lt: "Padėkoti", hint: "g_social" }, { lt: "Paprašyti paraidžiui ar užrašyti", hint: "spell_write" }],
    on: {
      g_thanks: ok, g_ok: ok,
      g_bye: (cc) => { cc.s.refAck = true; once(cc, "close", "you_welcome"); cc.end(); },
      g_spell: (cc) => { cc.say(cc.s.ref === "a" ? "spell_a" : "spell_b"); cc.expect(refPending()); },
      g_write: (cc) => { cc.say("write_ref"); (cc as any).conv?.addNote?.({ en: REFS[cc.s.ref].write }); cc.expect(refPending()); },
    },
    yes: ok, no: ok,
  };
}

function kitPending(): Pending {
  return {
    id: "kit", expects: ["q_reimburse"], hints: ["g_yesno", "kit"], suggest: [{ lt: "Priimti rinkinį (taip / ne)", hint: "g_yesno" }, { lt: "Paklausti apie išlaidas", hint: "kit" }],
    on: {
      q_reimburse: (cc) => { cc.say("kit_here"); cc.event("give", { item: "overnight kit" }); cc.say("buy_basics"); cc.say("receipts"); },
      kit_yes_ctx: (cc) => { cc.say("kit_here"); cc.event("give", { item: "overnight kit" }); cc.say("receipts"); },
      kit_no_ctx: (cc) => { cc.say("buy_basics"); cc.say("receipts"); },
    },
    yes: (cc) => { cc.say("kit_here"); cc.event("give", { item: "overnight kit" }); cc.say("receipts"); },
    no: (cc) => { cc.say("buy_basics"); cc.say("receipts"); },
    ask: (cc) => cc.say("offer_kit"),
  };
}

/** "That's okay. From which city?" (after "I don't remember the flight number"). */
function fromPending(): Pending {
  return {
    id: "from_city", expects: ["flight", "city_ctx", "dunno_ctx"], hints: ["from"],
    suggest: [{ lt: "Pasakyti, iš kokio miesto skridai", hint: "from", options: "city" }],
    on: {
      flight: (cc, sl, sg) => { baggage.handlers.flight(cc, sl, sg); },
      city_ctx: (cc, sl, sg) => { baggage.handlers.city_ctx(cc, sl, sg); },
      dunno_ctx: (cc) => { cc.s.flight = true; cc.say("no_problem"); },
    },
    ask: (cc) => cc.say("ask_from"),
  };
}

// Mission checklist helpers: follow-up questions keep their main item open.
const stepDef = (id: string) => baggage.steps.find((x) => x.id === id)!;
const stepOpen = (c: Ctx, id: string) => { const st = stepDef(id); return (!st.when || !!st.when(c)) && !st.done(c); };
/** The description questions (skipped when the bag turns up in the system). */
const DESCRIBE = ["describe", "type", "color", "size", "material", "marks", "brand", "contents"];

/** Ask the next applicable step (used after a statement-only step such as the system lookup). */
function askNext(c: Ctx) {
  for (const st of baggage.steps) {
    if (st.when && !st.when(c)) continue;
    if (st.done(c)) continue;
    c.ask(st.id);
    return;
  }
}

export default baggage;
