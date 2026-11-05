// Offers the learner can't take up, in Puerto Colibrí's Spanish (the Spanish edition's tools/offer-probe.ts):
// whenever someone offers options ("Tenemos americano, latte, capuchino y café de olla.", "Hay de horchata y de
// jamaica.", "¿La quiere de débito o de ahorro?", "¿Chico, mediano o grande?", "¿Para aquí o para llevar?"), each
// option is answered in short natural forms ("Latte.", "Latte, por favor.", "Quiero latte.", "De débito, por favor.",
// "La de débito.", "Latte está bien."). An option passes when one form is understood, gets no "perdón / no tenemos /
// no hay / no le entendí / ¿mande?", isn't only heard by its sound ("Perdón, ¿latte?"), and the question isn't simply
// asked again. The moments come from the scripted sims (6 seeds) and from random conversations (inputs from tests,
// sims and their auto answers, as check-content's fuzz), so lines the sims never reach are probed too. Some flags are
// expected (an option a twist takes away, a list of facts that isn't a choice); read them.
// Questions whose two halves are clauses ("¿Ya decidió, o necesita unos minutos más?", "¿… o no?") aren't offers and
// are left out; so are prices offered as options. Offers of things to do are read too: a list of verbs ("¿Se la toma, la
// vacía o me la deja?", "Puede tomársela, vaciarla o dejármela.", "¿Quiere vaciarla o tirarla?"), answered as the
// learner says them ("Me la tomo.", "Quiero vaciarla.", "Dejársela.": the person's "se" is the learner's "me").
//   EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/es-offer-probe.ts [situation prefixes…] [--runs=40]
//     [--neutral]       the neutral Latin American text (the lines' neutral twins) instead of the Mexican one
//     [--json=<file>]   every offer found, with the options that passed and those that didn't
import { writeFileSync } from "node:fs";
import { SITUATIONS } from "../src/content/situations";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import { Conversation } from "../src/convo/dialogue";
import { setVariety } from "../src/convo/compose";
import { playSim } from "./sim-play";
import { EDITION } from "../src/edition";
import { isFiniteVerb } from "../src/editions/es/convo/verbs";

if (EDITION.id !== "es") throw new Error("the Spanish offer probe needs the Spanish edition: EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/es-offer-probe.ts");

const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const RUNS = Number(process.argv.find((a) => a.startsWith("--runs="))?.slice(7) ?? 40);
const JSON_OUT = process.argv.find((a) => a.startsWith("--json="))?.slice(7);
if (process.argv.includes("--neutral")) setVariety("neutral");
/** An option that failed is tried again at this many other moments at most (another seed may take it). */
const MAX_TRIES = 3;

/** Lowercase, no accents, no ¿¡: how two Spanish texts are compared. */
const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[¿¡]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

// Words that open a sentence without being part of the offer ("Y también tenemos…", "Entonces, ¿chico o grande?"); a
// word that can be part of it ("¿Va a pagar…?", "¿Hoy o mañana?") only with a comma after it. A statement may start
// with a time or a place ("Hoy tenemos…").
const LEAD = /^(?:(?:y|e|entonces|pues|también|además)\s+|(?:bueno|ok|oiga|oye|mire|mira|perfecto|muy bien|claro|ah|a ver|bien|ándale|sale|va|entonces|pues|hoy|ahorita|ahora|aquí|acá)\s*,\s*)+/i;
const LEAD_STATEMENT = /^(?:(?:y|e|entonces|pues|también|además|hoy|ahorita|ahora|aquí|acá)\s+|(?:bueno|ok|oiga|oye|mire|mira|perfecto|muy bien|claro|ah|a ver|bien|ándale|sale|va|entonces|pues)\s*,\s*)+/i;
// "Tenemos …", "Hay …", "Le puedo ofrecer …", "Puede elegir entre …"
const DECL = /^(?:tenemos|hay|tengo|manejamos|contamos con|servimos|vendemos|ofrecemos|preparamos|nos quedan?|me quedan?|(?:le|te|les) (?:puedo |podemos )?ofre(?:cer|zco|cemos)|(?:puede|puedes|pueden) (?:elegir|escoger)(?: entre)?)\s+(.+?)[.!]*$/i;
// "¿Lo quiere de fresa o de chocolate?", "¿Prefiere ventana o pasillo?", "¿Le traigo un postre o un cafecito?",
// "¿Gusta un vaso de agua o un café?" (Mexico's polite "would you like")
const ASK = /^(?:(?:lo|la|los|las|le|les|te|me|se|nos)\s+)*(?:quiere|quieres|quieren|querría|querrías|gusta|gustan|ofrezco|ofrecemos|prefiere|prefieres|prefieren|preferiría|preferirías|desea|deseas|desean|(?:le |te |les )?gustaría|va a querer|vas a querer|van a querer|busca|buscas|buscan|buscaba|buscabas|necesita|necesitas|toma|tomas|va a tomar|vas a tomar|paga|pagas|va a pagar|vas a pagar|van a pagar|es|son|sería|será|va a ser|parece bien|queda|quedan|pongo|ponemos|sirvo|doy|damos|traigo|preparo|envuelvo|cobro|anoto|apunto|reservo|mando|envío|elige|eliges|escoge|escoges|hay|viene|vienes|vienen|viaja|viajas|trae|traes|lleva|llevas|traía|traías|tenía|tenías|va a necesitar|vas a necesitar)\s+(.+)$/i;
// A half that is a clause, not an option: the question isn't an offer ("¿…, o tiene alguna molestia?").
const CLAUSE = /^(?:ya|no|si|sí|tiene|tienes|tienen|hay|necesita|necesitas|va|vas|van|quiere|quieres|es|está|esta|estás|son|puede|puedes|lo|le|les|te|me|se|nos|qué|que|cuál|cual|cuánto|cuanto|cuántos|cuantos|cuántas|cómo|como|dónde|donde|cuándo|cuando|quién|quien|trae|traes|lleva|llevas|empezamos|nomás|nomas)(?=\s|$)/i;
// A verb inside a "Hay…" item: a statement ("Hay comida corrida, y la cochinita es buenísima."), not a list.
const VERBISH = /(?:^|\s)(?:es|está|están|son|no|hay|tiene|tienen|era|fue|queda|llega)(?=\s|$)/i;
const WHICH = /^(?:cuál|cual|qué|que)(?:\s+(?:prefiere|prefieres|quiere|quieres|desea|deseas|necesita|necesitas|va a querer|vas a querer|le pongo|te pongo|le doy|te doy|le sirvo|te sirvo))?$/i;
// compared with its accents: "té" (tea) is an option, "te" isn't
const NOT_AN_OPTION = /^(?:sí|si|no|qué|que|cómo|como|algo así|algo asi|usted|ustedes|tú|tu|ti|él|ella|eso|esto|algo|nada|todo|aquí|aqui|allí|ahí|lo|la|le|me|te|se)$/;
const ART = /^(?:el|la|los|las|un|una|unos|unas|algún|algun|alguna|su|sus|tu|tus)\s+/i;

interface Opt { raw: string; core: string; de: boolean; /** a thing to do: the learner's own words for it */ says?: string[] }

// ---------------------------------------------------------------------------------------------------------------------
// Offers of things to do: a list of verbs, in the person's words, answered in the learner's.

const CLITICS = ["les", "los", "las", "nos", "me", "te", "se", "le", "lo", "la"];
/** "sela" → ["se", "la"]; null if it isn't a run of clitics. */
function clitics(s: string): string[] | null {
  const out: string[] = [];
  for (let rest = s; rest; ) {
    const c = CLITICS.find((x) => rest.startsWith(x));
    if (!c) return null;
    out.push(c); rest = rest.slice(c.length);
  }
  return out;
}
/** The person's clitics as the learner says them: "se" / "te" (you yourself) → "me" (myself); "me" (to me) → "se" or
 *  "le" (to you); "nos" (to us) → "les". */
const swapClitics = (cs: string[]) => cs.map((c, i) => (c === "se" || c === "te" ? "me" : c === "me" ? (/^l[oa]s?$/.test(cs[i + 1] ?? "") ? "se" : "le") : c === "nos" ? "les" : c));
const unaccent = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").normalize("NFC");
/** "tomársela" → { inf: "tomar", cl: ["se", "la"] }. */
function infinitive(w: string): { inf: string; cl: string[] } | null {
  const m = /^([a-zñáéíóú]+?[aeiáéí]r)((?:les|los|las|nos|me|te|se|le|lo|la)*)$/.exec(w.toLowerCase());
  if (!m) return null;
  const cl = m[2] ? clitics(m[2]) : [];
  if (!cl || m[1].length < 3) return null;
  return { inf: unaccent(m[1]), cl };
}
/** "tomar" + ["me", "la"] → "tomármela" (two clitics put the stress mark on the infinitive). */
const withClitics = (inf: string, cl: string[]) => (cl.length >= 2 ? inf.replace(/([aei])r$/, (_m, v: string) => "áéí"["aei".indexOf(v)] + "r") : inf) + cl.join("");
const FIRST_IRREGULAR: Record<string, string> = { poner: "pongo", traer: "traigo", hacer: "hago", tener: "tengo", venir: "vengo", salir: "salgo",
  decir: "digo", dar: "doy", ir: "voy", ser: "soy", estar: "estoy", saber: "sé", ver: "veo", vaciar: "vacío", enviar: "envío" };
/** The learner's "I" of an infinitive ("tomar" → "tomo"), regular verbs only. */
const iForm = (inf: string) => FIRST_IRREGULAR[inf] ?? (/(ar|er|ir)$/.test(inf) ? inf.slice(0, -2) + "o" : null);
const FIRST_FINITE: Record<string, string> = { pone: "pongo", pones: "pongo", trae: "traigo", traes: "traigo", hace: "hago", haces: "hago",
  tiene: "tengo", tienes: "tengo", viene: "vengo", vienes: "vengo", sale: "salgo", sales: "salgo", dice: "digo", dices: "digo", va: "voy",
  vas: "voy", da: "doy", das: "doy" };
/** The learner's "I" of the person's "you" ("toma" / "tomas" → "tomo", "vacía" → "vacío"); null for anything else (the
 *  person's own "I", "tiro", is no choice of the learner's). */
function iFromYou(v: string): string | null {
  if (FIRST_FINITE[v]) return FIRST_FINITE[v];
  if (/^[a-zñáéíóú]{2,}[ae]s$/.test(v)) return v.slice(0, -2) + "o";
  if (/^[a-zñáéíóú]{2,}[ae]$/.test(v)) return v.slice(0, -1) + "o";
  return null;
}
/** A verb the town's conversations use: its future is one of verbs.ts's forms ("tomaré", "vaciaré"), or it is one of the
 *  irregular ones above ("mar", "lugar" are no verbs). */
const isInfinitive = (inf: string) => FIRST_IRREGULAR[inf] !== undefined || isFiniteVerb(unaccent(inf) + "e") || isFiniteVerb(unaccent(inf) + "a");
/** One thing to do, in the learner's words: "tomársela" → "Tomármela.", "Quiero tomármela.", "Me la tomo."; "la vacía" →
 *  "La vacío.", "Mejor la vacío."; anything after the verb stays ("tomársela aquí" → "Tomármela aquí."). `bare`: an
 *  infinitive without clitics counts too (after "Puede…", "¿Quiere…?"). */
function verbOption(chunk: string, bare: boolean): Opt | null {
  const raw = chunk.trim().replace(/^(?:y|e|o|u)\s+/i, "").replace(/[.!?,;:]+$/, "").trim();
  const ws = raw.split(/\s+/);
  if (!ws.length || ws.length > 5) return null;
  const inf = infinitive(ws[0]);
  const rest = ws.slice(1).join(" ");
  const tail = rest ? " " + rest : "";
  if (inf && isInfinitive(inf.inf) && (bare || inf.cl.length)) {
    const cl = swapClitics(inf.cl), said = withClitics(inf.inf, cl), i = iForm(inf.inf);
    const says = [`${cap(said)}${tail}.`, `Quiero ${said}${tail}.`, `Prefiero ${said}${tail}.`];
    if (i) says.push(`${cap([...cl, i].join(" "))}${tail}.`);
    return { raw, core: raw, de: false, says };
  }
  // clitics and the person's "you" ("se la toma", "la vacía", "me la deja")
  let k = 0;
  while (k < ws.length && CLITICS.includes(ws[k].toLowerCase())) k++;
  if (k >= ws.length) return null;
  const v = ws[k].toLowerCase(), i = iFromYou(v);
  if (!k || !i || !isFiniteVerb(unaccent(v))) return null;
  const cl = swapClitics(ws.slice(0, k).map((w) => w.toLowerCase()));
  const after = ws.slice(k + 1).join(" "), aft = after ? " " + after : "";
  const said = [...cl, i].join(" ");
  return { raw, core: raw, de: false, says: [`${cap(said)}${aft}.`, `Mejor ${said}${aft}.`] };
}
/** A list of things to do ("tomársela, vaciarla o dejármela"; "se la toma, la vacía o me la deja"): every item a verb, or
 *  null. */
function verbList(list: string, bare = false): Opt[] | null {
  if (!/\s(?:o|u)\s/i.test(list)) return null;
  const chunks = list.split(/\s*,\s*(?:o\s+|u\s+)?|\s+(?:o|u)\s+/i).filter((c) => c.trim());
  if (chunks.length < 2) return null;
  const opts = chunks.map((c) => verbOption(c, bare));
  return opts.every((o) => o) ? (opts as Opt[]) : null;
}
interface Offer { sent: string; lineId: string; opts: Opt[] }

function option(chunk: string): Opt | null {
  let raw = chunk.trim().replace(/^(?:y|e|o|u)\s+/i, "").replace(/[.!?,;:]+$/, "").trim();
  const trimmed = raw.replace(/\s+(?:hoy|ahorita|para usted|para ti|por favor|también|nada más|nomás|entonces)$/i, "").trim();
  if (words(trimmed) >= 2 && !/\s(?:para|de|a|en|con|por)$/i.test(trimmed)) raw = trimmed; // not "para hoy" → "para"
  if (!raw || /^(?:de |a |por |en )?\$|^\d+$/.test(raw)) return null; // a price isn't an option
  raw = raw.replace(/\s+de la (?:mañana|tarde|noche)$/i, ""); // "uno a las 10:15 de la mañana" → "uno a las 10:15"
  let core = raw, de = false;
  if (ART.test(core) && words(core) > 1) core = core.replace(ART, "");
  if (/^(?:de|del)\s+/i.test(core) && words(core) > 1) { core = core.replace(/^(?:de|del)\s+/i, ""); de = true; }
  if (!core || words(core) > 4 || NOT_AN_OPTION.test(core.toLowerCase())) return null;
  return { raw, core, de };
}

/** The offers in one spoken line: its questions with "o" and its "Tenemos…/Hay…" sentences. */
function offersIn(text: string, lineId: string): Offer[] {
  const out: Offer[] = [];
  for (const m of text.matchAll(/¿([^¿?]*)\?/g)) {
    let body = m[1].trim();
    if (!/\s(?:o|u)\s/i.test(body) || /más o menos/i.test(body)) continue;
    if (body.includes(": ")) body = body.slice(body.lastIndexOf(": ") + 2).trim(); // "¿De cuál le pongo: magna o premium?"
    body = body.replace(LEAD, "");
    // things to do: "¿Se la toma, la vacía o me la deja?", "¿Quiere vaciarla o tirarla?"
    const verbs = verbList(body) ?? (body.match(ASK) ? verbList(body.match(ASK)![1], true) : null);
    if (verbs) { out.push({ sent: m[0], lineId, opts: verbs }); continue; }
    const ask = body.match(ASK);
    const list = ask ? ask[1] : body;
    const chunks = list.split(/\s*,\s*(?:o\s+|u\s+)?|\s+(?:o|u)\s+/i).filter((c) => c.trim());
    // "¿Cuál, magna o premium?", "¿Cuál prefiere, el normal o el express?": the options follow the "which"
    const which = !ask && WHICH.test(chunks[0]?.trim() ?? "");
    if (which) chunks.shift();
    if (chunks.length < 2) continue;
    // a clause in a half: two questions in one ("¿Ya decidió, o necesita unos minutos más?", "¿Empezamos, o lo
    // esperamos?"), not a choice, except a short "está todo" said back as it is ("¿Falta algo o está todo?")
    const clause = (c: string) => CLAUSE.test(c) && !(words(c) <= 2 && /^(?:está|esta|es|son|están)(?=\s|$)/i.test(c));
    if (chunks.slice(ask ? 1 : 0).some((c) => clause(c.trim()))) continue;
    // "¿Mismo modelo en otra talla o en otro color?": the first option starts where the last one's preposition does
    const prep = chunks[chunks.length - 1].trim().match(/^(de|en|para|con|por|a|al)\s/i)?.[1];
    if (prep && words(chunks[0]) > 2) { const at = chunks[0].toLowerCase().lastIndexOf(` ${prep.toLowerCase()} `); if (at > 0) chunks[0] = chunks[0].slice(at + 1); }
    if (!ask && chunks.some((c) => words(c) > 4)) continue; // a bare list's options are short
    const opts = chunks.map(option).filter((o): o is Opt => !!o);
    if (opts.length >= 2 && opts.length === chunks.length) out.push({ sent: m[0], lineId, opts });
  }
  for (const s0 of text.replace(/¿[^¿?]*\?/g, ". ").split(/(?<=[.!])\s+/)) {
    const s = s0.trim().replace(LEAD_STATEMENT, "");
    // "Puede tomársela, vaciarla o dejármela."
    const can = s.match(/^(?:(?:usted|tú|ustedes)\s+)?(?:puede|puedes|pueden)\s+(.+?)[.!]*$/i);
    const verbs = can ? verbList(can[1], true) : null;
    if (verbs) { out.push({ sent: s0.trim(), lineId, opts: verbs }); continue; }
    const d = s.match(DECL);
    if (!d || /^que\s/i.test(d[1])) continue;
    let list = d[1].replace(/(\d),(\d{3})/g, "$1$2"); // "$1,700" is one number
    if (list.includes(": ")) list = list.slice(list.lastIndexOf(": ") + 2); // not the colon of "10:30"
    list = list.replace(/\bentre (\S+(?: \S+)?) y /gi, "entre $1 hasta "); // "entre las 9 y las 12" is one span
    // a list joins its last item with y/o ("Tenemos A, B y C."); commas alone describe one thing ("Hay un cajero en la
    // terminal, ahí adentro."); "Tengo A y B" is news ("Tengo una hija y dos nietos."), "Tengo A o B" an offer
    if (!/\s(?:y|e|o|u)\s/i.test(list) || (/^tengo\s/i.test(s) && !/\s(?:o|u)\s/i.test(list))) continue;
    const chunks = list.split(/\s*,\s*(?:y\s+|e\s+|o\s+|u\s+)?|\s+(?:y|e|o|u)\s+/i).filter((c) => c.trim());
    if (chunks.some((c) => VERBISH.test(c))) continue;
    const opts = chunks.map(option).filter((o): o is Opt => !!o && !/^entre\s/i.test(o.core));
    if (opts.length >= 2) out.push({ sent: s0.trim(), lineId, opts });
  }
  return out;
}

/** Short natural answers that pick an option. */
function forms(o: Opt): string[] {
  if (o.says) return o.says;
  const x = o.core, X = cap(x);
  const f = [`${X}.`, `${X}, por favor.`];
  if (o.de) f.push(`De ${x}, por favor.`, `De ${x}.`, `El de ${x}.`, `La de ${x}.`);
  f.push(`Quiero ${x}.`, `${X} está bien.`);
  if (!o.de && !/^(?:para|en|con|a|al|por|sin|de|del)\s/i.test(x)) f.push(`El ${x}, por favor.`, `La ${x}, por favor.`);
  if (fold(o.raw) !== fold(x)) f.push(`${cap(o.raw)}.`, `${cap(o.raw)}, por favor.`);
  if (/^(?:la|las)\s+\d/i.test(o.raw)) f.push(`A ${o.raw}.`, `A ${o.raw} está bien.`); // "Tengo las 10:00 o las 12:30."
  // the noun the list starts with: "asiento de ventana" → "De ventana.", "salidas a Tulum" → "Tulum."
  const tail = x.match(/^(?:.+\s)?(de|a|al|en|con|para)\s+(.+)$/i);
  if (tail && words(x) > 1) f.push(`${cap(tail[1])} ${tail[2]}.`, `${cap(tail[2])}.`);
  return [...new Set(f)];
}

// The person didn't understand, hasn't got it, or only heard the word by its sound (compared folded: no accents). An
// apology counts in the reply's first line only ("¡Claro! Aquí tienes… ¡Salud! Perdón, ¿cómo te llamas?" is fine).
const SORRY_FIRST = /\b(?:perdon|disculpe|disculpa|lo siento|lo sentimos|mande)\b/;
const SORRY = /\b(?:no tenemos|no (?:le |te )?entendi|ya no (?:hay|tenemos|nos queda|queda|quedan)|se (?:nos )?acabo|se (?:nos )?acabaron|no manejamos|no vendemos|no servimos|no contamos con|no (?:lo|la|los|las) tenemos|no (?:nos )?quedan?|no hay(?! (?:problema|de que|prisa|bronca|pendiente|cuidado|lio|ningun problema|tanta prisa|que)))\b/;
const NOT_UNDERSTOOD = new Set(["g_not_understood", "g_soundcheck"]);
const snap = (c: any) => JSON.stringify([c.s, c.step, c.pending?.id ?? null]);

type Opts = { gender: "m" | "f"; visits: number; seed: number; partner: string; setup?: (s: any) => void };
function mk(sit: any, o: Opts) {
  const def = o.setup ? { ...sit, init: (c: any) => { sit.init?.(c); o.setup!(c.s); } } : sit;
  return new Conversation(def, { global: GLOBAL, npcs: NPCS, player: { name: EDITION.simPlayer.name, surname: EDITION.simPlayer.surname, gender: o.gender, datePartner: o.partner }, visits: o.visits, seed: o.seed, memory: {} });
}
function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

interface Result { sit: string; sent: string; lineId: string; where: string; bad: Map<string, string>; good: Set<string>; tries: Map<string, number> }
const results = new Map<string, Result>();
function probe(sit: any, o: Opts, said: string[], off: Offer, where: string) {
  const key = `${sit.id} · ${fold(off.sent).slice(0, 90)}`;
  const r = results.get(key) ?? { sit: sit.id, sent: off.sent, lineId: off.lineId, where, bad: new Map(), good: new Set(), tries: new Map() };
  results.set(key, r);
  for (const x of off.opts) {
    const name = x.core;
    if (r.good.has(name) || (r.tries.get(name) ?? 0) >= MAX_TRIES) continue;
    r.tries.set(name, (r.tries.get(name) ?? 0) + 1);
    let ok = false, last = "";
    for (const f of forms(x)) {
      const conv = mk(sit, o);
      conv.start();
      for (const s of said) conv.input(s);
      if (conv.ended) { ok = true; break; }
      const before = snap(conv);
      const out = conv.input(f);
      const text = out.lines.map((l: any) => l.sentence.en).join(" ");
      const askedAgain = fold(text).includes(fold(off.sent));
      const sorry = SORRY.test(fold(text)) || SORRY_FIRST.test(fold(out.lines[0]?.sentence.en ?? "")) || !!out.checking
        || out.lines.some((l: any) => NOT_UNDERSTOOD.has(l.lineId) || /^(?:mande|como|perdon)\?$/.test(fold(l.sentence.en)));
      if (out.understood && !sorry && !askedAgain && (snap(conv) !== before || text.length > 0)) { ok = true; break; }
      last ||= `${f} → ${out.understood ? (askedAgain ? "(asked again) " : "") + text.slice(0, 100) : "(not understood)"}`;
    }
    if (ok) { r.good.add(name); r.bad.delete(name); } else if (!r.bad.has(name)) r.bad.set(name, last);
  }
}
const offersOf = (out: any) => out.lines.flatMap((l: any) => offersIn(l.sentence.en, l.lineId));

const started = Date.now();
for (const sit of SITUATIONS) {
  if (only.length && !only.some((q) => sit.id.startsWith(q))) continue;
  // 1) the scripted sims
  for (const sim of sit.sims || []) for (let seed = 1; seed <= 6; seed++) {
    const said: string[] = [];
    const found: { k: number; off: Offer }[] = [];
    try {
      playSim(sit, sim, seed, { gender: "m", datePartner: "emma", onTurn: (conv: any, t: any, out: any) => {
        if (t) said.push(t.say);
        if (conv.ended) return;
        for (const off of offersOf(out)) found.push({ k: said.length, off });
      } });
    } catch { continue; }
    for (const f of found) probe(sit, { gender: "m", visits: seed % 3, seed, partner: "emma", setup: sim.setup }, said.slice(0, f.k), f.off, `sim “${sim.name}” seed ${seed}`);
  }
  // 2) random conversations
  const inputs: string[] = [];
  for (const t of sit.tests || []) if (t.intent !== "none") inputs.push(t.say);
  for (const sim of sit.sims || []) { inputs.push(...sim.turns); inputs.push(...Object.values(sim.auto || {}) as string[]); }
  for (let r = 0; r < RUNS; r++) {
    const rand = rng(r * 7919 + sit.id.length);
    const o: Opts = { gender: rand() < 0.5 ? "m" : "f", visits: Math.floor(rand() * 4), seed: r + 1, partner: rand() < 0.5 ? "sam" : "emma" };
    const conv = mk(sit, o);
    const said: string[] = [];
    let out: any;
    try { out = conv.start(); } catch { continue; }
    for (let t = 0; t < 14 && !conv.ended; t++) {
      for (const off of offersOf(out)) probe(sit, o, said.slice(), off, `random run ${r + 1}`);
      const say = inputs[Math.floor(rand() * inputs.length)] ?? "sí";
      said.push(say);
      try { out = conv.input(say); } catch { break; }
    }
  }
}

const bySit = new Map<string, Result[]>();
for (const r of results.values()) bySit.set(r.sit, [...(bySit.get(r.sit) ?? []), r]);
let flagged = 0;
for (const sit of SITUATIONS) {
  if (only.length && !only.some((q) => sit.id.startsWith(q))) continue;
  const rs = bySit.get(sit.id) ?? [];
  const bad = rs.filter((r) => r.bad.size);
  flagged += bad.length;
  console.log(`\n${sit.id}: ${rs.length} offers found, ${bad.length} with options the learner can't pick`);
  for (const r of bad) {
    console.log(`  ${r.lineId} · “${r.sent}”   (${r.where})`);
    for (const [x, why] of r.bad) console.log(`      ✗ ${x}   e.g. ${why}`);
  }
}
console.log(`\n${flagged} offers with options the learner can't pick (of ${results.size} offers found; ${((Date.now() - started) / 1000).toFixed(0)} s)`);
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify([...results.values()].map((r) => ({
  sit: r.sit, lineId: r.lineId, sent: r.sent, where: r.where, good: [...r.good], bad: Object.fromEntries(r.bad),
})), null, 1));
