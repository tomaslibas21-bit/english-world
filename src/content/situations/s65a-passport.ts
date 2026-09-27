// Song 65 "Business or Pleasure?" (part 1): passport control at Maple Harbor Airport.
// Officer Diaz (U.S. Customs and Border Protection) is brisk but fair. The learner is a visitor
// on an ESTA and answers the standard entry questions: purpose, length of stay, where they are
// staying, a few optional questions (return ticket, first time, job, travelling alone, cash),
// food to declare, fingerprints and a photo. Vague answers get a clarifying question; the
// learner may ask "Do you mean my job?" and similar. Twists (visits ≥ 1): "Can I see your
// return ticket?" and the agriculture beagle that likes the learner's bag (Lithuanian cheese).

import type { Ctx, EntityDef, Pending, Segment, SituationDef } from "../types";
import { ent, t } from "../dsl";
import { expectHowAreYou } from "../global";

// ---------------------------------------------------------------------------
// Entities

/** People the learner is visiting (chips + examples). */
const RELS: EntityDef[] = [
  ent("family", "family", "šeima/šeimos/šeimai/šeimą/šeima/šeimoje", "f", { chip: "šeimą", forms: ["family's"] }),
  ent("relatives", "relatives", "giminaičiai/giminaičių/giminaičiams/giminaičius/giminaičiais/giminaičiuose", "m", { chip: "gimines", forms: ["relative", "family members", "relatives'"] }),
  ent("friends", "friends", "draugai/draugų/draugams/draugus/draugais/drauguose", "m", { chip: "draugus", forms: ["friends'"] }),
  ent("friend", "friend", "draugas/draugo/draugui/draugą/draugu/drauge", "m", { chip: "draugą", forms: ["friend's", "girlfriend", "boyfriend", "girlfriend's", "boyfriend's"] }),
  ent("sister", "sister", "sesuo/sesers/seseriai/seserį/seserimi/seseryje", "f", { chip: "seserį", forms: ["sister's", "sisters"] }),
  ent("brother", "brother", "brolis/brolio/broliui/brolį/broliu/brolyje", "m", { chip: "brolį", forms: ["brother's", "brothers"] }),
  ent("son", "son", "sūnus/sūnaus/sūnui/sūnų/sūnumi/sūnuje", "m", { chip: "sūnų", forms: ["son's"] }),
  ent("daughter", "daughter", "dukra/dukros/dukrai/dukrą/dukra/dukroje", "f", { chip: "dukrą", forms: ["daughter's"] }),
  ent("parents", "parents", "tėvai/tėvų/tėvams/tėvus/tėvais/tėvuose", "m", { chip: "tėvus", forms: ["parents'"] }),
  ent("mom", "mom", "mama/mamos/mamai/mamą/mama/mamoje", "f", { chip: "mamą", forms: ["mother", "mom's", "mother's", "mum"] }),
  ent("dad", "dad", "tėtis/tėčio/tėčiui/tėtį/tėčiu/tėtyje", "m", { chip: "tėtį", forms: ["father", "dad's", "father's"] }),
  ent("cousin", "cousin", "pusbrolis/pusbrolio/pusbroliui/pusbrolį/pusbroliu/pusbrolyje", "m", { chip: "pusbrolį / pusseserę", forms: ["cousin's", "cousins"] }),
  ent("aunt", "aunt", "teta/tetos/tetai/tetą/teta/tetoje", "f", { chip: "tetą", forms: ["aunt's"] }),
  ent("uncle", "uncle", "dėdė/dėdės/dėdei/dėdę/dėde/dėdėje", "m", { chip: "dėdę", forms: ["uncle's"] }),
  ent("kids", "kids", "vaikai/vaikų/vaikams/vaikus/vaikais/vaikuose", "m", { chip: "vaikus", forms: ["children", "kids'", "children's"] }),
  ent("grandchildren", "grandchildren", "anūkai/anūkų/anūkams/anūkus/anūkais/anūkuose", "m", { chip: "anūkus", forms: ["grandkids", "grandson", "granddaughter", "grandson's", "granddaughter's"] }),
];
const FRIENDLY = new Set(["friends", "friend"]);

/** Things a traveller might declare. `ok`: allowed into the US for personal use. */
const GOODS: EntityDef[] = [
  ent("cheese", "cheese", "sūris/sūrio/sūriui/sūrį/sūriu/sūryje", "m", { chip: "sūris", forms: ["hard cheese", "a cheese", "cheeses"], attrs: { ok: true, food: true } }),
  ent("chocolate", "chocolate", "šokoladas/šokolado/šokoladui/šokoladą/šokoladu/šokolade", "m", { chip: "šokoladas", forms: ["chocolates", "chocolate bar", "chocolate bars"], attrs: { ok: true, food: true } }),
  ent("candy", "candy", "saldainiai/saldainių/saldainiams/saldainius/saldainiais/saldainiuose", "m", { chip: "saldainiai", forms: ["candies", "candy bars"], attrs: { ok: true, food: true } }),
  ent("cookies", "cookies", "sausainiai/sausainių/sausainiams/sausainius/sausainiais/sausainiuose", "m", { chip: "sausainiai", forms: ["cookie"], attrs: { ok: true, food: true } }),
  ent("bread", "bread", "duona/duonos/duonai/duoną/duona/duonoje", "f", { chip: "duona", forms: ["black bread", "rye bread", "dark bread", "a loaf of bread"], attrs: { ok: true, food: true } }),
  ent("honey", "honey", "medus/medaus/medui/medų/medumi/meduje", "m", { chip: "medus", attrs: { ok: true, food: true } }),
  ent("coffee", "coffee", "kava/kavos/kavai/kavą/kava/kavoje", "f", { chip: "kava", forms: ["coffee beans", "ground coffee"], attrs: { ok: true, food: true } }),
  ent("tea", "tea", "arbata/arbatos/arbatai/arbatą/arbata/arbatoje", "f", { chip: "arbata", forms: ["herbal tea", "teas"], attrs: { ok: true, food: true } }),
  ent("sausage", "sausage", "dešra/dešros/dešrai/dešrą/dešra/dešroje", "f", { chip: "dešra", forms: ["sausages", "salami", "smoked sausage", "kielbasa", "skilandis"], attrs: { ok: false, food: true } }),
  ent("meat", "meat", "mėsa/mėsos/mėsai/mėsą/mėsa/mėsoje", "f", { chip: "mėsa", forms: ["ham", "bacon", "smoked meat", "dried meat", "beef jerky", "jerky", "pork"], attrs: { ok: false, food: true } }),
  ent("fruit", "fruit", "vaisiai/vaisių/vaisiams/vaisius/vaisiais/vaisiuose", "m", { chip: "vaisiai", forms: ["fruits", "fresh fruit", "an apple", "apples", "oranges", "bananas", "berries", "pears"], attrs: { ok: false, food: true } }),
  ent("vegetables", "vegetables", "daržovės/daržovių/daržovėms/daržoves/daržovėmis/daržovėse", "f", { chip: "daržovės", forms: ["vegetable", "veggies", "tomatoes", "cucumbers", "potatoes"], attrs: { ok: false, food: true } }),
  ent("seeds", "seeds", "sėklos/sėklų/sėkloms/sėklas/sėklomis/sėklose", "f", { chip: "sėklos", forms: ["seed", "flower seeds"], attrs: { ok: false } }),
  ent("plants", "plants", "augalai/augalų/augalams/augalus/augalais/augaluose", "m", { chip: "augalai", forms: ["plant", "a plant", "flowers", "a flower"], attrs: { ok: false } }),
  ent("medicine", "medicine", "vaistai/vaistų/vaistams/vaistus/vaistais/vaistuose", "m", { chip: "vaistai", forms: ["medication", "medications", "medicines", "pills", "vitamins", "my medicine"], attrs: { ok: true } }),
  ent("vodka", "vodka", "degtinė/degtinės/degtinei/degtinę/degtine/degtinėje", "f", { chip: "degtinė", forms: ["a bottle of vodka", "alcohol", "a bottle of wine", "wine"], attrs: { ok: true } }),
  ent("gifts", "gifts", "dovanos/dovanų/dovanoms/dovanas/dovanomis/dovanose", "f", { chip: "dovanos", forms: ["gift", "presents", "souvenirs", "a gift"], attrs: { ok: true } }),
];
const goodById = (id: string) => GOODS.find((g) => g.id === id);

// ---------------------------------------------------------------------------
// Grammar lexicons (no Lithuanian forms needed: the officer never echoes them)

const L = (id: string, forms: string[], tags?: string[]) => ({ id, forms, tags });

const PURPOSES = [
  L("vacation", ["pleasure"], ["h:p_pleasure"]),
  L("vacation", ["vacation", "a vacation", "tourism", "sightseeing", "leisure", "a trip", "a short trip", "a tourist trip", "travel", "traveling", "just traveling", "a visit", "a family vacation", "a short vacation", "fun"]),
  L("vacation", ["holiday", "holidays", "a holiday", "a short holiday"], ["tip:uk_holiday"]),
  L("business", ["business"], ["h:p_business_short"]),
  L("business", ["a business trip", "business trip", "work trip", "a work trip", "work", "my work", "my job", "my company"]),
  L("business", ["a conference", "conference", "a work conference", "a business conference"], ["ev:conference", "h:bz_conf"]),
  L("business", ["meetings", "a meeting", "business meetings", "a business meeting", "meetings with clients", "client meetings", "a meeting with a client", "meetings with partners", "a few meetings", "some meetings", "some business meetings"], ["ev:meeting", "h:bz_meet"]),
  L("business", ["a job interview", "job interview", "an interview", "interview"], ["ev:interview", "h:bz_interview"]),
  L("business", ["training", "a training", "a training course", "a workshop", "a seminar"], ["ev:training"]),
  L("business", ["a trade show", "trade show", "an expo", "a fair", "a trade fair"], ["ev:fair"]),
  L("study", ["study", "studies", "studying", "school", "university", "college", "a language course", "an english course"]),
];

const HOTELS = [
  L("harborview", ["harborview hotel", "harborview", "harbor view hotel", "harbor view", "the harborview hotel", "the harbor view hotel", "harborview inn", "hotel harborview", "hotel harbor view"]),
  L("other_hotel", ["hilton", "marriott", "holiday inn", "hyatt", "sheraton", "best western", "hampton inn", "radisson", "motel 6", "comfort inn", "days inn"]),
];
/** Only after "at/in": "at a hotel" is vague and gets "Which hotel?". */
const HOTELS_ANY = [L("hotel_generic", ["hotel", "motel", "hotel downtown", "hotel in town", "hotel in the city", "hotel near the harbor"])];

const STREETS = [
  L("oak", ["oak avenue", "oak street"]), L("maple", ["maple street", "maple avenue"]), L("main", ["main street"]),
  L("harbor", ["harbor road", "harbor street"]), L("elm", ["elm street"]), L("ocean", ["ocean drive", "ocean avenue"]),
  L("beach", ["beach road"]), L("pine", ["pine street"]), L("park", ["park avenue"]), L("lake", ["lake street"]),
  L("church", ["church street"]), L("second", ["second street", "2nd street"]), L("first", ["first avenue", "1st avenue"]),
  L("cedar", ["cedar lane"]), L("bay", ["bay street"]),
];

const JOBS = [
  "teacher", "school teacher", "english teacher", "engineer", "nurse", "doctor", "driver", "truck driver", "bus driver", "taxi driver",
  "accountant", "bookkeeper", "manager", "project manager", "sales manager", "office manager", "programmer", "software developer",
  "developer", "software engineer", "it specialist", "web developer", "designer", "graphic designer", "builder", "construction worker",
  "electrician", "mechanic", "car mechanic", "plumber", "cook", "chef", "farmer", "salesperson", "sales assistant", "shop assistant",
  "cashier", "office worker", "lawyer", "pharmacist", "dentist", "police officer", "musician", "photographer", "journalist",
  "translator", "interpreter", "hairdresser", "waiter", "waitress", "cleaner", "factory worker", "carpenter", "architect",
  "scientist", "researcher", "economist", "businessman", "businesswoman", "entrepreneur", "real estate agent", "social worker",
  "psychologist", "baker", "welder", "logistics manager", "vet", "veterinarian", "caregiver", "student", "consultant", "civil servant",
].map((j) => L(j.replace(/ /g, "_"), [j]));

const FIELDS = [
  "it", "i t", "construction", "sales", "marketing", "finance", "education", "healthcare", "health care", "tourism", "logistics",
  "transport", "transportation", "retail", "banking", "agriculture", "a bank", "a school", "a hospital", "a factory", "an office",
  "a shop", "a store", "a restaurant", "a hotel", "a university", "a company", "an it company", "a warehouse", "a clinic",
  "a pharmacy", "a supermarket", "a bakery", "a kindergarten", "the government", "a law firm", "a call center", "customer service",
].map((f) => L(f.replace(/ /g, "_"), [f]));

const COMPANIONS = [
  "wife", "husband", "family", "kids", "children", "son", "daughter", "friend", "friends", "colleague", "colleagues", "coworker",
  "coworkers", "partner", "girlfriend", "boyfriend", "mother", "mom", "father", "dad", "parents", "sister", "brother", "group",
  "tour group", "team", "boss", "grandson", "granddaughter", "grandchildren",
].map((x) => L(x.replace(/ /g, "_"), [x]));

const DOCS = [
  L("passport", ["passport", "passports"]), L("esta", ["esta", "esta form", "esta approval", "e s t a"]), L("visa", ["visa", "work visa", "student visa"]),
  L("boarding", ["boarding pass", "boarding card"]), L("ticket", ["ticket", "return ticket", "plane ticket", "flight", "return flight", "booking", "reservation"]),
  L("form", ["customs form", "form", "declaration"]), L("phone", ["phone", "cell phone"]), L("address", ["address"]),
];

/** What the learner may ask about with "Do you mean …?" → the step it belongs to. */
const TOPICS = [
  L("job", ["my job", "my work", "what i do", "my profession", "my occupation", "what my job is", "what i do for work", "my job title"], ["h:j_mean"]),
  L("stay", ["where i am staying", "where i will stay", "where i am going to stay", "where i will sleep", "my hotel", "the hotel", "the address", "my address"], ["h:m_stay"]),
  L("length", ["how long i am staying", "how long i will stay", "how long", "how many days", "the dates", "how many weeks"], ["h:m_days"]),
  L("purpose", ["why i am here", "why i came", "why i am visiting", "the reason", "the purpose", "the reason for my trip", "my reason", "why i am in the us"], ["h:m_why"]),
  L("declare", ["food", "if i have food", "what is in my bag", "my bag", "my suitcase", "what i am bringing"], ["h:m_food"]),
  L("return", ["my ticket", "my return ticket", "a return ticket", "my flight back", "my flight home", "when i go back", "when i am going back", "when i fly back"]),
  L("first", ["if i have been here before", "if it is my first time", "my first time", "if i was here before", "if i was in the us before"]),
  L("alone", ["if i am alone", "who i am traveling with", "if i am traveling alone"]),
  L("cash", ["money", "cash", "how much money i have", "my money"]),
];

/** Words from the officer's questions that learners often ask about. */
const WORDS = [
  L("purpose", ["purpose", "the purpose"]), L("job", ["occupation", "for a living", "do for a living"]),
  L("declare", ["declare", "to declare", "anything to declare"]), L("return", ["return ticket", "round trip", "return flight"]),
  L("scanner", ["scanner", "the scanner"]), L("cash", ["carrying", "in cash"]), L("stay", ["staying", "where are you staying"]),
  L("esta", ["esta"]),
];
const WORD_LINE: Record<string, string> = { purpose: "mean_purpose", job: "mean_job", declare: "mean_declare", return: "mean_return", scanner: "mean_scanner", cash: "mean_cash", stay: "mean_stay", esta: "mean_esta" };

// ---------------------------------------------------------------------------
// Helpers

const toArr = (x: any): any[] => (x == null ? [] : Array.isArray(x) ? x : [x]);
const tagVal = (tags: string[], prefix: string) => tags.find((t) => t.startsWith(prefix))?.slice(prefix.length);
const allTags = (v: any, seg?: Segment): string[] => {
  const out: string[] = [...(seg?.tags || [])];
  const walk = (o: any) => { if (!o || typeof o !== "object") return; if (Array.isArray(o)) { o.forEach(walk); return; } out.push(...(o.__tags || [])); for (const [k, x] of Object.entries(o)) if (k !== "__tags") walk(x); };
  walk(v);
  return out;
};

/** Per-turn scratch state. The NLU may split one answer into several segments ("cheese" + "and chocolate"),
 *  and every segment runs its handler with the same ctx object, so handlers accumulate here and speak once. */
const TURN = new WeakMap<object, Record<string, any>>();
const turn = (c: Ctx) => { let x = TURN.get(c); if (!x) { x = {}; TURN.set(c, x); } return x; };
function ack(c: Ctx, p = 0.5) { const T = turn(c); if (T.acked) return; T.acked = true; if (c.chance(p)) c.say("ack"); }
function once(c: Ctx, key: string, line: string) { const T = turn(c); if (T["said_" + key]) return; T["said_" + key] = true; c.say(line); }

function goodsFrom(slots: any): string[] {
  const out: string[] = [];
  for (const gi of toArr(slots?.goods?.good_item)) {
    const id = gi?.good ?? tagVal(gi?.__tags || [], "g:");
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

function declareGoods(c: Ctx, goods: string[]) {
  const T = turn(c);
  const before: string[] = T.goods ?? [];
  const all = [...new Set([...before, ...goods])];
  T.goods = all;
  c.s.declared = "items";
  c.s.goods = all;
  const isBad = (id: string) => !goodById(id)?.attrs?.ok;
  const newBad = all.filter((id) => !before.includes(id) && isBad(id));
  if (newBad.length && !T.bin) {
    T.bin = true;
    c.s.confiscated = newBad;
    if (newBad.length > 1) c.say("not_allowed_many");
    else c.say("not_allowed", { X: newBad[0] });
    c.say("bin");
    c.expect(binPending());
    return;
  }
  if (!before.length && !newBad.length) {
    if (goods.length === 1 && c.chance(0.6)) c.say("item_fine", { X: goods[0] });
    else c.say("declare_ok");
  }
}

function binPending(): Pending {
  const done = (cc: Ctx) => { once(cc, "ty", "thank_you"); };
  return {
    id: "bin", hints: ["bin"], expects: ["sorry_ctx"], suggest: [{ lt: "Sutikti (arba atsiprašyti)", hint: "bin" }],
    on: {
      g_sorry: done, g_ok: done, sorry_ctx: done,
      g_repeat: (cc) => { if (/\?/.test(cc.heard)) return false; done(cc); },
    },
    yes: done,
    no: (cc) => { cc.say("rule"); },
    ask: (cc) => cc.say("bin"),
  };
}

function declareWhatPending(): Pending {
  return {
    id: "declare_what", expects: ["declare_items", "declare_nothing"], hints: ["goods", "declare"],
    suggest: [{ lt: "Pasakyti, ką veži", hint: "goods", options: ["cheese", "chocolate", "cookies", "candy", "honey", "sausage", "fruit"] }],
    on: {
      declare_items: (cc, sl, sg) => { declareGoods(cc, goodsFrom(sl)); },
      declare_nothing: (cc) => { cc.s.declared = "nothing"; ack(cc, 1); },
    },
    no: (cc) => { cc.s.declared = "nothing"; ack(cc, 1); },
    ask: (cc) => cc.say("declare_what"),
  };
}

function dogPending(): Pending {
  return {
    id: "dog", expects: ["declare_items", "declare_nothing"], hints: ["goods", "declare"],
    suggest: [{ lt: "Prisipažinti, kad veži maisto (sūrio, šokolado…)", hint: "goods", options: ["cheese", "chocolate", "cookies", "honey", "sausage"] }],
    on: {
      declare_items: (cc, sl) => { once(cc, "thanks", "thanks_telling"); declareGoods(cc, goodsFrom(sl)); },
      declare_nothing: (cc) => { cc.s.declared = "nothing"; cc.say("dog_insist"); },
    },
    yes: (cc) => { cc.say("declare_what"); cc.expect(declareWhatPending()); },
    no: (cc) => { cc.s.declared = "nothing"; cc.say("dog_insist"); },
    ask: (cc) => cc.say("dog_food_q"),
  };
}

function givePassport(c: Ctx) {
  if (c.s.passport) { c.say("already_have"); return; }
  c.s.passport = true;
  if (c.chance(0.6)) c.say("thank_you");
}

function setPurpose(c: Ctx, p: string, ev?: string) {
  if (p === "both") p = "business";
  c.s.purpose = p;
  c.s.purposeRetry = false;
  if (ev) c.s.event = ev;
  if (ev === "interview") c.say("good_luck");
  else ack(c, 0.4);
}

function retYes(c: Ctx) {
  c.s.ret = true;
  if (c.s.showTicket && !c.s.ticketShown) {
    c.s.ticketShown = true;
    c.twist("show_ticket");
    c.say("show_ticket");
    const ok = (cc: Ctx) => { cc.say("ticket_ok"); };
    c.expect({
      id: "show_ticket", expects: ["hand_over", "return_yes", "return_date"], hints: ["show"],
      suggest: [{ lt: "Parodyti bilietą (telefone)", hint: "show" }],
      on: { hand_over: ok, return_yes: ok, return_date: ok },
      yes: ok,
      no: (cc) => { cc.say("leave_90"); },
      ask: (cc) => cc.say("show_ticket"),
    });
    return;
  }
  ack(c, 0.6);
}

function retNo(c: Ctx) {
  c.s.ret = false;
  c.say("return_needed");
  c.say("check_email");
  const found = (cc: Ctx) => { cc.s.ret = true; cc.say("ticket_ok"); };
  const none = (cc: Ctx) => { cc.say("leave_90"); };
  c.expect({
    id: "ticket_check", expects: ["hand_over", "return_yes", "return_date"], hints: ["show", "return"],
    suggest: [{ lt: "Parodyti bilietą arba pasakyti, kad jo neturi", hint: "show" }],
    on: { hand_over: found, return_yes: found, return_date: found, return_no: none },
    yes: found,
    no: none,
    ask: (cc) => cc.say("check_email"),
  });
}

/** The return-ticket question. Its wording decides the model answers: "Do you have a return ticket?"
 *  (yes / it's on my phone) or "When are you flying back?" (a date). */
function returnPending(kind: "ticket" | "when"): Pending {
  const when = kind === "when";
  return {
    id: "return", expects: ["return_yes", "return_date", "return_no", "hand_over", "ask_mean"],
    hints: [when ? "fly_back" : "return", "show"],
    suggest: [when ? { lt: "Pasakyti, kada skrendi atgal", hint: "fly_back" } : { lt: "Atsakyti, ar turi bilietą atgal", hint: "return" }],
    on: {
      return_yes: (cc) => retYes(cc), return_date: (cc) => retYes(cc), return_no: (cc) => retNo(cc),
      hand_over: (cc) => retYes(cc),
    },
    yes: (cc) => retYes(cc), no: (cc) => retNo(cc),
    ask: (cc) => cc.say(when ? "ask_fly_back" : "ask_return_ticket"),
  };
}

function showAddressPending(line: string): Pending {
  const ok = (cc: Ctx) => { cc.s.address = true; once(cc, "ty", "thank_you"); };
  return {
    id: "show_address", expects: ["hand_over", "address_ctx"], hints: ["show", "address"],
    suggest: [{ lt: "Parodyti adresą telefone", hint: "show" }],
    on: { hand_over: ok, address_ctx: ok },
    yes: ok,
    no: (cc) => { cc.s.address = "none"; cc.say("address_none"); },
    ask: (cc) => cc.say(line),
  };
}

/** Biometrics: right hand → thumb (→ left hand), each confirmed with "Okay." / "Like this?".
 *  The guide names the one thing to do and offers the exact short replies first. */
const BIO_TASK = {
  right: "Padėti pirštus ant skenerio ir pasakyti „Okay“",
  thumb: "Padėti nykštį ir pasakyti „Okay“",
  left: "Padėti kairę ranką ir pasakyti „Okay“",
};
function bioPending(stage: "right" | "thumb" | "left"): Pending {
  const next = (cc: Ctx) => {
    if (stage === "right") { cc.say("bio_good"); cc.say("thumb"); cc.expect(bioPending("thumb")); return; }
    if (stage === "thumb" && cc.s.leftHand) { cc.say("bio_good"); cc.say("left_hand"); cc.expect(bioPending("left")); return; }
    cc.s.fingersDone = true;
    once(cc, "ty", "thank_you");
  };
  const line = stage === "right" ? "fingers" : stage === "thumb" ? "thumb" : "left_hand";
  return {
    id: stage === "right" ? "fingers" : stage, hints: ["bio_fingers"],
    suggest: [{ lt: BIO_TASK[stage], hint: "bio_fingers" }],
    on: {
      bio_ok_ctx: (cc) => next(cc),
      g_ok: (cc) => next(cc),
      like_this_ctx: (cc) => { cc.say("like_that_yes"); next(cc); },
      which_hand_ctx: (cc) => { cc.say(stage === "left" ? "left_hand_answer" : stage === "thumb" ? "thumb_answer" : "right_hand_answer"); cc.expect(bioPending(stage)); },
      glasses: (cc) => { cc.say("glasses_later"); cc.expect(bioPending(stage)); },
    },
    yes: (cc) => next(cc),
    no: (cc) => { cc.say("bio_please"); cc.expect(bioPending(stage)); },
    ask: (cc) => cc.say(line),
  };
}

function photoPending(): Pending {
  const done = (cc: Ctx) => { cc.s.photoDone = true; cc.say("photo_ok"); };
  return {
    id: "photo", hints: ["bio_photo"], suggest: [{ lt: "Pažiūrėti į kamerą ir pasakyti „Okay“", hint: "bio_photo" }],
    on: {
      bio_ok_ctx: done, g_ok: done, like_this_ctx: (cc) => { cc.say("like_that_yes"); done(cc); },
      glasses: (cc) => { cc.say("glasses_yes"); cc.expect(photoPending()); },
    },
    yes: done,
    no: (cc) => { cc.say("bio_please"); cc.expect(photoPending()); },
    ask: (cc) => cc.say("camera"),
  };
}

function glassesPending(): Pending {
  const done = (cc: Ctx) => { cc.say("camera"); cc.expect(photoPending()); };
  return {
    id: "glasses", hints: ["bio_glasses"], suggest: [{ lt: "Nusiimti akinius ir pasakyti „Sure“", hint: "bio_glasses" }],
    on: { bio_ok_ctx: done, g_ok: done, g_sorry: done, like_this_ctx: done },
    yes: done, no: (cc) => { cc.say("glasses_need"); cc.expect(glassesPending()); },
    ask: (cc) => cc.say("take_off_glasses"),
  };
}

/** "Do you mean …?": which step each topic belongs to and a simpler re-ask. */
const TOPIC_STEP: Record<string, string> = { job: "job", stay: "stay", length: "length", purpose: "purpose", declare: "declare", return: "return", first: "first", alone: "alone", cash: "cash" };
function simpleAsk(c: Ctx, step: string | null) {
  switch (step) {
    case "passport": c.say("simple_passport"); break;
    case "purpose": c.say("simple_purpose"); break;
    case "biz_kind": c.say("biz_kind"); break;
    case "who": c.say("who_visit"); break;
    case "visa": c.say(c.s.purpose === "study" ? "visa_q_study" : "visa_q_work"); break;
    case "length": c.say("simple_length"); break;
    case "stay": c.say(c.s.stay === "hotel_generic" ? "ask_which_hotel" : "simple_stay"); break;
    case "address": c.say("ask_address"); break;
    case "return": c.s.retQ = "ticket"; c.say("simple_return"); c.expect(returnPending("ticket")); break;
    case "first": c.s.firstQ = "before"; c.say("simple_first"); break;
    case "job": c.say("simple_job"); break;
    case "alone": c.say("simple_alone"); break;
    case "declare": c.say("simple_declare"); break;
    case "cash": c.say("simple_cash"); break;
    default: c.say("simple_nothing");
  }
}

const omit = (o: Record<string, string>, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

// Mission checklist helpers: a follow-up question (who? which hotel? what address?) keeps its main item open.
const stepDef = (id: string) => passport.steps.find((x) => x.id === id)!;
const applies = (c: Ctx, id: string) => { const st = stepDef(id); return !st.when || !!st.when(c); };
const stepOpen = (c: Ctx, id: string) => applies(c, id) && !stepDef(id).done(c);
/** The one extra question of a visit (return ticket, first time, job, travelling alone). */
const EXTRA = ["return", "first", "job", "alone"];

// Answers the simulation gives when Officer Diaz asks one of her optional questions. Each one fits every
// wording of its question ("Do you have a return ticket?" / "When are you flying back?", "First time in the US?" /
// "Have you been to the US before?").
const PP_AUTO: Record<string, string> = {
  passport: "Here you go.", purpose: "I'm here on vacation.", biz_kind: "A conference.", who: "My sister.", visa: "Yes, here it is.",
  length: "Two weeks.", stay: "At the Harborview Hotel.", address: "It's 25 Oak Avenue.", show_address: "Here you go.",
  return: "My return flight is on June 5th.", show_ticket: "Sure, here it is.", ticket_check: "Oh, here it is.",
  first: "It's my first time.", job: "I'm a teacher.", alone: "Yes, I'm traveling alone.",
  declare: "No, nothing.", declare_what: "Some cheese.", dog: "Oh, sorry. I have some cheese.", bin: "Okay, sorry.",
  cash: "No, only about five hundred dollars.", fingers: "Okay.", thumb: "Okay.", left: "Okay.", photo: "Okay.", glasses: "Sure.",
};

// ---------------------------------------------------------------------------

export const passport: SituationDef = {
  id: "s65a-passport",
  song: 65,
  songTitle: "Business or Pleasure?",
  title: { en: "Business or Pleasure?", lt: "Darbo reikalais ar poilsiui?" },
  topic: { en: "Passport control", lt: "Pasų kontrolė" },
  chapter: 1,
  order: 1,
  location: "airport",
  npc: "diaz",
  goal: "Praeik pasų kontrolę: atsakyk į pareigūnės klausimus.",
  intro: "Maple Harbor oro uostas. Išlipai iš lėktuvo ir stovi eilėje prie pasų kontrolės. Turi ESTA leidimą, o lagamine – lauktuvių: lietuviško sūrio ir šokolado.",
  entities: { rel: RELS, good: GOODS },

  grammar: {
    macros: {
      q: "(some | a little | a bit of | a little bit of | a piece of | a box of | a bar of | a bottle of | a jar of | a pack of | a bag of | a few | a couple of | two | three | lots of | a lot of)",
      for_whom: "((for | as) (my family | my friends | my sister | my son | my daughter | my kids | my grandchildren | family | friends | a gift | gifts | presents | souvenirs) | from lithuania | from home | in my bag | in my suitcase | with me)",
      my: "(my | a | our | the)",
      stay_verb: "(i am staying | i will stay | i will be staying | we are staying | i am going to stay | i will be | i am | i will live | i am going to live | we will live | i stay | we stay)",
      sights: "(new york | boston | chicago | washington | miami | florida | california | niagara falls | the grand canyon | the east coast | the west coast | the country | america | the us | the united states | the city | the sights | the ocean | the town)",
      unit: "(day #u:d | days #u:d | night #u:d | nights #u:d | week #u:w | weeks #u:w | month #u:m | months #u:m | year #u:y | years #u:y)",
      approx: "(about | around | roughly | approximately | maybe | probably | exactly | just | only | more or less)",
      in_us: "(here | in the us | in the united states | in america | in the usa | in the states | in the country)",
    },
    slots: {
      purpose: { lexicon: PURPOSES },
      hotel: { lexicon: HOTELS },
      hotel_any: { lexicon: HOTELS_ANY },
      street: { lexicon: STREETS },
      job: { lexicon: JOBS },
      field: { lexicon: FIELDS },
      comp: { lexicon: COMPANIONS },
      doc: { lexicon: DOCS },
      topic: { lexicon: TOPICS },
      word: { lexicon: WORDS },
      dur: { pattern: [
        "[@approx] (a #n1 | one #n1 | {number}) @unit",
        "[@approx] (a couple of #n2 | couple of #n2) @unit",
        "[@approx] (a few #vague | several #vague | a couple more #vague) @unit",
        "[@approx] (a week and a half #n10 | ten days or so #n10 | half a month #n15)",
        "[@approx] half a year #n180",
        "(until | till | through | up to) [the] {date} #until",
        "(until | till) the {ordinal} [of (this | next) month] #until",
        "(until | till) {day} #until",
        "(until | till) (the end of the month | the end of (june | july | august | the summer)) #until",
        "[@approx] {number} or {max:number} @unit", "[just | only] (a | the | one) [long] weekend #n2 #u:d", "[@approx] (one | a) week and a half #n10",
        "(i | we) (go | fly | leave | am going | am flying | am leaving | are going | are flying | are leaving) (back | home) [on] {date} #until",
      ] },
      good_item: { pattern: ["{good}", "lithuanian {good}", "sweets #tip:uk_sweets #g:candy", "biscuits #tip:uk_biscuits #g:cookies"] },
      goods: { pattern: "[@q] {good_item} [(and | and some | and a | plus | and a little | and also | and a few) [@q] {good_item}] [(and | and some | and a) [@q] {good_item}]" },
    },
  },

  intents: {
    // Handing over a document ("Here you go", "Here's my passport")
    hand_over: { patterns: [
      "here you go #h:pp_here", "here you are #h:pp_here", "there you go", "here it is #h:r_here", "here", "sure here",
      "here is my {doc} [and my {doc}] #h:pp_heres", "here is the {doc}", "this is my {doc}", "my {doc}",
      "here it is on my phone", "i found it [here it is]",
    ] },
    // "It's in my bag…": looking for the passport
    find_it: { patterns: ["(let me | i need to | i have to) find (it | my passport)", "(it is | my passport is) in my (bag | backpack | pocket | jacket | purse | other bag)", "where is my passport", "i can not find (it | my passport) [one second]"] },
    // "It was a long flight" (to "How are you?")
    long_flight: { patterns: ["[i am] [a bit | a little | very | so | really] tired [it was] [a | such a] (long | very long | really long) flight", "it was [a | such a] (long | very long | really long | tiring) flight", "[i am] [a bit | a little | very | so] jet lagged"] },
    purpose: { patterns: [
      "{purpose}",
      "[i am | we are] [here] (on | for) [a | an] {purpose} #h:p_here",
      "(it is | this is) [a | an] {purpose} [trip]", "(it is | this is) (for | on) [a | an] {purpose}",
      "(i came | i have come) (for | on) [a | an] {purpose}",
      "i am a tourist #pv:vacation #h:p_tourist", "we are tourists #pv:vacation",
      "(i am | we are) (going to | attending) [a | an] {purpose} #h:p_conference",
      "i have [a | an] {purpose} [here]",
      "i am meeting (clients | a client | partners | my colleagues | my team | customers | my boss) #pv:business #ev:meeting",
      "(i am here | i came | i am) to (study #pv:study #h:p_study | work #pv:work #h:p_work | relax #pv:vacation | travel #pv:vacation | rest #pv:vacation | see the (country | city | sights | town | ocean) #pv:vacation | have a vacation #pv:vacation | do business #pv:business)",
      "to (study #pv:study | work #pv:work | relax #pv:vacation | travel #pv:vacation | see the (country | city | sights) #pv:vacation)",
      "(i am going to | i will | i want to) (work #pv:work | study #pv:study) here", "i (have | got) a job here #pv:work",
      "i am (starting | going to start) a [new] job here #pv:work", "i am [just] traveling #pv:vacation",
      "(both | a bit of both | a little of both | business and pleasure | a little bit of both) #pv:both",
      // "I want to see New York", "business and tourism", "vacation with my wife", "Sorry, I meant a business trip"
      "(i want to | i would like to | i am going to | i came to | we want to | to) (see | visit | travel around | explore) @sights [and @sights] #pv:vacation",
      "business and (tourism | vacation | sightseeing) #pv:both", "{purpose} with (my | our) (wife | husband | family | kids | children | friends | partner | girlfriend | boyfriend)",
      "(i am | we are) here (on | for) [a | an] {purpose} with (my | our) (wife | husband | family | kids | children | friends | partner)",
      "(i came | we came) for a {purpose} with (my | our) (wife | husband | family | kids | children | friends)", "(sorry | no) (i mean | i meant) [a | an] {purpose} [trip]",
      "i have [a | an] {purpose} (in | at) (boston | new york | chicago | maple harbor | the city | town)", "(i am | we are) here for (a | my | our) [{rel}] wedding #pv:vacation",
      "[i came] for (a | the | my | our) [{rel}] wedding #pv:vacation", "[for] (my | our) {rel} [s] wedding #pv:vacation",
    ] },
    purpose_visit: { patterns: [
      "(i am | we are) visiting @my {rel} #h:p_visit", "(i am | we are) visiting {rel} #h:p_friends",
      "(i am | we are) here to (visit | see) @my {rel}", "(i came | i am here) to (visit | see) @my {rel}",
      "to (visit | see) @my {rel} #h:v_to_visit", "(visiting | to visit | to see) {rel}", "visiting @my {rel}",
      "(family | friends) #fam", "(i am | we are) here (for | to see) @my {rel}", "a family visit #fam",
      "@my {rel} (lives | live) here [and] [i (visit | am visiting) (him | her | them)]", "(i want | i would like | i am going | we want) to (visit | see) @my {rel}",
    ] },
    purpose_neg: { patterns: [
      "(i am | it is | we are) not [here] (on | for) [a | an] {purpose}", "not (for | on) [a | an] {purpose}", "not {purpose}",
      "(it is | this is) not [a | an] {purpose} [trip]", "i am not a tourist",
    ] },
    have_esta: { patterns: [
      "[no] (i have | i only have | i am on | i came on | i am traveling on) (an | the) esta [only] #h:esta_only", "[no] i only have (an | the) esta #h:esta_only", "[no] (just | only) (an | the) esta",
      "[no] (just | only) [an | the] esta", "[no] i (have | only have) [an | the] esta (not a visa | no visa)",
      "[no] i do not have (a | any) [work | student] visa", "[no] i do not have one", "[no] no visa [just an esta]",
    ] },
    who_ctx: { patterns: ["@my {rel} #h:v_my", "{rel}", "(i am visiting | i am seeing) @my {rel}"] },
    length: { patterns: [
      "{dur} #h:d_short", "for {dur} #h:d_for",
      "(i am | i will be | we are | we will be) (staying | here | staying here) [@in_us] [for] {dur} #h:d_staying",
      "(i will | we will | i am going to | i plan to | i want to) stay [here] [for] {dur}",
      "(i will | we will) be @in_us [for] {dur}", "(it is | it will be) [for] {dur}", "{dur} (i think | more or less)",
      "(i | we) (stay | stay here) [@in_us] [for] {dur}", "{dur} (not more | no more | maximum | at most | or less)",
    ] },
    length_vague: { patterns: [
      "[for] (a while | some time | not long | not very long | a short time | a little while)", "(the whole | all) (summer | winter | spring | fall | season)",
      "(i am staying | i will stay) (a while | some time | not long | a short time)",
    ] },
    stay: { patterns: [
      "(at | in) [the] {hotel} #h:w_hotel", "[the] {hotel}", "(it is | the hotel is) [the] {hotel}",
      "@stay_verb (at | in) [the] {hotel} #h:w_staying", "(i will | we will | i am going to) stay (at | in) [the] {hotel}",
      "(i have | we have) a (reservation | booking) (at | in) [the] {hotel}", "i booked [a room at] [the] {hotel}",
      "[@stay_verb] (at | in) (a | the) {hotel:hotel_any}", "(i have | we have) a (reservation | booking) (at | in) a {hotel:hotel_any}",
      "[@stay_verb] [at | in] [the] {hotel} (downtown | in town | near the airport | by the harbor | by the water)",
    ] },
    stay_with: { patterns: [
      "(with | at) @my {rel} [(place | house | home | apartment)] #h:w_friend",
      "@stay_verb (with | at) @my {rel} [(place | house | home | apartment)] #h:w_family",
      "[@stay_verb] (with | at) (her | him | them | his | their) [(place | house | home)] #pron",
      "@my {rel} (place | house | home | apartment)", "[@stay_verb] (with | at) @my {rel} [(place | house | home | apartment)] [at | on] {number} {street} #addr",
      "@my {rel} (place | house | home | apartment) {number} {street} #addr",
    ] },
    stay_airbnb: { patterns: [
      "[@stay_verb] (in | at) (an | a) (airbnb | air bnb | rental | rented apartment | apartment | vacation rental | rental apartment | rented house) #h:w_airbnb",
      "i (rented | have rented | booked | have booked) (an | a) (apartment | airbnb | house | room)",
      "[@stay_verb] at {number} {street} #h:w_address #addr",
    ] },
    hotel_other_ctx: { patterns: [
      "[@stay_verb] (at | in) (the | a) {w:any} (hotel | inn | motel | hostel | resort)", "(the | a) {w:any} (hotel | inn | motel)",
      "[@stay_verb] (at | in) (a | the) (hostel | motel | inn | bed and breakfast | b and b | guesthouse | guest house | youth hostel)",
    ] },
    address_ctx: { patterns: [
      "[it is | the address is | that is] [at] {number} {street} #h:a_its",
      "[it is] [at] {number} {w:any} (street | avenue | road | drive | lane | boulevard | way)", "[it is] on {street}", "[it is] {street} [number] {number}",
    ] },
    address_phone: { patterns: ["[it is] on my phone #h:a_phone", "i have it on my phone", "(can i | let me) (check | look at) my phone", "i have it (here | in my phone | in my email)", "it is in my email", "i have it written (down | on paper | here)", "it is written (down | here)",
      "(i will | let me) check [on] my (phone | email)", "(i will | let me | i can) show you (on my phone | the address)"] },
    // only as an answer to "What's the address?": "Just a moment, I'll check." / "I'll show you."
    address_show_ctx: { patterns: ["(i will | let me) check", "(i will | let me | i can) show you"] },
    address_dunno: { patterns: ["i do not (know | have | remember) (it | the address) [exactly | right now | by heart]", "i do not know the (exact address | street)", "i am not sure (about | of) the address", "i do not remember [exactly]", "i forgot (it | the address)"] },
    return_yes: { patterns: [
      "yes i do #h:r_yes", "[yes] i have (one | it) [here]", "[yes] (i have | i have got) [a] (return | round trip) [ticket | flight]",
      "[yes] (it is | i have it) (on my phone | in my email) #h:r_phone", "[yes] i have a (ticket | flight) (home | back)",
      "[yes] (on | in) my (phone | email)", "[yes] i have a round trip [ticket]",
    ] },
    return_date: { patterns: [
      "[yes] [on] {date} #h:r_date", "[yes] on the {ordinal}", "[yes] [on] {day}",
      "[yes] (i fly | i am flying | i go | i am going | i leave | i am leaving | my flight is | my return flight is | it is) [back | home] [on] {date} #h:r_fly",
      "[yes] (i fly | i am flying | i go | i am going | i leave | i am leaving | my flight is) [back | home] (on the {ordinal} | {day} | on {day})",
      "(in | after) {dur} #h:r_in", "[yes] (i fly | i am flying | i go | i am going) [back | home] in {dur}",
      "[yes] next (week | month)", "[yes] at the end of (the month | june | july | august | september)", "[yes] in (june | july | august | september | october)",
    ] },
    return_no: { patterns: ["[no] not yet", "[no] i do not have (one | it | a return ticket | a ticket | a return flight) yet", "[no] i do not have (a return ticket | a ticket back | a return flight)", "[no] i have not bought (one | it) yet", "i will buy it (later | here)"] },
    first_yes: { patterns: [
      "[yes] (it is | this is) my first (time | visit | trip) [@in_us | to the us | to america] #h:f_first", "[yes] (my | the) first time", "[yes] first time [here]",
      "[yes] i have never been (here | to the us | to the united states | to america) [before]", "[yes] never [before]", "[yes] it is the first time",
      "(yes | yeah) [it is my first time] [and] i am (very | so | really) excited",
    ] },
    first_no: { patterns: [
      "[no] (i have | i have already) been here (before | once | twice | many times | a few times) #h:f_before",
      "[no] (it is | this is) my (second | third | fourth | fifth) (time | visit | trip) #h:f_second",
      "[no] i was here (in {year} | last year | last summer | {number} years ago | a few years ago | before | once)",
      "[no] i (came | came here | visited) (in {year} | last year | last summer | {number} years ago | a few years ago | before | once)",
      "[no] i have been to the (us | united states | usa | states) (before | once | twice)", "[no] (many times | a few times | several times | twice | once before)",
      "[no] not my first time",
      "[no] [my | the] (second | third | fourth) time [here]", "[no] (it is | this is) not my first (time | visit | trip)",
    ] },
    job: { patterns: [
      "i am (a | an) {job} #h:j_im", "i work as (a | an) {job} #h:j_as", "[a | an] {job}",
      "i am [a] (retired #j:retired #h:j_retired | pensioner #j:retired | unemployed #j:none | between jobs #j:none | self employed #j:self | housewife #j:home | stay at home (mom | dad | mother | father | parent) #j:home | business owner #j:self)",
      "retired #j:retired", "(i am | i work as) (a | an) {job} (at | in | for) [a | an | the] {field}",
      "i work (in | at | for) {field} #h:j_field", "i (own | have | run) (a | my own) [small] (business | company | shop | store | restaurant | farm) #j:self #h:j_own",
      "i do not work [anymore | right now] #j:none",
    ] },
    job_other_ctx: { patterns: ["i am (a | an) {w:any}", "i work (as | in | at | for) [a | an | the] {w:any}"] },
    alone_yes: { patterns: [
      "[yes] i am (traveling | here) (alone | by myself | on my own) #h:al_alone", "[yes] (alone | by myself | on my own | just me | only me | solo)",
      "[yes] i am alone", "[yes] traveling alone",
    ] },
    alone_with: { patterns: [
      "[no] [i am traveling | we are traveling | i am here | i came | i am | traveling] with (my | a | our) {comp} [and (my | our) {comp}] #h:al_with",
      "[no] (my | a) {comp} (is | are) with me", "[no] (me and | i am with) (my | a) {comp}", "[no] we are a (group | family)",
    ] },
    declare_nothing: { patterns: [
      "[no] nothing [at all] #h:dec_nothing", "[no] nothing to declare #h:dec_nothing2", "[no] i have nothing [to declare]",
      "[no] i do not have anything [to declare]", "[no] i am not (bringing | carrying) anything", "[no] no (food | plants | animals) [no plants | no animals]",
      "[no] i do not have any (food | plants | animals) #h:dec_no_food", "[no] none", "[no] nothing like that",
      "[no] (just | only) [my] (clothes | personal things | personal items | things | stuff | own things)", "[no] nothing special", "[no] only my personal (things | items | stuff)",
    ] },
    declare_neg_good: { patterns: ["[no] i do not have [any] {good}", "[no] no {good}", "not {good}", "[no] i am not bringing [any] {good}", "[no] i have no {good}"] },
    declare_items: { patterns: [
      "[yes] i have [got] {goods} [@for_whom] #h:dec_have", "[yes] (just | only) {goods} [@for_whom] #h:dec_just",
      "[yes] {goods} [@for_whom] #h:dec_family", "[yes] i am bringing {goods} [@for_whom]",
      "[sorry] i forgot [i have] {goods} [@for_whom]",
    ] },
    declare_q: { patterns: ["(can | may) i bring {good} [into the (us | country | united states)] #h:dec_can", "is {good} (okay | allowed | ok) #h:dec_ok", "(are | is) {good} allowed", "can i (have | keep) (my | the) {good}"] },
    cash_no: { patterns: [
      "[no] i am not #h:c_no", "[no] (only | just) [about | around] {price} #h:c_about", "[no] (less than | under) [that | ten thousand [dollars]]",
      "[no] not that much", "[no] (i have | i am carrying) (only | just) [about | around] {price} [in cash]", "no way",
      "[no] (much | a lot | far) less [than that]", "[no] i (have | use | pay with) (a | my) (card | credit card | cards)", "[no] not so much", "[no] i (only | just) have (cards | a card)",
      "[no] (just | only) (a little | a bit | a little cash | some cash | a few hundred [dollars])",
    ] },
    cash_amount: { patterns: ["[yes] i (have | am carrying) [about | around] {price} [in cash]", "[yes] [about | around] {price} [in cash]"] },
    like_this_ctx: { patterns: ["like this #h:b_like", "is (this | that) (okay | right | good | correct) #h:b_ok", "this way", "(here | this) okay"] },
    // The short replies to a command ("Look at the camera." → "Okay.")
    bio_ok_ctx: { patterns: [
      "(okay | ok | all right | alright) #h:b_okay", "sure #h:b_sure", "(okay | sure | all right) (no problem | of course)",
      "no problem", "of course", "sure thing", "[oh] [okay] sorry #h:b_sorry", "(done | ready | all done)", "[okay] i am ready",
    ] },
    which_hand_ctx: { patterns: ["which hand #h:b_which", "(the | my) (right | left) hand", "right or left [hand]", "which (fingers | finger)", "(all | the) four fingers", "both hands", "(my | the) thumb [too]", "which one", "(right | left) hand", "all four [fingers]", "(only | just) the thumb", "the thumb only"] },
    word_meaning: { patterns: [
      "[sorry] what does [the word] {word} mean #h:c_meaning", "[sorry] what is (a | an | the) {word}", "[sorry] i do not (know | understand) [the word] {word}",
      "[sorry] what do you mean by {word}",
    ] },
    glasses: { patterns: ["should i take (off my glasses | my glasses off) #h:b_glasses", "(do i need to | do i have to) take (off my glasses | my glasses off)", "my glasses [too]", "(and | what about) my glasses"] },
    sorry_ctx: { patterns: ["[okay | oh | all right] sorry #h:bin_sorry", "[oh] [sorry] i did not know [that] #h:bin_didnt_know", "okay i understand", "sorry about that", "no problem", "(really | oh really) [okay]", "okay i did not know"] },
    q_esta: { patterns: ["do you need my (esta | visa) [too | as well] #h:pp_esta", "(should i show you | do i need to show) my (esta | visa)", "what about my (esta | visa)", "do you need to see my esta", "(and | also | what about) (the | my) (esta | visa) [too]", "(should i show you | do you need) my (esta | visa) too"] },
    q_boarding: { patterns: ["(should i show you | do you need) my (ticket | boarding pass | plane ticket) [too] #h:pp_boarding"] },
    q_form: { patterns: ["do i need to fill out (a | any) (form | customs form | declaration) #h:q_form", "(is there | do i need) a (customs form | form)", "do i need (a | any) form"] },
    q_baggage: { patterns: ["where is (the | my) (baggage claim | luggage | baggage | bag) #h:q_baggage", "where (can | do) i (get | pick up | collect) my (bags | luggage | suitcase | bag)", "where is (the) baggage reclaim #tip:uk_reclaim"] },
    q_restroom: { patterns: ["where is the (restroom | bathroom | mens room | ladies room) #h:q_restroom", "where is the toilet #tip:us_restroom", "is there a (restroom | bathroom) [here | nearby]"] },
    q_taxi: { patterns: ["where (can i | do i) (get | find | take) a (taxi | cab) #h:q_taxi", "where is the taxi stand", "where is the taxi rank #tip:uk_taxi_rank", "where are the (taxis | cabs)"] },
    q_limit: { patterns: ["how long can i stay [@in_us] #h:q_how_long", "how many days can i stay [@in_us]", "what is the (limit | maximum) [for an esta]"] },
    ask_mean: { patterns: ["[sorry] do you mean {topic}", "[sorry] (you mean | is it about) {topic}", "[sorry] are you asking (about | if) {topic}"] },
  },

  lines: {
    next: [
      t("Next!", "Kitas!", "Kitas!"),
      t("Next, | please!", "Kitas, | prašau!", "Kitas, prašau!"),
    ],
    greet_passport: [
      t("Hi there. | Passport, | please.", "Sveiki. | Pasą, | prašau.", "Sveiki. Pasą, prašau."),
      t("Good | evening. | Passport, | please.", "Labas | vakaras. | Pasą, | prašau.", "Labas vakaras. Pasą, prašau."),
      t("Hello. | May | I | see | your | passport, | please?", "Sveiki. | Ar galėčiau | aš | pamatyti | jūsų | pasą, | prašau?", "Sveiki. Ar galėčiau pamatyti jūsų pasą?"),
      t("Hi. | Can | I | have | your | passport?", "Sveiki. | Ar galiu | aš | gauti | jūsų | pasą?", "Sveiki. Jūsų pasą, prašau."),
    ],
    greet_howareyou: [
      t("Hi there. | How | are | you | doing | today?", "Sveiki. | Kaip | — | jums | sekasi | šiandien?", "Sveiki. Kaip jums šiandien sekasi?",
        { flags: { 2: "Progressive “are” has no Lithuanian word; sekasi carries the tense (linked to “doing”)." } }),
      t("Good | evening. | How | are | you?", "Labas | vakaras. | Kaip | sekasi | jums?", "Labas vakaras. Kaip sekasi?"),
    ],
    ask_passport: [
      t("Passport, | please.", "Pasą, | prašau.", "Pasą, prašau."),
      t("Your | passport, | please.", "Jūsų | pasą, | prašau.", "Jūsų pasą, prašau."),
      t("Can | I | see | your | passport?", "Ar galiu | aš | pamatyti | jūsų | pasą?", "Ar galiu pamatyti jūsų pasą?"),
    ],
    already_have: [t("I | already | have | it, | thanks.", "Aš | jau | turiu | jį, | ačiū.", "Jį jau turiu, ačiū.")],
    thank_you: [
      t("Thank | you.", "Dėkoju | jums.", "Ačiū."),
      t("Thanks.", "Ačiū.", "Ačiū."),
    ],
    ack: [
      t("Okay.", "Gerai.", "Gerai."),
      t("Alright.", "Gerai.", "Gerai."),
      t("Got it.", "Supratau.", "Supratau."),
    ],
    // Purpose
    ask_purpose: [
      t("What's | the | purpose | of | your | visit?", "Koks yra | — | tikslas | — | jūsų | vizito?", "Koks jūsų vizito tikslas?",
        { flags: { 3: "“of”: no separate Lithuanian word; the genitive vizito carries it." } }),
      t("What | brings | you | to | the | US?", "Kas | atveda | jus | į | — | JAV?", "Kokiu tikslu atvykote į JAV?"),
      t("Business | or | pleasure?", "Darbo reikalais | ar | poilsiui?", "Darbo reikalais ar poilsiui?"),
      t("Are | you | here | for | business | or | pleasure?", "Ar esate | jūs | čia | — | darbo reikalais | ar | poilsiui?", "Ar atvykote darbo reikalais, ar poilsiui?",
        { flags: { 3: "“for”: no separate Lithuanian word; the instrumental darbo reikalais and the dative poilsiui carry the purpose." } }),
    ],
    purpose_retry: [t("So, | business | or | pleasure?", "Tai | darbo reikalais | ar | poilsiui?", "Tai darbo reikalais ar poilsiui?")],
    purpose_help: [t("Vacation? | Business? | Visiting | family?", "Atostogos? | Darbo reikalai? | Lankote | šeimą?", "Atostogos? Darbo reikalai? Šeimos lankymas?")],
    simple_purpose: [t("Why | are | you | here? | Vacation? | Business?", "Kodėl | esate | jūs | čia? | Atostogos? | Darbo reikalai?", "Kodėl atvykote? Atostogų? Darbo reikalais?")],
    biz_kind: [
      t("What | kind | of | business?", "Kokio | pobūdžio | — | reikalai?", "Kokiais reikalais?",
        { flags: { 2: "“of”: no separate Lithuanian word; the genitive kokio pobūdžio carries the relation." } }),
      t("Is | it | a | meeting | or | a | conference?", "Ar | tai | — | susitikimas | ar | — | konferencija?", "Susitikimas ar konferencija?",
        { flags: { 0: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }),
    ],
    good_luck: [t("Good luck | with | your | interview!", "Sėkmės | per | jūsų | pokalbį!", "Sėkmės per pokalbį!")],
    who_visit: [
      t("Who | are | you | visiting?", "Ką | — | jūs | aplankysite?", "Ką aplankysite?",
        { flags: { 1: "“are” (+ visiting): no separate word; the future aplankysite carries the planned visit." } }),
    ],
    visa_q_work: [t("To work? | Do | you | have | a | work | visa?", "Dirbti? | Ar | jūs | turite | — | darbo | vizą?", "Dirbti? Ar turite darbo vizą?")],
    visa_q_study: [t("To study? | Do | you | have | a | student | visa?", "Studijuoti? | Ar | jūs | turite | — | studento | vizą?", "Studijuoti? Ar turite studento vizą?")],
    visa_ok: [t("Okay, | I | see | it | here.", "Gerai, | aš | matau | ją | čia.", "Gerai, matau ją čia.")],
    esta_no_work: [
      t("With | an | ESTA, | you | can't work | or | study | here.", "Su | — | ESTA leidimu | jūs | negalite dirbti | ar | studijuoti | čia.", "Su ESTA leidimu dirbti ar studijuoti čia negalite."),
    ],
    esta_can: [
      t("You | can | come | on vacation | or | on business.", "Jūs | galite | atvykti | atostogų | arba | darbo reikalais.", "Galite atvykti atostogų arba darbo reikalais."),
    ],
    // Length of stay
    ask_length: [
      t("How long | are | you | staying?", "Kiek laiko | — | jūs | būsite?", "Kiek laiko čia būsite?",
        { flags: { 1: "“are” (+ staying): no separate word; the future būsite carries it." } }),
      t("How long | will | you | be | in the US?", "Kiek laiko | — | jūs | būsite | JAV?", "Kiek laiko būsite JAV?",
        { flags: { 1: "“will”: no separate word; the future ending of būsite carries it." } }),
      t("How long | do | you | plan | to stay?", "Kiek laiko | — | jūs | planuojate | pabūti?", "Kiek laiko planuojate pabūti?",
        { flags: { 1: "Question “do” has no Lithuanian word (linked to “plan”)." } }),
    ],
    ask_length_again: [
      t("So | how long | are | you | staying?", "Tai | kiek laiko | — | jūs | būsite?", "Tai kiek laiko būsite?",
        { flags: { 2: "“are” (+ staying): the future būsite carries it." } }),
    ],
    length_help: [t("Roughly. | A | week? | Two | weeks? | A | month?", "Apytiksliai. | — | Savaitę? | Dvi | savaites? | — | Mėnesį?", "Apytiksliai. Savaitę? Dvi savaites? Mėnesį?")],
    simple_length: [
      t("How many | days | are | you | staying?", "Kiek | dienų | — | jūs | būsite?", "Kiek dienų būsite?",
        { flags: { 2: "“are” (+ staying): the future būsite carries it." } }),
    ],
    vague_length: [
      t("About | how many | days?", "Maždaug | kiek | dienų?", "Maždaug kiek dienų?"),
      t("How many | days, | exactly?", "Kiek | dienų, | tiksliai?", "Kiek tiksliai dienų?"),
    ],
    esta_90: [
      t("That's | too | long | for | an | ESTA. | You | can | stay | up to | 90 | days.", "Tai yra | per | ilgai | — | — | ESTA leidimui. | Jūs | galite | būti | iki | 90 | dienų.",
        "Su ESTA leidimu tai per ilgai. Galite būti iki 90 dienų.",
        { say: "That's too long for an ESTA. You can stay up to ninety days.", flags: { 3: "“for”: no separate word; the dative leidimui carries it." } }),
    ],
    // Where staying
    ask_where: [
      t("Where | are | you | staying?", "Kur | — | jūs | apsistosite?", "Kur apsistosite?",
        { flags: { 1: "“are” (+ staying): no separate word; the future apsistosite carries it." } }),
      t("Where | will | you | stay?", "Kur | — | jūs | apsistosite?", "Kur apsistosite?",
        { flags: { 1: "“will”: no separate word; the future ending of apsistosite carries it." } }),
      t("And | where | are | you | staying?", "O | kur | — | jūs | apsistosite?", "O kur apsistosite?",
        { flags: { 2: "“are” (+ staying): the future apsistosite carries it." } }),
    ],
    stay_help: [t("A | hotel? | A | friend's | place?", "— | Viešbutyje? | — | Draugo | namuose?", "Viešbutyje? Pas draugą?")],
    simple_stay: [t("Your | hotel, | or | the | address.", "Jūsų | viešbutis | arba | — | adresas.", "Jūsų viešbutis arba adresas.")],
    ask_which_hotel: [
      t("Which | hotel?", "Kuriame | viešbutyje?", "Kuriame viešbutyje?"),
      t("Which one? | What's | the | name | of | the | hotel?", "Kuriame? | Koks yra | — | pavadinimas | — | — | viešbučio?", "Kuriame? Kaip vadinasi viešbutis?",
        { flags: { 4: "“of”: no separate word; the genitive viešbučio carries it." } }),
    ],
    ask_address: [
      t("What's | the | address?", "Koks yra | — | adresas?", "Koks adresas?"),
      t("Do | you | have | the | address?", "Ar | jūs | turite | — | adresą?", "Ar turite adresą?"),
    ],
    address_show: [t("Okay, | can | I | see | it?", "Gerai, | ar galiu | aš | pamatyti | jį?", "Gerai, ar galiu pamatyti?")],
    address_check: [t("Could | you | check | your | phone?", "Ar galėtumėte | jūs | patikrinti | savo | telefoną?", "Gal galite patikrinti telefone?")],
    address_none: [
      t("Okay. | You | should | always | have | the | address | with | you.", "Gerai. | Jūs | turėtumėte | visada | turėti | — | adresą | su | savimi.", "Gerai. Adresą visada turėkite su savimi."),
    ],
    // Return ticket
    ask_return_ticket: [
      t("Do | you | have | a | return | ticket?", "Ar | jūs | turite | — | grįžimo | bilietą?", "Ar turite bilietą atgal?"),
      t("Do | you | have | a | ticket | back | home?", "Ar | jūs | turite | — | bilietą | atgal | namo?", "Ar turite bilietą namo?"),
    ],
    ask_fly_back: [
      t("When | are | you | flying | back?", "Kada | — | jūs | skrendate | atgal?", "Kada skrendate atgal?",
        { flags: { 1: "“are” (+ flying): no separate word; the present skrendate carries the planned trip." } }),
    ],
    simple_return: [t("Do | you | have | a | ticket | home?", "Ar | jūs | turite | — | bilietą | namo?", "Ar turite bilietą namo?")],
    show_ticket: [
      t("Can | I | see | it, | please?", "Ar galiu | aš | pamatyti | jį, | prašau?", "Ar galiu jį pamatyti?"),
      t("Can | I | see | your | return | ticket?", "Ar galiu | aš | pamatyti | jūsų | grįžimo | bilietą?", "Ar galiu pamatyti jūsų bilietą atgal?"),
    ],
    ticket_ok: [
      t("Okay, | thank | you.", "Gerai, | dėkoju | jums.", "Gerai, ačiū."),
      t("Great, | that's | fine.", "Puiku, | tai yra | gerai.", "Puiku, viskas gerai."),
    ],
    return_needed: [
      t("On | an | ESTA, | you | need | a | return | ticket.", "Su | — | ESTA leidimu | jums | reikia | — | grįžimo | bilieto.", "Su ESTA leidimu reikia turėti bilietą atgal."),
    ],
    check_email: [t("Can | you | check | your | email?", "Ar galite | jūs | patikrinti | savo | el. paštą?", "Gal galite patikrinti el. paštą?")],
    leave_90: [
      t("Okay. | Just | make sure | you | leave | within | 90 | days.", "Gerai. | Tik | būtinai | jūs | išvykite | per | 90 | dienų.", "Gerai. Tik būtinai išvykite per 90 dienų.",
        { say: "Okay. Just make sure you leave within ninety days." }),
    ],
    // First time
    ask_first: [
      t("Is | this | your | first | time | in the US?", "Ar | tai | jūsų | pirmas | kartas | JAV?", "Ar tai jūsų pirmas kartas JAV?",
        { flags: { 0: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }),
      t("First | time | in the US?", "Pirmas | kartas | JAV?", "Pirmą kartą JAV?"),
    ],
    ask_before: [
      t("Have | you | been | to the US | before?", "Ar esate | jūs | {m:buvęs|f:buvusi} | JAV | anksčiau?", "Ar esate {m:buvęs|f:buvusi} JAV anksčiau?"),
    ],
    simple_first: [t("Were | you | here | before?", "Ar buvote | jūs | čia | anksčiau?", "Ar buvote čia anksčiau?")],
    first_welcome: [t("Well, | welcome!", "Na, | sveiki atvykę!", "Na, sveiki atvykę!")],
    welcome_back: [t("Welcome | back.", "Sveiki | sugrįžę.", "Sveiki sugrįžę.")],
    // Job
    ask_job: [
      t("What | do | you | do | for a living?", "Ką | — | jūs | dirbate | pragyvenimui?", "Kuo dirbate?",
        { flags: { 1: "Question “do” has no Lithuanian word (linked to the second “do” = dirbate)." } }),
      t("What's | your | occupation?", "Kokia yra | jūsų | profesija?", "Kokia jūsų profesija?"),
      t("And | what | do | you | do?", "O | ką | — | jūs | dirbate?", "O kuo dirbate?",
        { flags: { 2: "Question “do” has no Lithuanian word (linked to the second “do” = dirbate)." } }),
    ],
    simple_job: [t("What's | your | job?", "Koks yra | jūsų | darbas?", "Koks jūsų darbas?")],
    retired_ack: [t("Enjoy | your | retirement!", "Mėgaukitės | savo | pensija!", "Gero poilsio pensijoje!")],
    // Travelling alone
    ask_alone: [
      t("Are | you | traveling | alone?", "Ar | jūs | keliaujate | {m:vienas|f:viena}?", "Ar keliaujate {m:vienas|f:viena}?",
        { flags: { 0: "Progressive “Are” in a question = the particle ar; the present keliaujate carries the tense (linked to “traveling”)." } }),
      t("Just | you | today?", "Tik | jūs | šiandien?", "Keliaujate {m:vienas|f:viena}?"),
    ],
    simple_alone: [t("Are | you | alone?", "Ar esate | jūs | {m:vienas|f:viena}?", "Ar esate {m:vienas|f:viena}?")],
    // Declaration
    ask_declare: [
      t("Do | you | have | anything | to declare?", "Ar | jūs | turite | ką nors | deklaruoti?", "Ar turite ką deklaruoti?"),
      t("Anything | to declare?", "Ką nors | deklaruoti?", "Ar turite ką deklaruoti?"),
    ],
    ask_food: [
      t("Are | you | bringing | any | food, | plants | or | animals?", "Ar | jūs | vežate | kokio nors | maisto, | augalų | ar | gyvūnų?", "Ar vežate maisto, augalų ar gyvūnų?",
        { flags: { 0: "Progressive “Are” in a question = the particle ar; vežate carries the tense (linked to “bringing”)." } }),
      t("Do | you | have | any | food | with | you?", "Ar | jūs | turite | kokio nors | maisto | su | savimi?", "Ar turite su savimi maisto?"),
    ],
    simple_declare: [t("Do | you | have | any | food | in | your | bag?", "Ar | jūs | turite | kokio nors | maisto | — | savo | krepšyje?", "Ar krepšyje turite maisto?",
      { flags: { 5: "“in”: no separate word here; the locative krepšyje carries it (savo intervenes)." } })],
    declare_what: [
      t("Okay. | What | do | you | have?", "Gerai. | Ką | — | jūs | turite?", "Gerai. Ką turite?",
        { flags: { 2: "Question “do” has no Lithuanian word (linked to “have”)." } }),
    ],
    declare_more: [t("Okay. | Any | other | food?", "Gerai. | Kokio nors | kito | maisto?", "Gerai. O kito maisto?")],
    declare_ok: [
      t("That's | fine. | Thanks | for | declaring | it.", "Tai yra | gerai. | Ačiū, | kad | deklaravote | tai.", "Viskas gerai. Ačiū, kad deklaravote."),
      t("No | problem, | that's | allowed.", "Jokių | problemų, | tai yra | leidžiama.", "Jokių problemų, tai leidžiama."),
    ],
    item_fine: [t("That's | fine, | you | can | bring | {X}.", "Tai yra | gerai, | jūs | galite | įvežti | {X:acc}.", "Gerai, {X:acc} įvežti galima.")],
    not_allowed: [
      t("Sorry, | you | can't bring | {X} | into | the | US.", "Atsiprašau, | jūs | negalite įvežti | {X:gen} | į | — | JAV.", "Atsiprašau, {X:gen} į JAV įvežti negalima."),
    ],
    not_allowed_many: [
      t("Sorry, | you | can't bring | meat, | fresh | fruit | or | plants | into | the | US.", "Atsiprašau, | jūs | negalite įvežti | mėsos, | šviežių | vaisių | ar | augalų | į | — | JAV.", "Atsiprašau, mėsos, šviežių vaisių ar augalų į JAV įvežti negalima."),
    ],
    bin: [
      t("Please | put | it | in | that | bin | over | there.", "Prašau | įdėti | tai | į | tą | konteinerį | — | ten.", "Prašau įmesti tai į aną konteinerį.",
        { flags: { 6: "“over” (over there): no separate Lithuanian word; ten carries the direction." } }),
    ],
    rule: [t("I'm sorry, | it's | the | law.", "Atsiprašau, | tai yra | — | įstatymas.", "Atsiprašau, toks įstatymas.")],
    dog_likes: [t("Our | dog | really | likes | your | bag.", "Mūsų | šuniui | labai | patinka | jūsų | krepšys.", "Mūsų šuniui labai patinka jūsų krepšys.")],
    dog_food_q: [
      t("Do | you | have | any | food | in there?", "Ar | jūs | turite | kokio nors | maisto | ten viduje?", "Ar ten viduje turite maisto?"),
      t("Are | you | sure | there's | no | food | in there?", "Ar | jūs | {m:tikras|f:tikra}, | kad nėra | jokio | maisto | ten viduje?", "Ar tikrai ten nėra jokio maisto?",
        { flags: { 3: "“there's … no”: Lithuanian negates the verb (nėra, negative concord) and adds the conjunction kad that English leaves out." } }),
    ],
    dog_insist: [t("Okay. | They | might | check | your | bag | later.", "Gerai. | Jie | gali | patikrinti | jūsų | krepšį | vėliau.", "Gerai. Jūsų krepšį gali patikrinti vėliau.")],
    thanks_telling: [t("Thanks | for | telling | me.", "Ačiū, | kad | pasakėte | man.", "Ačiū, kad pasakėte.")],
    // Cash
    ask_cash: [
      t("Are | you | carrying | more | than | $10,000 | in cash?", "Ar | jūs | vežate | daugiau | nei | 10 000 $ | grynaisiais?", "Ar vežate daugiau nei 10 000 dolerių grynaisiais?",
        { say: "Are you carrying more than ten thousand dollars in cash?", flags: { 0: "Progressive “Are” in a question = the particle ar; vežate carries the tense (linked to “carrying”)." } }),
    ],
    simple_cash: [t("Do | you | have | more | than | $10,000?", "Ar | jūs | turite | daugiau | nei | 10 000 $?", "Ar turite daugiau nei 10 000 dolerių?", { say: "Do you have more than ten thousand dollars?" })],
    cash_form: [t("Okay. | You'll need | to fill out | a | form | for | that.", "Gerai. | Jums reikės | užpildyti | — | formą | dėl | to.", "Gerai. Dėl to reikės užpildyti formą.")],
    // Biometrics
    fingers: [
      t("Please | put | the | four | fingers | of | your | right | hand | on | the | scanner.", "Prašau | padėti | — | keturis | pirštus | — | savo | dešinės | rankos | ant | — | skenerio.",
        "Prašau padėti keturis dešinės rankos pirštus ant skenerio.", { flags: { 5: "“of”: no separate word; the genitive dešinės rankos carries it." } }),
      t("Please | put | your | four | fingers | on | the | scanner.", "Prašau | padėti | savo | keturis | pirštus | ant | — | skenerio.", "Prašau padėti keturis pirštus ant skenerio."),
      t("Right | hand, | four | fingers | on | the | scanner, | please.", "Dešinė | ranka, | keturi | pirštai | ant | — | skenerio, | prašau.", "Dešinės rankos keturis pirštus ant skenerio, prašau."),
    ],
    thumb: [
      t("Now | your | thumb.", "Dabar | savo | nykštį.", "Dabar – nykštį."),
      t("And | now | just | the | thumb.", "O | dabar | tik | — | nykštį.", "O dabar tik nykštį."),
    ],
    left_hand: [t("Now | the | left | hand, | please.", "Dabar | — | kairę | ranką, | prašau.", "Dabar kairę ranką, prašau.")],
    right_hand_answer: [t("Your | right | hand.", "Jūsų | dešinę | ranką.", "Dešinę ranką.")],
    left_hand_answer: [t("Your | left | hand.", "Jūsų | kairę | ranką.", "Kairę ranką.")],
    thumb_answer: [t("Just | your | right | thumb.", "Tik | jūsų | dešinįjį | nykštį.", "Tik dešinės rankos nykštį.")],
    like_that_yes: [t("Yes, | that's | good.", "Taip, | tai yra | gerai.", "Taip, gerai.")],
    bio_good: [
      t("Good.", "Gerai.", "Gerai."),
      t("Perfect.", "Puiku.", "Puiku."),
    ],
    bio_please: [t("It's | required, | sorry.", "Tai yra | privaloma, | atsiprašau.", "Atsiprašau, tai privaloma.")],
    glasses_later: [t("Not yet. | Just | your | fingers | for now.", "Dar ne. | Tik | jūsų | pirštus | kol kas.", "Dar ne. Kol kas tik pirštus.")],
    take_off_glasses: [
      t("Could | you | take off | your | glasses, | please?", "Ar galėtumėte | jūs | nusiimti | savo | akinius, | prašau?", "Gal galėtumėte nusiimti akinius?"),
    ],
    glasses_yes: [t("Yes, | please.", "Taip, | prašau.", "Taip, prašau.")],
    glasses_need: [t("I | need | a | clear | photo, | sorry.", "Man | reikia | — | aiškios | nuotraukos, | atsiprašau.", "Atsiprašau, man reikia aiškios nuotraukos.")],
    camera: [
      t("Now | look | at | the | camera, | please.", "Dabar | pažiūrėkite | į | — | kamerą, | prašau.", "Dabar pažiūrėkite į kamerą."),
      t("Please | look | into | the | camera.", "Prašau | pažiūrėti | į | — | kamerą.", "Prašau pažiūrėti į kamerą."),
    ],
    photo_ok: [
      t("Great, | thank | you.", "Puiku, | dėkoju | jums.", "Puiku, ačiū."),
      t("Perfect.", "Puiku.", "Puiku."),
    ],
    // Welcome and closing
    welcome: [
      t("You're all set. | Welcome | to | the | United | States!", "Viskas sutvarkyta. | Sveiki atvykę | į | — | Jungtines | Valstijas!", "Viskas. Sveiki atvykę į Jungtines Valstijas!"),
      t("Here's | your | passport. | Welcome | to | the | US. | Enjoy | your | stay!", "Štai | jūsų | pasas. | Sveiki atvykę | į | — | JAV. | Mėgaukitės | savo | viešnage!", "Štai jūsų pasas. Sveiki atvykę į JAV! Malonios viešnagės!"),
      t("Here you go. | Welcome | to | the | United | States.", "Prašom. | Sveiki atvykę | į | — | Jungtines | Valstijas.", "Prašom. Sveiki atvykę į Jungtines Valstijas."),
    ],
    enjoy: [t("Enjoy | your | stay.", "Mėgaukitės | savo | viešnage.", "Malonios viešnagės.")],
    closing_reply: [
      t("You're welcome. | Next!", "Prašom. | Kitas!", "Prašom. Kitas!"),
      t("Enjoy | your | stay!", "Mėgaukitės | savo | viešnage!", "Malonios viešnagės!"),
    ],
    you_too: [t("You | too.", "Jums | taip pat.", "Jums taip pat.")],
    // Answers to the learner's questions
    ans_esta: [t("No, | it's | linked | to | your | passport.", "Ne, | jis yra | susietas | su | jūsų | pasu.", "Ne, jis susietas su jūsų pasu.")],
    ans_boarding: [t("No, | just | the | passport.", "Ne, | tik | — | pasą.", "Ne, tik pasą.")],
    ans_form: [t("No, | you | don't need | a | form.", "Ne, | jums | nereikia | — | formos.", "Ne, formos nereikia.")],
    ans_baggage: [
      t("Baggage | claim | is | downstairs. | Just | follow | the | signs.", "Bagažo | atsiėmimas | yra | apačioje. | Tiesiog | sekite | — | nuorodas.", "Bagažo atsiėmimas – apačioje. Tiesiog eikite pagal nuorodas."),
    ],
    ans_restroom: [t("There's | one | right | after | passport | control.", "Yra | vienas | iškart | po | pasų | kontrolės.", "Tualetas – iškart po pasų kontrolės.")],
    ans_taxi: [t("Taxis | are | outside, | after | baggage | claim.", "Taksi | yra | lauke, | po | bagažo | atsiėmimo.", "Taksi – lauke, už bagažo atsiėmimo salės.")],
    ans_limit: [t("With | an | ESTA, | up to | 90 | days.", "Su | — | ESTA leidimu, | iki | 90 | dienų.", "Su ESTA leidimu – iki 90 dienų.", { say: "With an ESTA, up to ninety days." })],
    ans_allowed: [t("Yes, | that's | fine.", "Taip, | tai yra | gerai.", "Taip, galima.")],
    ans_not_allowed: [t("No, | you | can't bring | {X} | into | the | US.", "Ne, | jūs | negalite įvežti | {X:gen} | į | — | JAV.", "Ne, {X:gen} į JAV įvežti negalima.")],
    mean_purpose: [t("It | means | the | reason | for | your | trip.", "Tai | reiškia | — | priežastį | — | jūsų | kelionės.", "Tai reiškia jūsų kelionės priežastį.",
      { flags: { 4: "“for”: no separate word; the genitive kelionės carries it." } })],
    mean_job: [t("It | means | your | job.", "Tai | reiškia | jūsų | darbą.", "Tai reiškia jūsų darbą.")],
    mean_declare: [t("Food, | plants | or | lots | of | cash.", "Maistas, | augalai | ar | daug | — | grynųjų.", "Maistas, augalai ar daug grynųjų pinigų.",
      { flags: { 4: "“of”: no separate word; the genitive grynųjų carries it." } })],
    mean_return: [t("A | ticket | back | home.", "— | Bilietas | atgal | namo.", "Bilietas atgal namo.")],
    mean_scanner: [t("This | machine | here.", "Šis | aparatas | čia.", "Šis aparatas čia.")],
    mean_cash: [t("Do | you | have | much | cash | with | you?", "Ar | jūs | turite | daug | grynųjų | su | savimi?", "Ar turite su savimi daug grynųjų?")],
    mean_stay: [t("Where | will | you | sleep | tonight?", "Kur | — | jūs | miegosite | šiąnakt?", "Kur miegosite šiąnakt?",
      { flags: { 1: "“will”: no separate word; the future ending of miegosite carries it." } })],
    mean_esta: [t("Your | travel | authorization. | It's | linked | to | your | passport.", "Jūsų | kelionės | leidimas. | Jis yra | susietas | su | jūsų | pasu.", "Tai jūsų kelionės leidimas, susietas su pasu.")],
    mean_yes: [
      t("Yes.", "Taip.", "Taip."),
      t("That's | right.", "Tai yra | teisingai.", "Taip, teisingai."),
    ],
    mean_no: [t("Not | exactly.", "Ne | visai.", "Ne visai.")],
    simple_passport: [t("Your | passport, | please.", "Jūsų | pasą, | prašau.", "Jūsų pasą, prašau.")],
    simple_nothing: [t("Okay.", "Gerai.", "Gerai.")],
  },

  hints: {
    passport: {
      lt: "Paduoti pasą",
      items: [
        { id: "pp_here", s: t("Here you go.", "Prašom.", "Prašom.") },
        { id: "pp_heres", s: t("Here's | my | passport.", "Štai | mano | pasas.", "Štai mano pasas.") },
        { id: "pp_here", s: t("Sure, | here you go.", "Žinoma, | prašom.", "Žinoma, prašom.") },
        { id: "pp_esta", s: t("Do | you | need | my | ESTA?", "Ar | jums | reikia | mano | ESTA leidimo?", "Ar jums reikia mano ESTA leidimo?") },
        { id: "pp_boarding", s: t("Do | you | need | my | boarding | pass?", "Ar | jums | reikia | mano | įlaipinimo | kortelės?", "Ar reikia mano įlaipinimo kortelės?") },
      ],
    },
    purpose: {
      lt: "Pasakyti kelionės tikslą",
      items: [
        { id: "p_here", s: t("I'm | here | on vacation.", "Aš esu | čia | atostogose.", "Atvykau atostogų."), note: "Amerikoje atostogos – „vacation“." },
        { id: "p_here", s: t("I'm | here | on business.", "Aš esu | čia | darbo reikalais.", "Atvykau darbo reikalais.") },
        { id: "p_visit", s: t("I'm visiting | my | family.", "Lankau | savo | šeimą.", "Atvykau aplankyti šeimos.") },
        { id: "p_pleasure", s: t("Pleasure.", "Poilsiui.", "Poilsiui."), note: "Trumpas atsakymas į „Business or pleasure?“." },
        { id: "p_business_short", s: t("Business.", "Darbo reikalais.", "Darbo reikalais.") },
        { id: "p_tourist", s: t("I'm | a | tourist.", "Aš esu | — | {m:turistas|f:turistė}.", "Esu {m:turistas|f:turistė}.") },
        { id: "p_conference", s: t("I'm going | to | a | conference.", "Vykstu | į | — | konferenciją.", "Atvykau į konferenciją.") },
        { id: "p_friends", s: t("I'm visiting | friends.", "Lankau | draugus.", "Atvykau aplankyti draugų.") },
        { id: "p_work", s: t("I'm | here | to work.", "Aš esu | čia | dirbti.", "Atvykau dirbti."), note: "Dirbti JAV galima tik su darbo viza, ne su ESTA." },
        { id: "p_study", s: t("I'm | here | to study.", "Aš esu | čia | studijuoti.", "Atvykau studijuoti."), note: "Studijuoti reikia studento vizos." },
      ],
    },
    biz: {
      lt: "Pasakyti, kokie reikalai",
      items: [
        { id: "bz_conf", s: t("A | conference.", "— | Konferencija.", "Konferencija.") },
        { id: "bz_meet", s: t("Business | meetings.", "Darbo | susitikimai.", "Darbo susitikimai.") },
        { id: "bz_interview", s: t("A | job | interview.", "— | Darbo | pokalbis.", "Darbo pokalbis.") },
      ],
    },
    who: {
      lt: "Pasakyti, ką aplankysi", slot: "rel", examples: ["sister", "family", "daughter", "friends", "son"],
      items: [
        { id: "v_my", s: t("My | {X}.", "Mano | {X:acc}.", "{X:acc}."), note: "Trumpas atsakymas į „Who are you visiting?“." },
        { id: "p_visit", s: t("I'm visiting | my | {X}.", "Lankau | savo | {X:acc}.", "Lankau {X:acc}.") },
      ],
    },
    visit: {
      lt: "Pasakyti, ką aplankysi", slot: "rel", examples: ["sister", "family", "daughter", "friends", "son"],
      items: [
        { id: "p_visit", s: t("I'm visiting | my | {X}.", "Lankau | savo | {X:acc}.", "Atvykau aplankyti {X:gen}.") },
        { id: "v_to_visit", s: t("To visit | my | {X}.", "Aplankyti | savo | {X:acc}.", "Aplankyti {X:acc}.") },
      ],
    },
    length: {
      lt: "Pasakyti, kiek laiko būsi",
      items: [
        { id: "d_short", s: t("Two | weeks.", "Dvi | savaites.", "Dvi savaites.") },
        { id: "d_short", s: t("Ten | days.", "Dešimt | dienų.", "Dešimt dienų.") },
        { id: "d_for", s: t("For | a | week.", "— | — | Savaitę.", "Savaitę.", { flags: { 0: "“For”: no separate word; the accusative of duration savaitę carries it." } }) },
        { id: "d_staying", s: t("I'm staying | for | ten | days.", "Būsiu | — | dešimt | dienų.", "Būsiu dešimt dienų.", { flags: { 1: "“for”: no separate word; the duration phrase dešimt dienų carries it." } }) },
        { id: "d_short", s: t("Until | June | 5th.", "Iki | birželio | 5-osios.", "Iki birželio 5-osios.", { say: "Until June fifth." }) },
        { id: "d_short", s: t("About | a | month.", "Apie | — | mėnesį.", "Maždaug mėnesį.") },
        { id: "d_short", s: t("Just | one | week.", "Tik | vieną | savaitę.", "Tik savaitę.") },
      ],
    },
    stay: {
      lt: "Pasakyti, kur apsistosi",
      items: [
        { id: "w_hotel", s: t("At | the | Harborview | Hotel.", "— | — | „Harborview“ | viešbutyje.", "„Harborview“ viešbutyje.",
          { flags: { 0: "“At”: no separate word; the locative viešbutyje carries it." } }) },
        { id: "w_staying", s: t("I'm staying | at | the | Harborview | Hotel.", "Apsistosiu | — | — | „Harborview“ | viešbutyje.", "Apsistosiu „Harborview“ viešbutyje.",
          { flags: { 1: "“at”: no separate word; the locative viešbutyje carries it." } }) },
        { id: "w_friend", s: t("With | a | friend.", "Pas | — | draugą.", "Pas draugą.") },
        { id: "w_family", s: t("I'm staying | with | my | sister.", "Apsistosiu | pas | savo | seserį.", "Apsistosiu pas seserį.") },
        { id: "w_airbnb", s: t("In | an | Airbnb.", "— | — | „Airbnb“ bute.", "„Airbnb“ bute.", { flags: { 0: "“In”: no separate word; the locative bute carries it." } }) },
        { id: "w_address", s: t("At | 25 | Oak | Avenue.", "— | 25 | Oak | alėjoje.", "Oak alėjoje 25.",
          { say: "At twenty-five Oak Avenue.", flags: { 0: "“At”: no separate word; the locative alėjoje carries it." } }) },
      ],
    },
    address: {
      lt: "Pasakyti adresą",
      items: [
        { id: "a_its", s: t("It's | 25 | Oak | Avenue.", "Tai yra | 25 | Oak | alėja.", "Oak alėja 25.", { say: "It's twenty-five Oak Avenue." }) },
        { id: "a_phone", s: t("It's | on | my | phone.", "Jis yra | — | mano | telefone.", "Jis mano telefone.", { flags: { 1: "“on”: no separate word; the locative telefone carries it." } }) },
      ],
    },
    show: {
      lt: "Parodyti dokumentą ar bilietą",
      items: [
        { id: "r_here", s: t("Here | it | is.", "Štai | jis | —.", "Štai jis.", { flags: { 2: "“is”: no copula after štai (štai jis = here it is)." } }) },
        { id: "pp_here", s: t("Here you go.", "Prašom.", "Prašom.") },
        { id: "a_phone", s: t("It's | on | my | phone.", "Jis yra | — | mano | telefone.", "Jis mano telefone.", { flags: { 1: "“on”: no separate word; the locative telefone carries it." } }) },
      ],
    },
    visa: {
      lt: "Atsakyti, ar turi vizą",
      items: [
        { id: "r_here", s: t("Yes, | here | it | is.", "Taip, | štai | ji | —.", "Taip, štai ji.", { flags: { 3: "“is”: no copula after štai (štai ji = here it is)." } }) },
        { id: "esta_only", s: t("No, | I | only | have | an | ESTA.", "Ne, | aš | tik | turiu | — | ESTA leidimą.", "Ne, turiu tik ESTA leidimą.") },
      ],
    },
    esta: {
      lt: "Pasakyti, kad turi tik ESTA leidimą",
      items: [
        { id: "esta_only", s: t("No, | I | only | have | an | ESTA.", "Ne, | aš | tik | turiu | — | ESTA leidimą.", "Ne, turiu tik ESTA leidimą.") },
      ],
    },
    return: {
      lt: "Atsakyti apie bilietą atgal",
      items: [
        { id: "r_yes", s: t("Yes, | I | do.", "Taip, | aš | turiu.", "Taip, turiu.", { flags: { 2: "“do” (elliptical): Lithuanian repeats the verb, turiu." } }) },
        { id: "r_date", s: t("Yes, | on | June | 5th.", "Taip, | — | birželio | 5-ąją.", "Taip, birželio 5-ąją.",
          { say: "Yes, on June fifth.", flags: { 1: "“on”: Lithuanian dates take no preposition; the accusative birželio 5-ąją carries it." } }) },
        { id: "r_phone", s: t("Yes, | it's | on | my | phone.", "Taip, | jis yra | — | mano | telefone.", "Taip, jis mano telefone.", { flags: { 2: "“on”: no separate word; the locative telefone carries it." } }) },
        { id: "r_fly", s: t("I'm flying | back | on | June | 5th.", "Skrendu | atgal | — | birželio | 5-ąją.", "Atgal skrendu birželio 5-ąją.",
          { say: "I'm flying back on June fifth.", flags: { 2: "“on”: Lithuanian dates take no preposition; the accusative birželio 5-ąją carries it." } }) },
        { id: "r_in", s: t("In | two | weeks.", "Po | dviejų | savaičių.", "Po dviejų savaičių.") },
      ],
    },
    fly_back: {
      lt: "Pasakyti, kada skrendi atgal",
      items: [
        { id: "r_date", s: t("On | June | 5th.", "— | Birželio | 5-ąją.", "Birželio 5-ąją.",
          { say: "On June fifth.", flags: { 0: "“On”: Lithuanian dates take no preposition; the accusative birželio 5-ąją carries it." } }) },
        { id: "r_in", s: t("In | two | weeks.", "Po | dviejų | savaičių.", "Po dviejų savaičių.") },
        { id: "r_fly", s: t("I'm flying | back | on | June | 5th.", "Skrendu | atgal | — | birželio | 5-ąją.", "Atgal skrendu birželio 5-ąją.",
          { say: "I'm flying back on June fifth.", flags: { 2: "“on”: Lithuanian dates take no preposition; the accusative birželio 5-ąją carries it." } }) },
      ],
    },
    // Neutral answers: they fit both "Is this your first time in the US?" and "Have you been here before?"
    first: {
      lt: "Atsakyti, ar esi čia pirmą kartą",
      items: [
        { id: "f_first", s: t("It's | my | first | time.", "Tai yra | mano | pirmas | kartas.", "Esu čia pirmą kartą.") },
        { id: "f_before", s: t("I've | been | here | before.", "Aš esu | {m:buvęs|f:buvusi} | čia | anksčiau.", "Jau esu čia {m:buvęs|f:buvusi}.") },
        { id: "f_second", s: t("This | is | my | second | time.", "Tai | yra | mano | antras | kartas.", "Jau antrą kartą.") },
      ],
    },
    job: {
      lt: "Pasakyti, kuo dirbi",
      items: [
        { id: "j_im", s: t("I'm | a | teacher.", "Aš esu | — | {m:mokytojas|f:mokytoja}.", "Esu {m:mokytojas|f:mokytoja}.") },
        { id: "j_im", s: t("I'm | an | engineer.", "Aš esu | — | {m:inžinierius|f:inžinierė}.", "Esu {m:inžinierius|f:inžinierė}.") },
        { id: "j_im", s: t("I'm | a | truck | driver.", "Aš esu | — | sunkvežimio | {m:vairuotojas|f:vairuotoja}.", "Esu sunkvežimio {m:vairuotojas|f:vairuotoja}.") },
        { id: "j_im", s: t("I'm | a | nurse.", "Aš esu | — | {m:slaugytojas|f:slaugytoja}.", "Esu {m:slaugytojas|f:slaugytoja}.") },
        { id: "j_as", s: t("I | work | as | an | accountant.", "Aš | dirbu | — | — | {m:buhalteriu|f:buhaltere}.", "Dirbu {m:buhalteriu|f:buhaltere}.",
          { flags: { 2: "“as”: no separate word; the instrumental {m:buhalteriu|f:buhaltere} carries it." } }) },
        { id: "j_field", s: t("I | work | in IT.", "Aš | dirbu | IT srityje.", "Dirbu IT srityje.") },
        { id: "j_field", s: t("I | work | in construction.", "Aš | dirbu | statybose.", "Dirbu statybose.") },
        { id: "j_own", s: t("I | own | a | small | business.", "Aš | turiu | — | nedidelį | verslą.", "Turiu nedidelį verslą.") },
        { id: "j_retired", s: t("I'm | retired.", "Aš esu | {m:pensininkas|f:pensininkė}.", "Esu {m:pensininkas|f:pensininkė}.") },
        { id: "j_mean", s: t("Sorry, | do | you | mean | my | job?", "Atsiprašau, | ar | jūs | turite omenyje | mano | darbą?", "Atsiprašau, turite omenyje mano darbą?") },
      ],
    },
    alone: {
      lt: "Pasakyti, su kuo keliauji",
      items: [
        { id: "al_alone", s: t("Yes, | I'm traveling | alone.", "Taip, | keliauju | {m:vienas|f:viena}.", "Taip, keliauju {m:vienas|f:viena}.") },
        { id: "al_with", s: t("No, | with | my | wife.", "Ne, | su | mano | žmona.", "Ne, su žmona.") },
        { id: "al_with", s: t("No, | with | my | husband.", "Ne, | su | mano | vyru.", "Ne, su vyru.") },
        { id: "al_with", s: t("I'm traveling | with | my | family.", "Keliauju | su | savo | šeima.", "Keliauju su šeima.") },
        { id: "al_with", s: t("With | a | friend.", "Su | — | draugu.", "Su draugu.") },
      ],
    },
    declare: {
      lt: "Atsakyti, ką veži", slot: "good", examples: ["cheese", "chocolate", "cookies", "honey"],
      items: [
        { id: "dec_nothing", s: t("No, | nothing.", "Ne, | nieko.", "Ne, nieko.") },
        { id: "dec_nothing2", s: t("Nothing | to declare.", "Nieko | deklaruoti.", "Neturiu ko deklaruoti.") },
        { id: "dec_have", s: t("I | have | some | {X}.", "Aš | turiu | — | {X:gen}.", "Turiu {X:gen}.", { flags: { 2: "Partitive: the genitive carries “some”." } }) },
        { id: "dec_just", s: t("Just | some | {X}.", "Tik | — | {X:gen}.", "Tik šiek tiek {X:gen}.", { flags: { 1: "Partitive: the genitive carries “some”." } }) },
        { id: "dec_family", s: t("Some | {X} | for | my | family.", "— | {X:gen} | — | mano | šeimai.", "Šiek tiek {X:gen} šeimai.",
          { flags: { 0: "Partitive: the genitive carries “some”.", 2: "“for”: no separate word; the dative šeimai carries it." } }),
          only: (e) => !!e.attrs?.food },
        { id: "dec_can", s: t("Can | I | bring | {X}?", "Ar galiu | aš | įvežti | {X:acc}?", "Ar galima įvežti {X:acc}?") },
        { id: "dec_no_food", s: t("I | don't have | any | food.", "Aš | neturiu | jokio | maisto.", "Neturiu jokio maisto.") },
      ],
    },
    goods: {
      lt: "Pasakyti, ką veži", slot: "good", examples: ["cheese", "chocolate", "cookies", "honey"],
      items: [
        { id: "dec_have", s: t("I | have | some | {X}.", "Aš | turiu | — | {X:gen}.", "Turiu {X:gen}.", { flags: { 2: "Partitive: the genitive carries “some”." } }) },
        { id: "dec_just", s: t("Just | some | {X}.", "Tik | — | {X:gen}.", "Tik šiek tiek {X:gen}.", { flags: { 1: "Partitive: the genitive carries “some”." } }) },
        { id: "dec_family", s: t("Some | {X} | for | my | family.", "— | {X:gen} | — | mano | šeimai.", "Šiek tiek {X:gen} šeimai.",
          { flags: { 0: "Partitive: the genitive carries “some”.", 2: "“for”: no separate word; the dative šeimai carries it." } }),
          only: (e) => !!e.attrs?.food },
      ],
    },
    // "Can I bring …?"
    bring: {
      lt: "Paklausti, ar galima įvežti", slot: "good", examples: ["cheese", "sausage", "honey", "fruit"],
      items: [
        { id: "dec_can", s: t("Can | I | bring | {X}?", "Ar galiu | aš | įvežti | {X:acc}?", "Ar galima įvežti {X:acc}?") },
        { id: "dec_ok", s: t("Is | {X} | okay?", "Ar | {X:nom} | tinka?", "Ar galima įvežti {X:acc}?", { flags: { 0: "“Is” in a yes/no question = the particle ar; tinka takes over the copula (linked to “okay”)." } }) },
      ],
    },
    bin: {
      lt: "Sutikti ar atsiprašyti",
      items: [
        { id: "bin_sorry", s: t("Okay, | sorry.", "Gerai, | atsiprašau.", "Gerai, atsiprašau.") },
        { id: "bin_didnt_know", s: t("Sorry, | I | didn't know.", "Atsiprašau, | aš | nežinojau.", "Atsiprašau, nežinojau.") },
      ],
    },
    cash: {
      lt: "Atsakyti apie grynuosius pinigus",
      items: [
        { id: "c_no", s: t("No, | I'm | not.", "Ne, | aš | [nevežu].", "Ne, nevežu.", { flags: { 2: "Elliptical “not”: Lithuanian must repeat the verb, nevežu (square brackets)." } }) },
        { id: "c_about", s: t("No, | only | about | $500.", "Ne, | tik | apie | 500 $.", "Ne, tik apie 500 dolerių.", { say: "No, only about five hundred dollars." }) },
      ],
    },
    // Commands: the first items are the exact short replies.
    bio_fingers: {
      lt: "Pirštų atspaudai",
      items: [
        { id: "b_okay", s: t("Okay.", "Gerai.", "Gerai.") },
        { id: "b_like", s: t("Like this?", "Štai taip?", "Ar taip gerai?") },
        { id: "b_which", s: t("Which | hand?", "Kurią | ranką?", "Kurią ranką?") },
        { id: "b_ok", s: t("Is | this | okay?", "Ar | taip | gerai?", "Ar taip gerai?", { flags: { 0: "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }) },
      ],
    },
    bio_photo: {
      lt: "Nuotrauka",
      items: [
        { id: "b_okay", s: t("Okay.", "Gerai.", "Gerai.") },
        { id: "b_sure", s: t("Sure.", "Žinoma.", "Žinoma.") },
        { id: "b_glasses", s: t("Should | I | take off | my | glasses?", "Ar | man | nusiimti | savo | akinius?", "Ar man nusiimti akinius?",
          { flags: { 0: "“Should” in a question = the particle ar; the dative man + infinitive carries the obligation (linked to “take off”)." } }) },
      ],
    },
    bio_glasses: {
      lt: "Nusiimti akinius",
      items: [
        { id: "b_sure", s: t("Sure.", "Žinoma.", "Žinoma.") },
        { id: "b_okay", s: t("Okay.", "Gerai.", "Gerai.") },
        { id: "b_sorry", s: t("Oh, | sorry.", "Oi, | atsiprašau.", "Oi, atsiprašau.") },
      ],
    },
    ask: {
      lt: "Paklausti pareigūnės",
      items: [
        { id: "q_how_long", s: t("How long | can | I | stay?", "Kiek laiko | galiu | aš | būti?", "Kiek laiko galiu čia būti?") },
        { id: "q_form", s: t("Do | I | need | to fill out | a | form?", "Ar | man | reikia | užpildyti | — | formą?", "Ar reikia užpildyti formą?") },
        { id: "pp_esta", s: t("Do | you | need | my | ESTA?", "Ar | jums | reikia | mano | ESTA leidimo?", "Ar jums reikia mano ESTA leidimo?") },
        { id: "q_baggage", s: t("Where's | the | baggage | claim?", "Kur yra | — | bagažo | atsiėmimas?", "Kur bagažo atsiėmimas?") },
        { id: "q_restroom", s: t("Where's | the | restroom?", "Kur yra | — | tualetas?", "Kur yra tualetas?") },
        { id: "q_taxi", s: t("Where | can | I | get | a | taxi?", "Kur | galiu | aš | pasigauti | — | taksi?", "Kur galėčiau pasigauti taksi?") },
      ],
    },
    clarify: {
      lt: "Pasitikslinti, ko klausia",
      items: [
        { id: "j_mean", s: t("Sorry, | do | you | mean | my | job?", "Atsiprašau, | ar | jūs | turite omenyje | mano | darbą?", "Atsiprašau, turite omenyje mano darbą?") },
        { id: "m_stay", s: t("Do | you | mean | where | I'm staying?", "Ar | jūs | turite omenyje, | kur | apsistosiu?", "Turite omenyje, kur apsistosiu?") },
        { id: "m_days", s: t("Do | you | mean | how many | days?", "Ar | jūs | turite omenyje, | kiek | dienų?", "Turite omenyje, kiek dienų?") },
        { id: "m_why", s: t("Do | you | mean | why | I'm | here?", "Ar | jūs | turite omenyje, | kodėl | aš esu | čia?", "Turite omenyje, kodėl atvykau?") },
        { id: "m_food", s: t("Do | you | mean | food?", "Ar | jūs | turite omenyje | maistą?", "Turite omenyje maistą?") },
      ],
    },
  },

  tips: {
    uk_holiday: { key: "uk_holiday", lt: "Suprasta! Amerikoje atostogos – „vacation“ („holiday“ dažniausiai reiškia šventę).", better: "I'm here on vacation." },
    uk_reclaim: { key: "uk_reclaim", lt: "Suprasta! Amerikoje sakoma „baggage claim“.", better: "Where's the baggage claim?" },
    us_restroom: { key: "us_restroom", lt: "Suprasta! Amerikoje mandagiau sakyti „restroom“ arba „bathroom“.", better: "Where's the restroom?" },
    uk_taxi_rank: { key: "uk_taxi_rank", lt: "Suprasta! Amerikoje sakoma „taxi stand“.", better: "Where's the taxi stand?" },
    uk_sweets: { key: "uk_sweets", lt: "Suprasta! Amerikoje saldainiai – „candy“.", better: "I have some candy." },
    uk_biscuits: { key: "uk_biscuits", lt: "Suprasta! Amerikoje sausainiai – „cookies“ („biscuits“ – tai bandelės).", better: "I have some cookies." },
  },

  merges: {
    "how long": { reason: "lexical_expression", split: "How → kaip + long → ilgas gives “kaip ilgas” (length); asking about duration = kiek laiko.", minimal: "Two words, one question word." },
    "how many": { reason: "lexical_expression", split: "how → kaip + many → daug is false; asking a number = kiek.", minimal: "Two words, one question word; the noun stays outside." },
    "for a living": { reason: "lexical_expression", split: "for → už + a → — + living → gyvenimas gives a false literal; “do for a living” = work to earn money (pragyvenimui).", minimal: "All three words form the idiom." },
    "take off": { reason: "lexical_expression", split: "take → imti + off → nuo is false; taking off glasses = nusiimti (the prefix nu- carries “off”).", minimal: "Verb + particle; the object stays outside." },
    "you're all set": { reason: "lexical_expression", split: "You're → jūs esate + all → visi + set → nustatyti is false; the formula means “you're done” (= viskas sutvarkyta).", minimal: "The whole formula is one expression." },
    "up to": { reason: "lexical_expression", split: "up → aukštyn + to → į is false; a maximum = iki.", minimal: "Two words, one preposition." },
    "like this": { reason: "lexical_expression", split: "like → patinka + this → šitas is false; asking about a manner = štai taip.", minimal: "Two words." },
    "good luck": { reason: "lexical_expression", split: "good → gera + luck → sėkmė reads as a description; the wish = sėkmės.", minimal: "Two words, one wish." },
    "make sure": { reason: "lexical_expression", split: "make → padaryti + sure → tikras is false; = būtinai (see to it).", minimal: "Two words." },
    "in there": { reason: "lexical_expression", split: "in → viduje + there → ten gives the reversed “viduje ten”; Lithuanian says ten viduje.", minimal: "Two words." },
    "not yet": { reason: "lexical_expression", split: "not → ne + yet → dar gives the reversed order “ne dar”; Lithuanian says dar ne.", minimal: "Two words." },
    "for now": { reason: "lexical_expression", split: "for → už + now → dabar is false; = kol kas.", minimal: "Two words." },
    "to fill out": { reason: "grammatical_fusion", split: "to → į is false (the infinitive ending -ti carries it) and out → lauk is false; filling out a form = užpildyti.", minimal: "Infinitive marker + phrasal verb; the object stays outside." },
  },

  // -------------------------------------------------------------------------

  // The learner's plan: five answers, the extra question of the day, and the biometrics when they come.
  mission: [
    { step: "passport", lt: "Paduok pasą" },
    { lt: "Pasakyk kelionės tikslą", done: (c) => !!c.s.purpose && !["biz_kind", "who", "visa"].some((id) => stepOpen(c, id)) },
    { step: "length", lt: "Pasakyk, kiek laiko būsi" },
    { lt: "Pasakyk, kur apsistosi", done: (c) => stepDef("stay").done(c) && !stepOpen(c, "address") },
    { lt: "Atsakyk į papildomą klausimą", optional: true, when: (c) => EXTRA.some((id) => applies(c, id)),
      done: (c) => EXTRA.some((id) => applies(c, id)) && !EXTRA.some((id) => stepOpen(c, id)) },
    { lt: "Pasakyk, ką veži", done: (c) => !!c.s.declared && !stepOpen(c, "cash") },
    { lt: "Padėk pirštus, žiūrėk į kamerą", optional: true, when: (c) => !!c.s.fingers, done: (c) => !!c.s.fingersDone && !!c.s.photoDone },
    { lt: "Pažiūrėk į kamerą", optional: true, when: (c) => !!c.s.photo && !c.s.fingers, done: (c) => !c.s.fingers && !!c.s.photoDone },
  ],

  steps: [
    { id: "passport", done: (c) => !!c.s.passport,
      ask: (c) => { c.say(c.s.askedPassport ? "ask_passport" : "greet_passport"); c.s.askedPassport = true; },
      expects: ["hand_over", "q_esta", "q_boarding"],
      suggest: [{ lt: "Paduoti pasą", hint: "passport" }, { lt: "Pasisveikinti", hint: "g_greet" }],
      yes: (c) => givePassport(c),
      help: (c) => c.say("simple_passport") },
    { id: "purpose", done: (c) => !!c.s.purpose,
      ask: (c) => c.say(c.s.purposeRetry ? "purpose_retry" : "ask_purpose"),
      expects: ["purpose", "purpose_visit", "purpose_neg", "ask_mean"],
      suggest: [
        { lt: "Pasakyti kelionės tikslą", hint: "purpose" },
        { lt: "Pasakyti, ką atvykai aplankyti", hint: "visit", options: ["family", "sister", "brother", "son", "daughter", "friends", "parents", "cousin"] },
        { lt: "Pasitikslinti klausimą", hint: "clarify" },
      ],
      help: (c) => c.say("purpose_help") },
    { id: "biz_kind", when: (c) => c.s.purpose === "business" && c.s.askBizKind && !c.s.event, done: (c) => !!c.s.bizAsked,
      ask: (c) => { c.s.bizAsked = true; c.say("biz_kind"); },
      expects: ["purpose"],
      suggest: [{ lt: "Pasakyti, kokie reikalai", hint: "biz" }],
      help: (c) => c.say("biz_kind") },
    { id: "who", when: (c) => (c.s.purpose === "family" || c.s.purpose === "friends") && !c.s.visitRel && c.s.askWho, done: (c) => !!c.s.visitRel,
      ask: (c) => c.say("who_visit"),
      expects: ["who_ctx", "purpose_visit"],
      suggest: [{ lt: "Pasakyti, ką aplankysi", hint: "who", options: ["sister", "brother", "son", "daughter", "parents", "friends", "cousin", "aunt"] }],
      help: (c) => c.say("who_visit") },
    { id: "visa", when: (c) => c.s.purpose === "work" || c.s.purpose === "study", done: (c) => !!c.s.visaOk,
      ask: (c) => c.say(c.s.purpose === "study" ? "visa_q_study" : "visa_q_work"),
      expects: ["hand_over", "have_esta"],
      suggest: [{ lt: "Atsakyti, ar turi vizą", hint: "visa" }, { lt: "Pasakyti, kad turi tik ESTA leidimą", hint: "esta" }],
      yes: (c) => { c.s.visaOk = true; c.say("visa_ok"); },
      no: (c) => { c.s.purpose = undefined; c.s.purposeRetry = true; c.say("esta_no_work"); c.say("esta_can"); } },
    { id: "length", done: (c) => !!c.s.length,
      ask: (c) => c.say("ask_length"),
      expects: ["length", "length_vague", "ask_mean"],
      suggest: [{ lt: "Pasakyti, kiek laiko būsi", hint: "length" }, { lt: "Pasitikslinti klausimą", hint: "clarify" }],
      help: (c) => c.say("length_help") },
    { id: "stay", done: (c) => !!c.s.stay && c.s.stay !== "hotel_generic",
      ask: (c) => c.say(c.s.stay === "hotel_generic" ? "ask_which_hotel" : "ask_where"),
      expects: ["stay", "stay_with", "stay_airbnb", "hotel_other_ctx", "ask_mean"],
      suggest: [
        { lt: "Pasakyti, kur apsistosi", hint: "stay" },
        { lt: "Pasitikslinti klausimą", hint: "clarify" },
      ],
      help: (c) => c.say("stay_help") },
    { id: "address", when: (c) => ["family", "friend", "airbnb"].includes(c.s.stay) && c.s.askAddress, done: (c) => !!c.s.address,
      ask: (c) => c.say("ask_address"),
      expects: ["address_ctx", "address_phone", "address_show_ctx", "address_dunno", "hand_over"],
      suggest: [{ lt: "Pasakyti adresą (arba parodyti telefone)", hint: "address" }],
      yes: (c) => { c.say("address_show"); c.expect(showAddressPending("address_show")); },
      no: (c) => { c.say("address_check"); c.expect(showAddressPending("address_check")); },
      help: (c) => { c.say("address_check"); c.expect(showAddressPending("address_check")); } },
    { id: "return", when: (c) => c.s.askReturn, done: (c) => c.s.ret !== undefined,
      ask: (c) => {
        if (c.s.retQ === undefined) c.s.retQ = c.chance(0.3) ? "when" : "ticket";
        c.say(c.s.retQ === "when" ? "ask_fly_back" : "ask_return_ticket");
        c.expect(returnPending(c.s.retQ));
      },
      expects: ["return_yes", "return_date", "return_no", "hand_over", "ask_mean"],
      suggest: [{ lt: "Atsakyti, ar turi bilietą atgal", hint: "return" }],
      yes: (c) => retYes(c), no: (c) => retNo(c),
      help: (c) => simpleAsk(c, "return") },
    { id: "first", when: (c) => c.s.askFirst, done: (c) => c.s.first !== undefined,
      ask: (c) => {
        if (c.s.firstQ === undefined) c.s.firstQ = c.chance(0.65) ? "first" : "before";
        c.say(c.s.firstQ === "first" ? "ask_first" : "ask_before");
      },
      expects: ["first_yes", "first_no", "ask_mean"],
      suggest: [{ lt: "Atsakyti, ar esi čia pirmą kartą", hint: "first" }],
      yes: (c) => { c.s.first = c.s.firstQ === "first"; c.say(c.s.first ? "first_welcome" : "welcome_back"); },
      no: (c) => { c.s.first = c.s.firstQ !== "first"; c.say(c.s.first ? "first_welcome" : "ack"); } },
    { id: "job", when: (c) => c.s.askJob, done: (c) => !!c.s.job,
      ask: (c) => c.say("ask_job"),
      expects: ["job", "job_other_ctx", "ask_mean"],
      suggest: [{ lt: "Pasakyti, kuo dirbi", hint: "job" }, { lt: "Pasitikslinti klausimą", hint: "clarify" }],
      help: (c) => c.say("simple_job") },
    { id: "alone", when: (c) => c.s.askAlone, done: (c) => c.s.alone !== undefined,
      ask: (c) => c.say("ask_alone"),
      expects: ["alone_yes", "alone_with", "ask_mean"],
      suggest: [{ lt: "Pasakyti, ar keliauji vienas, ar su kuo nors", hint: "alone" }],
      yes: (c) => { c.s.alone = true; ack(c, 0.6); },
      no: (c) => { c.s.alone = false; ack(c, 0.6); } },
    { id: "declare", done: (c) => !!c.s.declared,
      ask: (c) => {
        if (c.s.negGood) { c.s.negGood = false; c.say("declare_more"); return; }
        c.say(c.s.foodQ ? "ask_food" : "ask_declare");
      },
      expects: ["declare_nothing", "declare_items", "declare_neg_good", "ask_mean"],
      suggest: [
        { lt: "Pasakyti, ką veži (arba kad nieko)", hint: "declare", options: ["cheese", "chocolate", "cookies", "candy", "honey", "sausage", "fruit"] },
        { lt: "Paklausti, ar galima įvežti", hint: "bring", options: ["cheese", "sausage", "honey", "fruit"] },
      ],
      yes: (c) => { c.say("declare_what"); c.expect(declareWhatPending()); },
      no: (c) => { passport.handlers.declare_nothing(c, {}, { intent: "declare_nothing", slots: {}, tags: [] }); },
      help: (c) => c.say("simple_declare") },
    { id: "cash", when: (c) => c.s.askCash, done: (c) => c.s.cash !== undefined,
      ask: (c) => c.say("ask_cash"),
      expects: ["cash_no", "cash_amount", "ask_mean"],
      suggest: [{ lt: "Atsakyti apie grynuosius pinigus", hint: "cash" }],
      yes: (c) => { c.s.cash = "over"; c.say("cash_form"); },
      no: (c) => { c.s.cash = "no"; ack(c, 0.7); } },
    { id: "bio_fingers", when: (c) => c.s.fingers, done: (c) => !!c.s.fingersDone, expects: ["bio_ok_ctx", "like_this_ctx", "which_hand_ctx"],
      ask: (c) => { c.say("fingers"); c.expect(bioPending("right")); },
      suggest: [{ lt: BIO_TASK.right, hint: "bio_fingers" }] },
    { id: "bio_photo", when: (c) => !!c.s.photo, done: (c) => !!c.s.photoDone, expects: ["bio_ok_ctx", "like_this_ctx"],
      ask: (c) => {
        if (c.s.glasses && !c.s.glassesAsked) { c.s.glassesAsked = true; c.say("take_off_glasses"); c.expect(glassesPending()); return; }
        c.say("camera"); c.expect(photoPending());
      },
      suggest: [{ lt: "Pažiūrėti į kamerą ir pasakyti „Okay“", hint: "bio_photo" }] },
  ],

  init: (c) => {
    // A short, clear corridor (owner feedback): passport → purpose → how long → where → declare,
    // plus at most one extra question per visit.
    const extra = c.pick(["none", "none", "first", "job", "return", "bizkind", "who", "alone", "cash"] as const);
    c.s.askBizKind = extra === "bizkind";
    c.s.askWho = extra === "who";
    c.s.askAddress = c.chance(0.35);
    c.s.showTicket = c.visits >= 1 && c.chance(0.3);
    c.s.askReturn = c.s.showTicket || extra === "return";
    c.s.askFirst = extra === "first";
    c.s.askJob = extra === "job";
    c.s.askAlone = extra === "alone";
    c.s.askCash = extra === "cash";
    c.s.foodQ = c.chance(0.55);
    c.s.dogTwist = c.visits >= 1 && c.chance(0.4);
    // Biometrics only now and then, so the conversation stays about the questions (owner feedback)
    c.s.fingers = c.chance(0.25);
    c.s.photo = c.s.fingers || c.chance(0.4);
    c.s.leftHand = c.chance(0.3);
    c.s.glasses = c.chance(0.2);
  },

  start: (c) => {
    c.say("next");
    if (c.chance(0.3)) {
      c.say("greet_howareyou");
      c.s.askedPassport = true;
      expectHowAreYou(c, (cc) => cc.ask("passport"));
      return;
    }
  },

  handlers: {
    hand_over(c, slots) {
      const docs = toArr(slots.doc);
      if (!c.s.passport && (!docs.length || docs.includes("passport") || c.step === "passport")) { givePassport(c); return; }
      if (c.step === "visa") { c.s.visaOk = true; c.say("visa_ok"); return; }
      if (c.step === "address") { c.s.address = true; once(c, "ty", "thank_you"); return; }
      if (c.step === "return") { retYes(c); return; }
      if (docs.includes("esta")) { c.say("ans_esta"); return; }
      if (docs.includes("boarding") || docs.includes("form")) { c.say("ans_boarding"); return; }
      c.say("already_have");
    },
    purpose(c, slots, seg) {
      const tags = allTags(slots, seg);
      const p = (slots.purpose as string | undefined) ?? tagVal(tags, "pv:");
      if (!p) { c.say("purpose_help"); c.hold(); return; }
      setPurpose(c, p, tagVal(tags, "ev:"));
    },
    purpose_visit(c, slots) {
      const rel = slots.rel as string | undefined;
      c.s.purpose = rel ? (FRIENDLY.has(rel) ? "friends" : "family") : /friend/i.test(c.heard) ? "friends" : "family";
      c.s.purposeRetry = false;
      if (rel && rel !== "family" && rel !== "friends" && rel !== "relatives") c.s.visitRel = rel;
      ack(c, 0.4);
    },
    purpose_neg(c, slots) {
      const neg = slots.purpose as string | undefined;
      if (neg && c.s.purpose === neg) c.s.purpose = undefined;
    },
    who_ctx(c, slots) { c.s.visitRel = slots.rel || "family"; ack(c, 0.6); },
    length(c, slots) {
      const d = slots.dur || {};
      const tags: string[] = d.__tags || [];
      if (tags.includes("vague")) { c.say("vague_length"); c.hold(); return; }
      if (tags.includes("until")) { c.s.length = "until"; ack(c, 0.5); return; }
      // "two or three weeks": the longer one counts
      const n = typeof d.max === "number" ? d.max : typeof d.number === "number" ? d.number : tags.includes("n2") ? 2 : 1;
      const unit = tagVal(tags, "u:");
      const fixed = tags.includes("n10") ? 10 : tags.includes("n15") ? 15 : tags.includes("n180") ? 180 : 0;
      const days = fixed || n * (unit === "w" ? 7 : unit === "m" ? 30 : unit === "y" ? 365 : 1);
      if (days > 90) { c.say("esta_90"); c.say("ask_length_again"); c.hold(); return; }
      if (days < 1) { c.say("vague_length"); c.hold(); return; }
      c.s.length = days;
      ack(c, 0.5);
    },
    length_vague(c) { c.say("vague_length"); c.hold(); },
    stay(c, slots) {
      const h = slots.hotel as string;
      const T = turn(c);
      if (h === "hotel_generic") { if (!T.named && c.s.stay !== "hotel") c.s.stay = "hotel_generic"; return; }
      T.named = true;
      c.s.stay = "hotel"; c.s.hotel = h;
      ack(c, 0.5);
    },
    stay_with(c, slots, seg) {
      const rel = slots.rel as string | undefined;
      if (seg.tags.includes("addr")) c.s.address = true; // "My friend's house, 25 Oak Avenue"
      if (rel) c.s.stay = FRIENDLY.has(rel) ? "friend" : "family";
      else if (seg.tags.includes("pron")) c.s.stay = c.s.purpose === "friends" ? "friend" : "family";
      else c.s.stay = /friend/i.test(c.heard) ? "friend" : "family";
      ack(c, 0.4);
    },
    stay_airbnb(c, _slots, seg) {
      if (seg.tags.includes("addr")) { c.s.stay = "friend"; c.s.address = true; ack(c, 0.6); return; }
      c.s.stay = "airbnb"; ack(c, 0.4);
    },
    hotel_other_ctx(c) { c.s.stay = "hotel"; c.s.hotel = "other"; ack(c, 0.6); },
    address_ctx(c) { c.s.address = true; once(c, "ty", "thank_you"); },
    address_phone(c) { c.say("address_show"); c.expect(showAddressPending("address_show")); },
    address_show_ctx(c) { c.say("address_show"); c.expect(showAddressPending("address_show")); },
    address_dunno(c) { c.say("address_check"); c.expect(showAddressPending("address_check")); },
    return_yes(c) { retYes(c); },
    return_date(c) { retYes(c); },
    return_no(c) { retNo(c); },
    first_yes(c) { c.s.first = true; if (c.chance(0.6)) c.say("first_welcome"); },
    first_no(c) { c.s.first = false; c.say(c.chance(0.5) ? "welcome_back" : "ack"); },
    job(c, slots, seg) {
      c.s.job = (slots.job as string | undefined) ?? tagVal(seg.tags, "j:") ?? (slots.field ? "field" : "other");
      if (c.s.job === "retired" && c.chance(0.5)) c.say("retired_ack"); else ack(c, 0.6);
    },
    job_other_ctx(c) { c.s.job = "other"; ack(c, 0.8); },
    alone_yes(c) { c.s.alone = true; ack(c, 0.6); },
    alone_with(c) { c.s.alone = false; ack(c, 0.6); },
    declare_nothing(c) {
      if (c.s.dogTwist && !c.s.dogDone) {
        c.s.dogDone = true;
        c.twist("beagle");
        c.say("dog_likes"); c.say("dog_food_q");
        c.expect(dogPending());
        return;
      }
      c.s.declared = "nothing";
      ack(c, 0.7);
    },
    declare_neg_good(c) { c.s.negGood = true; },
    declare_items(c, slots) {
      const goods = goodsFrom(slots);
      if (!goods.length) { c.say("declare_what"); c.expect(declareWhatPending()); return; }
      if (c.s.dogTwist && !c.s.dogDone) c.s.dogDone = true;
      declareGoods(c, goods);
    },
    declare_q(c, slots) {
      const g = goodById(slots.good);
      if (g?.attrs?.ok) c.say("ans_allowed"); else c.say("ans_not_allowed", { X: slots.good });
    },
    cash_no(c) { c.s.cash = "no"; ack(c, 0.7); },
    cash_amount(c, slots) {
      if (typeof slots.price === "number" && slots.price >= 1000000) { c.s.cash = "over"; c.say("cash_form"); }
      else { c.s.cash = "no"; ack(c, 0.7); }
    },
    like_this_ctx(c) { c.say("like_that_yes"); },
    bio_ok_ctx(c) { ack(c, 0.3); },
    which_hand_ctx(c) { c.say("right_hand_answer"); },
    word_meaning(c, slots) {
      const line = WORD_LINE[slots.word as string];
      if (!line) { c.say("g_meaning"); c.hold(); return; }
      c.say(line);
      simpleAsk(c, c.step);
      c.hold();
    },
    glasses(c) { c.say(c.step === "bio_photo" ? "glasses_yes" : "glasses_later"); },
    sorry_ctx(c) { ack(c, 1); },
    have_esta(c) {
      if (c.s.purpose === "work" || c.s.purpose === "study") { c.s.purpose = undefined; c.s.purposeRetry = true; c.say("esta_no_work"); c.say("esta_can"); return; }
      c.say("ans_esta");
    },
    q_esta(c) { c.say("ans_esta"); },
    find_it(c) { if (!/\b(second|moment|minute|sec)\b/i.test(c.heard)) c.say("g_take_time"); c.hold(); },
    long_flight(c) { c.say("g_sorry_to_hear"); },
    q_boarding(c) { c.say("ans_boarding"); },
    q_form(c) { c.say("ans_form"); },
    q_baggage(c) { c.say("ans_baggage"); },
    q_restroom(c) { c.say("ans_restroom"); },
    q_taxi(c) { c.say("ans_taxi"); },
    q_limit(c) { c.say("ans_limit"); },
    ask_mean(c, slots, seg) {
      let topic = slots.topic as string | undefined;
      if (!topic) {
        const h = seg.tags.find((x) => x.startsWith("h:"))?.slice(2);
        topic = h === "j_mean" ? "job" : h === "m_stay" ? "stay" : h === "m_days" ? "length" : h === "m_why" ? "purpose" : h === "m_food" ? "declare" : undefined;
      }
      const cur = c.step;
      const match = topic && (TOPIC_STEP[topic] === cur || (topic === "purpose" && cur === "biz_kind") || (topic === "stay" && cur === "address"));
      c.say(match ? "mean_yes" : "mean_no");
      simpleAsk(c, cur);
      c.hold();
    },
  },

  finish: (c) => {
    c.complete();
    c.say("welcome");
    c.event("give", { item: "passport" });
    c.expect({
      id: "closing", hints: ["g_social"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { once(cc, "close", "closing_reply"); cc.end(); },
        g_bye: (cc) => { once(cc, "close", "you_too"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); },
    });
  },

  tests: [
    { say: "Here you go.", intent: "hand_over", step: "passport" },
    { say: "Hi! Here's my passport.", intent: "hand_over", slots: { doc: "passport" } },
    { say: "Do you need my ESTA?", intent: "q_esta" },
    { say: "I'm here on vacation.", intent: "purpose", slots: { purpose: "vacation" } },
    { say: "Business.", intent: "purpose", step: "purpose", slots: { purpose: "business" } },
    { say: "Pleasure.", intent: "purpose", step: "purpose", slots: { purpose: "vacation" } },
    { say: "I'm on holiday.", intent: "purpose", step: "purpose" },
    { say: "I'm going to a conference.", intent: "purpose", slots: { purpose: "business" } },
    { say: "I'm visiting my sister.", intent: "purpose_visit", slots: { rel: "sister" } },
    { say: "To see my grandchildren.", intent: "purpose_visit", step: "purpose" },
    { say: "I'm not here on vacation.", intent: "purpose_neg", not: ["purpose"] },
    { say: "My daughter.", intent: "who_ctx", step: "who", slots: { rel: "daughter" } },
    { say: "Two weeks.", intent: "length", step: "length", slots: { dur: { number: 2 } } },
    { say: "Ten days.", intent: "length", step: "length" },
    { say: "I'm staying for about a month.", intent: "length" },
    { say: "Until June 5th.", intent: "length", step: "length" },
    { say: "Four months.", intent: "length", step: "length", slots: { dur: { number: 4 } } },
    { say: "A few days.", intent: "length", step: "length" },
    { say: "At the Harborview Hotel.", intent: "stay", step: "stay", slots: { hotel: "harborview" } },
    { say: "I'm staying at a hotel.", intent: "stay", slots: { hotel: "hotel_generic" } },
    { say: "I'm staying with a friend.", intent: "stay_with", step: "stay" },
    { say: "At my sister's place.", intent: "stay_with", step: "stay", slots: { rel: "sister" } },
    { say: "In an Airbnb.", intent: "stay_airbnb", step: "stay" },
    { say: "At the Grand Plaza Hotel.", intent: "hotel_other_ctx", step: "stay" },
    { say: "It's 25 Oak Avenue.", intent: "address_ctx", step: "address", slots: { number: 25, street: "oak" } },
    { say: "It's on my phone.", intent: "address_phone", step: "address" },
    { say: "Yes, I do.", intent: "return_yes", step: "return" },
    { say: "Yes, on June 5th.", intent: "return_date", step: "return" },
    { say: "I don't have a return ticket yet.", intent: "return_no", step: "return", not: ["return_yes"] },
    { say: "Yes, it's my first time.", intent: "first_yes", step: "first" },
    { say: "No, I've been here before.", intent: "first_no", step: "first" },
    { say: "I've never been to the US before.", intent: "first_yes", step: "first", not: ["first_no"] },
    { say: "I'm a teacher.", intent: "job", step: "job", slots: { job: "teacher" } },
    { say: "I'm retired.", intent: "job", step: "job" },
    { say: "I work in IT.", intent: "job", step: "job" },
    { say: "Sorry, do you mean my job?", intent: "ask_mean", step: "job" },
    { say: "Do you mean where I'm staying?", intent: "ask_mean", slots: { topic: "stay" } },
    { say: "Yes, I'm traveling alone.", intent: "alone_yes", step: "alone" },
    { say: "No, with my wife.", intent: "alone_with", step: "alone" },
    { say: "No, nothing.", intent: "declare_nothing", step: "declare" },
    { say: "Nothing to declare.", intent: "declare_nothing", step: "declare" },
    { say: "I have some cheese and chocolate for my family.", intent: "declare_items", step: "declare" },
    { say: "Just some sweets.", intent: "declare_items", step: "declare" },
    { say: "I don't have any food.", intent: "declare_nothing", step: "declare", not: ["declare_items"] },
    { say: "No cheese.", intent: "declare_neg_good", step: "declare", not: ["declare_items"] },
    { say: "I don't have any sausage.", intent: "declare_neg_good", not: ["declare_items"] },
    { say: "Can I bring sausage?", intent: "declare_q" },
    { say: "No, only about five hundred dollars.", intent: "cash_no", step: "cash" },
    { say: "No, I'm not.", intent: "cash_no", step: "cash" },
    { say: "Like this?", intent: "like_this_ctx", step: "bio_fingers" },
    { say: "Okay.", intent: "bio_ok_ctx", step: "bio_fingers" },
    { say: "Sure.", intent: "bio_ok_ctx", step: "bio_photo" },
    { say: "Oh, sorry.", intent: "bio_ok_ctx", step: "bio_photo" },
    { say: "A job interview.", intent: "purpose", step: "biz_kind", slots: { purpose: "business" } },
    { say: "On June 5th.", intent: "return_date", step: "return" },
    { say: "My return flight is on June 5th.", intent: "return_date", step: "return" },
    { say: "It's my first time.", intent: "first_yes", step: "first" },
    { say: "Which hand?", intent: "which_hand_ctx", step: "bio_fingers" },
    { say: "Which hand?", intent: "none" },
    { say: "Sorry, what does occupation mean?", intent: "word_meaning", slots: { word: "job" } },
    { say: "Where's the baggage claim?", intent: "q_baggage" },
    { say: "Where is the toilet?", intent: "q_restroom" },
    { say: "How long can I stay?", intent: "q_limit" },
    { say: "Could you say that again?", intent: "g_repeat" },
    // more ways to say it (dev corpus tests/corpus/s65a-passport.json)
    { say: "It's in my bag", intent: "find_it" },
    { say: "And the ESTA?", intent: "q_esta" },
    { say: "It was a long flight", intent: "long_flight" },
    { say: "I want to see New York and Boston", intent: "purpose", step: "purpose" },
    { say: "Business and tourism", intent: "purpose", step: "purpose" },
    { say: "Vacation with my wife", intent: "purpose", slots: { purpose: "vacation" } },
    { say: "Sorry, I meant a business trip", intent: "purpose", slots: { purpose: "business" } },
    { say: "My son lives here, I visit him", intent: "purpose_visit", slots: { rel: "son" } },
    { say: "Two or three weeks", intent: "length", step: "length", slots: { dur: { number: 2, max: 3 } } },
    { say: "Just a weekend", intent: "length", step: "length" },
    { say: "We go back on June 30th", intent: "length", step: "length" },
    { say: "The whole summer", intent: "length_vague", step: "length" },
    { say: "Hotel Harborview", intent: "stay", step: "stay", slots: { hotel: "harborview" } },
    { say: "My son's apartment", intent: "stay_with", step: "stay", slots: { rel: "son" } },
    { say: "In a hostel", intent: "hotel_other_ctx", step: "stay" },
    { say: "I don't remember", intent: "address_dunno", step: "address" },
    { say: "Next month", intent: "return_date", step: "return" },
    { say: "No, second time", intent: "first_no", step: "first" },
    { say: "Just clothes", intent: "declare_nothing", step: "declare" },
    { say: "No, much less", intent: "cash_no", step: "cash" },
    { say: "No, just ESTA", intent: "have_esta", step: "visa" },
    // meaning kept
    { say: "No, it's not my first time", intent: "first_no", step: "first", not: ["first_yes"] },
    { say: "No fruit, no meat", intent: "declare_neg_good", step: "declare", not: ["declare_items"] },
    { say: "I'm not staying at a hotel", intent: "none", step: "stay" },
    { say: "Yes, I have more than ten thousand", intent: "none", step: "cash" },
    { say: "Not with my sister", intent: "none", step: "stay" },
    { say: "banana airplane purple", intent: "none" },
    { say: "My cat likes the moon", intent: "none" },
    { say: "Mikalauskas", intent: "none" },
    // more ways (played paths, 25 Sep 2026)
    { say: "For a wedding.", intent: "purpose", step: "purpose" },
    { say: "My daughter's wedding.", intent: "purpose", step: "purpose", slots: { rel: "daughter" } },
    { say: "I'm here for a few meetings.", intent: "purpose", step: "purpose", slots: { purpose: "business" } },
    { say: "For fun.", intent: "purpose", step: "purpose", slots: { purpose: "vacation" } },
    { say: "Not for fun.", intent: "purpose_neg", step: "purpose", not: ["purpose"] },
    { say: "No, just a little.", intent: "cash_no", step: "cash" },
    { say: "No, I came last year.", intent: "first_no", step: "first" },
    { say: "Just a moment, I'll check.", intent: "g_wait", step: "address" },
    { say: "I'll show you.", intent: "address_show_ctx", step: "address" },
    { say: "I'll show you.", intent: "none", step: "declare" },
  ],

  sims: [
    { name: "happy path: vacation at the hotel", turns: ["Hi! Here's my passport.", "I'm here on vacation.", "Two weeks.", "At the Harborview Hotel.", "No, nothing to declare."],
      expect: { complete: true }, auto: PP_AUTO },
    // the officer asks for the address on every seed (the script gives it)
    { name: "several facts at once, a side question, declaring cheese", turns: ["Hello. Here you go. Do you need my ESTA?", "I'm visiting my sister for ten days.", "I'm staying with her.", "It's 25 Oak Avenue.", "I have some cheese and chocolate for my family."],
      expect: { complete: true }, auto: PP_AUTO, setup: (s) => { s.askAddress = true; } },
    { name: "clarifications, negation and corrections", turns: ["Here you go.", "I'm not on vacation. I'm here for a conference.", "Four months.", "Sorry. Two months.", "At a hotel.", "The Harborview Hotel.", "I don't have any meat. Just some chocolate."],
      expect: { complete: true }, auto: omit(PP_AUTO, ["purpose", "length", "stay", "declare"]) },
    { name: "work without a visa (ESTA rules), sausage in the bag", turns: ["Here's my passport.", "I'm here to work.", "No, I have an ESTA.", "Business, then. A job interview.", "One week.", "In an Airbnb.", "I have some sausage."],
      expect: { complete: true }, auto: omit(PP_AUTO, ["purpose", "visa", "length", "stay", "declare"]) },
    // the other wordings on every seed: "When are you flying back?" and "Have you been to the US before?" (the auto answers fit both)
    { name: "flying back when, been here before", turns: ["Hi! Here's my passport.", "I'm here on vacation.", "Two weeks.", "At the Harborview Hotel.", "No, nothing to declare."],
      expect: { complete: true, state: { ret: true, first: true } }, auto: PP_AUTO,
      setup: (s) => { s.askReturn = true; s.retQ = "when"; s.askFirst = true; s.firstQ = "before"; } },
  ],
};

export default passport;
