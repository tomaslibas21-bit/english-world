// Advanced song P25 "What If We Met Halfway": haggling over a used car with a private seller.
// Cedar Lane, Maggie Holt's driveway (a stranger: jūs). Maggie, about 60, a retired drama teacher, sells
// her cherry-red 1998 convertible, asking $9,000. The learner says why they came, asks about the car
// (mileage, accidents, why she's selling…), takes it around the block, then haggles with the song's
// phrases: "That's a bit more than I was hoping to spend", "Is there any flexibility on the price?",
// "I was thinking more along the lines of seven", "What if we met halfway?", "Can you do any better?",
// "Is that your best offer?", "Let me sleep on it", "That works for me". A deal ends with the payment
// (cash, transfer or a cashier's check), the keys and the title; a polite (or blunt) refusal is a valid
// ending too. Leaving before any price talk is not.
// Price model: $9,000 → 8,500 → 8,000 → 7,750 (her "best", with a throw-in: new tires, the car cover or
// a full tank); 7,500 is her floor, reached only with the song's tactics (halfway, sleep on it, walking
// away). Cash takes $250 off once; a fault (the AC, or the learner's own criticism after the drive)
// takes $250 off every price once. After eight moves without a deal she names her floor.
// Twists (one per visit, an unseen one preferred on replays): the air conditioning doesn't work
// (Maggie owns up after the drive, when asked about problems, or before the first number); another
// buyer texts her after her second concession ("Let me sleep on it" → "Don't you dare!").
// The song's dinner-date ending is left out (spec decision 5).
//
// Prices are values: {$p} = Maggie's price, {$q} = the learner's number (echoed only when it is a
// multiple of $250). On screen "$8,500" / "8 500 dolerių"; spoken with the song's shorthand
// ("eight and a half", "nine thousand", "seven thousand seven hundred fifty").
//
// ART: pictures to commission (none exist yet), by the step / pending ids that show them:
//  1. start, arrive, look, drive (and the closing after a walk-away): Cedar Lane on a sunny late afternoon:
//     a white clapboard house with a porch and a maple tree, a mailbox with a small dent at the curb, the
//     cherry-red 1998-style convertible (no brand) with the top down, cream seats, chrome bumpers and a
//     hand-written "FOR SALE $9,000" sign in the windshield; Maggie (about 60, short silver hair, big
//     sunglasses pushed up, denim shirt with rolled sleeves, a red keychain) smiling beside it.
//  2. opinion (after test_drive): the convertible pulling back into the driveway, Maggie waiting with her
//     arms open: "Welcome back!"
//  3. talk, haggle, decide; pending price, offer, confirm, final, flaw: Maggie leaning on the car, arms
//     folded, a sly smile (haggling).
//  4. pending rival (the question right after the rival buyer's text, twist rival_buyer): Maggie glancing at her
//     buzzing phone.
//  5. pending shake, step pay, pending closing after a deal: the handshake beside the car, the keys on the
//     red keychain changing hands.
//
// No NEEDS in the shared files. The engine has no animation, sound or narration for the test drive, the
// handshake or the phone buzz, and no end card: the scene emits c.event("drive"), c.event("handshake") and
// c.event("phone") (ignored by the game today) and says those moments in Maggie's lines instead ("Welcome
// back!", "Let's shake on it.", "Oh, sorry, that's my phone.").

import type { Ctx, Handler, Segment, SituationDef, Suggestion, Tip } from "../types";
import type { SlotFn, SlotResult } from "../../convo/grammar";
import { t } from "../dsl";
import { readInt } from "../../convo/slots";
import { numberWords } from "../../convo/compose";

// ---------------------------------------------------------------------------
// Flags used more than once

const F_DO_Q = "Question “Do” = the particle ar.";
const F_DOES_Q = "Question “Does” = the particle ar.";
const F_WOULD_Q = "“Would” in a yes/no question = the particle ar; the conditional sits on the verb.";
const F_WOULD = "“would” has no separate word: the conditional ending of the verb carries it.";
const F_WH_DO = "Question “do” has no Lithuanian word; the tense sits on the verb.";
const F_WH_DID = "Question “did” has no Lithuanian word; the past tense sits on the verb.";
const F_IS_Q = "“Is” in a yes/no question = the particle ar; the copula is omitted.";
const F_RATHER = "“more” here = rather: greičiau.";
const F_CAR_IT = "“it” = the car: mašina is feminine, so ji/ją.";

// ---------------------------------------------------------------------------
// Car prices: "7000", "$7,000", "7 000", "7k", "7.5k", "seven thousand five hundred", "seventy-five
// hundred", "seven grand", and the car-price shorthand of the song: a bare "seven" = $7,000, "seven and
// a half" / "seven five" = $7,500, "eighty-two fifty" = $8,250. Value in dollars, rounded to $50;
// $500–$20,000 only.

const DIGIT_WORD: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
const usdSlot: SlotFn = (tokens, pos) => {
  const out: SlotResult[] = [];
  const push = (end: number, v: number, cost = 0) => {
    const r = Math.round(v / 50) * 50;
    if (r >= 500 && r <= 20000) out.push({ end, value: r, cost });
  };
  const t0 = tokens[pos];
  if (t0 === undefined) return out;
  let m = t0.match(/^(\d{1,2}(?:\.\d{1,3})?)k$/);
  if (m) push(pos + 1, parseFloat(m[1]) * 1000);
  m = t0.match(/^(\d{1,2})\.(\d{1,3})$/);
  if (m) push(pos + 1, parseFloat(t0) * 1000, 0.1); // "7.5" = $7,500; "7.000" (a European thousands dot)
  for (const r of readInt(tokens, pos, false)) {
    const v = r.value, i = r.end;
    // "seven thousand five" = $7,500 (not $7,005)
    if (v >= 1000 && r.words && v % 1000 > 0 && v % 1000 < 10) push(i, Math.floor(v / 1000) * 1000 + (v % 1000) * 100);
    else if (v >= 500) push(i, v);
    // "seventy-seven fifty" = $7,750, "eighty-two fifty" = $8,250
    if (v >= 50 && v <= 99 && r.words && tokens[i] === "fifty") push(i + 1, v * 100 + 50);
    if (v < 1 || v > 20) continue;
    const nx = tokens[i];
    if (nx === "thousand" || nx === "grand" || nx === "k") {
      push(i + 1, v * 1000);
      if (tokens[i + 1] === "and" && tokens[i + 2] === "a" && tokens[i + 3] === "half") push(i + 4, v * 1000 + 500);
      continue;
    }
    if (!r.words && /^\d{3}$/.test(nx ?? "")) { push(i + 1, v * 1000 + parseInt(nx, 10)); continue; } // "7 500"
    push(i, v * 1000, 0.2); // "seven" = $7,000
    if (nx === "and" && tokens[i + 1] === "a" && tokens[i + 2] === "half") push(i + 3, v * 1000 + 500);
    if (nx === "and" && tokens[i + 1] === "half") push(i + 2, v * 1000 + 500, 0.1);
    if (nx === "point" && DIGIT_WORD[tokens[i + 1]] !== undefined) push(i + 2, v * 1000 + DIGIT_WORD[tokens[i + 1]] * 100);
    if (r.words && DIGIT_WORD[nx] !== undefined) {
      const h = v * 1000 + DIGIT_WORD[nx] * 100; // "seven five" = $7,500
      push(i + 1, h, 0.1);
      if (tokens[i + 2] === "fifty") push(i + 3, h + 50, 0.1); // "eight two fifty" = $8,250
    }
  }
  return out;
};

/** A price as a value: "$8,500" / "8 500 dolerių" / "eight and a half". Prices are multiples of $50 from
 *  $500 up, so "dolerių" (genitive plural) is always the right Lithuanian case. */
function usd(n: number) {
  const th = Math.floor(n / 1000), rest = n % 1000;
  const say = rest === 0 ? numberWords(n) : rest === 500 ? `${numberWords(th)} and a half` : numberWords(n);
  const lt = th ? `${th} ${String(rest).padStart(3, "0")}` : String(n);
  return { en: "$" + n.toLocaleString("en-US"), lt: `${lt} dolerių`, say };
}

// ---------------------------------------------------------------------------
// Price model

const ASK = 9000;
const off = (c: Ctx) => (c.s.off as number) ?? 0; // the fault lever: $250 off every price, once
const FINAL = (c: Ctx) => 7750 - off(c);
const FLOOR = (c: Ctx) => 7500 - off(c);
const RUNGS = [8500, 8000, 7750];
const nextRung = (c: Ctx): number | null => RUNGS.map((x) => x - off(c)).find((x) => x < c.s.cur) ?? null;
const r250 = (x: number) => Math.round(x / 250) * 250;
const P = (c: Ctx) => ({ p: usd(c.s.cur) });
/** The learner's number can be echoed ("$7,000? I was thinking…") when it has a recording (domain q). */
const echoable = (q: number) => q % 250 === 0 && q >= 5000 && q < 9000;

const THROW_INS = ["tires", "tires", "cover", "tank"];

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

/** One negotiating move per turn: "That's a bit much. Would you take seven?" is an offer, and the song's
 *  "That's a bit more than I was hoping to spend. Is there any flexibility on the price?" gets one reply. */
const MOVE: Record<string, number> = {
  make_offer: 10, make_offer_ctx: 10, halfway: 9, accept_deal: 8, accept_ctx: 8, sleep_on_it: 8, walk_away: 8, walk_rude: 8,
  ask_best: 6, ask_better: 6, ask_flex: 5, too_high: 5, lets_talk: 4, ask_price: 4,
};
function mainMove(c: Ctx, intent: string): boolean {
  const best = Math.max(0, ...turnSegments(c).map((s) => MOVE[s.intent] ?? 0));
  if ((MOVE[intent] ?? 0) < best) return false;
  return once(c, "move");
}

// ---------------------------------------------------------------------------
// Suggestions and pending questions

const S_OFFER: Suggestion = { lt: "Pasiūlyti savo kainą", hint: "offer" };
const S_PUSH: Suggestion = { lt: "Spausti toliau: per pusę, geriausia kaina", hint: "push" };
const S_DECIDE: Suggestion = { lt: "Sutikti, atidėti arba mandagiai atsisakyti", hint: "decide" };
const S_TALK: Suggestion = { lt: "Pradėti kalbėti apie kainą", hint: "talk" };
const S_DRIVE: Suggestion = { lt: "Paprašyti bandomojo važiavimo (arba atsisakyti)", hint: "drive" };
const flawSuggest = (c: Ctx): Suggestion[] =>
  c.s.flawUsed ? [] : c.s.flawKnown ? [{ lt: "Pasinaudoti trūkumu", hint: "flaw_ac" }] : c.s.complained ? [{ lt: "Pasinaudoti trūkumu", hint: "flaw_brakes" }] : [];

const NEG = ["make_offer", "make_offer_ctx", "ask_better", "ask_best", "halfway", "cash_lever", "use_flaw", "too_high", "ask_flex",
  "sleep_on_it", "accept_deal", "accept_ctx", "shake", "walk_away", "walk_rude", "lets_talk", "ask_price"];
const negOn = () => Object.fromEntries(NEG.map((i) => [i, (cc: Ctx, sl: any, sg: Segment) => { H[i](cc, sl, sg); return true; }]));

/** Maggie named a price: the learner offers, pushes, accepts or walks away. "Yes" accepts (at the asking
 *  price, after a check: "So… $9,000, no haggling?"). */
function pendPrice(c: Ctx, id = "price") {
  c.expect({ id, expects: NEG, on: negOn(),
    suggest: [S_OFFER, S_PUSH, ...flawSuggest(c), S_DECIDE], hints: ["offer", "push", ...flawSuggest(c).map((s) => s.hint!), "decide"],
    yes: (cc) => {
      if (cc.s.cur === ASK && !cc.s.conc && !cc.s.offered) { cc.say("confirm_full", P(cc)); pendConfirm(cc); return; }
      dealAt(cc, cc.s.cur);
    },
    no: (cc) => { cc.say("need_offer"); pendOffer(cc); },
    ask: (cc) => cc.say("price_reask", P(cc)) });
}
/** "Your turn. Make me an offer." */
function pendOffer(c: Ctx) {
  c.expect({ id: "offer", expects: NEG, on: negOn(), suggest: [S_OFFER, S_PUSH, ...flawSuggest(c)], hints: ["offer", "push"],
    ask: (cc) => cc.say("need_offer") });
}
/** Her best (or last) price: the learner decides. "No" is a polite refusal (her last chance comes once). */
function pendFinal(c: Ctx, id = "final") {
  c.expect({ id, expects: NEG, on: negOn(), suggest: [S_DECIDE, S_PUSH, ...flawSuggest(c)], hints: ["decide", "push"],
    yes: (cc) => dealAt(cc, cc.s.cur),
    no: (cc) => walkAway(cc, false),
    ask: (cc) => (cc.chance(0.5) ? cc.say("final_reask") : cc.say("final_reask_p", P(cc))) });
}
/** "So… $9,000, no haggling?" */
function pendConfirm(c: Ctx) {
  c.expect({ id: "confirm", expects: NEG, on: negOn(), suggest: [S_DECIDE, S_OFFER], hints: ["decide", "offer"],
    yes: (cc) => dealAt(cc, cc.s.cur),
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
/** The learner skipped saying why they came (a question or a price first): Maggie introduces herself. */
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

/** The AC fault (twist): Maggie owns up. */
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
  // "Maybe later." / "Not now.": no "Brave!"
  c.say(/\b(later|not now|not yet|another time)\b/i.test(c.heard) ? "drive_later" : "drive_decline");
}

/** After the drive: "So? What do you think?" answered. The AC twist comes now if it hasn't yet. */
function afterOpinion(c: Ctx) {
  if (!flawPending(c)) return;
  fireFlaw(c);
  c.say("flaw_disclose"); c.say("flaw_sky");
  expectFlawReaction(c);
}
function expectFlawReaction(c: Ctx) {
  c.expect({ id: "flaw", optional: true, expects: ["flaw_ok_ctx", "flaw_bad_ctx", "use_flaw"],
    suggest: [{ lt: "Sureaguoti į trūkumą (arba juo pasinaudoti)", hint: "flaw_ac" }, S_TALK], hints: ["flaw_ac", "talk"],
    on: { flaw_ok_ctx: (cc) => { cc.say("glad_attitude"); }, flaw_bad_ctx: (cc) => { cc.say("flaw_fair"); },
      g_dontknow: (cc) => { cc.say("g_take_time"); expectFlawReaction(cc); } },
    yes: (cc) => { cc.say("glad_attitude"); }, no: (cc) => { cc.say("flaw_fair"); } });
}

// ---------------------------------------------------------------------------
// The price talk

/** The first money move of the conversation (the learner's or Maggie's): honest Maggie mentions the AC
 *  fault (twist) before any number. */
function startTalk(c: Ctx) {
  ensureArrived(c);
  if (c.s.talked) return;
  c.s.talked = true;
  if (flawPending(c)) { fireFlaw(c); c.say("flaw_before"); c.say("flaw_sky"); }
}

/** The learner asked for the price ("How much?", "Let's talk."): the price, then (if she hasn't asked
 *  yet) "Would you like to drive her first?" */
function tellPrice(c: Ctx) {
  const first = !c.s.talked;
  startTalk(c);
  if (c.s.cur === ASK) c.say("talk_ask"); else c.say("price_now", P(c));
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

/** Maggie comes down to `to` with one of her lines; her second concession brings the rival's text (twist). */
function concede(c: Ctx, to: number, line: string, vars: Record<string, any> = {}) {
  c.s.conc++;
  c.s.cur = to;
  c.say(line, { ...P(c), ...vars });
  // the question right after the rival's text has its own id ("rival"), so the picture can show her phone
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
/** "$7,750. That's the best I can do. And I'll throw in…" */
function bestFinal(c: Ctx) {
  c.s.conc++;
  c.s.cur = FINAL(c);
  c.s.finalMade = true;
  c.say("best_final", P(c));
  throwIn(c);
  pendFinal(c, rival(c) ? "rival" : "final");
}
/** Her floor, at once ("Okay. $7,500, and she's yours today."): the loop guard and "Don't you dare!". */
function finalNow(c: Ctx) {
  c.s.cur = FLOOR(c);
  c.s.finalMade = true;
  c.say("final_now", P(c));
  throwIn(c);
  pendFinal(c);
}
/** "Wait! I was thinking more along the lines of $7,500… I'll throw in… If you don't make me wait." */
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
function offer(c: Ctx, q: number, cash: boolean, blunt = false) {
  startTalk(c);
  // "I give you seven thousand." as the very first move
  if (blunt && !c.s.moves) c.say("rude_generic");
  c.s.offered = true;
  c.s.moves++;
  if (cash) cashLever(c, true);
  if (q < 5000) { c.say("lowball"); c.say("lowball2"); c.tip(TIPS.lowball); c.s.finalMade ? pendFinal(c) : pendPrice(c); guard(c); return; }
  if (c.s.lastQ && q < c.s.lastQ) { c.say("backwards"); c.s.finalMade ? pendFinal(c) : pendPrice(c); guard(c); return; }
  c.s.lastQ = q;
  const cur = c.s.cur as number;
  if (q > cur) { c.say("over_pay", P(c)); dealAt(c, cur, false); return; }
  if (q === cur) { dealAt(c, cur); return; }
  if (q >= FLOOR(c) && (q >= cur - 250 || c.s.conc >= 3)) { dealAt(c, q); return; }
  const nx = c.s.finalMade ? null : nextRung(c);
  if (nx !== null && nx > q) {
    if (nx <= FINAL(c)) bestFinal(c);
    else if (echoable(q) && c.chance(0.45)) concede(c, nx, "counter_echo", { q: usd(q) });
    else concede(c, nx, "counter");
    guard(c);
    return;
  }
  if (nx !== null) { dealAt(c, q); return; }
  firm(c);
  guard(c);
}

/** A deal at `price`. `line`: Maggie's agreement line ("Sold!", or the full-price wink). */
function dealAt(c: Ctx, price: number, line = true) {
  if (c.s.outcome) return;
  c.s.outcome = "deal";
  c.s.dealPrice = price;
  c.s.cur = price;
  if (line) {
    if (price === ASK && !c.s.conc && !c.s.offered) c.say("deal_full", P(c));
    // (no echo of the learner's own "That works for me")
    else c.say(/works for me/i.test(c.heard) || c.chance(0.6) ? "deal_sold" : "deal_yes");
  }
  if (turnSegments(c).some((s) => s.intent === "shake")) { c.s.shaken = true; c.event("handshake"); return; }
  c.say("shake_on_it");
  c.expect({ id: "shake", optional: true, expects: ["shake", "accept_deal", "accept_ctx"], suggest: [{ lt: "Paspausti rankas", hint: "shake" }], hints: ["shake"],
    on: { shake: (cc) => { shakeHands(cc); }, accept_deal: (cc) => { shakeHands(cc); }, accept_ctx: (cc) => { shakeHands(cc); }, g_ok: (cc) => { shakeHands(cc); }, g_thanks: (cc) => { shakeHands(cc); } },
    yes: (cc) => shakeHands(cc), no: (cc) => shakeHands(cc) });
}
function shakeHands(c: Ctx) {
  if (c.s.shaken) return;
  c.s.shaken = true;
  c.event("handshake");
}

/** Cash: $250 off once (never below her floor). `silent`: part of an offer ("seven, cash"). */
function cashLever(c: Ctx, silent: boolean) {
  c.s.cash = true;
  if (!silent) startTalk(c);
  if (c.s.cashUsed) { if (!silent) { c.say("cash_ack"); pendNow(c); } return; }
  c.s.cashUsed = true;
  c.say("cash_ack");
  if (c.s.cur > FLOOR(c)) {
    c.s.cur = Math.max(FLOOR(c), c.s.cur - 250);
    if (!silent) c.say("new_price", P(c));
  }
  if (!silent) pendNow(c);
}
const pendNow = (c: Ctx) => (c.s.finalMade ? pendFinal(c) : pendPrice(c));

const AC_WORDS = /\b(ac|a c|air ?con\w*)\b/i;
/** "But the AC doesn't work, so…": $250 off every price, once (only with a known fault). */
function useFlaw(c: Ctx) {
  if (c.s.outcome) { c.say("ack"); return; }
  const ac = AC_WORDS.test(c.heard);
  if (ac && flawPending(c)) { ensureArrived(c); fireFlaw(c); c.say("a_problems_flaw"); if (c.s.talked) pendNow(c); return; }
  if (!c.s.flawKnown && !c.s.complained) { c.say(ac ? "ac_fine" : "no_fault"); if (c.s.talked) pendNow(c); return; }
  if (c.s.flawUsed) { c.say("already_off"); if (c.s.talked) pendNow(c); return; }
  if (!once(c, "flaw")) return;
  startTalk(c);
  c.s.flawUsed = true;
  c.s.off = 250;
  c.s.moves++;
  c.s.cur -= 250;
  c.say("flaw_point");
  // with an offer in the same sentence, the offer answers ("…so would you take seven?")
  if (turnSegments(c).some((s) => s.intent === "make_offer" || s.intent === "make_offer_ctx")) return;
  c.say("new_price", P(c));
  pendNow(c);
}

/** After the deal, a price move gets "We said $8,000, remember?" (after a refusal, just "Okay."). */
function afterDeal(c: Ctx) {
  if (c.s.outcome !== "deal") { c.say("ack"); return; }
  if (c.s.dealPrice % 250 === 0) c.say("deal_price", { p: usd(c.s.dealPrice) }); else c.say("deal_done");
}

/** A polite (or blunt) no. Her last chance comes once ("Wait! …"); then the conversation ends. */
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

function paid(c: Ctx, line: string, method: string) {
  if (c.s.paid) { c.say("ack"); return; }
  c.s.paid = true;
  c.s.payMethod = method;
  c.say(line);
  c.event("pay", { method });
}
/** Leaving after the deal (or after a refusal): her last words, once. */
function closeBye(c: Ctx) {
  if (!once(c, "closed")) return;
  c.say(c.s.outcome === "deal" ? "bye_deal" : "see_around");
  c.end();
}

// Automatic answers the simulations use for Maggie's optional questions.
const AUTO: Record<string, string> = {
  arrive: "Hi! I'm here about the car.", look: "No, that's all, thanks.", drive: "No, thanks. I trust you.",
  drive_q: "No, thanks. I trust you.", opinion: "It drives really nicely.", flaw: "That's okay.",
  talk: "Okay… let's talk.", haggle: "I was thinking more along the lines of seven.", offer: "Would you consider seven thousand?",
  price: "That works for me.", final: "That works for me.", confirm: "Yes.", shake: "Let's shake on it.",
  pay: "I'll pay cash.", howareyou: "Good, thanks. And you?",
};

const TIPS: Record<string, Tip> = {
  blunt_expensive: { key: "blunt_expensive", lt: "Suprasta! „Too expensive“ derybose skamba gana tiesmukai – pardavėjas gali įsižeisti. Mandagiau pasakyti, kad tai daugiau, nei tikėjaisi išleisti.", better: "That's a bit more than I was hoping to spend." },
  blunt_no: { key: "blunt_no", lt: "Suprasta! Amerikoje net atsisakant derybose išlaikomas mandagus tonas. Su „I'm afraid…“ ir padėka už laiką durys lieka atviros.", better: "I'm afraid that's still more than I can spend. Thanks for your time." },
  i_give_you: { key: "i_give_you", lt: "Suprasta! Tai lietuviško „duodu“ vertinys. Angliškai kainą siūlome su „can“ arba „I'll“, o dar švelniau – „I was thinking more along the lines of…“.", better: "I can offer you seven thousand." },
  make_discount: { key: "make_discount", lt: "Suprasta! Angliškai nuolaidos nedaro („make“), o duoda („give“). Iš privataus pardavėjo dar natūraliau paklausti, ar galima derėtis.", better: "Is there any flexibility on the price?" },
  last_price: { key: "last_price", lt: "Suprasta! „Paskutinė kaina“ – mūsų turgaus posakis. Angliškai klausiama apie geriausią kainą arba pasiūlymą.", better: "What's your best price?" },
  lowball: { key: "lowball", lt: "Suprasta! Tokia kaina gali įžeisti pardavėją – derybos baigiasi, dar neprasidėjusios. Siūlyk realiai ir leiskis palaipsniui.", better: "Would you consider seven thousand?" },
  rude_car: { key: "rude_car", lt: "Suprasta! Peikti daiktą, kurį žmogus myli, – blogas derybų būdas. Geriau pripažinti privalumus ir švelniai priminti trūkumus.", better: "It's a lovely car, but it's not new." },
  ill_take: { key: "ill_take", lt: "Suprasta! Kai sprendimą priimi dabar, sakoma „I'll take it“ (su „'ll“). Esamasis laikas („I take it“) čia skamba keistai.", better: "I'll take it!" },
  us_miles: { key: "us_miles", lt: "Suprasta! Amerikoje rida skaičiuojama myliomis, o sąnaudos – myliomis iš galono („miles per gallon“).", better: "How many miles does it have?" },
  uk_petrol: { key: "uk_petrol", lt: "Suprasta! „Petrol“ – britiškas žodis. Amerikoje degalai – „gas“.", better: "How much gas does it use?" },
  uk_bonnet: { key: "uk_bonnet", lt: "Suprasta! Amerikoje variklio dangtis – „hood“ („bonnet“ – britiškas žodis).", better: "Can I look under the hood?" },
  uk_boot: { key: "uk_boot", lt: "Suprasta! Amerikoje bagažinė – „trunk“ („boot“ – britiškas žodis).", better: "How big is the trunk?" },
};

// ---------------------------------------------------------------------------
// Handlers (shared with the pending questions)

const H: Record<string, Handler> = {
  // --- arriving ---
  about_ad(c) { if (arrive(c)) c.say("maggie_name"); },
  my_name(c) { H.im_name_ctx(c, {}, { intent: "im_name_ctx", slots: {}, tags: [] }); },
  vocative(c) {
    if (/^\s*(hi|hello|hey|good (morning|afternoon|evening))\b/i.test(c.heard) && once(c, "hello") && !c.s.__greetedBack) { c.s.__greetedBack = true; c.say("g_hello"); }
  },
  im_name_ctx(c) {
    if (c.s.named) return;
    c.s.named = true;
    c.say("nice_name");
    if (arrive(c)) c.say("maggie_name");
  },
  compliment_car(c) {
    // after the drive, praise answers "What do you think?"
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
    // after the disclosure, "What about the AC?" during the price talk is a lever
    if (c.s.flawKnown && c.s.talked && !c.s.flawUsed && !c.s.outcome) { useFlaw(c); return; }
    if (flawPending(c)) fireFlaw(c);
    answer(c, "ac", c.s.flawKnown ? "a_problems_flaw" : "ac_fine");
  },
  q_engine(c) { answer(c, "engine", "a_engine"); },
  q_gearbox(c) { answer(c, "gearbox", "a_gearbox"); },
  q_fuel(c) { answer(c, "fuel", "a_fuel"); },
  q_trunk(c) { answer(c, "trunk", "a_trunk"); },
  q_top(c) { answer(c, "top", "a_top"); },
  q_radio(c) { answer(c, "radio", "a_radio"); },
  q_tires(c) { answer(c, "tires", "a_tires"); },
  q_seats(c) { answer(c, "seats", "a_seats"); },
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
    // (a price the learner named, like $7,800, has no recording: no number then)
    if (c.s.outcome === "deal") { afterDeal(c); return; }
    if (c.s.outcome) { c.say("price_now", P(c)); return; }
    tellPrice(c);
  },
  ask_flex(c, _slots, seg) { flex(c, seg, "ask_flex"); },
  too_high(c, _slots, seg) { flex(c, seg, "too_high"); },
  make_offer(c, slots, seg) {
    if (!mainMove(c, seg.intent)) return;
    if (c.s.outcome) { afterDeal(c); return; }
    // "Eight and a half? Hmm. How about eight?": the last number counts
    const offers = turnSegments(c).filter((s) => (s.intent === "make_offer" || s.intent === "make_offer_ctx") && typeof s.slots.usd === "number");
    const last = offers.at(-1) ?? seg;
    const q = (last.slots.usd ?? slots.usd) as number;
    // "Eight and a half?" (her own price, or more, as a question): an echo, not a yes
    if (offers.length <= 1 && /\?\s*$/.test(c.heard) && c.s.talked && q >= c.s.cur && seg.intent === "make_offer_ctx") {
      c.say("price_reask", P(c)); pendNow(c); return;
    }
    offer(c, q, offers.some((s) => s.tags.includes("cash")) || seg.tags.includes("cash"), last.tags.includes("tip:i_give_you"));
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
    // "Is that your best offer?" – "Almost. For you: …"; "What's your best price?" – "For you? …"
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
    const mid = r250((c.s.lastQ + c.s.cur) / 2);
    if (mid >= FLOOR(c)) { c.say("halfway_yes", { p: usd(mid) }); c.say("halfway_yes2"); dealAt(c, mid, false); return; }
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
    // "I can pay cash. Would you take seven?": the offer takes the cash into account
    if (turnSegments(c).some((s) => s.intent === "make_offer" || s.intent === "make_offer_ctx")) { c.s.cash = true; return; }
    cashLever(c, false);
  },
  use_flaw(c) { useFlaw(c); },
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
    if (!mainMove(c, seg.intent) || c.s.outcome) return;
    // "I want to buy it!" as the first words: the price first; later, "I'll take it!" before any haggling is
    // a full-price deal (the ad said $9,000)
    if (!c.s.arrived) { tellPrice(c); return; }
    startTalk(c);
    dealAt(c, c.s.cur);
  },
  accept_ctx(c, slots, seg) {
    // "That's fine." to the asking price nobody has haggled over: "So… $9,000, no haggling?"
    if (c.s.talked && !c.s.outcome && c.s.cur === ASK && !c.s.conc && !c.s.offered && c.step !== "confirm") {
      if (!mainMove(c, seg.intent)) return;
      c.say("confirm_full", P(c)); pendConfirm(c); return;
    }
    H.accept_deal(c, slots, seg);
  },
  shake(c) {
    if (c.s.outcome === "deal") { shakeHands(c); return; }
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
    paid(c, "pay_check_r", "check");
  },
  no_cash(c) {
    c.s.cash = false;
    if (c.s.outcome === "deal" && !c.s.paid) { c.say("pay_options"); c.s.payAsked = "how"; c.hold(); return; }
    c.say("ack");
  },
  pay_card(c) {
    c.say("pay_card_no");
    if (c.s.outcome === "deal" && !c.s.paid) { c.say("pay_options"); c.hold(); }
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
  // "I don't know." during the price talk: time to think (the suggestions show what to say); otherwise the
  // current step's help, as everywhere
  g_dontknow(c) {
    if (c.s.talked && !c.s.outcome) { c.say("g_take_time"); c.hold(); return; }
    const st = usedCar.steps.find((x) => x.id === c.step);
    if (st?.help) st.help(c); else c.say("g_take_time");
    c.hold();
  },
  g_ok(c) {
    // "Okay." after a question answered, or "Great!" after the drive
    if (c.step === "opinion" && c.s.drove && !c.s.opinion) H.drive_good(c, {}, { intent: "drive_good", slots: {}, tags: [] });
  },
};

/** "Is there any flexibility?" / "That's a bit much.": her first step down, else "What did you have in mind?" */
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
/** "Can you do any better?": one step down (or her best); asked again, "Your turn." */
function better(c: Ctx) {
  if (c.s.finalMade) { firm(c); return; }
  if (c.s.cur === ASK) { flexYes(c); return; }
  // asked again: "Your turn." (unless the loop guard names her floor now)
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
  title: { en: "What If We Met Halfway?", lt: "O gal susitinkam pusiaukelėje?" },
  topic: { en: "Haggling over a used car", lt: "Derybos dėl naudoto automobilio" },
  chapter: 8,
  order: 1,
  location: "cedar-lane",
  npc: "maggie",
  goal: "Apžiūrėk kabrioletą ir išsiderėk gerą kainą – arba mandagiai atsisakyk.",
  intro: "Šeštadienį internete pamatei skelbimą: vyšninės spalvos 1998-ųjų kabrioletas, 9 000 dolerių. Dabar stovi Cedar gatvėje, Megės Holt kieme, o automobilis spindi saulėje. Apžiūrėk jį, išbandyk ir pabandyk numušti kainą – bet mandagiai: Megė savo mašiną myli.",

  grammar: {
    macros: {
      car: "(it | her | she | the car | the convertible | this car | your car | this convertible | the red car | this beauty | the vehicle | the cabrio | the cabriolet)",
      // "the red convertible", "your car", "this cabrio"
      the_car: "(the | your | this) [red | cherry red | old | beautiful | little] (car | convertible | cabrio | cabriolet)",
      ad: "(ad | listing | advertisement | advert | post | sign | ad online | online ad)",
      money: "[about | around | maybe | like | say | roughly | just | only] {usd} [dollars | bucks] [in cash #cash | cash #cash]",
      num: "{usd} [dollars | bucks]",
      flex: "(flexibility | wiggle room | room for negotiation | room to negotiate | room to move | room)",
      ac: "(air conditioning | air conditioner | ac | a c | air con | aircon)",
      hoping: [
        "i was hoping to (spend | pay)", "i (wanted | planned | expected | was planning | was going) to (spend | pay)", "i can (spend | pay | afford)",
        "i (have | had) in mind", "my budget (is | was | allows)",
      ],
      bit: "(a bit | a little | a little bit | slightly | kind of | a tad)",
    },
    slots: { usd: { fn: usdSlot } },
  },

  intents: {
    // --- arriving -------------------------------------------------------------------------
    about_ad: { patterns: [
      "i saw your @ad [on saturday | online | yesterday | in the paper | on the internet | on facebook] #h:saw_ad",
      "i saw the @ad [on saturday | online | yesterday | in the paper | on the internet | on facebook]", "[yes] that is me",
      "i (read | found) (your | the) @ad", "i am the (person | one | guy | lady | woman | man) who called [you]",
      "(the | your) (car | convertible) is still (for sale | for sell | available)", "is the (car | convertible) still for sell",
      "i am here because of (the | your) (car | convertible | @ad)", "(can | could | may) i (have | take) a look [at (the | your) (car | convertible | her | it)]",
      "i saw (the | your) @ad (for | about) (the | your | this) (car | convertible) [on saturday | online | yesterday | on the internet]",
      "i am here (about | for) (the | your | this) (car | convertible | @ad) [you are selling | for sale] #h:about_ad",
      "i am here (about | for) @the_car [you are selling | for sale]", "i am here to (see | look at | check out) @the_car",
      "i came (about | for) (the | your) (car | convertible | @ad)", "i came to (see | look at | check out) (the | your | this) (car | convertible)",
      "is the (car | convertible) still (for sale | available) #h:still_for_sale", "is (it | she | this car | your car | this convertible | @the_car) still (for sale | available)",
      "are you [still] selling (the | your | this) (car | convertible)", "is this the (car | convertible) (for sale | from the @ad | you are selling)",
      "i saw (the | your) (car | convertible) (online | in the @ad | on the internet)",
      "i (called | texted | wrote | messaged | emailed) [you] about the (car | @ad | convertible)",
      "i am [very | really] interested in (the | your | this) (car | convertible)", "i am [very | really] interested",
      "i (would like | want) to (see | look at | check out) (the | your | this) (car | convertible)", "(can | could | may) i (see | look at) (the | your) (car | convertible)",
      "(we spoke | we talked | i called you) on the phone [yesterday | today | this morning]", "i have an appointment to see the car",
      "(are you | you must be) [the] (seller | owner) [of the (car | convertible)]", "(are you | you must be) maggie [holt]",
      "i am looking for a [used | good | cheap] (car | convertible) [and i saw your @ad]",
      "(about | for) the (car | @ad | convertible)", "[yes] the (car | convertible) [in the @ad]",
    ] },
    my_name: { patterns: ["my name is {name} #h:my_name"] },
    // "Hello, Maggie!": her name, not the learner's
    vocative: { patterns: ["maggie [holt]", "(missus | miss) holt"] },
    im_name_ctx: { patterns: ["i am {name} #h:im_name", "it is {name}", "[you can] call me {name}", "i am {name} by the way", "by the way i am {name}"] },
    compliment_car: { patterns: [
      "the seats look great #h:seats",
      "the (seats | color | colour | paint | interior | wheels | top | car | convertible) (look | looks) (great | good | nice | amazing | new | perfect | beautiful | fantastic | wonderful | lovely)",
      "(she | it) is a (beauty | real beauty | classic | gem | real gem) #h:beauty",
      "(she | it | the car | this car | your car) is (beautiful | gorgeous | lovely | amazing | stunning | great | perfect | fantastic | wonderful | awesome | so beautiful | really beautiful | very beautiful | very nice | really nice | so nice | in great shape)",
      "what a (beauty | beautiful car | car | color | lovely car | great car | gorgeous car | nice car | classic)",
      "(nice | beautiful | great | lovely | cool | amazing | gorgeous) (car | convertible | color)",
      "i [really] (love | like) (the | this | that | your) (color | car | red | convertible | seats) [very much | a lot | so much]",
      "[it is | she is] [a] [very | really | so] (good | great | nice | beautiful | lovely | fantastic) car",
      "(she | it) looks (great | good | nice | amazing | new | like new | beautiful) [for (her | its) age]",
      "(it | she) is in (great | good | very good | excellent | perfect) (shape | condition)",
      "the color is (amazing | beautiful | great | gorgeous)", "the (seats | car | ride) (is | are) [very | really | so] comfortable", "(wow | oh wow) [what a beauty | she is beautiful | nice car]", "cherry red [is my favorite color]",
    ] },

    // --- questions about the car -------------------------------------------------------------
    q_mileage: { patterns: [
      "how many miles (does | has) @car (have | got | done) #h:q_miles", "how many miles (are | is) on @car", "how many miles",
      "how much miles [(does | has) @car (have | got | done)]",
      "what is the mileage [on @car]", "what mileage (does | has) @car [have | got]", "how (high | much) is the mileage", "is the mileage (high | low)",
      "what does the odometer (say | show | read)", "(has | does) (it | she) (have | done | got) a lot of miles", "how far has (it | she) (gone | been driven)", "(what about | and) the mileage",
      "how (many | much) (kilometers | kilometres | km) (does | has) @car (have | done | got) #tip:us_miles", "how (many | much) (kilometers | kilometres | km) [are on it] #tip:us_miles",
      "what is the mileage in (kilometers | kilometres | km) #tip:us_miles",
    ] },
    q_year: { patterns: [
      "what year is @car", "how old is @car", "is (it | she) [an] old car", "when was (it | she | the car) (made | built)", "is (it | she) a (ninety eight | 98 | 1998)",
      "what model year is (it | she)", "(what | which) year (was | is) (it | she) (made | built)", "is (it | she) (really | actually) from (ninety eight | 1998)",
    ] },
    q_owners: { patterns: [
      "how many owners (has | did) (it | she) (had | have)", "how many [previous] owners [has (it | she) had]", "are you the (first | only | original) owner",
      "who owned (it | her) before [you]", "who was the owner before [you]", "how many people (owned | have owned) (it | her)",
    ] },
    q_accident: { patterns: [
      "has @car ever been in an accident #h:q_accident", "has @car (been in | had) (an accident | any accidents | a crash)",
      "(were there | are there | any) accidents", "was @car ever in an accident", "(it | she) was [ever] in (an accident | a crash)", "was (it | she) ever (crashed | damaged | hit | in a crash)", "was (it | she) in (an accident | accidents | a crash)",
      "is there any (damage | rust)", "(does | has) @car (have | got | have got) any (rust | damage | scratches | dents)", "did (it | she) have any accidents",
    ] },
    q_owned: { patterns: [
      "how long have you (had | owned) @car", "when did you buy (it | her)", "since when (do | have) you (have | had) (it | her)", "how long (is | has) (it | she) been yours",
    ] },
    q_paint: { patterns: ["is the paint original", "(has | was) (it | she) [ever] [been] repainted", "(what about | and) the paint"] },
    q_hood: { patterns: [
      "(can | could | may) i (look | have a look | take a look) under the (hood | bonnet #tip:uk_bonnet)", "(can | could) you (open | pop) the (hood | bonnet #tip:uk_bonnet)",
      "(can | could | may) i see the engine",
    ] },
    q_why: { patterns: [
      "why are you selling [@car] #h:q_why", "why do you want to sell @car", "(why | how come) (sell | are you selling | you are selling) [such a] [beautiful | lovely | nice | great] (car | beauty | convertible)",
      "how come you are selling @car", "why (sell | selling) [it | her]", "why do you sell (it | her)", "why do you want to sell [such a] [beautiful | lovely | nice | great] (car | beauty | convertible)",
    ] },
    q_service: { patterns: [
      "do you have the (service | maintenance) (records | history | papers | book) #h:q_service",
      "do you have [the | all the] (papers | documents | records) (for | of) [the | this] car", "has @car been (serviced | maintained) [regularly]",
      "when was the last (service | oil change)", "do you have (the | all the) (papers | documents | records | title)", "is there a service (history | record)",
      "(was | is) (it | she) (serviced | maintained) regularly", "(any | what about) (service | maintenance) records", "is the title clean",
      "(can | could | may) i see the (service | maintenance) (records | history | book | papers)",
    ] },
    q_problems: { patterns: [
      "does @car have any problems #h:q_problems", "are there any (problems | issues) [i should know about]", "is there anything wrong with @car",
      "(any | are there any) (problems | issues) [with (it | her | the car)]", "(it | she) has [any] (problems | issues)", "what is wrong with (it | her)", "is there (anything | something) wrong with @car", "does everything work", "is everything (okay | working | fine) [with (it | her)]",
      "does @car need any (repairs | work)", "[is there] anything i should know [about]", "(any | does it have any) (mechanical | engine) (problems | issues)",
      "what are the (problems | issues)", "is (it | she) reliable", "does (it | she) (burn | leak | use) oil",
      "(has | did) @car [ever] (had | have | need | needed) any [major | big] repairs",
    ] },
    q_ac: { patterns: [
      "does the @ac work", "does @car have [an] @ac", "is the @ac (working | okay | good)", "(what about | and) the @ac", "how is the @ac",
      "does the @ac (blow | get) cold",
    ] },
    q_engine: { patterns: [
      "how is the engine", "(what about | and) the engine", "is the engine (okay | good | fine | in good shape)", "how (does | is) the engine (run | sound | running)",
      "does the engine run (well | fine | okay)", "(can | could | may) i (start | hear) the engine",
    ] },
    q_gearbox: { patterns: [
      "is (it | she) (automatic | manual | a manual | an automatic | stick | a stick shift | stick shift)", "is (it | she) (automatic | an automatic) or (manual | a manual | stick)",
      "is (it | she) (manual | a manual) or (automatic | an automatic)", "what (transmission | gearbox) (does | has) @car [have | got]", "(automatic | manual) or (automatic | manual)",
      "is the (gearbox | transmission) (automatic | manual)",
    ] },
    q_fuel: { patterns: [
      "how much gas does @car (use | take | need) #h:q_fuel", "what is the (gas mileage | fuel economy | mpg | fuel consumption)", "how many miles per gallon [does (it | she) get]",
      "is (it | she) (good | bad | okay) on gas", "how much fuel does @car (use | take | need)", "(does | is) (it | she) (use | uses) a lot of (gas | fuel)",
      "how much petrol does @car use #tip:uk_petrol", "how much petrol #tip:uk_petrol", "how many (liters | litres) [per hundred (kilometers | km)] #tip:us_miles",
      "what about (gas | fuel) [consumption | mileage]", "how is the (gas mileage | fuel economy | mpg | fuel consumption)",
    ] },
    q_trunk: { patterns: [
      "how big is the trunk", "is there a (trunk | lot of space)", "how big is the boot #tip:uk_boot", "how much (space | room) is there [in the (trunk | back)]",
      "how much (space | room) is there in the boot #tip:uk_boot", "is there (much | enough | a lot of) (space | room) [in the (trunk | back)]", "is the trunk (big | small)", "(what about | and) the trunk", "does (it | she) have a [big] trunk",
    ] },
    q_top: { patterns: [
      "does the (top | roof) work", "how does the (top | roof) (work | go down | open)", "(can | could) (you | i) (put | take) the (top | roof) down",
      "does the (top | roof) go down", "(can | could) you show me the (top | roof)", "is the (top | roof) (electric | automatic | manual)",
      "does (it | the top | the roof) leak", "(what about | and) the (top | roof)", "how do (i | you) (open | put down) the (top | roof)",
    ] },
    q_radio: { patterns: ["does the radio work", "is the radio (working | okay | good)", "(what about | and) the radio", "does (it | she) have a radio"] },
    q_tires: { patterns: [
      "are the (tires | tyres) (new | good | okay | in good shape | old)", "how (old | good) are the (tires | tyres)", "when were the (tires | tyres) (changed | replaced)",
      "(what about | and) the (tires | tyres)", "do the (tires | tyres) need (changing | replacing)",
    ] },
    q_seats: { patterns: ["are the seats original", "are (they | these) the original seats", "(what about | and) the seats", "are the seats [real] leather",
      "(can | could | may) i (see | sit) inside", "(can | could | may) i sit in (it | her)"] },
    q_unknown: { patterns: [
      "(does (it | she) have | is there | what about | how about | and) [a | an | the] {w:any}", "does the {w:any} work", "is the {w:any} (okay | good | working | original | new)",
      "how is the {w:any}",
    ] },
    no_more_q: { patterns: [
      "(that is | i think that is) (all | it | everything) [for now]", "[no] (nothing | no more questions) [else]", "i have no more questions", "no questions",
      "[no] i think i (have seen | know) enough", "[no] i do not have any [more | other] questions",
    ] },

    // --- the test drive ------------------------------------------------------------------------
    test_drive: { patterns: [
      "(can | could | may) i take @car (around | round) the block #h:round_block", "(can | could | may) i test drive @car #h:test_drive",
      "(can | could | may) i drive @car [first] #h:drive_first", "(can | could | may) i (take | have | go for | do) a test drive [first]",
      "(can | could | may) i take @car for a (test drive | spin | drive | ride | test) [first]",
      "(do you | would you) mind if i (take | drive) @car [for a (spin | test drive)] [(around | round) the block]",
      "mind if i (take | drive) @car [for a spin] [(around | round) the block]", "(i would like | i want | i would love) to (test drive | drive | try) @car [first]",
      "let us (go for | take | do) a (test drive | drive | spin | ride)", "(can | could) we go for a (test drive | drive | ride | spin)",
      "(can | could) i try @car [out] [first]", "(can | could) i see how (it | she) drives", "[yes] a test drive [would be great]", "test drive",
      "(sure | yes) [i would love to] (take | drive) (her | it) (around | round) the block", "i will take (her | it) (around | round) the block",
      "let us go [for a (spin | drive | ride)]",
    ] },
    decline_drive: { patterns: [
      "[no] i trust you", "[no] (that is | it is) not necessary", "[no] i do not need (a test drive | to drive (it | her) | to test (it | her))",
      "[no] i do not (want | need) to drive (it | her)", "no test drive [is needed | needed]", "[no] (let us | we can) skip (it | the test drive)", "[no] i believe you",
      "i would rather not",
    ] },
    drive_good: { patterns: [
      "(it | she) drives (really | very | so) (nicely | well | smoothly | great) #h:drives_nicely",
      "(it | she) (drives | runs | rides | drove | ran) (like a dream | beautifully | perfectly | great | well | smoothly | like new | nicely | really well | very well | good | very good)",
      "i (like | love | liked | loved) how (it | she) drives",
      "(it | she) (is | was) (great | amazing | fun | wonderful | perfect | nice | lovely) [to drive]", "i (loved | love | liked | like) (it | her | driving (her | it) | the ride | the drive) [very much | a lot | so much]",
      "(the engine | the brakes | the steering) (sounds | sound | feels | feel | is | are | felt | was | were) (good | great | fine | okay | perfect | smooth)",
      "(that | it) was (fun | great | amazing | wonderful | so much fun | a lot of fun)", "(not bad | very nice | really nice | wonderful | awesome | fantastic | amazing)",
      "what a (ride | drive)", "i think (it | she) is in good shape", "she stole my heart", "yes she (did | stole my heart)", "(very | really | so) smooth",
    ] },
    drive_bad: { patterns: [
      "the brakes (feel | felt | are | seem | were) [@bit] (soft | weak | spongy) #h:brakes_soft",
      "(it | she | the engine) (is | was | sounds | sounded) [@bit] (noisy | loud | rough)",
      "(the steering | the gearbox | the clutch | the transmission) (feels | felt | is | was | seems) [@bit] (heavy | strange | weird | stiff | loose)",
      "i heard a [strange | weird] (noise | squeak | rattle)", "(it | she) (pulls | pulled) to the (left | right)",
      "(there is | i noticed) a [strange | weird] (smell | noise | problem | rattle)", "the (brakes | steering) (need | needs) [some] work",
      // lukewarm: no fault to use later
      "it is okay but not great #meh", "(it | she) (is | was) (okay | fine | all right) [i guess] #meh", "not great [to be honest] #meh", "it was not (great | amazing) #meh",
    ] },
    flaw_ok_ctx: { patterns: [
      "i do not need (air conditioning | the @ac | @ac)", "i (like | love) (fresh air | the wind)", "who needs (air conditioning | @ac)", "(it is | she is) a convertible",
      "(that is | it is) not a (problem | big deal)", "not a (problem | big deal)", "i can live with that", "do not worry [about it]",
    ] },
    flaw_bad_ctx: { patterns: [
      "(that is | it is) (a problem | not good | bad news | a shame | too bad)", "oh no", "that is not (great | good) [news]", "hmm that is a problem",
    ] },

    // --- the price talk -------------------------------------------------------------------------
    lets_talk: { patterns: [
      "let us talk #h:lets_talk", "let us talk (money | numbers | price | business | about (the | your) price | about money)", "let us discuss the price",
      "(can | could) we talk (about the price | money | numbers | price)", "(about | what about) the price", "let us (negotiate | haggle)",
      "i (want | would like) to talk about the price", "let us talk about it",
    ] },
    ask_price: { patterns: [
      "how much (do you want | are you asking) [for @car]", "how much is @car", "what is (the | your) [asking] price [for @car]",
      "what (are you asking | do you want) [for @car]", "how much [is it]", "how much (does | did) (it | she) cost", "is (it | the price) still (nine thousand | @num)",
      "the @ad said @num", "how much money (do you want | are you asking)", "what is your price now", "(and | so) how much",
    ] },
    ask_flex: { patterns: [
      "is there any @flex (on | in | with) the price [friend | my friend] #h:flex", "is there any @flex [on (it | that)]",
      "is the price (negotiable | flexible | fixed | firm)", "is (it | that | your price) (negotiable | flexible | firm | fixed)",
      "(are you | would you be) (flexible | open to negotiation | open to offers | willing to negotiate) [on the price]",
      "(can | could) we negotiate [@bit] [on the price | the price]", "(can | could | would) you come down [@bit] [on the price]",
      "(can | could) you lower the price [@bit]", "(can | could) you knock [@bit | something | a little] off [the price]",
      "(can | could | will) you give [me] [a] [small | little] discount", "(can | could) you give [me] [a] (lower | better) price", "you (can | could) give [me] [a] (lower | better) price", "(is there | any) (a | any) discount", "any chance of a [small | little] discount",
      "is there any room [on the price]", "how flexible are you [on the price]", "(do | would | will) you (take | accept) less", "can we make a deal",
      "(do you | would you) (take | accept) offers",
      "(can | could) you make (a | me a | some) discount #tip:make_discount", "make me a discount #tip:make_discount", "(can | could) you do a discount #tip:make_discount",
      "give me a (discount | better price | good price) #rude", "(lower | drop) the price #rude",
    ] },
    too_high: { patterns: [
      "[nine thousand | @num] that is a bit more than i was hoping to spend #h:more_than_hoping",
      "[nine thousand | @num] (that is | it is) [@bit | quite a bit | much | a lot] more than @hoping",
      "[nine thousand | @num] (that is | it is) @bit (much | high | steep | pricey | expensive) [for me] #h:bit_much",
      "(that is | it is) [@bit] (more than | over | above | out of) my budget", "(it | that | the price) is [@bit] (high | steep) [for a ninety eight | for an old car | for me]",
      "i (can not | can not really) (afford | pay | spend) (that | that much | @num) [right now]", "that is more than i (expected | thought | wanted to pay | can pay)",
      "i was hoping (for something | to pay) (lower | less | cheaper) [than that]", "i do not have (that | so) much [money]",
      "(i think | to be honest) [that] (it is | that is) [@bit] (high | much | overpriced)", "(wow | hmm) that is a lot [of money]", "that is a lot [of money] [for (me | an old car)]",
      "[nine thousand | @num] (wow | hmm | really)", "that is [@bit] out of my price range",
      "(nine thousand | nine grand | @num | it | that) is a lot [of money]", "(that is | it is) still (too | @bit) (high | much | steep)", "still too (much | high) [for me]",
      "(that is | it is) (too | so | really | very) expensive #tip:blunt_expensive", "(that is | it is) (too much | way too much) [money] [for me] #tip:blunt_expensive",
      "too (expensive | much) #tip:blunt_expensive", "(so | very) expensive #tip:blunt_expensive", "is too much money [for me] #tip:blunt_expensive",
      "(it | that) is (expensive | overpriced) #tip:blunt_expensive",
    ] },
    make_offer: { patterns: [
      "i was thinking [more] along the lines of @money #h:along_lines", "i was thinking [more] (of | about | around) @money", "i was thinking @money",
      "would you consider @money #h:consider", "would you (take | accept | do | go for) @money [for @car]", "(will | can | could) you (take | accept | do | go down to | come down to) @money",
      "(how about | what about) @money [instead | then]", "i can (offer | pay | do | give) [you] @money #h:can_offer", "i can (offer | pay | do | give) [you] @money [and | but] no more",
      "i (want | would like) to (pay | offer | give) [you] @money", "for @money i take (it | her) #tip:ill_take",
      "make it @money [and i [will] take (it | her) [today | now]]", "(can | could) you make [it] @money",
      "i (could | can only | could only) (offer | pay | do | go to | go up to | spend | afford) [you] @money", "i (would | will) (offer | pay | give) [you] @money [for @car]",
      "my (offer | best offer | budget | limit | max | maximum | final offer | last offer) is @money", "i (have | can spend | can afford | have got) [only] @money",
      "let us (say | do | make it) @money", "@money [and] (that is | it is) my (final | best | last) offer", "@money and that is it",
      "@money (would be | is) (fair | good | okay | fine | great | better | reasonable) [for me | for her]", "(is | would) @money (work | be okay | be possible | do | be enough) [for you]",
      "(does | would) @money work for you", "for @money i (will | would) take @car", "@money and i (will | can) take @car [today | now | right now]",
      "i can pay @money [in] cash [today | right now] #cash #h:cash_offer", "(what if | how about if) i (pay | paid | offer | offered | give | gave) [you] @money",
      "what if we (met | meet) halfway at @money", "(can | could) we meet (halfway | in the middle) at @money", "let us (meet | split the difference) at @money",
      "i will take (it | her) for @money", "i would (buy | take) (it | her) for @money", "i (can | could) buy (it | her) for @money", "@money for (it | her | the car)",
      "@money and (it is | we have | you have) a deal", "(can | could | would | will) you (do | sell) (it | her) for @money", "@money is my (limit | max | maximum | budget | best offer | final offer | last offer)",
      "(can | could) we (go | do | make it | settle) (to | at | on | for) @money", "(can | could) we (do | say) @money", "i will do @money", "@money it is",
      "i give you @money [for @car] #tip:i_give_you", "i (pay | buy) [it | her] [for] @money #tip:i_give_you", "i offer [you] @money #tip:i_give_you",
    ] },
    // a bare number ("Seven.", "$7,500?") only answers Maggie's price questions
    make_offer_ctx: { patterns: ["@money [then | instead | final | tops | max]", "(maybe | perhaps) @money", "@money (what do you (think | say) | how about that)"] },
    ask_better: { patterns: [
      "can you do any better #h:do_better", "(can | could) you do [any | @bit] better on the price #h:do_better_price", "(can | could) you do [any | @bit] better [than that]",
      "is that the best you can do", "(can | could) you go [any | @bit] lower", "(any | @bit) lower", "lower", "(can | could) you do something [about the price]",
      "come on [can you] (do better | go lower)", "is there any way [you could] (lower it | go lower | do better)",
      "what is the lowest you (will | would | can) (go | take | accept)", "how low can you go", "(can | could) you (come down | go down | drop it) [@bit] more",
      "(can | could) you make it (cheaper | lower | @bit cheaper)", "[come on] (a little | a bit) lower",
    ] },
    ask_best: { patterns: [
      "is that your best offer #h:best_offer", "is that your best price", "is that your (final | lowest | last) (offer | price)", "what is your best price #h:best_price #wh",
      "what is your (best | lowest | final | bottom) (price | offer | number) #wh", "what is your bottom line #wh", "is that (final | your final offer | the final price)",
      "is that the lowest you can go", "is that your last (offer | word)", "your best price #wh",
      "what is (your | the) last price #tip:last_price #wh", "last price #tip:last_price #wh", "what is the best you can (do | offer) #wh",
    ] },
    halfway: { patterns: [
      "what if we met halfway #h:halfway", "what if we (meet | met) (halfway | in the middle)", "(can | could | shall | should) we meet (halfway | in the middle)",
      "let us meet (halfway | in the middle)", "how about we meet (halfway | in the middle)", "(can | could) you meet me halfway", "(meet | meet me) halfway",
      "a little from you a little from me #h:little_from_you", "(let us | can we | shall we | why do not we | how about we) split the difference #h:split",
      "split the difference", "you come down a little and i (go | come) up a little", "let us both (give | move) a little", "somewhere in the middle",
      "halfway", "(let us | can we) (meet | go) (halfway | in the middle | fifty fifty)", "fifty fifty", "meet me in the middle", "half and half",
    ] },
    cash_lever: { patterns: [
      "i can pay [in] cash [today | right now | if that helps] #h:cash_offer", "i (will | would) pay [in] cash [today]", "(what if | how about if) i (pay | paid) [in] cash",
      "[in] cash [today | right now] [if that helps]", "(does | would) cash help", "i have (cash | the cash | the money) [with me | right here | here | today]",
      "i can pay [you] (today | right now | right away)", "(i will | i can) give you cash [today | right now]", "(how about | what if) i pay [in] cash",
      "(would | will) you take cash",
    ] },
    use_flaw: { patterns: [
      "[but] the @ac does not work [so] #h:ac_point", "[but] the @ac does not work so [can you | could you] (lower | come down on) the price",
      "fixing the @ac (will | is going to | would) cost [me] [a lot | money | a lot of money | @num] #h:ac_cost",
      "[but] the @ac is (broken | not working)", "i (will | would) have to (fix | repair) the @ac",
      "[but | and] the brakes (need | needs) [some] work [so] #h:brakes_work", "[but | and] the brakes (are | feel | felt) [@bit] (soft | weak) so",
      "(it | she) needs (some | a little) work [so]", "i will have to (fix | repair) (it | the brakes | the steering)",
      "(it | that) (will | is going to) cost me (money | a lot)",
    ] },
    sleep_on_it: { patterns: [
      "let me sleep on it [tonight] #h:sleep_on_it", "(can | could | may) i sleep on it [tonight]", "i (will | would like to | need to | want to) sleep on it",
      "let me think about it [tonight | overnight | a little]", "(i need | i want | i would like) (to think | some time to think | time to think) [about it] [first]",
      "i (will | must | have to) think about it", "i think about it", "i (must | have to | need to) ask my (wife | husband | partner | family)", "(can | could) i think about it [and call you] [tomorrow]", "i will (call | text) you [back] tomorrow",
      "give me (a day | some time | until tomorrow) [to think]", "i (need | have) to talk to my (wife | husband | partner | family) [first]",
      "i am not sure yet", "i need (some | more) time", "(can | could) i call you [back] tomorrow",
    ] },
    accept_deal: { patterns: [
      "[that | it] works for me #h:works_for_me", "(deal | it is a deal | you have a deal | we have a deal | you got a deal | you have got a deal | that is a deal) #h:deal",
      "i will take (it | her) #h:ill_take", "i will buy (it | her)", "i (would like | want) to buy (it | her | the car | the convertible | your car)",
      "i accept [your offer | your price]", "let us (make | shake on) a deal", "i take (it | her) #tip:ill_take",
    ] },
    // only while a price is on the table: "That's fine.", "Agreed.", "Sounds good."
    accept_ctx: { patterns: [
      "that is (fine | okay | great | good | fair | perfect | a fair price | a good price) [with me | for me]", "it is (fair | a fair price | a good price) [for me]",
      "i agree [to that | with that]",
      "(agreed | sold | done | sounds fair | fair enough)", "(that | it) sounds (good | fair | great | perfect | reasonable)", "sounds (good | fair | great)",
      "[yes] i (can | will) do that", "let us do it", "let us do (it | that) [at @num]", "i am happy with that", "fine by me", "i can live with that",
    ] },
    shake: { patterns: ["let us shake on it #h:shake", "let us shake [hands | on that]", "shake on it", "(here is | give me) (my | your) hand", "(we | i) will shake on it", "shake hands"] },
    walk_away: { patterns: [
      "i am afraid (that is | it is) still more than i can (spend | pay | afford) #h:afraid_more",
      "i am (afraid | sorry) [but] (that is | it is) [still] (more | too much | over my budget | out of my budget | more than i can (spend | pay | afford)) [for me]",
      "(it is | that is) just not in my budget #h:not_budget", "(it is | that is) not in my budget",
      "(thank you | thanks) for your time [anyway] #h:thanks_time", "thanks anyway",
      "i do not think (it is | this is) (for me | going to work | the car for me)", "i guess (it is | this is) not (for me | going to work)",
      "i (think | guess) i will (pass | keep looking | look around | leave it)", "i will (pass | keep looking | leave it)", "i am going to pass", "i (go | am going) [now | home]",
      "(maybe | perhaps) (another time | next time)", "it is not (for me | what i am looking for)", "i (have to | must | will) (say no | decline | pass)",
      "(sorry | unfortunately) i can not (buy | take) (it | her)", "i am not interested [anymore | any more]", "i will not take (it | her)",
      "(that | it) does not work for me", "i do not think (that | it) (works | will work) for me", "i (can not | really can not) [do (that | it)]",
    ] },
    walk_rude: { patterns: [
      "forget (it | about it) #tip:blunt_no", "no way #tip:blunt_no", "no deal #tip:blunt_no", "never mind #tip:blunt_no", "(you are | are you) crazy #tip:blunt_no",
      "(that is | it is) (crazy | ridiculous | insane | robbery) #tip:blunt_no", "(that is | it is) (a | a total) (joke | rip off | ripoff | scam) #tip:blunt_no",
      "i am leaving #tip:blunt_no", "(bye | goodbye) then #tip:blunt_no", "(you are | are you) (joking | kidding) [me] #tip:blunt_no",
      "keep (it | your car) #tip:blunt_no", "(what | seriously) no way #tip:blunt_no",
    ] },
    rude_car: { patterns: [
      "(it | she | the car | this car) is (old | junk | a wreck | rubbish | garbage | ugly | bad | very old | so old | too old | a piece of junk | trash) #tip:rude_car",
      "(it | this) is (an old | a bad | an ugly) car #tip:rude_car", "(old | junk | rubbish) car #tip:rude_car",
      "(it | she) is not worth (it | that | @num | nine thousand) #tip:rude_car", "nobody (will | would) pay (that | @num) for (it | this car | an old car) #tip:rude_car",
      "what a (piece of junk | wreck) #tip:rude_car", "it is just an old car #tip:rude_car",
    ] },

    // --- paying ---------------------------------------------------------------------------------
    pay_cash: { patterns: [
      "i will pay [in] cash #h:pay_cash_p", "(i would like to | i am going to | i would) pay [in] cash", "i pay [in] cash", "cash (is fine | is okay)", "(with | in) cash",
      "is cash (okay | fine | good)", "cash", "do you take cash", "i will pay you in cash", "[in] cash (like | as) i said",
    ] },
    pay_transfer: { patterns: [
      "(can | could | may) i pay by (bank transfer | wire transfer | transfer | wire) #h:pay_transfer", "(bank | wire) transfer [is fine | is okay]",
      "i (will | can) (transfer | wire | send) [you] the money", "by (bank | wire) transfer", "(zelle | venmo | paypal)", "(can | could) i (use | pay with) (zelle | venmo | paypal)",
      "i will do a (bank | wire) transfer", "i (can | will) (make | do) [a] [bank | wire] transfer", "(with | via) [a] [bank | wire] transfer", "(can | could) i (transfer | wire) (it | the money)",
      "(can | could) i (send | pay | transfer) [you] the money (by | via | with) [a] [bank | wire] transfer",
    ] },
    pay_check: { patterns: [
      "is a cashiers check (okay | fine | good) #h:pay_check", "[a | by] (cashiers | certified | bank) check [is (fine | okay)]",
      "(can | could) i pay (with | by) [a] [cashiers | certified | bank] (check | cheque)", "(i will | i can) pay (with | by) [a] [cashiers | bank | certified] check",
      "(by | with) [a] (check | cheque)",
    ] },
    // "I don't have cash": never the cash lever
    no_cash: { patterns: ["(i | we) do not have [any | enough] cash [with me | on me]", "no cash", "i can not pay (in | with) cash", "i have no cash"] },
    pay_card: { patterns: [
      "(can | could) i pay (by | with) [a] (card | credit card | debit card | my card | my credit card | my debit card)", "do you (take | accept) (cards | credit cards | card)", "(by | with) card",
      "card", "i will pay (by | with) [a] card",
    ] },

    // --- thanks and goodbye -----------------------------------------------------------------------
    pleasure: { patterns: [
      "it was a pleasure doing business with you #h:pleasure", "(nice | good | great | a pleasure) doing business [with you]",
      "it was (nice | great | a pleasure) (to meet | meeting) you", "nice (to meet | meeting) you [too]",
    ] },
    look_after: { patterns: [
      "i promise to look after her #h:look_after", "i (will | promise to) (look after | take [good] care of) (her | it)", "i promise",
      "she is in good hands", "i will be good to her", "i will (drive | treat) her (carefully | well | gently)",
    ] },
    thanks_so_much: { patterns: ["thank you so much #h:thanks_so_much", "thank you (for everything | for the tires | for the cover | for the gas | for the car)"] },
  },

  lines: {
    // --- arriving -----------------------------------------------------------------------------------
    greet_new: [
      t("Hi there! | You | must be | here | about | the | car.", "Sveiki! | Jūs | turbūt esate | čia | dėl | — | automobilio.", "Sveiki! Jūs turbūt dėl automobilio?"),
      t("Hello! | Let | me | guess: | you | saw | my | ad.", "Sveiki! | Leiskite | man | atspėti: | jūs | matėte | mano | skelbimą.", "Sveiki! Leiskite atspėti – matėte mano skelbimą."),
    ],
    intro_again: [
      t("Oh, | it's | you | again! | Back | for | another | look?", "O, | tai | jūs | vėl! | Grįžote | — | dar vienai | apžiūrai?", "O, vėl jūs! Grįžote dar kartą apžiūrėti?",
        { flags: { 1: "“'s” (is): Lithuanian needs no copula here.", 5: "“for”: the dative apžiūrai carries it." } }),
    ],
    ad_again: [t("Are | you | here | about | the | car?", "Ar | jūs | čia | dėl | — | automobilio?", "Jūs dėl automobilio?", { flags: { 0: F_IS_Q } })],
    not_ad: [
      t("Oh! | Then | you're | just | admiring | her. | Everyone | does.", "O! | Tada | jūs | tiesiog | grožitės | ja. | Visi | grožisi.", "O! Tada jūs tiesiog ja grožitės. Visi grožisi.",
        { flags: { 2: "“'re” (are): the progressive is carried by grožitės.", 7: "“does” (elliptical): Lithuanian repeats the verb, grožisi." } }),
    ],
    maggie_name: [
      t("I'm | Maggie. | And | this | beauty | is | why | you're | here.", "Aš esu | Megė. | O | ši | gražuolė | yra | priežastis, kodėl | jūs esate | čia.",
        "Aš – Megė. O ši gražuolė – priežastis, kodėl jūs čia.", { flags: { 6: "“why” here = the reason why: priežastis, kodėl." } }),
    ],
    nice_name: [t("Nice | to meet | you!", "Malonu | susipažinti | su jumis!", "Malonu susipažinti!")],
    present1: [
      t("She's | a | '98, | cherry-red, | and | the | top | still | goes down | like a dream.", "Ji yra | — | 1998-ųjų, | vyšninės spalvos, | ir | — | stogas | vis dar | nusileidžia | puikiai.",
        "Ji – 1998-ųjų, vyšninės spalvos, o stogas vis dar nusileidžia be priekaištų.",
        { say: "She's a ninety-eight, cherry-red, and the top still goes down like a dream.",
          flags: { 0: "Americans often call a car “she”; mašina is feminine, so ji fits.", 2: "'98 = a 1998 model." } }),
    ],
    present2: [
      t("The | radio | works, | the | seats | are | original, | and | she's | never | let | me | down.", "— | Radijas | veikia, | — | sėdynės | yra | originalios, | ir | ji | niekada | nenuvylė | manęs | —.",
        "Radijas veikia, sėdynės originalios, ir ji manęs niekada nenuvylė.",
        { flags: { 8: "“she's” = she has: the perfect is carried by the past tense nenuvylė.", 10: "“let … down” = nenuvylė; the ne- comes from “never” (negative concord).", 12: "“down” (let … down): nenuvylė (under “let”) carries it." } }),
    ],
    compliment_react: [
      t("Thanks! | I | think | so | too.", "Ačiū! | Aš | manau | taip | irgi.", "Ačiū! Aš irgi taip manau."),
      t("Aw, | thank | you!", "Oi, | dėkoju | jums!", "Oi, ačiū!"),
    ],

    // --- questions about the car ----------------------------------------------------------------------
    ask_first: [
      t("Any | questions | about | her?", "Kokių nors | klausimų | apie | ją?", "Turite klausimų apie ją?"),
      t("So, | what | would | you | like | to know?", "Tai | ką | — | jūs | norėtumėte | žinoti?", "Tai ką norėtumėte sužinoti?", { flags: { 2: F_WOULD } }),
    ],
    ask_what: [t("Sure! | What | would | you | like | to know?", "Žinoma! | Ką | — | jūs | norėtumėte | žinoti?", "Žinoma! Ką norėtumėte sužinoti?", { flags: { 2: F_WOULD } })],
    ask_more: [
      t("Anything | else | you | want | to know?", "Ką nors | dar | jūs | norite | žinoti?", "Dar ką nors norite sužinoti?"),
      t("What | else?", "Kas | dar?", "Kas dar?"),
    ],
    a_hint: [t("Most | people | ask | about | the | mileage.", "Dauguma | žmonių | klausia | apie | — | ridą.", "Dauguma klausia apie ridą.")],
    a_mileage: [
      t("About | 112,000 | miles. | Mostly | highway, | I | promise.", "Apie | 112 000 | mylių. | Daugiausia | greitkeliais, | aš | pažadu.",
        "Apie 112 000 mylių (maždaug 180 000 km). Daugiausia greitkeliais, pažadu.", { say: "About a hundred and twelve thousand miles. Mostly highway, I promise." }),
    ],
    a_year: [
      t("1998. | Older | than | some | of | my | shoes.", "1998-ųjų. | Senesnė | už | kai kuriuos | — | mano | batus.", "1998-ųjų. Senesnė už kai kuriuos mano batus.",
        { say: "Nineteen ninety-eight. Older than some of my shoes.", flags: { 4: "“of” has no Lithuanian word: kai kuriuos mano batus." } }),
    ],
    a_owners: [
      t("Two. | I | bought | her | from | a | very | careful | dentist | in 2003.", "Du. | Aš | nusipirkau | ją | iš | — | labai | kruopštaus | dantisto | 2003-iaisiais.",
        "Du. Nusipirkau ją 2003-iaisiais iš labai kruopštaus dantisto.", { say: "Two. I bought her from a very careful dentist in two thousand three." }),
    ],
    a_since: [
      t("Since | 2003. | I | bought | her | from | a | very | careful | dentist.", "Nuo | 2003-iųjų. | Aš | nusipirkau | ją | iš | — | labai | kruopštaus | dantisto.",
        "Nuo 2003-iųjų. Nusipirkau ją iš labai kruopštaus dantisto.", { say: "Since two thousand three. I bought her from a very careful dentist." }),
    ],
    a_paint: [
      t("All | original. | She's | never | been | repainted.", "Visi | originalūs. | Ji | niekada | nebuvo | perdažyta.", "Dažai originalūs. Ji niekada nebuvo perdažyta.",
        { flags: { 0: "“All (original)” = the paint: dažai is masculine plural, hence visi originalūs.", 2: "“she's” = she has: the past tense nebuvo (under “been”) carries the perfect.",
          4: "“been” = nebuvo; the ne- comes from “never” (negative concord)." } }),
    ],
    a_hood: [t("Sure! | No | leaks, | no | rust. | See?", "Žinoma! | Jokių | nutekėjimų, | jokių | rūdžių. | Matote?", "Žinoma! Jokių nutekėjimų, jokių rūdžių. Matote?")],
    a_accident: [
      t("Never. | Well, | one | scratch. | The | mailbox | started it.", "Niekada. | Na, | vienas | įbrėžimas. | — | Pašto dėžutė | pirmoji pradėjo.",
        "Niekada. Na, vienas įbrėžimas. Pašto dėžutė pati kalta."),
    ],
    a_why: [
      t("I'm moving | into | a | condo | with no | garage. | She | deserves | better | than | the | street.",
        "Aš kraustausi | į | — | butą | be | garažo. | Ji | nusipelno | geresnio | nei | — | gatvė.",
        "Kraustausi į butą be garažo. Ji nusipelno geresnės vietos nei gatvė.",
        { flags: { 3: "condo = an apartment you own.", 8: "“better” = a better place: geresnio (genitive after nusipelno)." } }),
    ],
    a_service: [
      t("Every | oil change | is | in | this | folder. | I'm | that | kind | of | person.", "Kiekvienas | tepalų keitimas | yra | — | šiame | aplanke. | Aš esu | tokio | tipo | — | žmogus.",
        "Kiekvienas tepalų keitimas – šiame aplanke. Aš jau tokia.",
        { flags: { 3: "“in”: the locative šiame aplanke carries it.", 9: "“of” has no Lithuanian word: the genitive tokio tipo carries it." } }),
    ],
    a_problems_ok: [
      t("Honestly? | Nothing | serious. | She | just | needs | a little | love.", "Atvirai? | Nieko | rimto. | Jai | tiesiog | reikia | truputį | meilės.",
        "Atvirai? Nieko rimto. Jai tiesiog reikia truputėlio meilės.", { flags: { 3: "“She needs” = Jai reikia: the one who needs is in the dative." } }),
    ],
    a_problems_flaw: [
      t("Honestly? | The | air conditioning | doesn't work. | But | hey, | it's | a | convertible.", "Atvirai? | — | Kondicionierius | neveikia. | Bet | ei, | tai yra | — | kabrioletas.",
        "Atvirai? Neveikia kondicionierius. Bet, ei, juk tai kabrioletas."),
    ],
    ac_fine: [
      t("The | AC? | It | works | just | fine.", "— | Kondicionierius? | Jis | veikia | visai | gerai.", "Kondicionierius? Veikia visai gerai.", { say: "The A C? It works just fine." }),
    ],
    a_engine: [t("The | engine? | She | purrs | like | a | kitten.", "— | Variklis? | Ji | murkia | kaip | — | kačiukas.", "Variklis? Ji murkia kaip kačiukas.")],
    a_gearbox: [t("Automatic, | like | most | cars | here.", "Automatinė, | kaip | dauguma | automobilių | čia.", "Automatinė, kaip ir dauguma automobilių čia.",
      { flags: { 0: "Automatic (transmission): pavarų dėžė is feminine, hence automatinė." } })],
    a_fuel: [
      t("About | 25 | miles | per | gallon. | Less | if | you | drive | with | a | smile.", "Apie | 25 | mylias | iš | galono. | Mažiau, | jei | jūs | važiuojate | su | — | šypsena.",
        "Apie 25 mylias iš galono (maždaug 9,4 l/100 km). Mažiau – jei važiuojate su šypsena.", { say: "About twenty-five miles per gallon. Less if you drive with a smile." }),
    ],
    a_trunk: [
      t("The | trunk | is | small, | but | it | fits | two | suitcases | and | a | picnic | basket.",
        "— | Bagažinė | yra | maža, | bet | į ją | telpa | du | lagaminai | ir | — | pikniko | krepšys.",
        "Bagažinė maža, bet telpa du lagaminai ir pikniko krepšys.", { flags: { 5: "“it fits X” = į ją telpa X: X becomes the subject." } }),
    ],
    a_top: [
      t("Push | this | button | and | count | to | 10. | Top | down, | hair | ruined.", "Paspauskite | šį | mygtuką | ir | suskaičiuokite | iki | 10. | Stogas | nuleistas, | šukuosena | sugadinta.",
        "Paspauskite šį mygtuką ir suskaičiuokite iki 10. Stogas nuleistas, šukuosena sugadinta.", { say: "Push this button and count to ten. Top down, hair ruined." }),
    ],
    a_radio: [
      t("It | works. | It | only | gets | one | station, | but | it's | a | good one.", "Jis | veikia. | Jis | tik | pagauna | vieną | stotį, | bet | ji yra | — | gera.",
        "Veikia. Pagauna tik vieną stotį, bet gerą."),
    ],
    a_tires: [
      t("They're | not | new, | but | they're | safe.", "Jos | nėra | naujos, | bet | jos yra | saugios.", "Jos nėra naujos, bet saugios.",
        { flags: { 0: "“'re” (are): the negated copula nėra (under “not”) carries it." } }),
    ],
    a_seats: [t("All | original. | Not | a | single | tear.", "Visos | originalios. | Nė | — | vieno | įplyšimo.", "Visos originalios. Nė vieno įplyšimo.")],
    a_unknown: [
      t("Good | question. | Honestly, | I'm | not | sure.", "Geras | klausimas. | Atvirai, | aš | nesu | tikra.", "Geras klausimas. Atvirai, nesu tikra.",
        { flags: { 3: "“'m” (am): the negated copula nesu (under “not”) carries it." } }),
    ],

    // --- the test drive ---------------------------------------------------------------------------------
    drive_offer: [
      t("Would | you | like | to drive | her | first?", "Ar | jūs | norėtumėte | pavairuoti | ją | pirmiausia?", "Gal pirmiausia norėtumėte ją pavairuoti?", { flags: { 0: F_WOULD_Q } }),
      t("How about | a | test | drive?", "O gal | — | bandomasis | važiavimas?", "O gal bandomasis važiavimas?"),
    ],
    drive_keys: [
      t("Here are | the | keys. | Once | around | the | block, | and | be | nice | to | her.", "Štai | — | raktai. | Vieną kartą | aplink | — | kvartalą, | ir | būkite | {m:švelnus|f:švelni} | su | ja.",
        "Štai raktai. Vienas ratas aplink kvartalą – ir būkite su ja {m:švelnus|f:švelni}."),
      t("Sure! | Here are | the | keys. | Take | her | around | the | block.", "Žinoma! | Štai | — | raktai. | Pasivažinėkite | ja | aplink | — | kvartalą.",
        "Žinoma! Štai raktai. Apsukite ratą aplink kvartalą.", { flags: { 4: "“Take her” = drive her: pasivažinėkite + the instrumental ja (under “her”)." } }),
    ],
    drive_back: [
      t("Welcome | back! | So? | What | do | you | think?", "Sveiki | sugrįžę! | Na? | Ką | — | jūs | manote?", "Sveiki sugrįžę! Na, ką manote?", { flags: { 4: F_WH_DO } }),
      t("Back | already? | Well? | Did | she | steal | your | heart?", "Grįžote | jau? | Na? | Ar | ji | pavogė | jūsų | širdį?", "Jau grįžote? Na? Ar ji pavogė jūsų širdį?",
        { flags: { 3: "Question “Did” = the particle ar; the past tense sits on pavogė." } }),
    ],
    opinion_again: [t("So, | how | did | she | drive?", "Tai | kaip | — | ji | važiavo?", "Tai kaip ji važiavo?", { flags: { 2: F_WH_DID } })],
    drive_good_react: [
      t("I | told | you. | She | still | drives | like a dream.", "Aš | sakiau | jums. | Ji | vis dar | važiuoja | puikiai.", "Sakiau gi. Ji vis dar važiuoja puikiai."),
    ],
    drive_bad_react: [
      t("Fair enough. | She's | not | new, | but | she's | honest.", "Teisybė. | Ji | nėra | nauja, | bet | ji yra | sąžininga.", "Teisybė. Ji nenauja, bet sąžininga.",
        { flags: { 1: "“'s” (is): the negated copula nėra (under “not”) carries it." } }),
    ],
    drive_decline: [t("Brave! | Most | people | at least | kick | the | tires.", "Drąsu! | Dauguma | žmonių | bent | paspardo | — | padangas.", "Drąsu! Dauguma bent jau paspardo padangas.")],
    drive_later: [t("Sure, | whenever | you | like.", "Žinoma, | kada tik | jūs | norėsite.", "Žinoma, kada tik norėsite.",
      { flags: { 3: "“like” = norėsite: after kada tik the future is used for a future time." } })],
    drive_again: [t("You've | already | driven | her!", "Jūs | jau | pavairavote | ją!", "Jūs jau ją pavairavote!",
      { flags: { 0: "“'ve” (have): the past tense of pavairavote (under “driven”) carries the perfect." } })],
    flaw_disclose: [
      t("Okay, | full disclosure: | the | air conditioning | doesn't work.", "Gerai, | atvirai prisipažinsiu: | — | kondicionierius | neveikia.", "Gerai, atvirai prisipažinsiu: kondicionierius neveikia."),
    ],
    flaw_before: [
      t("Before | we | talk | numbers, | full disclosure: | the | air conditioning | doesn't work.",
        "Prieš | mums | kalbant | apie skaičius, | atvirai prisipažinsiu: | — | kondicionierius | neveikia.",
        "Prieš kalbant apie kainą – atvirai prisipažinsiu: kondicionierius neveikia.",
        { flags: { 1: "After prieš + the -ant form, the subject goes in the dative: mums.", 3: "“talk numbers” = kalbėti apie skaičius: apie carries the object." } }),
    ],
    flaw_sky: [t("But | it's | a | convertible. | You | have | the | whole | sky!", "Bet | tai yra | — | kabrioletas. | Jūs | turite | — | visą | dangų!", "Bet juk tai kabrioletas – turite visą dangų!")],
    glad_attitude: [t("I | like | your | attitude.", "Man | patinka | jūsų | požiūris.", "Man patinka jūsų požiūris.",
      { flags: { 0: "“I like” = Man patinka: the one who likes is in the dative." } })],
    flaw_fair: [t("I | know. | Better | you | hear | it | from | me.", "Aš | žinau. | Geriau | jūs | išgirskite | tai | iš | manęs.", "Žinau. Geriau išgirskite tai iš manęs.")],
    no_fault: [t("Really? | She | drove | just | fine | this | morning.", "Tikrai? | Ji | važiavo | visai | gerai | šį | rytą.", "Tikrai? Šįryt ji važiavo visai gerai.")],

    // --- the price talk --------------------------------------------------------------------------------
    talk_prompt: [
      t("So… | shall | we | talk | numbers?", "Tai… | ar | mes | pakalbėsime | apie skaičius?", "Tai… pakalbam apie kainą?",
        { flags: { 1: "“shall” in a question = the particle ar; the future pakalbėsime carries the suggestion.", 4: "“talk numbers” = kalbėti apie skaičius: apie carries the object." } }),
      t("Well? | Ready | to talk | money?", "Na? | {m:Pasiruošęs|f:Pasiruošusi} | pakalbėti | apie pinigus?", "Na? {m:Pasiruošęs|f:Pasiruošusi} pakalbėti apie pinigus?",
        { flags: { 3: "“talk money” = kalbėti apie pinigus: apie carries the object." } }),
    ],
    talk_ask: [
      t("I'm asking | $9,000. | It's | a | fair | price | for | a | car | like | this.", "Prašau | 9 000 dolerių. | Tai yra | — | teisinga | kaina | už | — | automobilį | kaip | šis.",
        "Prašau 9 000 dolerių. Tai teisinga kaina už tokį automobilį.", { say: "I'm asking nine thousand. It's a fair price for a car like this." }),
      t("The | price | is | $9,000, | like | in the ad.", "— | Kaina | yra | 9 000 dolerių, | kaip | skelbime.", "Kaina – 9 000 dolerių, kaip ir skelbime.",
        { say: "The price is nine thousand, like in the ad." }),
    ],
    price_now: [t("My | price | right now | is | {$p}.", "Mano | kaina | šiuo metu | yra | {$p}.", "Mano kaina šiuo metu – {$p}.")],
    price_reask: [t("So, | {$p}. | What | do | you | say?", "Taigi, | {$p}. | Ką | — | jūs | sakote?", "Taigi, {$p}. Ką sakote?", { flags: { 3: F_WH_DO } })],
    deal_price: [t("We | said | {$p}, | remember?", "Mes | sutarėme | {$p}, | pamenate?", "Sutarėme {$p}, pamenate?")],
    deal_done: [t("We | already | have | a | deal, | remember?", "Mes | jau | turime | — | susitarimą, | pamenate?", "Juk jau sutarėme, pamenate?")],
    flex_yes: [
      t("Well… | would | you | consider | {$p}?", "Na… | ar | jūs | svarstytumėte | {$p}?", "Na… o {$p} – svarstytumėte?",
        { flags: { 1: "“would” = the particle ar; the conditional sits on svarstytumėte." } }),
    ],
    flex_what: [
      t("What | did | you | have | in mind?", "Ką | — | jūs | turėjote | omenyje?", "O kokią kainą turėjote omenyje?",
        { flags: { 1: "Question “did” has no Lithuanian word; the past tense sits on turėjote." } }),
    ],
    need_offer: [
      t("Your | turn. | Make | me | an | offer.", "Jūsų | eilė. | Pateikite | man | — | pasiūlymą.", "Jūsų eilė. Pasiūlykite savo kainą."),
    ],
    confirm_full: [t("So… | {$p}, | no | haggling?", "Taigi… | {$p}, | be | derybų?", "Taigi… {$p}, be derybų?")],
    lowball: [
      t("Ha! | For | that | price, | you | can | have | the | radio.", "Cha! | Už | tokią | kainą, | jūs | galite | gauti | — | radiją.", "Cha! Už tokią kainą galite gauti nebent radiją."),
    ],
    lowball2: [
      t("Let's try | a | number | that | won't make | me | cry.", "Pabandykime | — | skaičių, | kuris | neprivers | manęs | verkti.", "Pabandykime skaičių, nuo kurio man nesinorės verkti."),
    ],
    backwards: [t("Wait, | that's | less | than | before!", "Palaukite, | tai | mažiau | nei | anksčiau!", "Palaukite, čia mažiau nei anksčiau!",
      { flags: { 1: "“'s” (is): Lithuanian needs no copula here." } })],
    counter: [
      t("I | could do | {$p}.", "Aš | galėčiau parduoti už | {$p}.", "Galėčiau parduoti už {$p}."),
      t("I | can | come down | to | {$p}. | It hurts, | but | okay.", "Aš | galiu | nuleisti | iki | {$p}. | Skauda, | bet | gerai.", "Galiu nuleisti iki {$p}. Skauda, bet tebūnie."),
    ],
    counter_echo: [
      t("{$q}? | I | was thinking | more | along the lines of | {$p}.", "{$q}? | Aš | galvojau | greičiau | apie | {$p}.", "{$q}? Aš galvojau greičiau apie {$p}.",
        { flags: { 3: F_RATHER } }),
    ],
    better_drop: [t("You | drive a hard bargain. | Fine: | {$p}.", "Jūs | kietai deratės. | Gerai: | {$p}.", "Jūs kietai deratės. Gerai – {$p}.")],
    better_no: [
      t("I've | already | come down. | Your | turn.", "Aš | jau | nuleidau. | Jūsų | eilė.", "Aš jau nuleidau kainą. Dabar jūsų eilė.",
        { flags: { 0: "“'ve” (have): the past tense of nuleidau (under “come down”) carries the perfect." } }),
      t("Come on, | give | me | a | number!", "Nagi, | duokite | man | — | skaičių!", "Nagi, pasakykite skaičių!"),
      t("Your | turn | to make | an | offer.", "Jūsų | eilė | pateikti | — | pasiūlymą.", "Dabar jūsų eilė pasiūlyti kainą."),
    ],
    best_almost: [t("Almost. | For you: | {$p}.", "Beveik. | Jums: | {$p}.", "Beveik. Jums – {$p}.")],
    best_for_you: [t("For you? | {$p}.", "Jums? | {$p}.", "Jums? {$p}.")],
    best_final: [
      t("{$p}. | That's | the | best | I | can | do.", "{$p}. | Tai | — | geriausia, ką | aš | galiu | padaryti.", "{$p}. Geriau negaliu.",
        { flags: { 1: "“'s” (is): Lithuanian needs no copula here.", 3: "“the best I can do” has no word for “that”: ką carries it." } }),
    ],
    throw_in_tires: [
      t("And | I'll throw in | a | new | set | of | tires.", "Ir | pridėsiu | — | naują | komplektą | — | padangų.", "Ir pridėsiu naujų padangų komplektą.",
        { flags: { 5: "“of” has no Lithuanian word: the genitive padangų carries it." } }),
    ],
    throw_in_cover: [t("And | I'll throw in | the | car | cover.", "Ir | pridėsiu | — | automobilio | tentą.", "Ir pridėsiu automobilio tentą.")],
    throw_in_tank: [
      t("And | I'll throw in | a | full | tank | of | gas.", "Ir | pridėsiu | — | pilną | baką | — | degalų.", "Ir dar pripilsiu pilną baką degalų.",
        { flags: { 5: "“of” has no Lithuanian word: the genitive degalų carries it." } }),
    ],
    halfway_yes: [t("Halfway? | That's | {$p}.", "Per pusę? | Tai yra | {$p}.", "Per pusę? Tai {$p}.")],
    halfway_yes2: [t("You | know | what? | That | works | for me.", "Jūs | žinote | ką? | Tai | tinka | man.", "Žinote ką? Man tinka.")],
    halfway_low: [t("Nice | try. | But | {$p} | is | my | bottom line.", "Gražus | bandymas. | Bet | {$p} | yra | mano | žemiausia riba.", "Gražus bandymas. Bet {$p} – mano žemiausia riba.")],
    halfway_none: [
      t("Halfway | between | what | and | what? | You | haven't made | me | an | offer | yet!", "Per pusę | tarp | ko | ir | ko? | Jūs | nepateikėte | man | — | pasiūlymo | dar!",
        "Per pusę tarp ko ir ko? Jūs dar nepasiūlėte savo kainos!"),
    ],
    cash_ack: [
      t("Cash | talks.", "Grynieji | kalba.", "Grynieji – svarus argumentas.", { flags: { 1: "Idiom: cash is persuasive." } }),
      t("Cash? | Now we're talking.", "Grynaisiais? | Štai čia jau kitas reikalas.", "Grynaisiais? Štai čia jau kitas reikalas."),
    ],
    flaw_point: [
      t("Fair | point. | I'll take | $250 | off.", "Teisinga | pastaba. | Nuleisiu | 250 dolerių | —.", "Teisinga pastaba. Nuleisiu 250 dolerių.",
        { say: "Fair point. I'll take two hundred fifty off.", flags: { 4: "“take … off”: nuleisiu (under “I'll take”) carries it." } }),
    ],
    already_off: [
      t("I | already | took | $250 | off | for | that.", "Aš | jau | nuleidau | 250 dolerių | — | dėl | to.", "Už tai jau nuleidau 250 dolerių.",
        { say: "I already took two hundred fifty off for that.", flags: { 4: "“took … off”: nuleidau (under “took”) carries it." } }),
    ],
    new_price: [t("So: | {$p}.", "Taigi: | {$p}.", "Taigi – {$p}.")],
    over_pay: [
      t("Hold on, | I | said | {$p}. | I | won't take | a | cent | more.", "Palaukite, | aš | sakiau | {$p}. | Aš | nepaimsiu | — | cento | daugiau.",
        "Palaukite, sakiau {$p}. Nė cento daugiau neimsiu."),
    ],
    deal_yes: [t("That | works | for me.", "Tai | tinka | man.", "Man tinka.")],
    deal_sold: [
      t("Sold!", "Parduota!", "Parduota!"),
      t("You | have | a | deal.", "Jūs | turite | — | susitarimą.", "Sutarta!"),
    ],
    deal_full: [
      t("Sold | for | {$p}! | Between | us, | you | could have haggled | a little.", "Parduota | už | {$p}! | Tarp | mūsų, | jūs | galėjote pasiderėti | truputį.",
        "Parduota už {$p}! Tarp mūsų – galėjote truputį pasiderėti."),
    ],
    firm: [
      t("I'm afraid | {$p} | is | as low as | I | can | go.", "Deja, | {$p} | yra | žemiausia, kiek | aš | galiu | nuleisti.", "Deja, žemiau {$p} nusileisti negaliu.",
        { flags: { 6: "“go” (go down in price) = nuleisti." } }),
    ],
    final_reask: [t("So? | Do | we | have | a | deal?", "Na? | Ar | mes | turime | — | susitarimą?", "Na? Sutariam?", { flags: { 1: F_DO_Q } })],
    final_reask_p: [t("So: | {$p}. | Deal?", "Taigi: | {$p}. | Sutarta?", "Taigi – {$p}. Sutarta?")],

    // --- twist: another buyer -------------------------------------------------------------------------
    rival1: [t("Oh, | sorry, | that's | my | phone. | One | second.", "O, | atsiprašau, | tai | mano | telefonas. | Vieną | sekundėlę.", "O, atsiprašau, telefonas. Sekundėlę.",
      { flags: { 2: "“'s” (is): Lithuanian needs no copula here." } })],
    rival2: [
      t("That | was | a | guy | who | wants | to see | her | at five. | With | cash.", "Tai | buvo | — | vyrukas, | kuris | nori | pamatyti | ją | penktą. | Su | grynaisiais.",
        "Rašė vyrukas, kuris nori ją pamatyti penktą. Su grynaisiais."),
    ],
    rival3: [t("But | I'd rather | sell | her | to you.", "Bet | verčiau | parduočiau | ją | jums.", "Bet verčiau parduočiau ją jums.")],

    // --- sleep on it, walking away, last chance ------------------------------------------------------------
    sleep_ok: [t("Of course. | Sleep on it.", "Žinoma. | Pagalvokite per naktį.", "Žinoma. Pagalvokite per naktį.")],
    sleep_dare: [t("Don't you dare!", "Net nedrįskite!", "Net nedrįskite!")],
    sleep_dare2: [t("The | five o'clock | guy | won't wait.", "— | Penktos valandos | vyrukas | nelauks.", "Tas, kuris atvažiuos penktą, nelauks.")],
    final_now: [t("Okay. | {$p}, | and | she's | yours | today.", "Gerai. | {$p}, | ir | ji yra | jūsų | šiandien.", "Gerai. {$p} – ir šiandien ji jūsų.")],
    wait_call: [
      t("Wait! | I | was thinking | more | along the lines of | {$p}…", "Palaukite! | Aš | galvojau | greičiau | apie | {$p}…", "Palaukite! Galvojau greičiau apie {$p}…",
        { flags: { 3: F_RATHER } }),
    ],
    if_wait: [
      t("If | you | don't make | me | wait.", "Jei | jūs | neversite | manęs | laukti.", "…jei neversite manęs laukti.",
        { flags: { 2: "After “if”, English uses the present for the future; Lithuanian uses the future neversite." } }),
    ],
    walk_ok: [t("I | understand. | No hard feelings.", "Aš | suprantu. | Nieko asmeniško.", "Suprantu. Nieko asmeniško.")],
    walk_ok2: [
      t("If | you | change | your | mind, | you | know | where | she | lives.", "Jei | jūs | pakeisite | savo | nuomonę, | jūs | žinote, | kur | ji | gyvena.",
        "Jei persigalvosite – žinote, kur ji gyvena.", { flags: { 2: "After “if”, the English present = the Lithuanian future pakeisite." } }),
    ],

    // --- rude or too blunt ---------------------------------------------------------------------------------
    rude_expensive: [t("Too | expensive? | Ouch. | She | heard | that.", "Per | brangu? | Oi. | Ji | išgirdo | tai.", "Per brangu? Oi. Ji tai girdėjo.")],
    rude_car: [t("Careful. | She's | old, | but | she | has | feelings.", "Atsargiai. | Ji yra | sena, | bet | ji | turi | jausmus.", "Atsargiai. Ji sena, bet turi jausmus.")],
    rude_generic: [t("Well, | that's | one | way | to start | a | negotiation.", "Na, | tai | vienas | būdas | pradėti | — | derybas.", "Na, ir taip galima pradėti derybas.",
      { flags: { 1: "“'s” (is): Lithuanian needs no copula here." } })],
    rude_walk: [
      t("Okay… | Good luck | with | your | search.", "Gerai… | Sėkmės | — | jūsų | paieškose.", "Gerai… Sėkmės ieškant.",
        { flags: { 2: "“with” has no Lithuanian word: the locative paieškose carries it." } }),
      t("Well… | okay | then.", "Na… | gerai | tada.", "Na… gerai."),
    ],

    // --- deal, payment, goodbye ----------------------------------------------------------------------------
    shake_on_it: [t("Let's shake | on | it.", "Paspauskime rankas | dėl | to.", "Paspauskim rankas.")],
    ask_pay: [
      t("So, | how | would | you | like | to pay?", "Tai | kaip | — | jūs | norėtumėte | sumokėti?", "Tai kaip norėtumėte sumokėti?",
        { flags: { 2: "“would”: the conditional ending of norėtumėte carries it." } }),
    ],
    cash_reminder: [t("Cash, | like | you | said?", "Grynaisiais, | kaip | jūs | sakėte?", "Grynaisiais, kaip sakėte?")],
    pay_options: [t("Cash, | a | bank | transfer | or | a | cashier's check?", "Grynaisiais, | — | banko | pavedimu | ar | — | banko čekiu?", "Grynaisiais, banko pavedimu ar banko čekiu?")],
    pay_later: [t("Sure. | But | first, | let's agree | on | a | price.", "Žinoma. | Bet | pirma, | susitarkime | dėl | — | kainos.", "Žinoma. Bet pirma susitarkime dėl kainos.")],
    pay_cash_r: [
      t("Cash? | Music | to | my | ears.", "Grynaisiais? | Muzika | — | mano | ausims.", "Grynaisiais? Tai muzika mano ausims.",
        { flags: { 2: "“to”: the dative ausims carries it." } }),
    ],
    pay_transfer_r: [
      t("A | bank | transfer | works | too. | I'll text | you | my | details.", "— | Banko | pavedimas | tinka | irgi. | Atsiųsiu žinute | jums | savo | duomenis.",
        "Banko pavedimas irgi tinka. Atsiųsiu jums savo duomenis žinute."),
    ],
    pay_check_r: [
      t("A | cashier's check | is | fine. | My | bank | is | on the square.", "— | Banko čekis | yra | tinkamas. | Mano | bankas | yra | aikštėje.",
        "Banko čekis tinka. Mano bankas – aikštėje."),
    ],
    pay_card_no: [
      t("I'm | not | a | store, | I'm afraid.", "Aš | nesu | — | parduotuvė, | deja.", "Deja, aš ne parduotuvė.",
        { flags: { 0: "“'m” (am): the negated copula nesu (under “not”) carries it." } }),
    ],
    wait_pay: [t("Hold on, | you | haven't paid | yet!", "Palaukite, | jūs | nesumokėjote | dar!", "Palaukite, jūs dar nesumokėjote!")],
    title_keys: [
      t("Here are | the | keys | and | the | title. | She's | all | yours.", "Štai | — | raktai | ir | — | nuosavybės dokumentas. | Ji yra | visiškai | jūsų.",
        "Štai raktai ir nuosavybės dokumentas. Dabar ji jūsų.", { flags: { 5: "title = the US document that shows who owns the car." } }),
    ],
    be_good: [
      t("Be | good | to | her. | She | loves | the | coast | road.", "Būkite | {m:geras|f:gera} | su | ja. | Ji | mėgsta | — | pakrantės | kelią.",
        "Būkite jai {m:geras|f:gera}. Ji mėgsta pakrantės kelią."),
    ],
    all_yours: [t("She's | all | yours | now!", "Ji yra | visiškai | jūsų | dabar!", "Dabar ji visa jūsų!")],
    bye_deal: [
      t("It was | a | pleasure | doing business | with | you.", "Buvo | — | malonu | turėti reikalų | su | jumis.", "Buvo malonu su jumis susitarti.",
        { flags: { 2: "“a pleasure” = malonu (an adverb, no noun)." } }),
      t("Enjoy | her!", "Mėgaukitės | ja!", "Mėgaukitės ja!"),
    ],
    pleasure_too: [t("The | pleasure | was | mine!", "— | Malonumas | buvo | mano!", "Man irgi buvo malonu!")],
    know_you_will: [t("I | know | you | will.", "Aš | žinau, | jūs | prižiūrėsite.", "Žinau, kad prižiūrėsite.",
      { flags: { 3: "“will” (elliptical): Lithuanian repeats the verb, prižiūrėsite." } })],
    you_too: [t("You | too!", "Jums | irgi!", "Man irgi!")],
    see_around: [
      t("Take care!", "Laikykitės!", "Laikykitės!"),
      t("Have | a | nice | day!", "Linkiu | — | geros | dienos!", "Geros dienos!"),
    ],
    ack: [t("Okay.", "Gerai.", "Gerai."), t("Sure.", "Žinoma.", "Žinoma.")],
  },

  domains: {
    p: () => Array.from({ length: 8 }, (_, i) => usd(7250 + 250 * i)),
    q: () => Array.from({ length: 16 }, (_, i) => usd(5000 + 250 * i)),
  },

  hints: {
    arrive: {
      lt: "Pasakyti, kad atvykai dėl skelbimo",
      items: [
        { id: "saw_ad", s: t("I | saw | your | ad | on Saturday.", "Aš | mačiau | jūsų | skelbimą | šeštadienį.", "Šeštadienį mačiau jūsų skelbimą.") },
        { id: "about_ad", s: t("Hi! | I'm | here | about | the | car.", "Sveiki! | Aš esu | čia | dėl | — | automobilio.", "Sveiki! Aš dėl automobilio.") },
        { id: "still_for_sale", s: t("Is | the | car | still | for sale?", "Ar | — | automobilis | vis dar | parduodamas?", "Ar automobilis dar parduodamas?",
          { flags: { 0: "“Is” = the particle ar; the participle parduodamas (under “for sale”) takes over the copula." } }) },
        { id: "im_name", s: t("I'm | {$name}.", "Aš esu | {$name}.", "Aš – {$name}.") },
      ],
    },
    look: {
      lt: "Pagirti automobilį",
      items: [
        { id: "seats", s: t("The | seats | look | great.", "— | Sėdynės | atrodo | puikiai.", "Sėdynės atrodo puikiai.") },
        { id: "beauty", s: t("She's | a | beauty!", "Ji yra | tikra | gražuolė!", "Ji tikra gražuolė!",
          { flags: { 1: "“a” = tikra (a real …): the praise needs an intensifier in Lithuanian." } }) },
      ],
    },
    ask: {
      lt: "Paklausti apie automobilį",
      items: [
        { id: "q_miles", s: t("How many | miles | does | it | have?", "Kiek | mylių | — | ji | turi?", "Kokia jos rida?",
          { flags: { 2: "Question “does” has no Lithuanian word; the tense sits on turi.", 3: F_CAR_IT } }) },
        { id: "q_accident", s: t("Has | it | ever | been | in an accident?", "Ar | ji | kada nors | yra buvusi | avarijoje?", "Ar ji kada nors buvo patekusi į avariją?",
          { flags: { 0: "Question “Has” = the particle ar; the perfect sits on yra buvusi (under “been”).", 1: F_CAR_IT } }) },
        { id: "q_why", s: t("Why | are | you | selling | it?", "Kodėl | — | jūs | parduodate | ją?", "Kodėl ją parduodate?",
          { flags: { 1: "Progressive “are” has no Lithuanian word; parduodate carries it.", 4: F_CAR_IT } }) },
        { id: "q_problems", s: t("Does | it | have | any | problems?", "Ar | ji | turi | kokių nors | problemų?", "Ar ji turi kokių nors bėdų?", { flags: { 0: F_DOES_Q, 1: F_CAR_IT } }) },
        { id: "q_service", s: t("Do | you | have | the | service | records?", "Ar | jūs | turite | — | techninės priežiūros | dokumentus?", "Ar turite techninės priežiūros dokumentus?",
          { flags: { 0: F_DO_Q } }) },
        { id: "q_fuel", s: t("How much | gas | does | it | use?", "Kiek | degalų | — | ji | sunaudoja?", "Kiek ji sunaudoja degalų?",
          { flags: { 2: "Question “does” has no Lithuanian word; the tense sits on sunaudoja.", 3: F_CAR_IT } }) },
      ],
    },
    drive: {
      lt: "Paprašyti bandomojo važiavimo",
      items: [
        { id: "round_block", s: t("Can | I | take | it | around | the | block?", "Ar galiu | aš | pasivažinėti | ja | aplink | — | kvartalą?", "Ar galiu ja pasivažinėti aplink kvartalą?",
          { flags: { 2: "“take it” = drive it: pasivažinėti + the instrumental ja (under “it”)." } }) },
        { id: "test_drive", s: t("Can | I | test-drive | it?", "Ar galiu | aš | išbandyti | ją?", "Ar galiu ją išbandyti?") },
        { id: "drive_first", s: t("Could | I | drive | it | first?", "Ar galėčiau | aš | pavairuoti | ją | pirma?", "Ar galėčiau pirma ją pavairuoti?") },
      ],
    },
    opinion: {
      lt: "Pasakyti, kaip patiko važiuoti",
      items: [
        { id: "drives_nicely", s: t("It | drives | really | nicely.", "Ji | važiuoja | labai | sklandžiai.", "Ji važiuoja labai sklandžiai.", { flags: { 0: F_CAR_IT } }) },
        { id: "seats", s: t("The | seats | look | great.", "— | Sėdynės | atrodo | puikiai.", "Sėdynės atrodo puikiai.") },
        { id: "brakes_soft", s: t("The | brakes | feel | a little | soft.", "— | Stabdžiai | atrodo | truputį | minkšti.", "Stabdžiai atrodo kiek minkšti.") },
      ],
    },
    talk: {
      lt: "Pradėti kalbėti apie kainą",
      items: [
        { id: "lets_talk", s: t("Okay… | let's talk.", "Gerai… | pakalbėkime.", "Gerai… pakalbėkim.") },
        { id: "more_than_hoping", s: t("$9,000? | That's | a bit | more | than | I | was hoping | to spend.", "9 000 dolerių? | Tai | šiek tiek | daugiau, | nei | aš | tikėjausi | išleisti.",
          "9 000 dolerių? Tai šiek tiek daugiau, nei tikėjausi išleisti.", { say: "Nine thousand? That's a bit more than I was hoping to spend.", flags: { 1: "“'s” (is): Lithuanian needs no copula here." } }) },
        { id: "flex", s: t("Is | there | any | flexibility | on | the | price?", "Ar yra | — | koks nors | lankstumas | dėl | — | kainos?", "Ar dėl kainos dar galima pasiderėti?",
          { flags: { 1: "Existential “there” has no Lithuanian word; yra (under “Is”) carries it." } }) },
        { id: "bit_much", s: t("That's | a bit | much | for me.", "Tai | šiek tiek | per daug | man.", "Man tai šiek tiek per daug.",
          { flags: { 2: "“a bit much” = slightly too much: per daug." } }) },
        { id: "best_price", s: t("What's | your | best | price?", "Kokia yra | jūsų | geriausia | kaina?", "Kokia jūsų geriausia kaina?") },
      ],
    },
    offer: {
      lt: "Pasiūlyti savo kainą",
      items: [
        { id: "along_lines", s: t("I | was thinking | more | along the lines of | $7,000.", "Aš | galvojau | greičiau | apie | 7 000 dolerių.", "Galvojau greičiau apie 7 000 dolerių.",
          { say: "I was thinking more along the lines of seven.", flags: { 2: F_RATHER } }) },
        { id: "consider", s: t("Would | you | consider | $7,500?", "Ar | jūs | svarstytumėte | 7 500 dolerių?", "Gal sutiktumėte už 7 500 dolerių?",
          { say: "Would you consider seven and a half?", flags: { 0: "“Would” = the particle ar; the conditional sits on svarstytumėte." } }) },
        { id: "can_offer", s: t("I | can | offer | you | $7,000.", "Aš | galiu | pasiūlyti | jums | 7 000 dolerių.", "Galiu jums pasiūlyti 7 000 dolerių.", { say: "I can offer you seven thousand." }) },
        { id: "cash_offer", s: t("I | can | pay | cash | today.", "Aš | galiu | sumokėti | grynaisiais | šiandien.", "Galiu šiandien sumokėti grynaisiais.") },
        { id: "do_better_price", s: t("Can | you | do | any | better | on | the | price?", "Ar galite | jūs | pasiūlyti | kiek nors | geresnę | — | — | kainą?", "Gal galite pasiūlyti geresnę kainą?",
          { flags: { 2: "“do (better)” about a price = pasiūlyti.", 5: "“on” has no Lithuanian word: geresnę kainą." } }) },
      ],
    },
    push: {
      lt: "Spausti toliau: per pusę, geriausia kaina",
      items: [
        { id: "halfway", s: t("What if | we | met | halfway?", "O gal | mes | susitiktume | pusiaukelėje?", "O gal susitinkam pusiaukelėje?",
          { flags: { 2: "Past “met” after “what if” = a soft suggestion; Lithuanian uses the conditional." } }) },
        { id: "little_from_you", s: t("A little | from | you, | a little | from | me.", "Truputį | iš | jūsų, | truputį | iš | manęs.", "Truputį nusileiskite jūs, truputį – aš.") },
        { id: "best_offer", s: t("Is | that | your | best | offer?", "Ar | tai | jūsų | geriausias | pasiūlymas?", "Ar tai geriausias jūsų pasiūlymas?", { flags: { 0: F_IS_Q } }) },
        { id: "do_better", s: t("Can | you | do | any | better?", "Ar galite | jūs | pasiūlyti | kiek nors | geriau?", "Gal galite pasiūlyti geriau?",
          { flags: { 2: "“do (better)” about a price = pasiūlyti." } }) },
        { id: "split", s: t("Let's split | the | difference.", "Pasidalykime | — | skirtumą.", "Pasidalykime skirtumą per pusę.") },
      ],
    },
    flaw_ac: {
      lt: "Pasinaudoti trūkumu",
      items: [
        { id: "ac_point", s: t("But | the | AC | doesn't work, | so…", "Bet | — | kondicionierius | neveikia, | tad…", "Bet kondicionierius neveikia, tad…", { say: "But the A C doesn't work, so…" }) },
        { id: "ac_cost", s: t("Fixing | the | AC | will cost | me | money.", "Sutaisyti | — | kondicionierių | kainuos | man | pinigų.", "Kondicionieriaus taisymas man kainuos.",
          { say: "Fixing the A C will cost me money.", flags: { 0: "The English -ing subject = an infinitive in Lithuanian: sutaisyti." } }) },
      ],
    },
    flaw_brakes: {
      lt: "Pasinaudoti trūkumu",
      items: [
        { id: "brakes_work", s: t("But | the | brakes | need | some | work, | so…", "Bet | — | stabdžiams | reikia | — | remonto, | tad…", "Bet stabdžius reikia taisyti, tad…",
          { flags: { 2: "“the brakes need” = stabdžiams reikia: the one who needs is in the dative.", 4: "“some” has no word: the genitive remonto carries it." } }) },
      ],
    },
    decide: {
      lt: "Sutikti, atidėti arba mandagiai atsisakyti",
      items: [
        { id: "works_for_me", s: t("That | works | for me.", "Tai | tinka | man.", "Man tinka.") },
        { id: "deal", s: t("We | have | a | deal.", "Mes | turime | — | susitarimą.", "Sutarta.") },
        { id: "sleep_on_it", s: t("Let | me | sleep on it.", "Leiskite | man | pagalvoti per naktį.", "Leiskite man per naktį pagalvoti.") },
        { id: "afraid_more", s: t("I'm afraid | that's | still | more | than | I | can | spend.", "Deja, | tai | vis tiek | daugiau, | nei | aš | galiu | išleisti.",
          "Deja, tai vis tiek daugiau, nei galiu išleisti.", { flags: { 1: "“'s” (is): Lithuanian needs no copula here." } }) },
        { id: "thanks_time", s: t("Thanks | for | your | time | anyway.", "Ačiū | už | jūsų | laiką | vis tiek.", "Vis tiek ačiū, kad skyrėte laiko.") },
      ],
    },
    shake: {
      lt: "Paspausti rankas",
      items: [
        { id: "shake", s: t("Let's shake | on | it.", "Paspauskime rankas | dėl | to.", "Paspauskim rankas.") },
        { id: "deal", s: t("We | have | a | deal.", "Mes | turime | — | susitarimą.", "Sutarta.") },
        { id: "ill_take", s: t("I'll take | it!", "Imsiu | ją!", "Perku!", { flags: { 1: F_CAR_IT } }) },
      ],
    },
    pay: {
      lt: "Pasakyti, kaip sumokėsi",
      items: [
        { id: "pay_cash_p", s: t("I'll pay | cash.", "Sumokėsiu | grynaisiais.", "Sumokėsiu grynaisiais.") },
        { id: "pay_transfer", s: t("Can | I | pay | by | bank | transfer?", "Ar galiu | aš | sumokėti | — | banko | pavedimu?", "Ar galiu sumokėti banko pavedimu?",
          { flags: { 3: "“by”: the instrumental pavedimu carries it." } }) },
        { id: "pay_check", s: t("Is | a | cashier's check | okay?", "Ar | — | banko čekis | tinka?", "Ar tinka banko čekis?",
          { flags: { 0: "“Is” in a question = the particle ar; tinka (under “okay”) takes over the copula." } }) },
      ],
    },
    bye: {
      lt: "Padėkoti ir atsisveikinti",
      items: [
        { id: "pleasure", s: t("It was | a | pleasure | doing business | with | you.", "Buvo | — | malonu | turėti reikalų | su | jumis.", "Buvo malonu su jumis susitarti.",
          { flags: { 2: "“a pleasure” = malonu (an adverb, no noun)." } }) },
        { id: "look_after", s: t("I | promise | to look after | her.", "Aš | pažadu | prižiūrėti | ją.", "Pažadu ją prižiūrėti.") },
        { id: "thanks_so_much", s: t("Thank | you | so much!", "Dėkoju | jums | labai!", "Labai ačiū!") },
        { id: "thanks_time", s: t("Thanks | for | your | time | anyway.", "Ačiū | už | jūsų | laiką | vis tiek.", "Vis tiek ačiū, kad skyrėte laiko.") },
      ],
    },
  },

  tips: TIPS,

  merges: {
    "must be": { reason: "lexical_expression", split: "must → turite + be → būti gives “turite būti” (obligation); the epistemic must = turbūt esate.", minimal: "Modal and verb." },
    "goes down": { reason: "lexical_expression", split: "goes → eina + down → žemyn is false; a roof lowering = nusileidžia (C-PHR).", minimal: "Verb and particle." },
    "like a dream": { reason: "lexical_expression", split: "like → kaip, a → —, dream → sapnas gives “kaip sapnas”, a calque; = puikiai.", minimal: "The whole simile." },
    "oil change": { reason: "lexical_expression", split: "oil → aliejus + change → pokytis gives “aliejaus pokytis”; the service = tepalų keitimas.", minimal: "Two words, one service." },
    "with no": { reason: "lexical_expression", split: "with → su + no → jokio gives “su jokiu garažu”; “with no” = be.", minimal: "Two words." },
    "started it": { reason: "lexical_expression", split: "started → pradėjo + it → tai; blaming (“X started it”) = pirmoji pradėjo; “it” has no referent.", minimal: "Verb and empty object." },
    "a little": { reason: "lexical_expression", split: "a → — + little → mažas gives “mažas”; the degree word = truputį (C-LEX).", minimal: "Two words." },
    "a bit": { reason: "lexical_expression", split: "a → — + bit → gabalėlis gives “gabalėlis”; the degree word = šiek tiek (C-LEX).", minimal: "Two words." },
    "air conditioning": { reason: "lexical_expression", split: "air → oras + conditioning → kondicionavimas; the device = kondicionierius.", minimal: "Two words, one device." },
    "in 2003": { reason: "grammatical_fusion", split: "in → į is false; the year is in the locative 2003-iaisiais (like in England → Anglijoje).", minimal: "Preposition and year." },
    "here are": { reason: "lexical_expression", split: "here → čia + are → yra gives “čia yra raktai”; the presentative = štai.", minimal: "Two words." },
    "fair enough": { reason: "lexical_expression", split: "fair → teisingas + enough → pakankamai is a calque; the concession = teisybė.", minimal: "Two words." },
    "at least": { reason: "lexical_expression", split: "at → prie + least → mažiausiai is false; = bent.", minimal: "Two words." },
    "full disclosure": { reason: "lexical_expression", split: "full → pilnas + disclosure → atskleidimas is a calque of a set phrase; = atvirai prisipažinsiu.", minimal: "Two words." },
    "let's talk": { reason: "grammatical_fusion", split: "let's → leiskime + talk → kalbėti is false; the 1st-person plural imperative = pakalbėkime.", minimal: "Two words." },
    "let's try": { reason: "grammatical_fusion", split: "let's → leiskime + try → bandyti is false; = pabandykime.", minimal: "Two words." },
    "let's split": { reason: "grammatical_fusion", split: "let's → leiskime + split → dalyti is false; = pasidalykime.", minimal: "Two words." },
    "let's shake": { reason: "lexical_expression", split: "let's → leiskime + shake → kratyti is false; agreeing by a handshake = paspauskime rankas (the hands are implied in English).", minimal: "Two words." },
    "let's agree": { reason: "grammatical_fusion", split: "let's → leiskime + agree → sutikti is false; the 1st-person plural imperative = susitarkime.", minimal: "Two words." },
    "i'm asking": { reason: "lexical_expression", split: "I'm → aš esu + asking → klausiu is false; an asking price = prašau.", minimal: "Contraction and verb." },
    "could do": { reason: "lexical_expression", split: "could → galėčiau + do → daryti is false; “I could do $X” (a price) = galėčiau parduoti už.", minimal: "Modal and verb." },
    "come down": { reason: "lexical_expression", split: "come → ateiti + down → žemyn is false; lowering a price = nuleisti (C-PHR).", minimal: "Verb and particle." },
    "it hurts": { reason: "grammatical_fusion", split: "dummy “it” → tai would add a false subject; the impersonal skauda absorbs it (C-DUMMY).", minimal: "Two words." },
    "was thinking": { reason: "grammatical_fusion", split: "was → buvau + thinking → galvojantis is false; the past progressive = galvojau.", minimal: "Auxiliary and participle." },
    "along the lines of": { reason: "lexical_expression", split: "along → palei, the → —, lines → linijos, of → — is false; = apie (roughly). “more” stays outside (= greičiau).", minimal: "All four words." },
    "drive a hard bargain": { reason: "lexical_expression", split: "drive → vairuoti, a → —, hard → kietas, bargain → sandoris is false; the idiom = kietai derėtis.", minimal: "The whole idiom." },
    "i'll throw in": { reason: "lexical_expression", split: "I'll → aš, throw → mesti, in → į is false; adding something for free = pridėsiu (the future ending carries “'ll”).", minimal: "Contraction, verb and particle." },
    "bottom line": { reason: "lexical_expression", split: "bottom → dugnas + line → linija is false; the lowest acceptable price = žemiausia riba.", minimal: "Two words." },
    "could have haggled": { reason: "grammatical_fusion", split: "could → galėjote + have → turėti + haggled → derėjotės is false; the modal perfect = galėjote pasiderėti.", minimal: "Modal, auxiliary and participle." },
    "hold on": { reason: "lexical_expression", split: "hold → laikykite + on → ant is false; = palaukite (C-PHR).", minimal: "Verb and particle." },
    "i'd rather": { reason: "lexical_expression", split: "I'd → aš norėčiau + rather → gana is false; the preference = verčiau.", minimal: "Contraction and adverb." },
    "sleep on it": { reason: "lexical_expression", split: "sleep → miegoti, on → ant, it → jo is false; = pagalvoti per naktį; “it” has no separate referent here.", minimal: "All three words." },
    "don't you dare": { reason: "lexical_expression", split: "don't → nedarykite, you → jūs, dare → drįsti gives a literal emphatic order; = net nedrįskite.", minimal: "The whole exclamation." },
    "come on": { reason: "lexical_expression", split: "come → ateikite + on → ant is false; the urging interjection = nagi.", minimal: "Two words." },
    "five o'clock": { reason: "lexical_expression", split: "five → penki + o'clock → valanda gives a numeral and a noun; “the five o'clock guy” = penktos valandos (the hour as one time expression).", minimal: "A clock time." },
    "i'm afraid": { reason: "lexical_expression", split: "I'm → aš esu + afraid → išsigandęs is false; the polite softener = deja.", minimal: "Contraction and adjective." },
    "as low as": { reason: "lexical_expression", split: "as → kaip, low → žemas, as → kaip gives “kaip žemas kaip”; = žemiausia, kiek.", minimal: "All three words." },
    "no hard feelings": { reason: "lexical_expression", split: "no → jokių, hard → kietų, feelings → jausmų is a calque; = nieko asmeniško.", minimal: "The whole phrase." },
    "good luck": { reason: "lexical_expression", split: "good → gera + luck → sėkmė gives “gera sėkmė”; the wish = sėkmės.", minimal: "Two words." },
    "cashier's check": { reason: "lexical_expression", split: "cashier's → kasininko + check → čekis is false; the bank-guaranteed check = banko čekis.", minimal: "Two words, one document." },
    "it was": { reason: "grammatical_fusion", split: "dummy “it” → tai would add a false subject; the impersonal buvo absorbs it (C-DUMMY).", minimal: "Two words." },
    "doing business": { reason: "lexical_expression", split: "doing → darant + business → verslą is a calque; = turėti reikalų.", minimal: "Two words." },
    "how many": { reason: "lexical_expression", split: "how → kaip + many → daug gives “kaip daug”; asking for a number = kiek.", minimal: "Two words." },
    "was hoping": { reason: "grammatical_fusion", split: "was → buvau + hoping → besitikintis is false; the past progressive = tikėjausi.", minimal: "Auxiliary and participle." },
    "what if": { reason: "lexical_expression", split: "what → kas + if → jei gives “kas jei”, a calque; the suggestion = o gal.", minimal: "Two words." },
    "how about": { reason: "lexical_expression", split: "how → kaip + about → apie gives “kaip apie”; a suggestion = o gal.", minimal: "Two words." },
    "will cost": { reason: "grammatical_fusion", split: "will → bus + cost → kainuoti is false; the future = kainuos.", minimal: "Auxiliary and verb." },
    "now we're talking": { reason: "lexical_expression", split: "now → dabar, we're → mes esame, talking → kalbantys is a literal reading of an idiom of approval; = štai čia jau kitas reikalas.", minimal: "The whole idiom." },
    "good one": { reason: "grammatical_fusion", split: "one → viena would add a false numeral; the prop-word “one” (= a station) is absorbed by the adjective gera (C-ONE).", minimal: "Adjective and prop-word." },
    "for sale": { reason: "lexical_expression", split: "for → už + sale → pardavimas is false; = parduodamas.", minimal: "Two words." },
    "all right": { reason: "lexical_expression", split: "all → visi + right → teisingas is false; the acknowledgement = gerai (C-LEX).", minimal: "Two words." },
    "to look after": { reason: "lexical_expression", split: "to → į, look → žiūrėti, after → po is false; = prižiūrėti (C-INF + C-PHR).", minimal: "Infinitive marker, verb and particle." },
  },

  // ---------------------------------------------------------------------------------------------------

  mission: [
    { lt: "Pasakyk, kad atvykai dėl skelbimo", done: (c) => !!c.s.arrived },
    { lt: "Paklausk apie automobilį (ridą, avarijas, kodėl parduoda)", optional: true,
      when: (c) => !c.s.talked && !c.s.drove && !c.s.driveDeclined && !c.s.lookDone, done: (c) => c.s.qCount >= 1 },
    { lt: "Išbandyk automobilį", optional: true, when: (c) => !c.s.talked || !!c.s.drove || !!c.s.driveDeclined, done: (c) => !!c.s.drove || !!c.s.driveDeclined },
    { lt: "Pradėk derėtis dėl kainos", done: (c) => !!c.s.talked },
    { lt: "Pasiūlyk savo kainą", optional: true, when: (c) => !c.s.outcome, done: (c) => !!c.s.offered },
    { lt: "Susitark dėl kainos – arba mandagiai atsisakyk", done: (c) => !!c.s.outcome },
    { lt: "Susitark, kaip sumokėsi", optional: true, when: (c) => c.s.outcome === "deal", done: (c) => !!c.s.paid },
  ],

  steps: [
    { id: "arrive", when: (c) => !c.s.arrived, done: (c) => !!c.s.arrived,
      ask: (c) => c.say("ad_again"),
      expects: ["about_ad", "my_name", "im_name_ctx", "compliment_car"],
      suggest: [{ lt: "Pasakyti, kad atvykai dėl skelbimo", hint: "arrive" }, { lt: "Pagirti automobilį", hint: "look" }],
      yes: (c) => { if (arrive(c)) c.say("maggie_name"); },
      no: (c) => {
        if (!c.s.notAd) { c.s.notAd = true; c.say("not_ad"); c.hold(); return; }
        c.say("see_around"); c.end();
      },
      help: (c) => c.say("ad_again") },
    { id: "look", when: (c) => !!c.s.arrived && !c.s.talked && !c.s.drove && !c.s.driveDeclined, done: (c) => !!c.s.lookDone || c.s.qCount >= 3,
      ask: (c) => lookAsk(c),
      expects: ["q_mileage", "q_year", "q_owners", "q_owned", "q_paint", "q_hood", "q_accident", "q_why", "q_service", "q_problems", "q_ac", "q_engine", "q_gearbox", "q_fuel", "q_trunk",
        "q_top", "q_radio", "q_tires", "q_seats", "compliment_car", "no_more_q", "my_name", "im_name_ctx", "test_drive", "decline_drive", "lets_talk", "ask_price", "ask_flex", "too_high", "make_offer"],
      suggest: [{ lt: "Paklausti apie automobilį", hint: "ask" }, { lt: "Pagirti automobilį", hint: "look" }, { lt: "Paprašyti bandomojo važiavimo", hint: "drive" }],
      yes: (c) => { c.say("ask_what"); c.hold(); },
      no: (c) => { c.s.lookDone = true; },
      help: (c) => c.say("a_hint") },
    // before the price talk; once it has started, only "Would you like to drive her first?" after the price (tellPrice)
    { id: "drive", when: (c) => !!c.s.arrived && !c.s.drove && !c.s.driveDeclined && !c.s.talked, done: (c) => !!c.s.drove || !!c.s.driveDeclined,
      ask: (c) => { c.s.driveOffered = (c.s.driveOffered ?? 0) + 1; c.say("drive_offer"); },
      expects: ["test_drive", "decline_drive", "lets_talk", "ask_price", "ask_flex", "too_high", "make_offer"],
      suggest: [S_DRIVE, S_TALK],
      yes: (c) => startDrive(c), no: (c) => declineDrive(c),
      help: (c) => c.say("drive_offer") },
    { id: "opinion", when: (c) => !!c.s.drove && !c.s.opinion && !c.s.talked, done: (c) => !!c.s.opinion,
      ask: (c) => { c.say(c.s.backSaid ? "opinion_again" : "drive_back"); c.s.backSaid = true; },
      expects: ["drive_good", "drive_bad", "compliment_car"],
      suggest: [{ lt: "Pasakyti, kaip patiko važiuoti", hint: "opinion" }],
      yes: (c) => H.drive_good(c, {}, { intent: "drive_good", slots: {}, tags: [] }),
      no: (c) => { if (!once(c, "opinion")) return; c.s.opinion = true; c.say("drive_bad_react"); afterOpinion(c); },
      help: (c) => c.say("opinion_again") },
    // Maggie invites the price talk; the learner starts it (the song's "Okay… let's talk")
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
        c.s.payAsked = "how";
        c.say("ask_pay");
      },
      expects: ["pay_cash", "pay_transfer", "pay_check", "pay_card", "cash_lever", "no_cash"],
      suggest: [{ lt: "Pasakyti, kaip sumokėsi", hint: "pay" }],
      yes: (c) => { if (c.s.payAsked === "cash") paid(c, "pay_cash_r", "cash"); else { c.say("pay_options"); c.hold(); } },
      no: (c) => { c.say("pay_options"); c.s.payAsked = "how"; c.hold(); },
      help: (c) => c.say("pay_options") },
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
      suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "bye" }],
      on: {
        g_thanks: (cc) => { closeBye(cc); }, g_bye: (cc) => { closeBye(cc); }, thanks_so_much: (cc) => { closeBye(cc); },
        pleasure: (cc, sl, sg) => { H.pleasure(cc, sl, sg); }, look_after: (cc, sl, sg) => { H.look_after(cc, sl, sg); },
        walk_away: (cc) => { closeBye(cc); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // arriving (hint patterns first)
    { say: "I saw your ad on Saturday.", intent: "about_ad", step: "arrive" },
    { say: "Hi! I'm here about the car.", intent: "about_ad", step: "arrive" },
    { say: "Is the car still for sale?", intent: "about_ad", step: "arrive" },
    { say: "I'm Tomas.", intent: "im_name_ctx", step: "arrive", slots: { name: "Tomas" } },
    { say: "My name is Tomas.", intent: "my_name" },
    { say: "Tomas", intent: "none" },
    { say: "Hello, Maggie!", intent: "vocative", step: "arrive", not: ["bare_name_ctx", "im_name_ctx"] },
    { say: "Are you Maggie?", intent: "about_ad", step: "arrive" },
    { say: "Hi there, I called about the convertible", intent: "about_ad", step: "arrive" },
    { say: "I'm interested in your car", intent: "about_ad", step: "arrive" },
    { say: "I'm not interested", intent: "walk_away", not: ["about_ad"] },
    { say: "The seats look great.", intent: "compliment_car" },
    { say: "She's a beauty!", intent: "compliment_car" },
    { say: "Wow, what a beauty!", intent: "compliment_car" },
    // questions about the car
    { say: "How many miles does it have?", intent: "q_mileage", step: "look" },
    { say: "What's the mileage on her?", intent: "q_mileage", step: "look" },
    { say: "How many kilometers does it have?", intent: "q_mileage", step: "look" },
    { say: "Has it ever been in an accident?", intent: "q_accident", step: "look" },
    { say: "Was she ever in a crash?", intent: "q_accident", step: "look" },
    { say: "Why are you selling it?", intent: "q_why", step: "look" },
    { say: "How come you're selling such a beautiful car?", intent: "q_why", step: "look" },
    { say: "Does it have any problems?", intent: "q_problems", step: "look" },
    { say: "Is there anything I should know about?", intent: "q_problems", step: "look" },
    { say: "Does the AC work?", intent: "q_ac", step: "look" },
    { say: "Do you have the service records?", intent: "q_service", step: "look" },
    { say: "How much gas does it use?", intent: "q_fuel", step: "look" },
    { say: "How much petrol does it use?", intent: "q_fuel", step: "look" },
    { say: "How big is the boot?", intent: "q_trunk", step: "look" },
    { say: "Is it automatic or manual?", intent: "q_gearbox", step: "look" },
    { say: "What year is it?", intent: "q_year", step: "look" },
    { say: "Are you the first owner?", intent: "q_owners", step: "look" },
    { say: "Does the roof leak?", intent: "q_top", step: "look" },
    { say: "Does it have a sunroof?", intent: "q_unknown", step: "look" },
    { say: "No, that's all.", intent: "no_more_q", step: "look" },
    { say: "I don't have any more questions", intent: "no_more_q", step: "look" },
    // the test drive
    { say: "Can I take it around the block?", intent: "test_drive" },
    { say: "Can I test-drive it?", intent: "test_drive" },
    { say: "Could I drive it first?", intent: "test_drive" },
    { say: "Mind if I take her for a spin?", intent: "test_drive" },
    { say: "No, thanks. I trust you.", intent: "decline_drive", step: "drive" },
    { say: "I don't want to drive it", intent: "decline_drive", step: "drive", not: ["test_drive"] },
    { say: "It drives really nicely.", intent: "drive_good", step: "opinion" },
    { say: "She runs like a dream", intent: "drive_good", step: "opinion" },
    { say: "The brakes feel a little soft.", intent: "drive_bad", step: "opinion" },
    { say: "The engine sounds a bit rough", intent: "drive_bad", step: "opinion" },
    { say: "It doesn't drive nicely", intent: "none" },
    // the price talk
    { say: "Okay… let's talk.", intent: "lets_talk", step: "haggle" },
    { say: "How much do you want for it?", intent: "ask_price", step: "look" },
    { say: "$9,000? That's a bit more than I was hoping to spend.", intent: "too_high", step: "haggle" },
    { say: "That's a bit much for me.", intent: "too_high", step: "haggle" },
    { say: "Is there any flexibility on the price?", intent: "ask_flex", step: "haggle" },
    { say: "Is the price negotiable?", intent: "ask_flex", step: "haggle" },
    { say: "Can you make me a discount?", intent: "ask_flex", step: "haggle" },
    { say: "It's too expensive.", intent: "too_high", step: "haggle" },
    { say: "It's not too expensive.", intent: "none" },
    { say: "What's your best price?", intent: "ask_best", step: "haggle" },
    { say: "What is your last price?", intent: "ask_best", step: "haggle" },
    { say: "Is that your best offer?", intent: "ask_best", step: "haggle" },
    { say: "I was thinking more along the lines of seven.", intent: "make_offer", step: "haggle", slots: { usd: 7000 } },
    { say: "Would you consider $7,500?", intent: "make_offer", step: "haggle", slots: { usd: 7500 } },
    { say: "Would you consider seven and a half?", intent: "make_offer", step: "haggle", slots: { usd: 7500 } },
    { say: "I can offer you $7,000.", intent: "make_offer", step: "haggle", slots: { usd: 7000 } },
    { say: "How about eighty-two fifty?", intent: "make_offer", step: "haggle", slots: { usd: 8250 } },
    { say: "Would you take 7k?", intent: "make_offer", step: "haggle", slots: { usd: 7000 } },
    { say: "I give you 7000", intent: "make_offer", step: "haggle", slots: { usd: 7000 } },
    { say: "I can pay 7,000 cash", intent: "make_offer", step: "haggle", slots: { usd: 7000 } },
    { say: "What if we met halfway at 7,750?", intent: "make_offer", step: "haggle", slots: { usd: 7750 } },
    { say: "Seven.", intent: "make_offer_ctx", step: "haggle", slots: { usd: 7000 } },
    { say: "$7,500", intent: "make_offer_ctx", step: "haggle", slots: { usd: 7500 } },
    { say: "Seven", intent: "none" },
    { say: "I can't pay 7,000", intent: "too_high", step: "haggle", not: ["make_offer"] },
    { say: "I can pay cash today.", intent: "cash_lever", step: "haggle" },
    { say: "I don't have cash", intent: "no_cash", step: "haggle", not: ["cash_lever"] },
    { say: "Can you do any better on the price?", intent: "ask_better", step: "haggle" },
    { say: "Can you do any better?", intent: "ask_better", step: "haggle" },
    { say: "How low can you go?", intent: "ask_better", step: "haggle" },
    { say: "What if we met halfway?", intent: "halfway", step: "haggle" },
    { say: "A little from you, a little from me.", intent: "halfway", step: "haggle" },
    { say: "Let's split the difference.", intent: "halfway", step: "haggle" },
    { say: "But the AC doesn't work, so…", intent: "use_flaw", step: "haggle" },
    { say: "Fixing the AC will cost me money.", intent: "use_flaw", step: "haggle" },
    { say: "But the brakes need some work, so…", intent: "use_flaw", step: "haggle" },
    { say: "The AC works fine", intent: "q_ac", not: ["use_flaw"] },
    // deciding
    { say: "That works for me.", intent: "accept_deal", step: "decide" },
    { say: "We have a deal.", intent: "accept_deal", step: "decide" },
    { say: "I'll take it!", intent: "accept_deal", step: "decide" },
    { say: "OK, I take it", intent: "accept_deal", step: "decide" },
    { say: "That doesn't work for me", intent: "walk_away", step: "decide", not: ["accept_deal"] },
    { say: "I won't take it", intent: "walk_away", step: "decide", not: ["accept_deal"] },
    { say: "Let me sleep on it.", intent: "sleep_on_it", step: "decide" },
    { say: "I need to talk to my wife first", intent: "sleep_on_it", step: "decide" },
    { say: "I'm afraid that's still more than I can spend.", intent: "walk_away", step: "decide" },
    { say: "Thanks for your time anyway.", intent: "walk_away", step: "decide" },
    { say: "Sorry, it's just not in my budget.", intent: "walk_away", step: "decide" },
    { say: "No way!", intent: "walk_rude", step: "decide" },
    { say: "It's a rip-off", intent: "walk_rude", step: "decide" },
    { say: "It's junk.", intent: "rude_car", step: "decide" },
    { say: "It's not worth nine thousand.", intent: "rude_car", step: "decide", not: ["make_offer"] },
    { say: "Let's shake on it.", intent: "shake" },
    // paying and the goodbye
    { say: "I'll pay cash.", intent: "pay_cash", step: "pay" },
    { say: "Can I pay by bank transfer?", intent: "pay_transfer", step: "pay" },
    { say: "Is a cashier's check okay?", intent: "pay_check", step: "pay" },
    { say: "Can I pay by card?", intent: "pay_card", step: "pay" },
    { say: "It was a pleasure doing business with you.", intent: "pleasure" },
    { say: "I promise to look after her.", intent: "look_after" },
    { say: "Thank you so much!", intent: "thanks_so_much" },
    // unrelated
    { say: "purple elephant keyboard", intent: "none" },
    { say: "My dog likes pizza", intent: "none" },
    // more questions, learner English and meaning that must not flip
    { say: "When did you buy it?", intent: "q_owned", step: "look" },
    { say: "Is the paint original?", intent: "q_paint", step: "look" },
    { say: "Can I look under the bonnet?", intent: "q_hood", step: "look" },
    { say: "It was in crash?", intent: "q_accident", step: "look" },
    { say: "Why you sell this car?", intent: "q_why", step: "look" },
    { say: "I like this car very much", intent: "compliment_car", not: ["too_high"] },
    { say: "It was okay.", intent: "drive_bad", step: "opinion", not: ["accept_deal", "accept_ctx"] },
    { say: "Sounds good.", intent: "accept_ctx", step: "decide" },
    { say: "Sounds good.", intent: "yn:yes", not: ["accept_ctx", "accept_deal"] },
    { say: "Agreed.", intent: "accept_ctx", step: "haggle" },
    { say: "I want pay 7500", intent: "make_offer", step: "haggle", slots: { usd: 7500 } },
    { say: "For 7000 I take it", intent: "make_offer", step: "haggle", slots: { usd: 7000 } },
    { say: "Is too much money for me", intent: "too_high", step: "haggle" },
    { say: "I can't do 8,000.", intent: "none" },
    { say: "I won't pay 9,000.", intent: "none" },
  ],

  // Maggie's twist is pinned where the script depends on it (setup); the throw-in and the line variants
  // vary by seed, and on replays (visits ≥ 1) she greets the learner as someone she has met.
  sims: [
    { name: "the song: halfway, cash", turns: ["Hi! I'm here about the car.", "How many miles does it have?", "No, that's all, thanks.", "Can I take it around the block?",
      "It drives really nicely.", "Okay… let's talk.", "That's a bit more than I was hoping to spend. Is there any flexibility on the price?",
      "I was thinking more along the lines of seven.", "What if we met halfway?", "Let's shake on it.", "I'll pay cash.", "It was a pleasure doing business with you."],
      expect: { complete: true, state: { outcome: "deal", dealPrice: 7500, paid: true } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    { name: "questions, a price first, changes of mind", turns: ["Hello! I saw your ad on Saturday.", "My name is Tomas.", "Why are you selling it?",
      "Has it ever been in an accident?", "How much do you want for it?", "No, thanks. I trust you.", "Would you take 7,000?", "Actually, 6,500.", "Okay, 7,500.",
      "Can you do any better?", "Is that your best offer?", "I'll take it!", "Can I pay by card?", "Can I pay by bank transfer?", "Thanks, bye!"],
      expect: { complete: true, state: { outcome: "deal", dealPrice: 7750, payMethod: "transfer" } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    { name: "the AC doesn't work (twist): using it", turns: ["Hi! I'm here about the car.", "Does it have any problems?", "No, that's all.", "Sure, I'd love to.",
      "It drives really nicely.", "But the AC doesn't work, so…", "Would you consider $7,500?", "What if we met halfway?", "Deal!", "Can I pay by bank transfer?", "Thank you so much!"],
      expect: { complete: true, state: { outcome: "deal", flawUsed: true, dealPrice: 8000 } }, auto: AUTO, setup: (s) => { s.twist = "ac_flaw"; } },
    { name: "the AC after the drive (twist): that's okay", turns: ["Hi! Is the car still for sale?", "No, that's all.", "Can I test-drive it?", "I loved it!",
      "I don't need air conditioning.", "Would you take eight thousand?", "That works for me.", "Cash.", "Thanks, bye!"],
      expect: { complete: true, state: { outcome: "deal", flawKnown: true, dealPrice: 8500 } }, auto: AUTO, setup: (s) => { s.twist = "ac_flaw"; } },
    { name: "another buyer (twist): Don't you dare!", turns: ["Hi! Is the car still for sale?", "What year is it?", "No, that's all, thanks.", "No, thanks. I trust you.",
      "Is there any flexibility on the price?", "I was thinking more along the lines of seven.", "Let me sleep on it.", "That works for me.", "Let's shake on it.", "I'll pay cash.", "Thanks, bye!"],
      expect: { complete: true, state: { outcome: "deal", rival: true, dealPrice: 7500 } }, auto: AUTO, setup: (s) => { s.twist = "rival_buyer"; } },
    { name: "sleep on it: Wait! (no twist)", turns: ["Hi! I'm here about the car.", "No questions, thanks.", "Maybe later.", "What's your best price?", "Let me sleep on it.",
      "Okay, deal!", "Let's shake on it.", "Cash.", "Thanks, bye!"],
      expect: { complete: true, state: { outcome: "deal", dealPrice: 7500, sleepUsed: true } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    { name: "a polite no, after her last chance", turns: ["Hi! I'm here about the car.", "No questions, thanks.", "No, thanks. I trust you.", "That's a bit much for me.",
      "I'm afraid that's still more than I can spend.", "Thanks for your time anyway.", "Bye!"],
      expect: { complete: true, state: { outcome: "walk" } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    { name: "too blunt: rude, then gone", turns: ["Hi! I'm here about the car.", "How much do you want for it?", "No, I don't need a test drive.", "Too expensive!", "It's junk.",
      "No way!", "Forget it."],
      expect: { complete: true, state: { outcome: "walk_rude" } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    { name: "full price, no haggling", turns: ["Hi! I'm here about the car.", "What a beauty!", "No, that's all.", "Yes, please.", "I loved it!", "I'll take it!", "Let's shake on it.",
      "Is a cashier's check okay?", "I promise to look after her."],
      expect: { complete: true, state: { outcome: "deal", dealPrice: 9000, payMethod: "check" } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    { name: "lowball, backwards, cash", turns: ["Hi, is the car still for sale?", "No questions.", "No, thanks.", "Would you take three thousand?", "Okay, how about 7,000?", "6,000.",
      "I can pay cash today.", "Can you do any better?", "Fine, 7,750.", "Let's shake on it.", "Yes.", "Thanks, bye!"],
      expect: { complete: true, state: { outcome: "deal", cashUsed: true, dealPrice: 7750 } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    { name: "the price first, then the drive", turns: ["Hi! How much do you want for the car?", "Yes, please.", "She stole my heart.", "Would you consider eight thousand?",
      "Deal!", "Let's shake on it.", "By bank transfer.", "Thank you so much!"],
      expect: { complete: true, state: { outcome: "deal", drove: true, dealPrice: 8500 } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    { name: "halfway too early, then an offer", turns: ["Hi! I'm here about the car.", "No questions.", "No, thanks.", "Okay… let's talk.", "What if we met halfway?",
      "Would you consider seven thousand?", "Can you meet me halfway?", "Let's shake on it.", "By bank transfer.", "Thanks, bye!"],
      expect: { complete: true, state: { outcome: "deal", dealPrice: 7750 } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    { name: "okay to the asking price? no haggling? no", turns: ["Hi! I'm here about the car.", "No questions.", "No, thanks.", "How much is it?", "Okay.", "No, wait.",
      "I give you 8000.", "That works for me.", "Let's shake on it.", "Cash.", "Thanks, bye!"],
      expect: { complete: true, state: { outcome: "deal", dealPrice: 8500 } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    // "Nine thousand?" echoes her price (no yes); "Eight and a half? Hmm. How about eight?" is an offer of eight
    { name: "an echo and the last number", turns: ["Hi! I'm here about the car.", "No questions.", "No, thanks.", "Okay… let's talk.", "Nine thousand?",
      "Is there any flexibility?", "Eight and a half? Hmm. How about eight?", "Let's shake on it.", "I'll pay cash.", "Thanks, bye!"],
      expect: { complete: true, state: { outcome: "deal", dealPrice: 8000 } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    // an offer straight from the questions: no drive (the drive item disappears), and the checklist is complete
    { name: "an offer before the drive", turns: ["Hi! I'm here about the car.", "Why are you selling it?", "Would you take seven thousand?", "Is that your best offer?",
      "That works for me.", "Let's shake on it.", "I'll pay cash.", "Thanks, bye!"],
      expect: { complete: true, state: { outcome: "deal", dealPrice: 8000 } }, auto: AUTO, setup: (s) => { s.twist = null; } },
    { name: "leaving before the price: not done", turns: ["Hi! I'm here about the car.", "How old is it?", "Thanks, bye!"],
      expect: { complete: false }, auto: AUTO, setup: (s) => { s.twist = null; } },
  ],
};

export default usedCar;
