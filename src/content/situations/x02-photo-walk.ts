import { PHOTO_WALK_HINTS, PHOTO_WALK_INTENTS, PHOTO_WALK_LINES, PHOTO_WALK_META, PHOTO_WALK_NPC, PHOTO_WALK_SITUATION } from "../photo-walk-lines";
import type { Ctx, SituationDef } from "../types";

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
  order: 9,
  location: "visitor-center",
  npc: PHOTO_WALK_NPC,
  mode: "talk",
  lines: { ...PHOTO_WALK_LINES },
  hints: PHOTO_WALK_HINTS,
  merges: {
    "can i": { reason: "grammatical_fusion", split: "The Lithuanian question particle and first-person verb cover the modal and subject.", minimal: "The unit matches the supplied gloss in this line." },
    "could you": { reason: "grammatical_fusion", split: "The Lithuanian question particle and polite conditional combine the request.", minimal: "The unit matches the supplied gloss in this line." },
    "do i do": { reason: "grammatical_fusion", split: "The Lithuanian infinitive expresses the action and the dative supplies its actor.", minimal: "The unit matches the supplied gloss in this line." },
    "do you": { reason: "grammatical_fusion", split: "The Lithuanian question particle and subject cover the interrogative auxiliary and pronoun.", minimal: "The unit matches the supplied gloss in this line." },
    "have fun": { reason: "lexical_expression", split: "The expression is a wish for an enjoyable outing.", minimal: "The unit matches the supplied gloss in this line." },
    "hi again": { reason: "lexical_expression", split: "A single greeting unit for meeting again.", minimal: "The unit matches the supplied gloss in this line." },
    "i'd love to": { reason: "lexical_expression", split: "The whole formula conveys a willing acceptance.", minimal: "The unit matches the supplied gloss in this line." },
    "in front of": { reason: "lexical_expression", split: "The compound preposition expresses a single spatial relation.", minimal: "The unit matches the supplied gloss in this line." },
    "is going to": { reason: "grammatical_fusion", split: "Lithuanian uses a future verb for the whole construction.", minimal: "The unit matches the supplied gloss in this line." },
    "it is": { reason: "grammatical_fusion", split: "The demonstrative and copula form a unit in the identification.", minimal: "The unit matches the supplied gloss in this line." },
    "it was": { reason: "grammatical_fusion", split: "The Lithuanian past copula needs no dummy subject.", minimal: "The unit matches the supplied gloss in this line." },
    "lobster rolls": { reason: "lexical_expression", split: "The supplied gloss identifies the sandwich and its filling together.", minimal: "The unit matches the supplied gloss in this line." },
    "main street": { reason: "lexical_expression", split: "The full street name is retained.", minimal: "The unit matches the supplied gloss in this line." },
    "maple harbor": { reason: "lexical_expression", split: "The full town name is retained.", minimal: "The unit matches the supplied gloss in this line." },
    "next to": { reason: "lexical_expression", split: "The compound preposition expresses adjacency.", minimal: "The unit matches the supplied gloss in this line." },
    "no problem": { reason: "lexical_expression", split: "The formula reassures the listener.", minimal: "The unit matches the supplied gloss in this line." },
    "oak avenue": { reason: "lexical_expression", split: "The full avenue name is retained.", minimal: "The unit matches the supplied gloss in this line." },
    "photo book": { reason: "lexical_expression", split: "Names a book of photographs, with the book type expressed as a genitive.", minimal: "The unit matches the supplied gloss in this line." },
    "post office": { reason: "lexical_expression", split: "The institution is named with one Lithuanian noun.", minimal: "The unit matches the supplied gloss in this line." },
    "right here": { reason: "lexical_expression", split: "The Lithuanian particle emphasizes the same location.", minimal: "The unit matches the supplied gloss in this line." },
    "take a photo": { reason: "lexical_expression", split: "Lithuanian expresses the action with one verb.", minimal: "The unit matches the supplied gloss in this line." },
    "thank you": { reason: "lexical_expression", split: "The whole expression functions as thanks.", minimal: "The unit matches the supplied gloss in this line." },
    "thanks again": { reason: "lexical_expression", split: "This formula repeats the speaker’s thanks.", minimal: "The unit matches the supplied gloss in this line." },
    "there are": { reason: "grammatical_fusion", split: "The Lithuanian existential verb needs no dummy subject.", minimal: "The unit matches the supplied gloss in this line." },
    "you found": { reason: "grammatical_fusion", split: "The polite pronoun and past-tense verb stay together before the object.", minimal: "The unit matches the supplied gloss in this line." },
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
    { say: "Sure, I'd love to!", intent: "help_yes", step: "help" },
    { say: "Sure! What do I do?", intent: "help_yes", step: "help" },
    { say: "Maybe later.", intent: "help_later", step: "help" },
    { say: "Goodbye.", intent: "g_bye", step: "help" },
  ],
  sims: [
    { name: "accepts the photo walk", turns: ["Sure, I'd love to!"], expect: { complete: true } },
    { name: "leaves the walk for later", turns: ["Maybe later."], expect: { complete: false } },
    { name: "says goodbye", turns: ["Goodbye."], expect: { complete: false } },
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
