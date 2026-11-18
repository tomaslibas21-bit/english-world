// X06 · El Templo del Mar: Don Efraín, who keeps the ruins on the point past the beach (18 Nov 2026: the ruins are
// walked into, src/game/world/mexican.ts ruinsWalk). A chat of a minute, off the route (`bonus`): he welcomes the
// visitor at the gateway, asks if it is their first time, says what there is to know (the entry is free, one may go up
// the temple, carefully) and answers a question or two (how old the temple is, what it is called, the iguanas).
// He says usted, as an older man does to a visitor. Nothing in his lines depends on who the learner is, and they are
// in words and tenses every Spanish shares: one text for the three Spanishes.
import type { Ctx, SituationDef } from "@/content/types";
import { t } from "@/content/dsl";

const AUTO: Record<string, string> = { first: "Sí, es mi primera vez", ask: "¿Cuántos años tiene el templo?" };

/** Whether it is their first time: his answer, once. */
function first(c: Ctx, yes: boolean) {
  if (c.s.first) return;
  c.s.first = true;
  c.say(yes ? "first_yes" : "first_no");
  c.say("free");
  c.say("climb");
}

/** A question answered (or none asked): he wishes them a good visit, and the chat has done what it is for. */
function answered(c: Ctx, line?: string, more?: string) {
  if (line) c.say(line);
  if (more) c.say(more);
  if (c.s.asked) return;
  c.s.asked = true;
  // (said before the first question was put: he says what there is to know all the same)
  if (!c.s.first) { c.s.first = true; c.say("free"); c.say("climb"); }
  c.say("enjoy");
  c.complete();
}

function close(c: Ctx, thanks = false) {
  if (!c.s.closed) { c.s.closed = true; c.say(thanks ? "welcome" : "bye"); }
  c.end();
}

export const custodio: SituationDef = {
  id: "x06-custodio",
  bonus: true,
  song: "",
  songTitle: "",
  title: { en: "El Templo del Mar", lt: "The Temple of the Sea" },
  topic: { en: "En las ruinas", lt: "At the ruins" },
  chapter: 9,
  order: 5,
  location: "ruinas",
  npc: "custodio",
  mode: "talk",
  goal: "Chat with Don Efraín at the gateway: tell him if it's your first time here, and ask him something about the temple.",
  intro: "Where the beach ends, a gateway leads into the old Maya ruins. Don Efraín looks after them: he knows every stone, and he likes a chat with whoever comes in.",

  intents: {
    first_yes: { patterns: [
      "[si] es (mi | la) primera vez [aqui | en las ruinas] #h:f_si", "[si] [es] [la] primera vez", "[si] nunca (vine | he venido | habia venido | estuve | he estado) [aqui | antes]",
      "[si] (soy | estoy) (nuevo | nueva) [aqui]", "[si] no (conozco | conocia) [las ruinas | el templo | este lugar]",
    ] },
    first_no: { patterns: [
      "[no] ya conozco (las ruinas | el templo | este lugar | el lugar) #h:f_no", "[no] ya (vine | he venido | estuve | he estado) [aqui] [antes | una vez | otra vez | varias veces]",
      "[no] [es] (la | mi) (segunda | tercera) vez", "[no] (vengo | paso por aqui) (mucho | seguido | a menudo | cada dia | todos los dias)", "[no] no es (mi | la) primera vez",
    ] },
    q_old: { patterns: [
      "cuantos anos tiene [el templo | este templo | la piramide | esto] #h:q_edad", "que edad tiene [el templo | la piramide]", "(es | son) [muy] (viejo | antiguo | antiguas | viejas) [el templo | las ruinas]",
      "de (cuando | que ano | que siglo | que epoca) (es | son) [el templo | las ruinas]", "cuando (lo | las) (construyeron | hicieron)", "que tan (viejo | antiguo) es [el templo]",
    ] },
    q_name: { patterns: [
      "como se llama [el templo | este templo | la piramide | este lugar | esto] #h:q_nombre", "(cual es | que) [el] nombre (tiene | del templo | de la piramide)", "que (templo | piramide | lugar) es [este | esta | esto]",
    ] },
    q_up: { patterns: [
      "[se] (puedo | puede | podemos) subir [al templo | a la piramide | las escaleras | por las escaleras | arriba] #h:q_subir", "(puedo | se puede | podemos) (entrar | pasar | ir arriba)", "[esta] (permitido | prohibido) subir",
    ] },
    q_iguanas: { patterns: [
      "hay [muchas] iguanas [aqui | en las ruinas] #h:q_iguanas", "(y | que son) (las | esas) iguanas", "(vi | he visto | hay) una iguana", "(muerden | son peligrosas) [las iguanas]",
    ] },
    q_free: { patterns: ["cuanto (cuesta | es | vale) [la entrada | entrar]", "(hay que | tengo que | debo) pagar [la entrada | algo]", "[la entrada] es (gratis | libre | gratuita)"] },
    no_q: { patterns: ["[no] (ninguna | nada | ninguna pregunta) [gracias]", "[no] (todo | esta) (bien | claro) [gracias]", "[no] por ahora (no | nada)", "[no] solo (miro | quiero mirar | voy a mirar | estoy mirando)"] },
  },

  lines: {
    greet: [t("¡Buenas | tardes! | Pase, | por favor.", "Good | afternoon! | Come in, | please.", "Good afternoon! Come in, please.")],
    again: [t("¡Buenas | tardes | otra | vez! | Pase, | pase.", "Good | afternoon | another | time! | Come in, | come in.", "Good afternoon again! Come in, come in.")],
    ask_first: [t("¿Es | su | primera | vez | aquí?", "Is-it | your | first | time | here?", "Is it your first time here?")],
    first_yes: [t("¡Qué | bueno! | Le | va | a | gustar.", "How | good! | (To) you | it-is-going | to | please.", "How nice! You're going to like it.")],
    first_no: [t("Entonces | ya | conoce | el | camino.", "Then | already | you-know | the | way.", "Then you already know the way.")],
    free: [t("La | entrada | es | gratis.", "The | entry | is | free.", "Entry is free.")],
    climb: [t("Puede | subir | al | templo, | pero | con | cuidado.", "You-can | go up | to-the | temple, | but | with | care.", "You can go up to the temple, but be careful.")],
    ask_q: [t("¿Tiene | alguna | pregunta?", "Do-you-have | any | question?", "Do you have any questions?")],
    old: [t("Tiene | unos | ochocientos | años.", "It-has | about | eight hundred | years.", "It's about eight hundred years old.",
      { flags: { 1: "unos: before a number it means “about”: unos ochocientos años = about eight hundred years." } })],
    name: [t("Se | llama | el | Templo | del | Mar.", "Itself | it-calls | the | Temple | of-the | Sea.", "It's called the Temple of the Sea.")],
    name2: [t("Mira | al | mar | desde | siempre.", "It-looks | at-the | sea | since | always.", "It has always looked out to sea.")],
    up: [t("Sí, | claro. | Suba | despacio: | los | escalones | son | altos.", "Yes, | of course. | Go up | slowly: | the | steps | are | high.", "Yes, of course. Go up slowly: the steps are high.")],
    iguanas: [t("Muchas. | Son | las | dueñas | del | lugar.", "Many. | They-are | the | owners | of-the | place.", "Lots. They own the place.")],
    no_q: [t("Muy | bien. | Adelante, | entonces.", "Very | well. | Go ahead, | then.", "All right. Go ahead, then.")],
    enjoy: [t("Disfrute | su | visita.", "Enjoy | your | visit.", "Enjoy your visit.")],
    welcome: [t("Para | servirle.", "For | to-serve-you.", "At your service.")],
    bye: [t("¡Que | le | vaya | bien!", "That | (to) you | it-goes | well!", "Take care!")],
  },

  hints: {
    first: {
      lt: "Answer Don Efraín",
      items: [
        { id: "f_si", s: t("Sí, | es | mi | primera | vez.", "Yes, | it-is | my | first | time.", "Yes, it's my first time.") },
        { id: "f_no", s: t("No, | ya | conozco | las | ruinas.", "No, | already | I-know | the | ruins.", "No, I already know the ruins.") },
      ],
    },
    ask: {
      lt: "Ask about the temple",
      items: [
        { id: "q_edad", s: t("¿Cuántos | años | tiene | el | templo?", "How many | years | has | the | temple?", "How old is the temple?") },
        { id: "q_nombre", s: t("¿Cómo | se | llama | el | templo?", "How | itself | calls | the | temple?", "What is the temple called?") },
        { id: "q_subir", s: t("¿Puedo | subir?", "Can-I | go up?", "Can I go up?") },
        { id: "q_iguanas", s: t("¿Hay | iguanas | aquí?", "Are-there | iguanas | here?", "Are there iguanas here?") },
      ],
    },
  },

  mission: [
    { step: "first", lt: "Tell him if it's your first time" },
    { step: "ask", lt: "Ask something about the temple" },
  ],

  steps: [
    { id: "first", done: (c) => !!c.s.first,
      ask: (c) => c.say("ask_first"),
      expects: ["first_yes", "first_no"],
      suggest: [{ lt: "Answer Don Efraín", hint: "first" }, { lt: "Ask about the temple", hint: "ask" }],
      yes: (c) => first(c, true),
      no: (c) => first(c, false),
      help: (c) => first(c, true) },
    { id: "ask", done: (c) => !!c.s.asked,
      ask: (c) => c.say("ask_q"),
      expects: ["q_old", "q_name", "q_up", "q_iguanas", "no_q"],
      suggest: [{ lt: "Ask about the temple", hint: "ask" }, { lt: "Say no, thanks", hint: "g_no" }],
      yes: (c) => { c.say("ask_q"); },
      no: (c) => answered(c, "no_q"),
      help: (c) => answered(c, "no_q") },
  ],

  start: (c) => { c.say(c.visits >= 1 ? "again" : "greet"); },

  handlers: {
    first_yes(c) { first(c, true); },
    first_no(c) { first(c, false); },
    q_old(c) { answered(c, "old"); },
    q_name(c) { answered(c, "name", "name2"); },
    q_up(c) { answered(c, "up"); },
    q_iguanas(c) { answered(c, "iguanas"); },
    q_free(c) { c.say("free"); },
    no_q(c) { answered(c, "no_q"); },
    g_thanks(c) { if (c.s.asked) close(c, true); else c.say("welcome"); },
    g_bye(c) { close(c); if (!c.s.asked) c.hold(); },
  },

  // he has said what there is to know: another question, a thank you or a goodbye
  finish: (c) => {
    c.expect({ id: "closing", optional: true, hints: ["g_social", "ask"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }, { lt: "Ask about the temple", hint: "ask" }],
      on: { g_thanks: (cc) => { close(cc, true); return true; }, g_bye: (cc) => { close(cc); return true; } },
      yes: (cc) => close(cc), no: (cc) => close(cc) });
  },

  tests: [
    { say: "Sí, es mi primera vez", intent: "first_yes", step: "first" },
    { say: "Es la primera vez", intent: "first_yes", step: "first" },
    { say: "No, ya conozco las ruinas", intent: "first_no", step: "first" },
    { say: "Ya vine antes", intent: "first_no", step: "first" },
    { say: "Ya he estado aquí", intent: "first_no", step: "first" },
    { say: "¿Cuántos años tiene el templo?", intent: "q_old", step: "ask" },
    { say: "¿Es muy antiguo el templo?", intent: "q_old", step: "ask" },
    { say: "¿Cómo se llama el templo?", intent: "q_name", step: "ask" },
    { say: "¿Puedo subir?", intent: "q_up", step: "ask" },
    { say: "¿Se puede subir a la pirámide?", intent: "q_up", step: "ask" },
    { say: "¿Hay iguanas aquí?", intent: "q_iguanas", step: "ask" },
    { say: "¿Cuánto cuesta la entrada?", intent: "q_free" },
    { say: "Ninguna, gracias", intent: "no_q", step: "ask" },
    { say: "Solo quiero mirar", intent: "no_q", step: "ask" },
    { say: "La pizza tiene queso", intent: "none" },
    { say: "Mi coche es azul", intent: "none" },
  ],

  sims: [
    { name: "the first time; how old; thanks", turns: ["Sí, es mi primera vez.", "¿Cuántos años tiene el templo?", "Muchas gracias."],
      expect: { complete: true, state: { first: true, asked: true, closed: true } }, auto: AUTO },
    { name: "been before; may I go up; goodbye", turns: ["No, ya conozco las ruinas.", "¿Puedo subir?", "Adiós"],
      expect: { complete: true, state: { first: true, asked: true, closed: true } }, auto: AUTO },
    { name: "a bare yes; its name; the iguanas too; thanks", turns: ["Sí", "¿Cómo se llama el templo?", "¿Hay iguanas aquí?", "Gracias"],
      expect: { complete: true, state: { asked: true } }, auto: AUTO },
    { name: "a question straight away; no more questions", turns: ["¿Puedo subir?", "Gracias, adiós"],
      expect: { complete: true, state: { first: true, asked: true } }, auto: AUTO },
    { name: "no questions at all", turns: ["No", "No, gracias", "Gracias"],
      expect: { complete: true, state: { first: true, asked: true } }, auto: AUTO },
  ],
};

export default custodio;
