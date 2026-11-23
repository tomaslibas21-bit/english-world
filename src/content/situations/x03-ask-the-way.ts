import { ASK_WAY_HINTS, ASK_WAY_INTENTS, ASK_WAY_LINES, ASK_WAY_META, ASK_WAY_NPC, ASK_WAY_PLACES, ASK_WAY_SITUATION } from "../ask-way-lines";
import type { Ctx, SituationDef } from "../types";

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
  order: 10,
  location: "town-square",
  npc: ASK_WAY_NPC,
  mode: "talk",
  lines: { ...ASK_WAY_LINES },
  hints: ASK_WAY_HINTS,
  merges: {
    "are you": { reason: "grammatical_fusion", split: "The Lithuanian question particle and subject lead into the main verb.", minimal: "The unit matches the supplied gloss in this line." },
    "center street": { reason: "lexical_expression", split: "The full street name is retained.", minimal: "The unit matches the supplied gloss in this line." },
    "do i": { reason: "grammatical_fusion", split: "The Lithuanian dative expresses the actor of the following infinitive.", minimal: "The unit matches the supplied gloss in this line." },
    "excuse me": { reason: "lexical_expression", split: "The polite opening is expressed with a single verb.", minimal: "The unit matches the supplied gloss in this line." },
    "harbor road": { reason: "lexical_expression", split: "The full road name is retained.", minimal: "The unit matches the supplied gloss in this line." },
    "hello again": { reason: "lexical_expression", split: "A single greeting unit for meeting again.", minimal: "The unit matches the supplied gloss in this line." },
    "looking for": { reason: "lexical_expression", split: "The Lithuanian verb conveys the whole act of searching.", minimal: "The unit matches the supplied gloss in this line." },
    "lucia's trattoria": { reason: "lexical_expression", split: "The restaurant name is retained as a unit.", minimal: "The unit matches the supplied gloss in this line." },
    "main street": { reason: "lexical_expression", split: "The full street name is retained.", minimal: "The unit matches the supplied gloss in this line." },
    "next to": { reason: "lexical_expression", split: "The compound preposition expresses adjacency.", minimal: "The unit matches the supplied gloss in this line." },
    "post office": { reason: "lexical_expression", split: "The institution is named with one Lithuanian noun.", minimal: "The unit matches the supplied gloss in this line." },
    "thank you": { reason: "lexical_expression", split: "The whole expression functions as thanks.", minimal: "The unit matches the supplied gloss in this line." },
    "the pier restaurant": { reason: "lexical_expression", split: "The full restaurant name is retained as a unit.", minimal: "The unit matches the supplied gloss in this line." },
    "this time": { reason: "lexical_expression", split: "The Lithuanian adverb combines the demonstrative and the occasion.", minimal: "The unit matches the supplied gloss in this line." },
    "walk down": { reason: "lexical_expression", split: "The verb expresses movement along the street in this direction.", minimal: "The unit matches the supplied gloss in this line." },
    "where to": { reason: "lexical_expression", split: "One Lithuanian interrogative expresses direction.", minimal: "The unit matches the supplied gloss in this line." },
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
    { say: "Excuse me, how do I get to the post office?", intent: "way_post", step: "where" },
    { say: "Where is Sunny Cup?", intent: "way_cafe", step: "where" },
    { say: "Which way to the pier restaurant?", intent: "way_pier", step: "where" },
    { say: "Thank you so much!", intent: "way_thanks", step: "thanks" },
    { say: "Goodbye.", intent: "g_bye", step: "thanks" },
  ],
  sims: [
    { name: "asks for the post office", turns: ["Where is the post office?", "Thank you so much!"], expect: { complete: true, state: { dest: "post" } } },
    { name: "asks for Sunny Cup", turns: ["Where is Sunny Cup?", "Okay."], expect: { complete: true, state: { dest: "cafe" } } },
    { name: "says goodbye after asking", turns: ["Where is the pier?", "Goodbye."], expect: { complete: true, state: { dest: "pier" } } },
    { name: "leaves before asking", turns: ["Goodbye."], expect: { complete: false } },
  ],
};

export default askTheWay;
