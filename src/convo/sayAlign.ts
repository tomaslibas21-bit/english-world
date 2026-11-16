// How each number in a written line is really said: the words of the line's spoken form (`say`, the text the voice
// clip was made from) that stand where the written line has digits. "My number is +370 612 34567." said as "My number
// is plus three seven zero, six one two, three four five six seven." gives +370 → plus three seven zero, 612 → six
// one two, 34567 → three four five six seven; "flight 223" said "flight two twenty-three" keeps the voice's reading.
// The IPA under a number (ipa.ts) is then the IPA of those words, so it says what the clip says (owner, 16 Nov 2026:
// phone digits had been read as cardinals, "612" as "six hundred twelve"; +370 and 34567 had no IPA at all).
// Language-neutral: the words around the numbers are the anchors; both editions' ipa.ts use it.

/** A written word that holds a digit (a number, a price, a time, a code such as HH-4471 or 3B). */
export const hasDigit = (w: string) => /\d/.test(w);

const norm = (w: string) =>
  w.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/’/g, "'").replace(/^[^\p{L}\d']+|[^\p{L}\d']+$/gu, "").replace(/^'|'$/g, "");

/**
 * For every written word of the line (units split on spaces, in order) that holds a digit: the spoken words that say
 * it, or null where the spoken form can't be lined up with the written one (no `say`, a `say` that still has the
 * digits, or a rewritten sentence). Words keep the spoken form's spelling minus punctuation ("twenty-three").
 */
export function spokenNumbers(words: string[], say: string | undefined): (string[] | null)[] {
  const out: (string[] | null)[] = words.map(() => null);
  if (!say || !words.some(hasDigit)) return out;
  const sayW = say.split(/\s+/).filter(Boolean);
  const sayN = sayW.map(norm);
  // the spoken form still has digits where the line has them: the voice read the digits itself, nothing to learn
  if (sayN.some(hasDigit)) return out;
  const commaAfter = sayW.map((w) => /[,;:]$/.test(w));
  const nextAnchor = (i: number) => { for (let k = i + 1; k < words.length; k++) { if (hasDigit(words[k])) return null; const n = norm(words[k]); if (n) return n; } return null; };

  let cur = 0;
  let pending: number[] = [];
  const assign = (end: number) => {
    if (!pending.length) return;
    const span = Array.from({ length: end - cur }, (_, k) => cur + k).filter((k) => sayN[k]);
    if (span.length) split(pending, span);
    pending = [];
  };
  const split = (idx: number[], span: number[]) => {
    const text = (k: number) => sayW[k].replace(/^[^\p{L}\d']+|[^\p{L}\d'-]+$/gu, "");
    if (idx.length === 1) { out[idx[0]] = span.map(text); return; }
    // several written groups in a row (a phone number "+370 612 34567"): the spoken form's commas part them
    const groups: number[][] = [[]];
    for (const k of span) { groups[groups.length - 1].push(k); if (commaAfter[k]) groups.push([]); }
    const g = groups.filter((x) => x.length);
    // the last group read in pairs ("984 123 4567" said "…, cuarenta y cinco, sesenta y siete"; "0142" said "cero
    // uno, cuarenta y dos"): the spoken groups past the written ones belong to the last written group
    const lastDigits = (words[idx[idx.length - 1]].match(/\d/g) ?? []).length;
    const extra = g.length - idx.length;
    if (extra > 0 && lastDigits >= 4 && extra <= lastDigits / 2 - 1 && idx.every((wi) => /^\+?\d+[.,;:!?]*$/.test(words[wi]))) {
      g.splice(idx.length - 1, extra + 1, g.slice(idx.length - 1).flat());
    }
    if (g.length === idx.length) { idx.forEach((wi, n) => { out[wi] = g[n].map(text); }); return; }
    // otherwise one spoken word per digit, if that is what it is ("five five five oh one four two")
    const digits = idx.map((wi) => (words[wi].match(/\d/g) ?? []).length);
    if (digits.reduce((a, b) => a + b, 0) === span.length) {
      let p = 0;
      idx.forEach((wi, n) => { out[wi] = span.slice(p, p + digits[n]).map(text); p += digits[n]; });
    }
  };

  for (let i = 0; i < words.length; i++) {
    if (hasDigit(words[i])) { pending.push(i); continue; }
    const n = norm(words[i]);
    if (!n) continue;
    // the next place the spoken form has this word; after a number, the word after it must follow as well (the
    // "and" of "a hundred and three" is not the "and" after the number)
    const after = pending.length ? nextAnchor(i) : null;
    let found = -1;
    for (let k = cur; k < Math.min(sayN.length, cur + (pending.length ? 14 : 4)); k++) {
      if (sayN[k] !== n) continue;
      if (after && k + 1 < sayN.length && sayN.slice(k + 1, k + 3).every((x) => x !== after)) continue;
      found = k; break;
    }
    if (found < 0) {
      // a word the spoken form leaves out or says otherwise ("St." → Street, a name left out): the number before it
      // can't be placed
      if (pending.length) pending = [];
      continue;
    }
    assign(found);
    cur = found + 1;
  }
  assign(sayW.length);
  return out;
}
