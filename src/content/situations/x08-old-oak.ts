import { lazy } from "react";
import { caveConversationCopy, caveHints } from "../cave-dialogue";
import { oakLines, oakModels } from "../cave-oak-lines";
import { CAVE_STONE_HINTS, CAVE_STONE_PATTERNS } from "../cave-stones";
import type { Ctx, SituationDef } from "../types";

function tellWho(c: Ctx, guessed = false) {
  if (c.s.known) { c.say("i_am"); return; }
  c.s.known = true;
  c.remember({ known: true });
  c.say(guessed ? "know_yes" : "i_am");
  c.say("i_am2");
}
function feel(c: Ctx, response: keyof typeof oakLines) {
  if (c.step !== "home" || c.s.felt) { c.say("glad"); return; }
  c.s.felt = true;
  c.say(response);
}
function farewell(c: Ctx, resting = false) {
  if (c.step !== "promise" || c.s.promised) { c.say("glad"); return; }
  c.s.promised = true;
  c.say(resting ? "rest" : "glad");
  c.say("keep");
  c.say("back");
  c.event("tree-heard", {});
  c.complete();
}
function close(c: Ctx) {
  if (!c.s.closed) { c.s.closed = true; c.say("bye"); }
  c.end();
}

const hints = {
  who: caveHints(oakModels, "Atsakyti ąžuolui", ["w_who", "w_oak"]),
  feel: caveHints(oakModels, "Pasakyti, kaip čia jaučiatės", ["th_home", "th_like", "th_thanks", "th_new"]),
  promise: caveHints(oakModels, "Atsakyti, ar mokysitės toliau", ["p_keep", "p_little", "p_promise", "p_sure", "p_rest"]),
  ask: caveHints(oakModels, "Ko nors paklausti ąžuolo", ["q_age", "q_spirits"]),
};

const sit: SituationDef = {
  id: "x08-old-oak", bonus: true, optionalVoice: true, song: "", songTitle: "",
  conversationCopy: { ...caveConversationCopy, Ending: lazy(() => import("../../ui/CaveEnding")) },
  title: { en: "The Old Oak", lt: "Senasis ąžuolas" },
  topic: { en: "Listen to the oak", lt: "Pasiklausyti ąžuolo" },
  chapter: 9, order: 15, location: "gruta", npc: "cave_oak", mode: "talk",
  intro: "Penki akmenys jau šviečia. Saloje sujuda senojo ąžuolo lapai. Prieikite ir pasiklausykite, ką jis Jums pasakys.",
  goal: "Pasiklausykite senojo ąžuolo ir jam atsakykite.",
  lines: oakLines,
  hints: { ...hints, ...CAVE_STONE_HINTS },
  intents: {
    who: { patterns: ["[no] who are you #h:w_who", "what are you", "who is speaking", "what kind of tree are you", "what is your name"] },
    know: { patterns: ["you are the old oak #h:w_oak", "you are an oak [tree]", "you are the [old] tree", "you must be the old oak"] },
    know_ctx: { patterns: ["[the] [old] oak [tree]", "the tree"] },
    feel_home: { patterns: ["i feel at home here #h:th_home", "i feel at home", "it feels like home", "i feel (good | safe | happy) here"] },
    feel_like: { patterns: ["i like it here #h:th_like", "i (like | love) this (place | cave)", "i am glad to be here"] },
    feel_thanks: { patterns: ["thank you [old oak] #h:th_thanks"] },
    feel_new: { patterns: ["it still feels new #h:th_new", "i do not feel at home [yet]", "i feel (new | strange) here"] },
    promise: { patterns: ["[yes] i will keep learning #h:p_keep", "i will keep (practicing | trying)", "i want to learn more [english]", "i promise #h:p_promise"] },
    promise_ctx: { patterns: ["a little every day #h:p_little", "of course #h:p_sure", "little by little", "every day", "yes i will"] },
    rest_ctx: { patterns: ["not today #h:p_rest", "maybe tomorrow", "i need [a break | to rest]", "i am [too | very] tired", "i do not know [yet]", "maybe later", "i will not [today]"] },
    age: { patterns: ["how old are you #h:q_age", "are you [very] old"] },
    spirits: { patterns: ["where are the [cave] spirits #h:q_spirits", "where (is | are) (bram | fern | bram and fern)", "do you know (bram | fern | the spirits)"] },
    stone: { patterns: CAVE_STONE_PATTERNS },
  },
  mission: [
    { lt: "Sužinokite, kas kalba", step: "who" },
    { lt: "Pasakykite, kaip čia jaučiatės", step: "home" },
    { lt: "Atsakykite, ar mokysitės toliau", step: "promise" },
  ],
  steps: [
    { id: "who", done: (c) => !!c.s.known, expects: ["who", "know", "know_ctx"],
      ask: (c) => c.say("ask_who"), hints: ["who", "ask", "g_yesno"],
      suggest: [{ lt: "Atsakykite ąžuolui", hint: "who" }, { lt: "Ko nors paklauskite ąžuolo", hint: "ask" }],
      yes: (c) => tellWho(c, true), no: (c) => tellWho(c), help: (c) => tellWho(c) },
    { id: "home", done: (c) => !!c.s.felt, expects: ["feel_home", "feel_like", "feel_thanks", "feel_new"],
      ask(c) {
        if (c.s.homeSaid) c.say("home_again");
        else { c.s.homeSaid = true; c.say("root"); c.say("home"); }
        c.say("ask_feel");
      },
      hints: ["feel", "ask"], suggest: [{ lt: "Pasakykite, kaip čia jaučiatės", hint: "feel" }, { lt: "Ko nors paklauskite ąžuolo", hint: "ask" }],
      yes: (c) => feel(c, "like_back"), no: (c) => feel(c, "feel_space"), help: (c) => feel(c, "feel_space") },
    { id: "promise", done: (c) => !!c.s.promised, expects: ["promise", "promise_ctx", "rest_ctx"],
      ask(c) {
        if (!c.s.goAsked) c.say("slow");
        c.s.goAsked = true;
        c.say("ask_go");
      },
      hints: ["promise", "ask"], suggest: [{ lt: "Atsakykite, ar mokysitės toliau", hint: "promise" }, { lt: "Ko nors paklauskite ąžuolo", hint: "ask" }],
      yes: (c) => farewell(c), no: (c) => farewell(c, true), help: (c) => farewell(c, true) },
  ],
  init(c) { Object.assign(c.s, { known: c.memory.known === true, felt: false, promised: false, closed: false }); },
  start(c) {
    if (c.visits) c.say("again");
    else { c.say("greet"); c.say("stones_lit"); }
  },
  handlers: {
    who: (c) => tellWho(c), know: (c) => tellWho(c, true), know_ctx: (c) => tellWho(c, true),
    feel_home: (c) => feel(c, "like_back"), feel_like: (c) => feel(c, "like_back"),
    feel_new: (c) => feel(c, "feel_space"),
    feel_thanks(c) { if (c.s.promised) close(c); else if (c.step === "home") feel(c, "thanks_back"); else c.say("thanks_back"); },
    promise: (c) => farewell(c), promise_ctx: (c) => farewell(c), rest_ctx: (c) => farewell(c, true),
    age: (c) => c.say("age"), spirits: (c) => c.say("spirits"),
    stone(c) { c.say("stone_ok"); c.hold(); },
    g_thanks(c) { if (c.s.promised) close(c); else if (c.step === "home") feel(c, "thanks_back"); else c.say("thanks_back"); },
    g_bye: close,
  },
  finish(c) {
    c.expect({ id: "closing", optional: true, hints: ["g_social"],
      suggest: [{ lt: "Padėkokite ir atsisveikinkite", hint: "g_social" }],
      on: { feel_thanks: close, g_thanks: close, g_bye: close }, yes: close, no: close });
  },
  merges: {
    "welcome back": { reason: "lexical_expression", split: "A set greeting on return, sveiki sugrįžę.", minimal: "All 2 words carry the expression." },
    "take root": { reason: "lexical_expression", split: "Literally and figuratively, įleisti šaknis.", minimal: "All 2 words carry the expression." },
    "there is": { reason: "grammatical_fusion", split: "There introduces existence, carried by yra.", minimal: "All 2 words carry the expression." },
    "a little": { reason: "lexical_expression", split: "Here an amount, šiek tiek or po truputį.", minimal: "All 2 words carry the expression." },
    "come back": { reason: "lexical_expression", split: "Come and back together mean return, sugrįžkite or grįžta.", minimal: "All 2 words carry the expression." },
    "long ago": { reason: "lexical_expression", split: "Both words locate an event in the distant past, seniai.", minimal: "All 2 words carry the expression." },
    "holds up": { reason: "lexical_expression", split: "The tree supports the sky, laiko.", minimal: "All 2 words carry the expression." },
    "takes its time": { reason: "lexical_expression", split: "The drop is in no hurry, neskuba.", minimal: "All 3 words carry the expression." },
    "green thing": { reason: "lexical_expression", split: "In the garden this refers to a plant, augalas.", minimal: "Both words identify the living thing." },
    "time to spare": { reason: "lexical_expression", split: "The phrase means having plenty of time, laiko į valias.", minimal: "All 3 words carry the expression." },
    "the dark": { reason: "grammatical_fusion", split: "Dark as a noun means darkness; tamsoje carries place.", minimal: "All 2 words carry the expression." },
    "take a breath": { reason: "lexical_expression", split: "One act of breathing in, įkvėpkite.", minimal: "All 3 words carry the expression." },
    "look up": { reason: "lexical_expression", split: "Up gives the direction; the instruction is pažvelkite aukštyn or pakelkite akis.", minimal: "All 2 words carry the expression." },
    "looks for": { reason: "lexical_expression", split: "Seeks, ieško.", minimal: "All 2 words carry the expression." },
    "after dark": { reason: "lexical_expression", split: "After night falls, sutemus.", minimal: "All 2 words carry the expression." },
    "the same": { reason: "lexical_expression", split: "Equal or alike, vienodi.", minimal: "All 2 words carry the expression." },
    "comes back": { reason: "lexical_expression", split: "Returns, grįžta.", minimal: "All 2 words carry the expression." },
    "keeps watch": { reason: "lexical_expression", split: "Stays awake on watch, budi.", minimal: "All 2 words carry the expression." },
    "goes around": { reason: "lexical_expression", split: "Here time circles, sukasi.", minimal: "All 2 words carry the expression." },
    "run out": { reason: "lexical_expression", split: "The supply comes to an end, baigiasi.", minimal: "All 2 words carry the expression." },
    "are away": { reason: "grammatical_fusion", split: "Away expresses absence, rendered with nėra.", minimal: "All 2 words carry the expression." },
    "live on": { reason: "lexical_expression", split: "On extends the duration, gyvena toliau.", minimal: "All 2 words carry the expression." },
  },
  sims: [
    { name: "Keep learning and say goodbye", turns: ["You're the old oak.", "I feel at home here.", "A little every day.", "Goodbye!"], expect: { complete: true, state: { known: true, felt: true, promised: true, closed: true } } },
    { name: "The Oak finishes its story when the learner needs rest", turns: ["Who are you?", "Thank you, old oak.", "Not today.", "Goodbye!"], expect: { complete: true, state: { known: true, felt: true, promised: true, closed: true } } },
    { name: "Early farewell leaves room to return", turns: ["How old are you?", "See you later."], expect: { complete: false, state: { known: false, promised: false, closed: true } } },
  ],
};
export default sit;
