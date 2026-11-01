// Spanish (Mexican, with the neutral Latin American forms understood too) for the shared engine: replaces
// src/convo/lang.ts in the Spanish edition (docs/es/EDITIONS.md). Everything here is written accent-free and in
// lowercase, because the engine compares folded words ("café" = "cafe", "sí" = "si").
//
// The two things Spanish does differently from English here:
// - "no" is both the answer and the verb's negation. "No quiero leche" is "I don't want milk", never "No." + "I want
//   milk": after a bare leading "no" (no comma) an answer must start with a correction word (`correctionStarters`:
//   "No, el grande", "No, para llevar"); a verb right after it stays negated.
// - Learners add subject pronouns ("yo quiero", "usted tiene"), mix tú and usted forms and slip on gender and
//   person ("la café", "yo quiere"): all understood (`skippable`, `grammarClasses`, `inflectionVariant`).
import type { LangPack } from "../../../convo/lang";

type Tokens = string[];

const INFORMAL: Record<string, string> = {
  pa: "para", pal: "para el", q: "que", xq: "porque", pq: "porque", porq: "porque", xk: "porque",
  tb: "tambien", tmb: "tambien", tbn: "tambien", toy: "estoy", tamos: "estamos", ta: "esta", tas: "estas", tan: "estan",
  pos: "pues", pus: "pues", ps: "pues", tons: "entonces", entons: "entonces", sip: "si", sep: "si", nop: "no", nel: "no",
  okey: "ok", oki: "ok", okis: "ok", okay: "ok", vale: "vale", aki: "aqui", ntp: "no te preocupes", grax: "gracias", graxias: "gracias",
};

const PLEASE_ONE = new Set(["porfa", "porfavor", "porfis", "xfa", "plis", "please"]);

/** Spanish endings, longest first: a stem shared by two forms is the same word ("pago", "pagar", "pagué"). */
const ENDINGS = ["aciones", "acion", "iendo", "ando", "aron", "ieron", "abamos", "iamos", "arian", "erian", "irian",
  "aria", "eria", "iria", "aras", "eras", "iras", "aste", "iste", "amos", "emos", "imos", "aban", "aba", "abas", "ian", "ias", "ia",
  "ados", "adas", "idos", "idas", "ado", "ada", "ido", "ida", "ara", "iera", "are", "ere", "ire",
  "ar", "er", "ir", "as", "es", "an", "en", "os", "o", "a", "e", "s"] as const;
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

export const LANG: LangPack = {
  // "ajá", "mhm" = yes; "a el" / "de el" are always "al" / "del"
  preSurface: (s) => s
    .replace(/(^|[^\p{L}])(aj[aá]m?|mjm|mhm|uh[- ]huh|mm[- ]hmm)(?![\p{L}])/giu, "$1 si ")
    .replace(/(^|[^\p{L}])a el(?![\p{L}])/giu, "$1al").replace(/(^|[^\p{L}])de el(?![\p{L}])/giu, "$1del"),
  currency: { "$": "pesos", "€": "euros" },
  ordinalSuffix: /(\d)(er|ra|ro|do|da|to|ta|vo|va|mo|ma|no|na)\b/g,
  expand(tok) {
    if (INFORMAL[tok]) return [INFORMAL[tok]];
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
  // slips that keep the meaning clear: gender and number of articles and demonstratives, tú/usted forms, ser/estar,
  // por/para, the person of the common irregular verbs ("yo quiere", "¿puedes…?" to staff), qué/cuál
  grammarClasses: [
    ["el", "la", "lo"], ["los", "las"], ["un", "una", "uno"], ["unos", "unas"],
    ["este", "esta", "esto"], ["estos", "estas"], ["ese", "esa", "eso"], ["esos", "esas"], ["aquel", "aquella", "aquello"],
    ["mi", "mis"], ["tu", "tus"], ["su", "sus"], ["nuestro", "nuestra", "nuestros", "nuestras"],
    ["usted", "tu"], ["le", "te"], ["por", "para"], ["que", "cual"], ["cuanto", "cuanta", "cuantos", "cuantas"],
    ["bien", "bueno", "buena"], ["mucho", "mucha", "muchos", "muchas", "muy"],
    ["es", "son", "era", "fue", "sea"], ["soy", "estoy"], ["somos", "estamos"],
    ["quiero", "quieres", "quiere", "queremos", "quieren", "quisiera", "quisieras", "queria", "querria"],
    ["puedo", "puedes", "puede", "podemos", "pueden", "podria", "podrias", "pudiera", "pude", "pudo"],
    ["tengo", "tienes", "tiene", "tenemos", "tienen", "tenia", "tuve"],
    ["voy", "vas", "va", "vamos", "van", "iba"], ["hago", "haces", "hace", "hacemos", "hacen", "hice", "hizo"],
    ["doy", "das", "da", "damos", "dan", "dio"], ["digo", "dices", "dice", "decimos", "dicen", "dije", "dijo"],
    ["traigo", "traes", "trae", "traemos", "traen", "traje", "trajo"], ["pongo", "pones", "pone", "ponemos", "ponen", "puse", "puso"],
    ["salgo", "sales", "sale", "salimos", "salen"], ["vengo", "vienes", "viene", "venimos", "vienen"],
    ["necesito", "necesitas", "necesita", "necesitamos", "necesitan"], ["pago", "pagas", "paga", "pagamos", "pagan", "pague", "pagar"],
  ],
  inflectionVariant(a, b) {
    if (Math.min(a.length, b.length) < 3) return false;
    const sb = new Set(stems(b));
    return stems(a).some((x) => x.length >= 3 && sb.has(x));
  },
  inflectionMismatch(a, b) {
    const [as, af] = stemAndSuffix(a);
    const [bs, bf] = stemAndSuffix(b);
    return as === bs && af !== bf;
  },
  // "ola" for "hola", "baso" for "vaso", "serbesa" for "cerveza": the first sound, not the first letter
  sameStart: (heard, target) => firstSound(heard) === firstSound(target),
  // what an English speaker leaves out: articles, little prepositions, the object pronoun before the verb
  droppable: new Map([
    ["el", 0.15], ["la", 0.15], ["los", 0.15], ["las", 0.15], ["un", 0.15], ["una", 0.15], ["unos", 0.2], ["unas", 0.2],
    ["de", 0.3], ["a", 0.3], ["al", 0.3], ["del", 0.3], ["en", 0.35], ["con", 0.35], ["por", 0.35], ["para", 0.35],
    ["que", 0.3], ["me", 0.35], ["te", 0.35], ["le", 0.35], ["lo", 0.4], ["se", 0.35],
    ["es", 0.35], ["esta", 0.35], ["son", 0.35], ["mi", 0.3], ["su", 0.3],
  ]),
  keepDroppable: () => false,
  // what an English speaker adds: subject pronouns above all ("yo quiero", "usted tiene"), and Mexican fillers
  skippable: new Map([
    ["yo", 0.1], ["tu", 0.15], ["usted", 0.15], ["nosotros", 0.2],
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
    "si claro", "claro que si", "si senor", "si senora", "andale", "orale", "sale", "va", "ok si", "si ok",
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
    ["open", "ah | oh | ok | bueno | pues | pues bueno | bueno pues | a ver | este | mira | mire | oye | oiga | entonces | y | ah ok | ah bueno | ah si | ah claro | ah perfecto | perfecto | muy bien | genial | que bien | claro | vale | sale | va | orale | ay | uy | creo que | yo creo que | tal vez | quizas | quiza | la verdad | fijese que | fijate que | es que | o sea | ahora | ahora si | tambien | y tambien | ademas | ah perdon | oh perdon | ah hola | ok entonces | bueno entonces | pues mire | a ver a ver | dejeme ver | dejame ver | dejeme pensar | dejame pensar | este pues | bueno este | wow | ah que bien | de hecho | en realidad | solo | nomas | mmm a ver"],
    ["sorry", "perdon | disculpe | disculpa | perdone | perdona | lo siento | con permiso | perdon que le moleste | perdon que te moleste | disculpe la molestia | una disculpa | perdon perdon | ay perdon | disculpe usted"],
    // courtesy before a refusal: only what follows "pero" is the answer ("Gracias, pero no puedo")
    ["but", "gracias pero | muchas gracias pero | me encantaria pero | me gustaria pero | suena bien pero | que amable pero | muy amable pero | lo siento pero | perdon pero | buena idea pero | ya se pero | si pero | claro pero"],
    ["help", "una pregunta | tengo una pregunta | una pregunta rapida | me puede ayudar | me puedes ayudar | me podria ayudar | necesito ayuda | necesito su ayuda | tengo un problema | tengo un pequeno problema | tenemos un problema | oiga una pregunta | disculpe una pregunta | le puedo preguntar algo | te puedo preguntar algo"],
  ],
  tails: [
    ["thanks", "gracias | muchas gracias | mil gracias | muchisimas gracias | gracias de nuevo | se lo agradezco | te lo agradezco | muy amable | muy amable gracias | gracias muy amable | ok gracias"],
    // "Con tarjeta está bien", "El mediano está perfecto": an answer plus its own acceptance
    ["accept", "esta bien | esta perfecto | me parece bien | me parece perfecto | perfecto | seria perfecto | estaria bien | seria genial | me sirve | me funciona | funciona | va | sale | esta muy bien | por mi esta bien | para mi esta bien"],
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
  yesLead: "si | claro | claro que si | por supuesto | sale | va | ok | esta bien | perfecto | de acuerdo | si gracias | exacto | asi es | correcto | eso | andale | orale | si si | si claro | si senor | si senora | con gusto | como no | desde luego | sin problema | no hay problema | si por favor | si exacto | si correcto | si es correcto | si esta bien | ah si | oh si | bueno si",
  noLead: "no | no gracias | no muchas gracias | todavia no | aun no | ahorita no | ahora no | hoy no | la verdad no | lo siento no | perdon no | mejor no | no perdon | no no",
  yes: "si | claro | claro que si | por supuesto | con gusto | como no | desde luego | me parece bien | me parece perfecto | esta bien | perfecto | de acuerdo | muy bien | sale | va | sale y vale | orale | andale | dale | si claro | si exacto | eso es | exacto | correcto | asi es | si es correcto | si esta bien | si eso es | seria genial | si seria genial | me encantaria | si me encantaria | creo que si | yo creo que si | supongo que si | probablemente | si si | si senor | si senora | si joven | adelante | si adelante | ok | ok gracias | si gracias | si muchas gracias | claro gracias | perfecto gracias | si tengo | si quiero | si puedo | si es | si soy | si estoy | si hay | si lo tengo | si la tengo | si lo quiero | si lo necesito | si me gustaria | me gustaria | si por favor | si porfa | sin problema | no hay problema | si sin problema | ok perfecto | va perfecto | si de acuerdo | si esta perfecto | bueno si | ah si | si eso | asi esta bien",
  no: "no | no gracias | no muchas gracias | no estoy bien gracias | no gracias estoy bien | estoy bien gracias | no asi esta bien | asi esta bien gracias | es todo | eso es todo | seria todo | nada mas | no nada mas | no es todo | no eso es todo | no seria todo | por ahora no | ahorita no | ahora no | hoy no | todavia no | aun no | no todavia | creo que no | no creo | no lo creo | para nada | no para nada | claro que no | por supuesto que no | no no | no tengo | no quiero | no puedo | no es | no soy | no estoy | no hay | no lo tengo | no la tengo | no lo quiero | no lo necesito | no hace falta | no es necesario | no se preocupe | no te preocupes | no perdon | lo siento no | no lo siento | la verdad no | no la verdad | no tanto | no mucho | no exactamente | no es correcto | no eso no | mejor no | no mejor no | no gracias asi estoy bien | no por ahora | no por hoy | paso | nel | nop",
  ynConnectors: "pero | y | entonces | tambien | y tambien | asi que",
  connectors: "y | y tambien | tambien | pero | ah y | y luego | luego | entonces | o | y ademas | ademas | ah y tambien | y otra cosa",
  numberWords: NUMBER_WORDS,
  keyWords: new Set(["que", "donde", "adonde", "cuando", "como", "cuanto", "cuanta", "cuantos", "cuantas", "cual", "cuales", "quien", "quienes", "porque",
    "es", "son", "esta", "estan", "era", "fue", "hay", "puede", "puedo", "puedes", "pueden", "podria", "podemos", "tiene", "tienes", "tienen",
    "quiere", "quieres", "va", "vas", "voy", "debo", "debe", "sabe", "sabes"]),
  possessives: new Set(["mi", "mis", "tu", "tus", "su", "sus", "nuestro", "nuestra", "nuestros", "nuestras"]),
  // not "no": it is also the answer "No," (see correctionStarters)
  clauseNegators: new Set(["nunca", "jamas", "tampoco"]),
  auxiliaries: new Set(["es", "son", "esta", "estan", "era", "fue", "va", "van", "tiene", "tienen", "hay", "puede", "pueden", "sera", "seria", "estaba"]),
  predicateAux: new Set(["es", "esta", "son", "estan", "era", "estaba", "fue", "va", "seria", "sera", "queda", "cuesta", "sale"]),
  subjectPronouns: new Set(["yo", "tu", "usted", "el", "ella", "nosotros", "ustedes", "ellos", "ellas", "eso", "esto", "este", "esta", "ese", "esa", "aqui", "ahi"]),
  newPart: new Set(["yo", "nosotros", "usted", "tu", "ella", "ellos", "eso", "esto", "aqui", "ahi", "si", "no",
    "solo", "nomas", "pero", "sino", "mejor", "quizas", "quiza", "casi", "como", "cuando", "que", "donde", "cual", "quien",
    "cuanto", "cuanta", "cuantos", "cuantas", "porque", "pues", "entonces", "y", "o", "ahora", "ahorita", "hoy", "manana", "ayer",
    "ya", "todavia", "aun", "gracias", "adios", "hola", "perdon", "disculpe", "bueno", "ok", "claro", "puede", "puedo", "podria",
    "para", "con", "sin", "en", "por", "nada", "deme", "dame", "traigame", "traeme", "cobreme", "cobrame", "pongame", "ponme",
    "lleveme", "llevame", "digame", "dime", "espere", "espera", "mire", "mira", "oiga", "oye", "vamos", "tengo", "tiene", "hay"]),
  newPartPair: (t, next) => t === "un" && (next === "poco" || next === "poquito"),
  determiners: new Set(["el", "la", "los", "las", "un", "una", "unos", "unas", "mi", "mis", "tu", "tus", "su", "sus", "nuestro", "nuestra", "este", "esta", "ese", "esa"]),
  verbOrAside: new Set(["quiero", "tengo", "puedo", "me", "te", "le", "lo", "la", "se", "nos", "mas", "menos", "ahora", "hoy", "manana", "ya", "todavia", "aun"]),
  noWord: "no",
  // after a bare "no" (no comma), only these make it "No," + a correction; a verb or a noun keeps it a negation:
  // "no quiero leche" (I don't want milk), "no leche" (no milk)
  correctionStarters: new Set(["para", "con", "sin", "en", "a", "al", "de", "del", "por", "solo", "nomas", "mejor", "pero", "sino", "que", "mas", "menos",
    "el", "la", "los", "las", "un", "una", "unos", "unas", "este", "esta", "ese", "esa", "eso", "esto", "mi", "tu", "su", "yo", "usted", "nosotros",
    "gracias", "perdon", "disculpe", "si", "no", "ya", "ahorita", "ahora", "hoy", "manana", "todo", "nada", "otro", "otra", "tambien", "tampoco",
    "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "medio", "media", "aqui", "alla", "ahi"]),
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
    "para", "con", "en", "quiero", "quisiera", "puedo", "puede", "da", "deme", "dame", "tiene", "hay", "si", "ok", "gracias", "solo", "nomas", "eh", "este", "porfa"]),
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
