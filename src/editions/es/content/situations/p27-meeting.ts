// P27 "With Respect" → Puerto Colibrí: "Con todo respeto" (advanced, B2–C1). Disagreeing politely in a meeting.
// Línea Clara, the meeting room, Monday at nine. Gerardo (the team manager) opens the meeting and Vanessa (the
// marketing lead) pitches her plan: launch the new website ("la página nueva") this Friday and shut the old one down
// ("darla de baja") the same day, "de un jalón". The learner says politely that they disagree ("Entiendo tu punto,
// pero…", "Con todo respeto, yo lo veo un poco diferente", "Yo no estaría tan seguro"), cuts into Vanessa's chart
// monologue politely ("Perdón que te interrumpa, pero…", "¿Me permites un segundo?"), explains the concern (testing,
// time, older customers, the support team, bugs, risk), acknowledges her strong point ("Es un punto válido. Sin
// embargo…": the old site costs sixty thousand pesos a month and 60% of visitors come in from their phones), offers
// another way ("¿Y si probamos…?", "¿Lo podríamos ver de otra forma?", "¿Ya consideramos un lanzamiento de prueba?")
// and settles it: a compromise ("Trato hecho", "Así sí me funciona") or "Estamos de acuerdo en no estar de acuerdo",
// and Gerardo decides. Giving in or walking out ends the meeting without the stamp.
// Twist (more often on later visits): Vanessa cuts in while the learner proposes ("Perdón, ¿puedo interrumpir un
// segundo?"): let her ("Claro, adelante.") or ask to finish ("¿Me dejas terminar mi idea?").
// Variety: Vanessa may refuse the first proposal (stubborn); the goodbye ends with a coffee ("Yo invito") or with the
// color of the new buttons (azules, verdes… turquesa); Gerardo reminds a returning player of last week's doubts.
//
// Keeps the English file's id, steps, intents, twists and handler logic. What changed for a Mexican office:
// - Everyone says tú (colleagues in a Mexican office; both are `informal` in the cast); Gerardo says ustedes to the
//   room ("¿Ven?", "sigan", "ustedes dos").
// - The money is pesos: the old site "nos cuesta sesenta mil pesos al mes" (a made-up company figure for hosting and
//   maintenance; nothing real is taught by it). The interns' popcorn = las palomitas; interns = los practicantes.
// - Mexican words, each with a neutral twin: de un jalón (de una vez), sale (bueno). Accepted from learners: junta,
//   platicarlo, me late / no me late, recorrer (postpone), tantito, and Spain's vale, vosotros, móvil.
// - "Agree to disagree": Vanessa says "Estamos de acuerdo en que no estamos de acuerdo"; the learner's "Estamos de
//   acuerdo en no estar de acuerdo", "Cada quien con su opinión" and the calque "Acordemos estar en desacuerdo" all work.
// - Learners' calques of English get a short tip: "hace sentido" (tiene sentido), "estás correcta" (tienes razón),
//   "¿Cómo piensas?" (¿Qué opinas?); "con el debido respeto" gets the same tip as "with all due respect".
// The learner's own gender: {m:…|f:…}; Vanessa (f) and Gerardo (m) have fixed genders, so their forms are written out.
//
// Outcomes (c.s.outcome): "deal" (compromise) and "boss" (agree to disagree, Gerardo decides) end with the stamp when
// every checklist item is ticked; "gave_in" and "walked" never get it. The end notes travel in a harmless
// c.event("meeting-outcome"), as in the English edition.
// A deal (and giving in) takes a clear yes (audit, 5 Nov): "Está bien, gracias", "Tienes razón", "Puede ser", "Déjame
// pensarlo" or an echo of her weeks ("¿Dos semanas?") get "¿Trato hecho?" once more, then Gerardo decides; a counter-offer
// is never a yes ("¿Solo dos semanas?", "Cuatro semanas me funciona"); after her final offer (three weeks) Gerardo keeps
// her three. "Está bien, gracias" / "Gracias" to the coffee gets "¿Eso es un sí o un no?".
//
// NEEDS: (optional, as in the English edition) Game.ts could show c.event("meeting-outcome", { outcome, done, note })
// as an end card or toast; the game ignores the event today.

import type { Ctx, Pending, Segment, SituationDef, Suggestion, Tip } from "@/content/types";
import { t } from "@/content/dsl";
import { GLOBAL_HANDLERS } from "@/content/global";

// ---------------------------------------------------------------------------
// Flags used more than once

const F_ON = "el + a day = on (el viernes: on Friday).";
const F_ART = "The article has no English word here.";
const F_LA = "la = it (la página, the website).";
const F_JALON = "Mexican: de un jalón = all in one go.";
const F_DISC = "Said with indignation: “excuse me?”, what did you just say?";

// ---------------------------------------------------------------------------
// Speakers and per-turn helpers

/** Vanessa / Gerardo say a line (the speaker switches first). */
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
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const heardF = (c: Ctx) => fold(c.heard || "");
/** The pieces of the learner's whole turn (one answer may arrive as several pieces). */
const turnSegments = (c: Ctx): Segment[] => ((c as any).conv?.out?.parse?.segments ?? []) as Segment[];
/** "¿Dos semanas? ¿Qué tal un mes?": the last counter-offer in the turn counts (the first is an echo). */
const lastCounter = (c: Ctx, sg?: Segment): Segment | undefined => turnSegments(c).filter((s) => s.intent === "counter_offer").at(-1) ?? sg;
/** A proposal made in this very turn (Vanessa may cut in only while the learner is proposing). */
const FRESH = new WeakSet<Ctx>();

const CONCERNS = ["c_test", "c_time", "c_cust", "c_support", "c_bugs", "c_risk"];
const ALTS = ["a_beta", "a_backup", "a_delay", "a_train", "a_inform", "a_fix", "a_mid"];
const QS: Record<string, string> = { q_test: "c_test", q_time: "c_time", q_cust: "c_cust", q_support: "c_support", q_bugs: "c_bugs", q_risk: "c_risk" };
/** The concern a piece carries (a concrete one wins over "no lo tengo tan claro"). */
const concernOf = (sg?: Segment) => sg?.tags.find((x) => CONCERNS.includes(x)) ?? (sg?.tags.includes("c_vague") ? "c_vague" : null);
/** Vanessa's answer to a vague concern: "No lo tengo claro" (it's crystal clear), "Hay un problema" (which one?),
 *  "Es complicado" (why?). */
const vagueLine = (sg?: Segment) => (sg?.tags.includes("what") ? "v_c_which" : sg?.tags.includes("hard") ? "v_c_why" : "v_c_vague");
const altOf = (sg?: Segment) => sg?.tags.find((x) => ALTS.includes(x)) ?? null;
const qOf = (sg?: Segment) => sg?.tags.find((x) => x.startsWith("q_")) ?? null;
/** "Perdón, …" / "Disculpa, …" before the learner's point: a polite way in while Vanessa is talking. */
const politeOpener = (c: Ctx) => /^\W*(perdon|perdona|perdoname|disculpa|disculpame|disculpe|perdone|con permiso)\b/.test(heardF(c));
const LEAVING = /\b(me tengo que ir|tengo que irme|ya me voy|me voy|tengo (otra|una) (junta|reunion|llamada|cita))\b/;
const saysNo = (c: Ctx) => /^\W*(no|nel|nop)\b/.test(heardF(c));
/** "No, gracias." / "Hoy no, gracias.": thanks that decline (the coffee, Monday, Vanessa's "¿puedo interrumpir?"). */
const thanksNo = (c: Ctx) => /\b(no|nel|nop)\b/.test(heardF(c));
/** Asked as a question: a "¿" or "?", or a question word first ("El equipo de soporte ya está listo." is no question). */
const asked = (c: Ctx) => /[¿?]/.test(c.heard || "") || /^\W*(por que|porque|que|como|cuando|quien|cual|cuanto|donde|hemos|han)\b/.test(heardF(c));
/** "Está bien, gracias." / "Ok, gracias." / "Vale, gracias." / "Gracias.": polite, but no clear yes to a deal or an
 *  invitation (in Mexico often a polite no; AUTHORING rule 17). */
const politeClose = (c: Ctx) => /^\W*((esta bien|ok|okay|bueno|vale|muy bien)\W+)?(muchas )?gracias\W*$/
  .test(heardF(c).replace(/\b(vanessa|gerardo)\b/g, " ").replace(/\s+/g, " ").trim());
/** A turn that opens with a clear yes ("Sí, tres semanas.", "Ok, dos semanas.", "Bueno, tienes razón."). */
const yesLead = (c: Ctx) => /^\W*(si|claro|ok|okay|va|sale|vale|bueno|esta bien|de acuerdo|perfecto|listo|trato hecho|hecho|acepto|me parece bien|me funciona)\b/.test(heardF(c));

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
/** Gerardo asks everyone to be nice once the learner has been blunt twice. */
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
/** A proposal (a_other: "¿Lo podríamos ver de otra forma?" with nothing concrete yet). */
function storeAlt(c: Ctx, tag: string | null, sg?: Segment) {
  if (!tag) return;
  c.s.altGiven = true;
  if (tag === "a_other") return;
  c.s.alt = tag;
  if (tag === "a_beta") c.s.altSoft = !!sg?.tags.includes("soft"); // "un lanzamiento de prueba" rather than "una beta"
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
    suggest: [{ lt: "Let Vanessa in, or ask to finish your point", hint: "twist" }],
    yes: (cc) => twistAnswer(cc, "let"),
    no: (cc) => twistAnswer(cc, "rude"),
    on: {
      let_her_ctx: (cc) => twistAnswer(cc, "let"),
      finish_first: (cc) => twistAnswer(cc, "finish"),
      rude_interrupt: (cc) => twistAnswer(cc, "rude"),
      g_wait: (cc) => twistAnswer(cc, "finish"),
      g_ok: (cc) => twistAnswer(cc, "let"),
      g_thanks: (cc) => twistAnswer(cc, thanksNo(cc) ? "finish" : "let"), // "Ahorita no, gracias."
    },
  });
}

/** Anything else while Vanessa is cutting in: she takes it as a yes and makes her point. */
function twistGuard(c: Ctx): boolean {
  if (!c.s.twistOpen) return false;
  twistAnswer(c, "let");
  return true;
}

/** Let her in, ask to finish, or tell her off; then Gerardo calms the room and Vanessa answers the proposal. */
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
/** Gerardo splits it: two more weeks for the old site, or her three after her final offer (never less than she gave). */
function gregDecides(c: Ctx) {
  if (c.s.outcome) return;
  G(c, "g_decide1"); G(c, c.s.offer === "final" ? "g_decide2_final" : "g_decide2"); G(c, "g_decide3");
  c.s.outcome = "boss";
}
/** No clear yes to her offer ("Está bien, gracias.", "Tienes razón.", "Puede ser.", "¿Dos semanas?"): "¿Trato hecho?"
 *  once more; the next time Gerardo decides. A deal is made only on a clear yes. */
function dealAgain(c: Ctx) {
  if (c.s.dealAgain) { gregDecides(c); return; }
  c.s.dealAgain = true;
  V(c, "v_deal_q");
  waitHere(c);
}
function gaveIn(c: Ctx) {
  if (c.s.outcome) return;
  V(c, "v_gave_in"); G(c, "g_gave_in");
  c.s.outcome = "gave_in";
}
/** The learner leaves the meeting: Gerardo closes it, nothing is settled. */
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
  gave_in: "You gave in this time. Try again, and stand up for your view politely.",
  walked: "The meeting didn't finish. Next time, try to reach an agreement.",
};
/** A deal (or Gerardo's call) without the stamp: say which items are missing, so the stamp is never lost silently. */
function missedNote(c: Ctx): string {
  const miss = [
    (!c.s.disagreed || c.s.rudeOpen) && "say politely that you disagree",
    !c.s.interruptedPolite && "cut in politely while Vanessa talks",
    !c.s.reasonGiven && "explain your concern",
    !c.s.acked && "acknowledge Vanessa's point",
    !c.s.altGiven && "suggest another way",
    c.s.twistFired && !c.s.twistDone && "answer politely when Vanessa cuts in",
  ].filter(Boolean);
  return `You reached an agreement, but no stamp yet. Next time, remember to: ${miss.join("; ")}.`;
}

// ---------------------------------------------------------------------------
// The goodbye: "¿El lunes a la misma hora?", then a coffee or the color of the buttons

function closingPending(): Pending {
  return {
    id: "closing", expects: ["monday_yes", "monday_no_ctx", "nine_q_ctx"], hints: ["bye"],
    suggest: [{ lt: "Answer Gerardo and say goodbye", hint: "bye" }],
    yes: (cc) => closingTurn(cc, "yes"),
    no: (cc) => closingTurn(cc, "no"),
    on: {
      monday_yes: (cc) => closingTurn(cc, "yes"),
      monday_no_ctx: (cc) => closingTurn(cc, "no"),
      nine_q_ctx: (cc) => nineQ(cc),
      g_bye: (cc) => closingTurn(cc, "bye"),
      g_thanks: (cc) => closingTurn(cc, thanksNo(cc) ? "no" : "yes"), // "No, gracias." is a no
      g_ok: (cc) => closingTurn(cc, "yes"),
    },
  };
}

/** "¿A qué hora?" / "¿A las nueve?" to "¿El lunes a la misma hora?": Gerardo says the time and the question stays;
 *  "A las nueve, perfecto." (said, not asked) is a yes. */
function nineQ(c: Ctx) {
  if (c.s.closingState !== "monday") return;
  if (!/[¿?]/.test(c.heard || "") && !/\bque hora\b/.test(heardF(c))) { closingTurn(c, "yes"); return; }
  if (!once(c, "nine")) return;
  G(c, "g_nine");
  c.expect(closingPending());
}

/** "¿Un café? Yo invito.": "Está bien, gracias" / "Gracias" may be a yes or a polite no, so she asks once
 *  ("¿Eso es un sí o un no?"); asked again, it is the polite no it most likely was. */
function coffeePending(): Pending {
  const unsureOr = (cc: Ctx, kind: string) => closingTurn(cc, politeClose(cc) ? "unsure" : kind);
  return {
    id: "coffee", expects: ["coffee_yes_ctx", "coffee_no_ctx"], hints: ["coffee"],
    suggest: [{ lt: "Accept or turn down the coffee", hint: "coffee" }],
    yes: (cc) => unsureOr(cc, "yes"), no: (cc) => closingTurn(cc, "no"),
    on: {
      coffee_yes_ctx: (cc) => closingTurn(cc, "yes"), coffee_no_ctx: (cc) => closingTurn(cc, "no"),
      g_thanks: (cc) => (thanksNo(cc) ? closingTurn(cc, "no") : unsureOr(cc, "yes")), g_bye: (cc) => closingTurn(cc, "no"), g_ok: (cc) => unsureOr(cc, "yes"),
    },
  };
}

/** Vanessa's last word: cold after a rude meeting, a plain goodbye after giving in, otherwise a coffee or turquoise. */
function flair(c: Ctx) {
  if (c.s.outcome === "gave_in") { V(c, "v_bye"); bye(c); return; }
  if (c.s.blunt >= 2) { V(c, "v_cold_bye"); bye(c); return; }
  if (c.s.flair === "coffee") {
    c.s.closingState = "coffee";
    V(c, "v_coffee");
    c.expect(coffeePending());
    return;
  }
  c.s.closingState = "teal";
  V(c, "v_teal1");
  c.expect({
    id: "teal", expects: ["teal_ctx", "disagree_polite"], hints: ["teal"],
    suggest: [{ lt: "Answer about the color of the buttons", hint: "teal" }],
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
    // "Perdón, me tengo que ir.": no coffee or colors, just the goodbye
    if (kind === "bye" && LEAVING.test(heardF(c))) { V(c, c.s.blunt >= 2 ? "v_cold_bye" : "v_bye"); bye(c); return; }
    flair(c);
    return;
  }
  if (st === "coffee") {
    if (kind === "unsure" && !c.s.coffeeAsked) { c.s.coffeeAsked = true; V(c, "v_yes_or_no"); c.expect(coffeePending()); return; }
    if (kind === "unsure") kind = "no"; // "Está bien, gracias." twice: the polite no
    c.s.coffeeAnswer = kind;
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
        suggest: [{ lt: "Agree on the color", hint: "teal" }],
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
    c.s.anyoneAsked = c.visits < 1; // "¿Nadie tiene dudas?": a bare yes or no is unclear
    waitHere(c);
    return;
  }
  gaveIn(c);
}

/** A bare yes/no at the pitch that doesn't mean "I agree" / "I disagree": "¿Algún comentario? ¿No? Perfecto." –
 *  "Bueno, sí." (the learner has something to say) or "No." (no objections); Gerardo's "¿Nadie tiene dudas?" – "Sí."
 *  (which way?): Vanessa asks plainly. False when the question is a plain one. */
function pitchYesNo(c: Ctx, yes: boolean): boolean {
  if (c.s.anyoneAsked) { c.s.anyoneAsked = false; c.s.thoughtsAny = false; V(c, "v_reask"); c.hold(); return true; }
  if (!c.s.thoughtsAny) return false;
  c.s.thoughtsAny = false;
  if (yes) { V(c, "v_go_ahead"); c.hold(); } else agreePlan(c);
  return true;
}

/** A positive remark about the plan ("La página nueva está lista."): nothing to answer; Vanessa asks again. */
function agreePlanWeak(c: Ctx) { if (once(c, "react")) waitHere(c); }

/** Interrupting the monologue: politely ("Ay, perdón.") or rudely ("¿Disculpa? …Está bien."). */
function interruptNow(c: Ctx, polite: boolean, withPoint: boolean) {
  c.s.interrupted = true;
  if (polite) c.s.interruptedPolite = true;
  c.s.chartsEnd = polite ? "polite" : "rude";
  if (!polite) { c.s.blunt++; c.tip(TIPS.rude_stop); }
  if (!withPoint) return; // the reason step gives the floor ("Ay, perdón. Adelante.")
  c.s.floorGiven = true;
  if (polite) V(c, "v_oh_sorry");
  else { V(c, "v_excuse_me"); maybeFriendly(c); }
}

/** A short "no" at the start: "¿No? ¿Nada más “no”? ¿Me explicas por qué?" */
function bareNo(c: Ctx) {
  c.s.disagreed = true;
  c.tip(TIPS.soften);
  V(c, "v_no_elab");
  c.hold(); // the pitch step (and its help) stays
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
      return; // the charts follow ("Ay, sabía que alguien iba a decir eso.")
    case "charts":
      if (politeOpener(c) && !rude) { interruptNow(c, true, true); onDisagree(c, sg); return; }
      storeConcern(c, conc);
      return; // she talks over it
    case "reason":
      c.s.floorGiven = true;
      if (conc && conc !== "c_vague") { hearReason(c, conc); return; }
      if (!once(c, "react")) return;
      V(c, conc === "c_vague" ? vagueLine(sg) : "v_why_again");
      maybeFriendly(c);
      waitHere(c);
      return;
    case "counter":
      storeConcern(c, conc);
      if (once(c, "react")) notAck(c);
      return;
    case "alternative":
      storeConcern(c, conc);
      return; // the step asks again ("¿No habrá un punto medio aquí?"), unless a proposal comes with it
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
      // "Ya veo." / "Está bien, gracias." to "¿Qué opinas?": no opinion yet, Vanessa asks plainly
      if (weak || politeClose(c)) { if (once(c, "react")) { V(c, "v_reask"); waitHere(c); } return; }
      if (conc || alt) { onDisagree(c, sg); return; } // "Buen punto, pero necesitamos más tiempo."
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
      storeAlt(c, alt, sg); // "…sin embargo, ¿y si…?": heard right away (the alternative step)
      return;
    case "alternative":
      if (alt) onOffer(c, sg, false);
      return; // otherwise the step asks again
    case "resolve":
      if (alt) { onOffer(c, sg, false); return; }
      // "Me parece bien, pero tres semanas.": the counter-offer later in the turn answers, not the yes
      if (turnSegments(c).some((x) => x.intent === "counter_offer")) return;
      // "Tres semanas me funciona." to her two weeks, "Cuatro semanas me funciona." to her three: that's bargaining
      if (kind === "accept" && namedWeeks(sg) && (c.s.offer === "none" || askedWeeks(c, sg, offeredWeeks(c)) > offeredWeeks(c))) {
        resolveTurn(c, "counter", sg);
        return;
      }
      // "Tienes razón, trato hecho.": the yes later in the turn answers
      if (kind !== "accept" && turnSegments(c).some((x) => x.intent === "accept_deal")) return;
      // "Es un punto válido. Sin embargo, sigo preocupado.": a "but" after granting her point is no yes
      if (kind === "ack" && /\b(pero|sin embargo|aunque|aun asi)\b/.test(heardF(c))) { resolveTurn(c, "disagree", sg); return; }
      resolveTurn(c, weak ? "unsure" : kind === "ack" ? "ack" : "accept", sg);
      return;
  }
}

function onOffer(c: Ctx, sg: Segment | undefined, counter: boolean) {
  // "No hay un punto medio." (said, not asked) is no proposal: the opposite ("¿No hay un punto medio?" is one)
  if (altOf(sg) === "a_mid" && /^\W*no (hay|existe|veo)\b/.test(heardF(c)) && !asked(c)) { onDisagree(c, undefined); return; }
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
      // "¿Y si dejamos la página vieja un mes?" to her two weeks: bargaining about the same weeks
      if (alt === "a_backup" && namedWeeks(sg) && c.s.offer !== "none") { resolveTurn(c, "counter", sg); return; }
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
  if (!asked(c)) { if (ph === "pitch") agreePlanWeak(c); return; } // a statement: "El equipo de soporte está listo."
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
      if (conc) { hearReason(c, conc); return; } // "¿Ya la probamos?" is the concern
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

/** "Perdón, ¿puedo interrumpir un momento?" / "¡Ya basta!" */
function onInterrupt(c: Ctx, sg: Segment | undefined, polite: boolean) {
  if (twistGuard(c)) return;
  const ph = phase(c);
  if (ph === "ended") return;
  if (ph === "closing") { closingTurn(c, "other"); return; }
  const conc = concernOf(sg);
  if (ph === "charts") {
    if (!conc) { interruptNow(c, polite, false); return; }
    interruptNow(c, polite, true);
    if (conc === "c_vague") { V(c, vagueLine(sg)); waitHere(c); return; }
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
  // asking for the floor politely later on (after her charts ran out) still counts as cutting in politely
  if (ph !== "pitch") c.s.interruptedPolite = true;
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
      // the way forward the learner proposes: Gerardo decides
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

/** Weeks the learner asks for ("¿Qué tal tres semanas?", "un mes"); 0 = not said. */
function weeksOf(sg?: Segment): number {
  const tags = sg?.tags ?? [];
  const w = tags.find((x) => /^w\d+$/.test(x));
  if (w) return Number(w.slice(1));
  const n = Number(sg?.slots?.wk);
  if (n > 0) return n;
  return tags.includes("more") ? 3 : 0;
}
/** A number of weeks said ("tres semanas", "un mes"), not only "more time". */
const namedWeeks = (sg?: Segment) => !!sg?.tags.some((x) => /^w\d+$/.test(x)) || Number(sg?.slots?.wk) > 0;
/** The weeks Vanessa offers: two (her compromise) or three (her final offer). */
const offeredWeeks = (c: Ctx) => (c.s.offer === "final" ? 3 : 2);
/** The weeks the learner asks for at the deal, against the weeks she offers: "más tiempo" / "no me alcanzan" and
 *  "¿Solo dos semanas?" want more, "una semana más" adds to hers, an echo ("¿Dos semanas?") is her number. */
function askedWeeks(c: Ctx, sg: Segment | undefined, offered: number): number {
  if (!namedWeeks(sg)) return offered + 1;
  const w = weeksOf(sg), h = heardF(c);
  if (/\b(semanas?|mes) mas\b|\botr[ao] (semana|mes)\b/.test(h)) return offered + w;
  if (/\b(solo|nada mas|nomas|unicamente|apenas)\b/.test(h) && w <= offered) return offered + 1;
  return w;
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
  // "half" (algo intermedio… ¿Trato hecho?) or "final" (Tres semanas. Es mi última oferta.): a deal only on a clear
  // yes. "Está bien, gracias.", "Tienes razón.", "Puede ser." and an echo of her weeks get "¿Trato hecho?" again.
  if (kind === "accept") { if (politeClose(c)) dealAgain(c); else deal(c); return; }
  if (kind === "ack") { if (yesLead(c) && !/\b(puede|quizas?|tal vez|a lo mejor)\b/.test(heardF(c))) deal(c); else dealAgain(c); return; }
  if (kind === "atd") { V(c, "v_atd"); gregDecides(c); return; }
  if (off === "final" && kind === "unsure") { dealAgain(c); return; } // "No sé.", "Déjame pensarlo."
  if (kind === "counter") {
    const offered = offeredWeeks(c);
    const w = askedWeeks(c, lastCounter(c, sg), offered);
    if (w === offered) { if (yesLead(c)) deal(c); else dealAgain(c); return; } // "Sí, dos semanas." / "¿Dos semanas?"
    if (w < offered) { deal(c); return; } // fewer weeks than she offers: she takes them
    if (off === "final") { gregDecides(c); return; }
    c.s.offer = "final";
    c.s.dealAgain = false;
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

/** "¿O sea que estás de acuerdo conmigo?" (Vanessa refused the proposal and the learner said she was right). Giving in
 *  takes a clear yes: "Está bien, gracias.", "Puede ser.", "Entiendo tu punto." get "¿Entonces? ¿Estás conmigo en
 *  esto?" once, and then count as a no. */
function expectSoAgree(c: Ctx) {
  const yes = (cc: Ctx) => { if (politeClose(cc)) soAgreeAgain(cc); else gaveIn(cc); };
  c.expect({
    id: "so_agree", optional: true, expects: ["agree_to_disagree", "disagree_polite", "offer_alt", "counter_offer", "give_in", "think_ctx"], hints: ["resolve"],
    suggest: [{ lt: "Say you still disagree, or agree to disagree", hint: "resolve" }, { lt: "Suggest another way", hint: "alt" }],
    yes,
    no: (cc) => resolveTurn(cc, "no"),
    on: {
      give_in: (cc) => gaveIn(cc),
      accept_deal: (cc) => { if (saysNo(cc)) resolveTurn(cc, "no"); else yes(cc); },
      agree_plan: (cc) => { if (saysNo(cc)) resolveTurn(cc, "no"); else yes(cc); },
      ack_point: (cc, _sl, sg) => {
        if (altOf(sg)) { onOffer(cc, sg, false); return; }
        if (saysNo(cc) || concernOf(sg)) { resolveTurn(cc, "disagree", sg); return; }
        // "Tienes razón." / "Es cierto." agree with her; "Puede ser." / "Entiendo tu punto." / "Ya veo." don't
        const h = heardF(cc);
        if (/\b(tienes razon|es cierto|es verdad|estoy de acuerdo)\b/.test(h) && !/\b(puede|quizas?|tal vez|a lo mejor)\b/.test(h)) gaveIn(cc);
        else soAgreeAgain(cc);
      },
      think_ctx: (cc) => soAgreeAgain(cc),
      g_thanks: (cc) => { if (thanksNo(cc)) resolveTurn(cc, "no"); else yes(cc); },
      agree_to_disagree: (cc) => resolveTurn(cc, "atd"),
      disagree_polite: (cc, _sl, sg) => resolveTurn(cc, "disagree", sg),
      give_reason: (cc, _sl, sg) => resolveTurn(cc, "disagree", sg),
      offer_alt: (cc, _sl, sg) => onOffer(cc, sg, false),
      counter_offer: (cc, _sl, sg) => onOffer(cc, sg, true),
    },
  });
}
/** No clear answer to "¿O sea que estás de acuerdo conmigo?": asked once more, then taken as a no. */
function soAgreeAgain(c: Ctx) {
  if (c.s.soAgain) { resolveTurn(c, "no"); return; }
  c.s.soAgain = true;
  V(c, "v_reask");
  expectSoAgree(c);
}

// ---------------------------------------------------------------------------
// Tips (English: the learner's own language)

const TIPS: Record<string, Tip> = {
  soften: { key: "soften", lt: "Understood! A flat “No” or “No estoy de acuerdo” sounds blunt in a Mexican meeting. Soften it: “No estoy muy de acuerdo” or “Entiendo tu punto, pero…”.", better: "Entiendo tu punto, pero no estoy muy de acuerdo." },
  too_blunt: { key: "too_blunt", lt: "Understood! But that's too harsh for a colleague: criticize the idea, not the person. Start with “Con todo respeto…” and say what worries you.", better: "Con todo respeto, no creo que sea la mejor opción." },
  rude_stop: { key: "rude_stop", lt: "Understood! Cutting a colleague off like that is rude. Say sorry first and ask for the floor.", better: "Perdón que te interrumpa, ¿puedo decir algo?" },
  rude_twist: { key: "rude_twist", lt: "Understood! But that's rude to a colleague. Let her in (“Claro, adelante.”) or ask politely to finish your point.", better: "¿Me dejas terminar mi idea?" },
  due_respect: { key: "due_respect", lt: "Understood! “Con el debido respeto”, like “with all due respect”, often comes before sharp criticism. Friendlier: “Con todo respeto” or “Entiendo tu punto, pero…”.", better: "Con todo respeto, yo lo veo un poco diferente." },
  hace_sentido: { key: "hace_sentido", lt: "Understood! “Hace sentido” is a copy of English “makes sense”; in Spanish an idea “tiene sentido”.", better: "Tiene sentido." },
  correcto: { key: "correcto", lt: "Understood! In Spanish a person “tiene razón”; “correcto” is for answers and facts.", better: "Tienes razón." },
  how_you_think: { key: "how_you_think", lt: "Understood! “What do you think?” is “¿Qué opinas?” or “¿Tú qué piensas?”, not “¿Cómo piensas?” (that asks about your way of thinking).", better: "Gerardo, ¿tú qué opinas?" },
};

// Answers the simulations give when a moment comes up on some seeds only.
const AUTO: Record<string, string> = {
  pitch: "No estoy muy seguro de eso.", charts: "Perdón, ¿puedo interrumpir un momento?", reason: "Todavía no está probada.",
  counter: "Es un punto válido.", alternative: "¿Y si la lanzamos como beta?", resolve: "Trato hecho.",
  twist: "Claro, adelante.", so_agree: "No, estamos de acuerdo en no estar de acuerdo.", closing: "El lunes me funciona.",
  coffee: "Me encantaría.", teal: "Yo diría verdes.", teal2: "Turquesa.",
};

const PITCH_EX = ["disagree_polite", "rude_disagree", "give_reason", "offer_alt", "ask_q", "agree_plan", "ask_boss", "ack_point", "accept_deal", "give_in", "agree_to_disagree", "walk_away"];
const CHARTS_EX = ["interrupt_polite", "interrupt_ctx", "rude_interrupt", "give_reason", "disagree_polite", "offer_alt", "walk_away"];
const REASON_EX = ["give_reason", "concern_ctx", "disagree_polite", "offer_alt", "ask_q", "interrupt_polite", "walk_away"];
const COUNTER_EX = ["site_problem_ctx", "echo_ctx", "ack_point", "give_reason", "disagree_polite", "rude_disagree", "offer_alt", "agree_to_disagree", "give_in", "agree_plan", "accept_deal", "walk_away"];
const ALT_EX = ["offer_alt", "counter_offer", "agree_to_disagree", "give_in", "give_reason", "ack_point", "ask_boss", "walk_away"];
const RESOLVE_EX = ["accept_deal", "think_ctx", "counter_offer", "agree_to_disagree", "offer_alt", "disagree_polite", "ack_point", "agree_plan", "give_in", "ask_boss", "walk_away"];

const SIM = (twist: boolean, stubborn: boolean, flair: "coffee" | "teal", thoughtsAny = false) => (s: Record<string, any>) => {
  s.twist = twist; s.stubborn = stubborn; s.flair = flair; s.thoughtsAny = thoughtsAny;
};

// ---------------------------------------------------------------------------

export const meeting: SituationDef = {
  id: "p27-meeting",
  song: "P27",
  songTitle: "With Respect",
  title: { en: "Con todo respeto", lt: "With respect" },
  topic: { en: "Un desacuerdo en la reunión", lt: "Disagreeing politely in a meeting" },
  chapter: 8,
  order: 3,
  location: "office",
  npc: "vanessa",
  npcs: ["greg"],
  goal: "Disagree politely with a colleague's plan and find a compromise together.",
  intro: "Monday, 9 a.m., in Línea Clara's meeting room. Gerardo, the team manager, opens the meeting, and Vanessa from marketing presents her plan: launch the new website this Friday and shut the old one down the same day. You think it's too rushed: say so politely, cut in when you need to, explain why, and find a compromise together. Colleagues here say tú to each other.",

  grammar: {
    macros: {
      newsite: "[la | el] (pagina nueva | nueva pagina | pagina web nueva | sitio nuevo | nuevo sitio | sitio web nuevo | web nueva | nueva web | pagina | sitio | web)",
      oldsite: "[la | el] (pagina vieja | vieja pagina | pagina anterior | pagina actual | sitio viejo | sitio anterior | web vieja | pagina de antes | vieja)",
      plan: "(eso | esto | el plan | tu plan | este plan | ese plan | la idea | tu idea | esta idea | esa idea | la propuesta | tu propuesta | la fecha | el viernes | este viernes | el lanzamiento | lanzarla el viernes | lo del viernes | su plan | su idea | su propuesta)",
      cli: "(clientes | usuarios | visitantes)",
      soporte: "(el equipo de soporte | equipo de soporte | soporte | el soporte | atencion a clientes | atencion al cliente | el call center | servicio al cliente | el equipo de atencion a clientes)",
      // polite openers that aren't built-in leads ("perdón", "este", "a ver"… are)
      soft: "[con todo respeto | con todo mi respeto | con (el debido | todo el debido) respeto #tip:due_respect | respetuosamente | sinceramente | honestamente | francamente | la verdad | la neta | mira | oye | pues | bueno | perdona | disculpa | pero | te entiendo pero | entiendo pero]",
      but: "(pero | sin embargo | aunque | aun asi | de todos modos | de todas formas | igual)",
      why: "(porque | ya que | es que | o sea | (el problema | lo que me preocupa | mi preocupacion | mi duda | el tema | la cosa) es que | me preocupa que | me da miedo que | tengo miedo de que | creo que | pienso que | siento que | yo creo que | me parece que)",
      // what the concern is about ("Mi preocupación es la fecha.", "Me preocupan las pruebas.")
      concern_np: "(la fecha #c_time | las fechas #c_time | el tiempo #c_time | los tiempos #c_time | el plazo #c_time | el calendario #c_time | el viernes #c_time | lo del viernes #c_time | las pruebas #c_test | el testing #c_test | [nuestros | los] @cli [mayores | grandes | de mas edad] #c_cust | @soporte #c_support | (los errores | los bugs | las fallas) #c_bugs | (el riesgo | los riesgos) #c_risk)",
      weeks: "(una #w1 | dos #w2 | tres #w3 | cuatro #w4 | un par de #w2 | unas #w3 | unas cuantas #w3 | {wk:number}) (semana | semanas)",
      dur: "(@weeks | un mes #w4 | dos meses #w8 | quince dias #w2 | unos dias | {number} dias | un tiempo | un rato | un poco)",
      reason_core: [
        // testing
        "[@newsite] [todavia | aun] no (esta | este) [bien | completamente | totalmente | suficientemente | muy] (probada | probado | lista | listo | terminada | terminado) [todavia | aun] #c_test",
        "[todavia | aun] no la (hemos | han) probado [bien | lo suficiente | todavia | aun] [en (celulares | el celular | telefonos)] #c_test",
        "[todavia | aun] no la (probamos | probaron) [bien | lo suficiente] [todavia | aun] #c_test",
        "nadie la (ha probado | probó) [todavia | bien] #c_test",
        "no creo que (estemos | este | esten) (listos | listas | lista | listo) [para (el viernes | esto)] [todavia] #c_test",
        "[todavia | aun] no estamos (listos | listas) [para (el viernes | esto)] #c_test",
        "(faltan | hacen falta | nos faltan | le faltan) [mas] pruebas #c_test",
        "(hay que | tenemos que | necesitamos | debemos) (probarla | probarla mas | probarla bien | hacer mas pruebas | hacer pruebas | probar mas) [primero] #c_test",
        "las pruebas no (estan terminadas | han terminado | estan listas | se han terminado) [todavia] #c_test",
        "(necesita | necesitamos) mas pruebas #c_test",
        "[todavia | aun] no (hemos | han | hayamos | hayan) (hecho | terminado) (pruebas | las pruebas | suficientes pruebas | bastantes pruebas) [todavia] #c_test",
        "[todavia | aun] no (hemos | han | hayamos | hayan) probado @newsite [bien | lo suficiente] #c_test",
        "[todavia | aun] no la (hayamos | hayan) probado [bien | lo suficiente] [todavia] #c_test",
        "(falta | hace falta | nos falta) (probarla | probar la pagina | hacer pruebas | probarla bien) #c_test",
        "no sabemos si (funciona | va a funcionar | funciona bien) #c_test",
        // time
        "cuatro dias no (es | son) (suficiente | suficientes) [tiempo] #c_time #h:not_enough_time",
        "cuatro dias (es | son) (muy | demasiado) poco [tiempo] #c_time",
        "(el | este) viernes es (muy | demasiado) pronto #c_time",
        "(es | esta | seria | me parece | suena | se me hace) (muy | demasiado | un poco | algo) (pronto | rapido) #c_time",
        "(es | esta | seria | me parece | suena | se me hace) [un poco | algo | bastante | muy | demasiado] (apresurado | apresurada | apurado | precipitado | precipitada) #c_time",
        "(necesitamos | nos falta | nos hace falta | falta | hace falta) [mas] tiempo #c_time",
        "no (tenemos | hay) (suficiente | tanto | mucho) tiempo #c_time",
        "no es (suficiente | bastante) tiempo #c_time",
        "no [nos] (alcanza | da) el tiempo #c_time",
        "(el tiempo | el plazo | la fecha | el calendario) (es | esta) (muy | demasiado) (corto | justo | apretado | pronto | cerca) #c_time",
        "vamos (muy | demasiado) rapido #c_time",
        "no (hay | tenemos) tiempo #c_time",
        "(es | son) (muy | demasiado) poco tiempo #c_time",
        // customers
        "(muchos | la mayoria | la mitad | varios) de (nuestros | los) @cli (son | tienen) (mayores | grandes | gente mayor | personas mayores | mas de sesenta [anos] | mas de {age:number} [anos]) #c_cust #h:older_customers",
        "(nuestros | los | muchos) @cli (son | ya son) (mayores | grandes | gente mayor | personas mayores) #c_cust",
        "(nuestros | los) @cli no (usan | saben usar) [mucho] (la tecnologia | internet | el celular | computadoras) [mucho] #c_cust",
        "(nuestros | los) @cli [mayores] (estan acostumbrados a | conocen | prefieren | quieren) (@oldsite | la pagina de siempre) #c_cust",
        "(nuestros | los) @cli [mayores] (se van a | se pueden | van a | pueden) (confundir | perder | enojar | quejar | llamar | molestar) #c_cust",
        "(nuestros | los) @cli [mayores] (pueden | van a) (confundirse | perderse | enojarse | quejarse) #c_cust",
        "(nuestros | los) @cli no van a encontrar nada #c_cust",
        "(nuestros | los) @cli [mayores] no (van a entender | entienden | van a saber usar | saben usar) (@newsite | nada | el diseno nuevo) #c_cust",
        "(la gente mayor | las personas mayores | los mayores) (prefiere | prefieren | conoce | conocen | esta acostumbrada a | estan acostumbrados a) @oldsite #c_cust",
        "(nuestros | los) @cli [mayores] se (confundan | pierdan | enojen | quejen) #c_cust",
        "(vamos a | podemos | podriamos) perder (clientes | usuarios) #c_cust",
        "(nuestros | los) @cli necesitan [mas] tiempo [para acostumbrarse] #c_cust",
        // support
        "@soporte [todavia | aun] no (esta | estan | este) (listo | listos | lista | preparado | preparados | capacitado | capacitados) [todavia | aun] #c_support #h:support_not_ready",
        "[todavia | aun] no (hemos capacitado | capacitamos) (al equipo | a soporte | al equipo de soporte) #c_support",
        "nadie (ha capacitado | capacitó) (al equipo | a soporte | al equipo de soporte) [todavia] #c_support",
        "@soporte [todavia | aun] no (conoce | conocen) (la pagina nueva | la nueva pagina | el sitio nuevo) [todavia] #c_support",
        "@soporte (necesita | necesitan) (capacitacion | mas tiempo | entrenamiento) #c_support",
        "@soporte [todavia | aun] no (sabe | saben) (nada | nada de esto | como funciona | usarla) [todavia] #c_support",
        // bugs
        "[todavia | aun] (hay | tiene | tenemos) [todavia | aun] [algunos | varios | muchos | unos] (errores | bugs | fallas) [en (la pagina nueva | el sitio nuevo | la pagina)] #c_bugs",
        "[todavia | aun] (hay | tiene) [algunos | varios | muchos | unos] problemas (en | con) (la pagina nueva | el sitio nuevo | la pagina) #c_bugs",
        "(la pagina de pago | el pago | el carrito | el formulario | el inicio de sesion | el login | el boton de pago) [todavia | aun] no funciona [bien] [en (el celular | celulares | los celulares)] #c_bugs",
        "[@newsite] [todavia | aun] no funciona [bien] en (el celular | celulares | los celulares | algunos navegadores | celulares viejos) #c_bugs",
        "[@newsite] [todavia | aun] tiene (errores | bugs | fallas | problemas) #c_bugs",
        // risk
        "(es | seria | me parece | suena | se me hace) [muy | demasiado | un poco | bastante | algo] (arriesgado | riesgoso | peligroso) #c_risk",
        "(es | seria) (mucho riesgo | un riesgo | un gran riesgo | un riesgo muy grande | demasiado riesgo) #c_risk",
        "(y si | que pasa si) (se cae | falla | algo sale mal | no funciona | se rompe | truena | hay (problemas | errores | fallas) | los clientes se quejan) #c_risk",
        "puede haber (problemas | errores | fallas) #c_risk",
        "si algo sale mal no (tenemos | hay) (respaldo | plan b | un plan b | plan de respaldo) #c_risk",
        "(necesitamos | deberiamos tener | hay que tener) un (plan b | respaldo | plan de respaldo) #c_risk",
        "no (tenemos | hay) (plan b | respaldo | un plan b | un plan de respaldo) #c_risk",
      ],
      // a concern after a polite "no" ("…, pero no está probada", "…. No lo tengo tan claro.")
      rtail: [
        "[pero | y | asi que | porque | ademas] [@why] @reason_core",
        "[pero | y] (no esta | no es | no lo tengo | no lo veo) (tan | muy | del todo) claro [@reason_core] #c_vague",
      ],
      alt_core: [
        // a beta / a soft launch
        "[la | lo] (lanzamos | lanzar | lancemos | lanzarla | lanzarlo | sacamos | sacar | saquemos | sacarla | sacarlo) (como | en) (beta | una beta | version beta | prueba | version de prueba | piloto | un piloto) [primero] #a_beta",
        "(hacemos | hacer | hagamos) (una beta | una version beta | un lanzamiento beta) [primero] #a_beta",
        "(hacemos | hacer | hagamos) (un lanzamiento de prueba | un lanzamiento suave | un lanzamiento gradual | una prueba piloto | un piloto | un soft launch | un lanzamiento por etapas) [primero] #a_beta #soft",
        "[la | lo] (probamos | probar | probemos | probarla) (con | entre) (un grupo pequeno | un grupo chico | pocos clientes | unos clientes | algunos clientes | un grupo de clientes | unos cuantos clientes | {number} clientes) [primero] #a_beta",
        "[la | lo] (lanzamos | lanzar | lancemos | lanzarla) (poco a poco | por etapas | de a poco | gradualmente | por partes) #a_beta",
        "(hacemos | hacer | hagamos) (una prueba | una prueba piloto | un piloto | una prueba con clientes) [primero] [con (algunos | unos | pocos) @cli] #a_beta",
        "(empezamos | empezar | empecemos) con (una beta | un piloto | una prueba | un lanzamiento de prueba) #a_beta",
        // keep the old site
        "(dejamos | dejar | dejemos | mantenemos | mantener | mantengamos | tenemos | tener | tengamos) @oldsite [funcionando | arriba | en linea | activa | prendida] [(por | durante) @dur | @dur | un poco mas | unas semanas mas | otro rato] [mas] [como (respaldo | plan b)] [por ahora] #a_backup",
        "(dejamos | dejar | dejemos | mantenemos | mantener | mantengamos | tenemos | tener | tengamos) (las dos | ambas) [paginas | versiones] [funcionando | en linea] [(por | durante) @dur | @dur] [al mismo tiempo] #a_backup",
        "no (quitamos | quitar | quitemos | apagamos | apagar | apaguemos | damos de baja | dar de baja | demos de baja | cerramos | cerrar | cerremos | borramos | borrar | borremos) @oldsite [todavia | aun | luego luego | de inmediato | el viernes | tan rapido | tan pronto] #a_backup",
        "(quitamos | quitar | quitemos | damos de baja | dar de baja | demos de baja | apagamos | apagar | apaguemos) @oldsite (despues | mas tarde | (en | dentro de) @dur | despues de @dur) #a_backup",
        "[(lanzamos | lancemos | lanzar | lanzarla) [la nueva | @newsite] [el viernes] (pero | y)] (sin quitar | sin apagar | sin dar de baja | sin cerrar) @oldsite [todavia] #a_backup",
        "(lanzamos | lancemos | lanzar | lanzarla) [la nueva | @newsite] [el viernes] (pero | y) (dejamos | dejemos | dejar | mantenemos | mantengamos) @oldsite [@dur | un tiempo] #a_backup",
        // later
        "[lo | la] (lanzamos | lanzar | lancemos | lanzarla | movemos | mover | movamos | moverlo | moverla | pasamos | pasar | pasemos | pasarlo | posponemos | posponer | pospongamos | posponerlo | posponerla) [el lanzamiento | la fecha] (para | al | hasta) (el proximo viernes | el otro viernes | la proxima semana | la otra semana | el proximo mes | fin de mes | finales de mes | {day}) #a_delay",
        "[lo | la] (posponemos | posponer | pospongamos | posponerlo | posponerla | retrasamos | retrasar | retrasemos | retrasarlo | movemos | mover | movamos | moverlo | recorremos | recorrer | recorramos | recorrerlo | recorrerla) [el lanzamiento | la fecha] [un poco | unos dias | @weeks | un mes #w4] #a_delay",
        "(nos damos | darnos | demonos | damos | dar | demos | nos tomamos | tomarnos | tomemonos) (mas tiempo | otra semana | una semana mas | @weeks [mas] | un mes [mas] #w4) #a_delay",
        "(esperamos | esperar | esperemos) (@weeks | un mes #w4 | otra semana | otro mes | un poco) [mas] #a_delay",
        "[lo | la] (lanzamos | lanzar | lancemos | lanzarla | hacemos | hacerlo | hagamoslo) (mas tarde | despues | en @weeks | en un mes | la proxima semana | el proximo mes | una semana despues) #a_delay",
        // training, telling the customers, fixing the bugs
        "(capacitamos | capacitar | capacitemos | preparamos | preparar | preparemos | entrenamos | entrenar | entrenemos) [primero | antes] (al equipo de soporte | a soporte | al equipo | al call center | a la gente | al personal | a atencion a clientes) [primero | antes [del lanzamiento | del viernes | de lanzar]] #a_train",
        "(avisamos | avisar | avisemos | avisarles | les avisamos | avisemosles | informamos | informar | informemos | informarles | les escribimos | escribirles) a (los | nuestros) @cli [primero | antes | con tiempo | por correo] #a_inform",
        "(mandamos | mandar | mandemos | enviamos | enviar | enviemos) (un correo | un mail | un email | un boletin | un mensaje | un aviso) a (los | nuestros) @cli [primero | antes] #a_inform",
        "(arreglamos | arreglar | arreglemos | corregimos | corregir | corrijamos) (los errores | los bugs | las fallas | los problemas | la pagina de pago | el pago) [primero | antes [del lanzamiento | del viernes | de lanzar]] #a_fix",
      ],
      // the same ideas as nouns ("¿Ya consideramos un lanzamiento de prueba?", "¿Qué tal una beta?")
      alt_np: [
        "(una beta | una version beta | un lanzamiento beta) [primero] #a_beta",
        "(un lanzamiento de prueba | un lanzamiento suave | un piloto | una prueba piloto | un lanzamiento gradual | un lanzamiento por etapas | un soft launch) [primero] #a_beta #soft",
        "un lanzamiento (poco a poco | por partes | de a poco) #a_beta #soft",
        "(otra semana | una semana mas | mas tiempo | cambiar la fecha | mover la fecha) #a_delay",
        "(la capacitacion | una capacitacion) (del | para el) equipo [de soporte] #a_train",
        "(un correo | un aviso | un mensaje) a los @cli #a_inform",
        "(un punto medio | algo intermedio | un termino medio) #a_mid",
      ],
      alt_tail: "[@but | asi que | por ejemplo] ((y si | que tal si | por que no) @alt_core | (tal vez | quizas | a lo mejor) (podriamos | podemos) @alt_core | (podriamos | podemos) @alt_core | que tal @alt_np | [mejor] @alt_core)",
      // "Es un punto válido. Sin embargo, …"
      ack_tail: "[@but [(sigo pensando | todavia creo | aun creo | sigo creyendo) que @reason_core | (sigo | todavia estoy | aun estoy) [un poco | algo] (preocupado | preocupada) [por @concern_np] | (sigo con | todavia tengo | aun tengo) [mis | algunas] dudas | @rtail | @alt_tail | (lo | la) (podemos | podriamos) ver de otra (forma | manera)]]",
    },
    slots: {},
  },

  intents: {
    // --- polite (and less polite) disagreement -------------------------------------------------------
    disagree_polite: { patterns: [
      "@soft yo no estaria (tan | muy) (seguro | segura) [de eso] [no lo tengo tan claro] [@rtail] #h:push_back",
      "@soft no estaria (tan | muy) (seguro | segura) [de eso] [@rtail]",
      "@soft (entiendo | entiendo tu punto | entiendo lo que dices | te entiendo | entiendo tu idea | ya veo) @but (no estoy (seguro | segura | convencido | convencida) | no estoy [del todo | muy | completamente | totalmente | tan] de acuerdo | no se si estoy de acuerdo | lo veo diferente | lo veo de otra forma | tengo (dudas | mis dudas | algunas dudas)) [@rtail] #h:see_point",
      "@soft no estoy [muy | tan | del todo] (seguro | segura | convencido | convencida) (de | con | sobre) @plan [@rtail] #h:not_sure_about",
      "@soft no estoy (muy | tan | del todo) (seguro | segura | convencido | convencida) [@rtail]",
      "@soft no estoy (convencido | convencida) [@rtail]",
      "@soft no se si estoy de acuerdo [@rtail] #h:not_sure_agree",
      "@soft no estoy (seguro | segura | convencido | convencida) de que (sea | es) (una buena idea | buena idea | la mejor idea | la mejor opcion | la mejor manera | el mejor camino | lo mejor | el momento) [@rtail] #h:not_best",
      "@soft no se si (sea | es) (una buena idea | buena idea | la mejor opcion | lo mejor | el momento) [@rtail]",
      "@soft tengo [algunas | unas | varias | ciertas | mis | serias | muchas] (dudas | preocupaciones | reservas) [(sobre | con | de | acerca de) @plan] [@rtail] #h:have_concerns",
      "@soft [yo] lo veo [un poco | algo] (diferente | distinto | de otra manera | de otra forma) [@rtail] #h:with_respect",
      "@soft tengo (otra | una) (opinion | idea | vision) [diferente | distinta] [@rtail]",
      "@soft no creo que (sea | es) (buena idea | una buena idea | lo mejor | la mejor opcion) [@rtail]",
      "@soft no (es | me parece | suena | creo que sea) [tan | muy] (buena idea | una buena idea | tan buena idea) [(lanzarla | hacerlo | quitar @oldsite) [el viernes | este viernes | tan pronto | tan rapido]] [@rtail]",
      "@soft (estoy | yo estoy) en contra [de (eso | esto | @plan | la idea | lanzarla el viernes)] [@rtail] #tip:soften",
      "@soft [eso | esto] no (me parece | suena | es) [muy | tan] (justo | razonable | realista | un buen (trato | acuerdo))",
      "@soft [eso | esto] no tiene (sentido | mucho sentido)",
      "@soft no tienes razon [en eso] #tip:soften",
      "@soft no (acepto | puedo aceptar) (el trato | tu propuesta | la propuesta | esa propuesta | eso | tu punto)",
      "@soft no me (rindo | voy a rendir) [todavia | tan facil]",
      "@soft no (cambie | he cambiado | voy a cambiar) de opinion",
      "@soft no (la lancemos | lancemos | la lanzamos | lanzamos | la lancen) [@newsite] (el viernes | este viernes | tan pronto | todavia) [@rtail]",
      "(no del todo | no exactamente | no completamente | no totalmente | solo en parte | en parte | mas o menos)",
      // "No hay un punto medio." is a statement (the proposal is "¿No habrá un punto medio?")
      "@soft no (hay | veo | existe) [un] (punto medio | termino medio | algo intermedio) [aqui]",
      "@soft [con] ((una | tres | cuatro) (semana | semanas) | un mes | quince dias) no (me funciona | me funcionan | me sirve | me sirven | me alcanza | alcanza | alcanzan | basta | me parece bien | me convence | esta bien)",
      "@soft [creo que] (es | me parece) (una mala idea | mala idea | una muy mala idea | un mal plan) [@rtail] #tip:soften",
      "@soft (creo | pienso) que no [@rtail]",
      "@soft no estoy (del todo | muy | completamente | totalmente | tan) de acuerdo [(contigo | con eso | con esto | con el plan | con tu plan | con la idea)] [@rtail]",
      "[perdon | pero | mira | oye | pues | bueno | la verdad | la neta | disculpa | perdona] (no estoy de acuerdo | estoy en desacuerdo) [contigo | con eso | con esto | con el plan | con tu plan | con la idea | con la fecha | con (dos | 2) semanas | con la propuesta | con tu propuesta] [@rtail] #tip:soften",
      "(con todo respeto | con todo mi respeto | respetuosamente | sinceramente | honestamente | entiendo pero | te entiendo pero | entiendo tu punto pero) (no estoy de acuerdo | estoy en desacuerdo) [contigo | con eso | con esto | con el plan | con tu plan | con la idea | con la propuesta] [@rtail]",
      "@soft no (acepto | lo acepto | puedo aceptarlo)",
      "@soft [yo | yo lo] (pienso | opino | veo) (diferente | distinto | de otra manera | de otra forma) [@rtail]",
      "@soft yo no lo haria (asi | de esa manera | de esa forma | el viernes | tan rapido) [@rtail]",
      "(estas segura | estas seguro | de verdad | en serio) [de eso]",
      "@soft no me parece [@rtail]",
      "@soft tengo (un problema | un pero) con @plan [@rtail]",
      "@soft (me temo que | lamentablemente) no (puedo estar | estoy) de acuerdo [@rtail]",
      "@soft me preocupa [un poco | algo | mucho] (@plan | @concern_np) [@rtail] #h:worried",
      "@soft me preocupan [un poco | mucho] @concern_np [@rtail]",
      "@soft estoy [un poco | algo] (preocupado | preocupada | nervioso | nerviosa) [por (@plan | @concern_np)] [@rtail]",
      "@soft (es | suena | me parece) (interesante | buena idea | una buena idea | un buen plan | una idea interesante) @but [no estoy (seguro | segura) | tengo [algunas] dudas] [@rtail]",
      "(estoy de acuerdo | estoy de acuerdo en parte | me gusta | me gusta la idea | me encanta la idea | me parece bien | suena bien | si) @but (@rtail | no estoy (seguro | segura | convencido | convencida) | tengo [algunas | mis] dudas | no (el | este) viernes)",
      "@soft (es | suena) una idea interesante @but [no estoy (seguro | segura) | tengo [algunas] dudas] [@rtail]",
      "@soft no creo que (debamos | debemos) (quitar | apagar | dar de baja | cerrar) @oldsite [el viernes | tan rapido | todavia | tan pronto | luego luego] #a_backup",
      "@soft no (podemos | deberiamos | debemos) (quitar | apagar | dar de baja | cerrar) @oldsite [el viernes | tan rapido | todavia | tan pronto | luego luego] #a_backup",
      "@soft no creo que (debamos | debemos) (hacerlo | lanzarla | lanzarlo) (el viernes | este viernes | tan pronto | tan rapido) [@rtail]",
      "@soft no (creo | estoy de acuerdo en) que @oldsite sea (un problema | tan mala | un desastre)",
      "@soft no creo que @oldsite (sea | es) (un problema | tan mala | tan lenta)",
      "@soft (tal vez | quizas | a lo mejor) no [@rtail]",
      "@soft no tan rapido @rtail",
      "@soft (de verdad | en serio) (es | crees que es) (buena idea | una buena idea)",
      "@soft no me (convence | convence mucho | convence del todo | late) [@plan] [@rtail]",
      "@soft (lo | la) (podemos | podriamos) (hablar | platicar | discutir | comentar) [un poco | primero | mas | un poco mas] [@rtail]",
      "@soft (podemos | podriamos) (hablarlo | platicarlo | discutirlo | comentarlo) [un poco | primero | mas | un poco mas] [@rtail]",
      "@soft no me (gusta | encanta) [mucho | del todo] [@plan] [@rtail]",
      "@soft [eso | esto] no me (funciona | sirve | parece bien | suena bien | viene bien | convence) [@rtail]",
      "@soft (el | este) viernes no (me funciona | es buena idea | es realista | es posible) #c_time",
      "@soft [todavia | aun] no me (has convencido | convenciste | convences)",
      "(no hay trato | sin trato)",
      "@soft (sigo | todavia | aun) (pensando | creo | pienso) que (es | seria | el viernes es) (muy | demasiado) (pronto | rapido | arriesgado) [@rtail]",
      "@soft (sigo | todavia | aun) (con | tengo) (dudas | mis dudas) [@rtail]",
      "@soft (sigo sin estar de acuerdo | todavia no estoy de acuerdo | aun no estoy de acuerdo)",
      "@soft no (es | creo que sea) (cierto | justo | verdad | un punto valido)",
      "@soft no puedo (aceptar eso | aceptarlo | vivir con eso)",
      "@soft no estoy contigo [en esto]",
      // not a proposal: "No quiero una beta.", "No quiero esperar."
      "@soft no (quiero | queremos | me gusta | me convence) [la idea de] (una beta | un lanzamiento de prueba | un piloto | esperar | dos paginas | las dos paginas | posponerlo)",
      "@soft no (quiero | queremos) esperar [mas | (una | dos | tres | cuatro) semanas | un mes | tanto]",
    ] },
    rude_disagree: { patterns: [
      "(estas | tu estas) (loca | loco | mal | equivocada | equivocado | completamente equivocada | bromeando) #tip:too_blunt #rude",
      "(es | que) (una idea | un plan) (tonta | tonto | tontisima | tontisimo | estupida | estupido | ridicula | ridiculo | absurda | absurdo | horrible | terrible | malisima | malisimo | pesima | pesimo) #tip:too_blunt #rude",
      "(es | que) (tonta | estupida | ridicula | absurda | horrible | terrible | pesima) idea #tip:too_blunt #rude",
      "[eso | esto] es (una tonteria | una estupidez | ridiculo | absurdo | una locura | un chiste | basura | una burrada) #tip:too_blunt #rude",
      "(que tonteria | que estupidez | que locura)  #tip:too_blunt #rude",
      "(ni loco | ni loca | ni de chiste | ni de broma | de ninguna manera | olvidalo | ni hablar) #tip:too_blunt #rude",
      "[eso | esto] (nunca va a funcionar | no va a funcionar nunca | jamas va a funcionar) #tip:too_blunt #rude",
      "(odio | nadie quiere) (tu plan | el plan | tu idea | eso | esto) #tip:too_blunt #rude",
      "no sabes (lo que dices | de que hablas | de lo que hablas) #tip:too_blunt #rude",
    ] },
    agree_plan: { patterns: [
      "(me parece | suena) (bien | muy bien | genial | perfecto | excelente | buenisimo | un buen plan | buena idea | una buena idea | una gran idea)",
      "[que] (buena | excelente | gran | muy buena) idea",
      "que buen plan",
      "(buen | excelente | gran | muy buen) plan",
      "estoy [totalmente | completamente] de acuerdo [contigo | con eso | con el plan | con la idea] [totalmente | al cien]",
      "(me gusta | me encanta | me late) [mucho] [el plan | la idea | tu plan | tu idea | eso]",
      "(hagamoslo | vamos con eso | vamos con tu plan | adelante con el plan)",
      "[este] viernes (esta bien | me parece bien | me funciona | perfecto) [para mi]",
      "(estoy contigo | cuenta conmigo | yo me apunto)",
      "no tengo (ninguna duda | ninguna objecion | dudas | objeciones | ningun comentario | comentarios | preguntas | ninguna pregunta)",
      "(ninguna duda | ninguna objecion | sin objeciones | sin dudas | nada que agregar)",
      "(es | me parece) (un buen plan | una buena idea | una gran idea | un plan excelente)",
      "(esta | me parece) (bien | perfecto) (por mi | para mi)",
      // a negated "bad idea" is a yes ("No me parece mala idea", "No está mal")
      "no (me parece | creo que sea | es | suena) [una | tan] (mala idea | mal plan | mala)",
      "no (esta | suena | se ve) mal",
      "no (estoy en contra | veo ningun problema | le veo problema | veo problema)",
      "no tengo [ningun] problema [con (eso | esto | @plan)]",
    ] },
    // questions that push back gently ("¿Por qué el viernes?", "¿Ya la probamos?")
    ask_q: { patterns: [
      "por que (el viernes | este viernes | tan pronto | tan rapido | ahora | ya) #q_why #h:q_why_friday",
      "(por que | cual es) (tanta prisa | la prisa | tanto apuro | el apuro | la urgencia) #q_why #h:q_rush",
      "por que (tenemos que | hay que | debemos) (lanzarla | lanzar | hacerlo) (tan pronto | tan rapido | este viernes | el viernes | ya | ahora) #q_why",
      "por que (nos apuramos | vamos tan rapido | corremos tanto | la urgencia)  #q_why",
      "quien (decidio | eligio | escogio | quiere) (el viernes | esa fecha | eso | esto) #q_why",
      "por que es tan importante [el viernes | la fecha] #q_why",
      "[en serio | de verdad] (este | el) viernes #q_why",
      "[ya] (esta | la pagina nueva esta | el sitio esta) (probada | probado) [ya | bien] #q_test",
      "[ya] la (probamos | probaron | hemos probado | han probado | probaste) [bien | lo suficiente] #q_test #h:q_tested",
      "(las pruebas | el testing) (ya)? (estan listas | terminaron | se terminaron) #q_test",
      "(y | que pasa con) (las pruebas | el testing) #q_test",
      "(ya pensamos en | y | que pasa con | y que hay de | pensaste en) (los | nuestros) @cli [mayores] #q_cust",
      "(ya pensamos en | y | que pasa con | pensaste en) @soporte #q_support",
      "@soporte [ya] (sabe | conoce | esta listo | esta enterado) [de esto] #q_support",
      "(y | que pasa con | ya pensamos en) (el riesgo | los riesgos) #q_risk",
      "no (es | seria) [muy | un poco | demasiado] (arriesgado | riesgoso) #q_risk",
      "(y | que pasa con | que va a pasar con) @oldsite #q_old",
      "(y | que pasa con) (los errores | los bugs | las fallas) #q_bugs",
      "(cuatro dias | el viernes) (es | son) (suficiente | suficientes | realista | tiempo suficiente) #q_time",
      "(tenemos | hay) [suficiente] tiempo #q_time",
    ] },
    // the concern (the tag says which)
    give_reason: { patterns: [
      "[@soft] no (lo tengo | esta | es) (tan | muy) claro @reason_core #h:not_clear",
      "[@soft] [@why] @reason_core",
      "[@soft] no (lo tengo | esta | es) (tan | muy | del todo) claro #c_vague",
      "[@soft] no lo veo [tan | muy | del todo] claro #c_vague",
      "[@soft] (hay | veo) (un problema | problemas | un pero) #c_vague #what",
      "[@soft] no (veo | se) como (va a | puede) funcionar [para el viernes] #c_vague #hard",
      "[@soft] (es | esta) (complicado | dificil) #c_vague #hard",
      "[@soft] no es tan (facil | sencillo) #c_vague #hard",
      "[@soft] (sigo pensando | todavia creo | aun creo | sigo creyendo) que @reason_core",
      "[@soft] (mi | la) [mayor | principal] (preocupacion | duda) es @concern_np",
      "[@soft] (el | mi) [mayor | principal] problema es @concern_np",
      "[@soft] (me preocupa | me preocupan) @concern_np",
      "[@soft] estoy [muy] (preocupado | preocupada) por @concern_np",
    ] },
    // a short answer to "¿Son las fechas? ¿Las pruebas? ¿Los clientes?"
    concern_ctx: { patterns: [
      "(la fecha | las fechas | el tiempo | los tiempos | el plazo | el calendario | el viernes) [sobre todo | mas que nada | principalmente] #c_time",
      "(las pruebas | el testing) [sobre todo | mas que nada | principalmente] #c_test",
      "(los | nuestros) @cli [mayores] [sobre todo | mas que nada | principalmente] #c_cust",
      "@soporte [sobre todo | mas que nada] #c_support",
      "(los errores | los bugs | las fallas) #c_bugs",
      "(el riesgo | los riesgos) #c_risk",
      "(todo | todas | las tres cosas | un poco de todo | todo eso) #c_time",
    ] },

    // --- cutting into the monologue ------------------------------------------------------------------
    interrupt_polite: { patterns: [
      "[perdon | disculpa | espera] (puedo | podria | me dejas | me permites) (interrumpir | interrumpirte | intervenir | meterme | opinar) [aqui | un momento | un segundo | tantito] [@rtail] #h:come_in",
      "[perdon | disculpa] (me permites | me dejas | me das) [un momento | un segundo | tantito | chance] [@rtail] #h:jump_in",
      "(perdon | disculpa | perdona) (que te interrumpa | por interrumpir | que interrumpa | por interrumpirte | la interrupcion | que te interrumpo) [pero] [@rtail] #h:sorry_interrupt",
      "[perdon | disculpa | espera] (puedo | podria) (agregar | decir | anadir) algo [aqui] [@rtail] #h:add_something",
      "[perdon | disculpa] (puedo | podria) (hacer | hacerte) una pregunta [rapida]",
      "[perdon | disculpa] (te puedo | puedo) (interrumpir | detener | parar) [un momento | un segundo] [@rtail]",
      "(tengo | traigo) una (pregunta | duda) [rapida] [para ti]",
      "si me (permites | dejas) [tengo una (pregunta | duda)] [@rtail]",
      "(perdon | disculpa) @rtail",
      "(perdon | disculpa) (espera | esperame) @rtail",
      "dejame decir algo [aqui]",
      "perdon antes de que sigas [@rtail]",
      "(una pregunta | una duda | una cosa) [rapida]",
      "(quiero | quisiera | me gustaria) (decir | agregar | comentar | anadir) algo [aqui] [@rtail]",
      "tengo algo que (decir | agregar | comentar)",
      "[perdon | disculpa | perdona | oye] (puedo | podria | me dejas | me permites) (hablar | comentar | comentar algo | decir una cosa) [un momento | un segundo] [@rtail] #h:come_in",
    ] },
    // "Perdón…" / "Disculpa, Vanessa…" / "Un segundo…" (only while she is talking)
    interrupt_ctx: { patterns: [
      "(perdon | disculpa | perdona | disculpame | perdoname | oye | con permiso)",
      "(un momento | un segundo | un segundito | un momentito | tantito)",
      "(espera | esperate | aguanta) [un momento | un segundo]",
    ] },
    rude_interrupt: { patterns: [
      "(para | basta | ya basta | ya para | callate | silencio | suficiente | ya estuvo) #rude",
      "(escuchame | oyeme) #rude",
      "espera espera [espera] #rude",
      "(dejame hablar | me toca | es mi turno | ahora hablo yo | dejame hablar a mi) #rude",
      "hablas (mucho | demasiado) #rude",
      "(nunca dejas de hablar | no me dejas hablar) #rude",
      "(para | basta | ya basta) @rtail #rude",
    ] },

    // --- her strong point -------------------------------------------------------------------------------
    ack_point: { patterns: [
      "@soft (es | ese es) un (punto | argumento) (valido | justo | bueno | muy bueno | interesante | importante) [@ack_tail] #h:fair_point",
      "@soft (entiendo | acepto | tomo) (tu | su) punto [@ack_tail] #h:take_point",
      "@soft buen (punto | argumento) [@oldsite es (lenta | cara | un desastre | un problema)] [@ack_tail] #h:good_point",
      "@soft en eso tienes razon [@ack_tail] #h:right_about",
      "@soft tienes razon [en (eso | lo del (costo | dinero | precio | celular) | lo de los celulares | lo de la pagina vieja) | con (eso | lo del costo)] [@ack_tail]",
      "@soft (puede ser | puede que tengas razon | quizas tienes razon | a lo mejor tienes razon | tal vez tienes razon) [@ack_tail]",
      "@soft (tienes | ahi tienes) un [buen | muy buen] punto [@ack_tail]",
      "@soft (es | ese es) un (buen | muy buen) (punto | argumento) [@ack_tail]",
      "@soft (es cierto | eso es cierto | es verdad | tienes razon | buen punto) [@oldsite] (es | son) (mucho dinero | muchisimo dinero | un dineral | lenta | cara | un desastre) [@ack_tail]",
      "@soft (es cierto | eso es cierto | es verdad | eso es verdad | tiene sentido | eso tiene sentido | no te lo puedo negar | no lo habia pensado | no habia pensado en eso | ni lo habia pensado | justo | me parece justo) [@ack_tail]",
      "@soft (hace sentido | eso hace sentido) [@ack_tail] #tip:hace_sentido",
      "@soft (estas | tu estas) (correcta | correcto | en lo correcto) [@ack_tail] #tip:correcto",
      "@soft estoy de acuerdo (en | con) (eso | lo del costo | lo del celular | lo del dinero) [@ack_tail]",
      "@soft [si] @oldsite es (lenta | cara | vieja | un desastre | un problema | mala) [en el celular] [@ack_tail]",
      "@soft (es | son) (mucho dinero | muchisimo dinero | un dineral) [@ack_tail]",
      "@soft sesenta mil [pesos] (al | por | cada) mes (es | son) (mucho | mucho dinero | carisimo | demasiado) [@ack_tail]",
      "@soft {price} (al | por | cada) mes (es | son) (mucho | mucho dinero | carisimo | demasiado) [@ack_tail]",
      "@soft (tu | la) (grafica | los numeros | los datos) (es | son | esta | estan) (buena | buenos | convincente | convincentes | impresionante | impresionantes) [@ack_tail]",
      "(ya veo | entiendo | ya entiendo | te entiendo | ok entiendo | ya entendi) #weak",
      "ni modo #weak",
      "[ya] (se | entiendo | veo) lo que (quieres decir | dices | me dices) #weak",
    ] },

    // "¿La página vieja es un problema o no?" – "Sí, es un problema." / "No es un problema." (only then)
    site_problem_ctx: { patterns: [
      "[si] (es | si es | si lo es | lo es) [un] [gran | gran gran | verdadero] problema",
      "[si] (lo es | si lo es)",
      "no es [un | tan grande el | tan gran | gran] problema #no",
      "@oldsite no es [un | tan gran | gran] problema #no",
      "no lo creo #no",
    ] },
    // "¿Sesenta mil pesos?" / "¿Al mes?" / "¿Tanto?": surprise at her figures (only at her strong point)
    echo_ctx: { patterns: [
      "(sesenta | 60) mil [pesos] [al mes | por mes | cada mes | mensuales]",
      "(sesenta | 60) (por ciento | %)",
      "(al mes | cada mes | por mes)",
      "(tanto | tanto dinero | tan cara | tan caro | asi de cara | asi de caro)",
      "[en serio | de verdad] (cuesta | nos cuesta) (tanto | eso | sesenta mil [pesos] [al mes])",
    ] },

    // --- another way ---------------------------------------------------------------------------------------
    offer_alt: { patterns: [
      "@soft (lo | la) (podemos | podriamos) ver (de otra forma | de otra manera | desde otro angulo | diferente | de otro modo) [@alt_tail] #h:look_another_way",
      "@soft (podemos | podriamos) verlo (de otra forma | de otra manera | desde otro angulo | diferente | de otro modo) [@alt_tail]",
      "@soft [ya] (consideramos | pensamos en | hemos considerado | hemos pensado en | han pensado en | has pensado en | consideraste | pensaste en | se ha considerado) @alt_np #h:have_we_considered",
      "@soft (y si | que tal si | por que no) [ademas | tambien | primero] @alt_core [mejor | en vez de eso | en lugar de eso] #h:what_if",
      "@soft (que tal | que te parece | y que tal | que opinas de) @alt_np #h:how_about",
      "@soft que tal si @alt_core #h:how_about",
      "@soft (que te parece si | que les parece si) [primero] @alt_core",
      "@soft (propongo | sugiero | yo propondria | yo sugeriria | recomiendo | te propongo) @alt_np",
      "@soft (prefiero | preferiria | yo preferiria) (esperar | esperar un poco | esperarnos) [@dur] #a_delay",
      "@soft (prefiero | preferiria | yo preferiria) que @alt_core",
      "@soft (tal vez | quizas | quiza | a lo mejor) (podemos | podriamos | deberiamos) @alt_core",
      "@soft (propongo | sugiero | yo propondria | yo sugeriria | mi propuesta es | mi idea es | recomiendo | te propongo) [que] @alt_core",
      "@soft [primero] (podemos | podriamos | deberiamos | hay que | tenemos que | seria mejor | es mejor | seria mas seguro | mejor) [primero] @alt_core [mejor | en vez de eso]",
      "@soft (una | otra) (opcion | idea | alternativa) (es | seria) @alt_core",
      "@soft (yo creo que | creo que | pienso que | en mi opinion) (deberiamos | podriamos | hay que | tenemos que | es mejor) @alt_core",
      "@soft (podemos | podriamos) (buscar | encontrar | llegar a) (un punto medio | un acuerdo | un termino medio | un compromiso | algo intermedio) #a_mid #h:compromise_q",
      "@soft (busquemos | buscamos | encontremos) (un punto medio | un acuerdo | un termino medio | algo intermedio) #a_mid",
      "@soft (hay | habra | no habra) (un punto medio | algo intermedio | un termino medio) #a_mid",
      "@soft (podemos | podriamos) (ceder | negociar) [los dos | un poco | ambos] #a_mid",
      "@soft (ni tu ni yo | mitad y mitad | cada quien cede un poco) #a_mid",
      "@alt_core",
      "[tal vez | quizas | a lo mejor] @alt_np",
      // "No sé, ¿tal vez una beta?": a hedge with a proposal
      "(no se | no estoy (seguro | segura)) (tal vez | quizas | quiza | a lo mejor) (@alt_np | @alt_core)",
    ] },
    // bargaining about the weeks ("¿Qué tal tres semanas?")
    counter_offer: { patterns: [
      "(que tal | y si mejor | y si son | y si lo dejamos en | podemos hacer | podriamos hacer | digamos | dejemoslo en | que sean | mejor) (@weeks | un mes #w4 | quince dias #w2 | mes y medio #w6) [mejor | en vez de eso] #h:counter_weeks",
      "(dos | 2) semanas no (son | es) (suficiente | suficientes) [que tal (@weeks | un mes #w4)] #more",
      // her two weeks refused: more time wanted (no #w2 tag here, so it is never read as a yes to two weeks)
      "[no] [con] (dos | 2) semanas no (me funciona | me funcionan | me sirve | me sirven | me alcanza | me alcanzan | alcanza | alcanzan | basta | bastan | me parece bien | me parecen bien | me convence | me convencen | esta bien | estan bien) [que tal (@weeks | un mes #w4)] #more",
      "(dos | 2) semanas (es | son | me parece | me parecen) (muy | demasiado) poco [tiempo] #more",
      // "¿Solo dos semanas?": her two weeks are too few (an echo with "solo", never a yes)
      "(solo | nada mas | nomas | unicamente | apenas) (dos | 2) semanas [mas] #more",
      "(un mes #w4 | @weeks) (seria | es) mejor",
      "(prefiero | preferiria | yo preferiria) (@weeks | un mes #w4 | quince dias #w2)",
      "(un mes #w4 | @weeks) (seria | es) mas (seguro | realista)",
      "(necesito | necesitamos | quiero | queremos) (@weeks | un mes #w4)",
      "(minimo | por lo menos | al menos) (@weeks | un mes #w4)",
      "(puede ser | podria ser | se puede) (@weeks | un mes #w4 | quince dias #w2)",
      "[bueno | esta bien | ok] [pero] (@weeks | un mes #w4 | quince dias #w2) [entonces]",
    ] },
    accept_deal: { patterns: [
      "[bueno | ok | va | sale | perfecto | si | vale] (trato hecho | hecho) #h:agreed",
      "(ahora si | asi si | eso si) (me funciona | me sirve | me parece bien | me late | me convence | me viene bien) #h:works_for_me",
      "(eso | esto) (me funciona | me sirve | me parece bien | me parece justo | me convence | me viene bien)",
      "(me parece | suena) (justo | razonable | bien | perfecto)",
      "[eso | esto] es (justo | razonable | lo justo)",
      "puedo vivir con eso",
      "(es un trato | tenemos un trato | trato)",
      "(acepto | aceptado) [el trato | la propuesta]",
      "(esta bien | bueno | ok | va | sale) (hagamoslo | lo hacemos asi | hagamoslo asi)",
      "estoy de acuerdo (con eso | con esto | con la propuesta)",
      "(dos #w2 | tres #w3 | {wk:number}) semanas (esta bien | me parece bien | me funciona | va | sale | perfecto) [para mi]",
      "es un buen (acuerdo | compromiso | trato)",
      "(perfecto | excelente | genial | buenisimo | de lujo)",
    ] },
    // "Déjame pensarlo." / "Tal vez." at "¿Trato hecho?": no yes yet (only at the deal and "¿O sea que estás de acuerdo…?")
    think_ctx: { patterns: [
      "(dejame | permiteme | dejeme) (pensarlo | pensar) [un poco | un momento | un segundo | tantito | bien]",
      "(lo voy a pensar | voy a pensarlo | lo tengo que pensar | tengo que pensarlo | necesito pensarlo | quiero pensarlo | lo pienso | lo pensare | tengo que pensar) [un poco | bien]",
      "(tal vez | quizas | quiza | a lo mejor)",
      "(no se | no lo se) [todavia] ((dejame | permiteme) (pensarlo | pensar) | lo voy a pensar | tengo que pensarlo | necesito pensarlo) [un poco | tantito]",
    ] },
    agree_to_disagree: { patterns: [
      "@soft [bueno | ok | creo que | parece que] (tendremos que | vamos a tener que | hay que | podemos | tenemos que) estar de acuerdo en (no estar de acuerdo | que no estamos de acuerdo)",
      "@soft (estamos | estemos) de acuerdo en (no estar de acuerdo | que no estamos de acuerdo) #h:agree_disagree",
      "@soft (quedemos | quedamos) en (que no estamos de acuerdo | no estar de acuerdo)",
      "@soft acordemos (estar en desacuerdo | no estar de acuerdo)",
      "@soft (cada quien | cada uno) [con] su (opinion | punto de vista)",
      "@soft (lo vemos | vemos las cosas | vemos esto) (diferente | distinto | de forma diferente | de manera distinta) [y (esta bien | no pasa nada)]",
      "@soft no nos vamos a poner de acuerdo [y (esta bien | no pasa nada)]",
      "@soft tenemos (opiniones | ideas | puntos de vista) (diferentes | distintas | distintos)",
      "(que decida | mejor que decida | dejemos que decida | que lo decida | dejemos que lo decida) gerardo",
      "(preguntemos | le preguntamos | hay que preguntarle | vamos a preguntarle) a gerardo",
      "gerardo (puede | podria | deberia) decidir",
      "(y si | que tal si) (decide gerardo | gerardo decide | lo decide gerardo | gerardo lo decide)",
      "(que decida el jefe | que decida tu jefe | que lo decida el jefe)",
    ] },
    give_in: { patterns: [
      "[bueno | esta bien | ok] (tu ganas | ganaste) [hagamoslo a tu manera | como tu dices]",
      "[bueno | esta bien] (hagamoslo | lo hacemos) (a tu manera | como tu dices | como dices | a tu modo)",
      "[bueno | esta bien] (el viernes entonces | entonces el viernes | que sea el viernes)",
      "[bueno | esta bien] (lanzamos | lancemos | lanzala) el viernes [entonces] [como dijiste | como dices]",
      "(me rindo | me convenciste | ya me convenciste | me has convencido)",
      "olvida lo que dije",
      "[bueno] tu plan es (mejor | bueno) [despues de todo]",
      "[bueno] (cambié de opinion | estaba equivocado | estaba equivocada)",
      "[bueno] (quitemos | quitamos | demos de baja | damos de baja) @oldsite el viernes",
      "tienes razon hagamoslo a tu manera",
    ] },

    // --- the twist: Vanessa cuts in --------------------------------------------------------------------------
    let_her_ctx: { patterns: [
      "(claro | si | adelante | dale | por supuesto | ok | va | sale | esta bien | bueno) (adelante | dime | habla | interrumpe | te escucho) #h:go_ahead",
      "(adelante | dime | te escucho | tu primero)",
      "(claro | si | por supuesto) [que pasa | que paso | dime]",
      "(con gusto | por favor)",
    ] },
    finish_first: { patterns: [
      "(puedo | podria | me dejas | me permites) (terminar | acabar) [mi idea | lo que estaba diciendo | mi punto | la idea] [primero] #h:finish_point",
      "(dejame | permiteme) (terminar | acabar) [mi idea | lo que estaba diciendo | mi punto] [primero]",
      "(un momento | un segundo | un segundito | un momentito) #h:one_second #wait",
      "(todavia | aun) no (termino | terminé | acabo | acabé)",
      "estaba (diciendo | hablando) [algo]",
      "nada mas (dejame | quiero) terminar",
      "(quiero | quisiera | me gustaria) terminar [mi idea | primero]",
      "(espera | espera un momento) [todavia | aun] no (termino | terminé | acabo | he terminado | he acabado)",
      "(ahorita | ahora | todavia | aun) no [por favor] [dejame terminar]",
      "(espera | espera un momento) dejame terminar",
    ] },

    // --- the people in the room ------------------------------------------------------------------------------
    ask_boss: { patterns: [
      "[gerardo] (tu que (opinas | piensas) | que (opinas | piensas) tu) [gerardo] #h:ask_greg",
      "[gerardo] (que opinas | que piensas | que dices) [gerardo]",
      "[gerardo] (como piensas | como opinas) #tip:how_you_think",
      "[gerardo] cual es tu (opinion | punto de vista)",
      "gerardo (puedes | podrias) decidir [tu]",
      "(y tu | y usted) [gerardo]",
      "(y ustedes | ustedes) que (opinan | piensan | opinais | pensais)",
      "(tu eres | gerardo es) el jefe",
      "(tu decides | gerardo decide | decide tu)",
      "es tu decision [gerardo]",
      "que (opina | piensa | dice) gerardo",
    ] },
    walk_away: { patterns: [
      "tengo (otra junta | otra reunion | una llamada | otra llamada | una cita) [ahorita | ahora | en cinco minutos]",
      "[perdon | lo siento | disculpen | disculpa] (me tengo que ir | tengo que irme | ya me voy) [porque | es que] tengo (otra junta | otra reunion | una llamada | otra llamada | una cita) [ahorita | ahora | en cinco minutos]",
      "[esto es] (una perdida de tiempo | inutil | absurdo) #tip:too_blunt",
      "no tengo tiempo para esto",
      "(me regreso | regreso | me voy) a mi (lugar | escritorio)",
      "[yo] ya (terminé | acabé) aqui",
    ] },

    // --- the goodbye -------------------------------------------------------------------------------------------
    monday_yes: { patterns: [
      "[si | claro | vale] (el lunes | a la misma hora) (me funciona | esta bien | me parece bien | perfecto | me queda bien | me viene bien) #h:works_monday",
      "(nos vemos | hasta) el lunes #h:see_monday",
      "[si | claro] el lunes [a la misma hora] [entonces]",
      "[claro | si] nos vemos (entonces | la proxima semana | el proximo lunes) #h:see_then",
      "(si | claro) a la misma hora",
      "el lunes (esta bien | perfecto | me queda) [para mi]",
      "(ahi | alli) (estaré | nos vemos)",
      "[si | claro | vale] [el lunes] a las (nueve | 9) (me funciona | esta bien | me parece bien | perfecto | me queda bien | me viene bien)",
    ] },
    // "¿A qué hora?" / "¿A las nueve?" (asked: Gerardo says the time; said: a yes)
    nine_q_ctx: { patterns: [
      "a que hora [es | sera | seria]",
      "[el lunes] a las (nueve | 9) [de la manana] [verdad | no | entonces]",
      "[el lunes] a la misma hora [verdad | entonces]",
      "(es | seria | sera) a las (nueve | 9)",
    ] },
    monday_no_ctx: { patterns: [
      "el lunes no (puedo | me funciona | me queda | me viene bien)",
      "no puedo el lunes",
      "el lunes no",
      "[el lunes] (estoy | voy a estar) (ocupado | ocupada | fuera | de vacaciones) [el lunes]",
    ] },
    coffee_yes_ctx: { patterns: [
      "(me encantaria | con gusto | claro que si) #h:love_coffee",
      "(solo | nada mas) si tu invitas #h:if_buying",
      "(si | claro) [un cafe] (me cae bien | suena bien | me parece bien)",
      "(vamos | vamonos) [por un cafe | por el cafe | a tomar un cafe]",
      "(yo invito | invito yo)",
      "me hace falta un cafe",
      "un cafe (me encantaria | me cae bien | suena bien)",
    ] },
    coffee_no_ctx: { patterns: [
      "(no puedo | tengo que irme | estoy (ocupado | ocupada) | tengo planes | tengo otra junta | tengo otra reunion) [hoy | ahorita | ahora]",
      "(me encantaria | gracias | suena bien | claro) pero (no puedo | tengo que irme | estoy (ocupado | ocupada) | tengo (planes | otra junta | otra reunion | una reunion)) [hoy | ahorita | ahora]",
      "[mejor] (otro dia | la proxima | otra vez sera | a la proxima) #h:next_time",
      "hoy no [puedo | me viene bien]",
      "no tomo cafe",
      "[no puedo] tengo (trabajo | mucho trabajo | cosas que hacer | una llamada) [hoy | ahorita]",
    ] },
    teal_ctx: { patterns: [
      "yo diria [que] verdes #green #h:id_say_green",
      "(que tal | y si | mejor | tal vez | quizas) (turquesa | verde azulado | azul verdoso | algo en medio | algo intermedio | una mezcla | los dos) #teal #h:how_about_teal",
      "[que tal | mejor | tal vez | yo diria | prefiero | yo prefiero] (verdes | verde) [entonces] #green",
      "(azules | azul) no #green",
      "[yo diria] (turquesa | verde azulado) #teal",
      "(bueno | esta bien | ok | va) (azules | azul) [entonces] #blue",
      "(azules | azul) [esta bien | me parece bien | entonces] #blue",
      "(me gusta | prefiero) [el] (turquesa | verde azulado) #teal",
      "(me gusta | me gustan) (el verde | los verdes | verdes) #green",
    ] },
  },

  lines: {
    // --- Gerardo ------------------------------------------------------------------------------------------------
    g_open: [
      t("Bueno, | equipo, | empezamos.", "Okay, | team, | we-start.", "Okay, everyone, let's get started."),
      t("Buenos días | a | todos. | Vamos | a | ser | rápidos.", "Good morning | to | everyone. | We're-going | to | be | quick.", "Morning, everyone. Let's keep this quick."),
    ],
    g_floor: [
      t("Vanessa, | tienes | la | palabra.", "Vanessa, | you-have | the | floor.", "Vanessa, the floor is yours."),
    ],
    g_anyone: [
      t("¿Alguien | más? | ¿Nadie | tiene | dudas?", "Anyone | else? | Nobody | has | doubts?", "Anyone else? No concerns at all?"),
    ],
    g_doubts: [
      t("¿{m:Seguro|f:Segura}? | La | semana | pasada | tenías | dudas.", "Sure? | — | week | last | you-had | doubts.", "Are you sure? Last week you had doubts.",
        { flags: { 1: F_ART } }),
    ],
    g_friendly: [
      t("A ver, | equipo, | tranquilos.", "Come on, | team, | calm.", "Okay, folks, let's keep it nice.", { flags: { 0: "a ver (let's see) here calls the room to order." } }),
      t("Calma, | ustedes | dos.", "Calm down, | you | two.", "Easy, you two.", { spain: t("Calma, | vosotros | dos.", "Calm down, | you (all) | two.", "Easy, you two.") }),
    ],
    g_popcorn: [
      t("Y | ustedes, | practicantes, | guarden | las | palomitas.", "And | you, | interns, | put-away | the | popcorn.", "And interns, put the popcorn away.", { spain: t("Y | vosotros, | becarios, | guardad | las | palomitas.", "And | you (all), | interns, | put-away | the | popcorn.", "And interns, put the popcorn away.") }),
    ],
    g_alt_help: [
      t("¿No habrá | un | punto medio | aquí?", "Isn't there | a | middle ground | here?", "Is there a middle ground here?"),
    ],
    g_boss_q: [
      t("¿Yo? | Yo | creo | que | necesito | más | café. | Pero | sigan.", "Me? | I | think | that | I-need | more | coffee. | But | carry on.", "Me? I think I need more coffee. But go on.",
        { flags: { 8: "sigan: ustedes, he speaks to both of them." }, spain: t("¿Yo? | Yo | creo | que | necesito | más | café. | Pero | seguid.", "Me? | I | think | that | I-need | more | coffee. | But | carry on.", "Me? I think I need more coffee. But go on.", { flags: { 8: "seguid: vosotros, he speaks to both of them." } }) }),
    ],
    g_decide1: [
      t("Bueno, | yo | decido.", "Okay, | I | decide.", "Okay, I'll make the call."),
    ],
    g_decide2: [
      t("Lanzamos | el | viernes, | pero | la | página | vieja | se queda | dos | semanas | más.", "We-launch | on | Friday, | but | the | site | old | stays | two | weeks | more.",
        "We launch on Friday, but the old site stays up for two more weeks.", { flags: { 1: F_ON } }),
    ],
    // after Vanessa's final offer (three weeks) Gerardo never gives less than she did
    g_decide2_final: [
      t("Lanzamos | el | viernes, | pero | la | página | vieja | se queda | tres | semanas | más.", "We-launch | on | Friday, | but | the | site | old | stays | three | weeks | more.",
        "We launch on Friday, but the old site stays up for three more weeks.", { flags: { 1: F_ON } }),
    ],
    g_decide3: [
      t("¿Nadie | está | contento? | Perfecto. | Eso | es | un | buen | acuerdo.", "Nobody | is | happy? | Perfect. | That | is | a | good | compromise.", "Nobody's happy? Perfect. That's a good compromise."),
    ],
    g_sum1: [
      t("Excelente. | Que | alguien | lo | anote.", "Excellent. | Let | someone | it | write-down.", "Great. Somebody write that down.",
        { flags: { 1: "que + subjunctive: an order to a third person." } }),
    ],
    g_sum2: [
      t("¿Ven? | No fue | tan | difícil.", "You-see? | It-wasn't | so | hard.", "See? That wasn't so hard.", { spain: t("¿Veis? | No ha sido | tan | difícil.", "You (all) see? | It hasn't been | so | hard.", "See? That wasn't so hard.") }),
    ],
    g_gave_in: [
      t("Perfecto. | Entonces, | el | viernes.", "Perfect. | Then, | on | Friday.", "Great. Friday it is.", { flags: { 2: F_ON } }),
    ],
    g_walk: [
      t("Bueno… | lo | retomamos | el | lunes.", "Okay… | it | we-pick-up-again | on | Monday.", "Okay… we'll pick this up on Monday.", { flags: { 3: F_ON } }),
    ],
    g_monday: [
      t("Buena | reunión, | equipo. | ¿El | lunes | a | la | misma | hora?", "Good | meeting, | team. | On | Monday | at | the | same | time?", "Good meeting, everyone. Same time Monday?",
        { flags: { 3: F_ON } }),
    ],
    g_calendar: [
      t("¿No? | Entonces | busco | otro | horario.", "No? | Then | I-look-for | another | time.", "No? Then I'll find another time."),
    ],
    // "¿A qué hora?" / "¿A las nueve?" to "¿El lunes a la misma hora?"
    g_nine: [
      t("A las nueve, | como siempre.", "At nine, | as always.", "Nine, as usual."),
    ],

    // --- Vanessa: the pitch and the charts -------------------------------------------------------------------
    v_pitch1: [
      t("Bueno. | Este | es | el | plan: | lanzamos | la | página | nueva | este | viernes.", "Okay. | This | is | the | plan: | we-launch | the | site | new | this | Friday.",
        "Okay. Here's the plan: we launch the new website this Friday."),
    ],
    v_pitch2: [
      t("Y | ese | mismo | día | damos de baja | la | vieja. | De un jalón.", "And | that | same | day | we-shut-down | the | old-one. | All at once.",
        "And we shut the old one down the same day. A clean break.",
        { flags: { 6: "la vieja: the old one (la página vieja).", 7: F_JALON },
          neutral: t("Y | ese | mismo | día | damos de baja | la | vieja. | De una vez.", "And | that | same | day | we-shut-down | the | old-one. | All at once.",
            "And we shut the old one down the same day. A clean break.", { flags: { 6: "la vieja: the old one (la página vieja)." } }) }),
    ],
    v_thoughts: [
      t("Entonces, | ¿qué | opinas?", "So, | what | do-you-think?", "So, what do you think?"),
    ],
    // a yes here means "I do have thoughts", a no "no thoughts" (c.s.thoughtsAny)
    v_thoughts_any: [
      t("¿Algún | comentario? | ¿No? | Perfecto.", "Any | comment? | No? | Perfect.", "Any thoughts? No? Perfect."),
    ],
    v_reask: [
      t("¿Entonces? | ¿Estás | conmigo | en | esto?", "So? | Are-you | with-me | on | this?", "So? Are you with me on this?"),
    ],
    v_love: [
      t("¿Ves? | ¡Lo | sabía!", "See? | It | I-knew!", "See? I knew it!"),
    ],
    v_no_elab: [
      t("¿No? | ¿Nada más | “no”? | ¿Me | explicas | por qué?", "No? | Just | “no”? | (To) me | you-explain | why?", "No? Just “no”? Care to elaborate?", { spain: t("¿No? | ¿Solo | “no”? | ¿Me | explicas | por qué?", "No? | Just | “no”? | (To) me | you-explain | why?", "No? Just “no”? Care to elaborate?") }),
    ],
    v_q_answer: [
      t("Porque | el | director | la | quiere | para | el | viernes. | Y | porque | lo | digo | yo. | Es broma. | Bueno, | más o menos.",
        "Because | the | CEO | it | wants | by | — | Friday. | And | because | so | I-say | myself. | Just kidding. | Well, | more or less.",
        "Because the CEO wants it by Friday. And because I said so. Kidding. Mostly.", { flags: { 3: F_LA, 6: F_ART } }),
    ],
    v_not_convinced: [
      t("No te veo | muy | {m:convencido|f:convencida}.", "I don't see you | very | convinced.", "You don't look convinced."),
    ],
    v_my_view: [
      t("¿Yo? | Creo | que | es | perfecto. | Obvio.", "Me? | I-think | that | it's | perfect. | Obviously.", "Me? I think it's perfect. Obviously.", { spain: t("¿Yo? | Creo | que | es | perfecto. | Obviamente.", "Me? | I-think | that | it's | perfect. | Obviously.", "Me? I think it's perfect. Obviously.") }),
    ],
    v_rude: [
      t("¡Guau! | Bueno. | No te guardes | nada, | ¿eh?", "Wow! | Okay. | Don't hold back | anything, | huh?", "Wow. Okay. Tell me how you really feel.",
        { flags: { 2: "Sarcastic: “don't hold anything back”." }, spain: t("¡Vaya! | Vale. | No te guardes | nada, | ¿eh?", "Wow! | Okay. | Don't hold back | anything, | huh?", "Wow. Okay. Tell me how you really feel.", { flags: { 2: "Sarcastic: “don't hold anything back”." } }) }),
    ],
    v_charts1: [
      t("Ay, | sabía | que | alguien | iba | a | decir | eso. | Mira | esta | gráfica.", "Oh, | I-knew | that | someone | was-going | to | say | that. | Look-at | this | chart.",
        "Oh, I knew someone would say that. Look at this chart.", { spain: t("Ay, | sabía | que | alguien | iba | a | decir | eso. | Mira | este | gráfico.", "Oh, | I-knew | that | someone | was-going | to | say | that. | Look-at | this | chart.", "Oh, I knew someone would say that. Look at this chart.") }),
    ],
    v_charts2: [
      t("Las | visitas | subieron, | los | clics | subieron, | a | los | usuarios | les encanta | el | diseño | nuevo, | y | la verdad, | si | nada más…",
        "The | visits | went-up, | the | clicks | went-up, | — | the | users | love | the | design | new, | and | honestly, | if | we just…",
        "Traffic is up, clicks are up, users love the new design, and honestly, if we just…",
        { flags: { 6: "a … les encanta: it delights the users; English needs no word for a." }, spain: t("Las | visitas | han subido, | los | clics | han subido, | a | los | usuarios | les encanta | el | diseño | nuevo, | y | la verdad, | si | solo…", "The | visits | have gone up, | the | clicks | have gone up, | — | the | users | love | the | design | new, | and | honestly, | if | we just…", "Traffic is up, clicks are up, users love the new design, and honestly, if we just…", { flags: { 6: "a … les encanta: it delights the users; English needs no word for a." } }) }),
    ],
    v_charts_more: [
      t("…y | en | la | diapositiva | nueve | está | la | tasa | de | conversión, | que, | francamente, | habla por sí sola…",
        "…and | on | the | slide | nine | is | the | rate | of | conversion, | which, | frankly, | speaks for itself…",
        "…and slide nine shows the conversion rate, which, frankly, speaks for itself…"),
      t("…y | esta | es | mi | parte | favorita…", "…and | this | is | my | part | favorite…", "…and this is my favorite part…"),
    ],
    v_charts_end: [
      t("…en fin. | Esa | es | mi | gráfica. | ¿Preguntas?", "…anyway. | That | is | my | chart. | Questions?", "…anyway. That's my chart. Questions?", { spain: t("…en fin. | Ese | es | mi | gráfico. | ¿Preguntas?", "…anyway. | That | is | my | chart. | Questions?", "…anyway. That's my chart. Questions?") }),
    ],

    // --- Vanessa: the floor and the concern --------------------------------------------------------------------
    v_go_ahead: [
      t("Ay, | perdón. | Adelante.", "Oh, | sorry. | Go ahead.", "Oh, sorry. Go ahead."),
      t("Claro, | dime.", "Sure, | tell-me.", "Sure, jump in."),
    ],
    v_oh_sorry: [
      t("Ay, | perdón.", "Oh, | sorry.", "Oh, sorry."),
    ],
    v_rude_stop: [
      t("¿Disculpa? | …Bueno. | Habla.", "Excuse me? | …Fine. | Talk.", "Excuse me? …Fine. Go ahead.", { flags: { 0: F_DISC }, spain: t("¿Perdona? | …Vale. | Habla.", "Excuse me? | …Fine. | Talk.", "Excuse me? …Fine. Go ahead.", { flags: { 0: F_DISC } }) }),
    ],
    v_excuse_me: [
      t("¿Disculpa? | …Está bien.", "Excuse me? | …Fine.", "Excuse me? …Fine.", { flags: { 0: F_DISC }, spain: t("¿Perdona? | …Vale.", "Excuse me? | …Fine.", "Excuse me? …Fine.", { flags: { 0: F_DISC } }) }),
    ],
    v_whats_problem: [
      t("Bueno, | ¿cuál | es | el | problema?", "Okay, | what | is | the | problem?", "Okay, so what's the problem?"),
      t("Está bien. | ¿Qué | te | preocupa?", "Fine. | What | you | worries?", "Fine. What worries you?", { spain: t("Vale. | ¿Qué | te | preocupa?", "Fine. | What | you | worries?", "Fine. What worries you?") }),
    ],
    v_why_again: [
      t("Sí, | ya | lo | dijiste. | Pero | ¿por qué?", "Yes, | already | it | you-said. | But | why?", "Yes, you said that. But why?", { spain: t("Sí, | ya | lo | has dicho. | Pero | ¿por qué?", "Yes, | already | it | you've said. | But | why?", "Yes, you said that. But why?") }),
    ],
    v_problem_first: [
      t("Espera. | Primero, | ¿cuál | es | el | problema?", "Wait. | First, | what | is | the | problem?", "Hold on. First, what's the problem?"),
    ],
    v_reason_help: [
      t("¿Son | las | fechas? | ¿Las | pruebas? | ¿Los | clientes?", "Is-it | the | dates? | The | testing? | The | customers?", "Is it the timing? The testing? The customers?"),
    ],
    v_c_vague: [
      t("¿No está | claro? | Está | clarísimo. | ¿Qué | te | preocupa | exactamente?", "Isn't it | clear? | It's | crystal-clear. | What | you | worries | exactly?",
        "Not clear? It's crystal clear. What exactly worries you?", { flags: { 3: "-ísimo: very, extremely (clarísimo = crystal clear)." } }),
    ],
    v_c_which: [
      t("¿Cuál | problema? | ¿Qué | te | preocupa | exactamente?", "Which | problem? | What | you | worries | exactly?", "What problem? What exactly worries you?"),
    ],
    v_c_why: [
      t("¿Por qué? | A ver, | ¿qué | te | preocupa | exactamente?", "Why? | Let's see, | what | you | worries | exactly?", "Why? Okay, what exactly worries you?"),
    ],
    v_c_test: [
      t("Ya | la | probamos. | Bueno… | casi | toda.", "Already | it | we-tested. | Well… | almost | all-of-it.", "We tested it. Well… mostly.", { flags: { 1: F_LA }, spain: t("Ya | la | hemos probado. | Bueno… | casi | toda.", "Already | it | we've tested. | Well… | almost | all-of-it.", "We tested it. Well… mostly.", { flags: { 1: F_LA } }) }),
    ],
    v_c_time: [
      t("Cuatro | días | es | más | que | suficiente. | Somos | un | equipo | rápido.", "Four | days | is | more | than | enough. | We-are | a | team | fast.", "Four days is plenty. We're a fast team."),
    ],
    v_c_cust: [
      t("Nuestros | clientes | son | más | listos | de lo que | crees.", "Our | customers | are | more | smart | than | you-think.", "Our customers are smarter than you think."),
    ],
    v_c_support: [
      t("El | equipo | de | soporte | va | a | saber | qué | hacer.", "The | team | of | support | is-going | to | know | what | to-do.", "The support team will figure it out."),
    ],
    v_c_bugs: [
      t("Hay | un | bug. | Uno. | Chiquito.", "There-is | one | bug. | One. | Tiny.", "There's one bug. One. Tiny.", { flags: { 4: "chiquito: chico + -ito, an affectionate “tiny”." }, spain: t("Hay | un | bug. | Uno. | Pequeñito.", "There-is | one | bug. | One. | Tiny.", "There's one bug. One. Tiny.", { flags: { 4: "pequeñito: pequeño + -ito, an affectionate “tiny”." } }) }),
    ],
    v_c_risk: [
      t("Todo | lanzamiento | es | un | riesgo. | Así son | los | negocios.", "Every | launch | is | a | risk. | That's how | — | business-is.", "Every launch is a risk. That's business.",
        { flags: { 6: F_ART } }),
    ],
    v_q_old: [
      t("La | damos de baja. | De un jalón.", "It | we-shut-down. | All at once.", "We shut it down. Clean break.",
        { flags: { 0: F_LA, 2: F_JALON },
          neutral: t("La | damos de baja. | De una vez.", "It | we-shut-down. | All at once.", "We shut it down. Clean break.", { flags: { 0: F_LA } }) }),
    ],

    // --- Vanessa: her strong point -------------------------------------------------------------------------------
    v_counter1: [
      t("Pero | aquí | está | el | punto: | la | página | vieja | nos | cuesta | sesenta | mil | pesos | al | mes.",
        "But | here | is | the | point: | the | site | old | (to) us | costs | sixty | thousand | pesos | per | month.",
        "But here's the thing: the old site costs us sixty thousand pesos a month."),
    ],
    v_counter2: [
      t("Y | el | sesenta | por ciento | de | nuestros | visitantes | entra | desde | el | celular. | Y | ahí, | la | página | vieja | es | un | desastre.",
        "And | — | sixty | percent | of | our | visitors | comes-in | from | the | phone. | And | there, | the | site | old | is | a | disaster.",
        "And sixty percent of our visitors are on their phones. And on a phone, the old site is a disaster.", { flags: { 1: F_ART }, spain: t("Y | el | sesenta | por ciento | de | nuestros | visitantes | entra | desde | el | móvil. | Y | ahí, | la | página | vieja | es | un | desastre.", "And | — | sixty | percent | of | our | visitors | comes-in | from | the | phone. | And | there, | the | site | old | is | a | disaster.", "And sixty percent of our visitors are on their phones. And on a phone, the old site is a disaster.", { flags: { 1: F_ART } }) }),
    ],
    v_counter_reask: [
      t("¿Entonces? | ¿La | página | vieja | es | un | problema | o | no?", "So? | The | site | old | is | a | problem | or | not?", "So? Is the old site a problem or not?"),
    ],
    v_no_listen: [
      t("Espera. | ¿Siquiera | viste | mi | gráfica?", "Wait. | Even | you-saw | my | chart?", "Hold on. Did you even look at my chart?", { spain: t("Espera. | ¿Has visto | siquiera | mi | gráfico?", "Wait. | Have you seen | even | my | chart?", "Hold on. Did you even look at my chart?") }),
    ],
    v_no_hear: [
      t("¡Ni siquiera | escuchaste | mi | punto!", "Not even | you-heard | my | point!", "You didn't even hear my point!", { spain: t("¡Ni siquiera | has escuchado | mi | argumento!", "Not even | you've heard | my | argument!", "You didn't even hear my point!") }),
    ],
    v_first_agree: [
      t("Espera. | Primero: | ¿estás | de acuerdo | en | que | la | página | vieja | es | un | problema?", "Wait. | First: | are-you | in agreement | on | that | the | site | old | is | a | problem?",
        "Wait. First, do you agree that the old site is a problem?"),
    ],
    v_thanks_ack: [
      t("Gracias. | O sea | que | en | algo | sí | estamos | de acuerdo.", "Thanks. | I mean | that | on | something | yes | we-are | in agreement.", "Thank you. So we agree on something.",
        { flags: { 5: "sí stresses it: we DO agree." } }),
      t("¡Por fin! | Un | poco | de | respeto.", "Finally! | A | little | of | respect.", "Finally! A little respect."),
    ],

    // --- Vanessa: proposals -----------------------------------------------------------------------------------------
    v_alt_ask: [
      t("Entonces, | ¿qué | propones?", "So, | what | do-you-propose?", "So what do you suggest?"),
    ],
    v_alt_ask_tease: [
      t("A ver, | genio. | ¿Cuál | es | tu | plan?", "Let's see, | genius. | What | is | your | plan?", "Okay, smart one. What's your plan?"),
    ],
    v_a_beta: [
      t("¿Una | beta? | Mmm. | No es | la | peor | idea | que | he | oído | hoy.", "A | beta? | Hmm. | It's not | the | worst | idea | that | I-have | heard | today.",
        "A beta? Hmm. That's not the worst idea I've heard today."),
    ],
    v_a_soft: [
      t("¿Un | lanzamiento de prueba? | Mmm. | No es | la | peor | idea | que | he | oído | hoy.", "A | soft launch? | Hmm. | It's not | the | worst | idea | that | I-have | heard | today.",
        "A soft launch? Hmm. That's not the worst idea I've heard today."),
    ],
    v_a_backup: [
      t("¿Dos | páginas | al mismo tiempo? | Es | el | doble | de | trabajo. | Pero… | está bien, | entiendo | la | lógica.",
        "Two | sites | at the same time? | It's | the | double | of | work. | But… | okay, | I-understand | the | logic.",
        "Two sites at once? That's double the work. But… okay, I see the logic.", { spain: t("¿Dos | páginas | al mismo tiempo? | Es | el | doble | de | trabajo. | Pero… | vale, | entiendo | la | lógica.", "Two | sites | at the same time? | It's | the | double | of | work. | But… | okay, | I-understand | the | logic.", "Two sites at once? That's double the work. But… okay, I see the logic.") }),
    ],
    v_a_delay: [
      t("¿Después? | Perderíamos | una | semana | entera, | mínimo.", "Later? | We'd-lose | a | week | whole, | at least.", "Later? We'd lose a whole week, at least."),
    ],
    v_a_train: [
      t("La | capacitación | toma | tiempo… | pero | bueno, | te | entiendo.", "The | training | takes | time… | but | okay, | you | I-understand.", "Training takes time… but okay, I hear you.", { spain: t("La | formación | lleva | tiempo… | pero | bueno, | te | entiendo.", "The | training | takes | time… | but | okay, | you | I-understand.", "Training takes time… but okay, I hear you.") }),
    ],
    v_a_inform: [
      t("¿Un | correo | a | los | clientes? | Bueno. | Eso | es | fácil.", "An | email | to | the | customers? | Okay. | That | is | easy.", "An email to customers? Fine. That's easy."),
    ],
    v_a_fix: [
      t("¿Arreglar | los | errores | primero? | Está bien, | es | justo.", "Fix | the | bugs | first? | Okay, | it's | fair.", "Fix the bugs first? Fine, that's fair.", { spain: t("¿Arreglar | los | errores | primero? | Vale, | es | justo.", "Fix | the | bugs | first? | Okay, | it's | fair.", "Fix the bugs first? Fine, that's fair.") }),
    ],
    v_a_other: [
      t("Mmm. | Interesante. | Sigue.", "Hmm. | Interesting. | Go on.", "Hmm. Interesting. Go on."),
    ],
    v_soften: [
      t("Bueno, | bueno. | Ganaste | la | mitad.", "Okay, | okay. | You-won | the | half.", "Okay, okay. You win half.", { spain: t("Vale, | vale. | Has ganado | la | mitad.", "Okay, | okay. | You've won | the | half.", "Okay, okay. You win half.") }),
    ],

    // --- Vanessa: settling it ------------------------------------------------------------------------------------------
    v_compromise: [
      t("Bueno. | Te | propongo | algo | intermedio: | lanzamos | el | viernes | como | beta, | y | la | página | vieja | sigue | funcionando | dos | semanas.",
        "Okay. | (To) you | I-propose | something | in-between: | we-launch | on | Friday | as | beta, | and | the | site | old | keeps | working | two | weeks.",
        "Okay. Meet me halfway: we launch on Friday as a beta, and the old site stays up for two weeks.", { flags: { 6: F_ON } }),
    ],
    v_deal_q: [
      t("¿Trato hecho?", "Deal?", "Deal?"),
    ],
    v_final_offer: [
      t("Tres | semanas. | Es | mi | última | oferta.", "Three | weeks. | It's | my | final | offer.", "Three weeks. Final offer."),
    ],
    v_halfway: [
      t("¡Ay, | ya | te | estoy | dando | la | mitad!", "Oh, | already | you | I'm | giving | the | half!", "Come on, that's halfway!"),
    ],
    v_deal: [
      t("¡Listo! | Quedamos | así.", "Done! | We-agree | like-that.", "Done. It's a deal.", { flags: { 1: "quedar (en algo): to agree on it; quedamos así = that's settled." }, spain: t("¡Hecho! | Quedamos | así.", "Done! | We-agree | like-that.", "Done. It's a deal.", { flags: { 1: "quedar (en algo): to agree on it; quedamos así = that's settled." } }) }),
      t("Sale, | trato hecho. | Míranos, | como | gente | adulta.", "Okay, | deal. | Look-at-us, | like | people | grown-up.", "Deal. Look at us, being adults.",
        { flags: { 0: "Mexican: sale = okay, deal." },
          neutral: t("Bueno, | trato hecho. | Míranos, | como | gente | adulta.", "Okay, | deal. | Look-at-us, | like | people | grown-up.", "Deal. Look at us, being adults.") }),
    ],
    v_stubborn: [
      t("Con todo respeto, | sigo | pensando | que | lo mejor | es | hacerlo | de un jalón.", "With all respect, | I-keep | thinking | that | the best | is | to-do-it | all at once.",
        "With respect, I still think a clean break is the way to go.",
        { flags: { 7: F_JALON },
          neutral: t("Con todo respeto, | sigo | pensando | que | lo mejor | es | hacerlo | de una vez.", "With all respect, | I-keep | thinking | that | the best | is | to-do-it | all at once.",
            "With respect, I still think a clean break is the way to go.") }),
    ],
    v_round: [
      t("Podríamos | darle vueltas | a | esto | todo | el | día.", "We-could | go round and round | on | this | all | the | day.", "We could go round and round all day."),
    ],
    v_so_agree: [
      t("¿O sea | que | estás | de acuerdo | conmigo?", "I mean | that | you-are | in agreement | with-me?", "So you agree with me?"),
    ],
    v_atd: [
      t("Bueno. | Estamos | de acuerdo | en | que | no estamos | de acuerdo.", "Okay. | We-are | in agreement | on | that | we-aren't | in agreement.", "Fine. We agree to disagree."),
    ],
    v_impossible: [
      t("Con todo respeto, | eres | imposible.", "With all respect, | you-are | impossible.", "With respect, you're impossible."),
    ],
    v_gave_in: [
      t("¡Gracias! | Sabía | que | ibas | a | cambiar | de | opinión.", "Thanks! | I-knew | that | you-were-going | to | change | — | mind.", "Thank you! I knew you'd come around.",
        { flags: { 6: "cambiar de opinión = change one's mind; de has no English word here." } }),
    ],

    // --- Vanessa: the twist ----------------------------------------------------------------------------------------------
    v_twist_cut: [
      t("Perdón, | ¿puedo | interrumpir | un | segundo?", "Sorry, | can-I | interrupt | a | second?", "Sorry, can I just come in here?"),
    ],
    v_twist_point: [
      t("Gracias. | Nada más | una | cosa: | los | celulares. | Sesenta | por ciento. | Acuérdate.", "Thanks. | Just | one | thing: | the | phones. | Sixty | percent. | Remember.",
        "Thanks. Just one thing: phones. Sixty percent. Remember that.", { spain: t("Gracias. | Solo | una | cosa: | los | móviles. | Sesenta | por ciento. | Acuérdate.", "Thanks. | Just | one | thing: | the | phones. | Sixty | percent. | Remember.", "Thanks. Just one thing: phones. Sixty percent. Remember that.") }),
    ],
    v_twist_sorry: [
      t("Tienes razón. | Perdón.", "You're right. | Sorry.", "Fair enough. Sorry."),
    ],

    // --- Vanessa: the goodbye ---------------------------------------------------------------------------------------------
    v_teal1: [
      t("Y | para que conste, | los | botones | nuevos | van | a | ser | azules.", "And | for the record, | the | buttons | new | are-going | to | be | blue.",
        "And for the record, the new buttons are still going to be blue."),
    ],
    v_teal2: [
      t("¿Verdes? | No. | …¿Turquesa?", "Green? | No. | …Teal?", "Green? No. …Teal?"),
    ],
    v_teal3: [
      t("Turquesa. | De acuerdo. | Míranos.", "Teal. | Agreed. | Look-at-us.", "Teal. Agreed. Look at us.", { spain: t("Turquesa. | Vale. | Míranos.", "Teal. | Okay. | Look-at-us.", "Teal. Agreed. Look at us.") }),
    ],
    v_coffee: [
      t("Estuvo | divertido. | ¿Un | café? | Yo | invito.", "It-was | fun. | A | coffee? | I | treat.", "That was fun. Coffee? I'm buying.",
        { flags: { 5: "invitar: to pay for someone (yo invito = it's on me)." }, spain: t("Ha estado | divertido. | ¿Un | café? | Yo | invito.", "It's been | fun. | A | coffee? | I | treat.", "That was fun. Coffee? I'm buying.", { flags: { 5: "invitar: to pay for someone (yo invito = it's on me)." } }) }),
    ],
    v_coffee_yes: [
      t("Perfecto. | Pero | todavía | no estamos | de acuerdo | con | la | tipografía.", "Great. | But | still | we-aren't | in agreement | about | the | font.",
        "Great. But we're still arguing about the font."),
    ],
    v_coffee_no: [
      t("Entonces, | otro | día.", "Then, | another | day.", "Next time, then."),
    ],
    // "Está bien, gracias." / "Gracias." to the coffee: a yes or a polite no?
    v_yes_or_no: [
      t("¿Eso | es | un | sí | o | un | no?", "That | is | a | yes | or | a | no?", "Is that a yes or a no?"),
    ],
    v_bye: [
      t("Nos vemos | el | lunes. | Misma | hora, | misma | pelea.", "See you | on | Monday. | Same | time, | same | fight.", "See you Monday. Same time, same fight.",
        { flags: { 1: F_ON } }),
    ],
    v_cold_bye: [
      t("Nos vemos | el | lunes.", "See you | on | Monday.", "See you Monday.", { flags: { 1: F_ON } }),
    ],
  },

  hints: {
    disagree: {
      lt: "Say politely that you disagree",
      items: [
        { id: "push_back", s: t("Yo | no estaría | tan | {m:seguro|f:segura}. | No lo tengo | tan | claro.", "I | wouldn't be | so | sure. | I don't have it | so | clear.",
          "I'd push back a little on that. It's not that clear to me."), register: "polite", note: "From the song: a soft, businesslike way to disagree." },
        { id: "see_point", s: t("Entiendo | tu | punto, | pero | no sé | si | estoy | de acuerdo.", "I-understand | your | point, | but | I don't know | if | I-am | in agreement.",
          "I see your point, but I'm not sure I agree.", { spain: t("Entiendo | lo que | dices, | pero | no sé | si | estoy | de acuerdo.", "I-understand | what | you-say, | but | I don't know | if | I-am | in agreement.", "I see your point, but I'm not sure I agree.") }), note: "Show that you understand first, then “pero…”." },
        { id: "not_sure_about", s: t("No estoy | muy | {m:seguro|f:segura} | de | eso.", "I'm not | very | sure | of | that.", "I'm not so sure about that.") },
        { id: "have_concerns", s: t("Tengo | algunas | dudas | sobre | el | viernes.", "I-have | some | doubts | about | — | Friday.", "I have some concerns about Friday.",
          { flags: { 4: F_ART } }) },
        { id: "with_respect", s: t("Con todo respeto, | yo | lo | veo | un poco | diferente.", "With all respect, | I | it | see | a little | differently.", "With respect, I see it a bit differently."),
          register: "polite", note: "“Con todo respeto” softens what comes next." },
        { id: "not_best", s: t("No estoy | {m:seguro|f:segura} | de | que | sea | la | mejor | opción.", "I'm not | sure | of | that | it-is | the | best | option.",
          "I'm not sure that's the best approach.", { flags: { 4: "sea: the subjunctive, because the sentence expresses doubt." } }) },
        { id: "worried", s: t("Me | preocupa | un poco | la | fecha.", "(To) me | worries | a little | the | date.", "I'm a little worried about the timing.") },
      ],
    },
    questions: {
      lt: "Ask about the plan",
      items: [
        { id: "q_why_friday", s: t("¿Por qué | este | viernes?", "Why | this | Friday?", "Why this Friday?") },
        { id: "q_tested", s: t("¿Ya | la | probamos | bien?", "Already | it | we-tested | well?", "Have we tested it properly?", { flags: { 1: F_LA }, spain: t("¿La | hemos probado | bien?", "It | have we tested | well?", "Have we tested it properly?", { flags: { 0: F_LA } }) }),
          note: "Mexicans ask with ya and the simple past: “¿Ya la probamos?”" },
        { id: "q_rush", s: t("¿Por qué | tanta | prisa?", "Why | so-much | hurry?", "What's the rush?"), register: "casual" },
      ],
    },
    interrupt: {
      lt: "Cut in politely",
      items: [
        { id: "come_in", s: t("Perdón, | ¿puedo | interrumpir | un | momento?", "Sorry, | can-I | interrupt | a | moment?", "Sorry, can I just come in here?"),
          note: "From the song. A “Perdón” first is enough to make it polite." },
        { id: "jump_in", s: t("¿Me | permites | un | segundo?", "(To) me | you-allow | a | second?", "Can I jump in for a second?"), note: "Very common in Mexico: “¿Me permites?”" },
        { id: "sorry_interrupt", s: t("Perdón | que | te | interrumpa, | pero…", "Sorry | that | you | I-interrupt, | but…", "Sorry to interrupt, but…",
          { flags: { 3: "interrumpa: the subjunctive after “perdón que”." } }) },
        { id: "add_something", s: t("¿Puedo | agregar | algo?", "Can-I | add | something?", "Could I add something?", { spain: t("¿Puedo | añadir | algo?", "Can-I | add | something?", "Could I add something?") }) },
      ],
    },
    reason: {
      lt: "Explain your concern",
      items: [
        { id: "not_clear", s: t("Con todo respeto, | no lo tengo | tan | claro. | Todavía | no está | probada.", "With all respect, | I don't have it | so | clear. | Still | it isn't | tested.",
          "With respect, it's not that clear. It hasn't been tested yet."), note: "From the song. “No lo tengo claro” = I'm not sure about it." },
        { id: "not_enough_time", s: t("Cuatro | días | no son | suficientes.", "Four | days | aren't | enough.", "Four days isn't enough.") },
        { id: "older_customers", s: t("Muchos | de | nuestros | clientes | tienen | más | de | sesenta | años.", "Many | of | our | customers | have | more | than | sixty | years.",
          "Many of our customers are over sixty.", { flags: { 4: "Spanish says age with tener: tienen … años = they are … years old." } }) },
        { id: "support_not_ready", s: t("El | equipo | de | soporte | no está | listo.", "The | team | of | support | isn't | ready.", "The support team isn't ready.") },
      ],
    },
    ack: {
      lt: "Acknowledge a good point",
      items: [
        { id: "fair_point", s: t("Es | un | punto | válido. | Sin embargo…", "It's | a | point | valid. | However…", "That's a fair point. However…"),
          note: "From the song: grant the point, then “sin embargo…”." },
        { id: "take_point", s: t("Entiendo | tu | punto.", "I-understand | your | point.", "I take your point.", { spain: t("Entiendo | lo que | dices.", "I-understand | what | you-say.", "I take your point.") }) },
        { id: "right_about", s: t("En | eso | tienes razón.", "On | that | you're right.", "You're right about that.") },
        { id: "good_point", s: t("Buen | punto. | La | página | vieja | es | lenta.", "Good | point. | The | site | old | is | slow.", "Good point. The old site is slow.") },
      ],
    },
    alt: {
      lt: "Suggest another way",
      items: [
        { id: "look_another_way", s: t("¿Lo | podríamos | ver | de otra forma?", "It | we-could | see | another way?", "Could we look at it another way?"), note: "From the song." },
        { id: "have_we_considered", s: t("¿Ya | consideramos | un | lanzamiento de prueba?", "Already | we-considered | a | soft launch?", "Have we considered a soft launch?", { spain: t("¿Hemos pensado | en | un | lanzamiento de prueba?", "Have we thought | about | a | soft launch?", "Have we considered a soft launch?") }),
          note: "From the song. Mexicans use ya with the simple past here." },
        { id: "what_if", s: t("¿Y si | dejamos | la | página | vieja | un | mes | más?", "What if | we-leave | the | site | old | a | month | more?", "What if we keep the old site for another month?"),
          note: "“¿Y si probamos…?” is the friendliest way to suggest something." },
        { id: "how_about", s: t("¿Qué tal si | la | lanzamos | como | beta?", "How about | it | we-launch | as | beta?", "How about launching it as a beta?", { flags: { 1: F_LA } }) },
        { id: "compromise_q", s: t("¿Podemos | buscar | un | punto medio?", "Can-we | look-for | a | middle ground?", "Can we find a compromise?") },
      ],
    },
    twist: {
      lt: "Let Vanessa in, or ask to finish your point",
      items: [
        { id: "go_ahead", s: t("Claro, | adelante.", "Sure, | go ahead.", "Sure, go ahead.") },
        { id: "finish_point", s: t("¿Me | dejas | terminar | mi | idea?", "Me | you-let | finish | my | idea?", "Could I just finish my point?") },
        { id: "one_second", s: t("Un | segundo, | por favor.", "One | second, | please.", "Just one second, please.") },
      ],
    },
    resolve: {
      lt: "Accept the compromise, or agree to disagree",
      items: [
        { id: "agreed", s: t("Trato hecho.", "Deal.", "Agreed.") },
        { id: "works_for_me", s: t("Así | sí | me | funciona.", "Like-that | yes | (for) me | it-works.", "Now that works for me.", { flags: { 1: "sí stresses it: this time it does work." }, spain: t("Así | sí | me | convence.", "Like-that | yes | me | it-convinces.", "Now that works for me.", { flags: { 1: "sí stresses it: this time it does work." } }) }),
          note: "From the song." },
        { id: "agree_disagree", s: t("Estamos | de acuerdo | en | no estar | de acuerdo.", "We-are | in agreement | on | not being | in agreement.", "Let's agree to disagree."),
          note: "From the song. Also common: “Cada quien con su opinión.”" },
        { id: "counter_weeks", s: t("¿Qué tal | tres | semanas?", "How about | three | weeks?", "How about three weeks?") },
        { id: "ask_greg", s: t("Gerardo, | ¿tú | qué | opinas?", "Gerardo, | you | what | do-you-think?", "Gerardo, what do you think?") },
      ],
    },
    bye: {
      lt: "Say goodbye",
      items: [
        { id: "works_monday", s: t("El | lunes | me | funciona.", "— | Monday | (for) me | works.", "Monday works for me.", { flags: { 0: F_ART }, spain: t("El | lunes | me | viene | bien.", "— | Monday | (for) me | comes | well.", "Monday works for me.", { flags: { 0: F_ART } }) }) },
        { id: "see_monday", s: t("Nos vemos | el | lunes.", "See you | on | Monday.", "See you Monday.", { flags: { 1: F_ON } }) },
        { id: "see_then", s: t("Claro. | ¡Nos vemos | entonces!", "Sure. | See you | then!", "Sure. See you then!") },
      ],
    },
    coffee: {
      lt: "Answer the coffee invitation",
      items: [
        { id: "love_coffee", s: t("Me | encantaría.", "(To) me | it-would-delight.", "I'd love to.") },
        { id: "if_buying", s: t("¡Solo | si | tú | invitas!", "Only | if | you | treat!", "Only if you're buying!"), register: "casual" },
        { id: "next_time", s: t("Mejor | otro | día.", "Better | another | day.", "Maybe next time.") },
      ],
    },
    teal: {
      lt: "Answer about the color of the buttons",
      items: [
        { id: "id_say_green", s: t("Yo | diría | verdes.", "I | would-say | green.", "I'd say green.", { flags: { 2: "verdes agrees with los botones (plural)." } }), note: "From the song." },
        { id: "how_about_teal", s: t("¿Qué tal | turquesa?", "How about | teal?", "How about teal?") },
        { id: "not_sure_agree", s: t("No sé | si | estoy | de acuerdo.", "I don't know | if | I-am | in agreement.", "I'm not sure I agree."), note: "From the song." },
      ],
    },
  },

  tips: TIPS,

  merges: {
    // Spain's twins (12 Nov 2026)
    "no ha sido": { reason: "grammatical_fusion", split: "no + ha + sido: haber + participle, Spain's present perfect for what has just happened; English says it as one verb phrase.", minimal: "The verb phrase." },
    "han subido": { reason: "grammatical_fusion", split: "han + subido: haber + participle, Spain's present perfect for what has just happened; English says it as one verb phrase.", minimal: "Auxiliary and participle." },
    "has dicho": { reason: "grammatical_fusion", split: "has + dicho: haber + participle, Spain's present perfect for what has just happened; English says it as one verb phrase.", minimal: "Auxiliary and participle." },
    "hemos probado": { reason: "grammatical_fusion", split: "hemos + probado: haber + participle, Spain's present perfect for what has just happened; English says it as one verb phrase.", minimal: "Auxiliary and participle." },
    "has visto": { reason: "grammatical_fusion", split: "has + visto: haber + participle, Spain's present perfect for what has just happened; English says it as one verb phrase.", minimal: "Auxiliary and participle." },
    "has escuchado": { reason: "grammatical_fusion", split: "has + escuchado: haber + participle, Spain's present perfect for what has just happened; English says it as one verb phrase.", minimal: "Auxiliary and participle." },
    "has ganado": { reason: "grammatical_fusion", split: "has + ganado: haber + participle, Spain's present perfect for what has just happened; English says it as one verb phrase.", minimal: "Auxiliary and participle." },
    "ha estado": { reason: "grammatical_fusion", split: "ha + estado: haber + participle, Spain's present perfect for what has just happened; English says it as one verb phrase.", minimal: "Auxiliary and participle." },
    "hemos pensado": { reason: "grammatical_fusion", split: "hemos + pensado: haber + participle, Spain's present perfect for what has just happened; English says it as one verb phrase.", minimal: "Auxiliary and participle." },
    "damos de baja": { reason: "lexical_expression", split: "damos → we-give, de → of, baja → low is false; dar de baja (a website, a service) = shut down.", minimal: "Three words, one verb." },
    "de un jalón": { reason: "lexical_expression", split: "de → of, un → a, jalón → tug is false; Mexican = all in one go.", minimal: "Three words." },
    "de una vez": { reason: "lexical_expression", split: "de → of, una → one, vez → time; = all at once.", minimal: "Three words." },
    "punto medio": { reason: "lexical_expression", split: "punto → point + medio → middle; a compromise = middle ground.", minimal: "Two words, one notion." },
    "es broma": { reason: "lexical_expression", split: "es → it is + broma → joke; the set phrase = just kidding.", minimal: "Two words." },
    "más o menos": { reason: "lexical_expression", split: "más → more, o → or, menos → less; = more or less, sort of.", minimal: "Three words." },
    "la verdad": { reason: "lexical_expression", split: "la → the + verdad → truth; as an opener = honestly.", minimal: "Two words." },
    "habla por sí sola": { reason: "lexical_expression", split: "habla → speaks, por → for, sí → itself, sola → alone; the idiom = speaks for itself.", minimal: "The whole idiom." },
    "en fin": { reason: "lexical_expression", split: "en → in + fin → end; the filler = anyway.", minimal: "Two words." },
    "de lo que": { reason: "grammatical_fusion", split: "de → of, lo → it, que → that; after a comparative before a verb = than.", minimal: "Three words, one English word." },
    "así son": { reason: "lexical_expression", split: "así → like that + son → they are; = that's how (they are).", minimal: "Two words." },
    "por ciento": { reason: "lexical_expression", split: "por → for + ciento → hundred; = percent.", minimal: "Two words." },
    "ni siquiera": { reason: "lexical_expression", split: "ni → nor + siquiera → at least; = not even.", minimal: "Two words." },
    "por fin": { reason: "lexical_expression", split: "por → for + fin → end; = finally.", minimal: "Two words." },
    "lanzamiento de prueba": { reason: "lexical_expression", split: "lanzamiento → launch, de → of, prueba → test; one term = a soft launch.", minimal: "Three words, one term." },
    "al mismo tiempo": { reason: "lexical_expression", split: "al → at the, mismo → same, tiempo → time; = at once.", minimal: "Three words." },
    "trato hecho": { reason: "lexical_expression", split: "trato → deal + hecho → made; the fixed reply = deal!", minimal: "Two words." },
    "con todo respeto": { reason: "lexical_expression", split: "con → with, todo → all, respeto → respect; the formula before disagreeing = with all respect.", minimal: "Three words." },
    "lo mejor": { reason: "grammatical_fusion", split: "lo → it + mejor → better; the neuter article makes a noun = the best (thing).", minimal: "Two words." },
    "darle vueltas": { reason: "lexical_expression", split: "darle → give it + vueltas → turns; arguing in circles = go round and round.", minimal: "Two words." },
    "tienes razón": { reason: "lexical_expression", split: "tienes → you have + razón → reason is false; = you're right.", minimal: "Two words." },
    "para que conste": { reason: "lexical_expression", split: "para → for, que → that, conste → it be recorded; = for the record.", minimal: "Three words." },
    "un poco": { reason: "lexical_expression", split: "un → a + poco → little; the degree adverb = a little, a bit.", minimal: "Two words." },
    "de otra forma": { reason: "lexical_expression", split: "de → of, otra → another, forma → form; the adverbial = another way, differently.", minimal: "Three words." },
    "y si": { reason: "lexical_expression", split: "y → and + si → if; a suggestion = what if.", minimal: "Two words." },
    "qué tal si": { reason: "lexical_expression", split: "qué → what, tal → such, si → if; a suggestion = how about (we…).", minimal: "Three words." },
    "…en fin": { reason: "lexical_expression", split: "en → in + fin → end; the filler = anyway (the dots mark speech trailing in).", minimal: "Two words." },
    "…está bien": { reason: "lexical_expression", split: "está → is + bien → well; giving in = fine (the dots mark a pause).", minimal: "Two words." },
    "nada más": { reason: "lexical_expression", split: "nada → nothing + más → more; = just, only.", minimal: "Two words." },
    "a las nueve": { reason: "grammatical_fusion", split: "a → at + las → the + nueve → nine: the clock time (S-TIME) = at nine.", minimal: "Three words." },
    "como siempre": { reason: "lexical_expression", split: "como → like + siempre → always; = as always, as usual.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Say politely that you disagree with the plan", done: (c) => !!c.s.disagreed && !c.s.rudeOpen },
    { lt: "Cut in politely while Vanessa talks", done: (c) => !!c.s.interruptedPolite },
    { lt: "Explain your concern", done: (c) => !!c.s.reasonGiven },
    { lt: "Acknowledge Vanessa's good point", done: (c) => !!c.s.acked },
    { lt: "Suggest another way", done: (c) => !!c.s.altGiven },
    { lt: "Let Vanessa in, or ask to finish your point", optional: true, when: (c) => !!c.s.twistFired, done: (c) => !!c.s.twistDone },
    { lt: "Reach a compromise, or agree to disagree", done: (c) => c.s.outcome === "deal" || c.s.outcome === "boss" },
  ],

  steps: [
    { id: "pitch", when: (c) => !c.s.outcome, done: (c) => !!c.s.disagreed,
      ask: (c) => {
        if (quiet(c, "pitch")) return;
        if (!c.s.pitched) { c.s.pitched = true; V(c, "v_pitch1"); V(c, "v_pitch2"); V(c, c.s.thoughtsAny ? "v_thoughts_any" : "v_thoughts"); return; }
        c.s.thoughtsAny = false; // "¿Estás conmigo en esto?": a yes is a yes again
        V(c, "v_reask");
      },
      expects: PITCH_EX,
      suggest: [{ lt: "Say politely that you disagree", hint: "disagree" }, { lt: "Ask about the plan", hint: "questions" }],
      // "¿Algún comentario? ¿No? Perfecto." – "Bueno, sí.": the learner has something to say; "No." = no objections
      yes: (c) => { if (pitchYesNo(c, true)) return; agreePlan(c); },
      no: (c) => {
        if (pitchYesNo(c, false)) return;
        // "Así está bien." to "¿Qué opinas?" (fine as it is) is no "no" to the plan: Vanessa asks plainly
        if (!saysNo(c) && /\b(asi (esta|me parece) bien|esta bien asi)\b/.test(heardF(c))) { V(c, "v_reask"); c.hold(); return; }
        bareNo(c);
      },
      help: (c) => { G(c, "g_anyone"); c.s.anyoneAsked = true; } },
    { id: "charts", when: (c) => !c.s.outcome && !!c.s.disagreed, done: (c) => !!c.s.interrupted || c.s.tries.charts >= 3,
      ask: (c) => {
        if (quiet(c, "charts")) return;
        const n = ++c.s.tries.charts;
        if (n === 1) { V(c, "v_charts1"); V(c, "v_charts2"); return; }
        V(c, "v_charts_more");
      },
      expects: CHARTS_EX,
      suggest: [{ lt: "Cut in politely", hint: "interrupt" }],
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
      suggest: [{ lt: "Explain your concern", hint: "reason" }],
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
      suggest: [{ lt: "Acknowledge Vanessa's good point", hint: "ack" }],
      yes: (c) => onAck(c, undefined, "ack"),
      no: (c) => notAck(c),
      help: (c) => V(c, "v_counter_reask") },
    { id: "alternative", when: (c) => !c.s.outcome && !!c.s.reasonHeard && counterDone(c), done: (c) => !!c.s.altHeard,
      ask: (c) => {
        if (quiet(c, "alternative")) return;
        if (c.s.alt && !c.s.altHeard) {
          // a proposal made earlier (or just now, together with "Es un punto válido"): Vanessa answers it now
          if (hearAlt(c, c.s.alt, FRESH.has(c)) === "twist") return;
          c.ask("resolve");
          return;
        }
        if (c.s.altOther) { c.s.altHeard = true; c.s.softened = true; c.ask("resolve"); return; } // "Sigue." – nothing came
        const n = ++c.s.tries.alternative;
        if (n === 1) { V(c, c.s.blunt > 0 ? "v_alt_ask_tease" : "v_alt_ask"); return; }
        if (n === 2) { G(c, "g_alt_help"); return; }
        // no proposal after two prompts: Vanessa meets the learner halfway herself (no dead end)
        c.s.altHeard = true; c.s.softened = true;
        c.ask("resolve");
      },
      expects: ALT_EX,
      suggest: [{ lt: "Suggest another way", hint: "alt" }],
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
        ? [{ lt: "Suggest something else, or agree to disagree", hint: "resolve" }, { lt: "Suggest another way", hint: "alt" }]
        : [{ lt: "Accept the compromise, bargain, or agree to disagree", hint: "resolve" }],
      yes: (c) => resolveTurn(c, "accept"),
      // "Así está bien." to "¿Trato hecho?" (no money here): it's fine as it is, a yes; "No, …" stays a no
      no: (c) => resolveTurn(c, !saysNo(c) && /\b(asi (esta|me parece) bien|esta bien asi)\b/.test(heardF(c)) ? "accept" : "no"),
      help: (c) => resolveTurn(c, "unsure") },
  ],

  init: (c) => {
    Object.assign(c.s, {
      disagreed: false, rudeOpen: false, interrupted: false, interruptedPolite: false, chartsOver: false, chartsEnd: null, floorGiven: false,
      reason: null, reasonGiven: false, reasonHeard: false, acked: false, counterSaid: false, firstAgreeSaid: false,
      alt: null, altGiven: false, altHeard: false, altOther: false, heardAlts: [], softened: false,
      offer: null, halfway: 0, round: 0, outcome: null, blunt: 0, friendlySaid: false, agreedOnce: false, notConvinced: false, anyoneAsked: false,
      tries: { charts: 0, reason: 0, counter: 0, alternative: 0, resolve: 0 },
      twistFired: false, twistOpen: false, twistDone: false, twistTag: null, closingState: null, coffeeAnswer: null, quiet: null, ended: false,
      dealAgain: false, soAgain: false, coffeeAsked: false,
      // variety: Vanessa cuts in (twist), refuses the first proposal, and how the goodbye ends
      twist: c.chance(c.visits >= 1 ? 0.6 : 0.4),
      stubborn: c.chance(c.visits >= 1 ? 0.5 : 0.3),
      flair: c.chance(0.5) ? "teal" : "coffee",
      thoughtsAny: c.chance(0.5), // the pitch ends "¿Algún comentario? ¿No? Perfecto." (yes/no turn around) or "¿Qué opinas?"
    });
  },

  start: (c) => {
    G(c, "g_open");
    G(c, "g_floor");
    // the pitch step follows: Vanessa presents the plan
  },

  handlers: {
    disagree_polite(c, _sl, sg) {
      // "¡Estás loca!" first, then "Entiendo tu punto, pero no estoy muy de acuerdo.": the polite way counts after all
      // (not in the same breath as the rude remark)
      if (!c.s.outcome && !c.s.twistOpen && !turnSegments(c).some((x) => x.tags.includes("rude"))) c.s.rudeOpen = false;
      // "Estoy de acuerdo, pero necesitamos más tiempo." to her strong point: granted, with a concern after it
      if (phase(c) === "counter" && c.s.counterSaid && /^\W*(si|estoy de acuerdo|es cierto|es verdad|tienes razon|buen punto|me parece bien)\b/.test(heardF(c))) { onAck(c, sg, "ack"); return; }
      onDisagree(c, sg);
    },
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
    // "¿Sesenta mil pesos?" / "¿Al mes?": she presses her point ("¿Entonces? ¿La página vieja es un problema o no?")
    echo_ctx(c) {
      if (twistGuard(c)) return;
      if (phase(c) !== "counter" || !c.s.counterSaid || !once(c, "react")) return;
      V(c, "v_counter_reask");
      waitHere(c);
    },
    // "Déjame pensarlo." / "Tal vez." at "¿Trato hecho?": no yes ("¡Ay, ya te estoy dando la mitad!" / "¿Trato hecho?")
    think_ctx(c) {
      if (twistGuard(c)) return;
      if (phase(c) === "resolve") resolveTurn(c, "unsure");
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
      if (ph === "closing") { closingTurn(c, thanksNo(c) ? "no" : "other"); return; } // "Ahorita no." to the coffee
      if (ph === "charts") { interruptNow(c, true, false); return; } // "Déjame terminar…" while she talks: cutting in
      if (sg.tags.includes("wait")) { GLOBAL_HANDLERS.g_wait(c as any, {}); return; } // "Un momento."
      if (!once(c, "react") || ph === "ended") return;
      V(c, "v_twist_sorry"); // "Déjame terminar." – "Tienes razón. Perdón."
      waitHere(c);
    },
    ask_boss(c) {
      if (twistGuard(c)) return;
      const ph = phase(c);
      if (ph === "ended") return;
      if (ph === "closing") { closingTurn(c, "other"); return; }
      if (!once(c, "react")) return;
      if (/\bvanessa\b/.test(heardF(c)) && !/\bgerardo\b/.test(heardF(c))) { V(c, "v_my_view"); waitHere(c); return; }
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
    // "No sé." on its own: the step's help; with more after it ("…, ¿tal vez una beta?") the rest answers.
    // "No estoy seguro." at the pitch is a doubt about the plan: a polite disagreement.
    g_dontknow(c) {
      const h = heardF(c);
      if (phase(c) === "pitch" && /\b(segur[oa]|convencid[oa])\b/.test(h)) { onDisagree(c, undefined); return; }
      const rest = h
        .replace(/\b(no se( todavia)?|no lo se|todavia no se|no tengo idea|ni idea|no estoy (segur[oa]|convencid[oa])( todavia)?|no me decido|no he decidido( todavia)?)\b/g, " ")
        .replace(/\b(m+|eh+|este|pues|bueno|perdon|la verdad|la neta|vanessa|gerardo|ok|okay|ay)\b|[^a-z\s]/g, " ").trim();
      if (rest) return;
      // at "¿Trato hecho?" the help's answer may settle the meeting (Gerardo decides): no hold, so the goodbye follows
      if (phase(c) === "resolve" && !c.s.twistOpen) { resolveTurn(c, "unsure"); return; }
      GLOBAL_HANDLERS.g_dontknow(c as any, {});
    },
    // "¡Adiós!" / "Perdón, me tengo que ir." before the end: the learner walks out of the meeting
    g_bye(c) {
      if (c.s.ended) return;
      if (c.s.closingState) { closingTurn(c, "bye"); return; }
      if (c.s.outcome) return; // the meeting has just been settled: the goodbye comes next
      walk(c);
    },
    monday_yes(c) {
      if (c.s.ended) return;
      if (c.s.closingState) { closingTurn(c, "yes"); return; }
      if (!c.s.outcome) walk(c); // "¡Nos vemos el lunes!" in the middle of the meeting: leaving
    },
    monday_no_ctx(c) { if (c.s.closingState) closingTurn(c, "no"); },
    nine_q_ctx(c) { nineQ(c); },
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
    c.event("meeting-outcome", { outcome: c.s.outcome, done, note: NOTES[c.s.outcome] ?? (done ? undefined : missedNote(c)) });
    c.remember({ lastOutcome: c.s.outcome });
    c.expect(closingPending());
  },

  tests: [
    // --- the pitch: polite disagreement (the hints first) ---
    { say: "Yo no estaría tan seguro. No lo tengo tan claro.", intent: "disagree_polite", step: "pitch" },
    { say: "Entiendo tu punto, pero no sé si estoy de acuerdo.", intent: "disagree_polite", step: "pitch" },
    { say: "No estoy muy segura de eso.", intent: "disagree_polite", step: "pitch", not: ["g_dontknow"] },
    { say: "Tengo algunas dudas sobre el viernes.", intent: "disagree_polite", step: "pitch" },
    { say: "Con todo respeto, yo lo veo un poco diferente.", intent: "disagree_polite", step: "pitch" },
    { say: "No estoy seguro de que sea la mejor opción.", intent: "disagree_polite", step: "pitch" },
    { say: "Me preocupa un poco la fecha.", intent: "disagree_polite", step: "pitch" },
    { say: "Es una idea interesante, pero tengo algunas dudas.", intent: "disagree_polite", step: "pitch" },
    { say: "No creo que sea buena idea, necesitamos más tiempo.", intent: "disagree_polite", step: "pitch" },
    { say: "No estoy de acuerdo.", intent: "disagree_polite", step: "pitch" },
    { say: "No me late.", intent: "disagree_polite", step: "pitch", not: ["agree_plan"] },
    { say: "¿Lo podemos platicar un poco más?", intent: "disagree_polite", step: "pitch" },
    { say: "Con el debido respeto, creo que no.", intent: "disagree_polite", step: "pitch" },
    { say: "Estás loca.", intent: "rude_disagree", step: "pitch" },
    { say: "¡Es una idea tontísima!", intent: "rude_disagree", step: "pitch" },
    { say: "¡Ni loco!", intent: "rude_disagree", step: "pitch" },
    { say: "¡Me parece genial!", intent: "agree_plan", step: "pitch" },
    { say: "Me gusta el plan.", intent: "agree_plan", step: "pitch" },
    { say: "No me gusta el plan.", intent: "disagree_polite", step: "pitch", not: ["agree_plan"] },
    { say: "No me parece buena idea.", intent: "disagree_polite", step: "pitch", not: ["agree_plan"] },
    { say: "No tengo ninguna duda.", intent: "agree_plan", step: "pitch", not: ["disagree_polite"] },
    { say: "No es una idea tonta.", intent: "none", step: "pitch", not: ["rude_disagree"] },
    { say: "¿Por qué el viernes?", intent: "ask_q", step: "pitch" },
    { say: "¿Por qué tanta prisa?", intent: "ask_q", step: "pitch" },
    { say: "¿Ya la probamos bien?", intent: "ask_q", step: "pitch" },
    { say: "¿Y los clientes mayores?", intent: "ask_q", step: "pitch", not: ["offer_alt"] },
    { say: "Gerardo, ¿tú qué opinas?", intent: "ask_boss", step: "pitch" },
    { say: "Gerardo, ¿cómo piensas?", intent: "ask_boss", step: "pitch" },
    { say: "Y vosotros, ¿qué pensáis?", intent: "ask_boss", step: "pitch" },
    // --- the charts: cutting in ---
    { say: "Perdón, ¿puedo interrumpir un momento?", intent: "interrupt_polite", step: "charts" },
    { say: "¿Me permites un segundo?", intent: "interrupt_polite", step: "charts" },
    { say: "Perdón que te interrumpa, pero todavía no está probada.", intent: "interrupt_polite", step: "charts" },
    { say: "¿Puedo agregar algo?", intent: "interrupt_polite", step: "charts" },
    { say: "Déjame decir algo.", intent: "interrupt_polite", step: "charts", not: ["rude_interrupt"] },
    { say: "Disculpa, Vanessa.", intent: "interrupt_ctx", step: "charts" },
    { say: "Un segundo.", intent: "interrupt_ctx", step: "charts" },
    { say: "¡Ya basta!", intent: "rude_interrupt", step: "charts" },
    { say: "Déjame hablar.", intent: "rude_interrupt", step: "charts" },
    // --- the concern ---
    { say: "Con todo respeto, no lo tengo tan claro. Todavía no está probada.", intent: "give_reason", step: "reason" },
    { say: "Cuatro días no son suficientes.", intent: "give_reason", step: "reason" },
    { say: "Muchos de nuestros clientes tienen más de sesenta años.", intent: "give_reason", step: "reason" },
    { say: "El equipo de soporte no está listo.", intent: "give_reason", step: "reason" },
    { say: "Todavía no la hemos probado.", intent: "give_reason", step: "reason" },
    { say: "Todavía hay errores en la página nueva.", intent: "give_reason", step: "reason" },
    { say: "¿Y si se cae?", intent: "give_reason", step: "reason" },
    { say: "No funciona bien en el móvil.", intent: "give_reason", step: "reason" },
    { say: "No nos alcanza el tiempo.", intent: "give_reason", step: "reason" },
    { say: "No lo tengo tan claro.", intent: "give_reason", step: "reason" },
    { say: "Las pruebas.", intent: "concern_ctx", step: "reason" },
    { say: "Las fechas, sobre todo.", intent: "concern_ctx", step: "reason" },
    { say: "No es arriesgado.", intent: "ask_q", step: "reason", not: ["give_reason"] },
    { say: "No hay errores.", intent: "none", step: "reason", not: ["give_reason"] },
    { say: "Ya la probamos.", intent: "ask_q", step: "reason", not: ["give_reason"] },
    // --- her strong point ---
    { say: "Es un punto válido. Sin embargo…", intent: "ack_point", step: "counter" },
    { say: "Entiendo tu punto.", intent: "ack_point", step: "counter" },
    { say: "En eso tienes razón.", intent: "ack_point", step: "counter" },
    { say: "Buen punto. La página vieja es lenta.", intent: "ack_point", step: "counter" },
    { say: "Hace sentido.", intent: "ack_point", step: "counter" },
    { say: "Estás correcta.", intent: "ack_point", step: "counter" },
    { say: "Sesenta mil pesos al mes es mucho.", intent: "ack_point", step: "counter" },
    { say: "Tienes razón, pero ¿y si dejamos la página vieja un mes?", intent: "ack_point", step: "counter" },
    { say: "No es un punto válido.", intent: "disagree_polite", step: "counter", not: ["ack_point"] },
    { say: "La página vieja no es un problema.", intent: "site_problem_ctx", step: "counter", not: ["ack_point"] },
    { say: "Estoy de acuerdo, pero el viernes es muy pronto.", intent: "disagree_polite", step: "pitch", not: ["agree_plan"] },
    { say: "Sí, pero tengo dudas.", intent: "disagree_polite", step: "pitch", not: ["agree_plan"] },
    // --- another way ---
    { say: "¿Lo podríamos ver de otra forma?", intent: "offer_alt", step: "alternative" },
    { say: "¿Ya consideramos un lanzamiento de prueba?", intent: "offer_alt", step: "alternative" },
    { say: "¿Y si dejamos la página vieja un mes más?", intent: "offer_alt", step: "alternative" },
    { say: "¿Qué tal si la lanzamos como beta?", intent: "offer_alt", step: "alternative" },
    { say: "¿Podemos buscar un punto medio?", intent: "offer_alt", step: "alternative" },
    { say: "¿Por qué no capacitamos primero al equipo de soporte?", intent: "offer_alt", step: "alternative" },
    { say: "Podríamos avisarles a los clientes primero.", intent: "offer_alt", step: "alternative" },
    { say: "¿Y si probamos con unos clientes primero?", intent: "offer_alt", step: "alternative" },
    { say: "¿Qué os parece si la lanzamos como beta?", intent: "offer_alt", step: "alternative" },
    { say: "No quitemos la página vieja todavía.", intent: "offer_alt", step: "alternative" },
    { say: "No deberíamos lanzarla como beta.", intent: "none", step: "alternative", not: ["offer_alt"] },
    { say: "No quiero esperar dos semanas.", intent: "disagree_polite", step: "alternative", not: ["offer_alt"] },
    { say: "No dejemos la página vieja.", intent: "none", step: "alternative", not: ["offer_alt"] },
    { say: "No quiero una beta.", intent: "disagree_polite", step: "alternative", not: ["offer_alt"] },
    { say: "No sé, ¿tal vez una beta?", intent: "offer_alt", step: "alternative" },
    { say: "Lancemos la nueva, pero dejemos la vieja.", intent: "offer_alt", step: "alternative" },
    // review probes: negated "bad idea" is a yes; a negated concern is none
    { say: "No me parece mala idea.", intent: "agree_plan", step: "pitch", not: ["disagree_polite", "rude_disagree"] },
    { say: "No está mal.", intent: "agree_plan", step: "pitch", not: ["rude_disagree"] },
    { say: "Yo no lo haría así.", intent: "disagree_polite", step: "pitch" },
    { say: "Los clientes no se van a confundir.", intent: "none", step: "reason", not: ["give_reason"] },
    { say: "Cuatro días son suficientes.", intent: "ask_q", step: "reason", not: ["give_reason"] },
    { say: "No es mucho dinero.", intent: "none", step: "counter", not: ["ack_point"] },
    { say: "Tres semanas no.", intent: "none", step: "resolve", not: ["counter_offer", "accept_deal"] },
    { say: "No es un buen acuerdo.", intent: "disagree_polite", step: "resolve", not: ["accept_deal"] },
    // review traps: a refusal of her two weeks is no yes; negated proposals and give-ins
    { say: "Dos semanas no me funcionan.", intent: "counter_offer", step: "resolve", not: ["accept_deal", "agree_plan"] },
    { say: "Dos semanas no me parece bien.", intent: "counter_offer", step: "resolve", not: ["accept_deal", "agree_plan"] },
    { say: "Un mes no me funciona.", intent: "disagree_polite", step: "resolve", not: ["counter_offer", "accept_deal"] },
    { say: "No acepto el trato.", intent: "disagree_polite", step: "resolve", not: ["accept_deal"] },
    { say: "No me rindo.", intent: "disagree_polite", step: "resolve", not: ["give_in"] },
    { say: "No lancemos el viernes.", intent: "disagree_polite", step: "resolve", not: ["give_in"] },
    { say: "No me parece justo.", intent: "disagree_polite", step: "resolve", not: ["accept_deal"] },
    { say: "No tienes razón.", intent: "disagree_polite", step: "counter", not: ["ack_point"] },
    { say: "No tiene sentido.", intent: "disagree_polite", step: "counter", not: ["ack_point"] },
    { say: "Estoy en contra.", intent: "disagree_polite", step: "pitch", not: ["agree_plan"] },
    { say: "No tengo ningún problema con el plan.", intent: "agree_plan", step: "pitch", not: ["disagree_polite"] },
    { say: "No me parece tan buena idea.", intent: "disagree_polite", step: "pitch", not: ["agree_plan"] },
    { say: "Me preocupa que no hayamos hecho suficientes pruebas.", intent: "give_reason", step: "reason" },
    { say: "Es un buen punto. Sin embargo, sigo preocupada.", intent: "ack_point", step: "counter" },
    { say: "¿Y si Gerardo decide?", intent: "agree_to_disagree", step: "resolve" },
    { say: "Perdón, me tengo que ir, tengo otra junta.", intent: "walk_away", step: "resolve" },
    // --- settling it ---
    { say: "Trato hecho.", intent: "accept_deal", step: "resolve" },
    { say: "Así sí me funciona.", intent: "accept_deal", step: "resolve" },
    { say: "Vale, trato hecho.", intent: "accept_deal", step: "resolve" },
    { say: "Estamos de acuerdo en no estar de acuerdo.", intent: "agree_to_disagree", step: "resolve" },
    { say: "Mejor que decida Gerardo.", intent: "agree_to_disagree", step: "resolve" },
    { say: "¿Qué tal tres semanas?", intent: "counter_offer", step: "resolve" },
    { say: "Preferiría un mes.", intent: "counter_offer", step: "resolve" },
    { say: "Eso no me funciona.", intent: "disagree_polite", step: "resolve", not: ["accept_deal"] },
    { say: "No hay trato.", intent: "disagree_polite", step: "resolve", not: ["accept_deal"] },
    { say: "Bueno, tú ganas. Hagámoslo a tu manera.", intent: "give_in", step: "resolve" },
    { say: "No me has convencido.", intent: "disagree_polite", step: "resolve", not: ["give_in"] },
    // audit 5 Nov: hesitations, echoes and "more" at the deal; surprise at her figures; "más o menos" is no "how are you"
    { say: "Déjame pensarlo.", intent: "think_ctx", step: "resolve", not: ["accept_deal"] },
    { say: "Lo voy a pensar.", intent: "think_ctx", step: "resolve", not: ["accept_deal"] },
    { say: "Tal vez.", intent: "think_ctx", step: "resolve", not: ["accept_deal"] },
    { say: "¿Nada más dos semanas?", intent: "counter_offer", step: "resolve", not: ["accept_deal"] },
    { say: "Es justo.", intent: "accept_deal", step: "resolve" },
    { say: "No es justo.", intent: "disagree_polite", step: "resolve", not: ["accept_deal"] },
    { say: "¿Sesenta mil pesos al mes?", intent: "echo_ctx", step: "counter", not: ["ack_point"] },
    { say: "¿Tanto?", intent: "echo_ctx", step: "counter", not: ["ack_point"] },
    { say: "Sesenta mil pesos al mes es mucho.", intent: "ack_point", step: "counter", not: ["echo_ctx"] },
    { say: "Más o menos.", intent: "disagree_polite", step: "pitch", not: ["agree_plan", "g_howareyou_bad"] },
    // --- the twist (let_her_ctx is tested in the sims: it exists only while she cuts in) ---
    { say: "¿Me dejas terminar mi idea?", intent: "finish_first" },
    { say: "Todavía no termino.", intent: "finish_first" },
    // --- the goodbye ---
    { say: "El lunes me funciona.", intent: "monday_yes" },
    { say: "Nos vemos el lunes.", intent: "monday_yes" },
    // --- walking out ---
    { say: "Esto es una pérdida de tiempo.", intent: "walk_away" },
    { say: "Perdón, me tengo que ir.", intent: "g_bye" },
    // --- nonsense ---
    { say: "Plátano cohete morado cielo", intent: "none" },
    { say: "El gato duerme en el sofá", intent: "none" },
  ],

  sims: [
    // The happy path: a compromise, and Vanessa cuts in (twist pinned on every seed); coffee at the end.
    { name: "compromise, Vanessa cuts in", turns: [
      "No estoy muy seguro de eso.", "Perdón, ¿puedo interrumpir un momento?", "Todavía no está probada.", "Es un punto válido. Sin embargo…",
      "¿Y si la lanzamos como beta?", "Claro, adelante.", "Trato hecho.", "El lunes me funciona.", "Me encantaría.",
    ], expect: { complete: true, state: { outcome: "deal", twistDone: true } }, auto: AUTO, setup: SIM(true, false, "coffee") },
    // Vanessa refuses the proposal; the learner agrees to disagree and Gerardo decides; the turquoise goodbye.
    { name: "stubborn: agree to disagree, Gerardo decides", turns: [
      "Yo no estaría tan segura.", "Disculpa, ¿puedo agregar algo?", "Cuatro días no son suficientes.", "Entiendo tu punto.",
      "¿Ya consideramos un lanzamiento de prueba?", "Estamos de acuerdo en no estar de acuerdo.", "Nos vemos el lunes.", "Yo diría verdes.", "Turquesa.",
    ], expect: { complete: true, state: { outcome: "boss" } }, auto: AUTO, setup: SIM(false, true, "teal") },
    // Questions first, a short answer to "¿Son las fechas?", "de otra forma" with nothing concrete, then bargaining.
    { name: "questions, short answers, bargaining", turns: [
      "¿Por qué el viernes?", "¿Ya la probamos bien?", "Entiendo tu punto, pero no sé si estoy de acuerdo.", "Perdón, ¿me permites un segundo?",
      "Mmm, no sé.", "Las fechas.", "En eso tienes razón.", "¿Lo podríamos ver de otra forma?", "¿Qué tal si dejamos la página vieja como respaldo?",
      "¿Qué tal tres semanas?", "Bueno, trato hecho.", "Claro. ¡Nos vemos entonces!", "Mejor otro día.",
    ], expect: { complete: true, state: { outcome: "deal", reason: "c_time", offer: "final" } }, auto: AUTO, setup: SIM(false, false, "coffee") },
    // Blunt all the way: the meeting still ends in a deal, but without the stamp, and Vanessa's goodbye is cold.
    { name: "rude: a deal without the stamp", turns: [
      "Es una idea tontísima.", "¡Ya basta!", "Necesitamos más tiempo.", "Estás equivocada.", "Es un punto válido.",
      "Dejemos la página vieja un mes.", "Trato hecho.", "Adiós.",
    ], expect: { complete: false, state: { outcome: "deal", rudeOpen: true, interruptedPolite: false } }, auto: AUTO, setup: SIM(false, false, "coffee") },
    // Agreeing twice with the plan: the learner gives in (no stamp).
    { name: "giving in at the start", turns: ["¡Me parece genial!", "Estoy totalmente de acuerdo.", "Nos vemos el lunes."],
      expect: { complete: false, state: { outcome: "gave_in" } }, auto: AUTO, setup: SIM(false, false, "coffee") },
    // Walking out of the meeting (no stamp).
    { name: "walking out", turns: ["No estoy muy segura de eso.", "Perdón, me tengo que ir."],
      expect: { complete: false, state: { outcome: "walked" } }, auto: AUTO, setup: SIM(false, false, "coffee") },
    // The twist on every seed: "¿Me dejas terminar mi idea?"; Vanessa first refuses, a second proposal softens her.
    { name: "twist: let me finish; a second proposal", turns: [
      "Tengo algunas dudas sobre el viernes.", "Perdón que te interrumpa, pero muchos de nuestros clientes tienen más de sesenta años.", "Buen punto. La página vieja es lenta.",
      "¿Qué tal si la lanzamos como beta?", "¿Me dejas terminar mi idea?", "¿Y si además capacitamos al equipo de soporte primero?",
      "Así sí me funciona.", "El lunes a la misma hora me funciona.", "¡Solo si tú invitas!",
    ], expect: { complete: true, state: { outcome: "deal", twistDone: true, softened: true } }, auto: AUTO, setup: SIM(true, true, "coffee") },
    // The twist answered rudely: Gerardo decides, no stamp (the twist item stays open); "azules entonces" at the goodbye.
    { name: "twist answered rudely", turns: [
      "No estoy muy seguro de eso.", "Perdón, ¿puedo interrumpir un momento?", "Todavía no la hemos probado.", "Puede que tengas razón.",
      "¿Y si dejamos la página vieja un mes?", "¡Déjame hablar!", "Cada quien con su opinión.", "Bueno, nos vemos el lunes.", "Bueno, azules entonces.",
    ], expect: { complete: false, state: { outcome: "boss", twistFired: true, twistDone: false } }, auto: AUTO, setup: SIM(true, false, "teal") },
    // Vanessa finishes her charts herself (no polite interruption: no stamp); a vague reason first.
    { name: "the monologue runs out; a vague reason", turns: [
      "Yo no estaría tan seguro.", "Ok.", "Ajá.", "Sí.", "No lo tengo tan claro.", "Todavía hay errores en la página nueva.",
      "Es cierto.", "¿Podemos buscar un punto medio?", "Trato hecho.", "Nos vemos el lunes.", "Perdón, hoy no puedo.",
    ], expect: { complete: false, state: { outcome: "deal", interruptedPolite: false, chartsOver: true } }, auto: AUTO, setup: SIM(false, false, "coffee") },
    // Bargaining for a month, then asking Gerardo: he decides.
    { name: "a month? Gerardo decides", turns: [
      "No estoy segura de que sea la mejor opción.", "Perdón que te interrumpa, pero el equipo de soporte no está listo.", "Entiendo tu punto.",
      "Podríamos posponerlo dos semanas.", "¿Qué tal un mes?", "Gerardo, ¿tú qué opinas?", "Gracias, nos vemos el lunes.", "Mejor otro día.",
    ], expect: { complete: true, state: { outcome: "boss" } }, auto: AUTO, setup: SIM(false, false, "coffee") },
    // A bare "No." ("¿Nada más “no”?"), a proposal during her counterpoint ("Primero, ¿estás de acuerdo…?" – "Sí."),
    // "No." to "¿El lunes a la misma hora?", and the turquoise goodbye in two steps.
    { name: "a bare no; a proposal too early; the turquoise goodbye", turns: [
      "No.", "Necesitamos más tiempo.", "Disculpa, ¿puedo agregar algo?", "Necesitamos más tiempo.", "¿Y si dejamos la página vieja un mes?",
      "Sí.", "Trato hecho.", "No.", "¿Verdes?", "Ok.",
    ], expect: { complete: true, state: { outcome: "deal", firstAgreeSaid: true } }, auto: { closing: "El lunes me funciona.", teal: "Yo diría verdes.", teal2: "Turquesa." },
    setup: SIM(false, false, "teal") },
    // No dead ends: no concern after three prompts (Vanessa answers the likely one), her point not taken twice, no
    // proposal (she meets the learner halfway herself), then a stalemate: Gerardo decides. No stamp.
    { name: "fallbacks: no concern, no proposal, a stalemate", turns: [
      "No estoy de acuerdo.", "Perdón, ¿puedo interrumpir un momento?", "Ok.", "Sí.", "No sé.", "Sigo pensando que es muy arriesgado.",
      "¡Pero no está probada!", "No sé.", "Ok.", "No estoy de acuerdo.", "Sigo sin estar de acuerdo.", "Adiós.",
    ], expect: { complete: false, state: { outcome: "boss", acked: false, altGiven: false, interruptedPolite: true } },
    auto: { closing: "El lunes me funciona.", coffee: "Mejor otro día." }, setup: SIM(false, false, "coffee") },
    // Asking both of them first, "Tengo una pregunta" as the way in, a question as the concern, a hedge with a
    // proposal ("No sé, ¿tal vez una beta?"), and leaving right after the deal.
    { name: "asking Vanessa and Gerardo; hedges; leaving at the end", turns: [
      "Vanessa, ¿qué opinas?", "¿Por qué el viernes?", "Gerardo, ¿tú qué opinas?", "No estoy muy seguro de este plan.",
      "Perdón, tengo una pregunta.", "¿Ya está probada?", "Entiendo tu punto.", "No sé, ¿tal vez una beta?", "Me parece bien.", "Perdón, me tengo que ir.",
    ], expect: { complete: true, state: { outcome: "deal", reason: "c_test", alt: "a_beta" } }, auto: AUTO, setup: SIM(false, false, "coffee") },
    // Giving in at the end: Vanessa refuses, "Tienes razón." – "¿O sea que estás de acuerdo conmigo?" – "Sí." (no stamp).
    { name: "giving in at the end", turns: [
      "No estoy muy seguro de eso.", "Perdón, ¿puedo interrumpir un momento?", "Todavía no está probada.", "Buen punto.",
      "Dejemos la página vieja un mes.", "Sigo pensando que es muy arriesgado.", "Tienes razón.", "Sí.", "Adiós.",
    ], expect: { complete: false, state: { outcome: "gave_in" } }, auto: AUTO, setup: SIM(false, true, "coffee") },
    // "¿Dos semanas? ¿Qué tal un mes?": the echo of her two weeks is no yes; the month counts ("Tres semanas. Es mi última oferta.").
    { name: "an echo of her two weeks, then a month", turns: [
      "No estoy muy segura de eso.", "Perdón, ¿puedo interrumpir un momento?", "Todavía no está probada.", "Es un punto válido.",
      "¿Y si la lanzamos como beta?", "¿Dos semanas? ¿Qué tal un mes?", "Trato hecho.", "Nos vemos el lunes.", "Mejor otro día.",
    ], expect: { complete: true, state: { outcome: "deal", offer: "final" } }, auto: AUTO, setup: SIM(false, false, "coffee") },
    // Her charts run out by themselves, but the learner asks for the floor politely later: the item ticks after all.
    { name: "a polite way in after the charts", turns: [
      "No estoy muy seguro de eso.", "Ok.", "Ajá.", "Sí.", "Todavía no la hemos probado.", "Perdón, ¿puedo interrumpir un momento?",
      "Es un punto válido.", "¿Y si la lanzamos como beta?", "Trato hecho.", "Nos vemos el lunes.", "Mejor otro día.",
    ], expect: { complete: true, state: { outcome: "deal", chartsOver: true, interruptedPolite: true } }, auto: AUTO, setup: SIM(false, false, "coffee") },
    // A rude opener, then the polite way ("Perdón. Entiendo tu punto, pero…"): the first item ticks after all.
    { name: "rude first, then polite", turns: [
      "Eso es una locura.", "Perdón, ¿puedo interrumpir un momento?", "Perdón. Entiendo tu punto, pero no estoy muy de acuerdo.", "Todavía no está probada.",
      "Es un punto válido.", "¿Y si la lanzamos como beta?", "Trato hecho.", "Nos vemos el lunes.", "Mejor otro día.",
    ], expect: { complete: true, state: { outcome: "deal", rudeOpen: false } }, auto: AUTO, setup: SIM(false, false, "coffee") },
    // "¿Algún comentario? ¿No? Perfecto." – "Bueno, sí." is no agreement: "Ay, perdón. Adelante."
    { name: "any thoughts? well, yes", turns: [
      "Bueno, sí.", "No estoy muy seguro de eso.", "Perdón, ¿puedo interrumpir un momento?", "Todavía no está probada.", "Es un punto válido.",
      "¿Y si la lanzamos como beta?", "Trato hecho.", "Nos vemos el lunes.", "Mejor otro día.",
    ], expect: { complete: true, state: { outcome: "deal", agreedOnce: false } }, auto: AUTO, setup: SIM(false, false, "coffee", true) },
    // "¿Algún comentario? ¿No? Perfecto." – "No." is no objection; Gerardo's "¿Nadie tiene dudas?" – "Sí." is unclear
    // (Vanessa asks plainly; a returning player hears "¿Seguro?" and gives in at once); "Sí." to that gives in.
    { name: "any thoughts? no; then giving in", turns: ["No.", "Sí.", "Sí."],
      expect: { complete: false, state: { outcome: "gave_in", disagreed: false } }, auto: AUTO, setup: SIM(false, false, "coffee", true) },
    // "Tienes razón." to Vanessa's refusal: "¿O sea que estás de acuerdo conmigo?" – "No, estamos de acuerdo en no estar de acuerdo."
    { name: "stubborn: so you agree with me? no", turns: [
      "Con todo respeto, yo lo veo un poco diferente.", "Disculpa, Vanessa.", "Necesitamos más tiempo.", "Tiene sentido.",
      "¿Y si les avisamos a los clientes primero?", "Tienes razón.", "No, estamos de acuerdo en no estar de acuerdo.", "¡Nos vemos entonces!", "Me encantaría.",
    ], expect: { complete: true, state: { outcome: "boss" } }, auto: AUTO, setup: SIM(false, true, "coffee") },
    // Her two weeks refused ("no me funcionan" asks for more), then her three: Gerardo decides; "No, gracias" to the coffee.
    { name: "the weeks refused; no coffee", turns: [
      "No estoy muy segura de eso.", "Perdón, ¿puedo interrumpir un momento?", "Todavía no está probada.", "Es un punto válido.",
      "¿Y si la lanzamos como beta?", "Dos semanas no me funcionan.", "Tres semanas no me sirven.", "Nos vemos el lunes.", "No, gracias.",
    ], expect: { complete: true, state: { outcome: "boss", offer: "final", coffeeAnswer: "no" } }, auto: AUTO, setup: SIM(false, false, "coffee") },
    // "No, gracias" to Vanessa cutting in asks to finish; "Me parece bien, pero tres semanas" bargains; "Así está bien" accepts.
    { name: "no thanks to the twist; a yes with a counter; así está bien", turns: [
      "No estoy muy seguro de eso.", "Perdón, ¿puedo interrumpir un momento?", "Todavía no está probada.", "Es un punto válido.",
      "¿Y si la lanzamos como beta?", "No, gracias.", "Me parece bien, pero tres semanas.", "Así está bien.", "No, gracias.", "Me encantaría.",
    ], expect: { complete: true, state: { outcome: "deal", offer: "final", twistDone: true, blunt: 0, coffeeAnswer: "yes" } }, auto: AUTO, setup: SIM(true, false, "coffee") },
    // "No hay un punto medio." is said, not asked: no proposal (Gerardo asks); the question afterwards is one.
    { name: "no middle ground, then one", turns: [
      "No estoy muy seguro de eso.", "Perdón, ¿puedo interrumpir un momento?", "Todavía no está probada.", "Es un punto válido.",
      "No hay un punto medio.", "¿Podemos buscar un punto medio?", "Trato hecho.", "Nos vemos el lunes.", "Mejor otro día.",
    ], expect: { complete: true, state: { outcome: "deal", softened: true, alt: "a_mid", tries: { alternative: 2 } } }, auto: { closing: "Nos vemos el lunes.", coffee: "Mejor otro día." },
    setup: SIM(false, false, "coffee") },
    // Spain forms and a short-answer learner: vale, móvil, vosotros.
    { name: "Spain forms and short answers", turns: [
      "Tengo mis dudas.", "Perdón.", "No funciona bien en el móvil.", "Vale, es verdad.", "¿Qué os parece si la lanzamos como beta?", "Vale.",
      "Vale, nos vemos el lunes.", "Vale.",
    ], expect: { complete: true, state: { outcome: "deal", reason: "c_bugs" } }, auto: AUTO, setup: SIM(false, false, "coffee") },
    // Audit 5 Nov: a deal only on a clear yes. "Está bien, gracias" gets "¿Trato hecho?" again, "¿Solo dos semanas?" wants
    // more (her final three), "Cuatro semanas me funciona" is a counter: Gerardo decides, never below her three weeks.
    // The goodbye: "¿A qué hora?" (Gerardo: "A las nueve, como siempre."), "Está bien, gracias" to the coffee is asked.
    { name: "no yes in a polite thanks; her final three weeks; Gerardo decides", turns: [
      "No estoy muy seguro de eso.", "Perdón, ¿puedo interrumpir un momento?", "¿Y si se cae?", "¿Sesenta mil pesos al mes?", "Sí, es un problema.",
      "¿Y si arreglamos los errores primero?", "Está bien, gracias.", "¿Solo dos semanas?", "Cuatro semanas me funciona.",
      "¿A qué hora?", "Perfecto, nos vemos el lunes.", "Está bien, gracias.", "Sí, vamos.",
    ], expect: { complete: true, state: { outcome: "boss", offer: "final", reason: "c_risk", dealAgain: false, coffeeAsked: true, coffeeAnswer: "yes" } },
    auto: AUTO, setup: SIM(false, false, "coffee") },
    // "Así está bien." to "¿Qué opinas?" is no "no" ("¿Entonces? ¿Estás conmigo en esto?"). "Puede ser." twice to "¿Trato
    // hecho?": no deal; Gerardo decides (two weeks, her compromise). Training as the proposal.
    { name: "maybe is no yes: Gerardo decides", turns: [
      "Así está bien.", "Con todo respeto, yo lo veo un poco diferente.", "Perdón, ¿puedo interrumpir un momento?", "Muchos de nuestros clientes tienen más de sesenta años.",
      "Es un punto válido.", "¿Y si capacitamos primero al equipo de soporte?", "Puede ser.", "Puede ser.", "Nos vemos el lunes.", "Yo diría verdes.", "Turquesa.",
    ], expect: { complete: true, state: { outcome: "boss", offer: "half", dealAgain: true, alt: "a_train" } }, auto: AUTO, setup: SIM(false, false, "teal") },
    // Vanessa refuses: "Tienes razón." – "¿O sea que estás de acuerdo conmigo?" – "Puede ser." is no giving in ("¿Entonces?
    // ¿Estás conmigo en esto?"); then agree to disagree. "Gracias." to the coffee is asked, and "Mejor otro día." declines.
    { name: "stubborn: maybe is no giving in; thanks to the coffee", turns: [
      "No estoy muy segura de eso.", "Perdón que te interrumpa, pero cuatro días no son suficientes.", "Buen punto.", "¿Y si dejamos la página vieja un mes más?",
      "Tienes razón.", "Puede ser.", "No, cada quien con su opinión.", "Nos vemos el lunes.", "Gracias.", "Mejor otro día.",
    ], expect: { complete: true, state: { outcome: "boss", soAgain: true, coffeeAsked: true, coffeeAnswer: "no" } }, auto: AUTO, setup: SIM(false, true, "coffee") },
    // Asking about the old site first, a proposal before the problem ("Espera. Primero, ¿cuál es el problema?"), vague
    // problems ("Hay un problema." / "Es complicado."), then the customers; the proposal made early is answered later.
    { name: "the old site first; a proposal before the problem; vague problems", turns: [
      "¿Y qué pasa con la página vieja?", "Tengo algunas dudas sobre el viernes.", "Perdón, ¿me permites un segundo?", "¿Y si la lanzamos como beta?",
      "Hay un problema.", "Es complicado.", "Los clientes se van a confundir.", "Tienes razón en lo del costo.", "Sí, dos semanas.", "Nos vemos el lunes.", "Me encantaría.",
    ], expect: { complete: true, state: { outcome: "deal", offer: "half", reason: "c_cust" } }, auto: AUTO, setup: SIM(false, false, "coffee") },
    // Her three weeks echoed ("¿Tres semanas?") get "¿Trato hecho?"; "Sí, tres semanas." is the deal. "¿A las nueve?" at the end.
    { name: "her final offer echoed, then a clear yes", turns: [
      "Yo no estaría tan seguro.", "Disculpa, ¿puedo agregar algo?", "Todavía hay errores en la página nueva.", "Tiene sentido.",
      "Hagamos una prueba piloto con algunos clientes.", "¿Y si dejamos la página vieja un mes?", "¿Tres semanas?", "Sí, tres semanas.",
      "¿A las nueve?", "Sí, a las nueve.", "Yo diría verdes.", "Turquesa.",
    ], expect: { complete: true, state: { outcome: "deal", offer: "final", dealAgain: true } }, auto: AUTO, setup: SIM(false, false, "teal") },
  ],
};

export default meeting;
