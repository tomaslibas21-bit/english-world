// Interlinear composer: turns an authored sentence (with placeholders) into concrete
// units {en, lt} plus clean English, natural Lithuanian and the spoken form.
// Used at runtime and by the build tools (audio/IPA enumeration, validation).

import type { EntityDef, SentSrc } from "../content/types";
import { agree, genderChoice, parseForms, caseIndex, type Case, type Gender } from "./lt-morph";

export interface Unit { en: string; lt: string; flag?: string }
export interface Sentence { units: Unit[]; en: string; nat: string; say: string }

export interface NpBinding { id: string; mods?: string[]; qty?: number }
export type Vars = Record<string, any>;
export type EntityLookup = (id: string) => EntityDef | undefined;

const PH_EN = /^(.*?)\{([A-Za-z_]\w*)(?:\.(np|the|pl|bare))?\}(.*)$/;
const PH_LT = /\{([A-Za-z_]\w*)(?:\.(np|the|pl|bare))?:(nom|gen|dat|acc|ins|loc)\}/;
const PH_AGREE = /\{([a-ząčęėįšųūž]+)@([A-Za-z_]\w*):(nom|gen|dat|acc|ins|loc)(?::(pl))?\}/g;
const PH_VAL = /\{\$([a-zA-Z_]\w*)\}/g;

export const splitUnits = (s: string) => s.split(" | ").map((x) => x.trim());

function binding(vars: Vars, name: string): NpBinding | null {
  const v = vars[name];
  if (v == null) return null;
  if (typeof v === "string") return { id: v };
  return v as NpBinding;
}

function vowelSound(word: string): boolean {
  const w = word.toLowerCase();
  if (/^(hour|honest|honor|heir)/.test(w)) return true;
  if (/^(uni|use|usu|uti|eu|one|once|ewe|ure)/.test(w)) return false;
  if (/^[aeiou]/.test(w)) return true;
  if (/^(fbi|mri|x-ray|sms|mba)/.test(w)) return true;
  return false;
}

interface NpParts { en: string[]; lt: string[]; natLt: string[]; flags: Record<number, string> }

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
    const art = e.art ?? (vowelSound(firstWord) ? "an" : "a");
    const artUsed = art === "a" || art === "an" ? (vowelSound(firstWord) ? "an" : "a") : art;
    if (artUsed === "some") {
      en.push("some"); lt.push("—");
      flags[0] = "Partitive: the Lithuanian genitive ending carries “some”.";
      if (c === "acc" || c === "nom") caseUsed = "gen";
    } else if (artUsed) { en.push(artUsed); lt.push("—"); }
  } else if (kind === "the") {
    en.push("the"); lt.push("—");
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

function valueDisplay(kind: string, v: any): { en: string; lt: string; say: string } {
  if (v == null) return { en: "…", lt: "…", say: "" };
  if (kind === "price" || kind === "total" || kind === "amount" || kind === "fare" || kind === "rent" || kind === "deposit") {
    return { en: priceEn(v), lt: priceLt(v), say: priceSay(v) };
  }
  if (kind === "time" || kind.endsWith("Time")) return { en: timeEn(v), lt: timeEn(v), say: timeSay(v) };
  if (kind === "letters" || kind === "spelled") {
    const up = String(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "").split(""); // codes like MHR-47219 keep their digits
    return { en: up.join("-"), lt: up.join("-"), say: up.join(", ") };
  }
  if (typeof v === "number") return { en: String(v), lt: String(v), say: numberWords(v) };
  if (typeof v === "object" && "en" in v) return { en: v.en, lt: v.lt ?? v.en, say: v.say ?? v.en };
  return { en: String(v), lt: String(v), say: String(v) };
}

// ---------------------------------------------------------------------------

export interface ComposeOpts { look: EntityLookup; addressee?: Gender; speaker?: Gender; /** jūs (true, default) or tu (false) */ formal?: boolean }

/** Compose a concrete sentence. Throws on authoring errors (validated at build time). */
export function compose(src: SentSrc, vars: Vars, opts: ComposeOpts): Sentence {
  const g = opts.addressee ?? "m";
  const sp = opts.speaker ?? "f";
  const formal = opts.formal ?? true;
  const resolveGender = (s: string) => genderChoice(
    s.replace(/\{sm:([^|}]*)\|sf:([^}]*)\}/g, (_m, a, b) => (sp === "m" ? a : b))
     .replace(/\{j:([^|}]*)\|t:([^}]*)\}/g, (_m, a, b) => (formal ? a : b)), g);
  const enU = splitUnits(src.en);
  const ltU = splitUnits(resolveGender(src.lt));
  if (enU.length !== ltU.length) throw new Error(`Unit count differs (EN ${enU.length}, LT ${ltU.length}): ${src.en}`);
  const units: Unit[] = [];
  const sayParts: string[] = [];

  const agreeIn = (s: string) => s.replace(PH_AGREE, (_m, lemma: string, name: string, c: Case, pl?: string) => {
    const b = binding(vars, name);
    const e0 = b ? opts.look(b.id) : undefined;
    if (!e0) return lemma;
    const e = entityForPlayer(e0, g === "f");
    return agree(lemma, e.g, c, !!pl || (b?.qty ?? 1) > 1);
  });
  const valuesIn = (s: string, which: "en" | "lt" | "say") => s.replace(PH_VAL, (_m, name: string) => valueDisplay(name, vars[name])[which]);

  for (let i = 0; i < enU.length; i++) {
    const en = enU[i], lt = ltU[i];
    const m = en.match(PH_EN);
    if (m) {
      const [, pre, name, kindRaw, post] = m;
      const kind = (kindRaw || "head") as "np" | "the" | "pl" | "bare" | "head";
      const lm = lt.match(PH_LT);
      if (!lm) throw new Error(`LT unit for {${name}} needs a case placeholder: "${lt}" in ${src.en}`);
      const c = lm[3] as Case;
      const ltPre = lt.slice(0, lm.index), ltPost = lt.slice((lm.index ?? 0) + lm[0].length);
      const b = binding(vars, name);
      if (!b) {
        units.push({ en: `${pre}…${post}`, lt: `${ltPre}…${ltPost}` });
        continue;
      }
      const np = npUnits(b, kind, c, opts.look, g === "f");
      // a placeholder that begins a new sentence mid-line starts with a capital ("The usual? A medium latte?")
      const newSentence = i > 0 && !pre && /[.?!]["”')]*$/.test(units[units.length - 1]?.en ?? "");
      np.en.forEach((w, k) => {
        const first = k === 0, last = k === np.en.length - 1;
        units.push({
          en: (first ? pre : "") + (first && newSentence ? capFirst(w) : w) + (last ? post : ""),
          lt: (first ? ltPre : "") + (first && newSentence && !ltPre ? capFirst(np.lt[k]) : np.lt[k]) + (last ? ltPost : ""),
          flag: np.flags[k],
        });
      });
      sayParts.push(pre + (newSentence ? capFirst(np.en.join(" ")) : np.en.join(" ")) + post);
      continue;
    }
    const enV = valuesIn(en, "en");
    const ltV = valuesIn(agreeIn(lt), "lt");
    units.push({ en: enV, lt: ltV, flag: src.flags?.[i] });
    sayParts.push(valuesIn(en, "say"));
  }

  // Natural Lithuanian
  let nat = resolveGender(src.nat);
  nat = nat.replace(new RegExp(PH_LT.source, "g"), (_m, name: string, kind: string | undefined, c: Case) => {
    const b = binding(vars, name);
    if (!b) return "…";
    const np = npUnits(b, (kind || "head") as any, c, opts.look, g === "f");
    return np.natLt.join(" ");
  });
  nat = valuesIn(agreeIn(nat), "lt");

  // a sentence that starts with a placeholder still starts with a capital ("A latte, please.")
  const startsWithSlot = (t: string) => /^[\s"“„'‘(¿¡]*\{/.test(t);
  if (units.length && startsWithSlot(src.en)) units[0] = { ...units[0], en: capFirst(units[0].en) };
  if (units.length && startsWithSlot(src.lt)) units[0] = { ...units[0], lt: capFirst(units[0].lt) };
  if (startsWithSlot(src.nat)) nat = capFirst(nat);
  const enClean = units.map((u) => u.en).join(" ");
  let say = src.say ? valuesIn(src.say, "say") : sayParts.join(" ");
  if (startsWithSlot(src.say ?? src.en)) say = capFirst(say);
  if (src.say && /\{[A-Za-z_]/.test(say)) {
    say = say.replace(/\{([A-Za-z_]\w*)(?:\.(np|the|pl|bare))?\}/g, (_m, name: string, kind?: string) => {
      const b = binding(vars, name);
      if (!b) return "";
      return npUnits(b, (kind || "head") as any, "nom", opts.look, g === "f").en.join(" ");
    });
  }
  return { units, en: enClean, nat, say: say.replace(/\s+/g, " ").trim() };
}

function capFirst(t: string): string {
  return t.replace(/^([\s"“„'‘(¿¡]*)(\p{Ll})/u, (_m, pre: string, ch: string) => pre + ch.toUpperCase());
}

/** Replace the X placeholder with a gap "…" (hint pattern display). */
export function gapSentence(src: SentSrc, opts: ComposeOpts): Sentence {
  return compose(src, {}, opts);
}

/** Placeholder names used by a sentence (for enumeration and validation). */
export function placeholders(src: SentSrc): { entities: string[]; values: string[] } {
  const entities = new Set<string>(), values = new Set<string>();
  for (const u of splitUnits(src.en)) { const m = u.match(PH_EN); if (m) entities.add(m[2]); }
  for (const m of (src.en + " " + src.lt + " " + src.nat + " " + (src.say || "")).matchAll(PH_VAL)) values.add(m[1]);
  for (const m of src.lt.matchAll(PH_AGREE)) entities.add(m[2]);
  return { entities: [...entities], values: [...values] };
}
