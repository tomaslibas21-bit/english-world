// Song 79 "Where's My Parcel?" → American: "Where's My Package?".
// U.S. Post Office, postal clerk Gloria. Sending a package to Lithuania the American way:
// the mandatory "anything liquid, fragile, perishable or potentially hazardous?" question,
// pounds and ounces, Priority Mail International vs Express (and cheaper First-Class),
// the customs declaration (contents, value, gift), optional extra insurance,
// Global Forever stamps for postcards, paying, and the tracking number.
// Twists: picking up a package after a missed delivery (visits ≥ 1), a missing return address
// (visits ≥ 1), perfume that can't be mailed abroad (learner-driven).

import type { Ctx, EntityDef, SituationDef, StepDef, Suggestion } from "../types";
import type { ConvCtx } from "../../convo/dialogue";
import { ent, t } from "../dsl";
import { GLOBAL_HANDLERS } from "../global";

// ---------------------------------------------------------------------------
// Entities

const DESTS: EntityDef[] = [
  ent("lithuania", "Lithuania", "Lietuva/Lietuvos/Lietuvai/Lietuvą/Lietuva/Lietuvoje", "f",
    { chip: "Lietuva", forms: ["lithuania", "vilnius", "vilnius lithuania", "kaunas", "kaunas lithuania", "klaipeda", "siauliai", "panevezys", "alytus", "my hometown in lithuania"] }),
  ent("latvia", "Latvia", "Latvija/Latvijos/Latvijai/Latviją/Latvija/Latvijoje", "f", { chip: "Latvija", forms: ["latvia", "riga"] }),
  ent("poland", "Poland", "Lenkija/Lenkijos/Lenkijai/Lenkiją/Lenkija/Lenkijoje", "f", { chip: "Lenkija", forms: ["poland", "warsaw"] }),
  ent("germany", "Germany", "Vokietija/Vokietijos/Vokietijai/Vokietiją/Vokietija/Vokietijoje", "f", { chip: "Vokietija", forms: ["germany", "berlin"] }),
];

// Things people send home (for the contents and customs questions).
const THINGS: EntityDef[] = [
  ent("scarf", "scarf", "šalikas/šaliko/šalikui/šaliką/šaliku/šalike", "m", { pl: "scarves", chip: "šalikas", forms: ["scarf", "scarves", "a scarf"] }),
  ent("chocolate", "chocolate", "šokoladas/šokolado/šokoladui/šokoladą/šokoladu/šokolade", "m", { art: "", pl: "chocolates", chip: "šokoladas", forms: ["chocolate", "chocolates", "chocolate bars", "candy bars"] }),
  ent("tea", "tea", "arbata/arbatos/arbatai/arbatą/arbata/arbatoje", "f", { art: "", chip: "arbata", forms: ["tea", "teas", "tea bags"] }),
  ent("clothes", "clothes", "drabužiai/drabužių/drabužiams/drabužius/drabužiais/drabužiuose", "m", { art: "", chip: "drabužiai", forms: ["clothes", "clothing", "some clothes", "t shirts", "a t shirt", "socks", "a sweater", "sweaters", "shoes", "a jacket", "jackets", "a dress"] }),
  ent("books", "books", "knygos/knygų/knygoms/knygas/knygomis/knygose", "f", { art: "", chip: "knygos", forms: ["books", "a book", "book"] }),
  ent("toys", "toys", "žaislai/žaislų/žaislams/žaislus/žaislais/žaisluose", "m", { art: "", chip: "žaislai", forms: ["toys", "a toy", "toy"] }),
  ent("candy", "candy", "saldainiai/saldainių/saldainiams/saldainius/saldainiais/saldainiuose", "m", { art: "", chip: "saldainiai", forms: ["candy", "candies", "sweets", "cookies", "snacks", "food", "dry food"] }),
  ent("coffee", "coffee", "kava/kavos/kavai/kavą/kava/kavoje", "f", { art: "", chip: "kava", forms: ["coffee", "ground coffee", "coffee beans"] }),
  ent("photos", "photos", "nuotraukos/nuotraukų/nuotraukoms/nuotraukas/nuotraukomis/nuotraukose", "f", { art: "", chip: "nuotraukos", forms: ["photos", "pictures", "photographs", "some photos"] }),
  ent("souvenirs", "souvenirs", "suvenyrai/suvenyrų/suvenyrams/suvenyrus/suvenyrais/suvenyruose", "m", { art: "", chip: "suvenyrai", forms: ["souvenirs", "a souvenir", "gifts", "presents", "a gift", "a present", "christmas presents", "christmas gifts", "birthday presents", "birthday gifts", "a birthday present", "a christmas present"] }),
];

const SERVICES: EntityDef[] = [
  ent("priority", "Priority", "„Priority“", "f", { art: "", chip: "Priority (6–10 darbo dienų)", forms: ["priority", "priority mail", "priority mail international", "priority international"] }),
  ent("express", "Express", "„Express“", "f", { art: "", chip: "Express (3–5 darbo dienos)", forms: ["express", "priority express", "priority mail express", "priority mail express international", "express mail", "express international"] }),
  ent("first", "First-Class", "„First-Class“", "f", { art: "", chip: "First-Class (pigiausia)", forms: ["first class", "first class mail", "first class package", "first class international", "first class package international"] }),
];

// ---------------------------------------------------------------------------
// Package profiles (weight line + prices in cents), chosen in init.

const PROFILES = [
  { weight: "weight_a", kilos: "kilos_a", priority: 7640, express: 9865, first: 6125 },
  { weight: "weight_b", kilos: "kilos_b", priority: 6710, express: 8630, first: 3895 },
];
const INSURANCE = 435;
const STAMP = 175;
const TRACKING = { en: "CP 482 915 736 US", lt: "CP 482 915 736 US", say: "C P, four eight two, nine one five, seven three six, U S" };

const prof = (c: Ctx) => PROFILES[c.s.profile ?? 0];
const priceOf = (c: Ctx, svc: string) => (prof(c) as any)[svc] as number;
const total = (c: Ctx) =>
  (c.s.sending && c.s.service ? priceOf(c, c.s.service) : 0) + (c.s.insurance ? INSURANCE : 0) + (c.s.stampQty ? c.s.stampQty * STAMP : 0);

const sending = (c: Ctx) => !!c.s.sending && !c.s.sent;
const customsDone = (c: Ctx) => c.s.value !== undefined && (!c.s.askGift || c.s.gift !== undefined) && !!c.s.customsSigned;
const readyToPay = (c: Ctx) =>
  !c.s.paid && ((sending(c) && !!c.s.service && customsDone(c) && c.s.insurance !== "ask" && c.s.stamps !== "ask") || (!c.s.sending && !!c.s.stampQty));
const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
/** The checklist follows the pickup story (twist visits, or whenever the learner asks) unless they are sending a package.
 *  Frozen once one of the two errands is finished, so a second errand afterwards is a bonus. */
const pickupPath = (c: Ctx) => (c.s.donePath ? c.s.donePath === "pickup" : (!!c.s.pickupTwist || !!c.s.pickup) && !c.s.sending);
const sendPath = (c: Ctx) => !pickupPath(c);

/** True the first time `key` is used in this learner turn (the NLU may split one answer into
 *  several segments of the same intent; the NPC should react once). */
const turnKeys = new WeakMap<object, Set<string>>();
function firstInTurn(c: Ctx, key: string): boolean {
  let set = turnKeys.get(c);
  if (!set) { set = new Set(); turnKeys.set(c, set); }
  if (set.has(key)) return false;
  set.add(key);
  return true;
}

/** One-word replies that the {name} slot would swallow ("Pardon?" read as a name): the intent they really are.
 *  "ok" / "no" = Gloria simply asks again (as for a bare yes). */
const NOT_A_NAME: Record<string, string> = {
  sorry: "g_repeat", pardon: "g_repeat", what: "g_repeat", huh: "g_repeat", again: "g_repeat",
  wait: "g_wait", moment: "g_wait", second: "g_wait", hold: "g_wait", hang: "g_wait",
  bye: "g_bye", goodbye: "g_bye", thanks: "g_thanks", thank: "g_thanks", hello: "g_hello", hey: "g_hello",
  sure: "ok", yes: "ok", yeah: "ok", yep: "ok", yup: "ok", all: "ok", alright: "ok", right: "ok", fine: "ok",
  certainly: "ok", absolutely: "ok", course: "ok", problem: "ok", ready: "ok", nope: "no",
};
/** true = the "name" was one of those words and has been handled as what it really is. */
function notAName(c: Ctx, word: string): boolean {
  const g = NOT_A_NAME[word.trim().toLowerCase()];
  if (!g) return false;
  if (g !== "ok" && g !== "no") ((post.handlers as any)[g] ?? GLOBAL_HANDLERS[g])?.(c as ConvCtx, {});
  return true;
}

function bump(c: Ctx, key: string): number {
  c.s.asked = c.s.asked || {};
  const n = c.s.asked[key] ?? 0;
  c.s.asked[key] = n + 1;
  return n;
}

function startSending(c: Ctx, dest?: string) {
  c.s.task = c.s.task || "send";
  c.s.moreDone = false;
  c.s.sending = true;
  if (dest && !c.s.dest) c.s.dest = dest;
}

function weigh(c: Ctx) {
  if (c.s.weighed || !c.s.sending || !c.s.dest || c.s.contents === undefined) return;
  c.s.weighed = true;
  c.say("weigh");
  c.say(prof(c).weight);
}

function setService(c: Ctx, svc: string) {
  if (svc === "first" && !prof(c).first) { c.say("too_heavy_first"); return; }
  const had = c.s.service;
  c.s.service = svc;
  if (had !== svc) c.say("ack");
}

function finishSending(c: Ctx) {
  c.s.sent = true;
  c.s.served = true;
  c.say("receipt");
  c.say("tracking_number", { text: TRACKING });
  if (c.s.trackTip) c.say("track_online");
  c.event("give", { item: "receipt" });
  c.s.donePath = c.s.donePath || "send";
  c.complete();
}

// Automatic answers for optional questions in the simulations.
const POST_AUTO: Record<string, string> = {
  gift: "Yes, it's a gift.", insurance: "No, thanks.", stamps_offer: "No, thanks.", stamps_qty: "Five, please.",
  return_addr: "Oh, sorry! Sure.", perfume: "Okay, I'll take it out.", pick_notice: "Yes, here it is.", pick_name: "Tomas Mikalauskas",
  pick_sign: "Sure.", pick_id: "Here's my passport.", howmuch_kilo: "Okay.",
};

// ---------------------------------------------------------------------------
// Suggestions

const S_SEND: Suggestion = { lt: "Pasakyti, kad nori išsiųsti siuntinį į Lietuvą", hint: "send" };
const S_PICKUP: Suggestion = { lt: "Atsiimti siuntinį (turi pranešimą, kad kurjeris tavęs nerado)", hint: "pickup" };
const S_STAMPS: Suggestion = { lt: "Nusipirkti pašto ženklų atvirukams", hint: "stamps" };
const S_ASK: Suggestion = { lt: "Paklausti apie kainą, laiką ar sekimą", hint: "ask" };

const MAIN = ["send_package", "pickup", "buy_stamps"];

function helpStep(id: string, withPickup: boolean): StepDef {
  return {
    id,
    when: (c) => !!c.s.pickupTwist === withPickup,
    done: (c) => !!c.s.task,
    ask: (c) => {
      const n = bump(c, "help");
      if (n === 0) { c.say("next"); return; }
      c.say("ask_help");
    },
    expects: MAIN,
    suggest: withPickup ? [S_PICKUP, S_SEND, S_STAMPS] : [S_SEND, S_STAMPS, S_ASK],
    help: (c) => { c.say("ask_help"); },
  };
}

// ---------------------------------------------------------------------------

export const post: SituationDef = {
  id: "s79-post",
  song: 79,
  songTitle: "Where's My Parcel?",
  title: { en: "Where's My Package?", lt: "Kur mano siuntinys?" },
  topic: { en: "At the post office", lt: "Pašte" },
  chapter: 3,
  order: 4,
  location: "post-office",
  npc: "gloria",
  goal: "Išsiųsk siuntinį į Lietuvą ir gauk sekimo numerį.",
  intro: "Paštas Main Street gatvėje. Stovi eilėje su dėže – mamai į Lietuvą siunti šaliką, šokoladą ir arbatą. Prie langelio – pašto darbuotoja Gloria.",
  entities: { dest: DESTS, thing: THINGS, service: SERVICES },

  grammar: {
    macros: {
      pkg: "(this | this package | this box | a package | my package | the package | a box | my box | these | these boxes | two boxes | a gift | a present | some gifts | this parcel #tip:uk_parcel | a parcel #tip:uk_parcel | it | something)",
      svcnp: "({service} | the (cheaper | cheapest) [one | option] #cheap | the (faster | fastest | quicker | quickest) [one | option] #fast | the first one #first | the second one #second | the third one #third | (regular | standard | normal) [mail | shipping] #std)",
      sendv: "(send | mail | ship | post #tip:uk_post)",
      to_dest: "(to {dest} | to my (mom | mother | family | parents | sister | brother | friend) in {dest} #h:dest_mom | home to {dest})",
      qty: "(a | an | some | two | three | a few | a couple of | a box of | a bag of | a pack of | a bottle of)",
      frag: "((a | an | some | two) [glass | ceramic | small] (glass | glasses | vase | mug | mugs | candle | candles | picture frame | plate | plates | bowl | ornament) | glass)",
      thingp: "([@qty] [old | new | warm | small | nice | some old] {thing} | [a bottle of | some] perfume #perfume | [some] batteries #hazard | @frag #fragile | [some | a jar of | a bottle of] (maple syrup | honey | jam) #liquid)",
      things: "(@thingp [[and] @thingp] [and @thingp] [and @thingp])",
    },
    slots: {},
  },

  intents: {
    // --- main requests
    send_package: { patterns: [
      "i would like to @sendv @pkg [@to_dest] #h:send_like", "(can | could) i @sendv @pkg [@to_dest] #h:send_could",
      "i need to @sendv @pkg [@to_dest] #h:send_need", "i want to @sendv @pkg [@to_dest]",
      "(i would also like to | i also need to | i also want to | can i also | could i also | and i would like to | i would like to also) @sendv @pkg [@to_dest]",
      "i have a (package | box | parcel #tip:uk_parcel) (for | to) {dest}", "(this is | this package is | it is) (going | for | going to) {dest} #h:send_going",
      "i would like to send (this | it) (overseas | abroad | internationally)", "how (do | can) i send @pkg @to_dest",
      "(i am here to | i came to) @sendv @pkg [@to_dest]", "i am sending (this | a package) @to_dest", "@sendv (this | it) @to_dest [please]",
      "i would like to send a (package | parcel #tip:uk_parcel) [@to_dest]", "i want to @sendv (this | it) @to_dest #h:send_want",
      "i have a (package | box) (for | to) {dest} #h:send_have", "(can | could) i @sendv (this | it) (overseas | abroad) #h:send_overseas",
      "how much (is it | does it cost) to @sendv (this | it | a package) [@to_dest] #h:send_howmuch",
      "(a | one) (package | box | parcel #tip:uk_parcel) (to | for) {dest}", "(can | could) you help me @sendv @pkg [@to_dest]", "@sendv [it | this] @to_dest",
      "how much to @sendv @pkg @to_dest", "@sendv @pkg home",
    ] },
    dest_ans: { patterns: ["@to_dest #h:dest_to", "[it is going] (to | for) {dest}", "{dest}", "it is for my (mom | mother | family) in {dest}", "{dest} please"] },
    pickup: { patterns: [
      "i would like to pick up (a | my) (package | parcel #tip:uk_parcel) #h:pick_like", "i am here to pick up (a | my) (package | parcel #tip:uk_parcel)",
      "i (got | have | found) (a | this) (notice | slip | note | card) #h:pick_notice", "i missed a delivery #h:pick_missed",
      "(i got | there was) a (notice | note | slip | card) (on | at) my door", "(can | could) i pick up my (package | parcel #tip:uk_parcel)",
      "i would like to collect (a | my) (package | parcel) #tip:uk_collect", "i am here (for | about) my (package | parcel #tip:uk_parcel)",
      "where is my (package | parcel #tip:uk_parcel) #h:pick_where", "you tried to deliver (a | my) package", "they could not deliver my package",
      "i got a (notice | slip) (and | so) i missed a delivery", "i was not (home | at home) (and | so) i missed a delivery",
      "i got a (notice | slip | note | card) (that | saying) (i missed a (delivery | package) | you tried to deliver [a package])", "(package | parcel) (pickup | pick up)",
      "i have a (notice | slip | note | card) (for | about) (a | my) (package | parcel)", "i would like to pick up my (mail | package | parcel)",
      "the (mailman | mail carrier | postman) came [but] i (was not | was not at) home", "i was not home when the (mailman | mail carrier | postman) came",
      "i have (a | the) (notice | slip | note) from the (mailman | mail carrier | post office)", "i have the (slip | notice)",
    ] },
    buy_stamps: { patterns: [
      "(can | could) i (get | have | buy) [some] (stamps | global forever stamps) [for (postcards | a postcard | letters)] [to {dest}] #h:stamps_could",
      "i (would like | want | need) to (buy | get) [some] (stamps | postcard stamps | global forever stamps) [for (postcards | a postcard | letters)] [to {dest}]",
      "i (would like | need) [some] stamps [for (postcards | a postcard | letters)] [to {dest}] #h:stamps_need",
      "do you (have | sell) (stamps | postcard stamps)", "i (would like | need) to send (postcards | a postcard | some postcards) [to {dest}]",
      "(how much | what) (is | does) a stamp [cost] (for | to send) a postcard [to {dest}]", "stamps [please]",
      "(i also need | and) [some] stamps [for (postcards | a postcard)]", "[yes] for (postcards | a postcard | letters) [to {dest}]",
      "do you (have | sell) stamps for (europe | lithuania | postcards | international mail)",
    ] },

    // --- sending
    contents_ok: { patterns: [
      "[no] (just | only) @things #h:contents_just", "[no] it is (just | only) @things", "[no] there is (just | only) @things [inside | in it]",
      "no nothing like that #h:contents_none", "@things [for my (family | mom | mother | kids | children | friends)] #h:items_list", "[no] (there is nothing | nothing) (liquid | fragile | dangerous | like that)", "no it is (all | just) (clothes | gifts | presents)",
      "[no] (just | only) @things for my (family | mom | mother | kids | children | friends)", "[no] (everything | it is all) (okay | fine | safe)", "[no] only dry (things | stuff | food)",
      "[no] there is no (glass | perfume | liquid | liquids | batteries | food) [inside | in it | in there]", "[no] there are no (liquids | batteries | glasses)",
      "no (liquids | liquid | batteries | perfume)", "[no] (nothing | none) (of that | of those)",
      "(it is | there is) @things [inside | in it | in there]", "no it is fine", "[no] nothing dangerous", "no it is safe",
    ] },
    contents_fragile: { patterns: [
      "yes (it is | there is something | something is) fragile #h:contents_fragile", "[yes] (there is | there are | it has) @frag [inside | in it | in there]",
      "[yes] @frag", "it is fragile", "(please be | be) careful it is fragile", "it is (a little | a bit) fragile", "yes (there is | it has) glass [in it | inside]",
    ] },
    contents_perfume: { patterns: [
      "(there is | there are) [a bottle of | some] perfume [inside | in it | in there]", "yes (a bottle of | some) perfume", "[there is] perfume [for my mom]",
      "(is | can i send) perfume (okay | allowed)", "can i send perfume",
    ] },
    contents_liquid: { patterns: ["(there is | yes) [some | a jar of | a bottle of] (maple syrup | honey | jam) [inside | in it]", "(is | can i send) (maple syrup | honey) (okay | allowed)"] },
    contents_hazard: { patterns: ["(there are | yes) [some] batteries [inside | in it]", "(is | can i send) (a battery | batteries) (okay | allowed)"] },
    take_out: { patterns: ["[oh] [okay] i will take (it | them) out #h:take_out", "[oh] [okay] i will remove (it | them)", "(okay | fine) take it out", "oh i did not know",
      "[okay | fine] no perfume [then]", "[okay] i will keep it [at home]"] },
    what_hazard: { patterns: ["what (does | is) (perishable | hazardous) [mean]", "what do you mean (perishable | hazardous)"] },
    service_ans: { patterns: [
      "{service} [please] #h:svc_please", "(i will take | i will go with | i would like | let us do | can i (get | have) | i will do | i will have | i think i will take) @svcnp #h:svc_take",
      "@svcnp (is fine | sounds good | works | is good)", "[just] the (cheaper | cheapest) [one | option] #cheap #h:svc_cheaper",
      "[just] the (faster | fastest | quicker | quickest) [one | option] #fast #h:svc_faster", "@svcnp", "i think @svcnp", "@svcnp i think",
      "the (fast | quick) [one | option] #fast", "(i want | i would like) the (cheapest | cheaper) (way | option | one) #cheap", "(i want | i would like) the (fastest | quickest) (way | option | one) #fast",
      "[@svcnp] [because] (i am not in a hurry | there is no hurry | no hurry) #cheap", "[@svcnp] [because] (it is urgent | i need it fast | it is for a birthday) #fast",
    ] },
    service_not: { patterns: ["[no] not {service}", "i do not (want | need) {service}", "no {service}", "[no] not (express | the expensive one)"] },
    ask_cheaper: { patterns: ["is there (anything | something) cheaper #h:q_cheaper", "(what is | what about) the cheapest (way | option)", "do you have (anything | something) cheaper", "that is (too | a bit | a little) expensive", "which [one] is (cheaper | the cheapest)", "is there a cheaper (way | option)"] },
    ask_faster: { patterns: ["(which | what) is [the] (faster | fastest | quicker)", "is there (anything | something) faster", "what is the fastest way", "which one is faster"] },
    ask_options: { patterns: ["what are my options", "what (options | services) do you have", "what is the difference", "how can i send it"] },
    ask_price: { patterns: ["how much (is it | does it cost | is that | will it cost | is (priority | express | the express one | the priority one)) #h:q_price", "how much to send (it | this) [to {dest}]", "what is the price", "how much is {service}"] },
    ask_time: { patterns: [
      "how long (does it | will it | does {service} | does that) take #h:q_long", "when will it (arrive | get there | be there)", "how many days (does it take | is that)",
      "will it (arrive | get there) (by | before) (friday | next week | {day})", "how fast is it",
    ] },
    ask_tracking: { patterns: ["(can | could) i track it [online | on the website | on my phone] #h:q_track", "is {service} tracked", "(does | will) it (have | come with) tracking", "is there tracking", "how (can | do) i track it", "where is the tracking number", "is it tracked"] },
    ask_insured: { patterns: ["is it insured #h:q_insured", "(does it | will it) (have | include) insurance", "is there insurance", "what if it gets lost"] },
    ask_kilos: { patterns: ["how much is that in (kilos | kilograms | kilo) #h:q_kilos", "(what is | how much is) that in (kilos | kilograms)", "how many (kilos | kilograms) is (that | it)", "in (kilos | kilograms) please"] },
    ask_customs: { patterns: ["do i need (a | to fill out a | to fill in a) customs form", "what is a customs form", "why do (i | you) need (that | a customs form)"] },
    what_write: { patterns: ["what (do | should) i (write | put) (here | there | on the form)", "what should i write", "what do you need to know"] },
    value_ans: { patterns: [
      "[it is] (about | around | maybe | roughly | less than | under) {price} #h:value_about", "[it is worth | the value is | the total is] {price} #h:value_is",
      "(it is | they are | everything is | it is all) worth [about | around | maybe | roughly] {price}",
      "{price} [total | in total | all together]", "[it is] not (much | very much | expensive)",
      "[it is] [about | around | maybe] {price} euros", "(all together | altogether | in total) [about | around | maybe] {price}",
    ] },
    value_ctx: { patterns: ["{price}"] },
    gift_yes: { patterns: ["[yes] it is a (gift | present) [for my (mom | mother | family | friend)] #h:gift_yes", "[yes] [it is] a (birthday | christmas) (gift | present) [for my (mom | mother | family | friend)]",
      "[yes] [it is] for my (mom | mother | family | friend | sister | brother | dad | father | parents | grandma | grandmother | kids | children)", "(a | yes a) (gift | present)", "it is for my (mom | mother) (birthday | for her birthday)", "yes it is for my family"] },
    gift_no: { patterns: ["[no] it is not a (gift | present) #h:gift_no", "no it is (my stuff | my things | for me)", "[no] (they are | it is | these are) my [own] (clothes | things | stuff)"] },
    return_ok: { patterns: ["[oh] (sure | of course) (no problem | i will write it)", "i will (write | add) it [now | right now]", "where (do | should) i write it", "[oh] i forgot [it | that] [sorry]",
      "(sorry | i am sorry) i forgot [it | that | the return address]"] },
    return_ctx: { patterns: ["oh [i am] sorry [sure | of course | okay | no problem] #h:return_ok", "[i am] sorry (sure | of course | okay | no problem)"] },
    what_return: { patterns: ["what is (a | the) return address #h:what_return", "(my | whose) address", "what do you mean return address", "which address",
      "(my | which) address [here | in the us | in lithuania] [or (in lithuania | here | there)]"] },
    insurance_yes: { patterns: ["[yes] i would like (insurance | extra insurance | more insurance) #h:ins_yes", "[yes] (please add | add) insurance", "yes (to be safe | just in case)"] },
    insurance_no: { patterns: ["[no] i do not need (it | insurance | extra insurance) #h:ins_no", "[it is okay | it is fine] no [extra] insurance [thanks]", "[no] (it is not | it is not very) (expensive | valuable | worth much)", "[no] (that is | it is) enough", "no (insurance | extra insurance) [thanks]", "[no] (that is | it is) (fine | okay) without (it | insurance)", "no two hundred is enough"] },
    stamps_qty: { patterns: ["{number} [stamps | global forever stamps] [please] #h:stamps_qty", "(i need | i would like | can i get | give me) {number} [stamps | global forever stamps]", "[i would like] a sheet [of stamps] [please] #sheet #h:stamps_sheet", "(one | just one) [stamp] [please]"] },
    stamps_ctx: { patterns: ["{number} #h:stamps_qty", "(just | only) {number}"] },
    // "I don't need stamps." to "Do you need any stamps today?"
    no_stamps: { patterns: ["[no] i do not need (stamps | any stamps) [today | thanks | right now]", "[no] no stamps [today | thanks]"] },

    // --- paying
    pay_card: { patterns: ["[can | could] i pay (by | with) (card | credit card | debit card | my card) #h:pay_card", "(by | with) card", "card #h:pay_card_short", "(i will | i would like to) pay (by | with) card", "do you (take | accept) (cards | credit cards | card)", "[a] (credit | debit) card", "(credit | debit | visa | mastercard)", "(can | could) i (use | tap | insert) my card"] },
    pay_cash: { patterns: ["[can | could] i pay (in | with) cash #h:pay_cash", "(in | with) cash", "cash", "(i will | i would like to) pay (in | with) cash", "i will pay cash"] },
    pay_phone: { patterns: ["(can | could) i pay (with | by) (my phone | apple pay | google pay | phone)", "do you (take | accept) (apple pay | google pay)", "apple pay", "google pay",
      "(i will | i would like to | i want to) pay (with | by) (my phone | phone | apple pay | google pay)", "is (apple pay | google pay) (okay | fine | possible)"] },
    here_you_go: { patterns: ["here you (go | are) #h:here_you_go", "there you go", "here it is #h:notice_here", "here is (my card | the money | the notice | my notice | the slip)", "here they are",
      "(it is | i have it) on my phone [i took a (picture | photo)]", "i (took | have) a (picture | photo) [of it]", "[yes] i have it (here | with me | right here)"] },

    // --- pickup
    show_doc: { patterns: ["here is my (passport | driver s license | drivers license | id | id card) #h:id_here", "[this is] my (passport | id | drivers license)", "i have my (passport | id | drivers license)", "(is | will) my passport (okay | fine | work)",
      "(is | will) (my | a) (passport | drivers license | driver license | license | id | id card) (okay | fine | work | enough)", "[this is] my (lithuanian | us) (passport | id | id card | drivers license)"] },
    // "Passport." as the answer to "Can I see your ID?"
    doc_ctx: { patterns: ["[yes | sure] [my | the | a] [lithuanian | us] (passport | id | id card | drivers license | driver license | license)"] },
    no_notice: { patterns: ["[no] [sorry] i (lost | do not have | forgot) (it | the notice | the slip | the note) #h:notice_lost", "[no] i (left | forgot) (it | the notice | the slip | the note) [at home]", "i threw it (away | out)", "no i do not have it [with me]"] },
    name_ctx: { patterns: ["[it is | my name is | the name is | it should be under | under] {name} #h:name_its"] },
    signed: { patterns: ["(i signed [it] | okay i signed [it] | i have signed [it]) #h:sign_done", "(done | there you go | all done)", "(where | where do i) sign", "where [exactly]"] },
    sign_ctx: { patterns: ["(sure | okay | of course | no problem | yes of course) #h:sign_ok"] },
    tracking_ctx: { patterns: ["[it is | the number is] {digits}", "[it is] c p {digits} u s", "the tracking number is {digits}"] },

    // --- general
    more_no: { patterns: ["(that is | that will be) (all | it | everything) [for today] #h:more_all", "that is everything", "nothing else", "[no] that is it #h:more_its", "[no] i am (good | fine | all set)", "i think that is (all | it)"] },
    need_tape: { patterns: ["(can | could) i (borrow | use | have | get) [some] tape", "do you have [some] tape", "do you sell boxes", "(can | could) i (buy | get) a box"] },
    ask_open: { patterns: ["what time do you (close | open)", "when do you close", "are you open on (saturday | sunday | saturdays | sundays)"] },
  },

  lines: {
    next: [
      t("Next | in line, | please!", "Kitas | eilėje, | prašom!", "Kitas, prašom!"),
      t("I | can | help | whoever's | next!", "Aš | galiu | padėti | tam, kas yra | kitas!", "Prašom, kitas!"),
      t("Next | customer, | please!", "Kitas | klientas, | prašom!", "Kitas klientas, prašom!"),
    ],
    ask_help: [
      t("Hi there! | What | can | I | do | for you | today?", "Laba diena! | Ką | galiu | aš | padaryti | jums | šiandien?", "Laba diena! Kuo šiandien galiu padėti?"),
      t("How | can | I | help | you?", "Kuo | galiu | aš | padėti | jums?", "Kuo galiu padėti?"),
    ],
    ask_dest: [
      t("Sure. | Where's | it | going?", "Žinoma. | Kur | jis | keliauja?", "Žinoma. Kur jis keliauja?",
        { flags: { 1: "“Where's” = where is: progressive “is” has no Lithuanian word; keliauja carries the tense (linked to “going”)." } }),
      t("Okay! | Where | are | you | sending | it?", "Gerai! | Kur | — | jūs | siunčiate | jį?", "Gerai! Kur jį siunčiate?",
        { flags: { 2: "Progressive “are” has no Lithuanian word; siunčiate carries the tense (linked to “sending”)." } }),
    ],
    dest_lt: [
      t("Lithuania, | okay.", "Į Lietuvą, | gerai.", "Į Lietuvą, gerai."),
      t("Lithuania! | Great.", "Į Lietuvą! | Puiku.", "Į Lietuvą! Puiku."),
    ],
    dest_other: [t("Okay.", "Gerai.", "Gerai.")],
    ask_contents: [
      t("Is | there | anything | liquid, | fragile, | perishable | or | potentially | hazardous | inside?",
        "Ar yra | — | kas nors | skysto, | dūžtančio, | greitai gendančio | ar | galimai | pavojingo | viduje?",
        "Ar viduje yra kas nors skysto, dūžtančio, greitai gendančio ar galimai pavojingo?",
        { flags: { 1: "Existential “there” has no Lithuanian word; Ar yra carries “Is there”." } }),
      t("Anything | liquid, | fragile | or | perishable | in there?", "Kas nors | skysto, | dūžtančio | ar | greitai gendančio | viduje?",
        "Ar viduje yra kas nors skysto, dūžtančio ar greitai gendančio?"),
      t("Any | perfume, | batteries | or | anything | fragile?", "Kokių nors | kvepalų, | baterijų | ar | ko nors | dūžtančio?", "Gal yra kvepalų, baterijų ar ko nors dūžtančio?"),
    ],
    hazard_explain: [
      t("Perishable | means | food | that | can | go bad, | and | hazardous | means | things | like | batteries.",
        "Greitai gendantis | reiškia | maistą, | kuris | gali | sugesti, | o | pavojingas | reiškia | daiktus | kaip | baterijos.",
        "„Perishable“ – tai greitai gendantis maistas, o „hazardous“ – pavojingi daiktai, pavyzdžiui, baterijos."),
    ],
    contents_ok: [
      t("Okay, | great.", "Gerai, | puiku.", "Gerai, puiku."),
      t("Perfect.", "Puiku.", "Puiku."),
    ],
    fragile_ok: [
      t("Okay, | I'll put | a | “Fragile” | sticker | on | it.", "Gerai, | užklijuosiu | — | „Dūžta“ | lipduką | ant | jo.", "Gerai, užklijuosiu lipduką „Dūžta“."),
    ],
    liquid_ok: [
      t("That's | fine, | as long as | it's | sealed | well.", "Tai | tinka, | jei tik | jis yra | uždarytas | gerai.", "Tinka, jei tik gerai uždaryta.",
        { flags: { 0: "“is” is carried by the verb tinka (linked to “fine”)." } }),
    ],
    perfume_no: [
      t("Oh, | sorry, | perfume | can't go | overseas | by mail.", "O, | atsiprašau, | kvepalų | negalima siųsti | į užsienį | paštu.", "O, atsiprašau, kvepalų paštu į užsienį siųsti negalima."),
    ],
    perfume_out: [
      t("You'll need | to take | it | out.", "Jums reikės | išimti | juos | —.", "Juos reikės išimti.",
        { flags: { 3: "“out” (take … out): the prefix iš- of išimti carries it." } }),
    ],
    perfume_thanks: [t("Thank | you.", "Dėkoju | jums.", "Ačiū.")],
    perfume_rule: [t("I'm sorry, | it's | the | rule.", "Atsiprašau, | tai yra | — | taisyklė.", "Atsiprašau, tokia taisyklė.")],
    battery_no: [
      t("Loose | batteries | can't go | overseas, | I'm afraid.", "Palaidų | baterijų | negalima siųsti | į užsienį, | deja.", "Deja, palaidų baterijų į užsienį siųsti negalima."),
    ],
    weigh: [
      t("Let | me | weigh | it.", "Leiskite | man | pasverti | jį.", "Tuoj pasversiu."),
      t("Okay, | let's put | it | on | the | scale.", "Gerai, | padėkime | jį | ant | — | svarstyklių.", "Gerai, padėkime ant svarstyklių."),
    ],
    weight_a: [
      t("It's | 3 | pounds, | 4 | ounces.", "Jis sveria | 3 | svarus, | 4 | uncijas.", "Jis sveria 3 svarus ir 4 uncijas.", { say: "It's three pounds, four ounces." }),
    ],
    weight_b: [
      t("It's | 1 | pound, | 12 | ounces.", "Jis sveria | 1 | svarą, | 12 | uncijų.", "Jis sveria 1 svarą ir 12 uncijų.", { say: "It's one pound, twelve ounces." }),
    ],
    kilos_a: [t("That's | about | a | kilo | and | a | half.", "Tai | maždaug | — | kilogramas | ir | — | pusė.", "Tai maždaug pusantro kilogramo.")],
    kilos_b: [t("That's | about | 800 | grams.", "Tai | maždaug | 800 | gramų.", "Tai maždaug 800 gramų.", { say: "That's about eight hundred grams." })],
    ask_service: [
      t("How | would | you | like | to send | it?", "Kaip | — | jūs | norėtumėte | išsiųsti | jį?", "Kaip norėtumėte jį išsiųsti?",
        { flags: { 1: "“would”: the conditional ending of norėtumėte carries it (linked to “like”)." } }),
      t("Okay, | so | you | have | two | options.", "Gerai, | tai | jūs | turite | du | variantus.", "Gerai, turite du variantus."),
    ],
    ask_service_again: [
      t("So, | Priority | or | Express?", "Tai | „Priority“ | ar | „Express“?", "Tai „Priority“ ar „Express“?"),
    ],
    opt_priority: [
      t("Priority | takes | 6–10 | business | days | and | costs | {$price}.", "„Priority“ | keliauja | 6–10 | darbo | dienų | ir | kainuoja | {$price}.",
        "„Priority“ siunta keliauja 6–10 darbo dienų ir kainuoja {$price}.", { say: "Priority takes six to ten business days and costs {$price}." }),
    ],
    opt_express: [
      t("Express | takes | 3–5 | business | days | and | costs | {$price}.", "„Express“ | keliauja | 3–5 | darbo | dienas | ir | kainuoja | {$price}.",
        "„Express“ siunta keliauja 3–5 darbo dienas ir kainuoja {$price}.", { say: "Express takes three to five business days and costs {$price}." }),
    ],
    opt_first: [
      t("First-Class | is | cheaper, | {$price}, | but | it | can | take | up to | four | weeks.", "„First-Class“ | yra | pigesnė, | {$price}, | bet | ji | gali | trukti | iki | keturių | savaičių.",
        "„First-Class“ siunta pigesnė, {$price}, bet gali keliauti iki keturių savaičių.", { say: "First-Class is cheaper, {$price}, but it can take up to four weeks." }),
    ],
    too_heavy_first: [
      t("Sorry, | it's | too | heavy | for | First-Class.", "Atsiprašau, | jis yra | per | sunkus | — | „First-Class“ siuntai.", "Atsiprašau, jis per sunkus „First-Class“ siuntai.",
        { flags: { 4: "“for”: the dative siuntai carries it." } }),
    ],
    no_cheaper: [
      t("Priority | is | the | cheapest | option | for | this | box.", "„Priority“ | yra | — | pigiausias | variantas | — | šiai | dėžei.", "Šiai dėžei pigiausias variantas – „Priority“.",
        { flags: { 5: "“for”: the dative dėžei carries it." } }),
    ],
    fastest: [
      t("Express | is | the | fastest: | 3–5 | business | days.", "„Express“ | yra | — | greičiausia: | 3–5 | darbo | dienos.", "Greičiausia – „Express“: 3–5 darbo dienos.",
        { say: "Express is the fastest: three to five business days." }),
    ],
    ack: [
      t("Great | choice.", "Puikus | pasirinkimas.", "Puikus pasirinkimas."),
      t("Okay.", "Gerai.", "Gerai."),
      t("Perfect.", "Puiku.", "Puiku."),
    ],
    customs_intro: [
      t("Since | it's going | overseas, | I | need | a | customs | form.", "Kadangi | jis keliauja | į užsienį, | man | reikia | — | muitinės | deklaracijos.",
        "Kadangi siuntinys keliauja į užsienį, reikia muitinės deklaracijos."),
      t("It's going | overseas, | so | we | need | a | customs | form.", "Jis keliauja | į užsienį, | todėl | mums | reikia | — | muitinės | deklaracijos.",
        "Siuntinys keliauja į užsienį, todėl reikia muitinės deklaracijos."),
    ],
    customs_explain: [
      t("It | tells | customs | what's | inside | and | how much | it's | worth.", "Ji | nurodo | muitinei, | kas yra | viduje | ir | kiek | jis yra | vertas.",
        "Joje muitinei nurodoma, kas viduje ir kiek tai vertinga."),
    ],
    ask_what_inside: [
      t("What's | in the box?", "Kas yra | dėžėje?", "Kas dėžėje?"),
      t("So, | what's | inside?", "Tai | kas yra | viduje?", "Tai kas viduje?"),
    ],
    ask_value: [
      t("And | what's | the | total | value?", "O | kokia yra | — | bendra | vertė?", "O kokia bendra vertė?"),
      t("And | the | total | value?", "O | — | bendra | vertė?", "O bendra vertė?"),
    ],
    value_help: [
      t("Just | a | rough | guess | is fine.", "Tiesiog | — | apytikslė | suma | tinka.", "Užtenka apytikslės sumos."),
    ],
    write_help: [
      t("Just | list | the | items | and | their | value | in | dollars.", "Tiesiog | išvardykite | — | daiktus | ir | jų | vertę | — | doleriais.",
        "Tiesiog išvardykite daiktus ir jų vertę doleriais.", { flags: { 7: "“in”: the instrumental doleriais carries it." } }),
    ],
    ask_gift: [
      t("Is | it | a | gift?", "Ar | tai | — | dovana?", "Ar tai dovana?", { flags: { 0: "“Is” in a question = the particle ar; Lithuanian needs no copula here." } }),
    ],
    gift_mark: [t("Okay, | I'll mark | it | as | a | gift.", "Gerai, | pažymėsiu | tai | kaip | — | dovaną.", "Gerai, pažymėsiu kaip dovaną.")],
    gift_not: [t("Okay, | no | problem.", "Gerai, | jokių | problemų.", "Gerai, jokių problemų.")],
    sign_customs: [
      t("Great. | Just | sign | here, | please.", "Puiku. | Tiesiog | pasirašykite | čia, | prašom.", "Puiku. Tiesiog pasirašykite čia."),
      t("Could | you | sign | here | for me?", "Ar galėtumėte | jūs | pasirašyti | čia | man?", "Ar galėtumėte čia pasirašyti?"),
    ],
    signed_thanks: [t("Thank | you.", "Dėkoju | jums.", "Ačiū."), t("Perfect, | thanks.", "Puiku, | ačiū.", "Puiku, ačiū.")],
    return_missing: [
      t("Oh, | there's | no | return | address | on | it.", "O, | nėra | jokio | atgalinio | adreso | ant | jo.", "O, ant jo nėra siuntėjo adreso.",
        { flags: { 1: "Negative concord: nėra is the negated copula; the noun takes the genitive." } }),
    ],
    return_ask: [
      t("Could | you | add | it | here, | please?", "Ar galėtumėte | jūs | užrašyti | jį | čia, | prašau?", "Ar galėtumėte jį čia užrašyti?"),
    ],
    return_explain: [
      t("It's | your | address, | so | they | can | send | it | back | if | needed.", "Tai yra | jūsų | adresas, | kad | jie | galėtų | išsiųsti | jį | atgal, | jei | reikės.",
        "Tai jūsų adresas, kad prireikus siuntinį galėtų grąžinti."),
    ],
    return_thanks: [t("Thanks! | That's | perfect.", "Ačiū! | Tai yra | puiku.", "Ačiū! Puiku.")],
    ask_insurance: [
      t("It's | insured | up to | $200. | Would | you | like | extra | insurance?", "Jis yra | apdraustas | iki | 200 dolerių. | Ar | jūs | norėtumėte | papildomo | draudimo?",
        "Jis apdraustas iki 200 dolerių. Ar norėtumėte papildomo draudimo?",
        { say: "It's insured up to two hundred dollars. Would you like extra insurance?", flags: { 4: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte." } }),
    ],
    insured_info: [
      t("It's | already | insured | up to | $200.", "Jis yra | jau | apdraustas | iki | 200 dolerių.", "Jis jau apdraustas iki 200 dolerių.", { say: "It's already insured up to two hundred dollars." }),
    ],
    insurance_added: [
      t("Okay, | that's | $4.35 | more.", "Gerai, | tai yra | 4,35 dolerio | daugiau.", "Gerai, tai dar 4,35 dolerio.", { say: "Okay, that's four thirty-five more." }),
    ],
    no_problem: [t("No | problem.", "Jokių | problemų.", "Jokių problemų.")],
    offer_stamps: [
      t("Do | you | need | any | stamps | today?", "Ar | jums | reikia | — | pašto ženklų | šiandien?", "Ar šiandien jums reikia pašto ženklų?",
        { flags: { 0: "Question “Do” = the particle ar.", 3: "Partitive: the genitive pašto ženklų carries “any”." } }),
    ],
    stamps_info: [
      t("For | postcards | to | Europe, | you | need | Global Forever | stamps.", "— | Atvirukams | į | Europą | jums | reikia | „Global Forever“ | pašto ženklų.",
        "Atvirukams į Europą reikia „Global Forever“ pašto ženklų.", { flags: { 0: "“For”: the dative atvirukams carries it." } }),
    ],
    stamps_price: [
      t("They're | $1.75 | each. | How many | would | you | like?", "Jie kainuoja | 1,75 dolerio | kiekvienas. | Kiek | — | jūs | norėtumėte?",
        "Vienas ženklas kainuoja 1,75 dolerio. Kiek norėtumėte?",
        { say: "They're a dollar seventy-five each. How many would you like?", flags: { 0: "“are” in a price statement = kainuoja.", 4: "“would”: the conditional ending of norėtumėte carries it." } }),
    ],
    stamps_ok: [t("Sure, | here you go.", "Žinoma, | prašom.", "Žinoma, prašom.")],
    stamps_sure: [t("Sure.", "Žinoma.", "Žinoma."), t("Okay, | no | problem.", "Gerai, | jokių | problemų.", "Gerai, jokių problemų.")],
    stamps_here: [t("And | here are | your | stamps.", "Ir | štai | jūsų | pašto ženklai.", "Ir štai jūsų pašto ženklai.")],
    ask_more: [
      t("Anything | else | for you | today?", "Ką nors | dar | jums | šiandien?", "Dar ko nors šiandien?"),
      t("Is | that | everything | for today?", "Ar | tai | viskas | šiandien?", "Ar šiandien tai viskas?",
        { flags: { 0: "“Is” in a question = the particle ar; Lithuanian needs no copula here." } }),
    ],
    ask_more_yes: [t("Sure, | what | else | can | I | do | for you?", "Žinoma, | ką | dar | galiu | aš | padaryti | jums?", "Žinoma, kuo dar galiu padėti?")],
    say_total: [
      t("Your | total | is | {$total}.", "Jūsų | suma | yra | {$total}.", "Iš viso {$total}."),
      t("That'll be | {$total}.", "Tai bus | {$total}.", "Iš viso {$total}."),
    ],
    ask_pay: [
      t("How | would | you | like | to pay?", "Kaip | — | jūs | norėtumėte | sumokėti?", "Kaip norėtumėte sumokėti?",
        { flags: { 1: "“would”: the conditional ending of norėtumėte carries it." } }),
    ],
    card_tap: [
      t("You | can | tap | your | card | right | here.", "Jūs | galite | pridėti | savo | kortelę | štai | čia.", "Galite pridėti kortelę štai čia."),
      t("Go ahead | and | insert | your | card.", "Prašom | — | įdėti | savo | kortelę.", "Prašom įdėti kortelę.",
        { flags: { 1: "“and” links “go ahead” to the verb; Lithuanian uses prašom + infinitive." } }),
    ],
    phone_ok: [t("Sure, | just | hold | your | phone | here.", "Žinoma, | tiesiog | prilaikykite | savo | telefoną | čia.", "Žinoma, tiesiog prilaikykite telefoną čia.")],
    cash_change: [t("And | here's | your | change.", "Ir | štai | jūsų | grąža.", "Štai jūsų grąža.")],
    pay_later: [t("Sure, | we'll do | that | in | a | minute.", "Žinoma, | padarysime | tai | po | — | minutės.", "Žinoma, tuoj tai padarysime.")],
    receipt: [
      t("Here's | your | receipt.", "Štai | jūsų | kvitas.", "Štai jūsų kvitas."),
      t("All set! | Here's | your | receipt.", "Viskas sutvarkyta! | Štai | jūsų | kvitas.", "Viskas! Štai jūsų kvitas."),
    ],
    tracking_number: [
      t("Your | tracking | number | is | {$text}.", "Jūsų | sekimo | numeris | yra | {$text}.", "Jūsų sekimo numeris – {$text}.",
        { say: "Your tracking number is {$text}.", write: "Tracking number: CP 482 915 736 US" }),
    ],
    track_online: [
      t("You | can | track | it | on | usps.com.", "Jūs | galite | sekti | jį | — | usps.com svetainėje.", "Siuntą galite sekti usps.com svetainėje.",
        { say: "You can track it on U S P S dot com.", flags: { 4: "“on”: the locative svetainėje carries it." } }),
    ],
    tracking_yes: [
      t("Yes, | it | comes | with | tracking.", "Taip, | jis | keliauja | su | sekimu.", "Taip, siuntą bus galima sekti."),
    ],
    tracking_on_receipt: [
      t("It's | on | your | receipt, | at the top.", "Jis yra | ant | jūsų | kvito, | viršuje.", "Jis jūsų kvite, viršuje."),
    ],
    time_priority: [t("Priority | takes | 6–10 | business | days.", "„Priority“ | keliauja | 6–10 | darbo | dienų.", "„Priority“ siunta keliauja 6–10 darbo dienų.", { say: "Priority takes six to ten business days." })],
    time_express: [t("Express | takes | 3–5 | business | days.", "„Express“ | keliauja | 3–5 | darbo | dienas.", "„Express“ siunta keliauja 3–5 darbo dienas.", { say: "Express takes three to five business days." })],
    time_first: [t("First-Class | can | take | up to | four | weeks.", "„First-Class“ | gali | keliauti | iki | keturių | savaičių.", "„First-Class“ siunta gali keliauti iki keturių savaičių.")],
    tape: [t("Sure, | the | tape | and | boxes | are | right | over there.", "Žinoma, | — | lipni juosta | ir | dėžės | yra | štai | ten.", "Žinoma, lipni juosta ir dėžės – štai ten.",
      { flags: { 6: "“right” (right over there) = štai, pointing." } })],
    hours: [t("We're | open | until | 5 | on | weekdays | and | until | noon | on | Saturdays.", "Mes | dirbame | iki | 17 val. | — | darbo dienomis | ir | iki | vidurdienio | — | šeštadieniais.",
      "Darbo dienomis dirbame iki 17 val., šeštadieniais – iki vidurdienio.",
      { say: "We're open until five on weekdays and until noon on Saturdays.", flags: { 0: "“We're open” → mes dirbame (we work): the verb carries “are open” (linked to “open”).", 4: "“on”: the instrumental darbo dienomis carries it.", 9: "“on”: the instrumental šeštadieniais carries it." } })],

    // pickup (twist)
    pickup_notice_q: [
      t("Sure! | Do | you | have | the | notice?", "Žinoma! | Ar | jūs | turite | — | pranešimą?", "Žinoma! Ar turite pranešimą?", { flags: { 1: "Question “Do” = the particle ar." } }),
      t("Of course. | Can | I | see | the | slip?", "Žinoma. | Ar galiu | aš | pamatyti | — | pranešimą?", "Žinoma. Ar galiu pamatyti pranešimą?"),
    ],
    notice_thanks: [t("Thank | you.", "Dėkoju | jums.", "Ačiū.")],
    ask_pickup_name: [
      t("That's | okay. | What's | the | name | on | the | package?", "Tai | gerai. | Koks yra | — | vardas | ant | — | siuntinio?", "Nieko tokio. Kokiu vardu siuntinys?"),
    ],
    name_thanks: [t("Thanks. | Let | me | check.", "Ačiū. | Leiskite | man | patikrinti.", "Ačiū. Tuoj patikrinsiu.")],
    ask_pickup_id: [
      t("And | can | I | see | your | ID?", "O | ar galiu | aš | pamatyti | jūsų | asmens dokumentą?", "O ar galiu pamatyti jūsų asmens dokumentą?"),
      t("I'll | also | need | a | photo ID.", "Man | taip pat | reikės | — | dokumento su nuotrauka.", "Man dar reikės dokumento su nuotrauka.",
        { flags: { 0: "“'ll” (will): the future ending of reikės carries it; I'm → the dative man (linked to “need”)." } }),
    ],
    go_get: [
      t("Thanks! | One | moment, | I'll go | get | it.", "Ačiū! | Vieną | akimirką, | nueisiu | paimti | jo.", "Ačiū! Akimirką, tuoj atnešiu."),
    ],
    here_package: [
      t("Here | it | is! | Could | you | sign | here, | please?", "Štai | jis | yra! | Ar galėtumėte | jūs | pasirašyti | čia, | prašau?", "Štai jis! Ar galėtumėte čia pasirašyti?"),
    ],
    ask_pickup_sign: [t("Could | you | sign | here, | please?", "Ar galėtumėte | jūs | pasirašyti | čia, | prašau?", "Ar galėtumėte čia pasirašyti?")],
    pickup_done: [
      t("Perfect. | Here's | your | package!", "Puiku. | Štai | jūsų | siuntinys!", "Puiku. Štai jūsų siuntinys!"),
      t("Thank | you! | Enjoy!", "Dėkoju | jums! | Džiaukitės!", "Ačiū! Džiaukitės!"),
    ],
    need_id_pickup: [
      t("I'm sorry, | I | can't give | it | to you | without | an | ID.", "Atsiprašau, | aš | negaliu atiduoti | jo | jums | be | — | asmens dokumento.",
        "Atsiprašau, be asmens dokumento negaliu jo atiduoti."),
    ],

    bye: [
      t("Have | a | great | day!", "Linkiu | — | puikios | dienos!", "Puikios dienos!"),
      t("Thanks, | and | have | a | good | one!", "Ačiū, | ir | linkiu | — | geros | dienos!", "Ačiū, geros dienos!",
        { flags: { 5: "Prop-word “one” = the day: dienos." } }),
    ],
  },

  domains: {
    price: () => [...new Set(PROFILES.flatMap((p) => [p.priority, p.express, p.first]))],
    total: () => {
      const s = new Set<number>();
      for (const p of PROFILES) for (const svc of [p.priority, p.express, p.first, 0]) for (const ins of [0, INSURANCE]) for (let n = 0; n <= 20; n++) s.add(svc + ins + n * STAMP);
      return [...s].filter((x) => x > 0);
    },
    text: () => [TRACKING],
  },

  hints: {
    send: {
      lt: "Pasakyti, kad nori išsiųsti siuntinį",
      items: [
        { id: "send_like", s: t("I'd like | to send | this | package | to | Lithuania.", "Norėčiau | išsiųsti | šį | siuntinį | į | Lietuvą.", "Norėčiau išsiųsti šį siuntinį į Lietuvą.") },
        { id: "send_could", s: t("Could | I | mail | this | to | Lithuania, | please?", "Ar galėčiau | aš | išsiųsti | tai | į | Lietuvą, | prašau?", "Ar galėčiau tai išsiųsti į Lietuvą?"), register: "polite" },
        { id: "send_need", s: t("I | need | to send | this | box | to | Lithuania.", "Man | reikia | išsiųsti | šią | dėžę | į | Lietuvą.", "Man reikia išsiųsti šią dėžę į Lietuvą.") },
        { id: "send_going", s: t("This | is | going | to | Lithuania.", "Tai | — | keliauja | į | Lietuvą.", "Tai keliauja į Lietuvą.",
          { flags: { 1: "Progressive “is” has no Lithuanian word; keliauja carries the tense (linked to “going”)." } }) },
        { id: "send_want", s: t("I | want | to send | this | to | Lithuania.", "Aš | noriu | išsiųsti | tai | į | Lietuvą.", "Noriu tai išsiųsti į Lietuvą."), register: "casual" },
        { id: "send_have", s: t("I | have | a | package | for | Lithuania.", "Aš | turiu | — | siuntinį | — | Lietuvai.", "Turiu siuntinį į Lietuvą.",
          { flags: { 4: "“for”: the dative Lietuvai carries it." } }) },
        { id: "send_howmuch", s: t("How much | is | it | to send | this | to | Lithuania?", "Kiek | kainuoja | — | išsiųsti | tai | į | Lietuvą?", "Kiek kainuoja tai išsiųsti į Lietuvą?",
          { flags: { 1: "“is” in a price question = kainuoja.", 2: "Dummy “it”: the impersonal kainuoja needs no subject." } }) },
        { id: "send_overseas", s: t("Can | I | mail | this | overseas?", "Ar galiu | aš | išsiųsti | tai | į užsienį?", "Ar galiu tai išsiųsti į užsienį?") },
      ],
    },
    contents: {
      lt: "Pasakyti, kas viduje", slot: "thing", examples: ["scarf", "chocolate", "tea", "clothes"],
      items: [
        { id: "contents_just", s: t("No, | just | {X.np}.", "Ne, | tik | {X.np:nom}.", "Ne, tik {X.np:nom}.") },
        { id: "contents_none", s: t("No, | nothing | like | that.", "Ne, | nieko | panašaus | į tai.", "Ne, nieko panašaus.") },
        { id: "contents_fragile", s: t("Yes, | it's | fragile.", "Taip, | jis yra | dūžtantis.", "Taip, jis dūžta.") },
        { id: "take_out", s: t("Oh, | okay. | I'll take | it | out.", "O, | gerai. | Išimsiu | juos | —.", "O, gerai. Išimsiu juos.",
          { flags: { 4: "“out” (take … out): the prefix iš- of išimsiu carries it." } }) },
      ],
    },
    service: {
      lt: "Pasirinkti siuntimo būdą", slot: "service", examples: ["priority", "express"],
      items: [
        { id: "svc_please", s: t("{X}, | please.", "{X:nom}, | prašau.", "{X:nom}, prašau.") },
        { id: "svc_take", s: t("I'll take | {X}.", "Imsiu | {X:acc}.", "Imsiu {X:acc}.") },
        { id: "svc_cheaper", s: t("The | cheaper | one, | please.", "— | Pigesnį | variantą, | prašau.", "Pigesnį variantą, prašau.",
          { flags: { 2: "Prop-word “one” = the option: variantą." } }) },
        { id: "svc_faster", s: t("The | fastest | one, | please.", "— | Greičiausią | variantą, | prašau.", "Greičiausią variantą, prašau.",
          { flags: { 2: "Prop-word “one” = the option: variantą." } }) },
        { id: "q_cheaper", s: t("Is | there | anything | cheaper?", "Ar yra | — | kas nors | pigesnio?", "Ar yra kas nors pigesnio?",
          { flags: { 1: "Existential “there” has no Lithuanian word; Ar yra carries “Is there”." } }) },
      ],
    },
    ask: {
      lt: "Paklausti apie kainą, laiką ar sekimą",
      items: [
        { id: "q_price", s: t("How much | is | it?", "Kiek | kainuoja | tai?", "Kiek tai kainuoja?", { flags: { 1: "“is” in a price question = kainuoja." } }) },
        { id: "q_long", s: t("How | long | does | it | take?", "Kaip | ilgai | — | jis | keliauja?", "Kiek laiko keliauja?", { flags: { 2: "Question “does” has no Lithuanian word (linked to “take”)." } }) },
        { id: "q_track", s: t("Can | I | track | it?", "Ar galiu | aš | sekti | jį?", "Ar galėsiu jį sekti?") },
        { id: "q_insured", s: t("Is | it | insured?", "Ar | jis | apdraustas?", "Ar jis apdraustas?", { flags: { 0: "“Is” in a question = the particle ar; the participle apdraustas needs no copula." } }) },
        { id: "q_kilos", s: t("How much | is | that | in | kilos?", "Kiek | yra | tai | — | kilogramais?", "Kiek tai kilogramais?", { flags: { 3: "“in”: the instrumental kilogramais carries it." } }) },
      ],
    },
    customs: {
      lt: "Atsakyti į muitinės klausimus",
      items: [
        { id: "value_about", s: t("About | $50.", "Maždaug | 50 dolerių.", "Maždaug 50 dolerių.", { say: "About fifty dollars." }) },
        { id: "value_is", s: t("It's | worth | $60.", "Jis | vertas | 60 dolerių.", "Jis vertas 60 dolerių.", { say: "It's worth sixty dollars.", flags: { 0: "“It's”: the copula is dropped before vertas (linked to “worth”)." } }) },
      ],
    },
    insurance: {
      lt: "Atsakyti dėl draudimo",
      items: [
        { id: "ins_no", s: t("No, | I | don't need | it, | thanks.", "Ne, | man | nereikia | jo, | ačiū.", "Ne, man jo nereikia, ačiū.") },
        { id: "ins_yes", s: t("Yes, | I'd like | extra | insurance.", "Taip, | norėčiau | papildomo | draudimo.", "Taip, norėčiau papildomo draudimo.") },
        { id: "q_insured", s: t("Is | it | insured?", "Ar | jis | apdraustas?", "Ar jis apdraustas?", { flags: { 0: "“Is” in a question = the particle ar; the participle apdraustas needs no copula." } }) },
      ],
    },
    stamps: {
      lt: "Nusipirkti pašto ženklų",
      items: [
        { id: "stamps_could", s: t("Could | I | get | some | stamps | for | postcards?", "Ar galėčiau | aš | gauti | — | pašto ženklų | — | atvirukams?", "Ar galėčiau gauti pašto ženklų atvirukams?",
          { flags: { 3: "Partitive: the genitive pašto ženklų carries “some”.", 5: "“for”: the dative atvirukams carries it." } }) },
        { id: "stamps_need", s: t("I | need | stamps | for | Lithuania.", "Man | reikia | pašto ženklų | — | Lietuvai.", "Man reikia pašto ženklų į Lietuvą.", { flags: { 3: "“for”: the dative Lietuvai carries it." } }) },
        { id: "stamps_qty", s: t("Five, | please.", "Penkių, | prašau.", "Penkių, prašau.") },
      ],
    },
    pay: {
      lt: "Susimokėti",
      items: [
        { id: "pay_card_short", s: t("Card, | please.", "Kortele, | prašau.", "Kortele, prašau.") },
        { id: "pay_card", s: t("Can | I | pay | by card?", "Ar galiu | aš | sumokėti | kortele?", "Ar galiu sumokėti kortele?") },
        { id: "pay_cash", s: t("I'll pay | in cash.", "Sumokėsiu | grynaisiais.", "Sumokėsiu grynaisiais.") },
        { id: "here_you_go", s: t("Here you go.", "Prašom.", "Prašom.") },
      ],
    },
    pickup: {
      lt: "Atsiimti siuntinį",
      items: [
        { id: "pick_like", s: t("I'd like | to pick up | a | package.", "Norėčiau | atsiimti | — | siuntinį.", "Norėčiau atsiimti siuntinį.") },
        { id: "pick_missed", s: t("I | missed | a | delivery.", "Aš | praleidau | — | pristatymą.", "Kurjeris manęs nerado.") },
        { id: "pick_notice", s: t("I | got | this | notice.", "Aš | gavau | šį | pranešimą.", "Gavau šį pranešimą.") },
        { id: "pick_where", s: t("Where's | my | package?", "Kur yra | mano | siuntinys?", "Kur mano siuntinys?") },
        { id: "notice_here", s: t("Here | it | is.", "Štai | jis | yra.", "Štai jis.") },
        { id: "id_here", s: t("Here's | my | passport.", "Štai | mano | pasas.", "Štai mano pasas.") },
        { id: "name_its", s: t("It's | {$name}.", "Tai | {$name}.", "{$name}.") },
      ],
    },
    dest: {
      lt: "Pasakyti, kur siunti",
      items: [
        { id: "dest_to", s: t("To | Lithuania.", "Į | Lietuvą.", "Į Lietuvą.") },
        { id: "dest_mom", s: t("To | my | mom | in Lithuania.", "— | mano | mamai | Lietuvoje.", "Mamai į Lietuvą.",
          { flags: { 0: "“To”: the dative mamai carries it (linked to “mom”)." } }) },
      ],
    },
    items: {
      lt: "Išvardyti, kas dėžėje",
      items: [
        { id: "items_list", s: t("A | scarf, | some | chocolate | and | tea.", "— | Šalikas, | — | šokoladas | ir | arbata.", "Šalikas, šokoladas ir arbata.",
          { flags: { 2: "“some” (partitive): no Lithuanian word in a plain list." } }) },
        { id: "contents_just", s: t("Just | clothes.", "Tik | drabužiai.", "Tik drabužiai.") },
      ],
    },
    remove: {
      lt: "Sutikti išimti tai, ko negalima siųsti",
      items: [
        { id: "take_out", s: t("Oh, | okay. | I'll take | it | out.", "O, | gerai. | Išimsiu | juos | —.", "O, gerai. Išimsiu juos.",
          { flags: { 4: "“out” (take … out): the prefix iš- of išimsiu carries it." } }) },
      ],
    },
    return: {
      lt: "Užrašyti atgalinį adresą",
      items: [
        { id: "return_ok", s: t("Oh, | sorry! | Sure.", "O, | atsiprašau! | Žinoma.", "O, atsiprašau! Žinoma.") },
        { id: "what_return", s: t("What's | a | return | address?", "Kas yra | — | atgalinis | adresas?", "Kas yra siuntėjo adresas?") },
      ],
    },
    gift: {
      lt: "Atsakyti, ar tai dovana",
      items: [
        { id: "gift_yes", s: t("Yes, | it's | a | gift | for | my | mom.", "Taip, | tai yra | — | dovana | — | mano | mamai.", "Taip, tai dovana mamai.", { flags: { 4: "“for”: the dative mamai carries it." } }) },
        { id: "gift_no", s: t("No, | it's | not | a | gift.", "Ne, | tai | nėra | — | dovana.", "Ne, tai ne dovana.", { flags: { 2: "“'s not” = nėra: the negated copula (linked to “it's”)." } }) },
      ],
    },
    sign: {
      lt: "Pasirašyti",
      items: [
        { id: "sign_ok", s: t("Sure.", "Žinoma.", "Žinoma.") },
        { id: "here_you_go", s: t("Here you go.", "Prašom.", "Prašom.") },
        { id: "sign_done", s: t("Okay, | I | signed | it.", "Gerai, | aš | pasirašiau | —.", "Gerai, pasirašiau.", { flags: { 3: "“it”: pasirašyti needs no object here." } }) },
      ],
    },
    stamps_n: {
      lt: "Pasakyti, kiek pašto ženklų reikia",
      items: [
        { id: "stamps_qty", s: t("Five, | please.", "Penkių, | prašau.", "Penkių, prašau.") },
        { id: "stamps_sheet", s: t("A | sheet, | please.", "— | Lapą, | prašau.", "Vieną lapą (10 ženklų), prašau."), note: "„A sheet“ – lapas su 10 pašto ženklų." },
      ],
    },
    notice: {
      lt: "Parodyti pranešimą",
      items: [
        { id: "notice_here", s: t("Here | it | is.", "Štai | jis | yra.", "Štai jis.") },
        { id: "notice_lost", s: t("Sorry, | I | lost | it.", "Atsiprašau, | aš | pamečiau | jį.", "Atsiprašau, pamečiau jį.") },
      ],
    },
    pname: {
      lt: "Pasakyti savo vardą ir pavardę",
      items: [
        { id: "name_its", s: t("It's | {$name} | {$surname}.", "Tai | {$name} | {$surname}.", "{$name} {$surname}.") },
      ],
    },
    pid: {
      lt: "Parodyti asmens dokumentą",
      items: [
        { id: "id_here", s: t("Here's | my | passport.", "Štai | mano | pasas.", "Štai mano pasas.") },
        { id: "here_you_go", s: t("Sure, | here you go.", "Žinoma, | prašom.", "Žinoma, prašom.") },
      ],
    },
    more: {
      lt: "Pasakyti, kad tai viskas",
      items: [
        { id: "more_all", s: t("That's | all, | thank | you.", "Tai yra | viskas, | dėkoju | jums.", "Tai viskas, ačiū.") },
        { id: "more_its", s: t("No, | that's | it, | thanks.", "Ne, | tai yra | viskas, | ačiū.", "Ne, tai viskas, ačiū.") },
      ],
    },
  },

  tips: {
    uk_parcel: { key: "uk_parcel", lt: "Suprasta! Amerikoje dažniau sakoma „package“ (siuntinys).", better: "I'd like to send this package to Lithuania." },
    uk_post: { key: "uk_post", lt: "Suprasta! Amerikoje sakoma „mail“ arba „send“, o ne „post“.", better: "I'd like to mail this to Lithuania." },
    uk_collect: { key: "uk_collect", lt: "Suprasta! Amerikoje dažniau sakoma „pick up a package“.", better: "I'd like to pick up a package." },
  },

  merges: {
    "in line": { reason: "grammatical_fusion", split: "in → į + line → linija is false; the locative eilėje carries “in”.", minimal: "Two words." },
    "in there": { reason: "lexical_expression", split: "in → į + there → ten is false; “in there” = viduje.", minimal: "Two words." },
    "can't go": { reason: "grammatical_fusion", split: "Lithuanian negation is the prefix ne-; “can't go” (of mail) = negalima siųsti.", minimal: "Two words." },
    "up to": { reason: "lexical_expression", split: "up → aukštyn is prohibited as mechanical; “up to” (a limit) = iki.", minimal: "Two words." },
    "as long as": { reason: "lexical_expression", split: "as → kaip + long → ilgas + as → kaip is false; the condition = jei tik.", minimal: "Three words." },
    "go bad": { reason: "lexical_expression", split: "go → eiti + bad → blogas is false; food “goes bad” = sugesti.", minimal: "Two words." },
    "global forever": { reason: "lexical_expression", split: "Global → pasaulinis + Forever → amžinai would translate a stamp's brand name.", minimal: "A two-word name." },
    "go ahead": { reason: "lexical_expression", split: "go → eikite + ahead → pirmyn is a literal reading; an invitation = prašom.", minimal: "Two words." },
    "all set": { reason: "lexical_expression", split: "all → visi + set → nustatyti is false; “all set” = viskas sutvarkyta.", minimal: "Two words." },
    "let's put": { reason: "grammatical_fusion", split: "let's → leiskime + put → padėti is a calque; the first-person plural imperative padėkime carries both.", minimal: "Two words; the object stays outside." },
    "photo id": { reason: "lexical_expression", split: "photo → nuotraukos + ID → dokumento gives “a photo's document”; the compound = dokumentas su nuotrauka.", minimal: "A compound noun." },
    "for today": { reason: "grammatical_fusion", split: "for → už/dėl is false here; “for today” = šiandien.", minimal: "Two words." },
    "here are": { reason: "lexical_expression", split: "here → čia + are → yra gives a statement of place; the presentative formula = štai.", minimal: "Two words." },
    "i'm afraid": { reason: "lexical_expression", split: "I'm → aš esu + afraid → išsigandęs is false; a polite expression of regret = deja.", minimal: "Two words." },
    "how many": { reason: "lexical_expression", split: "how → kaip + many → daug is false; asking a number = kiek.", minimal: "Two words." },
    "over there": { reason: "lexical_expression", split: "over → virš + there → ten is false; pointing = ten.", minimal: "Two words." },
    "to pick up": { reason: "grammatical_fusion", split: "to → į is false (infinitive) and up → aukštyn is prohibited as mechanical; pick up a package = atsiimti.", minimal: "Infinitive marker and particle both belong to the verb." },
    "hi there": { reason: "lexical_expression", split: "there → ten would add a false place; one greeting.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Pasakyk, kad atsiimi siuntinį", done: (c) => pickupPath(c) && !!c.s.pickup, when: pickupPath, optional: true },
    { lt: "Parodyk pranešimą ir dokumentą", done: (c) => pickupPath(c) && !!c.s.pickId, when: pickupPath, optional: true },
    { lt: "Pasirašyk ir pasiimk siuntinį", done: (c) => pickupPath(c) && !!c.s.pickedUp, when: pickupPath, optional: true },
    { lt: "Pasakyk, kad siunti į Lietuvą", done: (c) => sendPath(c) && !!c.s.dest, when: sendPath, optional: true },
    { lt: "Atsakyk, kas dėžėje", done: (c) => sendPath(c) && c.s.contents !== undefined, when: sendPath, optional: true },
    { lt: "Išimk, ko negalima siųsti", done: (c) => sendPath(c) && c.s.perfume === "out", when: (c) => sendPath(c) && !!c.s.perfume, optional: true },
    { lt: "Užrašyk atgalinį adresą", done: (c) => sendPath(c) && !!c.s.returnDone,
      when: (c) => sendPath(c) && !!c.s.returnTwist && !!c.s.sending && !!c.s.weighed, optional: true },
    { lt: "Pasirink siuntimo būdą", done: (c) => sendPath(c) && !!c.s.service, when: sendPath, optional: true },
    { lt: "Užpildyk muitinės deklaraciją", done: (c) => sendPath(c) && customsDone(c), when: sendPath, optional: true },
    { lt: "Susimokėk ir gauk sekimo numerį", done: (c) => sendPath(c) && !!c.s.sent, when: sendPath, optional: true },
  ],

  steps: [
    helpStep("help", false),
    helpStep("help_pickup", true),
    // pickup (twist)
    { id: "pick_notice", when: (c) => !!c.s.pickup && c.s.notice === undefined, done: (c) => c.s.notice !== undefined,
      ask: (c) => c.say("pickup_notice_q"), expects: ["here_you_go", "no_notice"],
      suggest: [{ lt: "Parodyti pranešimą (arba pasakyti, kad jo neturi)", hint: "notice" }],
      yes: (c) => { c.s.notice = true; c.say("notice_thanks"); },
      no: (c) => { c.s.notice = false; } },
    { id: "pick_name", when: (c) => !!c.s.pickup && c.s.notice === false && !c.s.pickName, done: (c) => !!c.s.pickName,
      ask: (c) => c.say("ask_pickup_name"), expects: ["name_ctx", "tracking_ctx"],
      suggest: [{ lt: "Pasakyti savo vardą ir pavardę", hint: "pname" }] },
    { id: "pick_id", when: (c) => !!c.s.pickup && c.s.notice !== undefined && (c.s.notice || !!c.s.pickName) && !c.s.pickId, done: (c) => !!c.s.pickId,
      ask: (c) => c.say("ask_pickup_id"), expects: ["show_doc", "here_you_go", "doc_ctx"],
      suggest: [{ lt: "Parodyti asmens dokumentą", hint: "pid" }],
      yes: (c) => { gotPickupId(c); },
      no: (c) => { c.say("need_id_pickup"); } },
    { id: "pick_sign", when: (c) => !!c.s.pickup && !!c.s.pickId && !c.s.pickedUp, done: (c) => !!c.s.pickedUp,
      ask: (c) => { if (c.s.askedSign && bump(c, "pick_sign") === 0) return; c.say("ask_pickup_sign"); }, expects: ["signed", "here_you_go", "sign_ctx"],
      suggest: [{ lt: "Pasirašyti", hint: "sign" }],
      yes: (c) => { pickedUp(c); } },
    // sending
    { id: "dest", when: sending, done: (c) => !!c.s.dest,
      ask: (c) => c.say("ask_dest"), expects: ["dest_ans"],
      suggest: [{ lt: "Pasakyti, kur siunti", hint: "dest" }] },
    { id: "hazmat", when: (c) => sending(c) && !!c.s.dest, done: (c) => c.s.contents !== undefined,
      ask: (c) => c.say("ask_contents"),
      expects: ["contents_ok", "contents_fragile", "contents_perfume", "contents_liquid", "contents_hazard", "what_hazard"],
      suggest: [{ lt: "Pasakyti, kas viduje (ar nėra skysčių, dūžtančių daiktų, kvepalų)", hint: "contents", options: "thing" }],
      yes: (c) => { c.s.contents = "fragile"; c.s.fragile = true; c.say("fragile_ok"); weigh(c); },
      no: (c) => { c.s.contents = "ok"; c.say("contents_ok"); weigh(c); },
      help: (c) => { c.say("hazard_explain"); } },
    { id: "return_addr", when: (c) => sending(c) && !!c.s.weighed && !!c.s.returnTwist, done: (c) => !!c.s.returnDone,
      ask: (c) => { if (bump(c, "return_addr") === 0) { c.say("return_missing"); c.twist("return_address"); } c.say("return_ask"); },
      expects: ["return_ok", "return_ctx", "what_return"],
      suggest: [{ lt: "Atsiprašyti ir užrašyti savo adresą", hint: "return" }],
      yes: (c) => { c.s.returnDone = true; c.say("return_thanks"); } },
    { id: "service", when: (c) => sending(c) && !!c.s.weighed, done: (c) => !!c.s.service,
      ask: (c) => {
        if (bump(c, "service") === 0) {
          c.say("ask_service");
          c.say("opt_priority", { price: priceOf(c, "priority") });
          c.say("opt_express", { price: priceOf(c, "express") });
        } else c.say("ask_service_again");
      },
      expects: ["service_ans", "ask_cheaper", "ask_faster", "service_not"],
      suggest: [{ lt: "Pasirinkti siuntimo būdą", hint: "service", options: "service" }, { lt: "Paklausti, ar yra pigiau", hint: "service" }],
      help: (c) => { c.say("opt_priority", { price: priceOf(c, "priority") }); c.say("opt_express", { price: priceOf(c, "express") }); } },
    { id: "contents_list", when: (c) => sending(c) && !!c.s.service && !c.s.items, done: (c) => !!c.s.items,
      ask: (c) => { if (!c.s.customsIntro) { c.s.customsIntro = true; c.say("customs_intro"); } c.say("ask_what_inside"); },
      expects: ["contents_ok"],
      suggest: [{ lt: "Išvardyti, kas dėžėje", hint: "items" }] },
    { id: "value", when: (c) => sending(c) && !!c.s.service && !!c.s.items, done: (c) => c.s.value !== undefined,
      ask: (c) => { if (!c.s.customsIntro) { c.s.customsIntro = true; c.say("customs_intro"); } c.say("ask_value"); },
      expects: ["value_ans", "value_ctx"],
      suggest: [{ lt: "Pasakyti apytikslę vertę doleriais", hint: "customs" }],
      help: (c) => { c.say("value_help"); } },
    { id: "gift", when: (c) => sending(c) && c.s.value !== undefined && !!c.s.askGift, done: (c) => c.s.gift !== undefined,
      ask: (c) => c.say("ask_gift"), expects: ["gift_yes", "gift_no"],
      suggest: [{ lt: "Atsakyti, ar tai dovana", hint: "gift" }],
      yes: (c) => { c.s.gift = true; c.say("gift_mark"); },
      no: (c) => { c.s.gift = false; c.say("gift_not"); } },
    { id: "sign_customs", when: (c) => sending(c) && c.s.value !== undefined && (!c.s.askGift || c.s.gift !== undefined), done: (c) => !!c.s.customsSigned,
      ask: (c) => c.say("sign_customs"), expects: ["signed", "here_you_go", "sign_ctx"],
      suggest: [{ lt: "Pasirašyti deklaraciją", hint: "sign" }],
      yes: (c) => { c.s.customsSigned = true; c.event("sign"); c.say("signed_thanks"); } },
    { id: "insurance", when: (c) => sending(c) && customsDone(c) && !!c.s.askInsurance && c.s.service !== "first", done: (c) => c.s.insurance !== undefined && c.s.insurance !== "ask",
      ask: (c) => c.say("ask_insurance"), expects: ["insurance_yes", "insurance_no"],
      suggest: [{ lt: "Atsakyti dėl papildomo draudimo", hint: "insurance" }],
      yes: (c) => { c.s.insurance = true; c.say("insurance_added"); },
      no: (c) => { c.s.insurance = false; c.say("no_problem"); } },
    { id: "stamps_offer", when: (c) => sending(c) && customsDone(c) && !!c.s.offerStamps && c.s.stamps === undefined, done: (c) => c.s.stamps !== undefined,
      ask: (c) => c.say("offer_stamps"), expects: ["buy_stamps", "stamps_qty", "no_stamps"],
      suggest: [{ lt: "Atsakyti, ar reikia pašto ženklų", hint: "g_yesno" }, { lt: "Nusipirkti pašto ženklų atvirukams", hint: "stamps" }],
      yes: (c) => { c.s.stamps = "ask"; c.say("stamps_info"); c.say("stamps_price"); c.hold(); },
      no: (c) => { c.s.stamps = false; } },
    { id: "stamps_qty", when: (c) => c.s.stamps === "ask", done: (c) => c.s.stamps !== "ask",
      ask: (c) => c.say("stamps_price"), expects: ["stamps_qty", "stamps_ctx", "no_stamps"],
      suggest: [{ lt: "Pasakyti, kiek pašto ženklų reikia", hint: "stamps_n" }],
      no: (c) => { c.s.stamps = false; c.say("no_problem"); } },
    { id: "pay", when: readyToPay, done: (c) => !!c.s.paid,
      ask: (c) => {
        if (bump(c, "pay") === 0) { c.say("say_total", { total: total(c) }); if (c.s.askPay) c.say("ask_pay"); }
        else c.say("say_total", { total: total(c) });
      },
      expects: ["pay_card", "pay_cash", "pay_phone", "here_you_go"],
      suggest: [{ lt: "Susimokėti kortele ar grynaisiais", hint: "pay" }] },
    // anything else
    { id: "more", when: (c) => !!c.s.task, done: (c) => !!c.s.moreDone,
      ask: (c) => c.say("ask_more"), expects: ["more_no", "buy_stamps"],
      suggest: [{ lt: "Pasakyti, kad tai viskas", hint: "more" }, S_STAMPS],
      // "Is that everything for today?" (ask_more variant 1) turns a bare yes/no around
      yes: (c) => { if (askedEverything(c)) { c.s.moreDone = true; return; } c.say("ask_more_yes"); c.hold(); },
      no: (c) => { if (askedEverything(c)) { c.say("ask_more_yes"); c.hold(); return; } c.s.moreDone = true; } },
  ],

  init: (c) => {
    c.s.profile = c.chance(0.5) ? 0 : 1;
    c.s.pickupTwist = c.visits >= 1 && c.chance(0.5);
    c.s.returnTwist = c.visits >= 1 && c.chance(0.35);
    c.s.askGift = c.chance(0.6);
    c.s.askInsurance = c.chance(0.5);
    c.s.offerStamps = c.chance(0.4);
    c.s.askPay = c.chance(0.5);
    c.s.trackTip = c.chance(0.6);
  },

  start: (c) => {
    c.ask(c.s.pickupTwist ? "help_pickup" : "help");
  },

  handlers: {
    send_package(c, slots) {
      const dest = slots.dest;
      const had = c.s.sending;
      startSending(c, dest);
      if (dest && !had) c.say(dest === "lithuania" ? "dest_lt" : "dest_other");
    },
    dest_ans(c, slots) {
      if (!c.s.sending) startSending(c);
      if (c.s.dest && c.s.dest === slots.dest) return;
      c.s.dest = slots.dest;
      c.say(slots.dest === "lithuania" ? "dest_lt" : "dest_other");
      weigh(c);
    },
    pickup(c) {
      c.s.task = c.s.task || "pickup";
      c.s.moreDone = false;
      if (c.s.pickup) return;
      c.s.pickup = true;
      c.twist("pickup");
      if (/notice|slip|note|card/.test(c.heard.toLowerCase()) && c.s.notice === undefined) { c.s.notice = true; c.say("notice_thanks"); }
    },
    buy_stamps(c) {
      c.s.task = c.s.task || "stamps";
      c.s.moreDone = false;
      if (c.s.stampQty) { c.say("stamps_ok"); return; }
      c.s.stamps = "ask";
      c.say("stamps_info");
    },

    // --- sending
    contents_ok(c, slots, seg) {
      if (!c.s.sending) startSending(c);
      const tags = seg.tags;
      if (tags.includes("perfume")) { post.handlers.contents_perfume(c, {}, seg); return; }
      const listed = slots.thing != null || /\b(scarf|chocolate|tea|clothes|clothing|books?|toys?|candy|cookies|coffee|photos|pictures|souvenirs|gifts?|presents?|sweaters?|socks|shirts?|snacks|sweets)\b/i.test(c.heard);
      if (listed) c.s.items = true;
      if (c.s.contents === undefined) {
        firstInTurn(c, "contents");
        c.s.contents = tags.includes("fragile") ? "fragile" : "ok";
        if (tags.includes("fragile")) { c.s.fragile = true; c.say("fragile_ok"); }
        else if (tags.includes("liquid")) c.say("liquid_ok");
        else c.say("contents_ok");
        weigh(c);
        return;
      }
      if (c.step === "contents_list" && firstInTurn(c, "contents")) { c.say("contents_ok"); }
    },
    contents_fragile(c) {
      if (!c.s.sending) startSending(c);
      if (c.s.fragile) return;
      c.s.fragile = true;
      if (c.s.contents === undefined) c.s.contents = "fragile";
      c.say("fragile_ok");
      weigh(c);
    },
    contents_perfume(c) {
      if (!c.s.sending) startSending(c);
      c.s.perfume = c.s.perfume || "asked";
      c.twist("perfume");
      c.say("perfume_no");
      c.say("perfume_out");
      c.expect({
        id: "perfume", expects: ["take_out"], hints: ["contents", "g_yesno"],
        suggest: [{ lt: "Sutikti išimti kvepalus", hint: "remove" }],
        yes: (cc) => { perfumeOut(cc); },
        no: (cc) => { cc.say("perfume_rule"); },
        on: { take_out: (cc) => { perfumeOut(cc); }, g_ok: (cc) => { perfumeOut(cc); }, g_sorry: (cc) => { perfumeOut(cc); } },
        ask: (cc) => cc.say("perfume_out"),
      });
    },
    contents_liquid(c) {
      if (!c.s.sending) startSending(c);
      c.say("liquid_ok");
      if (c.s.contents === undefined) { c.s.contents = "ok"; weigh(c); }
    },
    contents_hazard(c) {
      c.s.perfume = c.s.perfume || "asked";
      c.say("battery_no");
      c.say("perfume_out");
      c.expect({
        id: "perfume", expects: ["take_out"], hints: ["contents", "g_yesno"],
        suggest: [{ lt: "Sutikti išimti baterijas", hint: "remove" }],
        yes: (cc) => { perfumeOut(cc); }, no: (cc) => { cc.say("perfume_rule"); },
        on: { take_out: (cc) => { perfumeOut(cc); }, g_ok: (cc) => { perfumeOut(cc); } },
        ask: (cc) => cc.say("perfume_out"),
      });
    },
    take_out(c) { c.say("perfume_thanks"); },
    what_hazard(c) { c.say("hazard_explain"); },
    service_ans(c, slots, seg) {
      let svc = slots.service as string | undefined;
      if (!svc && seg.tags.includes("cheap")) svc = prof(c).first ? "first" : "priority";
      if (!svc && seg.tags.includes("fast")) svc = "express";
      if (!svc && seg.tags.includes("std")) svc = "priority";
      if (!svc && seg.tags.includes("first")) svc = "priority";
      if (!svc && seg.tags.includes("second")) svc = "express";
      if (!svc && seg.tags.includes("third")) svc = prof(c).first && c.s.toldFirst ? "first" : undefined;
      if (!svc) return;
      if (!c.s.sending) startSending(c);
      if (svc === "first" && c.step === "service" && !c.s.toldFirst && prof(c).first) {
        c.s.toldFirst = true;
        c.say("opt_first", { price: priceOf(c, "first") });
      }
      setService(c, svc);
    },
    service_not(c, slots) {
      const other = slots.service === "express" ? "priority" : slots.service === "priority" ? "express" : undefined;
      if (/expensive/.test(c.heard.toLowerCase())) { setService(c, "priority"); return; }
      if (other && c.step === "service") setService(c, other);
      else c.say("no_problem");
    },
    ask_cheaper(c) {
      if (prof(c).first) { c.s.toldFirst = true; c.say("opt_first", { price: priceOf(c, "first") }); }
      else c.say("no_cheaper");
    },
    ask_faster(c) { c.say("fastest"); },
    ask_options(c) {
      c.say("opt_priority", { price: priceOf(c, "priority") });
      c.say("opt_express", { price: priceOf(c, "express") });
    },
    ask_price(c, slots) {
      const svc = slots.service ?? (/express/.test(c.heard.toLowerCase()) ? "express" : /priority/.test(c.heard.toLowerCase()) ? "priority" : c.s.service);
      if (c.s.paid || (!svc && c.s.service === undefined && !c.s.weighed)) {
        if (!c.s.weighed && c.s.sending) { weigh(c); }
        if (!svc && !c.s.service) { c.say("opt_priority", { price: priceOf(c, "priority") }); c.say("opt_express", { price: priceOf(c, "express") }); return; }
      }
      if (svc === "first") { c.say("opt_first", { price: priceOf(c, "first") }); return; }
      if (svc === "express") { c.say("opt_express", { price: priceOf(c, "express") }); return; }
      if (svc === "priority") { c.say("opt_priority", { price: priceOf(c, "priority") }); return; }
      if (total(c) > 0) c.say("say_total", { total: total(c) });
      else { c.say("opt_priority", { price: priceOf(c, "priority") }); c.say("opt_express", { price: priceOf(c, "express") }); }
    },
    ask_time(c, slots) {
      const svc = slots.service ?? c.s.service;
      if (svc === "express") c.say("time_express");
      else if (svc === "first") c.say("time_first");
      else if (svc === "priority") c.say("time_priority");
      else { c.say("time_priority"); c.say("time_express"); }
    },
    ask_tracking(c) { c.say(c.s.sent ? "tracking_on_receipt" : "tracking_yes"); },
    ask_insured(c) { c.say(c.s.service === "first" ? "no_problem" : "insured_info"); },
    ask_kilos(c) { if (c.s.weighed) c.say(prof(c).kilos); else weigh(c); },
    ask_customs(c) { c.say("customs_explain"); },
    what_write(c) { c.say("write_help"); },
    value_ans(c, slots) {
      if (c.s.value !== undefined && c.step !== "value") { c.say("contents_ok"); return; }
      c.s.value = slots.price ?? 2000;
      if (!c.s.items) c.s.items = true;
      c.say("contents_ok");
    },
    value_ctx(c, slots) { post.handlers.value_ans(c, slots, { intent: "value_ans", slots, tags: [] }); },
    gift_yes(c) {
      if (c.s.gift === true) return;
      c.s.gift = true;
      if (c.s.askGift && c.s.value !== undefined) c.say("gift_mark");
    },
    gift_no(c) { c.s.gift = false; if (c.step === "gift") c.say("gift_not"); },
    return_ok(c) { if (c.step === "return_addr" || c.s.returnTwist) { c.s.returnDone = true; c.say("return_thanks"); } },
    return_ctx(c) { post.handlers.return_ok(c, {}, { intent: "return_ok", slots: {}, tags: [] }); },
    what_return(c) { c.say("return_explain"); },
    insurance_yes(c) { if (c.s.insurance === true) return; c.s.insurance = true; c.say("insurance_added"); },
    insurance_no(c) { c.s.insurance = false; c.say("no_problem"); },
    stamps_qty(c, slots, seg) {
      let n = slots.number as number | undefined;
      if (seg.tags.includes("sheet")) n = 10;
      if (!n && /\bone\b/.test(c.heard.toLowerCase())) n = 1;
      if (!n || n > 50) { c.say("stamps_price"); c.hold(); return; }
      c.s.stampQty = n;
      c.s.stamps = true;
      if (!c.s.task) c.s.task = "stamps";
      c.say("stamps_sure");
    },
    stamps_ctx(c, slots, seg) { post.handlers.stamps_qty(c, slots, seg); },
    no_stamps(c) { if (c.s.stampQty) { c.say("no_problem"); return; } const asked = c.s.stamps === "ask"; c.s.stamps = false; if (asked) c.say("no_problem"); },

    // --- paying
    pay_card(c) { pay(c, "card"); },
    pay_cash(c) { pay(c, "cash"); },
    pay_phone(c) { pay(c, "phone"); },
    here_you_go(c) {
      switch (c.step) {
        case "pick_notice": c.s.notice = true; c.say("notice_thanks"); return;
        case "pick_id": gotPickupId(c); return;
        case "pick_sign": pickedUp(c); return;
        case "sign_customs": c.s.customsSigned = true; c.event("sign"); c.say("signed_thanks"); return;
        case "pay": pay(c, c.s.payMethod || "cash"); return;
        default: c.say("signed_thanks");
      }
    },

    // --- pickup
    doc_ctx(c, slots, seg) { post.handlers.show_doc(c, slots, seg); },
    show_doc(c) {
      if (c.s.pickup && !c.s.pickId) { gotPickupId(c); return; }
      c.say("signed_thanks");
    },
    no_notice(c) { if (c.s.notice === undefined) c.s.notice = false; },
    name_ctx(c, slots) {
      const part = String(slots.name || "").trim();
      if (part && !/\s/.test(part) && notAName(c, part)) return;
      if (!c.s.pickName) { c.s.pickName = part || "?"; c.say("name_thanks"); }
    },
    tracking_ctx(c) { if (!c.s.pickName) { c.s.pickName = "tracking"; c.say("name_thanks"); } },
    sign_ctx(c) { post.handlers.signed(c, {}, { intent: "signed", slots: {}, tags: [] }); },
    signed(c) {
      if (/\bwhere\b/.test(c.heard.toLowerCase())) { c.say(c.step === "pick_sign" ? "ask_pickup_sign" : "sign_customs"); c.hold(); return; }
      if (c.step === "pick_sign") { pickedUp(c); return; }
      if (c.step === "sign_customs") { c.s.customsSigned = true; c.event("sign"); c.say("signed_thanks"); return; }
      c.say("signed_thanks");
    },

    // --- general
    more_no(c) {
      const st = post.steps.find((x) => x.id === c.step);
      if (st && st.id !== "more" && st.no && !st.done(c)) { st.no(c); return; }
      c.s.moreDone = true;
    },
    need_tape(c) { c.say("tape"); },
    ask_open(c) { c.say("hours"); },
  },

  finish: (c) => {
    if (c.s.sent || c.s.pickedUp) c.complete();
    c.say("bye");
    c.expect({ id: "closing", hints: ["g_social"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    { say: "Hi! I'd like to send this package to Lithuania.", intent: "send_package", slots: { dest: "lithuania" } },
    { say: "Could I mail this to Lithuania, please?", intent: "send_package", slots: { dest: "lithuania" } },
    { say: "I need to send this box to my mom in Kaunas.", intent: "send_package", slots: { dest: "lithuania" } },
    { say: "I'd like to post this parcel to Lithuania.", intent: "send_package" },
    { say: "This is going to Lithuania.", intent: "send_package" },
    { say: "To Lithuania.", intent: "dest_ans", step: "dest", slots: { dest: "lithuania" } },
    { say: "Vilnius", intent: "dest_ans", step: "dest", slots: { dest: "lithuania" } },
    { say: "No, just a scarf, chocolate and tea.", intent: "contents_ok", step: "hazmat" },
    { say: "No, nothing like that.", intent: "contents_ok", step: "hazmat" },
    { say: "Yes, there's a glass vase.", intent: "contents_fragile", step: "hazmat", not: ["contents_ok"] },
    { say: "There's a bottle of perfume.", intent: "contents_perfume", step: "hazmat" },
    { say: "What does perishable mean?", intent: "what_hazard", step: "hazmat" },
    { say: "Priority, please.", intent: "service_ans", step: "service", slots: { service: "priority" } },
    { say: "I'll take Express.", intent: "service_ans", step: "service", slots: { service: "express" } },
    { say: "The cheaper one, please.", intent: "service_ans", step: "service" },
    { say: "Not express.", intent: "service_not", step: "service", not: ["service_ans"] },
    { say: "Is there anything cheaper?", intent: "ask_cheaper", step: "service" },
    { say: "How long does it take?", intent: "ask_time" },
    { say: "How much is that in kilos?", intent: "ask_kilos" },
    { say: "About fifty dollars.", intent: "value_ans", step: "value", slots: { price: 5000 } },
    { say: "Sixty", intent: "value_ctx", step: "value", slots: { price: 6000 } },
    { say: "Yes, it's a gift for my mom.", intent: "gift_yes", step: "gift" },
    { say: "No, it's not a gift.", intent: "gift_no", step: "gift", not: ["gift_yes"] },
    { say: "No, I don't need it, thanks.", intent: "insurance_no", step: "insurance", not: ["insurance_yes"] },
    { say: "Could I get some stamps for postcards?", intent: "buy_stamps" },
    { say: "Five, please.", intent: "stamps_ctx", step: "stamps_qty", slots: { number: 5 } },
    { say: "I need ten stamps.", intent: "stamps_qty", slots: { number: 10 } },
    { say: "Can I pay by card?", intent: "pay_card", step: "pay" },
    { say: "Can I track it?", intent: "ask_tracking" },
    { say: "I'd like to pick up a package.", intent: "pickup" },
    { say: "I missed a delivery.", intent: "pickup" },
    { say: "Where's my parcel?", intent: "pickup" },
    { say: "I got this notice.", intent: "pickup" },
    { say: "I'd like to collect my parcel.", intent: "pickup" },
    { say: "No, I lost it.", intent: "no_notice", step: "pick_notice" },
    { say: "Here's my passport.", intent: "show_doc", step: "pick_id" },
    { say: "Tomas Mikalauskas", intent: "name_ctx", step: "pick_name" },
    { say: "Oh, sorry! Sure.", intent: "return_ctx", step: "return_addr" },
    { say: "Sorry?", intent: "g_repeat", step: "return_addr" },
    { say: "Sorry?", intent: "g_repeat", step: "pick_name" },
    { say: "What's a return address?", intent: "what_return", step: "return_addr" },
    { say: "That's all, thank you.", intent: "more_no", step: "more" },
    { say: "Could you write it down, please?", intent: "g_write" },
    { say: "There's some maple syrup inside.", intent: "contents_liquid", step: "hazmat" },
    { say: "Yes, there are some batteries in it.", intent: "contents_hazard", step: "hazmat" },
    { say: "Which one is faster?", intent: "ask_faster", step: "service" },
    { say: "How much is Express?", intent: "ask_price" },
    { say: "Is it insured?", intent: "ask_insured" },
    { say: "What should I write?", intent: "what_write" },
    { say: "Yes, I'd like extra insurance.", intent: "insurance_yes", step: "insurance" },
    { say: "Can I pay in cash?", intent: "pay_cash", step: "pay" },
    { say: "Here you go.", intent: "here_you_go", step: "pay" },
    { say: "Do you have some tape?", intent: "need_tape" },
    { say: "What time do you close?", intent: "ask_open" },
    { say: "The weather is purple today", intent: "none" },
    { say: "Tomas Mikalauskas", intent: "none" },
    { say: "I don't want to send it to Lithuania", intent: "none" },
    // more constructions and vocabulary (dev corpus tests/corpus/s79-post.json)
    { say: "Package to Lithuania, please", intent: "send_package", step: "help", slots: { dest: "lithuania" } },
    { say: "Hi! Can you help me send this to Kaunas?", intent: "send_package", step: "help", slots: { dest: "lithuania" } },
    { say: "How much to send this to Lithuania?", intent: "send_package", step: "help" },
    { say: "Just some Christmas presents", intent: "contents_ok", step: "hazmat", slots: { thing: "souvenirs" } },
    { say: "No, everything is okay", intent: "contents_ok", step: "hazmat" },
    { say: "Some clothes, shoes and a book", intent: "contents_ok", step: "contents_list" },
    { say: "The fast one", intent: "service_ans", step: "service" },
    { say: "Priority, I'm not in a hurry", intent: "service_ans", step: "service", slots: { service: "priority" } },
    { say: "I want the cheapest way", intent: "service_ans", step: "service" },
    { say: "About 50 euros", intent: "value_ans", step: "value", slots: { price: 5000 } },
    { say: "Yes, for my mom", intent: "gift_yes", step: "gift" },
    { say: "No, they're my own clothes", intent: "gift_no", step: "gift", not: ["gift_yes"] },
    { say: "Yes, for postcards to Lithuania", intent: "buy_stamps", step: "stamps_offer" },
    { say: "Is Apple Pay okay?", intent: "pay_phone", step: "pay" },
    { say: "Oh, I forgot. Sorry!", intent: "return_ok", step: "return_addr" },
    { say: "Okay, no perfume then", intent: "take_out" },
    { say: "I left the notice at home", intent: "no_notice", step: "pick_notice", not: ["here_you_go"] },
    { say: "Passport", intent: "doc_ctx", step: "pick_id" },
    { say: "The tracking number is 9400 1234 5678", intent: "tracking_ctx", step: "pick_name" },
    { say: "The mailman came but I wasn't home", intent: "pickup" },
    // safety
    { say: "No, it's not expensive", intent: "insurance_no", step: "insurance", not: ["insurance_yes"] },
    { say: "There's no glass", intent: "contents_ok", step: "hazmat", not: ["contents_fragile"] },
    { say: "I don't need stamps", intent: "no_stamps", step: "stamps_offer", not: ["buy_stamps", "stamps_qty"] },
  ],

  sims: [
    { name: "send to Lithuania, happy path",
      turns: ["Hi! I'd like to send this package to Lithuania.", "No, just a scarf, chocolate and tea.", "Priority, please.", "About fifty dollars.", "Sure.", "Card, please.", "That's all, thank you."],
      expect: { complete: true }, auto: POST_AUTO },
    { name: "questions and a cheaper option",
      turns: ["Hello! Can I send this to my mom in Kaunas?", "What does perishable mean?", "No, nothing like that.", "How much is that in kilos?", "Is there anything cheaper?", "How long does it take?", "I'll take Priority.", "It's a scarf and some chocolate.", "Around sixty dollars.", "Okay, done.", "Can I pay in cash?", "Here you go.", "Can I track it?", "No, that's it, thanks."],
      expect: { complete: true }, auto: POST_AUTO },
    { name: "perfume has to come out",
      turns: ["Hi, I need to send this box to Lithuania.", "There's a bottle of perfume.", "Oh, okay. I'll take it out.", "Express, please.", "Just clothes and books.", "About eighty dollars.", "Sure.", "I'll pay by card.", "Nothing else, thanks."],
      expect: { complete: true }, auto: POST_AUTO },
    { name: "picking up a package (twist), then sending one",
      turns: ["Hi, I got this notice. I missed a delivery.", "Here's my passport.", "Sure.", "I'd also like to send this box to Lithuania.", "No, just a scarf.", "Express, please.", "About thirty dollars.", "Okay, done.", "Card.", "That's all, thanks."],
      expect: { complete: true }, auto: POST_AUTO },
    { name: "no notice, just the name",
      turns: ["Where's my package? I missed a delivery.", "No, I lost it.", "Tomas Mikalauskas", "Here's my passport.", "Sure.", "No, that's it, thanks."],
      expect: { complete: true }, auto: POST_AUTO },
    { name: "stamps too",
      turns: ["Hi. I'd like to mail this to Lithuania.", "No, it's just clothes.", "Priority, please.", "About forty dollars.", "Sure.", "Could I also get some stamps for postcards?", "Five, please.", "Card.", "That's all, thanks."],
      expect: { complete: true }, auto: POST_AUTO },
  ],
};

/** Gloria's last question was "Is that everything for today?" (a yes means "that's all"). */
function askedEverything(c: Ctx): boolean {
  return ((c as ConvCtx).conv?.lastLines ?? []).some((l) => l.lineId === "ask_more" && l.variant === 1);
}

function perfumeOut(c: Ctx) {
  c.s.perfume = "out";
  c.say("perfume_thanks");
  if (c.s.contents === undefined) { c.s.contents = "ok"; weigh(c); }
}

function gotPickupId(c: Ctx) {
  if (c.s.pickId) return;
  c.s.pickId = true;
  c.say("go_get");
  c.say("here_package");
  c.s.askedSign = true;
}

function pickedUp(c: Ctx) {
  if (c.s.pickedUp) return;
  c.s.pickedUp = true;
  c.event("sign");
  c.s.served = true;
  c.say("pickup_done");
  c.event("give", { item: "package" });
  c.s.donePath = c.s.donePath || "pickup";
  c.complete();
}

function pay(c: Ctx, method: string) {
  if (!readyToPay(c) || c.step !== "pay") {
    if (c.s.paid) { c.say("no_problem"); return; }
    c.s.payMethod = method;
    c.say("pay_later");
    return;
  }
  c.s.paid = true;
  c.s.payMethod = method;
  if (method === "card") c.say("card_tap");
  else if (method === "phone") c.say("phone_ok");
  else c.say("cash_change");
  c.event("pay", { method, amount: total(c) });
  if (c.s.sending && !c.s.sent) { finishSending(c); if (c.s.stampQty) c.say("stamps_here"); }
  else { c.say("stamps_here"); c.s.served = true; }
}

export default post;
