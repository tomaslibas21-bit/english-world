// Song 31 "Take a Deep Breath" → Puerto Colibrí: "Respire hondo"
// Clínica Familiar (downtown), Doctora Herrera (family doctor, calm and kind; usted). A sick visit in a small private
// clinic on Mexico's Caribbean coast: "¿Qué lo/la trae por aquí?" / "¿Qué le pasa?" / "Cuénteme…", the symptoms
// (dolor de garganta, fiebre, tos, dolor de cabeza / de estómago / de oído / de espalda, escurrimiento, nariz tapada,
// mareo, cansancio, dolor de cuerpo, gripa, influenza), "¿Desde cuándo…?", the pain scale ("Del uno al diez, ¿qué
// tan fuerte…?"), the temperature in °C (an American learner's Fahrenheit is converted kindly: "¿101 Fahrenheit? Aquí
// usamos Celsius: son como 38.5"), "¿Está tomando algo para eso?" (self-medicating with an antibiotic gets a gentle
// word: antibiotics need a prescription in Mexico), the exam ("Súbase la manga", "Respire hondo… y saque el aire",
// "Abra la boca y diga «a»", "¿Le duele aquí?"), what it is (infección en la garganta / en el oído, un virus, una
// infección en el estómago, un músculo lastimado, dolor de cabeza por tensión), allergies before prescribing, the
// prescription ("Le voy a recetar…", "una cápsula cada ocho horas, por cinco días", finish the antibiotic), the
// learner's questions (grave, contagioso, antibiótico, ¿es dengue?, efectos secundarios, alcohol, manejar, trabajo,
// justificante, picante, el mar), the paper prescription ("¿Sabe dónde surtirla?": any pharmacy fills it, the
// generic is cheaper) and the advice ("Descanse y tome muchos líquidos… Si no mejora, regrese. ¡Que se mejore!").
// Kept from the English: the id, steps dob, problem, more_sym, howlong, scale, fever, meds, exam, allergy, rx,
// pharmacy, note, questions; the intents; the exam stages; the twists penicillin, chart and blood_pressure.
// Changed by the brief: Celsius (the conversion goes the other way); the pharmacy question is about the paper
// prescription (no e-prescription sent to a pharmacy); the note for work is a "justificante"; new: paying for the
// visit at the end (a private clinic: step pay, intents pay_card, pay_cash, pay_transfer, here_you_go, no_cash,
// no_card, ask_receipt), dengue, the sea and spicy food. Mexican-only words in lines have a neutral twin (ahorita,
// unas líneas de temperatura); "gripa" only in a hint (twin: gripe).
// Unsure (kept vague): the fee ($500 for a private visit in a small Caribbean town is typical, not a fixed figure);
// the second antibiotic for a penicillin allergy is not named (its dose "cada doce horas" fits the usual one).

import type { Ctx, EntityDef, HintItem, Pending, SentSrc, SituationDef, Tip } from "@/content/types";
import type { SlotFn, SlotResult } from "@/convo/grammar";
import { readInt } from "@/convo/slots";
import { ent, t } from "@/content/dsl";

// ---------------------------------------------------------------------------
// Entities

export const SYMPTOMS: EntityDef[] = [
  ent("sore_throat", "dolor | de | garganta", "pain | of | throat", "m", { art: "", attrs: { nat: "sore throat" },
    forms: ["dolor de garganta", "garganta irritada", "la garganta irritada", "garganta inflamada", "la garganta inflamada", "anginas", "infeccion de garganta",
      "infeccion en la garganta", "dolor en la garganta", "faringitis", "amigdalitis", "dolor de garganta muy fuerte", "dolor de garganata"] }),
  ent("fever", "fiebre", "fever", "f", { art: "", forms: ["calentura", "temperatura", "fiebre alta", "escalofrios", "febricula", "fiebres", "fiebre y escalofrios"] }),
  ent("cough", "tos", "cough", "f", { art: "", forms: ["tos seca", "tos con flema", "flemas", "flema", "toz", "una tos"] }),
  ent("headache", "dolor | de | cabeza", "pain | of | head", "m", { art: "", attrs: { nat: "headache" },
    forms: ["dolor de cabeza", "dolores de cabeza", "migraña", "migrana", "jaqueca", "dolor de cabesa"] }),
  ent("stomachache", "dolor | de | estómago", "pain | of | stomach", "m", { art: "", attrs: { nat: "stomachache" },
    forms: ["dolor de estomago", "dolor de panza", "dolor de barriga", "nauseas", "nausea", "ganas de vomitar", "diarrea", "diarea", "vomito", "vomitos",
      "infeccion estomacal", "infeccion en el estomago", "el estomago revuelto", "agruras", "colicos", "dolor de pansa", "el estomago suelto"] }),
  ent("earache", "dolor | de | oído", "pain | of | ear", "m", { art: "", attrs: { nat: "earache" },
    forms: ["dolor de oido", "dolor de oidos", "dolor en el oido", "infeccion de oido", "infeccion en el oido", "otitis", "dolor de oreja"] }),
  ent("runny_nose", "escurrimiento | nasal", "dripping | nasal", "m", { art: "", attrs: { nat: "runny nose" },
    forms: ["escurrimiento", "mocos", "moqueo", "flujo nasal", "estornudos", "la nariz suelta"] }),
  ent("stuffy_nose", "congestión | nasal", "congestion | nasal", "f", { art: "", attrs: { nat: "stuffy nose" },
    forms: ["congestion nasal", "congestion", "la nariz tapada", "nariz tapada", "la nariz congestionada", "la nariz constipada"] }),
  ent("back_pain", "dolor | de | espalda", "pain | of | back", "m", { art: "", attrs: { nat: "back pain" },
    forms: ["dolor de espalda", "dolor en la espalda", "dolor de cintura", "lumbago", "dolor de espalda baja"] }),
  ent("dizzy", "mareo", "dizziness", "m", { art: "", forms: ["mareos", "vertigo", "vertigos"] }),
  ent("fatigue", "cansancio", "tiredness", "m", { art: "", forms: ["fatiga", "debilidad", "agotamiento", "mucho cansancio"] }),
  ent("aches", "dolor | de | cuerpo", "pain | of | body", "m", { art: "", attrs: { nat: "body aches" },
    forms: ["dolor de cuerpo", "dolores musculares", "dolor de huesos", "dolor muscular", "el cuerpo cortado", "cuerpo cortado"] }),
  ent("cold", "resfriado", "cold", "m", { art: "", forms: ["gripa", "gripe", "un resfriado", "catarro", "un catarro", "resfrio", "un poco de gripa", "un poco de gripe", "la gripa", "la gripe"] }),
  ent("flu", "influenza", "flu", "f", { art: "", forms: ["la influenza", "covid", "el covid", "gripe fuerte", "gripa fuerte"] }),
];

const PAINFUL = new Set(["sore_throat", "headache", "stomachache", "earache", "back_pain"]);

type Dx = "throat" | "ear" | "virus" | "stomach" | "back" | "tension";
type Kind = "ab" | "sym" | "stomach" | "pain";
const KIND: Record<Dx, Kind> = { throat: "ab", ear: "ab", virus: "sym", stomach: "stomach", back: "pain", tension: "pain" };
const CONTAGIOUS: Record<Dx, boolean> = { throat: true, ear: false, virus: true, stomach: true, back: false, tension: false };
/** The temperature Doctora Herrera measures when the learner didn't check it (°C). */
const MEASURED: Record<Dx, number> = { throat: 38.4, ear: 38, virus: 38.1, stomach: 37.2, back: 36.6, tension: 36.7 };
/** The visit (cents of a peso). */
const FEE = 50000;
const MAX_CASH = 200000;

// ---------------------------------------------------------------------------
// Temperatures: Celsius by default ("38", "38.5", "treinta y ocho y medio", "38 punto 2", "38 grados"); an American
// learner may say Fahrenheit ("101", "ciento uno", "100.4 Fahrenheit"). Values are {v, unit}; the unit is decided by
// the number when it isn't said (up to 45: °C; from 90: °F), and a body temperature is 35–43 °C (95–109 °F).

const U = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
const TENS_ES: Record<number, string> = { 3: "treinta", 4: "cuarenta", 9: "noventa" };
function esInt(n: number): string {
  if (n === 100) return "cien";
  if (n > 100) return "ciento " + esInt(n - 100);
  if (n === 10) return "diez";
  if (n < 10) return U[n];
  const tn = Math.floor(n / 10), u = n % 10;
  return TENS_ES[tn] + (u ? " y " + U[u] : "");
}
const tenths = (v: number) => Math.round(v * 10);
function sayTemp(v: number): string {
  const x = tenths(v), i = Math.floor(x / 10), d = x % 10;
  return esInt(i) + (d === 5 ? " y medio" : d ? " punto " + U[d] : "");
}
const fmtT = (v: number) => (tenths(v) % 10 ? (tenths(v) / 10).toFixed(1) : String(tenths(v) / 10));
const tempVal = (v: number) => ({ en: fmtT(v), lt: fmtT(v), say: sayTemp(v) });
const toC = (f: number) => ((f - 32) * 5) / 9;
/** The Celsius value she says after a Fahrenheit answer, to the tenth (98.6 → 37, 100 → 37.8). */
const roundC = (c: number) => Math.round(c * 10) / 10;

const DIG: Record<string, number> = { cero: 0, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9 };
const tempSlot: SlotFn = (tokens, pos) => {
  const out: SlotResult[] = [];
  const t0 = tokens[pos];
  if (t0 === undefined) return out;
  const base: { end: number; v: number; dec?: boolean }[] = [];
  const m = /^(\d{2,3})(?:\.(\d))?$/.exec(t0);
  if (m) {
    const v = Number(m[1]) + (m[2] ? Number(m[2]) / 10 : 0);
    base.push({ end: pos + 1, v, dec: !!m[2] });
    // "38,5" (a decimal comma) arrives as "38 5"
    if (!m[2] && /^\d$/.test(tokens[pos + 1] ?? "") && v >= 34 && v <= 43) base.push({ end: pos + 2, v: v + Number(tokens[pos + 1]) / 10, dec: true });
  } else {
    for (const r of readInt(tokens, pos)) if (r.words) base.push({ end: r.end, v: r.value });
  }
  const all = [...base];
  for (const b of base) {
    if (b.dec) continue;
    const n1 = tokens[b.end], n2 = tokens[b.end + 1] ?? "";
    const d = /^\d$/.test(n2) ? Number(n2) : DIG[n2];
    if ((n1 === "punto" || n1 === "coma") && d !== undefined) all.push({ end: b.end + 2, v: b.v + d / 10, dec: true });
    if (n1 === "y" && n2 === "medio") all.push({ end: b.end + 2, v: b.v + 0.5, dec: true });
  }
  for (const b of all) {
    const v = tenths(b.v) / 10;
    if (v < 30 || v > 115) continue;
    out.push({ end: b.end, value: { v, unit: null }, cost: 0.05 });
    let i = b.end;
    if (tokens[i] === "grados" || tokens[i] === "grado") { i++; out.push({ end: i, value: { v, unit: null } }); }
    const u = tokens[i];
    if (u === "celsius" || u === "centigrados" || u === "c") out.push({ end: i + 1, value: { v, unit: "c" } });
    else if (u === "fahrenheit" || u === "farenheit" || u === "f") out.push({ end: i + 1, value: { v, unit: "f" } });
  }
  return out;
};

/** Numeric dates of birth: Mexico writes the day first ("04/06/1980" = June 4th); "06/24/1980" (US order) is read too. */
const numDate: SlotFn = (tokens, pos) => {
  const [a, b, y] = [tokens[pos], tokens[pos + 1], tokens[pos + 2]];
  if (![a, b, y].every((x) => x !== undefined && /^\d+$/.test(x))) return [];
  const [n1, n2, n3] = [+a, +b, +y];
  const year = n3 < 100 ? (n3 > 30 ? 1900 + n3 : 2000 + n3) : n3;
  if (year < 1900 || year > 2025) return [];
  if (n2 >= 1 && n2 <= 12 && n1 >= 1 && n1 <= 31) return [{ end: pos + 3, value: { day: n1, month: n2, year } }];
  if (n1 >= 1 && n1 <= 12 && n2 >= 13 && n2 <= 31) return [{ end: pos + 3, value: { day: n2, month: n1, year }, tags: ["tip:mx_date"] }];
  return [];
};

/** "Junio 4 de 1980", "junio cuatro": an American learner's month-first order is read too, with the tip on Mexico's. */
const MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const usDate: SlotFn = (tokens, pos) => {
  const m = tokens[pos] === "setiembre" ? 9 : MONTHS_ES.indexOf(tokens[pos] ?? "") + 1;
  if (!m) return [];
  return readInt(tokens, pos + 1).filter((r) => r.value >= 1 && r.value <= 31).map((r) => ({ end: r.end, value: { day: r.value, month: m }, tags: ["tip:mx_date"] }));
};

// ---------------------------------------------------------------------------
// State helpers

const syms = (c: Ctx) => c.s.syms as string[];
const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const dx = (c: Ctx): Dx | undefined => c.s.dx;
const kind = (c: Ctx): Kind | undefined => (c.s.dx ? KIND[c.s.dx as Dx] : undefined);
const feverDone = (c: Ctx) => c.s.fever === false || c.s.temp !== undefined;
const questionsDone = (c: Ctx) => c.s.days !== undefined && feverDone(c) && !!c.s.meds && (!c.s.askScale || !painful(c) || c.s.scale !== undefined);
const painful = (c: Ctx) => syms(c).some((s) => PAINFUL.has(s));
const dobSkipped = (c: Ctx) => !c.s.dob && (syms(c).length > 0 || (c.s.dobAsks ?? 0) >= 3);

function diagnose(c: Ctx): Dx {
  const s = syms(c);
  const has = (x: string) => s.includes(x);
  const only = (ids: string[]) => s.length > 0 && s.every((x) => ids.includes(x));
  const coldish = has("cough") || has("runny_nose") || has("stuffy_nose") || has("cold") || has("flu");
  if (has("earache")) return "ear";
  if (has("sore_throat") && !coldish) return "throat";
  if (has("stomachache") && !coldish && !has("sore_throat")) return "stomach";
  if (has("back_pain") && only(["back_pain", "aches", "fatigue"])) return "back";
  if (has("headache") && only(["headache", "dizzy", "fatigue"]) && c.s.fever !== true) return "tension";
  return "virus";
}

function daysFromTags(tags: string[], slots: any): number | undefined {
  for (const tg of tags) { const m = tg.match(/^d(\d+)$/); if (m) return Number(m[1]); }
  if (tags.includes("dday")) return 3;
  const n = typeof slots?.n === "number" ? slots.n : undefined;
  if (n !== undefined) {
    if (tags.includes("unit_w")) return n * 7;
    if (tags.includes("unit_h")) return 0;
    if (tags.includes("unit_m")) return n * 30;
    return n;
  }
  return undefined;
}

/** One reply per kind of thing in a learner turn (the engine gives each turn its own context object). */
const TURN = new WeakMap<object, Set<string>>();
function firstThisTurn(c: Ctx, key: string): boolean {
  let seen = TURN.get(c);
  if (!seen) TURN.set(c, (seen = new Set()));
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}

function sorry(c: Ctx) {
  if (c.s.sorrySaid) return;
  c.s.sorrySaid = true;
  c.say("sorry_sym");
}

/** Symptoms the learner mentioned (entity ids), plus how long and the temperature if said together. */
function addSyms(c: Ctx, list: string[], slots: any, tags: string[]) {
  const before = syms(c).length;
  for (const s of list) {
    if (!syms(c).includes(s)) syms(c).push(s);
    c.s.neg = (c.s.neg as string[]).filter((x) => x !== s);
  }
  if (list.includes("fever") && c.s.fever !== true) c.s.fever = true;
  // which ear ("el oído izquierdo", "los dos oídos"): the exam finding keeps that side
  const side = tags.includes("side_left") ? "left" : tags.includes("side_right") ? "right" : tags.includes("side_both") ? "both" : undefined;
  if (side && list.includes("earache")) c.s.earSide = side;
  if (syms(c).length > before) {
    if (!c.s.sorrySaid) { sorry(c); firstThisTurn(c, "ack"); }
    else if (firstThisTurn(c, "ack")) c.say("sym_ack");
    if (c.s.examDone && firstThisTurn(c, "late")) c.say("late_sym");
  } else if (list.length && firstThisTurn(c, "ack")) c.say("sym_ack");
  if (c.step === "more_sym" || syms(c).length > 1) c.s.moreDone = true;
  const d = daysFromTags(tags, slots);
  if (d !== undefined && c.s.days === undefined) setDays(c, d, true);
  if (slots?.temp) setTemp(c, slots.temp);
}

function symsFrom(slots: any, tags: string[]): string[] {
  const out: string[] = [];
  const push = (x: any) => { if (typeof x === "string" && !out.includes(x)) out.push(x); };
  for (const x of toArr(slots?.syms?.symptom)) push(x);
  for (const x of toArr(slots?.symptom)) push(x);
  for (const x of toArr(slots?.part)) push(x);
  for (const x of toArr(slots?.part2)) push(x);
  for (const tg of tags) if (tg.startsWith("s_")) push(tg.slice(2));
  return out;
}

function setDays(c: Ctx, d: number, quiet = false) {
  c.s.days = d;
  if (quiet) return;
  if (d >= 7) c.say("days_long");
  else if (d <= 1) c.say("days_short");
  else c.say("sym_ack");
}

/** A temperature the learner said: a Fahrenheit value is converted to Celsius, kindly. */
function setTemp(c: Ctx, tv: { v: number; unit: "c" | "f" | null }) {
  if (!firstThisTurn(c, "temp")) return;
  const v = tv.v;
  const scale = tv.unit ?? (v <= 45 ? "c" : v >= 90 ? "f" : null);
  const cel = scale === "f" ? toC(v) : v;
  // a body temperature: 35–43 °C (95–109 °F); 34 is no "normal", and the Celsius she says stays in its domain
  const ok = scale !== null && roundC(cel) >= 35 && roundC(cel) <= 43;
  if (!ok) {
    if (c.s.temp === undefined) { c.s.temp = "check"; if (c.s.fever === undefined) c.s.fever = true; }
    c.say("temp_weird");
    return;
  }
  if (scale === "f") { c.say("f_echo", { tf: tempVal(v) }); c.say("f_conv", { tc: tempVal(roundC(cel)) }); }
  c.s.temp = { c: Math.round(cel * 10) / 10, f: scale === "f" ? v : undefined };
  c.s.fever = cel >= 37.5;
  // A normal reading ("36.8") after "Tengo fiebre": the learner still feels feverish, so the complaint stays;
  // when it was the only one, she asks about other symptoms (never the opening question again).
  if (!c.s.fever && syms(c).length === 1 && syms(c)[0] === "fever" && !c.s.moreDone && !c.s.examDone) c.s.askMore = true;
  assess(c, cel);
}

function assess(c: Ctx, cel: number) {
  if (cel < 37.5) c.say("temp_normal");
  else if (cel < 38) c.say("temp_slight");
  else if (cel < 39.5) c.say("temp_fever");
  else c.say("temp_high");
}

/** An allergy already named stays: "…, a nada más" / "No tengo otras alergias" (#others) keep it, and a "none" never
 *  undoes one named in the same answer ("Solo a la penicilina, a nada más": the pieces may come in either order). */
function allergyKept(c: Ctx, a: string, tags: string[]): boolean {
  const sameTurn = !firstThisTurn(c, "allergy");
  const named = !!c.s.allergy && c.s.allergy !== "none";
  if (!named || !(tags.includes("others") || (a === "none" && sameTurn))) return false;
  if (!sameTurn) okOnce(c);
  return true;
}

function setAllergy(c: Ctx, tags: string[]) {
  const a = tags.includes("neg") ? "none" : tags.includes("pen") ? "pen" : tags.includes("unsure") ? "unsure" : tags.includes("other") || tags.includes("nsaid") ? "other" : "none";
  if (allergyKept(c, a, tags)) return;
  c.s.allergy = a;
  if (!c.s.examDone) { c.say(a === "none" ? "allergy_none_ok" : "meds_other_ok"); return; }
  if (a === "pen" && kind(c) === "ab") {
    c.twist("penicillin");
    c.say(c.step === "allergy" && c.s.chartAsked ? "ok_plain" : "allergy_pen_ab");
    if (c.s.introSaid) { c.say("rx_intro_ab_alt"); c.s.altSaid = true; }
    return;
  }
  if (a === "unsure") { c.say("allergy_unsure"); return; }
  if (a === "none") { c.say("allergy_none_ok"); return; }
  c.say("allergy_ok_other");
}

function medsFrom(tags: string[]): string {
  if (tags.includes("none")) return "none";
  if (tags.includes("antib")) return "antib";
  if (tags.includes("home")) return "home";
  if (tags.some((x) => ["ibu", "para", "cough", "stom", "nose", "otc"].includes(x))) return "otc";
  return "other";
}

function setMeds(c: Ctx, tags: string[]) {
  const m = medsFrom(tags);
  const first = !c.s.meds;
  c.s.meds = m;
  if (!first && m === "none") return;
  if (m === "none") c.say("ok_plain");
  else if (m === "otc") c.say("meds_pain_ok");
  else if (m === "home") c.say("meds_home_ok");
  else if (m === "antib") c.say("meds_ab");
  else c.say("meds_other_ok");
}

// ---------------------------------------------------------------------------
// "¿Algo más? ¿Fiebre, tos?": the examples are symptoms the learner hasn't named or denied.

const MORE_EX: [string, string[], string[], string][] = [
  // id, Spanish units, English glosses, natural English
  ["fever", ["fiebre"], ["fever"], "a fever"],
  ["cough", ["tos"], ["cough"], "a cough"],
  ["headache", ["dolor", "de", "cabeza"], ["pain", "of", "head"], "a headache"],
  ["sore_throat", ["dolor", "de", "garganta"], ["pain", "of", "throat"], "a sore throat"],
];
const capFirst = (x: string) => x.replace(/\p{L}/u, (ch) => ch.toUpperCase());
function moreExampleLines(): Record<string, SentSrc[]> {
  const out: Record<string, SentSrc[]> = {};
  MORE_EX.forEach(([a, esA, enA, natA], i) => MORE_EX.slice(i + 1).forEach(([b, esB, enB, natB]) => {
    const es = ["¿Algo", "más?", ...esA.map((w, k) => (k === 0 ? "¿" + capFirst(w) : w)).map((w, k, arr) => (k === arr.length - 1 ? w + "," : w)),
      ...esB.map((w, k, arr) => (k === arr.length - 1 ? w + "?" : w))];
    const en = ["Something", "more?", ...enA.map((w, k) => (k === 0 ? capFirst(w) : w)).map((w, k, arr) => (k === arr.length - 1 ? w + "," : w)),
      ...enB.map((w, k, arr) => (k === arr.length - 1 ? w + "?" : w))];
    out[`more_ex_${a}_${b}`] = [t(es.join(" | "), en.join(" | "), `Anything else? ${capFirst(natA)}, ${natB}?`)];
  }));
  return out;
}
function askMoreSym(c: Ctx) {
  const said = new Set([...syms(c), ...(c.s.neg as string[])]);
  const ex = MORE_EX.map((x) => x[0]).filter((id) => !said.has(id));
  if (ex.length >= 2 && c.chance(0.6)) c.say(`more_ex_${ex[0]}_${ex[1]}`);
  else c.say("ask_more_sym");
}

/** Sim answers without the opening question's: a sim then fails if the opening question comes back. */
const noOpening = (a: Record<string, string>) => Object.fromEntries(Object.entries(a).filter(([k]) => k !== "problem" && k !== "sick_q"));

// Automatic answers the simulation gives when Doctora Herrera asks one of her optional questions.
const AUTO: Record<string, string> = {
  dob: "El 4 de junio de 1980", feeling: "No muy bien", sick_q: "Me duele la garganta", problem: "Me duele la garganta",
  more_sym: "No, nada más", howlong: "Desde el lunes", scale: "Como un seis", fever: "Sí, como de 38 grados",
  meds: "No, nada", meds_what: "Solo ibuprofeno", sleeve: "Claro", breath: "Ok", ah: "Aaa", hurt: "Un poco",
  allergy: "No, no tengo alergias", chart: "Sí, es correcto", allergy_which: "A la penicilina",
  rx_q: "No, todo claro, gracias", pharmacy: "Sí, la Farmacia del Puerto", note: "Sí, por favor", questions: "No, ninguna",
  pay: "Con tarjeta",
};

const FLAG_LOLA = "lo/la: “you” (usted), for a man or a woman.";
const FLAG_YOUR = (es: string, en: string) => `${es}: Spanish says “the ${en}” where English says “your”.`;
const FLAG_NOTE = "justificante = a doctor's note (for work or school).";

const TIPS: Record<string, Tip> = {
  tu_staff: { key: "tu_staff", lt: "Understood! With the doctor, usted is more polite: “¿Puede…?”, “¿Me da…?” (puedes / dame is for friends).", better: "¿Me puede dar un justificante?" },
  constipado: { key: "constipado", lt: "Understood! Careful: in Mexico “estoy constipado” means constipated. For a cold, say “tengo gripa” or “estoy resfriado”.", better: "Tengo gripa." },
  mx_date: { key: "mx_date", lt: "Understood! In Mexico dates go day first: 4/6/1980 is June 4th.", better: "El 4 de junio de 1980." },
};

// ---------------------------------------------------------------------------

export const doctor: SituationDef = {
  id: "s31-doctor",
  song: 31,
  songTitle: "Take a Deep Breath",
  title: { en: "Respire hondo", lt: "Take a deep breath" },
  topic: { en: "En el consultorio", lt: "At the doctor's" },
  chapter: 7,
  order: 3,
  location: "clinic",
  npc: "carter",
  goal: "Tell the doctor what's wrong, answer her questions, do what she asks during the exam, find out how to take the medicine, and pay for the visit.",
  intro: "Clínica Familiar, downtown. You've checked in at the front desk; now Doctora Herrera sees you in her office. Say what's wrong, answer her questions and follow her instructions during the exam. It's a private clinic: you pay for the visit at the end (in pesos). Temperatures here are in Celsius.",
  entities: { symptom: SYMPTOMS },

  merges: {
    "por aquí": { reason: "lexical_expression", split: "por → through + aquí → here; ¿Qué lo trae por aquí? = what brings you here / in.", minimal: "Two words." },
    "voy a": { reason: "grammatical_fusion", split: "voy → I go + a → to; ir a + infinitive = the near future (I'm going to).", minimal: "Two words; the verb stays outside." },
    "va a": { reason: "grammatical_fusion", split: "va → goes + a → to; ir a + infinitive = the near future (you're / it's going to).", minimal: "Two words; the verb stays outside." },
    "vamos a": { reason: "grammatical_fusion", split: "vamos → we go + a → to; vamos a + infinitive = let's / we're going to.", minimal: "Two words; the verb stays outside." },
    "qué tan": { reason: "lexical_expression", split: "qué → what + tan → so; ¿qué tan fuerte? = how strong (Latin America).", minimal: "Two words." },
    "más o menos": { reason: "lexical_expression", split: "más → more + o → or + menos → less; = roughly / about.", minimal: "Three words." },
    "un poco": { reason: "lexical_expression", split: "un → a + poco → little; together = a little / a bit.", minimal: "Two words." },
    "antes de": { reason: "lexical_expression", split: "antes → before + de → of; the preposition = before.", minimal: "Two words." },
    "después de": { reason: "lexical_expression", split: "después → after + de → of; the preposition = after.", minimal: "Two words." },
    "detrás de": { reason: "lexical_expression", split: "detrás → behind + de → of; the preposition = behind.", minimal: "Two words." },
    "para que": { reason: "lexical_expression", split: "para → for + que → that; the conjunction = so that.", minimal: "Two words." },
    "lo mismo": { reason: "lexical_expression", split: "lo → it + mismo → same; = the same (thing).", minimal: "Two words." },
    "de inmediato": { reason: "lexical_expression", split: "de → of + inmediato → immediate; = right away.", minimal: "Two words." },
    "en un momento": { reason: "lexical_expression", split: "en → in + un → a + momento → moment; = in a moment.", minimal: "Three words." },
    "de vacaciones": { reason: "lexical_expression", split: "de → of + vacaciones → vacation; estar de vacaciones = to be on vacation.", minimal: "Two words." },
    "la verdad": { reason: "lexical_expression", split: "la → the + verdad → truth; as a tag = to be honest.", minimal: "Two words." },
    "farmacia del puerto": { reason: "lexical_expression", split: "farmacia → pharmacy + del → of the + puerto → port would translate a shop's proper name.", minimal: "A proper name." },
    "me siento": { reason: "grammatical_fusion", split: "me → myself + siento → I feel; sentirse (reflexive) = I feel.", minimal: "Two words." },
    "no me la tomé": { reason: "grammatical_fusion", split: "no → not + me → for myself + la → it + tomé → I took; = I didn't take it (S-NEG with two pronouns).", minimal: "Four words, one verb phrase." },
    "por dentro": { reason: "lexical_expression", split: "por → through + dentro → inside; = on the inside.", minimal: "Two words." },
  },

  grammar: {
    macros: {
      badly: "(fuerte | muy fuerte | horrible | terrible | leve | ligero | ligera | alta | muy alta | insoportable | tremendo | tremenda)",
      sym_np: "[un | una | mucho | mucha | un poco de | algo de | bastante | un poquito de] {symptom} [@badly]",
      have_pre: "(tengo | traigo | ando con | estoy con | creo que tengo | me dio | me pego | me agarro | tambien tengo | y tengo | ademas tengo | he tenido | tuve | tenia | he estado con | me esta dando | creo que me esta dando)",
      duele: "(me duele | me duelen | me esta doliendo | me anda doliendo | me ha dolido | me dolio)",
      dur_amount: "[como | unos | unas | mas o menos | casi | ya | apenas | solo] ({n:number} o {n2:number} (dias #unit_d | semanas #unit_w) | {n:number} (dias #unit_d | dia #unit_d | semanas #unit_w | semana #unit_w | horas #unit_h | meses #unit_m | mes #unit_m) | un dia #d1 | una semana #d7 | un par de dias #d2 | unos dias #d3 | unos cuantos dias #d3 | varios dias #d4 | un mes #d30 | dos semanas #d14 | una semana y media #d10 | unas horas #d0 | unas cuantas horas #d0 | un par de horas #d0 | unas pocas horas #d0 | pocas horas #d0)",
      dur_since: "(desde (ayer #d1 | anoche #d1 | antier #d2 | antenoche #d2 | antes de ayer #d2 | hoy #d0 | esta manana #d0 | hoy en la manana #d0 | en la manana #d0 | la manana #d0 | el fin de semana #d3 | la semana pasada #d7 | el mes pasado #d30 | el {day} #dday | ayer en la noche #d1 | ayer en la manana #d1 | ayer en la tarde #d1 | hace @dur_amount) | hace @dur_amount)",
      dur_tail: "(@dur_since | (por | durante) @dur_amount)",
      when_tail: "(esta manana | anoche | ayer | hoy | en la manana | en la noche | ayer en la noche | en la tarde | antes de venir | en la casa | en el hotel | hace un rato)",
      otc: "(ibuprofeno #ibu | un ibuprofeno #ibu | advil #ibu | aspirina #ibu | una aspirina #ibu | naproxeno #ibu | diclofenaco #ibu | un analgesico #ibu | analgesicos #ibu | pastillas para el dolor #ibu | una pastilla para el dolor #ibu | paracetamol #para | un paracetamol #para | tempra #para | tylenol #para | acetaminofen #para | panadol #para | un antigripal #nose | antigripal #nose | antigripales #nose | loratadina #nose | jarabe #cough | un jarabe #cough | jarabe para la tos #cough | pastillas para la garganta #cough | pastillas para la tos #cough | sal de uvas #stom | pepto #stom | pepto bismol #stom | suero #stom | suero oral #stom | un suero #stom | antiacido #stom | un antiacido #stom | algo para el dolor #ibu | algo para la fiebre #para)",
      home: "(un te #home | te #home | un tecito #home | te con miel #home | un te con miel #home | miel con limon #home | limon con miel #home | caldo de pollo #home | un caldo de pollo #home | vitamina c #home | vitaminas #home | remedios caseros #home | un remedio casero #home | te de jengibre #home | agua con limon #home)",
      it_med: "(lo | la | los | las | esto | eso | el medicamento | las pastillas | la medicina | el antibiotico | las capsulas)",
      allergen: "(la penicilina #pen | penicilina #pen | la amoxicilina #pen | amoxicilina #pen | la aspirina #nsaid | aspirina #nsaid | el ibuprofeno #nsaid | ibuprofeno #nsaid | los antiinflamatorios #nsaid | las sulfas #other | sulfas #other | la codeina #other | el latex #other | los mariscos #other | las nueces #other | el polen #other | los cacahuates #other | el paracetamol #other | los antibioticos #other)",
      ahs: "(a | aa | aaa | aaaa | aaaaa | aaaaaa | ah | ahh | ahhh | ahhhh | aah | aaah | aaaah | aaaaah | haa | haaa)",
      alcohol: "(alcohol | cerveza | una cerveza | unas cervezas | vino | una copa | tequila | mezcal | una chela | chelas | un trago | una copita | bebidas alcoholicas)",
      note_n: "(justificante | un justificante | justificante medico | un justificante medico | constancia | una constancia | constancia medica | una constancia medica | certificado medico | un certificado medico | nota medica | una nota medica | incapacidad | una incapacidad | un papel para el trabajo | una nota para el trabajo | la baja | un justificante para el trabajo)",
    },
    slots: {
      temp: { fn: tempSlot },
      numdate: { fn: numDate },
      usdate: { fn: usDate },
      syms: { pattern: "@sym_np [(y | y tambien | con | y un poco de | y mucha | y mucho | ademas de) @sym_np] [[y] @sym_np]" },
      part: { lexicon: [
        { id: "sore_throat", forms: ["la garganta", "garganta", "mi garganta", "las anginas"] },
        { id: "headache", forms: ["la cabeza", "cabeza", "mi cabeza", "la frente", "la cabesa"] },
        { id: "stomachache", forms: ["el estomago", "estomago", "mi estomago", "la panza", "panza", "la barriga", "barriga", "la pancita", "el vientre", "el abdomen", "la tripa"] },
        { id: "earache", forms: ["el oido", "oido", "mi oido", "la oreja", "oreja"] },
        { id: "earache", forms: ["el oido izquierdo", "oido izquierdo", "la oreja izquierda", "mi oido izquierdo"], tags: ["side_left"] },
        { id: "earache", forms: ["el oido derecho", "oido derecho", "la oreja derecha", "mi oido derecho"], tags: ["side_right"] },
        { id: "earache", forms: ["los oidos", "los dos oidos", "ambos oidos", "las orejas", "oidos", "las dos orejas"], tags: ["side_both"] },
        { id: "cough", forms: ["el pecho", "pecho", "mi pecho"] },
        { id: "back_pain", forms: ["la espalda", "espalda", "mi espalda", "la espalda baja", "la cintura", "la parte baja de la espalda", "la columna"] },
        { id: "aches", forms: ["todo el cuerpo", "el cuerpo", "cuerpo", "los huesos", "los musculos", "las articulaciones", "todo"] },
      ] },
    },
  },

  intents: {
    // --- what's wrong -----------------------------------------------------------------------
    symptom: { patterns: [
      "@have_pre {syms} [@dur_tail] #h:have",
      "@have_pre [un poco de | mucha | algo de]? (fiebre | temperatura | calentura) (de | como de | como | de como | casi de | mas de)? {temp} [@when_tail] [@dur_tail] #s_fever",
      "[si] (tengo | tuve | he tenido | tenia) [un poco de | mucha | algo de] (fiebre | calentura | temperatura) [@when_tail] #s_fever #h:fever_yes",
      "@duele [mucho | un poco | bastante]? {part} [mucho | un poco | bastante | muchisimo] [@dur_tail] #h:body_hurts",
      "@duele {part} y {part2:part} [@dur_tail]",
      "(tengo | traigo | siento) [un]? dolor [muy]? [fuerte]? en {part} [@dur_tail]",
      "me (duele | arde) [la garganta | mucho] (al | cuando) (tragar | trago | como | hablo | paso saliva | paso la comida) [@dur_tail] #s_sore_throat #h:swallow",
      "no puedo (tragar | comer | hablar) [bien | nada] [por la garganta] #s_sore_throat",
      "(me arde | me pica | me raspa) la garganta [@dur_tail] #s_sore_throat", "(tengo | traigo | siento) la garganta (rasposa | irritada | inflamada) [@dur_tail] #s_sore_throat",
      "(estoy | ando | me siento | me he sentido | me siento muy) [muy | un poco | bien | algo]? (mareado | mareada) [@dur_tail] #s_dizzy #h:dizzy",
      "(me mareo | me dan mareos | me da mareo | tengo mareos | todo me da vueltas | me da vueltas la cabeza) [@dur_tail] #s_dizzy",
      "(estoy | ando | me siento | me he sentido) [muy | super | bien | un poco | algo | demasiado]? (cansado | cansada | agotado | agotada | debil | sin energia) [todo el tiempo | todo el dia | siempre] [@dur_tail] #s_fatigue #h:tired",
      "no tengo (energia | fuerzas) [para nada] #s_fatigue",
      "(no puedo dejar de | no paro de) toser [@dur_tail] #s_cough #h:coughing",
      "(toso | estoy tosiendo | ando tosiendo) [mucho | toda la noche | todo el tiempo | todo el dia | en la noche] [@dur_tail] #s_cough",
      "no puedo dormir (por la tos #s_cough | por el dolor | por el dolor de garganta #s_sore_throat)",
      "me (lastimé | lastime | torcí | torci | jalé | jale) (la espalda | la cintura) [cargando algo | en la playa] [@dur_tail] #s_back_pain",
      "[ya] (no tengo | no tuve) {neg:symptom} pero @duele {part} [@dur_tail]",
      "[ya] (no tengo | no tuve) {neg:symptom} pero @have_pre {syms} [@dur_tail]",
      "[ya] (no tengo | no tuve) {neg:symptom} pero [si] (tengo)? {syms} [si] [@dur_tail]",
      // "No, fiebre no, pero tos sí": the second item is what she has (rule 10)
      "[no] {neg:symptom} no [pero] {syms} si [@dur_tail]",
      "me (escurre | gotea | moquea) la nariz [@dur_tail] #s_runny_nose #h:nose",
      "(estornudo | estoy estornudando) [mucho] [@dur_tail] #s_runny_nose",
      "(tengo | traigo) la nariz (tapada | congestionada) [@dur_tail] #s_stuffy_nose #h:nose_stuffy",
      "(me pican | me lloran) los ojos [y (estornudo | estoy estornudando) mucho] [@dur_tail] #s_runny_nose", "(tengo | traigo) alergia [@dur_tail] #s_runny_nose",
      "{part} me (duele | duelen | esta doliendo) [mucho | un poco | bastante] [@dur_tail]",
      "no puedo respirar por la nariz #s_stuffy_nose",
      "(tengo | siento) (escalofrios | calor y frio) [@dur_tail] #s_fever",
      "(me siento | estoy | ando) (caliente | afiebrado | afiebrada | con calentura | con fiebre | calenturiento | calenturienta) [@dur_tail] #s_fever",
      "(vomité | he vomitado | estoy vomitando | tengo ganas de vomitar | tengo nauseas | tengo diarrea | estoy mal del estomago | ando mal del estomago | voy mucho al bano) [@when_tail] [@dur_tail] #s_stomachache",
      "(algo me cayó mal | me cayó mal la comida | me cayó mal algo | comí algo que me cayó mal | creo que comí algo malo) [@when_tail] #s_stomachache",
      "(tengo | traigo) el cuerpo cortado [@dur_tail] #s_aches", "(tengo | traigo) el estomago (revuelto | suelto) [@dur_tail] #s_stomachache",
      "(estoy | ando) (resfriado | resfriada | engripado | engripada | agripado | agripada) [@dur_tail] #s_cold",
      "(estoy | ando) (constipado | constipada) [@dur_tail] #s_cold #tip:constipado",
      "(creo que)? (me esta dando | me va a dar | me agarro | me dio | me pego) {syms}",
    ] },
    // "Dolor de garganta." / "Tos y fiebre." as the answer to "¿Qué le pasa?"
    symptom_ctx: { patterns: ["[solo | nada mas | sobre todo | mas que nada] {syms} [@dur_tail]", "(fiebre | temperatura | calentura) [de | como de] {temp} [@when_tail] [@dur_tail] #s_fever",
      "[la | el | mi] {part} [@dur_tail]", "[la | el | mi] {part} y [la | el | mi] {part2:part}"] },
    sym_neg: { patterns: [
      "[ya] (no tengo | no he tenido | no tuve | no creo que tenga | no traigo) [ni] [@badly]? {symptom} [@badly]",
      "(no | ni) {symptom} [no]", "{symptom} no [tengo]", "sin {symptom}",
      "no me duele {part}", "{part} no me duele", "ya no me duele {part}", "no me (duele | duelen) ni {part} ni {part2:part}",
      "no (estoy | me siento | ando) (mareado #s_dizzy | mareada #s_dizzy | cansado #s_fatigue | cansada #s_fatigue)",
      "no (toso | estoy tosiendo) #s_cough", "no (me siento | siento) (caliente | afiebrado | afiebrada) #s_fever", "no creo que tenga (fiebre | calentura) #s_fever",
    ] },
    // "No, nada más." / "Solo la garganta." to "¿Algún otro síntoma?"
    sym_none: { patterns: ["[no] no tengo (ningun | otro | ningun otro) sintoma #h:no_other", "[no] (solo | nada mas | nomas) (eso | lo que le dije | la garganta | el dolor)",
      "[no] (eso es todo | es todo | nada mas eso | ningun otro sintoma | nada mas que eso)"] },
    // bare "Nada" / "Ninguno" only after "¿Algún otro síntoma?"
    sym_none_ctx: { patterns: ["[no] (nada | nada mas | ninguno | ninguno mas | nada nada | solo eso | eso)", "[no] no (nada | ninguno)", "[no] (es | eso es) todo lo que tengo"] },
    feel_sick: { patterns: [
      "(me siento | estoy | ando | me he sentido) [muy | bien | un poco | bastante | super]? (mal | enfermo | enferma | fatal | malito | malita | pesimo | pesima | terrible | horrible)",
      "no me siento [muy | tan]? bien #h:feel_sick", "no me he sentido bien", "no me siento nada bien",
      "(creo que)? me (estoy enfermando | enferme | enfermé | voy a enfermar)", "(algo me pasa | no se que tengo | no se que me pasa)",
    ] },
    help_me: { patterns: ["(me | le) (puede | podria) ayudar", "(tengo | traigo) (un)? problema [doctora]", "(necesito | ocupo) [su]? ayuda", "(tengo | traigo) una (pregunta | duda)",
      "[si] (una | otra) (pregunta | duda) [mas]", "[si] (le puedo | puedo) (hacer una pregunta | preguntar algo | preguntarle algo)", "[si] (nada mas | solo) una (pregunta | cosa)"] },
    // "Fatal." / "No muy bien, la verdad." to "¿Cómo se siente hoy?"
    feel_bad_ctx: { patterns: ["[pues]? [muy | bastante]? (mal | fatal | terrible | horrible | pesimo | no muy bien | no tan bien | enfermo | enferma | malito | malita | regular) [la verdad | doctora] #h:feel_bad"] },
    nice_meet: { patterns: ["(mucho gusto | encantado | encantada | un placer | el gusto es mio) [doctora]", "igualmente [doctora]"] },

    // --- how long, pain scale -------------------------------------------------------------
    howlong_ans: { patterns: [
      "@dur_since #h:since",
      "@dur_amount [ya | mas o menos | mas o menos ya]",
      "(llevo | ya llevo | tengo | ya tengo | ando) @dur_amount [asi | con esto | con eso | con (el dolor | la tos | la fiebre | {symptom})]",
      "(empezó | comenzó | me empezó | me comenzó | me dio | empecé) (ayer #d1 | anoche #d1 | antier #d2 | hoy #d0 | esta manana #d0 | en la manana #d0 | el fin de semana #d3 | la semana pasada #d7 | el {day} #dday | hace @dur_amount)",
      "(empezó | comenzó | me empezó | me dio) @dur_since",
      "(empezó | comenzó | me empezó | me comenzó | me dio | empecé) (ayer #d1 | anoche #d1 | hoy #d0 | antier #d2) en la (manana | noche | tarde)",
      "(apenas | nada mas | solo) (hoy #d0 | desde hoy #d0 | desde ayer #d1 | ayer #d1 | desde anoche #d1 | anoche #d1)",
      "(hoy | ayer) en la (manana | noche | tarde) #d1",
      "(como | unos | mas o menos) (desde)? hace @dur_amount",
    ] },
    // a bare "Ayer" / "Anoche" only answers "¿Desde cuándo…?"
    howlong_ctx: { patterns: ["(ayer #d1 | anoche #d1 | hoy #d0 | esta manana #d0 | antier #d2 | el {day} #dday | el fin de semana #d3 | la semana pasada #d7)"] },
    scale_ctx: { patterns: [
      "[un | como un | mas o menos un | como | yo diria que un | diria que un | creo que un | un como | ya un | casi un] {n:number} [de diez | mas o menos | o mas] #h:scale",
      "(muy fuerte #sc8 | fuertisimo #sc9 | insoportable #sc10 | bastante fuerte #sc7 | fuerte #sc7 | regular #sc5 | mas o menos #sc5 | leve #sc2 | poquito #sc2 | no mucho #sc3 | un poco #sc3 | no tan fuerte #sc4 | horrible #sc9)",
      "(no mucho | no tan fuerte | poquito) [como]? un {n:number}", "(muy fuerte | bastante fuerte | fuerte) [como]? un {n:number}",
      "(entre | como entre) {n:number} y {n2:number}", "[un | como un | como] {n:number} (o | u) {n2:number}",
      "(es | esta) muy fuerte #sc8", "(es | esta) (fuerte | bastante fuerte) #sc7", "(es | esta) (fuerte | muy fuerte) [como]? un {n:number}", "no es (tan | muy)? fuerte #sc4",
      "no me duele (mucho | tanto) #sc3", "me duele (mucho | muchisimo | bastante) #sc8", "me duele (un poco | poquito) #sc3",
    ] },
    // --- the temperature ----------------------------------------------------------------------
    temp_ans: { patterns: [
      "[si] (tengo | tuve | tenia | traigo | traia) (fiebre | temperatura | calentura) (de | como de | de como | casi de | mas de)? {temp} [@when_tail] #h:temp",
      "[si] (tengo | tuve | tenia) {temp} (de fiebre | de temperatura | de calentura) [@when_tail]",
      "[si] [@when_tail] (tuve | tenia) (fiebre de)? [como | casi | mas de]? {temp} [@when_tail]",
      "[si] (me salió | me salio | marcó | me marcó | el termometro marcó | el termometro dijo | me dio) [como | casi | mas de]? {temp} [@when_tail]",
      "[si] (como | unos | mas o menos | casi | arriba de | mas de) {temp} [@when_tail]",
      "[si] [la fiebre]? (fue | es | era) de [como]? {temp} [@when_tail]",
    ] },
    // a bare "38" / "Treinta y ocho y medio" only answers the temperature question
    temp_ctx: { patterns: ["[si] [de] {temp} [@when_tail]", "[si] (tengo | tuve | tenia) {temp} [@when_tail]",
      // "No sé, como 38": a number after all (never "I'll take it myself" and the number in one breath)
      "(no se | no lo se | no se bien | no estoy seguro | no estoy segura) [pero] [creo que] [como | unos | mas o menos | casi | tal vez | quiza] {temp} [@when_tail]"] },
    fever_yes_ctx: { patterns: ["[si] [un poco | poquita | algo] [de]? (fiebre | calentura | temperatura)", "[si] (creo que si | me siento caliente | eso creo | un poco | poquita | algo)",
      "[si] (me la tomé | me la tome | me la medí | me la medi | la medí | si la medi)"] },
    temp_unknown: { patterns: [
      "no (me la tomé | me la tome | me la medí | me la medi | la medí | la medi | la tomé | me tomé la temperatura | me medí la temperatura | me la cheque | me la chequé | la revisé) #h:temp_unknown",
      "no (tengo | traigo) termometro", "no se (cuanto | de cuanto | cuanta) [fue | tengo | tenia]", "no la (medí | medi | tomé | revisé) [la verdad]",
      "no tengo (con que medirla | como medirla)",
    ] },
    temp_dunno_ctx: { patterns: ["(no lo se | no estoy seguro | no estoy segura | ni idea | no sabria decirle | no tengo idea) [la verdad]"] },

    // --- what the learner takes, allergies --------------------------------------------------
    meds_ans: { patterns: [
      "no (tomo | estoy tomando | he tomado | tomé | tome | me he tomado | me tomé | me tome) (nada | ningun medicamento | ninguna medicina | ninguna pastilla | ningun remedio) #none #h:meds_none",
      "[si] [solo | nada mas | nomas | solamente] (tomo | estoy tomando | tomé | tome | me tomé | me tome | he tomado | me he tomado | estuve tomando) [un poco de] @otc [y @otc] #h:meds_otc",
      "(solo | nada mas | nomas | solamente) @otc [y @otc]",
      "[si] [solo | nada mas] (tomo | estoy tomando | tomé | tome | me tomé | me tome | he tomado) @home",
      "(tomo | estoy tomando) (pastillas | algo | medicina | medicamento) para (la presion | la diabetes | el corazon | la tiroides | el colesterol | la depresion | dormir) #other",
      "[si] (tomo | estoy tomando | tomé | tome | me tomé | me tome | empecé) (un | unos)? (antibiotico | antibioticos) [que me dieron | sin receta]? #antib",
      "[si] (tomo | estoy tomando | tomé | me tomé) (amoxicilina | azitromicina | penicilina) #antib",
      "no (he tomado | tomé | tome) nada (todavia | aun)? #none",
      "no (tomo | estoy tomando | he tomado | tomé | me he tomado | me tomé) (nada | ningun medicamento | nada todavia) para (eso | la fiebre | el dolor | la tos | la garganta) #none",
      "no (tomo | estoy tomando | he tomado | tomé | me he tomado | me tomé) @otc #none",
    ] },
    meds_ctx: { patterns: ["@otc [y @otc]", "[solo | nada mas] @home", "(nada | ninguno | nada nada | ninguna) [todavia | aun | la verdad] #none", "(un | unos)? (antibiotico | antibioticos) #antib"] },
    allergy_ans: { patterns: [
      "no (soy | es) (alergico | alergica) a (nada | ningun medicamento | ninguno | ninguna medicina | ninguna) #none #h:allergy_none",
      "no (tengo | tiene) (alergias | ninguna alergia | alergia a nada | alergia a ningun medicamento | alergia) #none",
      "(que yo sepa no | no que yo sepa | creo que no) #none", "[no] no tengo ninguna alergia #none", "no soy (alergico | alergica) #none",
      "no (soy | es) (alergico | alergica) (a | al) @allergen #neg", "no (tengo | tiene) alergia (a | al) @allergen #neg", "[no] [a | al] @allergen no #neg",
      "[si] (soy | es) (alergico | alergica) (a | al) @allergen #h:allergy_pen", "[si] (tengo | tiene) alergia (a | al) @allergen", "me (hace | hacen | cae | caen) mal @allergen",
      "[no] (solo | nada mas | nomas | solamente) (a | al) @allergen", "[si] soy (alergico | alergica) [a] @allergen [y a @allergen]",
      // "No sé si soy alérgica a la penicilina": one answer, read as the allergy (the safe side)
      "no (se | estoy seguro | estoy segura) si (soy | sea) (alergico | alergica) (a | al) @allergen",
      // "…, no tengo otras alergias": keeps an allergy already named (#others; setAllergy)
      "[no] no (tengo | tiene) (otras alergias | otra alergia | ninguna otra alergia | ninguna otra) #others",
    ] },
    allergy_dunno_ctx: { patterns: ["(no lo se | no estoy seguro | no estoy segura | no me acuerdo | no recuerdo | ni idea | no sabria decirle | no tengo idea) [la verdad]"] },
    // "Sí, es correcto" / "No, eso no es cierto" only answer "En su expediente dice…, ¿es correcto?"
    chart_ctx: { patterns: ["[no] (eso)? no es (cierto | correcto | asi | verdad) #none", "[si] (es | eso es) (correcto | cierto | verdad) #pen", "(correcto | asi es | exacto | efectivamente) #pen",
      "[no] (eso)? (esta mal | es un error) #none"] },
    allergy_ctx: { patterns: ["[si] [solo | nada mas] [a | al] @allergen", "(a nada | a ninguno | a ninguna | ninguno | ninguna | nada) #none",
      // "Solo a la penicilina, a nada más": the "nothing else" piece keeps it (#others)
      "[y] (a nada mas | a ninguna otra | a ningun otro | ninguna otra | ningun otro | a nada mas que eso) #others"] },

    // --- the exam -----------------------------------------------------------------------------
    ready_ctx: { patterns: ["(listo | lista | ya | ya esta | ya estoy | ahi esta | ya quedo | ya me la subi | ya me la subí | ya la subi | ya esta arriba)"] },
    like_this_ctx: { patterns: ["(asi | asi esta bien | esta bien asi | asi le parece | asi doctora | lo estoy haciendo bien | lo hago bien | de esta forma | asi esta bien doctora | esta bien)"] },
    breath_ctx: { patterns: ["(hhh | hhhh | haaa | huuu | fff | ffff | uff | ya respiré | estoy respirando | inhalo y exhalo | respiro)"] },
    breath_hard: { patterns: [
      "me (cuesta | duele) (respirar | al respirar | respirar hondo) #h:breath_hard", "no puedo respirar [bien | hondo | profundo]", "me da tos (cuando respiro | al respirar)",
      "me duele el pecho [al respirar | cuando respiro]",
    ] },
    ah_ctx: { patterns: ["@ahs [@ahs] [@ahs] #h:ah"] },
    hurt_yes_ctx: { patterns: [
      "[ay | si] (me duele | duele | ahi me duele | ahi | ahi si | si ahi | si mucho | mucho | bastante | si bastante | me duele mucho | ahi me duele mucho) #h:hurt_yes",
      "(ay | auch | uy | ay ay) [si]", "si [me duele] (ahi | aqui)", "[si] (aqui | ahi) [me]? duele [mucho]",
    ] },
    hurt_little_ctx: { patterns: ["[si] (un poco | poquito | un poquito | tantito | algo | mas o menos | no mucho | no tanto | un poco nada mas | nomas un poco) #h:hurt_little"] },
    hurt_no_ctx: { patterns: ["(no | no me duele | ahi no | no ahi no | no duele | para nada | nada | no nada | no siento nada | no me duele nada | ahi no me duele | ya no me duele) #h:hurt_no"] },
    which_arm_ctx: { patterns: ["(cual | que) brazo #h:which_arm", "(el)? (izquierdo | derecho) o (el)? (izquierdo | derecho)", "cual (de los dos)?", "(este | ese) brazo", "(cual | que) manga"] },

    // --- the learner's questions ------------------------------------------------------------
    ask_serious: { patterns: ["(es | sera) (grave | serio | algo grave | algo serio | peligroso | malo | de cuidado) #h:q_serious", "(me | debo) preocupar", "(debo | tengo que) preocuparme",
      "(estoy | es) (muy)? grave", "no es grave [verdad | o si]", "es algo (grave | serio | de cuidado)"] },
    ask_contagious: { patterns: [
      "es contagioso #h:q_contagious", "es contagiosa", "no es contagioso [verdad | o si]", "(se | lo | la) (contagia | pega)", "(puedo | le puedo) (contagiar | pegar) (a)? (mi familia | mis hijos | mi esposa | mi esposo | alguien | otros | los demas | mi pareja | mis companeros)",
      "(se | les) (puede | puedo) pegar a (mi familia | alguien | los demas)", "(puedo | le puedo) contagiar [a alguien | a otros]",
    ] },
    ask_antibiotics: { patterns: ["(necesito | voy a necesitar | me va a dar | me va a recetar | hace falta | tengo que tomar | me da) (un)? (antibiotico | antibioticos) #h:q_ab",
      "(lleva | requiere | necesita) antibiotico", "no necesito antibiotico", "(con | sin) antibiotico"] },
    ask_what: { patterns: ["que (tengo | es | sera | podria ser | me pasa | tengo doctora) #h:q_what", "(es | sera) (un virus | una infeccion | gripa | gripe | influenza | covid | anginas | algo grave) #what",
      "(es | sera | no es | no sera) dengue #dengue", "(y)? si es dengue #dengue", "(puede | podria) ser dengue #dengue"] },
    ask_better: { patterns: ["cuando me voy a sentir mejor #h:q_better", "(cuanto tiempo | cuantos dias) (tarda | dura | voy a estar asi | tarda en quitarse | se tarda)", "cuando se me quita",
      "en cuanto tiempo me (alivio | recupero | compongo | siento mejor)", "cuando voy a estar mejor", "cuando me alivio"] },
    ask_work: { patterns: ["puedo (ir a trabajar | trabajar | regresar al trabajo | ir al trabajo | ir a la oficina) #h:q_work", "tengo que (quedarme en casa | descansar | faltar al trabajo)",
      "(puedo | debo) faltar al trabajo", "(puedo | debo) ir a la escuela"] },
    ask_note: { patterns: [
      "(me puede | me podria | puede | podria) (dar | hacer | firmar) @note_n [para el trabajo | para mi trabajo | para la escuela | para mi jefe] #h:q_note",
      "(necesito | ocupo | quisiera | me hace falta) @note_n [para el trabajo | para mi trabajo | para la escuela | para mi jefe]",
      "(me puedes | puedes) (dar | hacer) @note_n [para el trabajo] #tip:tu_staff", "(me da | me das #tip:tu_staff) @note_n [para el trabajo]",
    ] },
    ask_not_better: { patterns: ["(y si | que pasa si | que hago si) no (mejoro | se me quita | me alivio | funciona | me siento mejor | se quita) #h:q_not_better",
      "(y si | que pasa si | que hago si) (empeoro | me siento peor | sigo igual | me pongo peor)", "cuando (debo | tengo que) regresar", "(debo | tengo que | necesito) (regresar | volver) [a verla | a consulta | otra vez]"] },
    ask_eat: { patterns: ["que (puedo | debo) comer #h:q_eat", "(puedo | debo) comer (normal | de todo | picante | chile | lo que sea | mariscos | tacos)", "hay (algo | comida) que no (deba | debo | pueda | puedo) comer",
      "(que | algo) (no)? (puedo | debo) comer"] },
    ask_exercise: { patterns: ["puedo (hacer ejercicio | ir al gimnasio | correr | nadar | meterme al mar | ir a la playa | bucear | meterme al cenote | nadar en el cenote | hacer deporte | surfear) #h:q_exercise",
      "(se puede | esta bien) (hacer ejercicio | nadar | meterse al mar)"] },
    ask_cost: { patterns: [
      "cuanto (es | cuesta | sale | seria) [la consulta | la visita] #h:q_cost", "cuanto le debo", "cuanto (falta | le falta | me falta | le debo todavia) #left", "(acepta | aceptan | toman) [mi]? seguro #ins", "(tengo | traigo) seguro [de viaje | medico | de gastos medicos | internacional] #ins",
      "(donde | a quien | como) (pago | se paga | le pago)", "(se paga | le pago) (aqui | a usted | en recepcion)", "cuanto (es | cuesta) (la consulta | la visita)",
    ] },
    ask_dosage: { patterns: [
      "(cada cuanto | como | cuantas veces al dia) (me lo tomo | lo tomo | se toma | me la tomo | la tomo | tomo | me las tomo | las tomo) #h:q_dose", "cuantas (pastillas | capsulas | tabletas | al dia) [al dia | por dia]",
      "cada cuantas horas", "(cual es | que) la dosis", "como (se toma | me lo tomo | lo tomo)", "cuantas veces al dia",
    ] },
    ask_meals: { patterns: ["(antes | despues) o (antes | despues) de (comer | los alimentos) #h:q_meals", "(con | sin) (comida | alimentos)", "[@it_med] (me lo | lo | la | me la)? tomo (con comida | con el estomago lleno | en ayunas)",
      "(antes | despues) de (comer | los alimentos)", "(se toma | lo tomo) en ayunas"] },
    ask_duration: { patterns: ["(por | durante)? cuantos dias #h:q_how_long", "cuantos dias (tengo que | debo | hay que) (tomarlo | tomarla | tomarlos | tomarlas | tomar el antibiotico | tomar la medicina)", "(por | durante)? cuanto tiempo [lo | la | me lo | me la]? (tomo | tengo que tomar)", "hasta cuando [lo tomo]", "(por | durante) cuanto tiempo"] },
    ask_side: { patterns: ["(tiene | da | causa) (efectos secundarios | algun efecto secundario | reacciones | contraindicaciones) #h:q_side", "es seguro", "(es | esta) (muy)? fuerte (el medicamento | la medicina | el antibiotico | la pastilla | el tratamiento)", "(el medicamento | la medicina | el antibiotico | la pastilla) (es | esta) (muy)? (fuerte | seguro | segura)", "(me | le) (puede caer | cae) mal (al estomago)?"] },
    ask_alcohol: { patterns: ["(puedo | se puede) (tomar | beber) @alcohol [con (esto | eso | el medicamento | el antibiotico)] #h:q_alcohol", "me puedo tomar @alcohol", "(y)? el alcohol", "puedo tomar (con | si tomo) (esto | eso)"] },
    ask_drive: { patterns: ["(puedo | se puede) manejar [con (esto | eso)] #h:q_drive", "(da | me da | me va a dar | causa) sueno", "me va a dar sueno", "(puedo | se puede) manejar si (lo | la) tomo"] },
    clear_ctx: { patterns: [
      "[todo] (claro | muy claro | entendido | quedo claro | queda claro | quedo todo claro | todo bien) [gracias] #h:clear", "no (tengo)? (ninguna | mas)? (pregunta | preguntas | duda | dudas) [gracias] #h:no_q",
      "ninguna [gracias]", "(ya)? (entendi | entendi todo)", "no por ahora [gracias]", "no ninguna",
    ] },

    // --- the prescription, the note ---------------------------------------------------------
    pharmacy_ans: { patterns: [
      "[si] [en | a]? la farmacia del puerto #harbor #h:ph_name", "[si] (la del puerto | la de aqui | la que esta en el centro | la del centro | la de la esquina) #harbor",
      "[si] (conozco | se de) una [aqui]? cerca #harbor", "[si] (hay | conozco) una (cerca de mi hotel | cerca de mi casa | en mi hotel | junto a mi casa | en la esquina | aqui cerca | cerca del hotel | por mi casa) #other #h:ph_other",
      "(en | a)? cualquiera #any", "no se (donde | de ninguna | cual | donde hay una) #unknown", "[no] (donde hay | hay) una (farmacia)? (cerca | por aqui) #unknown #h:ph_new",
      "no conozco (ninguna | farmacias | ninguna farmacia) #unknown", "[no] [pero]? (conozco | se de) otra [farmacia] [cerca | aqui cerca | por mi casa] #other",
      "[si] (hay | conozco) una (al lado de mi casa | al lado del hotel | enfrente de mi hotel | enfrente de mi casa | a la vuelta | junto al hotel) #other", "[no] no soy de aqui #unknown", "[si] (ya se | si se) (donde) #harbor",
    ] },
    pharmacy_dunno_ctx: { patterns: ["(no lo se | ni idea | no estoy seguro | no estoy segura | no tengo idea) [soy nuevo | soy nueva | no soy de aqui | no conozco]", "no se [la verdad] (soy nuevo | soy nueva | no soy de aqui | no conozco) [aqui | el pueblo]", "(soy nuevo | soy nueva) (aqui | en el pueblo)"] },
    note_ctx: { patterns: ["[si] (para el trabajo | para mi trabajo | para mi jefe | para la escuela | para la empresa | para la oficina) #yes #h:note_yes",
      "no (necesito | ocupo | quiero) [el | un | ningun]? @note_n [gracias] #no",
      "[no] (estoy de vacaciones | trabajo desde casa | no trabajo | soy jubilado | soy jubilada | estoy jubilado | estoy jubilada | no lo necesito | no hace falta | no me hace falta | no gracias no lo necesito | trabajo en casa) #no #h:note_no"] },
    dob_ans: { patterns: ["[naci] {date} (de | del) {year} #h:dob", "[naci] {date} {year}", "{numdate}", "[naci] {date} del {yy:number}", "[naci] {date} de {yy:number}",
      "[naci] [el] {date:usdate} [de | del] {year}", "[naci] [el] {date:usdate} del {yy:number}"] },
    dob_ctx: { patterns: ["[naci] {date}", "[naci] [el] {date:usdate}"] },
    year_ctx: { patterns: ["[naci] [en | de | del] {year}", "del {yy:number}", "naci en el {yy:number}"] },

    // --- paying for the visit ---------------------------------------------------------------
    pay_card: { patterns: [
      "(puedo | se puede) pagar con tarjeta #h:pay_card", "con tarjeta #h:pay_card_short", "tarjeta", "(acepta | aceptan | toma | reciben) (tarjeta | tarjetas) #h:take_cards",
      "(pago | voy a pagar | le pago) con tarjeta", "con tarjeta de (credito | debito)", "aqui (tiene | esta) mi tarjeta", "(visa | mastercard | american express | amex)",
      "(aceptas | tomas) tarjeta #tip:tu_staff", "(aceptais | acepteis) tarjeta",
      // "No traigo efectivo, ¿acepta tarjeta?": the card (a request, at the end of the visit)
      "(no tengo | no traigo | sin) [suficiente] (efectivo | cambio | dinero en efectivo) (acepta | aceptan | toma | reciben | puedo pagar con | mejor con | con) (tarjeta | tarjetas)",
      "(no tengo | no traigo) efectivo (tarjeta | mejor tarjeta)", "(mejor | prefiero) [pagar] con tarjeta",
      // "No en efectivo, con tarjeta": the second item is the answer (rule 18); "Efectivo no, tarjeta" loses its comma: #amb
      "no (en | con) efectivo [sino] con tarjeta", "(en | con)? efectivo no [con]? tarjeta #amb",
      // "¿Puedo pagar con tarjeta o en efectivo?", "¿Acepta tarjeta o solo efectivo?": a question about both, nothing chosen
      "(puedo | se puede) pagar (con tarjeta o (en | con) efectivo | (en | con) efectivo o con tarjeta) #either",
      "(puedo | se puede) pagar (con tarjeta | en efectivo) o (por | con) transferencia #either",
      "(acepta | aceptan | toma | reciben) (tarjeta o [solo | nada mas | nomas] efectivo | efectivo o tarjeta | tarjeta o transferencia | efectivo o transferencia) #either",
    ] },
    pay_cash: { patterns: ["en efectivo #h:pay_cash", "efectivo", "(pago | voy a pagar | le pago) en efectivo", "(mejor | prefiero) [pagar] (en | con) efectivo", "con efectivo", "[puedo] pagar en efectivo",
      "no con tarjeta [sino] (en | con) efectivo", "[con]? tarjeta no (en | con)? efectivo #amb"] },
    pay_transfer: { patterns: ["(puedo | se puede) pagar (con | por) transferencia #h:pay_transfer", "(le hago | le puedo hacer | puedo hacer | le mando) (una)? transferencia", "(por | con) transferencia", "transferencia",
      "(acepta | aceptan) transferencia", "(mejor | prefiero) [pagar] (con | por) transferencia",
      "no (con | en) (tarjeta | efectivo) [sino] (por | con) transferencia"] },
    no_cash: { patterns: ["no (tengo | traigo) [suficiente | mas]? efectivo", "no (quiero | puedo) pagar (en | con) efectivo", "no (traigo | tengo) (dinero en efectivo | cash | pesos | dinero)", "no puedo pagar en efectivo",
      "ya no (tengo | traigo) [mas]? (efectivo | dinero | pesos)"] },
    // after part of it in cash, only when paying ("Es todo lo que tengo" also ends a list of symptoms)
    no_cash_ctx: { patterns: ["no me alcanza [el efectivo | el dinero | para todo]", "(es | eso es) todo lo que (tengo | traigo) [en efectivo]"] },
    no_card: { patterns: ["no (tengo | traigo) tarjeta", "no (puedo | quiero) pagar con tarjeta", "sin tarjeta", "no (tengo | traigo) (mi | la)? tarjeta (conmigo)?"] },
    here_you_go: { patterns: ["(aqui tiene | tenga | le doy | aqui le doy | aqui esta) [son] {price} #h:here_you_go_amount", "(aqui tiene | aqui le doy | tenga | le doy) un billete de {price}",
      "(aqui tiene | tenga | aqui esta) (otros | los otros) {price}", "(le pago | pago) con (un billete de)? {price}", "(aqui tiene | aqui estan) (los | sus) {price}"] },
    // a bare "Aquí tiene" / "Tenga" only at the pay step (rule 12)
    here_you_go_ctx: { patterns: ["(aqui tiene | aqui esta | tenga | aqui le doy | tome) #h:here_you_go"] },
    ask_receipt: { patterns: ["(me da | me puede dar | me podria dar | necesito | quiero) (un)? (recibo | comprobante | ticket | nota) #h:q_receipt", "(da | hace | emite | dan) factura #fact",
      "(necesito | quiero | me puede hacer | me hace | me da | me puede dar | me podria dar) (una)? factura #fact", "(me puedes dar | me das) (un)? recibo #tip:tu_staff"] },
  },

  lines: {
    // --- greeting
    greet: [
      t("Buenos días, | soy | la | doctora | Herrera. | ¿Qué | {m:lo|f:la} | trae | por aquí?", "Good morning, | I'm | — | Doctor | Herrera. | What | you | brings | here?",
        "Good morning, I'm Dr. Herrera. What brings you in?", { flags: { 2: "la doctora: Spanish uses the article with a title; English doesn't.", 6: FLAG_LOLA } }),
      t("¡Buenas tardes! | Pase, | siéntese. | Soy | la | doctora | Herrera. | ¿Qué | le | pasa?", "Good afternoon! | Come in, | sit down. | I'm | — | Doctor | Herrera. | What | (to) you | is happening?",
        "Good afternoon! Come in, have a seat. I'm Dr. Herrera. What seems to be the problem?", { flags: { 4: "la doctora: Spanish uses the article with a title; English doesn't." } }),
      t("Buenos días. | Soy | la | doctora | Herrera. | Cuénteme, | ¿cuál | es | el | motivo | de | su | consulta?",
        "Good morning. | I'm | — | Doctor | Herrera. | Tell me, | what | is | the | reason | for | your | visit?",
        "Good morning. I'm Dr. Herrera. So tell me, what brings you in today?", { flags: { 2: "la doctora: Spanish uses the article with a title; English doesn't." } }),
    ],
    greet_back: [
      t("¡Qué | gusto | {m:verlo|f:verla} | otra vez! | ¿Qué | le | pasa | ahora?", "What | pleasure | to see you | again! | What | (to) you | is happening | now?",
        "Good to see you again! What's going on this time?", { flags: { 2: "lo/la: “you” (usted), for a man or a woman." } }),
      t("¡Hola | de nuevo! | ¿Qué | {m:lo|f:la} | trae | hoy?", "Hello | again! | What | you | brings | today?", "Hello again! What brings you in today?", { flags: { 3: FLAG_LOLA } }),
    ],
    greet_feeling: [t("Buenos días, | soy | la | doctora | Herrera. | ¿Cómo | se siente | hoy?", "Good morning, | I'm | — | Doctor | Herrera. | How | do you feel | today?",
      "Good morning, I'm Dr. Herrera. How are you feeling today?", { flags: { 2: "la doctora: Spanish uses the article with a title; English doesn't." } })],
    greet_back_feeling: [t("¡Hola | de nuevo! | ¿Cómo | se siente?", "Hello | again! | How | do you feel?", "Hello again! How are you feeling?")],
    greet_hi: [t("Buenos días, | soy | la | doctora | Herrera. | Pase, | siéntese.", "Good morning, | I'm | — | Doctor | Herrera. | Come in, | sit down.",
      "Good morning, I'm Dr. Herrera. Come in, have a seat.", { flags: { 2: "la doctora: Spanish uses the article with a title; English doesn't." } })],
    greet_back_hi: [t("¡Hola | de nuevo! | Pase, | siéntese.", "Hello | again! | Come in, | sit down.", "Hello again! Come in, have a seat.")],
    ask_dob: [
      t("Antes de | empezar, | ¿me | confirma | su | fecha | de | nacimiento?", "Before | starting, | (to) me | you-confirm | your | date | of | birth?", "Before we start, can you confirm your date of birth for me?"),
      t("Primero, | ¿me | da | su | fecha | de | nacimiento, | por favor?", "First, | (to) me | you-give | your | date | of | birth, | please?", "First, can I have your date of birth, please?"),
    ],
    dob_year: [t("¿Y | el | año?", "And | the | year?", "And the year?")],
    dob_daymonth: [t("¿Y | el | día | y | el | mes?", "And | the | day | and | the | month?", "And the day and month?")],
    dob_thanks: [t("Gracias.", "Thanks.", "Thank you."), t("Perfecto, | gracias.", "Perfect, | thanks.", "Perfect, thanks.")],
    fine_glad: [t("¡Qué | bueno! | Entonces, | ¿qué | {m:lo|f:la} | trae | por aquí?", "How | good! | So, | what | you | brings | here?", "Good! So what brings you in today?", { flags: { 4: FLAG_LOLA } })],
    ask_problem: [
      t("Entonces, | ¿qué | {m:lo|f:la} | trae | por aquí?", "So, | what | you | brings | here?", "So, what brings you in today?", { flags: { 2: FLAG_LOLA } }),
      t("¿Qué | le | pasa?", "What | (to) you | is happening?", "What seems to be the problem?"),
      t("Cuénteme, | ¿qué | tiene?", "Tell me, | what | do you have?", "So tell me, what's wrong?"),
    ],
    problem_help: [t("Nada más | dígame | qué | le | molesta. | ¿Le duele | algo? | ¿Tiene | tos?", "Just | tell me | what | (to) you | bothers. | Does it hurt | anything? | Do you have | cough?",
      "Just tell me what's bothering you. Does anything hurt? Do you have a cough?")],
    feel_sick_q: [t("Lo siento. | ¿Qué | síntomas | tiene?", "I'm sorry. | What | symptoms | do you have?", "I'm sorry to hear that. What are your symptoms?")],
    sorry_sym: [
      t("¡Ay, | qué | mal!", "Oh, | how | bad!", "Oh, I'm sorry to hear that."),
      t("Lo siento | mucho.", "I'm sorry | a lot.", "I'm sorry to hear that."),
      t("¡Ay, | no! | A ver | qué | podemos | hacer.", "Oh, | no! | Let's see | what | we-can | do.", "Oh no. Okay, let's see what we can do."),
    ],
    sym_ack: [t("Ajá.", "Uh-huh.", "Uh-huh."), t("Ya veo.", "I see.", "I see."), t("Entiendo.", "I-understand.", "Got it.")],
    late_sym: [t("Ajá; | el | medicamento | también | le | va a | ayudar | con | eso.", "Uh-huh; | the | medicine | also | (to) you | is going to | help | with | that.",
      "Okay, the medicine should help with that, too.")],
    go_ahead: [t("Claro, | dígame.", "Sure, | tell me.", "Sure, go ahead."), t("Por supuesto, | pregunte.", "Of course, | ask.", "Of course. Go ahead.")],
    ask_more_sym: [t("¿Algún | otro | síntoma?", "Any | other | symptom?", "Any other symptoms?")],
    ...moreExampleLines(),
    what_else_sym: [t("¿Qué | más?", "What | more?", "What else?")],
    ask_howlong: [
      t("¿Desde | cuándo | se siente | así?", "Since | when | do you feel | like this?", "How long have you been feeling like this?"),
      t("¿Y | desde | cuándo | tiene | las | molestias?", "And | since | when | do you have | the | discomfort?", "And how long have you had it?", { flags: { 5: "molestias = discomfort, what's bothering you; a doctor's everyday word." } }),
    ],
    ask_when: [t("¿Cuándo | empezó?", "When | did it start?", "When did it start?")],
    howlong_help: [t("Más o menos. | ¿Unos | días? | ¿Una | semana?", "Roughly. | Some | days? | A | week?", "Roughly? A few days? A week?")],
    days_short: [t("Ah, | entonces | apenas | empezó.", "Ah, | so | just | it-started.", "Okay, so it just started.")],
    days_long: [t("Bueno, | eso | ya | es | bastante | tiempo.", "Well, | that | already | is | quite a lot of | time.", "Okay, that's quite a while.")],
    ask_scale: [t("Del | uno | al | diez, | ¿qué tan | fuerte | es | el | dolor?", "From the | one | to the | ten, | how | strong | is | the | pain?", "On a scale of one to ten, how bad is the pain?")],
    scale_help: [t("Nada más | calcule. | ¿Es | fuerte, | o | no | tanto?", "Just | estimate. | Is it | strong, | or | not | so much?", "Just guess. Is it bad, or not too bad?")],
    scale_high: [t("Uy, | eso | es | bastante | dolor.", "Ooh, | that | is | quite a lot of | pain.", "Ooh, that sounds pretty bad.")],
    scale_low: [t("Bueno, | no | tan | fuerte, | entonces.", "Okay, | not | so | strong, | then.", "Okay, not too bad, then.")],
    scale_mid: [t("Ajá, | gracias.", "Uh-huh, | thanks.", "Okay, thanks.")],
    ask_fever: [t("¿Ha | tenido | fiebre?", "Have you | had | fever?", "Have you had a fever?"), t("¿Tiene | fiebre?", "Do you have | fever?", "Do you have a fever?")],
    ask_temp_took: [t("¿Se tomó | la | temperatura?", "Did you take | the | temperature?", "Did you take your temperature?", { flags: { 1: FLAG_YOUR("la temperatura", "temperature") } })],
    ask_temp_high: [
      t("¿De | cuánto | es | la | fiebre?", "Of | how much | is | the | fever?", "How high is your fever?"),
      t("¿Y | de | cuánto | tiene | la | fiebre?", "And | of | how much | do you have | the | fever?", "And how high is your fever?"),
    ],
    ask_temp_how: [t("¿Y | cuánto | marcó?", "And | how much | did it show?", "And how high was it?", { flags: { 2: "marcar = to show a reading (a thermometer, a scale)." } })],
    fever_none: [t("Bien.", "Good.", "Okay, good."), t("Bueno. | Sin | fiebre, | entonces.", "Good. | Without | fever, | then.", "Good. No fever, then.")],
    temp_check_later: [t("No se preocupe, | ahorita | se la | tomo.", "Don't worry, | right now | it for you | I-take.", "No problem, I'll check it in a minute.",
      { flags: { 1: "Mexican: ahorita = in a moment / right now." }, neutral: t("No se preocupe, | en un momento | se la | tomo.", "Don't worry, | in a moment | it for you | I-take.", "No problem, I'll check it in a minute.") })],
    f_echo: [t("¿{$tf} | Fahrenheit?", "{$tf} | Fahrenheit?", "{$tf} Fahrenheit?")],
    f_conv: [t("Aquí | usamos | grados | Celsius: | son | como | {$tc}.", "Here | we-use | degrees | Celsius: | it's | about | {$tc}.", "We use Celsius here: that's about {$tc} degrees.")],
    temp_normal: [t("Eso | es | normal: | no tiene | fiebre.", "That | is | normal: | you don't have | fever.", "That's normal, so no fever.")],
    temp_slight: [t("Son | unas | líneas | de | temperatura, | nada más.", "They're | some | lines | of | temperature, | just.", "That's just a little high.",
      { flags: { 2: "Mexican: unas líneas (de temperatura) = a temperature just above normal." },
        neutral: t("Es | un poco | de | temperatura, | nada más.", "It's | a little | of | temperature, | just.", "That's just a little high.") })],
    temp_fever: [t("Entonces | sí | tiene | fiebre.", "So | yes | you-have | fever.", "So you do have a fever."), t("Eso | ya | es | fiebre.", "That | already | is | fever.", "That's a fever.")],
    temp_high: [t("Es | una | fiebre | bastante | alta.", "It's | a | fever | quite | high.", "That's a pretty high fever.")],
    temp_weird: [t("Mmm, | mejor | se la | tomo | yo | en | un | momento.", "Hmm, | better | it for you | I-take | I | in | a | moment.", "Hmm, I'll check it myself in a minute.")],
    temp_measure: [t("Primero | le | voy a | tomar | la | temperatura.", "First | (for) you | I'm going to | take | the | temperature.", "First, I'll take your temperature.", { flags: { 4: FLAG_YOUR("la temperatura", "temperature") } })],
    temp_read: [t("Marca | {$tm} | grados.", "It-shows | {$tm} | degrees.", "It says {$tm} degrees.")],
    ask_meds: [
      t("¿Está | tomando | algo | para | eso?", "Are you | taking | something | for | that?", "Are you taking anything for it?"),
      t("¿Ha | tomado | algo | para | eso?", "Have you | taken | something | for | that?", "Have you taken anything for it?"),
    ],
    ask_meds_what: [t("¿Qué | está | tomando?", "What | are you | taking?", "What are you taking?")],
    meds_help: [t("¿Alguna | pastilla, | como | paracetamol | o | ibuprofeno?", "Any | pill, | like | acetaminophen | or | ibuprofen?", "Any pills, like acetaminophen or ibuprofen?")],
    meds_pain_ok: [t("Está bien | por | ahora.", "It's fine | for | now.", "Okay, that's fine for now.")],
    meds_home_ok: [t("Qué | bueno. | Un | té | calientito | ayuda.", "How | good. | A | tea | nice and warm | helps.", "That's good. A nice warm tea helps.",
      { flags: { 4: "calientito: caliente (hot) with the diminutive: nice and warm." } })],
    meds_other_ok: [t("Muy | bien, | qué | bueno | que | me | dice.", "Very | good, | how | good | that | (to) me | you-tell.", "Okay, good to know.")],
    meds_ab: [t("Bueno. | Mejor | no tome | antibióticos | sin | receta.", "Okay. | Better | don't take | antibiotics | without | prescription.", "Okay. Better not take antibiotics without a prescription.")],
    ok_plain: [t("Muy | bien.", "Very | good.", "Okay."), t("Bien.", "Good.", "All right.")],
    // --- the exam
    exam_start: [
      t("Ahora | {m:lo|f:la} | voy a | revisar.", "Now | you | I'm going to | examine.", "Now I'd like to examine you.", { flags: { 1: FLAG_LOLA } }),
      t("Bueno, | vamos a | ver.", "Okay, | let's | see.", "Alright, let's take a look."),
    ],
    bp_start: [t("Primero | le | voy a | tomar | la | presión.", "First | (for) you | I'm going to | take | the | pressure.", "Let me check your blood pressure first.",
      { flags: { 5: "la presión = blood pressure (la presión arterial)." } })],
    bp_sleeve: [
      t("Súbase | la | manga, | por favor.", "Roll up | the | sleeve, | please.", "Please roll up your sleeve.", { flags: { 1: FLAG_YOUR("la manga", "sleeve") } }),
      t("¿Me | hace | el | favor | de | subirse | la | manga?", "(For) me | you-do | the | favor | of | rolling up | the | sleeve?", "Could you roll up your sleeve for me?", { flags: { 6: FLAG_YOUR("la manga", "sleeve") } }),
    ],
    bp_either_arm: [t("Cualquiera | está bien.", "Either one | is fine.", "Either arm is fine.")],
    bp_relax: [t("Muy | bien. | Relájese | un | momento.", "Very | good. | Relax | a | moment.", "Great. Just relax for a moment.")],
    bp_result: [
      t("120 | sobre | 80: | perfecta.", "120 | over | 80: | perfect.", "120 over 80. That's perfect.", { say: "Ciento veinte sobre ochenta: perfecta." }),
      t("118 | sobre | 76: | muy | bien.", "118 | over | 76: | very | good.", "118 over 76. That's great.", { say: "Ciento dieciocho sobre setenta y seis: muy bien." }),
    ],
    listen_lungs: [t("Voy a | escuchar | sus | pulmones.", "I'm going to | listen to | your | lungs.", "I'm going to listen to your lungs.")],
    deep_breath: [
      t("Respire | hondo… | y | saque | el | aire.", "Breathe | deep… | and | let out | the | air.", "Take a deep breath… and out."),
      t("Respire | hondo | por | la | boca… | y | suelte | el | aire.", "Breathe | deep | through | the | mouth… | and | let out | the | air.", "Take a deep breath through your mouth… and out.", { flags: { 3: FLAG_YOUR("la boca", "mouth") } }),
    ],
    breath_again: [t("Bien. | Otra vez… | y | saque | el | aire.", "Good. | Again… | and | let out | the | air.", "Good. Once more… and out.")],
    breath_easy: [t("No se preocupe. | Respire | normal.", "Don't worry. | Breathe | normally.", "That's okay. Just breathe normally.")],
    good_ack: [t("Bien.", "Good.", "Good."), t("Perfecto.", "Perfect.", "Perfect."), t("Muy | bien.", "Very | good.", "Great.")],
    lungs_clear: [
      t("Los | pulmones | se oyen | limpios.", "The | lungs | sound | clear.", "Your lungs sound clear.", { flags: { 0: FLAG_YOUR("los pulmones", "lungs") } }),
      t("Sus | pulmones | están | bien.", "Your | lungs | are | fine.", "Your lungs sound good."),
    ],
    lungs_wheeze: [t("Se oye | un | silbido | leve, | pero | no es | nada | grave.", "One hears | a | wheeze | slight, | but | it isn't | anything | serious.", "I can hear a little wheezing, but it's mild.")],
    say_ah: [
      t("Ahora | abra | la | boca | y | diga | “a”.", "Now | open | the | mouth | and | say | “ah”.", "Now open your mouth and say “ah.”", { flags: { 2: FLAG_YOUR("la boca", "mouth") } }),
      t("Abra | grande | y | diga | “aaa”.", "Open | wide | and | say | “ah”.", "Open wide and say “ah.”"),
    ],
    ear_look: [t("Ahora | le | voy a | revisar | los | oídos.", "Now | (of) you | I'm going to | check | the | ears.", "Now I'll look in your ears.", { flags: { 4: FLAG_YOUR("los oídos", "ears") } })],
    ear_red: [t("Tiene | el | oído | rojo | por dentro.", "You-have | the | ear | red | inside.", "Your ear is red inside.")],
    ear_red_left: [t("Tiene | el | oído | izquierdo | rojo | por dentro.", "You-have | the | ear | left | red | inside.", "Your left ear is red inside.")],
    ear_red_right: [t("Tiene | el | oído | derecho | rojo | por dentro.", "You-have | the | ear | right | red | inside.", "Your right ear is red inside.")],
    ear_red_both: [t("Tiene | los | dos | oídos | rojos | por dentro.", "You-have | the | two | ears | red | inside.", "Both your ears are red inside.")],
    throat_red: [t("Mmm, | tiene | la | garganta | muy | roja.", "Hmm, | you-have | the | throat | very | red.", "Hmm, your throat is very red.")],
    throat_bit_red: [t("Tiene | la | garganta | un poco | roja.", "You-have | the | throat | a little | red.", "Your throat is a little red.")],
    throat_fine: [t("La | garganta | se ve | bien.", "The | throat | looks | fine.", "Your throat looks fine.", { flags: { 0: FLAG_YOUR("la garganta", "throat") } })],
    press_neck: [t("Ahora | el | cuello.", "Now | the | neck.", "Now your neck.")],
    press_belly: [t("Ahora | acuéstese | en | la | camilla, | por favor.", "Now | lie down | on | the | exam table, | please.", "Now please lie down on the exam table.")],
    press_back: [t("Ahora | voltéese, | por favor.", "Now | turn around, | please.", "Now please turn around.")],
    press_ear: [t("Ahora, | detrás de | la | oreja.", "Now, | behind | the | ear.", "Now behind your ear.")],
    hurt_here: [t("¿Le duele | aquí?", "Does it hurt (you) | here?", "Does it hurt here?")],
    hurt_sorry: [t("¡Perdón! | Con | cuidado.", "Sorry! | With | care.", "Sorry! I'll be gentle.")],
    glands_swollen: [t("Tiene | los | ganglios | un poco | inflamados.", "You-have | the | glands | a little | swollen.", "Your glands are a little swollen.")],
    belly_tender: [t("El | estómago | está | un poco | sensible.", "The | stomach | is | a little | tender.", "Your stomach is a little tender.", { flags: { 0: FLAG_YOUR("el estómago", "stomach") } })],
    back_muscle: [t("Es | el | músculo.", "It's | the | muscle.", "That's the muscle.")],
    neck_tight: [t("Tiene | los | músculos | del | cuello | muy | tensos.", "You-have | the | muscles | of the | neck | very | tight.", "Your neck muscles are very tight.")],
    ear_tender: [t("Es | la | infección.", "It's | the | infection.", "That's the infection.")],
    hurt_no_ok: [t("Bien.", "Good.", "Okay, good."), t("Qué | bueno.", "How | good.", "Good.")],
    hurt_little_ok: [t("¿Un poco | nada más? | Bien.", "A little | only? | Okay.", "Just a little? Okay.")],
    dx_throat: [t("Parece | una | infección | en | la | garganta.", "It-looks like | an | infection | in | the | throat.", "It looks like a throat infection.")],
    dx_ear: [t("Parece | una | infección | en | el | oído.", "It-looks like | an | infection | in | the | ear.", "It looks like an ear infection.")],
    dx_virus: [t("Parece | un | virus.", "It-looks like | a | virus.", "It looks like a virus.")],
    dx_stomach: [t("Parece | una | infección | en | el | estómago.", "It-looks like | an | infection | in | the | stomach.", "It looks like a stomach bug.")],
    dx_back: [t("Parece | que | se lastimó | un | músculo.", "It-seems | that | you-hurt | a | muscle.", "It looks like you pulled a muscle.")],
    dx_tension: [t("Parece | un | dolor | de | cabeza | por | tensión.", "It-looks like | a | pain | of | head | from | tension.", "It looks like a tension headache.")],
    dx_calm: [t("No se preocupe, | no es | nada | grave.", "Don't worry, | it isn't | anything | serious.", "Don't worry, it's nothing serious.")],
    dx_dengue: [t("No parece | dengue; | pero | si | se siente | peor, | regrese | de inmediato.", "It doesn't look like | dengue; | but | if | you-feel | worse, | come back | right away.",
      "It doesn't look like dengue, but if you feel worse, come back right away.")],
    no_ab_virus: [t("Los | antibióticos | no sirven | para | un | virus.", "— | Antibiotics | don't work | for | a | virus.", "Antibiotics won't help with a virus.",
      { flags: { 0: "los: Spanish uses the article for things in general; English doesn't." } })],
    // --- the prescription
    rx_intro_ab: [t("Le | voy a | recetar | un | antibiótico.", "(For) you | I'm going to | prescribe | an | antibiotic.", "I'm going to prescribe an antibiotic.")],
    rx_intro_ab_alt: [t("Entonces | le | voy a | recetar | otro | antibiótico.", "Then | (for) you | I'm going to | prescribe | another | antibiotic.", "Then I'll prescribe a different antibiotic.")],
    rx_intro_ab_pen: [t("Como | es | {m:alérgico|f:alérgica} | a | la | penicilina, | le | voy a | recetar | otro | antibiótico.",
      "Since | you're | allergic | to | — | penicillin, | (for) you | I'm going to | prescribe | another | antibiotic.", "Since you're allergic to penicillin, I'll prescribe a different antibiotic.",
      { flags: { 4: "la: Spanish uses the article for a substance in general; English doesn't." } })],
    rx_intro_sym: [t("Le | voy a | dar | algo | para | los | síntomas.", "(To) you | I'm going to | give | something | for | the | symptoms.", "I'll give you something for the symptoms.")],
    rx_intro_stomach: [t("Le | voy a | dar | algo | para | el | estómago | y | suero | oral.", "(To) you | I'm going to | give | something | for | the | stomach | and | rehydration drink | oral.",
      "I'll give you something for your stomach, and an electrolyte drink.")],
    rx_intro_pain: [t("Le | voy a | dar | algo | para | el | dolor.", "(To) you | I'm going to | give | something | for | the | pain.", "I'll give you something for the pain.")],
    ask_allergy_first: [t("Antes de | recetarle | algo, | ¿es | {m:alérgico|f:alérgica} | a | algún | medicamento?", "Before | prescribing you | anything, | are you | allergic | to | any | medicine?",
      "Before I prescribe anything, are you allergic to any medications?")],
    ask_allergy: [
      t("¿Es | {m:alérgico|f:alérgica} | a | algún | medicamento?", "Are you | allergic | to | any | medicine?", "Are you allergic to any medications?"),
      t("¿Tiene | alergia | a | algún | medicamento?", "Do you have | allergy | to | any | medicine?", "Do you have any allergies to medications?"),
    ],
    allergy_chart: [t("Aquí | en | su | expediente | dice | que | es | {m:alérgico|f:alérgica} | a | la | penicilina. | ¿Es | correcto?",
      "Here | in | your | chart | it-says | that | you're | allergic | to | — | penicillin. | Is it | correct?", "I see in your chart that you're allergic to penicillin. Is that right?",
      { flags: { 3: "expediente = a patient's file, the medical chart.", 9: "la: Spanish uses the article for a substance in general; English doesn't." } })],
    allergy_which: [t("¿A | qué | es | {m:alérgico|f:alérgica}?", "To | what | are you | allergic?", "What are you allergic to?")],
    allergy_none_ok: [t("Bien.", "Good.", "Good."), t("Muy | bien.", "Very | good.", "Okay, good.")],
    allergy_pen_ab: [t("Qué | bueno | que | me lo | dice.", "How | good | that | it to me | you-tell.", "Good to know.")],
    allergy_ok_other: [t("Bien, | con | este | medicamento | no hay | problema.", "Good, | with | this | medicine | there's no | problem.", "Okay, that's no problem for this medicine.")],
    allergy_unsure: [t("No se preocupe. | Le | voy a | dar | algo | muy | seguro.", "Don't worry. | (To) you | I'm going to | give | something | very | safe.", "That's okay. I'll give you something very safe.")],
    chart_fixed: [t("Ah, | muy | bien. | Lo | corrijo | en | su | expediente.", "Ah, | very | good. | It | I-correct | in | your | chart.", "Oh, okay. I'll update your chart.")],
    dose_ab: [t("Tome | una | cápsula | cada | ocho | horas.", "Take | one | capsule | every | eight | hours.", "Take one capsule every eight hours.")],
    dose_ab_alt: [t("Tome | una | tableta | cada | doce | horas.", "Take | one | tablet | every | twelve | hours.", "Take one tablet every twelve hours.")],
    dose_sym: [t("Tome | una | tableta | de | paracetamol | cada | ocho | horas | si | tiene | fiebre | o | dolor.", "Take | one | tablet | of | acetaminophen | every | eight | hours | if | you-have | fever | or | pain.",
      "Take one acetaminophen tablet every eight hours if you have a fever or pain.")],
    dose_stomach: [t("Tome | una | tableta | cada | ocho | horas, | y | el | suero | a | traguitos.", "Take | one | tablet | every | eight | hours, | and | the | electrolyte drink | in | little sips.",
      "Take one tablet every eight hours, and sip the electrolyte drink slowly.")],
    dose_pain: [t("Tome | una | tableta | cada | ocho | horas, | después de | comer.", "Take | one | tablet | every | eight | hours, | after | eating.", "Take one tablet every eight hours, after meals.")],
    dose_days: [t("Por | cinco | días.", "For | five | days.", "For five days.")],
    dose_days_sym: [t("No | más | de | cinco | días.", "Not | more | than | five | days.", "No more than five days.")],
    dose_tension: [t("Tome | una | tableta | si | le duele, | máximo | cada | ocho | horas.", "Take | one | tablet | if | it hurts (you), | at most | every | eight | hours.", "Take one tablet when it hurts, no more than every eight hours.")],
    dose_days_ab: [t("Tómelas | por | cinco | días.", "Take them | for | five | days.", "Take them for five days.")],
    dose_finish: [t("Y | termine | todo | el | tratamiento, | aunque | se sienta | mejor.", "And | finish | all | the | treatment, | even if | you-feel | better.", "And finish all of it, even if you feel better.")],
    ask_questions: [t("¿Tiene | alguna | pregunta?", "Do you have | any | question?", "Do you have any questions?")],
    ask_more_q: [
      t("¿Tiene | alguna | otra | pregunta?", "Do you have | any | other | question?", "Do you have any other questions?"),
      t("¿Alguna | otra | duda?", "Any | other | question?", "Any other questions for me?", { flags: { 2: "duda: a question you're unsure about (not “doubt”)." } }),
    ],
    exam_first: [t("Primero | {m:lo|f:la} | reviso.", "First | you | I-examine.", "Let me examine you first.", { flags: { 1: FLAG_LOLA } }), t("Primero | vamos a | ver.", "First | let's | see.", "Let's see first.")],
    dose_first: [t("Primero | vemos | qué | necesita.", "First | we-see | what | you-need.", "Let's see what you need first.")],
    explain_soon: [t("Ahorita | se lo | explico.", "Right now | it to you | I-explain.", "I'll explain in a second.",
      { flags: { 0: "Mexican: ahorita = in a moment / right now." }, neutral: t("En un momento | se lo | explico.", "In a moment | it to you | I-explain.", "I'll explain in a second.") })],
    meals_after: [t("Después de | comer, | para que | no le caiga | mal.", "After | eating, | so that | it doesn't sit | badly.", "After meals, so it doesn't upset your stomach.",
      { flags: { 3: "caer mal (a alguien) = to not agree with someone: to upset the stomach." } })],
    side_ab: [t("Le | puede | caer | un poco | mal | al | estómago.", "(To) you | it-can | fall | a little | badly | to the | stomach.", "It can upset your stomach a little.",
      { flags: { 2: "caer mal = to upset (the stomach)." } })],
    side_rash: [t("Si | le | salen | ronchas, | deje | de | tomarlo | y | llámenos.", "If | (on) you | come out | hives, | stop | — | taking it | and | call us.", "If you get a rash, stop taking it and call us.",
      { flags: { 5: "dejar de + infinitive = to stop doing something." } })],
    side_sym: [t("Puede | darle | un poco | de | sueño.", "It-can | give you | a little | of | sleepiness.", "It can make you a little drowsy.")],
    side_none: [t("No | mucho. | Es | muy | suave.", "Not | much. | It's | very | gentle.", "Not really. It's very gentle.")],
    alcohol: [t("Nada | de | alcohol | mientras | lo | tome, | por favor.", "Nothing | of | alcohol | while | it | you-take, | please.", "Please don't drink alcohol while you're taking it.")],
    drive_ok: [t("Sí, | no le da | sueño.", "Yes, | it doesn't give you | sleepiness.", "Yes, it won't make you drowsy.")],
    drive_careful: [t("Con | cuidado: | puede | darle | sueño.", "With | care: | it-can | give you | sleepiness.", "Be careful, it can make you drowsy.")],
    better_ab: [t("En | dos | o | tres | días | ya | va a | estar | mejor.", "In | two | or | three | days | already | you're going to | be | better.", "You should feel better in two or three days.")],
    better_week: [t("En | más o menos | una | semana.", "In | roughly | a | week.", "In about a week.")],
    better_back: [t("En | una | o | dos | semanas.", "In | one | or | two | weeks.", "In a week or two.")],
    contagious_yes: [t("Sí | es | contagioso, | los | primeros | días.", "Yes | it-is | contagious, | the | first | days.", "Yes, it's contagious for the first few days.")],
    contagious_advice: [t("Quédese | en | casa | y | lávese | las | manos | seguido.", "Stay | at | home | and | wash | the | hands | often.", "So stay home and wash your hands often.",
      { flags: { 5: FLAG_YOUR("las manos", "hands") } })],
    contagious_no: [t("No, | no es | contagioso.", "No, | it isn't | contagious.", "No, it's not contagious.")],
    serious_no: [t("No, | no es | nada | grave.", "No, | it isn't | anything | serious.", "No, it's nothing serious.")],
    fine_soon: [t("Va a | estar | bien.", "You're going to | be | fine.", "You'll be fine.")],
    ab_yes: [t("Sí, | esta | vez | sí | necesita | uno.", "Yes, | this | time | yes | you-need | one.", "Yes, this time you do need one.")],
    ab_no: [t("No, | no necesita | antibióticos.", "No, | you don't need | antibiotics.", "No, you don't need antibiotics.")],
    is_virus: [t("Es | un | virus.", "It's | a | virus.", "It's a virus.")],
    work_home: [t("Mejor | quédese | en | casa | dos | o | tres | días.", "Better | stay | at | home | two | or | three | days.", "Better stay home for two or three days.")],
    work_back: [t("Sí, | pero | no cargue | nada | pesado.", "Yes, | but | don't lift | anything | heavy.", "Yes, but don't lift anything heavy.")],
    work_ok: [t("Sí, | si | se siente | bien.", "Yes, | if | you-feel | well.", "Yes, if you feel okay.")],
    note_write: [t("Claro. | Le | hago | un | justificante | por | tres | días.", "Of course. | (For) you | I-make | a | doctor's note | for | three | days.", "Of course. I'll write you a note for three days.",
      { flags: { 4: FLAG_NOTE } })],
    note_here: [t("Y | aquí tiene | su | justificante | para | el | trabajo.", "And | here's | your | doctor's note | for | — | work.", "And here's your note for work.",
      { flags: { 3: FLAG_NOTE, 5: "el trabajo: English says “for work”, no article." } })],
    note_later: [t("Claro, | al | final | se lo | doy.", "Sure, | at the | end | it to you | I-give.", "Sure, I'll give you one at the end.")],
    ask_note: [t("¿Necesita | un | justificante | para | el | trabajo?", "Do you need | a | doctor's note | for | — | work?", "Do you need a note for work?",
      { flags: { 2: FLAG_NOTE, 4: "el trabajo: English says “for work”, no article." } })],
    note_no_ok: [t("Muy | bien, | no hay | problema.", "Very | good, | there's no | problem.", "Okay, no problem.")],
    eat_stomach: [t("Coma | ligero: | arroz, | caldo, | plátano. | Nada | de | picante.", "Eat | light: | rice, | broth, | banana. | Nothing | of | spicy food.", "Eat light food: rice, broth, bananas. Nothing spicy.")],
    eat_any: [t("Lo que | quiera. | Un | caldito | de | pollo | le | cae | muy | bien.", "What | you-want. | A | little broth | of | chicken | (to) you | does | very | well.",
      "Whatever you like. Chicken soup is great.", { flags: { 3: "caldito: caldo (broth) with the diminutive.", 7: "caer bien = to do you good, to agree with you." } })],
    exercise_no: [t("Esta | semana | no. | Su | cuerpo | necesita | descansar.", "This | week | no. | Your | body | needs | to rest.", "Not this week. Your body needs rest.")],
    cost_info: [t("La | consulta | son | {$price}; | me | paga | al | final.", "The | visit | is | {$price}; | (to) me | you-pay | at the | end.", "The visit is {$price}; you can pay me at the end.",
      { flags: { 2: "son: with an amount in pesos Mexicans say “son” (son quinientos pesos)." } })],
    ins_receipt: [t("Le | doy | un | recibo | para | su | seguro.", "(To) you | I-give | a | receipt | for | your | insurance.", "I'll give you a receipt for your insurance.")],
    // --- the paper prescription
    ask_pharmacy: [
      t("Aquí tiene | su | receta. | ¿Sabe | dónde | surtirla?", "Here's | your | prescription. | Do you know | where | to fill it?", "Here's your prescription. Do you know where to fill it?",
        { flags: { 5: "surtir una receta = to fill a prescription." } }),
      t("Aquí tiene | la | receta. | ¿Tiene | alguna | farmacia | cerca?", "Here's | the | prescription. | Do you have | any | pharmacy | nearby?", "Here's the prescription. Is there a pharmacy near you?"),
    ],
    pharmacy_harbor: [t("Perfecto. | Ahí | se la | surten | sin | problema.", "Perfect. | There | it for you | they-fill | without | problem.", "Perfect. They'll fill it there, no problem.")],
    pharmacy_other: [t("Muy | bien; | se la | surten | en | cualquier | farmacia.", "Very | good; | it for you | they-fill | in | any | pharmacy.", "Sure, any pharmacy can fill it.")],
    pharmacy_suggest: [t("La | Farmacia del Puerto | está | aquí | cerca, | en | el | centro.", "The | Farmacia del Puerto | is | here | nearby, | in | the | center.", "Farmacia del Puerto is close by, downtown.")],
    pharmacy_generic: [t("Si | quiere, | pida | el | genérico: | es | lo mismo | y | más | barato.", "If | you-want, | ask for | the | generic: | it's | the same | and | more | cheap.",
      "If you like, ask for the generic: it's the same thing, and cheaper.")],
    // --- the advice
    advice_rest: [
      t("Descanse | y | tome | muchos | líquidos.", "Rest | and | drink | many | liquids.", "Rest and drink lots of fluids."),
      t("Quédese | en | casa, | descanse | y | tome | muchos | líquidos.", "Stay | at | home, | rest | and | drink | many | liquids.", "Stay home, rest and drink lots of fluids."),
    ],
    advice_tea: [t("Un | té | calientito | con | miel | también | ayuda.", "A | tea | nice and warm | with | honey | also | helps.", "Warm tea with honey helps, too.")],
    advice_stomach: [t("Tome | mucha | agua | y | coma | ligero.", "Drink | a lot of | water | and | eat | light.", "Drink lots of water and eat light food.")],
    advice_back: [t("Póngase | compresas | calientes | y | no cargue | nada | pesado.", "Put on | compresses | hot | and | don't lift | anything | heavy.", "Use warm compresses, and don't lift anything heavy.")],
    advice_tension: [t("Trate | de | descansar | y | tome | mucha | agua.", "Try | to | rest | and | drink | a lot of | water.", "Try to rest, and drink plenty of water.")],
    come_back: [
      t("Si | no mejora, | regrese.", "If | you don't get better, | come back.", "Come back if it doesn't get better."),
      t("Y | si | no mejora, | regrese | a | verme.", "And | if | you don't get better, | come back | to | see me.", "And come back if it doesn't get better."),
    ],
    come_back_q: [t("Si | en | tres | días | no mejora, | regrese.", "If | in | three | days | you don't get better, | come back.", "If you're not better in three days, come back.")],
    feel_better: [t("¡Que | se mejore!", "That | you-get better!", "Feel better!"), t("¡Que | se alivie | pronto!", "That | you-get well | soon!", "I hope you feel better soon!")],
    // --- paying
    consult_price: [
      t("Son | {$price} | de | la | consulta.", "It's | {$price} | for | the | visit.", "That's {$price} for the visit."),
      t("La | consulta | son | {$price}.", "The | visit | is | {$price}.", "The visit is {$price}.", { flags: { 2: "son: with an amount in pesos Mexicans say “son” (son quinientos pesos)." } }),
    ],
    pay_first: [t("Antes de | irse: | la | consulta | son | {$price}.", "Before | leaving: | the | visit | is | {$price}.", "Before you go: the visit is {$price}.")],
    ask_pay_method: [t("¿Cómo | va a | pagar: | en efectivo | o | con | tarjeta?", "How | are you going to | pay: | in cash | or | with | card?", "How would you like to pay, cash or card?")],
    pay_method_again: [t("¿Efectivo | o | tarjeta?", "Cash | or | card?", "Cash or card?")],
    cash_wait: [t("Son | {$price}.", "It's | {$price}.", "It's {$price}.")],
    card_tap: [t("Acerque | su | tarjeta | a | la | terminal… | Listo, | ya | pasó.", "Bring close | your | card | to | the | card machine… | Done, | already | it-went-through.",
      "Tap your card on the machine… Done, it went through.")],
    transfer_ok: [t("Claro. | Aquí | están | los | datos | de | la | cuenta… | Listo, | ya | me | llegó.", "Sure. | Here | are | the | details | of | the | account… | Done, | already | (to) me | it-arrived.",
      "Sure. Here are the account details… Great, it came through.")],
    cash_ok: [t("Claro, | en efectivo.", "Sure, | in cash.", "Sure, cash is fine.")],
    cash_exact: [t("Exacto, | gracias.", "Exact, | thanks.", "That's exactly right, thanks.")],
    change_is: [t("Gracias. | Su | cambio: | {$price}.", "Thanks. | Your | change: | {$price}.", "Thanks. Your change is {$price}.")],
    short: [t("Perdón, | son | {$total}; | faltan | {$price}.", "Sorry, | it's | {$total}; | they're-missing | {$price}.", "Sorry, it's {$total}; you're {$price} short.")],
    left_is: [t("Faltan | {$price}.", "They're-missing | {$price}.", "You still owe {$price}.")],
    no_change: [t("Uy, | no tengo | cambio | para | tanto. | ¿No tiene | un | billete | más | chico?", "Ooh, | I don't have | change | for | so much. | Don't you have | a | bill | more | small?",
      "Oh, I don't have change for that much. Do you have a smaller bill?")],
    no_cash_ok: [t("No se preocupe: | también | acepto | tarjeta | y | transferencia.", "Don't worry: | also | I-accept | card | and | transfer.", "Don't worry, I also take cards and bank transfers.")],
    no_card_ok: [t("Entonces | en efectivo | o | por | transferencia.", "Then | in cash | or | by | transfer.", "Then cash or a bank transfer.")],
    pay_later_card: [t("Sí, | acepto | tarjeta; | me | paga | al | final.", "Yes, | I-accept | card; | (to) me | you-pay | at the | end.", "Yes, I take cards. You can pay at the end.")],
    pay_later_transfer: [t("Sí, | también | acepto | transferencia; | me | paga | al | final.", "Yes, | also | I-accept | transfer; | (to) me | you-pay | at the | end.",
      "Yes, I take bank transfers too. You can pay at the end.")],
    pay_which: [t("Perdón, | ¿en efectivo | o | con | tarjeta?", "Sorry, | in cash | or | with | card?", "Sorry, was that cash or card?")],
    pay_either: [t("Sí, | como | prefiera.", "Yes, | as | you-prefer.", "Sure, whichever you prefer.")],
    pay_at_end: [t("Al | final | me | paga, | no se preocupe.", "At the | end | (to) me | you-pay, | don't worry.", "You can pay me at the end, don't worry.")],
    receipt_ok: [t("Claro, | aquí tiene | su | recibo.", "Sure, | here's | your | receipt.", "Sure, here's your receipt.")],
    receipt_later: [t("Claro, | al | pagar | le | doy | su | recibo.", "Sure, | on | paying | (to) you | I-give | your | receipt.", "Sure, I'll give you a receipt when you pay.")],
    factura_desk: [t("Para | factura, | deje | sus | datos | en | recepción.", "For | tax invoice, | leave | your | details | at | reception.", "For a tax invoice, leave your details at the front desk.",
      { flags: { 1: "factura = an official tax invoice (Mexico); a recibo is a plain receipt." } })],
    paid_already: [t("Ya | está | pagado, | gracias.", "Already | it-is | paid, | thanks.", "That's already paid, thanks.")],
  },

  domains: {
    tc: () => Array.from({ length: 91 }, (_, i) => tempVal(34 + i / 10)),
    tf: () => Array.from({ length: 171 }, (_, i) => tempVal(93 + i / 10)),
    tm: () => [...new Set(Object.values(MEASURED))].map(tempVal),
    price: () => {
      const s = new Set<number>();
      for (let p = 100; p <= FEE; p += 100) s.add(p);
      for (let p = FEE; p <= MAX_CASH; p += 500) s.add(p);
      return [...s];
    },
    total: () => [FEE],
  },

  hints: {
    symptom: {
      lt: "Say what's wrong", slot: "symptom", examples: ["sore_throat", "cough", "headache", "stomachache"],
      items: [
        ...haveItems(),
        ...bodyItems(),
        { id: "song", s: t("Tengo | dolor | de | garganta | y | fiebre.", "I-have | pain | of | throat | and | fever.", "I have a sore throat and a fever.") },
        { id: "swallow", s: t("Me duele | al | tragar.", "It hurts (me) | when | swallowing.", "It hurts when I swallow.") },
        { id: "dizzy", s: t("Estoy | {m:mareado|f:mareada}.", "I-am | dizzy.", "I feel dizzy.") },
        { id: "tired", s: t("Estoy | muy | {m:cansado|f:cansada}.", "I-am | very | tired.", "I'm really tired.") },
        { id: "coughing", s: t("No puedo | dejar | de | toser.", "I can't | stop | — | coughing.", "I can't stop coughing.", { flags: { 2: "dejar de + infinitive = to stop doing something." } }) },
        { id: "nose", s: t("Me | escurre | la | nariz.", "(To) me | drips | the | nose.", "My nose is running.", { flags: { 2: FLAG_YOUR("la nariz", "nose") } }) },
        { id: "feel_sick", s: t("No me siento | bien.", "I don't feel | well.", "I don't feel well.") },
      ],
    },
    feeling: {
      lt: "Say how you feel",
      items: [
        { id: "feel_bad", s: t("No | muy | bien, | la verdad.", "Not | very | well, | to be honest.", "Not so good, to be honest.") },
        { id: "feel_sick", s: t("Me siento | mal.", "I-feel | bad.", "I don't feel well.") },
      ],
    },
    more_sym: {
      lt: "Say whether you have other symptoms", slot: "symptom", examples: ["cough", "headache", "fever"],
      items: [
        { id: "have", s: t("También | tengo | {X}.", "Also | I-have | {X}.", "I also have that."), only: (e: EntityDef) => !["cold", "flu", "dizzy", "fatigue"].includes(e.id) },
        { id: "no_other", s: t("No, | nada más.", "No, | nothing else.", "No, that's all.") },
      ],
    },
    howlong: {
      lt: "Say how long you've had it",
      items: [
        { id: "since", s: t("Desde | ayer.", "Since | yesterday.", "Since yesterday."), note: "Desde hace tres días = for three days; desde el lunes = since Monday." },
        { id: "since", s: t("Desde | hace | tres | días.", "Since | ago | three | days.", "For three days now.") },
        { id: "since", s: t("Desde | el | lunes.", "Since | — | Monday.", "Since Monday.", { flags: { 1: "el lunes: Spanish uses the article with days; English doesn't." } }) },
      ],
    },
    scale: {
      lt: "Rate the pain from 1 to 10",
      items: [
        { id: "scale", s: t("Como | un | seis.", "Like | a | six.", "About a six.") },
        { id: "scale", s: t("Un | ocho; | me duele | mucho.", "An | eight; | it hurts (me) | a lot.", "An eight. It really hurts.") },
      ],
    },
    fever: {
      lt: "Say your temperature (or that you didn't take it)",
      items: [
        { id: "temp", s: t("Sí, | tengo | fiebre | de | 38.", "Yes, | I-have | fever | of | 38.", "Yes, I have a fever of 38 degrees.", { say: "Sí, tengo fiebre de treinta y ocho." }), note: "In Mexico temperatures are in Celsius: 37 is normal, 38 is a fever." },
        { id: "temp_unknown", s: t("No sé; | no me la tomé.", "I don't know; | I didn't take it.", "I don't know, I didn't take it.") },
        { id: "fever_yes", s: t("Sí, | tengo | un poco | de | fiebre.", "Yes, | I-have | a little | of | fever.", "Yes, I have a bit of a fever.") },
      ],
    },
    meds: {
      lt: "Say whether you're taking anything",
      items: [
        { id: "meds_none", s: t("No, | no tomo | nada.", "No, | I don't take | anything.", "No, I'm not taking anything.") },
        { id: "meds_otc", s: t("Solo | paracetamol.", "Just | acetaminophen.", "Just acetaminophen."), note: "Paracetamol is what Americans call acetaminophen (Tylenol)." },
        { id: "meds_otc", s: t("Tomé | ibuprofeno.", "I-took | ibuprofen.", "I took some ibuprofen.") },
      ],
    },
    exam_breath: {
      lt: "Breathe in and out (and answer)",
      items: [
        { id: "ok", s: t("Sí, | claro.", "Yes, | sure.", "Sure.") },
        { id: "breath_hard", s: t("Me | cuesta | respirar.", "(To) me | it-costs | to breathe.", "It's hard to breathe.") },
      ],
    },
    exam_ah: { lt: "Say “aaa”", items: [{ id: "ah", s: t("Aaa.", "Aah.", "Aah.") }] },
    exam_hurt: {
      lt: "Say whether it hurts",
      items: [
        { id: "hurt_yes", s: t("Sí, | me duele.", "Yes, | it hurts (me).", "Yes, it hurts.") },
        { id: "hurt_little", s: t("Un poco.", "A little.", "A little.") },
        { id: "hurt_no", s: t("No, | no me duele.", "No, | it doesn't hurt (me).", "No, it doesn't hurt.") },
      ],
    },
    exam_sleeve: {
      lt: "Roll up your sleeve",
      items: [
        { id: "ok", s: t("Claro.", "Sure.", "Sure.") },
        { id: "which_arm", s: t("¿Cuál | brazo?", "Which | arm?", "Which arm?") },
      ],
    },
    allergy: {
      lt: "Say whether you have drug allergies",
      items: [
        { id: "allergy_none", s: t("No | soy | {m:alérgico|f:alérgica} | a | nada.", "Not | I-am | allergic | to | anything.", "I'm not allergic to anything.") },
        { id: "allergy_pen", s: t("Soy | {m:alérgico|f:alérgica} | a | la | penicilina.", "I-am | allergic | to | — | penicillin.", "I'm allergic to penicillin.",
          { flags: { 3: "la: Spanish uses the article for a substance in general; English doesn't." } }) },
      ],
    },
    chart: {
      lt: "Confirm or correct it",
      items: [
        { id: "ok", s: t("Sí, | es | correcto.", "Yes, | it's | correct.", "Yes, that's right.") },
        { id: "allergy_none", s: t("No, | no | soy | {m:alérgico|f:alérgica} | a | nada.", "No, | not | I-am | allergic | to | anything.", "No, I'm not allergic to anything.") },
      ],
    },
    ask_dx: {
      lt: "Ask about the illness",
      items: [
        { id: "q_serious", s: t("¿Es | grave?", "Is it | serious?", "Is it serious?") },
        { id: "q_contagious", s: t("¿Es | contagioso?", "Is it | contagious?", "Is it contagious?") },
        { id: "q_ab", s: t("¿Necesito | antibiótico?", "Do I need | antibiotic?", "Do I need antibiotics?") },
        { id: "q_what", s: t("¿Qué | tengo?", "What | do I have?", "What do I have?") },
        { id: "q_better", s: t("¿Cuándo | voy a | estar | mejor?", "When | am I going to | be | better?", "When will I feel better?") },
        { id: "q_work", s: t("¿Puedo | ir | a | trabajar?", "Can I | go | to | work?", "Can I go to work?") },
        { id: "q_note", s: t("¿Me | da | un | justificante | para | el | trabajo?", "(To) me | you-give | a | doctor's note | for | — | work?", "Can I get a note for work?",
          { flags: { 3: FLAG_NOTE, 5: "el trabajo: English says “for work”, no article." } }) },
        { id: "q_not_better", s: t("¿Y | si | no mejoro?", "And | if | I don't get better?", "What if I don't get better?") },
        { id: "q_eat", s: t("¿Qué | puedo | comer?", "What | can I | eat?", "What can I eat?") },
        { id: "q_exercise", s: t("¿Puedo | meterme | al | mar?", "Can I | get in | into the | sea?", "Can I go in the ocean?") },
      ],
    },
    ask_rx: {
      lt: "Ask about the medicine",
      items: [
        { id: "q_dose", s: t("¿Cada | cuánto | me lo | tomo?", "Every | how much | it (for me) | I-take?", "How often do I take it?") },
        { id: "q_meals", s: t("¿Antes | o | después | de | comer?", "Before | or | after | — | eating?", "Before or after meals?", { flags: { 3: "de: “después de comer” = after eating; English needs no word here." } }) },
        { id: "q_how_long", s: t("¿Por | cuántos | días?", "For | how many | days?", "For how long?") },
        { id: "q_side", s: t("¿Tiene | efectos | secundarios?", "Does it have | effects | side?", "Are there any side effects?") },
        { id: "q_alcohol", s: t("¿Puedo | tomar | alcohol?", "Can I | drink | alcohol?", "Can I drink alcohol with it?"), note: "tomar = to take (a medicine) and also to drink." },
        { id: "q_drive", s: t("¿Puedo | manejar?", "Can I | drive?", "Can I drive?") },
        { id: "q_cost", s: t("¿Cuánto | es | la | consulta?", "How much | is | the | visit?", "How much is the visit?") },
      ],
    },
    pharmacy: {
      lt: "Say whether you know a pharmacy",
      items: [
        { id: "ph_name", s: t("Sí, | la | Farmacia del Puerto.", "Yes, | the | Farmacia del Puerto.", "Yes, Farmacia del Puerto.") },
        { id: "ph_other", s: t("Sí, | hay | una | cerca | de | mi | hotel.", "Yes, | there-is | one | near | — | my | hotel.", "Yes, there's one near my hotel.", { flags: { 4: "cerca de = near; English needs no word for de." } }) },
        { id: "ph_new", s: t("No, | ¿dónde | hay | una?", "No, | where | is there | one?", "No, where's one?") },
      ],
    },
    note: {
      lt: "Say whether you need a note for work",
      items: [
        { id: "note_yes", s: t("Sí, | para | el | trabajo.", "Yes, | for | — | work.", "Yes, for work.", { flags: { 2: "el trabajo: English says “for work”, no article." } }) },
        { id: "note_no", s: t("No, | estoy | de vacaciones.", "No, | I-am | on vacation.", "No, I'm on vacation.") },
      ],
    },
    rx_ok: {
      lt: "Say okay, or ask a question",
      items: [
        { id: "clear", s: t("Todo | claro, | gracias.", "All | clear, | thanks.", "That's clear, thank you.") },
        { id: "no_q", s: t("No, | ninguna | pregunta.", "No, | no | question.", "No, no questions.") },
      ],
    },
    pay: {
      lt: "Pay for the visit",
      items: [
        { id: "pay_card_short", s: t("Con | tarjeta, | por favor.", "With | card, | please.", "Card, please.") },
        { id: "take_cards", s: t("¿Acepta | tarjeta?", "Do you accept | card?", "Do you take cards?") },
        { id: "pay_cash", s: t("En efectivo.", "In cash.", "Cash.") },
        { id: "here_you_go", s: t("Aquí tiene.", "Here you go.", "Here you go.") },
        { id: "pay_transfer", s: t("¿Le | puedo | hacer | una | transferencia?", "(To) you | can I | make | a | transfer?", "Can I send you a bank transfer?"), note: "Bank transfers from a phone are very common in Mexico." },
        { id: "q_receipt", s: t("¿Me | da | un | recibo?", "(To) me | you-give | a | receipt?", "Can I have a receipt?") },
      ],
    },
    closing: {
      lt: "Thank her and say goodbye",
      items: [
        { id: "thanks", s: t("Muchas | gracias, | doctora.", "Many | thanks, | doctor.", "Thank you so much, doctor.") },
        { id: "bye", s: t("Hasta luego.", "See you later.", "Goodbye.") },
      ],
    },
    dob: {
      lt: "Say your date of birth",
      items: [
        { id: "dob", s: t("El | 4 | de | junio | de | 1980.", "The | 4th | of | June | of | 1980.", "June 4th, 1980.", { say: "El cuatro de junio de mil novecientos ochenta.", flags: { 0: "el: Spanish dates take the article; the day comes first." } }) },
      ],
    },
  },

  tips: TIPS,

  mission: [
    { lt: "Confirm your date of birth", optional: true, when: (c) => !!c.s.askDob && !dobSkipped(c), done: (c) => !!c.s.dob },
    { lt: "Say what's wrong", done: (c) => syms(c).length > 0 },
    { lt: "Answer the doctor's questions", done: (c) => syms(c).length > 0 && questionsDone(c) },
    { lt: "Do what the doctor asks during the exam", done: (c) => !!c.s.examDone },
    { lt: "Answer about drug allergies", done: (c) => !!c.s.allergy },
    { lt: "Find out how to take the medicine", done: (c) => !!c.s.rxGiven },
    { lt: "Pay for the visit", done: (c) => !!c.s.paid },
  ],

  steps: [
    // the date-of-birth check is dropped when the learner goes straight to what's wrong (or after three tries)
    { id: "dob", when: (c) => !!c.s.askDob && !dobSkipped(c), done: (c) => !!c.s.dob,
      ask: (c) => { c.s.dobAsks = (c.s.dobAsks ?? 0) + 1; c.say(c.s.dobPartial && !c.s.dobYear ? "dob_year" : c.s.dobYear && !c.s.dobPartial ? "dob_daymonth" : "ask_dob"); },
      expects: ["dob_ans", "dob_ctx", "year_ctx"],
      suggest: [{ lt: "Say your date of birth (day, month, year)", hint: "dob" }] },
    { id: "problem", done: (c) => syms(c).length > 0,
      ask: (c) => { c.s.problemAsked = (c.s.problemAsked ?? 0) + 1; c.say("ask_problem"); },
      expects: ["symptom", "symptom_ctx", "feel_sick", "sym_neg", "temp_ans", "help_me"],
      suggest: [{ lt: "Say what's wrong", hint: "symptom", options: "symptom" }],
      help: (c) => { c.say("problem_help"); } },
    { id: "more_sym", when: (c) => !!c.s.askMore && syms(c).length === 1, done: (c) => !!c.s.moreDone,
      ask: (c) => { askMoreSym(c); },
      expects: ["symptom", "symptom_ctx", "sym_none", "sym_none_ctx", "sym_neg"],
      suggest: [{ lt: "Name other symptoms (or say that's all)", hint: "more_sym", options: "symptom" }, { lt: "Say yes or no", hint: "g_yesno" }],
      yes: (c) => { c.say("what_else_sym"); c.hold(); },
      no: (c) => { c.s.moreDone = true; c.say("sym_ack"); } },
    { id: "howlong", when: (c) => syms(c).length > 0, done: (c) => c.s.days !== undefined,
      ask: (c) => c.say(c.s.howlongVariant === "when" ? "ask_when" : "ask_howlong"),
      expects: ["howlong_ans", "howlong_ctx"],
      suggest: [{ lt: "Say how long you've had it", hint: "howlong" }],
      help: (c) => { c.say("howlong_help"); } },
    { id: "scale", when: (c) => !!c.s.askScale && painful(c), done: (c) => c.s.scale !== undefined,
      ask: (c) => c.say("ask_scale"),
      expects: ["scale_ctx"],
      suggest: [{ lt: "Rate the pain from 1 to 10", hint: "scale" }],
      help: (c) => { c.say("scale_help"); } },
    { id: "fever", when: (c) => syms(c).length > 0, done: (c) => feverDone(c),
      ask: (c) => {
        if (c.s.fever !== true) { c.s.tempQ = "fever"; c.say("ask_fever"); return; }
        if (c.s.tempTook) { c.s.tempQ = "how"; c.say("ask_temp_how"); return; }
        if (c.s.tempQ === "how" || c.s.howFirst) { c.s.tempQ = "how"; c.say("ask_temp_high"); return; }
        c.s.tempQ = "took"; c.say("ask_temp_took");
      },
      expects: ["temp_ans", "temp_ctx", "fever_yes_ctx", "temp_unknown", "temp_dunno_ctx", "symptom", "symptom_ctx", "sym_neg"],
      suggest: [{ lt: "Say your temperature (or that you didn't take it)", hint: "fever" }, { lt: "Say yes or no", hint: "g_yesno" }],
      yes: (c) => {
        if (c.s.fever !== true) { c.s.fever = true; return; }
        if (c.s.tempQ === "took") c.s.tempTook = true;
      },
      no: (c) => {
        if (c.s.fever !== true) { c.s.fever = false; c.say("fever_none"); return; }
        tempUnknown(c);
      },
      // "No sé" to the temperature: she'll take it herself
      help: (c) => { tempUnknown(c); } },
    { id: "meds", when: (c) => syms(c).length > 0, done: (c) => !!c.s.meds,
      ask: (c) => c.say("ask_meds"),
      expects: ["meds_ans", "meds_ctx"],
      suggest: [{ lt: "Say whether you're taking anything", hint: "meds" }, { lt: "Say yes or no", hint: "g_yesno" }],
      yes: (c) => {
        c.say("ask_meds_what");
        c.expect({ id: "meds_what", expects: ["meds_ans", "meds_ctx"], hints: ["meds"], suggest: [{ lt: "Say what you're taking", hint: "meds" }],
          on: { meds_ans: (cc, _sl, sg) => { setMeds(cc, sg.tags); }, meds_ctx: (cc, _sl, sg) => { setMeds(cc, sg.tags); } },
          no: (cc) => { cc.s.meds = "none"; cc.say("ok_plain"); },
          ask: (cc) => cc.say("ask_meds_what") });
      },
      no: (c) => { c.s.meds = "none"; c.say("ok_plain"); },
      help: (c) => { c.say("meds_help"); } },
    { id: "exam", when: (c) => syms(c).length > 0, done: (c) => !!c.s.examDone,
      ask: (c) => { examStep(c); } },
    { id: "allergy", when: (c) => !!c.s.examDone, done: (c) => !!c.s.allergy,
      ask: (c) => {
        if (c.s.introFirst || c.s.chartTwist) rxIntro(c);
        if (c.s.chartTwist && kind(c) === "ab" && !c.s.chartAsked) {
          c.s.chartAsked = true;
          c.twist("chart");
          c.say("allergy_chart");
          c.expect({ id: "chart", expects: ["allergy_ans", "allergy_ctx", "allergy_dunno_ctx", "chart_ctx"], hints: ["chart", "allergy", "g_yesno"],
            suggest: [{ lt: "Confirm or correct it", hint: "chart" }, { lt: "Say yes or no", hint: "g_yesno" }],
            on: { allergy_ans: (cc, _sl, sg) => { chartAnswer(cc, sg.tags); }, allergy_ctx: (cc, _sl, sg) => { chartAnswer(cc, sg.tags); }, chart_ctx: (cc, _sl, sg) => { chartAnswer(cc, sg.tags); }, allergy_dunno_ctx: (cc) => { chartAnswer(cc, ["unsure"]); } },
            yes: (cc) => { chartAnswer(cc, ["pen"]); },
            no: (cc) => { chartAnswer(cc, ["none"]); },
            ask: (cc) => cc.say("allergy_chart") });
          return;
        }
        if (!c.s.allergyAsked && !c.s.introFirst) { c.s.allergyAsked = true; c.say("ask_allergy_first"); return; }
        c.s.allergyAsked = true;
        c.say("ask_allergy");
      },
      expects: ["allergy_ans", "allergy_ctx", "allergy_dunno_ctx"],
      suggest: [{ lt: "Say whether you have drug allergies", hint: "allergy" }, { lt: "Say yes or no", hint: "g_yesno" }],
      yes: (c) => {
        c.say("allergy_which");
        c.expect({ id: "allergy_which", expects: ["allergy_ans", "allergy_ctx", "allergy_dunno_ctx"], hints: ["allergy"], suggest: [{ lt: "Say what you're allergic to", hint: "allergy" }],
          on: { allergy_ans: (cc, _sl, sg) => { setAllergy(cc, sg.tags); }, allergy_ctx: (cc, _sl, sg) => { setAllergy(cc, sg.tags); }, allergy_dunno_ctx: (cc) => { setAllergy(cc, ["unsure"]); } },
          no: (cc) => { setAllergy(cc, ["none"]); },
          ask: (cc) => cc.say("allergy_which") });
      },
      no: (c) => { setAllergy(c, ["none"]); },
      help: (c) => { setAllergy(c, ["unsure"]); askNext(c); } },
    { id: "rx", when: (c) => !!c.s.examDone && !!c.s.allergy, done: (c) => !!c.s.rxGiven,
      ask: (c) => { giveRx(c); },
      // after the directions (when no "¿Tiene alguna pregunta?" follows): okay, or a question
      suggest: [{ lt: "Say okay, or ask a question", hint: "rx_ok" }, { lt: "Ask about the medicine", hint: "ask_rx" }] },
    { id: "pharmacy", when: (c) => !!c.s.rxGiven && !!c.s.askPharmacy, done: (c) => !!c.s.pharmacy,
      ask: (c) => c.say("ask_pharmacy"),
      expects: ["pharmacy_ans", "pharmacy_dunno_ctx"],
      suggest: [{ lt: "Say whether you know a pharmacy", hint: "pharmacy" }, { lt: "Say yes or no", hint: "g_yesno" }],
      yes: (c) => { c.s.pharmacy = "other"; c.say("pharmacy_other"); pharmacyEnd(c); },
      no: (c) => { c.s.pharmacy = "harbor"; c.say("pharmacy_suggest"); pharmacyEnd(c); },
      help: (c) => { c.s.pharmacy = "harbor"; c.say("pharmacy_suggest"); pharmacyEnd(c); } },
    // offered once: if the learner talks about something else, the offer is simply dropped
    { id: "note", when: (c) => !!c.s.rxGiven && !!c.s.offerNote && !!c.s.dx && CONTAGIOUS[c.s.dx as Dx] && c.s.note === undefined, done: (c) => !!c.s.noteOffered,
      ask: (c) => {
        c.s.noteOffered = true;
        c.say("ask_note");
        c.expect({ id: "note", optional: true, expects: ["note_ctx", "ask_note"], hints: ["note", "g_yesno"],
          suggest: [{ lt: "Say whether you need a note for work", hint: "note" }, { lt: "Say yes or no", hint: "g_yesno" }],
          on: { note_ctx: (cc, sl, sg) => { doctor.handlers.note_ctx(cc, sl, sg); }, ask_note: (cc) => { giveNote(cc); } },
          yes: (cc) => { giveNote(cc); },
          no: (cc) => { cc.s.note = false; cc.say("note_no_ok"); } });
      } },
    { id: "questions", when: (c) => !!c.s.rxGiven && !!c.s.askMoreQ, done: (c) => !!c.s.moreQAsked,
      ask: (c) => { c.s.moreQAsked = true; c.say("ask_more_q"); c.expect(questionsPending("questions")); } },
    // a private clinic: the visit is paid at the end
    { id: "pay", when: (c) => !!c.s.rxGiven, done: (c) => !!c.s.paid,
      ask: (c) => {
        if (c.s.payQuiet) { c.s.payQuiet = undefined; return; } // payNow: the fee was just dealt with this turn
        if (!c.s.totalSaid) { c.s.totalSaid = true; c.say("consult_price", { price: FEE }); if (!c.s.payMethod) c.say("ask_pay_method"); return; }
        const cashIn = (c.s.cashIn as number | undefined) ?? 0;
        // part of it in cash already: what's left ("Faltan $300"), never "Son $300" after "son $500"
        if (c.s.payMethod === "cash") c.say(cashIn > 0 ? "left_is" : "cash_wait", { price: FEE - cashIn });
        else c.say("pay_method_again");
      },
      expects: ["pay_card", "pay_cash", "pay_transfer", "here_you_go", "here_you_go_ctx", "no_cash", "no_cash_ctx", "no_card", "ask_cost", "ask_receipt"],
      suggest: [{ lt: "Pay for the visit", hint: "pay" }] },
  ],

  init: (c) => {
    c.s.syms = [];
    c.s.neg = [];
    c.s.askDob = c.chance(0.3);
    c.s.feelingOpener = !c.s.askDob && c.chance(0.3);
    c.s.askMore = c.chance(0.5);
    c.s.askScale = c.chance(0.35);
    c.s.howlongVariant = c.chance(0.3) ? "when" : "long";
    c.s.howFirst = c.chance(0.4);
    c.s.askPharmacy = c.chance(0.45);
    c.s.offerNote = c.chance(0.35);
    c.s.askQ = c.chance(0.4);
    c.s.askMoreQ = !c.s.askQ && c.chance(0.35);
    c.s.breathTwice = c.chance(0.5);
    c.s.introFirst = c.chance(0.5);
    c.s.bpTwist = c.visits >= 1 && c.chance(0.35);
    c.s.chartTwist = c.visits >= 1 && c.chance(0.35);
  },

  start: (c) => {
    if (c.s.askDob) { c.say(c.visits >= 1 ? "greet_back_hi" : "greet_hi"); return; }
    if (c.s.feelingOpener) {
      c.say(c.visits >= 1 ? "greet_back_feeling" : "greet_feeling");
      c.expect({
        id: "feeling", optional: true, expects: ["g_howareyou_answer", "g_howareyou_bad", "feel_sick", "feel_bad_ctx", "symptom", "symptom_ctx"],
        hints: ["feeling", "symptom"],
        suggest: [{ lt: "Say how you feel (and what's wrong)", hint: "feeling" }, { lt: "Say what's wrong", hint: "symptom", options: "symptom" }],
        on: {
          g_howareyou_bad: (cc) => { sorry(cc); },
          g_howareyou_answer: (cc) => { if (/\b(y usted|usted\?|y t[uú])\b/i.test(cc.heard)) cc.say("g_asked_back"); feelingFine(cc); },
          g_ok: (cc) => { feelingFine(cc); },
        },
        yes: (cc) => { feelingFine(cc); },
        no: (cc) => { sorry(cc); },
      });
      return;
    }
    c.say(c.visits >= 1 && c.chance(0.6) ? "greet_back" : "greet");
    c.hold();
  },

  handlers: {
    symptom(c, slots, seg) {
      if (slots.neg) doctor.handlers.sym_neg(c, { symptom: slots.neg }, { intent: "sym_neg", slots: {}, tags: [] });
      addSyms(c, symsFrom(slots, seg.tags), slots, seg.tags);
    },
    symptom_ctx(c, slots, seg) { addSyms(c, symsFrom(slots, seg.tags), slots, seg.tags); },
    sym_neg(c, slots, seg) {
      const list = symsFrom(slots, seg.tags);
      for (const s of list) {
        if (!(c.s.neg as string[]).includes(s)) (c.s.neg as string[]).push(s);
        const i = syms(c).indexOf(s);
        if (i >= 0 && !c.s.examDone) syms(c).splice(i, 1);
      }
      if (list.includes("fever") && c.s.temp === undefined) {
        c.s.fever = false;
        if (c.step === "fever") { c.say("fever_none"); return; }
      }
      if (c.step === "more_sym") c.s.moreDone = true;
      if (firstThisTurn(c, "ack")) c.say("sym_ack");
    },
    sym_none(c) { c.s.moreDone = true; c.say("sym_ack"); },
    sym_none_ctx(c) { c.s.moreDone = true; c.say("sym_ack"); },
    feel_sick(c) {
      if (syms(c).length) { if (firstThisTurn(c, "ack")) c.say("sym_ack"); return; }
      if (c.s.sorrySaid) c.say("ask_problem"); else { c.s.sorrySaid = true; c.say("feel_sick_q"); }
      c.expect({ id: "sick_q", expects: ["symptom", "symptom_ctx", "sym_neg"], hints: ["symptom"], suggest: [{ lt: "Say your symptoms", hint: "symptom", options: "symptom" }],
        on: {
          symptom: (cc, sl, sg) => { doctor.handlers.symptom(cc, sl, sg); },
          symptom_ctx: (cc, sl, sg) => { doctor.handlers.symptom_ctx(cc, sl, sg); },
        },
        ask: (cc) => cc.say("ask_problem") });
    },
    help_me(c) {
      // on its own ("Tengo una pregunta") she invites it; followed by the question, the question is answered
      if (/(ayudar|ayuda|pregunta|duda|cosa|algo|problema|doctora)[\s.!?,]*$/i.test(c.heard.trim())) { c.say("go_ahead"); c.hold(); }
    },
    feel_bad_ctx(c) { doctor.handlers.feel_sick(c, {}, { intent: "feel_sick", slots: {}, tags: [] }); },
    nice_meet(c) {
      // "Igualmente" to "¡Que se mejore!" at the end is a goodbye
      if (c.s.__finished) { c.say("g_bye"); c.end(); c.hold(); }
    },

    howlong_ans(c, slots, seg) {
      const d = daysFromTags(seg.tags, slots) ?? 3;
      if (c.s.days !== undefined && c.step !== "howlong") { c.s.days = d; c.say("sym_ack"); return; }
      setDays(c, d);
    },
    howlong_ctx(c, slots, seg) { doctor.handlers.howlong_ans(c, slots, seg); },
    scale_ctx(c, slots, seg) {
      let n: number | undefined = typeof slots.n === "number" ? slots.n : undefined;
      if (typeof slots.n2 === "number" && n !== undefined) n = Math.round((n + slots.n2) / 2);
      for (const tg of seg.tags) { const m = tg.match(/^sc(\d+)$/); if (m && n === undefined) n = Number(m[1]); }
      if (n === undefined || n > 10) { c.say("scale_help"); c.hold(); return; }
      c.s.scale = n;
      c.say(n >= 7 ? "scale_high" : n <= 3 ? "scale_low" : "scale_mid");
    },

    temp_ans(c, slots, seg) {
      // a temperature said as the complaint ("Tengo 38 de fiebre") counts as feeling feverish, even when it turns out normal
      const tv = slots.temp as { v: number } | undefined;
      const high = tv && (tv.v >= 99.5 || (tv.v >= 37.5 && tv.v <= 43));
      if (!syms(c).includes("fever") && (high || !syms(c).length)) syms(c).push("fever");
      const d = daysFromTags(seg.tags, slots);
      if (d !== undefined && c.s.days === undefined) setDays(c, d, true);
      if (tv) setTemp(c, slots.temp);
    },
    temp_ctx(c, slots, seg) { doctor.handlers.temp_ans(c, slots, seg); },
    fever_yes_ctx(c) {
      if (c.s.fever !== true) { c.s.fever = true; if (!syms(c).includes("fever")) syms(c).push("fever"); return; }
      if (c.s.tempQ === "took") c.s.tempTook = true;
    },
    temp_unknown(c) { tempUnknown(c); },
    temp_dunno_ctx(c) { tempUnknown(c); },

    meds_ans(c, _slots, seg) { setMeds(c, seg.tags); },
    meds_ctx(c, _slots, seg) { setMeds(c, seg.tags); },
    allergy_ans(c, _slots, seg) { setAllergy(c, seg.tags); },
    allergy_ctx(c, _slots, seg) { setAllergy(c, seg.tags); },
    allergy_dunno_ctx(c) { setAllergy(c, ["unsure"]); },
    chart_ctx(c, _slots, seg) { chartAnswer(c, seg.tags); },

    // exam answers heard outside their question
    ready_ctx(c) { c.say("ok_plain"); },
    like_this_ctx(c) { c.say("ok_plain"); },
    breath_ctx(c) { c.say("ok_plain"); },
    breath_hard(c) { c.say("breath_easy"); },
    ah_ctx(c) { c.say("ok_plain"); },
    hurt_yes_ctx(c) { c.say("sym_ack"); },
    hurt_little_ctx(c) { c.say("sym_ack"); },
    hurt_no_ctx(c) { c.say("sym_ack"); },
    which_arm_ctx(c) { c.say("bp_either_arm"); },

    ask_serious(c) {
      if (!c.s.examDone) { c.say("exam_first"); return; }
      c.say("serious_no");
      if (firstThisTurn(c, "fine")) c.say("fine_soon");
    },
    ask_contagious(c) {
      if (!c.s.examDone) { c.say("exam_first"); return; }
      if (CONTAGIOUS[c.s.dx as Dx]) { c.say("contagious_yes"); c.say("contagious_advice"); c.s.stayHomeSaid = true; }
      else c.say("contagious_no");
    },
    ask_antibiotics(c) {
      if (!c.s.examDone) { c.say("exam_first"); return; }
      if (kind(c) === "ab") c.say("ab_yes");
      else if (dx(c) === "virus") { c.say("ab_no"); c.say("is_virus"); }
      else c.say("ab_no");
    },
    ask_what(c, _slots, seg) {
      if (!c.s.examDone) { c.say("exam_first"); return; }
      if (seg.tags.includes("dengue")) { c.say("dx_dengue"); c.s.comeBackSaid = true; return; }
      c.say("dx_" + dx(c));
    },
    ask_better(c) {
      if (!c.s.examDone) { c.say("exam_first"); return; }
      c.say(kind(c) === "ab" ? "better_ab" : dx(c) === "back" ? "better_back" : "better_week");
    },
    ask_work(c) {
      if (!c.s.examDone) { c.say("exam_first"); return; }
      if (CONTAGIOUS[c.s.dx as Dx]) { c.say("work_home"); c.s.stayHomeSaid = true; }
      else c.say(dx(c) === "back" ? "work_back" : "work_ok");
    },
    ask_note(c) {
      if (c.step === "note") { giveNote(c); return; }
      if (!c.s.examDone) { c.s.noteWanted = true; c.say("note_later"); return; }
      giveNote(c);
    },
    ask_not_better(c) { c.say("come_back_q"); c.s.comeBackSaid = true; },
    ask_eat(c) { c.say(dx(c) === "stomach" ? "eat_stomach" : "eat_any"); },
    ask_exercise(c) { if (!c.s.examDone) { c.say("exam_first"); return; } c.say("exercise_no"); },
    ask_cost(c, _slots, seg) {
      if (c.s.paid) { c.say("paid_already"); return; }
      // after the directions the fee is due now: the price and how to pay, said once
      const cashIn = (c.s.cashIn as number | undefined) ?? 0;
      if (c.s.rxGiven && cashIn > 0) { c.say("left_is", { price: FEE - cashIn }); payNow(c); return; }
      if (c.s.rxGiven) {
        c.s.totalSaid = true;
        c.say("consult_price", { price: FEE });
        if (seg.tags.includes("ins")) c.say("ins_receipt");
        if (!c.s.payMethod && firstThisTurn(c, "method")) c.say("ask_pay_method");
        payNow(c);
        return;
      }
      c.say("cost_info", { price: FEE });
      if (seg.tags.includes("ins")) c.say("ins_receipt");
    },

    ask_dosage(c) {
      if (c.s.rxGiven) { sayDose(c); return; }
      c.say(c.s.examDone ? "explain_soon" : "dose_first");
    },
    ask_meals(c) {
      if (c.s.rxGiven) { c.say("meals_after"); return; }
      c.say(c.s.examDone ? "explain_soon" : "dose_first");
    },
    ask_duration(c) {
      if (c.s.rxGiven) { if (kind(c) === "ab") { c.say("dose_days"); c.say("dose_finish"); } else sayDays(c); return; }
      c.say(c.s.examDone ? "explain_soon" : "dose_first");
    },
    ask_side(c) {
      if (!c.s.examDone) { c.say("dose_first"); return; }
      const k = kind(c);
      if (k === "ab") { c.say("side_ab"); c.say("side_rash"); }
      else if (k === "sym") c.say("side_sym");
      else if (k === "pain") c.say("side_ab");
      else c.say("side_none");
    },
    ask_alcohol(c) { if (!c.s.examDone) { c.say("dose_first"); return; } c.say("alcohol"); },
    ask_drive(c) { if (!c.s.examDone) { c.say("dose_first"); return; } c.say(kind(c) === "sym" ? "drive_careful" : "drive_ok"); },
    clear_ctx(c) { c.s.questionsDone = true; okOnce(c); },

    pharmacy_ans(c, _slots, seg) {
      if (c.s.pharmacy) { c.say("ok_plain"); return; }
      if (seg.tags.includes("other") || seg.tags.includes("any")) { c.s.pharmacy = "other"; c.say("pharmacy_other"); }
      else if (seg.tags.includes("unknown")) { c.s.pharmacy = "harbor"; c.say("pharmacy_suggest"); }
      else { c.s.pharmacy = "harbor"; c.say("pharmacy_harbor"); }
      pharmacyEnd(c);
    },
    pharmacy_dunno_ctx(c) { doctor.handlers.pharmacy_ans(c, {}, { intent: "pharmacy_ans", slots: {}, tags: ["unknown"] }); },
    note_ctx(c, _slots, seg) {
      if (seg.tags.includes("no")) { c.s.note = false; c.say("note_no_ok"); return; }
      giveNote(c);
    },
    dob_ans(c, slots) { setDob(c, slots); },
    dob_ctx(c, slots) { setDob(c, slots); },
    year_ctx(c, slots) { setDob(c, slots); },

    // --- paying
    pay_card(c, _slots, seg) { choosePay(c, "card", seg.tags); },
    pay_transfer(c, _slots, seg) { choosePay(c, "transfer", seg.tags); },
    pay_cash(c, _slots, seg) { choosePay(c, "cash", seg.tags); },
    no_cash(c) {
      if (c.s.paid) { c.say("paid_already"); return; }
      if (!c.s.rxGiven) { c.say("no_cash_ok"); return; }
      if (c.s.payMethod === "cash") c.s.payMethod = undefined;
      c.say("no_cash_ok"); payNow(c);
    },
    no_cash_ctx(c, slots, seg) { doctor.handlers.no_cash(c, slots, seg); },
    no_card(c) {
      if (c.s.paid) { c.say("paid_already"); return; }
      if (!c.s.rxGiven) { c.say("no_card_ok"); return; }
      if (c.s.payMethod === "card") c.s.payMethod = undefined;
      c.say("no_card_ok"); payNow(c);
    },
    here_you_go(c, slots) { handMoney(c, slots.price as number | undefined); },
    here_you_go_ctx(c) { handMoney(c, undefined); },
    ask_receipt(c, _slots, seg) {
      if (seg.tags.includes("fact")) { c.say("factura_desk"); return; }
      c.say(c.s.paid ? "receipt_ok" : "receipt_later");
    },

    // "No muy bien. Me duele la garganta.": one "Lo siento" for the whole answer
    g_howareyou_bad(c) { sorry(c); },
    // Thanks and goodbyes: once the visit is paid, "Gracias, adiós" gets the doctor's wrap-up; before paying, the fee.
    g_thanks(c) { c.say("g_welcome"); if (c.s.__finished || c.s.wrapped) c.hold(); },
    g_bye(c) {
      if (c.s.rxGiven && !c.s.paid) { c.s.totalSaid = true; c.say("pay_first", { price: FEE }); payNow(c); return; }
      if (c.s.paid && !c.s.wrapped) wrapUp(c);
      else c.say("g_bye");
      c.end(); c.hold();
    },
  },

  finish: (c) => {
    c.complete();
    wrapUp(c);
    c.expect({ id: "closing", optional: true, hints: ["closing", "g_social"], suggest: [{ lt: "Thank her and say goodbye", hint: "closing" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
        nice_meet: (cc) => { cc.say("g_bye"); cc.end(); },
        ask_receipt: (cc) => { cc.say("receipt_ok"); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // hint patterns and the song phrase
    { say: "Tengo dolor de garganta y fiebre", intent: "symptom", step: "problem" },
    { say: "Tengo dolor de garganta", intent: "symptom", slots: { syms: { symptom: "sore_throat" } } },
    { say: "Tengo dolor de estómago", intent: "symptom", slots: { syms: { symptom: "stomachache" } } },
    { say: "Me duele la garganta", intent: "symptom", step: "problem", slots: { part: "sore_throat" } },
    { say: "Me duele el oído izquierdo", intent: "symptom", slots: { part: "earache" } },
    { say: "Me duele al tragar", intent: "symptom" },
    { say: "Estoy mareada", intent: "symptom" },
    { say: "Estoy muy cansado", intent: "symptom" },
    { say: "No puedo dejar de toser", intent: "symptom" },
    { say: "Me escurre la nariz", intent: "symptom" },
    { say: "Tengo gripa", intent: "symptom", slots: { syms: { symptom: "cold" } } },
    { say: "Tengo gripe", intent: "symptom", slots: { syms: { symptom: "cold" } } },
    { say: "No me siento bien", intent: "feel_sick", step: "problem" },
    { say: "Dolor de garganta", intent: "symptom_ctx", step: "problem" },
    { say: "Tengo 38 de fiebre", intent: "temp_ans", slots: { temp: { v: 38 } } },
    // how long, scale, temperature
    { say: "Desde ayer", intent: "howlong_ans", step: "howlong" },
    { say: "Desde hace tres días", intent: "howlong_ans", step: "howlong", slots: { n: 3 } },
    { say: "Desde el lunes", intent: "howlong_ans", step: "howlong" },
    { say: "Como una semana", intent: "howlong_ans", step: "howlong" },
    { say: "Ya llevo cuatro días así", intent: "howlong_ans", step: "howlong", slots: { n: 4 } },
    { say: "Como un seis", intent: "scale_ctx", step: "scale", slots: { n: 6 } },
    { say: "Muy fuerte", intent: "scale_ctx", step: "scale" },
    { say: "Sí, tengo fiebre de 38", intent: "temp_ans", step: "fever", slots: { temp: { v: 38 } } },
    { say: "Treinta y ocho y medio", intent: "temp_ctx", step: "fever", slots: { temp: { v: 38.5 } } },
    { say: "Tuve 38.2 anoche", intent: "temp_ctx", step: "fever", slots: { temp: { v: 38.2 } } },
    { say: "Ciento uno Fahrenheit", intent: "temp_ctx", step: "fever", slots: { temp: { v: 101, unit: "f" } } },
    { say: "No me la tomé", intent: "temp_unknown", step: "fever" },
    { say: "No tengo termómetro", intent: "temp_unknown", step: "fever" },
    // medicines, allergies
    { say: "No, no tomo nada", intent: "meds_ans", step: "meds" },
    { say: "Solo paracetamol", intent: "meds_ans", step: "meds" },
    { say: "Tomé ibuprofeno", intent: "meds_ans", step: "meds" },
    { say: "Me he tomado un ibuprofeno", intent: "meds_ans", step: "meds" },
    { say: "No soy alérgico a nada", intent: "allergy_ans", step: "allergy" },
    { say: "Soy alérgica a la penicilina", intent: "allergy_ans", step: "allergy" },
    // the learner's questions
    { say: "¿Es grave?", intent: "ask_serious" },
    { say: "¿Es contagioso?", intent: "ask_contagious" },
    { say: "¿Necesito antibiótico?", intent: "ask_antibiotics" },
    { say: "¿Qué tengo?", intent: "ask_what" },
    { say: "¿Es dengue?", intent: "ask_what" },
    { say: "¿Cuándo voy a estar mejor?", intent: "ask_better" },
    { say: "¿Puedo ir a trabajar?", intent: "ask_work" },
    { say: "¿Me da un justificante para el trabajo?", intent: "ask_note" },
    { say: "¿Me puedes dar un justificante?", intent: "ask_note" },
    { say: "¿Y si no mejoro?", intent: "ask_not_better" },
    { say: "¿Qué puedo comer?", intent: "ask_eat" },
    { say: "¿Puedo meterme al mar?", intent: "ask_exercise" },
    { say: "¿Cada cuánto me lo tomo?", intent: "ask_dosage" },
    { say: "¿Antes o después de comer?", intent: "ask_meals" },
    { say: "¿Por cuántos días?", intent: "ask_duration" },
    { say: "¿Tiene efectos secundarios?", intent: "ask_side" },
    { say: "¿Puedo tomar alcohol?", intent: "ask_alcohol" },
    { say: "¿Puedo manejar?", intent: "ask_drive" },
    { say: "¿Cuánto es la consulta?", intent: "ask_cost" },
    // the prescription, the note, paying
    { say: "Sí, la Farmacia del Puerto", intent: "pharmacy_ans", step: "pharmacy" },
    { say: "Sí, hay una cerca de mi hotel", intent: "pharmacy_ans", step: "pharmacy" },
    { say: "No, ¿dónde hay una?", intent: "pharmacy_ans", step: "pharmacy" },
    { say: "Con tarjeta, por favor", intent: "pay_card", step: "pay" },
    { say: "¿Acepta tarjeta?", intent: "pay_card", step: "pay" },
    { say: "En efectivo", intent: "pay_cash", step: "pay" },
    { say: "Aquí tiene", intent: "here_you_go_ctx", step: "pay" },
    { say: "Aquí tiene quinientos", intent: "here_you_go", step: "pay", slots: { price: 50000 } },
    { say: "¿Le puedo hacer una transferencia?", intent: "pay_transfer", step: "pay" },
    { say: "¿Me da un recibo?", intent: "ask_receipt", step: "pay" },
    { say: "Muchas gracias, doctora", intent: "g_thanks" },
    // Spain forms (vosotros, a Spain word, vale, constipado, catarro)
    { say: "Estoy constipado", intent: "symptom" },
    { say: "Tengo catarro", intent: "symptom" },
    { say: "¿Puedo conducir?", intent: "ask_drive" },
    { say: "Vale, con tarjeta", intent: "pay_card", step: "pay" },
    { say: "¿Aceptáis tarjeta?", intent: "pay_card", step: "pay" },
    // never flip the meaning
    { say: "No tengo fiebre", step: "problem", intent: "sym_neg", not: ["symptom", "symptom_ctx", "temp_ans"] },
    { say: "No me duele la cabeza", step: "problem", intent: "sym_neg", not: ["symptom", "symptom_ctx"] },
    { say: "No tengo fiebre, pero me duele la garganta", intent: "symptom", slots: { part: "sore_throat" } },
    { say: "No soy alérgica a la penicilina", step: "allergy", intent: "allergy_ans", not: ["allergy_ctx"] },
    { say: "No traigo efectivo", step: "pay", intent: "no_cash", not: ["pay_cash"] },
    { say: "No tengo tarjeta", step: "pay", intent: "no_card", not: ["pay_card"] },
    { say: "No quiero pagar con tarjeta", step: "pay", intent: "no_card", not: ["pay_card"] },
    { say: "No tomo alcohol", intent: "none", not: ["ask_alcohol"] },
    { say: "Tengo 45 años", step: "dob", intent: "none", not: ["temp_ans", "temp_ctx"] },
    // not understood
    { say: "Me gusta mucho la playa", intent: "none" },
    { say: "Quiero un café con leche", intent: "none" },
    { say: "Mi perro se llama Max", intent: "none" },
    // review-style traps: negations and corrections
    { say: "No tomo ibuprofeno", step: "meds", intent: "meds_ans", not: ["meds_ctx"] },
    { say: "No necesito justificante", intent: "none", not: ["ask_note"] },
    { say: "No he tenido fiebre", step: "fever", intent: "sym_neg", not: ["fever_yes_ctx", "temp_ans", "symptom"] },
    { say: "No me duele la garganta, me duele el oído", step: "problem", intent: "sym_neg" },
    { say: "No quiero pagar en efectivo", step: "pay", intent: "no_cash", not: ["pay_cash"] },
    { say: "No tengo efectivo, ¿acepta tarjeta?", step: "pay", intent: "pay_card" },
    { say: "Ya pagué en recepción", step: "pay", intent: "none", not: ["here_you_go", "pay_cash", "pay_card"] },
    // review: corrections, lost commas, past tense and what-ifs at paying; symptoms read right
    { say: "No con tarjeta, en efectivo", step: "pay", intent: "pay_cash", not: ["pay_card"] },
    { say: "No en efectivo, con tarjeta", step: "pay", intent: "pay_card", not: ["pay_cash"] },
    { say: "Tarjeta no efectivo", step: "pay", intent: "pay_cash", slots: {}, not: ["pay_card"] },
    { say: "Prefiero pagar con transferencia", step: "pay", intent: "pay_transfer" },
    { say: "¿Me da factura?", step: "pay", intent: "ask_receipt" },
    { say: "¿Cuánto falta?", step: "pay", intent: "ask_cost", not: ["here_you_go", "here_you_go_ctx"] },
    { say: "¿Y si pago con tarjeta?", step: "pay", intent: "none", not: ["pay_card"] },
    { say: "Pagué con tarjeta", step: "pay", intent: "none", not: ["pay_card"] },
    { say: "Tengo el estómago revuelto", intent: "symptom", step: "problem" },
    { say: "Me pica la garganta", intent: "symptom", step: "problem" },
    { say: "Es muy fuerte", step: "scale", intent: "scale_ctx", not: ["ask_side"] },
    { say: "¿Es fuerte el medicamento?", intent: "ask_side" },
    { say: "Ya no tengo fiebre", step: "fever", intent: "sym_neg", not: ["fever_yes_ctx", "temp_ans", "symptom"] },
    { say: "No, fiebre no, pero tos sí", step: "more_sym", intent: "symptom", slots: { neg: "fever" } },
    { say: "No, conozco otra", step: "pharmacy", intent: "pharmacy_ans" },
    { say: "No sé, soy nueva aquí", step: "pharmacy", intent: "pharmacy_dunno_ctx" },
    { say: "Empezó ayer en la noche", step: "howlong", intent: "howlong_ans" },
    // lead's check: two ways joined by "o" are a question (nothing charged); short of cash; the allergy kept;
    // a hedged temperature; numbers and dates as learners say them
    { say: "¿Puedo pagar con tarjeta o en efectivo?", step: "pay", intent: "pay_card", not: ["pay_cash"] },
    { say: "¿Acepta tarjeta o solo efectivo?", step: "pay", intent: "pay_card", not: ["pay_cash"] },
    { say: "¿Cómo le pago?", intent: "ask_cost", not: ["g_howareyou"] },
    { say: "No me alcanza", step: "pay", intent: "no_cash_ctx", not: ["pay_cash", "here_you_go"] },
    { say: "No traigo más efectivo", step: "pay", intent: "no_cash", not: ["pay_cash"] },
    { say: "Es todo lo que tengo", step: "more_sym", intent: "sym_none_ctx", not: ["no_cash", "no_cash_ctx"] },
    { say: "No, cien", step: "pay", intent: "none" },
    { say: "No sé, como 38", step: "fever", intent: "temp_ctx", slots: { temp: { v: 38 } }, not: ["temp_dunno_ctx", "temp_unknown"] },
    { say: "Soy alérgico a la penicilina, no tengo otras alergias", step: "allergy", intent: "allergy_ans" },
    { say: "Solo a la penicilina, a nada más", step: "allergy", intent: "allergy_ans" },
    { say: "No sé si soy alérgica a la penicilina", step: "allergy", intent: "allergy_ans", not: ["allergy_dunno_ctx"] },
    { say: "Un siete u ocho", step: "scale", intent: "scale_ctx", slots: { n: 7, n2: 8 } },
    { say: "Desde hace unas horas", step: "howlong", intent: "howlong_ans" },
    { say: "Nací en 1980", step: "dob", intent: "year_ctx", slots: { year: 1980 } },
    { say: "Junio 4 de 1980", step: "dob", intent: "dob_ans", slots: { date: { day: 4, month: 6 }, year: 1980 } },
  ],

  sims: [
    // Optional parts are pinned per sim (`setup` runs right after init): the short answers "Ok", "Sí" and "No"
    // would otherwise be taken by the blood-pressure sleeve, the chart question or the pharmacy question.
    { name: "song path: sore throat and a fever, questions, card",
      setup: (s) => { s.bpTwist = false; s.chartTwist = false; },
      turns: ["Me duele la garganta y tengo fiebre", "Desde el lunes", "Treinta y ocho y medio", "Solo ibuprofeno", "Ok", "Aaa", "Sí, un poco",
        "No, no soy alérgico a nada", "¿Puedo tomar alcohol?", "¿Me puede dar un justificante para el trabajo?", "Con tarjeta", "¡Gracias, doctora!"],
      expect: { complete: true, state: { paid: true, payMethod: "card", dx: "throat" } }, auto: AUTO },
    // "Ok, gracias" always answers "¿Tiene alguna pregunta?" (it never gets "Claro, dígame")
    { name: "short answers, cash with change",
      setup: (s) => { s.bpTwist = false; s.chartTwist = false; s.askPharmacy = false; s.offerNote = false; s.askQ = true; s.askMoreQ = false; s.askMore = false; s.askScale = false; s.askDob = false; s.feelingOpener = false; },
      turns: ["Dolor de garganta", "Tres días", "Sí", "39", "Sí", "Paracetamol", "Ok", "Aaa", "Sí", "No", "Ok, gracias", "Efectivo", "Aquí tiene un billete de mil", "Adiós"],
      expect: { complete: true, state: { paid: true, payMethod: "cash", fever: true, meds: "otc", allergy: "none" } }, auto: AUTO },
    { name: "questions first, a virus, Fahrenheit",
      setup: (s) => { s.bpTwist = false; s.askPharmacy = false; s.offerNote = false; },
      turns: ["Tengo mucha tos y me escurre la nariz", "¿Es grave?", "Como una semana", "Sí, ciento uno Fahrenheit", "No, nada", "Ok", "Aaa",
        "No, no me duele", "¿Necesito antibiótico?", "No", "¿Cada cuánto me lo tomo?", "¿Puedo ir a trabajar?", "¿Y si no mejoro?", "Por transferencia", "Gracias, adiós"],
      expect: { complete: true, state: { dx: "virus", paid: true, payMethod: "transfer" } }, auto: { ...AUTO, fever: "Sí, ciento uno Fahrenheit" } },
    // the chart twist stays random here (said on most seeds, in the chart on some); the next sim forces it
    { name: "penicillin allergy (said or in the chart)",
      setup: (s) => { s.bpTwist = false; s.askScale = false; },
      turns: ["Me duele la garganta y tengo fiebre desde ayer", "38.4", "No, nada", "Ok", "Aaa", "Sí, me duele", "Soy alérgico a la penicilina",
        "¿Por cuántos días?", "Con tarjeta", "¡Gracias!"],
      expect: { complete: true, state: { allergy: "pen", paid: true } }, auto: { ...AUTO, allergy: "Soy alérgico a la penicilina", fever: "38.4" } },
    { name: "the chart says penicillin (twist): that's right",
      setup: (s) => { s.chartTwist = true; s.bpTwist = false; s.askScale = false; s.askPharmacy = false; },
      turns: ["Me duele la garganta", "Desde el lunes", "No, no tengo fiebre", "No, nada", "Ok", "Aaa", "Sí, un poco", "Sí, es correcto",
        "¿Tiene efectos secundarios?", "Con tarjeta", "Gracias, adiós"],
      expect: { complete: true, state: { allergy: "pen", chartAsked: true, paid: true } }, auto: { ...AUTO, fever: "No, no tengo fiebre" } },
    { name: "stomachache, no fever, blood pressure (twist)",
      setup: (s) => { s.bpTwist = true; },
      turns: ["Me duele el estómago", "Desde anoche", "No, no tengo fiebre", "Tomé un poco de suero", "Claro", "Ok", "Aaa", "Sí, mucho",
        "No tengo alergias", "¿Qué puedo comer?", "Con tarjeta", "Gracias, hasta luego"],
      expect: { complete: true, state: { dx: "stomach", bp: true, meds: "otc", paid: true } }, auto: { ...AUTO, fever: "No, no tengo fiebre" } },
    { name: "left ear: the exam keeps the side",
      setup: (s) => { s.bpTwist = false; },
      turns: ["Me duele el oído izquierdo", "Desde el lunes", "No", "Nada", "Ok", "Aaa", "Sí, un poco", "No tengo alergias", "Con tarjeta", "Gracias, adiós"],
      expect: { complete: true, state: { earSide: "left", dx: "ear", paid: true } }, auto: AUTO },
    { name: "four pieces in one sentence",
      setup: (s) => { s.bpTwist = false; },
      turns: ["Me duele la garganta y tengo fiebre de 38.5 desde el lunes. Soy alérgica a la penicilina.", "No, nada", "Ok", "Aaa", "Sí, me duele", "¿Cada cuánto me lo tomo?", "Con tarjeta", "Gracias, adiós"],
      expect: { complete: true, state: { days: 3, allergy: "pen", paid: true } }, auto: noOpening(AUTO) },
    // "¿Algún otro síntoma?" comes because the reading is normal (so it isn't asked right after the complaint)
    { name: "a normal temperature keeps the complaint",
      setup: (s) => { s.askMore = false; s.bpTwist = false; },
      turns: ["Tengo fiebre", "Dos días", "36.8", "No, es todo", "No, nada", "Ok", "Aaa", "No", "No", "En efectivo", "Aquí tiene quinientos", "Gracias, adiós"],
      expect: { complete: true, state: { fever: false, paid: true, payMethod: "cash" } }, auto: noOpening({ ...AUTO, fever: "36.8" }) },
    { name: "back pain, learner-style Spanish, the fee asked early",
      setup: (s) => { s.bpTwist = false; },
      turns: ["Hola doctora, tengo problema, me duele mucho la espalda", "Desde hace dos días", "No fiebre", "No", "¿Cuánto es la consulta?", "Ok", "Sí, aquí duele", "No",
        "¿Puedo ir a trabajar?", "Tarjeta", "Gracias, adiós"],
      expect: { complete: true, state: { dx: "back", paid: true } }, auto: { ...AUTO, fever: "No fiebre", hurt: "Sí" } },
    { name: "paying: no cash, then card; a receipt",
      setup: (s) => { s.bpTwist = false; s.chartTwist = false; s.askPharmacy = false; s.offerNote = false; s.askQ = false; s.askMoreQ = false; },
      turns: ["Tengo dolor de cabeza", "Desde ayer", "No", "No, nada", "Ok", "Aaa", "No", "No", "No traigo efectivo", "¿Acepta tarjeta?", "¿Me da un recibo?", "Gracias, adiós"],
      expect: { complete: true, state: { dx: "tension", paid: true, payMethod: "card" } }, auto: { ...AUTO, fever: "No" } },
    { name: "cash in two goes; goodbye before paying gets the fee",
      setup: (s) => { s.bpTwist = false; s.chartTwist = false; s.askPharmacy = false; s.offerNote = false; s.askQ = false; s.askMoreQ = false; },
      turns: ["Me duele mucho la cabeza", "Desde ayer", "No", "No, nada", "Ok", "Aaa", "No", "No", "Gracias, adiós", "En efectivo", "Aquí tiene doscientos", "Aquí tiene otros trescientos", "Gracias"],
      expect: { complete: true, state: { paid: true, payMethod: "cash", cashIn: 50000 } }, auto: { ...AUTO, fever: "No" } },
    { name: "date of birth, then Spain forms",
      setup: (s) => { s.askDob = true; s.feelingOpener = false; s.bpTwist = false; s.chartTwist = false; s.askPharmacy = false; s.offerNote = false; },
      turns: ["El 4 de junio de 1980", "Estoy constipado y tengo tos", "Desde hace tres días", "No", "Me he tomado un ibuprofeno", "Vale", "Aaa", "No", "No",
        "¿Puedo conducir?", "Vale, con tarjeta", "Gracias, adiós"],
      expect: { complete: true, state: { dob: { day: 4, month: 6, year: 1980 }, dx: "virus", paid: true } }, auto: { ...AUTO, fever: "No" } },
    // review: "estómago revuelto" is the stomach; "Tarjeta no efectivo" is asked again; "¿Cuánto falta?" gets what's left
    { name: "review: an upset stomach, a lost comma at paying, cash in two goes",
      setup: (s) => { s.bpTwist = false; s.chartTwist = false; s.askPharmacy = false; s.offerNote = false; s.askQ = false; s.askMoreQ = false; s.askMore = false; s.askScale = false; s.askDob = false; s.feelingOpener = false; },
      turns: ["Tengo el estómago revuelto", "Empezó ayer en la noche", "No", "No, nada", "Ok", "Aaa", "Sí, un poco", "No", "Tarjeta no efectivo", "En efectivo",
        "Aquí tiene doscientos", "¿Cuánto falta?", "Aquí tiene trescientos", "Gracias, adiós"],
      expect: { complete: true, state: { dx: "stomach", paid: true, payMethod: "cash", cashIn: 50000 } }, auto: { ...AUTO, fever: "No" } },
    // lead's check: the fee asked first (a bare "Aquí tiene" then pays), both ways asked, some cash and the card for the rest
    { name: "lead: the fee first, both ways asked, some cash, the card for the rest",
      setup: (s) => { s.bpTwist = false; s.chartTwist = false; s.askPharmacy = false; s.offerNote = false; s.askQ = false; s.askMoreQ = false; s.askMore = false; s.askScale = false; s.askDob = false; s.feelingOpener = false; },
      turns: ["Tengo dolor de cabeza", "Desde ayer", "No", "No, nada", "Ok", "Aaa", "No", "No", "¿Cuánto le debo?", "¿Le pago con tarjeta o en efectivo?", "En efectivo",
        "Aquí tiene doscientos", "No me alcanza", "Con tarjeta", "Gracias, adiós"],
      expect: { complete: true, state: { dx: "tension", paid: true, payMethod: "card", cashIn: 20000 } }, auto: { ...AUTO, fever: "No" } },
    { name: "lead: a hedged temperature, penicillin and nothing else, a bare «Tenga» after the price",
      setup: (s) => { s.bpTwist = false; s.chartTwist = false; s.askPharmacy = false; s.offerNote = false; s.askQ = false; s.askMoreQ = false; s.askMore = false; s.askScale = false; s.askDob = false; s.feelingOpener = false; },
      turns: ["Me duele la garganta", "Desde el lunes", "No sé, como 38", "No, nada", "Ok", "Aaa", "Sí", "Solo a la penicilina, a nada más", "¿Cuánto es?", "En efectivo", "Tenga",
        "Gracias, adiós"],
      expect: { complete: true, state: { dx: "throat", allergy: "pen", temp: { c: 38 }, paid: true, payMethod: "cash", cashIn: 50000 } }, auto: { ...AUTO, fever: "No sé, como 38" } },
  ],
};

// ---------------------------------------------------------------------------
// Hint helpers: "Tengo …" and "Me duele …" with a natural English sentence per symptom.

function haveItems(): HintItem[] {
  const NAT: Record<string, string> = {
    sore_throat: "I have a sore throat.", fever: "I have a fever.", cough: "I have a cough.", headache: "I have a headache.", stomachache: "I have a stomachache.",
    earache: "I have an earache.", runny_nose: "I have a runny nose.", stuffy_nose: "I have a stuffy nose.", back_pain: "I have back pain.", aches: "I ache all over.",
    flu: "I have the flu.",
  };
  const out: HintItem[] = Object.entries(NAT).map(([id, nat]) => ({ id: "have", s: t("Tengo | {X}.", "I-have | {X}.", nat), only: (e: EntityDef) => e.id === id }));
  out.push({ id: "have", s: t("Tengo | gripa.", "I-have | cold.", "I have a cold.", { flags: { 1: "Mexican: gripa = a cold (or the flu). Elsewhere: gripe." },
    neutral: t("Tengo | gripe.", "I-have | cold.", "I have a cold.") }), only: (e: EntityDef) => e.id === "cold" });
  return out;
}

function bodyItems(): HintItem[] {
  const PARTS: [string, string, string, string][] = [
    ["sore_throat", "la", "garganta", "throat"], ["headache", "la", "cabeza", "head"], ["stomachache", "el", "estómago", "stomach"], ["earache", "el", "oído", "ear"], ["back_pain", "la", "espalda", "back"],
  ];
  return PARTS.map(([id, art, es, en]) => ({
    id: "body_hurts",
    s: t(`Me duele | ${art} | ${es}.`, `Hurts (me) | the | ${en}.`, `My ${en} hurts.`, { flags: { 1: FLAG_YOUR(`${art} ${es}`, en) } }),
    only: (e: EntityDef) => e.id === id,
  }));
}

// ---------------------------------------------------------------------------
// Flow helpers

function feelingFine(c: Ctx) {
  // "Bien, gracias." to a doctor: she goes straight to the reason for the visit
  c.s.problemAsked = 1;
  c.say("fine_glad");
  c.hold(); // fine_glad already asks what brings them in
}

function tempUnknown(c: Ctx) {
  if (!firstThisTurn(c, "tempUnknown")) return;
  if (c.s.temp !== undefined) { c.say("ok_plain"); return; }
  if (c.s.fever === undefined) c.s.fever = true;
  c.s.temp = "check";
  c.say("temp_check_later");
}

function chartAnswer(c: Ctx, tags: string[]) {
  // unsure, or "ninguna otra" (no other one), keeps the chart's penicillin
  const a = tags.includes("neg") ? "none" : tags.includes("pen") ? "pen" : tags.includes("other") || tags.includes("nsaid") ? "other"
    : tags.includes("unsure") || tags.includes("others") ? "pen" : "none";
  if (a !== "none") { setAllergy(c, tags.includes("others") ? [a, "others"] : [a]); return; }
  if (allergyKept(c, a, tags)) return;
  c.s.allergy = "none"; c.say("chart_fixed");
}

/** What she'll prescribe, said once (before the allergy question, or at the prescription). */
function rxIntro(c: Ctx) {
  if (c.s.introSaid) return;
  c.s.introSaid = true;
  const k = kind(c);
  if (k === "ab") {
    if (c.s.allergy === "pen") { c.say("rx_intro_ab_pen"); c.s.altSaid = true; c.twist("penicillin"); }
    else c.say("rx_intro_ab");
  } else c.say(k === "stomach" ? "rx_intro_stomach" : k === "pain" ? "rx_intro_pain" : "rx_intro_sym");
}

function sayDose(c: Ctx) {
  const k = kind(c);
  if (k === "ab") c.say(c.s.allergy === "pen" ? "dose_ab_alt" : "dose_ab");
  else if (dx(c) === "tension") c.say("dose_tension");
  else c.say(k === "stomach" ? "dose_stomach" : k === "pain" ? "dose_pain" : "dose_sym");
}
/** How many days: the antibiotic is taken to the end; paracetamol and the headache pills only as long as needed. */
function sayDays(c: Ctx) {
  if (kind(c) === "ab") c.say("dose_days_ab");
  else if (kind(c) === "sym" || dx(c) === "tension") c.say("dose_days_sym");
  else c.say("dose_days");
}
/** One "Muy bien" per turn ("No, todo claro, gracias" is a no and a "todo claro"). */
function okOnce(c: Ctx) { if (firstThisTurn(c, "ok")) c.say("ok_plain"); }

function giveRx(c: Ctx) {
  rxIntro(c);
  c.s.rxGiven = true;
  sayDose(c);
  sayDays(c);
  if (kind(c) === "ab") c.say("dose_finish");
  if (!c.s.askPharmacy) c.event("give", { item: "prescription" });
  if (c.s.askQ) { c.say("ask_questions"); c.expect(questionsPending("rx_q")); }
}

/** The paper prescription is handed over; she may add a word about the generic. */
function pharmacyEnd(c: Ctx) {
  if (kind(c) === "ab" || kind(c) === "pain") c.say("pharmacy_generic");
  c.event("give", { item: "prescription" });
}

/** "¿Tiene alguna (otra) pregunta?": asked once; any question the learner asks is answered by its handler. */
function questionsPending(id: string): Pending {
  return { id, optional: true, hints: ["ask_rx", "ask_dx", "rx_ok", "g_yesno"],
    expects: ["clear_ctx", "ask_dosage", "ask_meals", "ask_duration", "ask_side", "ask_alcohol", "ask_drive", "ask_better", "ask_work", "ask_note", "ask_contagious", "ask_serious", "ask_not_better",
      "ask_what", "ask_eat", "ask_exercise", "ask_cost"],
    suggest: [{ lt: "Ask about the medicine", hint: "ask_rx" }, { lt: "Ask about the illness", hint: "ask_dx" }, { lt: "Say yes or no", hint: "g_yesno" }],
    // "Ok, gracias" / "Está bien" parse as a yes, but they acknowledge the advice: no questions
    yes: (cc) => {
      if (/^[\s¡¿]*(ok(ay)?|vale|bueno|est[aá] bien|muy bien|perfecto|de acuerdo|sale|va)\b/i.test(cc.heard)) { cc.say(/\bgracias\b/i.test(cc.heard) ? "g_welcome" : "ok_plain"); return; }
      cc.say("go_ahead"); cc.hold();
    },
    no: (cc) => { okOnce(cc); } };
}

/** Rest and fluids, "Si no mejora, regrese", "¡Que se mejore!" (once). */
function wrapUp(c: Ctx) {
  if (c.s.wrapped) return;
  c.s.wrapped = true;
  if (c.s.noteWanted && !c.s.noteGiven) { c.s.noteGiven = true; c.say("note_here"); c.event("give", { item: "doctor-note" }); }
  switch (dx(c)) {
    case "stomach": c.say("advice_stomach"); break;
    case "back": c.say("advice_back"); break;
    case "tension": c.say("advice_tension"); break;
    default: c.say("advice_rest"); if (dx(c) === "throat") c.say("advice_tea");
  }
  if (!c.s.comeBackSaid) c.say("come_back");
  c.say("feel_better");
}

function giveNote(c: Ctx) {
  if (c.s.noteGiven) { c.say("note_here"); return; }
  c.s.note = true;
  c.s.noteGiven = true;
  c.say("note_write");
  c.event("give", { item: "doctor-note" });
}

function setDob(c: Ctx, slots: any) {
  if (c.s.dob) { c.say("dob_thanks"); return; }
  const nd = slots.numdate;
  const date = nd ? { day: nd.day, month: nd.month } : slots.date;
  let year = nd ? nd.year : slots.year;
  if (!year && typeof slots.yy === "number" && slots.yy >= 0 && slots.yy <= 99) year = slots.yy > 30 ? 1900 + slots.yy : 2000 + slots.yy;
  if (date) c.s.dobPartial = { ...(c.s.dobPartial || {}), ...date };
  if (year) c.s.dobYear = year;
  if (c.s.dobPartial && c.s.dobYear) { c.s.dob = { ...c.s.dobPartial, year: c.s.dobYear }; c.say("dob_thanks"); }
}

/** Ask the next open step right away (after a handler that settled its own step). */
function askNext(c: Ctx) {
  const st = doctor.steps.find((x) => (!x.when || x.when(c)) && !x.done(c));
  if (st) c.ask(st.id);
}

// ---------------------------------------------------------------------------
// Paying for the visit: card or transfer at once; cash counts every bill handed over.

/** Two ways to pay joined by "o" ("¿Le pago con tarjeta o en efectivo?", "¿Tarjetas o efectivo?"): a question.
 *  Read on the words as heard, spelled by sound too ("targeta", "efectibo"), as the grammar forgives them. */
const wayOf = (w: string) => (/^tar[jg]e/.test(w) ? "card" : /^e[fv]e[ck]t/.test(w) ? "cash" : /^trans?f/.test(w) ? "transfer" : "");
function askedEither(heard: string): boolean {
  const words = heard.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-zñ]+/).filter(Boolean);
  return words.some((w, i) => {
    if (w !== "o" && w !== "u") return false;
    const before = words.slice(0, i).map(wayOf).filter(Boolean).pop();
    const after = words.slice(i + 1).map(wayOf).find(Boolean);
    return !!before && !!after && before !== after;
  });
}

function choosePay(c: Ctx, method: "card" | "cash" | "transfer", tags: string[] = []) {
  if (c.s.paid) { c.say("paid_already"); return; }
  // "¿Puedo pagar con tarjeta o en efectivo?": either is fine, and nothing is chosen yet (never the card charged
  // and then "Ya está pagado" for the second word)
  if (tags.includes("either") || askedEither(c.heard)) {
    if (!firstThisTurn(c, "method")) return;
    c.say("pay_either");
    if (!c.s.rxGiven) { c.say("pay_at_end"); return; }
    if (!c.s.totalSaid) { c.s.totalSaid = true; c.say("consult_price", { price: FEE }); }
    payNow(c);
    return;
  }
  // "¿Acepta tarjeta?" during the visit: yes, and it's paid at the end
  if (!c.s.rxGiven) { c.say(method === "card" ? "pay_later_card" : method === "transfer" ? "pay_later_transfer" : "pay_at_end"); return; }
  // "Tarjeta no efectivo": the comma decides, and voice has none (rule 10): she asks again
  if (tags.includes("amb")) { if (firstThisTurn(c, "method")) c.say("pay_which"); payNow(c); return; }
  if (!c.s.totalSaid) { c.s.totalSaid = true; c.say("consult_price", { price: FEE }); }
  c.s.payMethod = method;
  if (method === "cash") { c.say("cash_ok"); payNow(c); return; } // she waits for the money
  finishPay(c, method);
}

/** The fee is dealt with before the pay step was asked (a price question, a method, some money or a goodbye right
 *  after the directions): the pay step becomes the current one, so a bare "Aquí tiene" / "Tenga" and the paying
 *  hints work on the next turn, and nothing more is said now. */
function payNow(c: Ctx) {
  if (c.step === "pay") { c.hold(); return; }
  c.s.payQuiet = true;
  c.ask("pay");
}

function handMoney(c: Ctx, given?: number) {
  if (c.s.paid) { c.say("paid_already"); return; }
  if (!c.s.rxGiven) { c.say("pay_at_end"); return; }
  if (!c.s.totalSaid) { c.s.totalSaid = true; c.say("consult_price", { price: FEE }); }
  // "Aquí tiene" with the card chosen: the card
  if (!given && (c.s.payMethod === "card" || c.s.payMethod === "transfer")) { finishPay(c, c.s.payMethod); return; }
  finishPay(c, "cash", given);
}

function finishPay(c: Ctx, method: "card" | "cash" | "transfer", given?: number) {
  if (c.s.paid) return;
  if (method === "cash" && given) {
    // a bill she can't change: not counted, she asks for a smaller one
    if (given > MAX_CASH) { c.say("no_change"); payNow(c); return; }
    const sum = ((c.s.cashIn as number | undefined) ?? 0) + given;
    c.s.cashIn = sum;
    if (sum < FEE) { c.s.payMethod = "cash"; c.say("short", { total: FEE, price: FEE - sum }); payNow(c); return; }
    given = sum;
  } else if (method === "cash") c.s.cashIn = FEE; // a bare "Aquí tiene": the amount due (or the rest of it)
  // the rest by card or transfer after some cash ("Aquí tiene doscientos… Mejor con tarjeta"): only what's left
  const cashIn = (c.s.cashIn as number | undefined) ?? 0;
  const rest = method !== "cash" && cashIn > 0 && cashIn < FEE ? FEE - cashIn : 0;
  c.s.paid = true;
  c.s.payMethod = method;
  c.event("pay", { method, amount: rest || FEE });
  c.complete(); // the goal: told the doctor, got the directions, paid
  if (rest) c.say("left_is", { price: rest });
  if (method === "card") c.say("card_tap");
  else if (method === "transfer") c.say("transfer_ok");
  else if (given && given > FEE) c.say("change_is", { price: given - FEE });
  else c.say(given ? "cash_exact" : "cash_exact");
}

// ---------------------------------------------------------------------------
// The exam, one instruction at a time. Each instruction waits for the learner's answer (a pending
// question); its answer says the finding, and the step asks the next instruction.

const EXAM_SUGGEST: Record<string, { lt: string; hint: string }> = {
  sleeve: { lt: "Roll up your sleeve (and answer)", hint: "exam_sleeve" },
  breath: { lt: "Breathe in and out (and answer)", hint: "exam_breath" },
  ah: { lt: "Say “aaa”", hint: "exam_ah" },
  hurt: { lt: "Say whether it hurts", hint: "exam_hurt" },
};

function examPending(id: "sleeve" | "breath" | "ah" | "hurt", expects: string[], done: (c: Ctx, how: string) => void, again: (c: Ctx) => void): Pending {
  const on: Pending["on"] = {};
  for (const i of expects) on[i] = (cc: Ctx, _sl: any, _sg: any) => { done(cc, i); };
  return {
    id, expects, hints: [EXAM_SUGGEST[id].hint, "g_yesno"], suggest: [EXAM_SUGGEST[id], { lt: "Say yes or no", hint: "g_yesno" }],
    on, yes: (cc) => { done(cc, "yes"); }, no: (cc) => { done(cc, "no"); }, ask: again,
  };
}

function examStep(c: Ctx) {
  if (!c.s.dx) c.s.dx = diagnose(c);
  const d = c.s.dx as Dx;
  switch (c.s.stage ?? 0) {
    case 0: {
      c.say("exam_start");
      if (c.s.temp === "check") {
        const tm = MEASURED[d];
        c.say("temp_measure"); c.say("temp_read", { tm: tempVal(tm) });
        c.s.temp = { c: tm, measured: true };
        c.s.fever = tm >= 37.5;
        assess(c, tm);
      }
      c.s.bp = !!c.s.bpTwist || syms(c).includes("dizzy");
      if (c.s.bp) {
        if (c.s.bpTwist) c.twist("blood_pressure");
        c.say("bp_start");
        c.s.stage = 1;
        sleeve(c);
        return;
      }
      c.s.stage = 2;
      examStep(c);
      return;
    }
    case 1: sleeve(c); return;
    case 2: c.say("listen_lungs"); c.s.stage = 3; breath(c); return;
    case 3: breath(c); return;
    case 4: {
      if (d === "ear") { c.say("ear_look"); c.say(c.s.earSide ? "ear_red_" + c.s.earSide : "ear_red"); }
      if (d === "back") { c.s.stage = 6; examStep(c); return; }
      c.s.stage = 5; ah(c); return;
    }
    case 5: ah(c); return;
    case 6: {
      c.say(d === "ear" ? "press_ear" : d === "stomach" ? "press_belly" : d === "back" ? "press_back" : "press_neck");
      c.s.stage = 7; hurt(c); return;
    }
    case 7: hurt(c); return;
    default: c.s.examDone = true;
  }
}

function sleeve(c: Ctx) {
  c.say("bp_sleeve");
  c.expect(examPending("sleeve", ["which_arm_ctx", "like_this_ctx", "ready_ctx"], (cc, how) => {
    if (how === "which_arm_ctx") cc.say("bp_either_arm");
    cc.say("bp_relax"); cc.say("bp_result");
    cc.s.stage = 2;
  }, (cc) => cc.say("bp_sleeve")));
}

function breath(c: Ctx) {
  c.say("deep_breath");
  c.expect(examPending("breath", ["breath_ctx", "like_this_ctx", "ready_ctx", "breath_hard"], (cc, how) => {
    if (how === "breath_hard" || how === "no") cc.say("breath_easy");
    else if (cc.s.breathTwice) cc.say("breath_again");
    else cc.say("good_ack");
    cc.say(syms(cc).includes("cough") ? "lungs_wheeze" : "lungs_clear");
    cc.s.stage = 4;
  }, (cc) => cc.say("deep_breath")));
}

function ah(c: Ctx) {
  c.say("say_ah");
  c.expect(examPending("ah", ["ah_ctx", "ready_ctx", "like_this_ctx"], (cc) => {
    const d = cc.s.dx as Dx;
    cc.say(d === "throat" ? "throat_red" : d === "virus" ? "throat_bit_red" : "throat_fine");
    cc.s.stage = 6;
  }, (cc) => cc.say("say_ah")));
}

function hurt(c: Ctx) {
  c.say("hurt_here");
  c.expect(examPending("hurt", ["hurt_yes_ctx", "hurt_little_ctx", "hurt_no_ctx"], (cc, how) => {
    const d = cc.s.dx as Dx;
    const h = how === "hurt_yes_ctx" || how === "yes" ? "yes" : how === "hurt_little_ctx" ? "little" : "no";
    cc.s.hurt = h;
    if (h === "yes" && /\b(ay|auch|uy|mucho|bastante)\b/i.test(cc.heard)) cc.say("hurt_sorry");
    if (h === "little") cc.say("hurt_little_ok");
    if (h === "no") cc.say("hurt_no_ok");
    else if (d === "throat" || d === "virus") cc.say("glands_swollen");
    else if (d === "ear") cc.say("ear_tender");
    else if (d === "stomach") cc.say("belly_tender");
    else if (d === "back") cc.say("back_muscle");
    else cc.say("neck_tight");
    cc.say("dx_" + d);
    if (d === "virus") cc.say("no_ab_virus");
    else if (cc.chance(0.6)) cc.say("dx_calm");
    cc.s.stage = 8;
    cc.s.examDone = true;
  }, (cc) => cc.say("hurt_here")));
}

export default doctor;
