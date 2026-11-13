// Spanish IPA per unit (replaces src/convo/ipa.ts in the Spanish edition): a broad transcription made by rule, in the
// Spanish the learner chose (src/convo/compose.ts variety()):
// - México and the neutral text: seseo (c before e/i and z are /s/) and yeísmo (ll and y are /ʝ/);
// - Spain: distinción (/θ/ for c before e/i and z), ll and y /ʝ/ as most Spaniards say them.
// Stress ˈ before the stressed syllable of a word of two or more syllables (none on a one-syllable word, as the
// English IPA here), by the written accent or the rule (a vowel, n or s at the end: the next-to-last syllable; else
// the last). /ɾ/ for a single r, /r/ for rr and r at the start of a word or after n, l, s. b and v are /b/; no
// allophones (β ð ɣ) are written. Exceptions: words the rules can't know (México's [x], Mayan x as [ʃ], English
// loanwords as the voices say them). Numbers, prices and times are transcribed as they are said.
// Not checked against the recordings word by word: tests/es/ipa.test.ts.
import { variety } from "../../../convo/compose";
import { numberWords, timeSay } from "./target";

const VOWELS = "aeiouáéíóúü";
const ACCENTED: Record<string, string> = { á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u" };

/** Words the rules can't read: x as [x] in México's names, Mayan x as [ʃ], and loanwords as the voices say them. */
const EXCEPTIONS: Record<string, string> = {
  méxico: "ˈmexiko", mexicano: "mexiˈkano", mexicana: "mexiˈkana", mexicanos: "mexiˈkanos", mexicanas: "mexiˈkanas",
  oaxaca: "waˈxaka", texas: "ˈtexas", xavier: "xaˈbjeɾ",
  ok: "oˈkei", okay: "oˈkei", wifi: "ˈwifi", "check-in": "tʃeˈkin", checkin: "tʃeˈkin", "check-out": "tʃeˈkaut",
  online: "onˈlain", email: "iˈmeil", "e-mail": "iˈmeil", uber: "ˈubeɾ", ticket: "ˈtiket", bugs: "bags", pitch: "pitʃ",
  deck: "dek", show: "tʃou", sándwich: "ˈsanwitʃ", sandwich: "ˈsanwitʃ", jeans: "ʝins", hobby: "ˈxobi", rock: "rok",
  whatsapp: "ˈwatsap", feedback: "ˈfidbak", startup: "ˈestaɾtap", crack: "kɾak", ux: "ju ˈeks", app: "ap", web: "web",
  hot: "xot", dog: "doɡ", jazz: "ʝas", pizza: "ˈpitsa", spa: "esˈpa", stop: "esˈtop", stand: "esˈtand",
};

const SPAIN_EXCEPTIONS: Record<string, string> = { jeans: "ʝins", jazz: "ʝaθ", pizza: "ˈpitsa" };

/** The letters of a word as phoneme segments, each with whether it is a vowel nucleus (and stressed by accent). */
type Seg = { p: string; v: boolean; acc?: boolean };

function segments(w: string, spain: boolean): Seg[] {
  const out: Seg[] = [];
  const at = (i: number) => w[i] ?? "";
  for (let i = 0; i < w.length; i++) {
    const c = at(i), n = at(i + 1), prev = at(i - 1);
    if (VOWELS.includes(c)) {
      const acc = "áéíóú".includes(c);
      out.push({ p: ACCENTED[c] ?? c, v: true, acc });
      continue;
    }
    switch (c) {
      case "h": break; // silent (ch is read below)
      case "c":
        if (n === "h") { out.push({ p: "tʃ", v: false }); i++; }
        else if ("eéií".includes(n)) out.push({ p: spain ? "θ" : "s", v: false });
        else out.push({ p: "k", v: false });
        break;
      case "z": out.push({ p: spain ? "θ" : "s", v: false }); break;
      case "q": out.push({ p: "k", v: false }); if (n === "u") i++; break;
      case "g":
        if ("eéií".includes(n)) out.push({ p: "x", v: false });
        else if (n === "u" && "eéií".includes(at(i + 2))) { out.push({ p: "ɡ", v: false }); i++; }
        else out.push({ p: "ɡ", v: false });
        break;
      case "j": out.push({ p: "x", v: false }); break;
      case "l": if (n === "l") { out.push({ p: "ʝ", v: false }); i++; } else out.push({ p: "l", v: false }); break;
      case "y":
        // y at the end of a word after a vowel (hoy, muy) and the word y itself are the vowel i
        if (!n && (i === 0 || VOWELS.includes(prev))) out.push({ p: "i", v: true });
        else out.push({ p: "ʝ", v: false });
        break;
      case "ñ": out.push({ p: "ɲ", v: false }); break;
      case "r":
        if (n === "r") { out.push({ p: "r", v: false }); i++; }
        else out.push({ p: i === 0 || "nls".includes(prev) ? "r" : "ɾ", v: false });
        break;
      case "v": out.push({ p: "b", v: false }); break;
      case "x":
        // a Mayan name's x ([ʃ]: Xcacel, Xcaret, Xpu-Há) at the start; between vowels or at the end /ks/
        out.push(i === 0 ? { p: "ʃ", v: false } : { p: "ks", v: false });
        break;
      case "w": out.push({ p: "w", v: false }); break;
      case "k": out.push({ p: "k", v: false }); break;
      default:
        if (/[a-zñ]/.test(c)) out.push({ p: c === "g" ? "ɡ" : c, v: false });
    }
  }
  return out;
}

/** Vowels in contact: an unstressed i or u before another vowel is a glide (/j/, /w/: bien, bueno, ciudad), and one
 *  after a vowel at the end of its syllable falls (aire, hoy, Europa: /i̯/, /u̯/). In order, so "ciudad" keeps its u. */
function glides(segs: Seg[]): Seg[] {
  const out = segs.map((s) => ({ ...s }));
  for (let i = 0; i < out.length; i++) {
    const s = out[i];
    if (!s.v || s.acc || (s.p !== "i" && s.p !== "u")) continue;
    if (out[i + 1]?.v) out[i] = { p: s.p === "i" ? "j" : "w", v: false };
    else if (out[i - 1]?.v) out[i] = { p: s.p === "i" ? "i̯" : "u̯", v: false };
  }
  return out;
}

const ONSETS = new Set(["pl", "pɾ", "bl", "bɾ", "fl", "fɾ", "tɾ", "dɾ", "kl", "kɾ", "ɡl", "ɡɾ"]);

/** Syllables (onset maximized within Spanish's two-consonant onsets) and the stressed one. */
function syllabify(segs: Seg[]): { syl: Seg[][]; stress: number } {
  const nuclei = segs.map((s, i) => (s.v ? i : -1)).filter((i) => i >= 0);
  if (!nuclei.length) return { syl: [segs], stress: 0 };
  const starts: number[] = [0];
  for (let k = 1; k < nuclei.length; k++) {
    let a = nuclei[k - 1] + 1;
    // a glide after the nucleus belongs to it (falling diphthongs)
    while (a < nuclei[k] && /̯/.test(segs[a].p)) a++;
    const cons = nuclei[k] - a;
    let cut: number;
    if (cons <= 0) cut = nuclei[k];
    else if (cons === 1) cut = nuclei[k] - 1;
    else {
      // the glide before the vowel (j, w) goes with it, and a permitted two-consonant onset too
      let b = nuclei[k];
      while (b > a && (segs[b - 1].p === "j" || segs[b - 1].p === "w")) b--;
      const c2 = segs[b - 2]?.p + segs[b - 1]?.p;
      cut = b - a >= 2 && ONSETS.has(c2) ? b - 2 : b - 1;
      if (cut < a) cut = a;
    }
    starts.push(cut);
  }
  const syl = starts.map((s, i) => segs.slice(s, starts[i + 1] ?? segs.length));
  const accented = syl.findIndex((sy) => sy.some((s) => s.acc));
  if (accented >= 0) return { syl, stress: accented };
  const last = segs[segs.length - 1];
  // a final -y counts as a consonant (estoy, Uruguay: stressed on the last syllable)
  const endsVowelNS = last && (last.v || last.p === "n" || last.p === "s");
  return { syl, stress: syl.length >= 2 && endsVowelNS ? syl.length - 2 : syl.length - 1 };
}

/** One Spanish word in IPA. */
export function ipaWord(word: string, spain = variety() === "spain"): string {
  const w = word.toLowerCase().replace(/[’']/g, "");
  const ex = (spain && SPAIN_EXCEPTIONS[w]) || EXCEPTIONS[w];
  if (ex) return ex;
  if (/-/.test(w)) return w.split("-").filter(Boolean).map((p) => ipaWord(p, spain)).join(" ");
  if (!/[a-zñáéíóúü]/.test(w)) return "";
  const segs = glides(segments(w, spain));
  const { syl, stress } = syllabify(segs);
  const parts = syl.map((sy) => sy.map((s) => s.p).join(""));
  if (parts.length < 2) return parts.join("");
  return parts.map((p, i) => (i === stress ? "ˈ" + p : p)).join("");
}

/** Letter names, as a code is spelled out (Mexico's; Spain's differ in B, V, W, Y only by name, not by sound here). */
const LETTERS: Record<string, string> = {
  A: "a", B: "be", C: "ce", D: "de", E: "e", F: "efe", G: "ge", H: "hache", I: "i", J: "jota", K: "ka", L: "ele", M: "eme",
  N: "ene", Ñ: "eñe", O: "o", P: "pe", Q: "cu", R: "erre", S: "ese", T: "te", U: "u", V: "ve", W: "doble ve", X: "equis",
  Y: "i griega", Z: "zeta",
};

/** Spanish spoken words for the numbers, prices and times written in a unit ("$85" → ochenta y cinco pesos). */
function spoken(tok: string): string[] {
  const t = tok.replace(/[.,!?;:¿¡"“”)(]+$/g, "").replace(/^[¿¡"“(]+/, "");
  const pct = /^(\d[\d.,]*)%$/.exec(t);
  if (pct) return [...spoken(pct[1]), "por", "ciento"];
  if (/^\+\d+$/.test(t)) return ["más", ...spoken(t.slice(1))];
  const time = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (time) return timeSay({ h: Number(time[1]), m: Number(time[2]) }).replace(/^(la|las) /, "").split(/\s+/);
  const money = /^\$(\d[\d,]*)(?:\.(\d{2}))?$/.exec(t);
  if (money) {
    const d = Number(money[1].replace(/,/g, "")), c = Number(money[2] ?? 0);
    return [...numberWords(d, "m").split(/\s+/), d === 1 ? "peso" : "pesos", ...(c ? ["con", ...numberWords(c, "m").split(/\s+/)] : [])];
  }
  const num = /^\d[\d,.]*$/.exec(t);
  if (num) {
    const [i, f] = t.replace(/,/g, "").split(".");
    return [...numberWords(Number(i)).split(/\s+/), ...(f ? ["punto", ...numberWords(Number(f)).split(/\s+/)] : [])];
  }
  // a code such as HP-4471: its digits as numbers, its letters by name (hache pe)
  if (/\d/.test(t)) return t.split(/[-/]/).flatMap((p) => (/^\d+$/.test(p) ? numberWords(Number(p)).split(/\s+/) : /^[A-ZÑ]+$/.test(p) ? [...p].flatMap((c) => LETTERS[c].split(" ")) : [p]));
  return [t];
}

export function ipaForUnit(text: string): string {
  const spain = variety() === "spain";
  const words = text.split(/\s+/).filter(Boolean).flatMap((tok) => (/\d/.test(tok) ? spoken(tok) : [tok]));
  return words
    .map((w) => w.replace(/^[^\p{L}0-9]+|[^\p{L}0-9]+$/gu, ""))
    .filter(Boolean)
    .map((w) => ipaWord(w, spain))
    .filter(Boolean)
    .join(" ");
}

export const hasIpa = () => true;
