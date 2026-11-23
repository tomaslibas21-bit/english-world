import { PHOTO_WALK_HINTS, PHOTO_WALK_INTENTS, PHOTO_WALK_LINES, PHOTO_WALK_META, PHOTO_WALK_NPC, PHOTO_WALK_SITUATION } from "../photo-walk-lines";
import type { Ctx, SituationDef } from "@/content/types";

function leave(c: Ctx) {
  c.say("pw_bye");
  c.end();
  c.hold();
}

const photoWalk: SituationDef = {
  title: PHOTO_WALK_META.title,
  topic: PHOTO_WALK_META.topic,
  goal: PHOTO_WALK_META.goal,
  intro: PHOTO_WALK_META.intro,
  mission: [...PHOTO_WALK_META.mission],
  id: PHOTO_WALK_SITUATION,
  bonus: true,
  optionalVoice: true,
  song: "",
  songTitle: "",
  chapter: 9,
  order: 10,
  location: "visitor-center",
  npc: PHOTO_WALK_NPC,
  mode: "talk",
  lines: { ...PHOTO_WALK_LINES },
  hints: PHOTO_WALK_HINTS,
  merges: {
    "otra vez": { reason: "lexical_expression", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "puerto colibrí": { reason: "grammatical_fusion", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "nos vemos": { reason: "lexical_expression", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "a ver": { reason: "lexical_expression", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "has encontrado": { reason: "grammatical_fusion", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "van a": { reason: "grammatical_fusion", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "de nada": { reason: "lexical_expression", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "papel picado": { reason: "lexical_expression", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "al final": { reason: "grammatical_fusion", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "frente al": { reason: "grammatical_fusion", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "frente a": { reason: "grammatical_fusion", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "avenida juárez": { reason: "grammatical_fusion", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "junto al": { reason: "grammatical_fusion", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "por todos lados": { reason: "lexical_expression", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "por todas partes": { reason: "lexical_expression", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "después de": { reason: "grammatical_fusion", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "con gusto": { reason: "lexical_expression", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "tengo que": { reason: "grammatical_fusion", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "tal vez": { reason: "lexical_expression", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
  },
  intents: PHOTO_WALK_INTENTS,
  steps: [{
    id: "help",
    done: (c) => !!c.s.accepted,
    ask(c) {
      for (const line of [c.visits ? "pw_again" : "pw_greet", "pw_book", "pw_list", "pw_ask"]) c.say(line);
    },
    expects: ["help_yes", "help_later", "g_bye"],
    suggest: [{ lt: PHOTO_WALK_META.suggest, hint: "help" }],
    hints: ["help"],
    yes: accept,
    no: decline,
  }],
  handlers: { help_yes: accept, help_later: decline, g_bye: leave },
  start(c) { c.ask("help"); },
  tests: [
    { say: "¡Claro, con gusto!", intent: "help_yes", step: "help" },
    { say: "¡Claro! ¿Qué tengo que hacer?", intent: "help_yes", step: "help" },
    { say: "Tal vez luego.", intent: "help_later", step: "help" },
    { say: "Adiós.", intent: "g_bye", step: "help" },
  ],
  sims: [
    { name: "accepts the photo walk", turns: ["¡Claro, con gusto!"], expect: { complete: true } },
    { name: "leaves the walk for later", turns: ["Tal vez luego."], expect: { complete: false } },
    { name: "says goodbye", turns: ["Adiós."], expect: { complete: false } },
  ],
};

function accept(c: Ctx) {
  c.s.accepted = true;
  for (const line of ["pw_thanks", "pw_how", "pw_fun"]) c.say(line);
  c.event("photowalk", {});
  c.complete();
  c.end();
  c.hold();
}

function decline(c: Ctx) {
  c.say("pw_later");
  leave(c);
}

export default photoWalk;
