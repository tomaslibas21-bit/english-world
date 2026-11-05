// Small interface helpers for the Spanish edition (replaces src/ui/lt.ts): counts and labels in English.
import { L } from "../../../ui/i18n";

/** A noun after a number, from the Lithuanian forms the code passes (1 pokalbis · 2 pokalbiai · 10 pokalbių):
 *  "1 conversation", "2 conversations". */
export function ltCount(n: number, one: string, _few: string, many: string): string {
  return L(n === 1 ? one : many);
}

/** Labels are written as imperatives already ("Order a drink"). */
export function toImperative(s: string): string {
  return s;
}

// The asterisk after the other person's line (src/ui/natTip.ts): here the word glosses and the natural sentence are
// both English, so a natural sentence that only adds English's grammar words says nothing new, and two forms of an
// English word are one word. ("Muy bien, una maleta.": "Very | good, | one | suitcase." / "Okay, one bag." gets one;
// "Ya estoy jubilado.": "Now | I'm | retired." / "I'm retired now." doesn't.)

/** Words that carry no content of their own in a natural English sentence: articles, pronouns, the verbs "be", "do"
 *  and "have", modals, the pieces of contractions ("don't" is compared as "don" and "t"), "let" (let's), prepositions
 *  and particles, "and", "or", "but", "so", "then", interjections like "well" and "oh", "just", "very", "really",
 *  "too", "now", "yet", "still", "already", question words and quantifiers ("all", "any", "some", "every", "one"). Not
 *  "okay", "great" or "sure": where the natural sentence has one and the glosses don't ("Very good" / "Okay"), it
 *  tells the learner how the Spanish is meant. */
export const NAT_FILLERS: ReadonlySet<string> = new Set([
  "a", "an", "the", "i", "me", "my", "mine", "you", "your", "yours", "he", "him", "his", "she", "her", "hers", "it", "its",
  "we", "us", "our", "ours", "they", "them", "their", "theirs", "this", "that", "these", "those", "there", "here",
  "is", "am", "are", "was", "were", "be", "been", "being", "do", "does", "did", "have", "has", "had",
  "will", "would", "shall", "should", "can", "could", "may", "might", "must",
  "ll", "s", "m", "re", "ve", "d", "t", "don", "doesn", "didn", "isn", "aren", "wasn", "weren", "won", "wouldn", "cannot",
  "couldn", "shouldn", "haven", "hasn", "hadn", "let",
  "to", "of", "for", "in", "on", "at", "by", "with", "from", "about", "as", "up", "down", "out", "over", "off", "through",
  "around", "into", "onto", "across", "along", "away", "back",
  "and", "or", "but", "so", "then", "well", "oh", "ah", "uh", "um", "hmm", "mm", "huh", "hey",
  "just", "very", "really", "too", "now", "yet", "still", "already",
  "what", "how", "which", "who", "whom", "whose", "where", "when", "why", "all", "any", "some", "every", "each", "both",
  "one", "ones",
]);

/** Common irregular forms and the word they are a form of. */
const IRREGULAR: Record<string, string> = {
  goes: "go", going: "go", knew: "know", known: "know", made: "make", said: "say", took: "take", taken: "take", went: "go",
  gone: "go", got: "get",
  gotten: "get", came: "come", saw: "see", seen: "see", gave: "give", given: "give", thought: "think", told: "tell",
  found: "find", left: "leave", felt: "feel", brought: "bring", bought: "buy", kept: "keep", meant: "mean", met: "meet",
  paid: "pay", sent: "send", spent: "spend", stood: "stand", understood: "understand", wrote: "write", written: "write",
  ran: "run", sat: "sit", lost: "lose", heard: "hear", held: "hold", sold: "sell", built: "build", caught: "catch",
  taught: "teach", fell: "fall", fallen: "fall", forgot: "forget", forgotten: "forget", chose: "choose", chosen: "choose",
  drove: "drive", driven: "drive", ate: "eat", eaten: "eat", drank: "drink", began: "begin", begun: "begin", broke: "break",
  broken: "break", spoke: "speak", spoken: "speak", woke: "wake", wore: "wear", worn: "wear", led: "lead", slept: "sleep",
  children: "child", men: "man", women: "woman", people: "person", better: "good", best: "good", worse: "bad", worst: "bad",
};

/** "no", "not", "never", "without" and the "t" of a contraction ("isn't": isn and t) are one word ("sin cochera":
 *  "without | garage" / "with no garage"). */
const NEGATION: Record<string, string> = { no: "not", not: "not", t: "not", never: "not", without: "not" };

/** The usual English endings, longest first. */
const ENDINGS = ["ingly", "ings", "ing", "ies", "ied", "ers", "er", "est", "ly", "es", "ed", "s", "e", "y"];

/** A crude stem: a negation as "not", an irregular form as its word, the usual ending cut off (at least 3 letters
 *  stay), at most the first 6 letters (apologize and apology: apolog; boarding and board: board). */
export function natStem(word: string): string {
  if (NEGATION[word]) return NEGATION[word];
  const w = IRREGULAR[word] ?? word;
  const e = ENDINGS.find((x) => w.length - x.length >= 3 && w.endsWith(x));
  return (e ? w.slice(0, w.length - e.length) : w).slice(0, 6);
}
