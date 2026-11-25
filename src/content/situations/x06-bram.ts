import { bramLines, bramModels } from "../cave-bram-lines";
import { caveConversationCopy, caveHints, cavePass } from "../cave-dialogue";
import { ent } from "../dsl";
import type { Ctx, Handler, SituationDef } from "../types";

export const BRAM_INTRO = {
  en: "Bram, in his wool cap, waits for you on the gray path. Introduce yourself and find out where the first three speaking stones are.",
  lt: "Ant pilkojo tako tavęs laukia Bramas su vilnone kepure. Prisistatyk ir sužinok, kur rasti pirmuosius tris kalbančius akmenis.",
};

const countries = [
  ent("lithuania", "Lithuania", "Lietuva/Lietuvos/Lietuvai/Lietuvą/Lietuva/Lietuvoje", "f",
    { art: "", forms: ["lithuanian", "vilnius", "kaunas", "klaipeda"] }),
  ent("europe", "Europe", "Europa/Europos/Europai/Europą/Europa/Europoje", "f",
    { art: "", forms: ["latvia", "estonia", "poland", "germany", "england", "ireland", "norway", "sweden", "finland", "france", "spain", "italy", "ukraine", "the uk"] }),
  ent("canada", "Canada", "Kanada/Kanados/Kanadai/Kanadą/Kanada/Kanadoje", "f",
    { art: "", forms: ["canadian"] }),
];
const hints = {
  name: caveHints(bramModels, "Pasakyti savo vardą", ["n_im", "n_my_name", "n_call"]),
  from: {
    ...caveHints(bramModels, "Pasakyti, iš kur esi", ["f_from", "f_come"]),
    slot: "country", examples: countries.map(({ id }) => id),
  },
  origin: caveHints(bramModels, "Atsakyti kitaip", ["f_town", "f_near", "f_far", "f_unsure"]),
  why: caveHints(bramModels, "Pasakyti, kodėl atėjai", ["w_see", "w_learn", "w_stones", "w_curious", "w_lost", "w_unsure", "w_other"]),
  way: caveHints(bramModels, "Paklausti, kur akmenys", ["a_where", "a_which", "a_how", "a_first", "a_second", "a_third"]),
  more: caveHints(bramModels, "Atsakyti Bramui", ["m_no", "m_ok", "m_todo", "m_yes"]),
  solve: caveHints(bramModels, "Paklausti, ką daryti", ["t_stones", "t_next"]),
  ask: caveHints(bramModels, "Ko nors paklausti Bramo", ["q_who", "q_name", "q_spirit", "q_place", "q_this", "q_slate", "q_live", "q_age", "q_hat", "q_tree", "q_far"]),
};

const side = (line: keyof typeof bramLines): Handler => (c) => c.say(line);
function name(c: Ctx, slots: { name: string }) {
  if (c.s.named) { c.say("why_ok"); return; }
  c.s.named = slots.name;
  c.say("name_ok");
}
function origin(c: Ctx, line: keyof typeof bramLines) {
  if (c.s.from) { c.say("why_ok"); return; }
  if (!c.s.named) { c.say("not_yet"); return; }
  c.s.from = true;
  c.say(line);
}
function reason(c: Ctx, line: keyof typeof bramLines) {
  if (c.s.why) { c.say("why_ok"); return; }
  if (c.step !== "why") { c.say("not_yet"); return; }
  c.s.why = true;
  c.say(line);
}
function directions(c: Ctx, part?: "dir_first" | "dir_second" | "dir_third") {
  if (part) c.say(part);
  if (!c.s.why) { if (!part) c.say("not_yet"); return; }
  if (part) { if (!c.s.way) c.say("way_again"); return; }
  if (c.s.way) { c.say("dir_recap"); return; }
  c.s.way = true;
  c.say("dir_path");
  c.say("dir_first");
  c.say("dir_rest");
  c.say("what_tip");
}
function solve(c: Ctx) {
  c.say("what_do");
  c.say("what_tip");
  c.say("what_do_2");
}
function allSet(c: Ctx) {
  if (c.s.way) { c.s.closed = true; return; }
  if (c.s.why) { c.say("way_nudge"); c.hold(); }
  else c.say("not_yet");
}

const sit: SituationDef = {
  id: "x06-bram", bonus: true, optionalVoice: true, song: "", songTitle: "",
  conversationCopy: caveConversationCopy,
  title: { en: "Bram on the gray path", lt: "Bramas ant pilkojo tako" },
  topic: { en: "Ask the way to the stones", lt: "Paklausti, kur akmenys" },
  chapter: 9, order: 13, location: "gruta", npc: "cave_bram", mode: "talk",
  intro: BRAM_INTRO.lt,
  goal: "Prisistatyk Bramui ir paklausk, kur akmenys.",
  lines: bramLines,
  entities: { country: countries },
  hints,
  intents: {
    name: { patterns: ["i am {name} #h:n_im", "my name is {name} #h:n_my_name", "[you can] call me {name} #h:n_call"] },
    bare_name_ctx: { patterns: ["{name}"] },
    origin: { patterns: ["i am from {country} #h:f_from", "i come from {country} #h:f_come", "i live in {country}", "i am {country}"] },
    origin_bare_ctx: { patterns: ["[from] {country} #h:f_from"] },
    origin_town: { patterns: ["[i am | i come] from (maple harbor #h:f_town | [the] town | up the hill)", "i live in maple harbor"] },
    town_bare_ctx: { patterns: ["maple harbor", "town", "the town"] },
    origin_near: { patterns: ["i live nearby #h:f_near", "[i am from] (nearby | close by | just up the coast | around here | not far away)"] },
    origin_far: { patterns: ["i am from far away #h:f_far", "[from] far away [from here]", "a long way away"] },
    origin_unsure_ctx: { patterns: ["i would rather not say #h:f_unsure", "i do not know", "not sure"] },
    origin_other_unknown: { patterns: ["!(i am | i come) from {place:any}", "!from {place:any}"] },
    why_see: { patterns: ["i want to see the cave #h:w_see", "i came to (see | visit | explore) [the | this] cave", "i am here to see the cave"] },
    why_learn: { patterns: ["i came to practice english #h:w_learn", "i want to (learn | practice) english", "[i am here] to practice [my] english"] },
    why_stones: { patterns: ["i am looking for the talking stones #h:w_stones", "i (came for | want to find | am looking for) [the] [talking] stones"] },
    why_stones_ctx: { patterns: ["[the] [talking] stones"] },
    why_curious: { patterns: ["i am [just] curious #h:w_curious", "i wanted to look around"] },
    why_curious_ctx: { patterns: ["curious", "just curious"] },
    why_lost: { patterns: ["i am lost #h:w_lost", "i got lost", "i lost my way"] },
    why_lost_ctx: { patterns: ["lost"] },
    why_unsure_ctx: { patterns: ["i am not sure #h:w_unsure", "i do not know", "not sure"] },
    why_other_unknown: { patterns: ["i came for a walk #h:w_other", "!i came to {reason:any}", "!i am here to {reason:any}"] },
    way: { patterns: [
      "where are the [talking] stones #h:a_where", "where can i find the [talking] stones",
      "which way to the stones #h:a_which", "how do i get to the stones #h:a_how", "where should i go",
      "can you show me the way [to the stones]", "can you tell me where the stones are",
    ] },
    recap: { patterns: ["can you go over the directions again", "where are the stones again", "which way again"] },
    first: { patterns: ["where is the first [stone | one]"] },
    second: { patterns: ["where is the second [stone | one]"] },
    third: { patterns: ["where is the third stone #h:a_third", "where is the third [one]", "and the third one"] },
    first_ctx: { patterns: ["[and] [the] first [stone | one] #h:a_first"] },
    second_ctx: { patterns: ["[and] [the] second [stone | one] #h:a_second"] },
    third_ctx: { patterns: ["[the] third [stone | one]"] },
    solve: { patterns: ["what do i do with the stones #h:t_stones", "what do i do next #h:t_next", "what do i do", "[yes] what do i do at a stone #h:m_yes", "how do i light the stones"] },
    who: { patterns: ["who are you #h:q_who", "what are you", "are you bram"] },
    ask_name: { patterns: ["what is your name #h:q_name", "what should i call you"] },
    spirit: { patterns: ["what is a cave spirit #h:q_spirit", "what is a spirit"] },
    place: { patterns: ["where am i #h:q_place", "what is this place #h:q_this", "where are we"] },
    slate: { patterns: ["what is slate #h:q_slate", "what is the path made of"] },
    live: { patterns: ["do you live here #h:q_live", "is this your home"] },
    age: { patterns: ["how old are you #h:q_age"] },
    hat: { patterns: ["i like your cap #h:q_hat", "[nice | i like your] hat", "nice cap", "what is that cap"] },
    tree: { patterns: ["which tree #h:q_tree", "where is the tree", "what tree"] },
    far: { patterns: ["is it far #h:q_far", "are they far [away]"] },
    all_set: { patterns: ["no thanks #h:m_no", "i am all set [thanks] #h:m_ok", "no that is all #h:m_todo", "that is all [thanks]", "nothing else [thanks]"] },
  },
  mission: [
    { lt: "Pasakyk savo vardą", step: "name" },
    { lt: "Pasakyk, iš kur esi", step: "from" },
    { lt: "Pasakyk, kodėl atėjai", step: "why" },
    { lt: "Paklausk, kur akmenys", step: "way" },
    { lt: "Užbaik pokalbį", step: "more" },
  ],
  steps: [
    { id: "name", done: (c) => !!c.s.named, expects: ["name", "bare_name_ctx"],
      ask(c) {
        c.say(c.s.askedName ? "ask_name" : c.visits ? "halt_again" : "halt");
        c.s.askedName = true;
      }, hints: ["name", "ask"], suggest: [{ lt: "Pasakyti savo vardą", hint: "name" }, { lt: "Ko nors paklausti Bramo", hint: "ask" }] },
    { id: "from", done: (c) => !!c.s.from,
      expects: ["origin", "origin_bare_ctx", "town_bare_ctx", "origin_unsure_ctx", "origin_near", "origin_far", "origin_town"],
      ask(c) { c.say(c.s.askedFrom ? "ask_from_again" : "ask_from"); c.s.askedFrom = true; },
      hints: ["from", "origin", "ask"],
      suggest: [{ lt: "Pasakyti, iš kur esi", hint: "from", options: "country" }, { lt: "Atsakyti kitaip", hint: "origin" }],
      help: (c) => origin(c, "from_other") },
    { id: "why", done: (c) => !!c.s.why,
      expects: ["why_see", "why_learn", "why_stones", "why_stones_ctx", "why_curious", "why_curious_ctx", "why_lost", "why_lost_ctx", "why_unsure_ctx", "why_other_unknown"],
      ask: (c) => c.say("ask_why"), hints: ["why", "ask"],
      suggest: [{ lt: "Pasakyti, kodėl atėjai", hint: "why" }, { lt: "Ko nors paklausti Bramo", hint: "ask" }],
      help: (c) => reason(c, "why_help") },
    { id: "way", done: (c) => !!c.s.way, expects: ["way", "recap", "first_ctx", "second_ctx", "third_ctx"],
      ask(c) { c.say(c.s.askedWay ? "way_nudge" : "stones_intro"); c.s.askedWay = true; },
      hints: ["way", "solve", "ask"], suggest: [{ lt: "Paklausti, kur akmenys", hint: "way" }, { lt: "Ko nors paklausti Bramo", hint: "ask" }], no: (c) => { c.say("way_nudge"); c.hold(); },
      yes: (c) => { c.say("way_hint"); c.hold(); }, help: (c) => { c.say("way_hint"); c.hold(); } },
    { id: "more", done: (c) => !!c.s.closed, expects: ["all_set", "first_ctx", "second_ctx", "third_ctx"],
      ask: (c) => c.say("ask_more"), hints: ["more", "solve", "way", "ask"],
      suggest: [{ lt: "Atsakyti Bramui", hint: "more" }, { lt: "Paklausti, ką daryti", hint: "solve" }],
      no: allSet, yes: (c) => { c.say("more_yes"); c.hold(); }, help: (c) => { c.say("what_tip"); c.hold(); } },
  ],
  start: (c) => c.ask("name"),
  finish: (c) => {
    c.say("pass");
    cavePass(c, "bram");
    c.complete();
    c.end();
  },
  handlers: {
    name, bare_name_ctx: name,
    origin: (c, s) => origin(c, s.country === "lithuania" ? "from_lithuania" : "from_far"),
    origin_bare_ctx: (c, s) => origin(c, s.country === "lithuania" ? "from_lithuania" : "from_far"),
    origin_town: (c) => origin(c, "from_town"), town_bare_ctx: (c) => origin(c, "from_town"),
    origin_near: (c) => origin(c, "from_near"), origin_far: (c) => origin(c, "from_far"),
    origin_unsure_ctx: (c) => origin(c, "from_other"), origin_other_unknown: (c) => origin(c, "from_other"),
    why_see: (c) => reason(c, "why_see"), why_learn: (c) => reason(c, "why_learn"),
    why_stones: (c) => reason(c, "why_stones"), why_stones_ctx: (c) => reason(c, "why_stones"),
    why_curious: (c) => reason(c, "why_curious"), why_curious_ctx: (c) => reason(c, "why_curious"),
    why_lost: (c) => reason(c, "why_lost"), why_lost_ctx: (c) => reason(c, "why_lost"),
    why_unsure_ctx: (c) => reason(c, "why_help"), why_other_unknown: (c) => reason(c, "why_other"),
    way: (c) => directions(c), recap: (c) => directions(c),
    first: (c) => directions(c, "dir_first"), first_ctx: (c) => directions(c, "dir_first"),
    second: (c) => directions(c, "dir_second"), second_ctx: (c) => directions(c, "dir_second"),
    third: (c) => directions(c, "dir_third"), third_ctx: (c) => directions(c, "dir_third"),
    solve, who: side("i_am"), ask_name(c) { c.say("my_name"); if (!c.s.named) { c.say("ask_name_back"); c.hold(); } },
    spirit: side("q_spirit"), slate: side("q_slate"), place: side("q_place"), live: side("q_live"),
    age: side("q_age"), hat: side("q_hat"), tree: side("dir_tree"), far: side("dir_far"),
    all_set: allSet,
    g_thanks(c) { if (c.s.way) allSet(c); else if (c.s.why) { c.say("way_nudge"); c.hold(); } else c.say("welcomed"); },
    g_bye(c) { if (c.s.way) allSet(c); else { c.say("early_bye"); c.end(); } },
  },
  merges: {
    "down here": { reason: "lexical_expression", split: "Down points to the lower level with here; čia apačioje is one location.", minimal: "All 2 words carry the expression." },
    "come in": { reason: "lexical_expression", split: "Come and in together mean užeikite, across the entrance.", minimal: "All 2 words carry the expression." },
    "looking for": { reason: "lexical_expression", split: "Looking is not watching here; ieškau takes the object in the genitive.", minimal: "All 2 words carry the expression." },
    "have been": { reason: "grammatical_fusion", split: "The perfect-progressive auxiliaries have no separate words in the Lithuanian past.", minimal: "All 2 words carry the expression." },
    "tide hall": { reason: "lexical_expression", split: "Both words name one chamber, Potvynių menė.", minimal: "All 2 words carry the expression." },
    "a little": { reason: "lexical_expression", split: "The amount phrase means truputį.", minimal: "All 2 words carry the expression." },
    "close enough": { reason: "grammatical_fusion", split: "Enough grades how near the stones are; pakankamai modifies arti.", minimal: "All 2 words carry the expression." },
    "say back": { reason: "lexical_expression", split: "Back makes this repetition, pakartokite.", minimal: "All 2 words carry the expression." },
    "looks after": { reason: "lexical_expression", split: "Looks and after together mean watches over, sergsti.", minimal: "All 2 words carry the expression." },
    "slate cove cave": { reason: "lexical_expression", split: "All three words are the place name; the locative includes the cave.", minimal: "All 3 words carry the expression." },
    "old enough": { reason: "grammatical_fusion", split: "Enough grades old, pakankamai senas.", minimal: "All 2 words carry the expression." },
    "anything else": { reason: "lexical_expression", split: "Else adds another possible question, dar kas nors.", minimal: "All 2 words carry the expression." },
    "go ahead": { reason: "lexical_expression", split: "An invitation to ask, klauskite.", minimal: "All 2 words carry the expression." },
    "on you go": { reason: "lexical_expression", split: "Fixed send-off, keliaukite.", minimal: "All 3 words carry the expression." },
    "maple harbor": { reason: "lexical_expression", split: "Both words are the town name; the Lithuanian line inflects it after iš.", minimal: "All 2 words carry the expression." },
    "i'm all set": { reason: "lexical_expression", split: "A polite end to questions, viskas aišku.", minimal: "All 3 words carry the expression." },
  },
  sims: [
    { name: "Bram passes after directions and a polite no", turns: ["Tomas", "From Lithuania", "I'm curious.", "Where are the stones?", "No, thanks."], expect: { complete: true, state: { way: true, closed: true } } },
    { name: "Early questions and goodbye keep the gate shut", turns: ["Where are the stones?", "Thanks!", "Goodbye."], expect: { complete: false } },
  ],
};
export default sit;
