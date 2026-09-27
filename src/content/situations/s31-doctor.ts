// Song 31 "Take a Deep Breath" · Harbor Family Clinic · Dr. Carter (family doctor, calm and kind; jūs).
// An American sick visit in the exam room: "What seems to be the problem?" / "What brings you in today?",
// symptoms (sore throat, fever, cough, headache, stomachache, earache, runny or stuffy nose, back pain,
// dizzy, tired, body aches, a cold or the flu), "How long have you had it?", the pain scale ("On a scale of
// one to ten…"), the fever in °F (a Celsius answer is converted kindly: "38 Celsius? That's about 100
// Fahrenheit."), "Are you taking anything for it?", the exam ("Take a deep breath… and out", "Open wide
// and say 'ah'", "Does it hurt here?"), what it is (a throat or ear infection, a virus, a stomach bug, a
// pulled muscle, a tension headache), allergies before prescribing, the prescription ("Take one pill twice
// a day, after meals", five days, finish the antibiotic), the learner's questions (serious? contagious?
// antibiotics? side effects, alcohol, driving, work, a note for work), the pharmacy the prescription goes
// to, and "Rest and drink lots of fluids… Come back if it doesn't get better. Feel better!".
// Optional on some visits: the date-of-birth check ("Can you confirm your date of birth?"), "Any other
// symptoms?", the pain scale, the pharmacy question, the offer of a note, "Any other questions?".
// Twists (visits ≥ 1): the chart says the learner is allergic to penicillin (a different antibiotic),
// and "Let me check your blood pressure first. Could you roll up your sleeve?" (also when the learner
// feels dizzy). A penicillin allergy the learner mentions also changes the antibiotic on any visit.
//
// A bare "Ah." works too: the tokenizer keeps a filler when it is the whole answer (normalize.ts).

import type { Ctx, EntityDef, HintItem, Pending, SentSrc, SituationDef } from "../types";
import type { SlotFn, SlotResult } from "../../convo/grammar";
import { readInt } from "../../convo/slots";
import { ent, t } from "../dsl";

// ---------------------------------------------------------------------------
// Entities

export const SYMPTOMS: EntityDef[] = [
  ent("sore_throat", "sore | throat", "skaudanti/skaudančios/skaudančiai/skaudančią/skaudančia/skaudančioje | gerklė/gerklės/gerklei/gerklę/gerkle/gerklėje", "f",
    { chip: "skauda gerklę", forms: ["sore throats", "scratchy throat", "throat ache", "throat pain", "red throat", "strep throat", "strep", "bad throat", "throat infection", "painful throat"] }),
  ent("fever", "fever", "karščiavimas/karščiavimo/karščiavimui/karščiavimą/karščiavimu/karščiavime", "m",
    { chip: "karščiuoju", forms: ["fevers", "temperature", "high temperature", "high fever", "slight fever", "low fever", "low grade fever", "chills", "the chills"] }),
  ent("cough", "cough", "kosulys/kosulio/kosuliui/kosulį/kosuliu/kosulyje", "m",
    { chip: "kosulys", forms: ["coughs", "dry cough", "wet cough", "chesty cough", "bad cough", "coughing", "cough with phlegm"] }),
  ent("headache", "headache", "galvos skausmas/galvos skausmo/galvos skausmui/galvos skausmą/galvos skausmu/galvos skausme", "m",
    { chip: "skauda galvą", forms: ["headaches", "migraine", "head ache", "splitting headache", "head pain"] }),
  ent("stomachache", "stomachache", "pilvo skausmas/pilvo skausmo/pilvo skausmui/pilvo skausmą/pilvo skausmu/pilvo skausme", "m",
    { chip: "skauda pilvą", forms: ["stomach ache", "stomachaches", "stomach pain", "tummy ache", "belly ache", "bellyache", "upset stomach", "stomach bug", "stomach flu", "nausea", "diarrhea", "food poisoning", "stomach problems", "belly pain"] }),
  ent("earache", "earache", "ausies skausmas/ausies skausmo/ausies skausmui/ausies skausmą/ausies skausmu/ausies skausme", "m",
    { chip: "skauda ausį", forms: ["ear ache", "earaches", "ear pain", "ear infection", "sore ear", "painful ear"] }),
  ent("runny_nose", "runny | nose", "varvanti/varvančios/varvančiai/varvančią/varvančia/varvančioje | nosis/nosies/nosiai/nosį/nosimi/nosyje", "f",
    { chip: "bėga nosis", forms: ["running nose", "runny noses", "sniffles", "the sniffles", "sneezing"] }),
  ent("stuffy_nose", "stuffy | nose", "užgulta/užgultos/užgultai/užgultą/užgulta/užgultoje | nosis/nosies/nosiai/nosį/nosimi/nosyje", "f",
    { chip: "užgulta nosis", forms: ["blocked nose", "stuffed up nose", "stuffed nose", "congestion", "nasal congestion", "stuffy noses"] }),
  ent("back_pain", "back | pain", "nugaros | skausmas/skausmo/skausmui/skausmą/skausmu/skausme", "m",
    { art: "", chip: "skauda nugarą", forms: ["backache", "back ache", "lower back pain", "bad back", "sore back", "back problems", "back pains"] }),
  ent("dizzy", "dizziness", "galvos svaigimas/galvos svaigimo/galvos svaigimui/galvos svaigimą/galvos svaigimu/galvos svaigime", "m",
    { art: "", chip: "svaigsta galva", forms: ["dizzy spells", "vertigo"] }),
  ent("fatigue", "fatigue", "nuovargis/nuovargio/nuovargiui/nuovargį/nuovargiu/nuovargyje", "m",
    { art: "", chip: "nuovargis", forms: ["tiredness", "exhaustion", "weakness"] }),
  ent("aches", "body | aches", "kūno | skausmai/skausmų/skausmams/skausmus/skausmais/skausmuose", "m",
    { art: "", chip: "skauda visą kūną", forms: ["aches", "body ache", "aches and pains", "muscle aches", "aching muscles", "sore muscles"] }),
  ent("cold", "cold", "peršalimas/peršalimo/peršalimui/peršalimą/peršalimu/peršalime", "m",
    { chip: "peršalimas", forms: ["colds", "head cold", "common cold", "chest cold"] }),
  ent("flu", "flu", "gripas/gripo/gripui/gripą/gripu/gripe", "m",
    { art: "the", chip: "gripas", forms: ["influenza", "flu virus"] }),
];

const PAINFUL = new Set(["sore_throat", "headache", "stomachache", "earache", "back_pain"]);

type Dx = "throat" | "ear" | "virus" | "stomach" | "back" | "tension";
type Kind = "ab" | "sym" | "stomach" | "pain";
const KIND: Record<Dx, Kind> = { throat: "ab", ear: "ab", virus: "sym", stomach: "stomach", back: "pain", tension: "pain" };
const CONTAGIOUS: Record<Dx, boolean> = { throat: true, ear: false, virus: true, stomach: true, back: false, tension: false };
/** The temperature Dr. Carter measures when the learner didn't check it (°F). */
const MEASURED: Record<Dx, number> = { throat: 101.2, ear: 100.4, virus: 100.6, stomach: 99.1, back: 98.6, tension: 98.6 };

// ---------------------------------------------------------------------------
// Temperatures: the learner may say Celsius ("38", "38.5", "thirty-eight point five", "38 degrees
// Celsius") or Fahrenheit ("101", "a hundred and one", "one oh one", "100.4"). Values are
// {v, unit}; the unit is decided by the number when it isn't said (34–43 °C, 93–110 °F).

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen",
  "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function sayInt(n: number): string {
  if (n >= 100 && n < 200) return "a hundred" + (n % 100 ? " and " + sayInt(n % 100) : "");
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "");
}
const tenths = (v: number) => Math.round(v * 10);
function sayTemp(v: number): string {
  const x = tenths(v), i = Math.floor(x / 10), d = x % 10;
  return sayInt(i) + (d ? " point " + ONES[d] : "");
}
const fmtEn = (v: number) => (tenths(v) % 10 ? (tenths(v) / 10).toFixed(1) : String(tenths(v) / 10));
const tempVal = (v: number) => ({ en: fmtEn(v), lt: fmtEn(v).replace(".", ","), say: sayTemp(v) });
const toF = (c: number) => Math.round((c * 9 / 5 + 32) * 10) / 10;
/** The Fahrenheit value she says after a Celsius answer: 98.6 for a normal 37 °C, otherwise a whole number. */
const roundF = (f: number) => (Math.abs(f - 98.6) < 0.05 ? 98.6 : Math.round(f));

const DIGIT_WORD: Record<string, number> = { zero: 0, oh: 0, o: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
const tempSlot: SlotFn = (tokens, pos) => {
  const out: SlotResult[] = [];
  const t0 = tokens[pos];
  if (t0 === undefined) return out;
  const base: { end: number; v: number; unit?: "c" | "f"; dec?: boolean }[] = [];
  const m = /^(\d{2,3})(?:\.(\d))?(c|f)?$/.exec(t0);
  if (m) {
    const v = Number(m[1]) + (m[2] ? Number(m[2]) / 10 : 0);
    base.push({ end: pos + 1, v, unit: m[3] as "c" | "f" | undefined, dec: !!m[2] });
    // "38,5" (a decimal comma) arrives as "38 5"
    if (!m[2] && !m[3] && /^\d$/.test(tokens[pos + 1] ?? "") && v >= 34 && v <= 43) base.push({ end: pos + 2, v: v + Number(tokens[pos + 1]) / 10, dec: true });
  } else {
    // "one oh one" = 101
    const d3 = DIGIT_WORD[tokens[pos + 2] ?? ""];
    if (t0 === "one" && (tokens[pos + 1] === "oh" || tokens[pos + 1] === "o") && d3 !== undefined && d3 > 0) base.push({ end: pos + 3, v: 100 + d3 });
    for (const r of readInt(tokens, pos)) if (r.words) base.push({ end: r.end, v: r.value });
  }
  const all = [...base];
  for (const b of base) {
    if (b.dec || b.unit) continue;
    const n1 = tokens[b.end], n2 = tokens[b.end + 1] ?? "";
    const d = /^\d$/.test(n2) ? Number(n2) : DIGIT_WORD[n2];
    if (n1 === "point" && d !== undefined) all.push({ end: b.end + 2, v: b.v + d / 10, dec: true });
    if (n1 === "and" && n2 === "a" && tokens[b.end + 2] === "half") all.push({ end: b.end + 3, v: b.v + 0.5, dec: true });
  }
  for (const b of all) {
    const v = tenths(b.v) / 10;
    if (v < 30 || v > 115) continue;
    out.push({ end: b.end, value: { v, unit: b.unit ?? null }, cost: 0.05 });
    let i = b.end;
    if (tokens[i] === "degrees" || tokens[i] === "degree") { i++; out.push({ end: i, value: { v, unit: b.unit ?? null } }); }
    const u = tokens[i];
    if (u === "celsius" || u === "centigrade" || u === "c") out.push({ end: i + 1, value: { v, unit: "c" } });
    else if (u === "fahrenheit" || u === "f") out.push({ end: i + 1, value: { v, unit: "f" } });
  }
  return out;
};

/** Numeric dates of birth: "06/04/1980" (US month/day/year), "1980-06-04", "04.06.1980" (day first, with a tip). */
const numDate: SlotFn = (tokens, pos) => {
  const dot = /^(\d{1,4})\.(\d{1,2})\.(\d{1,4})$/.exec(tokens[pos] ?? "");
  const yearOf = (z: number) => (z < 100 ? (z > 30 ? 1900 + z : 2000 + z) : z);
  if (dot) {
    const [x, mo, z] = [+dot[1], +dot[2], +dot[3]];
    if (x >= 1900 && x <= 2025 && mo >= 1 && mo <= 12 && z >= 1 && z <= 31) return [{ end: pos + 1, value: { month: mo, day: z, year: x } }];
    const yr = yearOf(z);
    if (yr >= 1900 && yr <= 2025 && mo >= 1 && mo <= 12 && x >= 1 && x <= 31) return [{ end: pos + 1, value: { month: mo, day: x, year: yr }, tags: ["tip:us_date"] }];
    return [];
  }
  const [a, b, y] = [tokens[pos], tokens[pos + 1], tokens[pos + 2]];
  if (![a, b, y].every((x) => x !== undefined && /^\d+$/.test(x))) return [];
  const [n1, n2, n3] = [+a, +b, +y];
  if (n1 >= 1900 && n1 <= 2025 && n2 >= 1 && n2 <= 12 && n3 >= 1 && n3 <= 31) return [{ end: pos + 3, value: { month: n2, day: n3, year: n1 } }];
  const year = yearOf(n3);
  if (year < 1900 || year > 2025) return [];
  if (n1 >= 1 && n1 <= 12 && n2 >= 1 && n2 <= 31) return [{ end: pos + 3, value: { month: n1, day: n2, year } }];
  if (n2 >= 1 && n2 <= 12 && n1 >= 13 && n1 <= 31) return [{ end: pos + 3, value: { month: n2, day: n1, year }, tags: ["tip:us_date"] }];
  return [];
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
    if (tags.includes("unit_d")) return n;
  }
  if (tags.includes("dord") && typeof slots?.ord === "number") return slots.ord;
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
  // which ear ("my left ear", "both ears"): the exam finding keeps that side
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

/** A temperature the learner said: a Celsius value is converted to Fahrenheit, kindly. */
function setTemp(c: Ctx, t: { v: number; unit: "c" | "f" | null }) {
  if (!firstThisTurn(c, "temp")) return;
  const v = t.v;
  const scale = t.unit ?? (v <= 45 ? "c" : v >= 90 ? "f" : null);
  const ok = scale === "c" ? v >= 34 && v <= 43 : scale === "f" ? v >= 93 && v <= 110 : false;
  if (!ok) {
    if (c.s.temp === undefined) { c.s.temp = "check"; if (c.s.fever === undefined) c.s.fever = true; }
    c.say("temp_weird");
    return;
  }
  const f = scale === "c" ? toF(v) : v;
  if (scale === "c") { c.say("c_echo", { tc: tempVal(v) }); c.say("c_conv", { tf: tempVal(roundF(f)) }); }
  c.s.temp = { f, c: scale === "c" ? v : undefined };
  c.s.fever = f >= 99.5;
  // A normal reading ("37", "99") after "I have a fever": the learner still feels feverish, so the complaint stays;
  // when it was the only one, she asks about other symptoms (never the opening question again).
  if (!c.s.fever && syms(c).length === 1 && syms(c)[0] === "fever" && !c.s.moreDone && !c.s.examDone) c.s.askMore = true;
  assess(c, f);
}

function assess(c: Ctx, f: number) {
  if (f < 99.5) c.say("temp_normal");
  else if (f < 100.4) c.say("temp_slight");
  else if (f < 103) c.say("temp_fever");
  else c.say("temp_high");
}

function setAllergy(c: Ctx, tags: string[]) {
  const a = tags.includes("pen") ? "pen" : tags.includes("unsure") ? "unsure" : tags.includes("other") || tags.includes("nsaid") ? "other" : "none";
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
  else c.say("meds_other_ok");
}

// ---------------------------------------------------------------------------
// "Anything else? A fever, a cough?": the examples are symptoms the learner hasn't named or denied.

const MORE_EX: [string, string, string, string][] = [
  // id, EN units, LT units (sentence start), natural LT
  ["fever", "a | fever", "— | karščiavimas", "karščiavimas"],
  ["cough", "a | cough", "— | kosulys", "kosulys"],
  ["headache", "a | headache", "— | galvos skausmas", "galvos skausmas"],
  ["sore_throat", "a | sore | throat", "— | skaudanti | gerklė", "gerklės skausmas"],
];
const capFirst = (x: string) => x.replace(/\p{L}/u, (ch) => ch.toUpperCase());
function moreExampleLines(): Record<string, SentSrc[]> {
  const out: Record<string, SentSrc[]> = {};
  MORE_EX.forEach(([a, enA, ltA, natA], i) => MORE_EX.slice(i + 1).forEach(([b, enB, ltB, natB]) => {
    out[`more_ex_${a}_${b}`] = [t(`Anything | else? | ${capFirst(enA)}, | ${enB}?`, `Kas nors | dar? | ${ltA.replace(/— \| (\p{L})/u, (_m, ch) => "— | " + ch.toUpperCase())}, | ${ltB}?`,
      `Dar kas nors? ${capFirst(natA)}, ${natB}?`)];
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

// Automatic answers the simulation gives when Dr. Carter asks one of her optional questions.
const AUTO: Record<string, string> = {
  dob: "June 4th, 1980.", feeling: "Not so good.", sick_q: "I have a sore throat.", problem: "I have a sore throat.",
  more_sym: "No, that's all.", howlong: "Since Monday.", scale: "About a six.", fever: "Yes, about 38 degrees.",
  meds: "No, nothing.", meds_what: "Just ibuprofen.", sleeve: "Sure.", breath: "Okay.", ah: "Aaah.", hurt: "A little.",
  allergy: "No, I don't have any allergies.", chart: "Yes, that's right.", allergy_which: "Penicillin.",
  rx_q: "No, that's clear. Thank you!", pharmacy: "Harbor Pharmacy, please.", note: "Yes, please.", questions: "No, that's all.",
};

const FLAG_DO = "Question “Do” = the particle ar.";
const FLAG_IS = "“Is” in a question = the particle ar; Lithuanian needs no copula here.";
const FLAG_PER = "“a” here means “per”: per dieną (a day).";
const FLAG_IN = "“in” (bring you in): the prefix at- of atveda carries it (linked to “brings”).";
const FLAG_MED = "“it” = the medicine (vaistai, plural in Lithuanian).";
const FLAG_TEMP = "“it” = the temperature (temperatūra).";

// ---------------------------------------------------------------------------

export const doctor: SituationDef = {
  id: "s31-doctor",
  song: 31,
  songTitle: "Take a Deep Breath",
  title: { en: "Take a Deep Breath", lt: "Giliai įkvėpkite" },
  topic: { en: "At the doctor's", lt: "Pas gydytoją" },
  chapter: 7,
  order: 3,
  location: "clinic",
  npc: "carter",
  goal: "Papasakok gydytojai, kas tau negerai, ir sužinok, kaip gydytis.",
  intro: "„Harbor Family Clinic“ – šeimos klinika miesto centre. Registratūroje jau užsiregistravai, o dabar apžiūros kabinete tavęs laukia gydytoja Carter. Pasakyk, kas negerai, atsakyk į klausimus ir daryk, ko ji prašo apžiūros metu.",
  entities: { symptom: SYMPTOMS },

  merges: {
    "let's see": { reason: "grammatical_fusion", split: "Let's → leiskime + see → matyti is a calque; the first person plural imperative = pažiūrėkime.", minimal: "Two words (C-LEX, like “Let's stay → likime”)." },
    "let's take a look": { reason: "lexical_expression", split: "let's → leiskime, take → imkime, a → —, look → žvilgsnį is a calque; the invitation = pažiūrėkime.", minimal: "A fixed four-word phrase." },
    "let me check": { reason: "lexical_expression", split: "let → leiskite + me → man + check → patikrinti is a calque; the doctor's “let me check” = patikrinsiu.", minimal: "All three words; the object stays outside." },
    "roll up": { reason: "lexical_expression", split: "roll → ritinti + up → aukštyn is prohibited as mechanical; roll up a sleeve = pasiraitoti.", minimal: "Two words (C-PHR); the object stays outside." },
    "once more": { reason: "lexical_expression", split: "once → vieną kartą + more → daugiau gives a false “one time more (in amount)”; = dar kartą.", minimal: "Two words." },
    "lie down": { reason: "lexical_expression", split: "lie → gulėti + down → žemyn is prohibited as mechanical; = atsigulti.", minimal: "Two words (C-PHR)." },
    "turn around": { reason: "lexical_expression", split: "turn → sukti + around → aplink gives a false “turn something round about”; turning yourself = apsisukti.", minimal: "Two words (C-PHR)." },
    "it hurt": { reason: "grammatical_fusion", split: "it → tai + hurt → skaudėti gives a false subject; the impersonal Lithuanian verb skauda absorbs the empty subject (C-DUMMY).", minimal: "Two words." },
    "it hurts": { reason: "grammatical_fusion", split: "It → Tai + hurts → skauda gives a false subject; the impersonal Skauda absorbs the empty subject (C-DUMMY, like “It starts → Pradeda”).", minimal: "Two words." },
    "it doesn't hurt": { reason: "grammatical_fusion", split: "it → tai is an empty subject and doesn't → ne- is the verb prefix (C-NEG); Lithuanian has one impersonal verb, neskauda.", minimal: "Three words." },
    "it doesn't get better": { reason: "grammatical_fusion", split: "it → tai is an empty subject (C-DUMMY), doesn't → ne- is the verb prefix (C-NEG), get → gauti + better → geriau is false for “improve” (= pagerėti): one Lithuanian verb, nepagerės.", minimal: "Four words; nothing inside is glossable on its own." },
    "a little": { reason: "lexical_expression", split: "a → — + little → mažas gives a false “small”; the degree adverb = truputį.", minimal: "Two words (C-LEX)." },
    "a few": { reason: "lexical_expression", split: "a → — + few → nedaug would give “not many”; “a few” = kelios.", minimal: "Two words." },
    "for now": { reason: "lexical_expression", split: "for → už + now → dabar is false; = kol kas.", minimal: "Two words." },
    "date of birth": { reason: "lexical_expression", split: "date → data + of birth → gimimo keeps English order (data gimimo); the set term = gimimo data.", minimal: "A fixed three-word term." },
    "side effects": { reason: "lexical_expression", split: "side → šonas + effects → poveikiai names nothing; the term = šalutinis poveikis.", minimal: "Compound noun." },
    "go ahead": { reason: "lexical_expression", split: "go → eikite + ahead → pirmyn is literal; an invitation to ask = klauskite.", minimal: "Two words." },
    "harbor pharmacy": { reason: "lexical_expression", split: "Harbor → uosto + Pharmacy → vaistinė would translate a shop's proper name.", minimal: "A proper name." },
    "on main street": { reason: "grammatical_fusion", split: "on → ant is false for a street; the locative Main Street gatvėje carries it.", minimal: "Preposition + street name, nothing glossable inside." },
    "front desk": { reason: "lexical_expression", split: "front → priekinis + desk → stalas names a piece of furniture; the clinic's front desk = registratūra.", minimal: "Compound noun." },
    "i've got": { reason: "grammatical_fusion", split: "I've → aš turiu is false: the perfect auxiliary 've has no word, and have got = have (turiu).", minimal: "Two words; the object stays outside." },
    "i've had": { reason: "grammatical_fusion", split: "I've → aš turiu is false: the perfect auxiliary has no word; Lithuanian uses the present for a state that goes on (turiu).", minimal: "Two words; the object stays outside." },
    "what if": { reason: "lexical_expression", split: "what → kas + if → jei is a calque; asking about a possibility = o jei.", minimal: "Two words." },
    "not really": { reason: "grammatical_fusion", split: "not → ne + really → tikrai gives “not surely”; the hedge is one Lithuanian adverb, nelabai.", minimal: "Two words (C-NEG)." },
  },

  grammar: {
    macros: {
      badly: "(bad | terrible | awful | horrible | really bad | very bad | slight | little | mild | high | small | strong | nasty | constant | light | low | little bit of a | bit of a | sore | painful)",
      sym_np: "[a | an | the | some | my | this] [@badly] {symptom}",
      have_pre: "(i have | i have got | i got | i have had | i have been having | i am having | i caught | i have caught | i think i have | i think i have got | i think i caught | i think i got | i probably have | i am suffering from | i suffer from | i seem to have | i also have | and i have | i have also got)",
      dur_amount: "[about | around | almost | nearly | just | only | maybe | over | more than | already | like | probably] ({n:number} (days #unit_d | day #unit_d | weeks #unit_w | week #unit_w | hours #unit_h | hour #unit_h) | a day #d1 | one day #d1 | a couple of days #d2 | a couple days #d2 | a few days #d3 | two or three days #d3 | a week #d7 | one week #d7 | a couple of weeks #d14 | two weeks #d14 | a few weeks #d14 | a while #d7 | a long time #d14 | a few hours #d0 | a couple of hours #d0 | an hour #d0 | a month #d30 | {n:number} or {n2:number} (days #unit_d | weeks #unit_w)) [now | already | or so]",
      dur_since: "(since | from) [about] (yesterday #d1 | last night #d1 | this morning #d0 | [the] morning #d0 | today #d0 | the weekend #d3 | last weekend #d3 | last week #d7 | last month #d30 | [last] {day} #dday | {n:number} days ago #unit_d | a few days ago #d3 | two days ago #d2 | three days ago #d3 | yesterday (morning | evening | afternoon) #d1)",
      dur_tail: "(@dur_since | [for] @dur_amount)",
      had_it: "(i have had (it | this | them | that | the pain | these symptoms | the {symptom}) | it has been (going on | like this | bad | hurting) | i have it | i have been (sick | ill | like this | feeling like this | feeling bad) | i am sick | i feel like this | it is like this)",
      when_tail: "(this morning | last night | yesterday | today | in the morning | at night | yesterday evening | yesterday morning | [at] the highest | at most | before i came | at home | an hour ago | this afternoon | in the evening)",
      otc: "(ibuprofen #ibu | advil #ibu | motrin #ibu | aspirin #ibu | painkillers #ibu | pain killers #ibu | a painkiller #ibu | pain pills #ibu | tylenol #para | acetaminophen #para | paracetamol #para #tip:us_tylenol | cough syrup #cough | cough medicine #cough | cough drops #cough | throat lozenges #cough | lozenges #cough | nyquil #cough | dayquil #cough | cold medicine #cough | pepto #stom | pepto bismol #stom | tums #stom | antacids #stom | nasal spray #nose | allergy pills #nose | something for the pain #ibu | something for the fever #para | something from the (pharmacy | drugstore) #otc | some pills #otc | pills #otc | medicine #otc | some medicine #otc)",
      it_med: "(it | them | this | these | the pills | the medicine | this medicine | the tablets | the antibiotic | the antibiotics)",
      ahs: "(a | ah | ahh | aa | aaa | aaaa | aaaaa | aaaaaa | aah | aaah | aaaah | aaaaah | aaaaaah | ahhh | ahhhh | ahhhhh | aahh | aaahh | aaaahh | haa | haaa | ha)",
    },
    slots: {
      temp: { fn: tempSlot },
      numdate: { fn: numDate },
      syms: { pattern: "@sym_np [(and | and also | and a | and an | plus | with | also | and some | and my) @sym_np] [[and] @sym_np]" },
      part: { lexicon: [
        { id: "sore_throat", forms: ["throat"] },
        { id: "headache", forms: ["head", "forehead"] },
        { id: "stomachache", forms: ["stomach", "belly", "tummy", "stomach area"] },
        { id: "earache", forms: ["ear"] },
        { id: "earache", forms: ["left ear"], tags: ["side_left"] },
        { id: "earache", forms: ["right ear"], tags: ["side_right"] },
        { id: "earache", forms: ["ears", "both ears", "both my ears"], tags: ["side_both"] },
        { id: "back_pain", forms: ["back", "lower back", "upper back"] },
        { id: "aches", forms: ["whole body", "body", "muscles", "joints", "arms and legs"] },
      ] },
    },
  },

  intents: {
    // --- what's wrong -----------------------------------------------------------------------
    symptom: { patterns: [
      "@have_pre {syms} [@dur_tail] #h:have",
      "@have_pre (a | high | a high | slight | a slight | little | a little)? (fever | temperature) (of | about | like)? {temp} [@when_tail] [@dur_tail] #s_fever",
      "(a | high | a high | slight | a slight | little | a little)? (fever | temperature) (of | about | like | around) {temp} [@when_tail] [@dur_tail] #s_fever",
      "[yes] i (have | have got | had) a (fever | temperature) [@when_tail] #s_fever #h:fever_yes",
      "my {part} (hurts | is hurting | aches | is aching | is sore | really hurts | is killing me | is very painful | is painful | is very sore | feels bad | feels sore | is bad | is not good | is not okay | is very bad) [very much | so much | a lot | really bad | badly | all the time | a little | a bit] [@dur_tail] #h:body_hurts",
      "(i have got | i have) (a | my) sore throat and (a | high | a high) temperature [@dur_tail] #s_sore_throat #s_fever #h:song",
      "my {part} and [my] {part2:part} (hurt | are hurting | hurt a lot | are sore | ache | are aching | really hurt | are killing me) [@dur_tail]",
      "(i have | i have got | i feel) [a | some | bad | a bad | terrible | a terrible | a lot of | strong | a strong | sharp | a sharp] pain in my {part} [@dur_tail]",
      "it (hurts | is painful | is hard | is difficult) (when i swallow | to swallow | when i eat | when i talk | when i drink) [@dur_tail] #s_sore_throat #h:swallow",
      "i can not (swallow | eat | talk) [anything | properly | well] [because of my throat] #s_sore_throat",
      "i (feel | am | am feeling | have been feeling | get | got) [very | really | a bit | a little | so | kind of | always] dizzy [@dur_tail] #s_dizzy #h:dizzy",
      "(my head is spinning | everything is spinning | the room is spinning) #s_dizzy",
      "i (feel | am | am feeling | have been feeling | have been) [very | really | so | always | a bit | a little | kind of | extremely] (tired | exhausted | weak) [all the time | all day | every day | a lot] [@dur_tail] #s_fatigue #h:tired",
      "i have no energy [at all] #s_fatigue",
      "i (am | have been) coughing [a lot | all the time | all night | so much] [@dur_tail] #s_cough",
      "i (keep | can not stop) coughing [@dur_tail] #s_cough #h:coughing",
      "i cough [a lot | all the time | all night | at night | very much | so much | every night | all day] [@dur_tail] [and i can not sleep] #s_cough",
      "i can not sleep [well | at night] [because of (it | the cough | the pain | my throat | my back)] #s_fatigue",
      "i (hurt | injured | pulled | strained) my {part} [[and] it (is | is really | is very | is so) (painful | sore | bad)] [@dur_tail]",
      // "I don't have a fever, but my throat hurts": the negative part and the symptom in one answer
      "(i do not have | there is no | no) [a | an | any] {neg:symptom} but my {part} (hurts | is sore | aches | really hurts | is hurting) [@dur_tail]",
      "(i do not have | there is no | no) [a | an | any] {neg:symptom} but (i have | i have got) {syms} [@dur_tail]",
      "i (keep | can not stop | have been) sneezing #s_runny_nose",
      "my nose (is running | is runny | runs | is dripping | will not stop running) [@dur_tail] #s_runny_nose #h:nose",
      "my nose is (stuffy | blocked | stuffed up | stuffed | congested) [@dur_tail] #s_stuffy_nose",
      "i can not breathe through my nose #s_stuffy_nose",
      "i (feel | am | am feeling) (hot | feverish | hot and cold) [@dur_tail] #s_fever",
      "i (am | have been) running a (fever | temperature) [@dur_tail] #s_fever",
      "(i threw up | i have been throwing up | i am throwing up | i keep throwing up | i vomited | i have been vomiting | i feel sick to my stomach | i feel nauseous | i have diarrhea | i was sick to my stomach) [@dur_tail] #s_stomachache",
      "i ate something bad #s_stomachache",
      "(everything | my whole body | my body | all my body) (hurts | aches) #s_aches",
      "i ache all over #s_aches",
      "(the problem is | it is) (my {part} | [a | an | the] {symptom})",
      "@have_pre [a | an | some] [@badly] (earache | ear ache | ear pain | ear infection | pain) in my {part} [@dur_tail]",
      "(i have | i have got | i think i have) flu #s_flu #tip:us_flu",
    ] },
    // "Sore throat." / "A bad cough and a fever." as the answer to "What seems to be the problem?"
    symptom_ctx: { patterns: ["[just | only | mostly | mainly] {syms} [@dur_tail]", "(fever | temperature | a fever | a temperature) [of] {temp} [@when_tail] [@dur_tail] #s_fever",
      "[my | the] {part} [@dur_tail]"] },
    sym_neg: { patterns: [
      "(i do not have | i have not got | i have not had | i did not have | i do not think i have) [a | an | any] [@badly] {symptom}",
      "(no | not) [a | an | any] [@badly] {symptom} [at all | i think]",
      "(there is | i have) no {symptom}",
      "my {part} (does not hurt | is fine | is okay | is not sore | does not ache)",
      "i am not (coughing #s_cough | dizzy #s_dizzy | tired #s_fatigue)",
      "without (a | an | any)? {symptom}",
      "i do not (feel hot | think i have a fever) #s_fever",
    ] },
    // "No, that's all." / "Just the sore throat." to "Any other symptoms?"
    sym_none: { patterns: ["[no] no other symptoms #h:no_other", "[no] (just | only) (that | this | the one)", "[no] nothing (else | more) [really]", "[no] (that is | it is) (all | it | everything) [i think]"] },
    feel_sick: { patterns: [
      "i (feel | am | am feeling | have been feeling) [very | really | so]? (sick | ill | unwell | terrible | awful | horrible | bad | not well | not good | not great | not so good | not very well | lousy | miserable)",
      "i do not feel (well | good | great | so good | very well | okay | too good) #h:feel_sick",
      "i am not feeling (well | good | great | very well | so good | okay | too good)",
      "(i am | i feel) [a bit | a little]? under the weather",
      "i think i am (getting | coming down with) something",
      "(something is wrong with me | i do not know what is wrong [with me])",
    ] },
    help_me: { patterns: ["(can | could) you help me [please]", "i need [some | your] help [please]", "i (have | have got) a (question | problem)",
      "[yes] [i have] (just | only)? one [more] (question | thing)", "[yes] (a | one) question", "[yes] (can | may) i ask (something | a question)"] },
    // "Terrible." / "Pretty bad, actually." to "How are you feeling today?"
    feel_bad_ctx: { patterns: ["[pretty | really | very | quite | so]? (bad | terrible | awful | horrible | lousy | miserable | sick | not good | not well) [actually | to be honest | honestly] #h:feel_bad"] },
    nice_meet: { patterns: ["(nice | pleased | glad | good) to meet you [too | as well]", "nice meeting you [too]", "you too", "likewise", "(nice | good) to see you [too | again]"] },

    // --- how long, pain scale -------------------------------------------------------------
    howlong_ans: { patterns: [
      "@dur_since #h:since",
      "[for] @dur_amount #h:for_days",
      "@had_it [for] @dur_amount #h:had_it",
      "@had_it @dur_since",
      "(it | this | the pain | the {symptom} | everything | it all) (started | began | came) (yesterday #d1 | this morning #d0 | last night #d1 | today #d0 | a few days ago #d3 | two days ago #d2 | three days ago #d3 | last week #d7 | [on] {day} #dday | {n:number} (days #unit_d | weeks #unit_w) ago | a week ago #d7 | on the weekend #d3 | over the weekend #d3)",
      "(yesterday #d1 | last night #d1 | this morning #d0 | today #d0 | on {day} #dday | last week #d7 | [last] {day} #dday | yesterday (morning | evening | afternoon) #d1)",
      "{n:number} (days #unit_d | day #unit_d | weeks #unit_w | week #unit_w) ago",
      "a (few | couple of) days ago #d3",
      "(since | already) {n:number} (days #unit_d | day #unit_d | weeks #unit_w | week #unit_w) [already]",
      "(it is | this is | today is) the {ord:ordinal} day [already | now] #dord",
      "not (long | very long) #d0",
      "(only | just) (today #d0 | since this morning #d0 | a day #d1 | one day #d1 | two days #d2)",
      "i (got | became | have been) sick (@dur_since | [for] @dur_amount | yesterday #d1 | last night #d1)",
    ] },
    scale_ctx: { patterns: [
      "[about | around | maybe | like | i would say | probably | it is | it is about | i think | i guess | now it is] [a] {n:number} [out of ten | or {n2:number}] #h:scale_num",
      "(very | really) (bad | strong | painful) #sc8", "(pretty | quite) (bad | strong) #sc7", "not (so | too | that) bad #sc4",
      "(a little | mild | not much | not strong) #sc3", "(terrible | unbearable | the worst | very very bad) #sc9", "(medium | in the middle | moderate | so so) #sc5",
    ] },

    // --- fever --------------------------------------------------------------------------------
    temp_ans: { patterns: [
      "[yes] [it is | it was | my temperature (is | was) | the temperature (is | was) | i have | i had | it went up to | it got to | it got up to | it reached | the thermometer (said | showed) | i measured | i checked and it was | last time it was] [about | around | almost | nearly | over | more than | maybe | like | exactly | a little over | just over | up to] {temp} [@when_tail] [@dur_tail] #h:temp",
      "[yes] [i have | i had] (a | high | a high | slight | a slight | little | a little)? (fever | temperature) (of | about | like)? {temp} [@when_tail] [@dur_tail]",
      "[about | around] {temp} or {t2:temp} [@when_tail]",
      "between {temp} and {t2:temp}",
    ] },
    fever_yes_ctx: { patterns: [
      "[yes] (i think so | a little | a bit | a little bit | i think i do | i think i did | a low one | a slight one | a little one | i had one | i feel hot | i feel feverish)",
      "[yes] (last night | this morning | yesterday | at night | in the evening | since yesterday | every night | on and off)",
    ] },
    temp_unknown: { patterns: [
      "[no] i (did not | have not | could not | forgot to | did not have time to) (check | measure | take) [it | my temperature | the temperature] #h:temp_unknown",
      "[no] i (do not | did not) have a thermometer [at home] #h:temp_unknown", "[no] (i have no | no) thermometer",
      "[no] i do not know (how high | exactly | the number | the temperature | how much) [it was]", "[no] i am not sure [how high | exactly]",
      "[no] i (do not | did not) (check | measure) [it]",
    ] },
    temp_dunno_ctx: { patterns: ["[no] (i do not know | no idea | i am not sure | not sure | i have no idea) [sorry]"] },

    // --- medicine they take, allergies ---------------------------------------------------
    meds_ans: { patterns: [
      "[no] (nothing | nothing yet | nothing at all | nothing so far) #none",
      "[no] i am not taking (anything | any medicine | any medication | any pills | anything for it) [yet] #none #h:meds_none",
      "[no] i (have not | did not) (take | taken | took) anything [for it | yet] #none",
      "[no] (i do not take | i am not on) (anything | any medicine | any medication) #none",
      "[yes] [i took | i am taking | i take | i have taken | i have been taking | i tried | just | only | i took some | i had] [some | a | an] @otc [and [some] @otc] [every day | twice a day | every morning | every six hours | when it hurts | at night | yesterday | this morning | last night] #h:meds_ibu",
      "[yes] i (drink | have been drinking | am drinking | drank) [a lot of | lots of | some] (tea | hot tea | tea with honey | tea with lemon | honey | water | hot water) [with (honey | lemon | honey and lemon)] #home #h:meds_tea",
      "[yes] i (took | am taking | have been taking | take) [some | an] (antibiotics | antibiotic | my old antibiotics) #antib",
      "[yes] (just | only) (vitamins | vitamin c | tea with honey | hot tea | honey) #home",
    ] },
    meds_ctx: { patterns: ["[yes] (tea | hot tea | honey | tea with honey | tea with lemon | vitamins | vitamin c | chicken soup | hot water) #home"] },
    allergy_ans: { patterns: [
      "[no] i am not allergic to (anything | any medicine | any medications | medicine | medicines) #none #h:allergy_none",
      "[no] (i do not have | i have no) [any] (allergies | allergy | drug allergies) [that i know of] #none #h:allergy_no_any",
      "[no] (none | nothing) [that i know of] #none", "[no] not that i know of #none", "[no] no allergies #none", "[no] i am not allergic #none",
      "[no] i am not allergic to (penicillin | aspirin | ibuprofen | antibiotics | nuts | anything else)",
      "[yes] i am [very] allergic (to | on | for) (penicillin #pen | amoxicillin #pen | aspirin #nsaid | ibuprofen #nsaid | sulfa #other | codeine #other | antibiotics #other | some antibiotics #other | nuts #other | peanuts #other | latex #other | pollen #other) #h:allergy_pen",
      "[yes] i (have | have got) [an] allergy (to | for | on) (penicillin #pen | amoxicillin #pen | aspirin #nsaid | ibuprofen #nsaid | sulfa #other | codeine #other | antibiotics #other)",
      "[yes] i have a (penicillin #pen | aspirin #nsaid | nut #other | sulfa #other) allergy",
      "[yes] i can not take (penicillin #pen | amoxicillin #pen | aspirin #nsaid | ibuprofen #nsaid)",
      "[no] i (do not think so | think not) #none",
    ] },
    allergy_dunno_ctx: { patterns: ["[no] (i do not know | i am not sure | not sure | i do not remember | no idea | i have no idea) [sorry]"] },
    allergy_ctx: { patterns: ["[yes] [just | only] (to)? (penicillin #pen | amoxicillin #pen | aspirin #nsaid | ibuprofen #nsaid | sulfa #other | codeine #other | nuts #other | latex #other)"] },

    // --- the exam ----------------------------------------------------------------------------
    ready_ctx: { patterns: ["(done | ready | all set | all done | i am ready | okay i am ready | there you go | here you go | okay done)"] },
    like_this_ctx: { patterns: ["[okay] (like this | is this (okay | right | good | fine | correct) | is it (okay | right | good) | how is this | this way | like that | is that (okay | right | good)) #h:like_this"] },
    breath_ctx: { patterns: ["(hhh | hhhh | hh | haaa | huuu | whoo | whoosh | fff | ffff | phew | [okay] (in | breathing in | breathe in) [and] out | i am breathing | okay i am breathing)"] },
    breath_hard: { patterns: [
      "it (hurts | is painful) (when i breathe | to breathe | when i take a deep breath | when i breathe in) #h:breath_hard", "breathing hurts",
      "i can not (take a deep breath | breathe deeply | breathe well | breathe)", "(it is | that is) (hard | difficult) to breathe",
    ] },
    ah_ctx: { patterns: ["@ahs [@ahs] [@ahs] #h:ah"] },
    hurt_yes_ctx: { patterns: [
      "[yes] it (hurts | is painful | is sore | does | really hurts | hurts a lot | hurts so much | hurts there) #h:hurt_yes", "(ouch | ow | oww | ouch ouch | ow ow | oh ouch) [yes] #h:hurt_ouch",
      "[yes] (right | just)? (there | here)", "[yes] (a lot | very much | so much | really bad)", "[yes] (it | that)? (hurts | is sore) (here | there | right there)", "[yes] here (hurts | it hurts)", "[yes] (that | this) (hurts | is painful | is sore)",
      "[yes] it is (very | really)? (painful | sore | tender)",
    ] },
    hurt_little_ctx: { patterns: [
      "[yes] (a little | a bit | a little bit | slightly | kind of | sort of | just a little | only a little | not much | not too much) [sore | painful] #h:hurt_little",
      "[yes] it (hurts | is sore | is painful) (a little | a bit | a little bit | slightly)", "it does not hurt (much | that much | too much | a lot)", "[yes] it is a (little | bit) sore",
    ] },
    hurt_no_ctx: { patterns: [
      "[no] it does not hurt [at all] #h:hurt_no", "[no] (it is fine | it is okay | that is fine | no pain | i do not feel anything | i feel nothing | not there | nothing)",
      "[no] it does not", "[no] (does not hurt | no it does not hurt)",
    ] },
    which_arm_ctx: { patterns: ["(which | what) arm #h:which_arm", "(left | right) (or | and) (left | right) [arm]", "which (one | side)", "(the)? (left | right) [one | arm]", "(this | that) arm"] },

    // --- questions about the illness -------------------------------------------------------
    ask_serious: { patterns: ["is (it | this | that) (serious | dangerous | bad | something serious | something bad) #h:q_serious", "(should | do) i (worry | be worried)", "am i (very)? sick", "is (it | this) (something | anything) serious", "is it very bad"] },
    ask_contagious: { patterns: [
      "is (it | this | that) (contagious | infectious | catching) #h:q_contagious", "can i (give | pass) it to (my family | my kids | my children | my wife | my husband | other people | my colleagues | someone | anyone)",
      "(can | will) (my family | my kids | other people | people) (catch | get) it",
    ] },
    ask_antibiotics: { patterns: [
      "do i need (antibiotics | an antibiotic) #h:q_antibiotics", "(can | could) i (get | have) (antibiotics | an antibiotic)", "(should | do) i (take | need to take) (antibiotics | an antibiotic)",
      "(will | would) (antibiotics | an antibiotic) help", "(can | could) you give me (antibiotics | an antibiotic)", "what about antibiotics",
    ] },
    ask_what: { patterns: ["what (is it | do i have | is wrong [with me] | is the problem | could it be | is it exactly)", "is it (a virus | an infection | the flu | strep | covid | a cold)"] },
    ask_better: { patterns: [
      "when will i (feel | be | get) better #h:q_better", "how long (will | does) it (take | last) [to get better]", "when will (it | this) (go away | get better | stop | pass)", "how long will i be sick",
    ] },
    ask_work: { patterns: [
      "can i go (to work | to school | to the office) [tomorrow | this week | on {day}] #h:q_work", "(should | can) i stay (home | at home)", "do i (need | have) to stay (home | at home)",
      "can i work [tomorrow | from home]", "(should | can) i go to work", "when can i go back to work",
    ] },
    ask_note: { patterns: [
      "(can | could | may) i (get | have) a (note | doctor's note | letter) [for (work | my work | my boss | my employer | school)] #h:q_note",
      "(can | could | may) i (get | have) a sick note [for (work | my boss | my employer)] #tip:us_note",
      "i need a (note | doctor's note) [for (work | my boss | my employer)]", "i need a sick note [for (work | my boss)] #tip:us_note",
      "(can | could) you (give me | write me | write) a (note | doctor's note) [for work]", "(can | could) you (give me | write me | write) a sick note [for work] #tip:us_note",
    ] },
    ask_not_better: { patterns: [
      "what if it (does not get better | does not go away | gets worse | does not help | does not work) #h:q_not_better",
      "(what should | what do) i do if it (does not get better | gets worse | does not go away)", "and if it (does not get better | gets worse)",
    ] },
    ask_eat: { patterns: ["what (should | can) i eat", "(can | should) i eat [normally | everything]", "is there anything i (should not | can not) eat"] },
    ask_exercise: { patterns: ["can i (exercise | go to the gym | work out | go running | do sports | play sports | go swimming)", "is it okay to (exercise | work out | go to the gym)"] },
    ask_cost: { patterns: ["how much (is | does) (the visit | this | it | the appointment) cost", "do you (take | accept) my insurance", "how much do i (owe | pay)", "where do i pay", "i do not have insurance"] },

    // --- questions about the medicine -----------------------------------------------------
    ask_dosage: { patterns: [
      "how (often | many times [a day]) (should | do | can | must) i take @it_med #h:q_how_often", "how many (pills | tablets | times) (a day | per day | should i take)",
      "how (do | should) i take @it_med", "what is the dose", "how often", "how many [a day]", "how many (should | can) i take",
      "(can | could) you (repeat | say) (the dose | how to take it) [again]", "one pill (how often | when)",
    ] },
    ask_meals: { patterns: [
      "(before | after | with) (meals | food | eating) or (before | after | with) [meals | food | eating] #h:q_meals", "(before | after) or (before | after) (meals | food | eating | the meal | a meal) #h:q_meals", "(should | do | can) i take @it_med (before | after | with) (meals | food | eating | breakfast)",
      "(before | after) (meals | food | eating)", "on an empty stomach", "(do | should) i (need to)? eat (first | before)", "(should | do | can) i take @it_med on an empty stomach",
    ] },
    ask_duration: { patterns: ["for how long #h:q_how_long", "how long (should | do | must) i take @it_med [for]", "how many days [should i take @it_med]", "(until | till) when", "for how many days"] },
    ask_side: { patterns: ["(are there | does it have | do they have | is there) (any)? side effects #h:q_side", "what are the side effects", "(is it | is this medicine | is this) (safe | strong)", "any side effects"] },
    ask_alcohol: { patterns: [
      "can i (drink | have) (alcohol | a beer | beer | wine | a glass of wine | a drink) [with @it_med | while (taking it | i take it | i am taking it)] #h:q_alcohol",
      "is it (okay | safe) to drink (alcohol | wine | beer) [with @it_med]", "what about alcohol",
    ] },
    ask_drive: { patterns: ["can i drive [with it | after taking it | a car] #h:q_drive", "is it (safe | okay) to drive", "will it make me (sleepy | drowsy | tired)", "(does | do) (it | they) make you (sleepy | drowsy)"] },
    clear_ctx: { patterns: [
      "[no] (that is | it is | everything is | all) (clear | understood) [now] #h:q_none", "[no] i (understand | got it) [everything]", "[no] [i have] no [more | other] questions",
      "[no] i do not have (any | any more | any other) questions", "[no] (that is | it is) all [clear]", "[no] (you | it) (explained | was) (everything | clear | very clear)",
    ] },

    // --- pharmacy, note, date of birth ---------------------------------------------------
    pharmacy_ans: { patterns: [
      "[the] harbor pharmacy [please | is fine | is good] #h:ph_harbor", "[to] [the] (pharmacy | one) on main street [please]", "main street [please]",
      "[the] (closest | nearest) (one | pharmacy) [please]", "(any | whatever) pharmacy [is fine | is okay | is good] #any #h:ph_any", "(any | whatever) one [is fine]",
      "[to] (cvs | walgreens | rite aid | walmart) [please] #other",
      "[no] i do not (have one | have a pharmacy) [yet] #unknown", "i am new (here | in town) #unknown",
      "[i do not know] you (choose | decide) #any",
    ] },
    pharmacy_dunno_ctx: { patterns: ["[no] (i do not know | i am not sure | i have no idea | no idea) [i am new (here | in town)] #h:ph_new"] },
    note_ctx: { patterns: ["[yes] (for work | for my boss | for my employer | a note for work) [please] #yes", "[no] i (work from home | am on vacation | do not work | am retired | do not need one | am a tourist) #no #h:note_no",
      "[no] i do not need (a note | one | it) [thanks] #no"] },
    dob_ans: { patterns: [
      "[it is | my date of birth is | i was born on | born on | my birthday is] {date} [{year}] #h:dob", "[the] {date} {year}", "[it is] {year} [on]? {date}",
      "[i was] born in {year} [on] {date}", "my (birthday | birth date | date of birth | dob) is [on] {date} [{year}]", "[it is | i was born on] {numdate}",
    ] },
    year_ctx: { patterns: ["[in] {year}"] },
  },

  lines: {
    // --- greetings -------------------------------------------------------------------------
    greet: [
      t("Hi, | I'm | Dr. | Carter. | What | seems | to be | the | problem?", "Sveiki, | aš esu | gydytoja | Carter. | Kokia | atrodo | esanti | — | problema?", "Sveiki, aš – gydytoja Carter. Kuo skundžiatės?"),
      t("Hello! | I'm | Dr. | Carter. | What | brings | you | in | today?", "Sveiki! | Aš esu | gydytoja | Carter. | Kas | atveda | jus | — | šiandien?", "Sveiki! Aš – gydytoja Carter. Kas jus šiandien atvedė?",
        { flags: { 7: FLAG_IN } }),
      t("Hi there, | I'm | Dr. | Carter. | Nice | to meet | you. | What | seems | to be | the | problem?", "Sveiki, | aš esu | gydytoja | Carter. | Malonu | susipažinti | su jumis. | Kokia | atrodo | esanti | — | problema?",
        "Sveiki, aš – gydytoja Carter. Malonu susipažinti. Kuo skundžiatės?"),
    ],
    greet_back: [
      t("Hello | again! | What | seems | to be | the | problem | today?", "Sveiki | vėl! | Kokia | atrodo | esanti | — | problema | šiandien?", "Sveiki vėl! Kuo šiandien skundžiatės?"),
      t("Good | to see | you | again! | What | brings | you | in | today?", "Gera | matyti | jus | vėl! | Kas | atveda | jus | — | šiandien?", "Malonu vėl jus matyti! Kas jus šiandien atvedė?",
        { flags: { 7: FLAG_IN } }),
    ],
    greet_feeling: [
      t("Hi, | I'm | Dr. | Carter. | How | are | you | feeling | today?", "Sveiki, | aš esu | gydytoja | Carter. | Kaip | — | jūs | jaučiatės | šiandien?", "Sveiki, aš – gydytoja Carter. Kaip šiandien jaučiatės?",
        { flags: { 5: "Progressive “are” has no Lithuanian word; jaučiatės carries the tense (linked to “feeling”)." } }),
    ],
    greet_back_feeling: [
      t("Hello | again! | How | are | you | feeling?", "Sveiki | vėl! | Kaip | — | jūs | jaučiatės?", "Sveiki vėl! Kaip jaučiatės?",
        { flags: { 3: "Progressive “are” has no Lithuanian word; jaučiatės carries the tense (linked to “feeling”)." } }),
    ],
    greet_hi: [t("Hi, | I'm | Dr. | Carter.", "Sveiki, | aš esu | gydytoja | Carter.", "Sveiki, aš – gydytoja Carter.")],
    greet_back_hi: [t("Hello | again!", "Sveiki | vėl!", "Sveiki vėl!")],
    ask_dob: [
      t("Before | we | start, | can | you | confirm | your | date of birth | for me?", "Prieš | mums | pradedant, | ar galite | jūs | patvirtinti | savo | gimimo datą | man?",
        "Prieš pradedant: ar galite patvirtinti savo gimimo datą?"),
      t("Can | you | confirm | your | date of birth | for me, | please?", "Ar galite | jūs | patvirtinti | savo | gimimo datą | man, | prašau?", "Ar galite patvirtinti savo gimimo datą?"),
    ],
    dob_year: [t("And | the | year?", "O | — | metai?", "O metai?")],
    dob_thanks: [t("Thank | you.", "Dėkoju | jums.", "Ačiū."), t("Perfect, | thanks.", "Puiku, | ačiū.", "Puiku, ačiū.")],
    fine_glad: [t("Good! | So, | what | brings | you | in | today?", "Gerai! | Taigi, | kas | atveda | jus | — | šiandien?", "Gerai! Taigi, kas jus šiandien atvedė?", { flags: { 5: FLAG_IN } })],

    // --- what's wrong ------------------------------------------------------------------------
    ask_problem: [
      t("So, | what | brings | you | in | today?", "Taigi, | kas | atveda | jus | — | šiandien?", "Taigi, kas jus šiandien atvedė?", { flags: { 4: FLAG_IN } }),
      t("What | seems | to be | the | problem?", "Kokia | atrodo | esanti | — | problema?", "Kuo skundžiatės?"),
      t("So, | what | can | I | do | for you | today?", "Taigi, | ką | galiu | aš | padaryti | jums | šiandien?", "Taigi, kuo šiandien galiu padėti?"),
    ],
    problem_help: [
      t("Just | tell | me | what's | bothering | you. | A | sore | throat? | A | cough?", "Tiesiog | pasakykite | man | kas | vargina | jus. | — | Skaudanti | gerklė? | — | Kosulys?",
        "Tiesiog pasakykite, kas jus vargina. Skauda gerklę? Kosulys?",
        { flags: { 3: "“'s” (is): the progressive auxiliary has no Lithuanian word; vargina carries the tense (linked to “bothering”)." } }),
    ],
    feel_sick_q: [t("I'm | sorry | to hear | that. | What | are | your | symptoms?", "Man | gaila | girdėti | tai. | Kokie | yra | jūsų | simptomai?", "Gaila tai girdėti. Kokie jūsų simptomai?")],
    sorry_sym: [
      t("Oh, | I'm | sorry | to hear | that.", "O, | man | gaila | girdėti | tai.", "O, gaila tai girdėti."),
      t("I'm | sorry | to hear | that.", "Man | gaila | girdėti | tai.", "Gaila tai girdėti."),
      t("Oh | no. | Okay, | let's see | what | we | can | do.", "O | ne. | Gerai, | pažiūrėkime, | ką | mes | galime | padaryti.", "O ne. Gerai, pažiūrėkime, ką galime padaryti."),
    ],
    sym_ack: [t("Okay.", "Gerai.", "Gerai."), t("I | see.", "Aš | suprantu.", "Suprantu."), t("Got it.", "Supratau.", "Supratau.")],
    late_sym: [t("Okay, | the | medicine | should | help | with | that, | too.", "Gerai, | — | vaistai | turėtų | padėti | nuo | to, | irgi.", "Gerai, vaistai turėtų padėti ir nuo to.")],
    go_ahead: [t("Sure, | go ahead.", "Žinoma, | klauskite.", "Žinoma, klauskite."), t("Of course. | Go ahead.", "Žinoma. | Klauskite.", "Žinoma. Klauskite.")],
    ask_more_sym: [t("Any | other | symptoms?", "Kokių nors | kitų | simptomų?", "Ar yra kitų simptomų?")],
    // "Anything else? A fever, a cough?": two examples the learner hasn't mentioned (see moreExamples)
    ...moreExampleLines(),
    what_else_sym: [t("What | else?", "Kas | dar?", "Kas dar?")],

    // --- how long, pain scale ----------------------------------------------------------------
    ask_howlong: [
      t("How | long | have | you | had | it?", "Kiek | laiko | — | jūs | turite | tai?", "Kiek laiko tai tęsiasi?",
        { flags: { 2: "Perfect “have” has no separate word: Lithuanian uses the present for a state that still goes on (linked to “had”)." } }),
      t("And | how | long | have | you | had | it?", "O | kiek | laiko | — | jūs | turite | tai?", "O kiek laiko tai tęsiasi?",
        { flags: { 3: "Perfect “have” has no separate word: Lithuanian uses the present for a state that still goes on (linked to “had”)." } }),
    ],
    ask_when: [t("When | did | it | start?", "Kada | — | tai | prasidėjo?", "Kada tai prasidėjo?", { flags: { 1: "Question “did” has no Lithuanian word; the past tense sits on prasidėjo." } })],
    howlong_help: [t("Roughly? | A few | days? | A | week?", "Apytiksliai? | Kelias | dienas? | — | Savaitę?", "Apytiksliai? Kelias dienas? Savaitę?")],
    days_short: [t("Okay, | so | it | just | started.", "Gerai, | vadinasi, | tai | ką tik | prasidėjo.", "Gerai, vadinasi, prasidėjo visai neseniai.")],
    days_long: [t("Okay, | that's | quite | a | while.", "Gerai, | tai yra | gana | — | ilgai.", "Gerai, tai gana ilgai.")],
    ask_scale: [
      t("On a scale | of | one | to | ten, | how | bad | is | the | pain?", "Skalėje | nuo | vieno | iki | dešimties, | kaip | stiprus | yra | — | skausmas?",
        "Kaip stipriai skauda, skalėje nuo vieno iki dešimties?"),
    ],
    scale_help: [
      t("Just | guess. | Is | it | bad, | or | not | too | bad?", "Tiesiog | spėkite. | Ar | — | stipriai, | ar | ne | per | stipriai?", "Tiesiog spėkite. Stipriai ar nelabai?",
        { flags: { 2: FLAG_IS, 3: "Dummy “it” has no Lithuanian word here (linked to “bad”)." } }),
    ],
    scale_high: [t("That | sounds | pretty | bad.", "Tai | skamba | gana | blogai.", "Skamba gana blogai.")],
    scale_low: [t("Okay, | not | too | bad, | then.", "Gerai, | ne | per daug | blogai, | vadinasi.", "Gerai, vadinasi, ne taip blogai.")],
    scale_mid: [t("Okay, | thanks.", "Gerai, | ačiū.", "Gerai, ačiū.")],

    // --- fever ----------------------------------------------------------------------------------
    ask_fever: [
      t("Have | you | had | a | fever?", "Ar | jūs | turėjote | — | karščio?", "Ar karščiavote?",
        { flags: { 0: "“Have” in a yes/no question = the particle ar; the past turėjote carries the perfect (linked to “had”)." } }),
      t("Do | you | have | a | fever?", "Ar | jūs | turite | — | karščio?", "Ar karščiuojate?", { flags: { 0: FLAG_DO } }),
    ],
    ask_temp_took: [t("Did | you | take | your | temperature?", "Ar | jūs | pasimatavote | savo | temperatūrą?", "Ar pasimatavote temperatūrą?",
      { flags: { 0: "Question “Did” = the particle ar; the past tense sits on pasimatavote." } })],
    ask_temp_high: [
      t("How | high | is | your | temperature?", "Kokia | aukšta | yra | jūsų | temperatūra?", "Kokia jūsų temperatūra?"),
      t("And | how | high | is | your | temperature?", "O | kokia | aukšta | yra | jūsų | temperatūra?", "O kokia jūsų temperatūra?"),
    ],
    ask_temp_how: [t("How | high | was | it?", "Kokia | aukšta | buvo | ji?", "Kokia buvo temperatūra?", { flags: { 3: FLAG_TEMP + " Hence ji." } })],
    fever_none: [t("Okay, | good.", "Gerai, | puiku.", "Gerai, puiku."), t("Good. | No | fever, | then.", "Gerai. | Jokio | karščio, | vadinasi.", "Gerai, vadinasi, nekarščiuojate.")],
    temp_check_later: [t("No | problem, | I'll check | it | in | a | minute.", "Jokių | problemų, | patikrinsiu | ją | po | — | minutės.", "Nieko tokio, po minutės patikrinsiu.",
      { flags: { 3: FLAG_TEMP + " Hence ją." } })],
    c_echo: [t("{$tc} | Celsius?", "{$tc} | pagal Celsijų?", "{$tc} pagal Celsijų?")],
    c_conv: [
      t("That's | about | {$tf} | Fahrenheit.", "Tai yra | maždaug | {$tf} | pagal Farenheitą.", "Tai maždaug {$tf} pagal Farenheitą."),
      t("That's | about | {$tf} | here, | in Fahrenheit.", "Tai yra | maždaug | {$tf} | čia, | pagal Farenheitą.", "Pas mus tai maždaug {$tf} pagal Farenheitą."),
    ],
    temp_normal: [t("That's | normal, | so | no | fever.", "Tai yra | normalu, | tad | jokio | karščio.", "Tai normali temperatūra, vadinasi, nekarščiuojate.")],
    temp_slight: [t("That's | just | a little | high.", "Tai yra | tik | truputį | aukšta.", "Temperatūra tik truputį pakilusi.")],
    temp_fever: [t("So | you | have | a | fever.", "Taigi | jūs | turite | — | karščio.", "Taigi, jūs karščiuojate."), t("That's | a | fever.", "Tai yra | — | karščiavimas.", "Vadinasi, karščiuojate.")],
    temp_high: [t("That's | a | pretty | high | fever.", "Tai yra | — | gana | aukšta | temperatūra.", "Tai gana aukšta temperatūra.")],
    temp_weird: [t("Hmm, | I'll check | it | myself | in | a | minute.", "Hmm, | patikrinsiu | ją | {sm:pats|sf:pati} | po | — | minutės.", "Hmm, po minutės {sm:pats|sf:pati} patikrinsiu.",
      { flags: { 2: FLAG_TEMP + " Hence ją." } })],
    temp_measure: [t("First, | I'll take | your | temperature.", "Pirmiausia | pamatuosiu | jūsų | temperatūrą.", "Pirmiausia pamatuosiu jums temperatūrą.")],
    temp_read: [t("It's | {$tm}.", "Ji yra | {$tm}.", "Temperatūra – {$tm}.", { flags: { 0: FLAG_TEMP + " Hence Ji yra." } })],

    // --- medicine taken ----------------------------------------------------------------------
    ask_meds: [
      t("Are | you | taking | anything | for | it?", "Ar | jūs | vartojate | ką nors | nuo | to?", "Ar vartojate ką nors nuo to?",
        { flags: { 0: "“Are” in a yes/no question = the particle ar; vartojate carries the progressive (linked to “taking”)." } }),
      t("Have | you | taken | anything | for | it?", "Ar | jūs | vartojote | ką nors | nuo | to?", "Ar ką nors vartojote nuo to?",
        { flags: { 0: "“Have” in a yes/no question = the particle ar; the past vartojote carries the perfect." } }),
    ],
    ask_meds_what: [t("What | are | you | taking?", "Ką | — | jūs | vartojate?", "Ką vartojate?", { flags: { 1: "Progressive “are” has no Lithuanian word (linked to “taking”)." } })],
    meds_help: [t("Any | pills, | like | ibuprofen | or | Tylenol?", "Kokių nors | tablečių, | pavyzdžiui | ibuprofeno | ar | „Tylenol“?", "Kokių nors tablečių, pavyzdžiui, ibuprofeno ar „Tylenol“?")],
    meds_pain_ok: [t("Okay, | that's | fine | for now.", "Gerai, | tai | tinka | kol kas.", "Gerai, kol kas tai tinka.")],
    meds_home_ok: [t("That's | good. | Warm | tea | helps.", "Tai yra | gerai. | Šilta | arbata | padeda.", "Gerai. Šilta arbata padeda.")],
    meds_other_ok: [t("Okay, | good | to know.", "Gerai, | gera | žinoti.", "Gerai, gera žinoti.")],
    ok_plain: [t("Okay.", "Gerai.", "Gerai."), t("Alright.", "Gerai.", "Gerai.")],

    // --- the exam -------------------------------------------------------------------------------
    exam_start: [
      t("I'd like | to examine | you | now.", "Norėčiau | apžiūrėti | jus | dabar.", "Dabar norėčiau jus apžiūrėti."),
      t("Alright, | let's take a look.", "Gerai, | pažiūrėkime.", "Gerai, pažiūrėkime."),
    ],
    bp_start: [t("Let me check | your | blood | pressure | first.", "Patikrinsiu | jūsų | kraujo | spaudimą | pirmiausia.", "Pirmiausia pamatuosiu jums kraujospūdį.")],
    bp_sleeve: [
      t("Could | you | roll up | your | sleeve?", "Ar galėtumėte | jūs | pasiraitoti | savo | rankovę?", "Ar galėtumėte pasiraitoti rankovę?"),
      t("Please | roll up | your | sleeve.", "Prašom | pasiraitoti | savo | rankovę.", "Prašom pasiraitoti rankovę."),
    ],
    bp_either_arm: [t("Either | arm | is fine.", "Bet kuri | ranka | tinka.", "Tinka bet kuri ranka.")],
    bp_relax: [t("Great. | Just | relax | for a moment.", "Puiku. | Tiesiog | atsipalaiduokite | akimirkai.", "Puiku. Akimirką tiesiog atsipalaiduokite.")],
    bp_result: [
      t("120 | over | 80. | That's | perfect.", "120 | per | 80. | Tai yra | puiku.", "120 per 80 – puiku.", { say: "One twenty over eighty. That's perfect." }),
      t("118 | over | 76. | That's | great.", "118 | per | 76. | Tai yra | puiku.", "118 per 76 – puiku.", { say: "One eighteen over seventy-six. That's great." }),
    ],
    listen_lungs: [t("I'll listen | to | your | lungs.", "Pasiklausysiu | — | jūsų | plaučių.", "Pasiklausysiu jūsų plaučių.",
      { flags: { 1: "“to” has no separate word: pasiklausyti takes the genitive plaučių (a possessive intervenes)." } })],
    deep_breath: [
      t("Take | a | deep | breath… | and | out.", "Padarykite | — | gilų | įkvėpimą… | ir | iškvėpkite.", "Giliai įkvėpkite… ir iškvėpkite.",
        { flags: { 5: "Elliptical “(breathe) out”: Lithuanian names the action, iškvėpkite." } }),
      t("Take | a | deep | breath | for me… | and | out.", "Padarykite | — | gilų | įkvėpimą | man… | ir | iškvėpkite.", "Giliai įkvėpkite… ir iškvėpkite.",
        { flags: { 6: "Elliptical “(breathe) out”: Lithuanian names the action, iškvėpkite." } }),
    ],
    breath_again: [t("Good. | Once more… | and | out.", "Gerai. | Dar kartą… | ir | iškvėpkite.", "Gerai. Dar kartą… ir iškvėpkite.",
      { flags: { 3: "Elliptical “(breathe) out”: Lithuanian names the action, iškvėpkite." } })],
    breath_easy: [t("That's | okay. | Just | breathe | normally.", "Tai | gerai. | Tiesiog | kvėpuokite | normaliai.", "Nieko tokio. Tiesiog kvėpuokite normaliai.")],
    good_ack: [t("Good.", "Gerai.", "Gerai."), t("Perfect.", "Puiku.", "Puiku."), t("Great.", "Puiku.", "Puiku.")],
    lungs_clear: [
      t("Your | lungs | sound | clear.", "Jūsų | plaučiai | skamba | švariai.", "Plaučiai švarūs."),
      t("Your | lungs | sound | good.", "Jūsų | plaučiai | skamba | gerai.", "Plaučiai skamba gerai."),
    ],
    lungs_wheeze: [t("I | can | hear | a little | wheezing, | but | it's | mild.", "Aš | — | girdžiu | truputį | švokštimo, | bet | jis yra | lengvas.", "Girdžiu truputį švokštimo, bet jis lengvas.",
      { flags: { 1: "“can” with a verb of perception: Lithuanian uses the plain verb girdžiu." } })],
    say_ah: [
      t("Now | open | your | mouth | and | say | “ah.”", "Dabar | atverkite | savo | burną | ir | pasakykite | „a“.", "Dabar atverkite burną ir pasakykite „a“."),
      t("Open | wide | and | say | “ah.”", "Išsižiokite | plačiai | ir | pasakykite | „a“.", "Plačiai išsižiokite ir pasakykite „a“."),
    ],
    ear_look: [t("Now | I'll look | in | your | ears.", "Dabar | pažiūrėsiu | į | jūsų | ausis.", "Dabar pažiūrėsiu jums į ausis.")],
    // the side the learner said ("My left ear hurts"), or just "your ear"
    ear_red: [t("Your | ear | is | red | inside.", "Jūsų | ausis | yra | raudona | viduje.", "Ausis viduje paraudusi.")],
    ear_red_left: [t("Your | left | ear | is | red | inside.", "Jūsų | kairė | ausis | yra | raudona | viduje.", "Kairė ausis viduje paraudusi.")],
    ear_red_right: [t("Your | right | ear | is | red | inside.", "Jūsų | dešinė | ausis | yra | raudona | viduje.", "Dešinė ausis viduje paraudusi.")],
    ear_red_both: [t("Your | ears | are | red | inside.", "Jūsų | ausys | yra | raudonos | viduje.", "Abi ausys viduje paraudusios.")],
    throat_red: [t("Hmm, | your | throat | is | very | red.", "Hmm, | jūsų | gerklė | yra | labai | raudona.", "Hmm, gerklė labai raudona.")],
    throat_bit_red: [t("Your | throat | is | a little | red.", "Jūsų | gerklė | yra | truputį | raudona.", "Gerklė truputį paraudusi.")],
    throat_fine: [t("Your | throat | looks | fine.", "Jūsų | gerklė | atrodo | gerai.", "Gerklė atrodo gerai.")],
    press_neck: [t("Now | your | neck.", "Dabar | jūsų | kaklas.", "Dabar kaklas.")],
    press_belly: [t("Now | please | lie down.", "Dabar | prašom | atsigulti.", "Dabar prašom atsigulti.")],
    press_back: [t("Now | please | turn around.", "Dabar | prašom | apsisukti.", "Dabar prašom apsisukti.")],
    press_ear: [t("Now | behind | your | ear.", "Dabar | už | jūsų | ausies.", "Dabar už ausies.")],
    hurt_here: [t("Does | it hurt | here?", "Ar | skauda | čia?", "Ar čia skauda?", { flags: { 0: "Question “Does” = the particle ar." } })],
    hurt_sorry: [t("Sorry! | I'll be | gentle.", "Atsiprašau! | Būsiu | {sm:švelnus|sf:švelni}.", "Atsiprašau! Būsiu {sm:švelnus|sf:švelni}.")],
    glands_swollen: [t("Your | glands | are | a little | swollen.", "Jūsų | limfmazgiai | yra | truputį | padidėję.", "Limfmazgiai truputį padidėję.")],
    glands_ok: [t("Your | glands | feel | fine.", "Jūsų | limfmazgiai | atrodo | gerai.", "Limfmazgiai normalūs.")],
    belly_tender: [t("Your | stomach | is | a little | tender.", "Jūsų | pilvas | yra | truputį | jautrus.", "Pilvas truputį jautrus.")],
    back_muscle: [t("That's | the | muscle.", "Tai yra | — | raumuo.", "Tai raumuo.")],
    neck_tight: [t("Your | neck | muscles | are | very | tight.", "Jūsų | kaklo | raumenys | yra | labai | įsitempę.", "Kaklo raumenys labai įsitempę.")],
    ear_tender: [t("That's | the | infection.", "Tai yra | — | infekcija.", "Tai infekcija.")],
    hurt_no_ok: [t("Okay, | good.", "Gerai, | puiku.", "Gerai, puiku."), t("Good.", "Gerai.", "Gerai.")],
    hurt_little_ok: [t("Just | a little? | Okay.", "Tik | truputį? | Gerai.", "Tik truputį? Gerai.")],

    // --- what it is ----------------------------------------------------------------------------
    dx_throat: [t("It | looks | like | a | throat | infection.", "Tai | atrodo | kaip | — | gerklės | infekcija.", "Panašu į gerklės infekciją.")],
    dx_ear: [t("It | looks | like | an | ear | infection.", "Tai | atrodo | kaip | — | ausies | uždegimas.", "Panašu į ausies uždegimą.")],
    dx_virus: [t("It | looks | like | a | virus.", "Tai | atrodo | kaip | — | virusas.", "Panašu į virusą.")],
    dx_stomach: [t("It | looks | like | a | stomach | bug.", "Tai | atrodo | kaip | — | skrandžio | virusas.", "Panašu į skrandžio virusą.")],
    dx_back: [t("It | looks | like | you | pulled | a | muscle.", "Tai | atrodo | kad | jūs | patempėte | — | raumenį.", "Panašu, kad patempėte raumenį.")],
    dx_tension: [t("It | looks | like | a | tension | headache.", "Tai | atrodo | kaip | — | įtampos | galvos skausmas.", "Panašu į įtampos galvos skausmą.")],
    dx_calm: [t("Don't worry, | it's | nothing | serious.", "Nesijaudinkite, | tai nėra | nieko | rimto.", "Nesijaudinkite, nieko rimto.",
      { flags: { 1: "Negative concord: the ne- of nėra comes from “nothing”." } })],
    no_ab_virus: [t("Antibiotics | won't help | with | a | virus.", "Antibiotikai | nepadės | nuo | — | viruso.", "Nuo viruso antibiotikai nepadės.")],

    // --- allergies, prescription ------------------------------------------------------------
    rx_intro_ab: [t("I'll prescribe | an | antibiotic.", "Išrašysiu | — | antibiotiką.", "Išrašysiu antibiotiką.")],
    rx_intro_ab_alt: [t("Then | I'll prescribe | a | different | antibiotic.", "Tada | išrašysiu | — | kitą | antibiotiką.", "Tada išrašysiu kitą antibiotiką.")],
    rx_intro_ab_pen: [t("You're | allergic | to | penicillin, | so | I'll prescribe | a | different | antibiotic.", "Jūs esate | {m:alergiškas|f:alergiška} | — | penicilinui, | tad | išrašysiu | — | kitą | antibiotiką.",
      "Esate {m:alergiškas|f:alergiška} penicilinui, tad išrašysiu kitą antibiotiką.", { flags: { 2: "“to” has no separate word: the dative penicilinui carries it." } })],
    rx_intro_sym: [t("I'll give | you | something | for | the | symptoms.", "Duosiu | jums | ką nors | nuo | — | simptomų.", "Duosiu jums vaistų nuo simptomų.")],
    rx_intro_stomach: [t("I'll give | you | something | for | your | stomach.", "Duosiu | jums | ką nors | — | jūsų | skrandžiui.", "Duosiu jums vaistų skrandžiui.",
      { flags: { 3: "“for” has no separate word: the dative skrandžiui carries it (a possessive intervenes)." } })],
    rx_intro_pain: [t("I'll give | you | something | for | the | pain.", "Duosiu | jums | ką nors | nuo | — | skausmo.", "Duosiu jums vaistų nuo skausmo.")],
    ask_allergy_first: [t("Before | I | prescribe | anything, | are | you | allergic | to | any | medications?",
      "Prieš | man | išrašant | ką nors, | ar esate | jūs | {m:alergiškas|f:alergiška} | — | kokiems nors | vaistams?",
      "Prieš {sm:išrašydamas|sf:išrašydama} vaistus: ar esate {m:alergiškas|f:alergiška} kokiems nors vaistams?",
      { flags: { 7: "“to” has no separate word: the dative vaistams carries it." } })],
    ask_allergy: [
      t("Are | you | allergic | to | any | medications?", "Ar esate | jūs | {m:alergiškas|f:alergiška} | — | kokiems nors | vaistams?", "Ar esate {m:alergiškas|f:alergiška} kokiems nors vaistams?",
        { flags: { 3: "“to” has no separate word: the dative vaistams carries it." } }),
      t("Do | you | have | any | allergies | to | medications?", "Ar | jūs | turite | kokių nors | alergijų | — | vaistams?", "Ar turite alergijų vaistams?",
        { flags: { 0: FLAG_DO, 5: "“to” has no separate word: the dative vaistams carries it." } }),
    ],
    allergy_chart: [t("I | see | in | your | chart | that | you're | allergic | to | penicillin. | Is | that | right?",
      "Aš | matau | — | jūsų | kortelėje | kad | jūs esate | {m:alergiškas|f:alergiška} | — | penicilinui. | Ar | tai | teisinga?",
      "Kortelėje matau, kad esate {m:alergiškas|f:alergiška} penicilinui. Ar tai tiesa?",
      { flags: { 2: "“in” has no separate word: the locative kortelėje carries it (a possessive intervenes).", 8: "“to” has no separate word: the dative penicilinui carries it.", 10: FLAG_IS } })],
    allergy_which: [t("What | are | you | allergic | to?", "Kam | esate | jūs | {m:alergiškas|f:alergiška} | —?", "Kam esate {m:alergiškas|f:alergiška}?",
      { flags: { 4: "Stranded “to”: the dative Kam already carries it." } })],
    allergy_none_ok: [t("Good.", "Gerai.", "Gerai."), t("Okay, | good.", "Gerai, | puiku.", "Gerai, puiku.")],
    allergy_pen_ab: [t("Good | to know.", "Gera | žinoti.", "Gerai, kad pasakėte.")],
    allergy_ok_other: [t("Okay, | that's | no | problem | for | this | medicine.", "Gerai, | tai nėra | jokia | problema | — | šiems | vaistams.", "Gerai, šiems vaistams tai netrukdo.",
      { flags: { 1: "Negative concord: the ne- of nėra comes from “no”.", 4: "“for” has no separate word: the dative šiems vaistams carries it." } })],
    allergy_unsure: [t("That's | okay. | I'll give | you | something | very | safe.", "Tai | gerai. | Duosiu | jums | ką nors | labai | saugaus.", "Nieko tokio. Duosiu jums labai saugių vaistų.")],
    chart_fixed: [t("Oh, | okay. | I'll update | your | chart.", "O, | gerai. | Atnaujinsiu | jūsų | kortelę.", "A, gerai. Pataisysiu jūsų kortelę.")],
    dose: [
      t("Take | one | pill | twice | a | day, | after | meals.", "Gerkite | vieną | tabletę | du kartus | per | dieną, | po | valgio.", "Gerkite po vieną tabletę du kartus per dieną, po valgio.",
        { flags: { 4: FLAG_PER } }),
      t("One | pill | twice | a | day, | after | meals.", "Viena | tabletė | du kartus | per | dieną, | po | valgio.", "Po vieną tabletę du kartus per dieną, po valgio.", { flags: { 3: FLAG_PER } }),
    ],
    dose_days: [t("For | five | days.", "— | Penkias | dienas.", "Penkias dienas.", { flags: { 0: "“For” (duration) has no separate word: the accusative penkias dienas carries it." } })],
    dose_days_ab: [t("Take | them | for | five | days.", "Gerkite | juos | — | penkias | dienas.", "Gerkite penkias dienas.",
      { flags: { 2: "“for” (duration) has no separate word: the accusative penkias dienas carries it (a numeral intervenes)." } })],
    dose_finish: [t("And | finish | all | of | them, | even | if | you | feel | better.", "Ir | išgerkite | visus | — | juos, | net | jei | jūs | jausitės | geriau.",
      "Ir išgerkite visą kursą, net jei pasijusite geriau.", { flags: { 3: "“of” (all of them) has no separate word: visus juos." } })],
    ask_questions: [t("Do | you | have | any | questions?", "Ar | jūs | turite | kokių nors | klausimų?", "Ar turite klausimų?", { flags: { 0: FLAG_DO } })],
    ask_more_q: [
      t("Do | you | have | any | other | questions?", "Ar | jūs | turite | kokių nors | kitų | klausimų?", "Ar turite dar klausimų?", { flags: { 0: FLAG_DO } }),
      t("Any | other | questions | for me?", "Kokių nors | kitų | klausimų | man?", "Ar turite man dar klausimų?"),
    ],

    // --- answers to the learner's questions ----------------------------------------------
    exam_first: [t("I'll examine | you | first.", "Apžiūrėsiu | jus | pirmiausia.", "Pirmiausia jus apžiūrėsiu."), t("Let's see | first.", "Pažiūrėkime | pirmiausia.", "Pirmiausia pažiūrėkime.")],
    dose_first: [t("Let's see | what | you | need | first.", "Pažiūrėkime, | ko | jums | reikia | pirmiausia.", "Pirmiausia pažiūrėkime, ko jums reikia.")],
    explain_soon: [t("I'll explain | in | a | second.", "Paaiškinsiu | po | — | sekundės.", "Tuoj paaiškinsiu.")],
    meals_after: [t("After | meals, | so | it | doesn't upset | your | stomach.", "Po | valgio, | kad | jie | nesudirgintų | jūsų | skrandžio.", "Po valgio, kad nesudirgintų skrandžio.",
      { flags: { 3: FLAG_MED + " Hence jie." } })],
    side_ab: [t("It | can | upset | your | stomach | a little.", "Jie | gali | sudirginti | jūsų | skrandį | truputį.", "Gali truputį sudirginti skrandį.", { flags: { 0: FLAG_MED + " Hence Jie." } })],
    side_rash: [t("If | you | get | a | rash, | stop | and | call | us.", "Jei | jums | atsiras | — | bėrimas, | nustokite | ir | paskambinkite | mums.", "Jei atsiras bėrimas, nustokite gerti ir paskambinkite mums.")],
    side_sym: [t("It | can | make | you | a little | sleepy.", "Jie | gali | sukelti | jums | truputį | mieguistumo.", "Nuo jų gali būti šiek tiek mieguista.", { flags: { 0: FLAG_MED + " Hence Jie." } })],
    side_none: [t("Not really. | It's | very | gentle.", "Nelabai. | Jie yra | labai | švelnūs.", "Beveik jokio. Jie labai švelnūs.", { flags: { 1: FLAG_MED + " Hence Jie yra." } })],
    alcohol: [t("Please | don't drink | alcohol | while | you're taking | them.", "Prašom | negerti | alkoholio | kol | vartojate | juos.", "Kol vartojate, prašom negerti alkoholio.")],
    drive_ok: [t("Yes, | it | won't make | you | sleepy.", "Taip, | jie | nesukels | jums | mieguistumo.", "Taip, nuo jų nebus mieguista.", { flags: { 1: FLAG_MED + " Hence jie." } })],
    drive_careful: [t("Be | careful: | it | can | make | you | sleepy.", "Būkite | {m:atsargus|f:atsargi}: | jie | gali | sukelti | jums | mieguistumą.", "Būkite {m:atsargus|f:atsargi}: nuo jų gali būti mieguista.",
      { flags: { 2: FLAG_MED + " Hence jie." } })],
    better_ab: [t("You | should | feel | better | in | two | or | three | days.", "Jūs | turėtumėte | jaustis | geriau | po | dviejų | ar | trijų | dienų.", "Po dviejų ar trijų dienų turėtumėte pasijusti geriau.")],
    better_week: [t("In | about | a | week.", "Po | maždaug | — | savaitės.", "Maždaug po savaitės.")],
    better_back: [t("In | a | week | or | two.", "Po | — | savaitės | ar | dviejų.", "Po savaitės ar dviejų.")],
    contagious_yes: [t("Yes, | for | the | first | few | days.", "Taip, | — | — | pirmas | kelias | dienas.", "Taip, pirmas kelias dienas.",
      { flags: { 1: "“for” (duration) has no separate word: the accusative pirmas kelias dienas carries it." } })],
    contagious_advice: [t("So | stay | home | and | wash | your | hands | often.", "Tad | likite | namie | ir | plaukite | savo | rankas | dažnai.", "Tad likite namie ir dažnai plaukite rankas.")],
    contagious_no: [t("No, | it's | not | contagious.", "Ne, | tai | nėra | užkrečiama.", "Ne, tai neužkrečiama.",
      { flags: { 2: "Lithuanian negates the copula: ne + yra = nėra (the “is” of it's sits here)." } })],
    serious_no: [t("No, | it's | nothing | serious.", "Ne, | tai nėra | nieko | rimto.", "Ne, nieko rimto.", { flags: { 1: "Negative concord: the ne- of nėra comes from “nothing”." } })],
    fine_soon: [t("You'll be | fine.", "Jums bus | gerai.", "Viskas bus gerai.")],
    ab_yes: [t("Yes, | this | time | you | need | one.", "Taip, | šį | kartą | jums | reikia | jo.", "Taip, šį kartą jo reikia.",
      { flags: { 5: "“one” = an antibiotic (antibiotikas), in the genitive after reikia." } })],
    ab_no: [t("No, | you | don't need | antibiotics.", "Ne, | jums | nereikia | antibiotikų.", "Ne, antibiotikų jums nereikia.")],
    work_home: [t("Better | stay | home | for | two | or | three | days.", "Geriau | likite | namie | — | dvi | ar | tris | dienas.", "Geriau dvi ar tris dienas pabūkite namie.",
      { flags: { 3: "“for” (duration) has no separate word: the accusative dvi ar tris dienas carries it." } })],
    work_back: [t("Yes, | but | don't lift | anything | heavy.", "Taip, | bet | nekelkite | nieko | sunkaus.", "Taip, bet nekelkite nieko sunkaus.")],
    work_ok: [t("Yes, | if | you | feel | okay.", "Taip, | jei | jūs | jaučiatės | gerai.", "Taip, jei gerai jaučiatės.")],
    note_write: [t("Of course. | I'll write | you | a | note | for | three | days.", "Žinoma. | Parašysiu | jums | — | pažymą | — | trims | dienoms.", "Žinoma. Parašysiu jums pažymą trims dienoms.",
      { flags: { 5: "“for” has no separate word: the dative trims dienoms carries it (a numeral intervenes)." } })],
    note_here: [t("And | here's | your | note | for work.", "Ir | štai | jūsų | pažyma | darbui.", "Ir štai jūsų pažyma darbui.")],
    note_later: [t("Sure, | I'll give | you | one | at the end.", "Žinoma, | duosiu | jums | ją | pabaigoje.", "Žinoma, duosiu ją pabaigoje.", { flags: { 3: "“one” = a note (pažyma), hence ją." } })],
    ask_note: [t("Do | you | need | a | note | for work?", "Ar | jums | reikia | — | pažymos | darbui?", "Ar jums reikia pažymos darbui?", { flags: { 0: FLAG_DO } })],
    note_no_ok: [t("Okay, | no | problem.", "Gerai, | jokių | problemų.", "Gerai, jokių problemų.")],
    eat_stomach: [t("Eat | light | food: | rice, | toast, | bananas.", "Valgykite | lengvą | maistą: | ryžius, | skrudintą duoną, | bananus.", "Valgykite lengvą maistą: ryžius, skrudintą duoną, bananus.")],
    eat_any: [t("Whatever | you | want. | Chicken | soup | is | great.", "Ką tik | jūs | norite. | Vištienos | sriuba | yra | puiki.", "Ką tik norite. Vištienos sriuba – puikus pasirinkimas.")],
    exercise_no: [t("Not | this | week. | Your | body | needs | rest.", "Ne | šią | savaitę. | Jūsų | kūnui | reikia | poilsio.", "Ne šią savaitę. Jūsų kūnui reikia poilsio.")],
    cost_desk: [t("The | front desk | can | help | you | with that.", "— | Registratūra | gali | padėti | jums | dėl to.", "Registratūroje jums padės.")],

    // --- pharmacy ---------------------------------------------------------------------------------
    ask_pharmacy: [
      t("Which | pharmacy | should | I | send | it | to?", "Į kurią | vaistinę | turėčiau | aš | nusiųsti | jį | —?", "Į kurią vaistinę nusiųsti receptą?",
        { flags: { 5: "“it” = the prescription (receptas), hence jį.", 6: "Stranded “to”: į (with Which) already carries it." } }),
      t("What | pharmacy | do | you | use?", "Kokia | vaistine | — | jūs | naudojatės?", "Kokia vaistine naudojatės?", { flags: { 2: "Question “do” has no Lithuanian word (linked to “use”)." } }),
    ],
    pharmacy_harbor: [t("Great. | I'll send | it | to | Harbor Pharmacy | on Main Street.", "Puiku. | Nusiųsiu | jį | į | „Harbor Pharmacy“ | Main Street gatvėje.",
      "Puiku. Nusiųsiu jį į „Harbor Pharmacy“ Main Street gatvėje.", { flags: { 2: "“it” = the prescription (receptas), hence jį." } })],
    pharmacy_other: [t("Sure, | I'll send | it | there.", "Žinoma, | nusiųsiu | jį | ten.", "Žinoma, nusiųsiu jį ten.", { flags: { 2: "“it” = the prescription (receptas), hence jį." } })],
    pharmacy_suggest: [t("No | problem. | Harbor Pharmacy | on Main Street | is | close.", "Jokių | problemų. | „Harbor Pharmacy“ | Main Street gatvėje | yra | netoli.",
      "Jokių problemų. „Harbor Pharmacy“ Main Street gatvėje – visai netoli.")],
    pharmacy_ready: [t("It'll be | ready | in | about | an | hour.", "Jis bus | paruoštas | po | maždaug | — | valandos.", "Bus paruoštas maždaug po valandos.",
      { flags: { 0: "“It” = the prescription (receptas), hence Jis." } })],

    // --- closing ------------------------------------------------------------------------------------
    advice_rest: [
      t("Rest | and | drink | lots | of fluids.", "Ilsėkitės | ir | gerkite | daug | skysčių.", "Ilsėkitės ir gerkite daug skysčių."),
      t("Stay | home, | rest | and | drink | lots | of fluids.", "Likite | namie, | ilsėkitės | ir | gerkite | daug | skysčių.", "Likite namie, ilsėkitės ir gerkite daug skysčių."),
    ],
    advice_tea: [t("Warm | tea | with | honey | helps, | too.", "Šilta | arbata | su | medumi | padeda, | irgi.", "Šilta arbata su medumi irgi padeda.")],
    advice_stomach: [t("Drink | lots | of water | and | eat | light | food.", "Gerkite | daug | vandens | ir | valgykite | lengvą | maistą.", "Gerkite daug vandens ir valgykite lengvą maistą.")],
    advice_back: [t("Use | a | heating | pad, | and | don't lift | anything | heavy.", "Naudokite | — | šildomąją | pagalvėlę, | ir | nekelkite | nieko | sunkaus.",
      "Naudokite šildomąją pagalvėlę ir nekelkite nieko sunkaus.")],
    advice_tension: [t("Try | to rest, | and | drink | lots | of water.", "Stenkitės | pailsėti, | ir | gerkite | daug | vandens.", "Stenkitės pailsėti ir gerkite daug vandens.")],
    come_back: [
      t("Come | back | if | it doesn't get better.", "Ateikite | vėl | jei | nepagerės.", "Jei nepagerės, ateikite vėl."),
      t("And | come | back | if | it doesn't get better.", "Ir | ateikite | vėl | jei | nepagerės.", "Ir jei nepagerės, ateikite vėl."),
    ],
    feel_better: [
      t("Feel | better!", "Jauskitės | geriau!", "Greičiau pasveikite!"),
      t("I | hope | you | feel | better | soon!", "Aš | tikiuosi | jūs | pasijusite | geriau | greitai!", "Tikiuosi, greitai pasijusite geriau!"),
    ],
  },

  domains: {
    tc: () => Array.from({ length: 91 }, (_, i) => tempVal(34 + i / 10)),
    tf: () => [...Array.from({ length: 17 }, (_, i) => 93 + i), 98.6].map(tempVal),
    tm: () => [...new Set(Object.values(MEASURED))].map(tempVal),
  },

  hints: {
    symptom: {
      lt: "Pasakyti, kas negerai", slot: "symptom", examples: ["sore_throat", "cough", "headache", "stomachache"],
      items: [
        ...haveItems(),
        { id: "song", s: t("I've got | a | sore | throat | and | a | temperature.", "Turiu | — | skaudančią | gerklę | ir | — | temperatūros.", "Skauda gerklę ir turiu temperatūros."),
          only: (e) => e.id === "sore_throat" || e.id === "fever", note: "„A temperature“ – karščiavimas. Amerikiečiai dar dažniau sako „a fever“." },
        ...bodyItems(),
        { id: "swallow", s: t("It hurts | when | I | swallow.", "Skauda | kai | aš | ryju.", "Skauda, kai ryju."), only: (e) => e.id === "sore_throat" },
        { id: "coughing", s: t("I | can't stop | coughing.", "Aš | negaliu nustoti | kosėti.", "Negaliu nustoti kosėti."), only: (e) => e.id === "cough" },
        { id: "nose", s: t("My | nose | is running.", "Man | nosis | bėga.", "Man bėga nosis.", { flags: { 0: "“My” → dative Man: Lithuanian says “to me the nose runs”." } }),
          only: (e) => e.id === "runny_nose" },
        { id: "dizzy", s: t("I | feel | dizzy.", "Aš | jaučiu | galvos svaigimą.", "Man svaigsta galva."), only: (e) => e.id === "dizzy" },
        { id: "tired", s: t("I | feel | tired | all | the | time.", "Aš | jaučiuosi | {m:pavargęs|f:pavargusi} | visą | — | laiką.", "Nuolat jaučiuosi {m:pavargęs|f:pavargusi}."),
          only: (e) => e.id === "fatigue" },
        { id: "feel_sick", s: t("I | don't feel | well.", "Aš | nesijaučiu | gerai.", "Blogai jaučiuosi.") },
      ],
    },
    feeling: {
      lt: "Pasakyti, kaip jautiesi",
      items: [
        { id: "feel_bad", s: t("Not | so | good.", "Ne | taip | gerai.", "Nelabai.") },
        { id: "song", s: t("Not | great. | I've got | a | sore | throat | and | a | temperature.", "Ne | itin. | Turiu | — | skaudančią | gerklę | ir | — | temperatūros.",
          "Nekaip. Skauda gerklę ir turiu temperatūros.") },
        { id: "feel_sick", s: t("I | don't feel | well.", "Aš | nesijaučiu | gerai.", "Blogai jaučiuosi.") },
      ],
    },
    more_sym: {
      lt: "Pasakyti, ar yra kitų simptomų", slot: "symptom", examples: ["cough", "headache", "fever"],
      items: [
        ...alsoItems(),
        { id: "no_other", s: t("No, | that's | all.", "Ne, | tai yra | viskas.", "Ne, tai viskas.") },
        { id: "no_other", s: t("No | other | symptoms.", "Jokių | kitų | simptomų.", "Kitų simptomų nėra.") },
      ],
    },
    howlong: {
      lt: "Pasakyti, kiek laiko tai tęsiasi",
      items: [
        { id: "since", s: t("Since | Monday.", "Nuo | pirmadienio.", "Nuo pirmadienio.") },
        { id: "for_days", s: t("For | three | days.", "— | Tris | dienas.", "Jau tris dienas.", { flags: { 0: "“For” (duration) has no separate word: the accusative tris dienas carries it." } }) },
        { id: "since", s: t("Since | yesterday.", "Nuo | vakar.", "Nuo vakar.") },
        { id: "for_days", s: t("About | a | week.", "Maždaug | — | savaitę.", "Maždaug savaitę.") },
        { id: "had_it", s: t("I've had | it | for | two | days.", "Turiu | tai | — | dvi | dienas.", "Jau dvi dienas.",
          { flags: { 2: "“for” (duration) has no separate word: the accusative dvi dienas carries it (a numeral intervenes)." } }) },
      ],
    },
    scale: {
      lt: "Įvertinti skausmą nuo 1 iki 10",
      items: [
        { id: "scale_num", s: t("About | a | six.", "Maždaug | — | šeši.", "Maždaug šeši.") },
        { id: "scale_num", s: t("Seven, | maybe | eight.", "Septyni, | gal | aštuoni.", "Septyni, gal aštuoni.") },
      ],
    },
    fever: {
      lt: "Pasakyti temperatūrą",
      items: [
        { id: "temp", s: t("Yes, | about | 38 | degrees.", "Taip, | maždaug | 38 | laipsniai.", "Taip, maždaug 38 laipsniai.", { say: "Yes, about thirty-eight degrees." }),
          note: "Amerikoje temperatūra matuojama Farenheito laipsniais: 38 °C ≈ 100 °F. Gydytoja perskaičiuos." },
        { id: "temp", s: t("It | was | 101 | this | morning.", "Ji | buvo | 101 | šį | rytą.", "Šįryt buvo 101 °F.", { say: "It was a hundred and one this morning.", flags: { 0: FLAG_TEMP + " Hence Ji." } }) },
        { id: "fever_yes", s: t("Yes, | I | have | a | fever.", "Taip, | aš | turiu | — | karščio.", "Taip, karščiuoju.") },
        { id: "fever_no", s: t("No, | I | don't think | so.", "Ne, | aš | nemanau | —.", "Ne, nemanau.", { flags: { 3: "“so” (I don't think so) has no Lithuanian word; nemanau says it all." } }) },
        { id: "temp_unknown", s: t("I | didn't check.", "Aš | nepasitikrinau.", "Nepasimatavau.") },
        { id: "temp_unknown", s: t("I | don't have | a | thermometer.", "Aš | neturiu | — | termometro.", "Neturiu termometro.") },
      ],
    },
    meds: {
      lt: "Pasakyti, ar ką nors vartoji",
      items: [
        { id: "meds_none", s: t("No, | nothing.", "Ne, | nieko.", "Ne, nieko.") },
        { id: "meds_ibu", s: t("Just | ibuprofen.", "Tik | ibuprofeną.", "Tik ibuprofeną.") },
        { id: "meds_ibu", s: t("I | took | some | Tylenol.", "Aš | išgėriau | — | „Tylenol“.", "Išgėriau „Tylenol“.",
          { flags: { 2: "Partitive “some” has no separate word (išgėriau = took some)." } }), note: "„Tylenol“ – amerikietiškas paracetamolio pavadinimas." },
        { id: "meds_tea", s: t("I | drink | tea | with | honey.", "Aš | geriu | arbatą | su | medumi.", "Geriu arbatą su medumi.") },
      ],
    },
    exam_breath: {
      lt: "Įkvėpti ir iškvėpti",
      items: [
        { id: "ok", s: t("Okay.", "Gerai.", "Gerai.") },
        { id: "like_this", s: t("Like | this?", "Štai | taip?", "Štai taip?") },
        { id: "breath_hard", s: t("It hurts | when | I | breathe.", "Skauda | kai | aš | kvėpuoju.", "Skauda, kai kvėpuoju.") },
      ],
    },
    exam_ah: {
      lt: "Pasakyti „a-a-a“",
      items: [
        { id: "ah", s: t("Aaah.", "Aaa.", "Aaa."), note: "Tiesiog ištarkite ilgą „a“." },
        { id: "ok", s: t("Okay.", "Gerai.", "Gerai.") },
      ],
    },
    exam_hurt: {
      lt: "Atsakyti, ar skauda",
      items: [
        { id: "hurt_yes", s: t("Yes, | it hurts.", "Taip, | skauda.", "Taip, skauda.") },
        { id: "hurt_little", s: t("A little.", "Truputį.", "Truputį.") },
        { id: "hurt_no", s: t("No, | it doesn't hurt.", "Ne, | neskauda.", "Ne, neskauda.") },
        { id: "hurt_ouch", s: t("Ouch! | Yes!", "Oi! | Taip!", "Oi! Taip!") },
      ],
    },
    exam_sleeve: {
      lt: "Pasiraitoti rankovę",
      items: [
        { id: "ok", s: t("Sure.", "Žinoma.", "Žinoma.") },
        { id: "which_arm", s: t("Which | arm?", "Kurią | ranką?", "Kurią ranką?") },
      ],
    },
    allergy: {
      lt: "Pasakyti apie alergijas vaistams",
      items: [
        { id: "allergy_none", s: t("I'm | not | allergic | to | anything.", "Aš | nesu | {m:alergiškas|f:alergiška} | — | niekam.", "Nesu {m:alergiškas|f:alergiška} niekam.",
          { flags: { 1: "Negation: nesu = ne- + esu; the “am” of I'm sits here (linked to “I'm”).", 3: "“to” has no separate word: the dative niekam carries it." } }) },
        { id: "allergy_no_any", s: t("No, | I | don't have | any | allergies.", "Ne, | aš | neturiu | jokių | alergijų.", "Ne, jokių alergijų neturiu.") },
        { id: "allergy_pen", s: t("I'm | allergic | to | penicillin.", "Aš esu | {m:alergiškas|f:alergiška} | — | penicilinui.", "Esu {m:alergiškas|f:alergiška} penicilinui.",
          { flags: { 2: "“to” has no separate word: the dative penicilinui carries it." } }) },
      ],
    },
    chart: {
      lt: "Patvirtinti arba pataisyti",
      items: [
        { id: "chart_yes", s: t("Yes, | that's | right.", "Taip, | tai yra | teisinga.", "Taip, teisingai.") },
        { id: "allergy_none", s: t("No, | I'm | not | allergic | to | anything.", "Ne, | aš | nesu | {m:alergiškas|f:alergiška} | — | niekam.", "Ne, nesu {m:alergiškas|f:alergiška} niekam.",
          { flags: { 2: "Negation: nesu = ne- + esu; the “am” of I'm sits here (linked to “I'm”).", 4: "“to” has no separate word: the dative niekam carries it." } }) },
      ],
    },
    ask_dx: {
      lt: "Paklausti apie ligą",
      items: [
        { id: "q_serious", s: t("Is | it | serious?", "Ar | tai | rimta?", "Ar tai rimta?", { flags: { 0: FLAG_IS } }) },
        { id: "q_contagious", s: t("Is | it | contagious?", "Ar | tai | užkrečiama?", "Ar tai užkrečiama?", { flags: { 0: FLAG_IS } }) },
        { id: "q_antibiotics", s: t("Do | I | need | antibiotics?", "Ar | man | reikia | antibiotikų?", "Ar man reikia antibiotikų?", { flags: { 0: FLAG_DO } }) },
        { id: "q_better", s: t("When | will | I | feel | better?", "Kada | — | aš | pasijusiu | geriau?", "Kada pasijusiu geriau?",
          { flags: { 1: "“will”: the future ending of pasijusiu carries it (linked to “feel”)." } }) },
        { id: "q_work", s: t("Can | I | go | to work?", "Ar galiu | aš | eiti | į darbą?", "Ar galiu eiti į darbą?") },
        { id: "q_note", s: t("Can | I | get | a | note | for work?", "Ar galiu | aš | gauti | — | pažymą | darbui?", "Ar galėčiau gauti pažymą darbui?") },
      ],
    },
    ask_rx: {
      lt: "Paklausti apie vaistus",
      items: [
        { id: "q_how_often", s: t("How | often | should | I | take | it?", "Kaip | dažnai | turėčiau | aš | gerti | juos?", "Kaip dažnai reikia gerti?", { flags: { 5: FLAG_MED + " Hence juos." } }) },
        { id: "q_meals", s: t("Before | or | after | meals?", "Prieš | ar | po | valgio?", "Prieš valgį ar po valgio?") },
        { id: "q_how_long", s: t("For | how | long?", "— | Kiek | laiko?", "Kiek laiko?", { flags: { 0: "“For” has no separate word: Kiek laiko asks for the duration." } }) },
        { id: "q_side", s: t("Are | there | any | side effects?", "Ar yra | — | kokių nors | šalutinių poveikių?", "Ar yra šalutinis poveikis?",
          { flags: { 1: "Existential “there” has no Lithuanian word: yra (in Ar yra) carries it." } }) },
        { id: "q_alcohol", s: t("Can | I | drink | alcohol | with | it?", "Ar galiu | aš | gerti | alkoholį | su | jais?", "Ar galima gerti alkoholį?", { flags: { 5: FLAG_MED + " Hence jais." } }) },
        { id: "q_drive", s: t("Can | I | drive?", "Ar galiu | aš | vairuoti?", "Ar galiu vairuoti?") },
        { id: "q_note", s: t("Can | I | get | a | note | for work?", "Ar galiu | aš | gauti | — | pažymą | darbui?", "Ar galėčiau gauti pažymą darbui?") },
        { id: "q_none", s: t("No, | that's | clear. | Thank | you!", "Ne, | tai yra | aišku. | Dėkoju | jums!", "Ne, viskas aišku. Ačiū!") },
      ],
    },
    pharmacy: {
      lt: "Pasakyti, į kurią vaistinę siųsti receptą",
      items: [
        { id: "ph_harbor", s: t("Harbor Pharmacy, | please.", "„Harbor Pharmacy“, | prašau.", "„Harbor Pharmacy“, prašau.") },
        { id: "ph_any", s: t("Any | pharmacy | is fine.", "Bet kuri | vaistinė | tinka.", "Tinka bet kuri vaistinė.") },
        { id: "ph_new", s: t("I | don't know. | I'm | new | here.", "Aš | nežinau. | Aš esu | {m:naujas|f:nauja} | čia.", "Nežinau, aš čia {m:naujas|f:nauja}.") },
      ],
    },
    note: {
      lt: "Atsakyti, ar reikia pažymos darbui",
      items: [
        { id: "note_yes", s: t("Yes, | please.", "Taip, | prašau.", "Taip, prašau.") },
        { id: "note_no", s: t("No, | thanks. | I | work | from | home.", "Ne, | ačiū. | Aš | dirbu | iš | namų.", "Ne, ačiū. Dirbu iš namų.") },
      ],
    },
    closing: {
      lt: "Padėkoti ir atsisveikinti",
      items: [
        { id: "s_thanks", s: t("Thank | you, | doctor!", "Dėkoju | jums, | daktare!", "Ačiū, daktare!") },
        { id: "q_not_better", s: t("What if | it doesn't get better?", "O jei | nepagerės?", "O jei nepagerės?") },
        { id: "s_bye2", s: t("Goodbye!", "Viso gero!", "Viso gero!") },
      ],
    },
    dob: {
      lt: "Pasakyti gimimo datą",
      items: [
        { id: "dob", s: t("It's | June | 4th, | 1980.", "Tai | birželio | 4 d., | 1980 m.", "1980 m. birželio 4 d.", { say: "It's June fourth, nineteen eighty." }),
          note: "Amerikiečiai sako mėnesį pirma: „June 4th, 1980“." },
        { id: "dob", s: t("June | 4th, | 1980.", "Birželio | 4 d., | 1980 m.", "1980 m. birželio 4 d.", { say: "June fourth, nineteen eighty." }) },
      ],
    },
  },

  tips: {
    us_flu: { key: "us_flu", lt: "Suprasta! Amerikoje sakoma su „the“: „I have the flu“.", better: "I have the flu." },
    us_tylenol: { key: "us_tylenol", lt: "Suprasta! Amerikoje paracetamolis vadinamas „acetaminophen“ arba tiesiog „Tylenol“.", better: "I took some Tylenol." },
    us_note: { key: "us_note", lt: "Suprasta! Amerikoje sakoma „a doctor's note“ arba „a note for work“.", better: "Can I get a note for work?" },
    us_date: { key: "us_date", lt: "Suprasta! Amerikiečiai datą dažniausiai sako ir rašo mėnesį pirma: June 4th, 1980 (06/04/1980).", better: "June 4th, 1980." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Pasakyk gimimo datą", optional: true, when: (c) => !!c.s.askDob && !dobSkipped(c), done: (c) => !!c.s.dob },
    { lt: "Pasakyk, kas tau negerai", done: (c) => syms(c).length > 0 },
    { lt: "Atsakyk į gydytojos klausimus", done: (c) => syms(c).length > 0 && questionsDone(c) },
    { lt: "Apžiūros metu daryk, ką sako gydytoja", done: (c) => !!c.s.examDone },
    { lt: "Atsakyk apie alergijas vaistams", done: (c) => !!c.s.allergy },
    { lt: "Sužinok, kaip vartoti vaistus", done: (c) => !!c.s.rxGiven },
  ],

  steps: [
    // the date-of-birth check is dropped when the learner goes straight to what's wrong (or after three tries)
    { id: "dob", when: (c) => !!c.s.askDob && !dobSkipped(c), done: (c) => !!c.s.dob,
      ask: (c) => { c.s.dobAsks = (c.s.dobAsks ?? 0) + 1; c.say(c.s.dobPartial && !c.s.dobYear ? "dob_year" : "ask_dob"); },
      expects: ["dob_ans", "year_ctx"],
      suggest: [{ lt: "Pasakyti gimimo datą (mėnuo, diena, metai)", hint: "dob" }] },
    { id: "problem", done: (c) => syms(c).length > 0,
      ask: (c) => { c.s.problemAsked = (c.s.problemAsked ?? 0) + 1; c.say("ask_problem"); },
      expects: ["symptom", "symptom_ctx", "feel_sick", "sym_neg", "temp_ans", "help_me"],
      suggest: [{ lt: "Pasakyti, kas negerai", hint: "symptom", options: "symptom" }],
      help: (c) => { c.say("problem_help"); } },
    { id: "more_sym", when: (c) => !!c.s.askMore && syms(c).length === 1, done: (c) => !!c.s.moreDone,
      ask: (c) => { askMoreSym(c); },
      expects: ["symptom", "symptom_ctx", "sym_none", "sym_neg"],
      suggest: [{ lt: "Pasakyti kitus simptomus (arba kad daugiau nieko)", hint: "more_sym", options: "symptom" }, { lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
      yes: (c) => { c.say("what_else_sym"); c.hold(); },
      no: (c) => { c.s.moreDone = true; c.say("sym_ack"); } },
    { id: "howlong", when: (c) => syms(c).length > 0, done: (c) => c.s.days !== undefined,
      ask: (c) => c.say(c.s.howlongVariant === "when" ? "ask_when" : "ask_howlong"),
      expects: ["howlong_ans"],
      suggest: [{ lt: "Pasakyti, kiek laiko tai tęsiasi", hint: "howlong" }],
      help: (c) => { c.say("howlong_help"); } },
    { id: "scale", when: (c) => !!c.s.askScale && painful(c), done: (c) => c.s.scale !== undefined,
      ask: (c) => c.say("ask_scale"),
      expects: ["scale_ctx"],
      suggest: [{ lt: "Įvertinti skausmą nuo 1 iki 10", hint: "scale" }],
      help: (c) => { c.say("scale_help"); } },
    { id: "fever", when: (c) => syms(c).length > 0, done: (c) => feverDone(c),
      ask: (c) => {
        if (c.s.fever !== true) { c.s.tempQ = "fever"; c.say("ask_fever"); return; }
        if (c.s.tempTook) { c.s.tempQ = "how"; c.say("ask_temp_how"); return; }
        if (c.s.tempQ === "how" || c.s.howFirst) { c.s.tempQ = "how"; c.say("ask_temp_high"); return; }
        c.s.tempQ = "took"; c.say("ask_temp_took");
      },
      expects: ["temp_ans", "fever_yes_ctx", "temp_unknown", "temp_dunno_ctx", "symptom", "symptom_ctx", "sym_neg"],
      suggest: [{ lt: "Pasakyti temperatūrą (arba kad nematavai)", hint: "fever" }, { lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
      yes: (c) => {
        if (c.s.fever !== true) { c.s.fever = true; return; }
        if (c.s.tempQ === "took") c.s.tempTook = true;
      },
      no: (c) => {
        if (c.s.fever !== true) { c.s.fever = false; c.say("fever_none"); return; }
        tempUnknown(c);
      } },
    { id: "meds", when: (c) => syms(c).length > 0, done: (c) => !!c.s.meds,
      ask: (c) => c.say("ask_meds"),
      expects: ["meds_ans", "meds_ctx"],
      suggest: [{ lt: "Pasakyti, ar ką nors vartoji", hint: "meds" }, { lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
      yes: (c) => {
        c.say("ask_meds_what");
        c.expect({ id: "meds_what", expects: ["meds_ans", "meds_ctx"], hints: ["meds"], suggest: [{ lt: "Pasakyti, ką vartoji", hint: "meds" }],
          on: { meds_ans: (cc, sl, sg) => { setMeds(cc, sg.tags); }, meds_ctx: (cc, sl, sg) => { setMeds(cc, sg.tags); } },
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
          c.expect({ id: "chart", expects: ["allergy_ans", "allergy_ctx", "allergy_dunno_ctx"], hints: ["chart", "allergy", "g_yesno"],
            suggest: [{ lt: "Patvirtinti arba pataisyti", hint: "chart" }, { lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
            on: { allergy_ans: (cc, sl, sg) => { chartAnswer(cc, sg.tags); }, allergy_ctx: (cc, sl, sg) => { chartAnswer(cc, sg.tags); }, allergy_dunno_ctx: (cc) => { chartAnswer(cc, ["unsure"]); } },
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
      suggest: [{ lt: "Pasakyti apie alergijas vaistams", hint: "allergy" }, { lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
      yes: (c) => {
        c.say("allergy_which");
        c.expect({ id: "allergy_which", expects: ["allergy_ans", "allergy_ctx", "allergy_dunno_ctx"], hints: ["allergy"], suggest: [{ lt: "Pasakyti, kam esi alergiškas", hint: "allergy" }],
          on: { allergy_ans: (cc, sl, sg) => { setAllergy(cc, sg.tags); }, allergy_ctx: (cc, sl, sg) => { setAllergy(cc, sg.tags); }, allergy_dunno_ctx: (cc) => { setAllergy(cc, ["unsure"]); } },
          no: (cc) => { setAllergy(cc, ["none"]); },
          ask: (cc) => cc.say("allergy_which") });
      },
      no: (c) => { setAllergy(c, ["none"]); },
      help: (c) => { setAllergy(c, ["unsure"]); askNext(c); } },
    { id: "rx", when: (c) => !!c.s.examDone && !!c.s.allergy, done: (c) => !!c.s.rxGiven,
      ask: (c) => { giveRx(c); } },
    { id: "pharmacy", when: (c) => !!c.s.rxGiven && !!c.s.askPharmacy, done: (c) => !!c.s.pharmacy,
      ask: (c) => c.say("ask_pharmacy"),
      expects: ["pharmacy_ans", "pharmacy_dunno_ctx"],
      suggest: [{ lt: "Pasakyti, į kurią vaistinę siųsti receptą", hint: "pharmacy" }] },
    // offered once: if the learner talks about something else, the offer is simply dropped
    { id: "note", when: (c) => !!c.s.rxGiven && !!c.s.offerNote && !!c.s.dx && CONTAGIOUS[c.s.dx as Dx] && c.s.note === undefined, done: (c) => !!c.s.noteOffered,
      ask: (c) => {
        c.s.noteOffered = true;
        c.say("ask_note");
        c.expect({ id: "note", optional: true, expects: ["note_ctx", "ask_note"], hints: ["note", "g_yesno"],
          suggest: [{ lt: "Atsakyti, ar reikia pažymos darbui", hint: "note" }, { lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
          on: { note_ctx: (cc, sl, sg) => { doctor.handlers.note_ctx(cc, sl, sg); }, ask_note: (cc) => { giveNote(cc); } },
          yes: (cc) => { giveNote(cc); },
          no: (cc) => { cc.s.note = false; cc.say("note_no_ok"); } });
      } },
    { id: "questions", when: (c) => !!c.s.rxGiven && !!c.s.askMoreQ, done: (c) => !!c.s.moreQAsked,
      ask: (c) => { c.s.moreQAsked = true; c.say("ask_more_q"); c.expect(questionsPending("questions")); } },
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
        suggest: [{ lt: "Pasakyti, kaip jautiesi (ir kas negerai)", hint: "feeling" }, { lt: "Pasakyti, kas negerai", hint: "symptom", options: "symptom" }],
        on: {
          g_howareyou_bad: (cc) => { sorry(cc); },
          g_howareyou_answer: (cc) => { if (/\b(you|yourself)\b/i.test(cc.heard.replace(/\bthank(s)?\s+you\b/gi, " "))) cc.say("g_asked_back"); feelingFine(cc); },
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
    feel_sick(c) {
      if (syms(c).length) { if (firstThisTurn(c, "ack")) c.say("sym_ack"); return; }
      if (c.s.sorrySaid) c.say("ask_problem"); else { c.s.sorrySaid = true; c.say("feel_sick_q"); }
      c.expect({ id: "sick_q", expects: ["symptom", "symptom_ctx", "sym_neg"], hints: ["symptom"], suggest: [{ lt: "Pasakyti simptomus", hint: "symptom", options: "symptom" }],
        on: {
          symptom: (cc, sl, sg) => { doctor.handlers.symptom(cc, sl, sg); },
          symptom_ctx: (cc, sl, sg) => { doctor.handlers.symptom_ctx(cc, sl, sg); },
        },
        ask: (cc) => cc.say("ask_problem") });
    },
    help_me(c) {
      // on its own ("Can you help me?") she invites it; followed by the problem, the problem is answered
      if (/(help|question|problem|thing)(\s+please)?[\s.!?,]*$/i.test(c.heard.trim())) { c.say("go_ahead"); c.hold(); }
    },
    feel_bad_ctx(c) { doctor.handlers.feel_sick(c, {}, { intent: "feel_sick", slots: {}, tags: [] }); },
    nice_meet(c) {
      // "You too!" to "Feel better!" at the end is a goodbye
      if (c.s.__finished) { c.say("g_bye"); c.end(); c.hold(); }
    },

    howlong_ans(c, slots, seg) {
      const d = daysFromTags(seg.tags, slots) ?? 3;
      if (c.s.days !== undefined && c.step !== "howlong") { c.s.days = d; c.say("sym_ack"); return; }
      setDays(c, d);
    },
    scale_ctx(c, slots, seg) {
      let n: number | undefined = typeof slots.n === "number" ? slots.n : undefined;
      for (const tg of seg.tags) { const m = tg.match(/^sc(\d+)$/); if (m) n = Number(m[1]); }
      if (n === undefined || n > 10) { c.say("scale_help"); c.hold(); return; }
      c.s.scale = n;
      c.say(n >= 7 ? "scale_high" : n <= 3 ? "scale_low" : "scale_mid");
    },

    temp_ans(c, slots, seg) {
      // a temperature said as the complaint ("I have 37.2") counts as feeling feverish, even when it turns out normal
      const high = slots.temp && (slots.temp.v >= 99.5 || (slots.temp.v >= 37.5 && slots.temp.v <= 43));
      if (!syms(c).includes("fever") && (high || !syms(c).length)) syms(c).push("fever");
      const d = daysFromTags(seg.tags, slots);
      if (d !== undefined && c.s.days === undefined) setDays(c, d, true);
      setTemp(c, slots.temp);
    },
    fever_yes_ctx(c) {
      if (c.s.fever !== true) { c.s.fever = true; return; }
      if (c.s.tempQ === "took") c.s.tempTook = true;
    },
    temp_unknown(c) { tempUnknown(c); },
    temp_dunno_ctx(c) { tempUnknown(c); },

    meds_ans(c, _slots, seg) { setMeds(c, seg.tags); },
    meds_ctx(c, _slots, seg) { setMeds(c, seg.tags); },
    allergy_ans(c, _slots, seg) { setAllergy(c, seg.tags); },
    allergy_ctx(c, _slots, seg) { setAllergy(c, seg.tags); },
    allergy_dunno_ctx(c) { setAllergy(c, ["unsure"]); },

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
      else if (dx(c) === "virus") c.say("no_ab_virus");
      else c.say("ab_no");
    },
    ask_what(c) {
      if (!c.s.examDone) { c.say("exam_first"); return; }
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
    ask_not_better(c) { c.say("come_back"); c.s.comeBackSaid = true; },
    ask_eat(c) { c.say(dx(c) === "stomach" ? "eat_stomach" : "eat_any"); },
    ask_exercise(c) { if (!c.s.examDone) { c.say("exam_first"); return; } c.say("exercise_no"); },
    ask_cost(c) { c.say("cost_desk"); },

    ask_dosage(c) {
      if (c.s.rxGiven) { c.say("dose"); return; }
      c.say(c.s.examDone ? "explain_soon" : "dose_first");
    },
    ask_meals(c) {
      if (c.s.rxGiven) { c.say("meals_after"); return; }
      c.say(c.s.examDone ? "explain_soon" : "dose_first");
    },
    ask_duration(c) {
      if (c.s.rxGiven) { c.say("dose_days"); if (kind(c) === "ab") c.say("dose_finish"); return; }
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
    clear_ctx(c) { c.s.questionsDone = true; c.say("ok_plain"); },

    pharmacy_ans(c, _slots, seg) {
      if (c.s.pharmacy) { c.say("ok_plain"); return; }
      if (seg.tags.includes("other")) { c.s.pharmacy = "other"; c.say("pharmacy_other"); }
      else if (seg.tags.includes("unknown") || seg.tags.includes("any")) { c.s.pharmacy = "harbor"; c.say("pharmacy_suggest"); c.say("pharmacy_other"); }
      else { c.s.pharmacy = "harbor"; c.say("pharmacy_harbor"); }
      c.say("pharmacy_ready");
      c.event("give", { item: "prescription" });
    },
    pharmacy_dunno_ctx(c) { doctor.handlers.pharmacy_ans(c, {}, { intent: "pharmacy_ans", slots: {}, tags: ["unknown"] }); },
    note_ctx(c, _slots, seg) {
      if (seg.tags.includes("no")) { c.s.note = false; c.say("note_no_ok"); return; }
      giveNote(c);
    },
    dob_ans(c, slots) { setDob(c, slots); },
    // "Not great. I have a terrible headache.": one "I'm sorry to hear that" for the whole answer
    g_howareyou_bad(c) { sorry(c); },
    // Thanks and goodbyes: once the medicine is explained, "Thanks, bye!" gets the doctor's wrap-up.
    g_thanks(c) { c.say("g_welcome"); if (c.s.__finished || c.s.wrapped) c.hold(); },
    g_bye(c) {
      if (c.s.rxGiven && !c.s.wrapped) wrapUp(c);
      else c.say("g_bye");
      c.end(); c.hold();
    },
    year_ctx(c, slots) { setDob(c, slots); },
  },

  finish: (c) => {
    c.complete();
    wrapUp(c);
    c.expect({ id: "closing", optional: true, hints: ["closing", "g_social"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "closing" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
        nice_meet: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // hint patterns and song phrases
    { say: "I've got a sore throat and a temperature.", intent: "symptom" },
    { say: "I have a sore throat.", intent: "symptom", slots: { syms: { symptom: "sore_throat" } } },
    { say: "I have a stomachache.", intent: "symptom", slots: { syms: { symptom: "stomachache" } } },
    { say: "My throat hurts.", intent: "symptom", slots: { part: "sore_throat" } },
    { say: "It hurts when I swallow.", intent: "symptom" },
    { say: "I feel dizzy.", intent: "symptom" },
    { say: "I feel tired all the time.", intent: "symptom" },
    { say: "I can't stop coughing.", intent: "symptom" },
    { say: "My nose is running.", intent: "symptom" },
    { say: "I don't feel well.", intent: "feel_sick" },
    { say: "Since Monday.", intent: "howlong_ans", step: "howlong" },
    { say: "For three days.", intent: "howlong_ans", step: "howlong", slots: { n: 3 } },
    { say: "About a week.", intent: "howlong_ans", step: "howlong" },
    { say: "I've had it for two days.", intent: "howlong_ans", step: "howlong", slots: { n: 2 } },
    { say: "Yes, about 38 degrees.", intent: "temp_ans", step: "fever", slots: { temp: { v: 38 } } },
    { say: "It was 101 this morning.", intent: "temp_ans", step: "fever", slots: { temp: { v: 101 } } },
    { say: "I didn't check.", intent: "temp_unknown", step: "fever" },
    { say: "I don't have a thermometer.", intent: "temp_unknown", step: "fever" },
    { say: "Just ibuprofen.", intent: "meds_ans", step: "meds" },
    { say: "I took some Tylenol.", intent: "meds_ans", step: "meds" },
    { say: "I drink tea with honey.", intent: "meds_ans", step: "meds" },
    { say: "I'm allergic to penicillin.", intent: "allergy_ans", step: "allergy" },
    { say: "No, I don't have any allergies.", intent: "allergy_ans", step: "allergy" },
    { say: "Is it serious?", intent: "ask_serious" },
    { say: "Is it contagious?", intent: "ask_contagious" },
    { say: "Do I need antibiotics?", intent: "ask_antibiotics" },
    { say: "How often should I take it?", intent: "ask_dosage" },
    { say: "Before or after meals?", intent: "ask_meals" },
    { say: "For how long?", intent: "ask_duration" },
    { say: "Are there any side effects?", intent: "ask_side" },
    { say: "Can I drink alcohol with it?", intent: "ask_alcohol" },
    { say: "Can I get a note for work?", intent: "ask_note" },
    { say: "What if it doesn't get better?", intent: "ask_not_better" },
    { say: "When will I feel better?", intent: "ask_better" },
    { say: "Can I go to work?", intent: "ask_work" },
    { say: "Harbor Pharmacy, please.", intent: "pharmacy_ans", step: "pharmacy" },
    { say: "June 4th, 1980.", intent: "dob_ans", step: "dob" },
    // natural alternatives, short answers
    { say: "Sore throat.", intent: "symptom_ctx", step: "problem", slots: { syms: { symptom: "sore_throat" } } },
    { say: "A bad cough and a runny nose", intent: "symptom_ctx", step: "problem" },
    { say: "My head is killing me", intent: "symptom", slots: { part: "headache" } },
    { say: "I think I have the flu", intent: "symptom", slots: { syms: { symptom: "flu" } } },
    { say: "I have flu", intent: "symptom" },
    { say: "I've been throwing up since last night", intent: "symptom" },
    { say: "My back hurts a lot", intent: "symptom", slots: { part: "back_pain" } },
    { say: "I have pain in my ear", intent: "symptom", slots: { part: "earache" } },
    { say: "I have a fever of 39", intent: "symptom", slots: { temp: { v: 39 } } },
    { say: "38.5", intent: "temp_ans", step: "fever", slots: { temp: { v: 38.5 } } },
    { say: "Thirty eight point five", intent: "temp_ans", step: "fever", slots: { temp: { v: 38.5 } } },
    { say: "A hundred and one", intent: "temp_ans", step: "fever", slots: { temp: { v: 101 } } },
    { say: "One oh one", intent: "temp_ans", step: "fever", slots: { temp: { v: 101 } } },
    { say: "38 degrees Celsius", intent: "temp_ans", step: "fever", slots: { temp: { v: 38, unit: "c" } } },
    { say: "Three days", intent: "howlong_ans", step: "howlong", slots: { n: 3 } },
    { say: "Since two days", intent: "howlong_ans", step: "howlong", slots: { n: 2 } },
    { say: "It started on Monday", intent: "howlong_ans", step: "howlong" },
    { say: "About a six", intent: "scale_ctx", step: "scale", slots: { n: 6 } },
    { say: "Nothing", intent: "meds_ans", step: "meds" },
    { say: "I took paracetamol", intent: "meds_ans", step: "meds" },
    { say: "Can I get a sick note?", intent: "ask_note" },
    { say: "Is it the flu?", intent: "ask_what" },
    { say: "I'm new here, I don't know", intent: "pharmacy_ans", step: "pharmacy" },
    { say: "06/04/1980", intent: "dob_ans", step: "dob" },
    // negation and meaning preservation
    { say: "I don't have a fever.", intent: "sym_neg", step: "fever", not: ["symptom", "temp_ans"] },
    { say: "No fever", intent: "sym_neg", step: "fever", not: ["symptom"] },
    { say: "I'm not allergic to penicillin", intent: "allergy_ans", step: "allergy", slots: {} },
    { say: "I'm not taking anything.", intent: "meds_ans", step: "meds", not: ["symptom"] },
    { say: "My throat doesn't hurt", intent: "sym_neg", not: ["symptom"] },
    { say: "I have a cough but no fever", intent: "symptom", step: "problem", not: ["temp_ans"] },
    { say: "I don't think I have a fever", intent: "sym_neg", step: "fever", not: ["symptom"] },
    // more constructions (dev corpus tests/corpus/s31-doctor.json)
    { say: "I cough a lot.", intent: "symptom" },
    { say: "I hurt my back, it is very painful", intent: "symptom", slots: { part: "back_pain" } },
    { say: "I don't have a fever, but my throat hurts", intent: "symptom", step: "problem", slots: { neg: "fever", part: "sore_throat" }, not: ["temp_ans"] },
    { say: "I am sick three days", intent: "howlong_ans", step: "howlong", slots: { n: 3 } },
    { say: "This is the third day", intent: "howlong_ans", step: "howlong" },
    { say: "Eight out of ten", intent: "scale_ctx", step: "scale", slots: { n: 8 } },
    { say: "I have 38", intent: "temp_ans", step: "fever", slots: { temp: { v: 38 } } },
    { say: "38,5", intent: "temp_ans", step: "fever", slots: { temp: { v: 38.5 } } },
    { say: "I don't know", intent: "temp_dunno_ctx", step: "fever" },
    { say: "I don't know", intent: "allergy_dunno_ctx", step: "allergy" },
    { say: "Penicillin", intent: "allergy_ctx", step: "allergy" },
    { say: "I am allergic on penicillin", intent: "allergy_ans", step: "allergy" },
    { say: "Should I take it with food?", intent: "ask_meals" },
    { say: "Will it make me sleepy?", intent: "ask_drive" },
    { say: "What if it gets worse?", intent: "ask_not_better" },
    { say: "Can I give it to my family?", intent: "ask_contagious" },
    { say: "The one on Main Street", intent: "pharmacy_ans", step: "pharmacy" },
    { say: "Can I get a note for work?", intent: "ask_note", step: "note" },
    { say: "You too!", intent: "nice_meet" },
    { say: "What should I eat?", intent: "ask_eat" },
    { say: "Do you take my insurance?", intent: "ask_cost" },
    { say: "The fourth of June 1980", intent: "dob_ans", step: "dob" },
    // review fixes 27 Sep: which ear, a four-piece answer, temperature with a "since/for" tail
    { say: "My left ear hurts.", intent: "symptom", slots: { part: "earache" } },
    { say: "I have a pain in my right ear.", intent: "symptom", slots: { part: "earache" } },
    { say: "I have an earache in my left ear", intent: "symptom", slots: { part: "earache" } },
    { say: "Left ear.", intent: "symptom_ctx", step: "problem", slots: { part: "earache" } },
    { say: "I have a sore throat and a fever of 38.5 since Monday. I'm allergic to penicillin.", intent: "symptom", step: "problem" },
    { say: "A fever of 38.5 since Monday", intent: "symptom", slots: { temp: { v: 38.5 } } },
    { say: "I have a fever of 39 for two days", intent: "symptom", slots: { temp: { v: 39 }, n: 2 } },
    { say: "I have 38 since yesterday", intent: "temp_ans", step: "fever", slots: { temp: { v: 38 } } },
    { say: "37.2", intent: "temp_ans", step: "fever", slots: { temp: { v: 37.2 } } },
    // more negation traps
    { say: "I'm not dizzy", intent: "sym_neg", not: ["symptom"] },
    { say: "My ear doesn't hurt", intent: "sym_neg", not: ["symptom"] },
    { say: "I'm not taking ibuprofen", intent: "none" },
    { say: "I don't need a note", intent: "none" },
    // unrelated
    { say: "the banana is dancing on the roof", intent: "none" },
    { say: "I want to buy a car", intent: "none" },
    { say: "My dog likes green potatoes", intent: "none" },
  ],

  sims: [
    { name: "song path: sore throat and a temperature, Celsius, questions",
      turns: ["I've got a sore throat and a temperature.", "Since Monday.", "38 degrees.", "Just ibuprofen.", "Okay.", "Aaah.", "Yes, a little.",
        "No, I'm not allergic to anything.", "Can I drink alcohol with it?", "Can I get a note for work?", "Thank you, doctor!"],
      expect: { complete: true }, auto: AUTO },
    { name: "short answers",
      turns: ["Sore throat.", "Three days.", "Yes.", "39.", "No.", "Okay.", "Aaah.", "Yes.", "No.", "Okay, thanks.", "Bye!"],
      expect: { complete: true }, auto: AUTO },
    { name: "questions first, a virus",
      turns: ["I have a bad cough and a runny nose.", "Is it serious?", "About a week.", "I don't know, I didn't check.", "No, nothing.", "Okay.", "Aaah.",
        "No, it doesn't hurt.", "Do I need antibiotics?", "No.", "How often should I take it?", "Can I go to work?", "What if it doesn't get better?", "Thanks, bye!"],
      expect: { complete: true }, auto: AUTO },
    { name: "penicillin allergy (said or in the chart)",
      turns: ["I have a sore throat and a fever since yesterday.", "101.", "No, nothing.", "Okay.", "Aaah.", "Yes, it hurts.", "I'm allergic to penicillin.",
        "For how long?", "Thank you!"],
      expect: { complete: true }, auto: { ...AUTO, allergy: "I'm allergic to penicillin." } },
    { name: "stomachache, no fever, blood pressure possible",
      turns: ["My stomach hurts.", "Since last night.", "No, I don't have a fever.", "I took some Pepto.", "Sure.", "Okay.", "Aaah.", "Yes, a lot.",
        "No allergies.", "What should I eat?", "Thanks, goodbye!"],
      expect: { complete: true }, auto: { ...AUTO, fever: "No fever." } },
    // review fixes 27 Sep (no automatic answer to the opening question: these only complete if it isn't asked again)
    { name: "left ear: the exam keeps the side",
      turns: ["My left ear hurts.", "Since Monday.", "No.", "Nothing.", "Okay.", "Aaah.", "Yes, a little.", "No allergies.", "Thanks, bye!"],
      expect: { complete: true }, auto: AUTO },
    { name: "four pieces in one sentence",
      turns: ["I have a sore throat and a fever of 38.5 since Monday. I'm allergic to penicillin.", "No, nothing.", "Okay.", "Aaah.", "Yes, it hurts.", "How often should I take it?", "Thanks, bye!"],
      expect: { complete: true }, auto: noOpening(AUTO) },
    { name: "a normal temperature keeps the complaint",
      turns: ["I have a fever.", "Two days.", "37", "No, that's all.", "No, nothing.", "Okay.", "Aaah.", "No.", "No.", "Thanks, bye!"],
      expect: { complete: true }, auto: noOpening({ ...AUTO, fever: "37" }) },
    { name: "back pain, learner-style English",
      turns: ["Hello doctor. I have problem, my back hurt very much.", "Since two days.", "No temperature.", "No.", "Okay.", "Yes, here hurts.", "No.",
        "Can I go to work?", "Thank you, bye."],
      expect: { complete: true }, auto: { ...AUTO, fever: "No fever.", hurt: "Yes." } },
  ],
};

// ---------------------------------------------------------------------------
// Hint helpers: "I have …" and "My … hurts." with a natural Lithuanian sentence per symptom.

function haveItems(): HintItem[] {
  const NAT: Record<string, string> = {
    sore_throat: "Man skauda gerklę.", fever: "Karščiuoju.", cough: "Mane kamuoja kosulys.", headache: "Man skauda galvą.", stomachache: "Man skauda pilvą.",
    earache: "Man skauda ausį.", runny_nose: "Man bėga nosis.", stuffy_nose: "Man užgulusi nosis.", back_pain: "Man skauda nugarą.", aches: "Man skauda visą kūną.",
    cold: "Esu {m:peršalęs|f:peršalusi}.", flu: "Sergu gripu.",
  };
  return Object.entries(NAT).map(([id, nat]) => ({ id: "have", s: t("I | have | {X.np}.", "Aš | turiu | {X.np:acc}.", nat), only: (e: EntityDef) => e.id === id }));
}

function alsoItems(): HintItem[] {
  const NAT: Record<string, string> = {
    sore_throat: "Dar ir gerklę skauda.", fever: "Dar ir karščiuoju.", cough: "Dar ir kosėju.", headache: "Dar ir galvą skauda.", stomachache: "Dar ir pilvą skauda.",
    earache: "Dar ir ausį skauda.", runny_nose: "Dar ir nosis bėga.", stuffy_nose: "Dar ir nosis užgulusi.", back_pain: "Dar ir nugarą skauda.", aches: "Dar ir visą kūną skauda.",
  };
  return Object.entries(NAT).map(([id, nat]) => ({ id: "have", s: t("I | also | have | {X.np}.", "Aš | taip pat | turiu | {X.np:acc}.", nat), only: (e: EntityDef) => e.id === id }));
}

function bodyItems(): HintItem[] {
  const PARTS: [string, string, string][] = [
    ["sore_throat", "throat", "gerklę"], ["headache", "head", "galvą"], ["stomachache", "stomach", "pilvą"], ["earache", "ear", "ausį"], ["back_pain", "back", "nugarą"],
  ];
  return PARTS.map(([id, en, lt]) => ({
    id: "body_hurts",
    s: t(`My | ${en} | hurts.`, `Man | ${lt} | skauda.`, `Man skauda ${lt}.`, { flags: { 0: `“My” → dative Man: Lithuanian says “to me the ${en} hurts”.` } }),
    only: (e: EntityDef) => e.id === id,
  }));
}

// ---------------------------------------------------------------------------
// Flow helpers

function feelingFine(c: Ctx) {
  // "Fine, thanks." to a doctor: she goes straight to the reason for the visit
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
  const a = tags.includes("pen") ? "pen" : tags.includes("other") || tags.includes("nsaid") ? "other" : tags.includes("unsure") ? "pen" : "none";
  if (a === "none") { c.s.allergy = "none"; c.say("chart_fixed"); return; }
  setAllergy(c, [a]);
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

function giveRx(c: Ctx) {
  rxIntro(c);
  c.s.rxGiven = true;
  c.say("dose");
  if (kind(c) === "ab") { c.say("dose_days_ab"); c.say("dose_finish"); } else c.say("dose_days");
  if (!c.s.askPharmacy) c.event("give", { item: "prescription" });
  // the goal is reached: the learner knows what it is and how to take the medicine
  c.complete();
  if (c.s.askQ) { c.say("ask_questions"); c.expect(questionsPending("rx_q")); }
}

/** "Do you have any (other) questions?": asked once; any question the learner asks is answered by its handler. */
function questionsPending(id: string): Pending {
  return { id, optional: true, hints: ["ask_rx", "ask_dx", "g_yesno"],
    expects: ["clear_ctx", "ask_dosage", "ask_meals", "ask_duration", "ask_side", "ask_alcohol", "ask_drive", "ask_better", "ask_work", "ask_note", "ask_contagious", "ask_serious", "ask_not_better"],
    suggest: [{ lt: "Paklausti apie vaistus", hint: "ask_rx" }, { lt: "Paklausti apie ligą", hint: "ask_dx" }, { lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
    yes: (cc) => { cc.say("go_ahead"); cc.hold(); },
    no: (cc) => { cc.say("ok_plain"); } };
}

/** Rest and fluids, "Come back if it doesn't get better", "Feel better!" (once). */
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
  const year = nd ? nd.year : slots.year;
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
// The exam, one instruction at a time. Each instruction waits for the learner's answer (a pending
// question); its answer says the finding, and the step asks the next instruction.

const EXAM_SUGGEST: Record<string, { lt: string; hint: string }> = {
  sleeve: { lt: "Pasiraitoti rankovę (ir atsakyti)", hint: "exam_sleeve" },
  breath: { lt: "Įkvėpti ir iškvėpti (ir atsakyti)", hint: "exam_breath" },
  ah: { lt: "Pasakyti „a-a-a“", hint: "exam_ah" },
  hurt: { lt: "Atsakyti, ar skauda", hint: "exam_hurt" },
};

function examPending(id: "sleeve" | "breath" | "ah" | "hurt", expects: string[], done: (c: Ctx, how: string) => void, again: (c: Ctx) => void): Pending {
  const on: Pending["on"] = {};
  for (const i of expects) on[i] = (cc: Ctx, _sl: any, _sg: any) => { done(cc, i); };
  return {
    id, expects, hints: [EXAM_SUGGEST[id].hint, "g_yesno"], suggest: [EXAM_SUGGEST[id], { lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
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
        c.s.temp = { f: tm, measured: true };
        c.s.fever = tm >= 99.5;
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
    if (h === "yes" && /\b(ouch|ow|oww|lot|much|really)\b/i.test(cc.heard)) cc.say("hurt_sorry");
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
