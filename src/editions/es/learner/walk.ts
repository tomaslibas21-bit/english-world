// The learner-language text in Puerto Colibrí's content (docs/es/LEARNER-LT.md). The Spanish edition writes it in
// English (the field names are Maple Harbor's, where it is Lithuanian: SentSrc.lt is the word-by-word gloss, .nat the
// natural sentence, .flags the notes on units; an entity's lt/ltPl/ltF/ltPlF its forms, attrs.nat its natural phrase;
// HintGroup/Suggestion/MissionItem/Tip .lt, StepDef.label, HintItem.note, goal, intro, title.lt, topic.lt, a merge's
// split/minimal). learnerItems() lists it for the translators; applyLearner() puts a translation table in its place.

/** One piece of learner text. "sent": a sentence (Spanish `es`, `gloss` unit by unit, `nat`, notes on units);
 *  "entity": an entity's forms; "text": a label, goal, note or tip. */
export interface LearnerItem {
  kind: "sent" | "entity" | "text";
  /** sent: the Spanish units; entity: the Spanish singular units. */
  es?: string;
  esPl?: string;
  gloss?: string;
  nat?: string;
  flags?: Record<string, string>;
  /** entity: "type/id" */
  key?: string;
  fields?: Record<string, string>;
  /** text */
  en?: string;
  where?: string;
}

/** The translation of a sentence. */
export interface SentLt { gloss: string; nat: string; flags?: Record<string, string> }
/** The translation of an entity: Lithuanian case forms per unit ("latė/latės/latei/latę/late/latėje"), gender. */
export interface EntityLt { lt: string; ltPl?: string; ltF?: string; ltPlF?: string; g: "m" | "f"; gF?: "m" | "f"; nat?: string; natPl?: string; natF?: string; natPlF?: string; plOnly?: boolean; neutralLt?: string; neutralLtPl?: string; spainLt?: string; spainLtPl?: string }
/** A conversation's table (src/editions/es-lt/tables/<sit>.json). */
export interface LearnerTable { sent: Record<string, SentLt>; entity: Record<string, EntityLt>; text: Record<string, string> }

export const sentKey = (es: string, gloss: string, nat: string) => `${es}␟${gloss}␟${nat}`;

const TEXT_KEYS = new Set(["lt", "note", "noteSpain", "label", "goal", "intro", "split", "minimal"]);
const SKIP = new Set(["intents", "tests", "sims", "grammar", "domains", "entities", "handlers", "patterns", "forms", "examples", "expects", "attrs", "neutral", "spain"]);
const isSent = (o: any) => o && typeof o === "object" && typeof o.en === "string" && typeof o.lt === "string" && typeof o.nat === "string";

type Visit = { sent(o: any, where: string): void; text(o: any, key: string, where: string): void };

function walk(o: any, where: string, v: Visit, seen: WeakSet<object>) {
  if (!o || typeof o !== "object" || seen.has(o)) return;
  seen.add(o);
  if (Array.isArray(o)) { o.forEach((x, i) => walk(x, where, v, seen)); return; }
  if (isSent(o)) {
    v.sent(o, where);
    for (const tw of ["neutral", "spain"]) if (isSent(o[tw])) v.sent(o[tw], where + "." + tw);
    return;
  }
  for (const [k, x] of Object.entries(o)) {
    if (SKIP.has(k)) continue;
    if (typeof x === "string") { if (TEXT_KEYS.has(k) && /[A-Za-z]/.test(x)) v.text(o, k, where + "." + k); continue; }
    walk(x, where ? where + "." + k : k, v, seen);
  }
}

const ENTITY_FIELDS = ["lt", "ltPl", "ltF", "ltPlF"] as const;
/** Learner text in an entity's attrs: its natural name, and the gloss of the neutral / Spain noun where that noun has
 *  other units than the Mexican one ("cuenta | corriente" for "cuenta | de | débito"). */
const ATTR_FIELDS = ["nat", "natPl", "natF", "natPlF", "neutralLt", "neutralLtPl", "spainLt", "spainLtPl"] as const;

/** Every piece of learner text in a conversation (or any content object), deduplicated. */
export function learnerItems(def: any): LearnerItem[] {
  const out: LearnerItem[] = [];
  const sents = new Set<string>(), texts = new Set<string>();
  for (const [type, list] of Object.entries<any[]>(def.entities ?? {})) for (const e of list) {
    const fields: Record<string, string> = {};
    for (const f of ENTITY_FIELDS) if (typeof e[f] === "string") fields[f] = e[f];
    for (const f of ATTR_FIELDS) if (typeof e.attrs?.[f] === "string") fields[f] = e.attrs[f];
    out.push({ kind: "entity", key: `${type}/${e.id}`, es: e.en, ...(e.pl ? { esPl: e.pl } : {}), fields, ...(e.enF ? { where: `feminine Spanish: ${e.enF}` } : {}) });
  }
  walk(def, "", {
    sent(o, where) {
      const k = sentKey(o.en, o.lt, o.nat);
      if (sents.has(k)) return;
      sents.add(k);
      out.push({ kind: "sent", es: o.en, gloss: o.lt, nat: o.nat, ...(o.flags && Object.keys(o.flags).length ? { flags: { ...o.flags } } : {}), where });
    },
    text(o, key, where) {
      const s = o[key];
      if (texts.has(s)) return;
      texts.add(s);
      out.push({ kind: "text", en: s, where });
    },
  }, new WeakSet());
  return out;
}

/** Puts a conversation's (or shared content's) Lithuanian in place of its English, in place. Returns what it found no
 *  translation for (the checker's list). */
export function applyLearner(def: any, table: LearnerTable): string[] {
  const missing: string[] = [];
  for (const [type, list] of Object.entries<any[]>(def.entities ?? {})) for (const e of list) {
    const t = table.entity[`${type}/${e.id}`];
    if (!t) { missing.push(`entity ${type}/${e.id}`); continue; }
    for (const f of ENTITY_FIELDS) if (t[f] !== undefined) e[f] = t[f]; else if (f !== "lt") delete e[f];
    // the Lithuanian gender has its own field: `g` / `gF` are the Spanish ones (un/una, the agreement)
    e.ltG = t.g;
    // a noun Lithuanian has only in the plural (marškiniai, kelnės, kopėčios): its plural forms, plural agreement
    if (t.plOnly) e.ltPlOnly = true;
    if (t.gF) e.ltGF = t.gF;
    e.attrs = { ...(e.attrs ?? {}) };
    for (const f of ATTR_FIELDS) if (t[f] !== undefined) e.attrs[f] = t[f]; else if (f === "nat" || f === "natPl") delete e.attrs[f];
  }
  walk(def, "", {
    sent(o) {
      const t = table.sent[sentKey(o.en, o.lt, o.nat)];
      if (!t) { missing.push(`sent ${o.en}`); return; }
      o.lt = t.gloss;
      o.nat = t.nat;
      if (o.flags) o.flags = t.flags ?? {};
    },
    text(o, key) {
      const t = table.text[o[key]];
      if (t === undefined) { missing.push(`text ${o[key]}`); return; }
      o[key] = t;
    },
  }, new WeakSet());
  return missing;
}

/** A runtime string (a suggestion built in a handler) in the learner's language: the table's, or as it is. */
export function learnerText(tables: LearnerTable[], s: string): string {
  for (const t of tables) if (t.text[s] !== undefined) return t.text[s];
  return s;
}
