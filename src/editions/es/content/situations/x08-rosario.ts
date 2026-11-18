// X08 · A la sombra: Doña Rosario, who sits by the wall of the ruins in the shade with her basket of thread, and
// Pepe, the iguana on the stone beside her (18 Nov 2026: the ruins are walked into, src/game/world/mexican.ts
// ruinsWalk). A chat of a minute, off the route (`bonus`): the heat, as two people in the shade talk about it, and
// then the iguana: who he is, whether he bites, what he eats.
// She says usted, as an older woman does to a visitor. Nothing in her lines depends on who the learner is, and they
// are in words and tenses every Spanish shares: one text for the three Spanishes.
import type { Ctx, SituationDef } from "@/content/types";
import { t } from "@/content/dsl";

const IGUANA = "iguana: a large lizard, harmless, that suns itself on the stones of every ruin in the Yucatán.";
const HAMACA = "hamaca: a hammock. In the Yucatán people weave them by hand, and many sleep in one.";

const AUTO: Record<string, string> = { heat: "Sí, mucho calor", pepe: "¿Quién es Pepe?" };

/** The heat: her answer, once. */
function heat(c: Ctx, hot: boolean) {
  if (c.s.heat) return;
  c.s.heat = true;
  c.say(hot ? "shade" : "lucky");
}

/** Who Pepe is: told once; the chat has done what it is for. */
function pepe(c: Ctx, known = false) {
  if (c.s.pepe) { c.say("sun"); return; }
  c.s.pepe = true;
  if (!c.s.heat) c.s.heat = true;
  c.say(known ? "king" : "is_iguana");
  c.say("sun");
  c.complete();
}

function close(c: Ctx, thanks = false) {
  if (!c.s.closed) { c.s.closed = true; c.say(thanks ? "welcome" : "bye"); }
  c.end();
}

export const rosario: SituationDef = {
  id: "x08-rosario",
  bonus: true,
  song: "",
  songTitle: "",
  title: { en: "A la sombra", lt: "In the shade" },
  topic: { en: "En las ruinas", lt: "At the ruins" },
  chapter: 9,
  order: 7,
  location: "ruinas",
  npc: "rosario",
  mode: "talk",
  goal: "Chat with Doña Rosario in the shade: talk about the heat, and find out who Pepe is.",
  intro: "By the wall of the ruins, in the shade, Doña Rosario weaves with her basket of thread beside her. On the big stone next to her something lies very still in the sun.",

  intents: {
    hot_yes: { patterns: [
      "[si] [hace] (mucho | muchisimo | bastante | demasiado) calor [hoy] #h:h_si", "[si] hace calor [hoy]", "[si] que calor [hace] [hoy]", "[si] (tengo | tengo mucho) calor",
      "[si] (es | esta) [muy] (caliente | caluroso) [hoy | el dia]", "[si] (es | esta) insoportable",
    ] },
    hot_no: { patterns: [
      "[no] no tanto #h:h_no", "[no] (a mi | pues a mi) me gusta [mucho] el calor #h:h_gusta", "[no] me (gusta | encanta) [el calor | el sol]", "[no] (esta | estoy) bien [asi]",
      "[no] no hace [tanto | mucho] calor", "[no] (en mi pais | alla) hace (frio | mucho frio | mas frio)",
    ] },
    who_q: { patterns: [
      "[no] quien es [pepe | ese | el] #h:p_quien", "[no] (no lo conozco | no conozco a pepe)", "[y] pepe quien es", "(que | quien) es pepe",
    ] },
    know_him: { patterns: [
      "[si] [es] la iguana #h:p_iguana", "[si] (ya lo vi | lo vi | ya lo he visto | lo he visto | lo conozco | ya lo conozco)", "[si] (es | pepe es) (esa | la | una) iguana", "(la | esa | una) iguana",
    ] },
    q_bite: { patterns: ["[y] muerde #h:q_muerde", "(es | son) (peligroso | peligrosa | peligrosas | malo | bravo)", "(hace | no hace) (algo | nada)", "(pica | ataca | me va a morder)", "[lo] puedo tocar[lo]"] },
    q_eat: { patterns: ["[y] que come #h:q_come", "que (le gusta comer | comen las iguanas)", "(come | comen) (carne | fruta | flores | insectos)"] },
    q_weave: { patterns: ["que (teje | hace | esta haciendo | esta tejiendo) [usted] #h:q_teje", "(es | teje) una hamaca", "para quien es [la hamaca]"] },
  },

  lines: {
    greet: [t("¡Buenas | tardes!", "Good | afternoon!", "Good afternoon!")],
    again: [t("¡Buenas | tardes! | Pepe | y | yo | seguimos | aquí.", "Good | afternoon! | Pepe | and | I | we-continue | here.", "Good afternoon! Pepe and I are still here.")],
    ask_heat: [t("Hace | mucho | calor | hoy, | ¿verdad?", "It-makes | much | heat | today, | right?", "It's very hot today, isn't it?")],
    shade: [t("Aquí, | a | la | sombra, | se | está | mejor.", "Here, | in | the | shade, | one | is | better.", "Here in the shade it's better.")],
    lucky: [t("¡Qué | suerte! | A | mí | me | cansa.", "What | luck! | (To) | me | me | it-tires.", "Lucky you! It wears me out.")],
    ask_pepe: [t("¿Conoce | a | Pepe?", "Do-you-know | (to) | Pepe?", "Do you know Pepe?")],
    is_iguana: [t("Es | la | iguana. | Vive | en | esa | piedra.", "He-is | the | iguana. | He-lives | on | that | stone.", "He's the iguana. He lives on that stone.", { flags: { 2: IGUANA } })],
    king: [t("Entonces | ya | sabe: | es | el | rey | de | las | ruinas.", "Then | already | you-know: | he-is | the | king | of | the | ruins.", "Then you know: he's the king of the ruins.")],
    sun: [t("Toma | el | sol | todo | el | día.", "He-takes | the | sun | all | the | day.", "He sunbathes all day.")],
    bite: [t("No, | no | hace | nada. | Es | muy | tranquilo.", "No, | not | he-does | nothing. | He-is | very | calm.", "No, he's harmless. He's very calm.")],
    eat: [t("Flores | y | fruta. | Le | gusta | el | mango.", "Flowers | and | fruit. | (To) him | pleases | the | mango.", "Flowers and fruit. He likes mango.")],
    weave: [t("Tejo | una | hamaca | para | mi | nieto.", "I-weave | a | hammock | for | my | grandson.", "I'm weaving a hammock for my grandson.", { flags: { 2: HAMACA } })],
    sit: [t("Siéntese | un | rato, | si | quiere.", "Sit-yourself | a | while, | if | you-want.", "Sit for a while, if you like.")],
    welcome: [t("De | nada. | Vuelva | cuando | quiera.", "For | nothing. | Come back | when | you-want.", "You're welcome. Come back whenever you like.")],
    bye: [t("¡Que | tenga | buen | día!", "That | you-have | good | day!", "Have a good day!")],
  },

  hints: {
    heat: {
      lt: "Answer about the heat",
      items: [
        { id: "h_si", s: t("Sí, | mucho | calor.", "Yes, | much | heat.", "Yes, very hot.") },
        { id: "h_no", s: t("No | tanto.", "Not | so much.", "Not that much.") },
        { id: "h_gusta", s: t("A | mí | me gusta | el | calor.", "(To) | me | I like | the | heat.", "I like the heat.") },
      ],
    },
    pepe: {
      lt: "Answer about Pepe",
      items: [
        { id: "p_quien", s: t("No. | ¿Quién | es | Pepe?", "No. | Who | is | Pepe?", "No. Who is Pepe?") },
        { id: "p_iguana", s: t("Sí, | es | la | iguana.", "Yes, | he-is | the | iguana.", "Yes, he's the iguana.") },
      ],
    },
    ask: {
      lt: "Ask Doña Rosario",
      items: [
        { id: "q_muerde", s: t("¿Muerde?", "Does-he-bite?", "Does he bite?") },
        { id: "q_come", s: t("¿Qué | come?", "What | does-he-eat?", "What does he eat?") },
        { id: "q_teje", s: t("¿Qué | teje?", "What | are-you-weaving?", "What are you weaving?") },
      ],
    },
  },

  mission: [
    { step: "heat", lt: "Talk about the heat" },
    { step: "pepe", lt: "Find out who Pepe is" },
  ],

  steps: [
    { id: "heat", done: (c) => !!c.s.heat,
      ask: (c) => c.say("ask_heat"),
      expects: ["hot_yes", "hot_no"],
      suggest: [{ lt: "Answer about the heat", hint: "heat" }],
      yes: (c) => heat(c, true),
      no: (c) => heat(c, false),
      help: (c) => heat(c, true) },
    { id: "pepe", done: (c) => !!c.s.pepe,
      ask: (c) => c.say("ask_pepe"),
      expects: ["who_q", "know_him"],
      suggest: [{ lt: "Answer about Pepe", hint: "pepe" }, { lt: "Ask Doña Rosario", hint: "ask" }],
      yes: (c) => pepe(c, true),
      no: (c) => pepe(c),
      help: (c) => pepe(c) },
  ],

  start: (c) => { c.say(c.visits >= 1 ? "again" : "greet"); },

  handlers: {
    hot_yes(c) { heat(c, true); },
    hot_no(c) { heat(c, false); },
    who_q(c) { pepe(c); },
    know_him(c) { pepe(c, true); },
    q_bite(c) { c.say("bite"); },
    q_eat(c) { c.say("eat"); },
    q_weave(c) { c.say("weave"); },
    g_thanks(c) { if (c.s.pepe) close(c, true); else c.say("welcome"); },
    g_bye(c) { close(c); if (!c.s.pepe) c.hold(); },
  },

  finish: (c) => {
    c.say("sit");
    c.expect({ id: "closing", optional: true, hints: ["g_social", "ask"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }, { lt: "Ask Doña Rosario", hint: "ask" }],
      on: { g_thanks: (cc) => { close(cc, true); return true; }, g_bye: (cc) => { close(cc); return true; } },
      yes: (cc) => close(cc), no: (cc) => close(cc) });
  },

  tests: [
    { say: "Sí, mucho calor", intent: "hot_yes", step: "heat" },
    { say: "Sí, hace mucho calor hoy", intent: "hot_yes", step: "heat" },
    { say: "¡Qué calor!", intent: "hot_yes", step: "heat" },
    { say: "No tanto", intent: "hot_no", step: "heat", not: ["hot_yes"] },
    { say: "A mí me gusta el calor", intent: "hot_no", step: "heat", not: ["hot_yes"] },
    { say: "En mi país hace frío", intent: "hot_no", step: "heat" },
    { say: "No. ¿Quién es Pepe?", intent: "who_q", step: "pepe" },
    { say: "¿Quién es?", intent: "who_q", step: "pepe" },
    { say: "Sí, es la iguana", intent: "know_him", step: "pepe" },
    { say: "Ya lo vi", intent: "know_him", step: "pepe" },
    { say: "¿Muerde?", intent: "q_bite" },
    { say: "¿Es peligroso?", intent: "q_bite" },
    { say: "¿Qué come?", intent: "q_eat" },
    { say: "¿Qué teje?", intent: "q_weave" },
    { say: "La pizza tiene queso", intent: "none" },
    { say: "Mi coche es azul", intent: "none" },
  ],

  sims: [
    { name: "hot; who is Pepe; does he bite; thanks", turns: ["Sí, mucho calor.", "No. ¿Quién es Pepe?", "¿Muerde?", "Muchas gracias."],
      expect: { complete: true, state: { heat: true, pepe: true, closed: true } }, auto: AUTO },
    { name: "likes the heat; knows him; goodbye", turns: ["A mí me gusta el calor.", "Sí, es la iguana.", "Adiós"],
      expect: { complete: true, state: { heat: true, pepe: true, closed: true } }, auto: AUTO },
    { name: "bare answers; what he eats; what she weaves", turns: ["Sí", "No", "¿Qué come?", "¿Qué teje?", "Gracias"],
      expect: { complete: true, state: { pepe: true } }, auto: AUTO },
    { name: "not so hot; a bare yes", turns: ["No tanto", "Sí", "Gracias, adiós"],
      expect: { complete: true, state: { heat: true, pepe: true } }, auto: AUTO },
  ],
};

export default rosario;
