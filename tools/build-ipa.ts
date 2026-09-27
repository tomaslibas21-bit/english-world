// Builds src/generated/ipa-lexicon.json (word → broad General American IPA) for every English
// word the game can show. Port of the story course's ipa.py convention:
//   CMU Pronouncing Dictionary, PRIMARY pronunciation; broad GA; /i u ɛ ɑ ɔ/ without length marks;
//   ʌ stressed / ə unstressed AH; ɝ stressed / ɚ unstressed ER; ʧ ʤ; ˈ ˌ on words of 2+ syllables;
//   strong (citation) forms for function words except the → ðə and a → ə.
// Overrides: tools/data/ipa-overrides.json (game words: names, brands) and the stories' overrides.
// Label: AI-generated from a dictionary, not verified against the recordings.
// Usage: npx tsx tools/build-ipa.ts
import fs from "node:fs";
import path from "node:path";
import { sentencesForIpa } from "./enumerate";
import { numberWords } from "../src/convo/compose";

const CMU: Record<string, string[]> = JSON.parse(fs.readFileSync(path.resolve("tools/data/cmudict.json"), "utf8"));
const OV_GAME = path.resolve("tools/data/ipa-overrides.json");
const overrides: Record<string, string> = {
  ...JSON.parse(fs.readFileSync(path.resolve("tools/data/ipa-overrides-stories.json"), "utf8")),
  ...(fs.existsSync(OV_GAME) ? JSON.parse(fs.readFileSync(OV_GAME, "utf8")) : {}),
};

const VOW: Record<string, string> = { AA: "ɑ", AE: "æ", AO: "ɔ", AW: "aʊ", AY: "aɪ", EH: "ɛ", EY: "eɪ", IH: "ɪ", IY: "i", OW: "oʊ", OY: "ɔɪ", UH: "ʊ", UW: "u" };
const CONS: Record<string, string> = { B: "b", CH: "ʧ", D: "d", DH: "ð", F: "f", G: "g", HH: "h", JH: "ʤ", K: "k", L: "l", M: "m", N: "n", NG: "ŋ", P: "p", R: "r", S: "s", SH: "ʃ", T: "t", TH: "θ", V: "v", W: "w", Y: "j", Z: "z", ZH: "ʒ" };
const ONSETS = new Set(("P R|P L|B R|B L|T R|T W|D R|D W|K R|K L|K W|G R|G L|G W|F R|F L|TH R|TH W|SH R|S P|S T|S K|S M|S N|S L|S W|S F|" +
  "S P R|S P L|S T R|S K R|S K W|S K L|P Y|B Y|K Y|G Y|M Y|F Y|V Y|HH Y|S K Y|S P Y").split("|"));

function arpaToIpa(pron: string): string {
  const ph = pron.toUpperCase().split(/\s+/);
  const isv = ph.map((p) => /\d$/.test(p) && (VOW[p.slice(0, -1)] !== undefined || ["AH", "ER"].includes(p.slice(0, -1))));
  const vidx = isv.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
  if (!vidx.length) return ph.map((p) => CONS[p] ?? "").join("");
  const vowel = (p: string) => {
    const base = p.slice(0, -1), st = p.slice(-1);
    if (base === "AH") return st === "1" || st === "2" ? "ʌ" : "ə";
    if (base === "ER") return st === "1" || st === "2" ? "ɝ" : "ɚ";
    return VOW[base];
  };
  const starts = [0];
  for (let k = 0; k < vidx.length - 1; k++) {
    const a = vidx[k], b = vidx[k + 1];
    const cl = ph.slice(a + 1, b);
    let take = 0;
    for (const n of [3, 2, 1]) {
      if (cl.length >= n && ((n === 1 && cl[cl.length - 1] !== "NG") || ONSETS.has(cl.slice(-n).join(" ")))) { take = n; break; }
    }
    starts.push(b - take);
  }
  const multi = vidx.length > 1;
  let out = "";
  starts.forEach((st, si) => {
    const end = si + 1 < starts.length ? starts[si + 1] : ph.length;
    const v = vidx[si];
    let mark = "";
    if (multi) { const d = ph[v].slice(-1); mark = d === "1" ? "ˈ" : d === "2" ? "ˌ" : ""; }
    out += mark + ph.slice(st, end).map((p, k) => (isv[st + k] ? vowel(p) : CONS[p] ?? "")).join("");
  });
  return out;
}

const VOWEL_CHARS = "aeiouæɑɔəɛɪʊʌɝɚ";
function normalizeIpa(s: string): string {
  s = s.replace(/ː/g, "");
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (s.startsWith("ər", i)) {
      const before = s.slice(0, i);
      const m = Math.max(before.lastIndexOf("ˈ"), before.lastIndexOf("ˌ"));
      let stressed: boolean;
      if (!s.includes("ˈ") && !s.includes("ˌ")) stressed = ![...(before.split(" ").at(-1) ?? "")].some((c) => VOWEL_CHARS.includes(c));
      else stressed = m >= 0 && ![...before.slice(m)].some((c) => VOWEL_CHARS.includes(c));
      out += stressed ? "ɝ" : "ɚ"; i++; continue;
    }
    out += s[i];
  }
  return out;
}

const primary = (w: string) => (CMU[w.toLowerCase()] ? arpaToIpa(CMU[w.toLowerCase()][0]) : null);
const SYLLABIC = ["ɪŋ", "ɪd", "ɪz", "ɚ", "əst", "li"];
const joinSuffix = (b: string, add: string) => (SYLLABIC.includes(add) && !b.includes("ˈ") && !b.includes("ˌ") ? "ˈ" + b + add : b + add);

function lookup(w: string): string | null {
  const lw = w.toLowerCase();
  if (overrides[lw]) return normalizeIpa(overrides[lw]);
  const folded = lw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (folded !== lw) return lookup(folded);
  const p = primary(lw);
  if (p) return p;
  if (lw.includes("-")) { const parts = lw.split("-").map(lookup); if (parts.every(Boolean)) return parts.join("-"); }
  if (lw.endsWith("'s") && lookup(lw.slice(0, -2))) {
    const base = lookup(lw.slice(0, -2))!;
    return base + (/[szʃʒʧʤ]$/.test(base) ? "ɪz" : /[bdgvðmnŋlraeiouəɑɔʊɛɪæʌɝɚ]$/.test(base) ? "z" : "s");
  }
  for (const [suf, add0] of [["s", "z"], ["es", "ɪz"], ["ing", "ɪŋ"], ["ed", "d"], ["ly", "li"], ["er", "ɚ"], ["est", "əst"]] as const) {
    if (lw.endsWith(suf) && lw.length - suf.length >= 3 && !overrides[lw.slice(0, -suf.length)]) {
      const b = primary(lw.slice(0, -suf.length));
      if (b) {
        let add: string = add0;
        if (suf === "s") add = /[szʃʒʧʤ]$/.test(b) ? "ɪz" : /[ptkfθ]$/.test(b) ? "s" : "z";
        if (suf === "ed") add = /[td]$/.test(b) ? "ɪd" : /[pkfsʃʧθ]$/.test(b) ? "t" : "d";
        return joinSuffix(b, add);
      }
    }
  }
  for (const pre of ["re", "un"]) {
    if (lw.startsWith(pre) && lw.length > 5) {
      const b = primary(lw.slice(pre.length));
      if (b) return (pre === "re" ? "ri" : "ʌn") + (b.startsWith("ˈ") || b.startsWith("ˌ") ? b : "ˈ" + b);
    }
  }
  return null;
}

function wordsIn(en: string): string[] {
  const out: string[] = [];
  for (const tok of en.split(/\s+/)) {
    for (const part of tok.split(/[—–]+|-(?=[A-Za-z])/)) {
      const w = part.replace(/^[^\p{L}0-9'’]+|[^\p{L}0-9'’]+$/gu, "").replace(/’/g, "'").toLowerCase(); // keeps "café", "Klaipėda"
      if (w && !/^\$?\d/.test(w)) out.push(w);
    }
  }
  return out;
}

const sentences = sentencesForIpa();
const lex: Record<string, string> = {};
const unknown = new Map<string, number>();
for (const s of sentences) for (const w of wordsIn(s)) {
  if (lex[w]) continue;
  const ipa = lookup(w);
  if (ipa) lex[w] = ipa; else unknown.set(w, (unknown.get(w) ?? 0) + 1);
}
// number words (prices, times, counts)
for (let n = 0; n < 100; n++) for (const w of numberWords(n).split(/[\s-]+/)) if (!lex[w]) { const i = lookup(w); if (i) lex[w] = i; }
for (const w of ["hundred", "thousand", "oh", "oclock", "o'clock", "dollars", "dollar", "cents", "a.m", "p.m"]) if (!lex[w]) { const i = lookup(w); if (i) lex[w] = i; }
// function-word forms per the convention
lex["the"] = "ðə"; lex["a"] = "ə";

fs.mkdirSync(path.resolve("src/generated"), { recursive: true });
fs.writeFileSync(path.resolve("src/generated/ipa-lexicon.json"), JSON.stringify(lex, Object.keys(lex).sort(), 0));
console.log(`IPA lexicon: ${Object.keys(lex).length} words; unknown: ${unknown.size}`);
if (unknown.size) console.log("  " + [...unknown.keys()].sort().join(", "));
