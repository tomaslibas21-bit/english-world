// Song 75 "Something for a Headache" · Harbor Pharmacy · pharmacist Mr. Okafor (patient and caring).
// American drugstore routine: over-the-counter help at the pharmacy counter ("What brings you in today?",
// how long have you had it, other medications, allergies, is it for you), a recommendation with the
// real label dosage (ibuprofen 1–2 every six hours with food, no more than six a day; acetaminophen
// two every six hours), drowsiness, prescription or not, children's liquid dosed by weight, and the
// prescription pickup (last name, spelling, date of birth, "ready in about ten minutes", insurance
// and copay, "Is this your first time taking it?"). US names: acetaminophen/Tylenol (= paracetamol),
// Band-Aids (= plasters), sunscreen (= sun cream); British and European words are accepted with a tip.
// Hint examples use {$surname} and {$letters}, which the conversation UI binds to the player's surname
// (a stand-in surname follows for players who left it empty).
//
// Guide: the mission lists the over-the-counter plan or the pickup plan (also while the returning-customer
// question "Are you here to pick up a prescription?" is open). The recommendation and dosage questions
// point the guide at per-product copies of their hint groups ("Okay, I'll try them." for lozenges).

import type { Ctx, EntityDef, HintItem, Pending, SentSrc, SituationDef, Suggestion } from "../types";
import { ent, t } from "../dsl";
import { expectHowAreYou } from "../global";

// ---------------------------------------------------------------------------
// Entities

const VAISTAI = "vaistai/vaistų/vaistams/vaistus/vaistais/vaistuose";

export const SYMPTOMS: EntityDef[] = [
  ent("headache", "headache", "galvos skausmas/galvos skausmo/galvos skausmui/galvos skausmą/galvos skausmu/galvos skausme", "m",
    { chip: "galvos skausmas", forms: ["headaches", "migraine", "splitting headache"] }),
  ent("sore_throat", "sore | throat", "skaudanti/skaudančios/skaudančiai/skaudančią/skaudančia/skaudančioje | gerklė/gerklės/gerklei/gerklę/gerkle/gerklėje", "f",
    { chip: "gerklės skausmas", forms: ["throat ache", "scratchy throat", "sore throats"] }),
  ent("cough", "cough", "kosulys/kosulio/kosuliui/kosulį/kosuliu/kosulyje", "m", { chip: "kosulys", forms: ["coughs", "dry cough", "chesty cough", "tickly cough"] }),
  ent("cold", "cold", "peršalimas/peršalimo/peršalimui/peršalimą/peršalimu/peršalime", "m", { chip: "peršalimas", forms: ["colds", "head cold", "the flu", "flu", "common cold"] }),
  ent("fever", "fever", "karščiavimas/karščiavimo/karščiavimui/karščiavimą/karščiavimu/karščiavime", "m", { chip: "karščiavimas", forms: ["fevers", "high fever", "slight fever"] }),
  ent("allergies", "allergies", "alergija/alergijos/alergijai/alergiją/alergija/alergijoje", "f", { art: "", chip: "alergija", forms: ["allergy", "hay fever", "seasonal allergies", "pollen allergy"] }),
  ent("upset_stomach", "upset | stomach", "sutrikęs/sutrikusio/sutrikusiam/sutrikusį/sutrikusiu/sutrikusiame | skrandis/skrandžio/skrandžiui/skrandį/skrandžiu/skrandyje", "m",
    { chip: "sutrikęs skrandis", forms: ["stomach ache", "stomachache", "stomach pain", "tummy ache", "indigestion", "heartburn", "upset tummy"] }),
  ent("sunburn", "sunburn", "saulės nudegimas/saulės nudegimo/saulės nudegimui/saulės nudegimą/saulės nudegimu/saulės nudegime", "m",
    { chip: "saulės nudegimas", forms: ["sun burn", "sunburns", "bad sunburn"] }),
];

export const PRODUCTS: EntityDef[] = [
  ent("ibuprofen", "ibuprofen", "ibuprofenas/ibuprofeno/ibuprofenui/ibuprofeną/ibuprofenu/ibuprofene", "m", { art: "some", chip: "ibuprofenas",
    forms: ["advil", "motrin", "ibuprofen tablets", "ibuprofen pills", "painkillers", "painkiller", "pain killers", "pain killer", "pain reliever", "pain relievers",
      "pain medicine", "pain pills", "pain medication", "something for pain", "something for the pain", "anything for pain", "anything for the pain", "medicine for pain"], attrs: { price: 899, store: 599, brand: "advil", drowsy: "no", food: "with", pills: true, med: true } }),
  ent("acetaminophen", "acetaminophen", "paracetamolis/paracetamolio/paracetamoliui/paracetamolį/paracetamoliu/paracetamolyje", "m", { art: "some", chip: "paracetamolis",
    forms: ["tylenol", "acetaminophen tablets", "acetaminophen pills"], attrs: { price: 799, store: 549, brand: "tylenol", drowsy: "no", food: "any", pills: true, med: true } }),
  ent("cough_syrup", "cough | syrup", `kosulio | sirupas/sirupo/sirupui/sirupą/sirupu/sirupe`, "m", { art: "some", chip: "sirupas nuo kosulio",
    forms: ["cough medicine", "robitussin", "cough syrups"], attrs: { price: 1099, drowsy: "little", food: "any", liquid: true, med: true } }),
  ent("lozenges", "throat | lozenges", "gerklės | pastilės/pastilių/pastilėms/pastiles/pastilėmis/pastilėse", "f", { art: "some", chip: "pastilės gerklei",
    forms: ["lozenges", "cough drops", "throat drops", "lozenge", "throat lozenge"], attrs: { price: 499, drowsy: "no", food: "any", enPl: true, ltPl: true, med: true } }),
  ent("cold_medicine", "cold | medicine", `peršalimo | ${VAISTAI}`, "m", { art: "some", chip: "vaistai nuo peršalimo",
    forms: ["cold medication", "flu medicine", "cold and flu medicine", "dayquil", "nyquil", "cold tablets"], attrs: { price: 1199, drowsy: "yes", food: "any", ltPl: true, pills: true, med: true } }),
  ent("allergy_medicine", "allergy | medicine", `alergijos | ${VAISTAI}`, "m", { art: "some", chip: "vaistai nuo alergijos",
    forms: ["allergy pills", "allergy tablets", "antihistamine", "antihistamines", "claritin", "zyrtec", "allergy meds", "allergy medication"], attrs: { price: 1499, drowsy: "no", food: "any", ltPl: true, pills: true, med: true } }),
  ent("antacid", "antacid", "vaistai nuo rėmens/vaistų nuo rėmens/vaistams nuo rėmens/vaistus nuo rėmens/vaistais nuo rėmens/vaistuose nuo rėmens", "m", { art: "some", chip: "vaistai nuo rėmens",
    forms: ["antacids", "tums", "pepto", "pepto bismol", "rolaids", "antacid tablets"], attrs: { price: 649, drowsy: "no", food: "any", ltPl: true, pills: true, med: true } }),
  ent("aloe", "aloe | gel", "alavijo | gelis/gelio/geliui/gelį/geliu/gelyje", "m", { art: "some", chip: "alavijo gelis",
    forms: ["aloe vera", "aloe vera gel", "aloe", "after sun gel", "after sun", "after sun lotion"], attrs: { price: 799, drowsy: "no", skin: true } }),
  ent("sunscreen", "sunscreen", "kremas nuo saulės/kremo nuo saulės/kremui nuo saulės/kremą nuo saulės/kremu nuo saulės/kreme nuo saulės", "m", { art: "some", chip: "kremas nuo saulės",
    forms: ["sun screen", "sunblock", "sun block", "spf", "sun lotion"], attrs: { price: 1299, drowsy: "no", skin: true } }),
  ent("bandaids", "Band-Aids", "pleistrai/pleistrų/pleistrams/pleistrus/pleistrais/pleistruose", "m", { art: "some", chip: "pleistrai",
    forms: ["band aid", "bandaid", "bandaids", "bandages", "adhesive bandages"], attrs: { price: 449, enPl: true, ltPl: true, noDose: true } }),
  ent("vitamins", "vitamins", "vitaminai/vitaminų/vitaminams/vitaminus/vitaminais/vitaminuose", "m", { art: "some", chip: "vitaminai",
    forms: ["multivitamins", "multivitamin", "vitamin c", "vitamin d"], attrs: { price: 999, drowsy: "no", food: "with", enPl: true, ltPl: true, pills: true } }),
];

const ALL = [...SYMPTOMS, ...PRODUCTS];
const byId = (id: string) => ALL.find((e) => e.id === id)!;
const at = (id: string) => byId(id).attrs || {};

const REC: Record<string, string> = {
  headache: "ibuprofen", sore_throat: "lozenges", cough: "cough_syrup", cold: "cold_medicine", fever: "acetaminophen",
  allergies: "allergy_medicine", upset_stomach: "antacid", sunburn: "aloe",
};
const ALT: Record<string, string> = { ibuprofen: "acetaminophen", acetaminophen: "ibuprofen", cough_syrup: "lozenges", lozenges: "acetaminophen", cold_medicine: "acetaminophen" };
const RX_PRICE = 2450, RX_COPAY = 1000;

// ---------------------------------------------------------------------------
// State helpers

const enPl = (id: string) => !!at(id).enPl;
const ltPl = (id: string) => !!at(id).ltPl;
const bind = (id: string) => ({ id, qty: ltPl(id) ? 2 : 1 });
const basket = (c: Ctx) => c.s.basket as string[];
const product = (c: Ctx) => c.s.product as string | undefined;
const rx = (c: Ctx) => c.s.rx as { name?: string; spelled?: boolean; dob?: boolean; ready?: boolean; later?: boolean; insurance?: boolean; paidPrice?: number };
const last = (x: any) => (Array.isArray(x) ? x[x.length - 1] : x);

function priceOf(c: Ctx, id: string): number {
  if (id === "rx") return rx(c).insurance ? RX_COPAY : RX_PRICE;
  const a = at(id);
  return c.s.storeBrandFor === id ? a.store : a.price;
}
const total = (c: Ctx) => basket(c).reduce((s, id) => s + priceOf(c, id), 0);

/** Say a line in its …_pl variant for products that are plural in English; LT agreement comes from the binding. */
function sayP(c: Ctx, line: string, id = product(c), vars: Record<string, any> = {}) {
  const pl = id && id !== "rx" && enPl(id) && !!pharmacy.lines[line + "_pl"];
  c.say(pl ? line + "_pl" : line, { ...(id && id !== "rx" ? { X: bind(id) } : {}), ...vars });
}

/** The recommended product for the symptom, adjusted for allergies and other medication. */
function recommendation(c: Ctx): string {
  let p = REC[c.s.symptom] ?? "ibuprofen";
  if (p === "ibuprofen" && (c.s.allergy === "nsaid" || c.s.meds === "bp")) p = "acetaminophen";
  return p;
}

function addProduct(c: Ctx, id: string) {
  if (!basket(c).includes(id)) basket(c).push(id);
  const cur = product(c);
  if (!cur) { c.s.product = id; if (at(id).noDose) c.s.dosageGiven = true; }
  else if (cur !== "rx" && !at(cur).med && at(id).med) { c.s.product = id; c.s.dosageGiven = false; }
  // Twist: the name brand is out, the store brand is the same medicine.
  if (c.s.storeBrand && !c.s.storeBrandFor && (id === "ibuprofen" || id === "acetaminophen")) {
    c.s.storeBrandFor = id;
    c.twist("store_brand");
    c.say(id === "ibuprofen" ? "out_advil" : "out_tylenol");
    c.say("store_brand");
  }
}

/** Dosage for the current product (and the children's version if it's for a child). */
function giveDosage(c: Ctx) {
  const id = product(c);
  c.s.dosageGiven = true;
  if (c.s.mode === "rx") { c.say("dose_rx"); c.say("dose_rx_days"); c.say("dose_rx_finish"); return; }
  if (!id) return;
  if (c.s.forWho === "child" && at(id).med) { c.say("kids_dose"); c.say("kids_cup"); return; }
  switch (id) {
    case "ibuprofen": c.say("dose_ibuprofen"); c.say("max_six"); break;
    case "acetaminophen": c.say("dose_two_six"); c.say("max_six"); break;
    case "cough_syrup": c.say("dose_syrup"); c.say("syrup_cup"); break;
    case "lozenges": c.say("dose_lozenges"); c.say("dose_lozenges_2"); break;
    case "cold_medicine": c.say("dose_two_six"); c.say("cold_drowsy"); break;
    case "allergy_medicine": c.say("dose_allergy"); c.say("allergy_nondrowsy"); break;
    case "antacid": c.say("dose_antacid"); c.say("max_ten"); break;
    case "aloe": c.say("dose_aloe"); c.say("drink_water"); break;
    case "sunscreen": c.say("dose_sunscreen"); c.say("dose_sunscreen_2"); break;
    case "vitamins": c.say("dose_vitamins"); break;
    default: c.say("no_dose");
  }
}

/** Dosage of a product that is only on offer (the learner asks before deciding). */
function giveDosageFor(c: Ctx, id: string) {
  const keep = c.s.product, given = c.s.dosageGiven;
  c.s.product = id;
  giveDosage(c);
  c.s.product = keep;
  c.s.dosageGiven = given;
  c.s.dosageHeard = true;
}

function daysFromTags(tags: string[], slots: any): number | undefined {
  for (const tg of tags) { const m = tg.match(/^d(\d+)$/); if (m) return Number(m[1]); }
  const n = slots?.n;
  if (typeof n === "number") {
    if (tags.includes("unit_w")) return n * 7;
    if (tags.includes("unit_h")) return 0;
    return n;
  }
  if (slots?.day) return 3;
  return undefined;
}

function symptomFromTags(tags: string[]): string | undefined {
  for (const tg of tags) if (tg.startsWith("s_")) return tg.slice(2);
  return undefined;
}

function startRx(c: Ctx, kind: "pickup" | "dropoff") {
  c.s.mode = "rx";
  c.s.rx = {};
  c.s.rxKind = kind;
  c.s.product = "rx";
  if (!basket(c).includes("rx")) basket(c).push("rx");
}

// Hint helper: EN "it"/LT singular, EN "it"/LT plural, EN "them"/LT plural (products).
const plAgree = (s: string) => s.replace(/(\{[a-ząčęėįšųūž]+@X:(?:nom|gen|dat|acc|ins|loc))\}/g, "$1:pl}");
function hv(id: string, enSg: string, enPlS: string, lt: string, nat: string, extra: Partial<SentSrc> = {}, f: (e: EntityDef) => boolean = () => true): HintItem[] {
  const EP = (e: EntityDef) => !!e.attrs?.enPl, LP = (e: EntityDef) => !!e.attrs?.ltPl;
  return [
    { id, s: t(enSg, lt, nat, extra), only: (e) => f(e) && !EP(e) && !LP(e) },
    { id, s: t(enSg, plAgree(lt), plAgree(nat), extra), only: (e) => f(e) && !EP(e) && LP(e) },
    { id, s: t(enPlS, plAgree(lt), plAgree(nat), extra), only: (e) => f(e) && EP(e) },
  ];
}

/** Hint group order for the guide, which shows the first items as model answers: variant i of every
 *  expression goes to block i (block 0 = singular, also plain items), so the first items differ. */
function ordered(...entries: (HintItem | HintItem[])[]): HintItem[] {
  const blocks: HintItem[][] = [];
  entries.forEach((e, k) => (Array.isArray(e) ? e : [e]).forEach((it, i) => { ENTRY.set(it, k); (blocks[i] ??= []).push(it); }));
  return blocks.flat();
}
/** The position of each item's expression in its group (per-product copies list them in this order). */
const ENTRY = new WeakMap<HintItem, number>();

// Checklist modes: over the counter, or a prescription pickup (also while "Are you here to pick up a
// prescription?" is open for a returning customer).
const otcMode = (c: Ctx) => c.s.mode !== "rx" && !c.s.rxOffer;
const rxMode = (c: Ctx) => c.s.mode === "rx" || !!c.s.rxOffer;
/** The pharmacist's optional questions (who, how long, other medication, allergies) still open. */
const openQuestions = (c: Ctx) => (c.s.askWho && !c.s.forWho) || (c.s.askHowLong && c.s.days === undefined) || (c.s.askMeds && !c.s.meds) || (c.s.askAllergy && !c.s.allergy);

const FLAG_DO = "Question “Do” = the particle ar.";
const FLAG_WOULD = "“Would” in a yes/no question = the particle ar; the conditional sits on the verb.";
const FLAG_PER = "“a” here means “per”: šešių per dieną (six a day).";

const AUTO: Record<string, string> = {
  rx_prompt: "No, I need something for a headache.", need: "Do you have something for a headache?", who: "Yes, it's for me.", who_q: "It's for me.",
  howlong: "Since yesterday.", meds: "No, I'm not taking anything.", allergy: "No, I'm not allergic to anything.", recommend: "Yes, I'll try it.",
  alt: "Yes, please.", dosage: "How often should I take it?", more: "No, that's all, thanks.", pay: "Card, please.", bag: "No, thanks.",
  rx_name: "It's Mikalauskas.", rx_spell: "M-I-K-A-L-A-U-S-K-A-S.", rx_dob: "June 4th, 1980.", wait_q: "Sure, I'll wait.", rx_ins: "No, I don't have insurance.",
  rx_counsel: "Yes, it's my first time.", sick_q: "I have a headache.",
};

// ---------------------------------------------------------------------------

export const pharmacy: SituationDef = {
  id: "s75-pharmacy",
  song: 75,
  songTitle: "Something for a Headache",
  title: { en: "Something for a Headache", lt: "Ką nors nuo galvos skausmo" },
  topic: { en: "At the pharmacy", lt: "Vaistinėje" },
  chapter: 3,
  order: 5,
  location: "pharmacy",
  npc: "okafor",
  goal: "Nusipirk vaistų ir pasiteirauk, kaip juos vartoti.",
  intro: "„Harbor Pharmacy“ – vaistinė pagrindinėje gatvėje. Nereceptiniai vaistai stovi lentynose, o gale, prie prekystalio, dirba vaistininkas ponas Okaforas. Čia galite ir atsiimti vaistus pagal receptą.",
  entities: { symptom: SYMPTOMS, product: PRODUCTS },

  merges: {
    "i'd recommend": { reason: "grammatical_fusion", split: "I'd → aš drops “would”; the conditional ending of rekomenduočiau carries would + recommend.", minimal: "The object stays outside." },
    "let's see": { reason: "grammatical_fusion", split: "Let's → leiskime + see → matyti is a calque; the first person plural imperative = pažiūrėkime.", minimal: "Two words (C-LEX, like “Let's stay → likime”)." },
    "let me check": { reason: "lexical_expression", split: "let → leiskite + me → man + check → patikrinti is a calque; the pharmacist's “let me check” = pažiūrėsiu.", minimal: "All three words." },
    "right here": { reason: "lexical_expression", split: "right → dešinėje/teisingai + here → čia is false; the intensifier = čia pat.", minimal: "Two words." },
    "over the counter": { reason: "lexical_expression", split: "over → virš + the → — + counter → prekystalis is a literal picture; “over the counter” (medicine) = nereceptinis.", minimal: "All three words." },
    "you'd need": { reason: "grammatical_fusion", split: "you'd → jūs drops “would”; the conditional reikėtų carries would + need (with the dative jums).", minimal: "Two words." },
    "side effects": { reason: "lexical_expression", split: "side → šonas + effects → poveikiai names nothing; the term = šalutinis poveikis.", minimal: "Compound noun." },
    "get well": { reason: "lexical_expression", split: "get → gauti + well → gerai is false; = pasveikti.", minimal: "Two words." },
    "for now": { reason: "lexical_expression", split: "for → už + now → dabar is false; = kol kas.", minimal: "Two words." },
    "last name": { reason: "lexical_expression", split: "last → paskutinis + name → vardas gives “the last name in a list”; the surname = pavardė.", minimal: "Compound noun." },
    "date of birth": { reason: "lexical_expression", split: "date → data + of birth → gimimo keeps English order (data gimimo); the set term = gimimo data.", minimal: "All three words." },
    "to pick up": { reason: "grammatical_fusion", split: "to → į + pick → rinkti + up → aukštyn is false; the infinitive of “pick up” (collect) = atsiimti.", minimal: "Three words (C-INF + C-PHR)." },
    "go out": { reason: "lexical_expression", split: "go → eiti + out → lauk; the prefix iš- of išeinant carries “out”.", minimal: "Two words (C-PHR)." },
    "come back": { reason: "lexical_expression", split: "come → ateiti + back → atgal; grįžti carries both.", minimal: "Two words." },
    "have a seat": { reason: "lexical_expression", split: "have → turėkite, a → —, seat → vietą is false; = prisėskite.", minimal: "All three words." },
    "not taking": { reason: "grammatical_fusion", split: "not → ne + taking → vartojantis gives a stray ne- and a participle; Lithuanian negation is the prefix of the finite verb (nevartoju).", minimal: "Two words (C-NEG)." },
    "i see": { reason: "lexical_expression", split: "I → aš + see → matau is a literal reading; the acknowledgement = aišku.", minimal: "Two words." },
    "go ahead": { reason: "lexical_expression", split: "go → eikite + ahead → pirmyn is literal; an invitation to speak = klauskite.", minimal: "Two words." },
    "let me know": { reason: "lexical_expression", split: "let → leiskite + me → man + know → žinoti is a calque; = pasakykite.", minimal: "All three words." },
    "a little": { reason: "lexical_expression", split: "a → — + little → mažas gives a false “small”; the degree adverb = truputį.", minimal: "Two words (C-LEX)." },
    "let's find": { reason: "grammatical_fusion", split: "Let's → leiskime + find → rasti is a calque; the first person plural imperative = raskime.", minimal: "Two words (C-LEX, like “Let's stay → likime”)." },
    "a few": { reason: "lexical_expression", split: "a → — + few → nedaug would give “not many”; “a few” = keli.", minimal: "Two words." },
  },

  grammar: {
    macros: {
      need_pre: "(do you have | have you got | do you sell | i need | i would like | can i (get | have) | could i (get | have) | i am looking for | i want #blunt | give me #blunt)",
      sth: "(something | anything | some medicine | any medicine | a medicine | something good | something strong | something else | some medication | [some] pills | [some] tablets | [some] meds | medication | some drops | something to take | anything to take)",
      // "…, what do you recommend?" / "… Do you have anything for it?" after saying what's wrong
      rec_tail: "[and | so] (what (do | would | can) you (recommend | suggest) | what (can | should | do) i take [for it] | what is good for (it | that | this) | (do you have | have you got | is there) (anything | something) for (it | that | this) | can you help [me] | can you give me something)",
      // how long, said together with the symptom ("I have a headache since morning")
      since_tail: "((since | from) (yesterday #d1 | last night #d1 | this morning #d0 | [the] morning #d0 | today #d0 | the weekend #d3 | last week #d7 | {day}) | for [about | almost | already | maybe] ({n:number} (days #unit_d | day #unit_d | weeks #unit_w | week #unit_w) | a day #d1 | a couple of days #d2 | a few days #d3 | a week #d7 | two weeks #d14 | a while #d7) | [already] ({n:number} (days #unit_d | weeks #unit_w) | a week #d7) already)",
      had_it: "(i have had (it | this | them | that | the {symptom} | the pain) | it has been going on | it has been like this | i have it | it is going on)",
      pain_in: "(head #s_headache | throat #s_sore_throat | stomach #s_upset_stomach | belly #s_upset_stomach | tummy #s_upset_stomach)",
      much: "(a lot | so much | very much | really badly | badly | all the time | all day | all night)",
      rel_child: "(son | daughter | kid | child | little boy | little girl | baby | little one | kids | children | boy | girl)",
      rel_adult: "(husband | wife | mom | mother | dad | father | friend | partner | boyfriend | girlfriend | grandma | grandpa | grandmother | grandfather | brother | sister | colleague | neighbor | roommate)",
      vit_item: "(vitamins | a multivitamin | multivitamins | vitamin (c | d | b12 | b) | fish oil | omega three | magnesium | iron | supplements | probiotics | calcium)",
      allergen: "(aspirin #nsaid | ibuprofen #nsaid | advil #nsaid | nsaids #nsaid | penicillin #pen | amoxicillin #pen | [some] antibiotics #other | nuts #other | peanuts #other | latex #other | codeine #other | cats #other | dogs #other | pollen #other | dust #other | hay fever #other | grass #other | sulfa #other | shellfish #other | eggs #other | milk #other | lactose #other | gluten #other)",
      badly: "(bad | terrible | awful | little | slight | mild | really bad | horrible | nasty | slight)",
      for_sym: "for [a | an | my | the | this] [@badly] {symptom}",
      it_ref: "(it | this | that | them | they | these | those | this one | that one | the medicine | this medicine)",
      art: "(some | any | a | an | the | a box of | a bottle of | a pack of | a tube of | a package of | a pack | one)",
      prod: "({product} | {product:brit_product})",
    },
    slots: {
      brit_product: { lexicon: [
        { id: "acetaminophen", forms: ["paracetamol", "paracetamol tablets"], tags: ["tip:uk_paracetamol"] },
        { id: "bandaids", forms: ["plasters", "plaster", "sticking plasters"], tags: ["tip:uk_plasters"] },
        { id: "sunscreen", forms: ["sun cream", "suncream", "sun tan lotion"], tags: ["tip:uk_suncream"] },
        { id: "lozenges", forms: ["cough sweets", "throat sweets"], tags: ["tip:uk_lozenges"] },
        { id: "cough_syrup", forms: ["cough mixture"], tags: ["tip:uk_cough_mixture"] },
      ] },
    },
  },

  intents: {
    // --- what's wrong --------------------------------------------------------------------------
    need_symptom: { patterns: [
      "@need_pre @sth @for_sym #h:sth_for", "(is there | have you got) (something | anything) @for_sym", "[just] @sth @for_sym",
      "what (can | should | could) i take @for_sym #h:what_take", "what (do | would) you recommend @for_sym #h:recommend_for", "what is (good | best) @for_sym",
      "(can | could) you recommend something @for_sym", "what (do | would) you suggest @for_sym",
      "(can | could) you (give me | help me with) something @for_sym", "what (helps | works) (for | against) [a | an | my] {symptom}", "what (do | would) you have @for_sym",
      "(something | anything | medicine) (against | from) [a | an | my | the] {symptom}", "@need_pre @sth (against | from) [a | an | my | the] {symptom}",
      "(do you have | i need) (a | some) {symptom} (medicine | medication | pills | tablets | remedy)",
    ] },
    symptom_state: { patterns: [
      "(i have | i have got | i have had | i got | i have been having | i caught | i have caught) [a | an] [@badly] {symptom} [@since_tail] [@rec_tail] #h:i_have", "i think i (have | am getting | am coming down with) [a | an] {symptom} [@rec_tail]",
      "my head (hurts | aches | is killing me | is pounding | really hurts) [@much] [@since_tail] [@rec_tail] #s_headache #h:body_hurts", "i have a (pounding | splitting) head #s_headache",
      "my throat (hurts | is sore | is scratchy | is killing me | really hurts) [@much] [@since_tail] [@rec_tail] #s_sore_throat #h:body_hurts", "it hurts (when i swallow | to swallow) #s_sore_throat",
      "my stomach (hurts | is upset | aches | feels bad | is not good | really hurts) [@much] [@since_tail] [@rec_tail] #s_upset_stomach #h:body_hurts", "my tummy (hurts | is upset) #s_upset_stomach",
      "(i got | i am) (sunburned | sunburnt | burned) [at the beach | yesterday | today | on vacation | on the beach] [@rec_tail] #s_sunburn", "i (got | have) burned (in | by) the sun #s_sunburn",
      "(i have | i have got | i got) [a | an] [@badly] {symptom} and [a | an] [@badly] {symptom} [@since_tail] [@rec_tail]", "(i have | i have got) [a | an] {symptom} [and] [i am] (coughing #s_cough | sneezing)",
      "my @rel_child (has | has got | has had) [a | an] [@badly] {symptom} [@since_tail] [@rec_tail] #child",
      "my @rel_adult (has | has got | has had) [a | an] [@badly] {symptom} [@since_tail] [@rec_tail] #adult",
      "i (can not stop | keep) coughing #s_cough", "i am coughing [a lot] #s_cough", "i have been (coughing | sneezing #s_allergies) [@much] [@since_tail] #s_cough",
      "i (keep | can not stop) sneezing #s_allergies", "my eyes are (itchy | watery | itchy and watery) #s_allergies",
      "i have a (runny | stuffy | blocked) nose #s_cold", "(i have | i have got) a [high] temperature #s_fever #tip:uk_temperature", "i am running a (fever | temperature) #s_fever",
      "i (think i have | have) a (bit of a | little) {symptom}",
      // other constructions: "I have pain in my head", "my head is hurting", "a sunburn from the beach"
      "i have [a | some | bad | a bad | terrible | a lot of] pain in my @pain_in [@since_tail] [@rec_tail]", "i have [a | some] (head #s_headache | throat #s_sore_throat | stomach #s_upset_stomach) (pain | ache) [@since_tail] [@rec_tail]",
      "my (head #s_headache | throat #s_sore_throat | stomach #s_upset_stomach) (is hurting | is aching | is very bad | is not okay) [@since_tail] [@rec_tail]",
      "(i have | i have got | i got) [a | an] [@badly] {symptom} (at | on | from) the (beach | pool | sun) [yesterday | today] [@rec_tail]",
      "my nose is (running | stuffy | blocked) #s_cold", "i (am | feel) (hot | feverish) #s_fever",
      "i (threw up | have been throwing up | feel sick to my stomach | feel nauseous | have diarrhea) #s_upset_stomach", "i ate something bad #s_upset_stomach",
      "my skin is (red | burned | burning) [from the sun] #s_sunburn",
      "i have (a problem | problems | some problems | an issue | trouble) with my @pain_in [@since_tail] [@rec_tail]", "(i am | i feel) (sick | ill) with [a | an | the] {symptom} [@rec_tail]",
      "[i need something for my @rel_child] (he | she) (has | has got) [a | an] [@badly] {symptom} [@since_tail] #child",
    ] },
    // "Headache." / "A bad cough." as the answer to "What can I do for you?" or "What are your symptoms?"
    symptom_ctx: { patterns: ["[a | an | the | just | only] [@badly] {symptom} [and [a | an] [@badly] {symptom}] [@since_tail]"] },
    feel_sick: { patterns: [
      "i (feel | am) (sick | ill | unwell | terrible | awful | not well | not great | not so good | really bad) [@rec_tail]", "i do not feel (well | good | great | so good) [@rec_tail]",
      "i am not feeling (well | good | great | very well) [@rec_tail]", "(i am | i feel) a bit (sick | under the weather | off)", "i am under the weather",
      "i (think i am | am) getting sick",
    ] },

    // --- asking for a product ----------------------------------------------------------------
    need_product: { patterns: [
      "(can | could) i (get | have) [@art] @prod #h:can_i_get", "(do you have | have you got | do you sell | do you carry) [any | some] @prod #h:q_have_any",
      "i would like [@art] @prod #h:id_like", "(i need | i am looking for) [@art] @prod", "(i want | give me) [@art] @prod #blunt",
      "[can i get | i would like | i need] (a box of | a pack of | a package of) @prod #h:box_of", "[can i get | i would like | i need] (a bottle of | a tube of) @prod #h:box_of",
      "[some | a box of | a bottle of] @prod", "(i will take | i will have | i will get | i will try) [@art] @prod", "where (is | are | can i find | do you keep) [the | some | your] @prod #h:where_find",
      "(which | what) aisle is [the] @prod in",
    ] },
    product_unknown: { patterns: ["@need_pre [some | any | a | an] {w:any}"] },
    change_product: { patterns: [
      "(can | could) i (have | get | try) @prod instead", "[actually] @prod instead", "i would (rather | prefer) [have | take] @prod", "what about @prod", "(is | would) @prod (better | okay | fine)",
      "@prod (is | would be) (fine | okay | good | great | better) [for me]", "i (prefer | like) @prod [better | more]", "(maybe | how about) @prod", "i (usually | always) (take | use) @prod",
    ] },
    other_option: { patterns: [
      "(do you have | is there) (anything | something) else #h:rec_else", "(is there | do you have) (another | a different) (one | option | medicine | brand)",
      "i do not (want | like) (that one | that | this one)", "(something | anything) else [please]", "i would prefer something else",
      "i do not (want | like) @prod", "(it | that | @prod) (does not | do not) (work | help) (for me | on me | me)", "i would (like | prefer) something (different | natural | stronger)",
      "(do you have | is there) something (different | natural | stronger)", "what else (do you have | is there | can i take)", "(what are | are there) (the | any) other options",
      "[no] not @prod [please | this time]",
    ] },

    // --- the pharmacist's questions --------------------------------------------------------
    who_ans: { patterns: [
      "[yes] (it is | this is | that is) for me #me #h:who_me", "[it is] for me yes #me", "[yes] for me #me", "[yes] just for me #me", "[it is] for myself #me",
      "[no] (it is | this is | that is) for my (son | daughter | kid | child | little boy | little girl | baby | little one | kids | children) #child #h:who_child",
      "[no] for my (son | daughter | kid | child | little boy | little girl | baby | little one | kids | children) #child",
      "[no] (it is | this is | that is) for my (husband | wife | mom | mother | dad | father | friend | partner | boyfriend | girlfriend | grandma | grandpa | brother | sister) #adult #h:who_wife",
      "[no] for my (husband | wife | mom | mother | dad | father | friend | partner | boyfriend | girlfriend | brother | sister) #adult",
      "my (son | daughter) is {n:number} [years old] #child", "(he | she) is {n:number} [years old] #child",
      // more ways: "Me.", "Not for me, for my dad", "My wife is sick", "she has five years" (LT: jai penkeri metai)
      "[just | only] (me | myself) #me", "[it is] (for | just for) (me and my @rel_adult | both of us | the two of us | my family | the family) #me",
      "[no] [it is | this is] not for me [but] [it is] for my (@rel_child #child | @rel_adult #adult)",
      "[no] (it is | this is | that is) not for me #notme", "[no] (for)? someone else #notme", "[no] (it is | this is) for someone else #notme",
      "my @rel_adult is (sick | ill | not feeling well | not well) #adult", "my @rel_child is (sick | ill | not feeling well | not well) #child",
      "(he | she) (has | is) {n:number} years [old] #child", "(he | she) is (a baby | a little kid | little) #child", "(he | she) is an adult #adult",
      "[it is] for (a child | a kid | kids | children | a baby) #child", "[it is] for (an adult | adults) #adult",
    ] },
    howlong_ans: { patterns: [
      "(since | from) (yesterday #d1 | last night #d1 | this morning #d0 | today #d0 | the weekend #d3 | last week #d7 | a few days ago #d3 | two days ago #d2 | three days ago #d3 | {day}) #h:since",
      "[for] [about | around | almost | nearly | just | only | maybe] {n:number} (days #unit_d | day #unit_d | weeks #unit_w | week #unit_w | hours #unit_h) [now] #h:for_days",
      "[for] [about | around | just | only | almost | maybe] (a day #d1 | a couple of days #d2 | a few days #d3 | a week #d7 | about a week #d7 | a couple of weeks #d14 | two weeks #d14 | a while #d7 | a long time #d14 | a few hours #d0 | an hour #d0 | a few weeks #d14 | a month #d30) [now] #h:for_days",
      "(it | this | the {symptom}) started (yesterday #d1 | this morning #d0 | last night #d1 | a few days ago #d3 | two days ago #d2 | last week #d7 | on {day})",
      "(just | only) (today #d0 | since this morning #d0)", "(yesterday #d1 | this morning #d0 | last night #d1 | today #d0)", "it has been {n:number} (days #unit_d | weeks #unit_w)",
      "(since | about | for) (yesterday | this morning) (morning | evening | afternoon) #d1",
      // "I've had it for about three days", "It's been going on for a week", "Two or three days", "Since two days" (LT: nuo dviejų dienų)
      "@had_it [for] [about | around | almost | nearly | just | only | maybe | already] ({n:number} (days #unit_d | day #unit_d | weeks #unit_w | week #unit_w | hours #unit_h | hour #unit_h) | a day #d1 | a couple of days #d2 | a few days #d3 | a week #d7 | a couple of weeks #d14 | two weeks #d14 | a while #d7 | a long time #d14 | a few hours #d0 | a couple of hours #d0 | an hour #d0 | a month #d30) [now | already | or so]",
      "[for] [about | just | only | maybe] (a couple of | a few | two | three) hours #d0",
      "@had_it (since | from) (yesterday #d1 | last night #d1 | this morning #d0 | [the] morning #d0 | today #d0 | the weekend #d3 | last week #d7 | {day})",
      "[@had_it] (since | from) last {day}", "(it is | this is | today is) the {n:ordinal} day [already | now]", "today (morning | in the morning) #d0",
      "(it | this | the {symptom} | the pain) (started | began | came) (yesterday #d1 | this morning #d0 | last night #d1 | today #d0 | a few days ago #d3 | two days ago #d2 | last week #d7 | on {day} | {day} | {n:number} (days #unit_d | weeks #unit_w) ago)",
      "(since | from) [the] morning #d0", "(yesterday | last) (morning | afternoon | evening | night) #d1",
      "[for] [about | around | maybe] {n:number} or {n2:number} (days #unit_d | weeks #unit_w)", "(since | already) {n:number} (days #unit_d | day #unit_d | weeks #unit_w | week #unit_w) [already]",
      "[about | for | maybe] ({n:number} (days #unit_d | weeks #unit_w) | a week #d7 | a few days #d3 | a couple of days #d2) (or so | already)",
      "{n:number} (days #unit_d | day #unit_d | weeks #unit_w | week #unit_w) ago", "a few (hours #d0 | days #d3) ago",
      "not (long | very long) [only | just] [since this morning | a few hours | today] #d0", "(only | just) (a few hours #d0 | a day #d1 | one day #d1 | two days #d2)",
    ] },
    meds_ans: { patterns: [
      "[no] i am not taking (anything | any other medication | any other medications | any medicine | any other medicine) [else | right now] #none #h:meds_none",
      "[no] (nothing | nothing else) #none", "[no] not at the moment #none", "(no | nope) none #none",
      "(just | only) [some] (vitamins | a multivitamin | multivitamins | vitamin c | vitamin d) #vit #h:meds_vit", "i (take | am taking) [some] vitamins #vit",
      "[yes] i (take | am taking | am on) (blood pressure (pills | medicine | medication) | something for my (blood pressure | heart) | blood thinners | pills for my blood pressure | heart medication) #bp #h:meds_bp",
      "[yes] i (take | am taking | am on) (birth control | allergy pills | antidepressants | insulin | thyroid medication | sleeping pills) #other",
      // "None.", "Only blood pressure pills", "I take aspirin every day", "No, no other medicine"
      "none [at all] #none", "[no] i (did not | have not) (take | taken) anything [today] #none", "[no] no (other)? (medicine | medicines | medications | medication | pills | meds) [right now | at the moment] #none",
      "[no] i do not (take | use) (any | other | any other)? (medicine | medicines | medications | medication | pills | meds | anything) [else] [right now | at the moment | regularly] #none",
      "[no] (nothing | nothing else) (at the moment | right now | currently | today | regularly) #none", "[no] not (really | right now) #none",
      "(just | only) [some] @vit_item [and @vit_item] #vit", "i (take | am taking | use) [some] @vit_item [and @vit_item] [every day | daily] #vit",
      "(just | only) [my] [high] blood pressure (pills | medicine | medication | tablets) #bp",
      "[yes] i (take | am taking | am on | use) (pills | medicine | medication | tablets | something) for [my] [high] (blood pressure | heart) #bp",
      "[yes] i (take | am taking) [an | some | baby] aspirin [every day | daily | a day] #bp", "[yes] (blood thinners | heart medication | aspirin every day) #bp",
      "(just | only) (birth control | the pill | allergy pills | antidepressants | insulin | thyroid medication | sleeping pills | antibiotics) #other",
      "[yes] i (take | am taking | am on | use) (antibiotics | something for (my thyroid | diabetes | sleep | my stomach | cholesterol) | (pills | medicine) for (my thyroid | diabetes | sleep | cholesterol)) #other",
      "(just | only) [my] (pills | medicine | medication | tablets) for [my | the] [high] (heart | blood pressure) #bp", "[yes] for (my | the) [high] (heart | blood pressure) #bp",
      "[yes] for (diabetes | my thyroid | the thyroid | thyroid | cholesterol | sleep | sleeping | depression | my stomach) #other",
    ] },
    // bare answers to "Are you taking any other medications?" ("Yes, antibiotics.")
    meds_ctx: { patterns: ["[yes] (antibiotics | insulin | birth control | antidepressants | sleeping pills | thyroid pills | statins) #other", "[yes] @vit_item [and @vit_item] #vit"] },
    allergy_ans: { patterns: [
      "[no] i am not allergic to anything #none #h:allergy_none", "[no] not that i know of #none", "[no] no allergies #none", "[no] i do not have any allergies #none #h:allergy_no_any",
      "[yes] i am allergic to (aspirin #nsaid | ibuprofen #nsaid | advil #nsaid | penicillin #pen | nuts #other | peanuts #other | latex #other | codeine #other | cats #other | pollen #other | dust #other) #h:allergy_yes",
      "[yes] (aspirin #nsaid | penicillin #pen | ibuprofen #nsaid)", "[yes] i have a (nut | peanut | penicillin #pen | aspirin #nsaid) allergy",
      // "None.", "I have allergy for penicillin", "allergic on aspirin" (LT: alergiškas aspirinui), "I can't take ibuprofen"
      "[no] none [that i know of] #none", "[no] nothing [that i know of] #none", "[no] (i do not have | i have no) [any] (allergies | allergy) [that i know of] #none #h:allergy_no_any",
      "[no] no (medicine | drug | medication) allergies #none", "[no] not to (medicine | medicines | medications | any medicine) #none", "[no] i am not allergic #none",
      // negative with a name: one negative answer, never "allergic to penicillin" (no allergen tags here)
      "[no] i am not allergic to (aspirin | ibuprofen | advil | penicillin | amoxicillin | antibiotics | nuts | peanuts | latex | codeine | pollen | any medicine | medicine | medicines | any medications)",
      "[no] i do not have (an | any) allergy to (aspirin | ibuprofen | penicillin | antibiotics | nuts | peanuts | any medicine | medicine)",
      "[yes] i (have | have got) [an] allergy (to | for | on) @allergen [and @allergen]", "[yes] i am [very] allergic (to | on | for) @allergen [and @allergen]",
      "[yes] (just | only) [to] @allergen", "[yes] to @allergen", "i (can not | can not really) (take | have) (aspirin #nsaid | ibuprofen #nsaid | advil #nsaid | penicillin #pen)",
      "[yes] i (have | am) (allergic | an allergy) (to | on | for) (some | a) (medicine | medicines | antibiotics) #other",
    ] },
    // bare answers to "Do you have any allergies?" / "What are you allergic to?" ("Pollen.", "Just hay fever.")
    allergy_ctx: { patterns: ["[yes | just | only] @allergen [and @allergen]"] },
    accept_rec: { patterns: [
      "[yes] (that | it) would be better [thanks] #h:alt_better", "[yes] (that | it) would be (great | good | fine | perfect) [thanks]",
      "[okay | sure | yes | great] i will (take | try | get) (it | that | them | some | one) #h:rec_try", "[yes] (that | it) sounds (good | great | perfect) #h:rec_good",
      "[yes] i will give it a try", "[yes] let us (try | go with) (that | it)", "[yes] i would like to try (it | that)", "[okay] i will take that one",
      "[okay | sure | yes] i will try", "[yes] let me (try | take | get) (it | that | them | one)", "[yes] i will (take | buy | get) (one | a) (box | pack | bottle | package) [of (it | them)]",
      "[okay] give me (it | that | that one | this one | them | one) #blunt", "[yes] i will buy (it | that | them | one)", "[yes] (i want | i would like) (it | that | that one | them) #blunt",
      "[yes] (that | it) (sounds | seems) (fine | okay | right)", "[yes] i will go with (that | it | your recommendation)", "[okay | yes] (i trust you | if you say so | you are the expert)",
    ] },
    // "No, I don't want it." / "I'll think about it." at the recommendation
    decline_rec: { patterns: [
      "[no] i do not (want | need) (it | that | them | this one | that one | to try (it | that | them))", "[no] i will (leave it | pass | think about it | skip it) [for now | thanks]",
      "[no] i (think i will | will) leave it [for now]", "[no] maybe (later | next time)", "[no] i do not want to (take | buy | try) (it | that | them)",
    ] },

    // --- the learner's questions --------------------------------------------------------------
    ask_dosage: { patterns: [
      "how (often | many times [a day]) should i take (@it_ref) #h:q_how_often #h:dose_how", "how often (can | do | should) i take (@it_ref)", "how often",
      "how many (should i take | do i take | can i take | tablets | pills | capsules) [at a time | at once | a day | each time] #h:q_how_many", "how many [a day | per day | at a time | at once]",
      "how (do | should) i (take | use) (@it_ref) #h:q_how_take", "how much should i (take | use)", "what is the (dose | dosage)", "when should i take (@it_ref)",
      "how (often | many times [a day]) (should | can | do) i (use | apply | put on | reapply) (@it_ref) #h:q_how_often", "how (often | many times [a day]) (should | can | do) i put (@it_ref) on #h:q_how_often #h:dose_how",
      "how (do | should) i (apply | put on) (@it_ref)", "how (do | should) i put (@it_ref) on",
      "how many can i take [a day | in a day]", "how (do | should) i take (@it_ref) exactly", "what are the directions",
      "how (much | many) (should | do | can) i give (him | her | them | my son | my daughter | my child | my kid | a child)", "how often (should | can | do) i give (it | them) to (him | her | my son | my daughter | my child)",
      "how (much | many) (should | can) (he | she | my son | my daughter | my child) take",
      "@could_you (explain | tell me | show me) how (to take | to use | i take | i should take | i use | do i take | i should use) (@it_ref) [again]",
      "how many (can | should) i take (in one day | per day | a day | in a day | each day)", "how many (times | pills | tablets) (per day | a day | in a day)", "how many per day",
      "how (often | many times) (per day | in a day)", "(what | which) is the (right | correct | normal) dose", "how (do | should) i use (@it_ref)",
      "(once | twice | two times | three times) a day", "every (how many | few) hours",
      "(can | should | do) i take (one | two | both | three) [of them] [at once | at the same time | together | a day]", "[can you | could you] remind me [how to take (it | them) | the dose]",
      // "Do you know how to take it?" (Ar žinote, kaip jį vartoti?) · "How do you take it?" · "Tell me how to take it."
      "do you know how (to take | to use | i (should | can) take | i take | i (should | can) use) (@it_ref)",
      "do you know how (often | many times [a day]) (i | we) (should | can) take (@it_ref)", "do you know how (many | much) (i | we) (should | can) take [a day | at a time | at once]",
      "do you know (the | what the) (dose | dosage) [is]", "how do you (take | use) (@it_ref)", "tell me how (to take | to use | i should take | often to take) (@it_ref)",
      // "I don't know how to take it." as one request (not "I don't know" + a question)
      "i do not know how (to take | to use | often to take | many to take) (@it_ref)", "i do not know (the | what the) (dose | dosage) [is]",
    ] },
    ask_drowsy: { patterns: [
      "(does | do | will | can) (@it_ref) make (me | you | him | her | them | kids | children | people) (drowsy | sleepy | tired) #h:q_drowsy", "is it non drowsy", "will i (be | get | feel) (drowsy | sleepy)",
      "can i drive (after taking it | with it | after i take it)", "is (it | this) (drowsy | the non drowsy one)", "(does | do) (it | they) make you sleepy",
    ] },
    ask_rx_needed: { patterns: [
      "do i need a prescription [for (it | this | that | them)] #h:q_need_rx", "is (it | this) over the counter", "can i buy (it | this) without a prescription",
      "(is | does) (it | this) need a prescription", "do you need a prescription [for (it | this)]",
    ] },
    ask_food: { patterns: [
      "(should | do | can) i take (@it_ref) with food #h:q_food", "can i take (@it_ref) on an empty stomach", "(before | after) (meals | eating | food) or (before | after) (meals | eating | food)",
      "do i take (it | them) (before | after | with) (meals | food | eating)", "should i eat (first | something) [before (taking | i take) it]",
      "is it (okay | fine | safe | all right) to take (it | them) on an empty stomach", "(can | should) i take (it | them) (before | after) (eating | meals | food | breakfast)",
      "is (it | this) (okay | fine | better) (with | without) food", "(with | without) food", "(do | should) i (need | have) to eat (first | before)", "(before | after) (eating | meals | food)",
      "(before | after) (food | eating | meals) or (after | before) [food | eating | meals]",
      "(should | do | can) i take (it | them) (before | after) or (after | before) (eating | meals | food)", "(should | do | can) i take (it | them) (before | after) (eating | meals | food) or (after | before) [eating | meals | food]",
    ] },
    ask_alcohol: { patterns: [
      "can i (drink | have) (alcohol | a beer | wine | a glass of wine | a drink) (with | while taking | on) (it | this | them) #h:q_alcohol", "is it (okay | safe) to drink (alcohol | with it)",
      "can i drink with (it | this)",
    ] },
    ask_kids: { patterns: [
      "is (it | this) (safe | okay | good) for (children | kids | my son | my daughter | a child | babies) #h:q_kids", "are (they | these) (safe | okay | good) for (children | kids | my son | my daughter | a child | babies) #h:q_kids", "can (children | kids | my son | my daughter | a child) take (it | this | them)",
      "do you have (it | this | something | anything) for (children | kids)", "is there a (children's | kids | kid's) version",
    ] },
    ask_side_effects: { patterns: ["(are there | does it have) any side effects", "what are the side effects", "(is it | is this) safe"] },
    ask_how_long_take: { patterns: ["how long should i take (it | them) [for]", "for how many days [should i take it]", "how many days should i take (it | them)", "until when"] },
    ask_price: { patterns: [
      "how much (is | does) (@it_ref | [the] @prod) [cost] #h:q_price", "how much (are | do) (they | these | [the] @prod) [cost] #h:q_price", "how much [is it | is that]",
      "what (does | do) (it | this | they) cost", "what is the price",
      "(is | are) (it | this | that | they | these) expensive", "how much (would | will) (it | that | they) (be | cost)", "what is the price (of | for) (it | that | this | them | [the] @prod)",
    ] },
    ask_cheaper: { patterns: [
      "(is there | do you have) (a cheaper one | anything cheaper | something cheaper | a generic [one | version] | a store brand) #h:q_cheaper", "is there a generic [version]",
      "(is | are) there (cheaper | generic) (ones | options)",
    ] },
    no_rx_paper: { patterns: ["i do not have (a | the | my) prescription [with me | here | on me]", "i (forgot | left) (my | the) prescription [at home]", "i do not have a paper prescription"] },
    ask_where: { patterns: ["where (is | are) (it | they | that | the bandaids)", "(which | what) aisle"] },
    ask_how_long_ready: { patterns: ["how long (will it | does it | is the wait) [take | be]", "how long do i (have to | need to) wait", "when will it be ready",
      "how long [exactly | more]", "how (many | much) (minutes | time)", "(is it | will it be) (long | ready soon)"] },

    // --- more, paying ----------------------------------------------------------------------------
    more_no: { patterns: [
      "(that is | that will be | that would be) (all | it | everything) #h:more_all", "[no] that is it", "nothing else", "[no] i am (good | fine | okay)", "that is all [for today]",
      "[no] just (that | the medicine | this) [please]", "[no] that is everything",
      "[no] i do not (need | want) anything (else | more) [today]", "[no] that is (all | it | everything) for (today | now)", "[no] nothing more", "[no] (this | that) is enough",
    ] },
    pay_card: { patterns: [
      "[can | could] i pay (by | with) (card | credit card | debit card | my card | credit) #h:pay_card", "(by | with) card", "card #h:pay_card_short",
      "(i will | i would like to | i am going to) pay (by | with) card", "do you (take | accept) (cards | credit cards | card | visa | mastercard)", "can i (use | tap) my card", "[a] (credit | debit) card",
      "(credit | debit | visa | mastercard)", "(can | could) i tap [my card | it | here]", "[i will | can you | could you] (put | charge) it (on | to) my [credit | debit] card", "contactless", "[by] tap [card]",
      "[can | could] i pay (by | with) (visa | mastercard | american express | amex | discover)", "card is (fine | okay | good)",
      "(is it | is that) (okay | fine | all right) if i pay (by | with) (card | credit card | debit card | my card)",
      "(i will | i want to | i would like to) (use | tap) my card", "(i will | i want to) pay (by | with) (my | a) (card | credit card | debit card)",
    ] },
    pay_cash: { patterns: ["[can | could] i pay (in | with) cash", "(in | with) cash", "cash", "(i will | i would like to | i am going to) pay (in | with) cash #h:pay_cash", "i will pay cash",
      "i have cash", "cash is (fine | okay | good)", "(i will | i want to) pay (with)? (money | dollars)", "(is it | is that) (okay | fine | all right) if i pay (in | with) cash"] },
    pay_phone: { patterns: ["(can | could) i pay (with | by) (my phone | apple pay | google pay | phone)", "do you (take | accept) (apple pay | google pay) #h:apple_pay", "apple pay", "google pay",
      "(i will | i would like to | i am going to | i want to) pay (with | by) (my phone | apple pay | google pay | phone | my watch)", "(with | by) (my phone | phone | my watch)", "(can | could) i (use | tap) my (phone | watch)"] },
    here_you_go: { patterns: ["here you (go | are) #h:here_you_go", "there you go", "here it is", "here is my card", "here is {price}", "here is (the | my) money"] },
    no_bag: { patterns: ["(i do not need | no need for) a bag", "no bag [thanks | needed]", "i (have | brought) my own bag", "i will just put it in my (bag | pocket)",
      "i am (fine | good | okay) without (one | a bag | it)", "[it is okay] i will [just] put (it | them) in my (bag | pocket | purse)", "[no] i do not need one", "i can carry (it | them)"] },
    bag_yes: { patterns: ["[yes | sure] (a | one) [small | little | paper | plastic] (bag | one)", "(can | could) i (have | get) a bag", "i would like a bag", "[yes] a bag would be (great | good | nice)"] },

    // --- prescriptions -----------------------------------------------------------------------------
    rx_pickup: { patterns: [
      "i am here to pick up (a | my) prescription #h:rx_pickup", "i (would like | need | want) to pick up (a | my) prescription", "i have a prescription to pick up #h:rx_pickup",
      "i am picking up (a | my) prescription", "[i am] (picking up | pick up) [for] [my name]", "my doctor (sent | called in | sent over) (a | my) prescription [for me] [here]",
      "i (called in | ordered) a prescription", "is my prescription ready #h:rx_ready", "(i would like | can i) pick up my (prescription | medicine | medication)",
      "i am here for my prescription",
      "i (came | have come | am here) (to pick up | to get | for) my (prescription | medicine | medication | meds | pills)", "is (it | my medicine | my medication | the prescription) ready [yet]",
      "i (came | am here) to pick up (a | the) prescription", "(pick up | pickup) (for | under) (my name | {name})", "i have (a | my) prescription (waiting | ready) [here]",
    ] },
    rx_dropoff: { patterns: [
      "i have a prescription [from my doctor] #h:rx_have", "i (would like | need | want) to (fill | drop off) (a | this | my) prescription", "(can | could) you fill (this | my) prescription",
      "i got a prescription from (my | the) doctor", "here is my prescription", "(can | could) i drop off a prescription", "i have a prescription for (antibiotics | an antibiotic)",
    ] },
    name_ctx: { patterns: [
      "[it is | my last name is | the last name is | last name] {name} #h:rx_lastname", "(my name is | it is) {name}", "[it is] under {name}",
      "(my | the) (surname | family name | last name) is {name}", "(surname | family name) [is] {name}", "the name is {name}", "it (should be | is | might be) under [the name] {name}",
      "(it is)? (for | under) [the name] {name}", "[it is] under my name {name}", "[it is] (for | under) my name",
    ] },
    letters_ctx: { patterns: ["[it is | sure | yes] {letters} #h:rx_spell_it", "(it is spelled | that is | it is spelt) {letters}", "{letters} [that is it]"] },
    spell_ctx: { patterns: ["[it is | sure | yes] {s1:letters} {s2:letters} [{s3:letters}] #h:rx_spell_it"] },
    dob: { patterns: [
      "[it is | my date of birth is | i was born on | born on] {date} [{year}] #h:rx_dob", "[the] {date} {year}", "[it is] {day_n:number} {date} {year}",
      "[it is] {year} [on]? {date}", "[i was] born in {year} [on] {date}", "my (birthday | birth date | date of birth | dob) is [on] {date} [{year}]",
    ] },
    ins_no: { patterns: [
      "[no] i do not have (insurance | health insurance | any insurance | insurance here | insurance in the us) [yet] #h:ins_none", "[no] i will pay (myself | out of pocket | cash | without insurance) #h:ins_pay_myself",
      "[no] no insurance", "[no] i am paying (myself | out of pocket)", "[no] i only have travel insurance",
      "[no] no insurance [i will pay (cash | myself | by card | with card | out of pocket)]", "[no] i am not (using | going to use) (insurance | it | any insurance | my insurance) [today | this time]",
      "[no] i do not have (american | us | health | medical | any | local | an american) insurance [here]", "[no] (i am | we are) (a tourist | tourists | visiting | on vacation | here on vacation | from lithuania | from europe)",
      "[no] (i will | i am going to) pay (for it | the full price | full price) [myself]", "[no] not (today | this time) i will pay (myself | cash | by card)", "[no] i do not have it (with me | here)",
      "[no] my insurance is (in | from) (lithuania | europe | my country | home)", "[no] my insurance (only)? works in (lithuania | europe)", "[no] (my insurance is | i (only)? have) (european | lithuanian | foreign | eu) [health] insurance",
    ] },
    ins_yes: { patterns: ["[yes] here is my (insurance card | card | insurance) #h:ins_card", "[yes] i have insurance", "[yes] i have (health | dental) insurance",
      "[yes] i do [have (it | insurance)] [here is (my | the) (insurance card | card | insurance)]", "[yes] here is (the | my) (insurance card | card | insurance)", "[yes] i have (health | medical) insurance (through | from) (work | my job | my employer)",
      "[yes] i (will | would like to) use (it | my insurance | insurance)", "[yes] (i have | i am on) my (husband's | wife's | company) insurance"] },
    wait_yes: { patterns: ["[sure | yes | okay] i (will | can) wait #h:wait_yes", "[yes] i do not mind waiting", "no problem i will wait", "i will wait here #h:wait_here", "[sure] i will have a seat",
      "(ten minutes | that | it) is (fine | okay | no problem | not long | not a problem)", "i will wait (over there | there | outside | in the car | a bit)", "[sure] i (can | will) wait (ten minutes | a bit | a few minutes)",
      "[okay] i will (sit | stay) (here | down)", "[sure] i am not in a hurry"] },
    wait_no: { patterns: ["[no] i will come back (later | tomorrow | in (an hour | a bit | a while | {n:number} minutes | half an hour)) #h:wait_later", "i can not wait", "[no] i will pick it up later", "i will be back (later | soon | in {n:number} minutes)",
      "(can | could) i come back (later | tomorrow | tonight | this afternoon | in (an hour | a bit | a while | {n:number} minutes))", "[no] i will pick (it | them) up (later | tomorrow | tonight | this afternoon | this evening)",
      "[no] i will come (back)? (later | tomorrow | tonight | this afternoon | this evening)", "i will (go shopping | do some shopping | get a coffee) and come back", "[no] i (do not have | have no) time [to wait]",
      "[no] i am in a hurry"] },
    first_time: { patterns: ["[yes] (it is | this is) my first time #h:first_yes", "[yes] i have never taken (it | this) [before]", "[yes] first time",
      "[no] never [before]", "[no] i (never | have never) (took | taken | take | used | use | tried) (it | this | them) [before]",
      "[no] i (have not | did not) (take | taken | took | use | used | try | tried) (it | this | them) [before]", "[no] (this is | it is) the first time", "[yes] (the | my) first time [taking it]"] },
    not_first: { patterns: [
      "[no] i have taken (it | this | them) before #h:dose_before #h:first_no", "[no] i took (it | this | them) before", "[no] i have used (it | this | them) before #h:dose_before", "[no] i used (it | this | them) before", "[yes] i know how to take (it | them)", "[no] not my first time", "[no] i have had it before",
      "[yes] i have [before | taken it before]", "yes i have [taken it]", "[yes] many times", "[yes] i use it all the time",
      "[yes] i have (used | taken | had) (it | this | them) (many times | a lot | lots of times | often | a few times)", "[yes] i (take | use | took | used) (it | them) (often | all the time | sometimes | regularly | a lot | every time | before)",
      "[yes] i (know | remember) how (to take | to use) (it | them | this)", "[yes] i (take | use) (it | them) (at home | every time i have a headache)",
    ] },
    // "Yes, I know." to "Do you know how to take it?"
    know_ctx: { patterns: ["[yes] i know [it | that | this one | how | the dose]", "[yes] i know [it | this] (already | well)"] },
    // "No, everything is clear." to "Do you have any questions for me?"
    no_questions: { patterns: [
      "[no] (everything | it | all | that) is (clear | understood) [now]", "[no] [i have] no [more | other] questions", "[no] i do not have (any | any more | any other) questions",
      "[no] i understand everything", "[no] (it is | that is) all clear", "[no] (you | it) (explained | was) (everything | clear | very clear)",
    ] },
    thanks_help: { patterns: ["(thanks | thank you) for (the advice | your advice | explaining | the tip)", "that is (very | really) helpful"] },
    // "Thanks, I will." to "…please see a doctor."
    will_do_ctx: { patterns: ["[okay | yes | sure | thanks | thank you] i will [do that | see a doctor | thanks | thank you]", "will do", "[thanks | thank you] i hope so [too]"] },
    // "Can you help me?" / "I have a question." / "Just one." (to "Any questions?"): the NPC invites the question
    help_me: { patterns: [
      "(can | could) you help me [please | with something]", "i need [some | your] help [please]", "[yes] i have a question", "[yes] (just | only)? one [more] (question | thing)",
      "[yes] (just | only) one [more]", "(can | could | may) i ask (you)? (a question | something)",
    ] },
  },

  lines: {
    // --- greetings -------------------------------------------------------------------------
    greet: [
      t("Hi there! | How | can | I | help | you | today?", "Sveiki! | Kaip | galiu | aš | padėti | jums | šiandien?", "Sveiki! Kuo šiandien galiu padėti?"),
      t("Hello! | What | can | I | do | for you?", "Laba diena! | Ką | galiu | aš | padaryti | jums?", "Laba diena! Kuo galiu padėti?"),
      t("Hi! | What | brings | you | in | today?", "Sveiki! | Kas | atveda | jus | — | šiandien?", "Sveiki! Kas jus šiandien atvedė?",
        { flags: { 4: "“in” (bring you in): the prefix at- of atveda carries it (linked to “brings”)." } }),
    ],
    greet_back: [
      t("Hi, | nice | to see | you | again! | What | can | I | do | for you | today?", "Sveiki, | malonu | matyti | jus | vėl! | Ką | galiu | aš | padaryti | jums | šiandien?", "Sveiki, malonu vėl jus matyti! Kuo šiandien galiu padėti?"),
    ],
    greet_back_hi: [t("Hi, | nice | to see | you | again!", "Sveiki, | malonu | matyti | jus | vėl!", "Sveiki, malonu vėl jus matyti!")],
    greet_howareyou: [
      t("Hi there! | How | are | you | today?", "Sveiki! | Kaip | sekasi | jums | šiandien?", "Sveiki! Kaip jums šiandien sekasi?"),
    ],
    ask_need: [
      t("What | can | I | do | for you?", "Ką | galiu | aš | padaryti | jums?", "Kuo galiu padėti?"),
      t("How | can | I | help | you?", "Kaip | galiu | aš | padėti | jums?", "Kuo galiu padėti?"),
    ],
    rx_prompt: [
      t("Are | you | here | to pick up | a | prescription?", "Ar esate | jūs | čia | atsiimti | — | vaistų pagal receptą?", "Atėjote atsiimti vaistų pagal receptą?",
        { flags: { 0: "“Are” in a yes/no question = the particle ar + esate." } }),
    ],
    sorry_symptom: [
      t("Oh, | I'm | sorry | to hear | that.", "O, | man | gaila | girdėti | tai.", "O, gaila tai girdėti."),
      t("Oh | no! | Let's see | what | we | can | do.", "O | ne! | Pažiūrėkime, | ką | mes | galime | padaryti.", "O ne! Pažiūrėkime, ką galime padaryti."),
    ],
    ask_symptoms: [
      t("I'm | sorry | to hear | that. | What | are | your | symptoms?", "Man | gaila | girdėti | tai. | Kokie | yra | jūsų | simptomai?", "Gaila tai girdėti. Kokie jūsų simptomai?"),
    ],
    ack: [t("Okay.", "Gerai.", "Gerai."), t("Got it.", "Supratau.", "Supratau."), t("I see.", "Aišku.", "Aišku.")],
    ask_meds_which: [t("What | are | you | taking?", "Ką | — | jūs | vartojate?", "Ką vartojate?", { flags: { 1: "Progressive “are” has no Lithuanian word (linked to “taking”)." } })],
    ask_allergy_which: [t("What | are | you | allergic | to?", "Kam | esate | jūs | {m:alergiškas|f:alergiška} | —?", "Kam esate {m:alergiškas|f:alergiška}?",
      { flags: { 4: "Stranded “to”: the dative Kam already carries it." } })],
    what_else: [t("Sure! | What | else | do | you | need?", "Žinoma! | Ko | dar | — | jums | reikia?", "Žinoma! Ko dar reikia?", { flags: { 3: "Question “do” has no Lithuanian word (linked to “need”)." } })],
    go_ahead: [t("Sure, | go ahead.", "Žinoma, | klauskite.", "Žinoma, klauskite.")],
    cheaper_none: [t("Sorry, | there's | no | cheaper | option.", "Atsiprašau, | nėra | jokio | pigesnio | varianto.", "Atsiprašau, pigesnio varianto nėra.",
      { flags: { 1: "Negative concord: “there's … no” → nėra (ne- comes from the negation, linked to “no”)." } })],

    // --- questions -----------------------------------------------------------------------------
    ask_who: [
      t("Is | it | for you?", "Ar | tai | jums?", "Ar tai jums?", { flags: { 0: "“Is” in a question = the particle ar; Lithuanian needs no copula here." } }),
      t("Is | this | for you | or | for | someone | else?", "Ar | tai | jums, | ar | — | kam nors | kitam?", "Ar tai jums, ar kam nors kitam?",
        { flags: { 0: "“Is” in a question = the particle ar.", 4: "“for” has no separate word: the dative kam nors kitam carries it." } }),
    ],
    ask_who_q: [t("Who's | it | for?", "Kam | tai | —?", "Kam tai?", { flags: { 2: "Stranded “for”: the dative Kam already carries it." } })],
    ask_age: [t("How | old | is | your | child?", "Kiek | metų | yra | jūsų | vaikui?", "Kiek metų jūsų vaikui?")],
    ask_howlong: [
      t("How | long | have | you | had | it?", "Kiek | laiko | — | jūs | turite | tai?", "Kiek laiko tai tęsiasi?",
        { flags: { 2: "Perfect “have” has no separate word: Lithuanian uses the present for a state that still goes on (linked to “had”)." } }),
      t("When | did | it | start?", "Kada | — | tai | prasidėjo?", "Kada tai prasidėjo?", { flags: { 1: "Question “did” has no Lithuanian word; the past tense sits on prasidėjo." } }),
    ],
    ok: [t("Okay.", "Gerai.", "Gerai."), t("Great.", "Puiku.", "Puiku.")],
    no_rx_ok: [t("That's | okay. | You | don't need | one | for this.", "Tai | gerai. | Jums | nereikia | jo | tam.", "Nieko tokio, tam recepto nereikia.",
      { flags: { 4: "“one” = a prescription (receptas), genitive of negation jo." } })],
    rx_electronic: [t("That's | okay, | your | doctor | sent | it | to us | electronically.", "Tai | gerai, | jūsų | gydytojas | atsiuntė | jį | mums | elektroniniu būdu.",
      "Nieko tokio, jūsų gydytojas atsiuntė jį mums elektroniniu būdu.")],
    dose_first: [t("Let's find | the | right | medicine | first.", "Raskime | — | tinkamus | vaistus | pirmiausia.", "Pirmiausia raskime tinkamus vaistus.")],
    depends: [t("It | depends | on | the | medicine.", "Tai | priklauso | nuo | — | vaistų.", "Priklauso nuo vaistų.")],
    ask_meds_which_other: [t("Which | medications?", "Kokius | vaistus?", "Kokius vaistus?")],
    ask_when: [t("When | did | it | start?", "Kada | — | tai | prasidėjo?", "Kada tai prasidėjo?", { flags: { 1: "Question “did” has no Lithuanian word; the past tense sits on prasidėjo." } })],
    ask_meds_other: [t("Any | other | medications?", "Kokių nors | kitų | vaistų?", "Ar vartoja kitų vaistų?")],
    ask_allergy_other: [t("Any | allergies | to | medications?", "Kokių nors | alergijų | — | vaistams?", "Ar yra alergijų vaistams?",
      { flags: { 3: "“to” has no separate word: the dative vaistams carries it." } })],
    dose_just_so: [t("Just | so | you | know:", "Tiesiog, | kad | jūs | žinotumėte:", "Kad žinotumėte:",
      { flags: { 1: "“so” (so that) = kad; the subjunctive žinotumėte follows." } })],
    ask_meds: [
      t("Are | you | taking | any | other | medications?", "Ar | jūs | vartojate | — | kitų | vaistų?", "Ar vartojate kitų vaistų?",
        { flags: { 0: "“Are” in a yes/no question = the particle ar; vartojate carries the progressive (linked to “taking”).", 3: "Partitive: the genitive kitų vaistų carries “any”." } }),
    ],
    ask_allergy: [
      t("Are | you | allergic | to | any | medications?", "Ar esate | jūs | {m:alergiškas|f:alergiška} | — | kokiems nors | vaistams?", "Ar esate {m:alergiškas|f:alergiška} kokiems nors vaistams?",
        { flags: { 0: "“Are” in a yes/no question = the particle ar + esate.", 3: "“to” has no separate word: the dative vaistams carries it." } }),
      t("Do | you | have | any | allergies?", "Ar | jūs | turite | — | alergijų?", "Ar turite alergijų?", { flags: { 0: FLAG_DO, 3: "Partitive: the genitive alergijų carries “any”." } }),
    ],
    ask_questions: [
      t("Do | you | know | how | to take | it?", "Ar | jūs | žinote, | kaip | vartoti | {jis@X:acc}?", "Ar žinote, kaip vartoti?", { flags: { 0: FLAG_DO } }),
      t("Have | you | taken | it | before?", "Ar | jūs | vartojote | {jis@X:acc} | anksčiau?", "Ar anksčiau vartojote?", { flags: { 0: "“Have” in a yes/no question = the particle ar; the past vartojote carries the perfect." } }),
    ],
    ask_questions_pl: [
      t("Do | you | know | how | to take | them?", "Ar | jūs | žinote, | kaip | vartoti | {jis@X:acc}?", "Ar žinote, kaip vartoti?", { flags: { 0: FLAG_DO } }),
      t("Have | you | taken | them | before?", "Ar | jūs | vartojote | {jis@X:acc} | anksčiau?", "Ar anksčiau vartojote?", { flags: { 0: "“Have” in a yes/no question = the particle ar; the past vartojote carries the perfect." } }),
    ],
    ask_more: [
      t("Can | I | get | you | anything | else?", "Ar galiu | aš | paduoti | jums | ką nors | daugiau?", "Ar dar ko nors reikia?"),
      t("Anything | else | today?", "Ką nors | daugiau | šiandien?", "Dar ko nors šiandien?"),
    ],

    // --- recommendation ----------------------------------------------------------------------
    rec: [
      t("I'd recommend | {X}.", "Rekomenduočiau | {X:acc}.", "Rekomenduočiau {X:acc}."),
      t("For | that, | {X} | works | really | well.", "Nuo | to | {X:nom} | veikia | tikrai | gerai.", "Nuo to {X:nom} tikrai gerai padeda."),
    ],
    rec_pl: [
      t("I'd recommend | {X}.", "Rekomenduočiau | {X:acc}.", "Rekomenduočiau {X:acc}."),
      t("For | that, | {X} | work | really | well.", "Nuo | to | {X:nom} | veikia | tikrai | gerai.", "Nuo to {X:nom} tikrai gerai padeda."),
    ],
    rec_try: [
      t("Would | you | like | to try | that?", "Ar | jūs | norėtumėte | pabandyti | tai?", "Ar norėtumėte pabandyti?", { flags: { 0: FLAG_WOULD } }),
      t("Do | you | want | to try | it?", "Ar | jūs | norite | pabandyti | {jis@X:acc}?", "Norite pabandyti?", { flags: { 0: FLAG_DO } }),
    ],
    rec_try_pl: [
      t("Would | you | like | to try | them?", "Ar | jūs | norėtumėte | pabandyti | {jis@X:acc}?", "Ar norėtumėte pabandyti?", { flags: { 0: FLAG_WOULD } }),
      t("Do | you | want | to try | them?", "Ar | jūs | norite | pabandyti | {jis@X:acc}?", "Norite pabandyti?", { flags: { 0: FLAG_DO } }),
    ],
    rec_alt: [t("We | also | have | {X}.", "Mes | taip pat | turime | {X:gen}.", "Turime ir {X:gen}.")],
    rec_alt_q: [t("Would | that | be | better?", "Ar | tai | būtų | geriau?", "Ar tai būtų geriau?", { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on būtų (linked to “be”)." } })],
    rec_none: [t("Okay. | If | you | change | your | mind, | just | let me know.", "Gerai. | Jei | jūs | pakeisite | savo | nuomonę, | tiesiog | pasakykite.", "Gerai. Jei apsigalvosite, tiesiog pasakykite.")],
    switch_aceta: [
      t("Then | I'd recommend | acetaminophen | instead.", "Tada | rekomenduočiau | paracetamolį | vietoj to.", "Tada vietoj to rekomenduočiau paracetamolį."),
    ],
    nsaid_reason: [t("Ibuprofen | can | cause | a | reaction | too.", "Ibuprofenas | gali | sukelti | — | reakciją | irgi.", "Ibuprofenas irgi gali sukelti reakciją.")],
    bp_reason: [t("With | your | medication, | acetaminophen | is | safer.", "Su | jūsų | vaistais | paracetamolis | yra | saugesnis.", "Vartojant jūsų vaistus, paracetamolis saugesnis.")],
    allergy_ok: [t("Okay, | that's | fine | for | this | medicine.", "Gerai, | tai | tinka | — | šiems | vaistams.", "Gerai, šiems vaistams tai netrukdo.",
      { flags: { 3: "“for” has no separate word: the dative šiems vaistams carries it." } })],
    pen_ok: [t("Don't worry, | it's | not | penicillin.", "Nesijaudinkite, | tai | ne | penicilinas.", "Nesijaudinkite, tai ne penicilinas.")],
    meds_ok: [t("Okay, | that | shouldn't be | a | problem.", "Gerai, | tai | neturėtų būti | — | problema.", "Gerai, tai neturėtų būti problema.")],
    kids_formula: [t("For kids, | we | have | a | liquid | version.", "Vaikams | mes | turime | — | skystą | formą.", "Vaikams turime skystos formos vaistų.")],
    long_time: [
      t("Hmm, | that's | quite | a | while.", "Hmm, | tai yra | gana | — | ilgai.", "Hmm, tai gana ilgai."),
    ],
    see_doctor_soon: [
      t("I'd recommend | seeing | a | doctor | soon.", "Rekomenduočiau | apsilankyti pas | — | gydytoją | netrukus.", "Rekomenduočiau netrukus apsilankyti pas gydytoją."),
    ],
    rec_fornow: [t("But | for now, | {X} | should | help.", "Bet | kol kas | {X:nom} | turėtų | padėti.", "Bet kol kas turėtų padėti {X:nom}.")],
    here_it_is: [
      t("Here | you | go.", "Štai | jums | —.", "Prašom.", { flags: { 2: "“go” (here you go): no word; Štai jums hands it over." } }),
      t("Here | it | is.", "Štai | {jis@X:nom} | —.", "Štai.", { flags: { 2: "“is” (here it is): no word; štai presents it." } }),
    ],
    here_it_is_pl: [
      t("Here | you | go.", "Štai | jums | —.", "Prašom.", { flags: { 2: "“go” (here you go): no word; Štai jums hands it over." } }),
      t("Here | they | are.", "Štai | {jis@X:nom} | —.", "Štai.", { flags: { 2: "“are” (here they are): no word; štai presents them." } }),
    ],
    out_advil: [t("We're out of | Advil | right now.", "Mums baigėsi | „Advil“ | šiuo metu.", "Šiuo metu „Advil“ baigėsi.")],
    out_tylenol: [t("We're out of | Tylenol | right now.", "Mums baigėsi | „Tylenol“ | šiuo metu.", "Šiuo metu „Tylenol“ baigėsi.")],
    store_brand: [
      t("But | this | is | our | store | brand. | It's | the | same | medicine, | just | cheaper.", "Bet | tai | yra | mūsų | parduotuvės | prekės ženklas. | Tai yra | — | tie patys | vaistai, | tik | pigesni.",
        "Bet štai mūsų vaistinės prekės ženklas – tie patys vaistai, tik pigesni."),
    ],
    product_ok: [t("Sure!", "Žinoma!", "Žinoma!"), t("Of course.", "Žinoma.", "Žinoma."), t("Absolutely.", "Žinoma.", "Be abejo.")],
    unknown_product: [
      t("I'm | sorry, | we | don't have | that.", "Man | gaila, | mes | neturime | to.", "Deja, to neturime."),
    ],
    where_it_is: [t("Right | over | there, | by | the | door.", "Tiesiai | — | ten, | prie | — | durų.", "Štai ten, prie durų.", { flags: { 1: "“over” (over there): no separate word; ten carries the direction." } })],
    grab_it: [t("But | I | can | grab | it | for you.", "Bet | aš | galiu | paimti | {jis@X:acc} | jums.", "Bet galiu jums paduoti.")],

    // --- dosage --------------------------------------------------------------------------------
    dose_ibuprofen: [t("Take | one | or | two | tablets | every | six | hours, | with | food.", "Gerkite | vieną | ar | dvi | tabletes | kas | šešias | valandas, | su | maistu.",
      "Gerkite po vieną ar dvi tabletes kas šešias valandas, valgio metu.")],
    dose_two_six: [t("Take | two | tablets | every | six | hours.", "Gerkite | dvi | tabletes | kas | šešias | valandas.", "Gerkite po dvi tabletes kas šešias valandas.")],
    max_six: [t("Don't take | more | than | six | a | day.", "Negerkite | daugiau | nei | šešių | per | dieną.", "Per dieną negerkite daugiau nei šešių.", { flags: { 4: FLAG_PER } })],
    max_ten: [t("No | more | than | ten | a | day.", "Ne | daugiau | nei | dešimt | per | dieną.", "Ne daugiau nei dešimt per dieną.", { flags: { 4: "“a” here means “per”." } })],
    dose_syrup: [t("Take | two | teaspoons | every | four | hours.", "Gerkite | du | arbatinius šaukštelius | kas | keturias | valandas.", "Gerkite po du arbatinius šaukštelius kas keturias valandas.")],
    syrup_cup: [t("There's | a | measuring | cup | in the box.", "Yra | — | matavimo | puodelis | dėžutėje.", "Dėžutėje yra matavimo puodelis.")],
    dose_lozenges: [t("Let | one | dissolve | slowly | in | your | mouth.", "Leiskite | vienai | ištirpti | lėtai | — | savo | burnoje.", "Lėtai čiulpkite po vieną pastilę.",
      { flags: { 4: "“in” has no separate word: the locative burnoje carries it (a possessive intervenes)." } })],
    dose_lozenges_2: [t("You | can | have | one | every | two | hours.", "Jūs | galite | vartoti | vieną | kas | dvi | valandas.", "Galite vartoti po vieną kas dvi valandas.")],
    cold_drowsy: [t("They | might | make | you | drowsy, | so | don't drive.", "Jie | gali | sukelti | jums | mieguistumą, | tad | nevairuokite.", "Nuo jų gali apimti mieguistumas, tad nevairuokite.",
      { flags: { 0: "“They” = the tablets (Lithuanian vaistai, plural)." } })],
    dose_allergy: [t("Take | one | tablet | once | a | day.", "Gerkite | vieną | tabletę | kartą | per | dieną.", "Gerkite po vieną tabletę kartą per dieną.", { flags: { 4: "“a” here means “per”." } })],
    allergy_nondrowsy: [t("They | won't make | you | drowsy.", "Jie | nesukels | jums | mieguistumo.", "Nuo jų nebus mieguista.")],
    dose_antacid: [t("Chew | two | tablets | when | you | need | them.", "Sukramtykite | dvi | tabletes, | kai | jums | reikia | jų.", "Sukramtykite dvi tabletes, kai prireikia.")],
    dose_aloe: [t("Put | it | on | the | burn | two | or | three | times | a | day.", "Tepkite | jį | ant | — | nudegimo | du | ar | tris | kartus | per | dieną.", "Tepkite ant nudegusios vietos du ar tris kartus per dieną.",
      { flags: { 9: "“a” here means “per”." } })],
    drink_water: [t("And | drink | lots | of water.", "Ir | gerkite | daug | vandens.", "Ir gerkite daug vandens.")],
    dose_sunscreen: [t("Put | it | on | fifteen | minutes | before | you | go out.", "Tepkite | jį | — | penkiolika | minučių | prieš | jums | išeinant.", "Tepkitės penkiolika minučių prieš išeidami į lauką.",
      { flags: { 2: "Discontinuous “put … on”: tepkite already means “put it on” (linked to “Put”)." } })],
    dose_sunscreen_2: [t("And | again | every | two | hours.", "Ir | vėl | kas | dvi | valandas.", "Ir pakartokite kas dvi valandas.")],
    dose_vitamins: [t("One | a | day, | with | breakfast.", "Vieną | per | dieną, | su | pusryčiais.", "Po vieną per dieną, per pusryčius.", { flags: { 1: "“a” here means “per”." } })],
    no_dose: [t("Just | follow | the | directions | on | the | box.", "Tiesiog | laikykitės | — | nurodymų | ant | — | dėžutės.", "Tiesiog laikykitės nurodymų ant dėžutės.")],
    kids_dose: [t("For kids, | the | dose | depends | on | weight. | It's | on | the | box.", "Vaikams | — | dozė | priklauso | nuo | svorio. | Ji yra | ant | — | dėžutės.",
      "Vaikams dozė priklauso nuo svorio – ji nurodyta ant dėžutės.")],
    kids_cup: [t("Use | the | little | cup | in the box.", "Naudokite | — | mažą | puodelį | dėžutėje.", "Naudokite dėžutėje esantį mažą puodelį.")],
    dose_reminder: [t("Great. | Just | a | reminder:", "Puiku. | Tik | — | priminimas:", "Puiku. Tik primenu:")],
    dose_rx: [t("Take | one | capsule | three | times | a | day, | with | food.", "Gerkite | vieną | kapsulę | tris | kartus | per | dieną, | su | maistu.", "Gerkite po vieną kapsulę tris kartus per dieną, valgio metu.",
      { flags: { 5: "“a” here means “per”." } })],
    dose_rx_days: [t("Take | them | for | seven | days.", "Gerkite | juos | — | septynias | dienas.", "Gerkite septynias dienas.",
      { flags: { 2: "“for” (duration) has no separate word: the accusative septynias dienas carries it (a numeral intervenes)." } })],
    dose_rx_finish: [t("And | finish | all | of | them, | even | if | you | feel | better.", "Ir | išgerkite | visus | — | juos, | net | jei | jūs | jausitės | geriau.", "Ir išgerkite visą kursą, net jei pasijusite geriau.",
      { flags: { 3: "“of” (all of them) has no separate word: visus juos." } })],

    // --- answers to questions -------------------------------------------------------------
    drowsy_no: [t("No, | it | shouldn't make | you | drowsy.", "Ne, | {jis@X:nom} | neturėtų sukelti | jums | mieguistumo.", "Ne, nuo {jis@X:gen} neturėtų būti mieguista.")],
    drowsy_no_pl: [t("No, | they | shouldn't make | you | drowsy.", "Ne, | {jis@X:nom} | neturėtų sukelti | jums | mieguistumo.", "Ne, nuo {jis@X:gen} neturėtų būti mieguista.")],
    drowsy_little: [t("Just | a little, | so | be | careful | driving.", "Tik | truputį, | tad | būkite | {m:atsargus|f:atsargi} | vairuodami.", "Tik truputį, tad vairuodami būkite {m:atsargus|f:atsargi}.")],
    drowsy_yes: [t("Yes, | they | can, | so | don't drive.", "Taip, | {jis@X:nom} | gali, | tad | nevairuokite.", "Taip, gali, tad nevairuokite.",
      { flags: { 2: "Elliptical “can” (= can make you drowsy): Lithuanian keeps the verb gali." } })],
    rx_not_needed: [
      t("No, | you | can | buy | it | right here.", "Ne, | jūs | galite | nusipirkti | {jis@X:acc} | čia pat.", "Ne, galite nusipirkti čia pat."),
      t("No, | it's | over the counter.", "Ne, | {jis@X:nom} yra | {nereceptinis@X:nom}.", "Ne, {jis@X:nom} {nereceptinis@X:nom}."),
    ],
    rx_not_needed_pl: [
      t("No, | you | can | buy | them | right here.", "Ne, | jūs | galite | nusipirkti | {jis@X:acc} | čia pat.", "Ne, galite nusipirkti čia pat."),
    ],
    rx_stronger: [t("For | anything | stronger, | you'd need | a | prescription.", "— | Kam nors | stipresniam | jums reikėtų | — | recepto.", "Stipresniems vaistams reikėtų recepto.",
      { flags: { 0: "“For” has no separate word: the dative kam nors stipresniam carries it." } })],
    food_with: [t("It's | best | to take | it | with | food.", "Tai yra | geriausia | vartoti | {jis@X:acc} | su | maistu.", "Geriausia vartoti valgant.")],
    food_with_pl: [t("It's | best | to take | them | with | food.", "Tai yra | geriausia | vartoti | {jis@X:acc} | su | maistu.", "Geriausia vartoti valgant.")],
    food_any: [t("You | can | take | it | with | or | without | food.", "Jūs | galite | vartoti | {jis@X:acc} | su | ar | be | maisto.", "Galima vartoti ir valgant, ir nevalgius.")],
    food_any_pl: [t("You | can | take | them | with | or | without | food.", "Jūs | galite | vartoti | {jis@X:acc} | su | ar | be | maisto.", "Galima vartoti ir valgant, ir nevalgius.")],
    alcohol_no: [t("I | wouldn't drink | alcohol | with | it.", "Aš | negerčiau | alkoholio | su | {jis@X:ins}.", "Alkoholio geriau negerkite.")],
    alcohol_no_pl: [t("I | wouldn't drink | alcohol | with | them.", "Aš | negerčiau | alkoholio | su | {jis@X:ins}.", "Alkoholio geriau negerkite.")],
    side_effects: [t("Side effects | are | rare, | but | read | the | label.", "Šalutinis poveikis | yra | retas, | bet | perskaitykite | — | etiketę.", "Šalutinis poveikis retas, bet perskaitykite etiketę.")],
    how_long_take: [t("If | you | still | need | it | after | a few | days, | see | a | doctor.", "Jei | jums | vis dar | reikia | jo | po | kelių | dienų, | kreipkitės į | — | gydytoją.",
      "Jei po kelių dienų vis dar reikia, kreipkitės į gydytoją.")],
    kids_yes: [t("Yes, | we | have | a | children's | version.", "Taip, | mes | turime | — | vaikišką | formą.", "Taip, turime vaikams skirtą formą.")],
    price_is: [t("It's | {$price}.", "Kainuoja | {$price}.", "Kainuoja {$price}.")],
    price_is_pl: [t("They're | {$price}.", "Kainuoja | {$price}.", "Kainuoja {$price}.")],
    cheaper_yes: [t("Yes, | the | store | brand | is | cheaper. | It's | the | same | medicine.", "Taip, | — | parduotuvės | prekės ženklas | yra | pigesnis. | Tai yra | — | tie patys | vaistai.",
      "Taip, mūsų vaistinės prekės ženklas pigesnis – tai tie patys vaistai.")],
    ready_ten: [t("About | ten | minutes.", "Maždaug | dešimt | minučių.", "Maždaug dešimt minučių.")],

    // --- paying and closing -------------------------------------------------------------------
    total: [
      t("That'll be | {$total}.", "Tai bus | {$total}.", "Iš viso {$total}."),
      t("Your | total | is | {$total}.", "Jūsų | suma | yra | {$total}.", "Iš viso {$total}."),
    ],
    ask_pay_method: [t("Cash | or | card?", "Grynaisiais | ar | kortele?", "Grynaisiais ar kortele?")],
    ask_pay_how: [t("How | would | you | like | to pay?", "Kaip | — | jūs | norėtumėte | sumokėti?", "Kaip norėtumėte sumokėti?", { flags: { 1: "“would”: the conditional ending of norėtumėte carries it." } })],
    card_tap: [
      t("Sure! | Just | tap | or | insert | your | card.", "Žinoma! | Tiesiog | pridėkite | arba | įkiškite | savo | kortelę.", "Žinoma! Pridėkite arba įkiškite kortelę."),
      t("Of course. | Just | tap | it | here.", "Žinoma. | Tiesiog | pridėkite | ją | čia.", "Žinoma. Tiesiog pridėkite kortelę čia.", { flags: { 3: "“it” = the card (kortelė), hence ją." } }),
    ],
    card_later: [t("Sure, | card | is fine.", "Žinoma, | kortele | galima.", "Žinoma, galima ir kortele.")],
    phone_ok: [t("Of course! | Just | hold | your | phone | here.", "Žinoma! | Tiesiog | prilaikykite | savo | telefoną | čia.", "Žinoma! Tiesiog prilaikykite telefoną čia.")],
    cash_ok: [t("Sure, | cash | is fine.", "Žinoma, | grynaisiais | galima.", "Žinoma, galima ir grynaisiais.")],
    change_back: [t("And | here's | your | change.", "Ir | štai | jūsų | grąža.", "Štai jūsų grąža.")],
    paid: [t("Thank | you!", "Dėkoju | jums!", "Ačiū!"), t("Perfect, | thanks!", "Puiku, | ačiū!", "Puiku, ačiū!")],
    no_problem: [t("No | problem.", "Jokių | problemų.", "Jokių problemų.")],
    ask_bag: [t("Would | you | like | a | bag?", "Ar | jūs | norėtumėte | — | maišelio?", "Ar norėtumėte maišelio?", { flags: { 0: FLAG_WOULD } })],
    bag_here: [t("Here you go.", "Prašom.", "Prašom.")],
    feel_better: [
      t("Feel | better!", "Jauskitės | geriau!", "Greičiau pasveikite!"),
      t("Get well | soon!", "Pasveikite | greitai!", "Greičiau pasveikite!"),
      t("I | hope | you | feel | better | soon!", "Aš | tikiuosi, | jūs | pasijusite | geriau | greitai!", "Tikiuosi, greitai pasijusite geriau!"),
    ],
    see_doctor: [
      t("If | you | don't feel | better | in | a few | days, | please | see | a | doctor.", "Jei | jūs | nesijausite | geriau | per | kelias | dienas, | prašau, | kreipkitės į | — | gydytoją.",
        "Jei per kelias dienas nepagerės, kreipkitės į gydytoją."),
    ],
    closing_other: [t("Have | a | good | one!", "Linkiu | — | geros | dienos!", "Geros dienos!", { flags: { 3: "“one” (have a good one) = the day; Lithuanian names it, dienos." } }),
      t("Take care!", "Laikykitės!", "Laikykitės!")],
    closing_nobuy: [t("Take care!", "Laikykitės!", "Laikykitės!"), t("Have | a | good | one!", "Linkiu | — | geros | dienos!", "Geros dienos!", { flags: { 3: "“one” (have a good one) = the day; Lithuanian names it, dienos." } })],
    anything_else_help: [t("Can | I | help | you | with anything | else?", "Ar galiu | aš | padėti | jums | kuo nors | dar?", "Ar dar kuo nors galiu padėti?")],

    // --- prescriptions -------------------------------------------------------------------------
    rx_ask_name: [
      t("Sure. | What's | the | last name?", "Žinoma. | Kokia yra | — | pavardė?", "Žinoma. Kokia pavardė?"),
      t("Of course. | Can | I | have | your | last name?", "Žinoma. | Ar galiu | aš | gauti | jūsų | pavardę?", "Žinoma. Kokia jūsų pavardė?"),
    ],
    rx_ask_name_again: [t("Sorry, | what | was | the | last name?", "Atsiprašau, | kokia | buvo | — | pavardė?", "Atsiprašau, kokia pavardė?")],
    rx_ask_spell: [t("Could | you | spell | that | for me?", "Ar galėtumėte | jūs | paraidžiui pasakyti | tai | man?", "Ar galėtumėte pasakyti paraidžiui?")],
    rx_ask_dob: [
      t("And | your | date of birth?", "O | jūsų | gimimo data?", "O jūsų gimimo data?"),
      t("Great. | And | what's | your | date of birth?", "Puiku. | O | kokia yra | jūsų | gimimo data?", "Puiku. O kokia jūsų gimimo data?"),
    ],
    rx_thanks: [t("Thank | you.", "Dėkoju | jums.", "Ačiū."), t("Got it, | thanks.", "Supratau, | ačiū.", "Supratau, ačiū.")],
    rx_check: [t("Let me check…", "Pažiūrėsiu…", "Tuoj pažiūrėsiu…")],
    rx_ready_now: [t("Okay, | here | it | is.", "Gerai, | štai | jie | —.", "Gerai, štai jūsų vaistai.", { flags: { 2: "“it” = the prescription medicine (vaistai, plural).", 3: "“is” (here it is): no word; štai presents it." } })],
    rx_ten_min: [t("It'll be | ready | in | about | ten | minutes.", "Jie bus | paruošti | po | maždaug | dešimties | minučių.", "Bus paruošta maždaug po dešimties minučių.",
      { flags: { 0: "“It” = the prescription medicine (vaistai, plural), hence Jie." } })],
    rx_wait_q: [t("Would | you | like | to wait?", "Ar | jūs | norėtumėte | palaukti?", "Ar palauksite?", { flags: { 0: FLAG_WOULD } })],
    rx_wait_ok: [t("Great. | Have a seat, | and | I'll call | you.", "Puiku. | Prisėskite, | ir | pakviesiu | jus.", "Puiku. Prisėskite, aš jus pakviesiu.")],
    rx_ready_later: [t("Okay, | your | prescription | is | ready!", "Gerai, | jūsų | vaistai | yra | paruošti!", "Gerai, jūsų vaistai paruošti!")],
    rx_later_ok: [t("No | problem. | It'll be | ready | when | you | come back.", "Jokių | problemų. | Jie bus | paruošti, | kai | jūs | grįšite.", "Jokių problemų, bus paruošta, kai grįšite.")],
    rx_dropoff_ok: [t("Sure, | I | can | fill | that | for you.", "Žinoma, | aš | galiu | paruošti | tai | jums.", "Žinoma, galiu paruošti.")],
    rx_ask_ins: [
      t("Do | you | have | insurance?", "Ar | jūs | turite | draudimą?", "Ar turite sveikatos draudimą?", { flags: { 0: FLAG_DO } }),
      t("Will | you | be | using | insurance | today?", "Ar | jūs | — | naudosite | draudimą | šiandien?", "Ar šiandien naudosite draudimą?",
        { flags: { 0: "“Will” in a yes/no question = the particle ar; the future naudosite carries it.", 2: "Progressive “be” has no Lithuanian word (linked to “using”)." } }),
    ],
    rx_no_ins: [t("No | problem. | Without | insurance, | it's | {$price}.", "Jokių | problemų. | Be | draudimo | kainuoja | {$price}.", "Jokių problemų. Be draudimo – {$price}.")],
    rx_ins_ok: [t("Thanks. | Your | copay | is | {$price}.", "Ačiū. | Jūsų | priemoka | yra | {$price}.", "Ačiū. Jūsų priemoka – {$price}.")],
    rx_first_q: [t("Is | this | your | first | time | taking | it?", "Ar | tai | jūsų | pirmas | kartas | vartojant | juos?", "Ar vartojate juos pirmą kartą?",
      { flags: { 0: "“Is” in a question = the particle ar; Lithuanian needs no copula here.", 6: "“it” = the prescription medicine (vaistai, plural), hence juos." } })],
    rx_questions_q: [t("Do | you | have | any | questions | for me?", "Ar | jūs | turite | kokių nors | klausimų | man?", "Ar turite man klausimų?", { flags: { 0: FLAG_DO } })],
    rx_how: [t("Okay, | here's | how | to take | it.", "Gerai, | štai | kaip | vartoti | juos.", "Gerai, štai kaip juos vartoti.")],
    rx_same: [t("Great. | Same | as | last | time, | then.", "Puiku. | Taip pat, | kaip | praėjusį | kartą, | tada.", "Puiku. Tada viskas kaip praėjusį kartą.")],
    rx_pen: [t("Don't worry, | it's | not | penicillin, | and | your | doctor | knows | about | your | allergy.",
      "Nesijaudinkite, | tai | ne | penicilinas, | ir | jūsų | gydytojas | žino | apie | jūsų | alergiją.", "Nesijaudinkite, tai ne penicilinas, o jūsų gydytojas žino apie alergiją.")],
    rx_food: [t("Yes, | take | it | with | food.", "Taip, | gerkite | juos | su | maistu.", "Taip, gerkite valgydami.", { flags: { 2: "“it” = the prescription medicine (vaistai, plural), hence juos." } })],
    rx_drowsy_no: [t("No, | but | take | it | with | food.", "Ne, | bet | gerkite | juos | su | maistu.", "Ne, bet gerkite valgydami.")],
    rx_alcohol: [t("It's | best | to avoid | alcohol | while | you | take | it.", "Tai yra | geriausia | vengti | alkoholio, | kol | jūs | vartojate | juos.", "Kol vartojate, geriau venkite alkoholio.")],
  },

  domains: {
    price: () => [...new Set([...PRODUCTS.flatMap((e) => [e.attrs!.price, e.attrs!.store].filter(Boolean)), RX_PRICE, RX_COPAY])] as number[],
    total: () => {
      const ps = [...new Set([...PRODUCTS.flatMap((e) => [e.attrs!.price, e.attrs!.store].filter(Boolean)), RX_PRICE, RX_COPAY])] as number[];
      const out = new Set<number>(ps);
      for (let i = 0; i < ps.length; i++) for (let j = i; j < ps.length; j++) { out.add(ps[i] + ps[j]); for (let k = j; k < ps.length; k++) out.add(ps[i] + ps[j] + ps[k]); }
      return [...out];
    },
  },

  hints: {
    symptom: {
      lt: "Pasakyti, kas negerai", slot: "symptom", examples: ["headache", "sore_throat", "cough", "cold"],
      items: [
        { id: "sth_for", s: t("Do | you | have | something | for | {X.np}?", "Ar | jūs | turite | ką nors | nuo | {X.np:gen}?", "Ar turite ką nors nuo {X:gen}?", { flags: { 0: FLAG_DO } }) },
        { id: "i_have", s: t("I | have | {X.np}.", "Aš | turiu | {X.np:acc}.", "Man skauda galvą."), only: (e) => e.id === "headache" },
        { id: "body_hurts", s: t("My | head | hurts.", "Man | galvą | skauda.", "Man skauda galvą.", { flags: { 0: "“My” → dative Man: Lithuanian says “to me the head hurts”." } }), only: (e) => e.id === "headache" },
        { id: "i_have", s: t("I | have | {X.np}.", "Aš | turiu | {X.np:acc}.", "Man skauda gerklę."), only: (e) => e.id === "sore_throat" },
        { id: "i_have", s: t("I | have | {X.np}.", "Aš | turiu | {X.np:acc}.", "Mane kamuoja kosulys."), only: (e) => e.id === "cough" },
        { id: "i_have", s: t("I | have | {X.np}.", "Aš | turiu | {X.np:acc}.", "Esu {m:peršalęs|f:peršalusi}."), only: (e) => e.id === "cold" },
        { id: "i_have", s: t("I | have | {X.np}.", "Aš | turiu | {X.np:acc}.", "Karščiuoju."), only: (e) => e.id === "fever" },
        { id: "i_have", s: t("I | have | {X.np}.", "Aš | turiu | {X.np:acc}.", "Turiu alergiją."), only: (e) => e.id === "allergies" },
        { id: "i_have", s: t("I | have | {X.np}.", "Aš | turiu | {X.np:acc}.", "Man sutriko skrandis."), only: (e) => e.id === "upset_stomach" },
        { id: "i_have", s: t("I | have | {X.np}.", "Aš | turiu | {X.np:acc}.", "Nudegiau saulėje."), only: (e) => e.id === "sunburn" },
        { id: "what_take", s: t("What | can | I | take | for | {X.np}?", "Ką | galiu | aš | vartoti | nuo | {X.np:gen}?", "Ką galėčiau vartoti nuo {X:gen}?") },
        { id: "recommend_for", s: t("What | would | you | recommend | for | {X.np}?", "Ką | — | jūs | rekomenduotumėte | nuo | {X.np:gen}?", "Ką rekomenduotumėte nuo {X:gen}?",
          { flags: { 1: "“would”: the conditional ending of rekomenduotumėte carries it." } }), register: "polite" },
        { id: "body_hurts", s: t("My | throat | hurts.", "Man | gerklę | skauda.", "Man skauda gerklę.", { flags: { 0: "“My” → dative Man: Lithuanian says “to me the throat hurts”." } }), only: (e) => e.id === "sore_throat" },
        { id: "body_hurts", s: t("My | stomach | hurts.", "Man | skrandį | skauda.", "Man skauda skrandį.", { flags: { 0: "“My” → dative Man: Lithuanian says “to me the stomach hurts”." } }), only: (e) => e.id === "upset_stomach" },
      ],
    },
    product: {
      lt: "Paprašyti vaistų ar kitos prekės", slot: "product", examples: ["ibuprofen", "acetaminophen", "bandaids", "sunscreen"],
      items: [
        { id: "can_i_get", s: t("Can | I | get | {X.np}?", "Ar galiu | aš | gauti | {X.np:acc}?", "Ar galėčiau gauti {X:gen}?") },
        { id: "q_have_any", s: t("Do | you | have | any | {X}?", "Ar | jūs | turite | — | {X:gen}?", "Ar turite {X:gen}?", { flags: { 0: FLAG_DO, 3: "Partitive: the genitive carries “any”." } }) },
        { id: "id_like", s: t("I'd like | {X.np}, | please.", "Norėčiau | {X.np:gen}, | prašau.", "Norėčiau {X:gen}, prašau.") },
        { id: "box_of", s: t("A | box | of {X}, | please.", "— | Dėžutę | {X:gen}, | prašau.", "Dėžutę {X:gen}, prašau."), only: (e) => !!e.attrs?.pills || e.id === "bandaids" || e.id === "lozenges" },
        { id: "box_of", s: t("A | bottle | of {X}, | please.", "— | Butelį | {X:gen}, | prašau.", "Butelį {X:gen}, prašau."), only: (e) => e.id === "cough_syrup" || e.id === "sunscreen" },
        { id: "where_find", s: t("Where | can | I | find | {X}?", "Kur | galiu | aš | rasti | {X:acc}?", "Kur rasti {X:acc}?") },
      ],
    },
    who: {
      lt: "Pasakyti, kam vaistai",
      items: [
        { id: "who_me", s: t("It's | for me.", "Tai yra | man.", "Tai man.") },
        { id: "who_child", s: t("It's | for | my | son. | He's | six.", "Tai yra | — | mano | sūnui. | Jam yra | šešeri.", "Tai sūnui, jam šešeri.",
          { flags: { 1: "“for” has no separate word: the dative sūnui carries it (a possessive intervenes).", 5: "Age: Lithuanian uses the dative Jam + the collective numeral šešeri." } }) },
        { id: "who_wife", s: t("It's | for | my | wife.", "Tai yra | — | mano | žmonai.", "Tai žmonai.",
          { flags: { 1: "“for” has no separate word: the dative žmonai carries it (a possessive intervenes)." } }) },
      ],
    },
    howlong: {
      lt: "Pasakyti, kiek laiko tai tęsiasi",
      items: [
        { id: "since", s: t("Since | yesterday.", "Nuo | vakar.", "Nuo vakar.") },
        { id: "since", s: t("Since | this | morning.", "Nuo | šio | ryto.", "Nuo šio ryto.") },
        { id: "for_days", s: t("For | two | days.", "— | Dvi | dienas.", "Jau dvi dienas.", { flags: { 0: "“For” (duration) has no separate word: the accusative dvi dienas carries it." } }) },
        { id: "for_days", s: t("About | a | week.", "Maždaug | — | savaitę.", "Maždaug savaitę.") },
      ],
    },
    meds: {
      lt: "Pasakyti, ar vartoji kitų vaistų",
      items: [
        { id: "meds_none", s: t("No, | I'm | not taking | anything.", "Ne, | aš | nevartoju | nieko.", "Ne, nieko nevartoju.",
          { flags: { 1: "Progressive “am” has no separate word (linked to “not taking”)." } }) },
        { id: "meds_vit", s: t("Just | vitamins.", "Tik | vitaminus.", "Tik vitaminus.") },
        { id: "meds_bp", s: t("I | take | blood | pressure | pills.", "Aš | geriu | kraujo | spaudimo | tabletes.", "Geriu tabletes nuo kraujospūdžio.") },
      ],
    },
    allergy: {
      lt: "Pasakyti, ar turi alergijų",
      items: [
        { id: "allergy_none", s: t("I'm | not | allergic | to | anything.", "Aš | nesu | {m:alergiškas|f:alergiška} | — | niekam.", "Nesu {m:alergiškas|f:alergiška} niekam.",
          { flags: { 1: "Negation: nesu = ne- + esu; the “am” of I'm sits here (linked to “I'm”).", 4: "“to” has no separate word: the dative niekam carries it." } }) },
        { id: "allergy_no_any", s: t("No, | I | don't have | any | allergies.", "Ne, | aš | neturiu | jokių | alergijų.", "Ne, jokių alergijų neturiu.") },
        { id: "allergy_yes", s: t("I'm | allergic | to | aspirin.", "Aš esu | {m:alergiškas|f:alergiška} | — | aspirinui.", "Esu {m:alergiškas|f:alergiška} aspirinui.",
          { flags: { 2: "“to” has no separate word: the dative aspirinui carries it." } }) },
      ],
    },
    // Answers to "Would you like to try it?" (the recommendation)
    accept: {
      lt: "Sutikti arba paklausti daugiau", slot: "product", examples: ["ibuprofen", "lozenges", "cold_medicine", "cough_syrup"],
      items: ordered(
        hv("rec_try", "Okay, | I'll try | it.", "Okay, | I'll try | them.", "Gerai, | pabandysiu | {jis@X:acc}.", "Gerai, pabandysiu."),
        { id: "rec_good", s: t("Sounds | good, | thanks.", "Skamba | gerai, | ačiū.", "Puiku, ačiū.") },
        hv("q_price", "How much | is | it?", "How much | are | they?", "Kiek | kainuoja | {jis@X:nom}?", "Kiek kainuoja?"),
        { id: "rec_else", s: t("Do | you | have | anything | else?", "Ar | jūs | turite | ko nors | kito?", "Ar turite ko nors kito?", { flags: { 0: FLAG_DO } }) },
      ),
    },
    // "We also have acetaminophen. Would that be better?"
    alt_ans: {
      lt: "Sutikti",
      items: [
        { id: "alt_yes", s: t("Yes, | please.", "Taip, | prašau.", "Taip, prašau.") },
        { id: "alt_better", s: t("Yes, | that | would | be | better.", "Taip, | tai | — | būtų | geriau.", "Taip, taip būtų geriau.",
          { flags: { 2: "“would” has no separate word: the conditional būtų carries it (linked to “be”)." } }) },
      ],
    },
    // Answers to "Do you know how to take it?" / "Have you taken it before?"
    dose: {
      lt: "Paklausti, kaip vartoti", slot: "product", examples: ["ibuprofen", "cough_syrup", "lozenges", "allergy_medicine"],
      items: ordered(
        [...hv("dose_how", "No. | How | often | should | I | take | it?", "No. | How | often | should | I | take | them?", "Ne. | Kaip | dažnai | turėčiau | aš | vartoti | {jis@X:acc}?",
          "Ne. Kaip dažnai reikia vartoti?", {}, (e) => !e.attrs?.noDose && !e.attrs?.skin),
         { id: "dose_how", s: t("No. | How | often | should | I | put | it | on?", "Ne. | Kaip | dažnai | turėčiau | aš | tepti | jį | —?", "Ne. Kaip dažnai reikia tepti?",
          { flags: { 7: "Discontinuous “put … on”: tepti already means “put it on” (linked to “put”)." } }), only: (e) => !!e.attrs?.skin }],
        hv("q_how_many", "How | many | should | I | take?", "How | many | should | I | take?", "Kiek | — | turėčiau | aš | išgerti?", "Kiek reikia išgerti?",
          { flags: { 1: "“many” is carried by Kiek (how many)." } }, (e) => !!e.attrs?.pills),
        [...hv("dose_before", "Yes, | I've | taken | it | before.", "Yes, | I've | taken | them | before.", "Taip, | aš | vartojau | {jis@X:acc} | anksčiau.", "Taip, jau esu {m:vartojęs|f:vartojusi}.",
          { flags: { 1: "Perfect “'ve” has no separate word: the past vartojau carries it." } }, (e) => !e.attrs?.noDose && !e.attrs?.skin),
         { id: "dose_before", s: t("Yes, | I've | used | it | before.", "Taip, | aš | naudojau | {jis@X:acc} | anksčiau.", "Taip, jau esu {m:naudojęs|f:naudojusi}.",
          { flags: { 1: "Perfect “'ve” has no separate word: the past naudojau carries it." } }), only: (e) => !!e.attrs?.skin }],
      ),
    },
    // Prescription: "Is this your first time taking it?"
    rx_first: {
      lt: "Atsakyti, ar vartojai anksčiau",
      items: [
        { id: "first_yes", s: t("Yes, | it's | my | first | time.", "Taip, | tai yra | mano | pirmas | kartas.", "Taip, pirmą kartą.") },
        { id: "first_no", s: t("No, | I've | taken | it | before.", "Ne, | aš | vartojau | juos | anksčiau.", "Ne, jau esu {m:vartojęs|f:vartojusi}.",
          { flags: { 1: "Perfect “'ve” has no separate word: the past vartojau carries it.", 3: "“it” = the prescription medicine (vaistai, plural), hence juos." } }) },
      ],
    },
    // The pharmacist explained the dosage: "Do you have any questions for me?"
    questions: {
      lt: "Atsakyti, ar turi klausimų", slot: "product", examples: ["ibuprofen", "cough_syrup", "lozenges", "allergy_medicine"],
      items: ordered(
        { id: "q_none", s: t("No, | thank | you.", "Ne, | dėkoju | jums.", "Ne, ačiū.") },
        hv("q_drowsy", "Does | it | make | you | drowsy?", "Do | they | make | you | drowsy?", "Ar | {jis@X:nom} | sukelia | jums | mieguistumą?", "Ar nuo {jis@X:gen} būna mieguista?",
          { flags: { 0: "Question “Does/Do” = the particle ar." } }, (e) => !!e.attrs?.med),
        hv("q_food", "Should | I | take | it | with | food?", "Should | I | take | them | with | food?", "Ar turėčiau | aš | vartoti | {jis@X:acc} | su | maistu?", "Ar reikia vartoti valgant?", {}, (e) => !!e.attrs?.med),
        hv("q_price", "How much | is | it?", "How much | are | they?", "Kiek | kainuoja | {jis@X:nom}?", "Kiek kainuoja?"),
      ),
    },
    ask: {
      lt: "Paklausti apie vaistą", slot: "product", examples: ["ibuprofen", "cough_syrup", "lozenges", "allergy_medicine"],
      items: ordered(
        [...hv("q_how_often", "How | often | should | I | take | it?", "How | often | should | I | take | them?", "Kaip | dažnai | turėčiau | aš | vartoti | {jis@X:acc}?", "Kaip dažnai reikia vartoti?", {},
          (e) => !e.attrs?.noDose && !e.attrs?.skin),
         { id: "q_how_often", s: t("How | often | should | I | put | it | on?", "Kaip | dažnai | turėčiau | aš | tepti | jį | —?", "Kaip dažnai reikia tepti?",
          { flags: { 6: "Discontinuous “put … on”: tepti already means “put it on” (linked to “put”)." } }), only: (e) => !!e.attrs?.skin }],
        hv("q_drowsy", "Does | it | make | you | drowsy?", "Do | they | make | you | drowsy?", "Ar | {jis@X:nom} | sukelia | jums | mieguistumą?", "Ar nuo {jis@X:gen} būna mieguista?",
          { flags: { 0: "Question “Does/Do” = the particle ar." } }, (e) => !!e.attrs?.med),
        hv("q_price", "How much | is | it?", "How much | are | they?", "Kiek | kainuoja | {jis@X:nom}?", "Kiek kainuoja?"),
        hv("q_how_many", "How | many | should | I | take?", "How | many | should | I | take?", "Kiek | — | turėčiau | aš | išgerti?", "Kiek reikia išgerti?",
          { flags: { 1: "“many” is carried by Kiek (how many)." } }, (e) => !!e.attrs?.pills),
        { id: "q_need_rx", s: t("Do | I | need | a | prescription?", "Ar | man | reikia | — | recepto?", "Ar reikia recepto?", { flags: { 0: FLAG_DO } }), only: (e) => !!e.attrs?.med },
        hv("q_food", "Should | I | take | it | with | food?", "Should | I | take | them | with | food?", "Ar turėčiau | aš | vartoti | {jis@X:acc} | su | maistu?", "Ar reikia vartoti valgant?", {}, (e) => !!e.attrs?.med),
        hv("q_kids", "Is | it | safe | for | children?", "Are | they | safe | for | children?", "Ar | {jis@X:nom} | {saugus@X:nom} | — | vaikams?", "Ar tai saugu vaikams?",
          { flags: { 0: "“Is/Are” in a question = the particle ar; Lithuanian needs no copula here.", 4: "“for” has no separate word: the dative vaikams carries it." } }, (e) => !!e.attrs?.med),
        hv("q_alcohol", "Can | I | drink | alcohol | with | it?", "Can | I | drink | alcohol | with | them?", "Ar galiu | aš | gerti | alkoholį | su | {jis@X:ins}?", "Ar galima gerti alkoholį?", {}, (e) => !!e.attrs?.med),
        { id: "q_cheaper", s: t("Is | there | a | cheaper | one?", "Ar yra | — | — | pigesnių | vaistų?", "Ar yra pigesnių vaistų?",
          { flags: { 1: "Existential “there” has no Lithuanian word: yra (in Ar yra) carries it.", 4: "“one” = the medicine; the partitive genitive vaistų." } }), only: (e) => !!e.attrs?.med },
      ),
    },
    more: {
      lt: "Pasakyti, ar dar ko nors reikia", slot: "product", examples: ["bandaids", "sunscreen", "vitamins"],
      items: [
        { id: "more_all", s: t("That's | all, | thanks.", "Tai yra | viskas, | ačiū.", "Tai viskas, ačiū.") },
        { id: "q_have_any", s: t("Do | you | have | any | {X}?", "Ar | jūs | turite | — | {X:gen}?", "Ar turite {X:gen}?", { flags: { 0: FLAG_DO, 3: "Partitive: the genitive carries “any”." } }) },
        { id: "can_i_get", s: t("Can | I | get | {X.np} | too?", "Ar galiu | aš | gauti | {X.np:acc} | irgi?", "Ar galėčiau gauti ir {X:gen}?") },
      ],
    },
    rx: {
      lt: "Atsiimti vaistus pagal receptą",
      items: [
        { id: "rx_pickup", s: t("I'm | here | to pick up | a | prescription.", "Aš esu | čia | atsiimti | — | vaistų pagal receptą.", "Atėjau atsiimti vaistų pagal receptą.") },
        { id: "rx_have", s: t("I | have | a | prescription | from | my | doctor.", "Aš | turiu | — | receptą | iš | savo | gydytojo.", "Turiu gydytojo receptą.") },
        { id: "rx_ready", s: t("Is | my | prescription | ready?", "Ar | mano | vaistai pagal receptą | paruošti?", "Ar mano vaistai jau paruošti?",
          { flags: { 0: "“Is” in a question = the particle ar; Lithuanian needs no copula here." } }) },
      ],
    },
    // A returning customer: "Are you here to pick up a prescription?"
    rx_prompt: {
      lt: "Atsakyti, ar atsiimi vaistus pagal receptą",
      items: [
        { id: "rxp_yes", s: t("Yes, | that's | right.", "Taip, | tai yra | teisinga.", "Taip, teisingai.") },
        { id: "rxp_no", s: t("No, | I | have | a | headache.", "Ne, | aš | turiu | — | galvos skausmą.", "Ne, man skauda galvą.") },
      ],
    },
    // The first answers use the learner's surname (bound by the UI); the last one stands in when it is not set.
    rx_name: {
      lt: "Pasakyti savo pavardę",
      items: [
        { id: "rx_lastname", s: t("It's | {$surname}.", "Tai | {$surname}.", "{$surname}.") },
        { id: "rx_lastname", s: t("My | last name | is | {$surname}.", "Mano | pavardė | yra | {$surname}.", "Mano pavardė – {$surname}.") },
        { id: "rx_lastname", s: t("{$surname}.", "{$surname}.", "{$surname}.") },
        { id: "rx_lastname", s: t("My | last name | is | Petraitis.", "Mano | pavardė | yra | Petraitis.", "Mano pavardė – Petraitis.") },
      ],
    },
    rx_spell: {
      lt: "Pasakyti pavardę paraidžiui",
      items: [
        { id: "rx_spell_it", s: t("It's | {$letters}.", "Tai | {$letters}.", "{$letters}.", { say: "It's {$letters}." }) },
        { id: "rx_spell_it", s: t("{$letters}.", "{$letters}.", "{$letters}.", { say: "{$letters}." }) },
        { id: "rx_spell_it", s: t("Sure, | it's | {$letters}.", "Žinoma, | tai | {$letters}.", "Žinoma: {$letters}.", { say: "Sure, it's {$letters}." }) },
        { id: "rx_spell_it", s: t("It's | P-E-T-R-A-I-T-I-S.", "Tai | P-E-T-R-A-I-T-I-S.", "P-E-T-R-A-I-T-I-S.", { say: "It's P, E, T, R, A, I, T, I, S." }) },
      ],
    },
    rx_dob: {
      lt: "Pasakyti gimimo datą",
      items: [
        { id: "rx_dob", s: t("It's | June | 4th, | 1980.", "Tai | birželio | 4 d., | 1980 m.", "1980 m. birželio 4 d.", { say: "It's June fourth, nineteen eighty." }),
          note: "Amerikiečiai sako mėnesį pirma: „June 4th, 1980“." },
        { id: "rx_dob", s: t("June | 4th, | 1980.", "Birželio | 4 d., | 1980 m.", "1980 m. birželio 4 d.", { say: "June fourth, nineteen eighty." }) },
      ],
    },
    rx_ins: {
      lt: "Atsakyti apie draudimą",
      items: [
        { id: "ins_none", s: t("No, | I | don't have | insurance.", "Ne, | aš | neturiu | draudimo.", "Ne, draudimo neturiu.") },
        { id: "ins_pay_myself", s: t("I'll pay | myself.", "Sumokėsiu | {m:pats|f:pati}.", "Sumokėsiu {m:pats|f:pati}.") },
        { id: "ins_card", s: t("Yes, | here's | my | insurance | card.", "Taip, | štai | mano | draudimo | kortelė.", "Taip, štai mano draudimo kortelė.") },
      ],
    },
    rx_wait: {
      lt: "Pasakyti, kad palauksi",
      items: [
        { id: "wait_yes", s: t("Sure, | I'll wait.", "Žinoma, | palauksiu.", "Žinoma, palauksiu.") },
        { id: "wait_here", s: t("Yes, | I'll wait | here.", "Taip, | palauksiu | čia.", "Taip, palauksiu čia.") },
      ],
    },
    // Leaving instead (in the phrase list, not among the guide's model answers)
    rx_later: {
      lt: "Pasakyti, kad grįši vėliau",
      items: [
        { id: "wait_later", s: t("I'll come | back | later.", "Ateisiu | atgal | vėliau.", "Grįšiu vėliau.") },
      ],
    },
    pay: {
      lt: "Susimokėti",
      items: [
        { id: "pay_card_short", s: t("Card, | please.", "Kortele, | prašau.", "Kortele, prašau.") },
        { id: "pay_card", s: t("Can | I | pay | by card?", "Ar galiu | aš | sumokėti | kortele?", "Ar galiu sumokėti kortele?") },
        { id: "pay_cash", s: t("I'll pay | in cash.", "Sumokėsiu | grynaisiais.", "Sumokėsiu grynaisiais.") },
        { id: "apple_pay", s: t("Do | you | take | Apple Pay?", "Ar | jūs | priimate | „Apple Pay“?", "Ar priimate „Apple Pay“?", { flags: { 0: FLAG_DO } }) },
        { id: "here_you_go", s: t("Here you go.", "Prašom.", "Prašom.") },
      ],
    },
  },

  tips: {
    uk_paracetamol: { key: "uk_paracetamol", lt: "Suprasta! Amerikoje paracetamolis vadinamas „acetaminophen“ (dažnai tiesiog „Tylenol“).", better: "Can I get some acetaminophen?" },
    uk_plasters: { key: "uk_plasters", lt: "Suprasta! Amerikoje pleistrai vadinami „Band-Aids“.", better: "Do you have any Band-Aids?" },
    uk_suncream: { key: "uk_suncream", lt: "Suprasta! Amerikoje sakoma „sunscreen“.", better: "Where can I find sunscreen?" },
    uk_lozenges: { key: "uk_lozenges", lt: "Suprasta! Amerikoje sakoma „throat lozenges“ arba „cough drops“.", better: "Do you have any cough drops?" },
    uk_cough_mixture: { key: "uk_cough_mixture", lt: "Suprasta! Amerikoje sakoma „cough syrup“.", better: "Can I get some cough syrup?" },
    uk_temperature: { key: "uk_temperature", lt: "Suprasta! Amerikoje dažniau sakoma „I have a fever“.", better: "I have a fever." },
  },

  // -------------------------------------------------------------------------

  mission: [
    // over the counter
    { lt: "Pasakyk, kas negerai", optional: true, when: otcMode, done: (c) => c.s.mode !== "rx" && !!(c.s.symptom || product(c)) },
    { lt: "Atsakyk į vaistininko klausimus", optional: true,
      when: (c) => otcMode(c) && !!(c.s.askWho || c.s.askHowLong || c.s.askMeds || c.s.askAllergy) && (!!c.s.symptom || !product(c)),
      done: (c) => c.s.mode !== "rx" && !!c.s.symptom && !openQuestions(c) },
    { lt: "Išsirink vaistą", optional: true, when: otcMode, done: (c) => c.s.mode !== "rx" && !!product(c) },
    // prescription pickup
    { lt: "Pasakyk, kad atsiimi vaistus", optional: true, when: rxMode, done: (c) => c.s.mode === "rx" },
    { lt: "Pasakyk pavardę", optional: true, when: rxMode, done: (c) => c.s.mode === "rx" && !!rx(c).name && (!c.s.askSpell || !!rx(c).spelled) },
    { lt: "Pasakyk gimimo datą", optional: true, when: rxMode, done: (c) => c.s.mode === "rx" && !!rx(c).dob },
    // both
    { lt: "Paklausk, kaip vartoti", done: (c) => !!c.s.dosageGiven },
    { lt: "Atsakyk apie draudimą", optional: true, when: (c) => rxMode(c) && !!c.s.askIns, done: (c) => c.s.mode === "rx" && rx(c).insurance !== undefined },
    { lt: "Susimokėk", done: (c) => !!c.s.paid },
  ],

  steps: [
    // Over the counter
    { id: "need", when: (c) => c.s.mode !== "rx" && c.s.decision !== "none", done: (c) => !!(c.s.symptom || product(c)),
      ask: (c) => { c.s.rxOffer = false; c.say("ask_need"); },
      expects: ["need_symptom", "symptom_state", "need_product", "rx_pickup", "rx_dropoff", "feel_sick", "symptom_ctx"],
      suggest: [
        { lt: "Pasakyti, kas negerai", hint: "symptom", options: "symptom" },
        { lt: "Paprašyti konkretaus vaisto ar prekės", hint: "product", options: "product" },
        { lt: "Atsiimti vaistus pagal receptą", hint: "rx" },
      ],
      help: (c) => { c.say("ask_symptoms"); } },
    { id: "who", when: (c) => c.s.mode !== "rx" && !!c.s.symptom && c.s.askWho, done: (c) => !!c.s.forWho,
      ask: (c) => c.say("ask_who"), expects: ["who_ans"],
      suggest: [{ lt: "Pasakyti, kam vaistai", hint: "who" }, { lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
      yes: (c) => { c.s.forWho = "me"; },
      no: (c) => { askWhoFor(c); } },
    { id: "howlong", when: (c) => c.s.mode !== "rx" && !!c.s.symptom && c.s.askHowLong, done: (c) => c.s.days !== undefined,
      ask: (c) => c.say(c.s.forWho && c.s.forWho !== "me" ? "ask_when" : "ask_howlong"), expects: ["howlong_ans"],
      suggest: [{ lt: "Pasakyti, kiek laiko tai tęsiasi", hint: "howlong" }],
      help: (c) => { c.say("ask_howlong"); } },
    { id: "meds", when: (c) => c.s.mode !== "rx" && !!c.s.symptom && c.s.askMeds, done: (c) => !!c.s.meds,
      ask: (c) => c.say(c.s.forWho && c.s.forWho !== "me" ? "ask_meds_other" : "ask_meds"), expects: ["meds_ans", "meds_ctx"],
      suggest: [{ lt: "Pasakyti, ar vartoji kitų vaistų", hint: "meds" }, { lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
      yes: (c) => { c.say(c.s.forWho && c.s.forWho !== "me" ? "ask_meds_which_other" : "ask_meds_which"); c.hold(); },
      no: (c) => { c.s.meds = "none"; c.say("ack"); } },
    { id: "allergy", when: (c) => c.s.mode !== "rx" && !!c.s.symptom && c.s.askAllergy, done: (c) => !!c.s.allergy,
      ask: (c) => c.say(c.s.forWho && c.s.forWho !== "me" ? "ask_allergy_other" : "ask_allergy"), expects: ["allergy_ans", "allergy_ctx"],
      suggest: [{ lt: "Pasakyti, ar turi alergijų", hint: "allergy" }, { lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
      yes: (c) => { c.say("ask_allergy_which"); c.hold(); },
      no: (c) => { c.s.allergy = "none"; c.say("ack"); } },
    { id: "recommend", when: (c) => c.s.mode !== "rx" && !!c.s.symptom && !product(c) && c.s.decision !== "none", done: (c) => !!product(c),
      ask: (c) => {
        const p = c.s.offer ?? recommendation(c);
        c.s.offer = p;
        if (!c.s.recSaid) {
          c.s.recSaid = true;
          if (p === "acetaminophen" && REC[c.s.symptom] === "ibuprofen") {
            if (c.s.allergy === "nsaid") c.say("nsaid_reason"); else if (c.s.meds === "bp") c.say("bp_reason");
            c.say("switch_aceta");
          } else sayP(c, c.s.long ? "rec_fornow" : "rec", p);
          if (c.s.forWho === "child" && at(p).med) c.say("kids_formula");
        }
        sayP(c, "rec_try", p);
        guideFor(c, "recommend", { hint: itemHint("accept", p) }, [{ lt: "Paklausti apie vaistą", hint: itemHint("ask", p) }]);
      },
      expects: ["accept_rec", "need_product", "change_product", "other_option", "decline_rec", "ask_drowsy", "ask_rx_needed", "ask_price", "ask_kids", "ask_food", "ask_side_effects", "ask_cheaper"],
      suggest: [
        { lt: "Sutikti arba paklausti daugiau", hint: "accept", options: "product" },
        { lt: "Paklausti apie vaistą", hint: "ask", options: "product" },
      ],
      yes: (c) => { acceptOffer(c); },
      no: (c) => { declineOffer(c); } },
    { id: "dosage", when: (c) => !!product(c) && !c.s.dosageGiven && (c.s.mode !== "rx" || !!rx(c).ready), done: (c) => !!c.s.dosageGiven,
      ask: (c) => {
        c.s.dosageAsks = (c.s.dosageAsks ?? 0) + 1;
        if (c.s.dosageAsks > 2) { c.say("dose_just_so"); if (c.s.mode === "rx") c.say("dose_rx"); else giveDosage(c); c.s.dosageGiven = true; askNext(c); return; }
        if (c.s.mode === "rx") { c.say("rx_first_q"); guideFor(c, "dosage", { lt: "Atsakyti, ar vartojai anksčiau", hint: "rx_first" }, []); return; }
        if (c.s.volunteer) {
          giveDosage(c);
          c.say("rx_questions_q");
          const id = product(c)!;
          c.expect({ id: "questions_q", optional: true, hints: [itemHint("questions", id), itemHint("ask", id), "g_yesno"], expects: ["ask_dosage", "ask_drowsy", "ask_food", "ask_alcohol", "ask_kids", "ask_rx_needed", "no_questions"],
            on: { no_questions: (cc) => { cc.say("ok"); } },
            suggest: [{ lt: "Atsakyti, ar turi klausimų", hint: itemHint("questions", id) }, { lt: "Paklausti apie vaistą", hint: itemHint("ask", id) }],
            yes: (cc) => { cc.say("go_ahead"); cc.hold(); }, no: (cc) => { cc.say("ok"); } });
          return;
        }
        sayP(c, "ask_questions");
        guideFor(c, "dosage", { hint: itemHint("dose", product(c)) }, [{ lt: "Paklausti apie vaistą", hint: itemHint("ask", product(c)) }]);
      },
      expects: ["ask_dosage", "first_time", "not_first", "know_ctx", "ask_drowsy", "ask_food", "ask_alcohol", "ask_kids", "ask_how_long_take", "ask_rx_needed", "ask_side_effects"],
      suggest: [{ lt: "Paklausti, kaip vartoti", hint: "dose", options: "product" }, { lt: "Paklausti apie vaistą", hint: "ask", options: "product" }],
      // "I don't know." to "Do you know how to take it?": the directions (not "Sure, take your time.")
      help: (c) => { if (c.s.mode === "rx") c.say("rx_how"); giveDosage(c); },
      yes: (c) => {
        // "Yes, I know / I've taken it before" (or "yes, first time" to the Rx question)
        if (c.s.mode === "rx") { c.say("rx_how"); giveDosage(c); return; }
        c.say("dose_reminder");
        const id = product(c);
        if (id === "ibuprofen" || id === "acetaminophen") c.say("max_six");
        else if (id === "antacid") c.say("max_ten");
        else giveDosage(c);
        c.s.dosageGiven = true;
      },
      no: (c) => {
        if (c.s.mode === "rx") { c.say("rx_same"); c.say("dose_rx_finish"); c.s.dosageGiven = true; return; }
        giveDosage(c);
      } },
    { id: "more", when: (c) => c.s.mode !== "rx" && !!product(c) && c.s.askMore && !!c.s.dosageGiven, done: (c) => !!c.s.moreDone,
      ask: (c) => c.say("ask_more"), expects: ["more_no", "need_product"],
      suggest: [{ lt: "Pasakyti, ar dar ko nors reikia", hint: "more", options: "product" }, { lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
      yes: (c) => { c.say("what_else"); c.hold(); },
      no: (c) => { c.s.moreDone = true; } },

    // Prescription pickup
    { id: "rx_name", when: (c) => c.s.mode === "rx", done: (c) => !!rx(c).name,
      ask: (c) => c.say(c.s.nameAsked ? "rx_ask_name_again" : "rx_ask_name"), expects: ["name_ctx", "spell_ctx"],
      suggest: [{ lt: "Pasakyti savo pavardę", hint: "rx_name" }] },
    { id: "rx_spell", when: (c) => c.s.mode === "rx" && !!rx(c).name && c.s.askSpell, done: (c) => !!rx(c).spelled,
      ask: (c) => c.say("rx_ask_spell"), expects: ["letters_ctx", "spell_ctx"],
      suggest: [{ lt: "Pasakyti pavardę paraidžiui", hint: "rx_spell" }] },
    { id: "rx_dob", when: (c) => c.s.mode === "rx" && !!rx(c).name, done: (c) => !!rx(c).dob,
      ask: (c) => c.say("rx_ask_dob"), expects: ["dob"],
      suggest: [{ lt: "Pasakyti gimimo datą", hint: "rx_dob" }] },
    { id: "rx_ins", when: (c) => c.s.mode === "rx" && !!rx(c).ready && c.s.askIns, done: (c) => rx(c).insurance !== undefined,
      ask: (c) => c.say("rx_ask_ins"), expects: ["ins_no", "ins_yes"],
      suggest: [{ lt: "Atsakyti apie draudimą", hint: "rx_ins" }, { lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
      yes: (c) => { rx(c).insurance = true; c.s.rxPriceSaid = true; c.say("rx_ins_ok", { price: RX_COPAY }); },
      no: (c) => { rx(c).insurance = false; c.s.rxPriceSaid = true; c.say("rx_no_ins", { price: RX_PRICE }); } },

    // Paying
    { id: "pay", when: (c) => basket(c).length > 0 && !!c.s.dosageGiven && (c.s.mode !== "rx" || !!rx(c).ready) && c.s.decision !== "none", done: (c) => !!c.s.paid,
      ask: (c) => {
        const onlyRx = basket(c).length === 1 && basket(c)[0] === "rx";
        if (onlyRx && c.s.rxPriceSaid && !c.s.totalSaid) { c.s.totalSaid = true; c.say("ask_pay_how"); return; }
        c.say("total", { total: total(c) });
        if (!c.s.totalSaid) { c.s.totalSaid = true; if (c.chance(0.3)) c.say("ask_pay_method"); }
      },
      expects: ["pay_card", "pay_cash", "pay_phone", "here_you_go", "ask_drowsy", "ask_food", "ask_alcohol", "ask_dosage", "ask_kids", "ask_rx_needed", "need_product"],
      suggest: [{ lt: "Susimokėti kortele, grynaisiais ar telefonu", hint: "pay" }, { lt: "Paklausti dar ko nors", hint: "ask", options: "product" }] },
    { id: "bag", when: (c) => !!c.s.paid && c.s.askBag, done: (c) => c.s.bag !== undefined,
      ask: (c) => c.say("ask_bag"), expects: ["no_bag", "bag_yes"],
      suggest: [{ lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
      yes: (c) => { c.s.bag = true; c.say("bag_here"); },
      no: (c) => { c.s.bag = false; c.say("no_problem"); } },
  ],

  init: (c) => {
    c.s.mode = "otc";
    c.s.basket = [];
    c.s.askWho = c.chance(0.35);
    c.s.askHowLong = c.chance(0.65);
    c.s.askMeds = c.chance(0.5);
    c.s.askAllergy = c.chance(0.35);
    c.s.askMore = c.chance(0.5);
    c.s.askBag = c.chance(0.3);
    c.s.askSpell = c.chance(0.6);
    c.s.askIns = c.chance(0.7);
    c.s.volunteer = c.chance(0.4);
    c.s.rxReadyNow = c.chance(0.45);
    c.s.storeBrand = c.visits >= 1 && c.chance(0.4);
    c.s.rxPrompt = c.visits >= 1 && c.chance(0.3);
  },

  start: (c) => {
    if (c.s.rxPrompt) {
      c.twist("rx_prompt");
      c.say("greet_back_hi");
      c.say("rx_prompt");
      c.s.rxOffer = true; // the checklist shows the pickup plan until the learner says what else they need
      c.expect({
        id: "rx_prompt", optional: true, expects: ["rx_pickup", "rx_dropoff"], hints: ["rx_prompt", "rx", "symptom"],
        suggest: [{ lt: "Atsakyti, ar atsiimi vaistus pagal receptą", hint: "rx_prompt" }, { lt: "Pasakyti, kas negerai", hint: "symptom", options: "symptom" }],
        // "No, I have a headache.": the words say what they need instead
        on: {
          rx_pickup: (cc, sl, sg) => { pharmacy.handlers.rx_pickup(cc, sl, sg); },
          rx_dropoff: (cc, sl, sg) => { pharmacy.handlers.rx_dropoff(cc, sl, sg); },
          need_symptom: (cc, sl, sg) => { pharmacy.handlers.need_symptom(cc, sl, sg); },
          symptom_state: (cc, sl, sg) => { pharmacy.handlers.symptom_state(cc, sl, sg); },
          need_product: (cc, sl, sg) => { pharmacy.handlers.need_product(cc, sl, sg); },
          feel_sick: (cc, sl, sg) => { pharmacy.handlers.feel_sick(cc, sl, sg); },
          symptom_ctx: (cc, sl, sg) => { pharmacy.handlers.symptom_state(cc, sl, sg); },
        },
        yes: (cc) => { startRx(cc, "pickup"); cc.ask("rx_name"); },
        no: (cc) => { cc.say("ask_need"); cc.ask("need"); },
        ask: (cc) => cc.say("rx_prompt"),
      });
      return;
    }
    if (c.chance(0.3)) {
      c.say("greet_howareyou");
      expectHowAreYou(c);
      return;
    }
    // The greeting already asks "What can I do for you?"; the need step is the effective step.
    c.say(c.visits >= 1 && c.chance(0.4) ? "greet_back" : "greet");
    c.hold();
  },

  handlers: {
    need_symptom(c, slots) { setSymptom(c, last(slots.symptom)); },
    symptom_state(c, slots, seg) {
      const s = slots.symptom ? (Array.isArray(slots.symptom) ? slots.symptom[0] : slots.symptom) : symptomFromTags(seg.tags);
      if (seg.tags.includes("child")) c.s.forWho = "child";
      else if (seg.tags.includes("adult")) c.s.forWho = "adult";
      if (s) setSymptom(c, s);
      // "I have a headache since this morning": how long is answered too
      const d = daysFromTags(seg.tags, slots);
      if (s && d !== undefined && c.s.days === undefined && c.s.mode !== "rx") {
        c.s.days = d;
        if (d >= 7 && !c.s.long) { c.s.long = true; c.s.doctorSaid = true; c.twist("see_doctor"); c.say("long_time"); c.say("see_doctor_soon"); }
      }
    },
    symptom_ctx(c, slots, seg) { pharmacy.handlers.symptom_state(c, slots, seg); },
    feel_sick(c) {
      if (c.s.mode !== "rx") c.s.rxOffer = false;
      if (c.s.symptom) { c.say("ack"); return; }
      c.say("ask_symptoms");
      c.expect({ id: "sick_q", expects: ["symptom_state", "need_symptom", "symptom_ctx"], hints: ["symptom"], suggest: [{ lt: "Pasakyti simptomus", hint: "symptom", options: "symptom" }],
        on: {
          symptom_state: (cc, sl, sg) => { pharmacy.handlers.symptom_state(cc, sl, sg); },
          need_symptom: (cc, sl, sg) => { pharmacy.handlers.need_symptom(cc, sl, sg); },
          symptom_ctx: (cc, sl, sg) => { pharmacy.handlers.symptom_state(cc, sl, sg); },
        },
        ask: (cc) => cc.say("ask_symptoms") });
    },
    need_product(c, slots) {
      const id = last(slots.product);
      if (!id) return;
      if (c.s.mode !== "rx") c.s.rxOffer = false;
      if (c.s.mode === "rx" && !rx(c).ready) { c.say("product_ok"); basket(c).push(id); return; }
      const first = !product(c) || product(c) === "rx";
      if (c.step === "more") c.s.moreDone = false;
      c.say("product_ok");
      addProduct(c, id);
      if (c.s.mode === "rx") return;
      if (first && at(id).med) c.s.offer = id;
      sayP(c, "here_it_is", id);
    },
    product_unknown(c) { c.say("unknown_product"); c.say("rx_stronger"); },
    change_product(c, slots) {
      const id = last(slots.product);
      if (!id) return;
      if (product(c) && product(c) !== id && at(product(c)!).med && at(id).med) {
        const i = basket(c).indexOf(product(c)!);
        if (i >= 0) basket(c).splice(i, 1);
        c.s.product = undefined;
        c.s.dosageGiven = false;
      }
      c.say("product_ok");
      addProduct(c, id);
    },
    other_option(c) {
      if (c.step === "recommend" || (c.s.offer && !product(c))) { declineOffer(c); return; }
      const cur = product(c);
      const alt = cur ? ALT[cur] : undefined;
      if (alt) { c.say("rec_alt", { X: bind(alt) }); c.say("rec_alt_q"); c.s.offer = alt; c.expect(altPending(c, alt)); }
      else c.say("rec_none");
    },
    accept_rec(c) { if (!product(c)) acceptOffer(c); else c.say("product_ok"); },
    decline_rec(c) {
      if (c.step === "recommend" || (c.s.offer && !product(c))) { declineOffer(c); return; }
      c.say("no_problem");
    },
    who_ans(c, slots, seg) {
      const tags = seg.tags;
      if (tags.includes("notme")) { askWhoFor(c); return; }
      if (tags.includes("child") || (typeof slots.n === "number" && slots.n < 12)) c.s.forWho = "child";
      else if (tags.includes("adult")) c.s.forWho = "adult";
      else c.s.forWho = "me";
      c.say("ack");
    },
    howlong_ans(c, slots, seg) {
      const d = daysFromTags(seg.tags, slots);
      c.s.days = d ?? 1;
      if (c.s.days >= 7 && !c.s.long) { c.s.long = true; c.s.doctorSaid = true; c.twist("see_doctor"); c.say("long_time"); c.say("see_doctor_soon"); }
      else c.say("ack");
    },
    meds_ctx(c, slots, seg) { pharmacy.handlers.meds_ans(c, slots, seg); },
    allergy_ctx(c, slots, seg) { pharmacy.handlers.allergy_ans(c, slots, seg); },
    meds_ans(c, _slots, seg) {
      if (seg.tags.includes("bp")) c.s.meds = "bp";
      else if (seg.tags.includes("vit")) c.s.meds = "vit";
      else if (seg.tags.includes("other")) c.s.meds = "other";
      else c.s.meds = "none";
      if (c.s.meds === "other") c.say("meds_ok"); else c.say("ack");
    },
    allergy_ans(c, _slots, seg) {
      if (seg.tags.includes("nsaid")) c.s.allergy = "nsaid";
      else if (seg.tags.includes("pen")) c.s.allergy = "pen";
      else if (seg.tags.includes("other")) c.s.allergy = "other";
      else c.s.allergy = "none";
      if (c.s.mode === "rx" && c.s.allergy === "pen") { c.say("rx_pen"); return; }
      if (c.s.allergy === "pen" || c.s.allergy === "other") c.say("allergy_ok");
      else if (c.s.allergy === "none") c.say("ack");
      else if (c.s.allergy === "nsaid" && product(c) === "ibuprofen") {
        const i = basket(c).indexOf("ibuprofen"); if (i >= 0) basket(c).splice(i, 1);
        c.s.product = undefined; c.s.dosageGiven = false; c.say("nsaid_reason"); c.say("switch_aceta"); addProduct(c, "acetaminophen");
      } else if (c.s.allergy === "nsaid" && !product(c) && c.s.offer === "ibuprofen") {
        // ibuprofen was only on offer: the recommendation is made again (acetaminophen, with the reason)
        c.s.offer = undefined; c.s.recSaid = false; c.say("ack");
      } else c.say("ack");
    },
    ask_dosage(c) {
      if (!product(c)) {
        if (c.s.offer) { giveDosageFor(c, c.s.offer); return; }
        if (c.s.symptom) { c.say("dose_first"); return; }
        c.say("ask_need"); c.hold(); return;
      }
      if (c.s.mode === "rx" && !rx(c).ready) { c.say("rx_ten_min"); return; }
      if (c.s.dosageGiven && c.s.dosageRepeated) { giveDosage(c); return; }
      c.s.dosageRepeated = !!c.s.dosageGiven;
      if (c.s.mode === "rx") c.say("rx_how");
      giveDosage(c);
    },
    ask_drowsy(c) {
      const id = product(c) ?? c.s.offer;
      if (c.s.mode === "rx") { c.say("rx_drowsy_no"); return; }
      if (!id) { if (c.s.symptom) c.say("dose_first"); else { c.say("ask_need"); c.hold(); } return; }
      const d = at(id).drowsy;
      if (d === "little") c.say("drowsy_little");
      else if (d === "yes") c.say("drowsy_yes", { X: bind(id) });
      else sayP(c, "drowsy_no", id);
    },
    ask_rx_needed(c) {
      const id = product(c) ?? c.s.offer;
      if (!id || id === "rx") { c.say("rx_stronger"); return; }
      sayP(c, "rx_not_needed", id);
    },
    ask_food(c) {
      const id = product(c) ?? c.s.offer;
      if (c.s.mode === "rx") { c.say("rx_food"); return; }
      if (!id) return;
      sayP(c, at(id).food === "with" ? "food_with" : "food_any", id);
    },
    ask_alcohol(c) {
      if (c.s.mode === "rx") { c.say("rx_alcohol"); return; }
      const id = product(c) ?? c.s.offer;
      if (!id) return;
      sayP(c, "alcohol_no", id);
    },
    ask_kids(c) {
      c.say("kids_yes");
      c.say("kids_dose");
    },
    ask_side_effects(c) { c.say("side_effects"); },
    ask_how_long_take(c) { c.say("how_long_take", { X: bind(product(c) ?? "ibuprofen") }); },
    ask_price(c, slots) {
      if (c.step === "pay" && c.s.totalSaid && !slots.product) { c.say("total", { total: total(c) }); c.hold(); return; }
      const id = slots.product ? last(slots.product) : (product(c) ?? c.s.offer);
      if (!id) { if (c.s.symptom) c.say("depends"); else { c.say("ask_need"); c.hold(); } return; }
      if (id === "rx") { c.say(rx(c).insurance ? "rx_ins_ok" : "rx_no_ins", { price: priceOf(c, "rx") }); return; }
      sayP(c, "price_is", id, { price: priceOf(c, id) });
    },
    ask_cheaper(c) {
      const id = product(c) ?? c.s.offer;
      if (id === "ibuprofen" || id === "acetaminophen") {
        c.say("cheaper_yes");
        c.s.storeBrandFor = id;
        return;
      }
      c.say("cheaper_none");
    },
    ask_where(c) { c.say("where_it_is"); if (product(c) && product(c) !== "rx") c.say("grab_it", { X: bind(product(c)!) }); },
    ask_how_long_ready(c) {
      // "How long?" in the shop is about taking the medicine; at the prescription counter it's the wait
      if (c.s.mode === "rx" && !rx(c).ready) c.say("ready_ten");
      else if (product(c) || c.s.offer) pharmacy.handlers.ask_how_long_take(c, {}, { intent: "ask_how_long_take", slots: {}, tags: [] });
      else c.say("ready_ten");
    },
    help_me(c) {
      // on its own ("I have a question.") the pharmacist invites it; followed by the question, the question is answered
      if (/(help|question|thing|one|more|something)(\s+please)?[\s.!?,]*$/i.test(c.heard.trim())) { c.say("go_ahead"); c.hold(); }
    },
    more_no(c) { c.s.moreDone = true; },
    pay_card(c) {
      if (c.s.paid) return; // paid already: no second payment
      if (!c.s.totalSaid) { c.say("card_later"); c.s.payMethod = "card"; return; }
      c.say("card_tap"); c.s.paid = true; c.s.payMethod = "card"; c.event("pay", { method: "card" }); c.say("paid");
    },
    pay_cash(c) {
      if (c.s.paid) return;
      c.say("cash_ok"); c.s.payMethod = "cash";
      if (c.s.totalSaid) { c.s.paid = true; c.event("pay", { method: "cash" }); c.say("change_back"); }
    },
    pay_phone(c) {
      if (c.s.paid) return;
      c.s.payMethod = "phone";
      if (!c.s.totalSaid) { c.say("card_later"); return; }
      c.say("phone_ok"); c.s.paid = true; c.event("pay", { method: "phone" }); c.say("paid");
    },
    // "Thanks, bye!" right after paying (at "Would you like a bag?"): the purchase is complete, as in the
    // café. Before paying it ends the visit, not completed.
    g_bye(c) {
      if (c.s.paid) sold(c);
      c.say("g_bye"); c.end(); c.hold();
    },
    here_you_go(c) {
      if (c.s.paid) return;
      if (!c.s.totalSaid) { c.say("no_problem"); return; }
      c.s.paid = true; c.event("pay", { method: c.s.payMethod || "cash" });
      if (c.s.payMethod === "card" || c.s.payMethod === "phone") c.say("paid"); else c.say("change_back");
    },
    no_bag(c) { c.s.bag = false; c.say("no_problem"); },
    bag_yes(c) { c.s.bag = true; c.say("bag_here"); },
    no_questions(c) { c.say("ok"); },
    know_ctx(c, slots, seg) { pharmacy.handlers.not_first(c, slots, seg); },
    will_do_ctx(c) { c.say("g_bye"); c.end(); },
    no_rx_paper(c) {
      if (c.s.mode === "rx") { c.say("rx_electronic"); return; }
      c.say("no_rx_ok");
    },
    thanks_help(c) { c.say("g_welcome"); },

    // Prescriptions
    rx_pickup(c) {
      if (c.s.mode !== "rx") startRx(c, "pickup");
      if (!rx(c).name) c.ask("rx_name");
      else if (rx(c).dob && !rx(c).ready && !rx(c).later) c.say("ready_ten"); // "Is it ready yet?"
    },
    rx_dropoff(c) {
      if (c.s.mode !== "rx") startRx(c, "dropoff");
      c.say("rx_dropoff_ok");
      if (!rx(c).name) c.ask("rx_name");
    },
    name_ctx(c, slots) {
      if (!slots.name) { c.say("rx_ask_name_again"); c.hold(); return; }
      rx(c).name = slots.name;
      c.say("rx_thanks");
    },
    letters_ctx(c, slots) {
      if (!rx(c)) return;
      if (!rx(c).name) rx(c).name = String(slots.letters);
      rx(c).spelled = true;
      c.say("rx_thanks");
    },
    spell_ctx(c, slots) {
      if (!rx(c)) return;
      const letters = [slots.s1, slots.s2, slots.s3].filter(Boolean).join("");
      if (!rx(c).name) rx(c).name = letters;
      rx(c).spelled = true;
      c.say("rx_thanks");
    },
    dob(c) {
      if (!rx(c)) return;
      if (rx(c).dob) { c.say("rx_thanks"); return; }
      rx(c).dob = true;
      c.say("rx_thanks");
      c.say("rx_check");
      if (c.s.rxKind === "pickup" && c.s.rxReadyNow) { rx(c).ready = true; c.say("rx_ready_now"); c.event("give", { item: "prescription" }); return; }
      c.twist("rx_wait");
      c.say("rx_ten_min");
      c.say("rx_wait_q");
      c.expect({ id: "wait_q", expects: ["wait_yes", "wait_no"], hints: ["rx_wait", "rx_later", "g_yesno"],
        suggest: [{ lt: "Pasakyti, kad palauksi", hint: "rx_wait" }, { lt: "Pasakyti, kad grįši vėliau", hint: "rx_later" }],
        on: {
          wait_yes: (cc) => { waitDone(cc); },
          wait_no: (cc) => { rx(cc).later = true; cc.say("rx_later_ok"); cc.s.decision = "none"; },
        },
        yes: (cc) => { waitDone(cc); },
        no: (cc) => { rx(cc).later = true; cc.say("rx_later_ok"); cc.s.decision = "none"; },
        ask: (cc) => cc.say("rx_wait_q") });
    },
    ins_no(c) { if (!rx(c)) return; rx(c).insurance = false; c.s.rxPriceSaid = true; c.say("rx_no_ins", { price: RX_PRICE }); },
    ins_yes(c) { if (!rx(c)) return; rx(c).insurance = true; c.s.rxPriceSaid = true; c.say("rx_ins_ok", { price: RX_COPAY }); },
    wait_yes(c) { if (c.s.mode === "rx" && !rx(c).ready) waitDone(c); else c.say("g_take_time"); },
    wait_no(c) { if (c.s.mode === "rx" && !rx(c).ready) { rx(c).later = true; c.say("rx_later_ok"); c.s.decision = "none"; } },
    first_time(c) {
      if (c.s.mode === "rx") { c.say("rx_how"); giveDosage(c); return; }
      giveDosage(c);
    },
    not_first(c) {
      if (c.s.mode === "rx") { c.say("rx_same"); c.say("dose_rx_finish"); c.s.dosageGiven = true; return; }
      c.say("dose_reminder");
      const id = product(c);
      if (id === "ibuprofen" || id === "acetaminophen") c.say("max_six"); else giveDosage(c);
      c.s.dosageGiven = true;
    },
  },

  finish: (c) => {
    if (c.s.paid) {
      sold(c);
      const sick = !!c.s.symptom || c.s.mode === "rx" || basket(c).some((id) => id !== "rx" && at(id).med);
      c.say(sick ? "feel_better" : "closing_other");
      if (c.s.symptom && !c.s.doctorSaid) c.say("see_doctor");
    } else if (c.s.mode === "rx" && rx(c)?.later) {
      c.say("closing_other");
    } else {
      c.say(c.s.symptom ? "feel_better" : "closing_nobuy");
    }
    c.expect({ id: "closing", optional: true, hints: ["g_social"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
        thanks_help: (cc) => { cc.say("g_welcome"); cc.end(); },
        will_do_ctx: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // hint patterns
    { say: "Do you have something for a headache?", intent: "need_symptom", slots: { symptom: "headache" } },
    { say: "I have a sore throat.", intent: "symptom_state", slots: { symptom: "sore_throat" } },
    { say: "What can I take for a cough?", intent: "need_symptom", slots: { symptom: "cough" } },
    { say: "What would you recommend for a cold?", intent: "need_symptom", slots: { symptom: "cold" } },
    { say: "My head hurts.", intent: "symptom_state" },
    { say: "Can I get some ibuprofen?", intent: "need_product", slots: { product: "ibuprofen" } },
    { say: "Do you have any Band-Aids?", intent: "need_product", slots: { product: "bandaids" } },
    { say: "Where can I find sunscreen?", intent: "need_product", slots: { product: "sunscreen" } },
    { say: "How often should I take it?", intent: "ask_dosage" },
    { say: "How many should I take?", intent: "ask_dosage" },
    { say: "Does it make you drowsy?", intent: "ask_drowsy" },
    { say: "Do I need a prescription for it?", intent: "ask_rx_needed" },
    { say: "Should I take it with food?", intent: "ask_food" },
    { say: "Is it safe for children?", intent: "ask_kids" },
    { say: "I'm here to pick up a prescription.", intent: "rx_pickup" },
    { say: "I have a prescription from my doctor.", intent: "rx_dropoff" },
    { say: "It's for my son. He's six.", intent: "who_ans" },
    // natural alternatives and short answers
    { say: "Since yesterday.", intent: "howlong_ans", step: "howlong" },
    { say: "About three days.", intent: "howlong_ans", step: "howlong", slots: { n: 3 } },
    { say: "No, I'm not taking anything.", intent: "meds_ans", step: "meds" },
    { say: "Just vitamins.", intent: "meds_ans", step: "meds" },
    { say: "I'm allergic to aspirin.", intent: "allergy_ans", step: "allergy" },
    { say: "It's for me.", intent: "who_ans", step: "who" },
    { say: "Okay, I'll try it.", intent: "accept_rec", step: "recommend" },
    { say: "Mikalauskas", intent: "name_ctx", step: "rx_name" },
    { say: "M I K A L A U S K A S", intent: "letters_ctx", step: "rx_spell" },
    { say: "June 4th, 1980.", intent: "dob", step: "rx_dob" },
    { say: "No, I don't have insurance.", intent: "ins_no", step: "rx_ins" },
    { say: "That's all, thanks.", intent: "more_no", step: "more" },
    { say: "Card", intent: "pay_card", step: "pay" },
    { say: "I don't feel well.", intent: "feel_sick" },
    { say: "I think I'm getting a cold.", intent: "symptom_state", slots: { symptom: "cold" } },
    // British and European variants
    { say: "Have you got any paracetamol?", intent: "need_product", slots: { product: "acetaminophen" } },
    { say: "Do you have plasters?", intent: "need_product", slots: { product: "bandaids" } },
    { say: "I need some sun cream.", intent: "need_product", slots: { product: "sunscreen" } },
    { say: "I have a temperature.", intent: "symptom_state" },
    // negation and meaning preservation
    { say: "I'm not allergic to anything.", intent: "allergy_ans", not: ["accept_rec"] },
    { say: "I don't have insurance.", intent: "ins_no", not: ["ins_yes"] },
    { say: "I'm not taking any other medications.", intent: "meds_ans", slots: {} },
    { say: "I don't want that one.", intent: "other_option", not: ["accept_rec", "need_product"] },
    { say: "I can't wait.", intent: "wait_no", not: ["wait_yes"] },
    { say: "My kid has a fever.", intent: "symptom_state", slots: { symptom: "fever" } },
    { say: "Yes, I have.", intent: "not_first", step: "dosage" },
    { say: "How much should I give her?", intent: "ask_dosage" },
    { say: "Is it OK to take it on an empty stomach?", intent: "ask_food" },
    { say: "I don't have a prescription.", intent: "no_rx_paper", not: ["rx_dropoff", "rx_pickup"] },
    { say: "I'll come back later.", intent: "wait_no", not: ["wait_yes"] },
    { say: "Are there any side effects?", intent: "ask_side_effects" },
    // model answers of the guide
    { say: "Sounds good, thanks.", intent: "yn:yes", step: "recommend" },
    { say: "Okay, I'll try them.", intent: "accept_rec", step: "recommend" },
    { say: "Do you have anything else?", intent: "other_option", step: "recommend" },
    { say: "No. How often should I take it?", intent: "ask_dosage", step: "dosage" },
    // "Do you know how to take it?" asked by the learner (Ar žinote, kaip jį vartoti?)
    { say: "Do you know how to take it?", intent: "ask_dosage", step: "dosage" },
    { say: "Do you know how often I should take it?", intent: "ask_dosage" },
    { say: "How do you take it?", intent: "ask_dosage" },
    { say: "I don't know how to take it.", intent: "ask_dosage", step: "dosage", not: ["g_dontknow", "not_first"] },
    { say: "I know how to take it.", intent: "not_first", step: "dosage", not: ["ask_dosage"] },
    { say: "Do you know a good doctor?", intent: "none", step: "dosage" },
    { say: "Yes, I've taken it before.", intent: "not_first", step: "dosage" },
    { say: "Yes, it's my first time.", intent: "first_time", step: "dosage" },
    { say: "No, I don't have any allergies.", intent: "allergy_ans", step: "allergy", not: ["accept_rec"] },
    { say: "It's for my wife.", intent: "who_ans", step: "who" },
    { say: "Yes, here's my insurance card.", intent: "ins_yes", step: "rx_ins" },
    { say: "Sure, it's M-I-K-A-L-A-U-S-K-A-S.", intent: "letters_ctx", step: "rx_spell" },
    // unrelated
    { say: "the aspirin is dancing on the roof", intent: "none" },
    { say: "banana telephone yesterday", intent: "none" },
    { say: "Do you have any umbrellas?", intent: "product_unknown" },
    // more constructions and vocabulary (dev corpus tests/corpus/s75-pharmacy.json)
    { say: "I have a headache since morning", intent: "symptom_state", step: "need", slots: { symptom: "headache" } },
    { say: "Headache.", intent: "symptom_ctx", step: "need", slots: { symptom: "headache" } },
    { say: "I have pain in my head", intent: "symptom_state", step: "need" },
    { say: "I have a cold, what do you recommend?", intent: "symptom_state", step: "need", slots: { symptom: "cold" } },
    { say: "I need pills for allergy", intent: "need_symptom", slots: { symptom: "allergies" } },
    { say: "Do you have painkillers?", intent: "need_product", slots: { product: "ibuprofen" } },
    { say: "It is for my kid, she has five years", intent: "who_ans", step: "who" },
    { say: "Not for me, for my dad", intent: "who_ans", step: "who" },
    { say: "Since two days", intent: "howlong_ans", step: "howlong", slots: { n: 2 } },
    { say: "I've had it for about three days", intent: "howlong_ans", step: "howlong", slots: { n: 3 } },
    { say: "I take pills for blood pressure", intent: "meds_ans", step: "meds" },
    { say: "Yes, antibiotics", intent: "meds_ctx", step: "meds" },
    { say: "I am allergic on aspirin", intent: "allergy_ans", step: "allergy" },
    { say: "Just hay fever", intent: "allergy_ctx", step: "allergy" },
    { say: "Ibuprofen doesn't work for me", intent: "other_option", step: "recommend" },
    { say: "OK, I trust you", intent: "accept_rec", step: "recommend" },
    { say: "Could you tell me how to use it?", intent: "ask_dosage", step: "dosage" },
    { say: "No, everything is clear", intent: "no_questions" },
    { say: "I'll put it on my card", intent: "pay_card", step: "pay" },
    { say: "My surname is Mikalauskas", intent: "name_ctx", step: "rx_name" },
    { say: "1980, June 4th", intent: "dob", step: "rx_dob" },
    { say: "I'll come back in twenty minutes", intent: "wait_no" },
    { say: "No, I'm a tourist", intent: "ins_no", step: "rx_ins" },
    // safety: negations stay negative
    { say: "I don't want to try it", intent: "decline_rec", step: "recommend", not: ["accept_rec"] },
    { say: "No, I never took it", intent: "first_time", step: "dosage", not: ["not_first"] },
    { say: "I'm not allergic to penicillin", intent: "allergy_ans", step: "allergy", slots: {} },
    { say: "I have European insurance", intent: "ins_no", step: "rx_ins", not: ["ins_yes"] },
    { say: "I don't have a headache", intent: "none" },
  ],

  sims: [
    { name: "headache: symptom, questions, dosage, pay", turns: ["Hi! Do you have something for a headache?", "Yes, I'll try it.", "How often should I take it?", "Does it make you drowsy?", "Card, please.", "Thank you, bye!"],
      expect: { complete: true }, auto: AUTO },
    { name: "cold with other medication, asks questions", turns: ["I think I'm getting a cold.", "Since yesterday.", "I take blood pressure pills.", "Do I need a prescription?", "Okay, I'll try it.",
      "How many should I take?", "Can I get some Band-Aids too?", "That's all, thanks.", "Here you go.", "Thanks for the advice!"], expect: { complete: true },
      // the other medication is what this sim is about: the "how long" and "other medicines" questions on every
      // seed, and "Anything else?" for "That's all, thanks."
      setup: (s) => { s.askHowLong = true; s.askMeds = true; s.askMore = true; },
      auto: { ...AUTO, meds: "I take blood pressure pills." } },
    // In Mr. Okafor's order: the prescription is ready in ten minutes, "Is this your first time taking it?", then insurance.
    { name: "prescription pickup", turns: ["Hi, I'm here to pick up a prescription.", "It's Mikalauskas.", "M-I-K-A-L-A-U-S-K-A-S.", "June 4th, 1980.", "Sure, I'll wait.",
      "How often should I take it?", "No, I don't have insurance.", "Can I drink alcohol with it?", "Card.", "Thanks, bye!"], expect: { complete: true }, auto: AUTO,
      // the script spells the name, waits for the prescription and answers the insurance question
      setup: (s) => { s.askSpell = true; s.askIns = true; s.rxReadyNow = false; } },
    { name: "long cough: see a doctor twist", turns: ["I have a bad cough.", "About two weeks.", "Sure, I'll try it.", "Does it make you drowsy?", "How much is it?", "Card.", "Bye!"],
      expect: { complete: true }, auto: AUTO, setup: (s) => { s.askHowLong = true; } }, // "About two weeks." brings the twist on every seed
    { name: "declines the medicine (no purchase)", turns: ["Do you have something for a sore throat?", "No, thanks.", "No, thanks.", "Bye!"],
      expect: { complete: false }, auto: { ...AUTO, recommend: "No, thanks.", alt: "No, thanks." } },
    { name: "direct product, British word, child", turns: ["Have you got any paracetamol?", "Is it safe for children?", "Do you know how to take it?", "How much is it?", "How often should I take it?", "Cash.", "Bye!"],
      expect: { complete: true }, auto: { ...AUTO, dosage: "No, how often should I take it?" } },
  ],
};

/** Paid for: the learner gets the items (at the end, or on "Thanks, bye!" right after paying). */
function sold(c: Ctx) {
  if (c.s.soldDone) return;
  c.s.soldDone = true;
  c.complete();
  c.event("give", { items: basket(c) });
}

function setSymptom(c: Ctx, s: string) {
  if (c.s.mode === "rx") { c.say("ack"); return; }
  c.s.rxOffer = false;
  if (!firstThisTurn(c, "symptom") && c.s.symptom) return; // a second symptom in the same sentence: keep the first
  const changed = c.s.symptom && c.s.symptom !== s;
  c.s.symptom = s;
  if (changed && !product(c)) { c.s.offer = undefined; c.s.recSaid = false; }
  c.say("sorry_symptom");
}

/** "Who's it for?" (after "No" / "It's not for me" to "Is it for you?") */
function askWhoFor(c: Ctx) {
  c.say("ask_who_q");
  c.expect({ id: "who_q", expects: ["who_ans"], hints: ["who"], suggest: [{ lt: "Pasakyti, kam vaistai", hint: "who" }],
    on: { who_ans: (cc, sl, sg) => { pharmacy.handlers.who_ans(cc, sl, sg); } },
    ask: (cc) => cc.say("ask_who_q") });
}

function acceptOffer(c: Ctx) {
  const p = c.s.offer ?? recommendation(c);
  c.s.offer = p;
  addProduct(c, p);
  sayP(c, "here_it_is", p);
}

function declineOffer(c: Ctx) {
  const cur = c.s.offer ?? recommendation(c);
  const alt = ALT[cur];
  if (alt && !c.s.altOffered) {
    c.s.altOffered = true;
    c.s.offer = alt;
    c.say("rec_alt", { X: bind(alt) });
    c.say("rec_alt_q");
    c.expect(altPending(c, alt));
    return;
  }
  c.say("rec_none");
  c.s.decision = "none";
}

function altPending(c: Ctx, alt: string): Pending {
  return { id: "alt", expects: ["accept_rec", "need_product", "change_product", "decline_rec"], hints: ["alt_ans", itemHint("ask", alt), "g_yesno"],
    suggest: [{ lt: "Sutikti", hint: "alt_ans" }, { lt: "Paklausti apie vaistą", hint: itemHint("ask", alt) }, { lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
    on: {
      accept_rec: (cc) => { acceptOffer(cc); },
      other_option: (cc) => { cc.say("rec_none"); cc.s.decision = "none"; },
      decline_rec: (cc) => { cc.say("rec_none"); cc.s.decision = "none"; },
      // "Yeah, acetaminophen is fine." / "Can I get Tylenol?": the question is answered by the product itself
      need_product: (cc, sl, sg) => { pharmacy.handlers.need_product(cc, sl, sg); },
      change_product: (cc, sl, sg) => { pharmacy.handlers.change_product(cc, sl, sg); },
    },
    yes: (cc) => { acceptOffer(cc); },
    no: (cc) => { cc.say("rec_none"); cc.s.decision = "none"; },
    ask: (cc) => cc.say("rec_alt_q") };
}

// Per-product copies of the hint groups the guide shows while one product is on the counter, so the
// model answers say "it" or "them" and agree in Lithuanian with that product ("accept_lozenges").
const PER_ITEM = ["accept", "dose", "questions", "ask"];
for (const gid of PER_ITEM) {
  const base = pharmacy.hints[gid];
  for (const e of PRODUCTS) {
    const items = base.items.filter((it) => !it.only || it.only(e)).sort((a, b) => (ENTRY.get(a) ?? 0) - (ENTRY.get(b) ?? 0));
    if (items.length) pharmacy.hints[`${gid}_${e.id}`] = { ...base, examples: [e.id], items };
  }
}
function itemHint(gid: string, id?: string | null): string { return id && pharmacy.hints[`${gid}_${id}`] ? `${gid}_${id}` : gid; }

/** Re-state a step's question as an optional pending with a tuned guide (first suggestion replaced, the
 *  others given); yes/no and all intents behave exactly as for the step (`on: {}` sends "No, how often…"
 *  to the intents). */
function guideFor(c: Ctx, stepId: string, main: { lt?: string; hint: string }, rest: Suggestion[]) {
  const st = pharmacy.steps.find((x) => x.id === stepId)!;
  const first = { lt: main.lt ?? (st.suggest as Suggestion[])[0].lt, hint: main.hint }; // a fixed list on these steps
  c.expect({ id: stepId, optional: true, expects: st.expects, yes: st.yes, no: st.no, on: {},
    suggest: [first, ...rest], hints: [first.hint, ...rest.map((x) => x.hint!), "g_yesno"] });
}

/** True the first time `key` comes up in this learner turn: the engine gives every turn its own
 *  context object, so the same words said again in a later turn count again. */
const TURN = new WeakMap<object, Set<string>>();
function firstThisTurn(c: Ctx, key: string): boolean {
  let seen = TURN.get(c);
  if (!seen) TURN.set(c, (seen = new Set()));
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}

/** Ask the next open step right away (a step that settled itself while asking). */
function askNext(c: Ctx) {
  const st = pharmacy.steps.find((x) => (!x.when || x.when(c)) && !x.done(c));
  if (st) c.ask(st.id);
}

function waitDone(c: Ctx) {
  c.say("rx_wait_ok");
  c.say("rx_ready_later");
  rx(c).ready = true;
  c.event("give", { item: "prescription" });
}

export default pharmacy;
