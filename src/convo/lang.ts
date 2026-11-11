// The practised language's words and rules that the shared engine needs: contractions, fillers, negations,
// sound-alikes, learner slips, function words, the built-in yes/no answers and the words around an answer.
// This is English (the default edition); the Spanish edition has its own file with the same shape
// (src/editions/es/convo/lang.ts, docs/es/EDITIONS.md). The engine code that uses these lives in normalize.ts,
// grammar.ts, nlu.ts, soundalike.ts, speech.ts, suggest.ts and dialogue.ts.

type Tokens = string[];

export interface LangPack {
  // --- normalize.ts -------------------------------------------------------------------------------------------
  /** The surface text before tokenising ("uh-huh" → "yes"). */
  preSurface(s: string): string;
  /** Currency symbols and the word each becomes ("$12" → "12 dollars"). */
  currency: Record<string, string>;
  /** "7th" → "7 th" (the ordinal suffix as its own token), or null. */
  ordinalSuffix: RegExp | null;
  /** How one token can be read (contractions, informal spellings): one or more expansions. `next`: the next token. */
  expand(tok: string, next: string | undefined, contextAware: boolean): readonly string[];
  /** Tokens removed anywhere; they never change meaning ("um"). */
  softFillers: ReadonlySet<string>;
  /** "Please": removed from the input and the patterns, and recorded. Returns the tokens without it. */
  stripPlease(toks: Tokens): { toks: Tokens; please: boolean };
  /** What "please" alone means. */
  pleaseAlone: Tokens;
  /** A leading "no" written as an answer of its own ("No, oat milk"), not a determiner ("no oat milk"). */
  noPause(input: string): boolean;
  /** A learner's question in statement order, also read in question order ("Where I can find" → "Where can I find"). */
  invertedQuestion(toks: Tokens): Tokens | null;
  /** Tokens that carry negation: never discarded, never a filler, only ever matched exactly. */
  negation: ReadonlySet<string>;
  /** A heard word that may stand for a negation word (0 = never). */
  negationHomophone(heard: string, target: string): number;
  /** Words a recogniser writes for one another. */
  homophones: readonly (readonly string[])[];
  /** Two spellings of the same sounds (Spanish "baso"/"vaso"): almost as good as the word itself. Optional. */
  spellingVariant?(heard: string, target: string): boolean;
  /** The same word written two ways (Spanish: the learner's unaccented "pague" is the pattern's past "pagué"): as good
   *  as the word itself. Optional. */
  sameWord?(heard: string, target: string): boolean;
  /** Words a learner uses for one another while the meaning stays clear ("pay by cash", "he have"). */
  grammarClasses: readonly (readonly string[])[];
  /** Two forms whose likeness the language rules on itself, before the grammar classes (Spanish: the persons of
   *  "poder"): a similarity, or undefined for the usual rules. Optional. */
  slipVariant?(heard: string, target: string): number | undefined;
  /** The same word with another ending ("want"/"wants", "book"/"booked"). */
  inflectionVariant(a: string, b: string): boolean;
  /** The same stem but different endings, which a spelling slip must not bridge ("booked"/"books"). */
  inflectionMismatch(a: string, b: string): boolean;
  /** A near-miss must keep the first letter ("cappucino" ≈ "cappuccino", "night" ≠ "right"). */
  sameStart(heard: string, target: string): boolean;
  /** Function words a learner often leaves out, with the cost of leaving them out. */
  droppable: ReadonlyMap<string, number>;
  /** A droppable word that must stay here ("it" as an object: "[it] is my wallet" but never "take [it]"). */
  keepDroppable(tok: string, next: string | undefined): boolean;
  /** Extra words a learner adds that don't change the meaning, with their cost. */
  skippable: ReadonlyMap<string, number>;
  /** A pattern's own words after tokenising (an author's "driver s license" is the possessive "drivers"). */
  patternWords(toks: Tokens): Tokens;
  /** What the learner said, as shown ("i" → "I"). */
  display(s: string): string;
  /** A plain "yes": the practised language's, and the learner's own (the recogniser's spellings of it when spoken). */
  confirm: ReadonlySet<string>;
  confirmSpoken: ReadonlySet<string>;
  /** Words ignored around a plain "yes". */
  confirmIgnore: readonly string[];

  // --- grammar.ts ---------------------------------------------------------------------------------------------
  /** Articles: a lexicon form also works without them ("by window"). */
  articles: ReadonlySet<string>;
  /** A word that can't stand alone once its article is gone ("the one" never becomes "one"). */
  aloneAfterArticle: RegExp;
  /** Words that never start the unknown thing of an `{any}` slot. */
  notAThingStart: ReadonlySet<string>;

  // --- nlu.ts -------------------------------------------------------------------------------------------------
  /** Greetings and openers before an answer, by flag. */
  leads: [string, string][];
  /** Thanks and softeners after an answer, by flag. */
  tails: [string, string][];
  /** Generic ways of addressing someone. */
  vocatives: string;
  /** The ways a learner may address an NPC by name ("Mia"; "Officer Diaz", "Diaz", "Officer"). */
  vocativeForms(name: string): string[];
  yesLead: string;
  noLead: string;
  yes: string;
  no: string;
  /** "Yes, but …", "No, and …". */
  ynConnectors: string;
  /** Between two answers in one sentence. */
  connectors: string;
  /** Words that are numbers: an approximate reading never drops them. */
  numberWords: ReadonlySet<string>;
  /** Question words and auxiliaries: they decide whether a sentence is a question; never dropped either. */
  keyWords: ReadonlySet<string>;
  possessives: ReadonlySet<string>;
  /** Words that negate the clause they end ("I don't | …"): what follows must start a new part. */
  clauseNegators: ReadonlySet<string>;
  /** Words that make a piece negative: the next piece must start something new ("I don't have | my passport"). */
  pieceNegators: ReadonlySet<string>;
  /** A negative piece that negates nothing after it, a set phrase ending it (Spanish "No te preocupes. | ¿Tienes
   *  perro?"): the next piece needn't start something new. Optional. */
  settledNegative?(piece: Tokens): boolean;
  auxiliaries: ReadonlySet<string>;
  /** A verb that can't begin a piece right after another piece ("tomorrow | doesn't work"). */
  predicateAux: ReadonlySet<string>;
  /** A piece that can't be the subject of a verb starting the next one: a clause with its own verb (Spanish "Voy en
   *  el 223, | ¿va a tiempo?"). Optional. */
  ownClause?(piece: Tokens): boolean;
  /** A context-only answer right after a question that is the question's own words (Spanish "¿A qué hora sale | el
   *  último?" never answers with "el último"). Optional. */
  questionOwns?(question: Tokens, answer: Tokens): boolean;
  subjectPronouns: ReadonlySet<string>;
  /** Words that begin a new clause, question, command, contrast or aside. */
  newPart: ReadonlySet<string>;
  /** Two words that begin one ("a little", "a bit"). */
  newPartPair(t: string, next: string | undefined): boolean;
  determiners: ReadonlySet<string>;
  /** Words that continue a negated verb: right after the negation they never start a new part. */
  verbOrAside: ReadonlySet<string>;
  /** The word "no" that may be a determiner ("no cash"), and what may follow it as a correction instead. */
  noWord: string;
  correctionStarters: ReadonlySet<string>;
  /** Where "no" is also the verb's negation (Spanish): the words at `i` are a verb ("quiero"), or clitics and a verb
   *  ("la tiro"), that a "no" right before them negates, so no piece starts there ("No | la tiro" is no "No," + "la
   *  tiro"; "Efectivo no | quiero…" is never split). Optional. */
  noNegates?(toks: Tokens, i: number): boolean;
  /** "I want" read as "I would like" when nothing else was understood, or null. */
  wantAsWouldLike(toks: Tokens): Tokens | null;
  /** A goodbye followed by this word is no goodbye ("I have to go | to the airport"). */
  leavingContinues: ReadonlySet<string>;

  // --- soundalike.ts ------------------------------------------------------------------------------------------
  /** A rough sound key: spelling folded to consonants, with the differences an accent or a recogniser blurs. */
  soundKey(word: string): string;
  /** Words that never start or end a sound-alike: they are the sentence around the name. */
  soundEdge: ReadonlySet<string>;
  /** Short words a recogniser writes for an unstressed vowel inside a name. */
  soundVowelish: ReadonlySet<string>;
  /** What may follow a name at the end of an answer. */
  soundTail: ReadonlySet<string>;

  // --- speech.ts, dialogue.ts, suggest.ts ---------------------------------------------------------------------
  /** Does the text say no/not/never? A reading without the learner's negation is never preferred. */
  hasNegation(text: string): boolean;
  /** "Yes, that's it" as the reply to a check-back ("Sorry, a latte?"). */
  checkYes: RegExp;
  /** "No, a cappuccino": a no with a correction (group 2). */
  checkNo: RegExp;
  /** Words that carry little meaning of their own (did-you-mean ranking). */
  light: ReadonlySet<string>;
  /** Question words (did-you-mean ranking). */
  wh: ReadonlySet<string>;
  /** 0–20 as words (listen-and-repeat compares "4" with "four"). */
  digitWords: readonly string[];
  /** Words never marked as misheard in "Did you mean…?" ("please"). */
  markIgnore: ReadonlySet<string>;
}

// ---------------------------------------------------------------------------------------------------------------
// English

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

const WH = new Set(["where", "what", "when", "how", "why", "which", "who", "whom"]);
const SUBJ = new Set(["i", "you", "we", "he", "she", "it", "they"]);
const AUX = new Set(["can", "could", "should", "will", "would", "may", "might", "must", "am", "is", "are", "was", "were", "have", "has", "do", "does", "did"]);

const INFLECTIONS = ["ing", "ed", "en", "es", "s", "er", "est"] as const;
function stemAndSuffix(word: string): [string, string] {
  for (const suf of INFLECTIONS) {
    if (word.length > suf.length + 2 && word.endsWith(suf)) return [word.slice(0, -suf.length), suf];
  }
  return [word, ""];
}

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

const NUMBER_WORDS = new Set(["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty", "thirty", "forty", "fifty", "sixty",
  "seventy", "eighty", "ninety", "hundred", "thousand", "half", "quarter", "first", "second", "third"]);

export const LANG: LangPack = {
  preSurface: (s) => s
    .replace(/\b(uh[- ]huh|mm[- ]hmm|mhm)\b/gi, " yes ")
    // Recognition may render spoken units as symbols. Keep their meaning before stripping punctuation.
    .replace(/[%％﹪]/g, " percent ")
    .replace(/\bper\s+cent\b/gi, "percent")
    .replace(/&/g, " and ")
    .replace(/(\d)\s*°\s*F\b/gi, "$1 degrees fahrenheit ")
    .replace(/(\d)\s*°\s*C\b/gi, "$1 degrees celsius ")
    .replace(/(\d)\s*°/g, "$1 degrees ")
    .replace(/(\d)\s*¢/g, "$1 cents ")
    // Fractions before a measurement are not dates ("1/2 inch" at the salon).
    .replace(/\b1\s*[\/⁄]\s*2(?=\s*(?:an?\s+)?(?:inch(?:es)?|cm|centimet(?:er|re)s?)\b)/gi, "half")
    .replace(/(\d)½/g, "$1 and a half ")
    .replace(/½/g, " half ").replace(/¼/g, " quarter ").replace(/¾/g, " three quarters "),
  currency: { "$": "dollars", "€": "euros", "£": "pounds" },
  ordinalSuffix: /(\d)(st|nd|rd|th)\b/g,
  expand(tok, next, contextAware) {
    const amb = AMBIGUOUS_CONTRACTIONS[tok];
    if (amb) {
      if (!contextAware) return amb;
      const perfect = looksLikePastParticiple(next);
      return tok.endsWith("'s")
        ? amb.filter((c) => c.endsWith(perfect ? " has" : " is"))
        : amb.filter((c) => c.endsWith(perfect ? " had" : " would"));
    }
    if (CONTRACTIONS[tok]) return [CONTRACTIONS[tok]];
    if (INFORMAL[tok]) return [INFORMAL[tok]];
    if (/^[a-z]+'s$/.test(tok)) return [tok.replace(/'s$/, "s"), tok.replace(/'s$/, " is")];
    return [tok.replace(/'/g, "")];
  },
  softFillers: new Set(["um", "umm", "uhm", "uh", "uhh", "er", "erm", "err", "hmm", "hm", "mm", "mmm", "ah", "ahh", "eh"]),
  stripPlease(toks) {
    let please = false;
    const out = toks.filter((t) => {
      if (t === "please" || t === "pls" || t === "plz") { please = true; return false; }
      return true;
    });
    return { toks: out, please };
  },
  pleaseAlone: ["yes"],
  noPause: (input) => /^\W*(?:(?:u+m+|u+h+m?|e+r+m*|h+m+|a+h+|eh)\W+)*(no|nope|nah)\s*[,.!;:–—-]/i.test(input),
  invertedQuestion(toks) {
    for (let i = 0; i + 2 < toks.length; i++) {
      if (!WH.has(toks[i])) continue;
      let j = i + 1;
      if (toks[i] === "what" && (toks[j] === "time" || toks[j] === "kind")) j++;
      if (toks[i] === "how" && (toks[j] === "much" || toks[j] === "many" || toks[j] === "long")) j++;
      if (SUBJ.has(toks[j]) && AUX.has(toks[j + 1])) return [...toks.slice(0, j), toks[j + 1], toks[j], ...toks.slice(j + 2)];
      return null;
    }
    return null;
  },
  negation: new Set(["not", "no", "never", "without", "nothing", "none", "neither", "nor", "nobody", "nope", "nah"]),
  // "know" for "no" is the only accepted negation homophone.
  negationHomophone: (heard, target) => (heard === "know" && target === "no") ? 0.95 : 0,
  // "bye" is no homophone of "by": "…by Monday at the latest" must never say goodbye (a recogniser writes "bye" for it)
  homophones: [
    ["for", "four", "fore"], ["to", "too", "two", "tu"], ["the", "thee", "thuh", "duh", "de", "tha"],
    ["a", "ay"], ["no", "know"], ["hear", "here"], ["their", "there", "they're"], ["one", "won"],
    ["see", "sea"], ["right", "write", "wright"], ["sun", "son"], ["buy", "by"], ["i", "eye", "aye"],
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
  ],
  // Learner grammar: words a listener easily maps onto each other because the meaning stays
  // clear ("pay by cash", "may I pay…", "he have", "I would like to ordering"). A small cost
  // keeps the exact form preferred. Direction words (from/to, in/out) are never swapped.
  grammarClasses: [
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
  ],
  /** Same word with another ending: "want"/"wants", "book"/"booked", "order"/"ordering".
   *  ("card" and "car" are different words: a bare -d is not an ending.) */
  inflectionVariant(a, b) {
    if (Math.min(a.length, b.length) < 3) return false;
    const sb = new Set(stems(b));
    return stems(a).some((x) => x.length >= 3 && sb.has(x));
  },
  inflectionMismatch(a, b) {
    const [as, af] = stemAndSuffix(a);
    const [bs, bf] = stemAndSuffix(b);
    return as === bs && af !== bf;
  },
  sameStart: (heard, target) => heard[0] === target[0],
  droppable: new Map([
    ["a", 0.15], ["an", 0.15], ["the", 0.15], ["some", 0.2],
    ["to", 0.25], ["of", 0.3], ["is", 0.35], ["are", 0.35], ["am", 0.35],
    ["do", 0.3], ["does", 0.3], ["did", 0.35],
    ["for", 0.35], ["in", 0.35], ["on", 0.35], ["at", 0.35], ["with", 0.35], ["by", 0.35],
    ["i", 0.5], ["it", 0.45], ["my", 0.3],
  ]),
  /** "it" may be missing only as a subject ("[it] is my wallet", "[it] was very nice"), never as an object. */
  keepDroppable: (tok, next) => tok === "it" && !SUBJECT_IT_BEFORE.has(next as string),
  skippable: new Map([
    ["a", 0.2], ["an", 0.2], ["the", 0.2], ["some", 0.2], ["to", 0.3], ["of", 0.3],
    ["am", 0.3], ["is", 0.3], ["are", 0.3], ["do", 0.3], ["does", 0.3],
    ["just", 0.1], ["really", 0.2], ["very", 0.2], ["so", 0.2], ["also", 0.2], ["too", 0.2],
    ["maybe", 0.2], ["actually", 0.1], ["like", 0.35], ["then", 0.25], ["now", 0.25],
    ["okay", 0.2], ["yeah", 0.2], ["well", 0.2], ["oh", 0.15], ["and", 0.3], ["please", 0.1],
  ]),
  patternWords(toks) {
    // "please" is removed from the learner's input (and recorded as a flag), so patterns ignore it too
    const kept = toks.filter((t) => t !== "please" && t !== "pls" && t !== "plz");
    // an author's "driver s license" means the possessive "driver's" (heard as "drivers")
    const out: Tokens = [];
    for (const t of kept) {
      if (t === "s" && out.length && /^[a-z]+$/.test(out[out.length - 1])) out[out.length - 1] += "s";
      else out.push(t);
    }
    return out;
  },
  display: (s) => s.replace(/\bi\b/g, "I").replace(/\bi'(m|ll|d|ve)\b/gi, (_m, x) => `I'${x}`),
  confirm: new Set([
    "yes", "yeah", "yep", "yup", "yes yes", "yeah yeah", "sure", "correct", "exactly", "yes exactly", "yes correct",
    "that's right", "yes that's right", "yeah that's right", "yes i did", "i did", "taip", "taip taip", "jo",
  ]),
  /** What an English recogniser writes for a spoken „taip“. */
  confirmSpoken: new Set(["type", "tape", "tipe"]),
  confirmIgnore: ["oh", "please", "prasau", "okay", "ok"],

  articles: new Set(["a", "an", "the"]),
  aloneAfterArticle: /^(one|ones|other|others|same|lot|bit|\d+)$/,
  notAThingStart: new Set(["it", "to", "i", "you", "we", "he", "she", "they", "them", "him", "her", "me", "us",
    "am", "is", "are", "was", "were", "be", "been", "do", "does", "did", "have", "has", "had", "will", "would", "can", "could", "should", "not"]),

  leads: [
    ["greet", "hi | hello | hey | hi there | hello there | hey there | good morning | good afternoon | good evening | morning | evening | howdy | hello again | hi again | yes hello | good day"],
    ["open", "oh | okay | so | well | right | all right | alright | great | perfect | cool | awesome | nice | good | actually | hmm | ah | wow | now | also | and also | plus | and | um so | so um | okay so | okay um | yeah so | so yeah | well actually | oh okay | ah okay | oh right | oh yes | right so | okay good | okay then | let me see | let me think | i think | i guess | maybe | just | honestly | basically | you know | i mean | listen | look | yes so | oh sorry | oh well | oh hi | aw | aww | oh wow | really | oh really | wow really"],
    ["sorry", "sorry | excuse me | pardon me | i am sorry | so sorry | sorry to bother you | excuse me please | sorry sorry"],
    // courtesy before a refusal: only what follows "but" is the answer ("Thank you, but I can't accept it")
    ["but", "thank you but | thanks but | thank you so much but | thank you very much but | i would love to but | i would like to but | i would really like to but | that sounds great but | sounds great but | that sounds nice but | sounds good but | that is very kind but | that is so kind but | that is nice but | it sounds good but | i am sorry but | sorry but | good idea but | i know but"],
    ["help", "one question | quick question | i have a question | i have a quick question | can you help me | could you help me | can you help me please | i need help | i need your help | i have a problem | i have a small problem | we have a problem"],
  ],
  tails: [
    ["thanks", "thanks | thank you | thank you very much | thank you so much | thanks a lot | thanks so much | many thanks | cheers | ta | thanks again | thank you again | thanks a bunch | much appreciated | i appreciate it | appreciate it"],
    // "Card is fine", "Medium would be great", "Two nights works": an answer plus its own acceptance
    ["accept", "is fine | is good | is okay | is ok | is great | is perfect | is fine for me | would be great | would be fine | would be nice | would be perfect | will do | works | works for me | sounds good | is all right"],
    ["soft", "then | for me | too | as well | if possible | if you can | if that is okay | if that is ok | if it is possible | if you do not mind | right | okay | i think | i guess | maybe | for now | right now | now | also | is that okay | is that all right | is that possible | is it possible | if that is possible | if you have it | if you have one | ok | yeah | you know | sorry | if that is all right | actually | is it okay | is it ok | it is okay | it is ok | is it fine | is it possible | it is possible | is this okay | is this ok | is that fine | yes"],
  ],
  vocatives: "sir | madam | miss | officer | doctor | buddy | man | dude | my friend | guys | mister | folks | everyone",
  vocativeForms(name) {
    const words = name.toLowerCase().replace(/[^a-z\s'-]/g, " ").split(/[\s-]+/).filter(Boolean);
    if (!words.length) return [];
    return words.length > 1 ? [words.join(" "), words[words.length - 1], words[0]] : [words.join(" ")];
  },
  yesLead: "that is fine | that is okay | that sounds good | sounds good | no problem | no worries | yes | yeah | yep | yup | sure | okay | ok | of course | definitely | absolutely | yes please | yeah please | sure thing | exactly | yes exactly | that is right | yes that is right | you are right | correct | why not | yes i am | yes i do | yes i have | yes i can | yes i would | yes it is | yes we are | yes we do",
  noLead: "no | nope | nah | no thanks | no thank you | not really | not now | not yet | not exactly | i do not think so | no sorry | sorry no | not today | not right now | unfortunately not | i am afraid not | maybe later | no i am not | no i do not | no i have not | no i can not | no it is not | no we do not | no i would not",
  yes: "yes go ahead | i would like to | yes i would like to | yes it is correct | yes it is right | yeah it is correct | it is correct | [yes | yeah | sure | oh] [that | it] (would be | sounds | is) [very | really | so] (nice | great | good | perfect | wonderful | lovely | helpful | kind | amazing) | i think so | i guess so | yes i think so | probably | yes do | yes it does | yes there is | yes i have | yes i did | yes i will | yes we are | yes we have | yes we did | that is fine | that is okay | that is good | that works for me | works for me | that sounds good | okay sure | sure okay | yeah sure | yes okay | okay yes | no problem | sure no problem | of course yes | yes yes | yeah yeah | deal | let us do (it | that) | yes sir | yes madam | yes please thank you | yes thank you | yeah thanks | sure thanks | okay thanks | okay thank you | why not | yes | yeah | yep | yup | sure | of course | definitely | absolutely | okay | ok | yes please | yeah please | sure thing | why not | that would be great | that would be nice | sounds good | that is right | that is correct | correct | right | exactly | yes it is | yes i do | yes i am | yes i would | yes i can | yes we do | i do | i would | i would love to | i would like that | yes definitely | uh huh | [yes | sure | yeah] (that is | that would be | that will be) (fine | okay | great | perfect | good | lovely) | that works | fine | fine by me | sounds great | perfect | yes sure | sure why not | go ahead | yes of course | yes that works | [yes | yeah | yep] that is (right | correct) | yes correct | yes exactly | yes right | yes indeed | yes it is | yes that is me | that is me",
  no: "no i am (fine | okay | good) [thanks | thank you] | no (thank you | thanks) it is (okay | fine | all right) | no it is okay thanks | that is all | that is everything | that is all for now | that is all for today | that is everything for today | no that is all | no that is everything | nothing else | no nothing else | i am all set | no i am all set | all set | not today | not right now | unfortunately not | i am afraid not | i am afraid not sorry | maybe later | maybe next time | not this time thanks | i do not think so | no i do not think so | not really no | no not really | no no | no i did not | no i have not | no it does not | no there is not | no we did not | no i will not | no i can not | not now thanks | no that is fine | no that is all right | no it is all right | no need thanks | nope sorry | no sir | no madam | definitely not | absolutely not | of course not | no thanks i am fine | no thank you i am fine | no | nope | nah | no thanks | no thank you | not really | not today | not now | not this time | no i do not | no i am not | no i would not | no it is not | no it is fine | no that is okay | i do not | no need | not at all | no it is okay | no thanks i am good | not for me | i will pass | no i am good | no that is not (right | correct) | that is not (right | correct) | not quite | no that is wrong | no sorry | sorry no | no i am sorry | sorry not really | no we do not | we do not | no we are not | we are not | no we have not | not yet",
  ynConnectors: "but | and | so | also | and also",
  connectors: "and | and also | also | plus | but | oh and | and then | then | so | or | actually | maybe",
  numberWords: NUMBER_WORDS,
  keyWords: new Set(["what", "where", "when", "why", "how", "which", "who", "whose", "whom",
    "is", "are", "am", "was", "were", "do", "does", "did", "can", "could", "will", "would", "should", "shall",
    "may", "might", "must", "have", "has", "had"]),
  possessives: new Set(["my", "your", "his", "her", "our", "their", "its"]),
  clauseNegators: new Set(["not", "never"]),
  pieceNegators: new Set(["not", "never"]),
  auxiliaries: new Set(["do", "does", "did", "is", "are", "was", "were", "will", "would", "can", "could", "should", "have", "has", "had"]),
  predicateAux: new Set(["does", "is", "was", "has", "would", "will", "are", "were"]),
  subjectPronouns: new Set(["i", "you", "we", "he", "she", "it", "they", "there", "this", "that"]),
  newPart: new Set(["i", "we", "you", "he", "she", "it", "they", "there", "this", "that", "yes", "no",
    "just", "only", "but", "instead", "rather", "actually", "maybe", "probably", "perhaps", "about", "around",
    "can", "could", "would", "will", "do", "does", "did", "is", "are", "was", "were", "should", "may", "shall",
    "what", "where", "when", "why", "how", "which", "who",
    "since", "because", "so", "and", "or", "then", "now", "today", "tomorrow", "yesterday", "anymore", "yet",
    "thanks", "thank", "bye", "goodbye", "see", "hi", "hello", "sorry", "please", "okay", "sure",
    "throw", "keep", "take", "give", "put", "send", "call", "tell", "show", "bring", "let", "wait", "start", "go",
    "come", "check", "try", "make", "look", "leave", "stop", "turn", "help"]),
  // "not bad, a little tired"
  newPartPair: (t, next) => t === "a" && (next === "little" || next === "bit"),
  determiners: new Set(["the", "a", "an", "my", "your", "our", "his", "her", "their"]),
  verbOrAside: new Set(["throw", "keep", "take", "give", "put", "send", "call", "tell", "show", "bring", "let", "wait",
    "start", "go", "come", "check", "try", "make", "look", "leave", "stop", "turn", "help", "maybe", "probably", "perhaps",
    "about", "around", "since", "because", "so", "then", "now", "today", "tomorrow", "yesterday", "anymore", "yet", "please"]),
  noWord: "no",
  // after "no", a noun or adjective makes "no" a determiner ("no cash"); anything else starts a correction or a clause
  correctionStarters: new Set(["to", "for", "in", "with", "at", "by", "on", "from", "just", "only", "actually", "but",
    "the", "a", "an", "this", "that", "i", "we", "it", "you", "he", "she", "they", "there", "here", "my", "your", "our",
    "can", "could", "would", "will", "should", "do", "does", "did", "is", "are", "was", "were", "have", "has", "not", "never",
    "maybe", "please", "rather", "instead", "make", "let", "sorry", "thanks", "thank", "okay", "sure", "yes", "now", "then",
    "what", "where", "when", "why", "how", "which", "who", "go", "come", "wait", "keep", "take", "give", "put", "tell",
    // "no me and my wife", "no mine is black", "no all good", "no no questions", "no tomorrow" (speech recognition writes no comma)
    "me", "us", "him", "them", "mine", "yours", "ours", "all", "no", "nothing", "none", "tomorrow", "today", "tonight", "next", "noon"]),
  /** "i want" / "we want" (not "i do not want", not "want" alone) as "i would like": null if there is none. */
  wantAsWouldLike(toks) {
    let hit = false;
    const out: Tokens = [];
    toks.forEach((t, i) => {
      if (t === "want" && (toks[i - 1] === "i" || toks[i - 1] === "we")) { out.push("would", "like"); hit = true; }
      else out.push(t);
    });
    return hit ? out : null;
  },
  leavingContinues: new Set(["to"]),

  /** English spelling folded to its consonants, with the differences a Lithuanian accent or a recogniser blurs
   *  (t/d, p/b, k/g, s/z, v/w, ch/j) made equal. "latte", "lotta", "lady", "la tay" → "lt". */
  soundKey(word) {
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
  },
  soundEdge: new Set(["a", "an", "the", "of", "to", "and", "or", "i", "you", "it", "is", "am", "are", "be", "please", "one", "some", "my", "your", "for", "with", "in", "on", "at", "can", "could", "get", "have", "like", "want", "would", "just", "yes", "yeah", "okay", "ok", "thanks", "thank", "uh", "um"]),
  soundVowelish: new Set(["of", "a", "uh"]),
  soundTail: new Set(["please", "thanks", "thank", "you"]),

  // (curly apostrophes as straight ones: "don’t"; "cannot" as one word)
  hasNegation: (text) => text.toLowerCase().replace(/[’‘]/g, "'").split(/[^a-z']+/).some((w) => LANG.negation.has(w) || w === "cannot" || w.endsWith("n't")),
  checkYes: /^(yes|yeah|yep|yup|sure|right|correct|exactly)[,!]?\s+(that's it|that is it|that's right|that is right|exactly|correct|please|thanks|thank you)$/,
  checkNo: /^(no|nope|nah)[,.!]?\s+(.+)$/i,
  light: new Set([
    "a", "an", "the", "i", "you", "we", "he", "she", "it", "they", "me", "my", "your", "our", "us", "him", "her", "them",
    "to", "of", "for", "in", "on", "at", "with", "by", "from", "and", "or", "but", "so", "if",
    "is", "am", "are", "was", "were", "be", "been", "do", "does", "did", "have", "has", "had",
    "can", "could", "would", "will", "shall", "should", "may", "might", "must",
    "some", "this", "that", "these", "those", "there", "here", "just", "oh", "okay", "yeah", "well", "please", "too", "also", "very",
  ]),
  wh: new Set(["what", "where", "when", "why", "how", "who", "which", "whose"]),
  digitWords: ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
    "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"],
  markIgnore: new Set(["please"]),
};

/** "it" is a subject before these ("[it] is my wallet"). */
const SUBJECT_IT_BEFORE = new Set(["is", "was", "will", "would", "looks", "sounds", "seems", "has", "does", "can", "could", "should", "might", "must"]);
