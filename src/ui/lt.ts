// Small Lithuanian UI helpers.

/** Noun form after a number: 1 pokalbis · 2 pokalbiai · 10 pokalbių · 21 pokalbis. */
export function ltCount(n: number, one: string, few: string, many: string): string {
  const d = n % 10, h = n % 100;
  if (h >= 10 && h <= 20) return many;
  if (d === 1) return one;
  if (d === 0) return many;
  return few;
}

/** "Užsisakyti gėrimą" → "Užsisakyk gėrimą" (infinitives at clause starts become 2sg imperatives). */
export function toImperative(s: string): string {
  // nouns and adverbs that only look like infinitives
  const NOT_VERBS = new Set(["patirtis", "sritis", "mintis", "viltis", "naktis", "mirtis", "būtis", "širdis", "arti", "anksti", "karšti", "šilti", "šalti", "kiti", "visi", "pati", "mokesti"]);
  const conv = (w: string) => {
    const m = w.match(/^(\p{L}+?)(tis|ti)(\W*)$/u);
    if (!m || m[1].length < 3 || NOT_VERBS.has((m[1] + m[2]).toLowerCase())) return w;
    // sutik-ti → sutik, pasirink-ti → pasirink, bėg-ti → bėk
    const stem = /k$/.test(m[1]) ? m[1].slice(0, -1) : /g$/.test(m[1]) ? m[1].slice(0, -1) : m[1];
    return stem + (m[2] === "tis" ? "kis" : "k") + m[3];
  };
  // only the first word and words right after "arba" / "ir" / "," / "–" (where tasks begin)
  return s.split(/(\s+)/).map((w, i, arr) => {
    if (!w.trim()) return w;
    const prev = arr.slice(0, i).reverse().find((x) => x.trim());
    const start = !prev || /^\(?(arba|ir)$/i.test(prev) || /[,–:(]$/.test(prev);
    return start ? conv(w) : w;
  }).join("");
}

/** The asterisk after the other person's line (natTip.ts) in Lithuanian, the learner's language. Fillers and
 *  particles that carry no content of their own, so a natural sentence that only adds one of them says
 *  nothing new: na, nu (well), tai (so), o, ir (and), ar (the question particle), gi, juk (after all), ką (as in „ką
 *  gi“), štai, va (here, look). Kept short on purpose: every other word counts. Not gerai: where a natural sentence
 *  has it and the glosses don't, it means "good" („Gerai, kad pasakėte“), not "okay, so". */
export const NAT_FILLERS: ReadonlySet<string> = new Set(["na", "nu", "tai", "o", "ir", "ar", "gi", "juk", "ką", "štai", "va"]);

const FOLD: Record<string, string> = { ą: "a", č: "c", ę: "e", ė: "e", į: "i", š: "s", ų: "u", ū: "u", ž: "z" };

/** The usual Lithuanian endings, written without diacritics, longest first: nouns and adjectives in their cases,
 *  verbs in their persons, tenses and moods. A crude cut, enough to see two forms of one word. */
const ENDINGS = ["tumete", "iuose", "uose", "omis", "emis", "iams", "iais", "ciau", "tume", "kite", "kime", "sime", "site",
  "uosi", "iesi", "ams", "oms", "ems", "ais", "ose", "ese", "yje", "oje", "eje", "iau", "iam", "ame", "ate", "ime", "ite",
  "ome", "ote", "iui", "iai", "ius", "ios", "tum", "siu", "si", "iu", "io", "ia", "as", "is", "ys", "us", "os", "es", "ai",
  "ei", "ui", "ti", "au", "a", "e", "i", "o", "u", "s", "k"];

/** A crude stem: no diacritics, the usual ending cut off (at least 3 letters stay), at most the first 5 letters
 *  (atostogose and atostogų: atost; norite: nor, norėtumėte: nore). */
export function natStem(word: string): string {
  const w = word.replace(/[ąčęėįšųūž]/g, (c) => FOLD[c]);
  const e = ENDINGS.find((x) => w.length - x.length >= 3 && w.endsWith(x));
  return (e ? w.slice(0, w.length - e.length) : w).slice(0, 5);
}
