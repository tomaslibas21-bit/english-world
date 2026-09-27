// Song 70 "Please Don't Touch" — at the museum.
// Maple Harbor Museum of Art: Ben at the ticket desk, Harold the guard (twist lines only).
// The learner buys tickets (adult / student with ID / senior / kids free), gets an audio guide and
// chooses its language ("Do you have it in Lithuanian?" → no, but Russian, Polish, English …), pays,
// and finds out where the new exhibition "The Colors of the Night" is (upstairs, on the right; included).
// Side questions: prices and discounts, photos (no flash), coat check, gift shop, café, restrooms,
// hours, floor plan, elevator, how long it takes, guided tour, where to start.
// Twists: Harold — "Please don't touch the paintings!" (or "No flash, please!") → apology (visits ≥ 1);
// Ben warns that the museum closes in forty-five minutes (visits ≥ 2).
// Facts match s62/s69: open ten to five, closed on Mondays; adult $18, students pay less.

import type { Ctx, EntityDef, Handler, Pending, SituationDef } from "../types";
import type { ConvCtx } from "../../convo/dialogue";
import { ent, t } from "../dsl";
import { GLOBAL_HANDLERS } from "../global";

// ---------------------------------------------------------------------------
// Tickets, languages

const TTYPES: EntityDef[] = [
  ent("adult", "adult", "suaugusysis/suaugusiojo/suaugusiajam/suaugusįjį/suaugusiuoju/suaugusiajame", "m",
    { pl: "adults", ltPl: "suaugusieji/suaugusiųjų/suaugusiesiems/suaugusiuosius/suaugusiaisiais/suaugusiuosiuose", chip: "suaugusiojo",
      forms: ["adults", "grown up", "grown ups", "grownup", "regular", "full price", "general admission", "normal"], attrs: { price: 1800 } }),
  ent("student", "student", "studentas/studento/studentui/studentą/studentu/studente", "m",
    { pl: "students", ltPl: "studentai/studentų/studentams/studentus/studentais/studentuose", chip: "studento", forms: ["students"], attrs: { price: 1000 } }),
  ent("senior", "senior", "senjoras/senjoro/senjorui/senjorą/senjoru/senjore", "m",
    { pl: "seniors", ltPl: "senjorai/senjorų/senjorams/senjorus/senjorais/senjoruose", chip: "senjoro", forms: ["seniors", "senior citizen", "senior citizens"], attrs: { price: 1500 } }),
  ent("child", "child", "vaikas/vaiko/vaikui/vaiką/vaiku/vaike", "m",
    { pl: "children", ltPl: "vaikai/vaikų/vaikams/vaikus/vaikais/vaikuose", chip: "vaiko", forms: ["children", "kid", "kids", "child's", "kids'"], attrs: { price: 0 } }),
];

const LANGS: EntityDef[] = [
  ent("english", "English", "anglų kalba/anglų kalbos/anglų kalbai/anglų kalbą/anglų kalba/anglų kalboje", "f", { chip: "anglų", forms: ["english language"] }),
  ent("spanish", "Spanish", "ispanų kalba/ispanų kalbos/ispanų kalbai/ispanų kalbą/ispanų kalba/ispanų kalboje", "f", { chip: "ispanų" }),
  ent("french", "French", "prancūzų kalba/prancūzų kalbos/prancūzų kalbai/prancūzų kalbą/prancūzų kalba/prancūzų kalboje", "f", { chip: "prancūzų" }),
  ent("german", "German", "vokiečių kalba/vokiečių kalbos/vokiečių kalbai/vokiečių kalbą/vokiečių kalba/vokiečių kalboje", "f", { chip: "vokiečių" }),
  ent("chinese", "Chinese", "kinų kalba/kinų kalbos/kinų kalbai/kinų kalbą/kinų kalba/kinų kalboje", "f", { chip: "kinų", forms: ["mandarin"] }),
  ent("russian", "Russian", "rusų kalba/rusų kalbos/rusų kalbai/rusų kalbą/rusų kalba/rusų kalboje", "f", { chip: "rusų" }),
  ent("polish", "Polish", "lenkų kalba/lenkų kalbos/lenkų kalbai/lenkų kalbą/lenkų kalba/lenkų kalboje", "f", { chip: "lenkų" }),
  ent("lithuanian", "Lithuanian", "lietuvių kalba/lietuvių kalbos/lietuvių kalbai/lietuvių kalbą/lietuvių kalba/lietuvių kalboje", "f", { chip: "lietuvių", attrs: { none: true } }),
  ent("italian", "Italian", "italų kalba/italų kalbos/italų kalbai/italų kalbą/italų kalba/italų kalboje", "f", { chip: "italų", attrs: { none: true } }),
  ent("japanese", "Japanese", "japonų kalba/japonų kalbos/japonų kalbai/japonų kalbą/japonų kalba/japonų kalboje", "f", { chip: "japonų", attrs: { none: true } }),
];

const PRICE: Record<string, number> = { adult: 1800, student: 1000, senior: 1500, child: 0 };
const GUIDE = 500;

type Tix = Record<string, number>;
const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const conv = (c: Ctx) => (c as ConvCtx).conv;
const count = (tix: Tix | undefined) => Object.values(tix || {}).reduce((a, b) => a + b, 0);
const total = (c: Ctx) => Object.entries(c.s.tix as Tix).reduce((a, [k, n]) => a + PRICE[k] * n, 0) + GUIDE * (c.s.guides || 0);

/** Read "two adults and a student" into { adult: 2, student: 1 }. */
function readTix(slots: any): Tix {
  const out: Tix = {};
  for (const tk of toArr(slots.tks?.tk)) {
    const tags: string[] = tk.__tags || [];
    const n = typeof tk.n === "number" ? tk.n : tags.includes("n1") ? 1 : 1;
    const tt = tk.tt ?? (tags.includes("kid") ? "child" : undefined);
    if (!tt || n < 1 || n > 9) continue;
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
  tickets: "One adult ticket, please", types: "All adults, please", student_id: "Here you go", guide: "Yes, please", persuade: "Okay, yes, please",
  lang: "English, please", pay: "Card, please", exhibit: "Where's the new exhibition?", more: "No, that's all, thanks", harold: "Oh, I'm so sorry!", late: "Okay",
  id_price: "Okay, that's fine",
};

// ---------------------------------------------------------------------------

function setTix(c: Ctx, tix: Tix, add = false) {
  const cur: Tix = add ? { ...(c.s.tix || {}) } : {};
  for (const [k, n] of Object.entries(tix)) cur[k] = (cur[k] || 0) + n;
  c.s.tix = cur;
  c.s.qty = count(cur);
  if (c.s.paid) { c.s.paid = false; c.s.totalSaid = false; } // a change after paying: pay the difference (rare)
}

function handover(c: Ctx) {
  c.say(count(c.s.tix) > 1 ? "tickets_here" : "ticket_here");
  c.event("give", { item: "museum-ticket", count: count(c.s.tix) });
  if (c.s.guides) {
    c.say("guide_here", { X: c.s.lang || "english" });
    c.event("give", { item: "audio-guide", lang: c.s.lang || "english" });
  }
  if (c.s.mentionExhibit && !c.s.exhibitKnown) { c.s.exhibitKnown = true; c.say("exhibit_mention"); }
}

function markPaid(c: Ctx, method: string) {
  c.s.paid = true;
  c.event("pay", { method, amount: total(c) });
  if (method === "cash") c.say("change_back");
  else c.say("paid");
  handover(c);
}

/** "Adult?" / "Are they all adults?" / "Any students, seniors, or kids?": a yes means opposite things,
 *  so the question asked is remembered and the model answers belong to it. */
function askTypes(c: Ctx, again = false) {
  const q: string = again ? "mix" : c.s.qty > 1 ? (c.chance(0.5) ? "all" : "any") : "one";
  c.s.typesQ = q;
  c.say(q === "mix" ? "ask_types_again" : q === "one" ? "ask_type_one" : q === "all" ? "ask_type_all" : "ask_type_any");
  const adults = (cc: Ctx) => { cc.s.tix = { adult: cc.s.qty || 1 }; cc.s.typesKnown = true; cc.say("ack"); };
  const tellMe = (cc: Ctx) => { askTypes(cc, true); };
  c.expect({ id: "types", optional: true, expects: ["types_ans"],
    suggest: [{ lt: q === "one" ? "Pasakyti, kokio bilieto reikia" : "Pasakyti, kokių bilietų reikia", hint: `types_${q}`, options: q === "mix" ? "ttype" : undefined }, { lt: "Paklausti kainos ir nuolaidų", hint: "prices" }],
    yes: q === "any" ? tellMe : q === "mix" ? undefined : adults,
    no: q === "any" ? adults : q === "mix" ? undefined : tellMe,
    on: { all_adults_ctx: (cc) => { adults(cc); } } });
}

/** Ben makes sure the learner knows where the new exhibition is. */
function exhibitAnyway(c: Ctx) {
  if (c.s.exhibitKnown) return;
  c.s.exhibitKnown = true;
  c.say("exhibit_mention");
}

const H: Record<string, Handler> = {
  // --- tickets ---------------------------------------------------------------
  buy_tickets(c, slots, seg) {
    const tix = readTix(slots);
    if (!count(tix)) { c.say("ask_qty"); c.hold(); return; }
    // "Two tickets, one is a student": the rest are adults
    if (typeof slots.n === "number" && slots.n > count(tix) && slots.n <= 9) tix.adult = (tix.adult || 0) + slots.n - count(tix);
    // answering "Any students, seniors, or kids?" ("Yes, one student"): the rest are adults
    if (c.step === "types" && !c.s.typesKnown && !seg.tags.includes("add")) { H.types_ans(c, slots, seg); return; }
    setTix(c, tix, seg.tags.includes("add") || c.step === "more");
    c.s.typesKnown = true;
    if (tix.student) c.s.idChecked = false;
    // "One adult ticket with an audio guide"
    if (seg.tags.includes("guide") && !c.s.guides) { c.s.guides = 1; c.s.guideAsked = true; }
    if (c.chance(0.6)) c.say("ack");
  },
  buy_qty(c, slots, seg) {
    if (seg.tags.includes("family") && typeof slots.n !== "number") { c.say("ask_qty"); c.hold(); return; }
    const n = typeof slots.n === "number" ? slots.n : seg.tags.includes("n2") ? 2 : seg.tags.includes("n1") ? 1 : 0;
    if (n < 1 || n > 9) { c.say("ask_qty"); c.hold(); return; }
    c.s.qty = n;
    c.s.tix = { adult: n };
    c.s.typesKnown = false;
  },
  types_ans(c, slots) {
    // "One of them is a student" / "One adult and one student" / "My friend is a student"
    const said = readTix(slots);
    if (!count(said)) return;
    // keep a type already given in this answer ("I'm a student and my wife is an adult")
    const known: Tix = {};
    if (c.s.typesKnown) for (const [k, n] of Object.entries(c.s.tix as Tix || {})) if (k !== "adult") known[k] = n;
    const tix: Tix = { ...known };
    for (const [k, n] of Object.entries(said)) tix[k] = (tix[k] || 0) + n;
    if (count(tix) >= (c.s.qty || 0)) { setTix(c, tix); c.s.typesKnown = true; c.say("ack"); return; }
    // fill the rest with adults
    const rest = Math.max(0, (c.s.qty || count(tix)) - count(tix));
    setTix(c, { ...tix, adult: (tix.adult || 0) + rest });
    c.s.typesKnown = true;
    c.say("ack");
  },
  // "Okay, I'll pay the full price" (no student ID)
  adult_ok(c) {
    if (!c.s.tix || !count(c.s.tix)) { c.s.tix = { adult: 1 }; c.s.qty = 1; c.s.typesKnown = true; }
    c.say("ack");
  },
  change_tickets(c, slots, seg) {
    const tix = readTix(slots);
    if (!count(tix)) return;
    setTix(c, tix, seg.tags.includes("add"));
    c.s.typesKnown = true;
    c.say("changed");
  },
  reject_type(c, slots) {
    // "Not a student" / "No student ticket": that ticket becomes an adult one
    const tt = slots.tt as string;
    const tix: Tix = { ...(c.s.tix || {}) };
    if (tt && tix[tt] && tt !== "adult") { tix.adult = (tix.adult || 0) + tix[tt]; delete tix[tt]; c.s.tix = tix; }
    c.say("no_problem");
  },
  im_senior(c, slots) {
    // "I'm sixty-seven" (a younger age is just information: tell the prices)
    if (typeof slots.n === "number" && slots.n < 65) { c.say("prices"); return; }
    c.say("discount_senior");
    if (!c.s.tix || !count(c.s.tix)) { c.s.tix = { senior: 1 }; c.s.qty = 1; c.s.typesKnown = true; }
    else if (!c.s.tix.senior) { const tix = { ...c.s.tix }; if (tix.adult) { tix.adult--; if (!tix.adult) delete tix.adult; } tix.senior = 1; c.s.tix = tix; c.s.typesKnown = true; }
  },
  child_age(c, slots) {
    const n = slots.n as number;
    if (typeof n !== "number") return;
    const tix: Tix = { ...(c.s.tix || {}) };
    if (n < 12) { c.say("kids_free"); if (!tix.child) { tix.child = 1; if (tix.adult && count(tix) > (c.s.qty || 0)) tix.adult--; } }
    else { c.say("child_adult"); if (tix.child) { tix.adult = (tix.adult || 0) + tix.child; delete tix.child; } }
    for (const k of Object.keys(tix)) if (!tix[k]) delete tix[k];
    c.s.tix = tix; c.s.typesKnown = true;
  },
  im_student(c) {
    c.say("discount_student");
    if (!c.s.tix || !count(c.s.tix)) { c.s.tix = { student: 1 }; c.s.qty = 1; c.s.typesKnown = true; }
    else if (!c.s.tix.student) { const tix = { ...c.s.tix }; if (tix.adult) { tix.adult--; if (!tix.adult) delete tix.adult; } tix.student = 1; c.s.tix = tix; c.s.typesKnown = true; }
  },
  // --- prices ---------------------------------------------------------------
  ask_prices(c, slots) {
    if (slots.tt === "child") { c.say("kids_free"); return; }
    if (slots.tt === "student") { c.say("discount_student"); return; }
    if (slots.tt === "senior") { c.say("discount_senior"); return; }
    if (c.s.tix && count(c.s.tix) && c.s.typesKnown && c.step !== "tickets") {
      c.say("say_total", { price: total(c) });
      if (c.step === "pay") { c.s.totalSaid = true; c.hold(); } // don't let the pay step say it again
      return;
    }
    c.say("prices");
  },
  ask_discount(c, _slots, seg) {
    if (seg.tags.includes("senior")) c.say("discount_senior");
    else if (seg.tags.includes("student")) c.say("discount_student");
    else { c.say("discount_student"); c.say("discount_senior_short"); }
  },
  kids_free(c) { c.say("kids_free"); },
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
    c.say("id_missing");
    c.expect({ id: "id_price", optional: true, suggest: [{ lt: "Sutikti mokėti suaugusiojo kainą", hint: "okay" }, { lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
      yes: (cc) => { cc.say("ack"); }, no: (cc) => { cc.say("id_sorry"); } });
  },
  // --- audio guide ------------------------------------------------------------
  want_guide(c, slots) {
    c.s.guideAsked = true;
    const n = typeof slots.n === "number" && slots.n > 0 && slots.n < 10 ? slots.n : 1;
    c.s.guides = n;
    if (slots.lang) langChosen(c, slots.lang);
    if (c.s.paid) { c.s.paid = false; c.s.totalSaid = false; }
  },
  no_guide(c) {
    c.s.guideAsked = true;
    if (c.s.persuaded) { c.s.guides = 0; c.s.guideNo = true; c.say("no_problem"); return; }
    c.s.persuaded = true;
    c.say("guide_persuade");
    c.expect({ id: "persuade", optional: true, expects: ["want_guide", "no_guide", "guide_n_ctx", "guide_no_ctx"],
      suggest: [{ lt: "Sutikti paimti audiogidą", hint: "guide_yes" }, { lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
      yes: (cc) => { cc.s.guides = 1; cc.say("ack"); }, no: (cc) => { cc.s.guides = 0; cc.s.guideNo = true; cc.say("no_problem"); },
      on: {
        no_guide: (cc) => { cc.s.guides = 0; cc.s.guideNo = true; cc.say("no_problem"); },
        want_guide: (cc, sl, sg) => { H.want_guide(cc, sl, sg); cc.say("ack"); },
      } });
  },
  guide_price(c) { c.say("guide_price"); },
  guide_n_ctx(c, slots, seg) {
    // "For both of us" = 2, "One for each of us" = one per ticket
    const n = seg.tags.includes("both") ? 2 : seg.tags.includes("each") ? Math.max(1, Math.min(9, c.s.qty || count(c.s.tix) || 1)) : slots.n;
    H.want_guide(c, { ...slots, n }, { intent: "want_guide", slots, tags: [] });
  },
  guide_no_ctx(c, slots, seg) { H.no_guide(c, slots, seg); },
  have_question(c) { c.say("g_yes_what"); c.hold(); },
  lang_ctx(c, slots) { langChosen(c, slots.lang); },
  lang_q(c, slots) {
    if (!slots.lang) { c.say("langs_list"); return; }
    const e = LANGS.find((x) => x.id === slots.lang);
    if (e?.attrs?.none) { c.say(slots.lang === "lithuanian" ? "no_lithuanian" : "no_lang"); c.say("langs_list_short"); c.s.langAsked = true; return; }
    c.say("have_lang");
    if (c.s.guides) langChosen(c, slots.lang, true);
  },
  langs_q(c) { c.say("langs_list"); },
  lang_not_ctx(c) { c.say("langs_list"); },
  mixed_types_ctx(c) { askTypes(c, true); },
  // --- paying ----------------------------------------------------------------
  pay_card(c) {
    if (c.s.paid) { c.say("already_paid"); return; }
    if (!c.s.totalSaid) { c.say("card_later"); c.s.method = "card"; return; }
    c.say("card_tap"); markPaid(c, "card");
  },
  no_cash(c, slots, seg) { H.pay_card(c, slots, seg); },
  pay_cash(c) {
    if (c.s.paid) { c.say("already_paid"); return; }
    c.s.method = "cash";
    if (!c.s.totalSaid) { c.say("cash_ok"); return; }
    markPaid(c, "cash");
  },
  pay_phone(c) {
    if (c.s.paid) { c.say("already_paid"); return; }
    c.s.method = "phone";
    if (!c.s.totalSaid) { c.say("phone_ok"); return; }
    c.say("phone_ok"); markPaid(c, "phone");
  },
  here_you_go(c) {
    if (c.step === "student_id" || (c.s.tix?.student && !c.s.idChecked && !c.s.totalSaid)) { H.have_id(c, {}, { intent: "have_id", slots: {}, tags: [] }); return; }
    if (c.s.paid) { c.say("already_paid"); return; }
    if (!c.s.totalSaid) { c.say("no_problem"); return; }
    markPaid(c, c.s.method || "cash");
  },
  // --- the new exhibition ------------------------------------------------------
  ask_exhibit(c) { c.s.exhibitKnown = true; c.say("exhibit_where"); },
  ask_included(c) {
    c.say("exhibit_included");
    if (!c.s.exhibitKnown) { c.s.exhibitKnown = true; c.say("exhibit_upstairs"); }
  },
  ask_exhibit_about(c) { c.say("exhibit_about"); },
  // --- information ---------------------------------------------------------------
  ask_photos(c) { c.s.askedPhotos = true; c.say("photos"); },
  ask_coat(c, _slots, seg) { c.say(seg.tags.includes("bag") ? "bag_check" : "coat_check"); },
  ask_shop(c) { c.say("shop_cafe"); },
  ask_cafe(c) { c.say("shop_cafe"); },
  ask_restroom(c) { c.say("restroom"); },
  ask_hours(c, _slots, seg) { c.say(seg.tags.includes("today") && !c.s.late ? "close_today" : c.s.late ? "close_late" : "hours"); },
  ask_map(c) { c.say("floor_plan"); c.event("give", { item: "floor-plan" }); },
  ask_elevator(c) { c.say("elevator"); },
  ask_duration(c) { c.say(c.s.late ? "enough_time" : "duration"); },
  ask_tour(c) { c.say("tour"); },
  ask_start(c) { c.say("start"); },
  enough_time(c) { c.say("enough_time"); },
  come_back(c) { c.say("come_back"); },
  more_no(c) { if (c.s.paid) exhibitAnyway(c); c.s.moreDone = true; },
  // only parsed while Ben asks about the ticket types (the pending question answers it first)
  all_adults_ctx(c) { c.s.tix = { adult: c.s.qty || 1 }; c.s.typesKnown = true; c.say("ack"); },
  // --- Harold (twist) -----------------------------------------------------------
  apology(c) { if (c.s.harold) { haroldThanks(c); } else c.say("no_problem"); },
  deny(c) { if (c.s.harold) haroldDeny(c); },
  why_not(c) { if (c.s.harold) { c.say(c.s.flash ? "harold_why_flash" : "harold_why"); } else c.say("no_problem"); },
  // "Great, thank you!" is thanks, not an answer to "How are you?"
  g_howareyou_answer(c, slots) {
    const h = (c.heard || "").toLowerCase();
    if (/\bthank/.test(h) && !/\b(how are you|and you|about you|yourself)\b/.test(h)) { H.g_thanks(c, slots, { intent: "g_thanks", slots, tags: [] }); return; }
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
  if (e.attrs?.none) { c.say(lang === "lithuanian" ? "no_lithuanian" : "no_lang"); c.say("langs_list_short"); c.s.langAsked = true; return; }
  c.s.lang = lang;
  if (!quiet) c.say("ack");
}

/** Harold's twist is part of the task: it is complete once the learner apologizes (or says they didn't touch anything). */
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

// ---------------------------------------------------------------------------

export const museum: SituationDef = {
  id: "s70-museum",
  song: 70,
  songTitle: "Please Don't Touch",
  title: { en: "Please Don't Touch", lt: "Prašome neliesti" },
  topic: { en: "At the museum", lt: "Muziejuje" },
  chapter: 2,
  order: 4,
  location: "museum",
  npc: "ben",
  npcs: ["harold"],
  goal: "Nusipirk bilietą, pasiimk audiogidą ir sužinok, kur nauja paroda.",
  intro: "Maple Harboro meno muziejus: aukštos lubos, marmurinės grindys ir tyla. Prie bilietų kasos – Benas. Salėse budi prižiūrėtojas Haroldas.",
  entities: { ttype: TTYPES, lang: LANGS },

  grammar: {
    macros: {
      order_prefix: [
        "i would like #h:tk_id_like", "i would like to (get | buy) #h:tk_id_like", "can i (get | have) #h:tk_can", "could i (get | have) #h:tk_can", "may i have",
        "i will (have | take) ", "let me get", "i need", "i want #blunt", "give me #blunt", "we would like", "we will have", "can we (get | have)", "could we (get | have)",
        "(can | could) (i | we) buy", "(i | we) (want | need) to buy", "i am going to (get | buy | take | have)", "i will (get | buy | do)", "let us (do | get | have)",
        "we need", "we want #blunt", "i would like to have",
      ],
      cnt: "({n:number} | a #n1 | an #n1 | one #n1 | just one #n1)",
      tkw: "(ticket | tickets | pass | passes | admission | admissions | admission ticket | admission tickets | entry | entries | entry ticket | entry tickets | entrance ticket | entrance tickets)",
      guide_w: "(audio guide | audio guides | audioguide | audio tour | audio guide device | headset | headphones)",
      here_: "(here | in here | inside | in the museum)",
      exh: "(exhibition | exhibit | show | expo | exposition | exhibition hall)",
      // the new exhibition, by any name ("the Colors of the Night", "the night exhibition")
      exh_any: "([the] (new | special | night) @exh | [the] (colors | colours) of the night [@exh] | the @exh)",
      today_: "(for today | today | for now | now | for this afternoon | for this morning)",
      // "A … would be great": restating the answer as a wish
      nice_: "(would be (great | nice | good | perfect | fine | lovely | wonderful) | sounds (good | great | nice | perfect) | is (fine | good | great | perfect | okay))",
      // "Me and my wife", "the two of us": two people
      two_of_us: "([for] me and my (wife | husband | friend | son | daughter | partner | girlfriend | boyfriend | mother | father | mom | dad | sister | brother | colleague) | [for] my (wife | husband | friend | partner) and (me | i) | [for] (the two of us | both of us | us two))",
      rel: "(friend | wife | husband | son | daughter | partner | mother | father | mom | dad | sister | brother | girlfriend | boyfriend | colleague | grandson | granddaughter | grandmother | grandfather | kid | child)",
    },
    slots: {
      tk: { pattern: ["[@cnt] {tt:ttype} [@tkw]", "[@cnt] @tkw for (a | an | one) {tt:ttype}", "[@cnt] {tt:ttype} [@tkw] for (me | my (son | daughter | wife | husband | friend))",
        "[@cnt] @tkw for my (son | daughter | kid | little one | grandson | granddaughter) #kid",
        // "two tickets for adults", "one child under twelve"
        "[@cnt] @tkw for {tt:ttype}", "[@cnt] {tt:ttype} [@tkw] (under | below | over) {age:number} [years old]",
        "(one | a) [@tkw] for my (son | daughter | kid | little one | grandson | granddaughter) #kid"] },
      tks: { pattern: "{tk} [[and | plus | and a | and an | and also] {tk}] [[and | plus] {tk}]" },
    },
  },

  intents: {
    // tickets
    buy_tickets: { patterns: [
      "@order_prefix {tks} [please] [with @guide_w #guide]", "[just] {tks} [please] [with @guide_w #guide]", "(one | a) ticket for {tks}",
      "({n:number} | a) @tkw [please] {tks} [please] [if i may]",
      "@order_prefix (one | a) more {tt:ttype} [ticket] #add", "(can | could) (i | we) add {tks} #add", "{tks} @nice_",
    ] },
    buy_qty: { patterns: [
      "@order_prefix [{n:number} | a #n1 | one #n1 | just one #n1] @tkw [please]", "[{n:number} | one #n1 | a #n1] (ticket | tickets) [please] #h:tk_two", "({n:number} | one #n1 | a #n1 | an #n1) @tkw",
      "[@order_prefix] ({n:number} | one #n1 | a #n1) @tkw @today_",
      "(tickets | a ticket) for ({n:number} | one #n1) [people | persons | of us]", "(just | only) (me | one) #n1", "for ({n:number} | one #n1) [people | persons]", "({n:number}) of us",
      "[just | only] ({n:number} | one #n1) [please]",
      // "Three people", "We are three", "There are four of us", "Me and my wife"
      "{n:number} (people | persons | visitors)", "(we are | there are) {n:number} [people | persons | of us]", "(we are | it is) a (group | family) of {n:number}",
      "[@order_prefix] [{n:number}] [@tkw] @two_of_us #n2", "[@order_prefix] [{n:number}] [@tkw] for (my family | the family) #family",
      "(just | only) myself #n1", "(entrance | entry | admission) for ({n:number} | one #n1) [people | persons]",
      // "I'd like to visit the museum": Ben asks how many
      "(i | we) (would like | want) to (visit | see) the (museum | collection | galleries)", "(i | we) (would like | want) to go in"
    ] },
    all_adults_ctx: { patterns: ["[yes | no] [(they | we) are] (all | just | only) adults [please]", "[no] (all | only) adults [please]",
      "[yes | no] [(they | we) are] both adults [please]", "[yes] both [of us | of them] are adults", "[yes | no] [(they | we) are] (all | just | only | both) (grown ups | grownups)",
      "[no] no (students | kids | children | seniors) [(or | and | no) (students | kids | children | seniors)] [(just | only) adults]", "[yes] (everyone | everybody) is an adult",
      "[no] (just | only) (regular | normal) (tickets | adults)", "[yes | no] (they | we) are [both] adults", "[yes] all of (us | them) are adults", "[yes] (we are | they are) all (grown ups | adults)"] },
    // "They're not all adults": Ben asks which tickets
    mixed_types_ctx: { patterns: ["[no] (they | we) are not (all | only | just)? adults", "[no] not (all | only | just)? adults", "[no] (one | some) of (us | them) (is | are) not (an adult | adults)", "[yes] (it is | we are) a mix"] },
    types_ans: { patterns: ["(one | {n:number}) of (us | them) (is | are) {tks}", "[and] (one | {n:number}) (is | are) {tks}",
      // "My friend is a student", "She is a senior"
      "[and] my @rel (is | is also) {tks}", "[and] (he | she) is {tks}", "{tks} [and] the (others | rest) are (adults | grown ups)"] },
    change_tickets: { patterns: ["[actually] (make it | make that | change it to | i meant | sorry i meant) {tks} [please]", "[actually] can i change (it | that) to {tks}", "[actually] (can | could) i add {tks} #add"] },
    reject_type: { patterns: ["[i am] not a {tt:ttype}", "no {tt:ttype} [ticket | tickets]", "i do not need (a | the) {tt:ttype} [ticket]", "i am not a {tt:ttype} [anymore]"] },
    im_senior: { patterns: ["(i am | we are) (a senior | seniors | a senior citizen | over sixty five)", "i am sixty five [or over]",
      "(i am | we are) (a pensioner | pensioners) #tip:us_senior", "(i am | we are) retired", "i am {n:number} [years old]"] },
    child_age: { patterns: ["(he | she) is ({n:number}) [years old]", "my (son | daughter) is {n:number} [years old]", "(he | she) is only {n:number}",
      "(one | two) of (them | us) is {n:number} years old", "(my | the) (kid | child | boy | girl | grandson | granddaughter) is {n:number} [years old]"] },
    im_student: { patterns: ["(i am | we are) (a student | students) #h:tk_student", "i am a student [is there a discount]", "i have a student (id | card)"] },
    // prices
    ask_prices: { patterns: [
      "how much (is | are) (a ticket | the tickets | a ticket for an adult | admission | tickets | it) #h:tk_price", "how much does (a ticket | it | admission) cost",
      "how much for (a | an | one) {tt:ttype} [ticket]", "how much is (a | an | one) {tt:ttype} ticket", "what are the (prices | ticket prices)", "what does it cost", "how much is it [for {tt:ttype}]",
      "how much is (the entrance | entrance | the entry | entry | the entrance fee | the entry fee | the admission fee | the ticket)", "what is the (entrance | entry | admission) (fee | price)",
      "how much (is it | does it cost) to (get in | go in | enter | visit | come in)", "how much (do | does) (the tickets | tickets | a ticket) cost", "what is the price [of a ticket | for a ticket | of the tickets]",
      "how much (for | is it for | would it be for | are) {tks}", "is it expensive", "(is | are) (the tickets | a ticket | it) (expensive | cheap)",
      // learner word order: "How much cost ticket?", "Ticket is how much?"
      "how much (cost | costs) [a | the | one] (ticket | tickets | entrance | entry | admission | {tt:ttype} ticket)", "[a | the] (ticket | tickets | entrance) (is | are | costs) how much",
    ] },
    ask_discount: { patterns: [
      "(is there | do you have | do you offer) a (student #student | senior #senior) discount #h:tk_discount", "(is there | do you have | are there) any discounts",
      "do (students #student | seniors #senior) get a discount", "is it cheaper for (students #student | seniors #senior)", "is there a discount for (students #student | seniors #senior | pensioners #senior #tip:us_senior)",
      "(do you have | are there | is there) [any] (discount | discounts) for (students #student | seniors #senior | pensioners #senior #tip:us_senior)",
      "do (students #student | seniors #senior | pensioners #senior #tip:us_senior) pay less", "(is there | do you have) a (reduced | cheaper) (price | ticket) [for (students #student | seniors #senior)]",
    ] },
    kids_free: { patterns: ["(are | is) (kids | children | the kids | the children) free #h:tk_kids", "do (kids | children) (pay | need a ticket)", "is it free for (kids | children)",
      "do (kids | children) have to pay", "do (i | we) (have to | need to) pay for (my | our | the) (kids | children | son | daughter | kid)"] },
    // student ID
    have_id: { patterns: ["here is my [student] (id | card | student card) #h:id_here", "(yes | sure) here (it is | you go)", "here (it is | they are)", "i have (it | my id | my student id | my student card) [here]", "(yes | sure) i have it",
      "this is my [student] (id | card | student card | student id | university card)", "here is my (university card | student pass | isic card)", "[yes] my student (id | card)",
      "(i have it | it is) on my phone", "i have (a | an | my) [international | university | digital | electronic] student (id | card)",
      "(is | will) (a | my) (university | school | college) (id | card) (okay | ok | fine | work)", "i have (a | my) (university | college) (id | card)",
      "(here is | this is) my [student | university | school | college | international] (id | card | id card | student card | student id | pass)"] },
    no_id: { patterns: ["i do not have (it | my id | my student id | my student card | an id | a student id) [with me | here] [today] #h:id_none", "i left (it | my id | my student card) at (the hotel | home)", "i forgot my [student] (id | card)", "i do not have one",
      "i forgot (it | my [student] (id | card)) [at (home | the hotel)]", "i lost (it | my [student] (id | card))", "i did not bring (it | my [student] (id | card) | one)",
      "(it is | my [student] (id | card) is) (at | in) (the hotel | home | my hotel | the car | my car | my room | my other bag)",
      "i left (it | my [student] (id | card)) (in the car | in my car | in my room | in my other bag)", "i (not | no) have [a | my | the] [student] (id | card | student card) [with me | here] [today]",
      "my [student] (id | card) (is expired | has expired | expired | is not valid)", "(it is | it has) expired"] },
    // "Okay, I'll pay the full price" (after "without an ID, I have to charge the adult price")
    adult_ok: { patterns: ["[okay | then] i will pay the (full | adult | normal | regular) price [then]", "[okay | (that is | it is) (okay | fine)] (the)? (full | adult | normal) price is (fine | okay | ok)",
      "[okay] i will take (an | the) adult ticket [then]", "[okay] (an | the) adult ticket is (fine | okay | ok)", "[okay] adult (price | ticket) then",
      "[okay | fine | no problem] [the] adult (price | ticket) [then | is fine]", "[okay] i will pay for (an | the) adult ticket [then]"] },
    // audio guide
    want_guide: { patterns: [
      "(can | could) (i | we) (get | have | rent) (an | {n:number}) @guide_w [in {lang}] #h:g_can", "i would like (an | {n:number}) @guide_w [in {lang}] [please] #h:g_id_like",
      "(is there | do you have) an @guide_w #h:g_is_there", "[and] (an | one | {n:number}) @guide_w [too | as well] [in {lang}] [please]", "with (an | {n:number}) @guide_w [in {lang}]",
      "i will take (an | the | {n:number}) @guide_w", "(yes | sure) (an | the | {n:number}) @guide_w [please]", "i would like (one | {n:number}) [in {lang}] [please] #h:g_id_like",
      // "Yes, in English, please", "One in German"
      "(yes | yeah | sure | okay) [please] [one] in {lang}", "(one | an audio guide) in {lang}", "i will take one in {lang}", "(an | one) @guide_w @nice_",
    ] },
    no_guide: { patterns: ["no @guide_w [thanks | for me]", "i do not (need | want) (an | the) @guide_w", "(i | we) do not (need | want) (any | {n:number} | two | three) @guide_w", "without (an | the) @guide_w", "just the (ticket | tickets) [please] #h:g_no", "[no] i am fine without (it | one)",
      "[no] i will (use | just use) my (phone | own phone)", "[no] maybe (later | next time)", "[no] i will [just] (walk around | look around | look myself | read the signs)"] },
    // "No, I'm fine" / "I don't need it": only right after the offer (elsewhere it means something else)
    guide_no_ctx: { patterns: ["[no] i am (good | fine | okay) [thanks]", "[no] i do not (need | want) (it | one | that)", "[no] not (today | this time) [thanks]", "[no] i will pass",
      "[yes] i am sure [thanks]", "[yes] (i am | we are) (fine | okay | good) without (it | one)",
      "[no] (it is | that is) (too expensive | a bit expensive | expensive)", "[no] i do not think (i need it | so)", "i would rather not [thanks]"] },
    guide_price: { patterns: ["how much is (the | an) @guide_w #h:g_price", "how much does (the | an) @guide_w cost", "is the @guide_w free", "is the @guide_w included",
      "how much (is it | does it cost | is that)", "is (it | that) (included | free)", "does (it | the @guide_w) cost (extra | anything)", "is (it | the @guide_w) expensive",
      "[the | an] @guide_w (is | costs) how much", "how much (cost | costs) [the | an] @guide_w"] },
    guide_n_ctx: { patterns: ["[just] ({n:number} | one) [please]", "one for each of us #each", "(two | three | four) of them", "[okay | ok | sure | yes] i will take (one | it) [please]",
      "(give me | can i have | can i get | i will have | i will get | let me get | i would like | we will take) one", "[one] for both [of us] #both", "[one] for (all of us | everyone | each of us) #each",
      "[just] one is (enough | fine)", "we (will | can) share (one | it)", "{price} (okay | ok | fine | sure) [one] [please]", "{price} (okay | ok | fine | sure) i will take (one | it)"] },
    lang_ctx: { patterns: ["[in] {lang} [please] #h:l_please", "{lang} is fine", "i would like it in {lang}", "(the | an) {lang} one [please]", "[in] {lang} then",
      "[in] {lang} (is | will be | would be) (fine | okay | good | great | perfect)", "i (speak | understand | know) {lang}", "[in] {lang} language", "the {lang} version",
      "(let us do | let us go with | i will go with | i will take | i will have | give me | i prefer | i would prefer) [it in] {lang}", "(can | could) i (have | get) (it | one) in {lang}",
      "better [in] {lang}", "my [native | first] language is {lang}", "i am (from lithuania | lithuanian) [so] [{lang}]",
      // "Not in English, in Russian" (a correction in one piece)
      "not [in] {bad:lang} [but] [in] {lang} [please]"] },
    lang_q: { patterns: ["(do you have | is there) (it | one | an audio guide | the audio guide | a guide) in {lang} #h:l_have", "is it (available | possible) in {lang}", "do you have {lang}", "is there {lang}", "(does it | can it) speak {lang}",
      "is (it | the audio guide | the guide | that) in {lang}", "(does it | does the audio guide) have {lang}", "(anything | something) in {lang}", "is there {lang} language", "is {lang} available",
      "{lang} [language] you have", "you have [it in] {lang} [language]"] },
    // "I don't speak Russian" / "Not in English": never choose that language
    lang_not_ctx: { patterns: ["i (do not | can not) (speak | understand | read) {lang} [at all | very well | well | so well | that well]", "not [in] {lang}", "no {lang}", "(i do not want | i would not like) [it in] [the] {lang} [one | version]"] },
    langs_q: { patterns: ["(what | which) languages do you have #h:l_which", "(what | which) languages (is it | are they) in", "what languages",
      "(what | which) languages (are there | are available | does it have)", "what are the (options | choices)", "what (options | choices) do (i | you) have"] },
    // paying
    pay_card: { patterns: ["[can | could] i pay (by | with) (card | credit card | debit card | my card | credit) #h:pay_card", "(by | with) card", "card [please]", "do you (take | accept) (cards | credit cards | card | visa | mastercard)", "can i (use | tap) my card", "[a] (credit | debit) card",
      "(i will | i am going to | i would like to) pay (by | with) (card | credit card | debit card | my card | a card)", "(is | are) (card | cards | credit card | visa | mastercard | amex) (okay | ok | fine | accepted)",
      "contactless", "(put it | charge it) on my card", "i will (use | tap) my card", "(visa | mastercard | amex | american express)", "card is (fine | okay | ok | good)"] },
    // "I don't have cash": so it's the card (never read as "cash")
    no_cash: { patterns: ["(i | we) do not have [any | enough] cash", "no cash [sorry]", "(i | we) (can not | do not want to) pay (in | with) cash", "i have no cash"] },
    pay_cash: { patterns: ["[can | could] i pay (in | with) cash", "(in | with) cash", "cash [please]", "i will pay (in | with) cash #h:pay_cash",
      "(i will | i am going to | i would like to) pay [in | with] cash", "cash is (okay | ok | fine)", "is cash (okay | ok | fine)",
      "(can | could) i pay (in | with) (dollars | us dollars | bills)"] },
    pay_phone: { patterns: ["(can | could) i pay (with | by) (my phone | apple pay | google pay | phone)", "do you (take | accept) (apple pay | google pay)", "apple pay", "google pay",
      "(with | by) (my phone | phone)", "(can | could) i use (apple pay | google pay | my phone)"] },
    here_you_go: { patterns: ["here you (go | are) #h:here_you_go", "there you go", "here it is", "here is my card", "here is {price}", "here is (the | my) money", "here is (twenty | forty | fifty | a hundred) [dollars]", "here"] },
    // the new exhibition
    ask_exhibit: { patterns: [
      "where is the (new | special) (exhibition | exhibit | show) #h:e_where", "where can i (find | see) the (new | special) (exhibition | exhibit)", "where is (the colors of the night | the colours of the night)",
      "how do i get to the (new | special) (exhibition | exhibit)", "which floor is the [new] (exhibition | exhibit) on", "where is it [the new exhibition]", "(is there | do you have) a new (exhibition | exhibit)",
      "where (is | can i find | do i find) [the] (colors | colours) of the night [exhibition | exhibit]", "which way [is it] to the [new | special] (exhibition | exhibit)", "which way is the [new | special] (exhibition | exhibit)",
      "is the [new | special] (exhibition | exhibit) (upstairs | downstairs | on this floor | here)", "where do (i | we) go (for | to see) the [new | special] (exhibition | exhibit)",
      "(i | we) (want | would like) to see the (new | special) (exhibition | exhibit)", "where is (the | this) new (exhibition | exhibit) [please]",
      "where is the @exh", "where is the (new | special | night) @exh", "(how do | how can) (i | we) find the [new | special] @exh",
      "(can | could) you tell me where the [new | special] @exh is", "is (it | the @exh) (upstairs | downstairs | on the (first | second | third) floor)",
      "where (is | can i find) the (night | colors | colours) @exh",
      "how (do | can) (i | we) (get to | find) @exh_any", "where (should | do | can) (i | we) go to see @exh_any", "[and] (what about | how about) @exh_any", "and @exh_any",
      "where (can | do) (i | we) (find | see) @exh_any", "where is @exh_any [please]", "where (i | we) can (find | see) @exh_any", "how (i | we) (get | go) to @exh_any",
    ] },
    ask_included: { patterns: ["is (it | the new exhibition | the exhibition | the new exhibit | that) included [in the ticket | in the price] #h:e_included", "do i need a (separate | special | different) ticket for (it | the (new | special) (exhibition | exhibit))", "is the (new | special) (exhibition | exhibit) extra", "does the ticket include the (new | special) (exhibition | exhibit)",
      "(can | could) (i | we) see the (new | special) (exhibition | exhibit) with (this | my | the | our) (ticket | tickets)", "is the (new | special) (exhibition | exhibit) free",
      "do (i | we) (have to | need to) pay (extra | more) [for (it | that | the (new | special) (exhibition | exhibit))]", "is (it | that) extra", "does (it | that) cost (extra | more)"] },
    ask_exhibit_about: { patterns: ["what is the (new | special) (exhibition | exhibit) about", "what is (on | showing) (now | right now | at the moment)", "what is the colors of the night"] },
    // information
    ask_photos: { patterns: ["(can | could | may) (i | we) take (photos | pictures | a photo | a picture) [@here_] #h:q_photos", "are (photos | pictures) (allowed | okay)", "is (photography | taking photos) allowed", "can i use my (phone | camera)",
      "(can | could | may) (i | we) use [a | the] flash", "is it (okay | ok | allowed | fine) to take (photos | pictures)", "(can | could | may) (i | we) (make | take) (photos | pictures) (inside | in here | of the paintings)",
      "(is | are) (photos | pictures | photography | photo) (allowed | okay | permitted) [@here_]", "[is it | is] possible [to] (make | take) (a photo | photos | photo | pictures | a picture) [@here_]"] },
    ask_coat: { patterns: [
      "(is there | do you have) a (coat check #h:q_coat | place for coats)", "(is there | do you have | where is) a (cloakroom | cloak room) #tip:us_coatcheck", "where is the coat check",
      "where (can | do) (i | we) (leave | put | check) (my | our) (coat | coats | jacket | jackets | umbrella) #h:q_coat", "(can | could) (i | we) leave (my | our) (coat | coats | jacket) somewhere",
      "where (can | do) (i | we) (leave | put | check) (my | our) (bag | bags | backpack | backpacks) #bag", "can i take my (bag | backpack) (inside | in) #bag",
    ] },
    ask_shop: { patterns: ["where is the (gift shop | museum shop | shop | store) #h:q_shop", "is there a (gift shop | museum shop | shop)", "where can i buy (postcards | souvenirs | a postcard | a poster | gifts)"] },
    ask_cafe: { patterns: ["(is there | where is) a (cafe | coffee shop | restaurant) [@here_]", "where is the (cafe)", "where can i get (a coffee | coffee | something to eat)",
      "is there (a place | somewhere | anywhere) to (eat | get a coffee | have a coffee | get something to eat) [@here_]", "where can (i | we) (eat | have lunch | get a snack)"] },
    ask_restroom: { patterns: ["where (is | are) the (restroom | restrooms | bathroom | bathrooms | ladies room | mens room) #h:q_restroom", "where is the toilet #tip:us_restroom", "where are the toilets #tip:us_restroom", "(is there | do you have) a (restroom | bathroom)", "(can | could | may) i use the (restroom | bathroom)"] },
    ask_hours: { patterns: ["what time do you close [today #today] #h:q_close", "when (does the museum | do you) close [today #today]", "what are your (opening hours | hours)", "(are you | is the museum) open (tomorrow | on {day} | every day)", "how late are you open [today #today]", "what time does the museum (open | close) [today #today]"] },
    ask_map: { patterns: ["(do you have | can i have | could i have | can i get) a (map | floor plan | plan) [of the museum] #h:q_map", "is there a map [of the museum]"] },
    ask_elevator: { patterns: ["(is there | where is) (an | the) elevator", "where is the lift #tip:us_elevator", "is there a lift #tip:us_elevator"] },
    ask_duration: { patterns: ["how long does it take [to see (everything | the museum | it all)]", "how much time do (i | we) need", "how long (should | do) (i | we) (spend | need)"] },
    ask_tour: { patterns: ["(is there | do you have) a (guided tour | tour | tour with a guide) [today]", "what time is the (guided tour | tour)", "(are there | do you have) [any] (guided tours | tours) [today]"] },
    ask_start: { patterns: ["where (should | do) (i | we) start", "which way (is the entrance | do i go | to the galleries)", "where is the entrance", "where do i go now",
      "where are the (paintings | galleries | exhibits | pictures | collections)", "where (can | do) (i | we) (see | find) the (paintings | galleries | art | collection | exhibits | pictures)"] },
    enough_time: { patterns: ["is that enough time", "(can i | will i) see everything [in forty five minutes]", "is it [still] worth it [then]", "[only] forty five minutes",
      "is (it | that | forty five minutes) enough [time] [to see (the new exhibition | the exhibition | everything | the museum)]"] },
    come_back: { patterns: ["(can | could) i come back tomorrow [with the same ticket]", "is the ticket (good | valid) (tomorrow | for tomorrow)"] },
    more_no: { patterns: ["(that is | that will be) (all | it | everything) [for now]", "nothing else", "[no] that is it", "i am (good | fine | all set) [thanks]", "no more questions", "i think that is (all | it)",
      "[no] no questions", "[no] nothing [else]", "[no] everything is (clear | fine | good | okay)", "[no] (all | it is all) (good | clear)", "i do not have (any)? (questions | more questions)",
      "[no] i am okay [thanks]", "[no] (you have been | you were) (very | really | so)? helpful"] },
    // "Yes, I have a question"
    have_question: { patterns: ["[yes] i have (a | one | two | a few | some) (question | questions)", "[yes] (one | a) question", "[yes] (can | could | may) i ask (you)? (something | a question)"] },
    // Harold
    apology: { patterns: [
      "[oh] [i am] [so | very | really] sorry [i did not know | i did not see | about that | i will not touch it again | it will not happen again] #h:a_sorry",
      "i did not know #h:a_didnt_know", "(oops | whoops) [sorry]", "my apologies", "it will not happen again #h:a_again", "i will not (do it | touch it) again", "i apologize",
      "(sorry | oh sorry) i will turn it off", "i will turn (it | the flash) off",
      "i did not (mean to | mean it | realize | notice | see the sign | know that)", "i will not touch (it | anything | them | the paintings) [again | more | anymore]", "(it was | that was) an accident",
      "[sorry] i (not | no) know", "i (will not | do not) (do it | do that) (again | more | anymore)", "i will not touch [it | anything | them] (again | more | anymore)",
      "i will be [more] careful", "i will (step | move) back", "(okay | ok) [okay | ok] sorry", "(oops | whoops) my bad",
      "[sorry] i did not know (it | that) (is | was) not allowed", "[sorry] i did not know (i | we) (can not | could not | should not) touch (it | them | the paintings)",
      "[sorry] it was my (son | daughter | kid | child)", "[sorry] i (just | only) wanted to (see | look at) (it | them) [closer | better | up close]",
    ] },
    deny: { patterns: ["i did not touch (it | anything | the painting | the paintings)", "i was not touching (it | anything)",
      "i was (just | only) (pointing | looking | showing [my friend])", "i (just | only) pointed [at it]",
      "i did not touch (it | anything | the painting | the paintings) [i promise | really | honestly]"] },
    why_not: { patterns: ["why [not]", "why can not i touch (it | them)", "why can not (i | we) touch (it | them | the paintings | the painting | the art)", "why is it not allowed"] },
  },

  lines: {
    // --- openers ----------------------------------------------------------------
    greet: [
      t("Hi! | Welcome | to | the | museum! | How many | tickets | today?", "Sveiki! | Sveiki atvykę | į | — | muziejų! | Kiek | bilietų | šiandien?", "Sveiki! Sveiki atvykę į muziejų! Kiek bilietų šiandien?"),
      t("Hi there! | Tickets | for today?", "Sveiki! | Bilietai | šiandienai?", "Sveiki! Bilietai šiandienai?"),
      t("Good | morning! | How | can | I | help | you?", "Labas | rytas! | Kaip | galiu | aš | padėti | jums?", "Labas rytas! Kuo galiu padėti?"),
    ],
    late: [
      t("Just so you know, | we | close | in | forty-five | minutes | today.", "Kad žinotumėte, | mes | užsidarome | po | keturiasdešimt penkių | minučių | šiandien.", "Kad žinotumėte, šiandien užsidarome po keturiasdešimt penkių minučių."),
    ],
    enough_time: [t("That's | enough | to see | the | new | exhibition!", "To | užtenka | pamatyti | — | naują | parodą!", "Užteks pamatyti naują parodą!", { flags: { 0: "“That's”: the copula is absorbed by užtenka (it is enough)." } })],
    come_back: [t("Sorry, | tickets | are | only | good | for today. | But | we | open | at ten | tomorrow.", "Atsiprašau, | bilietai | — | tik | galioja | šiandienai. | Bet | mes | atsidarome | dešimtą | rytoj.", "Atsiprašau, bilietai galioja tik šiandien. Bet rytoj atsidarome dešimtą.",
      { flags: { 2: "“are”: no separate Lithuanian word; galioja (are good) carries it." } })],
    close_late: [t("Today | we | close | in | forty-five | minutes.", "Šiandien | mes | užsidarome | po | keturiasdešimt penkių | minučių.", "Šiandien užsidarome po keturiasdešimt penkių minučių.")],

    // --- tickets ------------------------------------------------------------------
    ask_qty: [
      t("How many | tickets?", "Kiek | bilietų?", "Kiek bilietų?"),
      t("How many | tickets | would | you | like?", "Kiek | bilietų | — | jūs | norėtumėte?", "Kiek bilietų norėtumėte?", { flags: { 2: "“would”: the conditional ending of norėtumėte carries it." } }),
    ],
    ask_type_one: [t("Sure! | Adult?", "Žinoma! | Suaugusiojo?", "Žinoma! Suaugusiojo?")],
    ask_type_all: [
      t("Sure! | Are | they | all | adults?", "Žinoma! | Ar | jie | visi | suaugę?", "Žinoma! Ar visi suaugę?", { flags: { 1: "“Are” in a yes/no question = the particle ar; the copula has no separate word." } }),
    ],
    ask_type_any: [
      t("Sure! | Any | students, | seniors, | or | kids?", "Žinoma! | Ar yra | studentų, | senjorų | ar | vaikų?", "Žinoma! Ar yra studentų, senjorų ar vaikų?"),
    ],
    ask_types_again: [t("Okay! | Tell | me: | adults, | students, | seniors | or | kids?", "Gerai! | Pasakykite | man: | suaugę, | studentai, | senjorai | ar | vaikai?", "Gerai! Pasakykite: suaugę, studentai, senjorai ar vaikai?")],
    ack: [
      t("Great.", "Puiku.", "Puiku."),
      t("Perfect.", "Puiku.", "Puiku."),
      t("Sure thing.", "Žinoma.", "Žinoma."),
    ],
    changed: [t("No | problem, | I | changed | it.", "Jokių | problemų, | aš | pakeičiau | tai.", "Jokių problemų, pakeičiau.")],
    no_problem: [t("No | problem!", "Jokių | problemų!", "Jokių problemų!")],
    prices: [
      t("Adults | are | eighteen | dollars, | students | are | ten, | and | seniors | are | fifteen. | Kids | under | twelve | are | free.", "Suaugusiems | kainuoja | aštuoniolika | dolerių, | studentams | kainuoja | dešimt, | o | senjorams | kainuoja | penkiolika. | Vaikams | iki | dvylikos | yra | nemokamai.", "Suaugusiems – aštuoniolika dolerių, studentams – dešimt, senjorams – penkiolika. Vaikams iki dvylikos – nemokamai."),
    ],
    discount_student: [t("Yes! | Students | are | ten | dollars | with | a | valid | student | ID.", "Taip! | Studentams | kainuoja | dešimt | dolerių | su | — | galiojančiu | studento | pažymėjimu.", "Taip! Studentams – dešimt dolerių, jei turite galiojantį studento pažymėjimą.")],
    discount_senior: [t("Yes, | seniors, | sixty-five | and | over, | are | fifteen | dollars.", "Taip, | senjorams, | šešiasdešimt penkerių | ir | vyresniems, | kainuoja | penkiolika | dolerių.", "Taip, senjorams nuo šešiasdešimt penkerių – penkiolika dolerių.")],
    discount_senior_short: [t("And | seniors | are | fifteen.", "O | senjorams | kainuoja | penkiolika.", "O senjorams – penkiolika.")],
    child_adult: [t("Kids | twelve | and | over | need | an | adult | ticket.", "Vaikams | dvylikos | ir | vyresniems | reikia | — | suaugusiojo | bilieto.", "Nuo dvylikos metų reikia suaugusiojo bilieto.")],
    kids_free: [t("Yes! | Kids | under | twelve | are | free.", "Taip! | Vaikams | iki | dvylikos | yra | nemokamai.", "Taip! Vaikams iki dvylikos – nemokamai.")],

    // --- student ID ------------------------------------------------------------------
    ask_id: [t("Can | I | see | your | student | ID, | please?", "Ar galiu | aš | pamatyti | jūsų | studento | pažymėjimą, | prašau?", "Ar galėčiau pamatyti jūsų studento pažymėjimą?")],
    ask_ids: [t("Can | I | see | the | student | IDs, | please?", "Ar galiu | aš | pamatyti | — | studentų | pažymėjimus, | prašau?", "Ar galėčiau pamatyti studentų pažymėjimus?")],
    id_ok: [
      t("Thanks! | That's | perfect.", "Ačiū! | Tai yra | puiku.", "Ačiū! Puiku."),
      t("Great, | thank | you.", "Puiku, | dėkoju | jums.", "Puiku, ačiū."),
    ],
    id_missing: [t("Sorry, | without | an | ID, | I | have | to charge | the | adult | price. | Is | that | okay?", "Atsiprašau, | be | — | pažymėjimo | aš | turiu | imti | — | suaugusiojo | kainą. | Ar | tai | tinka?", "Atsiprašau, be pažymėjimo turiu imti suaugusiojo kainą. Ar tinka?",
      { flags: { 10: "“Is” in a yes/no question = the particle ar; tinka carries the predicate." } })],
    id_sorry: [t("I'm | really | sorry. | Those | are | the | rules.", "Man | tikrai | gaila. | Tokios | yra | — | taisyklės.", "Man tikrai gaila. Tokios taisyklės.")],

    // --- audio guide ------------------------------------------------------------------
    offer_guide: [
      t("Would | you | like | an | audio guide? | It's | five | dollars.", "Ar | jūs | norėtumėte | — | audiogido? | Jis kainuoja | penkis | dolerius.", "Ar norėtumėte audiogido? Jis kainuoja penkis dolerius.",
        { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte." } }),
      t("And | an | audio guide | for | five | dollars?", "O | — | audiogidą | už | penkis | dolerius?", "O audiogidą už penkis dolerius?"),
    ],
    guide_persuade: [t("Are | you | sure? | It's | great | for | the | new | exhibition.", "Ar | jūs | {m:tikras|f:tikra}? | Jis yra | puikus | — | — | naujai | parodai.", "Ar {m:tikras|f:tikra}? Jis labai praverčia naujoje parodoje.",
      { flags: { 0: "“Are” in a yes/no question = the particle ar; the copula has no separate word.", 5: "“for”: no separate Lithuanian word; the dative parodai carries it." } })],
    guide_price: [t("It's | five | dollars, | and | we | have | it | in | seven | languages.", "Jis kainuoja | penkis | dolerius, | ir | mes | turime | jį | — | septyniomis | kalbomis.", "Jis kainuoja penkis dolerius, ir turime jį septyniomis kalbomis.",
      { flags: { 7: "“in”: no separate Lithuanian word; the instrumental kalbomis carries it (seven intervenes)." } })],
    ask_lang: [
      t("What | language | would | you | like?", "Kokios | kalbos | — | jūs | norėtumėte?", "Kokios kalbos norėtumėte?", { flags: { 2: "“would”: the conditional ending of norėtumėte carries it." } }),
      t("Which | language?", "Kokia | kalba?", "Kokia kalba?"),
    ],
    langs_list: [t("We | have | English, | Spanish, | French, | German, | Chinese, | Russian, | and | Polish.", "Mes | turime | anglų, | ispanų, | prancūzų, | vokiečių, | kinų, | rusų | ir | lenkų.", "Turime anglų, ispanų, prancūzų, vokiečių, kinų, rusų ir lenkų kalbomis.")],
    langs_list_short: [t("But | we | have | Russian, | Polish, | and | English.", "Bet | mes | turime | rusų, | lenkų | ir | anglų.", "Bet turime rusų, lenkų ir anglų kalbomis.")],
    no_lithuanian: [t("Sorry, | not | in Lithuanian.", "Atsiprašau, | ne | lietuvių kalba.", "Atsiprašau, lietuvių kalba neturime.")],
    no_lang: [t("Sorry, | not | in | that | language.", "Atsiprašau, | ne | — | ta | kalba.", "Atsiprašau, tokia kalba neturime.", { flags: { 2: "“in”: no separate Lithuanian word; the instrumental ta kalba carries it (that intervenes)." } })],
    have_lang: [t("Yes, | we | do!", "Taip, | mes | [turime]!", "Taip, turime!", { flags: { 2: "Elliptical “do”: Lithuanian repeats the verb, shown in brackets." } })],

    // --- paying ----------------------------------------------------------------------
    say_total: [
      t("That's | {$price}, | please.", "Tai yra | {$price}, | prašau.", "Iš viso {$price}."),
      t("Your | total | is | {$price}.", "Jūsų | suma | yra | {$price}.", "Iš viso {$price}."),
      t("That'll be | {$price}.", "Tai bus | {$price}.", "Iš viso {$price}."),
    ],
    card_tap: [t("Sure, | just | tap | your | card | here.", "Žinoma, | tiesiog | pridėkite | savo | kortelę | čia.", "Žinoma, tiesiog pridėkite kortelę čia.")],
    card_later: [t("Sure, | card | is fine.", "Žinoma, | kortele | galima.", "Žinoma, galima ir kortele.")],
    cash_ok: [t("Sure, | cash | is fine.", "Žinoma, | grynaisiais | galima.", "Žinoma, galima ir grynaisiais.")],
    phone_ok: [t("Of course! | Just | hold | your | phone | here.", "Žinoma! | Tiesiog | prilaikykite | savo | telefoną | čia.", "Žinoma! Tiesiog prilaikykite telefoną čia.")],
    paid: [t("Thank | you!", "Dėkoju | jums!", "Ačiū!"), t("Perfect, | thanks!", "Puiku, | ačiū!", "Puiku, ačiū!")],
    change_back: [t("Thank | you! | And | here's | your | change.", "Dėkoju | jums! | Ir | štai | jūsų | grąža.", "Ačiū! Štai jūsų grąža.")],
    ticket_here: [t("Here's | your | ticket.", "Štai | jūsų | bilietas.", "Štai jūsų bilietas.")],
    tickets_here: [t("Here | are | your | tickets.", "Štai | — | jūsų | bilietai.", "Štai jūsų bilietai.", { flags: { 1: "“are”: no separate Lithuanian word; štai carries it." } })],
    guide_here: [t("And | here's | your | audio guide, | in {X}. | Just | press | the | number | next to | each | painting.", "O | štai | jūsų | audiogidas, | {X:ins}. | Tiesiog | paspauskite | — | numerį | šalia | kiekvieno | paveikslo.", "O štai jūsų audiogidas, {X:ins}. Tiesiog paspauskite numerį šalia kiekvieno paveikslo.")],

    // --- the new exhibition ------------------------------------------------------------
    exhibit_where: [
      t("The | new | exhibition, | “The Colors of the Night”, | is | upstairs, | on the right.", "— | Nauja | paroda, | „Nakties spalvos“, | yra | viršuje, | dešinėje.", "Nauja paroda „Nakties spalvos“ – viršuje, dešinėje."),
      t("It's | upstairs, | on the right. | Just | take | the | stairs | or | the | elevator.", "Ji yra | viršuje, | dešinėje. | Tiesiog | kilkite | — | laiptais | arba | — | liftu.", "Ji viršuje, dešinėje. Tiesiog kilkite laiptais arba liftu."),
    ],
    exhibit_upstairs: [t("It's | upstairs, | on the right.", "Ji yra | viršuje, | dešinėje.", "Ji viršuje, dešinėje.")],
    already_paid: [t("Oh, | you | already | paid!", "O, | jūs | jau | sumokėjote!", "O, jūs jau sumokėjote!")],
    exhibit_included: [t("Yes, | it's | included | in | your | ticket.", "Taip, | ji yra | įskaičiuota | į | jūsų | bilietą.", "Taip, ji įeina į bilieto kainą.")],
    exhibit_about: [t("It's | paintings | of the sea | at night. | Beautiful | blues!", "Tai yra | paveikslai | jūros | naktį. | Nuostabios | mėlynos spalvos!", "Tai naktinės jūros paveikslai. Nuostabūs mėlyni atspalviai!")],
    exhibit_mention: [t("Oh, | and | don't miss | our | new | exhibition, | “The Colors of the Night”. | It's | upstairs, | on the right.", "O, | ir | nepraleiskite | mūsų | naujos | parodos | „Nakties spalvos“. | Ji yra | viršuje, | dešinėje.", "O, ir nepraleiskite mūsų naujos parodos „Nakties spalvos“. Ji viršuje, dešinėje.")],

    // --- information ---------------------------------------------------------------------
    photos: [t("Yes, | you | can | take | photos, | but | no | flash, | please.", "Taip, | jūs | galite | daryti | nuotraukas, | bet | be | blykstės, | prašau.", "Taip, fotografuoti galima, bet be blykstės.")],
    coat_check: [t("The | coat check | is | right | there, | by | the | door. | It's | free.", "— | Rūbinė | yra | štai | ten, | prie | — | durų. | Ji yra | nemokama.", "Rūbinė – štai ten, prie durų. Ji nemokama.")],
    bag_check: [t("Big | bags | go | to | the | coat check, | right | there | by | the | door.", "Dideli | krepšiai | keliauja | į | — | rūbinę, | štai | ten | prie | — | durų.", "Didelius krepšius palikite rūbinėje – štai ten, prie durų.")],
    shop_cafe: [t("The | gift shop | and | the | café | are | on | the | first | floor, | by | the | exit.", "— | Suvenyrų parduotuvė | ir | — | kavinė | yra | — | — | pirmame | aukšte, | prie | — | išėjimo.", "Suvenyrų parduotuvė ir kavinė – pirmame aukšte, prie išėjimo.",
      { flags: { 6: "“on”: no separate Lithuanian word; the locative aukšte carries it (first intervenes)." } })],
    restroom: [t("Down the hall, | past | the | coat check.", "Koridoriumi, | už | — | rūbinės.", "Koridoriumi, už rūbinės.")],
    hours: [t("We're | open | ten | to | five, | and | we're | closed | on Mondays.", "Mes esame | atidaryti | nuo dešimties | iki | penkių, | ir | mes esame | uždaryti | pirmadieniais.", "Dirbame nuo dešimties iki penkių, pirmadieniais nedirbame.")],
    close_today: [t("We | close | at five | today.", "Mes | užsidarome | penktą | šiandien.", "Šiandien užsidarome penktą.")],
    floor_plan: [t("Sure! | Here's | a | floor plan.", "Žinoma! | Štai | — | aukštų planas.", "Žinoma! Štai aukštų planas.")],
    elevator: [t("The | elevator | is | right | there, | on | your | left.", "— | Liftas | yra | štai | ten, | — | jūsų | kairėje.", "Liftas – štai ten, jūsų kairėje.", { flags: { 5: "“on”: no separate Lithuanian word; the locative kairėje carries it (your intervenes)." } })],
    duration: [t("Most | people | spend | about | two | hours | here.", "Dauguma | žmonių | praleidžia | apie | dvi | valandas | čia.", "Dauguma žmonių čia praleidžia apie dvi valandas.")],
    tour: [t("There's | a | free | guided tour | at two.", "Yra | — | nemokama | ekskursija su gidu | antrą.", "Antrą valandą vyksta nemokama ekskursija su gidu.")],
    start: [t("The | galleries | start | right | there, | on | your | left.", "— | Galerijos | prasideda | štai | ten, | — | jūsų | kairėje.", "Galerijos prasideda štai ten, jūsų kairėje.", { flags: { 5: "“on”: no separate Lithuanian word; the locative kairėje carries it (your intervenes)." } })],

    // --- the end --------------------------------------------------------------------------
    ask_more: [
      t("Any | questions?", "Ar yra | klausimų?", "Turite klausimų?", { flags: { 0: "“Any” in a question: ar yra + the genitive klausimų carries it." } }),
      t("Can | I | help | you | with | anything | else?", "Ar galiu | aš | padėti | jums | — | kuo nors | daugiau?", "Ar dar kuo nors galiu padėti?",
        { flags: { 4: "“with”: no separate Lithuanian word; the instrumental kuo nors carries it." } }),
    ],
    enjoy: [
      t("Enjoy | your | visit!", "Mėgaukitės | savo | apsilankymu!", "Gero apsilankymo!"),
      t("Have | a | great | time!", "Praleiskite | — | puikiai | laiką!", "Puikiai praleiskite laiką!"),
    ],
    // --- Harold (guard) -----------------------------------------------------------------------
    dont_touch: [
      t("Excuse me! | Please | don't touch | the | paintings.", "Atsiprašau! | Prašom | neliesti | — | paveikslų.", "Atsiprašau! Prašom neliesti paveikslų."),
      t("Excuse me! | Please | don't touch | the | art.", "Atsiprašau! | Prašom | neliesti | — | meno kūrinių.", "Atsiprašau! Prašom neliesti meno kūrinių."),
    ],
    no_flash: [t("Excuse me! | No | flash, | please.", "Atsiprašau! | Jokios | blykstės, | prašau.", "Atsiprašau! Be blykstės, prašau.")],
    harold_thanks: [
      t("Thank | you. | Enjoy | the | museum.", "Dėkoju | jums. | Mėgaukitės | — | muziejumi.", "Ačiū. Gero apsilankymo."),
      t("Thank | you | for | understanding.", "Dėkoju | jums | už | supratimą.", "Ačiū, kad suprantate."),
    ],
    harold_why: [t("The | paintings | are | very | old | and | fragile.", "— | Paveikslai | yra | labai | seni | ir | trapūs.", "Paveikslai labai seni ir trapūs.")],
    harold_why_flash: [t("The | flash | can | damage | the | paintings.", "— | Blykstė | gali | pažeisti | — | paveikslus.", "Blykstė gali pažeisti paveikslus.")],
    harold_deny: [t("My | mistake! | Enjoy | your | visit.", "Mano | klaida! | Mėgaukitės | savo | apsilankymu.", "Mano klaida! Gero apsilankymo.")],
    harold_ask: [t("Okay?", "Gerai?", "Gerai?")],
  },

  domains: {
    price: () => {
      const s = new Set<number>();
      const P = [1800, 1000, 1500, 0];
      for (let a = 0; a <= 4; a++) for (let b = 0; a + b <= 4; b++) for (let cc = 0; a + b + cc <= 4; cc++) for (let d = 0; a + b + cc + d <= 4; d++) {
        if (a + b + cc + d === 0) continue;
        for (let g = 0; g <= 4; g++) s.add(a * P[0] + b * P[1] + cc * P[2] + d * P[3] + g * GUIDE);
      }
      return [...s].sort((x, y) => x - y);
    },
  },

  hints: {
    tickets: {
      lt: "Nusipirkti bilietą", slot: "ttype", examples: ["adult", "student", "senior"],
      items: [
        { id: "tk_one", s: t("One | {X} | ticket, | please.", "Vieną | {X:gen} | bilietą, | prašau.", "Vieną {X:gen} bilietą, prašau."), only: (e) => e.id !== "child" },
        { id: "tk_two", s: t("Two | tickets, | please.", "Du | bilietus, | prašau.", "Du bilietus, prašau.") },
        { id: "tk_mix", s: t("Two | adults | and | one | student, | please.", "Du | suaugusiųjų | ir | vieną | studento, | prašau.", "Du suaugusiųjų ir vieną studento bilietą, prašau.") },
        { id: "tk_id_like", s: t("I'd like | one | {X} | ticket.", "Norėčiau | vieno | {X:gen} | bilieto.", "Norėčiau vieno {X:gen} bilieto."), only: (e) => e.id !== "child" },
        { id: "tk_can", s: t("Can | I | get | {X.np} | ticket?", "Ar galiu | aš | gauti | {X.np:gen} | bilietą?", "Ar galiu gauti {X.np:gen} bilietą?"), only: (e) => e.id !== "child" },
        { id: "tk_student", s: t("I'm | a | student.", "Aš esu | — | {m:studentas|f:studentė}.", "Aš {m:studentas|f:studentė}.") },
      ],
    },
    types_one: {
      lt: "Pasakyti, kokio bilieto reikia",
      items: [
        { id: "ty_yes", s: t("Yes, | please.", "Taip, | prašau.", "Taip, prašau.") },
        { id: "ty_student", s: t("No, | I'm | a | student.", "Ne, | aš esu | — | {m:studentas|f:studentė}.", "Ne, aš {m:studentas|f:studentė}.") },
        { id: "ty_senior", s: t("No, | a | senior | ticket, | please.", "Ne, | — | senjoro | bilietą, | prašau.", "Ne, senjoro bilietą, prašau.") },
      ],
    },
    types_all: {
      lt: "Pasakyti, kokių bilietų reikia",
      items: [
        { id: "ty_all", s: t("Yes, | all | adults.", "Taip, | visi | suaugę.", "Taip, visi suaugę.") },
        { id: "ty_one_student", s: t("No, | one | of | us | is | a | student.", "Ne, | vienas | iš | mūsų | yra | — | studentas.", "Ne, vienas iš mūsų – studentas.") },
        { id: "ty_mix", s: t("One | adult | and | one | student, | please.", "Vieną | suaugusiojo | ir | vieną | studento, | prašau.", "Vieną suaugusiojo ir vieną studento bilietą, prašau.") },
      ],
    },
    types_any: {
      lt: "Pasakyti, kokių bilietų reikia",
      items: [
        { id: "ty_just", s: t("No, | just | adults.", "Ne, | tik | suaugę.", "Ne, tik suaugę.") },
        { id: "ty_yes_student", s: t("Yes, | one | of | us | is | a | student.", "Taip, | vienas | iš | mūsų | yra | — | studentas.", "Taip, vienas iš mūsų – studentas.") },
        { id: "ty_mix", s: t("One | adult | and | one | student, | please.", "Vieną | suaugusiojo | ir | vieną | studento, | prašau.", "Vieną suaugusiojo ir vieną studento bilietą, prašau.") },
      ],
    },
    types_mix: {
      lt: "Pasakyti, kokių bilietų reikia",
      items: [
        { id: "ty_mix", s: t("One | adult | and | one | student, | please.", "Vieną | suaugusiojo | ir | vieną | studento, | prašau.", "Vieną suaugusiojo ir vieną studento bilietą, prašau.") },
        { id: "ty_they_all", s: t("They're | all | adults.", "Jie | visi | suaugę.", "Visi suaugę.", { flags: { 0: "“They're”: the copula has no separate Lithuanian word; jie carries the subject." } }) },
        { id: "ty_senior_child", s: t("One | senior | and | one | child.", "Vieną | senjoro | ir | vieną | vaiko.", "Vieną senjoro ir vieną vaiko bilietą.") },
      ],
    },
    okay: {
      lt: "Sutikti",
      items: [
        { id: "ok_fine", s: t("Okay, | that's | fine.", "Gerai, | tai | tinka.", "Gerai, tinka.", { flags: { 1: "“that's”: the copula has no separate word; tinka carries the predicate." } }) },
        { id: "ok_yes", s: t("Yes, | that's | okay.", "Taip, | tai | tinka.", "Taip, tinka.", { flags: { 1: "“that's”: the copula has no separate word; tinka carries the predicate." } }) },
      ],
    },
    guide_yes: {
      lt: "Paimti audiogidą",
      items: [
        { id: "gy_yes", s: t("Yes, | please!", "Taip, | prašau!", "Taip, prašau!") },
        { id: "gy_take", s: t("Sure, | I'll take | one.", "Žinoma, | paimsiu | vieną.", "Žinoma, paimsiu vieną.") },
        { id: "gy_one", s: t("Yes, | one | audio guide, | please.", "Taip, | vieną | audiogidą, | prašau.", "Taip, vieną audiogidą, prašau.") },
      ],
    },
    prices: {
      lt: "Paklausti kainos ir nuolaidų",
      items: [
        { id: "tk_price", s: t("How much | is | a | ticket?", "Kiek | kainuoja | — | bilietas?", "Kiek kainuoja bilietas?") },
        { id: "tk_discount", s: t("Is | there | a | student | discount?", "Ar yra | — | — | studentų | nuolaida?", "Ar yra nuolaida studentams?", { flags: { 1: "Existential “there” has no Lithuanian word; yra carries it." } }) },
        { id: "tk_kids", s: t("Are | kids | free?", "Ar | vaikams | nemokamai?", "Ar vaikams nemokamai?", { flags: { 0: "“Are” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }) },
      ],
    },
    id: {
      lt: "Parodyti studento pažymėjimą",
      items: [
        { id: "id_here", s: t("Here's | my | student | ID.", "Štai | mano | studento | pažymėjimas.", "Štai mano studento pažymėjimas.") },
        { id: "here_you_go", s: t("Here you go.", "Prašom.", "Prašom.") },
        { id: "id_none", s: t("Sorry, | I | don't have | it | with me.", "Atsiprašau, | aš | neturiu | jo | su savimi.", "Atsiprašau, neturiu jo su savimi.") },
      ],
    },
    guide: {
      lt: "Paprašyti audiogido (arba atsisakyti)",
      items: [
        { id: "g_id_like", s: t("I'd like | an | audio guide, | please.", "Norėčiau | — | audiogido, | prašau.", "Norėčiau audiogido.") },
        { id: "g_can", s: t("Can | I | get | an | audio guide?", "Ar galiu | aš | gauti | — | audiogidą?", "Ar galiu gauti audiogidą?") },
        { id: "g_is_there", s: t("Is | there | an | audio guide?", "Ar yra | — | — | audiogidas?", "Ar yra audiogidas?", { flags: { 1: "Existential “there” has no Lithuanian word; yra carries it." } }) },
        { id: "g_price", s: t("How much | is | the | audio guide?", "Kiek | kainuoja | — | audiogidas?", "Kiek kainuoja audiogidas?") },
        { id: "g_no", s: t("No, | thanks. | Just | the | ticket.", "Ne, | ačiū. | Tik | — | bilietą.", "Ne, ačiū. Tik bilietą.") },
      ],
    },
    lang: {
      lt: "Pasirinkti audiogido kalbą", slot: "lang", examples: ["english", "lithuanian", "russian", "polish"],
      items: [
        { id: "l_please", s: t("In {X}, | please.", "{X:ins}, | prašau.", "{X:ins}, prašau.") },
        { id: "l_have", s: t("Do | you | have | it | in {X}?", "Ar | jūs | turite | jį | {X:ins}?", "Ar turite jį {X:ins}?", { flags: { 0: "Question “Do” = the particle ar." } }), note: "„Do you have it in Lithuanian?“ – deja, lietuviškai nėra. Bet yra rusų, lenkų ir anglų kalbomis." },
        { id: "l_which", s: t("What | languages | do | you | have?", "Kokiomis | kalbomis | — | jūs | turite?", "Kokiomis kalbomis turite?", { flags: { 2: "Question “do” has no Lithuanian word; the tense sits on turite." } }) },
      ],
    },
    exhibit: {
      lt: "Paklausti apie naują parodą",
      items: [
        { id: "e_where", s: t("Where's | the | new | exhibition?", "Kur yra | — | nauja | paroda?", "Kur nauja paroda?") },
        { id: "e_included", s: t("Is | it | included | in | the | ticket?", "Ar | ji | įskaičiuota | į | — | bilietą?", "Ar ji įeina į bilieto kainą?", { flags: { 0: "“Is” in a yes/no question = the particle ar; the passive participle įskaičiuota carries the copula." } }) },
      ],
    },
    questions: {
      lt: "Paklausti apie muziejų",
      items: [
        { id: "q_photos", s: t("Can | I | take | photos?", "Ar galiu | aš | daryti | nuotraukas?", "Ar galima fotografuoti?") },
        { id: "q_coat", s: t("Where | can | I | leave | my | coat?", "Kur | galiu | aš | palikti | savo | paltą?", "Kur galėčiau palikti paltą?") },
        { id: "q_shop", s: t("Where's | the | gift shop?", "Kur yra | — | suvenyrų parduotuvė?", "Kur suvenyrų parduotuvė?") },
        { id: "q_restroom", s: t("Where | are | the | restrooms?", "Kur | yra | — | tualetai?", "Kur tualetai?") },
        { id: "q_close", s: t("What time | do | you | close?", "Kelintą | — | jūs | užsidarote?", "Kelintą užsidarote?", { flags: { 1: "Question “do” has no Lithuanian word; the tense sits on užsidarote." } }) },
        { id: "q_map", s: t("Do | you | have | a | floor plan?", "Ar | jūs | turite | — | aukštų planą?", "Ar turite aukštų planą?", { flags: { 0: "Question “Do” = the particle ar." } }) },
      ],
    },
    pay: {
      lt: "Susimokėti",
      items: [
        { id: "pay_card", s: t("Can | I | pay | by card?", "Ar galiu | aš | sumokėti | kortele?", "Ar galiu sumokėti kortele?") },
        { id: "pay_cash", s: t("I'll pay | in cash.", "Sumokėsiu | grynaisiais.", "Sumokėsiu grynaisiais.") },
        { id: "here_you_go", s: t("Here you go.", "Prašom.", "Prašom.") },
      ],
    },
    sorry: {
      lt: "Atsiprašyti prižiūrėtojo",
      items: [
        { id: "a_sorry", s: t("Oh, | I'm sorry!", "O, | atsiprašau!", "O, atsiprašau!") },
        { id: "a_didnt_know", s: t("Sorry, | I | didn't know.", "Atsiprašau, | aš | nežinojau.", "Atsiprašau, nežinojau.") },
        { id: "a_again", s: t("It | won't happen | again.", "Tai | nepasikartos | daugiau.", "Daugiau taip nebus.") },
      ],
    },
    done: {
      lt: "Pasakyti, kad daugiau klausimų nėra",
      items: [
        { id: "d_all", s: t("That's | all, | thanks.", "Tai yra | viskas, | ačiū.", "Tai viskas, ačiū.") },
        { id: "d_good", s: t("No, | I'm | good, | thanks.", "Ne, | man | viskas gerai, | ačiū.", "Ne, man viskas aišku, ačiū.") },
      ],
    },
  },

  tips: {
    us_coatcheck: { key: "us_coatcheck", lt: "Suprasta! Amerikoje dažniau sakoma „coat check“.", better: "Is there a coat check?" },
    us_elevator: { key: "us_elevator", lt: "Suprasta! Amerikoje sakoma „elevator“, o ne „lift“.", better: "Is there an elevator?" },
    us_restroom: { key: "us_restroom", lt: "Suprasta! Amerikoje mandagiau sakyti „restroom“.", better: "Where are the restrooms?" },
    us_senior: { key: "us_senior", lt: "Suprasta! Amerikoje sakoma „senior“, o ne „pensioner“.", better: "Is there a senior discount?" },
  },

  merges: {
    "sure thing": { reason: "lexical_expression", split: "sure → tikras + thing → daiktas is false; = žinoma.", minimal: "Two words." },
    "next to": { reason: "lexical_expression", split: "next → kitas + to → į is false; = šalia.", minimal: "Two words." },
    "excuse me": { reason: "lexical_expression", split: "excuse → atleiskite + me → man is a calque; the polite opener = atsiprašau.", minimal: "Two words." },
    "how many": { reason: "lexical_expression", split: "how → kaip + many → daug is false; = kiek.", minimal: "Two words." },
    "what time": { reason: "lexical_expression", split: "what → koks + time → laikas is false for clock time; = kelintą.", minimal: "Two words." },
    "just so you know": { reason: "lexical_expression", split: "just → tik + so → taip + you → jūs + know → žinote is a literal reading of a set phrase; = kad žinotumėte.", minimal: "Four words, one phrase." },
    "audio guide": { reason: "lexical_expression", split: "Lithuanian writes the device as one word, audiogidas; audio → garso + guide → gidas would name a person.", minimal: "Two-word compound." },
    "coat check": { reason: "lexical_expression", split: "coat → paltas + check → patikra is false; the place = rūbinė.", minimal: "Two-word compound." },
    "gift shop": { reason: "lexical_expression", split: "gift → dovana + shop → parduotuvė gives “dovanų parduotuvė”; a museum shop = suvenyrų parduotuvė.", minimal: "Two-word compound." },
    "floor plan": { reason: "lexical_expression", split: "floor → grindys + plan → planas is false; = aukštų planas.", minimal: "Two-word compound." },
    "guided tour": { reason: "lexical_expression", split: "guided → vedama + tour → ekskursija is a calque; = ekskursija su gidu.", minimal: "Two words." },
    "the colors of the night": { reason: "lexical_expression", split: "An exhibition title: translated as a whole (Nakties spalvos).", minimal: "The whole title." },
    "down the hall": { reason: "grammatical_fusion", split: "down → žemyn is false; the instrumental koridoriumi carries “along”.", minimal: "No adjective inside." },
    "in lithuanian": { reason: "grammatical_fusion", split: "in → į is false; the instrumental lietuvių kalba carries it.", minimal: "Preposition + name of the language." },
  },

  // -------------------------------------------------------------------------

  // The plan: ticket → audio guide (+ its language) → pay → where the new exhibition is.
  // A student ticket adds the ID; Harold's "Please don't touch!" (a later visit) adds the apology.
  mission: [
    { lt: "Paprašyk bilieto", done: (c) => !!c.s.tix && count(c.s.tix) > 0 && !!c.s.typesKnown },
    { lt: "Parodyk studento pažymėjimą", optional: true, when: (c) => !!c.s.tix?.student && !c.s.idChecked, done: (c) => !!c.s.idShown },
    { lt: "Pasiimk audiogidą", optional: true, when: (c) => !c.s.guideNo, done: (c) => !!c.s.guides },
    { step: "lang", lt: "Pasirink audiogido kalbą", optional: true },
    { lt: "Susimokėk", done: (c) => !!c.s.paid },
    { lt: "Sužinok, kur nauja paroda", done: (c) => !!c.s.exhibitKnown },
    { lt: "Atsiprašyk prižiūrėtojo", optional: true, when: (c) => !!c.s.harold && !c.s.denied, done: (c) => !!c.s.apologized },
  ],
  steps: [
    { id: "tickets", done: (c) => !!c.s.tix && count(c.s.tix) > 0,
      ask: (c) => c.say("ask_qty"),
      // Nothing that an utterance could be split into (the expected-intent bonus is per segment):
      // "One senior ticket" must stay one buy_tickets, not "one" + "senior ticket".
      expects: [],
      suggest: [
        { lt: "Paprašyti bilieto", hint: "tickets", options: "ttype" },
        { lt: "Paklausti kainos ir nuolaidų", hint: "prices" },
        { lt: "Paklausti apie audiogidą", hint: "guide" },
      ],
      help: (c) => { c.say("prices"); c.say("ask_qty"); } },
    { id: "types", when: (c) => !!c.s.tix && !c.s.typesKnown, done: (c) => !!c.s.typesKnown,
      ask: (c) => { askTypes(c); },
      expects: ["all_adults_ctx", "mixed_types_ctx"],
      suggest: [{ lt: "Pasakyti, kokių bilietų reikia", hint: "types_mix", options: "ttype" }] },
    { id: "student_id", when: (c) => !!c.s.tix?.student && !c.s.idChecked, done: (c) => !!c.s.idChecked,
      ask: (c) => c.say(c.s.tix.student > 1 ? "ask_ids" : "ask_id"),
      expects: ["have_id", "no_id", "here_you_go"],
      suggest: [{ lt: "Parodyti studento pažymėjimą", hint: "id" }],
      yes: (c) => { H.have_id(c, {}, { intent: "have_id", slots: {}, tags: [] }); },
      no: (c) => { H.no_id(c, {}, { intent: "no_id", slots: {}, tags: [] }); } },
    { id: "guide", when: (c) => !c.s.guideAsked && !c.s.guides, done: (c) => !!c.s.guideAsked,
      ask: (c) => c.say("offer_guide"),
      expects: ["want_guide", "no_guide", "guide_price", "guide_n_ctx", "lang_q", "guide_no_ctx"],
      suggest: [{ lt: "Paimti audiogidą", hint: "guide_yes" }, { lt: "Paklausti apie audiogidą", hint: "guide" }, { lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
      yes: (c) => { c.s.guideAsked = true; c.s.guides = 1; },
      no: (c) => { H.no_guide(c, {}, { intent: "no_guide", slots: {}, tags: [] }); } },
    { id: "lang", when: (c) => !!c.s.guides && !c.s.lang, done: (c) => !!c.s.lang,
      ask: (c) => { if (c.s.langAsked) { c.s.langAsked = false; return; } c.say("ask_lang"); },
      expects: ["lang_ctx", "lang_q", "langs_q", "lang_not_ctx"],
      suggest: [{ lt: "Pasirinkti audiogido kalbą", hint: "lang", options: ["english", "lithuanian", "russian", "polish", "german", "spanish"] }],
      help: (c) => { c.say("langs_list"); } },
    { id: "pay", when: (c) => !!c.s.tix && !!c.s.typesKnown, done: (c) => !!c.s.paid,
      ask: (c) => {
        if (total(c) === 0) { c.s.paid = true; c.say("kids_free"); handover(c); return; }
        c.s.totalSaid = true;
        c.say("say_total", { price: total(c) });
      },
      expects: ["pay_card", "pay_cash", "pay_phone", "here_you_go", "no_cash"],
      suggest: [{ lt: "Susimokėti", hint: "pay" }] },
    // "Any questions?" — first the new exhibition (the goal), then anything else.
    { id: "exhibit", when: (c) => !!c.s.paid && !c.s.exhibitKnown, done: (c) => !!c.s.exhibitKnown,
      ask: (c) => c.say("ask_more"),
      expects: ["ask_exhibit", "ask_included", "more_no", "have_question"],
      suggest: [
        { lt: "Paklausti, kur nauja paroda", hint: "exhibit" },
        { lt: "Paklausti apie muziejų", hint: "questions" },
      ],
      yes: (c) => { c.say("g_yes_what"); c.hold(); },
      no: (c) => { c.s.moreDone = true; exhibitAnyway(c); } },
    { id: "more", when: (c) => !!c.s.paid && !!c.s.exhibitKnown, done: (c) => !!c.s.moreDone,
      ask: (c) => c.say("ask_more"),
      expects: ["more_no", "ask_exhibit", "ask_included", "have_question"],
      suggest: [
        { lt: "Pasakyti, kad klausimų nėra", hint: "done" },
        { lt: "Paklausti apie muziejų", hint: "questions" },
      ],
      yes: (c) => { c.say("g_yes_what"); c.hold(); },
      no: (c) => { c.s.moreDone = true; } },
  ],

  init: (c) => {
    c.s.guides = 0;
    c.s.mentionExhibit = c.chance(0.4);
    c.s.harold = false;
    c.s.haroldTwist = c.visits >= 1 && c.chance(0.6);
    c.s.late = c.visits >= 2 && c.chance(0.35);
  },

  start: (c) => {
    c.say("greet");
    if (c.s.late) {
      c.say("late");
      c.twist("closing_soon");
      c.expect({ id: "late", optional: true, hints: ["tickets"], expects: ["enough_time", "come_back"],
        suggest: [{ lt: "Nusipirkti bilietą", hint: "tickets", options: "ttype" }],
        yes: (cc) => { cc.say("ack"); cc.say("ask_qty"); cc.hold(); },
        no: (cc) => { cc.say("no_problem"); cc.say("ask_qty"); cc.hold(); } });
      return;
    }
    c.hold(); // the greeting asks for tickets (the "tickets" step)
  },

  handlers: wrap(H),

  finish: (c) => {
    if (!c.s.exhibitKnown) { c.s.exhibitKnown = true; c.say("exhibit_mention"); }
    c.say("enjoy");
    // Harold's "Please don't touch!" (a later visit) comes before the task is complete: the apology finishes it.
    if (c.s.haroldTwist) {
      c.s.harold = true;
      c.twist("dont_touch");
      c.speaker("harold");
      c.s.flash = !!c.s.askedPhotos && c.chance(0.5);
      c.say(c.s.flash ? "no_flash" : "dont_touch");
      const pend: Pending = { id: "harold", hints: ["sorry"], expects: ["apology", "g_sorry", "deny", "why_not"],
        suggest: [{ lt: "Atsiprašyti prižiūrėtojo", hint: "sorry" }],
        on: {
          apology: (cc) => { haroldThanks(cc); },
          g_sorry: (cc) => { haroldThanks(cc); },
          g_repeat: (cc) => { haroldThanks(cc); }, // "Sorry!" alone
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
    c.expect({ id: "closing", hints: ["g_social"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    { say: "One adult ticket, please.", intent: "buy_tickets", slots: { tks: { tk: { tt: "adult" } } } },
    { say: "Two tickets, please.", intent: "buy_qty", slots: { n: 2 } },
    { say: "Two adults and one student, please.", intent: "buy_tickets" },
    { say: "I'd like one student ticket.", intent: "buy_tickets", slots: { tks: { tk: { tt: "student" } } } },
    { say: "Can I get a senior ticket?", intent: "buy_tickets", slots: { tks: { tk: { tt: "senior" } } } },
    { say: "Two tickets: one adult and one student, if I may.", intent: "buy_tickets" },
    { say: "Just one, please", intent: "buy_qty" },
    { say: "Just one, please", intent: "guide_n_ctx", step: "guide" },
    { say: "Two", intent: "buy_qty", slots: { n: 2 } },
    { say: "One senior ticket, please", intent: "buy_tickets", step: "tickets", not: ["buy_qty"] },
    { say: "Two adults and a child", intent: "buy_tickets" },
    { say: "I'm a student", intent: "im_student" },
    { say: "I'm a senior", intent: "im_senior" },
    { say: "Can I get a ticket for my son? He's ten.", intent: "buy_tickets" },
    { say: "How much is a ticket?", intent: "ask_prices" },
    { say: "Is there a student discount?", intent: "ask_discount" },
    { say: "Is there a discount for pensioners?", intent: "ask_discount" },
    { say: "Are kids free?", intent: "kids_free" },
    { say: "Yes", intent: "yn:yes", step: "types" },
    { say: "One of us is a student", intent: "types_ans", step: "types" },
    { say: "No, just adults.", intent: "all_adults_ctx", step: "types", not: ["buy_tickets"] },
    { say: "Yes, all adults.", intent: "all_adults_ctx", step: "types" },
    { say: "Sure, I'll take one.", intent: "guide_n_ctx", step: "guide" },
    { say: "No, I'm a student.", intent: "im_student" },
    { say: "Here's my student ID", intent: "have_id", step: "student_id" },
    { say: "Sorry, I don't have it with me", intent: "no_id", step: "student_id", not: ["have_id"] },
    { say: "I left my student card at the hotel", intent: "no_id" },
    { say: "Not a student", intent: "reject_type", not: ["buy_tickets", "im_student"] },
    { say: "I'd like an audio guide, please.", intent: "want_guide" },
    { say: "Can I get an audio guide?", intent: "want_guide" },
    { say: "Is there an audio guide?", intent: "want_guide" },
    { say: "How much is the audio guide?", intent: "guide_price" },
    { say: "No, thanks. Just the ticket.", intent: "no_guide", not: ["want_guide"] },
    { say: "I don't need an audio guide", intent: "no_guide", not: ["want_guide"] },
    { say: "English, please", intent: "lang_ctx", step: "lang", slots: { lang: "english" } },
    { say: "In Russian, please", intent: "lang_ctx", step: "lang", slots: { lang: "russian" } },
    { say: "Do you have it in Lithuanian?", intent: "lang_q", slots: { lang: "lithuanian" } },
    { say: "What languages do you have?", intent: "langs_q" },
    { say: "Can I pay by card?", intent: "pay_card", step: "pay" },
    { say: "Here you go", intent: "here_you_go", step: "pay" },
    { say: "Where's the new exhibition?", intent: "ask_exhibit" },
    { say: "Is it included in the ticket?", intent: "ask_included" },
    { say: "Do I need a separate ticket for the new exhibition?", intent: "ask_included" },
    { say: "Can I take photos?", intent: "ask_photos" },
    { say: "Where can I leave my coat?", intent: "ask_coat" },
    { say: "Is there a cloakroom?", intent: "ask_coat" },
    { say: "Where's the gift shop?", intent: "ask_shop" },
    { say: "Is there a café?", intent: "ask_cafe" },
    { say: "Where are the restrooms?", intent: "ask_restroom" },
    { say: "What time do you close?", intent: "ask_hours" },
    { say: "Do you have a floor plan?", intent: "ask_map" },
    { say: "Where is the lift?", intent: "ask_elevator" },
    { say: "How long does it take to see everything?", intent: "ask_duration" },
    { say: "Is there a guided tour?", intent: "ask_tour" },
    { say: "Oh, I'm so sorry!", intent: "apology" },
    { say: "Sorry, I didn't know.", intent: "apology" },
    { say: "I didn't touch it!", intent: "deny", not: ["apology"] },
    { say: "That's all, thanks", intent: "more_no", step: "more" },
    { say: "the painting ate my ticket", intent: "none" },
    { say: "blue square yesterday flash", intent: "none" },
    // more ways to say it (dev corpus tests/corpus/s70-museum.json)
    { say: "Two adults, please", intent: "buy_tickets", step: "tickets", slots: { tks: { tk: { tt: "adult", n: 2 } } }, not: ["buy_qty"] },
    { say: "Two tickets for adults, please", intent: "buy_tickets", slots: { tks: { tk: { tt: "adult", n: 2 } } } },
    { say: "Can I buy a ticket?", intent: "buy_qty" },
    { say: "We are three", intent: "buy_qty", slots: { n: 3 } },
    { say: "Me and my wife", intent: "buy_qty" },
    { say: "One entry, please", intent: "buy_qty" },
    { say: "I'd like to visit the museum", intent: "buy_qty" },
    { say: "We are both adults", intent: "all_adults_ctx", step: "types" },
    { say: "My friend is a student", intent: "types_ans", step: "types" },
    { say: "No, they're not all adults", intent: "mixed_types_ctx", step: "types", not: ["all_adults_ctx"] },
    { say: "I forgot it at home", intent: "no_id", step: "student_id" },
    { say: "My student card is expired", intent: "no_id", step: "student_id", not: ["have_id"] },
    { say: "Okay, I'll pay the full price", intent: "adult_ok" },
    { say: "Yes, in English, please", intent: "want_guide", step: "guide", slots: { lang: "english" } },
    { say: "For both of us", intent: "guide_n_ctx", step: "guide" },
    { say: "No, I'm fine", intent: "guide_no_ctx", step: "guide", not: ["more_no"] },
    { say: "No, it's too expensive", intent: "guide_no_ctx", step: "guide", not: ["guide_n_ctx", "want_guide"] },
    { say: "How much is it?", intent: "guide_price", step: "guide" },
    { say: "I speak Russian", intent: "lang_ctx", step: "lang", slots: { lang: "russian" } },
    { say: "I don't understand English", intent: "lang_not_ctx", step: "lang", not: ["lang_ctx"] },
    { say: "Is Mastercard okay?", intent: "pay_card", step: "pay" },
    { say: "Which way to the new exhibition?", intent: "ask_exhibit", step: "exhibit" },
    { say: "Do I have to pay extra for the new exhibition?", intent: "ask_included", step: "exhibit" },
    { say: "Yes, I have a question", intent: "have_question", step: "exhibit", not: ["more_no"] },
    { say: "No questions, thanks", intent: "more_no", step: "more" },
    { say: "Can we make photos inside?", intent: "ask_photos" },
    { say: "Sorry, I won't touch it", intent: "apology", not: ["deny"] },
    { say: "Sorry, I didn't mean to", intent: "apology" },
    // learner English
    { say: "How much cost ticket?", intent: "ask_prices" },
    { say: "Where I can find new exhibition?", intent: "ask_exhibit", step: "exhibit" },
    { say: "I not have student card with me", intent: "no_id", step: "student_id", not: ["have_id"] },
    { say: "Is possible make photo?", intent: "ask_photos" },
    { say: "My language is Lithuanian", intent: "lang_ctx", step: "lang", slots: { lang: "lithuanian" } },
    { say: "Five dollars? Okay, one please", intent: "guide_n_ctx", step: "guide" },
    { say: "I don't have cash", intent: "no_cash", step: "pay", not: ["pay_cash", "no_id"] },
    { say: "I don't need two audio guides", intent: "no_guide", step: "guide", not: ["want_guide", "guide_n_ctx"] },
    { say: "I don't want the English one", intent: "lang_not_ctx", step: "lang", not: ["buy_qty", "lang_ctx"] },
    { say: "An adult ticket would be great", intent: "buy_tickets", slots: { tks: { tk: { tt: "adult" } } } },
    { say: "One student, the others are adults", intent: "types_ans", step: "types" },
  ],

  sims: [
    { name: "one adult, audio guide in English, card, exhibition", turns: ["Hi! One adult ticket, please.", "Yes, please", "English, please", "Card", "Where's the new exhibition?", "No, that's all. Thanks!"], expect: { complete: true }, auto: AUTO },
    // no guard at the end: "Thank you!" is the goodbye
    { name: "two tickets, student without ID, Lithuanian audio guide", turns: ["Hello! Two tickets, please.", "One of us is a student", "Sorry, I don't have it with me", "Okay", "Do you have an audio guide?", "Do you have it in Lithuanian?", "Russian, then", "Cash", "Here you go", "Is it included in the ticket?", "Thank you!"], expect: { complete: true }, auto: AUTO,
      setup: (s) => { s.haroldTwist = false; } },
    // "Oh, sorry!" answers the guard (twist, pinned on)
    { name: "questions first, no audio guide, photos", turns: ["How much is a ticket?", "Is there a student discount?", "Can I take photos?", "One senior ticket, please", "No, thanks", "No, just the ticket", "Here you go", "Where can I leave my coat?", "Nothing else, thanks", "Oh, sorry!"], expect: { complete: true }, auto: AUTO,
      setup: (s) => { s.haroldTwist = true; } },
    // "I'll pay in cash." comes with the language, before the total: once the total is said it pays at once, and a
    // "Here you go." after it had nothing left to do. The guard (twist) is pinned on.
    { name: "two adults, the audio guide after all, Harold denied", turns: ["Two tickets, please.", "No, just adults.", "No, thanks.", "Okay, I'll take one.", "In English, please. I'll pay in cash.", "Here you go.", "Is it included in the ticket?", "No, I'm good, thanks.", "I didn't touch anything!"], expect: { complete: true }, auto: AUTO,
      setup: (s) => { s.haroldTwist = true; } },
    // "Sorry, I didn't know." answers the guard (twist, pinned on)
    { name: "student with ID and a family question", turns: ["I'm a student", "Here's my student ID", "Are kids free?", "I'd like an audio guide, please", "What languages do you have?", "Polish, please", "Can I pay with Apple Pay?", "What time do you close?", "That's all", "Sorry, I didn't know."], expect: { complete: true }, auto: AUTO,
      setup: (s) => { s.haroldTwist = true; } },
  ],
};

export default museum;
