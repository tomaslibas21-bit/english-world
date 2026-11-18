// X07 · La pintora del templo: Citlali, who paints the temple on the lawn of the ruins every afternoon (18 Nov 2026:
// the ruins are walked into, src/game/world/mexican.ts ruinsWalk). A chat of a minute, off the route (`bonus`): she
// shows her painting and asks if the visitor likes it, then whether they paint or draw themselves; she answers what
// she paints and whether she sells it.
// She says tú, as a young painter does. Nothing in her lines depends on who the learner is, and they are in words and
// tenses every Spanish shares: one text for the three Spanishes.
import type { Ctx, SituationDef } from "@/content/types";
import { t } from "@/content/dsl";

const AUTO: Record<string, string> = { like: "Me gusta mucho", you: "Sí, un poco" };

/** What the visitor thinks of the painting: her answer, once, and why she comes here. */
function liked(c: Ctx, yes: boolean) {
  if (c.s.liked) return;
  c.s.liked = true;
  c.say(yes ? "thanks" : "needs_color");
  c.say("light");
}

/** Whether they paint or draw: her answer, where to go next, and the chat has done what it is for. */
function you(c: Ctx, yes: boolean) {
  if (c.s.told) return;
  c.s.told = true;
  if (!c.s.liked) { c.s.liked = true; }
  c.say(yes ? "bring" : "never_late");
  c.say("view");
  c.complete();
}

function close(c: Ctx, thanks = false) {
  if (!c.s.closed) { c.s.closed = true; c.say(thanks ? "welcome" : "bye"); }
  c.end();
}

export const pintora: SituationDef = {
  id: "x07-pintora",
  bonus: true,
  song: "",
  songTitle: "",
  title: { en: "La pintora del templo", lt: "The temple's painter" },
  topic: { en: "En las ruinas", lt: "At the ruins" },
  chapter: 9,
  order: 6,
  location: "ruinas",
  npc: "pintora",
  mode: "talk",
  goal: "Chat with Citlali at her easel: tell her what you think of her painting, and whether you paint or draw.",
  intro: "On the lawn of the ruins a young painter stands at her easel, the temple and the sea on her canvas. Citlali comes here every afternoon, and she doesn't mind being watched.",

  intents: {
    like_it: { patterns: [
      "[si] me gusta [mucho | muchisimo] [tu pintura | tu cuadro | el cuadro | la pintura] #h:l_gusta", "[si] me encanta [tu pintura | tu cuadro | el cuadro | la pintura]",
      "[si] [es | esta | te quedo | te esta quedando] [muy] (bonita | bonito | hermosa | hermoso | linda | lindo | preciosa | precioso | bella | bello | bien) #h:l_bonita",
      "[si] que (bonita | bonito | hermosa | hermoso | linda | lindo | preciosa | precioso | bella | bello | bien) [es | esta | pintas]",
      "[si] pintas [muy] bien #h:l_pintas", "[si] eres [muy] buena [pintora | artista | pintando]", "[si] (es | esta) (genial | increible | maravillosa | maravilloso | perfecta | perfecto)",
    ] },
    not_much: { patterns: ["no me gusta [mucho | tanto]", "(no mucho | no tanto | mas o menos | regular | un poco)", "le falta (color | algo)"] },
    i_do: { patterns: [
      "[si] un poco #h:y_poco", "[si] (pinto | dibujo) [un poco | a veces | mucho | tambien | bastante]", "[si] me gusta (pintar | dibujar) [mucho]", "[si] (pinto | dibujo) y (dibujo | pinto)",
      "[si] a veces [pinto | dibujo]", "[si] yo tambien [pinto | dibujo]",
    ] },
    i_dont: { patterns: [
      "[no] [pero] me gusta el arte #h:y_arte", "[no] (no pinto | no dibujo | nada | nunca | para nada) [pero me gusta el arte]", "[no] no se (pintar | dibujar)", "[no] (pinto | dibujo) [muy] mal",
      "[no] solo (miro | tomo fotos | hago fotos | saco fotos)",
    ] },
    q_what: { patterns: ["que (pintas | estas pintando | dibujas) #h:q_que", "que es [eso | esto]", "(es | pintas) el templo"] },
    q_sell: { patterns: [
      "(vendes | se venden) [tus | las] (pinturas | cuadros) #h:q_vendes", "(vendes | lo vendes | la vendes | esta en venta)", "cuanto (cuesta | vale | es) [tu pintura | el cuadro | la pintura]",
      "(puedo | quiero) comprar (una | uno | tu pintura | el cuadro | este | esta)", "donde (vendes | puedo comprar) [tus | las] [pinturas | cuadros]",
    ] },
    q_often: { patterns: ["(vienes | pintas) [aqui] (mucho | seguido | a menudo | cada dia | todos los dias | cada tarde | siempre)", "(cuando | a que hora) (vienes | pintas)", "por que (vienes | pintas) aqui"] },
  },

  lines: {
    greet: [t("¡Hola! | Estoy | pintando | el | templo.", "Hi! | I-am | painting | the | temple.", "Hi! I'm painting the temple.")],
    again: [t("¡Hola | otra | vez! | Mira, | ya | casi | termino.", "Hi | another | time! | Look, | already | almost | I-finish.", "Hi again! Look, I'm almost done.")],
    ask_like: [t("¿Te | gusta?", "(To) you | it-pleases?", "Do you like it?")],
    thanks: [t("¡Gracias! | Todavía | no | está | terminada.", "Thanks! | Still | not | it-is | finished.", "Thanks! It isn't finished yet.")],
    needs_color: [t("Tienes | razón: | todavía | le | falta | color.", "You-have | reason: | still | (to) it | is-lacking | color.", "You're right: it still needs color.")],
    light: [t("Vengo | cada | tarde, | por | la | luz.", "I-come | each | afternoon, | for | the | light.", "I come every afternoon, for the light.")],
    ask_you: [t("¿Y | tú? | ¿Pintas | o | dibujas?", "And | you? | Do-you-paint | or | do-you-draw?", "And you? Do you paint or draw?")],
    bring: [t("¡Qué | bien! | Trae | tus | lápices | la | próxima | vez.", "How | nice! | Bring | your | pencils | the | next | time.", "How nice! Bring your pencils next time.")],
    never_late: [t("Nunca | es | tarde | para | empezar.", "Never | it-is | late | for | to-start.", "It's never too late to start.")],
    view: [t("Sube | al | templo: | la | vista | es | preciosa.", "Go up | to-the | temple: | the | view | is | lovely.", "Go up to the temple: the view is lovely.")],
    what: [t("El | templo | y | el | mar. | Siempre | el | mar.", "The | temple | and | the | sea. | Always | the | sea.", "The temple and the sea. Always the sea.")],
    sell: [t("Algunas, | en | el | mercado, | los | sábados.", "Some, | at | the | market, | the | Saturdays.", "Some of them, at the market, on Saturdays.")],
    welcome: [t("¡De | nada!", "For | nothing!", "You're welcome!")],
    bye: [t("¡Nos | vemos!", "Ourselves | we-see!", "See you!")],
  },

  hints: {
    like: {
      lt: "Say what you think of it",
      items: [
        { id: "l_gusta", s: t("Me gusta | mucho.", "I like it | much.", "I like it a lot.") },
        { id: "l_bonita", s: t("Es | muy | bonita.", "It-is | very | pretty.", "It's very pretty.") },
        { id: "l_pintas", s: t("Pintas | muy | bien.", "You-paint | very | well.", "You paint very well.") },
      ],
    },
    you: {
      lt: "Say if you paint or draw",
      items: [
        { id: "y_poco", s: t("Sí, | un | poco.", "Yes, | a | little.", "Yes, a little.") },
        { id: "y_arte", s: t("No, | pero | me gusta | el | arte.", "No, | but | I like | the | art.", "No, but I like art.") },
      ],
    },
    ask: {
      lt: "Ask Citlali",
      items: [
        { id: "q_que", s: t("¿Qué | pintas?", "What | do-you-paint?", "What do you paint?") },
        { id: "q_vendes", s: t("¿Vendes | tus | pinturas?", "Do-you-sell | your | paintings?", "Do you sell your paintings?") },
      ],
    },
  },

  mission: [
    { step: "like", lt: "Say what you think of her painting" },
    { step: "you", lt: "Say if you paint or draw" },
  ],

  steps: [
    { id: "like", done: (c) => !!c.s.liked,
      ask: (c) => c.say("ask_like"),
      expects: ["like_it", "not_much"],
      suggest: [{ lt: "Say what you think of it", hint: "like" }, { lt: "Ask Citlali", hint: "ask" }],
      yes: (c) => liked(c, true),
      no: (c) => liked(c, false),
      help: (c) => liked(c, true) },
    { id: "you", done: (c) => !!c.s.told,
      ask: (c) => c.say("ask_you"),
      expects: ["i_do", "i_dont"],
      suggest: [{ lt: "Say if you paint or draw", hint: "you" }, { lt: "Ask Citlali", hint: "ask" }],
      yes: (c) => you(c, true),
      no: (c) => you(c, false),
      help: (c) => you(c, false) },
  ],

  start: (c) => { c.say(c.visits >= 1 ? "again" : "greet"); },

  handlers: {
    like_it(c) { if (c.s.liked) c.say("welcome"); else liked(c, true); },
    not_much(c) { liked(c, false); },
    i_do(c) { you(c, true); },
    i_dont(c) { you(c, false); },
    q_what(c) { c.say("what"); },
    q_sell(c) { c.say("sell"); },
    q_often(c) { c.say("light"); },
    g_thanks(c) { if (c.s.told) close(c, true); else c.say("welcome"); },
    g_bye(c) { close(c); if (!c.s.told) c.hold(); },
  },

  finish: (c) => {
    c.expect({ id: "closing", optional: true, hints: ["g_social", "ask"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }, { lt: "Ask Citlali", hint: "ask" }],
      on: { g_thanks: (cc) => { close(cc, true); return true; }, g_bye: (cc) => { close(cc); return true; } },
      yes: (cc) => close(cc), no: (cc) => close(cc) });
  },

  tests: [
    { say: "Me gusta mucho", intent: "like_it", step: "like" },
    { say: "Es muy bonita", intent: "like_it", step: "like" },
    { say: "¡Qué bonito!", intent: "like_it", step: "like" },
    { say: "Pintas muy bien", intent: "like_it", step: "like" },
    { say: "Me encanta tu pintura", intent: "like_it", step: "like" },
    { say: "Más o menos", intent: "not_much", step: "like", not: ["like_it"] },
    { say: "Sí, un poco", intent: "i_do", step: "you" },
    { say: "Sí, dibujo a veces", intent: "i_do", step: "you" },
    { say: "Me gusta dibujar", intent: "i_do", step: "you" },
    { say: "No, pero me gusta el arte", intent: "i_dont", step: "you", not: ["i_do"] },
    { say: "No sé dibujar", intent: "i_dont", step: "you", not: ["i_do"] },
    { say: "¿Qué pintas?", intent: "q_what" },
    { say: "¿Vendes tus pinturas?", intent: "q_sell" },
    { say: "¿Cuánto cuesta el cuadro?", intent: "q_sell" },
    { say: "¿Vienes cada tarde?", intent: "q_often" },
    { say: "La pizza tiene queso", intent: "none" },
    { say: "Mi coche es azul", intent: "none" },
  ],

  sims: [
    { name: "likes it; paints a little; thanks", turns: ["Me gusta mucho.", "Sí, un poco.", "Muchas gracias."],
      expect: { complete: true, state: { liked: true, told: true, closed: true } }, auto: AUTO },
    { name: "pretty; no, but likes art; goodbye", turns: ["Es muy bonita.", "No, pero me gusta el arte.", "Adiós"],
      expect: { complete: true, state: { liked: true, told: true, closed: true } }, auto: AUTO },
    { name: "questions on the way", turns: ["¿Qué pintas?", "Pintas muy bien", "¿Vendes tus pinturas?", "No", "Gracias"],
      expect: { complete: true, state: { told: true } }, auto: AUTO },
    { name: "bare yes and yes", turns: ["Sí", "Sí", "Gracias, adiós"],
      expect: { complete: true, state: { liked: true, told: true } }, auto: AUTO },
    { name: "not so much; doesn't draw", turns: ["Más o menos", "No sé dibujar", "Gracias"],
      expect: { complete: true, state: { liked: true, told: true } }, auto: AUTO },
  ],
};

export default pintora;
