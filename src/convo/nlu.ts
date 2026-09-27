// Utterance understanding: builds the top-level grammar for a situation and
// ranks full parses. A parse must cover the whole utterance.
//
//   UTTERANCE := LEAD* BODY TAIL*
//   BODY      := YESNO? INTENT (CONNECTOR? INTENT){0,2}   |   YESNO
//
// Leads are greetings and discourse openers ("hi", "oh", "okay", "sorry", "excuse me");
// tails are thanks and softeners ("thanks", "then", "for me", "too"). They set flags.

import { Grammar, mk, parsePattern, type GNode, type Res } from "./grammar";
import { tokenizeInput, NEGATION_TOKENS, DROPPABLE, SKIPPABLE, type Tokens } from "./normalize";
import { BUILTIN_SLOTS, isKnownName } from "./slots";

export interface ParsedSegment { intent: string; slots: Record<string, any>; tags: string[] }
export interface Parse {
  segments: ParsedSegment[];
  yn?: "yes" | "no";
  flags: Set<string>;
  tags: string[];
  cost: number;
  tokens: Tokens;
}
export interface NluResult {
  ok: boolean;
  best?: Parse;
  alternatives: Parse[];
  /** The input could still become an accepted response if the learner keeps talking. */
  prefix: boolean;
  tokens: Tokens;
}

const LEADS: [string, string][] = [
  ["greet", "hi | hello | hey | hi there | hello there | hey there | good morning | good afternoon | good evening | morning | evening | howdy | hello again | hi again | yes hello | good day"],
  ["open", "oh | okay | so | well | right | all right | alright | great | perfect | cool | awesome | nice | good | actually | hmm | ah | wow | now | also | and also | plus | and | um so | so um | okay so | okay um | yeah so | so yeah | well actually | oh okay | ah okay | oh right | oh yes | right so | okay good | okay then | let me see | let me think | i think | i guess | maybe | just | honestly | basically | you know | i mean | listen | look | yes so | oh sorry | oh well | oh hi | aw | aww | oh wow | really | oh really | wow really"],
  ["sorry", "sorry | excuse me | pardon me | i am sorry | so sorry | sorry to bother you | excuse me please | sorry sorry"],
  // courtesy before a refusal: only what follows "but" is the answer ("Thank you, but I can't accept it")
  ["but", "thank you but | thanks but | thank you so much but | thank you very much but | i would love to but | i would like to but | i would really like to but | that sounds great but | sounds great but | that sounds nice but | sounds good but | that is very kind but | that is so kind but | that is nice but | it sounds good but | i am sorry but | sorry but | good idea but | i know but"],
  ["help", "one question | quick question | i have a question | i have a quick question | can you help me | could you help me | can you help me please | i need help | i need your help | i have a problem | i have a small problem | we have a problem"],
];
const TAILS: [string, string][] = [
  ["thanks", "thanks | thank you | thank you very much | thank you so much | thanks a lot | thanks so much | many thanks | cheers | ta | thanks again | thank you again | thanks a bunch | much appreciated | i appreciate it | appreciate it"],
  // "Card is fine", "Medium would be great", "Two nights works": an answer plus its own acceptance
  ["accept", "is fine | is good | is okay | is ok | is great | is perfect | is fine for me | would be great | would be fine | would be nice | would be perfect | will do | works | works for me | sounds good | is all right"],
  ["soft", "then | for me | too | as well | if possible | if you can | if that is okay | if that is ok | if it is possible | if you do not mind | right | okay | i think | i guess | maybe | for now | right now | now | also | is that okay | is that all right | is that possible | is it possible | if that is possible | if you have it | if you have one | ok | yeah | you know | sorry | if that is all right | actually | is it okay | is it ok | it is okay | it is ok | is it fine | is it possible | it is possible | is this okay | is this ok | is that fine | yes"],
];
/** Generic ways of addressing someone; the situation adds its NPCs' names (see setVocatives). */
const VOCATIVES = "sir | madam | miss | officer | doctor | buddy | man | dude | my friend | guys | mister | folks | everyone";
/** Short yes/no interjections that may lead into another intent ("No, to go"). */
const YES_LEAD = "that is fine | that is okay | that sounds good | sounds good | no problem | no worries | yes | yeah | yep | yup | sure | okay | ok | of course | definitely | absolutely | yes please | yeah please | sure thing | exactly | yes exactly | that is right | yes that is right | you are right | correct | why not | yes i am | yes i do | yes i have | yes i can | yes i would | yes it is | yes we are | yes we do";
const NO_LEAD = "no | nope | nah | no thanks | no thank you | not really | not now | not yet | not exactly | i do not think so | no sorry | sorry no | not today | not right now | unfortunately not | i am afraid not | maybe later | no i am not | no i do not | no i have not | no i can not | no it is not | no we do not | no i would not";
const YES = "yes go ahead | i would like to | yes i would like to | yes it is correct | yes it is right | yeah it is correct | it is correct | [yes | yeah | sure | oh] [that | it] (would be | sounds | is) [very | really | so] (nice | great | good | perfect | wonderful | lovely | helpful | kind | amazing) | i think so | i guess so | yes i think so | probably | yes do | yes it does | yes there is | yes i have | yes i did | yes i will | yes we are | yes we have | yes we did | that is fine | that is okay | that is good | that works for me | works for me | that sounds good | okay sure | sure okay | yeah sure | yes okay | okay yes | no problem | sure no problem | of course yes | yes yes | yeah yeah | deal | let us do (it | that) | yes sir | yes madam | yes please thank you | yes thank you | yeah thanks | sure thanks | okay thanks | okay thank you | why not | yes | yeah | yep | yup | sure | of course | definitely | absolutely | okay | ok | yes please | yeah please | sure thing | why not | that would be great | that would be nice | sounds good | that is right | that is correct | correct | right | exactly | yes it is | yes i do | yes i am | yes i would | yes i can | yes we do | i do | i would | i would love to | i would like that | yes definitely | uh huh | [yes | sure | yeah] (that is | that would be | that will be) (fine | okay | great | perfect | good | lovely) | that works | fine | fine by me | sounds great | perfect | yes sure | sure why not | go ahead | yes of course | yes that works | [yes | yeah | yep] that is (right | correct) | yes correct | yes exactly | yes right | yes indeed | yes it is | yes that is me | that is me";
const NO = "no i am (fine | okay | good) [thanks | thank you] | no (thank you | thanks) it is (okay | fine | all right) | no it is okay thanks | that is all | that is everything | that is all for now | that is all for today | that is everything for today | no that is all | no that is everything | nothing else | no nothing else | i am all set | no i am all set | all set | not today | not right now | unfortunately not | i am afraid not | i am afraid not sorry | maybe later | maybe next time | not this time thanks | i do not think so | no i do not think so | not really no | no not really | no no | no i did not | no i have not | no it does not | no there is not | no we did not | no i will not | no i can not | not now thanks | no that is fine | no that is all right | no it is all right | no need thanks | nope sorry | no sir | no madam | definitely not | absolutely not | of course not | no thanks i am fine | no thank you i am fine | no | nope | nah | no thanks | no thank you | not really | not today | not now | not this time | no i do not | no i am not | no i would not | no it is not | no it is fine | no that is okay | i do not | no need | not at all | no it is okay | no thanks i am good | not for me | i will pass | no i am good | no that is not (right | correct) | that is not (right | correct) | not quite | no that is wrong | no sorry | sorry no | no i am sorry | sorry not really | no we do not | we do not | no we are not | we are not | no we have not | not yet";

const NUMBER_WORDS = new Set(["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty", "thirty", "forty", "fifty", "sixty",
  "seventy", "eighty", "ninety", "hundred", "thousand", "half", "quarter", "first", "second", "third"]);

/** Question words and auxiliaries: they decide whether a sentence is a question, a statement or a request. */
const KEY_WORDS = new Set(["what", "where", "when", "why", "how", "which", "who", "whose", "whom",
  "is", "are", "am", "was", "were", "do", "does", "did", "can", "could", "will", "would", "should", "shall",
  "may", "might", "must", "have", "has", "had"]);
const POSSESSIVES = new Set(["my", "your", "his", "her", "our", "their", "its"]);
/** Words that start a new clause with its own subject ("No, I'm not. I need a taxi."). */
const SUBJECTS = new Set(["i", "we", "you", "he", "she", "it", "they", "that", "this", "there", "my", "our", "your", "no", "yes"]);

/** A reading that cuts a negation off from what follows it: "I don't | want to open an account",
 *  "Please don't | turn it up". A piece may end in "not"/"never" only if the next piece starts a new
 *  clause. (Complete answers like "None" or "Nothing" may be followed by more: "None, only hand luggage".) */
function negationCutOff(r: { caps: { name: string; value: unknown; from: number; to: number }[] }, toks: Tokens): boolean {
  const segs = r.caps.filter((c) => c.name === "__intent").sort((a, b) => a.from - b.from);
  for (let i = 0; i < segs.length; i++) {
    const c = segs[i];
    // a piece right after "not"/"never" (after another piece, or after "No, I don't") must start a new
    // clause: "No, I don't | want coffee" is not "no" + an order
    const before = c.from > 0 ? toks[c.from - 1] : "";
    if ((before === "not" || before === "never") && !startsNewPart(toks, c.from, c.to, true)) return true;
    if (i === 0) continue;
    const prev = segs[i - 1];
    // after a negative piece, the next one must start something new (a clause, a question, a contrast):
    // "I don't have | my passport" is not handing over the passport. Two pieces of the same answer are
    // fine ("Not much, the usual").
    const sameAnswer = (prev.value as any)?.__id === (c.value as any)?.__id;
    if (!sameAnswer && toks.slice(prev.from, prev.to).some((t) => t === "not" || t === "never") && !startsNewPart(toks, c.from, c.to)) return true;
    // a piece can't begin with the verb of the previous one: "tomorrow | doesn't work", "the steak | is not
    // good", "full coverage | would be too expensive" (a question is fine: "Not bad. | Are you free?")
    if (c.from === prev.to && PREDICATE_AUX.has(toks[c.from]) && !SUBJ_PRONOUNS.has(toks[c.from + 1])) return true;
  }
  return false;
}
const AUXILIARIES = new Set(["do", "does", "did", "is", "are", "was", "were", "will", "would", "can", "could", "should", "have", "has", "had"]);
const PREDICATE_AUX = new Set(["does", "is", "was", "has", "would", "will", "are", "were"]);
const SUBJ_PRONOUNS = new Set(["i", "you", "we", "he", "she", "it", "they", "there", "this", "that"]);
/** Words that begin a new clause, question, command, contrast or aside (not an object of what came before). */
const NEW_PART = new Set(["i", "we", "you", "he", "she", "it", "they", "there", "this", "that", "yes", "no",
  "just", "only", "but", "instead", "rather", "actually", "maybe", "probably", "perhaps", "about", "around",
  "can", "could", "would", "will", "do", "does", "did", "is", "are", "was", "were", "should", "may", "shall",
  "what", "where", "when", "why", "how", "which", "who",
  "since", "because", "so", "and", "or", "then", "now", "today", "tomorrow", "yesterday", "anymore", "yet",
  "thanks", "thank", "bye", "goodbye", "see", "hi", "hello", "sorry", "please", "okay", "sure",
  "throw", "keep", "take", "give", "put", "send", "call", "tell", "show", "bring", "let", "wait", "start", "go",
  "come", "check", "try", "make", "look", "leave", "stop", "turn", "help"]);
const DETERMINERS = new Set(["the", "a", "an", "my", "your", "our", "his", "her", "their"]);
/** Words that would continue a negated verb ("don't | turn it up", "not | today"): after "not" itself they
 *  never start a new part. */
const VERB_OR_ASIDE = new Set(["throw", "keep", "take", "give", "put", "send", "call", "tell", "show", "bring", "let", "wait",
  "start", "go", "come", "check", "try", "make", "look", "leave", "stop", "turn", "help", "maybe", "probably", "perhaps",
  "about", "around", "since", "because", "so", "then", "now", "today", "tomorrow", "yesterday", "anymore", "yet", "please"]);
function startsNewPart(toks: Tokens, from: number, to: number, rightAfterNot = false): boolean {
  const t = toks[from];
  if (rightAfterNot && VERB_OR_ASIDE.has(t)) return false;
  if (NEW_PART.has(t)) return true;
  if (t === "a" && (toks[from + 1] === "little" || toks[from + 1] === "bit")) return true; // "not bad, a little tired"
  // "the heating isn't working": a noun phrase that is the subject of its own verb
  if (DETERMINERS.has(t)) return toks.slice(from + 1, to).some((w) => AUXILIARIES.has(w) || w === "am");
  return false;
}

// after "no", a noun or adjective makes "no" a determiner ("no cash"); anything else starts a correction or a clause
const CORRECTION_STARTERS = new Set(["to", "for", "in", "with", "at", "by", "on", "from", "just", "only", "actually", "but",
  "the", "a", "an", "this", "that", "i", "we", "it", "you", "he", "she", "they", "there", "here", "my", "your", "our",
  "can", "could", "would", "will", "should", "do", "does", "did", "is", "are", "was", "were", "have", "has", "not", "never",
  "maybe", "please", "rather", "instead", "make", "let", "sorry", "thanks", "thank", "okay", "sure", "yes", "now", "then",
  "what", "where", "when", "why", "how", "which", "who", "go", "come", "wait", "keep", "take", "give", "put"]);
/** The piece right after a bare leading "no" starts with a noun ("no cash"): "no" is a determiner there. */
function noIsDeterminer(r: { caps: { name: string; from: number }[] }, toks: Tokens): boolean {
  const first = r.caps.filter((c) => c.name === "__intent").sort((a, b) => a.from - b.from)[0];
  if (!first || first.from === 0) return false;
  const before = toks[first.from - 1];
  return (before === "no" || before === "nope" || before === "nah") && !CORRECTION_STARTERS.has(toks[first.from]);
}

/** "Again", "What?", "Sorry?" asking to repeat only mean that on their own, not inside a longer
 *  sentence ("The train is late again"). */
function strayRepeat(r: { caps: { name: string; value: unknown; from: number; to: number }[] }): boolean {
  const segs = r.caps.filter((c) => c.name === "__intent");
  if (segs.length < 2) return false;
  return segs.some((c) => (c.value as any)?.__id === "g_repeat" && c.to - c.from <= 2);
}

/** "I have to go" (a goodbye tagged #leaving) is one only as the last thing said, or before thanks or another
 *  goodbye: "I have to go | to the airport" and "I need to leave | at seven" are not goodbyes. */
const AFTER_LEAVING = new Set(["g_bye", "g_thanks", "g_sorry", "g_ok"]);
const isLeaving = (c: { name: string; value: unknown }) => c.name === "__intent" && !!((c.value as any)?.__tags as string[] | undefined)?.includes("leaving");
function leavingCutOff(r: { caps: { name: string; value: unknown; from: number; to: number }[] }, toks: Tokens): boolean {
  const segs = r.caps.filter((c) => c.name === "__intent").sort((a, b) => a.from - b.from);
  const i = segs.findIndex(isLeaving);
  if (i < 0) return false;
  // nor inside a question ("Where do | I have to go?", "Where do I | have to go?"); "…go to work" is no
  // "go" + the tails "too" and "works"
  const b1 = toks[segs[i].from - 1] ?? "", b2 = toks[segs[i].from - 2] ?? "";
  if (KEY_WORDS.has(b1) || (SUBJ_PRONOUNS.has(b1) && KEY_WORDS.has(b2)) || toks[segs[i].to] === "to") return true;
  return segs.slice(i + 1).some((c) => !AFTER_LEAVING.has((c.value as any)?.__id));
}

/** Slots that hold a person's name. */
const NAME_KEYS = new Set(["name", "surname", "first", "last"]);
/** How many words of names a piece captured (0: none). */
function nameWords(v: unknown): number {
  let n = 0;
  if (!v || typeof v !== "object" || Array.isArray(v)) return 0;
  for (const [k, x] of Object.entries(v)) {
    if (NAME_KEYS.has(k)) { for (const s of [x].flat()) if (typeof s === "string") n += s.split(" ").length; }
    else n += nameWords(x);
  }
  return n;
}
/** One run of words read as several names: "Labas, aš noriu kavos" is not "Labas" + "Aš Noriu Kavos",
 *  and "Tomas Mikalauskas" is one name. A name piece after another one needs words of its own ("Tomas,
 *  my last name is Mikalauskas"), unless it holds the learner's own name ("Tomas. Last name Mikalauskas"). */
function splitNames(r: { caps: { name: string; value: unknown; from: number; to: number }[] }, toks: Tokens): boolean {
  const segs = r.caps.filter((c) => c.name === "__intent").sort((a, b) => a.from - b.from);
  let prev = 0;
  for (const c of segs) {
    const n = nameWords(c.value);
    if (n && prev && n === c.to - c.from && !toks.slice(c.from, c.to).some(isKnownName)) return true;
    prev = n;
  }
  return false;
}

/** Slots whose value is free text: a name, spelled letters, digits or unknown words. */
const FREE_SLOTS = new Set(["name", "letters", "w", "digits", "text", "surname", "first", "last"]);
function hasFreeSlot(slots: Record<string, any>): boolean {
  for (const [k, v] of Object.entries(slots)) {
    if (FREE_SLOTS.has(k)) return true;
    if (v && typeof v === "object" && !Array.isArray(v) && hasFreeSlot(v)) return true;
  }
  return false;
}

export class Nlu {
  base: Grammar;
  g: Grammar;
  private intents = new Map<string, GNode>();
  private globalIds = new Set<string>();
  /** Sentence grammars by the set of context-only intents the current question allows. */
  private tops = new Map<string, GNode>();
  private shared: { lead: GNode; tail: GNode; yn: GNode; ynLead: GNode; ynConn: GNode; ynTwice: GNode; conn: GNode } | null = null;
  private catchAll = new Set<string>();
  /** Intents only accepted when the current step/pending question expects them (e.g. a bare name). */
  private contextual = new Set<string>();
  private vocatives = VOCATIVES;

  constructor(base?: Grammar) {
    this.base = base ?? Nlu.makeBase();
    this.g = new Grammar(this.base);
  }

  static makeBase(): Grammar {
    const g = new Grammar();
    g.defineSlots(BUILTIN_SLOTS);
    return g;
  }

  addIntent(id: string, patterns: string[], opts: { global?: boolean; catchAll?: boolean; contextual?: boolean } = {}) {
    const alts = patterns.map((p) => parsePattern(p));
    this.intents.set(id, mk.wrap("__intent", mk.alt(alts), { __id: id }));
    if (opts.global) this.globalIds.add(id);
    if (opts.catchAll) this.catchAll.add(id);
    if (opts.contextual) this.contextual.add(id);
    this.tops.clear();
  }
  /** Names the learner may use to address the NPCs of this situation ("Hi Mia, …", "Thanks, officer"). */
  setVocatives(names: string[]) {
    const alts = new Set<string>();
    for (const name of names) {
      const words = name.toLowerCase().replace(/[^a-z\s'-]/g, " ").split(/[\s-]+/).filter(Boolean);
      if (!words.length) continue;
      alts.add(words.join(" "));
      if (words.length > 1) { alts.add(words[words.length - 1]); alts.add(words[0]); }
    }
    this.vocatives = [VOCATIVES, ...alts].join(" | ");
    this.shared = null;
    this.tops.clear();
  }
  hasIntent(id: string) { return this.intents.has(id); }
  intentIds() { return [...this.intents.keys()]; }

  validate(): string[] {
    const errs: string[] = [];
    for (const [id, node] of this.intents) errs.push(...this.g.validate(node, `intent ${id}`));
    return errs;
  }

  private buildShared() {
    // the sentence structure is strict: extra words may be skipped only inside an intent's own pattern
    const S = (items: GNode[]) => mk.seq(items, true);
    const voc = S([parsePattern(this.vocatives, false), mk.tag(["lead:vocative"])]);
    const lead = mk.alt([...LEADS.map(([f, src]) => S([parsePattern(src, false), mk.tag(["lead:" + f])])), voc]);
    const tail = mk.alt([...TAILS.map(([f, src]) => S([parsePattern(src, false), mk.tag(["tail:" + f])])), voc]);
    const yn = mk.alt([
      S([parsePattern(YES, false), mk.tag(["yn:yes"])]),
      S([parsePattern(NO, false), mk.tag(["yn:no"])]),
    ]);
    const ynLead = mk.alt([
      S([parsePattern(YES_LEAD, false), mk.tag(["yn:yes"])]),
      S([parsePattern(NO_LEAD, false), mk.tag(["yn:no"])]),
    ]);
    // "Yes, but can I have two beds?", "No, and …"
    const ynConn = mk.opt(parsePattern("but | and | so | also | and also", false));
    // a yes/no word may also come before a longer yes/no phrase: "Yes, why not", "No, not really"
    const ynTwice = mk.alt([
      S([parsePattern(YES_LEAD, false), parsePattern(YES, false), mk.tag(["yn:yes", "yn:twice"])]),
      S([parsePattern(NO_LEAD, false), parsePattern(NO, false), mk.tag(["yn:no", "yn:twice"])]),
    ]);
    const conn = mk.opt(parsePattern("and | and also | also | plus | but | oh and | and then | then | so | or | actually | maybe", false));
    return { lead, tail, yn, ynLead, ynConn, ynTwice, conn };
  }

  /** The sentence grammar for a turn. Context-only intents (`_ctx`: a bare name, a bare number) are
   *  included only when the current question expects them, so they never crowd out other readings. */
  private build(expected: string[] = []): GNode {
    const allowed = [...this.contextual].filter((id) => expected.includes(id)).sort();
    const key = allowed.join(",");
    const hit = this.tops.get(key);
    if (hit) return hit;
    if (!this.shared) this.shared = this.buildShared();
    const { lead, tail, yn, ynLead, ynConn, ynTwice, conn } = this.shared;
    const S = (items: GNode[]) => mk.seq(items, true);
    const intent = mk.alt([...this.intents.entries()].filter(([id]) => !this.contextual.has(id) || allowed.includes(id)).map(([, n]) => n));
    const intents = S([intent, mk.rep(S([conn, intent]), 0, 2)]);
    const body = mk.alt([S([mk.opt(S([ynLead, ynConn])), intents]), yn, ynTwice]);
    const top = S([mk.rep(lead, 0, 3), body, mk.rep(tail, 0, 3)]);
    this.tops.set(key, top);
    return top;
  }

  /** Parse an utterance. `expected` intents get a ranking bonus. */
  /** `primary`: the intents of the question just asked (a pending question); they win close ties. */
  parse(text: string, expected: string[] = [], primary: string[] = []): NluResult {
    const { variants, please, noPause } = tokenizeInput(text);
    const top = this.build(expected);
    const all: Parse[] = [];
    let prefix = false;
    let tokens: Tokens = variants[0] || [];
    for (const toks of variants) {
      if (!toks.length) continue;
      const res = this.g.match(top, toks, false).filter((r) => r.end === toks.length && !r.partial && !negationCutOff(r, toks) && !strayRepeat(r) && !splitNames(r, toks) && !leavingCutOff(r, toks));
      for (const r of res) {
        const p = this.toParse(r, toks, please, expected, primary);
        if (p.segments.some((sg) => this.contextual.has(sg.intent) && !expected.includes(sg.intent))) continue;
        // "no cash", "no oat milk": "no" + a noun means absence, not "No. Cash." (unless written that way);
        // "no to go", "no just water", "no the large one" are an answer plus a correction
        if (p.yn === "no" && p.segments.length && !noPause && noIsDeterminer(r, toks)) continue;
        all.push(p);
      }
      if (!res.length && !prefix) {
        const pr = this.g.match(top, toks, true);
        if (pr.some((r) => r.partial)) prefix = true;
      }
    }
    all.sort((a, b) => a.cost - b.cost);
    // Nothing (or only a catch-all) understood: a clear answer to the current question plus one or
    // two extra words ("Can I get a latte with caramel?") still counts. Negations and numbers are
    // never dropped, and only an answer the current question expects is accepted this way.
    if (expected.length && (!all.length || all[0].segments.every((sg) => this.catchAll.has(sg.intent)))) {
      const approx = this.approximate(variants, please, expected, top);
      if (approx && (!all.length || approx.cost < all[0].cost)) { all.unshift(approx); prefix = false; }
    }
    if (all.length) tokens = all[0].tokens;
    return { ok: all.length > 0, best: all[0], alternatives: all.slice(0, 6), prefix, tokens };
  }

  private approximate(variants: Tokens[], please: boolean, expected: string[], top: GNode): Parse | null {
    let best: Parse | null = null;
    // Words that decide what kind of sentence it is are never dropped: numbers, question words and
    // auxiliaries ("What is a flat white?" is a question, not an order). A sentence with a negation is
    // never approximated at all ("No cash, only card").
    const undeletable = (t: string) => /\d/.test(t) || NUMBER_WORDS.has(t) || KEY_WORDS.has(t);
    const dropCost = (t: string) => (DROPPABLE.has(t) || SKIPPABLE.has(t) || POSSESSIVES.has(t) ? 0.5 : 1.0);
    const tryTokens = (toks: Tokens, cost: number) => {
      if (!toks.length) return;
      for (const r of this.g.match(top, toks, false)) {
        if (r.end !== toks.length || r.partial || negationCutOff(r, toks)) continue;
        const p = this.toParse(r, toks, please, expected);
        // one clean answer only: an approximate reading never splits into several pieces, and never
        // guesses a name, a spelling or free words (dropping a word there changes what is captured)
        if (p.segments.length !== 1 || !expected.includes(p.segments[0].intent)) continue;
        if (hasFreeSlot(p.segments[0].slots)) continue;
        // "I need to go [to the bank]" is no goodbye with extra words
        if (p.segments[0].tags.includes("leaving")) continue;
        if (p.segments.some((sg) => this.catchAll.has(sg.intent) || (this.contextual.has(sg.intent) && !expected.includes(sg.intent)))) continue;
        p.cost += cost + 0.5;
        // only a confident reading: what is left must match well, and not much may be dropped
        // ("Is the flight to Boston [on time]?" is not a question about the gate)
        if (p.cost > 2.0) continue;
        p.flags.add("approx");
        if (!best || p.cost < best.cost) best = p;
      }
    };
    // Only extra words at the edges are dropped ("…with caramel", "…for my wife", "blah, can I…"):
    // removing a word from the middle can change what the sentence says ("How do I [open] it?").
    for (const toks of variants.slice(0, 4)) {
      const n = toks.length;
      if (n < 4 || toks.some((t) => NEGATION_TOKENS.has(t))) continue;
      const cuts: [number, number][] = [[0, 1], [0, 2], [n - 1, n], [n - 2, n], [n - 3, n]];
      for (const [a, b] of cuts) {
        if (a < 0 || n - (b - a) < 3) continue;
        const cut = toks.slice(a, b);
        if (cut.some(undeletable)) continue;
        tryTokens([...toks.slice(0, a), ...toks.slice(b)], cut.reduce((sum, t) => sum + dropCost(t), 0));
      }
    }
    return best;
  }

  /** Speech timing probe: is the (possibly unfinished) utterance complete, a valid prefix, or neither? */
  probe(text: string, expected: string[] = []): "complete" | "prefix" | "none" {
    const { variants } = tokenizeInput(text);
    const top = this.build(expected);
    let pre = false;
    for (const toks of variants) {
      if (!toks.length) continue;
      const res = this.g.match(top, toks, true);
      const full = res.filter((r) => r.end === toks.length && !r.partial);
      // "I need to go…" is a goodbye, unless another answer goes on from it ("…to the airport"): then
      // the learner gets time to finish the sentence
      const lastPiece = (r: Res) => r.caps.filter((c) => c.name === "__intent").sort((a, b) => a.from - b.from).at(-1);
      const goesOn = () => res.some((r) => { const c = r.partial ? lastPiece(r) : undefined; return !!c && c.from < toks.length && !r.caps.some(isLeaving); });
      if (full.length && !(full.every((r) => { const c = lastPiece(r); return !!c && isLeaving(c); }) && goesOn())) return "complete";
      if (res.some((r) => r.partial)) pre = true;
    }
    return pre ? "prefix" : "none";
  }

  private toParse(r: Res, tokens: Tokens, please: boolean, expected: string[], primary: string[] = []): Parse {
    const flags = new Set<string>();
    if (please) flags.add("please");
    let yn: "yes" | "no" | undefined;
    for (const t of r.tags) {
      if (t.startsWith("lead:")) flags.add(t.slice(5));
      if (t.startsWith("tail:")) flags.add(t.slice(5));
      if (t === "yn:yes") yn = "yes";
      if (t === "yn:no") yn = "no";
    }
    const segments: ParsedSegment[] = r.caps
      .filter((c) => c.name === "__intent")
      .map((c) => {
        const v = c.value as Record<string, any>;
        const { __id, __tags, ...slots } = v;
        return { intent: __id as string, slots, tags: (__tags as string[]) || [] };
      });
    let cost = r.cost;
    cost += 0.35 * Math.max(0, segments.length - 1);
    // The expected-intent bonus counts once per parse (a second expected segment earns only a
    // little), so one answer isn't cut into several expected pieces ("Tomas | Mikalauskas").
    let expectedSeen = false;
    for (const s of segments) {
      if (expected.includes(s.intent)) { cost -= expectedSeen ? 0.2 : 0.8; expectedSeen = true; if (primary.includes(s.intent)) cost -= 0.1; }
      // "Great, thank you very much" is thanks unless someone just asked "How are you?"
      else if (s.intent === "g_howareyou_answer" || s.intent === "g_howareyou_bad") cost += 0.3;
      if (this.globalIds.has(s.intent)) cost += 0.25;
      if (this.catchAll.has(s.intent)) cost += 2.5;
    }
    const nLead = r.tags.filter((t) => t.startsWith("lead:") || t.startsWith("tail:")).length;
    cost += 0.05 * nLead;
    if (r.tags.includes("yn:twice")) cost += 0.15;
    // a name used only as an address costs a little, so an intent that uses the name wins ("Morning, Kate!")
    cost += 0.4 * r.tags.filter((t) => t === "lead:vocative").length;
    if (yn && segments.length) cost += yn === "no" ? 0.6 : 0.1;
    return { segments, yn, flags, tags: r.tags, cost, tokens };
  }
}
