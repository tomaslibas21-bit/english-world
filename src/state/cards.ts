// My cards („Mano kortelės“): words, phrases and sentences the learner saved from conversations
// (tap a word in any interlinear sentence) or from the phrasebook, reviewed with a simple Leitner
// schedule. Saved in this browser only; every storage read and write is guarded (private windows or
// blocked storage keep the cards for this session). The logic is pure functions with an explicit
// `now`, so it is unit-tested (tests/cards.test.ts); `useCards` is the small store the UI uses.
import { create } from "zustand";
import type { Sentence } from "../convo/compose";
import { ipaForUnit } from "../convo/ipa";

export interface Card {
  /** Stable per English text: the same phrase gets the same id on any device (see cardId). */
  id: string;
  /** What the learner recalls: the English word, phrase or sentence (edge punctuation removed). */
  en: string;
  /** The Lithuanian shown on the front (the gloss of a word; the natural translation of a sentence). */
  lt: string;
  /** General American IPA (generated from the game's lexicon), when every word is known. */
  ipa?: string;
  /** Where the learner met it: the whole sentence and its natural Lithuanian (`say`: the spoken
   *  form, only when it differs from `en`, e.g. prices, so the voice clip can be found). */
  sentence: { en: string; lt: string; say?: string };
  situationId: string;
  /** ms since the epoch. */
  createdAt: number;
  /** Leitner box 1–5 (1 = new or forgotten). */
  box: number;
  /** ms since the epoch: local midnight of the day the card is due (due when due <= now). */
  due: number;
  /** Answers so far, forgotten ("Dar kartą") answers, and the last answer (ms). */
  reviews?: number;
  lapses?: number;
  lastReview?: number;
}

export type CardInput = Pick<Card, "en" | "lt" | "ipa" | "sentence" | "situationId">;

/** Days until the next review for a card in box 1…5. */
export const INTERVALS = [1, 2, 4, 8, 16] as const;
export const MAX_BOX = INTERVALS.length;
const DAY = 86_400_000;

// ---------------------------------------------------------------------------------------------
// text

const ABBR = /\b(?:Mr|Mrs|Ms|Dr|St|Jr|Sr|a\.m|p\.m|etc|vs)\.$/i;

/** Strips sentence punctuation and stray quotes at the edges ("evening!" → "evening",
 *  "„Harborview“." → "„Harborview“"); keeps apostrophes and abbreviations ("Mr."). */
export function cleanText(s: string): string {
  let t = s.replace(/\s+/g, " ").trim();
  for (let i = 0; i < 4; i++) {
    const before = t;
    t = t.replace(/^[\s"«(\[¿¡…–—-]+/, "").replace(/[\s,!?;:…"»)\]–—-]+$/, "");
    if (t.endsWith(".") && !ABBR.test(t)) t = t.replace(/\.+$/, "");
    // quotes that belong to the rest of the sentence: keep only balanced pairs („…“ “…” ‘…’)
    for (const [open, close] of [["„", "“"], ["“", "”"], ["‘", "’"]] as const) {
      if (t.startsWith(open) && !t.slice(1).includes(close)) t = t.slice(1);
      if (t.endsWith(close) && !t.slice(0, -1).includes(open) && !(close === "’" && /\w’$/.test(t))) t = t.slice(0, -1);
    }
    if (t === before) break;
  }
  return t.trim();
}

/** The comparison key: case, spacing, curly apostrophes and edge punctuation don't matter. */
export function cardKey(en: string): string {
  return cleanText(en.replace(/[’‘]/g, "'")).toLowerCase();
}

/** True for a unit with no Lithuanian equivalent (articles and the like are glossed "—"). */
export const isDashGloss = (lt: string) => lt.trim().startsWith("—");

/** A stable id from the English text (FNV-1a), so the same phrase saved on two devices matches. */
export function cardId(en: string, taken?: Set<string>): string {
  const k = cardKey(en);
  let h = 0x811c9dc5;
  for (let i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  const base = "ew-" + h.toString(36);
  if (!taken?.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** IPA for a word or phrase, only if the lexicon knows every word (no silent gaps). */
export function ipaFor(en: string): string | undefined {
  const words = en.split(/\s+/).filter(Boolean);
  const parts = words.map((w) => ipaForUnit(w));
  return parts.length && parts.every(Boolean) ? parts.join(" ") : undefined;
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** The source sentence stored with a card (its natural Lithuanian, or the glosses if it has none). */
function sourceOf(s: Sentence): CardInput["sentence"] {
  const en = s.en.trim();
  const lt = (s.nat || s.units.filter((u) => !isDashGloss(u.lt)).map((u) => u.lt).join(" ")).trim();
  const out: CardInput["sentence"] = { en, lt };
  if (s.say && s.say.trim() !== en) out.say = s.say.trim();
  return out;
}

/** The card for the whole sentence (its natural Lithuanian as the front). */
export function sentenceInput(s: Sentence, situationId: string): CardInput {
  const sentence = sourceOf(s);
  return { en: sentence.en, lt: sentence.lt, ipa: ipaFor(sentence.en), sentence, situationId };
}

/** The card for one tapped unit of a sentence, or null when it has no Lithuanian of its own
 *  ("—": save the whole sentence instead). A capital that only starts the sentence is dropped
 *  ("Checking in?" → "checking in"), except for "I", abbreviations and names (`keepCaps`). */
export function unitInput(s: Sentence, index: number, situationId: string, keepCaps: (word: string) => boolean = () => false): CardInput | null {
  const u = s.units[index];
  if (!u || isDashGloss(u.lt)) return null;
  let en = cleanText(u.en), lt = cleanText(u.lt);
  if (!en || !lt) return null;
  const prev = index > 0 ? s.units[index - 1].en.trim() : "";
  const starts = index === 0 || /[.!?…]["”’)]*$/.test(prev);
  const first = en.split(" ")[0];
  if (starts && /^\p{Lu}\p{Ll}/u.test(first) && !ABBR.test(first) && !keepCaps(first.replace(/[^\p{L}'’-]/gu, "").replace(/['’]s$/i, ""))) {
    en = lowerFirst(en);
    if (/^\p{Lu}\p{Ll}/u.test(lt)) lt = lowerFirst(lt);
  }
  return { en, lt, ipa: ipaFor(en), sentence: sourceOf(s), situationId };
}

// ---------------------------------------------------------------------------------------------
// schedule

/** Local midnight of the day `t` falls on. */
export function startOfDay(t: number): number { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
/** Local midnight `n` days after the day of `t` (calendar days, so DST changes don't shift it). */
export function addDays(t: number, n: number): number { const d = new Date(startOfDay(t)); d.setDate(d.getDate() + n); return d.getTime(); }
/** Whole calendar days from today until `t` (e.g. a card's `due`; 0 or less: due now). */
export function daysUntil(t: number, now: number): number { return Math.round((startOfDay(t) - startOfDay(now)) / DAY); }

export function newCard(input: CardInput, now: number, taken?: Set<string>): Card {
  const c: Card = {
    id: cardId(input.en, taken),
    en: input.en.trim(),
    lt: input.lt.trim(),
    sentence: { ...input.sentence },
    situationId: input.situationId,
    createdAt: now,
    box: 1,
    due: startOfDay(now), // new cards can be reviewed today
  };
  if (input.ipa) c.ipa = input.ipa;
  return c;
}

/** Adds the inputs that aren't saved yet (same English = same card). */
export function addCards(cards: Card[], inputs: CardInput[], now: number): { cards: Card[]; added: Card[] } {
  const keys = new Set(cards.map((c) => cardKey(c.en)));
  const ids = new Set(cards.map((c) => c.id));
  const added: Card[] = [];
  for (const inp of inputs) {
    const k = cardKey(inp.en);
    if (!k || !inp.lt.trim() || keys.has(k)) continue;
    const c = newCard(inp, now, ids);
    keys.add(k); ids.add(c.id); added.push(c);
  }
  return { cards: added.length ? [...cards, ...added] : cards, added };
}

/** "Mokėjau" moves the card up a box (at most 5), "Dar kartą" back to box 1; either way the next
 *  review is INTERVALS[box] days from today (1, 2, 4, 8, 16). */
export function answerCard(card: Card, knew: boolean, now: number): Card {
  const box = knew ? Math.min(MAX_BOX, Math.max(1, card.box) + 1) : 1;
  return {
    ...card, box, due: addDays(now, INTERVALS[box - 1]),
    reviews: (card.reviews ?? 0) + 1, lapses: (card.lapses ?? 0) + (knew ? 0 : 1), lastReview: now,
  };
}

export const isDue = (card: Card, now: number) => card.due <= now;

/** Cards to review now: the longest-waiting first, then the lower boxes, then the oldest. */
export function dueCards(cards: Card[], now: number): Card[] {
  return cards.filter((c) => isDue(c, now)).sort((a, b) => a.due - b.due || a.box - b.box || a.createdAt - b.createdAt);
}

/** When the next card becomes due (null if none is waiting). */
export function nextDue(cards: Card[], now: number): number | null {
  let best: number | null = null;
  for (const c of cards) if (!isDue(c, now) && (best === null || c.due < best)) best = c.due;
  return best;
}

export function removeCard(cards: Card[], id: string): Card[] { return cards.filter((c) => c.id !== id); }

// ---------------------------------------------------------------------------------------------
// storage

export const STORAGE_KEY = "english-world-cards-v1";
type KV = Pick<Storage, "getItem" | "setItem">;
function defaultStorage(): KV | null { try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; } }

const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);

/** Saved data → valid cards (unknown shapes, broken entries and duplicates are dropped). */
export function parseCards(raw: unknown, now = Date.now()): Card[] {
  const list = Array.isArray(raw) ? raw : Array.isArray((raw as any)?.cards) ? (raw as any).cards : [];
  const out: Card[] = [];
  const keys = new Set<string>(), ids = new Set<string>();
  for (const x of list) {
    if (!x || typeof x !== "object") continue;
    const en = str(x.en).trim(), lt = str(x.lt).trim(), k = cardKey(en);
    if (!k || !lt || keys.has(k)) continue;
    const s = x.sentence && typeof x.sentence === "object" ? x.sentence : {};
    const createdAt = num(x.createdAt, now);
    let id = str(x.id).trim();
    if (!id || ids.has(id)) id = cardId(en, ids);
    const c: Card = {
      id, en, lt,
      sentence: { en: str(s.en).trim() || en, lt: str(s.lt).trim() || lt },
      situationId: str(x.situationId),
      createdAt,
      box: Math.min(MAX_BOX, Math.max(1, Math.round(num(x.box, 1)))),
      due: num(x.due, startOfDay(createdAt)),
    };
    if (str(s.say).trim()) c.sentence.say = str(s.say).trim();
    if (str(x.ipa).trim()) c.ipa = str(x.ipa).trim();
    for (const f of ["reviews", "lapses", "lastReview"] as const) if (typeof x[f] === "number" && Number.isFinite(x[f])) c[f] = x[f];
    keys.add(k); ids.add(id); out.push(c);
  }
  return out;
}

export function loadCards(storage: KV | null = defaultStorage()): Card[] {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    return raw ? parseCards(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

/** False when the browser won't store it (the cards then live for this session only). */
export function saveCards(cards: Card[], storage: KV | null = defaultStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, cards }));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------------------------
// export

/**
 * Export for a future import into „English Master“ (the course site's own spaced-repetition cards).
 * One UTF-8 JSON file:
 *
 *   {
 *     "format": "english-world-cards",
 *     "version": 1,
 *     "exportedAt": "2026-09-26T14:05:00.000Z",
 *     "cards": [
 *       {
 *         "id": "ew-1x2y3z",                        stable per English text (same phrase = same id)
 *         "en": "checking in",                      the English to recall (word, phrase or sentence)
 *         "lt": "registruojatės",                   the Lithuanian prompt
 *         "ipa": "ˈtʃɛkɪŋ ɪn",                      optional, General American
 *         "sentence": { "en": "Good evening! … Checking in?", "lt": "Labas vakaras! … Registruojatės?" },
 *         "situationId": "s68-hotel",               the conversation it came from ("" if unknown)
 *         "createdAt": "2026-09-26T14:02:11.000Z",  ISO 8601
 *         "box": 2,                                 Leitner box 1–5 (intervals 1, 2, 4, 8, 16 days)
 *         "due": "2026-09-28"                       next review day (the learner's local date)
 *       }
 *     ]
 *   }
 *
 * An importer can treat `box` / `due` as the learner's current progress, or ignore them and start
 * every card as new.
 */
export interface ExportedCard {
  id: string; en: string; lt: string; ipa?: string;
  sentence: { en: string; lt: string };
  situationId: string; createdAt: string; box: number; due: string;
}
export interface CardsExport { format: "english-world-cards"; version: 1; exportedAt: string; cards: ExportedCard[] }

const localDate = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export function exportCards(cards: Card[], now = Date.now()): CardsExport {
  return {
    format: "english-world-cards", version: 1, exportedAt: new Date(now).toISOString(),
    cards: cards.map((c) => {
      const e: ExportedCard = {
        id: c.id, en: c.en, lt: c.lt, sentence: { en: c.sentence.en, lt: c.sentence.lt },
        situationId: c.situationId, createdAt: new Date(c.createdAt).toISOString(), box: c.box, due: localDate(c.due),
      };
      if (c.ipa) e.ipa = c.ipa;
      return e;
    }),
  };
}

export const exportCardsJSON = (cards: Card[], now = Date.now()) => JSON.stringify(exportCards(cards, now), null, 2);

// ---------------------------------------------------------------------------------------------
// English Master (Fluent Steps)

/**
 * Inside English Master (a build with VITE_CARDS_TARGET=fluentsteps, served from the course site), every
 * card saved here also goes into the course's own flashcards: localStorage "fluentsteps.songcards.v1",
 * deck "Mano žodžiai" ("words"), in the course's StudyCard format (fluent-steps
 * src/lib/songs/cards-store.ts). The course reviews it with its own scheduler; the game keeps its copy
 * too. Removing a card here doesn't remove the course's copy.
 */
export const FLUENT_CARDS_KEY = "fluentsteps.songcards.v1";
const TO_FLUENT = import.meta.env?.VITE_CARDS_TARGET === "fluentsteps";

/** The course's slugKey (its card ids are "word:<en>|<lt>" slugs). */
export function fluentSlug(s: string): string {
  return String(s || "").toLowerCase().replace(/[‘’`]/g, "'").replace(/\([^)]*\)/g, " ").replace(/[^\p{L}\p{N}']+/gu, " ").trim().replace(/\s+/g, "-");
}

/** A game card as a new course card: Lithuanian on the front, English on the back, and the sentence it
 *  came from (or the IPA, for a whole sentence) as the note. */
export function fluentCard(c: Card, now: number) {
  const note = c.sentence.en && cardKey(c.sentence.en) !== cardKey(c.en) ? c.sentence.en : c.ipa ? `/${c.ipa}/` : undefined;
  return {
    id: `word:${fluentSlug(c.en)}|${fluentSlug(c.lt)}`,
    deck: "words", kind: /\s/.test(c.en.trim()) ? "phrase" : "word",
    front: c.lt, back: c.en, ...(note ? { note } : {}),
    source: { kind: "custom" },
    added: now,
    srs: { interval_days: 0, ease_factor: 2.5, repetitions: 0, lapses: 0, due_at: null, last_grade: null, last_reviewed_at: null, reviews: 0 },
  };
}

/** Adds the cards to the course's flashcards (newest first; cards already there are skipped).
 *  Returns how many were added. */
export function mirrorToFluentSteps(cards: Card[], now = Date.now(), storage: KV | null = defaultStorage()): number {
  if (!storage || !cards.length) return 0;
  try {
    const raw = storage.getItem(FLUENT_CARDS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const list: { id?: string }[] = Array.isArray(parsed?.cards) ? parsed.cards : [];
    const ids = new Set(list.map((x) => x?.id));
    const fresh = cards.map((c) => fluentCard(c, now)).filter((x) => !ids.has(x.id) && (ids.add(x.id), true));
    if (!fresh.length) return 0;
    storage.setItem(FLUENT_CARDS_KEY, JSON.stringify({ version: 1, cards: [...fresh.reverse(), ...list] }));
    return fresh.length;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------------------------
// the store the UI uses

interface CardsState {
  cards: Card[];
  /** cardKey of every saved card (for the "saved" dots and buttons). */
  keys: Set<string>;
  /** Saves a card (or finds the one already saved); returns it (null for an empty input). */
  add(input: CardInput): Card | null;
  /** Saves the ones not saved yet; returns how many were new. */
  addMany(inputs: CardInput[]): number;
  answer(id: string, knew: boolean): void;
  remove(id: string): void;
}

const withKeys = (cards: Card[]) => ({ cards, keys: new Set(cards.map((c) => cardKey(c.en))) });

export const useCards = create<CardsState>((set, get) => {
  const commit = (cards: Card[]) => { set(withKeys(cards)); saveCards(cards); };
  return {
    ...withKeys(loadCards()),
    add: (input) => {
      const { cards, added } = addCards(get().cards, [input], Date.now());
      if (added.length) { commit(cards); if (TO_FLUENT) mirrorToFluentSteps(added); }
      return added[0] ?? get().cards.find((c) => cardKey(c.en) === cardKey(input.en)) ?? null;
    },
    addMany: (inputs) => {
      const { cards, added } = addCards(get().cards, inputs, Date.now());
      if (added.length) { commit(cards); if (TO_FLUENT) mirrorToFluentSteps(added); }
      return added.length;
    },
    answer: (id, knew) => commit(get().cards.map((c) => (c.id === id ? answerCard(c, knew, Date.now()) : c))),
    remove: (id) => commit(removeCard(get().cards, id)),
  };
});

// another tab of the game saved cards: pick them up
try {
  if (typeof window !== "undefined") window.addEventListener("storage", (e) => { if (e.key === STORAGE_KEY) useCards.setState(withKeys(loadCards())); });
} catch { /* no window events: this tab only */ }
