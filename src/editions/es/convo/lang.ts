// Spanish (Mexican, with the neutral Latin American forms understood too) for the shared engine: replaces
// src/convo/lang.ts in the Spanish edition (docs/es/EDITIONS.md). Everything here is written accent-free and in
// lowercase, because the engine compares folded words ("café" = "cafe", "sí" = "si").
//
// The two things Spanish does differently from English here:
// - "no" is both the answer and the verb's negation. "No quiero leche" is "I don't want milk", never "No." + "I want
//   milk": after a bare leading "no" (no comma) an answer must start with a correction word (`correctionStarters`:
//   "No, el grande", "No, para llevar"); a verb right after it stays negated.
// - Learners add subject pronouns ("yo quiero", "usted tiene"), mix tú and usted forms and slip on gender and
//   person ("la café", "yo quiere"): all understood (`skippable`, `grammarClasses`, `inflectionVariant`). But a verb's
//   last vowel carries its person and mood: "tengo" is never "tenga", "tomo" never "tome" or "toma" (`inflectionVariant`).
// Two accents are kept, because they change what is said: a past tense in é / ó ("pagué", "compró" is never "pague",
// "compro") and the "if" of "¿Y si cancelo?" (never the "sí" of a yes). See `preSurface`.
import type { LangPack } from "../../../convo/lang";
import { isArPresentA, isFiniteVerb } from "./verbs";

type Tokens = string[];

const INFORMAL: Record<string, string> = {
  pa: "para", pal: "para el", q: "que", xq: "porque", pq: "porque", porq: "porque", xk: "porque",
  tb: "tambien", tmb: "tambien", tbn: "tambien", toy: "estoy", tamos: "estamos", ta: "esta", tas: "estas", tan: "estan",
  pos: "pues", pus: "pues", ps: "pues", tons: "entonces", entons: "entonces", sip: "si", sep: "si", nop: "no", nel: "no",
  okey: "ok", oki: "ok", okis: "ok", okay: "ok", vale: "vale", aki: "aqui", ntp: "no te preocupes", grax: "gracias", graxias: "gracias",
};

/** Spain's words, which learners may know: read as the Mexican word the patterns use (owner's decision, 1 Nov 2026:
 *  a learner's Spain forms count as correct; the town's people never say them). Applied to what the learner says and
 *  to the patterns alike. */
const SPAIN: Record<string, string> = {
  movil: "celular", moviles: "celulares", ordenador: "computadora", ordenadores: "computadoras", zumo: "jugo", zumos: "jugos",
  patata: "papa", patatas: "papas", coche: "carro", coches: "carros", coger: "tomar", cojo: "tomo", coge: "toma", coges: "tomas",
  cogemos: "tomamos", conducir: "manejar", conduzco: "manejo", conduce: "maneja", aparcar: "estacionar", aparcamiento: "estacionamiento",
  gafas: "lentes", melocoton: "durazno", melocotones: "duraznos", judias: "frijoles", gamba: "camaron", gambas: "camarones",
  vosotros: "ustedes", vosotras: "ustedes", os: "les", vuestro: "su", vuestra: "su", vuestros: "sus", vuestras: "sus",
  // (11 Nov 2026, Spain's text; words already in the conversations' own patterns, such as camarero, aseo, nevera or
  // ducha, stay there) the card reader, peas, peanuts, apricots
  datafono: "terminal", guisantes: "chicharos", cacahuete: "cacahuate", cacahuetes: "cacahuates",
  albaricoque: "chabacano", albaricoques: "chabacanos",
};

const PLEASE_ONE = new Set(["porfa", "porfavor", "porfis", "xfa", "plis", "please"]);

/** Spanish endings, longest first: a stem shared by two forms is the same word ("pago", "pagar", "pagué"). */
const ENDINGS = ["aciones", "acion", "asteis", "isteis", "areis", "ereis", "abais", "iais", "iendo", "ando", "aron", "ieron", "abamos", "iamos", "arian", "erian", "irian",
  "aria", "eria", "iria", "aras", "eras", "iras", "aste", "iste", "amos", "emos", "imos", "aban", "aba", "abas", "ian", "ias", "ia",
  "ados", "adas", "idos", "idas", "ado", "ada", "ido", "ida", "ara", "iera", "are", "ere", "ire",
  "ais", "eis", "ar", "er", "ir", "as", "es", "an", "en", "os", "is", "o", "a", "e", "s"] as const;
function stems(w: string): string[] {
  const out = new Set([w]);
  for (const e of ENDINGS) if (w.endsWith(e) && w.length - e.length >= 3) out.add(w.slice(0, -e.length));
  return [...out];
}
function stemAndSuffix(w: string): [string, string] {
  for (const e of ENDINGS) if (w.length > e.length + 2 && w.endsWith(e)) return [w.slice(0, -e.length), e];
  return [w, ""];
}

/** The sounds of a folded Spanish spelling as Mexican Spanish says them: b = v, s = z = c(e/i), y = ll, a silent h,
 *  k = qu = c(a/o/u), j = g(e/i). "baso" and "vaso", "serbesa" and "cerveza", "yevar" and "llevar" say the same. */
function phon(w: string): string {
  return w
    .replace(/ch/g, "C").replace(/qu(?=[ei])/g, "k").replace(/gu(?=[ei])/g, "g").replace(/g(?=[ei])/g, "j")
    .replace(/c(?=[ei])/g, "s").replace(/c/g, "k").replace(/z/g, "s").replace(/v/g, "b").replace(/w/g, "u")
    .replace(/ll/g, "y").replace(/h/g, "").replace(/rr/g, "r").replace(/x(?=[aeiou])/g, "ks");
}
const firstSound = (w: string) => phon(w)[0] ?? "";

/** Adjectives that are verb forms too: their gender slips stay ("el tanque llena" is "lleno"). */
const ADJ_VERB = new Set(["lleno", "llena", "vacio", "vacia", "limpio", "limpia", "seco", "seca", "bajo", "baja", "corto",
  "corta", "junto", "junta"]);
/** Two forms of one verb whose last vowel (before an -s or -n) says who does it, or whether it is a command or wish:
 *  "tengo" / "tenga", "tomo" / "tome" / "toma", "llevo" / "lleve" / "lleva", "quiero" / "quiera", "tiro" / "tires". A
 *  slip between them changes what is said ("Tengo el vuelo…" is no "Tenga"), so it is never forgiven. An e against o
 *  or a is never a gender slip either ("tarde" / "tardo", "leche" / "lecho"); o against a is one for nouns and
 *  adjectives ("rojo" / "roja", "rojos" / "rojas"). (The common verbs' person slips, "yo quiere", are `grammarClasses`.) */
function personOrMood(a: string, b: string): boolean {
  const [ra, ea] = theme(a), [rb, eb] = theme(b);
  if (!ra || !rb || ra !== rb || ea[0] === eb[0]) return false;
  if (ea[0] === "e" || eb[0] === "e") return true;
  return isFiniteVerb(a) && isFiniteVerb(b) && !ADJ_VERB.has(a) && !ADJ_VERB.has(b);
}
/** "tomas" → ["tom", "as"]: the stem and its ending, a vowel a / e / o with an optional -s or -n ("" if there is none). */
function theme(w: string): [string, string] {
  const m = /^(.{2,}?)([aeo][sn]?)$/.exec(w);
  return m ? [m[1], m[2]] : ["", ""];
}

const NUMBER_WORDS = new Set(["cero", "uno", "una", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez",
  "once", "doce", "trece", "catorce", "quince", "dieciseis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintiun",
  "veintiuna", "veintidos", "veintitres", "veinticuatro", "veinticinco", "veintiseis", "veintisiete", "veintiocho", "veintinueve",
  "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa", "cien", "ciento", "doscientos", "doscientas",
  "trescientos", "trescientas", "cuatrocientos", "cuatrocientas", "quinientos", "quinientas", "seiscientos", "seiscientas",
  "setecientos", "setecientas", "ochocientos", "ochocientas", "novecientos", "novecientas", "mil", "millon", "millones",
  "medio", "media", "cuarto", "primero", "primera", "primer", "segundo", "segunda", "tercero", "tercera", "tercer"]);

/** "Doña Lupe", "Don Rigo", "Doctora Ruiz": the title with the name, or the name alone (never the title alone:
 *  "dona" is also a doughnut). */
const TITLES = new Set(["don", "dona", "senor", "senora", "senorita", "doctor", "doctora", "oficial", "licenciado", "licenciada", "profe", "maestro", "maestra"]);
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** A past tense said with its accent: "pagué", "compré", "pagó", "compró" (the preterite of an -ar verb). Folded it
 *  would be "pague" (an usted command) or "pago" (I pay), so it is written with an apostrophe before its last vowel
 *  ("pagu'e", "pag'o"): it then matches only a pattern word written with the accent ("ya lo pagué"), while the
 *  learner's unaccented "pague" still matches that one too (`sameWord`). Not a past: a word in -ió (an -er / -ir past,
 *  which never looks like a present), a future ("pagaré", "tendré"), "esté", nouns and names ("café", "carné", "José"). */
const NOT_PAST = new Set(["cafe", "bebe", "carne", "pure", "canape", "chale", "comite", "consome", "frappe", "pate", "este",
  "porque", "jose", "rene", "josue", "salome", "chloe", "dafne", "buro", "domino", "capo", "yoyo"]);
function markPast(word: string): string {
  const last = word.slice(-1);
  if (!/[éóÉÓ]/.test(last)) return word;
  const f = fold(word);
  if (f.length < 4 || NOT_PAST.has(f) || /io$/.test(f) || /(?:ar|er|ir|dr|br|rr)e$/.test(f)) return word;
  return word.slice(0, -1) + "'" + fold(last);
}
/** A past tense written with its accent (see markPast): "pagu'e", "lleg'o". */
const isPast = (w: string | undefined) => !!w && /^[a-z]{2,}'[eo]$/.test(w);
/** Kept as one word by `expand`: a past tense ("pagu'e") and the "if" ("s'i"). */
const MARKED = /^[a-z]+'[aeiou]$/;

/** Clitics before a verb ("No la tiro", "No me la tomo"); la / las / los are also articles ("No, la roja"). */
const CLITICS = new Set(["me", "te", "se", "le", "les", "lo", "la", "los", "las", "nos"]);
/** After "la" / "las", words that read as well as the noun or adjective of a correction ("No, la tarde", "No, la cuenta"). */
const NOUN_LIKE = new Set(["tarde", "tardes", "calle", "calles", "parte", "partes", "corte", "base", "mente", "firme", "sobre",
  "venda", "coma", "cuesta", "salsa", "pasa", "pasas"]);
/** Verbs that may begin a new part after a negative one ("No tengo efectivo, | quiero pagar con tarjeta"; "No vengo de
 *  vacaciones, | vengo a una conferencia"), but never right after a "no": that "no" is theirs (`noNegates`). Not "voy":
 *  "No voy a Cancún, voy a Mérida" is one correction, and as two parts it would lose it (s67a). */
const PART_VERBS = ["tengo", "tiene", "hay", "puede", "puedo", "podria", "quiero", "quisiera", "pago", "prefiero", "vengo",
  "vine", "estoy"];
/** What a "no" right before it negates (`noNegates`): those verbs, and "está" / "queda", which never begin an answer
 *  after a bare "no": "No está en Canadá" is no "No." + "(it's) in Canada", "No queda lejos" no "No." + "far" (s63). With a
 *  comma ("No, está en Canadá") the answer stands. */
const NEGATED_VERB = new Set([...PART_VERBS, "esta", "estan", "queda", "quedan"]);
/** A clitic `c` before `a` (and `b`): "la tiro", "me la tomo", "lo compré" are a verb with its clitics; "la roja", "la
 *  cuenta", "las dos" are the noun phrase of a correction. `open`: b is unknown, so a second clitic is enough ("me la …"). */
function cliticVerb(c: string, a: string | undefined, b: string | undefined, open = false): boolean {
  if (CLITICS.has(a ?? "")) return open || isFiniteVerb(b) || isPast(b);
  if (!isFiniteVerb(a) && !isPast(a)) return false;
  return !((c === "la" || c === "las") && (isArPresentA(a) || NOUN_LIKE.has(a!)));
}
/** "Si no hay problema" typed without its comma and accent is "Sí, no hay problema" (a yes and a reassurance) when
 *  nothing follows it; "Si no hay problema, me lo llevo" is an "if". */
const REASSURANCE = new Set(["hay problema", "hay ningun problema", "pasa nada", "importa", "se preocupe", "te preocupes",
  "se moleste", "te molestes", "hay de que", "hay bronca"]);
/** "¿Y si cancelo?", "¿Qué pasa si…?", "¿Qué tal si…?", "Si no me queda…": the "si" of a condition, never the "sí" of a
 *  yes (accents are folded, so "si" would read as "sí"). Written "s'i", in what the learner says and in the patterns
 *  alike, so a what-if pattern still matches it ("(y si | que pasa si) cancelo": the "si" in the same words as its "y",
 *  the only context a pattern's words have), and "¿Y si lo pago por adelantado?" never reads as "[sí] lo pago por
 *  adelantado". A "sí" with its accent is still a yes ("Y sí, cancelo"). */
function markIf(s: string): string {
  s = s.replace(/(^|[^\p{L}])(y|pasa|tal)(\s*[)\]]?\s+)si(?![\p{L}'])/giu, "$1$2$3s'i");
  // "Si no me queda", "Si no tengo efectivo": at the start, "si no" and a verb (not "Si, no…", "Sí, no…", nor a
  // reassurance on its own: "si no hay problema" is "Sí, no hay problema")
  return s.replace(/^([^\p{L}]*)si(\s+no\s+)((?:\p{L}+\s+){0,2}\p{L}+)/iu, (m, pre: string, sp: string, rest: string, _at: number, all: string) => {
    const after = fold(all.slice(pre.length + 2 + sp.length)).replace(/[^\p{L}\s]/gu, " ").trim().replace(/\s+/g, " ");
    if (REASSURANCE.has(after.replace(/ (?:muchas )?gracias$| (?:senor|senora|senorita|joven)$/, ""))) return m;
    const ws = fold(rest).split(/\s+/);
    let i = 0;
    while (i < ws.length - 1 && CLITICS.has(ws[i])) i++;
    return isFiniteVerb(ws[i]) ? `${pre}s'i${sp}${rest}` : m;
  });
}

/** Set phrases with a "no" that negate nothing after them: "No te preocupes. ¿Tienes perro?", "No pasa nada. ¿Eres de
 *  aquí?" (s84). ("No importa" is no such phrase: "No importa el precio" says what doesn't matter.) */
const SETTLED_NEGATIVE = ["no te preocupes", "no se preocupe", "no se preocupen", "no te apures", "no se apure", "no pasa nada",
  "no hay problema", "no hay ningun problema", "no hay de que", "no hay bronca", "no hay cuidado", "no es nada", "no manches",
  "no inventes", "no me digas", "ni modo"].map((p) => p.split(" "));
function settledNegative(piece: Tokens): boolean {
  let end = piece.length;
  const endsWith = (p: string[]) => end >= p.length && p.every((w, k) => piece[end - p.length + k] === w);
  const hit = SETTLED_NEGATIVE.find(endsWith);
  if (!hit) return false;
  end -= hit.length;
  return !piece.slice(0, end).some((t) => LANG.pieceNegators.has(t) || LANG.negation.has(t));
}

/** Words a piece begins with that make it no subject of a verb after it: a preposition ("Al centro, | ¿es lejos?") or
 *  a word said to someone ("Gracias por todo. | Fue un gusto"). */
const NOT_A_SUBJECT = new Set(["a", "al", "de", "del", "en", "con", "para", "por", "sin", "desde", "hasta", "hacia", "gracias",
  "hola", "adios", "perdon", "disculpe", "disculpa", "oiga", "oye", "mire", "mira", "bueno", "ok", "si", "claro", "perfecto", "vale",
  "sale", "orale", "andale"]);
/** Words before a noun: a verb form right after one is a noun ("el vuelo", "la cuenta", "mi pago"). */
const BEFORE_NOUN = new Set(["el", "la", "los", "las", "un", "una", "unos", "unas", "mi", "mis", "tu", "tus", "su", "sus", "nuestro",
  "nuestra", "este", "esta", "ese", "esa", "otro", "otra", "del", "al"]);
/** "Voy en el 223, | ¿va a tiempo?": a piece with its own verb (or one that can't be a subject) lets the next piece
 *  begin with a verb; "El vuelo 223 | va a tiempo" (the subject and its verb) stays one piece (s64c). */
const ownClause = (piece: Tokens) => NOT_A_SUBJECT.has(piece[0])
  || piece.some((t, k) => (isFiniteVerb(t) || isPast(t)) && !BEFORE_NOUN.has(piece[k - 1]));

/** A question with a question word (after a preposition: "a qué hora", "de dónde") followed by a noun phrase: that noun
 *  phrase is the question's own subject or object, "¿A qué hora sale | el último?" (s67a), "¿Cuánto cuesta | el
 *  grande?", never a question plus the answer "el último". An answer that begins with a preposition stays one ("¿Cuánto
 *  cuesta | a Mérida?" names the destination). */
const QUESTION_PREP = new Set(["a", "al", "de", "del", "en", "con", "para", "por", "desde", "hasta"]);
const QUESTION_WORD = new Set(["que", "donde", "adonde", "cuando", "como", "cuanto", "cuanta", "cuantos", "cuantas", "cual", "cuales", "quien", "quienes"]);
const NOUN_PHRASE_START = new Set(["el", "la", "los", "las", "un", "una", "unos", "unas", "este", "esta", "ese", "esa", "estos", "esas", "esos",
  "estas", "mi", "mis", "tu", "tus", "su", "sus", "otro", "otra"]);
const questionOwns = (q: Tokens, a: Tokens) => QUESTION_WORD.has(QUESTION_PREP.has(q[0]) ? q[1] : q[0]) && NOUN_PHRASE_START.has(a[0]);

/** The persons of poder (s65b): the learner's "puedo" / "podemos" (I, we) is never "puede" / "pueden" (you), so "Yo
 *  puedo llevarla" is no "¿Pueden llevarla?", nor a pattern's "podría" (whose person the pattern means: "could you"). The
 *  other way stays a slip: "¿Se puede…?", "¿Puede pagar…?" for "can I", the tú/usted forms, and the polite "¿Podría…?",
 *  which fits either person. */
const PODER_ME = new Set(["puedo", "podemos", "pude", "pudimos"]);
const PODER_YOU = new Set(["puedes", "puede", "pueden", "podeis", "pudo", "pudiste", "pudieron"]);
const PODER_IF = new Set(["podria", "podrias", "podriamos", "podrian", "pudiera", "pudieras", "pudieran"]);
const poderSide = (w: string) => (PODER_ME.has(w) ? 1 : PODER_YOU.has(w) ? 2 : PODER_IF.has(w) ? 3 : 0);
function poderVariant(heard: string, target: string): number | undefined {
  const a = poderSide(heard), b = poderSide(target);
  if (!a || !b) return undefined;
  return a === 1 && b !== 1 ? 0 : 0.87;
}

/** The key words, and every past tense said with its accent ("pagu'e"). */
class KeyWords extends Set<string> {
  has(w: string): boolean { return super.has(w) || isPast(w); }
}

export const LANG: LangPack = {
  // "ajá", "mhm" = yes; "a el" / "de el" are always "al" / "del"; a past tense and the "if" keep what their accent
  // says (markPast, markIf); the letter "eñe" (and "ñ") is no "ene" ({letters}); a closing "porque no" / "porque sí" is
  // the question "¿por qué no?" (a leading "porque" is only the reason's start: "Porque tengo dos boletos" is the
  // answer, "Porque no" no "No."); "yo puede" is the learner's "yo puedo" (the persons of poder differ: "Yo puedo
  // llevarla" is no "¿Pueden llevarla?")
  preSurface: (s) => markIf(s
    .replace(/(^|[^\p{L}])porque(\s+)(no|s[ií])(?=[\s.!?¡¿,;:"'”)…]*$)/iu, "$1por que$2$3")
    .replace(/(^|[^\p{L}])(yo\s+(?:no\s+|tambi[eé]n\s+|s[ií]\s+)?)pued(?:e|es|en)(?![\p{L}])/giu, "$1$2puedo")
    .replace(/(^|[^\p{L}])(aj[aá]m?|mjm|mhm|uh[- ]huh|mm[- ]hmm)(?![\p{L}])/giu, "$1 si ")
    .replace(/(^|[^\p{L}])a el(?![\p{L}])/giu, "$1al").replace(/(^|[^\p{L}])de el(?![\p{L}])/giu, "$1del")
    .replace(/(^|[^\p{L}])(eñe|ñ)(?![\p{L}])/giu, "$1enie")
    .replace(/\p{L}+/gu, markPast)),
  currency: { "$": "pesos", "€": "euros" },
  ordinalSuffix: /(\d)(er|ra|ro|do|da|to|ta|vo|va|mo|ma|no|na)\b/g,
  expand(tok) {
    if (INFORMAL[tok]) return [INFORMAL[tok]];
    if (SPAIN[tok]) return [SPAIN[tok]];
    if (MARKED.test(tok)) return [tok];
    return [tok.replace(/'/g, "")];
  },
  softFillers: new Set(["eh", "ehh", "eeh", "em", "emm", "ehm", "mm", "mmm", "mmh", "hmm", "hm", "um", "umm", "uhm", "uh", "uhh", "er", "erm"]),
  stripPlease(toks) {
    let please = false;
    const out: Tokens = [];
    for (let i = 0; i < toks.length; i++) {
      if ((toks[i] === "por" || toks[i] === "x") && toks[i + 1] === "favor") { please = true; i++; continue; }
      if (PLEASE_ONE.has(toks[i])) { please = true; continue; }
      out.push(toks[i]);
    }
    return { toks: out, please };
  },
  pleaseAlone: ["si"],
  noPause: (input) => /^[\s¡¿"'(]*(?:(?:e+h+|e+m+|m+h*|h+m+|u+m+|u+h+|a+h+)\W+)*(no|nop|nel)\s*[,.!;:–—-]/i.test(input),
  invertedQuestion: () => null,
  negation: new Set(["no", "nunca", "jamas", "sin", "nada", "ningun", "ninguno", "ninguna", "ningunos", "ningunas", "ni", "nadie", "tampoco", "nop", "nel"]),
  negationHomophone: () => 0,
  // what a recogniser writes for one word (accents are folded before this: "té" is "te", "sí" is "si")
  homophones: [
    ["a", "ha", "ah"], ["e", "he", "eh"], ["o", "oh", "ho"], ["ay", "hay", "ahi", "ai"], ["echo", "hecho"], ["hola", "ola"],
    ["tuvo", "tubo"], ["vaya", "valla", "baya"], ["hora", "ora"], ["hasta", "asta"], ["halla", "haya", "aya"],
    ["ok", "okay", "oquei"], ["wifi", "wi fi", "guifi"], ["kilo", "quilo"], ["kilos", "quilos"],
  ],
  spellingVariant: (heard, target) => heard.length >= 3 && target.length >= 3 && phon(heard) === phon(target),
  // the learner's unaccented "pague" is the pattern's past "pagué" (the past said with its accent is not the pattern's
  // "pague" or "pago": markPast)
  sameWord: (heard, target) => isPast(target) && heard === target.replace("'", ""),
  // slips that keep the meaning clear: gender and number of articles and demonstratives, tú/usted forms, ser/estar,
  // por/para, the person of the common irregular verbs ("yo quiere", "¿puedes…?" to staff; poder: slipVariant), qué/cuál
  grammarClasses: [
    ["el", "la", "lo"], ["los", "las"], ["un", "una", "uno"], ["unos", "unas"],
    ["este", "esta", "esto"], ["estos", "estas"], ["ese", "esa", "eso"], ["esos", "esas"], ["aquel", "aquella", "aquello"],
    ["mi", "mis"], ["tu", "tus"], ["su", "sus"], ["nuestro", "nuestra", "nuestros", "nuestras"],
    ["usted", "tu"], ["le", "te"], ["por", "para"], ["que", "cual"], ["cuanto", "cuanta", "cuantos", "cuantas"],
    ["bien", "bueno", "buena"], ["mucho", "mucha", "muchos", "muchas", "muy"],
    ["es", "son", "sois", "era", "fue", "sea"], ["soy", "estoy"], ["somos", "estamos"], ["estan", "estais"],
    ["quiero", "quieres", "quiere", "queremos", "quieren", "quereis", "quisiera", "quisieras", "queria", "querria"],
    ["tengo", "tienes", "tiene", "tenemos", "tienen", "teneis", "tenia", "tuve"],
    ["voy", "vas", "va", "vamos", "van", "vais", "iba"], ["hago", "haces", "hace", "hacemos", "hacen", "haceis", "hice", "hizo"],
    ["doy", "das", "da", "damos", "dan", "dais", "dio"], ["digo", "dices", "dice", "decimos", "dicen", "decis", "dije", "dijo"],
    ["traigo", "traes", "trae", "traemos", "traen", "traeis", "traje", "trajo"], ["pongo", "pones", "pone", "ponemos", "ponen", "poneis", "puse", "puso"],
    ["salgo", "sales", "sale", "salimos", "salen", "salis"], ["vengo", "vienes", "viene", "venimos", "vienen", "venis"],
    ["necesito", "necesitas", "necesita", "necesitamos", "necesitan", "necesitais"], ["pago", "pagamos", "pagar"],
  ],
  slipVariant: poderVariant,
  inflectionVariant(a, b) {
    if (Math.min(a.length, b.length) < 3 || personOrMood(a, b)) return false;
    const sb = new Set(stems(b));
    return stems(a).some((x) => x.length >= 3 && sb.has(x));
  },
  inflectionMismatch(a, b) {
    const [as, af] = stemAndSuffix(a);
    const [bs, bf] = stemAndSuffix(b);
    return as === bs && af !== bf;
  },
  // "ola" for "hola", "baso" for "vaso", "serbesa" for "cerveza": the first sound, not the first letter (and a past
  // said with its accent, "pagu'e", is never a slip away from another word)
  sameStart: (heard, target) => isPast(heard) === isPast(target) && firstSound(heard) === firstSound(target),
  // what an English speaker leaves out: articles, little prepositions, the object pronoun before the verb
  droppable: new Map([
    ["el", 0.15], ["la", 0.15], ["los", 0.15], ["las", 0.15], ["un", 0.15], ["una", 0.15], ["unos", 0.2], ["unas", 0.2],
    ["de", 0.3], ["a", 0.3], ["al", 0.3], ["del", 0.3], ["en", 0.35], ["con", 0.35], ["por", 0.35], ["para", 0.35],
    ["me", 0.35], ["te", 0.35], ["le", 0.35], ["lo", 0.4], ["se", 0.35],
    ["es", 0.35], ["esta", 0.35], ["son", 0.35], ["mi", 0.3], ["su", 0.3],
  ]),
  // "¿Por qué no?" never shrinks to "que no" ("Claro que no" is not "Claro, ¿por qué no?")
  keepDroppable: (tok, next) => tok === "por" && next === "que",
  // what an English speaker adds: subject pronouns above all ("yo quiero", "usted tiene"), and Mexican fillers
  skippable: new Map([
    ["yo", 0.1], ["tu", 0.15], ["usted", 0.15], ["ustedes", 0.15], ["nosotros", 0.2],
    ["el", 0.2], ["la", 0.2], ["los", 0.2], ["las", 0.2], ["un", 0.2], ["una", 0.2],
    ["de", 0.3], ["que", 0.3], ["a", 0.3], ["en", 0.3], ["es", 0.3], ["esta", 0.3], ["me", 0.25], ["se", 0.3],
    ["muy", 0.2], ["solo", 0.1], ["nomas", 0.1], ["tambien", 0.2], ["ya", 0.2], ["pues", 0.15], ["bueno", 0.2],
    ["entonces", 0.25], ["ahora", 0.25], ["ahorita", 0.2], ["ok", 0.2], ["este", 0.2], ["quizas", 0.2], ["quiza", 0.2],
    ["mejor", 0.25], ["y", 0.3], ["oye", 0.15], ["oiga", 0.15],
  ]),
  patternWords: (toks) => LANG.stripPlease(toks).toks,
  display: (s) => s,
  confirm: new Set([
    "si", "si si", "claro", "exacto", "correcto", "eso", "eso es", "asi es", "si exacto", "si correcto", "si eso", "si eso es",
    "si claro", "claro que si", "si senor", "si senora", "andale", "orale", "sale", "va", "ok si", "si ok", "obvio", "obvio que si", "obviamente",
    "yes", "yeah", "yep", "yes yes",
  ]),
  /** What a Spanish recogniser writes for the learner's own spoken "yes". */
  confirmSpoken: new Set(["ies", "lles", "jes", "yes"]),
  confirmIgnore: ["oh", "ah", "ok", "okay", "por", "favor", "porfa", "please", "pues", "bueno"],

  articles: new Set(["el", "la", "los", "las", "un", "una", "unos", "unas"]),
  aloneAfterArticle: /^(uno|una|unos|unas|otro|otra|otros|otras|mismo|misma|mismos|mismas|que|de|del|\d+)$/,
  notAThingStart: new Set(["yo", "tu", "usted", "ustedes", "ella", "nosotros", "ellos", "ellas", "me", "te", "se", "le", "les", "lo", "nos",
    "es", "son", "esta", "estan", "era", "fue", "ser", "estar", "tengo", "tiene", "tienes", "hay", "puede", "puedo", "puedes",
    "quiero", "quiere", "no", "que", "de", "a", "para", "por", "con", "en", "si"]),

  leads: [
    ["greet", "hola | buenos dias | buen dia | buenas tardes | buenas noches | buenas | hola buenos dias | hola buen dia | hola buenas tardes | hola buenas noches | hola buenas | hey | hola hola | ey | hola de nuevo | buenas buenas"],
    ["open", "yo | ah | oh | ok | bueno | pues | pues bueno | bueno pues | a ver | este | mira | mire | oye | oiga | entonces | y | ah ok | ah bueno | ah si | ah claro | ah perfecto | perfecto | muy bien | genial | que bien | claro | vale | venga | vale pues | pues vale | venga vale | sale | va | orale | ay | uy | creo que | yo creo que | tal vez | quizas | quiza | la verdad | fijese que | fijate que | es que | o sea | ahora | ahora si | tambien | y tambien | ademas | ah perdon | oh perdon | ah hola | ok entonces | bueno entonces | pues mire | a ver a ver | dejeme ver | dejame ver | dejeme pensar | dejame pensar | este pues | bueno este | wow | ah que bien | de hecho | en realidad | solo | nomas | mmm a ver | claro que | por supuesto que | desde luego que | pues claro que | obvio que | obviamente | porque | pues porque | es que porque | vengo porque | vine porque | vengo nada mas porque | vine nada mas porque"],
    ["sorry", "perdon | disculpe | disculpa | perdone | perdona | lo siento | con permiso | perdon que le moleste | perdon que te moleste | disculpe la molestia | una disculpa | perdon perdon | ay perdon | disculpe usted"],
    // courtesy before a refusal: only what follows "pero" is the answer ("Gracias, pero no puedo")
    ["but", "gracias pero | muchas gracias pero | me encantaria pero | me gustaria pero | suena bien pero | que amable pero | muy amable pero | lo siento pero | perdon pero | buena idea pero | ya se pero | si pero | claro pero"],
    ["help", "una pregunta | tengo una pregunta | una pregunta rapida | me puede ayudar | me puedes ayudar | me podria ayudar | necesito ayuda | necesito su ayuda | tengo un problema | tengo un pequeno problema | tenemos un problema | oiga una pregunta | disculpe una pregunta | le puedo preguntar algo | te puedo preguntar algo"],
  ],
  tails: [
    ["thanks", "gracias | muchas gracias | mil gracias | muchisimas gracias | gracias de nuevo | se lo agradezco | te lo agradezco | muy amable | muy amable gracias | gracias muy amable | ok gracias"],
    // "Con tarjeta está bien", "El mediano está perfecto": an answer plus its own acceptance
    // ("El calentador sí funciona" says the heater works, so a bare "funciona" is no acceptance: p29)
    ["accept", "esta bien | esta perfecto | me parece bien | me parece perfecto | perfecto | seria perfecto | estaria bien | seria genial | me sirve | me funciona | nos funciona | va | sale | esta muy bien | por mi esta bien | para mi esta bien"],
    // "No puedo, perdón", "Yo no puedo esta semana, lo siento": an apology after an answer softens it (s34)
    ["sorry", "perdon | lo siento | lo siento mucho | disculpe | disculpa | perdone | perdona | perdon perdon | una disculpa | mil disculpas"],
    ["soft", "entonces | para mi | tambien | si se puede | si es posible | si puede | si puedes | si no es molestia | por ahora | ahorita | ahora | ok | si | verdad | esta bien | se puede | creo | nomas | y ya | nada mas | eso es todo | es todo | seria todo | pues | bueno | tal vez | quizas | de ser posible | si hay | si tiene | si tienen | porfavor"],
  ],
  vocatives: "senor | senora | senorita | joven | jefe | jefa | amigo | amiga | doctor | doctora | oficial | licenciado | licenciada | seno | maestro | compa | chicos | muchachos | todos | caballero",
  vocativeForms(name) {
    const words = fold(name).replace(/[^a-z\s'-]/g, " ").split(/[\s-]+/).filter(Boolean);
    if (!words.length) return [];
    const rest = TITLES.has(words[0]) && words.length > 1 ? words.slice(1) : words;
    const out = [words.join(" ")];
    if (rest !== words) out.push(rest.join(" "));
    if (rest.length > 1) out.push(rest[rest.length - 1], rest[0]);
    return [...new Set(out)];
  },
  yesLead: "obvio | obvio que si | obviamente | vale | si vale | si | claro | claro que si | por supuesto | sale | va | ok | esta bien | perfecto | de acuerdo | si gracias | exacto | asi es | correcto | eso | andale | orale | si si | si claro | si senor | si senora | con gusto | como no | desde luego | sin problema | no hay problema | si por favor | si exacto | si correcto | si es correcto | si esta bien | ah si | oh si | bueno si",
  noLead: "no | no gracias | no muchas gracias | todavia no | aun no | ahorita no | ahora no | hoy no | la verdad no | lo siento no | perdon no | mejor no | no perdon",
  yes: "vale | si vale | vale gracias | vale perfecto | vale vale | si | claro | claro que si | por supuesto | con gusto | como no | desde luego | me parece bien | me parece perfecto | esta bien | perfecto | de acuerdo | muy bien | sale | va | sale y vale | orale | andale | dale | si claro | si exacto | eso es | exacto | correcto | asi es | si es correcto | si esta bien | si eso es | seria genial | si seria genial | me encantaria | si me encantaria | creo que si | yo creo que si | supongo que si | probablemente | si si | si senor | si senora | si joven | adelante | si adelante | ok | ok gracias | si gracias | si muchas gracias | claro gracias | perfecto gracias | si tengo | si quiero | si puedo | si es | si soy | si estoy | si hay | si lo tengo | si la tengo | si lo quiero | si lo necesito | si me gustaria | me gustaria | si por favor | si porfa | sin problema | no hay problema | si sin problema | ok perfecto | va perfecto | si de acuerdo | si esta perfecto | bueno si | ah si | si eso | no hay ningun problema | sin ningun problema | si traigo | si lo traigo | si la traigo | si asi esta bien | si esta bien asi | si por que no | si porque no | claro por que no | claro porque no | bueno por que no | ok por que no | pues si por que no | como no por que no | obvio | obvio que si | obviamente | obviamente si | si obvio | obvio si | claro obvio | pues obvio | si obviamente | obvio gracias",
  no: "no | no gracias | no muchas gracias | no estoy bien gracias | no gracias estoy bien | estoy bien gracias | no asi esta bien | asi esta bien gracias | es todo | eso es todo | seria todo | nada mas | no nada mas | no es todo | no eso es todo | no seria todo | por ahora no | ahorita no | ahora no | hoy no | todavia no | aun no | no todavia | creo que no | no creo | no lo creo | para nada | no para nada | claro que no | por supuesto que no | no no | no tengo | no quiero | no puedo | no es | no soy | no estoy | no hay | no lo tengo | no la tengo | no lo quiero | no lo necesito | no hace falta | no es necesario | no se preocupe | no te preocupes | no perdon | lo siento no | no lo siento | la verdad no | no la verdad | no tanto | no mucho | no exactamente | no es correcto | no eso no | mejor no | no mejor no | no gracias asi estoy bien | no por ahora | no por hoy | paso | nel | nop | no traigo | no lo traigo | no la traigo | desde luego que no | asi esta bien | esta bien asi | no esta bien asi | asi estoy bien | estoy bien asi | (dejelo | dejalo | dejemoslo) (asi | como esta) | no (dejelo | dejalo) asi | asi (dejelo | lo dejamos | dejemoslo) | obvio que no | obviamente no",
  ynConnectors: "pero | y | entonces | tambien | y tambien | asi que",
  // and the words that turn to a new matter ("Bien, gracias. Oiga, ¿me presta…?": s82)
  connectors: "y | y tambien | tambien | pero | ah y | y luego | luego | entonces | o | y ademas | ademas | ah y tambien | y otra cosa | oiga | oye | mire | mira | por cierto | otra cosa | una pregunta | oiga una pregunta | y oiga | ah oiga",
  numberWords: NUMBER_WORDS,
  // and the "if" of a what-if and a past tense said with its accent: an approximate reading never drops them ("¿Y si lo
  // pago por adelantado?" is no "lo pago por adelantado")
  keyWords: new KeyWords(["que", "donde", "adonde", "cuando", "como", "cuanto", "cuanta", "cuantos", "cuantas", "cual", "cuales", "quien", "quienes", "porque",
    "es", "son", "esta", "estan", "era", "fue", "hay", "puede", "puedo", "puedes", "pueden", "podria", "podemos", "tiene", "tienes", "tienen",
    "quiere", "quieres", "va", "vas", "voy", "debo", "debe", "sabe", "sabes", "s'i"]),
  possessives: new Set(["mi", "mis", "tu", "tus", "su", "sus", "nuestro", "nuestra", "nuestros", "nuestras"]),
  // not "no": it is also the answer "No," (see correctionStarters)
  clauseNegators: new Set(["nunca", "jamas", "tampoco"]),
  // "no un capuchino | un latte" is not a refusal plus an order (the correction intent reads it)
  pieceNegators: new Set(["no", "nunca", "jamas", "tampoco", "ni"]),
  settledNegative,
  auxiliaries: new Set(["es", "son", "esta", "estan", "era", "fue", "va", "van", "tiene", "tienen", "hay", "puede", "pueden", "sera", "seria", "estaba"]),
  predicateAux: new Set(["es", "esta", "son", "estan", "era", "estaba", "fue", "va", "seria", "sera", "queda", "cuesta", "sale"]),
  ownClause,
  questionOwns,
  subjectPronouns: new Set(["yo", "tu", "usted", "el", "ella", "nosotros", "ustedes", "ellos", "ellas", "eso", "esto", "este", "esta", "ese", "esa", "aqui", "ahi"]),
  newPart: new Set(["yo", "nosotros", "usted", "tu", "ella", "ellos", "eso", "esto", "aqui", "ahi", "si", "no",
    "solo", "nomas", "pero", "sino", "mejor", "quizas", "quiza", "casi", "como", "cuando", "que", "donde", "cual", "quien",
    "cuanto", "cuanta", "cuantos", "cuantas", "porque", "pues", "entonces", "y", "o", "ahora", "ahorita", "hoy", "manana", "ayer",
    "ya", "todavia", "aun", "gracias", "adios", "hola", "perdon", "disculpe", "bueno", "ok", "claro", "puede", "puedo", "podria",
    "para", "con", "sin", "en", "por", "nada", "deme", "dame", "traigame", "traeme", "cobreme", "cobrame", "pongame", "ponme",
    "lleveme", "llevame", "digame", "dime", "espere", "espera", "mire", "mira", "oiga", "oye", "vamos", ...PART_VERBS]),
  // "no muy bien, un poco cansado"; "No la tiro, | me la tomo" (a clitic and its verb begin a clause)
  newPartPair: (t, next) => (t === "un" && (next === "poco" || next === "poquito")) || (CLITICS.has(t) && cliticVerb(t, next, undefined, true)),
  determiners: new Set(["el", "la", "los", "las", "un", "una", "unos", "unas", "mi", "mis", "tu", "tus", "su", "sus", "nuestro", "nuestra", "este", "esta", "ese", "esa"]),
  verbOrAside: new Set([...PART_VERBS, "me", "te", "le", "les", "lo", "la", "los", "las", "se", "nos", "mas", "menos", "ahora", "hoy", "manana", "ya", "todavia", "aun"]),
  noWord: "no",
  // after a bare "no" (no comma), only these make it "No," + a correction; a verb or a noun keeps it a negation:
  // "no quiero leche" (I don't want milk), "no leche" (no milk)
  correctionStarters: new Set(["para", "con", "sin", "en", "a", "al", "de", "del", "por", "solo", "nomas", "mejor", "pero", "sino", "que", "mas", "menos",
    "el", "la", "los", "las", "un", "una", "unos", "unas", "este", "esta", "ese", "esa", "eso", "esto", "mi", "tu", "su", "yo", "usted", "nosotros",
    "gracias", "perdon", "disculpe", "si", "no", "ya", "ahorita", "ahora", "hoy", "manana", "todo", "nada", "otro", "otra", "tambien", "tampoco",
    "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "medio", "media", "aqui", "alla", "ahi"]),
  // "No la tiro", "No me la tomo", "Efectivo no quiero…": a verb right after "no" (or clitics and a verb) is what the
  // "no" negates, so no piece starts there; but "No, la roja", "No, la cuenta" (la + a noun or adjective) are corrections
  noNegates: (toks, i) => (CLITICS.has(toks[i]) ? cliticVerb(toks[i], toks[i + 1], toks[i + 2]) : NEGATED_VERB.has(toks[i])),
  wantAsWouldLike: () => null,
  leavingContinues: new Set(["a", "al", "para"]),

  /** Folded Spanish spelling as consonants, with what an English speaker's accent or a recogniser blurs made
   *  equal: "horchata", "orchata", "or chata" → "rCt"; "capuchino", "capa chino" → "kpCn". */
  soundKey(word) {
    let s = fold(word).replace(/[^a-z]/g, "");
    if (!s) return "";
    s = phon(s).replace(/j/g, "x").replace(/y(?=[aeiou])/g, "Y")
      .replace(/d/g, "t").replace(/b/g, "p").replace(/g/g, "k")
      .replace(/[aeiouy]/g, "")
      .replace(/(.)\1+/g, "$1");
    return s;
  },
  soundEdge: new Set(["un", "una", "el", "la", "los", "las", "de", "del", "al", "a", "y", "o", "yo", "me", "te", "se", "lo", "le", "es", "por", "favor",
    "para", "con", "en", "quiero", "quisiera", "puedo", "puede", "da", "deme", "dame", "tiene", "hay", "si", "ok", "gracias", "solo", "nomas", "eh", "este", "porfa",
    "porque", "pero", "aunque", "cuando", "donde", "como", "pues", "entonces"]),
  soundVowelish: new Set(["a", "e", "o", "de"]),
  soundTail: new Set(["por", "favor", "porfa", "gracias"]),

  hasNegation: (text) => fold(text).split(/[^a-z]+/).some((w) => LANG.negation.has(w)),
  checkYes: /^(s[ií]|sip|claro|exacto|correcto|eso|as[ií] es)[,!]?\s+(eso es|as[ií] es|exacto|correcto|por favor|gracias|muchas gracias|eso|s[ií])$/,
  checkNo: /^(no|nop|nel)[,.!]?\s+(.+)$/i,
  light: new Set(["el", "la", "los", "las", "un", "una", "unos", "unas", "yo", "tu", "usted", "ella", "nosotros", "me", "te", "se", "le", "lo", "nos",
    "mi", "su", "de", "del", "a", "al", "en", "con", "por", "para", "y", "o", "pero", "si", "que", "es", "son", "esta", "estan", "ser", "estar",
    "hay", "muy", "mas", "ya", "pues", "bueno", "ok", "este", "eso", "esto", "aqui", "ahi", "favor", "tambien", "solo", "nomas"]),
  wh: new Set(["que", "donde", "adonde", "cuando", "como", "cuanto", "cuanta", "cuantos", "cuantas", "cual", "cuales", "quien", "quienes"]),
  digitWords: ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce",
    "trece", "catorce", "quince", "dieciseis", "diecisiete", "dieciocho", "diecinueve", "veinte"],
  markIgnore: new Set(["por", "favor", "porfa", "porfavor", "please"]),
};
