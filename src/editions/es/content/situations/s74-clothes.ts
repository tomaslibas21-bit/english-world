// Song 74 "Can I Try It On?" → Puerto Colibrí: "¿Me lo puedo probar?"
// Boutique Hilos, a small clothes shop downtown; sales assistant Valeria (usted). Built on the English edition's
// s74-clothes: the same steps, intents, handlers and twists, with a beach town's stock (guayaberas, vestidos,
// trajes de baño, sandalias, tenis), Mexican sizes (chica, mediana, grande, extra grande; shoes in Mexican
// numbers, "¿Qué número calza?", with a rough conversion from US and European sizes), the probador, "¿Cómo le
// quedó?", "me queda grande / chico", colors that agree ("la blusa blanca", "las sandalias negras"), the sale
// ("30% de descuento"), prices with IVA already included, "me lo llevo puesto", a paper bag (no plastic bags in
// Quintana Roo), the ticket, and exchanges ("cambios") more than refunds.
// Twists (visits ≥ 1): a return or exchange of the last thing bought; "es la última pieza"; and (the brief's twist)
// the size the learner asks for is sold out: Valeria offers the next size.
//
// Spanish agreement: garments that are plural in use (los pantalones, los shorts, las sandalias, los tenis) are bound
// with qty 2, so {lo@X} → los / las and the "_pl" line variants (plural verbs, English "them") are chosen.
// Guide: as in the English edition, steps whose answers depend on the garment re-state their question as an optional
// pending that points the guide at a per-garment copy of the hint group (lo / la / los / las in the model answers).

// The shared yes list has "Sí / Claro, ¿por qué no?" since 2 Nov; a bare "¿Por qué no?" stays local (why_not_ctx at decide, the sold-out offer and the sign-up).
// NEEDS: engine: "playa" is read as this file's "playera" (a recognizer slip); worked around with beach_unknown and a guard in looking_for (a bare "La playa" still parses as playera, but Valeria answers about the beach).

import type { Ctx, EntityDef, HintItem, Pending, SentSrc, SituationDef, Suggestion } from "@/content/types";
import { ent, t } from "@/content/dsl";
import { expectHowAreYou } from "@/content/global";

// ---------------------------------------------------------------------------
// Entities (prices in cents of a peso; IVA included, as Mexican shelf prices are)

const G = (id: string, es: string, en: string, g: "m" | "f", price: number, colors: string[], extra: { pl?: string; ltPl?: string; forms?: string[]; many?: boolean; shoe?: boolean; oneSize?: boolean; nat?: string; natPl?: string; chip?: string } = {}) =>
  ent(id, es, en, g, { pl: extra.pl, ltPl: extra.ltPl, forms: extra.forms, chip: extra.chip,
    attrs: { price, colors, many: !!extra.many, shoe: !!extra.shoe, oneSize: !!extra.oneSize, nat: extra.nat, natPl: extra.natPl } });

export const CLOTHING: EntityDef[] = [
  G("guayabera", "guayabera", "guayabera", "f", 95000, ["blanco", "azul", "beige"], { forms: ["guayaberas", "guayabera de lino", "camisa guayabera", "guallabera"],
    nat: "guayabera shirt", natPl: "guayabera shirts" }),
  G("camisa", "camisa", "shirt", "f", 65000, ["blanco", "azul", "rosa"], { forms: ["camisas", "camisa de manga larga", "camisa de manga corta", "camisita"] }),
  G("blusa", "blusa", "blouse", "f", 55000, ["blanco", "amarillo", "verde"], { forms: ["blusas", "blusita", "blusa de tirantes"] }),
  G("playera", "playera", "T-shirt", "f", 29000, ["blanco", "negro", "gris"], { forms: ["playeras", "playerita", "camiseta", "camisetas", "remera", "remeras", "polera", "t shirt", "tshirt"] }),
  G("vestido", "vestido", "dress", "m", 89000, ["rojo", "azul", "amarillo"], { pl: "vestidos", ltPl: "dresses", forms: ["vestidos", "vestidito", "vestido de playa", "vestido largo"] }),
  G("falda", "falda", "skirt", "f", 59000, ["negro", "rojo", "beige"], { forms: ["faldas", "faldita", "pollera"] }),
  G("pantalon", "pantalón", "pants", "m", 79000, ["negro", "azul", "beige"], { pl: "pantalones", ltPl: "pants", many: true,
    forms: ["pantalones", "pantalon de mezclilla", "pantalones de mezclilla", "jeans", "vaqueros", "pantalon de lino", "pantalones de lino"] }),
  G("short", "short", "shorts", "m", 45000, ["azul", "beige", "verde"], { pl: "shorts", ltPl: "shorts", many: true,
    forms: ["shorts", "chor", "chores", "bermuda", "bermudas", "pantalon corto", "pantalones cortos", "pantaloncito corto"] }),
  G("traje", "traje | de | baño", "suit | for | bathing", "m", 69000, ["negro", "azul", "rojo"], { pl: "trajes | de | baño", ltPl: "suits | for | bathing",
    forms: ["traje de bano", "trajes de bano", "banador", "banadores", "vestido de bano", "malla", "bikini", "bikinis", "traje para nadar"], nat: "swimsuit", natPl: "swimsuits", chip: "traje de baño" }),
  G("sombrero", "sombrero", "hat", "m", 39000, ["beige", "blanco", "negro"], { pl: "sombreros", ltPl: "hats", oneSize: true, forms: ["sombreros", "sombrerito", "gorro", "sombrero de playa", "sombrero de palma"] }),
  G("sandalias", "sandalia", "sandal", "f", 75000, ["negro", "blanco", "beige"], { pl: "sandalias", ltPl: "sandals", many: true, shoe: true,
    forms: ["sandalias", "huaraches", "huarache", "chanclas", "chancletas", "sandalias de piel"] }),
  G("tenis", "tenis", "sneaker", "m", 129000, ["blanco", "negro", "azul"], { pl: "tenis", ltPl: "sneakers", many: true, shoe: true,
    forms: ["zapatillas", "zapatilla", "zapatos deportivos", "tennis", "sneakers", "zapatos de deporte", "tenis para correr"] }),
];

// Colors: the masculine form is the entity; as a modifier it agrees with the garment ("una blusa blanca").
const col = (id: string, es: string, en: string, forms: string[]) => ent(id, es, en, "m", { forms });
export const COLORS: EntityDef[] = [
  col("blanco", "blanco", "white", ["blanca", "blancos", "blancas", "color blanco"]),
  col("negro", "negro", "black", ["negra", "negros", "negras", "color negro"]),
  col("azul", "azul", "blue", ["azules", "azul marino", "azul cielo", "azul claro", "azul oscuro", "color azul"]),
  col("rojo", "rojo", "red", ["roja", "rojos", "rojas", "color rojo"]),
  col("verde", "verde", "green", ["verdes", "color verde"]),
  col("amarillo", "amarillo", "yellow", ["amarilla", "amarillos", "amarillas", "color amarillo"]),
  col("rosa", "rosa", "pink", ["rosas", "rosado", "rosada", "rosados", "rosadas", "rosita", "color rosa"]),
  col("gris", "gris", "gray", ["grises", "color gris"]),
  col("cafe", "café", "brown", ["cafes", "marron", "marrones", "color cafe", "color marron"]),
  col("beige", "beige", "beige", ["beis", "beiges", "crema", "color beige", "arena", "color arena"]),
  col("morado", "morado", "purple", ["morada", "morados", "moradas", "lila", "violeta"]),
  col("naranja", "naranja", "orange", ["naranjas", "anaranjado", "anaranjada", "color naranja"]),
];

// Sizes: feminine, as "la talla" ("la mediana", "una grande").
export const SIZES: EntityDef[] = [
  ent("chica", "chica", "small", "f", { chip: "chica (CH)", forms: ["chico", "chicos", "chicas", "ch", "small", "s", "pequena", "pequeno", "la mas chica", "la mas pequena"] }),
  ent("mediana", "mediana", "medium", "f", { chip: "mediana (M)", forms: ["mediano", "medianos", "medianas", "m", "eme", "medium"] }),
  ent("grande", "grande", "large", "f", { chip: "grande (G)", forms: ["grandes", "g", "l", "large"] }),
  ent("xg", "extra | grande", "extra | large", "f", { chip: "extra grande (XG)", forms: ["extra grande", "extragrande", "xg", "xl", "equis ele", "equis ge", "extra large", "la mas grande"] }),
];

const ALL = [...CLOTHING, ...COLORS, ...SIZES];
const byId = (id: string) => ALL.find((e) => e.id === id)!;
const SIZE_ORDER = ["chica", "mediana", "grande", "xg"];
const FEATURED: Garment = { id: "guayabera", color: "blanco" };

// ---------------------------------------------------------------------------
// State helpers

interface Garment { id: string; color?: string; size?: string; shoe?: number; half?: boolean; paid?: number }
interface Ret { item: Garment; receipt?: boolean; reason?: string; choice?: "refund" | "exchange" | "credit"; newSize?: string; newColor?: string; newShoe?: number; done?: boolean; refusedRefund?: boolean }

const attrs = (id: string) => byId(id).attrs || {};
/** Plural in use (los pantalones, las sandalias): Spanish plural agreement and English "them". */
const many = (id: string) => !!attrs(id).many;
const isShoe = (id: string) => !!attrs(id).shoe;
const oneSize = (id: string) => !!attrs(id).oneSize;
const colorsOf = (id: string) => (attrs(id).colors as string[]) || [];
const cur = (c: Ctx) => c.s.item as Garment | null;
const ret = (c: Ctx) => c.s.ret as Ret;
const bind = (g: Garment) => ({ id: g.id, qty: many(g.id) ? 2 : 1 });
const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const last = (x: any) => (Array.isArray(x) ? x[x.length - 1] : x);
const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function basePrice(id: string): number { return attrs(id).price as number; }
function priceOf(c: Ctx, g: Garment): number {
  const p = basePrice(g.id);
  return c.s.onSale ? Math.floor((p * (100 - c.s.pct)) / 10000) * 100 : p;
}

/** Say a line in its plural variant (…_pl) for garments plural in use; the Spanish agreement comes from the binding. */
function sayN(c: Ctx, line: string, g: Garment | null = cur(c), vars: Record<string, any> = {}) {
  const usePl = g && many(g.id) && !!clothes.lines[line + "_pl"];
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

/** Shoe sizes: Mexico numbers shoes roughly by the foot's length in centimeters. Rough conversions only
 *  ("más o menos"): US + 18; European − 13 (women) or − 15 (men). */
function toMx(c: Ctx, n: number, half: boolean, from: "us" | "eu"): { n: number; half: boolean } {
  const v = from === "us" ? n + (half ? 0.5 : 0) + 18 : n - (c.player.gender === "f" ? 13 : 15);
  return { n: Math.floor(v), half: v % 1 !== 0 };
}

function resetItem(c: Ctx, g: Garment | null) {
  c.s.item = g;
  c.s.tried = false; c.s.noTry = false; c.s.fitOk = false; c.s.fitDone = false; c.s.decision = undefined; c.s.wantTry = false;
}

/** The learner named or pointed at a garment (optionally with color and size). */
function applyItem(c: Ctx, g: Garment | null) {
  c.s.retOffer = false;
  const before = cur(c);
  let target: Garment;
  if (g && (!before || before.id !== g.id)) {
    resetItem(c, { id: g.id });
    target = cur(c)!;
    c.say("ack_item");
  } else if (g) {
    target = before!;
  } else if (before) {
    target = before;
  } else {
    // "¿La tiene en mediana?" with nothing named: the white guayabera on the mannequin.
    resetItem(c, { ...FEATURED });
    target = cur(c)!;
    c.say("confirm_featured");
  }
  if (g?.color) setColor(c, target, g.color);
  if (g?.size) setSize(c, target, g.size);
  if (g?.shoe != null) setShoe(c, target, g.shoe, !!g.half);
}

function setColor(c: Ctx, g: Garment, color: string): boolean {
  if (colorsOf(g.id).includes(color)) { g.color = color; return true; }
  c.say("color_no", { C: color });
  sayColors(c, g);
  return false;
}

function sayColors(c: Ctx, g: Garment) {
  const [A, B, C] = colorsOf(g.id);
  sayN(c, "color_list", g, { A, B, C });
  c.s.colorsListed = true;
}

/** Set a letter size; false when it can't be had (one size, shoes, or sold out: the twist). */
function setSize(c: Ctx, g: Garment, size: string): boolean {
  if (oneSize(g.id)) { c.say("one_size"); return false; }
  if (isShoe(g.id)) { c.say("shoe_sizes_numbers"); return false; }
  if (c.s.soldOutSize === size && g.id === c.s.soldOutItem) { c.say("sold_out_again", { S: size }); return false; }
  if (c.s.soldOut && !c.s.soldOutSaid && c.s.mode !== "return") { soldOut(c, g, size); return false; }
  const changed = g.size && g.size !== size;
  g.size = size;
  if (changed) { c.s.tried = false; c.s.fitOk = false; }
  return true;
}

/** Twist: the size asked for is sold out; Valeria offers the next one. */
function soldOut(c: Ctx, g: Garment, size: string) {
  c.s.soldOutSaid = true; c.s.soldOutSize = size; c.s.soldOutItem = g.id;
  c.twist("sold_out");
  const i = SIZE_ORDER.indexOf(size);
  const alt = SIZE_ORDER[i < SIZE_ORDER.length - 1 ? i + 1 : i - 1];
  c.say("sold_out", { S: size });
  // "¿Quiere probarse la grande?" – a yes goes to the fitting room; "¿Le traigo la grande?" – the color comes first
  const tryOffer: boolean = c.s.soldOutTry ?? (!(c.s.askColor && !g.color) && c.chance(0.5));
  c.say(tryOffer ? "sold_out_offer_try" : "sold_out_offer", { T: alt });
  const take = (cc: Ctx, tryNow = false) => { if (!cur(cc)) return; cur(cc)!.size = alt; if (tryNow) doTry(cc); else sayN(cc, "sold_out_take"); };
  const offer = (): Pending => ({ id: "soldout", optional: true, expects: ["size_ans", "ask_have_size", "ask_sizes", "not_take", "think_about_it", "try_on", "why_not_ctx", "ask_price"], hints: ["size", "g_yesno"],
    suggest: [{ lt: "Say yes or no", hint: "g_yesno" }, { lt: "Ask for another size", hint: "size", options: "size" }],
    on: { try_on: (cc) => { take(cc, true); }, why_not_ctx: (cc) => { take(cc, tryOffer); },
      // "¿Cuánto cuesta la grande?": the price, and the offer stays open
      ask_price: (cc, sl, sg) => { clothes.handlers.ask_price(cc, sl, sg); cc.expect(offer()); } },
    yes: (cc) => { take(cc, tryOffer); },
    no: (cc) => { clothes.handlers.not_take(cc, {}, { intent: "not_take", slots: {}, tags: [] }); },
    ask: (cc) => cc.say(tryOffer ? "sold_out_offer_try" : "sold_out_offer", { T: alt }) });
  c.expect(offer());
}

/** A short acknowledgement at most once per learner turn. */
function ack(c: Ctx) {
  if (!firstThisTurn(c, "ack")) return;
  c.say("size_ok");
}

/** True the first time `key` comes up in this learner turn (every turn has its own context object). */
const TURN = new WeakMap<object, Set<string>>();
function firstThisTurn(c: Ctx, key: string): boolean {
  let seen = TURN.get(c);
  if (!seen) TURN.set(c, (seen = new Set()));
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}

/** Twist: "¡Qué suerte! Es la última pieza en esa talla" (said once, after the size is settled). */
function maybeLastOne(c: Ctx) {
  if (!c.s.lastOneSaid && c.s.lastOne && c.chance(0.6)) { c.s.lastOneSaid = true; c.twist("last_one"); c.say("last_one"); }
}

/** A shoe number: Mexican (20–32), US (4–15) or European (33–50), converted roughly. */
function setShoe(c: Ctx, g: Garment, n: number, half = false, from?: "us" | "eu"): boolean {
  if (!isShoe(g.id)) { c.say("which_size_letters"); return false; }
  const src = from ?? (n >= 33 && n <= 50 ? "eu" : n >= 4 && n <= 15 ? "us" : undefined);
  if (src && ((src === "eu" && n >= 33 && n <= 50) || (src === "us" && n >= 4 && n <= 15))) {
    const mx = toMx(c, n, half, src);
    g.shoe = mx.n; g.half = mx.half;
    const line = src === "eu" ? (from ? "eu_size_known" : "eu_size") : "us_size";
    c.say(mx.half ? line + "_half" : line, { num: mx.n });
    return true;
  }
  if (n >= 20 && n <= 32) { g.shoe = n; g.half = half; return true; }
  c.say("shoe_size_again");
  return false;
}

function hasSize(g: Garment) { return oneSize(g.id) || (isShoe(g.id) ? g.shoe != null : !!g.size); }

// Checklist modes: shopping, or a return (also while Valeria's "¿Viene a hacer un cambio?" is open).
const shopMode = (c: Ctx) => c.s.mode !== "return" && !c.s.retOffer;
const retMode = (c: Ctx) => c.s.mode === "return" || !!c.s.retOffer;
const inReturn = (c: Ctx) => c.s.mode === "return" && !!c.s.ret;
const shopping = (c: Ctx) => c.s.mode !== "return" && !!cur(c);

/** Try it on: the probadores, then wait for the learner's report on the fit. */
function doTry(c: Ctx) {
  const g = cur(c)!;
  c.s.tried = true; c.s.wantTry = false;
  if (isShoe(g.id)) c.say(g.half ? "shoes_here_half" : "shoes_here", { num: g.shoe });
  else if (!oneSize(g.id) && g.size && c.chance(0.6)) c.say("size_here", { S: g.size });
  if (isShoe(g.id)) c.say("try_seat");
  else c.say("fitting_rooms");
  sayN(c, "let_me_know");
  c.expect(fitPending(c));
}

function fitPending(c: Ctx): Pending {
  const g = cur(c)!;
  return {
    id: "fit", expects: ["fit_bad", "fit_good", "fit_unclear", "take_it", "fit_like_ctx"], hints: [itemHint("fit", g.id), isShoe(g.id) ? "shoe_size" : "size"],
    suggest: [
      { lt: "Say how it fits", hint: itemHint("fit", g.id) },
      { lt: "Ask for another size", hint: isShoe(g.id) ? "shoe_size" : "size", options: isShoe(g.id) ? undefined : "size" },
    ],
    on: {
      fit_bad: (cc, sl, seg) => { clothes.handlers.fit_bad(cc, sl, seg); },
      fit_good: (cc, sl, seg) => { clothes.handlers.fit_good(cc, sl, seg); },
      fit_like_ctx: (cc, sl, seg) => { clothes.handlers.fit_good(cc, sl, seg); },
      fit_unclear: (cc, sl, seg) => { clothes.handlers.fit_unclear(cc, sl, seg); },
      take_it: (cc, sl, seg) => { cc.s.fitOk = true; clothes.handlers.take_it(cc, sl, seg); },
      // "¿Cómo le quedó?" – "Grande." / "Chica.": a report on the fit, not a size wanted
      size_ans: (cc, sl, seg) => {
        if (seg.tags.includes("bare") && (sl.size === "grande" || sl.size === "chica")) {
          clothes.handlers.fit_bad(cc, sl, { ...seg, tags: [...seg.tags, sl.size === "grande" ? "down" : "up"] });
          return;
        }
        clothes.handlers.size_ans(cc, sl, seg);
      },
      g_ok: (cc) => { fitGood(cc); },
    },
    yes: (cc) => { fitGood(cc); },
    no: (cc) => { cc.say("fit_which", { X: bind(cur(cc)!) }); cc.expect(fitWhich(cc)); },
    ask: (cc) => sayN(cc, "ask_fit"),
  };
}

function fitWhich(c: Ctx): Pending {
  const p = fitPending(c);
  const hint = itemHint("fit_which", cur(c)!.id);
  return { ...p, id: "fit_which", ask: (cc) => sayN(cc, "fit_which"),
    suggest: [{ lt: "Say whether it's too big or too small", hint }, ...p.suggest!.slice(1)], hints: [hint, ...p.hints!] };
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
    g.shoe = (g.shoe ?? 25) + (dir === "up" ? 1 : -1); g.half = false;
    c.say(dir === "up" ? "size_up_get" : "size_down_get");
    return true;
  }
  const i = SIZE_ORDER.indexOf(g.size ?? "mediana");
  let j = i + (dir === "up" ? 1 : -1);
  // the sold-out size is skipped
  if (SIZE_ORDER[j] === c.s.soldOutSize && g.id === c.s.soldOutItem) j += dir === "up" ? 1 : -1;
  if (j < 0 || j >= SIZE_ORDER.length) { c.say(dir === "up" ? "no_bigger" : "no_smaller"); return false; }
  g.size = SIZE_ORDER[j];
  c.say("size_change", { S: g.size });
  return true;
}

function startReturn(c: Ctx, g: Garment | null) {
  c.s.mode = "return";
  const mem = c.memory.lastBought as Garment | undefined;
  const base: Garment = mem ? { ...mem } : { id: "guayabera", color: "blanco", size: "mediana", paid: basePrice("guayabera") };
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
// Hint helpers: one expression in a singular and a plural variant (la blusa → "Me la llevo"; las sandalias → "Me
// las llevo"). `es` is written for the singular; the plural variant is given whole (verbs change too).

const MANY = (e: EntityDef) => !!e.attrs?.many;
function hp(id: string, es: string, gl: string, nat: string, esPl: string, glPl: string, natPl: string, extra: Partial<SentSrc> = {}, more: Partial<HintItem> = {}, f: (e: EntityDef) => boolean = () => true): HintItem[] {
  return [
    { id, s: t(es, gl, nat, extra), only: (e) => f(e) && !MANY(e), ...more },
    { id, s: t(esPl, glPl, natPl, extra), only: (e) => f(e) && MANY(e), ...more },
  ];
}

/** Hint group order for the guide, which shows the first items as model answers: variant i of every expression goes
 *  to block i (block 0 = singular, also plain items), so the first items are always different expressions. */
function ordered(...entries: (HintItem | HintItem[])[]): HintItem[] {
  const blocks: HintItem[][] = [];
  entries.forEach((e, k) => (Array.isArray(e) ? e : [e]).forEach((it, i) => { ENTRY.set(it, k); (blocks[i] ??= []).push(it); }));
  return blocks.flat();
}
/** The position of each item's expression in its group (per-garment copies list them in this order). */
const ENTRY = new WeakMap<HintItem, number>();

const FLAG_TICKET = "Mexican: el ticket = the receipt.";

// Automatic answers for the simulation when Valeria asks an optional question.
const AUTO: Record<string, string> = {
  return_q: "No, nada más estoy viendo, gracias.", item: "Busco una guayabera.", size: "Mediana, por favor.", shoe: "Del 25, por favor.",
  color: "En blanco, por favor.", tryon: "Sí, por favor.", fit: "Me queda muy bien.", fit_which: "Me queda muy bien.", decide: "Me lo llevo.",
  rewards: "No, no tengo.", rewards_join: "No, gracias.", pay: "Con tarjeta, por favor.", bag: "Sí, por favor.", receipt: "Impreso, por favor.",
  else_q: "No, gracias.", r_receipt: "Sí, aquí está el ticket.", r_reason: "Me queda chico.", r_choice: "Prefiero un cambio.", r_new: "La grande, por favor.",
  soldout: "Sí, por favor.",
};

// ---------------------------------------------------------------------------

export const clothes: SituationDef = {
  id: "s74-clothes",
  song: 74,
  songTitle: "Can I Try It On?",
  title: { en: "¿Me lo puedo probar?", lt: "Can I try it on?" },
  topic: { en: "En la tienda de ropa", lt: "Clothes shopping" },
  chapter: 3,
  order: 6,
  location: "threads",
  npc: "chloe",
  goal: "Pick something to wear, try it on and buy it (or exchange something you bought).",
  intro: "Boutique Hilos is a small clothes shop downtown. A white linen guayabera hangs on the mannequin by the door. Valeria, the sales assistant, is folding shirts. Prices are in pesos and already include tax.",
  entities: { clothing: CLOTHING, color: COLORS, size: SIZES },

  merges: {
    "en especial": { reason: "lexical_expression", split: "en → in + especial → special misreads the phrase: in particular.", minimal: "Two words." },
    "por cierto": { reason: "lexical_expression", split: "por → for + cierto → certain misreads the phrase: by the way.", minimal: "Two words." },
    "acaba de": { reason: "lexical_expression", split: "acaba → finishes + de → of misreads acabar de + infinitive: has just.", minimal: "Two words; the verb stays separate." },
    "por si": { reason: "lexical_expression", split: "por → for + si → if misreads the conjunction: in case.", minimal: "Two words." },
    "más o menos": { reason: "lexical_expression", split: "más → more + o → or + menos → less is a word-for-word reading of “about”.", minimal: "Three words." },
    "y medio": { reason: "lexical_expression", split: "y → and + medio → half: “and a half” after a number.", minimal: "Two words." },
    "de descuento": { reason: "lexical_expression", split: "de → of + descuento → discount: after a percentage, “off”.", minimal: "Two words." },
    "ya no hay": { reason: "lexical_expression", split: "ya → already + no → not + hay → there is misreads the phrase: there's none left.", minimal: "Three words." },
    "talla única": { reason: "lexical_expression", split: "talla → size + única → only misreads the term: one size (fits all).", minimal: "Two words." },
    "saldo a favor": { reason: "lexical_expression", split: "saldo → balance + a → to + favor → favor misreads the term: store credit.", minimal: "Three words." },
    "estado de cuenta": { reason: "lexical_expression", split: "estado → state + de → of + cuenta → account misreads the term: (bank) statement.", minimal: "Three words." },
    "un poco": { reason: "lexical_expression", split: "un → a + poco → little: the degree adverb = a little, a bit.", minimal: "Two words." },
    "por ahora": { reason: "lexical_expression", split: "por → for + ahora → now: = for now.", minimal: "Two words." },
    "una disculpa": { reason: "lexical_expression", split: "una → an + disculpa → apology: the Mexican set phrase for “I'm sorry”.", minimal: "Two words." },
    "al fondo": { reason: "lexical_expression", split: "al → to the + fondo → bottom misreads the phrase: at the back.", minimal: "Two words." },
    "por aquí": { reason: "lexical_expression", split: "por → by + aquí → here: leading a customer, = this way.", minimal: "Two words." },
    "o sea": { reason: "lexical_expression", split: "o → or + sea → be misreads the connector: that is, so.", minimal: "Two words." },
    "por qué": { reason: "lexical_expression", split: "por → for + qué → what: the question word = why.", minimal: "Two words." },
    "en su lugar": { reason: "lexical_expression", split: "en → in + su → its + lugar → place: = instead.", minimal: "Three words." },
  },

  grammar: {
    macros: {
      gdet: "(el | la | los | las | un | una | unos | unas | este | esta | estos | estas | ese | esa | esos | esas | aquel | aquella | mi | su | otro | otra | otros | otras | un par de #pair | el par de #pair | unos nuevos | una nueva)",
      color_post: "(en {color} | de color {color} | color {color} | en color {color} | en el color {color})",
      size_post: "((en | de) [la] [talla] {size} | talla {size} | (del | de el | numero | del numero | talla | en el | en) {shoe:number} [y medio #half])",
      it_ref: "(lo | la | los | las | este | esta | estos | estas | ese | esa | esos | esas | este modelo | ese modelo | el mismo | la misma | uno | una)",
      look_pre: [
        "busco #h:look_for", "estoy buscando #h:look_for", "ando buscando", "andaba buscando", "buscaba", "estaba buscando",
        "quiero", "quiero ver", "quisiera", "quisiera ver", "me gustaria [ver]", "necesito", "ocupo",
        "(me | nos) (ensena | muestra) #h:can_i_see", "(me puede | me podria) (ensenar | mostrar)", "(puedo | podria) ver", "me deja ver",
        "(tiene | tienen | venden | manejan | hay) #h:q_have_any", "(donde | en donde) (estan | esta | tiene | tienen | encuentro | puedo encontrar | hay) #h:q_where",
        "me (gusta | gustan | encanta | encantan) #h:i_like", "me (interesa | interesan)",
        "(tienes | me ensenas | me muestras) #tip:tu_staff", "(me pone | ponme)",
      ],
      adj: "(fresco | fresca | frescos | frescas | ligero | ligera | bonito | bonita | elegante | casual | comodo | comoda | de lino | de algodon | de manga larga | de manga corta | para la playa | de playa | para hombre | para mujer | para dama | para caballero | de hombre | de mujer | nuevo | nueva | barato | barata)",
      for_post: "para (el trabajo | una boda | una fiesta | la playa | el calor | regalo | mi (esposa | esposo | hijo | hija | mama | papa | novia | novio | amigo | amiga | hermano | hermana))",
      where_tail: "(del maniqui | del aparador | de la vitrina | de la entrada | de la mesa | de ahi | de alla | que esta en el (maniqui | aparador))",
      deg: "(un poco | un poquito | algo | muy | bastante | demasiado | super | medio | tantito | un tantito | como que)",
      too_adj: "((chico | chica | chicos | chicas | pequeno | pequena | pequenos | pequenas | chiquito | chiquita | corto | corta | cortos | cortas | apretado | apretada | apretados | apretadas | ajustado | ajustada) #up | (grande | grandes | flojo | floja | flojos | flojas | largo | larga | largos | largas | holgado | holgada | ancho | ancha | anchos | anchas | aguado | aguada) #down)",
      fit_subj: "(me queda | me quedan | le queda | esta | estan | me esta | me estan | lo siento | la siento | se siente | se ve | se ven | (el | la | los | las) {clothing} (me queda | me quedan | esta | estan) | la {size} (me queda | esta))",
      body: "(las mangas | el largo | la cintura | los hombros | el pecho | la cadera | las piernas | el cuello | la espalda)",
      exch_for: "(por (una | otra) talla [mas] (grande #up | chica #down | pequena #down | diferente) | por (la | una) [talla] {size} | por (otro | otra) (color | talla | numero) | por (el | la | uno | una) [de color] {color} | por (el | un) [numero] {shoe:number} [y medio #half] | por {item} | por un numero mas (grande #up | chico #down) | por uno mas (grande #up | chico #down) | por una mas (grande #up | chica #down))",
      take_pron: "(me lo | me la | me los | me las)",
    },
    slots: {
      item: { pattern: [
        "[@gdet] {clothing} [{color}] [@color_post] [@size_post]",
        "[@gdet] {clothing} [@size_post] [{color}] [@color_post]",
        "[@gdet] {clothing} [@adj] [{color}] [@adj] [@color_post] [@size_post] [@for_post]",
      ] },
    },
  },

  intents: {
    // --- browsing and naming an item -------------------------------------------------------
    just_looking: { patterns: [
      "[nada mas | solo | solamente | nomas] (estoy | ando) (viendo | mirando | echando un ojo | echando un vistazo) [nada mas] #h:browse_just", "(solo | nada mas) (miro | echo un vistazo)",
      "(nada mas | solo | solamente | nomas) (estoy | ando) (viendo | mirando) #h:browse_just",
      "(estoy | ando) (nada mas | solo | solamente | nomas) (viendo | mirando)",
      "[estoy] bien gracias (nada mas | solo | solamente | nomas) (estoy viendo | estoy mirando | ando viendo | veo | viendo) #h:browse_fine",
      "(nada mas | solo | solamente | nomas) (viendo | mirando | veo | quiero ver | queria ver | vengo a ver)",
      "(nada | no busco nada | no ando buscando nada) en (especial | particular) [nada mas | solo] [(estoy | ando) viendo]",
      "(solo | nada mas | nomas) (quiero | queria) (ver | echar un vistazo | echar un ojo)",
      "(puedo | podemos) (ver | mirar) [un poco]", "(voy a | quiero) ver [un poco] [primero]",
      // at "¿Viene a hacer un cambio?": "No, no vengo a devolver nada"
      "no (vengo a | quiero) (devolver | cambiar | regresar) nada", "no vengo a (hacer)? (un cambio | una devolucion | ningun cambio)",
    ] },
    // "No, estoy bien" / "Ahorita no" = a polite no to whatever Valeria just offered (help, trying on, a bag, a ticket…)
    im_fine_ctx: { patterns: [
      "[no] (estoy | ando) bien [gracias] [por ahora]", "[no] (ahorita | por ahora | por el momento | de momento) no [gracias] #h:browse_not_now",
      "[no] no (soy | estoy) (cliente frecuente | cliente | registrado | registrada | miembro | socio | socia) [todavia]", "[no] no tengo (tarjeta | cuenta) [de cliente | de cliente frecuente]",
      "[no] gracias estoy bien", "[no] [gracias] no me interesa [gracias] [por ahora]",
    ] },
    // "Busco algo fresco" / "un regalo": Valeria points out the new guayabera
    vague_item: { patterns: [
      "@look_pre algo [@adj] [@for_post]", "@look_pre algo (para el calor | para la playa | para una boda | para una fiesta)",
      "@look_pre (un regalo | algo para regalar) [@for_post]", "@look_pre ropa [@adj] [@for_post]", "@look_pre ropa (para el calor | para la playa | de playa | de verano)", "que me (recomienda | sugiere)", "que (tiene | tienen) de nuevo",
    ] },
    looking_for: { patterns: [
      "@look_pre {item} [@where_tail]", "@look_pre (otro | otra | un nuevo | una nueva) {item}",
      "@look_pre {item} para (el trabajo | la playa | una boda | una fiesta | mi (esposa | esposo | hijo | hija | mama | papa | novia | novio))",
    ] },
    item_short: { patterns: ["[solo | nada mas] {item}", "{item} @where_tail"] },
    looking_unknown: { patterns: ["(busco | estoy buscando | ando buscando | quisiera ver | necesito | venden) {w:any}"] },
    change_item: { patterns: [
      "mejor (quiero ver | me ensena | me muestra | quisiera ver) {item}", "mejor {item}", "(y | que tal | y que tal) {item}",
      "{item} en (vez | lugar) de (eso | esa | ese | esta | este)", "prefiero {item}", "(puedo | podria) ver {item} en (vez | lugar)",
    ] },

    // --- size ------------------------------------------------------------------------------
    size_ans: { patterns: [
      "{size} #bare #h:size_short", "(la | una) {size} #h:size_short", "(talla | la talla | de talla | en talla | en | de la) {size}",
      "(soy | soy talla | soy de talla) [la] {size} #h:size_im", "(uso | uso talla | creo que soy | creo que uso | soy como | creo que soy talla) [la | una] {size}",
      "(normalmente | generalmente | por lo general | casi siempre | siempre) (uso | soy | compro) [talla] [la] {size} #h:size_wear",
      "(deme | me da | me trae | traigame | me puede traer | quiero | quisiera | necesito | prefiero) [la | una] [talla] {size}",
      "{size} (esta bien | creo | creo yo | por favor | me queda bien | esta perfecta)", "(mejor | entonces) [la | una] [talla] {size}",
      "(dame | traeme) [la | una] [talla] {size} #tip:tu_staff", "no (soy | uso) [talla] [la] {wrong:size} [sino] [soy | uso] [talla] [la] {size}",
      "[la] {wrong:size} no [sino] [mejor] [la | una] {size}", "no [la] {wrong:size} [sino] [mejor] [la | una] {size}",
      "(en estados unidos | en mi pais | en canada | alla) (soy | uso) [talla] [la] {size}",
      "[la | una] {size} [y] [pero] en {color}", "(soy | uso) [talla] {size} y [la quiero | lo quiero] en {color}",
      // the size, then why: "Chica, no soy muy alta"
      "{size} (porque | ya que)? (soy | estoy) [muy | un poco | bastante] (alto | alta | bajo | baja | grande | delgado | delgada | flaco | flaca)",
    ] },
    ask_sizes: { patterns: [
      "que tallas (tiene | tienen | hay | maneja | manejan) #h:q_sizes", "(en | de) que tallas (viene | vienen | hay | lo tiene | la tiene | los tiene | las tiene)",
      "que talla es (esta | este | esto | esa | ese)", "es talla unica", "(tiene | hay | tienen) (otras | mas) tallas", "que tallas", "que (otras)? tallas (tiene | hay | tienen | maneja)", "(quiero | quisiera | prefiero | mejor) [en] otra talla", "(viene | vienen) en (otras | mas) tallas",
    ] },
    ask_have_size: { patterns: [
      "(lo | la | los | las) (tiene | tienen) (en | de) [talla] {size} #h:have_size", "hay (en | de) [talla] {size} #h:have_size",
      "(tiene | hay | tendra | tienen) (@it_ref) (en | de) [talla] {size}", "(tiene | hay | tienen) (una | la) {size}",
      "(me trae | me puede traer | me da | puedo probar | me puedo probar | puedo ver) (@it_ref) (en | de) [talla] {size}",
      "(me trae | me puede traer | puedo probar | puedo ver) (la | una) {size}", "(y | que tal | y que tal) (en | la) [talla] {size}",
      "(tiene | hay | tienen) (una)? talla mas (grande | amplia) #up #h:size_up", "(tiene | hay | tienen) (una)? talla mas (chica | pequena | chiquita) #down #h:size_down",
      "(una | la) talla mas (grande #up | amplia #up | chica #down | pequena #down)",
      "(me trae | me da | quiero | necesito | quisiera | puedo probar | me puede traer | creo que necesito) (una | la) talla mas (grande #up | chica #down | pequena #down)",
      "(una | otra) talla (mas)? (arriba #up | abajo #down)", "(tiene | hay) (uno | una | unos | unas) mas (grande #up | grandes #up | chico #down | chica #down | chicos #down | chicas #down)",
      "(uno | una) mas (grande #up | chico #down | chica #down)",
      "(un | otro) numero mas (grande #up | chico #down)", "(tiene | hay) (un | otro) numero mas (grande #up | chico #down)", "un numero (mas #up | menos #down)",
      "(tiene | hay) (@it_ref)? (en | del) [numero] {shoe:number} [y medio #half]", "(me trae | puedo probar | me puede traer) (el | del | un)? [numero] {shoe:number} [y medio #half]",
    ] },
    size_unknown: { patterns: [
      "no (se | conozco) (mi talla | que talla (soy | uso) | mi talla aqui | mi talla en mexico)", "no estoy (seguro | segura) de (mi talla | que talla (soy | uso)) #h:size_unsure",
      "que talla (me recomienda | cree que soy | cree que uso | necesito | soy | me queda)", "no se que numero (soy | calzo | uso) [aqui | en mexico]",
      "no se mi numero [aqui | en mexico]", "no (se | conozco) los numeros (de aqui | mexicanos | de mexico)",
    ] },
    shoe_size: { patterns: [
      "(calzo | uso | soy) [del | de | el | un | numero | talla] {shoe:number} [y medio #half] #h:ss_wear",
      "(del | numero | el numero | talla) {shoe:number} [y medio #half] #h:ss_size",
      "[calzo | uso | soy] [del | un | el] {shoe:number} [y medio #half] (europeo | europea | en europa | en talla europea | de europa | en numero europeo) #eu #h:ss_eu",
      "en europa (calzo | uso | soy) [del | un | el] {shoe:number} [y medio #half] #eu",
      "[calzo | uso | soy] [del | un | el] {shoe:number} [y medio #half] (en estados unidos | americano | de estados unidos | en canada | en talla americana | en numero americano) #us",
      "en (estados unidos | canada) (calzo | uso | soy) [del | un | el] {shoe:number} [y medio #half] #us #h:ss_us",
      "{shoe:number} y medio #half #h:ss_half",
    ] },
    shoe_size_ctx: { patterns: ["[el | un | del] {shoe:number} [y medio #half]", "{shoe:number} [y medio #half] creo", "creo que [del] {shoe:number} [y medio #half]"] },

    // --- color -----------------------------------------------------------------------------
    color_ans: { patterns: [
      "[en] {color} #h:color_short", "(el | la | los | las | uno | una | unos | unas) {color}", "(en | de) color {color}",
      "(lo | la | los | las) (quiero | prefiero | quisiera) en {color}",
      "(me gusta | me gusta mas | me gustan | prefiero | quiero | quisiera | deme | me da) (el | la | los | las | uno | una)? [en] {color}",
      "mejor (el | la | los | las | en)? {color}", "[quiero | quisiera | deme | me da] (la misma | el mismo | los mismos | las mismas | igual) [pero] en {color}", "{color} (esta bien | por favor | se ve bien | me gusta | creo)", "(el | la | los | las) {color} (esta | se ve | estan | se ven) (bonito | bonita | bonitos | bonitas | mejor | padre)",
    ] },
    ask_have_color: { patterns: [
      "(lo | la | los | las) (tiene | tienen | hay) en {color}", "(tiene | hay | tienen) (@it_ref) en {color}", "(viene | vienen) en {color}", "(hay | tienen) en {color} #h:have_color",
      "(hay | tiene) (uno | una | unos | unas) {color}", "(me trae | me puede traer | puedo ver | me ensena | me muestra) (@it_ref)? en {color}",
      "(y | que tal | y que tal) en {color}", "(y | que tal | y que tal) (el | la | los | las) {color}", "(tiene | hay) (el | la | los | las) {color}",
      "(lo | la) (tienes | hay) en {color} #tip:tu_staff",
    ] },
    ask_colors: { patterns: [
      "que colores (tiene | tienen | hay | maneja | manejan) #h:q_colors", "(en | de) que colores (viene | vienen | hay | lo tiene | la tiene | los tiene | las tiene)",
      "(hay | tiene | tienen | lo tiene | la tiene | viene | vienen) en (otros | mas) colores #h:q_other_colors", "(hay | tiene | tienen) otros colores",
      "(tiene | hay | tienen) (@it_ref)? en otro color", "(nada mas | solo) (hay | viene) en (este | ese) color", "que colores",
      "(quiero | quisiera | prefiero | mejor) [lo | la | los | las] [en] otro color", "(lo | la | los | las) (quiero | quisiera) en otro color",
    ] },
    dislike_color: { patterns: [
      "no me gusta (el | ese | este) color #h:not_color", "no me (gustó) (el | ese | este) color", "no me gusta [el | la | en] {color}", "(el | la | los | las) {color} no me (gusta | gustan | convence)",
      "{color} no", "no en {color}", "no me convence el color", "(ese | este) color no (me gusta | me queda | me convence)", "el color no (me gusta | me convence | es para mi)",
      "no me gusta como se ve el color", "(ese | este) color no", "no me (queda | va) [bien] (el | ese | este) color", "(el | ese | este) color no me (queda | va) [bien]",
    ] },

    // --- fitting room and fit --------------------------------------------------------------
    try_on: { patterns: [
      "@take_pron (puedo | podria) (probar | medir) #h:try_can", "(puedo | podria) (probarmelo | probarmela | probarmelos | probarmelas | medirmelo | medirmela) #h:try_can",
      "(puedo | podria) (probarme | medirme) (@it_ref | {item}) #h:try_the", "@take_pron (quiero | quisiera) probar",
      "(quiero | quisiera | me gustaria) (probarmelo | probarmela | probarmelos | probarmelas)", "(quiero | quisiera | me gustaria) probarme (@it_ref | {item})",
      "@take_pron (pruebo | mido)", "(voy a | dejeme) (probarmelo | probarmela | probarmelos | probarmelas)", "@take_pron voy a probar",
      "(se puede | puedo) probar", "@take_pron puedes probar #tip:tu_staff", "me puedo (probar | medir) (@it_ref | {item})", "(puedo | podria) probarme (@it_ref | {item})",
    ] },
    // "Sí, quiero" (to "¿Se lo quiere probar?")
    try_yes_ctx: { patterns: ["[si] (quiero | quisiera | me gustaria) [probarmelo | probarmela | probarmelos | probarmelas]", "[si] a ver", "[si] (como no | por que no)"] },
    // "Sí, ¿por qué no?" (to "¿Se lo lleva?", the sold-out size, the loyalty sign-up)
    why_not_ctx: { patterns: ["[si] (por que no | como no)"] },
    no_try: { patterns: [
      "[no] no (necesito | hace falta) (probarmelo | probarmela | probarmelos | probarmelas | probarlo | probarla | probarlos | probarlas)",
      "[no] no @take_pron (quiero | voy a) probar", "[no] no @take_pron pruebo", "[no] no quiero probarme (@it_ref | {item})",
      "[no] [no hace falta] [gracias] ya (se | conozco | me se) mi (talla | numero)", "no hace falta [gracias] (se | conozco | me se) mi (talla | numero)",
      "(conozco | me se) mi (talla | numero)", "prefiero no (probarmelo | probarmela | probarmelos | probarmelas)", "estoy (seguro | segura) (que | de que) me (queda | quedan)",
    ] },
    ask_fitting_room: { patterns: [
      "(donde | en donde) (esta | estan | queda | quedan) (el probador | los probadores | el vestidor | los vestidores) #h:q_fitting",
      "(hay | tiene | tienen) (probador | probadores | vestidor | vestidores)", "(donde | en donde) (@take_pron | lo | la | los | las) (puedo probar | pruebo)",
      "(donde | en donde) (me puedo | puedo) (probar | cambiar)", "(donde | en donde) me (cambio | pruebo)", "(el | los) (probador | probadores) (donde | por favor)",
    ] },
    fit_bad: { patterns: [
      "@fit_subj [@deg] @too_adj [para mi]", "@deg @too_adj [para mi]", "@fit_subj [@deg] @too_adj (de | en) @body",
      "@body (me queda | me quedan | esta | estan) [@deg] @too_adj", "no me (entra | entran | cierra | cierran | sube | suben | abrocha) #up",
      "(me aprieta | me aprietan | aprieta | aprietan) [mucho | un poco | un poquito] #up", "(me aprieta | me aprietan) [mucho | un poco | un poquito] (de | en) @body #up", "(me | le) sobra (tela | mucho) #down",
    ] },
    fit_unclear: { patterns: [
      "no me (queda | quedan) [bien | nada | muy bien | como esperaba]", "ya no me (queda | quedan)", "es la talla equivocada",
      "no me convence como me (queda | quedan)", "me (queda | quedan) (raro | rara | raros | raras | extrano | extrana)", "no se (como | si) me (queda | quedan)", "(la talla | el numero) no es (la correcta | el correcto)",
    ] },
    fit_good: { patterns: [
      "(me | le) (queda | quedan) [muy | super | bien] (bien #h:fit_perfect | perfecto | perfecta | perfectos | perfectas | justo | justa | a la medida | padre | increible | genial | bonito | bonita | precioso | preciosa)",
      "(esta | estan | quedo | quedaron) (perfecto | perfecta | perfectos | perfectas | justo | justa) [de talla]", "(me queda | me quedan | quedo | quedaron) (bien | muy bien)",
      "(esta | estan | se ve | se ven | me queda | me quedan) (chido | chida | chidos | chidas | padre | padrisimo | padrisima)", "me (queda | quedan) como (guante | anillo al dedo)",
      "(me | le) (queda | quedan) como anillo al dedo", "(se siente | se sienten | lo siento | la siento) (bien | muy bien | comodo | comoda | comodos | comodas)",
      "(es | esta | son | estan) [muy | super] (comodo | comoda | comodos | comodas)", "me (encanta | encantan | gusta | gustan) como me (queda | quedan)",
      "[esta | es] perfecto", "(perfecto | perfecta | perfectos | perfectas)", "(no esta | no estan) mal", "(se ve | se ven) (bien | muy bien | bonito | bonita | padre | genial)",
      "es (mi | la) talla [correcta]", "(la | el) {size} (me queda | esta) (bien | perfecta | mejor)", "no me queda ni (grande | chico | chica) ni (grande | chico | chica)",
    ] },
    // "Me encanta" (to "¿Cómo le quedó?"): it fits and the learner likes it
    fit_like_ctx: { patterns: ["me (encanta | encantan | gusta | gustan) [mucho | muchisimo]", "me (encanta | encantan | gusta | gustan) (este | esta | estos | estas)"] },
    // the beach is not a T-shirt ("playa" ≈ "playera" for the recognizer's slips)
    beach_unknown: { patterns: ["[me gusta | me encanta] [mucho] (la | a la | en la | de la) playa"] },
    sweet: { patterns: ["(usted es | es usted) [muy] (amable | linda | lindo)", "(que | muy) (amable | linda)", "(ay)? gracias que (linda | amable)"] },

    // --- price, sale, tax, decision --------------------------------------------------------
    ask_price: { patterns: [
      "cuanto (cuesta | cuestan | vale | valen | es | sale | salen) [@it_ref | {item}] #h:q_price", "(que | cual es el) precio (tiene | tienen | es) [@it_ref | {item}]",
      "en cuanto (esta | estan | lo deja | la deja | los deja | las deja)", "a como (esta | estan | lo da | la da)", "cuanto (es | sale | queda) con (el)? descuento",
      "cual es el precio [de {item} | de (este | esta | estos | estas)]", "cuanto",
      "cuanto (cuesta | cuestan | es | sale | salen) (la | el | una | un) [talla] {size}", "(la | el) {size} cuanto (cuesta | sale | es)",
    ] },
    ask_sale: { patterns: [
      "(esta | estan) (en oferta | en promocion | en rebaja | rebajado | rebajada | rebajados | rebajadas | con descuento) [@it_ref | {item}] #h:q_sale",
      "(tiene | tienen) (descuento | promocion | oferta) [@it_ref | {item}] #h:q_sale", "(hay | tienen) (descuentos | promociones | ofertas | rebajas)",
      "(me hace | me puede hacer | me da | hay) (un)? (descuento | descuentito)", "@take_pron deja (en {price} | mas barato | mas barata | mas baratos | mas baratas)",
      "(es | este es) el precio con descuento", "(entra | entran) en (la)? (promocion | oferta)", "(algun | hay algun) descuento",
    ] },
    ask_tax: { patterns: [
      "(ya)? (incluye | trae | tiene | lleva) [el] iva #h:q_tax", "(el precio | los precios) (ya)? (incluye | incluyen | trae | traen) [el] iva", "(es | son) (mas | sin) iva",
      "(con | sin) iva", "(hay que | tengo que) pagar (iva | impuestos)", "(ya)? (incluye | estan incluidos) [los] impuestos", "(el iva | los impuestos) (esta | estan) incluidos", "iva incluido",
    ] },
    ask_return_policy: { patterns: [
      "(puedo | se puede) (cambiar | cambiarlo | cambiarla | cambiarlos | cambiarlas | devolver | devolverlo | devolverla | devolverlos | devolverlas) [despues] si no me (queda | quedan | gusta | gustan) #h:q_return",
      "(tienen | hacen | aceptan) (cambios | devoluciones)", "(cual es | como es) (la | su) politica de (cambios | devoluciones)",
      "cuantos dias (tengo | hay) para (cambiar | cambiarlo | cambiarla | devolver | devolverlo | devolverla | hacer un cambio)",
      "(y si | que pasa si) no (me | le) (queda | quedan | gusta | gustan) [a mi (esposa | esposo | hijo | hija | mama | papa | novia | novio)]",
      "(y si | que pasa si) no le (queda | quedan | gusta | gustan) a mi (esposa | esposo | hijo | hija | mama | papa | novia | novio)",
      "se (puede | pueden) (cambiar | devolver) [despues]",
    ] },
    take_it: { patterns: [
      "@take_pron llevo #h:take_it", "(me | yo) llevo (@it_ref | {item})", "(me | yo) llevo (el | la | los | las) {color}",
      "(lo | la | los | las) (compro | llevo)", "@take_pron voy a llevar", "(voy a | quiero) (llevarmelo | llevarmela | llevarmelos | llevarmelas | comprarlo | comprarla | comprarlos | comprarlas)",
      "me quedo con (el | la | los | las | este | esta | ese | esa | estos | estas) [{color}]", "me quedo con {item}", "@take_pron quedo",
      "ya me decidi @take_pron llevo", "(lo | la | los | las) quiero", "@take_pron llevas #tip:tu_staff",
    ] },
    think_about_it: { patterns: [
      "(lo | la) (voy a | quiero) pensar #h:think", "(lo | la) pienso", "(dejeme | dejame) (pensarlo | pensarla | pensar)", "(voy a | quiero) pensarlo",
      "(regreso | vuelvo | paso) (mas tarde | luego | despues | manana | al rato | otro dia)", "(ahorita | ahora) (regreso | vuelvo | vengo)",
      "(voy a | quiero) (dar una vuelta | ver otras tiendas | seguir viendo)", "(tal vez | quizas | a lo mejor) (mas tarde | despues | otro dia)",
      "luego (vengo | regreso | paso)", "lo pienso y (regreso | vuelvo)", "(todavia | aun) no me decido", "no se si @take_pron (llevo | quiero)", "no se si (lo | la | los | las) (compro | quiero)",
      "(todavia | aun) no @take_pron llevo", "no @take_pron llevo (todavia | aun | por ahora | ahorita)",
    ] },
    not_take: { patterns: [
      "no @take_pron llevo", "(mejor)? no (lo | la | los | las) (quiero | compro | llevo)", "no es (mi estilo | para mi | lo que busco | lo que buscaba) #h:not_style",
      "no (me | me esta) (convence | convencen | encanta | encantan)", "no me (gusta | gustan) (como me (queda | quedan) | como se ve | como se ven | mucho)", "no me (gusta | gustan)",
      "no @take_pron voy a llevar", "[no gracias] (lo | la | los | las) dejo", "(ya)? no (lo | la | los | las) quiero", "no (es | son) para mi",
      "no (quiero | voy a) (comprarlo | comprarla | comprarlos | comprarlas | llevarlo | llevarla | llevarlos | llevarlas)",
    ] },
    too_expensive: { patterns: [
      "(esta | es | estan | son) [muy | un poco | algo | bastante | demasiado | un poquito] (caro | cara | caros | caras | carito | carita) [para mi] #h:too_expensive",
      "(es | esta) (mucho dinero | demasiado dinero) [para mi]", "(es | esta) (mucho | demasiado) para mi", "(tiene | hay) algo mas (barato | economico)",
      "(tiene | hay) (uno | una | unos | unas) mas (barato | barata | baratos | baratas | economico | economica)", "se me hace (caro | cara | caros | caras | mucho)",
      "no me alcanza", "es mas de lo que (queria | pensaba) gastar", "no (tiene | hay) (algo | uno | una | unos | unas) mas (barato | barata | baratos | baratas | economico | economica)",
    ] },

    // --- paying ------------------------------------------------------------------------------
    pay_card: { patterns: [
      "(con | en) tarjeta [de (credito | debito)] #h:pay_card_short", "(puedo | se puede) pagar con tarjeta [de (credito | debito)] #h:pay_card",
      "(se puede | puedo) con tarjeta [de (credito | debito)]", "(acepta | aceptan | toma | toman | reciben) (tarjeta | tarjetas | visa | mastercard | american express | tarjeta de credito | tarjeta de debito)",
      "(le | les) pago con tarjeta", "(voy a | quiero) pagar con tarjeta", "pago con tarjeta", "con (debito | credito)", "(tarjeta | tarjeta de credito | tarjeta de debito | debito | credito)",
      "aqui (esta | tiene) mi tarjeta", "con mi tarjeta", "no (en)? efectivo [sino] con tarjeta",
      "efectivo no [sino] [mejor] con tarjeta", "no (quiero | puedo) pagar (en | con) efectivo [sino] [mejor] con tarjeta", "con (visa | mastercard | american express | amex)",
    ] },
    // "No traigo efectivo": so it's the card (never read as cash)
    no_cash: { patterns: ["no (tengo | traigo | cargo) [suficiente | mucho] (efectivo | dinero en efectivo)", "no traigo (cash | feria)", "no (quiero | puedo) pagar (en | con) efectivo", "sin efectivo",
      "no (en | con) efectivo", "(en)? efectivo no"] },
    // "No quiero pagar con tarjeta": so it's cash, and nothing is paid until the money is handed over
    no_card: { patterns: ["no (quiero | puedo) pagar con tarjeta", "(con)? tarjeta no", "no con tarjeta", "sin tarjeta"] },
    pay_cash: { patterns: [
      "en efectivo #h:pay_cash", "(le | les) pago en efectivo #h:pay_cash", "(voy a | quiero) pagar en efectivo", "pago en efectivo", "efectivo",
      "(puedo | se puede) pagar en efectivo", "con (efectivo | billete)", "no con tarjeta [sino] en efectivo",
      "[le] pago con (un billete de)? {price}", "no (traigo | tengo) tarjeta [de credito | de debito]",
      "no (quiero | puedo) pagar con tarjeta [sino] [mejor] (en efectivo | efectivo | con efectivo)", "(con)? tarjeta no [sino] [mejor] (en efectivo | efectivo | con efectivo)",
    ] },
    pay_phone: { patterns: [
      "(puedo | se puede) pagar con (el celular | mi celular | el telefono | mi telefono | apple pay | google pay)", "(acepta | aceptan) (apple pay | google pay | pagos con el celular) #h:apple_pay",
      "(apple pay | google pay)", "con (el | mi) (celular | telefono)", "(le | les) pago con (el)? (celular | apple pay | google pay)",
    ] },
    // "¿Y si pago con tarjeta?": a question; nothing is paid
    pay_q: { patterns: ["(y si | que tal si | que pasa si) (pago | le pago) (con tarjeta #card | en efectivo #cash | con el celular #phone | con apple pay #phone)"] },
    // "¿Aceptan dólares?": a question about money, nothing is paid
    ask_dollars: { patterns: ["(aceptan | acepta | toman | reciben) (dolares | dolares americanos)", "(puedo | se puede) pagar (en | con) dolares", "(le | les) pago en dolares", "(y)? en dolares"] },
    // "¿Me lo puede apartar?": Valeria holds it until tomorrow (the learner hasn't bought it)
    hold_item: { patterns: ["@take_pron (puede | podria) apartar", "(me lo | me la | me los | me las | lo | la) (aparta | aparto)", "(puede | podria) apartarmelo", "(puede | podria) (apartarmela | apartarmelos | apartarmelas)"] },
    pay_transfer: { patterns: ["(puedo | le puedo | se puede) (hacer | pagar con | pagar por | mandar) (una)? transferencia", "(aceptan | acepta) transferencia", "por transferencia"] },
    here_you_go: { patterns: ["aqui (tiene | le doy) #h:here_you_go", "tenga", "tome", "ahi tiene", "aqui tiene {price}", "(le doy | tenga) {price}", "aqui (esta | tiene) (el dinero | mi tarjeta)", "aqui tienes #tip:tu_staff"] },
    // a bare "Aquí está" hands over the money or the ticket only where one is asked for
    here_ctx: { patterns: ["(aqui | ahi) esta", "(aqui | ahi) lo tiene"] },
    keep_change: { patterns: ["(quedese | guardese) (con)? el cambio", "el cambio es para usted"] },
    ask_where_pay: { patterns: ["(donde | en donde) (pago | se paga | le pago | esta la caja | queda la caja)", "(y)? la caja"] },

    // --- bag and ticket ----------------------------------------------------------------------
    wear_it: { patterns: [
      "(me | yo) (lo | la | los | las) llevo (puesto | puesta | puestos | puestas) #h:wear_it", "@take_pron (puedo llevar | dejo) (puesto | puesta | puestos | puestas)",
      "(puedo | quiero) (llevarmelo | llevarmela | llevarmelos | llevarmelas) (puesto | puesta | puestos | puestas)",
      "(me | le) (quita | puede quitar | corta | puede cortar) (la etiqueta | las etiquetas)", "(quiteme | cortele | quitele) (la etiqueta | las etiquetas)",
      "(voy a | quiero) salir con (el | ella | ellos | ellas) (puesto | puesta | puestos | puestas)", "@take_pron pongo (de una vez | ya | ahorita | aqui)",
    ] },
    no_bag: { patterns: [
      "no (necesito | quiero | ocupo) (bolsa | la bolsa | una bolsa | bolsita) #h:bag_no", "sin bolsa", "(traigo | tengo) mi (bolsa | mochila)",
      "(lo | la | los | las) (pongo | guardo | meto) en mi (bolsa | mochila)", "no hace falta (la | una) bolsa", "asi (me lo | me la | me los | me las | lo | la) llevo",
    ] },
    // "¿Cuánto cuesta la bolsa?": a question (the paper bag is free), never a bag taken
    bag_price: { patterns: ["cuanto (cuesta | cuestan | es | sale | cobran) (la | una | las) (bolsa | bolsita | bolsas)", "(la bolsa | la bolsita) (cuesta | tiene costo | se cobra | es gratis | cuesta extra)",
      "(cobran | se cobra | se paga) (la)? (bolsa | bolsita)", "hay que pagar (la)? (bolsa | bolsita)", "(tiene | tienen) costo (la)? (bolsa | bolsita)"] },
    want_bag: { patterns: ["[si] (una | la) (bolsa | bolsita) [de papel]", "(me da | me puede dar | me regala) (una | la) (bolsa | bolsita) [de papel]", "con bolsa"] },
    gift_receipt: { patterns: [
      "(me da | me puede dar | me regala) (un)? (ticket | recibo) de regalo #h:gift_receipt", "(un)? (ticket | recibo) de regalo",
      "es (para)? (un)? regalo", "es para regalo", "@take_pron (envuelve | puede envolver) [para regalo]", "(lo | la | los | las) puede envolver [para regalo]",
    ] },
    receipt_bag: { patterns: ["(impreso | impresa) #h:rc_print", "[si] (quiero | deme | me da) (el | mi) (ticket | recibo) [impreso]", "en papel", "(deme | me da) el (ticket | recibo) [impreso]", "[si] el (ticket | recibo) impreso"] },
    receipt_email: { patterns: [
      "por (correo | email | mail | correo electronico) #h:rc_email", "(mandemelo | mandemela | envielo | enviemelo | mandelo) (por | a mi | al) (correo | email)",
      "(a mi | al) correo", "(mejor | prefiero) por (correo | email | mail)", "(me lo | lo) (manda | puede mandar | envia | puede enviar) (por | al) correo", "en (mi)? (correo | email)",
    ] },
    no_receipt: { patterns: [
      "no (necesito | quiero | ocupo) (el | un)? (ticket | recibo) #h:rc_none", "sin (ticket | recibo)", "no hace falta el (ticket | recibo)",
      "no (necesito | quiero | ocupo) (el | un)? (ticket | recibo) de regalo",
    ] },
    // "No, no lo necesito" (to "¿Quiere su ticket?")
    receipt_no_ctx: { patterns: ["[no] no (lo | la) (necesito | ocupo | quiero)", "[no] no hace falta", "[no] no es necesario"] },
    rewards_member: { patterns: [
      "(ya)? (soy | estoy) (registrado | registrada | cliente frecuente | socio | socia | miembro) #h:rw_member", "(ya)? tengo (la | mi | una)? tarjeta [de cliente | de cliente frecuente]", "soy cliente",
    ] },

    // --- returns and exchanges --------------------------------------------------------------
    return_item: { patterns: [
      "(quisiera | quiero | me gustaria | vengo a | necesito) (devolver | regresar) (@it_ref | {item}) #h:ret_return", "(quisiera | quiero | vengo a | necesito) hacer una devolucion",
      "(puedo | se puede) (devolver | regresar) (@it_ref | {item}) #canret", "(puedo | se puede) (devolverlo | devolverla | devolverlos | devolverlas | regresarlo | regresarla) #canret",
      "(vengo a | quiero | quisiera) devolver (algo | esto | una cosa)",
      "(quisiera | quiero | vengo a | necesito) (devolver | regresar) (@it_ref | {item}) que (compré | me llevé) [aqui] [ayer | la semana pasada | el sabado | hace unos dias]",
      "(compré | me llevé) (@it_ref | {item}) aqui [ayer | la semana pasada | el sabado | hace unos dias] y (quiero | quisiera) (devolverlo | devolverla | devolverlos | devolverlas | regresarlo | regresarla)",
      "[si] (compré | me llevé) (@it_ref | {item}) aqui [ayer | la semana pasada | el sabado | hace unos dias]",
      "[si] (compré | me llevé) {item} [aqui] (ayer | la semana pasada | el sabado | hace unos dias)", "(es | vengo a hacer) una devolucion", "una devolucion",
    ] },
    exchange: { patterns: [
      "(quisiera | quiero | me gustaria | vengo a | necesito) (cambiar | hacer un cambio de) (@it_ref | {item}) [@exch_for] #h:ret_exchange",
      "@take_pron (puede | podria) cambiar [@exch_for] #h:ret_exchange", "(puedo | se puede) (cambiar | cambiarlo | cambiarla | cambiarlos | cambiarlas) [@it_ref | {item}] @exch_for",
      "(quisiera | quiero | vengo a | necesito) hacer un cambio #h:ret_exchange_short", "(un | es un) cambio", "(prefiero | mejor | quisiera) (un)? cambio #h:ret_exchange_an",
      "(prefiero | quiero | quisiera) (cambiarlo | cambiarla | cambiarlos | cambiarlas) [@exch_for]", "[un cambio] @exch_for",

      "(quisiera | quiero | vengo a | necesito) cambiar (@it_ref | {item}) que (compré | me llevé) [aqui] [ayer | la semana pasada | el sabado | hace unos dias] [@exch_for]", "(quisiera | quiero | me da | me puede dar) (una | la) talla mas (grande #up | chica #down) en su lugar",
      "[el] (dinero | reembolso) no [sino] [mejor] [prefiero | quiero] (un | el)? cambio", "no (quiero)? (el | mi | un)? (dinero | reembolso) [sino] [mejor] [prefiero | quiero] (un | el)? cambio",
    ] },
    receipt_yes: { patterns: [
      "[si] aqui (esta | tiene) (el | mi) (ticket | recibo) #h:ret_receipt_here", "[si] (tengo | traigo) (el | mi) (ticket | recibo) [aqui | conmigo]",
      "[si] (lo | la) (tengo | traigo) [aqui | conmigo]", "[si] (lo | la) tengo en (el | mi) (celular | correo | bolsa | cartera)", "(esta | lo tengo) en (mi | el) (celular | correo | bolsa | cartera)",
      "[si] aqui (lo | la) tengo",
    ] },
    receipt_none: { patterns: [
      "no (traigo | tengo | encuentro) (el | mi) (ticket | recibo) [conmigo | aqui] #h:ret_no_receipt", "perdi (el | mi) (ticket | recibo)", "(lo | la) perdi #h:ret_lost",
      "se me (perdió | olvidó) [el ticket | el recibo]", "no (lo | la) (traigo | tengo | encuentro) [conmigo | aqui]", "(lo | la) tire", "tire el (ticket | recibo)",
      "(lo | la) (dejé | olvidé) en (el hotel | la casa | casa | mi casa)", "sin (ticket | recibo)", "ya no (lo | la) tengo", "no tengo (ticket | recibo)",
    ] },
    problem: { patterns: [
      "se (destino | despintó | deslavó | decoloró) [en la (lavadora | lavada) | al lavarlo | al lavarla] #ran #h:ret_ran", "(perdió | se le fue) el color #ran", "se (destineron | despintaron) #ran",
      "se (encogió | encogio) [en la (lavadora | secadora | lavada)] #shrank", "(quedó | se hizo) mas (chico | chica) [despues de lavarlo | despues de lavarla] #shrank",
      "tiene un (hoyo | agujero | hoyito) #hole", "(salió | venia) con un (hoyo | agujero) #hole",
      "el (cierre | zipper) (no sirve | esta roto | se rompió | se atora | no cierra) #zipper", "se (rompió | descompuso) el (cierre | zipper) #zipper", "la cremallera (no funciona | esta rota | se rompió) #zipper",
      "se (le)? (cayó | cayo) un boton #button", "le falta un boton #button",
      "(esta | viene | venia) (roto | rota | danado | danada | descosido | descosida | manchado | manchada) #damaged", "se (rompió | descosió | rompio | descosio) #damaged",
      "la (tela | calidad) (es mala | no es buena) #damaged",
      "(cambié | cambie) de (opinion | idea) #mind #h:ret_mind", "me arrepenti #mind", "ya no me (gusta | gustan | convence) #dislike",
      "(compré | me llevé) la talla (equivocada | incorrecta) #nofit", "me (equivoqué) de (talla | numero) #nofit",
      "(fue | era) (un)? regalo #gift", "me (lo | la) regalaron #gift",
      "a mi (esposa | esposo | hija | hijo | mama | papa | novia | novio | amiga | amigo) no le (gustó | gusta) #dislike",
      "[a] mi (esposa | esposo | hija | hijo | mama | papa | novia | novio | amiga | amigo) [dice que] no le (queda | quedó | quedan | quedaron) #nofit",
      "(nada | no tiene nada) (solo | nada mas | simplemente) (cambié | cambie) de opinion #mind",
    ] },
    // "No, nada" (to "¿Tuvo algún problema?"): nothing wrong, a change of mind
    nothing_ctx: { patterns: ["[no] nada", "[no] no tiene nada", "[no] (ningun | ninguno) [problema]", "no (tuve | tiene) ningun problema", "[no] nada (malo | en especial)"] },
    want_refund: { patterns: [
      "(me | nos) (puede | podria) (devolver | regresar) (el | mi) dinero #h:ret_refund", "(quisiera | quiero | prefiero) (que me devuelvan | que me regresen | que me devuelva | que me regrese) (el | mi) dinero",
      "(quisiera | quiero | prefiero) (un)? reembolso", "(quisiera | quiero) mi dinero (de vuelta | de regreso)", "(la)? devolucion (del | de mi) dinero",
      "(prefiero | quisiera | quiero) (el | mi) dinero", "(me | nos) (devuelve | regresa | puede regresar) (el | mi) dinero", "(devuelvame | regreseme) (el | mi) dinero #blunt", "(un)? reembolso", "(el)? dinero (de vuelta | a mi tarjeta)",
      "no (quiero | necesito) (un | el)? cambio [sino] [mejor] [quiero | prefiero] ((el | mi) dinero | un reembolso | el reembolso | que me (devuelva | regrese) (el | mi) dinero)",
      "[el] cambio no [sino] [mejor] ((el | mi) dinero | un reembolso | el reembolso)",
    ] },
    no_refund: { patterns: ["no (quiero | necesito) (el | un | mi)? (reembolso | dinero)", "no quiero que me (devuelvan | regresen) el dinero", "sin reembolso"] },
    no_credit: { patterns: ["no (quiero | necesito) (saldo a favor | una nota de credito | nota de credito | una tarjeta de regalo | tarjeta de regalo | un vale)", "sin saldo a favor"] },
    want_credit: { patterns: [
      "(saldo a favor | una nota de credito | nota de credito | una tarjeta de regalo | tarjeta de regalo | un vale) (esta bien | me sirve) #h:ret_credit",
      "(prefiero | quisiera | quiero | deme) (el | un)? (saldo a favor | una nota de credito | nota de credito | una tarjeta de regalo | un vale)", "(saldo a favor | nota de credito)",
      "mejor (el)? (saldo a favor | una tarjeta de regalo | un vale) [no (el)? (dinero | reembolso)]", "[el] (dinero | reembolso) no [sino] [mejor] (el)? (saldo a favor | una tarjeta de regalo | un vale)",
    ] },
  },

  lines: {
    // --- greetings -------------------------------------------------------------------------
    greet: [
      t("¡{m:Bienvenido|f:Bienvenida} | a | Hilos!", "Welcome | to | Hilos!", "Welcome to Hilos!"),
      t("¡Hola, | buen | día!", "Hello, | good | day!", "Hi, good morning!"),
      t("¡Hola! | ¡Pásele!", "Hello! | Come in!", "Hi! Come on in!", { flags: { 1: "Mexican: pásele = come in, have a look." },
        neutral: t("¡Hola! | ¡Adelante!", "Hello! | Come in!", "Hi! Come on in!") }),
    ],
    greet_back: [
      t("¡Ah, | qué | gusto | {m:verlo|f:verla} | otra vez!", "Oh, | what a | pleasure | to see you | again!", "Oh, nice to see you again!"),
      t("¡Hola | otra vez!", "Hello | again!", "Oh, hi again!"),
    ],
    greet_howareyou: [
      t("¡Hola, | buen | día! | ¿Cómo | está?", "Hello, | good | day! | How | are you?", "Hi, good morning! How are you?"),
    ],
    ask_item: [
      t("¿Le | puedo | ayudar | en | algo?", "(To) you | can I | help | in | something?", "Can I help you with anything?"),
      t("¿Busca | algo | en especial?", "Are you looking for | something | in particular?", "Are you looking for anything in particular?"),
      t("¿Qué | anda | buscando?", "What | are you going around | looking for?", "What are you looking for today?",
        { flags: { 1: "andar + -ando: “to be (doing)”, casual and friendly." } }),
    ],
    ask_item_else: [
      t("¿Qué | más | le | puedo | enseñar?", "What | else | (to) you | can I | show?", "What else can I show you?"),
    ],
    browse_ok: [
      t("¡Claro! | Si | necesita | algo, | me | avisa.", "Sure! | If | you-need | something, | me | you-let-know.", "Sure! If you need anything, just let me know."),
      t("Con | confianza, | está | en | su | casa.", "With | confidence, | you-are | in | your | house.", "Feel free, make yourself at home.",
        { flags: { 0: "con confianza: “feel free”, a warm Mexican welcome." } }),
      t("Muy | bien. | Aquí | estoy | por si | necesita | algo.", "Very | good. | Here | I-am | in case | you-need | something.", "Okay. I'm right here if you need anything."),
    ],
    browse_nudge: [
      t("Por cierto, | la | guayabera | blanca | del | maniquí | acaba de | llegar.", "By the way, | the | guayabera | white | of the | mannequin | just | arrived.",
        "By the way, that white guayabera on the mannequin just came in."),
    ],
    sale_table: [
      t("Y | todo | lo | de | esa | mesa | tiene | {$pct}% | de descuento.", "And | all | (that) | on | that | table | has | {$pct}% | off.", "And everything on that table is {$pct}% off.",
        { say: "Y todo lo de esa mesa tiene {$pct} por ciento de descuento." }),
    ],
    ack_item: [
      t("¡Claro!", "Sure!", "Sure!"),
      t("¡Buena | elección!", "Good | choice!", "Great choice!"),
      t("Claro, | por aquí.", "Sure, | this way.", "Sure, right this way."),
    ],
    confirm_featured: [
      t("Ah, | la | guayabera | del | maniquí.", "Ah, | the | guayabera | of the | mannequin.", "Oh, the guayabera on the mannequin."),
    ],
    beach: [t("¡A | mí | también! | Y | aquí | hay | mucha | ropa | para | la | playa.", "To | me | too! | And | here | there-is | lots of | clothing | for | the | beach.", "Me too! And we have lots of beachwear here.")],
    beach_q: [t("Ah, | ¿para | la | playa? | Tenemos | trajes | de | baño, | sombreros | y | sandalias.", "Ah, | for | the | beach? | We-have | suits | for | bathing, | hats | and | sandals.",
      "Oh, for the beach? We have swimsuits, hats and sandals.")],
    unknown_item: [
      t("Perdón, | eso | no lo tenemos. | Aquí | hay | ropa, | sandalias | y | tenis.", "Sorry, | that | we don't have it. | Here | there-is | clothing, | sandals | and | sneakers.",
        "Sorry, we don't carry that. We have clothes, sandals and sneakers."),
    ],

    // --- size --------------------------------------------------------------------------------
    ask_size: [
      t("¿Qué | talla | es?", "What | size | are you?", "What size are you?"),
      t("¿Qué | talla | usa?", "What | size | do you wear?", "What size do you wear?"),
      t("¿Y | qué | talla | necesita?", "And | what | size | do you need?", "And what size do you need?"),
    ],
    ask_shoe: [
      t("¿Qué | número | calza?", "What | number | do you wear (in shoes)?", "What size do you wear?",
        { flags: { 2: "calzar: to wear a shoe size. Shoe sizes are “números”." } }),
      t("¿De | qué | número?", "Of | what | number?", "What size?"),
    ],
    size_here: [
      t("Aquí | tiene | {S.the}.", "Here | you-have | {S.the}.", "Here's {S.the}."),
      t("Le | traigo | {S.the}.", "(For) you | I-bring | {S.the}.", "Let me get you {S.the}."),
    ],
    size_check: [
      t("Déjeme | ver... | Sí, | aquí | está | {S.the}.", "Let me | see... | Yes, | here | is | {S.the}.", "Let me check… Yes, here's {S.the}."),
      t("Sí, | sí | hay | en | {S}.", "Yes, | (yes) | there-is | in | {S}.", "Yes, we have it in {S}."),
    ],
    size_change: [
      t("Sin | problema. | Le | traigo | {S.the}.", "Without | problem. | (For) you | I-bring | {S.the}.", "No problem. Let me get you {S.the}."),
      t("Entonces | probemos | {S.the}.", "Then | let's try | {S.the}.", "Let's try {S.the}, then."),
    ],
    size_up_get: [
      t("Sin | problema. | Le | traigo | un | número | más.", "Without | problem. | (For) you | I-bring | a | number | more.", "No problem. Let me get you a size up."),
    ],
    size_down_get: [
      t("Sin | problema. | Le | traigo | un | número | menos.", "Without | problem. | (For) you | I-bring | a | number | less.", "No problem. Let me get you a size down."),
    ],
    no_bigger: [t("Perdón, | es | la | talla | más | grande | que | tenemos.", "Sorry, | it's | the | size | most | big | that | we-have.", "Sorry, that's our biggest size.")],
    no_smaller: [t("Perdón, | es | la | talla | más | chica | que | tenemos.", "Sorry, | it's | the | size | most | small | that | we-have.", "Sorry, that's our smallest size.")],
    size_list: [
      t("Hay | chica, | mediana, | grande | y | extra | grande.", "There-is | small, | medium, | large | and | extra | large.", "We have small, medium, large and extra-large."),
    ],
    one_size: [
      t("Es | talla única.", "It's | one size.", "It's one size fits all."),
      t("Nada más | hay | una | talla.", "Only | there-is | one | size.", "It only comes in one size."),
    ],
    shoe_sizes_numbers: [
      t("Las | sandalias | y | los | tenis | van | por | número. | ¿Qué | número | calza?", "The | sandals | and | the | sneakers | go | by | number. | What | number | do you wear?",
        "Sandals and sneakers come in numbered sizes. What size do you wear?"),
    ],
    which_size_letters: [t("Mmm, | ¿chica, | mediana | o | grande?", "Hmm, | small, | medium | or | large?", "Hmm, small, medium or large?")],
    eu_size: [
      t("¿Es | número | europeo? | Aquí | sería | más o menos | un | {$num}.", "Is it | number | European? | Here | it would be | about | a | {$num}.",
        "Is that a European size? Here that's about a {$num}."),
    ],
    eu_size_half: [
      t("¿Es | número | europeo? | Aquí | sería | más o menos | un | {$num} | y medio.", "Is it | number | European? | Here | it would be | about | a | {$num} | and a half.",
        "Is that a European size? Here that's about a {$num} and a half."),
    ],
    eu_size_known: [
      t("Muy | bien, | entonces | aquí | es | más o menos | un | {$num}.", "Very | good, | then | here | it's | about | a | {$num}.", "Okay, so here that's about a {$num}."),
    ],
    eu_size_known_half: [
      t("Muy | bien, | entonces | aquí | es | más o menos | un | {$num} | y medio.", "Very | good, | then | here | it's | about | a | {$num} | and a half.", "Okay, so here that's about a {$num} and a half."),
    ],
    us_size: [
      t("Aquí | los | números | son | otros: | sería | más o menos | un | {$num}.", "Here | the | numbers | are | different: | it would be | about | a | {$num}.",
        "Sizes are different here: that's about a {$num}."),
    ],
    us_size_half: [
      t("Aquí | los | números | son | otros: | sería | más o menos | un | {$num} | y medio.", "Here | the | numbers | are | different: | it would be | about | a | {$num} | and a half.",
        "Sizes are different here: that's about a {$num} and a half."),
    ],
    shoe_size_again: [t("Perdón, | ¿qué | número | dijo?", "Sorry, | what | number | did you say?", "Sorry, what size was that?")],
    shoes_here: [
      t("Aquí | tiene, | del | {$num}.", "Here | you-have, | of the | {$num}.", "Here you go, a size {$num}.", { flags: { 2: "del 25 = (the one) of size 25." } }),
    ],
    shoes_here_half: [
      t("Aquí | tiene, | del | {$num} | y medio.", "Here | you-have, | of the | {$num} | and a half.", "Here you go, a size {$num} and a half.", { flags: { 2: "del 25 = (the one) of size 25." } }),
    ],
    last_one: [t("¡Qué | suerte! | Es | la | última | pieza | en | esa | talla.", "What | luck! | It's | the | last | piece | in | that | size.", "You're lucky: that's the last one in that size!")],
    size_ok: [t("Muy | bien.", "Very | good.", "Great."), t("Perfecto.", "Perfect.", "Perfect."), t("Listo.", "Ready.", "Got it.")],
    size_guess: [t("No se preocupe. | Probemos | una | mediana | y | vemos.", "Don't worry. | Let's try | a | medium | and | we-see.", "Don't worry. Let's try a medium and see.")],
    shoe_guess: [t("No se preocupe. | ¿Qué | número | usa | en | su | país?", "Don't worry. | What | number | do you wear | in | your | country?", "No problem. What size do you wear back home?")],
    // the twist: the size is sold out
    sold_out: [
      t("¡Ay, | perdón! | En | {S} | ya no hay.", "Oh, | sorry! | In | {S} | there's none left.", "Oh, I'm sorry! We're out of {S}."),
      t("Uy, | la | {S} | se | acabó | ayer.", "Oops, | the | {S} | (itself) | ran out | yesterday.", "Oh no, the {S} sold out yesterday.", { flags: { 3: "se acabó: “ran out”; the se has no English word." } }),
    ],
    sold_out_offer: [
      t("¿Le | traigo | {T.the}?", "(For) you | I-bring | {T.the}?", "Shall I get you {T.the}?"),
    ],
    sold_out_offer_try: [
      t("¿Quiere | probarse | {T.the}?", "Do you want | to try on | {T.the}?", "Would you like to try {T.the} instead?"),
    ],
    sold_out_take: [t("Claro, | aquí | {lo@X} | tiene.", "Sure, | here | it | you-have.", "Sure, here you go.")],
    sold_out_take_pl: [t("Claro, | aquí | {lo@X} | tiene.", "Sure, | here | them | you-have.", "Sure, here you go.")],
    sold_out_again: [t("Perdón, | en | {S} | ya no hay.", "Sorry, | in | {S} | there's none left.", "Sorry, we're out of {S}.")],

    // --- color -------------------------------------------------------------------------------
    ask_color: [
      t("¿Qué | color | prefiere?", "What | color | do you prefer?", "What color would you like?"),
      t("¿Y | de | qué | color?", "And | of | what | color?", "And in what color?"),
    ],
    color_list: [
      t("{lo@X} | tenemos | en | {A}, | {B} | y | {C}.", "It | we-have | in | {A}, | {B} | and | {C}.", "We have it in {A}, {B} and {C}."),
    ],
    color_list_pl: [
      t("{lo@X} | tenemos | en | {A}, | {B} | y | {C}.", "Them | we-have | in | {A}, | {B} | and | {C}.", "We have them in {A}, {B} and {C}."),
    ],
    color_yes: [
      t("¡Sí, | claro! | Aquí | {lo@X} | tiene | en | {C}.", "Yes, | sure! | Here | it | you-have | in | {C}.", "Yes, of course! Here it is in {C}."),
      t("Sí | hay | en | {C}. | Se | {lo@X} | traigo.", "Yes | there-is | in | {C}. | (For) you | it | I-bring.", "Yes, we have it in {C}. I'll get it for you."),
    ],
    color_yes_pl: [
      t("¡Sí, | claro! | Aquí | {lo@X} | tiene | en | {C}.", "Yes, | sure! | Here | them | you-have | in | {C}.", "Yes, of course! Here they are in {C}."),
      t("Sí | hay | en | {C}. | Se | {lo@X} | traigo.", "Yes | there-is | in | {C}. | (For) you | them | I-bring.", "Yes, we have them in {C}. I'll get them for you."),
    ],
    color_no: [
      t("Perdón, | en | {C} | no hay.", "Sorry, | in | {C} | there isn't.", "Sorry, we don't have it in {C}."),
    ],

    // --- trying on -------------------------------------------------------------------------
    offer_try: [
      t("¿Se | {lo@X} | quiere | probar?", "(Yourself) | it | do you want | to try on?", "Would you like to try it on?",
        { flags: { 0: "probarse: to try on (on yourself); se lo quiere probar = would you like to try it on." } }),
      t("¿Gusta | probárse{lo@X}?", "Would you like | to try it on?", "Would you like to try it on?",
        { flags: { 0: "Mexican: ¿gusta…? = would you like…? (very polite)." }, neutral: t("¿Quiere | probárse{lo@X}?", "Do you want | to try it on?", "Would you like to try it on?") }),
    ],
    offer_try_pl: [
      t("¿Se | {lo@X} | quiere | probar?", "(Yourself) | them | do you want | to try on?", "Would you like to try them on?",
        { flags: { 0: "probarse: to try on (on yourself); se los quiere probar = would you like to try them on." } }),
      t("¿Gusta | probárse{lo@X}?", "Would you like | to try them on?", "Would you like to try them on?",
        { flags: { 0: "Mexican: ¿gusta…? = would you like…? (very polite)." }, neutral: t("¿Quiere | probárse{lo@X}?", "Do you want | to try them on?", "Would you like to try them on?") }),
    ],
    fitting_rooms: [
      t("Los | probadores | están | al fondo.", "The | fitting rooms | are | at the back.", "The fitting rooms are at the back."),
      t("El | probador | está | ahí, | a | la | derecha.", "The | fitting room | is | there, | to | the | right.", "The fitting room is over there, on the right."),
    ],
    try_this: [t("Aquí | tiene. | Pruébese | {este@X}.", "Here | you-have. | Try on | this one.", "Here you go. Try this one on.")],
    try_this_pl: [t("Aquí | tiene. | Pruébese | {este@X}.", "Here | you-have. | Try on | these.", "Here you go. Try these on.")],
    try_seat: [t("Siéntese | aquí, | por favor.", "Sit down | here, | please.", "Have a seat right here.")],
    let_me_know: [t("¡Me | avisa | cómo | le | queda!", "Me | you-tell | how | (on) you | it-fits!", "Let me know how it fits!")],
    let_me_know_pl: [t("¡Me | avisa | cómo | le | quedan!", "Me | you-tell | how | (on) you | they-fit!", "Let me know how they fit!")],
    ask_fit: [
      t("¿Qué tal | le | quedó?", "How | (on) you | did it fit?", "So, how does it fit?"),
      t("¿Cómo | le | queda?", "How | (on) you | does it fit?", "How does it fit?"),
    ],
    ask_fit_pl: [
      t("¿Qué tal | le | quedaron?", "How | (on) you | did they fit?", "So, how do they fit?"),
      t("¿Cómo | le | quedan?", "How | (on) you | do they fit?", "How do they fit?"),
    ],
    fit_which: [
      t("¡Ay, | no! | ¿Le | queda | grande | o | {chico@X}?", "Oh, | no! | (On) you | it-fits | big | or | small?", "Oh no! Is it too big or too small?"),
    ],
    fit_which_pl: [
      t("¡Ay, | no! | ¿Le | quedan | grandes | o | {chico@X}?", "Oh, | no! | (On) you | they-fit | big | or | small?", "Oh no! Are they too big or too small?"),
    ],
    compliment: [
      t("¡Le | queda | muy | bien!", "(On) you | it-suits | very | well!", "It looks great on you!"),
      t("¡Ese | color | le | queda | precioso!", "That | color | (on) you | it-suits | lovely!", "That color looks lovely on you!"),
      t("¡Se | le | ve | muy | bien!", "(Itself) | (on) you | it-looks | very | good!", "You look great in it!"),
    ],
    compliment_pl: [
      t("¡Le | quedan | muy | bien!", "(On) you | they-suit | very | well!", "They look great on you!"),
      t("¡Ese | color | le | queda | precioso!", "That | color | (on) you | it-suits | lovely!", "That color looks lovely on you!"),
      t("¡Se | le | ven | muy | bien!", "(Themselves) | (on) you | they-look | very | good!", "You look great in them!"),
    ],
    fit_ok: [t("¡Qué | bueno!", "How | good!", "Oh, good!"), t("¡Perfecto!", "Perfect!", "Great!")],
    sweet_back: [t("¡Ay, | gracias!", "Oh, | thanks!", "Aw, thank you!"), t("¡Para | servirle!", "To | serve you!", "My pleasure!")],

    // --- price, sale, tax ----------------------------------------------------------------------
    price_is: [t("Cuesta | {$price}.", "It-costs | {$price}.", "It's {$price}."), t("Está | en | {$price}.", "It's | at | {$price}.", "It's {$price}.")],
    price_is_pl: [t("Cuestan | {$price}.", "They-cost | {$price}.", "They're {$price}."), t("Están | en | {$price}.", "They're | at | {$price}.", "They're {$price}.")],
    price_sale: [
      t("Cuesta | {$price}, | pero | hoy | tiene | {$pct}% | de descuento: | o sea, | {$amount}.", "It-costs | {$price}, | but | today | it-has | {$pct}% | off: | that is, | {$amount}.",
        "It's {$price}, but it's {$pct}% off today, so {$amount}.", { say: "Cuesta {$price}, pero hoy tiene {$pct} por ciento de descuento: o sea, {$amount}." }),
    ],
    price_sale_pl: [
      t("Cuestan | {$price}, | pero | hoy | tienen | {$pct}% | de descuento: | o sea, | {$amount}.", "They-cost | {$price}, | but | today | they-have | {$pct}% | off: | that is, | {$amount}.",
        "They're {$price}, but they're {$pct}% off today, so {$amount}.", { say: "Cuestan {$price}, pero hoy tienen {$pct} por ciento de descuento: o sea, {$amount}." }),
    ],
    sale_yes: [
      t("¡Sí! | Hoy | tiene | {$pct}% | de descuento.", "Yes! | Today | it-has | {$pct}% | off.", "Yes! It's {$pct}% off today.", { say: "¡Sí! Hoy tiene {$pct} por ciento de descuento." }),
      t("Sí, | está | al | {$pct}%.", "Yes, | it's | at | {$pct}% (off).", "Yep, {$pct}% off.", { say: "Sí, está al {$pct} por ciento.", flags: { 2: "al 30% = 30% off, as on Mexican sale signs." } }),
    ],
    sale_yes_pl: [
      t("¡Sí! | Hoy | tienen | {$pct}% | de descuento.", "Yes! | Today | they-have | {$pct}% | off.", "Yes! They're {$pct}% off today.", { say: "¡Sí! Hoy tienen {$pct} por ciento de descuento." }),
      t("Sí, | están | al | {$pct}%.", "Yes, | they're | at | {$pct}% (off).", "Yep, {$pct}% off.", { say: "Sí, están al {$pct} por ciento.", flags: { 2: "al 30% = 30% off, as on Mexican sale signs." } }),
    ],
    sale_news: [
      t("¡Buenas | noticias: | hoy | tiene | {$pct}% | de descuento!", "Good | news: | today | it-has | {$pct}% | off!", "Good news: it's {$pct}% off today!",
        { say: "¡Buenas noticias: hoy tiene {$pct} por ciento de descuento!" }),
    ],
    sale_news_pl: [
      t("¡Buenas | noticias: | hoy | tienen | {$pct}% | de descuento!", "Good | news: | today | they-have | {$pct}% | off!", "Good news: they're {$pct}% off today!",
        { say: "¡Buenas noticias: hoy tienen {$pct} por ciento de descuento!" }),
    ],
    sale_no: [t("Perdón, | {este@X} | no tiene | descuento.", "Sorry, | this one | doesn't have | discount.", "Sorry, this one isn't on sale.")],
    sale_no_pl: [t("Perdón, | {este@X} | no tienen | descuento.", "Sorry, | these | don't have | discount.", "Sorry, these aren't on sale.")],
    sale_general: [
      t("Pero | lo | de | la | mesa | de | la | entrada | está | al | {$pct}%.", "But | the stuff | on | the | table | by | the | entrance | is | at | {$pct}% (off).",
        "But everything on the front table is {$pct}% off.", { say: "Pero lo de la mesa de la entrada está al {$pct} por ciento." }),
    ],
    tax_info: [
      t("Sí, | el | precio | ya | incluye | IVA.", "Yes, | the | price | already | includes | VAT.", "Yes, the price already includes tax.",
        { flags: { 5: "IVA: Mexico's sales tax (VAT). Price tags in Mexico normally include it." } }),
      t("Sí, | todos | los | precios | ya | traen | IVA.", "Yes, | all | the | prices | already | bring | VAT.", "Yes, all our prices include tax.",
        { flags: { 6: "IVA: Mexico's sales tax (VAT). Price tags in Mexico normally include it." } }),
    ],
    return_policy: [
      t("Tiene | treinta | días | para | hacer | cambios. | Nada más | guarde | su | ticket.", "You-have | thirty | days | to | make | exchanges. | Just | keep | your | receipt.",
        "You have thirty days to exchange it. Just keep your receipt.", { flags: { 9: FLAG_TICKET },
          neutral: t("Tiene | treinta | días | para | hacer | cambios. | Nada más | guarde | su | recibo.", "You-have | thirty | days | to | make | exchanges. | Just | keep | your | receipt.",
            "You have thirty days to exchange it. Just keep your receipt.") }),
    ],
    expensive_sale: [
      t("Bueno, | hoy | tiene | {$pct}% | de descuento.", "Well, | today | it-has | {$pct}% | off.", "Well, it's actually {$pct}% off today!", { say: "Bueno, hoy tiene {$pct} por ciento de descuento." }),
    ],
    expensive_sale_pl: [
      t("Bueno, | hoy | tienen | {$pct}% | de descuento.", "Well, | today | they-have | {$pct}% | off.", "Well, they're actually {$pct}% off today!", { say: "Bueno, hoy tienen {$pct} por ciento de descuento." }),
    ],
    expensive_ok: [
      t("Lo | entiendo. | Pero | la | tela | es | muy | buena.", "It | I-understand. | But | the | fabric | is | very | good.", "I understand. But the fabric is really good quality."),
    ],

    // --- decision ------------------------------------------------------------------------------
    decide_q: [
      t("¿Y? | ¿Qué | le | pareció?", "So? | What | (to) you | did it seem?", "So, what do you think?"),
      t("¿Se | {lo@X} | lleva?", "(For yourself) | it | are you taking?", "Will you take it?"),
    ],
    decide_q_pl: [
      t("¿Y? | ¿Qué | le | parecieron?", "So? | What | (to) you | did they seem?", "So, what do you think?"),
      t("¿Se | {lo@X} | lleva?", "(For yourself) | them | are you taking?", "Will you take them?"),
    ],
    take_ok: [
      t("¡Perfecto! | Pásele | a | la | caja.", "Perfect! | Go on | to | the | register.", "Great! Come on over to the register.",
        { flags: { 1: "Mexican: pásele = go ahead, come in." }, neutral: t("¡Perfecto! | Pase | a | la | caja.", "Perfect! | Go | to | the | register.", "Great! Come on over to the register.") }),
      t("¡Muy | bien! | Se | {lo@X} | llevo | a | la | caja.", "Very | good! | (For) you | it | I-take | to | the | register.", "Great! I'll take it to the register for you."),
    ],
    take_ok_pl: [
      t("¡Perfecto! | Pásele | a | la | caja.", "Perfect! | Go on | to | the | register.", "Great! Come on over to the register.",
        { flags: { 1: "Mexican: pásele = go ahead, come in." }, neutral: t("¡Perfecto! | Pase | a | la | caja.", "Perfect! | Go | to | the | register.", "Great! Come on over to the register.") }),
      t("¡Muy | bien! | Se | {lo@X} | llevo | a | la | caja.", "Very | good! | (For) you | them | I-take | to | the | register.", "Great! I'll take them to the register for you."),
    ],
    think_ok: [
      t("Claro, | con | calma.", "Sure, | with | calm.", "Sure, take your time."),
      t("¡Sin | problema! | Aquí | estamos | todo | el | día.", "Without | problem! | Here | we-are | all | the | day.", "No problem! We're here all day."),
    ],
    not_take_ok: [
      t("Está | bien. | ¿Quiere | ver | otra | cosa?", "It's | fine. | Do you want | to see | other | thing?", "That's okay. Would you like to see something else?"),
      t("Bueno. | ¿Le | enseño | otra | cosa?", "Okay. | (To) you | I-show | other | thing?", "Okay. Can I show you something else?"),
    ],
    what_else: [
      t("¡Claro! | ¿Qué | le | gustaría | ver?", "Sure! | What | (to) you | would it please | to see?", "Sure! What would you like to see?"),
    ],

    // --- paying ------------------------------------------------------------------------------
    rewards_q: [
      t("¿Tiene | tarjeta | de | cliente | frecuente?", "Do you have | card | of | customer | frequent?", "Do you have a loyalty card with us?"),
    ],
    rewards_again: [t("¿Y | tiene | tarjeta | de | cliente | frecuente?", "And | do you have | card | of | customer | frequent?", "And do you have a loyalty card?")],
    rewards_offer: [
      t("¿Quiere | registrarse? | Es | gratis | y | junta | puntos.", "Do you want | to sign up? | It's | free | and | you-collect | points.", "Would you like to sign up? It's free, and you earn points."),
    ],
    rewards_free: [t("No cuesta | nada. | ¿{m:Lo|f:La} | registro?", "It doesn't cost | anything. | You | I-sign up?", "It doesn't cost anything. Shall I sign you up?",
      { flags: { 2: "lo / la: “you” (usted), as an object; it follows your gender." } })],
    rewards_no: [t("¡Sin | problema!", "Without | problem!", "No problem!"), t("Está | bien.", "It's | fine.", "That's fine.")],
    rewards_yes: [t("¡Listo! | Nada más | escanee | este | código | en | su | casa.", "Ready! | Just | scan | this | code | in | your | house.", "All set! Just scan this code at home.")],
    rewards_member: [t("Perfecto, | ya | {m:lo|f:la} | encontré.", "Perfect, | already | you | I-found.", "Perfect, I found you.", { flags: { 2: "lo / la: “you” (usted), as an object; it follows your gender." } })],
    total: [
      t("Son | {$total}.", "It's | {$total}.", "That's {$total}."),
      t("Serían | {$total}.", "That would be | {$total}.", "That'll be {$total}."),
      t("Su | total | es | {$total}.", "Your | total | is | {$total}.", "Your total is {$total}."),
    ],
    ask_pay_method: [t("¿Va | a | pagar | en | efectivo | o | con | tarjeta?", "Are you going | to | pay | in | cash | or | with | card?", "Cash or card?")],
    card_tap: [
      t("Claro. | Acerque | o | inserte | su | tarjeta, | por favor.", "Sure. | Bring close | or | insert | your | card, | please.", "Sure. Tap or insert your card, please."),
      t("Claro. | Aquí | está | la | terminal.", "Sure. | Here | is | the | card reader.", "Sure. Here's the card reader.",
        { flags: { 4: "la terminal: the card reader (the machine)." } }),
    ],
    card_later: [t("Claro, | con | tarjeta | sí.", "Sure, | with | card | yes.", "Sure, card is fine.")],
    phone_later: [t("Claro, | con | el | celular | también | se puede.", "Sure, | with | the | cell phone | also | you can.", "Sure, you can pay with your phone too.")],
    phone_ok: [t("¡Claro! | Acerque | su | celular | a | la | terminal.", "Sure! | Bring close | your | cell phone | to | the | card reader.", "Sure! Just hold your phone to the card reader.")],
    cash_ok: [t("Claro, | en | efectivo | está | bien.", "Sure, | in | cash | is | fine.", "Sure, cash is fine.")],
    dollars: [t("Sí, | pero | el | cambio | se lo | doy | en | pesos.", "Yes, | but | the | change | it to you | I-give | in | pesos.", "Yes, but I'll give you the change in pesos.")],
    hold_ok: [t("Claro, | se | {lo@X} | aparto | hasta | mañana.", "Sure, | (for) you | it | I-set aside | until | tomorrow.", "Sure, I'll hold it for you until tomorrow.")],
    hold_ok_pl: [t("Claro, | se | {lo@X} | aparto | hasta | mañana.", "Sure, | (for) you | them | I-set aside | until | tomorrow.", "Sure, I'll hold them for you until tomorrow.")],
    transfer_no: [t("Perdón, | aquí | nada más | tarjeta | o | efectivo.", "Sorry, | here | only | card | or | cash.", "Sorry, we only take card or cash here.")],
    change_back: [t("Aquí | tiene | su | cambio.", "Here | you-have | your | change.", "Here's your change."), t("Y | su | cambio.", "And | your | change.", "And your change.")],
    paid: [t("¡Gracias!", "Thanks!", "Thank you!"), t("Listo, | gracias.", "Ready, | thanks.", "All set, thanks!")],
    thanks_tip: [t("¡Ay, | muchas | gracias!", "Oh, | many | thanks!", "Oh, thank you so much!")],
    no_problem: [t("Sin | problema.", "Without | problem.", "No problem."), t("No hay | problema.", "There's no | problem.", "No problem.")],
    pay_here: [t("Aquí | en | la | caja, | por favor.", "Here | at | the | register, | please.", "Right here at the register.")],
    ask_bag: [
      t("¿Le | doy | una | bolsa?", "(To) you | I-give | a | bag?", "Would you like a bag?"),
      t("¿Gusta | una | bolsita?", "Would you like | a | little bag?", "Would you like a bag?",
        { flags: { 0: "Mexican: ¿gusta…? = would you like…? (very polite).", 2: "-ita: a friendly diminutive, not a small bag." },
          neutral: t("¿Quiere | una | bolsita?", "Do you want | a | little bag?", "Would you like a bag?", { flags: { 2: "-ita: a friendly diminutive, not a small bag." } }) }),
    ],
    bag_here: [
      t("Aquí | tiene.", "Here | you-have.", "Here you go."),
      t("Claro, | se | {lo@X} | pongo | en | una | bolsa | de | papel.", "Sure, | (for) you | it | I-put | in | a | bag | of | paper.", "Sure, I'll put it in a paper bag for you."),
    ],
    bag_here_pl: [
      t("Aquí | tiene.", "Here | you-have.", "Here you go."),
      t("Claro, | se | {lo@X} | pongo | en | una | bolsa | de | papel.", "Sure, | (for) you | them | I-put | in | a | bag | of | paper.", "Sure, I'll put them in a paper bag for you."),
    ],
    bag_free: [t("Es | gratis. | ¿Le | doy | una?", "It's | free. | (To) you | I-give | one?", "It's free. Would you like one?")],
    cut_tags: [t("¡Claro! | Le | quito | la | etiqueta.", "Sure! | (For) you | I-remove | the | tag.", "Sure! I'll take the tag off for you.")],
    gift_ok_nobag: [
      t("¡Claro! | Aquí | tiene | su | ticket | de | regalo.", "Sure! | Here | you-have | your | receipt | of | gift.", "Of course! Here's a gift receipt.",
        { flags: { 4: FLAG_TICKET }, neutral: t("¡Claro! | Aquí | tiene | su | recibo | de | regalo.", "Sure! | Here | you-have | your | receipt | of | gift.", "Of course! Here's a gift receipt.") }),
    ],
    gift_ok: [
      t("¡Claro! | Se | {lo@X} | envuelvo | para | regalo | y | le | pongo | un | ticket | de | regalo.", "Sure! | (For) you | it | I-wrap | for | gift | and | (for) you | I-put | a | receipt | of | gift.",
        "Of course! I'll gift-wrap it and put in a gift receipt.", { flags: { 10: FLAG_TICKET },
          neutral: t("¡Claro! | Se | {lo@X} | envuelvo | para | regalo | y | le | pongo | un | recibo | de | regalo.", "Sure! | (For) you | it | I-wrap | for | gift | and | (for) you | I-put | a | receipt | of | gift.",
            "Of course! I'll gift-wrap it and put in a gift receipt.") }),
    ],
    gift_ok_pl: [
      t("¡Claro! | Se | {lo@X} | envuelvo | para | regalo | y | le | pongo | un | ticket | de | regalo.", "Sure! | (For) you | them | I-wrap | for | gift | and | (for) you | I-put | a | receipt | of | gift.",
        "Of course! I'll gift-wrap them and put in a gift receipt.", { flags: { 10: FLAG_TICKET },
          neutral: t("¡Claro! | Se | {lo@X} | envuelvo | para | regalo | y | le | pongo | un | recibo | de | regalo.", "Sure! | (For) you | them | I-wrap | for | gift | and | (for) you | I-put | a | receipt | of | gift.",
            "Of course! I'll gift-wrap them and put in a gift receipt.") }),
    ],
    ask_receipt: [
      t("¿Le | doy | su | ticket | o | se lo | mando | por | correo?", "(To) you | I-give | your | receipt | or | it to you | I-send | by | email?",
        "Would you like your receipt printed, or shall I email it to you?", { flags: { 3: FLAG_TICKET },
          neutral: t("¿Le | doy | su | recibo | o | se lo | mando | por | correo?", "(To) you | I-give | your | receipt | or | it to you | I-send | by | email?",
            "Would you like your receipt printed, or shall I email it to you?") }),
      t("¿Quiere | su | ticket?", "Do you want | your | receipt?", "Would you like your receipt?", { flags: { 2: FLAG_TICKET },
        neutral: t("¿Quiere | su | recibo?", "Do you want | your | receipt?", "Would you like your receipt?") }),
    ],
    receipt_here: [
      t("Aquí | está | su | ticket.", "Here | is | your | receipt.", "Here's your receipt.", { flags: { 3: FLAG_TICKET },
        neutral: t("Aquí | está | su | recibo.", "Here | is | your | receipt.", "Here's your receipt.") }),
    ],
    receipt_email: [t("Claro, | escriba | su | correo | aquí | en | la | pantalla.", "Sure, | write | your | email | here | on | the | screen.", "Sure, just type your email on the screen here.")],
    receipt_keep: [
      t("Sin | problema. | Nada más | recuerde | que | para | cambios | necesita | el | ticket.", "Without | problem. | Just | remember | that | for | exchanges | you-need | the | receipt.",
        "No problem. Just remember you'll need it for exchanges.", { flags: { 9: FLAG_TICKET },
          neutral: t("Sin | problema. | Nada más | recuerde | que | para | cambios | necesita | el | recibo.", "Without | problem. | Just | remember | that | for | exchanges | you-need | the | receipt.",
            "No problem. Just remember you'll need it for exchanges.") }),
    ],

    // --- closing -------------------------------------------------------------------------------
    closing_bought: [
      t("¡Que | disfrute | {su@X} | {X} | {nuevo@X}!", "(May) | you-enjoy | your | {X} | new!", "Enjoy your new {X}!"),
      t("¡Gracias | por | su | compra!", "Thanks | for | your | purchase!", "Thanks for shopping with us!"),
    ],
    closing_nobuy: [t("¡Gracias | por | venir!", "Thanks | for | coming!", "Thanks for stopping by!")],
    bye_after: [
      t("¡Vuelva | pronto!", "Come back | soon!", "Come back soon!"),
      t("¡Que | esté | muy | bien!", "(May) | you-be | very | well!", "All the best!"),
    ],
    anything_else: [t("¿Le | puedo | ayudar | en | algo | más?", "(To) you | can I | help | in | something | more?", "Can I help you with anything else?")],

    // --- returns -------------------------------------------------------------------------------
    return_q: [
      t("¿Viene | a | hacer | un | cambio?", "Are you coming | to | make | an | exchange?", "Are you here to exchange something?"),
      t("¿Es | para | un | cambio | o | una | devolución?", "Is it | for | an | exchange | or | a | return?", "Is it an exchange or a return?"),
    ],
    ret_ask_receipt: [
      t("Claro. | ¿Trae | su | ticket?", "Sure. | Do you bring | your | receipt?", "Sure. Do you have your receipt?", { flags: { 3: FLAG_TICKET },
        neutral: t("Claro. | ¿Trae | su | recibo?", "Sure. | Do you bring | your | receipt?", "Sure. Do you have your receipt?") }),
      t("Con gusto. | ¿Tiene | el | ticket | de | compra?", "With pleasure. | Do you have | the | receipt | of | purchase?", "Of course. Do you have the receipt?", { flags: { 3: FLAG_TICKET },
        neutral: t("Con gusto. | ¿Tiene | el | recibo | de | compra?", "With pleasure. | Do you have | the | receipt | of | purchase?", "Of course. Do you have the receipt?") }),
    ],
    ret_receipt_thanks: [t("Perfecto, | gracias.", "Perfect, | thanks.", "Perfect, thank you.")],
    ret_receipt_none: [t("Bueno, | no se preocupe.", "Well, | don't worry.", "That's okay.")],
    ret_ask_reason: [
      t("¿Tuvo | algún | problema?", "Did you have | some | problem?", "Was there anything wrong with it?"),
      t("¿Me | permite | preguntar | por qué | {lo@X} | devuelve?", "Me | you-allow | to ask | why | it | you-return?", "May I ask why you're returning it?"),
    ],
    ret_ask_reason_pl: [
      t("¿Tuvo | algún | problema?", "Did you have | some | problem?", "Was there anything wrong with them?"),
      t("¿Me | permite | preguntar | por qué | {lo@X} | devuelve?", "Me | you-allow | to ask | why | them | you-return?", "May I ask why you're returning them?"),
    ],
    ret_what_wrong: [t("¿Qué | problema | tiene?", "What | problem | does it have?", "What's wrong with it?")],
    ret_what_wrong_pl: [t("¿Qué | problema | tienen?", "What | problem | do they have?", "What's wrong with them?")],
    ret_sorry: [t("¡Ay, | qué | pena! | Una disculpa.", "Oh, | what a | shame! | I'm sorry.", "Oh no, I'm so sorry about that!",
      { flags: { 3: "una disculpa: a common Mexican way to say sorry." } })],
    ret_size_happens: [t("Ah, | eso | pasa | mucho.", "Ah, | that | happens | a lot.", "Oh, that happens a lot!")],
    ret_fine: [t("Está | bien, | no hay | problema.", "It's | fine, | there's no | problem.", "That's totally fine.")],
    ret_choice_q: [
      t("¿Prefiere | que | le | devuelva | su | dinero, | o | un | cambio?", "Do you prefer | that | (to) you | I-return | your | money, | or | an | exchange?", "Would you like a refund or an exchange?"),
      t("¿Reembolso | o | cambio?", "Refund | or | exchange?", "Refund or exchange?"),
    ],
    ret_choice_noreceipt: [
      t("Sin | ticket | no le puedo | devolver | el | dinero, | pero | le | puedo | hacer | un | cambio | o | darle | saldo a favor.",
        "Without | receipt | I can't (to you) | give back | the | money, | but | (for) you | I-can | make | an | exchange | or | give you | store credit.",
        "Without a receipt I can't give you a refund, but I can do an exchange or give you store credit.", { flags: { 1: FLAG_TICKET },
          neutral: t("Sin | recibo | no le puedo | devolver | el | dinero, | pero | le | puedo | hacer | un | cambio | o | darle | saldo a favor.",
            "Without | receipt | I can't (to you) | give back | the | money, | but | (for) you | I-can | make | an | exchange | or | give you | store credit.",
            "Without a receipt I can't give you a refund, but I can do an exchange or give you store credit.") }),
    ],
    ret_choice_short: [t("¿Prefiere | un | cambio | o | saldo a favor?", "Do you prefer | an | exchange | or | store credit?", "Would you like an exchange or store credit?")],
    ret_no_refund_receipt: [
      t("Perdón, | sin | ticket | no hacemos | reembolsos.", "Sorry, | without | receipt | we don't do | refunds.", "Sorry, we can't do refunds without a receipt.", { flags: { 2: FLAG_TICKET },
        neutral: t("Perdón, | sin | recibo | no hacemos | reembolsos.", "Sorry, | without | receipt | we don't do | refunds.", "Sorry, we can't do refunds without a receipt.") }),
    ],
    ret_refund_done: [
      t("Muy | bien. | Le | devuelvo | el | dinero | a | su | tarjeta.", "Very | good. | (To) you | I-return | the | money | to | your | card.", "All right. I'll put the money back on your card."),
    ],
    ret_refund_days: [
      t("Puede | tardar | unos | días | en | verse | en | su | estado de cuenta.", "It-can | take | some | days | in | to be seen | on | your | statement.", "It may take a few days to show up on your statement."),
    ],
    ret_credit_done: [t("Aquí | tiene | su | saldo a favor: | {$amount}.", "Here | you-have | your | store credit: | {$amount}.", "Here's your store credit: {$amount}.")],
    ret_credit_card: [t("Está | en | esta | tarjeta | de | regalo.", "It's | on | this | card | of | gift.", "It's on this gift card.")],
    ret_exchange_size_q: [t("¿Qué | talla | quiere | en su lugar?", "What | size | do you want | instead?", "What size would you like instead?")],
    ret_exchange_color_q: [t("¿Qué | color | prefiere | entonces?", "What | color | do you prefer | then?", "Which color would you like instead?")],
    ret_exchange_what_q: [
      t("¡Claro! | ¿Mismo | modelo | en | otra | talla | o | en | otro | color?", "Sure! | Same | style | in | other | size | or | in | other | color?", "Sure! Same style, different size or color?"),
    ],
    ret_exchange_done: [
      t("Aquí | tiene | {su@X} | {X} | {nuevo@X}. | ¡Perdón | por | las | molestias!", "Here | you-have | your | {X} | new. | Sorry | for | the | trouble!", "Here's your new {X}. Sorry for the trouble!"),
    ],
    ret_exchange_done_pl: [
      t("Aquí | tiene | {su@X} | {X} | {nuevo@X}. | ¡Perdón | por | las | molestias!", "Here | you-have | your | {X} | new. | Sorry | for | the | trouble!", "Here are your new {X}. Sorry for the trouble!"),
    ],
    ret_same_new: [t("Aquí | tiene | {uno@X} | {nuevo@X}, | igual.", "Here | you-have | a | new (one), | the same.", "Here's a new one, just the same.")],
    ret_same_new_pl: [t("Aquí | tiene | {uno@X} | {nuevo@X}, | iguales.", "Here | you-have | some | new (ones), | the same.", "Here are new ones, just the same.")],
    ret_shop_ok: [t("¡Ah, | perdón! | ¿En | qué | le | puedo | ayudar?", "Oh, | sorry! | In | what | (to) you | can I | help?", "Oh, sorry! How can I help you?")],
  },

  domains: {
    price: () => CLOTHING.map((e) => e.attrs!.price as number),
    amount: () => [...new Set(CLOTHING.flatMap((e) => { const p = e.attrs!.price as number; return [p, ...[20, 30].map((pct) => Math.floor((p * (100 - pct)) / 10000) * 100)]; }))],
    total: () => [...new Set(CLOTHING.flatMap((e) => { const p = e.attrs!.price as number; return [p, ...[20, 30].map((pct) => Math.floor((p * (100 - pct)) / 10000) * 100)]; }))],
    pct: () => [20, 30],
    num: () => Array.from({ length: 14 }, (_, i) => i + 20),
  },

  hints: {
    browse: {
      lt: "Say you're just looking",
      items: [
        { id: "browse_just", s: t("Nada más | estoy | viendo, | gracias.", "Just | I-am | looking, | thanks.", "I'm just looking, thanks.") },
        { id: "browse_fine", s: t("Estoy | bien, | gracias. | Solo | estoy | viendo.", "I-am | fine, | thanks. | Only | I-am | looking.", "I'm fine, thanks. Just browsing.") },
        { id: "browse_not_now", s: t("Por ahora | no, | gracias.", "For now | no, | thanks.", "Not right now, thanks.") },
      ],
    },
    looking: {
      lt: "Say what you're looking for", slot: "clothing", examples: ["guayabera", "vestido", "traje", "sandalias", "pantalon"],
      items: ordered(
        [
          { id: "look_for", s: t("Busco | {X.np}.", "I'm looking for | {X.np}.", "I'm looking for {X.np}."), only: (e) => !MANY(e) },
          { id: "look_for", s: t("Busco | {uno@X:pl} | {X.pl}.", "I'm looking for | some | {X.pl}.", "I'm looking for some {X.pl}."), only: (e) => MANY(e) },
        ],
        { id: "q_have_any", s: t("¿Tiene | {X.pl}?", "Do you have | {X.pl}?", "Do you have any {X.pl}?") },
        { id: "can_i_see", s: t("¿Me | enseña | {X.the} | del | maniquí?", "(To) me | you-show | {X.the} | of the | mannequin?", "Could you show me {X.the} on the mannequin?"),
          only: (e) => !e.attrs?.shoe && !MANY(e) },
        { id: "q_where", s: t("¿Dónde | están | {el@X:pl} | {X.pl}?", "Where | are | the | {X.pl}?", "Where are the {X.pl}?") },
        hp("i_like", "Me gusta | {este@X} | {X}.", "I like | this | {X}.", "I like this {X}.", "Me gustan | {este@X:pl} | {X.pl}.", "I like | these | {X.pl}.", "I like these {X.pl}."),
        hp("have_this_size", "¿Tiene | {este@X} | {X} | en | mediana?", "Do you have | this | {X} | in | medium?", "Do you have this {X} in a medium?",
          "¿Tiene | {este@X:pl} | {X.pl} | en | mediana?", "Do you have | these | {X.pl} | in | medium?", "Do you have these {X.pl} in a medium?", {}, {}, (e) => !e.attrs?.shoe && !e.attrs?.oneSize),
      ),
    },
    size: {
      lt: "Say your size", slot: "size", examples: ["mediana", "grande", "chica"],
      items: [
        { id: "size_short", s: t("{X.the}, | por favor.", "{X.the}, | please.", "{X.the}, please.") },
        { id: "size_im", s: t("Soy | talla | {X}.", "I-am | size | {X}.", "I'm a {X}.") },
        { id: "size_wear", s: t("Normalmente | uso | {X}.", "Normally | I-wear | {X}.", "I usually wear a {X}.") },
        { id: "have_size", s: t("¿Hay | en | {X}?", "Is there (one) | in | {X}?", "Do you have it in {X}?") },
        { id: "size_up", s: t("¿Tiene | una | talla | más | grande?", "Do you have | a | size | more | big?", "Do you have a bigger size?") },
        { id: "size_down", s: t("¿Tiene | una | talla | más | chica?", "Do you have | a | size | more | small?", "Do you have a smaller size?") },
        { id: "q_sizes", s: t("¿Qué | tallas | tiene?", "What | sizes | do you have?", "What sizes do you have?") },
        { id: "size_unsure", s: t("No estoy | {m:seguro|f:segura} | de | mi | talla.", "I'm not | sure | of | my | size.", "I'm not sure about my size.") },
      ],
    },
    shoe_size: {
      lt: "Say your shoe size",
      items: [
        { id: "ss_size", s: t("Del | 25, | por favor.", "Of the | 25, | please.", "A 25, please.", { say: "Del veinticinco, por favor.", flags: { 0: "del 25 = (the one) of size 25." } }) },
        { id: "ss_wear", s: t("Calzo | del | 26.", "I-wear (shoes) | of the | 26.", "I'm a size 26.", { say: "Calzo del veintiséis." }) },
        { id: "ss_us", s: t("En | Estados Unidos | calzo | 8.", "In | the United States | I-wear (shoes) | 8.", "I'm an 8 in the US.", { say: "En Estados Unidos calzo ocho." }),
          note: "Mexico numbers shoes its own way (roughly by length in centimeters): give your US or European size and Valeria works it out." },
        { id: "ss_eu", s: t("Calzo | 39 | europeo.", "I-wear (shoes) | 39 | European.", "I'm a 39 in European sizes.", { say: "Calzo treinta y nueve europeo." }) },
        { id: "ss_half", s: t("Veinticinco | y medio, | por favor.", "Twenty-five | and a half, | please.", "Twenty-five and a half, please.") },
      ],
    },
    color: {
      lt: "Choose or ask about a color", slot: "color", examples: ["negro", "blanco", "azul", "rojo"],
      items: [
        { id: "color_short", s: t("En | {X}, | por favor.", "In | {X}, | please.", "In {X}, please.") },
        { id: "have_color", s: t("¿Hay | en | {X}?", "Is there (one) | in | {X}?", "Do you have it in {X}?") },
        { id: "q_colors", s: t("¿Qué | colores | tiene?", "What | colors | do you have?", "What colors do you have?") },
        { id: "q_other_colors", s: t("¿Hay | en | otros | colores?", "Is there | in | other | colors?", "Does it come in other colors?") },
        { id: "not_color", s: t("No me gusta | el | color.", "I don't like | the | color.", "I don't like the color.") },
      ],
    },
    // Answers to "¿Se lo quiere probar?"
    tryon_ans: {
      lt: "Say whether you'll try it on", slot: "clothing", examples: ["guayabera", "vestido", "pantalon", "camisa"],
      items: [
        { id: "try_yes", s: t("Sí, | por favor.", "Yes, | please.", "Yes, please.") },
        { id: "try_where", s: t("¡Sí! | ¿Dónde | está | el | probador?", "Yes! | Where | is | the | fitting room?", "Sure! Where's the fitting room?"), only: (e) => !e.attrs?.shoe },
        { id: "try_no", s: t("No, | gracias.", "No, | thanks.", "No, thanks.") },
      ],
    },
    tryon: {
      lt: "Ask to try it on", slot: "clothing", examples: ["guayabera", "vestido", "pantalon", "camisa"],
      items: ordered(
        hp("try_can", "¿Me | {lo@X} | puedo | probar?", "(On) me | it | can I | try?", "Can I try it on?", "¿Me | {lo@X:pl} | puedo | probar?", "(On) me | them | can I | try?", "Can I try them on?",
          { flags: { 0: "probarse: to try on (on yourself); me lo puedo probar = can I try it on." } }),
        hp("try_the", "¿Puedo | probarme | {X.the}?", "Can I | try on | {X.the}?", "Could I try on {X.the}?", "¿Puedo | probarme | {el@X:pl} | {X.pl}?", "Can I | try on | the | {X.pl}?", "Could I try on the {X.pl}?"),
        { id: "q_fitting", s: t("¿Dónde | están | los | probadores?", "Where | are | the | fitting rooms?", "Where are the fitting rooms?") },
      ),
    },
    fit: {
      lt: "Say how it fits", slot: "clothing", examples: ["guayabera", "vestido", "pantalon", "camisa"],
      items: ordered(
        hp("fit_perfect", "Me | queda | muy | bien.", "(On) me | it-fits | very | well.", "It fits really well.", "Me | quedan | muy | bien.", "(On) me | they-fit | very | well.", "They fit really well."),
        hp("fit_small", "Me | queda | {chico@X}.", "(On) me | it-fits | small.", "It's too small.", "Me | quedan | {chico@X:pl}.", "(On) me | they-fit | small.", "They're too small.",
          { flags: { 2: "me queda chico/chica: it's (too) small on me." } }),
        hp("fit_big", "Me | queda | grande.", "(On) me | it-fits | big.", "It's too big.", "Me | quedan | grandes.", "(On) me | they-fit | big.", "They're too big."),
        hp("fit_tight", "Me | queda | un poco | {apretado@X}.", "(On) me | it-fits | a bit | tight.", "It's a little tight.", "Me | quedan | un poco | {apretado@X:pl}.", "(On) me | they-fit | a bit | tight.", "They're a little tight."),
        hp("fit_long", "Me | queda | {largo@X}.", "(On) me | it-fits | long.", "It's too long.", "Me | quedan | {largo@X:pl}.", "(On) me | they-fit | long.", "They're too long."),
        { id: "size_up", s: t("¿Tiene | una | talla | más | grande?", "Do you have | a | size | more | big?", "Do you have a bigger size?") },
      ),
    },
    // "¿Le queda grande o chico?"
    fit_which: {
      lt: "Say whether it's too big or too small", slot: "clothing", examples: ["guayabera", "vestido", "pantalon", "camisa"],
      items: ordered(
        hp("fit_small", "Me | queda | {chico@X}.", "(On) me | it-fits | small.", "It's too small.", "Me | quedan | {chico@X:pl}.", "(On) me | they-fit | small.", "They're too small."),
        hp("fit_big", "Me | queda | grande.", "(On) me | it-fits | big.", "It's too big.", "Me | quedan | grandes.", "(On) me | they-fit | big.", "They're too big."),
        hp("fit_tight", "Me | queda | un poco | {apretado@X}.", "(On) me | it-fits | a bit | tight.", "It's a little tight.", "Me | quedan | un poco | {apretado@X:pl}.", "(On) me | they-fit | a bit | tight.", "They're a little tight."),
        hp("fit_long", "Me | queda | {largo@X}.", "(On) me | it-fits | long.", "It's too long.", "Me | quedan | {largo@X:pl}.", "(On) me | they-fit | long.", "They're too long."),
      ),
    },
    // The guide shows the first three (buying, or asking about the price); the rest are in the phrase list.
    decide: {
      lt: "Say you'll take it, or ask the price", slot: "clothing", examples: ["guayabera", "vestido", "pantalon", "camisa"],
      items: ordered(
        hp("take_it", "Me | {lo@X} | llevo.", "(For) me | it | I-take.", "I'll take it.", "Me | {lo@X:pl} | llevo.", "(For) me | them | I-take.", "I'll take them."),
        hp("q_price", "¿Cuánto | cuesta?", "How much | does it cost?", "How much is it?", "¿Cuánto | cuestan?", "How much | do they cost?", "How much are they?"),
        hp("q_sale", "¿Tiene | descuento?", "Does it have | discount?", "Is it on sale?", "¿Tienen | descuento?", "Do they have | discount?", "Are they on sale?"),
      ),
    },
    // Not buying (yet): offered as the alternative, not among the first model answers
    think: {
      lt: "Think it over, or say no", slot: "clothing", examples: ["guayabera", "vestido", "pantalon"],
      items: ordered(
        { id: "think", s: t("Lo | voy | a | pensar.", "It | I'm going | to | think.", "I'll think about it.") },
        { id: "not_style", s: t("No es | mi | estilo.", "It's not | my | style.", "It's not really my style.") },
        hp("too_expensive", "Está | un poco | {caro@X}.", "It's | a bit | expensive.", "It's a little expensive.", "Están | un poco | {caro@X:pl}.", "They're | a bit | expensive.", "They're a little expensive."),
      ),
    },
    price: {
      lt: "Ask about the price or a sale", slot: "clothing", examples: ["guayabera", "vestido", "pantalon", "camisa"],
      items: ordered(
        hp("q_price", "¿Cuánto | cuesta?", "How much | does it cost?", "How much is it?", "¿Cuánto | cuestan?", "How much | do they cost?", "How much are they?"),
        hp("q_sale", "¿Tiene | descuento?", "Does it have | discount?", "Is it on sale?", "¿Tienen | descuento?", "Do they have | discount?", "Are they on sale?"),
        { id: "q_tax", s: t("¿Ya | incluye | IVA?", "Already | does it include | VAT?", "Does that include tax?"), note: "IVA is Mexico's sales tax; price tags normally include it." },
        hp("q_return", "¿Puedo | cambiar{lo@X} | si | no me queda?", "Can I | exchange it | if | it doesn't fit me?", "Can I exchange it if it doesn't fit?",
          "¿Puedo | cambiar{lo@X:pl} | si | no me quedan?", "Can I | exchange them | if | they don't fit me?", "Can I exchange them if they don't fit?"),
      ),
    },
    rewards: {
      lt: "Say whether you have a loyalty card",
      items: [
        { id: "rw_no", s: t("No, | no tengo.", "No, | I don't have (one).", "No, I don't.") },
        { id: "rw_member", s: t("Sí, | ya | estoy | {m:registrado|f:registrada}.", "Yes, | already | I-am | registered.", "Yes, I'm already signed up.") },
      ],
    },
    pay: {
      lt: "Pay",
      items: [
        { id: "pay_card_short", s: t("Con | tarjeta, | por favor.", "With | card, | please.", "Card, please.") },
        { id: "pay_card", s: t("¿Puedo | pagar | con | tarjeta?", "Can I | pay | with | card?", "Can I pay by card?") },
        { id: "pay_cash", s: t("Le | pago | en | efectivo.", "(To) you | I-pay | in | cash.", "I'll pay in cash.") },
        { id: "apple_pay", s: t("¿Aceptan | Apple Pay?", "Do you accept | Apple Pay?", "Do you take Apple Pay?") },
        { id: "here_you_go", s: t("Aquí tiene.", "Here you go.", "Here you go.") },
      ],
    },
    bag: {
      lt: "Say whether you need a bag", slot: "clothing", examples: ["guayabera", "vestido", "sombrero", "sandalias"],
      items: ordered(
        { id: "bag_yes", s: t("Sí, | por favor.", "Yes, | please.", "Yes, please.") },
        { id: "bag_no", s: t("No, | gracias, | no necesito | bolsa.", "No, | thanks, | I don't need | bag.", "No, thanks, I don't need a bag.") },
        hp("wear_it", "Me | {lo@X} | llevo | {puesto@X}.", "(For) me | it | I-take | on (wearing).", "I'll wear it out.", "Me | {lo@X:pl} | llevo | {puesto@X:pl}.", "(For) me | them | I-take | on (wearing).", "I'll wear them out.",
          {}, { note: "“Me lo llevo puesto” = I'll wear it out of the store." }),
        { id: "gift_receipt", s: t("Es | para | regalo.", "It's | for | gift.", "It's a gift."), note: "Shops often offer to gift-wrap it: “¿Se lo envuelvo para regalo?”" },
      ),
    },
    receipt: {
      lt: "Say how you want the receipt",
      items: [
        { id: "rc_print", s: t("Impreso, | por favor.", "Printed, | please.", "Printed, please.") },
        { id: "rc_email", s: t("Por | correo, | por favor.", "By | email, | please.", "By email, please.") },
        { id: "rc_none", s: t("No necesito | ticket, | gracias.", "I don't need | receipt, | thanks.", "I don't need a receipt, thanks.", { flags: { 1: FLAG_TICKET },
          neutral: t("No necesito | recibo, | gracias.", "I don't need | receipt, | thanks.", "I don't need a receipt, thanks.") }) },
        { id: "gift_receipt", s: t("¿Me | da | un | ticket | de | regalo?", "(To) me | you-give | a | receipt | of | gift?", "Could I get a gift receipt?", { flags: { 3: FLAG_TICKET },
          neutral: t("¿Me | da | un | recibo | de | regalo?", "(To) me | you-give | a | receipt | of | gift?", "Could I get a gift receipt?") }) },
      ],
    },
    // Returns: the first answers of each return step.
    ret_start: {
      lt: "Say what you want to return", slot: "clothing", examples: ["guayabera", "vestido", "pantalon", "sandalias"],
      items: ordered(
        hp("ret_return", "Quisiera | devolver | {este@X} | {X}.", "I'd like | to return | this | {X}.", "I'd like to return this {X}.",
          "Quisiera | devolver | {este@X:pl} | {X.pl}.", "I'd like | to return | these | {X.pl}.", "I'd like to return these {X.pl}."),
        hp("ret_exchange", "¿Me | {lo@X} | puede | cambiar | por | una | talla | más | grande?", "(For) me | it | can you | exchange | for | a | size | more | big?", "Can I exchange it for a bigger size?",
          "¿Me | {lo@X:pl} | puede | cambiar | por | una | talla | más | grande?", "(For) me | them | can you | exchange | for | a | size | more | big?", "Can I exchange them for a bigger size?",
          {}, {}, (e) => !e.attrs?.oneSize && !e.attrs?.shoe),
        { id: "ret_browse", s: t("No, | nada más | estoy | viendo, | gracias.", "No, | just | I-am | looking, | thanks.", "No, I'm just looking, thanks.") },
      ),
    },
    ret_receipt: {
      lt: "Say whether you have the receipt",
      items: [
        { id: "ret_receipt_here", s: t("Sí, | aquí | está | el | ticket.", "Yes, | here | is | the | receipt.", "Yes, here's the receipt.", { flags: { 4: FLAG_TICKET },
          neutral: t("Sí, | aquí | está | el | recibo.", "Yes, | here | is | the | receipt.", "Yes, here's the receipt.") }) },
        { id: "ret_no_receipt", s: t("No traigo | el | ticket.", "I don't have (with me) | the | receipt.", "I don't have the receipt.", { flags: { 2: FLAG_TICKET },
          neutral: t("No traigo | el | recibo.", "I don't have (with me) | the | receipt.", "I don't have the receipt.") }) },
        { id: "ret_lost", s: t("Lo | perdí.", "It | I-lost.", "I lost it.") },
      ],
    },
    ret_reason: {
      lt: "Explain what's wrong", slot: "clothing", examples: ["guayabera", "vestido", "pantalon", "sandalias"],
      items: ordered(
        hp("ret_nofit", "No me queda.", "It doesn't fit me.", "It doesn't fit.", "No me quedan.", "They don't fit me.", "They don't fit."),
        hp("ret_ran", "Se | destiñó | en | la | lavadora.", "(Itself) | it-faded | in | the | washing machine.", "The color ran in the wash.",
          "Se | destiñeron | en | la | lavadora.", "(Themselves) | they-faded | in | the | washing machine.", "The color ran in the wash."),
        { id: "ret_mind", s: t("Cambié | de | opinión.", "I-changed | of | opinion.", "I changed my mind.") },
      ),
    },
    ret_choice: {
      lt: "Choose: refund, exchange or store credit",
      items: [
        { id: "ret_refund", s: t("¿Me | puede | devolver | el | dinero?", "(To) me | can you | give back | the | money?", "Could I get a refund?") },
        { id: "ret_exchange_an", s: t("Prefiero | un | cambio, | por favor.", "I-prefer | an | exchange, | please.", "I'd like an exchange, please.") },
        { id: "ret_credit", s: t("Saldo a favor | está | bien.", "Store credit | is | fine.", "Store credit is fine."),
          note: "Saldo a favor: money you can spend in the same shop later (often on a gift card)." },
      ],
    },
    ret: {
      lt: "Return or exchange something", slot: "clothing", examples: ["guayabera", "vestido", "pantalon", "sandalias"],
      items: ordered(
        hp("ret_return", "Quisiera | devolver | {este@X} | {X}.", "I'd like | to return | this | {X}.", "I'd like to return this {X}.",
          "Quisiera | devolver | {este@X:pl} | {X.pl}.", "I'd like | to return | these | {X.pl}.", "I'd like to return these {X.pl}."),
        hp("ret_exchange", "¿Me | {lo@X} | puede | cambiar | por | una | talla | más | grande?", "(For) me | it | can you | exchange | for | a | size | more | big?", "Can I exchange it for a bigger size?",
          "¿Me | {lo@X:pl} | puede | cambiar | por | una | talla | más | grande?", "(For) me | them | can you | exchange | for | a | size | more | big?", "Can I exchange them for a bigger size?",
          {}, {}, (e) => !e.attrs?.oneSize && !e.attrs?.shoe),
        { id: "ret_receipt_here", s: t("Aquí | está | el | ticket.", "Here | is | the | receipt.", "Here's the receipt.", { flags: { 3: FLAG_TICKET },
          neutral: t("Aquí | está | el | recibo.", "Here | is | the | receipt.", "Here's the receipt.") }) },
        { id: "ret_no_receipt", s: t("No traigo | el | ticket.", "I don't have (with me) | the | receipt.", "I don't have the receipt.", { flags: { 2: FLAG_TICKET },
          neutral: t("No traigo | el | recibo.", "I don't have (with me) | the | receipt.", "I don't have the receipt.") }) },
        { id: "ret_mind", s: t("Cambié | de | opinión.", "I-changed | of | opinion.", "I changed my mind.") },
        { id: "ret_refund", s: t("¿Me | puede | devolver | el | dinero?", "(To) me | can you | give back | the | money?", "Could I get a refund?") },
        { id: "ret_exchange_short", s: t("Quisiera | hacer | un | cambio.", "I'd like | to make | an | exchange.", "I'd like to exchange it.") },
        { id: "ret_credit", s: t("Saldo a favor | está | bien.", "Store credit | is | fine.", "Store credit is fine."),
          note: "Saldo a favor: money you can spend in the same shop later (often on a gift card)." },
      ),
    },
  },

  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With a shop assistant, usted is more polite: tiene, puede, me enseña (tienes, puedes, me enseñas are for friends).", better: "¿Me lo puedo probar?" },
  },

  // -------------------------------------------------------------------------

  mission: [
    // shopping (hidden during a return)
    { lt: "Say what you're looking for", optional: true, when: shopMode, done: (c) => shopping(c) },
    { lt: "Say your size", optional: true, when: (c) => shopMode(c) && !(cur(c) && oneSize(cur(c)!.id)),
      done: (c) => shopping(c) && !oneSize(cur(c)!.id) && hasSize(cur(c)!) },
    // only when Valeria asks for a color (or the learner picked one)
    { lt: "Choose a color", optional: true, when: (c) => shopMode(c) && !!c.s.askColor,
      done: (c) => shopping(c) && (!!cur(c)!.color || c.s.decision === "take") },
    // ticked once the fit is settled (or the learner skips trying on)
    { lt: "Try it on", optional: true, when: shopMode, done: (c) => shopping(c) && (!!c.s.fitOk || !!c.s.fitDone || !!c.s.noTry || c.s.decision === "take") },
    { lt: "Say you'll take it", optional: true, when: shopMode, done: (c) => shopping(c) && c.s.decision === "take" },
    { lt: "Pay", optional: true, when: shopMode, done: (c) => c.s.mode !== "return" && !!c.s.paid },
    // a return or an exchange (Valeria asks returning customers; anyone can start one)
    { lt: "Say what you're returning", optional: true, when: retMode, done: (c) => inReturn(c) },
    { lt: "Say whether you have the receipt", optional: true, when: retMode, done: (c) => inReturn(c) && ret(c).receipt !== undefined },
    { lt: "Explain what's wrong", optional: true, when: retMode, done: (c) => inReturn(c) && !!ret(c).reason },
    { lt: "Choose: refund or exchange", optional: true, when: retMode, done: (c) => inReturn(c) && !!ret(c).choice },
    { lt: "Pick another size or color", optional: true, when: (c) => inReturn(c) && ret(c).choice === "exchange",
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
        { lt: "Say what you're looking for", hint: "looking", options: "clothing" },
        { lt: "Say you're just looking", hint: "browse" },
        { lt: "Ask about another size", hint: "size", options: "size" },
        { lt: "Ask about colors", hint: "color", options: "color" },
      ],
      yes: (c) => { c.say("what_else"); c.hold(); },
      no: (c) => { if (c.s.itemReset) { c.s.decision = "none"; } else { c.say("browse_ok"); c.s.browsing = true; c.hold(); } },
      help: (c) => { c.say("browse_nudge"); } },
    { id: "size", when: (c) => c.s.mode !== "return" && !!cur(c) && !oneSize(cur(c)!.id) && !isShoe(cur(c)!.id) && !c.s.decision, done: (c) => !!cur(c)!.size,
      ask: (c) => c.say("ask_size"), expects: ["size_ans", "ask_have_size", "size_unknown", "ask_sizes", "color_ans", "ask_have_color", "ask_colors"],
      suggest: [{ lt: "Say your size", hint: "size", options: "size" }],
      help: (c) => { c.say("size_list"); } },
    { id: "shoe", when: (c) => c.s.mode !== "return" && !!cur(c) && isShoe(cur(c)!.id) && !c.s.decision, done: (c) => cur(c)!.shoe != null,
      ask: (c) => c.say("ask_shoe"), expects: ["shoe_size", "shoe_size_ctx", "ask_have_size", "size_unknown"],
      suggest: [{ lt: "Say your shoe size (Mexican, US or European)", hint: "shoe_size" }],
      help: (c) => { c.say("shoe_guess"); } },
    { id: "color", when: (c) => c.s.mode !== "return" && !!cur(c) && c.s.askColor && !c.s.decision, done: (c) => !!cur(c)!.color,
      ask: (c) => {
        c.say("ask_color"); if (!c.s.colorsListed && c.chance(0.6)) sayColors(c, cur(c)!);
        const id = cur(c)!.id;
        guideFor(c, "color", id, { lt: "Choose a color", hint: itemHint("color", id), options: colorsOf(id) });
      },
      expects: ["color_ans", "ask_have_color", "ask_colors", "size_ans", "dislike_color"],
      suggest: [{ lt: "Choose a color", hint: "color", options: "color" }],
      help: (c) => { sayColors(c, cur(c)!); } },
    { id: "tryon", when: (c) => c.s.mode !== "return" && !!cur(c) && hasSize(cur(c)!) && !c.s.decision, done: (c) => !!c.s.tried || !!c.s.noTry,
      ask: (c) => {
        if (c.s.wantTry) { doTry(c); return; }
        sayN(c, "offer_try");
        guideFor(c, "tryon", cur(c)?.id);
      },
      expects: ["try_on", "no_try", "fit_good", "take_it", "ask_fitting_room", "ask_price", "ask_sale", "try_yes_ctx", "im_fine_ctx", "ask_colors", "ask_sizes"],
      suggest: [{ lt: "Say whether you'll try it on", hint: "tryon_ans" }, { lt: "Ask about the price or a sale", hint: "price", options: "clothing" }],
      hints: ["tryon_ans", "tryon", "price"],
      yes: (c) => { doTry(c); },
      no: (c) => { c.s.noTry = true; c.say("no_problem"); } },
    { id: "decide", when: (c) => c.s.mode !== "return" && !!cur(c) && hasSize(cur(c)!) && (!!c.s.fitOk || !!c.s.noTry || !!c.s.fitDone), done: (c) => !!c.s.decision,
      ask: (c) => {
        if (c.s.onSale && !c.s.saleSaid && c.chance(0.5)) { c.s.saleSaid = true; sayN(c, "sale_news", cur(c), { pct: c.s.pct }); }
        sayN(c, "decide_q");
        guideFor(c, "decide", cur(c)?.id);
      },
      expects: ["take_it", "think_about_it", "not_take", "too_expensive", "ask_price", "ask_sale", "ask_tax", "ask_return_policy", "dislike_color", "im_fine_ctx", "wear_it", "hold_item", "ask_colors", "why_not_ctx"],
      suggest: [
        { lt: "Say you'll take it, or ask the price", hint: "decide", options: "clothing" },
        { lt: "Think it over, or say no", hint: "think" },
        { lt: "Answer yes or no", hint: "g_yesno" },
      ],
      hints: ["decide", "price", "think", "g_yesno"],
      yes: (c) => { clothes.handlers.take_it(c, {}, { intent: "take_it", slots: {}, tags: [] }); },
      no: (c) => { clothes.handlers.not_take(c, {}, { intent: "not_take", slots: {}, tags: [] }); } },
    { id: "rewards", when: (c) => c.s.mode !== "return" && c.s.decision === "take" && c.s.askRewards, done: (c) => c.s.rewards !== undefined,
      ask: (c) => { c.say(c.s.rewardsAsked ? "rewards_again" : "rewards_q"); c.s.rewardsAsked = true; }, expects: ["rewards_member", "im_fine_ctx"],
      suggest: [{ lt: "Say whether you have a loyalty card", hint: "rewards" }],
      yes: (c) => { c.s.rewards = true; c.say("rewards_member"); },
      no: (c) => {
        c.s.rewards = false;
        c.say("rewards_offer");
        c.expect(rewardsJoin());
      } },
    { id: "pay", when: (c) => c.s.mode !== "return" && c.s.decision === "take", done: (c) => !!c.s.paid,
      ask: (c) => {
        c.say("total", { total: priceOf(c, cur(c)!) });
        // ("¿Efectivo o tarjeta?" only when the learner hasn't said yet)
        if (!c.s.totalSaid) { c.s.totalSaid = true; if (!c.s.payMethod && c.chance(0.35)) c.say("ask_pay_method"); }
      },
      expects: ["pay_card", "pay_cash", "pay_phone", "here_you_go", "no_cash", "no_card", "pay_transfer", "here_ctx", "pay_q", "ask_dollars"],
      suggest: [{ lt: "Pay by card, in cash or by phone", hint: "pay" }] },
    { id: "bag", when: (c) => c.s.mode !== "return" && !!c.s.paid && c.s.askBag, done: (c) => c.s.bag !== undefined,
      ask: (c) => { c.say("ask_bag"); guideFor(c, "bag", cur(c)?.id); }, expects: ["wear_it", "no_bag", "gift_receipt", "want_bag", "im_fine_ctx", "no_receipt", "bag_price"],
      suggest: [{ lt: "Say whether you need a bag", hint: "bag", options: "clothing" }],
      yes: (c) => { c.s.bag = true; sayN(c, "bag_here"); },
      no: (c) => { c.s.bag = false; c.say("no_problem"); } },
    { id: "receipt", when: (c) => c.s.mode !== "return" && !!c.s.paid && c.s.askReceipt, done: (c) => c.s.receipt !== undefined,
      ask: (c) => c.say("ask_receipt"), expects: ["receipt_bag", "receipt_email", "no_receipt", "gift_receipt", "receipt_no_ctx", "im_fine_ctx"],
      suggest: [{ lt: "Say how you want the receipt", hint: "receipt" }],
      yes: (c) => { c.s.receipt = "paper"; c.say("receipt_here"); c.event("give", { item: "receipt" }); },
      no: (c) => { c.s.receipt = "none"; c.say("receipt_keep"); } },

    // Returns and exchanges
    { id: "r_receipt", when: (c) => c.s.mode === "return", done: (c) => ret(c).receipt !== undefined,
      ask: (c) => c.say("ret_ask_receipt"), expects: ["receipt_yes", "receipt_none", "here_you_go", "here_ctx"],
      suggest: [{ lt: "Say whether you have the receipt", hint: "ret_receipt" }],
      hints: ["ret_receipt", "ret", "g_yesno"],
      yes: (c) => { ret(c).receipt = true; c.say("ret_receipt_thanks"); },
      no: (c) => { ret(c).receipt = false; c.say("ret_receipt_none"); } },
    { id: "r_reason", when: (c) => c.s.mode === "return", done: (c) => !!ret(c).reason,
      ask: (c) => { sayN(c, "ret_ask_reason", ret(c).item); guideFor(c, "r_reason", ret(c).item.id); }, expects: ["problem", "fit_bad", "fit_unclear", "dislike_color", "nothing_ctx"],
      suggest: [{ lt: "Explain what's wrong", hint: "ret_reason" }, { lt: "Say the size doesn't fit", hint: "fit", options: "clothing" }],
      hints: ["ret_reason", "fit", "ret"],
      yes: (c) => { sayN(c, "ret_what_wrong", ret(c).item); guideFor(c, "r_reason", ret(c).item.id); },
      no: (c) => { reactReason(c, "mind"); } },
    { id: "r_choice", when: (c) => c.s.mode === "return", done: (c) => !!ret(c).choice,
      ask: (c) => { if (ret(c).receipt) c.say("ret_choice_q"); else c.say(ret(c).refusedRefund || c.s.noReceiptSaid ? "ret_choice_short" : "ret_choice_noreceipt"); c.s.noReceiptSaid = !ret(c).receipt; },
      expects: ["want_refund", "exchange", "want_credit", "no_refund", "no_credit"],
      suggest: [{ lt: "Choose: refund, exchange or store credit", hint: "ret_choice" }],
      hints: ["ret_choice", "ret"],
      yes: (c) => { c.say(ret(c).receipt ? "ret_choice_q" : "ret_choice_short"); c.hold(); },
      no: (c) => { c.say(ret(c).receipt ? "ret_choice_q" : "ret_choice_short"); c.hold(); } },
    { id: "r_new", when: (c) => c.s.mode === "return" && ret(c).choice === "exchange", done: (c) => !!(ret(c).newSize || ret(c).newColor || ret(c).newShoe != null || ret(c).done),
      ask: (c) => {
        const r = ret(c);
        const id = r.item.id;
        const size: Suggestion = isShoe(id) ? { lt: "Choose another size", hint: "shoe_size" } : { lt: "Choose another size", hint: "size", options: "size" };
        const color: Suggestion = { lt: "Choose another color", hint: itemHint("color", id), options: colorsOf(id) };
        if (["up", "down", "nofit", "shrank"].includes(r.reason ?? "") && !oneSize(id)) { c.say("ret_exchange_size_q"); guideFor(c, "r_new", id, size, [color]); }
        else if (["ran", "dislike"].includes(r.reason ?? "") || oneSize(id)) { c.say("ret_exchange_color_q"); guideFor(c, "r_new", id, color, oneSize(id) ? [] : [size]); }
        else { c.say("ret_exchange_what_q"); guideFor(c, "r_new", id, size, [color]); }
      },
      expects: ["size_ans", "color_ans", "ask_have_size", "ask_have_color", "shoe_size", "shoe_size_ctx", "exchange"],
      suggest: [{ lt: "Choose another size", hint: "size", options: "size" }, { lt: "Choose another color", hint: "color", options: "color" }],
      yes: (c) => { ret(c).done = true; sayN(c, "ret_same_new", ret(c).item); } },
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
    c.s.lastOne = c.visits >= 1 && c.chance(0.3);
    c.s.soldOut = c.visits >= 1 && !c.s.lastOne && c.chance(0.4);
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
        suggest: [{ lt: "Say what you want to return or exchange", hint: itemHint("ret_start", (c.memory.lastBought as Garment | undefined)?.id ?? "guayabera") }, { lt: "Say you're just looking", hint: "browse" }],
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
        no: (cc) => { cc.s.retOffer = false; cc.say("ret_shop_ok"); cc.hold(); },
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
      // the recognizer's slip: "la playa" read as "playera"
      if (g?.id === "playera" && /\bplaya\b/.test(fold(c.heard ?? "")) && !/player|camiset|remer|poler|shirt/.test(fold(c.heard ?? ""))) { c.say(/gust|encant/.test(fold(c.heard ?? "")) ? "beach" : "beach_q"); c.hold(); return; }
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
      if (c.s.mode === "return" && ret(c)?.choice === "exchange") { exchangeTo(c, { size: slots.size, color: slots.color }); return; }
      if (!cur(c)) applyItem(c, null);
      const g = cur(c)!;
      const was = g.size;
      if (slots.color) setColor(c, g, slots.color);
      const ok = setSize(c, g, slots.size);
      if (ok && was !== g.size) {
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
      if (slots.shoe != null) { if (setShoe(c, g, slots.shoe, seg.tags.includes("half")) && slots.shoe >= 20 && slots.shoe <= 32) ack(c); return; }
      if (slots.size) {
        const was = g.size;
        if (setSize(c, g, slots.size)) {
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
      if (c.s.soldOut && !c.s.soldOutSaid) { setSize(c, g, "mediana"); return; }
      g.size = "mediana";
      c.say("size_guess");
    },
    shoe_size(c, slots, seg) {
      if (c.s.mode === "return" && ret(c)?.choice === "exchange") { exchangeTo(c, { shoe: slots.shoe, half: seg.tags.includes("half"), from: seg.tags.includes("eu") ? "eu" : seg.tags.includes("us") ? "us" : undefined }); return; }
      if (!cur(c)) { resetItem(c, { id: "sandalias" }); }
      const g = cur(c)!;
      const from = seg.tags.includes("eu") ? "eu" : seg.tags.includes("us") ? "us" : undefined;
      if (setShoe(c, g, slots.shoe, seg.tags.includes("half"), from) && !from && slots.shoe >= 20 && slots.shoe <= 32) ack(c);
      if (c.s.tried) { c.s.tried = false; c.s.wantTry = true; }
    },
    // a bare number: "una" or "dos" is never a shoe size ("la negra", "las dos")
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
      if (c.s.mode === "return" && ret(c)) { sayColors(c, ret(c).item); return; }
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
    try_yes_ctx(c, _slots, seg) { clothes.handlers.try_on(c, {}, seg); },
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
      sayN(c, "fit_which");
      c.expect(fitWhich(c));
    },
    fit_good(c) {
      if (!cur(c)) { applyItem(c, null); }
      c.s.tried = true;
      fitGood(c);
    },
    fit_like_ctx(c, slots, seg) { clothes.handlers.fit_good(c, slots, seg); },
    beach_unknown(c) { c.say("beach"); c.hold(); },
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
      if (!cur(c) && c.s.mode === "return" && ret(c)) { const r = ret(c).item; c.say(oneSize(r.id) ? "one_size" : isShoe(r.id) ? "shoe_sizes_numbers" : "size_list"); return; }
      if (!cur(c)) applyItem(c, null);
      const g = cur(c)!;
      if (oneSize(g.id)) c.say("one_size");
      else if (isShoe(g.id)) c.say("shoe_sizes_numbers");
      else c.say("size_list");
    },
    ask_return_policy(c) {
      if (!cur(c)) applyItem(c, null);
      c.say("return_policy");
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
        suggest: [{ lt: "Say what else you're looking for", hint: "looking", options: "clothing" }, { lt: "Answer yes or no", hint: "g_yesno" }],
        on: {
          looking_for: (cc, sl, sg) => { clothes.handlers.looking_for(cc, sl, sg); },
          item_short: (cc, sl, sg) => { clothes.handlers.looking_for(cc, sl, sg); },
        },
        yes: (cc) => { cc.say("what_else"); cc.ask("item"); },
        no: (cc) => { cc.s.decision = "none"; },
        ask: (cc) => cc.say("not_take_ok") });
    },
    too_expensive(c, slots, seg) {
      // "¿Está caro?" is a question about the price, not the complaint
      const h = fold(c.heard ?? "");
      if (h.includes("?") && !/\b(para mi|mucho|barat|economic|demasiado)\b/.test(h)) { clothes.handlers.ask_price(c, slots, seg); return; }
      if (!cur(c)) { c.say("no_problem"); return; }
      if (c.s.onSale && !c.s.saleSaid) { c.s.saleSaid = true; sayN(c, "expensive_sale", cur(c), { pct: c.s.pct }); }
      else c.say("expensive_ok");
    },
    pay_card(c) {
      if (c.s.paid) return;
      // Before the total (e.g. at "¿Tiene tarjeta de cliente frecuente?"), card is the way the learner will pay.
      if (c.s.decision !== "take" || !c.s.totalSaid) { c.say("card_later"); c.s.payMethod = "card"; return; }
      c.say("card_tap"); c.s.paid = true; c.s.payMethod = "card"; c.event("pay", { method: "card" }); c.say("paid");
    },
    pay_cash(c) {
      if (c.s.paid) return;
      c.say("cash_ok"); c.s.payMethod = "cash";
      if (c.s.decision === "take" && c.s.totalSaid) { c.s.paid = true; c.event("pay", { method: "cash" }); c.say("change_back"); }
    },
    // "No traigo efectivo" / "No con tarjeta": the other way; nothing is paid until the card or the money comes out
    no_cash(c) { if (c.s.paid) return; c.s.payMethod = "card"; c.say("card_later"); },
    no_card(c) { if (c.s.paid) return; c.s.payMethod = "cash"; c.say("cash_ok"); },
    bag_price(c) { c.say("bag_free"); c.hold(); },
    why_not_ctx(c, slots, seg) {
      if (c.step === "decide") { clothes.handlers.take_it(c, slots, seg); return; }
      clothes.steps.find((x) => x.id === c.step)?.yes?.(c);
    },
    pay_phone(c) {
      if (c.s.paid) return;
      c.s.payMethod = "phone";
      if (!(c.s.decision === "take" && c.s.totalSaid)) { c.say("phone_later"); return; }
      c.say("phone_ok");
      c.s.paid = true; c.event("pay", { method: "phone" }); c.say("paid");
    },
    pay_q(c, _slots, seg) {
      if (c.s.paid) return;
      if (seg.tags.includes("cash")) { c.s.payMethod = "cash"; c.say("cash_ok"); }
      else if (seg.tags.includes("phone")) { c.s.payMethod = "phone"; c.say("phone_later"); }
      else { c.s.payMethod = "card"; c.say("card_later"); }
    },
    ask_dollars(c) { c.say("dollars"); },
    hold_item(c) {
      if (!cur(c) || c.s.paid) { c.say("no_problem"); return; }
      c.s.decision = "think"; c.s.held = true;
      sayN(c, "hold_ok");
    },
    pay_transfer(c) { if (!c.s.paid) c.say("transfer_no"); },
    here_you_go(c) {
      if (c.s.mode === "return" && ret(c) && ret(c).receipt === undefined) { ret(c).receipt = true; c.say("ret_receipt_thanks"); return; }
      if (c.s.paid) return; // paid already: no second payment
      if (c.s.decision !== "take" || !c.s.totalSaid) { c.say("no_problem"); return; }
      c.s.paid = true; c.event("pay", { method: c.s.payMethod || "cash" });
      if (c.s.payMethod === "card" || c.s.payMethod === "phone") c.say("paid"); else c.say("change_back");
    },
    here_ctx(c, slots, seg) { clothes.handlers.here_you_go(c, slots, seg); },
    keep_change(c) { if (c.s.decision === "take" && c.s.totalSaid && !c.s.paid) { c.s.paid = true; c.event("pay", { method: "cash" }); } c.say("thanks_tip"); },
    // "Gracias, adiós" right after paying (at the bag or ticket question): the purchase is complete. Before paying
    // it ends the visit, not completed.
    g_bye(c) {
      if (c.s.mode !== "return" && c.s.paid) bought(c);
      c.say("g_bye"); c.end(); c.hold();
    },
    ask_where_pay(c) { c.say("pay_here"); },
    wear_it(c) {
      c.s.bag = false; c.s.wearing = true;
      c.say("cut_tags");
      if (!c.s.paid && c.s.decision !== "take" && cur(c) && hasSize(cur(c)!)) { c.s.decision = "take"; c.s.fitOk = true; }
    },
    no_bag(c) { c.s.bag = false; c.say("no_problem"); },
    want_bag(c) { if (c.s.bag !== true) { c.s.bag = true; sayN(c, "bag_here"); } },
    gift_receipt(c) { c.s.receipt = "gift"; if (c.s.bag === false) c.say("gift_ok_nobag"); else sayN(c, "gift_ok"); },
    receipt_bag(c) { c.s.receipt = "paper"; c.say("receipt_here"); c.event("give", { item: "receipt" }); },
    receipt_email(c) { c.s.receipt = "email"; c.say("receipt_email"); },
    no_receipt(c) { c.s.receipt = "none"; c.say("receipt_keep"); },
    receipt_no_ctx(c) { c.s.receipt = "none"; c.say("receipt_keep"); },
    rewards_member(c) { c.s.rewards = true; c.say("rewards_member"); },

    // Returns and exchanges
    return_item(c, slots, seg) {
      const g = fromSlot(slots.item);
      if (seg.tags.includes("canret") && c.s.mode !== "return" && cur(c) && !c.s.paid) { c.say("return_policy"); return; }
      if (c.s.mode !== "return" || !ret(c)) startReturn(c, g);
      else if (g && g.id !== ret(c).item.id) ret(c).item = { id: g.id, paid: basePrice(g.id) };
      c.ask("r_receipt");
    },
    exchange(c, slots, seg) {
      const g = fromSlot(slots.item);
      // "(Por) otro color" while shopping, without "cambiar / cambio": about the garment in hand, not an exchange
      if (c.s.mode !== "return" && !c.s.retOffer && cur(c) && !c.s.paid && !g && !/cambi/.test(fold(c.heard ?? ""))) {
        const H = clothes.handlers;
        if (slots.color) H.ask_have_color(c, slots, seg);
        else if (seg.tags.includes("up") || seg.tags.includes("down") || slots.size || slots.shoe != null) H.ask_have_size(c, slots, seg);
        else if (/color/.test(fold(c.heard ?? ""))) H.ask_colors(c, slots, seg);
        else H.ask_sizes(c, slots, seg);
        return;
      }
      if (c.s.mode !== "return" || !ret(c)) startReturn(c, g);
      const r = ret(c);
      r.choice = "exchange";
      const dir = seg.tags.includes("up") ? "up" : seg.tags.includes("down") ? "down" : undefined;
      const sz = slots.size ?? g?.size, colr = slots.color ?? g?.color, sh = slots.shoe ?? g?.shoe;
      if (dir || sz || colr || sh != null) exchangeTo(c, { dir, size: sz, color: colr, shoe: sh });
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
    nothing_ctx(c) {
      if (c.s.mode !== "return" || !ret(c)) startReturn(c, null);
      if (!ret(c).reason) reactReason(c, "mind");
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
      bought(c);
      sayN(c, "closing_bought", g);
      c.say("bye_after");
    } else {
      c.say("closing_nobuy");
      c.say("bye_after");
    }
    closing(c);
  },

  tests: [
    // hint patterns and natural alternatives
    { say: "Nada más estoy viendo, gracias", intent: "just_looking" },
    { say: "Estoy bien, gracias. Solo estoy viendo", intent: "just_looking" },
    { say: "Busco un vestido", intent: "looking_for", slots: { item: { clothing: "vestido" } } },
    { say: "Busco unas sandalias negras", intent: "looking_for", slots: { item: { clothing: "sandalias", color: "negro" } } },
    { say: "¿Tiene guayaberas?", intent: "looking_for", slots: { item: { clothing: "guayabera" } } },
    { say: "¿Me enseña la guayabera del maniquí?", intent: "looking_for", slots: { item: { clothing: "guayabera" } } },
    { say: "Ando buscando un traje de baño", intent: "looking_for", slots: { item: { clothing: "traje" } } },
    { say: "Quiero una playera blanca en mediana", intent: "looking_for", slots: { item: { clothing: "playera", color: "blanco", size: "mediana" } } },
    { say: "Busco algo fresco para la playa", intent: "vague_item" },
    { say: "Mediana, por favor", intent: "size_ans", step: "size", slots: { size: "mediana" } },
    { say: "Soy talla chica", intent: "size_ans", step: "size", slots: { size: "chica" } },
    { say: "Normalmente uso grande", intent: "size_ans", step: "size", slots: { size: "grande" } },
    { say: "Extra grande", intent: "size_ans", step: "size", slots: { size: "xg" } },
    { say: "¿Tiene una talla más grande?", intent: "ask_have_size", step: "size" },
    { say: "¿La tiene en mediana?", intent: "ask_have_size", slots: { size: "mediana" } },
    { say: "No estoy segura de mi talla", intent: "size_unknown", step: "size" },
    { say: "¿Qué tallas tiene?", intent: "ask_sizes", step: "size" },
    { say: "Calzo del 26", intent: "shoe_size", step: "shoe", slots: { shoe: 26 } },
    { say: "Del 25, por favor", intent: "shoe_size", step: "shoe", slots: { shoe: 25 } },
    { say: "En Estados Unidos calzo 8", intent: "shoe_size", step: "shoe", slots: { shoe: 8 } },
    { say: "Calzo 39 europeo", intent: "shoe_size", step: "shoe", slots: { shoe: 39 } },
    { say: "Veinticinco y medio", intent: "shoe_size", step: "shoe", slots: { shoe: 25 } },
    { say: "En negro, por favor", intent: "color_ans", step: "color", slots: { color: "negro" } },
    { say: "La blanca", intent: "color_ans", step: "color", slots: { color: "blanco" } },
    { say: "¿Lo tiene en azul?", intent: "ask_have_color", slots: { color: "azul" } },
    { say: "¿Qué colores tiene?", intent: "ask_colors" },
    { say: "¿Me la puedo probar?", intent: "try_on", step: "tryon" },
    { say: "¿Puedo probarme el vestido?", intent: "try_on", step: "tryon" },
    { say: "¿Dónde están los probadores?", intent: "ask_fitting_room" },
    { say: "Me queda muy bien", intent: "fit_good" },
    { say: "Me queda un poco apretada", intent: "fit_bad" },
    { say: "Me quedan grandes", intent: "fit_bad" },
    { say: "No me queda", intent: "fit_unclear" },
    { say: "Me la llevo", intent: "take_it", step: "decide" },
    { say: "Me quedo con la azul", intent: "take_it", step: "decide" },
    { say: "Lo voy a pensar", intent: "think_about_it", step: "decide" },
    { say: "No es mi estilo", intent: "not_take", step: "decide" },
    { say: "Está un poco cara", intent: "too_expensive", step: "decide" },
    { say: "¿Cuánto cuesta?", intent: "ask_price" },
    { say: "¿Tiene descuento?", intent: "ask_sale" },
    { say: "¿Ya incluye IVA?", intent: "ask_tax" },
    { say: "¿Puedo cambiarlo si no me queda?", intent: "ask_return_policy", step: "decide" },
    { say: "Con tarjeta, por favor", intent: "pay_card", step: "pay" },
    { say: "Le pago en efectivo", intent: "pay_cash", step: "pay" },
    { say: "¿Aceptan Apple Pay?", intent: "pay_phone", step: "pay" },
    { say: "Aquí tiene", intent: "here_you_go", step: "pay" },
    { say: "Me lo llevo puesto", intent: "wear_it", step: "bag" },
    { say: "Es para regalo", intent: "gift_receipt", step: "bag" },
    { say: "Por correo, por favor", intent: "receipt_email", step: "receipt" },
    { say: "Impreso, por favor", intent: "receipt_bag", step: "receipt" },
    { say: "Ya estoy registrada", intent: "rewards_member", step: "rewards" },
    { say: "Quisiera devolver esta blusa", intent: "return_item", slots: { item: { clothing: "blusa" } } },
    { say: "¿Me la puede cambiar por una talla más grande?", intent: "exchange" },
    { say: "Sí, aquí está el ticket", intent: "receipt_yes", step: "r_receipt" },
    { say: "No traigo el ticket", intent: "receipt_none", step: "r_receipt" },
    { say: "Se destiñó en la lavadora", intent: "problem", step: "r_reason" },
    { say: "Cambié de opinión", intent: "problem", step: "r_reason" },
    { say: "¿Me puede devolver el dinero?", intent: "want_refund", step: "r_choice" },
    { say: "Saldo a favor está bien", intent: "want_credit", step: "r_choice" },
    // tú to staff, Spain forms (vosotros, Spain words, vale): understood
    { say: "¿Tienes vestidos?", intent: "looking_for" },
    { say: "¿Tenéis bañadores?", intent: "looking_for", slots: { item: { clothing: "traje" } } },
    { say: "Busco unas zapatillas blancas", intent: "looking_for", slots: { item: { clothing: "tenis", color: "blanco" } } },
    { say: "Vale, me lo llevo", intent: "take_it", step: "decide" },
    { say: "Busco unos vaqueros", intent: "looking_for", slots: { item: { clothing: "pantalon" } } },
    // never flip the meaning
    { say: "No me lo llevo", intent: "not_take", step: "decide", not: ["take_it"] },
    { say: "No me la quiero probar", intent: "no_try", step: "tryon", not: ["try_on"] },
    { say: "No traigo efectivo", intent: "no_cash", step: "pay", not: ["pay_cash"] },
    { say: "No con tarjeta, en efectivo", intent: "pay_cash", step: "pay", not: ["pay_card"] },
    { say: "No me gusta el color", intent: "dislike_color", step: "color", not: ["color_ans"] },
    { say: "El rojo no me gusta", intent: "dislike_color", step: "color", not: ["color_ans"] },
    { say: "No necesito bolsa", intent: "no_bag", step: "bag", not: ["want_bag"] },
    { say: "No quiero ticket de regalo", intent: "no_receipt", step: "receipt", not: ["gift_receipt"] },
    { say: "No quiero un reembolso", intent: "no_refund", step: "r_choice", not: ["want_refund"] },
    { say: "No tengo el ticket, lo perdí", intent: "receipt_none", step: "r_receipt", not: ["receipt_yes"] },
    { say: "No soy cliente frecuente", intent: "im_fine_ctx", step: "rewards", not: ["rewards_member"] },
    { say: "No me lo llevo puesto", intent: "none" },
    { say: "¿Me lo puede apartar?", intent: "hold_item", step: "decide", not: ["take_it"] },
    { say: "¿Aceptan dólares?", intent: "ask_dollars", step: "pay", not: ["pay_cash", "here_you_go"] },
    { say: "¿Y si pago con tarjeta?", intent: "pay_q", step: "pay", not: ["pay_card"] },
    { say: "Ya pagué", intent: "none" },
    { say: "Está chido", intent: "fit_good", not: ["fit_bad"] },
    { say: "Chica no, mediana", intent: "size_ans", step: "size", slots: { size: "mediana" } },
    { say: "No, nada", intent: "nothing_ctx", step: "r_reason" },
    { say: "No sé si me lo llevo", intent: "think_about_it", step: "decide", not: ["take_it"] },
    // review: the other way, corrections, price questions
    { say: "No quiero pagar con tarjeta", intent: "no_card", step: "pay", not: ["pay_card", "pay_cash"] },
    { say: "No quiero pagar con tarjeta, en efectivo", intent: "pay_cash", step: "pay", not: ["pay_card"] },
    { say: "No con efectivo", intent: "no_cash", step: "pay", not: ["pay_cash"] },
    { say: "Efectivo no, con tarjeta", intent: "pay_card", step: "pay", not: ["pay_cash"] },
    { say: "Tarjeta no, efectivo", intent: "pay_cash", step: "pay", not: ["pay_card"] },
    { say: "Le doy mil pesos", intent: "here_you_go", step: "pay" },
    { say: "¿Cuánto cuesta la bolsa?", intent: "bag_price", step: "bag", not: ["want_bag", "ask_price"] },
    { say: "No quiero un cambio, quiero mi dinero", intent: "want_refund", step: "r_choice", not: ["exchange"] },
    { say: "El dinero no, un cambio", intent: "exchange", step: "r_choice", not: ["want_refund"] },
    { say: "Mejor saldo a favor, no el dinero", intent: "want_credit", step: "r_choice", not: ["want_refund"] },
    { say: "¿Cuánto cuesta la grande?", intent: "ask_price", not: ["size_ans"] },
    { say: "No me la llevo todavía", intent: "think_about_it", step: "decide", not: ["take_it"] },
    { say: "No quiero comprarla", intent: "not_take", step: "decide", not: ["take_it"] },
    { say: "Sí, ¿por qué no?", intent: "why_not_ctx", step: "decide", not: ["not_take"] },
    { say: "No, no vengo a devolver nada", intent: "just_looking", not: ["return_item", "exchange"] },
    { say: "Sí, compré esta guayabera la semana pasada", intent: "return_item", slots: { item: { clothing: "guayabera" } } },
    { say: "¿Hay en azul?", intent: "ask_have_color", slots: { color: "azul" } },
    { say: "No me interesa", intent: "im_fine_ctx", step: "rewards", not: ["rewards_member"] },
    // not understood
    { say: "Mi perro come mucho", intent: "none" },
    { say: "El avión sale a las tres", intent: "none" },
    { say: "talla", intent: "none" },
  ],
  sims: [
    { name: "happy path: a guayabera, try on, buy", turns: ["¡Hola! Busco una guayabera.", "Mediana, por favor.", "Sí, por favor.", "Me queda muy bien.", "Me la llevo.", "Con tarjeta, por favor.", "Gracias, ¡adiós!"],
      expect: { complete: true, state: { item: { id: "guayabera", size: "mediana" }, paid: true } }, auto: AUTO, setup: (s) => { s.soldOut = false; } },
    { name: "questions, colors, a fit problem", turns: ["Hola, ¿la tiene en azul?", "Sí, en azul. Soy talla chica.", "Claro, ¿dónde están los probadores?", "Me queda un poco apretada.",
      "Me queda perfecto.", "¿Cuánto cuesta?", "¿Está en oferta?", "¿Ya incluye el IVA?", "Me la llevo.", "En efectivo.", "No, gracias, me la llevo puesta.", "¡Adiós!"],
      expect: { complete: true, state: { item: { id: "guayabera", color: "azul", size: "mediana" }, paid: true } }, auto: AUTO,
      setup: (s) => { s.askBag = true; s.soldOut = false; s.askRewards = false; } }, // "me la llevo puesta" answers the bag question
    { name: "sneakers in a US size", turns: ["Busco unos tenis.", "En Estados Unidos calzo 9.", "¿Me los puedo probar?", "No me quedan.", "Me quedan chicos.", "Me quedan muy bien.",
      "¿Cuánto cuestan?", "Me los llevo.", "¿Puedo pagar con tarjeta?", "Aquí tiene.", "Gracias, adiós."], expect: { complete: true, state: { item: { id: "tenis" }, paid: true } }, auto: AUTO,
      // "¿Puedo pagar con tarjeta?" at the loyalty-card question, before the total, on every seed
      setup: (s) => { s.askRewards = true; } },
    { name: "a return with the ticket: an exchange", turns: ["Hola, quisiera devolver esta guayabera.", "Sí, aquí está el ticket.", "Se destiñó en la lavadora.", "Prefiero un cambio.", "En azul, por favor.", "Gracias, ¡adiós!"],
      expect: { complete: true, state: { ret: { choice: "exchange", newColor: "azul" } } }, auto: AUTO, setup: (s) => { s.returnVisit = false; } },
    { name: "a return without the ticket: store credit", turns: ["Quiero devolver este pantalón.", "No traigo el ticket.", "Me queda grande.", "¿Me puede devolver el dinero?", "Saldo a favor está bien.", "No, gracias. ¡Adiós!"],
      expect: { complete: true, state: { ret: { choice: "credit", receipt: false } } }, auto: AUTO, setup: (s) => { s.returnVisit = false; } },
    { name: "returning customer (twist): an exchange for a bigger size", turns: ["Sí, quiero cambiar esta blusa.", "Sí, aquí lo tengo.", "Me queda chica.", "La grande, por favor.", "Muchas gracias."],
      expect: { complete: true, state: { ret: { choice: "exchange", newSize: "grande" } } }, auto: AUTO, setup: (s) => { s.returnVisit = true; } },
    { name: "just looking, then thinks it over", turns: ["Nada más estoy viendo, gracias.", "Bueno, ¿me enseña la guayabera del maniquí?", "Grande.", "No hace falta, ya sé mi talla.", "Lo voy a pensar.", "¡Adiós!"],
      expect: { complete: false, state: { decision: "think" } }, auto: { ...AUTO, color: "En beige, por favor.", tryon: "No, gracias." }, setup: (s) => { s.soldOut = false; s.returnVisit = false; } },
    { name: "the size is sold out (twist)", turns: ["Busco un vestido.", "Mediana.", "Sí, por favor.", "Me queda muy bien.", "Me lo llevo.", "En efectivo.", "Gracias, adiós."],
      expect: { complete: true, state: { item: { id: "vestido", size: "grande" }, paid: true } }, auto: { ...AUTO, color: "En rojo, por favor.", decide: "Me lo llevo." },
      setup: (s) => { s.soldOut = true; s.soldOutTry = true; s.askColor = false; s.lastOne = false; s.returnVisit = false; } },
    { name: "the size is sold out (twist): the other size brought, a color, then trying on", turns: ["Busco una falda.", "¿La tiene en grande?", "Sí, por favor.", "En negro.", "Sí, por favor.", "Me queda muy bien.", "Me la llevo.", "Con tarjeta.", "Gracias, adiós."],
      expect: { complete: true, state: { item: { id: "falda", size: "xg", color: "negro" }, paid: true } }, auto: AUTO,
      setup: (s) => { s.soldOut = true; s.soldOutTry = false; s.askColor = true; s.lastOne = false; s.returnVisit = false; s.askRewards = false; } },
    { name: "short answers", turns: ["Un short.", "Grande.", "Azul.", "No, gracias.", "Me los llevo.", "Efectivo.", "No.", "Adiós."],
      expect: { complete: true, state: { item: { id: "short", size: "grande", color: "azul" }, paid: true, bag: false } }, auto: AUTO,
      setup: (s) => { s.askColor = true; s.askBag = true; s.askReceipt = false; s.askRewards = false; s.soldOut = false; s.returnVisit = false; } },
    { name: "the other way: no card, then the money handed over", turns: ["Busco unos shorts.", "Mediana.", "Azul.", "No, gracias.", "¿Cuánto cuestan?", "Me los llevo.", "No quiero pagar con tarjeta.", "Aquí tiene.", "¿Cuánto cuesta la bolsa?", "No, gracias.", "Adiós."],
      expect: { complete: true, state: { item: { id: "short", size: "mediana", color: "azul" }, paid: true, payMethod: "cash", bag: false } }, auto: AUTO,
      setup: (s) => { s.askColor = true; s.askBag = true; s.askReceipt = false; s.askRewards = false; s.soldOut = false; s.returnVisit = false; } },
    { name: "not my style, nothing else", turns: ["Busco una falda.", "Chica.", "No, gracias.", "No es mi estilo.", "No, gracias.", "Adiós."],
      expect: { complete: false, state: { decision: "none" } }, auto: { ...AUTO, color: "En negro, por favor." }, setup: (s) => { s.soldOut = false; s.returnVisit = false; } },
  ],
};

// Per-garment copies of the hint groups the guide shows while one garment is in play, so the model answers say
// lo / la / los / las and agree with that garment ("decide_sandalias": "Me las llevo.").
const PER_ITEM = ["tryon_ans", "fit", "fit_which", "decide", "bag", "ret_start", "ret_reason"];
for (const gid of PER_ITEM) {
  const base = clothes.hints[gid];
  for (const e of CLOTHING) {
    const items = base.items.filter((it) => !it.only || it.only(e)).sort((a, b) => (ENTRY.get(a) ?? 0) - (ENTRY.get(b) ?? 0));
    clothes.hints[`${gid}_${e.id}`] = { ...base, examples: [e.id], items };
  }
}
// Colors: the model answers name colors this garment comes in ("color_guayabera": "En blanco, por favor.").
for (const e of CLOTHING) clothes.hints[`color_${e.id}`] = { ...clothes.hints.color, examples: colorsOf(e.id) };
function itemHint(gid: string, id?: string | null): string { return id && clothes.hints[`${gid}_${id}`] ? `${gid}_${id}` : gid; }

/** Re-state a step's question as an optional pending whose first suggestion uses the garment's hint group
 *  (the step's own suggestions stay as they are; yes/no and all intents behave exactly as for the step). */
function guideFor(c: Ctx, stepId: string, garment?: string | null, main?: Suggestion, rest?: Suggestion[]) {
  const st = clothes.steps.find((x) => x.id === stepId)!;
  const stSuggest = st.suggest as Suggestion[]; // these steps' suggestions are fixed lists
  const first = main ?? stSuggest[0];
  const hint = main ? first.hint! : itemHint(first.hint!, garment);
  const others = rest ?? stSuggest.slice(1);
  const all = [hint, ...others.map((x) => x.hint!), ...(st.hints ?? stSuggest.map((x) => x.hint!))];
  c.expect({ id: stepId, optional: true, expects: st.expects, yes: st.yes, no: st.no, on: {},
    suggest: [{ lt: first.lt, hint, options: first.options }, ...others],
    hints: [...new Set(all.filter((h) => h === hint || h !== stSuggest[0].hint || !hint.startsWith(h + "_")))] });
}

function exchangeTo(c: Ctx, o: { size?: string; color?: string; shoe?: number; half?: boolean; from?: "us" | "eu"; dir?: "up" | "down" }) {
  const r = ret(c);
  r.choice = "exchange";
  const id = r.item.id;
  if (!r.reason && (o.dir || o.size || o.shoe != null)) r.reason = o.dir ?? "nofit";
  if (!r.reason && o.color) r.reason = "dislike";
  if (o.dir && !oneSize(id)) {
    if (isShoe(id)) { r.newShoe = (r.item.shoe ?? 25) + (o.dir === "up" ? 1 : -1); }
    else {
      const i = SIZE_ORDER.indexOf(r.item.size ?? "mediana");
      r.newSize = SIZE_ORDER[Math.max(0, Math.min(SIZE_ORDER.length - 1, i + (o.dir === "up" ? 1 : -1)))];
    }
  }
  if (o.size && !isShoe(id) && !oneSize(id)) r.newSize = o.size;
  if (o.shoe != null && isShoe(id)) {
    const src = o.from ?? (o.shoe >= 33 ? "eu" : o.shoe <= 15 ? "us" : undefined);
    r.newShoe = src ? toMx(c, o.shoe, !!o.half, src).n : o.shoe;
  }
  if (o.color) {
    if (colorsOf(id).includes(o.color)) r.newColor = o.color;
    else { c.say("color_no", { C: o.color }); sayColors(c, r.item); c.hold(); }
  }
}

/** The garment is paid for and the learner's: at the end, or on "Gracias, adiós" right after paying. */
function bought(c: Ctx) {
  if (c.s.boughtDone) return;
  c.s.boughtDone = true;
  const g = cur(c)!;
  c.complete();
  c.remember({ lastBought: { ...g, paid: priceOf(c, g) } });
  c.event("give", { item: g.id });
}

/** "¿Quiere registrarse?" (the loyalty card: free). */
function rewardsJoin(): Pending {
  return { id: "rewards_join", hints: ["g_yesno"], suggest: [{ lt: "Answer yes or no", hint: "g_yesno" }], expects: ["why_not_ctx", "im_fine_ctx", "ask_price"],
    on: {
      why_not_ctx: (cc) => { cc.s.rewards = true; cc.say("rewards_yes"); },
      im_fine_ctx: (cc) => { cc.s.rewards = false; cc.say("rewards_no"); },
      // "¿Cuánto cuesta?" here asks about signing up, not the garment
      ask_price: (cc) => { cc.say("rewards_free"); cc.expect(rewardsJoin()); },
    },
    yes: (cc) => { cc.s.rewards = true; cc.say("rewards_yes"); },
    no: (cc) => { cc.s.rewards = false; cc.say("rewards_no"); },
    ask: (cc) => cc.say("rewards_offer") };
}

function closing(c: Ctx) {
  c.expect({ id: "closing", optional: true, hints: ["g_social"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }],
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
