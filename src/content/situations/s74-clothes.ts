// Song 74 "Can I Try It On?" · Threads, a clothing store on Main Street · sales assistant Chloe.
// American store routine: "Can I help you find anything?", sizes S–XL (shoes in US numbers,
// with a friendly conversion for European sizes), colors, the fitting room, "It looks great on you!",
// sales ("20% off"), sales tax added at the register, bag / wear it out, receipt.
// Twist (visits ≥ 1): the learner comes back with something to return or exchange (receipt,
// what's wrong with it, refund / exchange / store credit). Any learner can also start a return.
//
// Lithuanian notes: colors are glossed as genitive noun phrases ("juodos spalvos") so they never
// need agreement; garments that are plural in Lithuanian only (marškiniai, džinsai, kelnės, batai)
// are bound with qty 2 so pronouns and adjectives agree ({jis@X:acc} → juos / jas).
//
// Guide: the mission lists the shopping plan, or the return plan while a return is on. Steps whose
// answers depend on the garment (try on, fit, decide, bag, color, return reason) re-state their question
// as an optional pending that points the guide at a per-garment copy of the hint group, so the model
// answers say "it" or "them" and name colors the garment comes in. Leaving answers ("I'll think about
// it") are offered as the alternative, not among the first model answers.

import type { Ctx, EntityDef, HintItem, Pending, SentSrc, SituationDef, Suggestion } from "../types";
import { ent, t } from "../dsl";
import { expectHowAreYou } from "../global";

// ---------------------------------------------------------------------------
// Entities

export const CLOTHING: EntityDef[] = [
  ent("jacket", "jacket", "striukė/striukės/striukei/striukę/striuke/striukėje", "f", { pl: "jackets",
    ltPl: "striukės/striukių/striukėms/striukes/striukėmis/striukėse", chip: "striukė",
    forms: ["jackets", "rain jacket", "denim jacket", "jean jacket", "light jacket"], attrs: { price: 5999, colors: ["yellow", "black", "navy"] } }),
  ent("shirt", "shirt", "marškiniai/marškinių/marškiniams/marškinius/marškiniais/marškiniuose", "m", {
    ltPl: "marškiniai/marškinių/marškiniams/marškinius/marškiniais/marškiniuose", chip: "marškiniai",
    forms: ["shirts", "button down shirt", "button up shirt", "dress shirt", "button down"], attrs: { price: 3499, colors: ["white", "blue", "pink"], ltPl: true } }),
  ent("tshirt", "T-shirt", "marškinėliai/marškinėlių/marškinėliams/marškinėlius/marškinėliais/marškinėliuose", "m", {
    ltPl: "marškinėliai/marškinėlių/marškinėliams/marškinėlius/marškinėliais/marškinėliuose", chip: "marškinėliai",
    forms: ["t shirts", "tshirt", "tshirts", "tee shirt", "tee shirts", "tee", "tees"], attrs: { price: 1999, colors: ["white", "black", "gray"], ltPl: true } }),
  ent("sweater", "sweater", "megztinis/megztinio/megztiniui/megztinį/megztiniu/megztinyje", "m", { pl: "sweaters",
    ltPl: "megztiniai/megztinių/megztiniams/megztinius/megztiniais/megztiniuose", chip: "megztinis",
    forms: ["sweaters", "pullover", "pullovers"], attrs: { price: 4499, colors: ["gray", "green", "beige"] } }),
  ent("jeans", "jeans", "džinsai/džinsų/džinsams/džinsus/džinsais/džinsuose", "m", { art: "",
    ltPl: "džinsai/džinsų/džinsams/džinsus/džinsais/džinsuose", chip: "džinsai",
    forms: ["denim", "jean"], attrs: { price: 5499, colors: ["blue", "black", "gray"], enPl: true, ltPl: true, pair: true } }),
  ent("pants", "pants", "kelnės/kelnių/kelnėms/kelnes/kelnėmis/kelnėse", "f", { art: "",
    ltPl: "kelnės/kelnių/kelnėms/kelnes/kelnėmis/kelnėse", chip: "kelnės",
    forms: ["slacks", "chinos", "dress pants"], attrs: { price: 4999, colors: ["black", "navy", "beige"], enPl: true, ltPl: true, pair: true } }),
  ent("dress", "dress", "suknelė/suknelės/suknelei/suknelę/suknele/suknelėje", "f", { pl: "dresses",
    ltPl: "suknelės/suknelių/suknelėms/sukneles/suknelėmis/suknelėse", chip: "suknelė",
    forms: ["dresses", "summer dress"], attrs: { price: 6999, colors: ["red", "black", "blue"] } }),
  ent("coat", "coat", "paltas/palto/paltui/paltą/paltu/palte", "m", { pl: "coats",
    ltPl: "paltai/paltų/paltams/paltus/paltais/paltuose", chip: "paltas",
    forms: ["coats", "winter coat", "overcoat"], attrs: { price: 12999, colors: ["black", "brown", "beige"] } }),
  ent("scarf", "scarf", "šalikas/šaliko/šalikui/šaliką/šaliku/šalike", "m", { pl: "scarves",
    ltPl: "šalikai/šalikų/šalikams/šalikus/šalikais/šalikuose", chip: "šalikas",
    forms: ["scarves", "scarfs"], attrs: { price: 2499, colors: ["red", "gray", "yellow"], oneSize: true } }),
  ent("shoes", "shoes", "batai/batų/batams/batus/batais/batuose", "m", { art: "",
    ltPl: "batai/batų/batams/batus/batais/batuose", chip: "batai",
    forms: ["shoe", "dress shoes", "leather shoes"], attrs: { price: 7999, colors: ["black", "brown", "white"], enPl: true, ltPl: true, pair: true, shoe: true } }),
  ent("sneakers", "sneakers", "sportbačiai/sportbačių/sportbačiams/sportbačius/sportbačiais/sportbačiuose", "m", { art: "",
    ltPl: "sportbačiai/sportbačių/sportbačiams/sportbačius/sportbačiais/sportbačiuose", chip: "sportbačiai",
    forms: ["sneaker", "tennis shoes", "running shoes"], attrs: { price: 6999, colors: ["white", "black", "gray"], enPl: true, ltPl: true, pair: true, shoe: true } }),
];

// Colors are feminine adjectives agreeing with an implied "spalva" (color); lines add the noun,
// so a color always reads "juodos spalvos" (genitive of description) and fits any garment.
const col = (id: string, en: string, stem: string, forms: string[] = []) =>
  ent(id, en, `${stem}a/${stem}os/${stem}ai/${stem}ą/${stem}a/${stem}oje`, "f", { chip: `${stem}a`, forms });
export const COLORS: EntityDef[] = [
  col("black", "black", "juod"),
  col("white", "white", "balt"),
  col("gray", "gray", "pilk", ["grey"]),
  col("navy", "navy", "tamsiai mėlyn", ["navy blue", "dark blue"]),
  col("blue", "blue", "mėlyn", ["light blue"]),
  col("red", "red", "raudon"),
  col("green", "green", "žali"),
  col("yellow", "yellow", "gelton"),
  ent("pink", "pink", "rožinė/rožinės/rožinei/rožinę/rožine/rožinėje", "f", { chip: "rožinė" }),
  col("brown", "brown", "rud"),
  ent("beige", "beige", "smėlio", "f", { chip: "smėlio", forms: ["tan", "cream", "khaki"] }),
  ent("purple", "purple", "violetinė/violetinės/violetinei/violetinę/violetine/violetinėje", "f", { chip: "violetinė" }),
  ent("orange", "orange", "oranžinė/oranžinės/oranžinei/oranžinę/oranžine/oranžinėje", "f", { chip: "oranžinė" }),
];

const sz = (id: string, en: string, letter: string, forms: string[]) =>
  ent(id, en, `${letter} dydis/${letter} dydžio/${letter} dydžiui/${letter} dydį/${letter} dydžiu/${letter} dydyje`, "m", { chip: letter, forms });
export const SIZES: EntityDef[] = [
  sz("small", "small", "S", ["s", "size s", "size small", "smalls", "the smallest", "smallest", "smallest one", "the smallest one"]),
  sz("medium", "medium", "M", ["m", "size m", "size medium", "mediums", "med"]),
  sz("large", "large", "L", ["l", "size l", "size large", "larges"]),
  sz("xl", "extra-large", "XL", ["xl", "x l", "size xl", "x large", "ex el", "extra larges", "xls", "the biggest", "biggest", "biggest one", "the biggest one"]),
];

const ALL = [...CLOTHING, ...COLORS, ...SIZES];
const byId = (id: string) => ALL.find((e) => e.id === id)!;
const SIZE_ORDER = ["small", "medium", "large", "xl"];
const FEATURED: Garment = { id: "jacket", color: "yellow" };
const TAX = 1.06;

// ---------------------------------------------------------------------------
// State helpers

interface Garment { id: string; color?: string; size?: string; shoe?: number; half?: boolean; paid?: number }
interface Ret { item: Garment; receipt?: boolean; reason?: string; choice?: "refund" | "exchange" | "credit"; newSize?: string; newColor?: string; newShoe?: number; done?: boolean; refusedRefund?: boolean }

const attrs = (id: string) => byId(id).attrs || {};
const enPl = (id: string) => !!attrs(id).enPl;
const ltPl = (id: string) => !!attrs(id).ltPl;
const isShoe = (id: string) => !!attrs(id).shoe;
const oneSize = (id: string) => !!attrs(id).oneSize;
const colorsOf = (id: string) => (attrs(id).colors as string[]) || [];
const cur = (c: Ctx) => c.s.item as Garment | null;
const ret = (c: Ctx) => c.s.ret as Ret;
const bind = (g: Garment) => ({ id: g.id, qty: ltPl(g.id) ? 2 : 1 });
const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const last = (x: any) => (Array.isArray(x) ? x[x.length - 1] : x);

function basePrice(id: string): number { return attrs(id).price as number; }
function priceOf(c: Ctx, g: Garment): number {
  const p = basePrice(g.id);
  return c.s.onSale ? Math.floor((p * (100 - c.s.pct)) / 100) : p;
}

/** Say a line in its EN-plural variant (…_pl) for jeans, pants and shoes; LT agreement comes from the binding. */
function sayN(c: Ctx, line: string, g: Garment | null = cur(c), vars: Record<string, any> = {}) {
  const usePl = g && enPl(g.id) && !!clothes.lines[line + "_pl"];
  c.say(usePl ? line + "_pl" : line, { ...(g ? { X: bind(g) } : {}), ...vars });
}

/** Read an {item} slot object into a garment description. */
function fromSlot(v: any): Garment | null {
  if (!v || !v.clothing) return null;
  const g: Garment = { id: last(v.clothing) };
  if (v.color) g.color = last(v.color);
  if (v.size) g.size = last(v.size);
  if (v.shoe != null) g.shoe = last(v.shoe);
  if ((v.__tags || []).includes("half")) g.half = true;
  return g;
}

function euToUs(c: Ctx, n: number): number { return c.player.gender === "f" ? n - 31 : n - 33; }

function resetItem(c: Ctx, g: Garment | null) {
  c.s.item = g;
  c.s.tried = false; c.s.noTry = false; c.s.fitOk = false; c.s.fitDone = false; c.s.decision = undefined; c.s.wantTry = false;
}

/** The learner named or pointed at a garment (optionally with color and size). */
function applyItem(c: Ctx, g: Garment | null, opts: { pointing?: boolean } = {}) {
  c.s.retOffer = false;
  const before = cur(c);
  let target: Garment;
  if (g && (!before || before.id !== g.id)) {
    resetItem(c, { id: g.id });
    target = cur(c)!;
    if (!before && opts.pointing) c.say("ack_item");
    else c.say("ack_item");
  } else if (g) {
    target = before!;
  } else if (before) {
    target = before;
  } else {
    // "Do you have this in a medium?" with nothing named: the yellow jacket in the window.
    resetItem(c, { ...FEATURED });
    target = cur(c)!;
    c.say("confirm_featured");
  }
  if (g?.color) setColor(c, target, g.color);
  if (g?.size) setSize(c, target, g.size);
  if (g?.shoe != null) setShoe(c, target, g.shoe, !!g.half);
}

function setColor(c: Ctx, g: Garment, color: string): boolean {
  if (colorsOf(g.id).includes(color)) {
    g.color = color; // the same size in another color fits the same: the fitting stays valid
    return true;
  }
  sayN(c, "color_no", g, { C: color });
  sayColors(c, g);
  return false;
}

function sayColors(c: Ctx, g: Garment) {
  const [A, B, C] = colorsOf(g.id);
  c.say("color_list", { A, B, C });
  c.s.colorsListed = true;
}

function setSize(c: Ctx, g: Garment, size: string) {
  if (oneSize(g.id)) { c.say("one_size"); return; }
  if (isShoe(g.id)) { c.say("shoe_sizes_numbers"); return; }
  const changed = g.size && g.size !== size;
  g.size = size;
  if (changed) { c.s.tried = false; c.s.fitOk = false; }
}

/** A short acknowledgement ("Got it.") at most once per learner turn. */
function ack(c: Ctx) {
  if (!firstThisTurn(c, "ack")) return;
  c.say("size_ok");
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


/** Twist: "You're lucky, that's the last one!" (said once, after the size is settled). */
function maybeLastOne(c: Ctx) {
  if (!c.s.lastOneSaid && c.s.lastOne && c.chance(0.6)) { c.s.lastOneSaid = true; c.twist("last_one"); c.say("last_one"); }
}

function setShoe(c: Ctx, g: Garment, n: number, half = false, saidEu = false): boolean {
  if (!isShoe(g.id)) { c.say("which_size_letters"); return false; }
  if (n >= 33 && n <= 50) {
    const us = euToUs(c, n);
    g.shoe = us; g.half = false;
    c.say(saidEu ? "eu_size_known" : "eu_size", { num: us });
    return true;
  }
  if (n >= 4 && n <= 15) {
    g.shoe = n; g.half = half;
    return true;
  }
  c.say("shoe_size_again");
  return false;
}

function hasSize(g: Garment) { return oneSize(g.id) || (isShoe(g.id) ? g.shoe != null : !!g.size); }

// Checklist modes: shopping, or a return (also while Chloe's "Are you returning something?" is open).
const shopMode = (c: Ctx) => c.s.mode !== "return" && !c.s.retOffer;
const retMode = (c: Ctx) => c.s.mode === "return" || !!c.s.retOffer;
const inReturn = (c: Ctx) => c.s.mode === "return" && !!c.s.ret;
/** Shopping with a garment in hand. */
const shopping = (c: Ctx) => c.s.mode !== "return" && !!cur(c);

/** Try it on: fitting rooms, then wait for the learner's report on the fit. */
function doTry(c: Ctx) {
  const g = cur(c)!;
  c.s.tried = true; c.s.wantTry = false;
  if (isShoe(g.id)) sayN(c, "shoes_here", g, { num: g.shoe });
  else if (!oneSize(g.id) && g.size && c.chance(0.6)) c.say("size_here", { S: g.size });
  if (isShoe(g.id)) c.say("try_seat");
  else c.say("fitting_rooms");
  sayN(c, "let_me_know");
  c.expect(fitPending(c));
}

function fitPending(c: Ctx): Pending {
  const g = cur(c)!;
  return {
    id: "fit", expects: ["fit_bad", "fit_good", "fit_unclear", "take_it"], hints: [itemHint("fit", g.id), isShoe(g.id) ? "shoe_size" : "size"],
    suggest: [
      { lt: "Pasakyti, kaip tinka", hint: itemHint("fit", g.id) },
      { lt: "Paprašyti kito dydžio", hint: isShoe(g.id) ? "shoe_size" : "size", options: isShoe(g.id) ? undefined : "size" },
    ],
    on: {
      fit_bad: (cc, sl, seg) => { clothes.handlers.fit_bad(cc, sl, seg); },
      fit_good: (cc, sl, seg) => { clothes.handlers.fit_good(cc, sl, seg); },
      fit_unclear: (cc, sl, seg) => { clothes.handlers.fit_unclear(cc, sl, seg); },
      take_it: (cc, sl, seg) => { cc.s.fitOk = true; clothes.handlers.take_it(cc, sl, seg); },
      g_ok: (cc) => { fitGood(cc); },
    },
    yes: (cc) => { fitGood(cc); },
    no: (cc) => { cc.say("fit_which"); cc.expect(fitWhich(cc)); },
    ask: (cc) => sayN(cc, "ask_fit"),
  };
}

function fitWhich(c: Ctx): Pending {
  const p = fitPending(c);
  const hint = itemHint("fit_which", cur(c)!.id);
  return { ...p, id: "fit_which", ask: (cc) => cc.say("fit_which"),
    suggest: [{ lt: "Pasakyti, ar dydis per didelis, ar per mažas", hint }, ...p.suggest!.slice(1)], hints: [hint, ...p.hints!] };
}

function fitGood(c: Ctx) {
  c.s.fitOk = true;
  if (c.chance(0.75)) sayN(c, "compliment");
  else c.say("fit_ok");
}

function changeSize(c: Ctx, dir: "up" | "down") {
  const g = cur(c)!;
  if (oneSize(g.id)) { c.say("one_size"); return false; }
  if (isShoe(g.id)) {
    const n = (g.shoe ?? 9) + (dir === "up" ? 1 : -1);
    g.shoe = n; g.half = false;
    c.say(dir === "up" ? "size_up_get" : "size_down_get");
    return true;
  }
  const i = SIZE_ORDER.indexOf(g.size ?? "medium");
  const j = i + (dir === "up" ? 1 : -1);
  if (j < 0 || j >= SIZE_ORDER.length) { c.say(dir === "up" ? "no_bigger" : "no_smaller"); return false; }
  g.size = SIZE_ORDER[j];
  c.say("size_change", { S: g.size });
  return true;
}

function startReturn(c: Ctx, g: Garment | null) {
  c.s.mode = "return";
  const mem = c.memory.lastBought as Garment | undefined;
  const base: Garment = mem ? { ...mem } : { id: "jacket", color: "yellow", size: "medium", paid: basePrice("jacket") };
  c.s.ret = { item: g && g.id !== base.id ? { id: g.id, paid: basePrice(g.id) } : base } as Ret;
}

function reasonFromTags(tags: string[]): string | null {
  for (const k of ["up", "down", "ran", "shrank", "hole", "zipper", "button", "damaged", "mind", "dislike", "nofit", "gift"]) if (tags.includes(k)) return k;
  return null;
}

function reactReason(c: Ctx, reason: string) {
  const r = ret(c);
  r.reason = reason;
  if (["ran", "hole", "zipper", "button", "damaged", "shrank"].includes(reason)) c.say("ret_sorry");
  else if (["up", "down", "nofit"].includes(reason)) c.say("ret_size_happens");
  else c.say("ret_fine");
}

// ---------------------------------------------------------------------------
// Hint helpers: the same expression in singular / Lithuanian-plural / English-plural variants.

type GN = "m" | "f" | "mpl" | "fpl";
const gnOf = (e: EntityDef): GN => (e.attrs?.ltPl ? (e.g === "m" ? "mpl" : "fpl") : e.g);
const ENPL = (e: EntityDef) => !!e.attrs?.enPl;
const plAgree = (s: string) => s.replace(/(\{[a-ząčęėįšųūž]+@X:(?:nom|gen|dat|acc|ins|loc))\}/g, "$1:pl}");

/** Three variants: EN "it"/LT singular, EN "it"/LT plural (shirts), EN "them"/LT plural. */
function hv(id: string, enSg: string, enPlS: string, lt: string, nat: string, extra: Partial<SentSrc> = {}, more: Partial<HintItem> = {}, f: (e: EntityDef) => boolean = () => true): HintItem[] {
  return [
    { id, s: t(enSg, lt, nat, extra), only: (e) => f(e) && !ENPL(e) && !e.attrs?.ltPl, ...more },
    { id, s: t(enSg, plAgree(lt), plAgree(nat), extra), only: (e) => f(e) && !ENPL(e) && !!e.attrs?.ltPl, ...more },
    { id, s: t(enPlS, plAgree(lt), plAgree(nat), extra), only: (e) => f(e) && ENPL(e), ...more },
  ];
}

const PRON: Record<GN, string> = { m: "Jis", f: "Ji", mpl: "Jie", fpl: "Jos" };
const ADJ: Record<string, Record<GN, string>> = {
  small: { m: "mažas", f: "maža", mpl: "maži", fpl: "mažos" },
  big: { m: "didelis", f: "didelė", mpl: "dideli", fpl: "didelės" },
  tight: { m: "ankštas", f: "ankšta", mpl: "ankšti", fpl: "ankštos" },
  long: { m: "ilgas", f: "ilga", mpl: "ilgi", fpl: "ilgos" },
};
const COMBOS: [GN, boolean][] = [["m", false], ["f", false], ["mpl", false], ["mpl", true], ["fpl", true]];

/** Fit sentences whose Lithuanian subject pronoun opens the sentence (capitalised, so written per gender). */
function hg(id: string, enSg: string, enPlS: string, lt: (gn: GN) => string, nat: (gn: GN) => string, extra: Partial<SentSrc> = {}): HintItem[] {
  return COMBOS.map(([gn, pl]) => ({ id, s: t(pl ? enPlS : enSg, lt(gn), nat(gn), extra), only: (e: EntityDef) => gnOf(e) === gn && ENPL(e) === pl }));
}

/** Hint group order for the guide, which shows the first items as model answers: variant i of every
 *  expression goes to block i (block 0 = singular, also plain items), so the first items are always
 *  different expressions, whether or not the learner picked a garment chip. */
function ordered(...entries: (HintItem | HintItem[])[]): HintItem[] {
  const blocks: HintItem[][] = [];
  entries.forEach((e, k) => (Array.isArray(e) ? e : [e]).forEach((it, i) => { ENTRY.set(it, k); (blocks[i] ??= []).push(it); }));
  return blocks.flat();
}
/** The position of each item's expression in its group (per-garment copies list them in this order). */
const ENTRY = new WeakMap<HintItem, number>();

const FLAG_DO = "Question “Do” = the particle ar.";
const FLAG_WOULD = "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte.";
const FLAG_TRY_ON = "Discontinuous “try … on”: the prefix and reflexive of pasimatuoti carry “on” (linked to “try”).";

// Automatic answers for the simulation when Chloe asks an optional question.
const AUTO: Record<string, string> = {
  return_q: "No, I'm just looking, thanks.", item: "I'm looking for a jacket.", size: "Medium, please.", shoe: "Size nine, please.",
  color: "Black, please.", tryon: "Yes, please.", fit: "It fits perfectly.", fit_which: "It fits perfectly.", decide: "I'll take it.",
  rewards: "No, thanks.", rewards_join: "No, thanks.", pay: "Card, please.", bag: "Yes, please.", receipt: "Printed, please.",
  else_q: "No, thanks.", r_receipt: "Yes, here it is.", r_reason: "It's too small.", r_choice: "An exchange, please.", r_new: "A large, please.",
};

// ---------------------------------------------------------------------------

export const clothes: SituationDef = {
  id: "s74-clothes",
  song: 74,
  songTitle: "Can I Try It On?",
  title: { en: "Can I Try It On?", lt: "Ar galiu pasimatuoti?" },
  topic: { en: "Clothes shopping", lt: "Drabužių parduotuvėje" },
  chapter: 3,
  order: 6,
  location: "threads",
  npc: "chloe",
  goal: "Išsirink drabužį, pasimatuok ir nusipirk (ar pasikeisk).",
  intro: "„Threads“ – drabužių parduotuvė pagrindinėje gatvėje. Vitrinoje kabo ryški geltona striukė. Pardavėja Chloe tvarko lentynas.",
  entities: { clothing: CLOTHING, color: COLORS, size: SIZES },

  merges: {
    "i'm looking for": { reason: "grammatical_fusion", split: "I'm → aš esu + looking → žiūrintis + for → už is false; the progressive of the prepositional verb “look for” = ieškau (+ genitive).", minimal: "The object stays outside." },
    "looking for": { reason: "grammatical_fusion", split: "looking → žiūrintis + for → už is false; “look for” = ieškoti (+ genitive).", minimal: "Two words." },
    "in particular": { reason: "lexical_expression", split: "in → į + particular → ypatingas is false; = konkretaus.", minimal: "Two words." },
    "let me know": { reason: "lexical_expression", split: "let → leiskite + me → man + know → žinoti is a calque; = pasakykite.", minimal: "All three words form the request." },
    "right here": { reason: "lexical_expression", split: "right → dešinėje/teisingai + here → čia is false; the intensifier = čia pat.", minimal: "Two words." },
    "right this way": { reason: "lexical_expression", split: "right → dešinėn + this → šiuo + way → keliu is a literal reading of a set phrase for leading a customer; = prašom čia.", minimal: "All three words form the phrase." },
    "fitting rooms": { reason: "lexical_expression", split: "fitting → tinkantis + rooms → kambariai names nothing; the compound = matavimosi kabinos.", minimal: "Compound noun." },
    "fitting room": { reason: "lexical_expression", split: "fitting → tinkantis + room → kambarys names nothing; the compound = matavimosi kabina.", minimal: "Compound noun." },
    "try on": { reason: "lexical_expression", split: "on → ant is false; “try on” (clothes) = pasimatuoti.", minimal: "Two words (C-PHR)." },
    "on sale": { reason: "lexical_expression", split: "on → ant + sale → išpardavimas is a literal reading; “on sale” = su nuolaida.", minimal: "Two words." },
    "come in": { reason: "lexical_expression", split: "come → ateiti + in → į is false; a product “comes in” a color = tokių būna.", minimal: "Two words." },
    "comes to": { reason: "lexical_expression", split: "comes → ateina + to → į is false; a total “comes to” = sudaro.", minimal: "Two words." },
    "let me check": { reason: "lexical_expression", split: "let → leiskite + me → man + check → patikrinti is a calque; a clerk's “let me check” = pažiūrėsiu.", minimal: "All three words." },
    "let's try": { reason: "grammatical_fusion", split: "Let's → leiskime + try → bandyti is a calque; the first person plural imperative = pabandykime.", minimal: "Two words (C-LEX, like “Let's stay → likime”)." },
    "let's go": { reason: "grammatical_fusion", split: "Let's → leiskime + go → eiti is a calque; the first person plural imperative = eikime.", minimal: "Two words." },
    "you're lucky": { reason: "lexical_expression", split: "You're → jūs esate + lucky → laimingas gives “you are happy”; = jums pasisekė.", minimal: "Two words (C-LEX)." },
    "a little": { reason: "lexical_expression", split: "a → — + little → mažas gives a false “small”; the degree adverb = truputį.", minimal: "Two words (C-LEX)." },
    "here are": { reason: "lexical_expression", split: "here → čia + are → yra is false; the presentative = štai.", minimal: "Two words." },
    "by the way": { reason: "lexical_expression", split: "by → pro + the → — + way → kelias is false; = beje.", minimal: "All three words." },
    "came in": { reason: "lexical_expression", split: "came → atėjo + in → į; new stock that “came in” = atkeliavo.", minimal: "Two words." },
    "stopping by": { reason: "lexical_expression", split: "stopping → sustojant + by → pro is false; “stop by” = užsukti.", minimal: "Two words (C-PHR)." },
    "show up": { reason: "lexical_expression", split: "show → rodyti + up → aukštyn is false; money that “shows up” = atsiranda.", minimal: "Two words (C-PHR)." },
    "changed my mind": { reason: "lexical_expression", split: "changed → pakeičiau + my → savo + mind → protą is a calque; = persigalvojau.", minimal: "All three words." },
    "this one": { reason: "grammatical_fusion", split: "one → vienas would add a false numeral; the prop-word is absorbed by the demonstrative (šitas / šita).", minimal: "Two words (C-ONE)." },
  },

  grammar: {
    macros: {
      gdet: "(a | an | the | this | that | these | those | one | some | any | my | your | a pair of #pair | the pair of #pair | this pair of #pair | that pair of #pair | pair of #pair | a new #new | new #new)",
      color_post: "(in {color} | in the color {color} | in the {color} color)",
      size_post: "(in (a | an) {size} | in {size} | in [a] size {size} | size {size} | in [a] [size] {shoe:number} [and a half #half] | [in] [a] size {shoe:number} [and a half #half])",
      it_ref: "(it | this | that | these | those | them | they | this one | that one | the same one | the same thing | this style | the same style)",
      look_pre: [
        "i am looking for #h:look_for", "i am just looking for #h:look_for", "i am trying to find", "i am looking to buy", "i am after #tip:uk_after",
        "i need", "i would like", "i would like to (see | buy | get | look at)", "i want #blunt", "i want to (buy | see | get) #blunt",
        "(can | could | may) i see #h:can_i_see", "(can | could | may) i (have a look at | look at | take a look at)", "(can | could) you show me",
        "do you (have | sell | carry) [any] #h:q_have_any", "have you got [any]", "where (can i find | do you have | do you keep | are) [the | your] #h:q_where",
        "i am interested in", "i (like | love) #h:i_like", "i really like",
        "i am searching for", "(can | could) you help me find", "i (search | look) for", "i search", "show me #blunt", "i want [to] (look | look at | see) #blunt",
      ],
      fit_subj: "(it is | it is a | they are | this is | these are | that is | those are | it feels | they feel | it looks | they look | this one is | (the | my | this | that | these | those) {clothing} (is | are | feels | feel) | the {size} is)",
      deg: "(a little | a bit | a little bit | kind of | sort of | way | really | much | slightly | just a little | just a bit | definitely | still | maybe)",
      where_tail: "(in the window | on the mannequin | on the rack | over there | on the wall | on that table | on the front table)",
      exch_for: "for (a | an | the) {size} | for a (bigger #up | larger #up | smaller #down | different) size | for (the | a) {color} one | for another (size | color) | for [a] size {shoe:number} | for {item}",
      too_adj: "too (small #up #h:fit_small | tight #up | short #up | big #down #h:fit_big | large #down #h:fit_big | loose #down | baggy #down | long #down #h:fit_long | wide #down)",
      // "a warm coat", "pants for work"
      adj: "(warm | light | nice | new | cheap | casual | formal | simple | comfortable | long | short | cotton | wool | woolen | leather | summer | winter | elegant | warmer | good | pretty | mens | men is | womens | women is | ladies | kids | childrens)",
      for_post: "for (work | the office | winter | the winter | summer | the summer | a party | a wedding | a gift | me | my (wife | husband | son | daughter | mother | mom | father | dad | girlfriend | boyfriend | friend))",
      body: "(the | my) (sleeves | arms | legs | waist | shoulders | chest | length | neck) (is | are)",
    },
    slots: {
      brit_clothing: { lexicon: [
        { id: "sweater", forms: ["jumper", "jumpers"], tags: ["tip:uk_jumper"] },
        { id: "pants", forms: ["trousers", "pair of trousers"], tags: ["tip:uk_trousers"] },
        { id: "sneakers", forms: ["trainers", "trainer"], tags: ["tip:uk_trainers"] },
      ] },
      item: { pattern: [
        "[@gdet] [{size}] [{color}] {clothing} [@color_post] [@size_post]",
        "[@gdet] [{color}] {clothing} [@size_post] [@color_post]",
        "[@gdet] [{color}] {clothing:brit_clothing} [@color_post] [@size_post]",
        "[@gdet] [@adj] [{color}] [@adj] {clothing} [@color_post] [@size_post] [@for_post]",
      ] },
    },
  },

  intents: {
    // --- browsing and naming an item -------------------------------------------------------
    just_looking: { patterns: [
      "[i am] just (looking | browsing) [around] [for now | today] #h:browse_just",
      "[i am] (fine | good | okay | all good) [thanks | thank you] [i am] just (looking | browsing) [around] #h:browse_fine",
      "(i am | i am just) (having | taking) a look [around]", "just (having | taking) a look [around]",
      "not right now [thanks] [i am] [just] [looking | browsing] #h:browse_not_now", "i am (fine | good) for now",
      "i am just (looking | browsing) (for now | right now | at the moment)",
      "(can | could | may) i (look | have a look) around", "i will [just] look around [first]", "i [just] (want | would like) to (look | have a look | browse) [around]",
    ] },
    // "No, I'm fine / okay" = a polite no to whatever Chloe just offered (help, trying on, a bag, a receipt…)
    im_fine_ctx: { patterns: ["[no] i am (okay | ok | good | fine | all good | all set) [thanks | thank you] [for now]", "[no] i am not a member [yet]", "[no] i do not have (an account | one | a card | a rewards account)"] },
    // "I'm looking for something warm" / "a gift": Chloe points out the new jacket
    vague_item: { patterns: [
      "@look_pre (something | anything) [warm | nice | new | casual | formal | cheap | warmer] [for (work | winter | summer | the winter | a party | a wedding | my (wife | husband | son | daughter | mother | father))]",
      "@look_pre a (gift | present) [for my (wife | husband | son | daughter | mother | mom | father | dad | friend | girlfriend | boyfriend)]",
    ] },
    looking_for: { patterns: [
      "@look_pre {item} [@where_tail]", "@look_pre (a | an | some) new {item}",
      "i am looking for (a | an) {item} for (work | the winter | a party | a wedding | my (wife | husband | son | daughter))",
    ] },
    item_short: { patterns: ["[just] {item}", "{item} @where_tail"] },
    looking_unknown: { patterns: ["@look_pre {w:any}"] },
    change_item: { patterns: [
      "[actually] (can | could) i (see | try | look at) {item} instead", "[actually] {item} instead", "[actually] (what about | how about) {item}",
      "[actually] i would (like | prefer) {item} instead",
    ] },

    // --- size ------------------------------------------------------------------------------
    size_ans: { patterns: [
      "[a | an] {size} #h:size_short", "(usually | normally) [a | an] {size}", "[the same] [but] in [a | an] {size}", "[a | an | the] {size} one", "(i am | i am usually | i am normally | usually i am | i think i am) [a | an] {size} #h:size_im",
      "i (usually | normally | always) (wear | take | get) [a | an] {size} #h:size_wear", "i (wear | take) [a | an] {size}",
      "[i think] (a | an) {size} (would be | is | should be) (fine | good | right | okay)", "{size} (i think | probably | should be fine | is fine | works)",
      "probably [a | an] {size}", "[size] {size} [please]", "(let me | can i | could i) (try | get | have) (a | an | the) {size}",
      "(a | an) {size} (would be | is) (great | perfect)", "(in | in a | in an) {size}",
      "(i need | i would like | i will take | i will have | i will go with | let me get | can i get) [a | an] {size} [please]", "(give me | i want) [a | an] {size} #blunt",
      // the size, then why: "Small, I'm not very big", "Medium, I'm quite tall"
      "{size} [because] i am [not] (very | quite | pretty | a bit | a little | that | so | really) (big | tall | small | short | slim | thin | petite | skinny)",
    ] },
    ask_sizes: { patterns: [
      "what sizes (do you have | does it come in | do they come in | are there) #h:q_sizes", "what size is (it | this | that | this one)", "is (it | this) one size [fits all]",
      "(do you have | are there) (other | different | more) sizes", "what sizes", "(does it | do they) come in (other | different) sizes",
    ] },
    ask_have_size: { patterns: [
      "(do you have | have you got | is there) (@it_ref | one) in (a | an) {size} #h:have_size", "(do you have | have you got) (@it_ref | one) in {size}",
      "(do you have | have you got | is there) (@it_ref | one) in [a] size {size}", "(do you have | have you got | is there) (a | an) {size} [in (@it_ref)]",
      "(can | could) i (get | have | try) (@it_ref) in (a | an | the) {size}", "(can | could | may) i (get | have | try) (a | an | the) {size} [instead]",
      "(what | how) about (a | an | the) {size}", "do you have any {size}", "(do you have | have you got) (a | an) {size} (one | size)",
      "(do you have | have you got | is there) [(@it_ref) in] a (bigger | larger) size #up #h:size_up", "(do you have | have you got | is there) [(@it_ref) in] a smaller size #down #h:size_down",
      "(can | could) i (try | get | have) a (bigger | larger) (size | one) #up", "(can | could) i (try | get | have) a smaller (size | one) #down",
      "(do you have | have you got | can i try | can i get) a size up #up", "(do you have | have you got | can i try | can i get) a size down #down",
      "[a] (bigger #up | larger #up | smaller #down) (size | one) [please]", "(a | one) size (bigger #up | larger #up | smaller #down | up #up | down #down)",
      "the same [color] [but] (bigger #up | larger #up | smaller #down)",
      "(i need | i think i need | maybe i need) a (bigger | larger) (size | one) #up", "(i need | i think i need | maybe i need) a smaller (size | one) #down",
      "(do you have | have you got) (@it_ref) in [a] [size] {shoe:number} [and a half #half]", "(can | could) i (try | get | have) [(@it_ref) in] [a] size {shoe:number} [and a half #half]",
    ] },
    size_unknown: { patterns: [
      "i do not know my (size | us size | american size | size here) [in america]", "i am not sure (about my size | what size i am | what my size is | of my size) #h:size_unsure",
      "what size (am i | do i need | should i get | should i try | do you think)", "i do not know (what size i am | my us size)",
    ] },
    shoe_size: { patterns: [
      "[a] size {shoe:number} [and a half #half] #h:ss_size", "i (wear | take | am) [a] size {shoe:number} [and a half #half] #h:ss_wear",
      "i (wear | take) (a | an) {shoe:number} [and a half #half] #h:ss_wear", "(i am | i wear) [a | an] {shoe:number} [and a half #half] (in european sizes | in european | in eu sizes | european | in europe) #eu #h:ss_eu",
      "{shoe:number} [and a half #half] (in european sizes | european | in eu sizes | in europe) #eu #h:ss_eu", "(i am | i wear) [a | an] {shoe:number} and a half #half #h:ss_half",
      "in europe i (wear | am | take) [a | size] {shoe:number} [and a half #half] #eu", "(us | american) [size] {shoe:number} [and a half #half]",
      "(european | eu | europe) [size] {shoe:number} [and a half #half] #eu",
    ] },
    shoe_size_ctx: { patterns: ["[a | an] {shoe:number} [and a half #half #h:ss_half]", "{shoe:number} [and a half #half] i think", "(i am | i am usually) [a | an] {shoe:number} [and a half #half]"] },

    // --- color -----------------------------------------------------------------------------
    color_ans: { patterns: [
      "[in] {color} #h:color_short", "[in] (the | a) {color} one", "(i would like | i will have | i will go with | can i (get | have) | could i (get | have)) [it | them | one | the one] in {color}",
      "(i would like | i will have | i will go with | can i (get | have)) the {color} one", "i will go with [the] {color} [one]", "(let us | let me) go with [the] {color} [one]", "{color} (is fine | is good | would be great | would be nice | works | is great)",
      "i (like | prefer | love) [the] {color} [one | color]", "(let us | let me) go with {color}", "{color} i think", "maybe {color}",
      "i will take the {color}", "{color} (is nice | is better | is beautiful | is good | is perfect)", "{color} looks (better | good | nice | great)", "[the | a] {color} one",
    ] },
    ask_have_color: { patterns: [
      "(do you have | have you got) (@it_ref | one) in {color} #h:have_color", "(does | do) (@it_ref) come in {color} #h:come_in",
      "(is | are) (@it_ref) available in {color}", "(do you have | have you got | is there) (a | one) in {color}",
      "(can | could) i (get | have | see | try) (@it_ref | one) in {color}", "(what | how) about {color}", "(what | how) about (the | a) {color} one",
      "(do you have | have you got) (a | the) {color} one",
    ] },
    ask_colors: { patterns: [
      "what colors (do you have | does it come in | do they come in | are there | is it available in) #h:q_colors",
      "(do you have | have you got | are there) (any | other | any other | different | more) colors #h:q_other_colors",
      "(does it | do they) come in (any | other | any other | different) colors", "(do you have | have you got) (@it_ref) in (another | a different | any other) color",
      "(what | which) other colors (do you have | are there)", "what colors", "is it (available | only) in (this | one) color",
    ] },
    dislike_color: { patterns: ["i do not (like | love) the color #h:not_color", "i do not (like | love) [the] {color} [one | color]", "[the] {color} is not (for me | my color | nice)", "i do not really like the color", "the color is not (for me | my style | great)", "not (this | that) color", "i am not sure about the color"] },

    // --- fitting room and fit --------------------------------------------------------------
    try_on: { patterns: [
      "(can | could | may) i try (@it_ref | {item}) on #h:try_can", "(can | could | may) i try on (@it_ref | {item}) #h:try_the",
      "(i would like | i want) to try (@it_ref | {item}) on", "(i would like | i want) to try on (@it_ref | {item})",
      "(let me | i will | i am going to) try (@it_ref | {item}) on", "(where | where can) i try (@it_ref | {item}) on",
      "is it (okay | all right) if i try (@it_ref) on", "(can | could | may) i try (it | them | this | these)",
      "(let me | i will | i want to | i would like to) try (it | them | this | these) [on]", "i can try [it | them | this | these] [on]",
    ] },
    // "Yes, I'd like to" (to "Would you like to try it on?")
    try_yes_ctx: { patterns: ["[yes] (i would like to | i want to | i would love to) [try (it | them) [on]]", "[yes] let me try"] },
    no_try: { patterns: [
      "[no] [thanks] i do not need to try (it | them | this | these) on", "[no] [thanks] i do not (need | want) to try (it | them) [on]",
      "[no] [thanks] i will not try (it | them) on", "[no] no need to try (it | them) [on]", "i am sure (it | they) will fit", "i know my size",
      "i am sure (it fits | they fit)",
    ] },
    ask_fitting_room: { patterns: [
      "where (is | are) the (fitting room | fitting rooms | dressing room | dressing rooms) #h:q_fitting", "where (is | are) the (changing room | changing rooms) #tip:uk_changing",
      "(do you have | is there) a (fitting | dressing) room", "(do you have | is there) a changing room #tip:uk_changing", "where can i (change | try things on)",
    ] },
    fit_bad: { patterns: [
      "[@fit_subj] [@deg] @too_adj [for me | on me]", "@fit_subj [@deg] (tight | snug) #up #h:fit_tight", "@fit_subj [@deg] (loose | baggy) #down",
      "@deg (tight | snug) #up [for me | on me]", "@deg (loose | baggy) #down [for me | on me]", "@deg (small #up | short #up | big #down | large #down | long #down | wide #down) [for me | on me]",
      "is [@deg] @too_adj [for me | on me]",
      "@body [@deg] @too_adj", "[@fit_subj] [@deg] @too_adj (around | in) the (shoulders | chest | waist | arms | legs | hips)",
      "@body @deg (long #down | short #up | tight #up | loose #down | wide #down)", "[@fit_subj] [@deg] (tight #up | loose #down) (around | in) the (shoulders | chest | waist | arms | legs | hips)",
      "(it is | they are) not (big | large | long) enough #up", "(i need | i think i need | can i (get | try | have)) a size (up #up | down #down)",
      "@fit_subj @deg (small #up | short #up | big #down | large #down | long #down | wide #down)",
    ] },
    fit_unclear: { patterns: [
      "(it | this | this one | that one) does not fit [me] [well | very well | right | at all]", "(they | these) do not fit [me] [well | very well | right | at all]",
      "(it is | they are) the wrong size", "i do not think (it fits | they fit)", "the size is (wrong | not right)", "(it is | they are) not (right | good)",
      "(the | this | my) {clothing} (is | are) not (right | good | okay | ok) [on me]",
    ] },
    fit_good: { patterns: [
      "(it | this | this one | that one | the {size}) fits [me] [really | just] (perfectly #h:fit_perfect | well | great | fine | nicely | right | like a glove)",
      "(they | these) fit [me] [really | just] (perfectly #h:fit_perfect | well | great | fine | nicely | right | like a glove)", "(it fits | they fit)",
      "(it is | they are | this is | this one is | these are) (perfect | just right | a perfect fit | great | the right size | really comfortable | comfortable | very comfortable | really nice)",
      "(it | they) (feels | feel | looks | look) [really] (great | good | perfect | nice | amazing | fine)", "[it is] perfect", "[it is | they are] just right",
      "i (love | like) (it | them | this | this one | these) [a lot | so much]", "the size is (perfect | good | right | fine | great)", "(this | the) {size} is (perfect | better | great | good | fine)",
      "(it is | they are) not too (small | big | tight | loose | long | short | large)",
      "(it is | they are) (okay | ok | fine | good | nice | beautiful | lovely | pretty | very nice | so nice)", "not (bad | too bad)", "[a] perfect fit",
    ] },
    sweet: { patterns: ["(you are | that is) (so | very | really) (sweet | kind | nice)", "that is (very | really | so) kind of you", "you are too kind", "aw thank you"] },

    // --- price, sale, tax, decision --------------------------------------------------------
    ask_price: { patterns: [
      "how much (is | does) (@it_ref | {item}) [cost] #h:q_price", "how much (are | do) (@it_ref | {item}) [cost] #h:q_price",
      "how much [is it | are they]", "what is the price [of (@it_ref | {item})]", "(what does | what do) (@it_ref | {item}) cost",
      "how much (is | are) (it | they | this | these) (with the discount | on sale | now | with tax)", "what is the price on (it | this | the tag)",
    ] },
    ask_sale: { patterns: [
      "(is | are) (@it_ref | {item}) on sale #h:q_sale", "(is | are) (@it_ref | {item}) in the sale #tip:uk_sale",
      "(is there | do you have) (a | any) (sale | discount | deal) [on (@it_ref | {item})]", "(are there | do you have) any (sales | discounts | deals | coupons)",
      "(is | are) (@it_ref) discounted", "any discounts", "is there a discount", "is (it | this | that) the sale price",
    ] },
    ask_tax: { patterns: [
      "is [the | sales] tax included #h:q_tax", "(does | do) (the price | it | that | this | they) include [the | sales] tax", "is that (with | before | including | plus) tax",
      "plus tax", "(what about | is there) [sales] tax", "is the price with tax", "(does | do) i (pay | have to pay) tax",
    ] },
    ask_return_policy: { patterns: [
      "what is (your | the) return policy #h:q_return", "(can | could) i return (it | them | this | these) (later | if it does not fit | if they do not fit | if i do not like it)",
      "can i (return | exchange) (it | them) if (i do not like (it | them) | it does not fit | they do not fit)", "how long do i have to return (it | them)",
      "what if (it does not | they do not) fit", "(do you | can i) (do returns | do exchanges)",
    ] },
    take_it: { patterns: [
      "i will take (it | them | this | these | that | those | this one | that one | the {color} one | both) #h:take_it", "i will take {item} #h:take_it",
      "i will (get | buy) (it | them | this | these | this one | that one | {item})", "i would like to (buy | get | take) (it | them | this | these | this one | {item})",
      "i think i will (take | get | buy) (it | them | this one)", "i am going to (take | get | buy) (it | them)",
      "i want (it | them | this one | this | these) #blunt", "(can | could) you ring (it | them | this | me) up", "ring (it | them) up", "sold", "i take (it | them | this | these | this one)",
      "[yes] (it is | that is) a yes", "let us do it",
    ] },
    think_about_it: { patterns: [
      "i will think about it #h:think", "i (need | want | would like) to think about it", "let me think about it", "i will (come back | be back) [later | tomorrow]",
      "maybe (later | another time | next time)", "i will look around [a bit] [first]", "i am not (sure | ready) yet", "i am still (thinking | deciding)",
    ] },
    not_take: { patterns: [
      "i do not (like | want | need | love) (it | them | this | that | these | this one | that one | {item})", "i do not really (like | want | love) (it | them | this | this one)",
      "(it is | that is | they are) not (for me | my style | really my style | really me) #h:not_style", "(it is | that is) not really (for me | my style) #h:not_style",
      "i will not (take | buy) (it | them)", "i do not think (it is | they are) for me", "i do not want to (buy | take | get) (it | them | this)",
      "[no] not (this | that) one", "[no] not (these | those) [ones]", "i will leave (it | them)",
    ] },
    too_expensive: { patterns: [
      "(it is | that is | they are | this is) [a little | a bit | kind of | way | just] too expensive [for me] #h:too_expensive",
      "(that is | it is) (expensive | pricey | a bit pricey | a lot)", "(do you have | is there) (anything | something) cheaper", "that is more than i wanted to spend",
      "(do you have | is there) (it | this | one | them) cheaper", "(do you have | is there) a cheaper (one | jacket | option)",
    ] },

    // --- paying ------------------------------------------------------------------------------
    pay_card: { patterns: [
      "[can | could] i pay (by | with) (card | credit card | debit card | my card | credit) #h:pay_card", "(by | with) card",
      "(contactless | visa | mastercard | amex)", "here is my (card | credit card | debit card)",
      "card #h:pay_card_short", "(i will | i would like to | i am going to) pay (by | with) (card | credit card | debit card | my card | a card)", "do you (take | accept) (cards | credit cards | card | visa | mastercard)",
      "can i (use | tap) my card", "[a] (credit | debit) card", "card is (fine | okay | ok)",
    ] },
    // "I don't have cash": so it's the card (never read as "cash")
    no_cash: { patterns: ["(i | we) do not have [any | enough] cash", "no cash [sorry]", "(i | we) (can not | do not want to) pay (in | with) cash", "i have no cash"] },
    pay_cash: { patterns: ["[can | could] i pay (in | with) cash", "(in | with) cash", "cash", "(i will | i would like to | i am going to) pay (in | with) cash #h:pay_cash", "i will pay cash", "cash is (fine | okay | ok)"] },
    pay_phone: { patterns: ["(can | could) i pay (with | by) (my phone | apple pay | google pay | phone)", "(can | could) i use (apple pay | google pay | my phone)",
      "(i will | i would like to | i am going to) pay (with | by) (my phone | phone | apple pay | google pay)", "do you (take | accept) (apple pay | google pay) #h:apple_pay", "apple pay", "google pay"] },
    here_you_go: { patterns: ["here you (go | are) #h:here_you_go", "there you go", "here it is", "here is my card", "here is {price}", "here is (the | my) money", "here"] },
    keep_change: { patterns: ["keep the change", "you can keep the change"] },
    ask_where_pay: { patterns: ["where (do | can) i pay", "where is the (register | checkout | cash register)", "where is the till #tip:uk_till"] },

    // --- bag and receipt -------------------------------------------------------------------
    wear_it: { patterns: [
      "[no] [thanks] i will wear (it | them) [now | out | out of the store | right away] #h:wear_it", "(can | could) i wear (it | them) [now | out | right away]",
      "i am going to wear (it | them) [now | out | right away]", "i (want | would like) to wear (it | them) [now | out | right away]",
      "(can | could) you (cut | take) (off the tags | the tags off | off the tag | the tag off)", "just cut (off the tag | the tag off | off the tags | the tags off)",
    ] },
    no_bag: { patterns: ["(i do not need | no need for) a bag", "no bag [thanks | needed]", "i (have | brought) my own bag", "i am fine without a bag",
      "i will put (it | them) in my (bag | backpack | purse)", "[no] i do not need (it | one | a bag)", "just the receipt [and] no bag"] },
    want_bag: { patterns: ["[yes] (a | one) [small | paper | plastic | big] bag [please]", "[yes] a bag would be (great | nice | good)", "(can | could) i (have | get) a bag"] },
    gift_receipt: { patterns: ["(can | could) i (get | have) a gift receipt #h:gift_receipt", "[a] gift receipt", "it is a (gift | present)", "(can | could) you (include | add) a gift receipt"] },
    receipt_bag: { patterns: ["[yes] (in the bag | put it in the bag)", "(printed | print it | paper) [is fine]", "(can | could) you put it in the bag"] },
    receipt_email: { patterns: ["(email | email it | by email) [is fine]", "(can | could) you email it [to me]", "[yes] emailed", "(send it | email it) to my email", "(to | on) my email"] },
    no_receipt: { patterns: ["(i do not need | no need for) a receipt", "no receipt [needed]", "(i do not need | no need for) [a] gift receipt"] },
    // "No, I don't need it" (to "Would you like your receipt printed or emailed?")
    receipt_no_ctx: { patterns: ["[no] i do not need (it | one | that)", "[no] (it is | that is) not necessary"] },
    rewards_member: { patterns: ["(i am | i am already) a member", "i already have (an account | one | a card)", "yes i have an account"] },

    // --- returns and exchanges --------------------------------------------------------------
    return_item: { patterns: [
      "i would like to return (@it_ref | {item}) #h:ret_return", "i (need | want) to return (@it_ref | {item})", "(can | could | may) i return (@it_ref | {item}) #canret",
      "i am (here to return | returning) (@it_ref | {item})", "i would like to make a return", "i (need | want) to make a return", "i have a return",
      "i would like to return something", "i (bought | got) (@it_ref | {item}) here [last week | on saturday | yesterday | a few days ago] and i (would like | want) to return (it | them)",
      "[yes] i (bought | got) (@it_ref | {item}) here [last week | on saturday | yesterday | a few days ago]",
      "i would like to return (@it_ref | {item}) [that | which] i (bought | got) [here] [last week | on saturday | yesterday | a few days ago]",
    ] },
    exchange: { patterns: [
      "i would like to exchange (@it_ref | {item}) [@exch_for] #h:ret_exchange", "(can | could | may) i exchange (@it_ref | {item}) [@exch_for] #h:ret_exchange",
      "i (need | want) to exchange (@it_ref | {item}) [@exch_for]", "(can | could) i (swap | switch | change) (@it_ref | {item}) @exch_for",
      "[an] exchange #h:ret_exchange_short", "i will exchange (it | them)", "i would like to exchange (it | them) #h:ret_exchange_short",
      "[an] exchange [please] @exch_for", "(i want | i would like | i need | give me) (another | a different | other | an other) (size | color) [please]",
      "(i would like | can i (get | have) | could i (get | have) | i will take) an exchange #h:ret_exchange_an",
      "(i would like | can i (get | have) | could i (get | have)) (a | an) (bigger #up | larger #up | smaller #down | different) size [instead]",
      "(i would like | can i (get | have) | could i (get | have)) (it | them) in (a | an) {size} [instead]", "(i would like | can i (get | have) | could i (get | have)) (a | an | the) {size} [instead]",
      "(i would like | can i (get | have) | could i (get | have)) (it | them | one) in {color} [instead]", "(i would like | can i (get | have) | could i (get | have)) the {color} one [instead]",
      "i would like to exchange (it | them) for (a | an | the) {size}",
    ] },
    receipt_yes: { patterns: [
      "[yes] here (it is | is the receipt | is my receipt) #h:ret_receipt_here", "i have (the | my) receipt [here | right here]", "yes i have it [right here | here]",
      "[yes] it is (right here | in the bag)", "[yes] i kept the receipt",
      "[yes] (it is | i have it) (in my (bag | wallet | pocket | email) | on my phone)", "i have (the | a | an) [email] receipt (in my email | on my phone)",
    ] },
    receipt_none: { patterns: [
      "i do not have (the | a | my) receipt [anymore] #h:ret_no_receipt", "i lost (the | my) receipt", "i (can not | could not) find (the | my) receipt",
      "no receipt [sorry]", "i threw (it | the receipt) away", "i do not have it [anymore | with me]", "i do not think i have (it | the receipt)",
      "i lost it", "i (can not | could not) find it", "i do not have (the | my) receipt with me", "i (forgot | left) (it | the receipt | my receipt) at home",
    ] },
    problem: { patterns: [
      "the color ran [in the (rain | wash)] #ran #h:ret_ran", "(it | the color) (changed color | faded) [in the (rain | wash)] #ran", "it (turned | went) green [in the rain] #ran",
      "(it | they) shrank [in the wash] #shrank", "(there is | it has) a hole [in it] #hole", "the zipper (is broken | broke | does not work | is stuck) #zipper",
      "a button (fell off | is missing) #button", "(it is | it was) (damaged | broken | ripped | torn) #damaged", "i changed my mind #mind #h:ret_mind",
      "i do not (like | love) (it | them | the style) [anymore] #dislike", "(it is | they are) the wrong size #nofit", "i (bought | got) the wrong size #nofit",
      "(it | this) does not fit [me] [well] #nofit", "(they | these) do not fit [me] [well] #nofit", "it (was | is) a (gift | present) #gift",
      "(it | they) (does not | do not) (suit | look good on) me #dislike",
      "my (wife | husband | son | daughter | friend | girlfriend | boyfriend) (does not | did not) like (it | them) #dislike", "the quality is (bad | not good | poor) #damaged",
      "(after | in) (one | the first) wash (it | they) (was | were | got | became) smaller #shrank", "nothing is wrong i [just] changed my mind #mind",
      "(it | they) lost (its | their | the) color #ran", "the color changed [after (washing | the wash | one wash | the rain)] #ran",
    ] },
    want_refund: { patterns: [
      "i would like a refund #h:ret_refund", "(can | could) i (get | have) a refund", "(i would like | can i (get | have) | could i (get | have)) my money back",
      "[a] refund", "(put it | can you put it) back on my card", "refund (it | it to my card)", "just a refund", "i want a refund #blunt",
      "[my] money back [please]", "give me (the | my) money back #blunt", "i (would prefer | prefer) a refund", "i want [my | the] money back #blunt",
    ] },
    no_refund: { patterns: ["i do not (want | need) a refund", "no refund", "not a refund"] },
    no_credit: { patterns: ["i do not (want | need) (store credit | a gift card)", "no store credit", "not store credit"] },
    want_credit: { patterns: ["(i would like | can i (get | have) | could i (get | have) | i will take) [some] store credit", "[i will take] store credit [is fine | is okay] #h:ret_credit", "(can | could) i (get | have) store credit", "(a | the) gift card is fine", "i will take (a | the) gift card", "store credit is fine #h:ret_credit"] },
  },

  lines: {
    // --- greetings -------------------------------------------------------------------------
    greet: [
      t("Hi there!", "Sveiki!", "Sveiki!"),
      t("Welcome | to | Threads!", "Sveiki atvykę | į | „Threads“!", "Sveiki atvykę į „Threads“!"),
      t("Hello!", "Laba diena!", "Laba diena!"),
    ],
    greet_back: [
      t("Oh, | welcome | back!", "O, | sveiki | sugrįžę!", "O, sveiki sugrįžę!"),
      t("Oh, | hi | again!", "O, | sveiki | vėl!", "O, vėl sveiki!"),
    ],
    greet_howareyou: [
      t("Hi there! | How | are | you | doing | today?", "Sveiki! | Kaip | — | jums | sekasi | šiandien?", "Sveiki! Kaip jums šiandien sekasi?",
        { flags: { 3: "Progressive “are” has no Lithuanian word; sekasi carries the tense (linked to “doing”)." } }),
      t("Hi! | How | are | you | today?", "Sveiki! | Kaip | sekasi | jums | šiandien?", "Sveiki! Kaip šiandien sekasi?"),
    ],
    ask_item: [
      t("Can | I | help | you | find | anything?", "Ar galiu | aš | padėti | jums | rasti | ką nors?", "Gal padėti ką nors surasti?"),
      t("Are | you | looking for | anything | in particular?", "Ar | jūs | ieškote | ko nors | konkretaus?", "Ar ieškote ko nors konkretaus?",
        { flags: { 0: "“Are” in a yes/no question = the particle ar; the present tense of ieškote carries the progressive (linked to “looking for”)." } }),
      t("What | are | you | looking for | today?", "Ko | — | jūs | ieškote | šiandien?", "Ko šiandien ieškote?",
        { flags: { 1: "Progressive “are” has no Lithuanian word; ieškote carries it (linked to “looking for”)." } }),
    ],
    ask_item_else: [
      t("What | else | can | I | show | you?", "Ką | dar | galiu | aš | parodyti | jums?", "Ką dar galėčiau jums parodyti?"),
    ],
    browse_ok: [
      t("Sure! | Let me know | if | you | need | anything.", "Žinoma! | Pasakykite, | jei | jums | reikia | ko nors.", "Žinoma! Jei ko nors prireiks, pasakykite."),
      t("No | problem! | Take your time.", "Jokių | problemų! | Neskubėkite.", "Jokių problemų! Neskubėkite."),
      t("Of course. | I'm | right here | if | you | need | me.", "Žinoma. | Aš esu | čia pat, | jei | jums | reikia | manęs.", "Žinoma. Jei reikės, aš čia pat."),
    ],
    browse_nudge: [
      t("By the way, | that | yellow | jacket | in the window | just | came in.", "Beje, | ta | geltona | striukė | vitrinoje | ką tik | atkeliavo.", "Beje, ta geltona striukė vitrinoje ką tik atkeliavo."),
    ],
    sale_table: [
      t("Oh, | and | everything | on | that | table | is | {$pct}% | off.", "O, | ir | viskas | ant | to | stalo | yra | {$pct} % | pigiau.", "Beje, viskam ant to stalo taikoma {$pct} % nuolaida.",
        { say: "Oh, and everything on that table is {$pct} percent off." }),
    ],
    ack_item: [
      t("Sure!", "Žinoma!", "Žinoma!"),
      t("Great | choice!", "Puikus | pasirinkimas!", "Puikus pasirinkimas!"),
      t("Sure, | right this way.", "Žinoma, | prašom čia.", "Žinoma, prašom čia."),
    ],
    confirm_featured: [
      t("The | yellow | jacket | from | the | window?", "— | Geltona | striukė | iš | — | vitrinos?", "Geltona striukė iš vitrinos?"),
    ],
    unknown_item: [
      t("Sorry, | we | don't carry | that. | We | have | clothes | and | shoes.", "Atsiprašau, | mes | neprekiaujame | tuo. | Mes | turime | drabužių | ir | batų.", "Atsiprašau, tokių prekių neturime. Turime drabužių ir batų."),
    ],

    // --- size --------------------------------------------------------------------------------
    ask_size: [
      t("What | size | are | you?", "Kokio | dydžio | esate | jūs?", "Kokį dydį dėvite?"),
      t("What | size | do | you | need?", "Kokio | dydžio | — | jums | reikia?", "Kokio dydžio jums reikia?", { flags: { 2: "Question “do” has no Lithuanian word (linked to “need”)." } }),
      t("And | what | size | are | you | looking for?", "O | kokio | dydžio | — | jūs | ieškote?", "O kokio dydžio ieškote?",
        { flags: { 3: "Progressive “are” has no Lithuanian word; ieškote carries it (linked to “looking for”)." } }),
    ],
    ask_shoe: [
      t("What | size | do | you | wear?", "Kokio | dydžio | — | jūs | avite?", "Kokio dydžio batus avite?", { flags: { 2: "Question “do” has no Lithuanian word (linked to “wear”)." } }),
      t("Sure! | And | what | size | are | you?", "Žinoma! | O | kokio | dydžio | esate | jūs?", "Žinoma! O kokį dydį avite?"),
    ],
    size_here: [
      t("Here's | {S.np}.", "Štai | {S.np:nom}.", "Štai {S:nom}."),
      t("Here's | {S.np} | for you.", "Štai | {S.np:nom} | jums.", "Štai jums {S:nom}."),
    ],
    size_check: [
      t("Let me check… | Yes, | here's | {S.np}.", "Pažiūrėsiu… | Taip, | štai | {S.np:nom}.", "Tuoj pažiūrėsiu… Taip, štai {S:nom}."),
      t("Let me check… | Here you go: | {S.np}.", "Pažiūrėsiu… | Prašom: | {S.np:nom}.", "Tuoj pažiūrėsiu… Prašom, {S:nom}."),
    ],
    size_change: [
      t("No | problem. | Let me get | you | {S.np}.", "Jokių | problemų. | Atnešiu | jums | {S.np:acc}.", "Jokių problemų. Tuoj atnešiu {S:acc}."),
      t("Let's try | {S.np}, | then.", "Pabandykime | {S.np:acc}, | tada.", "Tada pabandykime {S:acc}."),
    ],
    size_up_get: [
      t("No | problem. | Let me get | you | a | size | up.", "Jokių | problemų. | Atnešiu | jums | — | dydžiu | didesnius.", "Jokių problemų. Tuoj atnešiu dydžiu didesnius."),
    ],
    size_down_get: [
      t("No | problem. | Let me get | you | a | size | down.", "Jokių | problemų. | Atnešiu | jums | — | dydžiu | mažesnius.", "Jokių problemų. Tuoj atnešiu dydžiu mažesnius."),
    ],
    no_bigger: [t("Sorry, | that's | our | biggest | size.", "Atsiprašau, | tai yra | mūsų | didžiausias | dydis.", "Atsiprašau, tai mūsų didžiausias dydis.")],
    no_smaller: [t("Sorry, | that's | our | smallest | size.", "Atsiprašau, | tai yra | mūsų | mažiausias | dydis.", "Atsiprašau, tai mūsų mažiausias dydis.")],
    size_list: [
      t("We | have | sizes | small | to | extra-large.", "Mes | turime | dydžius | nuo S | iki | XL.", "Turime dydžius nuo S iki XL.",
        { flags: { 4: "“small” and the preposition “to” frame the range; Lithuanian nuo … iki carries both (linked to “to”)." } }),
    ],
    one_size: [t("There's | only | one | size.", "Yra | tik | vienas | dydis.", "Yra tik vienas dydis."), t("It's | one | size | for | everyone.", "Tai yra | vienas | dydis | — | visiems.", "Dydis vienas visiems.",
      { flags: { 4: "“for” has no separate word: the dative visiems carries it." } })],
    shoe_sizes_numbers: [
      t("Shoe | sizes | are | numbers | here. | What | size | do | you | wear?", "Batų | dydžiai | yra | skaičiai | čia. | Kokio | dydžio | — | jūs | avite?",
        "Čia batų dydžiai nurodomi skaičiais. Kokio dydžio batus avite?", { flags: { 7: "Question “do” has no Lithuanian word (linked to “wear”)." } }),
    ],
    which_size_letters: [t("Hmm, | do | you | mean | small, | medium | or | large?", "Hmm, | ar | jūs | turite omenyje | S, | M | ar | L?", "Hmm, turite omenyje S, M ar L?",
      { flags: { 1: "Question “do” = the particle ar." } })],
    eu_size: [
      t("Is | that | a | European | size? | That's | about | a | US | {$num}.", "Ar | tai | — | Europos | dydis? | Tai yra | maždaug | — | JAV | {$num} dydis.",
        "Ar tai Europos dydis? Tai maždaug {$num} JAV dydis.", { flags: { 0: "“Is” in a question = the particle ar; Lithuanian needs no copula here.", 10: "The number stands for the size; Lithuanian names the noun, dydis." },
          say: "Is that a European size? That's about a US {$num}." }),
    ],
    eu_size_known: [
      t("Okay, | so | that's | about | a | US | {$num}.", "Gerai, | vadinasi, | tai yra | maždaug | — | JAV | {$num} dydis.", "Gerai, vadinasi, tai maždaug {$num} JAV dydis.",
        { flags: { 6: "The number stands for the size; Lithuanian names the noun, dydis." }, say: "Okay, so that's about a US {$num}." }),
    ],
    shoe_size_again: [t("Sorry, | what | size | was | that?", "Atsiprašau, | koks | — | buvo | dydis?", "Atsiprašau, koks dydis?", { flags: { 2: "The subject “that” is dropped: Lithuanian asks about the size itself (linked to “size”)." } })],
    shoes_here: [
      t("Here you go, | size | {$num}.", "Prašom, | dydis | {$num}.", "Prašom, {$num} dydis.", { say: "Here you go, size {$num}." }),
    ],
    last_one: [t("You're lucky: | that's | the | last | one!", "Jums pasisekė: | tai yra | — | paskutinis | vienetas!", "Jums pasisekė – tai paskutinis vienetas!")],
    size_ok: [t("Great.", "Puiku.", "Puiku."), t("Perfect.", "Puiku.", "Puiku."), t("Got it.", "Supratau.", "Supratau.")],
    size_guess: [t("No | problem. | Let's try | a | medium | and | see.", "Jokių | problemų. | Pabandykime | — | M dydį | ir | pažiūrėsime.", "Jokių problemų. Pabandykime M dydį ir pažiūrėsime.")],
    shoe_guess: [t("No | problem. | What's | your | European | size?", "Jokių | problemų. | Koks yra | jūsų | Europos | dydis?", "Jokių problemų. Koks jūsų Europos dydis?")],

    // --- color -------------------------------------------------------------------------------
    ask_color: [
      t("What | color | would | you | like?", "Kokios | spalvos | — | jūs | norėtumėte?", "Kokios spalvos norėtumėte?", { flags: { 2: "“would”: the conditional ending of norėtumėte carries it." } }),
      t("Which | color | would | you | like?", "Kurios | spalvos | — | jūs | norėtumėte?", "Kurios spalvos norėtumėte?", { flags: { 2: "“would”: the conditional ending of norėtumėte carries it." } }),
    ],
    color_list: [
      t("We | have | it | in {A}, | {B} | and | {C}.", "Mes | turime | tokių | {A:gen}, | {B:gen} | ir | {C:gen} spalvos.", "Turime {A:gen}, {B:gen} ir {C:gen} spalvos.",
        { flags: { 2: "“it” (this model) = tokių, partitive genitive plural: “ones like this”." } }),
    ],
    color_list_pl: [
      t("We | have | them | in {A}, | {B} | and | {C}.", "Mes | turime | tokių | {A:gen}, | {B:gen} | ir | {C:gen} spalvos.", "Turime {A:gen}, {B:gen} ir {C:gen} spalvos.",
        { flags: { 2: "“them” (this model) = tokių, partitive genitive plural." } }),
    ],
    color_yes: [
      t("Yes, | we | do! | Here you go.", "Taip, | mes | turime! | Prašom.", "Taip, turime! Prašom.", { flags: { 2: "“do” (elliptical): Lithuanian repeats the verb, turime." } }),
      t("Sure! | Here | it | is | in {C}.", "Žinoma! | Štai | {jis@X:nom} | — | {C:gen} spalvos.", "Žinoma! Štai {C:gen} spalvos.", { flags: { 3: "“is” (here it is): no word; štai presents it." } }),
    ],
    color_yes_pl: [
      t("Yes, | we | do! | Here you go.", "Taip, | mes | turime! | Prašom.", "Taip, turime! Prašom.", { flags: { 2: "“do” (elliptical): Lithuanian repeats the verb, turime." } }),
      t("Sure! | Here | they | are | in {C}.", "Žinoma! | Štai | {jis@X:nom} | — | {C:gen} spalvos.", "Žinoma! Štai {C:gen} spalvos.", { flags: { 3: "“are” (here they are): no word; štai presents them." } }),
    ],
    color_no: [
      t("Sorry, | it | doesn't come | in {C}.", "Atsiprašau, | tokių | nebūna | {C:gen} spalvos.", "Atsiprašau, {C:gen} spalvos tokių nebūna.", { flags: { 1: "“it” (this model): tokių, genitive of negation — “there are none like this”." } }),
    ],
    color_no_pl: [
      t("Sorry, | they | don't come | in {C}.", "Atsiprašau, | tokių | nebūna | {C:gen} spalvos.", "Atsiprašau, {C:gen} spalvos tokių nebūna.", { flags: { 1: "“they” (this model): tokių, genitive of negation." } }),
    ],
    other_color_offer: [
      t("Would | you | like | to see | it | in | another | color?", "Ar | jūs | norėtumėte | pamatyti | {jis@X:acc} | — | kitos | spalvos?", "Gal norėtumėte pamatyti kitos spalvos?",
        { flags: { 0: FLAG_WOULD, 5: "“in” has no separate word: the genitive kitos spalvos carries it (an adjective intervenes)." } }),
    ],
    other_color_offer_pl: [
      t("Would | you | like | to see | them | in | another | color?", "Ar | jūs | norėtumėte | pamatyti | {jis@X:acc} | — | kitos | spalvos?", "Gal norėtumėte pamatyti kitos spalvos?",
        { flags: { 0: FLAG_WOULD, 5: "“in” has no separate word: the genitive kitos spalvos carries it (an adjective intervenes)." } }),
    ],

    // --- trying on -------------------------------------------------------------------------
    offer_try: [
      t("Would | you | like | to try | it | on?", "Ar | jūs | norėtumėte | pasimatuoti | {jis@X:acc} | —?", "Ar norėtumėte pasimatuoti?", { flags: { 0: FLAG_WOULD, 5: FLAG_TRY_ON } }),
      t("Do | you | want | to try | it | on?", "Ar | jūs | norite | pasimatuoti | {jis@X:acc} | —?", "Norite pasimatuoti?", { flags: { 0: FLAG_DO, 5: FLAG_TRY_ON } }),
    ],
    offer_try_pl: [
      t("Would | you | like | to try | them | on?", "Ar | jūs | norėtumėte | pasimatuoti | {jis@X:acc} | —?", "Ar norėtumėte pasimatuoti?", { flags: { 0: FLAG_WOULD, 5: FLAG_TRY_ON } }),
      t("Do | you | want | to try | them | on?", "Ar | jūs | norite | pasimatuoti | {jis@X:acc} | —?", "Norite pasimatuoti?", { flags: { 0: FLAG_DO, 5: FLAG_TRY_ON } }),
    ],
    fitting_rooms: [
      t("The | fitting rooms | are | right | over | there.", "— | Matavimosi kabinos | yra | tiesiai | — | ten.", "Matavimosi kabinos – štai ten.", { flags: { 4: "“over” (over there): no separate Lithuanian word; ten carries the direction." } }),
      t("The | fitting rooms | are | in the back, | on the left.", "— | Matavimosi kabinos | yra | gale, | kairėje.", "Matavimosi kabinos – gale, kairėje."),
    ],
    try_this: [t("Here you go. | Try | this one.", "Prašom. | Pasimatuokite | {šitas@X:acc}.", "Prašom, pasimatuokite {šitas@X:acc}.")],
    try_this_pl: [t("Here you go. | Try | these.", "Prašom. | Pasimatuokite | {šitas@X:acc}.", "Prašom, pasimatuokite {šitas@X:acc}.")],
    try_seat: [t("Have a seat | right | here.", "Prisėskite | tiesiai | čia.", "Prisėskite čia.")],
    let_me_know: [t("Let me know | how | it | fits!", "Pasakykite, | kaip | {jis@X:nom} | tinka!", "Pasakykite, kaip tinka!")],
    let_me_know_pl: [t("Let me know | how | they | fit!", "Pasakykite, | kaip | {jis@X:nom} | tinka!", "Pasakykite, kaip tinka!")],
    ask_fit: [
      t("So, | how | does | it | fit?", "Na, | kaip | — | {jis@X:nom} | tinka?", "Na, kaip tinka?", { flags: { 2: "Question “does” has no Lithuanian word (linked to “fit”)." } }),
      t("How's | the | size?", "Kaip | — | dydis?", "Kaip dydis?"),
    ],
    ask_fit_pl: [
      t("So, | how | do | they | fit?", "Na, | kaip | — | {jis@X:nom} | tinka?", "Na, kaip tinka?", { flags: { 2: "Question “do” has no Lithuanian word (linked to “fit”)." } }),
      t("How's | the | size?", "Kaip | — | dydis?", "Kaip dydis?"),
    ],
    fit_which: [
      t("Oh | no! | Is | the | size | too | big | or | too | small?", "O | ne! | Ar | — | dydis | per | didelis | ar | per | mažas?", "O ne! Dydis per didelis ar per mažas?", { flags: { 2: "“Is” in a question = the particle ar; Lithuanian needs no copula here." } }),
    ],
    compliment: [
      t("Oh, | it | really | suits | you!", "O, | {jis@X:nom} | tikrai | tinka | jums!", "O, jums tikrai tinka!"),
      t("Wow, | that | color | really | suits | you!", "Oho, | ta | spalva | tikrai | tinka | jums!", "Oho, ta spalva jums tikrai tinka!"),
      t("You | look | great | in it!", "Jūs | atrodote | puikiai | {jis@X:loc}!", "Atrodote {jis@X:loc} puikiai!"),
    ],
    compliment_pl: [
      t("Oh, | they | really | suit | you!", "O, | {jis@X:nom} | tikrai | tinka | jums!", "O, jums tikrai tinka!"),
      t("Wow, | that | color | really | suits | you!", "Oho, | ta | spalva | tikrai | tinka | jums!", "Oho, ta spalva jums tikrai tinka!"),
      t("You | look | great | in them!", "Jūs | atrodote | puikiai | {jis@X:loc}!", "Atrodote {jis@X:loc} puikiai!"),
    ],
    fit_ok: [t("Oh, | good!", "O, | puiku!", "O, puiku!"), t("Great!", "Puiku!", "Puiku!")],
    sweet_back: [t("Aw, | you're welcome!", "Oi, | prašom!", "Oi, prašom!"), t("Aw, | thank | you!", "Oi, | dėkoju | jums!", "Oi, ačiū!")],

    // --- price, sale, tax ----------------------------------------------------------------------
    price_is: [t("It's | {$price}.", "Kainuoja | {$price}.", "Kainuoja {$price}.")],
    price_is_pl: [t("They're | {$price}.", "Kainuoja | {$price}.", "Kainuoja {$price}.")],
    price_sale: [
      t("It's | {$price}, | but | today | it's | {$pct}% | off, | so | {$amount}.", "Kainuoja | {$price}, | bet | šiandien | {jis@X:nom} yra | {$pct} % | {nukainuotas@X:nom}, | tai | {$amount}.",
        "Kainuoja {$price}, bet šiandien taikoma {$pct} % nuolaida – išeina {$amount}.", { say: "It's {$price}, but today it's {$pct} percent off, so {$amount}." }),
    ],
    price_sale_pl: [
      t("They're | {$price}, | but | today | they're | {$pct}% | off, | so | {$amount}.", "Kainuoja | {$price}, | bet | šiandien | {jis@X:nom} yra | {$pct} % | {nukainuotas@X:nom}, | tai | {$amount}.",
        "Kainuoja {$price}, bet šiandien taikoma {$pct} % nuolaida – išeina {$amount}.", { say: "They're {$price}, but today they're {$pct} percent off, so {$amount}." }),
    ],
    sale_yes: [
      t("Yes, | it's | {$pct}% | off | today!", "Taip, | {jis@X:nom} yra | {$pct} % | {nukainuotas@X:nom} | šiandien!", "Taip, šiandien {jis@X:nom} {nukainuotas@X:nom} {$pct} %!",
        { say: "Yes, it's {$pct} percent off today!" }),
      t("Yep, | {$pct}% | off | today!", "Taip, | {$pct} % | pigiau | šiandien!", "Taip, šiandien {$pct} % pigiau!", { say: "Yep, {$pct} percent off today!" }),
    ],
    sale_news: [
      t("Good | news: | it's | {$pct}% | off | today!", "Gera | žinia: | {jis@X:nom} yra | {$pct} % | {nukainuotas@X:nom} | šiandien!", "Gera žinia – šiandien {jis@X:nom} {nukainuotas@X:nom} {$pct} %!",
        { say: "Good news: it's {$pct} percent off today!" }),
    ],
    sale_news_pl: [
      t("Good | news: | they're | {$pct}% | off | today!", "Gera | žinia: | {jis@X:nom} yra | {$pct} % | {nukainuotas@X:nom} | šiandien!", "Gera žinia – šiandien {jis@X:nom} {nukainuotas@X:nom} {$pct} %!",
        { say: "Good news: they're {$pct} percent off today!" }),
    ],
    sale_yes_pl: [
      t("Yes, | they're | {$pct}% | off | today!", "Taip, | {jis@X:nom} yra | {$pct} % | {nukainuotas@X:nom} | šiandien!", "Taip, šiandien {jis@X:nom} {nukainuotas@X:nom} {$pct} %!",
        { say: "Yes, they're {$pct} percent off today!" }),
    ],
    sale_no: [
      t("Sorry, | not | this one.", "Atsiprašau, | ne | {šitas@X:nom}.", "Atsiprašau, {šitas@X:nom} – ne su nuolaida."),
    ],
    sale_no_pl: [
      t("Sorry, | not | these.", "Atsiprašau, | ne | {šitas@X:nom}.", "Atsiprašau, {šitas@X:nom} – ne su nuolaida."),
    ],
    sale_general: [
      t("Everything | on | the | front | table | is | {$pct}% | off.", "Viskas | ant | — | priekinio | stalo | yra | {$pct} % | pigiau.", "Viskam ant priekinio stalo taikoma {$pct} % nuolaida.",
        { say: "Everything on the front table is {$pct} percent off." }),
    ],
    tax_info: [
      t("No, | sales | tax | is | added | at the register.", "Ne, | pardavimo | mokestis | yra | pridedamas | kasoje.", "Ne, pardavimo mokestis pridedamas kasoje."),
      t("No, | tax | is | added | at the register. | It's | six | percent.", "Ne, | mokestis | yra | pridedamas | kasoje. | Tai yra | šeši | procentai.", "Ne, mokestis pridedamas kasoje – šeši procentai."),
    ],
    return_policy: [
      t("You | can | return | or | exchange | it | within | thirty | days. | Just | keep | the | receipt.", "Jūs | galite | grąžinti | arba | pasikeisti | {jis@X:acc} | per | trisdešimt | dienų. | Tik | pasilikite | — | čekį.",
        "Galite grąžinti ar pasikeisti per trisdešimt dienų. Tik pasilikite čekį."),
    ],
    return_policy_pl: [
      t("You | can | return | or | exchange | them | within | thirty | days. | Just | keep | the | receipt.", "Jūs | galite | grąžinti | arba | pasikeisti | {jis@X:acc} | per | trisdešimt | dienų. | Tik | pasilikite | — | čekį.",
        "Galite grąžinti ar pasikeisti per trisdešimt dienų. Tik pasilikite čekį."),
    ],
    expensive_sale: [
      t("Well, | it's | actually | {$pct}% | off | today!", "Na, | {jis@X:nom} yra | iš tikrųjų | {$pct} % | {nukainuotas@X:nom} | šiandien!", "Na, šiandien {jis@X:nom} iš tikrųjų {nukainuotas@X:nom} {$pct} %!",
        { say: "Well, it's actually {$pct} percent off today!" }),
    ],
    expensive_sale_pl: [
      t("Well, | they're | actually | {$pct}% | off | today!", "Na, | {jis@X:nom} yra | iš tikrųjų | {$pct} % | {nukainuotas@X:nom} | šiandien!", "Na, šiandien {jis@X:nom} iš tikrųjų {nukainuotas@X:nom} {$pct} %!",
        { say: "Well, they're actually {$pct} percent off today!" }),
    ],
    expensive_ok: [
      t("I | understand. | But | it's | really | good | quality.", "Aš | suprantu. | Bet | tai yra | tikrai | gera | kokybė.", "Suprantu. Bet kokybė tikrai gera."),
    ],

    // --- decision ------------------------------------------------------------------------------
    decide_q: [
      t("So, | what | do | you | think?", "Tai | ką | — | jūs | manote?", "Tai ką manote?", { flags: { 2: "Question “do” has no Lithuanian word (linked to “think”)." } }),
      t("So, | would | you | like | to get | it?", "Tai | ar | jūs | norėtumėte | įsigyti | {jis@X:acc}?", "Tai ar norėtumėte {jis@X:acc} įsigyti?", { flags: { 1: FLAG_WOULD } }),
    ],
    decide_q_pl: [
      t("So, | what | do | you | think?", "Tai | ką | — | jūs | manote?", "Tai ką manote?", { flags: { 2: "Question “do” has no Lithuanian word (linked to “think”)." } }),
      t("So, | would | you | like | to get | them?", "Tai | ar | jūs | norėtumėte | įsigyti | {jis@X:acc}?", "Tai ar norėtumėte {jis@X:acc} įsigyti?", { flags: { 1: FLAG_WOULD } }),
    ],
    take_ok: [
      t("Great! | Let's go | to | the | register.", "Puiku! | Eikime | prie | — | kasos.", "Puiku! Eikime prie kasos."),
      t("Awesome! | I'll take | it | to | the | register | for you.", "Puiku! | Nunešiu | {jis@X:acc} | prie | — | kasos | jums.", "Puiku! Nunešiu {jis@X:acc} prie kasos."),
    ],
    take_ok_pl: [
      t("Great! | Let's go | to | the | register.", "Puiku! | Eikime | prie | — | kasos.", "Puiku! Eikime prie kasos."),
      t("Awesome! | I'll take | them | to | the | register | for you.", "Puiku! | Nunešiu | {jis@X:acc} | prie | — | kasos | jums.", "Puiku! Nunešiu {jis@X:acc} prie kasos."),
    ],
    think_ok: [
      t("Of course. | Take your time!", "Žinoma. | Neskubėkite!", "Žinoma. Neskubėkite!"),
      t("No | problem! | We're | open | until | eight.", "Jokių | problemų! | Mes esame | atidaryti | iki | aštuonių.", "Jokių problemų! Dirbame iki aštuonių."),
    ],
    not_take_ok: [
      t("No | problem. | Would | you | like | to try | something | else?", "Jokių | problemų. | Ar | jūs | norėtumėte | pasimatuoti | ką nors | kita?", "Jokių problemų. Gal norėtumėte pasimatuoti ką nors kita?", { flags: { 2: FLAG_WOULD } }),
    ],
    what_else: [
      t("Sure! | What | would | you | like | to see?", "Žinoma! | Ką | — | jūs | norėtumėte | pamatyti?", "Žinoma! Ką norėtumėte pamatyti?", { flags: { 2: "“would”: the conditional ending of norėtumėte carries it." } }),
    ],

    // --- paying ------------------------------------------------------------------------------
    rewards_q: [
      t("Do | you | have | a | rewards | account | with | us?", "Ar | jūs | turite | — | lojalumo | paskyrą | pas | mus?", "Ar turite mūsų lojalumo programos paskyrą?", { flags: { 0: FLAG_DO } }),
    ],
    rewards_offer: [
      t("Would | you | like | to join? | It's | free.", "Ar | jūs | norėtumėte | prisijungti? | Tai yra | nemokama.", "Gal norėtumėte prisijungti? Tai nemokama.", { flags: { 0: FLAG_WOULD } }),
    ],
    rewards_no: [t("No | problem!", "Jokių | problemų!", "Jokių problemų!"), t("No | worries!", "Jokių | rūpesčių!", "Nieko tokio!")],
    rewards_yes: [t("Great! | Just | scan | this | code | at home.", "Puiku! | Tiesiog | nuskenuokite | šį | kodą | namuose.", "Puiku! Namuose tiesiog nuskenuokite šį kodą.")],
    rewards_member: [t("Perfect, | I | found | you.", "Puiku, | aš | radau | jus.", "Puiku, radau jus sistemoje.")],
    total: [
      t("With | tax, | that | comes to | {$total}.", "Su | mokesčiais | tai | sudaro | {$total}.", "Su mokesčiais – {$total}."),
      t("Your | total | is | {$total}, | with | tax.", "Jūsų | suma | yra | {$total}, | su | mokesčiais.", "Iš viso su mokesčiais – {$total}."),
      t("That'll be | {$total} | with | tax.", "Tai bus | {$total} | su | mokesčiais.", "Su mokesčiais – {$total}."),
    ],
    ask_pay_method: [t("Cash | or | card?", "Grynaisiais | ar | kortele?", "Grynaisiais ar kortele?")],
    card_tap: [
      t("Sure! | Just | tap | or | insert | your | card.", "Žinoma! | Tiesiog | pridėkite | arba | įkiškite | savo | kortelę.", "Žinoma! Pridėkite arba įkiškite kortelę."),
      t("Of course. | Just | tap | it | here.", "Žinoma. | Tiesiog | pridėkite | ją | čia.", "Žinoma. Tiesiog pridėkite kortelę čia.", { flags: { 3: "“it” = the card (kortelė), hence ją." } }),
    ],
    card_later: [t("Sure, | card | is fine.", "Žinoma, | kortele | galima.", "Žinoma, galima ir kortele.")],
    phone_later: [t("Sure, | Apple Pay | is fine.", "Žinoma, | „Apple Pay“ | tinka.", "Žinoma, galima ir „Apple Pay“.")],
    phone_ok: [t("Of course! | Just | hold | your | phone | here.", "Žinoma! | Tiesiog | prilaikykite | savo | telefoną | čia.", "Žinoma! Tiesiog prilaikykite telefoną čia.")],
    cash_ok: [t("Sure, | cash | is fine.", "Žinoma, | grynaisiais | galima.", "Žinoma, galima ir grynaisiais.")],
    change_back: [t("And | here's | your | change.", "Ir | štai | jūsų | grąža.", "Štai jūsų grąža."), t("Here's | your | change.", "Štai | jūsų | grąža.", "Štai jūsų grąža.")],
    paid: [t("Thank | you!", "Dėkoju | jums!", "Ačiū!"), t("Perfect, | thanks!", "Puiku, | ačiū!", "Puiku, ačiū!")],
    thanks_tip: [t("Oh, | thank | you | so much!", "O, | dėkoju | jums | labai!", "O, labai ačiū!")],
    no_problem: [t("No | problem.", "Jokių | problemų.", "Jokių problemų.")],
    pay_here: [t("Right | over | here | at | the | register.", "Tiesiai | — | čia, | prie | — | kasos.", "Štai čia, prie kasos.", { flags: { 1: "“over” (over here): no separate Lithuanian word; čia carries the place." } })],
    ask_bag: [
      t("Would | you | like | a | bag?", "Ar | jūs | norėtumėte | — | maišelio?", "Ar norėtumėte maišelio?", { flags: { 0: FLAG_WOULD } }),
      t("Do | you | need | a | bag?", "Ar | jums | reikia | — | maišelio?", "Ar reikia maišelio?", { flags: { 0: FLAG_DO } }),
    ],
    bag_here: [t("Here you go.", "Prašom.", "Prašom."), t("Sure, | here you go.", "Žinoma, | prašom.", "Žinoma, prašom.")],
    cut_tags: [
      t("Sure! | I'll cut | the | tags | off | for you.", "Žinoma! | Nukirpsiu | — | etiketes | — | jums.", "Žinoma! Nukirpsiu jums etiketes.",
        { flags: { 4: "Discontinuous “cut … off”: the prefix nu- of nukirpsiu carries “off” (linked to “I'll cut”)." } }),
    ],
    gift_ok_nobag: [t("Of course! | Here's | a | gift | receipt.", "Žinoma! | Štai | — | dovanos | čekis.", "Žinoma! Štai čekis be kainos dovanai.")],
    gift_ok: [t("Of course! | I'll put | a | gift | receipt | in | the | bag.", "Žinoma! | Įdėsiu | — | dovanos | čekį | į | — | maišelį.", "Žinoma! Įdėsiu į maišelį čekį be kainos.")],
    ask_receipt: [
      t("Would | you | like | your | receipt | printed | or | emailed?", "Ar | jūs | norėtumėte | savo | čekio | atspausdinto | ar | atsiųsto el. paštu?", "Čekį atspausdinti ar atsiųsti el. paštu?", { flags: { 0: FLAG_WOULD } }),
      t("Would | you | like | the | receipt | in the bag?", "Ar | jūs | norėtumėte | — | čekio | maišelyje?", "Ar įdėti čekį į maišelį?", { flags: { 0: FLAG_WOULD } }),
    ],
    receipt_here: [t("Here's | your | receipt.", "Štai | jūsų | čekis.", "Štai jūsų čekis.")],
    receipt_email: [t("Sure, | just | type | your | email | on the screen.", "Žinoma, | tiesiog | įveskite | savo | el. paštą | ekrane.", "Žinoma, tiesiog įveskite el. paštą ekrane.")],
    receipt_keep: [t("No | problem. | Just | remember, | you'll need | it | for returns.", "Jokių | problemų. | Tik | atminkite, | jums prireiks | jo | grąžinimui.", "Jokių problemų. Tik atminkite: grąžinant prireiks čekio.")],

    // --- closing -------------------------------------------------------------------------------
    closing_bought: [
      t("Enjoy | your | new | {X}!", "Džiaukitės | savo | {naujas@X:ins} | {X:ins}!", "Džiaukitės {naujas@X:ins} {X:ins}!"),
      t("Thanks | for | shopping | with us!", "Ačiū, | kad | apsipirkote | pas mus!", "Ačiū, kad apsipirkote pas mus!"),
    ],
    closing_nobuy: [t("Thanks | for | stopping by!", "Ačiū, | kad | užsukote!", "Ačiū, kad užsukote!")],
    bye_after: [
      t("Have | a | great | day!", "Linkiu | — | puikios | dienos!", "Puikios dienos!"),
      t("Have | a | good | one!", "Linkiu | — | geros | dienos!", "Geros dienos!", { flags: { 3: "“one” (have a good one) = the day; Lithuanian names it, dienos." } }),
    ],
    anything_else: [t("Can | I | help | you | with anything | else?", "Ar galiu | aš | padėti | jums | kuo nors | dar?", "Ar dar kuo nors galiu padėti?")],

    // --- returns -------------------------------------------------------------------------------
    return_q: [
      t("Are | you | returning | something | today?", "Ar | jūs | grąžinate | ką nors | šiandien?", "Ar šiandien ką nors grąžinate?",
        { flags: { 0: "“Are” in a yes/no question = the particle ar; the present tense of grąžinate carries the progressive (linked to “returning”)." } }),
      t("Is | that | a | return?", "Ar | tai | — | grąžinimas?", "Ar grąžinate?", { flags: { 0: "“Is” in a question = the particle ar; Lithuanian needs no copula here." } }),
    ],
    ret_ask_receipt: [
      t("Of course. | Do | you | have | the | receipt?", "Žinoma. | Ar | jūs | turite | — | čekį?", "Žinoma. Ar turite čekį?", { flags: { 1: FLAG_DO } }),
      t("Sure, | no | problem. | Do | you | have | your | receipt?", "Žinoma, | jokių | problemų. | Ar | jūs | turite | savo | čekį?", "Žinoma, jokių problemų. Ar turite čekį?", { flags: { 3: FLAG_DO } }),
    ],
    ret_receipt_thanks: [t("Perfect, | thank | you.", "Puiku, | dėkoju | jums.", "Puiku, ačiū.")],
    ret_receipt_none: [t("That's | okay.", "Tai | gerai.", "Nieko tokio.")],
    ret_ask_reason: [
      t("Was | there | anything | wrong | with | it?", "Ar buvo | — | kas nors | negerai | su | {jis@X:ins}?", "Ar buvo kas nors negerai?",
        { flags: { 0: "“Was” in a yes/no question = the particle ar + past tense buvo.", 1: "Existential “there” has no Lithuanian word." } }),
      t("What's | wrong | with | it?", "Kas yra | negerai | su | {jis@X:ins}?", "Kas su {jis@X:ins} negerai?"),
      t("Can | I | ask | why | you're returning | it?", "Ar galiu | aš | paklausti, | kodėl | grąžinate | {jis@X:acc}?", "Ar galiu paklausti, kodėl grąžinate?"),
    ],
    ret_ask_reason_pl: [
      t("Was | there | anything | wrong | with | them?", "Ar buvo | — | kas nors | negerai | su | {jis@X:ins}?", "Ar buvo kas nors negerai?",
        { flags: { 0: "“Was” in a yes/no question = the particle ar + past tense buvo.", 1: "Existential “there” has no Lithuanian word." } }),
      t("Can | I | ask | why | you're returning | them?", "Ar galiu | aš | paklausti, | kodėl | grąžinate | {jis@X:acc}?", "Ar galiu paklausti, kodėl grąžinate?"),
    ],
    ret_what_wrong: [t("What's | wrong | with | it?", "Kas yra | negerai | su | {jis@X:ins}?", "Kas su {jis@X:ins} negerai?")],
    ret_what_wrong_pl: [t("What's | wrong | with | them?", "Kas yra | negerai | su | {jis@X:ins}?", "Kas su {jis@X:ins} negerai?")],
    ret_sorry: [t("Oh | no, | I'm | so | sorry | about | that!", "O | ne, | aš | labai | atsiprašau | dėl | to!", "O ne, labai atsiprašau!",
      { flags: { 2: "“am” (I'm sorry) has no separate word: the verb atsiprašau carries it (linked to “sorry”)." } })],
    ret_size_happens: [t("Oh, | that | happens!", "O, | taip | būna!", "O, taip būna!")],
    ret_fine: [t("That's | totally | fine.", "Tai | visiškai | normalu.", "Visiškai normalu.")],
    ret_choice_q: [
      t("Would | you | like | a | refund | or | an | exchange?", "Ar | jūs | norėtumėte | — | pinigų grąžinimo | ar | — | pasikeitimo?", "Norėtumėte atgauti pinigus ar pasikeisti?", { flags: { 0: FLAG_WOULD } }),
      t("Refund | or | exchange?", "Pinigų grąžinimas | ar | pasikeitimas?", "Grąžinti pinigus ar pasikeisti?"),
    ],
    ret_choice_noreceipt: [
      t("Without | a | receipt, | I | can | offer | you | store | credit | or | an | exchange.", "Be | — | čekio | aš | galiu | pasiūlyti | jums | parduotuvės | kreditą | arba | — | pasikeitimą.",
        "Be čekio galiu pasiūlyti tik parduotuvės kreditą arba pasikeitimą."),
    ],
    ret_no_refund_receipt: [t("Sorry, | I | can't do | a | refund | without | a | receipt.", "Atsiprašau, | aš | negaliu padaryti | — | pinigų grąžinimo | be | — | čekio.", "Atsiprašau, be čekio pinigų grąžinti negaliu.")],
    ret_refund_done: [
      t("No | problem. | I'll put | the | money | back | on | your | card.", "Jokių | problemų. | Grąžinsiu | — | pinigus | atgal | į | jūsų | kortelę.", "Jokių problemų. Pinigus grąžinsiu į jūsų kortelę."),
    ],
    ret_refund_days: [
      t("It | should | show up | in | a | few | business | days.", "Jie | turėtų | atsirasti | per | — | kelias | darbo | dienas.", "Pinigai turėtų grįžti per kelias darbo dienas.",
        { flags: { 0: "“It” = the refunded money; Lithuanian pinigai is plural, hence jie." } }),
    ],
    ret_credit_done: [
      t("Here's | your | store | credit: | {$amount}.", "Štai | jūsų | parduotuvės | kreditas: | {$amount}.", "Štai jūsų parduotuvės kreditas – {$amount}."),
    ],
    ret_credit_card: [t("It's | on | this | card.", "Jis yra | — | šioje | kortelėje.", "Jis šioje kortelėje.", { flags: { 1: "“on” has no separate word: the locative kortelėje carries it (a demonstrative intervenes)." } })],
    ret_exchange_size_q: [
      t("What | size | would | you | like | instead?", "Kokio | dydžio | — | jūs | norėtumėte | vietoj to?", "Kokio dydžio norėtumėte vietoj šio?", { flags: { 2: "“would”: the conditional ending of norėtumėte carries it." } }),
    ],
    ret_exchange_color_q: [
      t("Which | color | would | you | like | instead?", "Kurios | spalvos | — | jūs | norėtumėte | vietoj to?", "Kurios spalvos norėtumėte vietoj šios?", { flags: { 2: "“would”: the conditional ending of norėtumėte carries it." } }),
    ],
    ret_exchange_what_q: [
      t("Sure! | Same | style, | different | size | or | color?", "Žinoma! | Tas pats | modelis, | kitas | dydis | ar | spalva?", "Žinoma! Tą patį modelį, tik kito dydžio ar spalvos?"),
    ],
    ret_exchange_done: [
      t("Here's | your | new | {X}. | Sorry | for | the | trouble!", "Štai | jūsų | {naujas@X:nom} | {X:nom}. | Atsiprašau | dėl | — | nepatogumų!", "Štai jūsų {naujas@X:nom} {X:nom}. Atsiprašome už nepatogumus!"),
    ],
    ret_exchange_done_pl: [
      t("Here are | your | new | {X}. | Sorry | for | the | trouble!", "Štai | jūsų | {naujas@X:nom} | {X:nom}. | Atsiprašau | dėl | — | nepatogumų!", "Štai jūsų {naujas@X:nom} {X:nom}. Atsiprašome už nepatogumus!"),
    ],
    ret_same_new: [t("Here's | a | new | one | in | the | same | size.", "Štai | — | naujas | vienetas | — | to | paties | dydžio.", "Štai naujas, to paties dydžio.",
      { flags: { 4: "“in” has no separate word: the genitive to paties dydžio carries it.", 5: "“the same” = tas pats: the article gets its real demonstrative, to." } })],
    ret_shop_ok: [t("Oh, | sorry! | How | can | I | help | you?", "O, | atsiprašau! | Kaip | galiu | aš | padėti | jums?", "O, atsiprašau! Kuo galiu padėti?")],
  },

  domains: {
    price: () => CLOTHING.map((e) => e.attrs!.price as number),
    amount: () => [...new Set(CLOTHING.flatMap((e) => { const p = e.attrs!.price as number; return [p, Math.floor(p * 80 / 100), Math.floor(p * 70 / 100)]; }))],
    total: () => [...new Set(CLOTHING.flatMap((e) => { const p = e.attrs!.price as number; return [p, Math.floor(p * 80 / 100), Math.floor(p * 70 / 100)].map((x) => Math.round(x * TAX)); }))],
    pct: () => [20, 30],
    num: () => Array.from({ length: 12 }, (_, i) => i + 4),
  },

  hints: {
    browse: {
      lt: "Pasakyti, kad tik apsidairai",
      items: [
        { id: "browse_just", s: t("I'm | just | looking, | thanks.", "Aš | tik | žiūriu, | ačiū.", "Tik žiūriu, ačiū.", { flags: { 0: "Progressive “am” has no separate Lithuanian word; the present tense of žiūriu carries it." } }) },
        { id: "browse_fine", s: t("I'm | fine, | thanks. | Just | browsing.", "Man | gerai, | ačiū. | Tik | apsidairau.", "Viskas gerai, ačiū. Tik apsidairau.") },
        { id: "browse_not_now", s: t("Not | right now, | thanks.", "Ne | šiuo metu, | ačiū.", "Kol kas ne, ačiū.") },
      ],
    },
    looking: {
      lt: "Pasakyti, ko ieškai", slot: "clothing", examples: ["jacket", "sweater", "jeans", "dress", "shoes"],
      items: ordered(
        { id: "look_for", s: t("I'm looking for | {X.np}.", "Ieškau | {X.np:gen}.", "Ieškau {X.np:gen}.") },
        { id: "q_have_any", s: t("Do | you | have | any | {X.pl}?", "Ar | jūs | turite | — | {X.pl:gen}?", "Ar turite {X.pl:gen}?", { flags: { 0: FLAG_DO, 3: "Partitive: the genitive carries “any”." } }), only: (e) => !(e.attrs?.ltPl && !e.attrs?.enPl) },
        { id: "look_for", s: t("I'm looking for | a | pair | of {X}.", "Ieškau | — | poros | {X:gen}.", "Ieškau {X:gen}."), only: (e) => !!e.attrs?.pair,
          note: "„A pair of …“ sakoma apie daiktus iš dviejų dalių: džinsus, kelnes, batus." },
        { id: "q_where", s: t("Where | can | I | find | {X.pl}?", "Kur | galiu | aš | rasti | {X.pl:acc}?", "Kur rasti {X.pl:acc}?"), only: (e) => !(e.attrs?.ltPl && !e.attrs?.enPl) },
        { id: "can_i_see", s: t("Can | I | see | {X.the} | in the window?", "Ar galiu | aš | pamatyti | {X.the:acc} | vitrinoje?", "Ar galiu pamatyti {X:acc} iš vitrinos?") },
        hv("have_this_size", "Do | you | have | this | {X} | in a medium?", "Do | you | have | these | {X} | in a medium?",
          "Ar | jūs | turite | {šitas@X:acc} | {X:acc} | M dydžio?", "Ar turite {šitas@X:acc} {X:acc} M dydžio?", { flags: { 0: FLAG_DO } }, {}, (e) => !e.attrs?.shoe && !e.attrs?.oneSize),
      ),
    },
    size: {
      lt: "Pasakyti savo dydį", slot: "size", examples: ["medium", "large", "small"],
      items: [
        { id: "size_short", s: t("{X}, | please.", "{X:acc}, | prašau.", "{X:acc}, prašau.") },
        { id: "size_im", s: t("I'm | {X.np}.", "Aš esu | {X.np:gen}.", "Dėviu {X:acc}.") },
        { id: "size_wear", s: t("I | usually | wear | {X.np}.", "Aš | paprastai | dėviu | {X.np:acc}.", "Paprastai dėviu {X:acc}.") },
        { id: "have_size", s: t("Do | you | have | this | in a {X}?", "Ar | jūs | turite | tokių | {X:gen}?", "Ar turite tokių {X:gen}?",
          { flags: { 0: FLAG_DO, 3: "“this” (this model) = tokių, partitive genitive plural: “any like this”." } }), only: (e) => e.id !== "xl" },
        { id: "have_size", s: t("Do | you | have | this | in an {X}?", "Ar | jūs | turite | tokių | {X:gen}?", "Ar turite tokių {X:gen}?",
          { flags: { 0: FLAG_DO, 3: "“this” (this model) = tokių, partitive genitive plural: “any like this”." } }), only: (e) => e.id === "xl" },
        { id: "size_up", s: t("Do | you | have | a | bigger | size?", "Ar | jūs | turite | — | didesnio | dydžio?", "Ar turite didesnio dydžio?", { flags: { 0: FLAG_DO } }) },
        { id: "size_down", s: t("Do | you | have | a | smaller | size?", "Ar | jūs | turite | — | mažesnio | dydžio?", "Ar turite mažesnio dydžio?", { flags: { 0: FLAG_DO } }) },
        { id: "q_sizes", s: t("What | sizes | do | you | have?", "Kokių | dydžių | — | jūs | turite?", "Kokių dydžių turite?", { flags: { 2: "Question “do” has no Lithuanian word (linked to “have”)." } }) },
        { id: "size_unsure", s: t("I'm | not | sure | about | my | size.", "Aš | nesu | {m:tikras|f:tikra} | dėl | savo | dydžio.", "Nesu {m:tikras|f:tikra} dėl savo dydžio.",
          { flags: { 1: "Negation: nesu = ne- + esu; the “am” of I'm sits here (linked to “I'm”)." } }) },
      ],
    },
    shoe_size: {
      lt: "Pasakyti batų dydį",
      items: [
        { id: "ss_size", s: t("Size | 9, | please.", "Dydis | 9, | prašau.", "9 dydis, prašau.", { say: "Size nine, please." }) },
        { id: "ss_wear", s: t("I | wear | a | size | 10.", "Aš | aviu | — | dydį | 10.", "Aviu 10 dydį.", { say: "I wear a size ten." }) },
        { id: "ss_eu", s: t("I'm | a | 42 | in | European | sizes.", "Aš esu | — | 42 dydžio | pagal | Europos | dydžius.", "Pagal Europos dydžius aviu 42.",
          { say: "I'm a forty-two in European sizes.", flags: { 2: "The number stands for “size 42”; Lithuanian names the noun: 42 dydžio." } }),
          note: "JAV batų dydžiai kitokie: vyrams ≈ Europos dydis − 33, moterims ≈ Europos dydis − 31." },
        { id: "ss_half", s: t("Ten | and | a | half, | please.", "Dešimt | ir | — | pusė, | prašau.", "Dešimt su puse, prašau.") },
      ],
    },
    color: {
      lt: "Pasirinkti ar paklausti spalvos", slot: "color", examples: ["black", "blue", "navy", "red"],
      items: [
        { id: "color_short", s: t("{X}, | please.", "{X:gen} spalvos, | prašau.", "{X:gen} spalvos, prašau.") },
        { id: "have_color", s: t("Do | you | have | this | in {X}?", "Ar | jūs | turite | tokių | {X:gen} spalvos?", "Ar turite tokių {X:gen} spalvos?",
          { flags: { 0: FLAG_DO, 3: "“this” (this model) = tokių, partitive genitive plural: “any like this”." } }) },
        { id: "q_colors", s: t("What | colors | do | you | have?", "Kokių | spalvų | — | jūs | turite?", "Kokių spalvų turite?", { flags: { 2: "Question “do” has no Lithuanian word (linked to “have”)." } }) },
        { id: "come_in", s: t("Does | this | come in | {X}?", "Ar | tokių | būna | {X:gen} spalvos?", "Ar tokių būna {X:gen} spalvos?", { flags: { 0: "Question “Does” = the particle ar." } }), register: "casual" },
        { id: "q_other_colors", s: t("Do | you | have | other | colors?", "Ar | jūs | turite | kitų | spalvų?", "Ar turite kitų spalvų?", { flags: { 0: FLAG_DO } }) },
        { id: "not_color", s: t("I | don't like | the | color.", "Man | nepatinka | — | spalva.", "Man nepatinka spalva.") },
      ],
    },
    // Answers to "Would you like to try it on?"
    tryon_ans: {
      lt: "Atsakyti, ar matuosies", slot: "clothing", examples: ["jacket", "jeans", "sweater", "shirt"],
      items: [
        { id: "try_yes", s: t("Yes, | please.", "Taip, | prašau.", "Taip, prašau.") },
        { id: "try_where", s: t("Sure! | Where's | the | fitting room?", "Žinoma! | Kur yra | — | matavimosi kabina?", "Žinoma! Kur matavimosi kabina?"), only: (e) => !e.attrs?.shoe },
        { id: "try_no", s: t("No, | thanks.", "Ne, | ačiū.", "Ne, ačiū.") },
      ],
    },
    tryon: {
      lt: "Paprašyti pasimatuoti", slot: "clothing", examples: ["jacket", "jeans", "sweater", "shirt"],
      items: ordered(
        hv("try_can", "Can | I | try | it | on?", "Can | I | try | them | on?", "Ar galiu | aš | pasimatuoti | {jis@X:acc} | —?", "Ar galiu pasimatuoti?", { flags: { 4: FLAG_TRY_ON } }),
        { id: "try_the", s: t("Could | I | try on | {X.the}?", "Ar galėčiau | aš | pasimatuoti | {X.the:acc}?", "Ar galėčiau pasimatuoti {X:acc}?") },
        { id: "q_fitting", s: t("Where | are | the | fitting rooms?", "Kur | yra | — | matavimosi kabinos?", "Kur matavimosi kabinos?") },
      ),
    },
    fit: {
      lt: "Pasakyti, kaip tinka", slot: "clothing", examples: ["jacket", "jeans", "sweater", "shirt"],
      items: ordered(
        hg("fit_perfect", "It | fits | perfectly.", "They | fit | perfectly.", (g) => `${PRON[g]} | tinka | puikiai.`, () => "Tinka puikiai."),
        hg("fit_small", "It's | too | small.", "They're | too | small.", (g) => `${PRON[g]} yra | per | ${ADJ.small[g]}.`, () => "Dydis per mažas."),
        hg("fit_big", "It's | too | big.", "They're | too | big.", (g) => `${PRON[g]} yra | per | ${ADJ.big[g]}.`, () => "Dydis per didelis."),
        hg("fit_tight", "It's | a little | tight.", "They're | a little | tight.", (g) => `${PRON[g]} yra | truputį | ${ADJ.tight[g]}.`, () => "Truputį ankšta."),
        hg("fit_long", "It's | too | long.", "They're | too | long.", (g) => `${PRON[g]} yra | per | ${ADJ.long[g]}.`, (g) => `Per ${ADJ.long[g]}.`),
        { id: "size_up", s: t("Do | you | have | a | bigger | size?", "Ar | jūs | turite | — | didesnio | dydžio?", "Ar turite didesnio dydžio?", { flags: { 0: FLAG_DO } }) },
      ),
    },
    // "Is the size too big or too small?"
    fit_which: {
      lt: "Pasakyti, ar dydis per didelis, ar per mažas", slot: "clothing", examples: ["jacket", "jeans", "sweater", "shirt"],
      items: ordered(
        hg("fit_small", "It's | too | small.", "They're | too | small.", (g) => `${PRON[g]} yra | per | ${ADJ.small[g]}.`, () => "Dydis per mažas."),
        hg("fit_big", "It's | too | big.", "They're | too | big.", (g) => `${PRON[g]} yra | per | ${ADJ.big[g]}.`, () => "Dydis per didelis."),
        hg("fit_tight", "It's | a little | tight.", "They're | a little | tight.", (g) => `${PRON[g]} yra | truputį | ${ADJ.tight[g]}.`, () => "Truputį ankšta."),
        hg("fit_long", "It's | too | long.", "They're | too | long.", (g) => `${PRON[g]} yra | per | ${ADJ.long[g]}.`, (g) => `Per ${ADJ.long[g]}.`),
      ),
    },
    // The guide shows the first three (buying, or asking about the price); the rest are in the phrase list.
    decide: {
      lt: "Pasakyti, kad imi, arba paklausti kainos", slot: "clothing", examples: ["jacket", "jeans", "sweater", "shirt"],
      items: ordered(
        hv("take_it", "I'll take | it.", "I'll take | them.", "Imsiu | {jis@X:acc}.", "Imsiu."),
        hv("q_price", "How much | is | it?", "How much | are | they?", "Kiek | kainuoja | {jis@X:nom}?", "Kiek kainuoja?"),
        hv("q_sale", "Is | it | on sale?", "Are | they | on sale?", "Ar | {jis@X:nom} | su nuolaida?", "Ar su nuolaida?", { flags: { 0: "“Is/Are” in a question = the particle ar; Lithuanian needs no copula here." } }),
      ),
    },
    // Not buying (yet): offered as the alternative, not among the first model answers
    think: {
      lt: "Pagalvoti arba atsisakyti",
      items: [
        { id: "think", s: t("I'll think | about | it.", "Pagalvosiu | apie | tai.", "Pagalvosiu.") },
        { id: "not_style", s: t("It's | not | really | my | style.", "Tai | ne | visai | mano | stilius.", "Ne visai mano stilius.") },
        { id: "too_expensive", s: t("It's | a little | too | expensive.", "Tai yra | truputį | per | brangu.", "Truputį per brangu.") },
      ],
    },
    price: {
      lt: "Paklausti kainos ar nuolaidos", slot: "clothing", examples: ["jacket", "jeans", "sweater", "shirt"],
      items: ordered(
        hv("q_price", "How much | is | it?", "How much | are | they?", "Kiek | kainuoja | {jis@X:nom}?", "Kiek kainuoja?"),
        hv("q_sale", "Is | it | on sale?", "Are | they | on sale?", "Ar | {jis@X:nom} | su nuolaida?", "Ar su nuolaida?", { flags: { 0: "“Is/Are” in a question = the particle ar; Lithuanian needs no copula here." } }),
        { id: "q_tax", s: t("Is | tax | included?", "Ar | mokesčiai | įskaičiuoti?", "Ar mokesčiai įskaičiuoti?", { flags: { 0: "“Is” in a question = the particle ar; the participle įskaičiuoti carries the rest." } }),
          note: "JAV kainos ant etiketės dažniausiai be pardavimo mokesčio – jis pridedamas kasoje." },
        { id: "q_return", s: t("What's | your | return | policy?", "Kokia yra | jūsų | grąžinimo | tvarka?", "Kokia jūsų grąžinimo tvarka?") },
      ),
    },
    rewards: {
      lt: "Atsakyti, ar turi lojalumo paskyrą",
      items: [
        { id: "rw_no", s: t("No, | I | don't.", "Ne, | aš | neturiu.", "Ne, neturiu.", { flags: { 2: "Elliptical “don't” (= don't have): Lithuanian repeats the verb, neturiu." } }) },
        { id: "rw_member", s: t("Yes, | I'm | a | member.", "Taip, | aš esu | — | {m:narys|f:narė}.", "Taip, esu {m:narys|f:narė}.") },
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
    bag: {
      lt: "Atsakyti, ar reikia maišelio", slot: "clothing", examples: ["jacket", "jeans", "scarf", "shoes"],
      items: ordered(
        { id: "bag_yes", s: t("Yes, | please.", "Taip, | prašau.", "Taip, prašau.") },
        { id: "bag_no", s: t("No, | thanks, | I | don't need | a | bag.", "Ne, | ačiū, | man | nereikia | — | maišelio.", "Ne, ačiū, maišelio nereikia.",
          { flags: { 2: "“I” → dative man: Lithuanian says “to me (it) is not needed”." } }) },
        [ // one expression, worn in Lithuanian with the verb each garment takes
          { id: "wear_it", s: t("No, | thanks, | I'll wear | it.", "Ne, | ačiū, | vilkėsiu | {jis@X:acc}.", "Ne, ačiū, iškart apsivilksiu."), only: (e) => !ENPL(e) && !e.attrs?.ltPl && !e.attrs?.oneSize },
          { id: "wear_it", s: t("No, | thanks, | I'll wear | it.", "Ne, | ačiū, | vilkėsiu | {jis@X:acc:pl}.", "Ne, ačiū, iškart apsivilksiu."), only: (e) => !ENPL(e) && !!e.attrs?.ltPl },
          { id: "wear_it", s: t("No, | thanks, | I'll wear | them.", "Ne, | ačiū, | mūvėsiu | {jis@X:acc:pl}.", "Ne, ačiū, iškart apsimausiu."), only: (e) => !!e.attrs?.pair && !e.attrs?.shoe },
          { id: "wear_it", s: t("No, | thanks, | I'll wear | them.", "Ne, | ačiū, | avėsiu | juos.", "Ne, ačiū, iškart apsiausiu."), only: (e) => !!e.attrs?.shoe },
          { id: "wear_it", s: t("No, | thanks, | I'll wear | it.", "Ne, | ačiū, | ryšėsiu | jį.", "Ne, ačiū, iškart užsirišiu."), only: (e) => !!e.attrs?.oneSize },
        ],
        { id: "gift_receipt", s: t("Could | I | get | a | gift | receipt?", "Ar galėčiau | aš | gauti | — | dovanos | čekį?", "Ar galėčiau gauti čekį be kainos dovanai?"),
          note: "„Gift receipt“ – čekis be kainos: gavėjas galės prekę pasikeisti." },
      ),
    },
    receipt: {
      lt: "Pasakyti, kaip gauti čekį",
      items: [
        { id: "rc_print", s: t("Printed, | please.", "Atspausdintą, | prašau.", "Atspausdinkite, prašau.", { flags: { 0: "“Printed” agrees with the receipt (čekis): accusative atspausdintą." } }) },
        { id: "rc_email", s: t("Email, | please.", "El. paštu, | prašau.", "Atsiųskite el. paštu, prašau.") },
        { id: "rc_none", s: t("No | receipt, | thanks.", "Jokio | čekio, | ačiū.", "Čekio nereikia, ačiū.", { flags: { 0: "“No” before a noun = jokio (genitive of negation)." } }) },
        { id: "gift_receipt", s: t("Could | I | get | a | gift | receipt?", "Ar galėčiau | aš | gauti | — | dovanos | čekį?", "Ar galėčiau gauti čekį be kainos dovanai?"),
          note: "„Gift receipt“ – čekis be kainos: gavėjas galės prekę pasikeisti." },
      ],
    },
    // Returns: the first answers of each return step.
    ret_start: {
      lt: "Pasakyti, ką nori grąžinti", slot: "clothing", examples: ["jacket", "jeans", "sweater", "shoes"],
      items: ordered(
        hv("ret_return", "I'd like | to return | this | {X}.", "I'd like | to return | these | {X}.", "Norėčiau | grąžinti | {šitas@X:acc} | {X:acc}.", "Norėčiau grąžinti {šitas@X:acc} {X:acc}."),
        hv("ret_exchange", "Can | I | exchange | it | for | a | bigger | size?", "Can | I | exchange | them | for | a | bigger | size?",
          "Ar galiu | aš | pasikeisti | {jis@X:acc} | į | — | didesnį | dydį?", "Ar galiu pasikeisti į didesnį dydį?", {}, {}, (e) => !e.attrs?.oneSize),
        { id: "ret_browse", s: t("No, | I'm | just | looking, | thanks.", "Ne, | aš | tik | žiūriu, | ačiū.", "Ne, tik žiūriu, ačiū.", { flags: { 1: "Progressive “am” has no separate Lithuanian word; the present tense of žiūriu carries it." } }) },
      ),
    },
    ret_receipt: {
      lt: "Pasakyti, ar turi čekį",
      items: [
        { id: "ret_receipt_here", s: t("Yes, | here's | the | receipt.", "Taip, | štai | — | čekis.", "Taip, štai čekis.") },
        { id: "ret_no_receipt", s: t("I | don't have | the | receipt.", "Aš | neturiu | — | čekio.", "Neturiu čekio.") },
        { id: "ret_lost", s: t("I | lost | it.", "Aš | pamečiau | jį.", "Pamečiau.", { flags: { 2: "“it” = the receipt (čekis), hence jį." } }) },
      ],
    },
    ret_reason: {
      lt: "Paaiškinti, kas negerai", slot: "clothing", examples: ["jacket", "jeans", "sweater", "shoes"],
      items: ordered(
        [
          { id: "ret_nofit", s: t("It | doesn't fit.", "— | Netinka.", "Netinka.", { flags: { 0: "The subject “It” needs no word: Lithuanian drops the pronoun, and netinka says it all." } }), only: (e) => !ENPL(e) },
          { id: "ret_nofit", s: t("They | don't fit.", "— | Netinka.", "Netinka.", { flags: { 0: "The subject “They” needs no word: Lithuanian drops the pronoun, and netinka says it all." } }), only: (e) => ENPL(e) },
        ],
        { id: "ret_ran", s: t("The | color | ran | in the rain.", "— | Spalva | nusišėrė | lietuje.", "Lietuje nusišėrė spalva.") },
        { id: "ret_mind", s: t("I | changed my mind.", "Aš | persigalvojau.", "Persigalvojau.") },
      ),
    },
    ret_choice: {
      lt: "Pasirinkti: pinigai, pasikeitimas ar kreditas",
      items: [
        { id: "ret_refund", s: t("I'd like | a | refund, | please.", "Norėčiau | — | pinigų grąžinimo, | prašau.", "Norėčiau atgauti pinigus.") },
        { id: "ret_exchange_an", s: t("I'd like | an | exchange, | please.", "Norėčiau | — | pasikeitimo, | prašau.", "Norėčiau pasikeisti, prašau.") },
        { id: "ret_credit", s: t("Store | credit | is fine.", "Parduotuvės | kreditas | tinka.", "Tinka ir parduotuvės kreditas."),
          note: "„Store credit“ – suma, kurią galėsite išleisti šioje parduotuvėje (dažnai – dovanų kortelėje)." },
      ],
    },
    ret: {
      lt: "Grąžinti ar pasikeisti prekę", slot: "clothing", examples: ["jacket", "jeans", "sweater", "shoes"],
      items: ordered(
        hv("ret_return", "I'd like | to return | this | {X}.", "I'd like | to return | these | {X}.", "Norėčiau | grąžinti | {šitas@X:acc} | {X:acc}.", "Norėčiau grąžinti {šitas@X:acc} {X:acc}."),
        hv("ret_exchange", "Can | I | exchange | it | for | a | bigger | size?", "Can | I | exchange | them | for | a | bigger | size?",
          "Ar galiu | aš | pasikeisti | {jis@X:acc} | į | — | didesnį | dydį?", "Ar galiu pasikeisti į didesnį dydį?", {}, {}, (e) => !e.attrs?.oneSize),
        { id: "ret_receipt_here", s: t("Here's | the | receipt.", "Štai | — | čekis.", "Štai čekis.") },
        { id: "ret_no_receipt", s: t("I | don't have | the | receipt.", "Aš | neturiu | — | čekio.", "Neturiu čekio.") },
        { id: "ret_ran", s: t("The | color | ran | in the rain.", "— | Spalva | nusišėrė | lietuje.", "Lietuje nusišėrė spalva.") },
        { id: "ret_mind", s: t("I | changed my mind.", "Aš | persigalvojau.", "Persigalvojau.") },
        { id: "ret_refund", s: t("I'd like | a | refund, | please.", "Norėčiau | — | pinigų grąžinimo, | prašau.", "Norėčiau atgauti pinigus.") },
        hv("ret_exchange_short", "I'd like | to exchange | it.", "I'd like | to exchange | them.", "Norėčiau | pasikeisti | {jis@X:acc}.", "Norėčiau pasikeisti."),
        { id: "ret_credit", s: t("Store | credit | is fine.", "Parduotuvės | kreditas | tinka.", "Tinka ir parduotuvės kreditas."),
          note: "„Store credit“ – suma, kurią galėsite išleisti šioje parduotuvėje (dažnai – dovanų kortelėje)." },
      ),
    },
  },

  tips: {
    uk_jumper: { key: "uk_jumper", lt: "Suprasta! Amerikoje megztinis vadinamas „sweater“.", better: "I'm looking for a sweater." },
    uk_trousers: { key: "uk_trousers", lt: "Suprasta! Amerikoje kelnės – „pants“ („trousers“ skamba britiškai).", better: "I'm looking for a pair of pants." },
    uk_trainers: { key: "uk_trainers", lt: "Suprasta! Amerikoje sportbačiai – „sneakers“.", better: "Do you have these sneakers in a nine?" },
    uk_changing: { key: "uk_changing", lt: "Suprasta! Amerikoje sakoma „fitting room“ arba „dressing room“.", better: "Where are the fitting rooms?" },
    uk_sale: { key: "uk_sale", lt: "Suprasta! Amerikoje sakoma „on sale“ (su nuolaida).", better: "Is it on sale?" },
    uk_till: { key: "uk_till", lt: "Suprasta! Amerikoje kasa – „register“ arba „checkout“.", better: "Where's the register?" },
    uk_after: { key: "uk_after", lt: "Suprasta! Amerikoje dažniau sakoma „I'm looking for …“.", better: "I'm looking for a jacket." },
  },

  // -------------------------------------------------------------------------

  mission: [
    // shopping (hidden during a return)
    { lt: "Pasakyk, ko ieškai", optional: true, when: shopMode, done: (c) => shopping(c) },
    { lt: "Pasakyk savo dydį", optional: true, when: (c) => shopMode(c) && !(cur(c) && oneSize(cur(c)!.id)),
      done: (c) => shopping(c) && !oneSize(cur(c)!.id) && hasSize(cur(c)!) },
    // only when Chloe asks for a color (or the learner picked one)
    { lt: "Pasirink spalvą", optional: true, when: (c) => shopMode(c) && !!c.s.askColor,
      done: (c) => shopping(c) && (!!cur(c)!.color || c.s.decision === "take") },
    // ticked once the fit is settled (or the learner skips trying on)
    { lt: "Pasimatuok", optional: true, when: shopMode, done: (c) => shopping(c) && (!!c.s.fitOk || !!c.s.fitDone || !!c.s.noTry || c.s.decision === "take") },
    { lt: "Pasakyk, kad imi", optional: true, when: shopMode, done: (c) => shopping(c) && c.s.decision === "take" },
    { lt: "Susimokėk", optional: true, when: shopMode, done: (c) => c.s.mode !== "return" && !!c.s.paid },
    // a return or an exchange (Chloe asks returning customers; anyone can start one)
    { lt: "Pasakyk, ką grąžini", optional: true, when: retMode, done: (c) => inReturn(c) },
    { lt: "Pasakyk, ar turi čekį", optional: true, when: retMode, done: (c) => inReturn(c) && ret(c).receipt !== undefined },
    { lt: "Paaiškink, kas negerai", optional: true, when: retMode, done: (c) => inReturn(c) && !!ret(c).reason },
    { lt: "Pasirink: pinigai ar keitimas", optional: true, when: retMode, done: (c) => inReturn(c) && !!ret(c).choice },
    { lt: "Išsirink kitą dydį ar spalvą", optional: true, when: (c) => inReturn(c) && ret(c).choice === "exchange",
      done: (c) => inReturn(c) && !!(ret(c).newSize || ret(c).newColor || ret(c).newShoe != null || ret(c).done) },
  ],

  steps: [
    // Shopping
    { id: "item", when: (c) => c.s.mode !== "return" && c.s.decision !== "none", done: (c) => !!cur(c),
      ask: (c) => {
        c.s.retOffer = false;
        if (c.s.browsing && !c.s.nudged) { c.s.nudged = true; c.say(c.s.showTable ? "sale_table" : "browse_nudge", { pct: c.s.pct }); return; }
        c.say(c.s.itemReset ? "ask_item_else" : "ask_item");
      },
      expects: ["looking_for", "just_looking", "ask_have_size", "ask_have_color", "try_on", "return_item", "exchange", "vague_item", "im_fine_ctx"],
      suggest: [
        { lt: "Pasakyti, ko ieškai", hint: "looking", options: "clothing" },
        { lt: "Pasakyti, kad tik apsidairai", hint: "browse" },
        { lt: "Paklausti, ar yra kito dydžio", hint: "size", options: "size" },
        { lt: "Paklausti apie spalvas", hint: "color", options: "color" },
      ],
      yes: (c) => { c.say("what_else"); c.hold(); },
      no: (c) => { if (c.s.itemReset) { c.s.decision = "none"; } else { c.say("browse_ok"); c.s.browsing = true; c.hold(); } },
      help: (c) => { c.say("browse_nudge"); } },
    { id: "size", when: (c) => c.s.mode !== "return" && !!cur(c) && !oneSize(cur(c)!.id) && !isShoe(cur(c)!.id) && !c.s.decision, done: (c) => !!cur(c)!.size,
      ask: (c) => c.say("ask_size"), expects: ["size_ans", "ask_have_size", "size_unknown", "ask_sizes", "color_ans", "ask_have_color", "ask_colors"],
      suggest: [{ lt: "Pasakyti savo dydį", hint: "size", options: "size" }],
      help: (c) => { c.say("size_list"); } },
    { id: "shoe", when: (c) => c.s.mode !== "return" && !!cur(c) && isShoe(cur(c)!.id) && !c.s.decision, done: (c) => cur(c)!.shoe != null,
      ask: (c) => c.say("ask_shoe"), expects: ["shoe_size", "shoe_size_ctx", "ask_have_size", "size_unknown"],
      suggest: [{ lt: "Pasakyti batų dydį (JAV arba Europos)", hint: "shoe_size" }],
      help: (c) => { c.say("shoe_guess"); } },
    { id: "color", when: (c) => c.s.mode !== "return" && !!cur(c) && c.s.askColor && !c.s.decision, done: (c) => !!cur(c)!.color,
      ask: (c) => {
        c.say("ask_color"); if (!c.s.colorsListed && c.chance(0.6)) sayColors(c, cur(c)!);
        const id = cur(c)!.id;
        guideFor(c, "color", id, { lt: "Pasirinkti spalvą", hint: itemHint("color", id), options: colorsOf(id) });
      },
      expects: ["color_ans", "ask_have_color", "ask_colors", "size_ans", "dislike_color"],
      suggest: [{ lt: "Pasirinkti spalvą", hint: "color", options: "color" }],
      help: (c) => { sayColors(c, cur(c)!); } },
    { id: "tryon", when: (c) => c.s.mode !== "return" && !!cur(c) && hasSize(cur(c)!) && !c.s.decision, done: (c) => !!c.s.tried || !!c.s.noTry,
      ask: (c) => {
        if (c.s.wantTry) { doTry(c); return; }
        sayN(c, "offer_try");
        guideFor(c, "tryon", cur(c)?.id);
      },
      expects: ["try_on", "no_try", "fit_good", "take_it", "ask_fitting_room", "ask_price", "ask_sale", "try_yes_ctx", "im_fine_ctx"],
      suggest: [{ lt: "Atsakyti, ar matuosies", hint: "tryon_ans" }, { lt: "Paklausti kainos ar nuolaidos", hint: "price", options: "clothing" }],
      hints: ["tryon_ans", "tryon", "price"],
      yes: (c) => { doTry(c); },
      no: (c) => { c.s.noTry = true; c.say("no_problem"); } },
    { id: "decide", when: (c) => c.s.mode !== "return" && !!cur(c) && hasSize(cur(c)!) && (!!c.s.fitOk || !!c.s.noTry || !!c.s.fitDone), done: (c) => !!c.s.decision,
      ask: (c) => {
        if (c.s.onSale && !c.s.saleSaid && c.chance(0.5)) { c.s.saleSaid = true; sayN(c, "sale_news", cur(c), { pct: c.s.pct }); }
        sayN(c, "decide_q");
        guideFor(c, "decide", cur(c)?.id);
      },
      expects: ["take_it", "think_about_it", "not_take", "too_expensive", "ask_price", "ask_sale", "ask_tax", "ask_return_policy", "dislike_color", "im_fine_ctx"],
      suggest: [
        { lt: "Pasakyti, kad imi, arba paklausti kainos", hint: "decide", options: "clothing" },
        { lt: "Pagalvoti arba atsisakyti", hint: "think" },
        { lt: "Atsakyti: taip arba ne", hint: "g_yesno" },
      ],
      hints: ["decide", "price", "think", "g_yesno"],
      yes: (c, ) => { clothes.handlers.take_it(c, {}, { intent: "take_it", slots: {}, tags: [] }); },
      no: (c) => { clothes.handlers.not_take(c, {}, { intent: "not_take", slots: {}, tags: [] }); } },
    { id: "rewards", when: (c) => c.s.mode !== "return" && c.s.decision === "take" && c.s.askRewards, done: (c) => c.s.rewards !== undefined,
      ask: (c) => c.say("rewards_q"), expects: ["rewards_member", "im_fine_ctx"],
      suggest: [{ lt: "Atsakyti, ar turi lojalumo paskyrą", hint: "rewards" }],
      yes: (c) => { c.s.rewards = true; c.say("rewards_member"); },
      no: (c) => {
        c.say("rewards_offer");
        c.expect({ id: "rewards_join", hints: ["g_yesno"], suggest: [{ lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
          yes: (cc) => { cc.s.rewards = true; cc.say("rewards_yes"); },
          no: (cc) => { cc.s.rewards = false; cc.say("rewards_no"); },
          ask: (cc) => cc.say("rewards_offer") });
      } },
    { id: "pay", when: (c) => c.s.mode !== "return" && c.s.decision === "take", done: (c) => !!c.s.paid,
      ask: (c) => {
        const total = Math.round(priceOf(c, cur(c)!) * TAX);
        c.say("total", { total });
        if (!c.s.totalSaid) { c.s.totalSaid = true; if (c.chance(0.35)) c.say("ask_pay_method"); }
      },
      expects: ["pay_card", "pay_cash", "pay_phone", "here_you_go", "no_cash"],
      suggest: [{ lt: "Susimokėti kortele, grynaisiais ar telefonu", hint: "pay" }] },
    { id: "bag", when: (c) => c.s.mode !== "return" && !!c.s.paid && c.s.askBag, done: (c) => c.s.bag !== undefined,
      ask: (c) => { c.say("ask_bag"); guideFor(c, "bag", cur(c)?.id); }, expects: ["wear_it", "no_bag", "gift_receipt", "want_bag", "im_fine_ctx", "no_receipt"],
      suggest: [{ lt: "Atsakyti, ar reikia maišelio", hint: "bag", options: "clothing" }],
      yes: (c) => { c.s.bag = true; c.say("bag_here"); },
      no: (c) => { c.s.bag = false; c.say("no_problem"); } },
    { id: "receipt", when: (c) => c.s.mode !== "return" && !!c.s.paid && c.s.askReceipt, done: (c) => c.s.receipt !== undefined,
      ask: (c) => c.say("ask_receipt"), expects: ["receipt_bag", "receipt_email", "no_receipt", "gift_receipt", "receipt_no_ctx", "im_fine_ctx"],
      suggest: [{ lt: "Pasakyti, kaip gauti čekį", hint: "receipt" }],
      yes: (c) => { c.s.receipt = "paper"; c.say("receipt_here"); c.event("give", { item: "receipt" }); },
      no: (c) => { c.s.receipt = "none"; c.say("receipt_keep"); } },

    // Returns and exchanges
    { id: "r_receipt", when: (c) => c.s.mode === "return", done: (c) => ret(c).receipt !== undefined,
      ask: (c) => c.say("ret_ask_receipt"), expects: ["receipt_yes", "receipt_none", "here_you_go"],
      suggest: [{ lt: "Pasakyti, ar turi čekį", hint: "ret_receipt" }],
      hints: ["ret_receipt", "ret", "g_yesno"],
      yes: (c) => { ret(c).receipt = true; c.say("ret_receipt_thanks"); },
      no: (c) => { ret(c).receipt = false; c.say("ret_receipt_none"); } },
    { id: "r_reason", when: (c) => c.s.mode === "return", done: (c) => !!ret(c).reason,
      ask: (c) => { sayN(c, "ret_ask_reason", ret(c).item); guideFor(c, "r_reason", ret(c).item.id); }, expects: ["problem", "fit_bad", "fit_unclear", "dislike_color"],
      suggest: [{ lt: "Paaiškinti, kas negerai", hint: "ret_reason" }, { lt: "Pasakyti, kad netinka dydis", hint: "fit", options: "clothing" }],
      hints: ["ret_reason", "fit", "ret"],
      yes: (c) => { sayN(c, "ret_what_wrong", ret(c).item); guideFor(c, "r_reason", ret(c).item.id); },
      no: (c) => { reactReason(c, "mind"); } },
    { id: "r_choice", when: (c) => c.s.mode === "return", done: (c) => !!ret(c).choice,
      ask: (c) => { if (ret(c).receipt) c.say("ret_choice_q"); else c.say("ret_choice_noreceipt"); },
      expects: ["want_refund", "exchange", "want_credit", "no_refund"],
      suggest: [{ lt: "Pasirinkti: pinigai, pasikeitimas ar kreditas", hint: "ret_choice" }],
      hints: ["ret_choice", "ret"],
      yes: (c) => { if (!ret(c).receipt) { ret(c).choice = "credit"; } else { c.say("ret_choice_q"); c.hold(); } },
      no: (c) => { if (!ret(c).receipt) { ret(c).choice = "exchange"; } else { c.say("ret_choice_q"); c.hold(); } } },
    { id: "r_new", when: (c) => c.s.mode === "return" && ret(c).choice === "exchange", done: (c) => !!(ret(c).newSize || ret(c).newColor || ret(c).newShoe != null || ret(c).done),
      ask: (c) => {
        const r = ret(c);
        const id = r.item.id;
        const size: Suggestion = isShoe(id) ? { lt: "Pasirinkti kitą dydį", hint: "shoe_size" } : { lt: "Pasirinkti kitą dydį", hint: "size", options: "size" };
        const color: Suggestion = { lt: "Pasirinkti kitą spalvą", hint: itemHint("color", id), options: colorsOf(id) };
        if (["up", "down", "nofit", "shrank"].includes(r.reason ?? "") && !oneSize(id)) { c.say("ret_exchange_size_q"); guideFor(c, "r_new", id, size, [color]); }
        else if (["ran", "dislike"].includes(r.reason ?? "") || oneSize(id)) { c.say("ret_exchange_color_q"); guideFor(c, "r_new", id, color, oneSize(id) ? [] : [size]); }
        else { c.say("ret_exchange_what_q"); guideFor(c, "r_new", id, size, [color]); }
      },
      expects: ["size_ans", "color_ans", "ask_have_size", "ask_have_color", "shoe_size", "shoe_size_ctx", "exchange"],
      suggest: [{ lt: "Pasirinkti kitą dydį", hint: "size", options: "size" }, { lt: "Pasirinkti kitą spalvą", hint: "color", options: "color" }],
      yes: (c) => { ret(c).done = true; c.say("ret_same_new"); } },
  ],

  init: (c) => {
    c.s.mode = "shop";
    c.s.item = null;
    c.s.askColor = c.chance(0.5);
    c.s.askRewards = c.chance(0.3);
    c.s.askBag = c.chance(0.7);
    c.s.askReceipt = c.chance(0.45);
    c.s.onSale = c.chance(0.45);
    c.s.pct = c.chance(0.5) ? 20 : 30;
    c.s.showTable = c.chance(0.5);
    c.s.lastOne = c.visits >= 1 && c.chance(0.4);
    c.s.returnVisit = c.visits >= 1 && c.chance(0.4);
  },

  start: (c) => {
    if (c.s.returnVisit) {
      c.s.retOffer = true; // the checklist shows the return plan until the learner says they are shopping
      c.twist("return_visit");
      c.say("greet_back");
      c.say("return_q");
      c.expect({
        id: "return_q", optional: true, expects: ["return_item", "exchange", "problem", "receipt_yes"], hints: ["ret_start", "ret", "browse", "g_yesno"],
        suggest: [{ lt: "Pasakyti, ką nori grąžinti ar pasikeisti", hint: itemHint("ret_start", (c.memory.lastBought as Garment | undefined)?.id ?? "jacket") }, { lt: "Pasakyti, kad tik apsidairai", hint: "browse" }],
        on: {
          return_item: (cc, sl, sg) => { clothes.handlers.return_item(cc, sl, sg); },
          exchange: (cc, sl, sg) => { clothes.handlers.exchange(cc, sl, sg); },
          problem: (cc, sl, sg) => { startReturn(cc, null); clothes.handlers.problem(cc, sl, sg); },
          fit_bad: (cc, sl, sg) => { cc.s.mode = "return"; clothes.handlers.fit_bad(cc, sl, sg); },
          receipt_yes: (cc) => { startReturn(cc, null); ret(cc).receipt = true; cc.say("ret_receipt_thanks"); },
          just_looking: (cc, sl, sg) => { clothes.handlers.just_looking(cc, sl, sg); },
          looking_for: (cc, sl, sg) => { cc.s.mode = "shop"; clothes.handlers.looking_for(cc, sl, sg); },
          item_short: (cc, sl, sg) => { cc.s.mode = "shop"; clothes.handlers.item_short(cc, sl, sg); },
          ask_have_size: (cc, sl, sg) => { cc.s.mode = "shop"; clothes.handlers.ask_have_size(cc, sl, sg); },
          ask_have_color: (cc, sl, sg) => { cc.s.mode = "shop"; clothes.handlers.ask_have_color(cc, sl, sg); },
          try_on: (cc, sl, sg) => { cc.s.mode = "shop"; clothes.handlers.try_on(cc, sl, sg); },
        },
        yes: (cc) => { startReturn(cc, null); cc.ask("r_receipt"); },
        no: (cc) => { cc.say("ret_shop_ok"); cc.ask("item"); },
        ask: (cc) => cc.say("return_q"),
      });
      return;
    }
    if (c.chance(0.3)) {
      c.say("greet_howareyou");
      expectHowAreYou(c);
      return;
    }
    c.say(c.visits >= 1 && c.chance(0.4) ? "greet_back" : "greet");
    c.ask("item");
  },

  handlers: {
    just_looking(c) {
      c.s.retOffer = false;
      if (c.s.mode === "return" && !ret(c)?.choice) c.s.mode = "shop";
      c.s.browsing = true;
      c.say("browse_ok");
      c.hold();
    },
    looking_for(c, slots) {
      const g = fromSlot(slots.item);
      if (c.s.mode === "return" && ret(c) && !ret(c).done) { c.s.mode = "shop"; }
      c.s.browsing = false; c.s.itemReset = false;
      if (c.s.decision === "none") c.s.decision = undefined;
      applyItem(c, g);
    },
    item_short(c, slots) { clothes.handlers.looking_for(c, slots, { intent: "looking_for", slots, tags: [] }); },
    looking_unknown(c) { c.say("unknown_item"); if (!cur(c)) c.ask("item"); else c.hold(); },
    im_fine_ctx(c, slots, seg) {
      const H = clothes.handlers;
      switch (c.step) {
        case "item": H.just_looking(c, slots, seg); return;
        case "tryon": H.no_try(c, slots, seg); return;
        case "bag": H.no_bag(c, slots, seg); return;
        case "receipt": H.no_receipt(c, slots, seg); return;
        case "decide": H.not_take(c, slots, seg); return;
        default: clothes.steps.find((x) => x.id === c.step)?.no?.(c);
      }
    },
    vague_item(c) { c.s.browsing = true; c.s.nudged = true; c.say("browse_nudge"); c.hold(); },
    change_item(c, slots) {
      const g = fromSlot(slots.item);
      if (g) { resetItem(c, null); applyItem(c, g); }
    },
    size_ans(c, slots, seg) {
      if (c.s.mode === "return" && ret(c)?.choice === "exchange") { exchangeTo(c, { size: slots.size }); return; }
      if (!cur(c)) applyItem(c, null);
      const g = cur(c)!;
      const tags = seg.tags;
      if (tags.includes("up") || tags.includes("down")) { changeSize(c, tags.includes("up") ? "up" : "down"); if (c.s.tried) { c.s.tried = false; c.s.wantTry = true; } return; }
      const was = g.size;
      setSize(c, g, slots.size);
      if (!oneSize(g.id) && !isShoe(g.id) && was !== g.size) {
        if (c.s.tried) { c.say("size_change", { S: g.size }); c.s.tried = false; c.s.wantTry = true; }
        else if (c.chance(0.5)) ack(c);
        maybeLastOne(c);
      }
    },
    ask_have_size(c, slots, seg) {
      if (c.s.mode === "return" && ret(c)?.choice === "exchange") {
        if (seg.tags.includes("up") || seg.tags.includes("down")) exchangeTo(c, { dir: seg.tags.includes("up") ? "up" : "down" });
        else exchangeTo(c, { size: slots.size, shoe: slots.shoe });
        return;
      }
      if (!cur(c)) applyItem(c, null);
      const g = cur(c)!;
      if (seg.tags.includes("up") || seg.tags.includes("down")) {
        if (changeSize(c, seg.tags.includes("up") ? "up" : "down") && c.s.tried) { c.s.tried = false; c.s.wantTry = true; }
        return;
      }
      if (slots.shoe != null) { if (setShoe(c, g, slots.shoe, seg.tags.includes("half")) && slots.shoe <= 15) ack(c); return; }
      if (slots.size) {
        const was = g.size;
        setSize(c, g, slots.size);
        if (!oneSize(g.id) && !isShoe(g.id)) {
          c.say("size_check", { S: g.size });
          maybeLastOne(c);
          if (c.s.tried && was !== g.size) { c.s.tried = false; c.s.wantTry = true; }
        }
      }
    },
    size_unknown(c) {
      if (!cur(c)) applyItem(c, null);
      const g = cur(c)!;
      if (isShoe(g.id)) { c.say("shoe_guess"); c.hold(); return; }
      if (oneSize(g.id)) { c.say("one_size"); return; }
      g.size = "medium";
      c.say("size_guess");
    },
    shoe_size(c, slots, seg) {
      if (c.s.mode === "return" && ret(c)?.choice === "exchange") { exchangeTo(c, { shoe: slots.shoe }); return; }
      if (!cur(c)) { resetItem(c, { id: "shoes" }); }
      const g = cur(c)!;
      if (setShoe(c, g, slots.shoe, seg.tags.includes("half"), seg.tags.includes("eu")) && slots.shoe <= 15) ack(c);
      if (c.s.tried) { c.s.tried = false; c.s.wantTry = true; }
    },
    // a bare number: "one" or "two" is never a shoe size ("the black one")
    shoe_size_ctx(c, slots, seg) { if (typeof slots.shoe === "number" && slots.shoe < 4) return; clothes.handlers.shoe_size(c, slots, seg); },
    color_ans(c, slots) {
      if (c.s.mode === "return" && ret(c)?.choice === "exchange") { exchangeTo(c, { color: slots.color }); return; }
      if (!cur(c)) applyItem(c, null);
      const g = cur(c)!;
      if (setColor(c, g, slots.color)) { if (c.chance(0.5)) ack(c); }
    },
    ask_have_color(c, slots) {
      if (c.s.mode === "return" && ret(c)?.choice === "exchange") { exchangeTo(c, { color: slots.color }); return; }
      if (!cur(c)) applyItem(c, null);
      const g = cur(c)!;
      if (setColor(c, g, slots.color)) sayN(c, "color_yes", g, { C: slots.color });
    },
    ask_colors(c) {
      if (!cur(c)) applyItem(c, null);
      sayColors(c, cur(c)!);
    },
    dislike_color(c) {
      if (c.s.mode === "return" && ret(c) && !ret(c).reason) { reactReason(c, "dislike"); return; }
      if (!cur(c)) { c.say("no_problem"); return; }
      const g = cur(c)!;
      g.color = undefined; c.s.askColor = true; c.s.fitOk = false; c.s.tried = false;
      sayColors(c, g);
    },
    try_on(c, slots) {
      const g = fromSlot(slots.item);
      if (g || !cur(c)) applyItem(c, g);
      if (!hasSize(cur(c)!)) { c.s.wantTry = true; return; }
      doTry(c);
    },
    try_yes_ctx(c, slots, seg) { clothes.handlers.try_on(c, {}, seg); },
    no_try(c) {
      if (!cur(c)) applyItem(c, null);
      c.s.noTry = true; c.s.wantTry = false;
      c.say("no_problem");
    },
    ask_fitting_room(c) {
      const g = cur(c);
      if (g && hasSize(g) && !c.s.tried && c.s.mode !== "return") { doTry(c); return; }
      c.say("fitting_rooms");
      if (g && !c.s.tried) c.s.wantTry = true;
    },
    fit_bad(c, slots, seg) {
      if (c.s.mode === "return" || !cur(c)) {
        const named = slots.clothing ? { id: last(slots.clothing) } : null;
        if (!ret(c) || c.s.mode !== "return") startReturn(c, named);
        c.s.mode = "return";
        if (!ret(c).reason) reactReason(c, seg.tags.includes("up") ? "up" : seg.tags.includes("down") ? "down" : "nofit");
        return;
      }
      const dir = seg.tags.includes("down") ? "down" : "up";
      c.s.fitOk = false;
      if (changeSize(c, dir)) {
        sayN(c, "try_this");
        c.expect({ ...fitPending(c), ask: (cc) => sayN(cc, "ask_fit") });
      } else c.s.fitDone = true; // no other size: the learner decides anyway
    },
    fit_unclear(c) {
      if (c.s.mode === "return") { if (!ret(c).reason) reactReason(c, "nofit"); return; }
      if (!cur(c)) return;
      c.say("fit_which");
      c.expect(fitWhich(c));
    },
    fit_good(c) {
      if (!cur(c)) { applyItem(c, null); }
      c.s.tried = true;
      fitGood(c);
    },
    sweet(c) { c.say("sweet_back"); },
    ask_price(c, slots) {
      const g0 = fromSlot(slots.item);
      if (g0 && (!cur(c) || cur(c)!.id !== g0.id)) applyItem(c, g0);
      if (!cur(c)) applyItem(c, null);
      const g = cur(c)!;
      const base = basePrice(g.id);
      if (c.s.onSale) { c.s.saleSaid = true; sayN(c, "price_sale", g, { price: base, pct: c.s.pct, amount: priceOf(c, g) }); }
      else sayN(c, "price_is", g, { price: base });
    },
    ask_sale(c, slots) {
      const g0 = fromSlot(slots.item);
      if (g0 && (!cur(c) || cur(c)!.id !== g0.id)) applyItem(c, g0);
      if (!cur(c)) applyItem(c, null);
      c.s.saleSaid = true;
      if (c.s.onSale) sayN(c, "sale_yes", cur(c), { pct: c.s.pct });
      else { sayN(c, "sale_no"); if (c.chance(0.5)) c.say("sale_general", { pct: c.s.pct }); }
    },
    ask_tax(c) { c.say("tax_info"); },
    ask_sizes(c) {
      if (!cur(c)) applyItem(c, null);
      const g = cur(c)!;
      if (oneSize(g.id)) c.say("one_size");
      else if (isShoe(g.id)) c.say("shoe_sizes_numbers");
      else c.say("size_list");
    },
    ask_return_policy(c) {
      if (!cur(c)) applyItem(c, null);
      sayN(c, "return_policy");
    },
    take_it(c, slots) {
      const g = fromSlot(slots?.item);
      if (g && (!cur(c) || cur(c)!.id !== g.id)) { applyItem(c, g); }
      if (!cur(c)) applyItem(c, null);
      const item = cur(c)!;
      if (slots?.color && !setColor(c, item, slots.color)) return;
      if (!hasSize(item)) { c.s.decision = undefined; c.s.buyWhenSized = true; return; }
      c.s.fitOk = true;
      c.s.decision = "take";
      if (c.s.__finished) c.s.__finished = false;
      sayN(c, "take_ok");
    },
    think_about_it(c) {
      if (!cur(c)) { c.say("browse_ok"); c.s.browsing = true; c.hold(); return; }
      c.s.decision = "think";
      c.say("think_ok");
    },
    not_take(c) {
      if (c.s.mode === "return") { if (!ret(c).reason) reactReason(c, "dislike"); return; }
      c.s.itemReset = true;
      resetItem(c, null);
      c.say("not_take_ok");
      c.expect({ id: "else_q", expects: ["looking_for"], hints: ["looking", "g_yesno"],
        suggest: [{ lt: "Pasakyti, ko dar ieškai", hint: "looking", options: "clothing" }, { lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
        on: {
          looking_for: (cc, sl, sg) => { clothes.handlers.looking_for(cc, sl, sg); },
          item_short: (cc, sl, sg) => { clothes.handlers.looking_for(cc, sl, sg); },
        },
        yes: (cc) => { cc.say("what_else"); cc.ask("item"); },
        no: (cc) => { cc.s.decision = "none"; },
        ask: (cc) => cc.say("not_take_ok") });
    },
    too_expensive(c) {
      if (!cur(c)) { c.say("no_problem"); return; }
      if (c.s.onSale && !c.s.saleSaid) { c.s.saleSaid = true; sayN(c, "expensive_sale", cur(c), { pct: c.s.pct }); }
      else c.say("expensive_ok");
    },
    pay_card(c) {
      if (c.s.decision !== "take") { c.say("card_later"); c.s.payMethod = "card"; return; }
      c.say("card_tap"); c.s.paid = true; c.s.payMethod = "card"; c.event("pay", { method: "card" }); c.say("paid");
    },
    pay_cash(c) {
      c.say("cash_ok"); c.s.payMethod = "cash";
      if (c.s.decision === "take" && c.s.totalSaid) { c.s.paid = true; c.event("pay", { method: "cash" }); c.say("change_back"); }
    },
    no_cash(c, slots, seg) { clothes.handlers.pay_card(c, slots, seg); },
    pay_phone(c) {
      c.s.payMethod = "phone";
      if (!(c.s.decision === "take" && c.s.totalSaid)) { c.say("phone_later"); return; }
      c.say("phone_ok");
      if (c.s.decision === "take" && c.s.totalSaid) { c.s.paid = true; c.event("pay", { method: "phone" }); c.say("paid"); }
    },
    here_you_go(c) {
      if (c.s.mode === "return" && ret(c) && ret(c).receipt === undefined) { ret(c).receipt = true; c.say("ret_receipt_thanks"); return; }
      if (c.s.decision !== "take" || !c.s.totalSaid) { c.say("no_problem"); return; }
      c.s.paid = true; c.event("pay", { method: c.s.payMethod || "cash" });
      if (c.s.payMethod === "card" || c.s.payMethod === "phone") c.say("paid"); else c.say("change_back");
    },
    keep_change(c) { if (c.s.decision === "take" && c.s.totalSaid) { c.s.paid = true; c.event("pay", { method: "cash" }); } c.say("thanks_tip"); },
    ask_where_pay(c) { c.say("pay_here"); },
    wear_it(c) {
      c.s.bag = false; c.s.wearing = true;
      c.say("cut_tags");
      if (!c.s.paid && c.s.decision !== "take" && cur(c)) { c.s.decision = "take"; }
    },
    no_bag(c) { c.s.bag = false; c.say("no_problem"); },
    want_bag(c) { if (c.s.bag !== true) { c.s.bag = true; c.say("bag_here"); } },
    gift_receipt(c) { c.s.receipt = "gift"; c.say(c.s.bag === false ? "gift_ok_nobag" : "gift_ok"); },
    receipt_bag(c) { c.s.receipt = "paper"; c.say("receipt_here"); c.event("give", { item: "receipt" }); },
    receipt_email(c) { c.s.receipt = "email"; c.say("receipt_email"); },
    no_receipt(c) { c.s.receipt = "none"; c.say("receipt_keep"); },
    receipt_no_ctx(c) { c.s.receipt = "none"; c.say("receipt_keep"); },
    rewards_member(c) { c.s.rewards = true; c.say("rewards_member"); },

    // Returns and exchanges
    return_item(c, slots, seg) {
      const g = fromSlot(slots.item);
      if (seg.tags.includes("canret") && c.s.mode !== "return" && cur(c) && !c.s.paid) { sayN(c, "return_policy"); return; }
      if (c.s.mode !== "return" || !ret(c)) startReturn(c, g);
      else if (g && g.id !== ret(c).item.id) ret(c).item = { id: g.id, paid: basePrice(g.id) };
      c.ask("r_receipt");
    },
    exchange(c, slots, seg) {
      const g = fromSlot(slots.item);
      if (c.s.mode !== "return" || !ret(c)) startReturn(c, g);
      const r = ret(c);
      r.choice = "exchange";
      const dir = seg.tags.includes("up") ? "up" : seg.tags.includes("down") ? "down" : undefined;
      if (dir || slots.size || slots.color || slots.shoe != null) exchangeTo(c, { dir, size: slots.size, color: slots.color, shoe: slots.shoe });
    },
    receipt_yes(c) {
      if (c.s.mode !== "return" || !ret(c)) startReturn(c, null);
      ret(c).receipt = true; c.say("ret_receipt_thanks");
    },
    receipt_none(c) {
      if (c.s.mode !== "return" || !ret(c)) startReturn(c, null);
      ret(c).receipt = false; c.say("ret_receipt_none");
      if (ret(c).choice === "refund") { ret(c).choice = undefined; }
    },
    problem(c, _slots, seg) {
      if (c.s.mode !== "return" || !ret(c)) startReturn(c, null);
      const reason = reasonFromTags(seg.tags) ?? "dislike";
      if (!ret(c).reason) reactReason(c, reason);
    },
    want_refund(c) {
      if (c.s.mode !== "return" || !ret(c)) startReturn(c, null);
      const r = ret(c);
      if (r.receipt === false) { c.say("ret_no_refund_receipt"); r.refusedRefund = true; return; }
      r.choice = "refund";
    },
    no_refund(c) {
      if (c.s.mode !== "return" || !ret(c)) startReturn(c, null);
      c.say("no_problem");
      ret(c).choice = "exchange";
    },
    no_credit(c) {
      if (c.s.mode !== "return" || !ret(c)) startReturn(c, null);
      c.say("no_problem");
      ret(c).choice = ret(c).receipt === false ? "exchange" : undefined;
    },
    want_credit(c) {
      if (c.s.mode !== "return" || !ret(c)) startReturn(c, null);
      ret(c).choice = "credit";
    },
  },

  finish: (c) => {
    if (c.s.mode === "return") {
      const r = ret(c);
      if (r.choice === "refund") { c.say("ret_refund_done"); c.say("ret_refund_days"); }
      else if (r.choice === "credit") { c.say("ret_credit_done", { amount: r.item.paid ?? basePrice(r.item.id) }); c.say("ret_credit_card"); c.event("give", { item: "store-credit" }); }
      else if (r.choice === "exchange") {
        const g: Garment = { ...r.item, size: r.newSize ?? r.item.size, color: r.newColor ?? r.item.color, shoe: r.newShoe ?? r.item.shoe };
        if (r.newShoe != null) c.say("shoes_here", { num: r.newShoe });
        else if (r.newSize && !r.newColor) c.say("size_here", { S: r.newSize });
        sayN(c, "ret_exchange_done", g);
        c.event("give", { item: g.id });
        c.remember({ lastBought: g });
      }
      r.done = true;
      c.complete();
      c.say("anything_else");
      closing(c);
      return;
    }
    if (c.s.paid) {
      const g = cur(c)!;
      c.complete();
      c.remember({ lastBought: { ...g, paid: priceOf(c, g) } });
      c.event("give", { item: g.id });
      sayN(c, "closing_bought", g);
      c.say("bye_after");
    } else {
      c.say("closing_nobuy");
      c.say("bye_after");
    }
    closing(c);
  },

  tests: [
    // hint patterns
    { say: "I'm just looking, thanks.", intent: "just_looking" },
    { say: "No, thanks, I'm fine. Just browsing.", intent: "just_looking" },
    { say: "I'm looking for a jacket.", intent: "looking_for", slots: { item: { clothing: "jacket" } } },
    { say: "I'm looking for a pair of jeans.", intent: "looking_for", slots: { item: { clothing: "jeans" } } },
    { say: "Do you have this jacket in a medium?", intent: "looking_for", slots: { item: { clothing: "jacket", size: "medium" } } },
    { say: "Do you have these jeans in black?", intent: "looking_for", slots: { item: { clothing: "jeans", color: "black" } } },
    { say: "Do you have this in blue?", intent: "ask_have_color", slots: { color: "blue" } },
    { say: "Does this come in navy?", intent: "ask_have_color", slots: { color: "navy" } },
    { say: "Do you have this in an extra large?", intent: "ask_have_size", slots: { size: "xl" } },
    { say: "Do you have a bigger size?", intent: "ask_have_size" },
    { say: "Can I try it on?", intent: "try_on" },
    { say: "Could I try on the sweater?", intent: "try_on", slots: { item: { clothing: "sweater" } } },
    { say: "Where are the fitting rooms?", intent: "ask_fitting_room" },
    { say: "It's a little tight.", intent: "fit_bad" },
    { say: "They're too long.", intent: "fit_bad" },
    { say: "It fits perfectly.", intent: "fit_good" },
    { say: "How much is it?", intent: "ask_price" },
    { say: "Is it on sale?", intent: "ask_sale" },
    { say: "Is tax included?", intent: "ask_tax" },
    { say: "I'll take it.", intent: "take_it" },
    { say: "I'll think about it.", intent: "think_about_it" },
    { say: "No, thanks, I'll wear it.", intent: "wear_it" },
    { say: "I'd like to return this jacket.", intent: "return_item", slots: { item: { clothing: "jacket" } } },
    { say: "The color ran in the rain.", intent: "problem" },
    { say: "I'd like a refund, please.", intent: "want_refund" },
    // natural alternatives and short answers
    { say: "Medium", intent: "size_ans", step: "size", slots: { size: "medium" } },
    { say: "I'm usually a large.", intent: "size_ans", step: "size", slots: { size: "large" } },
    { say: "Nine and a half", intent: "shoe_size_ctx", step: "shoe" },
    { say: "I wear a 43 in European sizes", intent: "shoe_size", slots: { shoe: 43 } },
    { say: "Black, please.", intent: "color_ans", step: "color", slots: { color: "black" } },
    { say: "The red one", intent: "color_ans", step: "color", slots: { color: "red" } },
    { say: "What colors do you have?", intent: "ask_colors" },
    { say: "Card", intent: "pay_card", step: "pay" },
    { say: "Here you go", intent: "here_you_go", step: "pay" },
    { say: "Could I get a gift receipt?", intent: "gift_receipt" },
    { say: "Exchange, please.", intent: "exchange", step: "r_choice" },
    { say: "Store credit is fine.", intent: "want_credit", step: "r_choice" },
    { say: "Here's the receipt.", intent: "receipt_yes", step: "r_receipt" },
    // British variants
    { say: "I'm looking for a jumper.", intent: "looking_for", slots: { item: { clothing: "sweater" } } },
    { say: "Do you have these trousers in a small?", intent: "looking_for", slots: { item: { clothing: "pants", size: "small" } } },
    { say: "Where are the changing rooms?", intent: "ask_fitting_room" },
    { say: "Is it in the sale?", intent: "ask_sale" },
    // negation and meaning preservation
    { say: "I don't want this jacket.", intent: "not_take", not: ["looking_for", "take_it"] },
    { say: "It doesn't fit.", intent: "fit_unclear", not: ["fit_good"] },
    { say: "It's not too small.", intent: "fit_good", not: ["fit_bad"] },
    { say: "I don't have the receipt.", intent: "receipt_none", not: ["receipt_yes"] },
    { say: "I don't want a refund.", intent: "no_refund", not: ["want_refund"] },
    { say: "I don't like the color.", intent: "dislike_color", not: ["color_ans"] },
    { say: "What sizes do you have?", intent: "ask_sizes" },
    { say: "I'll take the blue one.", intent: "take_it", slots: { color: "blue" } },
    { say: "I need a medium.", intent: "size_ans", step: "size", slots: { size: "medium" } },
    { say: "I'd like store credit.", intent: "want_credit", step: "r_choice" },
    { say: "I don't want store credit.", intent: "no_credit", not: ["want_credit"] },
    { say: "No, I don't want to try it on.", intent: "no_try", not: ["try_on"] },
    { say: "Not this one.", intent: "not_take", not: ["take_it"] },
    { say: "I lost it.", intent: "receipt_none", step: "r_receipt", not: ["receipt_yes"] },
    // model answers of the guide
    { say: "Sure! Where's the fitting room?", intent: "ask_fitting_room", step: "tryon" },
    { say: "No, thanks, I don't need a bag.", intent: "no_bag", step: "bag" },
    { say: "Printed, please.", intent: "receipt_bag", step: "receipt" },
    { say: "Email, please.", intent: "receipt_email", step: "receipt" },
    { say: "No, I don't.", intent: "yn:no", step: "rewards" },
    { say: "Yes, I'm a member.", intent: "rewards_member", step: "rewards" },
    { say: "They don't fit.", intent: "fit_unclear", step: "r_reason", not: ["fit_good"] },
    { say: "I'd like an exchange, please.", intent: "exchange", step: "r_choice" },
    { say: "Yes, here's the receipt.", intent: "receipt_yes", step: "r_receipt" },
    // unrelated
    { say: "the jacket is swimming to the moon", intent: "none" },
    { say: "purple elephant telephone", intent: "none" },
    { say: "Do you have umbrellas?", intent: "looking_unknown" },
    // more ways to say it (dev corpus tests/corpus/s74-clothes.json)
    { say: "Yes, I need a warm coat", intent: "looking_for", step: "item", slots: { item: { clothing: "coat" } }, not: ["looking_unknown"] },
    { say: "Where are the men's shirts?", intent: "looking_for", step: "item", slots: { item: { clothing: "shirt" } }, not: ["looking_unknown"] },
    { say: "Can you help me find a scarf?", intent: "looking_for", slots: { item: { clothing: "scarf" } } },
    { say: "I'm looking for something warm", intent: "vague_item", step: "item", not: ["looking_unknown"] },
    { say: "Can I look around?", intent: "just_looking", step: "item", not: ["looking_unknown"] },
    { say: "No, I'm okay, thank you", intent: "im_fine_ctx", step: "item" },
    { say: "The biggest one", intent: "size_ans", step: "size", slots: { size: "xl" } },
    { say: "Small, I'm not very big", intent: "size_ans", step: "size", slots: { size: "small" } },
    { say: "Medium, I'm quite tall.", intent: "size_ans", step: "size", slots: { size: "medium" } },
    { say: "I'm not a large.", intent: "none", step: "size", not: ["size_ans"] },
    { say: "Yes, I'd like to", intent: "try_yes_ctx", step: "tryon", not: ["looking_unknown"] },
    { say: "A bit tight", intent: "fit_bad", step: "tryon" },
    { say: "The sleeves are too long", intent: "fit_bad", step: "tryon" },
    { say: "I'll leave it", intent: "not_take", step: "decide" },
    { say: "Here's my card", intent: "pay_card", step: "pay", not: ["here_you_go"] },
    { say: "No, I'm fine", intent: "im_fine_ctx", step: "bag", not: ["just_looking"] },
    { say: "A small bag, please", intent: "want_bag", step: "bag" },
    { say: "No, I don't need it", intent: "receipt_no_ctx", step: "receipt", not: ["not_take"] },
    { say: "I'll take the yellow", intent: "color_ans", step: "color", slots: { color: "yellow" } },
    { say: "In Europe I wear 42", intent: "shoe_size", step: "shoe" },
    { say: "Yes, I bought it here last week", intent: "return_item" },
    { say: "It's on my phone", intent: "receipt_yes", step: "r_receipt" },
    { say: "My wife doesn't like it", intent: "problem", step: "r_reason" },
    { say: "Money back, please", intent: "want_refund", step: "r_choice" },
    { say: "I want another size", intent: "exchange", step: "r_choice", not: ["looking_unknown"] },
    { say: "The same, but in medium", intent: "size_ans", slots: { size: "medium" } },
    { say: "I don't want to try it on", intent: "no_try", step: "tryon", not: ["try_on", "try_yes_ctx"] },
    { say: "It's not comfortable", intent: "none", step: "tryon" },
    // learner English
    { say: "I search jacket", intent: "looking_for", step: "item", slots: { item: { clothing: "jacket" } } },
    { say: "I can try?", intent: "try_on", step: "tryon" },
    { say: "Is too small, I need bigger", intent: "fit_bad", step: "tryon" },
    { say: "I take it", intent: "take_it", step: "decide" },
    { say: "I want money back", intent: "want_refund", step: "r_choice", not: ["looking_unknown"] },
    { say: "Give me other size please", intent: "exchange", step: "r_choice" },
    { say: "The jacket is not good", intent: "fit_unclear", not: ["item_short", "fit_good"] },
    { say: "I don't have cash", intent: "no_cash", step: "pay", not: ["pay_cash"] },
    { say: "I don't like black", intent: "dislike_color", step: "color", not: ["color_ans"] },
    { say: "I don't need a gift receipt", intent: "no_receipt", step: "bag", not: ["gift_receipt"] },
    { say: "No, I'm not a member", intent: "im_fine_ctx", step: "rewards", not: ["rewards_member"] },
  ],

  sims: [
    { name: "happy path: jacket, try on, buy", turns: ["Hi! I'm looking for a jacket.", "Medium, please.", "Yes, please.", "It fits perfectly.", "I'll take it.", "Card, please.", "Thank you, bye!"],
      expect: { complete: true }, auto: AUTO },
    { name: "questions, colors, fit problem", turns: ["Hi, do you have this in blue?", "Black, please. I'm a small.", "Sure, where are the fitting rooms?", "It's a little tight.",
      "It fits perfectly.", "How much is it?", "Is it on sale?", "Is tax included?", "I'll take it.", "Cash.", "No, thanks, I'll wear it.", "Bye!"],
      expect: { complete: true }, auto: AUTO },
    { name: "shoes in a European size", turns: ["I'm looking for a pair of shoes.", "I'm a 43 in European sizes.", "Can I try them on?", "They're too small.", "They fit perfectly.", "How much are they?",
      "I'll take them.", "Can I pay by card?", "Thanks, bye!"], expect: { complete: true }, auto: AUTO },
    { name: "return with receipt, exchange", turns: ["Hi, I'd like to return this jacket.", "Yes, here it is.", "The color ran in the rain.", "I'd like to exchange it.", "Black, please.", "Thank you, bye!"],
      expect: { complete: true }, auto: AUTO },
    { name: "return without receipt, store credit", turns: ["I'd like to return these jeans.", "I don't have the receipt.", "They're too big.", "Can I get a refund?", "Store credit is fine.", "No, thanks. Bye!"],
      expect: { complete: true }, auto: AUTO },
    { name: "just looking, then decides not to buy", turns: ["I'm just looking, thanks.", "Actually, can I see the sweater in the window?", "Large.", "I don't need to try it on.", "I'll think about it.", "Bye!"],
      expect: { complete: false }, auto: { ...AUTO, color: "Gray, please.", tryon: "No, thanks.", decide: "I'll think about it.", fit: "It fits perfectly.", return_q: "No, I'm just looking, thanks." } },
  ],
};

// Per-garment copies of the hint groups the guide shows while one garment is in play, so the model
// answers say "it" or "them" and agree in Lithuanian with that garment ("decide_jeans": "I'll take them.").
const PER_ITEM = ["tryon_ans", "fit", "fit_which", "decide", "bag", "ret_start", "ret_reason"];
for (const gid of PER_ITEM) {
  const base = clothes.hints[gid];
  for (const e of CLOTHING) {
    const items = base.items.filter((it) => !it.only || it.only(e)).sort((a, b) => (ENTRY.get(a) ?? 0) - (ENTRY.get(b) ?? 0));
    clothes.hints[`${gid}_${e.id}`] = { ...base, examples: [e.id], items };
  }
}
// Colors: the model answers name colors this garment comes in ("color_sweater": "Gray, please.").
for (const e of CLOTHING) clothes.hints[`color_${e.id}`] = { ...clothes.hints.color, examples: colorsOf(e.id) };
function itemHint(gid: string, id?: string | null): string { return id && clothes.hints[`${gid}_${id}`] ? `${gid}_${id}` : gid; }

/** Re-state a step's question as an optional pending whose first suggestion uses the garment's hint group
 *  (the step's own suggestions stay as they are; yes/no and all intents behave exactly as for the step). */
function guideFor(c: Ctx, stepId: string, garment?: string | null, main?: Suggestion, rest?: Suggestion[]) {
  const st = clothes.steps.find((x) => x.id === stepId)!;
  const first = main ?? st.suggest![0];
  const hint = main ? first.hint! : itemHint(first.hint!, garment);
  const others = rest ?? st.suggest!.slice(1);
  // `on: {}`: a yes/no with more words ("Sure! Where's the fitting room?") goes to the intents, as for the step
  // phrase list: the tuned group, the other suggestions, then the step's groups (not the generic copy of the tuned one)
  const all = [hint, ...others.map((x) => x.hint!), ...(st.hints ?? st.suggest!.map((x) => x.hint!))];
  c.expect({ id: stepId, optional: true, expects: st.expects, yes: st.yes, no: st.no, on: {},
    suggest: [{ lt: first.lt, hint, options: first.options }, ...others],
    hints: [...new Set(all.filter((h) => h === hint || h !== st.suggest![0].hint || !hint.startsWith(h + "_")))] });
}

function exchangeTo(c: Ctx, o: { size?: string; color?: string; shoe?: number; dir?: "up" | "down" }) {
  const r = ret(c);
  r.choice = "exchange";
  const id = r.item.id;
  if (!r.reason && (o.dir || o.size || o.shoe != null)) r.reason = o.dir ?? "nofit";
  if (!r.reason && o.color) r.reason = "dislike";
  if (o.dir && !oneSize(id)) {
    if (isShoe(id)) { r.newShoe = (r.item.shoe ?? 9) + (o.dir === "up" ? 1 : -1); }
    else {
      const i = SIZE_ORDER.indexOf(r.item.size ?? "medium");
      r.newSize = SIZE_ORDER[Math.max(0, Math.min(SIZE_ORDER.length - 1, i + (o.dir === "up" ? 1 : -1)))];
    }
  }
  if (o.size && !isShoe(id) && !oneSize(id)) r.newSize = o.size;
  if (o.shoe != null && isShoe(id)) r.newShoe = o.shoe >= 33 ? euToUs(c, o.shoe) : o.shoe;
  if (o.color) {
    if (colorsOf(id).includes(o.color)) r.newColor = o.color;
    else { sayN(c, "color_no", r.item, { C: o.color }); sayColors(c, r.item); c.hold(); }
  }
}

function closing(c: Ctx) {
  c.expect({ id: "closing", optional: true, hints: ["g_social"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "g_social" }],
    on: {
      g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
      g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
      take_it: (cc, sl, sg) => {
        if (cc.s.mode === "return" || cc.s.paid || !cur(cc)) return false;
        clothes.handlers.take_it(cc, sl, sg);
        cc.s.__finished = false;
        cc.ask("pay");
      },
    },
    yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
}

export default clothes;
