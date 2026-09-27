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
