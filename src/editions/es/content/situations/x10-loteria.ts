// Lotería night in the zócalo (batch 4, 23 Nov 2026): a short bonus chat with Doña Toña at the lotería tables by the
// bandstand, then the lotería game (src/game/loteria/). Learner words by Claude. Usted: Doña Toña is an older neighbour.
import type { Ctx, SituationDef } from "@/content/types";
import { t } from "@/content/dsl";
import { LOTERIA_LINES, LOTERIA_MERGES } from "../loteria-lines";

const auto = { play: "Sí, claro.", know: "No. ¿Me explica?", ask: "¿Juega seguido?" };

function playAnswer(c: Ctx, yes: boolean) {
  if (c.s.play) {
    if (c.step === "ask") c.s.ready = true;
    return;
  }
  c.s.play = yes ? "yes_play" : "no_play";
  c.say(c.s.play);
}

function knowAnswer(c: Ctx, knows: boolean) {
  if (c.s.know) return;
  c.s.know = knows ? "yes" : "no";
  if (knows) c.say("knows");
  else { c.say("explain1"); c.say("explain2"); }
}

function sideQuestion(c: Ctx, topic: "often" | "name") {
  if (topic === "often" && !c.s.toldOften) { c.s.toldOften = true; c.say("every_friday"); }
  if (topic === "name" && !c.s.toldName) { c.s.toldName = true; c.say("my_name"); }
  if (c.step === "ask") c.s.ready = true;
}

const loteria: SituationDef = {
  id: "x10-loteria",
  bonus: true,
  song: "",
  songTitle: "",
  title: { en: "Noche de lotería", lt: "Lotería night" },
  topic: { en: "En el zócalo", lt: "In the main square" },
  chapter: 9,
  order: 9,
  location: "town-square",
  npc: "tona",
  mode: "talk",
  goal: "Sit down with Doña Toña at the lotería table, then play a board.",
  intro: "Friday night in the zócalo: string lights, music, and long tables by the bandstand. Doña Toña, a neighbor who never misses a lotería night, has a spare board and an empty chair next to her.",

  merges: LOTERIA_MERGES,
  intents: {
    play_yes: { patterns: [
      "[si] [claro] [yo] (quiero | puedo) jugar [con ustedes] [una tablita]",
      "[si] (claro | por supuesto | dale | va | vamos [a jugar] | con gusto) #h:h_si",
      "si [me] encantaria [jugar] #h:h_encantaria",
    ] },
    play_no: { patterns: ["(ahorita | ahora | por ahora) no [gracias] #h:h_ahorita", "no [yo] (quiero | puedo) jugar [ahorita | ahora]", "no gracias"] },
    know_yes: { patterns: ["si [ya] [se] [jugar] #h:h_ya_se", "(ya | claro) se [jugar]", "si [la] conozco"] },
    know_no: { patterns: ["no [no se] [me] [lo] explica #h:h_explica", "no [se] [jugar]", "[no] [me] (explica | ensena) [por favor]", "(mas o menos | un poco | poquito) #h:h_mas_menos"] },
    q_often: { patterns: ["[y] [usted] juega (seguido | mucho | a menudo) #h:h_seguido", "[y] [usted] viene (seguido | mucho | cada semana)"] },
    q_name: { patterns: ["[y] [usted] como se llama [usted] #h:h_nombre", "cual es su nombre"] },
  },

  lines: {
    greet: [t("¡Buenas noches! | ¿Juega | una | tablita | con | nosotros?", "Good evening! | Do-you-play | a | little-board | with | us?", "Good evening! Will you play a board with us?",
      { flags: { 3: "tablita: the lotería board (tabla), said fondly." } })],
    again: [t("¡Ya | volvió! | ¿Otra | tablita?", "Already | you-came-back! | Another | little-board?", "You're back! Another board?")],
    yes_play: [t("¡Qué | bueno! | Siéntese | aquí, | junto | a | mí.", "How | good! | Sit-down | here, | next | to | me.", "Wonderful! Sit here, next to me.")],
    no_play: [t("Ándele, | nomás | una. | ¡Es | rapidito!", "Come-on, | just | one. | It's | quick!", "Oh, go on, just one. It's quick!",
      { flags: { 0: "ándele: “go on, come on” (Mexico), to usted.", 1: "nomás: “just, only” (Mexico).", 4: "-ito softens a word: rápido → rapidito." } })],
    ask_know: [t("¿Ya | sabe | jugar?", "Already | you-know | to-play?", "Do you know how to play?")],
    knows: [t("¡Ah, | qué bien! | Entonces, | a | jugar.", "Oh, | great! | Then, | to | play.", "Oh, good! Then let's play.")],
    explain1: [t("Es | fácil. | Don Beto | canta | las | cartas | y | usted | las | busca | en | su | tabla.", "It-is | easy. | Don Beto | sings | the | cards | and | you | them | look-for | on | your | board.", "It's easy. Don Beto calls out the cards, and you look for them on your board.",
      { flags: { 3: "cantar las cartas: “to sing the cards”, to call them out." } })],
    explain2: [t("Les | pone | un | frijolito | encima. | Cuando | gane, | grite | «¡Lotería!».", "On-them | you-put | a | little-bean | on-top. | When | you-win, | shout | “Lotería!”.", "You put a bean on them. When you win, shout “¡Lotería!”.",
      { flags: { 3: "frijolito: a little bean; beans mark the board.", 6: "cuando + subjunctive (gane) for something still to come." } })],
    every_friday: [t("¡Cada | viernes! | Es | mi | noche | favorita.", "Every | Friday! | It-is | my | night | favorite.", "Every Friday! It's my favorite night.")],
    my_name: [t("Antonia, | pero | todos | me | dicen | Toña.", "Antonia, | but | everyone | me | they-call | Toña.", "Antonia, but everyone calls me Toña.",
      { flags: { 4: "me dicen: “they call me”, for a nickname." } })],
    lets_play: [t("¡Ahí | viene | Don Beto! | ¡Suerte!", "There | comes | Don Beto! | Luck!", "Here comes Don Beto! Good luck!")],
    bye: [t("¡Que | le | vaya | bien!", "That | to-you | it-goes | well!", "Take care!",
      { flags: { 0: "Que le vaya bien: “may it go well for you”, a warm goodbye." } })],
    ...LOTERIA_LINES,
  },

  hints: {
    play: {
      lt: "Answer Doña Toña",
      items: [
        { id: "h_si", s: t("¡Sí, | claro!", "Yes, | of-course!", "Sure!") },
        { id: "h_encantaria", s: t("Sí, | me | encantaría.", "Yes, | to-me | it-would-delight.", "Yes, I'd love to.") },
        { id: "h_ahorita", s: t("Ahorita | no, | gracias.", "Right-now | no, | thanks.", "Not right now, thanks.",
          { flags: { 0: "ahorita: “right now” or “in a bit” (Mexico)." }, spain: t("Ahora | no, | gracias.", "Now | no, | thanks.", "Not right now, thanks.") }) },
      ],
    },
    know: {
      lt: "Say if you know the game",
      items: [
        { id: "h_ya_se", s: t("Sí, | ya | sé.", "Yes, | already | I-know.", "Yes, I know how.") },
        { id: "h_explica", s: t("No. | ¿Me | explica?", "No. | To-me | you-explain?", "No. Can you explain?") },
        { id: "h_mas_menos", s: t("Más | o | menos.", "More | or | less.", "More or less.") },
      ],
    },
    ask: {
      lt: "Ask Doña Toña something",
      items: [
        { id: "h_seguido", s: t("¿Juega | seguido?", "Do-you-play | often?", "Do you play often?",
          { flags: { 1: "seguido: “often” (Mexico; also a menudo)." }, spain: t("¿Juega | mucho?", "Do-you-play | a-lot?", "Do you play a lot?") }) },
        { id: "h_nombre", s: t("¿Cómo | se | llama?", "How | yourself | you-call?", "What's your name?") },
      ],
    },
  },

  mission: [
    { step: "play", lt: "Say if you want to play" },
    { step: "know", lt: "Tell her if you know the game" },
  ],
  steps: [
    { id: "play", done: (c) => !!c.s.play, ask: (c) => c.say(c.visits >= 1 ? "again" : "greet"),
      expects: ["play_yes", "play_no"], suggest: [{ lt: "Answer Doña Toña", hint: "play" }, { lt: "Ask Doña Toña something", hint: "ask" }],
      yes: (c) => playAnswer(c, true), no: (c) => playAnswer(c, false), help: (c) => playAnswer(c, true) },
    { id: "know", done: (c) => !!c.s.know, ask: (c) => c.say("ask_know"),
      expects: ["know_yes", "know_no"], suggest: [{ lt: "Say if you know the game", hint: "know" }, { lt: "Ask Doña Toña something", hint: "ask" }],
      yes: (c) => knowAnswer(c, true), no: (c) => knowAnswer(c, false), help: (c) => knowAnswer(c, false) },
    { id: "ask", done: (c) => !!c.s.ready, ask: () => {},
      expects: ["q_often", "q_name", "play_yes", "g_thanks", "g_bye"],
      suggest: [{ lt: "Ask Doña Toña something", hint: "ask" }, { lt: "Answer Doña Toña", hint: "play" }], hints: ["ask", "play", "g_social"],
      yes: (c) => { c.s.ready = true; }, no: (c) => { c.s.ready = true; }, help: (c) => { c.s.ready = true; } },
  ],
  handlers: {
    play_yes: (c) => playAnswer(c, true),
    play_no: (c) => playAnswer(c, false),
    know_yes: (c) => knowAnswer(c, true),
    know_no: (c) => knowAnswer(c, false),
    q_often: (c) => sideQuestion(c, "often"),
    q_name: (c) => sideQuestion(c, "name"),
    g_thanks: (c) => { if (c.step === "ask") c.s.ready = true; },
    g_ok: (c) => { if (c.step === "ask") c.s.ready = true; },
    g_bye: (c) => { c.say("bye"); c.end(); c.hold(); },
  },
  start(c) { c.ask("play"); },
  finish(c) {
    c.say("lets_play");
    c.event("loteria");
    c.complete();
    c.end();
  },

  tests: [
    { say: "Sí, claro.", intent: "play_yes", step: "play" },
    { say: "Sí, me encantaría.", intent: "play_yes", step: "play" },
    { say: "Ahorita no, gracias.", intent: "play_no", step: "play" },
    { say: "Sí, ya sé.", intent: "know_yes", step: "know" },
    { say: "No. ¿Me explica?", intent: "know_no", step: "know" },
    { say: "Más o menos.", intent: "know_no", step: "know" },
    { say: "¿Juega seguido?", intent: "q_often", step: "ask" },
    { say: "¿Cómo se llama?", intent: "q_name", step: "ask" },
    { say: "Adiós", intent: "g_bye", step: "ask" },
  ],
  sims: [
    { name: "yes, doesn't know, asks how often", turns: ["Sí, claro.", "No. ¿Me explica?", "¿Juega seguido?"],
      expect: { complete: true, state: { play: "yes_play", know: "no", toldOften: true } }, auto },
    { name: "not now, knows, asks her name", turns: ["Ahorita no, gracias.", "Sí, ya sé.", "¿Cómo se llama?"],
      expect: { complete: true, state: { play: "no_play", know: "yes", toldName: true } }, auto },
    { name: "side question first", turns: ["¿Cómo se llama?", "Sí", "Más o menos.", "Sí, claro."],
      expect: { complete: true, state: { know: "no", toldName: true } }, auto },
    { name: "goodbye before playing", turns: ["Adiós"],
      expect: { complete: false }, auto },
  ],
};

export default loteria;
