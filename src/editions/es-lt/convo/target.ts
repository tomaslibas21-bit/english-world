// Spanish noun phrases and values, glossed in Lithuanian (docs/es/LEARNER-LT.md): the Spanish side is the Spanish
// edition's (src/editions/es/convo/target.ts: articles, agreement, the three Spanishes' nouns), the gloss is Maple
// Harbor's way (src/convo/target.ts): Lithuanian case forms per unit, agreement with the entity's Lithuanian gender
// (`ltG`; `g` is the Spanish one), no articles ("—"). An entity's Lithuanian comes from its table
// (src/editions/es-lt/tables/), put in place when the content loads.
import type { EntityDef } from "@/content/types";
import { agree, caseIndex, parseForms, type Case, type Gender } from "@/convo/lt-morph";
import type { EntityLookup, NpBinding } from "@/convo/compose";
import { ltCount } from "@/ui/lt-lithuanian";
import * as ES from "@/convo/target";
import { TABLES } from "../tables/tables.gen";

// everything else is the Spanish edition's (its own names too: pluralEs, agreeEs, neutralNoun); the declarations
// below take precedence over these
export * from "@/convo/target";
type NpParts = ES.NpParts;

/** A gloss placeholder carries its Lithuanian case: {X:acc}, {X.np:gen}. */
export const PH_LT = /\{([A-Za-z_]\w*)(?:\.(np|the|pl|bare))?:(nom|gen|dat|acc|ins|loc)\}/;
/** Agreement in the gloss: {puikus@X:nom}, {jis@X:acc:pl}. */
export const PH_AGREE = /\{([a-ząčęėįšųūž]+)@([A-Za-z_]\w*):(nom|gen|dat|acc|ins|loc)(?::(pl))?\}/g;

const ltGender = (e: EntityDef): Gender => (e.ltG ?? "m");

/** The Spanish feminine forms (`enF`) and the Lithuanian ones (`ltF`, `ltPlF`, `ltGF`) for a female learner. */
export function entityForPlayer(e: EntityDef, fem: boolean): EntityDef {
  const es = ES.entityForPlayer(e, fem);
  if (!fem || !e.ltF) return es;
  return { ...es, lt: e.ltF, ltPl: e.ltPlF ?? e.ltPl, ltG: e.ltGF ?? "f" };
}

/** Agreement with an entity in the gloss: {puikus@X:nom} → "puiki" for a Lithuanian feminine X. */
export const agreeGloss = (lemma: string, e: EntityDef, c: Case, plural: boolean) => agree(lemma, ltGender(e), c, plural || !!e.ltPlOnly);

/** A count before a noun: du/dvi, trys, keturi/keturios in their case; larger numbers as digits. */
function countWord(n: number, g: Gender, c: Case): string {
  const lemma = n === 2 ? "du" : n === 3 ? "trys" : n === 4 ? "keturi" : "";
  return lemma ? agree(lemma, g, c) : String(n);
}

/** The Spanish units (the Spanish edition's) and their Lithuanian gloss in case `c`. */
export function npUnits(b: NpBinding, kind: "np" | "the" | "pl" | "bare" | "head", c: Case | undefined, look: EntityLookup, fem = false): NpParts {
  const sp = ES.npUnits(b, kind, c as Case, look, fem);
  const base = look(b.id);
  if (!base) throw new Error(`Unknown entity "${b.id}"`);
  // the Spanish chosen now may name it with other units ("cuenta | corriente"): its own Lithuanian gloss then
  const e = (ES as unknown as { neutralNoun: (e: EntityDef, f?: boolean) => EntityDef }).neutralNoun(entityForPlayer(base, fem), fem && !!base.enF);
  const qty = b.qty ?? 1;
  const plural = kind === "pl" || qty > 1;
  const g = ltGender(e);
  // a noun Lithuanian has only in the plural (marškiniai) is plural in the gloss whatever the Spanish says
  const ltPlural = plural || !!e.ltPlOnly;
  const head = splitUnitsLt(ltPlural ? e.ltPl ?? e.lt : e.lt);
  const mods = (b.mods || []).map((m) => look(m)).filter(Boolean) as EntityDef[];
  const pre = mods.filter((m) => m.attrs?.pre), post = mods.filter((m) => !m.attrs?.pre);
  const modCount = mods.reduce((a, m) => a + splitUnitsLt(m.lt).length, 0);
  const nArt = sp.en.length - modCount - head.length;
  if (nArt < 0 || nArt > 1) throw new Error(`Entity ${e.id}: Spanish and Lithuanian unit counts differ`);
  let cs: Case = c ?? "nom";
  const lt: string[] = [];
  const flags: Record<number, string> = {};
  if (nArt) {
    // a count only where the Spanish says one ({X.np} with two: "dos cafés"); {X.the} with two is the definite
    // plural ("las diapositivas"), no number in Lithuanian
    if (kind === "np" && qty > 1) lt.push(countWord(qty, g, cs));
    else if (plural && kind === "np") {
      // unos / unas: "some", carried by the genitive in Lithuanian ("Noriu takų")
      lt.push("—");
      flags[0] = "„unos / unas“ – keletas; lietuviškai tai perteikia kilmininkas.";
      if (cs === "nom" || cs === "acc") cs = "gen";
    } else lt.push("—");
  }
  const modForms = (m: EntityDef) => {
    const u = splitUnitsLt(m.lt);
    // only the last unit agrees with the noun ("labai | šaltą"); a phrase ("su ledu") keeps its own forms
    return u.length === 1 ? [agree(parseForms(u[0])[0], g, cs, ltPlural)] : u.map((x) => parseForms(x)[0]);
  };
  for (const m of pre) lt.push(...modForms(m));
  const headForms = head.map((u) => parseForms(u)[caseIndex(cs)]);
  lt.push(...headForms);
  for (const m of post) lt.push(...modForms(m));
  // natural Lithuanian: one-word modifiers before the noun, phrases after it; the entity's natural name if it has one
  const adj = mods.filter((m) => splitUnitsLt(m.lt).length === 1).flatMap(modForms);
  const phrases = mods.filter((m) => splitUnitsLt(m.lt).length > 1).map((m) => modForms(m).join(" "));
  const femNat = fem && base.ltF ? ((plural ? e.attrs?.natPlF : e.attrs?.natF) as string | undefined) : undefined;
  const natSpec = femNat ?? ((ltPlural ? e.attrs?.natPl ?? e.attrs?.nat : e.attrs?.nat) as string | undefined);
  const natHead = natSpec ? parseForms(natSpec)[caseIndex(cs)] : headForms.filter((x) => x !== "—").join(" ");
  const natLt = [...(nArt && kind === "np" && qty > 1 ? [lt[0]] : []), ...adj, natHead, ...phrases];
  return { en: sp.en, lt, natLt, flags };
}
const splitUnitsLt = (s: string) => s.split(" | ").map((x) => x.trim());

/** "85 pesai", "21 pesas", "12 pesų", "85,50 peso". */
export function priceLt(cents: number): string {
  const d = Math.floor(cents / 100), c = cents % 100;
  const n = String(d).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return c ? `${n},${String(c).padStart(2, "0")} peso` : `${n} ${ltCount(d, "pesas", "pesai", "pesų")}`;
}

/** Every Lithuanian text the tables have, by its English (a value a handler builds at run time: s80's weekday
 *  {en: "el jueves", lt: "Thursday"}); the conversations' own first, then the town-wide one. */
let VALUE_TEXT: Map<string, string> | null = null;
function valueText(en: string): string | undefined {
  if (!VALUE_TEXT) {
    VALUE_TEXT = new Map();
    for (const [id, t] of Object.entries(TABLES)) if (id !== "_shared") for (const [k, v] of Object.entries(t.text)) if (!VALUE_TEXT.has(k)) VALUE_TEXT.set(k, v);
    for (const [k, v] of Object.entries(TABLES._shared?.text ?? {})) if (!VALUE_TEXT.has(k)) VALUE_TEXT.set(k, v);
  }
  return VALUE_TEXT.get(en);
}

/** A value in the Spanish text, the Lithuanian gloss and the spoken Spanish. */
export function valueDisplay(kind: string, v: any): { en: string; lt: string; say: string } {
  const r = ES.valueDisplay(kind, v);
  if (v && typeof v === "object" && typeof v.lt === "string") return { ...r, lt: valueText(v.lt) ?? r.lt };
  // a decimal number (a temperature, 38.3): Lithuanian writes a comma
  if (typeof v === "number" && !Number.isInteger(v)) return { ...r, lt: String(v).replace(".", ",") };
  if (v != null && (kind === "price" || kind === "total" || kind === "amount" || kind === "fare" || kind === "rent" || kind === "deposit")) return { ...r, lt: priceLt(v) };
  return r;
}
