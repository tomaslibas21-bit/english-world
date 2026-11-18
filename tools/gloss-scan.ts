// Glosses that don't translate (owner, 18 Nov 2026: the grotto riddle's "cate" glossed "cate"): every word-by-word gloss
// unit that only repeats its source word, spells it phonetically ("končą" for concha), or is empty ("—") where the source
// is a word with a meaning. Names (capitalised in the middle of a sentence anywhere) and the deliberate loanwords of the
// word notes are left out. Both games: Puerto Colibrí's English gloss and, with its tables, its Lithuanian one; Maple
// Harbor's Lithuanian one.
//   [EDITION=es] npx tsx --import ./tools/edition-hook.mjs tools/gloss-scan.ts <out.json>
import fs from "node:fs";
import path from "node:path";
import { SITUATIONS } from "../src/content/situations";
import { EDITION } from "../src/edition";

const out = process.argv[2] ?? "gloss-scan.json";
const ROOT = path.resolve(import.meta.dirname, "..");
const es = EDITION.id === "es";

const resolveChoice = (s: string) => s.replace(/\{(?:[a-z]+):([^|{}]*)\|(?:[a-z]+):([^{}]*)\}/g, "$1");
const units = (s: string) => resolveChoice(s).split(" | ");
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z\s'-]/g, " ").replace(/\s+/g, " ").trim();
/** The source spelled the way a Lithuanian (or English) reader would copy it, for "končą"-type copies. */
const phon = (s: string) => fold(s).replace(/qu/g, "k").replace(/c(?=[ei])/g, "s").replace(/c/g, "k").replace(/z/g, "s").replace(/ll/g, "j").replace(/y/g, "j").replace(/h/g, "").replace(/x/g, "ks").replace(/v/g, "b").replace(/w/g, "v").replace(/(.)\1/g, "$1");
/** A Lithuanian word without its ending, so "konča" / "končą" / "končos" all meet "concha". */
const stem = (s: string) => s.replace(/(as|is|ys|us|a|e|ė|ą|ę|ų|o|os|ai|ui|ei|į|u|i|y)$/u, "");
function lev(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const ltFold = (s: string) => fold(s.replace(/č/g, "ch").replace(/š/g, "sh").replace(/ž/g, "zh"));

// words that may well have no word of their own in the gloss ("—")
const FUNC_ES = new Set("el la los las lo un una unos unas a al de del en se me te le les nos os que y e o u pues ya si no".split(" "));
const FUNC_EN = new Set("the a an to of do does did it is am are be will would shall".split(" "));

interface Sent { en: string; lt: string; nat: string; flags?: Record<string, string> }
const isSent = (o: any): o is Sent => o && typeof o === "object" && typeof o.en === "string" && typeof o.lt === "string" && typeof o.nat === "string";
const isEnt = (o: any) => o && typeof o === "object" && typeof o.id === "string" && typeof o.en === "string" && typeof o.lt === "string" && (o.g === "m" || o.g === "f");

// the Lithuanian tables of Puerto Colibrí
const tables: Record<string, any> = {};
if (es) {
  const dir = path.join(ROOT, "src/editions/es-lt/tables");
  for (const f of fs.readdirSync(dir)) if (f.endsWith(".json") && !f.includes(".gen.")) tables[f.slice(0, -5)] = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
}

type Hit = { layer: string; kind: string; src: string; gloss: string; sit: string; where: string; sentence: string; flag?: string };
const hits: Hit[] = [];
const seenObj = new WeakSet<object>();
const capsMid = new Set<string>();
const allSents: { sit: string; where: string; o: Sent }[] = [];
const allEnts: { sit: string; where: string; o: any }[] = [];

function walk(o: any, sit: string, where: string, depth = 0) {
  if (!o || typeof o !== "object" || depth > 14 || seenObj.has(o)) return;
  seenObj.add(o);
  if (isSent(o)) { allSents.push({ sit, where, o }); for (const tw of ["neutral", "spain"]) if (isSent((o as any)[tw])) allSents.push({ sit, where: where + "." + tw, o: (o as any)[tw] }); return; }
  if (isEnt(o)) allEnts.push({ sit, where, o });
  if (typeof o === "function") return;
  for (const [k, v] of Object.entries(o)) if (v && typeof v === "object") walk(v, sit, where ? `${where}.${k}` : k, depth + 1);
}
for (const s of SITUATIONS) walk(s, s.id, "");
const contentDir = path.join(ROOT, es ? "src/editions/es/content" : "src/content");
for (const f of fs.readdirSync(contentDir)) {
  if (!f.endsWith(".ts") || ["types.ts", "dsl.ts"].includes(f)) continue;
  try { const m = await import(path.join(contentDir, f)); walk(m, "_" + f.replace(/\.ts$/, ""), ""); } catch (e) { console.error("skip", f, String(e).slice(0, 120)); }
}
// names: words written with a capital in the middle of a sentence, anywhere
for (const { o } of allSents) {
  const toks = resolveChoice(o.en).replace(/ \| /g, " ").split(/\s+/);
  toks.forEach((w, i) => { const prev = toks[i - 1] ?? ""; if (i > 0 && /^[A-ZÁÉÍÓÚÑ]/.test(w.replace(/^[¿¡"“«(]+/, "")) && !/[.!?…:]["”»)]?$/.test(prev)) capsMid.add(fold(w)); });
}
let notes: Record<string, string> = {};
try { const wn = await import(path.join(contentDir, "word-notes.ts")); notes = { ...(wn.WORD_NOTES ?? {}), ...Object.fromEntries(Object.keys(wn.WORD_NOTE_ALIASES ?? {}).map((k) => [k, "alias"])) }; } catch {}
const loan = (s: string) => fold(s) in notes || fold(s).split(" ").every((w) => w in notes);
const isName = (s: string) => fold(s).split(" ").some((w) => capsMid.has(w));

function check(layer: string, kind: string, srcUnits: string[], glossUnits: string[], sit: string, where: string, sentence: string, flags: Record<string, string> | undefined, lt: boolean) {
  if (srcUnits.length !== glossUnits.length) return;
  srcUnits.forEach((su, i) => {
    const s = fold(su), g = glossUnits[i].trim(), gf = lt ? ltFold(g) : fold(g);
    if (!s || /\d/.test(su) || /[{}]/.test(su) || s.length < 3) return;
    if (isName(su) || loan(su)) return;
    const flag = flags?.[String(i)];
    const func = es ? s.split(" ").every((w) => FUNC_ES.has(w)) : s.split(" ").every((w) => FUNC_EN.has(w));
    if ((g === "—" || g === "-" || g === "") && !func) { hits.push({ layer, kind: "empty", src: su, gloss: g, sit, where, sentence, flag }); return; }
    if (!gf) return;
    if (gf === s) { hits.push({ layer, kind: "same", src: su, gloss: g, sit, where, sentence, flag }); return; }
    if (lt && s.length >= 4) {
      const a = phon(s), b = stem(phon(gf.replace(/sh/g, "ch").replace(/ch/g, "ch")));
      if (a.length >= 4 && lev(stem(a), b) <= Math.max(1, Math.floor(a.length * 0.2))) hits.push({ layer, kind: "phonetic", src: su, gloss: g, sit, where, sentence, flag });
    }
  });
}

for (const { sit, where, o } of allSents) {
  const sentence = o.en.replace(/ \| /g, " ");
  if (es) {
    check("es→en", "sent", units(o.en), units(o.lt), sit, where, sentence, o.flags, false);
    const key = `${o.en}␟${o.lt}␟${o.nat}`;
    const t = tables[sit]?.sent?.[key] ?? tables["_shared"]?.sent?.[key];
    if (t) check("es→lt", "sent", units(o.en), units(t.gloss), sit, where, sentence, t.flags, true);
  } else check("en→lt", "sent", units(o.en), units(o.lt), sit, where, sentence, o.flags, true);
}
for (const { sit, where, o } of allEnts) {
  const first = (s: string) => s.split(" | ").map((u) => u.split("/")[0]).join(" | ");
  if (es) {
    check("es→en", "entity", units(o.en), units(o.lt), sit, where + "#" + o.id, o.en.replace(/ \| /g, " "), undefined, false);
    const t = tables[sit]?.entity?.[o.en] ?? tables["_shared"]?.entity?.[o.en];
    if (t?.lt) check("es→lt", "entity", units(o.en), units(first(t.lt)), sit, where + "#" + o.id, o.en.replace(/ \| /g, " "), undefined, true);
  } else check("en→lt", "entity", units(o.en), units(first(o.lt)), sit, where + "#" + o.id, o.en.replace(/ \| /g, " "), undefined, true);
}

fs.writeFileSync(out, JSON.stringify(hits, null, 0));
const by = new Map<string, Hit[]>();
for (const h of hits) { const k = `${h.layer}|${h.kind}|${fold(h.src)}|${h.gloss}`; (by.get(k) ?? by.set(k, []).get(k)!).push(h); }
console.log(`${allSents.length} sentences, ${allEnts.length} entities; ${hits.length} hits, ${by.size} distinct`);
for (const layer of new Set(hits.map((h) => h.layer))) for (const kind of ["same", "phonetic", "empty"]) console.log(layer, kind, [...by.keys()].filter((k) => k.startsWith(layer + "|" + kind + "|")).length);
