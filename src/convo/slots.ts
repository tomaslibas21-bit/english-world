import { foldAccents } from "./normalize";
// Built-in slot types: numbers, prices, clock times, days, dates, spelled letters,
// names and phone numbers. Each returns every plausible reading; the grammar keeps
// the one that lets the whole utterance parse.

import { anyWords, type SlotFn, type SlotResult } from "./grammar";
import type { Tokens } from "./normalize";

const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
// Recogniser homophones that only count as numbers inside number slots.
const NUM_HOMO: Record<string, number> = { won: 1, to: 2, too: 2, for: 4, fore: 4, ate: 8, tree: 3, free: 3, sex: 6, nein: 9, tin: 10 };

const ORD: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17,
  eighteenth: 18, nineteenth: 19, twentieth: 20, thirtieth: 30,
};

/** Read an integer 0–9999 written in digits or words, starting at pos. Returns every prefix that forms a number
 *  ("twenty" and "twenty five" from "twenty five"). "four fifty" stops at 4; price/time/year slots read pairs. */
export function readInt(tokens: Tokens, pos: number, allowHomophones = false): { end: number; value: number; words: boolean; homo?: boolean }[] {
  const out: { end: number; value: number; words: boolean; homo?: boolean }[] = [];
  const t0 = tokens[pos];
  if (t0 === undefined) return out;
  if (/^\d+$/.test(t0)) { out.push({ end: pos + 1, value: parseInt(t0, 10), words: false }); return out; }
  type Kind = "none" | "unit" | "teen" | "tens" | "hundred";
  let i = pos, total = 0, chunk = 0, last: Kind = "none", started = false;
  const unitOf = (w: string) => (w in UNITS ? UNITS[w] : allowHomophones && !started && w in NUM_HOMO ? NUM_HOMO[w] : undefined);
  const homo = allowHomophones && !(t0 in UNITS) && !(t0 in TENS) && t0 in NUM_HOMO;
  const emit = () => out.push({ end: i, value: total + chunk, words: true, homo });
  while (i < tokens.length) {
    const w = tokens[i];
    if (!started && w === "a" && (tokens[i + 1] === "hundred" || tokens[i + 1] === "thousand")) { chunk = 1; last = "unit"; started = true; i++; continue; }
    if (w === "and" && last === "hundred") {
      const nx = tokens[i + 1];
      if (nx && (nx in UNITS || nx in TENS)) { i++; continue; }
      break;
    }
    const u = unitOf(w);
    if (u !== undefined) {
      if (last === "none" || last === "hundred" || (last === "tens" && u > 0 && u < 10)) {
        chunk += u; last = u >= 10 ? "teen" : "unit"; started = true; i++; emit(); continue;
      }
      break;
    }
    if (w in TENS) {
      if (last === "none" || last === "hundred") { chunk += TENS[w]; last = "tens"; started = true; i++; emit(); continue; }
      break;
    }
    if (w === "hundred" && (last === "unit" || last === "teen") && chunk < 100) { chunk *= 100; last = "hundred"; i++; emit(); continue; }
    if (w === "thousand" && started && chunk > 0 && total === 0) { total = chunk * 1000; chunk = 0; last = "hundred"; i++; emit(); continue; }
    break;
  }
  return out;
}

export const numberSlot: SlotFn = (tokens, pos) =>
  // "to"/"for" read as 2/4 cost extra, so ordinary words win when both readings parse
  readInt(tokens, pos, true).filter((r) => r.value <= 9999).map((r) => ({ end: r.end, value: r.value, cost: r.homo ? 0.6 : 0, weak: r.homo }));

export const ordinalSlot: SlotFn = (tokens, pos) => {
  const out: SlotResult[] = [];
  const t = tokens[pos];
  if (t in ORD) out.push({ end: pos + 1, value: ORD[t] });
  // "twenty first"
  if (t in TENS && tokens[pos + 1] in ORD && ORD[tokens[pos + 1]] < 10) out.push({ end: pos + 2, value: TENS[t] + ORD[tokens[pos + 1]] });
  if (/^\d+$/.test(t) && ["th", "st", "nd", "rd"].includes(tokens[pos + 1])) out.push({ end: pos + 2, value: parseInt(t, 10) });
  if (/^\d+$/.test(t)) out.push({ end: pos + 1, value: parseInt(t, 10), cost: 0.2 });
  return out;
};

/** Prices in cents: "4.50", "4.50 dollars", "four fifty", "four dollars fifty", "four dollars and fifty cents", "fifty cents", "twenty". */
export const priceSlot: SlotFn = (tokens, pos) => {
  const out: SlotResult[] = [];
  const t = tokens[pos];
  const add = (end: number, cents: number, cost = 0) => out.push({ end, value: cents, cost });
  const dollarsWord = (w?: string) => w === "dollars" || w === "dollar" || w === "bucks" || w === "buck";
  if (t && /^\d+\.\d{1,2}$/.test(t)) {
    const [d, c] = t.split(".");
    const cents = parseInt(d, 10) * 100 + parseInt(c.padEnd(2, "0"), 10);
    add(pos + 1, cents);
    if (dollarsWord(tokens[pos + 1])) add(pos + 2, cents);
    return out;
  }
  // "000" or "050" is never a price of its own (it is the rest of "12,000" or "1 050")
  if (t && /^0\d/.test(t)) return out;
  // cents are one or two digits: "12 dollars 000" is not $12.00
  const centsTok = (j: number) => !/^\d{3,}$/.test(tokens[j] ?? "");
  const a = t === "a" && dollarsWord(tokens[pos + 1]) ? [{ end: pos + 1, value: 1, words: true }] : readInt(tokens, pos);
  // "12 000 dollars": a space as the thousands separator
  if (t && /^[1-9]\d{0,2}$/.test(t) && /^\d{3}$/.test(tokens[pos + 1] ?? "")) a.push({ end: pos + 2, value: parseInt(t + tokens[pos + 1], 10), words: false });
  for (const first of a) {
    const d = first.value;
    let i = first.end;
    if (d <= 999) add(i, d * 100, 0.1); // "twenty"
    else if (d <= 999999) add(i, d * 100, 0.3); // "a thousand", "12000" (bare, a bit less likely than with "dollars")
    if (dollarsWord(tokens[i])) {
      i++;
      add(i, d * 100);
      let j = i;
      if (tokens[j] === "and") j++;
      for (const c of centsTok(j) ? readInt(tokens, j) : []) {
        if (c.value < 100) {
          add(c.end, d * 100 + c.value);
          if (tokens[c.end] === "cents" || tokens[c.end] === "cent") add(c.end + 1, d * 100 + c.value);
        }
      }
    } else if (tokens[i] === "cents" && d < 100) {
      add(i + 1, d);
    } else {
      // "four fifty", "twelve ninety nine", "four oh five"
      let j = i;
      let oh = false;
      if (tokens[j] === "oh" || tokens[j] === "o") { j++; oh = true; }
      for (const c of centsTok(j) ? readInt(tokens, j) : []) {
        if ((oh && c.value < 10) || (!oh && c.value >= 10 && c.value < 100)) {
          if (d < 100) {
            add(c.end, d * 100 + c.value);
            if (dollarsWord(tokens[c.end])) add(c.end + 1, d * 100 + c.value);
          }
        }
      }
    }
  }
  return out;
};

export interface ClockTime { h: number; m: number; ampm?: "am" | "pm" }

/** Clock times: "7:30", "seven thirty", "half past seven", "quarter to eight", "ten o'clock", "noon", "8 am". */
export const timeSlot: SlotFn = (tokens, pos) => {
  const out: SlotResult[] = [];
  const push = (end: number, t: ClockTime, cost = 0, weak = false) => {
    out.push({ end, value: t, cost, weak });
    // optional am/pm tails
    const tail = readAmPm(tokens, end);
    if (tail) out.push({ end: tail.end, value: { ...t, ampm: tail.v }, cost });
  };
  const t = tokens[pos];
  if (!t) return out;
  if (t === "noon" || t === "midday") { push(pos + 1, { h: 12, m: 0, ampm: "pm" }); return out; }
  if (t === "midnight") { push(pos + 1, { h: 0, m: 0, ampm: "am" }); return out; }
  if (/^\d{1,2}:\d{2}$/.test(t)) {
    const [h, m] = t.split(":").map((x) => parseInt(x, 10));
    if (h <= 23 && m < 60) push(pos + 1, { h, m });
    return out;
  }
  // "7.30", "19.30": Lithuanians often write times with a dot (a little costlier, so a price "4.50" wins a tie)
  if (/^\d{1,2}\.\d{2}$/.test(t)) {
    const [h, m] = t.split(".").map((x) => parseInt(x, 10));
    if (h <= 23 && m < 60) push(pos + 1, { h, m }, 0.05);
    return out;
  }
  // half/quarter/N past/to H
  const rel = (mins: number, end: number) => {
    const w = tokens[end];
    if (w !== "past" && w !== "after" && w !== "to" && w !== "till" && w !== "before") return;
    for (const h of readInt(tokens, end + 1, true)) {
      if (h.value < 1 || h.value > 12) continue;
      let hour = h.value, m = mins;
      if (w === "to" || w === "till" || w === "before") { hour = h.value === 1 ? 12 : h.value - 1; m = 60 - mins; }
      push(h.end, { h: hour, m });
    }
  };
  if (t === "half") rel(30, pos + 1);
  if (t === "quarter" || (t === "a" && tokens[pos + 1] === "quarter")) rel(15, t === "a" ? pos + 2 : pos + 1);
  for (const n of readInt(tokens, pos, true)) {
    // "to"/"for"/"too" heard as 2/4 count as an hour only in a clear time frame: "at for", "for o'clock", "for pm"
    if (n.homo && tokens[pos - 1] !== "at" && tokens[n.end] !== "oclock" && !readAmPm(tokens, n.end)) continue;
    if (n.value >= 1 && n.value <= 30 && tokens[n.end] === "minutes") rel(n.value, n.end + 1);
    if (n.value >= 1 && n.value <= 30) rel(n.value, n.end);
    if (n.value >= 0 && n.value <= 23) {
      const e = n.end;
      if (tokens[e] === "oclock") { push(e + 1, { h: n.value, m: 0 }); continue; }
      // "to"/"for" heard as 2/4 is a doubtful bare hour: costly, and not real content on its own
      push(e, { h: n.value, m: 0 }, n.homo ? 0.6 : 0.05, !!n.homo);
      // "seven thirty", "seven fifteen", "eight oh five"
      let j = e, oh = false;
      if (tokens[j] === "oh" || tokens[j] === "o") { j++; oh = true; }
      for (const m of readInt(tokens, j, false)) {
        if ((oh && m.value < 10) || (!oh && m.value >= 10 && m.value < 60)) push(m.end, { h: n.value, m: m.value });
      }
    }
    if (/^\d{3,4}$/.test(tokens[pos])) {
      const v = tokens[pos]; const h = parseInt(v.slice(0, v.length - 2), 10); const m = parseInt(v.slice(-2), 10);
      if (h <= 23 && m < 60) push(pos + 1, { h, m });
    }
  }
  return out;
};

function readAmPm(tokens: Tokens, i: number): { end: number; v: "am" | "pm" } | null {
  const w = tokens[i], w2 = tokens[i + 1];
  if (w === "am" || (w === "a" && w2 === "m")) return { end: w === "am" ? i + 1 : i + 2, v: "am" };
  if (w === "pm" || (w === "p" && w2 === "m")) return { end: w === "pm" ? i + 1 : i + 2, v: "pm" };
  if (w === "in" && w2 === "the") {
    const w3 = tokens[i + 2];
    if (w3 === "morning") return { end: i + 3, v: "am" };
    if (w3 === "afternoon" || w3 === "evening") return { end: i + 3, v: "pm" };
  }
  if (w === "at" && w2 === "night") return { end: i + 2, v: "pm" };
  return null;
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
export const daySlot: SlotFn = (tokens, pos) => {
  const out: SlotResult[] = [];
  const t = tokens[pos];
  const base = (w?: string) => {
    if (!w) return null;
    const d = w.replace(/s$/, "");
    return DAYS.includes(d) ? d : null;
  };
  if (base(t)) out.push({ end: pos + 1, value: base(t) });
  if ((t === "this" || t === "next" || t === "on") && base(tokens[pos + 1])) out.push({ end: pos + 2, value: base(tokens[pos + 1]), tags: t === "next" ? ["next"] : [] });
  if (t === "today") out.push({ end: pos + 1, value: "today" });
  if (t === "tonight") out.push({ end: pos + 1, value: "tonight" });
  if (t === "tomorrow") {
    out.push({ end: pos + 1, value: "tomorrow" });
    const tail = tokens[pos + 1];
    if (tail === "morning" || tail === "afternoon" || tail === "evening" || tail === "night") out.push({ end: pos + 2, value: "tomorrow", tags: [tail] });
  }
  if (t === "the" && tokens[pos + 1] === "day" && tokens[pos + 2] === "after" && tokens[pos + 3] === "tomorrow") out.push({ end: pos + 4, value: "day_after_tomorrow" });
  if (t === "this" && (tokens[pos + 1] === "weekend" || tokens[pos + 1] === "evening" || tokens[pos + 1] === "afternoon" || tokens[pos + 1] === "morning")) out.push({ end: pos + 2, value: "this_" + tokens[pos + 1] });
  if (t === "next" && tokens[pos + 1] === "week") out.push({ end: pos + 2, value: "next_week" });
  if (t === "next" && tokens[pos + 1] === "weekend") out.push({ end: pos + 2, value: "next_weekend" });
  return out;
};

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
/** Dates: "the fourth of June", "June fourth", "June 4", "4 June", "4th of June". Value {day, month}. */
export const dateSlot: SlotFn = (tokens, pos) => {
  const out: SlotResult[] = [];
  const month = (w?: string) => (w ? MONTHS.indexOf(w) + 1 : 0);
  let i = pos;
  if (tokens[i] === "the") i++;
  for (const d of ordinalSlot(tokens, i, false)) {
    const day = d.value as number;
    if (day < 1 || day > 31) continue;
    let j = d.end;
    if (tokens[j] === "of") j++;
    const m = month(tokens[j]);
    if (m) out.push({ end: j + 1, value: { day, month: m } });
  }
  const m0 = month(tokens[pos]);
  if (m0) {
    let j = pos + 1;
    if (tokens[j] === "the") j++;
    for (const d of ordinalSlot(tokens, j, false)) {
      const day = d.value as number;
      if (day >= 1 && day <= 31) out.push({ end: d.end, value: { day, month: m0 } });
    }
    for (const d of readInt(tokens, j)) if (d.value >= 1 && d.value <= 31) out.push({ end: d.end, value: { day: d.value, month: m0 } });
  }
  return out;
};

/** Years: "1990", "nineteen ninety", "two thousand five", "two thousand and five". */
export const yearSlot: SlotFn = (tokens, pos) => {
  const out: SlotResult[] = [];
  const t = tokens[pos];
  if (/^(19|20)\d\d$/.test(t)) { out.push({ end: pos + 1, value: parseInt(t, 10) }); return out; }
  // "nineteen ninety", "nineteen eighty five"
  const firsts = readInt(tokens, pos).filter((r) => r.value >= 10 && r.value <= 20 && r.end === pos + 1);
  for (const f of firsts) {
    let j = f.end, oh = false;
    if (tokens[j] === "oh") { j++; oh = true; }
    for (const s of readInt(tokens, j)) {
      if ((oh && s.value < 10) || (!oh && s.value >= 10 && s.value < 100)) out.push({ end: s.end, value: f.value * 100 + s.value });
    }
  }
  for (const r of readInt(tokens, pos)) if (r.value >= 1900 && r.value <= 2100) out.push({ end: r.end, value: r.value });
  return out;
};

const LETTER_NAMES: Record<string, string> = {
  a: "a", ay: "a", eh: "a", b: "b", be: "b", bee: "b", c: "c", see: "c", sea: "c", si: "c", d: "d", dee: "d", de: "d",
  e: "e", ee: "e", f: "f", ef: "f", eff: "f", g: "g", gee: "g", ji: "g", h: "h", aitch: "h", age: "h", i: "i", eye: "i",
  j: "j", jay: "j", k: "k", kay: "k", okay: "k", l: "l", el: "l", ell: "l", m: "m", em: "m", n: "n", en: "n", and: "n",
  o: "o", oh: "o", p: "p", pee: "p", pea: "p", q: "q", cue: "q", queue: "q", r: "r", are: "r", ar: "r", s: "s", es: "s", ess: "s",
  t: "t", tee: "t", tea: "t", u: "u", you: "u", v: "v", vee: "v", w: "w", x: "x", ex: "x", y: "y", why: "y", z: "z", zee: "z", zed: "z",
};

/** Spelled letters: "M I K A", "em eye kay ay", "double s". Also a single long run-together token. */
export const lettersSlot: SlotFn = (tokens, pos) => {
  const out: SlotResult[] = [];
  let i = pos;
  let letters = "";
  while (i < tokens.length) {
    const w = tokens[i];
    if (w === "double" && tokens[i + 1] && (LETTER_NAMES[tokens[i + 1]] || tokens[i + 1] === "you" || tokens[i + 1] === "u")) {
      if (tokens[i + 1] === "you" || tokens[i + 1] === "u") { letters += "w"; i += 2; }
      else { const l = LETTER_NAMES[tokens[i + 1]]; letters += l + l; i += 2; }
    } else if (LETTER_NAMES[w] !== undefined && (w.length <= 5)) { letters += LETTER_NAMES[w]; i++; }
    else if (/^[a-z]$/.test(w)) { letters += w; i++; }
    else break;
    // "M as in Mary", "M for Mary", "M like Mary": the example word only confirms the letter
    const last = letters[letters.length - 1];
    if (tokens[i] === "as" && tokens[i + 1] === "in" && tokens[i + 2]?.[0] === last) i += 3;
    else if ((tokens[i] === "for" || tokens[i] === "like") && tokens[i + 1]?.[0] === last && tokens[i + 1].length > 2) i += 2;
    if (letters.length >= 2) out.push({ end: i, value: letters, cost: 0 });
  }
  // a word typed/recognised as one piece ("mikalauskas") also counts, unless it's an ordinary word
  const t = tokens[pos];
  if (t && /^[a-z]{3,}$/.test(t) && !(t in LETTER_NAMES) && !NAME_STOP.has(t)) out.push({ end: pos + 1, value: t, cost: 0.6, tags: ["joined"] });
  return out;
};

/** Words that are never a name or a spelled word ("Sorry?", "Sure.", "Bye." while spelling or giving a name). */
const NAME_STOP = new Set(("i you he she it we they a an the is am are was were be to of in on at for with and or but not no yes " +
  "my your his her our their me him us them this that what where when how who why please thanks thank sorry hello hi " +
  "would like have has had do does did can could will shall should may might must just so okay well " +
  "bye goodbye pardon huh sure wait yeah yep nope right fine great good excuse again repeat slowly moment second minute " +
  "slower louder faster").split(" "));

const KNOWN_NAMES = new Set<string>();
/** The player's own name/surname (and their common recogniser spellings) are cheap to match. */
export function setKnownNames(names: string[]) {
  KNOWN_NAMES.clear();
  for (const n of names) for (const w of foldAccents(n.toLowerCase()).replace(/[^a-z0-9'\s-]/g, " ").split(/[\s-]+/)) if (w) KNOWN_NAMES.add(w);
}

/** Is this word part of the player's own name? */
export const isKnownName = (w: string) => KNOWN_NAMES.has(w);

/** A person's name: one to three words that are not function words. Unknown words cost more,
 *  so that "card" or "latte" is never taken for a name when another reading exists. */
export const nameSlot: SlotFn = (tokens, pos) => {
  const out: SlotResult[] = [];
  let i = pos;
  const parts: string[] = [];
  let cost = 0;
  while (i < tokens.length && parts.length < 3) {
    const w = tokens[i];
    if (NAME_STOP.has(w) || /^\d/.test(w)) break;
    parts.push(w); i++;
    cost += KNOWN_NAMES.has(w) ? 0.05 : 0.95;
    out.push({ end: i, value: parts.map(cap).join(" "), cost, tags: parts.every((p) => KNOWN_NAMES.has(p)) ? ["known_name"] : [] });
  }
  return out;
};
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

const DIGIT_WORDS: Record<string, string> = { zero: "0", oh: "0", o: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", to: "2", too: "2", for: "4", won: "1", ate: "8" };
/** Phone or account numbers read digit by digit: "seven four two nine", "742 913", "double three". Value: digit string. */
export const digitsSlot: SlotFn = (tokens, pos) => {
  const out: SlotResult[] = [];
  let i = pos;
  let s = "";
  while (i < tokens.length) {
    const w = tokens[i];
    if (/^\d+$/.test(w)) { s += w; i++; }
    else if (w === "double" && DIGIT_WORDS[tokens[i + 1]]) { s += DIGIT_WORDS[tokens[i + 1]].repeat(2); i += 2; }
    else if (w === "triple" && DIGIT_WORDS[tokens[i + 1]]) { s += DIGIT_WORDS[tokens[i + 1]].repeat(3); i += 2; }
    else if (DIGIT_WORDS[w] !== undefined) { s += DIGIT_WORDS[w]; i++; }
    else break;
    if (s.length >= 3) out.push({ end: i, value: s });
  }
  return out;
};

export const BUILTIN_SLOTS = {
  number: { fn: numberSlot },
  ordinal: { fn: ordinalSlot },
  price: { fn: priceSlot },
  time: { fn: timeSlot },
  day: { fn: daySlot },
  date: { fn: dateSlot },
  year: { fn: yearSlot },
  letters: { fn: lettersSlot },
  name: { fn: nameSlot },
  digits: { fn: digitsSlot },
  any: { fn: anyWords(5) },
};
