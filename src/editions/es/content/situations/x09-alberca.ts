import type { Ctx, SituationDef } from "@/content/types";
import { t } from "@/content/dsl";
import { withWorld, WORLD_NATIONALITIES } from "../countries";
import { countryHint, nameHint } from "../personal-hints";
import { POOL_LINES } from "../pool-lines";

const countries = withWorld([]);
const near = new Set(countries.filter((country) => country.attrs?.near).map((country) => country.id));
const auto = { play: "Sí, quiero jugar.", name: "Me llamo Ana.", from: "Soy de Colombia.", ask: "Sí, claro." };

function playAnswer(c: Ctx, yes: boolean) {
  if (c.s.play) {
    if (c.step === "ask") c.s.ready = true;
    return;
  }
  c.s.play = yes ? "yes_play" : "no_play";
  c.say(c.s.play);
}

function introduced(c: Ctx) {
  if (c.s.named) return;
  c.s.named = true;
  c.say("nice");
  c.say("family");
  c.say("family2");
}

function sayOrigin(c: Ctx) {
  if (c.s.toldOrigin) return;
  c.s.toldOrigin = true;
  c.say("from_us");
}

function fromAnswer(c: Ctx, country?: string) {
  if (c.s.from) return;
  c.s.from = country ? near.has(country) ? "near" : "far" : "unknown";
  if (country) c.say(c.s.from);
  sayOrigin(c);
}

function sideQuestion(c: Ctx, topic: "age" | "origin") {
  if (topic === "origin") sayOrigin(c);
  else if (!c.s.toldAge) { c.s.toldAge = true; c.say("my_age"); }
  if (c.step === "ask") c.s.ready = true;
}

const alberca: SituationDef = {
  id: "x09-alberca",
  bonus: true,
  song: "",
  songTitle: "",
  title: { en: "La alberca", lt: "The pool" },
  topic: { en: "Junto a la alberca", lt: "By the pool" },
  chapter: 9,
  order: 8,
  location: "hotel",
  npc: "vale",
  mode: "talk",
  goal: "Chat with Vale by the pool: tell her your name and where you're from, then join the ball game.",
  intro: "At the pool of Hotel Mar Azul, three kids are keeping a beach ball in the air. The oldest, Vale, waves you over.",

  entities: { country: countries },
  grammar: { slots: { nat: { lexicon: WORLD_NATIONALITIES } } },
  intents: {
    play_yes: { patterns: [
      "[si] [claro] [yo] (quiero | puedo | me gustaria) jugar [con ustedes] #h:h_quiero",
      "[si] (claro | por supuesto | dale | va | vamos [a jugar]) #h:h_si",
    ] },
    play_no: { patterns: ["(ahorita | ahora | por ahora) no [gracias] #h:h_ahorita", "no [yo] (quiero | puedo) jugar [ahorita | ahora]"] },
    name_ctx: { patterns: ["[yo] (soy | me llamo | mi nombre es) {name} #h:my_name"] },
    bare_name_ctx: { patterns: ["{name}"] },
    from_ans: { patterns: [
      "[yo] (soy | vengo | somos | venimos) de {country} [originalmente] #h:f_from",
      "[yo] (soy | somos) [originalmente] {country:nat}",
      "[yo] (naci | creci | vivo) en {country}",
      "no (soy | vengo) de {bad:country} (soy | sino | vengo) de {country}",
      "no (soy | vengo) de {bad:country} sino de {country}",
    ] },
    from_ctx: { patterns: ["[de] {country}"] },
    from_other_ctx: { patterns: ["[yo] (soy | vengo) de {w:any}", "de {w:any}", "[yo] (naci | creci | vivo) en {w:any}"] },
    q_age: { patterns: ["[y] [tu] cuantos anos tienes [tu] #h:h_edad", "[y] [tu] que edad tienes", "cual es tu edad"] },
    q_from: { patterns: [
      "[y tu | y ustedes | y] de donde (eres | son) [tu | ustedes] #h:h_dedonde",
      "[tu | ustedes] de donde (eres | son)", "[de] donde (vienes | vienen | vives | viven) [tu | ustedes]",
    ] },
  },

  lines: {
    greet: [t("¡Hola! | ¿Quieres | jugar | con | nosotros?", "Hi! | Do-you-want | to-play | with | us?", "Hi! Do you want to play with us?")],
    again: [t("¡Hola | otra | vez! | ¿Jugamos?", "Hi | another | time! | Shall-we-play?", "Hi again! Shall we play?")],
    yes_play: [t("¡Sí! | ¡Qué | padre!", "Yes! | How | cool!", "Yay! Cool!", { flags: { 2: "padre: in Mexico, ¡qué padre! means “how cool!”." } })],
    no_play: [t("Ándale, | nomás | un | ratito.", "Come-on, | just | a | little-while.", "Come on, just for a little while.", { flags: { 0: "ándale: “come on”, said to coax someone (Mexico).", 1: "nomás: “just, only” (Mexico)." } })],
    name_me: [t("Yo | me | llamo | Vale. | ¿Y | tú, | cómo | te | llamas?", "I | myself | call | Vale. | And | you, | how | yourself | you-call?", "I'm Vale. What's your name?")],
    nice: [t("¡Mucho | gusto!", "Much | pleasure!", "Nice to meet you!")],
    family: [t("Él | es | mi | hermano | Diego. | Tiene | once | años.", "He | is | my | brother | Diego. | He-has | eleven | years.", "That's my brother Diego. He's eleven.")],
    family2: [t("Y | el | chiquito | es | Santi. | Tiene | seis.", "And | the | little-one | is | Santi. | He-has | six.", "And the little one is Santi. He's six.")],
    ask_where: [t("¿De | dónde | eres?", "From | where | you-are?", "Where are you from?")],
    far: [t("¡Órale, | qué | lejos!", "Wow, | how | far!", "Wow, that's far!", { flags: { 0: "órale: “wow” or “OK”, very Mexican." } })],
    near: [t("¡Ah, | qué | cerquita!", "Oh, | how | close-by!", "Oh, that's close!")],
    from_us: [t("Nosotros | somos | de | Mérida. | Venimos | de | vacaciones.", "We | are | from | Mérida. | We-come | on | vacation.", "We're from Mérida. We're here on vacation.")],
    my_age: [t("Tengo | nueve. | ¡Ya | casi | diez!", "I-have | nine. | Already | almost | ten!", "I'm nine. Almost ten!")],
    lets_play: [t("¡Vamos | a | jugar!", "Let's-go | to | play!", "Let's play!")],
    bye: [t("¡Adiós! | ¡Vuelve | pronto!", "Bye! | Come-back | soon!", "Bye! Come back soon!")],
    ...POOL_LINES,
  },

  hints: {
    play: {
      lt: "Answer Vale",
      items: [
        { id: "h_si", s: t("¡Sí, | claro!", "Yes, | of-course!", "Sure!") },
        { id: "h_quiero", s: t("Sí, | quiero | jugar.", "Yes, | I-want | to-play.", "Yes, I want to play.") },
        { id: "h_ahorita", s: t("Ahorita | no, | gracias.", "Right-now | no, | thanks.", "Not right now, thanks.", { flags: { 0: "ahorita: “right now” or “in a bit” (Mexico)." } }) },
      ],
    },
    name: { lt: "Say your name", items: [{ id: "my_name", s: nameHint() }] },
    from: {
      lt: "Say where you're from", slot: "country", examples: ["canada", "usa", "uk"],
      items: [{ id: "f_from", s: countryHint() }],
    },
    ask: {
      lt: "Ask Vale something",
      items: [
        { id: "h_edad", s: t("¿Cuántos | años | tienes?", "How-many | years | you-have?", "How old are you?") },
        { id: "h_dedonde", s: t("¿Y | tú, | de | dónde | eres?", "And | you, | from | where | you-are?", "And where are you from?") },
      ],
    },
  },

  mission: [
    { step: "play", lt: "Say if you want to play" },
    { step: "name", lt: "Tell Vale your name" },
    { step: "from", lt: "Tell her where you're from" },
  ],
  steps: [
    { id: "play", done: (c) => !!c.s.play, ask: (c) => c.say(c.visits >= 1 ? "again" : "greet"),
      expects: ["play_yes", "play_no"], suggest: [{ lt: "Answer Vale", hint: "play" }, { lt: "Ask Vale something", hint: "ask" }],
      yes: (c) => playAnswer(c, true), no: (c) => playAnswer(c, false), help: (c) => playAnswer(c, true) },
    { id: "name", done: (c) => !!c.s.named, ask: (c) => c.say("name_me"),
      expects: ["name_ctx", "bare_name_ctx"], suggest: [{ lt: "Say your name", hint: "name" }, { lt: "Ask Vale something", hint: "ask" }],
      help: introduced },
    { id: "from", done: (c) => !!c.s.from, ask: (c) => c.say("ask_where"),
      expects: ["from_ans", "from_ctx", "from_other_ctx"],
      suggest: [{ lt: "Say where you're from", hint: "from", options: "country" }, { lt: "Ask Vale something", hint: "ask" }],
      help: (c) => fromAnswer(c) },
    { id: "ask", done: (c) => !!c.s.ready, ask: () => {},
      expects: ["q_age", "q_from", "play_yes", "play_no", "g_thanks", "g_bye"],
      suggest: [{ lt: "Ask Vale something", hint: "ask" }, { lt: "Answer Vale", hint: "play" }], hints: ["ask", "play", "g_social"],
      yes: (c) => { c.s.ready = true; }, no: (c) => { c.s.ready = true; }, help: (c) => { c.s.ready = true; } },
  ],
  handlers: {
    play_yes: (c) => playAnswer(c, true),
    play_no: (c) => playAnswer(c, false),
    name_ctx: introduced,
    bare_name_ctx: introduced,
    from_ans: (c, slots) => fromAnswer(c, slots.country),
    from_ctx: (c, slots) => fromAnswer(c, slots.country),
    from_other_ctx: (c) => fromAnswer(c),
    q_age: (c) => sideQuestion(c, "age"),
    q_from: (c) => sideQuestion(c, "origin"),
    g_thanks: (c) => { if (c.step === "ask") c.s.ready = true; },
    g_ok: (c) => { if (c.step === "ask") c.s.ready = true; },
    g_bye: (c) => { c.say("bye"); c.end(); c.hold(); },
  },
  start(c) { c.ask("play"); },
  finish(c) {
    c.say("lets_play");
    c.event("pool");
    c.complete();
    c.end();
  },

  tests: [
    { say: "Sí, quiero jugar.", intent: "play_yes", step: "play" },
    { say: "Ahorita no, gracias.", intent: "play_no", step: "play" },
    { say: "Me llamo Ana.", intent: "name_ctx", step: "name", slots: { name: "Ana" } },
    { say: "Soy de Colombia.", intent: "from_ans", step: "from", slots: { country: "colombia" } },
    { say: "Soy lituana.", intent: "from_ans", step: "from", slots: { country: "lithuania" } },
    { say: "Soy de Xylópolis.", intent: "from_other_ctx", step: "from" },
    { say: "¿Cuántos años tienes?", intent: "q_age", step: "play" },
    { say: "¿Y tú, de dónde eres?", intent: "q_from", step: "ask" },
    { say: "Adiós", intent: "g_bye", step: "ask" },
  ],
  sims: [
    { name: "yes, name, nearby country, ask age", turns: ["Sí, quiero jugar.", "Me llamo Ana.", "Soy de Colombia.", "¿Cuántos años tienes?"],
      expect: { complete: true, state: { play: "yes_play", named: true, from: "near", toldAge: true } }, auto },
    { name: "no, far country, no question", turns: ["Ahorita no, gracias.", "Ana.", "Soy de Lituania.", "Sí, claro."],
      expect: { complete: true, state: { play: "no_play", from: "far" } }, auto },
    { name: "unknown country, asks back", turns: ["Sí", "Me llamo Ana.", "Soy de Xylópolis.", "¿Y tú, de dónde eres?"],
      expect: { complete: true, state: { from: "unknown", toldOrigin: true } }, auto },
    { name: "side questions early", turns: ["¿Cuántos años tienes?", "¿De dónde eres?", "Sí", "Me llamo Ana.", "Soy de Colombia.", "¿Cuántos años tienes?"],
      expect: { complete: true, state: { from: "near", toldAge: true, toldOrigin: true } }, auto },
    { name: "goodbye before playing", turns: ["Adiós"],
      expect: { complete: false }, auto },
  ],
};

export default alberca;
