// Text normalisation shared by the pattern compiler and the learner's input.
// Contraction handling, homophone classes and the fuzzy token rule are ported
// from the Dvikalbės Dainos speech checker (work/course/src/lib/speech-check.ts),
// which compares word structure instead of one character-distance score for a
// whole sentence, so a missing "not", auxiliary or inflection is never hidden.

import KNOWN from "../generated/known-words.json";

export type Tokens = string[];

/** English words the game itself uses (5+ letters, tools/build-vocab.ts): never "corrected" into another word. */
const KNOWN_WORDS: ReadonlySet<string> = new Set(KNOWN as string[]);

const CONTRACTIONS: Record<string, string> = {
  "cannot": "can not", "can't": "can not", "aren't": "are not", "couldn't": "could not",
  "didn't": "did not", "doesn't": "does not", "don't": "do not", "hadn't": "had not",
  "hasn't": "has not", "haven't": "have not", "isn't": "is not", "mightn't": "might not",
  "mustn't": "must not", "needn't": "need not", "shan't": "shall not", "shouldn't": "should not",
  "wasn't": "was not", "weren't": "were not", "won't": "will not", "wouldn't": "would not",
  "ain't": "is not",
  "i'm": "i am", "you're": "you are", "we're": "we are", "they're": "they are",
  "what're": "what are", "where're": "where are", "who're": "who are", "how're": "how are",
  "i've": "i have", "you've": "you have", "we've": "we have", "they've": "they have",
  "could've": "could have", "would've": "would have", "should've": "should have",
  "i'll": "i will", "you'll": "you will", "he'll": "he will", "she'll": "she will",
  "it'll": "it will", "we'll": "we will", "they'll": "they will", "that'll": "that will",
  "there'll": "there will", "let's": "let us", "y'all": "you all", "ma'am": "madam",
  "o'clock": "oclock",
};

const AMBIGUOUS_CONTRACTIONS: Record<string, readonly string[]> = {
  "he's": ["he is", "he has"], "she's": ["she is", "she has"], "it's": ["it is", "it has"],
  "that's": ["that is", "that has"], "there's": ["there is", "there has"],
  "here's": ["here is", "here has"], "what's": ["what is", "what has"],
  "where's": ["where is", "where has"], "who's": ["who is", "who has"],
  "how's": ["how is", "how has"], "when's": ["when is", "when has"],
  "i'd": ["i would", "i had"], "you'd": ["you would", "you had"], "he'd": ["he would", "he had"],
  "she'd": ["she would", "she had"], "it'd": ["it would", "it had"], "we'd": ["we would", "we had"],
  "they'd": ["they would", "they had"], "there'd": ["there would", "there had"],
  "that'd": ["that would", "that had"],
};

// Informal spellings produced by speech recognisers or typed by learners.
const INFORMAL: Record<string, string> = {
  "gonna": "going to", "wanna": "want to", "gotta": "got to", "kinda": "kind of",
  "lemme": "let me", "gimme": "give me", "ya": "you", "u": "you", "ur": "your",
  "ok": "okay", "k": "okay", "alright": "all right", "pls": "please", "plz": "please",
  "thx": "thanks", "cuz": "because", "cos": "because", "ima": "i am going to",
  "im": "i am", "dont": "do not", "cant": "can not",
  "wont": "will not", "didnt": "did not", "doesnt": "does not", "isnt": "is not",
  "its": "it is", "thats": "that is", "whats": "what is", "wheres": "where is", "heres": "here is",
  "ive": "i have", "youre": "you are", "theyre": "they are", "lets": "let us",
  "couldnt": "could not", "wouldnt": "would not", "shouldnt": "should not", "arent": "are not",
  "wasnt": "was not", "havent": "have not", "hasnt": "has not",
  "mr": "mister", "mrs": "missus", "ms": "miss", "dr": "doctor",
  "yea": "yeah", "mhm": "yes",
};

/** Tokens removed anywhere; they never change meaning. "please" is removed too but recorded. */
export const SOFT_FILLERS = new Set(["um", "umm", "uhm", "uh", "uhh", "er", "erm", "err", "hmm", "hm", "mm", "mmm", "ah", "ahh", "eh"]);

/** Tokens that carry negation and must never be discarded or treated as fillers. */
export const NEGATION_TOKENS = new Set(["not", "no", "never", "without", "nothing", "none", "neither", "nor", "nobody", "nope", "nah"]);

function looksLikePastParticiple(token: string | undefined): boolean {
  if (!token) return false;
  return PAST_PARTICIPLES.has(token) || (token.length > 4 && /(?:ed|en)$/.test(token));
}
const PAST_PARTICIPLES = new Set([
  "been", "become", "begun", "broken", "brought", "built", "bought", "caught", "chosen", "come",
  "done", "drawn", "driven", "drunk", "eaten", "fallen", "felt", "flown", "forgotten", "found",
  "given", "gone", "got", "gotten", "heard", "held", "kept", "known", "left", "lost", "made",
  "met", "paid", "put", "read", "risen", "run", "said", "sat", "seen", "shown", "sung", "spoken",
  "stood", "taken", "taught", "thought", "understood", "won", "worn", "written", "had", "booked",
  "ordered", "arrived", "tried", "finished", "lived", "worked", "moved", "changed", "started",
]);

/** Lowercase, unify apostrophes, turn punctuation into spaces; keeps "7:30" and "4.50" intact. */
export function surfaceTokens(input: string): Tokens {
  const pre = String(input || "")
    .replace(/\b(uh[- ]huh|mm[- ]hmm|mhm)\b/gi, " yes ")
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
    const tok = tokens[i];
    let choices: readonly string[];
    const amb = AMBIGUOUS_CONTRACTIONS[tok];
    if (amb) {
      if (contextAware) {
        const perfect = looksLikePastParticiple(tokens[i + 1]);
        choices = tok.endsWith("'s")
          ? amb.filter((c) => c.endsWith(perfect ? " has" : " is"))
          : amb.filter((c) => c.endsWith(perfect ? " had" : " would"));
      } else choices = amb;
    } else if (CONTRACTIONS[tok]) choices = [CONTRACTIONS[tok]];
    else if (INFORMAL[tok]) choices = [INFORMAL[tok]];
    else if (/^[a-z]+'s$/.test(tok)) choices = [tok.replace(/'s$/, "s"), tok.replace(/'s$/, " is")];
    else choices = [tok.replace(/'/g, "")];
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

const WH = new Set(["where", "what", "when", "how", "why", "which", "who", "whom"]);
const SUBJ = new Set(["i", "you", "we", "he", "she", "it", "they"]);
const AUX = new Set(["can", "could", "should", "will", "would", "may", "might", "must", "am", "is", "are", "was", "were", "have", "has", "do", "does", "did"]);
/** Learner questions keep statement order: "Where I can find…?" → also try "Where can I find…?". */
function invertedQuestion(toks: Tokens): Tokens | null {
  for (let i = 0; i + 2 < toks.length; i++) {
    if (!WH.has(toks[i])) continue;
    let j = i + 1;
    if (toks[i] === "what" && (toks[j] === "time" || toks[j] === "kind")) j++;
    if (toks[i] === "how" && (toks[j] === "much" || toks[j] === "many" || toks[j] === "long")) j++;
    if (SUBJ.has(toks[j]) && AUX.has(toks[j + 1])) return [...toks.slice(0, j), toks[j + 1], toks[j], ...toks.slice(j + 2)];
    return null;
  }
  return null;
}

/** Tokenise learner input: returns variants plus flags for removed soft fillers. `noPause`: a leading
 *  "no" was written as its own answer ("No, oat milk" / "No. Cash") rather than "no cash". */
export function tokenizeInput(input: string): { variants: Tokens[]; please: boolean; noPause: boolean } {
  const noPause = /^\W*(no|nope|nah)\s*[,.!;:–—-]/i.test(String(input || ""));
  let toks = surfaceTokens(input);
  let please = false;
  toks = toks.filter((t) => {
    if (SOFT_FILLERS.has(t)) return false;
    if (t === "please" || t === "pls" || t === "plz") { please = true; return false; }
    return true;
  });
  // "please" alone means "yes, please".
  if (!toks.length && please) toks = ["yes"];
  const variants = normalizedVariants(toks, false);
  const inv = variants.length ? invertedQuestion(variants[0]) : null;
  if (inv) variants.push(inv);
  return { variants, please, noPause };
}

/** Remove diacritics (NFD + drop combining marks). */
export function foldAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function surfaceTokensKeep(pre: string): Tokens {
  let s = pre.toLowerCase();
  s = s.replace(/[‘’ʼ`´]/g, "'").replace(/[“”„“]/g, " ");
  s = s.replace(/\$\s?(\d+(?:\u0003\d{1,2})?)/g, " $1 dollars ").replace(/€\s?(\d+(?:\u0003\d{1,2})?)/g, " $1 euros ").replace(/£\s?(\d+(?:\u0003\d{1,2})?)/g, " $1 pounds ");
  s = s.replace(/(\d)(st|nd|rd|th)\b/g, "$1 $2");
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
  // "please" is removed from the learner's input (and recorded as a flag), so patterns ignore it too
  const toks = normalizedVariants(surfaceTokens(words), true)[0].filter((t) => t !== "please" && t !== "pls" && t !== "plz");
  // an author's "driver s license" means the possessive "driver's" (heard as "drivers")
  const out: Tokens = [];
  for (const t of toks) {
    if (t === "s" && out.length && /^[a-z]+$/.test(out[out.length - 1])) out[out.length - 1] += "s";
    else out.push(t);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Token similarity (homophones, one likely recogniser spelling error).

const HOMOPHONE_CLASSES: readonly (readonly string[])[] = [
  ["for", "four", "fore"], ["to", "too", "two", "tu"], ["the", "thee", "thuh", "duh", "de", "tha"],
  ["a", "ay"], ["no", "know"], ["hear", "here"], ["their", "there", "they're"], ["one", "won"],
  ["see", "sea"], ["right", "write", "wright"], ["sun", "son"], ["buy", "by", "bye"], ["i", "eye", "aye"],
  ["ate", "eight"], ["meet", "meat"], ["week", "weak"], ["be", "bee"], ["wear", "where", "ware"],
  ["flower", "flour"], ["hour", "our"], ["mail", "male"], ["peace", "piece"], ["break", "brake"],
  ["or", "oar", "ore"], ["oh", "owe", "o"], ["so", "sew", "sow"], ["do", "due", "dew"], ["not", "knot"],
  ["new", "knew"], ["which", "witch"], ["would", "wood"], ["made", "maid"], ["wait", "weight"],
  ["way", "weigh"], ["some", "sum"], ["whole", "hole"], ["role", "roll"], ["sale", "sail"],
  ["fair", "fare"], ["hair", "hare"], ["cell", "sell"], ["sent", "cent", "scent"], ["plain", "plane"],
  ["night", "knight"], ["blue", "blew"], ["through", "threw"], ["tea", "tee", "t"], ["pair", "pear", "pare"],
  ["aisle", "isle", "i'll"], ["seen", "scene"], ["stair", "stare"], ["waist", "waste"], ["check", "cheque", "czech"],
  ["cash", "cache"], ["fillet", "filet"], ["bill", "bil"], ["dollars", "dollar's"], ["color", "colour"],
  ["favorite", "favourite"], ["gray", "grey"], ["center", "centre"], ["theater", "theatre"], ["okay", "ok"],
];
const HOMOPHONE_MAP = (() => {
  const map = new Map<string, string>();
  for (const family of HOMOPHONE_CLASSES) for (const w of family) map.set(w, family[0]);
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

const INFLECTIONS = ["ing", "ed", "en", "es", "s", "er", "est"] as const;
function stemAndSuffix(word: string): [string, string] {
  for (const suf of INFLECTIONS) {
    if (word.length > suf.length + 2 && word.endsWith(suf)) return [word.slice(0, -suf.length), suf];
  }
  return [word, ""];
}
function isInflectionMismatch(a: string, b: string): boolean {
  const [as, af] = stemAndSuffix(a);
  const [bs, bf] = stemAndSuffix(b);
  return as === bs && af !== bf;
}

// Learner grammar: words a listener easily maps onto each other because the meaning stays
// clear ("pay by cash", "may I pay…", "he have", "I would like to ordering"). A small cost
// keeps the exact form preferred. Direction words (from/to, in/out) are never swapped.
const GRAMMAR_CLASSES: readonly (readonly string[])[] = [
  ["a", "an", "the"], ["this", "that"], ["these", "those"],
  ["in", "on", "at"], ["with", "by"], ["for", "to"],
  ["can", "could", "may"], ["will", "would"], ["is", "are", "am", "was", "were", "be"],
  ["have", "has", "had"], ["do", "does"], ["go", "goes", "went", "going", "gone"],
  ["get", "gets", "got", "getting", "gotten"], ["take", "takes", "took", "taking", "taken"],
  ["pay", "pays", "paid", "paying"], ["make", "makes", "made", "making"], ["come", "comes", "came", "coming"],
  ["leave", "leaves", "left", "leaving"], ["lose", "loses", "lost", "losing"], ["buy", "buys", "bought", "buying"],
  ["give", "gives", "gave", "giving", "given"], ["see", "sees", "saw", "seeing", "seen"], ["find", "finds", "found", "finding"],
  ["tell", "tells", "told", "telling"], ["say", "says", "said", "saying"], ["think", "thinks", "thought", "thinking"],
  ["feel", "feels", "felt", "feeling"], ["send", "sends", "sent", "sending"], ["bring", "brings", "brought", "bringing"],
  ["forget", "forgets", "forgot", "forgotten"], ["break", "breaks", "broke", "broken"], ["steal", "steals", "stole", "stolen"],
  ["drive", "drives", "drove", "driven"], ["fly", "flies", "flew", "flown"], ["write", "writes", "wrote", "written"],
  ["i", "me"], ["we", "us"], ["he", "him"], ["she", "her"], ["they", "them"],
];
const GRAMMAR_MAP = (() => {
  const map = new Map<string, number>();
  GRAMMAR_CLASSES.forEach((family, i) => { for (const w of family) map.set(w, i); });
  return map;
})();

/** Possible stems of a word: "booked" → book, "arrived" → arrive, "stopped" → stop, "taking" → take. */
function stems(w: string): string[] {
  const out = new Set([w]);
  for (const suf of ["ing", "ed", "es", "s"]) {
    if (!w.endsWith(suf) || w.length - suf.length < 3) continue;
    const st = w.slice(0, -suf.length);
    out.add(st); out.add(st + "e"); out.add(st.replace(/(.)\1$/, "$1"));
  }
  return [...out];
}
/** Same word with another ending: "want"/"wants", "book"/"booked", "order"/"ordering".
 *  ("card" and "car" are different words: a bare -d is not an ending.) */
function isInflectionVariant(a: string, b: string): boolean {
  if (Math.min(a.length, b.length) < 3) return false;
  const sb = new Set(stems(b));
  return stems(a).some((x) => x.length >= 3 && sb.has(x));
}

/** 1 exact/homophone, 0.9 one-edit spelling slip on a long word, 0.85–0.87 learner-grammar
 *  variant, 0 otherwise. Negation tokens only ever match exactly. */
export function tokenSimilarity(heard: string, target: string): number {
  if (heard === target) return 1;
  if (NEGATION_TOKENS.has(heard) || NEGATION_TOKENS.has(target)) {
    // "know" for "no" is the only accepted negation homophone.
    return (heard === "know" && target === "no") ? 0.95 : 0;
  }
  const hc = HOMOPHONE_MAP.get(heard);
  if (hc && hc === HOMOPHONE_MAP.get(target)) return 0.97;
  const gc = GRAMMAR_MAP.get(heard);
  if (gc !== undefined && gc === GRAMMAR_MAP.get(target)) return 0.87;
  // Near-misses must keep the first letter: "cappucino" ≈ "cappuccino", but "night" ≠ "right".
  if (heard[0] !== target[0]) return 0;
  if (isInflectionVariant(heard, target)) return 0.85;
  // a real word the game knows was most likely meant as said: "hungry" is not "Hungary"
  if (KNOWN_WORDS.has(heard)) return 0;
  if (Math.min(heard.length, target.length) >= 5 && !isInflectionMismatch(heard, target) && levenshtein(heard, target) === 1) return 0.9;
  if (Math.min(heard.length, target.length) >= 8 && !isInflectionMismatch(heard, target) && levenshtein(heard, target) === 2) return 0.8;
  return 0;
}

/** Function words a learner often leaves out ("I want latte", "where you live", "my name Tomas").
 *  In patterns they are optional at this cost. */
export const DROPPABLE: ReadonlyMap<string, number> = new Map([
  ["a", 0.15], ["an", 0.15], ["the", 0.15], ["some", 0.2],
  ["to", 0.25], ["of", 0.3], ["is", 0.35], ["are", 0.35], ["am", 0.35],
  ["do", 0.3], ["does", 0.3], ["did", 0.35],
  ["for", 0.35], ["in", 0.35], ["on", 0.35], ["at", 0.35], ["with", 0.35], ["by", 0.35],
  ["i", 0.5], ["it", 0.45], ["my", 0.3],
]);
/** "it" may be missing only as a subject ("[it] is my wallet", "[it] was very nice"), never as an object. */
export const SUBJECT_IT_BEFORE = new Set(["is", "was", "will", "would", "looks", "sounds", "seems", "has", "does", "can", "could", "should", "might", "must"]);

/** Extra words a learner adds that don't change the meaning ("I am agree", "I want to a latte",
 *  "a really large one"). The matcher may skip one of them before a word or slot, at this cost. */
export const SKIPPABLE: ReadonlyMap<string, number> = new Map([
  ["a", 0.2], ["an", 0.2], ["the", 0.2], ["some", 0.2], ["to", 0.3], ["of", 0.3],
  ["am", 0.3], ["is", 0.3], ["are", 0.3], ["do", 0.3], ["does", 0.3],
  ["just", 0.1], ["really", 0.2], ["very", 0.2], ["so", 0.2], ["also", 0.2], ["too", 0.2],
  ["maybe", 0.2], ["actually", 0.1], ["like", 0.35], ["then", 0.25], ["now", 0.25],
  ["okay", 0.2], ["yeah", 0.2], ["well", 0.2], ["oh", 0.15], ["and", 0.3], ["please", 0.1],
]);

/** Capitalise a sentence for display of what the learner said. */
export function displayUtterance(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return t;
  const s = t.charAt(0).toUpperCase() + t.slice(1);
  return s.replace(/\bi\b/g, "I").replace(/\bi'(m|ll|d|ve)\b/gi, (_m, x) => `I'${x}`);
}
