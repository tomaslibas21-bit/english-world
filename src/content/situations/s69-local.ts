// Song 69 "What Would You Recommend?" — asking a local for tips.
// Town Square, Rosa: a warm, older local on a bench, born and raised in Maple Harbor.
// The learner asks where to eat (Rosa asks what they feel like and respects the budget) and what
// to see, then follows up like a real visitor: walking distance, touristy?, best time to go,
// price, booking, opening hours, safety at night, where the locals go, nightlife, best coffee.
// Goal = one food tip + one sightseeing tip. Rosa volunteers the missing one if the learner doesn't ask.
// Twists: Rosa offers to walk with you (visits ≥ 1); on a later visit she asks if you tried her tip.
// Facts match s62 (Chuck): the museum is across Town Square, jazz on Friday at seven, the farmers'
// market on Saturday 8–1, the lighthouse ~30 minutes along the water.

import type { Ctx, EntityDef, Handler, HintItem, SentSrc, SituationDef } from "../types";
import type { ConvCtx } from "../../convo/dialogue";
import { ent, t } from "../dsl";
import { GLOBAL_HANDLERS } from "../global";

// ---------------------------------------------------------------------------
// Places Rosa knows, kinds of food, countries

const SPOTS: EntityDef[] = [
  ent("pier", "The Pier", "restoranas „The Pier“/restorano „The Pier“/restoranui „The Pier“/restoraną „The Pier“/restoranu „The Pier“/restorane „The Pier“", "m",
    { chip: "restoranas „The Pier“", forms: ["pier", "the pier restaurant", "pier restaurant", "the seafood place", "the seafood restaurant"], attrs: { kind: "food" } }),
  ent("trucks", "food | trucks", "maisto | furgonėliai/furgonėlių/furgonėliams/furgonėlius/furgonėliais/furgonėliuose", "m",
    { chip: "maisto furgonėliai", forms: ["the food trucks", "the food truck", "a food truck", "the trucks", "the taco truck", "the taco trucks", "the fish taco place", "the food carts"], attrs: { kind: "food", the: true } }),
  ent("trattoria", "Lucia's", "restoranas „Lucia's“/restorano „Lucia's“/restoranui „Lucia's“/restoraną „Lucia's“/restoranu „Lucia's“/restorane „Lucia's“", "m",
    { chip: "restoranas „Lucia's“", forms: ["lucias", "lucia's trattoria", "lucias trattoria", "lucia", "the trattoria", "the italian place", "the italian restaurant", "luchias"], attrs: { kind: "food" } }),
  ent("sunny_cup", "Sunny Cup", "kavinė „Sunny Cup“/kavinės „Sunny Cup“/kavinei „Sunny Cup“/kavinę „Sunny Cup“/kavine „Sunny Cup“/kavinėje „Sunny Cup“", "f",
    { chip: "kavinė „Sunny Cup“", forms: ["the sunny cup", "sunny cup cafe", "sunny cafe", "the cafe", "that cafe", "the coffee shop"], attrs: { kind: "food" } }),
  ent("lighthouse", "lighthouse", "švyturys/švyturio/švyturiui/švyturį/švyturiu/švyturyje", "m",
    { chip: "švyturys", forms: ["the lighthouse", "the light house", "the old lighthouse"], attrs: { kind: "sight", the: true } }),
  ent("museum", "museum", "muziejus/muziejaus/muziejui/muziejų/muziejumi/muziejuje", "m",
    { chip: "meno muziejus", forms: ["the museum", "the art museum", "art museum", "the museum of art"], attrs: { kind: "sight", the: true } }),
  ent("park", "Harbor | Park", "Uosto | parkas/parko/parkui/parką/parku/parke", "m",
    { chip: "Uosto parkas", forms: ["the harbor park", "the park"], attrs: { kind: "sight" } }),
  ent("market", "farmers' | market", "ūkininkų | turgus/turgaus/turgui/turgų/turgumi/turguje", "m",
    { chip: "ūkininkų turgus", forms: ["the farmers market", "the farmers' market", "farmer's market", "the farmer's market", "the market"], attrs: { kind: "sight", the: true } }),
  ent("boat", "boat | tour", "laivo | ekskursija/ekskursijos/ekskursijai/ekskursiją/ekskursija/ekskursijoje", "f",
    { chip: "ekskursija laivu", forms: ["the boat tour", "the boat trip", "boat trip", "the harbor tour", "the harbor cruise", "the boat ride", "a boat tour", "a boat trip"], attrs: { kind: "sight", the: true } }),
  ent("jazz", "jazz", "džiazas/džiazo/džiazui/džiazą/džiazu/džiaze", "m",
    { chip: "džiazo vakaras", forms: ["the jazz", "the jazz night", "the jazz concert", "the concert", "the live music"], attrs: { kind: "night", the: true } }),
];

const CUISINES: EntityDef[] = [
  ent("seafood", "seafood", "jūros gėrybės/jūros gėrybių/jūros gėrybėms/jūros gėrybes/jūros gėrybėmis/jūros gėrybėse", "f",
    { chip: "jūros gėrybės", attrs: { pl: true }, forms: ["sea food", "fish", "fresh fish", "lobster", "lobster rolls", "clam chowder", "chowder", "shrimp", "oysters", "fish and chips"] }),
  ent("italian", "Italian | food", "itališkas/itališko/itališkam/itališką/itališku/itališkame | maistas/maisto/maistui/maistą/maistu/maiste", "m",
    { chip: "itališkas maistas", forms: ["italian", "pasta", "pizza", "lasagna", "an italian place"] }),
  ent("coffee", "coffee", "kava/kavos/kavai/kavą/kava/kavoje", "f", { chip: "kava", forms: ["a coffee", "good coffee", "a coffee place"] }),
  ent("breakfast", "breakfast", "pusryčiai/pusryčių/pusryčiams/pusryčius/pusryčiais/pusryčiuose", "m", { chip: "pusryčiai", attrs: { pl: true }, forms: ["brunch", "a good breakfast", "pancakes"] }),
  ent("burgers", "burgers", "mėsainiai/mėsainių/mėsainiams/mėsainius/mėsainiais/mėsainiuose", "m",
    { chip: "mėsainiai", attrs: { pl: true }, forms: ["burger", "a burger", "hamburgers", "a hamburger", "tacos", "fish tacos", "street food", "fast food"] }),
  ent("vegetarian", "vegetarian | food", "vegetariškas/vegetariško/vegetariškam/vegetarišką/vegetarišku/vegetariškame | maistas/maisto/maistui/maistą/maistu/maiste", "m",
    { chip: "vegetariškas maistas", forms: ["vegetarian", "vegan", "vegan food", "something vegetarian", "salad", "salads"] }),
  ent("quick", "something | quick", "kažkas/kažko/kažkam/kažką/kažkuo/kažkame | greito", "m",
    { chip: "kažkas greito", forms: ["something fast", "a quick lunch", "a quick bite", "a snack", "something light", "a sandwich", "sandwiches", "something small"] }),
  ent("local", "local | food", "vietinis/vietinio/vietiniam/vietinį/vietiniu/vietiniame | maistas/maisto/maistui/maistą/maistu/maiste", "m",
    { chip: "vietinis maistas", forms: ["local", "something local", "local specialties", "american food", "something typical", "typical food", "something american", "american"] }),
];

const COUNTRIES: EntityDef[] = [
  ent("lithuania", "Lithuania", "Lietuva/Lietuvos/Lietuvai/Lietuvą/Lietuva/Lietuvoje", "f", { forms: ["lithuanian", "vilnius", "kaunas", "klaipeda", "the baltics"] }),
  ent("other", "Europe", "Europa/Europos/Europai/Europą/Europa/Europoje", "f",
    { forms: ["latvia", "estonia", "poland", "germany", "england", "the uk", "ireland", "norway", "sweden", "finland", "france", "spain", "italy", "ukraine", "canada", "latvian", "polish", "german"] }),
];

// Which place Rosa recommends for which food
const FOR_CUISINE: Record<string, string> = {
  seafood: "pier", italian: "trattoria", coffee: "sunny_cup", breakfast: "sunny_cup", burgers: "trucks", vegetarian: "trattoria", quick: "sunny_cup", local: "trucks",
};
const CHEAP = new Set(["trucks", "sunny_cup"]);
const KIND: Record<string, "food" | "sight" | "night"> = Object.fromEntries(SPOTS.map((e) => [e.id, e.attrs!.kind]));

// Facts per place → line ids
const WALK: Record<string, string> = { lighthouse: "walk_lighthouse", museum: "walk_museum", pier: "walk_harbor", trucks: "walk_harbor", park: "walk_harbor", boat: "walk_harbor", trattoria: "walk_close", sunny_cup: "walk_close", market: "walk_here", jazz: "walk_here" };
const HOW: Record<string, string> = { lighthouse: "dir_lighthouse", museum: "walk_museum", pier: "dir_harbor", trucks: "dir_harbor", park: "dir_harbor", boat: "dir_harbor", trattoria: "dir_trattoria", sunny_cup: "dir_sunny", market: "walk_here", jazz: "walk_here" };
const TOURISTY: Record<string, string> = { lighthouse: "tour_bit", boat: "tour_bit", pier: "tour_pier", market: "tour_market", trucks: "tour_locals", trattoria: "tour_locals", sunny_cup: "tour_locals", museum: "tour_quiet", park: "tour_quiet", jazz: "tour_locals" };
const TIME: Record<string, string> = { lighthouse: "time_lighthouse", park: "time_lighthouse", market: "time_market", museum: "time_museum", trattoria: "time_trattoria", pier: "time_pier", boat: "time_boat", trucks: "time_trucks", sunny_cup: "time_any", jazz: "time_jazz" };
const PRICE: Record<string, string> = { pier: "price_pier", trattoria: "price_trattoria", trucks: "price_cheap", sunny_cup: "price_cheap", lighthouse: "price_free", park: "price_free", market: "price_free", jazz: "price_free", museum: "price_museum", boat: "price_boat" };
const BOOK: Record<string, string> = { pier: "book_pier", trattoria: "book_trattoria", boat: "book_boat" };
const OPEN: Record<string, string> = { museum: "open_museum", market: "open_market", jazz: "open_jazz", trucks: "time_trucks", lighthouse: "open_path", park: "open_path" };

/** Common nouns take “the” ({X.the}: the article stays out of the natural Lithuanian); names don't. */
const withThe = (src: SentSrc): SentSrc => ({ ...src, en: src.en.replace(/\{X\}/g, "{X.the}"), lt: src.lt.replace(/\{X:/g, "{X.the:") });
const hasThe = (id: string) => !!SPOTS.find((e) => e.id === id)?.attrs?.the;
function placeHint(item: HintItem, only: (e: EntityDef) => boolean = () => true): HintItem[] {
  return [
    { ...item, only: (e) => !e.attrs?.the && only(e) },
    { ...item, s: withThe(item.s), only: (e) => !!e.attrs?.the && only(e) },
  ];
}
const TRIED_ASK = t("Oh, | it's | you | again! | Did | you | try | {X}?", "O, | tai yra | jūs | vėl! | Ar | jūs | išbandėte | {X:acc}?", "O, tai vėl jūs! Ar išbandėte {X:acc}?",
  { flags: { 4: "“Did” in a yes/no question = the particle ar; the past tense sits on išbandėte." } });

const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const conv = (c: Ctx) => (c as ConvCtx).conv;

// Automatic answers for the simulations (keyed by step or pending id).
const AUTO: Record<string, string> = {
  need: "Can you recommend a good place to eat?", food_kind: "Seafood, please", which_kind: "Food, please", sight: "Yes, what's worth seeing here?",
  food: "Yes, where's a good place to eat?", from: "I'm from Lithuania", walk: "That would be great, thanks!", more: "No, that's all. Thanks for the tip!",
  weather: "Yes, it's lovely!", tried: "Not yet", which_spot: "The lighthouse",
};

// ---------------------------------------------------------------------------
// Helpers

/** True the first time `key` happens in this utterance (an utterance may be parsed as several segments). */
function onceThisTurn(c: Ctx, key: string): boolean {
  const turn = conv(c).history.length;
  if (c.s.onceTurn !== turn) { c.s.onceTurn = turn; c.s.onceKeys = []; }
  if (c.s.onceKeys.includes(key)) return false;
  c.s.onceKeys.push(key);
  return true;
}

/** Rosa recommends a place; the conversation now talks about it ("Is it far?"). */
function recommend(c: Ctx, id: string, fromStep = false) {
  // one tip per utterance (an utterance may be parsed as several segments); Rosa's own tip for a step she asked is extra
  if (!fromStep && !onceThisTurn(c, "rec")) return;
  c.s.topic = id;
  if (!c.s.recs.includes(id)) c.s.recs.push(id);
  if (KIND[id] === "food") { c.s.foodRec = true; c.s.wantFood = false; c.remember({ lastTip: id }); }
  else c.s.sightRec = true;
  c.say(`rec_${id}`);
}

function foodFor(c: Ctx, cuisine: string | undefined, cheap: boolean, fancy = false): string {
  const avoid: string[] = c.s.avoid || [];
  let id = cuisine ? FOR_CUISINE[cuisine] : cheap ? "trucks" : fancy ? "pier" : c.s.foodDefault;
  if (cuisine === "seafood" && cheap) id = "trucks";
  if (cheap && !CHEAP.has(id)) id = cuisine === "italian" || cuisine === "vegetarian" ? "trattoria" : "trucks";
  // never the kind of food the learner said they don't want
  const bad = (x: string) => avoid.some((a) => FOR_CUISINE[a] === x) || (avoid.includes("seafood") && (x === "pier" || x === "trucks"));
  if (bad(id)) id = ["trattoria", "sunny_cup", "trucks", "pier"].find((x) => !bad(x)) ?? "sunny_cup";
  return id;
}

/** Rosa gave a tip nobody asked for (her own question went unanswered): go straight on to her next question,
 *  so the learner is never left with a question that is already settled. */
function thenNext(c: Ctx) {
  const nx = conv(c).nextStep(c as ConvCtx);
  if (nx && nx.id !== conv(c).step) c.ask(nx.id);
}

/** A second sight when the learner wants more ideas. */
function anotherSight(c: Ctx): string {
  return ["lighthouse", "boat", "museum", "park", "market"].find((x) => !c.s.recs.includes(x)) ?? "park";
}

function sightFor(c: Ctx, tags: string[]): string {
  if (tags.includes("view")) return "lighthouse";
  if (tags.includes("art")) return "museum";
  if (tags.includes("nature")) return "park";
  if (tags.includes("kids")) return "boat";
  if (tags.includes("shop")) return "market";
  return c.s.sightDefault;
}

/** A follow-up question about "it": the place in the slots, or the last one Rosa mentioned. */
function aboutSpot(c: Ctx, slots: any, table: Record<string, string>, fallback: string) {
  const id = (slots.spot as string | undefined) ?? c.s.topic;
  if (!id) {
    c.say("which_spot");
    c.expect({ id: "which_spot", optional: true, hints: ["spots"], suggest: [{ lt: "Pasakyti, apie kurią vietą klausi", hint: "spots", options: "spot" }] });
    return;
  }
  if (slots.spot && slots.spot !== c.s.topic) c.s.topic = slots.spot;
  c.say(table[id] ?? fallback);
}

/** "Something to eat or something to see?" – "Something to see." / "A place to eat." / "Both!" */
function expectKind(c: Ctx) {
  c.expect({ id: "which_kind", optional: true, expects: ["kind_ctx"], hints: ["kind"],
    suggest: [{ lt: "Pasakyti: pavalgyti ar pamatyti", hint: "kind" }],
    on: { kind_ctx: (cc, sl, sg) => { H.kind_ctx(cc, sl, sg); } } });
}

const H: Record<string, Handler> = {
  are_you_local(c) {
    c.s.local = true;
    c.say("local_yes");
  },
  recommend_vague(c) {
    if (c.s.foodRec && !c.s.sightRec) { recommend(c, sightFor(c, [])); return; }
    if (c.s.sightRec && !c.s.foodRec) { c.s.wantFood = true; return; }
    c.say("which_kind");
    expectKind(c);
  },
  kind_ctx(c, _slots, seg) {
    if (seg.tags.includes("both")) { c.say("both_ok"); recommend(c, sightFor(c, [])); c.s.wantFood = true; return; }
    if (seg.tags.includes("sight")) { recommend(c, sightFor(c, [])); return; }
    c.s.wantFood = true;
  },
  ask_food(c, slots, seg) {
    const cuisine = slots.cuisine as string | undefined;
    const tags = [...seg.tags, ...toArr(slots.budget).flatMap((b: any) => b?.__tags || [])];
    const cheap = tags.includes("cheap");
    if (cheap) c.s.cheap = true;
    if (tags.includes("locals")) { c.s.topic = "trucks"; c.say("locals_eat"); c.s.foodRec = true; c.s.recs.push("trucks"); return; }
    if (cuisine || cheap || tags.includes("fancy")) { recommend(c, foodFor(c, cuisine, cheap || c.s.cheap, tags.includes("fancy"))); return; }
    // vague: ask what they feel like (the food_kind step asks)
    c.s.wantFood = true;
    if (tags.includes("meal")) c.s.meal = true;
  },
  food_ans(c, slots, seg) {
    if (seg.tags.includes("any")) { recommend(c, foodFor(c, undefined, !!c.s.cheap)); return; }
    const cheap = seg.tags.includes("cheap") || !!c.s.cheap;
    if (seg.tags.includes("cheap")) c.s.cheap = true;
    recommend(c, foodFor(c, slots.cuisine, cheap));
  },
  food_neg(c, slots) {
    const cu = slots.cuisine as string | undefined;
    if (cu && !c.s.avoid.includes(cu)) c.s.avoid.push(cu);
    c.say("no_problem");
    // if Rosa just recommended that kind of place, offer another one
    if (c.s.topic && KIND[c.s.topic] === "food" && foodFor(c, undefined, !!c.s.cheap) !== c.s.topic && c.s.avoid.some((a: string) => FOR_CUISINE[a] === c.s.topic || (a === "seafood" && (c.s.topic === "pier" || c.s.topic === "trucks")))) {
      c.say("then_try");
      recommend(c, foodFor(c, undefined, !!c.s.cheap));
      return;
    }
    // "I don't eat fish" to "What kind of food do you like?": a place without it (asking again offered "Seafood?")
    if (c.step === "food_kind" && !c.s.foodRec) {
      c.say("then_try");
      recommend(c, foodFor(c, undefined, !!c.s.cheap));
      return;
    }
    if (!c.s.foodRec) c.s.wantFood = true;
  },
  budget(c, _slots, seg) {
    if (seg.tags.includes("cheap")) c.s.cheap = true;
    // "Can you recommend a place to eat? Not too expensive, please."
    if ((c.s.wantFood || c.step === "food_kind" || c.step === "food") && !c.s.foodRec) recommend(c, foodFor(c, undefined, !!c.s.cheap, seg.tags.includes("fancy")));
    else if (c.s.topic && KIND[c.s.topic] === "food" && c.s.cheap && !CHEAP.has(c.s.topic)) H.too_expensive(c, {}, seg);
    else c.say("no_problem");
  },
  too_expensive(c) {
    c.s.cheap = true;
    const cur = c.s.topic;
    const alt = cur === "trucks" ? "sunny_cup" : "trucks";
    c.say("cheaper");
    recommend(c, foodFor(c, alt === "sunny_cup" ? "quick" : "burgers", true));
  },
  not_hungry(c) {
    c.say("later_food");
    recommend(c, foodFor(c, undefined, !!c.s.cheap));
  },
  ask_sight(c, _slots, seg) {
    if (seg.tags.includes("else") || (c.s.sightRec && !["art", "nature", "kids", "shop"].some((x) => seg.tags.includes(x)))) { recommend(c, anotherSight(c)); return; }
    recommend(c, sightFor(c, seg.tags));
    if (seg.tags.includes("art") || c.s.recs.includes("museum")) return;
    if (c.chance(0.6)) { c.say("also_museum"); if (!c.s.recs.includes("museum")) c.s.recs.push("museum"); }
  },
  ask_about_spot(c, slots) {
    const id = slots.spot as string;
    if (!id) return;
    recommend(c, id);
  },
  buy_produce(c, _slots, seg) {
    c.say(seg.tags.includes("where") ? "market_where" : "market_seller");
    if (!c.s.marketTip) { c.s.marketTip = true; c.say("market_tip"); }
    c.s.topic = "market"; // "When does it close?" is about the market now
  },
  ask_favorite(c) { c.say("favorite"); c.s.topic = "lighthouse"; if (!c.s.sightRec) { c.s.sightRec = true; c.s.recs.push("lighthouse"); } },
  ask_locals(c, _slots, seg) {
    if (seg.tags.includes("do")) { c.say("locals_do"); c.s.topic = "market"; if (!c.s.sightRec) { c.s.sightRec = true; c.s.recs.push("market"); } return; }
    c.say("locals_eat");
    c.s.topic = "trucks";
    if (!c.s.recs.includes("trucks")) c.s.recs.push("trucks");
    c.s.foodRec = true;
  },
  ask_night(c) {
    c.say("night");
    c.say("night_bar");
    c.s.topic = "jazz";
  },
  ask_coffee(c) {
    c.s.topic = "sunny_cup";
    c.say("coffee");
    if (!c.s.recs.includes("sunny_cup")) c.s.recs.push("sunny_cup");
    c.s.foodRec = true;
  },
  // follow-ups
  ask_walk(c, slots, seg) { aboutSpot(c, slots, seg.tags.includes("how") ? HOW : WALK, "walk_close"); },
  ask_touristy(c, slots) { aboutSpot(c, slots, TOURISTY, "tour_quiet"); },
  ask_best_time(c, slots) { aboutSpot(c, slots, TIME, "time_any"); },
  ask_price(c, slots) { aboutSpot(c, slots, PRICE, "price_cheap"); },
  ask_book(c, slots) { aboutSpot(c, slots, BOOK, "book_no"); },
  ask_open(c, slots) { aboutSpot(c, slots, OPEN, "open_generic"); },
  ask_worth(c, slots) { aboutSpot(c, slots, {}, "worth"); },
  ask_safe(c) { c.say("safe"); },
  no_crowds(c) { c.say("no_crowds"); c.s.topic = "park"; if (!c.s.recs.includes("park")) c.s.recs.push("park"); c.s.sightRec = true; },
  no_walk(c) { c.say("no_walk"); },
  thanks_tip(c) {
    c.say("thanks_reply");
    if (c.step === "more") c.s.moreDone = true;
  },
  more_no(c) { c.s.moreDone = true; },
  // "That sounds great! Bye!" to "Anything else, dear?": both tips are given, so the task is done. The global
  // goodbye ends the conversation before Rosa's closing; a goodbye before the tips just ends it, as everywhere.
  g_bye(c) {
    if (c.s.foodRec && c.s.sightRec && !conv(c).completed) { c.s.moreDone = true; c.complete(); c.say("closing"); }
    c.say("g_bye"); c.end(); c.hold();
  },
  g_thanks(c) {
    c.say("thanks_reply");
    if (c.step === "more") c.s.moreDone = true;
    if (conv(c).completed) c.hold();
  },
  from_ctx(c, slots) {
    c.s.fromDone = true;
    c.s.fromAnswered = true;
    c.say(slots.country === "lithuania" ? "from_lt" : "from_other");
  },
  ask_rosa_from(c) { c.say("local_yes"); c.s.local = true; },
  weather_ok(c) { c.say("weather_reply"); },
  // only parsed while "Did you try …?" is open (the pending question answers them first)
  tried_yes_ctx(c) { c.say("tried_yes"); },
  tried_no_ctx(c) { c.say("tried_no"); },
  // "Great, thank you!" is thanks, not an answer to "How are you?" (the global handler would say "I'm great, thanks for asking!")
  g_howareyou_answer(c, slots) {
    const h = (c.heard || "").toLowerCase();
    if (/\bthank/.test(h) && !/\b(how are you|and you|about you|yourself)\b/.test(h)) { H.thanks_tip(c, slots, { intent: "thanks_tip", slots, tags: [] }); return; }
    GLOBAL_HANDLERS.g_howareyou_answer(c as ConvCtx, slots);
  },
  help_me(c) {
    // "Can you help me? I'm looking for a restaurant": the request itself follows, no need to ask
    if (!/\b(looking|where|recommend|eat|see|restaurant|coffee|visit)\b/i.test(c.heard || "")) c.say("help_sure");
  },
  diet(c) {
    for (const a of ["burgers", "seafood"]) if (!c.s.avoid.includes(a)) c.s.avoid.push(a);
    recommend(c, "trattoria");
  },
  // a place named on its own while Rosa asks what they'd like to see: "The lighthouse, maybe?"
  spot_ctx(c, slots, seg) { H.ask_about_spot(c, slots, seg); },
  // "I don't like museums": no museum tip, another sight instead
  sight_neg(c) {
    c.say("no_problem");
    if (!c.s.sightRec || c.s.topic === "museum") recommend(c, c.s.sightDefault === "museum" ? "lighthouse" : c.s.sightDefault);
  },
  // answers to "Want me to walk with you?" (the pending's yes/no may already have answered)
  walk_yes_ctx(c) { if (c.s.walkAnswered) return; c.s.walkAnswered = true; c.say("walk_yes"); c.event("follow", { npc: "rosa", to: KIND[c.s.topic] ? c.s.topic : "lighthouse" }); },
  walk_no_ctx(c) { if (c.s.walkAnswered) return; c.s.walkAnswered = true; c.say("walk_no"); },
};

/** Every situation handler reacts once per utterance, and any real request ends the opening question. */
function wrap(hs: Record<string, Handler>): Record<string, Handler> {
  const out: Record<string, Handler> = {};
  for (const [id, h] of Object.entries(hs)) {
    out[id] = (c, slots, seg) => {
      if (!onceThisTurn(c, "h:" + id)) return;
      // (not a request for tips: small talk, and trying to buy fruit from Rosa)
      if (!["are_you_local", "weather_ok", "g_thanks", "help_me", "tried_yes_ctx", "tried_no_ctx", "buy_produce"].includes(id)) c.s.asked = true;
      h(c, slots, seg);
    };
  }
  return out;
}

// ---------------------------------------------------------------------------

export const local: SituationDef = {
  id: "s69-local",
  song: 69,
  songTitle: "What Would You Recommend?",
  title: { en: "What Would You Recommend?", lt: "Ką rekomenduotumėte?" },
  topic: { en: "Asking a local for tips", lt: "Vietinių patarimai" },
  chapter: 2,
  order: 3,
  location: "town-square",
  npc: "rosa",
  goal: "Paprašyk vietinės gyventojos patarimų: kur pavalgyti ir ką pamatyti.",
  intro: "Miesto aikštė. Ant suoliuko prie fontano sėdi Rosa – žilaplaukė ponia su megztuku. Ji čia gimė ir užaugo, todėl žino kiekvieną Maple Harboro kampelį.",
  entities: { spot: SPOTS, cuisine: CUISINES, country: COUNTRIES },

  grammar: {
    macros: {
      here_: "(here | near here | around here | nearby | in town | in maple harbor | in the area)",
      rec_v: "(recommend | suggest)",
      place_w: "(place | places | restaurant | restaurants | spot | somewhere)",
      budget: "(cheap #cheap | not (too | very | that | so) expensive #cheap | inexpensive #cheap | affordable #cheap | on a budget #cheap | nothing (fancy | too fancy | expensive) #cheap | not too fancy #cheap | nice #nice | fancy #fancy | special #fancy | romantic #fancy | really good | good | great)",
      it_: "(it | that | there)",
      // what the market stalls behind Rosa's bench sell (her picture shows them)
      produce: "[fresh | some fresh | good] (fruit | fruits | vegetables | veggies | produce | apples | an apple | oranges | peaches | pears | plums | bananas | grapes | berries | strawberries | blueberries | tomatoes | potatoes | carrots | lettuce | leeks | onions | cabbage | flowers | a bouquet | bread | cheese | eggs | jam)",
    },
    slots: {
      budget: { pattern: "@budget" },
    },
  },

  intents: {
    are_you_local: { patterns: [
      "[excuse me] are you from (around here | here | this town | maple harbor) #h:l_from", "do you live (here | around here | in town) #h:l_live", "are you a local #h:l_local",
      "have you lived here (long | a long time | all your life)", "you are from here right",
    ] },
    ask_rosa_from: { patterns: ["where are you from", "were you born here"] },
    recommend_vague: { patterns: ["what (would | do) you @rec_v #h:r_what", "what (would | do) you @rec_v (for me | for a visitor | for a tourist)", "(any | do you have any) (recommendations | tips | suggestions) #h:r_tips", "(can | could) you give me (some | a few) (tips | recommendations | advice)", "i am new here what (would | do) you @rec_v", "i am visiting what (would | do) you @rec_v",
      "what can you @rec_v [for me | for a visitor | for a tourist]", "i am (new here | a tourist | visiting) [(what (would | do | can) you @rec_v) | ((any | do you have any) (recommendations | tips | suggestions))]",
      "[yes] i would (love | like) some (ideas | tips | recommendations | suggestions)"] },
    kind_ctx: { patterns: ["[for] (food #food | something to eat #food | to eat #food | eating #food | restaurants #food | a restaurant #food) #h:kd_food", "(something to see #sight | things to see #sight | to see #sight | sightseeing #sight | sights #sight | things to do #sight | something to do #sight) #h:kd_see", "(both #both | both please #both | a bit of both #both | both of them #both | both actually #both) #h:kd_both",
      "(food #food | eating #food) first", "(sights #sight | things to see #sight | sightseeing #sight) first", "(places | a place) to eat #food", "[both] food and (sights | things to see | sightseeing) #both"] },
    ask_food: { patterns: [
      "@could_you @rec_v [a | some] [@budget] @place_w to eat [@here_] [that is {budget}] #h:f_recommend",
      "@could_you @rec_v (a | some) [good] (restaurant | restaurants | place | places) [@here_] [that is {budget}] #h:f_recommend",
      "where is a good place to eat [@here_] #h:f_where_good", "where (can | should) (i | we) (eat | go for (lunch | dinner) | have (lunch #meal | dinner #meal) | get something to eat) [@here_] #h:hg_where",
      "(do you know | is there) a [good] [{budget}] (place | restaurant) [to eat] [@here_] [that is {budget}]", "(do you know | is there) (somewhere | anywhere) [{budget}] to eat [@here_]",
      "(i am | we are) looking for (somewhere | a place) [{budget}] to eat [@here_] [that is {budget}] #h:f_somewhere_cheap",
      "(i am | we are) looking for (a | some) [good] {cuisine} [place | restaurant] [@here_]", "(i am | we are) (hungry | starving) [what do you @rec_v] #h:hg_hungry",
      "(i am | we are) looking for a [good | nice] [{budget}] (restaurant | place to eat | cafe) [@here_]",
      "(where can i get | where can we get | where is a good place for | where do you get | where is the best place for) [a | an | some] [good | great | the best | nice] {cuisine} [@here_] #h:f_cuisine",
      "(any | are there any) [good | nice] {cuisine} (places | restaurants) [@here_]", "(do you know | is there) a [good | nice] (place | restaurant) for {cuisine} [@here_]",
      "is there a good {cuisine} (place | restaurant) [@here_] #h:f_cuisine_place", "what (do | would) you @rec_v for (lunch #meal | dinner #meal | breakfast) #h:f_lunch",
      "(i | we) (would like | want) to (eat | try | have) [some] {cuisine}", "(i would like | i want) (something | a place) [{budget}] to eat", "[where can i find] (a | some) cheap (food | place to eat | eats) #cheap",
      "where do (the locals | locals | people from here) eat #locals",
      // more ways: "What's good to eat here?", "Where is a good pizza place?", "I'm hungry. Where should I go?"
      "where (can | should) (i | we) eat something [good | nice | tasty] [@here_]", "what is (good | nice) to eat [@here_]",
      "(i am | we are) [a bit | a little | very | really | so] (hungry | starving) [where (should | can) (i | we) (go | eat)]", "[a bit | a little | very | really | so] (hungry | starving)",
      "(do you know | is there) a [good | nice] (place | restaurant) for (dinner #meal | lunch #meal | breakfast)", "where (can | should) (i | we) have a [nice | good] (lunch #meal | dinner #meal)",
      "where is a [good | nice] {cuisine} (place | restaurant) [@here_]", "(do you know | is there) a [good | nice] {cuisine} (place | restaurant) [@here_]",
      "(i | we) (would like | want) to (eat | try | have) [some] {cuisine} [where (can | should) (i | we) go]", "(i need | i am looking for) a [good | nice] restaurant [@here_]",
      "where to eat [@here_]", "where do people eat [@here_] #locals", "where can (i | we) (eat | have | get | find | try) [some | good | the] {cuisine} [@here_] #h:f_cuisine",
      "what is a (good | nice) (place | restaurant) for (lunch #meal | dinner #meal | breakfast) [@here_]", "(any | are there any) [good | nice] (restaurants | places to eat) [@here_]",
    ] },
    food_ans: { patterns: [
      "[i would like | i feel like | i love | i like | i think | maybe | something | some | probably] {cuisine} [please | maybe | i think] #h:k_cuisine",
      "(anything | anything is fine | i do not mind | surprise me | whatever you recommend | you choose) #any #h:k_anything",
      "[i like | i love] all kinds of food #any",
      "anything really #any", "whatever (is good | you like | you think | is best) #any", "what is (popular | good | best | your favorite) #any",
      "(i would like | i want) to (try | eat | have) [some] {cuisine}", "[i like | maybe] {cuisine} or {cuisine2:cuisine}", "[i would like] {cuisine} (from here | from this area)",
      "i feel like {cuisine} today", "something with {cuisine}", "i eat (everything | anything) #any",
    ] },
    food_neg: { patterns: ["i do not (like | eat | really like | want) {cuisine} #h:k_not", "i (am not | am not really) (a fan of | into) {cuisine}", "not {cuisine} [please]", "no {cuisine} [please | for me]", "i am allergic to {cuisine}", "anything but {cuisine}"] },
    budget: { patterns: ["[something | somewhere | a place] [that is | it should be] (cheap | not too expensive | not very expensive | inexpensive | affordable | nothing fancy | not too fancy) #cheap #h:k_cheap", "[something | somewhere | a place] (nice | special | fancy | romantic) #fancy"] },
    too_expensive: { patterns: ["(that is | it is | that sounds | it sounds) (too | a bit too | a little too) expensive [for me]", "(is there | do you know) (anything | anywhere | something) cheaper", "something cheaper [please]", "i can not afford (that | it)", "(i am | we are) on a (tight) budget"] },
    not_hungry: { patterns: ["(i am | we are) not hungry [yet | right now]", "i (already | just) ate", "we (already | just) ate", "[not really] (maybe | perhaps) later", "(i am | we are) not (really | very | that) hungry [yet | right now]"] },
    ask_sight: { patterns: [
      "what is worth seeing [@here_] #h:s_worth", "what should (i | we) (see | visit | do) [while (i am | we are) here] [@here_] #h:s_should_see",
      "is there anything (interesting | nice | fun | special) to (see | do) [@here_] #h:s_anything", "what is the best thing to (see | do) [@here_] #h:s_best",
      "what would you do if you were new [here] #h:s_new", "what are the (must see | best) (places | sights | things) [@here_]", "(any | are there any) (must see | nice) places [@here_]",
      "where should (i | we) go [@here_]", "what can (i | we) (see | do) [@here_]", "what do tourists (usually) (see | visit | do)",
      "i (like | love) (art #art | museums #art | paintings #art)", "i (like | love) (nature #nature | walking #nature | walks #nature | parks #nature)", "(i am | we are) (here | traveling) with (kids #kids | children #kids | my kids #kids)",
      "i (like | love) (shopping #shop | markets #shop)", "what is there to see [@here_]", "what is (fun | nice | good) to do [@here_]",
      "what else (should | can | could) (i | we) (see | do | visit) [@here_] #else", "(is there | anything) [anything] else to (see | do) [@here_] #else", "(any | what) other (ideas | places | suggestions) #else",
      // more ways: "Something with a nice view", "Something for kids", "What about shopping?"
      "(can | could) you (tell me | recommend | suggest) something (interesting | nice | fun | beautiful) to (see | do)",
      "what is the most (beautiful | interesting | famous | popular) (place | thing | sight) [@here_]", "something with a (nice | good | beautiful | great) view #view",
      "i want to see the (ocean | sea | water | harbor | view) #view", "i (like | love) (nature #nature | walking #nature | walks #nature | parks #nature) and (walking | walks | parks | hiking | nature)",
      "is there a [nice | good] (beach | park) [@here_] #nature", "is there a (museum | art museum | gallery) [@here_] #art", "something for (kids #kids | children #kids | the kids #kids | the family #kids)",
      "what is (famous | special | popular) [@here_]", "(what | how) about (shopping #shop | markets #shop | art #art | museums #art | nature #nature | parks #nature)",
      "what do you think i should (see | do | visit)", "what can (i | we) (see | do) [@here_] (today | tomorrow | this afternoon | tonight)",
      "(where | what) is the best place to (see | watch) the sunset #view", "where can (i | we) (see | watch) the sunset #view", "something (historical #art | old #art | cultural #art | interesting)",
    ] },
    spot_ctx: { patterns: ["[maybe | what about | how about] {spot} [maybe]"] },
    sight_neg: { patterns: ["i do not (like | want to see | care about) (museums | art | paintings | the museum)"] },
    ask_about_spot: { patterns: ["is {spot} (good | nice | worth it | worth a visit | worth seeing | any good) #h:p_worth", "what do you think (of | about) {spot}", "have you been to {spot}", "tell me about {spot}", "what about {spot}", "how is {spot}"] },
    ask_favorite: { patterns: ["what is your favorite (place | spot | restaurant | thing to do) [@here_] #h:s_favorite", "where do you like to go [@here_]", "where is your favorite place"] },
    ask_locals: { patterns: ["where do (the locals | locals | people from here) go #h:f_locals", "where would you go", "what do (the locals | locals | people here) do [on the weekend | at the weekend] #do", "where do you (usually) go"] },
    ask_night: { patterns: ["what is there to do (at night | in the evening | tonight) #h:n_night", "(is there | are there) [any] (live music | nightlife | jazz | concerts) [@here_ | anywhere]", "where can (i | we) (hear | listen to) (live music | jazz | music)", "what do people do at night", "what can i do (tonight | at night | in the evening)"] },
    ask_coffee: { patterns: ["where is the best coffee [in town | @here_] #h:c_best_coffee", "where can i get (a good | good | the best) coffee [@here_]", "(is there | do you know) a good (cafe | coffee shop | coffee place) [@here_]", "(i need | i want) (a | some) [good] coffee",
      "(is there | do you know) a nice (cafe | coffee shop | coffee place) [@here_]"] },
    // follow-ups
    ask_walk: { patterns: [
      "is @it_ within walking distance #h:u_walk", "is {spot} within walking distance", "can (i | we) walk (there | to it | to {spot})", "is @it_ far [from here]", "is {spot} far [from here] #h:p_far", "how far is (it | {spot}) [from here]",
      "how (do | can) (i | we) get there #how #h:u_how", "how (do | can) i get to {spot} #how", "how long does it take [to get there | to walk there]", "is it close [to here]",
    ] },
    ask_touristy: { patterns: ["is @it_ (touristy | very touristy | full of tourists | crowded | busy) #h:u_touristy", "is {spot} (touristy | very touristy | crowded | busy)", "are there (a lot of | many | lots of) tourists [there]"] },
    ask_best_time: { patterns: ["what is the best time to (go | visit) [there | {spot}] #h:u_time", "when (should | can) (i | we) go [there]", "when is the best time to (go | visit) [there | {spot}]", "what time should (i | we) go [there]", "when should i visit {spot}"] },
    ask_price: { patterns: ["is @it_ expensive #h:u_expensive", "is {spot} expensive", "is @it_ (cheap | pricey | free)", "how much (is it | does it cost | are the tickets | is a ticket)", "how much is {spot}", "(is | are) {spot} (cheap | pricey | free)"] },
    ask_book: { patterns: ["do (i | we) need to (book | reserve | make a reservation) [a table | tickets | in advance | ahead] #h:u_book", "should (i | we) book [a table | tickets] [ahead | in advance]", "do (i | we) need (a reservation | tickets | to book tickets)", "(do | does) {spot} take reservations", "do i need to book {spot}", "can i book (it | a table | the tour) [online | by phone]"] },
    ask_open: { patterns: ["is @it_ open (today | now | {day} | every day | on the weekend) #h:u_open", "when (does it | is it) open", "what time does it (open | close)", "is {spot} open (today | now | {day} | every day)", "when is {spot} open", "what time does {spot} (open | close)",
      "when does (it | {spot}) (open | close | finish | end)", "(how long | until when | till when) is (it | {spot}) open", "what are the (opening hours | hours) [of {spot}]", "is it open (late | all day)"] },
    ask_worth: { patterns: ["is @it_ worth (it | a visit | the trip | the walk | the money)", "is it worth (going | seeing)"] },
    ask_safe: { patterns: ["is (it | the town | this town | maple harbor | this area) safe [at night | to walk at night | for walking at night] #h:u_safe", "is it safe to walk (at night | around at night | back at night)"] },
    no_crowds: { patterns: ["i do not like (crowds | tourists | touristy places | crowded places | busy places)", "(i want | i would like) somewhere (quiet | not touristy | without tourists)"] },
    no_walk: { patterns: ["i do not want to walk (that far | so far | there)", "that is too far [to walk]", "i can not walk (that far | so far)", "is there a bus [there]"] },
    thanks_tip: { patterns: [
      "(thanks | thank you) for the (tip | tips | advice | recommendation | recommendations | help) #h:t_tip", "you have been (really | so | very) helpful #h:t_helpful", "that is (really | very | so) helpful",
      "(that | it) sounds (great | good | lovely | amazing | perfect | wonderful) #h:t_sounds", "i will (check it out | try it | go there | try that) #h:t_check", "great tip", "(that is | what) a great (tip | idea)",
      "(great | perfect | wonderful | lovely | awesome | excellent | fantastic | brilliant) (thank you | thanks) [so much | very much | a lot]",
      "(that is | it is) (perfect | great | wonderful | lovely | amazing | fantastic) [thank you | thanks]", "you are (very | so | really) kind", "that is (very | so | really) kind of you",
      "i will (check it out | try it | go there | try that) (tomorrow | today | tonight | later)", "(great | good | nice | useful) tips",
      "you (have helped | helped) me [so much | a lot]",
    ] },
    more_no: { patterns: ["(that is | that will be) (all | it | everything) [for now] #h:t_all", "nothing else", "[no] that is it", "i am (good | fine) [for now]", "i think that is (all | it)", "that is all i needed",
      "[no] i think i am (good | fine)", "[no] i do not have (any more | more | other | any other) questions", "[no] i think that is everything"] },
    from_ctx: { patterns: ["[i am] from {country} #h:o_from", "{country}", "i am {country}", "i live in {country}", "(we are | i come) from {country}",
      "(we are | i come | i am) from {country} in europe", "far away [from {country}]"] },
    tried_yes_ctx: { patterns: ["[yes] (it | that) was delicious #h:tr_delicious", "[yes] (it | that) was great #h:tr_great", "[yes] (it | that) was (amazing | wonderful | lovely | so good | really good | fantastic | excellent)", "[yes] i (loved | liked | enjoyed) it", "yes i did"] },
    tried_no_ctx: { patterns: ["[no] not yet [but i will | but i want to] #h:tr_not_yet", "no i (did not | have not) [yet]"] },
    weather_ok: { patterns: ["[yes] it is (lovely | beautiful | gorgeous | nice | a beautiful day | a lovely day) #h:wt_lovely", "(nice | lovely | beautiful | gorgeous | great | perfect) (day | weather) [today] #h:wt_day", "it really is #h:wt_really",
      "(very | really | so) (beautiful | nice | lovely | warm | sunny)", "it is (so | very | really) (sunny | warm | nice | beautiful) [today]", "(much | a lot) (better | warmer) than (in lithuania | at home)"] },
    walk_yes_ctx: { patterns: ["[yes] (that would be | that is) (great | lovely | wonderful) #h:w_yes", "[yes] (that would be | that is) (very | so | really) kind [of you] #h:w_kind",
      "[really] (that is | that would be) (so | very | really) (nice | kind | lovely | great) #h:w_kind", "[yes] i would (love | like) that", "[yes] let us go [together]", "[yes] (with pleasure | great idea | good idea)"] },
    walk_no_ctx: { patterns: ["[no] i will (find it | be fine | find my way | manage) [myself | alone | on my own] #h:w_no",
      "(it is | that is) (okay | fine | all right) i will (find it | find my way | manage | be fine) #h:w_no",
      "[no] (it is | that is) (okay | fine | all right) i (can | will) (go | walk | manage) [alone | myself | on my own]", "[no] i can (go | walk) (alone | myself | on my own)", "[no] i (want to | prefer to | would like to) (walk | go) alone"] },
    // The picture shows market stalls behind Rosa: "I'd like to buy some fruit" (she sells nothing, but points to the stalls).
    // Only clear shopping sentences: a bare "Vegetables." may answer "What do you feel like?" (vegetarian food).
    buy_produce: { patterns: [
      "(i would like | i want | i need | i am going | i came here | i am here | i am trying) to buy [some | a few | a little] @produce",
      "where (can | could | do | should) (i | we) (buy | get | find) [some | a few] @produce [@here_] #where",
      "where (is | are) the (fruit | vegetables | vegetable | flower) (stall | stalls | stand | stands) #where", "is there a (fruit | vegetable | flower) (stall | stand) [@here_] #where",
      "(can | could | may) (i | we) buy [some | a | an | one | a bag of | a kilo of | a pound of | a few] @produce",
      "do you sell [any | some] @produce", "how much (is | are | do | does) [the | your | these | those] @produce [cost]",
      "(i will | i would like to) buy [some | a | an | one | a bag of | a kilo of | a pound of | a few] @produce",
      "i am (shopping | looking) for [some] @produce", "(a bag of | a kilo of | a pound of) @produce",
    ] },
    help_me: { patterns: ["@could_you help me", "(can | could | may) i ask you (something | a question)", "i have a question"] },
    diet: { patterns: ["(i am | we are) (vegetarian | vegan | a vegetarian)", "i do not eat meat", "we do not eat meat"] },
  },

  lines: {
    // --- openers ----------------------------------------------------------------
    open: [
      t("Hello there! | Can | I | help | you | with something?", "Sveiki! | Ar galiu | aš | padėti | jums | kuo nors?", "Sveiki! Ar galiu kuo nors padėti?"),
      t("Oh, | hi! | You | look | like | you're exploring. | Can | I | help?", "O, | sveiki! | Jūs | atrodote | lyg | tyrinėjate. | Ar galiu | aš | padėti?", "O, sveiki! Atrodo, kad tyrinėjate miestą. Ar galiu padėti?"),
    ],
    open_weather: [
      t("Hi, | dear! | Beautiful | day, | isn't it?", "Sveiki, | {m:mielasis|f:mieloji}! | Graži | diena, | ar ne?", "Sveiki, {m:mielasis|f:mieloji}! Graži diena, ar ne?"),
    ],
    weather_reply: [
      t("It | really | is! | So, | can | I | help | you | with something?", "Tai | tikrai | [graži]! | Tai | ar galiu | aš | padėti | jums | kuo nors?", "Tikrai graži! Tai gal galiu kuo nors padėti?",
        { flags: { 2: "Elliptical “is” (it really is [beautiful]): Lithuanian repeats the adjective." } }),
    ],
    tried_ask: [TRIED_ASK],
    tried_ask_the: [withThe(TRIED_ASK)],
    tried_yes: [t("I | knew | you'd love | it!", "Aš | žinojau, | kad jums patiks | tai!", "Žinojau, kad jums patiks!")],
    tried_no: [t("Oh, | you | have | to try | it!", "O, | jūs | turite | išbandyti | tai!", "O, būtinai išbandykite!")],
    ask_need: [
      t("So, | what | can | I | do | for you?", "Tai, | ką | galiu | aš | padaryti | jums?", "Tai kuo galiu padėti?"),
      t("How | can | I | help, | dear?", "Kaip | galiu | aš | padėti, | {m:mielasis|f:mieloji}?", "Kuo galiu padėti, {m:mielasis|f:mieloji}?"),
    ],
    ask_need_again: [
      t("Are | you | looking | for | a | place | to eat, | or | something | to see?", "Ar | jūs | ieškote | — | — | vietos | pavalgyti, | ar | ko nors | pamatyti?", "Ieškote, kur pavalgyti, ar ką pamatyti?",
        { flags: { 0: "“Are” in a yes/no question = the particle ar; the present tense of ieškote carries the progressive.", 3: "“for”: no separate Lithuanian word; the genitive vietos carries it." } }),
    ],
    local_yes: [
      t("Born | and | raised! | I've lived | here | all | my | life.", "Gimiau | ir | užaugau! | Gyvenu | čia | visą | savo | gyvenimą.", "Čia gimiau ir užaugau! Visą gyvenimą čia gyvenu."),
      t("I | sure | am! | Born | and | raised.", "Aš | tikrai | [esu vietinė]! | Gimiau | ir | užaugau.", "Tikrai taip! Čia gimiau ir užaugau.",
        { flags: { 2: "Elliptical “am” (I sure am [from here]): Lithuanian repeats the predicate, shown in brackets." } }),
    ],
    which_kind: [
      t("Oh, | lots | of things! | For | food, | or | things | to see?", "O, | daug | ko! | — | Pavalgyti, | ar | ką nors | pamatyti?", "O, daug ko! Norite pavalgyti ar ką nors pamatyti?",
        { flags: { 3: "“For”: no separate Lithuanian word; the question is carried by pavalgyti." } }),
    ],
    both_ok: [t("Both? | Wonderful!", "Abu? | Nuostabu!", "Ir tą, ir tą? Nuostabu!")],

    // --- food ---------------------------------------------------------------------
    ask_cuisine: [
      t("Sure! | What | do | you | feel like? | Seafood? | Italian? | Something | quick?", "Žinoma! | Ko | — | jums | norisi? | Jūros gėrybių? | Itališko? | Kažko | greito?", "Žinoma! Ko norėtųsi? Jūros gėrybių? Itališko? Kažko greito?",
        { flags: { 2: "Question “do” has no Lithuanian word; the dative jums + norisi carries it." } }),
      t("Of course! | What | kind | of food | do | you | like?", "Žinoma! | Kokį | — | maistą | — | jūs | mėgstate?", "Žinoma! Kokį maistą mėgstate?",
        { flags: { 2: "“kind”: no separate word; the interrogative Kokį (what kind of) carries it.", 4: "Question “do” has no Lithuanian word; the tense sits on mėgstate." } }),
    ],
    rec_pier: [
      t("If | you | like | seafood, | The Pier | is | the | best. | Try | the | clam | chowder! | It's | a little | pricey, | though.", "Jei | jūs | mėgstate | jūros gėrybes, | restoranas „The Pier“ | yra | — | geriausias. | Paragaukite | — | moliuskų | sriubos! | Tai yra | truputį | brangu, | tiesa.", "Jei mėgstate jūros gėrybes, geriausias – „The Pier“. Paragaukite moliuskų sriubos! Tiesa, ten truputį brangoka."),
    ],
    rec_trucks: [
      t("Go | to | the | food | trucks | by | the | harbor. | The | fish | tacos | are | amazing, | and | they're | only | about | ten | dollars.", "Eikite | prie | — | maisto | furgonėlių | prie | — | uosto. | — | Žuvies | tako | yra | nuostabūs, | ir | jie kainuoja | tik | apie | dešimt | dolerių.", "Eikite prie maisto furgonėlių prie uosto. Žuvies tako ten nuostabūs, o kainuoja tik apie dešimt dolerių."),
    ],
    rec_trattoria: [
      t("Lucia's! | Homemade | pasta, | and | it's | not | too | expensive. | Try | the | lasagna!", "„Lucia's“! | Naminiai | makaronai, | ir | tai yra | ne | per | brangu. | Paragaukite | — | lazanijos!", "„Lucia's“! Naminiai makaronai, ir ne per brangu. Paragaukite lazanijos!"),
    ],
    rec_sunny_cup: [
      t("Sunny Cup, | on Oak Avenue. | Great | coffee | and | the | best | blueberry | muffins. | Tell | Mia | I | sent | you!", "„Sunny Cup“, | Oak Avenue gatvėje. | Puiki | kava | ir | — | geriausi | mėlynių | keksiukai. | Pasakykite | Mijai, | kad aš | atsiunčiau | jus!", "„Sunny Cup“ Oak Avenue gatvėje. Puiki kava ir geriausi mėlynių keksiukai. Pasakykite Mijai, kad aš jus atsiunčiau!"),
    ],
    then_try: [t("Then | how | about | this:", "Tada | kaip | dėl | šito:", "Tada štai ką pasiūlysiu:")],
    cheaper: [t("Something | cheaper? | Sure.", "Kažko | pigesnio? | Žinoma.", "Kažko pigesnio? Žinoma.")],
    later_food: [t("Well, | when | you | get hungry, | remember | this | one:", "Na, | kai | jūs | išalksite, | prisiminkite | šitą | vietą:", "Na, kai išalksite, prisiminkite štai ką:")],
    locals_eat: [
      t("Honestly? | The | food | trucks | by | the | harbor. | Tourists | go | to | The Pier, | but | locals | get | fish | tacos.", "Atvirai? | — | Maisto | furgonėliai | prie | — | uosto. | Turistai | eina | į | restoraną „The Pier“, | bet | vietiniai | ima | žuvies | tako.", "Atvirai? Maisto furgonėliai prie uosto. Turistai eina į „The Pier“, o vietiniai valgo žuvies tako."),
    ],
    coffee: [t("Sunny Cup, | no question! | Tell | Mia | I | sent | you.", "„Sunny Cup“, | be jokių abejonių! | Pasakykite | Mijai, | kad aš | atsiunčiau | jus.", "„Sunny Cup“, be jokių abejonių! Pasakykite Mijai, kad aš jus atsiunčiau.")],

    // --- things to see --------------------------------------------------------------
    rec_lighthouse: [
      t("Oh, | the | lighthouse, | for sure! | Go | at sunset. | It's | beautiful.", "O, | — | švyturys, | tikrai! | Eikite | saulėlydžio metu. | Tai yra | nuostabu.", "O, būtinai švyturys! Eikite saulėlydžio metu – nuostabu."),
      t("You | can't miss | the | lighthouse! | The | view | is | amazing.", "Jūs | negalite praleisti | — | švyturio! | — | Vaizdas | yra | nuostabus.", "Negalite praleisti švyturio! Vaizdas nuostabus."),
    ],
    rec_boat: [
      t("Take | the | boat | tour! | You | can | see | seals | in the harbor.", "Užsisakykite | — | laivo | ekskursiją! | Jūs | galite | pamatyti | ruonius | uoste.", "Užsisakykite ekskursiją laivu! Uoste galima pamatyti ruonių."),
    ],
    rec_market: [
      t("If | you're | here | on Saturday, | don't miss | the | farmers' | market, | right | here | in the square.", "Jei | jūs esate | čia | šeštadienį, | nepraleiskite | — | ūkininkų | turgaus, | būtent | čia, | aikštėje.", "Jei būsite čia šeštadienį, nepraleiskite ūkininkų turgaus – čia pat, aikštėje."),
    ],
    rec_park: [
      t("Harbor | Park | is | lovely | for | a | walk | by | the | water.", "Uosto | parkas | yra | puikus | — | — | pasivaikščiojimui | prie | — | vandens.", "Uosto parkas puikiai tinka pasivaikščiojimui prie vandens.",
        { flags: { 4: "“for”: no separate Lithuanian word; the dative pasivaikščiojimui carries it." } }),
    ],
    rec_museum: [
      t("The | Art | Museum | is | right | across | the | square, | and | there's | a | new | exhibition!", "— | Meno | muziejus | yra | štai | kitoje | — | aikštės pusėje, | ir | yra | — | nauja | paroda!", "Meno muziejus – štai kitoje aikštės pusėje, ir ten nauja paroda!"),
    ],
    rec_jazz: [
      t("Oh, | the | jazz | on | Friday | nights | is | wonderful, | and | it's | free!", "O, | — | džiazas | — | penktadienio | vakarais | yra | nuostabus, | ir | jis yra | nemokamas!", "O, penktadienio vakarų džiazas nuostabus, ir nemokamas!",
        { flags: { 3: "“on”: no separate Lithuanian word; the instrumental vakarais (time) carries it." } }),
    ],
    also_museum: [
      t("And | if | you | like | art, | the | museum | is | right | there, | across | the | square.", "O | jei | jūs | mėgstate | meną, | — | muziejus | yra | štai | ten, | kitoje | — | aikštės pusėje.", "O jei mėgstate meną, muziejus – štai ten, kitoje aikštės pusėje."),
    ],
    favorite: [t("Oh, | the | lighthouse | at sunset. | Every | time.", "O, | — | švyturys | saulėlydžio metu. | Kiekvieną | kartą.", "O, švyturys saulėlydžio metu. Kiekvieną kartą.")],
    locals_do: [
      t("Saturday | morning | at the market, | and | jazz | on | Friday | nights.", "Šeštadienio | rytas | turguje, | ir | džiazas | — | penktadienio | vakarais.", "Šeštadienio rytas turguje ir džiazas penktadienio vakarais.",
        { flags: { 5: "“on”: no separate Lithuanian word; the instrumental vakarais (time) carries it." } }),
    ],
    night: [
      t("There's | free | jazz | right | here | in the square | on | Friday | nights!", "Yra | nemokamas | džiazas | būtent | čia, | aikštėje, | — | penktadienio | vakarais!", "Penktadienio vakarais čia, aikštėje, – nemokamas džiazas!",
        { flags: { 6: "“on”: no separate Lithuanian word; the instrumental vakarais (time) carries it." } }),
    ],
    night_bar: [t("And | there's | a | little | bar | with | live | music | on Harbor Road.", "Ir | yra | — | mažas | baras | su | gyva | muzika | Harbor Road gatvėje.", "O Harbor Road gatvėje yra mažas baras su gyva muzika.")],
    no_crowds: [t("Then | try | Harbor | Park. | It's | always | quiet.", "Tada | išbandykite | Uosto | parką. | Ten yra | visada | ramu.", "Tada išbandykite Uosto parką – ten visada ramu.")],

    // --- follow-ups ----------------------------------------------------------------
    walk_lighthouse: [t("It's | about | thirty | minutes | on foot, | along | the | water. | Or | take | bus | number | three.", "Tai yra | apie | trisdešimt | minučių | pėsčiomis, | palei | — | vandenį. | Arba | važiuokite | autobusu | numeris | trys.", "Pėsčiomis – apie trisdešimt minučių palei vandenį. Arba važiuokite trečiu autobusu.")],
    walk_museum: [t("Oh, | it's | right | there, | across | the | square!", "O, | jis yra | štai | ten, | kitoje | — | aikštės pusėje!", "O, jis štai ten, kitoje aikštės pusėje!")],
    walk_harbor: [t("Yes, | it's | about | ten | minutes | on foot, | down | by | the | water.", "Taip, | tai yra | apie | dešimt | minučių | pėsčiomis, | žemyn | prie | — | vandens.", "Taip, apie dešimt minučių pėsčiomis, žemyn prie vandens.")],
    walk_close: [t("Yes, | it's | only | five | minutes | from | here.", "Taip, | tai yra | tik | penkios | minutės | nuo | čia.", "Taip, vos penkios minutės nuo čia.")],
    walk_here: [t("It's | right | here, | in the square!", "Tai yra | būtent | čia, | aikštėje!", "Čia pat, aikštėje!")],
    dir_lighthouse: [t("Walk | down | Harbor Road | to | the | water, | then | follow | the | path | along | the | water.", "Eikite | žemyn | Harbor Road gatve | iki | — | vandens, | tada | eikite | — | taku | palei | — | vandenį.", "Eikite Harbor Road gatve žemyn iki vandens, o tada – taku palei vandenį.")],
    dir_harbor: [t("Just | walk | down | Harbor Road | to | the | water.", "Tiesiog | eikite | žemyn | Harbor Road gatve | iki | — | vandens.", "Tiesiog eikite Harbor Road gatve žemyn iki vandens.")],
    dir_trattoria: [t("It's | just | one | block | that | way, | on Main Street.", "Tai yra | tik | vienas | kvartalas | ta | kryptimi, | Main Street gatvėje.", "Vos vienas kvartalas ta kryptimi, Main Street gatvėje.")],
    dir_sunny: [
      t("Go | down | Main Street | to | the | bank, | and | turn | left.", "Eikite | — | Main Street gatve | iki | — | banko | ir | pasukite | į kairę.", "Eikite Main Street gatve iki banko ir pasukite į kairę.",
        { flags: { 1: "“down”: no separate Lithuanian word; the instrumental gatve (along the street) carries it." } }),
    ],
    tour_bit: [t("A bit, | in the summer. | Go | early | in the morning. | That's | my | advice!", "Truputį, | vasarą. | Eikite | anksti | ryte. | Tai yra | mano | patarimas!", "Truputį, vasarą. Eikite anksti ryte – toks mano patarimas!")],
    tour_pier: [t("Yes, | a little, | but | the | food | is | really | good.", "Taip, | truputį, | bet | — | maistas | yra | tikrai | geras.", "Taip, truputį, bet maistas tikrai geras.")],
    tour_market: [t("A little, | on Saturdays, | but | that's | part | of the fun!", "Truputį, | šeštadieniais, | bet | tai yra | dalis | smagumo!", "Truputį, šeštadieniais, bet tai dalis smagumo!")],
    tour_locals: [t("Not really. | It's | mostly | locals.", "Nelabai. | Ten yra | daugiausia | vietiniai.", "Nelabai. Ten daugiausia vietiniai.")],
    tour_quiet: [t("Not really. | It's | nice | and | quiet.", "Nelabai. | Ten yra | gera | ir | ramu.", "Nelabai. Ten ramu ir gera.")],
    time_lighthouse: [t("At sunset! | Or | early | in the morning, | before | the | crowds.", "Saulėlydžio metu! | Arba | anksti | ryte, | prieš | — | minias.", "Saulėlydžio metu! Arba anksti ryte, kol nėra minių.")],
    time_market: [t("Go | early, | around | eight, | before | the | crowds.", "Eikite | anksti, | apie | aštuntą, | prieš | — | minias.", "Eikite anksti, apie aštuntą, kol nėra minių.")],
    time_museum: [t("Weekday | mornings | are | nice | and | quiet.", "Darbo dienų | rytai | yra | malonūs | ir | ramūs.", "Darbo dienų rytais ten ramu ir malonu.")],
    time_trattoria: [t("Go | early, | around | five-thirty, | or | you'll wait | for | a | table.", "Eikite | anksti, | apie | pusę šešių, | arba | lauksite | — | — | staliuko.", "Eikite anksti, apie pusę šešių, kitaip teks laukti staliuko.",
      { flags: { 6: "“for”: no separate Lithuanian word; the genitive staliuko (laukti ko?) carries it." } })],
    time_pier: [t("For | the | view, | sunset. | But | book | a | table!", "Dėl | — | vaizdo, | saulėlydžio metu. | Bet | užsisakykite | — | staliuką!", "Dėl vaizdo – saulėlydžio metu. Bet užsisakykite staliuką!")],
    time_boat: [t("The | morning | tour | is | the | best.", "— | Rytinė | ekskursija | yra | — | geriausia.", "Rytinė ekskursija geriausia.")],
    time_trucks: [t("Lunchtime! | They | open | at eleven.", "Pietų metu! | Jie | atsidaro | vienuoliktą.", "Pietų metu! Jie atsidaro vienuoliktą.")],
    time_jazz: [t("It | starts | at seven, | but | come | early | for | a | good | seat.", "Jis | prasideda | septintą, | bet | ateikite | anksčiau | dėl | — | geros | vietos.", "Prasideda septintą, bet ateikite anksčiau, kad gautumėte gerą vietą.")],
    time_any: [t("Anytime! | But | mornings | are | the | best.", "Bet kada! | Bet | rytai | yra | — | geriausi.", "Bet kada! Bet rytais geriausia.")],
    price_pier: [t("It's | a little | pricey, | about | thirty | dollars | for dinner.", "Tai yra | truputį | brangu, | apie | trisdešimt | dolerių | vakarienei.", "Truputį brangoka – vakarienė apie trisdešimt dolerių.")],
    price_trattoria: [t("Not too bad, | about | twenty | dollars.", "Visai neblogai, | apie | dvidešimt | dolerių.", "Visai neblogai – apie dvidešimt dolerių.")],
    price_cheap: [t("No, | it's | cheap! | About | ten | dollars.", "Ne, | tai yra | pigu! | Apie | dešimt | dolerių.", "Ne, pigu! Apie dešimt dolerių.")],
    price_free: [t("It's | free!", "Tai yra | nemokama!", "Nemokamai!")],
    price_museum: [t("About | eighteen | dollars, | I | think. | Students | pay | less.", "Apie | aštuoniolika | dolerių, | aš | manau. | Studentai | moka | mažiau.", "Apie aštuoniolika dolerių, manau. Studentai moka mažiau.")],
    price_boat: [t("About | thirty-five | dollars, | I | think.", "Apie | trisdešimt penkis | dolerius, | aš | manau.", "Apie trisdešimt penkis dolerius, manau.")],
    book_pier: [t("For dinner, | yes. | Especially | on weekends.", "Vakarienei, | taip. | Ypač | savaitgaliais.", "Vakarienei – taip. Ypač savaitgaliais.")],
    book_trattoria: [t("They | don't take | reservations. | Just | go | early.", "Jie | nepriima | rezervacijų. | Tiesiog | eikite | anksti.", "Jie nepriima rezervacijų. Tiesiog eikite anksti.")],
    book_boat: [t("Yes! | Book | the | day | before, | by phone | or | online.", "Taip! | Užsisakykite | — | dieną | prieš, | telefonu | arba | internetu.", "Taip! Užsisakykite dieną prieš – telefonu arba internetu.")],
    book_no: [t("No, | you | can | just | go.", "Ne, | jūs | galite | tiesiog | eiti.", "Ne, galite tiesiog eiti.")],
    open_museum: [t("It's | open | ten | to | five, | but | it's | closed | on Mondays.", "Jis yra | atidarytas | nuo dešimties | iki | penkių, | bet | jis yra | uždarytas | pirmadieniais.", "Jis dirba nuo dešimties iki penkių, bet pirmadieniais uždarytas.")],
    open_market: [t("Only | on Saturdays, | from | eight | to | one.", "Tik | šeštadieniais, | nuo | aštuonių | iki | pirmos.", "Tik šeštadieniais, nuo aštuonių iki pirmos.")],
    open_jazz: [t("Every | Friday, | at seven.", "Kiekvieną | penktadienį, | septintą.", "Kiekvieną penktadienį, septintą.")],
    open_path: [t("The | path | is | always | open!", "— | Takas | yra | visada | atviras!", "Takas visada atviras!")],
    open_generic: [t("I | think | so! | Every | day.", "Aš | manau, | kad taip! | Kiekvieną | dieną.", "Manau, kad taip! Kiekvieną dieną.")],
    worth: [t("Absolutely! | You'll love | it.", "Absoliučiai! | Jums patiks | tai.", "Tikrai! Jums patiks.")],
    safe: [t("Oh, | yes, | it's | very | safe. | But | the | lighthouse | path | is | dark, | so | take | a | taxi | back.", "O, | taip, | čia yra | labai | saugu. | Bet | — | švyturio | takas | yra | tamsus, | tad | važiuokite | — | taksi | atgal.", "O, taip, čia labai saugu. Bet takas prie švyturio tamsus, tad atgal grįžkite taksi.")],
    no_walk: [t("Then | take | bus | number | three. | It | stops | right | here.", "Tada | važiuokite | autobusu | numeris | trys. | Jis | sustoja | būtent | čia.", "Tada važiuokite trečiu autobusu. Jis sustoja čia pat.")],
    which_spot: [t("Which | place, | dear?", "Kuri | vieta, | {m:mielasis|f:mieloji}?", "Apie kurią vietą klausiate, {m:mielasis|f:mieloji}?")],
    no_problem: [t("Oh, | okay!", "O, | gerai!", "O, gerai!")],
    help_sure: [t("Of course, | dear! | What | do | you | need?", "Žinoma, | {m:mielasis|f:mieloji}! | Ko | — | jums | reikia?", "Žinoma, {m:mielasis|f:mieloji}! Ko jums reikia?", { flags: { 3: "Question “do” has no Lithuanian word; the dative jums + reikia carries it." } })],

    // --- small talk and twists -------------------------------------------------------
    ask_from: [
      t("So, | where | are | you | from, | dear?", "Tai, | iš kur | esate | jūs | [iš kur], | {m:mielasis|f:mieloji}?", "Tai iš kur jūs, {m:mielasis|f:mieloji}?",
        { flags: { 4: "Stranded “from”: its Lithuanian form (iš) is carried by iš kur at the start." } }),
    ],
    from_lt: [t("Lithuania! | How | wonderful! | My | neighbor's | grandmother | was | from | Vilnius.", "Lietuva! | Kaip | nuostabu! | Mano | kaimynės | močiutė | buvo | iš | Vilniaus.", "Lietuva! Kaip nuostabu! Mano kaimynės močiutė buvo iš Vilniaus.")],
    from_other: [t("Oh, | how | nice! | Welcome | to | Maple Harbor!", "O, | kaip | malonu! | Sveiki atvykę | į | Maple Harborą!", "O, kaip malonu! Sveiki atvykę į Maple Harborą!")],
    walk_offer: [
      t("You know what? | I'm going | that | way | myself. | Want | me | to walk | with | you?", "Žinote ką? | Einu | ta | kryptimi | pati. | Norite, | kad aš | eičiau | kartu su | jumis?", "Žinote ką? Aš pati einu ta kryptimi. Palydėti jus?"),
    ],
    walk_yes: [t("Wonderful! | Let's go. | I | love | a | good | walk.", "Puiku! | Eime. | Aš | mėgstu | — | gerą | pasivaikščiojimą.", "Puiku! Eime. Mėgstu gerai pasivaikščioti.")],
    market_seller: [
      t("Oh, | I | don't work | here, | dear! | The | stalls | are | right | behind | me.", "O, | aš | nedirbu | čia, | {m:mielasis|f:mieloji}! | — | Prekystaliai | yra | tiesiai | už | manęs.",
        "O, aš čia nedirbu, {m:mielasis|f:mieloji}! Prekystaliai – tiesiai už manęs."),
    ],
    market_where: [
      t("Right | here, | dear! | The | stalls | are | right | behind | me.", "Būtent | čia, | {m:mielasis|f:mieloji}! | — | Prekystaliai | yra | tiesiai | už | manęs.",
        "Čia pat, {m:mielasis|f:mieloji}! Prekystaliai – tiesiai už manęs."),
    ],
    market_tip: [
      t("The | peaches | are | wonderful | today.", "— | Persikai | yra | nuostabūs | šiandien.", "Persikai šiandien nuostabūs."),
    ],
    walk_no: [t("No | problem, | dear!", "Jokių | problemų, | {m:mielasis|f:mieloji}!", "Jokių problemų, {m:mielasis|f:mieloji}!")],

    // --- the end ------------------------------------------------------------------------
    prompt_sight: [
      t("And | while | you're | here, | is | there | anything | you'd like | to see?", "O | kol | jūs esate | čia, | ar yra | — | ką nors, | ką norėtumėte | pamatyti?", "O kol esate čia, gal norėtumėte ką nors pamatyti?",
        { flags: { 5: "Existential “there” has no Lithuanian word; yra carries it." } }),
    ],
    nudge_sight: [t("Well, | don't leave | without seeing | this:", "Na, | neišvažiuokite | nepamatę | šito:", "Na, neišvažiuokite nepamatę štai ko:")],
    prompt_food: [t("And | are | you | hungry? | I | know | all | the | good | places | to eat!", "O | ar | jūs | {m:alkanas|f:alkana}? | Aš | žinau | visas | — | geras | vietas | pavalgyti!", "O gal esate {m:alkanas|f:alkana}? Žinau visas geras vietas pavalgyti!",
      { flags: { 1: "“are” in a yes/no question = the particle ar; the copula has no separate word." } })],
    ask_more: [
      t("Anything | else, | dear?", "Ko nors | dar, | {m:mielasis|f:mieloji}?", "Dar ko nors, {m:mielasis|f:mieloji}?"),
      t("Can | I | help | you | with | anything | else?", "Ar galiu | aš | padėti | jums | — | kuo nors | daugiau?", "Ar dar kuo nors galiu padėti?",
        { flags: { 4: "“with”: no separate Lithuanian word; the instrumental kuo nors carries it." } }),
    ],
    thanks_reply: [
      t("My | pleasure!", "Mano | malonumas!", "Nėra už ką!"),
      t("Oh, | anytime! | Tell | your | friends | about | Maple Harbor!", "O, | visada prašom! | Papasakokite | savo | draugams | apie | Maple Harborą!", "O, visada prašom! Papasakokite draugams apie Maple Harborą!"),
    ],
    closing: [
      t("Enjoy | Maple Harbor, | dear!", "Mėgaukitės | Maple Harboru, | {m:mielasis|f:mieloji}!", "Mėgaukitės Maple Harboru, {m:mielasis|f:mieloji}!"),
      t("Have | a | wonderful | time!", "Praleiskite | — | nuostabiai | laiką!", "Puikiai praleiskite laiką!"),
    ],
  },

  hints: {
    local: {
      lt: "Užkalbinti vietinę",
      items: [
        { id: "l_from", s: t("Excuse me, | are | you | from | around here?", "Atsiprašau, | ar esate | jūs | iš | čia?", "Atsiprašau, ar jūs vietinė?"), note: "Mandagus būdas užkalbinti nepažįstamąjį." },
        { id: "l_live", s: t("Do | you | live | here?", "Ar | jūs | gyvenate | čia?", "Ar jūs čia gyvenate?", { flags: { 0: "Question “Do” = the particle ar." } }) },
        { id: "l_local", s: t("Are | you | a | local?", "Ar esate | jūs | — | vietinė?", "Ar jūs vietinė?") },
      ],
    },
    ask_general: {
      lt: "Paprašyti patarimo",
      items: [
        { id: "r_what", s: t("What | would | you | recommend?", "Ką | — | jūs | rekomenduotumėte?", "Ką rekomenduotumėte?", { flags: { 1: "“would”: the conditional ending of rekomenduotumėte carries it." } }) },
        { id: "r_tips", s: t("Do | you | have | any | tips?", "Ar | jūs | turite | kokių nors | patarimų?", "Gal turite patarimų?", { flags: { 0: "Question “Do” = the particle ar." } }) },
      ],
    },
    food: {
      lt: "Paklausti, kur pavalgyti", slot: "cuisine", examples: ["seafood", "italian", "burgers"],
      items: [
        { id: "f_recommend", s: t("Can | you | recommend | a | good | place | to eat?", "Ar galite | jūs | rekomenduoti | — | gerą | vietą | pavalgyti?", "Ar galite rekomenduoti gerą vietą pavalgyti?") },
        { id: "f_where_good", s: t("Where's | a | good | place | to eat | around here?", "Kur yra | — | gera | vieta | pavalgyti | čia?", "Kur čia gera vieta pavalgyti?") },
        { id: "f_somewhere_cheap", s: t("I'm looking | for | somewhere | to eat | that's | not | too | expensive.", "Ieškau | — | kur nors | pavalgyti, | kur yra | ne | per | brangu.", "Ieškau vietos pavalgyti, kur nebūtų per brangu.", { flags: { 1: "“for”: no separate Lithuanian word; ieškau + the object carries it." } }), note: "„Not too expensive“ – mandagiai pasakyti, kad nenori brangaus restorano." },
        { id: "f_locals", s: t("Where | do | the | locals | go?", "Kur | — | — | vietiniai | eina?", "Kur eina vietiniai?", { flags: { 1: "Question “do” has no Lithuanian word; the tense sits on eina." } }) },
        { id: "f_cuisine", s: t("Where | can | I | get | good | {X}?", "Kur | galiu | aš | gauti | {geras@X:gen} | {X:gen}?", "Kur galėčiau gauti {geras@X:gen} {X:gen}?"), only: (e) => !e.attrs?.pl && e.id !== "quick" },
        { id: "f_cuisine", s: t("Where | can | I | get | good | {X}?", "Kur | galiu | aš | gauti | {geras@X:gen:pl} | {X:gen}?", "Kur galėčiau gauti {geras@X:gen:pl} {X:gen}?"), only: (e) => !!e.attrs?.pl },
        { id: "f_cuisine_place", s: t("Is | there | a | good | {X} | place | near | here?", "Ar yra | — | — | gera | {X:gen} | vieta | netoli | čia?", "Ar netoliese yra gera {X:gen} vieta?", { flags: { 1: "Existential “there” has no Lithuanian word; yra carries it." } }), only: (e) => ["seafood", "breakfast", "coffee"].includes(e.id) },
        { id: "f_lunch", s: t("What | would | you | recommend | for lunch?", "Ką | — | jūs | rekomenduotumėte | pietums?", "Ką rekomenduotumėte pietums?", { flags: { 1: "“would”: the conditional ending of rekomenduotumėte carries it." } }) },
      ],
    },
    cuisine: {
      lt: "Pasakyti, ko norėtum", slot: "cuisine", examples: ["seafood", "italian", "quick"],
      items: [
        { id: "k_cuisine", s: t("{X}, | please.", "{X:gen}, | prašau.", "{X:gen}, prašau.") },
        { id: "k_love", s: t("I | love | {X}!", "Aš | dievinu | {X:acc}!", "Dievinu {X:acc}!"), only: (e) => !["quick", "local"].includes(e.id) },
        { id: "k_cheap", s: t("Something | cheap, | please.", "Kažko | pigaus, | prašau.", "Kažko pigaus, prašau.") },
        { id: "k_anything", s: t("Anything | is fine!", "Bet kas | tinka!", "Bet kas tinka!") },
        { id: "k_not", s: t("I | don't eat | {X}.", "Aš | nevalgau | {X:gen}.", "Nevalgau {X:gen}."), only: (e) => ["seafood", "burgers"].includes(e.id) },
      ],
    },
    sight: {
      lt: "Paklausti, ką pamatyti",
      items: [
        { id: "s_worth", s: t("What's | worth | seeing | here?", "Ką | verta | pamatyti | čia?", "Ką čia verta pamatyti?", { flags: { 0: "“'s” (is): no separate word in Lithuanian; verta carries the predicate." } }) },
        { id: "s_should_see", s: t("What | should | I | see | while | I'm | here?", "Ką | — | man | pamatyti, | kol | aš esu | čia?", "Ką man pamatyti, kol esu čia?", { flags: { 1: "“should”: the dative man + infinitive carries the advice question." } }) },
        { id: "s_anything", s: t("Is | there | anything | interesting | to see?", "Ar yra | — | ko nors | įdomaus | pamatyti?", "Ar yra ką nors įdomaus pamatyti?", { flags: { 1: "Existential “there” has no Lithuanian word; yra carries it." } }) },
        { id: "s_best", s: t("What's | the | best | thing | to do | here?", "Koks yra | — | geriausias | dalykas | nuveikti | čia?", "Ką geriausia čia nuveikti?") },
        { id: "s_new", s: t("What | would | you | do | if | you | were | new | here?", "Ką | — | jūs | darytumėte, | jei | jūs | būtumėte | naujokė | čia?", "Ką darytumėte, jei būtumėte čia pirmą kartą?", { flags: { 1: "“would”: the conditional ending of darytumėte carries it." } }), note: "Eilutė iš dainos." },
        { id: "s_favorite", s: t("What's | your | favorite | place?", "Kokia yra | jūsų | mėgstamiausia | vieta?", "Kokia jūsų mėgstamiausia vieta?") },
      ],
    },
    follow: {
      lt: "Pasitikslinti apie vietą",
      items: [
        { id: "u_walk", s: t("Is | it | within | walking distance?", "Ar | tai | — | pėsčiomis pasiekiama?", "Ar ten galima nueiti pėsčiomis?", { flags: { 0: "“Is” in a yes/no question = the particle ar.", 2: "“within”: carried by pasiekiama (reachable)." } }) },
        { id: "u_how", s: t("How | do | I | get | there?", "Kaip | — | man | nueiti | ten?", "Kaip ten nueiti?", { flags: { 1: "Question “do” has no Lithuanian word; man + the infinitive carries it." } }) },
        { id: "u_touristy", s: t("Is | it | touristy?", "Ar | ten | daug turistų?", "Ar ten daug turistų?", { flags: { 0: "“Is” in a yes/no question = the particle ar." } }) },
        { id: "u_time", s: t("What's | the | best | time | to go?", "Koks yra | — | geriausias | laikas | nueiti?", "Kada geriausia nueiti?") },
        { id: "u_expensive", s: t("Is | it | expensive?", "Ar | tai | brangu?", "Ar brangu?", { flags: { 0: "“Is” in a yes/no question = the particle ar." } }) },
        { id: "u_book", s: t("Do | I | need | to book?", "Ar | man | reikia | užsisakyti?", "Ar reikia užsisakyti iš anksto?", { flags: { 0: "Question “Do” = the particle ar." } }) },
        { id: "u_open", s: t("Is | it | open | today?", "Ar | tai | atidaryta | šiandien?", "Ar šiandien atidaryta?", { flags: { 0: "“Is” in a yes/no question = the particle ar." } }) },
        { id: "u_safe", s: t("Is | it | safe | at night?", "Ar | — | saugu | naktį?", "Ar naktį saugu?", { flags: { 0: "“Is” in a yes/no question = the particle ar.", 1: "Dummy “it”: the impersonal saugu needs no subject." } }) },
      ],
    },
    night: {
      lt: "Paklausti apie vakarus ir kavą",
      items: [
        { id: "n_night", s: t("What's | there | to do | at night?", "Ką | — | veikti | vakarais?", "Ką čia veikti vakarais?", { flags: { 0: "“'s” (is): no separate word; the infinitive question carries it.", 1: "Existential “there” has no Lithuanian word." } }) },
        { id: "c_best_coffee", s: t("Where's | the | best | coffee | in town?", "Kur yra | — | geriausia | kava | mieste?", "Kur geriausia kava mieste?") },
      ],
    },
    thanks: {
      lt: "Padėkoti už patarimus",
      items: [
        { id: "t_all", s: t("No, | that's | all. | Thanks | for | the | tips!", "Ne, | tai yra | viskas. | Ačiū | už | — | patarimus!", "Ne, tai viskas. Ačiū už patarimus!") },
        { id: "t_tip", s: t("Thanks | for | the | tip!", "Ačiū | už | — | patarimą!", "Ačiū už patarimą!") },
        { id: "t_helpful", s: t("You've been | really | helpful!", "Jūs | tikrai | padėjote!", "Jūs man labai padėjote!", { flags: { 0: "“You've been”: the past tense of padėjote carries it (helpful → padėjote)." } }) },
        { id: "t_sounds", s: t("That | sounds | great!", "Tai | skamba | puikiai!", "Skamba puikiai!") },
        { id: "t_check", s: t("I'll check | it | out!", "Užsuksiu | ten | —!", "Būtinai užsuksiu!", { flags: { 2: "Discontinuous “check … out”: the verb užsuksiu carries “out”." } }) },
      ],
    },
    hungry: {
      lt: "Pasakyti, kad nori valgyti",
      items: [
        { id: "hg_hungry", s: t("Yes, | I'm | hungry!", "Taip, | aš esu | {m:alkanas|f:alkana}!", "Taip, esu {m:alkanas|f:alkana}!") },
        { id: "hg_where", s: t("Yes! | Where | should | I | eat?", "Taip! | Kur | — | man | pavalgyti?", "Taip! Kur man pavalgyti?", { flags: { 2: "“should”: the dative man + infinitive carries the advice question." } }) },
        { id: "hg_recommend", s: t("Yes, | what | would | you | recommend?", "Taip, | ką | — | jūs | rekomenduotumėte?", "Taip, ką rekomenduotumėte?", { flags: { 2: "“would”: the conditional ending of rekomenduotumėte carries it." } }) },
      ],
    },
    weather: {
      lt: "Sutikti, kad graži diena",
      items: [
        { id: "wt_day", s: t("Yes, | beautiful | day!", "Taip, | graži | diena!", "Taip, graži diena!") },
        { id: "wt_really", s: t("It | really | is!", "Tai | tikrai | [graži]!", "Tikrai graži!", { flags: { 2: "Elliptical “is” (it really is [beautiful]): Lithuanian repeats the adjective." } }) },
        { id: "wt_lovely", s: t("Yes, | it's | a | lovely | day!", "Taip, | tai yra | — | nuostabi | diena!", "Taip, nuostabi diena!") },
      ],
    },
    tried: {
      lt: "Atsakyti, ar išbandei",
      items: [
        { id: "tr_delicious", s: t("Yes, | it | was | delicious!", "Taip, | tai | buvo | labai skanu!", "Taip, buvo labai skanu!") },
        { id: "tr_not_yet", s: t("Not yet.", "Dar ne.", "Dar ne.") },
        { id: "tr_great", s: t("Yes, | it | was | great!", "Taip, | tai | buvo | puiku!", "Taip, buvo puiku!") },
      ],
    },
    kind: {
      lt: "Pasakyti: pavalgyti ar pamatyti",
      items: [
        { id: "kd_food", s: t("Food, | please!", "Pavalgyti, | prašau!", "Pavalgyti, prašau!") },
        { id: "kd_see", s: t("Something | to see.", "Ką nors | pamatyti.", "Ką nors pamatyti.") },
        { id: "kd_both", s: t("Both!", "Abu!", "Ir tą, ir tą!") },
      ],
    },
    from: {
      lt: "Pasakyti, iš kur esi",
      items: [
        { id: "o_from", s: t("I'm | from | Lithuania.", "Aš esu | iš | Lietuvos.", "Esu iš Lietuvos.") },
        { id: "o_city", s: t("From | Vilnius.", "Iš | Vilniaus.", "Iš Vilniaus.") },
      ],
    },
    walk: {
      lt: "Priimti arba mandagiai atsisakyti pasiūlymo",
      items: [
        { id: "w_yes", s: t("That | would | be | great, | thanks!", "Tai | — | būtų | puiku, | ačiū!", "Būtų puiku, ačiū!", { flags: { 1: "“would” has no separate word: the conditional būtų carries it." } }) },
        { id: "w_kind", s: t("That's | so | kind | of you!", "Tai yra | taip | malonu | iš jūsų pusės!", "Kaip malonu iš jūsų pusės!") },
        { id: "w_no", s: t("That's | okay, | I'll find | it. | Thank | you!", "Viskas | gerai, | rasiu | tai. | Dėkoju | jums!", "Nieko tokio, rasiu. Ačiū jums!") },
      ],
    },
    spots: {
      lt: "Paklausti apie konkrečią vietą", slot: "spot", examples: ["lighthouse", "pier", "boat"],
      items: [
        ...placeHint({ id: "p_worth", s: t("Is | {X} | worth | it?", "Ar | {X:nom} | {vertas@X:nom} | to?", "Ar {X:nom} to {vertas@X:nom}?", { flags: { 0: "“Is” in a yes/no question = the particle ar." } }) }, (e) => e.id !== "trucks"),
        ...placeHint({ id: "p_far", s: t("Is | {X} | far | from | here?", "Ar | {X:nom} | toli | nuo | čia?", "Ar {X:nom} toli nuo čia?", { flags: { 0: "“Is” in a yes/no question = the particle ar." } }) }, (e) => !["trucks", "boat", "jazz"].includes(e.id)),
      ],
    },
  },

  tips: {
    us_raised: { key: "us_raised", lt: "Suprasta! Amerikoje dažniau sakoma „born and raised“.", better: "Born and raised!" },
  },

  merges: {
    "you'd love": { reason: "grammatical_fusion", split: "you'd → jūs + love → mylėtumėte is false; the future seen from the past = (kad) jums patiks.", minimal: "Two words." },
    "you'd like": { reason: "grammatical_fusion", split: "you'd → jūs drops “would”; the conditional ending of norėtumėte carries would + like.", minimal: "Two words." },
    "excuse me": { reason: "lexical_expression", split: "excuse → atleiskite + me → man is a calque; the polite opener = atsiprašau.", minimal: "Two words." },
    "get hungry": { reason: "lexical_expression", split: "get → gauti + hungry → alkanas is false; “get hungry” = išalkti.", minimal: "Two words." },
    "without seeing": { reason: "grammatical_fusion", split: "without → be + seeing → matant is a calque; Lithuanian uses the negated participle nepamatę.", minimal: "Two words." },
    "around here": { reason: "lexical_expression", split: "around → aplink + here → čia (“aplink čia”) is false; = čia, šiose apylinkėse.", minimal: "Two words." },
    "hello there": { reason: "lexical_expression", split: "there → ten would add a false place; one greeting = sveiki.", minimal: "Two words, one greeting." },
    "with something": { reason: "grammatical_fusion", split: "with → su is false here; the instrumental kuo nors carries it.", minimal: "Preposition + pronoun." },
    "isn't it": { reason: "lexical_expression", split: "isn't → nėra + it → tai (“nėra tai”) is false; the question tag = ar ne.", minimal: "Tag question, two words." },
    "i've lived": { reason: "grammatical_fusion", split: "I've → aš turiu + lived → gyvenęs is false; the present perfect of duration = the present gyvenu.", minimal: "Two words." },
    "feel like": { reason: "lexical_expression", split: "feel → jaučiate + like → patinka is false; “feel like” = norėtis (jums norisi).", minimal: "Two words." },
    "the pier": { reason: "lexical_expression", split: "A restaurant name; the → — + pier → prieplauka would turn the name into a common noun.", minimal: "The article is part of the name." },
    "sunny cup": { reason: "lexical_expression", split: "A café name; sunny → saulėtas + cup → puodelis would translate the name.", minimal: "Two-word name." },
    "maple harbor": { reason: "lexical_expression", split: "A proper name; maple → klevas + harbor → uostas would translate the town's name.", minimal: "Two-word name." },
    "harbor road": { reason: "lexical_expression", split: "A street name; harbor → uostas + road → kelias would translate the name.", minimal: "Two-word name." },
    "main street": { reason: "lexical_expression", split: "A street name; main → pagrindinė + street → gatvė would translate the name.", minimal: "Two-word name." },
    "on oak avenue": { reason: "grammatical_fusion", split: "on → ant is false for a street; the locative Oak Avenue gatvėje carries it.", minimal: "Preposition + name." },
    "on harbor road": { reason: "grammatical_fusion", split: "on → ant is false for a street; the locative Harbor Road gatvėje carries it.", minimal: "Preposition + name." },
    "on main street": { reason: "grammatical_fusion", split: "on → ant is false for a street; the locative Main Street gatvėje carries it.", minimal: "Preposition + name." },
    "a little": { reason: "lexical_expression", split: "a → — + little → mažas is false with an adjective; = truputį.", minimal: "Two words." },
    "a bit": { reason: "lexical_expression", split: "a → — + bit → gabalėlis is false; = truputį.", minimal: "Two words." },
    "for sure": { reason: "lexical_expression", split: "for → už + sure → tikras is false; = tikrai.", minimal: "Two words." },
    "not really": { reason: "grammatical_fusion", split: "not → ne + really → tikrai gives “ne tikrai”; the hedged no = nelabai.", minimal: "Two words." },
    "not too bad": { reason: "lexical_expression", split: "not → ne + too → per + bad → blogai gives “ne per blogai”; = visai neblogai.", minimal: "Three words." },
    "no question": { reason: "lexical_expression", split: "no → joks + question → klausimas is false; = be jokių abejonių.", minimal: "Two words." },
    "you know what": { reason: "lexical_expression", split: "you → jūs + know → žinote + what → ką is a literal reading of an attention-getter; = žinote ką.", minimal: "Three words, one phrase." },
    "let's go": { reason: "lexical_expression", split: "let's → leiskime + go → eiti is a calque; = eime.", minimal: "Two words." },
    "walking distance": { reason: "lexical_expression", split: "walking → einantis + distance → atstumas is false; “within walking distance” = pasiekiama pėsčiomis.", minimal: "Two words." },
    "you've been": { reason: "grammatical_fusion", split: "you've → jūs turite + been → buvę is false; the perfect = the past (padėjote).", minimal: "Two words." },
    "of you": { reason: "grammatical_fusion", split: "of → iš + you → jūsų; kind of you = malonu iš jūsų pusės.", minimal: "Preposition + pronoun." },
    "not yet": { reason: "lexical_expression", split: "not → ne + yet → dar gives the order “ne dar”; the answer = dar ne.", minimal: "Two words." },
    "i'll check": { reason: "grammatical_fusion", split: "I'll → aš + check → patikrinti is false; “check out” (a place) = užsukti; future on the verb.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  // The plan: where to eat → what to see → thank her. Rosa's own questions (what kind of food, where are you from)
  // join the list when she asks them.
  mission: [
    { lt: "Paklausk, kur pavalgyti", done: (c) => !!c.s.foodRec || !!c.s.wantFood },
    { step: "food_kind", lt: "Pasakyk, kokio maisto nori", optional: true },
    { lt: "Pasakyk, iš kur esi", optional: true, when: (c) => (c as ConvCtx).conv.pending?.id === "from", done: (c) => !!c.s.fromAnswered },
    { lt: "Paklausk, ką verta pamatyti", done: (c) => !!c.s.sightRec },
    { step: "more", lt: "Padėkok už patarimus" },
  ],
  steps: [
    // until there is a tip to follow up: a first question about something else ("Is it safe at night?",
    // "When does the market close?") gets its answer, then "Are you looking for a place to eat, or something
    // to see?" (it used to end the conversation, and count as done, with no tip at all)
    { id: "need", done: (c) => !!(c.s.foodRec || c.s.sightRec || c.s.wantFood),
      // the second time: "Are you looking for a place to eat, or something to see?" (the same answers as to which_kind)
      ask: (c) => { c.s.needAsks = (c.s.needAsks || 0) + 1; if (c.s.needAsks > 1) { c.say("ask_need_again"); expectKind(c); } else c.say("ask_need"); },
      // no bare "kind_ctx" here: the expected-intent bonus is per segment and would split "local food"
      expects: ["are_you_local", "ask_food", "ask_sight", "recommend_vague", "ask_coffee", "ask_night", "ask_locals"],
      suggest: [
        { lt: "Paklausti, kur gerai pavalgyti", hint: "food", options: "cuisine" },
        { lt: "Paklausti, ką verta pamatyti", hint: "sight" },
        { lt: "Paklausti, ar ji vietinė", hint: "local" },
        { lt: "Paprašyti patarimo", hint: "ask_general" },
      ],
      help: (c) => { c.say("ask_need_again"); } },
    { id: "food_kind", when: (c) => !!c.s.wantFood && !c.s.foodRec, done: () => false,
      ask: (c) => c.say("ask_cuisine"),
      expects: ["food_ans", "food_neg"],
      suggest: [{ lt: "Pasakyti, kokio maisto nori", hint: "cuisine", options: "cuisine" }, { lt: "Paprašyti pigesnės vietos", hint: "food" }],
      help: (c) => { recommend(c, foodFor(c, undefined, !!c.s.cheap)); } },
    // Rosa asks once; if the learner talks about something else, she lets it go (an optional question).
    { id: "from", when: (c) => c.s.askFrom && !!(c.s.foodRec || c.s.sightRec) && !(c.s.foodRec && c.s.sightRec), done: (c) => !!c.s.fromDone,
      ask: (c) => {
        c.s.fromDone = true;
        c.say("ask_from");
        c.expect({ id: "from", optional: true, expects: ["from_ctx"], suggest: [{ lt: "Pasakyti, iš kur esi", hint: "from" }] });
      },
      expects: ["from_ctx"],
      suggest: [{ lt: "Pasakyti, iš kur esi", hint: "from" }] },
    { id: "sight", when: (c) => !!c.s.foodRec && !c.s.sightRec, done: (c) => !!c.s.sightRec,
      ask: (c) => { c.s.sightAsks = (c.s.sightAsks || 0) + 1; if (c.s.sightAsks > 1) { c.say("nudge_sight"); recommend(c, sightFor(c, []), true); thenNext(c); return; } c.say("prompt_sight"); },
      expects: ["ask_sight", "recommend_vague", "spot_ctx"],
      suggest: [{ lt: "Paklausti, ką verta pamatyti", hint: "sight" }, { lt: "Pasitikslinti apie vietą", hint: "follow" }],
      yes: (c) => { recommend(c, c.s.sightRec ? anotherSight(c) : sightFor(c, [])); },
      no: (c) => { if (c.s.sightRec) { c.say("no_problem"); return; } c.say("nudge_sight"); recommend(c, sightFor(c, [])); } },
    { id: "food", when: (c) => !!c.s.sightRec && !c.s.foodRec && !c.s.wantFood, done: (c) => !!c.s.foodRec || !!c.s.wantFood,
      ask: (c) => { c.s.foodAsks = (c.s.foodAsks || 0) + 1; if (c.s.foodAsks > 1) { c.say("later_food"); recommend(c, foodFor(c, undefined, !!c.s.cheap), true); thenNext(c); return; } c.say("prompt_food"); },
      expects: ["ask_food", "food_ans", "not_hungry"],
      suggest: [{ lt: "Pasakyti, kad nori valgyti", hint: "hungry" }, { lt: "Paklausti, kur pavalgyti", hint: "food", options: "cuisine" }, { lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
      yes: (c) => { if (!c.s.foodRec) c.s.wantFood = true; else c.say("no_problem"); },
      no: (c) => { if (c.s.foodRec) { c.say("no_problem"); return; } c.say("later_food"); recommend(c, foodFor(c, undefined, !!c.s.cheap)); } },
    { id: "walk", when: (c) => c.s.walkTwist && !!c.s.foodRec && !!c.s.sightRec, done: (c) => !!c.s.walkDone,
      ask: (c) => { c.s.walkDone = true; c.twist("walk_with_you"); c.say("walk_offer");
        c.expect({ id: "walk", optional: true, expects: ["walk_yes_ctx", "walk_no_ctx"], hints: ["walk"], suggest: [{ lt: "Priimti arba atsisakyti pasiūlymo", hint: "walk" }],
          yes: (cc) => { cc.s.walkAnswered = true; cc.say("walk_yes"); cc.event("follow", { npc: "rosa", to: KIND[cc.s.topic] ? cc.s.topic : "lighthouse" }); },
          no: (cc) => { cc.s.walkAnswered = true; cc.say("walk_no"); } }); } },
    { id: "more", when: (c) => !!c.s.foodRec && !!c.s.sightRec, done: (c) => !!c.s.moreDone,
      ask: (c) => c.say("ask_more"),
      expects: ["more_no", "thanks_tip"],
      suggest: [{ lt: "Padėkoti už patarimus", hint: "thanks" }, { lt: "Pasitikslinti apie vietą", hint: "follow" }, { lt: "Paklausti apie vakarus ir kavą", hint: "night" }],
      yes: (c) => { c.say("ask_need"); c.hold(); },
      no: (c) => { c.s.moreDone = true; } },
  ],

  init: (c) => {
    c.s.recs = [];
    c.s.avoid = [];
    c.s.foodDefault = c.pick(["trattoria", "pier"]);
    c.s.sightDefault = c.visits >= 1 ? c.pick(["lighthouse", "boat"]) : "lighthouse";
    c.s.askFrom = c.chance(0.5);
    c.s.walkTwist = c.visits >= 1 && c.chance(0.5);
  },

  start: (c) => {
    const last = c.memory.lastTip as string | undefined;
    if (c.visits >= 1 && last && c.chance(0.6)) {
      c.say(hasThe(last) ? "tried_ask_the" : "tried_ask", { X: last });
      c.twist("tried_tip");
      const yes = (cc: Ctx) => { cc.say("tried_yes"); cc.say("ask_need"); cc.hold(); };
      const no = (cc: Ctx) => { cc.say("tried_no"); cc.say("ask_need"); cc.hold(); };
      c.expect({ id: "tried", optional: true, suggest: [{ lt: "Atsakyti, ar išbandei", hint: "tried" }],
        yes, no, on: { tried_yes_ctx: (cc) => { yes(cc); }, tried_no_ctx: (cc) => { no(cc); } } });
      return;
    }
    if (c.chance(0.3)) {
      c.say("open_weather");
      c.expect({ id: "weather", optional: true, expects: ["weather_ok"], suggest: [{ lt: "Sutikti, kad graži diena", hint: "weather" }, { lt: "Paklausti, kur gerai pavalgyti", hint: "food", options: "cuisine" }],
        yes: (cc) => { cc.say("weather_reply"); cc.hold(); }, no: (cc) => { cc.say("ask_need"); cc.hold(); },
        on: { weather_ok: (cc) => { cc.say("weather_reply"); cc.hold(); } } });
      return;
    }
    c.say("open");
    c.hold();
  },

  handlers: wrap(H),

  finish: (c) => {
    c.complete();
    c.say("closing");
    c.expect({ id: "closing", hints: ["g_social", "thanks"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("thanks_reply"); cc.end(); },
        thanks_tip: (cc) => { cc.say("thanks_reply"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // the market stalls in the picture: buying fruit gets a friendly pointer, never "I didn't understand"
    { say: "I'd like to buy some fruit", intent: "buy_produce" },
    { say: "Where can I buy vegetables?", intent: "buy_produce" },
    { say: "How much are the apples?", intent: "buy_produce", not: ["ask_price"] },
    { say: "Can I buy some tomatoes?", intent: "buy_produce" },
    { say: "Vegetables.", intent: "none" },
    { say: "Where can I get good seafood?", intent: "ask_food", not: ["buy_produce"] },
    { say: "When does it close?", intent: "ask_open" },
    { say: "How long is the market open?", intent: "ask_open" },
    { say: "Excuse me, are you from around here?", intent: "are_you_local" },
    { say: "Do you live here?", intent: "are_you_local" },
    { say: "Are you a local?", intent: "are_you_local" },
    { say: "What would you recommend?", intent: "recommend_vague" },
    { say: "Do you have any tips?", intent: "recommend_vague" },
    { say: "Can you recommend a good place to eat?", intent: "ask_food" },
    { say: "Can you recommend a place to eat? Not too expensive, please.", intent: "ask_food" },
    { say: "Where's a good place to eat around here?", intent: "ask_food" },
    { say: "I'm looking for somewhere to eat that's not too expensive.", intent: "ask_food" },
    { say: "Where do the locals go?", intent: "ask_locals" },
    { say: "Where can I get good seafood?", intent: "ask_food", slots: { cuisine: "seafood" } },
    { say: "Is there a good seafood place near here?", intent: "ask_food", slots: { cuisine: "seafood" } },
    { say: "What would you recommend for lunch?", intent: "ask_food" },
    { say: "Seafood, please", intent: "food_ans", step: "food_kind", slots: { cuisine: "seafood" } },
    { say: "I love Italian food!", intent: "food_ans", step: "food_kind", slots: { cuisine: "italian" } },
    { say: "Something cheap, please", intent: "budget", step: "food_kind" },
    { say: "Not too expensive, please", intent: "budget" },
    { say: "Anything is fine!", intent: "food_ans", step: "food_kind" },
    { say: "I don't eat seafood", intent: "food_neg", step: "food_kind", not: ["food_ans"] },
    { say: "I don't like fish", intent: "food_neg", not: ["ask_food", "food_ans"] },
    { say: "Not seafood, please", intent: "food_neg", step: "food_kind", not: ["food_ans"] },
    { say: "That's too expensive for me", intent: "too_expensive" },
    { say: "Is there anything cheaper?", intent: "too_expensive" },
    { say: "I'm not hungry", intent: "not_hungry", not: ["ask_food"] },
    { say: "What's worth seeing here?", intent: "ask_sight" },
    { say: "What should I see while I'm here?", intent: "ask_sight" },
    { say: "Is there anything interesting to see?", intent: "ask_sight" },
    { say: "What's the best thing to do here?", intent: "ask_sight" },
    { say: "What would you do if you were new here?", intent: "ask_sight" },
    { say: "What's your favorite place?", intent: "ask_favorite" },
    { say: "I love art", intent: "ask_sight" },
    { say: "Is it within walking distance?", intent: "ask_walk" },
    { say: "How do I get there?", intent: "ask_walk" },
    { say: "Is it touristy?", intent: "ask_touristy" },
    { say: "What's the best time to go?", intent: "ask_best_time" },
    { say: "Is it expensive?", intent: "ask_price" },
    { say: "Do I need to book?", intent: "ask_book" },
    { say: "Do I need to book the boat tour?", intent: "ask_book" },
    { say: "Is it open today?", intent: "ask_open" },
    { say: "Is it safe at night?", intent: "ask_safe" },
    { say: "What's there to do at night?", intent: "ask_night" },
    { say: "Where's the best coffee in town?", intent: "ask_coffee" },
    { say: "Is the lighthouse worth it?", intent: "ask_about_spot", slots: { spot: "lighthouse" } },
    { say: "Is the lighthouse far from here?", intent: "ask_walk", slots: { spot: "lighthouse" } },
    { say: "Thanks for the tip!", intent: "thanks_tip" },
    { say: "Great, thank you!", intent: "thanks_tip", not: ["g_howareyou_answer"] },
    { say: "What else should I see?", intent: "ask_sight" },
    { say: "You've been really helpful!", intent: "thanks_tip" },
    { say: "That sounds great!", intent: "thanks_tip" },
    { say: "I'll check it out!", intent: "thanks_tip" },
    { say: "I'm from Lithuania", intent: "from_ctx", step: "from", slots: { country: "lithuania" } },
    { say: "Yes, I'm hungry!", intent: "ask_food", step: "food" },
    { say: "Yes, beautiful day!", intent: "weather_ok" },
    { say: "No, that's all. Thanks for the tips!", intent: "more_no", step: "more" },
    { say: "Lithuania", intent: "none" },
    { say: "I don't like crowds", intent: "no_crowds" },
    { say: "That's too far to walk", intent: "no_walk" },
    { say: "We want to try some local food", intent: "ask_food", step: "need", slots: { cuisine: "local" }, not: ["kind_ctx"] },
    { say: "Any good Italian places?", intent: "ask_food", slots: { cuisine: "italian" } },
    { say: "I'm vegetarian", intent: "diet" },
    { say: "Is it crowded?", intent: "ask_touristy" },
    { say: "Could you say that again?", intent: "g_repeat" },
    { say: "the pigeons are eating my sandwich", intent: "none" },
    { say: "purple lighthouse telephone", intent: "none" },
    // more ways to say it (dev corpus tests/corpus/s69-local.json)
    { say: "I'm hungry. Where should I go?", intent: "ask_food", not: ["ask_sight"] },
    { say: "What's good to eat here?", intent: "ask_food" },
    { say: "Where is a good pizza place?", intent: "ask_food", slots: { cuisine: "italian" } },
    { say: "What's a good place for lunch?", intent: "ask_food", not: ["ask_sight"] },
    { say: "I'm a tourist. What can you recommend?", intent: "recommend_vague" },
    { say: "Where can I try local food?", intent: "ask_food", slots: { cuisine: "local" } },
    { say: "I'd like to try clam chowder.", intent: "food_ans", step: "food_kind", slots: { cuisine: "seafood" } },
    { say: "Whatever is good.", intent: "food_ans", step: "food_kind" },
    { say: "Pizza or pasta.", intent: "food_ans", step: "food_kind", slots: { cuisine: "italian" } },
    { say: "Yes, very hungry.", intent: "ask_food", step: "food" },
    { say: "Something with a nice view.", intent: "ask_sight" },
    { say: "What about shopping?", intent: "ask_sight" },
    { say: "Something historical.", intent: "ask_sight" },
    { say: "The lighthouse, maybe?", intent: "spot_ctx", step: "sight", slots: { spot: "lighthouse" } },
    { say: "You're very kind.", intent: "thanks_tip" },
    { say: "That's perfect, thank you.", intent: "thanks_tip", step: "more" },
    { say: "No, I don't have any more questions.", intent: "more_no", step: "more" },
    { say: "Far away, from Lithuania.", intent: "from_ctx", step: "from", slots: { country: "lithuania" } },
    { say: "Perfect weather.", intent: "weather_ok" },
    // meaning must not flip
    { say: "I don't like museums.", intent: "sight_neg", not: ["ask_sight"] },
    { say: "I'm not really hungry.", intent: "not_hungry", not: ["ask_food"] },
    { say: "No fish, please.", intent: "food_neg", step: "food_kind", not: ["food_ans"] },
  ],

  sims: [
    { name: "local, cheap food, what to see, follow-ups", turns: ["Excuse me, are you from around here?", "Can you recommend a place to eat? Not too expensive, please.", "Is it within walking distance?", "What's worth seeing here?", "Is it touristy?", "Thanks for the tip!"], expect: { complete: true }, auto: AUTO },
    { name: "vague question, seafood, too expensive, night", turns: ["Hi! What would you recommend?", "Food, please", "Seafood", "Is it expensive?", "Is there anything cheaper?", "What's there to do at night?", "Is it safe at night?", "You've been really helpful!"], expect: { complete: true }, auto: AUTO },
    // Rosa's optional "Where are you from?" is pinned on: the learner skips it with "Do I need to book?" (about the sight),
    // and "Yes, please" answers "Are you hungry?" that follows. Without it, "Are you hungry?" comes at once with the sight.
    { name: "sights first, no fish, booking", turns: ["Hello!", "What should I see while I'm here?", "Do I need to book?", "Yes, please", "I don't eat fish", "Do I need to book?", "That sounds great! Bye!"], expect: { complete: true }, auto: AUTO,
      setup: (s) => { s.askFrom = true; } },
    // the picture shows market stalls behind Rosa: buying fruit, then a first question that isn't a tip
    { name: "fruit at the market, safety first, then tips", turns: ["Hi!", "I'd like to buy some fruit.", "When does it close?", "Is it safe at night?", "Something to see.",
      "Where's a good place to eat?", "Italian, please.", "Thank you so much!"], expect: { complete: true, state: { marketTip: true } }, auto: AUTO },
    { name: "coffee, locals and a lot of questions", turns: ["Where's the best coffee in town?", "How do I get there?", "Where do the locals go?", "What's the best time to go?", "No", "I love art", "Is it open today?", "Thank you so much!"], expect: { complete: true }, auto: AUTO },
  ],
};

export default local;
