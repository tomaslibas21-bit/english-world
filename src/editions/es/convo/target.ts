// Spanish noun phrases and values, glossed in English: replaces src/convo/target.ts in the Spanish edition
// (docs/es/EDITIONS.md, docs/es/STYLE.md "Placeholders").
//
// Entities (the `ent()` helper): `en` is the Spanish head ("café | americano"), `pl` its plural, `g` its Spanish gender
// (it chooses un/una, el/la and the agreement), `lt` the English gloss ("coffee | americano" — one form, English
// doesn't decline), `ltPl` the plural gloss. `art` overrides the indefinite article ("" for a mass noun: "leche"),
// `def` the definite one ("el agua"). A modifier (size, temperature) follows the noun ("un latte grande"), unless it
// has `attrs.pre`; a one-word modifier agrees ("una horchata chica"), a phrase doesn't ("con hielo").
// In the Spanish text: {m:listo|f:lista} (the learner's gender), {sm:…|sf:…} (the speaker's), {u:usted form|t:tú
// form} (how the NPC addresses the learner), {frío@X} (agrees with the entity bound to X: frío/fría/fríos/frías).

import type { EntityDef } from "../../../content/types";
import type { Case } from "../../../convo/lt-morph";
import type { EntityLookup, NpBinding } from "../../../convo/compose";
// (compose imports this file too; `variety` is only read when a line is composed, after both have loaded)
import { variety } from "../../../convo/compose";

export interface NpParts { en: string[]; lt: string[]; natLt: string[]; flags: Record<number, string> }

/** A gloss placeholder: {X}, {X.np} (a case may be written but means nothing in English). */
export const PH_LT = /\{([A-Za-z_]\w*)(?:\.(np|the|pl|bare))?(?::(nom|gen|dat|acc|ins|loc))?\}/;
/** No agreement in the English gloss. */
export const PH_AGREE = /(?!)/g;
/** Agreement in the Spanish text: {frío@X}, {lo@X}, {frío@X:pl}. */
export const PH_AGREE_TARGET = /\{([a-záéíóúñü]+)@([A-Za-z_]\w*)(?::(pl))?\}/g;

export const splitUnits = (s: string) => s.split(" | ").map((x) => x.trim());

const IRREGULAR: Record<string, [string, string, string]> = {
  // masculine singular → [feminine, masculine plural, feminine plural]
  el: ["la", "los", "las"], un: ["una", "unos", "unas"], uno: ["una", "unos", "unas"], lo: ["la", "los", "las"],
  este: ["esta", "estos", "estas"], ese: ["esa", "esos", "esas"], aquel: ["aquella", "aquellos", "aquellas"],
  ningun: ["ninguna", "ningunos", "ningunas"], ningún: ["ninguna", "ningunos", "ningunas"], algun: ["alguna", "algunos", "algunas"],
  algún: ["alguna", "algunos", "algunas"], buen: ["buena", "buenos", "buenas"], mal: ["mala", "malos", "malas"],
};
const unaccent = (s: string) => s.replace(/[áéíóú](?=[nsl]?$)/, (c) => "aeiou"["áéíóú".indexOf(c)]);

/** A Spanish plural: café → cafés, pan → panes, luz → luces, limón → limones, martes → martes. */
export function pluralEs(w: string): string {
  if (/[aeiouáéó]$/.test(w)) return w + "s";
  if (/[íú]$/.test(w)) return w + "es";
  if (/z$/.test(w)) return w.slice(0, -1) + "ces";
  if (/[sx]$/.test(w) && !/[áéíóú][sx]$/.test(w) && w.length > 3) return w;
  return unaccent(w) + "es";
}

/** A Spanish adjective or determiner agreeing with a noun's gender and number: frío → fría / fríos / frías,
 *  trabajador → trabajadora, grande → grandes, el → la / los / las. */
export function agreeEs(lemma: string, g: "m" | "f", plural: boolean): string {
  const irr = IRREGULAR[lemma];
  if (irr) return g === "f" ? (plural ? irr[2] : irr[0]) : plural ? irr[1] : lemma;
  let w = lemma;
  if (g === "f") {
    if (/o$/.test(w)) w = w.slice(0, -1) + "a";
    else if (/(or|ón|án|és|ín)$/.test(w)) w = unaccent(w) + "a";
  }
  return plural ? pluralEs(w) : w;
}

const vowelSound = (w: string) => /^[aeiou]/i.test(w) && !/^(uni|use|usu|uti|eu|one|once)/i.test(w) || /^(hour|honest|honor|heir)/i.test(w);
const glossArticle = (next: string) => (vowelSound(next) ? "an" : "a");

/** The units of a Spanish noun phrase and its English gloss. Interlinear order follows the Spanish ("un | latte |
 *  grande" – "a | latte | large"); the natural gloss is English ("a large latte"). */
export function npUnits(b: NpBinding, kind: "np" | "the" | "pl" | "bare" | "head", _c: Case | undefined, look: EntityLookup, fem = false): NpParts {
  const base = look(b.id);
  if (!base) throw new Error(`Unknown entity "${b.id}"`);
  const e = neutralNoun(entityForPlayer(base, fem), fem && !!base.enF);
  const qty = b.qty ?? 1;
  const plural = kind === "pl" || qty > 1;
  const head = splitUnits(plural ? e.pl ?? splitUnits(e.en).map((w, i, a) => (i === a.length - 1 || a.length === 1 ? pluralEs(w) : w)).join(" | ") : e.en);
  // the gloss: the last unit carries the English plural ("iced | coffee" → "iced | coffees")
  const headG = splitUnits(plural ? e.ltPl ?? splitUnits(e.lt).map((w, i, a) => (i === a.length - 1 ? w + (/(s|x|ch|sh)$/.test(w) ? "es" : "s") : w)).join(" | ") : e.lt);
  if (head.length !== headG.length) throw new Error(`Entity ${e.id}: Spanish and English unit counts differ`);
  const g = e.g === "f" ? "f" : "m";
  const mods = (b.mods || []).map((m) => look(m)).filter(Boolean) as EntityDef[];
  const modUnits = (m: EntityDef) => {
    const t = splitUnits(m.en), gl = splitUnits(m.lt);
    if (t.length !== gl.length) throw new Error(`Entity ${m.id}: Spanish and English unit counts differ`);
    // a one-word modifier agrees with the noun; a phrase ("con hielo") stays as it is
    return { t: t.length === 1 ? [agreeEs(t[0], g, plural)] : t, gl };
  };
  const pre = mods.filter((m) => m.attrs?.pre), post = mods.filter((m) => !m.attrs?.pre);
  const en: string[] = [], lt: string[] = [];
  const flags: Record<number, string> = {};
  // the article
  let art = "", artG = "";
  const firstGloss = (pre[0] ? splitUnits(pre[0].lt)[0] : headG[0]) || "";
  if (kind === "np") {
    if (qty > 1) { art = numberWords(qty, g); artG = numberWordsEn(qty); }
    else if (plural) { art = g === "f" ? "unas" : "unos"; artG = "some"; }
    else if (e.art !== "") { art = e.art ?? (g === "f" ? "una" : "un"); artG = glossArticle(firstGloss); }
  } else if (kind === "the") {
    art = plural ? (g === "f" ? "las" : "los") : e.def ?? (g === "f" ? "la" : "el");
    // a name said without an article (`def: ""`) gets none in English either; `attrs.nat` may carry one
    artG = art ? "the" : "";
  }
  if (art) { en.push(art); lt.push(artG); }
  for (const m of pre) { const u = modUnits(m); en.push(...u.t); lt.push(...u.gl); }
  head.forEach((w, i) => { en.push(w); lt.push(headG[i]); });
  for (const m of post) { const u = modUnits(m); en.push(...u.t); lt.push(...u.gl); }
  // natural English: one-word modifiers before the noun ("a large iced latte"), phrases after it ("… with ice")
  const adj = mods.filter((m) => splitUnits(m.lt).length === 1).map((m) => m.lt);
  const phrases = mods.filter((m) => splitUnits(m.lt).length > 1).map((m) => splitUnits(m.lt).join(" "));
  // an entity may give its natural English name ("agua | de | jamaica" → "hibiscus water"): attrs.nat / attrs.natPl
  const natHead = (plural ? e.attrs?.natPl : e.attrs?.nat) as string | undefined;
  const core = [...adj, natHead ?? headG.join(" "), ...phrases];
  let natArt = artG;
  if (kind === "np" && !plural && art && artG !== "some") natArt = glossArticle(core[0] ?? "");
  const natLt = [...(natArt ? [natArt] : []), ...core];
  return { en, lt, natLt, flags };
}

/** The neutral Latin American text names a thing with the entity's `attrs.neutral` noun where the Mexican one is
 *  Mexican-only ("tomate" for "jitomate", "camiseta" for "playera", "billetera" for "cartera"): its plural
 *  `attrs.neutralPl` (else the regular one), its gender `attrs.neutralG` (else the head's; it picks the article and the
 *  agreement). The English gloss stays. For a learner's feminine form (`enF`), `attrs.neutralF` (else none). */
export function neutralNoun(e: EntityDef, feminineForm = false): EntityDef {
  const a = e.attrs as Record<string, unknown> | undefined;
  const n = (feminineForm ? a?.neutralF : a?.neutral) as string | undefined;
  if (!n || variety() !== "neutral") return e;
  const g = (a?.neutralG as "m" | "f" | undefined) ?? e.g;
  return { ...e, en: n, pl: a?.neutralPl as string | undefined, g };
}

/** Entities that describe the player (jobs, nationalities) may carry Spanish feminine forms (`enF`, `plF`, `gF`),
 *  used for a female player: "Soy enfermera". */
export function entityForPlayer(e: EntityDef, fem: boolean): EntityDef {
  if (!fem || !e.enF) return e;
  return { ...e, en: e.enF, pl: e.plF ?? e.pl, g: e.gF ?? "f" };
}

/** "a" + "el" → "al", "de" + "el" → "del" (the article comes from a placeholder: "a {X.the}" → "al centro"). */
export function joinUnits<U extends { en: string; lt: string; flag?: string }>(units: U[]): U[] {
  const out: U[] = [];
  for (const u of units) {
    const prev = out[out.length - 1];
    const m = prev && /^([¿¡"“(]*)(a|de)$/i.exec(prev.en);
    if (m && /^el$/i.test(u.en.replace(/[.,!?;:)…]+$/, ""))) {
      const tail = u.en.slice(2);
      out[out.length - 1] = { ...prev, en: m[1] + m[2] + "l" + tail, lt: `${prev.lt} ${u.lt}` };
      continue;
    }
    out.push(u);
  }
  return out;
}

/** The same in the spoken text ("él" with its accent is never touched). */
export const joinText = (s: string) => s.replace(/(^|[\s¿¡"“(])(a|de) el\b/gi, (_m, pre: string, p: string) => `${pre}${p}l`);

/** English glosses don't agree. */
export const agreeGloss = (lemma: string, _e: EntityDef, _c: Case, _plural: boolean) => lemma;

/** {m:…|f:…} for the learner's gender, {sm:…|sf:…} for the speaker's, {u:…|t:…} for usted or tú. */
export const resolveTarget = (s: string, o: { player: "m" | "f"; speaker: "m" | "f"; formal: boolean }) => s
  .replace(/\{sm:([^|}]*)\|sf:([^}]*)\}/g, (_m, a, b) => (o.speaker === "m" ? a : b))
  .replace(/\{u:([^|}]*)\|t:([^}]*)\}/g, (_m, a, b) => (o.formal ? a : b))
  .replace(/\{m:([^|}]*)\|f:([^}]*)\}/g, (_m, a, b) => (o.player === "m" ? a : b));

/** How a hint example binds the item it is about (suggest.ts composeFull): an item always said in the plural
 *  (attrs.plural: "los papadzules", "los reportes de errores", "las facturas") with two, as the conversations bind it
 *  in their lines (s73 B(), s34/s89 taskVar(), p18 tv()), so the example agrees ("Estoy hasta el cuello con los
 *  reportes de errores", not "con el reporte"); every other item as its bare id. */
export const hintBinding = (e: EntityDef | undefined, id: string): string | NpBinding => (e?.attrs?.plural ? { id, qty: 2 } : id);

/** {frío@X} → the form agreeing with the entity bound to X. */
export const agreeTarget = (s: string, bind: (name: string) => { e: EntityDef; plural: boolean } | null) =>
  s.replace(PH_AGREE_TARGET, (_m, lemma: string, name: string, pl?: string) => {
    const r = bind(name);
    return r ? agreeEs(lemma, neutralNoun(r.e).g === "f" ? "f" : "m", !!pl || r.plural) : lemma;
  });

// ---------------------------------------------------------------------------
// Values

const UNIT = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce",
  "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro",
  "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
const TENS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const HUND = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

/** Spanish number words. `g`: before a masculine noun "un", "veintiún"; before a feminine one "una", "doscientas". */
export function numberWords(n: number, g?: "m" | "f"): string {
  const one = (u: number) => (u === 1 ? (g === "m" ? "un" : g === "f" ? "una" : "uno") : UNIT[u]);
  if (n < 30) return n === 1 ? one(1) : n === 21 ? (g === "m" ? "veintiún" : g === "f" ? "veintiuna" : "veintiuno") : UNIT[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? " y " + one(n % 10) : "");
  if (n === 100) return "cien";
  if (n < 1000) {
    let h = HUND[Math.floor(n / 100)];
    if (g === "f" && n >= 200) h = h.replace(/ientos$/, "ientas");
    return h + (n % 100 ? " " + numberWords(n % 100, g) : "");
  }
  if (n < 1000000) {
    const th = Math.floor(n / 1000);
    return (th === 1 ? "mil" : numberWords(th, g ?? "m") + " mil") + (n % 1000 ? " " + numberWords(n % 1000, g) : "");
  }
  return String(n);
}
const EN_ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const numberWordsEn = (n: number) => EN_ONES[n] ?? String(n);

const thousands = (d: number) => String(d).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
/** "$85", "$85.50", "$1,250": pesos as Mexico writes them. */
export function priceEn(cents: number): string {
  const d = Math.floor(cents / 100), c = cents % 100;
  return c ? `$${thousands(d)}.${String(c).padStart(2, "0")}` : `$${thousands(d)}`;
}
/** "ochenta y cinco pesos", "un peso", "veintiún pesos", "ochenta y cinco pesos con cincuenta centavos". */
export function priceSay(cents: number): string {
  const d = Math.floor(cents / 100), c = cents % 100;
  if (d === 0) return `${numberWords(c, "m")} ${c === 1 ? "centavo" : "centavos"}`;
  const p = `${numberWords(d, "m")} ${d === 1 ? "peso" : "pesos"}`;
  return c ? `${p} con ${numberWords(c, "m")} ${c === 1 ? "centavo" : "centavos"}` : p;
}
/** The gloss: "85 pesos", "85.50 pesos". */
export function priceLt(cents: number): string {
  const d = Math.floor(cents / 100), c = cents % 100;
  return c ? `${thousands(d)}.${String(c).padStart(2, "0")} pesos` : `${thousands(d)} ${d === 1 ? "peso" : "pesos"}`;
}
export function timeEn(t: { h: number; m: number }): string { return `${t.h}:${String(t.m).padStart(2, "0")}`; }
/** "las ocho y media", "la una", "las tres y cuarto", "cuarto para las nueve", "las siete y diez" (12-hour, as said). */
export function timeSay(t: { h: number; m: number }): string {
  const h12 = (h: number) => (h % 12 === 0 ? 12 : h % 12);
  const hour = (h: number) => (h12(h) === 1 ? "la una" : `las ${numberWords(h12(h))}`);
  if (t.m === 0) return hour(t.h);
  if (t.m === 15) return `${hour(t.h)} y cuarto`;
  if (t.m === 30) return `${hour(t.h)} y media`;
  if (t.m === 45) return `cuarto para ${hour(t.h + 1)}`;
  return `${hour(t.h)} y ${numberWords(t.m)}`;
}
/** Letter names as Mexico spells a word out: B "be grande" and V "ve chica" (to tell them apart), Y "i griega" (never
 *  Spain's "uve", "ye"). The neutral Latin American text says "be larga" and "ve corta". */
const LETTER_SAY: Record<string, string> = {
  A: "a", B: "be grande", C: "ce", D: "de", E: "e", F: "efe", G: "ge", H: "hache", I: "i", J: "jota", K: "ka", L: "ele", M: "eme", N: "ene",
  Ñ: "eñe", O: "o", P: "pe", Q: "cu", R: "erre", S: "ese", T: "te", U: "u", V: "ve chica", W: "doble ve", X: "equis", Y: "i griega", Z: "zeta",
};
const LETTER_SAY_NEUTRAL: Record<string, string> = { ...LETTER_SAY, B: "be larga", V: "ve corta" };

/** A value in the Spanish text, the English gloss and the spoken Spanish. `{$time}` carries its article: "las 8:30". */
export function valueDisplay(kind: string, v: any): { en: string; lt: string; say: string } {
  if (v == null) return { en: "…", lt: "…", say: "" };
  if (kind === "price" || kind === "total" || kind === "amount" || kind === "fare" || kind === "rent" || kind === "deposit") {
    return { en: priceEn(v), lt: priceLt(v), say: priceSay(v) };
  }
  if (kind === "time" || kind.endsWith("Time")) {
    const h12 = v.h % 12 === 0 ? 12 : v.h % 12;
    return { en: `${h12 === 1 ? "la" : "las"} ${timeEn({ h: h12, m: v.m })}`, lt: timeEn({ h: h12, m: v.m }), say: timeSay(v) };
  }
  if (kind === "letters" || kind === "spelled") {
    const up = String(v).toUpperCase().replace(/Ñ/g, "\u0001").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\u0001/g, "Ñ").replace(/[^A-Z0-9Ñ]/g, "").split("");
    const names = variety() === "neutral" ? LETTER_SAY_NEUTRAL : LETTER_SAY;
    return { en: up.join("-"), lt: up.join("-"), say: up.map((c) => names[c] ?? numberWords(Number(c))).join(", ") };
  }
  if (typeof v === "number") return { en: String(v), lt: String(v), say: numberWords(v) };
  if (typeof v === "object" && "en" in v) return { en: v.en, lt: v.lt ?? v.en, say: v.say ?? v.en };
  return { en: String(v), lt: String(v), say: String(v) };
}
