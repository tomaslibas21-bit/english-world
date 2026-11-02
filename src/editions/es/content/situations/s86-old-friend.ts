// NEEDS: src/editions/es/convo/lang.ts PART_VERBS: "trabajo", "vivo", "soy" can't start a new part after a negative one,
// so "No me casé. Trabajo en un hotel." is not understood (each half alone is). The rest is local.
// Song 86 "Long Time No See" → Puerto Colibrí: "¡Cuánto tiempo!"
// Paola (tú), the Mexican exchange student who spent a year at the learner's high school back home, spots the
// learner in the zócalo. She has moved back to Puerto Colibrí. They catch up both ways: "¡No has cambiado nada!",
// "¿Cómo has estado?", "¿Qué es de tu vida?" (work, a move, learning Spanish, a wedding, kids), her news (she got
// married and has twins: "cuates" in Mexico), the family, Memo (the other Mexican exchange student, who now has a
// restaurant on the malecón: unnamed and not a seafood place, so it never clashes with El Muelle), maybe a coffee at Café La Ceiba on the square, and "¿Me pasas tu número?".
// Reciprocity as in the English: Paola asks, the learner answers and may ask back ("¿Y tú?"), Paola answers.
// Twists (later visits, as in the English): Paola is in a hurry (lunch with her husband at two: "la comida", Mexico's
// main meal), she can't stay for the coffee the learner offers ("¡Otro día, sin falta!"), and she suggests dinner
// at Memo's place on Friday.
// Mexican words with a neutral twin: no inventes (no puede ser), padre (bien), cuates (gemelos), ahorita / va (ahora /
// muy bien). Phone numbers: ten digits, said in groups and pairs ("nueve ocho cuatro, uno dos tres, cuarenta y
// cinco…"); the example uses Quintana Roo's 984 area code, the rest of the number is made up.
//
// The learner's gender: {m:…|f:…}; Paola's: {sm:…|sf:…} (she is female). The learner may say usted to her: understood,
// with a short tip (#tip:usted_friend).

import type { Ctx, Handler, Pending, Segment, SituationDef } from "@/content/types";
import { t } from "@/content/dsl";
import { GLOBAL_HANDLERS, LEAVING_PATTERNS } from "@/content/global";

// ---------------------------------------------------------------------------
// Flags used more than once

const ART_TIME = "The article before a clock time has no English word.";
const COMER = "comer: in Mexico, to have lunch (la comida, the main meal, around two).";
const QUE_CUENTAS = "¿Qué cuentas?: “what's new?” (contar = to tell).";
const PADRE = "Mexican, casual: padre = cool, great.";
const DE_EL = "acordarse de: to remember; de has no English word here.";

// ---------------------------------------------------------------------------
// Helpers

type News = "hard" | "married" | "kids" | "moved" | "vacation" | "job" | "retired" | "spanish" | "usual";
const NEWS_ORDER: News[] = ["hard", "married", "kids", "moved", "vacation", "job", "retired", "spanish", "usual"];

const fold = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const heard = (c: Ctx) => fold(c.heard);
const turnId = (c: Ctx) => ((c as any).conv?.history?.length ?? 0) + "|" + c.heard;
function once(c: Ctx, key: string): boolean {
  const k = key + "@" + turnId(c);
  const seen: string[] = (c.s.__once ||= []);
  if (seen.includes(k)) return false;
  seen.push(k);
  if (seen.length > 30) seen.shift();
  return true;
}
/** The goal is reached. Optional checklist items still open at this moment leave the list. */
function win(c: Ctx) { c.s.goalMet = true; c.complete(); }
const asked = (c: Ctx, id: string) => (c.s.asks?.[id] ?? 0) as number;
const bump = (c: Ctx, id: string) => { c.s.asks ||= {}; c.s.asks[id] = asked(c, id) + 1; };
const hi = (c: Ctx) => { c.s.greeted = true; };
const askedBack = (seg: Segment) => seg.tags.includes("askback");

/** Pending questions: "Sí, claro" / "¡Buena idea!" count as yes, "No, perdón" as no. */
function yn(p: Pending): Pending {
  const on = { ...(p.on || {}) };
  if (p.yes && !on.agree) on.agree = (cc) => { p.yes!(cc); };
  if (p.yes && !on.g_ok) on.g_ok = (cc) => { p.yes!(cc); };
  if (p.no && !on.no_sorry) on.no_sorry = (cc) => { p.no!(cc); };
  return { ...p, on };
}
function stepYes(c: Ctx) { const st = oldFriend.steps.find((x) => x.id === c.step); if (st?.yes && !st.done(c)) st.yes(c); }
function stepNo(c: Ctx) { const st = oldFriend.steps.find((x) => x.id === c.step); if (st?.no && !st.done(c)) st.no(c); }

// The learner's news in the whole sentence (several pieces may carry one each). A negated piece ("No me casé, pero…",
// "no tengo hijos") is cut out first, so it never brings a "¡Felicidades!".
const NEWS_RE: Record<News, RegExp> = {
  married: /\b(me case|nos casamos|estoy casad[oa]|me comprometi|estoy comprometid[oa]|me voy a casar|me caso)\b/,
  kids: /\b(tengo|tenemos|tuve|tuvimos) (un |una |dos |tres |cuatro |\d+ )?(hijos?|hijas?|bebes?|gemelos|gemelas|cuates|ninos|ninas|nino|nina)\b|\b(soy|ya soy) (papa|mama|abuel[oa])\b/,
  moved: /\b(me mude|nos mudamos|me vine|nos vinimos|me cambie|vivo aqui|ahora vivo|estoy viviendo aqui|vivo en puerto colibri)\b/,
  job: /\b(trabajo nuevo|nuevo trabajo|chamba nueva|trabajo (en|como|de)|estoy trabajando|soy (enfermer|maestr|profesor|ingenier|doctor|cociner|meser|contador|chofer|programador))/,
  spanish: /\b(aprendiendo|aprendo|estudiando|estudio) espanol\b|\bclases de espanol\b/,
  vacation: /\bde (vacaciones|visita|viaje)\b/,
  retired: /\b(jubilad[oa]|me jubile|retirad[oa]|me retire)\b/,
  hard: /\b(me divorcie|me separe|perdi mi trabajo|me quede sin trabajo|estuve enferm[oa])\b/,
  usual: /\b(nada nuevo|lo de siempre|lo mismo|nada especial|no mucho|puro trabajo|pura chamba)\b/,
};
const NEGATED = /\b(no|nunca|todavia no|aun no)( (me|te|se|lo|la|le|nos))? \w+( \w+)?/g;
function newsIn(h: string): News[] {
  const plain = h.replace(NEGATED, " ");
  return NEWS_ORDER.filter((k) => NEWS_RE[k].test(k === "usual" ? h : plain));
}

/** Paola's side of a topic, told once. */
function tell(c: Ctx, topic: "been" | "news" | "family") {
  if (c.s.told[topic]) return;
  c.s.told[topic] = true;
  c.s.toldTurn = turnId(c);
  if (topic === "been") c.say("own_been");
  // "…¡Me casé!": wait for the learner's reaction before "¡Gracias! Y… ¡tenemos cuates!"
  // (if the learner just said "Me casé", hers is "¡Yo también me casé!")
  else if (topic === "news") { c.s.lucy1 = true; c.say(c.s.learnerWed ? "lucy_news1_too" : "lucy_news1"); c.hold(); }
  else c.say("own_family");
}

/** She asked, the learner answered (the handler reacts first, then tells hers if asked back). */
function answered(c: Ctx, topic: "been" | "news" | "family") {
  hi(c);
  c.s.ans[topic] = true;
  c.s.lastTopic = topic;
}

// Automatic answers the simulation uses for Paola's optional questions.
const NUMBER = "¡Claro! Mi número es 984 123 4567.";
const AUTO: Record<string, string> = {
  family: "¡Todos bien, gracias!", mike: "¡Claro! ¿Cómo está?", coffee: "¡Claro, me encantaría!", mike_dinner: "¡Me encantaría!",
  numbers: NUMBER, closing: "¡Igualmente! ¡Adiós!", rush: NUMBER, number_bye: NUMBER, howareyou: "Bien, gracias.",
};
/** A first visit: no twist. */
const PLAIN = (s: Record<string, any>) => { s.cantCoffee = false; s.rushTwist = false; s.mikeDinnerTwist = false; };

// ---------------------------------------------------------------------------
// Handlers

const H: Record<string, Handler> = {
  voc(c) { hi(c); },
  greet(c, _slots, seg) {
    hi(c);
    if (seg.tags.includes("itsme") && once(c, "itsme")) c.say("it_is_you");
  },
  who_are_you(c) {
    hi(c);
    if (once(c, "who")) c.say("its_me_lucy");
    // she just said who she is: no "¡Oye, soy yo!" right after it
    c.s.greeted = false; c.s.skipAsk = true;
  },
  g_hello(c) { if (!c.s.greeted) { hi(c); return; } GLOBAL_HANDLERS.g_hello(c as any, {}); },
  compliment_back(c) {
    hi(c);
    if (!once(c, "compl")) return;
    c.say(c.s.changedSaid && !c.s.complBack ? "i_wish" : "aw_thanks");
    c.s.complBack = true;
  },
  // "¡Cómo crees!", "Ojalá": the learner plays the compliment down
  modest_ctx(c) {
    hi(c);
    if (!once(c, "compl")) return;
    c.say(c.s.complBack ? "aw_thanks" : "insist");
    c.s.complBack = true;
  },
  // how have you been
  been_ans(c, _slots, seg) {
    answered(c, "been");
    if (!once(c, "been")) return;
    // "Más o menos" is no bad news: a lighter "Bueno… ¡ya vendrán tiempos mejores!"
    const soSo = /\b(mas o menos|regular|altibajos|asi asi)\b/.test(heard(c)) && !/\b(enferm|hospital|murio|fallecio|perdi|divorci|separe|dificil|duro)/.test(heard(c));
    if (seg.tags.includes("bad")) c.say(soSo ? "so_so" : "sorry_to_hear");
    else if (!askedBack(seg)) c.say("glad");
    if (askedBack(seg)) tell(c, "been");
  },
  ask_been(c) {
    hi(c);
    c.s.lastTopic = "been";
    tell(c, "been");
    if (!c.s.ans.been) { c.s.askBackShort = "been"; c.ask("howbeen"); }
  },
  g_howareyou(c) { H.ask_been(c, {}, { intent: "ask_been", slots: {}, tags: [] }); },
  g_howareyou_answer(c, slots) {
    H.been_ans(c, slots, { intent: "been_ans", slots, tags: /\b(tu|ti|usted)\b/.test(heard(c)) ? ["askback"] : [] });
  },
  g_howareyou_bad(c, slots) { H.been_ans(c, slots, { intent: "been_ans", slots, tags: ["bad"] }); },
  // what have you been up to
  news(c, _slots, seg) {
    answered(c, "news");
    const kinds = [...seg.tags.filter((x) => (NEWS_ORDER as string[]).includes(x)) as News[], ...newsIn(heard(c))];
    for (const k of kinds) c.s.newsList = [...new Set([...(c.s.newsList || []), k])];
    // "Me casé" gets "¡Yo también!"; "Me voy a casar" (not yet) doesn't
    if (/\b(me case|ya me case|nos casamos|estoy casad[oa])\b/.test(heard(c).replace(NEGATED, " "))) c.s.learnerWed = true;
    c.s.newsTold = true;
    if (!once(c, "news")) return;
    const list = (c.s.newsList || []) as News[];
    const many = list.filter((k) => k !== "usual").length > 1 && !c.s.manySaid;
    const top = NEWS_ORDER.find((k) => list.includes(k) && !c.s.reacted?.[k]);
    if (many) { c.s.manySaid = true; c.say("so_much_news"); }
    // "Tengo un trabajo nuevo" gets a "¡Felicidades!"; "Trabajo como maestra" doesn't
    const line = top === "job" && !/\b(nuev[oa]|consegui|encontre)\b/.test(heard(c)) ? "react_work" : top === "usual" && c.s.told.news ? "react_usual2" : "react_" + top;
    if (top) { c.s.reacted = { ...(c.s.reacted || {}), [top]: true }; c.say(line); }
    if (askedBack(seg)) tell(c, "news");
  },
  news_not(c, _slots, seg) {
    answered(c, "news");
    c.s.newsTold = true;
    // "No me casé, pero tengo un trabajo nuevo": the news piece reacts; alone, a quiet "Ah, ya veo."
    if (!newsIn(heard(c)).length && once(c, "news")) c.say(seg.tags.includes("looking") ? "so_so" : "react_not");
    if (askedBack(seg)) tell(c, "news");
  },
  ask_news(c) {
    hi(c);
    c.s.lastTopic = "news";
    if (c.s.told.news) { if (c.s.lucy2 && once(c, "told")) c.say("that_is_my_news"); return; }
    tell(c, "news");
    c.hold(); // let the learner react to "¡Me casé!"
  },
  react_news(c, _slots, seg) {
    hi(c);
    // "¿Quién es el afortunado?", "¿Cuántos años tienen?": a question gets its answer, not a "¡Gracias!"
    const q = seg.tags.find((x) => x.startsWith("q_"));
    if (!c.s.lucy1) { if (once(c, "react")) c.say("aw_thanks"); return; }
    if (!c.s.lucy2) {
      // questions about the wedding are answered now; the twins' questions wait for the twins
      const asks = !!q && ["q_who", "q_photo", "q_when", "q_invite"].includes(q);
      if (asks && once(c, "q")) c.say("ans_" + q!.slice(2));
      c.s.lucy2 = true; c.say(asks ? "lucy_news2_plain" : "lucy_news2"); c.hold(); return;
    }
    if (q) { if (once(c, "q")) { c.s.newsReacted = true; c.say(q === "q_photo" ? "ans_photo2" : "ans_" + q.slice(2)); } return; }
    if (!once(c, "react") || c.s.newsReacted) return;
    c.s.newsReacted = true;
    c.say("so_happy");
  },
  family_ans(c, _slots, seg) {
    answered(c, "family");
    if (!once(c, "fam")) return;
    c.say(seg.tags.includes("bad") ? "sorry_to_hear" : seg.tags.includes("far") ? "family_far" : "say_hi_to_them");
    if (askedBack(seg)) tell(c, "family");
  },
  ask_family(c) { hi(c); c.s.lastTopic = "family"; tell(c, "family"); },
  and_you(c) {
    hi(c);
    const tp = c.s.lastTopic as "been" | "news" | "family" | undefined;
    if (tp && !c.s.told[tp]) { tell(c, tp); return; }
    if (c.s.toldTurn === turnId(c)) return;
    if (!c.s.told.news) { tell(c, "news"); return; }
    if (once(c, "andyou")) c.say("same_old");
  },
  // Memo
  mike_yes(c) {
    hi(c);
    if (c.s.mikeSaid) { stepYes(c); return; } // she already told the news about Memo
    c.s.mike = "yes";
    if (once(c, "mike")) mikeNews(c);
  },
  mike_no(c) {
    hi(c);
    if (c.s.mikeHint) { c.s.mike = "no"; if (once(c, "mike")) mikeNews(c); return; }
    c.s.mikeHint = true;
    if (once(c, "mike")) c.say("mike_hint");
    c.hold(); // the hint is the question: no second "¿Alto…?" from the step
  },
  mike_who_ctx(c, slots, seg) { H.mike_no(c, slots, seg); },
  ask_mike(c) { hi(c); c.s.mike = "asked"; if (once(c, "mike")) mikeNews(c); },
  good_idea(c, slots, seg) {
    hi(c);
    // "No el viernes, el sábado", "Quedamos el sábado": yes, on another day
    const other = seg.tags.includes("otherday") || (seg.tags.includes("dayset") && slots.day !== "friday");
    if (c.s.mikeDinnerAsked && !c.s.mikeDinner) { c.s.mikeDinner = "yes"; if (once(c, "idea")) c.say(other ? "dinner_other_day" : "ill_ask_him"); return; }
    // "¿Qué tal mañana?" to her coffee: another day, nothing now
    if (seg.tags.includes("otherday") || seg.tags.includes("dayset")) {
      if (c.step === "coffee" && !c.s.coffee) { c.s.coffee = "later"; if (once(c, "coffee")) c.say("coffee_later"); }
      return;
    }
    if (c.s.mikeSaid && !c.s.ideaOk) { c.s.ideaOk = true; if (once(c, "idea")) c.say("ill_ask_him"); return; }
    stepYes(c);
  },
  // "¿A qué hora?", "¿Dónde está?" at her dinner idea: interested, so a yes
  dinner_ask_ctx(c, _slots, seg) {
    hi(c);
    if (!c.s.mikeDinnerAsked || (c.s.mikeDinner && c.s.mikeDinner !== "yes") || c.s.dinnerAnswered) return;
    c.s.mikeDinner = "yes"; c.s.dinnerAnswered = true;
    c.say(seg.tags.includes("where") ? "dinner_where" : "dinner_when");
  },
  // "¿Dónde?", "¿En La Ceiba?" at her coffee question: a yes
  coffee_where_ctx(c) { hi(c); if (!c.s.coffee) { c.s.coffee = "yes"; if (once(c, "coffee")) c.say("lets_sit"); } },
  // coffee
  coffee_invite(c) {
    hi(c);
    // "Mejor otro día… Bueno, sí, vamos por un café": a change of mind is welcome (unless she has to go)
    if (c.s.coffee === "no" && c.s.coffeeAsked && !c.s.rushing) { c.s.coffee = "yes"; if (once(c, "coffee")) c.say("changed_mind"); return; }
    if (c.s.coffee) { if (once(c, "coffee")) c.say(c.s.coffee === "yes" ? "we_are" : "next_time"); return; }
    if (c.s.rushing || c.s.cantCoffee) { c.s.coffee = "no"; c.twist("rain_check"); if (once(c, "coffee")) c.say("rain_check"); return; }
    c.s.coffee = "yes";
    if (once(c, "coffee")) c.say("lets_sit");
  },
  decline(c, slots, seg) {
    hi(c);
    const why = seg.tags.includes("nocoffee") ? "no_coffee_ok" : seg.tags.includes("maybe") ? "you_tell_me" : "next_time";
    if (c.step === "coffee" && !c.s.coffee) { c.s.coffee = "no"; if (once(c, "decl")) c.say(why); return; }
    // (the dinner at Memo's is a pending question, not a step)
    if (c.s.mikeDinnerAsked && !c.s.mikeDinner) {
      c.s.mikeDinner = seg.tags.includes("maybe") ? "maybe" : "no";
      if (once(c, "decl")) c.say(seg.tags.includes("maybe") ? "you_tell_me" : "next_time");
      return;
    }
    // "No sé" to "¿Te acuerdas de Memo?": not sure, so the hint
    if (seg.tags.includes("maybe") && c.step === "mike" && !c.s.mikeSaid) { H.mike_no(c, slots, seg); return; }
    if (seg.tags.includes("maybe")) return; // "Tal vez" with nothing open: no answer to give
    // "Perdón, me tengo que ir." with no invitation open: leaving, as with the shared leaving phrases
    if (/\b(me tengo que ir|tengo que irme|ya me voy|me voy)\b/.test(heard(c))) { H.g_bye(c, slots, seg); return; }
    stepNo(c);
  },
  // numbers
  keep_in_touch(c) {
    hi(c);
    c.s.touch = true;
    if (c.s.contact) { if (once(c, "touch")) c.say("definitely"); return; }
    if (once(c, "touch")) c.say("definitely_number");
    c.s.numberAsked = true;
    c.hold(); // she just asked for the number: no second "¿Cuál es tu número?"
  },
  number_ctx(c) {
    hi(c);
    c.s.contact = true; c.s.touch = true;
    if (once(c, "num")) c.say("got_it_text");
  },
  give_phone(c) {
    hi(c);
    c.s.contact = true; c.s.touch = true;
    // "Toma mi celular": she types her number into it; "Te paso mi número": she'll text
    const handed = /\b(toma|ten|aqui tienes|aqui esta|ahi esta|dame tu)\b/.test(heard(c)) && !/\bnumero\b/.test(heard(c));
    if (once(c, "num")) c.say(handed ? "typed_number" : "typing_number");
  },
  no_whats(c) {
    hi(c);
    // "No tengo WhatsApp, pero te doy mi número": the number piece answers
    if (/\b(numero|celular|cel|telefono|te doy|te paso|toma|ten)\b/.test(heard(c))) return;
    if (once(c, "whats")) c.say("no_whats_ok");
    c.hold();
  },
  hand_phone_ctx(c, slots, seg) { H.give_phone(c, slots, seg); },
  // "No tengo celular de aquí": she gives hers instead
  no_phone(c) {
    hi(c);
    c.s.contact = true; c.s.touch = true;
    if (once(c, "num")) c.say("no_phone_ok");
  },
  ask_number(c) {
    hi(c);
    c.s.touch = true; c.s.contact = true;
    if (once(c, "num")) c.say("give_me_your_phone");
  },
  // the end
  nice_to_see(c) {
    hi(c);
    if (c.s.byeSaid || c.s.__finished) { closeBye(c); return; }
    if (once(c, "nice")) c.say("you_too_lucy");
  },
  say_hi_to(c) { hi(c); c.s.saidHi = true; if (once(c, "sayhi")) c.say("i_will"); },
  you_too(c) {
    hi(c);
    if (c.s.__finished) { closeBye(c); return; }
    if (c.s.changedSaid && !c.s.complBack) { c.s.complBack = true; if (once(c, "compl")) c.say("i_wish"); }
  },
  // "¡Gracias!" for a compliment or good wishes needs no "¡De nada!": Paola just goes on.
  g_thanks(c) { hi(c); if (c.s.changedSaid) c.s.complBack = true; },
  g_ok(c) { hi(c); stepYes(c); },
  agree(c, _slots, seg) {
    hi(c);
    // "Mejor otro día." … "Bueno, sí, un café rápido": the coffee after all
    if (c.s.coffee === "no" && c.s.coffeeAsked && !c.s.rushing && /\b(cafe|cafecito|vamos|minutos)\b/.test(heard(c))) {
      c.s.coffee = "yes"; if (once(c, "coffee")) c.say("changed_mind"); return;
    }
    // "Mejor un jugo": yes, something else
    if (seg.tags.includes("alt") && c.step === "coffee" && !c.s.coffee) { c.s.coffee = "yes"; if (once(c, "coffee")) c.say("alt_ok"); return; }
    stepYes(c);
  },
  no_sorry(c) { hi(c); stepNo(c); },
  g_bye(c) {
    hi(c);
    if (!c.s.contact && !c.s.byeWarned) {
      c.s.byeWarned = true; c.s.numberAsked = true;
      c.say("wait_number");
      // Paola waits for the number (no other question after it), then lets the learner go
      const thenBye = (h: Handler): Handler => (cc, sl, sg) => { h(cc, sl, sg); if (cc.s.contact) closeBye(cc); };
      c.expect({
        id: "number_bye", optional: true, expects: ["number_ctx", "give_phone", "ask_number", "keep_in_touch", "hand_phone_ctx", "no_phone"], hints: ["touch"],
        suggest: [{ lt: "Give her your number", hint: "touch" }],
        on: { number_ctx: thenBye(H.number_ctx), give_phone: thenBye(H.give_phone), ask_number: thenBye(H.ask_number), hand_phone_ctx: thenBye(H.give_phone), no_phone: thenBye(H.no_phone) },
      });
      return;
    }
    if (c.s.contact && c.s.newsTold) win(c);
    closeBye(c);
  },
};

function mikeNews(c: Ctx) {
  c.s.mikeSaid = true;
  c.say("mike_restaurant");
  if (c.s.mikeDinnerTwist && !c.s.mikeDinnerAsked) {
    c.s.mikeDinnerAsked = true; c.twist("mike_dinner");
    c.say("mike_dinner_q");
    c.expect(yn({
      id: "mike_dinner", expects: ["good_idea", "decline", "dinner_ask_ctx"], hints: ["plan_answer"],
      suggest: [{ lt: "Say yes to dinner (or not)", hint: "plan_answer" }],
      // "Sí, ¿a qué hora?": the question piece answers (dinner_ask_ctx)
      yes: (cc) => { cc.s.mikeDinner = "yes"; if (!/\b(que hora|donde)\b/.test(heard(cc))) cc.say("ill_ask_him"); },
      no: (cc) => { cc.s.mikeDinner = "no"; cc.say("next_time"); },
      on: { good_idea: (cc, sl, sg) => H.good_idea(cc, sl, sg), decline: (cc, sl, sg) => H.decline(cc, sl, sg), mike_yes: (cc) => { cc.s.mikeDinner = "yes"; cc.say("ill_ask_him"); } },
      ask: (cc) => cc.say("mike_dinner_again"),
    }));
    return;
  }
  c.say("we_should_go");
}

function closeBye(c: Ctx) {
  if (c.s.byeDone) return;
  c.s.byeDone = true;
  if (c.s.contact && c.s.newsTold) win(c);
  // after "¡Saludos a tu familia!" she doesn't send the same greetings back
  // going for coffee together: "¡Adiós!" gets a laugh, not a goodbye
  if (c.s.coffee === "yes") c.say(/\b(adios|bye|hasta luego|hasta pronto|cuidate|chao|nos vemos)\b/.test(heard(c)) ? "bye_coffee_joke" : "bye_coffee");
  else c.say(c.s.saidHi ? "bye_short" : "bye_lucy");
  c.end();
}

// ---------------------------------------------------------------------------

export const oldFriend: SituationDef = {
  id: "s86-old-friend",
  song: 86,
  songTitle: "Long Time No See",
  title: { en: "¡Cuánto tiempo!", lt: "Long Time No See" },
  topic: { en: "Una vieja amiga", lt: "Catching up with an old friend" },
  chapter: 5,
  order: 3,
  location: "town-square",
  npc: "lucy",
  goal: "Catch up with Paola, an old friend: tell her your news and swap numbers.",
  intro: "Someone calls out to you in the zócalo: it's Paola, the Mexican exchange student who spent a year at your high school back home. She lives in Puerto Colibrí again, and you haven't seen each other in years!",

  grammar: {
    macros: {
      v: "[(paola | pao)]",
      ab: "(y tu | y a ti | y tu como estas | y tu como has estado | y tu que tal | y a ti como te va | y a ti que tal | tu como estas | y tu que cuentas | y usted #tip:usted_friend | y usted como esta #tip:usted_friend) #askback",
      omg: "(no puede ser | no inventes | no manches | no me digas | wow | guau | uy | dios mio | ay dios mio | en serio | de veras | de verdad | que barbaro | orale)",
      ago: "[(el ano pasado | el mes pasado | la semana pasada | el verano pasado | la primavera pasada | el otono pasado | el invierno pasado | hace (un | una | dos | tres | cuatro | cinco | seis | unos | pocos | {number}) (anos | ano | meses | mes | semanas | semana | dias) | este ano | hace poco | recien | en (enero | febrero | marzo | abril | mayo | junio | julio | agosto | septiembre | octubre | noviembre | diciembre))]",
      sorry: "[(perdon | lo siento | disculpa | ay | uy | una disculpa | lo siento mucho | perdoname)]",
      job: "(enfermero | enfermera | maestro | maestra | profesor | profesora | chofer | cocinero | cocinera | ingeniero | ingeniera | programador | programadora | mesero | mesera | gerente | doctor | doctora | medico | medica | mecanico | mecanica | contador | contadora | disenador | disenadora | fotografo | fotografa | electricista | estilista | chef | abogado | abogada | arquitecto | arquitecta | vendedor | vendedora | recepcionista | carpintero | albanil | nana | ninera)",
      place: "(un hospital | una escuela | un restaurante | un hotel | un banco | una tienda | una oficina | un cafe | una farmacia | una clinica | una fabrica | linea clara | brotecito | una agencia | una empresa)",
      home: "(estados unidos | canada | inglaterra | irlanda | australia | nueva zelanda | escocia | el reino unido | mi pais | mi tierra | casa)",
      here: "(aqui | aca | para aca | a puerto colibri | a mexico | a este pueblo | al pueblo)",
      good: "(bien | muy bien | super bien | bastante bien | rebien | de maravilla | excelente | genial | increible | contento | contenta | muy contento | muy contenta | feliz | muy feliz)",
      look: "(muy bien | super bien | bien | increible | genial | guapisima | guapa | guapo | bonita | bellisima | hermosa | preciosa | fantastica | divina | igual | igualita | igualito | joven | mas joven | regia)",
      bad_word: "(mas o menos | regular | no muy bien | no tan bien | mal | nada bien | no tan bien la verdad | con altibajos | de altibajos)",
      since: "(enero | febrero | marzo | abril | mayo | junio | julio | agosto | septiembre | octubre | noviembre | diciembre | el ano pasado | hace (un | una | dos | tres | unos | {number}) (anos | ano | meses | mes))",
      kids: "(un hijo | una hija | un bebe | una bebe | un nino | una nina | gemelos | gemelas | cuates | hijos | hijas | ninos | {number} (hijos | hijas | ninos | ninas))",
    },
    slots: {},
  },

  intents: {
    voc: { patterns: ["(paola | pao)"] },
    greet: { patterns: [
      "@v cuanto tiempo [sin verte | sin vernos] [@v] #h:gr_long_time", "@v (que | vaya) (sorpresa | sorpresota | casualidad) [verte | verte aqui | encontrarte] [@v] #h:gr_surprise", "@v que milagro [@v] #h:gr_miracle",
      "@omg [@v] [eres tu] [@v]", "[si] soy yo [@v] #itsme #h:gr_its_me", "[si] (soy yo | si soy yo) {name} #itsme",
      "@v que (gusto | alegria | bueno | padre) [verte | de verte | encontrarte | volver a verte] [otra vez | de nuevo] [@v] #h:gr_good_to_see",
      "cuantos anos [sin verte | sin vernos] [@v] #h:gr_forever", "hace (anos | muchos anos | mucho | muchisimo | siglos | un monton | mil anos | mucho tiempo) [que no nos vemos | sin vernos | que no te veo] [@v]",
      "(cuantos | tantos | diez | cinco | quince | veinte | {number}) anos [que no nos vemos] [@omg]", "tanto tiempo [sin verte]",
      "no lo puedo creer [@v]", "[@omg] [@v] (eres tu | de veras eres tu | de verdad eres tu | en serio eres tu) [@v]", "eres tu [@v] [verdad]",
      "(si | claro | claro que si) me acuerdo de ti #itsme", "claro que me acuerdo [de ti] #itsme", "como no me voy a acordar [de ti] #itsme", "(te acuerdas | si te acuerdas) de mi #itsme",
      "[@omg] que (haces | estas haciendo) (aqui | por aqui | por aca) [@v]", "(cuanto tiempo | cuantos anos) (ha pasado | han pasado)",
      "[@v] (de | la de) la (escuela | prepa | secundaria | preparatoria) [verdad]", "[@v] la (del intercambio | de intercambio | mexicana del intercambio) [verdad]",
      "no te reconoci [al principio] [estas (muy)? (cambiada | diferente)]", "casi no te reconozco", "[oye] yo te conozco [@v]",
      "que (pequeno | chiquito | chico) es el mundo", "(el mundo es un panuelo | mundo chico)",
    ] },
    who_are_you: { patterns: [
      "[perdon | disculpa | disculpe] quien eres", "[perdon | disculpa] (te conozco | nos conocemos) [de algun lado | de antes | de donde]", "[perdon] no te (conozco | recuerdo | reconozco)",
      "[perdon] no me acuerdo de ti", "[perdon] quien es usted #tip:usted_friend", "[perdon] de donde (te conozco | nos conocemos)", "[perdon] me (confundes | estas confundiendo)",
      "[perdon] la verdad no te (recuerdo | reconozco)", "[perdon] no se quien eres",
    ] },
    compliment_back: { patterns: [
      "tu tampoco [has cambiado] [nada] #h:cm_neither", "(tampoco tu | ni tu | tu tampoco) [has cambiado] [nada]", "tu (no has cambiado | estas igual | estas igualita) [nada] [tampoco]",
      "(tu tampoco | ni tu | tu tambien) [has cambiado] [nada] [tu] (estas | te ves) @look", "[gracias] [tu] [tambien] te ves @look #h:cm_look", "(tu tambien | tu) estas @look", "estas @look [tu tambien] [@v]",
      "[ay] (gracias | muchas gracias) (tu tambien | igualmente | tu) te ves @look", "[ay] que (linda | amable | buena onda) [eres]", "(tu | usted) (sigues | sigue) igual #tip:usted_friend",
      "tu (no has cambiado | estas igualita) (para nada | nada)", "[tu] estas (mas | todavia mas) (guapa | guapo | bonita | joven | delgada | delgado | linda)",
    ] },
    // "¡Cómo crees!", "Ojalá", "Estoy más viejo": playing the compliment down, only at her compliment
    modest_ctx: { patterns: [
      "(como crees | ojala | ya quisiera | que va | no es cierto | no es verdad | mentirosa | mentiroso | para nada | ay como crees)",
      "[no] (estoy | ya estoy) (mas)? (viejo | vieja | gordo | gorda | canoso | canosa | viejito | viejita | calvo | calva)", "[no] (he cambiado | cambié) (mucho | bastante)",
    ] },
    you_too: { patterns: ["[gracias] tu tambien [@v] #h:cm_you_too", "(igualmente | lo mismo digo)", "[gracias] usted tambien #tip:usted_friend"] },
    been_ans: { patterns: [
      "[he estado | estoy] @good [gracias] [@ab] #h:bn_good", "[he estado | estoy] @good [la verdad] [gracias] [por preguntar] [@ab]",
      "no me quejo [@ab] #h:bn_not_bad", "no (puedo | me puedo) quejar [@ab]", "(nada mal | no tan mal | no estoy mal | sin quejas) [@ab]",
      "con mucho trabajo pero (bien | contento | contenta) [@ab] #h:bn_busy", "(bien | muy bien) pero (con mucho trabajo | muy ocupado | muy ocupada | ocupado | ocupada | cansado | cansada | un poco cansado | un poco cansada) [@ab]",
      "(muy | super)? (ocupado | ocupada | cansado | cansada) pero (bien | contento | contenta | feliz) [@ab]", "(aqui | pues aqui) (andamos | nomas | echandole ganas) [@ab]",
      "(he estado | estoy | ando) (muy | super)? (ocupado | ocupada | ocupadisimo | ocupadisima) [pero bien] [@ab]",
      "(todo | todo bien | todo muy bien | todo super bien) [por aqui] [gracias] [@ab]", "la vida (es | esta) (bien | buena | tranquila) [@ab]", "pues (bien | muy bien) [la verdad] [@ab]",
      "(estuve | estaba) (enfermo | enferma) pero ya (estoy bien | estoy mejor) [@ab]",
      "@bad_word [la verdad] [@ab] #bad", "no estoy (muy | tan)? bien [la verdad] [@ab] #bad", "(ha sido | fue) un ano (dificil | complicado | duro | pesado | raro) [la verdad] [@ab] #bad",
      "@bad_word [la verdad] mi (mama | papa | esposa | esposo | hermano | hermana) (estuvo | esta) (enferma | enfermo | en el hospital) [@ab] #bad",
      "mi (mama | papa | esposa | esposo | hermano | hermana) (estuvo | esta) (enferma | enfermo | en el hospital) [@ab] #bad",
      "@bad_word (perdí mi trabajo | me quedé sin trabajo | estuve enfermo | estuve enferma | me divorcié | me separé) [@ab] #bad",
    ] },
    ask_been: { patterns: [
      "[y] [tu] como has estado [@v] #h:bn_ask", "(como estas | como te va | como te ha ido | que tal te va | que tal te ha ido | como va todo | que tal todo | que tal la vida | que onda como estas) [@v]",
      "(y)? (tu)? como (te va | estas) [estos dias | ahora]", "(como esta usted | como ha estado) #tip:usted_friend",
    ] },
    news: { patterns: [
      "(me mudé | me vine | me cambié | nos mudamos | nos vinimos) [a vivir] [@here] [@ago] [@ab] #moved #h:nw_moved",
      "(llegué | llegamos) @here [@ago] [@ab] #moved", "(vivo | estoy viviendo | vivimos) (aqui | en puerto colibri | en el pueblo | aca) [ahora] [desde @since] [@ab] #moved", "ahora (vivo | vivimos) (aqui | aca) [@ab] #moved",
      "(mi esposa y yo | mi esposo y yo | mi pareja y yo | mi familia y yo) nos (mudamos | vinimos) [@here] [@ago] [@ab] #moved",
      "(tengo | consegui | encontre) (un trabajo nuevo | un nuevo trabajo | trabajo nuevo | chamba nueva | trabajo aqui | un trabajo aqui) [en @place] [aqui] [@ab] #job #h:nw_job",
      "(trabajo | estoy trabajando) (aqui | en el pueblo | en @place) [ahora] [@ab] #job", "(trabajo | estoy trabajando) (como | de) @job [aqui | en el pueblo | en @place] [ahora] [@ab] #job",
      "(soy | ahora soy | ya soy) @job [ahora] [aqui | en @place] [@ab] #job",
      "(estoy jubilado | estoy jubilada | ya estoy jubilado | ya estoy jubilada | me jubilé | ya me jubilé | estoy retirado | estoy retirada | me retiré) [@ago] [@ab] #retired",
      "(estoy aprendiendo | aprendo | estoy estudiando | estudio) espanol [aqui | en una escuela | en linea | con un maestro | con una maestra] [@ab] #spanish #h:nw_spanish",
      "(tomo | estoy tomando) clases de espanol [@ab] #spanish", "(todavia | aun | sigo) (estoy aprendiendo | aprendiendo) espanol [@ab] #spanish",
      "(me casé | ya me casé | nos casamos | estoy casado | estoy casada | ya estoy casado | ya estoy casada | yo tambien me casé) [@ago] [@ab] #married #h:nw_married",
      "(me comprometí | estoy comprometido | estoy comprometida) [@ago] [@ab] #married", "(me voy a casar | me caso) [pronto | este ano | el proximo ano | el ano que viene] [@ab] #married",
      "[ahora] (tengo | tenemos) @kids [de {number} anos] [y @kids] [ahora] [@ab] #kids #h:nw_kids", "(ya soy | ahora soy | soy) (papa | mama | abuelo | abuela) [ahora] [@ab] #kids",
      "(tuve | tuvimos) @kids [@ago] [@ab] #kids",
      "(vine | estoy | ando | vinimos | estamos) de (vacaciones | visita | viaje) [aqui | en puerto colibri | en mexico] [por (una semana | dos semanas | un mes | unos dias | unos meses | {number} (dias | semanas | meses))] [@ab] #vacation",
      "(estoy | vine) (aqui)? por (unos dias | una semana | dos semanas | un mes | unos meses | una temporada | el invierno) [@ab] #vacation",
      "[ya no estoy (casado | casada)] (me divorcié | me separé | perdí mi trabajo | me quedé sin trabajo | estuve enfermo | estuve enferma) [@ago] [@ab] #hard",
      "(nada nuevo | nada | nada especial | lo de siempre | lo mismo de siempre | lo mismo | pues nada | no mucho | nada del otro mundo) [la verdad] [@ab] #usual #h:nw_usual",
      "(trabajando | trabajo y casa | casa y trabajo | puro trabajo | pura chamba | nomas trabajando | solo trabajando | trabajando mucho | mucho trabajo) [@ab] #usual",
      "(pues | aqui) (nada | trabajando) [@ab] #usual", "[pues] no hay (mucho | nada) (que contar | nuevo) [@ab] #usual",
      "no (vine | estoy | estamos | vinimos) de (vacaciones | visita) (vine a vivir | vinimos a vivir | vivo | vivimos | ya vivo) aqui [@ab] #moved", "(nada nuevo | pues nada) (puro trabajo | trabajando | trabajo y casa | lo de siempre) [@ab] #usual",
      "(me mudé | me vine | nos mudamos | nos vinimos) [@here] [@ago] (por | para) (trabajo | el trabajo | un trabajo nuevo | mi trabajo | trabajar) [@ab] #moved #job",
      "(me mudé | me vine | nos mudamos | nos vinimos) [@here] [@ago] por (mi esposo | mi esposa | amor | mi familia | mis hijos | mi pareja | el clima | el mar) [@ab] #moved",
      "(me mudé | me vine | nos mudamos | nos vinimos) [@here] (por | para) (trabajo | el trabajo | trabajar) @ago [@ab] #moved #job",
    ] },
    // "No me casé, pero…", "Todavía no tengo hijos": news that isn't news (never a "¡Felicidades!")
    news_not: { patterns: [
      "[no] (no me casé | no me he casado | nunca me casé | nunca me he casado | todavia no me caso | no estoy casado | no estoy casada) [todavia] [@ab]",
      "[no] (no tengo trabajo | estoy buscando trabajo | busco trabajo | estoy sin trabajo) [todavia] [estoy buscando] [@ab] #looking",
      "(todavia no | aun no | no) (tengo | tenemos) (hijos | ninos | pareja | novio | novia | trabajo | trabajo aqui) [todavia] [@ab]",
      "(ya no trabajo | no trabajo) [aqui] [@ab]", "(no me mudé | todavia no me mudo | no vivo) aqui [todavia] [@ab]", "no (estoy | vine) de (vacaciones | visita) [@ab]",
    ] },
    ask_news: { patterns: [
      "[y] [tu] que (cuentas | me cuentas) #h:nw_ask", "[y] [tu] que es de tu vida", "[y] [tu] que (has hecho | haces) [ahora | estos dias | todo este tiempo | en todos estos anos]",
      "[y] [tu] que hay de nuevo [contigo]", "(que novedades | que hay de tu vida) [tienes]", "(sigues | todavia vives | aun vives | sigues viviendo) en (merida | cancun | la ciudad de mexico | mexico | la ciudad | el df | guadalajara | monterrey | playa del carmen | tulum)",
      "cuentame (de ti | tu | todo)", "(y)? (tu)? en que andas [ahora]", "(a que te dedicas | en que trabajas) [ahora]", "y tu vida", "y tu que onda", "(que tal | como va) tu vida",
      "(donde | en donde) vives [ahora]", "(y)? (tu)? (te casaste | ya te casaste | estas casada | tienes hijos | tienes ninos | tienes novio | ya tienes hijos)", "(vives | estas viviendo) aqui [ahora]",
    ] },
    react_news: { patterns: [
      "(felicidades | muchas felicidades | felicitaciones | enhorabuena) [a los dos | a ambos] [otra vez | de nuevo] [@v] #h:rc_congrats", "(no inventes | no manches | no me digas | no puede ser | en serio | de veras | de verdad | neta | no te creo | no lo puedo creer) [@v] [felicidades | muchas felicidades]",
      "que (buena noticia | buenas noticias | noticion | padre | bonito | maravilla | emocion | alegria | lindo | increible | genial | guay) #h:rc_great", "(que | super | muy) (bien | padre) [felicidades]", "(increible | genial | maravilloso)",
      "me da (mucho)? gusto por ti #h:rc_happy", "me alegro (mucho)? [por ti]", "(estoy | que) (muy)? (feliz | contento | contenta) por ti",
      "(wow | guau) [cuates | gemelos] [felicidades]", "(cuates | gemelos | gemelas | dos bebes) [wow | en serio | no inventes | felicidades]",
      "(ensename | muestrame | a ver) (el anillo | una foto | fotos | la foto) #q_photo", "(tienes | traes) (una foto | fotos) #q_photo", "[felicidades] (y)? quien es el afortunado #q_who", "(con quien | y con quien) [te casaste] #q_who", "(y)? como se llama (tu esposo | el) #q_who",
      "(cuando | y cuando) te casaste #q_when", "(cuates | gemelos)? [dios mio | uf] (que | eso es) mucho trabajo #q_work", "(uf | uy) mucho trabajo #q_work", "que (cansado | cansancio) #q_work",
      "(cuantos anos | cuanto) tienen #q_age", "(son)? (ninos | ninas | nino | nina) o (ninas | ninos | nino | nina) #q_sex",
      "doble (felicidades | felicitacion)", "como se llaman #q_names", "que emocion", "[y] no me invitaste #q_invite", "no (sabia | tenia idea)",
    ] },
    family_ans: { patterns: [
      "(todos | todos estan | mi familia esta | estamos | toda la familia esta) @good [gracias] [por preguntar] [@ab] #h:fm_great", "@good [gracias] [por preguntar] [@ab]",
      "mis (papas | padres | hijos | hijas | ninos | hermanos) (estan | siguen) @good [gracias] [@ab] #h:fm_parents", "mi (esposa | esposo | mama | papa | familia | hijo | hija | hermano | hermana | pareja) (esta | sigue) @good [gracias] [@ab]",
      "mi (esposa | esposo | pareja) y (mis hijos | mis hijas | los ninos | mi hijo | mi hija) (estan | siguen) @good [gracias] [@ab]",
      "(todos | mis papas | mis padres | mi familia) (siguen | estan | sigue | esta | viven | vive) en @home [@ab]", "(siguen | estan) en @home [@ab]", "(todos | mis papas | mis padres) bien [gracias] [@ab]",
      "[bien] mis (hijos | hijas | ninos) ya (estan grandes | son grandes | van a la escuela | estan en la universidad | son adolescentes) [@ab]", "[bien] mis (hijos | hijas | ninos) (estan creciendo | crecen) (mucho | muy rapido) [@ab]",
      "mi (hijo | hija) ya (esta | va) en la (universidad | escuela | prepa) [@ab]", "mis (papas | padres) ya (estan | son) (grandes | mayores | viejitos) [@ab]",
      "(bien | muy bien | todos bien) [gracias] y (la tuya | tu familia | los tuyos | tus papas | tu esposo | los cuates) #askback",
      "(no tengo familia | no tengo a nadie) aqui [@ab] #far", "(mi familia | todos) (esta | estan) (lejos | muy lejos) [@ab] #far",
      "mi (mama | papa | esposo | esposa | abuela | abuelo) (murió | falleció) [@ago] [@ab] #bad",
      "[@bad_word] mi (mama | papa) (esta | estuvo) (un poco)? (enfermo | enferma | malito | malita | en el hospital) [@ab] #bad", "[@bad_word] mis (papas | padres) (estan | estuvieron) (un poco)? (enfermos | malitos) [@ab] #bad",
    ] },
    ask_family: { patterns: [
      "como (esta | sigue) tu (familia | esposo | hermano | hermana | mama | papa)", "como estan (tus | sus) (papas | padres | hijos | cuates | gemelos | hermanos | ninos)",
      "(y)? tu (familia | esposo) como (esta | sigue)", "y tus (papas | cuates | gemelos | hermanos)", "y tu familia",
    ] },
    and_you: { patterns: ["y tu #h:ab_and_you", "(y tu que tal | y a ti que tal | y a ti como te va | y a ti) #h:ab_what_about", "tu", "(y)? la tuya #h:ab_yours", "y los tuyos", "y usted #tip:usted_friend"] },
    mike_yes: { patterns: [
      "(si | claro | por supuesto) (me acuerdo [del | de él] | como esta) #h:mk_of_course", "[si] me acuerdo [del | de él | de memo] #h:mk_yes", "claro que me acuerdo [del | de él | de memo]",
      "como (esta | le va) [memo]", "memo (si | claro) [claro]", "(si | claro | ah) memo [claro]", "(el | uno) (alto | chistoso | callado | bajito | flaco | gordito | guero | moreno) [verdad]",
      "[si] (era | es) (muy | super)? (chistoso | buena onda | simpatico | alto | loco | divertido)", "[memo] que (buena onda | chistoso | simpatico | divertido | loco) (era | es)",
      "como no [me voy a acordar]", "que es de su vida", "que fue del", "que fue de él", "(si)? que (pasó | ha pasado) con él", "que hace (ahora | memo)",
      "(ah)? (ya)? (me acordé | ya me acordé)", "hace (mucho | anos | siglos) (que no lo veo | sin verlo | que no se nada del | que no se nada de él)",
    ] },
    mike_no: { patterns: [
      "[no] [perdon] no me acuerdo [del | de él | de memo] #h:mk_dont_remember", "[no] no (lo | le) recuerdo", "[perdon] (se me olvidó | olvidé) [quien es]", "[a ver] recuerdame [quien es]",
      "(no se | no tengo idea) quien es [memo]", "[memo] quien es memo", "no conozco a [ningun] memo", "[no] no lo conozco",
      "[si] [pero] (no me acuerdo (mucho | muy bien | bien) | me acuerdo (un poco | poquito | mas o menos))",
    ] },
    // "No tengo WhatsApp": a plain message, then
    no_whats: { patterns: ["no (tengo | uso) (whatsapp | whats | facebook | instagram)"] },
    // "¿Quién?", "No, ¿cuál Memo?": only after her question about Memo
    mike_who_ctx: { patterns: ["[no] [memo] (quien | cual | quien es | memo quien | cual memo | que memo)", "[no] (memo | cual memo) [quien es | quien era] [ese]"] },
    ask_mike: { patterns: ["(todavia | aun)? (ves | sabes algo de | hablas con) [a] memo", "como esta memo", "y memo", "que (hace | es de) memo [ahora]", "que fue de memo"] },
    good_idea: { patterns: [
      "(buena | excelente | gran | muy buena) idea #h:mk_idea", "me encantaria #h:pa_love", "(seria | suena | me suena) (genial | padre | divertido | increible | buenisimo | perfecto | bien | muy bien)",
      "(va que va | hagamoslo | jalo | yo jalo | me apunto | cuenta conmigo | ahi estare | ahi nos vemos | va ahi nos vemos)", "[el] {day} (esta bien | me queda bien | perfecto | puedo)", "[el] {day} si (puedo | me queda)",
      "(que | super) buen plan", "me (encanta | gusta) (la idea | el plan)",
      "[el] {no_day:day} no (puedo | me queda) [pero] [que tal | y | mejor] [el] {day} #otherday", "(que tal | mejor | y si | y si mejor) [el] {day} #otherday",
      "no [el] {no_day:day} [sino] [el] {day} #otherday", "(prefiero | mejor) [el] {day} #otherday", "(quedamos | nos vemos) [el] {day} [entonces] #dayset",
    ] },
    // "¿A qué hora?", "¿Dónde está?": only at her dinner idea
    dinner_ask_ctx: { patterns: ["[si | claro] [a] (que hora | como a que hora) [seria] #when", "[si | claro] (donde | en donde | por donde) (esta | queda) [el restaurante] #where"] },
    coffee_invite: { patterns: [
      "(tienes | traes) tiempo para (un cafe | un cafecito | tomar un cafe | tomar algo) #h:cf_time", "vamos (por | a tomar) un (cafe | cafecito) [juntas | juntos] #h:cf_want",
      "(quieres | te gustaria | te late | se te antoja) (tomar | ir por | ir a tomar) (un cafe | un cafecito | algo)", "(y si | que tal si) (vamos por | tomamos | nos tomamos) un (cafe | cafecito)",
      "(te invito | te late | se te antoja) un (cafe | cafecito)", "(tomamos | nos tomamos) un (cafe | cafecito)", "(tiene | quiere) tiempo para un cafe #tip:usted_friend",
    ] },
    decline: { patterns: [
      "@sorry [hoy | ahorita | ahora] no (puedo | tengo tiempo) [hoy | ahorita | ahora] [(tengo | voy a) (una cita | una junta | que trabajar | trabajo | prisa | un compromiso | otro compromiso)] #h:cf_cant",
      "@sorry (tengo | traigo) (prisa | mucha prisa)", "@sorry (voy tarde | estoy ocupado | estoy ocupada) [hoy | ahorita]",
      "@sorry (hoy | ahorita | ahora) no", "(mejor | tal vez | quiza | a lo mejor) (otro dia | otra vez | la proxima | en otra ocasion) [va | sale] #h:cf_next", "(otro dia | la proxima) [mejor | tal vez] [va | sale]",
      "ojala pudiera [pero no puedo]", "me encantaria pero (no puedo | tengo que irme | me tengo que ir | estoy ocupado | estoy ocupada | no tengo tiempo | tengo prisa)",
      "[no] @sorry (tengo que | me tengo que) (ir | regresar) al trabajo [ya | ahorita]", "@sorry (me tengo que ir | tengo que irme) [ya | ahorita]",
      "[no] @sorry (tengo que trabajar | tengo trabajo | tengo una cita | tengo una junta | tengo un compromiso)",
      "ya (tomé | me tomé) (cafe | un cafe | mi cafe) [hoy] #nocoffee", "no tomo cafe #nocoffee", "(hoy | ahorita) no pero (manana | otro dia | el {day}) si",
      "[el] {day} no [puedo | me queda]", "no puedo [el] {day}", "(me gustaria | me encantaria) pero [el] {day} (trabajo | tengo trabajo | no puedo | tengo planes | tengo un compromiso)",
      "[el] {day} (trabajo | tengo que trabajar | tengo planes | tengo un compromiso)", "no se si (pueda | puedo) [el {day}] #maybe",
      "[no se] (tal vez | quiza | a lo mejor) [si] #maybe", "(tengo que | dejame) (ver | checar | revisar) [mi agenda] #maybe", "no se [tal vez] #maybe",
      "no me (gusta | encanta) (el cafe | la idea | el plan) #nocoffee", "no es (buena | una buena) idea", "[hoy | ahorita] no tengo tiempo [hoy] (perdon | lo siento)",
    ] },
    keep_in_touch: { patterns: [
      "(hay que | tenemos que | vamos a) (seguir | estar | mantenernos) en contacto #h:kt_keep", "(nos pasamos | intercambiamos | hay que intercambiar | pasemonos) (los)? (numeros | telefonos | celulares | whats) #h:kt_swap",
      "(hay que | tenemos que) (vernos | juntarnos | salir | quedar) (mas seguido | un dia de estos | pronto | otra vez | algun dia)", "(quedamos | nos vemos | nos juntamos) un dia de estos",
      "no (dejemos | hay que dejar) pasar tanto tiempo [otra vez]", "(sigamos | seguimos | estemos | mantengamonos) en contacto", "no te olvides de (escribirme | llamarme | mandarme un mensaje)", "(llamame | escribeme | marcame | mandame un mensaje) (cuando quieras | un dia | algun dia)", "(agregame | sigueme) en (facebook | instagram)",
    ] },
    number_ctx: { patterns: [
      "[claro | rapido | va | ok | sale] [es | es el | mi numero es | mi telefono es | mi cel es | mi celular es | aqui esta mi numero | apunta | anota | apuntalo | anotalo] {digits} #h:kt_number",
      "[claro] (aqui tienes | este es) mi numero {digits}", "[toma | ten] mi numero [es] {digits}", "(apunta | anota | apuntate | toma) mi (numero | celular | cel | telefono) [es] {digits}",
    ] },
    give_phone: { patterns: [
      "(aqui | toma | ten) mi (numero | celular | telefono | cel)", "(te doy | te paso) mi numero", "(dejame | deja) (darte | pasarte) mi numero", "(yo)? te (mando | envio) un (mensaje | whatsapp | whats)",
      "(yo)? te (mando mensaje | mando whats | escribo por whats)", "(te lo | yo te lo) (escribo | anoto | apunto)",
      "dame tu (celular | cel | telefono) [y (te lo | lo) (pongo | anoto | guardo)] [y te pongo mi numero]", "(rapido | va | claro) (toma | ten) mi (celular | cel | telefono)", "agregame (en | a) (whatsapp | whats | facebook | instagram)",
    ] },
    // handing her the phone: "Sí, toma", "Aquí tienes", only when she asked for the number
    hand_phone_ctx: { patterns: ["[si | claro] (toma | ten | aqui tienes | aqui esta | ahi esta)"] },
    // no phone (yet): she gives hers
    no_phone: { patterns: [
      "(no tengo | todavia no tengo | aun no tengo) (celular | telefono | numero | cel) [aqui | de aqui | mexicano] [todavia | aun]", "no me (acuerdo de | se) mi numero", "no (traigo | tengo) (mi | el) (celular | cel | telefono) [aqui | conmigo]",
    ] },
    ask_number: { patterns: [
      "(me pasas | me das | me puedes dar | me puedes pasar | puedo tener) tu (numero | telefono | celular | cel | whats) #h:kt_ask", "cual es tu (numero | telefono | celular | cel)", "(pasame | dame) tu (numero | telefono | whats)",
      "[mejor] (me pasas | me das | pasame | dame) el tuyo", "(tienes | usas) (whatsapp | whats | facebook | instagram | telegram)", "(me da | me pasa) su numero #tip:usted_friend",
    ] },
    nice_to_see: { patterns: [
      "(que gusto | que bueno | que padre) me dio (verte | encontrarte) [@v] #h:by_nice", "me dio (mucho)? gusto [verte | encontrarte]", "(fue | ha sido) un (gusto | placer) [verte]", "que bueno que nos (encontramos | vimos)",
    ] },
    say_hi_to: { patterns: [
      "(saludos | muchos saludos | mis saludos) a (memo | tu esposo | tu familia | los cuates | los gemelos | todos | tu hermano | tus papas) [de mi parte] #h:by_say_hi",
      "(dale | mandale | dales | mandales) (saludos | mis saludos | un saludo) a (memo | tu esposo | tu familia | los cuates | los gemelos | todos | tu hermano | tus papas) [de mi parte]",
      "(saluda | saludame) a (memo | tu esposo | tu familia | los cuates | todos)", "dile a memo que lo saludo",
    ] },
    agree: { patterns: [
      "(si | claro | va | sale | ok | vale) (claro | por supuesto | me encantaria | perfecto | vamos | va | sale | por que no | con gusto)", "(claro | si) me encantaria #h:cf_sure", "me encantaria",
      "(suena | me suena) (bien | perfecto | padre | genial)", "tengo (veinte | diez | treinta | quince | unos | cinco | {number}) minutos", "[si | claro] (vamos | vamonos)",
      "[si | claro] (tengo tiempo | si tengo tiempo | tengo un rato | tengo un ratito)", "(que | muy) buena idea", "[si] pero yo invito",
      "[si | claro | vale] (un cafe | un cafecito | uno) (rapido | rapidito) [si]", "no tengo mucho tiempo pero (un cafe | uno | un cafecito) (rapido | rapidito) [si]", "[si] la ceiba esta (aqui | enfrente | aqui enfrente | en la plaza)",
      "[si] no tengo prisa", "[si] tengo tiempo no tengo prisa", "no (es | seria) (mala | una mala) idea",
      "[si] [claro] pero no tengo mucho tiempo", "[si] [claro] pero (rapido | rapidito | uno rapido)",
      "[si] (mejor | prefiero) (un jugo | un te | una cerveza | un agua | un licuado | una limonada | algo frio | un helado | un refresco) #alt",
    ] },
    // "¿Dónde?", "¿En La Ceiba?": only at her coffee question (a yes)
    coffee_where_ctx: { patterns: ["[si] [claro] (donde | a donde | en donde | en la ceiba | a la ceiba) [vamos]"] },
    no_sorry: { patterns: ["(no | nel) (perdon | lo siento | disculpa)", "(perdon | lo siento | disculpa) no", "(perdon | lo siento) (ahorita | ahora) no"] },
    g_bye: { patterns: [
      "(adios | bye | nos vemos | hasta luego | hasta pronto | cuidate | chao | hasta la proxima | nos estamos viendo) [@v] #h:by_bye",
      "que (te vaya bien | tengas buen dia | tengas bonito dia | estes bien)", "(adios | nos vemos) [@v] cuidate [mucho]", "cuidate mucho",
      "nos vemos (en el restaurante | el {day} | alla | en la ceiba | luego | pronto)", "(corre | vete | anda) [ya] [nos vemos]",
      ...LEAVING_PATTERNS,
    ] },
  },

  lines: {
    spot: [
      t("¡No puede | ser! | ¿Eres | tú? | ¡Cuánto tiempo!", "It can't | be! | Are-you | you? | Long time no see!", "No way! Is that you? Long time no see!"),
      t("Espérate… | ¡yo | te | conozco! | ¡Qué | milagro!", "Wait… | I | you | I-know! | What | a miracle!", "Wait… I know you! Long time no see!",
        { flags: { 5: "¡Qué milagro!: what a surprise to see you (literally: what a miracle)." } }),
      t("¡No inventes! | ¿De veras | eres | tú?", "No way! | Really | are-you | you?", "No way! Is that really you?",
        { flags: { 0: "Mexican, casual: ¡No inventes! = no way! (literally: don't make it up)." },
          neutral: t("¡No puede | ser! | ¿De verdad | eres | tú?", "It can't | be! | Really | are-you | you?", "No way! Is that really you?") }),
    ],
    who_again: [t("¡Oye, | soy | yo!", "Hey, | it's | me!", "Hey, it's me!")],
    its_me_lucy: [
      t("¡Soy | yo, | Paola! | ¡De | la | escuela! | ¡La | mexicana | del | intercambio!", "It's | me, | Paola! | From | — | school! | The | Mexican girl | from the | exchange!",
        "It's me, Paola! From school! The Mexican exchange student!", { flags: { 4: "de la escuela: Spanish says “the school”." } }),
    ],
    it_is_you: [t("¡Sí | eres | tú!", "Really | are-you | you!", "It really is you!", { flags: { 0: "sí before a verb: “really, indeed”." } })],
    changed: [
      t("¡No has cambiado | nada!", "You haven't changed | at all!", "You haven't changed a bit!"),
      t("¡Ay, | no has cambiado | nada! | ¡Estás | igualit{m:o|f:a}!", "Oh, | you haven't changed | at all! | You-are | just the same!", "Oh, you haven't changed a bit! You look exactly the same!",
        { flags: { 4: "igualito / igualita: igual + -ito, “exactly the same”." } }),
      t("¡Te ves | súper | bien! | ¡No has cambiado | nada!", "You look | super | good! | You haven't changed | at all!", "You look great! You haven't changed a bit!"),
    ],
    i_wish: [
      t("¡Ja! | ¡Ojalá!", "Ha! | I wish!", "Ha! I wish!"),
      t("¡Ay, | qué | lind{m:o|f:a} | eres!", "Aw, | how | sweet | you-are!", "Aw, you're so sweet!"),
    ],
    insist: [t("¡Te lo | digo | en serio!", "It to you | I-say | seriously!", "I mean it!")],
    aw_thanks: [t("¡Ay, | gracias!", "Aw, | thanks!", "Aw, thanks!")],
    ask_been: [
      t("Y | cuéntame, | ¿cómo | has estado?", "And | tell me, | how | have-you-been?", "So tell me, how have you been?"),
      t("¿Y | qué tal? | ¿Cómo | estás?", "And | how's it going? | How | are-you?", "So how's it going? How are you?"),
    ],
    ask_back: [t("¿Y | tú?", "And | you?", "And you?")],
    glad: [
      t("¡Ay, | qué | bueno! | Me da gusto.", "Oh, | how | good! | I'm glad.", "Oh, good! Glad to hear it."),
      t("¡Qué | bien!", "How | nice!", "That's great!"),
    ],
    sorry_to_hear: [t("¡Ay, | no! | Lo siento | mucho.", "Oh, | no! | I'm sorry | a lot.", "Oh no, I'm so sorry to hear that.")],
    so_so: [t("Ay, | bueno… | ¡ya | vendrán | tiempos | mejores!", "Oh, | well… | soon | will-come | times | better!", "Oh, well… better days are coming!",
      { flags: { 2: "ya with a future: “soon”, “you'll see”." } })],
    own_been: [t("¡Yo, | muy | bien! | Súper | contenta, | la verdad.", "Me, | very | well! | Super | happy, | honestly.", "I'm great! Really happy, actually.")],
    ask_upto: [
      t("Oye, | ¿y | qué | has hecho | todo | este | tiempo?", "Hey, | and | what | have-you-done | all | this | time?", "So what have you been up to all this time?"),
      t("Y | tú, | ¿qué | cuentas?", "And | you, | what | you-tell?", "So what's new with you?", { flags: { 3: QUE_CUENTAS } }),
    ],
    enough_about_me: [t("¡Pero | ya | hablé | mucho | de | mí! | ¿Y | tú?", "But | already | I-talked | a lot | about | me! | And | you?", "But enough about me! What about you?")],
    so_much_news: [t("¡Uy! | ¡Cuántas | noticias!", "Wow! | How much | news!", "Wow! So much news!")],
    react_married: [t("¡No me digas! | ¡Felicidades!", "No way! | Congratulations!", "No way! Congratulations!")],
    react_kids: [t("¡Ay, | qué | bonito!", "Aw, | how | lovely!", "Aw, that's wonderful!")],
    react_moved: [
      t("¿En serio? | ¿Ahora | vives | aquí? | ¡Qué | padre!", "Really? | Now | you-live | here? | How | cool!", "Really? You live here now? That's awesome!",
        { flags: { 5: PADRE }, neutral: t("¿En serio? | ¿Ahora | vives | aquí? | ¡Qué | bien!", "Really? | Now | you-live | here? | How | great!", "Really? You live here now? That's great!") }),
    ],
    react_job: [t("¡Felicidades! | ¡Qué | buena | noticia!", "Congratulations! | What | good | news!", "Congratulations! That's great news!")],
    react_work: [t("¡Ah, | qué | interesante!", "Oh, | how | interesting!", "Oh, how interesting!")],
    react_retired: [t("¡Qué | envidia! | ¡Disfrútalo | mucho!", "What | envy! | Enjoy it | a lot!", "Lucky you! Enjoy every minute!")],
    react_vacation: [t("¡Qué | bien! | Escogiste | el | mejor | lugar.", "How | nice! | You-chose | the | best | place.", "How nice! You picked the best place.")],
    react_hard: [t("¡Ay, | lo siento | mucho! | Pero | aquí | estás, | y | te ves | muy | bien.", "Oh, | I'm sorry | a lot! | But | here | you-are, | and | you look | very | good.", "Oh, I'm so sorry! But here you are, and you look great.")],
    react_not: [t("Ah, | ya | veo.", "Oh, | now | I-see.", "Oh, I see.")],
    react_spanish: [t("¡Oye, | y | hablas | muy | bien | español!", "Hey, | and | you-speak | very | well | Spanish!", "Hey, and your Spanish is really good!")],
    react_usual: [t("¡Ja! | Bueno, | yo | sí | tengo | noticias…", "Ha! | Well, | I | indeed | have | news…", "Ha! Well, I do have some news…",
      { flags: { 3: "sí before a verb: “do, indeed” (emphasis)." } })],
    react_usual2: [t("¡Ja! | Lo de siempre | también | está bien.", "Ha! | The usual | also | is fine.", "Ha! The usual is good too.")],
    lucy_news1: [
      t("Pues | yo | regresé | a | Puerto Colibrí | la primavera pasada. | Y | ¿qué | crees? | ¡Me casé!",
        "Well | I | came back | to | Puerto Colibrí | last spring. | And | what | you-think? | I got married!",
        "Well, I moved back to Puerto Colibrí last spring. And guess what? I got married!",
        { flags: { 7: "¿Qué crees?: “guess what?” (literally: what do you think?), very common in Mexico." } }),
    ],
    lucy_news1_too: [
      t("¡Yo | también! | Regresé | a | Puerto Colibrí | la primavera pasada, | y | ¡me casé!", "Me | too! | I-came-back | to | Puerto Colibrí | last spring, | and | I got married!",
        "Me too! I moved back to Puerto Colibrí last spring, and I got married!"),
    ],
    lucy_news2: [
      t("¡Gracias! | Y… | ¡tenemos | cuates!", "Thanks! | And… | we-have | twins!", "Thanks! And… we have twins!",
        { flags: { 3: "Mexican: cuates = twins (elsewhere: gemelos)." },
          neutral: t("¡Gracias! | Y… | ¡tenemos | gemelos!", "Thanks! | And… | we-have | twins!", "Thanks! And… we have twins!") }),
    ],
    lucy_news2_plain: [
      t("Y… | ¡tenemos | cuates!", "And… | we-have | twins!", "And… we have twins!",
        { flags: { 2: "Mexican: cuates = twins (elsewhere: gemelos)." },
          neutral: t("Y… | ¡tenemos | gemelos!", "And… | we-have | twins!", "And… we have twins!") }),
    ],
    ans_who: [t("Se llama | Daniel. | ¡Te | va | a | caer | muy | bien!", "His name is | Daniel. | (To) you | he's-going | to | fall | very | well!", "His name's Daniel. You're going to love him!",
      { flags: { 5: "caer bien: to be liked (te va a caer muy bien = you'll really like him)." } })],
    ans_photo: [t("¡Mira, | aquí | está!", "Look, | here | it-is!", "Look, here it is!")],
    ans_when: [t("Hace | dos | años.", "Ago | two | years.", "Two years ago.", { flags: { 0: "hace + a time: “ago” (it comes first in Spanish)." } })],
    ans_age: [t("¡Apenas | tienen | un | año!", "Barely | they-have | one | year!", "They're only one!")],
    ans_sex: [t("Un | niño | y | una | niña.", "A | boy | and | a | girl.", "A boy and a girl.")],
    ans_names: [t("Mateo | y | Sofía.", "Mateo | and | Sofía.", "Mateo and Sofía.")],
    ans_work: [t("¡Ay, | ni me digas! | No dormimos | nada.", "Oh, | don't even tell me! | We don't sleep | at all.", "Oh, tell me about it! We don't sleep at all.",
      { flags: { 3: "nada after a negative verb: “at all”." } })],
    ans_photo2: [t("¡Mira, | aquí | están!", "Look, | here | they-are!", "Look, here they are!")],
    so_happy: [t("¡Gracias! | Estoy | feliz, | feliz.", "Thanks! | I-am | happy, | happy.", "Thank you! I'm so, so happy.")],
    that_is_my_news: [t("¡Ja, | esas | son | mis | grandes | noticias!", "Ha, | those | are | my | big | news!", "Ha, that's my big news!")],
    same_old: [t("Ay, | pues | ya sabes, | lo de siempre.", "Oh, | well | you know, | the usual.", "Oh, you know, same old!")],
    ask_family: [t("¿Y | cómo | está | tu | familia?", "And | how | is | your | family?", "And how's your family?")],
    say_hi_to_them: [t("¡Ay, | mándales | saludos | de mi parte!", "Aw, | send them | greetings | from me!", "Aw, say hi to them for me!")],
    family_far: [t("Bueno, | ¡pero | aquí | ya | tienes | una | amiga!", "Well, | but | here | already | you-have | a | friend!", "Well, now you've got a friend here!")],
    own_family: [
      t("Todos | bien. | ¡Mi | hermano | ya | es | papá!", "Everyone | well. | My | brother | now | is | dad!", "Everyone's great. My brother's a dad now!",
        { flags: { 4: "ya: “now” (already)." } }),
    ],
    ask_mike: [
      t("Oye, | ¿te acuerdas | de | Memo? | ¿El | otro | mexicano | del | intercambio?", "Hey, | do you remember | — | Memo? | The | other | Mexican | from the | exchange?",
        "Hey, do you remember Memo? The other Mexican exchange student?", { flags: { 2: DE_EL, 3: "Memo: the usual nickname for Guillermo." } }),
    ],
    mike_again: [t("Oye, | ¿y | Memo? | ¿Te acuerdas | de | él?", "Hey, | and | Memo? | Do you remember | — | him?", "Hey, so do you remember Memo?", { flags: { 4: DE_EL } })],
    family_again: [t("¿Y | tu | familia?", "And | your | family?", "And your family?")],
    coffee_again: [t("Entonces, | ¿un | cafecito?", "So, | a | little coffee?", "So, coffee?")],
    upto_again: [t("¿Y | tú? | ¿Qué | hay | de | nuevo?", "And | you? | What | is there | — | new?", "And you? What's new?", { flags: { 4: "de nuevo here: “new” (qué hay de nuevo = what's new); de has no English word." } })],
    mike_hint: [t("¿Alto, | el | que | siempre | contaba | chistes?", "Tall, | the one | who | always | told | jokes?", "Tall guy, always telling jokes?")],
    mike_restaurant: [
      t("¡Ahora | tiene | un | restaurante | en | el | malecón!", "Now | he-has | a | restaurant | on | the | seafront!",
        "He has a restaurant on the malecón now!", { flags: { 6: "malecón: the promenade along the sea." } }),
    ],
    we_should_go: [t("¡Tenemos que | ir | todos | juntos | un | día!", "We have to | go | all | together | one | day!", "We should all go there together sometime!")],
    mike_dinner_q: [
      t("Oye, | ¿y si | vamos | todos | a | cenar | ahí | el | viernes?", "Hey, | what if | we-go | all | to | have dinner | there | on | Friday?",
        "Hey, why don't we all have dinner there on Friday?", { flags: { 7: "el + a day: “on” (the article stands for “on”)." } }),
    ],
    mike_dinner_again: [t("Entonces, | ¿el | viernes | con | Memo?", "So, | — | Friday | with | Memo?", "So, Friday at Memo's?", { flags: { 1: "el viernes: on Friday; the article has no English word." } })],
    dinner_when: [t("Como | a | las | ocho. | Yo | le | pregunto | a | Memo.", "Around | at | — | eight. | I | him | I'll-ask | — | Memo.", "Around eight. I'll ask Memo.",
      { flags: { 2: ART_TIME, 7: "a marks the person you ask; English needs no word for it." } })],
    dinner_where: [t("En | el | malecón. | Yo | le | pregunto | a | Memo | y | te | escribo.", "On | the | seafront. | I | him | I'll-ask | — | Memo | and | (to) you | I'll-write.", "On the malecón. I'll ask Memo and text you.",
      { flags: { 6: "a marks the person you ask; English needs no word for it." } })],
    dinner_other_day: [t("¡Va! | Yo | le | pregunto | a | Memo | si | puede | ese | día.", "Okay! | I | him | I'll-ask | — | Memo | if | he-can | that | day.", "Sure! I'll ask Memo if that day works for him.",
      { flags: { 0: "Mexican: ¡va! = okay, deal.", 4: "a marks the person you ask; English needs no word for it." },
        neutral: t("¡Bueno! | Yo | le | pregunto | a | Memo | si | puede | ese | día.", "Okay! | I | him | I'll-ask | — | Memo | if | he-can | that | day.", "Sure! I'll ask Memo if that day works for him.",
          { flags: { 4: "a marks the person you ask; English needs no word for it." } }) })],
    coffee_later: [t("¡Perfecto! | Te | escribo | y | nos ponemos de acuerdo.", "Perfect! | (To) you | I'll-write | and | we'll set it up.", "Perfect! I'll text you and we'll set something up.")],
    no_whats_ok: [t("¡No pasa nada! | Te | mando | un | mensaje | normal. | ¿Cuál | es | tu | número?", "No problem! | (To) you | I'll-send | a | message | normal. | What | is | your | number?", "No problem! I'll send you a regular text. What's your number?")],
    ans_invite: [t("¡Ay, | perdón! | Fue | algo | muy | chiquito, | nada más | la | familia.", "Oh, | sorry! | It-was | something | very | small, | only | the | family.", "Oh, sorry! It was a tiny wedding, just family.",
      { flags: { 5: "chiquito: chico + -ito, “tiny”." } })],
    you_tell_me: [t("¡Tú | me | dices!", "You | (to) me | tell!", "Just let me know!")],
    ill_ask_him: [t("¡Perfecto! | Yo | le | pregunto.", "Perfect! | I | him | I'll-ask.", "Great! I'll ask him.")],
    ask_coffee: [
      t("Oye, | ¿tienes | tiempo | para | un | café?", "Hey, | do you have | time | for | a | coffee?", "Hey, do you have time for a coffee?"),
      t("¿Tienes | tiempo | para | un | cafecito? | La Ceiba | está | aquí | en | la | plaza.", "Do you have | time | for | a | little coffee? | La Ceiba | is | here | on | the | square.",
        "Do you have time for a coffee? La Ceiba is right here on the square.", { flags: { 4: "cafecito: café + -ito, a friendly “cup of coffee”." } }),
    ],
    lets_sit: [t("¡Qué | bien! | Vamos | a | La Ceiba, | aquí | en | la | plaza.", "How | nice! | Let's go | to | La Ceiba, | here | on | the | square.", "Great! Let's go to La Ceiba, right here on the square.")],
    alt_ok: [t("¡Claro, | lo que | quieras! | Vamos | a | La Ceiba, | aquí | en | la | plaza.", "Sure, | whatever | you-want! | Let's go | to | La Ceiba, | here | on | the | square.", "Sure, whatever you like! Let's go to La Ceiba, right here on the square.")],
    no_coffee_ok: [t("¡Ah, | bueno! | Otro | día | vamos | por | un | jugo.", "Oh, | okay! | Another | day | we-go | for | a | juice.", "Oh, okay! Another day we'll go for a juice, then.")],
    changed_mind: [t("¡Ah, | bueno! | ¡Vamos!", "Oh, | good! | Let's go!", "Oh, great! Let's go!")],
    rain_check: [
      t("Me encantaría, | pero | voy | a | comer | con | mi | esposo | a | las | dos. | ¡Otro | día, | sin falta!",
        "I'd love to, | but | I'm-going | to | have lunch | with | my | husband | at | — | two. | Another | day, | for sure!",
        "I'd love to, but I'm having lunch with my husband at two. Another time, for sure!", { flags: { 4: COMER, 9: ART_TIME } }),
    ],
    next_time: [t("¡No te preocupes! | Otro | día.", "Don't worry! | Another | day.", "No worries! Another time.")],
    we_are: [t("¡Ja, | ya | vamos!", "Ha, | already | we're-going!", "Ha, that's where we're going!")],
    rush: [
      t("¡Ay, | ya | se me hizo tarde! | Voy | a | comer | con | mi | esposo | a | las | dos.", "Oh, | already | I'm late! | I'm-going | to | have lunch | with | my | husband | at | — | two.",
        "Oh no, I'm running late! I'm having lunch with my husband at two.", { flags: { 5: COMER, 10: ART_TIME } }),
    ],
    quick_numbers: [t("¡Rápido, | pásame | tu | número!", "Quick, | give me | your | number!", "Quick, give me your number!")],
    ask_number: [
      t("¡Hay que | seguir | en contacto! | ¿Me | pasas | tu | número?", "We have to | stay | in touch! | (To) me | you-pass | your | number?", "We have to keep in touch! Can I get your number?"),
      t("¡Pásame | tu | número | y | te | mando | un | mensaje!", "Give me | your | number | and | (to) you | I'll-send | a | message!", "Give me your number and I'll text you!"),
    ],
    definitely: [t("¡Claro que sí!", "Definitely!", "Definitely!")],
    number_again: [t("Entonces, | ¿cuál | es | tu | número?", "So, | what | is | your | number?", "So, what's your number?")],
    number_ok: [t("¡Perfecto! | ¿Cuál | es?", "Perfect! | What | is-it?", "Great! What is it?")],
    number_sure: [t("¿Seguro? | ¡Así | no nos perdemos | otra vez!", "Sure? | That way | we don't lose each other | again!", "Are you sure? That way we won't lose touch again!")],
    coffee_go: [t("¡Qué | gusto | me dio | verte! | Vamos | por | ese | café.", "What | joy | it gave me | to see you! | Let's go | for | that | coffee.", "So good to see you! Let's go get that coffee.")],
    bye_coffee: [t("¡Vamos!", "Let's go!", "Come on, let's go!")],
    bye_coffee_joke: [t("¡Ja, | pero | si | vamos | juntos | por | el | café! | ¡Vamos!", "Ha, | but | — | we're-going | together | for | the | coffee! | Let's go!", "Ha, but we're going for coffee together! Come on!",
      { flags: { 2: "si here: “but…!”, a surprised objection (not “if”)." } })],
    definitely_number: [t("¡Claro! | ¿Cuál | es | tu | número?", "Sure! | What | is | your | number?", "Sure! What's your number?")],
    got_it_text: [
      t("¡Listo! | Te | mando | un | mensaje | para que | tengas | el | mío.", "Done! | (To) you | I'll-send | a | message | so that | you-have | — | mine.",
        "Got it! I'll text you so you have mine.", { flags: { 7: "el mío: mine; the article has no English word." } }),
    ],
    typing_number: [
      t("¡Va! | Ahorita | te | mando | un | mensaje.", "Okay! | Right now | (to) you | I'll-send | a | message.", "Great! I'll text you right now.",
        { flags: { 0: "Mexican: ¡va! = okay, deal.", 1: "Mexican: ahorita = right now (or in a little while)." },
          neutral: t("¡Muy | bien! | Ahora | te | mando | un | mensaje.", "Very | good! | Now | (to) you | I'll-send | a | message.", "Great! I'll text you right now.") }),
    ],
    typed_number: [t("¡Listo! | Ya | te | guardé | mi | número.", "Done! | Already | (for) you | I-saved | my | number.", "There! I saved my number for you.")],
    no_phone_ok: [t("¡No pasa nada! | Te | doy | el | mío | y | me | escribes.", "No problem! | (To) you | I-give | — | mine | and | (to) me | you-write.", "No problem! I'll give you mine and you text me.",
      { flags: { 3: "el mío: mine; the article has no English word." } })],
    give_me_your_phone: [
      t("¡Claro! | Dame | tu | celular… | ¡Listo! | Escríbeme | cuando | quieras.", "Sure! | Give me | your | phone… | Done! | Write me | when | you-want.",
        "Sure! Give me your phone… There! Text me anytime."),
    ],
    wait_number: [t("¡Espérate, | hay que | seguir | en contacto! | ¿Cuál | es | tu | número?", "Wait, | we have to | stay | in touch! | What | is | your | number?", "Wait, let's keep in touch! What's your number?")],
    nice_to_see: [
      t("¡Me dio | mucho | gusto | verte!", "It gave me | a lot of | joy | to see you!", "It was so good to see you!"),
      t("¡Qué | bueno | que | nos | encontramos!", "How | good | that | each other | we-ran-into!", "So great running into you!"),
    ],
    you_too_lucy: [t("¡Igualmente!", "Likewise!", "You too!")],
    i_will: [t("¡De tu parte!", "From you!", "Will do!", { flags: { 0: "De tu parte: “(I'll say hi) for you”, the usual reply." } })],
    bye_lucy: [
      t("¡Saludos | a | tu | familia! | ¡Adiós!", "Greetings | to | your | family! | Bye!", "Say hi to your family! Bye!"),
      t("¡Nos vemos! | ¡Me | escribes, | eh!", "See you! | (To) me | you-write, | okay!", "See you! Text me, okay?"),
      t("¡Cuídate | mucho! | ¡Nos vemos | pronto!", "Take care | a lot! | See you | soon!", "Take care! See you soon!"),
    ],
    bye_short: [
      t("¡Nos vemos! | ¡Me | escribes, | eh!", "See you! | (To) me | you-write, | okay!", "See you! Text me, okay?"),
      t("¡Cuídate | mucho! | ¡Nos vemos | pronto!", "Take care | a lot! | See you | soon!", "Take care! See you soon!"),
    ],
  },

  hints: {
    greet: {
      lt: "Say hello and show your surprise",
      items: [
        { id: "gr_long_time", s: t("¡Paola! | ¡Cuánto tiempo!", "Paola! | Long time no see!", "Paola! Long time no see!") },
        { id: "gr_surprise", s: t("¡Qué | sorpresa!", "What | a surprise!", "What a surprise!") },
        { id: "gr_miracle", s: t("¡Qué | milagro!", "What | a miracle!", "Long time no see!"), note: "Mexicans say it when they run into someone they haven't seen in ages." },
        { id: "gr_good_to_see", s: t("¡Qué | gusto | verte!", "What | joy | to see you!", "It's so good to see you!") },
        { id: "gr_forever", s: t("¡Cuántos | años!", "How many | years!", "It's been so many years!") },
        { id: "gr_its_me", s: t("¡Sí, | soy | yo!", "Yes, | it's | me!", "Yes, it's me!") },
      ],
    },
    compliment: {
      lt: "Answer her compliment",
      items: [
        { id: "cm_you_too", s: t("¡Gracias! | ¡Tú | también!", "Thanks! | You | too!", "Thanks! You too!") },
        { id: "cm_look", s: t("¡Tú | también | te ves | muy | bien!", "You | too | you look | very | good!", "You look great too!") },
        { id: "cm_neither", s: t("¡Tú | tampoco!", "You | neither!", "Neither have you!"), note: "tampoco = “neither”: the answer to “¡No has cambiado nada!”." },
      ],
    },
    been: {
      lt: "Say how you've been (and ask back)",
      items: [
        { id: "bn_good", s: t("Muy | bien, | gracias. | ¿Y | tú?", "Very | well, | thanks. | And | you?", "Really good, thanks! And you?") },
        { id: "bn_not_bad", s: t("No me quejo. | ¿Y | tú?", "I can't complain. | And | you?", "Can't complain! How about you?") },
        { id: "bn_busy", s: t("Con | mucho | trabajo, | pero | bien.", "With | a lot of | work, | but | good.", "Busy, but good!") },
        { id: "bn_ask", s: t("¿Y | tú, | cómo | has estado?", "And | you, | how | have-you-been?", "And how have you been?") },
      ],
    },
    news: {
      lt: "Tell her your news",
      items: [
        { id: "nw_moved", s: t("Me mudé | aquí | el año pasado.", "I moved | here | last year.", "I moved here last year!") },
        { id: "nw_job", s: t("Tengo | un | trabajo | nuevo.", "I-have | a | job | new.", "I have a new job.") },
        { id: "nw_spanish", s: t("Estoy aprendiendo | español.", "I'm learning | Spanish.", "I'm learning Spanish.") },
        { id: "nw_married", s: t("¡Me casé!", "I got married!", "I got married!") },
        { id: "nw_kids", s: t("Ahora | tengo | dos | hijos.", "Now | I-have | two | kids.", "I have two kids now."), note: "hijos: children (sons and daughters together)." },
        { id: "nw_usual", s: t("Nada | nuevo, | lo de siempre.", "Nothing | new, | the usual.", "Not much, the usual.") },
        { id: "nw_ask", s: t("¿Y | tú, | qué | cuentas?", "And | you, | what | you-tell?", "And what's new with you?", { flags: { 3: QUE_CUENTAS } }) },
      ],
    },
    react: {
      lt: "React to her news",
      items: [
        { id: "rc_congrats", s: t("¡Felicidades!", "Congratulations!", "Congratulations!") },
        { id: "rc_great", s: t("¡Qué | buena | noticia!", "What | good | news!", "That's great news!") },
        { id: "rc_happy", s: t("¡Me da | mucho | gusto | por | ti!", "It-gives-me | a lot of | joy | for | you!", "I'm so happy for you!") },
      ],
    },
    family: {
      lt: "Tell her about your family",
      items: [
        { id: "fm_great", s: t("Todos | bien, | gracias.", "Everyone | well, | thanks.", "They're all great, thanks!") },
        { id: "fm_parents", s: t("Mis | papás | están | bien.", "My | parents | are | well.", "My parents are fine."), note: "Mexicans say “mis papás” for “my parents”." },
        { id: "ab_yours", s: t("¿Y | la | tuya?", "And | — | yours?", "And yours?", { flags: { 1: "la tuya: yours (your family; la agrees with familia)." } }) },
      ],
    },
    mike: {
      lt: "Say if you remember Memo",
      items: [
        { id: "mk_of_course", s: t("¡Claro! | ¿Cómo | está?", "Sure! | How | is-he?", "Of course! How is he?") },
        { id: "mk_yes", s: t("¡Sí, | me acuerdo!", "Yes, | I remember!", "Yes, I do!") },
        { id: "mk_dont_remember", s: t("Perdón, | no me acuerdo | de | él.", "Sorry, | I don't remember | — | him.", "Sorry, I don't remember him.", { flags: { 2: DE_EL } }) },
      ],
    },
    coffee: {
      lt: "Suggest a coffee, or answer",
      items: [
        { id: "cf_time", s: t("¿Tienes | tiempo | para | un | café?", "Do you have | time | for | a | coffee?", "Do you have time for a coffee?") },
        { id: "cf_want", s: t("¿Vamos | por | un | café?", "Shall we go | for | a | coffee?", "Want to grab a coffee?"), register: "casual" },
        { id: "cf_cant", s: t("Perdón, | hoy | no puedo.", "Sorry, | today | I can't.", "Sorry, I can't today.") },
        { id: "cf_next", s: t("¡Mejor | otro | día!", "Better | another | day!", "Maybe another time!") },
      ],
    },
    coffee_answer: {
      lt: "Answer about the coffee",
      items: [
        { id: "cf_sure", s: t("¡Claro, | me encantaría!", "Sure, | I'd love to!", "Sure, I'd love to!") },
        { id: "cf_cant", s: t("Perdón, | hoy | no puedo.", "Sorry, | today | I can't.", "Sorry, I can't today.") },
        { id: "cf_next", s: t("¡Mejor | otro | día!", "Better | another | day!", "Maybe another time!") },
      ],
    },
    plan_answer: {
      lt: "Answer her idea",
      items: [
        { id: "mk_idea", s: t("¡Buena | idea!", "Good | idea!", "Great idea!") },
        { id: "pa_love", s: t("¡Me encantaría!", "I'd love to!", "I'd love that!") },
        { id: "cf_next", s: t("¡Mejor | otro | día!", "Better | another | day!", "Maybe another time!") },
      ],
    },
    touch: {
      lt: "Agree to keep in touch",
      items: [
        { id: "kt_number", s: t("Mi | número | es | 984-123-4567.", "My | number | is | 984-123-4567.", "My number is 984-123-4567.",
          { say: "Mi número es nueve ocho cuatro, uno dos tres, cuarenta y cinco, sesenta y siete." }) },
        { id: "kt_ask", s: t("¿Me | pasas | tu | número?", "(To) me | you-pass | your | number?", "Can I get your number?") },
        { id: "kt_keep", s: t("¡Hay que | seguir | en contacto!", "We have to | stay | in touch!", "Let's keep in touch!") },
        { id: "kt_swap", s: t("¿Nos | pasamos | los | números?", "(To) each other | we-pass | the | numbers?", "Shall we swap numbers?") },
      ],
    },
    goodbye: {
      lt: "Say goodbye",
      items: [
        { id: "by_you_too", s: t("¡Igualmente! | ¡Adiós!", "Likewise! | Bye!", "You too! Bye!") },
        { id: "by_bye", s: t("¡Nos vemos | pronto!", "See you | soon!", "See you soon!") },
        { id: "by_nice", s: t("¡Qué | gusto | me dio | verte!", "What | joy | it gave me | to see you!", "It was so good to see you!") },
        { id: "by_say_hi", s: t("¡Saludos | a | Memo!", "Greetings | to | Memo!", "Say hi to Memo for me!") },
      ],
    },
    ask_back: {
      lt: "Ask her the same",
      items: [
        { id: "ab_and_you", s: t("¿Y | tú?", "And | you?", "And you?") },
        { id: "ab_what_about", s: t("¿Y | tú, | qué tal?", "And | you, | how's it going?", "How about you?") },
      ],
    },
  },

  tips: {
    usted_friend: { key: "usted_friend", lt: "Understood! With a friend, tú is more natural: “¿Y tú?”, “¿Cómo estás?” (usted is for strangers and staff).", better: "¿Y tú, cómo has estado?" },
  },

  merges: {
    "no puede": { reason: "grammatical_fusion", split: "no → not + puede → it can: English puts the negation inside the verb (it can't).", minimal: "Two words." },
    "cuánto tiempo": { reason: "lexical_expression", split: "cuánto → how much + tiempo → time; the greeting = long time no see.", minimal: "Two words." },
    "de veras": { reason: "lexical_expression", split: "de → of + veras → truths; = really.", minimal: "Two words." },
    "de verdad": { reason: "lexical_expression", split: "de → of + verdad → truth; = really.", minimal: "Two words." },
    "no has cambiado": { reason: "grammatical_fusion", split: "no → not + has → you have + cambiado → changed: the negated perfect = you haven't changed (S-NEG).", minimal: "Three words." },
    "te ves": { reason: "grammatical_fusion", split: "te → yourself + ves → you see; verse = to look (appearance).", minimal: "Two words." },
    "has estado": { reason: "grammatical_fusion", split: "has → you have + estado → been: the perfect = have you been.", minimal: "Two words." },
    "has hecho": { reason: "grammatical_fusion", split: "has → you have + hecho → done: the perfect = have you done.", minimal: "Two words." },
    "me da gusto": { reason: "lexical_expression", split: "me → to me + da → gives + gusto → pleasure; = I'm glad.", minimal: "Three words." },
    "me da": { reason: "grammatical_fusion", split: "me → to me + da → it gives: the English subject is the feeling (it gives me).", minimal: "Two words." },
    "la verdad": { reason: "lexical_expression", split: "la → the + verdad → truth; the discourse marker = honestly.", minimal: "Two words." },
    "puerto colibrí": { reason: "lexical_expression", split: "A town's name (S-NAME); Puerto → harbor + Colibrí → hummingbird would translate a name.", minimal: "The name." },
    "la primavera pasada": { reason: "lexical_expression", split: "la → the + primavera → spring + pasada → past; = last spring.", minimal: "Three words." },
    "el año pasado": { reason: "lexical_expression", split: "el → the + año → year + pasado → past; = last year.", minimal: "Three words." },
    "me casé": { reason: "grammatical_fusion", split: "me → myself + casé → I married; casarse = get married.", minimal: "Two words." },
    "me mudé": { reason: "grammatical_fusion", split: "me → myself + mudé → I moved; mudarse = move (house).", minimal: "Two words." },
    "ya sabes": { reason: "lexical_expression", split: "ya → already + sabes → you know; the filler = you know.", minimal: "Two words." },
    "de mi parte": { reason: "lexical_expression", split: "de → of + mi → my + parte → part; = from me.", minimal: "Three words." },
    "de tu parte": { reason: "lexical_expression", split: "de → of + tu → your + parte → part; the reply = (I'll say hi) for you.", minimal: "Three words." },
    "te acuerdas": { reason: "grammatical_fusion", split: "te → yourself + acuerdas → you agree is false; acordarse = remember.", minimal: "Two words." },
    "me acuerdo": { reason: "grammatical_fusion", split: "me → myself + acuerdo → I agree is false; acordarse = remember.", minimal: "Two words." },
    "tenemos que": { reason: "grammatical_fusion", split: "tenemos → we have + que → that is false; tener que = have to.", minimal: "Two words." },
    "hay que": { reason: "grammatical_fusion", split: "hay → there is + que → that is false; impersonal obligation = we have to.", minimal: "Two words." },
    "y si": { reason: "lexical_expression", split: "y → and + si → if; the suggestion = what if / how about.", minimal: "Two words." },
    "la ceiba": { reason: "lexical_expression", split: "A café's name (S-NAME): La Ceiba, after the ceiba tree.", minimal: "The name." },
    "me encantaría": { reason: "grammatical_fusion", split: "me → to me + encantaría → would delight; = I'd love to.", minimal: "Two words." },
    "se me hizo tarde": { reason: "lexical_expression", split: "se → itself + me → to me + hizo → it made + tarde → late; = I'm running late.", minimal: "Four words." },
    "en contacto": { reason: "lexical_expression", split: "en → in + contacto → contact; = in touch.", minimal: "Two words." },
    "para que": { reason: "grammatical_fusion", split: "para → for + que → that; the conjunction = so that.", minimal: "Two words." },
    "me dio": { reason: "grammatical_fusion", split: "me → to me + dio → it gave: the English subject is the feeling (it gave me).", minimal: "Two words." },
    "en serio": { reason: "lexical_expression", split: "en → in + serio → serious; = really.", minimal: "Two words." },
    "nos ponemos de acuerdo": { reason: "lexical_expression", split: "nos → ourselves + ponemos → we put + de → of + acuerdo → agreement; = we'll set it up, agree on a time.", minimal: "Four words." },
    "ni me digas": { reason: "lexical_expression", split: "ni → nor + me → to me + digas → you tell; the sigh = tell me about it.", minimal: "Three words." },
    "sin falta": { reason: "lexical_expression", split: "sin → without + falta → lack; = for sure.", minimal: "Two words." },
    "estoy aprendiendo": { reason: "grammatical_fusion", split: "estoy → I am + aprendiendo → learning: the progressive = I'm learning.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Say hello", done: (c) => !!c.s.greeted || !!c.s.changedSaid },
    { lt: "Say how you've been", done: (c) => !!c.s.ans?.been || asked(c, "howbeen") >= 2 || !!c.s.newsTold },
    { lt: "Tell her your news", done: (c) => !!c.s.newsTold },
    { lt: "Tell her about your family", optional: true, when: (c) => asked(c, "family") > 0 && !c.s.goalMet, done: (c) => asked(c, "family") > 0 && (!!c.s.ans?.family || asked(c, "family") >= 2) },
    { lt: "Answer about Memo", optional: true, when: (c) => asked(c, "mike") > 0 && !c.s.goalMet, done: (c) => asked(c, "mike") > 0 && (!!c.s.mikeSaid || asked(c, "mike") >= 3) },
    { lt: "Answer about the coffee", optional: true, when: (c) => asked(c, "coffee") > 0 && !c.s.goalMet, done: (c) => asked(c, "coffee") > 0 && (!!c.s.coffee || asked(c, "coffee") >= 2) },
    { lt: "Swap numbers", done: (c) => !!c.s.contact },
  ],
  steps: [
    { id: "recognize", done: (c) => !!c.s.greeted,
      ask: (c) => { if (c.s.skipAsk) { c.s.skipAsk = false; return; } c.say("who_again"); },
      expects: ["greet", "who_are_you"],
      suggest: [{ lt: "Say hello and show your surprise", hint: "greet" }],
      yes: (c) => { hi(c); } },
    { id: "changed", done: (c) => !!c.s.changedSaid,
      ask: (c) => { c.s.changedSaid = true; c.say("changed"); },
      expects: ["compliment_back", "you_too", "modest_ctx"],
      suggest: [{ lt: "Answer her compliment", hint: "compliment" }, { lt: "Ask how she has been", hint: "been" }] },
    { id: "howbeen", when: (c) => !c.s.rushing, done: (c) => !!c.s.ans.been || asked(c, "howbeen") >= 2,
      ask: (c) => { bump(c, "howbeen"); c.s.lastTopic = "been"; if (c.s.askBackShort === "been" || asked(c, "howbeen") > 1) { c.s.askBackShort = undefined; c.say("ask_back"); } else c.say("ask_been"); },
      expects: ["been_ans", "ask_been", "and_you"],
      suggest: [{ lt: "Say how you've been (and ask back)", hint: "been" }] },
    { id: "upto", when: (c) => !c.s.rushing, done: (c) => !!c.s.newsTold || asked(c, "upto") >= 3,
      ask: (c) => {
        bump(c, "upto"); c.s.lastTopic = "news";
        c.say(c.s.lucy2 && !c.s.enoughSaid ? "enough_about_me" : asked(c, "upto") > 1 ? "upto_again" : "ask_upto");
        if (c.s.lucy2) c.s.enoughSaid = true;
      },
      expects: ["news", "news_not", "ask_news", "and_you"],
      suggest: [{ lt: "Tell her your news", hint: "news" }, { lt: "Ask about her news", hint: "ask_back" }] },
    { id: "lucy1", when: (c) => !c.s.rushing, done: (c) => !!c.s.lucy1,
      ask: (c) => { c.s.lastTopic = "news"; tell(c, "news"); },
      expects: ["react_news"],
      suggest: [{ lt: "React to her news", hint: "react" }] },
    { id: "lucy2", when: (c) => !c.s.rushing && !!c.s.lucy1, done: (c) => !!c.s.lucy2,
      ask: (c) => { c.s.lucy2 = true; c.say("lucy_news2"); },
      expects: ["react_news"],
      suggest: [{ lt: "Congratulate her", hint: "react" }] },
    { id: "family", when: (c) => !c.s.rushing && c.s.askFamily, done: (c) => !!c.s.ans.family || asked(c, "family") >= 2,
      ask: (c) => { bump(c, "family"); c.s.lastTopic = "family"; c.say(asked(c, "family") > 1 ? "family_again" : "ask_family"); },
      expects: ["family_ans", "ask_family", "and_you"],
      suggest: [{ lt: "Tell her about your family", hint: "family" }] },
    { id: "mike", when: (c) => !c.s.rushing && c.s.askMike && !c.s.mikeSaid, done: (c) => !!c.s.mikeSaid || asked(c, "mike") >= 3,
      ask: (c) => { bump(c, "mike"); if (c.s.mikeHint && asked(c, "mike") > 1) c.say("mike_hint"); else c.say(asked(c, "mike") > 1 ? "mike_again" : "ask_mike"); },
      expects: ["mike_yes", "mike_no", "mike_who_ctx"],
      help: (c) => H.mike_no(c, {}, { intent: "mike_no", slots: {}, tags: [] }),
      suggest: [{ lt: "Say if you remember Memo", hint: "mike" }],
      yes: (c) => H.mike_yes(c, {}, { intent: "mike_yes", slots: {}, tags: [] }),
      no: (c) => H.mike_no(c, {}, { intent: "mike_no", slots: {}, tags: [] }) },
    { id: "rush", when: (c) => !!c.s.rushTwist, done: (c) => !!c.s.rushing,
      ask: (c) => { c.s.rushing = true; c.twist("in_a_hurry"); c.say("rush"); c.say("quick_numbers"); c.s.numberAsked = true; },
      expects: ["number_ctx", "give_phone", "ask_number", "keep_in_touch", "hand_phone_ctx", "no_phone"],
      suggest: [{ lt: "Swap numbers", hint: "touch" }] },
    { id: "coffee", when: (c) => !c.s.rushing && c.s.askCoffee, done: (c) => !!c.s.coffee || asked(c, "coffee") >= 2,
      ask: (c) => { bump(c, "coffee"); c.s.coffeeAsked = true; c.say(asked(c, "coffee") > 1 ? "coffee_again" : "ask_coffee"); },
      expects: ["decline", "coffee_invite", "agree", "coffee_where_ctx"],
      suggest: [{ lt: "Say yes to a coffee (or not)", hint: "coffee_answer" }],
      yes: (c) => { c.s.coffee = "yes"; c.say("lets_sit"); }, no: (c) => { c.s.coffee = "no"; c.say("next_time"); } },
    { id: "numbers", done: (c) => !!c.s.contact,
      ask: (c) => { bump(c, "numbers"); if (c.s.numberAsked) c.say("number_again"); else { c.s.numberAsked = true; c.say("ask_number"); } },
      expects: ["number_ctx", "give_phone", "ask_number", "keep_in_touch", "hand_phone_ctx", "no_phone", "no_whats"],
      suggest: [{ lt: "Give her your number, or suggest swapping", hint: "touch" }],
      yes: (c) => { c.say("number_ok"); c.hold(); },
      no: (c) => { if (c.s.numberNo) return; c.s.numberNo = true; c.say("number_sure"); c.hold(); } },
  ],

  init: (c) => {
    c.s.ans = {}; c.s.told = {};
    c.s.askFamily = c.chance(0.6);
    c.s.askMike = c.chance(0.65);
    c.s.askCoffee = c.chance(0.45);
    c.s.cantCoffee = c.visits >= 1 && c.chance(0.5);
    c.s.rushTwist = c.visits >= 1 && c.chance(0.3);
    c.s.mikeDinnerTwist = c.visits >= 2 && c.chance(0.5);
  },

  start: (c) => {
    c.say("spot");
    c.s.skipAsk = true;
  },

  handlers: H,

  finish: (c) => {
    if (c.s.contact && c.s.newsTold) win(c);
    c.say(c.s.coffee === "yes" ? "coffee_go" : "nice_to_see");
    const bye = (cc: Ctx) => closeBye(cc);
    const on: Record<string, (cc: Ctx) => void> = {};
    for (const k of Object.keys(oldFriend.intents)) if (!k.endsWith("_ctx")) on[k] = bye;
    for (const k of ["g_bye", "g_thanks", "g_ok", "g_hello"]) on[k] = bye;
    on.say_hi_to = (cc) => { cc.s.saidHi = true; if (once(cc, "sayhi")) cc.say("i_will"); closeBye(cc); };
    c.expect({ id: "closing", expects: ["nice_to_see", "you_too", "say_hi_to"], hints: ["goodbye"], suggest: [{ lt: "Say goodbye", hint: "goodbye" }], on, yes: bye, no: bye });
  },

  tests: [
    { say: "¡Paola! ¡Cuánto tiempo!", intent: "greet", step: "recognize" },
    { say: "¡No puede ser, Paola! ¡Qué sorpresa!", intent: "greet", step: "recognize" },
    { say: "¡Sí, soy yo!", intent: "greet", step: "recognize" },
    { say: "¡Qué gusto verte!", intent: "greet", step: "recognize" },
    { say: "¡Qué milagro!", intent: "greet", step: "recognize" },
    { say: "Perdón, ¿quién eres?", intent: "who_are_you", step: "recognize" },
    { say: "¡Tú tampoco!", intent: "compliment_back", step: "changed" },
    { say: "Gracias, tú también", intent: "you_too", step: "changed", not: ["g_bye"] },
    { say: "¡Cómo crees!", intent: "modest_ctx", step: "changed" },
    { say: "Muy bien, gracias. ¿Y tú?", intent: "been_ans", step: "howbeen" },
    { say: "No me quejo", intent: "been_ans", step: "howbeen" },
    { say: "Más o menos, la verdad", intent: "been_ans", step: "howbeen" },
    { say: "Con mucho trabajo, pero bien", intent: "been_ans", step: "howbeen" },
    { say: "¿Y tú, cómo has estado?", intent: "ask_been" },
    { say: "Me mudé aquí el año pasado", intent: "news", step: "upto" },
    { say: "Tengo un trabajo nuevo y estoy aprendiendo español", intent: "news", step: "upto" },
    { say: "¡Me casé!", intent: "news", step: "upto" },
    { say: "Ahora tengo dos hijos. ¿Y tú?", intent: "news", step: "upto" },
    { say: "Nada nuevo, lo de siempre", intent: "news", step: "upto" },
    { say: "¿Y tú qué cuentas?", intent: "ask_news" },
    { say: "¿Qué es de tu vida?", intent: "ask_news" },
    { say: "¡Felicidades!", intent: "react_news", step: "lucy1" },
    { say: "¿Cuates? ¡No inventes!", intent: "react_news", step: "lucy2" },
    { say: "Me da mucho gusto por ti", intent: "react_news", step: "lucy2" },
    { say: "Todos bien, gracias", intent: "family_ans", step: "family" },
    { say: "Mis papás están bien", intent: "family_ans", step: "family" },
    { say: "¡Claro! ¿Cómo está?", intent: "mike_yes", step: "mike" },
    { say: "Perdón, no me acuerdo de él", intent: "mike_no", step: "mike", not: ["mike_yes"] },
    { say: "¿Tienes tiempo para un café?", intent: "coffee_invite" },
    { say: "¿Vamos por un café?", intent: "coffee_invite" },
    { say: "Perdón, hoy no puedo", intent: "decline", step: "coffee", not: ["agree"] },
    { say: "¡Mejor otro día!", intent: "decline", step: "coffee" },
    { say: "Tengo veinte minutos", intent: "agree", step: "coffee" },
    { say: "¡Hay que seguir en contacto!", intent: "keep_in_touch" },
    { say: "Mi número es 984 123 4567", intent: "number_ctx", step: "numbers" },
    { say: "Nueve ocho cuatro, uno dos tres, cuarenta y cinco, sesenta y siete", intent: "number_ctx", step: "numbers" },
    { say: "¿Me pasas tu número?", intent: "ask_number" },
    { say: "¡Qué gusto me dio verte!", intent: "nice_to_see" },
    { say: "¡Saludos a Memo!", intent: "say_hi_to" },
    { say: "Le llamo luego.", intent: "g_bye", step: "howbeen" },
    { say: "Perdón, me tengo que ir.", intent: "decline", step: "coffee" },
    { say: "Trabajo como enfermera en un hospital", intent: "news", step: "upto" },
    { say: "Me vine para acá hace dos años por trabajo", intent: "news", step: "upto" },
    { say: "¿El alto?", intent: "mike_yes", step: "mike" },
    { say: "¿Tienes WhatsApp?", intent: "ask_number" },
    // tú is natural with a friend; usted is understood (with a tip)
    { say: "Bien, gracias, ¿y usted?", intent: "been_ans", step: "howbeen" },
    // Spain forms are right answers too: enhorabuena, móvil, vale, quedar
    { say: "¡Enhorabuena!", intent: "react_news", step: "lucy1" },
    { say: "Dame tu móvil y te pongo mi número", intent: "give_phone", step: "numbers" },
    { say: "Vale, un café rápido", intent: "agree", step: "coffee" },
    { say: "¿Quedamos un día de estos?", intent: "keep_in_touch" },
    // meaning must not flip
    { say: "No me acuerdo de ti", intent: "who_are_you", step: "recognize", not: ["greet"] },
    { say: "Se me olvidó quién es", intent: "mike_no", step: "mike", not: ["mike_yes"] },
    { say: "No conozco a ningún Memo", intent: "mike_no", step: "mike", not: ["mike_yes"] },
    { say: "Me encantaría, pero no tengo tiempo", intent: "decline", step: "coffee", not: ["agree", "good_idea"] },
    { say: "El viernes no puedo", intent: "decline", not: ["good_idea", "agree"] },
    { say: "No me casé", intent: "news_not", step: "upto", not: ["news"] },
    { say: "No soy maestra", intent: "yn:no", step: "upto", not: ["news"] },
    { say: "No quiero seguir en contacto", intent: "none", not: ["keep_in_touch"] },
    { say: "No te voy a dar mi número", intent: "none", not: ["give_phone", "number_ctx"] },
    { say: "Tú sí has cambiado", intent: "none", step: "changed", not: ["compliment_back"] },
    // wider phrasing and the answers that need their own reply
    { say: "¿Tienes hijos?", intent: "ask_news", step: "upto", not: ["news"] },
    { say: "Todavía no tengo hijos", intent: "news_not", step: "upto", not: ["news"] },
    { say: "No, ¿quién?", intent: "mike_who_ctx", step: "mike", not: ["mike_yes"] },
    { say: "Mejor un jugo", intent: "agree", step: "coffee" },
    { say: "No me gusta el café", intent: "decline", step: "coffee", not: ["agree"] },
    { say: "No tengo prisa", intent: "agree", step: "coffee", not: ["decline"] },
    { say: "No tengo celular aquí", intent: "no_phone", step: "numbers", not: ["number_ctx", "give_phone"] },
    { say: "Vine de vacaciones", intent: "news", step: "upto" },
    { say: "Mi mamá murió el año pasado", intent: "family_ans", step: "family" },
    { say: "¿Cuándo te casaste?", intent: "react_news", step: "lucy1" },
    { say: "No el viernes, el sábado", intent: "good_idea", slots: { day: "saturday" } },
    // the review's traps and gaps (blind set and probes)
    { say: "¿Memo? ¿Quién es?", intent: "mike_who_ctx", step: "mike", not: ["mike_yes"] },
    { say: "No es mala idea", intent: "agree", step: "coffee", not: ["decline"] },
    { say: "Sí, pero no tengo mucho tiempo", intent: "agree", step: "coffee", not: ["decline"] },
    { say: "No tengo tiempo, pero otro día sí", intent: "decline", step: "coffee", not: ["agree", "coffee_invite"] },
    { say: "Lo siento, no te reconozco", intent: "who_are_you", step: "recognize", not: ["greet"] },
    { say: "No muy bien, la verdad. Mi mamá estuvo enferma.", intent: "been_ans", step: "howbeen" },
    { say: "Nunca me casé", intent: "news_not", step: "upto", not: ["news"] },
    { say: "No, no me he casado", intent: "news_not", step: "upto", not: ["news"] },
    { say: "Estoy buscando trabajo", intent: "news_not", step: "upto", not: ["news"] },
    { say: "Me voy a casar el próximo año", intent: "news", step: "upto" },
    { say: "Me gustaría, pero el viernes trabajo", intent: "decline", not: ["good_idea", "agree"] },
    { say: "Sigamos en contacto", intent: "keep_in_touch" },
    { say: "No sé", intent: "decline", step: "mike", not: ["mike_yes"] },
    { say: "No tengo celular mexicano todavía", intent: "no_phone", step: "numbers", not: ["number_ctx", "give_phone"] },
    { say: "No quiero darte mi número", intent: "none", step: "numbers", not: ["number_ctx", "give_phone", "keep_in_touch"] },
    // not understood
    { say: "984 123 4567", intent: "none" },
    { say: "El perro está en la playa", intent: "none" },
    { say: "banana número azul", intent: "none" },
  ],

  sims: [
    { name: "catching up", turns: [
      "¡Paola! ¡No puede ser! ¡Cuánto tiempo!", "¡Tú tampoco!", "Muy bien, gracias. ¿Y tú?", "Me mudé aquí el año pasado y tengo un trabajo nuevo. ¿Y tú?",
      "¡Felicidades!", "¿Cuates? ¡Felicidades!", "¡Hay que seguir en contacto!", "Mi número es 984 123 4567.", "¡Igualmente! ¡Adiós!",
    ], expect: { complete: true }, auto: AUTO },
    { name: "short answers", turns: [
      "¡Hola, Paola!", "¡Gracias!", "Bien, gracias.", "Nada nuevo, lo de siempre.", "¡Felicidades!", "¡Guau!", "Claro. Es el 984 123 4567.", "¡Adiós!",
    ], expect: { complete: true }, auto: AUTO },
    // "Perdón, me tengo que ir." before swapping numbers: "¡Espérate…! ¿Cuál es tu número?", then goodbye
    { name: "leaving in a hurry", turns: [
      "¡Hola, Paola!", "¡Gracias!", "Bien, gracias.", "Pues nada, estoy aprendiendo español.", "Perdón, me tengo que ir.", "Claro, es el 984 123 4567.",
    ], expect: { complete: true }, auto: AUTO },
    { name: "learner asks first", turns: [
      "¡Sí, soy yo! ¡Qué sorpresa!", "¡Tú también te ves muy bien!", "¿Y tú, cómo has estado?", "Pues bien, no me quejo.", "¿Y tú qué cuentas?",
      "¡No me digas! ¡Felicidades!", "¡Me da mucho gusto por ti!", "Estoy aprendiendo español. ¡Y me casé!", "¿Me pasas tu número?", "¡Qué gusto me dio verte!",
    ], expect: { complete: true }, auto: AUTO },
    // questions and a change of mind: who is Memo, then the coffee: "Mejor otro día" … "Bueno, sí, vamos por un café"
    { name: "who is Memo, coffee after all", turns: [
      "Perdón, ¿quién eres?", "¡Ah, claro! ¡Paola! ¡Qué milagro!", "¡Cómo crees!", "Bien, ¿y tú cómo has estado?", "Trabajo como maestra aquí. ¿Y tú?", "¡No inventes!",
      "¿Cuántos años tienen?", "No me acuerdo de él.", "¡Ah, ya me acordé!", "Mejor otro día.", "Bueno, sí, vamos por un café.", "Mi número es 984 123 4567.", "¡Saludos a Memo!",
    ], expect: { complete: true, state: { coffee: "yes", mike: "yes", mikeHint: true } }, auto: AUTO,
      setup: (s) => { PLAIN(s); s.askMike = true; s.askCoffee = true; s.askFamily = false; } },
    // The twist on every seed: she's in a hurry (lunch with her husband at two): the numbers, quickly
    { name: "in a hurry (twist)", turns: [
      "¡Paola! ¡Qué milagro!", "¡Gracias, tú también!", "Muy bien, gracias.", "Tengo dos hijos.", "¡Felicidades!", "¡Qué bonito!", "Claro, mi número es 984 123 4567.", "¡Cuídate mucho!",
    ], expect: { complete: true, state: { rushing: true } }, auto: AUTO,
      setup: (s) => { PLAIN(s); s.rushTwist = true; s.askMike = false; s.askFamily = false; } },
    // The twist on every seed: the learner invites her for coffee, she can't ("¡Otro día, sin falta!")
    { name: "rain check (twist)", turns: [
      "¡Paola! ¡Cuánto tiempo!", "¡Tú también te ves muy bien!", "Bien, gracias.", "Me casé el año pasado.", "¡Felicidades!", "¡Qué buena noticia!",
      "¿Tienes tiempo para un café?", "¡Claro! Toma mi celular.", "¡Nos vemos pronto!",
    ], expect: { complete: true, state: { coffee: "no" } }, auto: AUTO,
      setup: (s) => { PLAIN(s); s.cantCoffee = true; s.askCoffee = false; s.askMike = false; } },
    // The twist on every seed: Memo's restaurant, and dinner there on Friday
    { name: "dinner at Memo's (twist)", turns: [
      "¡Paola! ¡Qué gusto verte!", "¡Gracias!", "Bien, ¿y tú?", "Nada nuevo, puro trabajo.", "¡Felicidades!", "¡Wow, cuates!", "¡Claro! ¿Cómo está?", "¡Buena idea!",
      "¿Me pasas tu número?", "¡Saludos a tu familia!",
    ], expect: { complete: true, state: { mikeDinner: "yes" } }, auto: AUTO,
      setup: (s) => { PLAIN(s); s.askMike = true; s.mikeDinnerTwist = true; s.askFamily = false; s.askCoffee = false; } },
    // "¿Memo? ¿Quién es?" gets the hint; "Sí, ¿a qué hora?" gets the time; a bare "Sí, claro" to the number gets "¿Cuál es?"
    { name: "who is Memo, dinner time, number after a yes (twist)", turns: [
      "¡Paola! ¡Cuánto tiempo!", "¡Gracias!", "Bien, gracias.", "Me voy a casar el próximo año.", "¡Felicidades!", "¡Qué padre!",
      "¿Memo? ¿Quién es?", "¡Ah, sí, ya me acordé!", "Sí, claro, ¿a qué hora?", "Sí, claro.", "Es el 984 123 4567.", "¡Adiós!",
    ], expect: { complete: true, state: { mikeDinner: "yes", dinnerAnswered: true, mikeHint: true, contact: true } }, auto: AUTO,
      setup: (s) => { PLAIN(s); s.askMike = true; s.mikeDinnerTwist = true; s.askFamily = false; s.askCoffee = false; } },
    // A visitor without a Mexican number; dinner at Memo's, but on another day (twist forced)
    { name: "no phone here, dinner another day (twist)", turns: [
      "¡Paola! ¡Qué sorpresa!", "¡Tú tampoco!", "Más o menos, la verdad.", "Vine de vacaciones.", "¿Con quién?", "¿Son niños o niñas?", "¿Memo? ¡Claro!",
      "No el viernes, el sábado.", "No tengo celular de aquí.", "¡Adiós!",
    ], expect: { complete: true, state: { mikeDinner: "yes", contact: true } }, auto: AUTO,
      setup: (s) => { PLAIN(s); s.askMike = true; s.mikeDinnerTwist = true; s.askFamily = false; s.askCoffee = false; } },
  ],
};

export default oldFriend;
