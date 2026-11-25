import { fernLines, fernModels } from "../cave-fern-lines";
import { caveHints, cavePass } from "../cave-dialogue";
import { ent } from "../dsl";
import type { Ctx, EntityDef, SituationDef } from "../types";

export const FERN_RIDDLES = [
  { answer: "acorn", options: ["nut", "acorn", "stone", "shell"] },
  { answer: "echo", options: ["echo", "wave", "wind", "bell"] },
  { answer: "leaf", options: ["leaf", "feather", "seed", "shell"] },
  { answer: "clock", options: ["clock", "book", "map", "shoe"] },
  { answer: "wind", options: ["bird", "wind", "rain", "cloud"] },
  { answer: "moon", options: ["sun", "star", "moon", "cloud"] },
] as const;
type Riddle = (typeof FERN_RIDDLES)[number];

const things = [
  ent("nut", "nut", "riešutas/riešuto/riešutui/riešutą/riešutu/riešute", "m"),
  ent("acorn", "acorn", "gilė/gilės/gilei/gilę/gile/gilėje", "f"),
  ent("stone", "stone", "akmuo/akmens/akmeniui/akmenį/akmeniu/akmenyje", "m", { forms: ["rock"] }),
  ent("shell", "shell", "kriauklė/kriauklės/kriauklei/kriauklę/kriaukle/kriauklėje", "f", { forms: ["seashell", "sea shell"] }),
  ent("echo", "echo", "aidas/aido/aidui/aidą/aidu/aide", "m"),
  ent("wave", "wave", "banga/bangos/bangai/bangą/banga/bangoje", "f"),
  ent("wind", "wind", "vėjas/vėjo/vėjui/vėją/vėju/vėjyje", "m", { art: "the" }),
  ent("bell", "bell", "varpas/varpo/varpui/varpą/varpu/varpe", "m"),
  ent("leaf", "leaf", "lapas/lapo/lapui/lapą/lapu/lape", "m"),
  ent("feather", "feather", "plunksna/plunksnos/plunksnai/plunksną/plunksna/plunksnoje", "f"),
  ent("seed", "seed", "sėkla/sėklos/sėklai/sėklą/sėkla/sėkloje", "f"),
  ent("clock", "clock", "laikrodis/laikrodžio/laikrodžiui/laikrodį/laikrodžiu/laikrodyje", "m", { forms: ["watch"] }),
  ent("book", "book", "knyga/knygos/knygai/knygą/knyga/knygoje", "f"),
  ent("map", "map", "žemėlapis/žemėlapio/žemėlapiui/žemėlapį/žemėlapiu/žemėlapyje", "m"),
  ent("shoe", "shoe", "batas/bato/batui/batą/batu/bate", "m"),
  ent("bird", "bird", "paukštis/paukščio/paukščiui/paukštį/paukščiu/paukštyje", "m"),
  ent("rain", "rain", "lietus/lietaus/lietui/lietų/lietumi/lietuje", "m", { art: "the" }),
  ent("cloud", "cloud", "debesis/debesies/debesiui/debesį/debesimi/debesyje", "m"),
  ent("sun", "sun", "saulė/saulės/saulei/saulę/saule/saulėje", "f", { art: "the" }),
  ent("star", "star", "žvaigždė/žvaigždės/žvaigždei/žvaigždę/žvaigžde/žvaigždėje", "f"),
  ent("moon", "moon", "mėnulis/mėnulio/mėnuliui/mėnulį/mėnuliu/mėnulyje", "m", { art: "the" }),
];

const hints = {
  ready: caveHints(fernModels, "Sutikti žaisti", ["ready_yes", "ready_now", "ready_go", "ready_first", "ready_later"]),
  help: caveHints(fernModels, "Paprašyti pagalbos", ["ask_clue", "repeat", "unsure", "hard", "skip", "give_up", "q_clue"]),
  ask: caveHints(fernModels, "Ko nors paklausti Fernos", ["q_name", "q_spirit", "q_live", "q_riddle", "q_like"]),
};

const guessHints = Object.fromEntries(FERN_RIDDLES.map(({ answer, options }) => {
  const group = caveHints(fernModels, "Spėti atsakymą", ["guess_is", "guess_think", "guess_my"]);
  const choices: readonly string[] = options;
  return [`guess_${answer}`, {
    ...group, slot: "thing",
    examples: choices.filter((id) => id !== answer),
    items: group.items.map((item) => ({ ...item, only: (entity: EntityDef) => choices.includes(entity.id) })),
  }];
}));

const current = (c: Ctx): Riddle => FERN_RIDDLES[c.s.riddleIndex];
// A compound answer can reach several handlers in one turn. Ask the next riddle
// before any words can count as an answer to it.
const resolvedTurns = new WeakSet<Ctx>();
const playing = (c: Ctx) => c.step === "riddle" && !c.s.passed && !resolvedTurns.has(c);
function ready(c: Ctx) {
  if (playing(c)) { c.say(`r_${current(c).answer}`); c.hold(); return; }
  if (c.step === "ready" && !c.s.passed) c.s.ready = true;
}
function wait(c: Ctx) { c.say("not_ready"); c.hold(); }
function finishGuess(c: Ctx, right: boolean) {
  resolvedTurns.add(c);
  c.s.riddles++;
  c.s[right ? "right" : "missed"]++;
  if (c.s.right >= 2 || c.s.missed >= 3) {
    c.s.passed = true;
    c.say(c.s.right >= 2 ? "pass" : "pass_anyway");
    cavePass(c, "fern");
    c.complete();
    return;
  }
  c.s.riddleIndex = (c.s.riddleIndex + 1) % FERN_RIDDLES.length;
  c.s.wrong = 0;
  c.s.clueGiven = false;
}
function reveal(c: Ctx) {
  c.say(`ans_${current(c).answer}`);
  finishGuess(c, false);
}
function clue(c: Ctx) {
  if (!playing(c)) return;
  c.say(c.s.clueGiven ? "hint_again" : "clue_intro");
  c.say(`hint_${current(c).answer}`);
  c.s.clueGiven = true;
  c.hold();
}
function unsure(c: Ctx) {
  if (!playing(c)) { wait(c); return; }
  if (c.s.clueGiven) reveal(c);
  else clue(c);
}
function wrong(c: Ctx) {
  if (!playing(c)) return;
  c.s.wrong++;
  if (c.s.wrong >= 4) { reveal(c); return; }
  c.say("wrong");
  if (c.s.wrong === 2 && !c.s.clueGiven) clue(c);
  c.hold();
}
function guess(c: Ctx, s: { thing: string }) {
  if (!playing(c)) return;
  if (s.thing !== current(c).answer) { wrong(c); return; }
  c.say("right");
  c.say(`ans_${current(c).answer}`);
  finishGuess(c, true);
}
const side = (line: keyof typeof fernLines) => (c: Ctx) => {
  c.say(line);
  if (playing(c)) c.hold();
};
function close(c: Ctx) { c.say("bye"); c.end(); }

const sit: SituationDef = {
  id: "x07-fern", bonus: true, optionalVoice: true, song: "", songTitle: "",
  title: { en: "Fern on the bridge", lt: "Ferna ant tilto" },
  topic: { en: "Guess the riddles", lt: "Įminti mįsles" },
  chapter: 9, order: 14, location: "gruta", npc: "cave_fern", mode: "talk",
  intro: "Ant tilto per požeminę upę sėdi Ferna. Ji Jums užmins kelias mįsles. Galite spėti, prašyti užuominos ar rinktis kitą mįslę.",
  goal: "Pažaiskite su Ferna, kad galėtumėte pereiti tiltą.",
  lines: fernLines, hints: { ...hints, ...guessHints }, entities: { thing: things },
  intents: {
    ready_ctx: { patterns: ["[yes] let us play #h:ready_yes", "i am ready #h:ready_now", "let us do it #h:ready_go", "tell me the first one #h:ready_first", "ready", "let us go", "give me a riddle"] },
    later_ctx: { patterns: ["not yet #h:ready_later", "i am not ready [yet]", "maybe later", "not now"] },
    guess_ctx: { patterns: [
      "[i do not know] is it [a | an | the] {thing} #h:guess_is", "i think it is [a | an | the] {thing} #h:guess_think",
      "my guess is [a | an | the] {thing} #h:guess_my", "[maybe] [a | an | the] {thing}",
      "(it is | the answer is) [a | an | the] {thing} [right | no]",
    ] },
    guess_unknown: { patterns: ["!(is it | i think it is | my guess is | it is | the answer is) {guess:any}"] },
    not_guess_ctx: { patterns: ["(it is not | i do not think it is) [a | an | the] {thing}", "[a | an | the] {thing} no", "not [a | an | the] {thing}"] },
    not_guess_unknown_ctx: { patterns: ["(it is not | i do not think it is | not) {rejected:any}"] },
    ask_clue: { patterns: ["can i have a clue #h:ask_clue", "can you give me [a | another] (clue | hint)", "[a | another] (clue | hint) [please]", "give me [a | another] (clue | hint)", "can you help me"] },
    repeat_ctx: { patterns: ["can you say it again #h:repeat", "can you repeat the riddle", "repeat the riddle [please]", "again [please]", "one more time", "repeat [that] [please]", "say (that | the riddle) again"] },
    unsure_ctx: { patterns: ["i do not know #h:unsure", "no idea", "i have no idea", "i am not sure", "not sure"] },
    hard_ctx: { patterns: ["that is a hard one #h:hard", "(it is | this is | that is) [too | very] (hard | difficult)", "this one is hard"] },
    skip_ctx: { patterns: ["another one please #h:skip", "another [riddle] [please]", "can we skip [this one]", "next [one]", "skip [this one]"] },
    reveal_ctx: { patterns: ["i give up #h:give_up", "tell me the answer", "what is the answer"] },
    ask_name: { patterns: ["what is your name #h:q_name", "who are you"] },
    spirit: { patterns: ["what is a cave spirit #h:q_spirit", "what are you"] },
    live: { patterns: ["do you live here #h:q_live", "is this your home"] },
    riddle: { patterns: ["what is a riddle #h:q_riddle", "how do we play"] },
    clue: { patterns: ["what is a clue #h:q_clue", "what is a hint", "what does clue mean"] },
    like: { patterns: ["do you like riddles #h:q_like", "do you like this game"] },
  },
  mission: [
    { lt: "Sutikite žaisti", step: "ready" },
    { lt: "Pamėginkite įminti mįsles", step: "riddle" },
    { lt: "Atsisveikinkite", done: (c) => !!c.s.closed },
  ],
  steps: [
    { id: "ready", done: (c) => !!c.s.ready, expects: ["ready_ctx", "later_ctx"],
      ask(c) { c.say(c.s.askedReady ? "ask_ready2" : c.visits ? "ask_ready" : "rule"); c.s.askedReady = true; },
      hints: ["ready", "ask"], suggest: [{ lt: "Sutikite žaisti", hint: "ready" }, { lt: "Ko nors paklauskite Fernos", hint: "ask" }], yes: ready, no: wait, help: wait },
    { id: "riddle", done: (c) => !!c.s.passed,
      expects: ["guess_ctx", "not_guess_ctx", "not_guess_unknown_ctx", "repeat_ctx", "unsure_ctx", "hard_ctx", "skip_ctx", "reveal_ctx"],
      ask(c) {
        c.say(c.s.riddles ? "intro_next" : "intro_first");
        c.say(`r_${current(c).answer}`);
      },
      suggest(c) {
        const { answer, options } = current(c);
        const hint = `guess_${answer}`;
        return [
          { lt: "Spėkite atsakymą", hint, options: [...options] },
          { lt: "Paprašykite pagalbos", hint: "help" }, { lt: "Ko nors paklauskite Fernos", hint: "ask" },
        ];
      },
      no: side("think"), help: unsure },
  ],
  init(c) {
    c.s.riddleIndex = c.visits % FERN_RIDDLES.length;
    c.s.riddles = 0;
    c.s.right = 0;
    c.s.missed = 0;
    c.s.wrong = 0;
  },
  start(c) { c.say(c.visits ? "again" : "greet"); c.ask("ready"); },
  finish(c) {
    const end = (cc: Ctx) => { cc.s.closed = true; close(cc); };
    c.expect({ id: "closing", optional: true, hints: ["g_social"],
      suggest: [{ lt: "Padėkokite ir atsisveikinkite", hint: "g_social" }],
      on: { g_thanks: (cc) => { cc.say("welcome"); end(cc); }, g_bye: end }, yes: end, no: end });
  },
  handlers: {
    ready_ctx: ready, later_ctx: wait, guess_ctx: guess, guess_unknown: wrong, not_guess_ctx: side("think"), not_guess_unknown_ctx: side("think"),
    ask_clue: clue,
    repeat_ctx(c) { if (playing(c)) { c.say(`r_${current(c).answer}`); c.hold(); } },
    unsure_ctx: unsure,
    hard_ctx(c) {
      if (!playing(c)) return;
      c.say("hard_offer");
      c.expect({ id: "hint_offer", optional: true, hints: ["g_yesno"],
        suggest: [{ lt: "Atsakykite „taip“ arba „ne“", hint: "g_yesno" }], yes: clue, no: side("think") });
      c.hold();
    },
    skip_ctx(c) { if (playing(c)) { c.say("skip_ok"); finishGuess(c, false); } },
    reveal_ctx(c) { if (playing(c)) reveal(c); },
    ask_name: side("name"), spirit: side("spirit"), live: side("live"), riddle: side("what_riddle"),
    clue: side("what_clue"), like: side("like"),
    g_thanks: side("welcome"), g_bye: close,
  },
  merges: {
    "this is": { reason: "grammatical_fusion", split: "This is becomes čia as Fern points to the bridge.", minimal: "All 2 words carry the expression." },
    "shall we": { reason: "grammatical_fusion", split: "Shall we marks an invitation, carried by the first-person plural question.", minimal: "All 2 words carry the expression." },
    "we begin": { reason: "grammatical_fusion", split: "Pradėsime carries the first-person plural subject and the future.", minimal: "All 2 words carry the expression." },
    "send back": { reason: "lexical_expression", split: "The echo returns the words, grąžinu.", minimal: "All 2 words carry the expression." },
    "turn red": { reason: "lexical_expression", split: "This change of color is paraustu.", minimal: "All 2 words carry the expression." },
    "look up": { reason: "lexical_expression", split: "The direction belongs with the instruction pažvelkite aukštyn.", minimal: "All 2 words carry the expression." },
    "goes down": { reason: "lexical_expression", split: "Of the sun, goes down means nusileidžia.", minimal: "All 2 words carry the expression." },
    "gives back": { reason: "lexical_expression", split: "The echo returns the voice, grąžina.", minimal: "All 2 words carry the expression." },
    "let's try": { reason: "grammatical_fusion", split: "Pamėginkime carries both the invitation and the action.", minimal: "All 2 words carry the expression." },
    "go ahead": { reason: "lexical_expression", split: "The bridge is clear to cross, pirmyn.", minimal: "All 2 words carry the expression." },
    "i've got": { reason: "grammatical_fusion", split: "I've got is present possession, turiu.", minimal: "All 2 words carry the expression." },
    "watch your step": { reason: "lexical_expression", split: "A short warning to take care on the bridge, atsargiai.", minimal: "All 3 words carry the expression." },
    "let's play": { reason: "grammatical_fusion", split: "Pažaiskime carries the invitation and the verb.", minimal: "All 2 words carry the expression." },
    "let's do it": { reason: "lexical_expression", split: "An expression of readiness, pirmyn.", minimal: "All 3 words carry the expression." },
    "say it again": { reason: "lexical_expression", split: "The line just heard is the thing to repeat, pakartoti.", minimal: "All 3 words carry the expression." },
    "i give up": { reason: "lexical_expression", split: "The speaker yields the riddle, pasiduodu.", minimal: "All 3 words carry the expression." },
  },
  sims: [
    { name: "Two correct answers earn the bridge", turns: ["I'm ready.", "An acorn", "I think it's an echo.", "Thanks!"], expect: { complete: true, state: { right: 2, missed: 0, passed: true, closed: true } } },
    { name: "Three misses earn Fern's kind release", turns: ["Let's do it!", "Not a nut.", "I don't know.", "I don't know.", "Another one, please.", "I give up.", "Goodbye!"], expect: { complete: true, state: { right: 0, missed: 3, passed: true, closed: true } } },
    { name: "Not yet and an early goodbye keep the gate shut", turns: ["Not yet", "Goodbye!"], expect: { complete: false } },
  ],
};
export default sit;
