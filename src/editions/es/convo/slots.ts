// Built-in slot types in Spanish (replaces src/convo/slots.ts in the Spanish edition, docs/es/EDITIONS.md): numbers,
// prices in pesos, clock times, days, dates, spelled letters, names and phone numbers. Every reading is returned; the
// grammar keeps the one that lets the whole utterance parse. Values are the same as in the English edition (cents,
// {h, m}, "monday", {day, month}), so situation code reads them the same way.
import { foldAccents } from "../../../convo/normalize";
import { anyWords, type SlotFn, type SlotResult } from "../../../convo/grammar";
import type { Tokens } from "../../../convo/normalize";

const UNITS: Record<string, number> = { cero: 0, uno: 1, una: 1, un: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9 };
const TEENS: Record<string, number> = {
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
  veintiuno: 21, veintiun: 21, veintiuna: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26,
  veintisiete: 27, veintiocho: 28, veintinueve: 29,
};
const TENS: Record<string, number> = { treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90 };
const HUNDREDS: Record<string, number> = {
  cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300, cuatrocientos: 400, cuatrocientas: 400,
  quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600, setecientos: 700, setecientas: 700, ochocientos: 800,
  ochocientas: 800, novecientos: 900, novecientas: 900,
};
// what a learner types or a recogniser writes for a number word (seseo, b/v): only inside number slots
const NUM_SPELLING: Record<string, string> = {
  sinco: "cinco", sero: "cero", dose: "doce", trese: "trece", katorse: "catorce", catorse: "catorce", kinse: "quince", quinse: "quince",
  onse: "once", beinte: "veinte", bente: "veinte", sien: "cien", dosientos: "doscientos",
  tresientos: "trescientos", quinentos: "quinientos", ochosientos: "ochocientos", setesientos: "setecientos", seisientos: "seiscientos",
  nuebe: "nueve", siette: "siete", beintidos: "veintidos",
};
const word = (w: string | undefined) => (w === undefined ? w : NUM_SPELLING[w] ?? w);

const ORD: Record<string, number> = {
  primero: 1, primer: 1, primera: 1, segundo: 2, segunda: 2, tercero: 3, tercer: 3, tercera: 3, cuarto: 4, cuarta: 4, quinto: 5, quinta: 5,
  sexto: 6, sexta: 6, septimo: 7, septima: 7, setimo: 7, octavo: 8, octava: 8, noveno: 9, novena: 9, decimo: 10, decima: 10,
};
const ORD_SUFFIX = new Set(["o", "a", "er", "ra", "ro", "do", "da", "to", "ta", "vo", "va", "mo", "ma", "no", "na"]);

/** Read an integer 0–999 999 written in digits or words, starting at pos. Returns every prefix that forms a number
 *  ("treinta" and "treinta y cinco" from "treinta y cinco"; "mil" and "mil quinientos"). */
export function readInt(tokens: Tokens, pos: number, _allowHomophones = false): { end: number; value: number; words: boolean; homo?: boolean }[] {
  const out: { end: number; value: number; words: boolean; homo?: boolean }[] = [];
  const t0 = tokens[pos];
  if (t0 === undefined) return out;
  if (/^\d+$/.test(t0)) {
    const v = parseInt(t0, 10);
    out.push({ end: pos + 1, value: v, words: false });
    // "15 mil", "2 mil 500"
    if (tokens[pos + 1] === "mil" && v > 0 && v < 1000) {
      out.push({ end: pos + 2, value: v * 1000, words: true });
      if (/^\d{1,3}$/.test(tokens[pos + 2] ?? "")) out.push({ end: pos + 3, value: v * 1000 + parseInt(tokens[pos + 2], 10), words: true });
      for (const r of readInt(tokens, pos + 2)) if (r.words && r.value < 1000) out.push({ end: r.end, value: v * 1000 + r.value, words: true });
    }
    return out;
  }
  let i = pos, total = 0, chunk = 0, started = false;
  type Stage = "none" | "hundred" | "tens" | "tensy" | "unit";
  let stage: Stage = "none";
  const emit = () => out.push({ end: i, value: total + chunk, words: true });
  while (i < tokens.length) {
    const w = word(tokens[i])!;
    if (w in HUNDREDS && stage === "none" && chunk === 0) {
      chunk += HUNDREDS[w]; i++; started = true; emit();
      // "cien" stands alone (100) or before "mil" (100 000); "ciento" goes on ("ciento veinte")
      if (w === "cien") { if (word(tokens[i]) === "mil" && total === 0) { total = 100000; chunk = 0; i++; emit(); stage = "none"; continue; } break; }
      stage = "hundred"; continue;
    }
    if (w in TEENS && (stage === "none" || stage === "hundred")) { chunk += TEENS[w]; stage = "unit"; started = true; i++; emit(); continue; }
    if (w in TENS && (stage === "none" || stage === "hundred")) { chunk += TENS[w]; stage = "tens"; started = true; i++; emit(); continue; }
    if (w === "y" && stage === "tens") {
      const u = UNITS[word(tokens[i + 1])!];
      if (u !== undefined && u > 0) { stage = "tensy"; i++; continue; }
      break;
    }
    if (w in UNITS && (stage === "none" || stage === "hundred" || stage === "tensy")) {
      // "un"/"una" begin a number only on their own or before "mil"
      chunk += UNITS[w]; stage = "unit"; started = true; i++; emit(); continue;
    }
    if (w === "mil" && total === 0 && (!started || chunk > 0)) {
      total = (started ? chunk : 1) * 1000; chunk = 0; stage = "none"; started = true; i++; emit(); continue;
    }
    break;
  }
  return out;
}

export const numberSlot: SlotFn = (tokens, pos) => readInt(tokens, pos).filter((r) => r.value <= 9999).map((r) => ({ end: r.end, value: r.value, cost: 0 }));

export const ordinalSlot: SlotFn = (tokens, pos) => {
  const out: SlotResult[] = [];
  const t = word(tokens[pos]);
  if (t && t in ORD) out.push({ end: pos + 1, value: ORD[t] });
  if (t && /^\d+$/.test(t) && ORD_SUFFIX.has(tokens[pos + 1])) out.push({ end: pos + 2, value: parseInt(t, 10) });
  if (t && /^\d+$/.test(t)) out.push({ end: pos + 1, value: parseInt(t, 10), cost: 0.2 });
  return out;
};

const PESOS = new Set(["pesos", "peso", "varos", "varo", "pesitos", "mxn", "mn"]);
const CENTAVOS = new Set(["centavos", "centavo"]);

/** Prices in cents of a peso: "85", "85 pesos", "$85" (= "85 pesos"), "85.50", "ochenta y cinco", "ochenta y cinco
 *  pesos con cincuenta (centavos)", "ochenta y cinco con cincuenta", "ochenta y cinco cincuenta", "mil quinientos",
 *  "15 mil", "cincuenta centavos", "cien varos". */
export const priceSlot: SlotFn = (tokens, pos) => {
  const out: SlotResult[] = [];
  const t = tokens[pos];
  const add = (end: number, cents: number, cost = 0) => {
    out.push({ end, value: cents, cost });
    // "pesos mexicanos"
    if (tokens[end - 1] && PESOS.has(tokens[end - 1]) && tokens[end] === "mexicanos") out.push({ end: end + 1, value: cents, cost });
  };
  if (t && /^\d+\.\d{1,2}$/.test(t)) {
    const [d, c] = t.split(".");
    const cents = parseInt(d, 10) * 100 + parseInt(c.padEnd(2, "0"), 10);
    add(pos + 1, cents);
    if (PESOS.has(tokens[pos + 1])) add(pos + 2, cents);
    return out;
  }
  if (t && /^0\d/.test(t)) return out;
  const firsts = readInt(tokens, pos);
  // "12 000 pesos": a space as the thousands separator
  if (t && /^[1-9]\d{0,2}$/.test(t) && /^\d{3}$/.test(tokens[pos + 1] ?? "")) firsts.push({ end: pos + 2, value: parseInt(t + tokens[pos + 1], 10), words: false });
  const cents2 = (j: number) => readInt(tokens, j).filter((c) => c.value < 100 && !/^\d{3,}$/.test(tokens[j] ?? ""));
  for (const first of firsts) {
    const d = first.value;
    let i = first.end;
    if (d <= 999) add(i, d * 100, 0.1);
    else if (d <= 999999) add(i, d * 100, 0.3);
    if (PESOS.has(tokens[i])) {
      i++;
      add(i, d * 100);
      if (tokens[i] === "con") for (const c of cents2(i + 1)) {
        add(c.end, d * 100 + c.value);
        if (CENTAVOS.has(tokens[c.end])) add(c.end + 1, d * 100 + c.value);
      }
    } else if (CENTAVOS.has(tokens[i]) && d < 100) {
      add(i + 1, d);
    } else if (tokens[i] === "con") {
      // "ochenta y cinco con cincuenta"
      for (const c of cents2(i + 1)) {
        add(c.end, d * 100 + c.value);
        if (CENTAVOS.has(tokens[c.end])) add(c.end + 1, d * 100 + c.value);
      }
    } else if (first.words && d < 1000) {
      // "ochenta y cinco cincuenta" (85.50): cents of ten or more, said as a number
      for (const c of cents2(i)) if (c.value >= 10) { add(c.end, d * 100 + c.value, 0.15); if (PESOS.has(tokens[c.end])) add(c.end + 1, d * 100 + c.value, 0.15); }
    }
  }
  return out;
};

export interface ClockTime { h: number; m: number; ampm?: "am" | "pm" }

const HOUR_WORD = (tokens: Tokens, i: number) => readInt(tokens, i).filter((r) => r.end === i + 1 && r.value <= 24);

/** Clock times: "7:30", "las ocho", "la una", "las ocho y media", "las tres y cuarto", "las cinco menos cuarto",
 *  "cuarto para las ocho", "diez para las nueve", "ocho treinta", "a las ocho en punto", "mediodía", "las 19 horas",
 *  with "de la mañana / tarde / noche" or "a. m. / p. m." after it. An article "la"/"las" before the hour is part of
 *  the time (patterns write "a {time}"). */
export const timeSlot: SlotFn = (tokens, pos) => {
  const out: SlotResult[] = [];
  const push = (end: number, t: ClockTime, cost = 0) => {
    out.push({ end, value: t, cost });
    let e = end;
    if (tokens[e] === "en" && tokens[e + 1] === "punto") { e += 2; out.push({ end: e, value: t, cost }); }
    if (tokens[e] === "horas" || tokens[e] === "hrs" || tokens[e] === "hr") { e += 1; out.push({ end: e, value: t, cost }); }
    const tail = readAmPm(tokens, e);
    if (tail) out.push({ end: tail.end, value: { ...t, ampm: tail.v }, cost });
  };
  const t = tokens[pos];
  if (!t) return out;
  if (t === "mediodia" || (t === "medio" && tokens[pos + 1] === "dia")) { push(t === "medio" ? pos + 2 : pos + 1, { h: 12, m: 0, ampm: "pm" }); return out; }
  if (t === "medianoche" || (t === "media" && tokens[pos + 1] === "noche")) { push(t === "media" ? pos + 2 : pos + 1, { h: 0, m: 0, ampm: "am" }); return out; }
  // "7:30", "las 19:30", "7.30"
  const dig = (t === "la" || t === "las") ? pos + 1 : pos, d = tokens[dig] ?? "";
  if (/^\d{1,2}:\d{2}$/.test(d) || /^\d{1,2}\.\d{2}$/.test(d)) {
    const [h, m] = d.split(/[:.]/).map((x) => parseInt(x, 10));
    if (h <= 23 && m < 60) push(dig + 1, { h, m }, d.includes(".") ? 0.05 : 0);
    return out;
  }
  // "cuarto para las ocho", "diez para las nueve" (Mexico): minutes before the hour
  const before = (mins: number, at: number, cost: number) => {
    if (tokens[at] !== "para") return;
    let j = at + 1;
    if (tokens[j] === "las" || tokens[j] === "la") j++;
    for (const h of HOUR_WORD(tokens, j)) if (h.value >= 1 && h.value <= 12) push(h.end, { h: h.value === 1 ? 12 : h.value - 1, m: 60 - mins }, cost);
  };
  if (t === "cuarto") before(15, pos + 1, 0);
  for (const n of readInt(tokens, pos)) if (n.value >= 1 && n.value <= 30 && n.words) {
    const at = tokens[n.end] === "minutos" ? n.end + 1 : n.end;
    before(n.value, at, 0);
  }
  let i = pos;
  const art = t === "la" || t === "las";
  if (art) i++;
  for (const h of HOUR_WORD(tokens, i)) {
    const hour = h.value;
    if (hour > 23) continue;
    // "las 19 horas" and a bare hour; a bare number without "la/las" costs a little (it may be a count). One o'clock is
    // "la una": a bare "uno", "un" or "una" is a count ("¿Hay uno más tarde?"), unless minutes or the part of the day
    // follow ("una y media", "una de la tarde")
    const e = h.end;
    const one = !art && (tokens[i] === "uno" || tokens[i] === "un" || (tokens[i] === "una" && !readAmPm(tokens, e)));
    if (!one) push(e, { h: hour, m: 0 }, art ? 0 : 0.05);
    // "y media", "y cuarto", "y diez", "y cinco minutos"
    if (tokens[e] === "y") {
      if (tokens[e + 1] === "media") push(e + 2, { h: hour, m: 30 });
      else if (tokens[e + 1] === "cuarto") push(e + 2, { h: hour, m: 15 });
      else for (const m of readInt(tokens, e + 1)) if (m.value >= 1 && m.value < 60) {
        push(m.end, { h: hour, m: m.value });
        if (tokens[m.end] === "minutos") push(m.end + 1, { h: hour, m: m.value });
      }
    }
    // "menos cuarto", "menos diez"
    if (tokens[e] === "menos") {
      const prev = hour === 1 ? 12 : hour === 0 ? 23 : hour - 1;
      if (tokens[e + 1] === "cuarto") push(e + 2, { h: prev, m: 45 });
      else for (const m of readInt(tokens, e + 1)) if (m.value >= 1 && m.value < 30) push(m.end, { h: prev, m: 60 - m.value });
    }
    // "ocho treinta", "ocho quince", "ocho cero cinco"
    let j = e, zero = false;
    if (tokens[j] === "cero") { j++; zero = true; }
    for (const m of readInt(tokens, j)) {
      if ((zero && m.value < 10) || (!zero && m.value >= 10 && m.value < 60)) push(m.end, { h: hour, m: m.value });
    }
  }
  if (/^\d{3,4}$/.test(tokens[i] ?? "")) {
    const v = tokens[i]; const h = parseInt(v.slice(0, v.length - 2), 10); const m = parseInt(v.slice(-2), 10);
    if (h <= 23 && m < 60) push(i + 1, { h, m });
  }
  return out;
};

function readAmPm(tokens: Tokens, i: number): { end: number; v: "am" | "pm" } | null {
  const w = tokens[i], w2 = tokens[i + 1], w3 = tokens[i + 2];
  if (w === "am" || (w === "a" && w2 === "m")) return { end: w === "am" ? i + 1 : i + 2, v: "am" };
  if (w === "pm" || (w === "p" && w2 === "m")) return { end: w === "pm" ? i + 1 : i + 2, v: "pm" };
  if (w === "de" && w2 === "la") {
    if (w3 === "manana" || w3 === "madrugada") return { end: i + 3, v: "am" };
    if (w3 === "tarde" || w3 === "noche") return { end: i + 3, v: "pm" };
  }
  if (w === "en" && w2 === "la") {
    if (w3 === "manana") return { end: i + 3, v: "am" };
    if (w3 === "tarde" || w3 === "noche") return { end: i + 3, v: "pm" };
  }
  return null;
}

const DAYS: Record<string, string> = { lunes: "monday", martes: "tuesday", miercoles: "wednesday", jueves: "thursday", viernes: "friday", sabado: "saturday", domingo: "sunday" };
const dayOf = (w?: string) => (w ? DAYS[w] ?? DAYS[w.replace(/s$/, "")] ?? null : null);

/** Days: "el lunes", "este viernes", "el próximo martes", "el martes que viene" (or "que entra"), "hoy", "mañana"
 *  (and "mañana en la tarde"), "pasado mañana", "esta noche", "este fin de semana", "la próxima semana", "la semana que
 *  viene" (or "que entra"), "la otra semana". The values are the English edition's ("monday", "tomorrow",
 *  "next_week"…). */
export const daySlot: SlotFn = (tokens, pos) => {
  const out: SlotResult[] = [];
  const t = tokens[pos], n1 = tokens[pos + 1], n2 = tokens[pos + 2], n3 = tokens[pos + 3];
  if (dayOf(t)) {
    out.push({ end: pos + 1, value: dayOf(t) });
    if (n1 === "que" && (n2 === "viene" || n2 === "entra")) out.push({ end: pos + 3, value: dayOf(t), tags: ["next"] });
  }
  if ((t === "el" || t === "este" || t === "los") && dayOf(n1)) {
    out.push({ end: pos + 2, value: dayOf(n1) });
    if (n2 === "que" && (n3 === "viene" || n3 === "entra")) out.push({ end: pos + 4, value: dayOf(n1), tags: ["next"] });
  }
  if (t === "el" && (n1 === "proximo" || n1 === "otro") && dayOf(n2)) out.push({ end: pos + 3, value: dayOf(n2), tags: ["next"] });
  if (t === "proximo" && dayOf(n1)) out.push({ end: pos + 2, value: dayOf(n1), tags: ["next"] });
  if (t === "hoy") {
    out.push({ end: pos + 1, value: "today" });
    if (n1 === "en" && n2 === "la" && n3 === "noche") out.push({ end: pos + 4, value: "tonight" });
  }
  if (t === "esta" && n1 === "noche") out.push({ end: pos + 2, value: "tonight" });
  if (t === "manana") {
    out.push({ end: pos + 1, value: "tomorrow" });
    const part = (n1 === "en" || n1 === "por") && n2 === "la" ? n3 : undefined;
    if (part === "manana" || part === "tarde" || part === "noche") out.push({ end: pos + 4, value: "tomorrow", tags: [part === "manana" ? "morning" : part === "tarde" ? "afternoon" : "evening"] });
  }
  if (t === "pasado" && n1 === "manana") out.push({ end: pos + 2, value: "day_after_tomorrow" });
  if (t === "este" && n1 === "fin" && n2 === "de" && n3 === "semana") out.push({ end: pos + 4, value: "this_weekend" });
  if (t === "esta" && (n1 === "tarde" || n1 === "manana")) out.push({ end: pos + 2, value: n1 === "tarde" ? "this_afternoon" : "this_morning" });
  if ((t === "la" && n1 === "proxima" && n2 === "semana")) out.push({ end: pos + 3, value: "next_week" });
  if (t === "la" && n1 === "semana" && n2 === "que" && (n3 === "viene" || n3 === "entra")) out.push({ end: pos + 4, value: "next_week" });
  // Mexico's "la otra semana" is next week
  if (t === "la" && n1 === "otra" && n2 === "semana") out.push({ end: pos + 3, value: "next_week" });
  if (t === "el" && n1 === "proximo" && n2 === "fin" && n3 === "de" && tokens[pos + 4] === "semana") out.push({ end: pos + 5, value: "next_weekend" });
  return out;
};

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const monthOf = (w?: string) => (w ? (w === "setiembre" ? 9 : MONTHS.indexOf(w) + 1) : 0);

/** Dates: "el cuatro de junio", "4 de junio", "el primero de mayo", "el 1o de mayo". Value {day, month}. */
export const dateSlot: SlotFn = (tokens, pos) => {
  const out: SlotResult[] = [];
  let i = pos;
  if (tokens[i] === "el") i++;
  const days: { end: number; value: number }[] = [];
  for (const d of readInt(tokens, i)) days.push({ end: d.end, value: d.value });
  if (tokens[i] === "primero" || tokens[i] === "primer") days.push({ end: i + 1, value: 1 });
  if (/^\d+$/.test(tokens[i] ?? "") && ORD_SUFFIX.has(tokens[i + 1])) days.push({ end: i + 2, value: parseInt(tokens[i], 10) });
  for (const d of days) {
    if (d.value < 1 || d.value > 31) continue;
    if (tokens[d.end] !== "de") continue;
    const m = monthOf(tokens[d.end + 1]);
    if (m) out.push({ end: d.end + 2, value: { day: d.value, month: m } });
  }
  return out;
};

/** Years: "1990", "2026", "dos mil veintiséis", "mil novecientos noventa". */
export const yearSlot: SlotFn = (tokens, pos) => {
  const out: SlotResult[] = [];
  const t = tokens[pos];
  if (/^(19|20)\d\d$/.test(t ?? "")) { out.push({ end: pos + 1, value: parseInt(t, 10) }); return out; }
  for (const r of readInt(tokens, pos)) if (r.value >= 1900 && r.value <= 2100) out.push({ end: r.end, value: r.value });
  return out;
};

const LETTER_NAMES: Record<string, string> = {
  a: "a", be: "b", ce: "c", se: "c", de: "d", e: "e", efe: "f", ge: "g", je: "g", hache: "h", ache: "h", i: "i", jota: "j", hota: "j",
  ka: "k", ca: "k", ele: "l", eme: "m", ene: "n", o: "o", pe: "p", cu: "q", ere: "r", erre: "r", ese: "s", te: "t", u: "u",
  ve: "v", uve: "v", equis: "x", ye: "y", zeta: "z", seta: "z", elle: "ll", che: "ch",
  // "eñe" (and a typed "ñ"), kept apart from "ene" before the accents are folded (lang.ts preSurface)
  enie: "ñ",
};
/** Two-word letter names: "doble ve", "doble u", "uve doble" (w), "doble ele" (ll), "doble erre" (rr), "doble ese"
 *  (ss) and any other letter twice, "i griega" (y), "i latina" (i), "be grande" (b), "be chica" / "ve chica" / "ve
 *  corta" (v). */
function letterPair(a?: string, b?: string): string | null {
  if (a === "doble" && (b === "ve" || b === "u" || b === "uve" || b === "be")) return "w";
  if (a === "uve" && b === "doble") return "w";
  if (a === "doble" && b !== undefined) {
    const one = LETTER_NAMES[b] ?? (/^[a-z]$/.test(b) ? b : undefined);
    if (one?.length === 1) return one + one;
  }
  if (a === "i" && b === "griega") return "y";
  if (a === "i" && b === "latina") return "i";
  if ((a === "be" || a === "ve") && (b === "grande" || b === "larga" || b === "alta")) return "b";
  if ((a === "be" || a === "ve") && (b === "chica" || b === "corta" || b === "baja" || b === "chiquita")) return "v";
  return null;
}

/** Spelled letters: "eme, i, ele, ele, e, ere", "M I L L E R", "doble ve", "eme de mamá". Also one run-together word. */
export const lettersSlot: SlotFn = (tokens, pos) => {
  const out: SlotResult[] = [];
  let i = pos;
  let letters = "";
  while (i < tokens.length) {
    const w = tokens[i];
    const pair = letterPair(w, tokens[i + 1]);
    if (pair) { letters += pair; i += 2; }
    else if (LETTER_NAMES[w] !== undefined) { letters += LETTER_NAMES[w]; i++; }
    else if (/^[a-z]$/.test(w)) { letters += w; i++; }
    else break;
    // "eme de mamá", "be de burro": the example word only confirms the letter
    const last = letters[letters.length - 1];
    if (tokens[i] === "de" && tokens[i + 1]?.[0] === last && (tokens[i + 1]?.length ?? 0) > 2) i += 2;
    else if (tokens[i] === "como" && tokens[i + 1]?.[0] === last && (tokens[i + 1]?.length ?? 0) > 2) i += 2;
    if (letters.length >= 2) out.push({ end: i, value: letters, cost: 0 });
  }
  const t = tokens[pos];
  if (t && /^[a-z]{3,}$/.test(t) && !(t in LETTER_NAMES) && !NAME_STOP.has(t)) out.push({ end: pos + 1, value: t, cost: 0.6, tags: ["joined"] });
  return out;
};

/** Words that are never a name or a spelled word. */
const NAME_STOP = new Set(("yo tu usted el ella nosotros ustedes ellos ellas un una unos unas la las los lo le les me te se nos " +
  "es soy eres son esta estoy estan era fue ser estar a de del al en con por para y o pero no si ni que quien como cuando donde " +
  "mi mis su sus nuestro este esta eso esto aqui ahi gracias perdon disculpe hola adios favor porfa bueno pues ok claro " +
  "quiero quisiera puedo puede tengo tiene hay va voy me llamo llamo nombre apellido mande como perdon repita despacio momento " +
  "segundo minuto sale va orale andale nada nunca").split(" "));

const KNOWN_NAMES = new Set<string>();
/** The player's own name/surname (and their common recogniser spellings) are cheap to match. */
export function setKnownNames(names: string[]) {
  KNOWN_NAMES.clear();
  for (const n of names) for (const w of foldAccents(n.toLowerCase()).replace(/[^a-z0-9'\s-]/g, " ").split(/[\s-]+/)) if (w) KNOWN_NAMES.add(w);
}

/** Is this word part of the player's own name? */
export const isKnownName = (w: string) => KNOWN_NAMES.has(w);

/** A person's name: one to three words that are not function words. Unknown words cost more. */
export const nameSlot: SlotFn = (tokens, pos) => {
  const out: SlotResult[] = [];
  let i = pos;
  const parts: string[] = [];
  let cost = 0;
  while (i < tokens.length && parts.length < 3) {
    const w = tokens[i];
    if (NAME_STOP.has(w) || /^\d/.test(w)) break;
    parts.push(w); i++;
    cost += KNOWN_NAMES.has(w) ? 0.05 : 0.95;
    out.push({ end: i, value: parts.map(cap).join(" "), cost, tags: parts.every((p) => KNOWN_NAMES.has(p)) ? ["known_name"] : [] });
  }
  return out;
};
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

const DIGIT_WORDS: Record<string, string> = { cero: "0", uno: "1", dos: "2", tres: "3", cuatro: "4", cinco: "5", seis: "6", siete: "7", ocho: "8", nueve: "9" };
/** Phone or account numbers: digit by digit ("nueve ocho cuatro"), in pairs as Mexicans read them ("noventa y ocho,
 *  cuarenta y cinco"), or written ("998 145 2233"). Value: the digit string. */
export const digitsSlot: SlotFn = (tokens, pos) => {
  const out: SlotResult[] = [];
  const seen = new Set<string>();
  let states: { i: number; s: string }[] = [{ i: pos, s: "" }];
  for (let step = 0; step < 16 && states.length; step++) {
    const next: { i: number; s: string }[] = [];
    for (const { i, s } of states) {
      const w = word(tokens[i]);
      if (w === undefined) continue;
      const add = (end: number, d: string) => {
        const ns = s + d, k = `${end}:${ns}`;
        if (seen.has(k) || ns.length > 16) return;
        seen.add(k);
        next.push({ i: end, s: ns });
        if (ns.length >= 3) out.push({ end, value: ns });
      };
      if (/^\d+$/.test(w)) add(i + 1, w);
      else {
        if (DIGIT_WORDS[w] !== undefined) add(i + 1, DIGIT_WORDS[w]);
        // a pair or a group: "cuarenta y cinco" = 45, "ciento veinte" = 120
        for (const r of readInt(tokens, i)) if (r.words && r.value >= 10 && r.value < 1000) add(r.end, String(r.value));
      }
    }
    states = next.slice(0, 12);
  }
  return out;
};

const TERM_ARTICLES = new Set(["un", "una", "el", "la", "los", "las", "unos", "unas"]);
/** Words that make "¿Qué es…?" no question about a word: a comparison, a judgement or a clause ("¿Qué es mejor?", "¿Qué
 *  es más barato?", "¿Qué es lo que…?", "¿Qué es eso?" has its own pattern). */
const NOT_A_TERM = new Set(["mejor", "peor", "mas", "menos", "lo", "eso", "esto", "aquello", "que", "mio", "mia", "tuyo", "suyo", "bueno",
  "buena", "malo", "mala", "igual", "mismo", "misma", "posible", "imposible", "necesario", "normal", "cierto", "verdad", "caro", "cara",
  "barato", "barata", "facil", "dificil", "importante", "obligatorio", "gratis", "incluido", "seguro", "mejor", "primero", "ultimo",
  "tarde", "temprano", "hoy", "manana", "ahora", "ahorita", "aqui", "ahi", "alla", "eso", "todo", "nada", "algo", "no", "si", "de",
  "a", "en", "con", "para", "por", "y", "o", "yo", "tu", "usted", "el", "ella", "nosotros", "ustedes", "ellos", "ellas", "me", "te",
  "se", "le", "les", "nos", "es", "son", "esta", "estan", "hay", "tiene", "puede", "quiere"]);
/** The word or name a "¿Qué es…?" asks about (global g_meaning): an article and one to three words ("una charola", "el
 *  CURP", "la tenencia"), or one word alone ("¿Qué es charola?"); never "mejor", "más barato", "lo que…". It costs as
 *  much as {any}, so a conversation's own "¿Qué es…?" (a dish, a fee) wins. */
const termSlot: SlotFn = (tokens, pos) => {
  const out: SlotResult[] = [];
  const art = TERM_ARTICLES.has(tokens[pos]) ? 1 : 0;
  for (let len = 1; len <= (art ? 3 : 1) && pos + art + len <= tokens.length; len++) {
    const w = tokens.slice(pos + art, pos + art + len);
    if (NOT_A_TERM.has(w[0]) || w.some((x) => x === "no" || x === "nunca" || /\d/.test(x))) break;
    out.push({ end: pos + art + len, value: w.join(" "), cost: 2.5 + 0.4 * len + (art ? 0 : 0.2) });
  }
  return out;
};

export const BUILTIN_SLOTS = {
  number: { fn: numberSlot },
  ordinal: { fn: ordinalSlot },
  price: { fn: priceSlot },
  time: { fn: timeSlot },
  day: { fn: daySlot },
  date: { fn: dateSlot },
  year: { fn: yearSlot },
  letters: { fn: lettersSlot },
  name: { fn: nameSlot },
  digits: { fn: digitsSlot },
  any: { fn: anyWords(5) },
  term: { fn: termSlot },
};
