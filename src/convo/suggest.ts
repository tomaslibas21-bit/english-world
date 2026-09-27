// Help with speaking, as pure functions (no store, no DOM; tests/suggest.test.ts):
//
// "Did you mean…?" — when an answer isn't understood, the model answers of the learner's current
// hint groups (composed as the guide shows them: with the chosen item or the group's examples, plus
// any item the learner named) are ranked by how close they are to what was heard: word overlap plus
// fuzzy word matching (homophones, word forms, spelling slips, similar-sounding words). Only a
// reasonably close answer is offered, and never one for silence or noise. The heard words that are
// not in the suggestion are marked: that is the speaking feedback.
//
// "Listen and repeat" — the words of a model sentence are lined up, in order, with what the learner
// said, and each word is marked as said or missed.

import { compose, type EntityLookup, type Sentence } from "./compose";
import { entityForms } from "./dialogue";
import type { EntityDef, HintGroup, SituationDef } from "../content/types";
import { levenshtein, NEGATION_TOKENS, normalizedVariants, SOFT_FILLERS, surfaceTokens, tokenizeInput, tokenSimilarity, type Tokens } from "./normalize";

// ---------------------------------------------------------------------------------------------
// Model answers (the guide and "Did you mean…?")

export interface AnswerOpts {
  /** jūs (true) or tu (false) in the Lithuanian. */
  formal: boolean;
  /** The learner ({m:…|f:…}) and the person spoken to ({sm:…|sf:…}). */
  gender: "m" | "f";
  npcGender: "m" | "f";
  /** {$name}, {$surname}, {$letters}. */
  vars: Record<string, string | undefined>;
}

/** The learner's name for model answers ("My name is Tomas."). */
export function playerVars(prof?: { name?: string; surname?: string } | null): Record<string, string | undefined> {
  return { name: prof?.name || "Tomas", surname: prof?.surname || undefined, letters: prof?.surname || undefined };
}

export function entityLookup(sit: SituationDef): EntityLookup {
  return (id) => {
    for (const l of Object.values(sit.entities || {})) { const e = l.find((x) => x.id === id); if (e) return e; }
    return undefined;
  };
}

/** The item a hint row shows when nothing is chosen: the group's examples in turn. */
function exampleFor(i: number, pool: EntityDef[], exIds: string[]): string | undefined {
  return exIds.find((x, k) => pool.some((e) => e.id === x) && k === i % exIds.length) ?? pool.find((e) => exIds.includes(e.id))?.id ?? pool[0]?.id;
}

function composeFull(g: HintGroup, i: number, X: string | undefined, o: AnswerOpts, look: EntityLookup): Sentence | null {
  try {
    const s = compose(g.items[i].s, { ...o.vars, X }, { look, addressee: o.gender, speaker: o.npcGender, formal: o.formal });
    return s.en.includes("…") ? null : s;
  } catch { return null; } // this pattern doesn't fit
}

/** Up to `n` complete example sentences from a hint group (with the chosen item, or examples). */
export function modelAnswers(sit: SituationDef, g: HintGroup, chosen: string | undefined, o: AnswerOpts, n: number): Sentence[] {
  const look = entityLookup(sit);
  const ents = g.slot ? sit.entities?.[g.slot] ?? [] : [];
  const exIds = g.examples?.length ? g.examples : ents.slice(0, 4).map((e) => e.id);
  const out: Sentence[] = [];
  for (let i = 0; i < g.items.length && out.length < n; i++) {
    const it = g.items[i];
    const pool = ents.filter((e) => !it.only || it.only(e));
    if (g.slot && chosen && !pool.some((e) => e.id === chosen)) continue;
    const s = composeFull(g, i, chosen ?? exampleFor(i, pool, exIds), o, look);
    if (s) out.push(s);
  }
  return out;
}

/** Items of a slot the heard text names, at most 3: the whole name ("…cappucino…" → cappuccino), or
 *  the first word of a longer one ("a flat way" → flat white). */
function namedItems(ents: EntityDef[], heard: Tokens): string[] {
  const out: string[] = [];
  const at = (t: string, s: number) => s < heard.length && tokenSimilarity(heard[s], t) >= 0.85;
  const has = (f: Tokens) => {
    for (let s = 0; s < heard.length; s++) {
      if (f.every((t, k) => at(t, s + k))) return true;
      if (f.length > 1 && !LIGHT.has(f[0]) && at(f[0], s)) return true;
    }
    return false;
  };
  for (const e of ents) {
    if (out.length >= 3) break;
    if (entityForms(e).some((f) => { const ft = normalizedVariants(surfaceTokens(f), true)[0]; return ft.length > 0 && has(ft); })) out.push(e.id);
  }
  return out;
}

/** Every model answer of the groups the learner could have meant: each item with the chosen item, or
 *  with the group's example and any item the learner named. */
export function answerCandidates(sit: SituationDef, groups: { g: HintGroup; chosen?: string }[], o: AnswerOpts, heard: string[]): Sentence[] {
  const look = entityLookup(sit);
  const heardToks = heard.flatMap((h) => tokenizeInput(h).variants[0] ?? []);
  const out: Sentence[] = [];
  const seen = new Set<string>();
  for (const { g, chosen } of groups) {
    const ents = g.slot ? sit.entities?.[g.slot] ?? [] : [];
    const exIds = g.examples?.length ? g.examples : ents.slice(0, 4).map((e) => e.id);
    const named = g.slot && !chosen ? namedItems(ents, heardToks) : [];
    g.items.forEach((it, i) => {
      const pool = ents.filter((e) => !it.only || it.only(e));
      if (g.slot && chosen && !pool.some((e) => e.id === chosen)) return;
      const xs = chosen ? [chosen] : [...new Set([...named.filter((id) => pool.some((e) => e.id === id)), exampleFor(i, pool, exIds)])];
      for (const X of xs) {
        const s = composeFull(g, i, X, o, look);
        if (s && !seen.has(s.en)) { seen.add(s.en); out.push(s); }
      }
    });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Ranking

/** Words that carry little meaning of their own: a match on "latte" says more than one on "a". */
const LIGHT = new Set([
  "a", "an", "the", "i", "you", "we", "he", "she", "it", "they", "me", "my", "your", "our", "us", "him", "her", "them",
  "to", "of", "for", "in", "on", "at", "with", "by", "from", "and", "or", "but", "so", "if",
  "is", "am", "are", "was", "were", "be", "been", "do", "does", "did", "have", "has", "had",
  "can", "could", "would", "will", "shall", "should", "may", "might", "must",
  "some", "this", "that", "these", "those", "there", "here", "just", "oh", "okay", "yeah", "well", "please", "too", "also", "very",
]);
const weight = (t: string) => (LIGHT.has(t) ? 0.35 : 1);
/** Question words matter for meaning, but one alone ("what…") doesn't make two sentences alike. */
const WH = new Set(["what", "where", "when", "why", "how", "who", "which", "whose"]);
const hasNegation = (t: Tokens) => t.some((x) => NEGATION_TOKENS.has(x));

/** How alike two words sound or look, for ranking only (never for understanding): the engine's own
 *  word similarity, else closeness of spelling ("bug"/"bag", "late"/"latte"). Negations and numbers
 *  only ever match exactly. */
export function wordCloseness(h: string, c: string): number {
  const s = tokenSimilarity(h, c);
  if (s > 0) return s;
  if (NEGATION_TOKENS.has(h) || NEGATION_TOKENS.has(c) || /\d/.test(h) || /\d/.test(c)) return 0;
  // like the engine, a near-miss keeps the first letter ("drink" is not "think")
  if (Math.min(h.length, c.length) < 3 || h[0] !== c[0]) return 0;
  const r = 1 - levenshtein(h, c) / Math.max(h.length, c.length);
  return r >= 0.6 ? r * 0.75 : 0;
}

/** Closeness of heard and model tokens (weighted F1 of best word matches). `strong`: a word with
 *  content matched, or several small ones ("can I have a…"): noise never counts as strong. */
export function closeness(heard: Tokens, model: Tokens): { score: number; strong: boolean } {
  let hw = 0, hm = 0, mw = 0, mm = 0, heavy = 0, light = 0;
  for (const h of heard) {
    let best = 0;
    for (const m of model) best = Math.max(best, wordCloseness(h, m));
    hw += weight(h); hm += weight(h) * best;
    if (best >= 0.6) { if (LIGHT.has(h) || WH.has(h)) light++; else heavy++; }
  }
  for (const m of model) {
    let best = 0;
    for (const h of heard) best = Math.max(best, wordCloseness(h, m));
    mw += weight(m); mm += weight(m) * best;
  }
  const p = hw ? hm / hw : 0, r = mw ? mm / mw : 0;
  const score = p + r ? (2 * p * r) / (p + r) : 0;
  return { score, strong: heavy >= 1 || (light >= 3 && p >= 0.75) };
}

/** Below this, a model answer is not offered. */
export const MIN_SCORE = 0.4;

export interface Ranked { s: Sentence; score: number }

/** Model answers close enough to what was heard (`heard`: the recogniser's hypotheses, best first), closest first. */
export function rankAnswers(heard: string[], cands: Sentence[]): Ranked[] {
  const hv: Tokens[] = [];
  for (const h of heard) for (const v of tokenizeInput(h).variants.slice(0, 3)) if (v.length) hv.push(v);
  if (!hv.length) return []; // silence, fillers only
  const out: Ranked[] = [];
  for (const s of cands) {
    const mt = tokenizeInput(s.en).variants[0] ?? [];
    if (!mt.length) continue;
    let best = { score: 0, strong: false };
    for (const v of hv) {
      if (hasNegation(v) !== hasNegation(mt)) continue; // never offer the opposite ("I don't have a reservation")
      const c = closeness(v, mt);
      if (c.strong && c.score > best.score) best = c;
    }
    if (best.strong && best.score >= MIN_SCORE) out.push({ s, score: best.score });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** The 1–2 suggestions to show: the closest ones the engine understands right now; a second one only
 *  when it is nearly as close as the first. */
export function pickSuggestions(ranked: Ranked[], understands: (en: string) => boolean, max = 2): Ranked[] {
  const out: Ranked[] = [];
  let tries = 0;
  for (const r of ranked) {
    if (out.length >= max || tries >= 12) break;
    if (out.length && r.score < out[0].score - 0.15) break;
    const key = (tokenizeInput(r.s.en).variants[0] ?? []).join(" ");
    if (out.some((o) => (tokenizeInput(o.s.en).variants[0] ?? []).join(" ") === key)) continue;
    tries++;
    let ok = false;
    try { ok = understands(r.s.en); } catch { ok = false; }
    if (ok) out.push(r);
  }
  return out;
}

export interface HeardWord { w: string; miss: boolean }
/** "Did you mean…?": the suggestions (best first) and the heard words, marked where they are not in the first. */
export interface Guess { options: { en: string; nat: string; say: string }[]; heard: HeardWord[] }

/** The heard text word by word; `miss`: the word is not in `target`. Fillers and "please" are never marked. */
export function markHeard(heard: string, target: string): HeardWord[] {
  const known = [...new Set(normalizedVariants(surfaceTokens(target), false).flat())];
  return heard.trim().split(/\s+/).filter(Boolean).map((w) => {
    const toks = surfaceTokens(w).filter((t) => !SOFT_FILLERS.has(t) && t !== "please");
    if (!toks.length) return { w, miss: false };
    const ok = normalizedVariants(toks, false).some((v) => v.every((t) => known.some((k) => tokenSimilarity(t, k) >= 0.9)));
    return { w, miss: !ok };
  });
}

export function makeGuess(heard: string, picks: Ranked[]): Guess | null {
  if (!picks.length) return null;
  return { options: picks.map(({ s }) => ({ en: s.en, nat: s.nat, say: s.say })), heard: markHeard(heard, picks[0].s.en) };
}

// ---------------------------------------------------------------------------------------------
// "Yes" after "Did you mean…?"

const CONFIRM = new Set([
  "yes", "yeah", "yep", "yup", "yes yes", "yeah yeah", "sure", "correct", "exactly", "yes exactly", "yes correct",
  "that's right", "yes that's right", "yeah that's right", "yes i did", "i did", "taip", "taip taip", "jo",
]);
/** What an English recogniser writes for a spoken „taip“. */
const SPOKEN_TAIP = new Set(["type", "tape", "tipe"]);

/** A plain "yes" (or „taip“) and nothing else. `spoken`: also the recogniser's spellings of „taip“. */
export function isConfirmation(text: string, spoken = false): boolean {
  const toks = surfaceTokens(text).filter((t) => !SOFT_FILLERS.has(t) && !["oh", "please", "prasau", "okay", "ok"].includes(t));
  const s = toks.join(" ");
  return !!s && (CONFIRM.has(s) || (spoken && SPOKEN_TAIP.has(s)));
}

/** Does this "yes" right after "Did you mean…?" pick the first suggestion? Only when the engine would
 *  not use it as an answer itself: it isn't understood at all („taip“), or it is a bare yes that no
 *  open question or step does anything with (`yesAnswers` false). */
export function yesPicksGuess(text: string, spoken: boolean, engine: {
  parse(text: string): { ok: boolean; best?: { segments: unknown[]; yn?: "yes" | "no" } };
  yesAnswers: boolean;
}): boolean {
  if (!isConfirmation(text, spoken)) return false;
  const r = engine.parse(text);
  if (!r.ok || !r.best) return true;
  return r.best.segments.length === 0 && r.best.yn === "yes" && !engine.yesAnswers;
}

// ---------------------------------------------------------------------------------------------
// "Listen and repeat"

export interface RepeatWord { w: string; ok: boolean }
export interface RepeatResult { words: RepeatWord[]; score: number; verdict: "great" | "almost" | "again" }
/** One "Pakartok" attempt at a guide example (never an answer to the person). */
export interface Practice {
  /** The model sentence (English). */
  en: string;
  status: "playing" | "listening" | "done" | "nothing" | "denied" | "error";
  heard: string;
  result?: RepeatResult;
}

const DIGITS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
const spell = (toks: Tokens) => toks.map((t) => (/^\d+$/.test(t) && +t <= 20 ? DIGITS[+t] : t));

function heardVariants(heard: string): Tokens[] {
  return normalizedVariants(spell(surfaceTokens(heard).filter((t) => !SOFT_FILLERS.has(t))), false).slice(0, 6).filter((v) => v.length);
}

/** Which model tokens are said, in order (longest common subsequence; a word counts when it is the
 *  same, a homophone or a small spelling slip; not another form of it). */
function saidInOrder(model: Tokens, heard: Tokens): boolean[] {
  const n = model.length, m = heard.length;
  const eq = (i: number, j: number) => tokenSimilarity(heard[j], model[i]) >= 0.9;
  const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = eq(i, j) ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const hit = new Array<boolean>(n).fill(false);
  for (let i = 0, j = 0; i < n && j < m;) {
    if (eq(i, j) && dp[i][j] === 1 + dp[i + 1][j + 1]) { hit[i] = true; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return hit;
}

/** The model sentence word by word, each marked said or missed, the share said and a verdict:
 *  „Puiku!“ from 90 %, „Beveik!“ from 60 %, else „Pabandyk dar kartą“. */
export function compareRepeat(model: string, heard: string): RepeatResult {
  const words = model.trim().split(/\s+/).filter(Boolean);
  const per = words.map((w) => spell(normalizedVariants(surfaceTokens(w), true)[0] ?? []));
  const flat = per.flat();
  let hit = new Array<boolean>(flat.length).fill(false), best = -1;
  for (const v of heardVariants(heard)) {
    const h = saidInOrder(flat, v);
    const n = h.filter(Boolean).length;
    if (n > best) { best = n; hit = h; }
  }
  let k = 0, counted = 0, said = 0;
  const out = words.map((w, i) => {
    const toks = per[i];
    const ok = toks.every((_, q) => hit[k + q]);
    k += toks.length;
    if (toks.length) { counted++; if (ok) said++; }
    return { w, ok };
  });
  const score = counted ? said / counted : 0;
  return { words: out, score, verdict: score >= 0.9 ? "great" : score >= 0.6 ? "almost" : "again" };
}

/** Speech timing while the learner repeats: done; still going (what was said so far is the start of
 *  the sentence: a long pause is fine); or neither (most of it said, or something else: the answer is
 *  taken soon after the learner stops). */
export function repeatProgress(model: string, heard: string): "complete" | "prefix" | "none" {
  const r = compareRepeat(model, heard);
  if (r.score >= 0.999) return "complete";
  if (r.score >= 0.75) return "none";
  const last = r.words.map((w) => w.ok).lastIndexOf(true);
  if (last < 0) return "none";
  const head = r.words.slice(0, last + 1);
  return head.filter((w) => w.ok).length / head.length >= 0.5 ? "prefix" : "none";
}
