// Song 62 "Could You Say That Again?" — the clarification lesson.
// Maple Harbor Visitor Center, volunteer Chuck: friendly, helpful and a very fast talker
// (NPC speed 1.18). The learner gets a town map and directions (to Sunny Cup Café or anywhere
// else in town) and practises clarification: say that again, slower, speak up, spell it,
// write it down, "What does … mean?", partial questions ("Turn where?", "How many blocks?")
// and checking understanding ("So I go straight and turn left at the bank?"). Chuck checks
// every check against the real route and corrects it. Goal (the mission) = a map + the way to Sunny Cup,
// asked again more slowly and checked; a learner who asks for another place first is offered the café after.
//
// Chuck's reactions build on the global skills (GLOBAL_HANDLERS): a first "Could you say that
// again?" gets the same fast line (fast talkers do that), a second one makes him notice and slow
// down; "slower", "I don't understand" and "I'm still learning" get a clearer, chunked version of
// the route, spoken slowly. Every clarification is counted and praised at the end.
//
// Town geography Chuck uses (the world builder may want to match it):
//   Out of the Visitor Center door onto Main Street.
//   RIGHT: Harborview Hotel next door · 1 block: Harbor Pharmacy and Snip & Style (right side)
//     · 2 blocks: Harbor Bank on the corner of Main & Oak (right). LEFT at the bank = Oak Avenue:
//     Sunny Cup (right, little yellow place) across from the Post Office (left); Union Station ~15 min.
//   LEFT: 1 block: Lucia's Trattoria (left, red awning) across from Threads (right)
//     · 2 blocks: Town Square (right; fountain, farmers' market on Saturdays), Art Museum (left,
//     across from the square), Police Station (left, next to the museum).
//     RIGHT at Town Square = Harbor Road down to the water: Harbor Park (left), The Pier, the lighthouse (~30 min).
//
// World events: "give" { item: "map" | "bus-pass" | "bus-schedule" }, "mark-map" { to: locationId }.

import type { Ctx, EntityDef, Handler, HintItem, Pending, SentSrc, SituationDef, Suggestion } from "../types";
import type { ConvCtx } from "../../convo/dialogue";
import { ent, t } from "../dsl";
import { GLOBAL_HANDLERS } from "../global";

// ---------------------------------------------------------------------------
// Places, directions, streets and the tricky words Chuck uses

const PLACES: EntityDef[] = [
  ent("sunny_cup", "Sunny Cup", "kavinė „Sunny Cup“/kavinės „Sunny Cup“/kavinei „Sunny Cup“/kavinę „Sunny Cup“/kavine „Sunny Cup“/kavinėje „Sunny Cup“", "f",
    { chip: "kavinė „Sunny Cup“", forms: ["the sunny cup", "sunny cup cafe", "the sunny cup cafe", "sunny cup coffee", "sunny cafe", "sonny cup", "sunny cop", "the cafe", "cafe", "a cafe", "the coffee shop", "coffee shop", "a coffee shop", "the coffee place", "a coffee place"] }),
  ent("museum", "museum", "muziejus/muziejaus/muziejui/muziejų/muziejumi/muziejuje", "m",
    { chip: "meno muziejus", attrs: { the: true }, forms: ["the museum", "art museum", "the art museum", "museum of art", "the museum of art", "maple harbor museum of art", "the maple harbor museum of art", "art gallery", "the art gallery", "a museum"] }),
  ent("bank", "bank", "bankas/banko/bankui/banką/banku/banke", "m",
    { chip: "bankas", attrs: { the: true }, forms: ["the bank", "a bank", "harbor bank", "the harbor bank", "an atm", "atm", "the atm", "the nearest atm"] }),
  ent("post_office", "post | office", "pašto | skyrius/skyriaus/skyriui/skyrių/skyriumi/skyriuje", "m",
    { chip: "paštas", attrs: { the: true }, forms: ["the post office", "a post office", "the us post office", "the u s post office", "u s post office", "the post"] }),
  ent("pharmacy", "pharmacy", "vaistinė/vaistinės/vaistinei/vaistinę/vaistine/vaistinėje", "f",
    { chip: "vaistinė", attrs: { the: true }, forms: ["the pharmacy", "a pharmacy", "harbor pharmacy", "the harbor pharmacy", "drugstore", "the drugstore", "a drugstore", "drug store", "the drug store", "a drug store"] }),
  ent("salon", "Snip & Style", "kirpykla „Snip & Style“/kirpyklos „Snip & Style“/kirpyklai „Snip & Style“/kirpyklą „Snip & Style“/kirpykla „Snip & Style“/kirpykloje „Snip & Style“", "f",
    { chip: "kirpykla „Snip & Style“", forms: ["snip and style", "snip style", "snip n style", "the salon", "salon", "a salon", "the hair salon", "hair salon", "a hair salon", "the hairdresser", "a hairdresser", "the hairdressers", "a barber", "the barber", "the barbershop", "a barbershop"] }),
  ent("hotel", "hotel", "viešbutis/viešbučio/viešbučiui/viešbutį/viešbučiu/viešbutyje", "m",
    { chip: "viešbutis „Harborview“", attrs: { the: true }, forms: ["the hotel", "a hotel", "harborview hotel", "the harborview hotel", "the harborview", "harborview", "harbor view hotel", "the harbor view hotel", "the harbor view"] }),
  ent("trattoria", "Lucia's", "restoranas „Lucia's“/restorano „Lucia's“/restoranui „Lucia's“/restoraną „Lucia's“/restoranu „Lucia's“/restorane „Lucia's“", "m",
    { chip: "restoranas „Lucia's“", forms: ["lucias", "lucia's trattoria", "lucias trattoria", "lucia", "the trattoria", "trattoria", "the italian restaurant", "an italian restaurant", "italian restaurant", "lucia's restaurant", "luchias", "lucy's"] }),
  ent("threads", "Threads", "parduotuvė „Threads“/parduotuvės „Threads“/parduotuvei „Threads“/parduotuvę „Threads“/parduotuve „Threads“/parduotuvėje „Threads“", "f",
    { chip: "drabužių parduotuvė „Threads“", forms: ["threads", "the clothing store", "clothing store", "a clothing store", "the clothes store", "a clothes store", "clothes store", "the clothing shop", "a clothes shop", "the clothes shop", "threads clothing"] }),
  ent("square", "Town | Square", "Miesto | aikštė/aikštės/aikštei/aikštę/aikšte/aikštėje", "f",
    { chip: "miesto aikštė", forms: ["the town square", "the square", "square", "the main square", "main square", "the plaza", "the fountain"] }),
  ent("market", "farmers' | market", "ūkininkų | turgus/turgaus/turgui/turgų/turgumi/turguje", "m",
    { chip: "ūkininkų turgus", attrs: { the: true }, forms: ["the farmers market", "the farmers' market", "farmers market", "farmer's market", "the farmer's market", "the market", "market", "a market", "a farmers market"] }),
  ent("police", "police | station", "policijos | nuovada/nuovados/nuovadai/nuovadą/nuovada/nuovadoje", "f",
    { chip: "policijos nuovada", attrs: { the: true }, forms: ["the police station", "a police station", "the police", "the police department", "police department"] }),
  ent("station", "Union Station", "stotis „Union Station“/stoties „Union Station“/stočiai „Union Station“/stotį „Union Station“/stotimi „Union Station“/stotyje „Union Station“", "f",
    { chip: "stotis „Union Station“", forms: ["the union station", "the train station", "train station", "a train station", "the station", "the bus station", "bus station"] }),
  ent("park", "Harbor | Park", "Uosto | parkas/parko/parkui/parką/parku/parke", "m",
    { chip: "Uosto parkas", forms: ["the harbor park", "the park", "park", "a park", "the harbor", "harbor", "the water", "the waterfront", "the harbour"] }),
  ent("pier", "The Pier", "restoranas „The Pier“/restorano „The Pier“/restoranui „The Pier“/restoraną „The Pier“/restoranu „The Pier“/restorane „The Pier“", "m",
    { chip: "restoranas „The Pier“", forms: ["pier", "the pier restaurant", "pier restaurant", "the seafood restaurant", "a seafood restaurant"] }),
  ent("lighthouse", "lighthouse", "švyturys/švyturio/švyturiui/švyturį/švyturiu/švyturyje", "m",
    { chip: "švyturys", attrs: { the: true }, forms: ["the lighthouse", "a lighthouse", "the light house", "light house", "the old lighthouse"] }),
];

const DIRS: EntityDef[] = [
  ent("left", "left", "kairė/kairės/kairei/kairę/kaire/kairėje", "f", { chip: "į kairę", forms: ["the left", "to the left"] }),
  ent("right", "right", "dešinė/dešinės/dešinei/dešinę/dešine/dešinėje", "f", { chip: "į dešinę", forms: ["the right", "to the right"] }),
];

const STREETS: EntityDef[] = [
  ent("main", "Main Street", "Main Street gatvė/Main Street gatvės/Main Street gatvei/Main Street gatvę/Main Street gatve/Main Street gatvėje", "f", { forms: ["main street", "main", "main st"] }),
  ent("oak", "Oak Avenue", "Oak Avenue gatvė/Oak Avenue gatvės/Oak Avenue gatvei/Oak Avenue gatvę/Oak Avenue gatve/Oak Avenue gatvėje", "f", { forms: ["oak", "oak street", "oak ave", "oak road"] }),
  ent("harbor_rd", "Harbor Road", "Harbor Road gatvė/Harbor Road gatvės/Harbor Road gatvei/Harbor Road gatvę/Harbor Road gatve/Harbor Road gatvėje", "f", { forms: ["harbor road", "harbor street", "the harbor road", "harbour road"] }),
];

/** Words and phrases Chuck uses that a learner may not know ("What does … mean?"). */
const WORDS: EntityDef[] = [
  ent("crosswalk", "crosswalk", "„crosswalk“", "m", { forms: ["cross walk", "crosswalks", "a crosswalk", "the crosswalk"], attrs: { noun: true } }),
  ent("courthouse", "courthouse", "„courthouse“", "m", { forms: ["court house", "the courthouse", "a courthouse"], attrs: { noun: true } }),
  ent("block", "block", "„block“", "m", { forms: ["blocks", "a block"], attrs: { noun: true } }),
  ent("couple", "a couple", "„a couple“", "m", { forms: ["couple", "a couple of", "couple of", "a couple of blocks", "a couple blocks"] }),
  ent("hang", "hang a right", "„hang a right“", "m", { forms: ["hang a left", "hang a", "hang", "hang right", "hang left"] }),
  ent("cant_miss", "you can't miss it", "„you can't miss it“", "m", { forms: ["can not miss it", "you cannot miss it", "cannot miss it"] }),
  ent("auctioneer", "auctioneer", "„auctioneer“", "m", { forms: ["an auctioneer", "auctioneers", "auction ear"], attrs: { noun: true } }),
  ent("awning", "awning", "„awning“", "m", { forms: ["an awning", "awnings", "the awning"], attrs: { noun: true } }),
];

// ---------------------------------------------------------------------------
// Routes: every fact Chuck states, so that the learner's checks can be verified.

type Dir = "left" | "right";
interface Route {
  out: Dir;
  blocks: 0 | 1 | 2;
  turn?: { dir: Dir; at: "bank" | "square" };
  side?: Dir;
  ref?: { rel: "across" | "next"; to: string };
  mins: 1 | 2 | 5 | 10 | 15 | 30;
  street: "main" | "oak" | "harbor";
  size?: "big" | "little";
  /** Location id for the world (mark-map). */
  loc?: string;
}

const ROUTES: Record<string, Route> = {
  sunny_cup: { out: "right", blocks: 2, turn: { dir: "left", at: "bank" }, side: "right", ref: { rel: "across", to: "post_office" }, mins: 5, street: "oak", size: "little", loc: "sunny-cup" },
  post_office: { out: "right", blocks: 2, turn: { dir: "left", at: "bank" }, side: "left", ref: { rel: "across", to: "sunny_cup" }, mins: 5, street: "oak", loc: "post-office" },
  bank: { out: "right", blocks: 2, side: "right", mins: 5, street: "main", size: "big", loc: "bank" },
  pharmacy: { out: "right", blocks: 1, side: "right", ref: { rel: "next", to: "salon" }, mins: 2, street: "main", loc: "pharmacy" },
  salon: { out: "right", blocks: 1, side: "right", ref: { rel: "next", to: "pharmacy" }, mins: 2, street: "main", loc: "salon" },
  hotel: { out: "right", blocks: 0, side: "right", mins: 1, street: "main", size: "big", loc: "hotel" },
  station: { out: "right", blocks: 2, turn: { dir: "left", at: "bank" }, mins: 15, street: "oak", loc: "station" },
  trattoria: { out: "left", blocks: 1, side: "left", ref: { rel: "across", to: "threads" }, mins: 2, street: "main", loc: "trattoria" },
  threads: { out: "left", blocks: 1, side: "right", ref: { rel: "across", to: "trattoria" }, mins: 2, street: "main", loc: "threads" },
  square: { out: "left", blocks: 2, side: "right", mins: 5, street: "main", size: "big", loc: "town-square" },
  market: { out: "left", blocks: 2, side: "right", mins: 5, street: "main", loc: "town-square" },
  museum: { out: "left", blocks: 2, side: "left", ref: { rel: "across", to: "square" }, mins: 5, street: "main", size: "big", loc: "museum" },
  police: { out: "left", blocks: 2, side: "left", ref: { rel: "next", to: "museum" }, mins: 5, street: "main", loc: "police" },
  park: { out: "left", blocks: 2, turn: { dir: "right", at: "square" }, side: "left", mins: 10, street: "harbor" },
  pier: { out: "left", blocks: 2, turn: { dir: "right", at: "square" }, mins: 10, street: "harbor", loc: "the-pier" },
  lighthouse: { out: "left", blocks: 2, turn: { dir: "right", at: "square" }, mins: 30, street: "harbor" },
};

/** Which turn a landmark or a street stands for. */
const LANDMARK_AT: Record<string, "bank" | "square"> = { bank: "bank", square: "square", market: "square" };
const STREET_AT: Record<string, "door" | "bank" | "square"> = { main: "door", oak: "bank", harbor_rd: "square" };
/** The most likely unknown word in each fast line (for "What does that mean?"). */
const LINE_WORD: Record<string, string> = {
  r_sunny_cup: "hang", r_museum: "hang", r_post_office: "hang", r_park: "hang", r_trattoria: "awning",
  tw_crosswalk: "crosswalk", tw_courthouse: "courthouse", slow_intro: "auctioneer",
};
/** Lines that are reactions, not content: never replayed as "the last thing Chuck said". */
const META = new Set(["slow_intro", "repeat_fast_again", "learning", "dont_understand", "louder", "say_again_slow", "ack_great", "praise"]);

/** Common nouns take “the” ({X.the}: the article stays out of the natural Lithuanian); names don't. */
const withThe = (src: SentSrc): SentSrc => ({ ...src, en: src.en.replace(/\{X\}/g, "{X.the}"), lt: src.lt.replace(/\{X:/g, "{X.the:") });
const hasThe = (id: string) => !!PLACES.find((e) => e.id === id)?.attrs?.the;
/** Hint patterns for both kinds of place: first every pattern with “the” (the museum), then with a name (Sunny Cup),
 *  so the first model answers are three different sentences. */
function placeHints(items: HintItem[]): HintItem[] {
  return [
    ...items.map((it) => ({ ...it, s: withThe(it.s), only: (e: EntityDef) => !!e.attrs?.the })),
    ...items.map((it) => ({ ...it, only: (e: EntityDef) => !e.attrs?.the })),
  ];
}

const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const conv = (c: Ctx) => (c as ConvCtx).conv;
const opp = (d: Dir): Dir => (d === "left" ? "right" : "left");

interface Piece { kind: string; dir?: Dir; lm?: string; street?: string; blocks?: number; ref?: string; subj?: string; neg?: boolean }
const KINDS = ["out", "bare", "at", "onto", "straight", "side", "across", "next", "near", "nextdoor", "little", "big"];
const DIRECTIONAL = new Set(["out", "bare", "at", "onto", "straight", "side", "across", "next", "near", "nextdoor"]);

function readPieces(slots: any): Piece[] {
  const fdir = slots.route?.fdir ?? slots.fdir;
  const first: Piece[] = fdir ? [{ kind: "bare", dir: fdir }] : [];
  return first.concat(toArr(slots.route?.piece).map((p: any) => {
    const tags: string[] = p.__tags || [];
    let blocks: number | undefined;
    if (typeof p.n === "number") blocks = p.n;
    else if (tags.includes("b1")) blocks = 1;
    else if (tags.includes("b2")) blocks = 2;
    else if (tags.includes("b3")) blocks = 3;
    return { kind: KINDS.find((k) => tags.includes(k)) ?? "bare", dir: p.dir, lm: p.lm, street: p.street, blocks, ref: p.ref, subj: p.subj, neg: tags.includes("neg") };
  }));
}

/** null = everything the learner said matches the route; otherwise the id of Chuck's correction line. */
function checkRoute(r: Route, ps: Piece[]): string | null {
  const turns: { dir: Dir; at: "door" | "bank" | "square" }[] = [{ dir: r.out, at: "door" }];
  if (r.turn) turns.push({ dir: r.turn.dir, at: r.turn.at });
  const wrongTurn = (x: { at: string }) => (x.at === "door" ? `fix_out_${r.out}` : `fix_turn_${x.at}`);
  let next = 0;
  for (const p of ps) {
    switch (p.kind) {
      case "out":
        if (p.dir !== r.out) return `fix_out_${r.out}`;
        next = 1;
        break;
      case "at":
      case "onto": {
        const at = p.kind === "onto" ? STREET_AT[p.street!] : LANDMARK_AT[p.lm!];
        const tn = turns.find((x) => x.at === at);
        if (!tn) return r.turn ? `fix_at_${r.turn.at}` : "fix_noturn";
        if (tn.dir !== p.dir) return wrongTurn(tn);
        next = turns.indexOf(tn) + 1;
        break;
      }
      case "bare": {
        const tn = turns[next];
        if (!tn) return "fix_noturn";
        if (tn.dir !== p.dir) return wrongTurn(tn);
        next++;
        break;
      }
      case "straight":
        if (p.blocks != null && p.blocks !== r.blocks) return `fix_blocks_${r.blocks}`;
        break;
      case "side": {
        if (!r.side || !p.dir) break;
        const d = p.neg ? opp(p.dir) : p.dir;
        if (d !== r.side) return `fix_side_${r.side}`;
        break;
      }
      case "across":
      case "next":
        if (!r.ref || r.ref.rel !== p.kind || r.ref.to !== p.ref) return "fix_generic";
        break;
      case "near":
        if (!r.ref || r.ref.to !== p.ref) return "fix_generic";
        break;
      case "nextdoor":
        if (r.blocks !== 0) return `fix_blocks_${r.blocks}`;
        break;
      case "little":
      case "big":
        if (r.size && r.size !== p.kind) return r.size === "little" ? "size_little_no" : "size_big_no";
        break;
    }
  }
  return null;
}

// Automatic answers for the simulations (keyed by step or pending id).
const AUTO: Record<string, string> = {
  greet_map: "Yes, please", need: "Could I have a map, please?", map: "Yes, please", cafe: "How do I get to Sunny Cup?", cafe_offer: "Yes, please",
  quiz: "Right out the door", recheck: "Okay, got it", more: "No, that's all, thanks",
  police_ok: "Yes, everything's fine", pass: "No, thanks", pass_pay: "Here you go",
};
/** For a sim whose first turn also answers Chuck's opening "You look like you need a map! Am I right?" (seeds that open with it). */
const AUTO_OWN_OPENING: Record<string, string> = Object.fromEntries(Object.entries(AUTO).filter(([k]) => k !== "greet_map"));

/** A route is (still) part of this conversation — unless the learner turned down the café and asked for nothing else. */
const routeGoal = (c: Ctx) => !!c.s.dest || !c.s.cafeNo;

// ---------------------------------------------------------------------------
// State helpers

const clar = (c: Ctx) => { c.s.clar = (c.s.clar || 0) + 1; };

function giveMap(c: Ctx) {
  if (c.s.map) return false;
  c.s.map = true;
  c.event("give", { item: "map" });
  return true;
}

/** Chuck gives the route (fast, or the clear version once he has promised to slow down). */
function giveRoute(c: Ctx, id: string) {
  if (!onceThisTurn(c, "route")) return;
  clearConfirmPending(c); // a new destination: the old "Got all that?" no longer applies
  c.s.dest = id;
  if (!c.s.asked.includes(id)) c.s.asked.push(id);
  c.s.confirmAsks = 0;
  c.say(conv(c).slow ? `r_${id}_slow` : `r_${id}`);
  const r = ROUTES[id];
  if (c.s.wantTwist && !c.s.twistWord) {
    const w = r.out === "right" ? "crosswalk" : "courthouse";
    c.s.twistWord = w;
    c.say(`tw_${w}`);
    c.twist("tricky_word");
  }
  if (id === "police") {
    c.say("police_ok");
    c.expect({ id: "police_ok", optional: true, hints: ["g_yesno"], expects: ["lost_item"], suggest: [{ lt: "Atsakyti, ar viskas gerai", hint: "g_yesno" }],
      yes: (cc) => { cc.say("police_good"); }, no: (cc) => { cc.say("police_bad"); },
      on: { lost_item: (cc) => { cc.say("lost_item"); } } });
  }
}

function currentRoute(c: Ctx): Route | null {
  return c.s.dest ? ROUTES[c.s.dest] : null;
}

// --- checking the route: "Got all that?" is a pending question whose suggestions and model answers
// belong to the current destination (chk_<dest>), so the corridor never shows a wrong example.
const CONFIRM_EXPECTS = ["understood", "did_i", "lost", "ask_side", "ask_which_way", "ask_turn_where", "ask_blocks"];
const isConfirmPending = (id: string) => id.startsWith("confirm_") || id === "quiz" || id === "recheck";
function clearConfirmPending(c: Ctx) {
  const p = conv(c).pending;
  if (p && isConfirmPending(p.id)) conv(c).pending = null;
}
/** After the fast version the learner's next move is "say it again, more slowly"; after the slow one, checking the route. */
function checkSuggest(c: Ctx): Suggestion[] {
  const check = { lt: "Pasitikslinti, ar teisingai supratai kelią", hint: `chk_${c.s.dest}` };
  const slower = { lt: "Paprašyti pakartoti lėčiau", hint: "slower" };
  return [
    ...(conv(c).slow ? [check, slower] : [slower, check]),
    { lt: "Paklausti, ką reiškia žodis", hint: "words", options: "word" },
    { lt: "Dar keli būdai pasitikslinti", hint: "clarify_more" },
  ];
}
/** "Got all that?" / "Okay?" after a route (the pending id names the destination: confirm_sunny_cup …). */
function askConfirm(c: Ctx) {
  const n = c.s.confirmAsks = (c.s.confirmAsks || 0) + 1;
  c.say(c.s.justSlowed ? "confirm_after_slow" : n === 1 ? "confirm_ask" : "confirm_again");
  c.s.justSlowed = false;
  const pend: Pending = {
    id: `confirm_${c.s.dest}`, expects: CONFIRM_EXPECTS,
    get suggest() { return checkSuggest(c); },
    yes: (cc) => { quiz(cc); },
    no: (cc) => { sayAgainSlow(cc); cc.say("confirm_after_slow"); cc.s.justSlowed = false; cc.expect(pend); },
    ask: (cc) => { cc.say("confirm_again"); },
  };
  c.expect(pend);
}

/** "Where are you headed?" — through the café step while the café is still to come. */
function askWhere(c: Ctx) {
  if (!c.s.asked.includes("sunny_cup") && !c.s.cafeNo) { c.ask("cafe"); return; }
  c.say("ask_where");
  c.hold();
}
/** Chuck recommends Sunny Cup and offers the way there (the lesson's goal). */
function offerCafe(c: Ctx, afterRoute: boolean) {
  if (c.s.asked.includes("sunny_cup")) { c.say("ask_where"); c.hold(); return; }
  c.say(afterRoute ? "offer_cafe" : "suggest_cafe");
  c.say("offer_directions");
  c.expect({ id: "cafe_offer", optional: true, expects: ["ask_where", "accept_ctx", "decline_ctx", "no_coffee"],
    suggest: [
      { lt: "Sutikti, kad Chuckas paaiškintų kelią", hint: "yes_please" },
      { lt: "Paklausti kelio į kitą vietą", hint: "where", options: "place" },
    ],
    yes: (cc) => { giveRoute(cc, "sunny_cup"); },
    no: (cc) => { declineCafe(cc); },
    ask: (cc) => cc.say("offer_directions") });
}
/** Chuck has just offered the way to Sunny Cup ("Should I tell you how to get there?"). */
const cafeOffered = (c: Ctx) => conv(c).lastLines.some((l) => l.lineId === "offer_directions");
/** "No, thanks" / "I don't drink coffee" to the café tip (once per utterance). */
function declineCafe(c: Ctx) {
  if (!onceThisTurn(c, "cafe_no")) return;
  c.s.cafeNo = true;
  c.say("oh_okay");
}

/** A question about "it" before any destination: ask where the learner wants to go. */
function needPlace(c: Ctx) {
  c.say("which_place");
  c.expect({ id: "which_place", optional: true, hints: ["where"],
    suggest: [{ lt: "Pasakyti, kur nori nueiti", hint: "where", options: ["sunny_cup", "museum", "post_office", "pharmacy", "bank", "lighthouse"] }] });
}

/** "No problem! Let me say it again, nice and slow." + the clear route. */
function sayAgainSlow(c: Ctx) {
  c.say("say_again_slow");
  conv(c).markSlow();
  c.s.slowed = true;
  c.say(`r_${c.s.dest}_slow`);
  c.s.justSlowed = true;
}

/** "Okay, got it" after a correction. */
function confirmAck(c: Ctx) {
  if (!firstVerdict(c)) return;
  c.s.conf[c.s.dest] = true;
  c.s.confirmed = true;
  c.say("ack_great");
}

/** True the first time `key` happens in this utterance (an utterance may be parsed as several segments). */
function onceThisTurn(c: Ctx, key: string): boolean {
  const turn = conv(c).history.length;
  if (c.s.onceTurn !== turn) { c.s.onceTurn = turn; c.s.onceKeys = []; }
  if (c.s.onceKeys.includes(key)) return false;
  c.s.onceKeys.push(key);
  return true;
}

/** Chuck gives at most one verdict per utterance (an utterance may be parsed as several segments). */
function firstVerdict(c: Ctx): boolean {
  const turn = conv(c).history.length;
  if (c.s.verdictTurn === turn) return false;
  c.s.verdictTurn = turn;
  return true;
}
const mentionsRoute = (c: Ctx) => /\b(left|straight|blocks?|across|next to|corner|door|(turn|go|hang a|take a|on the) right)\b/i.test(c.heard || "");

function confirmOk(c: Ctx) {
  if (!firstVerdict(c)) return;
  c.s.conf[c.s.dest] = true;
  c.s.confirmed = true;
  c.say("confirm_ok");
}

/** The learner has checked a detail of the route by asking about it (side, turn, blocks …). */
function checkedByQuestion(c: Ctx) {
  if (c.s.dest) { c.s.conf[c.s.dest] = true; c.s.confirmed = true; clearConfirmPending(c); }
}

function sayFix(c: Ctx, fix: string) {
  if (!firstVerdict(c)) return;
  c.s.fixes = (c.s.fixes || 0) + 1;
  c.say(fix);
  if (fix === "fix_generic") { conv(c).markSlow(); c.say(`r_${c.s.dest}_slow`); }
  c.say("recheck");
  const pend: Pending = {
    id: "recheck", expects: ["understood", "g_ok", "dir_ans_ctx"],
    suggest: [{ lt: "Pasakyti, kad dabar supratai", hint: "gotit" }, { lt: "Pasitikslinti dar kartą", hint: `chk_${c.s.dest}` }],
    yes: (cc) => { confirmAck(cc); },
    no: (cc) => { cc.say("say_again_slow"); conv(cc).markSlow(); cc.say(`r_${cc.s.dest}_slow`); cc.say("recheck"); cc.expect(pend); },
    on: {
      understood: (cc) => { confirmAck(cc); },
      g_ok: (cc) => { confirmAck(cc); },
      dir_ans_ctx: (cc, sl) => { quizAnswer(cc, sl.dir); }, // "Left!" — echoing the corrected direction
    },
    ask: (cc) => cc.say("recheck"),
  };
  c.expect(pend);
}

/** "Yes, got it" before the goal is reached: Chuck makes it a friendly quiz. */
function quiz(c: Ctx) {
  const r = currentRoute(c);
  if (!r || mentionsRoute(c)) return; // "Yes — left at the bank": the check itself answers
  if (!firstVerdict(c)) return;
  if (c.s.confirmed) { c.s.conf[c.s.dest] = true; c.say("ack_great"); return; }
  const onTurn = !!r.turn && c.chance(0.5);
  c.s.quiz = onTurn ? "turn" : "out";
  c.say(onTurn ? (r.turn!.at === "bank" ? "quiz_bank" : "quiz_square") : "quiz_out");
  const pend: Pending = {
    id: "quiz", expects: ["dir_ans_ctx"],
    suggest: [{ lt: "Atsakyti: į kairę ar į dešinę", hint: onTurn ? (r.turn!.at === "bank" ? "quiz_bank" : "quiz_square") : "quiz_out" }],
    on: {
      dir_ans_ctx: (cc, sl) => { quizAnswer(cc, sl.dir); },
    },
    yes: (cc) => { cc.say("quiz_again"); cc.expect(pend); },
    no: (cc) => { cc.say("quiz_again"); cc.expect(pend); },
    ask: (cc) => cc.say("quiz_again"),
  };
  c.expect(pend);
}

function quizAnswer(c: Ctx, dir: Dir) {
  const r = currentRoute(c);
  if (!r || !dir) return;
  const right = c.s.quiz === "turn" && r.turn ? r.turn.dir : r.out;
  if (dir === right) { confirmOk(c); return; }
  sayFix(c, c.s.quiz === "turn" && r.turn ? `fix_turn_${r.turn.at}` : `fix_out_${r.out}`);
}

/** Chuck repeats his last content line(s), optionally in the clear, slow version. */
function replayContent(c: Ctx, slow: boolean) {
  const cv = conv(c);
  const content = cv.lastLines.filter((l) => !META.has(l.lineId) && !l.lineId.startsWith("g_"));
  const src = content.length ? content : cv.lastLines;
  if (slow) { cv.markSlow(); c.s.slowed = true; }
  for (const l of src) {
    const alt = slow && /^r_[a-z_]+$/.test(l.lineId) && !l.lineId.endsWith("_slow") ? `${l.lineId}_slow` : null;
    if (alt && ROUTE_LINE_IDS.has(alt)) c.say(alt, l.vars);
    else cv.pushLine(l.lineId, l.variant, l.vars, slow);
  }
}

function lastContentKey(c: Ctx): string {
  const l = conv(c).lastLines.find((x) => !META.has(x.lineId) && !x.lineId.startsWith("g_"));
  return l ? l.lineId.replace(/_slow$/, "") : "";
}

function wordFromText(w: string | undefined): string | undefined {
  if (!w) return undefined;
  const k = w.toLowerCase().replace(/[^a-z' ]/g, "").trim();
  return WORDS.find((e) => e.en.toLowerCase() === k || (e.forms || []).includes(k))?.id;
}

function explain(c: Ctx, id: string) {
  clar(c);
  c.say(`w_${id}`);
  c.hold();
}

function answerSize(c: Ctx, r: Route, big: boolean | null) {
  if (!r.size) { c.say("size_only"); return; }
  if (big === null) { c.say(r.size === "big" ? "size_big_yes" : "size_little_yes"); return; }
  if (r.size === "big") c.say(big ? "size_big_yes" : "size_big_no");
  else c.say(big ? "size_little_no" : "size_little_yes");
}

const saidYes = (c: Ctx) => /^\s*(yes|yeah|yep|sure|ok|okay|of course|please)\b/i.test(c.heard || "");
const saidNo = (c: Ctx) => /^\s*(no|nope|nah)\b/i.test(c.heard || "");

// ---------------------------------------------------------------------------

const ROUTE_IDS = Object.keys(ROUTES);
const ROUTE_LINE_IDS = new Set(ROUTE_IDS.flatMap((id) => [`r_${id}`, `r_${id}_slow`]));

const H: Record<string, Handler> = {
  // --- map -----------------------------------------------------------------
  ask_map(c) {
    if (!onceThisTurn(c, "map")) return;
    if (!giveMap(c)) { c.say("map_here"); return; }
    c.say("map_give");
  },
  map_free(c) {
    c.say("map_free");
    if (giveMap(c)) c.say("map_give");
  },
  map_here(c) {
    if (giveMap(c)) c.say("map_give");
    else c.say("map_here");
  },
  map_no(c, _slots, seg) {
    if (seg.tags.includes("have")) { c.s.map = true; c.say("ack_great"); return; }
    c.s.mapNo = true;
    c.say("map_ok_no");
  },

  // --- destinations --------------------------------------------------------
  ask_where(c, slots, seg) {
    const p = (slots.place as string | undefined) ?? (seg.tags.includes("uk_chemist") ? "pharmacy" : undefined);
    if (!p || !ROUTES[p]) { c.say("unknown_place"); return; }
    giveRoute(c, p);
  },
  dest_short(c, slots) {
    const p = slots.place as string | undefined;
    if (!p || !ROUTES[p]) { c.say("unknown_place"); return; }
    const r = currentRoute(c);
    // "The bank?" while talking about the café route = checking a landmark, not a new destination
    if (r && p !== c.s.dest && ((LANDMARK_AT[p] !== undefined && LANDMARK_AT[p] === r.turn?.at) || r.ref?.to === p)) {
      clar(c);
      if (LANDMARK_AT[p] !== undefined && LANDMARK_AT[p] === r.turn?.at) c.say(`turn_${r.turn!.at}`);
      else c.say((r.ref!.rel === "across" ? "yes_across" : "yes_next") + (hasThe(p) ? "_the" : ""), { X: p });
      return;
    }
    giveRoute(c, p);
  },
  ask_where_unknown(c) {
    c.say("unknown_place");
    if (!c.s.dest) askWhere(c);
  },
  dest_neg(c) {
    c.say("oh_okay");
    if (!c.s.dest || c.s.conf[c.s.dest]) askWhere(c);
  },
  dest_correction(c, slots) {
    const list = toArr(slots.place) as string[];
    // "not the museum, the café" → the second; "the café, not the museum" / "no, I said the café" → the first
    const txt = (c.heard || "").toLowerCase().replace(/^\s*(no|sorry)[,\s]+/, "");
    const good = list.length > 1 && /^not\b/.test(txt) ? list[1] : list[0];
    if (!good || !ROUTES[good]) { c.say("unknown_place"); return; }
    c.say("oh_okay");
    giveRoute(c, good);
  },
  repeat_route(c) {
    if (!c.s.dest) { needPlace(c); return; }
    clar(c);
    c.say(`r_${c.s.dest}_slow`);
  },

  // --- checking understanding ----------------------------------------------
  confirm(c, slots) {
    // A full check also answers an open "Got all that?", quiz or "Okay?" question.
    clearConfirmPending(c);
    const ps = readPieces(slots);
    const subj = ps.find((p) => p.subj && ROUTES[p.subj])?.subj;
    const dest = subj ?? c.s.dest;
    if (!dest) { needPlace(c); return; }
    if (dest !== c.s.dest) { c.s.dest = dest; if (!c.s.asked.includes(dest)) c.s.asked.push(dest); }
    const r = ROUTES[dest];
    const fix = checkRoute(r, ps);
    if (fix) { sayFix(c, fix); return; }
    if (ps.some((p) => DIRECTIONAL.has(p.kind))) { confirmOk(c); return; }
    // only "the big one?" / "the little one?"
    const size = ps.find((p) => p.kind === "big" || p.kind === "little");
    answerSize(c, r, size ? size.kind === "big" : null);
  },
  ask_side(c) {
    const r = currentRoute(c);
    if (!r) { needPlace(c); return; }
    clar(c);
    c.say(r.side ? `side_${r.side}` : "side_end");
    checkedByQuestion(c);
  },
  ask_which_way(c, slots, seg) {
    const r = currentRoute(c);
    if (!r) { needPlace(c); return; }
    clar(c);
    const at = slots.lm ? LANDMARK_AT[slots.lm] : undefined;
    if (seg.tags.includes("door")) c.say(`out_${r.out}`);
    else if (slots.lm) {
      if (r.turn && at === r.turn.at) c.say(`turn_${r.turn.at}`);
      else c.say(r.turn ? `fix_at_${r.turn.at}` : "straight_only");
    } else {
      c.say(`out_${r.out}`);
      if (r.turn) c.say(`then_${r.turn.at}`);
    }
    checkedByQuestion(c);
  },
  ask_turn_where(c) {
    const r = currentRoute(c);
    if (!r) { needPlace(c); return; }
    clar(c);
    if (r.turn) c.say(`at_${r.turn.at}`);
    else { c.say(`out_${r.out}`); c.say("straight_only"); }
    checkedByQuestion(c);
  },
  ask_blocks(c) {
    const r = currentRoute(c);
    if (!r) { needPlace(c); return; }
    clar(c);
    c.say(`blocks_${r.blocks}`);
    checkedByQuestion(c);
  },
  ask_street(c, slots) {
    const id = (slots.place && ROUTES[slots.place]) ? slots.place : c.s.dest;
    if (!id) { needPlace(c); return; }
    clar(c);
    c.say(`street_${ROUTES[id].street}`);
    if (id === c.s.dest) checkedByQuestion(c);
  },
  ask_far(c, slots) {
    const p = slots.place as string | undefined;
    if (p && ROUTES[p]) {
      c.say(`far_${ROUTES[p].mins}`);
      if (p !== c.s.dest) giveRoute(c, p);
      return;
    }
    const r = currentRoute(c);
    if (!r) { needPlace(c); return; }
    c.say(`far_${r.mins}`);
  },
  ask_which_one(c, _slots, seg) {
    const r = currentRoute(c);
    if (!r) { needPlace(c); return; }
    clar(c);
    answerSize(c, r, seg.tags.includes("big") ? true : seg.tags.includes("little") ? false : null);
  },
  show_map(c, slots) {
    const id = (slots.place && ROUTES[slots.place]) ? slots.place : c.s.dest;
    if (!id) { needPlace(c); return; }
    if (giveMap(c)) c.say("map_give");
    if (id !== c.s.dest) { c.s.dest = id; if (!c.s.asked.includes(id)) c.s.asked.push(id); }
    c.say(hasThe(id) ? "show_map_the" : "show_map", { X: id });
    if (ROUTES[id].loc) c.event("mark-map", { to: ROUTES[id].loc });
  },
  did_i(c) {
    if (!c.s.dest) { needPlace(c); return; }
    quiz(c);
  },
  understood(c) {
    if (c.step === "confirm" && c.s.dest && !c.s.conf[c.s.dest]) quiz(c);
    else if (c.step === "more") c.s.moreDone = true;
  },
  lost(c) {
    clar(c);
    if (!c.s.dest) { c.say("dont_understand"); replayContent(c, true); c.hold(); return; }
    sayAgainSlow(c);
  },
  dir_ans_ctx(c, slots) { quizAnswer(c, slots.dir); },
  need_help(c) {
    // (a question in the same breath gets its own answer; with nothing more, Chuck starts with the map)
    if (!c.s.map && !c.s.mapNo && !c.s.dest) c.say("need_help");
    else if (!c.s.dest) askWhere(c);
  },
  lost_item(c) {
    c.say("lost_item");
    if (c.s.dest !== "police") giveRoute(c, "police");
  },

  // --- clarification (global skills with Chuck's reactions) -----------------
  g_repeat(c, slots) {
    clar(c);
    const key = lastContentKey(c);
    c.s.repeats = c.s.repeatKey === key ? (c.s.repeats || 0) + 1 : 1;
    c.s.repeatKey = key;
    if (c.s.repeats >= 2 && !conv(c).slow) {
      c.say("repeat_fast_again");
      replayContent(c, true);
      c.hold();
      return;
    }
    GLOBAL_HANDLERS.g_repeat(c as ConvCtx, slots);
  },
  g_slower(c) {
    clar(c);
    c.say("slow_intro");
    replayContent(c, true);
    c.hold();
  },
  say_again_slowly(c, slots, seg) { H.g_slower(c, slots, seg); },
  didnt_understand(c, slots, seg) { H.g_dont_understand(c, slots, seg); },
  g_dont_understand(c) {
    clar(c);
    c.say("dont_understand");
    replayContent(c, true);
    conv(c).showMeaning();
    c.hold();
  },
  g_learning(c) {
    clar(c);
    c.say("learning");
    replayContent(c, true);
    c.hold();
  },
  louder(c) {
    clar(c);
    c.say("louder");
    replayContent(c, false);
    c.hold();
  },
  g_spell(c, slots) { clar(c); GLOBAL_HANDLERS.g_spell(c as ConvCtx, slots); },
  g_write(c, slots) {
    clar(c);
    const cv = conv(c);
    const hasNote = cv.lastLines.some((l) => { const src = (cv.sit.lines[l.lineId] ?? [])[l.variant]; return !!(src?.write || src?.spell); });
    if (!hasNote && c.s.dest) {
      c.say("g_write");
      cv.addNote({ en: cv.sit.lines[`r_${c.s.dest}`][0].write! });
      c.hold();
      return;
    }
    GLOBAL_HANDLERS.g_write(c as ConvCtx, slots);
  },
  spell_q(c, _slots, seg) {
    clar(c);
    let w: string | null = null;
    if (seg.tags.includes("password")) w = "harborfun";
    else if (seg.tags.includes("street")) w = currentRoute(c) ? { main: "Main", oak: "Oak", harbor: "Harbor" }[currentRoute(c)!.street] : null;
    if (w) c.say("g_spell", { letters: w });
    else c.say("g_which_word");
    c.hold();
  },
  g_meaning(c, slots) {
    const id = wordFromText(slots.w) ?? (slots.w ? undefined : [...conv(c).lastLines].reverse().map((l) => LINE_WORD[l.lineId]).find(Boolean));
    if (id) { explain(c, id); return; }
    clar(c);
    GLOBAL_HANDLERS.g_meaning(c as ConvCtx, slots);
  },
  word_q(c, slots) { explain(c, slots.word); },
  thanks_patience(c) { c.say("thanks_patience"); c.s.patience = true; if (c.step === "more") c.s.moreDone = true; },

  // --- small answers -------------------------------------------------------
  g_ok(c) {
    if (c.step === "confirm" && c.s.dest && !c.s.conf[c.s.dest]) quiz(c);
    else if (c.step === "more") c.s.moreDone = true; // "Got it, thanks!" = that's all
  },
  g_thanks(c, slots) {
    if (c.step === "confirm" && c.s.dest && !c.s.conf[c.s.dest]) {
      c.say("g_welcome");
      if (c.s.confirmed) c.s.conf[c.s.dest] = true; // the goal is already reached: no quiz this time
      else quiz(c);
      return;
    }
    if (c.step === "more") { c.s.moreDone = true; c.say("g_welcome"); return; }
    if (c.step === "map" && !c.s.map && !c.s.mapNo) { giveMap(c); c.say("map_give"); return; }
    GLOBAL_HANDLERS.g_thanks(c as ConvCtx, slots);
  },
  just_looking(c) { offerCafe(c, false); },
  // "I'll take one" / "Tell me" / "You're right": yes to the open offer (the pending questions catch it first)
  accept_ctx(c) {
    // (a "Sure, …" has already answered the offer through the pending question: nothing more to do)
    if (cafeOffered(c)) { if (!c.s.asked.includes("sunny_cup") && !c.s.cafeNo) giveRoute(c, "sunny_cup"); return; }
    if (c.step === "map" || !c.s.map) { if (giveMap(c)) c.say("map_give"); return; }
    c.say("ack_great");
  },
  // "I don't need it" / "Maybe later": no to the open offer
  decline_ctx(c) {
    if (cafeOffered(c)) { if (!c.s.asked.includes("sunny_cup")) declineCafe(c); return; }
    if (c.step === "map" && !c.s.map) { c.s.mapNo = true; c.say("map_ok_no"); return; }
    c.say("no_problem");
  },
  no_coffee(c) {
    if (!c.s.asked.includes("sunny_cup")) declineCafe(c);
    else c.say("oh_okay");
  },
  thanks_help(c, slots, seg) { H.g_thanks(c, slots, seg); },
  more_no(c) { c.s.moreDone = true; },
  // "Bye!" / "No, that's it. Bye!" to "Anything else?": nothing else, so the visit is complete (finish says goodbye)
  g_bye(c, slots) {
    if (c.step === "more" && !conv(c).pending) { c.s.moreDone = true; c.s.byeNow = true; return; }
    GLOBAL_HANDLERS.g_bye(c as ConvCtx, slots);
  },
  just_arrived(c) { c.say("welcome_new"); },
  // "Great, thanks!" is thanks, not an answer to "How are you?" (the global handler would say "I'm great, thanks for asking!")
  g_howareyou_answer(c, slots) {
    const h = (c.heard || "").toLowerCase();
    if (/\bthank/.test(h) && !/\b(how are you|and you|about you|yourself)\b/.test(h)) { H.g_thanks(c, slots, { intent: "g_thanks", slots, tags: [] }); return; }
    GLOBAL_HANDLERS.g_howareyou_answer(c as ConvCtx, slots);
  },
  ask_language(c) { c.say("speak_lang"); conv(c).markSlow(); },
  is_visitor_center(c) { c.say("yes_vc"); },
  ask_coffee(c) { H.just_looking(c, {}, { intent: "just_looking", slots: {}, tags: [] }); },
  more_yes(c) { c.say("g_yes_what"); c.hold(); },

  // --- information ---------------------------------------------------------
  ask_hours(c) { c.say("hours"); },
  ask_place_hours(c, slots) {
    const p = slots.place as string;
    const line = { museum: "museum_hours", market: "market_hours", square: "market_hours", sunny_cup: "cafe_hours", bank: "bank_hours" }[p as "museum"];
    c.say(line ?? "hours_unknown");
  },
  ask_downtown(c) { c.say("downtown"); },
  ask_events(c) {
    c.s.events = true;
    c.say("events_jazz");
    c.say("events_market");
  },
  event_free(c) { c.say(c.s.events ? "event_free" : "g_which_word"); if (!c.s.events) c.hold(); },
  event_time(c) { if (c.s.events) c.say("event_time"); else { c.say("events_jazz"); c.s.events = true; } },
  ask_buspass(c, _slots, seg) {
    if (seg.tags.includes("price")) { c.say("pass_price"); return; }
    c.say("pass_info");
    if (c.s.pass) return;
    c.say("pass_offer");
    c.expect({ id: "pass", optional: true, hints: ["g_yesno", "pay"], expects: ["pay_card", "pay_cash", "here_you_go"],
      suggest: [{ lt: "Nusipirkti dienos bilietą arba atsisakyti", hint: "g_yesno" }],
      yes: (cc) => { cc.say("pass_total"); passPay(cc); },
      no: (cc) => { cc.say("no_problem"); },
      on: { pay_card: (cc) => { passPaid(cc, "card"); }, pay_cash: (cc) => { passPaid(cc, "cash"); }, here_you_go: (cc) => { passPaid(cc, "cash"); },
        accept_ctx: (cc) => { cc.say("pass_total"); passPay(cc); }, decline_ctx: (cc) => { cc.say("no_problem"); } },
      ask: (cc) => cc.say("pass_offer") });
  },
  ask_busstop(c, _slots, seg) { c.say(seg.tags.includes("which") ? "bus_which" : "busstop"); },
  ask_schedule(c) { c.say("bus_schedule"); c.event("give", { item: "bus-schedule" }); },
  ask_wifi(c) { c.say("wifi"); },
  ask_restroom(c) { c.say("restroom"); },
  ask_brochure(c) { c.say("brochure"); },
  ask_recommend(c) { c.say("recommend"); },
  ask_food(c) { c.say("food"); },
  ask_map_lang(c) { c.say("map_lang"); if (giveMap(c)) c.say("map_give"); },
  pay_card(c) { if (c.s.passDue) passPaid(c, "card"); else c.say("no_problem"); },
  pay_cash(c) { if (c.s.passDue) passPaid(c, "cash"); else c.say("no_problem"); },
  here_you_go(c) { if (c.s.passDue) passPaid(c, "cash"); else c.say("no_problem"); },
};

function passPay(c: Ctx) {
  c.s.passDue = true;
  c.expect({ id: "pass_pay", hints: ["pay"], expects: ["pay_card", "pay_cash", "here_you_go"], suggest: [{ lt: "Susimokėti", hint: "pay" }],
    on: { pay_card: (cc) => { passPaid(cc, "card"); }, pay_cash: (cc) => { passPaid(cc, "cash"); }, here_you_go: (cc) => { passPaid(cc, "cash"); } },
    yes: (cc) => { passPaid(cc, "card"); },
    ask: (cc) => cc.say("pass_total") });
}
function passPaid(c: Ctx, method: string) {
  c.s.passDue = false;
  c.s.pass = true;
  c.event("pay", { method, amount: 500 });
  c.event("give", { item: "bus-pass" });
  c.say("pass_paid");
}

/** Situation handlers: any real request ends the opening question, and "Yes, please — and …"
 *  (or "No, thanks, but …") answers the map offer as well. */
const CLARIFY = new Set(["g_repeat", "g_slower", "say_again_slowly", "g_dont_understand", "didnt_understand", "g_learning", "louder", "g_spell", "g_write", "spell_q", "g_meaning", "word_q", "g_ok", "g_thanks", "thanks_help"]);
function wrap(hs: Record<string, Handler>): Record<string, Handler> {
  const out: Record<string, Handler> = {};
  for (const [id, h] of Object.entries(hs)) {
    out[id] = (c, slots, seg) => {
      // An utterance can be parsed as several segments of the same intent ("Sorry? Could you say that
      // again?"): react once.
      if (!onceThisTurn(c, "h:" + id)) return;
      if (!CLARIFY.has(id)) c.s.need = true;
      if (c.step === "map" && !c.s.map && !c.s.mapNo && !id.startsWith("map") && id !== "ask_map") {
        if (saidYes(c) && giveMap(c)) c.say("map_give");
        else if (saidNo(c)) c.s.mapNo = true;
      }
      h(c, slots, seg);
    };
  }
  return out;
}

// Model answers for checking the route: each destination gets its own three (a full check, a short
// check, a question), so the examples shown are always true for the route Chuck just gave.
const CHK: Record<string, HintItem> = {
  full_bank: { id: "k_so_i", s: t("So | I | turn | right, | go | two | blocks, | and | turn | left | at | the | bank?", "Taigi | aš | pasuku | į dešinę, | einu | du | kvartalus | ir | pasuku | į kairę | prie | — | banko?", "Taigi pasuku į dešinę, einu du kvartalus ir prie banko pasuku į kairę?"),
    note: "Pakartok kelią savais žodžiais – taip patikrinsi, ar gerai supratai. Chuckas pataisys, jei suklysi." },
  full_left2: { id: "k_so_i", s: t("So | I | turn | left | and | go | straight | two | blocks?", "Taigi | aš | pasuku | į kairę | ir | einu | tiesiai | du | kvartalus?", "Taigi pasuku į kairę ir einu tiesiai du kvartalus?") },
  full_right2: { id: "k_so_i", s: t("So | I | turn | right | and | go | straight | two | blocks?", "Taigi | aš | pasuku | į dešinę | ir | einu | tiesiai | du | kvartalus?", "Taigi pasuku į dešinę ir einu tiesiai du kvartalus?") },
  full_right1: { id: "k_so_i", s: t("So | I | turn | right | and | go | one | block?", "Taigi | aš | pasuku | į dešinę | ir | einu | vieną | kvartalą?", "Taigi pasuku į dešinę ir einu vieną kvartalą?") },
  full_left1: { id: "k_so_i", s: t("So | I | turn | left | and | go | one | block?", "Taigi | aš | pasuku | į kairę | ir | einu | vieną | kvartalą?", "Taigi pasuku į kairę ir einu vieną kvartalą?") },
  full_square: { id: "k_so_i", s: t("So | I | go | left | to | Town | Square | and | turn | right | there?", "Taigi | aš | einu | į kairę | iki | Miesto | aikštės | ir | pasuku | į dešinę | ten?", "Taigi einu į kairę iki Miesto aikštės ir ten pasuku į dešinę?") },
  full_next: { id: "k_so_i", s: t("So | it's | right | next door?", "Taigi | jis yra | visai | šalia?", "Taigi jis visai šalia?") },
  left_bank: { id: "k_turn_at", s: t("Left | at | the | bank?", "Į kairę | prie | — | banko?", "Prie banko – į kairę?") },
  right_square: { id: "k_turn_at", s: t("Right | at | Town | Square?", "Į dešinę | prie | Miesto | aikštės?", "Prie Miesto aikštės – į dešinę?") },
  right_door: { id: "k_door", s: t("Right | out | the | door?", "Į dešinę | išėję pro | — | duris?", "Išėję pro duris – į dešinę?") },
  left_door: { id: "k_door", s: t("Left | out | the | door?", "Į kairę | išėję pro | — | duris?", "Išėję pro duris – į kairę?") },
  two_blocks: { id: "k_two_blocks", s: t("Two | blocks?", "Du | kvartalus?", "Du kvartalus?") },
  side: { id: "k_side", s: t("Is | it | on the right | or | on the left?", "Ar | tai | dešinėje | ar | kairėje?", "Ar tai dešinėje, ar kairėje?", { flags: { 0: "“Is” in a yes/no question = the particle ar." } }) },
  far: { id: "k_far", s: t("Is | it | far?", "Ar | tai | toli?", "Ar toli?", { flags: { 0: "“Is” in a yes/no question = the particle ar." } }) },
};
const CHECK_FOR: Record<string, string[]> = {
  sunny_cup: ["full_bank", "left_bank", "side"], post_office: ["full_bank", "left_bank", "side"], station: ["full_bank", "left_bank", "side"],
  bank: ["full_right2", "two_blocks", "side"], pharmacy: ["full_right1", "right_door", "side"], salon: ["full_right1", "right_door", "side"],
  hotel: ["full_next", "right_door", "side"], trattoria: ["full_left1", "left_door", "side"], threads: ["full_left1", "left_door", "side"],
  museum: ["full_left2", "left_door", "side"], police: ["full_left2", "left_door", "side"], square: ["full_left2", "two_blocks", "side"],
  market: ["full_left2", "two_blocks", "side"], park: ["full_square", "right_square", "side"], pier: ["full_square", "right_square", "side"],
  lighthouse: ["full_square", "right_square", "side"],
};
const QUIZ_ITEMS = (id: string, where: string, whereLt: string, natWhere: string): HintItem[] => [
  { id, s: t(`Left | ${where}.`, `Į kairę | ${whereLt}.`, `${natWhere} – į kairę.`) },
  { id, s: t(`Right | ${where}.`, `Į dešinę | ${whereLt}.`, `${natWhere} – į dešinę.`) },
];
const GOTIT: HintItem[] = [
  { id: "g_gotit", s: t("Got it, | thanks!", "Supratau, | ačiū!", "Supratau, ačiū!") },
  { id: "g_understand", s: t("Okay, | I | understand | now.", "Gerai, | aš | suprantu | dabar.", "Gerai, dabar suprantu.") },
  { id: "g_isee", s: t("Oh, | I see. | Thanks!", "O, | suprantu. | Ačiū!", "O, suprantu. Ačiū!") },
];

const WHERE_BASE: HintItem[] = [
  { id: "q_how_get", s: t("How | do | I | get | to | {X}?", "Kaip | — | man | nueiti | į | {X:acc}?", "Kaip man nueiti į {X:acc}?", { flags: { 1: "Question “do” has no Lithuanian word; man + the infinitive nueiti carries the question." } }) },
  { id: "q_where", s: t("Where's | {X}?", "Kur yra | {X:nom}?", "Kur yra {X:nom}?") },
  { id: "q_tell_me", s: t("Could | you | tell | me | how | to get | to | {X}?", "Ar {j:galėtumėte|t:galėtum} | {j:jūs|t:tu} | pasakyti | man, | kaip | nueiti | į | {X:acc}?", "Ar {j:galėtumėte|t:galėtum} pasakyti, kaip nueiti į {X:acc}?"), register: "polite" },
  { id: "q_looking", s: t("I'm looking | for | {X}.", "Ieškau | — | {X:gen}.", "Ieškau {X:gen}.", { flags: { 1: "“for”: no separate Lithuanian word; the genitive after ieškau carries it." } }) },
  { id: "q_which_way", s: t("Which | way | is | {X}?", "Kuria | kryptimi | yra | {X:nom}?", "Kuria kryptimi yra {X:nom}?") },
  { id: "q_far", s: t("Is | {X} | far | from | here?", "Ar | {X:nom} | toli | nuo | čia?", "Ar {X:nom} toli nuo čia?", { flags: { 0: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }) },
  { id: "q_want_go", s: t("I'd like | to go | to | {X}.", "Norėčiau | nueiti | į | {X:acc}.", "Norėčiau nueiti į {X:acc}.") },
  { id: "q_best_way", s: t("What's | the | best | way | to | {X}?", "Koks yra | — | geriausias | kelias | į | {X:acc}?", "Koks geriausias kelias į {X:acc}?") },
  { id: "q_show", s: t("Could | you | show | me | {X} | on the map?", "Ar {j:galėtumėte|t:galėtum} | {j:jūs|t:tu} | parodyti | man | {X:acc} | žemėlapyje?", "Ar {j:galėtumėte|t:galėtum} parodyti man {X:acc} žemėlapyje?") },
  { id: "q_short", s: t("To | {X}, | please.", "Į | {X:acc}, | prašau.", "Į {X:acc}, prašau."), note: "Trumpas atsakymas, kai Chuckas paklausia: „Where are you headed?“" },
];

const SHOW_MAP = t("Sure! | I'll mark | it | on | your | map. | Here | we | are, | and | here's | {X}.", "Žinoma! | Pažymėsiu | tai | — | jūsų | žemėlapyje. | Čia | mes | esame, | o | štai | {X:nom}.", "Žinoma! Pažymėsiu jūsų žemėlapyje. Mes esame čia, o štai {X:nom}.",
  { flags: { 3: "“on”: no separate Lithuanian word; the locative žemėlapyje carries it (your intervenes)." } });
const YES_ACROSS = t("Yes, | it's | right | across from | {X}.", "Taip, | tai yra | tiesiai | priešais | {X:acc}.", "Taip, tiesiai priešais {X:acc}.");
const YES_NEXT = t("Yes, | it's | right | next to | {X}.", "Taip, | tai yra | visai | šalia | {X:gen}.", "Taip, visai šalia {X:gen}.");

// ---------------------------------------------------------------------------

export const visitorCenter: SituationDef = {
  id: "s62-visitor-center",
  song: 62,
  songTitle: "Could You Say That Again?",
  title: { en: "Could You Say That Again?", lt: "Ar galėtumėte pakartoti?" },
  topic: { en: "When you don't understand", lt: "Kai nesupranti" },
  chapter: 2,
  order: 1,
  location: "visitor-center",
  npc: "chuck",
  goal: "Gauk miesto žemėlapį ir sužinok, kaip nueiti į kavinę. Chuck kalba labai greitai – drąsiai prašyk pakartoti, kalbėti lėčiau ar paraidžiui.",
  intro: "Lankytojų centras: stendai su lankstinukais, ant sienos – didelis miesto žemėlapis. Už stalo – savanoris Chuckas. Jis labai draugiškas, bet kalba kaip kulkosvaidis. Nebijok jo sustabdyti: pasitikslinti yra visiškai normalu.",
  entities: { place: PLACES, dir: DIRS, street: STREETS, word: WORDS },

  grammar: {
    macros: {
      map_word: "([a | the | any | some | one] [free] [town | city | street | tourist | walking | paper] (map | maps) [of (the town | the city | downtown | maple harbor | the area | the city center | the city centre | this town | this city)] | one of (those | the | your) [free] maps)",
      turnv: "(turn | go | take a | make a | hang a | you turn | i turn | i go | you go | i take a | we turn | we go | i have to turn | i need to turn | i should turn)",
      blocks: "({n:number} (block | blocks) | a block #b1 | one block #b1 | a couple [of] blocks #b2 | a couple #b2 | a few blocks #b3)",
      ctail: "(right | is that right | correct | is that correct | yes | yeah | did i get that right | did i get it right | have i got that right | am i right | is that it)",
      join: "(and | then | and then | after that | so | and after that)",
      pre: "(then | and then | next | after that)",
      subj: "(it is | it will be | that is | is it | is that | the building is)",
      here_: "(here | near here | nearby | around here | close by | in town | in the area | close to here)",
      twk: "(this week | this weekend | today | tonight | tomorrow | in town | right now | this evening | in the evening | on the weekend | these days)",
    },
    slots: {
      piece: { pattern: [
        "[first] [@turnv] {dir} (out the door | outside | out of the door | when i (go | get) out | when i leave | from here | out of here) #out",
        "(first | at first) [@turnv] {dir} #bare",
        "@turnv {dir} (first | at first) #bare",
        "[@pre] [@turnv] {dir} (at | by | after) {lm:place} #at",
        // landmark first: "At the bank I turn left?" (no optional parts: "go right at the bank turn left" reads as right, then left at the bank)
        "(at | by | after | when i get to | when you get to | when i see) {lm:place} (@turnv | then @turnv | then) {dir} #at", "(at | by | after | when i get to) {lm:place} {dir} #at",
        "@pre (at | by | after | when i get to | when you get to) {lm:place} (@turnv | then) {dir} #at", "@pre (at | by | after | when i get to) {lm:place} {dir} #at",
        "[@turnv] {dir} at the (corner | intersection | light | lights | traffic light | traffic lights | stop sign) #bare",
        "[@pre] [@turnv] {dir} (on | onto | into) {street} #onto",
        "@turnv {dir} #bare",
        "[@pre] @turnv {dir} there #bare",
        "[i] (go | walk | head) {dir} (to | till | until | up to | as far as) {lm:place} #out",
        "(then | next) [@turnv] {dir} #bare",
        "[i] (go | walk | keep going | keep walking | continue) (straight | straight ahead | straight on) [for] [@blocks] #straight",
        "[i] (go | walk) [for] @blocks [straight | straight ahead] #straight",
        "(it is | is it | that is | is that) @blocks [away | from here] #straight",
        "@blocks [straight | straight ahead] #straight",
        "[@subj | {subj:place} is | is {subj:place}] on (the | your | my) {dir} [side] [of the street] #side",
        "[@subj | {subj:place} is | is {subj:place}] not on (the | your | my) {dir} [side] [of the street] #side #neg",
        "[@subj | {subj:place} is | is {subj:place}] (across from | opposite | across the street from | in front of) {ref:place} #across",
        "[@subj | {subj:place} is | is {subj:place}] (next to | beside | right next to) {ref:place} #next",
        "is {ref:place} (next to | beside) it #next",
        "is {ref:place} (across from | opposite) it #across",
        "[@subj | {subj:place} is | is {subj:place}] (near | close to) {ref:place} #near",
        "[@subj] [right] next door #nextdoor",
        "[@subj] [the] (little | small) [yellow] [one | place | building] #little",
        "[@subj] [the] (big | large) [white | brick] [one | place | building] #big",
      ] },
      route: { pattern: [
        "{piece} [[@join] {piece}] [[@join] {piece}] [[@join] {piece}] [[@join] {piece}]",
        "{fdir:dir} [@join] {piece} [[@join] {piece}] [[@join] {piece}] [[@join] {piece}]",
      ] },
    },
  },

  intents: {
    // map
    ask_map: { patterns: [
      "(could | may) i (have | get) @map_word #h:map_could", "can i (have | get) @map_word #h:map_can", "can i (have | get) one of those",
      "do you have @map_word #h:map_do_you", "(have you got | is there) @map_word", "i would like @map_word #h:map_id_like",
      "i would like to (have | get) @map_word", "i need @map_word", "i want @map_word #blunt", "@map_word",
      "(i am | we are) looking for @map_word", "where (can | do) i (get | find) @map_word", "@could_you give me @map_word",
      "(can | could | may) i (take | grab) @map_word", "i would like to take @map_word", "i will (take | grab) @map_word", "give me @map_word #blunt",
      "(i am going to | i will) need @map_word", "(do you have | have you got) (maps | a map) for tourists",
    ] },
    map_free: { patterns: [
      "is (the map | the map free | it free | that free) #h:map_free", "is the map free #h:map_free", "(do | does) (the map | it) cost (anything | money)", "how much is (the map | a map)",
      "do i (have to | need to | must) pay for (the | a | it) [map]", "(is | are) (the map | the maps | it) free of charge", "how much (costs | cost | does) (the map | a map | it) [cost]",
    ] },
    map_here: { patterns: ["where (are we | am i) [on the map] #h:map_here", "where is the visitor center [on the map]", "@could_you show me where we are", "where are we (right | now) [on the map]"] },
    map_no: { patterns: [
      "i do not (need | want) a map", "no map [thanks]", "i [already] have (a map #have | one #have) [already]", "i have got a map #have",
      "i [already] have (a map | one | it | a map app | google maps | maps) on my phone #have", "i (use | will use | have) google maps #have", "i (will | can) use my phone #have",
    ] },
    // destinations
    ask_where: { patterns: [
      "how (do | can | would) i get to {place} [from here] #h:q_how_get", "how do (you | we) get to {place} [from here]", "how to get to {place}",
      "(where is | where are) {place} #h:q_where", "where (can | do) i find {place}", "(do you know | can you tell me) where {place} is",
      "@could_you tell me how to get to {place} #h:q_tell_me", "@could_you tell me where {place} is", "@could_you (show | give) me (the way | directions) to {place}",
      "(i am | we are) looking for {place} #h:q_looking", "(i am | we are) trying to (find | get to) {place}",
      "which way (is | to) {place} #h:q_which_way", "what is the (best | quickest | easiest) way to (get to | go to) {place} #h:q_best_way", "what is the (best | quickest) way to {place} #h:q_best_way",
      "(i would like | we would like) to (go | get) to {place} #h:q_want_go", "(i want | we want | i need | we need) to (go | get) to {place}",
      "(i am | we are) (going | heading) to {place}", "is there {place} [@here_]", "directions to {place}", "the way to {place}",
      "(where is | how do i get to | i am looking for) the (nearest | closest) {place}", "(i want | i would like | we want | we would like) to (see | visit) {place}",
      "(where is | how do i get to | i am looking for | is there) (the | a) chemist [s] #uk_chemist #tip:us_pharmacy",
      // other constructions: "how can I go to…", "tell me the way…", "I search…" (ieškau), "where I can find…"
      "how (do | can | could | should) (i | we) go to {place} [from here]", "how (can | do) i (find | reach) {place}", "(tell | show) me the way to {place}",
      "@could_you (tell | show) me the way to {place}", "@could_you help me (find | get to) {place}", "i (need | want) directions to {place}",
      "(i | we) (search | am searching | are searching) [for] {place}", "where (i | we) can (find | get to) {place}", "where (i | we) (find | can find) {place}",
      "(i | we) would love to (see | visit | go to) {place}", "(i | we) (need | have) to (go | get) to {place} [today]", "(i am | we are) trying to go to {place}",
      "what is the way to {place}", "(do you know | can you tell me) how to get to {place}", "i (want | would like) to find {place}",
    ] },
    just_arrived: { patterns: [
      "i [just] (arrived | got here | got in) [today | yesterday | this morning | last night]", "i am new (here | in town)", "(it is | this is) my first (time | day) (here | in maple harbor | in town)", "(i am | we are) (visiting | on vacation | on holiday #tip:us_vacation) [here]",
      "(i am a | we are) (tourist | tourists) [here]", "(i am | we are) (from lithuania | from abroad) [and] [i am | we are] (visiting | a tourist | tourists)", "this is my first visit [here | to maple harbor]", "i (came | come) (here | to town) (today | yesterday) [for vacation]",
    ] },
    ask_language: { patterns: ["do you speak (lithuanian | russian | polish | german | french | spanish | italian | any other languages)"] },
    is_visitor_center: { patterns: ["is this the (visitor center | visitors center | information center | tourist center)", "is this (the tourist information | tourist information | the tourist office) #tip:us_visitor_center", "is this where i can get (a map | information)"] },
    ask_coffee: { patterns: [
      "where can i (get | find) [a | some] (coffee | good coffee)", "where is the best coffee [in town]", "is there (a good | good) coffee [@here_]", "i (need | want | would like) [a | some] coffee",
      "where can i (drink | have | buy) [a | some] [good] coffee", "somewhere (i can get | to get | to drink | for | with) [a | some] [good] coffee", "(a | some) place (for | to get | to drink) [a | some] [good] coffee",
      "i (love | like | really like) coffee", "(is there | do you know) a (good | nice) (cafe | coffee shop | coffee place) [@here_]", "where is a (good | nice) (cafe | coffee shop | coffee place)",
    ] },
    // "I don't drink coffee": an indirect no to Chuck's café tip
    no_coffee: { patterns: ["i do not (drink | like | want) coffee", "i (never | really do not) drink coffee", "i am not a coffee (person | drinker)", "no coffee for me"] },
    ask_where_unknown: { patterns: ["how (do | can) i get to {w:any}", "where is {w:any}", "(i am | we are) looking for {w:any}"] },
    // A bare place ("The museum.") is accepted anywhere but never listed in `expects`: the expected-intent
    // bonus is per segment, so an expected bare place would split "Where's the police station?" in two.
    dest_short: { patterns: ["[i think] [to] {place} [i think | maybe] #h:q_short"] },
    dest_neg: { patterns: ["i do not (want | need) to go to {place}", "not {place}", "(i am | we are) not (looking for | going to) {place}"] },
    dest_correction: { patterns: ["[no] not {place} [i mean | but | i said] {place}", "no i said {place}", "(i mean | i meant) {place}", "{place} not {place}"] },
    repeat_route: { patterns: ["how do i get there [again]", "what was the way again", "@could_you (tell | give) me the (way | directions) again", "@could_you repeat the directions", "what were the directions [again]", "@could_you give me directions again"] },
    ask_downtown: { patterns: ["where is (downtown | the (town | city) center) #h:q_downtown", "where is the (town | city) centre #tip:us_downtown", "how do i get (downtown | to the (town | city) center)"] },
    // checking understanding
    confirm: { patterns: [
      "(so | okay so | so first | wait so) [i] {route} [@ctail] #h:k_so_i",
      "(let me check | let me see | just to check | just to be sure | let me get this right | let me repeat) [so] [i] {route} [@ctail] #h:k_so_i",
      "[i] {route} [@ctail]",
      "(do | should | shall) i {route} [@ctail]",
      "{fdir:dir} @ctail",
    ] },
    ask_side: { patterns: [
      "is it on the (right | left) or [on] the (left | right) [side] #h:k_side", "is {place} on the (right | left) or [on] the (left | right) [side]",
      "(on the right | right) or (on the left | left) side", "which side [of the street] [is it on | is it]", "on which side [of the street] [is it]", "what side [of the street] is it on",
      "(right | left) side or (left | right) side", "on the right or on the left",
    ] },
    ask_which_way: { patterns: [
      "which way [do i (turn | go)] (out the door #door | when i go out #door)", "which way [do i (turn | go)] at {lm:place}", "which way do i (turn | go) [then | first]", "which way [then]",
      "which way [do i (turn | go)] (when i (get | come) out | when i leave | outside | from the door | out of the building | from here) #door",
      "(do | should) i (turn | go) (left | right) or (right | left) (when i (get | go | come) out | outside | from the door) #door",
      "(what | which) direction [do i (go | turn)] (at {lm:place} | first | then)", "(left | right) or (right | left) first #door",
      "(do | should) i (turn | go) (left | right) or (right | left) [out the door #door | at {lm:place}]", "(left | right) or (right | left) [out the door #door | at {lm:place}]",
      "which direction [do i (go | turn)]",
    ] },
    ask_turn_where: { patterns: [
      "[sorry] (turn | go) where #h:k_turn_where", "[sorry] (turn | go) (left | right) where", "[sorry] where do i turn [left | right]", "[sorry] where (should | do) i (turn | go) (left | right)",
      // "(at) …": the preposition stays required, so a bare "What?" is still "say that again"
      "(left | right) (at) the what", "(at) the what", "[sorry] where do i (make the | take the) turn",
      "where (i | do i | should i | must i) (must | have to | need to | should) turn [left | right]", "where (is | was) the turn", "where exactly do i turn [left | right]",
      "(turn | go) (left | right) at (which | what) (place | street | corner)", "at (which | what) (place | street | corner) do i turn [left | right]",
    ] },
    ask_blocks: { patterns: [
      "how many blocks [is it | is that | do i (go | walk) | away | from here] #h:k_blocks", "how many blocks (is it | is that) (from here | away)", "how many streets [do i (cross | pass)]",
      "how many blocks [do] i (need to | have to | must | should) (go | walk)", "how many blocks (i | do i) (go | walk) [straight]", "how many blocks to (the bank | the corner | {lm:place})",
      "[is it] (one | two | three | a couple [of]) blocks or (one | two | three | four) [blocks]",
    ] },
    ask_street: { patterns: ["(what | which) street is it on", "(what | which) street [is it]", "what is the (name of the street | street name)", "on (what | which) street [is it]", "(what | which) street is {place} on", "what is the name of the street"] },
    ask_far: { patterns: [
      "is it far [from here] #h:k_far", "is it (very | too | really) far", "how far is it [from here]", "is it (close | near) [to here | from here]", "is it (a long | a short) walk",
      "can i walk [there | to it]", "(is it | is that) within walking distance", "how long does it take [to (walk | get there | walk there)]", "how long (will | would) it take [to (walk | get there)]", "how long is the walk",
      "[so] it is not (far | very far | too far)",
      "is {place} far [from here] #h:q_far", "how far is {place} [from here]", "is {place} (close | near) [to here]", "can i walk to {place}", "is {place} within walking distance", "how long does it take to (walk | get) to {place}",
    ] },
    ask_which_one: { patterns: [
      "do you mean the (big | large) one #big #h:k_big_one", "do you mean the (little | small) one #little", "(you mean | do you mean) the (big #big | large #big | little #little | small #little) (building | place)",
      "which one [is it]", "the (big | large) one or the (little | small) one", "(is it | do you mean) the big one or the (little | small) one",
    ] },
    show_map: { patterns: [
      "@could_you show me [it | that | where it is | the way] on (the | my) map #h:k_show_map", "@could_you (mark | circle | draw) (it | that | the way | the route) [on (the | my) map] [for me]",
      "@could_you show me where it is", "show me on the map", "where is it on the map", "@could_you show me {place} on the map #h:q_show", "where is {place} on the map",
    ] },
    did_i: { patterns: [
      "did i get (that | it) right #h:k_did_i", "(have i | did i) got it right", "is that right", "am i right",
      "did i understand [you | that | it] (right | correctly | well)", "(is | was) (this | that | it) correct", "is this right", "am i correct", "(did | do) i (get | have) it right",
      "(is | was) my (answer | understanding) (right | correct)", "is it (the | a) right way",
    ] },
    understood: { patterns: [
      "i think so", "i think i (got it | get it | understand)", "(yes | yeah) i (got it | get it | understand) [now]", "i got it [now]", "[okay | ok | oh | all right] i (understand | get it) now", "okay i (understand | get it)", "(that | it) makes sense [now]", "makes sense", "(crystal | all | perfectly) clear", "i have got it", "understood",
      "(it is | that is | everything is | all is | now it is | the way is) [all | very | totally | perfectly | completely] clear [now]", "clear [now]", "now (it is | everything is) clear",
      "now i (understand | get it | got it | see)", "i understand (everything | it all | all of it | the way)", "i (understood | got) (everything | all of it | it all)",
      "i (know | remember) (the way | it) now", "no problem i (understand | got it)", "i can find it", "i will find it",
    ] },
    lost: { patterns: [
      "i (got | am) lost", "you lost me [after {place} | at {place}]", "i (did not | do not) (get | follow) (all of that | that | everything | all that)", "i missed (that | it | the last part | something)", "(i am | i am still) confused", "that was (too fast | very fast | a lot)",
      "i (did not | do not | could not | can not) understand (anything | a thing | a word | much | everything | all of that | all that | the directions | the way)", "i understood nothing",
      "i did not (catch | hear | get) (the last part | the end | the second part | the first part | the middle | everything | all of it | all that | all of that | the directions)",
      "(that | it) was too (much | many words) [for me]", "i am (a bit | a little | totally | completely) (lost | confused)",
      // only partly understood: "More or less.", "Not completely.", "I didn't understand."
      "not (completely | everything | all of it | quite | exactly | all)", "more or less", "almost", "(only | just) (a little | partly | some of it | part of it | half of it)",
    ] },
    // "I didn't understand." (past): Chuck reacts as to "I don't understand". Never expected, so the global
    // "I don't understand" (a dropped "did" plus a skipped "do" would match here too) keeps its own reading.
    didnt_understand: { patterns: ["[sorry] i did not understand [you | that | it | what you said]"] },
    // "Can you help me?" on its own (Chuck starts with the map)
    need_help: { patterns: ["[please] (can | could) you help me", "i need [some] help", "i need your help"] },
    lost_item: { patterns: ["i (lost | have lost) my (wallet | purse | passport | phone | bag | keys | backpack)", "(someone | somebody) stole my (wallet | purse | passport | phone | bag | backpack)", "my (wallet | purse | passport | phone | bag | backpack) (was | has been) stolen", "i can not find my (wallet | purse | passport | phone | bag | keys)"] },
    dir_ans_ctx: { patterns: ["[i] [turn | go] {dir} [first]", "to the {dir}", "{dir} side", "[my mistake | my bad] {dir} [(not | and not) {other:dir}]", "i [think i] (turn | go) {dir} there", "(turn | go) {dir} i think"] },
    // clarification extras (the rest are global skills)
    say_again_slowly: { patterns: [
      "[sorry | pardon] @could_you (say | repeat) (that | it) again [a (little | bit)] (more slowly | slower | slowly) #h:c_again_slowly",
      "[sorry] (say | repeat) (that | it) again [a (little | bit)] (more slowly | slower | slowly)",
      "[sorry] (again | one more time | once more) [a (little | bit)] (more slowly | slower | slowly)",
      // learner forms: "more slow", "speak slowly" (imperative), "slowly again"
      "@could_you (speak | talk | say (it | that) | go | repeat [it | that]) [again] [a (little | bit)] (more slow | slow | more slower)",
      "(speak | talk | say it | repeat [it | that] | go) [again] [a (little | bit)] (more slowly | slower | slowly | more slow | slow) [please]",
      "(slowly | slower | more slowly) (again | one more time) [please]", "@could_you (speak | talk) (not so | less) fast",
      "(more | a bit more | a little more) slow [please]", "not so fast [please] @could_you repeat [it | that]",
      // "Too fast!": Chuck apologises and slows down
      "(it | that) (is | was) (too | way too | a bit too | really too) fast [for me]", "(too | way too | much too) fast [for me]",
      "(you are | you talk | you speak | you are talking | you are speaking) (too | way too | really | so | very | a bit too) fast [for me]",
    ] },
    louder: { patterns: [
      "@could_you speak up [a (little | bit)] #h:x_speak_up", "@could_you (speak | talk) (louder | a (little | bit) louder)", "[a bit] louder", "i can not hear you [very well]", "speak up",
      "(it is | it is very | it is so | it is really) (noisy | loud) [here | in here]", "i can not hear (well | very well | you well | anything)", "(speak | talk) louder [please]", "@could_you say (it | that) louder",
    ] },
    spell_q: { patterns: ["how do you spell (the street #street | the name of the street #street | the street name #street | the password #password)", "@could_you spell (the street #street | the password #password)"] },
    word_q: { patterns: [
      "what is [a | an | the] {word} #h:x_whats_a", "what does [the word] {word} mean #h:x_word", "what do you mean by [a | the] {word}", "what is the meaning of [the word] {word}",
      "[a | an | the] {word} what is that", "i do not (know | understand) [the word] {word}",
      // "What means crosswalk?" (word-for-word from Lithuanian), "Crosswalk? What is it?"
      "what means [the word] {word}", "[a | an | the] {word} (what is (it | this) | what does (that | it | this) mean | what is the meaning)", "(what | what is) {word} (means | meaning)",
      "what (is | does) (that | this | the) word {word} [mean]", "i do not know what [a | an | the] {word} (is | means)", "what is (that | this) {word}",
    ] },
    thanks_patience: { patterns: ["(thank you | thanks) for (your patience | being (so | very) patient | being patient) #h:t_patience", "sorry for (all the questions | so many questions)", "sorry for asking (so much | so many questions | again)"] },
    // "You were very helpful": thanks (handled like thank you)
    thanks_help: { patterns: [
      "you (helped | have helped) (me | us) (a lot | so much | very much | a great deal)", "you (were | have been | are) (very | really | so | super | extremely) (helpful | kind | nice)",
      "(that | this) (was | is) (very | really | so | super) (helpful | useful)", "(thank you | thanks) (so much | a lot) you (were | have been) (very | really | so) helpful",
    ] },
    just_looking: { patterns: [
      "[(i am | we are)] just (looking around | exploring | walking around) [the town | the city | maple harbor | a bit | a little | for now]", "nowhere [special | in particular]", "i do not know where to go",
      "(i | we) [just] want to (walk | look) around [the town | a bit | a little]", "(i am | we are) (just) (looking | browsing) [thanks]", "(i am | we are) (just) (visiting | exploring) the town",
      "i do not have (a plan | plans) [yet]", "(i am | we are) (just) (sightseeing | walking)", "i do not know (yet | exactly) where (i want to go | to go)",
    ] },
    more_no: { patterns: [
      "(that is | that will be) (all | it | everything) [for now] #h:d_all", "nothing else #h:d_nothing", "[no] that is it", "i am (good | fine) [for now]", "i am all set #h:d_set", "that is all i need", "no more questions", "i think that is (all | it)",
      "nothing more [for now]", "i have (everything | all) [i need]", "i am (okay | all right | fine | good) [for now] [thank you | thanks]", "(it is | this is) (all | everything) [for now]",
      "(that | this) is (enough | plenty) [for now]", "i do not (need | have) anything else", "i do not have (any | other | more | any more) questions", "no that is (everything | enough)",
      "(that is | it is) (all | everything) for (today | me)", "i (think i) have (everything | all i need)",
    ] },
    more_yes: { patterns: ["(yes | yeah) (one more thing | actually)", "one more (thing | question)", "i have (a question | another question | one more question)", "actually (yes | one more thing)", "(yes | yeah) i have (a question | one more question | another question)", "i (want | would like) to ask (something | one more thing | a question)", "can i ask (something | one more thing | a question)"] },
    // information
    ask_hours: { patterns: ["what time do you (close | open) [today] #h:i_hours", "what are your (hours | opening hours) [today]", "when do you (close | open)", "are you open {day}", "how late are you open", "when does the visitor center (close | open)"] },
    ask_place_hours: { patterns: ["what time does {place} (open | close)", "when does {place} (open | close)", "(is | are) {place} open (today | now | {day} | on the weekend)", "what are the hours (of | for) {place}", "when is {place} open", "when is {place}"] },
    ask_events: { patterns: [
      "what is going on [@twk] #h:i_events", "(is | are) there (any | anything) (events | concerts | festivals | things to do | fun things to do) [@twk]", "is there anything (fun | interesting) (to do | going on) [@twk]",
      "what can i do (@twk | here) [tonight]", "what is happening [@twk]", "any events [@twk]", "what should i do (tonight | this weekend)", "what is on (this week | this weekend | tonight) #tip:us_whats_on",
      "(is | are) there (a | some | any) (concert | concerts | event | events | festival | festivals | show | shows | live music | music | party | parties) [@twk]",
      "(what | which) (events | concerts | festivals) (are there | do you have) [@twk]", "(where | what) can i (go | do) (@twk | in the evening)", "(do you know | are there) (any | some) (good | fun) (events | concerts) [@twk]",
      "what (is | are) (there | the plans) (@twk)",
    ] },
    event_free: { patterns: ["is it free", "is the (jazz | concert | market) free", "how much (is it | are the tickets | does it cost)", "do i need (a ticket | tickets)"] },
    event_time: { patterns: ["what time [does it start | is it]", "what time does the (jazz | concert | market) start", "when does it start", "when is it", "what time is the (jazz | concert)"] },
    ask_buspass: { patterns: [
      "where can i (buy | get) a (bus pass | bus ticket | day pass | transit pass) #h:i_buspass", "do you (sell | have) (bus passes | bus tickets | day passes | a bus pass)",
      "(can | could) i (buy | get) a (bus pass | day pass | bus ticket) [here]", "i need a (bus pass | day pass | bus ticket)", "how much is a (bus pass | day pass | bus ticket | week pass) #price",
      "where can i (buy | get) (a | the) (ticket | tickets) for the bus", "(can | could) i (buy | get) (a | the) (ticket | tickets) for the bus [here]", "do you sell (bus tickets | tickets for the bus | passes)",
      "where (do | can) i (buy | get) (bus tickets | a ticket for the bus | a bus ticket | a bus pass)", "i (want | would like) to buy a (bus pass | day pass | bus ticket | ticket for the bus)",
      "how much (is | does) (a | the) (ticket | ticket for the bus) [cost] #price", "how much does a (bus pass | day pass | bus ticket) cost #price",
    ] },
    ask_busstop: { patterns: ["where is the [nearest] bus stop", "is there a bus stop [@here_]", "where can i (catch | get | take) the bus", "which bus goes to {place} #which", "is there a bus to {place} #which"] },
    ask_schedule: { patterns: ["do you have a bus schedule", "do you have a (bus | train) timetable #tip:us_schedule", "(can | could) i (have | get) a bus schedule"] },
    ask_wifi: { patterns: ["(do you have | is there) (wi fi | wifi | internet) [here] #h:i_wifi", "(do you have | is there) [a] free (wi fi | wifi | internet) [here]", "(can | could) i (connect to | get on) the (wi fi | wifi | internet)", "what is the (wi fi | wifi) password", "(wi fi | wifi) password", "(can | could) i (get | have) the (wi fi | wifi) password", "is the (wi fi | wifi) free", "can i use the (wi fi | wifi | internet)"] },
    ask_restroom: { patterns: ["where is the (restroom | bathroom | washroom | ladies room | mens room) #h:i_restroom", "where is the toilet #tip:us_restroom", "(do you have | is there) a (restroom | bathroom) [here]", "(do you have | is there) a toilet [here] #tip:us_restroom", "(can | could | may) i use the (restroom | bathroom)"] },
    ask_brochure: { patterns: ["do you have (any | some) (brochures | leaflets | information | info | pamphlets) [about (the town | the city | the boat tours | {place})]", "(can | could) i (have | get) (a brochure | some brochures | some information | some info)", "(i am | we are) looking for (brochures | information | info)",
      "(i | we) (need | would like | want) [some] (information | info | brochures) [about (the town | the city | maple harbor | the area | {place})]"] },
    ask_recommend: { patterns: ["what do you recommend [seeing | to see] #h:i_recommend", "what is there to (do | see) [here | in town | in maple harbor]", "what is (fun | nice) to do [here | in town]", "what should i (see | visit | do) [here | in town | in maple harbor | first]", "(any | do you have any) recommendations", "what is (worth seeing | good to see | the best thing to see) [here | in town]", "what (would | do) you suggest", "is there anything (interesting | nice) to see",
      "what can i (see | visit) [here | in town | in maple harbor | today]", "what (is | are) the (best | top | main) (things | places | sights) to (see | visit | do) [here | in town]", "what (places | sights) (should | can) i (see | visit)",
      "(what | where) is (interesting | nice | beautiful) [here | in town | to see]", "(where | what) should i go [first | today]", "(can | could) you recommend (something | a place | anything) [to see | to visit]",
    ] },
    ask_food: { patterns: ["where can i (get something to eat | eat | have lunch | have dinner | get lunch | get dinner) #h:i_food", "(is there | do you know) a good (place to eat | restaurant) [@here_]", "@could_you recommend a (restaurant | good restaurant | place to eat)", "where is a good (restaurant | place to eat)", "i am hungry", "(any | are there any) good (restaurants | places to eat) [@here_]",
      "where can i (eat | find | get) something [to eat]", "where can i find a (restaurant | good restaurant | place to eat)", "(i | we) (want | would like) to eat [something | lunch | dinner]",
      "(where | what) is a good place (for | to have) (lunch | dinner)", "where do people eat [here]",
    ] },
    ask_map_lang: { patterns: ["do you have (a map | maps | it | one | them) in (lithuanian | russian | polish | german | french | spanish | other languages | another language)", "is there a map in (lithuanian | russian | polish | german | french | spanish)"] },
    // paying for a bus pass
    pay_card: { patterns: ["[can | could] i pay (by | with) (card | credit card | debit card | my card) #h:pay_card", "(by | with) card", "card", "do you (take | accept) (cards | credit cards | card)"] },
    pay_cash: { patterns: ["[can | could] i pay (in | with) cash", "(in | with) cash", "cash", "i will pay (in | with) cash #h:pay_cash"] },
    here_you_go: { patterns: ["here you (go | are) #h:here_you_go", "there you go", "here it is", "here is (the money | five dollars | five | a five)"] },
    // Saying yes or no to Chuck's offers in other words (a map, the way to the café, a bus pass):
    // "I'll take one", "Tell me", "You're right" / "I don't need it", "Maybe later", "I'll walk".
    accept_ctx: { patterns: [
      "(i will | i would | let me) (take | have | grab) (one | it | that) [then]", "i would (like | love) (one | it | that | to know)", "i (need | want) (one | it) [then]", "give me one",
      "[please] (tell | show) me [please] [how | the way | how to get there | how to go there | the way there]", "i would like to know (the way | how to get there)",
      "(that | it) would be (very | really | so | super) (helpful | useful | nice | great | perfect)", "(that | it) would be (helpful | useful)", "i would appreciate (it | that)",
      "you are (right | correct | absolutely right | so right | totally right)", "i (love | like | really like) coffee",
    ] },
    decline_ctx: { patterns: [
      "i do not (need | want) (it | one | that | them | a pass | a bus pass | directions) [right now | now | today | anymore]", "i am (fine | good | okay) without (it | one)",
      "(maybe | perhaps) (later | another time | next time | tomorrow)", "not (now | today | right now | this time) [maybe later]",
      "i will [just] walk", "i (prefer | like) (to walk | walking)", "i am going to walk", "i do not need (directions | the way) [anymore]",
    ] },
  },

  lines: {
    // --- greetings and openers ----------------------------------------------
    greet: [
      t("Hi there! | Welcome | to | Maple Harbor! | What | can | I | do | for you | today?", "Sveiki! | Sveiki atvykę | į | Maple Harborą! | Ką | galiu | aš | padaryti | jums | šiandien?", "Sveiki! Sveiki atvykę į Maple Harborą! Kuo galiu jums šiandien padėti?"),
      t("Well, | hello! | Welcome | to | the | Visitor | Center! | How | can | I | help | you?", "Na, | sveiki! | Sveiki atvykę | į | — | Lankytojų | centrą! | Kaip | galiu | aš | padėti | jums?", "Na, sveiki! Sveiki atvykę į Lankytojų centrą! Kuo galiu padėti?"),
      t("Hey there! | Welcome, | welcome! | What | can | I | help | you | find | today?", "Sveiki! | Sveiki atvykę, | sveiki atvykę! | Ką | galiu | aš | padėti | jums | rasti | šiandien?", "Sveiki! Sveiki atvykę! Ką padėti jums šiandien surasti?"),
    ],
    greet_map: [
      t("Hi! | You | look | like | you | need | a | map! | Am | I | right?", "Sveiki! | Jūs | atrodote | lyg | jums | reikėtų | — | žemėlapio! | Ar | aš | teisus?", "Sveiki! Atrodo, kad jums reikėtų žemėlapio! Ar teisingai spėju?",
        { flags: { 8: "“Am” in a yes/no question = the particle ar; the copula has no separate word (linked to “right”)." } }),
    ],
    greet_back: [
      t("Hey, | welcome | back! | I'll try | to talk | slower | this | time, | I | promise!", "Labas, | sveiki | sugrįžę! | Pasistengsiu | kalbėti | lėčiau | šį | kartą, | aš | pažadu!", "Sveiki sugrįžę! Šį kartą pasistengsiu kalbėti lėčiau, pažadu!"),
    ],
    ask_need: [
      t("So, | what | can | I | do | for you?", "Tai, | ką | galiu | aš | padaryti | jums?", "Tai kuo galiu padėti?"),
      t("How | can | I | help | you | today?", "Kaip | galiu | aš | padėti | jums | šiandien?", "Kuo galiu šiandien padėti?"),
    ],
    need_help: [
      t("Well, | most | people | start | with | a | map!", "Na, | dauguma | žmonių | pradeda | nuo | — | žemėlapio!", "Na, dauguma žmonių pradeda nuo žemėlapio!"),
    ],

    // --- the map ------------------------------------------------------------
    offer_map: [
      t("Would | you | like | a | map | of the town? | They're | free!", "Ar | jūs | norėtumėte | — | žemėlapio | miesto? | Jie yra | nemokami!", "Gal norėtumėte miesto žemėlapio? Jie nemokami!",
        { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte." } }),
      t("Want | a | map? | It's | free!", "Norite | — | žemėlapio? | Jis yra | nemokamas!", "Norite žemėlapio? Jis nemokamas!"),
    ],
    map_give: [
      t("Sure thing! | Here's | a | map. | We're | right | here, | at | the | red | star.", "Žinoma! | Štai | — | žemėlapis. | Mes esame | būtent | čia, | prie | — | raudonos | žvaigždės.", "Žinoma! Štai žemėlapis. Mes esame čia, prie raudonos žvaigždutės."),
      t("Here you go! | This | is | us, | right | here, | on Main Street.", "Prašom! | Tai | esame | mes, | būtent | čia, | Main Street gatvėje.", "Prašom! Štai mes – čia, Main Street gatvėje."),
      t("You bet! | Here's | a | map | of the town. | The | red | star | is | us.", "Žinoma! | Štai | — | žemėlapis | miesto. | — | Raudona | žvaigždė | yra | mes.", "Žinoma! Štai miesto žemėlapis. Raudona žvaigždutė – tai mes."),
    ],
    map_here: [
      t("We're | right | here, | see | the | red | star?", "Mes esame | būtent | čia, | matote | — | raudoną | žvaigždę?", "Mes esame čia – matote raudoną žvaigždutę?"),
    ],
    map_free: [
      t("Yep, | totally | free!", "Taip, | visiškai | nemokamai!", "Taip, visiškai nemokamai!"),
    ],
    map_ok_no: [
      t("No | problem! | They're | right | here | if | you | change your mind.", "Jokių | problemų! | Jie yra | būtent | čia, | jei | jūs | persigalvosite.", "Jokių problemų! Jie čia, jei persigalvosite."),
    ],
    map_anyway: [
      t("Oh, | and | take | a | map | anyway. | It's | free!", "O, | ir | paimkite | — | žemėlapį | vis tiek. | Jis yra | nemokamas!", "O, ir vis tiek paimkite žemėlapį. Jis nemokamas!"),
    ],

    // --- where to? ----------------------------------------------------------
    ask_where: [
      t("So, | where | are | you | headed?", "Tai, | kur | — | jūs | einate?", "Tai kur keliaujate?",
        { flags: { 2: "Progressive “are” has no Lithuanian word; the present tense of einate carries it (linked to “headed”)." } }),
      t("Anywhere | in particular | you | want | to go?", "Kur nors | konkrečiai | jūs | norite | nueiti?", "Norite kur nors konkrečiai nueiti?"),
      t("Where | would | you | like | to go?", "Kur | — | jūs | norėtumėte | nueiti?", "Kur norėtumėte nueiti?",
        { flags: { 1: "“would”: the conditional ending of norėtumėte carries it (linked to “like”)." } }),
    ],
    suggest_cafe: [
      t("Well, | if | you | like | coffee, | Sunny Cup | has | the | best | coffee | in town.", "Na, | jei | jūs | mėgstate | kavą, | kavinė „Sunny Cup“ | turi | — | geriausią | kavą | mieste.", "Na, jei mėgstate kavą, „Sunny Cup“ – geriausia kava mieste."),
    ],
    offer_directions: [
      t("Should | I | tell | you | how | to get | there?", "Ar | man | pasakyti | jums, | kaip | nueiti | ten?", "Pasakyti, kaip ten nueiti?",
        { flags: { 0: "“Should” in a yes/no question = the particle ar; man + the infinitive carries the offer." } }),
    ],
    oh_okay: [t("Oh, | okay!", "O, | gerai!", "O, gerai!")],
    offer_cafe: [
      t("Oh, | and | have | you | tried | Sunny Cup? | Best | coffee | in town!", "O, | ir | ar | jūs | išbandėte | kavinę „Sunny Cup“? | Geriausia | kava | mieste!", "O, ar jau lankėtės kavinėje „Sunny Cup“? Geriausia kava mieste!",
        { flags: { 2: "“have” in a yes/no question = the particle ar; the past tense sits on išbandėte." } }),
    ],
    welcome_new: [
      t("Oh, | welcome! | You're | going | to love | it | here.", "O, | sveiki atvykę! | Jums | — | patiks | — | čia.", "O, sveiki atvykę! Jums čia patiks.",
        { flags: { 3: "“going” (be going to): no separate Lithuanian word; the future of patiks carries it.", 5: "“it” (dummy object): Lithuanian needs no word; patiks carries it." } }),
      t("Welcome | to | town! | First | time | here?", "Sveiki atvykę | į | miestą! | Pirmas | kartas | čia?", "Sveiki atvykę į miestą! Pirmą kartą čia?"),
    ],
    speak_lang: [t("Sorry, | just | English! | But | I'll speak | slowly, | I | promise.", "Atsiprašau, | tik | angliškai! | Bet | kalbėsiu | lėtai, | aš | pažadu.", "Atsiprašau, tik angliškai! Bet kalbėsiu lėtai, pažadu.")],
    yes_vc: [t("Yes, | it | is! | How | can | I | help?", "Taip, | tai | —! | Kaip | galiu | aš | padėti?", "Taip! Kuo galiu padėti?", { flags: { 2: "“is” (elliptical yes, it is): Lithuanian needs no copula here." } })],
    which_place: [
      t("Sorry, | where | do | you | want | to go?", "Atsiprašau, | kur | — | jūs | norite | nueiti?", "Atsiprašau, kur norite nueiti?",
        { flags: { 2: "Question “do” has no Lithuanian word; the tense sits on norite." } }),
    ],
    unknown_place: [
      t("Hmm, | sorry, | I | don't know | that | place.", "Hmm, | atsiprašau, | aš | nežinau | tos | vietos.", "Hmm, atsiprašau, tokios vietos nežinau."),
    ],

    // --- routes: fast (Chuck's style) and clear (after "slower, please") --------
    r_sunny_cup: [
      t("Sunny Cup? | Easy! | Hang | a | right | out | the | door, | go | a | couple | of blocks | to | the | bank, | take | a | left, | and | it's | on the right.",
        "„Sunny Cup“? | Paprasta! | Pasukite | — | į dešinę | išėję pro | — | duris, | eikite | — | porą | kvartalų | iki | — | banko, | pasukite | — | į kairę, | ir | ji yra | dešinėje.",
        "„Sunny Cup“? Paprasta! Išėję pro duris pasukite į dešinę, eikite porą kvartalų iki banko, pasukite į kairę – ir kavinė dešinėje.",
        { spell: "Sunny Cup", write: "Sunny Cup Café: right out the door → 2 blocks to the bank → left at the bank (Oak Ave.) → on the right, across from the post office" }),
      t("Great | choice! | Go | right | out | the | door, | two | blocks | to | the | bank, | then | left. | It's | on the right, | across from | the | post | office.",
        "Puikus | pasirinkimas! | Eikite | į dešinę | išėję pro | — | duris, | du | kvartalus | iki | — | banko, | tada | į kairę. | Ji yra | dešinėje, | priešais | — | pašto | skyrių.",
        "Puikus pasirinkimas! Išėję pro duris eikite į dešinę du kvartalus iki banko, tada į kairę. Kavinė dešinėje, priešais paštą.",
        { spell: "Sunny Cup", write: "Sunny Cup Café: right out the door → 2 blocks to the bank → left at the bank (Oak Ave.) → on the right, across from the post office" }),
    ],
    r_sunny_cup_slow: [
      t("Okay. | Turn | right | out | the | door. | Go | straight | two | blocks, | to | the | bank. | Turn | left | at | the | bank, | onto | Oak Avenue. | The | café | is | on the right, | across from | the | post | office.",
        "Gerai. | Pasukite | į dešinę | išėję pro | — | duris. | Eikite | tiesiai | du | kvartalus, | iki | — | banko. | Pasukite | į kairę | prie | — | banko, | į | Oak Avenue gatvę. | — | Kavinė | yra | dešinėje, | priešais | — | pašto | skyrių.",
        "Gerai. Išėję pro duris pasukite į dešinę. Eikite tiesiai du kvartalus, iki banko. Prie banko pasukite į kairę, į Oak Avenue gatvę. Kavinė – dešinėje, priešais paštą.",
        { spell: "Oak", write: "Sunny Cup Café: right out the door → 2 blocks to the bank → left at the bank (Oak Ave.) → on the right, across from the post office" }),
    ],
    r_museum: [
      t("The | Art | Museum? | Sure! | Hang | a | left | out | the | door | and | go | straight | two | blocks. | It's | the | big | white | building | on the left.",
        "— | Meno | muziejus? | Žinoma! | Pasukite | — | į kairę | išėję pro | — | duris | ir | eikite | tiesiai | du | kvartalus. | Tai yra | — | didelis | baltas | pastatas | kairėje.",
        "Meno muziejus? Žinoma! Išėję pro duris pasukite į kairę ir eikite tiesiai du kvartalus. Tai didelis baltas pastatas kairėje.",
        { write: "Art Museum: left out the door → 2 blocks → on the left, across from Town Square (big white building)" }),
    ],
    r_museum_slow: [
      t("Okay. | Turn | left | out | the | door. | Go | straight | two | blocks, | to | Town | Square. | The | museum | is | on the left, | across from | the | square.",
        "Gerai. | Pasukite | į kairę | išėję pro | — | duris. | Eikite | tiesiai | du | kvartalus, | iki | Miesto | aikštės. | — | Muziejus | yra | kairėje, | priešais | — | aikštę.",
        "Gerai. Išėję pro duris pasukite į kairę. Eikite tiesiai du kvartalus, iki Miesto aikštės. Muziejus – kairėje, priešais aikštę.",
        { write: "Art Museum: left out the door → 2 blocks to Town Square → on the left, across from the square (big white building)" }),
    ],
    r_bank: [
      t("Harbor | Bank? | Easy! | Take | a | right | out | the | door | and | go | two | blocks. | It's | the | big | brick | building | on | the | corner.",
        "„Harbor“ | bankas? | Paprasta! | Pasukite | — | į dešinę | išėję pro | — | duris | ir | eikite | du | kvartalus. | Tai yra | — | didelis | plytų | pastatas | ant | — | kampo.",
        "„Harbor“ bankas? Paprasta! Išėję pro duris pasukite į dešinę ir eikite du kvartalus. Tai didelis plytų pastatas ant kampo.",
        { write: "Harbor Bank: right out the door → 2 blocks → on the right, on the corner of Main and Oak" }),
    ],
    r_bank_slow: [
      t("Turn | right | out | the | door. | Go | straight | two | blocks. | The | bank | is | on the right, | on | the | corner.",
        "Pasukite | į dešinę | išėję pro | — | duris. | Eikite | tiesiai | du | kvartalus. | — | Bankas | yra | dešinėje, | ant | — | kampo.",
        "Išėję pro duris pasukite į dešinę. Eikite tiesiai du kvartalus. Bankas – dešinėje, ant kampo.",
        { write: "Harbor Bank: right out the door → 2 blocks → on the right, on the corner of Main and Oak" }),
    ],
    r_post_office: [
      t("The | post | office? | Hang | a | right, | go | two | blocks | to | the | bank, | take | a | left, | and | it's | on the left.",
        "— | Pašto | skyrius? | Pasukite | — | į dešinę, | eikite | du | kvartalus | iki | — | banko, | pasukite | — | į kairę, | ir | jis yra | kairėje.",
        "Paštas? Pasukite į dešinę, eikite du kvartalus iki banko, pasukite į kairę – paštas bus kairėje.",
        { write: "Post Office: right out the door → 2 blocks to the bank → left on Oak Ave. → on the left, across from Sunny Cup" }),
    ],
    r_post_office_slow: [
      t("Turn | right | out | the | door. | Go | two | blocks, | to | the | bank. | Turn | left | at | the | bank. | The | post | office | is | on the left.",
        "Pasukite | į dešinę | išėję pro | — | duris. | Eikite | du | kvartalus, | iki | — | banko. | Pasukite | į kairę | prie | — | banko. | — | Pašto | skyrius | yra | kairėje.",
        "Išėję pro duris pasukite į dešinę. Eikite du kvartalus, iki banko. Prie banko pasukite į kairę. Paštas – kairėje.",
        { spell: "Oak", write: "Post Office: right out the door → 2 blocks to the bank → left on Oak Ave. → on the left, across from Sunny Cup" }),
    ],
    r_pharmacy: [
      t("Harbor | Pharmacy? | That's | super | close! | Turn | right, | go | one | block, | and | it's | on the right, | next to | Snip & Style.",
        "„Harbor“ | vaistinė? | Tai yra | labai | arti! | Pasukite | į dešinę, | eikite | vieną | kvartalą, | ir | ji yra | dešinėje, | šalia | kirpyklos „Snip & Style“.",
        "„Harbor“ vaistinė? Visai arti! Pasukite į dešinę, eikite vieną kvartalą – vaistinė bus dešinėje, šalia kirpyklos „Snip & Style“.",
        { write: "Harbor Pharmacy: right out the door → 1 block → on the right, next to Snip & Style" }),
    ],
    r_pharmacy_slow: [
      t("Turn | right | out | the | door. | Go | one | block. | The | pharmacy | is | on the right.",
        "Pasukite | į dešinę | išėję pro | — | duris. | Eikite | vieną | kvartalą. | — | Vaistinė | yra | dešinėje.",
        "Išėję pro duris pasukite į dešinę. Eikite vieną kvartalą. Vaistinė – dešinėje.",
        { write: "Harbor Pharmacy: right out the door → 1 block → on the right, next to Snip & Style" }),
    ],
    r_salon: [
      t("Snip & Style? | Turn | right, | go | one | block, | and | it's | on the right, | right | next to | the | pharmacy.",
        "„Snip & Style“? | Pasukite | į dešinę, | eikite | vieną | kvartalą, | ir | ji yra | dešinėje, | visai | šalia | — | vaistinės.",
        "„Snip & Style“? Pasukite į dešinę, eikite vieną kvartalą – kirpykla bus dešinėje, visai šalia vaistinės.",
        { write: "Snip & Style: right out the door → 1 block → on the right, next to the pharmacy" }),
    ],
    r_salon_slow: [
      t("Turn | right | out | the | door. | Go | one | block. | The | salon | is | on the right, | next to | the | pharmacy.",
        "Pasukite | į dešinę | išėję pro | — | duris. | Eikite | vieną | kvartalą. | — | Kirpykla | yra | dešinėje, | šalia | — | vaistinės.",
        "Išėję pro duris pasukite į dešinę. Eikite vieną kvartalą. Kirpykla – dešinėje, šalia vaistinės.",
        { write: "Snip & Style: right out the door → 1 block → on the right, next to the pharmacy" }),
    ],
    r_hotel: [
      t("The | Harborview? | It's | right | next door! | Turn | right, | and | it's | the | big | white | building.",
        "— | „Harborview“? | Jis yra | visai | šalia! | Pasukite | į dešinę, | ir | tai yra | — | didelis | baltas | pastatas.",
        "Viešbutis „Harborview“? Jis visai šalia! Pasukite į dešinę – tai didelis baltas pastatas.",
        { write: "Harborview Hotel: right out the door → next door (big white building)" }),
    ],
    r_hotel_slow: [
      t("Turn | right | out | the | door. | The | hotel | is | right | there, | on the right.",
        "Pasukite | į dešinę | išėję pro | — | duris. | — | Viešbutis | yra | būtent | ten, | dešinėje.",
        "Išėję pro duris pasukite į dešinę. Viešbutis – čia pat, dešinėje.",
        { write: "Harborview Hotel: right out the door → next door (big white building)" }),
    ],
    r_trattoria: [
      t("Lucia's? | Oh, | the | lasagna | there | is | amazing! | Go | left, | one | block, | and | it's | on the left, | with | the | red | awning.",
        "„Lucia's“? | O, | — | lazanija | ten | yra | nuostabi! | Eikite | į kairę, | vieną | kvartalą, | ir | jis yra | kairėje, | su | — | raudona | markize.",
        "„Lucia's“? O, lazanija ten nuostabi! Eikite į kairę vieną kvartalą – restoranas bus kairėje, su raudona markize.",
        { spell: "Lucia", write: "Lucia's Trattoria: left out the door → 1 block → on the left (red awning), across from Threads" }),
    ],
    r_trattoria_slow: [
      t("Turn | left | out | the | door. | Go | one | block. | Lucia's | is | on the left.",
        "Pasukite | į kairę | išėję pro | — | duris. | Eikite | vieną | kvartalą. | „Lucia's“ | yra | kairėje.",
        "Išėję pro duris pasukite į kairę. Eikite vieną kvartalą. „Lucia's“ – kairėje.",
        { spell: "Lucia", write: "Lucia's Trattoria: left out the door → 1 block → on the left (red awning), across from Threads" }),
    ],
    r_threads: [
      t("Threads? | Go | left, | one | block, | and | it's | on the right, | across from | Lucia's.",
        "„Threads“? | Eikite | į kairę, | vieną | kvartalą, | ir | ji yra | dešinėje, | priešais | restoraną „Lucia's“.",
        "„Threads“? Eikite į kairę vieną kvartalą – parduotuvė bus dešinėje, priešais restoraną „Lucia's“.",
        { spell: "Threads", write: "Threads: left out the door → 1 block → on the right, across from Lucia's" }),
    ],
    r_threads_slow: [
      t("Turn | left | out | the | door. | Go | one | block. | Threads | is | on the right.",
        "Pasukite | į kairę | išėję pro | — | duris. | Eikite | vieną | kvartalą. | „Threads“ | yra | dešinėje.",
        "Išėję pro duris pasukite į kairę. Eikite vieną kvartalą. „Threads“ – dešinėje.",
        { spell: "Threads", write: "Threads: left out the door → 1 block → on the right, across from Lucia's" }),
    ],
    r_square: [
      t("Town | Square? | Just | go | left | and | walk | two | blocks. | You | can't miss | it, | it's | the | big | square | with | the | fountain!",
        "Miesto | aikštė? | Tiesiog | pasukite | į kairę | ir | eikite | du | kvartalus. | Jūs | nepražiūrėsite | jos, | tai yra | — | didelė | aikštė | su | — | fontanu!",
        "Miesto aikštė? Tiesiog pasukite į kairę ir eikite du kvartalus. Tikrai nepražiūrėsite – tai didelė aikštė su fontanu!",
        { write: "Town Square: left out the door → 2 blocks → on the right (fountain)" }),
    ],
    r_square_slow: [
      t("Turn | left | out | the | door. | Go | straight | two | blocks. | Town | Square | is | on the right.",
        "Pasukite | į kairę | išėję pro | — | duris. | Eikite | tiesiai | du | kvartalus. | Miesto | aikštė | yra | dešinėje.",
        "Išėję pro duris pasukite į kairę. Eikite tiesiai du kvartalus. Miesto aikštė – dešinėje.",
        { write: "Town Square: left out the door → 2 blocks → on the right (fountain)" }),
    ],
    r_market: [
      t("The | farmers' | market? | It's | on | Town | Square | every | Saturday | morning. | Go | left | out | the | door | and | walk | two | blocks.",
        "— | Ūkininkų | turgus? | Jis yra | — | Miesto | aikštėje | kiekvieną | šeštadienio | rytą. | Pasukite | į kairę | išėję pro | — | duris | ir | eikite | du | kvartalus.",
        "Ūkininkų turgus? Jis vyksta Miesto aikštėje kiekvieną šeštadienio rytą. Išėję pro duris pasukite į kairę ir eikite du kvartalus.",
        { flags: { 4: "“on”: no separate Lithuanian word; the locative aikštėje carries it (Town intervenes)." }, write: "Farmers' market: Town Square, Saturday mornings · left out the door → 2 blocks" }),
    ],
    r_market_slow: [
      t("Turn | left | out | the | door. | Go | straight | two | blocks, | to | Town | Square. | The | market | is | on the square.",
        "Pasukite | į kairę | išėję pro | — | duris. | Eikite | tiesiai | du | kvartalus, | iki | Miesto | aikštės. | — | Turgus | yra | aikštėje.",
        "Išėję pro duris pasukite į kairę. Eikite tiesiai du kvartalus, iki Miesto aikštės. Turgus – aikštėje.",
        { write: "Farmers' market: Town Square, Saturday mornings · left out the door → 2 blocks" }),
    ],
    r_police: [
      t("The | police | station? | Turn | left, | go | two | blocks, | and | it's | on the left, | right | next to | the | museum.",
        "— | Policijos | nuovada? | Pasukite | į kairę, | eikite | du | kvartalus, | ir | ji yra | kairėje, | visai | šalia | — | muziejaus.",
        "Policijos nuovada? Pasukite į kairę, eikite du kvartalus – nuovada bus kairėje, visai šalia muziejaus.",
        { write: "Police Station: left out the door → 2 blocks → on the left, next to the Art Museum" }),
    ],
    r_police_slow: [
      t("Turn | left | out | the | door. | Go | two | blocks. | The | police | station | is | on the left, | next to | the | museum.",
        "Pasukite | į kairę | išėję pro | — | duris. | Eikite | du | kvartalus. | — | Policijos | nuovada | yra | kairėje, | šalia | — | muziejaus.",
        "Išėję pro duris pasukite į kairę. Eikite du kvartalus. Policijos nuovada – kairėje, šalia muziejaus.",
        { write: "Police Station: left out the door → 2 blocks → on the left, next to the Art Museum" }),
    ],
    r_station: [
      t("Union Station? | It's | a little | far. | Go | right | to | the | bank, | take | a | left | on | Oak, | and | walk | about | fifteen | minutes. | Or | take | bus | number | five!",
        "Stotis „Union Station“? | Tai yra | truputį | toli. | Eikite | į dešinę | iki | — | banko, | pasukite | — | į kairę | į | Oak gatvę, | ir | eikite | apie | penkiolika | minučių. | Arba | važiuokite | autobusu | numeris | penki!",
        "„Union Station“? Tai truputį toli. Eikite į dešinę iki banko, pasukite į kairę į Oak gatvę ir eikite apie penkiolika minučių. Arba važiuokite penktu autobusu!",
        { spell: "Oak", write: "Union Station: right out the door → 2 blocks → left at the bank (Oak Ave.) → straight ~15 min · or bus no. 5 (stop right outside)" }),
    ],
    r_station_slow: [
      t("Turn | right | out | the | door. | Go | two | blocks, | to | the | bank. | Turn | left | on | Oak Avenue. | Then | go | straight | for | fifteen | minutes.",
        "Pasukite | į dešinę | išėję pro | — | duris. | Eikite | du | kvartalus, | iki | — | banko. | Pasukite | į kairę | į | Oak Avenue gatvę. | Tada | eikite | tiesiai | — | penkiolika | minučių.",
        "Išėję pro duris pasukite į dešinę. Eikite du kvartalus, iki banko. Pasukite į kairę, į Oak Avenue gatvę. Tada eikite tiesiai penkiolika minučių.",
        { flags: { 18: "“for” (duration): no separate Lithuanian word; the phrase penkiolika minučių carries it." }, spell: "Oak", write: "Union Station: right out the door → 2 blocks → left at the bank (Oak Ave.) → straight ~15 min · or bus no. 5 (stop right outside)" }),
    ],
    r_park: [
      t("Harbor | Park? | Go | left | to | Town | Square, | hang | a | right, | and | walk | down | to | the | water. | It's | on the left.",
        "Uosto | parkas? | Eikite | į kairę | iki | Miesto | aikštės, | pasukite | — | į dešinę, | ir | eikite | žemyn | iki | — | vandens. | Jis yra | kairėje.",
        "Uosto parkas? Eikite į kairę iki Miesto aikštės, pasukite į dešinę ir eikite žemyn iki vandens. Parkas bus kairėje.",
        { spell: "Harbor", write: "Harbor Park: left out the door → 2 blocks to Town Square → right on Harbor Road → down to the water, on the left" }),
    ],
    r_park_slow: [
      t("Turn | left | out | the | door. | Go | two | blocks, | to | Town | Square. | Turn | right | at | the | square. | Walk | down | to | the | water. | The | park | is | on the left.",
        "Pasukite | į kairę | išėję pro | — | duris. | Eikite | du | kvartalus, | iki | Miesto | aikštės. | Pasukite | į dešinę | prie | — | aikštės. | Eikite | žemyn | iki | — | vandens. | — | Parkas | yra | kairėje.",
        "Išėję pro duris pasukite į kairę. Eikite du kvartalus, iki Miesto aikštės. Prie aikštės pasukite į dešinę. Eikite žemyn iki vandens. Parkas – kairėje.",
        { spell: "Harbor", write: "Harbor Park: left out the door → 2 blocks to Town Square → right on Harbor Road → down to the water, on the left" }),
    ],
    r_pier: [
      t("The Pier? | Great | seafood! | Go | left | to | Town | Square, | take | a | right, | and | follow | the | road | to | the | water.",
        "Restoranas „The Pier“? | Puikios | jūros gėrybės! | Eikite | į kairę | iki | Miesto | aikštės, | pasukite | — | į dešinę, | ir | eikite | — | keliu | iki | — | vandens.",
        "„The Pier“? Puikios jūros gėrybės! Eikite į kairę iki Miesto aikštės, pasukite į dešinę ir eikite keliu iki vandens.",
        { spell: "Harbor", write: "The Pier: left out the door → 2 blocks to Town Square → right on Harbor Road → down to the water, at the end of the pier" }),
    ],
    r_pier_slow: [
      t("Turn | left | out | the | door. | Go | two | blocks, | to | Town | Square. | Turn | right | at | the | square. | Walk | down | to | the | water. | The Pier | is | at the end | of the pier.",
        "Pasukite | į kairę | išėję pro | — | duris. | Eikite | du | kvartalus, | iki | Miesto | aikštės. | Pasukite | į dešinę | prie | — | aikštės. | Eikite | žemyn | iki | — | vandens. | Restoranas „The Pier“ | yra | gale | prieplaukos.",
        "Išėję pro duris pasukite į kairę. Eikite du kvartalus, iki Miesto aikštės. Prie aikštės pasukite į dešinę. Eikite žemyn iki vandens. Restoranas „The Pier“ – prieplaukos gale.",
        { spell: "Harbor", write: "The Pier: left out the door → 2 blocks to Town Square → right on Harbor Road → down to the water, at the end of the pier" }),
    ],
    r_lighthouse: [
      t("The | lighthouse? | You | have | to see | it! | It's | about | thirty | minutes | on foot: | left | to | Town | Square, | then | right, | and | follow | the | water.",
        "— | Švyturys? | Jūs | turite | pamatyti | jį! | Tai yra | apie | trisdešimt | minučių | pėsčiomis: | į kairę | iki | Miesto | aikštės, | tada | į dešinę, | ir | eikite palei | — | vandenį.",
        "Švyturys? Jį būtinai turite pamatyti! Pėsčiomis – apie trisdešimt minučių: į kairę iki Miesto aikštės, tada į dešinę ir palei vandenį.",
        { spell: "Harbor", write: "Lighthouse (~30 min on foot): left out the door → 2 blocks to Town Square → right on Harbor Road → along the water to the end" }),
    ],
    r_lighthouse_slow: [
      t("Turn | left | out | the | door. | Go | two | blocks, | to | Town | Square. | Turn | right | at | the | square. | Then | walk | along | the | water, | to | the | end.",
        "Pasukite | į kairę | išėję pro | — | duris. | Eikite | du | kvartalus, | iki | Miesto | aikštės. | Pasukite | į dešinę | prie | — | aikštės. | Tada | eikite | palei | — | vandenį, | iki | — | galo.",
        "Išėję pro duris pasukite į kairę. Eikite du kvartalus, iki Miesto aikštės. Prie aikštės pasukite į dešinę. Tada eikite palei vandenį iki pat galo.",
        { spell: "Harbor", write: "Lighthouse (~30 min on foot): left out the door → 2 blocks to Town Square → right on Harbor Road → along the water to the end" }),
    ],

    // --- answers about the route --------------------------------------------
    out_right: [t("Right | out | the | door.", "Į dešinę | išėję pro | — | duris.", "Išėję pro duris – į dešinę.")],
    out_left: [t("Left | out | the | door.", "Į kairę | išėję pro | — | duris.", "Išėję pro duris – į kairę.")],
    then_bank: [t("Then | left | at | the | bank.", "Tada | į kairę | prie | — | banko.", "Tada prie banko – į kairę.")],
    then_square: [t("Then | right | at | Town | Square.", "Tada | į dešinę | prie | Miesto | aikštės.", "Tada prie Miesto aikštės – į dešinę.")],
    turn_bank: [t("Left | at | the | bank.", "Į kairę | prie | — | banko.", "Prie banko – į kairę.")],
    turn_square: [t("Right | at | Town | Square.", "Į dešinę | prie | Miesto | aikštės.", "Prie Miesto aikštės – į dešinę.")],
    at_bank: [t("At | the | bank. | The | big | brick | building | on | the | corner.", "Prie | — | banko. | — | Didelis | plytų | pastatas | ant | — | kampo.", "Prie banko – didelio plytų pastato ant kampo.")],
    at_square: [t("At | Town | Square, | the | big | square | with | the | fountain.", "Prie | Miesto | aikštės, | — | didelės | aikštės | su | — | fontanu.", "Prie Miesto aikštės – didelės aikštės su fontanu.")],
    yes_across: [YES_ACROSS],
    yes_across_the: [withThe(YES_ACROSS)],
    yes_next: [YES_NEXT],
    yes_next_the: [withThe(YES_NEXT)],
    straight_only: [t("No | more | turns. | Just | go | straight!", "Jokių | daugiau | posūkių. | Tiesiog | eikite | tiesiai!", "Daugiau sukti nereikia – tiesiog eikite tiesiai!")],
    side_right: [t("On the right.", "Dešinėje.", "Dešinėje.")],
    side_left: [t("On the left.", "Kairėje.", "Kairėje.")],
    side_end: [t("You | can't miss | it. | It's | right | at the end.", "Jūs | nepražiūrėsite | jo. | Jis yra | pačiame | gale.", "Nepražiūrėsite – jis pačiame gale.")],
    blocks_0: [t("It's | right | next door!", "Jis yra | visai | šalia!", "Visai šalia!")],
    blocks_1: [t("Just | one | block.", "Tik | vieną | kvartalą.", "Tik vieną kvartalą.")],
    blocks_2: [t("Two | blocks.", "Du | kvartalus.", "Du kvartalus.")],
    street_main: [t("It's | on Main Street.", "Tai yra | Main Street gatvėje.", "Main Street gatvėje.", { spell: "Main" })],
    street_oak: [t("It's | on Oak Avenue.", "Tai yra | Oak Avenue gatvėje.", "Oak Avenue gatvėje.", { spell: "Oak" })],
    street_harbor: [t("It's | on Harbor Road.", "Tai yra | Harbor Road gatvėje.", "Harbor Road gatvėje.", { spell: "Harbor" })],
    far_1: [t("Oh, | it's | super | close. | Just | a | minute | away.", "O, | tai yra | labai | arti. | Tik | — | minutė | kelio.", "O, visai arti – tik minutė kelio.")],
    far_2: [t("Not at all! | It's | about | two | minutes | on foot.", "Visai ne! | Tai yra | apie | dvi | minutes | pėsčiomis.", "Visai ne! Pėsčiomis – apie dvi minutes.")],
    far_5: [
      t("Not at all! | It's | about | five | minutes | on foot.", "Visai ne! | Tai yra | apie | penkias | minutes | pėsčiomis.", "Visai ne! Pėsčiomis – apie penkias minutes."),
      t("Nope! | Five | minutes, | tops.", "Ne! | Penkios | minutės, | daugiausia.", "Ne! Daugiausia penkios minutės."),
    ],
    far_10: [t("Not really. | It's | about | ten | minutes | on foot.", "Nelabai. | Tai yra | apie | dešimt | minučių | pėsčiomis.", "Nelabai. Pėsčiomis – apie dešimt minučių.")],
    far_15: [t("It's | a little | far, | about | fifteen | minutes | on foot. | You | can | take | the | bus, | too.", "Tai yra | truputį | toli, | apie | penkiolika | minučių | pėsčiomis. | Jūs | galite | važiuoti | — | autobusu, | taip pat.", "Truputį toli – apie penkiolika minučių pėsčiomis. Galite važiuoti ir autobusu.")],
    far_30: [t("It's | pretty | far, | about | thirty | minutes | on foot. | But | it's | a | beautiful | walk!", "Tai yra | gana | toli, | apie | trisdešimt | minučių | pėsčiomis. | Bet | tai yra | — | nuostabus | pasivaikščiojimas!", "Gana toli – apie trisdešimt minučių pėsčiomis. Bet pasivaikščiojimas nuostabus!")],
    size_little_yes: [t("Yes, | the | little one, | with | the | yellow | door.", "Taip, | — | mažoji, | su | — | geltonomis | durimis.", "Taip, mažoji, su geltonomis durimis.")],
    size_little_no: [t("No, | the | little one, | on the right!", "Ne, | — | mažoji, | dešinėje!", "Ne, mažoji, dešinėje!")],
    size_big_yes: [t("Yes, | the | big one. | You | can't miss | it!", "Taip, | — | didysis. | Jūs | nepražiūrėsite | jo!", "Taip, didysis. Tikrai nepražiūrėsite!")],
    size_big_no: [t("No, | the | big one! | It's | huge.", "Ne, | — | didysis! | Jis yra | didžiulis.", "Ne, didysis! Jis didžiulis.")],
    size_only: [t("Don't worry, | there's | only | one!", "Nesijaudinkite, | yra | tik | vienas!", "Nesijaudinkite, jis ten vienas!")],
    show_map: [SHOW_MAP],
    show_map_the: [withThe(SHOW_MAP)],

    // --- checking understanding ---------------------------------------------
    confirm_ask: [
      t("Got | all | that?", "Supratote | visa | tai?", "Viską supratote?"),
      t("Did | you | get | all | that?", "Ar | jūs | supratote | visa | tai?", "Ar viską supratote?", { flags: { 0: "“Did” in a yes/no question = the particle ar; the past tense sits on supratote." } }),
      t("Does | that | make sense?", "Ar | tai | aišku?", "Ar aišku?", { flags: { 0: "“Does” in a yes/no question = the particle ar." } }),
    ],
    confirm_again: [
      t("Okay?", "Gerai?", "Gerai?"),
      t("Got it?", "Supratote?", "Supratote?"),
      t("All | good?", "Viskas | gerai?", "Viskas aišku?"),
    ],
    confirm_after_slow: [
      t("Got it | now?", "Supratote | dabar?", "Dabar supratote?"),
      t("Better?", "Geriau?", "Geriau?"),
    ],
    confirm_ok: [
      t("Exactly! | You | got it!", "Būtent! | Jūs | supratote!", "Būtent! Supratote!"),
      t("That's | exactly | right!", "Tai yra | visiškai | teisinga!", "Visiškai teisingai!"),
      t("You | got it! | See? | Easy.", "Jūs | supratote! | Matote? | Paprasta.", "Supratote! Matote? Paprasta."),
    ],
    ack_great: [
      t("Great!", "Puiku!", "Puiku!"),
      t("Perfect!", "Puiku!", "Puiku!"),
      t("Awesome!", "Šaunu!", "Šaunu!"),
    ],
    quiz_out: [
      t("Great! | Quick | quiz: | left | or | right | out | the | door?", "Puiku! | Greitas | klausimas: | į kairę | ar | į dešinę | išėję pro | — | duris?", "Puiku! Greitas klausimas: išėję pro duris – į kairę ar į dešinę?"),
    ],
    quiz_bank: [
      t("Great! | Quick | quiz: | which | way | do | you | turn | at | the | bank?", "Puiku! | Greitas | klausimas: | į kurią | pusę | — | jūs | pasukate | prie | — | banko?", "Puiku! Greitas klausimas: į kurią pusę pasukate prie banko?",
        { flags: { 5: "Question “do” has no Lithuanian word; the present tense sits on pasukate." } }),
    ],
    quiz_square: [
      t("Great! | Quick | quiz: | which | way | do | you | turn | at | Town | Square?", "Puiku! | Greitas | klausimas: | į kurią | pusę | — | jūs | pasukate | prie | Miesto | aikštės?", "Puiku! Greitas klausimas: į kurią pusę pasukate prie Miesto aikštės?",
        { flags: { 5: "Question “do” has no Lithuanian word; the present tense sits on pasukate." } }),
    ],
    quiz_again: [t("Left | or | right?", "Į kairę | ar | į dešinę?", "Į kairę ar į dešinę?")],
    fix_out_right: [t("Almost! | Right | out | the | door, | not | left.", "Beveik! | Į dešinę | išėję pro | — | duris, | ne | į kairę.", "Beveik! Išėję pro duris – į dešinę, ne į kairę.")],
    fix_out_left: [t("Almost! | Left | out | the | door, | not | right.", "Beveik! | Į kairę | išėję pro | — | duris, | ne | į dešinę.", "Beveik! Išėję pro duris – į kairę, ne į dešinę.")],
    fix_turn_bank: [t("Close! | Left | at | the | bank, | not | right.", "Beveik! | Į kairę | prie | — | banko, | ne | į dešinę.", "Beveik! Prie banko – į kairę, ne į dešinę.")],
    fix_turn_square: [t("Close! | Right | at | the | square, | not | left.", "Beveik! | Į dešinę | prie | — | aikštės, | ne | į kairę.", "Beveik! Prie aikštės – į dešinę, ne į kairę.")],
    fix_at_bank: [t("Not | quite. | You | turn | at | the | bank.", "Ne | visai. | Jūs | pasukate | prie | — | banko.", "Ne visai. Sukate prie banko.")],
    fix_at_square: [t("Not | quite. | You | turn | at | Town | Square.", "Ne | visai. | Jūs | pasukate | prie | Miesto | aikštės.", "Ne visai. Sukate prie Miesto aikštės.")],
    fix_noturn: [t("Actually, | no | turns | there. | Just | go | straight!", "Tiesą sakant, | jokių | posūkių | ten. | Tiesiog | eikite | tiesiai!", "Tiesą sakant, ten sukti nereikia – tiesiog eikite tiesiai!")],
    fix_blocks_0: [t("Actually, | it's | right | next door!", "Tiesą sakant, | jis yra | visai | šalia!", "Tiesą sakant, jis visai šalia!")],
    fix_blocks_1: [t("Not | quite. | Just | one | block.", "Ne | visai. | Tik | vieną | kvartalą.", "Ne visai. Tik vieną kvartalą.")],
    fix_blocks_2: [t("Not | quite. | Two | blocks.", "Ne | visai. | Du | kvartalus.", "Ne visai. Du kvartalus.")],
    fix_side_right: [t("Almost! | It's | on the right, | not | the | left.", "Beveik! | Tai yra | dešinėje, | ne | — | kairėje.", "Beveik! Dešinėje, ne kairėje.")],
    fix_side_left: [t("Almost! | It's | on the left, | not | the | right.", "Beveik! | Tai yra | kairėje, | ne | — | dešinėje.", "Beveik! Kairėje, ne dešinėje.")],
    fix_generic: [t("Hmm, | not | exactly. | Let | me | say | it | again, | slowly.", "Hmm, | ne | tiksliai. | Leiskite | man | pasakyti | tai | dar kartą, | lėtai.", "Hmm, ne visai. Pakartosiu lėtai.")],
    recheck: [
      t("Okay? | Got it | now?", "Gerai? | Supratote | dabar?", "Gerai? Dabar supratote?"),
      t("Okay?", "Gerai?", "Gerai?"),
    ],

    // --- Chuck's reactions to clarification requests ----------------------------
    slow_intro: [
      t("Oh, | sorry! | Everybody | tells | me | I | talk | too | fast.", "O, | atsiprašau! | Visi | sako | man, | kad aš | kalbu | per | greitai.", "O, atsiprašau! Visi man sako, kad kalbu per greitai."),
      t("Oops! | Sorry, | I'll slow down.", "Oi! | Atsiprašau, | sulėtinsiu.", "Oi! Atsiprašau, kalbėsiu lėčiau."),
      t("Sorry! | My | wife | says | I | talk | like | an | auctioneer!", "Atsiprašau! | Mano | žmona | sako, | kad aš | kalbu | kaip | — | aukciono vedėjas!", "Atsiprašau! Žmona sako, kad kalbu kaip aukciono vedėjas!"),
    ],
    repeat_fast_again: [
      t("Oh, | am | I | talking | too | fast | again? | Sorry! | Let | me | slow down.", "O, | ar | aš | kalbu | per | greitai | vėl? | Atsiprašau! | Leiskite | man | sulėtinti.", "O, ar vėl kalbu per greitai? Atsiprašau! Kalbėsiu lėčiau.",
        { flags: { 1: "“am” in a yes/no question = the particle ar; the present tense of kalbu carries the progressive (linked to “talking”)." } }),
    ],
    learning: [
      t("Oh, | your | English | is | great! | I'll slow down, | I | promise.", "O, | jūsų | anglų kalba | yra | puiki! | Sulėtinsiu, | aš | pažadu.", "O, jūs puikiai kalbate angliškai! Kalbėsiu lėčiau, pažadu."),
    ],
    dont_understand: [
      t("Sorry! | Let | me | try | that | again, | slowly.", "Atsiprašau! | Leiskite | man | pabandyti | tai | dar kartą, | lėtai.", "Atsiprašau! Pabandysiu dar kartą, lėtai."),
    ],
    say_again_slow: [
      t("No | problem! | Let | me | say | it | again, | nice | and | slow.", "Jokių | problemų! | Leiskite | man | pasakyti | tai | dar kartą, | ramiai | ir | lėtai.", "Jokių problemų! Pakartosiu ramiai ir lėtai."),
    ],
    louder: [t("Oh, | sorry! | Is | this | better?", "O, | atsiprašau! | Ar | taip | geriau?", "O, atsiprašau! Ar taip geriau?", { flags: { 2: "“Is” in a yes/no question = the particle ar." } })],
    thanks_patience: [
      t("Oh, | no | problem! | I | know | I | talk | way | too | fast!", "O, | jokių | problemų! | Aš | žinau, | kad aš | kalbu | gerokai | per | greitai!", "O, jokių problemų! Žinau, kad kalbu gerokai per greitai!"),
    ],

    // --- words (What does … mean?) ------------------------------------------
    w_crosswalk: [t("A | crosswalk? | It's | where | you | cross | the | street, | with | the | white | stripes.", "— | Perėja? | Tai yra | vieta, kur | jūs | pereinate | — | gatvę, | su | — | baltomis | juostomis.", "Perėja? Tai vieta, kur pereinate gatvę, – su baltomis juostomis.")],
    w_courthouse: [t("The | courthouse? | It's | the | old | building | with | the | big | clock. | The | court | is | there.", "— | Teismo rūmai? | Tai yra | — | senas | pastatas | su | — | dideliu | laikrodžiu. | — | Teismas | yra | ten.", "Teismo rūmai? Tai senas pastatas su dideliu laikrodžiu – ten veikia teismas.")],
    w_block: [t("A | block | is | from | one | street | to | the | next.", "— | Kvartalas | yra | nuo | vienos | gatvės | iki | — | kitos.", "Kvartalas – tai atstumas nuo vienos gatvės iki kitos.")],
    w_couple: [t("A | couple | means | two. | So, | two | blocks.", "— | Pora | reiškia | du. | Taigi, | du | kvartalai.", "„A couple“ reiškia porą, t. y. du. Taigi – du kvartalai.")],
    w_hang: [t("Oh, | that's | just | slang. | It | means | turn!", "O, | tai yra | tiesiog | šnekamoji kalba. | Tai | reiškia | pasukti!", "O, tai tiesiog šnekamasis posakis. Reiškia „pasukite“!")],
    w_cant_miss: [t("It | means | it's | very | easy | to see!", "Tai | reiškia, | kad tai yra | labai | lengva | pamatyti!", "Tai reiškia, kad labai lengva pamatyti!")],
    w_auctioneer: [t("Ha! | An | auctioneer | sells | things | at an auction. | And | he | talks | super | fast. | Like | me!", "Cha! | — | Aukciono vedėjas | parduoda | daiktus | aukcione. | Ir | jis | kalba | labai | greitai. | Kaip | aš!", "Cha! Aukciono vedėjas parduoda daiktus aukcione ir kalba labai greitai. Kaip aš!")],
    w_awning: [t("An | awning? | It's | like | a | little | roof | over | the | door.", "— | Markizė? | Tai yra | kaip | — | mažas | stogas | virš | — | durų.", "Markizė? Tai tarsi mažas stogelis virš durų.")],

    // --- twists ---------------------------------------------------------------
    tw_crosswalk: [t("Oh, | and | use | the | crosswalk, | okay? | People | drive | fast | around here!", "O, | ir | eikite per | — | perėją, | gerai? | Žmonės | važinėja | greitai | čia!", "O, ir eikite per perėją, gerai? Čia žmonės greitai važinėja!")],
    tw_courthouse: [t("Oh, | and | if | you | see | the | old | courthouse, | you've gone | too | far!", "O, | ir | jei | jūs | pamatysite | — | senus | teismo rūmus, | nuėjote | per | toli!", "O, ir jei pamatysite senus teismo rūmus – vadinasi, nuėjote per toli!")],
    tw_jazz: [
      t("Oh, | and | don't miss | the | free | jazz | on | Friday | night!", "O, | ir | nepraleiskite | — | nemokamo | džiazo | — | penktadienio | vakarą!", "O, ir nepraleiskite nemokamo džiazo penktadienio vakarą!",
        { flags: { 6: "“on”: no separate Lithuanian word; the accusative vakarą (time) carries it." } }),
    ],
    police_ok: [t("Is | everything | okay?", "Ar | viskas | gerai?", "Ar viskas gerai?", { flags: { 0: "“Is” in a yes/no question = the particle ar." } })],
    police_good: [t("Oh, | good!", "O, | gerai!", "O, gerai!")],
    lost_item: [t("Oh | no, | I'm | sorry! | They | can | help | you | there.", "O | ne, | man | gaila! | Jie | gali | padėti | jums | ten.", "O ne, labai gaila! Ten jums padės.")],
    police_bad: [t("Oh | no! | Well, | they're | really | nice | there.", "O | ne! | Na, | jie yra | tikrai | malonūs | ten.", "O ne! Na, ten dirba tikrai malonūs žmonės.")],

    // --- information ----------------------------------------------------------
    hours: [
      t("We're | open | nine | to | five, | Monday | through | Saturday. | Closed | on Sundays.", "Mes esame | atidaryti | nuo devynių | iki | penkių, | nuo pirmadienio | iki | šeštadienio. | Uždaryta | sekmadieniais.", "Dirbame nuo devynių iki penkių, nuo pirmadienio iki šeštadienio. Sekmadieniais nedirbame."),
    ],
    museum_hours: [t("The | museum | is | open | ten | to | five. | It's | closed | on Mondays.", "— | Muziejus | yra | atidarytas | nuo dešimties | iki | penkių. | Jis yra | uždarytas | pirmadieniais.", "Muziejus dirba nuo dešimties iki penkių. Pirmadieniais nedirba.")],
    market_hours: [t("The | farmers' | market | is | on Saturdays, | from | eight | to | one.", "— | Ūkininkų | turgus | yra | šeštadieniais, | nuo | aštuonių | iki | pirmos.", "Ūkininkų turgus vyksta šeštadieniais, nuo aštuonių iki pirmos.")],
    cafe_hours: [t("Sunny Cup | opens | at seven | and | closes | at six.", "Kavinė „Sunny Cup“ | atsidaro | septintą | ir | užsidaro | šeštą.", "„Sunny Cup“ atsidaro septintą ir užsidaro šeštą.")],
    bank_hours: [t("The | bank | is | open | nine | to | five, | Monday | to | Friday.", "— | Bankas | yra | atidarytas | nuo devynių | iki | penkių, | nuo pirmadienio | iki | penktadienio.", "Bankas dirba nuo devynių iki penkių, nuo pirmadienio iki penktadienio.")],
    hours_unknown: [t("Hmm, | I | don't know. | Check | the | sign | on | the | door!", "Hmm, | aš | nežinau. | Pažiūrėkite | — | lentelę | ant | — | durų!", "Hmm, nežinau. Pažiūrėkite lentelę ant durų!")],
    downtown: [t("You're | already | here! | This | is | downtown.", "Jūs esate | jau | čia! | Tai | yra | miesto centras.", "Jūs jau čia! Tai ir yra miesto centras.")],
    events_jazz: [
      t("Oh, | this | week? | There's | free | jazz | in | Town | Square | on | Friday | night, | at seven!", "O, | šią | savaitę? | Yra | nemokamas | džiazas | — | Miesto | aikštėje | — | penktadienio | vakarą, | septintą!", "O, šią savaitę? Penktadienio vakarą, septintą, Miesto aikštėje – nemokamas džiazas!",
        { flags: { 6: "“in”: no separate Lithuanian word; the locative aikštėje carries it (Town intervenes).", 9: "“on”: no separate Lithuanian word; the accusative vakarą (time) carries it." } }),
    ],
    events_market: [
      t("And | the | farmers' | market | is | on | Saturday | morning.", "O | — | ūkininkų | turgus | yra | — | šeštadienio | rytą.", "O ūkininkų turgus – šeštadienio rytą.",
        { flags: { 5: "“on”: no separate Lithuanian word; the accusative rytą (time) carries it." } }),
    ],
    event_free: [t("Totally | free! | Just | bring | a | chair.", "Visiškai | nemokamai! | Tiesiog | atsineškite | — | kėdę.", "Visiškai nemokamai! Tik atsineškite kėdę.")],
    event_time: [t("The | jazz | starts | at seven.", "— | Džiazas | prasideda | septintą.", "Džiazas prasideda septintą.")],
    pass_info: [t("Oh, | we | sell | them | right | here! | A | day | pass | is | five | dollars.", "O, | mes | parduodame | juos | būtent | čia! | — | Dienos | bilietas | kainuoja | penkis | dolerius.", "O, parduodame čia pat! Dienos bilietas kainuoja penkis dolerius.")],
    pass_price: [t("A | day | pass | is | five | dollars, | and | a | week | pass | is | twenty.", "— | Dienos | bilietas | kainuoja | penkis | dolerius, | o | — | savaitės | bilietas | kainuoja | dvidešimt.", "Dienos bilietas kainuoja penkis dolerius, o savaitės – dvidešimt.")],
    pass_offer: [t("Would | you | like | one?", "Ar | jūs | norėtumėte | vieno?", "Ar norėtumėte?", { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte." } })],
    pass_total: [t("Great! | That'll be | five | dollars.", "Puiku! | Tai bus | penki | doleriai.", "Puiku! Penki doleriai.")],
    pass_paid: [t("Thank | you! | Here's | your | pass.", "Dėkoju | jums! | Štai | jūsų | bilietas.", "Ačiū! Štai jūsų bilietas.")],
    no_problem: [t("No | problem!", "Jokių | problemų!", "Jokių problemų!")],
    busstop: [t("The | bus | stop | is | right | outside, | across the street.", "— | Autobusų | stotelė | yra | čia pat | lauke, | kitoje gatvės pusėje.", "Autobusų stotelė čia pat, kitoje gatvės pusėje.")],
    bus_which: [t("Take | bus | number | five. | It | stops | right | outside.", "Važiuokite | autobusu | numeris | penki. | Jis | sustoja | čia pat | lauke.", "Važiuokite penktu autobusu. Jis sustoja čia pat, lauke.")],
    bus_schedule: [t("Sure! | Here's | a | bus | schedule.", "Žinoma! | Štai | — | autobusų | tvarkaraštis.", "Žinoma! Štai autobusų tvarkaraštis.")],
    wifi: [
      t("Sure! | The | password | is | harborfun, | all one word.", "Žinoma! | — | Slaptažodis | yra | harborfun, | rašoma kartu.", "Žinoma! Slaptažodis – harborfun, rašoma kartu.",
        { say: "Sure! The password is harbor fun, all one word.", spell: "harborfun", write: "Wi-Fi password: harborfun" }),
      t("Yep, | it's | free. | The | password | is | harborfun.", "Taip, | jis yra | nemokamas. | — | Slaptažodis | yra | harborfun.", "Taip, jis nemokamas. Slaptažodis – harborfun.",
        { say: "Yep, it's free. The password is harbor fun.", spell: "harborfun", write: "Wi-Fi password: harborfun" }),
    ],
    restroom: [t("Right | down the hall, | on the left.", "Tiesiai | koridoriumi, | kairėje.", "Koridoriumi tiesiai, kairėje.")],
    brochure: [t("Sure! | Help yourself. | They're | on | the | rack | by | the | door.", "Žinoma! | Imkite. | Jie yra | ant | — | stovo | prie | — | durų.", "Žinoma, imkite! Jie ant stovo prie durų.")],
    recommend: [
      t("Oh, | you | have | to see | the | lighthouse! | And | Sunny Cup | has | the | best | coffee | in town.", "O, | jūs | turite | pamatyti | — | švyturį! | O | kavinė „Sunny Cup“ | turi | — | geriausią | kavą | mieste.", "O, būtinai pamatykite švyturį! O „Sunny Cup“ – geriausia kava mieste."),
      t("The | Art | Museum | is | great, | and | the | farmers' | market | on Saturday | is | a lot of fun.", "— | Meno | muziejus | yra | puikus, | o | — | ūkininkų | turgus | šeštadienį | yra | labai smagus.", "Meno muziejus puikus, o šeštadienio ūkininkų turgus labai smagus."),
    ],
    food: [t("Lucia's | has | amazing | pasta, | and | Sunny Cup | has | great | coffee | and | muffins.", "„Lucia's“ | turi | nuostabius | makaronus, | o | „Sunny Cup“ | turi | puikią | kavą | ir | keksiukus.", "„Lucia's“ gamina nuostabius makaronus, o „Sunny Cup“ – puiki kava ir keksiukai.")],
    map_lang: [t("Sorry, | we | only | have | them | in English | and | Spanish.", "Atsiprašau, | mes | tik | turime | juos | anglų kalba | ir | ispanų kalba.", "Atsiprašau, turime tik anglų ir ispanų kalbomis.")],

    // --- the end ----------------------------------------------------------------
    ask_more: [
      t("Anything | else?", "Ką nors | daugiau?", "Dar ko nors?"),
      t("Can | I | help | you | with | anything | else?", "Ar galiu | aš | padėti | jums | — | kuo nors | daugiau?", "Ar galiu dar kuo nors padėti?",
        { flags: { 4: "“with”: no separate Lithuanian word; the instrumental kuo nors carries it." } }),
    ],
    praise: [
      t("And | hey, | thanks | for | stopping | me | when | I | talk | too | fast. | Most | people | just | nod | and | smile!", "Ir | ei, | ačiū, | kad | sustabdote | mane, | kai | aš | kalbu | per | greitai. | Dauguma | žmonių | tiesiog | linkteli | ir | šypsosi!", "Ir, beje, ačiū, kad mane sustabdote, kai kalbu per greitai. Dauguma žmonių tiesiog linkčioja ir šypsosi!"),
      t("Good job | asking, | by the way. | That's | the | best | way | to learn!", "Šaunu, | kad klausiate, | beje. | Tai yra | — | geriausias | būdas | išmokti!", "Beje, šaunu, kad klausiate. Tai geriausias būdas išmokti!"),
    ],
    closing: [
      t("Enjoy | Maple Harbor!", "Mėgaukitės | Maple Harboru!", "Mėgaukitės Maple Harboru!"),
      t("Have | fun | exploring!", "Linkiu | smagiai | tyrinėti!", "Linkiu smagiai tyrinėti!"),
      t("Come | back | anytime!", "Užsukite | vėl | bet kada!", "Užsukite bet kada!"),
    ],
  },

  hints: {
    map: {
      lt: "Paprašyti miesto žemėlapio",
      items: [
        { id: "map_could", s: t("Could | I | have | a | map, | please?", "Ar galėčiau | aš | gauti | — | žemėlapį, | prašau?", "Ar galėčiau gauti žemėlapį?"), register: "polite" },
        { id: "map_do_you", s: t("Do | you | have | a | map | of the town?", "Ar | jūs | turite | — | žemėlapį | miesto?", "Ar turite miesto žemėlapį?", { flags: { 0: "Question “Do” = the particle ar." } }) },
        { id: "map_can", s: t("Can | I | get | a | map?", "Ar galiu | aš | gauti | — | žemėlapį?", "Ar galiu gauti žemėlapį?"), register: "casual" },
        { id: "map_id_like", s: t("I'd like | a | map, | please.", "Norėčiau | — | žemėlapio, | prašau.", "Norėčiau žemėlapio.") },
        { id: "map_free", s: t("Is | the | map | free?", "Ar | — | žemėlapis | nemokamas?", "Ar žemėlapis nemokamas?", { flags: { 0: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }) },
        { id: "map_here", s: t("Where | are | we | on the map?", "Kur | esame | mes | žemėlapyje?", "Kur mes esame žemėlapyje?") },
      ],
    },
    where: {
      lt: "Paklausti, kaip kur nors nueiti", slot: "place", examples: ["museum", "post_office", "lighthouse", "sunny_cup"],
      items: placeHints(WHERE_BASE),
    },
    cafe: {
      lt: "Paklausti kelio į kavinę", slot: "place", examples: ["sunny_cup"],
      items: WHERE_BASE.slice(0, 3).map((it) => ({ ...it, only: (e: EntityDef) => e.id === "sunny_cup" })),
    },
    slower: {
      lt: "Paprašyti pakartoti lėčiau",
      items: [
        { id: "c_again_slowly", s: t("Sorry, | could | you | say | that | again | more slowly?", "Atsiprašau, | ar {j:galėtumėte|t:galėtum} | {j:jūs|t:tu} | pasakyti | tai | dar kartą | lėčiau?", "Atsiprašau, ar {j:galėtumėte|t:galėtum} pakartoti lėčiau?") },
        { id: "c_slower", s: t("Could | you | speak | more slowly, | please?", "Ar {j:galėtumėte|t:galėtum} | {j:jūs|t:tu} | kalbėti | lėčiau, | prašau?", "Ar {j:galėtumėte|t:galėtum} kalbėti lėčiau?") },
        { id: "c_learning", s: t("Sorry, | I'm | still | learning | English.", "Atsiprašau, | aš | dar | mokausi | anglų kalbos.", "Atsiprašau, aš dar mokausi anglų kalbos.", { flags: { 1: "Progressive “am” has no separate Lithuanian word; the present tense of mokausi carries it." } }) },
        { id: "c_say_again", s: t("Sorry, | could | you | say | that | again?", "Atsiprašau, | ar {j:galėtumėte|t:galėtum} | {j:jūs|t:tu} | pasakyti | tai | dar kartą?", "Atsiprašau, ar {j:galėtumėte|t:galėtum} pakartoti?"), note: "Pirmą kartą Chuckas pakartos taip pat greitai – tada paprašyk dar kartą." },
      ],
    },
    yes_please: {
      lt: "Sutikti",
      items: [
        { id: "yp_yes", s: t("Yes, | please!", "Taip, | prašau!", "Taip, prašau!") },
        { id: "yp_sure", s: t("Sure, | thanks!", "Žinoma, | ačiū!", "Žinoma, ačiū!") },
        { id: "yp_great", s: t("That | would | be | great, | thanks.", "Tai | — | būtų | puiku, | ačiū.", "Būtų puiku, ačiū.", { flags: { 1: "“would” has no separate word: the conditional būtų carries it (linked to “be”)." } }) },
      ],
    },
    check: {
      lt: "Pasitikslinti, ar teisingai supratai kelią",
      items: [CHK.side, CHK.two_blocks, CHK.far,
        { id: "k_big_one", s: t("Do | you | mean | the | big one?", "Ar | jūs | turite omenyje | — | didįjį?", "Turite omenyje didįjį?", { flags: { 0: "Question “Do” = the particle ar." } }), note: "Eilutė iš dainos." },
        { id: "k_turn_where", s: t("Sorry, | turn | where?", "Atsiprašau, | pasukti | kur?", "Atsiprašau, kur pasukti?"), note: "Paklausk tik tos vietos, kurios nenugirdai." },
        { id: "k_blocks", s: t("How many | blocks?", "Kiek | kvartalų?", "Kiek kvartalų?") },
        { id: "k_did_i", s: t("Did | I | get | that | right?", "Ar | aš | supratau | tai | teisingai?", "Ar teisingai supratau?", { flags: { 0: "“Did” in a yes/no question = the particle ar; the past tense sits on supratau." } }) },
        { id: "k_show_map", s: t("Could | you | show | me | on the map?", "Ar {j:galėtumėte|t:galėtum} | {j:jūs|t:tu} | parodyti | man | žemėlapyje?", "Ar {j:galėtumėte|t:galėtum} parodyti žemėlapyje?") },
      ],
    },
    ...Object.fromEntries(Object.entries(CHECK_FOR).map(([id, keys]) => [`chk_${id}`, {
      lt: "Pasitikslinti, ar teisingai supratai kelią", items: [...keys.map((k) => CHK[k]), CHK.far, CHK.side].filter((x, i, a) => a.indexOf(x) === i),
    }])),
    quiz_out: { lt: "Atsakyti: į kairę ar į dešinę", items: QUIZ_ITEMS("a_door", "out | the | door", "išėję pro | — | duris", "Išėję pro duris") },
    quiz_bank: { lt: "Atsakyti: į kairę ar į dešinę", items: QUIZ_ITEMS("a_turn", "at | the | bank", "prie | — | banko", "Prie banko") },
    quiz_square: { lt: "Atsakyti: į kairę ar į dešinę", items: QUIZ_ITEMS("a_turn", "at | Town | Square", "prie | Miesto | aikštės", "Prie Miesto aikštės") },
    gotit: { lt: "Pasakyti, kad dabar supratai", items: GOTIT },
    clarify_more: {
      lt: "Dar keli būdai pasitikslinti",
      items: [
        { id: "x_speak_up", s: t("Could | you | speak up, | please?", "Ar {j:galėtumėte|t:galėtum} | {j:jūs|t:tu} | kalbėti garsiau, | prašau?", "Ar {j:galėtumėte|t:galėtum} kalbėti garsiau?") },
        { id: "x_one_more", s: t("One more time, | please?", "Dar kartą, | prašau?", "Dar kartą, prašau?") },
        { id: "x_spell_street", s: t("How | do | you | spell | the | street?", "Kaip | — | {j:jūs|t:tu} | {j:rašote|t:rašai} | — | gatvę?", "Kaip rašomas gatvės pavadinimas?", { flags: { 1: "Question “do” has no Lithuanian word; the tense sits on the verb (linked to “spell”)." } }) },
        { id: "t_patience", s: t("Thanks | for | your | patience!", "Ačiū | už | {j:jūsų|t:tavo} | kantrybę!", "Ačiū už {j:jūsų|t:tavo} kantrybę!") },
      ],
    },
    words: {
      lt: "Paklausti, ką reiškia žodis", slot: "word", examples: ["crosswalk", "courthouse", "block"],
      items: [
        { id: "x_word", s: t("What | does | {X} | mean?", "Ką | — | {X:nom} | reiškia?", "Ką reiškia {X:nom}?", { flags: { 1: "Question “does” has no Lithuanian word; the tense sits on reiškia." } }) },
        { id: "x_whats_a", s: t("What's | a | {X}?", "Kas yra | — | {X:nom}?", "Kas yra {X:nom}?"), only: (e) => !!e.attrs?.noun },
      ],
    },
    info: {
      lt: "Paklausti apie miestą ir lankytojų centrą",
      items: [
        { id: "i_hours", s: t("What time | do | you | close?", "Kelintą | — | jūs | užsidarote?", "Kelintą užsidarote?", { flags: { 1: "Question “do” has no Lithuanian word; the tense sits on užsidarote." } }) },
        { id: "i_events", s: t("What's | going on | this | week?", "Kas | vyksta | šią | savaitę?", "Kas vyksta šią savaitę?", { flags: { 0: "“'s” (is) of the progressive has no separate word; vyksta carries it." } }) },
        { id: "i_buspass", s: t("Where | can | I | buy | a | bus | pass?", "Kur | galiu | aš | nusipirkti | — | autobuso | bilietą?", "Kur galėčiau nusipirkti autobuso bilietą?") },
        { id: "i_wifi", s: t("Is | there | Wi-Fi | here?", "Ar yra | — | „Wi-Fi“ | čia?", "Ar čia yra „Wi-Fi“?", { flags: { 1: "Existential “there” has no Lithuanian word; yra carries it." } }) },
        { id: "i_restroom", s: t("Where's | the | restroom?", "Kur yra | — | tualetas?", "Kur yra tualetas?") },
        { id: "i_recommend", s: t("What | do | you | recommend | seeing?", "Ką | — | jūs | rekomenduojate | pamatyti?", "Ką rekomenduojate pamatyti?", { flags: { 1: "Question “do” has no Lithuanian word; the tense sits on rekomenduojate." } }) },
        { id: "i_food", s: t("Where | can | I | get | something | to eat?", "Kur | galiu | aš | gauti | ko nors | pavalgyti?", "Kur galėčiau ko nors pavalgyti?") },
      ],
    },
    pay: {
      lt: "Susimokėti",
      items: [
        { id: "here_you_go", s: t("Here you go.", "Prašom.", "Prašom.") },
        { id: "pay_card", s: t("Can | I | pay | by card?", "Ar galiu | aš | sumokėti | kortele?", "Ar galiu sumokėti kortele?") },
        { id: "pay_cash", s: t("I'll pay | in cash.", "Sumokėsiu | grynaisiais.", "Sumokėsiu grynaisiais.") },
      ],
    },
    done: {
      lt: "Pasakyti, kad daugiau nieko nereikia",
      items: [
        { id: "d_all", s: t("That's | all, | thanks.", "Tai yra | viskas, | ačiū.", "Tai viskas, ačiū.") },
        { id: "d_set", s: t("I'm | all set, | thanks.", "Man | viskas gerai, | ačiū.", "Man nieko daugiau nereikia, ačiū."), note: "„I'm all set“ – mandagus būdas pasakyti, kad nieko daugiau nereikia." },
        { id: "d_nothing", s: t("Nothing | else, | thanks.", "Nieko | daugiau, | ačiū.", "Nieko daugiau, ačiū.") },
      ],
    },
  },

  tips: {
    us_restroom: { key: "us_restroom", lt: "Suprasta! Amerikoje mandagiau sakyti „restroom“ arba „bathroom“.", better: "Where's the restroom?" },
    us_pharmacy: { key: "us_pharmacy", lt: "Suprasta! Amerikoje sakoma „pharmacy“ arba „drugstore“, o ne „chemist“.", better: "Where's the pharmacy?" },
    us_downtown: { key: "us_downtown", lt: "Suprasta! Amerikoje miesto centras dažniausiai vadinamas „downtown“.", better: "Where's downtown?" },
    us_schedule: { key: "us_schedule", lt: "Suprasta! Amerikoje sakoma „schedule“, o ne „timetable“.", better: "Do you have a bus schedule?" },
    us_vacation: { key: "us_vacation", lt: "Suprasta! Amerikoje sakoma „on vacation“, o ne „on holiday“.", better: "I'm on vacation." },
    us_visitor_center: { key: "us_visitor_center", lt: "Suprasta! Amerikoje sakoma „visitor center“.", better: "Is this the visitor center?" },
    us_whats_on: { key: "us_whats_on", lt: "Suprasta! Amerikoje dažniau klausiama „What's going on this week?“", better: "What's going on this week?" },
  },

  merges: {
    "hey there": { reason: "lexical_expression", split: "hey → ei + there → ten would add a false place; one greeting = sveiki.", minimal: "Two words, one greeting." },
    "sure thing": { reason: "lexical_expression", split: "sure → tikras + thing → daiktas is false; = žinoma.", minimal: "Two words." },
    "you bet": { reason: "lexical_expression", split: "you → jūs + bet → lažinatės is false; a cheerful yes = žinoma.", minimal: "Two words." },
    "maple harbor": { reason: "lexical_expression", split: "A proper name; maple → klevas + harbor → uostas would translate the town's name.", minimal: "Two-word name." },
    "sunny cup": { reason: "lexical_expression", split: "A café name; sunny → saulėtas + cup → puodelis would translate the name.", minimal: "Two-word name." },
    "snip & style": { reason: "lexical_expression", split: "A salon name; snip → kirptelėti + style → stilius would translate the name.", minimal: "The whole name." },
    "union station": { reason: "lexical_expression", split: "A station name; union → sąjunga + station → stotis would translate the name.", minimal: "Two-word name." },
    "the pier": { reason: "lexical_expression", split: "A restaurant name; the → — + pier → prieplauka would turn the name into a common noun.", minimal: "The article is part of the name." },
    "main street": { reason: "lexical_expression", split: "A street name; main → pagrindinė + street → gatvė would translate the name.", minimal: "Two-word name." },
    "oak avenue": { reason: "lexical_expression", split: "A street name; oak → ąžuolas + avenue → alėja would translate the name.", minimal: "Two-word name." },
    "harbor road": { reason: "lexical_expression", split: "A street name; harbor → uostas + road → kelias would translate the name.", minimal: "Two-word name." },
    "on main street": { reason: "grammatical_fusion", split: "on → ant is false for a street; the locative Main Street gatvėje carries it.", minimal: "Preposition + name, nothing glossable inside." },
    "on oak avenue": { reason: "grammatical_fusion", split: "on → ant is false for a street; the locative Oak Avenue gatvėje carries it.", minimal: "Preposition + name, nothing glossable inside." },
    "on harbor road": { reason: "grammatical_fusion", split: "on → ant is false for a street; the locative Harbor Road gatvėje carries it.", minimal: "Preposition + name, nothing glossable inside." },
    "across from": { reason: "lexical_expression", split: "across → skersai + from → nuo is false; = priešais.", minimal: "Two words." },
    "next to": { reason: "lexical_expression", split: "next → kitas + to → į is false; = šalia.", minimal: "Two words." },
    "next door": { reason: "lexical_expression", split: "next → kitas + door → durys is false; the neighbouring building = visai šalia.", minimal: "Two words." },
    "across the street": { reason: "lexical_expression", split: "across → skersai + the → — + street → gatvę gives “skersai gatvę”; the place = kitoje gatvės pusėje.", minimal: "All three words form the expression." },
    "down the hall": { reason: "grammatical_fusion", split: "down → žemyn is false; the instrumental koridoriumi carries “along”.", minimal: "No adjective inside." },
    "around here": { reason: "lexical_expression", split: "around → aplink + here → čia (“aplink čia”) is false; = čia, šiose apylinkėse.", minimal: "Two words." },
    "a little": { reason: "lexical_expression", split: "a → — + little → mažas is false with an adjective; = truputį.", minimal: "Two words." },
    "a bit": { reason: "lexical_expression", split: "a → — + bit → gabalėlis is false; = truputį.", minimal: "Two words." },
    "not at all": { reason: "lexical_expression", split: "not → ne + at all → visai gives “ne visai” (= not quite), the opposite; = visai ne.", minimal: "Three words, one reply." },
    "not really": { reason: "grammatical_fusion", split: "not → ne + really → tikrai gives “ne tikrai”; the hedged no = nelabai.", minimal: "Two words." },
    "how many": { reason: "lexical_expression", split: "how → kaip + many → daug is false; = kiek.", minimal: "Two words." },
    "what time": { reason: "lexical_expression", split: "what → koks + time → laikas is false for clock time; = kelintą.", minimal: "Two words." },
    "going on": { reason: "lexical_expression", split: "going → einantis + on → ant is false; “be going on” = vykti.", minimal: "Two words." },
    "make sense": { reason: "lexical_expression", split: "make → daryti + sense → prasmę is a calque; = aišku.", minimal: "Two words." },
    "change your mind": { reason: "lexical_expression", split: "change → pakeisti + your → savo + mind → protą is a calque; = persigalvoti.", minimal: "Verb and object form the idiom." },
    "all one word": { reason: "lexical_expression", split: "all → visas + one → vienas + word → žodis is false; spelling note = rašoma kartu.", minimal: "Three words, one instruction." },
    "you've gone": { reason: "grammatical_fusion", split: "you've → jūs turite + gone → nuėję is false; the perfect = the past nuėjote.", minimal: "Two words.", },
    "i'll slow down": { reason: "grammatical_fusion", split: "I'll → aš + slow → lėtas + down → žemyn is false; = sulėtinsiu (future on the verb).", minimal: "Three words." },
    "slow down": { reason: "lexical_expression", split: "down → žemyn is prohibited as mechanical; slow down = sulėtinti.", minimal: "Two words." },
    "speak up": { reason: "lexical_expression", split: "up → aukštyn is prohibited as mechanical; speak up = kalbėti garsiau.", minimal: "Two words." },
    "big one": { reason: "grammatical_fusion", split: "one → vienas would add a false numeral; the adjective is nominalised: didysis.", minimal: "Two words." },
    "little one": { reason: "grammatical_fusion", split: "one → vienas would add a false numeral; the adjective is nominalised: mažoji.", minimal: "Two words." },
    "one more time": { reason: "lexical_expression", split: "one → vienas + more → daugiau + time → laikas is false; = dar kartą.", minimal: "Three words." },
    "by the way": { reason: "lexical_expression", split: "by → pro + the → — + way → kelią is false; = beje.", minimal: "Three words." },
    "good job": { reason: "lexical_expression", split: "good → geras + job → darbas is a calque here; praise = šaunu.", minimal: "Two words." },
    "help yourself": { reason: "lexical_expression", split: "help → padėkite + yourself → sau is false; an offer = imkite.", minimal: "Two words." },
    "a lot of fun": { reason: "lexical_expression", split: "a lot of → daug + fun → linksmybių is a calque; = labai smagus.", minimal: "Four words, one predicate." },
    "all set": { reason: "lexical_expression", split: "all → visi + set → nustatyti is false; = viskas gerai (nothing more needed).", minimal: "Two words." },
    "i see": { reason: "lexical_expression", split: "I → aš + see → matau is false here; = suprantu (I understand).", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  // The plan: map → the way to the café → "say it again, more slowly" → check the route.
  // Declining the map or the café hides that line; the slow repeat is hidden if the route was clear anyway.
  mission: [
    { lt: "Paprašyk žemėlapio", optional: true, when: (c) => !c.s.mapNo, done: (c) => !!c.s.map },
    { lt: "Paklausk kelio į kavinę", optional: true, when: (c) => !c.s.cafeNo, done: (c) => c.s.asked.includes("sunny_cup") },
    { lt: "Paprašyk pakartoti lėčiau", optional: true, when: (c) => routeGoal(c) && (!c.s.confirmed || !!c.s.slowed), done: (c) => !!c.s.slowed },
    { lt: "Pasitikslink kelią", optional: true, when: routeGoal, done: (c) => !!c.s.dest && !!c.s.conf[c.s.dest] },
  ],
  steps: [
    { id: "need", when: (c) => !c.s.map && !c.s.dest && !c.s.need, done: (c) => !!c.s.need,
      ask: (c) => c.say("ask_need"),
      expects: ["ask_map", "ask_where", "map_free"],
      suggest: [
        { lt: "Paprašyti miesto žemėlapio", hint: "map" },
        { lt: "Paklausti kelio į kavinę", hint: "cafe" },
        { lt: "Paklausti apie miestą", hint: "info" },
        { lt: "Paprašyti pakartoti lėčiau", hint: "slower" },
      ],
      help: (c) => { c.say("need_help"); c.s.need = true; } },
    { id: "confirm", when: (c) => !!c.s.dest, done: (c) => !!c.s.conf[c.s.dest],
      ask: (c) => { askConfirm(c); },
      // Not "confirm" or the global clarification intents: the expected-intent bonus is per segment,
      // so expecting them would make "Sorry, could you say that again?" or a multi-part check split.
      expects: CONFIRM_EXPECTS,
      suggest: [
        { lt: "Pasitikslinti, ar teisingai supratai kelią", hint: "check" },
        { lt: "Paprašyti pakartoti lėčiau", hint: "slower" },
        { lt: "Paklausti, ką reiškia žodis", hint: "words", options: "word" },
        { lt: "Dar keli būdai pasitikslinti", hint: "clarify_more" },
      ],
      yes: (c) => { quiz(c); },
      no: (c) => { sayAgainSlow(c); },
      help: (c) => { sayAgainSlow(c); } },
    { id: "map", when: (c) => !c.s.map && !c.s.mapNo, done: (c) => !!c.s.map || !!c.s.mapNo,
      ask: (c) => c.say("offer_map"),
      expects: ["ask_map", "map_no", "map_free", "accept_ctx", "decline_ctx"],
      suggest: [{ lt: "Sutikti ir paimti žemėlapį", hint: "yes_please" }, { lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
      yes: (c) => { giveMap(c); c.say("map_give"); },
      no: (c) => { c.s.mapNo = true; c.say("map_ok_no"); } },
    // The café is the lesson's goal: asked for directly ("So, where are you headed?"), or offered after another route.
    { id: "cafe", when: (c) => !c.s.asked.includes("sunny_cup") && !c.s.cafeNo && (!c.s.dest || !!c.s.conf[c.s.dest]),
      done: (c) => c.s.asked.includes("sunny_cup") || !!c.s.cafeNo,
      ask: (c) => { if (c.s.dest) offerCafe(c, true); else c.say("ask_where"); },
      expects: ["ask_where", "just_looking"],
      suggest: [
        { lt: "Paklausti kelio į kavinę", hint: "cafe" },
        { lt: "Paklausti kelio į kitą vietą", hint: "where", options: ["museum", "post_office", "pharmacy", "bank", "trattoria", "square", "lighthouse", "station", "pier"] },
        { lt: "Paprašyti pakartoti lėčiau", hint: "slower" },
      ],
      no: (c) => { offerCafe(c, false); },
      help: (c) => { offerCafe(c, false); } },
    { id: "more", when: (c) => c.s.askMore, done: (c) => !!c.s.moreDone,
      ask: (c) => c.say("ask_more"),
      expects: ["more_no", "more_yes", "ask_where", "ask_hours", "ask_events", "ask_buspass", "ask_wifi", "ask_restroom", "thanks_patience"],
      suggest: [
        { lt: "Pasakyti, kad daugiau nieko nereikia", hint: "done" },
        { lt: "Paklausti dar ko nors", hint: "info" },
        { lt: "Paklausti kelio į kitą vietą", hint: "where", options: "place" },
      ],
      yes: (c) => { c.say("g_yes_what"); c.hold(); },
      no: (c) => { c.s.moreDone = true; } },
  ],

  init: (c) => {
    c.s.asked = [];
    c.s.conf = {};
    c.s.clar = 0;
    c.s.askMore = c.chance(0.65);
    c.s.wantTwist = c.visits >= 1 && c.chance(0.6);
    c.s.jazzTip = c.visits >= 1 && c.chance(0.4);
  },

  start: (c) => {
    if (c.memory.clarified && c.chance(0.7)) {
      c.say("greet_back");
      return; // the "need" step asks "So, what can I do for you?"
    }
    if (c.chance(0.25)) {
      c.say("greet_map");
      c.expect({ id: "greet_map", optional: true, hints: ["g_yesno", "map"], expects: ["ask_map", "ask_where", "map_no"],
        suggest: [{ lt: "Sutikti ir paimti žemėlapį", hint: "yes_please" }, { lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
        yes: (cc) => { cc.s.need = true; giveMap(cc); cc.say("map_give"); },
        no: (cc) => { cc.s.need = true; cc.s.mapNo = true; cc.say("oh_okay"); cc.say("ask_need"); cc.hold(); },
        on: {
          ask_map: (cc) => { cc.s.need = true; giveMap(cc); cc.say("map_give"); },
          accept_ctx: (cc) => { cc.s.need = true; if (giveMap(cc)) cc.say("map_give"); },
          decline_ctx: (cc) => { cc.s.need = true; cc.s.mapNo = true; cc.say("oh_okay"); cc.say("ask_need"); cc.hold(); },
        } });
      return;
    }
    c.say("greet");
    c.hold(); // the greeting already asks "What can I do for you?" (the "need" step)
  },

  handlers: wrap(H),

  finish: (c) => {
    if (!c.s.map) { c.say("map_anyway"); giveMap(c); }
    if (c.s.clar > 0 && !c.s.patience) c.say("praise");
    if (c.s.jazzTip && !c.s.events) { c.say("tw_jazz"); c.s.events = true; }
    c.complete();
    c.remember({ clarified: c.s.clar > 0 || !!c.memory.clarified });
    if (c.s.byeNow) { c.say("g_bye"); c.end(); return; } // the learner already said goodbye
    c.say("closing");
    c.expect({ id: "closing", hints: ["g_social", "clarify_more"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
        thanks_patience: (cc) => { cc.say("thanks_patience"); cc.end(); },
        thanks_help: (cc) => { cc.say("g_welcome"); cc.end(); },
        more_no: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // map
    { say: "Hi! Could I have a map, please?", intent: "ask_map" },
    { say: "Do you have a map of the town?", intent: "ask_map" },
    { say: "Can I get a map?", intent: "ask_map" },
    { say: "I'd like a map, please.", intent: "ask_map" },
    { say: "Is the map free?", intent: "map_free" },
    { say: "Where are we on the map?", intent: "map_here" },
    { say: "I don't need a map", intent: "map_no", not: ["ask_map"] },
    { say: "No map, thanks", intent: "map_no", not: ["ask_map"] },
    // destinations
    { say: "How do I get to Sunny Cup?", intent: "ask_where", slots: { place: "sunny_cup" } },
    { say: "Excuse me, how do I get to the café?", intent: "ask_where", slots: { place: "sunny_cup" } },
    { say: "Where's the museum?", intent: "ask_where", slots: { place: "museum" } },
    { say: "Could you tell me how to get to the post office?", intent: "ask_where", slots: { place: "post_office" } },
    { say: "I'm looking for the lighthouse.", intent: "ask_where", slots: { place: "lighthouse" } },
    { say: "Which way is Union Station?", intent: "ask_where", slots: { place: "station" } },
    { say: "What's the best way to Town Square?", intent: "ask_where", slots: { place: "square" } },
    { say: "I'd like to go to the farmers' market", intent: "ask_where", slots: { place: "market" } },
    { say: "Is there a drugstore near here?", intent: "ask_where", slots: { place: "pharmacy" } },
    { say: "Where's the chemist?", intent: "ask_where" },
    { say: "Is the lighthouse far from here?", intent: "ask_far", slots: { place: "lighthouse" } },
    { say: "Could you show me Lucia's on the map?", intent: "show_map", slots: { place: "trattoria" } },
    { say: "The museum, please", intent: "dest_short", step: "cafe", slots: { place: "museum" } },
    { say: "The museum", intent: "dest_short", slots: { place: "museum" } },
    { say: "Where's the police station?", intent: "ask_where", step: "need", slots: { place: "police" }, not: ["dest_short"] },
    { say: "How do I get to the Harbor Pharmacy?", intent: "ask_where", step: "cafe", slots: { place: "pharmacy" }, not: ["dest_short"] },
    { say: "Sunny Cup café, please", intent: "dest_short", step: "cafe", slots: { place: "sunny_cup" } },
    { say: "Left, right?", intent: "confirm" },
    { say: "Right?", intent: "yn:yes", step: "confirm" },
    { say: "I don't want to go to the museum", intent: "dest_neg", not: ["ask_where"] },
    { say: "Not the museum, the café", intent: "dest_correction" },
    // checking understanding
    { say: "So I go straight and turn left at the bank?", intent: "confirm" },
    { say: "Right out the door, two blocks, then left at the bank?", intent: "confirm" },
    { say: "Left at the bank?", intent: "confirm" },
    { say: "Right out the door?", intent: "confirm" },
    { say: "So it's not on the left?", intent: "confirm", not: ["ask_side"] },
    { say: "Two blocks?", intent: "confirm" },
    { say: "So it's across from the post office, right?", intent: "confirm" },
    { say: "Is it on the right or on the left?", intent: "ask_side" },
    { say: "How many blocks?", intent: "ask_blocks" },
    { say: "Do you mean the big one?", intent: "ask_which_one" },
    { say: "Is it far?", intent: "ask_far" },
    { say: "Sorry, turn where?", intent: "ask_turn_where" },
    { say: "Left or right at the bank?", intent: "ask_which_way" },
    { say: "Did I get that right?", intent: "did_i" },
    { say: "Could you show me on the map?", intent: "show_map" },
    { say: "Yes", intent: "yn:yes", step: "confirm" },
    { say: "I think so", intent: "understood", step: "confirm" },
    { say: "Not really", intent: "yn:no", step: "confirm" },
    { say: "I'm lost", intent: "lost", step: "confirm" },
    // clarification
    { say: "Sorry, could you say that again?", intent: "g_repeat" },
    { say: "Pardon?", intent: "g_repeat" },
    { say: "Could you speak more slowly, please?", intent: "g_slower" },
    { say: "Sorry, could you say that again more slowly?", intent: "say_again_slowly" },
    { say: "Could you repeat it again, slowly?", intent: "say_again_slowly" },
    { say: "So I go left to Town Square and turn right there?", intent: "confirm" },
    { say: "Okay, I understand now.", intent: "understood", step: "confirm" },
    { say: "Could you speak up, please?", intent: "louder" },
    { say: "How do you spell that?", intent: "g_spell" },
    { say: "How do you spell the street?", intent: "spell_q" },
    { say: "Could you write it down, please?", intent: "g_write" },
    { say: "What does crosswalk mean?", intent: "word_q", slots: { word: "crosswalk" } },
    { say: "What's a courthouse?", intent: "word_q", slots: { word: "courthouse" } },
    { say: "What does 'hang a right' mean?", intent: "word_q", slots: { word: "hang" } },
    { say: "I'm still learning English", intent: "g_learning" },
    { say: "Thanks for your patience!", intent: "thanks_patience" },
    // information
    { say: "What time do you close?", intent: "ask_hours" },
    { say: "When does the museum open?", intent: "ask_place_hours", slots: { place: "museum" } },
    { say: "What's going on this week?", intent: "ask_events" },
    { say: "Where can I buy a bus pass?", intent: "ask_buspass" },
    { say: "Is there Wi-Fi here?", intent: "ask_wifi" },
    { say: "Where's the restroom?", intent: "ask_restroom" },
    { say: "Where is the toilet?", intent: "ask_restroom" },
    { say: "What do you recommend seeing?", intent: "ask_recommend" },
    { say: "Where can I get something to eat?", intent: "ask_food" },
    { say: "Where's the town centre?", intent: "ask_downtown" },
    { say: "That's all, thanks", intent: "more_no", step: "more" },
    { say: "I'm all set, thanks", intent: "more_no", step: "more" },
    { say: "Good morning! I just arrived", intent: "just_arrived" },
    { say: "Do you speak Lithuanian?", intent: "ask_language" },
    { say: "Excuse me, is this the visitor center?", intent: "is_visitor_center" },
    { say: "Where can I get a coffee?", intent: "ask_coffee" },
    { say: "No, I lost my wallet", intent: "lost_item" },
    { say: "Is the post office next to it?", intent: "confirm" },
    { say: "Then I turn left on Oak Avenue?", intent: "confirm" },
    { say: "Where is the nearest pharmacy?", intent: "ask_where", slots: { place: "pharmacy" } },
    { say: "I want to see the museum", intent: "ask_where", slots: { place: "museum" } },
    { say: "I'm not going to the museum", intent: "dest_neg", not: ["ask_where", "dest_short"] },
    { say: "We're on holiday", intent: "just_arrived" },
    // more ways to say it (dev corpus tests/corpus/s62-visitor-center.json)
    { say: "Can I take a map?", intent: "ask_map" },
    { say: "How can I go to the coffee shop?", intent: "ask_where", slots: { place: "sunny_cup" } },
    { say: "Where I can find a pharmacy?", intent: "ask_where", slots: { place: "pharmacy" } },
    { say: "I search the post office", intent: "ask_where", slots: { place: "post_office" } },
    { say: "Tell me the way to the museum, please", intent: "ask_where", slots: { place: "museum" } },
    { say: "I'm a tourist", intent: "just_arrived" },
    { say: "Sorry, what?", intent: "g_repeat", step: "confirm" },
    { say: "Can you speak more slow?", intent: "say_again_slowly" },
    { say: "Too fast for me!", intent: "say_again_slowly" },
    { say: "I didn't understand anything", intent: "lost", step: "confirm" },
    { say: "Where I must turn left?", intent: "ask_turn_where", step: "confirm" },
    { say: "How many blocks I need to walk?", intent: "ask_blocks", step: "confirm" },
    { say: "At the bank I turn left?", intent: "confirm", slots: { route: { piece: { lm: "bank", dir: "left" } } } },
    { say: "What means crosswalk?", intent: "word_q", slots: { word: "crosswalk" } },
    { say: "Everything is clear, thank you", intent: "understood", step: "confirm" },
    { say: "Did I understand right?", intent: "did_i", step: "confirm" },
    { say: "Nothing more, thanks", intent: "more_no", step: "more" },
    { say: "I'm okay, thank you", intent: "more_no", step: "more" },
    { say: "No thanks, I have Google Maps on my phone", intent: "map_no", step: "map" },
    { say: "Sure, I'll take one", intent: "accept_ctx", step: "map" },
    { say: "No, I don't need it", intent: "decline_ctx", step: "map" },
    { say: "You were very helpful", intent: "thanks_help" },
    { say: "Is there some concert this weekend?", intent: "ask_events" },
    { say: "Where can I buy a ticket for the bus?", intent: "ask_buspass" },
    // meaning kept: negations never become the positive
    { say: "I don't understand everything", intent: "lost", step: "confirm", not: ["understood"] },
    { say: "I don't like coffee", intent: "no_coffee", not: ["ask_coffee"] },
    { say: "I don't have a map", intent: "none", step: "map" },
    { say: "I can't find it", intent: "none", step: "confirm" },
    // more ways (played paths, 25 Sep 2026)
    { say: "Hello, I need some help.", intent: "need_help" },
    { say: "Can you help me?", intent: "need_help" },
    { say: "Can you help me? Where is the museum?", intent: "ask_where", not: ["need_help"] },
    { say: "I need information about the town.", intent: "ask_brochure" },
    { say: "More or less.", intent: "lost", step: "confirm" },
    { say: "Not completely.", intent: "lost", step: "confirm", not: ["understood"] },
    { say: "Sorry, I didn't understand.", intent: "didnt_understand", step: "confirm", not: ["understood"] },
    { say: "Sorry, I don't understand.", intent: "g_dont_understand", step: "confirm" },
    // not understood
    { say: "banana left museum yesterday", intent: "none" },
    { say: "My brother likes the bank", intent: "none" },
    { say: "I don't need help", intent: "none" },
  ],

  sims: [
    { name: "map first, café, repeat twice, then check", turns: ["Hi! Could I have a map, please?", "How do I get to Sunny Cup?", "Sorry, could you say that again?", "Sorry, could you say that again?", "So I turn right, go two blocks, and turn left at the bank?", "No, that's all. Thank you!"], expect: { complete: true }, auto: AUTO },
    { name: "museum first with questions and a quiz, then the café", turns: ["Excuse me, where's the museum?", "Is it far?", "Do you mean the big one?", "Yes, I think so", "Left", "Yes, please", "Sure, thanks!", "Could you speak more slowly, please?", "Left at the bank?", "Thanks for your patience!"], expect: { complete: true }, auto: AUTO },
    { name: "wrong check gets corrected, a word, write it down, no café", turns: ["Hello!", "I'm looking for the post office", "What does crosswalk mean?", "Could you write it down?", "So I turn right at the bank?", "Okay, got it", "Yes, please", "No, thanks", "That's all, thanks"], expect: { complete: true }, auto: AUTO },
    // "Sure, thanks!" takes the map, "Yes, please" the café offer; "Bye!" answers "Anything else?" (pinned on)
    { name: "side questions and still learning", turns: ["What's the Wi-Fi password?", "How do you spell that?", "I'm still learning English", "Where can I buy a bus pass?", "Yes, please", "Here you go", "The lighthouse, please", "How many blocks?", "Sure, thanks!", "Yes, please", "So I turn right, go two blocks, and turn left at the bank?", "Bye!"], expect: { complete: true }, auto: AUTO,
      setup: (s) => { s.askMore = true; } },
    // "I'm just looking around" also answers the opening map question on the seeds that start with it, so the map comes later
    { name: "just looking: the café offer, say it again slowly", turns: ["Hi! I'm just looking around.", "Sure, thanks!", "Sorry, could you say that again more slowly?", "Left at the bank?", "Yes, please", "That's all, thanks"], expect: { complete: true }, auto: AUTO_OWN_OPENING },
  ],
};

export default visitorCenter;
