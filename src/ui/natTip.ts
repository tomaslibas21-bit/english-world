// The small "*" after the other person's sentence (Interlinear.tsx, NatTip): when the word-by-word Lithuanian is
// on but the whole natural sentence isn't shown under it ("Visas sakinys lietuviškai" off), a line whose natural
// translation tells you something its word glosses don't gets an asterisk, and the natural sentence in a tooltip.
// That is a content word the glosses don't have: "My pleasure!" is "Mano | malonumas!" word by word but "Mielai!"
// naturally, so it gets one. Words left out, other forms of the same word, word order and fillers don't count:
// "Ko | — | jūs | norėtumėte?" / "Ko norite?" and "Tai | kaip | sekasi?" / "Na, kaip sekasi?" get none (the owner:
// the asterisk is to mark what is new, not to fill the line).
import type { Sentence } from "../convo/compose";

/** A sentence made comparable: lower case, no punctuation (quotes „“”"«», dashes, „…“, !?.,), single spaces. */
export function natNorm(text: string): string {
  return text.normalize("NFC").toLowerCase().replace(/\p{P}+/gu, " ").replace(/\s+/g, " ").trim();
}

const words = (text: string) => natNorm(text).split(" ").filter(Boolean);

/** The word glosses read one after another, without the "—" units (words Lithuanian doesn't say on their own;
 *  the same test as isDashGloss in state/cards.ts). */
export function glossLine(units: Sentence["units"]): string {
  return units.filter((u) => !u.lt.trim().startsWith("—")).map((u) => u.lt).join(" ");
}

/** Fillers and particles that carry no content of their own, so a natural sentence that only adds one of them says
 *  nothing new: na, nu (well), tai (so), o, ir (and), ar (the question particle), gi, juk (after all), ką (as in „ką
 *  gi“), štai, va (here, look). Kept short on purpose: every other word counts. Not gerai: where a natural sentence
 *  has it and the glosses don't, it means "good" („Gerai, kad pasakėte“), not "okay, so". */
const FILLERS = new Set(["na", "nu", "tai", "o", "ir", "ar", "gi", "juk", "ką", "štai", "va"]);

const FOLD: Record<string, string> = { ą: "a", č: "c", ę: "e", ė: "e", į: "i", š: "s", ų: "u", ū: "u", ž: "z" };

/** The usual Lithuanian endings, written without diacritics, longest first: nouns and adjectives in their cases,
 *  verbs in their persons, tenses and moods. A crude cut, enough to see two forms of one word. */
const ENDINGS = ["tumete", "iuose", "uose", "omis", "emis", "iams", "iais", "ciau", "tume", "kite", "kime", "sime", "site",
  "uosi", "iesi", "ams", "oms", "ems", "ais", "ose", "ese", "yje", "oje", "eje", "iau", "iam", "ame", "ate", "ime", "ite",
  "ome", "ote", "iui", "iai", "ius", "ios", "tum", "siu", "si", "iu", "io", "ia", "as", "is", "ys", "us", "os", "es", "ai",
  "ei", "ui", "ti", "au", "a", "e", "i", "o", "u", "s", "k"];

/** A crude stem: no diacritics, the usual ending cut off (at least 3 letters stay), at most the first 5 letters
 *  (atostogose and atostogų: atost; norite: nor, norėtumėte: nore). */
export function stem(word: string): string {
  const w = word.replace(/[ąčęėįšųūž]/g, (c) => FOLD[c]);
  const e = ENDINGS.find((x) => w.length - x.length >= 3 && w.endsWith(x));
  return (e ? w.slice(0, w.length - e.length) : w).slice(0, 5);
}

/** Two stems are forms of one word when one starts the other (3 letters at least; shorter ones must be equal). */
function sameWord(a: string, b: string): boolean {
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 3 ? long.startsWith(short) : short === long;
}

/** The natural sentence's content words that the word glosses don't have (in none of their forms). */
export function newWords(s: Pick<Sentence, "units" | "nat">): string[] {
  const nat = words(s.nat ?? "");
  const have = words(glossLine(s.units)).map(stem);
  return nat.filter((w) => !FILLERS.has(w) && !have.some((h) => sameWord(stem(w), h)));
}

/** Does the natural translation tell you something the word glosses don't (a content word they don't have)? */
export function natSaysMore(s: Pick<Sentence, "units" | "nat">): boolean {
  return newWords(s).length > 0;
}

export interface Box { left: number; top: number; right: number; bottom: number }
export interface TipSpot { left: number; top: number; below: boolean; arrow: number }

/** Where the tooltip goes: centred above the asterisk, or below it when there's no room above; always inside
 *  `box` (the conversation panel), `m` px from its edges. `arrow` is the arrow's x inside the tooltip. */
export function placeTip(a: Box, w: number, h: number, box: Box, m = 8, gap = 8): TipSpot {
  const cx = (a.left + a.right) / 2;
  const left = Math.round(Math.max(box.left + m, Math.min(box.right - m - w, cx - w / 2)));
  const fitsAbove = a.top - gap - h >= box.top + m;
  const fitsBelow = a.bottom + gap + h <= box.bottom - m;
  // neither fits (a very short panel): the side with more room
  const below = !fitsAbove && (fitsBelow || box.bottom - a.bottom > a.top - box.top);
  const top = Math.round(below ? Math.min(a.bottom + gap, box.bottom - m - h) : Math.max(box.top + m, a.top - gap - h));
  return { left, top, below, arrow: Math.round(Math.max(14, Math.min(w - 14, cx - left))) };
}
