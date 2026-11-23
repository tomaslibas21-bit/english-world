import type { Ctx, SituationDef } from "@/content/types";
import { t } from "@/content/dsl";
import { nameHint } from "../personal-hints";
import { BILLIARDS_LINES, BILLIARDS_NPC, BILLIARDS_SITUATION } from "../billiards-lines";

function play(c: Ctx, line: "yes_play" | "never") {
  if (c.step !== "play" || c.s.play) return;
  c.s.play = line;
  c.say(line);
}

function introduced(c: Ctx) {
  if (c.step !== "name" || c.s.named) return;
  c.s.named = true;
  for (const line of ["nice", "rules", "rules_ex", "rules_win"]) c.say(line);
}

function group(c: Ctx, choice: "solids" | "stripes") {
  if (c.step !== "group" || c.s.group) return;
  c.s.group = choice;
  c.say(`bl_${choice}`);
}

function ready(c: Ctx) {
  if (c.step === "ask") c.s.ready = true;
}

function question(c: Ctx, line: "my_years" | "every_night") {
  if (!c.s[line]) {
    c.s[line] = true;
    c.say(line);
  }
  ready(c);
}

const auto = { play: "Un poquito.", name: "Me llamo Ana.", group: "Las lisas, por favor.", ask: "¿Desde cuándo juega?" };
const billar: SituationDef = {
  id: BILLIARDS_SITUATION,
  bonus: true,
  optionalVoice: true,
  song: "",
  songTitle: "",
  title: { en: "Una partida de billar", lt: "A game of pool" },
  topic: { en: "En la cantina", lt: "At the cantina" },
  chapter: 9,
  order: 9,
  location: "pool-hall",
  npc: BILLIARDS_NPC,
  mode: "talk",
  goal: "Chat with Don Memo at the cantina: say if you play pool, tell him your name and choose solids or stripes. Then play a game.",
  intro: "La Buchaca is a small cantina on the corner of calle Hidalgo and calle Ceiba, with a pool table in the back. Its owner, Don Memo, is chalking his cue and waves you over.",

  merges: {
    "la esquina": { reason: "grammatical_fusion", split: "The definite article and noun identify the corner that the next unit locates.", minimal: "Keep the supplied gloss together." },
    "del fondo": { reason: "grammatical_fusion", split: "The contracted de + el and the noun locate the far end together.", minimal: "Keep the supplied gloss together." },
    "de allá": { reason: "grammatical_fusion", split: "The preposition and demonstrative adverb give the far end of the table.", minimal: "Keep the supplied gloss together." },
    "la del medio": { reason: "grammatical_fusion", split: "The article stands for the understood pocket, with del medio specifying which one.", minimal: "Keep the supplied gloss together." },
    "la de en medio": { reason: "grammatical_fusion", split: "The article stands for the understood pocket, with de en medio specifying which one.", minimal: "Keep the supplied gloss together." },
    "de aquí": { reason: "grammatical_fusion", split: "The preposition and demonstrative adverb give the near end of the table.", minimal: "Keep the supplied gloss together." },
    "de acá": { reason: "grammatical_fusion", split: "The preposition and demonstrative adverb give the near end of the table.", minimal: "Keep the supplied gloss together." },
    "muy bien": { reason: "lexical_expression", split: "This response accepts the choice as a whole.", minimal: "Keep the supplied gloss together." },
    "las lisas": { reason: "grammatical_fusion", split: "The article and adjective stand together for the solid-colored balls.", minimal: "Keep the supplied gloss together." },
    "las rayadas": { reason: "grammatical_fusion", split: "The article and adjective stand together for the striped balls.", minimal: "Keep the supplied gloss together." },
    "la tronera": { reason: "grammatical_fusion", split: "The definite article and noun identify the called pocket.", minimal: "Keep the supplied gloss together." },
    "la buchaca": { reason: "grammatical_fusion", split: "The definite article and noun identify a pool-table pocket in the Mexican wording.", minimal: "Keep the supplied gloss together." },
    "la bola": { reason: "grammatical_fusion", split: "The definite article and noun identify the ball named in the call.", minimal: "Keep the supplied gloss together." },
    "la blanca": { reason: "grammatical_fusion", split: "The article and adjective stand together for the white cue ball.", minimal: "Keep the supplied gloss together." },
    "la fallé": { reason: "grammatical_fusion", split: "The unstressed object pronoun goes with the verb and stands for the shot just taken.", minimal: "Keep the supplied gloss together." },
    "la ocho": { reason: "grammatical_fusion", split: "The feminine article supplies the implied bola before the number.", minimal: "Keep the supplied gloss together." },
    "la mesa": { reason: "grammatical_fusion", split: "The article and noun identify the pool table in the expression about returning the ball.", minimal: "Keep the supplied gloss together." },
    "esta vez": { reason: "lexical_expression", split: "The two words locate the result in this game.", minimal: "Keep the supplied gloss together." },
    "el tiempo": { reason: "grammatical_fusion", split: "The definite article and noun are the subject of the preceding verb.", minimal: "Keep the supplied gloss together." },
    "la partida": { reason: "grammatical_fusion", split: "The definite article and noun refer to the game that just ended.", minimal: "Keep the supplied gloss together." },
    "la siete": { reason: "grammatical_fusion", split: "The feminine article supplies the implied bola before the number.", minimal: "Keep the supplied gloss together." },
    "al billar": { reason: "grammatical_fusion", split: "The contraction of a + el goes with the game name after juega in Spain.", minimal: "Keep the supplied gloss together." },
    "por aquí": { reason: "lexical_expression", split: "The phrase indicates the immediate vicinity.", minimal: "Keep the supplied gloss together." },
    "el dueño": { reason: "grammatical_fusion", split: "The article and noun form the appositive identifying Memo.", minimal: "Keep the supplied gloss together." },
    "muy tarde": { reason: "lexical_expression", split: "The degree adverb modifies the time expression.", minimal: "Keep the supplied gloss together." },
  },

  intents: {
    play_yes: { patterns: [
      "[si] un (poquito | poco) #h:h_poco",
      "si [claro] [me encanta | me gusta [mucho]] [el billar] #h:h_mucho",
      "[si] (me encanta | me gusta [mucho]) [el billar]",
      "si [juego] [un poco]", "juego un poco", "a veces", "(mas o menos | algo)",
    ] },
    play_no: { patterns: ["no [nunca he jugado] [billar | al billar] #h:h_nunca", "nunca (he jugado | juego) [billar | al billar]", "no (juego | se jugar) [billar | al billar]"] },
    name_ctx: { patterns: ["[yo] (soy | me llamo | mi nombre es) {name} #h:my_name"] },
    bare_name_ctx: { patterns: ["{name}"] },
    group_solids: { patterns: ["[yo] [quiero | prefiero | me quedo con | deme] [las] lisas [por favor] #h:h_lisas", "lisa[s]", "dame [las] lisas [por favor] #tip:tu_staff"] },
    group_stripes: { patterns: ["[yo] [quiero | prefiero | me quedo con | deme] [las] rayadas [por favor] #h:h_rayadas", "rayada[s]", "dame [las] rayadas [por favor] #tip:tu_staff"] },
    q_desde: { patterns: [
      "[y usted] desde cuando juega [billar | al billar] #h:h_desde",
      "cuanto tiempo lleva jugando [billar | al billar]", "hace cuanto (juega | que juega) [billar | al billar]",
      "[y] [tu] desde cuando juegas [billar | al billar] #tip:tu_staff", "cuanto tiempo llevas jugando [billar | al billar] #tip:tu_staff",
      "hace cuanto (juegas | que juegas) [billar | al billar] #tip:tu_staff",
    ] },
    q_diario: { patterns: [
      "juega todos los dias #h:h_diario", "juega (mucho | seguido | diario | cada noche)",
      "[tu] juegas (todos los dias | mucho | seguido | diario | cada noche) #tip:tu_staff",
    ] },
  },

  lines: {
    ...BILLIARDS_LINES,
    greet: [t("¡Buenas! | ¡{m:Bienvenido|f:Bienvenida} | a | La Buchaca! | ¿Juega | billar?", "Hi! | Welcome | to | La Buchaca! | Do-you-play | pool?", "Hi! Welcome to La Buchaca! Do you play pool?", { spain: t("¡Buenas! | ¡{m:Bienvenido|f:Bienvenida} | a | La Buchaca! | ¿Juega | al billar?", "Hi! | Welcome | to | La Buchaca! | Do-you-play | pool?", "Hi! Welcome to La Buchaca! Do you play pool?") })],
    again: [t("¡Otra vez | por aquí! | ¿Una | partida?", "Again | around-here! | A | game?", "Back again! Up for a game?")],
    yes_play: [t("¡Órale! | Entonces | echamos | una | partida.", "All-right! | Then | we-throw | a | game.", "All right! Then let's play a game.", { flags: { 0: "órale: “all right!” or “wow”, very Mexican.", 2: "echar una partida: to play a game (of pool, of cards)." }, neutral: t("¡Muy bien! | Entonces | echamos | una | partida.", "Very-good! | Then | we-throw | a | game.", "Great! Then let's play a game.", { flags: { 2: "echar una partida: to play a game (of pool, of cards)." } }) })],
    never: [t("No se preocupe, | es | fácil. | Yo | le | enseño.", "Don't-worry, | it's | easy. | I | (to) you | teach.", "Don't worry, it's easy. I'll show you.")],
    name_me: [t("Yo | soy | Memo, | el dueño. | ¿Y | usted, | cómo | se llama?", "I | am | Memo, | the owner. | And | you, | how | are-you-called?", "I'm Memo, the owner. And what's your name?")],
    nice: [t("Mucho | gusto.", "Much | pleasure.", "Nice to meet you.")],
    rules: [t("Aquí | se canta | cada | tiro: | la bola | y | la buchaca.", "Here | one-calls | each | shot: | the ball | and | the pocket.", "Here you call every shot: the ball and the pocket.", { flags: { 1: "cantar: to sing; in pool, to call your shot out loud.", 6: "buchaca: a pocket of the pool table (Mexico)." }, neutral: t("Aquí | se canta | cada | tiro: | la bola | y | la tronera.", "Here | one-calls | each | shot: | the ball | and | the pocket.", "Here you call every shot: the ball and the pocket.", { flags: { 1: "cantar: to sing; in pool, to call your shot out loud.", 6: "tronera: a pocket of the pool table." } }) })],
    rules_win: [t("Meta | sus | cuatro | bolas | y | luego | la ocho.", "Sink | your | four | balls | and | then | the eight.", "Sink your four balls, then the eight ball.")],
    my_years: [t("Desde | chavo. | Mi | papá | tenía | esta | cantina.", "Since | kid. | My | dad | had | this | cantina.", "Since I was a kid. My dad had this cantina.", { flags: { 1: "chavo: a kid, a young guy (Mexico)." }, neutral: t("Desde | niño. | Mi | papá | tenía | esta | cantina.", "Since | child. | My | dad | had | this | cantina.", "Since I was a kid. My dad had this cantina.") })],
    every_night: [t("Todas | las | noches. | ¡A veces | hasta | muy tarde!", "All | the | nights. | Sometimes | until | very-late!", "Every night. Sometimes till very late!")],
    lets_play: [t("Ándele, | usted | rompe. | ¡Suerte!", "Go-on, | you | break. | Luck!", "Go on, you break. Good luck!", { flags: { 0: "ándele: “go on”, ándale said to someone you call usted (Mexico).", 2: "romper: to break, the first shot of a game of pool." }, neutral: t("Bueno, | usted | rompe. | ¡Suerte!", "Well, | you | break. | Luck!", "OK, you break. Good luck!", { flags: { 2: "romper: to break, the first shot of a game of pool." } }) })],
    bye: [t("¡Que | le | vaya | bien!", "That | (to) you | it-goes | well!", "Take care!")],
  },
  hints: {
    play: { lt: "Answer Don Memo", items: [
      { id: "h_poco", s: t("Un | poquito.", "A | little-bit.", "A little.") },
      { id: "h_mucho", s: t("¡Sí, | me encanta!", "Yes, | I-love-it!", "Yes, I love it!") },
      { id: "h_nunca", s: t("No, | nunca | he jugado.", "No, | never | I-have-played.", "No, I've never played.") },
    ] },
    name: { lt: "Say your name", items: [{ id: "my_name", s: nameHint() }] },
    group: { lt: "Choose your balls", items: [
      { id: "h_lisas", s: BILLIARDS_LINES.h_lisas[0] },
      { id: "h_rayadas", s: BILLIARDS_LINES.h_rayadas[0] },
    ] },
    ask: { lt: "Ask Don Memo something", items: [
      { id: "h_desde", s: t("¿Desde | cuándo | juega?", "Since | when | do-you-play?", "How long have you played?") },
      { id: "h_diario", s: t("¿Juega | todos | los | días?", "Do-you-play | all | the | days?", "Do you play every day?") },
    ] },
  },

  mission: [
    { step: "play", lt: "Say if you play pool" },
    { step: "name", lt: "Tell Don Memo your name" },
    { step: "group", lt: "Choose solids or stripes" },
  ],
  steps: [
    { id: "play", done: (c) => !!c.s.play, ask: (c) => c.say(c.visits >= 1 ? "again" : "greet"),
      expects: ["play_yes", "play_no"], suggest: [{ lt: "Answer Don Memo", hint: "play" }],
      yes: (c) => play(c, "yes_play"), no: (c) => play(c, "never"), help: (c) => play(c, "yes_play") },
    { id: "name", done: (c) => !!c.s.named, ask: (c) => c.say("name_me"),
      expects: ["name_ctx", "bare_name_ctx"], suggest: [{ lt: "Say your name", hint: "name" }], help: introduced },
    { id: "group", done: (c) => !!c.s.group, ask: (c) => c.say("bl_which"),
      expects: ["group_solids", "group_stripes"], suggest: [{ lt: "Choose your balls", hint: "group" }],
      help: (c) => group(c, "solids") },
    { id: "ask", done: (c) => !!c.s.ready, ask: () => {},
      expects: ["q_desde", "q_diario", "g_ok", "g_thanks", "g_bye"],
      suggest: [{ lt: "Ask Don Memo something", hint: "ask" }], hints: ["ask", "g_social"], yes: ready, no: ready, help: ready },
  ],
  handlers: {
    play_yes: (c) => play(c, "yes_play"),
    play_no: (c) => play(c, "never"),
    name_ctx: introduced,
    bare_name_ctx: introduced,
    group_solids: (c) => group(c, "solids"),
    group_stripes: (c) => group(c, "stripes"),
    q_desde: (c) => question(c, "my_years"),
    q_diario: (c) => question(c, "every_night"),
    g_ok: ready,
    g_thanks: ready,
    g_bye: (c) => { c.say("bye"); c.end(); c.hold(); },
  },
  start(c) { c.ask("play"); },
  finish(c) {
    c.say("lets_play");
    c.event("billiards", { group: c.s.group });
    c.complete();
    c.end();
  },

  tests: [
    { say: "Un poquito.", intent: "play_yes", step: "play" },
    { say: "¡Sí, me encanta!", intent: "play_yes", step: "play" },
    { say: "No, nunca he jugado.", intent: "play_no", step: "play" },
    { say: "Me llamo Ana.", intent: "name_ctx", step: "name", slots: { name: "Ana" } },
    { say: "Las lisas, por favor.", intent: "group_solids", step: "group" },
    { say: "Yo quiero las rayadas.", intent: "group_stripes", step: "group" },
    { say: "¿Desde cuándo juega?", intent: "q_desde", step: "ask" },
    { say: "¿Juega todos los días?", intent: "q_diario", step: "ask" },
  ],
  sims: [
    { name: "experienced player chooses solids and asks about Memo", turns: ["Un poquito.", "Me llamo Ana.", "Las lisas, por favor.", "¿Desde cuándo juega?"],
      expect: { complete: true, state: { play: "yes_play", named: true, group: "solids", my_years: true } }, auto },
    { name: "beginner chooses stripes and skips the question", turns: ["No, nunca he jugado.", "Ana.", "Yo quiero las rayadas.", "Gracias."],
      expect: { complete: true, state: { play: "never", named: true, group: "stripes" } }, auto },
    { name: "early farewell", turns: ["Un poquito.", "Me llamo Ana.", "Adiós."], expect: { complete: false } },
  ],
};

export default billar;
