// Minimal Lithuanian morphology for composing glosses of templated sentences:
// noun case forms come from the content (authored), adjectives and a few
// pronouns/numerals are declined here so that they agree with the noun.

export type Case = "nom" | "gen" | "dat" | "acc" | "ins" | "loc";
export const CASES: Case[] = ["nom", "gen", "dat", "acc", "ins", "loc"];
export type Gender = "m" | "f";
export const caseIndex = (c: Case) => CASES.indexOf(c);

/** "latė/latės/latei/latę/late/latėje" → six forms; "kapučino" (indeclinable) → six equal forms. */
export function parseForms(spec: string): string[] {
  const parts = spec.split("/").map((s) => s.trim());
  if (parts.length === 1) return Array(6).fill(parts[0]);
  if (parts.length !== 6) throw new Error(`Lithuanian forms need 1 or 6 cases: "${spec}"`);
  return parts;
}

type Table = { m: string[]; f: string[]; mpl?: string[]; fpl?: string[] };

const FIXED: Record<string, Table> = {
  vienas: { m: ["vienas", "vieno", "vienam", "vieną", "vienu", "viename"], f: ["viena", "vienos", "vienai", "vieną", "viena", "vienoje"] },
  jis: {
    m: ["jis", "jo", "jam", "jį", "juo", "jame"], f: ["ji", "jos", "jai", "ją", "ja", "joje"],
    mpl: ["jie", "jų", "jiems", "juos", "jais", "juose"], fpl: ["jos", "jų", "joms", "jas", "jomis", "jose"],
  },
  tas: {
    m: ["tas", "to", "tam", "tą", "tuo", "tame"], f: ["ta", "tos", "tai", "tą", "ta", "toje"],
    mpl: ["tie", "tų", "tiems", "tuos", "tais", "tuose"], fpl: ["tos", "tų", "toms", "tas", "tomis", "tose"],
  },
  šis: {
    m: ["šis", "šio", "šiam", "šį", "šiuo", "šiame"], f: ["ši", "šios", "šiai", "šią", "šia", "šioje"],
    mpl: ["šie", "šių", "šiems", "šiuos", "šiais", "šiuose"], fpl: ["šios", "šių", "šioms", "šias", "šiomis", "šiose"],
  },
  koks: { m: ["koks", "kokio", "kokiam", "kokį", "kokiu", "kokiame"], f: ["kokia", "kokios", "kokiai", "kokią", "kokia", "kokioje"] },
  kitas: { m: ["kitas", "kito", "kitam", "kitą", "kitu", "kitame"], f: ["kita", "kitos", "kitai", "kitą", "kita", "kitoje"] },
  savo: { m: Array(6).fill("savo"), f: Array(6).fill("savo") },
  // -is adjective with an -as-type plural (not *dideliai)
  didelis: {
    m: ["didelis", "didelio", "dideliam", "didelį", "dideliu", "dideliame"], f: ["didelė", "didelės", "didelei", "didelę", "didele", "didelėje"],
    mpl: ["dideli", "didelių", "dideliems", "didelius", "dideliais", "dideliuose"], fpl: ["didelės", "didelių", "didelėms", "dideles", "didelėmis", "didelėse"],
  },
  du: { m: ["du", "dviejų", "dviem", "du", "dviem", "dviejuose"], f: ["dvi", "dviejų", "dviem", "dvi", "dviem", "dviejose"] },
  trys: { m: ["trys", "trijų", "trims", "tris", "trimis", "trijuose"], f: ["trys", "trijų", "trims", "tris", "trimis", "trijose"] },
  keturi: { m: ["keturi", "keturių", "keturiems", "keturis", "keturiais", "keturiuose"], f: ["keturios", "keturių", "keturioms", "keturias", "keturiomis", "keturiose"] },
};

function declineRegular(lemma: string): Table | null {
  const stem = (suf: string) => lemma.slice(0, -suf.length);
  if (lemma.endsWith("ias")) {
    const s = stem("ias");
    return { m: [lemma, s + "io", s + "iam", s + "ią", s + "iu", s + "iame"], f: [s + "ia", s + "ios", s + "iai", s + "ią", s + "ia", s + "ioje"],
      mpl: [s + "i", s + "ių", s + "iems", s + "ius", s + "iais", s + "iuose"], fpl: [s + "ios", s + "ių", s + "ioms", s + "ias", s + "iomis", s + "iose"] };
  }
  if (lemma.endsWith("as")) {
    const s = stem("as");
    return { m: [lemma, s + "o", s + "am", s + "ą", s + "u", s + "ame"], f: [s + "a", s + "os", s + "ai", s + "ą", s + "a", s + "oje"],
      mpl: [s + "i", s + "ų", s + "iems", s + "us", s + "ais", s + "uose"], fpl: [s + "os", s + "ų", s + "oms", s + "as", s + "omis", s + "ose"] };
  }
  if (lemma.endsWith("is")) {
    const s = stem("is");
    return { m: [lemma, s + "io", s + "iam", s + "į", s + "iu", s + "iame"], f: [s + "ė", s + "ės", s + "ei", s + "ę", s + "e", s + "ėje"],
      mpl: [s + "iai", s + "ių", s + "iams", s + "ius", s + "iais", s + "iuose"], fpl: [s + "ės", s + "ių", s + "ėms", s + "es", s + "ėmis", s + "ėse"] };
  }
  if (lemma.endsWith("us")) {
    const s = stem("us");
    return { m: [lemma, s + "aus", s + "iam", s + "ų", s + "iu", s + "iame"], f: [s + "i", s + "ios", s + "iai", s + "ią", s + "ia", s + "ioje"],
      mpl: [s + "ūs", s + "ių", s + "iems", s + "ius", s + "iais", s + "iuose"], fpl: [s + "ios", s + "ių", s + "ioms", s + "ias", s + "iomis", s + "iose"] };
  }
  return null;
}

/** Decline an agreeing word (adjective, pronoun, numeral) given in its masculine nominative. */
export function agree(lemma: string, g: Gender, c: Case, plural = false): string {
  const t = FIXED[lemma] ?? declineRegular(lemma);
  if (!t) return lemma; // indeclinable (e.g. "savo", loanwords)
  const row = plural ? (g === "m" ? t.mpl : t.fpl) : g === "m" ? t.m : t.f;
  return (row ?? (g === "m" ? t.m : t.f))[caseIndex(c)];
}

/** Resolve inline "{m:pasiruošęs|f:pasiruošusi}" choices by a gender. */
export function genderChoice(text: string, g: Gender): string {
  return text.replace(/\{m:([^|}]*)\|f:([^}]*)\}/g, (_m, a, b) => (g === "m" ? a : b));
}
