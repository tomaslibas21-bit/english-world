// Song 78 "The Machine Ate My Card" → Banco del Puerto, Puerto Colibrí. Ricardo at the counter (usted).
// Keeps the base situation's agenda, intent IDs and twists (the ATM kept the card; the slow system).
// The brief: for movers and visitors: the ATM outside kept the card ("el cajero se tragó mi tarjeta"), ID, opening an
// account (a mover: passport or residence card, the CURP, a "comprobante de domicilio"), exchanging US dollars
// ("¿A cuánto está el dólar?" → "a diecisiete con veinte"), the turn ticket ("¿Turno A-27?").
// Mexico, how it goes: a numbered turn from the machine at the door; an official ID (passport or the residence card;
// a foreign driver's license isn't one); a proof of address no older than three months (a light, water or phone bill);
// the CURP (an 18-character population code, usually on the residence card); a cuenta de débito for everyday use
// and a cuenta de ahorro with interest; the PIN is the NIP; the CLABE (18 digits) for an employer's payroll deposits;
// many banks change dollars only for their customers, and only US dollars; a card kept by an ATM is not given back.
// Figures (a made-up local bank, Nov 2026, rounded; real banks vary): opening deposit $500; no monthly fee with an
// average balance of $3,000, otherwise $150; savings about 4% a year; an international transfer $750, one to three
// business days; the bank buys the dollar at $17.20 and sells it at $18.10. Cards: "ready in a few days, here at the
// branch" (kept vague).
// The shared yes list has "Me parece bien" and, since 2 Nov, "Sí / Claro, ¿por qué no?"; sure_ctx at this
// conversation's offers stays.
// Local guards (as in s71a): a what-if ("¿Y si cambio mil?") or a question ("¿Con quinientos alcanza?") never
// deposits, exchanges or pays out: the amount is quoted and asked again.

import type { Ctx, EntityDef, Pending, Segment, SituationDef, StepDef, Suggestion } from "@/content/types";
import { ent, t } from "@/content/dsl";
import { expectHowAreYou } from "@/content/global";

// ---------------------------------------------------------------------------
// Entities

const ACCTS: EntityDef[] = [
  ent("checking", "cuenta | de | débito", "account | of | debit", "f", { pl: "cuentas | de | débito", ltPl: "accounts | of | debit", chip: "cuenta de débito",
    forms: ["cuenta de debito", "de debito", "debito", "la de debito", "una de debito", "cuenta debito", "cuenta corriente", "corriente", "cuenta de cheques", "de cheques",
      "cuenta normal", "la normal", "una normal", "cuenta basica", "la basica", "una basica", "cuenta de nomina", "de nomina", "la de nomina", "cuenta para el dia a dia"],
    attrs: { nat: "checking account" } }),
  ent("savings", "cuenta | de | ahorro", "account | of | savings", "f", { pl: "cuentas | de | ahorro", ltPl: "accounts | of | savings", chip: "cuenta de ahorro",
    forms: ["cuenta de ahorro", "cuenta de ahorros", "de ahorro", "de ahorros", "ahorro", "ahorros", "la de ahorro", "una de ahorro", "la de ahorros", "cuenta de inversion", "de inversion"],
    attrs: { nat: "savings account" } }),
];

const DOCS: EntityDef[] = [
  ent("passport", "pasaporte", "passport", "m", { chip: "pasaporte",
    forms: ["pasaporte", "pasaportes", "pasaporte americano", "pasaporte canadiense", "pasaporte estadounidense", "pasaporte britanico", "pasaporte de estados unidos",
      "pasaporte de canada", "pasaporte irlandes", "pasaporte australiano", "visa", "mi visa"] }),
  ent("id_card", "tarjeta | de | residente", "card | of | resident", "f", { chip: "tarjeta de residente",
    forms: ["tarjeta de residente", "tarjeta de residencia", "residencia", "residente temporal", "residente permanente", "tarjeta de residente temporal",
      "tarjeta de residente permanente", "credencial de residente", "identificacion", "identificacion oficial", "credencial", "id", "documento de identidad", "dni"],
    attrs: { nat: "residence card" } }),
  ent("license", "licencia | de | manejo", "license | of | driving", "f", { chip: "licencia de manejo",
    forms: ["licencia", "licencia de manejo", "licencia de manejar", "licencia de conducir", "carnet de conducir", "carne de conducir", "carnet", "permiso de conducir",
      "licencia americana", "licencia de estados unidos", "licencia extranjera", "licencia canadiense"],
    attrs: { nat: "driver's license" } }),
];

const PROOFS: EntityDef[] = [
  ent("utility_bill", "recibo | de | luz", "bill | of | electricity", "m", { chip: "recibo de luz",
    forms: ["recibo de luz", "recibo de la luz", "recibo de agua", "recibo del agua", "recibo de telefono", "recibo del telefono", "recibo de internet", "recibo de gas",
      "recibo del gas", "recibo", "recibos", "comprobante de domicilio", "comprobante", "comprobante de direccion", "factura de la luz", "factura de luz", "recibo de cable"],
    attrs: { nat: "electric bill" } }),
  ent("lease", "contrato | de | renta", "contract | of | rent", "m", { chip: "contrato de renta",
    forms: ["contrato", "contrato de renta", "contrato de arrendamiento", "contrato de alquiler", "contrato del departamento", "contrato de la casa"],
    attrs: { nat: "lease" } }),
  ent("statement", "estado | de | cuenta", "statement | of | account", "m", { chip: "estado de cuenta",
    forms: ["estado de cuenta", "estado de cuenta del banco", "estado de cuenta bancario", "extracto bancario", "extracto"],
    attrs: { nat: "bank statement" } }),
];

// ---------------------------------------------------------------------------
// Figures (cents of a peso)

const MIN_DEPOSIT = 50000;
const AVG_BALANCE = 300000;
const MONTHLY_FEE = 15000;
const TRANSFER_FEE = 75000;
/** The bank buys a US dollar at $17.20. */
const BUY_RATE = 1720;
const exchanged = (usd: number) => usd * BUY_RATE;
const inAmountDomain = (usd: number) => usd % 10 === 0 && usd >= 10 && usd <= 2000;
/** Cash dollars changed for one customer: up to US$4,000 a month (the Mexican limit for account holders). */
const MAX_USD = 4000;
/** Bills are offered only for $1,000 or more ("¿En billetes de quinientos?" for $300 makes no sense). */
const BILLS_FROM = 100000;

// ---------------------------------------------------------------------------
// State helpers

const opening = (c: Ctx) => !!c.s.opening && !c.s.opened;
const inCard = (c: Ctx) => !!c.s.card;
const needsId = (c: Ctx) => (opening(c) || inCard(c) || c.s.cash === "id") && !c.s.id;
const customer = (c: Ctx) => !!c.s.customer || !!c.s.opened;
/** The checklist follows the ATM-card story (twist visits, or whenever the learner reports it) unless they came to
 *  open an account. Frozen once one of the two errands is finished, so a second errand afterwards is a bonus. */
const cardPath = (c: Ctx) => (c.s.donePath ? c.s.donePath === "card" : (!!c.s.cardTwist || !!c.s.card) && !c.s.opening);
const openPath = (c: Ctx) => !cardPath(c);
const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const words = (c: Ctx) => fold(c.heard || "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const isQuestion = (c: Ctx) => /\?/.test(c.heard || "");
/** "Diez mil dólares": the number slot stops at 9,999 (it reads "diez" + "mil"), so a big amount is read here. Typed
 *  digits count by their value ("10,000", "15 mil" are over the limit; "1,000" and "2.000" are not). */
const bigUsd = (c: Ctx) => {
  const w = words(c);
  for (const m of w.matchAll(/\b(\d{1,3}(?: \d{3})+|\d+)( mil\b)?/g)) if (Number(m[1].replace(/ /g, "")) * (m[2] ? 1000 : 1) > MAX_USD) return true;
  return /\b(diez|once|doce|trece|catorce|quince|dieci\w+|veinte|veinti\w+|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien|ciento|\w*cientos) mil\b/.test(w);
};
/** "Dos mil pesos" where dollars are asked: a peso amount is no dollar amount ("Mil a pesos" is: pesos are the target). */
const saysPesos = (c: Ctx) => {
  const w = words(c).replace(/\b(a|en|por) pesos\b/g, " ");
  return /\b(pesos?|varos?)\b/.test(w) && !/\bdolar(es)?\b/.test(w);
};
/** "¿Y si…?" / "¿Qué pasa si…?" / "¿Qué tal si…?": a question about an option, never the choice. */
const whatIf = (c: Ctx) => /^((oiga|disculpe|perdon|bueno|pues|este|a ver|mmm|eh) )*((y|pero y|entonces y) si|(y )?que pasa si|(y )?que tal si)\b/.test(words(c))
  || /^\s*¿\s*(y\s+)?si\b/i.test(c.heard || "");

/** At a money question ("¿Lo deposito?", "¿Se los cambio?"), "Está bien, gracias" / "Vale, gracias" may be a yes or a
 *  polite no, and a past ("Ya deposité") or a what-if is no yes: asked again before any money moves. */
const unsureYes = (c: Ctx) => /^(esta bien|bueno|ok|vale|sale|va|muy bien|perfecto) (muchas )?gracias$/.test(words(c)) || whatIf(c)
  || /\b(deposite|cambie|pague|saque|retire)\b/.test(words(c));
/** A money question's yes: an unclear one gets "¿Eso es un sí o un no?" and the question stays open. */
function moneyYes(again: () => Pending, act: (c: Ctx) => void) {
  return (c: Ctx) => { if (unsureYes(c)) { c.say("yes_or_no"); c.expect(again()); return; } act(c); };
}

/** More than the monthly limit (with what was changed today, unless it's only a question): said once, nothing changed. */
function overLimit(c: Ctx, usd: number | undefined, withChanged = true): boolean {
  const before = withChanged ? c.s.usdChanged ?? 0 : 0;
  if (!bigUsd(c) && !(usd != null && usd + before > MAX_USD)) return false;
  once(c, "limit", "ex_limit");
  return true;
}
const billsAsked = (c: Ctx) => !!c.s.askBills && (c.s.cashAmount ?? 0) >= BILLS_FROM;

/** Count how often a step was asked, to vary first asks and re-asks. */
function bump(c: Ctx, key: string): number {
  c.s.asked = c.s.asked || {};
  const n = c.s.asked[key] ?? 0;
  c.s.asked[key] = n + 1;
  return n;
}
const TURN = new WeakMap<object, Record<string, any>>();
const turn = (c: Ctx) => { let x = TURN.get(c); if (!x) { x = {}; TURN.set(c, x); } return x; };
function once(c: Ctx, key: string, line: string, vars?: Record<string, any>) { const T = turn(c); if (T["said_" + key]) return; T["said_" + key] = true; c.say(line, vars); }

function startOpening(c: Ctx, type?: string) {
  c.s.task = c.s.task || "open";
  c.s.moreDone = false;
  if (!c.s.opening) { c.s.opening = true; c.s.topic = "open"; }
  if (type && !c.s.type) c.s.type = type;
}

function setType(c: Ctx, type: string) {
  const had = c.s.type;
  c.s.type = type;
  if (!had || had !== type) c.say(type === "both" ? "ack_both" : "ack_type");
}

/** The card is cancelled and a new one ordered: the card errand is done. */
function blockCard(c: Ctx) {
  if (c.s.blocked) return;
  c.s.blocked = true;
  c.say("card_blocked");
  c.say("new_card_info");
  c.s.donePath = c.s.donePath || "card";
  c.complete();
  c.twist("atm_card");
}

/** "¿Recuerda los últimos cuatro dígitos de la tarjeta?" (some visits): any answer finds the card. */
function digitsPending(): Pending {
  const unknown = (cc: Ctx) => { cc.say("digits_unknown"); blockCard(cc); };
  return {
    id: "card_digits", expects: ["digits_ctx", "digits_unknown_ctx"], hints: ["digits", "g_yesno"],
    suggest: [{ lt: "Give the last four digits (or say you don't remember)", hint: "digits" }],
    on: {
      digits_ctx: (cc, sl) => { cc.s.digits = String(sl.digits ?? ""); cc.say("digits_ok"); blockCard(cc); },
      digits_unknown_ctx: (cc) => { unknown(cc); },
      g_dontknow: (cc) => { unknown(cc); },
    },
    // "Sí, cuatro cinco…": the digits that follow answer it; a bare "Sí" gets "¿Cuáles son?"
    yes: (cc) => { if (/\d|\b(cero|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)\b/.test(words(cc))) return; cc.say("digits_which"); cc.expect(digitsPending()); },
    no: unknown,
    ask: (cc) => cc.say(bump(cc, "digits") === 0 ? "ask_digits" : "ask_digits_again"),
  };
}

function afterId(c: Ctx) {
  if (inCard(c) && !c.s.blocked) {
    c.say("id_thanks");
    if (c.s.askDigits && !c.s.digitsAsked) { c.s.digitsAsked = true; bump(c, "digits"); c.expect(digitsPending()); c.say("ask_digits"); return; }
    blockCard(c);
    return;
  }
  c.say("id_thanks");
  // "Quiero sacar dos mil pesos" said before the ID: paid out now
  if (c.s.cash === "id" && c.s.cashWant != null) { const w = c.s.cashWant; c.s.cashWant = undefined; payCash(c, w); }
}

/** A foreign driver's license is no official ID here: the passport or the residence card. */
function otherIdPending(): Pending {
  const take = (cc: Ctx, doc?: string) => { if (cc.s.id) return; cc.s.id = doc && doc !== "license" ? doc : "passport"; afterId(cc); };
  return {
    id: "other_id", expects: ["show_doc", "doc_ctx", "here_you_go"], hints: ["g_yesno", "id"],
    suggest: [{ lt: "Say whether you have your passport or residence card", hint: "g_yesno" }, { lt: "Show another ID", hint: "id", options: "doc" }],
    yes: (cc) => { if (/pasaporte|residen|tarjeta|identificacion/.test(words(cc))) return; take(cc); },
    no: (cc) => { cc.say("come_back_id"); cc.end(); },
    on: {
      show_doc: (cc, sl) => { const d = toArr(sl.doc).find((x: string) => x !== "license"); if (d) take(cc, d); else { cc.say("license_no"); cc.expect(otherIdPending()); } },
      doc_ctx: (cc, sl) => { const d = toArr(sl.doc).find((x: string) => x !== "license"); if (d) take(cc, d); else { cc.say("license_no"); cc.expect(otherIdPending()); } },
      here_you_go: (cc) => { take(cc); },
    },
    ask: (cc) => cc.say("need_photo_id"),
  };
}

function openAccount(c: Ctx) {
  c.s.opened = true;
  c.s.customer = true;
  c.say("opened");
  c.say("card_info");
  if (c.s.extraInfo === "pin") c.say("pin_info");
  else if (c.s.extraInfo === "routing") c.say("routing");
  c.s.donePath = c.s.donePath || "open";
  c.complete();
  c.s.served = true;
  // "Quiero cambiar dólares" said while opening (or refused as a non-customer): now the dollars step asks
  if (c.s.exchangeLater) { c.s.exchangeLater = false; if (c.s.exchange !== "done") c.s.exchange = "amount"; }
}

/** "No, es todo" / "No, nada más" to an offer: no, and nothing else either. */
const allDone = (c: Ctx) => { if (/\b(es todo|seria todo|nada mas|eso es todo)\b/.test(words(c))) c.s.moreDone = true; };

/** "No, es todo" said to a yes/no step question means "no". */
function answerNo(c: Ctx): boolean {
  const st = bank.steps.find((x) => x.id === c.step);
  if (st && st.id !== "more" && st.no && !st.done(c)) { st.no(c); return true; }
  return false;
}

/** The step the conversation asks next (the engine's order). */
const nextStepId = (c: Ctx) => bank.steps.find((st) => (!st.when || st.when(c)) && !st.done(c))?.id;

function depositAmount(c: Ctx, cents: number | undefined) {
  if (cents == null) { c.say("min_is", { price: MIN_DEPOSIT }); return; }
  if (c.step !== "deposit" && !opening(c)) { c.say("no_problem"); return; }
  if (cents < MIN_DEPOSIT) { c.say("deposit_min", { price: MIN_DEPOSIT }); return; }
  // The deposit comes last: said with the request or at the ID ("…con mil pesos"), it never opens the account early
  if (c.step !== "deposit" && nextStepId(c) !== "deposit") { once(c, "deplater", "deposit_later"); return; }
  c.s.deposit = cents;
  c.event("pay", { method: "cash", amount: cents });
  openAccount(c);
}

/** "¿Con quinientos alcanza?" / "¿Y si deposito dos mil?": the answer, then a yes deposits it. */
function depositConfirm(cents: number): Pending {
  return {
    id: "dep_confirm", expects: ["deposit_ans", "amount_ctx", "minimum", "sure_ctx", "not_that"], hints: ["g_yesno", "deposit"],
    suggest: [{ lt: "Say yes, or give another amount", hint: "deposit" }],
    on: {
      sure_ctx: (cc) => { depositAmount(cc, cents); }, not_that: () => { /* the deposit step asks again */ },
      // "No, mejor mil": the new amount is the answer
      deposit_ans: (cc, sl, sg) => { bank.handlers.deposit_ans(cc, sl, sg); }, amount_ctx: (cc, sl, sg) => { bank.handlers.deposit_ans(cc, sl, sg); },
      minimum: (cc, sl, sg) => { bank.handlers.minimum(cc, sl, sg); },
    },
    yes: moneyYes(() => depositConfirm(cents), (cc) => { depositAmount(cc, cents); }),
    no: () => { /* the deposit step asks again */ },
    ask: (cc) => cc.say("deposit_enough"),
  };
}

function giveCash(c: Ctx) {
  c.s.billsDone = true;
  c.say("here_cash");
  c.event("give", { item: "cash" });
}

/** Cash at the counter: the amount asked for is paid out (the bills question first for $1,000 or more). */
function payCash(c: Ctx, cents: number) {
  c.s.cash = "amount"; c.s.cashAmount = cents;
  if (!billsAsked(c)) giveCash(c);
}

/** "¿Y si saco dos mil?": a yes pays it out. */
function cashConfirm(cents: number): Pending {
  return {
    id: "cash_confirm", expects: ["amount_ctx", "sure_ctx", "not_that"], hints: ["g_yesno", "cash"],
    suggest: [{ lt: "Say yes, or give another amount", hint: "cash" }],
    on: {
      sure_ctx: (cc) => { payCash(cc, cents); },
      not_that: (cc) => { cc.s.cash = false; cc.say("no_problem"); },
      // "No, mejor dos mil"
      amount_ctx: (cc, sl, sg) => { bank.handlers.amount_ctx(cc, sl, sg); }, deposit_ans: (cc, sl, sg) => { bank.handlers.amount_ctx(cc, sl, sg); },
    },
    yes: moneyYes(() => cashConfirm(cents), (cc) => { payCash(cc, cents); }),
    no: () => { /* the cash step asks again */ },
    ask: (cc) => cc.say("cash_confirm"),
  };
}

/** The day's rate, said once; asked again ("¿A cuánto está?") it is said again by rate_q. */
function sayRate(c: Ctx) { if (c.s.rateSaid) return; c.s.rateSaid = true; c.say("exchange_rate"); }

/** The dollars handed over are changed ("all": "Todos los que traigo", counted at the counter). */
function exchangeDollars(c: Ctx, usd: number | "all" | undefined) {
  if (c.s.exchange !== "amount" || !usd) { c.say("no_problem"); return; }
  c.s.exchange = "done";
  c.s.served = true;
  if (usd !== "all") c.s.usdChanged = (c.s.usdChanged ?? 0) + usd;
  if (usd !== "all" && inAmountDomain(usd)) c.say("exchange_done", { amount: exchanged(usd) });
  else c.say("exchange_done_generic");
  c.event("give", { item: "cash" });
}

/** "¿Y si cambio mil?" / "¿Cuántos pesos son doscientos?" while changing money: the amount, then a yes changes it. */
function exchangeConfirm(usd: number): Pending {
  return {
    id: "ex_confirm", expects: ["euro_amount", "euro_ctx", "sure_ctx", "not_that"], hints: ["g_yesno", "euros"],
    suggest: [{ lt: "Say yes, or give another amount", hint: "euros" }],
    on: {
      sure_ctx: (cc) => { exchangeDollars(cc, usd); }, not_that: (cc) => { cc.s.exchange = "cancelled"; cc.say("no_problem"); },
      euro_amount: (cc, sl, sg) => { bank.handlers.euro_amount(cc, sl, sg); }, euro_ctx: (cc, sl, sg) => { bank.handlers.euro_ctx(cc, sl, sg); }, // "No, mejor doscientos"
    },
    yes: moneyYes(() => exchangeConfirm(usd), (cc) => { exchangeDollars(cc, usd); }),
    no: () => { /* the dollars step asks again */ },
    ask: (cc) => { if (inAmountDomain(usd)) cc.say("exchange_quote", { amount: exchanged(usd) }); else cc.say("exchange_quote_rate"); },
  };
}
function quoteExchange(c: Ctx, usd: number) {
  const p = exchangeConfirm(usd);
  c.expect(p); p.ask!(c);
}

function offerOpen(c: Ctx) {
  c.say("offer_open");
  c.expect(openOffer());
}

function openOffer(): Pending {
  return {
    id: "open_offer", expects: ["open_account", "acct_type_ans", "no_open", "sure_ctx"], hints: ["g_yesno", "open"],
    suggest: [{ lt: "Agree to open an account", hint: "g_yesno" }, { lt: "Say which account you want", hint: "acct_type", options: "acct" }],
    yes: (cc: Ctx) => { startOpening(cc); },
    no: (cc: Ctx) => { cc.s.declinedOpen = true; cc.say("no_problem"); },
    on: {
      open_account: (cc: Ctx, sl: any, sg: any) => { bank.handlers.open_account(cc, sl, sg); },
      acct_type_ans: (cc: Ctx, sl: any, sg: any) => { bank.handlers.acct_type_ans(cc, sl, sg); },
      no_open: (cc: Ctx) => { cc.s.declinedOpen = true; cc.say("no_problem"); },
      sure_ctx: (cc: Ctx) => { startOpening(cc); },
      // "No, gracias, solo quería cambiar dólares": a no, then the request ("Sí, y también cambiar dólares": a yes)
      exchange_req: (cc: Ctx, sl: any, sg: any) => {
        if (/^(si|claro|sale|va|ok|bueno|por que no)\b/.test(words(cc))) startOpening(cc); else cc.s.declinedOpen = true;
        bank.handlers.exchange_req(cc, sl, sg);
      },
    },
    ask: (cc: Ctx) => cc.say("offer_open"),
  };
}

/** "¿Tiene cuenta con nosotros?" before changing dollars or sending a transfer. An amount said with the request
 *  (c.s.wantUsd) is quoted on a yes and forgotten otherwise: after the opening the dollars step asks again. */
function customerPending(kind: "exchange" | "transfer"): Pending {
  const newcomer = (cc: Ctx) => { cc.s.newcomer = true; cc.s.wantUsd = undefined; if (kind === "exchange") cc.s.exchangeLater = true; };
  const no = (cc: Ctx) => { newcomer(cc); cc.say(kind === "exchange" ? "customers_only" : "need_account_wire"); offerOpen(cc); };
  const yes = (cc: Ctx) => {
    cc.s.customer = true;
    if (kind === "exchange") {
      sayRate(cc); cc.s.exchange = "amount";
      if (cc.s.wantUsd) { const u = cc.s.wantUsd; cc.s.wantUsd = undefined; quoteExchange(cc, u); }
    } else cc.say("customer_yes");
  };
  return {
    id: "acct_q", expects: ["not_yet", "customer_ctx"], hints: ["g_yesno"],
    suggest: [{ lt: "Say whether you have an account here", hint: "g_yesno" }],
    yes, no,
    on: {
      not_yet: no,
      customer_ctx: yes,
      // "No, pero quiero abrir una": the opening, and the dollars after it
      open_account: (cc, sl, sg) => { newcomer(cc); bank.handlers.open_account(cc, sl, sg); },
    },
    ask: (cc) => { if (bump(cc, "acct_q") === 0) cc.say("ask_customer_again"); },
  };
}

// Automatic answers the simulations use for optional questions.
const BANK_AUTO: Record<string, string> = {
  slow: "Claro, no hay problema", savings: "No, gracias", app: "Sí, por favor", acct_q: "No, todavía no", open_offer: "Sí, por favor",
  pin_q: "Sí, creo que sí", cash_offer: "Sí, por favor", cash_amount: "Dos mil pesos", bills: "De quinientos está bien",
  euros: "Doscientos dólares", lease_q: "Sí, tengo contrato de renta", other_id: "Sí, traigo mi pasaporte",
  card_digits: "Termina en cuatro cinco ocho dos", dep_confirm: "Sí", ex_confirm: "Sí", cash_confirm: "Sí",
};

// ---------------------------------------------------------------------------
// Suggestions

const S_OPEN: Suggestion = { lt: "Say you want to open an account", hint: "open", options: "acct" };
const S_TRANSFER: Suggestion = { lt: "Ask how to send money abroad", hint: "transfer" };
const S_EXCHANGE: Suggestion = { lt: "Change dollars into pesos", hint: "exchange" };
const S_CARD: Suggestion = { lt: "Say the ATM outside kept your card", hint: "card" };
const S_ASK: Suggestion = { lt: "Ask about fees, the card or the app", hint: "ask_acct" };

const MAIN_EXPECTS = ["open_account", "card_kept", "exchange_req", "transfer_q", "withdraw", "new_in_town", "turn_ticket", "help_me", "exchange_other", "rate_q"];

function helpStep(id: string, withCard: boolean): StepDef {
  return {
    id,
    when: (c) => !!c.s.cardTwist === withCard,
    done: (c) => !!c.s.task,
    ask: (c) => {
      const n = bump(c, "help");
      if (n === 0) {
        if (c.s.hay === "pending") {
          // optional pending: if the learner goes straight to business, it is simply dropped
          c.s.hay = "asked"; c.say("greet_hay");
          expectHowAreYou(c, (cc) => { cc.s.hay = "done"; });
          return;
        }
        if (c.s.turnGreet) { c.say("greet_turn"); return; }
        c.say(c.visits >= 1 && c.chance(0.5) ? "greet_back" : "greet");
        return;
      }
      c.say("ask_help");
    },
    expects: MAIN_EXPECTS,
    suggest: withCard ? [S_CARD, S_OPEN, S_TRANSFER, S_EXCHANGE] : [S_OPEN, S_TRANSFER, S_EXCHANGE],
    yes: (c) => { if (c.s.hay === "asked") { c.s.hay = "done"; c.say("g_glad"); } },
    no: (c) => { if (c.s.hay === "asked") { c.s.hay = "done"; c.say("g_sorry_to_hear"); } },
    help: (c) => { c.say("services"); },
  };
}

// ---------------------------------------------------------------------------

export const bank: SituationDef = {
  id: "s78-bank",
  song: 78,
  songTitle: "The Machine Ate My Card",
  title: { en: "El cajero se tragó mi tarjeta", lt: "The ATM ate my card" },
  topic: { en: "En el banco", lt: "At the bank" },
  chapter: 3,
  order: 3,
  location: "bank",
  npc: "aaron",
  goal: "Open a bank account (and find out how to send money home or change dollars).",
  intro: "Banco del Puerto is a small bank downtown. Ricardo is at the counter. You'll need an account for your pay and your rent, and maybe you'll want to change some dollars or send money home. Prices are in Mexican pesos.",
  entities: { acct: ACCTS, doc: DOCS, proof: PROOFS },

  grammar: {
    macros: {
      acct_np: "([una] [nueva] cuenta [bancaria | de banco | nueva] | [una | un] {acct}) [aqui | con ustedes | en este banco | en el banco | en su banco | en banco del puerto | para mi (sueldo | nomina | trabajo | renta | salario) | para que me (paguen | depositen) [mi sueldo | el sueldo]]",
      open: "(abrir | abrirme | sacar | crear | hacer | tener | contratar)",
      money: "(dinero | lana | plata)",
      send: "(enviar | mandar | transferir | mandarle | enviarle)",
      money_to: "(a estados unidos | a los estados unidos | a canada | a mi pais | al extranjero | fuera de mexico | a otro pais | a inglaterra | al reino unido | a australia | a irlanda | a casa | a mi casa | a mi (mama | papa | madre | padre | esposa | esposo | hijo | hija | hermana | hermano | familia | novia | novio) [en (estados unidos | canada | mi pais | inglaterra)] | a mi familia [en (estados unidos | canada | mi pais | inglaterra)] | a (mi | una) cuenta (de | en) (estados unidos | canada | mi pais | el extranjero))",
      atm: "[el | la | este | ese | su] (cajero [automatico] | atm | maquina) [de afuera | de aqui afuera | de la entrada | de aqui | de ustedes | de enfrente | del banco]",
      took: "(se tragó | se comio | retuvo | se quedó con | me quitó | agarró | se trago)",
      notback: "no me (devolvio | regresó | dio | quiso devolver | quiere devolver | quiere dar | da | devuelve | regresa)",
      pin: "(nip | pin | clave | contrasena | codigo)",
      card: "[mi | la] tarjeta [de debito | de credito | del banco | bancaria]",
      pen: "(una pluma | un boligrafo | un lapicero | un lapiz | un boli | una pluma para firmar | algo para escribir | algo con que escribir)",
    },
    slots: {},
  },

  intents: {
    // --- main requests
    open_account: { patterns: [
      "(quiero | quisiera | me gustaria | necesito | vengo a | queria | quisiera poder) @open @acct_np #h:open_like",
      "necesito @acct_np #h:open_need",
      "(puedo | podria | se puede) @open @acct_np [aqui] #h:open_could",
      "(como | que hago para) (abro | abrir | puedo abrir | se abre | hago para abrir) @acct_np #h:open_how",
      "(vengo | vine | venia) a abrir @acct_np #h:open_here",
      "quiero abrir una cuenta #h:open_want", "(quiero | quisiera | me gustaria) @acct_np", "(quisiera | me gustaria | quiero | necesito) (saber | informacion) (como | para | sobre como | de como) abrir @acct_np", "informacion (para | sobre como | de como) abrir @acct_np",
      "(tambien | y tambien) (quiero | quisiera | me gustaria | necesito) abrir @acct_np",
      "(quiero | quisiera | me gustaria | queremos) (ser | hacerme) cliente [del banco | de este banco | de su banco | de ustedes]",
      "(me puede | me podria | puede | podria) (abrir | ayudar a abrir) @acct_np", "(me puedes | puedes) (abrir | ayudar a abrir) @acct_np #tip:tu_staff",
      "me interesa (abrir @acct_np | una cuenta | {acct})", "(busco | estoy buscando) @acct_np",
      "(quiero | quisiera | necesito) abrir (una cuenta de debito y una de ahorro | las dos | ambas) #both",
      "que (necesito | se necesita | ocupo | hace falta | me piden | piden) para abrir @acct_np #needq", "(cuales son los | que) requisitos (para abrir @acct_np | hay | piden | necesito) #needq",
      "(quiero | quisiera | necesito) una tarjeta de debito",
      "mi (empresa | jefe | trabajo | patron) (necesita | me pide | quiere) (una cuenta | mi cuenta | mi clabe | mi numero de cuenta)",
      "(se puede | puedo) abrir @acct_np (si soy | siendo) (extranjero | extranjera)",
      "(abrir | abro) @acct_np", "para abrir @acct_np", "[aqui] (se abren | abren | se pueden abrir) cuentas",
      "(no tengo | todavia no tengo) cuenta y (quiero | quisiera | necesito) (una | abrir una)",
      "[pero] (quiero | quisiera | me gustaria | necesito) (abrir | abrirme) una [aqui | con ustedes]",
    ] },
    // "No quiero cambiar dólares, quiero…": a refusal that leads into the real request (never the errand itself)
    not_that: { patterns: ["[no] (ya)? no (quiero | necesito) (cambiar | sacar | retirar) (nada | dinero | efectivo | [los | mis] dolares) [todavia | ahorita | por ahora | gracias]",
      "no (quiero | necesito | vengo a | vine a) (cambiar [mis] dolares | cambiar dinero | @send @money | sacar dinero | retirar dinero | sacar efectivo | retirar efectivo | una tarjeta nueva | otra tarjeta)", "solo (queria | venia a | vine a) (cambiar [unos | mis] dolares | @send @money | preguntar [algo] | saber [algo])"] },
    // "No quiero abrir una cuenta" / "No vengo a abrir una cuenta": never the request
    no_open: { patterns: ["no (quiero | vengo a | vine a | necesito | voy a) @open @acct_np", "no (quiero | necesito) (una cuenta | otra cuenta | cuenta)"] },
    new_in_town: { patterns: [
      "(me acabo de mudar | acabo de mudarme | me mudé) [aqui | a puerto colibri | a mexico | a este pueblo] [hace (poco | una semana | unos dias | un mes)]",
      "(soy | estoy) (nuevo | nueva) (aqui | en el pueblo | en puerto colibri | en mexico | en la ciudad)",
      "acabo de llegar [a mexico | a puerto colibri | aqui]", "(ahora | ya) vivo aqui", "vivo aqui ahora",
      "me vine a vivir (aqui | a puerto colibri | a mexico)", "(vengo | vine) a vivir aqui",
    ] },
    card_kept: { patterns: [
      "@atm @took @card #h:card_kept", "(se tragó | se comio | se quedó con | retuvo) @card @atm", "(necesito ayuda | tengo un problema | traigo un problema) con @card", "@atm se me (tragó | comio | quedó con | trago) [mi | la] tarjeta",
      "@atm se (la | me la) (tragó | comio | quedó | trago)",
      "(se tragó | se comio | se quedó con | se trago) mi tarjeta [de debito | de credito | del banco]", "la maquina se comio mi tarjeta #h:card_ate",
      "mi tarjeta se quedó (atorada | atascada | trabada | adentro) [en @atm] #h:card_stuck", "mi tarjeta se quedó en @atm #h:card_stuck", "(mi | la) tarjeta (esta | sigue) (atorada | atascada | trabada | adentro) [en @atm]",
      "se me (atoró | atascó | trabó | quedó) [mi | la] tarjeta [en @atm]",
      "@atm @notback @card", "@atm no me (la | lo) (devolvio | regresó | dio | quiere devolver | quiso devolver)",
      "(meti | puse) [mi | la] tarjeta [en @atm] y no (salio | me la devolvio | me la regresó | la devolvio | volvio a salir | me la dio)",
      "(tengo | traigo) un problema con (mi tarjeta | @atm) [de afuera]", "es (sobre | por) mi tarjeta", "perdi mi tarjeta en @atm",
      "(mi tarjeta | la tarjeta) (no salio | nunca salio | se quedó adentro) [(del | de) (cajero | la maquina)]",
    ] },
    // "Tengo un problema." / "¿Me puede ayudar?" before saying what it is
    help_me: { patterns: [
      "(tengo | traigo) un (problema | problemita | pequeno problema)", "(me puede | me podria | puede | podria) ayudar", "(me puedes | puedes) ayudar #tip:tu_staff",
      "necesito (ayuda | su ayuda)",
    ] },
    // "¿Turno A-27?" — "Sí, soy yo" / "Tengo el A-27"
    turn_ticket: { patterns: [
      "(tengo | traigo) (el | mi) turno [{number}]", "(tengo | traigo) el {letters} {number}", "(es mi turno | me toca [a mi] | ya me toca | soy yo | aqui esta mi turno | este es mi turno)",
    ] },
    turn_q: { patterns: ["donde (saco | se saca | tomo | agarro) (turno | el turno | un turno | ficha)", "(tengo que | hay que) (sacar | tomar) turno", "(necesito | ocupo) turno"] },
    exchange_req: { patterns: [
      "(quiero | quisiera | me gustaria | necesito | vengo a) cambiar [unos | mis | algunos | estos] dolares [a pesos | por pesos] #h:ex_like",
      "(tambien | y tambien) (quiero | quisiera | necesito) cambiar [unos | mis] dolares [a pesos]",
      "(puedo | podria | se puede) cambiar [unos | mis] dolares [aqui] [a pesos] #h:ex_could",
      "(cambian | compran | aceptan) dolares [aqui]", "(me | nos) (cambia | puede cambiar | podria cambiar) [unos | estos | mis] dolares [a pesos]",
      "(me cambias | me puedes cambiar | puedes cambiarme) [unos | estos | mis] dolares #tip:tu_staff", "(puede | podria | me pueden | pueden) (cambiarme | cambiar) [unos | estos | mis] dolares [a pesos]", "(quiero | quisiera | necesito | vengo a) cambiar [otros] {number} dolares [a pesos | mas] #amt",
      "(necesito | quiero | quisiera) pesos [mexicanos]", "[aqui] (cambian | cambia) (dinero | moneda | divisas)", "(traigo | tengo) [unos] dolares [y (necesito | quiero) pesos]", "cambio de (dolares | divisas | moneda)",
      "(quiero | quisiera) (vender | cambiar) [mis] dolares", "(hacen | hay) cambio de (dolares | moneda | divisas)", "(quiero | quisiera | necesito) cambiar dinero",
      "(puedo | podria | se puede | me puede | me podria) cambiar {number} dolares [aqui] [a pesos] #amt",
      "(solo | nomas) (quiero | quisiera | necesito | vengo a)? cambiar [unos | mis | algunos] dolares [a pesos]",
    ] },
    // "¿Cambian euros?": only US dollars here
    exchange_other: { patterns: [
      "(cambian | compran | aceptan | puedo cambiar | se puede cambiar | quiero cambiar | quisiera cambiar | necesito cambiar) (euros | libras | dolares canadienses | dolares australianos | otra moneda | otras monedas)",
      "(tengo | traigo) (euros | libras | dolares canadienses | dolares australianos)",
    ] },
    transfer_q: { patterns: [
      "como (puedo | le hago para | hago para) @send @money @money_to #h:tr_how",
      "(quiero | quisiera | me gustaria | necesito) @send @money @money_to #h:tr_like",
      "(puedo | se puede | podria) @send @money @money_to [desde aqui]",
      "(quiero | quisiera | necesito) @send @money",
      "(quiero | quisiera | necesito) (hacer | mandar | enviar) una transferencia [internacional] [@money_to]",
      "(puedo | se puede) hacer (una transferencia | transferencias) [internacional | internacionales] [@money_to]",
      "como (mando | envio | puedo mandar | puedo enviar) (dinero | una transferencia) [@money_to]",
      "(cuanto | que) cuesta (@send @money | una transferencia) [@money_to]", "(hacen | manejan) transferencias internacionales", "(hacen | se pueden hacer) (envios | transferencias) [de dinero] [@money_to | internacionales]",
    ] },
    withdraw: { patterns: [
      "(quiero | quisiera | necesito | vengo a) (sacar | retirar) [dinero | efectivo | un poco de dinero | lana] [de mi cuenta] [aqui | en ventanilla] #h:cash_take",
      "(puedo | podria | se puede) (sacar | retirar) [dinero | efectivo] [de mi cuenta] [aqui | en ventanilla] [sin tarjeta] #h:cash_take",
      "(tambien | y tambien) (quiero | quisiera | necesito) (sacar | retirar) [dinero | efectivo]",
      "necesito (efectivo | dinero [en efectivo])", "(me puede | me podria) dar [algo de] efectivo", "(necesito | quiero) (sacar | retirar) (dinero | efectivo) pero no (tengo | traigo) [mi | la] tarjeta",
      // "Quiero sacar dos mil pesos": the amount is paid out once the ID is checked
      "[tambien | y tambien] (quiero | quisiera | necesito | vengo a | voy a) (sacar | retirar) {price} [de mi cuenta] [en efectivo] [aqui | en ventanilla] #amt",
      "(puedo | podria) (sacar | retirar) {price} [de mi cuenta] [aqui | en ventanilla] #amt",
    ] },

    // --- account opening
    acct_type_ans: { patterns: [
      "[una | la | el] {acct} #h:type_short", "(quiero | quisiera | prefiero | me da | deme | mejor | busco | necesito) [una | la] {acct} #h:type_like",
      "{acct} [esta bien | me parece bien | me sirve]", "(creo que | mejor) [una | la] {acct}",
      "[una | la] {acct} no {noa:acct} #amb", "no {noa:acct} [sino] [una | la] {acct}", "(solo | nomas | solamente) [una | la] {acct}", "[no] mejor [una | la] {acct}", "[no] (mejor | prefiero) (una | la) {acct} [mejor]",
      "[es] para mi (sueldo | nomina | salario | dia a dia | gastos | uso diario | renta | trabajo) #chk",
      "[es] para (pagar cosas | los gastos | gastos del dia a dia | el dia a dia | usarla diario | uso diario | pagar la renta) #chk",
      "[es] para recibir mi (sueldo | nomina | salario | pago) #chk", "la que (tiene | trae | viene con) tarjeta #chk", "la que (da | paga | genera) (intereses | interes | rendimiento) #sav", "[es] para ahorrar [dinero] #sav", "(quiero | necesito) ahorrar [dinero] #sav", "para guardar (dinero | mi dinero) #sav",
      "(quiero | quisiera) (las dos | ambas) #both",
    ] },
    // "Las dos" / "Ambas": only where an account is being chosen
    both_ctx: { patterns: ["(las dos | ambas | los dos | una de cada una | una de cada) #h:type_both", "(de debito y de ahorro | debito y ahorro)"] },
    acct_type_not: { patterns: [
      "no (quiero | necesito) [una | la] {acct} [por ahora | todavia | gracias]", "[la] {acct} no [gracias]", "sin {acct}",
    ] },
    ask_difference: { patterns: [
      "cual es la diferencia #h:q_difference", "que diferencia hay [entre (las dos | ellas)]", "(que | cual) me (recomienda | sugiere | aconseja) #h:q_recommend",
      "(que | cual) me (recomiendas | sugieres) #tip:tu_staff", "cual (es mejor | conviene | me conviene) [para mi]", "usted que (me recomienda | haria)",
      "(que es | como es | como funciona) [una | la] {acct}", "no se (cual | que cuenta | cual necesito | cual me conviene | cual es mejor)",
      "que (tipos | opciones) de (cuenta | cuentas) (tiene | tienen | hay)", "que cuentas (tiene | tienen | hay)",
    ] },
    show_doc: { patterns: [
      "aqui (esta | tiene) [mi] {doc} #h:id_here", "(tome | tenga | le doy | le paso) [mi] {doc}", "(este | esta) es mi {doc}", "(tengo | traigo) [mi | un | una] {doc} [aqui | conmigo]",
      "solo (tengo | traigo) [mi | un | una] {doc} #h:id_only", "(sirve | le sirve | esta bien | vale) [mi | un | una] {doc} #h:id_ok",
      "(puedo usar | puedo darle | acepta | aceptan) [mi | un | una] {doc}", "tambien (tengo | traigo) [mi | un | una] {doc} #h:id_license",
      "(tengo | traigo) [mi] {doc} y [mi] {doc}", "aqui (esta | tiene | estan) [mi] {doc} y [mi] {doc}", "[el | mi | un | una] {doc} (sirve | esta bien | le sirve | vale)", "(necesita | quiere) [ver] mi {doc}",
      "no (tengo | traigo) [mi | un] {nod:doc} pero (tengo | traigo) [mi | un | una] {doc}", "[mi] {nod:doc} no pero (tengo | traigo) [mi] {doc}",
    ] },
    // "Pasaporte." as the answer to "¿Me permite una identificación?"
    doc_ctx: { patterns: ["[si] [mi | el | la] {doc} [aqui | esta bien]"] },
    no_doc: { patterns: [
      "no (tengo | traigo) [mi | un | una | ninguna] ({doc} | identificacion | identificacion oficial) [conmigo | aqui | hoy]",
      "(se me olvidó | olvidé | dejé) [mi | el | la] {doc} [en (casa | el hotel | mi casa)]", "no traigo identificacion", "no tengo identificacion",
      "(lo | la) (dejé | olvidé) en (casa | el hotel | mi casa)",
    ] },
    give_proof: { patterns: [
      "aqui (esta | tiene) [mi | el] {proof} #h:proof_bill", "(tengo | traigo) [un | una | mi | el] {proof} #h:proof_lease", "(sirve | le sirve | esta bien | vale) [mi | un | una | el] {proof} #h:proof_ok",
      "(tome | tenga | le doy | le paso) [mi | el] {proof}", "(este | esta) es mi {proof}", "[tengo] [mi | el] {proof} en (mi | el) celular", "(mi | el) {proof} (esta | lo tengo) en (mi | el) celular",
      "(tengo | traigo) [un | una | mi] {proof} y [un | una | mi] {proof}", "tengo una carta de (mi casero | mi arrendador | mi empresa | mi trabajo | mi jefe)",
      "(tengo | traigo) (el | un) {proof} (en | dentro de) (mi | el) celular", "[el | mi | un | una] {proof} (sirve | esta bien | le sirve)", "(lo | la) tengo en (mi | el) celular",
    ] },
    proof_ctx: { patterns: ["[si] [un | una | mi | el] {proof} [aqui]"] },
    no_proof: { patterns: [
      "no (tengo | traigo) [un | una | ningun | ninguna | el | mi] ({proof} | comprobante [de domicilio] | recibos | comprobantes) [a mi nombre] [todavia | aun | conmigo]", "(los recibos | el recibo | el contrato) no (esta | estan) a mi nombre", "[el | mi] {proof} no (esta | estan) a mi nombre",
      "(todavia | aun) no tengo (recibos | ningun recibo | {proof} | comprobante [de domicilio]) #h:proof_none",
      "(me acabo de mudar | acabo de mudarme | me mudé hace (poco | unos dias | una semana)) #h:proof_moved",
      "todavia no (me llega | me ha llegado | llega) [ningun | el] (recibo | {proof})", "(estoy esperando | espero) [el | mi | un] {proof}",
      "vivo con (unos amigos | un amigo | una amiga | mi familia | mi novio | mi novia | mi pareja) #nolease", "(vivo | estoy) en un hotel #nolease",
      "[mi | el] {proof} (esta | lo tengo | se quedó) en (casa | mi casa | el departamento | el hotel)", "(se me olvidó | olvidé | dejé) [mi | el] {proof} [en casa | en mi casa]",
      "no (lo | la) traigo [conmigo]", "los recibos (estan | llegan) a nombre de (mi casero | otra persona | mi arrendador | el dueno)",
    ] },
    // The CURP (step "ssn")
    ssn_none: { patterns: [
      "[no] (todavia | aun) no (la | lo) tengo #h:ssn_notyet", "no tengo [una | la] curp [todavia | aun]", "no tengo (eso | esa clave) [todavia]",
      "[no] (estoy esperando | sigo esperando | todavia espero) (mi curp | la curp | mi tarjeta [de residente] | mi residencia) #h:ssn_waiting",
      "[no] (soy | estoy de) (turista | visitante)", "[no] (soy | todavia soy) (extranjero | extranjera)", "[no] no soy mexicano", "[no] no soy mexicana",
      "[no] solo tengo [mi] pasaporte", "[no] soy de (estados unidos | canada | inglaterra | australia | irlanda | otro pais | fuera)", "(la | lo) (estoy tramitando | estoy sacando)", "no se cual es [mi curp]",
    ] },
    ssn_yes: { patterns: [
      "[si] (la | lo) tengo [aqui]", "[si] (tengo | ya tengo) [mi | la] curp", "[si] (viene | esta) en mi (tarjeta [de residente] | residencia)", "[si] aqui (esta | la tiene)",
    ] },
    ask_ssn_what: { patterns: ["que es (la | el | una) curp #h:ssn_what", "que es eso", "para que (es | sirve) [la curp | eso]", "no se (que es | lo que es) [eso | la curp]", "que significa curp"] },
    ssn_problem: { patterns: [
      "(es | hay) [un] problema #h:ssn_problem", "(puedo | se puede) abrir (la cuenta | una cuenta | la) sin (curp | ella | eso)", "(necesito | es necesaria | es obligatoria) [la] curp",
      "(esta bien | no importa) si no la tengo",
    ] },
    rfc_q: { patterns: ["(necesito | piden | hace falta | ocupo) [el | mi] rfc", "y el rfc", "que es el rfc"] },
    ask_pen: { patterns: [
      "(me presta | me puede prestar | me podria prestar | tiene | me da) @pen #h:form_pen", "(me prestas | tienes) @pen #tip:tu_staff",
      "(necesito | no tengo) @pen", "(me presta | me deja) (su pluma | su boligrafo)",
    ] },
    where_sign: { patterns: [
      "donde (firmo | tengo que firmar | hay que firmar | pongo mi firma | va la firma) #h:form_where", "(firmo | aqui firmo) aqui", "donde pongo (mi firma | mis iniciales)",
    ] },
    // "¿Aquí?" at the form
    where_sign_ctx: { patterns: ["(aqui | aca) [abajo]", "en donde", "donde exactamente"] },
    what_write: { patterns: [
      "que (escribo | pongo | lleno) [aqui | en esta parte | en este espacio] #h:form_what", "(tengo que | hay que) llenar (todo | todo esto | toda la hoja | toda la solicitud)",
      "no entiendo (esta parte | esto | esta pregunta | esta palabra)", "(pongo | escribo) mi (direccion | domicilio) de (aqui | mexico | mi pais | estados unidos)", "que va (aqui | en esta linea)", "que (pongo | escribo) (en | de) {any}",
    ] },
    signed: { patterns: [
      "[listo] ya (firmé | lo firmé | la firmé | terminé) #h:form_done", "[ok] (ya)? (lo | la) llené [y (lo | la) firmé]", "ya (esta | quedó) (firmado | firmada | llena | lleno)", "firmado",
      "(ya)? terminé [de llenar] [la solicitud]", "ya acabé", "acabé",
    ] },
    // "Listo" / "¿Así está bien?" at the form
    signed_ctx: { patterns: ["(listo | ya | ya esta | ya quedó | ya quedo)", "asi esta bien", "esta bien asi", "(esta | queda) bien"] },
    here_you_go: { patterns: ["aqui (tiene | esta | lo tiene | la tiene) #h:form_here", "(tome | tenga)", "aqui (estan | los tiene)", "(se lo | se la) doy"] },
    deposit_ans: { patterns: [
      "(quiero | quisiera | voy a | me gustaria | puedo) (depositar | meter | poner | ingresar | abrirla con | abrir con | empezar con) {price} [en efectivo | hoy | para empezar] #h:dep_like",
      "con {price} [en efectivo | para empezar] #h:dep_cash", "(deposito | meto | pongo | ingreso) {price}", "(empiezo | empezamos | la abro) con {price}",
      "[unos] {price} (esta bien | estaria bien)", "(traigo | tengo) [solo | nomas] {price}",
      "[con] {price} (es suficiente | alcanza | basta) #q", "(y si | que tal si) (deposito | pongo | meto) {price} #q",
      "no {nop:price} [sino] con {price}", "[no] (mejor | prefiero) (con | depositar) {price}",
    ] },
    minimum: { patterns: ["[solo | nomas | solamente] (el minimo | lo minimo) #h:dep_min", "(con | deposito) el minimo", "lo menos posible"] },
    ask_minimum: { patterns: [
      "cuanto es el (minimo | deposito minimo) #h:dep_q", "cuanto es lo minimo", "cual es el (minimo | deposito minimo | monto minimo)", "cuanto (tengo que | hay que | necesito) (depositar | meter | poner)",
      "(hay | tiene) [un] (minimo | deposito minimo | monto minimo)", "cuanto necesito",
    ] },
    amount_ctx: { patterns: [
      "{price} [en efectivo] #h:cash_short", "(quisiera | quiero | necesito | me da | deme | me puede dar) {price}", "(solo | nomas | como | unos) {price}",
      "(quiero | quisiera | necesito | voy a) (retirar | sacar) {price} #h:cash_amount", "{price} (esta bien | me alcanza)", "(y si | que tal si) (saco | retiro) {price} #q",
      "no {nop:price} [sino] {price}", "[no] (mejor | prefiero) {price}",
    ] },
    // "No, tengo efectivo." to "¿Necesita efectivo mientras tanto?"
    no_cash_needed: { patterns: [
      "(tengo | traigo | todavia tengo) (efectivo | dinero | suficiente efectivo | suficiente dinero)", "[no] no (necesito | ocupo) (efectivo | dinero) [ahorita | por ahora | gracias]",
    ] },
    // "No tengo efectivo" or "No, tengo efectivo"? (the comma is lost): asked again at the cash offer
    cash_amb_ctx: { patterns: ["no (tengo | traigo) (efectivo | dinero | nada de efectivo) #amb"] },
    // "No quiero depositar nada" at "¿Con cuánto la quiere abrir?"
    no_deposit_ctx: { patterns: ["no (quiero | puedo | voy a) (depositar | meter | poner) [nada | dinero] [todavia | hoy | ahorita | por ahora]",
      "no (tengo | traigo) (dinero | efectivo) [para depositar | ahorita | hoy | conmigo | aqui]"] },
    // "Todavía no termino" / "Un momento" at the form
    not_done_ctx: { patterns: ["(todavia | aun) no (termino | he terminado | acabo | he acabado | firmo | he firmado)", "no he (firmado | terminado | acabado)",
      "(un momento | un momentito | espere | permitame | deme un momento) [por favor]"] },
    // "Ya la tengo" at "¿Le ayudo a descargar nuestra app?"
    app_have_ctx: { patterns: ["[no] [gracias] ya (la | lo) tengo [instalada | descargada | en mi celular]", "[no] [gracias] ya (la | lo) (descargue | instale | baje)"] },
    // "No sé" / "No estoy seguro" at "¿Puso mal el NIP?"
    pin_unknown_ctx: { patterns: ["no (se | sé) (tal vez | quizas | a lo mejor | puede ser | la verdad | si)", "no estoy (seguro | segura)", "no (me acuerdo | recuerdo) [bien] [si]"] },
    // "No, tampoco" at "¿Tiene contrato de renta?"
    tampoco_ctx: { patterns: ["[no] tampoco [tengo | traigo] [eso | contrato | ese | {proof}]"] },
    // "Sí, ¿por qué no?" / "Me parece bien" to an offer
    sure_ctx: { patterns: ["[si] (por que no | claro que si | me parece bien | me parece buena idea | buena idea | con gusto)"] },
    // "No, luego la descargo." to "¿Le ayudo a descargar nuestra app?"
    app_later: { patterns: [
      "[no] (luego | despues | mas tarde) (la | lo) (descargo | instalo | bajo | hago)", "[no] (la | lo) (descargo | instalo | bajo | hago) (luego | despues | mas tarde | en casa | yo)",
      "[no] no (quiero | necesito) (la app | la aplicacion | app)",
    ] },

    // --- account questions
    fee_q: { patterns: [
      "(hay | tiene | cobran) (comision | comisiones) (mensual | mensuales | por manejo de cuenta | cada mes | al mes) #h:q_fee", "cuanto (cuesta | cobran por) (la cuenta | tener la cuenta) [al mes]",
      "(es | la cuenta es) gratis", "(tengo que | hay que) pagar (algo | cada mes | al mes)", "(cuales son | que) (las comisiones | comisiones) [hay | tiene | cobran]",
      "(cobran | cobra) algo (por la cuenta | al mes | cada mes)", "(la cuenta | la de debito | la de ahorro) tiene comision",
    ] },
    minbal_q: { patterns: [
      "(hay | tiene) [un] saldo minimo", "cual es el saldo minimo", "cuanto (tengo que | hay que | debo) (tener | dejar | mantener) en la cuenta", "(hay | tiene) [un] saldo promedio",
    ] },
    interest_q: { patterns: [
      "(cuanto | que) (interes | intereses | rendimiento) (da | paga | tiene | genera) #h:q_interest", "(da | paga | genera) (intereses | interes | rendimiento)",
      "cual es la tasa [de interes]", "cuanto (gano | genera)",
    ] },
    card_when_q: { patterns: [
      "cuando (me dan | me entregan | recibo | tengo | me llega) (la | mi) tarjeta [nueva | de debito] #h:q_card_when", "cuanto (tarda | tardan) (la tarjeta | en llegar la tarjeta)",
      "(me dan | me entregan) (una | la) tarjeta [de debito]", "(la tarjeta | mi tarjeta) (llega | me la mandan) por correo",
    ] },
    card_abroad_q: { patterns: [
      "(puedo usar | sirve | funciona) (la | mi | esta) tarjeta (en estados unidos | en el extranjero | fuera de mexico | en otros paises | en mi pais | cuando viajo | en canada) #h:q_abroad",
      "(puedo | se puede) pagar con (ella | la tarjeta) (en el extranjero | en estados unidos | fuera de mexico)", "(la | mi) tarjeta (sirve | funciona | se puede usar) (en estados unidos | en el extranjero | fuera de mexico | en otros paises | en canada)",
    ] },
    app_q: { patterns: [
      "(tienen | tiene | hay) (app | aplicacion | banca en linea | banca movil) #h:q_app", "tienes (app | aplicacion) #tip:tu_staff",
      "(puedo | se puede) (ver mi saldo | consultar mi saldo | pagar servicios | hacer transferencias | pagar la luz) (en la app | desde la app | con la app | en linea | en el celular | desde el celular)",
      "como (veo | consulto | reviso) mi saldo", "como funciona la app", "que (puedo hacer | se puede hacer) en la app",
    ] },
    atm_q: { patterns: [
      "donde (hay | esta | queda) (un | el) (cajero [automatico] | atm) [mas cercano | cerca | por aqui] #h:q_atm", "(hay | tienen) [un] (cajero | cajeros) [aqui | cerca | por aqui]",
      "(cobran | cobra | hay) comision (en el cajero | en los cajeros | por usar el cajero | en cajeros de otros bancos)", "(los cajeros | el cajero) (cobra | cobran | es gratis | son gratis)",
      "cuanto (cobra | cobran) el cajero",
    ] },
    cost_q: { patterns: [
      "cuanto (cuesta | es | cobran | sale | me cobran) #h:tr_cost", "(hay | cobran) (comision | algo) #h:ex_fee", "(es | sale) caro", "cual es la comision", "cuanto (es | cuesta) la comision",
    ] },
    how_long_q: { patterns: [
      "cuanto (tarda | tiempo tarda | se tarda | tiempo toma | demora | tiempo se tarda) #h:tr_long", "cuando (llega | llegaria) [el dinero]", "es rapido",
      "(en cuanto tiempo | cuantos dias) [llega | tarda]", "cuanto [tiempo] (tarda | se tarda) en llegar [el dinero | la transferencia]",
    ] },
    need_q: { patterns: [
      "que (necesito | se necesita | ocupo | me piden | hace falta) [para (eso | la transferencia | mandar dinero | enviar dinero)] #h:tr_need",
      "que (datos | documentos | informacion) (necesito | necesita | ocupo | piden)",
    ] },
    swift_q: { patterns: [
      "que es (el | un) (swift | codigo swift | bic | codigo bic | aba | numero aba) #h:tr_swift", "donde (consigo | encuentro) el (swift | codigo swift)",
    ] },
    hours_q: { patterns: ["a que hora (cierran | abren | cierra | abre)", "(cual es | que) [su] horario", "(abren | estan abiertos) (los sabados | los domingos | el sabado | el domingo | manana)"] },
    proof_what: { patterns: ["que es (un | el) {proof}", "que (cuenta | sirve) como comprobante [de domicilio]", "que (tipo de)? comprobante (sirve | necesita | aceptan)"] },
    clabe_q: { patterns: ["(cual es | me da) mi (clabe | numero de cuenta)", "(necesito | ocupo) mi (clabe | numero de cuenta)", "que es (la | una) clabe"] },
    app_transfer_q: { patterns: [
      "(la | lo) puedo hacer (desde | en | por) (la app | el celular | linea | la aplicacion | internet) #h:tr_app",
      "(puedo | se puede) (mandar | enviar | transferir) [dinero | la] (desde | en | por) (la app | el celular | internet | linea)",
    ] },
    rate_q: { patterns: [
      "a cuanto (esta | tienen | compran | pagan) el dolar [hoy] #h:ex_rate", "(cual es | como esta) el tipo de cambio [hoy | del dolar]", "como esta el dolar [hoy]",
      "a como (esta | compran) el dolar", "cuantos pesos (me dan | son | serian | da) por (un | cada) dolar", "cuanto (me dan | dan | pagan) por (un | el) dolar",
      "a cuanto (vende | venden) el dolar #sell", "(venden | vende) dolares [aqui] #sell", "a cuanto (lo | la) (vende | venden) #sell",
      "cuantos pesos (son | serian | me dan por | me da por) {number} [dolares] #amt", "cuanto (es | son | seria | serian) {number} dolares [en pesos] #amt", "cuanto me (dan | da | darian) por {number} dolares #amt",
    ] },
    euro_amount: { patterns: [
      "{number} dolares #h:ex_amount", "(quiero | quisiera | necesito | voy a) cambiar [otros] {number} [dolares]", "(tengo | traigo) {number} dolares",
      "(cambieme | me cambia) {number} [dolares]", "son {number} dolares", "(todos | todo) (los que traigo | lo que traigo) #h:ex_all #all", "todos mis dolares #all",
      "(y si | que tal si) cambio {number} [dolares] #q",
    ] },
    euro_ctx: { patterns: ["{number}", "(solo | nomas | como | unos) {number}", "(todos | todo) #all", "[no] (mejor | prefiero) {number} [dolares]"] },

    // --- the card (twist)
    wrong_pin: { patterns: [
      "[si] (puse | meti | marqué | escribi) mal (el | mi) @pin [tres veces | varias veces | dos veces | muchas veces] #h:card_pin",
      "[si] me equivoqué (de | con el) @pin [tres veces | varias veces]", "[si] (se me olvidó | olvidé) (el | mi) @pin", "[si] no me acordaba (del | de mi) @pin",
      "[si] (tres | varias | dos | muchas) veces", "[si] creo que me equivoqué", "[si] me equivoqué", "[si] no me acuerdo (del | de mi) @pin", "[si] (puse | meti) (el | un) @pin (equivocado | incorrecto | mal)", "[si] creo que (lo | la) puse mal", "[si] (lo | la) puse mal",
    ] },
    pin_yes_ctx: { patterns: ["[si] (creo que si | puede ser | a lo mejor | tal vez | quizas | probablemente)"] },
    machine_error: { patterns: [
      "[no] (no lo creo | creo que no) #h:pin_no", "[no] el @pin (estaba | era) (bien | correcto)", "[no] no (puse | meti) mal [el | mi] @pin",
      "[no] no me equivoqué [de @pin]", "[no] (el cajero | la maquina) (esta | estaba) (descompuesto | fallando | mal)", "[no] (salio | aparecio | me salio) (un error | error)",
      "[no] no se que pasó", "[no] (nomas | solo) se (la | me la) (quedó | tragó)",
    ] },
    block_req: { patterns: [
      "(me puede | puede | podria | me podria) (bloquear | cancelar) (la | mi) tarjeta #h:card_block", "(bloqueela | cancelela | bloqueemela)",
      "(quiero | necesito) (bloquear | cancelar) (la | mi) tarjeta", "(me puedes bloquear | bloquea | cancela) (la | mi) tarjeta #tip:tu_staff",
    ] },
    new_card_q: { patterns: [
      "(me pueden | me puede | puedo) (dar | sacar | tener | pedir) (una | otra) tarjeta [nueva] #h:card_new", "(me van a dar | me dan) (una | otra) tarjeta [nueva]",
      "(necesito | quiero) (una tarjeta nueva | otra tarjeta)",
    ] },
    old_card_q: { patterns: [
      "(me pueden | me puede | puede) (devolver | regresar | dar) (mi | la) tarjeta", "(pueden | puede) (abrir | revisar) el cajero", "(puedo | podria) recuperar (mi | la) tarjeta",
      "(quiero | necesito) mi tarjeta [de vuelta]", "me (devuelven | regresan) [mi | la] tarjeta", "me la (devuelven | regresan | pueden devolver)",
    ] },
    account_safe_q: { patterns: [
      "(mi dinero | mi cuenta) (esta | sigue) (seguro | segura | bien)", "(puedo | todavia puedo) usar mi cuenta", "alguien puede usar mi tarjeta", "hay peligro",
    ] },
    // "Termina en 4582" / "No me acuerdo" to "¿Recuerda los últimos cuatro dígitos?"
    digits_ctx: { patterns: ["[termina en | terminan en | son | es | los ultimos son | creo que] {digits}"] },
    digits_unknown_ctx: { patterns: ["no (me acuerdo | recuerdo | lo recuerdo | los recuerdo | lo se | los se | me los se | tengo idea)", "ni idea"] },
    bills_ans: { patterns: [
      "(de | en billetes de) {number} (esta bien | estan bien | me sirve) #h:cash_twenties", "(de | en billetes de) {number}",
      "[en] billetes (chicos | pequenos | mas chicos | mas pequenos | de {number}) #h:cash_small", "(unos | algunos) (mas chicos | chicos | mas pequenos)",
      "(como sea | da igual | me da igual | no importa | lo que sea | lo que tenga | como usted quiera | como guste | cualquiera)",
      "(de | en) {number} y (de)? {number}", "(mitad | la mitad) (de)? {number} y (mitad | la mitad)? (de)? {number}",
    ] },

    // --- general
    more_no: { patterns: [
      "(eso | esto) (es | seria) todo [por hoy | por ahora] #h:more_everything", "[no] (es | seria) todo [por hoy | por ahora] #h:more_all", "nada mas [por hoy]",
      "[no] no (necesito | ocupo) nada mas", "ya (es | seria) todo", "(no tengo | ya no tengo) (mas | otras) preguntas", "(por hoy | por ahora) es todo",
      "(ya)? (con eso | eso) es todo", "con eso estoy bien",
    ] },
    have_question: { patterns: [
      "[si] tengo (una | otra) pregunta #h:more_question", "(le puedo | puedo) (hacer una pregunta | preguntar algo)", "(una | otra) (pregunta | cosa) [mas]", "[si] una cosa mas",
    ] },
    no_problem: { patterns: [
      "[claro] (no hay problema | sin problema) #h:np_sure", "[no se preocupe] (tomese | tome) su tiempo #h:np_time", "no se preocupe", "con calma", "no tengo prisa",
      "(no hay | sin) prisa", "(claro)? (lo espero | puedo esperar)", "no pasa nada", "tranquilo",
    ] },
    not_yet: { patterns: [
      "todavia no", "aun no", "no todavia", "(todavia | aun) no (tengo | soy cliente)", "no tengo cuenta [todavia | aqui | con ustedes]", "no soy cliente [todavia | de este banco]",
    ] },
    // "Sí, ya soy cliente" at "¿Tiene cuenta con nosotros?"
    customer_ctx: { patterns: ["[si] (ya)? soy cliente", "[si] (ya)? tengo cuenta [aqui | con ustedes]", "[si] tengo una [aqui]"] },
  },

  lines: {
    greet: [
      t("¡Buenos días! | ¿En | qué | le | puedo | ayudar?", "Good morning! | In | what | (to) you | can I | help?", "Good morning! How can I help you?"),
      t("¡Buenas tardes! | {m:Bienvenido|f:Bienvenida} | al | Banco del Puerto. | ¿Qué | se le | ofrece?", "Good afternoon! | Welcome | to the | Banco del Puerto. | What | (to) you | is offered?",
        "Good afternoon! Welcome to Banco del Puerto. What can I do for you?",
        { flags: { 5: "¿Qué se le ofrece?: a polite Mexican way to ask what you need (literally, what is offered to you)." } }),
    ],
    greet_turn: [
      t("¿Turno | A-27? | ¡Buenos días! | Pase, | por favor. | ¿En | qué | le | puedo | servir?", "Number | A27? | Good morning! | Come in, | please. | In | what | (to) you | can I | serve?",
        "Number A27? Good morning! Come on up, please. How can I help you?",
        { say: "¿Turno a veintisiete? ¡Buenos días! Pase, por favor. ¿En qué le puedo servir?", flags: { 0: "turno: your number from the ticket machine at the door." } }),
    ],
    greet_back: [
      t("¡Qué | gusto | {m:verlo|f:verla} | otra vez! | ¿En | qué | le | puedo | ayudar?", "What | pleasure | to see you | again! | In | what | (to) you | can I | help?",
        "Good to see you again! How can I help you?", { flags: { 2: "verlo / verla: to see you, with lo or la for a man or a woman." } }),
    ],
    greet_hay: [
      t("¡Buenos días! | ¿Cómo | está?", "Good morning! | How | are you?", "Good morning! How are you?"),
      t("¡Buenas tardes! | ¿Cómo | le | va?", "Good afternoon! | How | (to) you | does it go?", "Good afternoon! How's it going?"),
    ],
    ask_help: [
      t("Entonces, | ¿en | qué | le | puedo | ayudar?", "So, | in | what | (to) you | can I | help?", "So, how can I help you?"),
      t("Dígame, | ¿en | qué | le | ayudo?", "Tell me, | in | what | (to) you | do I help?", "Go ahead, what can I do for you?"),
    ],
    services: [
      t("Le | puedo | ayudar | a | abrir | una | cuenta, | enviar | dinero | al | extranjero | o | cambiar | dólares.",
        "(To) you | I-can | help | to | open | an | account, | send | money | to the | abroad | or | change | dollars.",
        "I can help you open an account, send money abroad or change dollars."),
    ],
    go_ahead: [
      t("Claro, | dígame.", "Sure, | tell me.", "Sure, go ahead."),
      t("Con gusto. | ¿Cuál | es | su | pregunta?", "Gladly. | What | is | your | question?", "Of course. What's your question?"),
    ],
    turn_ok: [t("Sí, | es | su | turno. | Adelante.", "Yes, | it's | your | turn. | Go ahead.", "Yes, it's your turn. Go ahead.")],
    turn_where: [t("En | la | máquina | de | la | entrada. | Pero | ya | le | toca: | pase.", "At | the | machine | by | the | entrance. | But | already | (to) you | it falls: | come in.",
      "From the machine by the door. But it's your turn now: come on up.", { flags: { 9: "le toca: it's your turn (literally, it falls to you)." } })],
    welcome_town: [
      t("¡{m:Bienvenido|f:Bienvenida} | a | Puerto Colibrí! | ¿Le gustaría | abrir | una | cuenta | con | nosotros?",
        "Welcome | to | Puerto Colibrí! | Would you like | to open | an | account | with | us?",
        "Welcome to Puerto Colibrí! Would you like to open an account with us?"),
    ],

    // account type
    ask_type: [
      t("¡Claro! | ¿Qué | tipo | de | cuenta | busca: | de | débito | o | de | ahorro?", "Sure! | What | kind | of | account | are you looking for: | — | debit | or | — | savings?",
        "Sure! What kind of account are you looking for: checking or savings?",
        { flags: { 7: "de débito: a debit account, the everyday account with a debit card (a checking account).", 9: "de: of; cuenta de ahorro is a savings account." } }),
      t("Con gusto. | ¿La | quiere | de | débito | o | de | ahorro?", "Gladly. | It | do you want | — | debit | or | — | savings?", "Of course. Would you like checking or savings?",
        { flags: { 1: "la: it, the object pronoun for la cuenta (not an article).", 3: "de débito: a debit account, the everyday account (a checking account).", 6: "de: of; de ahorro is a savings account." } }),
    ],
    ask_type_again: [
      t("Entonces, | ¿de | débito | o | de | ahorro?", "So, | — | debit | or | — | savings?", "So, checking or savings?", { flags: { 1: "de: of; English says just checking or savings." } }),
      t("¿Cuál | le gustaría?", "Which one | would you like?", "Which one would you like?"),
    ],
    explain_types: [
      t("La | cuenta | de | débito | es | para | el | día a día, | y | viene | con | tarjeta | de | débito.",
        "The | account | of | debit | is | for | the | day-to-day, | and | it comes | with | a card | of | debit.",
        "A checking account is for everyday spending, and it comes with a debit card."),
    ],
    explain_savings: [
      t("La | cuenta | de | ahorro | le | da | intereses.", "The | account | of | savings | (to) you | gives | interest.", "A savings account earns you interest."),
    ],
    recommend_both: [
      t("La mayoría | empieza | con | la | de | débito. | Muchos | abren | las | dos.", "Most people | start | with | the | — | debit one. | Many | open | the | two.",
        "Most people start with checking. Many open both.", { flags: { 4: "la de débito: the debit one (la cuenta is understood)." } }),
    ],
    ack_type: [
      t("Muy | buena | opción.", "Very | good | choice.", "Great choice."),
      t("Perfecto.", "Perfect.", "Perfect."),
      t("Muy | bien.", "Very | good.", "Sounds good."),
    ],
    type_which: [t("Perdón, | ¿cuál | de | las | dos: | de | débito | o | de | ahorro?", "Sorry, | which | of | the | two: | — | debit | or | — | savings?",
      "Sorry, which one: checking or savings?", { flags: { 5: "de: of; English says just checking or savings." } })],
    ack_both: [t("Perfecto, | abrimos | las | dos.", "Perfect, | we'll-open | the | two.", "Great, we'll open both.")],
    ack_not_type: [t("Bueno, | entonces | solo | la | de | débito.", "Okay, | then | only | the | — | debit one.", "Okay, just checking then.",
      { flags: { 4: "la de débito: the debit one (la cuenta is understood)." } })],
    ack_not_type_s: [t("Bueno, | entonces | la | de | ahorro.", "Okay, | then | the | — | savings one.", "Okay, savings then.",
      { flags: { 3: "la de ahorro: the savings one (la cuenta is understood)." } })],

    // ID and proof of address
    ask_id: [
      t("¿Me | permite | una | identificación? | Su | pasaporte | está bien.", "(To) me | you-allow | an | ID? | Your | passport | is fine.",
        "May I see some ID? Your passport is fine."),
      t("¿Me | permite | su | pasaporte, | por favor?", "(To) me | you-allow | your | passport, | please?", "May I see your passport, please?"),
    ],
    ask_id_proof: [
      t("Voy a | necesitar | su | pasaporte | o | su | tarjeta | de | residente, | y | un | comprobante | de | domicilio, | como | un | recibo | de | luz.",
        "I'm going to | need | your | passport | or | your | card | of | resident, | and | a | proof | of | address, | like | a | bill | of | electricity.",
        "I'll need your passport or your residence card, and proof of address, like an electric bill."),
    ],
    id_thanks: [
      t("Gracias.", "Thanks.", "Thank you."),
      t("Perfecto, | gracias.", "Perfect, | thanks.", "Perfect, thanks."),
      t("Muy | bien, | gracias.", "Very | good, | thanks.", "Great, thank you."),
    ],
    need_photo_id: [
      t("Lo siento, | necesitamos | una | identificación | oficial: | su | pasaporte | o | su | tarjeta | de | residente. | ¿Trae | alguno | de | los | dos?",
        "I'm sorry, | we need | an | ID | official: | your | passport | or | your | card | of | resident. | Do you have with you | any | of | the | two?",
        "I'm sorry, we need an official ID: your passport or your residence card. Do you have either one with you?",
        { flags: { 12: "traer: to bring; ¿Trae…? asks whether you have it on you." } }),
    ],
    license_no: [
      t("Lo siento, | la | licencia | no nos sirve | como | identificación. | ¿Trae | su | pasaporte | o | su | tarjeta | de | residente?",
        "I'm sorry, | the | license | doesn't work for us | as | ID. | Do you have with you | your | passport | or | your | card | of | resident?",
        "I'm sorry, we can't take a driver's license as ID. Do you have your passport or your residence card with you?"),
    ],
    come_back_id: [
      t("No hay problema. | Regrese | con | su | pasaporte | cuando | guste.", "No problem. | Come back | with | your | passport | when | you like.",
        "No problem. Just come back with your passport whenever you like."),
    ],
    ask_proof: [
      t("¿Y | trae | un | comprobante | de | domicilio? | Un | recibo | de | luz | o | de | agua | nos | sirve.",
        "And | do you have | a | proof | of | address? | A | bill | of | electricity | or | of | water | (to) us | works.",
        "And do you have proof of address? An electric or water bill works."),
      t("También | necesito | un | comprobante | de | domicilio | de | no | más | de | tres | meses.",
        "Also | I need | a | proof | of | address | of | not | more | than | three | months.",
        "I'll also need proof of address from the last three months."),
    ],
    ask_proof_again: [t("¿Y | el | comprobante | de | domicilio?", "And | the | proof | of | address?", "And the proof of address?")],
    proof_ok: [
      t("Sí, | nos | sirve, | gracias.", "Yes, | (to) us | it works, | thanks.", "Yes, that works, thanks."),
      t("Perfecto.", "Perfect.", "Perfect."),
    ],
    ask_lease: [t("No se preocupe. | ¿Tiene | contrato | de | renta?", "Don't worry. | Do you have | a contract | of | rent?", "Don't worry. Do you have a lease?")],
    ask_lease_again: [t("¿Y | tiene | contrato | de | renta?", "And | do you have | a contract | of | rent?", "And do you have a lease?")],
    proof_later: [t("Está bien. | Lo | puede | traer | después.", "That's fine. | It | you-can | bring | later.", "That's okay. You can bring it in later.")],

    // the CURP (step "ssn")
    ask_ssn: [
      t("¿Ya | tiene | su | CURP?", "Already | do you have | your | CURP?", "Do you have your CURP yet?",
        { flags: { 3: "CURP: Mexico's population registry code, which residents have too." } }),
      t("¿Y | me | da | su | CURP, | por favor? | Normalmente | viene | en | su | tarjeta | de | residente.",
        "And | (to) me | you-give | your | CURP, | please? | Usually | it comes | on | your | card | of | resident.",
        "And could I get your CURP, please? It's usually on your residence card.",
        { flags: { 4: "CURP: Mexico's population registry code, which residents have too." } }),
    ],
    ssn_none_ok: [
      t("No se preocupe: | la | buscamos | en | el | sistema | con | sus | datos.", "Don't worry: | it | we'll-look up | in | the | system | with | your | details.",
        "Don't worry: we'll look it up in the system with your details.", { flags: { 1: "la: it, the object pronoun for la CURP (not an article)." } }),
      t("No pasa nada; | la | puede | agregar | después.", "It's no problem; | it | you-can | add | later.", "That's fine; you can add it later.", { flags: { 1: "la: it, the object pronoun for la CURP (not an article)." } }),
    ],
    ssn_yes_type: [t("Perfecto. | Escríbala | aquí, | por favor.", "Perfect. | Write it | here, | please.", "Great. Write it here, please.")],
    ssn_explain: [
      t("Es | la | Clave Única de Registro de Población: | un | código | de | dieciocho | letras | y | números.",
        "It's | the | Unique Population Registry Code: | a | code | of | eighteen | letters | and | numbers.",
        "It's the Unique Population Registry Code: an eighteen-character code of letters and numbers.",
        { spell: "CURP" }),
    ],
    rfc_info: [t("Para | abrir | esta | cuenta | no lo necesita.", "To | open | this | account | you don't need it.", "You don't need it to open this account.")],

    // form
    ask_form: [
      t("Ahora | llene | esta | solicitud | y | firme | aquí | abajo, | por favor.", "Now | fill out | this | application | and | sign | here | below, | please.",
        "Now please fill out this application and sign here at the bottom."),
      t("¿Me | ayuda | a | llenar | esta | solicitud? | Luego | firma | aquí.", "(To) me | you-help | to | fill out | this | application? | Then | you-sign | here.",
        "Could you fill out this application for me? Then sign right here.", { flags: { 1: "¿Me ayuda a…?: a polite request (literally, do you help me to…)." } }),
    ],
    form_wait: [t("Tómese | su | tiempo. | Me | avisa | cuando | termine.", "Take | your | time. | (To) me | you-let-know | when | you-finish.", "Take your time. Just let me know when you're done.")],
    pen: [t("Claro, | aquí | tiene | una | pluma.", "Sure, | here | you have | a | pen.", "Sure, here's a pen.",
      { flags: { 4: "Mexican: pluma = pen; bolígrafo is the neutral word." },
        neutral: t("Claro, | aquí | tiene | un | bolígrafo.", "Sure, | here | you have | a | pen.", "Sure, here's a pen.") })],
    where_sign: [t("Aquí, | en | la | línea | de | abajo.", "Here, | on | the | line | at | the bottom.", "Right here, on the line at the bottom.")],
    what_write: [t("Solo | su | nombre, | su | dirección, | su | teléfono | y | su | correo.", "Just | your | name, | your | address, | your | phone | and | your | email.",
      "Just your name, address, phone number and email.")],
    form_thanks: [
      t("Perfecto, | gracias.", "Perfect, | thanks.", "Perfect, thank you."),
      t("Muy | bien, | gracias.", "Very | good, | thanks.", "Great, thanks."),
    ],

    // deposit
    min_deposit: [t("Para | abrirla | necesita | depositar | por lo menos | {$price}.", "To | open it | you-need | to deposit | at least | {$price}.", "You need to deposit at least {$price} to open it.")],
    ask_deposit: [
      t("¿Con | cuánto | la | quiere | abrir?", "With | how much | it | do you want | to open?", "How much would you like to open it with?", { flags: { 2: "la: it, the object pronoun for la cuenta (not an article)." } }),
      t("¿Cuánto | va | a | depositar | hoy?", "How much | are you going | to | deposit | today?", "How much are you depositing today?"),
    ],
    deposit_min: [t("Lo siento, | el | mínimo | es | {$price}.", "I'm sorry, | the | minimum | is | {$price}.", "Sorry, the minimum is {$price}.")],
    min_is: [t("El | mínimo | es | {$price}.", "The | minimum | is | {$price}.", "The minimum is {$price}.")],
    deposit_enough: [t("Sí, | con | eso | alcanza. | ¿Lo | deposito, | entonces?", "Yes, | with | that | it's enough. | It | shall I deposit, | then?", "Yes, that's enough. Shall I deposit it, then?")],
    deposit_later: [t("El | depósito | lo | hacemos | al | final.", "The | deposit | it | we-do | at the | end.", "We'll do the deposit at the end.",
      { flags: { 2: "lo: it, repeating el depósito; Spanish repeats an object that comes first." } })],

    // opened
    opened: [
      t("¡Listo! | Su | cuenta | ya | está | abierta.", "Done! | Your | account | already | is | open.", "All set! Your account is open."),
      t("¡Ya | quedó! | Su | cuenta | nueva | está | abierta.", "Already | it's settled! | Your | account | new | is | open.", "All done! Your new account is open.",
        { flags: { 1: "quedó: it's done (literally, it remained); ¡Ya quedó! is a common way to say all set." } }),
    ],
    card_info: [
      t("Su | tarjeta | de | débito | va a | estar | lista | en | unos | días; | se la | entregamos | aquí.", "Your | card | of | debit | is going to | be | ready | in | a few | days; | it to you | we-hand | here.",
        "Your debit card will be ready in a few days; we'll give it to you here."),
      t("Su | tarjeta | llega | a | la | sucursal | en | unos | días | hábiles.", "Your | card | arrives | at | the | branch | in | a few | days | business.",
        "Your card will arrive at the branch in a few business days."),
    ],
    pin_info: [
      t("El | NIP | lo | puede | cambiar | en | cualquiera | de | nuestros | cajeros.", "The | PIN | it | you-can | change | at | any | of | our | ATMs.", "You can change your PIN at any of our ATMs.",
        { flags: { 1: "Mexican: NIP = PIN (número de identificación personal); PIN is understood everywhere." },
          neutral: t("El | PIN | lo | puede | cambiar | en | cualquiera | de | nuestros | cajeros.", "The | PIN | it | you-can | change | at | any | of | our | ATMs.", "You can change your PIN at any of our ATMs.") }),
    ],
    routing: [
      t("Aquí | tiene | su | número | de | cuenta | y | su | CLABE, | para | que | le | depositen | su | sueldo.",
        "Here | you have | your | number | of | account | and | your | CLABE, | for | that | (to) you | they-deposit | your | pay.",
        "Here's your account number and your CLABE, so your employer can deposit your pay.",
        { flags: { 8: "CLABE: the 18-digit number for transfers between Mexican banks.", 9: "para que + subjunctive (depositen): so that." },
          write: "Banco del Puerto · número de cuenta 0482 117 359 · la CLABE (18 dígitos) viene en su contrato", spell: "CLABE" }),
    ],
    hours: [t("De | lunes | a | viernes, | de | nueve | a | cuatro, | y | los | sábados | hasta | las | dos.", "From | Monday | to | Friday, | from | nine | to | four, | and | — | Saturdays | until | — | two.",
      "Monday to Friday from nine to four, and Saturdays until two.", { flags: { 9: "los sábados: on Saturdays; the article makes it every Saturday.", 12: "Spanish uses an article before clock times; English has no separate word." } })],
    proof_explain: [t("Es | un | recibo | con | su | dirección: | de | luz, | de | agua | o | de | teléfono.", "It's | a | bill | with | your | address: | of | electricity, | of | water | or | of | phone.",
      "It's a bill with your address on it: electricity, water or phone.")],
    yes_or_no: [t("Perdón, | ¿eso | es | un | sí | o | un | no?", "Sorry, | that | is | a | yes | or | a | no?", "Sorry, is that a yes or a no?")],
    cash_which: [t("Perdón, | ¿entonces | sí | necesita | efectivo?", "Sorry, | so | yes | you-need | cash?", "Sorry, so do you need cash or not?", { flags: { 2: "sí before a verb stresses it: so you do need…?" } })],
    clabe_info: [
      t("La | CLABE | es | su | número | de | dieciocho | dígitos | para | transferencias; | viene | en | su | contrato.",
        "The | CLABE | is | your | number | of | eighteen | digits | for | transfers; | it comes | in | your | contract.",
        "The CLABE is your eighteen-digit number for transfers; it's in your contract.", { spell: "CLABE" }),
    ],
    offer_savings: [
      t("¿Le gustaría | abrir | también | una | cuenta | de | ahorro? | No tiene | comisión.", "Would you like | to open | also | an | account | of | savings? | It doesn't have | a fee.",
        "Would you like a savings account too? There's no fee."),
    ],
    offer_savings_again: [t("Entonces, | ¿también | una | de | ahorro?", "So, | also | one | — | savings?", "So, a savings account too?", { flags: { 3: "una de ahorro: a savings one (cuenta is understood)." } })],
    savings_yes: [t("Perfecto, | se la | abro | también.", "Perfect, | it for you | I'll-open | too.", "Great, I'll open that one too.")],
    offer_app: [t("¿Quiere | que | le | ayude | a | descargar | nuestra | app?", "Do you want | that | (to) you | I-help | to | download | our | app?", "Would you like me to help you download our app?")],
    offer_app_again: [t("Entonces, | ¿le | ayudo | con | la | app?", "So, | (to) you | shall I help | with | the | app?", "So, shall I help you with the app?")],
    app_features: [t("Ahí | puede | consultar | su | saldo, | hacer | transferencias | y | pagar | servicios.", "There | you-can | check | your | balance, | make | transfers | and | pay | bills.",
      "There you can check your balance, make transfers and pay your bills.", { flags: { 9: "servicios: here, utility bills (light, water, phone)." } })],
    app_yes: [t("¡Perfecto! | Escanee | este | código | con | su | celular.", "Perfect! | Scan | this | code | with | your | cell phone.", "Great! Just scan this code with your phone.")],
    app_have: [t("¡Perfecto! | Entonces | solo | entre | con | su | cuenta | nueva.", "Perfect! | Then | just | log in | with | your | account | new.",
      "Great! Then just log in with your new account.", { flags: { 3: "entrar: to go in; here, to log in." } })],
    app_no: [t("No hay problema. | La | puede | descargar | después.", "No problem. | It | you-can | download | later.", "No problem. You can download it later.", { flags: { 1: "la: it, the object pronoun for la app (not an article)." } })],
    no_problem: [t("No hay problema.", "No problem.", "No problem.")],
    anything_else: [
      t("¿Algo | más | en | que | le | pueda | ayudar?", "Anything | else | in | which | (to) you | I-can | help?", "Anything else I can help you with?"),
      t("¿Le | puedo | ayudar | en | algo | más?", "(To) you | can I | help | in | something | else?", "Can I help you with anything else?"),
    ],
    anything_else_yes: [t("Claro, | dígame.", "Sure, | tell me.", "Sure, go ahead.")],
    bye: [
      t("¡Gracias | por | su | visita! | Que | tenga | buen | día.", "Thanks | for | your | visit! | May | you-have | good | day.", "Thanks for coming in! Have a nice day."),
      t("Gracias | por | venir. | ¡Que | le | vaya | bien!", "Thanks | for | coming. | May | (to) you | it go | well!", "Thanks for coming in. Take care!"),
    ],

    // questions about the account
    fee_info: [t("Si | mantiene | un | saldo | promedio | de | {$price} | al | mes, | no paga | comisión.", "If | you-keep | a | balance | average | of | {$price} | per | month, | you don't pay | a fee.",
      "If you keep an average balance of {$price} a month, there's no fee.")],
    fee_monthly: [t("Si no, | la | comisión | es | de | {$price} | al | mes.", "Otherwise, | the | fee | is | — | {$price} | per | month.", "Otherwise, the fee is {$price} a month.",
      { flags: { 4: "de before an amount: the fee is of that amount; English needs no word." } })],
    fee_waive: [t("Y | si | recibe | aquí | su | sueldo, | tampoco | paga | comisión.", "And | if | you-receive | here | your | pay, | not either | you-pay | a fee.",
      "And if your pay goes into the account, there's no fee either.", { flags: { 6: "tampoco + verb: not … either; no other negative needed." } })],
    savings_fee: [t("La | cuenta | de | ahorro | no tiene | comisión.", "The | account | of | savings | doesn't have | a fee.", "The savings account has no fee.")],
    interest_info: [t("Ahorita | da | alrededor | del | 4% | al | año.", "Right now | it gives | around | of the | 4% | per | year.", "Right now it pays around 4% a year.",
      { say: "Ahorita da alrededor del cuatro por ciento al año.", flags: { 0: "Mexican: ahorita = right now; en este momento is the neutral form." },
        neutral: t("En este momento | da | alrededor | del | 4% | al | año.", "Right now | it gives | around | of the | 4% | per | year.", "Right now it pays around 4% a year.",
          { say: "En este momento da alrededor del cuatro por ciento al año." }) })],
    card_abroad: [t("Sí, | la | puede | usar | en | el | extranjero; | las | compras | en | otra | moneda | tienen | una | pequeña | comisión.",
      "Yes, | it | you-can | use | in | the | abroad; | the | purchases | in | another | currency | have | a | small | fee.",
      "Yes, you can use it abroad; purchases in another currency have a small fee.", { flags: { 1: "la: it, the object pronoun for la tarjeta (not an article).", 5: "el extranjero: abroad (literally, the foreign land)." } })],
    app_info: [t("¡Sí! | Nuestra | app | es | gratis. | Puede | consultar | su | saldo | y | pagar | servicios.", "Yes! | Our | app | is | free. | You-can | check | your | balance | and | pay | bills.",
      "Yes! Our app is free. You can check your balance and pay your bills.")],
    atm_where: [t("Tenemos | un | cajero | aquí | afuera, | junto a | la | puerta.", "We have | an | ATM | here | outside, | next to | the | door.", "We have an ATM right outside, next to the door.")],
    atm_free: [t("En | nuestros | cajeros | no paga | comisión; | en | los | de | otros | bancos, | sí.", "At | our | ATMs | you don't pay | a fee; | at | the ones | of | other | banks, | yes.",
      "Our ATMs are free for you; other banks' ATMs charge a fee.")],
    open_need: [t("Su | pasaporte | o | su | tarjeta | de | residente, | un | comprobante | de | domicilio | y | por lo menos | {$price}.",
      "Your | passport | or | your | card | of | resident, | a | proof | of | address | and | at least | {$price}.",
      "Your passport or your residence card, proof of address and at least {$price}.")],
    open_time: [t("Son | unos | veinte | minutos.", "It's | about | twenty | minutes.", "It takes about twenty minutes.", { flags: { 1: "unos before a number: about." } })],

    // transfer
    transfer_how: [
      t("Puede | hacer | una | transferencia | internacional.", "You-can | make | a | transfer | international.", "You can send an international transfer."),
      t("Lo | mejor | es | una | transferencia | internacional.", "The | best | is | a | transfer | international.", "The best way is an international transfer."),
    ],
    transfer_cost: [t("Cuesta | {$price}, | y | normalmente | tarda | de | uno | a | tres | días | hábiles.", "It costs | {$price}, | and | usually | it takes | from | one | to | three | days | business.",
      "It costs {$price}, and it usually takes one to three business days.")],
    transfer_fee: [t("La | comisión | es | de | {$price} | por | envío.", "The | fee | is | — | {$price} | per | transfer.", "The fee is {$price} per transfer.",
      { flags: { 3: "de before an amount: the fee is of that amount; English needs no word." } })],
    transfer_time: [t("Normalmente, | de | uno | a | tres | días | hábiles.", "Usually, | from | one | to | three | days | business.", "Usually one to three business days.")],
    transfer_need: [t("Necesita | el | nombre | de | la | persona, | su | número | de | cuenta | y | el | código | SWIFT | de | su | banco.",
      "You-need | the | name | of | the | person, | their | number | of | account | and | the | code | SWIFT | of | their | bank.",
      "You'll need the person's name, their account number and their bank's SWIFT code.",
      { write: "Transferencia internacional: $750 · 1 a 3 días hábiles · nombre, número de cuenta, código SWIFT", flags: { 6: "su: here, their (the other person's)." } })],
    swift_explain: [t("Es | el | código | internacional | del | banco. | Se lo | puede | dar | el | banco | de | la | otra | persona.",
      "It's | the | code | international | of the | bank. | It to you | can | give | the | bank | of | the | other | person.",
      "It's the bank's international code. The other person's bank can give it to you.", { spell: "SWIFT" })],
    transfer_app: [t("Sí, | también | la | puede | hacer | desde | la | app.", "Yes, | also | it | you-can | do | from | the | app.", "Yes, you can also do it in the app.", { flags: { 2: "la: it, the object pronoun for la transferencia (not an article)." } })],

    // exchange
    ask_customer: [t("¿Tiene | cuenta | con | nosotros?", "Do you have | an account | with | us?", "Do you have an account with us?")],
    ask_customer_again: [t("Entonces, | ¿tiene | cuenta | con | nosotros?", "So, | do you have | an account | with | us?", "So, do you have an account with us?")],
    customers_only: [t("Lo siento, | solo | cambiamos | dólares | a | nuestros | clientes.", "I'm sorry, | only | we-change | dollars | for | our | customers.",
      "I'm sorry, we only change dollars for our customers.")],
    need_account_wire: [t("Para | enviar | una | transferencia | necesita | una | cuenta | con | nosotros.", "To | send | a | transfer | you-need | an | account | with | us.",
      "You'll need an account with us to send a transfer.")],
    offer_open: [t("¿Le gustaría | abrir | una? | Son | unos | veinte | minutos.", "Would you like | to open | one? | It's | about | twenty | minutes.",
      "Would you like to open one? It only takes about twenty minutes.", { flags: { 4: "unos before a number: about." } })],
    customer_yes: [t("Perfecto. | Entonces | la | puede | hacer | en | la | app | o | aquí | en | ventanilla.", "Perfect. | Then | it | you-can | do | in | the | app | or | here | at | the counter.",
      "Great. Then you can do it in the app or here at the counter.", { flags: { 2: "la: it, the object pronoun for la transferencia (not an article)." } })],
    exchange_rate: [t("Hoy | le | compramos | el | dólar | a | $17.20.", "Today | (from) you | we-buy | the | dollar | at | 17.20 pesos.", "Today we're buying dollars at 17.20 pesos.",
      { say: "Hoy le compramos el dólar a diecisiete con veinte.", flags: { 6: "Said a diecisiete con veinte: 17 pesos and 20 centavos." } })],
    rate_sell: [t("Lo | vendemos | a | $18.10, | y | se lo | compramos | a | $17.20.", "It | we-sell | at | 18.10 pesos, | and | it from you | we-buy | at | 17.20 pesos.",
      "We sell dollars at 18.10 pesos and buy them at 17.20.", { say: "Lo vendemos a dieciocho con diez, y se lo compramos a diecisiete con veinte." })],
    ex_no_fee: [t("No cobramos | comisión; | ya | va | en | el | tipo de cambio.", "We don't charge | a fee; | already | it goes | in | the | exchange rate.", "There's no fee; it's built into the exchange rate.")],
    ex_limit: [t("Lo siento, | en | efectivo | solo | le | podemos | cambiar | hasta | 4,000 | dólares | al | mes.",
      "I'm sorry, | in | cash | only | (for) you | we-can | change | up to | 4,000 | dollars | per | month.",
      "I'm sorry, we can only change up to 4,000 dollars in cash a month for you.", { say: "Lo siento, en efectivo solo le podemos cambiar hasta cuatro mil dólares al mes." })],
    exchange_after: [t("Claro, | en cuanto | quede | abierta | su | cuenta | se los | cambio.", "Sure, | as soon as | it's | open | your | account | them for you | I'll-change.",
      "Sure, I'll change them for you as soon as your account is open.", { flags: { 2: "quede: subjunctive after en cuanto (as soon as), for something that hasn't happened yet." } })],
    pesos_only: [t("Su | cuenta | es | en | pesos.", "Your | account | is | in | pesos.", "Your account is in pesos.")],
    exchange_other_no: [t("Lo siento, | aquí | solo | cambiamos | dólares | americanos.", "I'm sorry, | here | only | we-change | dollars | American.", "I'm sorry, we only change US dollars here.")],
    ask_euros: [t("¿Cuántos | dólares | quiere | cambiar?", "How many | dollars | do you want | to change?", "How many dollars would you like to change?")],
    ask_euros_again: [t("Entonces, | ¿cuántos | dólares?", "So, | how many | dollars?", "So, how many dollars?")],
    exchange_done: [t("Aquí | tiene: | {$amount}. | Y | su | comprobante.", "Here | you have: | {$amount}. | And | your | receipt.", "Here you go: {$amount}. And here's your receipt.")],
    exchange_done_generic: [t("Aquí | tiene. | El | tipo de cambio | viene | en | su | comprobante.", "Here | you have. | The | exchange rate | comes | on | your | receipt.",
      "Here you go. The exchange rate is on your receipt.")],
    exchange_would: [t("Serían | {$amount}.", "It would be | {$amount}.", "That would be {$amount}.")],
    exchange_quote: [t("Serían | {$amount}. | ¿Se los | cambio?", "It would be | {$amount}. | Them for you | shall I change?", "That would be {$amount}. Shall I change them for you?")],
    exchange_quote_rate: [t("Se los | compramos | a | $17.20 | cada uno. | ¿Se los | cambio?", "Them from you | we-buy | at | 17.20 pesos | each. | Them for you | shall I change?",
      "We buy them at 17.20 pesos each. Shall I change them for you?", { say: "Se los compramos a diecisiete con veinte cada uno. ¿Se los cambio?" })],

    // the card (twist)
    card_sorry: [
      t("¡Ay, | no! | Lo siento | mucho.", "Oh, | no! | I'm sorry | a lot.", "Oh no! I'm so sorry."),
      t("Uy, | qué | mala | suerte. | Lo siento.", "Oh, | what | bad | luck. | I'm sorry.", "Oh, that's bad luck. I'm sorry."),
    ],
    ask_pin: [
      t("¿Puso | mal | el | NIP?", "Did you put | wrong | the | PIN?", "Did you enter the wrong PIN?",
        { flags: { 3: "Mexican: NIP = PIN (número de identificación personal); PIN is understood everywhere." },
          neutral: t("¿Puso | mal | el | PIN?", "Did you put | wrong | the | PIN?", "Did you enter the wrong PIN?") }),
      t("¿Se equivocó | de | NIP | varias | veces?", "Did you make a mistake | with | PIN | several | times?", "Did you enter the wrong PIN a few times?",
        { flags: { 2: "Mexican: NIP = PIN (número de identificación personal); PIN is understood everywhere." },
          neutral: t("¿Se equivocó | de | PIN | varias | veces?", "Did you make a mistake | with | PIN | several | times?", "Did you enter the wrong PIN a few times?") }),
    ],
    pin_explain: [t("Seguramente | fue | eso. | Después de | tres | intentos, | el | cajero | retiene | la | tarjeta.", "Surely | it was | that. | After | three | tries, | the | ATM | keeps | the | card.",
      "That's probably why. After three wrong tries, the machine keeps the card.")],
    machine_problem: [t("Entonces | puede | ser | una | falla | del | cajero.", "Then | it may | be | a | fault | of the | ATM.", "Then it might be a problem with the machine.")],
    block_new: [t("Por | seguridad, | voy a | cancelar | esa | tarjeta | y | pedirle | una | nueva.", "For | security, | I'm going to | cancel | that | card | and | order (for you) | a | new one.",
      "For your security, I'll cancel that card and order you a new one.", { flags: { 7: "pedirle: to order + le, for you." } })],
    ask_id_card: [
      t("¿Me | permite | una | identificación, | por favor?", "(To) me | you-allow | an | ID, | please?", "May I see some ID, please?"),
      t("Primero, | ¿me | permite | su | identificación?", "First, | (to) me | you-allow | your | ID?", "First, may I see your ID?"),
    ],
    ask_digits: [t("¿Recuerda | los | últimos | cuatro | dígitos | de | la | tarjeta?", "Do you remember | the | last | four | digits | of | the | card?", "Do you remember the last four digits of the card?")],
    ask_digits_again: [t("¿Y | los | últimos | cuatro | dígitos?", "And | the | last | four | digits?", "And the last four digits?")],
    digits_which: [t("¿Cuáles | son?", "Which | are they?", "What are they?")],
    digits_ok: [t("Gracias, | ya | la | encontré.", "Thanks, | already | it | I-found.", "Thanks, I've found it.", { flags: { 2: "la: it, the object pronoun for la tarjeta (not an article)." } })],
    digits_unknown: [t("No se preocupe, | la | busco | con | su | nombre.", "Don't worry, | it | I'll-look for | with | your | name.", "Don't worry, I'll look it up by your name.",
      { flags: { 1: "la: it, the object pronoun for la tarjeta (not an article)." } })],
    card_blocked: [t("Listo, | la | tarjeta | anterior | ya | está | cancelada.", "Done, | the | card | previous | already | is | canceled.", "All right, the old card is canceled.")],
    new_card_info: [t("Su | tarjeta | nueva | va a | estar | lista | en | unos | días; | la | recoge | aquí | en | la | sucursal.",
      "Your | card | new | is going to | be | ready | in | a few | days; | it | you-pick up | here | at | the | branch.",
      "Your new card will be ready in a few days; you can pick it up here at the branch.", { flags: { 9: "la: it, the object pronoun for la tarjeta (not an article)." } })],
    already_blocked: [t("Ya | está | cancelada, | no se preocupe.", "Already | it's | canceled, | don't worry.", "It's already canceled, don't worry.")],
    block_first: [t("Claro, | enseguida | lo | hago.", "Sure, | right away | it | I-do.", "Of course. I'll do that right away.")],
    offer_cash: [t("¿Necesita | efectivo | mientras tanto?", "Do you need | cash | in the meantime?", "Do you need any cash in the meantime?")],
    offer_cash_counter: [t("Le | puedo | dar | efectivo | aquí | en | ventanilla.", "(To) you | I-can | give | cash | here | at | the counter.", "I can give you cash here at the counter.")],
    ask_cash_amount: [
      t("Claro. | ¿Cuánto | quiere | retirar?", "Sure. | How much | do you want | to withdraw?", "Sure. How much would you like to take out?"),
      t("¿Cuánto | va | a | retirar | hoy?", "How much | are you going | to | withdraw | today?", "How much are you taking out today?"),
    ],
    cash_confirm: [t("Claro, | sin problema. | ¿Se lo | doy?", "Sure, | no problem. | It to you | shall I give?", "Sure, no problem. Shall I give it to you?")],
    need_account_cash: [t("Para | retirar | efectivo | aquí | necesita | una | cuenta | con | nosotros.", "To | withdraw | cash | here | you-need | an | account | with | us.",
      "You need an account with us to take out cash here.")],
    ask_bills: [
      t("¿Se lo | doy | en | billetes | de | quinientos?", "It to you | shall I give | in | bills | of | five hundred?", "Is it okay in five-hundred-peso bills?"),
      t("¿Cómo | lo | quiere? | ¿En | billetes | de | quinientos?", "How | it | do you want? | In | bills | of | five hundred?", "How would you like it? In five-hundreds?"),
    ],
    here_cash: [
      t("Aquí | tiene. | Cuéntelo, | por favor.", "Here | you have. | Count it, | please.", "Here you go. Please count it."),
      t("Aquí | está | su | efectivo.", "Here | is | your | cash.", "Here's your cash."),
    ],
    pin_unknown: [t("No se preocupe; | a veces | pasa.", "Don't worry; | sometimes | it happens.", "Don't worry, it happens sometimes.")],
    no_cost: [t("No tiene | ningún | costo.", "It doesn't have | any | cost.", "There's no charge for that.")],
    old_card_back: [t("Lo siento, | por | seguridad | no podemos | devolverla.", "I'm sorry, | for | security | we can't | give it back.", "I'm sorry, for security reasons we can't give it back.")],
    account_safe: [t("Sí, | su | dinero | está | seguro. | Solo | la | tarjeta | está | cancelada.", "Yes, | your | money | is | safe. | Only | the | card | is | canceled.", "Yes, your money is safe. Only the card is canceled.")],
    new_card_yes: [t("Sí, | le | pedimos | una | nueva; | va a | estar | lista | en | unos | días.", "Yes, | (for) you | we-order | a | new one; | it's going to | be | ready | in | a few | days.",
      "Yes, we'll order you a new one; it will be ready in a few days.")],

    // slow system (twist)
    slow: [t("Disculpe, | el | sistema | anda | un poco | lento | hoy. | ¿Me | permite | un | momento?", "Excuse me, | the | system | is going | a bit | slow | today. | (To) me | you-allow | a | moment?",
      "Sorry, our system is a little slow today. Could you bear with me for a moment?", { flags: { 3: "anda lento: is running slow (andar, to walk, for how something is going)." } })],
    slow_thanks: [t("¡Gracias | por | su | paciencia! | Listo, | ya | funciona.", "Thanks | for | your | patience! | Done, | now | it works.", "Thanks for your patience! Okay, it's working again.")],
  },

  domains: {
    price: () => [MIN_DEPOSIT, MONTHLY_FEE, AVG_BALANCE, TRANSFER_FEE].sort((a, b) => a - b),
    amount: () => { const s: number[] = []; for (let d = 10; d <= 2000; d += 10) s.push(exchanged(d)); return s; },
  },

  hints: {
    open: { lt: "Say you want to open an account", slot: "acct", examples: ["checking", "savings"], items: [
      { id: "open_like", s: t("Quisiera | abrir | {X.np}.", "I'd like | to open | {X.np}.", "I'd like to open {X.np}.") },
      { id: "open_need", s: t("Necesito | una | cuenta | bancaria.", "I need | an | account | bank.", "I need a bank account.") },
      { id: "open_could", s: t("¿Puedo | abrir | {X.np} | aquí?", "Can I | open | {X.np} | here?", "Can I open {X.np} here?") },
      { id: "open_want", s: t("Quiero | abrir | una | cuenta.", "I want | to open | an | account.", "I want to open an account.") },
      { id: "open_how", s: t("¿Cómo | abro | una | cuenta?", "How | do I open | an | account?", "How do I open an account?") },
      { id: "open_here", s: t("Vengo | a | abrir | una | cuenta.", "I've come | to | open | an | account.", "I'm here to open an account.") },
    ] },
    acct_type: { lt: "Choose the kind of account", slot: "acct", examples: ["checking", "savings"], items: [
      { id: "type_short", s: t("{X.np}, | por favor.", "{X.np}, | please.", "{X.np}, please.") },
      { id: "type_like", s: t("Quisiera | {X.np}.", "I'd like | {X.np}.", "I'd like {X.np}.") },
      { id: "type_both", s: t("Las | dos, | por favor.", "The | two, | please.", "Both, please.") },
      { id: "q_difference", s: t("¿Cuál | es | la | diferencia?", "What | is | the | difference?", "What's the difference?") },
      { id: "q_recommend", s: t("¿Cuál | me | recomienda?", "Which one | (to) me | do you recommend?", "Which one do you recommend?") },
    ] },
    id: { lt: "Show your ID", items: [
      { id: "id_here", s: t("Aquí | está | mi | pasaporte.", "Here | is | my | passport.", "Here's my passport.") },
      { id: "form_here", s: t("Aquí tiene.", "Here you go.", "Here you go.") },
      { id: "id_ok", s: t("¿Sirve | mi | pasaporte?", "Does it work | my | passport?", "Is my passport okay?") },
      { id: "id_only", s: t("Solo | traigo | mi | pasaporte.", "Only | I-have-with-me | my | passport.", "I only have my passport with me."), note: "traer: to bring; Mexicans say traigo for what they have on them." },
      { id: "id_license", s: t("También | traigo | mi | tarjeta | de | residente.", "Also | I-have-with-me | my | card | of | resident.", "I also have my residence card.") },
    ] },
    proof: { lt: "Show proof of address", items: [
      { id: "proof_bill", s: t("Aquí | está | mi | recibo | de | luz.", "Here | is | my | bill | of | electricity.", "Here's my electric bill.") },
      { id: "proof_lease", s: t("Tengo | mi | contrato | de | renta.", "I have | my | contract | of | rent.", "I have my lease.") },
      { id: "proof_ok", s: t("¿Sirve | un | estado | de | cuenta?", "Does it work | a | statement | of | account?", "Will a bank statement do?") },
      { id: "proof_moved", s: t("Me acabo de | mudar.", "I just | moved.", "I just moved here."), note: "acabar de + infinitive: to have just done something." },
      { id: "proof_none", s: t("Todavía | no tengo | recibos.", "Still | I don't have | bills.", "I don't have any bills yet.") },
    ] },
    ssn: { lt: "Answer about your CURP", items: [
      { id: "ssn_notyet", s: t("Todavía | no la tengo.", "Still | I don't have it.", "I don't have it yet.") },
      { id: "ssn_waiting", s: t("Estoy | esperando | mi | tarjeta | de | residente.", "I am | waiting for | my | card | of | resident.", "I'm still waiting for my residence card.") },
      { id: "ssn_problem", s: t("¿Es | un | problema?", "Is it | a | problem?", "Is that a problem?") },
      { id: "ssn_what", s: t("¿Qué | es | la | CURP?", "What | is | the | CURP?", "What's a CURP?") },
    ] },
    form: { lt: "Fill out and sign the form", items: [
      { id: "form_done", s: t("Listo, | ya | firmé.", "Done, | already | I-signed.", "Okay, I've signed it.") },
      { id: "form_here", s: t("Aquí tiene.", "Here you go.", "Here you go.") },
      { id: "form_where", s: t("¿Dónde | firmo?", "Where | do I sign?", "Where do I sign?") },
      { id: "form_pen", s: t("¿Me | presta | una | pluma?", "(To) me | do you lend | a | pen?", "Could I borrow a pen?"), note: "Mexico says pluma for a pen; bolígrafo is understood everywhere." },
      { id: "form_what", s: t("¿Qué | escribo | aquí?", "What | do I write | here?", "What should I write here?") },
    ] },
    deposit: { lt: "Say how much you'll deposit", items: [
      { id: "dep_like", s: t("Quisiera | depositar | mil | pesos.", "I'd like | to deposit | a thousand | pesos.", "I'd like to deposit a thousand pesos.") },
      { id: "dep_cash", s: t("Con | quinientos | pesos.", "With | five hundred | pesos.", "Five hundred pesos.") },
      { id: "dep_min", s: t("Solo | el | mínimo, | por favor.", "Only | the | minimum, | please.", "Just the minimum, please.") },
      { id: "dep_q", s: t("¿Cuánto | es | el | mínimo?", "How much | is | the | minimum?", "What's the minimum?") },
    ] },
    ask_acct: { lt: "Ask about fees, the card and the app", items: [
      { id: "q_fee", s: t("¿Hay | comisión | mensual?", "Is there | a fee | monthly?", "Is there a monthly fee?") },
      { id: "q_card_when", s: t("¿Cuándo | me | dan | la | tarjeta?", "When | (to) me | do they give | the | card?", "When do I get my card?") },
      { id: "q_abroad", s: t("¿Puedo | usar | la | tarjeta | en | el | extranjero?", "Can I | use | the | card | in | the | abroad?", "Can I use the card abroad?") },
      { id: "q_app", s: t("¿Tienen | app?", "Do you have | an app?", "Do you have an app?") },
      { id: "q_atm", s: t("¿Dónde | hay | un | cajero?", "Where | is there | an | ATM?", "Where's an ATM?") },
      { id: "q_interest", s: t("¿Cuánto | interés | da?", "How much | interest | does it give?", "What's the interest rate?") },
    ] },
    transfer: { lt: "Ask how to send money abroad", items: [
      { id: "tr_how", s: t("¿Cómo | puedo | mandar | dinero | a | Estados Unidos?", "How | can I | send | money | to | the United States?", "How can I send money to the US?") },
      { id: "tr_like", s: t("Quisiera | enviar | dinero | a | mi | familia.", "I'd like | to send | money | to | my | family.", "I'd like to send money to my family.") },
      { id: "tr_cost", s: t("¿Cuánto | cuesta?", "How much | does it cost?", "How much does it cost?") },
      { id: "tr_long", s: t("¿Cuánto | tarda?", "How long | does it take?", "How long does it take?") },
      { id: "tr_need", s: t("¿Qué | necesito?", "What | do I need?", "What do I need?") },
      { id: "tr_swift", s: t("¿Qué | es | el | código | SWIFT?", "What | is | the | code | SWIFT?", "What's a SWIFT code?") },
      { id: "tr_app", s: t("¿Lo | puedo | hacer | desde | la | app?", "It | can I | do | from | the | app?", "Can I do it in the app?") },
    ] },
    exchange: { lt: "Change dollars into pesos", items: [
      { id: "ex_like", s: t("Quisiera | cambiar | unos | dólares | a | pesos.", "I'd like | to change | some | dollars | into | pesos.", "I'd like to change some dollars into pesos.") },
      { id: "ex_could", s: t("¿Puedo | cambiar | dólares | aquí?", "Can I | change | dollars | here?", "Can I change dollars here?") },
      { id: "ex_rate", s: t("¿A | cuánto | está | el | dólar?", "At | how much | is | the | dollar?", "What's the exchange rate for the dollar?"), note: "The everyday Mexican way to ask the exchange rate." },
      { id: "ex_fee", s: t("¿Cobran | comisión?", "Do you charge | a fee?", "Is there a fee?") },
    ] },
    card: { lt: "Say the ATM kept your card", items: [
      { id: "card_kept", s: t("El | cajero | se tragó | mi | tarjeta.", "The | ATM | swallowed | my | card.", "The ATM kept my card."), note: "cajero: here, the cash machine (cajero automático)." },
      { id: "card_stuck", s: t("Mi | tarjeta | se quedó | en | el | cajero.", "My | card | stayed | in | the | ATM.", "My card got stuck in the ATM.") },
      { id: "card_ate", s: t("La | máquina | se comió | mi | tarjeta.", "The | machine | ate | my | card.", "The machine ate my card."), register: "casual" },
      { id: "card_pin", s: t("Sí, | puse | mal | el | NIP.", "Yes, | I-put | wrong | the | PIN.", "Yes, I entered the wrong PIN."), note: "Mexico says NIP for a PIN; PIN is understood too." },
      { id: "card_block", s: t("¿Me | puede | bloquear | la | tarjeta?", "(For) me | can you | block | the | card?", "Could you block the card?") },
      { id: "card_new", s: t("¿Me | pueden | dar | una | tarjeta | nueva?", "(To) me | can you | give | a | card | new?", "Can I get a new card?") },
    ] },
    digits: { lt: "Give the card's last four digits", items: [
      { id: "card_digits", s: t("Termina | en | 4582.", "It ends | in | 4582.", "It ends in 4582.", { say: "Termina en cuatro cinco ocho dos." }) },
      { id: "card_digits_no", s: t("No me acuerdo.", "I don't remember.", "I don't remember.") },
    ] },
    cash: { lt: "Take out cash at the counter", items: [
      { id: "cash_amount", s: t("Quisiera | retirar | dos | mil | pesos.", "I'd like | to withdraw | two | thousand | pesos.", "I'd like to take out two thousand pesos.") },
      { id: "cash_short", s: t("Mil | pesos, | por favor.", "A thousand | pesos, | please.", "A thousand pesos, please.") },
      { id: "cash_take", s: t("¿Puedo | retirar | efectivo | aquí?", "Can I | withdraw | cash | here?", "Can I take out cash here?") },
    ] },
    bills: { lt: "Say which bills you want", items: [
      { id: "cash_twenties", s: t("De | quinientos | está bien.", "Of | five hundred | is fine.", "Five-hundreds are fine."), note: "Mexican bills: 20, 50, 100, 200, 500 and 1,000 pesos." },
      { id: "cash_small", s: t("En | billetes | más | chicos, | por favor.", "In | bills | more | small, | please.", "Some smaller bills, please.") },
    ] },
    euros: { lt: "Say how many dollars you'll change", items: [
      { id: "ex_amount", s: t("Doscientos | dólares, | por favor.", "Two hundred | dollars, | please.", "Two hundred dollars, please.") },
      { id: "ex_all", s: t("Todos | los | que | traigo.", "All | the ones | that | I-have-with-me.", "All the ones I have.") },
    ] },
    pin: { lt: "Say whether you entered the wrong PIN", items: [
      { id: "card_pin", s: t("Sí, | puse | mal | el | NIP.", "Yes, | I-put | wrong | the | PIN.", "Yes, I entered the wrong PIN."), note: "Mexico says NIP for a PIN; PIN is understood too." },
      { id: "pin_no", s: t("No, | creo que no.", "No, | I don't think so.", "No, I don't think so.") },
    ] },
    patience: { lt: "Say you can wait", items: [
      { id: "np_sure", s: t("Claro, | no hay problema.", "Sure, | no problem.", "Sure, no problem.") },
      { id: "np_time", s: t("No se preocupe, | tómese | su | tiempo.", "Don't worry, | take | your | time.", "No worries, take your time.") },
    ] },
    more: { lt: "Say that's all", items: [
      { id: "more_all", s: t("No, | es | todo, | gracias.", "No, | it's | all, | thanks.", "No, that's all, thanks.") },
      { id: "more_everything", s: t("Eso | sería | todo | por | hoy.", "That | would be | all | for | today.", "That's everything for today.") },
      { id: "more_question", s: t("Sí, | tengo | una | pregunta.", "Yes, | I have | a | question.", "Yes, I have a question.") },
    ] },
  },

  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With bank staff, usted is more polite: puede, tiene, me presta (puedes, tienes, me prestas are for friends).", better: "¿Me puede ayudar?" },
  },

  merges: {
    "banco del puerto": { reason: "lexical_expression", split: "banco → bank + del → of the + puerto → port would translate the bank's proper name word by word.", minimal: "The three-word name only." },
    "puerto colibrí": { reason: "lexical_expression", split: "puerto → port + colibrí → hummingbird would translate the town's proper name.", minimal: "A two-word name." },
    "clave única de registro de población": { reason: "lexical_expression", split: "The words of the official name would be glossed one by one; it is the name of one code (the CURP).", minimal: "The document's official name." },
    "por lo menos": { reason: "lexical_expression", split: "por → by + lo → it + menos → less misreads the fixed phrase: at least.", minimal: "Three words." },
    "día a día": { reason: "lexical_expression", split: "día → day + a → to + día → day reads as a phrase, but the noun means everyday use.", minimal: "Three words." },
    "tipo de cambio": { reason: "lexical_expression", split: "tipo → type + de → of + cambio → change misreads the term: exchange rate.", minimal: "Three words." },
    "mientras tanto": { reason: "lexical_expression", split: "mientras → while + tanto → so much misreads the adverb: in the meantime.", minimal: "Two words." },
    "un poco": { reason: "lexical_expression", split: "un → a + poco → little: the degree phrase is a bit.", minimal: "Two words." },
    "junto a": { reason: "lexical_expression", split: "junto → together + a → to misreads the preposition: next to.", minimal: "Two words." },
    "después de": { reason: "lexical_expression", split: "después → after + de → of: the two-word preposition is English after.", minimal: "Two words." },
    "la mayoría": { reason: "lexical_expression", split: "la → the + mayoría → majority: the phrase is English most people.", minimal: "Two words." },
    "en este momento": { reason: "lexical_expression", split: "en → in + este → this + momento → moment: the fixed phrase is right now.", minimal: "Three words." },
    "creo que no": { reason: "lexical_expression", split: "creo → I believe + que → that + no → no: the set reply is I don't think so.", minimal: "Three words." },
    "me acabo de": { reason: "grammatical_fusion", split: "me → myself + acabo → I finish + de → of misreads acabar de: to have just; me belongs to mudarme.", minimal: "The three words before the verb." },
    "se le": { reason: "grammatical_fusion", split: "se (impersonal) + le → to you: ¿Qué se le ofrece? has no word-by-word English.", minimal: "Two pronouns." },
    "le gustaría": { reason: "grammatical_fusion", split: "le → to you + gustaría → would please is a word-for-word reading of English would you like.", minimal: "Clitic and verb only." },
    "voy a": { reason: "grammatical_fusion", split: "voy → I go + a → to: ir a + infinitive is the near future, I'm going to.", minimal: "Two words." },
    "va a": { reason: "grammatical_fusion", split: "va → it goes + a → to: ir a + infinitive is the near future, it's going to.", minimal: "Two words." },
    "en cuanto": { reason: "lexical_expression", split: "en → in + cuanto → how much misreads the conjunction: as soon as.", minimal: "Two words." },
    "si no": { reason: "lexical_expression", split: "si → if + no → not: si no on its own is otherwise.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Report the ATM keeping your card", done: (c) => cardPath(c) && !!c.s.card, when: cardPath, optional: true },
    { lt: "Say which account you want", done: (c) => openPath(c) && !!c.s.type, when: openPath, optional: true },
    { lt: "Show your ID", done: (c) => !!c.s.id },
    { lt: "Show proof of address", done: (c) => openPath(c) && c.s.proof !== undefined, when: openPath, optional: true },
    { lt: "Answer about your CURP", done: (c) => openPath(c) && c.s.ssn !== undefined, when: openPath, optional: true },
    { lt: "Fill out and sign the form", done: (c) => openPath(c) && !!c.s.signed, when: openPath, optional: true },
    { lt: "Make your opening deposit", done: (c) => openPath(c) && c.s.deposit !== undefined, when: openPath, optional: true },
    { lt: "Get a new card ordered", done: (c) => cardPath(c) && !!c.s.blocked, when: cardPath, optional: true },
    { lt: "Find out about sending money", done: (c) => !!c.s.toldTransfer, when: (c) => !!c.s.toldTransfer, optional: true },
  ],

  steps: [
    helpStep("help", false),
    helpStep("help_card", true),
    // account opening
    { id: "acct_type", when: opening, done: (c) => !!c.s.type,
      ask: (c) => { c.say(bump(c, "acct_type") === 0 ? "ask_type" : "ask_type_again"); },
      expects: ["acct_type_ans", "open_account", "ask_difference", "acct_type_not", "both_ctx"],
      suggest: [{ lt: "Choose the kind of account", hint: "acct_type", options: "acct" }, { lt: "Ask about fees", hint: "ask_acct" }],
      help: (c) => { c.say("explain_types"); c.say("explain_savings"); } },
    { id: "id", when: (c) => needsId(c) && opening(c), done: (c) => !!c.s.id,
      ask: (c) => {
        const n = bump(c, "id");
        if (n === 0 && c.s.idProofTogether && c.s.proof === undefined) { c.s.askedProof = true; c.say("ask_id_proof"); }
        else c.say("ask_id");
      },
      expects: ["show_doc", "here_you_go", "no_doc", "give_proof", "doc_ctx"],
      suggest: [{ lt: "Show your ID", hint: "id", options: "doc" }, { lt: "Show proof of address", hint: "proof", options: "proof" }],
      yes: (c) => { c.s.id = "passport"; afterId(c); },
      no: (c) => { bank.handlers.no_doc(c, {}, { intent: "no_doc", slots: {}, tags: [] }); } },
    { id: "proof", when: opening, done: (c) => c.s.proof !== undefined,
      ask: (c) => { c.say(c.s.askedProof ? "ask_proof_again" : "ask_proof"); c.s.askedProof = true; },
      expects: ["give_proof", "no_proof", "here_you_go", "proof_ctx", "not_yet", "proof_what"],
      suggest: [{ lt: "Show proof of address (or say you don't have it yet)", hint: "proof", options: "proof" }],
      yes: (c) => { c.s.proof = "utility_bill"; c.say("proof_ok"); },
      no: (c) => { bank.handlers.no_proof(c, {}, { intent: "no_proof", slots: {}, tags: [] }); } },
    { id: "ssn", when: opening, done: (c) => c.s.ssn !== undefined, ask: (c) => c.say("ask_ssn"),
      expects: ["ssn_none", "ssn_yes", "ask_ssn_what", "ssn_problem", "not_yet", "here_you_go", "rfc_q"],
      suggest: [{ lt: "Say whether you have your CURP", hint: "ssn" }],
      yes: (c) => { c.s.ssn = "yes"; c.say("ssn_yes_type"); },
      no: (c) => { c.s.ssn = "none"; c.say("ssn_none_ok"); },
      help: (c) => { c.say("ssn_explain"); } },
    { id: "slow", when: (c) => opening(c) && !!c.s.slowTwist && c.s.ssn !== undefined, done: (c) => !!c.s.slowDone,
      ask: (c) => { c.say("slow"); c.twist("slow_system"); }, expects: ["no_problem"],
      suggest: [{ lt: "Say you can wait", hint: "patience" }],
      yes: (c) => { c.s.slowDone = true; c.say("slow_thanks"); },
      no: (c) => { c.s.slowDone = true; c.say("slow_thanks"); } },
    { id: "form", when: opening, done: (c) => !!c.s.signed,
      ask: (c) => { c.say(bump(c, "form") === 0 ? "ask_form" : "form_wait"); },
      expects: ["signed", "signed_ctx", "here_you_go", "where_sign", "where_sign_ctx", "ask_pen", "what_write", "not_done_ctx"],
      suggest: [{ lt: "Fill out and sign the form (or ask)", hint: "form" }],
      yes: (c) => { c.s.formOk = true; c.say("form_wait"); c.hold(); } },
    { id: "deposit", when: opening, done: (c) => c.s.deposit !== undefined,
      ask: (c) => { if (bump(c, "deposit") === 0) c.say("min_deposit", { price: MIN_DEPOSIT }); c.say("ask_deposit"); },
      expects: ["deposit_ans", "amount_ctx", "minimum", "ask_minimum", "no_deposit_ctx"],
      suggest: [{ lt: "Say how much you'll deposit", hint: "deposit" }],
      help: (c) => { c.say("min_is", { price: MIN_DEPOSIT }); } },
    { id: "savings", when: (c) => !!c.s.opened && !!c.s.offerSavings && c.s.type === "checking", done: (c) => c.s.savings !== undefined,
      ask: (c) => c.say(bump(c, "savings") === 0 ? "offer_savings" : "offer_savings_again"), expects: ["acct_type_not", "acct_type_ans", "both_ctx", "no_open", "sure_ctx"],
      suggest: [{ lt: "Answer yes or no", hint: "g_yesno" }],
      yes: (c) => { if (unsureYes(c)) { c.say("yes_or_no"); c.hold(); return; } c.s.savings = true; c.s.type = "both"; c.say("savings_yes"); },
      no: (c) => { c.s.savings = false; c.say("no_problem"); allDone(c); } },
    { id: "app", when: (c) => !!c.s.opened && !!c.s.offerApp, done: (c) => c.s.app !== undefined,
      ask: (c) => { c.say(bump(c, "app") === 0 ? "offer_app" : "offer_app_again"); }, expects: ["app_later", "app_q", "sure_ctx", "app_have_ctx"],
      suggest: [{ lt: "Answer yes or no", hint: "g_yesno" }, { lt: "Ask about the app", hint: "ask_acct" }],
      yes: (c) => { c.s.app = true; c.say("app_yes"); c.say("app_features"); },
      no: (c) => { c.s.app = false; c.say("app_no"); allDone(c); } },
    // the card
    { id: "pin_q", when: (c) => inCard(c) && !!c.s.askPin && !c.s.id, done: (c) => c.s.pinCause !== undefined,
      ask: (c) => c.say("ask_pin"), expects: ["wrong_pin", "machine_error", "pin_yes_ctx", "pin_unknown_ctx"],
      suggest: [{ lt: "Say whether you entered the wrong PIN", hint: "pin" }],
      yes: (c) => { c.s.pinCause = "wrong"; c.say("pin_explain"); },
      no: (c) => { c.s.pinCause = "machine"; c.say("machine_problem"); } },
    { id: "card_id", when: (c) => inCard(c) && !c.s.id, done: (c) => !!c.s.id,
      ask: (c) => { if (bump(c, "card_id") === 0) c.say("block_new"); c.say("ask_id_card"); },
      expects: ["show_doc", "here_you_go", "no_doc", "doc_ctx"],
      suggest: [{ lt: "Show your ID", hint: "id", options: "doc" }, { lt: "Ask about a new card", hint: "card" }],
      yes: (c) => { c.s.id = "passport"; afterId(c); } },
    { id: "cash_id", when: (c) => c.s.cash === "id" && !c.s.id, done: (c) => !!c.s.id,
      ask: (c) => c.say("ask_id_card"), expects: ["show_doc", "here_you_go", "no_doc", "doc_ctx"],
      suggest: [{ lt: "Show your ID", hint: "id", options: "doc" }],
      yes: (c) => { c.s.id = "passport"; afterId(c); } },
    { id: "cash_offer", when: (c) => !!c.s.blocked && !!c.s.offerCash, done: (c) => c.s.cash !== undefined,
      ask: (c) => { c.say("offer_cash"); if (bump(c, "cash_offer") === 0) c.say("offer_cash_counter"); },
      expects: ["withdraw", "amount_ctx", "no_cash_needed", "cash_amb_ctx", "sure_ctx"],
      suggest: [{ lt: "Say whether you need cash", hint: "g_yesno" }, { lt: "Say an amount", hint: "cash" }],
      yes: (c) => { if (unsureYes(c)) { c.say("yes_or_no"); c.hold(); return; } c.s.cash = "amount"; },
      no: (c) => { c.s.cash = false; c.say("no_problem"); allDone(c); } },
    { id: "cash_amount", when: (c) => (c.s.cash === "amount" || c.s.cash === "id") && !!c.s.id, done: (c) => c.s.cashAmount !== undefined,
      ask: (c) => c.say("ask_cash_amount"), expects: ["amount_ctx", "withdraw", "deposit_ans"],
      suggest: [{ lt: "Say how much cash you want", hint: "cash" }],
      no: (c) => { c.s.cash = false; c.say("no_problem"); } },
    { id: "bills", when: (c) => c.s.cashAmount !== undefined && billsAsked(c), done: (c) => !!c.s.billsDone,
      ask: (c) => c.say("ask_bills"), expects: ["bills_ans"],
      suggest: [{ lt: "Say which bills you want", hint: "bills" }],
      yes: (c) => { giveCash(c); },
      no: (c) => { giveCash(c); } },
    // exchange (step id kept from the English edition: here it's US dollars into pesos)
    { id: "euros", when: (c) => c.s.exchange === "amount", done: (c) => c.s.exchange === "done",
      ask: (c) => { if (!c.s.rateSaid) sayRate(c); c.say(bump(c, "euros") === 0 ? "ask_euros" : "ask_euros_again"); }, expects: ["euro_amount", "euro_ctx", "rate_q"],
      suggest: [{ lt: "Say how many dollars you'll change", hint: "euros" }],
      no: (c) => { c.s.exchange = "cancelled"; c.say("no_problem"); } },
    // anything else
    { id: "more", when: (c) => !!c.s.task, done: (c) => !!c.s.moreDone,
      ask: (c) => c.say("anything_else"),
      expects: ["more_no", "have_question"],
      suggest: [{ lt: "Say that's all", hint: "more" }, S_TRANSFER, S_ASK, S_EXCHANGE],
      yes: (c) => { c.say("anything_else_yes"); c.hold(); },
      no: (c) => { c.s.moreDone = true; } },
  ],

  init: (c) => {
    c.s.customer = c.visits >= 1;
    c.s.cardTwist = c.visits >= 1 && c.chance(0.5);
    c.s.hay = c.chance(0.3) ? "pending" : undefined;
    c.s.turnGreet = !c.s.hay && c.chance(0.3);
    c.s.idProofTogether = c.chance(0.4);
    c.s.offerSavings = c.chance(0.4);
    c.s.offerApp = !c.s.offerSavings && c.chance(0.6);
    c.s.extraInfo = c.s.offerSavings || c.s.offerApp ? "none" : c.pick(["pin", "routing", "none"]);
    c.s.slowTwist = c.visits >= 2 && c.chance(0.5);
    c.s.askPin = c.chance(0.7);
    c.s.askDigits = c.chance(0.5);
    c.s.offerCash = c.chance(0.75);
    c.s.askBills = c.chance(0.6);
  },

  start: (c) => {
    c.ask(c.s.cardTwist ? "help_card" : "help");
  },

  handlers: {
    // --- main requests
    open_account(c, slots, seg) {
      const type = seg.tags.includes("both") ? "both" : slots.acct;
      const wasOpening = c.s.opening;
      if (seg.tags.includes("needq")) c.say("open_need", { price: MIN_DEPOSIT }); // "¿Qué necesito para abrir una cuenta?"
      startOpening(c);
      if (type) setType(c, type);
      else if (wasOpening && !c.s.type) c.say("ask_type_again");
      c.s.hay = c.s.hay === "asked" ? "done" : c.s.hay;
    },
    new_in_town(c) {
      c.s.hay = c.s.hay === "asked" ? "done" : c.s.hay;
      if (!customer(c)) c.s.newcomer = true;
      if (c.s.opening || customer(c)) { if (c.step === "proof") bank.handlers.no_proof(c, {}, { intent: "no_proof", slots: {}, tags: [] }); return; }
      // "Me acabo de mudar y necesito una cuenta": the request itself follows, so Ricardo doesn't offer it
      if (/\b(abrir|cuenta|debito|ahorro)\b/.test(words(c))) return;
      c.say("welcome_town");
      c.expect(openOffer());
    },
    card_kept(c) {
      c.s.hay = c.s.hay === "asked" ? "done" : c.s.hay;
      c.s.task = c.s.task || "card";
      c.s.moreDone = false;
      if (c.s.card) { if (c.s.blocked) c.say("already_blocked"); return; }
      c.s.card = true;
      c.s.topic = "card";
      c.say("card_sorry");
    },
    turn_ticket(c) { if (!c.s.task) once(c, "turn", "turn_ok"); },
    turn_q(c) { once(c, "turnq", "turn_where"); },
    exchange_req(c, slots, seg) {
      c.s.hay = c.s.hay === "asked" ? "done" : c.s.hay;
      // "Quiero cambiar cien dólares": the amount said in this turn (only this turn's: an old one is never changed)
      const usd = seg.tags.includes("amt") && typeof slots.number === "number" ? slots.number : undefined;
      let want = usd || (seg.tags.includes("amt") && bigUsd(c)) ? usd ?? MAX_USD + 1 : undefined;
      c.s.task = c.s.task || "exchange";
      c.s.topic = "exchange";
      c.s.moreDone = false;
      // the month's limit already changed: said, and no new "¿Cuántos dólares…?"
      if (c.s.exchange !== "amount" && (c.s.usdChanged ?? 0) >= MAX_USD) { once(c, "limit", "ex_limit"); return; }
      if (want && overLimit(c, want)) want = undefined;
      if (c.s.exchange === "amount") { // the dollars step asks, or the amount said now is changed (quoted if the rate wasn't said)
        if (want) { if (c.s.rateSaid) exchangeDollars(c, want); else { sayRate(c); quoteExchange(c, want); } }
        return;
      }
      // a second exchange: the rate was said, an amount is quoted ("Quiero cambiar otros cien dólares")
      if (c.s.exchange === "done" || c.s.exchange === "cancelled") { c.s.exchange = "amount"; if (want) quoteExchange(c, want); return; }
      // during the opening: changed once the account is open
      if (opening(c)) { c.s.exchangeLater = true; once(c, "exlater", "exchange_after"); return; }
      if (!customer(c) && c.s.newcomer) { c.s.exchangeLater = true; c.say("customers_only"); if (!c.s.declinedOpen) offerOpen(c); return; }
      if (!customer(c)) { c.s.wantUsd = want; c.say("ask_customer"); c.expect(customerPending("exchange")); return; }
      sayRate(c);
      c.s.exchange = "amount";
      // an amount said before the rate is quoted and asked, never changed at once ("¿Y si cambio quinientos?")
      if (want) quoteExchange(c, want);
    },
    exchange_other(c) {
      c.s.topic = "exchange";
      c.say("exchange_other_no");
    },
    transfer_q(c) {
      c.s.hay = c.s.hay === "asked" ? "done" : c.s.hay;
      const first = !c.s.toldTransfer;
      c.s.toldTransfer = true;
      c.s.topic = "transfer";
      c.s.task = c.s.task || "info";
      c.s.served = true;
      if (first) { c.say("transfer_how"); c.say("transfer_cost", { price: TRANSFER_FEE }); }
      else c.say("transfer_cost", { price: TRANSFER_FEE });
      if (!customer(c) && !c.s.opening && !c.s.askedCustomer) {
        c.s.askedCustomer = true;
        c.say("ask_customer");
        c.expect(customerPending("transfer"));
      }
    },
    withdraw(c, slots, seg) {
      c.s.hay = c.s.hay === "asked" ? "done" : c.s.hay;
      c.s.topic = "cash";
      // "Quiero sacar dos mil pesos": paid out once the ID is checked (at the cash questions, the amount answers them)
      const want = seg.tags.includes("amt") && typeof slots.price === "number" ? (slots.price as number) : undefined;
      if (c.step === "cash_offer" || c.step === "cash_amount") { if (want != null) bank.handlers.amount_ctx(c, slots, seg); else if (c.step === "cash_offer") c.s.cash = "amount"; return; }
      if (c.s.cash === "id") { if (want != null) c.s.cashWant = want; return; }
      if (c.s.cash === "amount") { if (want != null && c.s.cashAmount === undefined) payCash(c, want); return; }
      c.s.task = c.s.task || "cash";
      c.s.moreDone = false;
      if (!customer(c)) { c.say("need_account_cash"); offerOpen(c); return; }
      if (c.s.id && want != null) { payCash(c, want); return; }
      c.s.cash = c.s.id ? "amount" : "id";
      if (want != null) c.s.cashWant = want;
    },
    help_me(c) { if (!/(tarjeta|cajero|cuenta|dolar|dinero)/.test(words(c))) { c.say("go_ahead"); c.hold(); } },

    // --- opening
    acct_type_ans(c, slots, seg) {
      if (!c.s.opening && !c.s.opened) startOpening(c);
      let t2 = seg.tags.includes("both") ? "both" : slots.acct ?? (seg.tags.includes("sav") ? "savings" : "checking");
      // "Ahorro no, débito" and "Ahorro, no débito" sound the same: a typed comma decides, otherwise Ricardo asks
      if (seg.tags.includes("amb") && slots.noa && slots.noa !== slots.acct) {
        const h = c.heard || "";
        if (/\bno\s*[,;.]/i.test(h)) t2 = slots.noa;
        else if (!/[,;]\s*no\b/i.test(h)) { c.say("type_which"); c.hold(); return; }
      }
      if (c.step === "savings" || (c.s.opened && c.s.savings === undefined && c.s.type === "checking")) {
        c.s.savings = t2 === "savings" || t2 === "both";
        if (c.s.savings) { c.s.type = "both"; c.say("savings_yes"); } else c.say("no_problem");
        return;
      }
      if (c.s.opened) { c.say("no_problem"); return; }
      setType(c, t2);
    },
    both_ctx(c, _slots, seg) { bank.handlers.acct_type_ans(c, {}, { ...seg, tags: [...seg.tags, "both"] }); },
    acct_type_not(c, slots) {
      if (c.step === "savings" || c.s.opened) { if (c.s.savings === undefined) c.s.savings = false; c.say("no_problem"); return; }
      if (!c.s.opening) startOpening(c);
      const other = slots.acct === "savings" ? "checking" : "savings";
      c.s.type = other;
      c.say(other === "checking" ? "ack_not_type" : "ack_not_type_s");
    },
    ask_difference(c) { c.say("explain_types"); c.say("explain_savings"); if (/recomiend|mejor|conviene|haria|sugier|aconsej/.test(words(c))) c.say("recommend_both"); },
    show_doc(c, slots) {
      const docs = toArr(slots.doc).filter((x: any) => typeof x === "string");
      if (c.s.id) { c.say("id_thanks"); return; }
      // the step before the ID: "Aquí está mi pasaporte" said early is kept for later
      if (!needsId(c)) { c.s.id = docs.find((x: string) => x !== "license") ?? undefined; if (c.s.id) c.say("id_thanks"); return; }
      const good = docs.find((x: string) => x !== "license");
      if (!good && docs.length) { c.say("license_no"); c.expect(otherIdPending()); return; }
      c.s.id = good || "passport";
      if (c.step === "proof") c.s.askedProof = true;
      afterId(c);
    },
    no_doc(c) {
      if (c.s.id) { if (c.step === "proof") bank.handlers.no_proof(c, {}, { intent: "no_proof", slots: {}, tags: [] }); return; }
      c.say("need_photo_id");
      c.expect(otherIdPending());
    },
    doc_ctx(c, slots, seg) { bank.handlers.show_doc(c, slots, seg); },
    proof_ctx(c, slots, seg) { bank.handlers.give_proof(c, slots, seg); },
    // "Tengo efectivo" answers only the cash offer (at the deposit it is no answer: the step asks again)
    no_cash_needed(c) { if (c.step !== "cash_offer" || c.s.cash !== undefined) return; c.s.cash = false; c.say("no_problem"); },
    app_later(c) { if (c.s.app === undefined) c.s.app = false; c.say("app_no"); },
    app_have_ctx(c) { if (c.s.app === undefined) c.s.app = true; c.say("app_have"); },
    no_deposit_ctx(c) { c.say("min_deposit", { price: MIN_DEPOSIT }); c.hold(); },
    not_done_ctx(c) { c.say("form_wait"); c.hold(); },
    // "No, tampoco" lives only in the lease question (its own handler there)
    tampoco_ctx() { /* not expected elsewhere */ },
    pin_unknown_ctx(c) { if (c.s.pinCause === undefined) { c.s.pinCause = "unknown"; c.say("pin_unknown"); } },
    give_proof(c, slots) {
      const p = toArr(slots.proof)[0] || "utility_bill";
      const first = c.s.proof === undefined;
      c.s.proof = p;
      if (first) c.say("proof_ok");
    },
    no_proof(c, slots, seg) {
      if (c.s.proof !== undefined) return;
      // "No tengo contrato" / "Vivo con unos amigos": no point asking about a lease
      if (slots?.proof === "lease" || seg?.tags?.includes("nolease")) { c.s.proof = "later"; c.say("proof_later"); return; }
      c.say("ask_lease");
      c.expect({
        id: "lease_q", expects: ["give_proof", "proof_ctx", "not_yet"], hints: ["g_yesno", "proof"],
        suggest: [{ lt: "Say whether you have a lease", hint: "proof", options: "proof" }],
        yes: (cc) => { if (cc.s.proof === undefined) { cc.s.proof = "lease"; cc.say("proof_ok"); } },
        no: (cc) => { if (cc.s.proof === undefined) { cc.s.proof = "later"; cc.say("proof_later"); } },
        on: {
          give_proof: (cc, sl, sg) => { bank.handlers.give_proof(cc, sl, sg); }, proof_ctx: (cc, sl, sg) => { bank.handlers.give_proof(cc, sl, sg); },
          tampoco_ctx: (cc) => { if (cc.s.proof === undefined) { cc.s.proof = "later"; cc.say("proof_later"); } },
          no_proof: (cc) => { if (cc.s.proof === undefined) { cc.s.proof = "later"; cc.say("proof_later"); } },
          not_yet: (cc) => { if (cc.s.proof === undefined) { cc.s.proof = "later"; cc.say("proof_later"); } },
        },
        ask: (cc) => cc.say("ask_lease_again"),
      });
    },
    ssn_none(c) { if (c.s.ssn !== undefined || c.step !== "ssn") return; c.s.ssn = "none"; c.say("ssn_none_ok"); },
    ssn_yes(c) { if (c.s.ssn !== undefined || c.step !== "ssn") return; c.s.ssn = "yes"; c.say("ssn_yes_type"); },
    not_yet(c) {
      if (c.step === "ssn") { bank.handlers.ssn_none(c, {}, { intent: "ssn_none", slots: {}, tags: [] }); return; }
      if (c.step === "proof") { bank.handlers.no_proof(c, {}, { intent: "no_proof", slots: {}, tags: [] }); return; }
      c.say("no_problem");
    },
    customer_ctx(c) { c.say("no_problem"); },
    // "No quiero sacar dinero" at the cash offer is its no, "No quiero cambiar nada" at "¿Cuántos dólares…?" and "No
    // quiero sacar nada" at "¿Cuánto quiere retirar?" too; elsewhere the next part says what they want
    not_that(c) {
      if (c.step === "cash_offer" && c.s.cash === undefined) { c.s.cash = false; c.say("no_problem"); return; }
      const refuses = /\bno (quiero|necesito)\b/.test(words(c));
      if (c.step === "euros" && c.s.exchange === "amount" && refuses && /\bcambiar\b/.test(words(c))) { c.s.exchange = "cancelled"; c.say("no_problem"); return; }
      if (c.step === "cash_amount" && c.s.cashAmount === undefined && refuses && /\b(sacar|retirar)\b/.test(words(c))) { c.s.cash = false; c.say("no_problem"); }
    },
    no_open(c) { if (c.step === "savings") { if (c.s.savings === undefined) c.s.savings = false; c.say("no_problem"); } },
    ask_ssn_what(c) { c.say("ssn_explain"); },
    ssn_problem(c) {
      if (c.step === "ssn" || c.s.ssn === "none") { c.s.ssn = c.s.ssn ?? "none"; c.say("ssn_none_ok"); return; }
      c.say("no_problem");
    },
    rfc_q(c) { c.say("rfc_info"); },
    hours_q(c) { c.say("hours"); },
    proof_what(c) { c.say("proof_explain"); },
    cash_amb_ctx(c) {
      // typed with its comma ("No, tengo efectivo") it's a no; said, it could be either: ask
      if (c.s.cash !== undefined) return;
      if (/^[\s¡¿"']*no\s*[,.;]\s*(?!no\b)/i.test(c.heard || "")) { bank.handlers.no_cash_needed(c, {}, { intent: "no_cash_needed", slots: {}, tags: [] }); return; }
      c.say("cash_which"); c.hold();
    },
    sure_ctx(c) { const st = bank.steps.find((x) => x.id === c.step); if (st?.yes && !st.done(c)) st.yes(c); },
    ask_pen(c) { c.say("pen"); if (c.step === "form") c.hold(); },
    where_sign(c) { c.say("where_sign"); if (c.step === "form") c.hold(); },
    where_sign_ctx(c) { c.say("where_sign"); c.hold(); },
    what_write(c) { c.say("what_write"); if (c.step === "form") c.hold(); },
    signed(c) {
      if (c.step !== "form") { if (c.s.signed) c.say("form_thanks"); return; }
      c.s.signed = true; c.event("sign"); c.say("form_thanks");
    },
    // "Está bien" said to "llene esta solicitud y firme" is an okay, not "it's done" (that's the step's yes: "take your
    // time"); "¿Así está bien?", "¿Está bien?" and "Ya está" hand it over
    signed_ctx(c, slots, seg) {
      if (c.step === "form" && !c.s.signed && !isQuestion(c) && /^((si|ok|bueno|vale|sale) )?(esta|queda) bien( (gracias|ok))?$/.test(words(c))) {
        bank.steps.find((x) => x.id === "form")?.yes?.(c); return;
      }
      bank.handlers.signed(c, slots, seg);
    },
    here_you_go(c) {
      switch (c.step) {
        case "id": case "card_id": case "cash_id": c.s.id = c.s.id || "passport"; afterId(c); return;
        case "proof": if (c.s.proof === undefined) { c.s.proof = "utility_bill"; c.say("proof_ok"); } return;
        case "form": c.s.signed = true; c.event("sign"); c.say("form_thanks"); return;
        case "ssn": bank.handlers.ssn_yes(c, {}, { intent: "ssn_yes", slots: {}, tags: [] }); return;
        default: c.say("id_thanks");
      }
    },
    deposit_ans(c, slots, seg) {
      if (c.step === "cash_amount" || c.step === "cash_offer") { bank.handlers.amount_ctx(c, slots, seg); return; }
      const cents = slots.price as number | undefined;
      // "¿Con quinientos alcanza?" / "¿Y si deposito dos mil?": the answer, then the question (said, it has no "?": #q)
      if (cents != null && (whatIf(c) || isQuestion(c) || seg.tags.includes("q")) && c.step === "deposit") {
        if (cents < MIN_DEPOSIT) { c.say("deposit_min", { price: MIN_DEPOSIT }); return; }
        const p = depositConfirm(cents); c.expect(p); p.ask!(c); return;
      }
      depositAmount(c, cents);
    },
    minimum(c) { depositAmount(c, MIN_DEPOSIT); },
    ask_minimum(c) { c.say("min_is", { price: MIN_DEPOSIT }); },
    amount_ctx(c, slots, seg) {
      const cents = slots.price as number | undefined;
      if (c.step === "deposit") { bank.handlers.deposit_ans(c, slots, seg); return; }
      if (c.step === "cash_amount" || c.step === "cash_offer") {
        if (cents == null) return;
        if (whatIf(c)) { const p = cashConfirm(cents); c.expect(p); p.ask!(c); return; }
        payCash(c, cents); return;
      }
    },

    // --- questions
    fee_q(c) {
      c.s.topic = c.s.topic || "account";
      if (c.s.type === "savings") { c.say("savings_fee"); return; }
      c.say("fee_info", { price: AVG_BALANCE }); c.say("fee_monthly", { price: MONTHLY_FEE });
    },
    minbal_q(c) { c.say("fee_info", { price: AVG_BALANCE }); c.say("fee_monthly", { price: MONTHLY_FEE }); },
    interest_q(c) { c.say("interest_info"); },
    card_when_q(c) { c.say(c.s.card ? "new_card_info" : "card_info"); },
    card_abroad_q(c) { c.say("card_abroad"); },
    app_q(c) { c.say("app_info"); },
    atm_q(c) { if (/comision|cobra|gratis|pago/.test(words(c))) c.say("atm_free"); else c.say("atm_where"); },
    cost_q(c) {
      // "¿Cuánto es?" answers the question on the table first
      if (c.step === "deposit" && !c.s.opened) { c.say("min_is", { price: MIN_DEPOSIT }); return; }
      if (c.step === "savings") { c.say("savings_fee"); return; }
      if (c.step === "app" || c.step === "cash_offer" || c.step === "cash_amount") { c.say("no_cost"); return; }
      switch (c.s.topic) {
        case "transfer": c.say("transfer_fee", { price: TRANSFER_FEE }); return;
        case "exchange": if (/comision|cobran/.test(words(c))) c.say("ex_no_fee"); else { c.s.rateSaid = true; c.say("exchange_rate"); } return;
        case "card": case "cash": c.say("no_cost"); return;
        default: c.say("fee_info", { price: AVG_BALANCE }); c.say("fee_monthly", { price: MONTHLY_FEE });
      }
    },
    how_long_q(c) {
      if (c.s.topic === "transfer") { c.say("transfer_time"); return; }
      if (c.s.topic === "card") { c.say("new_card_info"); return; }
      c.say("open_time");
    },
    need_q(c) {
      if (c.s.topic === "transfer") { c.say("transfer_need"); return; }
      c.say("open_need", { price: MIN_DEPOSIT });
    },
    swift_q(c) { c.say("swift_explain"); },
    clabe_q(c) { c.say(c.s.opened && c.s.extraInfo !== "routing" ? "routing" : "clabe_info"); },
    app_transfer_q(c) { c.say("transfer_app"); },
    rate_q(c, slots, seg) {
      const tags = [...(seg.tags || [])];
      const usd = typeof slots.number === "number" ? slots.number : undefined;
      if (tags.includes("amt") && (usd || bigUsd(c))) {
        if (overLimit(c, usd, false)) return;
        if (c.s.exchange === "amount") { quoteExchange(c, usd!); return; }
        if (inAmountDomain(usd)) { c.say("exchange_would", { amount: exchanged(usd) }); return; }
      }
      c.s.rateSaid = true;
      c.say(tags.includes("sell") ? "rate_sell" : "exchange_rate");
    },
    euro_amount(c, slots, seg) {
      const usd = typeof slots.number === "number" ? slots.number : undefined;
      // "Cien dólares" for the opening deposit or the cash: the account is in pesos
      if (["deposit", "cash_offer", "cash_amount"].includes(c.step ?? "") && c.s.exchange !== "amount") { once(c, "pesos", "pesos_only"); return; }
      // "Quiero cambiar dos mil pesos": no dollar amount (the dollars step asks again; before it, the request alone)
      if (usd && saysPesos(c)) { if (c.s.exchange !== "amount") bank.handlers.exchange_req(c, {}, { ...seg, tags: seg.tags.filter((x) => x !== "amt") }); return; }
      if (c.s.exchange === "amount" && overLimit(c, usd)) return;
      // "Tengo doscientos dólares" before any exchange: the request, with its amount
      if (c.s.exchange !== "amount") { bank.handlers.exchange_req(c, slots, { ...seg, tags: [...seg.tags, "amt"] }); return; }
      if (usd && (whatIf(c) || seg.tags.includes("q"))) { quoteExchange(c, usd); return; }
      exchangeDollars(c, seg.tags.includes("all") ? "all" : usd);
    },
    euro_ctx(c, slots, seg) {
      const usd = typeof slots.number === "number" ? slots.number : undefined;
      if (usd && saysPesos(c)) return; // "No, mejor dos mil pesos": the dollars step asks again
      if (overLimit(c, usd)) return;
      exchangeDollars(c, seg.tags.includes("all") ? "all" : usd);
    },

    // --- the card
    wrong_pin(c) { if (c.s.pinCause === undefined) { c.s.pinCause = "wrong"; c.say("pin_explain"); } else c.say("no_problem"); },
    pin_yes_ctx(c) { bank.handlers.wrong_pin(c, {}, { intent: "wrong_pin", slots: {}, tags: [] }); },
    machine_error(c) { if (c.s.pinCause === undefined) { c.s.pinCause = "machine"; c.say("machine_problem"); } },
    block_req(c) {
      if (c.s.blocked) { c.say("already_blocked"); return; }
      if (!c.s.card) { bank.handlers.card_kept(c, {}, { intent: "card_kept", slots: {}, tags: [] }); return; }
      c.say("block_first");
    },
    new_card_q(c) { c.say(c.s.blocked ? "new_card_info" : "new_card_yes"); },
    old_card_q(c) { c.say("old_card_back"); },
    account_safe_q(c) { c.say("account_safe"); },
    digits_ctx(c) { if (!c.s.blocked && inCard(c) && c.s.id) blockCard(c); },
    digits_unknown_ctx(c) { if (!c.s.blocked && inCard(c) && c.s.id) { c.say("digits_unknown"); blockCard(c); } },
    bills_ans(c) { if (c.s.cashAmount === undefined || c.s.billsDone) { c.say("no_problem"); return; } giveCash(c); },

    // --- general
    more_no(c) { if (answerNo(c)) { if (/\b(todo|nada mas)\b/.test(words(c))) c.s.moreDone = true; return; } c.s.moreDone = true; },
    have_question(c) { c.say("go_ahead"); c.hold(); },
    no_problem(c) { if (c.step === "slow") { c.s.slowDone = true; c.say("slow_thanks"); } },
  },

  finish: (c) => {
    if (c.s.opened || c.s.blocked) c.complete();
    c.say("bye");
    c.expect({ id: "closing", hints: ["g_social"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // Every hint construction.
    { say: "Quisiera abrir una cuenta de débito", intent: "open_account", slots: { acct: "checking" } },
    { say: "Necesito una cuenta bancaria", intent: "open_account" },
    { say: "¿Puedo abrir una cuenta de ahorro aquí?", intent: "open_account", slots: { acct: "savings" } },
    { say: "Quiero abrir una cuenta", intent: "open_account" },
    { say: "¿Cómo abro una cuenta?", intent: "open_account" },
    { say: "Vengo a abrir una cuenta", intent: "open_account" },
    { say: "Una cuenta de débito, por favor", intent: "acct_type_ans", step: "acct_type", slots: { acct: "checking" } },
    { say: "Quisiera una cuenta de ahorro", intent: "acct_type_ans", step: "acct_type", slots: { acct: "savings" } },
    { say: "Las dos, por favor", intent: "both_ctx", step: "acct_type" },
    { say: "¿Cuál es la diferencia?", intent: "ask_difference", step: "acct_type" },
    { say: "¿Cuál me recomienda?", intent: "ask_difference", step: "acct_type" },
    { say: "Aquí está mi pasaporte", intent: "show_doc", step: "id", slots: { doc: "passport" } },
    { say: "Aquí tiene", intent: "here_you_go", step: "id" },
    { say: "¿Sirve mi pasaporte?", intent: "show_doc", step: "id", slots: { doc: "passport" } },
    { say: "Solo traigo mi pasaporte", intent: "show_doc", step: "id", slots: { doc: "passport" } },
    { say: "También traigo mi tarjeta de residente", intent: "show_doc", step: "id", slots: { doc: "id_card" } },
    { say: "Aquí está mi recibo de luz", intent: "give_proof", step: "proof", slots: { proof: "utility_bill" } },
    { say: "Tengo mi contrato de renta", intent: "give_proof", step: "proof", slots: { proof: "lease" } },
    { say: "¿Sirve un estado de cuenta?", intent: "give_proof", step: "proof", slots: { proof: "statement" } },
    { say: "Me acabo de mudar", intent: "no_proof", step: "proof" },
    { say: "Todavía no tengo recibos", intent: "no_proof", step: "proof", not: ["give_proof"] },
    { say: "Todavía no la tengo", intent: "ssn_none", step: "ssn", not: ["ssn_yes"] },
    { say: "Estoy esperando mi tarjeta de residente", intent: "ssn_none", step: "ssn" },
    { say: "¿Es un problema?", intent: "ssn_problem", step: "ssn" },
    { say: "¿Qué es la CURP?", intent: "ask_ssn_what", step: "ssn" },
    { say: "Listo, ya firmé", intent: "signed", step: "form" },
    { say: "¿Dónde firmo?", intent: "where_sign", step: "form" },
    { say: "¿Me presta una pluma?", intent: "ask_pen", step: "form" },
    { say: "¿Qué escribo aquí?", intent: "what_write", step: "form" },
    { say: "Quisiera depositar mil pesos", intent: "deposit_ans", step: "deposit", slots: { price: 100000 } },
    { say: "Con quinientos pesos", intent: "deposit_ans", step: "deposit", slots: { price: 50000 } },
    { say: "Solo el mínimo, por favor", intent: "minimum", step: "deposit" },
    { say: "¿Cuánto es el mínimo?", intent: "ask_minimum", step: "deposit" },
    { say: "¿Hay comisión mensual?", intent: "fee_q" },
    { say: "¿Cuándo me dan la tarjeta?", intent: "card_when_q" },
    { say: "¿Puedo usar la tarjeta en el extranjero?", intent: "card_abroad_q" },
    { say: "¿Tienen app?", intent: "app_q" },
    { say: "¿Dónde hay un cajero?", intent: "atm_q" },
    { say: "¿Cuánto interés da?", intent: "interest_q" },
    { say: "¿Cómo puedo mandar dinero a Estados Unidos?", intent: "transfer_q" },
    { say: "Quisiera enviar dinero a mi familia", intent: "transfer_q" },
    { say: "¿Cuánto cuesta?", intent: "cost_q" },
    { say: "¿Cuánto tarda?", intent: "how_long_q" },
    { say: "¿Qué necesito?", intent: "need_q" },
    { say: "¿Qué es el código SWIFT?", intent: "swift_q" },
    { say: "¿Lo puedo hacer desde la app?", intent: "app_transfer_q" },
    { say: "Quisiera cambiar unos dólares a pesos", intent: "exchange_req" },
    { say: "¿Puedo cambiar dólares aquí?", intent: "exchange_req" },
    { say: "¿A cuánto está el dólar?", intent: "rate_q" },
    { say: "¿Cobran comisión?", intent: "cost_q" },
    { say: "El cajero se tragó mi tarjeta", intent: "card_kept" },
    { say: "Mi tarjeta se quedó en el cajero", intent: "card_kept" },
    { say: "La máquina se comió mi tarjeta", intent: "card_kept" },
    { say: "Sí, puse mal el NIP", intent: "wrong_pin", step: "pin_q" },
    { say: "¿Me puede bloquear la tarjeta?", intent: "block_req" },
    { say: "¿Me pueden dar una tarjeta nueva?", intent: "new_card_q" },
    { say: "Quisiera retirar dos mil pesos", intent: "amount_ctx", step: "cash_amount", slots: { price: 200000 } },
    { say: "Mil pesos, por favor", intent: "amount_ctx", step: "cash_amount", slots: { price: 100000 } },
    { say: "¿Puedo retirar efectivo aquí?", intent: "withdraw" },
    { say: "De quinientos está bien", intent: "bills_ans", step: "bills" },
    { say: "En billetes más chicos, por favor", intent: "bills_ans", step: "bills" },
    { say: "Doscientos dólares, por favor", intent: "euro_amount", step: "euros", slots: { number: 200 } },
    { say: "Todos los que traigo", intent: "euro_amount", step: "euros" },
    { say: "No, creo que no", intent: "machine_error", step: "pin_q", not: ["wrong_pin"] },
    { say: "Claro, no hay problema", intent: "no_problem", step: "slow" },
    { say: "No se preocupe, tómese su tiempo", intent: "no_problem", step: "slow" },
    { say: "No, es todo, gracias", intent: "more_no", step: "more" },
    { say: "Eso sería todo por hoy", intent: "more_no", step: "more" },
    { say: "Sí, tengo una pregunta", intent: "have_question", step: "more" },
    // Natural alternatives, short answers, accentless typing, tú to staff, Mexican and neutral words.
    { say: "el cajero se trago mi tarjeta", intent: "card_kept" },
    { say: "Se me atoró la tarjeta en el cajero", intent: "card_kept" },
    { say: "El cajero no me devolvió la tarjeta", intent: "card_kept" },
    { say: "Metí mi tarjeta y no salió", intent: "card_kept" },
    { say: "¿Me puedes ayudar?", intent: "help_me" },
    { say: "Me acabo de mudar a Puerto Colibrí", intent: "new_in_town", step: "help" },
    { say: "¿Qué necesito para abrir una cuenta?", intent: "open_account", step: "help" },
    { say: "De debito", intent: "acct_type_ans", step: "acct_type", slots: { acct: "checking" } },
    { say: "Para mi sueldo", intent: "acct_type_ans", step: "acct_type" },
    { say: "Pasaporte", intent: "doc_ctx", step: "id", slots: { doc: "passport" } },
    { say: "Contrato", intent: "proof_ctx", step: "proof", slots: { proof: "lease" } },
    { say: "¿Tienes un boli?", intent: "ask_pen", step: "form" },
    { say: "¿Así está bien?", intent: "signed_ctx", step: "form" },
    { say: "¿Aquí?", intent: "where_sign_ctx", step: "form" },
    { say: "Quinientos pesos", intent: "amount_ctx", step: "deposit", slots: { price: 50000 } },
    { say: "Trescientos", intent: "euro_ctx", step: "euros", slots: { number: 300 } },
    { say: "¿Qué ocupo para la transferencia?", intent: "need_q" },
    { say: "Tengo el turno A veintisiete", intent: "turn_ticket", step: "help" },
    { say: "¿Cuál es mi CLABE?", intent: "clabe_q" },
    { say: "¿Cuántos pesos son doscientos dólares?", intent: "rate_q", step: "euros", not: ["euro_amount", "euro_ctx"] },
    // Spain forms are correct, with no dialect correction.
    { say: "Quiero abrir una cuenta corriente", intent: "open_account", slots: { acct: "checking" } },
    { say: "Voy a ingresar mil pesos", intent: "deposit_ans", step: "deposit", slots: { price: 100000 } },
    { say: "¿Tenéis aplicación?", intent: "app_q" },
    { say: "Vale, eso es todo", intent: "more_no", step: "more" },
    { say: "Aquí está mi carnet de conducir", intent: "show_doc", step: "id", slots: { doc: "license" } },
    // Meaning safety: nothing opened, changed, refused or paid out that wasn't said.
    { say: "No quiero abrir una cuenta", intent: "no_open", step: "help", not: ["open_account"] },
    { say: "No, mejor una de débito", intent: "acct_type_ans", step: "acct_type", slots: { acct: "checking" }, not: ["acct_type_not"] },
    { say: "No necesito cambiar dólares", intent: "not_that", step: "help", not: ["exchange_req"] },
    { say: "No quiero cuenta de ahorro", intent: "acct_type_not", step: "acct_type", not: ["acct_type_ans"] },
    { say: "Débito, no ahorro", intent: "acct_type_ans", step: "acct_type", slots: { acct: "checking" }, not: ["acct_type_not"] },
    { say: "No traigo mi pasaporte", intent: "no_doc", step: "id", not: ["show_doc"] },
    { say: "No tengo pasaporte, pero tengo mi tarjeta de residente", intent: "show_doc", step: "id", slots: { doc: "id_card" }, not: ["no_doc"] },
    { say: "No tengo comprobante de domicilio", intent: "no_proof", step: "proof", not: ["give_proof"] },
    { say: "No lo traigo", intent: "no_proof", step: "proof", not: ["give_proof", "no_doc"] },
    { say: "No he firmado", intent: "not_done_ctx", step: "form", not: ["signed", "signed_ctx"] },
    { say: "No quiero depositar nada", intent: "no_deposit_ctx", step: "deposit", not: ["deposit_ans", "amount_ctx"] },
    { say: "No puse mal el NIP", intent: "machine_error", step: "pin_q", not: ["wrong_pin"] },
    { say: "No quiero una tarjeta nueva", intent: "not_that", step: "card_id", not: ["new_card_q"] },
    { say: "No necesito efectivo", intent: "no_cash_needed", step: "cash_offer", not: ["withdraw", "amount_ctx"] },
    { say: "No quiero la app", intent: "app_later", step: "app", not: ["app_q"] },
    { say: "El cajero no me dio dinero", intent: "none", step: "help_card" },
    { say: "¿Cambian euros?", intent: "exchange_other", step: "help", not: ["exchange_req"] },
    { say: "No vengo a abrir una cuenta, quiero cambiar dólares", intent: "no_open", step: "help", not: ["open_account"] },
    // Review traps (meaning safety and common answers the draft missed).
    { say: "Ya deposité mil pesos", intent: "none", step: "deposit" },
    { say: "Ya saqué dinero", intent: "none", step: "cash_offer" },
    { say: "No quiero sacar dinero", intent: "not_that", step: "cash_offer", not: ["withdraw", "amount_ctx"] },
    { say: "Tengo efectivo", intent: "no_cash_needed", step: "deposit", not: ["deposit_ans", "amount_ctx"] },
    { say: "Cien dólares", intent: "euro_amount", step: "deposit", not: ["deposit_ans", "amount_ctx"] },
    { say: "No mil, quinientos", intent: "amount_ctx", step: "deposit", slots: { price: 50000 } },
    { say: "¿Puedo cambiar mil dólares?", intent: "exchange_req", step: "help", slots: { number: 1000 } },
    { say: "No quiero abrir una cuenta, solo cambiar dólares", intent: "no_open", step: "help", not: ["open_account"] },
    { say: "No, pero quiero abrir una", intent: "open_account", not: ["deposit_ans", "amount_ctx"] },
    { say: "No quiero cuenta de ahorro, solo de débito", intent: "acct_type_not", step: "acct_type", slots: { acct: "savings" } },
    { say: "No, gracias, ya la tengo", intent: "app_have_ctx", step: "app", not: ["app_later", "app_q"] },
    { say: "No sé, tal vez", intent: "pin_unknown_ctx", step: "pin_q", not: ["wrong_pin", "pin_yes_ctx"] },
    { say: "Todavía no he terminado", intent: "not_done_ctx", step: "form", not: ["signed", "signed_ctx"] },
    { say: "El recibo de luz no está a mi nombre", intent: "no_proof", step: "proof", not: ["give_proof", "proof_ctx"] },
    { say: "Mi tarjeta se quedó atorada en el cajero", intent: "card_kept", step: "help_card" },
    { say: "No, el NIP estaba bien, el cajero se trabó", intent: "machine_error", step: "pin_q", not: ["wrong_pin", "pin_yes_ctx"] },
    { say: "No tengo comprobante de domicilio todavía", intent: "no_proof", step: "proof", not: ["give_proof", "proof_ctx"] },
    // Lead's check: amounts as typed, refusals at the amount questions, cash asked for with its amount.
    { say: "Quiero cambiar 1,000 dólares", intent: "exchange_req", step: "help", slots: { number: 1000 } },
    { say: "Quiero sacar dos mil pesos", intent: "withdraw", step: "help", slots: { price: 200000 } },
    { say: "No quiero cambiar nada", intent: "not_that", step: "euros", not: ["euro_amount", "euro_ctx", "exchange_req"] },
    { say: "No quiero sacar nada", intent: "not_that", step: "cash_amount", not: ["amount_ctx", "withdraw", "deposit_ans"] },
    { say: "No traigo efectivo", intent: "no_deposit_ctx", step: "deposit", not: ["deposit_ans", "amount_ctx", "minimum"] },
    { say: "Ya los cambié", intent: "none", step: "euros" },
    // Not understood: no free-text catch-all.
    { say: "Mi perro come plátanos azules", intent: "none" },
    { say: "bicicleta ventana guitarra", intent: "none" },
    { say: "Ayer fui a la playa con mi hermana", intent: "none" },
    { say: "Mikalauskas", intent: "none" },
  ],

  sims: [
    { name: "open a checking account, happy path",
      turns: ["Hola, quiero abrir una cuenta de débito", "Aquí está mi pasaporte", "Aquí está mi recibo de luz", "No, todavía no la tengo", "Listo, ya firmé",
        "Quiero depositar mil pesos", "No, es todo, gracias"],
      expect: { complete: true, state: { type: "checking", id: "passport", proof: "utility_bill", ssn: "none", deposit: 100000 } }, auto: BANK_AUTO,
      setup: (s) => { s.cardTwist = false; s.slowTwist = false; } },
    { name: "no to the optional offers, short answers",
      turns: ["Necesito una cuenta bancaria", "De débito", "Tome", "Tengo un estado de cuenta", "Todavía no", "¿Dónde firmo?", "Listo", "Mil", "No, gracias", "No, es todo"],
      expect: { complete: true, state: { type: "checking", proof: "statement", ssn: "none", deposit: 100000 } },
      auto: { ...BANK_AUTO, savings: "No, gracias", app: "No, gracias" }, setup: (s) => { s.cardTwist = false; s.slowTwist = false; } },
    { name: "questions first, then a savings account: transfer, fee, no proof, the CURP explained",
      turns: ["Buenos días. ¿Cómo puedo mandar dinero a Estados Unidos?", "¿Cuánto tarda?", "¿Qué necesito?", "Mejor quiero abrir una cuenta de ahorro", "¿Hay comisión mensual?",
        "Aquí tiene mi tarjeta de residente", "No tengo comprobante de domicilio", "¿Qué es la CURP?", "Viene en mi tarjeta de residente", "¿Me presta una pluma?",
        "¿Dónde firmo?", "Aquí tiene", "Solo el mínimo", "¿Cuándo me dan la tarjeta?", "Eso es todo, gracias"],
      expect: { complete: true, state: { type: "savings", id: "id_card", proof: "lease", ssn: "yes", deposit: 50000, toldTransfer: true } }, auto: BANK_AUTO,
      setup: (s) => { s.cardTwist = false; s.slowTwist = false; s.customer = false; } },
    { name: "change of mind: savings, then checking; a license refused, the passport instead",
      turns: ["Quisiera abrir una cuenta", "Una de ahorro", "No, mejor una de débito", "Aquí está mi licencia de manejo", "Sí, traigo mi pasaporte", "Aquí está mi recibo de agua",
        "No tengo CURP", "Ya lo llené", "Con dos mil", "No, es todo"],
      expect: { complete: true, state: { type: "checking", id: "passport", ssn: "none", deposit: 200000 } }, auto: BANK_AUTO,
      setup: (s) => { s.cardTwist = false; s.slowTwist = false; s.offerSavings = false; s.offerApp = false; } },
    { name: "the ATM kept my card (twist forced)",
      turns: ["Buenos días. El cajero de afuera se tragó mi tarjeta", "Aquí está mi pasaporte", "¿Mi dinero está seguro?", "No, es todo. ¡Gracias!"],
      expect: { complete: true, state: { card: true, blocked: true, id: "passport" } }, auto: BANK_AUTO,
      setup: (s) => { s.cardTwist = true; s.customer = true; s.slowTwist = false; s.askDigits = false; s.offerCash = false; } },
    { name: "the ATM kept my card: the PIN was right, no digits, no cash needed (twist forced)",
      turns: ["Se me atoró la tarjeta en el cajero", "No, el NIP estaba bien", "Tome, mi pasaporte", "No me acuerdo", "No, tengo efectivo", "¿Me pueden devolver mi tarjeta?", "Nada más, gracias"],
      expect: { complete: true, state: { pinCause: "machine", blocked: true, cash: false } }, auto: {},
      setup: (s) => { s.cardTwist = true; s.customer = true; s.slowTwist = false; s.hay = undefined; s.turnGreet = false; s.askPin = true; s.askDigits = true; s.offerCash = true; } },
    { name: "the card twist with digits, cash at the counter and bills",
      turns: ["La máquina se comió mi tarjeta", "Sí, me equivoqué de NIP tres veces", "Aquí tiene", "Termina en cuatro cinco ocho dos", "Sí, por favor", "Dos mil pesos", "En billetes de cien, por favor", "Es todo"],
      expect: { complete: true, state: { pinCause: "wrong", blocked: true, cashAmount: 200000, billsDone: true } }, auto: {},
      setup: (s) => { s.cardTwist = true; s.customer = true; s.slowTwist = false; s.hay = undefined; s.turnGreet = false; s.askPin = true; s.askDigits = true; s.offerCash = true; s.askBills = true; } },
    { name: "customer: change dollars, then take out cash",
      turns: ["Hola, ¿puedo cambiar dólares?", "Trescientos dólares", "También quiero sacar efectivo", "Aquí está mi pasaporte", "Dos mil pesos", "De quinientos está bien", "No, es todo, gracias"],
      expect: { complete: false, state: { exchange: "done", cashAmount: 200000, billsDone: true } }, auto: BANK_AUTO,
      setup: (s) => { s.customer = true; s.cardTwist = false; s.slowTwist = false; s.offerCash = false; s.askBills = true; } },
    { name: "change dollars as a newcomer: customers only, so open an account",
      turns: ["¿Cambian dólares?", "No, todavía no", "Sí, por favor", "De débito, por favor", "Aquí está mi pasaporte", "Aquí está mi contrato de renta", "No, todavía no",
        "Listo", "Quinientos pesos", "No, es todo"],
      expect: { complete: true, state: { type: "checking", proof: "lease", deposit: 50000 } }, auto: BANK_AUTO,
      setup: (s) => { s.customer = false; s.cardTwist = false; s.slowTwist = false; } },
    { name: "the slow system (twist forced), a turn ticket and a how-are-you",
      turns: ["Bien, gracias, ¿y usted?", "Quiero abrir una cuenta de débito", "Tome", "Tengo un recibo de luz", "Sí, la tengo", "No se preocupe, tómese su tiempo",
        "Ya terminé", "Con mil pesos", "No, gracias", "Eso es todo"],
      expect: { complete: true, state: { slowDone: true, ssn: "yes", deposit: 100000 } }, auto: BANK_AUTO,
      setup: (s) => { s.slowTwist = true; s.cardTwist = false; s.hay = "pending"; s.turnGreet = false; } },
    { name: "deposit questions: too little, '¿Con quinientos alcanza?' asked back, then yes",
      turns: ["Tengo el turno A veintisiete", "Quiero abrir una cuenta", "Las dos", "Aquí tiene", "Aquí tiene mi recibo de luz", "No, todavía no", "Listo, ya firmé",
        "Doscientos pesos", "¿Con quinientos alcanza?", "Sí", "No, gracias"],
      expect: { complete: true, state: { type: "both", deposit: 50000 } }, auto: BANK_AUTO,
      setup: (s) => { s.cardTwist = false; s.slowTwist = false; s.hay = undefined; s.turnGreet = true; s.offerSavings = false; s.offerApp = false; } },
    { name: "exchange questions: the rate, a what-if, then the amount; euros not changed",
      turns: ["¿A cuánto está el dólar?", "¿Cambian euros?", "Quisiera cambiar unos dólares a pesos", "¿Y si cambio mil?", "No", "Doscientos dólares", "¿Cobran comisión?", "Eso es todo"],
      expect: { complete: false, state: { exchange: "done" } }, auto: {},
      setup: (s) => { s.customer = true; s.cardTwist = false; s.slowTwist = false; s.hay = undefined; s.turnGreet = false; } },
    { name: "review: an exchange amount said first is quoted, and a corrected amount is changed",
      turns: ["¿Y si cambio quinientos dólares?", "No, mejor doscientos", "Eso es todo"],
      expect: { complete: false, state: { exchange: "done" } }, auto: {},
      setup: (s) => { s.customer = true; s.cardTwist = false; s.slowTwist = false; s.hay = undefined; s.turnGreet = false; } },
    { name: "review: the account type with its comma lost is asked again; a deposit corrected",
      turns: ["Quiero abrir una cuenta", "Ahorro no débito", "De débito", "Aquí está mi pasaporte", "Tengo un recibo de luz", "No", "Todavía no he terminado", "Listo",
        "Tengo efectivo", "No mil, quinientos", "No, es todo"],
      expect: { complete: true, state: { type: "checking", deposit: 50000 } }, auto: BANK_AUTO,
      setup: (s) => { s.customer = false; s.cardTwist = false; s.slowTwist = false; s.hay = undefined; s.turnGreet = false; s.idProofTogether = false; s.offerSavings = false; s.offerApp = false; } },
    { name: "review: dollars asked for during the opening are changed once the account is open",
      turns: ["Quiero abrir una cuenta de débito", "También quiero cambiar dólares", "Aquí está mi pasaporte", "Tengo un recibo de luz", "No", "Listo", "Mil pesos",
        "Doscientos dólares", "Es todo"],
      expect: { complete: true, state: { exchange: "done", deposit: 100000 } }, auto: BANK_AUTO,
      setup: (s) => { s.customer = false; s.cardTwist = false; s.slowTwist = false; s.hay = undefined; s.turnGreet = false; s.idProofTogether = false; s.offerSavings = false; s.offerApp = false; } },
    { name: "lead: a deposit said with the request waits for its step; the form's 'Está bien' is no signature",
      turns: ["Quiero abrir una cuenta de débito con mil pesos", "Aquí está mi pasaporte", "Tengo un recibo de luz", "No, todavía no la tengo", "Está bien",
        "Listo, ya firmé", "Mil pesos", "No, es todo"],
      expect: { complete: true, state: { type: "checking", id: "passport", proof: "utility_bill", ssn: "none", signed: true, deposit: 100000 } }, auto: BANK_AUTO,
      setup: (s) => { s.customer = false; s.cardTwist = false; s.slowTwist = false; s.hay = undefined; s.turnGreet = false; s.idProofTogether = false; s.offerSavings = false; s.offerApp = false; } },
    { name: "lead: pesos at the dollars step, '15 mil' typed refused, a refusal, then 1,000 typed with its comma",
      turns: ["Quiero cambiar dólares", "Quiero cambiar dos mil pesos", "Quiero cambiar 15 mil dólares", "No quiero cambiar nada", "Quiero cambiar 1,000 dólares", "Sí",
        "Eso es todo"],
      expect: { complete: false, state: { exchange: "done", usdChanged: 1000 } }, auto: {},
      setup: (s) => { s.customer = true; s.cardTwist = false; s.slowTwist = false; s.hay = undefined; s.turnGreet = false; } },
    { name: "lead: cash asked for with its amount is paid out after the ID",
      turns: ["Quiero sacar dos mil pesos", "Aquí está mi pasaporte", "De quinientos está bien", "No, es todo, gracias"],
      expect: { complete: false, state: { cash: "amount", cashAmount: 200000, billsDone: true } }, auto: {},
      setup: (s) => { s.customer = true; s.cardTwist = false; s.slowTwist = false; s.hay = undefined; s.turnGreet = false; s.askBills = true; } },
    { name: "no ID at all: come back later",
      turns: ["Quiero abrir una cuenta de ahorro", "No traigo mi pasaporte", "No"],
      expect: { complete: false, state: { type: "savings", id: undefined } }, auto: {},
      setup: (s) => { s.customer = false; s.cardTwist = false; s.slowTwist = false; s.hay = undefined; s.turnGreet = false; s.idProofTogether = false; } },
  ],
};

export default bank;
