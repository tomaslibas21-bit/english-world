// Text normalisation shared by the pattern compiler and the learner's input.
// Contraction handling, homophone classes and the fuzzy token rule are ported
// from the Dvikalbės Dainos speech checker (work/course/src/lib/speech-check.ts),
// which compares word structure instead of one character-distance score for a
// whole sentence, so a missing "not", auxiliary or inflection is never hidden.
// The practised language's own words and rules are in ./lang.ts.

import KNOWN from "../generated/known-words.json";
import { LANG } from "./lang";

export type Tokens = string[];

/** Words the game itself uses (5+ letters, tools/build-vocab.ts): never "corrected" into another word. */
const KNOWN_WORDS: ReadonlySet<string> = new Set(KNOWN as string[]);

/** Tokens removed anywhere; they never change meaning. "please" is removed too but recorded. */
export const SOFT_FILLERS = LANG.softFillers;

/** Tokens that carry negation and must never be discarded or treated as fillers. */
export const NEGATION_TOKENS = LANG.negation;

/** Lowercase, unify apostrophes, turn punctuation into spaces; keeps "7:30" and "4.50" intact. */
export function surfaceTokens(input: string): Tokens {
  const pre = LANG.preSurface(String(input || ""))
    // thousands separators: "$12,000" is 12000, "1,050" is 1050 (a European "4,50" stays "4 50")
    .replace(/(\d),(?=\d{3}(?!\d))/g, "$1")
    .replace(/([$€£]\s?\d{1,3})((?: \d{3})+)(?!\d)/g, (_m, a: string, b: string) => a + b.replace(/ /g, "")) // "$12 000"
    .replace(/(\d):(\d)/g, "$1\u0002$2")
    .replace(/(\d)\.(\d)/g, "$1\u0003$2");
  return surfaceTokensKeep(pre);
}

/** Expand contractions and informal spellings. Ambiguous contractions produce variants (bounded). */
export function normalizedVariants(input: string | Tokens, contextAware = false): Tokens[] {
  const tokens = Array.isArray(input) ? input : surfaceTokens(input);
  let variants: Tokens[] = [[]];
  for (let i = 0; i < tokens.length; i++) {
    const choices = LANG.expand(tokens[i], tokens[i + 1], contextAware);
    const next: Tokens[] = [];
    for (const prefix of variants) {
      for (const c of choices) {
        next.push([...prefix, ...c.split(" ").filter(Boolean)]);
        if (next.length >= 24) break;
      }
      if (next.length >= 24) break;
    }
    variants = next;
  }
  return variants.length ? variants : [[]];
}

/** Tokenise learner input: returns variants plus flags for removed soft fillers. `noPause`: a leading
 *  "no" was written as its own answer ("No, oat milk" / "No. Cash", also after a filler: "Um, no, cash") rather
 *  than "no cash". */
export function tokenizeInput(input: string): { variants: Tokens[]; please: boolean; noPause: boolean } {
  const noPause = LANG.noPause(String(input || ""));
  const raw = surfaceTokens(input);
  const stripped = LANG.stripPlease(raw.filter((t) => !SOFT_FILLERS.has(t)));
  const please = stripped.please;
  let toks = stripped.toks;
  // "please" alone means "yes, please".
  if (!toks.length && please) toks = [...LANG.pleaseAlone];
  // a filler on its own can itself be the answer (the doctor: "Say 'ah'." – "Ah."): keep it then
  else if (!toks.length) toks = raw.filter((t) => SOFT_FILLERS.has(t));
  const variants = normalizedVariants(toks, false);
  const inv = variants.length ? LANG.invertedQuestion(variants[0]) : null;
  if (inv) variants.push(inv);
  return { variants, please, noPause };
}

/** Remove diacritics (NFD + drop combining marks). */
export function foldAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const CURRENCY = Object.entries(LANG.currency).map(([sym, word]) =>
  [new RegExp(`${sym.replace(/[$]/, "\\$")}\\s?(\\d+(?:\\u0003\\d{1,2})?)`, "g"), ` $1 ${word} `] as const);

function surfaceTokensKeep(pre: string): Tokens {
  let s = pre.toLowerCase();
  s = s.replace(/[‘’ʼ`´]/g, "'").replace(/[“”„“]/g, " ");
  for (const [re, by] of CURRENCY) s = s.replace(re, by);
  if (LANG.ordinalSuffix) s = s.replace(LANG.ordinalSuffix, "$1 $2");
  s = s.replace(/(\d)([ap])(?:\.?m\b\.?)/g, "$1 $2m"); // "7pm", "7:30p.m." → "7 pm"
  s = foldAccents(s); // "café" → "cafe", "Rūta" → "ruta" (instead of dropping the letters)
  s = s.replace(/[^a-z0-9'\u0002\u0003\s]/g, " ");
  return s.split(/\s+/).filter(Boolean)
    .map((t) => t.replace(/\u0002/g, ":").replace(/\u0003/g, "."))
    .map((t) => t.replace(/^'+|'+$/g, ""))
    .filter(Boolean);
}

/** Tokenise a pattern literal (author text), context-aware for contractions. */
export function tokenizePatternWords(words: string): Tokens {
  return LANG.patternWords(normalizedVariants(surfaceTokens(words), true)[0]);
}

// ---------------------------------------------------------------------------
// Token similarity (homophones, one likely recogniser spelling error).

const HOMOPHONE_MAP = (() => {
  const map = new Map<string, string>();
  for (const family of LANG.homophones) for (const w of family) map.set(w, family[0]);
  return map;
})();

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const cur = new Array<number>(b.length + 1);
  for (let r = 0; r < a.length; r++) {
    cur[0] = r + 1;
    for (let c = 0; c < b.length; c++) {
      cur[c + 1] = Math.min(cur[c] + 1, prev[c + 1] + 1, prev[c] + (a[r] === b[c] ? 0 : 1));
    }
    for (let c = 0; c <= b.length; c++) prev[c] = cur[c];
  }
  return prev[b.length];
}

const GRAMMAR_MAP = (() => {
  const map = new Map<string, number>();
  LANG.grammarClasses.forEach((family, i) => { for (const w of family) map.set(w, i); });
  return map;
})();

/** 1 exact/homophone, 0.9 one-edit spelling slip on a long word, 0.85–0.87 learner-grammar
 *  variant, 0 otherwise. Negation tokens only ever match exactly. */
export function tokenSimilarity(heard: string, target: string): number {
  if (heard === target || LANG.sameWord?.(heard, target)) return 1;
  if (NEGATION_TOKENS.has(heard) || NEGATION_TOKENS.has(target)) return LANG.negationHomophone(heard, target);
  const hc = HOMOPHONE_MAP.get(heard);
  if (hc && hc === HOMOPHONE_MAP.get(target)) return 0.97;
  if (LANG.spellingVariant?.(heard, target)) return 0.95;
  const sv = LANG.slipVariant?.(heard, target);
  if (sv !== undefined) return sv;
  const gc = GRAMMAR_MAP.get(heard);
  if (gc !== undefined && gc === GRAMMAR_MAP.get(target)) return 0.87;
  // Near-misses must keep the first letter: "cappucino" ≈ "cappuccino", but "night" ≠ "right".
  if (!LANG.sameStart(heard, target)) return 0;
  if (LANG.inflectionVariant(heard, target)) return 0.85;
  // a real word the game knows was most likely meant as said: "hungry" is not "Hungary"
  if (KNOWN_WORDS.has(heard)) return 0;
  if (Math.min(heard.length, target.length) >= 5 && !LANG.inflectionMismatch(heard, target) && levenshtein(heard, target) === 1) return 0.9;
  if (Math.min(heard.length, target.length) >= 8 && !LANG.inflectionMismatch(heard, target) && levenshtein(heard, target) === 2) return 0.8;
  return 0;
}

/** Function words a learner often leaves out ("I want latte", "where you live", "my name Tomas").
 *  In patterns they are optional at this cost. */
export const DROPPABLE = LANG.droppable;

/** Extra words a learner adds that don't change the meaning ("I am agree", "I want to a latte",
 *  "a really large one"). The matcher may skip one of them before a word or slot, at this cost. */
export const SKIPPABLE = LANG.skippable;

/** Capitalise a sentence for display of what the learner said. */
export function displayUtterance(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return t;
  const s = t.charAt(0).toUpperCase() + t.slice(1);
  return LANG.display(s);
}

// ---------------------------------------------------------------------------------------------
// A plain "yes" ("Did you mean…?" in suggest.ts; the sound check in dialogue.ts)

/** A plain "yes" (or the learner's own „taip“) and nothing else. `spoken`: also the recogniser's spellings of it. */
export function isConfirmation(text: string, spoken = false): boolean {
  const toks = surfaceTokens(text).filter((t) => !SOFT_FILLERS.has(t) && !LANG.confirmIgnore.includes(t));
  const s = toks.join(" ");
  return !!s && (LANG.confirm.has(s) || (spoken && LANG.confirmSpoken.has(s)));
}
