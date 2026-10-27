// Names of things that sound right but were heard wrong. A Lithuanian "latė" (lah-teh) reaches the recogniser as
// "lot a", "lata", "lady" or "la tay"; "cappuccino" as "cap a chino". The grammar can't know these spellings, so
// when an answer isn't understood (or is understood only as "something we don't have"), the words are compared by
// how they sound with the names this conversation knows. A match is never accepted silently: the person checks
// back ("Sorry, a latte?"), as a real barista would, and the learner hears the word said right.
import type { EntityDef } from "../content/types";
import { levenshtein, NEGATION_TOKENS } from "./normalize";
import type { Nlu } from "./nlu";

/** A rough sound key: English spelling folded to its consonants, with the differences a Lithuanian accent or a
 *  recogniser blurs (t/d, p/b, k/g, s/z, v/w, ch/j) made equal. "latte", "lotta", "lady", "la tay" → "lt". */
export function soundKey(word: string): string {
  let s = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!s) return "";
  s = s
    .replace(/cch/g, "k").replace(/cc(?=[ie])/g, "ch") // Italian: macchiato, cappuccino
    .replace(/tch/g, "C").replace(/ch/g, "C").replace(/j/g, "C")
    .replace(/ph/g, "f").replace(/gh/g, "").replace(/ck/g, "k").replace(/qu/g, "kv").replace(/q/g, "k")
    .replace(/x/g, "ks").replace(/th/g, "t").replace(/sh/g, "s")
    .replace(/c(?=[eiy])/g, "s").replace(/c/g, "k")
    .replace(/d/g, "t").replace(/b/g, "p").replace(/g/g, "k").replace(/z/g, "s").replace(/w/g, "v")
    .replace(/h/g, "")
    .replace(/[aeiouy]/g, "")
    .replace(/(.)\1+/g, "$1");
  return s;
}

const letters = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
/** How alike two spellings are, 0…1. */
function likeness(a: string, b: string): number {
  const x = letters(a), y = letters(b);
  if (!x || !y) return 0;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
}

/** Words that never start or end a sound-alike: they are the sentence around the name. */
const EDGE = new Set(["a", "an", "the", "of", "to", "and", "or", "i", "you", "it", "is", "am", "are", "be", "please", "one", "some", "my", "your", "for", "with", "in", "on", "at", "can", "could", "get", "have", "like", "want", "would", "just", "yes", "yeah", "okay", "ok", "thanks", "thank", "uh", "um"]);

/** Short words a recogniser writes for an unstressed vowel inside a name. */
const VOWELISH = new Set(["of", "a", "uh"]);
/** What may follow a name at the end of an answer. */
const TAIL = new Set(["please", "thanks", "thank", "you"]);

export interface SoundFix {
  /** the answer with the heard words replaced by the name */
  fixed: string;
  /** what was heard in its place */
  heard: string;
  type: string;
  entity: string;
  likeness: number;
}

/** The names this conversation knows, each with its spellings. */
function surfaces(e: EntityDef): string[] {
  const join = (s?: string) => (s ? s.split(" | ").join(" ").trim() : "");
  return [...new Set([join(e.en), join(e.pl), ...(e.forms ?? [])].filter(Boolean).map((s) => s.toLowerCase()))];
}

/** An answer that isn't understood (or only as a catch-all) whose words sound like a name the conversation knows,
 *  and that becomes an expected, understood answer with that name in their place. Null when there is none. */
export function soundRepair(nlu: Nlu, entities: Record<string, EntityDef[]> | undefined, expected: string[], text: string): SoundFix | null {
  if (!entities) return null;
  const raw = text.trim().split(/\s+/).filter(Boolean);
  const clean = raw.map((w) => w.toLowerCase().replace(/[^a-z']/g, ""));
  if (!clean.length || clean.length > 16) return null;
  // as with every loose reading (nlu.ts approximate), a sentence with a negation is never touched
  if (clean.some((w) => NEGATION_TOKENS.has(w) || w.includes("n't"))) return null;
  const known = new Map<string, { type: string; entity: EntityDef; surface: string; key: string; vowelEnd: boolean }[]>();
  const realWords = new Set<string>();
  const realPhrases = new Set<string>();
  for (const [type, list] of Object.entries(entities)) {
    for (const e of list) {
      for (const sf of surfaces(e)) {
        realPhrases.add(sf);
        for (const w of sf.split(" ")) if (!EDGE.has(w)) realWords.add(w);
        const key = soundKey(sf);
        if (key.length < 2 || letters(sf).length < 4) continue;
        const arr = known.get(key) ?? [];
        arr.push({ type, entity: e, surface: sf, key, vowelEnd: /[aeiouy]$/.test(letters(sf)) });
        known.set(key, arr);
      }
    }
  }
  if (!known.size) return null;
  const fixes: SoundFix[] = [];
  for (let n = 1; n <= 3; n++) {
    for (let i = 0; i + n <= clean.length; i++) {
      const win = clean.slice(i, i + n);
      // a name's last syllable heard as "of" or "a" ("a lot of", "a lot a") can only end the answer
      const atEnd = clean.slice(i + n).every((w) => TAIL.has(w));
      const last = win[win.length - 1];
      if (EDGE.has(win[0]) || (EDGE.has(last) && !(n > 1 && atEnd && VOWELISH.has(last)))) continue;
      if (win.some((w) => !w || /\d/.test(w) || NEGATION_TOKENS.has(w) || w.includes("n't"))) continue;
      // a name the conversation knows is no mishearing ("large" is never "latte"); inside a longer stretch a real
      // word may be part of one ("cup of chino")
      if (n === 1 ? realWords.has(win[0]) : realPhrases.has(win.join(" "))) continue;
      // inside a sound-alike, a heard "of" or "a" is a vowel: "cup of chino", "lot of", "cap a chino"
      const joined = win.map((w, k) => (k > 0 && VOWELISH.has(w) ? "a" : w)).join("");
      const key = soundKey(joined);
      const cands = [...(known.get(key) ?? []), ...(key.endsWith("r") ? (known.get(key.slice(0, -1)) ?? []).filter((c) => c.vowelEnd) : [])];
      for (const c of cands) {
        const like = likeness(joined, c.surface);
        if (like < 0.4) continue;
        const fixed = [...raw.slice(0, i), c.surface, ...raw.slice(i + n)].join(" ");
        const r = nlu.parse(fixed, expected);
        if (!r.ok || !r.best || r.best.flags.has("approx")) continue;
        if (r.best.segments.length && r.best.segments.every((sg) => nlu.isCatchAll(sg.intent))) continue;
        if (expected.length && !r.best.segments.some((sg) => expected.includes(sg.intent))) continue;
        fixes.push({ fixed, heard: raw.slice(i, i + n).join(" "), type: c.type, entity: c.entity.id, likeness: like });
      }
    }
  }
  fixes.sort((a, b) => b.likeness - a.likeness);
  return fixes[0] ?? null;
}
