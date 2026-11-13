// How the practised language builds a noun phrase for an entity and says a value, and how the learner's language
// glosses them: used by the composer (compose.ts). This is the English edition: English noun phrases ("a large
// latte", articles a/an/the/some) glossed in Lithuanian with its cases and agreement, dollars and English clock
// times. The Spanish edition has its own file with the same exports (src/editions/es/convo/target.ts).

import type { EntityDef } from "../content/types";
import { agree, parseForms, caseIndex, type Case } from "./lt-morph";
import type { EntityLookup, NpBinding } from "./compose";

/** The units of a noun phrase: the practised language (`en`), the gloss (`lt`), the natural gloss (`natLt`). */
export interface NpParts { en: string[]; lt: string[]; natLt: string[]; flags: Record<number, string> }

/** A gloss placeholder: {X:acc}, {X.np:gen} (the case says how the Lithuanian declines). */
export const PH_LT = /\{([A-Za-z_]\w*)(?:\.(np|the|pl|bare))?:(nom|gen|dat|acc|ins|loc)\}/;
/** Agreement written into the practised language's text (the Spanish edition's {frío@X}): none in English. */
export const PH_AGREE_TARGET = /(?!)/g;
/** Agreement in the gloss: {puikus@X:nom}, {puikus@X:nom:pl}. */
export const PH_AGREE = /\{([a-ząčęėįšųūž]+)@([A-Za-z_]\w*):(nom|gen|dat|acc|ins|loc)(?::(pl))?\}/g;

export const splitUnits = (s: string) => s.split(" | ").map((x) => x.trim());

function vowelSound(word: string): boolean {
  const w = word.toLowerCase();
  if (/^(hour|honest|honor|heir)/.test(w)) return true;
  if (/^(uni|use|usu|uti|eu|one|once|ewe|ure)/.test(w)) return false;
  if (/^[aeiou]/.test(w)) return true;
  if (/^(fbi|mri|x-ray|sms|mba)/.test(w)) return true;
  return false;
}

/** Build the units of a noun phrase for entity binding b in the given Lithuanian case. */
export function npUnits(b: NpBinding, kind: "np" | "the" | "pl" | "bare" | "head", c: Case, look: EntityLookup, fem = false): NpParts {
  const base = look(b.id);
  if (!base) throw new Error(`Unknown entity "${b.id}"`);
  const e = entityForPlayer(base, fem);
  const plural = kind === "pl" || (b.qty ?? 1) > 1;
  const headEn = splitUnits(plural && e.pl ? e.pl : e.en);
  const headLtSpec = splitUnits(plural && e.ltPl ? e.ltPl : e.lt);
  if (headEn.length !== headLtSpec.length) throw new Error(`Entity ${e.id}: EN and LT unit counts differ`);
  const en: string[] = [], lt: string[] = [], natLt: string[] = [];
  const flags: Record<number, string> = {};
  let caseUsed = c;
  const mods = (b.mods || []).map((m) => look(m)).filter(Boolean) as EntityDef[];
  const firstWord = (mods[0] ? splitUnits(mods[0].en)[0] : headEn[0]) || "";
  if (kind === "np") {
    // A plural binding cannot take a singular article. Explicit bare/mass articles still apply.
    const requestedArt = e.art ?? (plural ? "some" : vowelSound(firstWord) ? "an" : "a");
    const art = plural && (requestedArt === "a" || requestedArt === "an") ? "some" : requestedArt;
    const artUsed = art === "a" || art === "an" ? (vowelSound(firstWord) ? "an" : "a") : art;
    if (artUsed === "some") {
      en.push("some"); lt.push("—");
      flags[0] = "Partitive: the Lithuanian genitive ending carries “some”.";
      if (c === "acc" || c === "nom") caseUsed = "gen";
    } else if (artUsed) { en.push(artUsed); lt.push("—"); }
  } else if (kind === "the") {
    // A proper name such as The Pier already carries its article.
    if (!/^the(?:\s|$)/i.test(headEn[0])) { en.push("the"); lt.push("—"); }
  }
  for (const m of mods) {
    const mEn = splitUnits(m.en), mLt = splitUnits(m.lt);
    if (mEn.length !== mLt.length) throw new Error(`Entity ${m.id}: EN and LT unit counts differ`);
    const lemma = parseForms(mLt.at(-1)!)[0];
    mEn.forEach((w, i) => {
      en.push(w);
      // only the last unit agrees with the noun ("tamsiai | mėlyną"); the others keep their own form
      const form = i === mEn.length - 1 ? agree(lemma, e.g, caseUsed, plural && !!e.ltPl) : parseForms(mLt[i])[0];
      lt.push(form); natLt.push(form);
    });
  }
  headEn.forEach((w, i) => {
    en.push(w);
    const form = parseForms(headLtSpec[i])[caseIndex(caseUsed)];
    lt.push(form); natLt.push(form);
  });
  return { en, lt, natLt, flags };
}

/** Entities that describe the player (e.g. jobs) may carry feminine forms (`ltF`), used for a
 *  female player: "Aš esu slaugytoja". The addressee of NPC lines and the speaker of hints is the player. */
export function entityForPlayer(e: EntityDef, fem: boolean): EntityDef {
  if (!fem || !e.ltF) return e;
  return { ...e, lt: e.ltF, ltPl: e.ltPlF ?? e.ltPl, g: e.gF ?? "f" };
}

/** Agreement with an entity in the gloss: {puikus@X:nom} → "puiki" for a feminine X. */
export const agreeGloss = (lemma: string, e: EntityDef, c: Case, plural: boolean) => agree(lemma, e.g, c, plural);

/** Choices written into the practised language's text (the Spanish edition's {m:…|f:…}, {u:…|t:…}): none in English. */
export const resolveTarget = (s: string, _o: { player: "m" | "f"; speaker: "m" | "f"; formal: boolean }) => s;
/** Units joined after composing (the Spanish edition's "a" + "el" → "al"): none in English. */
export const joinUnits = <U extends { en: string; lt: string; flag?: string }>(units: U[]): U[] => units;
/** The same in the spoken text: none in English. */
export const joinText = (s: string) => s;
/** Agreement written into the practised language's text (the Spanish edition's {frío@X}): none in English. */
export const agreeTarget = (s: string, _bind: (name: string) => { e: EntityDef; plural: boolean } | null) => s;

/** How a hint example binds the item it is about (suggest.ts composeFull): English binds the bare id. */
export const hintBinding = (_e: EntityDef | undefined, id: string): string | NpBinding => id;

// ---------------------------------------------------------------------------
// Values

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENSW = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
export function numberWords(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return TENSW[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "");
  if (n < 1000) return ONES[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + numberWords(n % 100) : "");
  if (n < 10000) return numberWords(Math.floor(n / 1000)) + " thousand" + (n % 1000 ? " " + numberWords(n % 1000) : "");
  return String(n);
}
export function priceEn(cents: number): string {
  const d = Math.floor(cents / 100), c = cents % 100;
  return c ? `$${d}.${String(c).padStart(2, "0")}` : `$${d}`;
}
export function priceSay(cents: number): string {
  const d = Math.floor(cents / 100), c = cents % 100;
  if (d === 0) return `${numberWords(c)} cents`;
  if (!c) return `${numberWords(d)} ${d === 1 ? "dollar" : "dollars"}`;
  return `${numberWords(d)} ${c < 10 ? "oh " + numberWords(c) : numberWords(c)}`;
}
export function priceLt(cents: number): string {
  const d = Math.floor(cents / 100), c = cents % 100;
  return c ? `${d},${String(c).padStart(2, "0")} $` : `${d} $`;
}
export function timeEn(t: { h: number; m: number }): string { return `${t.h}:${String(t.m).padStart(2, "0")}`; }
export function timeSay(t: { h: number; m: number }): string {
  const h = t.h > 12 ? t.h - 12 : t.h === 0 ? 12 : t.h;
  if (t.m === 0) return `${numberWords(h)} o'clock`;
  if (t.m === 30) return `${numberWords(h)} thirty`;
  return `${numberWords(h)} ${t.m < 10 ? "oh " + numberWords(t.m) : numberWords(t.m)}`;
}

/** A value ({$price}, {$time}, {$num}, {$letters}…) in the practised language, the gloss and the spoken form. */
export function valueDisplay(kind: string, v: any, _c?: Case): { en: string; lt: string; say: string } {
  if (v == null) return { en: "…", lt: "…", say: "" };
  if (kind === "price" || kind === "total" || kind === "amount" || kind === "fare" || kind === "rent" || kind === "deposit") {
    return { en: priceEn(v), lt: priceLt(v), say: priceSay(v) };
  }
  if (kind === "time" || kind.endsWith("Time")) return { en: timeEn(v), lt: timeEn(v), say: timeSay(v) };
  if (kind === "letters" || kind === "spelled") {
    const up = String(v).toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Z0-9]/g, "").split(""); // codes like MHR-47219 keep their digits
    return { en: up.join("-"), lt: up.join("-"), say: up.join(", ") };
  }
  if (typeof v === "number") return { en: String(v), lt: String(v), say: numberWords(v) };
  if (typeof v === "object" && "en" in v) return { en: v.en, lt: v.lt ?? v.en, say: v.say ?? v.en };
  return { en: String(v), lt: String(v), say: String(v) };
}
