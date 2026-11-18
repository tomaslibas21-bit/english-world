// X04 · El corazón de Ka'an: the great tree of the grotto's last chamber speaks (src/game/cave), 18 Nov 2026.
// Off the route (`bonus`), like the aluxes' conversations. It opens when the learner walks up to the Yaxché after all
// fifteen stones are lit (the heart found): the tree has waited for them, welcomes them to this land as one who now
// belongs to it, and asks one thing of them: to keep learning. Short and slow: the tree says a little, the learner
// answers three times (who are you?, I feel at home, I'll keep going), and it ends with what the grotto does next: the stones
// have more to tell (the stones speak again from then on: stones.ts, cave/quest.ts).
// The tree says tú. Nothing in its lines depends on who the learner is (no name, no country, no gender), and they are
// in tenses every Spanish shares, so one text serves the three Spanishes.
// The same file carries the stones' own lines as hint groups (../stones): they are phrases of this conversation in
// the phrasebook, in the Lithuanian layer and in the voices, and said to the tree they are understood.
import type { Ctx, SituationDef } from "@/content/types";
import { t } from "@/content/dsl";
import { STONE_GROUPS, STONE_PATTERNS } from "../stones";

const YAXCHE = "Yaxché: the first tree of the Maya, a great ceiba that holds up the sky; its roots reach the underworld.";
const CENOTE = "cenote: a natural pool in a limestone sinkhole, typical of the Yucatán.";

const AUTO: Record<string, string> = { who: "¿Quién eres?", home: "Me siento en casa", promise: "Sí, voy a seguir" };

/** Who is speaking: told once, whether the learner asked, guessed or did not know. */
function tellWho(c: Ctx, guessed = false) {
  if (c.s.known) { c.say("i_am"); return; }
  c.s.known = true;
  c.say(guessed ? "know_yes" : "i_am");
  c.say("i_am2");
}

/** How the learner feels here (they like this land, they feel at home, or simply thanks): the tree's answer, once. */
function felt(c: Ctx, line: string) {
  if (c.s.felt) { c.say("glad"); return; }
  c.s.felt = true;
  c.say(line);
}

/** What the tree leaves the learner with; the grotto hears it (the stones wake again). The goal is met here; a thank
 *  you or a goodbye may follow (finish). */
function farewell(c: Ctx) {
  c.say("keep");
  c.say("back");
  c.event("tree-heard", {});
  c.complete();
}

/** The last word: "Hasta pronto. Aquí estaré." */
function close(c: Ctx) {
  if (!c.s.closed) { c.s.closed = true; c.say("bye"); }
  c.end();
}

function promise(c: Ctx) {
  if (c.s.promised) { c.say("glad"); return; }
  c.s.promised = true;
  c.say("glad");
  farewell(c);
}

/** Not today: the tree lets them rest, and says the rest all the same (nobody is kept on the island). */
function notToday(c: Ctx) {
  if (c.s.promised) return;
  c.s.promised = true;
  c.say("rest");
  farewell(c);
}

export const yaxche: SituationDef = {
  id: "x04-yaxche",
  bonus: true,
  // no course song: a string that names none (src/editions/es/content/radio.ts songOfSituation → null)
  song: "X04",
  songTitle: "El corazón de Ka'an",
  title: { en: "El corazón de Ka'an", lt: "The heart of Ka'an" },
  topic: { en: "El árbol que habla", lt: "The tree that speaks" },
  chapter: 9,
  order: 3,
  location: "gruta",
  npc: "yaxche",
  mode: "talk",
  goal: "Listen to the great tree, thank it, and tell it you'll keep learning.",
  intro: "All fifteen stones are lit, and the great tree on its island has flowered for you. As you come close, something stirs in its leaves: the Yaxché itself begins to speak, slowly, in a voice as old as the water.",

  intents: {
    who_q: { patterns: ["[no] quien eres [tu] #h:w_quien", "y tu quien eres", "que eres [tu]", "como te llamas", "que arbol eres", "quien (habla | me habla)"] },
    // "Eres el árbol sagrado", "¿El Yaxché?", "La ceiba"
    know_tree: { patterns: [
      "[tu] eres (el | un) arbol [sagrado | grande | viejo | del mundo | de la vida] #h:w_arbol", "[tu] eres (el | un) (yaxche | yashche | yaxce)",
      "[tu] eres (la | una) ceiba [sagrada]", "(el | un) arbol [sagrado]", "(el | la) (yaxche | yashche | ceiba)", "el corazon de la gruta",
    ] },
    like_land: { patterns: [
      "me (gusta | encanta) [mucho] (esta tierra | este lugar | aqui | la gruta | estar aqui | mexico | este pais) #h:th_gusta",
      "(amo | quiero) [mucho] (esta tierra | este lugar | mexico | este pais)", "(que | es [muy]) (bonita | hermosa | linda) [es] (esta tierra | la gruta)",
      "(que | es [muy]) (bonito | hermoso | lindo) [es] (este lugar | aqui)",
    ] },
    feel_home: { patterns: [
      "me siento en casa #h:th_casa", "(estoy | me siento) como en casa", "[ya | si] es mi casa [tambien]", "me siento [muy] (bien | feliz) [aqui]",
      "estoy [muy] (feliz | contento | contenta) [aqui | de estar aqui]",
    ] },
    promise: { patterns: [
      "[si] (voy | vamos) a (seguir | continuar) [aprendiendo | estudiando | hablando | practicando] #h:p_seguir", "[si] poco a poco #h:p_poco",
      "[si] te lo prometo #h:p_prometo", "[si] lo prometo", "[si] (claro | claro que si | por supuesto) #h:p_claro",
      "[si] (sigo | seguire | continuo | voy a seguir) [aprendiendo | adelante]", "[si] (quiero | voy a) (aprender | hablar | practicar) [mas] [espanol]",
      "(nunca | no) voy a (parar | dejar de aprender)", "[si] (siempre | todos los dias | cada dia)",
    ] },
    // "No sé", "Es difícil", "Estoy cansada": the tree lets them rest
    wont_ctx: { patterns: ["no (puedo | quiero)", "(estoy | ando) [muy] (cansado | cansada)", "es [muy] dificil", "(tal vez | quizas | a lo mejor | no estoy seguro | no estoy segura)", "hoy no"] },
    q_age: { patterns: ["cuantos anos tienes #h:q_edad", "que edad tienes", "eres [muy] (viejo | vieja | antiguo | antigua)"] },
    q_aluxes: { patterns: ["(donde | en donde) estan los aluxes #h:q_aluxes", "y los aluxes", "(conoces | ves) a los aluxes", "donde (esta | estan) (kin | nikte)"] },
    // a stone's own line, said to the tree
    stone_say: { patterns: STONE_PATTERNS },
  },

  lines: {
    greet: [t("Te | estaba | esperando.", "You | I-was | waiting-for.", "I was waiting for you.")],
    stones_lit: [t("Las | quince | piedras | brillan | gracias | a | ti.", "The | fifteen | stones | shine | thanks | to | you.", "The fifteen stones shine thanks to you.")],
    again: [t("Aquí | estás | otra | vez. | ¡Qué | alegría!", "Here | you-are | another | time. | What | joy!", "Here you are again. What a joy!")],
    ask_who: [t("¿Sabes | quién | soy?", "Do-you-know | who | I-am?", "Do you know who I am?")],
    i_am: [t("Soy | el | Yaxché, | el | árbol | que | sostiene | el | mundo.", "I-am | the | Yaxché, | the | tree | that | holds up | the | world.",
      "I am the Yaxché, the tree that holds up the world.", { flags: { 2: YAXCHE } })],
    know_yes: [t("Sí. | Y | ahora | yo | te | conozco | a | ti.", "Yes. | And | now | I | you | know | (to) | you.", "Yes. And now I know you.")],
    i_am2: [t("Mis | raíces | beben | del | cenote; | mis | ramas | tocan | el | cielo.", "My | roots | drink | from-the | cenote; | my | branches | touch | the | sky.",
      "My roots drink from the cenote; my branches touch the sky.", { flags: { 4: CENOTE } })],
    root: [t("Cada | palabra | que | aprendes | es | una | raíz.", "Each | word | that | you-learn | is | a | root.", "Every word you learn is a root.")],
    home: [t("Aquí | ya | no | eres | visitante: | esta | tierra | también | es | tu | casa.", "Here | already | not | you-are | visitor: | this | land | also | is | your | home.",
      "You are no longer a visitor here: this land is your home too.")],
    home_again: [t("Esta | tierra | también | es | tu | casa.", "This | land | also | is | your | home.", "This land is your home too.")],
    thanks_back: [t("Gracias | a | ti, | por | escuchar.", "Thanks | to | you, | for | listening.", "Thank you, for listening.")],
    like_back: [t("Y | esta | tierra | te | quiere | a | ti.", "And | this | land | you | loves | (to) | you.", "And this land loves you.")],
    slow: [t("No | tengas | prisa: | los | árboles | crecemos | despacio | y | llegamos | al | cielo.",
      "Not | have | hurry: | the | trees | we-grow | slowly | and | we-reach | to-the | sky.", "Don't hurry: we trees grow slowly, and we reach the sky.",
      { flags: { 5: "crecemos: “we grow”. The tree counts itself among the trees: los árboles crecemos = we trees grow." } })],
    ask_go: [t("¿Vas | a | seguir | aprendiendo?", "Are-you-going | to | keep | learning?", "Will you keep learning?")],
    glad: [t("Eso | me | alegra | el | corazón.", "That | (to) me | gladdens | the | heart.", "That gladdens my heart.")],
    rest: [t("Descansa, | entonces. | Mañana | las | palabras | te | esperan | aquí.", "Rest, | then. | Tomorrow | the | words | you | await | here.",
      "Rest, then. Tomorrow the words will be waiting for you here.")],
    keep: [t("Sigue | hablando, | sigue | escuchando. | Yo | guardo | tus | palabras.", "Keep | speaking, | keep | listening. | I | keep | your | words.",
      "Keep speaking, keep listening. I keep your words.")],
    back: [t("Vuelve | cuando | quieras. | Las | piedras | tienen | más | que | contarte.", "Come back | when | you-want. | The | stones | have | more | that | to-tell-you.",
      "Come back whenever you like. The stones have more to tell you.")],
    bye: [t("Hasta | pronto. | Aquí | estaré.", "Until | soon. | Here | I'll-be.", "See you soon. I'll be here.")],
    // side questions
    age: [t("Más | que | las | piedras. | Ya | no | cuento | los | años.", "More | than | the | stones. | Already | not | I-count | the | years.", "Older than the stones. I no longer count the years.")],
    aluxes: [t("Cerca. | Siempre | están | cerca... | y | siempre | ríen.", "Near. | Always | they-are | near... | and | always | they-laugh.", "Nearby. They're always nearby… and always laughing.")],
    stone_ok: [t("Hablas | como | las | piedras. | ¡Muy | bien!", "You-speak | like | the | stones. | Very | well!", "You speak like the stones. Very good!")],
  },

  hints: {
    who: {
      lt: "Answer the tree",
      items: [
        { id: "w_quien", s: t("No. | ¿Quién | eres?", "No. | Who | are-you?", "No. Who are you?") },
        { id: "w_arbol", s: t("Eres | el | árbol | sagrado.", "You-are | the | tree | sacred.", "You're the sacred tree.") },
      ],
    },
    feel: {
      lt: "Say how you feel here",
      items: [
        { id: "th_casa", s: t("Me | siento | en | casa.", "Myself | I-feel | at | home.", "I feel at home.") },
        { id: "th_gusta", s: t("Me gusta | esta | tierra.", "I like | this | land.", "I like this land.") },
        { id: "th_gracias", s: t("Gracias, | Yaxché.", "Thanks, | Yaxché.", "Thank you, Yaxché.") },
      ],
    },
    promise: {
      lt: "Say you'll keep learning",
      items: [
        { id: "p_seguir", s: t("Sí, | voy | a | seguir.", "Yes, | I'm-going | to | continue.", "Yes, I'll keep going.") },
        { id: "p_poco", s: t("Sí, | poco | a | poco.", "Yes, | little | by | little.", "Yes, little by little.") },
        { id: "p_prometo", s: t("Te | lo | prometo.", "(To) you | it | I-promise.", "I promise you.") },
        { id: "p_claro", s: t("¡Claro | que | sí!", "Of course | that | yes!", "Of course!") },
      ],
    },
    ask: {
      lt: "Ask the tree",
      items: [
        { id: "q_edad", s: t("¿Cuántos | años | tienes?", "How many | years | you-have?", "How old are you?") },
        { id: "q_aluxes", s: t("¿Dónde | están | los | aluxes?", "Where | are | the | aluxes?", "Where are the aluxes?") },
      ],
    },
    // what the glyph stones say (their own groups, by chamber; never suggested here)
    ...STONE_GROUPS,
  },

  mission: [
    { step: "who", lt: "Find out who is speaking" },
    { step: "home", lt: "Say how you feel here" },
    { step: "promise", lt: "Say you'll keep learning" },
  ],

  steps: [
    { id: "who", done: (c) => !!c.s.known,
      ask: (c) => c.say("ask_who"),
      expects: ["who_q", "know_tree"],
      suggest: [{ lt: "Answer the tree", hint: "who" }, { lt: "Say yes or no", hint: "g_yesno" }],
      yes: (c) => tellWho(c, true),
      no: (c) => tellWho(c),
      help: (c) => tellWho(c) },
    { id: "home", done: (c) => !!c.s.felt,
      ask: (c) => { if (c.s.homeSaid) c.say("home_again"); else { c.s.homeSaid = true; c.say("root"); c.say("home"); } },
      expects: ["like_land", "feel_home"],
      suggest: [{ lt: "Say how you feel here", hint: "feel" }, { lt: "Ask the tree", hint: "ask" }],
      yes: (c) => felt(c, "like_back"),
      no: (c) => { c.s.felt = true; },
      help: (c) => { c.s.felt = true; } },
    { id: "promise", done: (c) => !!c.s.promised,
      ask: (c) => { if (c.s.goAsked) c.say("ask_go"); else { c.s.goAsked = true; c.say("slow"); c.say("ask_go"); } },
      expects: ["promise", "wont_ctx"],
      suggest: [{ lt: "Say you'll keep learning", hint: "promise" }, { lt: "Ask the tree", hint: "ask" }],
      yes: (c) => promise(c),
      no: (c) => notToday(c),
      help: (c) => notToday(c) },
  ],

  init: (c) => {
    c.s.known = false;
  },

  start: (c) => {
    if (c.visits >= 1) { c.s.known = true; c.say("again"); }
    else { c.say("greet"); c.say("stones_lit"); }
  },

  handlers: {
    who_q(c) { tellWho(c); },
    know_tree(c) { tellWho(c, true); },
    like_land(c) { felt(c, "like_back"); },
    feel_home(c) { felt(c, "like_back"); },
    promise(c) { promise(c); },
    wont_ctx(c) { notToday(c); },
    q_age(c) { c.say("age"); },
    q_aluxes(c) { c.say("aluxes"); },
    stone_say(c) { c.say("stone_ok"); },
    // thanks: the answer to "this land is your home too", or, after the tree's last words, the goodbye
    g_thanks(c) { if (c.s.promised) close(c); else felt(c, "thanks_back"); },
    // leaving early: the tree lets them go, and waits (the rest is for another visit)
    g_bye(c) { close(c); if (!c.s.promised) c.hold(); },
  },

  // the tree has said what it had to say: a thank you or a goodbye ends it
  finish: (c) => {
    c.expect({ id: "closing", optional: true, hints: ["g_social"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }],
      on: { g_thanks: (cc) => { close(cc); return true; }, g_bye: (cc) => { close(cc); return true; } },
      yes: (cc) => close(cc), no: (cc) => close(cc) });
  },

  tests: [
    { say: "¿Quién eres?", intent: "who_q", step: "who" },
    { say: "No. ¿Quién eres?", intent: "who_q", step: "who" },
    { say: "Eres el árbol sagrado", intent: "know_tree", step: "who" },
    { say: "¿Eres el Yaxché?", intent: "know_tree", step: "who" },
    { say: "Eres una ceiba", intent: "know_tree", step: "who" },
    { say: "Me gusta esta tierra", intent: "like_land", step: "home" },
    { say: "Me encanta este lugar", intent: "like_land", step: "home" },
    { say: "Me siento en casa", intent: "feel_home", step: "home" },
    { say: "Estoy muy feliz aquí", intent: "feel_home", step: "home" },
    { say: "Sí, voy a seguir", intent: "promise", step: "promise" },
    { say: "Voy a seguir aprendiendo", intent: "promise", step: "promise" },
    { say: "Sí, poco a poco", intent: "promise", step: "promise" },
    { say: "Te lo prometo", intent: "promise", step: "promise" },
    { say: "¡Claro que sí!", intent: "promise", step: "promise" },
    { say: "Quiero aprender más español", intent: "promise", step: "promise" },
    { say: "Es muy difícil", intent: "wont_ctx", step: "promise", not: ["promise"] },
    { say: "Estoy cansada", intent: "wont_ctx", step: "promise", not: ["promise"] },
    { say: "¿Cuántos años tienes?", intent: "q_age" },
    { say: "¿Dónde están los aluxes?", intent: "q_aluxes" },
    // the stones' lines, said to the tree
    { say: "El agua guarda la memoria", intent: "stone_say" },
    { say: "Sigue la luz de las luciérnagas", intent: "stone_say" },
    { say: "Todo empieza con una palabra", intent: "stone_say" },
    // not understood
    { say: "La pizza tiene queso", intent: "none" },
    { say: "Mi coche es azul", intent: "none" },
  ],

  sims: [
    { name: "the first time: who, at home, a promise, thanks", turns: ["No. ¿Quién eres?", "Me siento en casa.", "Sí, voy a seguir.", "Muchas gracias, Yaxché."],
      expect: { complete: true, state: { known: true, felt: true, promised: true, closed: true } }, auto: AUTO },
    { name: "guessed; likes the land; little by little; goodbye", turns: ["Eres el árbol sagrado.", "Me gusta esta tierra.", "Sí, poco a poco.", "Adiós"],
      expect: { complete: true, state: { known: true, felt: true, promised: true, closed: true } }, auto: AUTO },
    { name: "yes and no; questions on the way", turns: ["No sé", "¿Cuántos años tienes?", "Me encanta este lugar", "¿Dónde están los aluxes?", "Te lo prometo", "Gracias"],
      expect: { complete: true, state: { promised: true } }, auto: AUTO },
    { name: "a stone's line, then tired: the tree lets them rest and still says the rest", turns: ["Sí", "El agua guarda la memoria.", "Estoy feliz aquí", "Estoy cansada", "Gracias, adiós"],
      expect: { complete: true, state: { promised: true } }, auto: AUTO },
    { name: "a bare no at the last question", turns: ["¿Quién eres?", "Me siento en casa", "No", "Gracias"],
      expect: { complete: true, state: { promised: true } }, auto: AUTO },
  ],
};

export default yaxche;
