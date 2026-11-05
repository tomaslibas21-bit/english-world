// Resolved in the engine (2 Nov 2026): "quiero", "quisiera", "pago" and "prefiero" now start a new piece after a negative
//   one ("No tengo efectivo, | quiero pagar con tarjeta"), never right after a "no"; the patterns here stay.
// Song 70 "Please Don't Touch" → Puerto Colibrí: "No se puede tocar".
// Museo de la Costa Maya (the big white building across from the zócalo, s62): Iván at the ticket desk, Don Arturo
// the guard (twist lines only). Both say usted. The learner buys tickets (general $80; students with a valid
// credencial and people sixty and over $40; kids under twelve free), may take an audio guide ($50) and choose its
// language (Spanish, English, French, German, Italian; not Portuguese, Japanese, Chinese, Russian or Korean), pays
// (cash, card on the terminal, phone; no dollars), and finds out where the new exhibition “Colores de la noche” is
// (upstairs, on the right; included). Side questions: prices, discounts, free Sundays, photos (no flash), the
// paquetería (backpacks are left at the free bag check), shop and café, restrooms, hours, map, elevator, how long,
// guided tour, where to start.
// Keeps the English agenda (tickets → types → student ID → guide → language → pay → exhibition → more), its intents
// and twists: Don Arturo's "No se puede tocar" / "Sin flash" (visits ≥ 1) and "cerramos en 45 minutos" (visits ≥ 2).
// The brief adds a Sunday twist (visits ≥ 1): admission is free on Sundays for Mexicans and residents, not for
// visitors; a resident who shows the residence card gets in free, a tourist pays.
// Facts: hours as in s62 and s69 (ten to five, closed on Mondays); $80 general, $40 students and seniors, free on
// Sundays for Mexicans and residents, as in s62, s69 and docs/es/TOWN.md. INAH museums are free on Sundays for
// nationals and foreign residents; this museum follows that practice (a plausible town rule, kept short). Guided tour:
// Saturdays at noon, in Spanish. The audio guides go back to the ticket desk ("Taquilla · Audioguías" in the 3D room).
// The neutral text says "entrada" for the ticket (the lead, 5 Nov 2026); the Mexican one keeps "boleto".
// Money (audit, 5 Nov 2026): an extra after paying (a guide, one more ticket) is charged alone (due), a price cut after
// paying is not made ("Ya está pagado"), at most nine tickets at once, and every total up to nine tickets and nine
// guides is in the price domain (the voiced value list).

import type { Ctx, EntityDef, Handler, Pending, SituationDef } from "@/content/types";
import type { ConvCtx } from "@/convo/dialogue";
import { ent, t } from "@/content/dsl";
import { GLOBAL_HANDLERS } from "@/content/global";

// ---------------------------------------------------------------------------
// Tickets, languages

const TTYPES: EntityDef[] = [
  ent("adult", "adulto", "adult", "m", { pl: "adultos", ltPl: "adults", chip: "adulto",
    forms: ["adultos", "adulta", "adultas", "general", "generales", "entrada general", "normal", "normales", "completo", "completa", "precio completo", "mayor de edad"], attrs: { price: 8000 } }),
  ent("student", "estudiante", "student", "m", { pl: "estudiantes", ltPl: "students", chip: "estudiante",
    forms: ["estudiantes", "universitario", "universitaria", "alumno", "alumna", "de estudiante"], attrs: { price: 4000 } }),
  ent("senior", "adulto | mayor", "adult | older", "m", { pl: "adultos | mayores", ltPl: "adults | older", chip: "adulto mayor",
    forms: ["adulta mayor", "adultos mayores", "adultas mayores", "persona mayor", "personas mayores", "tercera edad", "de la tercera edad", "inapam", "jubilado", "jubilada", "jubilados", "pensionado", "pensionada"],
    attrs: { price: 4000, nat: "senior" } }),
  ent("child", "niño", "child", "m", { pl: "niños", ltPl: "children", chip: "niño",
    forms: ["nino", "ninos", "nina", "ninas", "niña", "niñas", "menor", "menores", "nene", "nena", "infantil"], attrs: { price: 0 } }),
];

const LANGS: EntityDef[] = [
  ent("spanish", "español", "Spanish", "m", { art: "", chip: "español", forms: ["espanol", "castellano"] }),
  ent("english", "inglés", "English", "m", { art: "", chip: "inglés", forms: ["ingles"] }),
  ent("french", "francés", "French", "m", { art: "", chip: "francés", forms: ["frances"] }),
  ent("german", "alemán", "German", "m", { art: "", chip: "alemán", forms: ["aleman"] }),
  ent("italian", "italiano", "Italian", "m", { art: "", chip: "italiano" }),
  ent("portuguese", "portugués", "Portuguese", "m", { art: "", chip: "portugués", forms: ["portugues"], attrs: { none: true } }),
  ent("japanese", "japonés", "Japanese", "m", { art: "", chip: "japonés", forms: ["japones"], attrs: { none: true } }),
  ent("chinese", "chino", "Chinese", "m", { art: "", chip: "chino", forms: ["mandarin"], attrs: { none: true } }),
  ent("russian", "ruso", "Russian", "m", { art: "", chip: "ruso", attrs: { none: true } }),
  ent("korean", "coreano", "Korean", "m", { art: "", chip: "coreano", attrs: { none: true } }),
  ent("dutch", "holandés", "Dutch", "m", { art: "", chip: "holandés", forms: ["holandes", "neerlandes"], attrs: { none: true } }),
  ent("polish", "polaco", "Polish", "m", { art: "", chip: "polaco", attrs: { none: true } }),
  ent("arabic", "árabe", "Arabic", "m", { art: "", chip: "árabe", forms: ["arabe"], attrs: { none: true } }),
];

const PRICE: Record<string, number> = { adult: 8000, student: 4000, senior: 4000, child: 0 };
const GUIDE = 5000;
/** At most nine tickets (and nine guides) at once: the totals Iván can say are voiced up to that (domains.price). */
const MAX_TIX = 9;

type Tix = Record<string, number>;
const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const conv = (c: Ctx) => (c as ConvCtx).conv;
const count = (tix: Tix | undefined) => Object.values(tix || {}).reduce((a, b) => a + b, 0);
const ticketsCost = (tix: Tix | undefined) => Object.entries(tix || {}).reduce((a, [k, n]) => a + (PRICE[k] ?? 0) * n, 0);
/** A resident on a Sunday gets in free: the dearest of the tickets (it is the learner's own); "Somos residentes"
 *  (resAll) frees them all. */
const resFree = (c: Ctx) => (!c.s.resident ? 0 : c.s.resAll ? ticketsCost(c.s.tix) : Math.max(0, ...Object.keys((c.s.tix as Tix) || {}).map((k) => PRICE[k] ?? 0)));
const total = (c: Ctx) => ticketsCost(c.s.tix) + GUIDE * (c.s.guides || 0) - resFree(c);
/** What is still to pay: an extra asked for after paying (a guide, one more ticket) is charged alone. */
const due = (c: Ctx) => total(c) - (c.s.paidAmt || 0);
/** The question on the table: a pending question's id, or the current step. */
const at = (c: Ctx) => conv(c).pending?.id ?? c.step;

/** Read "dos adultos y un estudiante" into { adult: 2, student: 1 }. */
function readTix(slots: any): Tix {
  const out: Tix = {};
  for (const tk of toArr(slots.tks?.tk)) {
    const tags: string[] = tk.__tags || [];
    const n = typeof tk.n === "number" ? tk.n : tags.includes("n2") ? 2 : 1;
    let tt = tk.tt ?? (tags.includes("kid") ? "child" : tags.includes("self") ? "adult" : undefined);
    // "una niña de cinco años", "un adulto de setenta": the age decides the ticket
    if (typeof tk.age === "number") tt = tk.age < 12 ? "child" : tk.age >= 60 ? "senior" : tt === "child" ? "adult" : tt;
    if (!tt || n < 1 || n > 99) continue; // ten or more: setTix says groups book ahead
    out[tt] = (out[tt] || 0) + n;
  }
  return out;
}

/** True the first time `key` happens in this utterance (an utterance may be parsed as several segments). */
function onceThisTurn(c: Ctx, key: string): boolean {
  const turn = conv(c).history.length;
  if (c.s.onceTurn !== turn) { c.s.onceTurn = turn; c.s.onceKeys = []; }
  if (c.s.onceKeys.includes(key)) return false;
  c.s.onceKeys.push(key);
  return true;
}

// Automatic answers for the simulations (keyed by step or pending id).
const AUTO: Record<string, string> = {
  tickets: "Un boleto general, por favor", types: "Solo adultos, por favor", student_id: "Aquí tiene", guide: "Sí, por favor", persuade: "Bueno, sí, una",
  lang: "En inglés, por favor", pay: "Con tarjeta", exhibit: "¿Dónde está la nueva exposición?", more: "No, es todo, gracias", harold: "¡Ay, perdón!",
  late: "Está bien", id_price: "Está bien", res_card: "Aquí tiene", amb: "General",
};

// ---------------------------------------------------------------------------

/** Anything that changes the total makes Iván say the new one. */
function changed(c: Ctx) { c.s.totalSaid = false; if (c.s.paid) c.s.paid = false; }

/** After paying, nothing is taken off the order (no refunds at the desk): Iván says it's paid. */
function lockedAfterPay(c: Ctx): boolean {
  if (!c.s.paid) return false;
  c.say("already_paid");
  return true;
}

/** Sets (or adds to) the order; false (and Iván asks again) for more than nine tickets, or for a cut after paying. */
function setTix(c: Ctx, tix: Tix, add = false): boolean {
  const cur: Tix = add ? { ...(c.s.tix || {}) } : {};
  for (const [k, n] of Object.entries(tix)) cur[k] = (cur[k] || 0) + n;
  if (count(cur) > MAX_TIX) { tooMany(c); return false; }
  if (c.s.paid && ticketsCost(cur) < ticketsCost(c.s.tix)) { c.say("already_paid"); return false; }
  c.s.tix = cur;
  c.s.qty = count(cur);
  changed(c);
  return true;
}

/** The tickets and guides not handed over yet (an extra after paying hands over only the extra). */
function handover(c: Ctx) {
  const n = count(c.s.tix) - (c.s.handTix || 0);
  if (n > 0) {
    c.say(n > 1 ? "tickets_here" : "ticket_here");
    c.event("give", { item: "museum-ticket", count: n });
  }
  c.s.handTix = Math.max(c.s.handTix || 0, count(c.s.tix));
  const g = (c.s.guides || 0) - (c.s.handGuides || 0);
  if (g > 0) {
    c.say(g > 1 ? "guides_here" : "guide_here", { X: c.s.lang || "spanish" });
    c.event("give", { item: "audio-guide", lang: c.s.lang || "spanish" });
  }
  c.s.handGuides = Math.max(c.s.handGuides || 0, c.s.guides || 0);
  if (c.s.mentionBag && !c.s.bagSaid) { c.s.bagSaid = true; c.say("bag_rule"); }
  if (c.s.mentionExhibit && !c.s.exhibitKnown) { c.s.exhibitKnown = true; c.say("exhibit_mention"); }
}

/** Paid: in cash, change only when more than the total was handed over ("Aquí tiene ochenta pesos" for $80 is exact). */
function markPaid(c: Ctx, method: string, given?: number) {
  const amount = due(c);
  c.s.paid = true;
  c.s.paidAmt = total(c);
  c.event("pay", { method, amount });
  if (method === "cash" && given !== amount) c.say("change_back");
  else c.say("paid");
  handover(c);
}

/** "¿Entrada general?" / "¿Todos son adultos?" / "¿Hay algún estudiante…?": a yes means opposite things,
 *  so the question asked is remembered and the model answers belong to it. */
function askTypes(c: Ctx, again = false) {
  const q: string = again ? "mix" : c.s.qty > 1 ? c.s.typesPref : "one";
  c.s.typesQ = q;
  c.say(q === "mix" ? "ask_types_again" : q === "one" ? "ask_type_one" : q === "all" ? "ask_type_all" : "ask_type_any");
  const adults = (cc: Ctx) => { cc.s.tix = { adult: cc.s.qty || 1 }; cc.s.typesKnown = true; changed(cc); cc.say("ack"); };
  const tellMe = (cc: Ctx) => { askTypes(cc, true); };
  c.expect({ id: "types", optional: true, expects: ["all_adults_ctx", "mixed_types_ctx", "types_ans", "buy_tickets"],
    suggest: [{ lt: q === "one" ? "Say which ticket you need" : "Say which tickets you need", hint: `types_${q}`, options: q === "mix" ? "ttype" : undefined }, { lt: "Ask about prices and discounts", hint: "prices" }],
    yes: q === "any" ? tellMe : q === "mix" ? undefined : adults,
    no: q === "any" ? adults : q === "mix" ? undefined : tellMe,
    // "Sí, los tres" at "¿Hay algún estudiante…?" doesn't say which: ask for the breakdown
    on: { all_adults_ctx: (cc, _sl, sg) => { if (q === "any" && sg.tags.includes("the_n")) tellMe(cc); else adults(cc); } } });
}

/** "No soy estudiante" / "No, soy estudiante" read the same without the comma (rule 10): at "¿Entrada general?"
 *  they book different tickets, so Iván asks which one. */
function askWhich(c: Ctx, tt: string) {
  c.say("ask_amb", { X: tt });
  const general = (cc: Ctx) => { cc.s.tix = { adult: cc.s.qty || 1 }; cc.s.typesKnown = true; changed(cc); cc.say("ack"); };
  c.expect({ id: "amb", optional: true, expects: ["buy_tickets", "im_student", "im_senior", "all_adults_ctx", "reject_type"],
    suggest: [{ lt: "Say which ticket you need", hint: "types_one" }],
    // "No soy estudiante" again, now after the choice: general
    on: { all_adults_ctx: general, reject_type: general } });
}

/** "¿Cuánto cuesta?" in answer to "¿Se anima?": the price, and the offer stays open (the guide step asks again). */
function reopenPersuade(c: Ctx) {
  if (c.s.persuaded && !c.s.guideNo && !c.s.guides && !c.s.paid) c.s.guideAsked = false;
}

/** Ten or more people: a group books ahead (and the totals stay within the voiced ones). */
function tooMany(c: Ctx) {
  c.say("group_max");
  c.hold();
}

/** A guide taken before Iván offered it: he says what it costs (rule 3), once. */
function guideCost(c: Ctx) {
  if (c.s.guidePriceSaid) return;
  c.s.guidePriceSaid = true;
  c.say("guide_cost", { price: GUIDE });
}

/** Iván makes sure the learner knows where the new exhibition is. */
function exhibitAnyway(c: Ctx) {
  if (c.s.exhibitKnown) return;
  c.s.exhibitKnown = true;
  c.say("exhibit_mention");
}

function askNext(c: Ctx) {
  for (const st of museum.steps) {
    if (st.when && !st.when(c)) continue;
    if (st.done(c)) continue;
    c.ask(st.id);
    return;
  }
}

function resYes(c: Ctx) {
  c.s.resident = true; c.s.resChecked = true; c.s.resAll = !!c.s.resPl;
  c.say("res_ok");
  changed(c);
}
function resNo(c: Ctx) { c.s.resChecked = true; c.say("res_no"); }
function resCardPending(): Pending {
  return { id: "res_card", optional: true, expects: ["have_id", "no_id", "here_you_go", "no_card_ctx"], hints: ["resident"],
    suggest: [{ lt: "Show your residence card", hint: "resident" }, { lt: "Answer yes or no", hint: "g_yesno" }],
    on: { have_id: (cc) => resYes(cc), here_you_go: (cc) => resYes(cc), no_id: (cc) => resNo(cc), no_card_ctx: (cc) => resNo(cc), im_resident: (cc) => resYes(cc) },
    yes: (cc) => resYes(cc), no: (cc) => resNo(cc) };
}

const H: Record<string, Handler> = {
  // --- tickets ---------------------------------------------------------------
  buy_tickets(c, slots, seg) {
    const tix = readTix(slots);
    // "Quiero otro de estudiante" (a type, no ticket list), "Otro boleto para mi amigo" (one more, general)
    if (!count(tix) && seg.tags.includes("add")) tix[typeof slots.tt === "string" ? slots.tt : "adult"] = 1;
    if (!count(tix)) { c.say("ask_qty"); c.hold(); return; }
    // "Dos boletos, uno de estudiante": the rest are adults
    if (typeof slots.n === "number" && slots.n > count(tix) && slots.n <= 99) tix.adult = (tix.adult || 0) + slots.n - count(tix);
    // answering "¿Hay algún estudiante…?" ("Sí, un estudiante"): the rest are adults
    if (c.step === "types" && !c.s.typesKnown && !seg.tags.includes("add")) { H.types_ans(c, slots, seg); return; }
    if (!setTix(c, tix, seg.tags.includes("add") || c.step === "more")) return;
    c.s.typesKnown = true;
    if (tix.student) c.s.idChecked = false;
    // "Un boleto general con audioguía"
    if (seg.tags.includes("guide") && !c.s.guides) { c.s.guides = 1; c.s.guideAsked = true; guideCost(c); }
    else if (c.chance(0.6)) c.say("ack");
  },
  buy_qty(c, slots, seg) {
    if (seg.tags.includes("family") && typeof slots.n !== "number") { c.say("ask_qty"); c.hold(); return; }
    const n = typeof slots.n === "number" ? slots.n : seg.tags.includes("n2") ? 2 : seg.tags.includes("n1") ? 1 : 0;
    if (n > MAX_TIX) { tooMany(c); return; }
    if (n < 1) { c.say("ask_qty"); c.hold(); return; }
    // "Dos boletos más" (or any number after paying): more general tickets, an extra after paying charged alone
    if (c.s.paid || (seg.tags.includes("more") && c.s.tix && count(c.s.tix) && c.s.typesKnown)) { if (setTix(c, { adult: n }, true)) c.say("ack"); return; }
    c.s.qty = n;
    c.s.tix = { adult: n };
    c.s.typesKnown = false;
    changed(c);
    if (seg.tags.includes("guide") && !c.s.guides) { c.s.guides = 1; c.s.guideAsked = true; guideCost(c); }
  },
  qty_ctx(c, slots, seg) { H.buy_qty(c, slots, seg); },
  types_ans(c, slots) {
    // "Uno de nosotros es estudiante" / "Un adulto y un estudiante" / "Mi amiga es estudiante"
    const said = readTix(slots);
    if (!count(said)) return;
    const known: Tix = {};
    if (c.s.typesKnown) for (const [k, n] of Object.entries((c.s.tix as Tix) || {})) if (k !== "adult") known[k] = n;
    const tix: Tix = { ...known };
    for (const [k, n] of Object.entries(said)) tix[k] = (tix[k] || 0) + n;
    if (count(tix) >= (c.s.qty || 0)) { if (!setTix(c, tix)) return; c.s.typesKnown = true; if (tix.student) c.s.idChecked = false; c.say("ack"); return; }
    // fill the rest with adults
    const rest = Math.max(0, (c.s.qty || count(tix)) - count(tix));
    if (!setTix(c, { ...tix, adult: (tix.adult || 0) + rest })) return;
    c.s.typesKnown = true;
    if (tix.student) c.s.idChecked = false;
    c.say("ack");
  },
  // "Está bien, pago la entrada general" (no student ID)
  adult_ok(c) {
    if (!c.s.tix || !count(c.s.tix)) { c.s.tix = { adult: 1 }; c.s.qty = 1; c.s.typesKnown = true; changed(c); }
    c.say("ack");
  },
  change_tickets(c, slots, seg) {
    const tix = readTix(slots);
    if (!count(tix)) return;
    if (!setTix(c, tix, seg.tags.includes("add"))) return;
    c.s.typesKnown = true;
    if (tix.student) c.s.idChecked = false;
    c.say("changed");
  },
  reject_type(c, slots, seg) {
    const tt = slots.tt as string;
    // At the ticket-type question "No soy estudiante" and "No, soy estudiante" read the same (rule 10)
    if (c.step === "types" && !c.s.typesKnown && tt && tt !== "adult") {
      if (c.s.typesQ === "one") { askWhich(c, tt); return; }
      if (c.s.typesQ === "all") { askTypes(c, true); return; }
      // "¿Hay algún estudiante…?" "No soy estudiante" speaks for one of the group: ask for the breakdown
      if (seg.tags.includes("sg") && (c.s.qty || 1) > 1) { askTypes(c, true); return; }
      // "No somos estudiantes": all adults
      c.s.tix = { adult: c.s.qty || 1 }; c.s.typesKnown = true; changed(c); c.say("ack"); return;
    }
    // "No soy estudiante" / "No quiero el de estudiante": that ticket becomes a general one
    const tix: Tix = { ...(c.s.tix || {}) };
    // nothing of that type on the order ("General, no soy estudiante"): nothing to undo
    if (!tt || !tix[tt] || tt === "adult") { if (!c.s.typesKnown) c.say("no_problem"); return; }
    tix.adult = (tix.adult || 0) + tix[tt]; delete tix[tt]; c.s.tix = tix; changed(c); if (tt === "student") c.s.idChecked = true;
    c.say("no_problem");
  },
  im_senior(c, slots) {
    // "Tengo setenta años" (a younger age is just information: tell the prices)
    if (typeof slots.n === "number" && slots.n < 60) { c.say("prices", { price: 8000, amount: 4000 }); return; }
    if (lockedAfterPay(c)) return;
    c.say("discount_senior", { price: 4000 });
    if (!c.s.tix || !count(c.s.tix)) { c.s.tix = { senior: 1 }; c.s.qty = 1; c.s.typesKnown = true; changed(c); }
    else if (!c.s.tix.senior) { const tix = { ...c.s.tix }; if (tix.adult) { tix.adult--; if (!tix.adult) delete tix.adult; } tix.senior = 1; c.s.tix = tix; c.s.typesKnown = true; changed(c); }
  },
  child_age(c, slots, seg) {
    const n = seg.tags.includes("sixty") ? 60 : slots.n as number;
    if (typeof n !== "number") return;
    if (lockedAfterPay(c)) return;
    const tix: Tix = { ...(c.s.tix || {}) };
    // "Mi esposo tiene setenta años": a senior ticket for the companion
    if (n >= 60) {
      c.say("discount_senior", { price: 4000 });
      if (tix.adult) { tix.adult--; if (!tix.adult) delete tix.adult; }
      tix.senior = (tix.senior || 0) + 1;
      c.s.tix = tix; c.s.qty = Math.max(c.s.qty || 0, count(tix)); c.s.typesKnown = true; changed(c); return;
    }
    if (n >= 12 && !tix.child) { c.say("ack"); return; }
    if (n < 12) { c.say("kids_free"); if (!tix.child) { tix.child = 1; if (tix.adult && count(tix) > (c.s.qty || 0)) tix.adult--; } }
    else { c.say("child_adult"); if (tix.child) { tix.adult = (tix.adult || 0) + tix.child; delete tix.child; } }
    for (const k of Object.keys(tix)) if (!tix[k]) delete tix[k];
    c.s.tix = tix; c.s.typesKnown = true; changed(c);
  },
  im_student(c) {
    if (lockedAfterPay(c)) return;
    c.say("discount_student", { price: 4000 });
    if (!c.s.tix || !count(c.s.tix)) { c.s.tix = { student: 1 }; c.s.qty = 1; c.s.typesKnown = true; c.s.idChecked = false; changed(c); }
    else if (!c.s.tix.student) { const tix = { ...c.s.tix }; if (tix.adult) { tix.adult--; if (!tix.adult) delete tix.adult; } tix.student = 1; c.s.tix = tix; c.s.typesKnown = true; c.s.idChecked = false; changed(c); }
  },
  // --- prices ---------------------------------------------------------------
  ask_prices(c, slots, seg) {
    // "¿Cuánto cuesta?" right after the audio-guide offer is about the guide
    if (["guide", "persuade"].includes(at(c) as string) && !slots.tt && !slots.tks) { c.s.guidePriceSaid = true; c.say("guide_price", { price: GUIDE }); reopenPersuade(c); return; }
    if (slots.tt === "child") { c.say("kids_free"); return; }
    if (slots.tt === "student") { c.say("discount_student", { price: 4000 }); return; }
    if (slots.tt === "senior") { c.say("discount_senior", { price: 4000 }); return; }
    // after paying: "¿Cuánto le debo?" is answered; "¿Cuánto cuesta la entrada?" gets the prices
    if (c.s.paid) { if (seg.tags.includes("owe")) c.say("already_paid"); else c.say("prices", { price: 8000, amount: 4000 }); return; }
    if (c.s.tix && count(c.s.tix) && c.s.typesKnown && c.step !== "tickets") {
      c.say("say_total", { price: due(c) });
      if (c.step === "pay") { c.s.totalSaid = true; c.hold(); } // the pay step doesn't say it again
      return;
    }
    c.say("prices", { price: 8000, amount: 4000 });
  },
  ask_discount(c, _slots, seg) {
    if (seg.tags.includes("senior")) c.say("discount_senior", { price: 4000 });
    else if (seg.tags.includes("student")) c.say("discount_student", { price: 4000 });
    else { c.say("discount_student", { price: 4000 }); c.say("discount_senior_short", { price: 4000 }); }
  },
  kids_free(c) { c.say("kids_free"); },
  ask_free_day(c, _slots, seg) {
    if (c.s.sunday) { if (c.s.sundaySaid) { c.say("sunday_short"); return; } c.s.sundaySaid = true; c.twist("sunday"); c.say("sunday_note"); return; }
    c.say(seg.tags.includes("today") ? "free_days_today" : "free_days");
  },
  im_resident(c, _slots, seg) {
    if (c.s.paid) { c.say("already_paid"); return; }
    if (!c.s.sunday) { c.say("res_weekday"); return; }
    // "Somos residentes": every ticket on the order goes free once the card is shown
    if (seg.tags.includes("pl")) c.s.resPl = true;
    if (c.s.resChecked) { c.say(c.s.resident ? "ack" : "res_no"); return; }
    c.s.sundaySaid = true;
    c.say("res_ask");
    c.expect(resCardPending());
  },
  im_visitor(c) {
    if (c.s.sunday && !c.s.paid) { c.s.resChecked = true; c.say("visitor_normal"); return; }
    c.say("visitor_welcome");
  },
  // --- student ID -----------------------------------------------------------
  have_id(c) {
    if (!c.s.tix?.student) { c.say("no_problem"); return; }
    c.s.idChecked = true;
    c.s.idShown = true;
    c.say("id_ok");
  },
  no_id(c) {
    if (!c.s.tix?.student) { c.say("no_problem"); return; }
    const tix: Tix = { ...c.s.tix };
    tix.adult = (tix.adult || 0) + tix.student;
    delete tix.student;
    c.s.tix = tix;
    c.s.idChecked = true;
    changed(c);
    c.say("id_missing");
    c.expect({ id: "id_price", optional: true, expects: ["adult_ok", "never_mind_ctx"], suggest: [{ lt: "Agree to pay general admission", hint: "okay" }, { lt: "Answer yes or no", hint: "g_yesno" }],
      on: { never_mind_ctx: (cc) => { cc.say("ack"); } },
      yes: (cc) => { cc.say("ack"); }, no: (cc) => { cc.say("id_sorry"); } });
  },
  // --- audio guide ------------------------------------------------------------
  want_guide(c, slots, seg) {
    // "¿Tienen audioguía?" before Iván offers one is a question: what it costs; his offer comes later (rule 3).
    // Once he has offered (or after "¿Se anima?") it is a yes.
    if (seg.tags.includes("q") && !c.s.guides && !["guide", "persuade"].includes(at(c) as string)) {
      c.s.guideOffered = true; c.s.guidePriceSaid = true;
      c.say("guide_price", { price: GUIDE });
      return;
    }
    c.s.guideAsked = true;
    guideCost(c);
    const n = typeof slots.n === "number" && slots.n > 0 && slots.n < 10 ? slots.n : 1;
    // "Otra audioguía", or any after paying: one more (the guides handed over stay; at most nine)
    c.s.guides = c.s.paid || seg.tags.includes("more") ? Math.min(MAX_TIX, (c.s.guides || 0) + n) : n;
    if (slots.lang) langChosen(c, slots.lang);
    else if (!c.s.lang && c.s.langWanted) c.s.lang = c.s.langWanted;
    changed(c);
  },
  no_guide(c) {
    c.s.guideAsked = true;
    if (c.s.guides && lockedAfterPay(c)) return;
    // (an extra guide called off after paying: the ones already handed over stay)
    if (c.s.persuaded || c.s.guides) { c.s.guides = c.s.handGuides || 0; c.s.guideNo = true; changed(c); c.say("no_problem"); return; }
    c.s.persuaded = true;
    c.say("guide_persuade");
    c.expect({ id: "persuade", optional: true, expects: ["want_guide", "no_guide", "guide_n_ctx", "guide_no_ctx"],
      suggest: [{ lt: "Take an audio guide after all", hint: "guide_yes" }, { lt: "Answer yes or no", hint: "g_yesno" }],
      yes: (cc) => { cc.s.guides = 1; if (!cc.s.lang && cc.s.langWanted) cc.s.lang = cc.s.langWanted; changed(cc); cc.say("ack"); },
      no: (cc) => { cc.s.guides = 0; cc.s.guideNo = true; cc.say("no_problem"); },
      on: {
        no_guide: (cc) => { cc.s.guides = 0; cc.s.guideNo = true; cc.say("no_problem"); },
        guide_no_ctx: (cc) => { cc.s.guides = 0; cc.s.guideNo = true; cc.say("no_problem"); },
        want_guide: (cc, sl, sg) => { H.want_guide(cc, sl, sg); cc.say("ack"); },
      } });
  },
  guide_price(c, _slots, seg) { c.s.guidePriceSaid = true; c.say(seg.tags.includes("incl") ? "guide_not_included" : "guide_price", { price: GUIDE }); reopenPersuade(c); },
  guide_n_ctx(c, slots, seg) {
    // "Para los dos" = 2, "Una para cada uno" = one per ticket
    const n = seg.tags.includes("one") ? 1 : seg.tags.includes("both") ? 2 : seg.tags.includes("each") ? Math.max(1, Math.min(9, c.s.qty || count(c.s.tix) || 1)) : slots.n;
    H.want_guide(c, { ...slots, n }, { intent: "want_guide", slots, tags: [] });
    if (at(c) === "persuade") c.say("ack");
  },
  guide_no_ctx(c, slots, seg) { H.no_guide(c, slots, seg); },
  have_question(c) { c.say("g_yes_what"); c.hold(); },
  lang_ctx(c, slots) { langChosen(c, slots.lang); },
  lang_q(c, slots) {
    if (!slots.lang) { c.s.langListed = true; c.say("langs_list"); return; }
    const e = LANGS.find((x) => x.id === slots.lang);
    if (e?.attrs?.none) { c.say("no_lang", { X: slots.lang }); c.say("langs_list_short"); c.s.langAsked = true; c.s.langListed = true; return; }
    c.say("have_lang");
    c.s.langWanted = slots.lang;
    if (c.s.guides) langChosen(c, slots.lang, true);
  },
  langs_q(c) { c.s.langListed = true; c.say("langs_list"); },
  ask_english(c, slots, seg) {
    // at "¿En qué idioma la quiere?" it is about the audio guide
    if (at(c) === "lang" || (c.s.guides && !c.s.lang)) { H.lang_q(c, slots, seg); return; }
    if (slots.lang === "english") { c.say("speak_english"); conv(c).markSlow(); return; }
    // another language: the audio guide's
    c.s.langListed = true; c.say("langs_list");
  },
  lang_not_ctx(c) { c.s.langListed = true; c.say("langs_list"); },
  mixed_types_ctx(c, slots) {
    // "Sí, una" at "¿Entrada general?" is a yes
    if (c.s.typesQ === "one" && typeof slots.n === "number") { H.all_adults_ctx(c, slots, { intent: "all_adults_ctx", slots, tags: [] }); return; }
    askTypes(c, true);
  },
  // --- paying ----------------------------------------------------------------
  pay_card(c) {
    if (c.s.paid) { c.say("already_paid"); return; }
    if (!c.s.totalSaid) { c.say("card_later"); c.s.method = "card"; return; }
    c.say("card_tap"); markPaid(c, "card");
  },
  no_cash(c, slots, seg) { H.pay_card(c, slots, seg); },
  pay_cash(c, _slots, seg) {
    if (c.s.paid) { c.say("already_paid"); return; }
    c.s.method = "cash";
    // "¿Puedo pagar en efectivo?" / "¿Tiene cambio de quinientos?" are questions: yes, and the money comes with
    // "Aquí tiene"
    if (seg.tags.includes("q")) { c.say("cash_yes"); if (c.s.totalSaid) c.hold(); return; }
    if (!c.s.totalSaid) { c.say("cash_ok"); return; }
    markPaid(c, "cash");
  },
  // "No tengo tarjeta": at the residence-card question, no card; at paying, cash then
  no_card_ctx(c) {
    if (at(c) === "res_card") { resNo(c); return; }
    if (c.s.paid) { c.say("already_paid"); return; }
    c.s.method = "cash";
    c.say("cash_then");
    if (c.s.totalSaid) c.hold();
  },
  pay_phone(c) {
    if (c.s.paid) { c.say("already_paid"); return; }
    c.s.method = "phone";
    if (!c.s.totalSaid) { c.say("phone_later"); return; }
    c.say("phone_ok"); markPaid(c, "phone");
  },
  ask_dollars(c) { c.say("dollars"); },
  here_you_go(c, slots) {
    if (c.step === "student_id" || (c.s.tix?.student && !c.s.idChecked && !c.s.totalSaid)) { H.have_id(c, {}, { intent: "have_id", slots: {}, tags: [] }); return; }
    if (c.s.paid) { c.say("already_paid"); return; }
    if (!c.s.totalSaid) { c.say("no_problem"); return; }
    // "Aquí tiene cincuenta pesos" for $80: not enough, the total again (rule 18); an amount is cash
    const given = typeof slots.price === "number" ? slots.price : undefined;
    if (given !== undefined && given < due(c)) { c.say("say_total", { price: due(c) }); c.hold(); return; }
    markPaid(c, given !== undefined ? "cash" : c.s.method || "cash", given);
  },
  // --- the new exhibition ------------------------------------------------------
  ask_exhibit(c) { c.s.exhibitKnown = true; c.say("exhibit_where"); },
  ask_included(c, slots, seg) {
    // "¿Está incluida?" right after the audio-guide offer is about the guide
    if (["guide", "persuade"].includes(at(c) as string)) { c.s.guidePriceSaid = true; c.say("guide_not_included", { price: GUIDE }); return; }
    // a bare "¿Es gratis?" / "¿Se paga aparte?" before paying is about admission (on a Sunday, the Sunday rule)
    if (!c.s.paid && seg.tags.includes("bare")) {
      if (c.s.sunday) { H.ask_free_day(c, slots, seg); return; }
      if (c.s.tix && count(c.s.tix) && c.s.typesKnown && c.s.totalSaid) { c.say("say_total", { price: due(c) }); return; }
      c.say("prices", { price: 8000, amount: 4000 }); return;
    }
    if (c.s.exhibitKnown) { c.say("exhibit_included"); return; }
    c.s.exhibitKnown = true;
    c.say("exhibit_included_full");
  },
  ask_exit(c) { c.say("exit"); },
  never_mind_ctx(c) { c.say("ack"); },
  ask_touch(c) { c.say("touch_rule"); },
  ask_exhibit_about(c) { c.say("exhibit_about"); },
  // --- information ---------------------------------------------------------------
  ask_photos(c) { c.s.askedPhotos = true; c.say("photos"); },
  ask_coat(c, _slots, seg) { const again = c.s.bagSaid; c.s.bagSaid = true; c.say(again ? "bag_again" : seg.tags.includes("bag") ? "bag_check" : "coat_check"); },
  ask_shop(c) { c.say("shop_cafe"); },
  ask_cafe(c) { c.say("shop_cafe"); },
  ask_restroom(c) { c.say("restroom"); },
  ask_hours(c, _slots, seg) { c.say(c.s.late ? "close_late" : seg.tags.includes("today") ? "close_today" : "hours"); },
  ask_map(c) { c.say("floor_plan"); c.event("give", { item: "floor-plan" }); },
  ask_elevator(c) { c.say("elevator"); },
  ask_duration(c) { c.say(c.s.late ? "duration_late" : "duration"); },
  ask_tour(c) { c.say("tour"); },
  ask_start(c) { c.say("start"); },
  // "¿Dónde devuelvo la audioguía?": back at the ticket desk ("Taquilla · Audioguías")
  ask_return_guide(c) { c.say("guide_return"); },
  // "¿Me alcanza el tiempo?" on an ordinary day: the usual visit length
  enough_time(c) { c.say(c.s.late ? "enough_time" : "duration"); },
  come_back(c) {
    // "Mejor regreso mañana" before buying: the opening hours, and the 45 minutes are still enough
    if (!c.s.paid && !(c.s.tix && count(c.s.tix))) { c.say(c.s.sunday ? "closed_tomorrow_short" : "open_tomorrow_short"); if (c.s.late) c.say("still_time"); c.hold(); return; }
    c.say("come_back"); c.say(c.s.sunday ? "closed_tomorrow" : "open_tomorrow");
  },
  // "Nada más" / "No traigo nada" before paying answers nothing here
  more_no(c) { if (!c.s.paid) return; exhibitAnyway(c); c.s.moreDone = true; },
  // only parsed while Iván asks about the ticket types (the pending question answers it first)
  all_adults_ctx(c) { c.s.tix = { adult: c.s.qty || 1 }; c.s.typesKnown = true; changed(c); c.say("ack"); },
  // --- Don Arturo (twist) ---------------------------------------------------------
  apology(c) { if (c.s.harold) { haroldThanks(c); } else c.say("no_problem"); },
  deny(c) { if (c.s.harold) haroldDeny(c); },
  why_not(c) {
    if (c.s.harold) { c.say(c.s.flash ? "harold_why_flash" : "harold_why"); return; }
    c.say(at(c) === "id_price" ? "id_sorry" : "rules");
  },
  // "Muy bien, gracias" after the tickets is thanks, not an answer to "¿Cómo está?"
  g_howareyou_answer(c, slots) {
    const h = (c.heard || "").toLowerCase();
    if (/\bgracias\b/.test(h) && !/\b(y usted|y tú|y tu|cómo está|como esta|qué tal|que tal)\b/.test(h)) { H.g_thanks(c, slots, { intent: "g_thanks", slots, tags: [] }); return; }
    GLOBAL_HANDLERS.g_howareyou_answer(c as ConvCtx, slots);
  },
  g_thanks(c, slots) {
    if (c.step === "more" || c.step === "exhibit") { c.s.moreDone = true; c.say("g_welcome"); exhibitAnyway(c); return; }
    GLOBAL_HANDLERS.g_thanks(c as ConvCtx, slots);
  },
};

function langChosen(c: Ctx, lang: string, quiet = false) {
  const e = LANGS.find((x) => x.id === lang);
  if (!e) return;
  if (e.attrs?.none) { c.say("no_lang", { X: lang }); c.say("langs_list_short"); c.s.langAsked = true; c.s.langListed = true; return; }
  c.s.lang = lang;
  if (!quiet) c.say("ack");
}

/** Don Arturo's twist is part of the task: it is complete once the learner apologizes (or says they didn't touch anything). */
function haroldThanks(c: Ctx) {
  c.s.apologized = true;
  c.complete();
  c.say("harold_thanks");
  c.end();
}
function haroldDeny(c: Ctx) {
  c.s.denied = true;
  c.complete();
  c.say("harold_deny");
  c.end();
}

/** Every situation handler reacts once per utterance (an utterance may be parsed as several segments). */
function wrap(hs: Record<string, Handler>): Record<string, Handler> {
  const out: Record<string, Handler> = {};
  for (const [id, h] of Object.entries(hs)) out[id] = (c, slots, seg) => { if (onceThisTurn(c, "h:" + id)) h(c, slots, seg); };
  return out;
}

/** At "¿Cuántos boletos?": a bare number, and every intent that can name a ticket type (see the tickets step). */
const TICKET_TALK = ["qty_ctx", "buy_tickets", "buy_qty", "ask_prices", "ask_discount", "kids_free", "im_student", "im_senior", "child_age", "reject_type"];
const ART = "Spanish uses an article before clock times; English has no separate word.";
const PAQ = "Mexican: paquetería = the free bag check at a museum or store; guardarropa is more widely used.";
const CRED = "credencial: an ID card (student, voter, membership).";

// ---------------------------------------------------------------------------

export const museum: SituationDef = {
  id: "s70-museum",
  song: 70,
  songTitle: "Please Don't Touch",
  title: { en: "No se puede tocar", lt: "Please Don't Touch" },
  topic: { en: "En el museo", lt: "At the museum" },
  chapter: 2,
  order: 4,
  location: "museum",
  npc: "ben",
  npcs: ["harold"],
  goal: "Buy a ticket, get an audio guide if you want one, and find out where the new exhibition is.",
  intro: "The Museo de la Costa Maya, across from the zócalo: cool white halls and quiet galleries. Iván sells the tickets; Don Arturo, the guard, watches over the art. Prices are in Mexican pesos.",
  entities: { ttype: TTYPES, lang: LANGS },

  grammar: {
    macros: {
      order_prefix: [
        "quisiera #h:tk_quisiera", "me gustaria", "quisiera comprar", "me gustaria comprar", "quiero comprar", "queremos comprar",
        "me da #h:tk_me_da", "me das #tip:tu_staff", "deme", "dame #tip:tu_staff", "me puede dar", "me podria dar", "me puedes dar #tip:tu_staff",
        "me vende", "me vendes #tip:tu_staff", "me pone", "pongame", "ponme #tip:tu_staff", "nos da", "denos",
        "quiero", "queremos", "quisieramos", "necesito", "necesitamos", "voy a querer", "vamos a querer", "le pido",
        "(puedo | podemos) (comprar | tener)", "vengo por", "venimos por",
      ],
      cnt: "({n:number} | un #n1 | una #n1 | uno #n1 | (solo | nomas | solamente) (un | una | uno) #n1)",
      tkw: "(boleto | boletos | entrada | entradas | ticket | tickets | pase | pases | boleto de entrada | boletos de entrada | ingreso | acceso)",
      guide_w: "(audioguia | audioguias | audio guia | audio guias | guia de audio | guias de audio | audio | audifonos)",
      exh: "(exposicion | exhibicion | muestra)",
      // the new exhibition, by any name ("la exposición nueva", "Colores de la noche")
      exh_any: "([la] (nueva | temporal) @exh | [la] @exh (nueva | temporal) | [la] @exh [de] (los)? colores de la noche | (los)? colores de la noche | la @exh)",
      // "Mi esposa y yo", "los dos": two people
      two_of_us: "(mi @rel y yo | yo y mi @rel | (mi | yo) y mi @rel | mi @rel y (mi | yo) | (los | las) dos | nosotros dos | nosotras dos | dos personas)",
      rel: "(esposa | esposo | amigo | amiga | pareja | novia | novio | hijo | hija | mama | papa | madre | padre | hermano | hermana | mujer | marido | companero | companera | nieto | nieta | abuelo | abuela)",
      // the student ID, as learners call it ("ID" and "carnet" too; "tarjeta" only with "de estudiante": it is also the payment card)
      cred: "(credencial | carnet | carne | id | identificacion | tarjeta de estudiante)",
      kid_w: "(hijo | hija | nino | nina | nieto | nieta | hijito | hijita)",
      sorry_w: "(perdon | perdone | perdoneme | disculpe | disculpeme | disculpa | lo siento [mucho] | una disculpa | mil disculpas | ups | uy perdon | ay perdon)",
      sorry_tail: "(no (lo)? sabia | no (sabia | vi) que no se (podia | puede) tocar | no (vi | lei) (el letrero | el aviso | la senal) | no me di cuenta | ya no (lo | la | los)? (toco | hago) | ya no toco nada | no (lo | la)? vuelvo a (hacer | tocar) | no vuelve a pasar | no va a volver a pasar | no volvera a pasar | fue sin querer | fue un accidente | no fue (a proposito | mi intencion) | tiene razon | no se puede tocar | ya entendi | (ya | ahorita) (lo | la) (apago | quito) | (ya)? apago el flash | no (vuelvo | voy) a usar (el)? flash | fue mi (hijo | hija | nino | nina) | voy a tener (mas)? cuidado | (solo | nomas) (queria | quise) (ver | verlo | verla) de cerca)",
      only_looking: "(solo | nomas) (estaba | estoy) (senalando | viendo | mirando | apuntando) | (solo | nomas) (miraba | veia | apuntaba | senalaba)",
      // a change of mind: "Pensándolo bien, …", "Siempre sí …" (Mexican: after all, yes)
      mind: "(pensandolo bien | siempre si | mejor si | bueno siempre si | al final | sabe que)",
      // what the guard watches over: the stela and the clay vessels in the first gallery, the paintings upstairs
      piece: "(la pintura | el cuadro | las pinturas | la obra | la pieza | las piezas | la estatua | la escultura | la estela | la vasija | las vasijas)",
    },
    slots: {
      tk: { pattern: [
        "[@cnt] {tt:ttype}", "[@cnt] @tkw [de | para] {tt:ttype}", "[@cnt] (de | para) {tt:ttype}",
        "[@cnt] @tkw para mi @kid_w #kid", "(uno | una | otro | otra) para mi @kid_w #kid",
        "[@cnt] {tt:ttype} de {age:number} [anos]", "[@cnt] @tkw para (mi | un | una) (hijo | hija | nino | nina) de {age:number} [anos] #kid",
        "@cnt @tkw para mi #self", "(uno | una) para mi #self", "(uno | una | otro | otra) para (mi | un | una) @kid_w de {age:number} [anos] #kid",
      ] },
      tks: { pattern: "{tk} [[y | mas | y tambien | y otro | y otra] {tk}] [[y] {tk}]" },
    },
  },

  intents: {
    // tickets
    buy_tickets: { patterns: [
      "@order_prefix {tks} [con @guide_w #guide]", "{tks} [con @guide_w #guide] #h:tk_one #h:tk_mix", "(somos | son) {tks}",
      "({n:number} | dos) @tkw {tks}",
      "@order_prefix (otro | otra | uno mas | una mas) [de | para] {tt:ttype} #add", "(puedo | podemos) agregar {tks} #add", "{tks} esta bien",
      // "No soy estudiante, (quiero) un boleto general": the second piece is the order
      "no (soy | somos) {bad:ttype} [@order_prefix] {tks}",
      // one more ticket, e.g. after paying: "Me da otro boleto general", "Otro boleto para mi amigo", "Uno más para mi esposa"
      "[@order_prefix] (otro | otra) @tkw [mas] [de | para] [{tt:ttype}] [para (mi @rel | el | ella | alguien mas)] [por favor] #add",
      "[@order_prefix] (uno | una) mas para (mi @rel | el | ella | alguien mas) #add",
    ] },
    buy_qty: { patterns: [
      "@order_prefix [@cnt] @tkw [para hoy] [con @guide_w #guide]", "[@cnt] @tkw [para hoy] [con @guide_w #guide] #h:tk_two",
      "(boletos | entradas | un boleto | una entrada) para ({n:number} | una #n1) [personas]", "para ({n:number} | una #n1) [personas]",
      "(somos | seremos) {n:number} [personas]", "no (somos | son) {bad:number} [(somos | son)] {n:number}", "{n:number} personas", "[@order_prefix] [{n:number}] [@tkw] [para] @two_of_us #n2",
      "[@order_prefix] [{n:number}] [@tkw] para (mi familia | la familia) #family",
      "(quisiera | quiero | queremos | me gustaria | nos gustaria) (visitar | ver | entrar a | conocer | pasar a) el museo", "(vengo | venimos) a (ver | visitar | conocer) el museo",
      "(quisiera | quiero | queremos) (entrar | pasar)",
      "[@order_prefix] @cnt @tkw mas [por favor] #more",
    ] },
    // a bare number or "Nada más yo": only while Iván asks how many (rule 2)
    qty_ctx: { patterns: ["{bad:number} no [sino] {n:number} [personas]", "no {bad:number} [sino] {n:number} [personas]", "[solo | nomas | solamente] ({n:number} | uno #n1 | una #n1) [personas]", "(solo | nomas | nada mas | solamente) (yo | para mi) #n1", "(yo | para mi) (solo | nada mas | nomas) #n1"] },
    all_adults_ctx: { patterns: [
      "[si] (todos | todas) [somos | son] adultos #h:ty_all", "[si] (somos | son) (todos | todas) adultos", "(todos | todas) (somos | son) adultos #h:ty_they_all",
      "[no] (solo | nomas | solamente | puros) adultos #h:ty_just", "[si] (los | las) dos (somos | son) adultos", "[si] (somos | son) adultos",
      "[no] no hay (estudiantes | ninos | ni estudiantes ni ninos | adultos mayores | personas mayores)", "[no] (ninguno | nadie) (es | somos) (estudiante | estudiantes)",
      "[si] (todos | todas) (generales | general)", "[no] (solo | puros | nomas) (generales | boletos generales | entradas generales)", "[si] (somos | son) (todos | puros) mayores de edad",
      "[no] (ninguno | nadie)", "[no] (ningun | ninguna) (estudiante | nino | nina | adulto mayor)", "[si] (los | las) (dos | tres | cuatro | cinco) #the_n",
    ] },
    // "No, no todos son adultos": Iván asks which tickets
    mixed_types_ctx: { patterns: ["[no] no (todos | todas) (somos | son) adultos", "[no] no (somos | son) (todos | todas) adultos", "[no] (uno | una | algunos) no (es | son) (adulto | adultos)", "[si] (es | somos) (una mezcla | mixto)", "[si] hay de todo", "si [hay] {n:number}"] },
    types_ans: { patterns: [
      "[si | no] (uno | una | {n:number}) de (nosotros | nosotras | ellos | ellas) (es | son) {tks} #h:ty_one_student #h:ty_yes_student",
      "[si] [y] (uno | una | {n:number}) (es | son) {tks}", "[si] [y] mi @rel (es | tambien es) {tks} [y (yo | el | ella) no]", "[si] [y] (el | ella) es {tks} [y (yo | el | ella) no]",
      "[si | no] (solo | nomas) yo (soy | estoy) {tks}", "[si] yo soy {tks} [y (el | ella | mi @rel) no]",
      "{tks} y (los demas | el resto | los otros | las otras) (son | somos) adultos", "{tks} y (los demas | el resto | los otros) (generales | adultos)",
    ] },
    change_tickets: { patterns: ["[perdon] (mejor | que sean | cambielo a | cambialo a #tip:tu_staff) {tks}", "[perdon] (quise decir | queria decir) {tks}", "[perdon] (puedo | podemos) (agregar | anadir) {tks} #add", "no {tks} sino {tks}"] },
    reject_type: { patterns: ["[ya] no soy {tt:ttype} #sg", "[ya] no (somos | es | son) {tt:ttype}", "mi @rel no es {tt:ttype}", "(el | ella) no es {tt:ttype}", "(uno | una | ninguno | ninguna) (de nosotros | de ellos)? no es {tt:ttype}", "no (quiero | necesito) [el | un] [@tkw] (de | para) {tt:ttype}", "no (quiero | necesito) [boleto | boletos | entrada] de {tt:ttype}"] },
    im_senior: { patterns: [
      "(soy | somos) (adulto mayor | adulta mayor | adultos mayores | persona mayor | personas mayores | de la tercera edad | jubilado | jubilada | jubilados | pensionado | pensionada)",
      "tengo {n:number} anos", "(soy | somos) (mayor | mayores) de sesenta [anos]", "tengo mas de sesenta [anos]", "tengo (credencial | tarjeta) (del | de) inapam",
    ] },
    child_age: { patterns: ["(el | ella) tiene {n:number} [anos]", "mi @kid_w tiene {n:number} [anos]", "mi @rel (ya)? tiene (mas de)? {n:number} [anos]", "(mi @rel | el | ella) es mayor de sesenta #sixty", "(el | ella) (solo | nomas) tiene {n:number} [anos]", "(uno | una) [de ellos | de ellas] tiene {n:number} anos", "(el nino | la nina) tiene {n:number} [anos]"] },
    im_student: { patterns: ["(soy | somos) (estudiante | estudiantes) #h:tk_student", "(soy | somos) (universitario | universitaria | universitarios)", "tengo credencial de estudiante", "soy estudiante hay descuento"] },
    // prices
    ask_prices: { patterns: [
      "cuanto (cuesta | cuestan | es | sale | vale) (la entrada | el boleto | los boletos | un boleto | una entrada | las entradas | entrar | la entrada general) #h:tk_price",
      "cuanto (cuesta | es | sale)", "cuanto (cuesta | es | sale) (el | un) boleto (de | para) {tt:ttype}", "cuanto (cuesta | es | pagan | paga) (para | los | un) {tt:ttype}",
      "(cual es | que) (el)? precio [de la entrada | del boleto | de los boletos]", "(que | cuales) son los precios", "cuanto (cuesta | es | seria) (para | por) {tks}",
      "cuanto (es | seria) (en total | todo) #owe", "(es | esta) caro [la entrada | el boleto]", "(cuanto | que precio) tiene (la entrada | el boleto)", "cuanto cobran [por la entrada | por entrar]",
      "cuanto hay que pagar", "(cuanto es | cual es | cuanto cuesta) el (costo | precio) [de la entrada | del boleto | de los boletos]", "cuanto (pago | le debo | le pago) #owe",
    ] },
    ask_discount: { patterns: [
      "hay descuento (para | de) (estudiantes #student | adultos mayores #senior | personas mayores #senior | la tercera edad #senior | jubilados #senior) #h:tk_discount",
      "(hay | tienen | manejan | dan | tiene) (descuento | descuentos | algun descuento) [para (estudiantes #student | adultos mayores #senior | personas mayores #senior | jubilados #senior | la tercera edad #senior)]",
      "(los estudiantes #student | los adultos mayores #senior | las personas mayores #senior | los jubilados #senior) (pagan menos | tienen descuento)",
      "es mas barato para (estudiantes #student | adultos mayores #senior | personas mayores #senior)",
      "(hay | tienen) (precio | tarifa | boleto) (especial | reducido | reducida) [para (estudiantes #student | adultos mayores #senior | personas mayores #senior)]",
      // no other discount: the student and senior prices answer it
      "(hay | tienen | dan) (descuento | descuentos) (para | a) (maestros | profesores | docentes | familias | grupos | militares)",
    ] },
    kids_free: { patterns: [
      "(los ninos | los menores | las ninas) (pagan | entran gratis | no pagan | son gratis) #h:tk_kids", "(es | entran) gratis para (los)? ninos",
      "(mi hijo | mi hija | el nino | la nina) (paga | necesita boleto)", "(tengo | tenemos) que pagar (por | para) (los ninos | mi hijo | mi hija | el nino | la nina)",
      "(los ninos | los menores) (necesitan | ocupan) boleto", "y (para)? (los ninos | los menores)", "(necesito | tengo que | hay que) (comprar | pagar)? (boleto | entrada) (para | de) (mi hijo | mi hija | los ninos | el nino | la nina | mis hijos)",
    ] },
    ask_free_day: { patterns: [
      "(hay | tienen) (algun)? dia (gratis | de entrada libre) #h:fd_free", "(es | hay) (gratis | entrada libre) hoy #today", "hoy (es | la entrada es) (gratis | libre) #today", "(es | hay) (gratis | entrada libre) (los domingos | el domingo | en domingo)",
      "(los domingos | el domingo) (es | son | entran)? gratis", "(no es | no era) gratis los domingos", "los domingos (la entrada)? es (gratis | libre)",
    ] },
    im_resident: { patterns: [
      // "Somos residentes" / "Vivimos aquí" (#pl): the whole group
      "[pero] soy (residente | residentes) [aqui | en mexico | temporal | permanente | temporales | permanentes] #h:r_resident", "[pero] somos (residente | residentes) [aqui | en mexico | temporal | permanente | temporales | permanentes] #pl",
      "no soy (turista | turistas | visitante | visitantes) [vivo aqui | soy (residente | residentes)]", "no somos (turista | turistas | visitante | visitantes) [vivimos aqui | somos (residente | residentes)] #pl",
      "[pero] vivo (aqui | en mexico | en puerto colibri | aqui en puerto colibri) [desde hace (un ano | {n:number} (anos | meses) | unos meses | poco)]", "[pero] vivimos (aqui | en mexico | en puerto colibri | aqui en puerto colibri) [desde hace (un ano | {n:number} (anos | meses) | unos meses | poco)] #pl",
      "(los dos | todos | todas) (somos | vivimos) (residentes | aqui) #pl",
      "(tengo | traigo) (mi)? (tarjeta | credencial) de residente", "(aqui | aca) (esta | tiene) mi (tarjeta | credencial) de residente #h:r_card",
    ] },
    im_visitor: { patterns: [
      "(soy | somos) (turista | turistas | visitante | visitantes | extranjero | extranjera | extranjeros) #h:r_visitor", "(estoy | estamos) de (visita | vacaciones | paseo)", "(solo | nomas) (estoy | estamos) de visita",
      "no (soy | somos) (residente | residentes | de aqui | mexicano | mexicana | mexicanos)", "no (vivo | vivimos) (aqui | en mexico)",
    ] },
    // student ID
    have_id: { patterns: [
      "aqui (esta | tiene) [mi credencial] #h:id_here", "(tengo | traigo) (mi | una) @cred de estudiante", "aqui (esta | tiene) mi (@cred | @cred de estudiante | @cred de la universidad)", "[si] aqui (esta | la tiene | tiene)",
      "(la | lo) tengo (aqui | en el celular | en mi celular | en el telefono)", "[si] (la | lo) traigo [aqui]", "[si] (tengo | traigo) (mi | la) @cred [de estudiante]",
      "(esta | esta es) mi @cred [de estudiante | de la universidad]", "(tengo | traigo) (@cred | una @cred | mi @cred) (internacional | de la universidad | de estudiante | digital) [de estudiante]",
      "(sirve | le sirve | esta bien) (mi | la | esta) @cred [de la universidad | internacional | digital]",
    ] },
    no_id: { patterns: [
      "no (la | lo) (traigo | tengo) [aqui | conmigo | ahorita] #h:id_none", "no (tengo | traigo | traje) (mi | la) @cred [de estudiante] [aqui | conmigo]", "no (la | lo) traje", "no (la | lo) encuentro", "no (tengo | traigo) (la | mi | una)? (tarjeta | credencial) de residente",
      "[si] (tengo | la tengo | lo tengo) [mi | la]? [@cred] pero no (la | lo)? (traigo | traje | tengo aqui | tengo conmigo)", "[si] (la | lo) tengo pero (en el hotel | en la casa | en casa | no aqui | no la traigo)",
      "(la | lo) dejé en (el hotel | la casa | casa | el carro | el cuarto)", "(dejé | olvidé) (mi | la) @cred [en (el hotel | la casa | casa)]", "se me olvidó [mi @cred | la @cred]",
      "(la | lo) olvidé [en (el hotel | casa)]", "(perdi | se me perdio) (mi | la) @cred", "(mi | la) @cred (esta | ya esta) vencida", "(esta | ya esta) vencida",
      "(mi | la) @cred (esta | se quedó) en (el hotel | la casa | casa | el carro)", "(esta | se quedó) en (el | mi) (hotel | casa | carro | cuarto | otra bolsa | otra mochila)", "no tengo (@cred | una @cred | mi @cred) [de estudiante]",
    ] },
    adult_ok: { patterns: [
      "[esta bien | bueno | ok | de acuerdo] (pago | le pago) (la entrada general | el precio completo | el precio normal | la general | el boleto general) [entonces] #h:ok_pay #h:ok_full",
      "(esta bien | bueno | ok) [entonces] (la general | entrada general | boleto general)", "no importa pago (el precio completo | la general | la entrada general)",
    ] },
    // audio guide
    want_guide: { patterns: [
      "(puedo | podemos | me puede | me podria) (tener | rentar | llevar | dar) (una | {n:number}) @guide_w [en {lang}] #h:g_can", "(quisiera | quiero | me gustaria) (una | {n:number}) @guide_w [en {lang}] #h:g_id_like",
      // a question before the offer ("¿Tienen audioguía?"): the price, not a guide (want_guide)
      "(hay | tienen | tiene) @guide_w #h:g_is_there #q", "(rentan | prestan | manejan) @guide_w #q", "[y] (una | {n:number}) @guide_w [tambien] [en {lang}]", "con (una | {n:number}) @guide_w [en {lang}]",
      "(si | claro) (una | la) @guide_w #h:gy_one", "(si | claro | ok | bueno | esta bien) [una] en {lang}", "(una | la) @guide_w esta bien",
      "(me llevo | llevo | tomo) (una | la) @guide_w", "(me da | deme) (una | {n:number}) @guide_w [en {lang}]", "@guide_w [en {lang}] tambien",
      // "Pensándolo bien, quiero una audioguía", "Siempre sí quiero la audioguía", "Quiero la audioguía en inglés"
      "[@mind] (quiero | quisiera | me llevo | voy a querer) (la | una) @guide_w [en {lang}] [por favor]", "@mind (me da | deme | me puede dar) (la | una) @guide_w [en {lang}]",
      "[@order_prefix] (otra | una mas) @guide_w [en {lang}] [por favor] #more",
    ] },
    no_guide: { patterns: [
      "[no] (sin | no quiero | no necesito) (la | una)? @guide_w", "ya no (quiero | necesito) (la | una)? @guide_w", "no (quiero | necesito) (ninguna | {n:number} | dos | tres) @guide_w", "[no] solo (el boleto | los boletos | la entrada | las entradas) #h:g_no",
      "[no] (estoy bien | asi estoy bien) sin (ella | audioguia)", "[no] (uso | voy a usar | prefiero usar) (mi | el) (celular | telefono)", "[no] (tal vez | quizas | a lo mejor) (despues | luego | otro dia | la proxima)",
      "[no] (prefiero | voy a) (ver | recorrer | caminar) [el museo] (solo | sola | por mi cuenta)", "no @guide_w", "nada de @guide_w",
    ] },
    // "No, estoy bien" / "No la necesito": only right after the offer (elsewhere it means something else)
    guide_no_ctx: { patterns: [
      "[no] estoy bien [asi]", "[no] no (la | lo) (necesito | quiero)", "[no] (hoy no | esta vez no | ahorita no)", "[no] paso", "[si] estoy (seguro | segura)",
      "[no] (es | esta) (muy | un poco | demasiado)? (cara | caro)", "[no] no creo [que la necesite]", "prefiero que no", "mejor no", "[no] asi estoy bien", "no hace falta", "[no] no me interesa", "[no] (de verdad | en serio) [no]",
      // at "¿Se anima?" and at the language question ("Ya no la quiero": no guide after all)
      "[no] no me animo", "[no] [gracias] ya no (la | lo) (quiero | necesito)", "[ah] [no] entonces no",
    ] },
    guide_price: { patterns: [
      "cuanto (cuesta | es | sale) la @guide_w #h:g_price", "(la @guide_w) (es gratis | esta incluida | cuesta extra | tiene costo | se paga aparte) #incl", "(esta incluida | viene incluida) la @guide_w #incl", "(es | esta) cara la @guide_w",
      "la @guide_w (cuesta | es) cuanto", "(tiene | tienen) costo (la @guide_w)?", "(cuesta | es) (algo | extra)",
    ] },
    guide_n_ctx: { patterns: [
      "[si] [solo] ({n:number} | una) [para mi]", "[si | claro | ok | bueno] [una] en {lang}", "[si] una para (cada uno | cada quien | cada uno de nosotros) #each", "(si | claro | esta bien | bueno | ok | vale) (me llevo | la tomo | tomo | quiero) una #h:gy_take",
      "[esta bien | ok | si | bueno | vale] (la | una) (tomo | llevo | quiero)", "(me da | deme | quisiera | quiero | me llevo) una", "[una] para (los dos | ambos | las dos) #both",
      "[una] para (todos | cada uno) #each", "[solo] una (es suficiente | esta bien | basta)", "(vamos a | podemos) compartir (una | la)",
      "{price} (esta bien | ok | de acuerdo) [una | la tomo]", "(si | bueno | ok | vale) (una | {n:number})", "[si] me interesa",
      // "Sí, seguro" at the offer or at "¿Se anima?": a yes ("Sí, estoy seguro" stays a no: guide_no_ctx)
      "[si] (seguro | segura) [que si]", "[si] (me animo | me la llevo | por que no)",
      "no (quiero | necesito)? ({bad:number} | dos) [@guide_w] (solo | nomas | nada mas | solamente) una #one", "no {bad:number} (solo | nomas | nada mas | solamente) una #one",
    ] },
    lang_ctx: { patterns: [
      "[en] {lang} #h:l_please", "{lang} esta bien", "(la quiero | la quisiera | quisiera) en {lang}", "la de {lang}", "[en] {lang} entonces",
      "[en] {lang} (esta bien | me parece bien | perfecto)", "(hablo | entiendo) {lang}", "(prefiero | mejor) [en] {lang}", "(me la da | me da una | deme una) en {lang}",
      "[en] {lang} para practicar", "(una | uno) en {lang} y (una | otra | uno | otro) en {lang2:lang}", "mi (idioma | lengua) es (el)? {lang}", "no [en] {bad:lang} [sino] en {lang}", "[en] {bad:lang} no [sino] [en] {lang}", "(entonces | bueno) [en] {lang}",
    ] },
    lang_q: { patterns: [
      "(la | lo) (tiene | tienen | hay) en {lang} #h:l_have", "(tiene | tienen | hay) [la | una] @guide_w en {lang}", "(esta | viene) en {lang}", "(hay | esta disponible) en {lang}",
      "(tiene | tienen) {lang}", "hay {lang}",
    ] },
    // "¿Habla inglés?" asks Iván (at the language question: the audio guide, lang_q)
    ask_english: { patterns: ["[usted] (habla | hablas | hablan) {lang} [usted | aqui]", "habla usted {lang}", "se habla {lang} [aqui]", "(hay | tienen) alguien que hable {lang}", "(puedo | se puede | podemos) hablar en {lang}"] },
    // "No hablo francés" / "No en inglés": never choose that language
    lang_not_ctx: { patterns: ["no (hablo | entiendo | leo) {lang} [muy bien | bien]", "no [en] {lang}", "no (quiero | me gustaria) [la de | la audioguia en | en] {lang}", "{lang} no"] },
    langs_q: { patterns: ["(que | cuales) idiomas (tiene | tienen | hay) #h:l_which", "en que idiomas (esta | viene | la tienen | la tiene | hay)", "que idiomas", "cuales son las opciones", "que opciones (hay | tiene | tienen)"] },
    // paying
    pay_card: { patterns: [
      "(en)? efectivo no [sino] (con)? tarjeta", "no (en)? efectivo [sino] (con)? tarjeta",
      "(puedo | se puede) pagar con tarjeta [de credito | de debito] #h:pay_card", "con tarjeta [de credito | de debito]", "tarjeta", "(aceptan | acepta | toman | reciben) tarjeta [de credito | de debito]",
      "(aceptan | acepta) (visa | mastercard | american express | amex)", "(puedo | se puede) pagar con (visa | mastercard | amex | american express | credito | debito)", "(voy a | quiero | prefiero) pagar con tarjeta", "[no] prefiero [pagar] con tarjeta", "(le pago | pago) con tarjeta", "no (tengo | traigo) [suficiente] efectivo [(pago | le pago | mejor)] con tarjeta", "con (visa | mastercard | debito | credito)",
      // Mexican: "¿Tiene terminal?" = do you take cards?
      "(tiene | tienen | hay) terminal", "(aceptan | acepta | tienen) pago con tarjeta", "(me puede | me podria | puede) cobrar con tarjeta",
    ] },
    // "No tengo efectivo": so it's the card (never read as "cash")
    // "No tengo tarjeta": only at paying and at the residence-card question (elsewhere it could be either card)
    no_card_ctx: { patterns: ["no (tengo | traigo) (tarjeta | la tarjeta) [aqui | conmigo]", "no (tengo | traigo) (tarjeta | la tarjeta) [aqui | conmigo] [pago | le pago] en efectivo"] },
    no_cash: { patterns: ["no (tengo | traigo) [suficiente] (efectivo | cash | dinero en efectivo)", "no traigo (efectivo | cash)", "no (puedo | quiero) pagar en efectivo"] },
    pay_cash: { patterns: ["(con)? tarjeta no [sino] (en | con)? efectivo", "no (con)? tarjeta [sino] (en | con)? efectivo", "(puedo | se puede) pagar en efectivo #q", "(pago | le pago | voy a pagar | prefiero pagar) en efectivo #h:pay_cash", "[no] prefiero [pagar] (en | con)? efectivo", "(en | con) efectivo", "efectivo", "(con | en) (dinero | billetes) [en efectivo]", "(aceptan | acepta) efectivo #q", "en efectivo esta bien",
      "(tiene | tienen) cambio (de | para) [un billete de] {price} #q", "(tiene | tienen) cambio #q"] },
    ask_dollars: { patterns: ["(solo | nomas)? (tengo | traigo) dolares", "(aceptan | acepta | toman) (dolares | dolares americanos)", "(puedo | se puede) pagar (en | con) dolares", "(tienen | hay) cambio de dolares", "cuanto (es | seria | sale | cuesta) en dolares"] },
    pay_phone: { patterns: ["(puedo | se puede) pagar con (el celular | mi celular | el telefono | apple pay | google pay)", "(aceptan | acepta) (apple pay | google pay | pago con celular)", "(con | por) (apple pay | google pay | el celular | mi celular)", "apple pay", "google pay"] },
    here_you_go: { patterns: [
      "aqui (tiene | esta) #h:here_you_go", "tenga", "tome", "aqui (tiene | esta) (el dinero | el efectivo | mi tarjeta)", "aqui (tiene | esta) {price}", "(le doy | ahi le va | ahi va) {price}",
      "aqui tienes #tip:tu_staff", "toma #tip:tu_staff", "ahi (va | le va)", "(con | le pago con) un billete de {price}", "(tenga | tome | aqui tiene) son {price}", "(tenga | tome) {price}",
    ] },
    // the new exhibition
    ask_exhibit: { patterns: [
      "donde esta la (nueva exposicion | exposicion nueva | exposicion temporal) #h:e_where", "donde (esta | queda) @exh_any", "como (llego | llegamos) a @exh_any", "(en que | que) piso (esta | queda) @exh_any",
      "por donde (es | esta | se va a) @exh_any", "@exh_any (esta | queda) (arriba | abajo | en este piso | aqui)", "(esta | queda) (arriba | abajo) @exh_any", "(quiero | quisiera | queremos) ver @exh_any",
      "(me puede decir | me dice | me podria decir) donde (esta | queda) @exh_any", "(hay | tienen) (alguna)? (exposicion | exhibicion) (nueva | temporal)", "y @exh_any",
      "donde (puedo | podemos) ver @exh_any", "@exh_any donde (esta | queda)",
    ] },
    ask_included: { patterns: [
      "(esta | es) (incluida | incluido) [en el boleto | en la entrada | en el precio] #h:e_included", "@exh_any (esta incluida | esta incluido | tiene costo | cuesta extra | se paga aparte | es gratis)",
      "(tengo | hay) que pagar (aparte | extra | mas) [@exh_any | por @exh_any | para @exh_any]", "(tengo | hay) que pagar @exh_any aparte",
      "(necesito | se necesita) (otro boleto | un boleto aparte | un boleto especial) [para @exh_any]",
      "(puedo | podemos) ver @exh_any con (este | mi | el) boleto", "(se paga | es) aparte #bare", "(es | sera) gratis #bare", "[@exh_any] no (esta | viene) (incluida | incluido) [@exh_any] [verdad | o si]", "(el boleto | la entrada) incluye @exh_any", "(esta | viene) (incluida | incluido) @exh_any",
    ] },
    ask_exhibit_about: { patterns: ["que (puedo | podemos | se puede) ver [aqui | en el museo]", "que hay (aqui | en el museo) [para ver]", "de que (es | trata) @exh_any", "que hay en @exh_any", "que (exposicion | exposiciones) (hay | tienen) [ahorita | ahora]", "que es colores de la noche"] },
    // information
    ask_photos: { patterns: [
      "(puedo | podemos | se puede | se pueden) (tomar | sacar | hacer) (fotos | fotografias | una foto) [adentro | aqui | dentro] #h:q_photos",
      "(se permite | se permiten | estan permitidas) (las)? (fotos | fotografias)", "(puedo | se puede) usar (el)? flash", "(puedo | se puede) usar (mi | el) (celular | camara) [para (fotos | tomar fotos)]",
      "(se vale | esta bien) tomar fotos", "(se puede | puedo) fotografiar", "(se permite | esta permitido | esta prohibido | es posible) (tomar | sacar) fotos", "(puedo | se puede) tomar fotos (con | sin) flash", "(hay | tienen) (alguna)? (regla | restriccion) (para | con) (las)? fotos",
    ] },
    ask_coat: { patterns: [
      "(hay | tienen) (paqueteria | guardarropa | lockers | casilleros) #h:q_coat", "donde (dejo | puedo dejar | se deja) (mi | la) (mochila | bolsa | maleta) #bag #h:q_coat",
      "donde (dejo | puedo dejar) (mis cosas | mi chamarra | mi sombrero | mi paraguas)", "(puedo | se puede) (entrar | pasar) con (mi | la) (mochila | bolsa) #bag", "donde esta (la paqueteria | el guardarropa)", "(hay | tienen) (un | algun)? (lugar | sitio) (para)? (dejar | guardar) (la | mi | las | mis) (mochila | mochilas | bolsa | bolsas | cosas) #bag", "(puedo | podemos) (dejar | guardar) (la | mi | las | mis) (mochila | mochilas | bolsa | cosas) [aqui] #bag", "(tengo | hay) que dejar (la | mi) (mochila | bolsa) #bag",
    ] },
    ask_shop: { patterns: ["(donde esta | hay) (la | una) tienda [del museo | de recuerdos | de regalos] #h:q_shop", "donde (puedo comprar | compro | venden) (postales | recuerdos | souvenirs | regalos)", "hay souvenirs", "(venden | tienen) (postales | recuerdos | souvenirs | libros | regalos)"] },
    ask_cafe: { patterns: ["(hay | tienen | donde esta) (una | la)? (cafeteria | cafe | restaurante) [aqui | en el museo]", "donde (puedo | podemos) (comer | tomar un cafe | tomar algo)", "(hay | tienen) (algun | un)? (lugar | sitio) (para | donde) (comer | tomar (un)? cafe | tomar algo)"] },
    ask_restroom: { patterns: ["donde (esta | estan | quedan | queda) (el bano | el banyo | los banos | el sanitario | los sanitarios | el aseo | los aseos | el servicio) #h:q_restroom", "(hay | tienen) (bano | banos)", "donde hay (un)? (bano | banos | sanitario | sanitarios)"] },
    ask_hours: { patterns: [
      "a que hora (cierran | cierra [el museo]) [hoy #today] #h:q_close", "hasta que hora (abren | esta abierto | estan abiertos) [hoy #today]", "cual es el horario", "que horario (tienen | tiene)",
      "(abren | esta abierto) (manana | el {day} | los {day} | todos los dias)", "a que hora (abren | abre) [manana | el {day} | los {day}]",
      "hasta que hora (se puede | puedo | podemos) (entrar | pasar) [hoy #today]", "(a que hora | cuando) es la ultima entrada",
    ] },
    ask_map: { patterns: ["(tiene | tienen | me da | hay) (un | algun)? (mapa | plano | folleto) [del museo] #h:q_map", "me puede dar un (mapa | plano)"] },
    ask_exit: { patterns: ["(donde esta | donde queda | por donde es) la salida", "por donde (salgo | salimos | se sale)"] },
    ask_touch: { patterns: ["(se puede | puedo | podemos | se pueden) tocar [algo | las piezas | las pinturas | las obras | los cuadros | las esculturas]"] },
    // the elevator, and "¿Es accesible?" (a wheelchair, a stroller): the elevator's answer
    ask_elevator: { patterns: ["(hay | donde esta) (un | el)? (elevador | ascensor)", "(es | esta) accesible [para (silla | sillas) de ruedas]", "(hay | tienen) (acceso | rampa) para (silla | sillas) de ruedas",
      "(puedo | se puede | podemos) (entrar | subir | pasar) con (una | la | mi)? (silla de ruedas | carriola | carreola)"] },
    // "¿Dónde devuelvo la audioguía?"
    ask_return_guide: { patterns: ["(donde | a donde) (devuelvo | dejo | entrego | regreso) (la | las) @guide_w [al final | cuando termine | despues]", "(donde | a donde) (la | las) (devuelvo | entrego | regreso) [al final | cuando termine | despues]",
      "(donde | a donde) se (devuelve | devuelven | entrega | entregan | regresa | regresan) (la | las) @guide_w", "(donde | a quien) (le)? (devuelvo | entrego) (la | las) @guide_w"] },
    ask_duration: { patterns: ["cuanto tiempo (se necesita | se tarda | hace falta | toma | lleva) [para (ver | verlo) (todo | el museo)]", "cuanto (dura | tarda) (el recorrido | la visita)", "cuanto tiempo (dura | tarda | toma | lleva) (la visita | el recorrido | ver el museo | ver todo)", "(cuanto | que tanto) se tarda (en)? (ver | recorrer) (todo | el museo)", "cuanto tiempo (necesito | necesitamos)"] },
    ask_tour: { patterns: ["(hay | tienen) (visita guiada | visitas guiadas | recorrido guiado | recorridos guiados | tour | visita con guia) [hoy]", "a que hora es la visita guiada", "hay (algun)? guia", "(hay | tienen) (recorridos | recorrido | visitas | visita) (con guia | guiados | guiadas | guiado | guiada) [en {lang}]"] },
    ask_start: { patterns: ["por donde (empiezo | empezamos | se empieza | comienzo)", "donde (empiezo | empieza el recorrido | esta la entrada)", "(por donde | a donde) (voy | vamos) ahora", "donde estan las (salas | piezas | pinturas | colecciones)", "donde (esta | queda) la sala [principal | de exposiciones]", "por donde se (entra | empieza)", "donde se entra",
      // the ground floor's permanent collection (the 3D partition's sign "Colección permanente")
      "(donde | por donde) (esta | queda | empieza | se ve) la (coleccion | exposicion) permanente", "(donde | por donde) (esta | queda | empieza) la coleccion [del museo]"] },
    enough_time: { patterns: [
      "(alcanza | me alcanza | nos alcanza) (el tiempo)? [para ver (todo | la exposicion)]", "(me | nos) da tiempo [de ver (todo | la exposicion)]", "(vale | todavia vale) la pena",
      "(es | son) suficiente [tiempo]", "[solo | nomas] {n:number} minutos", "{n:number} minutos (es | son) (suficiente | suficientes)", "(es | son) suficientes {n:number} minutos", "(alcanzo | alcanzamos) a ver (todo | la exposicion)",
    ] },
    come_back: { patterns: ["manana (puedo | podemos) (usar | volver con) (el | mi | este) boleto", "(puedo | podemos) usar (el | mi | este) boleto manana", "(sirve | vale) (el boleto)? (para)? manana", "(puedo | podemos) (volver | regresar) manana [con el mismo boleto]", "(el boleto | la entrada) (sirve | vale) para manana",
      "[mejor | entonces] (regreso | vuelvo | regresamos | volvemos | vengo | venimos) manana", "[mejor | entonces] (regreso | vuelvo | regresamos | volvemos) otro dia"] },
    // "No importa": only at "¿Está bien?" (general admission) and after "cerramos en 45 minutos"
    never_mind_ctx: { patterns: ["no importa", "no (me | nos) importa"] },
    more_no: { patterns: [
      "(eso | esto) es todo [por ahora] #h:d_all", "(seria | eso seria) todo", "[no] (nada | nada mas)", "[no] es todo", "[no] (ninguna | ninguna pregunta)",
      "[no] no tengo (preguntas | mas preguntas | ninguna pregunta)", "[no] estoy bien", "[no] (ya | ya esta | asi esta bien)", "[no] (es todo | eso es todo) por ahora", "[no] (todo | todo esta) (claro | bien) #h:d_good", "[no] por ahora (es todo | nada)",
    ] },
    // "Sí, tengo una pregunta"
    have_question: { patterns: ["(todavia no | aun no | espere) [si] (tengo | tenemos) (una | otra | dos) (pregunta | preguntas)", "[si] (tengo | tenemos) (una | unas | dos | otra) (pregunta | preguntas)", "[si] una pregunta", "[si] (puedo | le puedo) (hacer una pregunta | preguntar algo)"] },
    // Don Arturo
    apology: { patterns: [
      "[ay | uy] (perdon | perdone | disculpe | disculpa) #h:a_sorry", "[perdon] no sabia #h:a_didnt_know", "[perdon] ya no (lo | la | los)? (toco | hago) #h:a_again",
      "@sorry_w [@sorry_tail] [@sorry_w]", "[@sorry_w] @sorry_tail [@sorry_w]", "@sorry_tail y @sorry_tail",
    ] },
    deny: { patterns: [
      "[pero] (yo)? no (lo | la | los)? toqué [nada | @piece] [se lo juro | de verdad | en serio] [@only_looking]", "[pero] no estaba tocando (nada | @piece) [@only_looking]",
      "@only_looking", "(solo | nomas) (lo | la)? (señalé | apunté)", "[pero] (yo)? no fui (yo)?", "[pero] (yo)? no (estoy tocando | toco) nada", "[pero] no (usé | estaba usando | estoy usando) (el)? flash", "mi (camara | celular) no tiene flash",
    ] },
    why_not: { patterns: ["por que [no]", "por que no se puede tocar", "por que no (puedo | podemos | se pueden) tocar (las | los)? (pinturas | cuadros | obras | piezas)?", "por que no se (permite | puede) [el flash | usar flash]"] },
  },

  lines: {
    // --- openers ----------------------------------------------------------------
    greet: [
      t("¡Hola! | ¡{m:Bienvenido|f:Bienvenida} | al | Museo | de | la | Costa Maya! | ¿Cuántos | boletos | va | a | querer?", "Hi! | Welcome | to the | Museum | of | the | Maya Coast! | How many | tickets | are you going | to | want?", "Hi! Welcome to the Costa Maya Museum! How many tickets would you like?",
        { flags: { 1: "Bienvenido / bienvenida: the form agrees with you." },
          neutral: t("¡Hola! | ¡{m:Bienvenido|f:Bienvenida} | al | Museo | de | la | Costa Maya! | ¿Cuántas | entradas | va | a | querer?", "Hi! | Welcome | to the | Museum | of | the | Maya Coast! | How many | tickets | are you going | to | want?", "Hi! Welcome to the Costa Maya Museum! How many tickets would you like?",
            { flags: { 1: "Bienvenido / bienvenida: the form agrees with you." } }) }),
      t("¡Buenas! | ¿Boletos | para | hoy?", "Hi! | Tickets | for | today?", "Hi there! Tickets for today?", { flags: { 0: "¡Buenas!: short for buenos días / buenas tardes, a friendly hello." },
        neutral: t("¡Buenas! | ¿Entradas | para | hoy?", "Hi! | Tickets | for | today?", "Hi there! Tickets for today?", { flags: { 0: "¡Buenas!: short for buenos días / buenas tardes, a friendly hello." } }) }),
      t("¡Hola! | ¿En | qué | le | puedo | ayudar?", "Hi! | In | what | (to) you | can I | help?", "Hi! How can I help you?"),
    ],
    greet_pm: [t("¡Buenas tardes! | {m:Bienvenido|f:Bienvenida} | al | museo.", "Good afternoon! | Welcome | to the | museum.", "Good afternoon! Welcome to the museum.")],
    late: [t("Le | aviso | que | hoy | cerramos | en | 45 | minutos.", "(To) you | I-let-know | that | today | we-close | in | 45 | minutes.", "Just so you know, we close in 45 minutes today.", { say: "Le aviso que hoy cerramos en cuarenta y cinco minutos." })],
    enough_time: [t("Sí, | le | alcanza | para | ver | la | exposición | nueva.", "Yes, | (for) you | it's enough | to | see | the | exhibition | new.", "Yes, that's enough time to see the new exhibition.")],
    still_time: [t("Pero | en | 45 | minutos | le | alcanza | para | ver | la | exposición | nueva.", "But | in | 45 | minutes | (for) you | it's enough | to | see | the | exhibition | new.", "But 45 minutes is enough to see the new exhibition.", { say: "Pero en cuarenta y cinco minutos le alcanza para ver la exposición nueva." })],
    open_tomorrow_short: [t("Como | guste. | Mañana | abrimos | a | las | diez.", "As | you-like. | Tomorrow | we-open | at | — | ten.", "Whatever you prefer. Tomorrow we open at ten.", { flags: { 5: ART } })],
    closed_tomorrow_short: [t("Como | guste, | pero | mañana | es | lunes | y | cerramos.", "As | you-like, | but | tomorrow | is | Monday | and | we're closed.", "Whatever you prefer, but tomorrow's Monday and we're closed.")],
    come_back: [t("Lo siento, | el | boleto | es | solo | para | hoy.", "I'm sorry, | the | ticket | is | only | for | today.", "Sorry, the ticket is only good for today.",
      { neutral: t("Lo siento, | la | entrada | es | solo | para | hoy.", "I'm sorry, | the | ticket | is | only | for | today.", "Sorry, the ticket is only good for today.") })],
    open_tomorrow: [t("Mañana | abrimos | a | las | diez.", "Tomorrow | we-open | at | — | ten.", "Tomorrow we open at ten.", { flags: { 3: ART } })],
    closed_tomorrow: [t("Y | mañana | es | lunes: | cerramos.", "And | tomorrow | is | Monday: | we're closed.", "And tomorrow's Monday: we're closed.")],
    close_late: [t("Hoy | cerramos | en | 45 | minutos.", "Today | we-close | in | 45 | minutes.", "We close in 45 minutes today.", { say: "Hoy cerramos en cuarenta y cinco minutos." })],

    // --- tickets ------------------------------------------------------------------
    ask_qty: [
      t("¿Cuántos | boletos?", "How many | tickets?", "How many tickets?", { neutral: t("¿Cuántas | entradas?", "How many | tickets?", "How many tickets?") }),
      t("¿Cuántos | boletos | le | doy?", "How many | tickets | (to) you | I-give?", "How many tickets would you like?",
        { neutral: t("¿Cuántas | entradas | le | doy?", "How many | tickets | (to) you | I-give?", "How many tickets would you like?") }),
    ],
    group_max: [t("Lo siento, | los | grupos | de | diez | o | más | tienen | que | reservar | antes.", "I'm sorry, | the | groups | of | ten | or | more | have | to | book | ahead.", "Sorry, groups of ten or more need to book ahead.")],
    ask_type_one: [t("¡Claro! | ¿Entrada | general?", "Sure! | Admission | general?", "Sure! General admission?")],
    ask_type_all: [t("¡Claro! | ¿Todos | son | adultos?", "Sure! | All | are | adults?", "Sure! Are they all adults?")],
    ask_type_any: [t("¡Claro! | ¿Hay | algún | estudiante, | adulto mayor | o | niño?", "Sure! | Is there | any | student, | senior | or | child?", "Sure! Any students, seniors, or kids?")],
    ask_types_again: [t("Muy | bien. | ¿Cuántos | adultos, | estudiantes, | adultos mayores | o | niños?", "Very | good. | How many | adults, | students, | seniors | or | children?", "Okay. How many adults, students, seniors, or kids?")],
    ask_amb: [t("Perdón, | ¿entrada | general | o | de | {X}?", "Sorry, | admission | general | or | for | {X}?", "Sorry, general admission or a {X} ticket?")],
    ack: [t("Perfecto.", "Perfect.", "Perfect."), t("Muy | bien.", "Very | good.", "Okay."), t("Claro.", "Sure.", "Sure.")],
    changed: [t("Claro, | ya | lo | cambié.", "Sure, | already | it | I-changed.", "Sure, I've changed it.")],
    no_problem: [t("No hay problema.", "No problem.", "No problem.")],
    prices: [t("La | entrada | general | cuesta | {$price}. | Estudiantes | y | adultos mayores | pagan | {$amount}, | y | los | niños | menores | de | doce | entran | gratis.",
      "The | admission | general | costs | {$price}. | Students | and | seniors | pay | {$amount}, | and | the | children | younger | than | twelve | get in | free.",
      "General admission is {$price}. Students and seniors pay {$amount}, and kids under twelve get in free.")],
    discount_student: [t("Los | estudiantes | pagan | {$price}, | con | credencial | vigente.", "The | students | pay | {$price}, | with | ID card | valid.", "Students pay {$price} with a valid student ID.", { flags: { 5: CRED } })],
    discount_senior: [t("Las | personas | de | sesenta | o | más | pagan | {$price}.", "The | people | of | sixty | or | more | pay | {$price}.", "People sixty and over pay {$price}.")],
    discount_senior_short: [t("Y | las | personas | de | sesenta | o | más, | también | {$price}.", "And | the | people | of | sixty | or | more, | also | {$price}.", "And people sixty and over pay {$price} too.")],
    child_adult: [t("A partir de | los | doce | años | pagan | entrada | general.", "From | the | twelve | years | they-pay | admission | general.", "From age twelve, it's general admission.", { flags: { 1: "los doce años: age twelve (Spanish uses the article)." } })],
    kids_free: [t("Los | niños | menores | de | doce | entran | gratis.", "The | children | younger | than | twelve | get in | free.", "Kids under twelve get in free.")],

    // --- student ID ------------------------------------------------------------------
    ask_id: [t("¿Me | muestra | su | credencial | de | estudiante, | por favor?", "(To) me | you-show | your | ID card | of | student, | please?", "May I see your student ID, please?", { flags: { 3: CRED } })],
    ask_ids: [t("¿Me | muestran | sus | credenciales | de | estudiante, | por favor?", "(To) me | you-all-show | your | ID cards | of | student, | please?", "May I see your student IDs, please?", { flags: { 1: "muestran: ustedes, speaking to the whole group." } })],
    id_ok: [t("Gracias, | está bien.", "Thanks, | it's fine.", "Thanks, that's fine."), t("Perfecto, | gracias.", "Perfect, | thanks.", "Great, thank you.")],
    id_missing: [t("Lo siento, | sin | credencial | vigente | le | tengo | que | cobrar | la | entrada | general. | ¿Está bien?", "I'm sorry, | without | ID card | valid | (to) you | I-have | to | charge | the | admission | general. | Is that okay?", "Sorry, without a valid ID I have to charge general admission. Is that okay?")],
    id_sorry: [t("Lo siento | mucho. | Así | son | las | reglas.", "I'm sorry | very much. | So | are | the | rules.", "I'm really sorry. Those are the rules.")],
    rules: [t("Son | las | reglas | del | museo.", "They're | the | rules | of the | museum.", "Those are the museum's rules.")],

    // --- audio guide ------------------------------------------------------------------
    offer_guide: [
      t("¿Le gustaría | una | audioguía? | Cuesta | {$price}.", "Would you like | an | audio guide? | It costs | {$price}.", "Would you like an audio guide? It's {$price}."),
      t("¿Va | a | querer | audioguía? | Son | {$price}.", "Are you going | to | want | audio guide? | It's | {$price}.", "Would you like an audio guide? It's {$price}."),
    ],
    guide_again2: [t("Entonces, | ¿le | doy | una | audioguía?", "So, | (to) you | I-give | an | audio guide?", "So, can I get you an audio guide?")],
    guide_cost: [t("La | audioguía | cuesta | {$price}.", "The | audio guide | costs | {$price}.", "The audio guide is {$price}.")],
    guide_not_included: [t("No, | la | audioguía | cuesta | {$price} | aparte.", "No, | the | audio guide | costs | {$price} | extra.", "No, the audio guide is {$price} extra.")],
    guide_again: [t("¿Y | la | audioguía? | ¿La | va | a | querer?", "And | the | audio guide? | It | are you going | to | want?", "And the audio guide, would you like one?", { flags: { 3: "la: it, the audio guide (la audioguía)." } })],
    // ends on a question a yes answers ("¿Se anima?"): after "¿Seguro?" a "Sí" meant "I'm sure" and took the guide
    guide_persuade: [t("Es | muy | buena | para | la | exposición | nueva. | ¿Se anima?", "It's | very | good | for | the | exhibition | new. | Will you go for it?", "It's really good for the new exhibition. Want to give it a try?",
      { flags: { 7: "¿Se anima? (animarse): will you go for it? A friendly push." } })],
    guide_price: [t("Cuesta | {$price}, | y | la | tenemos | en | cinco | idiomas.", "It costs | {$price}, | and | it | we-have | in | five | languages.", "It's {$price}, and we have it in five languages.", { flags: { 3: "la: it, the audio guide (la audioguía)." } })],
    ask_lang: [
      t("¿En | qué | idioma | la | quiere?", "In | what | language | it | do you want?", "Which language would you like?", { flags: { 3: "la: it, the audio guide (la audioguía)." } }),
      t("¿En | qué | idioma?", "In | what | language?", "Which language?"),
    ],
    ask_lang_pl: [t("¿En | qué | idioma | las | quieren?", "In | what | language | them | do you all want?", "Which language would you like them in?", { flags: { 3: "las: them, the audio guides (las audioguías).", 4: "quieren: ustedes, speaking to the whole group." } })],
    ask_lang_short: [t("¿Cuál | le | doy?", "Which one | (to) you | I-give?", "Which one would you like?")],
    langs_list: [t("Tenemos | español, | inglés, | francés, | alemán | e | italiano.", "We-have | Spanish, | English, | French, | German | and | Italian.", "We have Spanish, English, French, German, and Italian.", { flags: { 5: "e: y (and) becomes e before an i sound." } })],
    langs_list_short: [t("Pero | tenemos | inglés, | francés, | alemán | e | italiano, | y | claro, | español.", "But | we-have | English, | French, | German | and | Italian, | and | of course, | Spanish.", "But we have English, French, German, and Italian, and Spanish, of course.", { flags: { 5: "e: y (and) becomes e before an i sound." } })],
    no_lang: [t("Lo siento, | en | {X} | no la tenemos.", "I'm sorry, | in | {X} | we don't have it.", "Sorry, we don't have it in {X}.")],
    speak_english: [t("Muy | poquito, | pero | le | hablo | despacio.", "Very | little, | but | (to) you | I'll-speak | slowly.", "Just a little, but I'll speak slowly for you.",
      { flags: { 1: "poquito: a little bit (poco + the diminutive -ito)." } })],
    have_lang: [t("Sí, | la | tenemos.", "Yes, | it | we-have.", "Yes, we do.", { flags: { 1: "la: it, the audio guide (la audioguía)." } })],
    guide_return: [t("Aquí mismo, | en | la | taquilla, | cuando | termine.", "Right here, | at | the | ticket desk, | when | you-finish.", "Right here at the ticket desk, when you're done.",
      { flags: { 3: "la taquilla: the ticket desk (the box office)." } })],

    // --- paying ----------------------------------------------------------------------
    say_total: [
      t("Son | {$price}, | por favor.", "It's | {$price}, | please.", "That's {$price}, please."),
      t("Serían | {$price}.", "It would be | {$price}.", "That'll be {$price}.", { flags: { 0: "Serían (it would be): a soft, polite way to give the total." } }),
      t("En | total | son | {$price}.", "In | total | it's | {$price}.", "Your total is {$price}."),
    ],
    pay_how: [t("¿Va | a | pagar | en efectivo | o | con | tarjeta?", "Are you going | to | pay | in cash | or | with | card?", "Will that be cash or card?")],
    card_tap: [t("Claro, | le | paso | la | terminal.", "Sure, | (to) you | I-pass | the | card machine.", "Sure, here's the card machine.", { flags: { 4: "la terminal: the card machine." } })],
    card_later: [t("Sí, | aceptamos | tarjeta.", "Yes, | we-accept | card.", "Yes, we take cards.")],
    cash_yes: [t("Sí, | claro.", "Yes, | of course.", "Yes, of course.")],
    cash_then: [t("Entonces | en efectivo.", "Then | in cash.", "Cash, then.")],
    cash_ok: [t("De acuerdo, | en efectivo.", "Okay, | in cash.", "Okay, cash.")],
    phone_ok: [t("Claro, | acerque | su | celular | a | la | terminal.", "Sure, | bring close | your | cell phone | to | the | card machine.", "Sure, just hold your phone to the card machine.")],
    phone_later: [t("Sí, | también | se puede | con | el | celular.", "Yes, | also | you can | with | the | cell phone.", "Yes, you can pay with your phone too.")],
    dollars: [t("Lo siento, | solo | aceptamos | pesos. | También | puede | pagar | con | tarjeta.", "I'm sorry, | only | we-accept | pesos. | Also | you-can | pay | with | card.", "Sorry, we only take pesos. You can also pay by card.")],
    paid: [t("¡Gracias!", "Thank you!", "Thank you!"), t("Listo, | gracias.", "Done, | thanks.", "All set, thanks.")],
    change_back: [t("Gracias. | Aquí | tiene | su | cambio.", "Thanks. | Here | you have | your | change.", "Thank you. Here's your change.")],
    ticket_here: [t("Aquí | tiene | su | boleto.", "Here | you have | your | ticket.", "Here's your ticket.",
      { neutral: t("Aquí | tiene | su | entrada.", "Here | you have | your | ticket.", "Here's your ticket.") })],
    tickets_here: [t("Aquí | tiene | sus | boletos.", "Here | you have | your | tickets.", "Here are your tickets.",
      { neutral: t("Aquí | tiene | sus | entradas.", "Here | you have | your | tickets.", "Here are your tickets.") })],
    guide_here: [t("Y | aquí | está | su | audioguía, | en | {X}. | Marque | el | número | de | cada | pieza.", "And | here | is | your | audio guide, | in | {X}. | Key in | the | number | of | each | piece.", "And here's your audio guide, in {X}. Just key in the number of each piece.")],
    guides_here: [t("Y | aquí | están | sus | audioguías, | en | {X}. | Marquen | el | número | de | cada | pieza.", "And | here | are | your | audio guides, | in | {X}. | Key in (pl.) | the | number | of | each | piece.", "And here are your audio guides, in {X}. Just key in the number of each piece.", { flags: { 7: "Marquen: ustedes, speaking to the whole group." } })],
    bag_rule: [t("Si | trae | mochila, | por favor | déjela | en | paquetería, | aquí | a | la | entrada.", "If | you-bring | backpack, | please | leave it | at | bag check, | here | at | the | entrance.", "If you have a backpack, please leave it at the bag check, here by the entrance.", { flags: { 6: PAQ },
      neutral: t("Si | trae | mochila, | por favor | déjela | en | el | guardarropa, | aquí | a | la | entrada.", "If | you-bring | backpack, | please | leave it | at | the | bag check, | here | at | the | entrance.", "If you have a backpack, please leave it at the bag check, here by the entrance.") })],
    already_paid: [t("Ya | está | pagado.", "Already | it's | paid.", "You've already paid.")],

    // --- the new exhibition ------------------------------------------------------------
    exhibit_where: [
      t("La | exposición | nueva, | “Colores de la noche”, | está | arriba, | a la derecha.", "The | exhibition | new, | “Colors of the Night”, | is | upstairs, | on the right.", "The new exhibition, “Colors of the Night”, is upstairs on the right."),
      t("Está | en | la | planta | alta, | a la derecha. | Puede | subir | por | las | escaleras | o | en | el | elevador.", "It's | on | the | floor | upper, | on the right. | You-can | go up | by | the | stairs | or | in | the | elevator.", "It's upstairs on the right. You can take the stairs or the elevator.",
        { flags: { 3: "planta alta: the upper floor (planta baja = the ground floor)." } }),
    ],
    exhibit_included_full: [t("Sí, | la | exposición | nueva | viene | incluida | en | su | boleto. | Está | arriba, | a la derecha.", "Yes, | the | exhibition | new | comes | included | in | your | ticket. | It's | upstairs, | on the right.", "Yes, the new exhibition is included in your ticket. It's upstairs on the right.",
      { neutral: t("Sí, | la | exposición | nueva | viene | incluida | en | su | entrada. | Está | arriba, | a la derecha.", "Yes, | the | exhibition | new | comes | included | in | your | ticket. | It's | upstairs, | on the right.", "Yes, the new exhibition is included in your ticket. It's upstairs on the right.") })],
    exhibit_included: [t("Sí, | viene | incluida | en | su | boleto.", "Yes, | it comes | included | in | your | ticket.", "Yes, it's included in your ticket.",
      { neutral: t("Sí, | viene | incluida | en | su | entrada.", "Yes, | it comes | included | in | your | ticket.", "Yes, it's included in your ticket.") })],
    exhibit_about: [t("Son | pinturas | del | mar | Caribe | de noche. | ¡Unos | azules | preciosos!", "They're | paintings | of the | sea | Caribbean | at night. | Some | blues | gorgeous!", "They're paintings of the Caribbean Sea at night. Gorgeous blues!")],
    exhibit_mention: [t("Ah, | y | no se pierda | nuestra | exposición | nueva, | “Colores de la noche”. | Está | arriba, | a la derecha.", "Oh, | and | don't miss | our | exhibition | new, | “Colors of the Night”. | It's | upstairs, | on the right.", "Oh, and don't miss our new exhibition, “Colors of the Night”. It's upstairs on the right.")],

    // --- information ---------------------------------------------------------------------
    photos: [t("Puede | tomar | fotos, | pero | sin | flash, | por favor.", "You-can | take | photos, | but | without | flash, | please.", "You can take photos, but no flash, please.")],
    coat_check: [t("La | paquetería | está | aquí, | a | la | entrada. | Es | gratis.", "The | bag check | is | here, | at | the | entrance. | It's | free.", "The bag check is right here by the entrance. It's free.", { flags: { 1: PAQ },
      neutral: t("El | guardarropa | está | aquí, | a | la | entrada. | Es | gratis.", "The | bag check | is | here, | at | the | entrance. | It's | free.", "The bag check is right here by the entrance. It's free.") })],
    bag_check: [t("Las | mochilas | se dejan | en | paquetería, | aquí | a | la | entrada. | Es | gratis.", "The | backpacks | are left | at | bag check, | here | at | the | entrance. | It's | free.", "Backpacks go to the bag check, right here by the entrance. It's free.", { flags: { 4: PAQ },
      neutral: t("Las | mochilas | se dejan | en | el | guardarropa, | aquí | a | la | entrada. | Es | gratis.", "The | backpacks | are left | at | the | bag check, | here | at | the | entrance. | It's | free.", "Backpacks go to the bag check, right here by the entrance. It's free.") })],
    bag_again: [t("En | la | paquetería, | aquí | a | la | entrada.", "At | the | bag check, | here | at | the | entrance.", "At the bag check, right here by the entrance.", { flags: { 2: PAQ },
      neutral: t("En | el | guardarropa, | aquí | a | la | entrada.", "At | the | bag check, | here | at | the | entrance.", "At the bag check, right here by the entrance.") })],
    shop_cafe: [t("La | tienda | y | la | cafetería | están | en | la | planta | baja, | junto | a | la | salida.", "The | shop | and | the | café | are | on | the | floor | ground, | next | to | the | exit.", "The shop and the café are on the ground floor, next to the exit.")],
    restroom: [t("Los | baños | están | al fondo | del | pasillo, | pasando | la | paquetería.", "The | restrooms | are | at the end | of the | hallway, | past | the | bag check.", "The restrooms are at the end of the hall, past the bag check.", { flags: { 8: PAQ },
      neutral: t("Los | baños | están | al fondo | del | pasillo, | pasando | el | guardarropa.", "The | restrooms | are | at the end | of the | hallway, | past | the | bag check.", "The restrooms are at the end of the hall, past the bag check.") })],
    hours: [t("Abrimos | de | martes | a | domingo, | de | diez | a | cinco. | Los | lunes | cerramos.", "We-open | from | Tuesday | to | Sunday, | from | ten | to | five. | On | Mondays | we're closed.", "We're open Tuesday to Sunday, ten to five. We're closed on Mondays.",
      { flags: { 9: "los before a weekday = on (every) …" } })],
    close_today: [t("Hoy | cerramos | a | las | cinco.", "Today | we-close | at | — | five.", "We close at five today.", { flags: { 3: ART } })],
    exit: [t("La | salida | está | en | la | planta | baja, | junto | a | la | tienda.", "The | exit | is | on | the | floor | ground, | next | to | the | shop.", "The exit is on the ground floor, next to the shop.")],
    touch_rule: [t("No, | no se puede | tocar | nada. | Pero | sí | puede | tomar | fotos, | sin | flash.", "No, | you can't | touch | anything. | But | yes | you-can | take | photos, | without | flash.", "No, you can't touch anything. But you can take photos, without flash.", { flags: { 5: "sí before a verb stresses it: you CAN take photos." } })],
    floor_plan: [t("¡Claro! | Aquí | tiene | un | mapa | del | museo.", "Sure! | Here | you have | a | map | of the | museum.", "Sure! Here's a map of the museum.")],
    elevator: [t("El | elevador | está | ahí, | a la izquierda.", "The | elevator | is | there, | on the left.", "The elevator is over there on the left.")],
    duration: [t("Más o menos | una | hora | y | media.", "More or less | an | hour | and | a half.", "About an hour and a half.")],
    duration_late: [t("Más o menos | una | hora | y | media, | pero | en | 45 | minutos | le | alcanza | para | la | exposición | nueva.", "More or less | an | hour | and | a half, | but | in | 45 | minutes | (for) you | it's enough | for | the | exhibition | new.", "About an hour and a half, but 45 minutes is enough for the new exhibition.", { say: "Más o menos una hora y media, pero en cuarenta y cinco minutos le alcanza para la exposición nueva." })],
    tour: [t("Los | sábados | a | las | doce | hay | una | visita | guiada | gratis, | en | español.", "On | Saturdays | at | — | twelve | there is | a | tour | guided | free, | in | Spanish.", "On Saturdays at noon there's a free guided tour, in Spanish.",
      { flags: { 0: "los before a weekday = on (every) …", 3: ART } })],
    start: [t("Las | salas | empiezan | ahí, | a la izquierda.", "The | galleries | start | there, | on the left.", "The galleries start over there on the left.")],

    // --- Sundays ---------------------------------------------------------------------------
    free_days_today: [t("Hoy | no. | La | entrada | es | libre | los | domingos, | para | mexicanos | y | residentes.", "Today | no. | The | admission | is | free | on | Sundays, | for | Mexicans | and | residents.", "Not today. Admission is free on Sundays, for Mexicans and residents.",
      { flags: { 6: "los before a weekday = on (every) …" } })],
    free_days: [t("Los | domingos | la | entrada | es | libre | para | mexicanos | y | residentes.", "On | Sundays | the | admission | is | free | for | Mexicans | and | residents.", "On Sundays admission is free for Mexicans and residents.",
      { flags: { 0: "los before a weekday = on (every) …", 5: "entrada libre: free admission." } })],
    sunday_note: [t("Hoy | es | domingo: | la | entrada | es | libre | para | mexicanos | y | residentes. | Para | visitantes, | es | el | precio | normal.", "Today | is | Sunday: | the | admission | is | free | for | Mexicans | and | residents. | For | visitors, | it's | the | price | regular.", "It's Sunday: admission is free for Mexicans and residents. For visitors, it's the regular price.",
      { flags: { 6: "entrada libre: free admission." } })],
    res_ask: [t("¿Me | muestra | su | tarjeta | de | residente?", "(To) me | you-show | your | card | of | resident?", "May I see your residence card?")],
    res_ok: [t("Gracias. | Entonces | su | entrada | es | gratis.", "Thanks. | Then | your | admission | is | free.", "Thank you. Then your admission is free.")],
    sunday_short: [t("Solo | para | mexicanos | y | residentes.", "Only | for | Mexicans | and | residents.", "Only for Mexicans and residents.")],
    res_no: [t("Sin | la | tarjeta, | le | tengo | que | cobrar | el | precio | normal.", "Without | the | card, | (to) you | I-have | to | charge | the | price | regular.", "Without the card, I have to charge the regular price.")],
    res_weekday: [t("Hoy | todos | pagan | lo | mismo: | la | entrada | es | libre | solo | los | domingos.", "Today | everyone | pays | the | same: | the | admission | is | free | only | on | Sundays.", "Today everyone pays the same: admission is only free on Sundays.",
      { flags: { 10: "los before a weekday = on (every) …" } })],
    visitor_normal: [t("Entonces | es | el | precio | normal.", "Then | it's | the | price | regular.", "Then it's the regular price.")],
    visitor_welcome: [t("¡Qué | bien! | {m:Bienvenido|f:Bienvenida} | a | Puerto Colibrí.", "How | nice! | Welcome | to | Puerto Colibrí.", "How nice! Welcome to Puerto Colibrí.")],

    // --- the end --------------------------------------------------------------------------
    ask_more: [
      t("¿Tiene | alguna | pregunta?", "Do you have | any | question?", "Do you have any questions?"),
      t("¿Le | puedo | ayudar | en | algo | más?", "(To) you | I-can | help | in | anything | else?", "Can I help you with anything else?"),
    ],
    ask_more_else: [t("¿Algo | más?", "Anything | else?", "Anything else?"), t("¿Alguna | otra | pregunta?", "Any | other | question?", "Any other questions?")],
    enjoy: [
      t("¡Que | disfrute | su | visita!", "May | you-enjoy | your | visit!", "Enjoy your visit!"),
      t("¡Que | disfrute | el | museo!", "May | you-enjoy | the | museum!", "Enjoy the museum!"),
    ],
    // --- Don Arturo (guard) -----------------------------------------------------------------------
    dont_touch: [
      // he stands by the Maya stela and the clay vessels (the 3D room and the picture): las piezas, not las pinturas
      t("¡Disculpe! | Por favor, | no toque | las | piezas.", "Excuse me! | Please, | don't touch | the | pieces.", "Excuse me! Please don't touch the exhibits."),
      t("¡Disculpe! | No se puede | tocar, | por favor.", "Excuse me! | You can't | touch, | please.", "Excuse me! No touching, please."),
    ],
    no_flash: [t("¡Disculpe! | Sin | flash, | por favor.", "Excuse me! | Without | flash, | please.", "Excuse me! No flash, please.")],
    harold_thanks: [
      t("Gracias. | Que | siga | disfrutando | su | visita.", "Thanks. | May | you-keep | enjoying | your | visit.", "Thank you. Enjoy the rest of your visit."),
      t("Gracias | por | su | comprensión.", "Thanks | for | your | understanding.", "Thank you for understanding."),
    ],
    harold_why: [t("Las | piezas | son | muy | antiguas | y | delicadas.", "The | pieces | are | very | old | and | delicate.", "The pieces are very old and delicate.")],
    harold_why_flash: [t("El | flash | daña | las | piezas.", "The | flash | damages | the | pieces.", "Flash damages the exhibits.")],
    harold_deny: [t("Ah, | perdone, | me equivoqué. | Siga | disfrutando | su | visita.", "Oh, | forgive me, | I was wrong. | Keep | enjoying | your | visit.", "Oh, sorry, my mistake. Enjoy the rest of your visit.")],
    harold_ask: [t("¿De acuerdo?", "Okay?", "Okay?")],
  },

  domains: {
    // every total (and every extra after paying, itself such a total) for up to nine tickets (MAX_TIX) and nine guides,
    // with a Sunday resident's free ticket (or the whole group's: only the guides left)
    price: () => {
      const s = new Set<number>([4000, 5000, 8000]);
      const P = [8000, 4000, 4000, 0];
      for (let a = 0; a <= MAX_TIX; a++) for (let b = 0; a + b <= MAX_TIX; b++) for (let cc = 0; a + b + cc <= MAX_TIX; cc++) for (let d = 0; a + b + cc + d <= MAX_TIX; d++) {
        if (a + b + cc + d === 0) continue;
        const base = a * P[0] + b * P[1] + cc * P[2] + d * P[3];
        const free = a ? 8000 : b || cc ? 4000 : 0;
        for (let g = 0; g <= MAX_TIX; g++) { s.add(base + g * GUIDE); s.add(base - free + g * GUIDE); s.add(g * GUIDE); }
      }
      return [...s].filter((x) => x > 0).sort((x, y) => x - y);
    },
    amount: () => [4000],
  },

  hints: {
    tickets: {
      lt: "Buy a ticket", slot: "ttype", examples: ["adult", "student", "senior"],
      items: [
        { id: "tk_one", s: t("Un | boleto | de | {X}, | por favor.", "One | ticket | for | {X}, | please.", "One {X} ticket, please.",
          { neutral: t("Una | entrada | de | {X}, | por favor.", "One | ticket | for | {X}, | please.", "One {X} ticket, please.") }), only: (e) => e.id !== "child" },
        { id: "tk_two", s: t("Dos | boletos, | por favor.", "Two | tickets, | please.", "Two tickets, please.", { neutral: t("Dos | entradas, | por favor.", "Two | tickets, | please.", "Two tickets, please.") }) },
        { id: "tk_mix", s: t("Dos | adultos | y | un | estudiante, | por favor.", "Two | adults | and | one | student, | please.", "Two adults and one student, please.") },
        { id: "tk_quisiera", s: t("Quisiera | un | boleto | general.", "I'd like | a | ticket | general.", "I'd like one general admission ticket.",
          { neutral: t("Quisiera | una | entrada | general.", "I'd like | a | ticket | general.", "I'd like one general admission ticket.") }), register: "polite" },
        { id: "tk_me_da", s: t("¿Me | da | un | boleto | de | {X}?", "(To) me | you-give | a | ticket | for | {X}?", "Can I have one {X} ticket?",
          { neutral: t("¿Me | da | una | entrada | de | {X}?", "(To) me | you-give | a | ticket | for | {X}?", "Can I have one {X} ticket?") }), only: (e) => e.id !== "child", note: "Very common in Mexico: “¿Me da…?”" },
        { id: "tk_student", s: t("Soy | estudiante.", "I'm | a student.", "I'm a student.") },
      ],
    },
    types_one: {
      lt: "Say which ticket you need",
      items: [
        { id: "ty_yes", s: t("Sí, | por favor.", "Yes, | please.", "Yes, please.") },
        { id: "ty_student", s: t("No, | de | estudiante.", "No, | for | student.", "No, a student ticket.") },
        { id: "ty_senior", s: t("No, | de | adulto mayor, | por favor.", "No, | for | senior, | please.", "No, a senior ticket, please.") },
      ],
    },
    types_all: {
      lt: "Say which tickets you need",
      items: [
        { id: "ty_all", s: t("Sí, | todos | adultos.", "Yes, | all | adults.", "Yes, all adults.") },
        { id: "ty_one_student", s: t("No, | uno | de | nosotros | es | estudiante.", "No, | one | of | us | is | a student.", "No, one of us is a student.") },
        { id: "ty_mix", s: t("Un | adulto | y | un | estudiante, | por favor.", "One | adult | and | one | student, | please.", "One adult and one student, please.") },
      ],
    },
    types_any: {
      lt: "Say which tickets you need",
      items: [
        { id: "ty_just", s: t("No, | solo | adultos.", "No, | only | adults.", "No, just adults.") },
        { id: "ty_yes_student", s: t("Sí, | uno | de | nosotros | es | estudiante.", "Yes, | one | of | us | is | a student.", "Yes, one of us is a student.") },
        { id: "ty_mix", s: t("Un | adulto | y | un | estudiante, | por favor.", "One | adult | and | one | student, | please.", "One adult and one student, please.") },
      ],
    },
    types_mix: {
      lt: "Say which tickets you need",
      items: [
        { id: "ty_mix", s: t("Un | adulto | y | un | estudiante, | por favor.", "One | adult | and | one | student, | please.", "One adult and one student, please.") },
        { id: "ty_they_all", s: t("Todos | somos | adultos.", "All | we-are | adults.", "We're all adults.") },
        { id: "ty_senior_child", s: t("Un | adulto mayor | y | un | niño.", "One | senior | and | one | child.", "One senior and one child.") },
      ],
    },
    okay: {
      lt: "Agree",
      items: [
        { id: "ok_pay", s: t("Está bien, | pago | la | entrada | general.", "That's fine, | I-pay | the | admission | general.", "That's fine, I'll pay general admission.") },
        { id: "ok_full", s: t("Bueno, | pago | el | precio | completo.", "Well, | I-pay | the | price | full.", "Okay, I'll pay full price.") },
      ],
    },
    guide_yes: {
      lt: "Take an audio guide",
      items: [
        { id: "gy_yes", s: t("Sí, | por favor.", "Yes, | please.", "Yes, please.") },
        { id: "gy_take", s: t("Sí, | me llevo | una.", "Yes, | I'll take | one.", "Sure, I'll take one.") },
        { id: "gy_one", s: t("Sí, | una | audioguía, | por favor.", "Yes, | an | audio guide, | please.", "Yes, an audio guide, please.") },
      ],
    },
    prices: {
      lt: "Ask about prices and discounts",
      items: [
        { id: "tk_price", s: t("¿Cuánto | cuesta | la | entrada?", "How much | costs | the | admission?", "How much is admission?") },
        { id: "tk_discount", s: t("¿Hay | descuento | para | estudiantes?", "Is there | discount | for | students?", "Is there a student discount?") },
        { id: "tk_kids", s: t("¿Los | niños | pagan?", "The | children | pay?", "Do kids pay?") },
        { id: "fd_free", s: t("¿Hay | algún | día | gratis?", "Is there | any | day | free?", "Is there a free day?") },
      ],
    },
    id: {
      lt: "Show your student ID",
      items: [
        { id: "id_here", s: t("Aquí | está | mi | credencial.", "Here | is | my | ID card.", "Here's my student ID.") },
        { id: "here_you_go", s: t("Aquí tiene.", "Here you go.", "Here you go.") },
        { id: "id_none", s: t("Perdón, | no la traigo.", "Sorry, | I don't have it on me.", "Sorry, I don't have it with me.") },
      ],
    },
    guide: {
      lt: "Ask for an audio guide (or say no)",
      items: [
        { id: "g_id_like", s: t("Quisiera | una | audioguía, | por favor.", "I'd like | an | audio guide, | please.", "I'd like an audio guide, please.") },
        { id: "g_can", s: t("¿Me | puede | dar | una | audioguía?", "(To) me | can you | give | an | audio guide?", "Could I get an audio guide?") },
        { id: "g_is_there", s: t("¿Tienen | audioguía?", "Do you have | audio guide?", "Do you have audio guides?") },
        { id: "g_price", s: t("¿Cuánto | cuesta | la | audioguía?", "How much | costs | the | audio guide?", "How much is the audio guide?") },
        { id: "g_no", s: t("No, | gracias. | Solo | el | boleto.", "No, | thanks. | Just | the | ticket.", "No, thanks. Just the ticket.",
          { neutral: t("No, | gracias. | Solo | la | entrada.", "No, | thanks. | Just | the | ticket.", "No, thanks. Just the ticket.") }) },
      ],
    },
    lang: {
      lt: "Choose the audio guide's language", slot: "lang", examples: ["english", "spanish", "french", "portuguese"],
      items: [
        { id: "l_please", s: t("En | {X}, | por favor.", "In | {X}, | please.", "In {X}, please.") },
        { id: "l_have", s: t("¿La | tiene | en | {X}?", "It | do you have | in | {X}?", "Do you have it in {X}?", { flags: { 0: "la: it, the audio guide (la audioguía)." } }), note: "Not every language is available: ask first." },
        { id: "l_which", s: t("¿Qué | idiomas | tiene?", "What | languages | do you have?", "What languages do you have?") },
      ],
    },
    exhibit: {
      lt: "Ask about the new exhibition",
      items: [
        { id: "e_where", s: t("¿Dónde | está | la | exposición | nueva?", "Where | is | the | exhibition | new?", "Where's the new exhibition?") },
        { id: "e_included", s: t("¿Está | incluida | en | el | boleto?", "Is it | included | in | the | ticket?", "Is it included in the ticket?",
          { neutral: t("¿Está | incluida | en | la | entrada?", "Is it | included | in | the | ticket?", "Is it included in the ticket?") }) },
      ],
    },
    questions: {
      lt: "Ask about the museum",
      items: [
        { id: "q_photos", s: t("¿Se pueden | tomar | fotos?", "Can one | take | photos?", "Can I take photos?") },
        { id: "q_coat", s: t("¿Dónde | dejo | mi | mochila?", "Where | do I leave | my | backpack?", "Where can I leave my backpack?") },
        { id: "q_shop", s: t("¿Dónde | está | la | tienda?", "Where | is | the | shop?", "Where's the gift shop?") },
        { id: "q_restroom", s: t("¿Dónde | están | los | baños?", "Where | are | the | restrooms?", "Where are the restrooms?") },
        { id: "q_close", s: t("¿A | qué | hora | cierran?", "At | what | time | do you close?", "What time do you close?") },
        { id: "q_map", s: t("¿Tiene | un | mapa | del | museo?", "Do you have | a | map | of the | museum?", "Do you have a map of the museum?") },
      ],
    },
    pay: {
      lt: "Pay",
      items: [
        { id: "pay_card", s: t("¿Puedo | pagar | con | tarjeta?", "Can I | pay | with | card?", "Can I pay by card?") },
        { id: "pay_cash", s: t("Pago | en efectivo.", "I-pay | in cash.", "I'll pay cash.") },
        { id: "here_you_go", s: t("Aquí tiene.", "Here you go.", "Here you go.") },
      ],
    },
    resident: {
      lt: "Say if you live here",
      items: [
        { id: "r_resident", s: t("Soy | residente.", "I'm | a resident.", "I'm a resident.") },
        { id: "r_card", s: t("Aquí | está | mi | tarjeta | de | residente.", "Here | is | my | card | of | resident.", "Here's my residence card.") },
        { id: "r_visitor", s: t("Soy | turista.", "I'm | a tourist.", "I'm a tourist.") },
      ],
    },
    sorry: {
      lt: "Apologize to the guard",
      items: [
        { id: "a_sorry", s: t("¡Ay, | perdón!", "Oh, | sorry!", "Oh, sorry!") },
        { id: "a_didnt_know", s: t("Perdón, | no sabía.", "Sorry, | I didn't know.", "Sorry, I didn't know.") },
        { id: "a_again", s: t("Ya | no lo toco.", "Anymore | I won't touch it.", "I won't touch it again.", { flags: { 0: "ya no: not anymore." } }) },
      ],
    },
    done: {
      lt: "Say you have no more questions",
      items: [
        { id: "d_all", s: t("Eso | es | todo, | gracias.", "That | is | all, | thanks.", "That's all, thanks.") },
        { id: "d_good", s: t("No, | todo | claro, | gracias.", "No, | all | clear, | thanks.", "No, I'm all set, thanks.") },
      ],
    },
  },

  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With museum staff, usted is more polite: ¿Me da…?, ¿Me puede…? (dame and puedes are for friends).", better: "¿Me da dos boletos?" },
  },

  merges: {
    "costa maya": { reason: "lexical_expression", split: "costa → coast + maya → Maya would translate part of the museum's proper name word by word.", minimal: "Only the two-word name; Museo de la stays separate." },
    "adulto mayor": { reason: "lexical_expression", split: "adulto → adult + mayor → older reads a fixed Mexican term word by word: a senior (60 and over).", minimal: "Two words." },
    "adultos mayores": { reason: "lexical_expression", split: "adultos → adults + mayores → older reads a fixed Mexican term word by word: seniors.", minimal: "Two words." },
    "colores de la noche": { reason: "lexical_expression", split: "An exhibition title: translated as a whole (Colors of the Night).", minimal: "The whole title in its quotation marks." },
    "a partir de": { reason: "lexical_expression", split: "a → to + partir → depart + de → from misreads the starting-point expression: from.", minimal: "The three-word preposition only." },
    "de noche": { reason: "lexical_expression", split: "de → of + noche → night misreads the adverb: at night.", minimal: "Two words." },
    "más o menos": { reason: "lexical_expression", split: "más → more + o → or + menos → less is a word-for-word reading of “about”.", minimal: "Three words." },
    "puerto colibrí": { reason: "lexical_expression", split: "puerto → port + colibrí → hummingbird would translate the town's proper name.", minimal: "The two-word name." },
    "le gustaría": { reason: "grammatical_fusion", split: "le → to you + gustaría → would please is a word-for-word reading of one English verb: would you like.", minimal: "Clitic and verb only." },
    "se anima": { reason: "grammatical_fusion", split: "se → yourself + anima → encourages reads the reflexive verb word by word: animarse = to go for it.", minimal: "Pronoun and verb only." },
    "aquí mismo": { reason: "lexical_expression", split: "aquí → here + mismo → same misreads the emphatic adverb: right here.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  // The plan: ticket → audio guide (+ its language) → pay → where the new exhibition is.
  // A student ticket adds the ID; Don Arturo's "No se puede tocar" (a later visit) adds the apology.
  mission: [
    { lt: "Ask for a ticket", done: (c) => !!c.s.tix && count(c.s.tix) > 0 && !!c.s.typesKnown },
    { lt: "Show your student ID", optional: true, when: (c) => !!c.s.tix?.student && !c.s.idChecked, done: (c) => !!c.s.idShown },
    { lt: "Get an audio guide", optional: true, when: (c) => !c.s.guideNo, done: (c) => !!c.s.guides },
    { step: "lang", lt: "Choose the audio guide's language", optional: true },
    { lt: "Pay", done: (c) => !!c.s.paid },
    { lt: "Find out where the new exhibition is", done: (c) => !!c.s.exhibitKnown },
    { lt: "Apologize to the guard", optional: true, when: (c) => !!c.s.harold && !c.s.denied, done: (c) => !!c.s.apologized },
  ],
  steps: [
    { id: "tickets", done: (c) => !!c.s.tix && count(c.s.tix) > 0,
      ask: (c) => c.say("ask_qty"),
      // The bare number (qty_ctx) and everything that can hold a ticket type: the expected bonus counts once per parse,
      // so "Un boleto de estudiante" stays one buy_tickets and "¿Hay descuento para personas mayores?" one question.
      // want_guide too: "Quiero dos audioguías" is two guides, not "Quiero dos" (tickets) + "audioguías".
      expects: [...TICKET_TALK, "want_guide", "lang_q"],
      suggest: [
        { lt: "Ask for a ticket", hint: "tickets", options: "ttype" },
        { lt: "Ask about prices and discounts", hint: "prices" },
        { lt: "Ask about the audio guide", hint: "guide" },
      ],
      help: (c) => { c.say("prices", { price: 8000, amount: 4000 }); c.say("ask_qty"); } },
    { id: "types", when: (c) => !!c.s.tix && !c.s.typesKnown, done: (c) => !!c.s.typesKnown,
      ask: (c) => { askTypes(c); },
      expects: ["all_adults_ctx", "mixed_types_ctx", "types_ans", "buy_tickets"],
      suggest: [{ lt: "Say which tickets you need", hint: "types_mix", options: "ttype" }] },
    { id: "student_id", when: (c) => !!c.s.tix?.student && !c.s.idChecked, done: (c) => !!c.s.idChecked,
      ask: (c) => c.say(c.s.tix.student > 1 ? "ask_ids" : "ask_id"),
      expects: ["have_id", "no_id", "here_you_go"],
      suggest: [{ lt: "Show your student ID", hint: "id" }],
      yes: (c) => { H.have_id(c, {}, { intent: "have_id", slots: {}, tags: [] }); },
      no: (c) => { H.no_id(c, {}, { intent: "no_id", slots: {}, tags: [] }); } },
    { id: "guide", when: (c) => !c.s.guideAsked && !c.s.guides, done: (c) => !!c.s.guideAsked,
      ask: (c) => { if (c.s.guideOffered) { c.s.guideAgain = !c.s.guideAgain; c.say(c.s.guideAgain ? "guide_again" : "guide_again2"); return; } c.s.guideOffered = true; c.s.guidePriceSaid = true; c.say("offer_guide", { price: GUIDE }); },
      expects: ["want_guide", "no_guide", "guide_price", "guide_n_ctx", "lang_q", "guide_no_ctx", "buy_tickets", "buy_qty"],
      suggest: [{ lt: "Take an audio guide", hint: "guide_yes" }, { lt: "Ask about the audio guide", hint: "guide" }, { lt: "Answer yes or no", hint: "g_yesno" }],
      yes: (c) => { c.s.guideAsked = true; c.s.guides = 1; if (!c.s.lang && c.s.langWanted) c.s.lang = c.s.langWanted; changed(c); },
      no: (c) => { H.no_guide(c, {}, { intent: "no_guide", slots: {}, tags: [] }); } },
    { id: "lang", when: (c) => !!c.s.guides && !c.s.lang, done: (c) => !!c.s.lang,
      ask: (c) => { if (c.s.langAsked) { c.s.langAsked = false; return; } c.say(c.s.langListed ? "ask_lang_short" : c.s.guides > 1 ? "ask_lang_pl" : "ask_lang"); },
      expects: ["lang_ctx", "lang_q", "langs_q", "lang_not_ctx", "guide_no_ctx"],
      suggest: [{ lt: "Choose the audio guide's language", hint: "lang", options: ["english", "spanish", "french", "german", "italian", "portuguese"] }],
      help: (c) => { c.s.langListed = true; c.say("langs_list"); },
      // "No, gracias" at "¿En qué idioma la quiere?": no audio guide after all (never the same question again)
      no: (c) => { H.no_guide(c, {}, { intent: "no_guide", slots: {}, tags: [] }); } },
    { id: "pay", when: (c) => !!c.s.tix && !!c.s.typesKnown, done: (c) => !!c.s.paid,
      ask: (c) => {
        if (c.s.sunday && !c.s.sundaySaid) { c.s.sundaySaid = true; c.twist("sunday"); c.say("sunday_note"); }
        // nothing to pay (a resident on a Sunday, only kids, or an extra called off): the tickets, then the next question
        if (due(c) <= 0) {
          if (!c.s.paidAmt && !c.s.resident && total(c) <= 0) c.say("kids_free");
          c.s.paid = true; c.s.paidAmt = Math.max(c.s.paidAmt || 0, total(c));
          handover(c); askNext(c); return;
        }
        // a re-ask: how to pay, then the total again (never the same line twice in a row)
        if (c.s.totalSaid) { c.s.payHow = !c.s.payHow; c.say(c.s.payHow ? "pay_how" : "say_total", { price: due(c) }); return; }
        c.s.totalSaid = true;
        c.say("say_total", { price: due(c) });
      },
      expects: ["pay_card", "pay_cash", "pay_phone", "here_you_go", "no_cash", "no_card_ctx", "ask_dollars", "im_resident", "im_visitor"],
      suggest: [{ lt: "Pay", hint: "pay" }, { lt: "Say if you live here", hint: "resident" }] },
    // "¿Tiene alguna pregunta?" — first the new exhibition (the goal), then anything else.
    { id: "exhibit", when: (c) => !!c.s.paid && !c.s.exhibitKnown, done: (c) => !!c.s.exhibitKnown,
      ask: (c) => { c.say(c.s.moreAsked ? "ask_more_else" : "ask_more"); c.s.moreAsked = true; },
      expects: ["ask_exhibit", "ask_included", "more_no", "have_question"],
      suggest: [
        { lt: "Ask where the new exhibition is", hint: "exhibit" },
        { lt: "Ask about the museum", hint: "questions" },
      ],
      yes: (c) => { c.say("g_yes_what"); c.hold(); },
      no: (c) => { c.s.moreDone = true; exhibitAnyway(c); } },
    { id: "more", when: (c) => !!c.s.paid && !!c.s.exhibitKnown, done: (c) => !!c.s.moreDone,
      ask: (c) => { c.say(c.s.moreAsked ? "ask_more_else" : "ask_more"); c.s.moreAsked = true; },
      expects: ["more_no", "ask_exhibit", "ask_included", "have_question"],
      suggest: [
        { lt: "Say you have no more questions", hint: "done" },
        { lt: "Ask about the museum", hint: "questions" },
      ],
      yes: (c) => { c.say("g_yes_what"); c.hold(); },
      no: (c) => { c.s.moreDone = true; } },
  ],

  init: (c) => {
    c.s.guides = 0;
    c.s.typesPref = c.chance(0.5) ? "all" : "any";
    c.s.mentionExhibit = c.chance(0.4);
    c.s.mentionBag = c.chance(0.4);
    c.s.harold = false;
    c.s.haroldTwist = c.visits >= 1 && c.chance(0.6);
    c.s.late = c.visits >= 2 && c.chance(0.35);
    c.s.sunday = c.visits >= 1 && c.chance(0.3);
  },

  start: (c) => {
    if (c.s.late) {
      c.say("greet_pm");
      c.say("late");
      c.twist("closing_soon");
      c.expect({ id: "late", optional: true, hints: ["tickets"], expects: ["enough_time", "come_back", "never_mind_ctx", ...TICKET_TALK, "want_guide"],
        suggest: [{ lt: "Buy a ticket", hint: "tickets", options: "ttype" }],
        yes: (cc) => { cc.say("ack"); cc.say("ask_qty"); cc.hold(); },
        no: (cc) => { cc.say("no_problem"); cc.say("ask_qty"); cc.hold(); },
        on: { never_mind_ctx: (cc) => { cc.say("ack"); cc.say("ask_qty"); cc.hold(); } } });
      return;
    }
    c.say("greet");
    c.hold(); // the greeting asks for tickets (the "tickets" step)
  },

  handlers: wrap(H),

  finish: (c) => {
    if (!c.s.exhibitKnown) { c.s.exhibitKnown = true; c.say("exhibit_mention"); }
    c.say("enjoy");
    // Don Arturo's "No se puede tocar" (a later visit) comes before the task is complete: the apology finishes it.
    if (c.s.haroldTwist) {
      c.s.harold = true;
      c.twist("dont_touch");
      c.speaker("harold");
      c.s.flash = !!c.s.askedPhotos && c.chance(0.5);
      c.say(c.s.flash ? "no_flash" : "dont_touch");
      const pend: Pending = { id: "harold", hints: ["sorry"], expects: ["apology", "g_sorry", "deny", "why_not"],
        suggest: [{ lt: "Apologize to the guard", hint: "sorry" }],
        on: {
          apology: (cc) => { haroldThanks(cc); },
          g_sorry: (cc) => { haroldThanks(cc); },
          // "¡Perdón!" alone is an apology here; "¿Qué?", "¿Mande?", "¿Cómo?" ask him to say it again
          g_repeat: (cc) => {
            if (/^[\s¡!¿?.,]*((ay|uy|oh|ah|ups)[\s,]+)?(perd[oó]n|perd[oó]ne(me)?|disc[uú]lpe(me)?|disculpa)[\s,]*(se[nñ]or|don arturo)?[\s¡!¿?.,]*$/i.test(cc.heard || "")) { haroldThanks(cc); return; }
            cc.say(cc.s.flash ? "no_flash" : "dont_touch");
            cc.expect(pend);
          },
          g_ok: (cc) => { haroldThanks(cc); },
          deny: (cc) => { haroldDeny(cc); },
          why_not: (cc) => { cc.say(cc.s.flash ? "harold_why_flash" : "harold_why"); cc.say("harold_ask"); cc.expect(pend); },
        },
        yes: (cc) => { haroldThanks(cc); }, no: (cc) => { haroldThanks(cc); },
        ask: (cc) => { cc.speaker("harold"); cc.say("harold_ask"); } };
      c.expect(pend);
      return;
    }
    c.complete();
    c.expect({ id: "closing", hints: ["g_social"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // every hint
    { say: "Un boleto de adulto, por favor", intent: "buy_tickets", slots: { tks: { tk: { tt: "adult" } } } },
    { say: "Dos boletos, por favor", intent: "buy_qty", slots: { n: 2 } },
    { say: "Dos adultos y un estudiante, por favor", intent: "buy_tickets" },
    { say: "Quisiera un boleto general", intent: "buy_tickets", slots: { tks: { tk: { tt: "adult" } } } },
    { say: "¿Me da un boleto de estudiante?", intent: "buy_tickets", slots: { tks: { tk: { tt: "student" } } } },
    { say: "Soy estudiante", intent: "im_student" },
    { say: "No, de estudiante", intent: "buy_tickets", step: "types", not: ["reject_type"] },
    { say: "No, de adulto mayor, por favor", intent: "buy_tickets", step: "types", not: ["reject_type"], slots: { tks: { tk: { tt: "senior" } } } },
    { say: "Sí, todos adultos", intent: "all_adults_ctx", step: "types" },
    { say: "No, uno de nosotros es estudiante", intent: "types_ans", step: "types" },
    { say: "Sí, uno de nosotros es estudiante", intent: "types_ans", step: "types" },
    { say: "No, solo adultos", intent: "all_adults_ctx", step: "types", not: ["buy_tickets"] },
    { say: "Todos somos adultos", intent: "all_adults_ctx", step: "types" },
    { say: "Un adulto mayor y un niño", intent: "buy_tickets" },
    { say: "Bueno, pago el precio completo", intent: "adult_ok" },
    { say: "Está bien, pago la entrada general", intent: "adult_ok" },
    { say: "Sí, me llevo una", intent: "guide_n_ctx", step: "guide" },
    { say: "Sí, una audioguía, por favor", intent: "want_guide" },
    { say: "¿Cuánto cuesta la entrada?", intent: "ask_prices" },
    { say: "¿Hay descuento para estudiantes?", intent: "ask_discount" },
    { say: "¿Los niños pagan?", intent: "kids_free" },
    { say: "¿Hay algún día gratis?", intent: "ask_free_day" },
    { say: "Aquí está mi credencial", intent: "have_id", step: "student_id" },
    { say: "Aquí tiene", intent: "here_you_go", step: "pay" },
    { say: "Perdón, no la traigo", intent: "no_id", step: "student_id", not: ["have_id"] },
    { say: "Quisiera una audioguía, por favor", intent: "want_guide" },
    { say: "¿Me puede dar una audioguía?", intent: "want_guide" },
    { say: "¿Tienen audioguía?", intent: "want_guide" },
    { say: "¿Cuánto cuesta la audioguía?", intent: "guide_price" },
    { say: "No, gracias. Solo el boleto", intent: "no_guide", not: ["want_guide"] },
    { say: "En inglés, por favor", intent: "lang_ctx", step: "lang", slots: { lang: "english" } },
    { say: "¿La tiene en portugués?", intent: "lang_q", slots: { lang: "portuguese" } },
    { say: "¿Qué idiomas tiene?", intent: "langs_q" },
    { say: "¿Dónde está la exposición nueva?", intent: "ask_exhibit" },
    { say: "¿Está incluida en el boleto?", intent: "ask_included" },
    { say: "¿Se pueden tomar fotos?", intent: "ask_photos" },
    { say: "¿Dónde dejo mi mochila?", intent: "ask_coat" },
    { say: "¿Dónde está la tienda?", intent: "ask_shop" },
    { say: "¿Dónde están los baños?", intent: "ask_restroom" },
    { say: "¿A qué hora cierran?", intent: "ask_hours" },
    { say: "¿Tiene un mapa del museo?", intent: "ask_map" },
    { say: "¿Puedo pagar con tarjeta?", intent: "pay_card", step: "pay" },
    { say: "Pago en efectivo", intent: "pay_cash", step: "pay" },
    { say: "Soy residente", intent: "im_resident" },
    { say: "Aquí está mi tarjeta de residente", intent: "im_resident" },
    { say: "Soy turista", intent: "im_visitor" },
    { say: "¡Ay, perdón!", intent: "apology" },
    { say: "Perdón, no sabía", intent: "apology" },
    { say: "Ya no lo toco", intent: "apology", not: ["deny"] },
    { say: "Eso es todo, gracias", intent: "more_no", step: "more" },
    { say: "No, todo claro, gracias", intent: "more_no", step: "more" },
    // natural alternatives, short answers, tú, no accents
    { say: "Dos", intent: "qty_ctx", step: "tickets", slots: { n: 2 } },
    { say: "Uno, por favor", intent: "qty_ctx", step: "tickets" },
    { say: "Somos tres", intent: "buy_qty", slots: { n: 3 } },
    { say: "Mi esposa y yo", intent: "buy_qty" },
    { say: "Quisiera visitar el museo", intent: "buy_qty" },
    { say: "Una entrada general", intent: "buy_tickets", step: "tickets", not: ["qty_ctx"] },
    { say: "Un boleto de estudiante", intent: "buy_tickets", step: "tickets", not: ["qty_ctx", "buy_qty"] },
    { say: "Dos boletos de adulto y uno de estudiante", intent: "buy_tickets" },
    { say: "Me das dos boletos", intent: "buy_qty" },
    { say: "Mi amiga es estudiante", intent: "types_ans", step: "types" },
    { say: "Mi hijo tiene ocho años", intent: "child_age", slots: { n: 8 } },
    { say: "Tengo setenta años", intent: "im_senior", slots: { n: 70 } },
    { say: "Soy jubilado", intent: "im_senior" },
    { say: "No, no todos son adultos", intent: "mixed_types_ctx", step: "types", not: ["all_adults_ctx"] },
    { say: "Se me olvidó", intent: "no_id", step: "student_id" },
    { say: "Mi credencial está vencida", intent: "no_id", step: "student_id", not: ["have_id"] },
    { say: "La tengo en el celular", intent: "have_id", step: "student_id" },
    { say: "Una para cada uno", intent: "guide_n_ctx", step: "guide" },
    { say: "Para los dos", intent: "guide_n_ctx", step: "guide" },
    { say: "No, estoy bien así", intent: "guide_no_ctx", step: "guide", not: ["more_no"] },
    { say: "No, es muy cara", intent: "guide_no_ctx", step: "guide", not: ["want_guide", "guide_n_ctx"] },
    { say: "Hablo alemán", intent: "lang_ctx", step: "lang", slots: { lang: "german" } },
    { say: "No en español, en inglés", intent: "lang_ctx", step: "lang", slots: { lang: "english" } },
    { say: "Con tarjeta", intent: "pay_card", step: "pay" },
    { say: "efectivo", intent: "pay_cash", step: "pay" },
    { say: "¿Aceptan dólares?", intent: "ask_dollars", step: "pay" },
    { say: "¿Puedo pagar con el celular?", intent: "pay_phone", step: "pay" },
    { say: "como llego a la exposicion", intent: "ask_exhibit", step: "exhibit" },
    { say: "¿Tengo que pagar aparte la exposición?", intent: "ask_included", step: "exhibit" },
    { say: "¿Hay paquetería?", intent: "ask_coat" },
    { say: "Sí, tengo una pregunta", intent: "have_question", step: "exhibit", not: ["more_no"] },
    { say: "No lo toqué", intent: "deny", not: ["apology"] },
    { say: "¿Por qué no se puede tocar?", intent: "why_not" },
    { say: "Disculpe, no lo vuelvo a hacer", intent: "apology", not: ["deny"] },
    { say: "¿Me alcanza el tiempo?", intent: "enough_time" },
    { say: "¿Puedo volver mañana con el mismo boleto?", intent: "come_back" },
    { say: "¿Es gratis los domingos?", intent: "ask_free_day" },
    { say: "Estoy de vacaciones", intent: "im_visitor" },
    { say: "¿Me puedes dar una audioguía?", intent: "want_guide" },
    // Spain forms are correct, with no dialect correction
    { say: "¿Tenéis descuento para estudiantes?", intent: "ask_discount" },
    { say: "Ponme dos entradas", intent: "buy_qty" },
    { say: "Vale, una", intent: "guide_n_ctx", step: "guide" },
    { say: "¿Puedo pagar con el móvil?", intent: "pay_phone", step: "pay" },
    { say: "¿Dónde está el aseo?", intent: "ask_restroom" },
    // meaning safety: no ticket, discount, guide, payment or language may be invented
    { say: "No soy estudiante", intent: "reject_type", not: ["im_student", "buy_tickets"] },
    { say: "No quiero boleto de estudiante", intent: "reject_type", not: ["buy_tickets", "im_student"] },
    { say: "No quiero audioguía", intent: "no_guide", not: ["want_guide"] },
    { say: "No necesito dos audioguías", intent: "no_guide", step: "guide", not: ["want_guide", "guide_n_ctx"] },
    { say: "No hablo francés", intent: "lang_not_ctx", step: "lang", not: ["lang_ctx"] },
    { say: "No quiero la de inglés", intent: "lang_not_ctx", step: "lang", not: ["lang_ctx"] },
    { say: "No tengo efectivo", intent: "no_cash", step: "pay", not: ["pay_cash", "no_id"] },
    { say: "No tengo tarjeta", intent: "no_card_ctx", step: "pay", not: ["pay_card"] },
    { say: "No soy residente", intent: "im_visitor", not: ["im_resident"] },
    { say: "No vivo aquí", intent: "im_visitor", not: ["im_resident"] },
    { say: "No todos son adultos", intent: "mixed_types_ctx", step: "types", not: ["all_adults_ctx"] },
    { say: "No tengo credencial", intent: "no_id", step: "student_id", not: ["have_id", "here_you_go"] },
    { say: "Perdón, no lo vuelvo a tocar", intent: "apology", not: ["deny"] },
    { say: "No tengo setenta años", intent: "none" },
    { say: "No quiero ver la exposición", intent: "none" },
    { say: "Tarjeta no, efectivo", intent: "pay_cash", step: "pay", not: ["pay_card"] },
    { say: "No con tarjeta, en efectivo", intent: "pay_cash", step: "pay", not: ["pay_card"] },
    { say: "Dos no, tres", intent: "qty_ctx", step: "tickets", slots: { n: 3 } },
    { say: "No quiero dos, solo una", intent: "guide_n_ctx", step: "guide", not: ["no_guide"] },
    { say: "Francés no, inglés", intent: "lang_ctx", step: "lang", slots: { lang: "english" } },
    { say: "Un adulto y una niña de cinco años", intent: "buy_tickets" },
    { say: "Mi esposo tiene setenta años", intent: "child_age", step: "types", slots: { n: 70 } },
    { say: "No soy turista, vivo aquí", intent: "im_resident", not: ["im_visitor"] },
    { say: "Mi hijo no es estudiante", intent: "reject_type", step: "types", not: ["types_ans", "buy_tickets"] },
    { say: "No toqué nada, solo miraba", intent: "deny", not: ["apology"] },
    { say: "Lo siento, fue sin querer", intent: "apology", not: ["deny"] },
    { say: "Solo tengo dólares", intent: "ask_dollars", step: "pay" },
    { say: "¿Me vendes un boleto?", intent: "buy_qty" },
    // the review's traps and fixes
    { say: "¿Dónde está la salida?", intent: "ask_exit", not: ["ask_exhibit"] },
    { say: "¿Dónde está la sala?", intent: "ask_start", not: ["ask_exhibit", "ask_exit"] },
    { say: "No importa", intent: "none" },
    { say: "No soy estudiante, un boleto general", intent: "buy_tickets", step: "tickets", not: ["im_student"], slots: { tks: { tk: { tt: "adult" } } } },
    { say: "Tengo credencial pero no la traigo", intent: "no_id", step: "student_id", not: ["have_id"] },
    { say: "No la traigo conmigo", intent: "no_id", step: "student_id", not: ["have_id", "here_you_go"] },
    { say: "No, gracias, no la necesito", intent: "guide_no_ctx", step: "guide", not: ["want_guide", "guide_n_ctx"] },
    { say: "No quiero audioguía, solo la entrada", intent: "no_guide", not: ["want_guide", "guide_price"] },
    { say: "No traigo efectivo", intent: "no_cash", step: "pay", not: ["pay_cash"] },
    { say: "No tengo efectivo, pago con tarjeta", intent: "pay_card", step: "pay", not: ["pay_cash"] },
    { say: "No, prefiero efectivo", intent: "pay_cash", step: "pay", not: ["pay_card"] },
    { say: "¿Aceptan efectivo?", intent: "pay_cash", step: "pay" },
    { say: "Yo no toqué nada", intent: "deny", not: ["apology"] },
    { say: "No necesito el mapa", intent: "none" },
    { say: "Mejor regreso mañana", intent: "come_back" },
    { say: "¿Se puede tocar?", intent: "ask_touch" },
    { say: "¿Es gratis hoy?", intent: "ask_free_day" },
    { say: "Uno para mí y uno para mi hijo de diez años", intent: "buy_tickets" },
    { say: "¿Está incluida la audioguía?", intent: "guide_price", not: ["ask_included"] },
    // the dialogue audit (5 Nov 2026)
    { say: "Quiero dos audioguías", intent: "want_guide", step: "tickets", slots: { n: 2 }, not: ["buy_qty", "qty_ctx"] },
    { say: "Dos audioguías en inglés, por favor", intent: "want_guide", step: "tickets", slots: { n: 2, lang: "english" }, not: ["qty_ctx"] },
    { say: "Sí, seguro", intent: "guide_n_ctx", step: "guide", not: ["guide_no_ctx", "no_guide"] },
    { say: "Sí, me animo", intent: "guide_n_ctx", step: "guide", not: ["no_guide"] },
    { say: "Pensándolo bien, quiero una audioguía", intent: "want_guide", step: "more" },
    { say: "Siempre sí quiero la audioguía", intent: "want_guide", step: "more" },
    { say: "Otra audioguía, por favor", intent: "want_guide", step: "more" },
    { say: "Me da otro boleto general", intent: "buy_tickets", step: "more", slots: { tt: "adult" } },
    { say: "Quiero otro de estudiante", intent: "buy_tickets", step: "more", slots: { tt: "student" } },
    { say: "Dos boletos más", intent: "buy_qty", step: "more", slots: { n: 2 } },
    { say: "No quiero otro boleto", intent: "none" },
    { say: "¿Tiene terminal?", intent: "pay_card", step: "pay" },
    { say: "¿Tiene cambio de quinientos?", intent: "pay_cash", step: "pay", not: ["pay_card", "here_you_go"] },
    { say: "Aquí tiene ochenta pesos", intent: "here_you_go", step: "pay", slots: { price: 8000 } },
    { say: "Somos residentes", intent: "im_resident", step: "pay", not: ["im_visitor"] },
    { say: "¿Dónde devuelvo la audioguía?", intent: "ask_return_guide", not: ["ask_coat"] },
    { say: "¿Dónde está la colección permanente?", intent: "ask_start", not: ["ask_exhibit"] },
    { say: "¿Hasta qué hora se puede entrar?", intent: "ask_hours" },
    { say: "¿Cuánto es en dólares?", intent: "ask_dollars" },
    { say: "¿Es accesible para silla de ruedas?", intent: "ask_elevator" },
    { say: "¿Cuánto le debo?", intent: "ask_prices", step: "pay" },
    { say: "No toqué la estela", intent: "deny", not: ["apology"] },
    { say: "¿Habla inglés?", intent: "ask_english", step: "tickets", not: ["lang_q"] },
    { say: "¿Tienen audioguías en español?", intent: "lang_q", step: "tickets", not: ["want_guide"] },
    { say: "Tenga, son ochenta", intent: "here_you_go", step: "pay", slots: { price: 8000 } },
    { say: "No me animo", intent: "guide_no_ctx", step: "guide", not: ["guide_n_ctx", "want_guide"] },
    // not understood
    { say: "Mi perro come boletos azules", intent: "none" },
    { say: "La pirámide baila salsa en la playa", intent: "none" },
    { say: "pintura plátano bicicleta martes", intent: "none" },
    { say: "Ayer compré una camisa verde", intent: "none" },
  ],

  sims: [
    { name: "one general ticket, audio guide in English, card, exhibition", turns: ["¡Hola! Un boleto general, por favor.", "Sí, por favor", "En inglés, por favor", "Con tarjeta", "¿Dónde está la nueva exposición?", "No, es todo. ¡Gracias!"],
      expect: { complete: true, state: { paid: true, guides: 1, lang: "english", exhibitKnown: true } }, auto: AUTO,
      setup: (s) => { s.sunday = false; s.late = false; } },
    { name: "two tickets, a student without ID, a language they don't have", turns: ["¡Hola! Dos boletos, por favor.", "Uno de nosotros es estudiante", "Perdón, no la traigo", "Está bien", "¿Tienen audioguía?", "¿La tiene en portugués?", "Entonces en inglés", "En efectivo", "¿Está incluida en el boleto?", "¡Gracias!"],
      expect: { complete: true, state: { tix: { adult: 2 }, lang: "english", paid: true } }, auto: AUTO,
      setup: (s) => { s.haroldTwist = false; s.sunday = false; s.late = false; } },
    // the guard (twist, pinned on): "¡Ay, perdón!" answers him
    { name: "questions first, a senior ticket, no audio guide, the backpack", turns: ["¿Cuánto cuesta la entrada?", "¿Hay descuento para personas mayores?", "¿Se pueden tomar fotos?", "Un boleto de adulto mayor, por favor", "No, gracias", "No, solo el boleto", "Aquí tiene", "¿Dónde dejo mi mochila?", "Nada más, gracias", "¡Ay, perdón!"],
      expect: { complete: true, state: { tix: { senior: 1 }, guides: 0, apologized: true } }, auto: AUTO,
      setup: (s) => { s.haroldTwist = true; s.sunday = false; s.late = false; } },
    // "Pago en efectivo" comes with the language, before the total: "Aquí tiene" then pays.
    { name: "two adults, the audio guide after all, cash, the guard denied", turns: ["Dos boletos, por favor.", "No, solo adultos.", "No, gracias.", "Bueno, me llevo una.", "En inglés, por favor. Pago en efectivo.", "Aquí tiene.", "¿Está incluida en el boleto?", "No, todo claro, gracias.", "¡Yo no toqué nada!"],
      expect: { complete: true, state: { tix: { adult: 2 }, guides: 1, method: "cash", denied: true } }, auto: AUTO,
      setup: (s) => { s.haroldTwist = true; s.sunday = false; s.late = false; } },
    { name: "a student with ID, kids, the language list, phone payment", turns: ["Soy estudiante", "Aquí está mi credencial", "¿Los niños pagan?", "Quisiera una audioguía, por favor", "¿Qué idiomas tiene?", "En francés, por favor", "¿Puedo pagar con el celular?", "¿A qué hora cierran?", "Es todo", "Perdón, no sabía."],
      expect: { complete: true, state: { tix: { student: 1 }, idShown: true, lang: "french", method: "phone", apologized: true } }, auto: AUTO,
      setup: (s) => { s.haroldTwist = true; s.sunday = false; s.late = false; } },
    { name: "Sunday (twist forced): a resident shows the card and pays nothing", turns: ["Buenos días. Un boleto general, por favor.", "No, gracias.", "No, gracias.", "Soy residente.", "Sí, aquí está mi tarjeta de residente.", "¿Dónde está la nueva exposición?", "Es todo, gracias."],
      expect: { complete: true, state: { resident: true, paid: true, guides: 0 } }, auto: AUTO,
      setup: (s) => { s.sunday = true; s.haroldTwist = false; s.late = false; s.mentionExhibit = false; } },
    { name: "Sunday (twist forced): a tourist asks if it's free and pays", turns: ["Dos adultos, por favor", "No, gracias", "No, gracias", "¿No es gratis los domingos?", "Soy turista", "Con tarjeta", "Es todo, gracias"],
      expect: { complete: true, state: { paid: true, resChecked: true, tix: { adult: 2 } } }, auto: AUTO,
      setup: (s) => { s.sunday = true; s.haroldTwist = false; s.late = false; } },
    { name: "closing in 45 minutes (twist forced), come back tomorrow?", turns: ["¿Me alcanza el tiempo?", "Está bien. Un boleto general, por favor.", "No, gracias.", "No, gracias.", "Con tarjeta", "¿Puedo volver mañana con el mismo boleto?", "¿Dónde está la exposición nueva?", "Eso es todo"],
      expect: { complete: true, state: { paid: true, exhibitKnown: true } }, auto: AUTO,
      setup: (s) => { s.late = true; s.sunday = false; s.haroldTwist = false; } },
    // review: "¿Es gratis?" on a Sunday is about admission; a cash question waits for the money
    { name: "Sunday (twist forced): '¿Es gratis?', a tourist pays cash, the exit", turns: ["Un boleto general, por favor", "No, gracias", "No, gracias", "¿Es gratis?", "Soy turista", "¿Puedo pagar en efectivo?", "Aquí tiene", "¿Dónde está la salida?", "¿Dónde está la exposición nueva?", "Es todo"],
      expect: { complete: true, state: { paid: true, method: "cash", resChecked: true, tix: { adult: 1 } } }, auto: AUTO,
      setup: (s) => { s.sunday = true; s.haroldTwist = false; s.late = false; s.mentionExhibit = false; } },
    // review: "No importa" at the closing warning is no order; "No tengo tarjeta" at paying is cash
    { name: "closing soon (twist forced): 'No importa', come back tomorrow?, no card", turns: ["No importa", "Mejor regreso mañana", "Bueno, un boleto general", "No, gracias", "No, gracias", "No tengo tarjeta", "Aquí tiene", "Es todo"],
      expect: { complete: true, state: { paid: true, method: "cash", tix: { adult: 1 } } }, auto: AUTO,
      setup: (s) => { s.late = true; s.sunday = false; s.haroldTwist = false; } },
    { name: "short answers", turns: ["Dos", "Sí", "Sí", "Inglés", "Tarjeta", "No"],
      expect: { complete: true, state: { tix: { adult: 2 }, guides: 1, lang: "english", paid: true } }, auto: AUTO,
      setup: (s) => { s.typesPref = "all"; s.mentionExhibit = false; s.haroldTwist = false; s.late = false; s.sunday = false; } },
    // rule 10: "No soy estudiante" at "¿Entrada general?" is asked again, never guessed
    { name: "'No soy estudiante' at the ticket-type question, then general", turns: ["Un boleto, por favor", "No soy estudiante", "General", "No, gracias", "No, gracias", "Con tarjeta", "¿Dónde está la exposición nueva?", "Es todo"],
      expect: { complete: true, state: { tix: { adult: 1 }, paid: true } }, auto: AUTO,
      setup: (s) => { s.haroldTwist = false; s.late = false; s.sunday = false; } },
    { name: "a change of mind: one ticket becomes a student one, a guide each", turns: ["Dos adultos, por favor", "Perdón, mejor un adulto y un estudiante", "Aquí está mi credencial", "Sí, una para cada uno", "En español, para practicar", "Con tarjeta", "¿De qué es la exposición nueva?", "¿Dónde está la exposición nueva?", "Es todo"],
      expect: { complete: true, state: { tix: { adult: 1, student: 1 }, guides: 2, lang: "spanish", paid: true } }, auto: AUTO,
      setup: (s) => { s.haroldTwist = false; s.late = false; s.sunday = false; s.mentionExhibit = false; } },
    // the dialogue audit (5 Nov 2026): the binding outcomes
    // "¿Tienen audioguía?" before the offer is a question (price only); at "¿Se anima?" a bare "Sí" takes it; exact cash
    { name: "'¿Tienen audioguía?' first, 'Sí' at '¿Se anima?', exact cash, where to return it", turns: ["¿Tienen audioguía?", "Un boleto general, por favor", "No, gracias", "Sí", "En inglés", "Aquí tiene ciento treinta pesos", "¿Dónde devuelvo la audioguía?", "¿Dónde está la exposición nueva?", "Es todo"],
      expect: { complete: true, state: { tix: { adult: 1 }, guides: 1, lang: "english", paid: true, paidAmt: 13000 } }, auto: AUTO,
      setup: (s) => { s.haroldTwist = false; s.late = false; s.sunday = false; } },
    // an audio guide after paying is charged alone ($50), never the ticket again
    { name: "an audio guide after paying is charged alone", turns: ["Un boleto general, por favor", "No, gracias", "No, gracias", "Con tarjeta", "Pensándolo bien, quiero una audioguía", "En inglés", "Con tarjeta", "¿Dónde está la exposición nueva?", "Es todo"],
      expect: { complete: true, state: { tix: { adult: 1 }, guides: 1, paid: true, paidAmt: 13000 } }, auto: AUTO,
      setup: (s) => { s.haroldTwist = false; s.late = false; s.sunday = false; } },
    // too little cash: the total again, then the rest
    { name: "too little cash, then enough", turns: ["Dos adultos, por favor", "No, gracias", "No, gracias", "Aquí tiene cien pesos", "Aquí tiene doscientos", "¿Dónde está la exposición nueva?", "Es todo"],
      expect: { complete: true, state: { tix: { adult: 2 }, paid: true, paidAmt: 16000 } }, auto: AUTO,
      setup: (s) => { s.haroldTwist = false; s.late = false; s.sunday = false; } },
    // five people with a guide each: $650, in the voiced totals (ten or more book ahead)
    { name: "a group of ten books ahead; five with a guide each pay $650", turns: ["Somos diez", "Somos cinco", "Sí", "Sí, una para cada uno", "En inglés", "Con tarjeta", "Es todo"],
      expect: { complete: true, state: { tix: { adult: 5 }, guides: 5, paid: true, paidAmt: 65000 } }, auto: AUTO,
      setup: (s) => { s.typesPref = "all"; s.haroldTwist = false; s.late = false; s.sunday = false; s.mentionExhibit = false; } },
    // Sunday: "Somos residentes" frees the whole order
    { name: "Sunday (twist forced): 'Somos residentes' frees both tickets", turns: ["Dos adultos, por favor", "No, gracias", "No, gracias", "Somos residentes", "Aquí tiene", "Es todo"],
      expect: { complete: true, state: { tix: { adult: 2 }, resident: true, resAll: true, paid: true } }, auto: AUTO,
      setup: (s) => { s.sunday = true; s.haroldTwist = false; s.late = false; } },
    // the guard: "¿Mande?" gets his warning again, then the apology
    { name: "the guard: '¿Mande?', then sorry", turns: ["Un boleto general, por favor", "No, gracias", "No, gracias", "Con tarjeta", "¿Dónde está la exposición nueva?", "Es todo", "¿Mande?", "Ay, perdón"],
      expect: { complete: true, state: { apologized: true } }, auto: AUTO,
      setup: (s) => { s.haroldTwist = true; s.late = false; s.sunday = false; } },
  ],
};

export default museum;
