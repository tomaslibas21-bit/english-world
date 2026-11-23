import { BILLIARDS_LINES } from "../billiards-lines";
import { t } from "../dsl";
import { GLOBAL } from "../global";
import type { Ctx, SituationDef } from "../types";

function play(c: Ctx, line: "yes_play" | "never") {
  if (c.step !== "play") return;
  c.s.play = line;
  c.say(line);
}

function name(c: Ctx) {
  if (c.step !== "name" || c.s.named) return;
  c.s.named = true;
  for (const line of ["nice", "rules", "rules_ex", "rules_win"]) c.say(line);
}

function group(c: Ctx, choice: "solids" | "stripes") {
  if (c.step !== "group" || c.s.group) return;
  c.s.group = choice;
  c.say(`bl_${choice}`);
}

function ready(c: Ctx) {
  if (c.step === "ask") c.s.ready = true;
}

function question(c: Ctx, line: "my_years" | "every_night") {
  if (!c.s[line]) {
    c.s[line] = true;
    c.say(line);
  }
  ready(c);
}

const poolHall: SituationDef = {
  id: "x01-pool-hall",
  bonus: true,
  optionalVoice: true,
  song: "",
  songTitle: "",
  title: { en: "Call Your Shot", lt: "Paskelbk smūgį" },
  topic: { en: "At the pool hall", lt: "Biliardo salėje" },
  chapter: 9,
  order: 8,
  location: "pool-hall",
  npc: "tina",
  mode: "talk",
  goal: "Pasišnekėk su Tina: pasakyk, ar žaidi biliardą, prisistatyk ir pasirink – vienspalviai ar dryžuoti. Tada sužaiskite partiją.",
  intro: "„The Corner Pocket“ – nedidelė biliardo salė Ąžuolų alėjoje. Šeimininkė Tina kreiduoja lazdą prie stalo ir pamoja tau prieiti.",

  merges: {
    "side pocket": { reason: "lexical_expression", split: "Names the middle pocket along the long rail; a general side label would also include the corners.", minimal: "The unit matches the supplied gloss in this line." },
    "hit them": { reason: "grammatical_fusion", split: "The ball group is understood in the Lithuanian imperative instead of supplied as a pronoun.", minimal: "The unit matches the supplied gloss in this line." },
    "the eight ball": { reason: "grammatical_fusion", split: "Lithuanian uses the substantivized ordinal, with no article or separate noun.", minimal: "The unit matches the supplied gloss in this line." },
    "no worries": { reason: "lexical_expression", split: "Idiomatic reassurance, rather than an inventory of worries.", minimal: "The unit matches the supplied gloss in this line." },
    "the eight": { reason: "grammatical_fusion", split: "The substantivized ordinal includes the implied noun.", minimal: "The unit matches the supplied gloss in this line." },
    "this time": { reason: "lexical_expression", split: "Šįkart already combines the demonstrative and the occasion.", minimal: "The unit matches the supplied gloss in this line." },
    "a tie": { reason: "grammatical_fusion", split: "A single Lithuanian plural-form noun carries the whole idea.", minimal: "The unit matches the supplied gloss in this line." },
    "time's up": { reason: "lexical_expression", split: "The idiom means the allotted time has ended.", minimal: "The unit matches the supplied gloss in this line." },
    "let's count": { reason: "grammatical_fusion", split: "The Lithuanian first-person plural imperative contains the invitation to act.", minimal: "The unit matches the supplied gloss in this line." },
    "the balls": { reason: "grammatical_fusion", split: "The article does not have a Lithuanian equivalent in this context.", minimal: "The unit matches the supplied gloss in this line." },
    "the game": { reason: "grammatical_fusion", split: "The article does not have a Lithuanian equivalent in this context.", minimal: "The unit matches the supplied gloss in this line." },
    "like this": { reason: "lexical_expression", split: "Introduces a spoken demonstration; a word-for-word simile changes the use.", minimal: "The unit matches the supplied gloss in this line." },
    "hey there": { reason: "lexical_expression", split: "The greeting carries no reference to a location.", minimal: "The unit matches the supplied gloss in this line." },
    "the corner pocket": { reason: "lexical_expression", split: "The full business name is retained.", minimal: "The unit matches the supplied gloss in this line." },
    "do you": { reason: "grammatical_fusion", split: "The question particle and subject cover the English interrogative auxiliary and pronoun.", minimal: "The unit matches the supplied gloss in this line." },
    "you're back": { reason: "grammatical_fusion", split: "Lithuanian uses a finite verb instead of a copula and adverb.", minimal: "The unit matches the supplied gloss in this line." },
    "up for": { reason: "lexical_expression", split: "Expresses willingness; neither component has its literal meaning here.", minimal: "The unit matches the supplied gloss in this line." },
    "a game": { reason: "grammatical_fusion", split: "The indefinite article is absorbed by the single noun.", minimal: "The unit matches the supplied gloss in this line." },
    "let's play": { reason: "grammatical_fusion", split: "The Lithuanian first-person plural imperative contains the invitation to act.", minimal: "The unit matches the supplied gloss in this line." },
    "no problem": { reason: "lexical_expression", split: "The formula reassures the listener; it does not describe a problem.", minimal: "The unit matches the supplied gloss in this line." },
    "i'll show you": { reason: "grammatical_fusion", split: "The finite future verb has the listener as an understood object.", minimal: "The unit matches the supplied gloss in this line." },
    "this is": { reason: "grammatical_fusion", split: "The Lithuanian demonstrative of place covers the introduction by copula.", minimal: "The unit matches the supplied gloss in this line." },
    "my place": { reason: "lexical_expression", split: "Place means the hall Tina owns in this context.", minimal: "The unit matches the supplied gloss in this line." },
    "the ball": { reason: "grammatical_fusion", split: "The article does not have a Lithuanian equivalent in this context.", minimal: "The unit matches the supplied gloss in this line." },
    "the pocket": { reason: "grammatical_fusion", split: "The article does not have a Lithuanian equivalent in this context.", minimal: "The unit matches the supplied gloss in this line." },
    "i was": { reason: "grammatical_fusion", split: "For age, the Lithuanian clause uses a dative experiencer and an impersonal verb.", minimal: "The unit matches the supplied gloss in this line." },
    "my dad": { reason: "grammatical_fusion", split: "The possessive and noun make up the subject of this clause.", minimal: "The unit matches the supplied gloss in this line." },
    "a table": { reason: "grammatical_fusion", split: "The indefinite article is absorbed by the single noun.", minimal: "The unit matches the supplied gloss in this line." },
    "the garage": { reason: "grammatical_fusion", split: "The article is absorbed by the noun and the locative expresses place.", minimal: "The unit matches the supplied gloss in this line." },
    "we close": { reason: "grammatical_fusion", split: "The Lithuanian finite verb ending includes the subject.", minimal: "The unit matches the supplied gloss in this line." },
    "good luck": { reason: "lexical_expression", split: "A conventional wish expressed as a single genitive noun.", minimal: "The unit matches the supplied gloss in this line." },
    "a little": { reason: "lexical_expression", split: "Means ‘somewhat’ in this reply; the article carries no separate meaning.", minimal: "The unit matches the supplied gloss in this line." },
    "i've never": { reason: "grammatical_fusion", split: "The Lithuanian adverb carries the frequency and the negated main verb carries person and tense.", minimal: "The unit matches the supplied gloss in this line." },
    "how long": { reason: "lexical_expression", split: "The phrase asks for duration; long is not an adjective here.", minimal: "The unit matches the supplied gloss in this line." },
    "have you": { reason: "grammatical_fusion", split: "The Lithuanian verb supplies tense; this unit retains the polite subject.", minimal: "The unit matches the supplied gloss in this line." },
  },
  intents: {
    play_yes: { patterns: [
      "a (little | bit) #h:h_little", "(yes | yeah | sure) [i do] [i love (pool | it | playing [pool])] #h:h_love",
      "i (love | like) (pool | it | playing [pool])", "sometimes", "yes [i do] [a little | a bit]",
    ] },
    play_no: { patterns: [
      "(not really | no | nope) [i have never played [pool | before]] #h:h_never", "i have never played [pool | before]", "never",
    ] },
    name_ctx: { patterns: ["(i am | my name is | call me) {name} #h:h_name"] },
    bare_name_ctx: { patterns: ["{name}"] },
    group_solids: { patterns: [
      "[i will take | i want | i will have | give me] [the] solids [please] #h:h_solids", "solid [ones] [please]", "solids [please]",
    ] },
    group_stripes: { patterns: [
      "[i will take | i want | i will have | give me] [the] stripes [please] #h:h_stripes", "striped [ones] [please]", "stripes [please]",
    ] },
    q_howlong: { patterns: ["how long have you (played | been playing) [pool] [for] #h:h_howlong"] },
    q_every: { patterns: ["do you play (every day | a lot | often | every night) #h:h_every"] },
  },
  lines: {
    ...BILLIARDS_LINES,
    greet: [t("Hey there! | Welcome | to | the Corner Pocket. | Do you | play | pool?", "Labas! | Sveiki atvykę | į | „The Corner Pocket“. | Ar Jūs | žaidžiate | biliardą?", "Labas! Sveiki atvykę į „The Corner Pocket“. Ar žaidžiate biliardą?")],
    again: [t("Hey, | you're back! | Up for | a game?", "Ei, | Jūs sugrįžote! | Norite | partijos?", "O, Jūs vėl čia! Sužaidžiam partiją?")],
    yes_play: [t("Great! | Then | let's play | a game.", "Puiku! | Tada | sužaiskime | partiją.", "Puiku! Tada sužaiskime partiją.")],
    never: [t("No problem. | It's | easy. | I'll show you.", "Nieko tokio. | Tai | lengva. | Aš parodysiu.", "Nieko tokio, tai lengva. Aš parodysiu.")],
    name_me: [t("I'm | Tina. | This is | my place. | What's | your | name?", "Aš esu | Tina. | Čia | mano salė. | Koks | Jūsų | vardas?", "Aš – Tina, čia mano salė. Kuo Jūs vardu?")],
    nice: [t("Nice | to meet | you!", "Malonu | susipažinti | su Jumis!", "Malonu susipažinti!")],
    rules: [t("Here, | you | call | every | shot: | the ball | and | the pocket.", "Čia | Jūs | paskelbiate | kiekvieną | smūgį: | kamuolį | ir | kišenę.", "Čia kiekvieną smūgį reikia paskelbti: kamuolį ir kišenę.")],
    rules_win: [t("Sink | your | four | balls, | then | the eight ball.", "Įmuškite | savo | keturis | kamuolius, | tada | aštuntąjį.", "Įmuškite savo keturis kamuolius, o tada – aštuntąjį.")],
    my_years: [t("Since | I was | ten. | My dad | had | a table | in | the garage.", "Nuo | tada, kai man buvo | dešimt. | Mano tėtis | turėjo | stalą | — | garaže.", "Nuo dešimties. Tėtis turėjo stalą garaže.")],
    every_night: [t("Every | night, | after | we close!", "Kiekvieną | vakarą, | po to, kai | uždarome!", "Kiekvieną vakarą, kai uždarome!")],
    lets_play: [t("OK, | you | break. | Good luck!", "Gerai, | Jūs | pradedate. | Sėkmės!", "Gerai, Jūs pradedate. Sėkmės!")],
    bye: [t("See you | around!", "Iki | dar!", "Iki, dar pasimatysime!")],
  },
  hints: {
    play: { lt: "Atsakyti Tinai", items: [
      { id: "h_little", s: t("A little.", "Truputį.", "Truputį.") },
      { id: "h_love", s: t("Yes, | I | love | pool!", "Taip, | aš | labai mėgstu | biliardą!", "Taip, labai mėgstu biliardą!") },
      { id: "h_never", s: t("Not | really. | I've never | played.", "Ne | visai. | Niekada | nežaidžiau.", "Ne visai. Niekada nežaidžiau.") },
    ] },
    name: { lt: "Pasakyti savo vardą", items: [
      { id: "h_name", s: t("I'm | {$name}.", "Aš esu | {$name}.", "Aš – {$name}.") },
    ] },
    group: { lt: "Pasirinkti kamuolius", items: [
      { id: "h_solids", s: BILLIARDS_LINES.h_solids[0] },
      { id: "h_stripes", s: BILLIARDS_LINES.h_stripes[0] },
    ] },
    ask: { lt: "Ko nors paklausti Tinos", items: [
      { id: "h_howlong", s: t("How long | have you | played?", "Kiek laiko | Jūs | žaidžiate?", "Kiek laiko žaidžiate?") },
      { id: "h_every", s: t("Do you | play | every | day?", "Ar Jūs | žaidžiate | kiekvieną | dieną?", "Ar žaidžiate kasdien?") },
    ] },
  },
  mission: [
    { step: "play", lt: "Pasakyk, ar žaidi biliardą" },
    { step: "name", lt: "Pasakyk Tinai savo vardą" },
    { step: "group", lt: "Pasirink: vienspalviai ar dryžuoti" },
  ],
  steps: [
    { id: "play", done: (c) => !!c.s.play, ask: (c) => c.say(c.visits ? "again" : "greet"),
      expects: ["play_yes", "play_no"], suggest: [{ lt: "Atsakyti Tinai", hint: "play" }, { lt: "Ko nors paklausti Tinos", hint: "ask" }], hints: ["play", "ask"],
      yes: (c) => play(c, "yes_play"), no: (c) => play(c, "never") },
    { id: "name", done: (c) => !!c.s.named, ask: (c) => c.say("name_me"),
      expects: ["name_ctx", "bare_name_ctx"], suggest: [{ lt: "Pasakyti savo vardą", hint: "name" }, { lt: "Ko nors paklausti Tinos", hint: "ask" }], hints: ["name", "ask"] },
    { id: "group", done: (c) => !!c.s.group, ask: (c) => c.say("bl_which"),
      expects: ["group_solids", "group_stripes"], suggest: [{ lt: "Pasirinkti kamuolius", hint: "group" }, { lt: "Ko nors paklausti Tinos", hint: "ask" }], hints: ["group", "ask"] },
    { id: "ask", done: (c) => !!c.s.ready, ask: () => {},
      expects: ["q_howlong", "q_every", "g_ok", "g_thanks", "g_bye"],
      suggest: [{ lt: "Ko nors paklausti Tinos", hint: "ask" }, { lt: GLOBAL.hints.g_social.lt, hint: "g_social" }], hints: ["ask", "g_social"], yes: ready, no: ready, help: ready },
  ],
  handlers: {
    play_yes: (c) => play(c, "yes_play"),
    play_no: (c) => play(c, "never"),
    name_ctx: name,
    bare_name_ctx: name,
    group_solids: (c) => group(c, "solids"),
    group_stripes: (c) => group(c, "stripes"),
    q_howlong: (c) => question(c, "my_years"),
    q_every: (c) => question(c, "every_night"),
    g_ok: ready,
    g_thanks: ready,
    g_bye(c) { c.say("bye"); c.end(); c.hold(); },
  },
  start(c) { c.ask("play"); },
  finish(c) {
    c.say("lets_play");
    c.event("billiards", { group: c.s.group });
    c.complete();
    c.end();
  },
  tests: [
    { say: "A little.", intent: "play_yes", step: "play" },
    { say: "Not really. I've never played.", intent: "play_no", step: "play" },
    { say: "I'm Ana.", intent: "name_ctx", step: "name", slots: { name: "Ana" } },
    { say: "Ana", intent: "bare_name_ctx", step: "name" },
    { say: "Solids, please.", intent: "group_solids", step: "group" },
    { say: "I'll take stripes.", intent: "group_stripes", step: "group" },
    { say: "How long have you played?", intent: "q_howlong", step: "play" },
    { say: "Do you play every day?", intent: "q_every", step: "ask" },
    { say: "Goodbye", intent: "g_bye", step: "group" },
  ],
  sims: [
    { name: "plays solids", turns: ["A little.", "I'm Ana.", "Solids, please.", "Thanks."],
      expect: { complete: true, state: { play: "yes_play", named: true, group: "solids" } } },
    { name: "new player chooses stripes", turns: ["Not really. I've never played.", "Ana", "I'll take stripes.", "Do you play every day?"],
      expect: { complete: true, state: { play: "never", group: "stripes", every_night: true } } },
    { name: "questions early and repeated", turns: ["How long have you played?", "Do you play every day?", "Yes", "I'm Ana.", "Solids", "How long have you played?"],
      expect: { complete: true, state: { my_years: true, every_night: true } } },
    { name: "leaves before playing", turns: ["Yes", "I'm Ana.", "Goodbye"],
      expect: { complete: false } },
  ],
};

export default poolHall;
