// Song 66 "Keep the Change": taking a taxi in Maple Harbor. Vinnie is a chatty driver who sings
// along with the radio. The learner says where to go (any place in town, a vague place gets a
// clarifying question), may ask him to put the bag in the trunk, asks about the price and the time,
// handles the radio / window / AC, tells him where to stop, pays by card or cash (tip, change,
// "Keep the change", receipt). Small talk about where the learner is from (basketball!).
// World event: after payment, c.event("taxi-ride", { to: <locationId> }) — taxis are fast travel.
// Twists (visits ≥ 1): a rideshare mix-up ("Are you waiting for a ride to the airport?") and
// heavy traffic with a detour.

import type { Ctx, EntityDef, Pending, Segment, SituationDef } from "../types";
import { ent, t } from "../dsl";

// ---------------------------------------------------------------------------
// Destinations (id, English units, Lithuanian forms, gender) with location id, meter fare (cents)
// and minutes from the taxi stand.

// `art` "the" makes {X.np} render "the museum" in English (article unit "—" in the gloss line) while the
// natural Lithuanian sentence stays clean ("į muziejų"); "" = a proper name without an article.
const D = (id: string, en: string, lt: string, g: "m" | "f", loc: string, fare: number, min: number, chip: string, forms: string[] = [], art: "the" | "" = "") =>
  ent(id, en, lt, g, { chip, art: art as any, forms: [...forms, ...(art ? ["the " + en.split(" | ").join(" ").toLowerCase()] : [])], attrs: { loc, fare, min } });

const DESTS: EntityDef[] = [
  D("hotel", "Harborview | Hotel", "„Harborview“ | viešbutis/viešbučio/viešbučiui/viešbutį/viešbučiu/viešbutyje", "m", "hotel", 2450, 15, "„Harborview“ viešbutis",
    ["harborview", "harbor view hotel", "harbor view", "the harborview", "the harbor view hotel"], "the"),
  D("station", "Union | Station", "„Union“ | stotis/stoties/stočiai/stotį/stotimi/stotyje", "f", "station", 1850, 10, "„Union“ stotis",
    ["the union station", "train station", "the train station", "bus station", "the bus station", "railway station", "the railway station"]),
  D("museum", "museum", "muziejus/muziejaus/muziejui/muziejų/muziejumi/muziejuje", "m", "museum", 2175, 15, "muziejus",
    ["art museum", "the art museum", "museum of art", "the museum of art", "maple harbor museum of art"], "the"),
  D("square", "Town | Square", "Miesto | aikštė/aikštės/aikštei/aikštę/aikšte/aikštėje", "f", "town-square", 2050, 15, "Miesto aikštė",
    ["the town square", "the square", "the farmers market", "farmers market", "the market", "the farmer s market", "the main square", "main square", "the central square", "the city square", "town square"]),
  D("sunnycup", "Sunny Cup | Café", "„Sunny Cup“ | kavinė/kavinės/kavinei/kavinę/kavine/kavinėje", "f", "sunny-cup", 2100, 15, "„Sunny Cup“ kavinė",
    ["sunny cup", "the sunny cup", "sunny cup cafe", "the sunny cup cafe", "sunny cup coffee"]),
  D("airport", "airport", "oro uostas/oro uosto/oro uostui/oro uostą/oro uostu/oro uoste", "m", "airport", 2850, 20, "oro uostas",
    ["maple harbor airport", "the maple harbor airport"], "the"),
  D("apartments", "Maple | Street | Apartments", "Maple | gatvės | daugiabutis/daugiabučio/daugiabučiui/daugiabutį/daugiabučiu/daugiabutyje", "m", "apartments", 1975, 15, "Maple gatvės daugiabutis",
    ["the maple street apartments", "maple street", "maple apartments"]),
  D("office", "Brightline | office", "„Brightline“ | biuras/biuro/biurui/biurą/biuru/biure", "m", "office", 2325, 20, "„Brightline“ biuras",
    ["brightline", "the brightline", "the brightline offices", "brightline offices"], "the"),
  D("pier", "Pier", "restoranas „The Pier“/restorano „The Pier“/restoranui „The Pier“/restoraną „The Pier“/restoranu „The Pier“/restorane „The Pier“", "m", "the-pier", 2600, 20, "restoranas „The Pier“",
    ["the pier restaurant", "pier restaurant"], "the"),
  D("visitor", "Visitor | Center", "lankytojų | centras/centro/centrui/centrą/centru/centre", "m", "visitor-center", 2000, 15, "lankytojų centras",
    ["visitors center", "the visitors center", "visitor centre", "tourist information", "the tourist information", "tourist office"], "the"),
  D("trattoria", "Lucia's | Trattoria", "„Lucia's“ | restoranas/restorano/restoranui/restoraną/restoranu/restorane", "m", "trattoria", 2125, 15, "restoranas „Lucia's“",
    ["lucia's", "the trattoria", "the italian restaurant", "lucia's restaurant"]),
  D("bank", "Harbor | Bank", "„Harbor“ | bankas/banko/bankui/banką/banku/banke", "m", "bank", 2050, 15, "„Harbor“ bankas", ["the bank", "bank"]),
  D("post", "post | office", "pašto | skyrius/skyriaus/skyriui/skyrių/skyriumi/skyriuje", "m", "post-office", 2025, 15, "pašto skyrius", ["the post"], "the"),
  D("pharmacy", "Harbor | Pharmacy", "„Harbor“ | vaistinė/vaistinės/vaistinei/vaistinę/vaistine/vaistinėje", "f", "pharmacy", 2100, 15, "„Harbor“ vaistinė",
    ["the pharmacy", "pharmacy", "the drugstore", "drugstore"]),
  D("police", "police | station", "policijos | nuovada/nuovados/nuovadai/nuovadą/nuovada/nuovadoje", "f", "police", 2000, 15, "policijos nuovada",
    ["the police"], "the"),
  D("carrental", "Harbor | Car | Rental", "„Harbor“ | automobilių | nuoma/nuomos/nuomai/nuomą/nuoma/nuomoje", "f", "car-rental", 1650, 10, "„Harbor“ automobilių nuoma",
    ["the car rental", "car rental", "the rental car place", "a car rental"]),
];

/** Vague places: Vinnie asks what exactly. */
// (English heads carry their determiner so that a bare "hotel" never splits off "the Harborview | hotel".)
const VAGUE: EntityDef[] = [
  ent("hotel_g", "the | hotel", "— | viešbutis/viešbučio/viešbučiui/viešbutį/viešbučiu/viešbutyje", "m", { forms: ["my hotel", "a hotel", "the hotels"], attrs: { vague: "hotel" } }),
  ent("station_g", "the | station", "— | stotis/stoties/stočiai/stotį/stotimi/stotyje", "f", { forms: ["a station"], attrs: { vague: "station" } }),
  ent("restaurant_g", "a | restaurant", "— | restoranas/restorano/restoranui/restoraną/restoranu/restorane", "m", { forms: ["the restaurant", "a good restaurant", "a nice restaurant"], attrs: { vague: "restaurant" } }),
  ent("downtown_g", "downtown", "centras/centro/centrui/centrą/centru/centre", "m", { forms: ["the city center", "the center", "the city centre", "the town center", "into town"], attrs: { vague: "downtown" } }),
  ent("beach_g", "the | beach", "— | paplūdimys/paplūdimio/paplūdimiui/paplūdimį/paplūdimiu/paplūdimyje", "m", { forms: ["the harbor", "the sea", "the ocean", "a beach"], attrs: { vague: "beach" } }),
];

const byId = (id: string) => DESTS.find((d) => d.id === id);
const L = (id: string, forms: string[], tags?: string[]) => ({ id, forms, tags });

const STREETS = [
  L("maple", ["maple street"], ["loc:apartments"]), L("oak", ["oak avenue"], ["loc:bus-stop"]), L("main", ["main street"], ["loc:visitor-center"]),
  L("harbor", ["harbor road"], ["loc:the-pier"]), L("elm", ["elm street"], ["loc:apartments"]), L("ocean", ["ocean drive"], ["loc:the-pier"]),
];

const COUNTRIES = [
  L("lithuania", ["lithuania", "vilnius", "kaunas", "klaipeda", "vilnius lithuania"]), L("latvia", ["latvia", "riga"]), L("estonia", ["estonia"]),
  L("poland", ["poland"]), L("germany", ["germany"]), L("uk", ["england", "the uk", "britain", "the united kingdom", "london"]), L("ireland", ["ireland"]),
  L("norway", ["norway"]), L("sweden", ["sweden"]), L("finland", ["finland"]), L("ukraine", ["ukraine"]), L("spain", ["spain"]),
  L("italy", ["italy"]), L("france", ["france"]), L("europe", ["europe"]),
  L("baltics", ["the baltic states", "the baltics", "the baltic countries", "baltic states"]),
];

// ---------------------------------------------------------------------------
// Helpers

const TURN = new WeakMap<object, Record<string, any>>();
const turn = (c: Ctx) => { let x = TURN.get(c); if (!x) { x = {}; TURN.set(c, x); } return x; };
function once(c: Ctx, key: string, line: string, vars?: Record<string, any>) { const T = turn(c); if (T["said_" + key]) return; T["said_" + key] = true; c.say(line, vars); }
function ack(c: Ctx, p = 0.5, line = "ack") { const T = turn(c); if (T.acked) return; T.acked = true; if (c.chance(p)) c.say(line); }
const allTags = (v: any, seg?: Segment): string[] => {
  const out: string[] = [...(seg?.tags || [])];
  const walk = (o: any) => { if (!o || typeof o !== "object") return; if (Array.isArray(o)) { o.forEach(walk); return; } out.push(...(o.__tags || [])); for (const [k, x] of Object.entries(o)) if (k !== "__tags") walk(x); };
  walk(v);
  return out;
};

const ADDRESS_FARE = 2200;
const fare = (c: Ctx): number => byId(c.s.dest)?.attrs?.fare ?? ADDRESS_FARE;
const minutes = (c: Ctx): number => {
  const m = byId(c.s.dest)?.attrs?.min ?? 15;
  return c.s.traffic ? (m <= 15 ? 20 : 30) : m;
};
const estimate = (c: Ctx): number => Math.round(fare(c) / 500) * 500;

/** Set the destination; vague places get a clarifying pending question. */
function setDest(c: Ctx, id: string | undefined, vague?: string) {
  if (vague) { askVague(c, vague); return; }
  if (!id || !byId(id)) return;
  const changed = !!c.s.dest && c.s.dest !== id;
  c.s.dest = id;
  c.s.addr = undefined;
  if (c.s.rolling) { once(c, "dest", "change_ok", { X: id }); if (changed && c.s.arrived && !c.s.paid) { c.s.arrived = false; c.s.stopped = false; } return; }
  if (!changed) once(c, "dest", "dest_ok", { X: id });
  else once(c, "dest", "change_ok", { X: id });
}

function askVague(c: Ctx, vague: string) {
  const confirm = (id: string) => (cc: Ctx) => { setDest(cc, id); };
  const line = vague === "hotel" ? "which_hotel" : vague === "station" ? "which_station" : vague === "restaurant" ? "which_restaurant" : vague === "beach" ? "beach_pier" : "where_downtown";
  c.say(line);
  const target = vague === "hotel" ? "hotel" : vague === "station" ? "station" : vague === "beach" ? "pier" : undefined;
  c.expect({
    id: "vague", expects: ["dest", "dest_ctx"], hints: ["dest"],
    suggest: [{ lt: "Patikslinti, kur važiuoti", hint: "dest", options: vague === "restaurant" ? ["trattoria", "pier"] : ["hotel", "museum", "square", "sunnycup", "bank", "pharmacy"] }],
    on: {
      dest: (cc, sl, sg) => { taxi.handlers.dest(cc, sl, sg); },
      dest_ctx: (cc, sl, sg) => { taxi.handlers.dest_ctx(cc, sl, sg); },
    },
    yes: target ? confirm(target) : (cc) => { askVague(cc, vague); },
    no: (cc) => { cc.say("where_then"); },
    ask: (cc) => cc.say(line),
  });
}

function payDone(c: Ctx, method: string) {
  c.s.paid = true;
  c.s.method = method;
  c.event("pay", { method, amount: fare(c) });
}

/** "You need change?" after an overpayment in cash. */
function changePending(): Pending {
  const keep = (cc: Ctx) => { cc.s.tip = true; once(cc, "keep", "keep_thanks"); };
  return {
    id: "change", expects: ["keep_change", "need_change"], hints: ["change"],
    suggest: [{ lt: "Pasakyti, kad grąžos nereikia (arba paprašyti grąžos)", hint: "change" }],
    on: { keep_change: keep, need_change: (cc) => { cc.say("change_here"); } },
    yes: (cc) => { cc.say("change_here"); },
    no: keep,
    ask: (cc) => cc.say("need_change"),
  };
}

/** Card payment: tap, then an optional tip on the screen. */
function tipPending(): Pending {
  const done = (cc: Ctx) => { once(cc, "thx", "thanks_lot"); };
  return {
    id: "tip_screen", optional: true, expects: ["tip_add", "tip_q", "tip_no_ctx"], hints: ["tip"],
    suggest: [{ lt: "Pridėti arbatpinigių ekrane", hint: "tip" }],
    on: { tip_add: (cc) => { cc.s.tip = true; done(cc); }, g_ok: done, tip_q: (cc) => { cc.say("tip_answer"); cc.expect(tipPending()); }, tip_no_ctx: (cc) => { cc.say("no_problem"); } },
    yes: done, no: (cc) => { cc.say("no_problem"); },
  };
}

function askNext(c: Ctx) {
  for (const st of taxi.steps) {
    if (st.when && !st.when(c)) continue;
    if (st.done(c)) continue;
    c.ask(st.id);
    return true;
  }
  return false;
}

const omit = (o: Record<string, string>, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

// Answers the simulation gives when Vinnie asks an optional question.
const TX_AUTO: Record<string, string> = {
  dest: "To the Harborview Hotel, please.", ride_check: "No, I'm not.", vague: "The Harborview Hotel.", bag: "Yes, please.",
  talk: "I'm from Lithuania.", bball: "Yes, we love basketball!", first_time: "Yes, it's my first time here.",
  radio: "Sure, go ahead.", traffic: "Yes, that's fine.", stop: "Right here is fine.", pay: "Can I pay by card?",
  tip_screen: "Okay.", change: "Keep the change.", receipt: "No, thanks.",
};

// ---------------------------------------------------------------------------

export const taxi: SituationDef = {
  id: "s66-taxi",
  song: 66,
  songTitle: "Keep the Change",
  title: { en: "Keep the Change", lt: "Grąžos nereikia" },
  topic: { en: "Taking a taxi", lt: "Taksi" },
  chapter: 1,
  order: 3,
  location: "taxi-stand",
  npc: "vinnie",
  goal: "Pasakyk vairuotojui, kur važiuoti, kur sustoti, ir susimokėk (kainos gali paklausti).",
  intro: "Taksi stotelė. Prie tavęs sustoja geltonas taksi, o vairuotojas Vinnie dainuoja kartu su radiju. Pasakyk, kur nori nuvažiuoti – taksi nuveš tave į bet kurią miesto vietą.",
  entities: { dest: DESTS, vague: VAGUE },

  grammar: {
    macros: {
      the_radio: "(the radio | the music | it | the volume)",
      please_take: "(take me | drive me | bring me | get me)",
      // where exactly to stop: "over there, by the blue door", "across the street", "behind that car"
      stop_spot: "(here | right here | just here | over there | there | right there | at the corner | at the next corner | on the corner | the (entrance | main entrance | front door | door) | (by | at | near | next to) the [blue | red | green | white | big | main | front | first | next | hotel] (door | entrance | gate | sign | building | bus stop | light | traffic light | stairs | corner) | in front [of (the | this | that) (hotel | entrance | building | door | museum | cafe | bank | station | main entrance)] | across the street | on the (left | right) [side] | behind (that | this | the) (car | bus | truck | taxi) | (after | before) the (light | traffic light | corner | bus stop))",
      // small talk after "I'm from Lithuania": "a small country in Europe", "near Poland", "do you know it?"
      from_tail: "([it is] a small country [in europe | near poland | by the baltic sea | on the baltic sea] | (it is | that is) in (europe | northern europe | eastern europe | the north) | (near | next to) (poland | latvia | russia) | do you know (it | where it is) | in europe | in northern europe | in eastern europe)",
    },
    slots: {
      street: { lexicon: STREETS },
      country: { lexicon: COUNTRIES },
      place: { pattern: ["{dest}", "{vague}"] },
    },
  },

  intents: {
    dest: { patterns: [
      "to {place} #h:d_to", "(can | could | would) you @please_take to {place} #h:d_take", "@please_take to {place}",
      "i (need | have) to (go | get) to {place} #h:d_need", "i would like to go to {place}", "i want to go to {place}",
      "i am going to {place} #h:d_going", "we are going to {place}", "(can | could) we go to {place}", "{dest}",
      "(drop me off | let me out) at {place}", "the {dest}", "i am heading to {place}", "(going | heading) to {place}",
      "to {dest} (and | then) i am in a hurry #hurry",
      // more ways: "I have to be at the airport at 5", "Let's go to the Pier", "Drop me at Town Square"
      "i (have to | need to | must) be at {place} [(at | by) {time} | in {number} minutes]", "let us go to {place}",
      "(drop me | drop me off | let me out) at {place}", "[to] {place} (on | at) {street}", "(near | next to | close to) {place}",
      "(i am staying | my hotel is | i live) (at | in) {place} [[and] (can | could) you (take | drive | bring) me there]",
      "{place} do you know (it | the place | where it is)", "[no] i [just] need a (taxi | cab | ride) to {place}",
      "(@please_take | (can | could | would) you @please_take | to) to {place} (on | at) {street}",
    ] },
    dest_ctx: { patterns: ["{vague}", "(hotel #vg:hotel_g | station #vg:station_g | restaurant #vg:restaurant_g | center #vg:downtown_g | city center #vg:downtown_g | beach #vg:beach_g)"] },
    allow: { patterns: [
      "[sure | yes | yeah | okay] go ahead #h:r_go", "[sure | yes | yeah] why not #h:r_why", "[sure | yes | yeah | okay] (turn it up | louder | no problem)",
      "[sure | yes | yeah | okay] (that is | that sounds) (fine | good | okay | great) #h:r_fine",
      "[sure | yes | yeah | okay | of course] i do not mind", "[yes | sure] go for it", "[yes | yeah] (it is | that is) a (great | good | nice | cool) song",
      "[yes | yeah] i (like | love) (this | the | that) song [too]", "[of course | sure | yes] (it is | this is) your car",
      "[sure | yes | okay] (whatever | whichever) is (faster | quicker | better | best)", "[okay | yes | sure] if it is (faster | quicker | better)",
      "[sure | yes] you know (the city | the way | the roads | best) [better]", "(it is | that is) up to you", "(good | great) idea",
      "do whatever (you think is best | is faster | you want)", "(it is | that is) (okay | fine | no problem)",
      "[sure | yes | okay] [maybe] (a little | a bit) [louder]", "[sure | yes | okay] [a little | a bit] [but] not too loud",
      "[sure | yes] i (love | like) (music | this music | this station | loud music)", "[sure | yes | okay] (take | go) (the other | another | a different) (way | road | route | street)",
    ] },
    // declining the driver's offer (radio, detour, bag in the trunk): calls the step's "no"
    decline_ctx: { patterns: [
      "[no] (do) not [(turn it up | do that | take another way | go another way | take the other way | put it in the trunk)]",
      "[no] i would rather not", "[no] (better | rather) not", "[no] i (have | got) a headache", "[no] i am (tired | very tired | a bit tired | sleepy)",
      "[no] i (prefer | would prefer) (it quiet | quiet | silence | no music | the normal way | the usual way | this way | this road | the same road)",
      "[no] let us (stay on this road | take the usual way | take the normal way | go the normal way | stay on the (highway | main road))",
      "[no] i will keep it (with me | on my lap | here | in my hands)", "[no] [(it is | that is) (fine | okay)] i will (keep | hold | carry) it [with me | on my lap | here]", "[no] (it is | it is only | it is just) (small | a small bag | light | not heavy)",
      "[no] i can (keep | hold) it",
    ] },
    dest_address: { patterns: [
      "[(to | @please_take to)] {number} {street} #h:d_address", "[to] {street} [number] {number}", "@please_take to {street}", "[to] {street}",
    ] },
    // (no bare "to [the] {w:any}": with left-out words it would swallow any sentence starting with "the")
    dest_unknown: { patterns: ["(@please_take to | i need to go to | i am going to | i want to go to | can you take me to) [the] {w:any}"] },
    dest_fix: { patterns: [
      "[no] not {place} [(but | i said)] [to] {place2:place} #neg", "[no] i said {place}", "[no] not to {place} [to {place2:place}] #neg", "[no] not {place} #neg",
      "(actually | wait) (can we | could we | let us) go to {place} instead #h:d_change", "[actually] {place} instead",
      "(actually | wait) (can you | could you) take me to {place} instead",
      // after a leading "No,": "No, actually, to the Harborview Hotel." / "No, sorry, I meant the Pier."
      "(actually | wait | sorry) [@please_take] to {place} [instead]", "(actually | wait | sorry) {place} [instead]",
      "[sorry] (i meant | i mean) [to] {place}", "(can | could) we go to {place} instead", "(can | could) you take me to {place} instead",
    ] },
    ride_no: { patterns: ["[no] i am not [waiting for a ride] #h:rd_not", "[no] not the airport", "[no] i need a taxi", "[no] that is not me", "[no] wrong person",
      "[no] i did not (order | book | call | request) (a | the | any) (ride | uber | lyft | car | taxi)", "[no] not me", "[i think] you have the wrong (person | guy | passenger | name)",
      "[no] i am not waiting for (anyone | anybody | a car | an uber | a friend)"] },
    bag_trunk: { patterns: [
      "(could | can | would) you put my (bag | bags | suitcase | luggage) in the (trunk #h:b_trunk | boot #tip:uk_boot)",
      "(could | can) i put my (bag | suitcase | luggage) in the (trunk | boot #tip:uk_boot)", "(could | can) you help me with my (bag | bags | suitcase | luggage) #h:b_help",
      "(could | can) you open the (trunk | boot #tip:uk_boot)", "i have a (bag | suitcase | big bag | big suitcase)",
      "(could | can) you help me with (it | this | my bags | my bag | this bag)", "[yes] [thank you] it is [very | quite | a bit | pretty | really | so] heavy",
      "[and] there is (another | one more) (one | bag | suitcase)", "[yes] (the big one | the big bag | both [of them] | both bags | all of them | the suitcase)",
      "[please] be careful [it is fragile]", "careful it is fragile",
    ] },
    ask_price: { patterns: [
      "how much (will it | would it | is it going to) (be | cost) [to (get there | go there)] #h:e_much", "how much (is it | does it cost) [to go] [to {place}]",
      "how much to {place}", "what is the fare [to {place}]", "is it expensive", "(roughly | about) how much [will it be]", "how much is the ride",
      "(will it | does it | is it going to) cost more", "is it more expensive", "how much more", "how much [is it] [now]", "(how much | what) do i owe you",
    ] },
    ask_time: { patterns: [
      "how long (will it | does it | is it going to) take #h:e_long", "how long is the ride", "how many minutes", "how long to {place}",
      "is it far [from here] #h:e_far", "how far is it", "when will we (get there | arrive | be there)", "is it (much | a lot) longer",
    ] },
    ask_quicker: { patterns: [
      "is there a (quicker | faster | shorter) way #h:q_quicker", "(can | could) we take a shortcut", "do you know a shortcut",
      "i am in a (hurry | rush) #h:q_hurry", "(can | could) you (hurry | go faster | drive faster | step on it)", "i am late",
    ] },
    radio_up: { patterns: [
      "(could | can | would) you turn @the_radio up #h:c_up", "(could | can | would) you turn up @the_radio", "turn (it | the radio | the music) up",
      "(louder | a little louder | a bit louder)", "i love this song [turn it up]", "(can | could) you make it louder",
    ] },
    radio_down: { patterns: [
      "(could | can | would) you turn @the_radio down #h:c_down", "(could | can | would) you turn down @the_radio", "turn (it | the radio | the music) down",
      "(it is | the music is | the radio is) (a bit | a little | too | very) loud", "(quieter | a little quieter | a bit quieter)",
    ] },
    radio_off: { patterns: ["(could | can | would) you turn off @the_radio", "(could | can | would) you turn @the_radio off", "(could | can) you switch off the (radio | music)", "no music please"] },
    window: { patterns: [
      "(can | could | may) i open the window #h:c_window", "(could | can) you open the window", "do you mind if i open the window",
      "(can | could) you close the window", "(can | could) i close the window",
    ] },
    ac: { patterns: [
      "(could | can | would) you turn on the (ac | a c | air conditioning | air) #h:c_ac", "(could | can) you turn (up | on) the (ac | a c | air conditioning | air)",
      "it is (hot | warm | a bit hot | a little hot | really hot | very hot) [in here] #h:c_hot", "i am (hot | warm)",
    ] },
    heat: { patterns: ["(could | can | would) you turn (on | up) the heat", "it is (cold | a bit cold | a little cold | chilly) [in here]", "i am cold"] },
    stop: { patterns: [
      "(could | can | would) you stop (here | right here | at the corner | over there | by the door) #h:s_stop",
      "(could | can | would) you stop in front of (the | this | that) (hotel | entrance | building | door | museum | cafe | bank | station)",
      "(right here | here | just here) is (fine | good | great | perfect | okay) #h:s_here", "(stop | you can stop) [right] here", "just here [please]", "right here",
      "at the corner #h:s_corner", "in front of (the | this | that) (hotel | entrance | building | door | museum | cafe | bank | station) #h:s_front",
      "(you can | could you) (drop me off | let me out) (here | at the corner | in front | by the door) #h:s_drop", "(you can | could you) drop me here",
      "anywhere here is fine", "(by | at) the (door | entrance)", "here is (fine | good | great)", "this is fine",
      "@stop_spot [is (fine | good | great | perfect | okay)]", "(stop | you can stop | just stop) @stop_spot",
      "(is it possible to | can you | could you | would you) stop @stop_spot", "[just] (drop me | let me out | let me off) [off] @stop_spot",
      "anywhere [around here] is (fine | good | okay)", "you can park (here | there)",
      "[keep going | (a | a little | a bit) further] (it is | it is at | at | stop at) the next (building | house | door | corner | one | entrance | light)",
      "stop [stop] [@stop_spot]",
    ] },
    // "Not here, a bit further": the stop step's "no" (Vinnie asks where then)
    stop_no_ctx: { patterns: ["not (here | there | yet) [(a | a little | a bit) further]", "(a | a little | a bit) further", "(keep going | go a bit further | drive a little more | a little more)",
      "i do not want to stop here", "(please do not | do not) stop (here | yet)"] },
    pay_card: { patterns: [
      "(can | could) i pay (by | with) (card | credit card | debit card | my card) #h:p_card", "do you (take | accept) (cards | credit cards | card | visa)",
      "(by | with) card", "card", "can i tap my card", "(i will | let me) pay (by | with) card", "(can | could) i pay with (apple pay | my phone)",
      "(can | could) i pay (by | with) (visa | mastercard | amex | american express | credit | google pay)", "(visa | mastercard | amex | american express | apple pay | google pay)",
      "(can | could) i [just] tap [my card | my phone]", "[sorry] i do not have (cash | any cash | enough cash) [(can | could) i pay (by | with) card]",
      "[sorry] no cash [(only | just) (card | a card | my card)]",
    ] },
    pay_cash: { patterns: ["(i will | let me) pay (in | with) cash #h:p_cash", "(in | with) cash", "cash", "i will pay cash", "(can | could) i pay (in | with) cash",
      "[sorry] i do not have a (card | credit card | bank card) [(only | just) cash]", "[sorry] no card [(only | just) cash]"] },
    pay_amount: { patterns: ["here is {price} #h:p_heres", "here you go {price}", "here you are {price}", "{price} [here you go]", "i have {price}",
      "(do you have | have you got) change for [a] {price} [dollar bill | bill]", "i (only | just) have [a] {price} [dollar bill | bill]"] },
    here_you_go: { patterns: ["here you go #h:p_here", "here you are", "there you go", "here it is", "here"] },
    keep_change: { patterns: ["[no] keep the change #h:p_keep", "you can keep the change", "keep it", "no change [needed]", "i do not need (the | any) change", "[no] (it is | that is) (fine | okay) keep it",
      "[you can] keep the rest", "[the rest is] for you"] },
    need_change: { patterns: ["(can | could) i (have | get) (my | the) change", "[yes] i need (change | my change | the change)", "[yes] change please"] },
    tip_q: { patterns: ["how much should i tip #h:t_how", "is the tip included", "do people tip (here | in america | in the us)", "how much is the tip", "what is a normal tip",
      "how much is (normal | usual | typical | standard | common) [here | in america]", "what is (normal | usual | typical)"] },
    tip_add: { patterns: ["[sure] (i will | let me) (add | give you) a tip #h:t_add", "(i will add | i am adding | i added) [a] {number} percent [tip]", "{number} percent [tip] [is fine]", "(i will | let me) tip {number} percent",
      "(i will | let me) (add | give you) a (small | little | good | big | nice) tip", "is {number} percent (okay | enough | fine | good)"] },
    tip_no_ctx: { patterns: ["[sorry] no tip [this time]", "i (do not | will not) (tip | add a tip) [this time]", "[no] not this time", "(i will | i would like to) skip (it | the tip)"] },
    receipt: { patterns: ["(can | could | may) i (have | get) a receipt #h:p_receipt", "i need a receipt", "receipt please", "[yes] (a receipt | the receipt) please", "do you have a receipt",
      "[yes] i need (it | one | a receipt) for (work | my company | my job | business | my boss)", "(can | could) you (email | send | text) (it | the receipt) [to me]"] },
    no_receipt: { patterns: ["(i do not need | no need for) a receipt", "no receipt"] },
    talk_from: { patterns: [
      "i am from {country} #h:st_from", "(from | i come from) {country}", "{country}", "i live in {country}", "i am (lithuanian #lt | from lithuania)",
      "(i am | i come | we are | we come) from {country} [@from_tail]", "{country} [@from_tail]", "my country is {country}", "i was born in {country}",
      "[i am] from the baltic (states | countries) [from {country}]", "{country} but i am (lithuanian #lt | from lithuania)", "(i am | we are) (lithuanian #lt | from lithuania) [@from_tail]",
    ] },
    talk_first: { patterns: ["[yes] (it is | this is) my first time [here | in maple harbor] #h:st_first", "[yes] first time", "[no] i have been here before #h:st_before", "[no] i was here (before | last year)",
      "[yes] (it is | this is) my first (time | visit | trip) [here | in maple harbor | in america | in the us | in the usa | in the states]", "[yes] first (time | visit) [here | in america | in the us | in the usa | in the states]",
      "[no] [(it is | this is)] [my] (second | third) time [here | in maple harbor | in america | in the us]",
      "[no] i was here (last summer | last month | two years ago | many times | a few times)", "[yes] i (just | only) arrived [today | yesterday | this morning | an hour ago]",
      "[yes] i am here (on | for) (vacation | holiday | business | work | a conference | a visit)", "[no] i come here (every year | often | a lot | every summer)", "[no] i (live | work) here",
      "[no] i (lived | worked | studied) here (before | [for] (a year | two years | a few years | some time))"] },
    talk_bball: { patterns: [
      "[yes] we love basketball #h:st_bball", "[yes] basketball is (very | really | super) popular", "[yes] (it is | basketball is) our (second religion | national sport | favorite sport) #h:st_religion",
      "[yes] everybody (loves | plays) basketball", "[yes] i love basketball",
      "[yes] i (play | played | watch | like watching) basketball [too | a lot | every weekend | every day]",
      "[yes | right | of course] (sabonis | arvydas sabonis | domantas sabonis | jonas valanciunas | zydrunas ilgauskas | sarunas marciulionis)",
      "[yes] (it is | basketball is) (very | really | super | so) popular [in lithuania | there]",
    ] },
    bball_no_ctx: { patterns: [
      "[no | not really] i (prefer | like) (football | soccer | hockey | tennis | volleyball) [more]", "[no | not really] i do not (like | watch | play) basketball [much | really | very much]",
      "i am not (a fan | into basketball | into sports | a basketball fan)",
    ] },
    thanks_ride: { patterns: ["(thanks | thank you) for (the ride | the lift | driving me | driving) [have a (good | nice | great) (day | evening | night)]"] },
    talk_you: { patterns: ["(and | what about) you #h:st_you", "are you from (here | maple harbor)", "where are you from", "do you like (your job | driving)", "how long have you been driving"] },
    sing: { patterns: ["i (love | like) this song", "(great | nice | good) song", "you (sing | are singing) (well | great | really well)", "what song is this"] },
    wait_q: { patterns: ["(can | could) you wait (for me | a minute | for a minute | here)", "please wait [for me]"] },
  },

  lines: {
    greet: [
      t("Hi there! | Hop in! | Where to?", "Sveiki! | Lipkite! | Kur važiuojame?", "Sveiki! Lipkite! Kur važiuojame?"),
      t("Taxi? | Hop in! | Where | are | you | headed?", "Taksi? | Lipkite! | Kur | — | jūs | keliaujate?", "Taksi? Lipkite! Kur keliaujate?",
        { flags: { 3: "“are” (+ headed): no separate word; the present keliaujate carries it." } }),
      t("Hey! | Where | can | I | take | you?", "Sveiki! | Kur | galiu | aš | nuvežti | jus?", "Sveiki! Kur jus nuvežti?"),
    ],
    ask_dest: [
      t("So, | where to?", "Tai | kur važiuojame?", "Tai kur važiuojame?"),
      t("Where | are | you | headed?", "Kur | — | jūs | keliaujate?", "Kur keliaujate?", { flags: { 1: "“are” (+ headed): no separate word; the present keliaujate carries it." } }),
    ],
    ride_check: [t("Hi! | Are | you | waiting | for | a | ride | to | the | airport?", "Sveiki! | Ar | jūs | laukiate | — | — | pavėžėjimo | į | — | oro uostą?", "Sveiki! Ar laukiate pavėžėjimo į oro uostą?",
      { flags: { 1: "Progressive “Are” in a question = the particle ar; laukiate carries the tense (linked to “waiting”).", 4: "“for”: no separate word; laukti takes the genitive (pavėžėjimo)." } })],
    ride_mistake: [t("Oh, | sorry! | My | mistake. | Where | are | you | headed?", "O, | atsiprašau! | Mano | klaida. | Kur | — | jūs | keliaujate?", "O, atsiprašau, suklydau! Kur keliaujate?",
      { flags: { 5: "“are” (+ headed): no separate word; the present keliaujate carries it." } })],
    ride_yes: [t("Great, | hop in!", "Puiku, | lipkite!", "Puiku, lipkite!")],
    ride_oops: [t("Oh, | my | mistake!", "O, | mano | klaida!", "O, suklydau!")],
    dest_ok: [
      t("Sure thing! | Heading | to | {X.np}.", "Žinoma! | Važiuojame | į | {X.np:acc}.", "Žinoma! Važiuojame į {X.np:acc}."),
      t("You got it. | Next | stop: | {X.np}!", "Supratau. | Kita | stotelė: | {X.np:nom}!", "Supratau! Kita stotelė – {X.np:nom}!"),
      t("Alright, | {X.np}. | Buckle up!", "Gerai, | {X.np:nom}. | Prisisekite!", "Gerai, {X.np:nom}. Prisisekite!"),
    ],
    change_ok: [t("No | problem, | we'll go | to | {X.np} | instead.", "Jokių | problemų, | važiuosime | į | {X.np:acc} | vietoj to.", "Jokių problemų, važiuosime į {X.np:acc}.")],
    which_hotel: [t("The | Harborview?", "— | „Harborview“?", "Į „Harborview“?")],
    which_station: [t("Union | Station?", "„Union“ | stotį?", "Į „Union“ stotį?")],
    which_restaurant: [t("Which one? | Lucia's | or | the | Pier?", "Kurį? | „Lucia's“ | ar | — | „The Pier“?", "Kurį? „Lucia's“ ar „The Pier“?")],
    where_downtown: [t("Sure. | Where | downtown?", "Žinoma. | Kur | centre?", "Žinoma. Kur centre?")],
    beach_pier: [t("I | can | take | you | to | the | Pier. | It's | right | by | the | beach.", "Aš | galiu | nuvežti | jus | į | — | „The Pier“. | Jis yra | visai | prie | — | paplūdimio.", "Galiu nuvežti jus į „The Pier“ – jis visai prie paplūdimio.")],
    where_then: [t("Okay, | so | where | to?", "Gerai, | tai | kur | važiuojame?", "Gerai, tai kur važiuojame?")],
    unknown_place: [
      t("Hmm, | I | don't know | that | place. | Do | you | have | an | address?", "Hmm, | aš | nežinau | tos | vietos. | Ar | jūs | turite | — | adresą?", "Hmm, tokios vietos nežinau. Ar turite adresą?"),
    ],
    address_ok: [t("Got it. | Let's go!", "Supratau. | Važiuojam!", "Supratau. Važiuojam!")],
    // Bag
    offer_bag: [
      t("Is | that | your | bag? | Want | me | to put | it | in | the | trunk?", "Ar | tai | jūsų | krepšys? | Norite, kad | aš | įdėčiau | jį | į | — | bagažinę?", "Tai jūsų krepšys? Įdėti jį į bagažinę?",
        { flags: { 0: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }),
      t("Would | you | like | me | to put | your | bag | in | the | trunk?", "Ar | jūs | norėtumėte, kad | aš | įdėčiau | jūsų | krepšį | į | — | bagažinę?", "Ar įdėti jūsų krepšį į bagažinę?",
        { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte (linked to “like”)." } }),
    ],
    bag_ok: [
      t("Sure thing!", "Žinoma!", "Žinoma!"),
      t("No | problem, | I | got | it.", "Jokių | problemų, | aš | pasirūpinsiu | juo.", "Jokių problemų, pasirūpinsiu."),
    ],
    no_problem: [t("No | problem.", "Jokių | problemų.", "Jokių problemų.")],
    bag_ok_too: [t("And | I'll put | your | bag | in | the | trunk.", "Ir | įdėsiu | jūsų | krepšį | į | — | bagažinę.", "O krepšį įdėsiu į bagažinę.")],
    // Estimates
    est_price: [
      t("About | {$price}, | give or take.", "Apie | {$price}, | plius minus.", "Apie {$price}, plius minus."),
      t("Probably | around | {$price}.", "Tikriausiai | apie | {$price}.", "Tikriausiai apie {$price}."),
    ],
    est_time: [
      t("About | {$num} | minutes, | depending | on | traffic.", "Apie | {$num} | minučių, | priklausomai | nuo | eismo.", "Apie {$num} minučių, priklausomai nuo eismo."),
      t("Maybe | {$num} | minutes.", "Gal | {$num} | minučių.", "Gal {$num} minučių."),
    ],
    est_far: [t("Not | too | far.", "Ne | per | toli.", "Nelabai toli.")],
    fare_now: [t("It's | {$price} | on | the | meter.", "Tai yra | {$price} | — | — | taksometre.", "Taksometre – {$price}.",
      { flags: { 2: "“on”: no separate word; the locative taksometre carries it." } })],
    // Ride
    lets_go: [
      t("Let's go!", "Važiuojam!", "Važiuojam!"),
      t("Okay, | here | we | go!", "Gerai, | štai | mes | važiuojam!", "Gerai, važiuojam!"),
    ],
    talk_from_q: [t("So, | where | are | you | from?", "Tai | iš kur | esate | jūs | —?", "Tai iš kur jūs?", { flags: { 4: "Stranded “from”: no separate word here; iš kur carries it." } })],
    talk_first_q: [t("First | time | here?", "Pirmas | kartas | čia?", "Pirmą kartą čia?")],
    lithuania: [t("Lithuania! | Cool. | Basketball | country, | right?", "Lietuva! | Šaunu. | Krepšinio | šalis, | tiesa?", "Lietuva! Šaunu. Krepšinio šalis, tiesa?")],
    other_country: [t("Oh, | nice! | Welcome | to | town!", "O, | puiku! | Sveiki atvykę | į | miestą!", "O, puiku! Sveiki atvykę į miestą!")],
    sabonis: [t("I | knew | it! | Sabonis | was | amazing!", "Aš | žinojau | tai! | Sabonis | buvo | nuostabus!", "Taip ir žinojau! Sabonis buvo nuostabus!")],
    ha_ok: [t("Ha! | Okay!", "Cha! | Gerai!", "Cha, gerai!")],
    you_love_it: [t("Welcome! | You'll love | it | here.", "Sveiki atvykę! | Jums patiks | — | čia.", "Sveiki atvykę! Jums čia patiks.",
      { flags: { 2: "Dummy “it”: no separate word; patiks (you will like) absorbs it." } })],
    welcome_back: [t("Welcome | back!", "Sveiki | sugrįžę!", "Sveiki sugrįžę!")],
    vinnie_from: [t("Me? | Born | and | raised | right | here!", "Aš? | Gimęs | ir | užaugęs | būtent | čia!", "Aš? Čia gimiau ir užaugau!")],
    vinnie_job: [t("I | love | it. | Every | day | is | different!", "Aš | dievinu | tai. | Kiekviena | diena | yra | kitokia!", "Man tai labai patinka. Kiekviena diena kitokia!")],
    radio_ask: [
      t("Oh, | I | love | this | song! | Can | I | turn | it | up?", "O, | aš | dievinu | šią | dainą! | Ar galiu | aš | pagarsinti | ją | —?", "O, dievinu šią dainą! Ar galiu pagarsinti?",
        { flags: { 9: "Discontinuous “turn … up”: the prefix pa- of pagarsinti carries “up”." } }),
    ],
    radio_ask_again: [t("So, | can | I | turn | it | up?", "Tai | ar galiu | aš | pagarsinti | ją | —?", "Tai ar galiu pagarsinti?",
      { flags: { 5: "Discontinuous “turn … up”: the prefix pa- of pagarsinti carries “up”." } })],
    traffic_ask_again: [t("So, | is | it | okay | if | I | take | a | different | way?", "Tai | ar | — | gerai, | jei | aš | važiuosiu | — | kitu | keliu?", "Tai ar galiu važiuoti kitu keliu?",
      { flags: { 2: "Dummy “it”: no separate word in Lithuanian." } })],
    radio_up_ok: [t("Awesome!", "Puiku!", "Puiku!"), t("You got it!", "Bus padaryta!", "Bus padaryta!")],
    radio_quiet: [t("No | problem, | I'll keep | it | low.", "Jokių | problemų, | paliksiu | jį | tylų.", "Jokių problemų, paliksiu tyliai.")],
    radio_down_ok: [t("Oh, | sorry! | Sure.", "O, | atsiprašau! | Žinoma.", "O, atsiprašau! Žinoma.")],
    radio_off_ok: [t("Sure, | no | problem.", "Žinoma, | jokių | problemų.", "Žinoma, jokių problemų.")],
    sing_along: [t("Thanks! | I | sing | along | to | everything.", "Ačiū! | Aš | dainuoju | kartu | su | viskuo.", "Ačiū! Aš dainuoju kartu su visomis dainomis.")],
    window_ok: [t("Sure, | go ahead!", "Žinoma, | prašom!", "Žinoma, prašom!")],
    better: [t("Sure! | Is | that | better?", "Žinoma! | Ar | taip | geriau?", "Žinoma! Ar taip geriau?", { flags: { 1: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } })],
    shortcut: [t("I | know | a | shortcut. | Hold on!", "Aš | žinau | — | trumpesnį kelią. | Laikykitės!", "Žinau trumpesnį kelią. Laikykitės!")],
    traffic_look: [t("Ugh, | look | at | this | traffic.", "Ech, | pažiūrėkite | į | šį | kamštį.", "Ech, pažiūrėkite, koks kamštis.")],
    traffic_ask: [
      t("Is | it | okay | if | I | take | a | different | way? | It's | a | little | longer, | but | faster.", "Ar | — | gerai, | jei | aš | važiuosiu | — | kitu | keliu? | Jis yra | — | truputį | ilgesnis, | bet | greitesnis.",
        "Ar galiu važiuoti kitu keliu? Jis truputį ilgesnis, bet greitesnis.", { flags: { 1: "Dummy “it”: no separate word in Lithuanian." } }),
    ],
    traffic_yes: [t("Great. | We'll take | Harbor | Road.", "Puiku. | Važiuosime | Harbor | keliu.", "Puiku. Važiuosime Harbor keliu.")],
    traffic_no: [t("Okay, | we'll stay | on | Main | Street.", "Gerai, | liksime | — | Main | gatvėje.", "Gerai, liksime Main gatvėje.", { flags: { 2: "“on”: no separate word; the locative gatvėje carries it." } })],
    // Arrival and stopping
    arrive: [
      t("Here we are: | {X.np}!", "Štai ir atvykome: | {X.np:nom}!", "Štai ir atvykome – {X.np:nom}!"),
      t("We're | here: | {X.np}!", "Mes esame | čia: | {X.np:nom}!", "Atvykome – {X.np:nom}!"),
    ],
    ask_stop: [
      t("Where | do | you | want | me | to stop?", "Kur | — | jūs | norite, kad | aš | sustočiau?", "Kur sustoti?", { flags: { 1: "Question “do” has no Lithuanian word (linked to “want”)." } }),
      t("Is | right here | okay?", "Ar | čia pat | gerai?", "Ar čia tiks?", { flags: { 0: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }),
    ],
    stop_ok: [t("Sure thing.", "Žinoma.", "Žinoma."), t("You got it.", "Bus padaryta.", "Bus padaryta."), t("No | problem.", "Jokių | problemų.", "Jokių problemų.")],
    stop_early: [t("Here? | Sure.", "Čia? | Žinoma.", "Čia? Žinoma.")],
    where_stop: [t("Okay, | where | do | you | want | me | to stop?", "Gerai, | kur | — | jūs | norite, kad | aš | sustočiau?", "Gerai, kur sustoti?", { flags: { 2: "Question “do” has no Lithuanian word (linked to “want”)." } })],
    card_later: [t("Sure, | you | can | pay | when | we | arrive.", "Žinoma, | jūs | galėsite | sumokėti, | kai | mes | atvyksime.", "Žinoma, susimokėsite, kai atvyksime.")],
    // Paying
    fare: [
      t("That'll be | {$price}.", "Tai bus | {$price}.", "Iš viso {$price}."),
      t("So | that's | {$price}.", "Taigi | tai yra | {$price}.", "Taigi {$price}."),
    ],
    card_ok: [
      t("Sure, | just | tap | your | card | here.", "Žinoma, | tiesiog | pridėkite | savo | kortelę | čia.", "Žinoma, tiesiog pridėkite kortelę čia."),
    ],
    tip_screen: [t("You | can | add | a | tip | on | the | screen.", "Jūs | galite | pridėti | — | arbatpinigių | — | — | ekrane.", "Arbatpinigių galite pridėti ekrane.",
      { flags: { 4: "Partitive: the genitive arbatpinigių carries “a tip”.", 5: "“on”: no separate word; the locative ekrane carries it." } })],
    cash_ok: [t("Cash | works!", "Grynieji | tinka!", "Grynaisiais – puiku!")],
    thanks_lot: [t("Thanks | a lot!", "Ačiū | labai!", "Labai ačiū!"), t("Thank | you | so much!", "Dėkoju | jums | labai!", "Labai ačiū!")],
    perfect_thanks: [t("Perfect, | thanks!", "Puiku, | ačiū!", "Puiku, ačiū!")],
    need_change: [t("You | need | change?", "Jums | reikia | grąžos?", "Grąžos reikia?")],
    change_here: [t("Here's | your | change.", "Štai | jūsų | grąža.", "Štai jūsų grąža.")],
    keep_thanks: [
      t("Hey, | thanks! | That's | very | kind | of you.", "Ei, | ačiū! | Tai yra | labai | malonu | iš jūsų pusės.", "Ei, ačiū! Labai malonu."),
      t("Thanks | a lot, | my | friend!", "Ačiū | labai, | mano | drauge!", "Labai ačiū, drauge!"),
    ],
    short: [t("Hmm, | that's | a | little | short. | It's | {$price}.", "Hmm, | tai yra | — | truputį | per mažai. | Tai yra | {$price}.", "Hmm, truputį trūksta. Iš viso {$price}.")],
    tip_answer: [
      t("That's | up to | you! | Most | people | give | 15 | to | 20 | percent.", "Tai priklauso | nuo | jūsų! | Dauguma | žmonių | duoda | 15 | iki | 20 | procentų.",
        "Tai priklauso nuo jūsų! Dauguma duoda 15–20 procentų.", { say: "That's up to you! Most people give fifteen to twenty percent." }),
    ],
    ask_receipt: [t("Need | a | receipt?", "Reikia | — | čekio?", "Čekio reikia?")],
    receipt_here: [t("Sure thing. | Here's | your | receipt.", "Žinoma. | Štai | jūsų | čekis.", "Žinoma. Štai jūsų čekis.")],
    already_here: [t("We're | already | here!", "Mes esame | jau | čia!", "Mes jau atvažiavome!")],
    wait_ok: [t("Sure, | I'll wait | right | here.", "Žinoma, | palauksiu | būtent | čia.", "Žinoma, palauksiu čia.")],
    bag_out: [t("Let | me | get | your | bag | from | the | trunk.", "Leiskite | man | paimti | jūsų | krepšį | iš | — | bagažinės.", "Tuoj paimsiu jūsų krepšį iš bagažinės.")],
    bye: [
      t("Enjoy | your | stay!", "Mėgaukitės | savo | viešnage!", "Malonios viešnagės!"),
      t("Take care!", "Laikykitės!", "Laikykitės!"),
      t("Have | a | great | day!", "Linkiu | — | puikios | dienos!", "Puikios dienos!"),
    ],
    you_too: [t("You | too!", "Jums | taip pat!", "Jums taip pat!")],
    closing_thanks: [
      t("You're welcome! | Take care!", "Prašom! | Laikykitės!", "Prašom! Laikykitės!"),
      t("Anytime! | Bye!", "Visada prašom! | Iki!", "Visada prašom! Iki!"),
    ],
    ack: [t("Okay!", "Gerai!", "Gerai!"), t("Sure.", "Žinoma.", "Žinoma.")],
  },

  domains: {
    price: () => {
      const s = new Set<number>([1500, 2000, 2500, 3000]);
      for (const d of DESTS) s.add(d.attrs!.fare);
      s.add(ADDRESS_FARE);
      return [...s];
    },
    num: () => [10, 15, 20, 30],
  },

  hints: {
    dest: {
      lt: "Pasakyti, kur važiuoti", slot: "dest", examples: ["hotel", "museum", "station", "airport", "sunnycup"],
      items: [
        { id: "d_to", s: t("To | {X.np}, | please.", "Į | {X.np:acc}, | prašau.", "Į {X.np:acc}, prašau.") },
        { id: "d_take", s: t("Could | you | take | me | to | {X.np}?", "Ar galėtumėte | jūs | nuvežti | mane | į | {X.np:acc}?", "Ar galėtumėte nuvežti mane į {X.np:acc}?") },
        { id: "d_need", s: t("I | need | to go | to | {X.np}.", "Man | reikia | nuvažiuoti | į | {X.np:acc}.", "Man reikia nuvažiuoti į {X.np:acc}.") },
        { id: "d_going", s: t("I'm going | to | {X.np}.", "Vykstu | į | {X.np:acc}.", "Vykstu į {X.np:acc}.") },
        { id: "d_address", s: t("To | 25 | Oak | Avenue, | please.", "Į | 25 | Oak | alėją, | prašau.", "Į Oak alėją 25, prašau.", { say: "To twenty-five Oak Avenue, please." }) },
        { id: "d_change", s: t("Actually, | can | we | go | to | {X.np} | instead?", "Tiesą sakant, | ar galime | mes | važiuoti | į | {X.np:acc} | vietoj to?", "Tiesą sakant, gal galime važiuoti į {X.np:acc}?") },
      ],
    },
    bag: {
      lt: "Paprašyti įdėti krepšį",
      items: [
        { id: "b_trunk", s: t("Could | you | put | my | bag | in | the | trunk?", "Ar galėtumėte | jūs | įdėti | mano | krepšį | į | — | bagažinę?", "Ar galėtumėte įdėti mano krepšį į bagažinę?") },
        { id: "b_help", s: t("Could | you | help | me | with | my | suitcase?", "Ar galėtumėte | jūs | padėti | man | su | mano | lagaminu?", "Ar galėtumėte padėti su lagaminu?") },
      ],
    },
    ask: {
      lt: "Paklausti kainos ir laiko",
      items: [
        { id: "e_much", s: t("How much | will | it | be?", "Kiek | — | tai | kainuos?", "Kiek tai kainuos?", { flags: { 1: "“will”: no separate word; the future kainuos carries it." } }) },
        { id: "e_long", s: t("How long | will | it | take?", "Kiek laiko | — | tai | užtruks?", "Kiek laiko užtruks?", { flags: { 1: "“will”: no separate word; the future užtruks carries it." } }) },
        { id: "e_far", s: t("Is | it | far?", "Ar | tai | toli?", "Ar toli?", { flags: { 0: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }) },
        { id: "q_quicker", s: t("Is | there | a | quicker | way?", "Ar | yra | — | greitesnis | kelias?", "Ar yra greitesnis kelias?",
          { flags: { 0: "“Is” in the question = the particle ar; the existential yra is carried by “there”." } }) },
        { id: "q_hurry", s: t("I'm | in a hurry.", "Aš | skubu.", "Skubu.") },
      ],
    },
    // "It's a little longer, but faster."
    how_long: {
      lt: "Paklausti, kiek laiko užtruks",
      items: [
        { id: "e_long", s: t("How long | will | it | take?", "Kiek laiko | — | tai | užtruks?", "Kiek laiko užtruks?", { flags: { 1: "“will”: no separate word; the future užtruks carries it." } }) },
        { id: "e_far", s: t("Is | it | far?", "Ar | tai | toli?", "Ar toli?", { flags: { 0: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }) },
      ],
    },
    car: {
      lt: "Radijas, langas, kondicionierius",
      items: [
        { id: "c_down", s: t("Could | you | turn | the | music | down?", "Ar galėtumėte | jūs | patylinti | — | muziką | —?", "Ar galėtumėte patylinti muziką?",
          { flags: { 5: "Discontinuous “turn … down”: patylinti (make quieter) carries “down”." } }) },
        { id: "c_up", s: t("Could | you | turn | the | radio | up?", "Ar galėtumėte | jūs | pagarsinti | — | radiją | —?", "Ar galėtumėte pagarsinti radiją?",
          { flags: { 5: "Discontinuous “turn … up”: the prefix pa- of pagarsinti carries “up”." } }) },
        { id: "c_window", s: t("Can | I | open | the | window?", "Ar galiu | aš | atidaryti | — | langą?", "Ar galiu atidaryti langą?") },
        { id: "c_ac", s: t("Could | you | turn on | the | AC?", "Ar galėtumėte | jūs | įjungti | — | kondicionierių?", "Ar galėtumėte įjungti kondicionierių?") },
        { id: "c_hot", s: t("It's | a | bit | hot | in | here.", "Yra | — | truputį | karšta | — | čia.", "Čia truputį karšta.",
          { flags: { 0: "Dummy “It”: merged with the verb (It's → Yra).", 4: "“in” (in here): no separate word; čia carries the place." } }) },
      ],
    },
    stop: {
      lt: "Pasakyti, kur sustoti",
      items: [
        { id: "s_stop", s: t("Could | you | stop | here, | please?", "Ar galėtumėte | jūs | sustoti | čia, | prašau?", "Ar galėtumėte čia sustoti?") },
        { id: "s_here", s: t("Right here | is fine.", "Čia pat | tinka.", "Čia tiks.") },
        { id: "s_corner", s: t("At | the | corner, | please.", "Prie | — | kampo, | prašau.", "Prie kampo, prašau.") },
        { id: "s_front", s: t("In front of | the | hotel, | please.", "Priešais | — | viešbutį, | prašau.", "Priešais viešbutį, prašau.") },
        { id: "s_drop", s: t("You | can | drop | me | off | here.", "Jūs | galite | išleisti | mane | — | čia.", "Galite mane čia išleisti.",
          { flags: { 4: "Discontinuous “drop … off”: the prefix iš- of išleisti carries “off”." } }) },
      ],
    },
    pay: {
      lt: "Susimokėti",
      items: [
        { id: "p_card", s: t("Can | I | pay | by card?", "Ar galiu | aš | sumokėti | kortele?", "Ar galiu sumokėti kortele?") },
        { id: "p_cash", s: t("I'll pay | in cash.", "Sumokėsiu | grynaisiais.", "Sumokėsiu grynaisiais.") },
        { id: "p_heres", s: t("Here's | $30.", "Štai | 30 $.", "Štai 30 dolerių.", { say: "Here's thirty." }) },
        { id: "p_keep", s: t("Keep | the | change.", "Pasilikite | — | grąžą.", "Grąžos nereikia.") },
        { id: "p_receipt", s: t("Could | I | have | a | receipt?", "Ar galėčiau | aš | gauti | — | čekį?", "Ar galėčiau gauti čekį?") },
        { id: "t_how", s: t("How much | should | I | tip?", "Kiek | turėčiau | aš | duoti arbatpinigių?", "Kiek turėčiau duoti arbatpinigių?") },
        { id: "p_here", s: t("Here you go.", "Prašom.", "Prašom.") },
      ],
    },
    // "So, where are you from?"
    talk: {
      lt: "Pasakyti, iš kur esi",
      items: [
        { id: "st_from", s: t("I'm | from | Lithuania.", "Aš esu | iš | Lietuvos.", "Esu iš Lietuvos.") },
        { id: "st_you", s: t("I'm | from | Lithuania. | And | you?", "Aš esu | iš | Lietuvos. | O | jūs?", "Esu iš Lietuvos. O jūs?") },
      ],
    },
    // "First time here?"
    talk_first: {
      lt: "Atsakyti, ar čia pirmą kartą",
      items: [
        { id: "st_first", s: t("Yes, | it's | my | first | time.", "Taip, | tai yra | mano | pirmas | kartas.", "Taip, pirmą kartą.") },
        { id: "st_before", s: t("No, | I've | been | here | before.", "Ne, | aš esu | {m:buvęs|f:buvusi} | čia | anksčiau.", "Ne, jau esu čia {m:buvęs|f:buvusi}.") },
        { id: "st_from", s: t("Yes, | I'm | from | Lithuania.", "Taip, | aš esu | iš | Lietuvos.", "Taip, esu iš Lietuvos.") },
      ],
    },
    // "Lithuania! Cool. Basketball country, right?"
    bball: {
      lt: "Atsakyti apie krepšinį",
      items: [
        { id: "st_bball", s: t("Yes, | we | love | basketball!", "Taip, | mes | dieviname | krepšinį!", "Taip, mes dieviname krepšinį!") },
        { id: "st_religion", s: t("Yes! | Basketball | is | our | second | religion.", "Taip! | Krepšinis | yra | mūsų | antroji | religija.", "Taip! Krepšinis – mūsų antroji religija.") },
      ],
    },
    // "Can I turn it up?" / "Is it okay if I take a different way?"
    allow: {
      lt: "Leisti",
      items: [
        { id: "r_go", s: t("Sure, | go ahead.", "Žinoma, | prašom.", "Žinoma, prašom.") },
        { id: "r_fine", s: t("Sure, | that's | fine.", "Žinoma, | tai yra | gerai.", "Žinoma, gerai.") },
        { id: "yn_no_thanks", s: t("No, | thanks.", "Ne, | ačiū.", "Ne, ačiū.") },
      ],
    },
    // "Hi! Are you waiting for a ride to the airport?"
    ride: {
      lt: "Atsakyti, kad ne", slot: "dest", examples: ["hotel", "museum", "station", "square"],
      items: [
        { id: "rd_not", s: t("No, | I'm | not.", "Ne, | aš | [nelaukiu].", "Ne, nelaukiu.", { flags: { 2: "Elliptical “not”: Lithuanian must repeat the verb, nelaukiu (square brackets)." } }) },
        { id: "d_to", s: t("No. | To | {X.np}, | please.", "Ne. | Į | {X.np:acc}, | prašau.", "Ne. Į {X.np:acc}, prašau.") },
      ],
    },
    // "You can add a tip on the screen."
    tip: {
      lt: "Pridėti arbatpinigių",
      items: [
        { id: "t_add", s: t("Sure, | I'll add | a | tip.", "Žinoma, | pridėsiu | — | arbatpinigių.", "Žinoma, pridėsiu arbatpinigių.", { flags: { 2: "Partitive: the genitive arbatpinigių carries “a tip”." } }) },
        { id: "t_how", s: t("How much | should | I | tip?", "Kiek | turėčiau | aš | duoti arbatpinigių?", "Kiek turėčiau duoti arbatpinigių?") },
      ],
    },
    // "Need change?"
    change: {
      lt: "Pasakyti, kad grąžos nereikia",
      items: [
        { id: "p_keep", s: t("No, | keep | the | change.", "Ne, | pasilikite | — | grąžą.", "Ne, grąžos nereikia.") },
        { id: "yn_yes_please", s: t("Yes, | please.", "Taip, | prašau.", "Taip, prašau.") },
      ],
    },
  },

  tips: {
    uk_boot: { key: "uk_boot", lt: "Suprasta! Amerikoje bagažinė – „trunk“ („boot“ – britiškai).", better: "Could you put my bag in the trunk?" },
  },

  merges: {
    "where to": { reason: "lexical_expression", split: "Where → kur + to → į leaves the verb missing; the elliptical taxi question “Where to?” = kur važiuojame.", minimal: "Two words, one question." },
    "hop in": { reason: "lexical_expression", split: "hop → šokti + in → į is false; the invitation = lipkite (get in).", minimal: "Verb + particle." },
    "sure thing": { reason: "lexical_expression", split: "sure → tikras + thing → daiktas is false; the reply = žinoma.", minimal: "Two words." },
    "you got it": { reason: "lexical_expression", split: "you → jūs + got → gavote + it → tai means “you received it”; the service reply = supratau / bus padaryta.", minimal: "The whole formula." },
    "buckle up": { reason: "lexical_expression", split: "buckle → segti + up → aukštyn is false; = prisisekite.", minimal: "Verb + particle." },
    "give or take": { reason: "lexical_expression", split: "give → duoti + or → ar + take → imti is false; the hedge = plius minus.", minimal: "Three words, one hedge." },
    "hold on": { reason: "lexical_expression", split: "hold → laikyti + on → ant is false; = laikykitės.", minimal: "Verb + particle." },
    "go ahead": { reason: "lexical_expression", split: "go → eiti + ahead → priekyje is false; the permission = prašom.", minimal: "Two words." },
    "here we are": { reason: "lexical_expression", split: "here → čia + we → mes + are → esame reads as a location statement; on arrival = štai ir atvykome.", minimal: "The whole formula." },
    "right here": { reason: "lexical_expression", split: "right → dešinė/teisingai is false; right here = čia pat (the particle follows in Lithuanian).", minimal: "Two words." },
    "turn on": { reason: "lexical_expression", split: "turn → sukti + on → ant is false; = įjungti (the prefix į- carries “on”).", minimal: "Verb + particle; the object stays outside." },
    "in front of": { reason: "lexical_expression", split: "in → į + front → priekis + of → — is false; = priešais.", minimal: "Three words, one preposition." },
    "up to": { reason: "lexical_expression", split: "up → aukštyn + to → į is false; “(it's) up to you” = priklauso (nuo jūsų).", minimal: "Two words; “you” stays outside." },
    "a lot": { reason: "lexical_expression", split: "a → — + lot → partija gives a false noun reading; the intensifier = labai.", minimal: "Two words, one adverb." },
    "how long": { reason: "lexical_expression", split: "How → kaip + long → ilgas gives “kaip ilgas” (length); asking about duration = kiek laiko.", minimal: "Two words, one question word." },
    "let's go": { reason: "lexical_expression", split: "Let's → leiskime + go → eiti is a calque; = važiuojam (1st person plural).", minimal: "Two words, one verb form." },
    "sunny cup": { reason: "lexical_expression", split: "sunny → saulėtas + cup → puodelis would translate a café's name; the name stays „Sunny Cup“.", minimal: "A proper name." },
  },

  // -------------------------------------------------------------------------

  // The learner's plan: where to, where to stop, pay (and the detour question if traffic comes up).
  mission: [
    { step: "dest", lt: "Pasakyk, kur važiuoji" },
    { step: "traffic", lt: "Nuspręsk dėl kito kelio", optional: true, when: (c) => !!c.s.traffic },
    { step: "stop", lt: "Pasakyk, kur sustoti" },
    { step: "pay", lt: "Susimokėk" },
  ],

  steps: [
    { id: "dest", done: (c) => !!c.s.dest || !!c.s.addr,
      ask: (c) => c.say(c.s.greeted ? "ask_dest" : "greet"),
      expects: ["dest", "dest_ctx", "dest_address", "dest_fix"],
      suggest: [
        { lt: "Pasakyti, kur važiuoti", hint: "dest", options: ["hotel", "station", "museum", "square", "sunnycup", "airport", "apartments", "office", "pier"] },
        { lt: "Paklausti kainos ar laiko", hint: "ask" },
        { lt: "Paprašyti įdėti krepšį į bagažinę", hint: "bag" },
      ],
      help: (c) => { c.say("ask_dest"); } },
    { id: "bag", when: (c) => c.s.askBag && c.s.trunk === undefined, done: (c) => c.s.trunk !== undefined,
      ask: (c) => c.say("offer_bag"),
      expects: ["bag_trunk", "allow", "decline_ctx"],
      suggest: [{ lt: "Atsakyti, ar įdėti krepšį į bagažinę", hint: "g_yesno" }],
      yes: (c) => { c.s.trunk = true; c.say("bag_ok"); },
      no: (c) => { c.s.trunk = false; c.say("no_problem"); } },
    { id: "go", done: (c) => !!c.s.rolling,
      ask: (c) => {
        c.s.rolling = true;
        if (!turn(c).said_dest) c.say("lets_go");
        if (c.s.volunteerTime && !c.s.timeSaid) { c.s.timeSaid = true; c.say("est_time", { num: minutes(c) }); }
        askNext(c);
      } },
    // Small talk: "Where are you from?" or "First time here?" (each question has its own model answers)
    { id: "talk", when: (c) => c.s.askTalk && c.s.talkQ === "from" && !c.s.arrived, done: (c) => !!c.s.talked,
      ask: (c) => c.say("talk_from_q"),
      expects: ["talk_from", "talk_first", "talk_you"],
      suggest: [{ lt: "Pasakyti, iš kur esi", hint: "talk" }],
      yes: (c) => { c.s.talked = true; c.say("ha_ok"); },
      no: (c) => { c.s.talked = true; c.say("ha_ok"); } },
    { id: "first_time", when: (c) => c.s.askTalk && c.s.talkQ === "first" && !c.s.arrived, done: (c) => !!c.s.talked,
      ask: (c) => c.say("talk_first_q"),
      expects: ["talk_first", "talk_from", "talk_you"],
      suggest: [{ lt: "Atsakyti, ar čia pirmą kartą", hint: "talk_first" }],
      yes: (c) => { c.s.talked = true; c.say("you_love_it"); },
      no: (c) => { c.s.talked = true; c.say("welcome_back"); } },
    { id: "radio", when: (c) => c.s.askRadio && c.s.radio === undefined && !c.s.arrived, done: (c) => c.s.radio !== undefined,
      ask: (c) => { c.say(c.s.radioAsked ? "radio_ask_again" : "radio_ask"); c.s.radioAsked = true; },
      expects: ["radio_up", "radio_down", "radio_off", "allow", "decline_ctx"],
      suggest: [{ lt: "Leisti pagarsinti (arba ne)", hint: "allow" }, { lt: "Paprašyti patylinti", hint: "car" }],
      yes: (c) => { c.s.radio = "up"; c.say("radio_up_ok"); },
      no: (c) => { c.s.radio = "low"; c.say("radio_quiet"); } },
    { id: "traffic", when: (c) => c.s.trafficTwist && !c.s.arrived, done: (c) => c.s.detour !== undefined,
      ask: (c) => {
        if (c.s.traffic) { c.say("traffic_ask_again"); return; }
        c.twist("traffic"); c.s.traffic = true; c.say("traffic_look"); c.say("traffic_ask");
      },
      expects: ["ask_time", "ask_quicker", "allow", "decline_ctx"],
      suggest: [{ lt: "Leisti važiuoti kitu keliu (arba ne)", hint: "allow" }, { lt: "Paklausti, kiek laiko užtruks", hint: "how_long" }],
      yes: (c) => { c.s.detour = true; c.say("traffic_yes"); },
      no: (c) => { c.s.detour = false; c.say("traffic_no"); } },
    { id: "stop", done: (c) => !!c.s.stopped,
      ask: (c) => {
        if (!c.s.arrived) { c.s.arrived = true; if (c.s.dest) c.say("arrive", { X: c.s.dest }); else c.say("stop_early"); }
        c.say("ask_stop");
      },
      expects: ["stop", "stop_no_ctx"],
      suggest: [{ lt: "Pasakyti, kur sustoti", hint: "stop" }],
      yes: (c) => { c.s.stopped = true; c.say("stop_ok"); },
      no: (c) => { c.say("where_stop"); c.hold(); } },
    { id: "pay", done: (c) => !!c.s.paid,
      ask: (c) => {
        c.s.fareSaid = true;
        // (the learner just asked the price: "It's $24.50 on the meter." is enough)
        if (!turn(c).said_fare) c.say("fare", { price: fare(c) });
      },
      expects: ["pay_card", "pay_cash", "pay_amount", "here_you_go", "keep_change", "tip_q"],
      suggest: [{ lt: "Susimokėti kortele arba grynaisiais", hint: "pay" }] },
    { id: "receipt", when: (c) => c.s.askReceipt, done: (c) => c.s.receipt !== undefined,
      ask: (c) => c.say("ask_receipt"),
      expects: ["receipt", "no_receipt"],
      suggest: [{ lt: "Atsakyti, ar reikia čekio", hint: "g_yesno" }],
      yes: (c) => { c.s.receipt = true; c.say("receipt_here"); c.event("give", { item: "receipt" }); },
      no: (c) => { c.s.receipt = false; c.say("no_problem"); } },
  ],

  init: (c) => {
    c.s.askBag = c.chance(0.5);
    c.s.askTalk = c.chance(0.55);
    c.s.talkQ = c.chance(0.65) ? "from" : "first";
    c.s.askRadio = c.chance(0.55);
    c.s.askReceipt = c.chance(0.3);
    c.s.volunteerTime = c.chance(0.35);
    c.s.rideshare = c.visits >= 1 && c.chance(0.3);
    c.s.trafficTwist = c.visits >= 1 && c.chance(0.45);
  },

  start: (c) => {
    c.s.greeted = true;
    if (c.s.rideshare) {
      c.twist("rideshare");
      c.say("ride_check");
      c.expect({
        id: "ride_check", expects: ["ride_no", "dest", "dest_ctx"], hints: ["dest"],
        suggest: [{ lt: "Atsakyti, kad ne (ir pasakyti, kur važiuoji)", hint: "ride", options: ["hotel", "museum", "station", "square"] }],
        on: {
          ride_no: (cc) => { cc.say("ride_mistake"); cc.hold(); },
          dest: (cc, sl, sg) => { if (sl.place?.dest !== "airport") once(cc, "oops", "ride_oops"); taxi.handlers.dest(cc, sl, sg); },
          dest_ctx: (cc, sl, sg) => { once(cc, "oops", "ride_oops"); taxi.handlers.dest_ctx(cc, sl, sg); },
        },
        yes: (cc) => { cc.say("ride_yes"); setDest(cc, "airport"); },
        no: (cc) => { cc.say("ride_mistake"); cc.hold(); },
        ask: (cc) => cc.say("ride_check"),
      });
      return;
    }
    c.say("greet");
    c.hold();
  },

  handlers: {
    dest(c, slots) {
      const p = slots.place || {};
      const id = p.dest as string | undefined;
      const vague = p.vague ? (VAGUE.find((v) => v.id === p.vague)?.attrs?.vague as string) : undefined;
      if (!id && !vague && slots.dest) { setDest(c, slots.dest); return; }
      setDest(c, id, vague);
    },
    dest_ctx(c, slots, seg) {
      // "{vague}" or a bare noun tagged #vg:<id> ("Hotel, please.")
      const vid = (slots.vague as string | undefined) ?? seg.tags.find((x) => x.startsWith("vg:"))?.slice(3);
      const vague = vid ? (VAGUE.find((v) => v.id === vid)?.attrs?.vague as string) : undefined;
      if (vague) askVague(c, vague);
    },
    dest_address(c, slots) {
      const loc = (slots.street && STREETS.find((s) => s.id === slots.street)?.tags?.[0]?.slice(4)) || "visitor-center";
      c.s.addr = loc;
      c.s.dest = undefined;
      once(c, "dest", "address_ok");
    },
    dest_unknown(c) {
      c.say("unknown_place");
      c.expect({
        id: "vague", expects: ["dest", "dest_address"], hints: ["dest"],
        suggest: [{ lt: "Pasakyti adresą arba kitą vietą", hint: "dest", options: ["hotel", "museum", "square", "sunnycup"] }],
        on: {
          dest: (cc, sl, sg) => { taxi.handlers.dest(cc, sl, sg); },
          dest_address: (cc, sl, sg) => { taxi.handlers.dest_address(cc, sl, sg); },
        },
        no: (cc) => { cc.say("where_then"); },
        ask: (cc) => cc.say("unknown_place"),
      });
    },
    dest_fix(c, slots, seg) {
      const neg = seg.tags.includes("neg");
      const good = neg ? slots.place2?.dest : slots.place?.dest;
      if (neg && slots.place?.dest && c.s.dest === slots.place.dest) c.s.dest = undefined;
      if (good) { setDest(c, good); return; }
      // a vague place ("No, actually, to the hotel."): Vinnie asks which one
      const vague = neg ? slots.place2?.vague : slots.place?.vague;
      if (vague) { taxi.handlers.dest(c, { place: neg ? slots.place2 : slots.place }, seg); return; }
      if (!c.s.dest) { c.say("where_then"); c.hold(); }
    },
    ride_no(c) { c.say("ride_mistake"); c.hold(); },
    bag_trunk(c) { c.s.trunk = true; once(c, "bag", turn(c).said_dest ? "bag_ok_too" : "bag_ok"); },
    ask_price(c, slots) {
      const p = slots.place?.dest;
      if (p && !c.s.dest) { const f = byId(p)!.attrs!.fare; c.say("est_price", { price: Math.round(f / 500) * 500 }); return; }
      if (c.s.fareSaid || c.s.arrived) { once(c, "fare", "fare_now", { price: fare(c) }); return; }
      if (!c.s.dest && !c.s.addr) { c.say("ask_dest"); c.hold(); return; }
      c.say("est_price", { price: estimate(c) });
    },
    ask_time(c, slots) {
      const p = slots.place?.dest;
      if (!c.s.dest && !c.s.addr && !p) { c.say("ask_dest"); c.hold(); return; }
      if (c.s.arrived) { c.say("already_here"); return; }
      if (/\bfar\b/.test(c.heard.toLowerCase())) c.say("est_far");
      c.s.timeSaid = true;
      c.say("est_time", { num: p && !c.s.dest ? byId(p)!.attrs!.min : minutes(c) });
    },
    ask_quicker(c) {
      if (!c.s.dest && !c.s.addr) { c.say("ask_dest"); c.hold(); return; }
      if (c.s.trafficTwist && c.s.detour === undefined && c.step === "traffic") { c.s.detour = true; c.say("traffic_yes"); return; }
      once(c, "short", "shortcut");
      c.s.hurry = true;
    },
    radio_up(c) { c.s.radio = "up"; once(c, "radio", "radio_up_ok"); },
    radio_down(c) { c.s.radio = "low"; once(c, "radio", "radio_down_ok"); },
    radio_off(c) { c.s.radio = "off"; once(c, "radio", "radio_off_ok"); },
    window(c) { once(c, "win", "window_ok"); },
    ac(c) { once(c, "ac", "better"); },
    heat(c) { once(c, "ac", "better"); },
    stop(c) {
      if (!c.s.dest && !c.s.addr) { c.say("ask_dest"); c.hold(); return; }
      if (!c.s.arrived) { c.s.arrived = true; c.s.stopped = true; once(c, "stop", "stop_early"); return; }
      c.s.stopped = true; once(c, "stop", "stop_ok");
    },
    pay_card(c) {
      if (!c.s.fareSaid) { c.s.method = "card"; c.say("card_later"); return; }
      c.say("card_ok"); payDone(c, "card");
      c.say("tip_screen");
      c.expect(tipPending());
    },
    pay_cash(c) {
      c.s.method = "cash";
      if (!c.s.fareSaid) { c.say("card_later"); return; }
      once(c, "cash", "cash_ok");
    },
    pay_amount(c, slots) {
      const amount = slots.price as number | undefined;
      if (!c.s.fareSaid) { c.say("card_later"); return; }
      if (typeof amount !== "number") { payDone(c, "cash"); once(c, "thx", "perfect_thanks"); return; }
      if (amount < fare(c)) { c.say("short", { price: fare(c) }); c.hold(); return; }
      payDone(c, "cash");
      if (amount === fare(c)) { once(c, "thx", "perfect_thanks"); return; }
      if (/keep/.test(c.heard.toLowerCase())) { c.s.tip = true; once(c, "keep", "keep_thanks"); return; }
      c.say("need_change");
      c.expect(changePending());
    },
    here_you_go(c) {
      if (!c.s.fareSaid) { c.say("card_later"); return; }
      if (c.s.paid) { once(c, "thx", "thanks_lot"); return; }
      payDone(c, c.s.method || "cash");
      once(c, "thx", "perfect_thanks");
    },
    keep_change(c) {
      if (!c.s.fareSaid) { c.say("card_later"); return; }
      if (!c.s.paid) payDone(c, "cash");
      c.s.tip = true;
      once(c, "keep", "keep_thanks");
    },
    need_change(c) { if (c.s.paid) c.say("change_here"); else c.say("fare", { price: fare(c) }); },
    tip_q(c) { c.say("tip_answer"); },
    tip_add(c) { if (!c.s.fareSaid) { c.say("card_later"); return; } c.s.tip = true; once(c, "thx", "thanks_lot"); },
    receipt(c) { c.s.receipt = true; once(c, "rc", "receipt_here"); c.event("give", { item: "receipt" }); },
    talk_from(c, slots, seg) {
      c.s.talked = true;
      const lt = slots.country === "lithuania" || seg.tags.includes("lt");
      if (lt) {
        c.say("lithuania");
        c.expect({
          id: "bball", optional: true, expects: ["talk_bball", "bball_no_ctx"], hints: ["bball"], suggest: [{ lt: "Atsakyti apie krepšinį", hint: "bball" }],
          on: { talk_bball: (cc) => { cc.say("sabonis"); }, bball_no_ctx: (cc) => { cc.say("ha_ok"); } },
          yes: (cc) => { cc.say("sabonis"); }, no: (cc) => { cc.say("ha_ok"); },
        });
        return;
      }
      c.say("other_country");
    },
    talk_first(c) { c.s.talked = true; c.say(/before|was here/.test(c.heard.toLowerCase()) ? "welcome_back" : "you_love_it"); },
    talk_bball(c) { c.say("sabonis"); },
    talk_you(c) { c.say(/job|driving/.test(c.heard.toLowerCase()) ? "vinnie_job" : "vinnie_from"); },
    sing(c) { c.say("sing_along"); },
    wait_q(c) { c.say("wait_ok"); },
    allow(c) {
      const st = taxi.steps.find((x) => x.id === c.step);
      if (st?.yes && !st.done(c)) { st.yes(c); return; }
      ack(c, 1);
    },
    decline_ctx(c) {
      const st = taxi.steps.find((x) => x.id === c.step);
      if (st?.no && !st.done(c)) { st.no(c); return; }
      ack(c, 1);
    },
    bball_no_ctx(c) { c.say("ha_ok"); },
    stop_no_ctx(c) { c.say("where_stop"); c.hold(); },
    tip_no_ctx(c) { c.say("no_problem"); },
    no_receipt(c) { c.s.receipt = false; once(c, "rc", "no_problem"); },
    thanks_ride(c) { if (c.s.paid) once(c, "close", "closing_thanks"); else ack(c, 1); },
  },

  finish: (c) => {
    c.complete();
    const to = c.s.dest ? byId(c.s.dest)!.attrs!.loc : c.s.addr ?? "visitor-center";
    if (c.s.trunk) c.say("bag_out");
    c.say("bye");
    c.event("taxi-ride", { to });
    c.expect({
      id: "closing", hints: ["g_social"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { once(cc, "close", "closing_thanks"); cc.end(); },
        thanks_ride: (cc) => { once(cc, "close", "closing_thanks"); cc.end(); },
        g_bye: (cc) => { once(cc, "close", /\bhave a\b|\byou too\b/i.test(cc.heard) ? "you_too" : "closing_thanks"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); },
    });
  },

  tests: [
    { say: "To the Harborview Hotel, please.", intent: "dest", slots: { place: { dest: "hotel" } } },
    { say: "Could you take me to the museum?", intent: "dest", slots: { place: { dest: "museum" } } },
    { say: "I need to go to Union Station.", intent: "dest", slots: { place: { dest: "station" } } },
    { say: "I'm going to the airport.", intent: "dest" },
    { say: "Sunny Cup, please.", intent: "dest", step: "dest" },
    { say: "Take me to Town Square.", intent: "dest" },
    { say: "To the hotel, please.", intent: "dest", slots: { place: { vague: "hotel_g" } } },
    { say: "Downtown.", intent: "dest_ctx", step: "dest" },
    { say: "To 25 Oak Avenue, please.", intent: "dest_address", slots: { number: 25, street: "oak" } },
    { say: "Take me to the Grand Plaza.", intent: "dest_unknown" },
    { say: "Not the museum, the airport.", intent: "dest_fix", not: ["dest"] },
    { say: "Actually, can we go to the Pier instead?", intent: "dest_fix" },
    { say: "Could you put my bag in the trunk?", intent: "bag_trunk" },
    { say: "Can you put my suitcase in the boot?", intent: "bag_trunk" },
    { say: "How much will it be?", intent: "ask_price" },
    { say: "How long will it take?", intent: "ask_time" },
    { say: "Is it far?", intent: "ask_time" },
    { say: "Is there a quicker way?", intent: "ask_quicker" },
    { say: "Could you turn the radio up?", intent: "radio_up" },
    { say: "Could you turn the music down, please?", intent: "radio_down", not: ["radio_up"] },
    { say: "It's a bit loud.", intent: "radio_down" },
    { say: "Could you turn off the radio?", intent: "radio_off", not: ["radio_up", "radio_down"] },
    { say: "Can I open the window?", intent: "window" },
    { say: "It's a bit hot in here.", intent: "ac" },
    { say: "Could you stop here, please?", intent: "stop" },
    { say: "Right here is fine.", intent: "stop", step: "stop" },
    { say: "At the corner, please.", intent: "stop", step: "stop" },
    { say: "In front of the hotel, please.", intent: "stop" },
    { say: "Can I pay by card?", intent: "pay_card", step: "pay" },
    { say: "Here's thirty dollars.", intent: "pay_amount", step: "pay", slots: { price: 3000 } },
    { say: "Keep the change.", intent: "keep_change", step: "pay" },
    { say: "No, keep the change.", intent: "keep_change", step: "pay" },
    { say: "How much should I tip?", intent: "tip_q" },
    { say: "Could I have a receipt?", intent: "receipt" },
    { say: "I'm from Lithuania.", intent: "talk_from", step: "talk", slots: { country: "lithuania" } },
    { say: "Yes, we love basketball!", intent: "talk_bball" },
    { say: "No, I need a taxi.", intent: "ride_no" },
    { say: "Sure, go ahead.", intent: "allow", step: "radio" },
    { say: "Where are you from?", intent: "talk_you" },
    { say: "banana steering wheel purple", intent: "none" },
    { say: "My cat likes the moon", intent: "none" },
    // more ways to say it (dev corpus tests/corpus/s66-taxi.json)
    { say: "I have to be at the airport at 5.", intent: "dest", slots: { place: { dest: "airport" } } },
    { say: "Drop me at Town Square, please.", intent: "dest" },
    { say: "Hotel, please.", intent: "dest_ctx", step: "dest" },
    { say: "Near the museum.", intent: "dest" },
    { say: "Could you take me to the Harborview Hotel on Harbor Road?", intent: "dest", slots: { place: { dest: "hotel" } } },
    { say: "I come from Lithuania, a small country in Europe.", intent: "talk_from", step: "talk", slots: { country: "lithuania" } },
    { say: "No, second time.", intent: "talk_first", step: "first_time" },
    { say: "Yes, I'm here on vacation.", intent: "talk_first", step: "first_time" },
    { say: "Right! Sabonis!", intent: "talk_bball" },
    { say: "Sure, I don't mind.", intent: "allow", step: "radio" },
    { say: "Please don't, I have a headache.", intent: "decline_ctx", step: "radio" },
    { say: "No, let's stay on this road.", intent: "decline_ctx", step: "traffic" },
    { say: "It's up to you.", intent: "allow", step: "traffic" },
    { say: "No thanks, it's small.", intent: "decline_ctx", step: "bag" },
    { say: "Across the street, please.", intent: "stop", step: "stop" },
    { say: "Not here, a bit further.", intent: "stop_no_ctx", step: "stop" },
    { say: "Visa, please.", intent: "pay_card", step: "pay" },
    { say: "Here's thirty. You can keep the rest.", intent: "pay_amount", step: "pay" },
    { say: "Do you have change for a fifty?", intent: "pay_amount", step: "pay", slots: { price: 5000 } },
    { say: "No, I didn't order a ride.", intent: "ride_no" },
    { say: "Thanks for the ride!", intent: "thanks_ride" },
    // meaning must not flip
    { say: "No cash, only card.", intent: "pay_card", step: "pay", not: ["pay_cash"] },
    { say: "Please don't turn it up.", intent: "decline_ctx", step: "radio", not: ["radio_up", "allow"] },
    { say: "Don't stop here.", intent: "stop_no_ctx", step: "stop", not: ["stop"] },
    { say: "I don't want to go to the airport.", intent: "none" },
    { say: "I don't like basketball.", intent: "none" },
    // a change of destination after a leading "No," (BUG-REVIEW s62–s75 #6)
    { say: "No, actually, to the Harborview Hotel.", intent: "dest_fix", slots: { place: { dest: "hotel" } } },
    { say: "No, sorry, I meant the museum.", intent: "dest_fix", slots: { place: { dest: "museum" } } },
    { say: "Can we go to the Pier instead?", intent: "dest_fix", slots: { place: { dest: "pier" } } },
    { say: "No, actually, I don't want to go to the airport.", intent: "none" },
    // more ways (played paths, 25 Sep 2026)
    { say: "How much do I owe you?", intent: "ask_price", step: "pay" },
    { say: "Main Street, please.", intent: "dest_address", step: "dest" },
    { say: "Maybe a little.", intent: "allow", step: "radio" },
    { say: "Not too loud, please.", intent: "allow", step: "radio" },
  ],

  sims: [
    { name: "happy path: hotel, card, tip", turns: ["Hi! To the Harborview Hotel, please.", "Right here is fine.", "Can I pay by card?"],
      expect: { complete: true }, auto: TX_AUTO },
    { name: "questions, bag, cash and keep the change", turns: ["Could you take me to the museum? And could you put my bag in the trunk?", "How much will it be?", "In front of the museum, please.", "Here's thirty dollars. Keep the change."],
      expect: { complete: true }, auto: omit(TX_AUTO, ["stop", "pay"]) },
    { name: "vague place, change of mind, radio down, receipt", turns: ["Downtown, please.", "Sunny Cup.", "Actually, can we go to the Pier instead?", "Could you turn the music down, please?", "Could you stop at the corner?", "Here you go. Could I have a receipt?"],
      expect: { complete: true }, auto: omit(TX_AUTO, ["dest", "vague", "stop", "pay"]) },
  ],
};

export default taxi;
