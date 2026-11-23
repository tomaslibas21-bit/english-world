import { ASK_WAY_HINTS, ASK_WAY_INTENTS, ASK_WAY_LINES, ASK_WAY_META, ASK_WAY_NPC, ASK_WAY_PLACES, ASK_WAY_SITUATION } from "../ask-way-lines";
import type { Ctx, SituationDef } from "@/content/types";

function directions(c: Ctx, id: string) {
  if (c.step !== "where" || c.s.dest || c.s.left) return;
  const place = ASK_WAY_PLACES.find((place) => place.id === id);
  if (!place) return;
  c.s.dest = place.id;
  c.event("directions-asked", { dest: place.id });
  for (const line of place.lines) c.say(line);
  c.say("aw_easy");
}

function goodbye(c: Ctx) {
  if (c.s.left) return;
  c.s.left = true;
  c.say("aw_bye");
  if (c.s.dest) {
    c.s.thanked = true;
    c.event("directions", { dest: c.s.dest });
    c.complete();
  }
  c.end();
  c.hold();
}

const askTheWay: SituationDef = {
  title: ASK_WAY_META.title,
  topic: ASK_WAY_META.topic,
  goal: ASK_WAY_META.goal,
  intro: ASK_WAY_META.intro,
  mission: [...ASK_WAY_META.mission],
  id: ASK_WAY_SITUATION,
  bonus: true,
  optionalVoice: true,
  song: "",
  songTitle: "",
  chapter: 9,
  order: 11,
  location: "town-square",
  npc: ASK_WAY_NPC,
  mode: "talk",
  lines: { ...ASK_WAY_LINES },
  hints: ASK_WAY_HINTS,
  merges: {
    "otra vez": { reason: "lexical_expression", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "por aquí": { reason: "grammatical_fusion", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "avenida juárez": { reason: "grammatical_fusion", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "dé vuelta": { reason: "lexical_expression", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "a la izquierda": { reason: "grammatical_fusion", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "junto al": { reason: "grammatical_fusion", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "a la derecha": { reason: "grammatical_fusion", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "la ceiba": { reason: "grammatical_fusion", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "junto a": { reason: "grammatical_fusion", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "la cocina de lucía": { reason: "grammatical_fusion", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "calle ceiba": { reason: "grammatical_fusion", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "avenida del puerto": { reason: "grammatical_fusion", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "el muelle": { reason: "grammatical_fusion", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
    "de nada": { reason: "lexical_expression", split: "The unit matches the supplied gloss in this line.", minimal: "Keep the supplied gloss together." },
  },
  intents: ASK_WAY_INTENTS,
  steps: [
    {
      id: "where",
      done: (c) => !!c.s.dest,
      ask(c) {
        if (c.visits) c.say("aw_again");
        else { c.say("aw_greet"); c.say("aw_offer"); }
      },
      expects: [...ASK_WAY_PLACES.map(({ id }) => `way_${id}`), "g_bye"],
      suggest: [{ lt: ASK_WAY_META.suggestWhere, hint: "where" }],
      hints: ["where"],
    },
    {
      id: "thanks",
      done: (c) => !!c.s.thanked,
      ask() {},
      yes: goodbye,
      expects: ["way_thanks", "g_thanks", "g_ok", "g_bye"],
      suggest: [{ lt: ASK_WAY_META.suggestThanks, hint: "thanks" }],
      hints: ["thanks"],
    },
  ],
  handlers: {
    ...Object.fromEntries(ASK_WAY_PLACES.map(({ id }) => [`way_${id}`, (c: Ctx) => directions(c, id)])),
    way_thanks: (c) => { if (c.step === "thanks") goodbye(c); },
    g_thanks: (c) => { if (c.step === "thanks") goodbye(c); },
    g_ok: (c) => { if (c.step === "thanks") goodbye(c); },
    g_bye: goodbye,
  },
  start(c) { c.ask("where"); },
  tests: [
    { say: "Disculpe, ¿cómo llego al correo?", intent: "way_post", step: "where" },
    { say: "Disculpe, ¿cómo llego al café La Ceiba?", intent: "way_cafe", step: "where" },
    { say: "Disculpe, ¿cómo llego al restaurante El Muelle?", intent: "way_pier", step: "where" },
    { say: "¡Muchas gracias!", intent: "way_thanks", step: "thanks" },
    { say: "Adiós.", intent: "g_bye", step: "thanks" },
  ],
  sims: [
    { name: "asks for the post office", turns: ["¿Dónde queda el correo?", "¡Muchas gracias!"], expect: { complete: true, state: { dest: "post" } } },
    { name: "asks for Café La Ceiba", turns: ["Disculpe, ¿cómo llego al café La Ceiba?", "Entendido."], expect: { complete: true, state: { dest: "cafe" } } },
    { name: "says goodbye after asking", turns: ["¿Dónde queda El Muelle?", "Adiós."], expect: { complete: true, state: { dest: "pier" } } },
    { name: "leaves before asking", turns: ["Adiós."], expect: { complete: false } },
  ],
};

export default askTheWay;
