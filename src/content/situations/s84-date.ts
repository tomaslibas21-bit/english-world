// Song 84 "Can I See You Again?": a first date at The Pier restaurant.
// The partner is Sam or Emma (settings: player.datePartner; default Emma for a male player,
// Sam otherwise). English lines are gender-neutral; Lithuanian uses {sm:…|sf:…} for the
// partner's own gender and {m:…|f:…} for the player's. Informal "tu".
//
// Flow: hello (someone is late / compliments) → drinks (some visits) → two small-talk topics
// from job, hobbies, travel and music, each with "And you?" both ways → quick questions
// (twist) → the check (pay / split) → "I had a really nice time" → "Can I see you again?" and a
// day (twist: busy on Saturday) → "Text me when you get home". Warm, light and respectful:
// a "no" to a second date is accepted kindly.

import type { Ctx, EntityDef, Handler, Segment, SituationDef } from "../types";
import { ent, t } from "../dsl";
import { GLOBAL_HANDLERS, LEAVING_PATTERNS } from "../global";

// ---------------------------------------------------------------------------
// Entities

const VYNAS = "vynas/vyno/vynui/vyną/vynu/vyne";
const VANDUO = "vanduo/vandens/vandeniui/vandenį/vandeniu/vandenyje";
const DRINKS: EntityDef[] = [
  ent("white_wine", "white | wine", `baltasis/baltojo/baltajam/baltąjį/baltuoju/baltajame | ${VYNAS}`, "m",
    { art: "", forms: ["white", "a white wine", "glass of white", "a glass of white wine", "chardonnay", "pinot grigio", "sauvignon blanc", "wine", "a glass of wine", "some wine", "a bottle of wine"], chip: "baltojo vyno", attrs: { glass: true } }),
  ent("red_wine", "red | wine", `raudonasis/raudonojo/raudonajam/raudonąjį/raudonuoju/raudonajame | ${VYNAS}`, "m",
    { art: "", forms: ["red", "a red wine", "glass of red", "a glass of red wine", "merlot", "cabernet", "pinot noir"], chip: "raudonojo vyno", attrs: { glass: true } }),
  ent("beer", "beer", "alus/alaus/alui/alų/alumi/alyje", "m", { forms: ["beers", "a beer", "a cold beer", "lager", "an ipa", "ipa"], chip: "alaus" }),
  ent("sparkling_water", "sparkling | water", `gazuotas/gazuoto/gazuotam/gazuotą/gazuotu/gazuotame | ${VANDUO}`, "m",
    { art: "", forms: ["sparkling water", "soda water", "seltzer", "mineral water", "fizzy water"], chip: "gazuoto vandens", attrs: { glass: true } }),
  ent("water", "water", VANDUO, "m", { art: "", forms: ["just water", "still water", "tap water", "a glass of water"], chip: "vandens", attrs: { glass: true } }),
  ent("lemonade", "lemonade", "limonadas/limonado/limonadui/limonadą/limonadu/limonade", "m", { forms: ["a lemonade", "lemonades"], chip: "limonado" }),
  ent("iced_tea", "iced | tea", "šalta/šaltos/šaltai/šaltą/šalta/šaltoje | arbata/arbatos/arbatai/arbatą/arbata/arbatoje", "f", { forms: ["ice tea", "an iced tea"], chip: "šaltos arbatos" }),
  ent("coffee", "coffee", "kava/kavos/kavai/kavą/kava/kavoje", "f", { forms: ["a coffee", "coffees", "an espresso", "espresso", "a cappuccino", "cappuccino"], chip: "kavos" }),
  ent("tea", "tea", "arbata/arbatos/arbatai/arbatą/arbata/arbatoje", "f", { forms: ["a tea", "hot tea", "a cup of tea", "green tea"], chip: "arbatos" }),
  ent("cocktail", "cocktail", "kokteilis/kokteilio/kokteiliui/kokteilį/kokteiliu/kokteilyje", "m", { forms: ["cocktails", "a margarita", "margarita", "mojito", "a mojito"], chip: "kokteilio" }),
];

// Hobbies: Lithuanian "forms" are what you like (mėgstu …): an infinitive or a noun.
const INF = (x: string) => x; // indeclinable infinitive
const HOBBIES: EntityDef[] = [
  ent("cooking", "cooking", INF("gaminti"), "m", { forms: ["cook", "to cook", "cooking food", "making food"], chip: "gaminti", attrs: { mine: true } }),
  ent("baking", "baking", INF("kepti"), "m", { forms: ["bake", "to bake", "baking cakes"], chip: "kepti", attrs: { tryable: true } }),
  ent("traveling", "traveling", INF("keliauti"), "m", { forms: ["travel", "to travel", "travelling", "travelling abroad", "traveling abroad"], chip: "keliauti", attrs: { mine: true } }),
  ent("hiking", "hiking", INF("vaikščioti po gamtą"), "m", { forms: ["hike", "to hike", "walking in the mountains", "the mountains"], chip: "vaikščioti po gamtą", attrs: { mine: true } }),
  ent("reading", "reading", INF("skaityti"), "m", { forms: ["read", "to read", "books", "reading books"], chip: "skaityti" }),
  ent("walking", "walking", INF("vaikščioti"), "m", { forms: ["walk", "to walk", "walks", "long walks", "walking my dog", "walking with my dog", "walking the dog", "walking in the park", "going for walks"], chip: "vaikščioti" }),
  ent("dancing", "dancing", INF("šokti"), "m", { forms: ["dance", "to dance"], chip: "šokti", attrs: { tryable: true } }),
  ent("swimming", "swimming", INF("plaukioti"), "m", { forms: ["swim", "to swim", "the sea", "the beach"], chip: "plaukioti", attrs: { mine: true } }),
  ent("running", "running", INF("bėgioti"), "m", { forms: ["run", "to run", "jogging", "jog"], chip: "bėgioti" }),
  ent("cycling", "cycling", INF("važinėti dviračiu"), "m", { forms: ["biking", "bike", "riding my bike", "riding a bike", "bicycle"], chip: "važinėti dviračiu", attrs: { tryable: true } }),
  ent("yoga", "yoga", "joga/jogos/jogai/jogą/joga/jogoje", "f", { forms: ["doing yoga"], chip: "jogą", attrs: { tryable: true } }),
  ent("photography", "photography", INF("fotografuoti"), "m", { forms: ["taking photos", "taking pictures", "photos", "photo"], chip: "fotografuoti", attrs: { tryable: true, mine: true } }),
  ent("painting", "painting", INF("tapyti"), "m", { forms: ["paint", "to paint", "drawing", "draw", "art"], chip: "tapyti", attrs: { tryable: true } }),
  ent("gardening", "gardening", INF("sodininkauti"), "m", { forms: ["my garden", "working in the garden", "garden"], chip: "sodininkauti", attrs: { tryable: true } }),
  ent("fishing", "fishing", INF("žvejoti"), "m", { forms: ["fish", "to fish"], chip: "žvejoti", attrs: { tryable: true } }),
  ent("singing", "singing", INF("dainuoti"), "m", { forms: ["sing", "to sing", "karaoke"], chip: "dainuoti", attrs: { tryable: true } }),
  ent("guitar", "playing | the | guitar", "groti | — | gitara", "m", { forms: ["the guitar", "guitar", "play the guitar", "play guitar", "playing guitar"], chip: "groti gitara", attrs: { tryable: true } }),
  ent("movies", "movies", "filmai/filmų/filmams/filmus/filmais/filmuose", "m", { forms: ["films", "watching movies", "the movies", "cinema", "going to the movies"], chip: "filmus" }),
  ent("soccer", "soccer", "futbolas/futbolo/futbolui/futbolą/futbolu/futbole", "m", { forms: ["football", "playing soccer", "playing football"], chip: "futbolą" }),
  ent("basketball", "basketball", "krepšinis/krepšinio/krepšiniui/krepšinį/krepšiniu/krepšinyje", "m", { forms: ["playing basketball"], chip: "krepšinį" }),
  ent("tennis", "tennis", "tenisas/teniso/tenisui/tenisą/tenisu/tenise", "m", { forms: ["playing tennis"], chip: "tenisą", attrs: { tryable: true } }),
  ent("gym", "working | out", "sportuoti | —", "m", { forms: ["the gym", "going to the gym", "gym", "fitness", "work out", "working out", "sports", "sport"], chip: "sportuoti" }),
];

const GENRES: EntityDef[] = [
  ent("jazz", "jazz", "džiazas/džiazo/džiazui/džiazą/džiazu/džiaze", "m", { chip: "džiazą", attrs: { mine: true } }),
  ent("rock", "rock", "rokas/roko/rokui/roką/roku/roke", "m", { forms: ["rock and roll", "rock music"], chip: "roką" }),
  ent("pop", "pop", "popmuzika/popmuzikos/popmuzikai/popmuziką/popmuzika/popmuzikoje", "f", { forms: ["pop music"], chip: "popmuziką" }),
  ent("country", "country", "kantri muzika/kantri muzikos/kantri muzikai/kantri muziką/kantri muzika/kantri muzikoje", "f", { forms: ["country music"], chip: "kantri" }),
  ent("classical", "classical | music", "klasikinė/klasikinės/klasikinei/klasikinę/klasikine/klasikinėje | muzika/muzikos/muzikai/muziką/muzika/muzikoje", "f",
    { forms: ["classical", "classic music"], chip: "klasikinę muziką" }),
  ent("hiphop", "hip-hop", "hiphopas/hiphopo/hiphopui/hiphopą/hiphopu/hiphope", "m", { forms: ["hip hop", "rap"], chip: "hiphopą" }),
  ent("disco", "disco", "disko", "m", { forms: ["disco music", "eighties music", "the eighties", "80s", "80s music", "the 80s", "music from the 80s"], chip: "disko", attrs: { mine: true } }),
  ent("blues", "blues", "bliuzas/bliuzo/bliuzui/bliuzą/bliuzu/bliuze", "m", { chip: "bliuzą" }),
  ent("folk", "folk | music", "liaudies | muzika/muzikos/muzikai/muziką/muzika/muzikoje", "f", { forms: ["folk"], chip: "liaudies muziką" }),
  ent("electronic", "electronic | music", "elektroninė/elektroninės/elektroninei/elektroninę/elektronine/elektroninėje | muzika/muzikos/muzikai/muziką/muzika/muzikoje", "f",
    { forms: ["electronic", "techno", "house music", "dance music"], chip: "elektroninę muziką" }),
];

// Where the partner went last summer (one per visit), plus Lithuania for the learner's questions.
const COUNTRIES: EntityDef[] = [
  ent("italy", "Italy", "Italija/Italijos/Italijai/Italiją/Italija/Italijoje", "f", { forms: ["rome", "italia"] }),
  ent("spain", "Spain", "Ispanija/Ispanijos/Ispanijai/Ispaniją/Ispanija/Ispanijoje", "f", { forms: ["barcelona", "madrid"] }),
  ent("greece", "Greece", "Graikija/Graikijos/Graikijai/Graikiją/Graikija/Graikijoje", "f", { forms: ["athens"] }),
  ent("france", "France", "Prancūzija/Prancūzijos/Prancūzijai/Prancūziją/Prancūzija/Prancūzijoje", "f", { forms: ["paris"] }),
  ent("lithuania", "Lithuania", "Lietuva/Lietuvos/Lietuvai/Lietuvą/Lietuva/Lietuvoje", "f", { forms: ["vilnius", "the baltics"] }),
];
const TRIP = ["italy", "spain", "greece", "france"];

// Plans for the next date: EN verb phrase + LT verb phrase (unit by unit).
const ACTIVITIES: EntityDef[] = [
  ent("coffee", "get | coffee", "išgerti | kavos", "m", { forms: ["grab coffee", "grab a coffee", "have coffee", "get a coffee", "go for coffee", "coffee", "a coffee"], chip: "išgerti kavos" }),
  ent("dinner", "have | dinner", "valgyti | vakarienę", "m", { forms: ["get dinner", "go out for dinner", "go to dinner", "grab dinner", "dinner"], chip: "vakarieniauti" }),
  ent("movie", "see | a | movie", "pažiūrėti | — | filmą", "m", { forms: ["watch a movie", "go to the movies", "see a film", "the movies", "a movie", "movies"], chip: "pažiūrėti filmą" }),
  ent("beach", "go | to | the | beach", "nuvažiuoti | į | — | paplūdimį", "m", { forms: ["the beach", "walk on the beach", "a walk on the beach"], chip: "nuvažiuoti į paplūdimį" }),
  ent("museum", "go | to | the | museum", "nueiti | į | — | muziejų", "m", { forms: ["the museum", "the art museum", "visit the museum"], chip: "nueiti į muziejų" }),
  ent("dancing", "go | dancing", "eiti | šokti", "m", { forms: ["dancing", "go out dancing"], chip: "eiti šokti" }),
];

const WDAYS: EntityDef[] = [
  ent("monday", "Monday", "pirmadienis/pirmadienio/pirmadieniui/pirmadienį/pirmadieniu/pirmadienyje", "m"),
  ent("tuesday", "Tuesday", "antradienis/antradienio/antradieniui/antradienį/antradieniu/antradienyje", "m"),
  ent("wednesday", "Wednesday", "trečiadienis/trečiadienio/trečiadieniui/trečiadienį/trečiadieniu/trečiadienyje", "m"),
  ent("thursday", "Thursday", "ketvirtadienis/ketvirtadienio/ketvirtadieniui/ketvirtadienį/ketvirtadieniu/ketvirtadienyje", "m"),
  ent("friday", "Friday", "penktadienis/penktadienio/penktadieniui/penktadienį/penktadieniu/penktadienyje", "m"),
  ent("saturday", "Saturday", "šeštadienis/šeštadienio/šeštadieniui/šeštadienį/šeštadieniu/šeštadienyje", "m"),
  ent("sunday", "Sunday", "sekmadienis/sekmadienio/sekmadieniui/sekmadienį/sekmadieniu/sekmadienyje", "m"),
  ent("tomorrow", "tomorrow", "rytoj", "m"),
];
const DAY_IDS = new Set(WDAYS.map((d) => d.id));

// Jobs and fields: recognised only (no Lithuanian echo, so no gendered job nouns are needed).
const JOBS = ("nurse teacher engineer programmer developer doctor driver builder cook chef waiter waitress server accountant manager " +
  "salesperson designer photographer mechanic electrician hairdresser student nanny cleaner farmer lawyer dentist pharmacist " +
  "artist musician writer journalist scientist translator caregiver secretary assistant receptionist cashier carpenter plumber " +
  "architect painter baker barista bartender consultant analyst therapist tailor").split(" ");
const JOB_PHRASES = ["software developer", "software engineer", "web developer", "web designer", "graphic designer", "it specialist", "data analyst",
  "project manager", "sales manager", "office manager", "store manager", "bus driver", "truck driver", "taxi driver", "construction worker",
  "social worker", "police officer", "flight attendant", "real estate agent", "sales assistant", "shop assistant", "care worker",
  "kindergarten teacher", "english teacher", "music teacher", "personal trainer", "fitness trainer", "hotel receptionist", "factory worker"];
const FIELDS = ["it", "sales", "marketing", "finance", "a hospital", "a restaurant", "a hotel", "a bank", "a school", "an office", "a factory",
  "construction", "healthcare", "education", "tourism", "logistics", "retail", "a store", "a shop", "a warehouse", "an it company", "a café", "a bakery"];

// ---------------------------------------------------------------------------
// Helpers

type Topic = "job" | "hobby" | "travel" | "music";
const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const turnId = (c: Ctx) => ((c as any).conv?.history?.length ?? 0) + "|" + c.heard;
function once(c: Ctx, key: string): boolean {
  const k = key + "@" + turnId(c);
  const seen: string[] = (c.s.__once ||= []);
  if (seen.includes(k)) return false;
  seen.push(k);
  if (seen.length > 30) seen.shift();
  return true;
}
/** The goal is reached. Optional checklist items still open at this moment leave the list
 *  (their `when` checks goalMet), so a completed conversation never shows an unticked item. */
function win(c: Ctx) { c.s.goalMet = true; c.complete(); }
const partnerOf = (c: Ctx) => (c.player.datePartner === "sam" || c.player.datePartner === "emma"
  ? c.player.datePartner : c.player.gender === "m" ? "emma" : "sam");
const askedBack = (seg: Segment) => seg.tags.includes("askback");
/** "…and you?" anywhere in the utterance (a job answer may come in two pieces). */
const backAll = (c: Ctx) => /\b(and you|what about you|how about you|and yourself|what about yourself|how about yourself)\b/i.test(c.heard || "");
const neg = (c: Ctx) => /\b(not|n't|never|no)\b/i.test(c.heard || "");

const asked = (c: Ctx, id: string) => (c.s.asks?.[id] ?? 0) as number;
const bump = (c: Ctx, id: string) => { c.s.asks ||= {}; c.s.asks[id] = asked(c, id) + 1; };

/** Both small-talk topics of this visit answered (or dropped because the evening is ending). */
const topicsDone = (c: Ctx) => !!c.s.wrapUp || ((c.s.topics || []) as string[]).every((tp) => !!c.s.ans?.[tp] || asked(c, tp) >= 2);

/** Any learner turn counts as having said hello. */
const hi = (c: Ctx) => { c.s.greeted = true; };

/** The partner answers a topic about themselves. */
function tell(c: Ctx, topic: Topic) {
  if (c.s.told[topic]) return;
  c.s.told[topic] = true;
  c.s.toldTurn = turnId(c);
  if (topic === "job") c.say("own_job");
  else if (topic === "hobby") c.say("own_hobby");
  else if (topic === "travel") c.say("own_travel", { C: c.s.country });
  else c.say("own_music");
}

/** "Yes! Have you?", "Yes. And you?" at the travel question: the yes/no layer takes the answer and
 *  only the question back is left as a piece, so the answer is handled first. */
function travelYnFirst(c: Ctx) {
  if (c.step !== "travel" || c.s.ans.travel) return;
  const h = (c.heard || "").toLowerCase();
  const st = date.steps.find((x) => x.id === "travel");
  if (/^\W*(yes|yeah|yep|yup|of course)\b/.test(h)) { st?.yes?.(c); c.s.toldTurn = turnId(c); }
  else if (/^\W*(no|nope|never|not yet)\b/.test(h)) st?.no?.(c);
}

/** Learner asked a topic question first: answer, then ask back ("What about you?"). */
function askedAbout(c: Ctx, topic: Topic) {
  hi(c);
  if (topic === "travel") travelYnFirst(c);
  c.s.lastTopic = topic;
  const already = c.s.told[topic];
  if (already && c.s.toldTurn !== turnId(c)) c.say("told_you");
  tell(c, topic);
  if (!c.s.ans[topic]) { c.s.askBackShort = topic; c.ask(topic); }
}

/** The learner answered a topic: react (the caller says the reaction line), then tell ours if asked back. */
function answered(c: Ctx, topic: Topic) {
  hi(c);
  c.s.ans[topic] = true;
  c.s.lastTopic = topic;
}
function afterReaction(c: Ctx, topic: Topic, seg: Segment | null) {
  if (seg && askedBack(seg)) tell(c, topic);
}

// Automatic answers the simulation uses for the partner's optional questions.
const AUTO: Record<string, string> = {
  drinks: "A glass of white wine, please", job: "I'm a nurse. And you?", hobby: "I love cooking. What about you?",
  travel: "No, never. But I'd love to go!", music: "Mostly jazz. And you?",
  check: "Let me get this", like_job: "Yes, I love it", cold: "Here, take my jacket", closing: "I will! Good night!", qf: "Both!", qf2: "Both!",
  day: "Sure, Sunday works!",
};

// ---------------------------------------------------------------------------
// Handlers

const H: Record<string, Handler> = {
  intro_ctx(c) { hi(c); },
  voc(c) { hi(c); },
  g_hello(c) { if (!c.s.greeted) { hi(c); return; } GLOBAL_HANDLERS.g_hello(c as any, {}); },
  g_howareyou(c, slots) { hi(c); GLOBAL_HANDLERS.g_howareyou(c as any, slots); },
  no_hobby(c, _slots, seg) { answered(c, "hobby"); if (once(c, "react")) { c.say("busy_life"); afterReaction(c, "hobby", seg); } },
  no_music(c, _slots, seg) { answered(c, "music"); if (once(c, "react")) { c.say("no_music_react"); afterReaction(c, "music", seg); } },
  greet_back(c) {
    hi(c);
    if (c.s.opening === "late" && !c.s.lateOk) { c.s.lateOk = true; }
  },
  sorry_late(c) {
    hi(c);
    if (once(c, "late")) c.say(c.s.opening === "late" ? "you_are_fine" : "just_got_here");
  },
  reassure(c) {
    hi(c);
    if (c.s.opening === "late" && !c.s.lateOk) { c.s.lateOk = true; if (once(c, "phew")) c.say("phew"); }
  },
  compliment(c) {
    hi(c);
    if (!once(c, "compliment")) return;
    if (c.s.complimented && !c.s.complimentBack) { c.s.complimentBack = true; c.say("aw"); return; }
    c.s.gotCompliment = true;
    c.say("thanks_compliment");
  },
  you_too(c) {
    hi(c);
    if (c.s.__finished) { c.s.textOk = true; return; }
    if (c.s.complimented && !c.s.complimentBack) { c.s.complimentBack = true; c.say("aw"); }
  },
  view(c) { hi(c); if (once(c, "view")) c.say("view"); },
  come_here_often(c) { hi(c); c.say("not_often"); },
  // drinks
  drink_ans(c, slots) {
    hi(c);
    const d = toArr(slots.drink)[0] ?? (c.s.sameDrink ? "white_wine" : undefined);
    c.s.drink = d || "white_wine";
    if (!once(c, "drink")) return;
    c.say(c.s.drink === "white_wine" && c.s.toldDrink ? "same_drink" : "good_choice");
  },
  me_too_ctx(c, slots, seg) {
    if (c.step === "drinks") { H.same_drink_ans(c, slots, seg); return; }
    if (c.s.niceSaid && !c.s.niceTime) { H.nice_time(c, slots, seg); return; }
    hi(c);
  },
  same_drink_ans(c) { hi(c); c.s.drink = "white_wine"; if (!c.s.toldDrink) { c.s.toldDrink = true; c.say("own_drink"); } else if (once(c, "drink")) c.say("same_drink"); },
  no_alcohol(c) { hi(c); c.s.noAlcohol = true; if (once(c, "drink")) c.say("no_alcohol_ok"); },
  ask_drink(c) {
    hi(c);
    if (!c.s.toldDrink) { c.s.toldDrink = true; c.say("own_drink"); }
    if (!c.s.drink) { c.s.drinkBack = true; c.ask("drinks"); }
  },
  // topics
  job_ans(c, _slots, seg) {
    answered(c, "job");
    // a later piece of the same answer ("…I work at the hospital. And you?") may still ask back
    if (!once(c, "react")) { afterReaction(c, "job", seg); return; }
    if (seg.tags.includes("same_job")) { c.say("same_job"); c.s.told.job = true; c.s.toldTurn = turnId(c); return; }
    c.say("job_react");
    afterReaction(c, "job", seg);
    if (c.s.likeJobQ && !askedBack(seg) && !backAll(c)) likeJob(c);
  },
  // "I'm a little nervous.": said once; the open question comes again after it
  nervous(c) { hi(c); if (!c.s.nervousSaid) { c.s.nervousSaid = true; c.say("nervous_too"); } },
  job_ctx(c, slots, seg) {
    // "I'm a little nervous", "I'm a big fan of this place": not a job (the question stays open)
    if (/^(little|bit|lot|big fan|huge fan)\b|\b(late|tired|nervous|hungry|sorry|early)\b/.test(String(slots.w || ""))) { hi(c); return; }
    answered(c, "job"); if (once(c, "react")) c.say("job_react");
    afterReaction(c, "job", seg);
  },
  no_job(c, _slots, seg) { answered(c, "job"); if (once(c, "react")) { c.say(seg.tags.includes("retired") ? "retired_react" : "no_job_react"); afterReaction(c, "job", seg); } },
  ask_job(c) { askedAbout(c, "job"); },
  ask_like_job(c) {
    hi(c);
    // a bare "Do you like it?" is about the job only right after the job talk
    if (!c.s.told.job) { if (!/\b(job|work|photo\w*|weddings?)\b/i.test(c.heard || "") && c.s.lastTopic !== "job") return; tell(c, "job"); }
    if (once(c, "likeback")) c.say("own_like_job");
  },
  hobby_ans(c, slots, seg) {
    answered(c, "hobby");
    const hs = toArr(slots.hobby) as string[];
    if (!once(c, "react")) { afterReaction(c, "hobby", seg); return; }
    const mine = hs.find((h) => HOBBIES.find((e) => e.id === h)?.attrs?.mine);
    if (mine) { c.say("same_hobby", { H: mine }); c.s.told.hobby = true; c.s.toldTurn = turnId(c); return; }
    const tryable = hs.some((h) => HOBBIES.find((e) => e.id === h)?.attrs?.tryable);
    c.say(tryable ? "hobby_try" : "hobby_react");
    afterReaction(c, "hobby", seg);
  },
  ask_hobby(c) { askedAbout(c, "hobby"); },
  travel_yes_ctx(c) {
    answered(c, "travel");
    if (!once(c, "react")) return;
    c.say("travel_yes_react"); c.s.told.travel = true; c.s.toldTurn = turnId(c); // the reaction already says she was there
  },
  travel_no_ctx(c, _slots, seg) { answered(c, "travel"); if (once(c, "react")) { c.say("travel_no_react", { C: c.s.country }); afterReaction(c, "travel", seg); } },
  ask_travel(c, slots) {
    const ctry = toArr(slots.country)[0] as string | undefined;
    if (ctry === "lithuania") { hi(c); if (once(c, "lt")) c.say("never_lithuania"); return; }
    askedAbout(c, "travel");
  },
  ask_travel_general(c) { askedAbout(c, "travel"); },
  music_ans(c, slots, seg) {
    answered(c, "music");
    const gs = toArr(slots.genre) as string[];
    if (!once(c, "react")) { afterReaction(c, "music", seg); return; }
    const mine = gs.find((g) => GENRES.find((e) => e.id === g)?.attrs?.mine);
    if (mine) { c.say("same_music", { G: mine }); c.s.told.music = true; c.s.toldTurn = turnId(c); return; }
    c.say(gs.length || seg.tags.includes("anymusic") ? "music_react" : "music_react_all");
    afterReaction(c, "music", seg);
  },
  ask_music(c) { askedAbout(c, "music"); },
  and_you(c) {
    hi(c);
    travelYnFirst(c);
    const tp = c.s.lastTopic as Topic | undefined;
    if (tp && !c.s.told[tp]) { tell(c, tp); return; }
    if (c.s.toldTurn === turnId(c)) return; // a "me too" already answered it
    if (c.s.drinkBack === false && !c.s.toldDrink) { c.s.toldDrink = true; c.say("own_drink"); return; }
    if (once(c, "andyou")) c.say("me_generic");
  },
  // quick questions (twist)
  qf_ctx() { /* answered through the pending */ },
  like_it_ctx() { /* answered through the like_job pending */ },
  dislike_it_ctx() { /* answered through the like_job pending */ },
  // the check
  pay_all(c) {
    hi(c);
    if (c.s.checkDone) { if (once(c, "pay")) c.say("already_paid"); return; }
    if (!c.s.checkShown && !c.s.wrapUp) { if (once(c, "pay")) c.say("not_ordered_yet"); return; }
    c.s.checkDone = "learner";
    if (once(c, "pay")) c.say(c.s.partnerOffered ? "if_you_insist" : "thanks_pay");
  },
  split(c) {
    hi(c);
    if (c.s.checkDone === "split") return;
    if (!c.s.checkShown && !c.s.wrapUp) { if (once(c, "pay")) c.say("not_ordered_yet"); return; }
    c.s.checkDone = "split";
    if (once(c, "pay")) c.say("deal");
  },
  accept_offer(c, slots, seg) {
    hi(c);
    if (c.s.partnerOffered && !c.s.checkDone) { c.s.checkDone = "partner"; if (once(c, "pay")) c.say("my_pleasure"); return; }
    if (/^\W*(thank|thanks)\b/i.test(c.heard || "")) H.g_thanks(c, slots, seg);
  },
  ask_check(c) { hi(c); if (!c.s.checkShown) { c.s.checkShown = true; c.say("check_here"); } },
  // the end of the evening
  nice_time(c) {
    hi(c);
    c.s.niceTime = true; c.s.wrapUp = true;
    if (!once(c, "nice")) return;
    if (c.s.niceSaid) c.say("glad");
    else { c.s.niceSaid = true; c.say("me_too_nice"); }
  },
  see_again(c, slots) {
    hi(c);
    c.s.learnerAsked = true; c.s.wrapUp = true;
    if (!c.s.againOk) { c.s.againOk = true; c.say("id_like_that"); }
    proposeDay(c, slots);
  },
  agree_again(c, slots) {
    hi(c);
    if (c.step === "again" || c.s.partnerAsked) {
      if (!c.s.againOk) { c.s.againOk = true; if (once(c, "agree")) c.say("yay_great"); }
      proposeDay(c, slots);
      return;
    }
    // "Sunday works for me": the day said wins over the one offered
    if (c.step === "day" || c.s.dayOffered) { if (toArr(slots?.day).length) { proposeDay(c, slots); return; } dayYes(c); return; }
    if (c.s.againOk) proposeDay(c, slots);
  },
  decline_again(c) {
    hi(c);
    if (c.s.againOk) { // a day that doesn't work
      if (once(c, "dayno")) { c.say("how_about_sunday"); c.s.offerDay = "sunday"; }
      return;
    }
    c.s.declined = true;
    if (once(c, "decline")) c.say("no_pressure");
  },
  propose_day(c, slots) {
    hi(c);
    c.s.wrapUp = true;
    const concrete = toArr(slots.day).length || toArr(slots.activity).length;
    if (!c.s.againOk) { c.s.againOk = true; c.s.learnerAsked = true; if (!concrete) c.say("id_like_that"); }
    proposeDay(c, slots);
  },
  walk_home(c) {
    hi(c);
    c.s.wrapUp = true;
    if (!once(c, "walk")) return;
    c.s.walk = true;
    c.say(c.s.livesClose ? "live_close" : "id_like_walk");
  },
  offer_jacket(c) { hi(c); if (once(c, "jacket")) c.say("so_sweet"); c.s.coldDone = true; },
  day_ctx(c, slots, seg) { H.propose_day(c, slots, seg); },
  thanks_compliment(c) { hi(c); c.s.thankedCompliment = true; },
  text_reply(c) { hi(c); c.s.textOk = true; },
  thanks_evening(c) { hi(c); c.s.niceTime = true; c.s.wrapUp = true; if (once(c, "nice")) c.say("thank_you_too"); },
  g_thanks(c) {
    // "Thank you!" after a compliment or a treat needs no "You're welcome".
    hi(c);
    if (c.s.gotCompliment && !c.s.thankedCompliment) { c.s.thankedCompliment = true; return; }
    if (c.s.partnerOffered && !c.s.checkDone) { c.s.checkDone = "partner"; if (once(c, "pay")) c.say("my_pleasure"); return; }
    // otherwise a smile is enough
  },
  g_ok(c) { hi(c); stepYes(c); },
  hesitate(c) {
    hi(c);
    if ((c.step === "again" || c.s.partnerAsked) && !c.s.againOk) { if (once(c, "hes")) c.say("think_about_it"); c.hold(); return; }
    if (c.step === "day") { c.say("when_free"); c.hold(); }
  },
  no_sorry(c) {
    hi(c);
    const st = date.steps.find((x) => x.id === c.step);
    if (st?.no && !st.done(c)) st.no(c);
    else if (c.step === "again" || c.s.partnerAsked && !c.s.againOk) H.decline_again(c, {}, { intent: "decline_again", slots: {}, tags: [] });
  },
  agree(c) { hi(c); stepYes(c); },
  react_nice(c) { hi(c); },
  g_bye(c) {
    hi(c);
    // The date may end once the next one is agreed after the chat, or after the learner said no.
    const goal = !!c.s.dayAgreed && topicsDone(c);
    if (!goal && !c.s.declined && !c.s.byeWarned) {
      c.s.byeWarned = true;
      c.say("leaving_already");
      // "Yes, sorry." ends the evening; "No, no!" (or any other answer) goes on with it
      c.expect({
        id: "leaving_q", optional: true, hints: ["g_yesno"], suggest: [{ lt: "Atsakyti, ar išeini", hint: "g_yesno" }],
        yes: (cc) => { if (once(cc, "bye")) cc.say("good_night"); cc.end(); },
        no: () => { /* staying: the open question comes again */ },
        on: { g_bye: (cc, sl, sg) => H.g_bye(cc, sl, sg) },
      });
      return;
    }
    if (goal) win(c);
    if (once(c, "bye")) c.say("good_night");
    c.end();
  },
};

// Quick questions (twist): two of three, each answered with one word.
const QF: { line: string; hint: string; pair: [string, string]; react: Record<string, string> }[] = [
  { line: "qf_coffee", hint: "quick_coffee", pair: ["coffee", "tea"], react: { coffee: "qf_me_too", tea: "qf_tea" } },
  { line: "qf_cats", hint: "quick_pets", pair: ["cats", "dogs"], react: { cats: "qf_cats_yes", dogs: "qf_dogs" } },
  { line: "qf_owl", hint: "quick_owl", pair: ["early_bird", "night_owl"], react: { early_bird: "qf_early", night_owl: "qf_owl_yes" } },
];
function quick(c: Ctx, n: number) {
  const q = QF[(c.s.qfOrder as number[])[n]];
  if (n > 0) c.say(q.line);
  const answer = (cc: Ctx, pick?: string) => {
    cc.say(pick && q.react[pick] ? q.react[pick] : "qf_both");
    if (n === 0) quick(cc, 1); else cc.s.qfDone = true;
  };
  c.expect({
    id: n === 0 ? "qf" : "qf2", expects: ["qf_ctx"], hints: [q.hint],
    suggest: [{ lt: "Greitai atsakyti", hint: q.hint }],
    on: { qf_ctx: (cc, sl) => answer(cc, toArr(sl.qf)[0]), me_too_ctx: (cc) => answer(cc) },
    ask: (cc) => cc.say(q.line),
  });
}

function likeJob(c: Ctx) {
  c.s.likeJobQ = false;
  c.say("like_job_q");
  c.expect({
    id: "like_job", expects: ["like_it_ctx", "dislike_it_ctx"], hints: ["like_job"], suggest: [{ lt: "Atsakyti, ar patinka darbas", hint: "like_job" }],
    yes: (cc) => cc.say("thats_great"), no: (cc) => cc.say("not_every_job"),
    on: {
      no_sorry: (cc) => cc.say("not_every_job"),
      g_ok: (cc) => cc.say("thats_great"), agree: (cc) => cc.say("thats_great"), like_it_ctx: (cc) => cc.say("thats_great"),
      dislike_it_ctx: (cc) => cc.say("not_every_job"), and_you: (cc, sl, sg) => { H.and_you(cc, sl, sg); },
    },
    ask: (cc) => cc.say("like_job_q"),
  });
}

/** A day in the learner's words ("How about Saturday?", "Would you like to see a movie on Sunday?"). */
function proposeDay(c: Ctx, slots: any) {
  const act = toArr(slots?.activity)[0];
  if (act) c.s.activity = act;
  let day = toArr(slots?.day)[0] as string | undefined;
  if (day === "today" || day === "tonight") day = undefined;
  if (!day) return;
  if (day === "saturday" && c.s.busySat && !c.s.busySatDone && c.s.offerDay !== "saturday") {
    c.s.busySatDone = true; c.twist("busy_saturday");
    c.say("busy_saturday"); c.s.offerDay = "sunday"; c.s.dayOffered = true;
    c.hold();
    return;
  }
  if (DAY_IDS.has(day)) { c.s.day = day; agreeDay(c, day !== c.s.offerDay); }
}
/** byLearner: the learner named the day ("Saturday works for me!" from the partner);
 *  otherwise the learner accepted the partner's day ("Perfect! It's a date!"). */
function agreeDay(c: Ctx, byLearner = true) {
  if (c.s.dayAgreed) return;
  c.s.dayAgreed = true;
  if (c.s.activity && !c.s.loveSaid) { c.s.loveSaid = true; c.say("love_that"); }
  if (byLearner) c.say("day_works", { D: c.s.day });
  else if (!c.s.loveSaid) c.say("perfect");
  c.say("its_a_date");
}
function dayYes(c: Ctx) {
  if (c.s.offerDay) { c.s.day = c.s.offerDay; agreeDay(c, false); }
}

function stepYes(c: Ctx) {
  const st = date.steps.find((x) => x.id === c.step);
  if (st?.yes && !st.done(c)) st.yes(c);
}

// ---------------------------------------------------------------------------

export const date: SituationDef = {
  id: "s84-date",
  song: 84,
  songTitle: "Can I See You Again?",
  title: { en: "Can I See You Again?", lt: "Ar galiu tave vėl pamatyti?" },
  topic: { en: "A first date", lt: "Pirmasis pasimatymas" },
  chapter: 5,
  order: 5,
  location: "the-pier",
  npc: "sam",
  npcs: ["emma"],
  goal: "Pasikalbėk per pirmąjį pasimatymą ir susitarkite susitikti dar kartą.",
  intro: "Restoranas „The Pier“ prie jūros, saulėlydis. Čia tavo pirmasis pasimatymas – susipažinote internetu.",
  entities: { drink: DRINKS, hobby: HOBBIES, genre: GENRES, country: COUNTRIES, activity: ACTIVITIES, wday: WDAYS },

  grammar: {
    macros: {
      ab: "(and you | what about you | how about you | and yourself | how about yourself | what about yourself | you) #askback",
      // "No, never. Have you?", "Yes, I have. Have you been there?": the question back after a travel answer
      abt: "((and you | what about you | how about you | and yourself | how about yourself | what about yourself | you) | [and | but] (have | did) you [ever] [been there | gone there | been]) #askback",
      look: "(look | are looking | look really | look so)",
      nice_adj: "(great | amazing | beautiful | lovely | nice | wonderful | fantastic | stunning | gorgeous | handsome | good | pretty | cute | fabulous)",
      clothes: "(dress | jacket | shirt | top | shoes | earrings | scarf | outfit | style | hair | smile | glasses | watch | sweater)",
      drink_np: "[(a | an | one | a glass of | a bottle of | a pint of | some)] {drink}",
      have: "(i will have | i will get | i will take | i would like | i would love | can i get | could i get | can i have | could i have | i think i will (have | get) | i am going to (have | get) | maybe | i will go with | let me get | i want)",
      like: "(i love | i like | i really like | i really love | i enjoy | i really enjoy | i am into | i am really into | i am a big fan of | i like to | i love to)",
      when_d: "[on] {day} [(night | evening | afternoon | morning)]",
      sorry: "[(sorry | i am sorry | i am so sorry | oh no | unfortunately)]",
      isnice: "[is it (nice | beautiful | good | worth it)]",
      jacket: "(jacket | coat | sweater | scarf | hoodie)",
      hp: "(by | at | on | in | near | along) the (sea | seaside | beach | park | ocean | lake | river | forest | woods | harbor | pier | gym | pool | water)",
    },
    slots: {
      job: { lexicon: [...JOBS.map((j) => ({ id: j, forms: [j, j + "s"] })), ...JOB_PHRASES.map((j) => ({ id: j.replace(/ /g, "_"), forms: [j] }))] },
      field: { lexicon: FIELDS.map((f) => ({ id: f.replace(/^(a|an) /, "").replace(/ /g, "_"), forms: [f] })) },
      qf: { lexicon: [
        { id: "coffee", forms: ["coffee", "coffee person", "a coffee person"] }, { id: "tea", forms: ["tea", "tea person", "a tea person"] },
        { id: "cats", forms: ["cats", "cat", "a cat person", "cat person"] }, { id: "dogs", forms: ["dogs", "dog", "a dog person", "dog person"] },
        { id: "early_bird", forms: ["early bird", "an early bird", "morning person", "a morning person", "early riser"] },
        { id: "night_owl", forms: ["night owl", "a night owl", "night person", "a night person"] },
        { id: "both", forms: ["both", "both of them", "i like both", "i love both"] },
      ] },
    },
  },

  intents: {
    voc: { patterns: ["(emma | em | sam | sammy)"] },
    intro_ctx: { patterns: ["[hi | hey | hello] (i am | my name is) {name} [nice to meet you [too]]", "(hi | hey | hello) {name} here", "[hi | hey | hello] it is me [{name}]"] },
    greet_back: { patterns: [
      "[it is | it is really] [so | really] (nice | great | good | lovely) to [finally] meet you [too] [in person] #h:gr_nice",
      "[(hi | hello)] nice to meet you [too] [in person] #h:gr_nice_too", "(finally | at last)", "(great | good | nice) to [finally] see you",
      "it is [so] (nice | great | good) to see you [in person]", "hi there", "(hello | hi) again",
      "[me too] i was [really] looking forward to (this | meeting you | tonight | it)",
    ] },
    sorry_late: { patterns: [
      "[i am] [so | really] sorry (i am | for being) late #h:gr_sorry_late", "sorry to keep you waiting", "sorry for the wait", "i am late sorry",
      "[i am] [so | really] sorry (i am | i was | for being) (a (little | bit) | so | a few minutes) late", "i (am | was) (a (little | bit) | a few minutes) late [sorry]",
      "[i am] [so | really] sorry i am late i (got lost | missed the bus | could not find parking | could not find the place)", "[sorry] am i late",
    ] },
    reassure: { patterns: [
      "no (worries | problem) [at all] #h:gr_no_worries", "(that is | it is) (okay | fine | all right | no problem) #h:gr_thats_ok", "do not worry [about it]",
      "(i | we) just got here [too | myself]", "no big deal", "it happens", "you are not late [at all]", "do not be sorry",
      "(i | we) just (arrived | came) [too | myself]", "(only | just) (five | ten | two | a few | {number}) minutes [no problem]", "i was [a bit | a little] early", "i was [a bit | a little] late too",
      "[it is okay] parking [here] is (terrible | a nightmare | difficult | hard | crazy) [here]",
    ] },
    compliment: { patterns: [
      "you @look @nice_adj [tonight | today] #h:cm_look", "you @look @nice_adj too", "wow you @look @nice_adj",
      "i (love | like | really like) your @clothes #h:cm_love", "(nice | great | beautiful | lovely | cool) @clothes",
      "you have a (beautiful | great | lovely | nice) (smile | laugh)", "you are [so] (funny | sweet | nice | kind | interesting | easy to talk to)",
      "you are [so | really | very] (beautiful | pretty | handsome | gorgeous | lovely | cute | charming)", "your @clothes (looks | look | is | are) [so | really | very] @nice_adj", "you look [just | exactly] like (your | in your) (photos | pictures | photo | picture | profile)", "[aw | oh | ah] (thank you | thanks) you @look @nice_adj [too]",
    ] },
    you_too: { patterns: ["[thanks | thank you] you too #h:cm_you_too", "(so | same) do you", "you do too", "same to you", "and you look @nice_adj [too]"] },
    view: { patterns: [
      "(this place | this restaurant | it) is (great | nice | beautiful | lovely | amazing | so nice | really nice) #h:cm_place",
      "the (view | sunset | sea | ocean | harbor) is (beautiful | amazing | great | gorgeous | so beautiful | incredible) #h:cm_view",
      "(what a | such a) (beautiful | nice | great | lovely | amazing) (view | sunset | place | evening)", "look at (the | that) (sunset | view)",
      "i love (this place | the view | the sunset)",
    ] },
    come_here_often: { patterns: ["do you come here (often | a lot)", "have you been here before"] },
    // drinks
    drink_ans: { patterns: [
      "@have @drink_np [for me] [please] #h:dr_have", "@drink_np [for me] [please] #h:dr_short", "[i will have | i would like] a glass of {drink} #h:dr_glass",
      "(just | only) @drink_np [for me]", "i think @drink_np", "[a] {drink} sounds (good | great | nice)",
      "(i am driving | i have to drive) [so] [just | only] @drink_np", "let us (order | get | have) @drink_np",
    ] },
    same_drink_ans: { patterns: ["[the] same (for me | as you) #h:dr_same", "the same", "i will (take | get | have) the same [as you | thing]", "i will have the same [please]", "make that two", "i will have (that | the same) too",
      "i will have what you are having", "whatever you are having", "(the | a) same thing [for me]"] },
    me_too_ctx: { patterns: ["me too #h:nt_me_too", "same here", "same", "so did i", "me too i had a (great | nice | lovely | wonderful) time", "[yes] same for me"] },
    no_alcohol: { patterns: ["i do not drink [alcohol]", "no alcohol for me", "i am not drinking [tonight]", "nothing [alcoholic] for me", "(i am driving | i have to drive) [tonight]",
      "no (alcohol | wine | beer | {drink}) for me [tonight | thanks]", "i do not want [any] (alcohol | wine | beer | {drink}) [tonight]"] },
    ask_drink: { patterns: [
      "what (are you | will you be) (having | drinking) #h:dr_ask", "what (would you like | do you want) to drink", "what can i get you [to drink]",
      "(can | could) i get you (a | something to) drink", "what do you [usually] drink", "what (do | would) you recommend",
    ] },
    // job
    job_ans: { patterns: [
      "i am [a | an] {job} [@ab] #h:job_im", "i work as [a | an] {job} [@ab]", "i work (in | at | for) {field} [@ab] #h:job_field",
      "i am [a | an] {job} (in | at) {field} [@ab]", "[a | an] {job} [@ab]", "i am a photographer too #same_job",
      "i (have | run) my own (business | company) [@ab]", "i work (from home | in an office | in town | at brightline) [@ab]",
      "i am working (as | like) [a | an] {job} [@ab]", "i work like [a | an] {job} [@ab]", "i work with (computers | children | kids | people | cars | animals | patients | clients) [@ab]",
      "my (job | profession | work) is [a | an] {job} [@ab]", "i am [a | an] {job} [and i (love | like | really like) it] [@ab]",
      "i work for a [big | small | large | international | local] (company | firm) [@ab]", "i am in {field} [@ab]", "i (study | am studying) [at (the | a) (university | college)] [@ab]",
      "i have a [small | little] (bakery | shop | cafe | restaurant | business | company | store) [@ab]",
      "i teach [english | math | music | art | history | science | languages | lithuanian | children | kids | students | adults] [(at | in) [a | the] (school | university | college | high school | kindergarten | language school)] [@ab]",
    ] },
    job_ctx: { patterns: ["i (am | work as) (a | an) {w:any} [@ab]", "i work (in | at | for) {w:any} [@ab]"] },
    // "I'm a little nervous." (the partner is too)
    nervous: { patterns: [
      "[sorry] (i am | i feel) [a (little | bit) | a little bit | so | really | very | kind of | super | pretty] (nervous | shy) [tonight | right now | now | today] [@ab]",
      "[sorry] (it is | this is) my first date [in (a long time | years | a while)] [@ab]",
      "i have not been on a date in (a long time | years | a while)",
    ] },
    no_job: { patterns: [
      "i am (retired #retired | between jobs | looking for a job | looking for work | not working right now | unemployed | a stay at home (mom | dad | parent) | a housewife) [at the moment | right now] [@ab]",
      "i do not have a job [yet | right now] [@ab]", "i am [still] learning english [and looking for a job] [@ab]", "i do not work [right now | at the moment] [@ab]",
    ] },
    ask_like_job: { patterns: [
      "do you (like | love | enjoy) (it | your job | your work | being a photographer | photography | taking (photos | pictures) | (doing | shooting) weddings) [too]",
      "(and) do you like yours", "is (it | your job | being a photographer) (fun | interesting | hard | difficult | stressful)",
    ] },
    ask_job: { patterns: [
      "what do you do [for a living | for work] #h:job_ask", "what is your job", "where do you work", "what kind of work do you do",
      "do you work (around here | here | nearby)", "what about your job", "and what do you do",
    ] },
    // hobbies
    hobby_ans: { patterns: [
      "@like {hobby} [and {hobby}] [@ab] #h:hb_like", "(mostly | mainly) {hobby} [and {hobby}] [@ab]", "{hobby} [and {hobby}] [@ab]",
      // "I like reading and walking by the sea." (not "bye" + swimming)
      "[@like | mostly | mainly] {hobby} [@hp] [and {hobby} [@hp]] [@ab]",
      "i (go | often go | usually go) {hobby} [and {hobby}] [@ab]", "i (play | do) {hobby} [@ab]", "my (hobby is | hobbies are) {hobby} [and {hobby}] [@ab]",
      "in my free time i [like | love] [to] {hobby} [and {hobby}] [@ab] #h:hb_free", "i am really into {hobby} [@ab]",
      "i (watch | like watching | love watching) {hobby} [@ab]", "i {hobby} [a lot | often | every day | every weekend | sometimes] [@ab]",
      "@like {hobby} (in the (sea | lake | pool | mountains | park) | in (summer | winter) | on weekends | at the weekend) [@ab]",
      "@like {hobby} [especially | mostly] (lithuanian | italian | french | asian | mexican | traditional | healthy) (food | dishes | cuisine | recipes) [@ab]", "@like [to] go {hobby} [@ab]",
      "i (play | do) {hobby} with (friends | my friends | my kids | my family) [@ab]", "@like good food [and wine] [@ab]",
      "@like (spend | spending | to spend) time with (my | the) (family | friends | kids | children) [@ab]", "@like (being outside | nature | being in nature | being outdoors) [in nature] [@ab]",
    ] },
    no_hobby: { patterns: [
      "i do not have [any | many] hobbies [@ab]", "i do not have (much | a lot of) free time [@ab]", "i (just | mostly) work [@ab]", "(work | my job) is my hobby [@ab]",
      "[not much] i work a lot [@ab]",
    ] },
    ask_hobby: { patterns: [
      "what do you (do | like to do) (for fun | in your free time) #h:hb_ask", "what are your hobbies", "do you have any hobbies",
      "what do you like doing", "what do you do on [the] weekends",
    ] },
    // travel
    travel_yes_ctx: { patterns: [
      "yes i have [been there] [@abt] #h:tr_yes", "i have (been there | been to {country}) [@abt]", "yes i went there [last (year | summer)] [@abt]",
      "yes i was there [last (year | summer)] [@abt]", "yes (once | twice | many times) [@abt]", "(i have | i went | i was there) (once | twice) [@abt]",
      "yes i loved it [@abt]", "(of course | yes) it was (amazing | beautiful | great | wonderful) [@abt]",
      "yes [i was there] (two | three | a few | {number}) years ago [@abt]", "(yes | yeah | yep) i (went | was) there [last (year | summer | month | spring) | (two | a few | {number}) years ago] [@abt]", "yes i (was | have been) (in | to) {country} [@abt]",
      "yes (on | for) (my | a) (vacation | holiday | honeymoon | business trip) [@abt]", "[yes] [only] (once | twice) [for work | on vacation | on holiday] [@abt]",
      "i was there when i was (young | a child | a kid | a student) [@abt]",
    ] },
    travel_no_ctx: { patterns: [
      "[no] i have not [been there] [yet] [@abt] #h:tr_no", "[no] never [@abt]", "[no] not yet [@abt] #h:tr_not_yet",
      "[no] (never | not yet) but i would (love | like) to (go | visit) [one day | someday] [@abt]",
      "[no] i have never been (there | to {country}) [@abt]", "[no] but i would (love | like) to [go] [@abt]", "no sadly [not]",
      "[no] [not yet] but i (want | really want | hope | plan) to [go | visit] [someday | one day | soon] [@abt]",
      "[no] i have not [been there] [yet] @isnice [@abt]", "[no] [not yet] [but] it is on my [bucket] list [@abt]", "[no] [never] but i (was | have been) (in | to) {country} [@abt]",
      "[no] i was not there [@abt]", "[no] @isnice [@abt]", "unfortunately not [@abt]", "i would (love | like) to go [there] [someday | one day] [@abt]", "[no] never but i dream about it [@abt]", "[no] never but i [really] (want | would love | would like) to [go] [@abt]",
    ] },
    ask_travel: { patterns: [
      "have you [ever] been to {country} #h:tr_ask", "do you (like | love) {country}", "have you ever been to lithuania",
    ] },
    ask_travel_general: { patterns: [
      "do you (like | love) (to travel | traveling | travelling)", "where have you (traveled | travelled | been)", "have you been there",
      "have you traveled a lot",
    ] },
    // music
    music_ans: { patterns: [
      "@like {genre} [and {genre}] [@ab] #h:mu_like", "(mostly | mainly | usually) {genre} [and {genre}] [@ab] #h:mu_mostly", "{genre} [and {genre}] [@ab]",
      "i (listen to | mostly listen to | usually listen to) {genre} [and {genre}] [@ab]", "(all kinds | all kinds of music | everything | a little bit of everything | a bit of everything | anything really) [@ab] #h:mu_all",
      "i like (all kinds of music | everything | a bit of everything) [@ab]", "i listen to (everything | all kinds of music | a bit of everything | anything) [@ab]",
      "{genre} (sometimes | or | but also) {genre} [@ab]", "i like everything but (mostly | especially) {genre} [@ab]", "@like (lithuanian | american | old | classic) {genre} [@ab]", "[@like] (lithuanian | local | old | good | live | new | modern | slow | quiet | happy) music #anymusic [@ab]",
    ] },
    no_music: { patterns: ["i do not [really] (like | listen to) music [much | very much] [@ab]", "i do not [really] listen to [much] music [@ab]", "not (really | much) [@ab]"] },
    ask_music: { patterns: [
      "what [kind of] music (do you like | are you into | do you listen to) #h:mu_ask", "do you like {genre} [music]", "what do you listen to",
      "who is your favorite (band | singer | artist)",
    ] },
    and_you: { patterns: [
      "(and you | what about you | how about you | and yourself | how about yourself | what about yourself) #h:ab_and_you", "you", "what about yours", "and yours", "same question",
      "[and] (have you | do you | did you | are you | were you) [@nice_adj]", "what about you [then]",
    ] },
    like_it_ctx: { patterns: ["[yes] i (love | like | really like | enjoy | really enjoy) it #h:lj_love", "[yes] i (love | like | really like) (my job | my work | my colleagues | the people | my team)",
      "(it is | it can be) (hard | difficult | tiring | stressful) but i (like | love | enjoy) it", "[yes] it is (great | fun | good | interesting | nice | a good job)", "it is okay #h:lj_okay", "[yes] very much"] },
    dislike_it_ctx: { patterns: ["[no] i do not (like | love | really like) it [much | very much]", "[no] (it is | it can be) (boring | hard | tiring | stressful | too much)", "i hate it", "[no] not (really | much | very much) #h:lj_not"] },
    // quick questions
    qf_ctx: { patterns: ["[definitely | probably | oh] {qf} [definitely | for sure | of course | obviously] #h:qf_pick", "i am [a | an] {qf} #h:qf_pick", "i prefer {qf}", "{qf} i think"] },
    // the check
    pay_all: { patterns: [
      "let me (get | pay for | take care of) (this | it | the check | dinner) #h:ck_let_me", "(it is | this is | dinner is | tonight is) on me #h:ck_on_me",
      "i will (get | pay for | take care of) (this | it | the check | dinner | this one)", "(it is | this is) my treat", "my treat", "i insist",
      "i (would | would really) like to pay", "i will pay", "let me pay [for (it | this | dinner | everything)]", "i invite you [tonight]",
      "i (want | would like) to pay [for (you | us | dinner | this | everything)]", "[no] no (i will pay | let me (pay | get this))", "[no] let me [get it]", "(can | could | may) i pay [for (both of us | us | dinner | this | you | it | everything)] [tonight | this time]", "i (can | could) pay [for (both of us | us | dinner | this | you | it | everything)] [tonight | this time]",
    ] },
    split: { patterns: [
      "let us split (it | the check | the bill #tip:uk_bill) #h:ck_split", "(can | should | shall) we split [it | the check | the bill #tip:uk_bill]",
      "(let us | we can) pay half [each]", "half each", "(can | could | should) we pay separately", "let us pay separately", "let us share [it | the check]",
      "(we can | how about we) split (it | the check)", "[maybe] we [can | could] (split | share) [it | the check | the bill #tip:uk_bill]", "why do not we split [it | the check]", "fifty fifty", "half and half", "let us go dutch", "split it",
    ] },
    accept_offer: { patterns: ["are you sure [thank you | thanks] #h:ck_sure", "(thank you | thanks) [so much | very much] #h:ck_thanks", "that is [so] (sweet | kind | nice | generous) [of you] [thank you]", "okay [thank you] next time (it is | is) on me", "next time it is on me", "next time (i will pay | i pay | is on me)", "really [thank you | thanks]"] },
    ask_check: { patterns: ["(can | could) we (get | have) the (check | bill #tip:uk_bill)", "check please", "the check please", "where is the (check | waiter)"] },
    // the end
    nice_time: { patterns: [
      "i had a [really] (nice | great | wonderful | lovely | good | fun | amazing) (time | evening | night) [tonight] [too] #h:nt_had",
      "(this | tonight | it | the evening | the dinner) was [really] (nice | great | fun | lovely | wonderful | amazing | perfect)", "i [really] enjoyed (this | tonight | it | this evening | the evening) [very much | a lot | so much]",
      "(so did i | me too | same here) it was (fun | great | nice | lovely | wonderful | perfect)", "i am [so | really | very] (happy | glad) (we met | i came | to meet you | we did this)", "[yes] i had fun [too | tonight]", "i am glad you (liked it | had a nice time | enjoyed it)",
      "(so did i | me too | same here) i had a (great | nice | lovely | wonderful | really nice) time [too]",
    ] },
    thanks_evening: { patterns: ["thank you for [a | this | the] (lovely | great | nice | wonderful | fun | beautiful) (evening | night | time | dinner) #h:nt_thanks",
      "[me too | same here | so did i] (thank you | thanks) [so much] for [a | this | the] [lovely | great | nice | wonderful | fun | beautiful] (evening | night | dinner | company)", "thanks for (tonight | dinner | the drinks)"] },
    see_again: { patterns: [
      "(can | could | may) i see you again #h:ag_see", "(would you like to | do you want to) (see me again | go out again | do this again | meet again)",
      "(can | could) we (do this | meet | go out | see each other) again", "i would (love | like) to see you again #h:ag_love_to",
      "let us do this again", "when can i see you again", "i want to see you again", "(can | could) we meet again", "[yes] let us meet again",
    ] },
    propose_day: { patterns: [
      "(are you | would you be) free @when_d #h:ag_free", "(how about | what about | maybe) @when_d",
      "@when_d (is better | would be (better | great | perfect | good)) [for me]", "(i am | i will be) free @when_d", "@when_d sounds (good | great | perfect | fine | lovely) [for me]", "@sorry i (can not | am busy | work) [on] {nd:day} but @when_d (is fine | works | is good | is better | is perfect) [for me]", "@when_d (works | is good | is perfect | is fine) [for me] #h:ag_works",
      "(would you like to | do you want to | how about we | maybe we can | we could | let us) {activity} [@when_d] #h:ag_activity",
      "(how about | what about) [a | some] {activity} [@when_d]", "i would like to {activity} with you [@when_d]",
    ] },
    agree_again: { patterns: [
      "i would (love | like) that [very much | a lot | so much] #h:ag_id_love", "yes i would (love | like) (that | to) [@when_d] #h:ag_yes", "i would really (like | love) that", "(yes | sure) definitely",
      "(sure | yes | yeah) that works #h:dy_works", "[yes] i am free [(then | that day)] #h:dy_free",
      "i would love to [see you again]", "absolutely", "of course [i would love to]", "that would be (great | nice | lovely | wonderful)",
      "{day} (works | is good | is perfect | is fine) [for me]", "i was going to ask you (the same [thing] | that)", "[yes | sure] what time", "{day} (yes | sure) [great | perfect]",
      "[yes | sure] when [are you free]", "of course i want [to]", "[yes] very much", "{day} (works | is (good | great | perfect | fine)) what time",
    ] },
    // "Saturday evening?" (to "How about Saturday? Are you free?")
    day_ctx: { patterns: ["@when_d [at {time}]"] },
    // "Thank you for the compliment!"
    thanks_compliment: { patterns: ["(thank you | thanks) [so much] for the compliment"] },
    decline_again: { patterns: [
      "@sorry i do not think (so | that is a good idea) #h:ag_no", "@sorry i can not [on {day}]", "@sorry i am busy [(on {day} | that day)] #h:dy_busy", "@sorry not on {day}",
      "@sorry i (have | have got) plans [on {day}]", "maybe not", "i do not think we are a [good] match",
      "@sorry i (work | am working | have to work) [on {day}]", "@sorry i am not free [(on {day} | that day)]", "[no] {day} i (can not | am busy | work)", "[no] i do not want to [see you again | meet again | go out again]", "[sorry] {day} (is not | does not) (good | work | okay | ok) [for me]",
    ] },
    walk_home: { patterns: [
      "(can | may | could) i walk you home #h:wk_walk", "(do you want | would you like) me to walk you home", "let me walk you home",
      "i can walk you home", "(can | may | could) i walk you to your car",
    ] },
    offer_jacket: { patterns: [
      "[here] take my jacket #h:jk_take", "(do you want | would you like) my jacket #h:jk_want", "you can have my jacket", "here you can wear my jacket",
      "[here] take my @jacket", "(do you want | would you like) my @jacket", "you can (take | have | wear) my @jacket",
    ] },
    text_reply: { patterns: [
      "i will [text you] [when i get home] #h:tx_will", "(sure | okay | of course) i will", "you too #h:tx_you_too", "text me too", "i will text you",
      "(okay | sure) [i will] you too", "[yes] i promise", "i will [text you] do not worry",
    ] },
    hesitate: { patterns: ["maybe", "perhaps", "i will think about it", "let me think about it", "we will see", "possibly"] },
    no_sorry: { patterns: ["(no | nope) sorry", "sorry no", "sorry not (really | this time)", "no i am sorry"] },
    // "That's interesting!", "Wow, how cool!": a reaction to what the partner said (no yes/no meaning)
    react_nice: { patterns: [
      "[oh | wow] (that is | that sounds | it sounds | sounds) [so | really | very | pretty | super] (interesting | fascinating | exciting | cool | amazing | awesome)",
      "[oh | wow] how (interesting | cool | exciting | fascinating)", "(wow | interesting | how interesting)",
    ] },
    agree: { patterns: [
      "(yes | yeah | yep | sure | okay) (sure | of course | definitely | absolutely | why not | sounds good | sounds great | that works | perfect | great | cool | awesome | please)",
      "that sounds (good | great | perfect | nice)", "works for me",
    ] },
    g_bye: { patterns: [
      "(bye | goodbye | bye bye | see you | see you later | see you soon | take care | good night | talk to you later) #h:tx_good_night",
      "have a (nice | good | great | lovely) (day | one | evening | night | weekend)", "sleep well", "sweet dreams", "(good night | bye) see you {day}",
      // "Sorry, I have to go.", "I'll call you later.": the shared leaving phrases (global.ts)
      ...LEAVING_PATTERNS,
    ] },
  },

  lines: {
    // hello
    open_late: [
      t("Hi! | Sorry | I'm | late! | I | turned | left | instead of | right!", "Labas! | Atsiprašau, | aš | vėluoju! | Aš | pasukau | į kairę | o ne | į dešinę!",
        "Labas! Atsiprašau, kad vėluoju! Pasukau į kairę, o ne į dešinę!", { flags: { 2: "“’m” (am) has no separate word: Lithuanian uses the verb vėluoju for “be late”." } }),
      t("Hey! | So | sorry | I'm | late! | Parking | was | a | nightmare.", "Labas! | Labai | atsiprašau, | aš | vėluoju! | Parkavimas | buvo | — | košmaras.",
        "Labas! Labai atsiprašau, kad vėluoju! Rasti vietą mašinai buvo tikras košmaras.", { flags: { 3: "“’m” (am) has no separate word: Lithuanian uses the verb vėluoju for “be late”." } }),
    ],
    open_early: [
      t("Hi! | There you are! | Wow, | you | look | great!", "Labas! | Štai ir tu! | Oho, | tu | atrodai | puikiai!", "Labas! Štai ir tu! Oho, puikiai atrodai!"),
      t("Hey, | you're | here! | You | look | amazing.", "Labas, | tu esi | čia! | Tu | atrodai | nuostabiai.", "Labas, tu jau čia! Atrodai nuostabiai."),
    ],
    open_meet: [
      t("Hi! | It's | so | nice | to meet | you | in person!", "Labas! | Tai yra | taip | malonu | susipažinti | su tavimi | gyvai!", "Labas! Taip malonu su tavimi susipažinti gyvai!"),
      t("Hi! | Finally! | It's | great | to meet | you.", "Labas! | Pagaliau! | Tai yra | puiku | susipažinti | su tavimi.", "Labas! Pagaliau! Puiku su tavimi susipažinti."),
    ],
    hello_again: [
      t("So... | hi!", "Tai... | labas!", "Tai... labas!"),
    ],
    phew: [
      t("Phew! | Thanks | for waiting.", "Uf! | Ačiū, | kad palaukei.", "Uf! Ačiū, kad palaukei."),
      t("Oh, | good. | Thanks | for waiting!", "O, | gerai. | Ačiū, | kad palaukei!", "O, gerai. Ačiū, kad palaukei!"),
    ],
    you_are_fine: [
      t("No, | I'm | the | one | who's | late! | Thanks | for waiting.", "Ne, | tai aš | — | tas | kuris | vėluoja! | Ačiū, | kad palaukei.",
        "Ne, tai aš vėluoju! Ačiū, kad palaukei.", { flags: { 4: "“who's” (who is): the verb vėluoja carries “is”." } }),
    ],
    just_got_here: [
      t("Don't worry! | I | just | got | here | myself.", "Nesijaudink! | Aš | ką tik | atėjau | čia | {sm:pats|sf:pati}.", "Nesijaudink! Aš ir {sm:pats|sf:pati} ką tik atėjau."),
    ],
    thanks_compliment: [
      t("Aw, | thank | you! | You | look | great | too.", "Oi, | ačiū | tau! | Tu | atrodai | puikiai | irgi.", "Oi, ačiū! Tu irgi puikiai atrodai."),
      t("Aw, | that's | so | sweet. | Thank | you!", "Oi, | tai | taip | miela. | Ačiū | tau!", "Oi, kaip miela. Ačiū!"),
    ],
    aw: [
      t("Aw, | thanks!", "Oi, | ačiū!", "Oi, ačiū!"),
    ],
    view: [
      t("Isn't it? | I | love | the | sunset | here.", "Ar ne? | Aš | dievinu | — | saulėlydį | čia.", "Ar ne? Dievinu saulėlydį čia."),
      t("I | know, | right? | The | view | is | amazing.", "Aš | žinau, | ar ne? | — | Vaizdas | yra | nuostabus.", "Tikrai! Vaizdas nuostabus."),
    ],
    not_often: [
      t("Ha! | Not | really. | But | I | love | the | view.", "Cha! | Ne | visai. | Bet | aš | dievinu | — | vaizdą.", "Cha! Ne itin. Bet dievinu šį vaizdą."),
    ],
    // drinks
    ask_drinks: [
      t("So, | what | would | you | like | to drink?", "Tai | ką | — | tu | norėtum | išgerti?", "Tai ką norėtum išgerti?",
        { flags: { 2: "“would”: the conditional ending of norėtum carries it (linked to “like”)." } }),
      t("Should | we | get | some | drinks?", "Ar turėtume | mes | užsisakyti | — | gėrimų?", "Gal užsisakome ko nors išgerti?",
        { flags: { 3: "Partitive: the genitive gėrimų carries “some”." } }),
    ],
    ask_drinks_back: [
      t("And | you?", "O | tu?", "O tu?"),
    ],
    own_drink: [
      t("I | think | I'll have | a | glass | of | white | wine.", "Aš | manau, | imsiu | — | taurę | — | baltojo | vyno.", "Manau, imsiu taurę baltojo vyno.",
        { flags: { 5: "“of”: the genitive ending of vyno carries it (white intervenes)." } }),
    ],
    good_choice: [
      t("Good | choice!", "Geras | pasirinkimas!", "Geras pasirinkimas!"),
      t("Nice!", "Šaunu!", "Šaunu!"),
    ],
    same_drink: [
      t("Perfect, | two | glasses | of | white, | then!", "Puiku, | dvi | taurės | — | baltojo, | tada!", "Puiku, tada dvi taurės baltojo!",
        { flags: { 3: "“of”: the genitive ending of baltojo carries it." } }),
    ],
    no_alcohol_ok: [
      t("Sure, | no | problem! | They | have | great | lemonade | here.", "Žinoma, | jokių | problemų! | Jie | turi | puikų | limonadą | čia.", "Žinoma, jokių problemų! Čia puikus limonadas."),
    ],
    // job
    ask_job: [
      t("So, | tell | me | about | yourself. | What | do | you | do?", "Tai | papasakok | man | apie | save. | Ką | — | tu | veiki?", "Tai papasakok apie save. Kuo užsiimi?",
        { flags: { 6: "Question “do” has no Lithuanian word (linked to the second “do”, veiki)." } }),
      t("So, | what | do | you | do?", "Tai | ką | — | tu | veiki?", "Tai kuo užsiimi?", { flags: { 2: "Question “do” has no Lithuanian word (linked to the second “do”, veiki)." } }),
    ],
    ask_back: [
      t("What about | you?", "O kaip | tu?", "O tu?"),
      t("How about | you?", "O kaip | tu?", "O tu?"),
    ],
    job_react: [
      t("Oh, | cool!", "O, | šaunu!", "O, šaunu!"),
      t("That | sounds | interesting!", "Tai | skamba | įdomiai!", "Skamba įdomiai!"),
      t("Wow, | that's | great!", "Oho, | tai | puiku!", "Oho, puiku!"),
    ],
    same_job: [
      t("No way! | Me | too!", "Negali būti! | Aš | irgi!", "Negali būti! Aš irgi!"),
    ],
    retired_react: [
      t("Oh, | nice! | So | you | have | time | for | fun | things.", "O, | šaunu! | Taigi | tu | turi | laiko | — | smagiems | dalykams.", "O, šaunu! Vadinasi, turi laiko smagiems dalykams.",
        { flags: { 6: "“for”: the dative ending of smagiems dalykams carries it." } }),
    ],
    no_job_react: [
      t("Good luck! | I'm | sure | you'll find | something | great.", "Sėkmės! | Aš esu | {sm:tikras|sf:tikra}, | rasi | ką nors | puikaus.", "Sėkmės! Esu {sm:tikras|sf:tikra}, kad rasi ką nors puikaus."),
    ],
    like_job_q: [
      t("Do | you | like | it?", "Ar | tau | patinka | tai?", "Ar tau patinka?", { flags: { 0: "Question “Do” = the particle ar." } }),
    ],
    thats_great: [
      t("That's | great!", "Tai | puiku!", "Puiku!"),
    ],
    not_every_job: [
      t("Oh well, | not | every | job | is | fun.", "Na, ką padarysi, | ne | kiekvienas | darbas | yra | smagus.", "Na, ne kiekvienas darbas būna smagus."),
    ],
    own_like_job: [
      t("I | love | it! | Every | wedding | is | different.", "Aš | dievinu | jį! | Kiekvienos | vestuvės | yra | kitokios.", "Dievinu jį! Kiekvienos vestuvės kitokios."),
    ],
    own_job: [
      t("I'm | a | photographer. | I | mostly | do | weddings.", "Aš esu | — | {sm:fotografas|sf:fotografė}. | Aš | daugiausia | fotografuoju | vestuves.",
        "Aš {sm:fotografas|sf:fotografė}. Daugiausia fotografuoju vestuves."),
    ],
    told_you: [
      t("Ha, | I | told | you!", "Cha, | aš | sakiau | tau!", "Cha, juk sakiau!"),
    ],
    // hobbies
    ask_hobby: [
      t("What | do | you | do | for fun?", "Ką | — | tu | veiki | laisvalaikiu?", "Ką veiki laisvalaikiu?", { flags: { 1: "Question “do” has no Lithuanian word (linked to the second “do”, veiki)." } }),
      t("So, | what | are | your | hobbies?", "Tai | kokie | yra | tavo | pomėgiai?", "Tai kokie tavo pomėgiai?"),
    ],
    hobby_react: [
      t("Oh, | nice! | That | sounds | fun.", "O, | šaunu! | Tai | skamba | smagiai.", "O, šaunu! Skamba smagiai."),
      t("Cool! | I | like | that.", "Šaunu! | Man | patinka | tai.", "Šaunu! Man tai patinka."),
    ],
    hobby_try: [
      t("Cool! | I've | always | wanted | to try | that.", "Šaunu! | Aš | visada | norėjau | pabandyti | tai.", "Šaunu! Visada norėjau tai pabandyti.",
        { flags: { 1: "“’ve” (have): the past tense of norėjau carries the perfect." } }),
    ],
    same_hobby: [
      t("No way, | I | love | {H} | too!", "Negali būti, | aš | mėgstu | {H:acc} | irgi!", "Negali būti, aš irgi mėgstu {H:acc}!"),
    ],
    own_hobby: [
      t("I | love | to cook, | and | I | love | the | sea.", "Aš | mėgstu | gaminti, | ir | aš | myliu | — | jūrą.", "Mėgstu gaminti ir myliu jūrą."),
    ],
    busy_life: [
      t("Ha, | I | get | it. | Life | is | busy!", "Cha, | aš | suprantu | tai. | Gyvenimas | yra | įtemptas!", "Cha, suprantu. Gyvenimas įtemptas!"),
    ],
    no_music_react: [
      t("Really? | Wow, | that's | a | first!", "Tikrai? | Oho, | tai yra | — | pirmas kartas!", "Tikrai? Oho, tokio dar nesu {sm:girdėjęs|sf:girdėjusi}!",
        { flags: { 4: "“a first” (something new): pirmas kartas." } }),
    ],
    // travel
    ask_travel: [
      t("Have | you | ever | been | to {C}?", "Ar | tu | kada nors | {m:esi buvęs|f:esi buvusi} | {C:loc}?", "Ar kada nors {m:esi buvęs|f:esi buvusi} {C:loc}?",
        { flags: { 0: "“Have” in a yes/no question = the particle ar; the perfect sits on esi buvęs (linked to “been”)." } }),
    ],
    travel_yes_react: [
      t("Lucky you! | I | went | there | last | summer.", "Tau pasisekė! | Aš | buvau | ten | praėjusią | vasarą.", "Tau pasisekė! Aš ten buvau praėjusią vasarą."),
      t("Me | too! | Wasn't | it | amazing?", "Aš | irgi! | Argi nebuvo | tai | nuostabu?", "Aš irgi! Argi ne nuostabu?"),
    ],
    travel_no_react: [
      t("Oh, | you | have | to go! | {C} | is | beautiful.", "O, | tu | privalai | nuvažiuoti! | {C:nom} | yra | nuostabi.", "O, būtinai turi nuvažiuoti! {C:nom} nuostabi."),
    ],
    own_travel: [
      t("Yes! | I | went | to {C} | last | summer. | I | loved | it!", "Taip! | Aš | buvau | {C:loc} | praėjusią | vasarą. | Man | labai patiko | tai!",
        "Taip! Praėjusią vasarą buvau {C:loc}. Labai patiko!"),
    ],
    never_lithuania: [
      t("Not | yet! | Maybe | you | can | show | me | around | someday.", "Dar | ne! | Gal | tu | galėsi | aprodyti | man | viską | kada nors.",
        "Dar ne! Gal kada nors galėsi man viską aprodyti.", { flags: { 7: "“around” (show around): Lithuanian adds viską (everything) to aprodyti." } }),
    ],
    // music
    ask_music: [
      t("What | music | do | you | like?", "Kokia | muzika | — | tau | patinka?", "Kokia muzika tau patinka?", { flags: { 2: "Question “do” has no Lithuanian word (linked to “like”)." } }),
      t("What | kind | of music | do | you | like?", "Kokią | rūšį | muzikos | — | tu | mėgsti?", "Kokią muziką mėgsti?", { flags: { 3: "Question “do” has no Lithuanian word (linked to “like”)." } }),
    ],
    music_react: [
      t("Ooh, | nice | taste!", "O, | geras | skonis!", "O, geras skonis!"),
      t("Nice!", "Šaunu!", "Šaunu!"),
    ],
    music_react_all: [
      t("Ha, | good | answer!", "Cha, | geras | atsakymas!", "Cha, geras atsakymas!"),
    ],
    same_music: [
      t("Me | too! | I | love | {G}.", "Aš | irgi! | Aš | dievinu | {G:acc}.", "Aš irgi! Dievinu {G:acc}."),
    ],
    own_music: [
      t("Jazz, | mostly. | And | a | bit | of disco!", "Džiazas, | daugiausia. | Ir | — | truputį | disko!", "Daugiausia džiazas. Ir truputį disko!"),
    ],
    me_generic: [
      t("Me? | I'm having | a | great | time!", "Aš? | Aš leidžiu | — | puikiai | laiką!", "Aš? Puikiai leidžiu laiką!"),
    ],
    // quick questions
    qf_intro: [
      t("Okay, | quick | questions!", "Gerai, | greiti | klausimai!", "Gerai, keli greiti klausimai!"),
    ],
    qf_coffee: [
      t("Coffee | or | tea?", "Kava | ar | arbata?", "Kava ar arbata?"),
    ],
    qf_cats: [
      t("Cats | or | dogs?", "Katės | ar | šunys?", "Katės ar šunys?"),
    ],
    qf_owl: [
      t("Early bird | or | night owl?", "Vyturys | ar | pelėda?", "Vyturys ar pelėda?"),
    ],
    qf_me_too: [
      t("Me | too!", "Aš | irgi!", "Aš irgi!"),
    ],
    qf_tea: [
      t("Tea? | Okay, | I'll allow | it.", "Arbata? | Gerai, | leisiu | tai.", "Arbata? Gerai, atleisiu."),
    ],
    qf_dogs: [
      t("Oh | no... | I | have | a | cat | named | Lou!", "O | ne... | Aš | turiu | — | katę | vardu | Lu!", "O ne... Aš turiu katę, vardu Lu!"),
    ],
    qf_cats_yes: [
      t("Yes! | I | have | a | cat | named | Lou!", "Taip! | Aš | turiu | — | katę | vardu | Lu!", "Taip! Aš turiu katę, vardu Lu!"),
    ],
    qf_early: [
      t("Really? | I'm | never | up | before | ten!", "Tikrai? | Aš | niekada | nesikeliu | anksčiau | dešimtos!", "Tikrai? Aš niekada nesikeliu anksčiau nei dešimtą!",
        { flags: { 1: "“’m … up”: Lithuanian says nesikeliu (never get up); the negation comes from niekada (concord)." } }),
    ],
    qf_owl_yes: [
      t("Same! | Nobody's | perfect.", "Aš irgi! | Niekas nėra | tobulas.", "Aš irgi! Niekas nėra tobulas.", { flags: { 1: "“Nobody's” = nobody is: negative concord gives niekas nėra." } }),
    ],
    qf_both: [
      t("Ha, | good | answer!", "Cha, | geras | atsakymas!", "Cha, geras atsakymas!"),
    ],
    // the check
    not_ordered_yet: [
      t("Ha! | We | haven't | even | ordered | yet!", "Cha! | Mes | — | net | neužsisakėme | dar!", "Cha! Mes dar net neužsisakėme!",
        { flags: { 2: "“haven't … ordered” is split by “even”: the negated verb neužsisakėme stands under “ordered”." } }),
    ],
    so_check: [
      t("So, | what | do | you | think | about | the | check?", "Tai | ką | — | tu | manai | apie | — | sąskaitą?", "Tai ką manai dėl sąskaitos?",
        { flags: { 2: "Question “do” has no Lithuanian word (linked to “think”)." } }),
    ],
    check_here: [
      t("Oh, | here's | the | check.", "O, | štai | — | sąskaita.", "O, štai sąskaita."),
    ],
    partner_offers: [
      t("Let | me | get | this.", "Leisk | man | sumokėti | už tai.", "Leisk man sumokėti."),
    ],
    thanks_pay: [
      t("Are | you | sure? | Thank | you! | Next | time | it's on me.", "Ar | tu | {m:tikras|f:tikra}? | Ačiū | tau! | Kitą | kartą | aš vaišinu.", "Ar tikrai? Ačiū! Kitą kartą vaišinu aš."),
    ],
    already_paid: [
      t("Too | late, | it's | done!", "Per | vėlu, | tai yra | padaryta!", "Per vėlu – jau sumokėta!"),
    ],
    deal: [
      t("Deal!", "Sutarta!", "Sutarta!"),
      t("Sounds | fair!", "Skamba | sąžiningai!", "Sąžininga!"),
    ],
    my_pleasure: [
      t("My | pleasure! | You | can | get | the | next | one.", "Mano | malonumas! | Tu | galėsi | sumokėti | — | kitą | kartą.", "Malonu! Kitą kartą galėsi sumokėti tu."),
    ],
    // the end of the evening
    cold: [
      t("Brr, | it's getting | cold.", "Brr, | darosi | šalta.", "Brr, darosi šalta."),
    ],
    so_sweet: [
      t("Aw, | you're | so | sweet!", "Oi, | tu esi | {m:toks|f:tokia} | {m:mielas|f:miela}!", "Oi, {m:toks mielas|f:tokia miela}!"),
    ],
    nice_time: [
      t("I | had | a | really | nice | time | tonight.", "Aš | praleidau | — | tikrai | puikiai | laiką | šįvakar.", "Šįvakar tikrai puikiai praleidau laiką."),
    ],
    me_too_nice: [
      t("Me | too! | I | had | a | great | time.", "Aš | irgi! | Aš | praleidau | — | puikiai | laiką.", "Aš irgi! Puikiai praleidau laiką."),
    ],
    glad: [
      t("I'm | so | glad.", "Aš | taip | {sm:džiaugiuosi|sf:džiaugiuosi}.", "Labai džiaugiuosi.", { flags: { 0: "“’m” (am) has no separate word: džiaugiuosi (be glad) is a verb." } }),
    ],
    thank_you_too: [
      t("Thank | you! | I | had | a | great | time.", "Ačiū | tau! | Aš | praleidau | — | puikiai | laiką.", "Ačiū! Puikiai praleidau laiką."),
    ],
    can_i_see_you: [
      t("So... | can | I | see | you | again?", "Tai... | ar galiu | aš | pamatyti | tave | vėl?", "Tai... ar galiu tave vėl pamatyti?"),
    ],
    id_like_that: [
      t("I'd like | that. | I'd | really | like | that.", "Norėčiau | to. | Aš | tikrai | norėčiau | to.", "Norėčiau. Labai norėčiau.",
        { flags: { 2: "“’d” (would): the conditional ending of norėčiau carries it (linked to “like”)." } }),
    ],
    yay_great: [
      t("Yay! | Great!", "Valio! | Puiku!", "Valio! Puiku!"),
    ],
    are_you_free_on: [
      t("Are | you | free | on {D}?", "Ar esi | tu | {m:laisvas|f:laisva} | {D:acc}?", "Ar {D:acc} {m:esi laisvas|f:esi laisva}?"),
      t("How about | {D}? | Are | you | free?", "Gal | {D:acc}? | Ar esi | tu | {m:laisvas|f:laisva}?", "Gal {D:acc}? Ar {m:esi laisvas|f:esi laisva}?"),
    ],
    when_free: [
      t("When | are | you | free?", "Kada | esi | tu | {m:laisvas|f:laisva}?", "Kada {m:esi laisvas|f:esi laisva}?"),
    ],
    busy_saturday: [
      t("Oh, | I'm visiting | my | parents | on Saturday. | How about | Sunday?", "O, | lankau | savo | tėvus | šeštadienį. | Gal | sekmadienį?", "O, šeštadienį lankau tėvus. Gal sekmadienį?"),
    ],
    how_about_sunday: [
      t("Hmm, | how about | Sunday, | then?", "Hmm, | gal | sekmadienį, | tada?", "Hmm, tada gal sekmadienį?"),
    ],
    day_works: [
      t("Great, | {D} | works | for me!", "Puiku, | {D:nom} | tinka | man!", "Puiku, man tinka {D:nom}!"),
    ],
    love_that: [
      t("I'd love | that.", "Labai norėčiau | to.", "Labai norėčiau."),
    ],
    its_a_date: [
      t("It's | a | date!", "Tai yra | — | pasimatymas!", "Tai – pasimatymas!"),
    ],
    think_about_it: [
      t("No | pressure. | Think | about | it!", "Jokio | spaudimo. | Pagalvok | apie | tai!", "Jokio spaudimo – pagalvok!"),
    ],
    no_pressure: [
      t("Oh... | okay. | No | pressure. | It was | nice | to meet | you.", "O... | gerai. | Jokio | spaudimo. | Buvo | malonu | susipažinti | su tavimi.",
        "O... gerai. Nieko tokio. Buvo malonu susipažinti."),
    ],
    id_like_walk: [
      t("I'd like | that. | It's | just | down | the | street.", "Norėčiau | to. | Tai yra | visai | netoli | — | gatvėje.", "Būtų malonu. Tai čia pat, šioje gatvėje.",
        { flags: { 4: "“down the street”: netoli (not far) + the locative gatvėje; “down” has no word of its own." } }),
    ],
    live_close: [
      t("That's | so | sweet! | But | I | live | right | around | the | corner.", "Tai | taip | miela! | Bet | aš | gyvenu | visai | už | — | kampo.",
        "Kaip miela! Bet aš gyvenu visai čia pat, už kampo."),
    ],
    nervous_too: [
      t("Aw, | don't worry! | I'm | a little | nervous | too.", "Oi, | nesijaudink! | Aš esu | truputį | {sm:susijaudinęs|sf:susijaudinusi} | irgi.", "Oi, nesijaudink! Aš irgi truputį jaudinuosi."),
    ],
    leaving_already: [
      t("Wait, | are | you | leaving | already?", "Palauk, | ar | tu | išeini | jau?", "Palauk, tu jau išeini?",
        { flags: { 1: "Progressive “are” in a question = the particle ar; išeini carries the tense (linked to “leaving”)." } }),
    ],
    text_me: [
      t("Text | me | when | you | get | home, | okay?", "Parašyk | man, | kai | tu | pareisi | namo, | gerai?", "Parašyk, kai pareisi namo, gerai?"),
    ],
    good_night: [
      t("Good | night!", "Labos | nakties!", "Labos nakties!"),
      t("Good | night! | Get | home | safe.", "Labos | nakties! | Pareik | namo | saugiai.", "Labos nakties! Saugiai pareik namo."),
    ],
    will_too: [
      t("I | will. | Good | night!", "Aš | [parašysiu]. | Labos | nakties!", "Parašysiu. Labos nakties!", { flags: { 1: "Elliptical “will”: Lithuanian repeats the verb (parašysiu)." } }),
    ],
    perfect: [
      t("Perfect!", "Puiku!", "Puiku!"),
      t("Great!", "Puiku!", "Puiku!"),
    ],
    if_you_insist: [
      t("Okay, | if | you | insist! | Thank | you!", "Gerai, | jei | tu | primygtinai prašai! | Ačiū | tau!", "Gerai, jei jau taip nori! Ačiū!"),
    ],
    anytime: [
      t("Anytime!", "Visada prašom!", "Visada prašom!"),
    ],
  },

  hints: {
    hello_late: {
      lt: "Pasakyti, kad nieko tokio",
      items: [
        { id: "gr_no_worries", s: t("No | worries!", "Jokių | rūpesčių!", "Nieko tokio!") },
        { id: "gr_thats_ok", s: t("That's | okay!", "Tai | gerai!", "Nieko tokio!") },
        { id: "gr_nice_too", s: t("Hi! | Nice | to meet | you!", "Labas! | Malonu | susipažinti | su tavimi!", "Labas! Malonu susipažinti!") },
      ],
    },
    hello_early: {
      lt: "Padėkoti už komplimentą",
      items: [
        { id: "cm_you_too", s: t("Thanks! | You | too!", "Ačiū! | Tu | irgi!", "Ačiū! Tu irgi!") },
        { id: "gr_sorry_late", s: t("Sorry | I'm | late!", "Atsiprašau, | aš | vėluoju!", "Atsiprašau, kad vėluoju!",
          { flags: { 1: "“’m” (am) has no separate word: Lithuanian uses the verb vėluoju for “be late”." } }) },
        { id: "gr_nice_too", s: t("Hi! | Nice | to meet | you!", "Labas! | Malonu | susipažinti | su tavimi!", "Labas! Malonu susipažinti!") },
      ],
    },
    hello_meet: {
      lt: "Pasisveikinti",
      items: [
        { id: "gr_nice_too", s: t("Nice | to meet | you | too!", "Malonu | susipažinti | su tavimi | irgi!", "Man irgi malonu susipažinti!") },
        { id: "cm_look", s: t("You | look | great!", "Tu | atrodai | puikiai!", "Puikiai atrodai!") },
        { id: "gr_nice", s: t("It's | so | nice | to meet | you!", "Tai yra | taip | malonu | susipažinti | su tavimi!", "Taip malonu su tavimi susipažinti!") },
      ],
    },
    compliments: {
      lt: "Pasakyti ką nors malonaus",
      items: [
        { id: "cm_look", s: t("You | look | great!", "Tu | atrodai | puikiai!", "Puikiai atrodai!") },
        { id: "cm_love", s: t("I | love | your | jacket.", "Man | labai patinka | tavo | švarkas.", "Man labai patinka tavo švarkas.") },
        { id: "cm_view", s: t("The | view | is | beautiful!", "— | Vaizdas | yra | nuostabus!", "Vaizdas nuostabus!") },
        { id: "cm_place", s: t("This | place | is | great!", "Ši | vieta | yra | puiki!", "Puiki vieta!") },
      ],
    },
    drinks: {
      lt: "Pasirinkti gėrimą", slot: "drink", examples: ["white_wine", "red_wine", "beer", "lemonade"],
      items: [
        { id: "dr_short", s: t("{X.np}, | please.", "{X.np:acc}, | prašau.", "{X.np:acc}, prašau.") },
        { id: "dr_have", s: t("I'll have | {X.np}.", "Imsiu | {X.np:acc}.", "Imsiu {X.np:acc}.") },
        { id: "dr_same", s: t("Same | for me.", "Tą patį | man.", "Man tą patį.") },
        { id: "dr_glass", s: t("A | glass | of | {X}, | please.", "— | Taurę | — | {X:gen}, | prašau.", "Taurę {X:gen}, prašau.",
          { flags: { 2: "“of”: the genitive ending carries it." } }), only: (e) => !!e.attrs?.glass },
        { id: "dr_ask", s: t("What | are | you | having?", "Ką | — | tu | imsi?", "Ką imsi?", { flags: { 1: "Progressive “are” has no separate word; imsi (future) carries it (linked to “having”)." } }) },
      ],
    },
    job: {
      lt: "Papasakoti apie darbą",
      items: [
        { id: "job_im", s: t("I'm | a | nurse.", "Aš esu | — | {m:slaugytojas|f:slaugytoja}.", "Aš – {m:slaugytojas|f:slaugytoja}.") },
        { id: "job_field", s: t("I | work | in IT.", "Aš | dirbu | IT srityje.", "Dirbu IT srityje.") },
        { id: "job_im", s: t("I'm | a | teacher. | And | you?", "Aš esu | — | {m:mokytojas|f:mokytoja}. | O | tu?", "Aš – {m:mokytojas|f:mokytoja}. O tu?") },
        { id: "job_field", s: t("I | work | at a hotel.", "Aš | dirbu | viešbutyje.", "Dirbu viešbutyje.") },
        { id: "job_ask", s: t("What | do | you | do?", "Ką | — | tu | veiki?", "Kuo užsiimi?", { flags: { 1: "Question “do” has no Lithuanian word (linked to the second “do”, veiki)." } }) },
      ],
    },
    hobbies: {
      lt: "Papasakoti apie pomėgius", slot: "hobby", examples: ["cooking", "hiking", "reading", "yoga"],
      items: [
        { id: "hb_like", s: t("I | love | {X}.", "Aš | mėgstu | {X:acc}.", "Mėgstu {X:acc}.") },
        { id: "hb_like", s: t("I | really | like | {X}. | And | you?", "Aš | labai | mėgstu | {X:acc}. | O | tu?", "Labai mėgstu {X:acc}. O tu?") },
        { id: "hb_free", s: t("In | my | free | time, | I | like | {X}.", "— | Savo | laisvą | laiką, | aš | mėgstu | {X:acc}.", "Laisvalaikiu mėgstu {X:acc}.",
          { flags: { 0: "“In”: Lithuanian uses the accusative of time (savo laisvą laiką) with no preposition." } }) },
        { id: "hb_ask", s: t("What | do | you | do | for fun?", "Ką | — | tu | veiki | laisvalaikiu?", "Ką veiki laisvalaikiu?", { flags: { 1: "Question “do” has no Lithuanian word (linked to the second “do”, veiki)." } }) },
      ],
    },
    travel: {
      lt: "Atsakyti apie keliones",
      items: [
        { id: "tr_yes", s: t("Yes, | I | have! | And | you?", "Taip, | aš | [{m:esu buvęs|f:esu buvusi}]! | O | tu?", "Taip, {m:esu buvęs|f:esu buvusi}! O tu?",
          { flags: { 2: "Elliptical “have”: Lithuanian repeats the verb (esu buvęs)." } }) },
        { id: "tr_not_yet", s: t("Not | yet!", "Dar | ne!", "Dar ne!") },
        { id: "tr_no", s: t("No, | never. | But | I'd love | to go!", "Ne, | niekada. | Bet | labai norėčiau | nuvažiuoti!", "Ne, niekada. Bet labai norėčiau nuvažiuoti!") },
        { id: "tr_ask", s: t("Have | you | ever | been | to Lithuania?", "Ar | tu | kada nors | {sm:esi buvęs|sf:esi buvusi} | Lietuvoje?", "Ar kada nors {sm:esi buvęs|sf:esi buvusi} Lietuvoje?",
          { flags: { 0: "“Have” in a yes/no question = the particle ar; the perfect sits on esi buvęs (linked to “been”)." } }) },
      ],
    },
    music: {
      lt: "Papasakoti apie muziką", slot: "genre", examples: ["jazz", "rock", "pop", "classical"],
      items: [
        { id: "mu_like", s: t("I | love | {X}.", "Aš | dievinu | {X:acc}.", "Dievinu {X:acc}.") },
        { id: "mu_mostly", s: t("Mostly | {X}. | And | you?", "Daugiausia | {X:acc}. | O | tu?", "Daugiausia {X:acc}. O tu?") },
        { id: "mu_all", s: t("A | bit | of everything.", "— | Truputį | visko.", "Truputį visko.") },
        { id: "mu_ask", s: t("What | music | do | you | like?", "Kokia | muzika | — | tau | patinka?", "Kokia muzika tau patinka?", { flags: { 2: "Question “do” has no Lithuanian word (linked to “like”)." } }) },
      ],
    },
    ask_back: {
      lt: "Paklausti to paties",
      items: [
        { id: "ab_and_you", s: t("And | you?", "O | tu?", "O tu?") },
        { id: "ab_and_you", s: t("What about | you?", "O kaip | tu?", "O tu?") },
        { id: "ab_and_you", s: t("How about | you?", "O kaip | tu?", "O tu?") },
      ],
    },
    check: {
      lt: "Susitarti dėl sąskaitos",
      items: [
        { id: "ck_let_me", s: t("Let | me | get | this.", "Leisk | man | sumokėti | už tai.", "Leisk man sumokėti.") },
        { id: "ck_split", s: t("Let's split | it.", "Padalinkime | ją.", "Padalinkime sąskaitą.") },
        { id: "ck_on_me", s: t("It's on me.", "Aš vaišinu.", "Aš vaišinu.") },
        { id: "ck_sure", s: t("Are | you | sure? | Thank | you!", "Ar | tu | {sm:tikras|sf:tikra}? | Ačiū | tau!", "Ar tikrai? Ačiū!") },
      ],
    },
    nice_time: {
      lt: "Pasakyti, kad buvo smagu",
      items: [
        { id: "nt_me_too", s: t("Me | too!", "Aš | irgi!", "Aš irgi!") },
        { id: "nt_had", s: t("I | had | a | really | nice | time.", "Aš | praleidau | — | tikrai | puikiai | laiką.", "Tikrai puikiai praleidau laiką.") },
        { id: "nt_thanks", s: t("Thank | you | for | a | lovely | evening.", "Ačiū | tau | už | — | nuostabų | vakarą.", "Ačiū už nuostabų vakarą.") },
      ],
    },
    again: {
      lt: "Pasiūlyti susitikti dar kartą", slot: "activity", examples: ["coffee", "movie", "dinner", "beach"],
      items: [
        { id: "ag_see", s: t("Can | I | see | you | again?", "Ar galiu | aš | pamatyti | tave | vėl?", "Ar galiu tave vėl pamatyti?") },
        { id: "ag_free", s: t("Are | you | free | on Saturday?", "Ar esi | tu | {sm:laisvas|sf:laisva} | šeštadienį?", "Ar šeštadienį {sm:esi laisvas|sf:esi laisva}?") },
        { id: "ag_activity", s: t("Would | you | like | to {X} | on Saturday?", "Ar | tu | norėtum | {X:acc} | šeštadienį?", "Ar norėtum šeštadienį {X:acc}?",
          { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtum (linked to “like”)." } }) },
        { id: "ag_id_love", s: t("I'd love | that!", "Labai norėčiau | to!", "Labai norėčiau!") },
        { id: "ag_works", s: t("Saturday | works | for me!", "Šeštadienis | tinka | man!", "Man tinka šeštadienis!") },
      ],
    },
    again_answer: {
      lt: "Sutikti susitikti vėl",
      items: [
        { id: "ag_id_love", s: t("I'd love | that!", "Labai norėčiau | to!", "Labai norėčiau!") },
        { id: "ag_yes", s: t("Yes, | I'd like | that.", "Taip, | norėčiau | to.", "Taip, norėčiau.") },
        { id: "ag_no", s: t("Sorry, | I | don't think | so.", "Atsiprašau, | aš | nemanau, | kad taip.", "Atsiprašau, nemanau.") },
      ],
    },
    day_answer: {
      lt: "Sutikti dėl dienos",
      items: [
        { id: "dy_works", s: t("Sure, | that | works!", "Žinoma, | tai | tinka!", "Žinoma, tinka!") },
        { id: "dy_free", s: t("Yes, | I'm | free!", "Taip, | aš esu | {m:laisvas|f:laisva}!", "Taip, esu {m:laisvas|f:laisva}!") },
        { id: "dy_busy", s: t("Sorry, | I'm | busy | that | day.", "Atsiprašau, | aš esu | {m:užimtas|f:užimta} | tą | dieną.", "Atsiprašau, tą dieną esu {m:užimtas|f:užimta}.") },
      ],
    },
    jacket: {
      lt: "Pasiūlyti savo švarką",
      items: [
        { id: "jk_take", s: t("Here, | take | my | jacket.", "Še, | imk | mano | švarką.", "Še, imk mano švarką.") },
        { id: "jk_want", s: t("Do | you | want | my | jacket?", "Ar | tu | nori | mano | švarko?", "Ar nori mano švarko?", { flags: { 0: "Question “Do” = the particle ar." } }) },
      ],
    },
    check_offer: {
      lt: "Padėkoti arba pasiūlyti pasidalinti",
      items: [
        { id: "ck_thanks", s: t("Thank | you!", "Ačiū | tau!", "Ačiū!") },
        { id: "ck_sure", s: t("Are | you | sure? | Thank | you!", "Ar | tu | {sm:tikras|sf:tikra}? | Ačiū | tau!", "Ar tikrai? Ačiū!") },
        { id: "ck_split", s: t("Let's split | it.", "Padalinkime | ją.", "Padalinkime sąskaitą.") },
      ],
    },
    quick_coffee: {
      lt: "Greitai atsakyti",
      items: [
        { id: "qf_pick", s: t("Coffee!", "Kava!", "Kava!") },
        { id: "qf_pick", s: t("Tea!", "Arbata!", "Arbata!") },
        { id: "qf_pick", s: t("Both!", "Abi!", "Abi!") },
      ],
    },
    quick_pets: {
      lt: "Greitai atsakyti",
      items: [
        { id: "qf_pick", s: t("Dogs!", "Šunys!", "Šunys!") },
        { id: "qf_pick", s: t("Cats!", "Katės!", "Katės!") },
        { id: "qf_pick", s: t("Both!", "Abu!", "Abu!") },
      ],
    },
    quick_owl: {
      lt: "Greitai atsakyti",
      items: [
        { id: "qf_pick", s: t("Night owl!", "Pelėda!", "Pelėda!") },
        { id: "qf_pick", s: t("Early bird!", "Vyturys!", "Vyturys!") },
      ],
    },
    like_job: {
      lt: "Atsakyti, ar patinka darbas",
      items: [
        { id: "lj_love", s: t("Yes, | I | love | it!", "Taip, | man | labai patinka | tai!", "Taip, labai patinka!") },
        { id: "lj_okay", s: t("It's | okay.", "Tai yra | gerai.", "Normaliai.") },
        { id: "lj_not", s: t("Not | really.", "Ne | visai.", "Nelabai.") },
      ],
    },
    walk: {
      lt: "Pasiūlyti palydėti",
      items: [
        { id: "wk_walk", s: t("Can | I | walk | you | home?", "Ar galiu | aš | palydėti | tave | namo?", "Ar galiu palydėti tave namo?") },
        { id: "jk_take", s: t("Here, | take | my | jacket.", "Še, | imk | mano | švarką.", "Še, imk mano švarką.") },
      ],
    },
    goodbye: {
      lt: "Atsisveikinti",
      items: [
        { id: "tx_will", s: t("I | will!", "Aš | [parašysiu]!", "Parašysiu!", { flags: { 1: "Elliptical “will”: Lithuanian repeats the verb (parašysiu)." } }) },
        { id: "tx_good_night", s: t("Good | night!", "Labos | nakties!", "Labos nakties!") },
        { id: "tx_you_too", s: t("I | will! | You | too!", "Aš | [parašysiu]! | Tu | irgi!", "Parašysiu! Tu irgi!", { flags: { 1: "Elliptical “will”: Lithuanian repeats the verb (parašysiu)." } }) },
      ],
    },
  },

  tips: {
    uk_bill: { key: "uk_bill", lt: "Suprasta! Amerikoje restorane sakoma „the check“.", better: "Let's split the check." },
  },

  merges: {
    "a little": { reason: "lexical_expression", split: "a → — + little → mažas gives “small”; the quantifier “a little” = truputį.", minimal: "Two words." },
    "instead of": { reason: "lexical_expression", split: "instead → vietoj + of → — leaves “of” without a word; contrast = o ne / vietoj.", minimal: "Two words." },
    "there you are": { reason: "lexical_expression", split: "there → ten, you → tu, are → esi is a literal location; greeting someone who arrives = štai ir tu.", minimal: "The whole greeting." },
    "in person": { reason: "lexical_expression", split: "in → į + person → asmuo is false; = gyvai.", minimal: "Two words." },
    "same here": { reason: "lexical_expression", split: "same → tas pats + here → čia is false; agreement = aš irgi.", minimal: "Two words." },
    "what about": { reason: "lexical_expression", split: "what → kas + about → apie is false; asking back = o kaip.", minimal: "The person stays outside." },
    "how about": { reason: "lexical_expression", split: "how → kaip + about → apie gives “kaip apie”, a calque; a suggestion or asking back = gal / o kaip.", minimal: "The suggested thing stays outside." },
    "no way": { reason: "lexical_expression", split: "no → ne + way → kelias is false; surprise = negali būti.", minimal: "Two words." },
    "lucky you": { reason: "lexical_expression", split: "lucky → laimingas + you → tu misses the set phrase; = tau pasisekė.", minimal: "Two words." },
    "isn't it": { reason: "grammatical_fusion", split: "isn't → nėra + it → tai: a tag question = ar ne.", minimal: "Two words." },
    "early bird": { reason: "lexical_expression", split: "early → ankstyvas + bird → paukštis is a literal bird; a morning person = vyturys.", minimal: "Two words." },
    "night owl": { reason: "lexical_expression", split: "night → naktinė + owl → pelėda loses the idiom; an evening person = pelėda.", minimal: "Two words." },
    "i'd love": { reason: "grammatical_fusion", split: "I'd → aš drops “would”; the conditional labai norėčiau carries would + love.", minimal: "The object stays outside." },
    "let's split": { reason: "lexical_expression", split: "let → leisk, 's (us) → mums, split → padalinti asks for permission; the proposal = padalinkime.", minimal: "The object stays outside." },
    "good luck": { reason: "lexical_expression", split: "good → geras + luck → sėkmė gives a noun phrase; the wish = sėkmės.", minimal: "Two words." },
    "oh well": { reason: "lexical_expression", split: "oh → o + well → gerai is false; resignation = na, ką padarysi.", minimal: "Two words." },
    "it's on me": { reason: "lexical_expression", split: "It's → tai yra + on → ant + me → manęs is false; paying for someone = aš vaišinu.", minimal: "The whole formula." },
    "it was": { reason: "grammatical_fusion", split: "it → tai + was → buvo: dummy “it” has no referent; the impersonal buvo absorbs it (C-DUMMY).", minimal: "Two words." },
    "i'll allow": { reason: "grammatical_fusion", split: "I'll → aš would drop “will”; the future ending of leisiu carries it.", minimal: "The object stays outside." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Pasisveikink", done: (c) => !!c.s.greeted },
    { lt: "Užsisakyk gėrimą", optional: true, when: (c) => asked(c, "drinks") > 0 && !c.s.goalMet, done: (c) => asked(c, "drinks") > 0 && (!!c.s.drink || !!c.s.noAlcohol || asked(c, "drinks") >= 2 || !!c.s.wrapUp) },
    { lt: "Papasakok apie save", done: (c) => topicsDone(c) },
    { lt: "Atsakyk į greitus klausimus", optional: true, when: (c) => !!c.s.qfStarted && !c.s.goalMet, done: (c) => !!c.s.qfStarted && !!c.s.qfDone },
    { lt: "Susitark dėl sąskaitos", optional: true, when: (c) => !!c.s.checkShown && !c.s.goalMet, done: (c) => !!c.s.checkShown && (!!c.s.checkDone || asked(c, "check") >= 2) },
    { lt: "Susitark vėl susitikti", done: (c) => !!c.s.dayAgreed },
  ],
  steps: [
    ...([
      ["late", [{ lt: "Pasakyti, kad nieko tokio", hint: "hello_late" }, { lt: "Pagirti", hint: "compliments" }]],
      ["early", [{ lt: "Padėkoti už komplimentą", hint: "hello_early" }, { lt: "Pagirti", hint: "compliments" }]],
      ["meet", [{ lt: "Pasisveikinti", hint: "hello_meet" }, { lt: "Pagirti", hint: "compliments" }]],
    ] as [string, { lt: string; hint: string }[]][]).map(([o, sug]) => ({
      id: "greet_" + o, when: (c: Ctx) => c.s.opening === o, done: (c: Ctx) => !!c.s.greeted,
      ask: (c: Ctx) => { if (c.s.greetSkip) { c.s.greetSkip = false; return; } c.say("hello_again"); },
      expects: ["greet_back", "compliment", "sorry_late", "reassure", "you_too", "intro_ctx"],
      suggest: sug,
      yes: (c: Ctx) => { hi(c); }, no: (c: Ctx) => { hi(c); },
    })),
    { id: "drinks", when: (c) => c.s.askDrinks && !c.s.wrapUp, done: (c) => !!c.s.drink || !!c.s.noAlcohol || asked(c, "drinks") >= 2,
      ask: (c) => { bump(c, "drinks"); if (c.s.drinkBack) { c.s.drinkBack = false; c.say("ask_drinks_back"); } else c.say("ask_drinks"); },
      expects: ["drink_ans", "same_drink_ans", "no_alcohol", "ask_drink", "me_too_ctx"],
      suggest: [{ lt: "Pasirinkti gėrimą", hint: "drinks", options: "drink" }] },
    ...(["job", "hobby", "travel", "music"] as Topic[]).map((tp) => ({
      id: tp,
      when: (c: Ctx) => !c.s.wrapUp && ((c.s.topics as Topic[]).includes(tp) || c.s.askBackShort === tp),
      done: (c: Ctx) => !!c.s.ans[tp] || (asked(c, tp) >= 2 && c.s.askBackShort !== tp),
      ask: (c: Ctx) => {
        bump(c, tp);
        c.s.lastTopic = tp;
        if (c.s.told[tp] || c.s.askBackShort === tp) { c.s.askBackShort = undefined; c.say("ask_back"); return; }
        if (tp === "job") c.say("ask_job");
        else if (tp === "hobby") c.say("ask_hobby");
        else if (tp === "travel") c.say("ask_travel", { C: c.s.country });
        else c.say("ask_music");
      },
      expects: tp === "job" ? ["job_ans", "job_ctx", "no_job", "ask_job", "and_you"] : tp === "hobby" ? ["hobby_ans", "no_hobby", "ask_hobby", "and_you"]
        : tp === "travel" ? ["travel_yes_ctx", "travel_no_ctx", "ask_travel", "ask_travel_general", "and_you"] : ["music_ans", "no_music", "ask_music", "and_you"],
      suggest: tp === "job" ? [{ lt: "Papasakoti apie savo darbą", hint: "job" }, { lt: "Paklausti to paties", hint: "ask_back" }]
        : tp === "hobby" ? [{ lt: "Papasakoti apie pomėgius", hint: "hobbies", options: "hobby" }, { lt: "Paklausti to paties", hint: "ask_back" }]
        : tp === "travel" ? [{ lt: "Atsakyti, ar esi ten buvęs(-usi)", hint: "travel" }, { lt: "Paklausti to paties", hint: "ask_back" }]
        : [{ lt: "Papasakoti, kokią muziką mėgsti", hint: "music", options: "genre" }, { lt: "Paklausti to paties", hint: "ask_back" }],
      yes: tp === "travel" ? (c: Ctx) => { answered(c, "travel"); c.s.told.travel = true; c.say("travel_yes_react"); } : undefined,
      no: tp === "travel" ? (c: Ctx) => { answered(c, "travel"); c.say("travel_no_react", { C: c.s.country }); } : undefined,
    })),
    { id: "qf", when: (c) => !!c.s.quick && !c.s.wrapUp, done: (c) => !!c.s.qfDone,
      ask: (c) => { c.s.qfStarted = true; c.twist("quick_questions"); c.say("qf_intro"); c.say(QF[(c.s.qfOrder as number[])[0]].line); quick(c, 0); }, expects: ["qf_ctx"],
      suggest: [{ lt: "Greitai atsakyti", hint: "quick_coffee" }] },
    { id: "check", when: (c) => c.s.askCheck && !(c.s.againOk && !c.s.dayAgreed), done: (c) => !!c.s.checkDone || asked(c, "check") >= 2,
      ask: (c) => {
        bump(c, "check");
        const first = !c.s.checkShown;
        if (first) { c.s.checkShown = true; c.say("check_here"); }
        // Offers to pay at once on some visits, or when the learner says nothing about the check.
        if ((c.s.partnerPays || !first) && !c.s.partnerOffered) { c.ask("check_offer"); return; }
        if (!first) c.say("so_check");
      },
      expects: ["pay_all", "split", "accept_offer"],
      suggest: [{ lt: "Pasiūlyti sumokėti arba pasidalinti", hint: "check" }],
      yes: (c) => { if (c.s.partnerOffered) { c.s.checkDone = "partner"; c.say("my_pleasure"); } } },
    { id: "check_offer", when: (c) => !!c.s.checkShown && !c.s.checkDone && (!!c.s.partnerOffered || c.step === "check"), done: (c) => !!c.s.checkDone,
      ask: (c) => {
        bump(c, "check_offer");
        if (!c.s.partnerOffered) { c.s.partnerOffered = true; c.say("partner_offers"); return; }
        c.s.checkDone = "partner"; c.say("my_pleasure"); // the offer was ignored: the partner pays
      },
      expects: ["accept_offer", "split", "pay_all"],
      suggest: [{ lt: "Padėkoti arba pasiūlyti pasidalinti", hint: "check_offer" }],
      yes: (c) => { c.s.checkDone = "partner"; c.say("my_pleasure"); },
      no: (c) => { c.s.checkDone = "split"; c.say("deal"); } },
    { id: "cold", when: (c) => !!c.s.coldTwist, done: (c) => !!c.s.coldAsked,
      ask: (c) => { c.s.coldAsked = true; c.twist("cold"); c.say("cold"); },
      expects: ["offer_jacket"], suggest: [{ lt: "Pasiūlyti savo švarką", hint: "jacket" }] },
    { id: "nice", done: (c) => !!c.s.niceTime || !!c.s.niceSaid,
      ask: (c) => { c.s.niceSaid = true; c.say("nice_time"); },
      expects: ["nice_time", "thanks_evening", "me_too_ctx"],
      suggest: [{ lt: "Pasakyti, kad ir tau buvo smagu", hint: "nice_time" }, { lt: "Paklausti, ar galite vėl susitikti", hint: "again", options: "activity" }],
      yes: (c) => { c.s.niceTime = true; } },
    { id: "again", when: (c) => !c.s.declined, done: (c) => !!c.s.againOk || !!c.s.declined,
      ask: (c) => { c.s.partnerAsked = true; c.say("can_i_see_you"); },
      expects: ["agree_again", "decline_again", "see_again", "propose_day", "me_too_ctx", "hesitate"],
      suggest: [{ lt: "Sutikti susitikti vėl", hint: "again_answer" }, { lt: "Pasiūlyti, ką veiksite", hint: "again", options: "activity" }],
      yes: (c) => { c.s.againOk = true; c.say("yay_great"); },
      no: (c) => { c.s.declined = true; c.say("no_pressure"); },
      help: (c) => { c.say("think_about_it"); } },
    { id: "day", when: (c) => !!c.s.againOk && !c.s.declined, done: (c) => !!c.s.dayAgreed,
      ask: (c) => {
        if (c.s.offerDay) { c.say("are_you_free_on", { D: c.s.offerDay }); return; }
        c.s.offerDay = c.s.busySat ? "sunday" : "saturday"; c.s.dayOffered = true;
        c.say("are_you_free_on", { D: c.s.offerDay });
      },
      expects: ["propose_day", "agree_again", "decline_again", "day_ctx"],
      suggest: [{ lt: "Sutikti dėl dienos", hint: "day_answer" }, { lt: "Pasiūlyti kitą dieną ar veiklą", hint: "again", options: "activity" }],
      yes: (c) => dayYes(c),
      no: (c) => { if (c.s.offerDay === "saturday") { c.s.offerDay = "sunday"; c.say("how_about_sunday"); c.hold(); } else { c.s.offerDay = "friday"; c.say("when_free"); c.hold(); } } },
  ],

  init: (c) => {
    c.s.ans = {}; c.s.told = {};
    const r = c.rng();
    c.s.opening = r < 0.35 ? "late" : r < 0.7 ? "early" : "meet";
    const all: Topic[] = ["job", "hobby", "travel", "music"];
    const first = c.pick(all);
    const second = c.pick(all.filter((x) => x !== first));
    c.s.topics = all.filter((x) => x === first || x === second);
    c.s.country = c.pick(TRIP);
    c.s.askDrinks = c.chance(0.6);
    c.s.likeJobQ = c.chance(0.35);
    c.s.askCheck = c.chance(0.85);
    c.s.partnerPays = c.chance(0.4);
    c.s.quick = c.visits >= 2 && c.chance(0.5);
    c.s.qfOrder = c.pick([[0, 1], [1, 2], [0, 2], [2, 1]]);
    c.s.busySat = c.visits >= 1 && c.chance(0.4);
    c.s.coldTwist = c.visits >= 1 && c.chance(0.3);
    c.s.livesClose = c.chance(0.35);
  },

  start: (c) => {
    c.speaker(partnerOf(c));
    const o = c.s.opening;
    if (o === "late") c.say("open_late");
    else if (o === "early") { c.say("open_early"); c.s.complimented = true; }
    else c.say("open_meet");
    c.s.greetSkip = true;
  },

  handlers: H,

  finish: (c) => {
    if (c.s.declined) { c.say("good_night"); c.end(); return; }
    win(c);
    c.say("text_me");
    const bye = (cc: Ctx) => {
      if (once(cc, "bye")) cc.say(/\byou too\b|text me too/i.test(cc.heard || "") ? "will_too" : "good_night");
      cc.end();
    };
    // The evening is over: any friendly answer ends it with a goodbye.
    const on: Record<string, (cc: Ctx) => void> = {};
    for (const k of Object.keys(date.intents)) if (!k.endsWith("_ctx")) on[k] = bye;
    for (const k of ["g_bye", "g_thanks", "g_ok", "g_hello", "g_howareyou_answer", "g_sorry"]) on[k] = bye;
    c.expect({
      id: "closing", expects: ["text_reply"], hints: ["goodbye"], suggest: [{ lt: "Atsisveikinti", hint: "goodbye" }],
      on, yes: bye, no: bye,
    });
  },

  tests: [
    { say: "It's so nice to meet you!", intent: "greet_back", step: "greet" },
    { say: "Nice to meet you too!", intent: "greet_back", step: "greet" },
    { say: "You look great!", intent: "compliment", step: "greet" },
    { say: "Thanks, you too!", intent: "you_too", step: "greet", not: ["g_bye"] },
    { say: "Sorry I'm late!", intent: "sorry_late", step: "greet" },
    { say: "No worries!", intent: "reassure", step: "greet" },
    { say: "I love your jacket", intent: "compliment" },
    { say: "The view is beautiful!", intent: "view" },
    { say: "A glass of white wine, please", intent: "drink_ans", step: "drinks", slots: { drink: "white_wine" } },
    { say: "I'll have a beer", intent: "drink_ans", step: "drinks", slots: { drink: "beer" } },
    { say: "Same for me", intent: "same_drink_ans", step: "drinks" },
    { say: "I don't drink", intent: "no_alcohol", step: "drinks", not: ["drink_ans"] },
    { say: "What are you having?", intent: "ask_drink", step: "drinks" },
    { say: "I'm a nurse. And you?", intent: "job_ans", step: "job", slots: { job: "nurse" } },
    { say: "I work in IT", intent: "job_ans", step: "job" },
    { say: "I'm an astronaut", intent: "job_ctx", step: "job" },
    // "I'm a little nervous" gets a reaction (BUG-REVIEW, still open: s84)
    { say: "I'm a little nervous.", intent: "nervous", step: "job", not: ["job_ctx"] },
    { say: "Sorry, I'm a bit nervous.", intent: "nervous", step: "greet_early" },
    { say: "It's my first date in years.", intent: "nervous", step: "job" },
    { say: "I'm a little nervous. I'm a nurse.", intent: "nervous", step: "job" },
    { say: "I'm not nervous.", intent: "none", not: ["nervous"] },
    // the shared leaving phrases work here too (BUG-REVIEW, still open: s84 and s86)
    { say: "Sorry, I have to go.", intent: "g_bye", step: "job" },
    { say: "I'll call you later.", intent: "g_bye", step: "again" },
    { say: "I have to go, I'm driving.", intent: "g_bye", step: "job", not: ["no_alcohol"] },
    { say: "I don't have to go.", intent: "none" },
    { say: "I'm retired", intent: "no_job", step: "job" },
    { say: "What do you do?", intent: "ask_job" },
    { say: "I love cooking and hiking", intent: "hobby_ans", step: "hobby" },
    { say: "In my free time I like to read", intent: "hobby_ans", step: "hobby" },
    { say: "What do you do for fun?", intent: "ask_hobby" },
    { say: "No, never. But I'd love to go!", intent: "travel_no_ctx", step: "travel", not: ["travel_yes_ctx"] },
    { say: "I haven't been there yet", intent: "travel_no_ctx", step: "travel", not: ["travel_yes_ctx"] },
    { say: "Yes, I have! And you?", intent: "travel_yes_ctx", step: "travel" },
    { say: "Have you ever been to Lithuania?", intent: "ask_travel", slots: { country: "lithuania" } },
    { say: "Mostly jazz", intent: "music_ans", step: "music", slots: { genre: "jazz" } },
    { say: "A bit of everything", intent: "music_ans", step: "music" },
    { say: "What about you?", intent: "and_you" },
    { say: "Let me get this", intent: "pay_all", step: "check" },
    { say: "Let's split it", intent: "split", step: "check" },
    { say: "Can we split the bill?", intent: "split", step: "check" },
    { say: "I had a really nice time tonight", intent: "nice_time", step: "nice" },
    { say: "Can I see you again?", intent: "see_again" },
    { say: "Would you like to get coffee on Saturday?", intent: "propose_day", slots: { activity: "coffee", day: "saturday" } },
    { say: "I'd love that!", intent: "agree_again", step: "again" },
    { say: "Sorry, I don't think so", intent: "decline_again", step: "again", not: ["agree_again"] },
    { say: "Sorry, I'm busy on Saturday", intent: "decline_again", step: "day", not: ["agree_again"] },
    { say: "Saturday works for me", intent: "agree_again", step: "day" },
    { say: "Can I walk you home?", intent: "walk_home" },
    { say: "Here, take my jacket", intent: "offer_jacket" },
    { say: "Dogs, definitely", intent: "qf_ctx", step: "qf" },
    { say: "I will! You too!", intent: "text_reply" },
    { say: "the purple elephant sings loudly", intent: "none" },
    { say: "Pizza helicopter", intent: "none" },
    // wider phrasing (learner English and natural alternatives)
    { say: "Hello! You are very beautiful", intent: "compliment" },
    { say: "Hi! You look just like your photos", intent: "compliment" },
    { say: "Only five minutes, no problem", intent: "reassure" },
    { say: "I just arrived too", intent: "reassure" },
    { say: "A glass of wine, please", intent: "drink_ans", step: "drinks", slots: { drink: "white_wine" } },
    { say: "I'm driving, so just a lemonade", intent: "drink_ans", step: "drinks", slots: { drink: "lemonade" } },
    { say: "I am working like a driver", intent: "job_ans", step: "job", slots: { job: "driver" } },
    { say: "My job is nurse", intent: "job_ans", step: "job", slots: { job: "nurse" } },
    { say: "I like walking with my dog", intent: "hobby_ans", step: "hobby", slots: { hobby: "walking" } },
    { say: "Yes, two years ago", intent: "travel_yes_ctx", step: "travel" },
    { say: "Lithuanian music", intent: "music_ans", step: "music" },
    { say: "I invite you", intent: "pay_all", step: "check" },
    { say: "Can we pay separately?", intent: "split", step: "check" },
    { say: "Would you like my coat?", intent: "offer_jacket" },
    { say: "I enjoyed it very much", intent: "nice_time", step: "nice" },
    { say: "Saturday evening?", intent: "day_ctx", step: "day", slots: { day: "saturday" } },
    // meaning must not flip
    { say: "I can't on Saturday, but Sunday is fine", intent: "propose_day", step: "day", slots: { day: "sunday" }, not: ["agree_again"] },
    { say: "I'm free on Sunday", intent: "propose_day", step: "day", slots: { day: "sunday" }, not: ["agree_again"] },
    { say: "No wine for me", intent: "no_alcohol", step: "drinks", not: ["drink_ans"] },
    { say: "I'm not free on Saturday", intent: "decline_again", step: "day", not: ["agree_again"] },
    { say: "Not yet, but it's on my list", intent: "travel_no_ctx", step: "travel", not: ["travel_yes_ctx"] },
    { say: "No, I wasn't there", intent: "travel_no_ctx", step: "travel", not: ["travel_yes_ctx"] },
    { say: "I don't want to see you again", intent: "decline_again", step: "again", not: ["agree_again", "see_again"] },
    { say: "Sorry, I'm a little late.", intent: "sorry_late", not: ["job_ctx"] },
    { say: "I'm sorry, I was a little late.", intent: "sorry_late", step: "job", not: ["job_ctx"] },
    { say: "Can I pay?", intent: "pay_all", step: "check" },
    { say: "Maybe we split?", intent: "split", step: "check" },
    { say: "We can share.", intent: "split", step: "check" },
    { say: "I can't pay tonight, sorry.", intent: "none", step: "check" },
    { say: "Do you like your job?", intent: "ask_like_job" },
    { say: "Wow, that sounds interesting.", intent: "react_nice" },
    { say: "I like reading and walking by the sea.", intent: "hobby_ans", step: "hobby", not: ["g_bye"] },
    { say: "I teach English at a school.", intent: "job_ans" },
    // a travel answer with a question back ("Have you?" was lost or not understood)
    { say: "Yes, I have! Have you?", intent: "travel_yes_ctx", step: "travel", not: ["travel_no_ctx"] },
    { say: "Yes, I have. Have you been there?", intent: "travel_yes_ctx", step: "travel" },
    { say: "No, never. Have you?", intent: "travel_no_ctx", step: "travel", not: ["travel_yes_ctx"] },
    { say: "No, I haven't. Have you been there?", intent: "travel_no_ctx", step: "travel", not: ["travel_yes_ctx"] },
    { say: "Not yet. Have you?", intent: "travel_no_ctx", step: "travel", not: ["travel_yes_ctx"] },
    { say: "Have you?", intent: "and_you", step: "travel", not: ["travel_yes_ctx", "travel_no_ctx"] },
  ],

  sims: [
    { name: "warm first date", turns: [
      "Hi! It's so nice to meet you!", "Let's split it", "I had a really nice time too", "I'd love that!", "Saturday works for me!", "I will! Good night!",
    ], expect: { complete: true }, auto: AUTO },
    { name: "learner leads and asks back", turns: [
      "You look great! Sorry I'm late.", "What would you like to drink?", "Same for me", "Let me get this", "Thank you for a lovely evening",
      "Can I see you again?", "Would you like to get coffee on Sunday?", "You too! Good night!",
    ], expect: { complete: true }, auto: AUTO },
    // the whole date in short answers: the compliment, the drink, two topics, then the walk home and a plan
    { name: "short answers and a plan", turns: [
      "Hi! Thanks, you too!", "White wine, please.", "I'm a nurse.", "No, never.", "Can I walk you home?", "Let me get this.", "Me too!", "Yes!",
      "How about Friday?", "Good night!",
    ], expect: { complete: true }, auto: AUTO,
      setup: (s) => {
        s.opening = "early"; s.topics = ["job", "travel"]; s.askDrinks = true; s.likeJobQ = false; s.askCheck = true; s.partnerPays = false;
        s.quick = false; s.busySat = false; s.coldTwist = false;
      } },
    { name: "nervous, then almost leaving", turns: [
      "Hi! Sorry, I'm a little nervous.", "Sorry, I have to go.", "No, no, sorry!", "Let's split it", "I had a really nice time too", "I'd love that!", "Saturday works for me!", "I will! Good night!",
    ], expect: { complete: true }, auto: AUTO },
    { name: "questions back on every topic", turns: [
      "Hi, nice to meet you too!", "What are you having?", "I'll have a lemonade", "Let's split the check", "Me too!", "Absolutely!", "Sure!", "Bye!",
    ], expect: { complete: true }, auto: { ...AUTO, job: "I work at a hotel. What do you do?", hobby: "I love yoga. What about you?", travel: "Yes, I have! Have you?", music: "A bit of everything. And you?" } },
    // "Yes! Have you?": the yes answers the travel question before the question back
    { name: "travel: yes, then a question back", setup: (s) => { s.topics = ["job", "travel"]; s.askDrinks = false; }, turns: [
      "Hi! Nice to meet you!", "I'm a teacher. And you?", "Yes! Have you?", "Let's split it", "I had a really nice time too", "I'd love that!", "Saturday works for me!", "I will! Good night!",
    ], expect: { complete: true }, auto: AUTO },
  ],
};

export default date;
