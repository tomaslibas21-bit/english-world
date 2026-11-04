// NEEDS: None. The price slot (car prices said as Mexicans say them), the merges and every pattern are local.
// Advanced song P25 "What If We Met Halfway" → "¿Y si lo dejamos en…?": haggling over a used car with a private
// seller in Puerto Colibrí. Calle de los Cedros, Doña Margarita's driveway (a stranger: usted). Margarita, about 60,
// a retired teacher, sells her red 2008 convertible, asking $85,000 pesos. The learner says why they came, asks about
// the car (kilometers, crashes, why she's selling, the papers: la factura original, la tarjeta de circulación, the
// yearly fees paid up), takes it around the block, then haggles with the song's moves in their Mexican form: "Se me
// hace un poco caro", "¿El precio es negociable?", "Estaba pensando más bien en setenta mil", "¿Y si nos quedamos a la
// mitad?", "¿Me lo puede dejar en menos?", "¿Es su mejor oferta?", "¿Cuánto es lo menos?", "Déjeme consultarlo con la
// almohada", "Me parece bien". A deal ends with the payment (cash, a bank transfer or a cheque de caja), the keys,
// the factura signed over and the registration card; a polite (or blunt) refusal is a valid ending too. Leaving
// before any price talk is not.
// Keeps the English situation's steps, intents, twists and price model, scaled to pesos: $85,000 → 80,000 → 77,500 →
// 75,000 (her "lo menos", with a throw-in: new tires, the car cover or a full tank); $72,500 is her floor, reached only
// with the song's tactics (halfway, sleeping on it, walking away). Cash takes $2,500 off once; a fault (the AC, or
// the learner's own criticism after the drive) takes $2,500 off every price once. After eight moves without a deal
// she names her floor. Twists: the AC doesn't work (in the Caribbean, a real flaw; Margarita owns up after the drive,
// when asked about problems, or before the first number); another buyer calls after her second concession ("Déjeme
// pensarlo" → "¡Ni se le ocurra!"). Added for Mexico (the brief): q_papers (factura, tarjeta de circulación,
// refrendo/tenencia, placas, "¿Es nacional?", REPUVE) and q_mechanic ("¿Lo puedo llevar con mi mecánico?").
// Prices are values: {$price} = her price, {$amount} = the learner's number (echoed only on a multiple of $2,500).
// Research (Nov 2026), and what stays vague: a private sale in Mexico hands over the original factura endorsed
// (endosada) to the buyer, the tarjeta de circulación and the receipts of the yearly fees; buyers check the VIN in the
// public registry (REPUVE) and often take the car to their own mechanic; payment by transfer or cash is common, a
// cheque de caja exists. Whether this state charges a tenencia besides the refrendo is not taught: Margarita says
// only that every payment is up to date ("al corriente") and in the folder. Where the buyer registers the change of
// owner is not said. Price ($85,000 for a 2008 convertible) and fuel (about 12 km per liter) are plausible, not
// sourced; the bank on the corner of Juárez and Ceiba is TOWN.md's.

import type { Ctx, Handler, Segment, SituationDef, Suggestion, Tip } from "@/content/types";
import { anyWords, type SlotFn, type SlotResult } from "@/convo/grammar";
import { t } from "@/content/dsl";
import { nameSlot, readInt } from "@/convo/slots";

// ---------------------------------------------------------------------------
// Flags used more than once

const F_CARRO = "Mexican: carro = car; auto is more widely used.";
const F_NOMAS = "Mexican: nomás = just, only.";
const F_CLOCK = "Spanish uses an article before clock times; English has no separate word.";
const F_FACTURA = "factura: the car's original sales invoice; in Mexico it proves who owns the car, like a title.";
const F_TARJETA = "tarjeta de circulación: the vehicle registration card.";
const F_UNOS = "unos before a number means about, roughly.";
const F_DEJAR = "dejar en: to let something go for a price (¿Me lo deja en…? = will you let me have it for…?).";

// ---------------------------------------------------------------------------
// Car prices in pesos: "85000", "$85,000", "85 mil", "ochenta y cinco mil", "setenta y siete mil quinientos", "85k",
// and the shorthand of a car sale: a bare "ochenta" = $80,000, "ochenta y cinco" = $85,000, "setenta y siete
// quinientos" / "setenta y siete y medio" / "77 500" = $77,500. Value in pesos, rounded to $500; $20,000–$200,000
// only. A number before a noun is a count, never a price ("160 mil kilómetros", "dos preguntas").

const PESOS = new Set(["pesos", "peso", "varos", "mxn"]);
const COUNT_NOUN = new Set(("ano anos kilometros kilometro km kms millas milla dias dia semanas meses mes horas hora minutos duenos dueno " +
  "duenas preguntas pregunta personas litros litro cosas veces llantas puertas asientos cilindros caballos metros").split(" "));
function mxnReadings(tokens: string[], pos: number, strict: boolean): SlotResult[] {
  const out: SlotResult[] = [];
  const push = (end: number, v: number, cost = 0) => {
    const r = Math.round(v / 500) * 500;
    if (r < 20000 || r > 200000) return;
    let e = end;
    if (PESOS.has(tokens[e] ?? "")) { e++; if (tokens[e] === "mexicanos") e++; }
    if (COUNT_NOUN.has(tokens[e] ?? "")) return;
    out.push({ end: e, value: r, cost });
    if (e !== end) out.push({ end, value: r, cost: cost + 0.05 });
  };
  const t0 = tokens[pos];
  if (t0 === undefined) return out;
  let m = t0.match(/^(\d{2,3}(?:\.\d)?)k$/);
  if (m) push(pos + 1, parseFloat(m[1]) * 1000);
  m = t0.match(/^(\d{2,3})\.(\d{3})$/); // "85.000" (a thousands dot)
  if (m) push(pos + 1, parseInt(m[1] + m[2], 10));
  m = t0.match(/^(\d{2,3})\.(\d)$/); // "77.5 mil"
  if (m && tokens[pos + 1] === "mil") push(pos + 2, parseFloat(t0) * 1000);
  for (const r of readInt(tokens, pos)) {
    const v = r.value, i = r.end;
    if (v >= 1000) {
      push(i, v);
      // "setenta y dos mil y medio" = $72,500 (never $72,000 and a "medio")
      if (v % 1000 === 0 && tokens[i] === "y" && tokens[i + 1] === "medio") push(i + 2, v + 500);
      continue;
    }
    if (v < 20 || v > 200) continue;
    const nx = tokens[i];
    if (nx === "mil") continue; // readInt has read "ochenta mil" whole
    // "77 500" (a space as the thousands separator)
    if (!r.words && /^\d{3}$/.test(nx ?? "")) { push(i + 1, v * 1000 + parseInt(nx, 10)); continue; }
    if (strict || COUNT_NOUN.has(nx ?? "")) continue;
    push(i, v * 1000, 0.2); // "ochenta" = $80,000
    if (nx === "y" && tokens[i + 1] === "medio") push(i + 2, v * 1000 + 500, 0.1);
    if (nx === "punto" && tokens[i + 1] === "cinco") push(i + 2, v * 1000 + 500, 0.1);
    // "setenta y siete quinientos" = $77,500
    if (r.words) for (const r2 of readInt(tokens, i)) if (r2.words && r2.value >= 100 && r2.value <= 999 && r2.value % 100 === 0) push(r2.end, v * 1000 + r2.value, 0.1);
  }
  return out;
}
const mxnSlot: SlotFn = (tokens, pos) => mxnReadings(tokens, pos, false);
/** An explicit amount ("setenta mil", "70000"): after "solo tengo…", a bare number is a count. */
const mxnStrictSlot: SlotFn = (tokens, pos) => mxnReadings(tokens, pos, true);

// "Soy Ryan.": the player's registered name, or one or two words that aren't ordinary Spanish ("Soy nuevo aquí",
// "Soy de Canadá", "Soy maestra" are small talk, not names).
const NOT_A_NAME = new Set(("de del la el los las un una yo aqui nuevo nueva turista estudiante maestro maestra americano americana " +
  "canadiense ingles inglesa irlandes irlandesa australiano australiana gringo gringa interesado interesada el comprador la compradora " +
  "comprador compradora vecino vecina muy bien yo mismo misma quien llamo llame persona senor senora joven alto alta").split(" "));
const pnameSlot: SlotFn = (tokens, pos, prefix) => nameSlot(tokens, pos, prefix).filter((r) => {
  if (r.tags?.includes("known_name")) return true;
  const parts = tokens.slice(pos, r.end);
  return parts.length <= 2 && parts.every((w) => !NOT_A_NAME.has(w));
});

// "¿Tiene bluetooth?" / "¿Y el quemacocos?": something about the car Margarita has no answer for. Never the price,
// a discount, cash, a number, the test drive or anything another question answers.
const NOT_A_THING = new Set(("precio precios costo descuento descuentos rebaja oferta trato efectivo dinero pago tarjeta transferencia cheque " +
  "prueba manejo vuelta paseo pesos mil lo la el los las le un una me mi su yo usted que algo alguna algun problema problemas detalle " +
  "detalles falla fallas factura papeles papel tarjeta tenencia refrendo placas llantas aire clima motor cofre radio asientos techo " +
  "cajuela kilometros kilometraje gasolina dueno duenos choque choques pintura servicio servicios garantia frenos " +
  "uno dos tres cuatro cinco seis siete ocho nueve diez veinte treinta cuarenta cincuenta sesenta setenta ochenta noventa cien").split(" "));
const anyThing = anyWords(3);
const qThingSlot: SlotFn = (tokens, pos, prefix) =>
  anyThing(tokens, pos, prefix).filter((r) => r.partial || !tokens.slice(pos, r.end).some((w) => NOT_A_THING.has(w) || /^\d/.test(w) || w.includes("'") || w === "si"));

// ---------------------------------------------------------------------------
// Price model (pesos)

const ASK = 85000;
const STEP = 2500;
const off = (c: Ctx) => (c.s.off as number) ?? 0; // the fault lever: $2,500 off every price, once
const FINAL = (c: Ctx) => 75000 - off(c);
const FLOOR = (c: Ctx) => 72500 - off(c);
const RUNGS = [80000, 77500, 75000];
const nextRung = (c: Ctx): number | null => RUNGS.map((x) => x - off(c)).find((x) => x < c.s.cur) ?? null;
const r1250 = (x: number) => Math.round(x / 1250) * 1250;
/** Her price as a value (cents of a peso). */
const P = (c: Ctx) => ({ price: (c.s.cur as number) * 100 });
/** Prices Margarita can say (domain price): $70,000–$85,000 in steps of $1,250 (a halfway lands on $1,250). */
const sayable = (v: number) => v % 1250 === 0 && v >= 70000 && v <= ASK;
/** The learner's number can be echoed ("¿Setenta mil? Yo pensaba…") when it has a recording (domain amount). */
const echoable = (q: number) => q % STEP === 0 && q >= 50000 && q < ASK;

const THROW_INS = ["tires", "tires", "cover", "tank"];

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const heard = (c: Ctx) => fold(c.heard || "");

// ---------------------------------------------------------------------------
// Turn helpers

/** Every piece of the learner's current sentence (the engine parses it before any handler runs). */
const turnSegments = (c: Ctx): Segment[] => ((c as any).conv?.out?.parse?.segments ?? []) as Segment[];
const SAID = new WeakMap<Ctx, Set<string>>();
/** Once per learner turn (the dialogue creates a fresh context object for every turn). */
function once(c: Ctx, key: string): boolean {
  let set = SAID.get(c);
  if (!set) { set = new Set(); SAID.set(c, set); }
  if (set.has(key)) return false;
  set.add(key);
  return true;
}
const happened = (c: Ctx, key: string) => !!SAID.get(c)?.has(key);

/** One negotiating move per turn: "Se me hace caro. ¿Me lo deja en setenta?" is an offer, and the song's "Es un poco
 *  más de lo que quería gastar. ¿El precio es negociable?" gets one reply. */
const MOVE: Record<string, number> = {
  make_offer: 10, make_offer_ctx: 10, halfway: 9, accept_deal: 8, accept_ctx: 8, sleep_on_it: 8, walk_away: 8, walk_rude: 8,
  ask_best: 6, ask_better: 6, ask_flex: 5, too_high: 5, lets_talk: 4, ask_price: 4,
};
/** Pieces that push back: with one of them in the same breath, her own price (or more) said back is an echo. */
const PUSHBACK = new Set(["too_high", "walk_away", "walk_rude", "rude_car", "use_flaw", "sleep_on_it", "ask_flex", "ask_better", "ask_best",
  "halfway", "cash_lever", "no_cash", "ask_price", "lets_talk"]);
const isOffer = (s: Segment) => s.intent === "make_offer" || s.intent === "make_offer_ctx";
/** "¿Ochenta y cinco mil? No puedo." / "Ochenta mil sigue siendo mucho.": her price (or more) with a no, a push or a
 *  question in the same turn repeats her number; it is never an offer (an offer at her price buys the car). */
const ECHOES = new WeakMap<Ctx, Set<Segment>>();
function echoOffer(c: Ctx, s: Segment): boolean {
  // decided once per turn, against her price before this turn's handlers (cash or a fault) lower it
  let e = ECHOES.get(c);
  if (!e) {
    const segs = turnSegments(c);
    const push = (c as any).conv?.out?.parse?.yn === "no" || segs.some((x) => PUSHBACK.has(x.intent));
    e = new Set(push ? segs.filter((x) => isOffer(x) && typeof x.slots.mxn === "number" && x.slots.mxn >= c.s.cur) : []);
    ECHOES.set(c, e);
  }
  return e.has(s);
}
/** The learner's real offers this turn (echoes left out). */
const turnOffers = (c: Ctx) => turnSegments(c).filter((s) => isOffer(s) && !echoOffer(c, s));

/** A yes to her price, unless it is taken back or hedged (rule 17). */
const ACCEPTS = new Set(["accept_deal", "accept_ctx"]);
/** A push after a yes takes it back: "Me parece bien, pero es un poco caro", "Quiero comprarlo, pero es muy caro", "Me lo
 *  llevo, pero necesito pensarlo" (the push answers). Before it, the yes stands: "Es caro, pero me lo llevo". */
const PUSHY = new Set(["too_high", "ask_flex", "ask_better", "ask_best", "halfway", "use_flaw", "sleep_on_it", "walk_away", "walk_rude"]);
/** A way to pay named: "¿Lo puedo pagar con tarjeta?" asks how, it says no yes. */
const METHODS = new Set(["pay_cash", "pay_transfer", "pay_check", "pay_card", "cash_lever"]);
/** Soft words: never what answers a hedged yes. */
const SOFT = new Set(["g_thanks", "g_ok", "vocative"]);
/** What may follow an unaccented "si" and still make it a yes typed without its accent ("si me lo llevo", "si, claro"). */
const YES_AFTER_SI = new RegExp("^(me lo (llevo|quedo)|(se )?lo compro|(lo )?acepto|trato|hecho|quiero comprarlo|me (parece|late|cuadra|funciona)|se me hace|esta bien|" +
  "(estoy |estamos )?de acuerdo|es un (buen precio|precio justo)|sin regatear|cerr(amos|emos)|hagamoslo|lo hacemos|listo|claro|por supuesto|como no|perfecto|" +
  "ok|va|sale|bueno|gracias|por favor|senor|senora|joven|si)\\b");
/** "Si me hace un descuento, me lo llevo", "Lo compro si me deja llevarlo con mi mecánico": a condition, never a yes
 *  (rule 17). An "if" is an unaccented si with more words right after it; "Sí, me lo llevo" and "Si, lo compro" are yes. */
function conditional(c: Ctx): boolean {
  const raw = (c.heard || "").toLowerCase();
  for (const m of raw.matchAll(/(?:^|[^\p{L}])si(?=\s+\p{L})/gu)) {
    const rest = fold(raw.slice(m.index! + m[0].length)).replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
    if (!YES_AFTER_SI.test(rest)) return true;
  }
  return false;
}
/** A yes this turn that isn't one: a push after it, or a condition. */
function hedged(c: Ctx): boolean {
  const segs = turnSegments(c);
  const first = segs.findIndex((s) => ACCEPTS.has(s.intent));
  if (first < 0) return false;
  return segs.slice(first + 1).some((s) => PUSHY.has(s.intent)) || conditional(c);
}
/** Something else in the turn answers ("Si me deja llevarlo con mi mecánico, lo compro": "Claro, …"). */
const otherPiece = (c: Ctx) => turnSegments(c).some((s) => !ACCEPTS.has(s.intent) && !SOFT.has(s.intent));
const moveOf = (c: Ctx, s: Segment) => (echoOffer(c, s) || (ACCEPTS.has(s.intent) && hedged(c)) ? 0 : MOVE[s.intent] ?? 0);
function mainMove(c: Ctx, intent: string): boolean {
  const best = Math.max(0, ...turnSegments(c).map((s) => moveOf(c, s)));
  if ((MOVE[intent] ?? 0) < best) return false;
  return once(c, "move");
}

// ---------------------------------------------------------------------------
// Suggestions and pending questions

const S_OFFER: Suggestion = { lt: "Make your offer", hint: "offer" };
const S_PUSH: Suggestion = { lt: "Push on: halfway, her lowest price", hint: "push" };
const S_DECIDE: Suggestion = { lt: "Agree, think it over or say no politely", hint: "decide" };
const S_TALK: Suggestion = { lt: "Start talking about the price", hint: "talk" };
const S_DRIVE: Suggestion = { lt: "Ask for a test drive (or skip it)", hint: "drive" };
const flawSuggest = (c: Ctx): Suggestion[] =>
  c.s.flawUsed ? [] : c.s.flawKnown ? [{ lt: "Use the fault", hint: "flaw_ac" }] : c.s.complained ? [{ lt: "Use the fault", hint: "flaw_brakes" }] : [];

const NEG = ["make_offer", "make_offer_ctx", "ask_better", "ask_best", "halfway", "cash_lever", "use_flaw", "too_high", "ask_flex",
  "sleep_on_it", "accept_deal", "accept_ctx", "shake", "walk_away", "walk_rude", "lets_talk", "ask_price"];
/** Turns at "¿sin regatear?" (its handlers mark them, for `reask`). */
const CONFIRMING = new WeakSet<Ctx>();
const negOn = (confirm = false) => Object.fromEntries(NEG.map((i) => [i, (cc: Ctx, sl: any, sg: Segment) => { if (confirm) CONFIRMING.add(cc); H[i](cc, sl, sg); return true; }]));
/** At her price questions: the moves, plus "Está bien, gracias" (closing_ctx), which never buys the car (rule 17). */
const NEGP = [...NEG, "closing_ctx"];

/** "Está bien, gracias" / "Ok, gracias" / "Así está bien": a polite closing never buys the car (rule 17). */
const politeClosing = (c: Ctx) => /^\s*(esta bien|ok|okay|vale|bueno|asi esta bien)\b.*\bgracias\b/.test(heard(c)) || /^\s*(asi esta bien|esta bien asi)\b/.test(heard(c));

/** Her last line of the turn before. */
const lastLine = (c: Ctx): string | undefined => (((c as any).conv?.lastTurn ?? []) as { lineId: string }[]).at(-1)?.lineId;
/** Her open price question again (after a polite closing, a question or a condition: rule 17), never in the words she
 *  has just said (rule 8): "Entonces, $80,000. ¿Qué dice?" / "Entonces: $80,000. ¿Trato hecho?" */
function reask(c: Ctx) {
  const say = (a: string, b: string) => c.say(lastLine(c) === a ? b : a, P(c));
  if (c.s.finalMade) { say("final_reask_p", "final_reask"); pendFinal(c); }
  else if (CONFIRMING.has(c)) { say("confirm_full", "final_reask_p"); pendConfirm(c); }
  else { say("price_reask", "final_reask_p"); pendPrice(c); }
}

/** Margarita named a price: the learner offers, pushes, accepts or walks away. "Sí" accepts (at the asking price,
 *  after a check: "Entonces… $85,000, ¿sin regatear?"). */
function pendPrice(c: Ctx, id = "price") {
  c.expect({ id, expects: NEGP, on: { ...negOn(), closing_ctx: (cc) => reask(cc) },
    suggest: [S_OFFER, S_PUSH, ...flawSuggest(c), S_DECIDE], hints: ["offer", "push", ...flawSuggest(c).map((s) => s.hint!), "decide"],
    yes: (cc) => {
      if (politeClosing(cc)) { reask(cc); return; }
      if (cc.s.cur === ASK && !cc.s.conc && !cc.s.offered) { cc.say("confirm_full", P(cc)); pendConfirm(cc); return; }
      dealAt(cc, cc.s.cur);
    },
    no: (cc) => { cc.say("need_offer"); pendOffer(cc); },
    ask: (cc) => cc.say("price_reask", P(cc)) });
}
/** "Le toca. Hágame una oferta." */
function pendOffer(c: Ctx) {
  c.expect({ id: "offer", expects: NEG, on: negOn(), suggest: [S_OFFER, S_PUSH, ...flawSuggest(c)], hints: ["offer", "push"],
    ask: (cc) => cc.say("need_offer") });
}
/** Her lowest (or last) price: the learner decides. "No" is a polite refusal (her last chance comes once). */
function pendFinal(c: Ctx, id = "final") {
  c.expect({ id, expects: NEGP, on: { ...negOn(), closing_ctx: (cc) => reask(cc) },
    suggest: [S_DECIDE, S_PUSH, ...flawSuggest(c)], hints: ["decide", "push"],
    yes: (cc) => { if (politeClosing(cc)) { reask(cc); return; } dealAt(cc, cc.s.cur); },
    // "Así está bien (, gracias)" could be either: the question again, never the end of the talk (rule 17)
    no: (cc) => { if (politeClosing(cc)) { reask(cc); return; } walkAway(cc, false); },
    ask: (cc) => (cc.chance(0.5) ? cc.say("final_reask") : cc.say("final_reask_p", P(cc))) });
}
/** "Entonces… $85,000, ¿sin regatear?" */
function pendConfirm(c: Ctx) {
  c.s.confirmAsked = true;
  c.expect({ id: "confirm", expects: NEGP, on: { ...negOn(true), closing_ctx: (cc) => { CONFIRMING.add(cc); reask(cc); } },
    suggest: [S_DECIDE, S_OFFER], hints: ["decide", "offer"],
    yes: (cc) => { if (politeClosing(cc)) { CONFIRMING.add(cc); reask(cc); return; } dealAt(cc, cc.s.cur); },
    no: (cc) => { cc.say("need_offer"); pendOffer(cc); },
    ask: (cc) => cc.say("confirm_full", P(cc)) });
}

// ---------------------------------------------------------------------------
// Arriving, questions, the drive

function arrive(c: Ctx): boolean {
  if (c.s.arrived) return false;
  c.s.arrived = true;
  return true;
}
/** The learner skipped saying why they came (a question or a price first): Margarita introduces herself. */
function ensureArrived(c: Ctx) { if (arrive(c)) c.say("maggie_name"); }

function lookAsk(c: Ctx) {
  if (!c.s.qCount && !c.s.presented) { c.s.presented = true; c.say("present1"); c.say("present2"); c.say("ask_first"); return; }
  c.say(c.s.qCount ? "ask_more" : "ask_first");
}

function answer(c: Ctx, id: string, line: string) {
  ensureArrived(c);
  if (!c.s.asked[id]) { c.s.asked[id] = true; c.s.qCount++; }
  c.say(line);
}

/** The AC fault (twist): Margarita owns up. */
function fireFlaw(c: Ctx) {
  c.s.flawFired = true; c.s.flawKnown = true; c.twist("ac_flaw");
}
const flawPending = (c: Ctx) => c.s.twist === "ac_flaw" && !c.s.flawFired;

function startDrive(c: Ctx) {
  ensureArrived(c);
  c.s.drove = true;
  c.s.driveOffered = (c.s.driveOffered ?? 0) + 1;
  c.say("drive_keys");
  c.event("drive");
  // during the price talk the opinion question comes right away (the opinion step only runs before it)
  if (c.s.talked) c.ask("opinion");
}
function declineDrive(c: Ctx) {
  c.s.driveDeclined = true;
  // "Tal vez más tarde." / "Ahorita no.": no "¡Qué valiente!"
  c.say(/\b(despues|luego|mas tarde|al rato|ahorita no|ahora no|todavia no|otro dia|en un rato)\b/.test(heard(c)) ? "drive_later" : "drive_decline");
}

/** After the drive: "¿Y? ¿Qué le pareció?" answered. The AC twist comes now if it hasn't yet. */
function afterOpinion(c: Ctx) {
  if (!flawPending(c)) return;
  fireFlaw(c);
  c.say("flaw_disclose"); c.say("flaw_sky");
  expectFlawReaction(c);
}
function expectFlawReaction(c: Ctx) {
  c.expect({ id: "flaw", optional: true, expects: ["flaw_ok_ctx", "flaw_bad_ctx", "use_flaw"],
    suggest: [{ lt: "React to the fault (or use it)", hint: "flaw_ac" }, S_TALK], hints: ["flaw_ac", "talk"],
    on: { flaw_ok_ctx: (cc) => { cc.say("glad_attitude"); }, flaw_bad_ctx: (cc) => { cc.say("flaw_fair"); },
      g_dontknow: (cc) => { cc.say("g_take_time"); expectFlawReaction(cc); } },
    yes: (cc) => { cc.say("glad_attitude"); }, no: (cc) => { cc.say("flaw_fair"); } });
}

// ---------------------------------------------------------------------------
// The price talk

/** The first money move of the conversation (the learner's or hers): honest Margarita mentions the AC fault (twist)
 *  before any number. */
function startTalk(c: Ctx) {
  ensureArrived(c);
  if (c.s.talked) return;
  c.s.talked = true;
  if (flawPending(c)) { fireFlaw(c); c.say("flaw_before"); c.say("flaw_sky"); }
}

/** The learner asked for the price ("¿Cuánto pide?", "Hablemos de números."): the price, then (if she hasn't asked
 *  yet) "¿Quiere manejarlo primero?" */
function tellPrice(c: Ctx) {
  const first = !c.s.talked;
  startTalk(c);
  if (c.s.cur === ASK) c.say("talk_ask", P(c)); else c.say("price_now", P(c));
  if (first && !c.s.drove && !c.s.driveDeclined && !c.s.driveOffered && !c.s.finalMade) {
    c.s.driveOffered = 1;
    c.say("drive_offer");
    c.expect({ id: "drive_q", expects: ["test_drive", "decline_drive"], suggest: [S_DRIVE, S_OFFER], hints: ["drive", "offer"],
      on: { test_drive: (cc) => { startDrive(cc); }, decline_drive: (cc) => { declineDrive(cc); pendPrice(cc); } },
      yes: (cc) => startDrive(cc), no: (cc) => { declineDrive(cc); pendPrice(cc); },
      ask: (cc) => cc.say("drive_offer") });
    return;
  }
  if (c.s.finalMade) pendFinal(c); else pendPrice(c);
}

/** Margarita comes down to `to` with one of her lines; her second concession brings the rival's call (twist). */
function concede(c: Ctx, to: number, line: string, vars: Record<string, any> = {}) {
  c.s.conc++;
  c.s.cur = to;
  c.say(line, { ...P(c), ...vars });
  // the question right after the rival's call has its own id ("rival"), so the picture can show her phone
  pendPrice(c, rival(c) ? "rival" : "price");
}
function rival(c: Ctx): boolean {
  if (c.s.twist !== "rival_buyer" || c.s.rival || c.s.conc < 2) return false;
  c.s.rival = true; c.twist("rival_buyer"); c.event("phone");
  c.say("rival1"); c.say("rival2"); c.say("rival3");
  return true;
}
function throwIn(c: Ctx) {
  if (c.s.thrown) return;
  c.s.thrown = true;
  c.say("throw_in_" + c.s.throwIn);
}
/** "$75,000, y es lo menos. Y le pongo llantas nuevas." */
function bestFinal(c: Ctx) {
  c.s.conc++;
  c.s.cur = FINAL(c);
  c.s.finalMade = true;
  c.say("best_final", P(c));
  throwIn(c);
  pendFinal(c, rival(c) ? "rival" : "final");
}
/** Her floor, at once ("Está bien. $72,500, y hoy mismo es suyo."): the loop guard and "¡Ni se le ocurra!". */
function finalNow(c: Ctx) {
  c.s.cur = FLOOR(c);
  c.s.finalMade = true;
  c.say("final_now", P(c));
  throwIn(c);
  pendFinal(c);
}
/** "¡Espere! Estaba pensando más bien en $72,500… Y le pongo… Si no me hace esperar." */
function waitCall(c: Ctx) {
  c.s.lastChance = true;
  c.s.cur = FLOOR(c);
  c.s.finalMade = true;
  c.say("wait_call", P(c));
  throwIn(c);
  c.say("if_wait");
  pendFinal(c);
}
function firm(c: Ctx) {
  c.say("firm", P(c));
  pendFinal(c);
}
/** Eight moves without a deal: her floor, and the decision. */
function guard(c: Ctx) {
  if (c.s.outcome || c.s.guarded || c.s.moves < 8 || c.s.cur <= FLOOR(c)) return;
  c.s.guarded = true;
  finalNow(c);
}

function flexYes(c: Ctx) {
  c.s.flexed = true;
  concede(c, nextRung(c) ?? FINAL(c), "flex_yes");
}

/** The offer rule (the learner names a number). */
function offer(c: Ctx, q: number, cash: boolean) {
  startTalk(c);
  c.s.offered = true;
  c.s.moves++;
  if (cash) cashLever(c, true);
  if (q < 50000) { c.say("lowball"); c.say("lowball2"); c.tip(TIPS.lowball); c.s.finalMade ? pendFinal(c) : pendPrice(c); guard(c); return; }
  if (c.s.lastQ && q < c.s.lastQ) { c.say("backwards"); c.s.finalMade ? pendFinal(c) : pendPrice(c); guard(c); return; }
  c.s.lastQ = q;
  const cur = c.s.cur as number;
  if (q > cur) { c.say("over_pay", P(c)); dealAt(c, cur, false); return; }
  if (q === cur) { dealAt(c, cur); return; }
  if (q >= FLOOR(c) && (q >= cur - STEP || c.s.conc >= 3)) { dealAt(c, q); return; }
  const nx = c.s.finalMade ? null : nextRung(c);
  if (nx !== null && nx > q) {
    if (nx <= FINAL(c)) bestFinal(c);
    else if (echoable(q) && c.chance(0.45)) concede(c, nx, "counter_echo", { amount: q * 100 });
    else concede(c, nx, "counter");
    guard(c);
    return;
  }
  if (nx !== null) { dealAt(c, q); return; }
  firm(c);
  guard(c);
}

/** A deal at `price`. `line`: her agreement line ("¡Vendido!", or the full-price wink). */
function dealAt(c: Ctx, price: number, line = true) {
  if (c.s.outcome) return;
  c.s.outcome = "deal";
  c.s.dealPrice = price;
  c.s.cur = price;
  if (line) {
    if (price === ASK && !c.s.conc && !c.s.offered) c.say("deal_full", P(c));
    // (no echo of the learner's own "Me parece bien" or "¡Trato hecho!")
    else {
      const h = heard(c);
      const ids = ["deal_sold", "deal_deal", "deal_yes"].filter((x) => !(x === "deal_deal" && /trato hecho/.test(h)) && !(x === "deal_yes" && /me parece bien/.test(h)));
      c.say(c.pick(ids));
    }
  }
  if (turnSegments(c).some((s) => s.intent === "shake")) { c.s.shaken = true; c.event("handshake"); return; }
  c.say("shake_on_it");
  c.expect({ id: "shake", optional: true, expects: ["shake", "accept_deal", "accept_ctx"], suggest: [{ lt: "Shake hands", hint: "shake" }], hints: ["shake"],
    on: { shake: (cc) => { shakeHands(cc); }, accept_deal: (cc) => { shakeHands(cc); }, accept_ctx: (cc) => { shakeHands(cc); }, g_ok: (cc) => { shakeHands(cc); }, g_thanks: (cc) => { shakeHands(cc); } },
    yes: (cc) => shakeHands(cc), no: (cc) => shakeHands(cc) });
}
function shakeHands(c: Ctx) {
  if (c.s.shaken) return;
  c.s.shaken = true;
  c.event("handshake");
}

/** Cash: $2,500 off once (never below her floor). `silent`: part of an offer ("setenta, en efectivo"). */
function cashLever(c: Ctx, silent: boolean) {
  c.s.cash = true;
  if (!silent) startTalk(c);
  if (c.s.cashUsed) { if (!silent) { c.say("cash_ack"); pendNow(c); } return; }
  c.s.cashUsed = true;
  c.say("cash_ack");
  if (c.s.cur > FLOOR(c)) {
    c.s.cur = Math.max(FLOOR(c), c.s.cur - STEP);
    if (!silent) c.say("new_price", P(c));
  }
  if (!silent) pendNow(c);
}
const pendNow = (c: Ctx) => (c.s.finalMade ? pendFinal(c) : pendPrice(c));

const AC_WORDS = /\b(aire|clima|a ?c|minisplit)\b/;
/** "Pero el aire no sirve, así que…": $2,500 off every price, once (only with a known fault). */
function useFlaw(c: Ctx) {
  if (c.s.outcome) { c.say("ack"); return; }
  const h = heard(c);
  // (decided before her price changes: an offer in the same sentence answers)
  const withOffer = turnOffers(c).length > 0;
  const ac = AC_WORDS.test(h);
  const topic = ac ? "ac" : /\b(frenos?|direccion)\b/.test(h) ? "brakes" : "any";
  if (ac && flawPending(c)) { ensureArrived(c); fireFlaw(c); c.say("a_problems_flaw"); if (c.s.talked) pendNow(c); return; }
  // the AC works (no AC fault this visit), whatever else the drive showed
  if (ac && !c.s.flawKnown) { c.s.acOk = true; c.say("ac_fine"); if (c.s.talked) pendNow(c); return; }
  if (!c.s.flawKnown && !c.s.complained) { c.say("no_fault"); if (c.s.talked) pendNow(c); return; }
  if (c.s.flawUsed) {
    // the $2,500 was for the other fault (the brakes, then the AC): one discount for repairs, that's it
    const other = topic !== "any" && c.s.flawTopic !== "any" && topic !== c.s.flawTopic;
    c.s.flawAgain = other ? "limit" : "same";
    c.say(other ? "already_off_limit" : "already_off"); if (c.s.talked) pendNow(c); return;
  }
  if (!once(c, "flaw")) return;
  c.s.flawTopic = topic;
  startTalk(c);
  c.s.flawUsed = true;
  c.s.off = STEP;
  c.s.moves++;
  c.s.cur -= STEP;
  c.say("flaw_point");
  // with an offer in the same sentence, the offer answers ("…así que ¿me lo deja en setenta?")
  if (withOffer) return;
  c.say("new_price", P(c));
  pendNow(c);
}

/** After the deal, a price move gets "Quedamos en $80,000, ¿se acuerda?" (after a refusal, just "Muy bien."). */
function afterDeal(c: Ctx) {
  if (c.s.outcome !== "deal") { c.say("ack"); return; }
  if (sayable(c.s.dealPrice)) c.say("deal_price", { price: c.s.dealPrice * 100 }); else c.say("deal_done");
}

/** A polite (or blunt) no. Her last chance comes once ("¡Espere! …"); then the conversation ends. */
function walkAway(c: Ctx, rude: boolean) {
  if (c.s.outcome) return;
  if (!c.s.talked) {
    // leaving before any price talk: not the task (the scene can be played again)
    c.say(rude ? "rude_walk" : "walk_ok"); c.say("walk_ok2"); c.end();
    return;
  }
  c.s.moves++;
  if (rude) { c.say("rude_walk"); c.s.rude = (c.s.rude ?? 0) + 1; }
  if (c.s.cur > FLOOR(c) && !c.s.lastChance) { waitCall(c); return; }
  c.s.outcome = rude ? "walk_rude" : "walk";
  if (!rude) c.say("walk_ok");
  c.say("walk_ok2");
}

// ---------------------------------------------------------------------------
// Paying and the goodbye

/** The ways to pay, once; then a short "¿cómo le hacemos?" (no line twice in a row). Without cash, cash isn't offered. */
function payOptions(c: Ctx) {
  if (!c.s.optionsSaid) { c.s.optionsSaid = true; c.say(c.s.cash === false ? "pay_no_cash" : "pay_options"); } else c.say("pay_reask");
  c.s.payAsked = "how";
  c.hold();
}
function paid(c: Ctx, line: string, method: string) {
  if (c.s.paid) { c.say("ack"); return; }
  c.s.paid = true;
  c.s.payMethod = method;
  // after her own "En efectivo, como dijo, ¿verdad?" no surprised "¿En efectivo?"
  c.say(line === "pay_cash_r" && c.s.payAsked === "cash" ? "pay_cash_ok" : line);
  c.event("pay", { method });
}
/** Leaving after the deal (or after a refusal): her last words, once. */
function closeBye(c: Ctx) {
  if (!once(c, "closed")) return;
  c.say(c.s.outcome === "deal" ? "bye_deal" : "see_around");
  c.end();
}

// Automatic answers the simulations use for Margarita's optional questions.
const AUTO: Record<string, string> = {
  arrive: "¡Hola! Vengo por el carro.", look: "No, es todo, gracias.", drive: "No hace falta. Confío en usted.",
  drive_q: "No hace falta. Confío en usted.", opinion: "Se maneja muy bien.", flaw: "No pasa nada.",
  talk: "Bueno… hablemos de números.", haggle: "Estaba pensando más bien en setenta mil.", offer: "¿Me lo deja en setenta mil?",
  price: "Me parece bien.", final: "Me parece bien.", confirm: "Sí.", shake: "Démonos la mano.",
  pay: "Le pago en efectivo.", howareyou: "Bien, gracias. ¿Y usted?",
};

const TIPS: Record<string, Tip> = {
  blunt_expensive: { key: "blunt_expensive", lt: "Understood! “¡Está carísimo!” sounds blunt to a seller who loves her car. A softer way: say it's a bit more than you wanted to spend.", better: "Se me hace un poco caro." },
  blunt_no: { key: "blunt_no", lt: "Understood! Even when you say no, a polite tone keeps the door open: say you're sorry and thank her for her time.", better: "Lo siento, sigue siendo más de lo que puedo gastar. Gracias por su tiempo." },
  lowball: { key: "lowball", lt: "Understood! An offer that low can offend the seller and end the talk before it starts. Offer something realistic and come up step by step.", better: "¿Me lo deja en setenta mil?" },
  rude_car: { key: "rude_car", lt: "Understood! Running down a car its owner loves is a poor way to haggle. Admit its good points and mention the faults gently.", better: "Es muy bonito, pero no es nuevo." },
  km: { key: "km", lt: "Understood! Mexico measures distance in kilometers, so ask about kilómetros (or el kilometraje).", better: "¿Cuántos kilómetros tiene?" },
  tu_staff: { key: "tu_staff", lt: "Understood! With a seller you've just met, usted is more polite: ¿Me lo deja…?, ¿Puede…? (the tú forms are for friends).", better: "¿Me lo deja en setenta mil?" },
};

// ---------------------------------------------------------------------------
// Handlers (shared with the pending questions)

const H: Record<string, Handler> = {
  // --- arriving ---
  about_ad(c) {
    if (!arrive(c)) return;
    // "¿Todavía está en venta?" gets its answer first (rule 11)
    if (/\b(venta|disponible|vendiendo|vende)\b/.test(heard(c)) && /\?\s*$/.test(c.heard)) c.say("still_yes");
    c.say("maggie_name");
  },
  my_name(c) { H.im_name_ctx(c, {}, { intent: "im_name_ctx", slots: {}, tags: [] }); },
  vocative(c) {
    if (/^\s*(hola|buenas|buenos dias|buenas tardes|buenas noches)\b/.test(heard(c)) && once(c, "hello") && !c.s.__greetedBack) { c.s.__greetedBack = true; c.say("g_hello"); }
  },
  im_name_ctx(c) {
    if (c.s.named) return;
    c.s.named = true;
    c.say("nice_name");
    if (arrive(c)) c.say("maggie_name");
  },
  weather(c) {
    if (!once(c, "weather")) return;
    c.say("weather_react");
    if (arrive(c)) c.say("maggie_name");
  },
  compliment_car(c) {
    // after the drive, praise answers "¿Qué le pareció?"
    if (c.s.drove && !c.s.opinion && c.step === "opinion") { H.drive_good(c, {}, { intent: "drive_good", slots: {}, tags: [] }); return; }
    if (!once(c, "compliment")) return;
    c.say("compliment_react");
    if (arrive(c)) c.say("maggie_name");
  },

  // --- questions about the car ---
  q_mileage(c) { answer(c, "mileage", "a_mileage"); },
  q_year(c) { answer(c, "year", "a_year"); },
  q_owners(c) { answer(c, "owners", "a_owners"); },
  q_owned(c) { answer(c, "owned", "a_since"); },
  q_paint(c) { answer(c, "paint", "a_paint"); },
  q_hood(c) { answer(c, "hood", "a_hood"); },
  q_accident(c) { answer(c, "accident", "a_accident"); },
  q_why(c) { answer(c, "why", "a_why"); },
  q_service(c) { answer(c, "service", "a_service"); },
  q_problems(c) {
    if (flawPending(c)) fireFlaw(c);
    answer(c, "problems", c.s.flawKnown ? "a_problems_flaw" : "a_problems_ok");
  },
  q_ac(c) {
    // after the disclosure, "¿Y el aire?" during the price talk is a lever
    if (c.s.flawKnown && c.s.talked && !c.s.flawUsed && !c.s.outcome) { useFlaw(c); return; }
    if (flawPending(c)) fireFlaw(c);
    answer(c, "ac", c.s.flawKnown ? "a_problems_flaw" : "ac_fine");
  },
  q_engine(c) { answer(c, "engine", "a_engine"); },
  q_gearbox(c) {
    // the car is a stick shift: "¿Es automático?" gets a no, "¿Es estándar?" a yes, "¿Automático o estándar?" neither
    const h = heard(c);
    const auto = /automat/.test(h), std = /estandar|manual/.test(h);
    answer(c, "gearbox", auto && !std ? "gear_no" : std && !auto ? "gear_yes" : "a_gearbox");
  },
  q_fuel(c) { answer(c, "fuel", "a_fuel"); },
  q_trunk(c) { answer(c, "trunk", "a_trunk"); },
  q_top(c) { answer(c, "top", "a_top"); },
  q_radio(c) { answer(c, "radio", "a_radio"); },
  q_tires(c) { answer(c, "tires", "a_tires"); },
  q_seats(c) { answer(c, "seats", "a_seats"); },
  q_papers(c) {
    const h = heard(c);
    // each question gets its own answer: "¿Debe tenencias?" a no, "¿Está al corriente?" a yes
    const line = /\b(debe|adeudos?|multas?|pendientes?|atrasad[oa]s?)\b/.test(h) ? "a_fees_no"
      : /factura/.test(h) && !/tarjeta|tenencia|refrendo/.test(h) ? "a_factura"
      : /tarjeta/.test(h) && !/factura/.test(h) ? "a_tarjeta"
      : /tenencia|refrendo|corriente|pagad|pagos/.test(h) ? "a_fees_yes"
      : /placas/.test(h) ? "a_plates"
      : /nacional|legal|regulariz|chocolate|agencia/.test(h) ? "a_national"
      : /repuve|numero de serie|robado/.test(h) ? "a_repuve" : "a_papers_all";
    answer(c, "papers", line);
  },
  q_mechanic(c) { answer(c, "mechanic", "a_mechanic"); },
  q_unknown(c) { answer(c, "unknown", "a_unknown"); },
  no_more_q(c) {
    if (c.s.talked || c.s.outcome) { c.say("ack"); return; }
    c.s.lookDone = true;
  },

  // --- the test drive ---
  test_drive(c) {
    if (c.s.outcome) { c.say("all_yours"); return; }
    if (c.s.drove) { c.say("drive_again"); return; }
    startDrive(c);
  },
  decline_drive(c) {
    if (c.s.drove || c.s.driveDeclined || c.s.outcome) { c.say("ack"); return; }
    ensureArrived(c);
    declineDrive(c);
  },
  drive_good(c) {
    if (!once(c, "opinion")) return;
    c.s.opinion = true;
    c.say("drive_good_react");
    afterOpinion(c);
  },
  drive_bad(c, _slots, seg) {
    if (!once(c, "opinion")) return;
    c.s.opinion = true;
    if (!seg.tags.includes("meh")) c.s.complained = true;
    c.say("drive_bad_react");
    afterOpinion(c);
  },
  flaw_ok_ctx(c) { c.say("glad_attitude"); },
  flaw_bad_ctx(c) { c.say("flaw_fair"); },

  // --- the price talk ---
  lets_talk(c) {
    if (!mainMove(c, "lets_talk")) return;
    if (c.s.outcome) { c.say("ack"); return; }
    tellPrice(c);
  },
  ask_price(c) {
    if (!mainMove(c, "ask_price")) return;
    if (c.s.outcome === "deal") { afterDeal(c); return; }
    if (c.s.outcome) { c.say("price_now", P(c)); return; }
    tellPrice(c);
  },
  ask_flex(c, _slots, seg) { flex(c, seg, "ask_flex"); },
  too_high(c, _slots, seg) { flex(c, seg, "too_high"); },
  make_offer(c, slots, seg) {
    // "¿Ochenta y cinco mil? No puedo.": her number said back with a no; the other piece answers
    if (echoOffer(c, seg)) return;
    if (!mainMove(c, seg.intent)) return;
    if (c.s.outcome) { afterDeal(c); return; }
    // "¿Ochenta mil? Mmm. ¿Qué tal setenta y siete quinientos?": the last number counts
    const offers = turnOffers(c).filter((s) => typeof s.slots.mxn === "number");
    const last = offers.at(-1) ?? seg;
    const q = (last.slots.mxn ?? slots.mxn) as number;
    // "¿Ochenta mil?" (her own price, or more, said back): an echo or a yes, and voice has no question mark (rule 10),
    // so the question again, never a sale; "Sí, ochenta mil" and "Ochenta mil, trato hecho" are a yes
    const alone = !turnSegments(c).some((s) => s !== seg && !SOFT.has(s.intent)) && (c as any).conv?.out?.parse?.yn !== "yes";
    if (offers.length <= 1 && alone && c.s.talked && q >= c.s.cur && seg.intent === "make_offer_ctx") { reask(c); return; }
    offer(c, q, offers.some((s) => s.tags.includes("cash")) || seg.tags.includes("cash"));
  },
  make_offer_ctx(c, slots, seg) { H.make_offer(c, slots, seg); },
  ask_better(c) {
    if (!mainMove(c, "ask_better")) return;
    if (c.s.outcome) { afterDeal(c); return; }
    startTalk(c);
    c.s.offered = true;
    c.s.moves++;
    better(c);
    guard(c);
  },
  ask_best(c, _slots, seg) {
    if (!mainMove(c, "ask_best")) return;
    if (c.s.outcome) { afterDeal(c); return; }
    startTalk(c);
    c.s.moves++;
    if (c.s.finalMade) { firm(c); guard(c); return; }
    const nx = nextRung(c);
    // "¿Es su mejor oferta?" – "Casi. Para usted: …"; "¿Cuál es su último precio?" – "¿Para usted? …"
    if (nx !== null && nx > FINAL(c)) concede(c, nx, seg.tags.includes("wh") ? "best_for_you" : "best_almost");
    else bestFinal(c);
    guard(c);
  },
  halfway(c) {
    if (!mainMove(c, "halfway")) return;
    if (c.s.outcome) { afterDeal(c); return; }
    startTalk(c);
    c.s.offered = true;
    c.s.moves++;
    if (!c.s.lastQ) { c.say("halfway_none"); pendOffer(c); return; }
    const mid = r1250((c.s.lastQ + c.s.cur) / 2);
    if (mid >= FLOOR(c)) { c.say("halfway_yes", { price: mid * 100 }); c.say("halfway_yes2"); dealAt(c, mid, false); return; }
    if (c.s.cur <= FLOOR(c)) { firm(c); guard(c); return; }
    c.s.cur = FLOOR(c);
    c.s.finalMade = true;
    c.say("halfway_low", P(c));
    throwIn(c);
    pendFinal(c);
  },
  cash_lever(c) {
    if (c.s.outcome === "deal") { H.pay_cash(c, {}, { intent: "pay_cash", slots: {}, tags: [] }); return; }
    if (c.s.outcome || !once(c, "cash")) return;
    // "Puedo pagar en efectivo. ¿Me lo deja en setenta?": the offer takes the cash into account
    if (turnOffers(c).length) { c.s.cash = true; return; }
    cashLever(c, false);
  },
  use_flaw(c) { useFlaw(c); },
  // "Está bien, gracias" (expected only at her price questions, whose own handler asks again)
  closing_ctx(c) {
    if (c.s.talked && !c.s.outcome) { reask(c); return; }
    c.say("ack");
  },
  sleep_on_it(c) {
    if (!mainMove(c, "sleep_on_it")) return;
    if (c.s.outcome) return;
    if (!c.s.talked) { c.say("sleep_ok"); c.say("walk_ok2"); c.end(); return; }
    c.s.moves++;
    if (c.s.sleepUsed || (c.s.cur <= FLOOR(c) && !c.s.rival)) {
      c.s.outcome = "walk";
      c.say("sleep_ok"); c.say("walk_ok2");
      return;
    }
    c.s.sleepUsed = true;
    if (c.s.rival) { c.say("sleep_dare"); c.say("sleep_dare2"); finalNow(c); return; }
    c.say("sleep_ok");
    waitCall(c);
  },
  accept_deal(c, _slots, seg) {
    if (c.s.outcome === "deal") { shakeHands(c); return; }
    // "Me parece bien, pero es un poco caro", "Si me hace un descuento, me lo llevo": no yes (rule 17). The push (or
    // the other piece) answers; a condition alone gets her question again
    if (!c.s.outcome && hedged(c)) { if (!otherPiece(c) && once(c, "move")) { if (c.s.talked) reask(c); else tellPrice(c); } return; }
    if (!mainMove(c, seg.intent) || c.s.outcome) return;
    // "¿Lo compro?" / "¿Me lo llevo?" (thinking aloud): the question again, never a sale (rule 17)
    if (c.s.talked && /\?\s*$/.test(c.heard) && /^\s*(y\s+)?(lo compro|me lo llevo|me lo quedo|se lo compro)\s*$/.test(heard(c).replace(/[¿?¡!.,]/g, ""))) {
      reask(c);
      return;
    }
    // "¡Quiero comprarlo!" as the first words: the price first; "¡Me lo llevo!" before the price talk: the price is
    // said and asked (rule 3: nothing binding before its terms), "Entonces… $85,000, ¿sin regatear?"
    if (!c.s.arrived) { tellPrice(c); return; }
    if (!c.s.talked) { startTalk(c); c.say("confirm_full", P(c)); pendConfirm(c); return; }
    dealAt(c, c.s.cur);
  },
  accept_ctx(c, slots, seg) {
    if (!c.s.outcome) {
      // "¿Lo puedo pagar con tarjeta?", "Lo puedo pagar en efectivo": how to pay, never a yes (that piece answers)
      if (/\b(lo|eso) (puedo|podria) pagar\b/.test(heard(c)) && turnSegments(c).some((s) => METHODS.has(s.intent))) return;
      // a question is no yes (rules 11, 17): "¿Es un precio justo?" is answered; "¿Va pues?", "¿Lo puedo pagar en
      // abonos?" and her own "¿Sin regatear?" said back get her question again
      if (/\?\s*$/.test(c.heard) && !otherPiece(c)) {
        if (!once(c, "move")) return;
        if (!c.s.talked) { tellPrice(c); return; }
        if (/\b(justo|buen precio|razonable)\b/.test(heard(c))) c.say("fair_price");
        reask(c);
        return;
      }
    }
    // "Me parece bien." to the asking price nobody has haggled over: "Entonces… $85,000, ¿sin regatear?"
    if (c.s.talked && !c.s.outcome && c.s.cur === ASK && !c.s.conc && !c.s.offered && !c.s.confirmAsked && !hedged(c)) {
      if (!mainMove(c, seg.intent)) return;
      c.say("confirm_full", P(c)); pendConfirm(c); return;
    }
    H.accept_deal(c, slots, seg);
  },
  shake(c) {
    if (c.s.outcome === "deal") { if (c.s.shaken && c.step === "pay") c.say("ack"); shakeHands(c); return; }
    if (c.s.talked) H.accept_deal(c, {}, { intent: "accept_deal", slots: {}, tags: [] });
    else c.say("ack");
  },
  walk_away(c) {
    if (!mainMove(c, "walk_away")) return;
    walkAway(c, false);
  },
  walk_rude(c) {
    if (!mainMove(c, "walk_rude")) return;
    walkAway(c, true);
  },
  rude_car(c) {
    if (!once(c, "rude_car")) return;
    ensureArrived(c);
    c.say("rude_car");
  },

  // --- paying ---
  pay_cash(c) {
    if (c.s.outcome !== "deal") { H.cash_lever(c, {}, { intent: "cash_lever", slots: {}, tags: [] }); return; }
    paid(c, "pay_cash_r", "cash");
  },
  pay_transfer(c) {
    if (c.s.outcome !== "deal") { c.say("pay_later"); return; }
    paid(c, "pay_transfer_r", "transfer");
  },
  pay_check(c) {
    if (c.s.outcome !== "deal") { c.say("pay_later"); return; }
    // a personal cheque ("¿Le doy un cheque?"): she'd rather have a cheque de caja
    paid(c, /\b(caja|certificado)\b/.test(heard(c)) ? "pay_check_r" : "pay_check_personal", "check");
  },
  no_cash(c) {
    const before = c.s.cash;
    c.s.cash = false;
    // "No quiero pagar en efectivo, mejor por transferencia": the other way answers (rule 18)
    if (turnSegments(c).some((s) => s.intent === "pay_transfer" || s.intent === "pay_check")) return;
    // the other ways once; said again, a short "¿cómo le hacemos?" (rule 8)
    if (c.s.outcome === "deal" && !c.s.paid) { if (before !== false) c.s.optionsSaid = false; payOptions(c); return; }
    c.say("ack");
  },
  pay_card(c) {
    if (turnSegments(c).some((s) => ["pay_cash", "pay_transfer", "pay_check"].includes(s.intent))) return;
    c.say("pay_card_no");
    if (c.s.outcome === "deal" && !c.s.paid) payOptions(c);
  },
  // "No, espere. ¿Me lo deja en setenta?": the offer answers; no "Tómese su tiempo" after it
  g_wait(c) {
    if (turnSegments(c).some((s) => MOVE[s.intent] && s.intent !== "g_wait")) return;
    // "No, espere." to "¿sin regatear?": the no answers ("Le toca. Hágame una oferta.")
    if ((c as any).conv?.out?.parse?.yn === "no" && c.s.talked && !c.s.outcome) { c.say("need_offer"); pendOffer(c); return; }
    c.say("g_take_time"); c.hold();
  },

  // --- thanks and goodbye ---
  pleasure(c) {
    if (c.s.outcome && c.s.__finished) { if (once(c, "closed")) { c.say("pleasure_too"); c.end(); } return; }
    if (!once(c, "pleasure")) return;
    c.say("you_too");
  },
  look_after(c) {
    if (c.s.outcome === "deal") {
      if (!once(c, "closed")) return;
      c.say("know_you_will");
      if (c.s.__finished) { c.say("bye_deal"); c.end(); }
      return;
    }
    c.say("ack");
  },
  thanks_so_much(c) { H.g_thanks(c, {}, { intent: "g_thanks", slots: {}, tags: [] }); },
  g_thanks(c) {
    if (happened(c, "move") || happened(c, "closed")) return;
    if (c.s.__finished && c.s.outcome) { closeBye(c); return; }
    if (!once(c, "thanks")) return;
    c.say("g_welcome");
  },
  g_bye(c) {
    if (happened(c, "move") || happened(c, "closed")) return;
    if (c.s.outcome === "deal" && !c.s.paid) { c.say("wait_pay"); c.say("ask_pay"); c.hold(); return; }
    if (c.s.outcome) { closeBye(c); c.hold(); return; }
    if (!c.s.talked) { once(c, "closed"); c.say("see_around"); c.end(); c.hold(); return; }
    once(c, "move");
    walkAway(c, false);
  },
  // "No sé." during the price talk: time to think (the suggestions show what to say); otherwise the current step's
  // help, as everywhere
  g_dontknow(c) {
    if (c.s.talked && !c.s.outcome) { c.say("g_take_time"); c.hold(); return; }
    const st = usedCar.steps.find((x) => x.id === c.step);
    if (st?.help) st.help(c); else c.say("g_take_time");
    c.hold();
  },
  g_ok(c) {
    // "Muy bien." after a question answered, or "¡Genial!" after the drive
    if (c.step === "opinion" && c.s.drove && !c.s.opinion) H.drive_good(c, {}, { intent: "drive_good", slots: {}, tags: [] });
  },
};

/** "¿El precio es negociable?" / "Se me hace un poco caro.": her first step down, else "¿Qué tenía en mente?" */
function flex(c: Ctx, seg: Segment, intent: string) {
  if (!mainMove(c, intent)) return;
  if (c.s.outcome) { afterDeal(c); return; }
  startTalk(c);
  c.s.moves++;
  if (seg.tags.includes("tip:blunt_expensive")) c.say("rude_expensive");
  if (seg.tags.includes("rude")) c.say("rude_generic");
  if (c.s.finalMade) { firm(c); guard(c); return; }
  if (!c.s.flexed && !c.s.conc) { flexYes(c); guard(c); return; }
  if (!c.s.lastQ) { c.say("flex_what"); pendOffer(c); guard(c); return; }
  better(c);
  guard(c);
}
/** "¿Me lo puede dejar en menos?": one step down (or her lowest); asked again, "Le toca." */
function better(c: Ctx) {
  if (c.s.finalMade) { firm(c); return; }
  if (c.s.cur === ASK) { flexYes(c); return; }
  // asked again: "Le toca." (unless the loop guard names her floor now)
  if (c.s.betterUsed) { if (c.s.moves >= 8 && !c.s.guarded && c.s.cur > FLOOR(c)) return; c.say("better_no"); pendPrice(c); return; }
  c.s.betterUsed = true;
  const nx = nextRung(c);
  if (nx !== null && nx > FINAL(c)) concede(c, nx, "better_drop");
  else bestFinal(c);
}

// ---------------------------------------------------------------------------

export const usedCar: SituationDef = {
  id: "p25-used-car",
  song: "P25",
  songTitle: "What If We Met Halfway",
  title: { en: "¿Y si lo dejamos en…?", lt: "What If We Met Halfway?" },
  topic: { en: "Regatear por un carro usado", lt: "Haggling over a used car" },
  chapter: 8,
  order: 1,
  location: "cedar-lane",
  npc: "maggie",
  goal: "Look the convertible over and haggle for a good price, or say no politely.",
  intro: "You saw an ad online: a red 2008 convertible for 85,000 pesos. Now you're on Calle de los Cedros, in Doña Margarita's driveway, and the car is shining in the sun. Look it over, take it for a drive and try to get the price down, but politely: Margarita loves her car.",

  grammar: {
    macros: {
      carn: "(carro | auto | coche | convertible | vehiculo | automovil | carrito | descapotable)",
      car: "(el @carn | su @carn | este @carn | esta belleza)",
      ad: "(anuncio | aviso | publicacion | letrero | anuncio en internet)",
      money: "[como | unos | mas o menos | digamos | solo | solamente | nomas] {mxn} [en efectivo #cash | cash #cash]",
      // an explicit amount: "solo tengo dos preguntas" is no offer
      bigmoney: "[como | unos | mas o menos | solo | solamente | nomas] {mxn:mxnx} [en efectivo #cash]",
      ac: "(aire acondicionado | aire | clima | a c | minisplit)",
      poco: "(un poco | un poquito | algo | tantito | medio | bastante)",
      leave: "(me lo deja | lo deja | me lo dejaria | lo dejaria | me lo puede dejar | lo puede dejar | me lo podria dejar | lo podria dejar | me lo vende | me lo venderia | se lo dejo)",
    },
    slots: { mxn: { fn: mxnSlot }, mxnx: { fn: mxnStrictSlot }, pname: { fn: pnameSlot }, qthing: { fn: qThingSlot } },
  },

  intents: {
    // --- arriving -------------------------------------------------------------------------
    about_ad: { patterns: [
      "vi su @ad [en internet | en facebook | en marketplace | el sabado | ayer | en el periodico] #h:saw_ad",
      "vi (el | un) @ad [del @carn] [en internet | en facebook | en marketplace | el sabado | ayer | en el periodico]",
      "(vengo | vine | venimos) (por | para) (el | su) (@carn | @ad) [que (vende | esta vendiendo | anuncio | esta en venta | tiene en venta) | en venta | del @ad] #h:about_ad",
      "(vengo | vine) a ver (el | su | este) @carn [que vende | en venta | del @ad]",
      "(todavia | aun) (esta | sigue) (en venta | disponible) [el | su] [@carn] #h:still_for_sale",
      "[el | su] @carn (todavia | aun | sigue) (esta en venta | en venta | disponible | esta disponible)",
      "(sigue | todavia esta | aun esta) (en venta | disponible) [el | su] [@carn]",
      "(todavia | aun) (vende | esta vendiendo) (el | su) @carn", "(esta | sigue) vendiendo (el | su) @carn", "(usted | aqui) (vende | esta vendiendo | venden) (el | su | este) @carn",
      "(esta | sigue) a la venta [el | su | este] [@carn]", "me interesa (comprar | ver) (el | su | este) @carn",
      "(le | te #tip:tu_staff) (llamé | escribí | mandé un mensaje | hablé) [por telefono | por whatsapp] [ayer | hoy] [por el (@carn | @ad)]",
      "hablamos por telefono [ayer | hoy | esta manana]", "tengo una cita para ver el @carn",
      "(me interesa | estoy interesado en | estoy interesada en) (el | su | este) @carn", "(estoy | estamos) (interesado | interesada | interesados) [en el @carn]",
      "(quisiera | me gustaria | quiero) ver (el | su | este) @carn", "(puedo | podria) ver (el | su | este) @carn",
      "(busco | estoy buscando | ando buscando) un @carn [usado | barato | convertible | bueno] [y vi su @ad]",
      "(este | es) es el @carn (del @ad | que vende | en venta)", "es este el @carn (del @ad | que vende)",
      "(usted es | es usted) (la duena | la que vende el @carn | dona margarita | la senora margarita)",
      "[si] (por | para) el (@carn | @ad | convertible)", "[si] el @carn [del @ad]", "[si] por el @carn que vende",
      "[si] (el | su) @carn (que vende | en venta | del @ad)",
    ] },
    my_name: { patterns: ["(me llamo | mi nombre es) {name} #h:my_name"] },
    // "Hola, Doña Margarita": her name, not the learner's
    vocative: { patterns: ["(dona margarita | margarita | senora margarita)"] },
    // (pname: the player's name, never "Soy nuevo aquí" or "Soy de Canadá")
    im_name_ctx: { patterns: ["soy {name:pname} #h:im_name", "yo soy {name:pname}", "[hola] soy {name:pname} mucho gusto"] },
    compliment_car: { patterns: [
      "los asientos se ven (muy bien | increibles | nuevos | perfectos | bien | super bien) #h:seats",
      "(los asientos | el color | la pintura | el interior | los rines | el techo | el @carn) se (ve | ven) (muy bien | increible | increibles | nuevo | nuevos | perfecto | impecable | bonito | precioso | bien)",
      "es una (belleza | joya | chulada | maravilla) #h:beauty", "que (belleza | joya | chulada | maravilla)",
      "(es | esta) (precioso | preciosa | hermoso | hermosa | bellisimo | bonito | muy bonito | lindo | muy lindo | impecable | padrisimo | muy padre | espectacular | increible)",
      "(el @carn | su @carn | este @carn) (es | esta) (precioso | hermoso | bonito | muy bonito | lindo | impecable | espectacular | increible)",
      "que (bonito | lindo | hermoso | precioso | buen | padre) [@carn | color | convertible]",
      "(que | un) @carn tan (bonito | lindo | bonito)", "me (encanta | gusta) [mucho] (el color | el @carn | los asientos | el rojo | su @carn | este @carn)",
      "(se ve | luce) (muy bien | nuevo | como nuevo | increible | impecable | precioso) [para su edad]",
      "(esta | se ve) (muy limpio | impecable | como nuevo | en muy buen estado | en buen estado | en excelente estado | muy bien cuidado | bien cuidado)",
      "(wow | guau | ay) que (belleza | bonito | carrazo)", "(que | vaya) carrazo", "rojo cereza es mi color favorito",
    ] },
    // "¡Qué buen día!": small talk about the day (never a compliment to the car, never a name)
    weather: { patterns: [
      "que (bonito | buen | lindo | hermoso) dia [hace | hoy]", "(hace | que) [mucho] (calor | sol | buen tiempo) [hoy]",
      "(esta | hace) un dia (precioso | perfecto | bonito | hermoso)", "(hace | esta haciendo) (un calor | un solazo | un dia) (tremendo | precioso | perfecto)",
    ] },

    // --- questions about the car -------------------------------------------------------------
    q_mileage: { patterns: [
      "[me (puede | podria) decir | me puedes decir #tip:tu_staff | sabe] cuantos (kilometros | km | kms) (tiene | lleva | ha recorrido | ha hecho | marca) [el @carn] #h:q_miles", "cuantos kilometros",
      "(cuanto | que) kilometraje (tiene | lleva | marca | trae) [el @carn]", "cuanto (ha recorrido | ha rodado | tiene de kilometraje)",
      "(tiene | trae) (mucho | poco) kilometraje", "(y | que tal | como esta) el kilometraje", "el kilometraje es (alto | bajo | original)",
      "(que | cuanto) marca el (odometro | tablero | kilometraje)",
      "cuantas millas (tiene | lleva) [el @carn] #tip:km", "(y | que tal) las millas #tip:km",
    ] },
    q_year: { patterns: [
      "(de que ano | que ano | que modelo | de que modelo) es [el @carn]", "(que | cuantos) anos tiene [el @carn]", "es (modelo 2008 | un 2008 | del 2008 | 2008)",
      "(que tan viejo | que tan nuevo | que tan antiguo) es [el @carn]", "(de que ano | que ano) es el modelo", "(cual es el | que) modelo",
    ] },
    q_owners: { patterns: [
      "cuantos duenos (ha tenido | tuvo | tiene) [el @carn]", "cuantos duenos", "(usted es | es usted) la (primera | unica) duena",
      "quien lo tenia antes [que usted]", "(es | fue) de primera mano", "(cuantas personas | quien mas) lo (han tenido | ha tenido | tuvieron)",
      "es (de segunda | de segunda mano | de tercera mano)",
    ] },
    q_accident: { patterns: [
      "(ha tenido | tuvo | tiene) (algun | un) (choque | accidente | golpe) #h:q_accident", "(lo han | ha) chocado [alguna vez]",
      "(esta | ha estado) chocado", "(tiene | ha tenido) (golpes | choques | algun golpe | algun choque)", "(alguna vez | nunca) (ha chocado | lo han chocado | ha tenido un choque)",
      "(ha estado | estuvo) en (un | algun) (choque | accidente)", "(y | algun) choque",
    ] },
    q_owned: { patterns: [
      "(desde cuando | cuanto tiempo) lo (tiene | ha tenido)", "(hace cuanto | cuando) lo (compró | compro)", "cuanto tiempo (tiene con el | lleva con el)",
    ] },
    q_paint: { patterns: [
      "(es | tiene) la pintura original", "(lo han | lo ha) pintado", "(la pintura | el color) es original", "lo (pintaron | pintó | repintaron)",
      "(es | esta) (repintado | pintado)",
    ] },
    q_hood: { patterns: [
      "(puedo | podria) ver el motor", "(puede | podria | me puede | me podria) abrir el (cofre | capo | capot)",
      "(puedo | podria) (abrir | revisar) el (cofre | capo | capot)", "(puedo | podria) ver (debajo del | bajo el) (cofre | capo)", "(abramos | abra) el (cofre | capo)",
    ] },
    q_why: { patterns: [
      "por que lo vende #h:q_why", "por que (lo esta vendiendo | lo quiere vender | vende el @carn | vende su @carn | se deshace de el)",
      "(y | pero) por que lo (vende | quiere vender)", "por que (vende | vendes #tip:tu_staff) (el | su | tu) @carn", "(cual es el motivo | que motivo hay) [de la venta | para venderlo]",
    ] },
    q_service: { patterns: [
      "(tiene | trae) (los registros | el historial | las facturas | los comprobantes | la bitacora) de (servicio | servicios | mantenimiento | los servicios) #h:q_service",
      "(le han hecho | le hizo | le hacia | le hace | tiene) (sus | los | el) (servicios | servicio | mantenimiento) [a tiempo | en agencia]",
      "(tiene | lleva | trae) (el | su | los) (servicio | servicios | mantenimiento) al (dia | corriente)",
      "(cada cuando | cuando) (le hizo | le hace | le hacia) (el | su) servicio", "(cuando | cuando fue) (fue el ultimo | el ultimo) servicio",
      "(le cambió | le cambio | le ha cambiado) el aceite",
    ] },
    // the papers of a Mexican car sale (the brief)
    q_papers: { patterns: [
      "(tiene | trae) (los | todos los) (papeles | documentos) [en regla | en orden] #h:q_papers", "(los papeles | los documentos) (estan | estan todos) en (regla | orden)",
      "(tiene | trae) la factura [original]", "(es | tiene) factura (original | de agencia)", "(y | que tal) la factura",
      "(tiene | trae) la tarjeta de circulacion [vigente]", "(esta vigente | sigue vigente) la tarjeta de circulacion",
      "(esta | lo tiene) al corriente (con | en) (la tenencia | el refrendo | los pagos | las tenencias | los refrendos) #h:q_fees",
      "(esta | estan) (pagada | pagado | pagados | pagadas) (la tenencia | el refrendo | las tenencias | los refrendos)", "(la tenencia | el refrendo) (esta | estan) (pagada | pagado | al corriente)",
      "(debe | tiene) (tenencias | refrendos | adeudos | multas | algun adeudo | alguna multa)", "(y | que tal) (la tenencia | el refrendo)",
      "(tiene | trae) (placas | sus placas | las placas) [de aqui]", "(es | esta) (nacional | legal | legalizado | regularizado)", "es (chocolate | carro chocolate)",
      "(lo | puedo) (checar | revisar | consultar) en (el repuve | repuve)", "(tiene | trae) el numero de serie",
      "(las placas son | son las placas | son sus placas) de aqui", "es (de agencia | de agencia mexicana)",
      "(tiene | debe) (tenencias | refrendos | adeudos | multas | pagos) (pendientes | atrasados | atrasadas)", "(hay | tiene) (algo | algun pago | algun adeudo) pendiente",
    ] },
    q_problems: { patterns: [
      "(tiene | le ha dado | le da) (algun | algún) (problema | falla | detalle) #h:q_problems", "(tiene | hay) (algun detalle | algo que deba saber | algo malo)",
      "(le falla | falla) algo", "que (problemas | fallas | detalles) tiene", "tiene (detalles | fallas | problemas)", "(tiene | trae) (algun | algún) (problema | detalle) mecanico",
      "no tiene (ningun problema | ninguna falla | ningun detalle | problemas | fallas)",
    ] },
    q_ac: { patterns: [
      "(funciona | sirve | jala | enfria) el @ac", "el @ac (funciona | sirve | jala | enfria) [bien]", "(tiene | trae) @ac", "(y | que tal) el @ac",
      "(el | y el) @ac (si | sí) (funciona | sirve)",
    ] },
    q_engine: { patterns: [
      "(como | que tal) (esta | anda) el motor", "(y | que tal) el motor", "(el motor | la maquina) (esta | anda) bien", "(cuantos | de cuantos) cilindros (es | tiene)",
    ] },
    q_gearbox: { patterns: [
      "es (automatico | estandar | manual)", "(es | tiene) (transmision | caja) (automatica | estandar | manual)", "(automatico | estandar | manual) o (estandar | automatico | manual)",
      "(que | cual) (transmision | caja) tiene", "es de (velocidades | cambios)",
    ] },
    q_fuel: { patterns: [
      "cuanto (gasta | consume) [de gasolina] #h:q_fuel", "(gasta | consume | come) mucha gasolina", "cuantos kilometros (hace | rinde | da) por litro",
      "(como | que tal) (esta | anda) de (gasolina | consumo)", "es (ahorrador | economico) [de gasolina]", "(cuanto | que tanto) rinde [la gasolina]",
      "(gasta | consume) mucho",
    ] },
    q_trunk: { patterns: [
      "(es | que tan) grande (es | la) (cajuela | maletero | baul)", "(es grande | que tan grande es) la (cajuela | maletero | baul)",
      "(como | que tal) es (la cajuela | el maletero | el baul)", "(cuanto | que) cabe en (la cajuela | el maletero | el baul)", "(tiene | hay) (cajuela | maletero | baul)",
      "(y | que tal) (la cajuela | el maletero)",
    ] },
    q_top: { patterns: [
      "(como | como se) (baja | abre | quita) (el techo | la capota | el toldo)", "(funciona | sirve) (el techo | la capota | el toldo)",
      "(el techo | la capota) (es electrico | es electrica | es automatico | funciona bien | baja bien)", "(y | que tal) (el techo | la capota | el toldo)",
      "(puedo | podemos) bajar (el techo | la capota)",
    ] },
    q_radio: { patterns: ["(funciona | sirve) el (radio | estereo)", "(tiene | trae) (radio | estereo)", "(y | que tal) el (radio | estereo)", "el (radio | estereo) (funciona | sirve)"] },
    q_tires: { patterns: [
      "(como | que tal) (estan | andan) las (llantas | neumaticos | ruedas | gomas)", "las (llantas | neumaticos | ruedas) (son | estan) nuevas", "(son | estan) nuevas las (llantas | ruedas)",
      "(y | que tal) las (llantas | ruedas | neumaticos)", "(hay que | tengo que) cambiar las llantas",
    ] },
    q_seats: { patterns: ["(son | los asientos son) originales [los asientos]", "(y | que tal) los asientos", "los asientos (estan | son) (originales | bien)"] },
    q_mechanic: { patterns: [
      "(lo | la) puedo llevar (con | a) (mi | un) (mecanico | taller)", "(puedo | podria | le molesta si) (llevarlo | lo llevo) (con | a) (mi | un) (mecanico | taller)",
      "(mi | un) mecanico (lo puede | puede) revisar", "(puede | podria) revisarlo (mi | un) mecanico",
      "(lo | la) (podemos | puedo | podria) llevar a revisar", "(podemos | puedo | podria) llevarlo a revisar",
      "(me deja | me dejaria | me permite) llevarlo (con | a) (mi | un) (mecanico | taller)", "(lo | puedo) (revisar | checar) con (mi | un) mecanico",
    ] },
    q_unknown: { patterns: [
      "(tiene | trae) [un | una | el | la] {w:qthing}", "(y | que tal) (el | la | los | las) {w:qthing}",
      "(funciona | sirve) [el | la] {w:qthing}", "[el | la] {w:qthing} (funciona | sirve | es original)",
    ] },
    no_more_q: { patterns: [
      "[no] (es todo | eso es todo) [por ahora]", "[no] creo que (es todo | eso es todo)", "[no] (no tengo | ya no tengo) (mas | otras) preguntas", "[no] (no tengo | ya no tengo) preguntas",
      "[no] (ninguna | ninguna pregunta | ninguna otra pregunta)", "[no] nada mas", "[no] ya vi (suficiente | todo | lo que necesitaba)",
      "[no] (asi | ya) estoy bien", "[no] sin preguntas", "[no] (con eso | asi) (tengo | es) suficiente",
    ] },

    // --- the test drive ------------------------------------------------------------------------
    test_drive: { patterns: [
      "(puedo | podria | se puede) darle una vuelta [a la manzana | a la cuadra | por la cuadra] #h:round_block",
      "le (puedo | podria) dar una vuelta [a la manzana | a la cuadra]",
      "(puedo | podria | se puede) hacer una prueba de manejo #h:test_drive", "(lo | la) (puedo | podria) (manejar | probar | conducir) [primero] #h:drive_first",
      "(puedo | podria | se puede) (manejarlo | probarlo | conducirlo | manejar | probar) [@car] [primero] [un poco | tantito]",
      "(me deja | me dejaria | me permite) (manejarlo | probarlo | conducirlo | darle una vuelta)",
      "[si] (me gustaria | quisiera | quiero | me encantaria) (manejarlo | probarlo | conducirlo | hacer una prueba de manejo | darle una vuelta) [primero] [un rato | un poco | tantito]",
      "(una | y una | que tal una | podemos hacer una) prueba de manejo", "[si] (vamos a dar | demos | damos) una vuelta",
      "(lo | me lo) (llevo | saco) a dar una vuelta", "(claro | si) le doy una vuelta", "[si] le doy una vuelta [a la manzana]",
      "[si] me encantaria (manejarlo | probarlo | darle una vuelta)",
    ] },
    decline_drive: { patterns: [
      "[no] no hace falta [confio en usted | le creo] #h:trust", "[no] no hace falta (manejarlo | probarlo | la prueba | dar una vuelta)", "confio en usted", "[no] le creo",
      "[no] no (necesito | quiero) (manejarlo | probarlo | una prueba de manejo | dar una vuelta)", "(prefiero | mejor) no (manejarlo | probarlo)",
      "[no] no es necesario", "(tal vez | quizas | a lo mejor) (despues | luego | mas tarde | al rato)", "(ahorita | ahora) no", "(despues | luego | mas tarde | al rato)",
      "mejor no",
    ] },
    drive_good: { patterns: [
      "(se maneja | maneja | anda | corre | jala) (muy bien | super bien | de maravilla | como un sueno | perfecto | bien | increible | suavecito | muy suave | bonito) #h:drives_nicely",
      "me (encantó | gustó) [mucho | muchisimo] [manejarlo | como se maneja | el manejo]", "me (encanta | gusta) como se maneja",
      "(fue | estuvo) (increible | padrisimo | muy divertido | genial | buenisimo | muy bueno | super)", "(esta | se siente) (muy bien | super bien | en buen estado | suave | muy suave)",
      "(el motor | los frenos | la direccion | la caja) (suena | se siente | se sienten | suenan | esta | estan) (bien | muy bien | perfecto | perfectos)",
      "(si | sí) me robó el corazon", "me robó el corazon", "que (buen | bonito | rico) (manejo | paseo)", "(muy | super) suave", "no esta mal", "esta en buen estado",
    ] },
    drive_bad: { patterns: [
      "los frenos (se sienten | estan | se sentian | estaban) [@poco] (suaves | flojos | blandos | gastados) #h:brakes_soft",
      "(hace | hacia | tiene) un ruido (raro | extrano | feo)", "(suena | sonaba) (raro | feo | extrano)", "(se jala | jala | se va | se iba) (a la | hacia la) (izquierda | derecha)",
      "la (direccion | caja | transmision | clutch | embrague) (esta | se siente | se sentia) [@poco] (dura | rara | floja)", "los frenos (necesitan | ocupan) (servicio | revision | un ajuste | trabajo)",
      "(huele | olia) (raro | a quemado)", "(note | senti) (algo raro | un ruido)",
      "(no esta mal | esta bien | se maneja bien | me gusto | bien) pero (hace | tiene) un ruido (raro | extrano | feo)",
      "(no esta mal | esta bien | se maneja bien | me gusto | bien) pero los frenos (se sienten | estan) [@poco] (suaves | flojos | blandos | gastados)",
      // lukewarm: no fault to use later
      "(regular | mas o menos | normalito | nada especial) #meh", "(esta | estuvo) (regular | normal | mas o menos) #meh",
    ] },
    flaw_ok_ctx: { patterns: [
      "no necesito (@ac | el @ac)", "(me gusta | prefiero) el aire fresco", "(quien necesita | para que quiero) (@ac | el @ac)", "es convertible",
      "no (es | hay) (problema | ningun problema | gran cosa)", "no pasa nada [es convertible]", "(puedo vivir | vivo) con eso", "no se preocupe",
    ] },
    flaw_bad_ctx: { patterns: [
      "(eso | es) (un problema | malo | una lastima | mala noticia)", "(ay | uy) no", "que (mal | lastima | pena)", "(ay | uy) que (lastima | mal)", "eso no esta bien",
    ] },

    // --- the price talk -------------------------------------------------------------------------
    lets_talk: { patterns: [
      "[bueno | a ver | primero | mejor] (hablemos | vamos a hablar) (de numeros | de dinero | del precio | de negocios) #h:lets_talk", "[bueno | a ver] hablemos",
      "(podemos | quiere) hablar (del precio | de dinero | de numeros)", "(vamos a | podemos) negociar [el precio]",
      "(quiero | me gustaria) hablar del precio", "(hablamos | hablemos) del precio",
    ] },
    ask_price: { patterns: [
      "cuanto (pide | quiere | cuesta | es | vale | sale | cobra) [por @car | por el | por el] [entonces | ahora]",
      "(en cuanto | cuanto) lo (vende | da | deja)", "(cual es | que) precio (tiene | pide) [el @carn]", "cual es (el | su) precio [ahora]",
      "(y | entonces) cuanto [es | pide]", "(y | entonces) el precio", "cuanto le costó", "(sigue | todavia esta | todavia es) en {mxn}", "el @ad (decia | dice) {mxn}",
      "cuanto (pide | quiere) por el", "(y | que tal) (lo del precio | el precio)",
    ] },
    ask_flex: { patterns: [
      "(el precio es | es) (negociable | platicable) #h:flex", "(el precio es | es) fijo", "(se puede | podemos) (negociar | regatear | platicar) [el precio]",
      "(me | le) (puede | podria) (hacer | dar) (un | algun) descuento", "(me hace | me haria | hay) (un | algun) descuento", "(hay | habria) (descuento | rebaja | algun descuento)",
      "(me | lo) (puede | podria) (bajar | rebajar) [@poco] [el precio]", "(le baja | le bajaria | le puede bajar | le podria bajar) [@poco]", "(puede | podria) (bajarle | rebajarle | bajarlo) [@poco]",
      "(acepta | aceptaria) (ofertas | menos)", "(y | que tal) un descuento", "(hay | habria) (chance | oportunidad | manera) de (negociar | un descuento | bajarle)",
      "(me puedes | puedes) (bajar | hacer un descuento) #tip:tu_staff", "(bajeme | baje) el precio #rude",
    ] },
    too_high: { patterns: [
      "[{mxn}] (es | eso es | son) [@poco | mucho] mas de lo que (queria | pensaba | esperaba | tenia pensado | puedo) (gastar | pagar) #h:more_than_hoping",
      "[{mxn}] se me (hace | hizo) [@poco | muy] (caro | alto | elevado) #h:bit_much", "(es | esta | me parece) [@poco] (caro | alto | elevado)",
      "se (me | nos) sale [@poco] del presupuesto", "(esta | es) fuera de mi presupuesto", "no (esta | entra) en mi presupuesto",
      "no (tengo | traigo) tanto [dinero]", "no (tengo | traigo) {mxn}", "no me alcanza [para eso]", "(sigue | todavia es | todavia esta) [@poco | muy] (caro | alto)",
      "(sigue siendo | todavia es | aun es) [@poco] (mucho | mucho dinero | demasiado | caro)",
      "{mxn} (es | son | sigue siendo) (mucho | mucho dinero | caro | alto) [para mi]", "{mxn} (uf | uy | ay | caray | mmm)", "(uf | uy | ay | caray) {mxn}",
      "es mucho [dinero] para un @carn (usado | de 2008)", "no (puedo | podria) (pagar | dar | gastar) {mxn}",
      "no (le | se lo) (voy a dar | voy a pagar | doy | pago | daria | pagaria) {mxn}",
      "(es | son) mucho dinero [para mi]",
      "(es | esta | me parece) (muy | demasiado | super) (caro | alto) #tip:blunt_expensive", "(esta | es) carisimo #tip:blunt_expensive", "(que | muy) caro #tip:blunt_expensive", "carisimo #tip:blunt_expensive",
      "{mxn} (es | esta) (carisimo | muy caro | demasiado) #tip:blunt_expensive",
    ] },
    make_offer: { patterns: [
      "(estaba pensando | pensaba | yo pensaba) (mas bien | mas) en @money #h:along_lines", "(estaba pensando | pensaba) (en | como en) @money",
      "@leave en @money #h:consider", "no @leave en @money", "(y si | que tal si) lo dejamos en @money #h:what_if", "(y si | que tal si) (le | se lo) (pago | doy | ofrezco) @money",
      "(acepta | aceptaria | toma | tomaria) @money", "[mejor] (le | se lo) (ofrezco | puedo ofrecer | ofreceria) @money #h:can_offer",
      "(le | se lo) (doy | puedo dar | daria | pago | puedo pagar | pagaria) @money [por @car | por el]", "(que tal | y) @money",
      "(le parece | le parecen | que le parece | que le parecen | le sirven | le sirve) @money", "@money (le parece | le parecen | esta bien | le sirve | le sirven | le funciona)",
      "@money y (me lo llevo | lo compro | es mio | cerramos | ya)", "(por | en) @money (me lo llevo | lo compro)", "(me lo llevo | lo compro) (por | en) @money", "(me lo llevo | lo compro) si @leave en @money", "si @leave en @money (me lo llevo | lo compro)",
      "(me lo llevo | lo compro) pero (en | por) @money",
      "(mi oferta | mi presupuesto | mi limite | mi ultima oferta | mi mejor oferta) es [de] @money", "@money es (mi limite | mi oferta | mi maximo | mi ultima oferta | mi mejor oferta | lo mas que puedo pagar)",
      "[solo | nomas | solamente] (tengo | traigo) @bigmoney", "(puedo | podria) (pagar | dar | gastar | ofrecer) [hasta] @money", "(digamos | dejemoslo en | quedemos en | cerremos en | cerramos en) @money",
      "@money y ya [es mi ultima oferta]", "@money ni un peso mas",
      // a ceiling is an offer: "No puedo pagar más de setenta mil." = seventy
      "no (puedo | quiero | pienso) (pagar | gastar | dar) mas de @money [por @car]", "lo (mas | maximo) que (puedo | quiero) (pagar | dar | gastar) (es | son) @money",
      "[puedo pagar | puedo llegar] hasta @money", "no (le | se lo) (doy | pago | daria | pagaria) mas de @money", "ni un peso mas de @money",
      "(nos quedamos | quedemos | quedamos) (a la mitad | en medio) en @money", "[no] {old:mxn} no [mejor | sino] @money", "no {old:mxn} sino @money", "(partimos | partamos) la diferencia en @money",
      "(me lo dejas | lo dejas | me lo vendes) en @money #tip:tu_staff", "(aceptas | tomas) @money #tip:tu_staff",
    ] },
    // a bare number ("Setenta mil.", "¿Setenta y cinco?") only answers her price questions
    make_offer_ctx: { patterns: ["[mejor] @money [entonces | mejor | final | maximo | y ya]", "(tal vez | quizas | a lo mejor) @money", "@money (que le parece | que dice | como ve)"] },
    ask_better: { patterns: [
      "[no] (me lo | lo) (puede | podria) dejar en menos #h:do_better", "[no] (me lo | lo) deja en menos", "(puede | podria) mejorar (el precio | su precio | la oferta) #h:do_better_price",
      "(es lo mejor | es todo lo) que puede hacer", "(puede | podria) (bajarle | bajar) (mas | un poco mas | otro poco | otro poquito | tantito mas)",
      "(bajele | bajale #tip:tu_staff) (un poco | tantito | otro poquito) [mas]", "(un poco | un poquito | tantito | otro poquito) mas (abajo | barato)", "mas barato", "[ya] no le (baja | bajaria | puede bajar) (mas | un poco mas | otro poquito)", "(le baja | le puede bajar | le bajaria) (mas | un poco mas | otro poquito)",
      "(andele | ande) (bajele | un poco mas)", "(no hay manera | hay manera) de (bajarle | dejarlo en menos)", "que tan abajo (puede | llega)",
      "(me lo | lo) (puede | podria) dejar (mas barato | en algo menos)",
    ] },
    ask_best: { patterns: [
      "es su mejor (oferta | precio) #h:best_offer", "(es | ese es) su (ultimo | último) precio", "(es | eso es) lo menos [que (me lo puede dejar | me puede dejar | lo puede dejar | acepta | puede aceptar)]",
      "(cual es | que es) su (mejor | ultimo) precio #h:best_price #wh", "cuanto es lo menos #h:lo_menos #wh", "(cual | que) es lo menos [que (acepta | aceptaria | puede)] #wh", "cuanto es lo menos que (acepta | aceptaria | puede aceptar | me lo deja) #wh",
      "(en cuanto | cuanto) es lo (menos | minimo) [que me lo deja] #wh", "[y] (su) ultimo precio #wh", "(cual es | es | ese es) (su | el) precio final",
      "(ya | ese) es (su | el) (ultimo | final) [precio]", "es lo mas que (puede | podria) bajar", "lo menos #wh", "(cuanto | en cuanto) me lo deja #wh",
    ] },
    halfway: { patterns: [
      "(y si | que tal si) nos (quedamos | vemos | encontramos) a la mitad [del camino] #h:halfway", "(y si | que tal si) (partimos | dividimos) la diferencia", "(y si | que tal si) lo (dejamos | quedamos) a la mitad",
      "(partimos | partamos | dividimos | dividamos) la diferencia #h:split", "(quedemos | nos quedamos) (a la mitad | en medio | en el medio)", "a la mitad",
      "ni usted ni yo", "un poco usted y un poco yo #h:little_from_you", "(usted baja | baja) un poco y yo (subo | ofrezco) un poco [mas]",
      "(mitad y mitad | cincuenta cincuenta | 50 50)", "(en medio | a medio camino)", "(podemos | por que no) (quedarnos | vernos) a la mitad",
    ] },
    cash_lever: { patterns: [
      "(puedo | le puedo) pagar en efectivo [hoy | ahorita | ahora mismo | si le sirve] #h:cash_offer", "(le pagaria | pagaria) en efectivo [hoy]",
      "(y si | que tal si) (le pago | pago) en efectivo", "(en efectivo | cash) [hoy | ahorita]", "(le ayuda | ayuda | sirve) (si es | que sea | si pago) en efectivo",
      "(traigo | tengo) (el efectivo | efectivo | el dinero) [aqui | conmigo]", "le (puedo pagar | pago) (hoy | ahorita | ahora mismo) [mismo]", "(acepta | aceptaria) efectivo",
      "(y | que tal) en efectivo",
      "si (le pago | pago) (en efectivo | cash) [(me hace | me haria | me da | hay | me puede hacer) (un | algun) descuento | me lo deja en menos | me baja]",
    ] },
    use_flaw: { patterns: [
      "[pero] el @ac no (sirve | funciona | jala | enfria) [asi que] #h:ac_point", "[pero] el @ac no (sirve | funciona) asi que (bajele | me lo deja en menos | me puede bajar)",
      "arreglar el @ac me va a costar [dinero | mucho | un dineral] #h:ac_cost", "(voy a | tendria que | tengo que) (arreglar | componer | reparar) el @ac",
      "[pero | y] los frenos (necesitan | ocupan) (trabajo | servicio | arreglo | revision) [asi que] #h:brakes_work", "[pero | y] los frenos (estan | se sienten) [@poco] (suaves | flojos | gastados) asi que",
      "(necesita | ocupa) (trabajo | arreglos | un poco de trabajo | unos arreglos) [asi que]", "(voy a | tendria que | tengo que) (arreglar | componer) (los frenos | la direccion)",
      "eso me va a costar (dinero | mucho)", "[pero] el @ac esta (descompuesto | roto)",
    ] },
    sleep_on_it: { patterns: [
      "(dejeme | deje | dejame #tip:tu_staff | lo voy a | lo tengo que) (consultar | consultarlo) con la almohada #h:sleep_on_it",
      "(dejeme | deje | dejame #tip:tu_staff) pensarlo [esta noche | un poco | hasta manana | bien]", "(voy a | tengo que | necesito | quiero) pensarlo [bien | un poco]",
      "lo (voy a | tengo que | quiero) pensar [bien | un poco]", "lo pienso [y le aviso]",
      "le (aviso | llamo | marco | confirmo | escribo) (manana | mas tarde | despues | luego | hoy en la noche)", "(tengo que | necesito) (consultarlo | hablarlo | platicarlo) con mi (esposa | esposo | pareja | familia)",
      "(necesito | deme | me da) (tiempo | un dia | hasta manana | unos dias) [para pensarlo]", "lo (consulto | platico | hablo) con mi (esposa | esposo | pareja | familia)", "(puedo | le puedo) (avisar | contestar | llamar) manana",
    ] },
    accept_deal: { patterns: [
      "(trato hecho | es un trato | tenemos un trato | hecho) #h:deal", "(me lo llevo | lo compro | me lo quedo) #h:ill_take",
      "(quiero | me gustaria | quisiera) (comprarlo | comprar el @carn | comprar su @carn | llevarmelo)",
      "acepto [su oferta | su precio | el precio | el trato]", "(cerramos | cerremos) el trato", "(se lo | lo) compro",
      "(trato hecho | es un trato) me lo llevo", "no (necesito | tengo que) pensarlo [mas] (me lo llevo | lo compro | trato hecho)",
    ] },
    // only while a price is on the table: "Me parece bien.", "Es un precio justo.", "Sale."
    accept_ctx: { patterns: [
      "(me parece | se me hace) (bien | justo | razonable | perfecto) #h:works_for_me", "(es | me parece) un (precio justo | buen precio)",
      "(estoy | estamos) de acuerdo", "(eso | lo) (puedo | podria) pagar", "(va | sale) (pues)", "(me late | me cuadra)", "(hecho | listo) entonces",
      "(bueno | si) (lo hacemos | hagamoslo)", "me funciona", "[si | esta bien] sin regatear",
    ] },
    // "Está bien, gracias" at her price question: could be yes or no, so the question again (rule 17)
    closing_ctx: { patterns: ["(esta bien | ok | okay | vale | bueno | muy bien) [muchas] gracias", "gracias (esta bien | ok)", "(ok | esta bien) gracias por todo"] },
    shake: { patterns: [
      "(demonos | nos damos) la mano #h:shake", "(choquela | choque esas cinco | chocala #tip:tu_staff | choca esos cinco #tip:tu_staff)",
      "(aqui esta | le doy) mi mano", "(cerremos | cerramos) (el trato)? con un apreton de manos", "un apreton de manos",
    ] },
    walk_away: { patterns: [
      "(lo siento | me temo que) [pero] (sigue siendo | es) (mas de lo que puedo (gastar | pagar) | demasiado para mi | mucho para mi) #h:afraid_more",
      "(gracias | muchas gracias) por su tiempo de todos modos #h:thanks_time", "gracias de todos modos", "(gracias | muchas gracias) por su tiempo",
      "creo que no es para mi", "[mejor | creo que] (sigo | voy a seguir) buscando", "(mejor | creo que) (paso | lo dejo)", "no me (conviene | interesa) [ya | mas]",
      "(no | ya no) (lo voy a | lo quiero) comprar", "(no | ya no) (quiero | voy a) (comprarlo | llevarmelo | comprar el @carn | comprar su @carn)",
      "no (se lo | lo) (compro | voy a comprar)", "no me lo (llevo | voy a llevar)", "no puedo (comprarlo | pagar eso | pagar tanto)",
      "(mejor | tal vez) (en otra ocasion | otro dia)", "(eso | asi) no me (funciona | conviene)", "no puedo [hacerlo]",
    ] },
    walk_rude: { patterns: [
      "(olvidelo | olvidalo | olvidese) #tip:blunt_no", "(ni loco | ni loca | ni de broma | ni de chiste | ni pensarlo | para nada) #tip:blunt_no",
      "(esta loca | esta usted loca | esta loco) #tip:blunt_no", "(es | eso es) un (robo | abuso | chiste | fraude) #tip:blunt_no", "(que | eso es) (ridiculo | absurdo) #tip:blunt_no",
      "quedese con (el | su) @carn #tip:blunt_no", "no hay trato #tip:blunt_no", "{mxn} es un (robo | abuso | chiste) #tip:blunt_no", "(me esta | esta) (bromeando | vacilando) #tip:blunt_no",
      "(ya | mejor) me voy #tip:blunt_no",
    ] },
    rude_car: { patterns: [
      "(es | esta) (una carcacha | un cacharro | muy viejo | viejisimo | feo | horrible | una chatarra | basura | un desastre) #tip:rude_car",
      "no (vale | los vale) (eso | tanto | {mxn}) #tip:rude_car", "nadie (va a | le va a) pagar (eso | {mxn}) por (el | este @carn) #tip:rude_car",
      "que (carcacha | cacharro | chatarra) #tip:rude_car", "(es | esta) (muy viejo | viejisimo | muy usado) para (ese precio | eso | {mxn}) #tip:rude_car", "es (solo | nomas) un @carn viejo #tip:rude_car",
    ] },

    // --- paying ---------------------------------------------------------------------------------
    pay_cash: { patterns: [
      "(le pago | pago | voy a pagar | le voy a pagar) en efectivo #h:pay_cash_p", "[mejor] (en | con) efectivo",
      "(por transferencia | con tarjeta | con cheque) no [mejor] (en | con) efectivo", "no (por transferencia | con tarjeta | con cheque) [sino] [mejor] (en | con) efectivo", "efectivo", "(acepta | aceptan | recibe) efectivo",
      "en efectivo como le dije", "(en | con) efectivo (aqui lo tengo | aqui lo traigo | ya lo traigo)", "(efectivo | en efectivo) (esta bien | le parece | le sirve)",
    ] },
    pay_transfer: { patterns: [
      "(puedo | le puedo) pagar (por | con) transferencia [bancaria] #h:pay_transfer", "[mejor] (por | con) transferencia [bancaria]",
      "(en efectivo | con tarjeta | con cheque) no [mejor] (por | con) transferencia", "no (en efectivo | con tarjeta | con cheque) [sino] [mejor] (por | con) transferencia",
      "(le hago | le mando | le puedo hacer | le puedo mandar) (una transferencia | la transferencia)", "(le transfiero | se lo transfiero | puedo transferirle | le deposito)",
      "(por | con) spei", "(le paso | le mando) el dinero por (transferencia | el banco)", "(la | una) transferencia (esta bien | le sirve)",
    ] },
    pay_check: { patterns: [
      "(le sirve | sirve | esta bien) un cheque de caja #h:pay_check", "(un | con | en) cheque de caja [esta bien]",
      "(puedo | le puedo) pagar con (un)? cheque [de caja | certificado | personal]", "(le doy | le puedo dar | le hago) un cheque [de caja | certificado | personal]",
      "[mejor] (con | en) cheque [de caja | personal]", "(le pago | pago) con (un)? cheque [de caja | personal]",
    ] },
    // "No traigo efectivo": never the cash lever. "No en efectivo" / "En efectivo no" (the comma lost, rule 10) is no
    // cash: she offers the other ways and nothing is paid
    no_cash: { patterns: ["no (tengo | traigo | cargo) (efectivo | tanto efectivo | suficiente efectivo | el efectivo) [conmigo | aqui | ahorita]", "sin efectivo", "no (puedo | podria | quiero | prefiero) pagar en efectivo", "(prefiero | mejor) no pagar en efectivo",
      "ya no (tengo | traigo) [mas]? (efectivo | dinero en efectivo)", "no (en | con) efectivo", "(en | con)? efectivo no", "efectivo no (tengo | traigo)", "(prefiero | mejor) no (en | con) efectivo"] },
    pay_card: { patterns: [
      "(puedo | le puedo) pagar con tarjeta [de credito | de debito]", "(acepta | aceptan | recibe) (tarjeta | tarjetas) [de credito | de debito]", "(con | en) tarjeta", "tarjeta",
      "(a | con) meses sin intereses", "(le pago | pago) con tarjeta",
    ] },

    // --- thanks and goodbye -----------------------------------------------------------------------
    pleasure: { patterns: [
      "(fue | ha sido) un (placer | gusto) hacer negocios con usted #h:pleasure", "(un placer | un gusto) hacer negocios [con usted]",
      "(fue | ha sido) un (gusto | placer) (conocerla | tratar con usted)", "mucho gusto [igualmente]", "el gusto es mio",
    ] },
    look_after: { patterns: [
      "le prometo que lo voy a cuidar [mucho | muy bien] #h:look_after", "(lo voy a cuidar | voy a cuidarlo | lo cuido | se lo cuido) [mucho | muy bien]",
      "(se lo prometo | lo prometo | prometido)", "(esta | va a estar) en buenas manos", "lo voy a (tratar | manejar) (bien | con cuidado)",
    ] },
    thanks_so_much: { patterns: ["(muchisimas gracias | mil gracias) #h:thanks_so_much", "gracias por (las llantas | la funda | el tanque lleno | el carro | el auto | el convertible)"] },
  },

  lines: {
    // --- arriving -----------------------------------------------------------------------------------
    greet_new: [
      t("¡Buenas tardes! | Viene | por | el | carro, | ¿verdad?", "Good afternoon! | You've come | about | the | car, | right?", "Good afternoon! You must be here about the car.",
        { flags: { 4: F_CARRO }, neutral: t("¡Buenas tardes! | Viene | por | el | auto, | ¿verdad?", "Good afternoon! | You've come | about | the | car, | right?", "Good afternoon! You must be here about the car.") }),
      t("¡Hola! | A ver | si | adivino: | vio | mi | anuncio.", "Hi! | Let's see | if | I guess (right): | you saw | my | ad.", "Hi! Let me guess: you saw my ad."),
    ],
    intro_again: [
      t("¡Ah, | es | usted | otra vez! | ¿Viene | a | echarle | otro | vistazo?", "Oh, | it's | you | again! | Have you come | to | give it | another | look?", "Oh, it's you again! Back for another look?"),
    ],
    ad_again: [t("¿Viene | por | el | carro?", "Have you come | about | the | car?", "Are you here about the car?",
      { flags: { 3: F_CARRO }, neutral: t("¿Viene | por | el | auto?", "Have you come | about | the | car?", "Are you here about the car?") })],
    not_ad: [
      t("¡Ah! | Entonces | nomás | vino | a | admirarlo. | Todos | lo | hacen.", "Oh! | Then | just | you came | to | admire it. | Everyone | it | does.", "Oh! Then you're just admiring her. Everyone does.",
        { flags: { 2: F_NOMAS }, neutral: t("¡Ah! | Entonces | solo | vino | a | admirarlo. | Todos | lo | hacen.", "Oh! | Then | just | you came | to | admire it. | Everyone | it | does.", "Oh! Then you're just admiring her. Everyone does.") }),
    ],
    maggie_name: [
      t("Soy | Margarita. | Y | esta | belleza | es | la | razón | de | su | visita.", "I'm | Margarita. | And | this | beauty | is | the | reason | for | your | visit.",
        "I'm Margarita. And this beauty is the reason you're here."),
    ],
    still_yes: [t("¡Sí, | todavía | está | en venta!", "Yes, | still | it's | for sale!", "Yes, she's still for sale!")],
    nice_name: [t("¡Mucho gusto!", "Nice to meet you!", "Nice to meet you!")],
    present1: [
      t("Es | modelo | 2008, | rojo | cereza, | y | el | techo | todavía | baja | como | un | sueño.", "It's | model (year) | 2008, | red | cherry, | and | the | top | still | goes down | like | a | dream.",
        "She's a 2008, cherry red, and the top still goes down like a dream.", { say: "Es modelo dos mil ocho, rojo cereza, y el techo todavía baja como un sueño.",
          flags: { 1: "modelo: in Mexico a car's model year is its modelo (un modelo 2008)." } }),
    ],
    present2: [
      t("El | radio | funciona, | los | asientos | son | originales | y | jamás | me | ha dejado | tirada.", "The | radio | works, | the | seats | are | original | and | never | me | has left | stranded.",
        "The radio works, the seats are original, and she's never let me down.", { flags: { 11: "dejar tirado/tirada: to leave someone stranded; tirada agrees with Margarita." } }),
    ],
    weather_react: [t("¡Sí! | Un | día | perfecto | para | un | convertible.", "Yes! | A | day | perfect | for | a | convertible.", "Yes! Perfect convertible weather.")],
    compliment_react: [t("¡Gracias! | Yo | también | lo | creo.", "Thanks! | I | also | it | think.", "Thanks! I think so too."), t("¡Ay, | gracias!", "Aw, | thanks!", "Aw, thank you!")],
    ask_first: [
      t("¿Tiene | alguna | pregunta?", "Do you have | any | question?", "Any questions about her?"),
      t("A ver, | ¿qué | le gustaría | saber?", "Let's see, | what | would you like | to know?", "So, what would you like to know?"),
    ],
    ask_what: [t("¡Claro! | ¿Qué | le gustaría | saber?", "Sure! | What | would you like | to know?", "Sure! What would you like to know?")],
    ask_more: [
      t("¿Algo | más | que | quiera | saber?", "Anything | else | that | you want | to know?", "Anything else you want to know?"),
      t("¿Qué | más?", "What | else?", "What else?"),
    ],

    // --- questions about the car ---------------------------------------------------------------------
    a_hint: [t("Casi | todos | preguntan | por | el | kilometraje.", "Almost | everyone | asks | about | the | mileage.", "Most people ask about the mileage.")],
    a_mileage: [t("Unos | 160,000 | kilómetros. | Casi | todo | en | carretera, | se lo | juro.", "About | 160,000 | kilometers. | Almost | all | on | the highway, | it to you | I swear.",
      "About 160,000 kilometers. Mostly highway, I promise.", { say: "Unos ciento sesenta mil kilómetros. Casi todo en carretera, se lo juro.", flags: { 0: F_UNOS } })],
    a_year: [t("Es | modelo | 2008. | Pero | se ve | más | joven, | ¿verdad?", "It's | model (year) | 2008. | But | it looks | more | young, | right?", "She's a 2008. But she looks younger, right?",
      { say: "Es modelo dos mil ocho. Pero se ve más joven, ¿verdad?" })],
    a_owners: [t("Soy | la | segunda | dueña. | Se lo | compré | a | un | dentista | muy | cuidadoso | en | 2012.", "I'm | the | second | owner. | It from him | I bought | from | a | dentist | very | careful | in | 2012.",
      "I'm the second owner. I bought her from a very careful dentist in 2012.", { say: "Soy la segunda dueña. Se lo compré a un dentista muy cuidadoso en dos mil doce." })],
    a_since: [t("Desde | 2012. | Se lo | compré | a | un | dentista | muy | cuidadoso.", "Since | 2012. | It from him | I bought | from | a | dentist | very | careful.",
      "Since 2012. I bought her from a very careful dentist.", { say: "Desde dos mil doce. Se lo compré a un dentista muy cuidadoso." })],
    a_paint: [t("Es | la | pintura | original. | Nunca | lo | han pintado.", "It's | the | paint | original. | Never | it | they have painted.", "It's the original paint. She's never been repainted.")],
    a_hood: [t("¡Claro! | Sin | fugas, | sin | óxido. | ¿Ve?", "Sure! | No | leaks, | no | rust. | See?", "Sure! No leaks, no rust. See?")],
    a_accident: [t("Nunca. | Bueno, | un | rayoncito. | La | culpa | fue | del | portón.", "Never. | Well, | a | little scratch. | The | fault | was | the | gate's.", "Never. Well, one little scratch. The gate started it.",
      { flags: { 3: "rayoncito: rayón (a scratch) + -ito, a small one.", 7: "del = de + el: the fault was “of the” gate." } })],
    a_why: [t("Me mudo | a | un | lugar | sin | cochera. | Se merece | algo | mejor | que | la | calle.", "I'm moving | to | a | place | without | garage. | It deserves | something | better | than | the | street.",
      "I'm moving to a place with no garage. She deserves better than the street.")],
    a_service: [t("Todos | los | servicios | están | en | esta | carpeta. | Así | soy.", "All | the | services | are | in | this | folder. | That's how | I am.", "Every service is in this folder. I'm that kind of person.")],
    a_problems_ok: [t("¿La verdad? | Nada | grave. | Nomás | necesita | un poco | de | cariño.", "Honestly? | Nothing | serious. | Just | it needs | a little | of | love.", "Honestly? Nothing serious. She just needs a little love.",
      { flags: { 3: F_NOMAS }, neutral: t("¿La verdad? | Nada | grave. | Solo | necesita | un poco | de | cariño.", "Honestly? | Nothing | serious. | Just | it needs | a little | of | love.", "Honestly? Nothing serious. She just needs a little love.") })],
    a_problems_flaw: [t("¿La verdad? | El | aire | acondicionado | no sirve. | Pero | bueno, | es | convertible.", "Honestly? | The | air | conditioning | doesn't work. | But | hey, | it's | a convertible.",
      "Honestly? The air conditioning doesn't work. But hey, it's a convertible.")],
    ac_fine: [t("¿El | aire? | Funciona | perfecto.", "The | AC? | It works | perfectly.", "The AC? It works just fine.")],
    a_engine: [t("¿El | motor? | Ronronea | como | un | gatito.", "The | engine? | It purrs | like | a | kitten.", "The engine? She purrs like a kitten.")],
    a_gearbox: [t("Es | estándar, | como | casi | todos | los | de | su | época.", "It's | manual, | like | almost | all | the ones | of | its | time.", "It's a stick shift, like most cars from back then.",
      { flags: { 1: "estándar: in Mexico, a car with a manual gearbox (a stick shift)." } })],
    gear_no: [t("No, | es | estándar.", "No, | it's | manual.", "No, it's a stick shift.", { flags: { 2: "estándar: in Mexico, a car with a manual gearbox (a stick shift)." } })],
    gear_yes: [t("Sí, | es | estándar.", "Yes, | it's | manual.", "Yes, it's a stick shift.")],
    a_fuel: [t("Rinde | unos | doce | kilómetros | por | litro. | Menos | si | maneja | con | la | música | alta.", "It does | about | twelve | kilometers | per | liter. | Less | if | you drive | with | the | music | loud.",
      "About twelve kilometers per liter. Less if you drive with the music up.", { flags: { 0: "rendir: of a car, to get (so many kilometers per liter).", 1: F_UNOS } })],
    a_trunk: [t("La | cajuela | es | chica, | pero | caben | dos | maletas | y | una | hielera.", "The | trunk | is | small, | but | fit | two | suitcases | and | a | cooler.", "The trunk is small, but it fits two suitcases and a cooler.",
      { flags: { 1: "Mexican: cajuela = a car's trunk; maletero is more widely used." },
        neutral: t("El | maletero | es | chico, | pero | caben | dos | maletas | y | una | hielera.", "The | trunk | is | small, | but | fit | two | suitcases | and | a | cooler.", "The trunk is small, but it fits two suitcases and a cooler.") })],
    a_top: [t("Apriete | este | botón | y | cuente | hasta | diez. | Techo | abajo, | peinado | arruinado.", "Press | this | button | and | count | to | ten. | Top | down, | hairdo | ruined.", "Push this button and count to ten. Top down, hair ruined.")],
    a_radio: [t("Funciona. | Solo | agarra | una | estación, | pero | es | buena.", "It works. | Only | it picks up | one | station, | but | it's | a good one.", "It works. It only gets one station, but it's a good one.")],
    a_tires: [t("No son | nuevas, | pero | están | bien.", "They aren't | new, | but | they're | fine.", "They're not new, but they're safe.")],
    a_seats: [t("Son | los | originales. | Ni | un | rasguño.", "They're | the | original ones. | Not | a | scratch.", "All original. Not a single tear.")],
    a_unknown: [t("Buena | pregunta. | La verdad, | no sé.", "Good | question. | Honestly, | I don't know.", "Good question. Honestly, I'm not sure.")],
    a_papers_all: [t("Todo | en regla: | la | factura | original, | la | tarjeta | de | circulación | y | los | pagos | al corriente.", "Everything | in order: | the | invoice | original, | the | card | of | circulation | and | the | payments | up to date.",
      "Everything's in order: the original factura, the registration card and all the fees paid.", { flags: { 3: F_FACTURA, 6: F_TARJETA } })],
    a_factura: [t("Sí, | tengo | la | factura | original. | Se la | endoso | a | su | nombre.", "Yes, | I have | the | invoice | original. | It to you | I'll sign over | in | your | name.",
      "Yes, I have the original factura. I'll sign it over to you.", { flags: { 3: F_FACTURA, 6: "endosar: to sign the factura over to the new owner, on its back." } })],
    a_tarjeta: [t("Sí, | y | la | tarjeta | de | circulación | está | vigente.", "Yes, | and | the | card | of | circulation | is | current.", "Yes, and the registration card is current.", { flags: { 3: F_TARJETA } })],
    a_fees_yes: [t("Sí, | está | al corriente: | todos | los | pagos | están | en | la | carpeta.", "Yes, | it's | up to date: | all | the | payments | are | in | the | folder.", "Yes, it's all paid up. Every receipt is in the folder.")],
    a_fees_no: [t("No, | no debe | nada: | todos | los | pagos | están | en | la | carpeta.", "No, | it doesn't owe | anything: | all | the | payments | are | in | the | folder.", "No, nothing's owed. Every receipt is in the folder.")],
    a_plates: [t("Sí, | tiene | placas | de | aquí.", "Yes, | it has | plates | from | here.", "Yes, it has local plates.")],
    a_national: [t("Sí, | es | nacional, | con | factura | original.", "Yes, | it's | Mexican, | with | invoice | original.", "Yes, it was sold new in Mexico, with the original factura.",
      { flags: { 2: "nacional: sold new in Mexico, not an imported used car.", 4: F_FACTURA } })],
    a_repuve: [t("Claro. | Aquí | está | el | número | de | serie.", "Sure. | Here | is | the | number | of | series.", "Sure. Here's the VIN.",
      { flags: { 4: "número de serie: the VIN, which anyone can check in Mexico's public vehicle registry (REPUVE)." } })],
    a_mechanic: [t("Claro, | si | quiere | lo | llevamos | con | su | mecánico. | No escondo | nada.", "Sure, | if | you want | it | we take | to | your | mechanic. | I don't hide | anything.",
      "Sure, if you like we can take her to your mechanic. I've got nothing to hide.")],

    // --- the drive -----------------------------------------------------------------------------------
    drive_offer: [
      t("¿Quiere | manejarlo | primero?", "Do you want | to drive it | first?", "Would you like to drive her first?"),
      t("¿Qué tal | una | prueba de manejo?", "How about | a | test drive?", "How about a test drive?"),
    ],
    drive_keys: [
      t("Aquí | tiene | las | llaves. | Una | vuelta | a | la | manzana, | y | trátelo | bien.", "Here | you have | the | keys. | One | lap | around | the | block, | and | treat it | well.", "Here are the keys. Once around the block, and be nice to her."),
      t("¡Claro! | Aquí | están | las | llaves. | Dele | una | vuelta | a | la | manzana.", "Sure! | Here | are | the | keys. | Give it | a | spin | around | the | block.", "Sure! Here are the keys. Take her around the block."),
    ],
    drive_back: [
      t("¡Qué | rápido | regresó! | ¿Y? | ¿Qué | le | pareció?", "How | fast | you came back! | So? | What | to you | did it seem?", "Back so soon! So? What do you think?"),
      t("¿Ya | de regreso? | ¿Y? | ¿Le | robó | el | corazón?", "Already | back? | So? | (From) you | did it steal | the | heart?", "Back already? Well? Did she steal your heart?"),
    ],
    opinion_again: [t("Entonces, | ¿cómo | lo | sintió?", "So, | how | it | did you feel?", "So, how did she drive?")],
    drive_good_react: [t("Se lo | dije. | Todavía | se maneja | como | un | sueño.", "It to you | I told. | Still | it drives | like | a | dream.", "I told you. She still drives like a dream.")],
    drive_bad_react: [t("Es | justo. | No es | nuevo, | pero | es | honesto.", "That's | fair. | It isn't | new, | but | it's | honest.", "Fair enough. She's not new, but she's honest.")],
    drive_decline: [t("¡Qué | valiente! | Casi | todos | por lo menos | le | dan | una | vuelta.", "How | brave! | Almost | everyone | at least | it | gives | a | spin.", "Brave! Most people at least take her for a spin.")],
    drive_later: [t("Claro, | cuando | usted | quiera.", "Sure, | whenever | you | want.", "Sure, whenever you like.")],
    drive_again: [t("¡Usted | ya | lo | manejó!", "You | already | it | drove!", "You've already driven her!")],
    flaw_disclose: [t("Bueno, | para ser honesta: | el | aire | acondicionado | no sirve.", "Okay, | to be honest: | the | air | conditioning | doesn't work.", "Okay, full disclosure: the air conditioning doesn't work.")],
    flaw_before: [t("Antes de | hablar | de | números, | para ser honesta: | el | aire | acondicionado | no sirve.", "Before | talking | about | numbers, | to be honest: | the | air | conditioning | doesn't work.",
      "Before we talk numbers, full disclosure: the air conditioning doesn't work.")],
    flaw_sky: [t("Pero | es | convertible: | ¡tiene | todo | el | cielo!", "But | it's | a convertible: | you have | all | the | sky!", "But it's a convertible. You have the whole sky!")],
    glad_attitude: [t("Me gusta | su | actitud.", "I like | your | attitude.", "I like your attitude.")],
    flaw_fair: [t("Lo sé. | Mejor | que | lo | sepa | por | mí.", "I know. | Better | that | it | you know | from | me.", "I know. Better you hear it from me.")],
    no_fault: [t("¿De veras? | Hoy | en la mañana | andaba | de maravilla.", "Really? | Today | in the morning | it was running | wonderfully.", "Really? She drove just fine this morning.")],

    // --- the price talk -------------------------------------------------------------------------------
    talk_prompt: [
      t("Entonces… | ¿hablamos | de | números?", "So… | shall we talk | about | numbers?", "So… shall we talk numbers?"),
      t("¿Y? | ¿{m:Listo|f:Lista} | para | hablar | de | dinero?", "Well? | Ready | to | talk | about | money?", "Well? Ready to talk money?"),
    ],
    talk_ask: [
      t("Pido | {$price}. | Es | un | precio | justo | por | un | convertible | así.", "I'm asking | {$price}. | It's | a | price | fair | for | a | convertible | like this.", "I'm asking {$price}. It's a fair price for a car like this."),
      t("El | precio | es | {$price}, | como | en | el | anuncio.", "The | price | is | {$price}, | as | in | the | ad.", "The price is {$price}, like in the ad."),
    ],
    price_now: [t("Mi | precio | ahora | es | {$price}.", "My | price | now | is | {$price}.", "My price right now is {$price}.")],
    price_reask: [t("Entonces, | {$price}. | ¿Qué | dice?", "So, | {$price}. | What | do you say?", "So, {$price}. What do you say?")],
    deal_price: [t("Quedamos | en | {$price}, | ¿se acuerda?", "We agreed | on | {$price}, | remember?", "We said {$price}, remember?")],
    deal_done: [t("Ya | tenemos | un | trato, | ¿se acuerda?", "Already | we have | a | deal, | remember?", "We already have a deal, remember?")],
    // "¿Es un precio justo?" (a question, never a yes)
    fair_price: [t("¡Claro! | Es | un | precio | justo | por | un | convertible | así.", "Of course! | It's | a | price | fair | for | a | convertible | like this.",
      "Of course! It's a fair price for a car like this.")],
    flex_yes: [t("Bueno… | ¿se lo | dejo | en | {$price}?", "Well… | it to you | shall I let go | for | {$price}?", "Well… would you consider {$price}?", { flags: { 2: F_DEJAR } })],
    flex_what: [t("¿Qué | tenía | en | mente?", "What | did you have | in | mind?", "What did you have in mind?")],
    need_offer: [t("Le toca. | Hágame | una | oferta.", "Your turn. | Make me | an | offer.", "Your turn. Make me an offer.")],
    confirm_full: [t("Entonces… | {$price}, | ¿sin | regatear?", "So… | {$price}, | without | haggling?", "So… {$price}, no haggling?")],
    lowball: [t("¡Ja! | Por | ese | precio | le | vendo | el | radio.", "Ha! | For | that | price | (to) you | I'll sell | the | radio.", "Ha! For that price, you can have the radio.")],
    lowball2: [t("Probemos | con | un | número | que | no me haga | llorar.", "Let's try | with | a | number | that | doesn't make me | cry.", "Let's try a number that won't make me cry.")],
    backwards: [t("¡Oiga, | eso | es | menos | que | antes!", "Hey, | that | is | less | than | before!", "Wait, that's less than before!")],
    counter: [
      t("Podría | dejárselo | en | {$price}.", "I could | let you have it | for | {$price}.", "I could do {$price}.", { flags: { 1: F_DEJAR } }),
      t("Le | puedo | bajar | a | {$price}. | Me duele, | pero | bueno.", "(For) you | I can | lower it | to | {$price}. | It hurts me, | but | okay.", "I can come down to {$price}. It hurts, but okay."),
    ],
    counter_echo: [t("¿{$amount}? | Yo | pensaba | más bien | en | {$price}.", "{$amount}? | I | was thinking | rather | of | {$price}.", "{$amount}? I was thinking more along the lines of {$price}.")],
    better_drop: [t("Usted | sí | sabe | regatear. | Está bien: | {$price}.", "You | really | know how | to haggle. | All right: | {$price}.", "You drive a hard bargain. Fine: {$price}.")],
    better_no: [
      t("Ya | le | bajé. | Le toca.", "Already | (for) you | I came down. | Your turn.", "I've already come down. Your turn."),
      t("¡Ándele, | deme | un | número!", "Come on, | give me | a | number!", "Come on, give me a number!",
        { flags: { 0: "Mexican: ¡ándele! = come on (usted); ándale with friends." }, neutral: t("¡Vamos, | deme | un | número!", "Come on, | give me | a | number!", "Come on, give me a number!") }),
      t("Ahora | hágame | usted | una | oferta.", "Now | make me | you | an | offer.", "Your turn to make an offer."),
    ],
    best_almost: [t("Casi. | Para | usted: | {$price}.", "Almost. | For | you: | {$price}.", "Almost. For you: {$price}.")],
    best_for_you: [t("¿Para | usted? | {$price}.", "For | you? | {$price}.", "For you? {$price}.")],
    best_final: [t("{$price}, | y | es | lo menos.", "{$price}, | and | that's | the lowest.", "{$price}. That's the best I can do.", { flags: { 3: "lo menos: the least; in a sale, the lowest price the seller will take." } })],
    throw_in_tires: [t("Y | le | pongo | llantas | nuevas.", "And | (for) you | I'll put on | tires | new.", "And I'll throw in a new set of tires.")],
    throw_in_cover: [t("Y | le | regalo | la | funda | para | cubrirlo.", "And | (to) you | I'll give | the | cover | to | cover it.", "And I'll throw in the car cover.")],
    throw_in_tank: [t("Y | se lo | entrego | con | el | tanque | lleno.", "And | it to you | I'll hand over | with | the | tank | full.", "And I'll throw in a full tank of gas.")],
    halfway_yes: [t("¿A la mitad? | Serían | {$price}.", "Halfway? | It would be | {$price}.", "Halfway? That's {$price}.")],
    halfway_yes2: [t("¿Sabe | qué? | Me parece | bien.", "You know | what? | It seems to me | fine.", "You know what? That works for me.")],
    halfway_low: [t("Buen | intento. | Pero | de | {$price} | no bajo.", "Nice | try. | But | from | {$price} | I won't go down.", "Nice try. But {$price} is my bottom line.")],
    halfway_none: [t("¿A la mitad | entre | qué | y | qué? | ¡Todavía | no me ha hecho | ninguna | oferta!", "Halfway | between | what | and | what? | Still | you haven't made me | any | offer!",
      "Halfway between what and what? You haven't made me an offer yet!")],
    cash_ack: [
      t("¿En efectivo? | Ahora sí | nos | estamos | entendiendo.", "In cash? | Now | each other | we are | understanding.", "Cash? Now we're talking."),
      t("El | efectivo | siempre | ayuda.", "— | Cash | always | helps.", "Cash talks.", { flags: { 0: "Spanish puts el before a thing in general; English has no article." } }),
    ],
    flaw_point: [t("Tiene razón. | Le | bajo | $2,500.", "You're right. | (For) you | I'll lower it | 2,500 pesos.", "Fair point. I'll take 2,500 pesos off.", { say: "Tiene razón. Le bajo dos mil quinientos pesos." })],
    already_off: [t("Ya | le | bajé | $2,500 | por | eso.", "Already | (for) you | I lowered it | 2,500 pesos | for | that.", "I already took 2,500 pesos off for that.", { say: "Ya le bajé dos mil quinientos pesos por eso." })],
    already_off_limit: [t("Ya | le | bajé | $2,500. | Hasta | ahí | llego.", "Already | (for) you | I lowered it | 2,500 pesos. | Up to | there | I go.", "I already took 2,500 pesos off. That's my limit.",
      { say: "Ya le bajé dos mil quinientos pesos. Hasta ahí llego." })],
    new_price: [t("Entonces: | {$price}.", "So: | {$price}.", "So: {$price}.")],
    over_pay: [t("Espere, | dije | {$price}. | No le cobro | ni | un | centavo | más.", "Wait, | I said | {$price}. | I won't charge you | not even | one | cent | more.", "Hold on, I said {$price}. I won't take a cent more.")],
    deal_yes: [t("Me parece | bien.", "It seems to me | fine.", "That works for me.")],
    deal_sold: [t("¡Vendido!", "Sold!", "Sold!")],
    deal_deal: [t("¡Trato hecho!", "Deal!", "You have a deal.")],
    deal_full: [t("¡Vendido | por | {$price}! | Entre nos, | podía | haber | regateado | un poquito.", "Sold | for | {$price}! | Between us, | you could | have | haggled | a little.",
      "Sold for {$price}! Between us, you could have haggled a little.")],
    firm: [t("Lo siento, | {$price} | es | lo menos | que | puedo | aceptar.", "I'm sorry, | {$price} | is | the least | that | I can | accept.", "I'm afraid {$price} is as low as I can go.")],
    final_reask: [t("¿Y? | ¿Tenemos | trato?", "So? | Do we have | a deal?", "So? Do we have a deal?")],
    final_reask_p: [t("Entonces: | {$price}. | ¿Trato hecho?", "So: | {$price}. | Deal?", "So: {$price}. Deal?")],
    rival1: [t("Ay, | perdón, | es | mi | celular. | Un | segundo.", "Oh, | sorry, | it's | my | cell phone. | One | second.", "Oh, sorry, that's my phone. One second.")],
    rival2: [t("Era | un | señor | que | quiere | verlo | a | las | cinco. | Con | efectivo.", "It was | a | man | who | wants | to see it | at | — | five. | With | cash.", "That was a guy who wants to see her at five. With cash.",
      { flags: { 7: F_CLOCK } })],
    rival3: [t("Pero | yo | prefiero | vendérselo | a | usted.", "But | I | prefer | to sell it | to | you.", "But I'd rather sell her to you.")],
    sleep_ok: [t("Claro. | Consúltelo | con | la | almohada.", "Sure. | Consult it | with | the | pillow.", "Of course. Sleep on it.",
      { flags: { 1: "consultarlo con la almohada: to sleep on it (literally, to ask the pillow)." } })],
    sleep_dare: [t("¡Ni se le ocurra!", "Don't even think about it!", "Don't you dare!")],
    sleep_dare2: [t("El | señor | de | las | cinco | no va | a | esperar.", "The | man | of | — | five | isn't going | to | wait.", "The five o'clock guy won't wait.", { flags: { 3: F_CLOCK } })],
    final_now: [t("Está bien. | {$price}, | y | hoy mismo | es | suyo.", "All right. | {$price}, | and | this very day | it's | yours.", "Okay. {$price}, and she's yours today.")],
    wait_call: [t("¡Espere! | Estaba | pensando | más bien | en | {$price}…", "Wait! | I was | thinking | rather | of | {$price}…", "Wait! I was thinking more along the lines of {$price}…")],
    if_wait: [t("Si | no me hace | esperar.", "If | you don't make me | wait.", "If you don't make me wait.")],
    walk_ok: [t("Lo | entiendo. | Sin | rencores.", "It | I understand. | No | hard feelings.", "I understand. No hard feelings.")],
    walk_ok2: [t("Si | cambia de opinión, | ya | sabe | dónde | encontrarlo.", "If | you change your mind, | already | you know | where | to find it.", "If you change your mind, you know where to find her.")],
    rude_expensive: [t("¿Muy | caro? | Ay, | no diga | eso | enfrente de | él.", "Very | expensive? | Oh, | don't say | that | in front of | it.", "Too expensive? Ouch. Not in front of her.")],
    rude_car: [t("Cuidado. | Es | viejito, | pero | tiene | sentimientos.", "Careful. | It's | a little old, | but | it has | feelings.", "Careful. She's old, but she has feelings.")],
    rude_generic: [t("Bueno, | esa | es | una | forma | de | empezar | a | negociar.", "Well, | that | is | one | way | to | start | — | negotiating.", "Well, that's one way to start a negotiation.",
      { flags: { 7: "empezar a + an infinitive: to start doing something; English has no word for a." } })],
    rude_walk: [t("Bueno… | suerte | con | su | búsqueda.", "Well… | luck | with | your | search.", "Okay… Good luck with your search."), t("Pues… | está bien.", "Well… | all right.", "Well… okay then.")],
    shake_on_it: [t("Démonos | la | mano.", "Let's give each other | the | hand.", "Let's shake on it.")],

    // --- paying and the goodbye ---------------------------------------------------------------------------
    ask_pay: [t("Entonces, | ¿cómo | me | va | a | pagar?", "So, | how | (to) me | are you going | to | pay?", "So, how would you like to pay?")],
    cash_reminder: [t("En efectivo, | como | dijo, | ¿verdad?", "In cash, | as | you said, | right?", "Cash, like you said?")],
    pay_options: [t("¿En efectivo, | por | transferencia | o | con | cheque de caja?", "In cash, | by | transfer | or | with | a cashier's check?", "Cash, a bank transfer or a cashier's check?")],
    pay_no_cash: [t("Entonces, | ¿por | transferencia | o | con | cheque de caja?", "Then, | by | transfer | or | with | a cashier's check?", "Then a bank transfer, or a cashier's check?")],
    pay_reask: [t("Bueno, | ¿cómo | le | hacemos?", "Okay, | how | — | shall we do it?", "Okay, so how do you want to do it?",
      { flags: { 2: "Mexican: ¿cómo le hacemos? = how shall we do it; this le stands for nothing in particular." },
        neutral: t("Bueno, | ¿cómo | lo | hacemos?", "Okay, | how | it | shall we do?", "Okay, so how do you want to do it?") })],
    pay_later: [t("Claro. | Pero | primero | pongámonos | de acuerdo | en | el | precio.", "Sure. | But | first | let's get | in agreement | on | the | price.", "Sure. But first, let's agree on a price.")],
    pay_cash_r: [t("¿En efectivo? | Música | para | mis | oídos.", "In cash? | Music | to | my | ears.", "Cash? Music to my ears.")],
    pay_cash_ok: [t("¡Perfecto! | Música | para | mis | oídos.", "Perfect! | Music | to | my | ears.", "Perfect! Music to my ears.")],
    pay_transfer_r: [t("Una | transferencia | también | está bien. | Le | mando | mis | datos | por | mensaje.", "A | transfer | also | is fine. | (To) you | I'll send | my | details | by | message.", "A bank transfer works too. I'll text you my details.")],
    pay_check_personal: [t("Mejor | un | cheque de caja. | Mi | banco | está | en | la | esquina | de | Juárez | y | Ceiba.", "Better | a | cashier's check. | My | bank | is | on | the | corner | of | Juárez | and | Ceiba.",
      "A cashier's check would be better. My bank is on the corner of Juárez and Ceiba.")],
    pay_check_r: [t("Un | cheque de caja | está bien. | Mi | banco | está | en | la | esquina | de | Juárez | y | Ceiba.", "A | cashier's check | is fine. | My | bank | is | on | the | corner | of | Juárez | and | Ceiba.",
      "A cashier's check is fine. My bank is on the corner of Juárez and Ceiba.")],
    pay_card_no: [t("Ay, | no soy | tienda: | no tengo | terminal.", "Oh, | I'm not | a store: | I don't have | a card reader.", "Oh, I'm not a store. I don't take cards.",
      { flags: { 4: "terminal: in Mexico, the card reader at a shop's counter." } })],
    wait_pay: [t("¡Espere, | todavía | no me ha pagado!", "Wait, | still | you haven't paid me!", "Hold on, you haven't paid yet!")],
    title_keys: [t("Aquí | tiene | las | llaves, | la | factura | endosada | a | su | nombre | y | la | tarjeta | de | circulación. | Es | todo | suyo.",
      "Here | you have | the | keys, | the | invoice | signed over | in | your | name | and | the | card | of | circulation. | It's | all | yours.",
      "Here are the keys, the factura signed over to you and the registration card. She's all yours.", { flags: { 5: F_FACTURA, 6: "endosada: signed over on its back to the new owner.", 12: F_TARJETA } })],
    be_good: [t("Trátelo | bien. | Le encanta | la | carretera | de | la | costa.", "Treat it | well. | It loves | the | road | of | the | coast.", "Be good to her. She loves the coast road.")],
    all_yours: [t("¡Ya | es | todo | suyo!", "Now | it's | all | yours!", "She's all yours now!")],
    bye_deal: [
      t("Fue | un | placer | hacer | negocios | con | usted.", "It was | a | pleasure | to do | business | with | you.", "It was a pleasure doing business with you."),
      t("¡Que | lo | disfrute!", "(I hope) | it | you enjoy!", "Enjoy her!"),
    ],
    pleasure_too: [t("¡El | gusto | fue | mío!", "The | pleasure | was | mine!", "The pleasure was mine!")],
    know_you_will: [t("Sé | que | sí.", "I know | that | (you will).", "I know you will.")],
    you_too: [t("¡Igualmente!", "Likewise!", "You too!")],
    see_around: [t("¡Cuídese!", "Take care!", "Take care!"), t("¡Que | tenga | buen | día!", "(I hope) | you have | a good | day!", "Have a nice day!")],
    ack: [t("Muy | bien.", "Very | good.", "Okay."), t("Claro.", "Sure.", "Sure.")],
  },

  domains: {
    price: () => Array.from({ length: 13 }, (_, i) => (70000 + 1250 * i) * 100),
    amount: () => Array.from({ length: 14 }, (_, i) => (50000 + 2500 * i) * 100),
  },

  hints: {
    arrive: {
      lt: "Say you've come about the ad",
      items: [
        { id: "saw_ad", s: t("Vi | su | anuncio | en | internet.", "I saw | your | ad | on | the internet.", "I saw your ad online.") },
        { id: "about_ad", s: t("¡Buenas tardes! | Vengo | por | el | carro.", "Good afternoon! | I've come | about | the | car.", "Good afternoon! I'm here about the car.",
          { flags: { 4: F_CARRO }, neutral: t("¡Buenas tardes! | Vengo | por | el | auto.", "Good afternoon! | I've come | about | the | car.", "Good afternoon! I'm here about the car.") }) },
        { id: "still_for_sale", s: t("¿Todavía | está | en venta?", "Still | is it | for sale?", "Is it still for sale?") },
        { id: "im_name", s: t("Soy | {$name}.", "I'm | {$name}.", "I'm {$name}.") },
      ],
    },
    look: {
      lt: "Compliment the car",
      items: [
        { id: "seats", s: t("Los | asientos | se ven | muy | bien.", "The | seats | look | very | good.", "The seats look great.") },
        { id: "beauty", s: t("¡Es | una | belleza!", "It's | a | beauty!", "She's a beauty!") },
      ],
    },
    ask: {
      lt: "Ask about the car",
      items: [
        { id: "q_miles", s: t("¿Cuántos | kilómetros | tiene?", "How many | kilometers | does it have?", "How many kilometers does it have?"), note: "Mexico counts in kilometers, not miles." },
        { id: "q_accident", s: t("¿Ha tenido | algún | choque?", "Has it had | any | crash?", "Has it ever been in an accident?") },
        { id: "q_why", s: t("¿Por qué | lo | vende?", "Why | it | are you selling?", "Why are you selling it?") },
        { id: "q_problems", s: t("¿Tiene | algún | problema?", "Does it have | any | problem?", "Does it have any problems?") },
        { id: "q_papers", s: t("¿Tiene | los | papeles | en regla?", "Do you have | the | papers | in order?", "Are all the papers in order?"),
          note: "The key paper is the factura original: the first sales invoice, signed over to each new owner." },
        { id: "q_fees", s: t("¿Está | al corriente | con | el | refrendo?", "Is it | up to date | with | the | registration fee?", "Is the yearly registration fee paid up?"),
          note: "Mexican states charge a yearly fee for every car (el refrendo; in some states also la tenencia). Ask if it's paid." },
        { id: "q_service", s: t("¿Tiene | el | historial | de | servicios?", "Do you have | the | history | of | services?", "Do you have the service records?") },
        { id: "q_fuel", s: t("¿Cuánto | gasta | de | gasolina?", "How much | does it use | of | gas?", "How much gas does it use?") },
      ],
    },
    drive: {
      lt: "Ask for a test drive",
      items: [
        { id: "round_block", s: t("¿Puedo | darle | una | vuelta | a | la | manzana?", "Can I | give it | a | spin | around | the | block?", "Can I take it around the block?") },
        { id: "test_drive", s: t("¿Puedo | hacer | una | prueba de manejo?", "Can I | do | a | test drive?", "Can I test-drive it?") },
        { id: "drive_first", s: t("¿Lo | puedo | manejar | primero?", "It | can I | drive | first?", "Could I drive it first?") },
        { id: "trust", s: t("No hace falta. | Confío | en | usted.", "It's not needed. | I trust | in | you.", "No need. I trust you.") },
      ],
    },
    opinion: {
      lt: "Say how it drove",
      items: [
        { id: "drives_nicely", s: t("Se maneja | muy | bien.", "It drives | very | well.", "It drives really nicely.") },
        { id: "seats", s: t("Los | asientos | se ven | muy | bien.", "The | seats | look | very | good.", "The seats look great.") },
        { id: "brakes_soft", s: t("Los | frenos | se sienten | un poco | suaves.", "The | brakes | feel | a little | soft.", "The brakes feel a little soft.") },
      ],
    },
    talk: {
      lt: "Start talking about the price",
      items: [
        { id: "lets_talk", s: t("Bueno… | hablemos | de | números.", "Okay… | let's talk | about | numbers.", "Okay… let's talk.") },
        { id: "more_than_hoping", s: t("Es | un poco | más | de | lo que | quería | gastar.", "It's | a little | more | than | what | I wanted | to spend.", "That's a bit more than I was hoping to spend.") },
        { id: "flex", s: t("¿El | precio | es | negociable?", "The | price | is it | negotiable?", "Is there any flexibility on the price?") },
        { id: "bit_much", s: t("Se me hace | un poco | caro.", "It seems to me | a little | expensive.", "That's a bit much for me."), note: "Se me hace = it seems to me: a soft, very Mexican way to object." },
        { id: "best_price", s: t("¿Cuál | es | su | último | precio?", "What | is | your | last | price?", "What's your best price?"), note: "Very common in Mexico, at the market and in private sales." },
      ],
    },
    offer: {
      lt: "Make your offer",
      items: [
        { id: "along_lines", s: t("Estaba | pensando | más bien | en | 70 | mil.", "I was | thinking | rather | about | 70 | thousand.", "I was thinking more along the lines of 70,000.",
          { say: "Estaba pensando más bien en setenta mil." }), note: "In a car sale, people say the thousands: setenta mil, or just setenta." },
        { id: "consider", s: t("¿Me lo | deja | en | 75 | mil?", "It to me | will you let go | for | 75 | thousand?", "Would you let it go for 75,000?",
          { say: "¿Me lo deja en setenta y cinco mil?", flags: { 1: F_DEJAR } }), note: "¿Me lo deja en…? is the usual Mexican way to propose a price." },
        { id: "what_if", s: t("¿Y | si | lo | dejamos | en | 72 | mil?", "And | if | it | we leave | at | 72 | thousand?", "What if we said 72,000?", { say: "¿Y si lo dejamos en setenta y dos mil?" }) },
        { id: "can_offer", s: t("Le | ofrezco | 70 | mil.", "(To) you | I offer | 70 | thousand.", "I can offer you 70,000.", { say: "Le ofrezco setenta mil." }) },
        { id: "cash_offer", s: t("Puedo | pagar | en efectivo | hoy.", "I can | pay | in cash | today.", "I can pay cash today.") },
        { id: "do_better_price", s: t("¿Puede | mejorar | el | precio?", "Can you | improve | the | price?", "Can you do any better on the price?") },
      ],
    },
    push: {
      lt: "Push on: halfway, her lowest price",
      items: [
        { id: "halfway", s: t("¿Y | si | nos quedamos | a la mitad?", "And | if | we settle | halfway?", "What if we met halfway?") },
        { id: "little_from_you", s: t("Un poco | usted | y | un poco | yo.", "A little | you | and | a little | me.", "A little from you, a little from me.") },
        { id: "best_offer", s: t("¿Es | su | mejor | oferta?", "Is it | your | best | offer?", "Is that your best offer?") },
        { id: "lo_menos", s: t("¿Cuánto | es | lo menos?", "How much | is | the lowest?", "What's the lowest you'll go?"), note: "The classic Mexican question for a seller's lowest price." },
        { id: "do_better", s: t("¿Me lo | puede | dejar | en | menos?", "It to me | can you | let go | for | less?", "Can you do any better?") },
        { id: "split", s: t("¿Partimos | la | diferencia?", "Shall we split | the | difference?", "Let's split the difference.") },
      ],
    },
    flaw_ac: {
      lt: "Use the AC problem",
      items: [
        { id: "ac_point", s: t("Pero | el | aire | acondicionado | no sirve, | así que…", "But | the | air | conditioning | doesn't work, | so…", "But the AC doesn't work, so…") },
        { id: "ac_cost", s: t("Arreglar | el | aire | me | va | a | costar | dinero.", "Fixing | the | AC | (to) me | is going | to | cost | money.", "Fixing the AC will cost me money.") },
      ],
    },
    flaw_brakes: {
      lt: "Use the brakes",
      items: [
        { id: "brakes_work", s: t("Pero | los | frenos | necesitan | servicio, | así que…", "But | the | brakes | need | service, | so…", "But the brakes need some work, so…") },
      ],
    },
    decide: {
      lt: "Agree, think it over or say no politely",
      items: [
        { id: "works_for_me", s: t("Me parece | bien.", "It seems to me | fine.", "That works for me.") },
        { id: "deal", s: t("¡Trato hecho!", "Deal!", "We have a deal.") },
        { id: "sleep_on_it", s: t("Déjeme | consultarlo | con | la | almohada.", "Let me | consult it | with | the | pillow.", "Let me sleep on it."), note: "Consultarlo con la almohada: to sleep on it." },
        { id: "afraid_more", s: t("Lo siento, | sigue | siendo | más | de | lo que | puedo | gastar.", "I'm sorry, | it goes on | being | more | than | what | I can | spend.", "I'm afraid that's still more than I can spend.") },
        { id: "thanks_time", s: t("Gracias | por | su | tiempo | de todos modos.", "Thanks | for | your | time | anyway.", "Thanks for your time anyway.") },
      ],
    },
    shake: {
      lt: "Shake hands",
      items: [
        { id: "shake", s: t("Démonos | la | mano.", "Let's give each other | the | hand.", "Let's shake on it.") },
        { id: "deal", s: t("¡Trato hecho!", "Deal!", "We have a deal.") },
        { id: "ill_take", s: t("¡Me lo llevo!", "I'll take it!", "I'll take it!") },
      ],
    },
    pay: {
      lt: "Say how you'll pay",
      items: [
        { id: "pay_cash_p", s: t("Le | pago | en efectivo.", "(To) you | I'll pay | in cash.", "I'll pay cash.") },
        { id: "pay_transfer", s: t("¿Le | puedo | pagar | por | transferencia?", "(To) you | can I | pay | by | transfer?", "Can I pay by bank transfer?") },
        { id: "pay_check", s: t("¿Le sirve | un | cheque de caja?", "Does it work for you | a | cashier's check?", "Is a cashier's check okay?") },
      ],
    },
    bye: {
      lt: "Say thank you and goodbye",
      items: [
        { id: "pleasure", s: t("Fue | un | placer | hacer | negocios | con | usted.", "It was | a | pleasure | to do | business | with | you.", "It was a pleasure doing business with you.") },
        { id: "look_after", s: t("Le | prometo | que | lo | voy | a | cuidar.", "(To) you | I promise | that | it | I'm going | to | look after.", "I promise to look after her.") },
        { id: "thanks_so_much", s: t("¡Muchísimas | gracias!", "Very many | thanks!", "Thank you so much!") },
        { id: "thanks_time", s: t("Gracias | por | su | tiempo | de todos modos.", "Thanks | for | your | time | anyway.", "Thanks for your time anyway.") },
      ],
    },
  },

  tips: TIPS,

  merges: {
    "la verdad": { reason: "lexical_expression", split: "la → the + verdad → truth; as an opener = honestly.", minimal: "Two words." },
    "un poco": { reason: "lexical_expression", split: "un → a + poco → little reads as a noun phrase; the degree adverb = a little.", minimal: "Two words." },
    "un poquito": { reason: "lexical_expression", split: "un → a + poquito → little bit; the degree adverb = a little.", minimal: "Two words." },
    "ha dejado": { reason: "grammatical_fusion", split: "ha → has + dejado → left: one English verb form, has left.", minimal: "Auxiliary and participle." },
    "han pintado": { reason: "grammatical_fusion", split: "han → they have + pintado → painted: one English verb form.", minimal: "Auxiliary and participle." },
    "ha tenido": { reason: "grammatical_fusion", split: "ha → has + tenido → had: one English verb form, has had.", minimal: "Auxiliary and participle." },
    "me mudo": { reason: "grammatical_fusion", split: "me → myself + mudo → I move is a word-for-word reading of mudarse = to move (house).", minimal: "Pronoun and verb." },
    "por lo menos": { reason: "lexical_expression", split: "por → for + lo → it + menos → less is a word salad; = at least.", minimal: "Three words." },
    "para ser honesta": { reason: "lexical_expression", split: "para → for + ser → to be + honesta → honest; the set phrase = to be honest.", minimal: "Three words." },
    "antes de": { reason: "lexical_expression", split: "antes → before + de → of leaves a stray of; the preposition = before.", minimal: "Two words." },
    "lo sé": { reason: "grammatical_fusion", split: "lo → it + sé → I know: English says just I know.", minimal: "Pronoun and verb." },
    "de veras": { reason: "lexical_expression", split: "de → of + veras → truths is false; the question = really?", minimal: "Two words." },
    "en la mañana": { reason: "lexical_expression", split: "en → in + la → the + mañana → morning; one time phrase = in the morning.", minimal: "Three words." },
    "de maravilla": { reason: "lexical_expression", split: "de → of + maravilla → marvel; the adverb = wonderfully.", minimal: "Two words." },
    "de regreso": { reason: "lexical_expression", split: "de → of + regreso → return; = back (returned).", minimal: "Two words." },
    "más bien": { reason: "lexical_expression", split: "más → more + bien → well is false; = rather, more like.", minimal: "Two words." },
    "lo menos": { reason: "lexical_expression", split: "lo → it + menos → less is false; = the least (the lowest price).", minimal: "Two words." },
    "a la mitad": { reason: "lexical_expression", split: "a → to + la → the + mitad → half; the phrase = halfway.", minimal: "Three words." },
    "ahora sí": { reason: "lexical_expression", split: "ahora → now + sí → yes is false; = now (at last).", minimal: "Two words." },
    "tiene razón": { reason: "lexical_expression", split: "tiene → you have + razón → reason is false; = you're right.", minimal: "Two words." },
    "trato hecho": { reason: "lexical_expression", split: "trato → deal + hecho → made reads as a noun phrase; the exclamation = deal!", minimal: "Two words." },
    "entre nos": { reason: "lexical_expression", split: "entre → between + nos → us (an old form); = between us.", minimal: "Two words." },
    "ni se le ocurra": { reason: "lexical_expression", split: "ni → not even + se le ocurra → it occur to you is a word salad; = don't you dare.", minimal: "Four words." },
    "hoy mismo": { reason: "lexical_expression", split: "hoy → today + mismo → same is false; = this very day.", minimal: "Two words." },
    "cambia de opinión": { reason: "lexical_expression", split: "cambia → you change + de → of + opinión → opinion; = you change your mind.", minimal: "Three words." },
    "enfrente de": { reason: "lexical_expression", split: "enfrente → opposite + de → of leaves a stray of; the preposition = in front of.", minimal: "Two words." },
    "cheque de caja": { reason: "lexical_expression", split: "cheque → check + de → of + caja → box/register misreads the bank term: a cashier's check.", minimal: "Three words." },
    "prueba de manejo": { reason: "lexical_expression", split: "prueba → test + de → of + manejo → driving; the compound = a test drive.", minimal: "Three words." },
    "en regla": { reason: "lexical_expression", split: "en → in + regla → rule; said of papers = in order.", minimal: "Two words." },
    "al corriente": { reason: "lexical_expression", split: "al → to the + corriente → current is false; said of payments = up to date.", minimal: "Two words." },
    "en venta": { reason: "lexical_expression", split: "en → in + venta → sale; = for sale.", minimal: "Two words." },
    "no me ha hecho": { reason: "grammatical_fusion", split: "no → not + me → me + ha hecho → has made: one English verb phrase, you haven't made me.", minimal: "Negation, pronoun and the perfect." },
    "no me ha pagado": { reason: "grammatical_fusion", split: "no → not + me → me + ha pagado → has paid: one English verb phrase, you haven't paid me.", minimal: "Negation, pronoun and the perfect." },
    "no hace falta": { reason: "grammatical_fusion", split: "no → not + hace → makes + falta → lack is a word salad; = it's not needed.", minimal: "Three words." },
    "de todos modos": { reason: "lexical_expression", split: "de → of + todos → all + modos → ways; = anyway.", minimal: "Three words." },
    "así que": { reason: "lexical_expression", split: "así → thus + que → that; the connector = so.", minimal: "Two words." },
    "se me hace": { reason: "grammatical_fusion", split: "se → itself + me → to me + hace → makes is false; Mexican se me hace = it seems to me.", minimal: "Three words." },
    "nos quedamos": { reason: "grammatical_fusion", split: "nos → ourselves + quedamos → we stay; quedarse en = to settle on (a price).", minimal: "Pronoun and verb." },
    "me lo llevo": { reason: "lexical_expression", split: "me → myself + lo → it + llevo → I carry is a false literal; the set phrase = I'll take it.", minimal: "Three words." },
    "le sirve": { reason: "grammatical_fusion", split: "le → to you + sirve → serves suggests service; the question = does it work for you.", minimal: "Pronoun and verb." },
  },

  // ---------------------------------------------------------------------------------------------------

  mission: [
    { lt: "Say you've come about the ad", done: (c) => !!c.s.arrived },
    { lt: "Ask about the car (kilometers, crashes, the papers, why she's selling)", optional: true,
      when: (c) => !c.s.talked && !c.s.drove && !c.s.driveDeclined && !c.s.lookDone, done: (c) => c.s.qCount >= 1 },
    { lt: "Take it for a test drive", optional: true, when: (c) => !c.s.talked || !!c.s.drove || !!c.s.driveDeclined, done: (c) => !!c.s.drove || !!c.s.driveDeclined },
    { lt: "Start talking about the price", done: (c) => !!c.s.talked },
    { lt: "Make your offer", optional: true, when: (c) => !c.s.outcome, done: (c) => !!c.s.offered },
    { lt: "Agree on a price, or say no politely", done: (c) => !!c.s.outcome },
    { lt: "Agree how you'll pay", optional: true, when: (c) => c.s.outcome === "deal", done: (c) => !!c.s.paid },
  ],

  steps: [
    { id: "arrive", when: (c) => !c.s.arrived, done: (c) => !!c.s.arrived,
      ask: (c) => c.say("ad_again"),
      expects: ["about_ad", "my_name", "im_name_ctx", "compliment_car"],
      suggest: [{ lt: "Say you've come about the ad", hint: "arrive" }, { lt: "Compliment the car", hint: "look" }],
      yes: (c) => { if (arrive(c)) c.say("maggie_name"); },
      no: (c) => {
        if (!c.s.notAd) { c.s.notAd = true; c.say("not_ad"); c.hold(); return; }
        c.say("see_around"); c.end();
      },
      help: (c) => c.say("ad_again") },
    { id: "look", when: (c) => !!c.s.arrived && !c.s.talked && !c.s.drove && !c.s.driveDeclined, done: (c) => !!c.s.lookDone || c.s.qCount >= 3,
      ask: (c) => lookAsk(c),
      expects: ["q_mileage", "q_year", "q_owners", "q_owned", "q_paint", "q_hood", "q_accident", "q_why", "q_service", "q_papers", "q_problems", "q_ac", "q_engine", "q_gearbox",
        "q_fuel", "q_trunk", "q_top", "q_radio", "q_tires", "q_seats", "q_mechanic", "compliment_car", "no_more_q", "my_name", "im_name_ctx", "test_drive", "decline_drive", "lets_talk",
        "ask_price", "ask_flex", "too_high", "make_offer"],
      suggest: [{ lt: "Ask about the car", hint: "ask" }, { lt: "Compliment the car", hint: "look" }, { lt: "Ask for a test drive", hint: "drive" }],
      yes: (c) => { c.say("ask_what"); c.hold(); },
      no: (c) => { c.s.lookDone = true; },
      help: (c) => c.say("a_hint") },
    // before the price talk; once it has started, only "¿Quiere manejarlo primero?" after the price (tellPrice)
    { id: "drive", when: (c) => !!c.s.arrived && !c.s.drove && !c.s.driveDeclined && !c.s.talked, done: (c) => !!c.s.drove || !!c.s.driveDeclined,
      ask: (c) => { c.s.driveOffered = (c.s.driveOffered ?? 0) + 1; c.say("drive_offer"); },
      expects: ["test_drive", "decline_drive", "lets_talk", "ask_price", "ask_flex", "too_high", "make_offer"],
      suggest: [S_DRIVE, S_TALK],
      yes: (c) => startDrive(c), no: (c) => declineDrive(c),
      help: (c) => c.say("drive_offer") },
    { id: "opinion", when: (c) => !!c.s.drove && !c.s.opinion && !c.s.talked, done: (c) => !!c.s.opinion,
      ask: (c) => { c.say(c.s.backSaid ? "opinion_again" : "drive_back"); c.s.backSaid = true; },
      expects: ["drive_good", "drive_bad", "compliment_car"],
      suggest: [{ lt: "Say how it drove", hint: "opinion" }],
      yes: (c) => H.drive_good(c, {}, { intent: "drive_good", slots: {}, tags: [] }),
      no: (c) => { if (!once(c, "opinion")) return; c.s.opinion = true; c.say("drive_bad_react"); afterOpinion(c); },
      help: (c) => c.say("opinion_again") },
    // Margarita invites the price talk; the learner starts it (the song's "Bueno… hablemos")
    { id: "talk", when: (c) => !!c.s.arrived && !c.s.talked, done: (c) => !!c.s.talked,
      ask: (c) => c.say("talk_prompt"),
      expects: NEG, suggest: [S_TALK, S_OFFER],
      yes: (c) => tellPrice(c),
      no: (c) => {
        if (!c.s.talkNo) { c.s.talkNo = true; c.say("g_take_time"); c.hold(); return; }
        walkAway(c, false);
      },
      help: (c) => c.say(c.s.talked ? "price_reask" : "talk_ask", P(c)) },
    { id: "haggle", when: (c) => !!c.s.talked && !c.s.finalMade && !c.s.outcome, done: () => false,
      ask: (c) => { c.say("price_reask", P(c)); pendPrice(c); },
      expects: NEG, suggest: [S_OFFER, S_PUSH, S_DECIDE], help: (c) => { c.say("need_offer"); pendOffer(c); } },
    { id: "decide", when: (c) => !!c.s.finalMade && !c.s.outcome, done: () => false,
      ask: (c) => { c.say("final_reask"); pendFinal(c); },
      expects: NEG, suggest: [S_DECIDE, S_PUSH], help: (c) => { c.say("final_reask_p", P(c)); pendFinal(c); } },
    { id: "pay", when: (c) => c.s.outcome === "deal" && !c.s.paid, done: (c) => !!c.s.paid,
      ask: (c) => {
        if (!c.s.payAsked && c.s.cash) { c.s.payAsked = "cash"; c.say("cash_reminder"); return; }
        if (c.s.payAsked) { c.say("pay_reask"); return; }
        c.s.payAsked = "how";
        c.say("ask_pay");
      },
      expects: ["pay_cash", "pay_transfer", "pay_check", "pay_card", "cash_lever", "no_cash"],
      suggest: [{ lt: "Say how you'll pay", hint: "pay" }],
      yes: (c) => { if (c.s.payAsked === "cash") paid(c, "pay_cash_r", "cash"); else payOptions(c); },
      no: (c) => { if (c.s.payAsked === "cash") c.s.cash = false; payOptions(c); },
      help: (c) => { c.s.optionsSaid = true; c.say("pay_options"); } },
  ],

  init: (c) => {
    c.s.known = c.visits >= 1;
    c.s.cur = ASK;
    c.s.off = 0;
    c.s.conc = 0;
    c.s.moves = 0;
    c.s.qCount = 0;
    c.s.asked = {};
    c.s.throwIn = c.pick(THROW_INS);
    let tw: string | null = c.chance(0.45) ? "ac_flaw" : c.chance(0.65) ? "rival_buyer" : null;
    // a replay prefers the twist not seen yet
    const seen: string[] = c.memory.twists ?? [];
    if (c.visits >= 1 && tw && seen.includes(tw)) tw = ["ac_flaw", "rival_buyer"].find((x) => !seen.includes(x)) ?? tw;
    c.s.twist = tw;
  },

  start: (c) => {
    c.say(c.s.known ? "intro_again" : "greet_new");
    c.hold();
  },

  handlers: H,

  finish: (c) => {
    const twists = [...new Set([...(c.memory.twists ?? []), ...(c.s.flawFired ? ["ac_flaw"] : []), ...(c.s.rival ? ["rival_buyer"] : [])])];
    if (c.s.outcome === "deal") {
      c.say("title_keys"); c.say("be_good");
      c.event("give", { item: "car-keys" });
      c.complete();
      c.remember({ carBought: true, carPrice: c.s.dealPrice, carExtra: c.s.thrown ? c.s.throwIn : null, twists });
    } else if (c.s.outcome) {
      c.complete();
      c.remember({ carBought: false, twists });
    }
    c.expect({ id: "closing", optional: true, expects: ["pleasure", "look_after", "thanks_so_much"], hints: ["bye"],
      suggest: [{ lt: "Say thank you and goodbye", hint: "bye" }],
      on: {
        g_thanks: (cc) => { closeBye(cc); }, g_bye: (cc) => { closeBye(cc); }, thanks_so_much: (cc) => { closeBye(cc); },
        pleasure: (cc, sl, sg) => { H.pleasure(cc, sl, sg); }, look_after: (cc, sl, sg) => { H.look_after(cc, sl, sg); },
        walk_away: (cc) => { closeBye(cc); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // arriving (hint patterns first)
    { say: "Vi su anuncio en internet.", intent: "about_ad", step: "arrive" },
    { say: "¡Buenas tardes! Vengo por el carro.", intent: "about_ad", step: "arrive" },
    { say: "¡Buenas tardes! Vengo por el auto.", intent: "about_ad", step: "arrive" },
    { say: "¿Todavía está en venta?", intent: "about_ad", step: "arrive" },
    { say: "¿Sigue disponible el coche?", intent: "about_ad", step: "arrive" },
    { say: "Soy Ryan.", intent: "im_name_ctx", step: "arrive", slots: { name: "Ryan" } },
    { say: "Me llamo Ryan.", intent: "my_name" },
    { say: "Soy nuevo aquí.", intent: "none", step: "arrive" },
    { say: "Los asientos se ven muy bien.", intent: "compliment_car" },
    { say: "¡Es una belleza!", intent: "compliment_car" },
    // questions
    { say: "¿Cuántos kilómetros tiene?", intent: "q_mileage", step: "look" },
    { say: "¿Cuantas millas tiene?", intent: "q_mileage", step: "look" },
    { say: "¿Ha tenido algún choque?", intent: "q_accident", step: "look" },
    { say: "¿Por qué lo vende?", intent: "q_why", step: "look" },
    { say: "¿Tiene algún problema?", intent: "q_problems", step: "look" },
    { say: "¿Tiene los papeles en regla?", intent: "q_papers", step: "look" },
    { say: "¿Está al corriente con el refrendo?", intent: "q_papers", step: "look" },
    { say: "¿Debe tenencias?", intent: "q_papers", step: "look" },
    { say: "¿Tiene el historial de servicios?", intent: "q_service", step: "look" },
    { say: "¿Cuánto gasta de gasolina?", intent: "q_fuel", step: "look" },
    { say: "¿Es automático?", intent: "q_gearbox", step: "look" },
    { say: "¿Me puede abrir el cofre?", intent: "q_hood", step: "look" },
    { say: "¿Es grande el maletero?", intent: "q_trunk", step: "look" },
    { say: "¿Funciona el aire?", intent: "q_ac", step: "look" },
    { say: "No, es todo, gracias.", intent: "no_more_q", step: "look" },
    // the drive
    { say: "¿Puedo darle una vuelta a la manzana?", intent: "test_drive" },
    { say: "¿Puedo hacer una prueba de manejo?", intent: "test_drive" },
    { say: "¿Lo puedo manejar primero?", intent: "test_drive" },
    { say: "¿Puedo conducirlo?", intent: "test_drive" },
    { say: "No hace falta. Confío en usted.", intent: "decline_drive", step: "drive" },
    { say: "No quiero manejarlo.", intent: "decline_drive", not: ["test_drive"], step: "drive" },
    { say: "Se maneja muy bien.", intent: "drive_good", step: "opinion" },
    { say: "Los frenos se sienten un poco suaves.", intent: "drive_bad", step: "opinion" },
    { say: "No se maneja bien.", intent: "none", step: "opinion" },
    // the price talk
    { say: "Bueno… hablemos de números.", intent: "lets_talk" },
    { say: "Es un poco más de lo que quería gastar.", intent: "too_high" },
    { say: "¿El precio es negociable?", intent: "ask_flex" },
    { say: "Se me hace un poco caro.", intent: "too_high" },
    { say: "¡Está carísimo!", intent: "too_high" },
    { say: "¿Cuál es su último precio?", intent: "ask_best" },
    { say: "Estaba pensando más bien en setenta mil.", intent: "make_offer", slots: { mxn: 70000 } },
    { say: "Estaba pensando más bien en setenta.", intent: "make_offer", slots: { mxn: 70000 } },
    { say: "¿Me lo deja en setenta y cinco mil?", intent: "make_offer", slots: { mxn: 75000 } },
    { say: "¿Y si lo dejamos en setenta y dos mil?", intent: "make_offer", slots: { mxn: 72000 } },
    { say: "Le ofrezco 70 mil.", intent: "make_offer", slots: { mxn: 70000 } },
    { say: "¿Me lo dejas en $72,500?", intent: "make_offer", slots: { mxn: 72500 } },
    { say: "No puedo pagar más de setenta mil.", intent: "make_offer", slots: { mxn: 70000 } },
    { say: "Tiene 160 mil kilómetros, ¿verdad?", intent: "none" },
    { say: "Puedo pagar en efectivo hoy.", intent: "cash_lever" },
    { say: "¿Puede mejorar el precio?", intent: "ask_better" },
    { say: "¿Y si nos quedamos a la mitad?", intent: "halfway" },
    { say: "Un poco usted y un poco yo.", intent: "halfway" },
    { say: "¿Es su mejor oferta?", intent: "ask_best" },
    { say: "¿Cuánto es lo menos?", intent: "ask_best" },
    { say: "¿Me lo puede dejar en menos?", intent: "ask_better" },
    { say: "¿Partimos la diferencia?", intent: "halfway" },
    { say: "Pero el aire acondicionado no sirve, así que…", intent: "use_flaw" },
    { say: "Arreglar el aire me va a costar dinero.", intent: "use_flaw" },
    { say: "Pero los frenos necesitan servicio, así que…", intent: "use_flaw" },
    { say: "Déjeme consultarlo con la almohada.", intent: "sleep_on_it" },
    { say: "¡Trato hecho!", intent: "accept_deal" },
    { say: "Vale, trato hecho.", intent: "accept_deal" },
    { say: "¡Me lo llevo!", intent: "accept_deal" },
    { say: "No me lo llevo.", intent: "walk_away", not: ["accept_deal"] },
    { say: "Lo siento, sigue siendo más de lo que puedo gastar.", intent: "walk_away" },
    { say: "Gracias por su tiempo de todos modos.", intent: "walk_away" },
    { say: "¡Ni loco!", intent: "walk_rude" },
    { say: "Es una carcacha.", intent: "rude_car" },
    { say: "No es un robo.", intent: "none" },
    { say: "No tengo efectivo.", intent: "no_cash", not: ["cash_lever", "pay_cash"] },
    // paying and the goodbye
    { say: "Démonos la mano.", intent: "shake" },
    { say: "Le pago en efectivo.", intent: "pay_cash", step: "pay" },
    { say: "¿Le puedo pagar por transferencia?", intent: "pay_transfer" },
    { say: "¿Le sirve un cheque de caja?", intent: "pay_check" },
    { say: "¿Puedo pagar con tarjeta?", intent: "pay_card" },
    { say: "No le pago en efectivo.", intent: "none" },
    { say: "Fue un placer hacer negocios con usted.", intent: "pleasure" },
    { say: "Le prometo que lo voy a cuidar.", intent: "look_after" },
    { say: "¡Muchísimas gracias!", intent: "thanks_so_much" },
    // review (4 Nov 2026): traps and the forms the blind set found
    { say: "No le voy a dar ochenta mil.", intent: "too_high", not: ["make_offer", "make_offer_ctx", "accept_deal"] },
    { say: "No hace falta manejarlo, gracias.", intent: "decline_drive", not: ["test_drive"], step: "drive" },
    { say: "¿Le puedo dar una vuelta?", intent: "test_drive" },
    { say: "No está mal, pero hace un ruido raro.", intent: "drive_bad", not: ["drive_good"], step: "opinion" },
    { say: "¿Qué tal si lo dejamos a la mitad?", intent: "halfway", not: ["make_offer"] },
    { say: "Si le pago en efectivo, ¿me hace un descuento?", intent: "cash_lever", not: ["pay_cash"] },
    { say: "Me lo llevo si me lo deja en setenta.", intent: "make_offer", slots: { mxn: 70000 }, not: ["accept_deal"] },
    { say: "¿Es lo menos que me puede dejar?", intent: "ask_best" },
    { say: "¿Tiene tenencias pendientes?", intent: "q_papers", step: "look" },
    { say: "¿Me deja llevarlo con mi mecánico?", intent: "q_mechanic", step: "look" },
    { say: "No quiero pagar en efectivo.", intent: "no_cash", not: ["pay_cash", "cash_lever"] },
    { say: "En efectivo no, por transferencia.", intent: "pay_transfer", not: ["pay_cash"] },
    { say: "Mejor en efectivo.", intent: "pay_cash", step: "pay" },
    // lead's check (4 Nov 2026): no cash said without its comma pays nothing; refusals, numbers
    { say: "No en efectivo.", intent: "no_cash", not: ["pay_cash", "cash_lever"], step: "pay" },
    { say: "Mejor no en efectivo.", intent: "no_cash", not: ["pay_cash", "cash_lever", "decline_drive"], step: "pay" },
    { say: "Efectivo no.", intent: "no_cash", not: ["pay_cash", "cash_lever"], step: "pay" },
    { say: "Le pago con un cheque personal.", intent: "pay_check", step: "pay" },
    { say: "¿No me lo deja en setenta?", intent: "make_offer", slots: { mxn: 70000 } },
    { say: "Le doy setenta y dos mil y medio.", intent: "make_offer", slots: { mxn: 72500 }, not: ["halfway"] },
    { say: "No quiero comprarlo.", intent: "walk_away", not: ["accept_deal", "accept_ctx"] },
    { say: "No tengo ochenta mil.", intent: "too_high", not: ["make_offer", "make_offer_ctx", "accept_deal"] },
    { say: "Sigue siendo mucho dinero.", intent: "too_high", step: "haggle", not: ["walk_away", "accept_ctx"] },
    // unrelated
    { say: "Me gusta la pizza con piña.", intent: "none" },
    { say: "Mi perro se llama Max.", intent: "none" },
  ],

  sims: [
    { name: "the song: halfway, cash", turns: ["¡Hola! Vengo por el carro.", "¿Cuántos kilómetros tiene?", "No, es todo, gracias.", "¿Puedo darle una vuelta a la manzana?",
      "Se maneja muy bien.", "Bueno… hablemos de números.", "Es un poco más de lo que quería gastar. ¿El precio es negociable?",
      "Estaba pensando más bien en setenta.", "¿Y si nos quedamos a la mitad?", "Démonos la mano.", "Le pago en efectivo.", "Fue un placer hacer negocios con usted."],
      expect: { complete: true, state: { outcome: "deal", dealPrice: 73750, paid: true } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    { name: "questions, a price first, changes of mind", turns: ["Hola, vi su anuncio en internet.", "Me llamo Ryan.", "¿Por qué lo vende?",
      "¿Ha tenido algún choque?", "¿Tiene la factura original?", "¿Cuánto pide por él?", "No hace falta. Confío en usted.", "¿Me lo deja en setenta mil?", "Mejor sesenta y cinco mil.",
      "Bueno, setenta y cinco mil.", "¿Me lo puede dejar en menos?", "¿Es su mejor oferta?", "¡Me lo llevo!", "¿Puedo pagar con tarjeta?", "¿Le puedo pagar por transferencia?", "Gracias, hasta luego."],
      expect: { complete: true, state: { outcome: "deal", dealPrice: 75000, payMethod: "transfer" } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    { name: "the AC doesn't work (twist): using it", turns: ["¡Hola! Vengo por el carro.", "¿Tiene algún problema?", "No, es todo.", "Sí, me encantaría manejarlo.",
      "Se maneja muy bien.", "Pero el aire acondicionado no sirve, así que…", "¿Me lo deja en setenta y cinco mil?", "¿Y si nos quedamos a la mitad?", "¡Trato hecho!",
      "¿Le puedo pagar por transferencia?", "¡Muchísimas gracias!"],
      expect: { complete: true, state: { outcome: "deal", flawUsed: true, dealPrice: 76250 } }, auto: AUTO, setup: (s) => { s.twist = "ac_flaw"; } },
    { name: "the AC after the drive (twist): no problem", turns: ["¡Hola! ¿Todavía está en venta?", "No, es todo.", "¿Puedo hacer una prueba de manejo?", "¡Me encantó!",
      "No necesito aire acondicionado.", "¿Me lo deja en ochenta mil?", "Me parece bien.", "En efectivo.", "Gracias, hasta luego."],
      expect: { complete: true, state: { outcome: "deal", flawKnown: true, dealPrice: 80000 } }, auto: AUTO, setup: (s) => { s.twist = "ac_flaw"; } },
    { name: "another buyer (twist): ¡Ni se le ocurra!", turns: ["¡Hola! ¿Todavía está en venta?", "¿De qué año es?", "No, es todo, gracias.", "No hace falta. Confío en usted.",
      "¿El precio es negociable?", "Estaba pensando más bien en setenta.", "Déjeme consultarlo con la almohada.", "Me parece bien.", "Démonos la mano.", "Le pago en efectivo.", "Gracias, hasta luego."],
      expect: { complete: true, state: { outcome: "deal", rival: true, dealPrice: 72500 } }, auto: AUTO, setup: (s) => { s.twist = "rival_buyer"; } },
    { name: "sleep on it: ¡Espere! (no twist)", turns: ["¡Hola! Vengo por el carro.", "No tengo preguntas, gracias.", "Tal vez más tarde.", "¿Cuál es su último precio?", "Déjeme pensarlo.",
      "Bueno, ¡trato hecho!", "Démonos la mano.", "En efectivo.", "Gracias, hasta luego."],
      expect: { complete: true, state: { outcome: "deal", dealPrice: 72500, sleepUsed: true } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    { name: "a polite no, after her last chance", turns: ["¡Hola! Vengo por el carro.", "No tengo preguntas, gracias.", "No hace falta. Confío en usted.", "Se me hace un poco caro.",
      "Lo siento, sigue siendo más de lo que puedo gastar.", "Gracias por su tiempo de todos modos.", "¡Adiós!"],
      expect: { complete: true, state: { outcome: "walk" } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    { name: "too blunt: rude, then gone", turns: ["¡Hola! Vengo por el carro.", "¿Cuánto pide por él?", "No, no necesito manejarlo.", "¡Está carísimo!", "Es una carcacha.",
      "¡Ni loco!", "¡Olvídelo!"],
      expect: { complete: true, state: { outcome: "walk_rude" } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    { name: "full price, no haggling", turns: ["¡Hola! Vengo por el carro.", "¡Qué belleza!", "No, es todo.", "Sí, por favor.", "¡Me encantó!", "¡Me lo llevo!", "Sí, sin regatear.", "Démonos la mano.",
      "¿Le sirve un cheque de caja?", "Le prometo que lo voy a cuidar."],
      expect: { complete: true, state: { outcome: "deal", dealPrice: 85000, payMethod: "check" } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    { name: "lowball, backwards, cash", turns: ["Hola, ¿todavía está en venta?", "No tengo preguntas.", "No, gracias.", "¿Aceptaría treinta mil?", "Bueno, ¿qué tal setenta mil?", "Sesenta mil.",
      "Puedo pagar en efectivo hoy.", "¿Me lo puede dejar en menos?", "Está bien, setenta y cinco mil.", "Démonos la mano.", "Sí.", "Gracias, hasta luego."],
      expect: { complete: true, state: { outcome: "deal", cashUsed: true, dealPrice: 75000 } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    { name: "the price first, then the drive", turns: ["¡Hola! ¿Cuánto pide por el carro?", "Sí, por favor.", "Me robó el corazón.", "¿Me lo deja en setenta y cinco mil?",
      "¡Trato hecho!", "Démonos la mano.", "Por transferencia.", "¡Muchísimas gracias!"],
      expect: { complete: true, state: { outcome: "deal", drove: true, dealPrice: 80000 } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    { name: "halfway too early, then an offer", turns: ["¡Hola! Vengo por el carro.", "No tengo preguntas.", "No, gracias.", "Bueno… hablemos de números.", "¿Y si nos quedamos a la mitad?",
      "¿Me lo deja en setenta mil?", "¿Y si nos quedamos a la mitad?", "Démonos la mano.", "Por transferencia.", "Gracias, hasta luego."],
      expect: { complete: true, state: { outcome: "deal", dealPrice: 75000 } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    { name: "okay to the asking price? no haggling? no", turns: ["¡Hola! Vengo por el carro.", "No tengo preguntas.", "No, gracias.", "¿Cuánto es?", "Me parece bien.", "No, espere.",
      "Le doy setenta y cinco mil.", "Me parece bien.", "Démonos la mano.", "En efectivo.", "Gracias, hasta luego."],
      expect: { complete: true, state: { outcome: "deal", dealPrice: 80000 } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    // "¿Ochenta y cinco mil?" echoes her price (no yes); "¿Ochenta mil? Mmm. ¿Qué tal setenta y siete quinientos?" is an offer of 77,500
    { name: "an echo and the last number", turns: ["¡Hola! Vengo por el carro.", "No tengo preguntas.", "No, gracias.", "Bueno… hablemos de números.", "¿Ochenta y cinco mil?",
      "¿El precio es negociable?", "¿Ochenta mil? Mmm. ¿Qué tal setenta y siete quinientos?", "Démonos la mano.", "Le pago en efectivo.", "Gracias, hasta luego."],
      expect: { complete: true, state: { outcome: "deal", dealPrice: 77500 } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    // an offer straight from the questions: no drive (the drive item disappears), and the checklist is complete
    { name: "an offer before the drive", turns: ["¡Hola! Vengo por el carro.", "¿Por qué lo vende?", "¿Me lo deja en setenta mil?", "¿Es su mejor oferta?",
      "Me parece bien.", "Démonos la mano.", "Le pago en efectivo.", "Gracias, hasta luego."],
      expect: { complete: true, state: { outcome: "deal", dealPrice: 77500 } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    // her price said back with a no never buys the car
    { name: "an echo with a no: her last chance", turns: ["¡Hola! Vengo por el carro.", "No tengo preguntas.", "No, gracias.", "Bueno… hablemos de números.", "¿Ochenta y cinco mil? No puedo.",
      "Me parece bien.", "Démonos la mano.", "Le pago en efectivo.", "Gracias, hasta luego."],
      expect: { complete: true, state: { outcome: "deal", dealPrice: 72500, lastChance: true } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    // polite closings never buy the car (rule 17): "Está bien, gracias" gets the question again
    { name: "polite closings, then a ceiling", turns: ["¡Hola! Vengo por el carro.", "No tengo preguntas.", "No, gracias.", "Bueno… hablemos de números.", "Está bien, gracias.",
      "No quiero pagar más de setenta y siete mil quinientos.", "Me parece bien.", "Démonos la mano.", "¿Le doy un cheque?", "Gracias, hasta luego."],
      expect: { complete: true, state: { outcome: "deal", dealPrice: 80000, payMethod: "check" } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    // the brakes' $2,500, then the AC: it works (no AC fault this visit)
    { name: "the brakes, then the AC that works", turns: ["¡Hola! Vengo por el carro.", "No, es todo.", "¿Puedo darle una vuelta a la manzana?", "Los frenos se sienten un poco suaves.",
      "Bueno… hablemos de números.", "Pero los frenos necesitan servicio, así que…", "Pero el aire no sirve.", "¿Me lo deja en setenta y cinco mil?", "Me parece bien.",
      "Démonos la mano.", "Por transferencia.", "Gracias, hasta luego."],
      expect: { complete: true, state: { outcome: "deal", flawUsed: true, acOk: true, dealPrice: 77500, payMethod: "transfer" } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    { name: "the brakes, then the AC fault (twist): one discount", turns: ["¡Hola! Vengo por el carro.", "No, es todo.", "¿Puedo darle una vuelta a la manzana?",
      "Los frenos se sienten un poco suaves.", "Ay, no.", "Bueno… hablemos de números.", "Pero los frenos necesitan servicio, así que…", "Pero el aire no sirve.", "¿Y el precio?",
      "¿Y si le pago en efectivo?", "¿Me lo deja en ochenta mil?", "¡Trato hecho!", "En efectivo.", "Gracias, hasta luego."],
      expect: { complete: true, state: { outcome: "deal", flawAgain: "limit", cashUsed: true, dealPrice: 80000 } }, auto: AUTO, setup: (s) => { s.twist = "ac_flaw"; } },
    // the papers and a learner's Spain forms (coche, conducir, vale, the tú form)
    { name: "the papers, Spain forms", turns: ["Hola, vengo por el coche.", "¿Tiene la factura original?", "¿Está al corriente con la tenencia?", "Vale, es todo.", "¿Puedo conducirlo?",
      "Se maneja muy bien.", "¿Cuánto es lo menos?", "¿Me lo dejas en setenta y cinco mil?", "Vale, trato hecho.", "Démonos la mano.", "Por transferencia.", "Gracias."],
      expect: { complete: true, state: { outcome: "deal", dealPrice: 77500, payMethod: "transfer" } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    // review: "Está bien, gracias" and "¿Me lo llevo?" at "¿sin regatear?" ask again; "No quiero pagar en efectivo" offers the others
    { name: "closings at the confirm question, no cash", turns: ["¡Hola! Vengo por el carro.", "¡Me lo llevo!", "Está bien, gracias.", "¿Me lo llevo?", "No, espere.",
      "Le doy ochenta mil.", "Démonos la mano.", "No quiero pagar en efectivo.", "En efectivo no, por transferencia.", "Gracias, hasta luego."],
      expect: { complete: true, state: { outcome: "deal", dealPrice: 80000, cash: false, payMethod: "transfer" } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    // lead's check: a yes with a push after it, a condition, her price said back without a question mark (voice) and a
    // question never buy the car, and "No en efectivo" pays nothing (rules 10, 17)
    { name: "hedged yeses, a question, no cash", turns: ["¡Hola! Vengo por el carro.", "No tengo preguntas.", "No, gracias.", "Bueno… hablemos de números.",
      "Si me hace un descuento, me lo llevo.", "ochenta mil", "Me parece bien, pero es un poco caro.", "¿Me lo deja en setenta y cinco mil?", "¿Es un precio justo?", "Sí.",
      "Démonos la mano.", "No en efectivo.", "Por transferencia.", "Gracias, hasta luego."],
      expect: { complete: true, state: { outcome: "deal", dealPrice: 77500, cash: false, payMethod: "transfer" } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    // short answers all the way
    { name: "short answers", turns: ["¡Hola!", "Sí.", "No.", "Sí.", "¡Me encantó!", "Sí.", "Setenta mil.", "Setenta y dos mil quinientos.", "Sí.", "Sí.", "Efectivo.", "Gracias."],
      expect: { complete: true, state: { outcome: "deal", dealPrice: 77500, paid: true } }, auto: AUTO, setup: (s) => { s.twist = null; s.known = false; } },
    { name: "leaving before the price: not done", turns: ["¡Hola! Vengo por el carro.", "¿De qué año es?", "Gracias, hasta luego."],
      expect: { complete: false }, auto: AUTO, setup: (s) => { s.twist = null; } },
  ],
};

export default usedCar;
