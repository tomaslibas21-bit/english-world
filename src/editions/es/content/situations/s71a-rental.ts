// Resolved in the engine (2 Nov 2026, lang.ts): "así está bien", "está bien así", "déjelo así" are a no (they were in the
// shared yes list); "pague" is out of the "pago" class and a past said with its accent ("Pagué todo") matches only a past
// pattern, so the past patterns here are accented ("ya lo pagué"); "¿Y si…?" is an "if", never "sí" (the what-if
// patterns write "y si" together); "Claro que no" is a no; the {letters} slot knows "doble ele". offerReply(),
// paidPast() and whatIf() stay as local guards (an unaccented "Pague todo" is still read here).
// Song 71 "Fill It Up" (part 1) → Renta de Autos Colibrí, Puerto Colibrí. Andrés at the counter (usted).
// Keeps the base situation's agenda, intent IDs and twists (free upgrade, reservation under the first name).
// The brief adds the Mexican twist: an online booking that leaves out the mandatory liability insurance
// ("el seguro obligatorio de responsabilidad civil"), the new step "tpl" (visits ≥ 1, reservations only).
// Mexico: the mandatory third-party liability insurance is required by law and no credit card covers it;
// full coverage ("cobertura amplia": damage to the car and theft) is optional, and declining it means a much
// larger hold on the card; a foreign license is valid for a tourist, a credit card (not debit) is needed for
// the hold; rentals come with a full tank; economy cars are often manual ("estándar"); a damage walk-around
// with photos before leaving ("la hoja de inspección").
// Figures (typical for the Tulum / Riviera Maya area, Nov 2026, rounded; the exact ones vary by agency):
// economy $650, compact $750, midsize $950, SUV $1,400, minivan $1,800 a day with the mandatory insurance;
// that insurance alone $350 a day; full coverage +$450; upgrade +$200; GPS $150, child seat $120;
// a prepaid tank $1,200 ($1,400 for the SUV, $1,800 for the minivan: Magna is about $24 a liter, s71b);
// airport drop-off $800; hold $5,000 with full coverage, $20,000 without; an additional driver free;
// one hour's grace on the return. The pickup is on a Tuesday; three days → Friday, by 5 p.m.
// Audit (5 Nov 2026): a free upgrade keeps the compact's rate; a later return more than 7 days on is quoted by the
// day (its total isn't in the voiced values); "¿Cuánto es en total?" gets the daily cost, never the deposit.

import type { Ctx, EntityDef, Pending, Segment, SituationDef } from "@/content/types";
import { ent, t } from "@/content/dsl";
import { expectHowAreYou } from "@/content/global";

// ---------------------------------------------------------------------------
// Cars, extras, days

const SIZES: EntityDef[] = [
  ent("economy", "económico", "economy car", "m", { pl: "económicos", ltPl: "economy cars", chip: "económico",
    forms: ["economico", "carro economico", "auto economico", "el mas barato", "el mas economico", "algo barato", "algo economico", "uno barato", "uno economico", "el mas chico", "el mas pequeno", "el mas chiquito", "lo mas barato", "lo mas barato que tenga", "lo mas economico", "lo mas economico que tenga"],
    attrs: { rate: 65000, car: "car_economy" } }),
  ent("compact", "compacto", "compact car", "m", { pl: "compactos", ltPl: "compact cars", chip: "compacto",
    forms: ["compacto", "carro compacto", "auto compacto", "uno compacto", "carro chico", "auto chico", "uno chico", "algo chico", "uno pequeno", "algo pequeno", "un carro normal", "uno normal", "algo normal"],
    attrs: { rate: 75000, car: "car_compact" } }),
  ent("midsize", "intermedio", "midsize car", "m", { pl: "intermedios", ltPl: "midsize cars", chip: "intermedio",
    forms: ["intermedio", "mediano", "uno mediano", "carro mediano", "auto mediano", "carro intermedio", "auto intermedio", "uno intermedio", "sedan", "un sedan"],
    attrs: { rate: 95000, car: "car_midsize" } }),
  ent("suv", "camioneta", "SUV", "f", { pl: "camionetas", ltPl: "SUVs", chip: "camioneta",
    forms: ["suv", "una suv", "un suv", "camioneta suv", "jeep", "un jeep", "camioneta grande", "una camioneta grande", "carro grande", "auto grande", "algo grande", "cuatro por cuatro", "4x4"],
    attrs: { rate: 140000, car: "car_suv" } }),
  ent("minivan", "minivan", "minivan", "f", { pl: "minivans", ltPl: "minivans", chip: "minivan",
    forms: ["minivan", "mini van", "van", "una van", "camioneta de siete pasajeros", "camioneta para siete", "camioneta familiar"],
    attrs: { rate: 180000, car: "car_minivan" } }),
];

const EXTRAS: EntityDef[] = [
  ent("gps", "GPS", "GPS", "m", { chip: "GPS", forms: ["gps", "navegador", "un navegador", "navegador gps", "sistema de navegacion", "ge pe ese", "je pe ese"], attrs: { rate: 15000 } }),
  ent("child_seat", "silla | para | niño", "seat | for | child", "f", { pl: "sillas | para | niño", ltPl: "seats | for | child", chip: "silla para niño",
    forms: ["silla para nino", "silla de nino", "silla para bebe", "silla de bebe", "autoasiento", "asiento para nino", "asiento infantil", "silla infantil", "sillita", "booster", "silla para ninos", "silla de auto", "silla para el carro", "silla", "la silla", "asiento"],
    attrs: { rate: 12000, nat: "child seat" } }),
];

const WEEKDAYS: EntityDef[] = [
  ent("monday", "lunes", "Monday", "m"), ent("tuesday", "martes", "Tuesday", "m"), ent("wednesday", "miércoles", "Wednesday", "m"),
  ent("thursday", "jueves", "Thursday", "m"), ent("friday", "viernes", "Friday", "m"), ent("saturday", "sábado", "Saturday", "m"),
  ent("sunday", "domingo", "Sunday", "m"),
];
/** The car is picked up on a Tuesday: n days later is ORDER[n - 1] (3 days → Friday). */
const ORDER = ["wednesday", "thursday", "friday", "saturday", "sunday", "monday", "tuesday"];
const dayAfter = (n: number) => ORDER[(Math.max(1, n) - 1) % 7];
const daysTo = (day: string) => ORDER.indexOf(day) + 1;

const byId = (id: string) => [...SIZES, ...EXTRAS, ...WEEKDAYS].find((e) => e.id === id)!;
const TPL = 35000; // mandatory liability insurance a day (the twist)
const FULL_COVERAGE = 45000; // a day
const UPGRADE = 20000; // a day, compact → midsize
const PREPAY = 120000; // a full tank, prepaid: economy to midsize (about 45–50 liters)
const PREPAY_SUV = 140000; // about 55 liters
const PREPAY_VAN = 180000; // about 70 liters
const AIRPORT = 80000;
const DEPOSIT_FULL = 500000;
const DEPOSIT_BASIC = 2000000;
/** The automatic compact instead of the manual economy car: 100 pesos more a day. */
const MANUAL_SWITCH = (byId("compact").attrs!.rate as number) - (byId("economy").attrs!.rate as number);

// ---------------------------------------------------------------------------
// State helpers

const TURN = new WeakMap<object, Record<string, any>>();
const turn = (c: Ctx) => { let x = TURN.get(c); if (!x) { x = {}; TURN.set(c, x); } return x; };
function once(c: Ctx, key: string, line: string, vars?: Record<string, any>) { const T = turn(c); if (T["said_" + key]) return; T["said_" + key] = true; c.say(line, vars); }
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const heard = (c: Ctx) => fold(c.heard || "");
const allTags = (v: any, seg?: Segment): string[] => {
  const out: string[] = [...(seg?.tags || [])];
  const walk = (o: any) => { if (!o || typeof o !== "object") return; if (Array.isArray(o)) { o.forEach(walk); return; } out.push(...(o.__tags || [])); for (const [k, x] of Object.entries(o)) if (k !== "__tags") walk(x); };
  walk(v);
  return out;
};

/** This conversation's own words, never a surname (the name slot takes any word that isn't a function word). */
const NOT_A_NAME = /^(seguro|obligatorio|incluido|cobertura|amplia|completa|reservacion|reserva|carro|auto|coche|tarjeta|licencia|pasaporte|internet|linea|compacto|economico|intermedio|camioneta|minivan|deposito|garantia|gasolina|tanque)$/;
/** The learner's words, folded, without punctuation. */
const words = (c: Ctx) => heard(c).replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
/** "Claro que no" is a no; "Claro que no hay problema" is a yes. */
const NO_OF_COURSE = /\b(claro|por supuesto) que no\b(?! (hay|habra|pasa|importa)\b)/;
/** "Pagué todo", "Ya lo pagué", "Todo está pagado": paying twice, a complaint. The engine used to read pagué (folded
 *  "pague") as a form of "pago", so "Pagué todo" matched "Lo pago" and accepted the charge; it no longer does, but an
 *  unaccented "pague" still can't tell a past from a command, so this stays. */
const paidPast = (c: Ctx) => /\b(pague|pagado|pagada|pagaron)\b|\bya (lo |la )?(pago|pagamos)\b|\bpagamos todo\b/.test(words(c));
/** "¿Y si…?" / "¿Qué pasa si…?": a question about an option, not the choice (accents are folded, so this "si" also
 *  reads as "sí": "¿Y si cancelo?" was "Sí, cancelo"). */
const whatIf = (c: Ctx) => /^((oiga|disculpe|perdon|bueno|pues|este|a ver|mmm|eh) )*((y|pero y|entonces y) si|(y )?que pasa si|(y )?que tal si)\b/.test(words(c))
  || /^\s*¿\s*(y\s+)?si\b/i.test(c.heard || "");
/** At "¿O prefiere pagar el tanque por adelantado?" only these are a yes; "Está bien", "Ok", "Órale" may mean the full
 *  tank just described as well. */
const CLEAR_YES = /\b(si|claro|por supuesto|como no|desde luego|lo pago|acepto|adelante|cobremelo|cobrelo|por que no)\b/;

/** A reply to an offer with a price: "Así está bien" / "Estoy bien así" / "Claro que no" decline it (the engine's
 *  yes list had "así está bien", right for a confirmation, not for an offer); "Está bien, gracias" (or "Ok, gracias",
 *  "Vale, gracias") may decline or accept, and "Pagué todo" or "¿Y si…?" isn't a yes, so Andrés asks again before
 *  adding anything paid. */
function offerReply(c: Ctx): "yes" | "no" | "unsure" {
  const h = words(c);
  if (NO_OF_COURSE.test(h) || /^(no|nop|nel)\b(?! hay problema)/.test(h)) return "no";
  if (/^(no )?((asi|con eso) (esta|estoy) bien|(esta|estoy) bien asi|estoy bien)( asi)?( (muchas )?gracias)?$/.test(h)) return "no";
  if (/^(esta bien|bueno|ok|okay|vale|sale|va|muy bien) (muchas )?gracias$/.test(h) || paidPast(c) || whatIf(c)) return "unsure";
  return "yes";
}
/** Wrap the yes of a paid offer: a decline reads as no, an unclear answer is asked again (`again` re-opens it). */
function offerYes(yes: (c: Ctx) => void, no: (c: Ctx) => void, again?: (c: Ctx) => void) {
  return (c: Ctx) => {
    const r = offerReply(c);
    if (r === "no") { no(c); return; }
    if (r === "unsure") { again?.(c); c.say("yes_or_no"); c.hold(); return; }
    yes(c);
  };
}

const size = (c: Ctx) => (c.s.size as string | undefined) ?? "compact";
/** The daily rate the learner pays: a free upgrade (no compacts left) keeps the compact's rate. */
const rate = (c: Ctx) => byId(c.s.upgrade === "free" ? "compact" : size(c)).attrs!.rate as number;
/** What was added per day: full coverage and the extras. */
const addedPerDay = (c: Ctx) => (c.s.ins === "full" ? FULL_COVERAGE : 0) + ((c.s.extras ?? []) as string[]).reduce((a, id) => a + (byId(id).attrs!.rate as number), 0);
/** A reservation whose online price left out the mandatory insurance, before Andrés has told it (the twist): no
 *  "ya está incluido" or a price with it included before then. */
const twistUntold = (c: Ctx) => !!c.s.tplTwist && c.s.resv === true && !c.s.tplAsked;
/** "¿Cuánto es en total?": the daily cost with what was added (the one-time fees were quoted when chosen). */
function sayTotal(c: Ctx) {
  if (c.s.walkin && !c.s.size) { c.say("rate_size", { X: "compact", price: byId("compact").attrs!.rate }); return; }
  const added = addedPerDay(c);
  if (added) c.say("total_day", { total: rate(c) + added });
  else { c.say("rate_is", { price: rate(c) }); if (c.s.walkin) c.s.rateSaid = true; }
}
const days = (c: Ctx) => (c.s.days as number | undefined) ?? 3;
/** The return as a number of days after the Tuesday pickup (a week = 7, the next Tuesday; more = "en 10 días"). */
const retN = (c: Ctx) => (c.s.retN as number | undefined) ?? (c.s.retDay ? daysTo(c.s.retDay) : days(c));
const retDay = (c: Ctx) => (c.s.retDay as string | undefined) ?? dayAfter(retN(c));
const depositOf = (c: Ctx) => (c.s.ins === "full" ? DEPOSIT_FULL : DEPOSIT_BASIC);

/** Days from a {dur} slot ("tres días", "una semana", "el fin de semana") or a {day} ("hasta el sábado"). */
function durFrom(slots: any, seg?: Segment): { n?: number; day?: string } {
  const d = slots?.dur;
  if (d) {
    const tags = allTags(d, seg);
    if (tags.includes("weekend")) return { n: daysTo("sunday"), day: "sunday" };
    const fixed = tags.find((x) => x.startsWith("n:"));
    if (fixed) return { n: Number(fixed.slice(2)) };
    if (typeof d.number === "number" && d.number > 0 && d.number <= 30) return { n: d.number };
  }
  if (typeof slots?.day === "string") {
    if (slots.day === "tomorrow") return { n: 1 };
    if (slots.day === "day_after_tomorrow") return { n: 2 };
    if (ORDER.includes(slots.day)) return { n: daysTo(slots.day), day: slots.day };
  }
  if (typeof slots?.number === "number" && slots.number > 0 && slots.number <= 30) return { n: slots.number };
  return {};
}

/** Keys handed over: insurance, deposit and return are settled, so the task is complete. */
function giveKeys(c: Ctx) {
  c.s.keysGiven = true;
  c.complete();
  c.remember({ lastCar: size(c) });
  c.say("keys");
  if (c.s.tellSpot) { c.s.spotKnown = true; c.say(byId(size(c)).attrs!.car); }
  c.say("check_car");
  c.event("give", { item: "car-keys", car: size(c) });
  // "¡Gracias!" for the keys: a short "you're welcome", then the goodbye (the task is already complete)
  c.expect({ id: "keys_thanks", optional: true, expects: ["where_car", "scratch_q", "ok_ack", "where_car_ctx"], hints: ["car", "g_social"],
    suggest: [{ lt: "Ask about the car", hint: "car" }, { lt: "Say thank you", hint: "g_social" }],
    on: { g_thanks: (cc) => { once(cc, "kt", "welcome"); } } });
}
const sign = (c: Ctx) => { if (!c.s.signed) { c.s.signed = true; c.event("sign"); } };
const stepOf = (c: Ctx) => rental.steps.find((x) => x.id === c.step);

/** No car without the mandatory insurance: said once in full, then a short question (keep it or cancel). */
function tplRequired(c: Ctx) { if (c.s.tplRefused) c.say("tpl_required_again"); else { c.s.tplRefused = true; c.say("tpl_required"); } }

/** The mandatory liability insurance accepted (the twist). "Pagué todo" is a complaint, not a yes. */
function tplAccept(c: Ctx) {
  if (c.s.tplOk) return;
  if (paidPast(c)) { rental.handlers.tpl_refuse_ctx(c, {}, { intent: "tpl_refuse_ctx", slots: {}, tags: [] }); return; }
  c.s.tplOk = true; c.say("tpl_ok");
}

/** "¿Puedo cancelar?" / "¿Y si cancelo?" at the twist: yes, and does the learner want to? A no keeps the reservation
 *  (the twist's question comes back: "¿Seguimos, entonces?"). */
function cancelPending(): Pending {
  const leave = (cc: Ctx) => { cc.s.left = true; cc.say("tpl_leave"); cc.end(); };
  return {
    id: "tpl_cancel", optional: true, expects: ["tpl_leave_ctx"], hints: ["g_yesno"],
    suggest: [{ lt: "Say whether to cancel", hint: "g_yesno" }],
    on: { tpl_leave_ctx: (cc) => { leave(cc); } },
    yes: leave, no: () => { /* the tpl step asks again */ },
    ask: (cc) => cc.say("tpl_cancel_q"),
  };
}

/** A pending offer's price asked again ("¿Cuánto es?"): say it, and the offer stays open. */
function priceAgain(p: Pending, sayPrice: (c: Ctx) => void): Pending {
  const q: Pending = { ...p, expects: [...(p.expects ?? []), "price_q"], on: { ...p.on, price_q: (cc) => { sayPrice(cc); cc.expect(q); } } };
  return q;
}

/** Upgrade to a midsize for 200 pesos more a day (only after that price was said). "¿Y si me cambio?" gets the price
 *  and the question stays open. */
function upgradeYes(c: Ctx) {
  if (c.s.upgrade !== undefined) return;
  if (whatIf(c)) { c.s.upgradeQuoted = true; c.say("price_more", { price: UPGRADE }); if (c.step === "upgrade") c.hold(); else c.expect(upgradePending()); return; }
  c.s.upgrade = "paid"; c.s.size = "midsize"; c.say("upgrade_ok");
}
function upgradeNo(c: Ctx) { if (c.s.upgrade !== undefined) return; c.s.upgrade = "no"; c.say("no_problem"); }
function upgradePending(): Pending {
  const yes = offerYes(upgradeYes, upgradeNo, (cc) => cc.expect(upgradePending()));
  return priceAgain({
    id: "upgrade_q", expects: ["keep_size", "upgrade_yes", "ok_ack", "pricey_ctx", "polite_no_ctx"], hints: ["upgrade"],
    suggest: [{ lt: "Accept or keep the compact", hint: "upgrade" }],
    on: { ok_ack: (cc) => { yes(cc); }, pricey_ctx: (cc) => { upgradeNo(cc); }, polite_no_ctx: (cc) => { upgradeNo(cc); },
      keep_size: (cc, sl) => { if (sl.size === "midsize") upgradeYes(cc); else upgradeNo(cc); }, upgrade_yes: (cc) => { upgradeYes(cc); } },
    yes, no: (cc) => upgradeNo(cc),
    // the price was said when the offer was made: asked again, a short reminder
    ask: (cc) => cc.say("ask_upgrade_again"),
  }, (cc) => cc.say("price_more", { price: UPGRADE }));
}

/** The economy car is a manual: switch to an automatic compact? "Mejor el compacto" switches, another size is chosen
 *  instead, and "¿Cuánto más es?" gets the difference (not the insurance's price). */
function manualPending(): Pending {
  const no = (cc: Ctx) => { once(cc, "switch", "no_problem"); };
  const switchIt = (cc: Ctx) => { cc.s.size = "compact"; once(cc, "switch", "switch_ok"); };
  const yes = offerYes(switchIt, no, (cc) => cc.expect(manualPending()));
  return priceAgain({
    id: "estandar", expects: ["size_ctx", "ok_ack", "pricey_ctx", "manual_ok_ctx", "polite_no_ctx"], hints: ["g_yesno"],
    suggest: [{ lt: "Keep the manual or switch to the automatic", hint: "g_yesno" }],
    on: { ok_ack: (cc) => { yes(cc); }, pricey_ctx: (cc) => { no(cc); }, manual_ok_ctx: (cc) => { no(cc); }, polite_no_ctx: (cc) => { no(cc); },
      size_ctx: (cc, sl, seg) => { if (sl.size === "compact") switchIt(cc); else if (sl.size === "economy") no(cc); else rental.handlers.size_ctx(cc, sl, seg); } },
    yes, no,
    ask: (cc) => cc.say("economy_manual", { price: byId("compact").attrs!.rate }),
  }, (cc) => cc.say("price_more", { price: MANUAL_SWITCH }));
}

/** Prepaying the tank (asked on some visits, or when the learner asks for it). `or`: asked as "¿O prefiere pagar el
 *  tanque por adelantado?" after the full tank was described, where "Está bien", "Ok" or "Órale" may mean either:
 *  only a clear yes ("Sí", "Claro", "Lo pago") prepays, another agreement gets "Entonces, ¿le cobro el tanque por
 *  adelantado?". Once the question is asked again as "¿Se lo cobro?", a plain yes/no question, any yes counts. */
function prepayPending(or = false): Pending {
  let isOr = or;
  const prepay = (cc: Ctx) => {
    if (cc.s.fuel === "prepaid") return;
    // "¿Y si lo pago por adelantado?": the terms, then the question again
    if (whatIf(cc)) { cc.expect(prepayPending()); cc.say("prepay_quote", { price: size(cc) === "minivan" ? PREPAY_VAN : size(cc) === "suv" ? PREPAY_SUV : PREPAY }); return; }
    cc.s.fuel = "prepaid"; cc.say("prepay_ok");
  };
  const full = (cc: Ctx) => { if (cc.s.fuel === "full") return; cc.s.fuel = "full"; cc.say("full_ok"); };
  const again = (cc: Ctx) => { cc.expect(prepayPending()); cc.say("prepay_confirm"); };
  const yes = (cc: Ctx) => {
    const r = offerReply(cc);
    if (r === "no") full(cc);
    else if (r === "unsure" || (isOr && !CLEAR_YES.test(words(cc)))) again(cc);
    else prepay(cc);
  };
  const p: Pending = {
    id: "prepay", expects: ["fuel_full", "prepay_yes", "fuel_q", "mileage_q", "auto_q", "fuel_no_ctx", "pricey_ctx", "polite_no_ctx", "ok_ack", "price_q"], hints: ["fuel"],
    suggest: [{ lt: "Prepay the tank or bring it back full", hint: "fuel" }],
    on: {
      fuel_full: (cc) => { full(cc); }, prepay_yes: (cc) => { prepay(cc); }, ok_ack: (cc) => { yes(cc); },
      // "No, lo devuelvo lleno" reads like "No lo devuelvo lleno" (commas are lost): at this question the full tank is
      // the likelier reading. "No lo voy a llenar" or "No voy a tener tiempo de llenarlo" is not a full tank: ask.
      fuel_no_ctx: (cc) => { if (/^no lo (devuelvo|voy a devolver|regreso|entrego|traigo) (lleno|con el tanque lleno)\b/.test(words(cc))) full(cc); else again(cc); },
      pricey_ctx: (cc) => { full(cc); }, polite_no_ctx: (cc) => { full(cc); },
      price_q: (cc) => { cc.say("price_once", { price: size(cc) === "minivan" ? PREPAY_VAN : size(cc) === "suv" ? PREPAY_SUV : PREPAY }); cc.expect(p); },
    },
    yes, no: full,
    ask: (cc) => { isOr = false; cc.s.prepayAsked = true; cc.say("prepay_quote", { price: size(cc) === "minivan" ? PREPAY_VAN : size(cc) === "suv" ? PREPAY_SUV : PREPAY }); },
  };
  return p;
}

/** An extra quoted ("El GPS cuesta $150 al día. ¿Se lo agrego?"). */
function extraPending(ids: string[]): Pending {
  const price = ids.reduce((a, id) => a + (byId(id).attrs!.rate as number), 0);
  const no = (cc: Ctx) => { cc.s.extras ??= []; once(cc, "extra", "no_extras"); };
  const yes = offerYes((cc) => { cc.s.extras ??= []; for (const id of ids) if (!cc.s.extras.includes(id)) cc.s.extras.push(id); once(cc, "extra", "extra_added"); },
    no, (cc) => cc.expect(extraPending(ids)));
  const quote = (cc: Ctx) => { if (ids.length > 1) cc.say("extra_quote_both", { price }); else cc.say("extra_quote", { X: ids[0], price }); };
  return priceAgain({
    id: "extra_add", expects: ["ok_ack", "extras_no", "ins_no_ctx", "pricey_ctx", "polite_no_ctx"], hints: ["g_yesno"],
    suggest: [{ lt: "Say whether to add it", hint: "g_yesno" }],
    on: { ok_ack: (cc) => { yes(cc); }, extras_no: (cc) => { no(cc); }, ins_no_ctx: (cc) => { no(cc); }, pricey_ctx: (cc) => { no(cc); }, polite_no_ctx: (cc) => { no(cc); } },
    yes, no,
    ask: quote,
  }, (cc) => cc.say("price_day", { price }));
}

/** "Es mucho": full coverage lowers the hold (quoted first). */
function lowerPending(): Pending {
  const no = (cc: Ctx) => { cc.say("no_problem"); };
  const take = (cc: Ctx) => { cc.s.ins = "full"; cc.say("ins_full_ok"); cc.say("deposit_now", { deposit: DEPOSIT_FULL }); };
  const yes = offerYes(take, no, (cc) => cc.expect(lowerPending()));
  return priceAgain({
    id: "lower", expects: ["ok_ack", "ins_full", "pricey_ctx", "polite_no_ctx"], hints: ["g_yesno"], suggest: [{ lt: "Say whether to add full coverage", hint: "g_yesno" }],
    on: { ok_ack: (cc) => { yes(cc); }, pricey_ctx: (cc) => { no(cc); }, polite_no_ctx: (cc) => { no(cc); },
      // "¿Y si quiero la cobertura amplia?": its price, and the question stays open
      ins_full: (cc) => { if (whatIf(cc)) { cc.say("price_day", { price: FULL_COVERAGE }); cc.expect(lowerPending()); } else take(cc); } }, yes, no,
    ask: (cc) => cc.say("deposit_lower", { price: FULL_COVERAGE, deposit: DEPOSIT_FULL }),
  }, (cc) => cc.say("price_day", { price: FULL_COVERAGE }));
}

/** Drop-off at the airport, with its fee. */
function airportPending(): Pending {
  const no = (cc: Ctx) => { cc.s.retPlace = "here"; if (cc.s.retTold) cc.s.retOk = true; once(cc, "airport", "ret_here"); };
  const yes = offerYes((cc) => { cc.s.retPlace = "airport"; if (cc.s.retTold) cc.s.retOk = true; once(cc, "airport", "ret_airport_ok"); },
    no, (cc) => cc.expect(airportPending()));
  return priceAgain({
    id: "airport", expects: ["airport_yes_ctx", "airport_no_ctx", "ok_ack", "pricey_ctx", "polite_no_ctx"], hints: ["g_yesno"],
    suggest: [{ lt: "Say whether you'll return it at the airport", hint: "g_yesno" }],
    on: { airport_yes_ctx: (cc) => { yes(cc); }, airport_no_ctx: (cc) => { no(cc); }, ok_ack: (cc) => { yes(cc); }, pricey_ctx: (cc) => { no(cc); }, polite_no_ctx: (cc) => { no(cc); } },
    yes, no,
    ask: (cc) => cc.say("ret_airport_q", { price: AIRPORT }),
  }, (cc) => cc.say("price_once", { price: AIRPORT }));
}

/** A later return day costs more days: quote, then change it on a yes. `daily`: more than 7 days on, quoted by the
 *  day (price = the daily rate), since such a total isn't among the voiced values ("Por dos semanas" from Friday). */
function retMorePending(n: number, price: number, daily = false): Pending {
  const day = dayAfter(n);
  const no = (cc: Ctx) => { cc.s.retOk = true; if (retN(cc) > 7) once(cc, "retmore", "ret_long", { num: retN(cc), X: retDay(cc) }); else once(cc, "retmore", "ret_keep", { X: retDay(cc) }); };
  const yes = offerYes((cc) => { setRet(cc, n); if (n > 7) once(cc, "retmore", "ret_long", { num: n, X: dayAfter(n) }); else once(cc, "retmore", "ret_changed_ok", { X: day }); },
    no, (cc) => cc.expect(retMorePending(n, price, daily)));
  return priceAgain({
    id: "ret_more", expects: ["ok_ack", "ret_day_ctx", "ins_no_ctx", "ret_cant_ctx", "pricey_ctx", "polite_no_ctx"], hints: ["g_yesno"],
    suggest: [{ lt: "Accept the later day or keep the old one", hint: "g_yesno" }],
    on: {
      ok_ack: (cc) => { yes(cc); }, ins_no_ctx: (cc) => { no(cc); }, ret_cant_ctx: (cc) => { no(cc); }, pricey_ctx: (cc) => { no(cc); }, polite_no_ctx: (cc) => { no(cc); },
      ret_day_ctx: (cc, sl) => { if (sl.day === day) yes(cc); else if (!sl.day || sl.day === retDay(cc)) no(cc); else changeDay(cc, sl.day); },
    },
    yes, no,
    ask: (cc) => { if (daily) cc.say("ret_more_q_day", { price }); else cc.say(n > 7 ? "ret_more_q_long" : "ret_more_q", { price, X: day, num: n }); },
  }, (cc) => { if (daily) cc.say("price_day", { price }); else cc.say("price_once", { price }); });
}
const setRet = (c: Ctx, n: number) => { c.s.retN = n; c.s.retDay = dayAfter(n); c.s.retOk = true; };

/** "¿Qué día lo va a devolver?" after a no at the return question. */
function retDayPending(): Pending {
  return {
    id: "ret_day", expects: ["ret_day_ctx", "ret_change", "days_ctx"], hints: ["ret"],
    suggest: [{ lt: "Say which day you'll return it", hint: "ret" }],
    on: { days_ctx: (cc, sl, seg) => { const d = durFrom(sl, seg); if (typeof sl.day === "string") changeDay(cc, sl.day); else if (d.n) changeTo(cc, d.n); else retAnswer(cc); } },
    ask: (cc) => cc.say("ret_which"),
  };
}

const retAnswer = (c: Ctx) => {
  const n = retN(c);
  if (n > 7) c.say("ret_answer_long", { num: n, X: retDay(c) });
  else c.say(n === 7 ? "ret_answer_next" : "ret_answer", { X: retDay(c) });
};

/** Another return day by its weekday: the nearest one (or, for "¿Me lo puedo quedar hasta…?", the next one after
 *  the current return day). Pickup is day 0, a Tuesday. */
function changeDay(c: Ctx, day: string, later = false) {
  if (day === "tomorrow") { changeTo(c, 1); return; }
  if (day === "day_after_tomorrow") { changeTo(c, 2); return; }
  if (!ORDER.includes(day)) { retAnswer(c); return; }
  const cur = retN(c);
  const base = daysTo(day);
  const options = [0, 1, 2, 3, 4].map((w) => base + 7 * w).filter((n) => n >= 1 && n <= 30);
  const pick = later ? options.find((n) => n > cur) : [...options].sort((a, b) => Math.abs(a - cur) - Math.abs(b - cur) || a - b)[0];
  changeTo(c, pick ?? cur);
}
/** Another return: earlier is free, later is quoted first. */
function changeTo(c: Ctx, n: number) {
  const cur = retN(c);
  if (n === cur) { c.s.retOk = true; retAnswer(c); return; }
  if (n < cur) { setRet(c, n); if (n > 7) c.say("ret_long", { num: n, X: dayAfter(n) }); else c.say("ret_changed", { X: dayAfter(n) }); return; }
  // more than a week on: "Cada día extra cuesta $750." (rate × 8 or more days isn't a voiced value)
  if (n - cur > 7) { c.expect(retMorePending(n, rate(c), true)); c.say("ret_more_q_day", { price: rate(c) }); return; }
  const price = rate(c) * (n - cur);
  c.expect(retMorePending(n, price));
  c.say(n > 7 ? "ret_more_q_long" : "ret_more_q", { price, X: dayAfter(n), num: n });
}

// Automatic answers the simulation uses when Andrés asks an optional question.
const AUTO: Record<string, string> = {
  resv: "Tengo una reservación", name: "Miller", spell: "eme i ele ele e erre", size: "Un compacto, por favor", days: "Tres días",
  license: "Aquí tiene", upgrade: "No, gracias. El compacto está bien", upgrade_q: "No, gracias", tpl: "Está bien, lo pago",
  insurance: "Solo el seguro obligatorio", deposit: "Está bien, no hay problema", fuel: "Sí, lo devuelvo lleno", prepay: "No, lo devuelvo lleno",
  extras: "No, gracias, uso mi celular", extra_add: "No, gracias", ret: "Sí, es correcto", ret_more: "Sí", airport: "Sí",
  estandar: "Sí, por favor", sign: "Claro", keys: "Gracias", keys_spot: "Gracias", keys_thanks: "Gracias", free_up: "¡Qué bien, gracias!",
  anything: "No, es todo, gracias", howareyou: "Bien, gracias, ¿y usted?",
};
const omit = (keys: string[]) => Object.fromEntries(Object.entries(AUTO).filter(([k]) => !keys.includes(k)));

// ---------------------------------------------------------------------------

export const rental: SituationDef = {
  id: "s71a-rental",
  song: 71,
  songTitle: "Fill It Up",
  title: { en: "Tengo una reservación", lt: "I have a reservation" },
  topic: { en: "Rentar un auto", lt: "Renting a car" },
  chapter: 6,
  order: 3,
  location: "car-rental",
  npc: "jake",
  goal: "Rent a car: sort out the insurance, the deposit on your card, and when to bring it back.",
  intro: "You're at the counter of Renta de Autos Colibrí in Puerto Colibrí. Andrés will need your driver's license and a credit card. In Mexico, liability insurance is mandatory, and the agency puts a hold on your card. Prices are in Mexican pesos.",
  entities: { size: SIZES, extra: EXTRAS, weekday: WEEKDAYS },

  grammar: {
    macros: {
      car: "(carro | auto | coche | vehiculo | automovil | carrito)",
      cars: "(carros | autos | coches | vehiculos)",
      rent: "(rentar | alquilar)",
      res: "(una reservacion | una reserva | reservacion | reserva)",
      license: "(licencia [de manejo | de manejar | de conducir] | carne [de manejar | de conducir] | carnet [de manejar | de conducir] | permiso de (manejar | conducir) | mi licencia)",
      card: "(tarjeta [de credito] | tarjeta de credito | visa | mastercard)",
      tank: "(tanque | deposito)",
      country: "(de estados unidos | americana | estadounidense | gringa | de canada | canadiense | extranjera | de mi pais | inglesa | britanica | del reino unido | australiana | irlandesa | de irlanda | de australia | internacional)",
      back: "(devolver | devolverlo | regresar | regresarlo | entregar | entregarlo | dejar | dejarlo | traer | traerlo)",
    },
    slots: {
      // "un mes": 30 days (a long stay; 30 is the longest rental, and a voiced number)
      dur: { pattern: ["{number} dias", "un dia #n:1", "una semana #n:7", "dos semanas #n:14", "tres semanas #n:21", "un mes #n:30", "[el] fin de semana #weekend", "{number} noches"] },
    },
  },

  intents: {
    have_resv: { patterns: [
      "(tengo | tenemos | hice | hicimos) @res [para un @car] [a nombre de {name}] #h:have_resv",
      "(reservé | reservamos) [un | el | una] (@car | camioneta) [por internet | en linea | en su pagina | en la pagina | en la app] #h:booked",
      "(reservé | reservamos | hice la reservacion | hice la reserva | hicimos la reservacion) (por internet | en linea | en su pagina [web] | en la pagina | en la aplicacion | en la app | con expedia | con una agencia | con booking | por telefono | con kayak)",
      "(vengo | venimos) a (recoger | buscar) (mi | el | un | nuestro) @car [que reservé | que reservamos] #h:pick_up",
      "(vengo | venimos) por (mi | el | nuestro) @car [que reservé | que reservamos]", "(vengo | venimos) por (mi | la) (reservacion | reserva)",
      "(quiero | quisiera) recoger (mi | el) @car [que reservé]",
      "(tengo | tenemos) (un | el) @car (reservado | rentado)",
      "(tengo | traigo) (el | mi) (numero | codigo) de (confirmacion | reservacion | reserva)", "aqui (tiene | esta) (mi | la) (confirmacion | reservacion)",
      "(reservé | reservamos | hice la reservacion | hice una reservacion) hace (una semana | unos dias | un mes | dos semanas | dos dias | tiempo | mucho)",
      "(quiero | vengo a) recoger mi (reservacion | reserva)",
      "[la] (reservacion | reserva) (esta | es) a nombre de {name}",
      "(mi | nuestra | nuestro) (esposa | esposo | pareja | empresa | agencia | amigo | amiga | jefe | hijo | hija) (hizo | tiene) la (reservacion | reserva)",
      "(tengo | tenemos) @res pero no (se | tengo | traigo) el numero",
    ] },
    rent_walkin: { patterns: [
      "(quiero | quisiera | me gustaria | necesito | queremos | necesitamos) @rent [un | una] (@car | camioneta) [por {dur} | para {dur}] #h:rent",
      "(quiero | quisiera | me gustaria | queremos) @rent uno",
      "(quiero | quisiera | necesito | necesitamos | busco | buscamos) un @car [por {dur} | para {dur}]",
      "(tiene | tienen | hay) (@cars | algun @car | un @car) (disponibles | disponible | libres | libre) [para hoy] #h:rent_have",
      "tienes @cars disponibles #tip:tu_staff",
      "(tiene | tienen | hay) @cars [para rentar | para alquilar]", "(tiene | tienen | hay) algo [disponible | para rentar | para hoy]",
      "no (reservé | reservamos) nada",
      "(se puede | puedo) @rent un @car [aqui]",
      "no (tengo | tenemos) [una | ninguna] (reservacion | reserva) #h:no_resv",
      "no (reservé | reservamos | hice [una | ninguna] (reservacion | reserva) | hicimos [una | ninguna] (reservacion | reserva))",
      "sin (reservacion | reserva)",
      "pero (quiero | quisiera | necesito | me gustaria) (@rent uno | @rent un @car | un @car)",
    ] },
    hours_q: { patterns: ["a que hora (cierran | abren | cierra | abre)", "(cual es | que) (su)? horario", "(estan | abren) (abiertos)? (los domingos | todos los dias | en la noche)"] },
    contract_q: { patterns: ["que (estoy firmando | firmo | es esto | dice aqui | es este papel)", "que dice el contrato"] },
    upgrade_q: { patterns: ["(es | el intermedio es) (mas grande | mas espacioso | mejor | mas comodo)", "(cabe | caben) mas (maletas | cosas)", "que (tiene | es) el intermedio", "como es el intermedio"] },
    // "Sí, tengo una." to "¿Tiene reservación?"
    resv_yes_ctx: { patterns: ["(tengo | tenemos) (una | uno) [en linea | por internet]", "a nombre de {name}"] },
    // "No, no tenemos." to "¿Tiene reservación?"
    resv_no_ctx: { patterns: ["no (tenemos | tengo) ninguna", "no tenemos"] },
    name_ctx: { patterns: [
      "[es | mi apellido es | el apellido es | a nombre de | esta a nombre de | (debe | puede) estar a nombre de] {name} #h:name_its",
      "(me llamo | mi nombre es | soy) {name}", "{name} {letters}",
      "(puede | podria | debe) estar (a mi nombre | con mi nombre) [de pila] [{name}]", "(busque | busquela) (a nombre de | con) {name}",
    ] },
    letters_ctx: { patterns: ["[se escribe | es] {letters} #h:spell", "{name} {letters}", "{letters} {name}"] },
    here_docs: { patterns: [
      "aqui (tiene | esta | estan) mi @license [y [mi | la] (@card | pasaporte)] [y [mi | la] (@card | pasaporte)] #h:here_license",
      "(aqui (tiene | esta | estan) | tome | tenga | le doy) (mi | la | el) (@card | pasaporte) [y [mi | la] (@license | @card | pasaporte)] [y [mi | la] (@license | @card | pasaporte)]",
      "(tome | tenga | le doy) (mi | la) @license [y [mi | la] (@card | pasaporte)] [y [mi | la] (@card | pasaporte)]",
      "(este | esta) es mi (@license | pasaporte | @card)",
      "(aqui (tiene | estan) | tome | le doy) (mis | los) documentos",
      "(pago | voy a pagar | voy a usar) (con)? (esta | mi) @card", "con (esta | mi) @card",
    ] },
    // bare "Aquí tiene", "Tome": only where Andrés is waiting for something (the documents, the signed contract)
    hand_ctx: { patterns: ["aqui tiene #h:here_you_go", "aqui (esta | estan)", "tome", "tenga", "aqui (lo | la | los | las) tiene"] },
    license_q: { patterns: [
      "(sirve | le sirve | esta bien | es valida | vale) mi @license [@country] [aqui | en mexico] #h:q_license",
      "(sirve | vale | es valida) (una | mi) @license @country [aqui | en mexico]",
      "(puedo | se puede) (manejar | @rent [un @car]) con (mi | una) @license [@country]",
      "(necesito | ocupo | hace falta) (un permiso internacional | una licencia internacional | [un] permiso internacional de (manejar | conducir))",
      "tengo (una | mi) @license @country", "tengo (un permiso | una licencia) internacional", "mi @license es @country",
      "no (tengo | traigo) (licencia | una licencia) (mexicana | de aqui | de mexico)", "(necesito | ocupo) (una)? licencia mexicana",
    ] },
    passport_q: { patterns: ["(necesita | necesitan | ocupa | quiere) [ver] mi pasaporte", "(tambien)? (le doy | necesita) el pasaporte", "(necesito | hay que) (dar | mostrar | ensenar) [mi | el] pasaporte"] },
    // Side questions at the counter (audit, 5 Nov 2026): dollars, a second driver, air conditioning
    usd_q: { patterns: [
      "(aceptan | acepta | toman | reciben) dolares", "(puedo | podemos | se puede) pagar (en | con) dolares", "(pago | le pago | voy a pagar) en dolares",
      "cuanto (es | cuesta | sale | seria) en dolares", "(tiene | tienen) (el precio | precios) en dolares",
    ] },
    driver_q: { patterns: [
      "(puedo | podemos | se puede) (agregar | poner | registrar | anadir) (otro | un | a otro | un segundo) conductor [adicional]",
      "(mi esposa | mi esposo | mi pareja | mi novia | mi novio | mi amigo | mi amiga | mi hijo | mi hija | otra persona | alguien mas) [tambien] (puede | podria) manejar [tambien]",
      "(puede | podria) manejar [tambien] (mi esposa | mi esposo | mi pareja | mi novia | mi novio | mi amigo | mi amiga | mi hijo | mi hija | otra persona | alguien mas) [tambien]",
      "(podemos | vamos a) manejar (los dos | las dos | ambos)", "(hay | tiene) (costo | cargo) (por | el) (conductor adicional | otro conductor)",
      "cuanto (cuesta | es | cobran) [por] (el | un) (conductor adicional | otro conductor)", "[un | el] conductor adicional",
    ] },
    ac_q: { patterns: [
      "(tiene | tienen | trae | traen) (aire acondicionado | aire | clima)", "(el @car | los @cars | todos) (tiene | tienen | trae | traen) (aire acondicionado | aire | clima)",
      "hay (aire acondicionado | aire)",
    ] },
    debit_q: { patterns: [
      "(aceptan | acepta | puedo usar | puedo pagar con | se puede con) [una | mi] tarjeta de debito #h:q_debit",
      "solo (tengo | traigo) [tarjeta de] debito", "no (tengo | traigo) tarjeta de credito [solo (de debito | debito | efectivo)]", "solo (tengo | traigo) efectivo",
      "(puedo | se puede) dejar (la garantia | el deposito) en efectivo", "(aceptan | puedo pagar en) efectivo",
      "(puedo pagar | se puede pagar | aceptan | acepta) con (debito | tarjeta de debito | efectivo)",
      "(puedo | se puede) (pagar | dejar) (la garantia | el deposito) (en efectivo | con debito | con tarjeta de debito | con mi tarjeta de debito)",
    ] },
    size_ctx: { patterns: [
      "[un | una | el | la] {size} #h:size_short", "(ok | bueno | va | entonces | perfecto) [un | una | el | la] {size} [por favor]",
      "(quisiera | quiero | necesito | me gustaria | me da | deme | prefiero | busco | mejor) [un | una] {size} #h:size_want",
      "[un | una] {size} (esta bien | me sirve | estaria bien)",
      "[un | una] {size} [porque | ya que] somos {number} [personas]", "[un | una] {size} para ({number} personas | mi familia)",
      "somos {number} [personas] [necesito | quiero] [un | una] {size}",
      "no (quiero | necesito) [un | una | el | la] {nosz:size} [sino | mejor] [un | una] {size}",
    ] },
    // "Somos cuatro" / "Un carro para cinco personas": a recommendation (only at the car choice)
    party_ctx: { patterns: ["somos {number} [personas]", "(un @car | algo | uno) para {number} personas", "(vamos | viajamos) {number} [personas]"] },
    recommend_q: { patterns: ["que me (recomienda | aconseja | sugiere)", "que (recomienda | sugiere)", "(cual | que) es mejor", "usted que (recomienda | haria)",
      "(vale | valdra | valdria) la pena", "(que | cual) me conviene [mas]", "me conviene"] },
    sizes_q: { patterns: ["que (@cars | opciones | tipos de carro | tipos de auto | tamanos) (tiene | tienen | hay)", "que (tiene | tienen | hay) [disponible]", "cuales son las opciones", "que (@cars | opciones) (tiene | hay) disponibles"] },
    days_ctx: { patterns: [
      "[por | para | durante] {dur} #h:days", "(hasta | al) {day}", "[lo | la] necesito (por | para) {dur}", "[lo | la] necesito hasta [el] {day}",
      "(solo | nomas) [por] {dur}", "(de hoy | desde hoy) hasta [el] {day}", "[por] {number}", "[por] {dur} (mas o menos | mas que menos | aproximadamente)", "(como | unos | mas o menos) {dur}",
    ] },
    ins_full: { patterns: [
      "(quiero | quisiera | prefiero | me da | deme | necesito) [la] (cobertura | proteccion) (amplia | completa | total) #h:ins_full",
      "[la] (cobertura | proteccion) (amplia | completa | total) [esta bien]",
      "(quiero | prefiero | quisiera) [el] seguro (completo | total | amplio | con todo)",
      "(agregueme | agregue | agregue la | agrega #tip:tu_staff | agregame #tip:tu_staff | pongame | ponme) [la] (cobertura | proteccion) (amplia | completa | total)",
      "(quiero | prefiero) estar (cubierto | cubierta | protegido | protegida) [completamente | al cien]",
    ] },
    // "Sí, la quiero" / "La tomo": only as an answer to the full-coverage offer
    ins_yes_ctx: { patterns: ["[si] (la | lo) (quiero | tomo | agrego)", "[si] agreguela", "mejor si [por si acaso]", "[si] por si acaso"] },
    ins_basic: { patterns: [
      "(solo | nomas | solamente) [con] (el | lo) (basico | obligatorio | seguro obligatorio | seguro basico | minimo) #h:ins_basic", "(solo | nomas) lo (que es)? obligatorio", "[la] basica [esta bien | por favor]",
      "[con] el [seguro] (basico | obligatorio) (esta bien | es suficiente | basta)",
      "(prefiero | quiero) [solo] el [seguro] (basico | obligatorio)",
      "no (necesito | quiero) (la cobertura amplia | la cobertura completa | mas seguro | seguro extra | otro seguro | cobertura extra | la proteccion | mas cobertura | el seguro completo | el seguro total)",
      "sin (cobertura amplia | la cobertura amplia | seguro extra | cobertura extra)", "no me interesa (la cobertura amplia | la cobertura completa | el seguro completo)",
      "(la cobertura amplia | el seguro completo) (es | esta) (muy | demasiado) (caro | cara)",
      "con el obligatorio [es suficiente | esta bien]",
    ] },
    // "No, no la necesito" / "Es muy caro": only as an answer to the full-coverage offer
    ins_no_ctx: { patterns: ["no (la | lo) (necesito | quiero)", "prefiero no [gracias]", "es mucho [dinero]", "(es | esta) (muy | demasiado) caro", "(la cobertura amplia | la cobertura completa | la completa | el seguro completo) no"] },
    ins_own: { patterns: [
      "(mi tarjeta | mi tarjeta de credito) (me cubre | cubre [los danos | el seguro | eso | la renta | los carros rentados] | incluye [el] seguro | tiene seguro) #h:ins_card",
      "(tengo | ya tengo) (seguro | mi propio seguro | seguro de viaje) [con mi tarjeta | por mi tarjeta]",
      "estoy (cubierto | cubierta) (por | con) mi (tarjeta | seguro)", "mi seguro de viaje (me cubre | cubre)",
      "(mi tarjeta | mi tarjeta de credito) tiene seguro (para (carros | autos) rentados | de renta de autos | de auto)",
      "(mi tarjeta | mi tarjeta de credito) [ya] (lo | la) cubre", "(mi tarjeta | mi tarjeta de credito) [ya] incluye (ese | el) seguro",
    ] },
    ins_what: { patterns: [
      "que cubre [la cobertura amplia | el seguro | la proteccion] #h:q_cover", "que incluye (la cobertura [amplia] | el seguro)",
      "que es (la cobertura [amplia | completa | total] | la proteccion (amplia | completa | total) | el seguro (completo | total | amplio))",
      "(esta | va) incluido el seguro #h:q_ins_included", "el seguro (esta | va) incluido", "(incluye | trae) [el] seguro",
      "cuanto (cuesta | es) (la cobertura [amplia | completa] | el seguro [completo])",
      "(hay | tiene) deducible", "cuanto es el deducible", "cubre (robo | el robo | los danos | danos | choques | accidentes | las llantas | los vidrios)",
      "que pasa si (choco | tengo un accidente | le pego al @car | rayo el @car | hay un accidente | me roban el @car)",
      "(es | necesito | es necesaria | es obligatoria) (la cobertura [amplia] | el seguro completo)", "cual es la diferencia",
      "(la cobertura [amplia] | el seguro completo) (es | sale) (caro | cara)", "(es | sale) (caro | cara) (la cobertura [amplia] | el seguro completo)",
    ] },
    tpl_q: { patterns: [
      "[y] (es | por que es) obligatorio [por ley | en mexico] #h:tpl_must", "no es opcional",
      "(por que | porque) no (estaba | venia | esta) incluido [en el precio | en la reservacion] #h:tpl_why",
      "(que es | que cubre) (ese seguro | el seguro obligatorio | la responsabilidad civil)",
      "(lo | la) (tengo que | debo) pagar", "(tengo que | hay que) pagar(lo)?", "(tengo que | hay que) pagarlo", "[y] que pasa si no lo (quiero | pago | tomo)", "y si no lo (quiero | pago | tomo)",
    ] },
    tpl_refuse_ctx: { patterns: [
      "no (quiero | voy a) pagar (eso | ese seguro | el seguro | mas | extra | nada mas)", "no quiero pagarlo", "no lo (voy a | quiero) pagar", "no lo pago", "no quiero (el | ese) seguro", "no estoy de acuerdo",
      "(en internet | en la pagina | en la reservacion) (decia | dice | estaba) que [todo] (estaba | esta) incluido",
      "[pero] ya (pagué | lo pagué | estaba pagado | esta pagado | pagué en linea | pagué por internet)", "[pero] ya (pagué | habia pagado) (el seguro | todo | eso) [en linea | por internet]",
      "no me (dijeron | avisaron) [eso | nada]", "(es | esta) (muy | demasiado) caro", "[eso] no (es | me parece) justo",
      "[eso] no estaba en (el precio | la reservacion)", "no (sabia | lo sabia | sabia eso)", "[yo] ya pagué todo", "[pero] ya (pagué | estaba pagado) todo",
      // "Pagué todo" is paying twice, not "Lo pago" (the engine reads pagué and pagado as forms of pago)
      "[pero] [yo] [lo] pagué todo [en linea | por internet]", "[pero] [yo] (lo | la) pagué (en linea | por internet)", "[pero] pagué (en linea | por internet)",
      "[pero] [ya] pagamos todo [en linea | por internet]", "[pero] (todo | eso | el seguro) [ya] (esta | estaba) pagado",
      "no (lo | la)? acepto",
    ] },
    // "¿Mi tarjeta no lo cubre?": a question about the card at the twist (only there: "Mi tarjeta no me cubre" at the
    // insurance step is no card coverage)
    tpl_card_ctx: { patterns: ["[y] (mi tarjeta | mi tarjeta de credito) no (lo | la | me) cubre", "no (lo | la) cubre mi tarjeta [de credito]"] },
    tpl_leave_ctx: { patterns: [
      "entonces no (voy a rentar | lo voy a rentar | lo rento | lo quiero | quiero) [el @car]",
      "[mejor] (voy a buscar | busco) otra (agencia | renta | compania)", "[mejor] (cancelo | cancelar | cancelamos | quiero cancelar | prefiero cancelar) [la reservacion]",
      "[entonces | mejor] (cancele | cancelela | cancelemela | cancela #tip:tu_staff | cancelala #tip:tu_staff) [la reservacion | la reserva]",
    ] },
    // "¿Puedo cancelar?" / "¿Y si cancelo?": a question about cancelling (only at the twist), never the decision
    cancel_q_ctx: { patterns: [
      "(puedo | podemos | podria | se puede) cancelar [la reservacion | la reserva]", "(y si | que pasa si | y que pasa si | pero y si) (cancelo | cancelamos) [la reservacion | la reserva]",
      "si (cancelo | cancelamos) que pasa",
    ] },
    // "¿Veinte mil pesos?" (echoing the amount) and "Es mucho" (only at the deposit)
    deposit_echo_ctx: { patterns: ["[son] {price}"] },
    deposit_much_ctx: { patterns: ["(es | son) (mucho | mucho dinero | demasiado [dinero])", "(es | esta) (muy | demasiado) (alto | alta | caro)", "no tengo (tanto | para eso) [en la tarjeta]", "no me alcanza [la tarjeta | el credito | para eso]"] },
    deposit_q: { patterns: [
      "(hay | dejan | piden | necesito dejar | tengo que dejar | hay que dejar) (un deposito | una garantia | deposito | garantia) #h:q_deposit",
      "cuanto es (el deposito | la garantia | la retencion)",
      "cuando (me lo devuelven | me la devuelven | se libera | lo liberan | la liberan | me regresan el dinero | recupero el dinero | me devuelven el deposito) #h:q_deposit_back",
      "es (un cargo | una retencion | un bloqueo) [o (un cargo | una retencion | un bloqueo)]",
      "(me van a | van a) cobrar [eso | el deposito | la garantia | algo]", "(me lo | lo) cobran", "(me | lo) (cobran | cobra) algo",
      "por que (tanto | tan alto | es tan alto | necesitan un deposito | hay deposito)", "para que es (el deposito | la garantia)",
      "cuanto [tiempo] tarda (en liberarse | en regresar | en devolverse)",
    ] },
    fuel_q: { patterns: [
      "[lo] (tengo que | hay que | debo) (devolver | regresar | entregar) (lleno | con el @tank lleno) #h:q_fuel",
      "(tengo que | hay que | debo) (devolverlo | regresarlo | entregarlo | llenarlo) [lleno | con el @tank lleno]",
      "(viene | esta | me lo dan | lo entregan) con el @tank lleno", "(viene | esta | lo entregan) lleno", "el @tank (esta | viene) lleno", "cual es la politica de (gasolina | combustible)",
      "(hay | donde hay | donde esta) (una | la) gasolinera [cerca | por aqui | mas cercana] #h:q_gas_station",
      "donde (puedo | hay que) (cargar | poner | echar) gasolina", "hay gasolineras cerca",
      // "¿Y si no lo lleno?": a question (the charge), not an answer
      "(y si | que pasa si | y que pasa si) no lo (lleno | devuelvo lleno | regreso lleno | entrego lleno) #ifnot",
    ] },
    fuel_full: { patterns: [
      "[si] (lo | se lo) (devuelvo | regreso | entrego | traigo) (lleno | con el @tank lleno) #h:full_to_full",
      "lleno y lleno", "[si] (yo | yo lo) lleno [antes]", "lo lleno yo", "lo lleno antes de (devolverlo | entregarlo | regresarlo)", "[si] con el @tank lleno",
      "no (quiero | voy a) pagar [el tanque] (por adelantado | antes | ahora)", "no (quiero | voy a) pagar el tanque", "no quiero pagarlo (ahora | por adelantado | antes)", "lo devuelvo como me lo (dan | entregan)",
      "(prefiero | voy a) (devolverlo | regresarlo | entregarlo) lleno",
    ] },
    prepay_yes: { patterns: [
      "(prefiero | quiero | quisiera) pagar (el @tank | la gasolina) (por adelantado | de una vez | antes) #h:prepay",
      "(prefiero | quiero) (prepagar | pagar por adelantado) [la gasolina | el @tank]", "(prefiero | quiero) pagarlo (ahora | por adelantado | de una vez)",
      "[si] (pago | prefiero pagar) (el @tank | la gasolina) [por adelantado]", "[si] lo pago por adelantado",
    ] },
    // "No lo voy a llenar": a no to "¿Lo devuelve con el tanque lleno?" (only at that question)
    fuel_no_ctx: { patterns: ["no lo (devuelvo | voy a devolver | regreso | entrego | traigo) lleno", "no lo voy a llenar", "no (voy a tener | tengo) tiempo de llenarlo"] },
    fuel_price_q: { patterns: ["cuanto (cuesta | esta | sale) (la gasolina | el litro [de gasolina] | llenarlo | el tanque)"] },
    fuel_type_q: { patterns: ["que gasolina (usa | lleva | le pongo | necesita)", "(usa | lleva) (magna | premium | diesel | regular)", "que tipo de gasolina [usa | lleva]"] },
    mileage_q: { patterns: [
      "(hay | tiene) [un] limite de (kilometros | kilometraje | millas) #h:q_mileage", "(el kilometraje | los kilometros) (es | son) (libre | libres | ilimitado | ilimitados)",
      "(es | tiene) kilometraje (libre | ilimitado)", "cuantos kilometros puedo manejar", "puedo manejar (todo lo que quiera | sin limite)",
    ] },
    auto_q: { patterns: [
      "[el @car] es (automatico | estandar | manual | de velocidades) #h:q_automatic", "(tiene | tienen | hay) algo automatico", "es (automatico | estandar | manual) o (automatico | estandar | manual)",
      "(tiene | tienen | hay) (automatico | automaticos | @cars automaticos | uno automatico)",
      "(quiero | prefiero | necesito) (uno | un @car) automatico", "no (se | puedo) manejar (estandar | manual | de velocidades)",
      "(es | tiene) (transmision | caja) automatica",
    ] },
    extras_yes: { patterns: [
      "(quisiera | quiero | necesito | me da | deme | me puede dar | puedo tener) [un | una] {extra} #h:extra_want",
      "[un | una | el | la] {extra}", "(tienen | tiene | hay) {extra}", "(los dos | las dos | ambos | ambas) #both", "{extra} y {extra} #both",
      "cuanto (cuesta | es) {extra}",
      // "No necesito el GPS, pero sí la silla": the second one is the answer
      "no (necesito | quiero) [el | la | un | una] {nox:extra} [pero] [si | solo] [el | la | un | una] {extra} [si]", "[el | la] {nox:extra} no [pero] [el | la] {extra} [si]",
      "sin {nox:extra} [pero] con [el | la] {extra}",
      "(tengo | traigo | viajo con) (un nino | una nina | un bebe | un hijo | una hija | ninos) [asi que] [necesito] [una] {extra}",
      "(tengo | traigo | viajo con | vamos con) (un nino | una nina | un bebe | un hijo | una hija | ninos | mis hijos | mi hijo | mi hija) [pequeno | pequena | chiquito | chiquita] #kid",
    ] },
    extras_no: { patterns: [
      "[no] (uso | voy a usar | tengo) (mi celular | el celular | google maps | waze | mi telefono | maps) [en el celular] #h:extra_phone",
      "no (necesito | quiero) [un | una | el | la] {extra}", "no (necesito | quiero) nada [mas | de eso | extra]", "sin {extra}",
      "no necesito extras", "(tengo | traigo) (mi propio | mi propia) {extra}",
      "no (necesito | quiero) [ni] [el | la | un | una] {extra} ni [el | la | un | una] {extra}", "ni [el] {extra} ni [la] {extra}", "no (quiero | necesito) (los dos | ninguno | ninguna | ninguno de los dos)",
      "no (tengo | traigo | viajo con) (ninos | hijos | bebe | un bebe)", "no (lo | la | los) (agregue | ponga)",
    ] },
    extras_none_ctx: { patterns: ["[no] nada [gracias]", "ninguno [de los dos]", "ninguna de las dos"] },
    // "El viernes no puedo": the return day must change (only at the return question)
    ret_cant_ctx: { patterns: [
      "[el] {day} no puedo", "no puedo el {day}", "no puedo ese dia", "[el] {day} no",
      "no (puedo | lo puedo | voy a poder | lo voy a poder) @back [el {day} | ese dia]",
    ] },
    ret_day_ctx: { patterns: [
      "[mejor] [el] {day} [mejor]", "(lo | se lo) (devuelvo | entrego | regreso) [el] {day}", "(cambielo | cambiemelo | pongalo) (al | para el) {day}", "[mejor] hasta el {day}",
      "no el {nod:day} [sino] el {day}", "el {nod:day} no [sino] el {day}",
    ] },
    ret_change: { patterns: [
      "[lo | me lo] (puedo | podria) @back en el aeropuerto #airport #h:q_airport", "(se puede | es posible) @back en el aeropuerto #airport",
      "(quiero | quisiera) @back en el aeropuerto #airport",
      "(puedo | podria) (tenerlo | quedarme con el | quedarmelo | usarlo) un dia mas #extra_day", "[me lo] (puedo | podria) quedar un dia mas #extra_day",
      "(puedo | podria) @back un dia despues #extra_day", "(puedo | podria) quedarme [con el @car | con el] un dia mas #extra_day",
      "[me lo] (puedo | podria) quedar hasta el {day} #h:keep_until", "(puedo | podria) (quedarmelo | tenerlo | quedarme con el) hasta el {day} #h:keep_until",
      "(puedo | podria) @back el {day}", "(quiero | quisiera | necesito | tengo que) @back el {day}", "lo (necesito | quiero) hasta el {day}", "(necesito | quiero) el @car hasta el {day}",
      "[lo | me lo] (puedo | podria) @back en (otra ciudad | otra oficina | otro lugar | cancun | playa del carmen | tulum | merida) #other",
      "(y | o) en (otra ciudad | otra oficina | cancun | playa del carmen | tulum | merida) #other", "(y | o) en el aeropuerto #airport",
      "[lo | me lo] (puedo | podria) @back (antes | mas temprano | antes de tiempo) #early", "(se puede | es posible) @back (antes | mas temprano | antes de tiempo) #early",
    ] },
    ret_q: { patterns: [
      "(cuando | que dia | a que hora) [lo] (tengo que | debo | hay que) (devolver | entregar | regresar) [el @car] #h:q_return",
      "(cuando | a que hora) (lo devuelvo | lo entrego | lo regreso)", "[a que hora] (tengo que | debo) (devolverlo | entregarlo | regresarlo)",
      "que pasa si (llego tarde | me retraso | lo devuelvo tarde | lo entrego tarde) #h:q_late", "(hay | tienen) (tolerancia | tiempo de tolerancia | periodo de gracia)",
      "donde (lo devuelvo | lo entrego | lo dejo | se devuelve)", "(donde | a donde) (tengo que | debo | hay que) (devolverlo | entregarlo | regresarlo | traerlo)",
      // "¿Y si llego a las seis?" / "¿Lo puedo devolver en la noche?": after five, the grace hour and the extra day
      "(y si | que pasa si | y que pasa si) (llego | lo devuelvo | lo entrego | lo traigo | lo regreso) (mas tarde | despues de las cinco | en la noche | a las (seis | siete | ocho | nueve)) #late",
      "(puedo | podria | se puede) (devolverlo | entregarlo | regresarlo | traerlo) (mas tarde | despues de las cinco | en la noche | a las (seis | siete | ocho | nueve)) #late",
    ] },
    airport_yes_ctx: { patterns: ["[si] en el aeropuerto", "[si] alla"] },
    airport_no_ctx: { patterns: ["[mejor] aqui [en la oficina]", "[mejor] lo devuelvo aqui", "en el aeropuerto no"] },
    // "No, gracias, así está bien": a polite no to the offer on the table
    polite_no_ctx: { patterns: [
      "[no] gracias (asi | con eso) (esta bien | estoy bien)", "(asi | con eso) (estoy bien | esta bien) [gracias]", "[no] estoy bien asi [gracias]", "no me interesa", "prefiero no", "[no] mejor no", "no quiero pagar (mas | extra)",
      "[no] [gracias] (esta | estoy) bien asi [gracias]", "[no] [gracias] (dejelo | dejemoslo | dejalo #tip:tu_staff) (asi | como esta) [gracias]", "[no] asi (dejelo | lo dejamos | dejemoslo) [gracias]",
    ] },
    // "Es caro" / "No, gracias, es mucho": a no to a price just quoted (only where one is on the table)
    pricey_ctx: { patterns: ["[no] [gracias] (es | esta | sale) [muy | un poco | algo | demasiado] (caro | cara)", "[no] [gracias] (es | son) (mucho | demasiado) [dinero]", "[no] [gracias] no me alcanza", "[no] [gracias] es mucho para mi"] },
    // "Sé manejar estándar": keeping the manual (only at that question)
    manual_ok_ctx: { patterns: ["[no] [gracias] [asi esta bien] (se | puedo) manejar (estandar | manual | de velocidades) [sin problema]", "[no] [gracias] (el | un) (estandar | manual | economico) (esta bien | me sirve) [gracias]", "[no] no me importa [que sea (estandar | manual)]"] },
    where_car_ctx: { patterns: ["donde [exactamente | esta]", "en donde"] },
    sign_where_ctx: { patterns: ["(aqui | aca) [abajo]", "donde [exactamente]", "en donde"] },
    sign_q: { patterns: [
      "donde (firmo | firma) #h:q_sign", "(donde | en donde) (tengo que | debo | hay que) firmar", "donde (pongo | van) (mis iniciales | mi firma | las iniciales)",
      "firmo aqui", "(tengo que | debo) firmar aqui", "aqui (firmo | pongo mis iniciales)",
    ] },
    where_car: { patterns: [
      "donde esta (el | mi) @car #h:q_where_car", "cual es (mi | el) @car", "(donde | en donde) (lo | la) (encuentro | recojo)",
      "donde esta (estacionado | el estacionamiento)", "(de que | que) color es", "(es | cual es) (el | la) (rojo | roja | azul | blanco | blanca | negro | negra | gris | plateado)", "que @car es", "(en que | cual) lugar", "esta lejos",
    ] },
    scratch_q: { patterns: [
      "[y] que (hago si | pasa si) (veo | hay | encuentro) un (rayon | golpe | dano) #h:q_scratch", "y si (veo | hay | encuentro) (un rayon | un golpe | un dano | rayones | golpes | danos)", "que (hago si | pasa si) (veo | hay | encuentro) (rayones | golpes | danos)",
      "(hay | tiene) (un rayon | un golpe | rayones | golpes) [en la puerta | en la defensa | en el @car | atras | adelante]",
      "(tengo que | debo) revisar el @car", "[le | lo] (tomo | tengo que tomar) fotos", "(le | lo) tomo una foto", "(puedo | podemos) (ver | revisar) el @car [primero | antes]", "(el @car | la puerta | la defensa) (tiene | esta) (un rayon | un golpe | rayado | rayada | golpeado | golpeada)",
    ] },
    price_q: { patterns: [
      "cuanto (cuesta | es | sale | cobran) [al dia | por dia | diario]", "cuanto (cuesta | es | sale) [un | una | el | la] {size} [al dia | por dia]",
      "cuanto (cuesta | sale | es) (rentar | alquilar) un @car [al dia | por dia]", "cuanto (mas | extra) (es | cuesta | seria)", "cual es la tarifa [diaria | por dia]", "cuanto (es | cuesta) (el intermedio | el cambio | la diferencia)",
      // "¿Cuánto es en total?": the daily cost with what was added, at any step (never the deposit or the coverage alone)
      "cuanto (es | seria | sale | cuesta | me cuesta | me sale | queda | me queda | va a ser) en total #total", "cuanto (es | seria | sale | cuesta) todo #total",
      "(cual | cuanto) es el total #total", "cuanto (le debo | le pago | voy a pagar | tengo que pagar | pagaria) [en total] #total",
      "cuanto (cuesta | es | sale) (el mas grande | uno mas grande | el grande | el mediano)",
    ] },
    more_no: { patterns: [
      "(eso | esto) (es | seria) todo", "(es | seria) todo [por ahora]", "nada mas [gracias]", "no necesito nada mas", "(asi | ya) estoy bien", "no necesito nada",
      "(con eso | ya con eso) [es todo | estoy bien]", "por ahora (es todo | nada mas)", "ya (es | seria) todo",
    ] },
    keep_size: { patterns: [
      "(el | un) {size} (esta bien | me sirve | es suficiente | basta) #h:keep_size", "me quedo con el {size}", "(prefiero | quiero) [quedarme con] el {size}",
      "no (necesito | quiero) (uno mas grande | un @car mas grande | algo mas grande | el cambio | cambiarme | otro)", "no (necesito | quiero) el {nosz:size}",
      "estoy bien con el {size}", "(me quedo con | prefiero) el que (reservé | tengo | me toca)", "el que reservé (esta bien | me sirve)",
      "mejor (el | un) {size}", "[no] [gracias] con el {size} (esta bien | estoy bien) [gracias]",
    ] },
    upgrade_yes: { patterns: [
      "[si] (cambieme | cambiemelo | cambiame #tip:tu_staff | me cambio | me paso) (al | a un) (intermedio | mediano) #h:upgrade_yes",
      "[si] (me cambio | cambiemelo | cambieme)", "[si] (quiero | prefiero | tomo | deme | me da | me quedo con) (el | un) (intermedio | mediano)",
      "[si] (quiero | prefiero | necesito) (uno | un @car | algo) mas grande", "(tiene | tienen | hay) (algo | uno | un @car) mas grande", "[si] (uno | algo) mas grande", "[el | un] (intermedio | mediano) [esta bien | me parece bien]",
    ] },
    yes_right: { patterns: ["[si] (es | esta) correcto #h:yes_right", "[si] asi es", "[si] (esta | me parece) bien el (viernes | dia)", "[si] a las cinco [esta bien]"] },
    ok_ack: { patterns: [
      "(ok | okay | vale | perfecto | de acuerdo | sale | va | entendido | claro | listo | muy bien) [no hay problema | sin problema | gracias] #h:ok_ack",
      "esta bien (no hay problema | sin problema) #h:ok_ack",
      "(no hay | sin) problema", "(listo | ya) (ya firmé | firmado | esta)", "ya firmé",
      "(esta bien | ok | de acuerdo | vale) lo pago #h:tpl_ok", "[ok] (lo pago | lo acepto | acepto)", "(ni modo | ya que | bueno pues | que le vamos a hacer)",
      "[ok | esta bien] (agreguelo | agreguemelo | pongalo | agreguela | pongamelo)",
      "voy a (tomar | tomarle) (fotos | una foto)", "[ok] (reviso | voy a revisar | ya revisé) el @car", "(por que no | claro que si)", "[ya] (esta)? firmado",
    ] },
  },

  lines: {
    // --- greeting and reservation
    greet: [
      t("¡Buenos días! | ¡{m:Bienvenido|f:Bienvenida} | a | Renta de Autos Colibrí! | ¿Viene | a | recoger | su | carro?",
        "Good morning! | Welcome | to | Hummingbird Car Rental! | Are you here | to | pick up | your | car?",
        "Good morning! Welcome to Renta de Autos Colibrí! Are you here to pick up your car?",
        { flags: { 8: "Mexican: carro = car; auto is the neutral word." },
          neutral: t("¡Buenos días! | ¡{m:Bienvenido|f:Bienvenida} | a | Renta de Autos Colibrí! | ¿Viene | a | recoger | su | auto?",
            "Good morning! | Welcome | to | Hummingbird Car Rental! | Are you here | to | pick up | your | car?",
            "Good morning! Welcome to Renta de Autos Colibrí! Are you here to pick up your car?") }),
      t("¡Siguiente, | por favor! | ¿Tiene | reservación | con | nosotros?", "Next, | please! | Do you have | a reservation | with | us?", "Next, please! Do you have a reservation with us?"),
      t("¡Buenos días! | ¿En | qué | le | puedo | ayudar?", "Good morning! | In | what | (to) you | can I | help?", "Good morning! How can I help you?"),
    ],
    greet_hay: [t("¡Buenos días! | ¿Cómo | está?", "Good morning! | How | are you?", "Good morning! How are you?")],
    ask_resv: [
      t("¿Tiene | reservación?", "Do you have | a reservation?", "Do you have a reservation?"),
      // not "Muy bien.": it follows "Muy bien, gracias por preguntar." after the learner's "¿Y usted?"
      t("Y | dígame, | ¿tiene | reservación | con | nosotros?", "And | tell me, | do you have | a reservation | with | us?", "So tell me, do you have a reservation with us?"),
    ],
    ask_name: [
      t("Muy | bien. | ¿Me | da | su | apellido?", "Very | good. | (To) me | you-give | your | last name?", "Great. Can I get your last name?"),
      t("Claro. | ¿A nombre de | quién | está | la | reservación?", "Sure. | Under the name of | whom | is | the | reservation?", "Sure. What name is the reservation under?"),
    ],
    ask_spell: [
      t("¿Me | lo | deletrea, | por favor?", "(To) me | it | you-spell, | please?", "Could you spell that for me, please?"),
      t("¿Y | cómo | se escribe?", "And | how | is it spelled?", "And how do you spell that?"),
    ],
    found: [t("¡Gracias! | Aquí | está: | un | compacto | por | tres | días.", "Thanks! | Here | it is: | a | compact car | for | three | days.", "Thanks! Here it is: a compact car for three days.")],
    found_details: [t("Es | un | compacto | por | tres | días.", "It's | a | compact car | for | three | days.", "It's a compact car for three days.")],
    not_found: [t("Mmm… | con | ese | apellido | no la encuentro…", "Hmm… | with | that | last name | I can't find it…", "Hmm… I can't find it under that last name…")],
    found_first: [t("¡Ah, | aquí | está! | Está | registrada | con | su | nombre de pila.", "Ah, | here | it is! | It's | registered | with | your | first name.", "Oh, here it is! It's under your first name.",
      { flags: { 7: "nombre de pila: your first name (literally the name from the baptismal font)." } })],
    // --- walk-in
    walkin_ok: [t("¡Sin problema! | Tenemos | carros | disponibles.", "No problem! | We have | cars | available.", "No problem! We have cars available.",
      { flags: { 2: "Mexican: carros = cars; autos is the neutral word." },
        neutral: t("¡Sin problema! | Tenemos | autos | disponibles.", "No problem! | We have | cars | available.", "No problem! We have cars available.") })],
    ask_size: [t("¿Qué | tipo | de | auto | busca?", "What | kind | of | car | are you looking for?", "What kind of car are you looking for?")],
    auto_all: [t("Todos | son | automáticos, | menos | el | económico, | que | es | estándar.", "All | are | automatic, | except | the | economy car, | which | is | manual.", "They're all automatics, except the economy car, which is a manual.",
      { flags: { 8: "estándar: a manual (stick-shift) car, in Mexico and much of Latin America." } })],
    rec_small: [t("Entonces | un | compacto | o | un | intermedio | le | queda | bien.", "Then | a | compact car | or | a | midsize car | (for) you | fits | well.", "Then a compact or a midsize car will work for you.")],
    rec_big: [t("Entonces | le | recomiendo | una | camioneta | o | una | minivan.", "Then | (to) you | I-recommend | an | SUV | or | a | minivan.", "Then I'd recommend an SUV or a minivan.")],
    rec_size: [t("Para | el | pueblo | y | la | playa, | el | compacto | es | lo | más | práctico.", "For | the | town | and | the | beach, | the | compact car | is | the | most | practical.", "For town and the beach, the compact is the most practical.",
      { flags: { 9: "lo + más + adjective: the most … (thing)." } })],
    rec_ins: [t("Casi | todos | nuestros | clientes | toman | la | cobertura | amplia; | así | la | garantía | es | más | baja.", "Almost | all | our | customers | take | the | coverage | full; | that way | the | deposit | is | more | low.", "Most of our customers take full coverage; that way the deposit is lower.")],
    fuel_price: [t("Depende | de | la | gasolinera; | si | se lo | llenamos | nosotros, | le | sale | más | caro.", "It depends | on | the | gas station; | if | it for you | we-fill | ourselves, | (to) you | it comes out | more | expensive.", "It depends on the gas station; if we fill it for you, it costs more.")],
    hours: [t("Abrimos | todos | los | días, | de | siete | de la mañana | a | nueve | de la noche.", "We're open | all | the | days, | from | seven | a.m. | to | nine | p.m.", "We're open every day, from 7 a.m. to 9 p.m.")],
    contract: [t("Es | el | contrato | de | renta: | las | fechas, | el | seguro | y | la | garantía.", "It's | the | contract | of | rental: | the | dates, | the | insurance | and | the | deposit.", "It's the rental agreement: the dates, the insurance and the deposit.")],
    upgrade_info: [t("Es | más | grande | y | le | caben | más | maletas.", "It's | more | big | and | (in) it | fit | more | suitcases.", "It's bigger, and it fits more luggage.")],
    see_car: [t("Claro, | salimos | y | lo | revisamos | juntos.", "Sure, | we go out | and | it | we-check | together.", "Sure, we'll go out and check it together.")],
    passport_ok: [t("Sí, | su | pasaporte | también, | por favor.", "Yes, | your | passport | too, | please.", "Yes, your passport too, please.")],
    fuel_type: [t("Usa | gasolina | regular; | en | la | gasolinera | es | la | verde.", "It uses | gas | regular; | at | the | gas station | it's | the | green one.", "It takes regular gas; at the gas station, it's the green pump.",
      { flags: { 8: "la verde: the green one, the color of the regular-gas pump in Mexico." } })],
    deposit_lower: [t("Si | toma | la | cobertura | amplia, | por | {$price} | al | día, | la | garantía | baja | a | {$deposit}. | ¿Se la | agrego?", "If | you-take | the | coverage | full, | for | {$price} | per | day, | the | deposit | goes down | to | {$deposit}. | It for you | should I add?",
      "If you take full coverage, for {$price} a day, the deposit goes down to {$deposit}. Should I add it?")],
    deposit_now: [t("Entonces | le | retenemos | solo | {$deposit}.", "Then | (from) you | we-hold | only | {$deposit}.", "Then we'll only hold {$deposit}.")],
    size_list: [t("Tenemos | económicos, | compactos, | intermedios, | camionetas | y | minivans.", "We have | economy cars, | compacts, | midsize cars, | SUVs | and | minivans.", "We have economy, compact and midsize cars, SUVs and minivans.",
      { flags: { 4: "camioneta: in Mexico, an SUV, a pickup or a van." } })],
    ask_days: [t("¿Y | por | cuántos | días?", "And | for | how many | days?", "And for how many days?")],
    rate_is: [t("Son | {$price} | al | día, | con | el | seguro | obligatorio | incluido.", "It's | {$price} | per | day, | with | the | insurance | mandatory | included.", "It's {$price} a day, with the mandatory insurance included.")],
    rate_size: [t("{X.np} | cuesta | {$price} | al | día, | con | el | seguro | obligatorio | incluido.", "{X.np} | costs | {$price} | per | day, | with | the | insurance | mandatory | included.", "{X.np} is {$price} a day, with the mandatory insurance included.")],
    price_more: [t("Son | {$price} | más | al | día.", "It's | {$price} | more | per | day.", "It's {$price} more a day.")],
    price_day: [t("Son | {$price} | al | día.", "It's | {$price} | per | day.", "It's {$price} a day.")],
    price_once: [t("Son | {$price}.", "It's | {$price}.", "It's {$price}.")],
    total_day: [t("Con | lo que | agregó, | son | {$total} | al | día.", "With | what | you-added, | it's | {$total} | per | day.", "With what you've added, it's {$total} a day.")],
    // a twist reservation (online price without the mandatory insurance), asked before Andrés has checked it
    check_first: [t("Enseguida | lo | revisamos.", "Right away | it | we-check.", "I'll check that in just a moment.")],
    usd: [t("Le | cobramos | en | pesos, | a | su | tarjeta | de | crédito.", "(To) you | we-charge | in | pesos, | to | your | card | of | credit.", "We charge in pesos, on your credit card.")],
    driver_ok: [t("Sí, | solo | necesito | su | licencia; | el | conductor | adicional | no tiene | costo.", "Yes, | just | I need | their | license; | the | driver | additional | doesn't have | a cost.",
      "Sure, I just need their license; there's no charge for an additional driver.",
      { flags: { 3: "su: their here (the other driver's); su can mean your, his, her or their." } })],
    ac_yes: [t("Sí, | todos | nuestros | autos | tienen | aire acondicionado.", "Yes, | all | our | cars | have | air conditioning.", "Yes, all our cars have air conditioning.")],
    // --- documents
    ask_docs: [
      t("¿Me | permite | su | licencia | de | manejo | y | una | tarjeta | de | crédito | a | su | nombre?", "(To) me | you-allow | your | license | of | driving | and | a | card | of | credit | in | your | name?",
        "May I see your driver's license and a credit card in your name?",
        { flags: { 5: "Mexican: licencia de manejo = driver's license; licencia de conducir is the neutral form." },
          neutral: t("¿Me | permite | su | licencia | de | conducir | y | una | tarjeta | de | crédito | a | su | nombre?", "(To) me | you-allow | your | license | of | driving | and | a | card | of | credit | in | your | name?",
            "May I see your driver's license and a credit card in your name?") }),
      t("Necesito | su | licencia, | su | pasaporte | y | una | tarjeta | de | crédito, | por favor.", "I need | your | license, | your | passport | and | a | card | of | credit, | please.", "I'll need your driver's license, your passport and a credit card, please."),
    ],
    docs_ok: [t("Perfecto, | gracias.", "Perfect, | thanks.", "Perfect, thank you."), t("Muy | bien, | gracias.", "Very | good, | thanks.", "Great, thanks.")],
    license_fine: [t("Su | licencia | extranjera | es | válida | aquí; | no necesita | permiso | internacional.", "Your | license | foreign | is | valid | here; | you don't need | a permit | international.", "Your foreign license is valid here; you don't need an international permit.")],
    debit_no: [t("Para | la | garantía | necesitamos | una | tarjeta | de | crédito; | con | débito | o | efectivo | no se puede.", "For | the | deposit | we need | a | card | of | credit; | with | debit | or | cash | it's not possible.", "For the security deposit we need a credit card; we can't take debit or cash.")],
    // --- upgrade
    ask_upgrade: [t("¿Le gustaría | cambiarse | a | un | intermedio | por | solo | {$price} | más | al | día?", "Would you like | to switch | to | a | midsize car | for | only | {$price} | more | per | day?", "Would you like to upgrade to a midsize car for just {$price} more a day?")],
    ask_upgrade_again: [t("Entonces, | ¿se lo | cambio | al | intermedio?", "So, | it for you | should I change | to the | midsize car?", "So, should I switch you to the midsize?")],
    free_upgrade: [t("Buenas | noticias: | hoy | no nos quedan | compactos, | así que | le | doy | un | intermedio | sin | costo | extra.", "Good | news: | today | we're out of | compacts, | so | (to) you | I'll-give | a | midsize car | without | cost | extra.", "Good news: we're out of compacts today, so I'm giving you a midsize car at no extra cost.")],
    upgrade_ok: [t("¡Perfecto! | Se lo | cambio | a | un | intermedio.", "Perfect! | It for you | I'll-change | to | a | midsize car.", "Great! I'll switch you to a midsize car.")],
    // --- the mandatory insurance (twist)
    tpl_twist: [t("Le | comento: | su | reservación | por | internet | no incluye | el | seguro | obligatorio | de | responsabilidad | civil. | Son | {$price} | más | al | día.",
      "(To) you | I-mention: | your | reservation | over | the internet | doesn't include | the | insurance | mandatory | of | liability | civil. | It's | {$price} | more | per | day.",
      "Just so you know: your online reservation doesn't include the mandatory liability insurance. It's {$price} more a day.",
      { flags: { 1: "Le comento: a polite Mexican way to bring something up (just so you know).", 11: "responsabilidad civil: third-party liability, required by law in Mexico." } })],
    tpl_must: [t("Lo | exige | la | ley | en | México: | cubre | los | daños | a | otras | personas.", "It | requires | the | law | in | Mexico: | it covers | the | damage | to | other | people.", "Mexican law requires it: it covers damage to other people.",
      { flags: { 0: "Lo exige la ley: the object (lo) comes first; the subject, la ley, comes after the verb." } })],
    tpl_why: [t("Muchas | páginas | de | internet | no lo incluyen | en | el | precio, | pero | en | México | es | obligatorio.", "Many | sites | on | the internet | don't include it | in | the | price, | but | in | Mexico | it's | mandatory.", "Many websites leave it out of the price, but in Mexico it's mandatory.")],
    tpl_sorry: [t("Lo | entiendo, | y | lo siento. | Muchas | páginas | no lo muestran | en | el | precio, | pero | aquí | es | obligatorio | por | ley.", "It | I-understand, | and | I'm sorry. | Many | sites | don't show it | in | the | price, | but | here | it's | mandatory | by | law.", "I understand, and I'm sorry. Many websites don't show it in the price, but here it's required by law.")],
    tpl_required: [t("Lo siento, | pero | sin | ese | seguro | no le puedo | entregar | el | carro.", "I'm sorry, | but | without | that | insurance | I can't (to you) | hand over | the | car.", "I'm sorry, but I can't give you the car without that insurance.",
      { flags: { 8: "Mexican: carro = car; auto is the neutral word." },
        neutral: t("Lo siento, | pero | sin | ese | seguro | no le puedo | entregar | el | auto.", "I'm sorry, | but | without | that | insurance | I can't (to you) | hand over | the | car.", "I'm sorry, but I can't give you the car without that insurance.") })],
    tpl_card: [t("Su | tarjeta | puede | cubrir | los | daños | al | vehículo, | pero | no | la | responsabilidad | civil. | Esa | la | exige | la | ley | en | México.",
      "Your | card | may | cover | the | damage | to the | vehicle, | but | not | the | liability | civil. | That one | it | requires | the | law | in | Mexico.",
      "Your card may cover damage to the car, but not liability. Mexican law requires that one.",
      { flags: { 14: "la: it, the object pronoun for la responsabilidad civil (not an article)." } })],
    tpl_price: [t("Son | {$price} | más | al | día | por | el | seguro | obligatorio.", "It's | {$price} | more | per | day | for | the | insurance | mandatory.", "It's {$price} more a day for the mandatory insurance.")],
    tpl_required_again: [t("Sin | ese | seguro | no se puede, | lo siento. | ¿Se lo | agrego, | o | prefiere | cancelar?", "Without | that | insurance | it's not possible, | I'm sorry. | It for you | should I add, | or | do you prefer | to cancel?",
      "I can't do it without that insurance, I'm sorry. Should I add it, or would you rather cancel?")],
    // two variants: the reminder often comes after two questions in a row
    tpl_again: [t("¿Seguimos, | entonces?", "Should we continue, | then?", "So, do you want to go ahead?"),
      t("Entonces, | ¿le | agrego | el | seguro | obligatorio?", "So, | (for) you | should I add | the | insurance | mandatory?", "So, should I add the mandatory insurance?")],
    tpl_ok: [t("Gracias | por | entender. | Ya | queda | incluido.", "Thanks | for | understanding. | Now | it's | included.", "Thanks for understanding. It's included now.")],
    tpl_leave: [t("Entiendo. | Si | cambia | de | opinión, | aquí | estamos.", "I understand. | If | you-change | — | opinion, | here | we are.", "I understand. If you change your mind, we're here.",
      { flags: { 3: "cambiar de opinión: change your mind; de links the thing that changes." } })],
    tpl_cancel_q: [t("Si | quiere, | puede | cancelar | la | reservación. | ¿Se la | cancelo?", "If | you want, | you-can | cancel | the | reservation. | It for you | should I cancel?",
      "You can cancel the reservation if you like. Do you want me to cancel it?")],
    // --- insurance
    ask_insurance: [
      t("El | seguro | obligatorio | ya | está | incluido. | ¿Quiere | agregar | la | cobertura | amplia | por | {$price} | al | día?", "The | insurance | mandatory | already | is | included. | Do you want | to add | the | coverage | full | for | {$price} | per | day?",
        "The mandatory insurance is already included. Would you like to add full coverage for {$price} a day?",
        { flags: { 10: "amplia: wide; cobertura amplia is full coverage (damage to the car and theft)." } }),
      t("¿Le | agrego | la | cobertura | amplia? | Son | {$price} | al | día | y | cubre | los | daños | al | vehículo | y | el | robo.", "(For) you | should I add | the | coverage | full? | It's | {$price} | per | day | and | it covers | the | damage | to the | vehicle | and | — | theft.",
        "Would you like me to add full coverage? It's {$price} a day and covers damage to the car and theft.",
        { flags: { 4: "amplia: wide; cobertura amplia is full coverage.", 16: "Spanish uses the article with robo here; English says just theft." } }),
    ],
    ask_insurance_after: [t("Y | aparte, | ¿quiere | agregar | la | cobertura | amplia? | Son | {$price} | al | día.", "And | besides, | do you want | to add | the | coverage | full? | It's | {$price} | per | day.", "And would you also like to add full coverage? It's {$price} a day.",
      { flags: { 6: "amplia: wide; cobertura amplia is full coverage (damage to the car and theft)." } })],
    ask_insurance_again: [t("Entonces, | ¿le | agrego | la | cobertura | amplia?", "So, | (for) you | should I add | the | coverage | full?", "So, should I add full coverage?"),
      // names the coverage: the reminder can follow other talk (the manual car switched, the upgrade declined)
      t("¿Quiere | la | cobertura | amplia, | entonces?", "Do you want | the | coverage | full, | then?", "So, do you want the full coverage?")],
    cover_info: [t("La | cobertura | amplia | cubre | los | daños | al | vehículo | y | el | robo.", "The | coverage | full | covers | the | damage | to the | vehicle | and | — | theft.", "Full coverage covers damage to the car and theft.",
      { flags: { 9: "Spanish uses the article with robo here; English says just theft." } })],
    ins_included: [t("El | seguro | obligatorio | ya | está | incluido; | los | daños | al | vehículo, | no.", "The | insurance | mandatory | already | is | included; | the | damage | to the | vehicle, | not.", "The mandatory insurance is already included; damage to the car isn't.")],
    ins_optional: [t("La | cobertura | amplia | es | opcional; | el | seguro | obligatorio | ya | está | incluido.", "The | coverage | full | is | optional; | the | insurance | mandatory | already | is | included.", "Full coverage is optional; the mandatory insurance is already included.")],
    deductible: [t("Con | la | cobertura | amplia, | el | deducible | es | mucho | más | bajo.", "With | the | coverage | full, | the | deductible | is | much | more | low.", "With full coverage, the deductible is much lower.")],
    ins_full_ok: [t("Perfecto, | queda | con | cobertura | amplia.", "Perfect, | you're | with | coverage | full.", "Great, you're fully covered.")],
    ins_basic_ok: [t("De acuerdo, | solo | el | seguro | obligatorio.", "All right, | only | the | insurance | mandatory.", "All right, just the mandatory insurance.")],
    ins_card_ok: [t("Muy | bien. | Su | tarjeta | puede | cubrir | los | daños; | el | seguro | obligatorio | ya | está | incluido.", "Very | good. | Your | card | may | cover | the | damage; | the | insurance | mandatory | already | is | included.", "Okay. Your card may cover damage; the mandatory insurance is already included.")],
    // --- deposit
    deposit_full: [t("Le | vamos | a | retener | {$deposit} | en | su | tarjeta | como | garantía. | Se libera | cuando | nos | devuelva | el | vehículo.", "(From) you | we're going | to | hold | {$deposit} | on | your | card | as | a deposit. | It's released | when | (to) us | you-return | the | vehicle.",
      "We'll put a hold of {$deposit} on your card as a security deposit. It's released when you bring the car back.")],
    deposit_basic: [t("Como | no lleva | la | cobertura | amplia, | la | garantía | es | de | {$deposit}. | Se la | retenemos | en | su | tarjeta | y | se libera | cuando | nos | devuelva | el | vehículo.",
      "Since | you're not taking | the | coverage | full, | the | deposit | is | — | {$deposit}. | It (from) you | we-hold | on | your | card | and | it's released | when | (to) us | you-return | the | vehicle.",
      "Since you're not taking full coverage, the security deposit is {$deposit}. We put it as a hold on your card, and it's released when you bring the car back.",
      { flags: { 8: "de before an amount: the deposit is of that amount; English needs no word." } })],
    deposit_amount: [t("La | garantía | es | de | {$deposit}, | retenida | en | su | tarjeta.", "The | deposit | is | — | {$deposit}, | held | on | your | card.", "The security deposit is {$deposit}, held on your card.",
      { flags: { 3: "de before an amount: the deposit is of that amount; English needs no word." } })],
    deposit_back: [t("Se la | liberamos | al | devolver | el | vehículo; | su | banco | puede | tardar | unos | días | hábiles | en | reflejarlo.", "It (for) you | we-release | upon | returning | the | vehicle; | your | bank | may | take | some | days | business | to | show it.",
      "We release it when you return the car; your bank may take a few business days to show it.")],
    deposit_hold: [t("Es | una | retención, | no | un | cargo: | el | dinero | no sale | de | su | cuenta.", "It's | a | hold, | not | a | charge: | the | money | doesn't leave | — | your | account.", "It's a hold, not a charge: the money doesn't leave your account.",
      { flags: { 9: "de: from; salir de = to leave (a place)." } })],
    deposit_why: [t("Es | por si | hay | daños, | multas | o | si | falta | gasolina.", "It's | in case | there are | damages, | fines | or | if | is missing | gas.", "It's in case of damage, fines, or a tank that isn't full.")],
    // --- fuel
    fuel_ask: [t("Se lo | entregamos | con | el | tanque | lleno. | ¿Lo | devuelve | con | el | tanque | lleno?", "It to you | we-hand-over | with | the | tank | full. | It | will you return | with | the | tank | full?", "It comes with a full tank. Will you bring it back full?")],
    fuel_info: [t("Se lo | entregamos | con | el | tanque | lleno, | y | lo | devuelve | lleno.", "It to you | we-hand-over | with | the | tank | full, | and | it | you-return | full.", "It comes with a full tank, and you bring it back full.")],
    fuel_again: [t("Entonces, | ¿lo | devuelve | con | el | tanque | lleno?", "So, | it | will you return | with | the | tank | full?", "So, will you bring it back with a full tank?")],
    ask_prepay: [
      t("¿O | prefiere | pagar | el | tanque | por adelantado? | Son | {$price}, | y | así | lo | puede | devolver | vacío.", "Or | do you prefer | to pay | the | tank | in advance? | It's | {$price}, | and | that way | it | you-can | return | empty.", "Or would you rather prepay for the tank? It's {$price}, and then you can bring it back empty."),
    ],
    full_ok: [t("Perfecto, | con | el | tanque | lleno.", "Perfect, | with | the | tank | full.", "Great, with a full tank.")],
    prepay_quote: [t("Claro. | El | tanque | cuesta | {$price}, | y | así | lo | puede | devolver | vacío. | ¿Se lo | cobro?", "Sure. | The | tank | costs | {$price}, | and | that way | it | you-can | return | empty. | It (from) you | should I charge?", "Sure. A full tank is {$price}, and then you can bring it back empty. Should I charge you for it?")],
    prepay_confirm: [t("Entonces, | ¿le | cobro | el | tanque | por adelantado?", "So, | (to) you | should I charge | the | tank | in advance?", "So, should I charge you for the tank up front?")],
    prepay_ok: [t("Listo, | el | tanque | queda | pagado. | Lo | puede | devolver | vacío.", "Done, | the | tank | is | paid. | It | you-can | return | empty.", "Done, the tank is paid for. You can bring it back empty.")],
    fuel_charge: [t("Entonces | le | cobramos | la | gasolina | que | falte, | y | le | sale | más | cara | que | en | la | gasolinera.", "Then | (to) you | we-charge | the | gas | that | is missing, | and | (to) you | it comes out | more | expensive | than | at | the | gas station.", "Then we'll charge you for the missing gas, and it costs more than at a gas station.")],
    gas_station: [t("Hay | una | gasolinera | aquí | cerca, | sobre | la | avenida.", "There is | a | gas station | here | nearby, | on | the | avenue.", "There's a gas station close by, on the main avenue.")],
    mileage: [t("El | kilometraje | es | ilimitado: | puede | manejar | lo que | quiera.", "The | mileage | is | unlimited: | you-can | drive | what | you want.", "Mileage is unlimited: you can drive as much as you like.")],
    automatic: [t("Es | automático.", "It's | automatic.", "It's an automatic.")],
    economy_manual: [t("El | económico | es | estándar. | El | compacto | es | automático | y | cuesta | {$price} | al | día. | ¿Se lo | cambio?", "The | economy car | is | manual. | The | compact car | is | automatic | and | costs | {$price} | per | day. | It for you | should I change?",
      "The economy car is a manual. The compact is an automatic and costs {$price} a day. Do you want me to switch it?",
      { flags: { 3: "estándar: a manual (stick-shift) car, in Mexico and much of Latin America." } })],
    switch_ok: [t("Listo, | le | doy | el | compacto.", "Done, | (to) you | I-give | the | compact car.", "All set, you'll have the compact.")],
    // --- extras
    ask_extras: [t("¿Va | a | necesitar | GPS | o | una | silla | para | niño?", "Are you going | to | need | a GPS | or | a | seat | for | child?", "Will you need a GPS or a child seat?")],
    which_extra: [t("¡Claro! | ¿Qué | necesita?", "Sure! | What | do you need?", "Sure! What do you need?")],
    extra_quote: [t("{X.the} | cuesta | {$price} | al | día. | ¿Se | {lo@X} | agrego?", "{X.the} | costs | {$price} | per | day. | (For) you | it | should I add?", "{X.the} is {$price} a day. Should I add it?",
      { flags: { 6: "lo / la: it, agreeing with the thing (el GPS, la silla)." } })],
    extra_quote_both: [t("Los | dos | juntos | son | {$price} | al | día. | ¿Se los | agrego?", "The | two | together | are | {$price} | per | day. | Them for you | should I add?", "Both together are {$price} a day. Should I add them?")],
    extra_added: [t("Listo, | ya | está | en | su | contrato.", "Done, | already | it's | in | your | contract.", "Done, it's on your contract now.")],
    no_extras: [t("Sin problema.", "No problem.", "No problem.")],
    // --- return
    ret_confirm: [
      t("Lo | devuelve | el | {X} | antes de | las | cinco | de la tarde, | ¿verdad?", "It | you-return | on | {X} | before | — | five | p.m., | right?", "You're bringing it back on {X} by 5 p.m., right?",
        { flags: { 2: "el before a weekday means on.", 5: "Spanish uses an article before clock times; English has no separate word." } }),
      t("Entonces | lo | entrega | el | {X}, | a más tardar | a | las | cinco | de la tarde. | ¿Está bien?", "So | it | you-hand-in | on | {X}, | at the latest | at | — | five | p.m. | Is that okay?", "So you'll return it on {X}, by 5 p.m. at the latest. Is that okay?",
        { flags: { 3: "el before a weekday means on.", 7: "Spanish uses an article before clock times; English has no separate word." } }),
    ],
    ret_answer: [t("El | {X}, | antes de | las | cinco | de la tarde, | aquí mismo.", "On | {X}, | before | — | five | p.m., | right here.", "On {X}, by 5 p.m., right here.",
      { flags: { 0: "el before a weekday means on.", 3: "Spanish uses an article before clock times; English has no separate word." } })],
    ret_confirm_next: [t("Lo | devuelve | el | próximo | {X} | antes de | las | cinco | de la tarde, | ¿verdad?", "It | you-return | — | next | {X} | before | — | five | p.m., | right?", "You're bringing it back next {X} by 5 p.m., right?",
      { flags: { 2: "el before próximo + weekday; English says next Tuesday with no article.", 6: "Spanish uses an article before clock times; English has no separate word." } })],
    ret_answer_next: [t("El | próximo | {X}, | antes de | las | cinco | de la tarde, | aquí mismo.", "— | Next | {X}, | before | — | five | p.m., | right here.", "Next {X}, by 5 p.m., right here.",
      { flags: { 0: "el before próximo + weekday; English says next Tuesday with no article.", 4: "Spanish uses an article before clock times; English has no separate word." } })],
    ret_again: [t("Entonces, | ¿el | {X} | antes de | las | cinco | está bien?", "So, | — | {X} | before | — | five | is that okay?", "So, is {X} by 5 p.m. okay?",
      { flags: { 1: "el before a weekday; English says just the day here.", 4: "Spanish uses an article before clock times; English has no separate word." } })],
    ret_confirm_long: [t("Lo | devuelve | en | {$num} | días, | el | {X}, | antes de | las | cinco | de la tarde, | ¿verdad?", "It | you-return | in | {$num} | days, | on | {X}, | before | — | five | p.m., | right?", "You're bringing it back in {$num} days, on {X}, by 5 p.m., right?",
      { flags: { 5: "el before a weekday means on.", 8: "Spanish uses an article before clock times; English has no separate word." } })],
    ret_answer_long: [t("En | {$num} | días, | el | {X}, | antes de | las | cinco | de la tarde, | aquí mismo.", "In | {$num} | days, | on | {X}, | before | — | five | p.m., | right here.", "In {$num} days, on {X}, by 5 p.m., right here.",
      { flags: { 3: "el before a weekday means on.", 6: "Spanish uses an article before clock times; English has no separate word." } })],
    ret_long: [t("Listo: | lo | devuelve | el | {X}, | en | {$num} | días.", "Done: | it | you-return | on | {X}, | in | {$num} | days.", "All set: you'll bring it back on {X}, in {$num} days.",
      { flags: { 3: "el before a weekday means on." } })],
    ret_more_q_long: [t("Claro. | Serían | {$price} | más. | ¿Se lo | cambio?", "Sure. | It would be | {$price} | more. | It for you | should I change?", "Sure. That would be {$price} more. Should I change it?")],
    ret_more_q_day: [t("Claro. | Cada | día | extra | cuesta | {$price}. | ¿Se lo | cambio?", "Sure. | Each | day | extra | costs | {$price}. | It for you | should I change?", "Sure. Each extra day is {$price}. Should I change it?")],
    ret_early: [t("Sí, | claro, | puede | devolverlo | antes.", "Yes, | of course, | you-can | return it | earlier.", "Sure, you can bring it back early.")],
    ret_which: [t("¿Qué | día | lo | va | a | devolver?", "What | day | it | are you going | to | return?", "What day will you bring it back?")],
    ret_where: [t("Aquí mismo, | en | esta | oficina.", "Right here, | at | this | office.", "Right here, at this office.")],
    ret_where_airport: [t("En | el | aeropuerto, | como | quedamos.", "At | the | airport, | as | we agreed.", "At the airport, as we agreed.")],
    ret_airport_q: [t("Sí, | se puede, | con | un | cargo | de | {$price}. | ¿Lo | quiere | devolver | allá?", "Yes, | it's possible, | with | a | fee | of | {$price}. | It | do you want | to return | there?", "Yes, you can, for a drop-off fee of {$price}. Would you like to return it there?")],
    ret_airport_ok: [t("Listo: | lo | devuelve | en | el | aeropuerto.", "Done: | it | you-return | at | the | airport.", "All set: you'll return it at the airport.")],
    ret_here: [t("Muy | bien, | entonces | aquí | en | la | oficina.", "Very | good, | then | here | at | the | office.", "Okay, then here at the office.")],
    ret_other: [t("Lo siento, | solo | aquí | o | en | el | aeropuerto.", "I'm sorry, | only | here | or | at | the | airport.", "I'm sorry, only here or at the airport.")],
    ret_more_q: [t("Claro. | Serían | {$price} | más. | ¿Se lo | cambio | para | el | {X}?", "Sure. | It would be | {$price} | more. | It for you | should I change | for | — | {X}?", "Sure. That would be {$price} more. Should I change it to {X}?",
      { flags: { 7: "el before a weekday; English says just the day here." } })],
    ret_changed: [t("Claro, | se lo | cambio | para | el | {X}.", "Sure, | it for you | I'll-change | for | — | {X}.", "Sure, I'll change it to {X}.",
      { flags: { 4: "el before a weekday; English says just the day here." } })],
    ret_changed_ok: [t("Listo, | lo | devuelve | el | {X}.", "Done, | it | you-return | on | {X}.", "All set, you'll bring it back on {X}.",
      { flags: { 3: "el before a weekday means on." } })],
    ret_keep: [t("Bueno, | entonces | se queda | el | {X}.", "Okay, | then | it stays | on | {X}.", "Okay, then it stays on {X}.",
      { flags: { 3: "el before a weekday means on." } })],
    late_info: [t("Tiene | una | hora | de | tolerancia; | después, | le | cobramos | un | día | más.", "You have | an | hour | of | grace; | after that, | (to) you | we-charge | a | day | more.", "You have a one-hour grace period; after that, we charge an extra day.",
      { flags: { 4: "tolerancia: here, a grace period." } })],
    // --- signing and keys
    ask_sign: [
      t("Ahora, | firme | aquí, | y | sus | iniciales | aquí.", "Now, | sign | here, | and | your | initials | here.", "Now, sign here, and your initials here."),
      t("Solo | necesito | su | firma | aquí | y | aquí.", "Just | I need | your | signature | here | and | here.", "I just need your signature here and here."),
    ],
    sign_where: [t("Aquí, | abajo.", "Here, | at the bottom.", "Right here, at the bottom.")],
    keys: [t("Aquí | tiene | sus | llaves.", "Here | you have | your | keys.", "Here are your keys."), t("Listo, | aquí | están | sus | llaves.", "Done, | here | are | your | keys.", "All right, here are your keys.")],
    car_economy: [t("Es | el | económico | rojo, | en | el | lugar | B2.", "It's | the | economy car | red, | in | the | spot | B2.", "It's the red economy car in spot B2.", { say: "Es el económico rojo, en el lugar be dos." })],
    car_compact: [t("Es | el | compacto | plateado, | en | el | lugar | B4.", "It's | the | compact car | silver, | in | the | spot | B4.", "It's the silver compact in spot B4.", { say: "Es el compacto plateado, en el lugar be cuatro." })],
    car_midsize: [t("Es | el | intermedio | azul, | en | el | lugar | C2.", "It's | the | midsize car | blue, | in | the | spot | C2.", "It's the blue midsize car in spot C2.", { say: "Es el intermedio azul, en el lugar ce dos." })],
    car_suv: [t("Es | la | camioneta | negra, | en | el | lugar | D1.", "It's | the | SUV | black, | in | the | spot | D1.", "It's the black SUV in spot D1.", { say: "Es la camioneta negra, en el lugar de uno." })],
    car_minivan: [t("Es | la | minivan | blanca, | en | el | lugar | D3.", "It's | the | minivan | white, | in | the | spot | D3.", "It's the white minivan in spot D3.", { say: "Es la minivan blanca, en el lugar de tres." })],
    lot_where: [t("Los | autos | están | aquí | afuera, | en | el | estacionamiento.", "The | cars | are | here | outside, | in | the | parking lot.", "The cars are right outside, in the parking lot.")],
    check_car: [t("Antes de | irse, | revise | bien | el | carro. | Si | ve | un | rayón | o | un | golpe, | tómele | una | foto | y | avísenos.",
      "Before | leaving, | check | well | the | car. | If | you-see | a | scratch | or | a | dent, | take (of it) | a | photo | and | let us know.",
      "Before you leave, check the car carefully. If you see a scratch or a dent, take a photo and let us know.",
      { flags: { 5: "Mexican: carro = car; auto is the neutral word.", 13: "tómele: take (usted) + le, of it." },
        neutral: t("Antes de | irse, | revise | bien | el | auto. | Si | ve | un | rayón | o | un | golpe, | tómele | una | foto | y | avísenos.",
          "Before | leaving, | check | well | the | car. | If | you-see | a | scratch | or | a | dent, | take (of it) | a | photo | and | let us know.",
          "Before you leave, check the car carefully. If you see a scratch or a dent, take a photo and let us know.") })],
    scratch_info: [t("Tómele | una | foto | y | avísenos; | lo | anotamos | en | la | hoja | de | inspección.", "Take (of it) | a | photo | and | let us know; | it | we-note | on | the | sheet | of | inspection.", "Take a photo and let us know; we'll note it on the inspection sheet.")],
    scratch_noted: [t("Gracias | por | avisar. | Lo | anoto | en | la | hoja | de | inspección.", "Thanks | for | letting us know. | It | I-note | on | the | sheet | of | inspection.", "Thanks for telling me. I'll note it on the inspection sheet.")],
    anything_else: [t("¿Algo | más | en | que | le | pueda | ayudar?", "Anything | else | in | which | (to) you | I-can | help?", "Anything else I can help you with?")],
    drive_safe: [
      t("¡Buen | viaje!", "Good | trip!", "Have a great trip!"),
      t("¡Maneje | con | cuidado!", "Drive | with | care!", "Drive safe!"),
      t("¡Que | le | vaya | bien, | y | maneje | con | cuidado!", "May | (to) you | it go | well, | and | drive | with | care!", "Have a good trip, and drive safe!"),
    ],
    // not "¡Buen viaje!" again: the goodbye before it is often "¡Buen viaje!"
    you_welcome: [t("¡De nada! | ¡Hasta luego!", "You're welcome! | See you later!", "You're welcome! See you later!")],
    welcome: [t("¡Con gusto!", "My pleasure!", "You're welcome!")],
    ack_ok: [t("Muy | bien.", "Very | good.", "Okay.")],
    ack: [t("Muy | bien.", "Very | good.", "Okay."), t("Perfecto.", "Perfect.", "Perfect."), t("Claro.", "Sure.", "Sure.")],
    no_problem: [t("Sin problema.", "No problem.", "No problem.")],
    yes_or_no: [t("Perdón, | ¿eso | es | un | sí | o | un | no?", "Sorry, | that | is | a | yes | or | a | no?", "Sorry, is that a yes or a no?")],
  },

  domains: {
    price: () => {
      const s = new Set<number>([TPL, FULL_COVERAGE, UPGRADE, PREPAY, PREPAY_SUV, PREPAY_VAN, AIRPORT, MANUAL_SWITCH]);
      for (const e of SIZES) for (let n = 1; n <= 7; n++) s.add((e.attrs!.rate as number) * n);
      for (const e of EXTRAS) s.add(e.attrs!.rate as number);
      s.add(EXTRAS.reduce((a, e) => a + (e.attrs!.rate as number), 0));
      return [...s].sort((a, b) => a - b);
    },
    deposit: () => [DEPOSIT_FULL, DEPOSIT_BASIC],
    // total_day: a car's rate plus full coverage and/or extras (something added; with nothing added rate_is is said)
    total: () => {
      const s = new Set<number>();
      const extras = [0, ...EXTRAS.map((e) => e.attrs!.rate as number), EXTRAS.reduce((a, e) => a + (e.attrs!.rate as number), 0)];
      for (const e of SIZES) for (const cov of [0, FULL_COVERAGE]) for (const x of extras) if (cov + x) s.add((e.attrs!.rate as number) + cov + x);
      return [...s].sort((a, b) => a - b);
    },
    num: () => Array.from({ length: 23 }, (_, i) => i + 8),
  },

  hints: {
    pickup: { lt: "Say you've booked a car", items: [
      { id: "have_resv", s: t("Tengo | una | reservación.", "I have | a | reservation.", "I have a reservation.") },
      { id: "booked", s: t("Reservé | un | auto | por | internet.", "I booked | a | car | over | the internet.", "I booked a car online.") },
      { id: "pick_up", s: t("Vengo | a | recoger | mi | auto.", "I'm here | to | pick up | my | car.", "I'm here to pick up my car.") },
    ] },
    walkin: { lt: "Rent a car without a reservation", items: [
      { id: "rent", s: t("Quisiera | rentar | un | auto, | por favor.", "I'd like | to rent | a | car, | please.", "I'd like to rent a car, please."), note: "Mexico says rentar; alquilar is understood too." },
      { id: "no_resv", s: t("No tengo | reservación.", "I don't have | a reservation.", "I don't have a reservation.") },
      { id: "rent_have", s: t("¿Tienen | autos | disponibles?", "Do you have | cars | available?", "Do you have any cars available?") },
    ] },
    name: { lt: "Give your last name", items: [
      { id: "name_its", s: t("Mi | apellido | es | {$surname}.", "My | last name | is | {$surname}.", "My last name is {$surname}.") },
      { id: "name_its", s: t("A nombre de | {$surname}.", "Under the name of | {$surname}.", "It's under {$surname}.") },
    ] },
    spell: { lt: "Spell your last name", items: [
      { id: "spell", s: t("Se escribe | {$letters}.", "It's spelled | {$letters}.", "It's spelled {$letters}."), note: "Say the letters by their Spanish names: a, be, ce, de, e, efe, ge, hache, i, jota, ka, ele, eme…" },
    ] },
    size: { lt: "Choose a car", slot: "size", examples: ["compact", "economy", "midsize", "suv"], items: [
      { id: "size_short", s: t("{X.np}, | por favor.", "{X.np}, | please.", "{X.np}, please.") },
      { id: "size_want", s: t("Quisiera | {X.np}, | por favor.", "I'd like | {X.np}, | please.", "I'd like {X.np}, please.") },
    ] },
    days: { lt: "Say for how many days", items: [
      { id: "days", s: t("Por | tres | días.", "For | three | days.", "For three days.") },
      { id: "days", s: t("Por | una | semana.", "For | a | week.", "For a week.") },
    ] },
    docs: { lt: "Hand over your documents", items: [
      { id: "here_you_go", s: t("Aquí tiene.", "Here you go.", "Here you go.") },
      { id: "here_license", s: t("Aquí | tiene | mi | licencia | y | mi | tarjeta.", "Here | you have | my | license | and | my | card.", "Here's my license and my card.") },
      { id: "q_license", s: t("¿Sirve | mi | licencia | extranjera?", "Does it work | my | license | foreign?", "Is my foreign license okay?") },
      { id: "q_debit", s: t("¿Aceptan | tarjeta | de | débito?", "Do you accept | card | of | debit?", "Do you take debit cards?") },
    ] },
    upgrade: { lt: "Answer the upgrade offer", items: [
      { id: "keep_size", s: t("No, | gracias. | El | compacto | está bien.", "No, | thanks. | The | compact | is fine.", "No, thanks. The compact is fine.") },
      { id: "upgrade_yes", s: t("Sí, | cámbieme | al | intermedio.", "Yes, | switch me | to the | midsize.", "Yes, switch me to the midsize.") },
    ] },
    tpl: { lt: "Ask about the mandatory insurance", items: [
      { id: "tpl_must", s: t("¿Es | obligatorio?", "Is it | mandatory?", "Is it mandatory?") },
      { id: "tpl_why", s: t("¿Por qué | no estaba | incluido?", "Why | wasn't it | included?", "Why wasn't it included?") },
      { id: "tpl_ok", s: t("Está bien, | lo | pago.", "That's fine, | it | I'll-pay.", "Okay, I'll pay it.") },
    ] },
    insurance: { lt: "Choose your insurance", items: [
      { id: "ins_basic", s: t("Solo | el | seguro | obligatorio, | por favor.", "Only | the | insurance | mandatory, | please.", "Just the mandatory insurance, please.") },
      { id: "ins_full", s: t("Quiero | la | cobertura | amplia, | por favor.", "I want | the | coverage | full, | please.", "I'd like full coverage, please.") },
      { id: "q_cover", s: t("¿Qué | cubre?", "What | does it cover?", "What does it cover?") },
      { id: "q_ins_included", s: t("¿Está | incluido | el | seguro?", "Is | included | the | insurance?", "Is insurance included?") },
      { id: "ins_card", s: t("Mi | tarjeta | de | crédito | me | cubre.", "My | card | of | credit | me | covers.", "My credit card covers me."), note: "In Mexico a card can cover damage to the car, never the mandatory liability insurance." },
    ] },
    deposit: { lt: "Accept or ask about the deposit", items: [
      { id: "ok_ack", s: t("Está bien, | no hay problema.", "That's fine, | no problem.", "Okay, no problem.") },
      { id: "q_deposit_back", s: t("¿Cuándo | me lo | devuelven?", "When | it to me | do you give back?", "When do I get it back?") },
    ] },
    fuel: { lt: "Answer about the gas", items: [
      { id: "full_to_full", s: t("Lo | devuelvo | con | el | tanque | lleno.", "It | I'll-return | with | the | tank | full.", "I'll bring it back with a full tank.") },
      { id: "q_gas_station", s: t("¿Hay | una | gasolinera | cerca?", "Is there | a | gas station | nearby?", "Is there a gas station nearby?") },
      { id: "prepay", s: t("Prefiero | pagar | el | tanque | por adelantado.", "I prefer | to pay | the | tank | in advance.", "I'd rather prepay for the tank.") },
    ] },
    sign: { lt: "Sign the contract", items: [
      { id: "ok_ack", s: t("Claro.", "Sure.", "Sure.") },
      { id: "q_sign", s: t("¿Dónde | firmo?", "Where | do I sign?", "Where do I sign?") },
    ] },
    questions: { lt: "Ask about the terms", items: [
      { id: "q_mileage", s: t("¿Hay | límite | de | kilometraje?", "Is there | a limit | of | mileage?", "Is there a mileage limit?") },
      { id: "q_automatic", s: t("¿Es | automático?", "Is it | automatic?", "Is it an automatic?") },
      { id: "q_fuel", s: t("¿Lo | tengo | que | devolver | lleno?", "It | do I have | to | return | full?", "Do I have to bring it back full?") },
      { id: "q_deposit", s: t("¿Hay | que | dejar | un | depósito?", "Does one have | to | leave | a | deposit?", "Is there a deposit?") },
      { id: "q_deposit_back", s: t("¿Cuándo | me lo | devuelven?", "When | it to me | do you give back?", "When do I get it back?") },
      { id: "q_gas_station", s: t("¿Hay | una | gasolinera | cerca?", "Is there | a | gas station | nearby?", "Is there a gas station nearby?") },
    ] },
    extras: { lt: "Extras", slot: "extra", examples: ["gps", "child_seat"], items: [
      { id: "extra_phone", s: t("No, | gracias. | Uso | mi | celular.", "No, | thanks. | I-use | my | cell phone.", "No, thanks. I'll use my phone.") },
      { id: "extra_want", s: t("¿Me | puede | dar | {X.np}?", "(To) me | can you | give | {X.np}?", "Could I get {X.np}?") },
    ] },
    ret: { lt: "Confirm or change the return", items: [
      { id: "yes_right", s: t("Sí, | es | correcto.", "Yes, | it's | correct.", "Yes, that's right.") },
      { id: "q_airport", s: t("¿Lo | puedo | devolver | en | el | aeropuerto?", "It | can I | return | at | the | airport?", "Can I return it at the airport?") },
      { id: "q_late", s: t("¿Qué | pasa | si | llego | tarde?", "What | happens | if | I-arrive | late?", "What if I'm late?") },
      { id: "q_return", s: t("¿A | qué | hora | lo | tengo | que | devolver?", "At | what | time | it | do I have | to | return?", "What time do I need to return it?") },
      { id: "keep_until", s: t("¿Puedo | quedármelo | hasta | el | sábado?", "Can I | keep it | until | — | Saturday?", "Could I keep it until Saturday?", { flags: { 3: "el before a weekday; English says just the day here." } }) },
    ] },
    car: { lt: "Ask about the car", items: [
      { id: "q_where_car", s: t("¿Dónde | está | el | auto?", "Where | is | the | car?", "Where's the car?") },
      { id: "q_scratch", s: t("¿Qué | hago | si | veo | un | rayón?", "What | do I do | if | I-see | a | scratch?", "What if I see a scratch?") },
      { id: "q_automatic", s: t("¿Es | automático?", "Is it | automatic?", "Is it an automatic?") },
    ] },
  },

  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With staff, usted is more polite: tiene, puede, agrégueme (tienes, puedes, agrégame are for friends).", better: "¿Tienen autos disponibles?" },
  },

  merges: {
    "renta de autos colibrí": { reason: "lexical_expression", split: "renta → rental + de → of + autos → cars + colibrí → hummingbird would translate the agency's proper name word by word.", minimal: "The four-word name only." },
    "antes de": { reason: "lexical_expression", split: "antes → before + de → of: the two-word preposition is English before.", minimal: "Two words; the time stays separate." },
    "a más tardar": { reason: "lexical_expression", split: "a → at + más → more + tardar → to be late misreads the fixed phrase: at the latest.", minimal: "Three words." },
    "aquí mismo": { reason: "lexical_expression", split: "aquí → here + mismo → same misreads the emphatic adverb: right here.", minimal: "Two words." },
    "por adelantado": { reason: "lexical_expression", split: "por → by + adelantado → advanced misreads the adverb: in advance.", minimal: "Two words." },
    "así que": { reason: "lexical_expression", split: "así → like this + que → that misreads the conjunction: so.", minimal: "Two words." },
    "por si": { reason: "lexical_expression", split: "por → for + si → if misreads the conjunction: in case.", minimal: "Two words." },
    "nombre de pila": { reason: "lexical_expression", split: "nombre → name + de → of + pila → font misreads the term: first name.", minimal: "Three words." },
    "le gustaría": { reason: "grammatical_fusion", split: "le → to you + gustaría → would please is a word-for-word reading of English would you like.", minimal: "Clitic and verb only." },
    "aire acondicionado": { reason: "lexical_expression", split: "aire → air + acondicionado → conditioned misreads the compound noun: air conditioning.", minimal: "Two words, one noun." },
  },

  mission: [
    { lt: "Say whether you have a reservation", done: (c) => c.s.resv !== undefined || !!c.s.walkin },
    { step: "name", lt: "Give your last name", optional: true },
    { step: "size", lt: "Choose a car", optional: true },
    { step: "license", lt: "Hand over your license and card" },
    { step: "insurance", lt: "Choose your insurance" },
    { lt: "Find out about the deposit and the return", done: (c) => !!c.s.depositTold && !!c.s.retOk },
    { lt: "Sign and get the keys", done: (c) => !!c.s.keysGiven },
  ],

  // -------------------------------------------------------------------------

  steps: [
    { id: "resv", when: (c) => !c.s.walkin, done: (c) => c.s.resv !== undefined,
      ask: (c) => {
        if (!c.s.greeted) {
          c.s.greeted = true;
          if (c.s.hay) { c.say("greet_hay"); expectHowAreYou(c); return; }
          c.say("greet"); return;
        }
        c.say("ask_resv");
      },
      expects: ["have_resv", "rent_walkin", "resv_no_ctx", "resv_yes_ctx"],
      suggest: [{ lt: "Say you've booked a car", hint: "pickup" }, { lt: "Rent a car without a reservation", hint: "walkin" }],
      yes: (c) => { c.s.resv = true; },
      no: (c) => { c.s.resv = false; c.s.walkin = true; c.say("walkin_ok"); } },
    { id: "name", when: (c) => c.s.resv === true, done: (c) => !!c.s.name,
      ask: (c) => c.say("ask_name"), expects: ["name_ctx"],
      suggest: [{ lt: "Give your last name", hint: "name" }] },
    { id: "spell", when: (c) => c.s.resv === true && !!c.s.name && c.s.askSpell && !c.s.spelled, done: (c) => !!c.s.spelled,
      ask: (c) => c.say("ask_spell"), expects: ["letters_ctx", "name_ctx"],
      suggest: [{ lt: "Spell your last name", hint: "spell" }] },
    { id: "size", when: (c) => !!c.s.walkin, done: (c) => !!c.s.size,
      ask: (c) => c.say("ask_size"), expects: ["size_ctx", "sizes_q", "price_q", "party_ctx", "recommend_q", "auto_q"],
      suggest: [{ lt: "Choose a car", hint: "size", options: "size" }],
      help: (c) => { c.say("size_list"); } },
    { id: "days", when: (c) => !!c.s.walkin && !!c.s.size, done: (c) => !!c.s.days,
      // "Una camioneta… mejor un compacto": a walk-in may still change the car here
      ask: (c) => c.say("ask_days"), expects: ["days_ctx", "size_ctx"],
      suggest: [{ lt: "Say for how many days", hint: "days" }] },
    { id: "license", when: (c) => !!c.s.name || (!!c.s.walkin && !!c.s.days), done: (c) => !!c.s.docs,
      ask: (c) => {
        if (c.s.resv && !c.s.foundSaid) {
          c.s.foundSaid = true;
          if (c.s.firstNameTwist) { c.twist("first_name"); c.say("not_found"); c.say("found_first"); c.say("found_details"); }
          else c.say("found");
        }
        if (c.s.walkin && !c.s.rateSaid) { c.s.rateSaid = true; c.say("rate_is", { price: rate(c) }); }
        c.say("ask_docs");
      },
      expects: ["here_docs", "hand_ctx", "license_q", "debit_q", "passport_q", "size_ctx"],
      suggest: [{ lt: "Hand over your license and credit card", hint: "docs" }],
      yes: (c) => { c.s.docs = true; c.say("docs_ok"); } },
    { id: "free_up", when: (c) => !!c.s.docs && size(c) === "compact" && !!c.s.freeUpgrade && c.s.upgrade === undefined, done: (c) => c.s.upgrade !== undefined,
      ask: (c) => { c.twist("free_upgrade"); c.s.upgrade = "free"; c.s.size = "midsize"; c.say("free_upgrade"); },
      suggest: [{ lt: "Say thank you", hint: "g_social" }] },
    { id: "upgrade", when: (c) => !!c.s.docs && size(c) === "compact" && !!c.s.askUpgrade && !c.s.freeUpgrade && c.s.upgrade === undefined, done: (c) => c.s.upgrade !== undefined,
      ask: (c) => { if (c.s.upgradeQuoted) { c.say("ask_upgrade_again"); return; } c.s.upgradeQuoted = true; c.say("ask_upgrade", { price: UPGRADE }); },
      expects: ["keep_size", "upgrade_yes", "polite_no_ctx", "price_q", "upgrade_q", "pricey_ctx"],
      suggest: [{ lt: "Keep the compact or upgrade", hint: "upgrade" }],
      yes: offerYes(upgradeYes, upgradeNo), no: (c) => upgradeNo(c) },
    // The twist: the online booking left out the mandatory liability insurance.
    { id: "tpl", when: (c) => !!c.s.docs && c.s.resv === true && !!c.s.tplTwist, done: (c) => !!c.s.tplOk || !!c.s.left,
      ask: (c) => {
        if (c.s.tplAsked) { c.say("tpl_again"); return; }
        c.s.tplAsked = true; c.twist("mandatory_insurance"); c.say("tpl_twist", { price: TPL });
      },
      expects: ["tpl_q", "tpl_refuse_ctx", "tpl_leave_ctx", "cancel_q_ctx", "tpl_card_ctx", "ins_own", "ok_ack", "price_q", "ins_what"],
      suggest: [{ lt: "Accept or ask about the mandatory insurance", hint: "tpl" }],
      yes: (c) => tplAccept(c),
      no: (c) => { tplRequired(c); c.hold(); } },
    { id: "insurance", when: (c) => !!c.s.docs, done: (c) => !!c.s.ins,
      ask: (c) => {
        if (c.s.insAsked) { c.say("ask_insurance_again"); return; }
        c.s.insAsked = true; c.say(c.s.tplOk ? "ask_insurance_after" : "ask_insurance", { price: FULL_COVERAGE });
      },
      expects: ["ins_full", "ins_yes_ctx", "ins_basic", "ins_own", "ins_what", "ins_no_ctx", "polite_no_ctx", "price_q", "recommend_q"],
      suggest: [{ lt: "Choose your insurance", hint: "insurance" }],
      yes: offerYes((c) => { c.s.ins = "full"; c.say("ins_full_ok"); }, (c) => { c.s.ins = "basic"; c.say("ins_basic_ok"); }),
      no: (c) => { c.s.ins = "basic"; c.say("ins_basic_ok"); } },
    { id: "deposit", when: (c) => !!c.s.ins, done: (c) => !!c.s.depositTold,
      ask: (c) => { c.s.depositTold = true; c.say(c.s.ins === "full" ? "deposit_full" : "deposit_basic", { deposit: depositOf(c) }); },
      expects: ["deposit_q", "ok_ack", "deposit_echo_ctx", "deposit_much_ctx"],
      suggest: [{ lt: "Accept or ask when you get it back", hint: "deposit" }, { lt: "Ask about the terms", hint: "questions" }] },
    { id: "fuel", when: (c) => !!c.s.depositTold, done: (c) => !!c.s.fuel,
      ask: (c) => {
        if (c.s.fuelTold) { c.say("fuel_again"); return; }
        c.s.fuelTold = true;
        if (c.s.askPrepay) { c.say("fuel_info"); c.expect(prepayPending(true)); c.s.prepayAsked = true; c.say("ask_prepay", { price: size(c) === "minivan" ? PREPAY_VAN : size(c) === "suv" ? PREPAY_SUV : PREPAY }); return; }
        c.say("fuel_ask");
      },
      expects: ["fuel_full", "prepay_yes", "fuel_q", "ok_ack", "mileage_q", "auto_q", "fuel_no_ctx", "fuel_type_q", "fuel_price_q"],
      suggest: [{ lt: "Say you'll bring it back full", hint: "fuel" }, { lt: "Ask about the terms", hint: "questions" }],
      yes: (c) => { if (!c.s.fuel) { c.s.fuel = "full"; c.say("full_ok"); } },
      no: (c) => { if (!c.s.fuel) { c.s.fuel = "charge"; c.say("fuel_charge"); } } },
    { id: "extras", when: (c) => !!c.s.fuel && !!c.s.askExtras && c.s.extras === undefined, done: (c) => c.s.extras !== undefined,
      ask: (c) => c.say("ask_extras"), expects: ["extras_yes", "extras_no", "extras_none_ctx", "polite_no_ctx", "more_no"],
      suggest: [{ lt: "Say if you need a GPS or a child seat", hint: "extras", options: "extra" }],
      yes: offerYes((c) => { c.say("which_extra"); c.hold(); }, (c) => { c.s.extras = []; c.say("no_extras"); }),
      no: (c) => { c.s.extras = []; c.say("no_extras"); } },
    { id: "ret", when: (c) => !!c.s.fuel, done: (c) => !!c.s.retOk,
      ask: (c) => {
        const n = retN(c);
        if (c.s.retTold && n < 7) { c.say("ret_again", { X: retDay(c) }); return; }
        c.s.retTold = true;
        if (n > 7) c.say("ret_confirm_long", { num: n, X: retDay(c) });
        else c.say(n === 7 ? "ret_confirm_next" : "ret_confirm", { X: retDay(c) });
      },
      expects: ["ret_change", "ret_q", "ok_ack", "yes_right", "ret_day_ctx", "ret_cant_ctx"],
      suggest: [{ lt: "Confirm or change the return", hint: "ret" }],
      yes: (c) => { c.s.retOk = true; },
      // "No, el domingo": the day said is handled by ret_day_ctx; a bare no asks which day
      no: (c) => { if (/lunes|martes|miercoles|jueves|viernes|sabado|domingo/.test(heard(c))) return; c.expect(retDayPending()); once(c, "which", "ret_which"); } },
    { id: "sign", when: (c) => !!c.s.retOk, done: (c) => !!c.s.signed,
      ask: (c) => { c.say("ask_sign"); },
      expects: ["sign_q", "ok_ack", "hand_ctx", "here_docs", "sign_where_ctx", "contract_q"],
      suggest: [{ lt: "Sign the contract", hint: "sign" }],
      yes: (c) => { sign(c); },
      no: (c) => { c.say("sign_where"); c.hold(); } },
    // Two variants of the same moment: Andrés says where the car is (keys_spot) or not (keys → ask him).
    { id: "keys", when: (c) => !!c.s.signed && !c.s.tellSpot, done: (c) => !!c.s.keysGiven,
      ask: (c) => giveKeys(c),
      expects: ["where_car", "scratch_q", "ok_ack", "where_car_ctx"],
      suggest: [{ lt: "Ask where the car is", hint: "car" }, { lt: "Say thank you", hint: "g_social" }] },
    { id: "keys_spot", when: (c) => !!c.s.signed && !!c.s.tellSpot, done: (c) => !!c.s.keysGiven,
      ask: (c) => giveKeys(c),
      expects: ["where_car", "scratch_q", "ok_ack", "where_car_ctx"],
      suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }, { lt: "Ask about the car", hint: "car" }] },
    { id: "anything", when: (c) => !!c.s.keysGiven && !c.s.spotKnown, done: (c) => !!c.s.spotKnown,
      ask: (c) => c.say("anything_else"),
      expects: ["where_car", "more_no", "scratch_q", "where_car_ctx"],
      suggest: [{ lt: "Ask where the car is", hint: "car" }],
      yes: (c) => { c.say("which_extra"); c.hold(); },
      no: (c) => { c.s.spotKnown = true; c.say("ack_ok"); c.say(byId(size(c)).attrs!.car); } },
  ],

  init: (c) => {
    c.s.hay = c.chance(0.3);
    c.s.askSpell = c.chance(0.5);
    c.s.askUpgrade = c.chance(0.45);
    c.s.askPrepay = c.chance(0.4);
    c.s.askExtras = c.chance(0.5);
    c.s.tellSpot = c.chance(0.5);
    c.s.freeUpgrade = c.visits >= 1 && c.chance(0.3);
    c.s.firstNameTwist = c.visits >= 1 && !c.s.freeUpgrade && c.chance(0.3);
    c.s.tplTwist = c.visits >= 1 && c.chance(0.35);
  },

  start: () => { /* the first step greets */ },

  handlers: {
    have_resv(c, slots) {
      if (c.s.resv !== undefined) return;
      c.s.resv = true;
      if (slots.name) c.s.name = slots.name;
    },
    rent_walkin(c, slots, seg) {
      if (c.s.resv === true) return;
      c.s.resv = false; c.s.walkin = true;
      const d = durFrom(slots, seg);
      if (d.n) { c.s.days = d.n; if (d.day) c.s.retDay = d.day; }
      once(c, "walkin", "walkin_ok");
    },
    resv_yes_ctx(c, slots) { if (c.s.resv === undefined) c.s.resv = true; if (slots.name && c.s.resv === true && !c.s.name) c.s.name = slots.name; },
    resv_no_ctx(c) {
      if (c.s.resv !== undefined) return;
      c.s.resv = false; c.s.walkin = true;
      once(c, "walkin", "walkin_ok");
    },
    name_ctx(c, slots, seg) {
      if (c.step === "spell") { c.s.spelled = true; once(c, "sp", "ack"); return; }
      const joined = seg.tags.includes("joined");
      const name = slots.name ?? (slots.letters ? String(slots.letters) : undefined);
      // "¿Está incluido el seguro obligatorio?" at "¿Me da su apellido?" took "Obligatorio" as the surname
      if (c.s.name || !name || /^(de|a|en|por|para)$/i.test(name) || NOT_A_NAME.test(fold(name))) return;
      c.s.resv = true; c.s.name = name;
      if (slots.letters && !joined && slots.name) c.s.spelled = true;
    },
    letters_ctx(c, slots) {
      if (!c.s.name) { c.s.resv = true; c.s.name = String(slots.letters ?? "").toUpperCase() || "—"; }
      c.s.spelled = true;
    },
    here_docs(c) {
      if (c.step === "sign") { sign(c); return; }
      if (c.s.docs) return;
      // "Aquí tiene mi licencia y mi tarjeta de débito": the hold needs a credit card
      if (/\bdebito\b/.test(heard(c)) && !/credito/.test(heard(c))) { c.say("debit_no"); return; }
      if (c.step === "license" || c.s.name || c.s.days) { c.s.docs = true; c.say("docs_ok"); }
    },
    hand_ctx(c) {
      if (c.step === "sign") { sign(c); return; }
      if (!c.s.docs && c.step === "license") { c.s.docs = true; c.say("docs_ok"); }
    },
    license_q(c) { once(c, "lic", "license_fine"); },
    debit_q(c) { once(c, "debit", "debit_no"); },
    size_ctx(c, slots) {
      if (!slots.size) return;
      if (!c.s.walkin) {
        if (c.s.resv === undefined) { c.s.walkin = true; c.s.resv = false; once(c, "walkin", "walkin_ok"); }
        else return;
      }
      const changed = c.s.size && c.s.size !== slots.size;
      c.s.size = slots.size;
      if (changed && c.s.rateSaid) c.say("rate_is", { price: rate(c) });
      else if (changed) ack(c);
    },
    sizes_q(c) { c.say("size_list"); },
    party_ctx(c, slots) { const n = typeof slots.number === "number" ? slots.number : 2; c.say(n >= 5 ? "rec_big" : "rec_small"); },
    recommend_q(c) {
      // at the upgrade offer, the midsize (not the coverage)
      if (c.step === "upgrade") { c.say("upgrade_info"); return; }
      if (c.step === "insurance" || (c.s.docs && !c.s.ins)) c.say("rec_ins"); else if (!c.s.size || c.step === "size") c.say("rec_size"); else c.say("rec_ins");
    },
    usd_q(c) { once(c, "usd", "usd"); },
    driver_q(c) { once(c, "driver", "driver_ok"); },
    ac_q(c) { once(c, "ac", "ac_yes"); },
    tpl_card_ctx(c) { if (c.step === "tpl" && !c.s.tplOk) once(c, "tplcard", "tpl_card"); },
    passport_q(c) { once(c, "pass", "passport_ok"); },
    deposit_echo_ctx(c) { c.say("deposit_amount", { deposit: depositOf(c) }); },
    deposit_much_ctx(c) {
      if (c.s.ins === "full" || c.s.keysGiven) { c.say("deposit_why"); return; }
      c.expect(lowerPending());
      c.say("deposit_lower", { price: FULL_COVERAGE, deposit: DEPOSIT_FULL });
    },
    fuel_type_q(c) { c.say("fuel_type"); },
    fuel_price_q(c) { c.say("fuel_price"); },
    hours_q(c) { c.say("hours"); },
    contract_q(c) { c.say("contract"); },
    upgrade_q(c) { c.say("upgrade_info"); },
    extras_none_ctx(c) { rental.handlers.extras_no(c, {}, { intent: "extras_no", slots: {}, tags: [] }); },
    ret_cant_ctx(c, slots) {
      if (typeof slots.day === "string" && slots.day !== retDay(c)) { ack(c); return; }
      c.expect(retDayPending()); once(c, "which", "ret_which");
    },
    fuel_no_ctx(c) {
      if (c.s.fuel) return;
      // after the prepay offer, "No, lo devuelvo lleno" (the comma is lost) is the likelier reading; "No lo voy a
      // llenar" is not a full tank: ask about the prepaid one
      if (c.s.prepayAsked) {
        if (/^no lo (devuelvo|voy a devolver|regreso|entrego|traigo) (lleno|con el tanque lleno)\b/.test(words(c))) { c.s.fuel = "full"; c.say("full_ok"); }
        else { c.expect(prepayPending()); c.say("prepay_confirm"); }
        return;
      }
      // "No lo devuelvo lleno" or "No, lo devuelvo lleno"? (the comma is lost): ask again
      if (/^\W*no,? lo (devuelvo|regreso|entrego|traigo) (lleno|con el tanque lleno)\W*$/.test(heard(c))) { c.say("yes_or_no"); c.hold(); return; }
      c.s.fuel = "charge"; c.say("fuel_charge");
    },
    days_ctx(c, slots, seg) {
      const T = turn(c);
      if (T.daysSet) return; // "por" + "tres días" may come as two segments
      const d = durFrom(slots, seg);
      if (!d.n) return;
      T.daysSet = true;
      c.s.days = d.n;
      if (d.day) c.s.retDay = d.day;
    },
    ins_full(c) {
      if (!c.s.docs || c.s.ins === "full" || c.s.keysGiven) return;
      // "¿Y si quiero la cobertura amplia?" / "¿Y si la quiero después?": a question, not the choice
      if (whatIf(c)) {
        if (!c.s.ins) { c.say("ask_insurance_again"); c.hold(); return; }
        c.expect(lowerPending()); c.say("deposit_lower", { price: FULL_COVERAGE, deposit: DEPOSIT_FULL }); return;
      }
      // a change of mind after the deposit was said: the lower deposit too
      const after = !!c.s.ins && !!c.s.depositTold;
      c.s.ins = "full"; c.say("ins_full_ok");
      if (after) c.say("deposit_now", { deposit: DEPOSIT_FULL });
    },
    ins_yes_ctx(c) { rental.handlers.ins_full(c, {}, { intent: "ins_full", slots: {}, tags: [] }); },
    ins_basic(c) { if (!c.s.ins && c.s.docs) { c.s.ins = "basic"; c.say("ins_basic_ok"); } },
    ins_no_ctx(c) { rental.handlers.ins_basic(c, {}, { intent: "ins_basic", slots: {}, tags: [] }); },
    ins_own(c) {
      // During the twist: a card never covers the mandatory liability insurance
      if (c.step === "tpl" && !c.s.tplOk) { once(c, "tplcard", "tpl_card"); return; }
      // before the twist is told (at the upgrade offer): not "el seguro obligatorio ya está incluido"
      if (twistUntold(c)) { once(c, "check", "check_first"); return; }
      if (!c.s.ins && c.s.docs) { c.s.ins = "card"; c.say("ins_card_ok"); }
    },
    ins_what(c, slots, seg) {
      // a twist reservation before Andrés has checked it: never "ya está incluido" (the twist says it isn't)
      if (twistUntold(c)) { once(c, "check", "check_first"); return; }
      if (c.step === "tpl" && !c.s.tplOk) { rental.handlers.tpl_q(c, slots, seg); return; }
      const h = heard(c);
      if (/deducible/.test(h)) c.say("deductible");
      else if (/cuanto|\bcar[oa]\b/.test(h)) c.say("price_day", { price: FULL_COVERAGE });
      else if (/(esta|va) incluido|incluye el seguro|incluye seguro|trae (el )?seguro|el seguro (esta|va)/.test(h)) c.say("ins_included");
      else if (/obligatori|necesari|necesito/.test(h)) c.say("ins_optional");
      else c.say("cover_info");
    },
    tpl_q(c, slots, seg) {
      if (c.step !== "tpl" || c.s.tplOk) {
        if (twistUntold(c)) { if (c.s.docs) once(c, "check", "check_first"); return; }
        if (c.s.docs) c.say(/obligatori|opcional/.test(heard(c)) ? "ins_optional" : "ins_included");
        return;
      }
      const h = heard(c);
      if (/si no lo/.test(h)) tplRequired(c);
      else if (/por que|porque|incluid|internet|pagina/.test(h)) c.say("tpl_why");
      else if (/que (es|cubre)/.test(h)) c.say("tpl_must");
      else if (/cuanto/.test(h)) c.say("tpl_price", { price: TPL });
      else c.say("tpl_must");
    },
    tpl_refuse_ctx(c) {
      if (c.step !== "tpl" || c.s.tplOk) return;
      // "Lo pago todo" (I'll pay it all) matches "Lo pagué todo" (the engine reads pagué as a form of pago): only the
      // past is a complaint
      if (/\bpago\b/.test(words(c)) && !paidPast(c) && !/\bno\b/.test(words(c))) { tplAccept(c); return; }
      const h = heard(c);
      if (/internet|pagina|decia|dice|dijeron|avisaron|pague|pagado|reservacion|precio/.test(h) && !c.s.tplSorry) { c.s.tplSorry = true; c.say("tpl_sorry"); }
      else tplRequired(c);
    },
    tpl_leave_ctx(c) {
      if (c.step !== "tpl" || c.s.tplOk) return;
      // "¿Y si cancelo?" (the "si" folds to "sí"): a question, never the end of the rental
      if (whatIf(c)) { rental.handlers.cancel_q_ctx(c, {}, { intent: "cancel_q_ctx", slots: {}, tags: [] }); return; }
      c.s.left = true; c.say("tpl_leave"); c.end();
    },
    cancel_q_ctx(c) {
      if (c.step !== "tpl" || c.s.tplOk) return;
      c.expect(cancelPending()); c.say("tpl_cancel_q");
    },
    deposit_q(c) {
      const h = heard(c);
      if (/cuando|liber|devuelv|regres|recuper|tarda/.test(h)) { c.say("deposit_back"); return; }
      if (/cargo|retencion|bloqueo|cobra/.test(h)) { c.say("deposit_hold"); return; }
      if (/por que|para que/.test(h)) { c.say("deposit_why"); return; }
      if (!c.s.ins) { c.say("deposit_amount", { deposit: DEPOSIT_BASIC }); return; }
      c.say("deposit_amount", { deposit: depositOf(c) });
    },
    fuel_q(c, slots, seg) {
      if (/gasolinera|cargar|poner gasolina|echar gasolina/.test(heard(c))) { c.say("gas_station"); return; }
      // "¿Y si no lo lleno?": the charge, nothing recorded
      if (allTags(slots, seg).includes("ifnot")) { c.say("fuel_charge"); return; }
      c.say("fuel_info");
    },
    fuel_full(c) {
      if (c.s.fuel === "full") { once(c, "fullagain", "full_ok"); return; } // said again: confirm, don't ask the next question twice
      if (c.s.fuel !== "prepaid") { c.s.fuel = "full"; c.s.fuelTold = true; c.say("full_ok"); }
    },
    prepay_yes(c) {
      if (c.s.fuel === "prepaid") return;
      // never charged before its price is said (or on "¿Y si lo pago por adelantado?"): quote the tank first
      if (!c.s.prepayAsked || whatIf(c)) { c.s.fuelTold = true; c.expect(prepayPending()); c.s.prepayAsked = true; c.say("prepay_quote", { price: size(c) === "minivan" ? PREPAY_VAN : size(c) === "suv" ? PREPAY_SUV : PREPAY }); return; }
      c.s.fuel = "prepaid"; c.say("prepay_ok");
    },
    mileage_q(c) { c.say("mileage"); },
    auto_q(c) {
      if (!c.s.size && c.s.walkin) { c.say("auto_all"); return; }
      if (size(c) === "economy" && !c.s.keysGiven) { c.expect(manualPending()); c.say("economy_manual", { price: byId("compact").attrs!.rate }); return; }
      c.say("automatic");
    },
    extras_yes(c, slots, seg) {
      const tags = allTags(slots, seg);
      let ids: string[] = [];
      if (tags.includes("both")) ids = ["gps", "child_seat"];
      else if (tags.includes("kid")) ids = ["child_seat"];
      else {
        const x = slots.extra;
        ids = (Array.isArray(x) ? x : x ? [x] : []).filter((v: any) => typeof v === "string");
        ids = [...new Set(ids)];
      }
      if (!ids.length) { c.say("which_extra"); c.hold(); return; }
      ids = ids.filter((id) => !(c.s.extras ?? []).includes(id));
      if (!ids.length) { c.say("extra_added"); return; }
      const p = extraPending(ids);
      c.expect(p); p.ask!(c);
    },
    extras_no(c) { if (c.s.extras === undefined && !c.s.keysGiven) { c.s.extras = []; c.say("no_extras"); } },
    ret_change(c, slots, seg) {
      const tags = allTags(slots, seg);
      if (tags.includes("airport")) {
        if (c.s.retPlace === "airport") { c.say("ret_where_airport"); return; }
        c.expect(airportPending()); c.say("ret_airport_q", { price: AIRPORT }); return;
      }
      if (tags.includes("other")) { c.say("ret_other"); return; }
      if (tags.includes("early")) { c.say("ret_early"); return; }
      if (tags.includes("extra_day")) { changeTo(c, Math.min(30, retN(c) + 1)); return; }
      if (typeof slots.day === "string") { changeDay(c, slots.day, /hasta|quedar|tener|necesito|quiero/.test(heard(c))); return; }
      retAnswer(c);
    },
    ret_day_ctx(c, slots) {
      const d = slots.day;
      if (typeof d !== "string" || d === retDay(c)) { c.s.retOk = true; ack(c); return; }
      changeDay(c, d);
    },
    ret_q(c, slots, seg) {
      const h = heard(c);
      if (/tarde|retras|tolerancia|gracia/.test(h) || allTags(slots, seg).includes("late")) { c.say("late_info"); return; }
      if (/donde/.test(h)) { c.say(c.s.retPlace === "airport" ? "ret_where_airport" : "ret_where"); return; }
      // the day and time were just said: that settles the return question
      c.s.retTold = true; c.s.retOk = true;
      retAnswer(c);
    },
    airport_yes_ctx(c) { c.say("ack"); },
    airport_no_ctx(c) { c.say("ack"); },
    sign_q(c) { c.say("sign_where"); if (c.step === "sign") sign(c); },
    sign_where_ctx(c) { rental.handlers.sign_q(c, {}, { intent: "sign_q", slots: {}, tags: [] }); },
    where_car(c) {
      if (!c.s.keysGiven) { c.say("lot_where"); return; }
      c.s.spotKnown = true;
      c.say(byId(size(c)).attrs!.car);
      if (c.chance(0.5)) c.say("lot_where");
    },
    where_car_ctx(c, slots, seg) { rental.handlers.where_car(c, slots, seg); },
    scratch_q(c) {
      if (/(ver|revisar) el/.test(heard(c)) && !/si /.test(heard(c))) { c.say("see_car"); return; }
      if (/^(hay|tiene|el|la)\b|tiene un|esta (rayad|golpead)/.test(heard(c).replace(/^(oiga|disculpe|perdon|mire)\s+/, ""))) { c.say("scratch_noted"); return; }
      c.say("scratch_info");
    },
    price_q(c, slots, seg) {
      const h = heard(c);
      const total = allTags(slots, seg).includes("total");
      if (!total && (c.step === "upgrade" || (/(mas|extra|diferencia|intermedio|cambio)/.test(h) && c.s.upgradeQuoted && c.s.upgrade === undefined))) { c.say("price_more", { price: UPGRADE }); return; }
      // a twist reservation before Andrés has checked it: no price "with the mandatory insurance included" yet
      if (twistUntold(c)) { once(c, "check", "check_first"); return; }
      if (c.step === "tpl" && !c.s.tplOk) { c.say("tpl_price", { price: TPL }); return; }
      // "¿Cuánto es en total?": the daily cost, never the deposit or the coverage's price alone
      if (total) { sayTotal(c); return; }
      if (c.step === "insurance") { c.say("price_day", { price: FULL_COVERAGE }); return; }
      if (c.step === "deposit") { c.say("deposit_amount", { deposit: depositOf(c) }); return; }
      if (slots.size) { c.say("rate_size", { X: slots.size, price: byId(slots.size).attrs!.rate }); return; }
      // a walk-in who hasn't chosen yet: the price of which car
      if (c.s.walkin && !c.s.size) { c.say("rate_size", { X: "compact", price: byId("compact").attrs!.rate }); return; }
      c.say("rate_is", { price: rate(c) });
      // said now: the documents step doesn't say it again
      if (c.s.walkin) c.s.rateSaid = true;
    },
    polite_no_ctx(c) { stepOf(c)?.no?.(c); },
    pricey_ctx(c) { if (c.step === "upgrade") upgradeNo(c); },
    manual_ok_ctx(c) { ack(c); },
    more_no(c) {
      if (c.step === "anything" && !c.s.spotKnown) { c.s.spotKnown = true; once(c, "ackok", "ack_ok"); c.say(byId(size(c)).attrs!.car); return; }
      if (c.step === "extras" && c.s.extras === undefined) { c.s.extras = []; c.say("no_extras"); }
    },
    keep_size(c, slots, seg) {
      // A walk-in changing the car before signing ("Mejor un compacto" after "Son $1,400 al día"): the new car and
      // its rate; it was ignored, and the first car was rented. The upgrade offer keeps its own answers.
      const upgradeOpen = c.step === "upgrade" || (!!c.s.upgradeQuoted && c.s.upgrade === undefined);
      if (c.s.walkin && slots.size && slots.size !== c.s.size && !c.s.signed && !upgradeOpen) { rental.handlers.size_ctx(c, slots, seg); return; }
      // "Me quedo con el intermedio" is a yes to the upgrade
      if (slots.size === "midsize" && c.s.docs) { rental.handlers.upgrade_yes(c, slots, seg); return; }
      if (c.s.walkin && !c.s.size && slots.size) { c.s.size = slots.size; return; }
      if (c.s.docs && c.s.upgrade === undefined && size(c) === "compact") { if (c.step === "upgrade" || c.s.upgradeQuoted) upgradeNo(c); else ack(c); }
    },
    upgrade_yes(c) {
      if (!c.s.docs || c.s.upgrade !== undefined || c.s.keysGiven) { if (c.s.walkin && !c.s.docs) c.say("size_list"); return; }
      if (size(c) !== "compact") { c.say("size_list"); return; }
      // nothing paid before its price is said: quote the upgrade first
      if (c.step !== "upgrade" && !c.s.upgradeQuoted) { c.s.upgradeQuoted = true; c.expect(upgradePending()); c.say("ask_upgrade", { price: UPGRADE }); return; }
      upgradeYes(c);
    },
    yes_right(c) { stepOf(c)?.yes?.(c); },
    ok_ack(c) {
      // "No, está bien" / "No está bien" (commas are lost): a no, never an agreement
      if (/^(no|nop|nel)\b(?! hay problema)/.test(heard(c).replace(/^[^a-z]+/, ""))) return;
      // "Claro que no": a no ("Claro que no hay problema" is a yes)
      if (NO_OF_COURSE.test(words(c))) { if (c.step === "tpl") { tplRequired(c); c.hold(); return; } stepOf(c)?.no?.(c); return; }
      // "¿Por qué no?" to the mandatory insurance is a question, not a yes
      if (c.step === "tpl" && /^\W*por ?que no\W*$/.test(heard(c))) { c.say("tpl_why"); c.hold(); return; }
      // "Okay / está bien": agreement with what Andrés just said.
      if (c.step === "sign") { sign(c); return; }
      if (c.step === "tpl") { tplAccept(c); return; }
      if (c.step === "deposit" || c.step === "keys" || c.step === "keys_spot" || c.step === "license") return;
      stepOf(c)?.yes?.(c);
    },
  },

  finish: (c) => {
    c.complete();
    c.say("drive_safe");
    c.expect({
      id: "closing", hints: ["g_social"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { once(cc, "close", "you_welcome"); cc.end(); },
        g_bye: (cc) => { once(cc, "close", "g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); },
    });
  },

  tests: [
    // Every hint construction, then natural alternatives.
    { say: "Tengo una reservación", intent: "have_resv" },
    { say: "Reservé un auto por internet", intent: "have_resv" },
    { say: "Vengo a recoger mi auto", intent: "have_resv" },
    { say: "Quisiera rentar un auto, por favor", intent: "rent_walkin" },
    { say: "No tengo reservación", intent: "rent_walkin", not: ["have_resv"] },
    { say: "¿Tienen autos disponibles?", intent: "rent_walkin" },
    { say: "Mi apellido es Miller", intent: "name_ctx", step: "name", slots: { name: "Miller" } },
    { say: "A nombre de Miller", intent: "name_ctx", step: "name", slots: { name: "Miller" } },
    { say: "Se escribe eme i ele ele e erre", intent: "letters_ctx", step: "spell" },
    { say: "Un compacto, por favor", intent: "size_ctx", step: "size", slots: { size: "compact" } },
    { say: "Quisiera una camioneta, por favor", intent: "size_ctx", step: "size", slots: { size: "suv" } },
    { say: "Por tres días", intent: "days_ctx", step: "days" },
    { say: "Por una semana", intent: "days_ctx", step: "days" },
    { say: "Aquí tiene", intent: "hand_ctx", step: "license" },
    { say: "Aquí tiene mi licencia y mi tarjeta", intent: "here_docs" },
    { say: "¿Sirve mi licencia extranjera?", intent: "license_q" },
    { say: "¿Aceptan tarjeta de débito?", intent: "debit_q" },
    { say: "No, gracias. El compacto está bien", intent: "keep_size", step: "upgrade", not: ["upgrade_yes"] },
    { say: "Sí, cámbieme al intermedio", intent: "upgrade_yes", step: "upgrade" },
    { say: "¿Es obligatorio?", intent: "tpl_q", step: "tpl" },
    { say: "¿Por qué no estaba incluido?", intent: "tpl_q", step: "tpl" },
    { say: "Está bien, lo pago", intent: "ok_ack", step: "tpl" },
    { say: "Solo el seguro obligatorio, por favor", intent: "ins_basic", step: "insurance", not: ["ins_full"] },
    { say: "Quiero la cobertura amplia, por favor", intent: "ins_full", step: "insurance" },
    { say: "¿Qué cubre?", intent: "ins_what", step: "insurance" },
    { say: "¿Está incluido el seguro?", intent: "ins_what", step: "insurance" },
    { say: "Mi tarjeta de crédito me cubre", intent: "ins_own" },
    { say: "Está bien, no hay problema", intent: "ok_ack", step: "deposit" },
    { say: "¿Cuándo me lo devuelven?", intent: "deposit_q" },
    { say: "Lo devuelvo con el tanque lleno", intent: "fuel_full", not: ["prepay_yes"] },
    { say: "¿Hay una gasolinera cerca?", intent: "fuel_q" },
    { say: "Prefiero pagar el tanque por adelantado", intent: "prepay_yes", not: ["fuel_full"] },
    { say: "¿Dónde firmo?", intent: "sign_q", step: "sign" },
    { say: "¿Hay límite de kilometraje?", intent: "mileage_q" },
    { say: "¿Es automático?", intent: "auto_q" },
    { say: "¿Lo tengo que devolver lleno?", intent: "fuel_q" },
    { say: "¿Hay que dejar un depósito?", intent: "deposit_q" },
    { say: "No, gracias. Uso mi celular", intent: "extras_no", step: "extras", not: ["extras_yes"] },
    { say: "¿Me puede dar un GPS?", intent: "extras_yes", slots: { extra: "gps" } },
    { say: "¿Me puede dar una silla para niño?", intent: "extras_yes", slots: { extra: "child_seat" } },
    { say: "Sí, es correcto", intent: "yes_right", step: "ret" },
    { say: "¿Lo puedo devolver en el aeropuerto?", intent: "ret_change" },
    { say: "¿Qué pasa si llego tarde?", intent: "ret_q" },
    { say: "¿A qué hora lo tengo que devolver?", intent: "ret_q" },
    { say: "¿Puedo quedármelo hasta el sábado?", intent: "ret_change", slots: { day: "saturday" } },
    { say: "¿Dónde está el auto?", intent: "where_car" },
    { say: "¿Qué hago si veo un rayón?", intent: "scratch_q" },
    // Natural alternatives, short answers, accentless typing, tú to staff, Mexican and neutral words.
    { say: "Vengo por el carro que reservé", intent: "have_resv" },
    { say: "Hice la reservacion en su pagina", intent: "have_resv" },
    { say: "Miller", intent: "name_ctx", step: "name" },
    { say: "El más barato", intent: "size_ctx", step: "size", slots: { size: "economy" } },
    { say: "¿Qué carros tiene?", intent: "sizes_q", step: "size" },
    { say: "¿Cuánto cuesta una camioneta?", intent: "price_q", step: "size", slots: { size: "suv" }, not: ["size_ctx"] },
    { say: "Cinco días", intent: "days_ctx", step: "days" },
    { say: "Hasta el sábado", intent: "days_ctx", step: "days", slots: { day: "saturday" } },
    { say: "¿Tienes carros disponibles?", intent: "rent_walkin" },
    { say: "¿Necesito un permiso internacional?", intent: "license_q" },
    { say: "Tome, mi pasaporte y la licencia", intent: "here_docs", step: "license" },
    { say: "Me quedo con el compacto", intent: "keep_size", step: "upgrade", not: ["upgrade_yes"] },
    { say: "Claro, uno más grande", intent: "upgrade_yes", step: "upgrade" },
    { say: "Pero ya pagué en línea", intent: "tpl_refuse_ctx", step: "tpl" },
    { say: "En internet decía que todo estaba incluido", intent: "tpl_refuse_ctx", step: "tpl" },
    { say: "Sí, agrégueme la cobertura completa", intent: "ins_full", step: "insurance" },
    { say: "Sí, la quiero", intent: "ins_yes_ctx", step: "insurance" },
    { say: "agregame la cobertura amplia", intent: "ins_full", step: "insurance" },
    { say: "¿Hay deducible?", intent: "ins_what", step: "insurance" },
    { say: "¿Es un cargo o una retención?", intent: "deposit_q", step: "deposit" },
    { say: "Sí, lo devuelvo lleno", intent: "fuel_full", step: "fuel" },
    { say: "¿El kilometraje es libre?", intent: "mileage_q" },
    { say: "Los dos, por favor", intent: "extras_yes", step: "extras" },
    { say: "Tengo Google Maps en el celular", intent: "extras_no", step: "extras" },
    { say: "No, el sábado", intent: "ret_day_ctx", step: "ret", slots: { day: "saturday" } },
    { say: "¿Puedo tenerlo un día más?", intent: "ret_change", step: "ret" },
    { say: "¿Dónde lo devuelvo?", intent: "ret_q", step: "ret" },
    { say: "¿Aquí?", intent: "sign_where_ctx", step: "sign" },
    { say: "Listo, ya firmé", intent: "ok_ack", step: "sign" },
    { say: "¿Cuál es mi carro?", intent: "where_car", step: "keys" },
    { say: "Hay un golpe en la puerta", intent: "scratch_q", step: "keys" },
    { say: "¿Dónde?", intent: "where_car_ctx", step: "keys" },
    { say: "Eso sería todo", intent: "more_no", step: "anything" },
    // Spain forms are correct, with no dialect correction.
    { say: "Me gustaría alquilar un coche", intent: "rent_walkin" },
    { say: "¿Tenéis coches libres?", intent: "rent_walkin" },
    { say: "Este es mi carné de conducir", intent: "here_docs", step: "license" },
    { say: "Vale, el intermedio", intent: "upgrade_yes", step: "upgrade" },
    { say: "Tengo Google Maps en el móvil", intent: "extras_no", step: "extras" },
    // Meaning safety: nothing booked, charged or refused that wasn't said.
    { say: "No reservé", intent: "rent_walkin", step: "resv", not: ["have_resv"] },
    { say: "No vengo a rentar un carro", intent: "none", step: "resv" },
    { say: "No traigo mi licencia", intent: "none", step: "license" },
    { say: "No necesito uno más grande", intent: "keep_size", step: "upgrade", not: ["upgrade_yes"] },
    { say: "No quiero el intermedio", intent: "keep_size", step: "upgrade", not: ["upgrade_yes"] },
    { say: "No quiero pagar ese seguro", intent: "tpl_refuse_ctx", step: "tpl", not: ["ok_ack"] },
    { say: "Entonces no voy a rentar el carro", intent: "tpl_leave_ctx", step: "tpl", not: ["rent_walkin", "ok_ack"] },
    { say: "No necesito la cobertura amplia", intent: "ins_basic", step: "insurance", not: ["ins_full"] },
    { say: "La cobertura amplia no", intent: "ins_no_ctx", step: "insurance", not: ["ins_full"] },
    { say: "¿Cuánto cuesta la cobertura amplia?", intent: "ins_what", step: "insurance", not: ["ins_full"] },
    { say: "No quiero pagar por adelantado", intent: "fuel_full", step: "fuel", not: ["prepay_yes"] },
    { say: "No lo voy a devolver vacío", intent: "none", step: "fuel" },
    { say: "No necesito GPS", intent: "extras_no", step: "extras", not: ["extras_yes"] },
    { say: "No quiero la silla", intent: "extras_no", step: "extras", not: ["extras_yes"] },
    { say: "No lo voy a devolver en el aeropuerto", intent: "none", step: "ret" },
    { say: "No el viernes, el sábado", intent: "ret_day_ctx", step: "ret", slots: { day: "saturday" } },
    { say: "No hay rayones", intent: "none", step: "keys" },
    { say: "No quiero una camioneta, un compacto", intent: "size_ctx", step: "size", slots: { size: "compact" } },
    { say: "Solo tengo tarjeta de débito", intent: "debit_q", step: "license", not: ["here_docs", "hand_ctx"] },
    { say: "No necesito nada más", intent: "more_no", step: "anything", not: ["extras_yes"] },
    // Questions and answers added after the probes.
    { say: "Sí, a nombre de Miller", intent: "resv_yes_ctx", step: "resv", slots: { name: "Miller" } },
    { say: "Somos cinco personas", intent: "party_ctx", step: "size" },
    { say: "¿Qué me recomienda?", intent: "recommend_q", step: "size" },
    { say: "¿Necesitan mi pasaporte?", intent: "passport_q", step: "license" },
    { say: "Es mucho dinero", intent: "deposit_much_ctx", step: "deposit" },
    { say: "¿Qué gasolina usa?", intent: "fuel_type_q", step: "fuel" },
    { say: "No lo voy a llenar", intent: "fuel_no_ctx", step: "fuel", not: ["fuel_full", "prepay_yes"] },
    { say: "No quiero GPS ni silla", intent: "extras_no", step: "extras", not: ["extras_yes"] },
    { say: "El viernes no puedo", intent: "ret_cant_ctx", step: "ret", not: ["yes_right", "ret_day_ctx"] },
    { say: "¿A qué hora cierran?", intent: "hours_q" },
    { say: "¿Qué estoy firmando?", intent: "contract_q", step: "sign" },
    { say: "¿Es más grande?", intent: "upgrade_q", step: "upgrade" },
    { say: "Bueno, ni modo", intent: "ok_ack", step: "tpl" },
    { say: "No sabía", intent: "tpl_refuse_ctx", step: "tpl" },
    { say: "Tengo un bebé", intent: "extras_yes", step: "extras" },
    { say: "Tengo una pregunta", intent: "none", step: "resv", not: ["have_resv"] },
    { say: "No quiero pagar más", intent: "polite_no_ctx", step: "upgrade", not: ["upgrade_yes"] },
    { say: "No me interesa la cobertura amplia", intent: "ins_basic", step: "insurance", not: ["ins_full"] },
    // Review: questions, declines and corrections the draft missed or misread.
    { say: "¿La cobertura amplia es cara?", intent: "ins_what", step: "insurance", not: ["ins_basic", "ins_no_ctx", "ins_full"] },
    { say: "No, gracias, así está bien", intent: "polite_no_ctx", step: "insurance", not: ["ins_full", "ins_yes_ctx"] },
    { say: "Así estoy bien, gracias", intent: "polite_no_ctx", step: "upgrade", not: ["upgrade_yes"] },
    { say: "No, gracias, es caro", intent: "pricey_ctx", step: "upgrade", not: ["upgrade_yes"] },
    { say: "¿Cuánto cuesta el más grande?", intent: "price_q", step: "upgrade", not: ["upgrade_yes"] },
    { say: "¿Tiene algo más grande?", intent: "upgrade_yes", step: "insurance", not: ["rent_walkin"] },
    { say: "El económico", intent: "size_ctx", step: "size", slots: { size: "economy" } },
    { say: "Ok, el compacto", intent: "size_ctx", step: "size", slots: { size: "compact" } },
    { say: "Por dos semanas", intent: "days_ctx", step: "days" },
    { say: "¿Puedo pagar con débito?", intent: "debit_q", step: "license", not: ["here_docs", "hand_ctx"] },
    { say: "¿Puedo pagar la garantía en efectivo?", intent: "debit_q", step: "deposit" },
    { say: "Mi tarjeta lo cubre", intent: "ins_own", step: "tpl", not: ["ok_ack"] },
    { say: "Pero ya pagué el seguro en línea", intent: "tpl_refuse_ctx", step: "tpl", not: ["ok_ack"] },
    { say: "Mejor cancelo la reservación", intent: "tpl_leave_ctx", step: "tpl", not: ["ok_ack", "have_resv"] },
    { say: "¿Lo puedo devolver en Cancún?", intent: "ret_change", step: "ret" },
    { say: "¿Y en el aeropuerto?", intent: "ret_change", step: "ret" },
    { say: "¿Y si veo un rayón?", intent: "scratch_q", step: "keys" },
    // Lead's check: what-if questions, paying twice, polite declines and corrections.
    { say: "¿Y si cancelo?", intent: "cancel_q_ctx", step: "tpl", not: ["tpl_leave_ctx"] },
    { say: "¿Puedo cancelar la reservación?", intent: "cancel_q_ctx", step: "tpl", not: ["tpl_leave_ctx"] },
    { say: "No quiero cancelar", intent: "none", step: "tpl" },
    { say: "Cancélela, por favor", intent: "tpl_leave_ctx", step: "tpl" },
    { say: "Pagué todo", intent: "tpl_refuse_ctx", step: "tpl", not: ["ok_ack"] },
    { say: "Todo está pagado", intent: "tpl_refuse_ctx", step: "tpl", not: ["ok_ack"] },
    { say: "No lo acepto", intent: "tpl_refuse_ctx", step: "tpl", not: ["ok_ack"] },
    { say: "Claro que no hay problema", intent: "ok_ack", step: "tpl" },
    { say: "No, está bien así", intent: "polite_no_ctx", step: "upgrade", not: ["upgrade_yes", "ok_ack"] },
    { say: "Déjelo así, gracias", intent: "polite_no_ctx", step: "insurance", not: ["ins_full", "ins_yes_ctx"] },
    { say: "Mejor el compacto", intent: "keep_size", step: "upgrade", not: ["upgrade_yes"] },
    { say: "El GPS, por favor", intent: "extras_yes", step: "extras", slots: { extra: "gps" } },
    { say: "No necesito el GPS, pero sí la silla", intent: "extras_yes", step: "extras", slots: { extra: "child_seat" }, not: ["extras_no"] },
    { say: "No tengo tiempo de llenarlo", intent: "fuel_no_ctx", step: "fuel", not: ["fuel_full", "prepay_yes"] },
    { say: "¿Y si no lo lleno?", intent: "fuel_q", step: "fuel", not: ["fuel_full", "prepay_yes"] },
    { say: "No puedo devolverlo el viernes", intent: "ret_cant_ctx", step: "ret", not: ["ret_change", "yes_right"] },
    { say: "Hasta el domingo", intent: "ret_day_ctx", step: "ret", slots: { day: "sunday" } },
    // Audit (5 Nov 2026): questions a renter asks, the total, a walk-in's change of car, the card at the twist.
    { say: "¿Qué es la cobertura amplia?", intent: "ins_what", step: "insurance", not: ["ins_full", "ins_yes_ctx"] },
    { say: "¿Vale la pena?", intent: "recommend_q", step: "insurance", not: ["ins_full", "ok_ack"] },
    { say: "¿Cuánto es en total?", intent: "price_q", step: "deposit", not: ["deposit_q", "ok_ack"] },
    { say: "¿Cuánto me sale en total?", intent: "price_q", step: "ret" },
    { say: "¿Cuánto le debo?", intent: "price_q", step: "sign", not: ["ok_ack"] },
    { say: "¿Aceptan dólares?", intent: "usd_q", step: "license", not: ["here_docs", "hand_ctx"] },
    { say: "¿Puedo pagar en dólares?", intent: "usd_q" },
    { say: "¿Mi esposa también puede manejar?", intent: "driver_q", step: "license", not: ["here_docs"] },
    { say: "¿Puedo agregar otro conductor?", intent: "driver_q" },
    { say: "¿Tiene aire acondicionado?", intent: "ac_q" },
    { say: "¿Lo puedo devolver antes?", intent: "ret_change", step: "ret", not: ["yes_right", "ok_ack"] },
    { say: "¿Y si llego a las seis?", intent: "ret_q", step: "ret", not: ["yes_right", "ok_ack"] },
    { say: "¿Lo puedo devolver en la noche?", intent: "ret_q", step: "ret", not: ["yes_right"] },
    { say: "¿Mi tarjeta no lo cubre?", intent: "tpl_card_ctx", step: "tpl", not: ["ok_ack", "ins_own"] },
    { say: "Mejor un compacto", intent: "size_ctx", step: "days", slots: { size: "compact" } },
    { say: "Necesito un carro por un mes", intent: "rent_walkin", step: "resv", not: ["have_resv"] },
    { say: "Por un mes", intent: "days_ctx", step: "days" },
    { say: "Una camioneta", intent: "size_ctx", step: "license", not: ["here_docs", "hand_ctx"] },
    { say: "Mi esposa no va a manejar", intent: "none", step: "license" },
    { say: "El carro no tiene aire", intent: "none", step: "keys" },
    { say: "Mi tarjeta no me cubre", intent: "none", step: "insurance" },
    // Not understood: no free-text catch-all.
    { say: "Miller", intent: "none" },
    { say: "Mi perro come plátanos azules", intent: "none" },
    { say: "bicicleta ventana guitarra", intent: "none" },
    { say: "Ayer fui a la playa con mi hermana", intent: "none" },
  ],
  sims: [
    { name: "reservation, basic insurance, asks about the deposit and the return",
      turns: ["Hola, tengo una reservación", "Miller", "Aquí tiene mi licencia y mi tarjeta", "Solo el seguro obligatorio", "¿Cuándo me lo devuelven?",
        "Sí, lo devuelvo lleno", "¿A qué hora lo tengo que devolver?", "Claro", "¿Dónde está el carro?", "¡Muchas gracias!"],
      auto: omit(["resv", "name", "license", "insurance", "fuel", "sign"]),
      setup: (s) => { s.tplTwist = false; s.freeUpgrade = false; s.firstNameTwist = false; s.askPrepay = false; s.askUpgrade = false; s.askExtras = false; s.tellSpot = false; },
      expect: { complete: true, state: { ins: "basic", fuel: "full", signed: true, keysGiven: true, spotKnown: true } } },
    { name: "walk-in, SUV for five days, full coverage, gas station, airport",
      turns: ["Buenos días, quisiera rentar un carro", "Una camioneta, por favor", "Por cinco días", "Aquí tiene", "¿Qué cubre?", "Quiero la cobertura amplia",
        "Está bien", "¿Hay una gasolinera cerca?", "Lo regreso con el tanque lleno", "¿Lo puedo devolver en el aeropuerto?", "Sí, en el aeropuerto", "¿Dónde firmo?", "Gracias"],
      auto: omit(["resv", "size", "days", "license", "insurance", "fuel", "airport", "sign"]),
      setup: (s) => { s.hay = false; s.askPrepay = false; s.askExtras = false; },
      expect: { complete: true, state: { walkin: true, size: "suv", days: 5, ins: "full", retPlace: "airport", retDay: undefined } } },
    { name: "questions and a change of mind: license, automatic, mileage, card, keep it to Saturday",
      turns: ["Tengo una reserva a nombre de Miller", "¿Sirve mi licencia de Estados Unidos?", "Aquí tiene", "Mi tarjeta de crédito me cubre", "¿Es automático?", "¿Hay límite de kilómetros?",
        "Sí, lo devuelvo lleno", "¿Me lo puedo quedar hasta el sábado?", "Sí, cámbielo al sábado", "Listo", "¿Qué hago si veo un rayón?", "No, es todo, gracias"],
      auto: omit(["resv", "name", "license", "insurance", "fuel", "ret_more", "anything"]),
      setup: (s) => { s.tplTwist = false; s.freeUpgrade = false; s.firstNameTwist = false; s.askPrepay = false; s.askUpgrade = false; s.askExtras = false; s.tellSpot = false; },
      expect: { complete: true, state: { ins: "card", retDay: "saturday", fuel: "full" } } },
    { name: "the mandatory insurance the website left out (twist forced)",
      turns: ["Tengo una reservación", "Miller", "Aquí tiene", "¿Es obligatorio?", "Pero ya pagué en línea", "Está bien, lo pago", "No, gracias", "Está bien", "Sí, lo devuelvo lleno", "Sí, es correcto", "Claro", "Gracias"],
      auto: omit(["resv", "name", "license", "tpl", "insurance", "deposit", "fuel", "ret", "sign"]),
      setup: (s) => { s.tplTwist = true; s.freeUpgrade = false; s.firstNameTwist = false; s.askPrepay = false; s.askUpgrade = false; s.askExtras = false; s.askSpell = false; },
      expect: { complete: true, state: { tplOk: true, ins: "basic" } } },
    { name: "the mandatory insurance: the card doesn't cover it (twist forced)",
      turns: ["Tengo una reservación", "Miller", "Aquí tiene mi licencia", "Mi tarjeta me cubre", "Ok, entiendo", "Quiero la cobertura amplia", "Gracias"],
      auto: omit(["resv", "name", "license", "tpl", "insurance"]),
      setup: (s) => { s.tplTwist = true; s.freeUpgrade = false; s.firstNameTwist = false; s.askUpgrade = false; s.askSpell = false; },
      expect: { complete: true, state: { tplOk: true, ins: "full" } } },
    { name: "free upgrade: no compacts left (twist forced)",
      turns: ["Tengo una reservación", "Miller", "Aquí tiene", "¡Qué bien, gracias!", "Solo el básico, por favor", "Gracias"],
      auto: omit(["resv", "name", "license", "free_up", "insurance"]),
      setup: (s) => { s.freeUpgrade = true; s.tplTwist = false; s.firstNameTwist = false; s.askSpell = false; },
      expect: { complete: true, state: { upgrade: "free", size: "midsize", ins: "basic" } } },
    { name: "reservation under the first name (twist forced)",
      turns: ["Tengo una reservación", "Miller", "Aquí tiene", "Solo el seguro obligatorio", "Gracias"],
      auto: omit(["resv", "name", "license", "insurance"]),
      setup: (s) => { s.firstNameTwist = true; s.freeUpgrade = false; s.tplTwist = false; s.askSpell = false; },
      expect: { complete: true, state: { foundSaid: true, ins: "basic" } } },
    { name: "short answers, upgrade offered and declined",
      turns: ["Tengo una reserva", "Miller", "eme i ele ele e erre", "Aquí tiene", "No, gracias", "No, gracias", "Está bien", "Sí", "Sí", "Claro", "Gracias"],
      auto: {},
      setup: (s) => { s.hay = false; s.askSpell = true; s.askUpgrade = true; s.tplTwist = false; s.freeUpgrade = false; s.firstNameTwist = false; s.askPrepay = false; s.askExtras = false; s.tellSpot = true; },
      expect: { complete: true, state: { upgrade: "no", ins: "basic", fuel: "full", spelled: true } } },
    { name: "the deposit is too high: full coverage after all; Friday doesn't work, Saturday instead",
      turns: ["Tengo una reservación", "Miller", "Aquí tiene", "No, gracias", "Es mucho dinero", "Sí, por favor", "Sí, lo devuelvo lleno", "No, el viernes no puedo", "El sábado", "Está bien", "Claro", "Gracias"],
      auto: omit(["resv", "name", "license", "insurance", "deposit", "lower", "fuel", "ret", "ret_day", "ret_more", "sign"]),
      setup: (s) => { s.tplTwist = false; s.freeUpgrade = false; s.firstNameTwist = false; s.askUpgrade = false; s.askPrepay = false; s.askExtras = false; s.askSpell = false; },
      expect: { complete: true, state: { ins: "full", retDay: "saturday", fuel: "full" } } },
    { name: "walk-in economy car: a manual, switched to the automatic compact; a GPS and a prepaid tank",
      turns: ["No tengo reservación", "El más barato", "Una semana", "Aquí tiene", "¿Es automático?", "Sí, por favor", "Solo el obligatorio", "Está bien",
        "Prefiero pagar el tanque por adelantado", "Sí", "Quisiera un GPS", "Sí", "Sí, es correcto", "Claro", "Gracias"],
      auto: omit(["resv", "size", "days", "license", "estandar", "insurance", "deposit", "prepay", "fuel", "extra_add", "extras", "ret", "sign"]),
      setup: (s) => { s.hay = false; s.askPrepay = false; s.askExtras = true; s.askUpgrade = false; s.freeUpgrade = false; },
      expect: { complete: true, state: { size: "compact", days: 7, fuel: "prepaid" } } },
    // Review: offers answered with "Está bien, gracias" (asked again) and "Así está bien" (a no): nothing paid is added.
    { name: "offers declined politely: 'Está bien, gracias' is asked again, 'Así está bien' is a no",
      turns: ["Tengo una reservación", "Miller", "Aquí tiene", "Está bien, gracias", "No, gracias", "Así está bien", "Está bien",
        "Está bien, gracias", "No, gracias", "Está bien, gracias", "No", "Sí, es correcto", "Claro", "Gracias"],
      auto: {},
      setup: (s) => { s.hay = false; s.askSpell = false; s.askUpgrade = true; s.askPrepay = true; s.askExtras = true; s.tellSpot = true; s.tplTwist = false; s.freeUpgrade = false; s.firstNameTwist = false; },
      expect: { complete: true, state: { upgrade: "no", size: undefined, ins: "basic", fuel: "full" } } },
    { name: "the mandatory insurance refused: '¿Por qué no?' is a question, 'Claro que no' a no, then cancelled (twist forced)",
      turns: ["Tengo una reservación", "Miller", "Aquí tiene", "¿Por qué no?", "No, gracias", "Claro que no", "Mejor cancelo"],
      auto: {},
      setup: (s) => { s.hay = false; s.askSpell = false; s.tplTwist = true; s.freeUpgrade = false; s.firstNameTwist = false; s.askUpgrade = false; },
      expect: { complete: false, state: { left: true, tplOk: undefined, ins: undefined } } },
    { name: "walk-in for ten days: back in days, not a weekday; an earlier day is free; the manual kept",
      turns: ["Quisiera rentar un auto", "El económico", "Diez días", "Aquí tiene", "¿Es automático?", "No, así está bien, sé manejar estándar", "Solo el obligatorio",
        "Está bien", "Sí, lo devuelvo lleno", "¿Lo puedo devolver el miércoles?", "Claro", "Gracias"],
      auto: omit(["resv", "size", "days", "license", "estandar", "insurance", "deposit", "fuel", "ret", "sign"]),
      setup: (s) => { s.hay = false; s.askPrepay = false; s.askExtras = false; s.askUpgrade = false; s.freeUpgrade = false; s.tellSpot = true; },
      expect: { complete: true, state: { size: "economy", days: 10, retN: 8, retDay: "wednesday", ins: "basic" } } },
    // Lead's check: questions and complaints that read as a yes; the or-question about the tank; prices asked again.
    { name: "the twist: '¿Y si cancelo?' is a question, 'Pagué todo' a complaint, 'Claro que no hay problema' a yes (twist forced)",
      turns: ["Tengo una reservación", "Miller", "Aquí tiene", "¿Y si cancelo?", "No", "Pagué todo", "Claro que no hay problema", "Solo el obligatorio", "Está bien",
        "Sí, lo devuelvo lleno", "Sí, es correcto", "Claro", "Gracias"],
      auto: {},
      setup: (s) => { s.hay = false; s.askSpell = false; s.tplTwist = true; s.freeUpgrade = false; s.firstNameTwist = false; s.askUpgrade = false; s.askPrepay = false; s.askExtras = false; s.tellSpot = true; },
      expect: { complete: true, state: { tplOk: true, left: undefined, ins: "basic", fuel: "full" } } },
    { name: "'Vale, gracias' and 'Muy bien, gracias' are asked again; 'Está bien' to the prepaid tank is asked again; a price asked again",
      turns: ["Tengo una reservación", "Miller", "Aquí tiene", "Vale, gracias", "No, está bien así", "Muy bien, gracias", "No", "Está bien",
        "Está bien", "No, gracias", "El GPS, por favor", "¿Cuánto es?", "Déjelo así", "Sí", "Claro", "Gracias"],
      auto: {},
      setup: (s) => { s.hay = false; s.askSpell = false; s.askUpgrade = true; s.askPrepay = true; s.askExtras = true; s.tellSpot = true; s.tplTwist = false; s.freeUpgrade = false; s.firstNameTwist = false; },
      expect: { complete: true, state: { upgrade: "no", size: undefined, ins: "basic", fuel: "full" } } },
    { name: "walk-in economy car: a debit card refused; '¿Cuánto más es?' gets the difference; 'Mejor el compacto' switches; Friday doesn't work",
      turns: ["Quiero rentar un carro", "El económico", "Tres días", "Aquí tiene mi licencia y mi tarjeta de débito", "Aquí tiene mi tarjeta de crédito", "¿Es automático?",
        "¿Cuánto más es?", "Mejor el compacto", "Solo el obligatorio", "Está bien", "Sí, lo devuelvo lleno", "No puedo devolverlo el viernes", "Hasta el domingo", "No, gracias",
        "Claro", "Gracias"],
      auto: {},
      setup: (s) => { s.hay = false; s.askUpgrade = false; s.freeUpgrade = false; s.askPrepay = false; s.askExtras = false; s.tellSpot = true; },
      expect: { complete: true, state: { walkin: true, size: "compact", ins: "basic", fuel: "full", retDay: undefined, retOk: true } } },
    // Audit (5 Nov 2026)
    { name: "the twist: insurance and price asked before it ('Enseguida lo revisamos', never 'ya está incluido'); the card asked about at the twist (twist forced)",
      turns: ["Tengo una reservación", "¿Está incluido el seguro obligatorio?", "Miller", "¿Cuánto cuesta?", "Aquí tiene", "¿Mi tarjeta no lo cubre?", "Está bien, lo pago",
        "No, gracias", "Está bien", "Sí, lo devuelvo lleno", "Sí, es correcto", "Claro", "Gracias"],
      auto: {},
      setup: (s) => { s.hay = false; s.askSpell = false; s.tplTwist = true; s.freeUpgrade = false; s.firstNameTwist = false; s.askUpgrade = false; s.askPrepay = false; s.askExtras = false; s.tellSpot = true; },
      expect: { complete: true, state: { name: "Miller", tplOk: true, ins: "basic", fuel: "full" } } },
    { name: "walk-in: an SUV, then 'Mejor un compacto' (the compact is rented, not the SUV); the total asked after full coverage; dollars and a second driver",
      turns: ["Quiero rentar un carro", "Una camioneta", "Mejor un compacto", "Tres días", "¿Aceptan dólares?", "Aquí tiene", "¿Mi esposa también puede manejar?", "Quiero la cobertura amplia",
        "¿Cuánto es en total?", "Sí, lo devuelvo lleno", "Sí, es correcto", "Claro", "Gracias"],
      auto: {},
      setup: (s) => { s.hay = false; s.askPrepay = false; s.askExtras = false; s.askUpgrade = false; s.freeUpgrade = false; s.tellSpot = true; },
      expect: { complete: true, state: { walkin: true, size: "compact", days: 3, ins: "full", fuel: "full" } } },
    { name: "Friday doesn't work: two weeks instead, quoted by the day; '¿Lo puedo devolver antes?' and '¿Y si llego a las seis?' answered",
      turns: ["Tengo una reservación", "Miller", "Aquí tiene", "No, gracias", "Está bien", "Sí, lo devuelvo lleno", "¿Lo puedo devolver antes?", "¿Y si llego a las seis?", "No",
        "Por dos semanas", "¿Cuánto es?", "Sí", "Claro", "Gracias"],
      auto: {},
      setup: (s) => { s.hay = false; s.askSpell = false; s.tplTwist = false; s.freeUpgrade = false; s.firstNameTwist = false; s.askUpgrade = false; s.askPrepay = false; s.askExtras = false; s.tellSpot = true; },
      expect: { complete: true, state: { ins: "basic", fuel: "full", retN: 14, retDay: "tuesday", retOk: true } } },
    { name: "walk-in SUV for four days: the prepaid tank is the SUV's ($1,400), its price asked again, then prepaid",
      turns: ["Quisiera rentar un auto", "Una camioneta", "Por cuatro días", "Aquí tiene", "Solo el obligatorio", "Está bien", "¿Cuánto es?", "Sí", "Sí, es correcto", "Claro", "Gracias"],
      auto: {},
      setup: (s) => { s.hay = false; s.askPrepay = true; s.askExtras = false; s.askUpgrade = false; s.freeUpgrade = false; s.tellSpot = true; },
      expect: { complete: true, state: { size: "suv", days: 4, ins: "basic", fuel: "prepaid" } } },
  ],
};

function ack(c: Ctx) { once(c, "ack", "ack"); }

export default rental;
