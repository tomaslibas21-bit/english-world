// P27 "With Respect": disagreeing politely in a meeting (advanced, B2–C1).
// Brightline, the glass meeting room, Monday 9:00. Greg (the team manager) opens the meeting and Vanessa (the
// marketing lead) pitches her plan: launch the new website this Friday and shut the old one down the same day.
// The learner says politely that they disagree ("I'd push back a little on that", "I see your point, but I'm not
// sure I agree"), cuts into Vanessa's chart monologue politely ("Sorry, can I just come in here?" from the song, or
// the American "Can I jump in here?"), explains the concern (testing, time, older customers, support, bugs, risk),
// acknowledges her strong point ("That's a fair point. However…"), offers another way ("Could we look at it another
// way?", "What if we…?", "Have we considered…?") and settles it: a compromise ("Agreed." / "Now that works for me.")
// or "Let's agree to disagree", and Greg makes the call. Giving in or walking out ends the meeting without the stamp.
// Twist (more often on later visits): Vanessa cuts in while the learner proposes ("Sorry, can I just come in
// here?"): let her ("Sure, go ahead.") or ask to finish ("Could I just finish my point?").
// Variety: Vanessa may refuse the first proposal (stubborn); the goodbye ends with coffee or with the color of the
// new buttons (blue, green… teal); Greg reminds a returning player of last week's doubts.
//
// Address: Vanessa and the learner say tu (peer colleagues); Greg says tu to the learner and the plural jūs to the
// room ("Matote?", "tęskite", "jūs abu"). Speakers: V() and G() below switch the speaker before every line.
// The learner's own gender: {m:…|f:…}; Vanessa (f) and Greg (m) have fixed genders, so their own forms are written
// out, and {sm:…|sf:…} in hints follows the person spoken to.
//
// Outcomes (c.s.outcome): "deal" (compromise) and "boss" (agree to disagree, Greg decides) end with the stamp when
// every checklist item is ticked; "gave_in" and "walked" never get it. The course's end notes ("Šįkart nusileidai…",
// "Susirinkimas nebaigtas…") have no place in the engine: they travel in a harmless c.event("meeting-outcome").
//
// NEEDS: (optional) Game.ts could show c.event("meeting-outcome", { outcome, done, note }) as an end card or toast: the
// spec's end notes for "gave_in" and "walked" travel in `note`; the game ignores the event today.
//
// ART: no pictures yet (src/ui/scene-data/p27-meeting.json is the lead's). Warm, flat town style; the glass meeting
// room of s34 on a Monday morning, the harbor through the window. Vanessa and Greg as in npcs.ts (Vanessa, early 40s:
// dark curly hair, red blazer, earrings and lanyard; Greg, mid-50s: short gray hair, gray beard, reading glasses
// pushed up, cardigan, a huge coffee mug).
//   1. "pitch"   (start, pitch): Vanessa by the big wall screen with a rising bar chart, clicker in hand, mid-sentence;
//                Greg at the head of the table with a huge coffee mug; the player's empty chair facing her; two
//                interns at the back sharing a bag of popcorn.
//   2. "charts"  (charts, reason): close on Vanessa in full flow, one hand up at a screen full of charts ("slide 9");
//                the interns lean in, popcorn halfway to their mouths.
//   3. "counter" (counter, alternative, twist): the screen shows a phone mockup of the old site and "$4,000/month";
//                Vanessa turned to the player, eyebrows up; Greg sipping, amused.
//   4. "resolve" (resolve, so_agree): everyone leaning over the table; Greg with a hand raised, about to make the call.
//   5. "teal"    (closing, coffee, teal, teal2): the screen now shows three button swatches, blue, green and a teal one
//                in between; Vanessa half-smiling, two coffee cups.

import type { Ctx, Pending, Segment, SituationDef, Suggestion, Tip } from "../types";
import { t } from "../dsl";
import { GLOBAL_HANDLERS } from "../global";

// ---------------------------------------------------------------------------
// Flags used more than once

const F_DO_WH = "Question “do” has no Lithuanian word; the tense sits on the verb.";
const F_DO_Q = "Question “do” = the particle ar.";
const F_IS_Q = "“Is” in a yes/no question = the particle ar.";
const F_IM_NOT = "The copula of “I'm” takes the negation in Lithuanian: nesu stands under “not”.";
const F_AR = "Zero “that” before the clause: Lithuanian needs ar (whether) here.";
const F_ID = "“'d” (would) is carried by the conditional ending of the verb.";
const F_DUR = "Duration “for”: the accusative dvi savaites carries it.";
const F_IT_SITE = "“it” = the website (svetainė), so the feminine ją.";
const F_THERE = "Existential “there” has no Lithuanian word; yra (under “Is”) carries it.";
const F_IS_NOT = "“'s” (is): nėra (under “not”) carries it.";

// ---------------------------------------------------------------------------
// Speakers and per-turn helpers

/** Vanessa / Greg say a line (the speaker switches first). */
const V = (c: Ctx, line: string) => { c.speaker("vanessa"); c.say(line); };
const G = (c: Ctx, line: string) => { c.speaker("greg"); c.say(line); };

// The dialogue builds a fresh context for every learner turn, so these mark things per turn.
const TURN = new WeakMap<Ctx, Set<string>>();
/** True the first time per turn for this key (one answer may arrive as several pieces). */
function once(c: Ctx, key: string): boolean {
  let s = TURN.get(c);
  if (!s) { s = new Set(); TURN.set(c, s); }
  if (s.has(key)) return false;
  s.add(key);
  return true;
}
/** A proposal made in this very turn (Vanessa may cut in only while the learner is proposing). */
const FRESH = new WeakSet<Ctx>();

const CONCERNS = ["c_test", "c_time", "c_cust", "c_support", "c_bugs", "c_risk"];
const ALTS = ["a_beta", "a_backup", "a_delay", "a_train", "a_inform", "a_fix", "a_mid"];
const QS: Record<string, string> = { q_test: "c_test", q_time: "c_time", q_cust: "c_cust", q_support: "c_support", q_bugs: "c_bugs", q_risk: "c_risk" };
/** The concern a piece carries (a concrete one wins over "it's not that clear"). */
const concernOf = (sg?: Segment) => sg?.tags.find((x) => CONCERNS.includes(x)) ?? (sg?.tags.includes("c_vague") ? "c_vague" : null);
const altOf = (sg?: Segment) => sg?.tags.find((x) => ALTS.includes(x)) ?? null;
const qOf = (sg?: Segment) => sg?.tags.find((x) => x.startsWith("q_")) ?? null;
/** "Sorry, …" / "Excuse me, …" before the learner's point: a polite way in while Vanessa is talking. */
const politeOpener = (c: Ctx) => /^\W*(sorry|excuse me|pardon( me)?|i'?m sorry|i am sorry|so sorry)\b/i.test(c.heard || "");
const LEAVING = /\b(have to|need to|must|got to|gotta|should) (go|run|leave)\b|\b(another|a) (meeting|call)\b/i;
const saysNo = (c: Ctx) => /^\W*(no|nope|nah)\b/i.test(c.heard || "");
/** Asked as a question: a "?" or a question word first ("The support team is ready." is no question). */
const asked = (c: Ctx) => /\?\s*["”')]*\s*$/.test(c.heard || "") || /^\W*(is|are|was|were|have|has|did|do|does|what|why|how|who|when|where|which|can|could|will|would)\b/i.test(c.heard || "");

type Phase = "pitch" | "charts" | "reason" | "counter" | "alternative" | "resolve" | "closing" | "ended";
const STEP_IDS = new Set(["pitch", "charts", "reason", "counter", "alternative", "resolve"]);
const counterDone = (c: Ctx) => !!c.s.acked || (c.s.tries?.counter ?? 0) >= 2;
/** Where the meeting is (from the state, so a long answer in several pieces is read in order). */
function phase(c: Ctx): Phase {
  if (c.s.ended) return "ended";
  if (c.s.outcome) return "closing";
  if (!c.s.disagreed) return "pitch";
  if (!c.s.interrupted && !c.s.chartsOver) return "charts";
  if (!c.s.reasonHeard) return "reason";
  if (!counterDone(c)) return "counter";
  if (!c.s.altHeard) return "alternative";
  return "resolve";
}
/** Vanessa reacted and waits for the learner: hold the turn at the step of the current phase (its question and
 *  its help are shown), without asking it again. */
function waitHere(c: Ctx) {
  const ph = phase(c);
  if (STEP_IDS.has(ph) && c.step !== ph) { c.s.quiet = ph; c.ask(ph); return; }
  c.hold();
}
/** A step asked only to make it the current one (waitHere): it says nothing. */
function quiet(c: Ctx, id: string): boolean {
  if (c.s.quiet !== id) return false;
  c.s.quiet = null;
  return true;
}
/** Greg asks everyone to be nice once the learner has been blunt twice. */
function maybeFriendly(c: Ctx) {
  if (c.s.blunt >= 2 && !c.s.friendlySaid) { c.s.friendlySaid = true; G(c, "g_friendly"); }
}

// ---------------------------------------------------------------------------
// The learner's concern and proposal

/** A concern said while Vanessa wasn't listening: it counts, she answers it later. */
function storeConcern(c: Ctx, tag: string | null) {
  if (!tag || tag === "c_vague") return;
  c.s.reason = tag;
  c.s.reasonGiven = true;
}
/** A proposal (a_other: "Could we look at it another way?" with nothing concrete yet). */
function storeAlt(c: Ctx, tag: string | null, sg?: Segment) {
  if (!tag) return;
  c.s.altGiven = true;
  if (tag === "a_other") return;
  c.s.alt = tag;
  if (tag === "a_beta") c.s.altSoft = !!sg?.tags.includes("soft"); // "a soft launch" rather than "a beta"
  FRESH.add(c);
}
/** Vanessa hears the concern and answers it. */
function hearReason(c: Ctx, tag: string) {
  c.s.reason = tag;
  c.s.reasonGiven = true;
  c.s.reasonHeard = true;
  c.s.floorGiven = true;
  V(c, `v_${tag}`);
}
/** No concern after three prompts: Vanessa answers the one she expects anyway (no dead end, no tick). */
function guessReason(c: Ctx) {
  const tag = c.s.reason ?? "c_time";
  c.s.reason = tag;
  c.s.reasonHeard = true;
  V(c, `v_${tag}`);
}
/** Vanessa reacts to a proposal. */
function reactAlt(c: Ctx, tag: string) {
  c.s.altHeard = true;
  c.s.heardAlts = [...(c.s.heardAlts || []), tag];
  if (tag === "a_mid") { c.s.softened = true; V(c, "v_soften"); return; }
  V(c, tag === "a_beta" && c.s.altSoft ? "v_a_soft" : `v_${tag}`);
}
/** Vanessa hears a proposal; the first one made in this turn may be cut in on (twist). */
function hearAlt(c: Ctx, tag: string, fresh: boolean): "twist" | "heard" {
  if (fresh && c.s.twist && !c.s.twistFired) { fireTwist(c, tag); return "twist"; }
  reactAlt(c, tag);
  return "heard";
}

// ---------------------------------------------------------------------------
// The twist: Vanessa cuts in while the learner proposes

function fireTwist(c: Ctx, tag: string) {
  c.twist("interrupt");
  c.s.twistFired = true;
  c.s.twistOpen = true;
  c.s.twistTag = tag;
  V(c, "v_twist_cut");
  c.expect({
    id: "twist", optional: true, expects: ["let_her_ctx", "finish_first", "rude_interrupt"], hints: ["twist"],
    suggest: [{ lt: "Leisti Vanesai įsiterpti arba paprašyti leisti baigti", hint: "twist" }],
    yes: (cc) => twistAnswer(cc, "let"),
    no: (cc) => twistAnswer(cc, "rude"),
    on: {
      let_her_ctx: (cc) => twistAnswer(cc, "let"),
      finish_first: (cc) => twistAnswer(cc, "finish"),
      rude_interrupt: (cc) => twistAnswer(cc, "rude"),
      g_wait: (cc) => twistAnswer(cc, "finish"),
      g_ok: (cc) => twistAnswer(cc, "let"),
      g_thanks: (cc) => twistAnswer(cc, "let"),
    },
  });
}

/** Anything else while Vanessa is cutting in: she takes it as a yes and makes her point. */
function twistGuard(c: Ctx): boolean {
  if (!c.s.twistOpen) return false;
  twistAnswer(c, "let");
  return true;
}

/** Let her in, ask to finish, or tell her off; then Greg calms the room and Vanessa answers the proposal. */
function twistAnswer(c: Ctx, kind: "let" | "finish" | "rude") {
  if (!c.s.twistOpen) return;
  c.s.twistOpen = false;
  if (kind === "let") { c.s.twistDone = true; V(c, "v_twist_point"); }
  else if (kind === "finish") { c.s.twistDone = true; V(c, "v_twist_sorry"); }
  else { c.s.blunt++; c.tip(TIPS.rude_twist); V(c, "v_excuse_me"); }
  if (c.s.blunt >= 2 && !c.s.friendlySaid) { c.s.friendlySaid = true; G(c, "g_friendly"); }
  else G(c, "g_popcorn");
  reactAlt(c, c.s.twistTag);
}

// ---------------------------------------------------------------------------
// The endings

function deal(c: Ctx) { if (c.s.outcome) return; V(c, "v_deal"); c.s.outcome = "deal"; }
function gregDecides(c: Ctx) {
  if (c.s.outcome) return;
  G(c, "g_decide1"); G(c, "g_decide2"); G(c, "g_decide3");
  c.s.outcome = "boss";
}
function gaveIn(c: Ctx) {
  if (c.s.outcome) return;
  V(c, "v_gave_in"); G(c, "g_gave_in");
  c.s.outcome = "gave_in";
}
/** The learner leaves the meeting: Greg closes it, nothing is settled. */
function walk(c: Ctx) {
  if (c.s.ended) return;
  G(c, "g_walk");
  c.s.outcome = "walked";
  c.s.ended = true;
  c.event("meeting-outcome", { outcome: "walked", done: false, note: NOTES.walked });
  c.end();
  c.hold();
}
function bye(c: Ctx) { c.s.ended = true; c.s.closingState = "done"; c.end(); c.hold(); }

/** Every checklist item ticked (the twist only when it happened). */
function allDone(c: Ctx): boolean {
  return !!c.s.disagreed && !c.s.rudeOpen && !!c.s.interruptedPolite && !!c.s.reasonGiven && !!c.s.acked && !!c.s.altGiven
    && (c.s.outcome === "deal" || c.s.outcome === "boss") && (!c.s.twistFired || !!c.s.twistDone);
}

const NOTES: Record<string, string> = {
  gave_in: "Šįkart nusileidai. Pabandyk dar kartą – mandagiai apginti savo nuomonę.",
  walked: "Susirinkimas nebaigtas. Kitą kartą pabandyk sutarti.",
};

// ---------------------------------------------------------------------------
// The goodbye: "Same time Monday?", then coffee or the color of the buttons

function closingPending(): Pending {
  return {
    id: "closing", expects: ["monday_yes", "monday_no_ctx"], hints: ["bye"],
    suggest: [{ lt: "Atsakyti Gregui ir atsisveikinti", hint: "bye" }],
    yes: (cc) => closingTurn(cc, "yes"),
    no: (cc) => closingTurn(cc, "no"),
    on: {
      monday_yes: (cc) => closingTurn(cc, "yes"),
      monday_no_ctx: (cc) => closingTurn(cc, "no"),
      g_bye: (cc) => closingTurn(cc, "bye"),
      g_thanks: (cc) => closingTurn(cc, "yes"),
      g_ok: (cc) => closingTurn(cc, "yes"),
    },
  };
}

/** Vanessa's last word: cold after a rude meeting, a plain goodbye after giving in, otherwise coffee or teal. */
function flair(c: Ctx) {
  if (c.s.outcome === "gave_in") { V(c, "v_bye"); bye(c); return; }
  if (c.s.blunt >= 2) { V(c, "v_cold_bye"); bye(c); return; }
  if (c.s.flair === "coffee") {
    c.s.closingState = "coffee";
    V(c, "v_coffee");
    c.expect({
      id: "coffee", expects: ["coffee_yes_ctx", "coffee_no_ctx"], hints: ["coffee"],
      suggest: [{ lt: "Priimti arba atsisakyti kvietimo", hint: "coffee" }],
      yes: (cc) => closingTurn(cc, "yes"), no: (cc) => closingTurn(cc, "no"),
      on: {
        coffee_yes_ctx: (cc) => closingTurn(cc, "yes"), coffee_no_ctx: (cc) => closingTurn(cc, "no"),
        g_thanks: (cc) => closingTurn(cc, "yes"), g_bye: (cc) => closingTurn(cc, "no"), g_ok: (cc) => closingTurn(cc, "yes"),
      },
    });
    return;
  }
  c.s.closingState = "teal";
  V(c, "v_teal1");
  c.expect({
    id: "teal", expects: ["teal_ctx", "disagree_polite"], hints: ["teal"],
    suggest: [{ lt: "Atsakyti apie mygtukų spalvą", hint: "teal" }],
    yes: (cc) => closingTurn(cc, "yes"), no: (cc) => closingTurn(cc, "no"),
    on: {
      teal_ctx: (cc, _sl, sg) => closingTurn(cc, sg.tags.includes("teal") ? "teal" : sg.tags.includes("blue") ? "yes" : "green"),
      disagree_polite: (cc) => closingTurn(cc, "green"),
      g_bye: (cc) => closingTurn(cc, "bye"),
    },
  });
}

/** One answer at the goodbye (kind: yes / no / bye / green / teal / other). */
function closingTurn(c: Ctx, kind: string) {
  if (!once(c, "closing")) return;
  const st = c.s.closingState;
  if (st === "monday") {
    if (kind === "no") G(c, "g_calendar");
    // "Sorry, I have to go.": no coffee or colors, just the goodbye
    if (kind === "bye" && LEAVING.test(c.heard || "")) { V(c, c.s.blunt >= 2 ? "v_cold_bye" : "v_bye"); bye(c); return; }
    flair(c);
    return;
  }
  if (st === "coffee") {
    V(c, kind === "yes" ? "v_coffee_yes" : kind === "no" ? "v_coffee_no" : "v_bye");
    bye(c);
    return;
  }
  if (st === "teal") {
    if (kind === "green" || kind === "no") {
      c.s.closingState = "teal2";
      V(c, "v_teal2");
      c.expect({
        id: "teal2", expects: ["teal_ctx", "accept_deal"], hints: ["teal"],
        suggest: [{ lt: "Sutikti dėl spalvos", hint: "teal" }],
        yes: (cc) => closingTurn(cc, "teal"), no: (cc) => closingTurn(cc, "no"),
        on: { teal_ctx: (cc) => closingTurn(cc, "teal"), accept_deal: (cc) => closingTurn(cc, "teal") },
      });
      return;
    }
    V(c, kind === "teal" ? "v_teal3" : "v_bye");
    bye(c);
    return;
  }
  if (st === "teal2") {
    V(c, kind === "no" ? "v_bye" : "v_teal3");
    bye(c);
  }
}

// ---------------------------------------------------------------------------
// The learner's moves, read against where the meeting is

/** Agreeing with Vanessa's plan at the start: once she is pleased, twice the learner has given in. */
function agreePlan(c: Ctx) {
  if (!c.s.agreedOnce) {
    c.s.agreedOnce = true;
    V(c, "v_love");
    G(c, c.visits >= 1 ? "g_doubts" : "g_anyone");
    waitHere(c);
    return;
  }
  gaveIn(c);
}

/** A positive remark about the plan ("The new site is ready."): nothing to answer; Vanessa asks again. */
function agreePlanWeak(c: Ctx) { if (once(c, "react")) waitHere(c); }

/** Interrupting the monologue: politely ("Oh, sorry.") or rudely ("Excuse me? …Fine."). */
function interruptNow(c: Ctx, polite: boolean, withPoint: boolean) {
  c.s.interrupted = true;
  if (polite) c.s.interruptedPolite = true;
  c.s.chartsEnd = polite ? "polite" : "rude";
  if (!polite) { c.s.blunt++; c.tip(TIPS.rude_stop); }
  if (!withPoint) return; // the reason step gives the floor ("Oh, sorry. Go ahead.")
  c.s.floorGiven = true;
  if (polite) V(c, "v_oh_sorry");
  else { V(c, "v_excuse_me"); maybeFriendly(c); }
}

/** A short "no" at the start: "No? Just 'no'? Care to elaborate?" */
function bareNo(c: Ctx) {
  c.s.disagreed = true;
  c.tip(TIPS.soften);
  V(c, "v_no_elab");
  c.hold(); // the pitch step (and its help) stays: "Care to elaborate?"
}

/** Not acknowledging Vanessa's counterpoint (disagreeing again, a reason, "no"). */
function notAck(c: Ctx) {
  if (!c.s.counterSaid) return; // she hasn't made her point yet
  c.s.tries.counter++;
  if (c.s.tries.counter >= 2) { V(c, "v_no_hear"); maybeFriendly(c); return; } // she gives up on it and moves on
  V(c, "v_no_listen");
  maybeFriendly(c);
  waitHere(c);
}

function onDisagree(c: Ctx, sg: Segment | undefined, rude = false) {
  if (twistGuard(c)) return;
  const ph = phase(c);
  if (ph === "ended") return;
  if (ph === "closing") { closingTurn(c, "green"); return; }
  if (rude && once(c, "rude")) c.s.blunt++;
  const conc = concernOf(sg);
  switch (ph) {
    case "pitch":
      c.s.disagreed = true;
      if (rude) { c.s.rudeOpen = true; V(c, "v_rude"); }
      storeConcern(c, conc);
      storeAlt(c, altOf(sg), sg);
      return; // the charts follow ("Oh, I knew someone would say that.")
    case "charts":
      if (politeOpener(c) && !rude) { interruptNow(c, true, true); onDisagree(c, sg); return; }
      storeConcern(c, conc);
      return; // she talks over it
    case "reason":
      c.s.floorGiven = true;
      if (conc && conc !== "c_vague") { hearReason(c, conc); return; }
      if (!once(c, "react")) return;
      V(c, conc === "c_vague" ? "v_c_vague" : "v_why_again");
      maybeFriendly(c);
      waitHere(c);
      return;
    case "counter":
      storeConcern(c, conc);
      if (once(c, "react")) notAck(c);
      return;
    case "alternative":
      storeConcern(c, conc);
      return; // the step asks again ("Is there a middle ground here?"), unless a proposal comes with it
    case "resolve":
      resolveTurn(c, "disagree", sg);
      maybeFriendly(c);
      return;
  }
}

function onAck(c: Ctx, sg: Segment | undefined, kind: "ack" | "agree" | "accept") {
  if (twistGuard(c)) return;
  const ph = phase(c);
  if (ph === "ended") return;
  if (ph === "closing") { closingTurn(c, "yes"); return; }
  const weak = !!sg?.tags.includes("weak");
  const alt = altOf(sg), conc = concernOf(sg);
  switch (ph) {
    case "pitch":
      if (weak) { if (once(c, "react")) { V(c, "v_reask"); waitHere(c); } return; }
      if (conc || alt) { onDisagree(c, sg); return; } // "Good point, but we need more time."
      agreePlan(c);
      return;
    case "charts":
      return; // she talks over it
    case "reason":
      if (conc && conc !== "c_vague") { c.s.floorGiven = true; hearReason(c, conc); }
      return; // otherwise she asks again what the problem is
    case "counter":
      if (!c.s.counterSaid) return;
      if (!c.s.acked) { c.s.acked = true; V(c, "v_thanks_ack"); }
      storeConcern(c, conc);
      storeAlt(c, alt, sg); // "…however, what if we…": heard right away (the alternative step)
      return;
    case "alternative":
      if (alt) onOffer(c, sg, false);
      return; // otherwise the step asks again
    case "resolve":
      if (alt) { onOffer(c, sg, false); return; }
      // "Three weeks works for me." to her two weeks: that's bargaining
      if (kind === "accept" && (c.s.offer ?? "half") === "half" && weeksOf(sg) >= 3) { resolveTurn(c, "counter", sg); return; }
      resolveTurn(c, weak ? "unsure" : kind === "ack" ? "ack" : "accept", sg);
      return;
  }
}

function onOffer(c: Ctx, sg: Segment | undefined, counter: boolean) {
  if (twistGuard(c)) return;
  const ph = phase(c);
  if (ph === "ended") return;
  if (ph === "closing") { closingTurn(c, "other"); return; }
  const alt = altOf(sg) ?? (counter ? "a_delay" : "a_other");
  switch (ph) {
    case "pitch":
      c.s.disagreed = true;
      storeAlt(c, alt, sg);
      storeConcern(c, concernOf(sg));
      return;
    case "charts":
      if (politeOpener(c)) { interruptNow(c, true, true); onOffer(c, sg, counter); return; }
      storeAlt(c, alt, sg);
      return;
    case "reason":
      storeAlt(c, alt, sg);
      c.s.floorGiven = true;
      if (!once(c, "react")) return;
      V(c, "v_problem_first");
      waitHere(c);
      return;
    case "counter":
      storeAlt(c, alt, sg);
      if (!c.s.counterSaid || !once(c, "react")) return;
      if (!c.s.firstAgreeSaid) { c.s.firstAgreeSaid = true; c.s.tries.counter++; V(c, "v_first_agree"); waitHere(c); return; }
      c.s.tries.counter++; // asked twice: she moves on and hears the proposal
      return;
    case "alternative":
      if (alt === "a_other") {
        storeAlt(c, alt, sg);
        if (!once(c, "react")) return;
        c.s.altOther = true;
        V(c, "v_a_other");
        waitHere(c);
        return;
      }
      storeAlt(c, alt, sg);
      if (!once(c, "hear")) return;
      hearAlt(c, alt, true); // a twist holds the turn; otherwise the compromise follows
      return;
    case "resolve":
      storeAlt(c, alt === "a_other" ? null : alt, sg);
      if (alt === "a_other") c.s.altGiven = true;
      resolveTurn(c, counter ? "counter" : "offer", sg);
      return;
  }
}

function onQuestion(c: Ctx, sg: Segment | undefined) {
  if (twistGuard(c)) return;
  const ph = phase(c);
  if (ph === "ended") return;
  if (ph === "closing") { closingTurn(c, "other"); return; }
  const q = qOf(sg);
  if (!asked(c)) { if (ph === "pitch") agreePlanWeak(c); return; } // a statement: "The support team is ready."
  const conc = q ? QS[q] : undefined;
  const answer = () => V(c, q === "q_old" ? "v_q_old" : conc ? `v_${conc}` : "v_q_answer");
  if (!once(c, "react")) return;
  switch (ph) {
    case "pitch":
      answer();
      if (!c.s.notConvinced) { c.s.notConvinced = true; V(c, "v_not_convinced"); }
      waitHere(c);
      return;
    case "charts":
      if (politeOpener(c)) { interruptNow(c, true, true); onQuestion(c, sg); }
      return; // she talks over it
    case "reason":
      c.s.floorGiven = true;
      if (conc) { hearReason(c, conc); return; } // "Have we tested it?" is the concern
      answer();
      waitHere(c);
      return;
    case "resolve":
      c.s.tries.resolve++;
      answer();
      waitHere(c);
      return;
    default:
      answer();
      waitHere(c);
  }
}

/** "Sorry, can I just come in here?" / "Stop talking." */
function onInterrupt(c: Ctx, sg: Segment | undefined, polite: boolean) {
  if (twistGuard(c)) return;
  const ph = phase(c);
  if (ph === "ended") return;
  if (ph === "closing") { closingTurn(c, "other"); return; }
  const conc = concernOf(sg);
  if (ph === "charts") {
    if (!conc) { interruptNow(c, polite, false); return; }
    interruptNow(c, polite, true);
    if (conc === "c_vague") { V(c, "v_c_vague"); waitHere(c); return; }
    hearReason(c, conc);
    return;
  }
  if (!polite) { // nobody is monologuing: still rude
    if (once(c, "rude")) c.s.blunt++;
    c.tip(TIPS.rude_stop);
    if (!once(c, "react")) return;
    V(c, "v_excuse_me");
    maybeFriendly(c);
    waitHere(c);
    return;
  }
  if (conc) { onDisagree(c, sg); return; } // the point that came with it
  if (!once(c, "react")) return;
  if (ph === "reason") c.s.floorGiven = true;
  V(c, "v_go_ahead");
  waitHere(c);
}

function onAgreeToDisagree(c: Ctx) {
  if (twistGuard(c)) return;
  const ph = phase(c);
  if (ph === "ended") return;
  if (ph === "closing") { closingTurn(c, "other"); return; }
  switch (ph) {
    case "pitch":
      c.s.disagreed = true; // too early, but clearly a "no"
      return;
    case "charts":
      return; // she talks over it
    case "reason":
      c.s.floorGiven = true;
      if (!once(c, "react")) return;
      V(c, "v_problem_first");
      waitHere(c);
      return;
    case "counter":
      if (once(c, "react")) notAck(c);
      return;
    case "alternative":
      // the way forward the learner proposes: Greg decides
      c.s.altGiven = true;
      c.s.altHeard = true;
      if (!once(c, "react")) return;
      V(c, "v_atd"); V(c, "v_impossible");
      gregDecides(c);
      return;
    case "resolve":
      resolveTurn(c, "atd");
      return;
  }
}

/** Weeks the learner asks for ("How about three weeks?", "a month"); 0 = not said. */
function weeksOf(sg?: Segment): number {
  const tags = sg?.tags ?? [];
  const w = tags.find((x) => /^w\d+$/.test(x));
  if (w) return Number(w.slice(1));
  const n = Number(sg?.slots?.wk);
  if (n > 0) return n;
  return tags.includes("more") ? 3 : 0;
}

/** The last round: Vanessa's compromise ("half"), her final offer ("final") or her refusal ("none"). */
function resolveTurn(c: Ctx, kind: "accept" | "ack" | "offer" | "counter" | "disagree" | "atd" | "no" | "unsure" | "boss" | "give_in", sg?: Segment) {
  if (c.s.outcome || !once(c, "resolve")) return;
  if (kind === "give_in") { gaveIn(c); return; }
  if (kind === "boss") { gregDecides(c); return; }
  c.s.tries.resolve++;
  const off = c.s.offer ?? "half";
  if (off === "none") {
    if (kind === "accept" || kind === "ack") { V(c, "v_so_agree"); expectSoAgree(c); return; }
    if (kind === "offer" || kind === "counter") {
      c.s.softened = true; c.s.offer = "half";
      const tag = altOf(sg);
      if (tag) storeAlt(c, tag, sg);
      V(c, "v_soften"); V(c, "v_compromise"); V(c, "v_deal_q");
      waitHere(c);
      return;
    }
    if (kind === "atd") { V(c, "v_atd"); V(c, "v_impossible"); gregDecides(c); return; }
    if (c.s.round >= 1 || c.s.tries.resolve >= 4) { gregDecides(c); return; }
    c.s.round = 1;
    V(c, "v_round");
    waitHere(c);
    return;
  }
  // "half" (Meet me halfway… Deal?) or "final" (Three weeks. Final offer.)
  if (kind === "accept" || kind === "ack") { deal(c); return; }
  if (kind === "atd") { V(c, "v_atd"); gregDecides(c); return; }
  if (off === "final" && kind === "unsure") { deal(c); return; } // anything that isn't a "no"
  if (kind === "counter") {
    if (off === "final") { gregDecides(c); return; }
    const w = weeksOf(sg);
    if (w > 0 && w <= 2) { deal(c); return; }
    c.s.offer = "final";
    V(c, "v_final_offer");
    waitHere(c);
    return;
  }
  if (kind === "offer") {
    const tag = altOf(sg);
    if (tag && tag !== "a_mid" && !(c.s.heardAlts || []).includes(tag)) {
      storeAlt(c, tag, sg);
      reactAlt(c, tag);
      V(c, "v_deal_q");
      waitHere(c);
      return;
    }
  }
  if (off === "final" || c.s.halfway >= 1 || c.s.tries.resolve >= 4) { gregDecides(c); return; }
  c.s.halfway = 1;
  V(c, "v_halfway");
  waitHere(c);
}

/** "So you agree with me?" (Vanessa refused the proposal and the learner said she was right). */
function expectSoAgree(c: Ctx) {
  c.expect({
    id: "so_agree", optional: true, expects: ["agree_to_disagree", "disagree_polite", "offer_alt", "counter_offer", "give_in"], hints: ["resolve"],
    suggest: [{ lt: "Pasakyti, kad vis dėlto nesutinki, arba sutarti, kad nesutariate", hint: "resolve" }, { lt: "Pasiūlyti kitą sprendimą", hint: "alt" }],
    yes: (cc) => gaveIn(cc),
    no: (cc) => resolveTurn(cc, "no"),
    on: {
      give_in: (cc) => gaveIn(cc),
      accept_deal: (cc) => { if (saysNo(cc)) resolveTurn(cc, "no"); else gaveIn(cc); },
      agree_plan: (cc) => { if (saysNo(cc)) resolveTurn(cc, "no"); else gaveIn(cc); },
      ack_point: (cc, _sl, sg) => {
        if (altOf(sg)) { onOffer(cc, sg, false); return; }
        if (saysNo(cc) || concernOf(sg)) { resolveTurn(cc, "disagree", sg); return; }
        gaveIn(cc);
      },
      agree_to_disagree: (cc) => resolveTurn(cc, "atd"),
      disagree_polite: (cc, _sl, sg) => resolveTurn(cc, "disagree", sg),
      give_reason: (cc, _sl, sg) => resolveTurn(cc, "disagree", sg),
      offer_alt: (cc, _sl, sg) => onOffer(cc, sg, false),
      counter_offer: (cc, _sl, sg) => onOffer(cc, sg, true),
    },
  });
}

// ---------------------------------------------------------------------------
// Tips

const TIPS: Record<string, Tip> = {
  soften: { key: "soften", lt: "Suprasta! Tiesiog „No“ ar „I disagree“ amerikiečių susirinkime skamba gana kietai. Dažniau sušvelninama: „I'm not sure I agree“ arba „I'd push back a little on that“.", better: "I see your point, but I'm not sure I agree." },
  too_blunt: { key: "too_blunt", lt: "Suprasta! Bet taip kolegai sakyti per griežta – darbe kritikuojama idėja, o ne žmogus. Pradėk nuo „With respect…“ ir pasakyk, kas tau neramu.", better: "With respect, I'm not sure that's the best approach." },
  rude_stop: { key: "rude_stop", lt: "Suprasta! Taip pertraukti kolegą – grubu. Mandagiau atsiprašyti ir paprašyti žodžio.", better: "Sorry, can I just come in here?" },
  rude_twist: { key: "rude_twist", lt: "Suprasta! Bet taip atsakyti kolegei – grubu. Leisk jai įsiterpti („Sure, go ahead.“) arba mandagiai paprašyk leisti baigti mintį.", better: "Could I just finish my point?" },
  am_agree: { key: "am_agree", lt: "Suprasta! Angliškai „agree“ – veiksmažodis, kaip lietuviškai „sutinku“, todėl be „am“: „I agree“, „I don't agree“.", better: "I'm not sure I agree." },
  sorry_that: { key: "sorry_that", lt: "Suprasta! Lietuvišką „atsiprašau, kad pertraukiu“ angliškai sakome trumpiau: „Sorry to interrupt“.", better: "Sorry to interrupt, but…" },
  give_say: { key: "give_say", lt: "Suprasta! „Duok pasakyti“ angliškai nėra „give me to say“. Sakoma „Let me finish“ (leisk baigti) arba „Could I just finish my point?“", better: "Could I just finish my point?" },
  think_no: { key: "think_no", lt: "Suprasta! „Manau, kad ne“ angliškai – „I don't think so“.", better: "I don't think so." },
  discuss_about: { key: "discuss_about", lt: "Suprasta! „Discuss“ jau reiškia „aptarti“, todėl be „about“: „Can we discuss it?“ (arba „talk about it“).", better: "Can we discuss it?" },
  how_you_think: { key: "how_you_think", lt: "Suprasta! „Kaip manai?“ angliškai – „What do you think?“, ne „How do you think?“.", better: "Greg, what do you think?" },
  due_respect: { key: "due_respect", lt: "Suprasta! „With all due respect“ amerikiečiams dažnai skamba kaip įžanga prieš kandžią kritiką. Draugiškiau: „With respect“ arba „I see your point, but…“", better: "I see your point, but…" },
  have_right: { key: "have_right", lt: "Suprasta! „Tu teisus“ angliškai – „You're right“; dar mandagiau: „That's a fair point“.", better: "That's a fair point." },
  uk_fortnight: { key: "uk_fortnight", lt: "Suprasta! „Fortnight“ (dvi savaitės) – britiškas žodis; amerikiečiai sako „two weeks“.", better: "How about two weeks?" },
  uk_shall: { key: "uk_shall", lt: "Suprasta! Amerikiečiai siūlydami retai sako „Shall we…?“ – dažniau „Should we…?“ arba „Why don't we…?“", better: "Why don't we keep the old site for a month?" },
  uk_keen: { key: "uk_keen", lt: "Suprasta! „I'm not keen on…“ – britiškas posakis. Amerikiečiai dažniau sako „I'm not crazy about…“ arba „I'm not sure about…“.", better: "I'm not sure about that." },
};

// Answers the simulations give when a moment comes up on some seeds only.
const AUTO: Record<string, string> = {
  pitch: "I'm not sure about that.", charts: "Sorry, can I just come in here?", reason: "We haven't tested it yet.",
  counter: "That's a fair point.", alternative: "What if we launch it as a beta?", resolve: "Agreed.",
  twist: "Sure, go ahead.", so_agree: "No, let's agree to disagree.", closing: "Monday works for me.",
  coffee: "I'd love to.", teal: "I'd say green.", teal2: "Teal.",
};

const PITCH_EX = ["disagree_polite", "rude_disagree", "give_reason", "offer_alt", "ask_q", "agree_plan", "ask_boss", "ack_point", "accept_deal", "give_in", "agree_to_disagree", "walk_away"];
const CHARTS_EX = ["interrupt_polite", "interrupt_ctx", "rude_interrupt", "give_reason", "disagree_polite", "offer_alt", "walk_away"];
const REASON_EX = ["give_reason", "concern_ctx", "disagree_polite", "offer_alt", "ask_q", "interrupt_polite", "walk_away"];
const COUNTER_EX = ["site_problem_ctx", "ack_point", "give_reason", "disagree_polite", "rude_disagree", "offer_alt", "agree_to_disagree", "give_in", "agree_plan", "accept_deal", "walk_away"];
const ALT_EX = ["offer_alt", "counter_offer", "agree_to_disagree", "give_in", "give_reason", "ack_point", "ask_boss", "walk_away"];
const RESOLVE_EX = ["accept_deal", "counter_offer", "agree_to_disagree", "offer_alt", "disagree_polite", "ack_point", "agree_plan", "give_in", "ask_boss", "walk_away"];

const SIM = (twist: boolean, stubborn: boolean, flair: "coffee" | "teal") => (s: Record<string, any>) => { s.twist = twist; s.stubborn = stubborn; s.flair = flair; };

// ---------------------------------------------------------------------------

export const meeting: SituationDef = {
  id: "p27-meeting",
  song: "P27",
  songTitle: "With Respect",
  title: { en: "With Respect", lt: "Su visa pagarba" },
  topic: { en: "Disagreeing politely in a meeting", lt: "Mandagus nesutikimas susirinkime" },
  chapter: 8,
  order: 3,
  location: "office",
  npc: "vanessa",
  npcs: ["greg"],
  goal: "Mandagiai nesutik su kolegės planu ir kartu raskite kompromisą.",
  intro: "„Brightline“ biuras, pirmadienis, 9:00, stiklinė posėdžių salė. Kolegė Vanesa pristato planą: šį penktadienį paleisti naują svetainę ir tą pačią dieną išjungti senąją. Tau planas atrodo per skubotas – pasakyk tai mandagiai, bet aiškiai.",

  grammar: {
    macros: {
      site: "(site | website | web site | page | webpage | homepage)",
      plan: "(that | this | it | the plan | your plan | this plan | the idea | your idea | this idea | that idea | the proposal | your proposal | the timing | the date | friday | this friday | the launch | the deadline | launching on friday | shutting down the old @site)",
      // polite openers that aren't built-in leads ("sorry", "well", "honestly"… are)
      soft: "[with respect | with all respect | respectfully | with all due respect #tip:due_respect | to be honest | honestly | sorry | i am sorry | i hear you | but]",
      but: "(but | however | although | though | still | yet)",
      why: "(because | since | as | (the thing | the problem | the issue | my concern | my worry) is [that] | i am (worried | afraid | concerned) [that] | i think [that] | i feel [that] | i mean)",
      // what the concern is about ("My concern is the timing.", "I'm worried about the testing.")
      concern_np: "(the | our) (timing #c_time | deadline #c_time | date #c_time | schedule #c_time | testing #c_test | customers #c_cust | older customers #c_cust | clients #c_cust | users #c_cust | support team #c_support | call center #c_support | bugs #c_bugs | risk #c_risk)",
      weeks: "(a #w1 | one #w1 | two #w2 | three #w3 | four #w4 | a couple of #w2 | a few #w3 | {wk:number}) (week | weeks)",
      dur: "(@weeks | a month #w4 | one month #w4 | two months #w8 | a few days | {number} days | a while | some time | a fortnight #w2 #tip:uk_fortnight)",
      reason_core: [
        // testing
        "(it is | the [new] @site is) not [fully | properly | really | completely] (tested | ready | finished) [yet] #c_test",
        "we (have not | did not | have never) (tested | checked) (it | the [new] @site) [yet | properly | enough | fully] [yet] #c_test",
        "(nobody | no one) (has tested | tested | has checked) (it | the [new] @site) [yet | properly] [on (phones | mobile)] #c_test",
        "(i am not sure | i do not think) (we are | the [new] @site is | the team is | everyone is) ready [for (this | it | friday)] [yet] #c_test",
        "[the] testing is not (finished | done | complete | over) [yet] #c_test",
        "we (need to | must) test (it | the [new] @site) [first | more | properly | again] #c_test",
        "(it | the [new] @site) [still] needs more (testing | tests) #c_test",
        "we [still] need more (testing | tests) #c_test",
        // time
        "(four | 4) days (is | are) not enough [time] #c_time #h:not_enough_time",
        "[this] friday is (too | a bit too | a little too | way too) (soon | early) #c_time",
        "(it is | this is | that is) (too | a bit too | a little too | way too) (fast | soon | quick | early | rushed) #c_time",
        "(it is | this is | that is) [a bit | a little] rushed #c_time",
        "we [still] need more time #c_time",
        "we (do not | will not) have (enough | much) time #c_time",
        "(that is | it is) not enough time #c_time",
        "there is not enough time #c_time",
        "the (deadline | timeline | schedule | timing) is (too | very | really | a bit | a little) (tight | short) #c_time",
        "the (date | launch | launch date | deadline) is (too | a bit too | a little too | way too) (soon | early | fast | close) #c_time",
        "the timing is (wrong | bad | not good | not right) #c_time",
        // customers
        "(many | a lot | most | half) of our (customers | clients | users) are (older | old | over (sixty | {number}) | not young | not good with (computers | technology)) #c_cust #h:older_customers",
        "[our | the] (customers | clients | users | people) (need | will need) [some | more] time [to get used to it | to learn it] #c_cust",
        "[our | the] [old | older] (customers | clients | users) (are used to | know | like | love) the old @site #c_cust",
        "[our | the] (customers | clients | users | people) (will | might | could) (be confused | get confused | get lost | be angry | complain | call us | not find anything) #c_cust",
        "[our | the] (older | old) (customers | clients | users) (will | might) (have problems | get lost | be confused) #c_cust",
        "we (will | could | might) lose (customers | clients | people | users) #c_cust",
        // support
        "(the support team | support | the team | customer service | the call center) (is not | are not) (ready | trained) [yet] #c_support #h:support_not_ready",
        "(nobody | no one) (has trained | trained) the [support] team [yet] #c_support",
        "the [support] team (does not | do not) know the new @site [yet] #c_support",
        "the support team (needs | will need) (training | more time) #c_support",
        // bugs
        "there are [still] [some | a few | many | a lot of] (bugs | problems | errors | issues) [in it | on the new @site | with the new @site] #c_bugs",
        "the (payment | checkout | login | contact) (page | form) [still] (does not work | has (bugs | problems)) [on (phones | mobile)] #c_bugs",
        "(it | the new @site) [still] does not work [well | properly] on (phones | mobile | some browsers | older phones) #c_bugs",
        "(it | the new @site) [still] has (bugs | problems | errors | issues) #c_bugs",
        // risk
        "(it is | this is | that is) (too | very | a bit | a little | really) risky #c_risk",
        "(it | this | that) sounds [a bit | a little | really | very | too] risky #c_risk",
        "(it | this | that) sounds [a bit | a little | really | very] (rushed | fast | too fast) #c_time",
        "(that is | this is | it is) (too much of a | a big | a huge | a) risk #c_risk",
        "what if (it | the new @site | something) (crashes | breaks | goes wrong | does not work) #c_risk",
        "if something goes wrong we (have | will have) no (backup | plan b) #c_risk",
        "we (need | should have) a (backup | plan b) #c_risk",
        "we (do not have | have no | have not got) (a backup | a plan b | backup | plan b) #c_risk",
      ],
      // a concern after a polite "no" ("…, but we haven't tested it", "…. It's not that clear.")
      rtail: [
        "[but | and | so] [@why] @reason_core",
        "[but | and] (it is | that is) not (that | so | very) clear [@reason_core] #c_vague",
      ],
      alt_core: [
        // a beta / soft launch
        "(launch | release | open) it (as | like) a (beta | test | test version | pilot) [first] #a_beta",
        "launch [it] (as | in) beta [first] #a_beta",
        "(do | have | try) a (soft | quiet | slow | test | pilot | partial) (launch | start | release) [first] #a_beta #soft",
        "(do | have | try) a beta (launch | release) [first] #a_beta",
        "(launch | test | try) it (with | for) a (small | smaller) group [of (customers | clients | users)] [first] #a_beta",
        "(test | try) it with (a few | some | ten | {number}) (customers | clients | users) [first] #a_beta",
        "(launch | start) (slowly | step by step | in stages) #a_beta",
        "(start | begin) with a (beta | soft launch | pilot) #a_beta",
        // keep the old site
        "keep the old @site [running | online | up | live | open] [for (@dur | a little longer | a bit longer)] [as a (backup | plan b)] [for now] #a_backup",
        "(run | have | keep) (both | the two) (sites | websites | versions) [running | online] [for (a while | @dur)] [at the same time] #a_backup",
        "(not | do not) (shut | turn | switch) (down | off) the old @site [yet | right away | immediately | on friday] #a_backup",
        "(shut | turn | switch) (down | off) the old @site (later | in @dur | after @dur) #a_backup",
        // later
        "(launch | move | push | postpone | delay) [it | the launch] (to | until | by) (next (friday | week | month) | {day} | the end of the month) #a_delay",
        "(launch | do) [it] (next (friday | week | month) | in (@weeks | a month) | (a | one | two) (week | weeks) later | later) [instead] #a_delay",
        "(postpone | delay | move | push back) (it | the launch | the date) [a little | a bit | by (@weeks | a few days)] #a_delay",
        "push (it | the launch | the date) back [a little | a bit | by (@weeks | a few days) | @weeks] #a_delay",
        "(give | take) (us | ourselves | the team) (more time | another week | (one | two | a | an) [more | extra] (week | weeks)) #a_delay",
        "wait [a | one | another] (week | month) [more] #a_delay",
        // training, telling the customers, fixing the bugs
        "(train | prepare) the (support | support team | team | call center) (first | before (the launch | friday)) #a_train",
        "train (the | our) (people | staff) first #a_train",
        "(tell | warn | email | inform) (the | our) (customers | clients | users) (first | before | in advance) [about it] #a_inform",
        "send (an email | a newsletter | a message) to (the | our) (customers | clients | users) [first] #a_inform",
        "(fix | test) (the | all the) (bugs | problems | payment page | checkout) first #a_fix",
        "fix [the] (bugs | problems) before (the launch | friday | launching) #a_fix",
      ],
      // the same ideas as nouns and -ing forms ("Have we considered a soft launch?", "How about keeping…?")
      alt_np: [
        "(a beta | a beta version | a beta launch) [first] #a_beta",
        "(a soft launch | a test launch | a pilot | a slow launch | a quiet launch) [first] #a_beta #soft",
        "launching it (as | like) a beta [first] #a_beta",
        "testing it with (a few | some) (customers | users) [first] #a_beta",
        "(keeping | running) (the old @site | both sites | both) [for @dur] [as a backup] #a_backup",
        "(waiting | launching later | another week | moving the date | postponing [it | the launch] | delaying [it | the launch]) #a_delay",
        "(waiting | launching) (a week | until next friday | next friday | in @weeks | later) #a_delay",
        "(training | preparing) the [support] team [first] #a_train",
        "(telling | warning | emailing) [the | our] customers [first] #a_inform",
        "fixing the bugs first #a_fix",
      ],
      alt_tail: "[@but | so | for example] (what if we @alt_core | maybe we could @alt_core | we could @alt_core | how about @alt_np | let us @alt_core)",
      // "That's a fair point. However, …"
      ack_tail: "[@but [i still think @reason_core | @rtail | @alt_tail | could we look at it another way]]",
    },
    slots: {},
  },

  intents: {
    // --- polite (and less polite) disagreement -------------------------------------------------------
    disagree_polite: { patterns: [
      "@soft i would push back [a little | a bit | slightly] [on (that | this | the plan | friday | the date | the timing | this one)] [@rtail] #h:push_back",
      "@soft i see your point @but i am not (sure | so sure | convinced) [that] [i agree] [@rtail] #h:see_point",
      "@soft i (see | understand | get | hear) (your point | what you mean | where you are coming from | what you are saying | you) @but [i am not (sure | convinced) | i (do not | can not) [completely | totally | really] agree | i see it differently | i have (some | a few) (concerns | doubts | questions)] [@rtail]",
      "@soft i am not (sure | so sure | convinced) [about @plan] [@rtail] #h:not_sure_about",
      "@soft i am not sure i agree [@rtail] #h:not_sure_agree",
      "@soft i am not (sure | convinced) (that is | this is | it is | friday is) (a good idea | the best idea | the best (approach | way | option | plan) | the right (approach | way | move | decision | time)) [@rtail] #h:not_best",
      "@soft i have (some | a few | a couple of | serious | big | my) (concerns | doubts | questions | worries | reservations) [about @plan] [@rtail] #h:have_concerns",
      "@soft i see (it | this | things) [a (bit | little)] differently [@rtail] #h:with_respect",
      "@soft i have a (different | slightly different) (opinion | view | idea | take) [on this] [@rtail]",
      "@soft i do not think (that is | this is | it is | friday is) a good idea [@rtail]",
      "@soft (that is | it is) not a (good | great) idea [@rtail]",
      "@soft [i think] [(that is | this is | it is)] [a] (bad | really bad) (idea | plan) [@rtail] #tip:soften",
      "@soft i do not think so [@rtail]",
      "@soft i do not (really | completely | totally | fully | quite) agree [with (you | that | this | the plan)] [@rtail]",
      "@soft i am afraid i (do not | can not) agree [@rtail]",
      "@soft i would say [that] (no | not yet | not on friday | it is too (soon | early | fast) | we need more time #c_time | friday is too (soon | early) #c_time)",
      "@soft i am (a bit | a little | slightly | kind of) (worried | concerned | nervous) [about (@plan | @concern_np)] [@rtail] #h:worried",
      "@soft [(it is | that is)] [a | an] (interesting | nice | good | great) (idea | plan) @but [i am not sure | i have (some | a few) concerns] [@rtail]",
      "@soft (i do not think | i am not sure) we should (shut | turn | switch) (down | off) the old @site [on friday | so (soon | fast) | yet | right away] #a_backup",
      "@soft we (should not | can not) (shut | turn | switch) (down | off) the old @site [on friday | so (soon | fast) | yet | right away] #a_backup",
      "@soft i do not think we should (do (this | that | it) | launch [it] (on friday | this friday | so soon | so fast)) [@rtail]",
      "@soft i (do not | can not) agree (that | the) old @site is (a problem | slow | bad | a disaster)",
      "@soft i do not think (it is | the old @site is) (a problem | that bad | so bad)",
      "@soft (maybe | perhaps) not [@rtail]",
      "@soft not so fast @rtail",
      "@soft (is that | is it) (really | actually) a good idea",
      "@soft i am not (with you | on board) [on this | yet]",
      "@soft (can | could) we (discuss | talk about) (it | this | that | the date | friday | the timing) [a little | first | more | a bit more] [@rtail]",
      "@soft (can | could) we discuss about (it | this | that) [@rtail] #tip:discuss_about",
      "@soft i (disagree | do not agree) [with (you | that | this | the plan | your plan | it)] [@rtail] #tip:soften",
      "@soft i am not agree [with (you | that | this | it | the plan | this plan | your plan)] [@rtail] #tip:am_agree",
      "@soft i think (no | not) [@rtail] #tip:think_no",
      "@soft i am not (crazy about | a big fan of | a fan of) @plan [@rtail]",
      "@soft i am not keen on @plan [@rtail] #tip:uk_keen",
      "@soft (that is | it is) not (true | right | fair | a fair point) [@rtail]",
      "@soft i can not (live with that | accept that | agree to that | agree with that)",
      "@soft (that | this | it) does not work for me [@rtail]",
      "@soft (that | it | this) does not sound (good | great | right) [to me] [@rtail]",
      "@soft i do not (like | love) (it | that | the plan | the idea | this plan | this idea) [very much] [@rtail]",
      "@soft [this] friday (does not work | is not (good | possible | realistic | a good idea)) [for me] #c_time",
      "@soft you have not convinced me [yet]",
      "no deal",
      "@soft i still (think | believe) (it is | this is | that is | friday is) (too (soon | early | fast | risky) | a bad idea | not a good idea) [@rtail]",
      "@soft i still have (concerns | doubts | my doubts) [@rtail]",
      "@soft i still (disagree | do not agree)",
    ] },
    rude_disagree: { patterns: [
      "you are (wrong | crazy | joking | kidding | out of your mind | completely wrong | so wrong) #tip:too_blunt #rude",
      "(that is | this is | it is | what a) [a | an] [really | totally | completely] (stupid | terrible | crazy | silly | dumb | ridiculous | horrible | awful | idiotic) (idea | plan) #tip:too_blunt #rude",
      "(that is | this is | it is) [really | totally | completely | just] (stupid | crazy | nonsense | ridiculous | silly | dumb | rubbish | garbage | a joke | insane) #tip:too_blunt #rude",
      "(no way | absolutely not | forget it | not a chance) #tip:too_blunt #rude",
      "(this | that | it) (will | is going to) never work #tip:too_blunt #rude",
      "are you (crazy | kidding | joking | serious) #tip:too_blunt #rude",
      "(i hate | nobody likes) (it | this | that | your (plan | idea) | the plan | this plan) #tip:too_blunt #rude",
      "(terrible | stupid | dumb) idea #tip:too_blunt #rude",
      "you do not know what you are talking about #tip:too_blunt #rude",
    ] },
    agree_plan: { patterns: [
      "[that | it] sounds (good | great | fine | perfect | like a plan | like a good plan) [to me]",
      "(great | good | nice | perfect | excellent | brilliant) (idea | plan)",
      "i [totally | completely | fully] agree [with (you | that | the plan | it)] [completely | totally | one hundred percent]",
      "i am agree [with (you | that | the plan)] #tip:am_agree",
      "i (like | love) (it | the plan | the idea | this plan | this idea | your plan | your idea)",
      "let us (do it | go for it | go with (it | that | your plan))",
      "[this] friday (is | sounds) (fine | good | great | perfect) [for me | with me]",
      "i am (in | on board | with you) [on this]",
      "no (objections | concerns | questions) [from me]",
      "i do not have any (objections | concerns | questions) [about it]",
      "i have no (objections | concerns | questions)",
      "[i think] (it is | that is) a (good | great) (idea | plan)",
      "(it is | that is) (fine | okay | perfect | great) (with me | by me | for me)",
    ] },
    // questions that push back gently ("Why Friday?", "Have we tested it?")
    ask_q: { patterns: [
      "why (friday | this friday | so (soon | fast | quickly) | the rush | the hurry | now | such a hurry) #q_why #h:q_why_friday",
      "what is the (rush | hurry) #q_why #h:q_rush",
      "why (do | must | should) we (launch | do it | hurry | rush) (so soon | so fast | this friday | on friday | now) #q_why",
      "why (are we | do we) (rushing | in a hurry | in such a hurry) #q_why",
      "who (decided | chose | wants) (friday | that | this | this date) #q_why",
      "why is (it | friday | this friday) so important #q_why",
      "(is | was) (it | the new @site) (tested | ready) [already | yet | properly] #q_test",
      "have (we | you) (tested | checked) (it | the new @site) [yet | properly | enough] #q_test #h:q_tested",
      "did (we | you) test (it | the new @site) [yet | properly | enough] #q_test",
      "(is | was) the testing (done | finished) [yet] #q_test",
      "what about [the] testing #q_test",
      "(have we considered | what about) (the | our) (customers | older customers | users | clients) #q_cust",
      "(have we considered | what about) (the | our) support team #q_support",
      "(does | do) the (support team | team | call center) know [about (this | it | the new @site)] #q_support",
      "is the support team ready #q_support",
      "(have we considered | what about) the (risk | risks) #q_risk",
      "(what about | what happens to | what happens with) the old (@site | one) #q_old",
      "what about [the] bugs #q_bugs",
      "(are there | is there) [still] [any] (bugs | problems) #q_bugs",
      "(is | are) (four days | friday | this friday) (enough | realistic | really enough | enough time) #q_time",
      "do we have enough time #q_time",
    ] },
    // the concern (the tag says which)
    give_reason: { patterns: [
      "[@soft] (it is | that is) not that clear @reason_core #h:not_clear",
      "[@soft] [@why] @reason_core",
      "[@soft] (it is | that is) not (that | so | very) clear #c_vague",
      "[@soft] i [just] (do not | can not) see how [it | this] (can | will | is going to) work [by friday] #c_vague",
      "[@soft] (it is | that is) (complicated | not so simple | not that simple) #c_vague",
      "[@soft] i still think @reason_core",
      "[@soft] (my | the | my main | the main | my biggest) (concern | worry | problem | issue) is @concern_np",
      "[@soft] i am [really | very] (worried | concerned) about @concern_np",
    ] },
    // a short answer to "Is it the timing? The testing? The customers?"
    concern_ctx: { patterns: [
      "[the] (timing | time | date | deadline | schedule) [mostly] #c_time",
      "[the] (testing | tests) [mostly] #c_test",
      "[the] (customers | clients | users | older customers) [mostly] #c_cust",
      "[the] (support team | support | call center | customer service) [mostly] #c_support",
      "[the] (bugs | errors) #c_bugs",
      "[the] risk #c_risk",
      "(all of them | everything | all three) #c_time",
    ] },

    // --- cutting into the monologue ------------------------------------------------------------------
    interrupt_polite: { patterns: [
      "[sorry | excuse me | wait | hold on] (can | could | may) i [just] come in [here] [for a (second | moment | minute)] [@rtail] #h:come_in",
      "[sorry | excuse me | wait | hold on] (can | could | may) i [just] jump in [here] [for a (second | moment | minute)] [@rtail] #h:jump_in",
      "(sorry | i am sorry) to (interrupt | cut in | jump in) [you] [but] [@rtail] #h:sorry_interrupt",
      "(sorry | excuse me) for interrupting [you] [but] [@rtail]",
      "[sorry | excuse me | wait | hold on] (can | could | may) i (add | say) something [here] [@rtail] #h:add_something",
      "[sorry | excuse me] (can | could | may) i ask a [quick] question",
      "[sorry | excuse me] (can | could | may) i [just] (stop | interrupt) you (there | for a second | for a moment) [@rtail]",
      "[sorry | excuse me] (can | could | may) i [just] get a word in [here]",
      "[sorry | excuse me] (can | could | may) i (say | add) (one thing | a word)",
      "[sorry | excuse me] (can | could | may) i have a (word | second | moment) [here]",
      "i have a [quick | short] question [for you | here]",
      "if i (can | could | may) [just] (come in | jump in | add something) [here] [@rtail]",
      "(sorry | excuse me) (one | just a) (second | moment | minute) [@rtail]",
      "(sorry | excuse me) @rtail",
      "[sorry | excuse me] (hold on | wait) [a (second | moment | minute)] @rtail",
      "let me say something [here]",
      "sorry before you go on [@rtail]",
      "(sorry | excuse me) that i (interrupt | am interrupting) [you] [but] [@rtail] #tip:sorry_that",
      "[sorry] (give me | let me) to say [something] #tip:give_say",
      "[sorry] give me say [something] #tip:give_say",
    ] },
    // "Excuse me…" / "Sorry, Vanessa…" / "One second…" (only while she is talking)
    interrupt_ctx: { patterns: [
      "(excuse me | sorry | i am sorry | pardon me | so sorry)",
      "(one | just a | a) (second | moment | minute)",
      "(hold on | wait) [a (second | moment | minute)]",
    ] },
    rude_interrupt: { patterns: [
      "(stop | stop it | stop talking | stop there) #rude",
      "(enough | that is enough | okay enough) #rude",
      "(shut up | be quiet | quiet) #rude",
      "(listen to me | listen) #rude",
      "wait wait [wait] #rude",
      "(let me talk | my turn | it is my turn | let me speak) #rude",
      "you talk too much #rude",
      "(you never stop talking | you do not let me talk) #rude",
      "(stop | enough) @rtail #rude",
    ] },

    // --- her strong point -------------------------------------------------------------------------------
    ack_point: { patterns: [
      "@soft that is a (fair | good | valid | great | very good | strong | real | interesting) point [@ack_tail] #h:fair_point",
      "@soft i take (your | you) point [@ack_tail] #h:take_point",
      "@soft (i see | i get | i understand | i hear) your point [@ack_tail]",
      "@soft (good | fair | valid) point [the old @site is (slow | expensive | a problem | bad)] [@ack_tail] #h:good_point",
      "@soft you (are | might be | may be | could be) right [about (that | the (cost | money | price | phones | mobile | old @site | speed | chart | numbers))] [@ack_tail] #h:right_about",
      "@soft (you have | that is) a point [@ack_tail]",
      "@soft you have a (good | fair | valid) point [@ack_tail]",
      "@soft i [totally | completely] agree [with you] (about | on) (that | the (cost | money | price | phones | mobile | old @site | speed)) [@ack_tail]",
      "@soft (true | that is true | fair enough | i can see that | that makes sense | i can not argue with that | you are not wrong) [@ack_tail]",
      "@soft [yes] the old @site is (slow | expensive | old | terrible | a problem | a disaster | bad) [on (phones | mobile)] [@ack_tail]",
      "@soft (that is | it is) a lot of money [@ack_tail]",
      "@soft (4000 | four thousand | {number}) [dollars] [a | per] month is (a lot | expensive | too much | a lot of money) [@ack_tail]",
      "@soft {price} [a | per] month is (a lot | expensive | too much | a lot of money) [@ack_tail]",
      "@soft (the | your) (chart | numbers | data) (is | are | looks | look) (good | great | convincing | impressive) [@ack_tail]",
      "@soft i (did not | never) think (about | of) that [@ack_tail]",
      "@soft i agree (that | the) old @site is (a problem | slow | expensive | bad)",
      "@soft you have right [@ack_tail] #tip:have_right",
      "(i see | i understand | i get it | i hear you | understood | i know) #weak",
    ] },

    // "Do you agree that the old site is a problem?" – "Yes, it is." / "It's not a problem." (only then)
    site_problem_ctx: { patterns: [
      "(it is | it really is | that is) [a] [big | real | huge] problem",
      "[yes] it is",
      "(it is | that is) not [a | that big a | such a | really a] problem #no",
      "the old @site is not [a | that big a | such a] problem #no",
      "i do not think so #no",
      "not really #no",
    ] },

    // --- another way ---------------------------------------------------------------------------------------
    offer_alt: { patterns: [
      "@soft could we look at it (another way | differently | from another angle | a different way | from a different angle) [@alt_tail] #h:look_another_way",
      "@soft (could | can) we (think about | see) it (another way | differently) [@alt_tail]",
      "@soft have we considered @alt_np #h:have_we_considered",
      "@soft (did we | have we) (think | thought) about @alt_np",
      "@soft what if we @alt_core [instead] #h:what_if",
      "@soft (how about | what about) @alt_np #h:how_about",
      "@soft (maybe | perhaps) we (could | can | should) @alt_core [instead]",
      "@soft (why do not we | why not) @alt_core",
      "@soft (i suggest | i would suggest | i propose | my suggestion is | my idea is | i recommend) [that] [we] @alt_core",
      "@soft (let us | we could | we can | we should | can we | could we | we might) @alt_core [instead]",
      "@soft (i think | in my opinion) we (should | could | need to) @alt_core",
      "@soft (one | another) (option | idea) (is | would be) to @alt_core",
      "@soft it would be (better | safer) to @alt_core",
      "@soft (can | could) we (find | make | reach) a compromise #a_mid #h:compromise_q",
      "@soft (let us | maybe we can | maybe we could | we should) (find | make | reach) a compromise #a_mid",
      "@soft (can | could) we meet (halfway | in the middle) #a_mid",
      "@soft (is there | maybe there is) a (middle ground | middle way | compromise) [here] #a_mid",
      "@soft what about a compromise #a_mid",
      "shall we @alt_core #tip:uk_shall",
      "@alt_core",
      "[maybe | perhaps] @alt_np",
    ] },
    // bargaining about the weeks ("How about three weeks?")
    counter_offer: { patterns: [
      "(how about | what about | can we (do | make it) | could we (do | make it) | let us (say | make it)) (@weeks | a month #w4 | one month #w4 | a fortnight #w2 #tip:uk_fortnight) [instead] #h:counter_weeks",
      "(make it | maybe) (@weeks | a month #w4)",
      "(two | 2) weeks is not enough [how about (@weeks | a month #w4)] #more",
      "(one | a) month (would be better | is better) #w4",
      "@weeks (would be | is) better",
      "i (need | want) (@weeks | a month #w4)",
      "(at least | minimum) (@weeks | a month #w4)",
      "[okay | fine | yes] [but] (@weeks | a month #w4) [then]",
    ] },
    accept_deal: { patterns: [
      "[okay | fine | sure | yes | great] agreed #h:agreed",
      "[now] (that | this) works for me #h:works_for_me",
      "[okay | fine | sure | yes | great] [it is a] deal",
      "(you have | you have got | we have) a deal",
      "i can live with that",
      "[that | it] sounds (fair | reasonable)",
      "(okay | fine | all right) let us do (that | it)",
      "let us do (that | it) [then]",
      "i agree (with that | to that | to this)",
      "that is (fair | a fair deal | a good compromise | a fair compromise | fine with me | a deal)",
      "(two #w2 | three #w3 | {wk:number}) weeks (it is | works | is fine | is okay | sounds good) [for me]",
      "[okay | fine] agreed [but] (only | just) @weeks",
      "(that is | this is) a good (compromise | solution)",
      "(perfect | great | excellent | brilliant | wonderful)",
    ] },
    agree_to_disagree: { patterns: [
      "@soft [okay | well | fine] (let us | we will have to | we have to | we should | we can | we could | we will) [just] agree to disagree #h:agree_disagree",
      "@soft (i think | i guess | maybe) we (will have to | have to | should | can | could) agree to disagree",
      "@soft [we] agree to disagree",
      "@soft we see (it | this | things) differently [and that is (okay | fine)]",
      "@soft we [just] (do not | can not | will not) agree [on this] [and that is (okay | fine)]",
      "@soft we have different (opinions | views | ideas)",
      "(let us | maybe we should | we should | can we | could we) ask greg [to decide]",
      "[maybe | perhaps] greg (can | could | should) decide",
      "(let us | maybe we should) let greg decide",
    ] },
    give_in: { patterns: [
      "[okay | fine | all right] you win [let us do it your way]",
      "[okay | fine] (you are right | you win) let us do it your way",
      "[okay | fine] (let us | we can | we will) do it your way",
      "[okay] do it your way",
      "[okay | fine] friday it is",
      "[okay | fine] (let us | we can) (launch | do it) (on friday | this friday) [then] [as you said | like you said]",
      "(i give up | you convinced me | you have convinced me)",
      "forget what i said",
      "[okay] (your plan | the plan) is (better | fine) [after all]",
      "[okay | fine] (let us | we can) (shut down | turn off) the old @site on friday",
      "[okay] i (was wrong | changed my mind)",
    ] },

    // --- the twist: Vanessa cuts in --------------------------------------------------------------------------
    let_her_ctx: { patterns: [
      "(sure | of course | yes | okay | please) (go ahead | go on | jump in | come in) #h:go_ahead",
      "(go ahead | go on | jump in)",
      "(be | feel) my guest",
      "after you",
      "the floor is yours",
      "(go for it | please do)",
      "(sure | of course | please | okay | yes) [what is it]",
    ] },
    finish_first: { patterns: [
      "(could | can | may) i [just] finish [my (point | thought | sentence | idea)] [first] #h:finish_point",
      "let me [just] finish [my (point | thought | sentence | idea)] [first]",
      "[just] (one | a) (second | moment | minute) #h:one_second #wait",
      "i am (not | almost | nearly) (done | finished) [yet]",
      "i was in the middle of something",
      "if i (could | can | may) just finish",
      "(hold on | wait) [a (second | moment)] (i am not (done | finished) [yet] | let me finish)",
      "give me [to] finish #tip:give_say",
      "let me to finish #tip:give_say",
      "i have not finished [yet]",
      "i (want | would like) to finish [my point] [first]",
    ] },

    // --- the people in the room ------------------------------------------------------------------------------
    ask_boss: { patterns: [
      "[greg] what do you think [greg] #h:ask_greg",
      "[greg] how do you think [greg] #tip:how_you_think",
      "[greg] what is your (opinion | view | take) [greg]",
      "greg (can | could) you decide",
      "(what | how) about you greg",
      "(you are | greg is) the boss",
      "it is your (call | decision) [greg]",
      "what does greg think",
    ] },
    walk_away: { patterns: [
      "i have (another | a) (meeting | call | appointment) [now | in five minutes | right now]",
      "i am (leaving | out | out of here)",
      "this is (a waste of time | pointless | useless) #tip:too_blunt",
      "i (do not | can not) (do | have time for) this [now | right now]",
      "i am done here",
      "i (am going | will go) [back] to my desk",
    ] },

    // --- the goodbye -------------------------------------------------------------------------------------------
    monday_yes: { patterns: [
      "[yes | sure] (monday | same time) (works | is fine | is good | is perfect) [for me] #h:works_monday",
      "(see you | until) monday #h:see_monday",
      "[yes | sure] same time monday",
      "[sure] see you (then | on monday | next week) #h:see_then",
      "(yes | sure) same time",
      "monday is (fine | good | okay | great) [with me]",
      "(sounds good | perfect) see you (then | monday)",
      "(i will | we will) be there",
    ] },
    monday_no_ctx: { patterns: [
      "monday (does not work | is not (good | possible)) [for me]",
      "i can not (on | do) monday",
      "not monday",
      "i (am | will be) (busy | away | off) on monday",
    ] },
    coffee_yes_ctx: { patterns: [
      "i would love to #h:love_coffee",
      "[sure | yes] [a] coffee (sounds | would be) (great | good | nice | perfect)",
      "[sure | yes] [why not] [but] (i am buying | it is on me | my treat)",
      "(only | but only) if you are buying #h:if_buying",
      "(sure | yes) [i would love] [a] coffee",
      "i (could | can) use a coffee",
      "i would love [it | that | one | a coffee]",
      "let us go",
    ] },
    coffee_no_ctx: { patterns: [
      "[sorry] i (can not | have to go | am busy | have plans | have a meeting) [today | now | right now]",
      "(i would love to | i would like to | thanks | thank you | sounds great | sure) but i (can not | have to go | am busy | have plans | have a meeting) [today | now | right now]",
      "maybe (another | next) time #h:next_time",
      "[can i] take a rain check",
      "not today",
      "no coffee [for me] [today]",
      "i do not drink coffee",
    ] },
    teal_ctx: { patterns: [
      "i would say green #green #h:id_say_green",
      "[how about | what about | maybe] (teal | turquoise | something in between | blue green | a mix | both) #teal #h:how_about_teal",
      "[how about | what about | maybe | i would say] green [then] #green",
      "not blue #green",
      "[i would say] teal [it is] #teal",
      "(fine | okay | sure) blue [it is] #blue",
      "blue is (fine | good | okay) #blue",
    ] },
  },

  lines: {
    // --- Greg ------------------------------------------------------------------------------------------------
    g_open: [
      t("Okay, | everyone, | let's get started.", "Gerai, | visi, | pradėkime.", "Gerai, visi, pradėkime."),
      t("Morning, | everyone. | Let's be | quick.", "Labas rytas | visiems. | Būkime | greiti.", "Labas rytas visiems. Būkime greiti."),
    ],
    g_floor: [
      t("Vanessa, | the | floor | is | yours.", "Vanesa, | — | žodis | yra | tavo.", "Vanesa, tau žodis.", { flags: { 2: "“floor” here = the right to speak (žodis), not grindys." } }),
    ],
    g_anyone: [
      t("Anyone | else? | No | concerns | at all?", "Kas nors | dar? | Jokių | abejonių | išvis?", "Kas nors dar? Išvis jokių abejonių?"),
    ],
    g_doubts: [
      t("Are | you | sure? | Last | week | you | had | doubts.", "Ar | tu | {m:tikras|f:tikra}? | Praėjusią | savaitę | tu | turėjai | abejonių.", "Tikrai? Praėjusią savaitę turėjai abejonių.",
        { flags: { 0: "“Are” in a yes/no question = the particle ar; tikras takes over the copula." } }),
    ],
    g_friendly: [
      t("Okay, | folks, | let's be | nice.", "Gerai, | žmonės, | būkime | malonūs.", "Gerai, žmonės, būkime malonūs."),
      t("Easy, | you | two.", "Ramiau, | jūs | {m:abu|f:abi}.", "Ramiau, jūs {m:abu|f:abi}."),
    ],
    g_popcorn: [
      t("And | interns, | put | the | popcorn | away.", "O | praktikantai, | patraukite | — | spragėsius | —.", "O jūs, praktikantai, patraukite spragėsius.",
        { flags: { 5: "“away” (put … away): patraukite (under “put”) carries it." } }),
    ],
    g_alt_help: [
      t("Is | there | a | middle ground | here?", "Ar yra | — | — | vidurio kelias | čia?", "Gal čia yra koks nors vidurio kelias?", { flags: { 1: F_THERE } }),
    ],
    g_boss_q: [
      t("Me? | I | think | I | need | more | coffee. | But | go on.", "Aš? | Aš | manau, | man | reikia | daugiau | kavos. | Bet | tęskite.", "Aš? Manau, man reikia daugiau kavos. Bet tęskite.",
        { flags: { 3: "“I need” = man reikia: the subject becomes the dative man." } }),
    ],
    g_decide1: [
      t("Okay, | I'll make | the | call.", "Gerai, | priimsiu | — | sprendimą.", "Gerai, sprendimą priimsiu aš.", { flags: { 3: "“call” here = a decision, not a phone call." } }),
    ],
    g_decide2: [
      t("We | launch | on Friday, | but | the | old | site | stays up | for | two | weeks.", "Mes | paleidžiame | penktadienį, | bet | — | senoji | svetainė | lieka veikti | — | dvi | savaites.",
        "Paleidžiame penktadienį, bet senoji svetainė dar dvi savaites veiks.", { flags: { 8: F_DUR } }),
    ],
    g_decide3: [
      t("Nobody's | happy? | Perfect. | That's | a | compromise.", "Niekas nėra | patenkintas? | Puiku. | Tai yra | — | kompromisas.", "Niekas nepatenkintas? Puiku. Vadinasi, tai kompromisas.",
        { flags: { 0: "Negative concord: nėra takes its ne- from “Nobody” (C-CONCORD)." } }),
    ],
    g_sum1: [
      t("Great. | Somebody, | write | that | down.", "Puiku. | Kas nors, | užrašykite | tai | —.", "Puiku. Kas nors, užrašykite.",
        { flags: { 4: "“down” (write … down): the prefix už- of užrašykite carries it." } }),
    ],
    g_sum2: [
      t("See? | That | wasn't | so | hard.", "Matote? | Tai | nebuvo | taip | sunku.", "Matote? Nebuvo taip sunku."),
    ],
    g_gave_in: [
      t("Great. | Friday it is.", "Puiku. | Vadinasi, penktadienį.", "Puiku. Vadinasi, penktadienį."),
    ],
    g_walk: [
      t("Okay… | we'll pick | this | up | on Monday.", "Gerai… | pratęsime | tai | — | pirmadienį.", "Gerai… pratęsime pirmadienį.",
        { flags: { 3: "“up” (pick … up = continue): pratęsime (under “we'll pick”) carries it." } }),
    ],
    g_monday: [
      t("Good | meeting, | everyone. | Same | time | Monday?", "Geras | susirinkimas, | visi. | Tuo pačiu | laiku | pirmadienį?", "Geras susirinkimas, kolegos. Tuo pačiu laiku pirmadienį?"),
    ],
    g_calendar: [
      t("No? | Then | I'll find | another | time.", "Ne? | Tada | rasiu | kitą | laiką.", "Ne? Tada rasiu kitą laiką."),
    ],

    // --- Vanessa: the pitch and the charts -------------------------------------------------------------------
    v_pitch1: [
      t("Okay. | Here's | the | plan: | we | launch | the | new | website | this | Friday.", "Gerai. | Štai | — | planas: | mes | paleidžiame | — | naują | svetainę | šį | penktadienį.",
        "Gerai. Štai planas: šį penktadienį paleidžiame naują svetainę."),
    ],
    v_pitch2: [
      t("And | we | shut down | the | old | one | the | same | day. | Clean break.", "Ir | mes | išjungiame | — | senąją | — | — | tą pačią | dieną. | Perėjimas iš karto.",
        "O senąją tą pačią dieną išjungiame. Pereiname iš karto, be jokio pereinamojo laikotarpio.",
        { flags: { 5: "“one” has no word: the adjective senąją stands for “the old website”." } }),
    ],
    v_thoughts: [
      t("So, | what | do | you | think?", "Tai | ką | — | tu | manai?", "Tai ką manai?", { flags: { 2: F_DO_WH } }),
      t("Any | thoughts? | No? | Perfect.", "Kokių nors | minčių? | Ne? | Puiku.", "Kokių nors minčių? Ne? Puiku."),
    ],
    v_reask: [
      t("So? | Are | you | with | me | on | this?", "Tai? | Ar | tu | su | manimi | dėl | šito?", "Tai kaip? Pritari man?",
        { flags: { 1: "“Are” in a yes/no question = the particle ar.", 3: "“with me” here = on my side (pritari man)." } }),
    ],
    v_love: [
      t("See? | I | knew | it!", "Matai? | Aš | žinojau | tai!", "Matai? Taip ir žinojau!"),
    ],
    v_no_elab: [
      t("No? | Just | “no”? | Care | to elaborate?", "Ne? | Tiesiog | „ne“? | Gal norėtum | paaiškinti plačiau?", "Ne? Tiesiog „ne“? Gal paaiškinsi plačiau?",
        { flags: { 3: "“Care” (care to …) = gal norėtum, a polite invitation, not rūpintis." } }),
    ],
    v_q_answer: [
      t("Because | the | CEO | wants | it | by | Friday. | And | because | I | said | so. | Kidding. | Mostly.",
        "Nes | — | generalinis direktorius | nori | jos | iki | penktadienio. | Ir | todėl, kad | aš | pasakiau | taip. | Juokauju. | Beveik.",
        "Nes generalinis direktorius nori jos iki penktadienio. Ir todėl, kad aš taip pasakiau. Juokauju. Beveik.",
        { flags: { 4: "“it” = the website (svetainė): norėti takes the genitive jos." } }),
    ],
    v_not_convinced: [
      t("You | don't look | convinced.", "Tu | neatrodai | {m:įtikintas|f:įtikinta}.", "Neatrodai {m:įtikintas|f:įtikinta}."),
    ],
    v_my_view: [
      t("Me? | I | think | it's | perfect. | Obviously.", "Aš? | Aš | manau, | jis yra | tobulas. | Akivaizdu.", "Aš? Manau, planas tobulas. Akivaizdu.",
        { flags: { 3: "“it” = the plan (planas), so the masculine jis." } }),
    ],
    v_rude: [
      t("Wow. | Okay. | Tell | me | how | you | really | feel.", "Oho. | Gerai. | Pasakyk | man, | ką | tu | iš tikrųjų | jauti.", "Oho. Gerai. Nesivaržyk – sakyk, ką iš tikrųjų galvoji.",
        { flags: { 4: "“how … feel” = ką jauti: Lithuanian asks “what” you feel. (The line is sarcastic.)" } }),
    ],
    v_charts1: [
      t("Oh, | I | knew | someone | would say | that. | Look at | this | chart.", "O, | aš | žinojau, | kad kas nors | pasakys | tai. | Pažiūrėk į | šią | diagramą.",
        "O, žinojau, kad kas nors tai pasakys. Pažiūrėk į šią diagramą.", { flags: { 3: "“someone”: Lithuanian adds kad (that) before kas nors." } }),
    ],
    v_charts2: [
      t("Traffic | is | up, | clicks | are | up, | users | love | the | new | design, | and | honestly, | if | we | just…",
        "Lankomumas | yra | didesnis, | paspaudimų | yra | daugiau, | vartotojai | dievina | — | naują | dizainą, | ir | atvirai, | jei | mes | tiesiog…",
        "Lankomumas didesnis, paspaudimų daugiau, vartotojai dievina naująjį dizainą, ir atvirai, jei mes tiesiog…",
        { flags: { 2: "“up” here = has grown (didesnis).", 5: "“up” here = more of them (daugiau, which makes paspaudimų genitive)." } }),
    ],
    v_charts_more: [
      t("…and | slide | 9 | shows | the | conversion | rate, | which, | frankly, | speaks | for itself…",
        "…ir | skaidrė | Nr. 9 | rodo | — | konversijos | rodiklį, | kuris, | atvirai, | kalba | pats už save…",
        "…o devintoji skaidrė rodo konversijos rodiklį, kuris, atvirai, kalba pats už save…",
        { say: "…and slide nine shows the conversion rate, which, frankly, speaks for itself…" }),
      t("…and | this | is | my | favorite | part…", "…ir | tai | yra | mano | mėgstamiausia | dalis…", "…o čia – mano mėgstamiausia dalis…"),
    ],
    v_charts_end: [
      t("…anyway. | That's | my | chart. | Questions?", "…žodžiu. | Tai yra | mano | diagrama. | Klausimų?", "…žodžiu, tokia mano diagrama. Klausimų?"),
    ],

    // --- Vanessa: the floor and the concern --------------------------------------------------------------------
    v_go_ahead: [
      t("Oh, | sorry. | Go ahead.", "O, | atsiprašau. | Kalbėk.", "O, atsiprašau. Kalbėk."),
      t("Sure, | jump in.", "Žinoma, | įsiterpk.", "Žinoma, įsiterpk."),
    ],
    v_oh_sorry: [
      t("Oh, | sorry.", "O, | atsiprašau.", "O, atsiprašau."),
    ],
    v_rude_stop: [
      t("Excuse me? | …Fine. | Go ahead.", "Atsiprašau? | …Gerai jau. | Kalbėk.", "Atsiprašau? …Gerai jau. Kalbėk.",
        { flags: { 0: "Indignant “Excuse me?” = Atsiprašau? (what did you just say?), not an apology." } }),
    ],
    v_excuse_me: [
      t("Excuse me? | …Fine.", "Atsiprašau? | …Gerai jau.", "Atsiprašau? …Gerai jau.",
        { flags: { 0: "Indignant “Excuse me?” = Atsiprašau? (what did you just say?), not an apology." } }),
    ],
    v_whats_problem: [
      t("Okay, | so | what's | the | problem?", "Gerai, | tai | kokia yra | — | problema?", "Gerai, tai kokia problema?"),
      t("Fine. | What | worries | you?", "Gerai. | Kas | neramina | tave?", "Gerai. Kas tave neramina?"),
    ],
    v_why_again: [
      t("Yes, | you | said | that. | But | why?", "Taip, | tu | sakei | tai. | Bet | kodėl?", "Taip, tai jau sakei. Bet kodėl?"),
    ],
    v_problem_first: [
      t("Hold on. | First, | what's | the | problem?", "Palauk. | Pirmiausia, | kokia yra | — | problema?", "Palauk. Pirmiausia – kokia problema?"),
    ],
    v_reason_help: [
      t("Is | it | the | timing? | The | testing? | The | customers?", "Ar | tai | — | terminas? | — | Testavimas? | — | Klientai?", "Kas tave neramina – terminas? Testavimas? Klientai?",
        { flags: { 0: F_IS_Q } }),
    ],
    v_c_vague: [
      t("Not clear? | It's | crystal clear. | What | exactly | worries | you?", "Neaišku? | Tai yra | visiškai aišku. | Kas | būtent | neramina | tave?",
        "Neaišku? Juk viskas visiškai aišku. Kas būtent tave neramina?"),
    ],
    v_c_test: [
      t("We | tested | it. | Well… | mostly.", "Mes | ištestavome | ją. | Na… | beveik.", "Mes ją ištestavome. Na… beveik.", { flags: { 2: F_IT_SITE } }),
    ],
    v_c_time: [
      t("Four | days | is | plenty. | We're | a | fast | team.", "Keturių | dienų | — | visiškai pakanka. | Mes esame | — | greita | komanda.", "Keturių dienų visiškai pakanka. Mūsų komanda greita.",
        { flags: { 2: "“is”: pakanka (under “plenty”) is the verb; it takes the genitive keturių dienų." } }),
    ],
    v_c_cust: [
      t("Our | customers | are | smarter | than | you | think.", "Mūsų | klientai | yra | protingesni, | nei | tu | manai.", "Mūsų klientai protingesni, nei manai."),
    ],
    v_c_support: [
      t("The | support | team | will figure | it | out.", "— | Klientų aptarnavimo | komanda | išsiaiškins | tai | —.", "Klientų aptarnavimo komanda susigaudys.",
        { flags: { 5: "“out” (figure … out): išsiaiškins (under “will figure”) carries it." } }),
    ],
    v_c_bugs: [
      t("There's | one | bug. | One. | Tiny.", "Yra | viena | klaida. | Viena. | Mažytė.", "Yra viena klaida. Viena. Mažytė."),
    ],
    v_c_risk: [
      t("Every | launch | is | a | risk. | That's | business.", "Kiekvienas | paleidimas | yra | — | rizika. | Toks | verslas.", "Kiekvienas paleidimas – rizika. Toks verslas.",
        { flags: { 5: "“That's” = toks (such is …): the copula has no word." } }),
    ],
    v_q_old: [
      t("We | shut | it | down. | Clean break.", "Mes | išjungiame | ją | —. | Perėjimas iš karto.", "Ją išjungiame. Pereiname iš karto.",
        { flags: { 2: F_IT_SITE, 3: "“down” (shut … down): išjungiame (under “shut”) carries it." } }),
    ],

    // --- Vanessa: her strong point -------------------------------------------------------------------------------
    v_counter1: [
      t("But | here's | the | thing: | the | old | site | costs | us | $4,000 | a | month.", "Bet | štai | — | esmė: | — | senoji | svetainė | kainuoja | mums | 4 000 dolerių | per | mėnesį.",
        "Bet esmė tokia: senoji svetainė mums kainuoja 4 000 dolerių per mėnesį.",
        { say: "But here's the thing: the old site costs us four thousand dollars a month.", flags: { 3: "“thing” here = the key point (esmė).", 10: "Distributive “a” (a month) = per." } }),
    ],
    v_counter2: [
      t("And | 60% | of | our | visitors | use | phones. | On a phone, | the | old | site | is | a | disaster.", "Ir | 60 % | — | mūsų | lankytojų | naudoja | telefonus. | Telefone | — | senoji | svetainė | yra | — | katastrofa.",
        "O 60 % mūsų lankytojų naršo telefonu. O telefone senoji svetainė – tikra katastrofa.",
        { say: "And sixty percent of our visitors use phones. On a phone, the old site is a disaster.", flags: { 2: "“of”: the genitive lankytojų carries it (mūsų intervenes)." } }),
    ],
    v_counter_reask: [
      t("So? | Is | the | old | site | a | problem | or | not?", "Tai? | Ar yra | — | senoji | svetainė | — | problema | ar | ne?", "Tai kaip? Senoji svetainė – problema ar ne?",
        { flags: { 1: "“Is” in a yes/no question = ar; yra keeps the copula." } }),
    ],
    v_no_listen: [
      t("Hold on. | Did | you | even | look at | my | chart?", "Palauk. | Ar | tu | bent | pažiūrėjai į | mano | diagramą?", "Palauk. Ar tu bent pažiūrėjai į mano diagramą?",
        { flags: { 1: "Question “Did” = the particle ar; the past sits on pažiūrėjai.", 3: "“even” in this question = bent (at least)." } }),
    ],
    v_no_hear: [
      t("You | didn't | even | hear | my | point!", "Tu | — | net | neišgirdai | mano | argumento!", "Tu net neišgirdai mano argumento!",
        { flags: { 1: "“didn't … hear”: the ne- of neišgirdai (under “hear”) carries it (C-NEG-SPLIT)." } }),
    ],
    v_first_agree: [
      t("Wait. | First, | do | you | agree | that | the | old | site | is | a | problem?", "Palauk. | Pirmiausia, | ar | tu | sutinki, | kad | — | senoji | svetainė | yra | — | problema?",
        "Palauk. Pirmiausia – ar sutinki, kad senoji svetainė yra problema?", { flags: { 2: F_DO_Q } }),
    ],
    v_thanks_ack: [
      t("Thank | you. | So | we | agree | on | something.", "Dėkoju | tau. | Vadinasi, | mes | sutariame | dėl | kai ko.", "Ačiū. Vadinasi, dėl kai ko sutariame."),
      t("Finally! | A little | respect.", "Pagaliau! | Šiek tiek | pagarbos.", "Pagaliau! Šiek tiek pagarbos."),
    ],

    // --- Vanessa: proposals -----------------------------------------------------------------------------------------
    v_alt_ask: [
      t("So | what | do | you | suggest?", "Tai | ką | — | tu | siūlai?", "Tai ką siūlai?", { flags: { 2: F_DO_WH } }),
    ],
    v_alt_ask_tease: [
      t("Okay, | smart one. | What's | your | plan?", "Gerai, | {m:gudruoli|f:gudruole}. | Koks yra | tavo | planas?", "Gerai, {m:gudruoli|f:gudruole}. Koks tavo planas?"),
    ],
    v_a_beta: [
      t("A | beta? | Hmm. | That's | not | the | worst | idea | I've heard | today.", "— | Beta versija? | Hmm. | Tai | ne | — | blogiausia | idėja, | kurią girdėjau | šiandien.",
        "Beta versija? Hmm. Tai ne pati blogiausia idėja, kurią šiandien girdėjau."),
    ],
    v_a_soft: [
      t("A | soft launch? | Hmm. | That's | not | the | worst | idea | I've heard | today.", "— | Bandomasis paleidimas? | Hmm. | Tai | ne | — | blogiausia | idėja, | kurią girdėjau | šiandien.",
        "Bandomasis paleidimas? Hmm. Tai ne pati blogiausia idėja, kurią šiandien girdėjau."),
    ],
    v_a_backup: [
      t("Two | sites | at once? | That's | double | the | work. | But… | okay, | I | see | the | logic.", "Dvi | svetainės | vienu metu? | Tai yra | dvigubas | — | darbas. | Bet… | gerai, | aš | matau | — | logiką.",
        "Dvi svetainės vienu metu? Tai dvigubas darbas. Bet… gerai, logiką matau."),
    ],
    v_a_delay: [
      t("Later? | We'd | lose | a | whole | week, | at least.", "Vėliau? | Mes | prarastume | — | visą | savaitę, | mažiausiai.", "Vėliau? Prarastume mažiausiai visą savaitę.",
        { flags: { 1: "“We'd”: the conditional prarastume (under “lose”) carries 'd." } }),
    ],
    v_a_train: [
      t("Training | takes | time… | but | okay, | I | hear | you.", "Mokymai | užima | laiko… | bet | gerai, | aš | girdžiu | tave.", "Mokymai užima laiko… bet gerai, supratau."),
    ],
    v_a_inform: [
      t("An | email | to customers? | Fine. | That's | easy.", "— | Laiškas | klientams? | Gerai. | Tai yra | paprasta.", "Laiškas klientams? Gerai. Tai paprasta."),
    ],
    v_a_fix: [
      t("Fix | the | bugs | first? | Fine, | that's | fair.", "Ištaisyti | — | klaidas | pirmiausia? | Gerai, | tai yra | pagrįsta.", "Pirmiausia ištaisyti klaidas? Gerai, tai pagrįsta."),
    ],
    v_a_other: [
      t("Hmm. | Interesting. | Go on.", "Hmm. | Įdomu. | Tęsk.", "Hmm. Įdomu. Tęsk."),
    ],
    v_soften: [
      t("Okay, | okay. | You | win | half.", "Gerai, | gerai. | Tu | laimi | pusę.", "Gerai, gerai. Pusę tu laimėjai."),
    ],

    // --- Vanessa: settling it ------------------------------------------------------------------------------------------
    v_compromise: [
      t("Okay. | Meet me halfway: | we | launch | on Friday | as | a | beta, | and | the | old | site | stays up | for | two | weeks.",
        "Gerai. | Nusileiskime {m:abu|f:abi}: | mes | paleidžiame | penktadienį | kaip | — | beta versiją, | ir | — | senoji | svetainė | lieka veikti | — | dvi | savaites.",
        "Gerai. Nusileiskime {m:abu|f:abi}: penktadienį paleidžiame beta versiją, o senoji svetainė dar dvi savaites veiks.",
        { flags: { 1: "“Meet me halfway” = nusileiskime abu (let's both give way); abi when both are women.", 13: F_DUR } }),
    ],
    v_deal_q: [
      t("Deal?", "Sutarta?", "Sutarta?"),
    ],
    v_final_offer: [
      t("Three | weeks. | Final | offer.", "Trys | savaitės. | Galutinis | pasiūlymas.", "Trys savaitės. Galutinis pasiūlymas."),
    ],
    v_halfway: [
      t("Come on, | that's | halfway!", "Nagi, | tai yra | pusė kelio!", "Nagi, juk tai pusė kelio!"),
    ],
    v_deal: [
      t("Agreed.", "Sutarta.", "Sutarta."),
      t("Deal. | Look at | us, | being | adults.", "Sutarta. | Pažiūrėk į | mus, | elgiamės kaip | {m:suaugę|f:suaugusios}.", "Sutarta. Tik pažiūrėk į mus – elgiamės kaip {m:suaugę|f:suaugusios}.",
        { flags: { 3: "“being” here = behaving as (elgiamės kaip)." } }),
    ],
    v_stubborn: [
      t("With respect, | I | still | think | a | clean break | is | the | way to go.", "Su visa pagarba, | aš | vis dar | manau, kad | — | perėjimas iš karto | yra | — | geriausias kelias.",
        "Su visa pagarba, vis dar manau, kad geriausia pereiti iš karto.", { flags: { 3: "Lithuanian adds kad (that) after manau." } }),
    ],
    v_round: [
      t("We | could | go round and round | all | day.", "Mes | galėtume | suktis ratu | visą | dieną.", "Taip galėtume suktis ratu visą dieną."),
    ],
    v_so_agree: [
      t("So | you | agree | with | me?", "Tai | tu | sutinki | su | manimi?", "Tai tu sutinki su manimi?"),
    ],
    v_atd: [
      t("Fine. | We | agree | to disagree.", "Gerai. | Mes | sutariame, | kad nesutariame.", "Gerai. Sutariame, kad nesutariame."),
    ],
    v_impossible: [
      t("With respect, | you're | impossible.", "Su visa pagarba, | tu esi | {m:neįmanomas|f:neįmanoma}.", "Su visa pagarba – tu {m:neįmanomas|f:neįmanoma}."),
    ],
    v_gave_in: [
      t("Thank | you! | I | knew | you'd | come around.", "Dėkoju | tau! | Aš | žinojau, | kad tu | persigalvosi.", "Ačiū! Žinojau, kad persigalvosi.",
        { flags: { 4: "“you'd”: Lithuanian adds kad (that); the future persigalvosi (under “come around”) carries 'd (would)." } }),
    ],

    // --- Vanessa: the twist ----------------------------------------------------------------------------------------------
    v_twist_cut: [
      t("Sorry, | can | I | just | come in | here?", "Atsiprašau, | ar galiu | aš | tik | įsiterpti | čia?", "Atsiprašau, ar galiu čia įsiterpti?", { flags: { 3: "“just” only softens the request." } }),
    ],
    v_twist_point: [
      t("Thanks. | Just | one | thing: | phones. | 60%. | Remember | that.", "Ačiū. | Tik | vienas | dalykas: | telefonai. | 60 %. | Atsimink | tai.", "Ačiū. Tik vienas dalykas: telefonai. 60 %. Atsimink tai.",
        { say: "Thanks. Just one thing: phones. Sixty percent. Remember that." }),
    ],
    v_twist_sorry: [
      t("Fair enough. | Sorry.", "Na, gerai. | Atsiprašau.", "Na, gerai. Atsiprašau."),
    ],

    // --- Vanessa: the goodbye ---------------------------------------------------------------------------------------------
    v_teal1: [
      t("And | for the record, | the | new | buttons | are | still | going to be | blue.", "O | kad būtų aišku, | — | nauji | mygtukai | — | vis tiek | bus | mėlyni.",
        "O kad būtų aišku: nauji mygtukai vis tiek bus mėlyni.", { flags: { 5: "“are”: the future bus (under “going to be”) carries it." } }),
    ],
    v_teal2: [
      t("Green? | No. | …Teal?", "Žali? | Ne. | …Žalsvai mėlyni?", "Žali? Ne. …Gal žalsvai mėlyni?"),
    ],
    v_teal3: [
      t("Teal. | Agreed. | Look at | us.", "Žalsvai mėlyni. | Sutarta. | Pažiūrėk į | mus.", "Žalsvai mėlyni. Sutarta. Tik pažiūrėk į mus."),
    ],
    v_coffee: [
      t("That | was | fun. | Coffee? | I'm buying.", "Tai | buvo | smagu. | Kavos? | Aš vaišinu.", "Buvo smagu. Kavos? Aš vaišinu."),
    ],
    v_coffee_yes: [
      t("Great. | But | we're | still | arguing | about | the | font.", "Puiku. | Bet | mes | vis dar | ginčijamės | dėl | — | šrifto.", "Puiku. Bet dėl šrifto mes vis dar ginčijamės.",
        { flags: { 2: "“we're”: the present ginčijamės (under “arguing”) carries 're." } }),
    ],
    v_coffee_no: [
      t("Next | time, | then.", "Kitą | kartą, | tada.", "Tada kitą kartą."),
    ],
    v_bye: [
      t("See you | Monday. | Same | time, | same | fight.", "Iki | pirmadienio. | Tas pats | laikas, | tas pats | ginčas.", "Iki pirmadienio. Tas pats laikas, tas pats ginčas.",
        { flags: { 0: "“See you” + a day = iki + the genitive." } }),
    ],
    v_cold_bye: [
      t("See you | Monday.", "Iki | pirmadienio.", "Iki pirmadienio.", { flags: { 0: "“See you” + a day = iki + the genitive." } }),
    ],
  },

  hints: {
    disagree: {
      lt: "Mandagiai pasakyti, kad nesutinki",
      items: [
        { id: "push_back", s: t("I'd | push back | a little | on | that. | It's | not | that | clear.", "Aš | paprieštaraučiau | truputį | dėl | to. | Tai | nėra | taip | aišku.",
          "Čia šiek tiek paprieštaraučiau – ne viskas taip aišku.", { flags: { 0: F_ID, 5: F_IS_NOT } }), register: "polite", note: "Iš dainos: švelnus, dalykiškas nesutikimas." },
        { id: "see_point", s: t("I | see | your | point, | but | I'm | not | sure | I | agree.", "Aš | suprantu | tavo | mintį, | bet | aš | nesu | {m:tikras|f:tikra}, | ar aš | sutinku.",
          "Suprantu tavo mintį, bet nesu {m:tikras|f:tikra}, ar sutinku.", { flags: { 6: F_IM_NOT, 8: F_AR } }), note: "Iš dainos. Pirma parodyk, kad supranti, tada – „but…“." },
        { id: "not_sure_about", s: t("I'm | not | sure | about | that.", "Aš | nesu | {m:tikras|f:tikra} | dėl | to.", "Dėl to nesu {m:tikras|f:tikra}.", { flags: { 1: F_IM_NOT } }) },
        { id: "have_concerns", s: t("I | have | some | concerns | about | Friday.", "Aš | turiu | — | abejonių | dėl | penktadienio.", "Turiu abejonių dėl penktadienio.",
          { flags: { 2: "Partitive “some”: the genitive abejonių carries it." } }) },
        { id: "with_respect", s: t("With respect, | I | see | it | a bit | differently.", "Su visa pagarba, | aš | matau | tai | šiek tiek | kitaip.", "Su visa pagarba, aš į tai žiūriu kiek kitaip."),
          register: "polite", note: "„With respect“ (iš dainos) – mandagi įžanga prieš nesutikimą." },
        { id: "not_best", s: t("I'm | not | sure | that's | the | best | approach.", "Aš | nesu | {m:tikras|f:tikra}, | kad tai yra | — | geriausias | būdas.",
          "Nesu {m:tikras|f:tikra}, kad tai geriausias būdas.", { flags: { 1: F_IM_NOT, 3: "Zero “that” before the clause: Lithuanian adds kad." } }) },
        { id: "worried", s: t("I'm | a little | worried | about | the | timing.", "Aš esu | truputį | {m:susirūpinęs|f:susirūpinusi} | dėl | — | terminų.", "Mane šiek tiek neramina terminai.") },
      ],
    },
    questions: {
      lt: "Paklausti apie planą",
      items: [
        { id: "q_why_friday", s: t("Why | this | Friday?", "Kodėl | šį | penktadienį?", "Kodėl būtent šį penktadienį?") },
        { id: "q_tested", s: t("Have | we | tested | it | properly?", "Ar | mes | ištestavome | ją | tinkamai?", "Ar mes ją tinkamai ištestavome?",
          { flags: { 0: "Question “Have” = the particle ar; the past ištestavome carries the perfect.", 3: F_IT_SITE } }) },
        { id: "q_rush", s: t("What's the rush?", "Kur skubame?", "Kur taip skubame?"), register: "casual" },
      ],
    },
    interrupt: {
      lt: "Mandagiai įsiterpti",
      items: [
        { id: "come_in", s: t("Sorry, | can | I | just | come in | here?", "Atsiprašau, | ar galiu | aš | tik | įsiterpti | čia?", "Atsiprašau, ar galiu čia įsiterpti?",
          { flags: { 3: "“just” only softens the request." } }), note: "Iš dainos. Amerikiečiai dažniau sako „Can I jump in here?“." },
        { id: "jump_in", s: t("Can | I | jump in | here | for a second?", "Ar galiu | aš | įsiterpti | čia | sekundėlei?", "Ar galiu sekundėlei įsiterpti?"), note: "Amerikietiškas variantas." },
        { id: "sorry_interrupt", s: t("Sorry | to interrupt, | but…", "Atsiprašau, | kad pertraukiu, | bet…", "Atsiprašau, kad pertraukiu, bet…",
          { flags: { 1: "“to interrupt” = kad pertraukiu: Lithuanian uses a kad clause." } }) },
        { id: "add_something", s: t("Could | I | add | something?", "Ar galėčiau | aš | pridurti | ką nors?", "Ar galėčiau ką nors pridurti?") },
      ],
    },
    reason: {
      lt: "Paaiškinti, kodėl abejoji",
      items: [
        { id: "not_clear", s: t("With respect, | it's | not | that | clear. | We | haven't tested | it | yet.", "Su visa pagarba, | tai | nėra | taip | aišku. | Mes | neištestavome | jos | dar.",
          "Su visa pagarba, ne viskas taip aišku. Mes jos dar neištestavome.", { flags: { 1: F_IS_NOT, 7: "“it” = the website; the negation needs the genitive jos." } }), note: "Iš dainos." },
        { id: "not_enough_time", s: t("Four | days | isn't enough.", "Keturių | dienų | neužtenka.", "Keturių dienų neužtenka.") },
        { id: "older_customers", s: t("Many | of | our | customers | are | over | 60.", "Daugelis | — | mūsų | klientų | yra | vyresni nei | 60 metų.", "Daugeliui mūsų klientų – daugiau nei 60 metų.",
          { say: "Many of our customers are over sixty.", flags: { 1: "“of”: the genitive klientų carries it (mūsų intervenes).", 6: "Lithuanian adds metų (years)." } }) },
        { id: "support_not_ready", s: t("The | support | team | isn't | ready.", "— | Klientų aptarnavimo | komanda | nėra | pasiruošusi.", "Klientų aptarnavimo komanda dar nepasiruošusi.") },
      ],
    },
    ack: {
      lt: "Pripažinti gerą argumentą",
      items: [
        { id: "fair_point", s: t("That's | a | fair | point. | However…", "Tai yra | — | pagrįsta | pastaba. | Tačiau…", "Pagrįsta pastaba. Tačiau…"), note: "Iš dainos: pripažink argumentą, o tada – „However…“." },
        { id: "take_point", s: t("I | take | your | point.", "Aš | priimu | tavo | argumentą.", "Priimu tavo argumentą."), note: "Iš dainos." },
        { id: "right_about", s: t("You're | right | about | the | cost.", "Tu esi | {sm:teisus|sf:teisi} | dėl | — | kainos.", "Dėl kainos tu {sm:teisus|sf:teisi}.") },
        { id: "good_point", s: t("Good | point. | The | old | site | is | slow.", "Gera | pastaba. | — | Senoji | svetainė | yra | lėta.", "Gera pastaba. Senoji svetainė lėta.") },
      ],
    },
    alt: {
      lt: "Pasiūlyti kitą sprendimą",
      items: [
        { id: "look_another_way", s: t("Could | we | look at | it | another way?", "Ar galėtume | mes | pažiūrėti į | tai | kitaip?", "Gal galėtume pažiūrėti į tai kitaip?"), note: "Iš dainos." },
        { id: "have_we_considered", s: t("Have | we | considered | a | soft launch?", "Ar | mes | apsvarstėme | — | bandomąjį paleidimą?", "Ar svarstėme bandomąjį paleidimą?",
          { flags: { 0: "Question “Have” = the particle ar; the past apsvarstėme carries the perfect." } }), note: "Iš dainos." },
        { id: "what_if", s: t("What if | we | keep | the | old | site | for a month?", "O jeigu | mes | paliktume | — | senąją | svetainę | mėnesiui?", "O jeigu senąją svetainę paliktume dar mėnesiui?",
          { flags: { 2: "“keep” after “what if” = the conditional paliktume." } }) },
        { id: "how_about", s: t("How about | launching | it | as | a | beta?", "O gal | paleisti | ją | kaip | — | beta versiją?", "O gal paleisti ją kaip beta versiją?",
          { flags: { 1: "“-ing” after “how about” = the infinitive paleisti.", 2: F_IT_SITE } }) },
        { id: "compromise_q", s: t("Can | we | find | a | compromise?", "Ar galime | mes | rasti | — | kompromisą?", "Gal galime rasti kompromisą?") },
      ],
    },
    twist: {
      lt: "Leisti Vanesai įsiterpti arba paprašyti leisti baigti",
      items: [
        { id: "go_ahead", s: t("Sure, | go ahead.", "Žinoma, | kalbėk.", "Žinoma, kalbėk.") },
        { id: "finish_point", s: t("Could | I | just | finish | my | point?", "Ar galėčiau | aš | tik | užbaigti | savo | mintį?", "Ar galėčiau tik užbaigti mintį?") },
        { id: "one_second", s: t("Just | one | second, | please.", "Tik | vieną | sekundę, | prašau.", "Tik sekundėlę, prašau.") },
      ],
    },
    resolve: {
      lt: "Sutikti su kompromisu arba sutarti, kad nesutariate",
      items: [
        { id: "agreed", s: t("Agreed.", "Sutarta.", "Sutarta.") },
        { id: "works_for_me", s: t("Now | that | works | for me.", "Štai | tai | tinka | man.", "Štai tai man tinka."), note: "Iš dainos." },
        { id: "agree_disagree", s: t("Let's agree | to disagree.", "Sutarkime, | kad nesutariame.", "Sutarkime, kad nesutariame."), note: "Iš dainos." },
        { id: "counter_weeks", s: t("How about | three | weeks?", "O gal | trys | savaitės?", "O gal trys savaitės?") },
        { id: "ask_greg", s: t("Greg, | what | do | you | think?", "Gregai, | ką | — | tu | manai?", "Gregai, o ką tu manai?", { flags: { 2: F_DO_WH } }) },
      ],
    },
    bye: {
      lt: "Atsisveikinti",
      items: [
        { id: "works_monday", s: t("Monday | works | for me.", "Pirmadienis | tinka | man.", "Pirmadienį man tinka.") },
        { id: "see_monday", s: t("See you | Monday.", "Iki | pirmadienio.", "Iki pirmadienio.", { flags: { 0: "“See you” + a day = iki + the genitive." } }) },
        { id: "see_then", s: t("Sure. | See you | then!", "Žinoma. | Iki | tada!", "Žinoma. Iki tada!") },
      ],
    },
    coffee: {
      lt: "Atsakyti į kvietimą išgerti kavos",
      items: [
        { id: "love_coffee", s: t("I'd love to.", "Mielai.", "Mielai.") },
        { id: "if_buying", s: t("Only | if | you're buying!", "Tik | jei | tu vaišini!", "Tik jei tu vaišini!"), register: "casual" },
        { id: "next_time", s: t("Maybe | next | time.", "Gal | kitą | kartą.", "Gal kitą kartą.") },
      ],
    },
    teal: {
      lt: "Atsakyti apie mygtukų spalvą",
      items: [
        { id: "id_say_green", s: t("I'd | say | green.", "Aš | sakyčiau, | žali.", "Sakyčiau, žali.", { flags: { 0: F_ID, 2: "žali agrees with mygtukai (the buttons)." } }), note: "Iš dainos." },
        { id: "how_about_teal", s: t("How about | teal?", "O gal | žalsvai mėlyni?", "O gal žalsvai mėlyni?") },
        { id: "not_sure_agree", s: t("I'm | not | sure | I | agree.", "Aš | nesu | {m:tikras|f:tikra}, | ar aš | sutinku.", "Nesu {m:tikras|f:tikra}, ar sutinku.", { flags: { 1: F_IM_NOT, 3: F_AR } }), note: "Iš dainos." },
      ],
    },
  },

  tips: TIPS,

  merges: {
    "let's get started": { reason: "lexical_expression", split: "Let's → leiskime, get → gauti, started → pradėtas is false; = pradėkime.", minimal: "Three words." },
    "let's be": { reason: "grammatical_fusion", split: "Let's → leiskime + be → būti is a calque; the 1st-person-plural imperative būkime carries “let's”.", minimal: "Two words." },
    "let's agree": { reason: "grammatical_fusion", split: "Let's → leiskime + agree → sutikti is a calque; the imperative sutarkime carries “let's”.", minimal: "Two words." },
    "middle ground": { reason: "lexical_expression", split: "middle → vidurys + ground → žemė is false; a compromise = vidurio kelias.", minimal: "Two words, one notion." },
    "go on": { reason: "lexical_expression", split: "go → eik + on → ant is false; = tęsk / tęskite.", minimal: "Verb and particle." },
    "stays up": { reason: "lexical_expression", split: "stays → lieka + up → aukštyn is false; a website that “stays up” = lieka veikti.", minimal: "Verb and particle." },
    "friday it is": { reason: "lexical_expression", split: "Friday → penktadienis, it → tai, is → yra gives nonsense; the decision formula = vadinasi, penktadienį.", minimal: "The whole formula." },
    "shut down": { reason: "lexical_expression", split: "shut → uždaryti + down → žemyn is false; switching off a website = išjungti (C-PHR).", minimal: "Verb and particle." },
    "clean break": { reason: "lexical_expression", split: "clean → švarus + break → lūžis is false; = perėjimas iš karto (no transition period).", minimal: "Two words, one notion." },
    "would say": { reason: "grammatical_fusion", split: "would → būtų + say → sakyti is false; the future seen from the past = the Lithuanian future pasakys (C-FUT-PAST).", minimal: "Auxiliary and verb; “that” stays outside." },
    "look at": { reason: "lexical_expression", split: "look → žiūrėk + at → prie is false; = pažiūrėk į.", minimal: "Verb and particle; the object stays outside." },
    "for itself": { reason: "lexical_expression", split: "for → dėl + itself → pati is false; the idiom “speaks for itself” = kalba pats už save.", minimal: "Preposition and reflexive." },
    "go ahead": { reason: "lexical_expression", split: "go → eik + ahead → pirmyn is a literal movement; inviting someone to speak = kalbėk.", minimal: "Two words." },
    "jump in": { reason: "lexical_expression", split: "jump → šokti + in → į is false; joining a conversation = įsiterpti.", minimal: "Verb and particle." },
    "come in": { reason: "lexical_expression", split: "come → ateiti + in → į suggests entering a room; joining a discussion = įsiterpti.", minimal: "Verb and particle." },
    "excuse me": { reason: "lexical_expression", split: "excuse → atleisk + me → man reads as an apology; the indignant question = Atsiprašau?", minimal: "Two words." },
    "not clear": { reason: "grammatical_fusion", split: "not → ne + clear → aišku: Lithuanian writes the negation as a prefix (neaišku).", minimal: "Two words, one Lithuanian word." },
    "crystal clear": { reason: "lexical_expression", split: "crystal → krištolas + clear → aiškus gives a calque; = visiškai aišku.", minimal: "Two words." },
    "will figure": { reason: "grammatical_fusion", split: "will → bus + figure → išsiaiškinti is false; the future išsiaiškins carries “will” (C-FUT). “it” and “out” stay outside.", minimal: "Auxiliary and verb." },
    "hold on": { reason: "lexical_expression", split: "hold → laikyk + on → ant is false; = palauk (C-PHR).", minimal: "Verb and particle." },
    "a little": { reason: "lexical_expression", split: "a → — + little → mažas gives “mažas”; the degree adverb = truputį / šiek tiek (C-LEX).", minimal: "Two words." },
    "a bit": { reason: "lexical_expression", split: "a → — + bit → gabalėlis gives a false noun; the degree adverb = šiek tiek (C-LEX).", minimal: "Two words." },
    "smart one": { reason: "lexical_expression", split: "smart → protingas + one → vienas is false; the teasing address = gudruoli / gudruole.", minimal: "Two words, one address form." },
    "i've heard": { reason: "grammatical_fusion", split: "I've → aš turiu + heard → girdėjęs is false; the relative clause = kurią girdėjau (simple past; Lithuanian adds the relative kurią).", minimal: "Subject clitic with perfect auxiliary, and participle." },
    "at once": { reason: "lexical_expression", split: "at → prie + once → kartą is false; = vienu metu.", minimal: "Two words." },
    "at least": { reason: "lexical_expression", split: "at → prie + least → mažiausias is false; = mažiausiai.", minimal: "Two words." },
    "meet me halfway": { reason: "lexical_expression", split: "meet → susitikime, me → mane, halfway → pusiaukelėje describes a physical meeting; the offer to compromise = nusileiskime abu.", minimal: "The whole formula (“me” is part of it)." },
    "come on": { reason: "lexical_expression", split: "come → ateik + on → ant is false; the protest = nagi.", minimal: "Two words." },
    "with respect": { reason: "lexical_expression", split: "with → su + respect → pagarba gives the letter sign-off „su pagarba“; the disagreement formula = su visa pagarba.", minimal: "Two words." },
    "way to go": { reason: "lexical_expression", split: "way → kelias, to → į, go → eiti is false; “the way to go” = geriausias kelias (the best option).", minimal: "Three words; “the” stays outside." },
    "go round and round": { reason: "lexical_expression", split: "go → eiti, round → ratu, and → ir, round → ratu is a literal walk; arguing in circles = suktis ratu.", minimal: "The whole idiom." },
    "come around": { reason: "lexical_expression", split: "come → ateiti + around → aplink is false; changing one's mind = persigalvoti.", minimal: "Verb and particle." },
    "fair enough": { reason: "lexical_expression", split: "fair → teisinga + enough → pakankamai is false; the concession = na, gerai.", minimal: "Two words." },
    "for the record": { reason: "lexical_expression", split: "for → dėl, the → —, record → įrašas is false; = kad būtų aišku.", minimal: "The whole phrase." },
    "going to be": { reason: "grammatical_fusion", split: "going → einantis, to → į, be → būti is false; the future = bus (“are” stays outside, flagged).", minimal: "Three words, one future form." },
    "i'm buying": { reason: "lexical_expression", split: "I'm → aš esu + buying → perkantis is false; offering to pay = aš vaišinu.", minimal: "Subject clitic and verb." },
    "you're buying": { reason: "lexical_expression", split: "you're → tu esi + buying → perkantis is false; paying for someone = tu vaišini.", minimal: "Subject clitic and verb." },
    "what's the rush": { reason: "lexical_expression", split: "What's → kas yra, the → —, rush → skuba gives “kas yra skuba”; the set question = kur skubame.", minimal: "The whole question." },
    "push back": { reason: "lexical_expression", split: "push → stumti + back → atgal is false; objecting to an idea = paprieštarauti.", minimal: "Verb and particle." },
    "another way": { reason: "lexical_expression", split: "another → kitas + way → kelias is false; the adverbial = kitaip.", minimal: "Two words." },
    "soft launch": { reason: "lexical_expression", split: "soft → švelnus + launch → paleidimas is false; a first release to a few users = bandomasis paleidimas.", minimal: "Two words, one term." },
    "what if": { reason: "lexical_expression", split: "what → kas + if → jei gives “kas jei”; the suggestion = o jeigu.", minimal: "Two words." },
    "how about": { reason: "lexical_expression", split: "how → kaip + about → apie gives “kaip apie”; a suggestion = o gal.", minimal: "Two words." },
    "i'd love to": { reason: "lexical_expression", split: "I'd → aš, love → mylėčiau, to → — is a false literal; accepting an invitation = mielai.", minimal: "The whole reply." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Mandagiai pasakyk, kad nesutinki su planu", done: (c) => !!c.s.disagreed && !c.s.rudeOpen },
    { lt: "Mandagiai įsiterpk į Vanesos kalbą", done: (c) => !!c.s.interruptedPolite },
    { lt: "Paaiškink, kodėl abejoji", done: (c) => !!c.s.reasonGiven },
    { lt: "Pripažink gerą Vanesos argumentą", done: (c) => !!c.s.acked },
    { lt: "Pasiūlyk kitą sprendimą", done: (c) => !!c.s.altGiven },
    { lt: "Leisk Vanesai įsiterpti arba paprašyk leisti baigti mintį", optional: true, when: (c) => !!c.s.twistFired, done: (c) => !!c.s.twistDone },
    { lt: "Susitarkite dėl kompromiso arba sutarkite, kad nesutariate", done: (c) => c.s.outcome === "deal" || c.s.outcome === "boss" },
  ],

  steps: [
    { id: "pitch", when: (c) => !c.s.outcome, done: (c) => !!c.s.disagreed,
      ask: (c) => {
        if (quiet(c, "pitch")) return;
        if (!c.s.pitched) { c.s.pitched = true; V(c, "v_pitch1"); V(c, "v_pitch2"); V(c, "v_thoughts"); return; }
        V(c, "v_reask");
      },
      expects: PITCH_EX,
      suggest: [{ lt: "Mandagiai pasakyti, kad nesutinki", hint: "disagree" }, { lt: "Paklausti apie planą", hint: "questions" }],
      yes: (c) => agreePlan(c),
      no: (c) => bareNo(c),
      help: (c) => G(c, "g_anyone") },
    { id: "charts", when: (c) => !c.s.outcome && !!c.s.disagreed, done: (c) => !!c.s.interrupted || c.s.tries.charts >= 3,
      ask: (c) => {
        if (quiet(c, "charts")) return;
        const n = ++c.s.tries.charts;
        if (n === 1) { V(c, "v_charts1"); V(c, "v_charts2"); return; }
        V(c, "v_charts_more");
      },
      expects: CHARTS_EX,
      suggest: [{ lt: "Mandagiai įsiterpti", hint: "interrupt" }],
      // she doesn't hear a yes or a no: she keeps going
      yes: () => {}, no: () => {},
      help: (c) => { c.s.tries.charts++; V(c, "v_charts_more"); } },
    { id: "reason", when: (c) => !c.s.outcome && !!c.s.disagreed && (!!c.s.interrupted || c.s.tries.charts >= 3), done: (c) => !!c.s.reasonHeard,
      ask: (c) => {
        if (quiet(c, "reason")) return;
        if (!c.s.floorGiven) {
          c.s.floorGiven = true;
          if (!c.s.interrupted) { c.s.chartsOver = true; c.s.chartsEnd = "self"; V(c, "v_charts_end"); return; }
          if (c.s.chartsEnd === "rude") { V(c, "v_rude_stop"); maybeFriendly(c); return; }
          V(c, "v_go_ahead");
          return;
        }
        const n = ++c.s.tries.reason;
        if (n === 1) { V(c, "v_whats_problem"); return; }
        if (n === 2) { V(c, "v_reason_help"); return; }
        // still no concern after three prompts: Vanessa answers the one she expects anyway (no dead end)
        guessReason(c);
        c.ask("counter");
      },
      expects: REASON_EX,
      suggest: [{ lt: "Paaiškinti, kodėl abejoji", hint: "reason" }],
      help: (c) => {
        c.s.floorGiven = true;
        if (++c.s.tries.reason >= 3) { guessReason(c); c.ask("counter"); return; }
        V(c, "v_reason_help");
      } },
    { id: "counter", when: (c) => !c.s.outcome && !!c.s.reasonHeard, done: (c) => counterDone(c),
      ask: (c) => {
        if (quiet(c, "counter")) return;
        if (!c.s.counterSaid) { c.s.counterSaid = true; V(c, "v_counter1"); V(c, "v_counter2"); return; }
        V(c, "v_counter_reask");
      },
      expects: COUNTER_EX,
      suggest: [{ lt: "Pripažinti gerą Vanesos argumentą", hint: "ack" }],
      yes: (c) => onAck(c, undefined, "ack"),
      no: (c) => notAck(c),
      help: (c) => V(c, "v_counter_reask") },
    { id: "alternative", when: (c) => !c.s.outcome && !!c.s.reasonHeard && counterDone(c), done: (c) => !!c.s.altHeard,
      ask: (c) => {
        if (quiet(c, "alternative")) return;
        if (c.s.alt && !c.s.altHeard) {
          // a proposal made earlier (or just now, together with "That's a fair point"): Vanessa answers it now
          if (hearAlt(c, c.s.alt, FRESH.has(c)) === "twist") return;
          c.ask("resolve");
          return;
        }
        if (c.s.altOther) { c.s.altHeard = true; c.s.softened = true; c.ask("resolve"); return; } // "Go on." – nothing came
        const n = ++c.s.tries.alternative;
        if (n === 1) { V(c, c.s.blunt > 0 ? "v_alt_ask_tease" : "v_alt_ask"); return; }
        if (n === 2) { G(c, "g_alt_help"); return; }
        // no proposal after two prompts: Vanessa meets the learner halfway herself (no dead end)
        c.s.altHeard = true; c.s.softened = true;
        c.ask("resolve");
      },
      expects: ALT_EX,
      suggest: [{ lt: "Pasiūlyti kitą sprendimą", hint: "alt" }],
      help: (c) => {
        if (c.s.altOther || ++c.s.tries.alternative >= 3) { c.s.altHeard = true; c.s.softened = true; c.ask("resolve"); return; }
        G(c, "g_alt_help");
      } },
    { id: "resolve", when: (c) => !c.s.outcome && !!c.s.altHeard, done: (c) => !!c.s.outcome,
      ask: (c) => {
        if (quiet(c, "resolve")) return;
        if (!c.s.offer) {
          if (c.s.stubborn && !c.s.softened) { c.s.offer = "none"; V(c, "v_stubborn"); return; }
          c.s.offer = "half"; V(c, "v_compromise"); V(c, "v_deal_q");
          return;
        }
        if (c.s.offer === "none") { G(c, "g_alt_help"); return; }
        V(c, "v_deal_q");
      },
      expects: RESOLVE_EX,
      suggest: (c): Suggestion[] => c.s.offer === "none"
        ? [{ lt: "Pasiūlyti dar ką nors arba sutarti, kad nesutariate", hint: "resolve" }, { lt: "Pasiūlyti kitą sprendimą", hint: "alt" }]
        : [{ lt: "Sutikti su kompromisu, pasiderėti arba sutarti, kad nesutariate", hint: "resolve" }],
      yes: (c) => resolveTurn(c, "accept"),
      no: (c) => resolveTurn(c, "no"),
      help: (c) => resolveTurn(c, "unsure") },
  ],

  init: (c) => {
    Object.assign(c.s, {
      disagreed: false, rudeOpen: false, interrupted: false, interruptedPolite: false, chartsOver: false, chartsEnd: null, floorGiven: false,
      reason: null, reasonGiven: false, reasonHeard: false, acked: false, counterSaid: false, firstAgreeSaid: false,
      alt: null, altGiven: false, altHeard: false, altOther: false, heardAlts: [], softened: false,
      offer: null, halfway: 0, round: 0, outcome: null, blunt: 0, friendlySaid: false, agreedOnce: false, notConvinced: false,
      tries: { charts: 0, reason: 0, counter: 0, alternative: 0, resolve: 0 },
      twistFired: false, twistOpen: false, twistDone: false, twistTag: null, closingState: null, quiet: null, ended: false,
      // variety: Vanessa cuts in (twist), refuses the first proposal, and how the goodbye ends
      twist: c.chance(c.visits >= 1 ? 0.6 : 0.4),
      stubborn: c.chance(c.visits >= 1 ? 0.5 : 0.3),
      flair: c.chance(0.5) ? "teal" : "coffee",
    });
  },

  start: (c) => {
    G(c, "g_open");
    G(c, "g_floor");
    // the pitch step follows: Vanessa presents the plan
  },

  handlers: {
    disagree_polite(c, _sl, sg) { onDisagree(c, sg); },
    rude_disagree(c, _sl, sg) { onDisagree(c, sg, true); },
    agree_plan(c, _sl, sg) { onAck(c, sg, "agree"); },
    ask_q(c, _sl, sg) { onQuestion(c, sg); },
    give_reason(c, _sl, sg) { onDisagree(c, sg); },
    concern_ctx(c, _sl, sg) { onDisagree(c, sg); },
    interrupt_polite(c, _sl, sg) { onInterrupt(c, sg, true); },
    interrupt_ctx(c, _sl, sg) { onInterrupt(c, sg, true); },
    rude_interrupt(c, _sl, sg) { onInterrupt(c, sg, false); },
    ack_point(c, _sl, sg) { onAck(c, sg, "ack"); },
    site_problem_ctx(c, _sl, sg) {
      if (twistGuard(c)) return;
      if (phase(c) !== "counter") return;
      if (sg.tags.includes("no")) { if (once(c, "react")) notAck(c); return; }
      onAck(c, sg, "ack");
    },
    offer_alt(c, _sl, sg) { onOffer(c, sg, false); },
    counter_offer(c, _sl, sg) { onOffer(c, sg, true); },
    accept_deal(c, _sl, sg) { onAck(c, sg, "accept"); },
    agree_to_disagree(c) { onAgreeToDisagree(c); },
    give_in(c) {
      if (twistGuard(c)) return;
      const ph = phase(c);
      if (ph === "ended") return;
      if (ph === "closing") { closingTurn(c, "yes"); return; }
      if (ph === "pitch") { agreePlan(c); return; }
      gaveIn(c);
    },
    let_her_ctx(c) { if (c.s.twistOpen) twistAnswer(c, "let"); },
    finish_first(c, _sl, sg) {
      if (c.s.twistOpen) { twistAnswer(c, "finish"); return; }
      const ph = phase(c);
      if (ph === "closing") { closingTurn(c, "other"); return; }
      if (ph === "charts") { interruptNow(c, true, false); return; } // "Let me finish…" while she talks: cutting in
      if (sg.tags.includes("wait")) { GLOBAL_HANDLERS.g_wait(c as any, {}); return; } // "Just a moment."
      if (!once(c, "react") || ph === "ended") return;
      V(c, "v_twist_sorry"); // "Let me finish." – "Fair enough. Sorry."
      waitHere(c);
    },
    ask_boss(c) {
      if (twistGuard(c)) return;
      const ph = phase(c);
      if (ph === "ended") return;
      if (ph === "closing") { closingTurn(c, "other"); return; }
      if (!once(c, "react")) return;
      if (/\bvanessa\b/i.test(c.heard) && !/\bgreg\b/i.test(c.heard)) { V(c, "v_my_view"); waitHere(c); return; }
      if (ph === "resolve") { resolveTurn(c, "boss"); return; }
      if (ph === "charts") return; // she talks over it
      G(c, "g_boss_q");
      if (ph === "alternative") G(c, "g_alt_help");
      waitHere(c);
    },
    walk_away(c) {
      if (c.s.ended) return;
      if (c.s.closingState) { closingTurn(c, "bye"); return; }
      walk(c);
    },
    // "I don't know." on its own: the step's help; with more after it ("…, maybe a beta?") the rest answers
    g_dontknow(c) {
      const rest = (c.heard || "").toLowerCase()
        .replace(/\b(i (do not|don't|dont) know( yet)?|i have no idea|no idea|(i am|i'm|im) not sure( yet)?|not sure( yet)?|i (can not|can't|cannot) decide|i (have not|haven't) decided( yet)?)\b/g, " ")
        .replace(/\b(hmm+|um+|uh+|well|oh|so|okay|ok|sorry|honestly|really|greg|vanessa)\b|[^a-z\s]/g, " ").trim();
      if (!rest) GLOBAL_HANDLERS.g_dontknow(c as any, {});
    },
    // "Bye!" / "Sorry, I have to go." before the end: the learner walks out of the meeting
    g_bye(c) {
      if (c.s.ended) return;
      if (c.s.closingState) { closingTurn(c, "bye"); return; }
      if (c.s.outcome) return; // the meeting has just been settled: the goodbye comes next
      walk(c);
    },
    monday_yes(c) {
      if (c.s.ended) return;
      if (c.s.closingState) { closingTurn(c, "yes"); return; }
      if (!c.s.outcome) walk(c); // "See you Monday!" in the middle of the meeting: leaving
    },
    monday_no_ctx(c) { if (c.s.closingState) closingTurn(c, "no"); },
    coffee_yes_ctx(c) { if (c.s.closingState) closingTurn(c, "yes"); },
    coffee_no_ctx(c) { if (c.s.closingState) closingTurn(c, "no"); },
    teal_ctx(c, _sl, sg) { if (c.s.closingState) closingTurn(c, sg.tags.includes("teal") ? "teal" : sg.tags.includes("blue") ? "yes" : "green"); },
  },

  finish: (c) => {
    if (c.s.outcome === "walked") return;
    c.s.closingState = "monday";
    if (c.s.outcome === "deal") { G(c, "g_sum1"); G(c, "g_sum2"); }
    G(c, "g_monday");
    const done = allDone(c);
    if (done) c.complete();
    c.event("meeting-outcome", { outcome: c.s.outcome, done, note: NOTES[c.s.outcome] });
    c.remember({ lastOutcome: c.s.outcome });
    c.expect(closingPending());
  },

  tests: [
    // --- the pitch: polite disagreement (the song's phrases first) ---
    { say: "I'd push back a little on that. It's not that clear.", intent: "disagree_polite", step: "pitch" },
    { say: "I see your point, but I'm not sure I agree.", intent: "disagree_polite", step: "pitch" },
    { say: "I'm not sure about that.", intent: "disagree_polite", step: "pitch", not: ["g_dontknow"] },
    { say: "I have some concerns about Friday.", intent: "disagree_polite", step: "pitch" },
    { say: "With respect, I see it a bit differently.", intent: "disagree_polite", step: "pitch" },
    { say: "I'm not sure that's the best approach.", intent: "disagree_polite", step: "pitch" },
    { say: "I'm a little worried about the timing.", intent: "disagree_polite", step: "pitch" },
    { say: "Interesting idea, but I have some concerns.", intent: "disagree_polite", step: "pitch" },
    { say: "I don't think that's a good idea, we need more time.", intent: "disagree_polite", step: "pitch" },
    { say: "I disagree.", intent: "disagree_polite", step: "pitch" },
    { say: "I am not agree with you.", intent: "disagree_polite", step: "pitch", not: ["agree_plan"] },
    { say: "I think no.", intent: "disagree_polite", step: "pitch" },
    { say: "Can we discuss about it?", intent: "disagree_polite", step: "pitch" },
    { say: "With all due respect, I don't think so.", intent: "disagree_polite", step: "pitch" },
    { say: "I'm not keen on the plan.", intent: "disagree_polite", step: "pitch" },
    { say: "Honestly, I'm not crazy about this plan.", intent: "disagree_polite", step: "pitch" },
    { say: "That's a stupid idea.", intent: "rude_disagree", step: "pitch" },
    { say: "You're wrong.", intent: "rude_disagree", step: "pitch" },
    { say: "No way!", intent: "rude_disagree", step: "pitch" },
    { say: "Sounds great!", intent: "agree_plan", step: "pitch" },
    { say: "I like the plan.", intent: "agree_plan", step: "pitch" },
    { say: "I'm not on board.", intent: "disagree_polite", step: "pitch", not: ["agree_plan"] },
    { say: "I don't have any concerns.", intent: "agree_plan", step: "pitch", not: ["disagree_polite"] },
    { say: "I don't like it.", intent: "disagree_polite", step: "pitch", not: ["agree_plan"] },
    { say: "It doesn't sound good to me.", intent: "disagree_polite", step: "pitch", not: ["agree_plan"] },
    { say: "It's not a stupid idea.", intent: "none", step: "pitch", not: ["rude_disagree"] },
    { say: "Why Friday?", intent: "ask_q", step: "pitch" },
    { say: "What's the rush?", intent: "ask_q", step: "pitch" },
    { say: "Have we tested it properly?", intent: "ask_q", step: "pitch" },
    { say: "What about our older customers?", intent: "ask_q", step: "pitch", not: ["offer_alt"] },
    { say: "Greg, what do you think?", intent: "ask_boss", step: "pitch" },
    { say: "Greg, how do you think?", intent: "ask_boss", step: "pitch" },
    // --- the charts: cutting in ---
    { say: "Sorry, can I just come in here?", intent: "interrupt_polite", step: "charts" },
    { say: "Can I jump in here for a second?", intent: "interrupt_polite", step: "charts" },
    { say: "Wait, can I jump in here?", intent: "interrupt_polite", step: "charts", not: ["rude_interrupt"] },
    { say: "Sorry to interrupt, but we haven't tested it yet.", intent: "interrupt_polite", step: "charts" },
    { say: "Sorry that I interrupt you.", intent: "interrupt_polite", step: "charts" },
    { say: "Could I add something?", intent: "interrupt_polite", step: "charts" },
    { say: "Excuse me, Vanessa.", intent: "interrupt_ctx", step: "charts" },
    { say: "One second.", intent: "interrupt_ctx", step: "charts" },
    { say: "Stop talking.", intent: "rude_interrupt", step: "charts" },
    { say: "Wait, wait, wait!", intent: "rude_interrupt", step: "charts" },
    { say: "Give me to say something.", intent: "interrupt_polite", step: "charts" },
    { say: "Excuse me.", intent: "g_repeat" },
    // --- the concern ---
    { say: "Four days isn't enough.", intent: "give_reason", step: "reason" },
    { say: "Many of our customers are over 60.", intent: "give_reason", step: "reason" },
    { say: "The support team isn't ready.", intent: "give_reason", step: "reason" },
    { say: "With respect, it's not that clear. We haven't tested it yet.", intent: "give_reason", step: "reason" },
    { say: "It's not that clear.", intent: "give_reason", step: "reason" },
    { say: "There are still some bugs on the new site.", intent: "give_reason", step: "reason" },
    { say: "What if it crashes?", intent: "give_reason", step: "reason" },
    { say: "Because our customers are used to the old site.", intent: "give_reason", step: "reason" },
    { say: "The timing.", intent: "concern_ctx", step: "reason" },
    { say: "The testing, mostly.", intent: "concern_ctx", step: "reason" },
    { say: "The timing.", intent: "none" },
    { say: "We have tested it.", intent: "none", step: "reason", not: ["give_reason"] },
    // a statement the grammar may also read as a question ("The support team is ready?"): never a concern
    { say: "The support team is ready.", intent: "ask_q", step: "reason", not: ["give_reason"] },
    // --- her strong point ---
    { say: "That's a fair point. However…", intent: "ack_point", step: "counter" },
    { say: "I take your point.", intent: "ack_point", step: "counter" },
    { say: "You're right about the cost.", intent: "ack_point", step: "counter" },
    { say: "Good point. The old site is slow.", intent: "ack_point", step: "counter" },
    { say: "You have right.", intent: "ack_point", step: "counter" },
    { say: "That's a fair point. However, what if we keep the old site for a month?", intent: "ack_point", step: "counter" },
    { say: "$4,000 a month is a lot.", intent: "ack_point", step: "counter" },
    { say: "That's not a fair point.", intent: "disagree_polite", step: "counter", not: ["ack_point"] },
    { say: "You're not wrong.", intent: "ack_point", step: "counter", not: ["rude_disagree"] },
    // --- another way ---
    { say: "Could we look at it another way?", intent: "offer_alt", step: "alternative" },
    { say: "Have we considered a soft launch?", intent: "offer_alt", step: "alternative" },
    { say: "What if we keep the old site for a month?", intent: "offer_alt", step: "alternative" },
    { say: "How about launching it as a beta?", intent: "offer_alt", step: "alternative" },
    { say: "Can we find a compromise?", intent: "offer_alt", step: "alternative" },
    { say: "Why don't we train the support team first?", intent: "offer_alt", step: "alternative" },
    { say: "Maybe we could tell the customers first.", intent: "offer_alt", step: "alternative" },
    { say: "Let's postpone it by two weeks.", intent: "offer_alt", step: "alternative" },
    { say: "Shall we keep both sites for a while?", intent: "offer_alt", step: "alternative" },
    { say: "Don't shut down the old site yet.", intent: "offer_alt", step: "alternative" },
    { say: "We shouldn't launch it as a beta.", intent: "none", step: "alternative", not: ["offer_alt"] },
    // --- settling it ---
    { say: "Agreed.", intent: "accept_deal", step: "resolve" },
    { say: "Now that works for me.", intent: "accept_deal", step: "resolve" },
    { say: "I can live with that.", intent: "accept_deal", step: "resolve" },
    { say: "Let's agree to disagree.", intent: "agree_to_disagree", step: "resolve" },
    { say: "Let's ask Greg.", intent: "agree_to_disagree", step: "resolve" },
    { say: "How about three weeks?", intent: "counter_offer", step: "resolve", slots: {} },
    { say: "How about a fortnight?", intent: "counter_offer", step: "resolve" },
    { say: "That doesn't work for me.", intent: "disagree_polite", step: "resolve", not: ["accept_deal"] },
    { say: "I can't live with that.", intent: "disagree_polite", step: "resolve", not: ["accept_deal"] },
    { say: "No deal.", intent: "disagree_polite", step: "resolve", not: ["accept_deal"] },
    { say: "Okay, you win. Let's do it your way.", intent: "give_in", step: "resolve" },
    { say: "You haven't convinced me.", intent: "disagree_polite", step: "resolve", not: ["give_in"] },
    // --- the twist (let_her_ctx is tested in the sims: it exists only while she cuts in) ---
    { say: "Could I just finish my point?", intent: "finish_first" },
    { say: "Just one second, please.", intent: "finish_first" },
    { say: "Let me to finish.", intent: "finish_first" },
    // --- the goodbye ---
    { say: "Monday works for me.", intent: "monday_yes" },
    { say: "See you Monday.", intent: "monday_yes" },
    { say: "I'd say green.", intent: "none" },
    // --- walking out ---
    { say: "This is a waste of time.", intent: "walk_away" },
    { say: "Sorry, I have to go.", intent: "g_bye" },
    { say: "I'm not leaving.", intent: "none", not: ["walk_away"] },
    // --- nonsense ---
    { say: "banana rocket purple sky", intent: "none" },
    { say: "The cat is sleeping on the sofa", intent: "none" },
  ],

  sims: [
    // The happy path: a compromise, and Vanessa cuts in (twist pinned on every seed); coffee at the end.
    { name: "compromise, Vanessa cuts in", turns: [
      "I'm not sure about that.", "Sorry, can I just come in here?", "We haven't tested it yet.", "That's a fair point. However…",
      "What if we launch it as a beta?", "Sure, go ahead.", "Agreed.", "Monday works for me.", "I'd love to.",
    ], expect: { complete: true, state: { outcome: "deal", twistDone: true } }, auto: AUTO, setup: SIM(true, false, "coffee") },
    // Vanessa refuses the proposal; the learner agrees to disagree and Greg makes the call; the teal goodbye.
    { name: "stubborn: agree to disagree, Greg decides", turns: [
      "I'd push back a little on that.", "Excuse me, could I add something?", "Four days isn't enough.", "I take your point.",
      "Have we considered a soft launch?", "Let's agree to disagree.", "See you Monday.", "I'd say green.", "Teal.",
    ], expect: { complete: true, state: { outcome: "boss" } }, auto: AUTO, setup: SIM(false, true, "teal") },
    // Questions first, a short answer to "Is it the timing?", "another way" with nothing concrete, then bargaining.
    { name: "questions, short answers, bargaining", turns: [
      "Why Friday?", "Have we tested it properly?", "I see your point, but I'm not sure I agree.", "Wait, can I jump in here for a second?",
      "Hmm, I don't know.", "The timing.", "You're right about the cost.", "Could we look at it another way?", "How about keeping the old site as a backup?",
      "How about three weeks?", "Okay, deal.", "Sure. See you then!", "Maybe next time.",
    ], expect: { complete: true, state: { outcome: "deal", reason: "c_time", offer: "final" } }, auto: AUTO, setup: SIM(false, false, "coffee") },
    // Blunt all the way: the meeting still ends in a deal, but without the stamp, and Vanessa's goodbye is cold.
    { name: "rude: a deal without the stamp", turns: [
      "That's a stupid idea.", "Stop talking.", "We need more time.", "You're wrong.", "That's a fair point.",
      "Let's keep the old site for a month.", "Agreed.", "Bye.",
    ], expect: { complete: false, state: { outcome: "deal", rudeOpen: true, interruptedPolite: false } }, auto: AUTO, setup: SIM(false, false, "coffee") },
    // Agreeing twice with the plan: the learner gives in (no stamp).
    { name: "giving in at the start", turns: ["Sounds great!", "I agree.", "See you Monday."],
      expect: { complete: false, state: { outcome: "gave_in" } }, auto: AUTO, setup: SIM(false, false, "coffee") },
    // Walking out of the meeting (no stamp).
    { name: "walking out", turns: ["I'm not sure about that.", "Sorry, I have to go."],
      expect: { complete: false, state: { outcome: "walked" } }, auto: AUTO, setup: SIM(false, false, "coffee") },
    // The twist on every seed: "Could I just finish my point?"; Vanessa first refuses, a second proposal softens her.
    { name: "twist: finish my point; a second proposal", turns: [
      "I have some concerns about Friday.", "Sorry to interrupt, but many of our customers are over 60.", "Good point. The old site is slow.",
      "How about launching it as a beta?", "Could I just finish my point?", "What if we also train the support team first?",
      "Now that works for me.", "Same time Monday works for me.", "Only if you're buying!",
    ], expect: { complete: true, state: { outcome: "deal", twistDone: true, softened: true } }, auto: AUTO, setup: SIM(true, true, "coffee") },
    // The twist answered rudely: Greg decides, no stamp (the twist item stays open); "blue it is" at the goodbye.
    { name: "twist answered rudely", turns: [
      "I'm not sure about that.", "Sorry, can I just come in here?", "We haven't tested it yet.", "You might be right about the phones.",
      "What if we keep the old site for a month?", "Let me talk!", "Let's agree to disagree.", "Okay, see you Monday.", "Fine, blue it is.",
    ], expect: { complete: false, state: { outcome: "boss", twistFired: true, twistDone: false } }, auto: AUTO, setup: SIM(true, false, "teal") },
    // Vanessa finishes her charts herself (no polite interruption: no stamp); a vague reason first.
    { name: "the monologue runs out; a vague reason", turns: [
      "I'd push back a little on that.", "Okay.", "Right.", "Yes.", "It's not that clear.", "There are still some bugs on the new site.",
      "Fair enough.", "Can we find a compromise?", "Agreed.", "See you Monday.", "Sorry, I can't today.",
    ], expect: { complete: false, state: { outcome: "deal", interruptedPolite: false, chartsOver: true } }, auto: AUTO, setup: SIM(false, false, "coffee") },
    // Bargaining for a month, then asking Greg: he makes the call.
    { name: "a month? Greg decides", turns: [
      "I'm not sure that's the best approach.", "Sorry to interrupt, but the support team isn't ready.", "I take your point.",
      "Maybe we could postpone it by two weeks.", "How about a month?", "Greg, what do you think?", "Thanks, see you Monday.", "Maybe next time.",
    ], expect: { complete: true, state: { outcome: "boss" } }, auto: AUTO, setup: SIM(false, false, "coffee") },
    // A bare "No." ("Care to elaborate?"), a proposal during her counterpoint ("First, do you agree…?" – "Yes."),
    // "No." to "Same time Monday?", and the teal goodbye in two steps.
    { name: "a bare no; a proposal too early; the teal goodbye", turns: [
      "No.", "We need more time.", "Excuse me, can I add something?", "We need more time.", "What if we keep the old site for a month?",
      "Yes.", "Agreed.", "No.", "Green?", "Okay.",
    ], expect: { complete: true, state: { outcome: "deal", firstAgreeSaid: true } }, auto: { closing: "Monday works for me.", teal: "I'd say green.", teal2: "Teal." },
    setup: SIM(false, false, "teal") },
    // No dead ends: no concern after three prompts (Vanessa answers the likely one), her point not taken twice, no
    // proposal (she meets the learner halfway herself), then a stalemate: Greg decides. No stamp.
    { name: "fallbacks: no concern, no proposal, a stalemate", turns: [
      "I disagree.", "Sorry, can I just come in here?", "Okay.", "Yes.", "I don't know.", "I still think it's too risky.",
      "But it's not tested!", "I don't know.", "Okay.", "I don't agree.", "I still don't agree.", "Bye.",
    ], expect: { complete: false, state: { outcome: "boss", acked: false, altGiven: false, interruptedPolite: true } },
    auto: { closing: "Monday works for me.", coffee: "Maybe next time." }, setup: SIM(false, false, "coffee") },
    // Asking both of them first, "I have a quick question" as the way in, a question as the concern, a hedge with
    // a proposal ("I don't know, maybe a beta?"), and leaving right after the deal.
    { name: "asking Vanessa and Greg; hedges; leaving at the end", turns: [
      "Vanessa, what do you think?", "Why Friday?", "Greg, what do you think?", "I'm not sure about this plan.",
      "Sorry, I have a quick question.", "Is it tested?", "I see your point.", "I don't know, maybe a beta?", "Sounds good.", "Sorry, I have to go.",
    ], expect: { complete: true, state: { outcome: "deal", reason: "c_test", alt: "a_beta" } }, auto: AUTO, setup: SIM(false, false, "coffee") },
    // Walking out with a blunt remark (no stamp).
    { name: "walking out: a waste of time", turns: ["I'm not sure about that.", "Sorry, can I just come in here?", "This is a waste of time."],
      expect: { complete: false, state: { outcome: "walked" } }, auto: AUTO, setup: SIM(false, false, "coffee") },
    // Giving in at the end: Vanessa refuses, "You're right." – "So you agree with me?" – "Yes." (no stamp).
    { name: "giving in at the end", turns: [
      "I'm not sure about that.", "Sorry, can I just come in here?", "We haven't tested it yet.", "Good point.",
      "Let's keep the old site for a month.", "I still think it's too risky.", "You're right.", "Yes.", "Bye.",
    ], expect: { complete: false, state: { outcome: "gave_in" } }, auto: AUTO, setup: SIM(false, true, "coffee") },
    // "You're right." to Vanessa's refusal: "So you agree with me?" – "No, let's agree to disagree."
    { name: "stubborn: so you agree with me? no", turns: [
      "With respect, I see it a bit differently.", "Excuse me, Vanessa.", "We need more time.", "That makes sense.",
      "What if we tell the customers first?", "You're right.", "No, let's agree to disagree.", "See you then!", "I'd love to.",
    ], expect: { complete: true, state: { outcome: "boss" } }, auto: AUTO, setup: SIM(false, true, "coffee") },
  ],
};

export default meeting;
