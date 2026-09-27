// Song 86 "Long Time No See": running into Lucy, an old school friend, at the farmers' market.
// Lucy (informal "tu") was an American exchange student at the learner's school in Lithuania.
// She recognizes the learner; they catch up both ways (how have you been, what have you been up
// to, family, the mutual friend Mike and his restaurant), maybe get a coffee, and swap numbers.
// Reciprocity: Lucy asks, the learner answers and asks back ("And you?"), Lucy answers.
// Twists (later visits): Lucy is in a hurry (meeting her husband at one), she can't stay for
// coffee ("Rain check?"), and she suggests dinner at Mike's restaurant.

import type { Ctx, Handler, Pending, Segment, SituationDef } from "../types";
import { t } from "../dsl";
import { GLOBAL_HANDLERS, LEAVING_PATTERNS } from "../global";

// ---------------------------------------------------------------------------
// Helpers

type News = "married" | "kids" | "moved" | "job" | "english" | "usual";
const NEWS_ORDER: News[] = ["married", "kids", "moved", "job", "english", "usual"];
const turnId = (c: Ctx) => ((c as any).conv?.history?.length ?? 0) + "|" + c.heard;
function once(c: Ctx, key: string): boolean {
  const k = key + "@" + turnId(c);
  const seen: string[] = (c.s.__once ||= []);
  if (seen.includes(k)) return false;
  seen.push(k);
  if (seen.length > 30) seen.shift();
  return true;
}
/** The goal is reached. Optional checklist items still open at this moment leave the list
 *  (their `when` checks goalMet), so a completed conversation never shows an unticked item. */
function win(c: Ctx) { c.s.goalMet = true; c.complete(); }
const asked = (c: Ctx, id: string) => (c.s.asks?.[id] ?? 0) as number;
const bump = (c: Ctx, id: string) => { c.s.asks ||= {}; c.s.asks[id] = asked(c, id) + 1; };
const hi = (c: Ctx) => { c.s.greeted = true; };
const askedBack = (seg: Segment) => seg.tags.includes("askback");

/** Pending questions: "Yeah, sure" / "Great!" count as yes, "No, sorry" as no. */
function yn(p: Pending): Pending {
  const on = { ...(p.on || {}) };
  if (p.yes && !on.agree) on.agree = (cc) => { p.yes!(cc); };
  if (p.yes && !on.g_ok) on.g_ok = (cc) => { p.yes!(cc); };
  if (p.no && !on.no_sorry) on.no_sorry = (cc) => { p.no!(cc); };
  return { ...p, on };
}
function stepYes(c: Ctx) { const st = oldFriend.steps.find((x) => x.id === c.step); if (st?.yes && !st.done(c)) st.yes(c); }
function stepNo(c: Ctx) { const st = oldFriend.steps.find((x) => x.id === c.step); if (st?.no && !st.done(c)) st.no(c); }

const NEWS_RE: Record<News, RegExp> = {
  married: /\b(got married|am married|i'm married)\b/i,
  kids: /\b(kids|children|a son|a daughter|a baby|twins|a (dad|mom|father|mother) now)\b/i,
  moved: /\b(moved|live here|living here)\b/i,
  job: /\b(new job|work (at|for) brightline|working (here|at|in))\b/i,
  english: /\b(learning|studying) english\b|\benglish (classes|lessons)\b/i,
  usual: /\b(not much|nothing much|same old|the usual|nothing special)\b/i,
};
const newsIn = (heard: string) => NEWS_ORDER.filter((k) => NEWS_RE[k].test(heard));

/** Lucy's side of a topic, told once. */
function tell(c: Ctx, topic: "been" | "news" | "family") {
  if (c.s.told[topic]) return;
  c.s.told[topic] = true;
  c.s.toldTurn = turnId(c);
  if (topic === "been") c.say("own_been");
  // "…I got married!": wait for the learner's reaction before "Thanks! And... we have twins!"
  else if (topic === "news") { c.s.lucy1 = true; c.say("lucy_news1"); c.hold(); }
  else c.say("own_family");
}

/** She asked, the learner answered: react, then tell hers if asked back. */
function answered(c: Ctx, topic: "been" | "news" | "family", seg: Segment | null) {
  hi(c);
  c.s.ans[topic] = true;
  c.s.lastTopic = topic;
  if (seg && askedBack(seg)) tell(c, topic);
}

// Automatic answers the simulation uses for Lucy's optional questions.
const AUTO: Record<string, string> = {
  family: "They're great, thanks!", mike: "Of course! How is he?", coffee: "Sure, I'd love to!", mike_dinner: "I'd love that!",
  numbers: "Sure! My number is 555 0142", closing: "You too! Bye!", rush: "Sure! Here's my number: 555 0142",
};

// ---------------------------------------------------------------------------
// Handlers

const H: Record<string, Handler> = {
  voc(c) { hi(c); },
  greet(c, _slots, seg) {
    hi(c);
    if (seg.tags.includes("itsme") && once(c, "itsme")) c.say("it_is_you");
  },
  who_are_you(c) { hi(c); if (once(c, "who")) c.say("its_me_lucy"); c.s.greeted = false; },
  g_hello(c) { if (!c.s.greeted) { hi(c); return; } GLOBAL_HANDLERS.g_hello(c as any, {}); },
  compliment_back(c) {
    hi(c);
    if (!once(c, "compl")) return;
    c.say(c.s.changedSaid && !c.s.complBack ? "i_wish" : "aw_thanks");
    c.s.complBack = true;
  },
  // how have you been
  been_ans(c, _slots, seg) {
    answered(c, "been", seg);
    if (!once(c, "been")) return;
    if (seg.tags.includes("bad")) c.say("sorry_to_hear");
    else if (!askedBack(seg)) c.say("glad");
    else tell(c, "been");
  },
  ask_been(c) {
    hi(c);
    c.s.lastTopic = "been";
    tell(c, "been");
    if (!c.s.ans.been) { c.s.askBackShort = "been"; c.ask("howbeen"); }
  },
  g_howareyou(c) { H.ask_been(c, {}, { intent: "ask_been", slots: {}, tags: [] }); },
  g_howareyou_answer(c, slots) { H.been_ans(c, slots, { intent: "been_ans", slots, tags: /\byou\b/i.test(c.heard || "") ? ["askback"] : [] }); },
  // what have you been up to
  news(c, _slots, seg) {
    answered(c, "news", seg);
    // All news in this utterance (several segments may carry one each).
    const kinds = [...seg.tags.filter((x) => (NEWS_ORDER as string[]).includes(x)) as News[], ...newsIn(c.heard || "")];
    for (const k of kinds) c.s.newsList = [...new Set([...(c.s.newsList || []), k])];
    c.s.newsTold = true;
    if (!once(c, "news")) return;
    const many = (c.s.newsList as News[]).length > 1 && !c.s.manySaid;
    const top = NEWS_ORDER.find((k) => (c.s.newsList as News[]).includes(k) && !c.s.reacted?.[k]);
    if (many) { c.s.manySaid = true; c.say("so_much_news"); }
    if (top) { c.s.reacted = { ...(c.s.reacted || {}), [top]: true }; c.say("react_" + top); }
    if (askedBack(seg)) tell(c, "news");
  },
  ask_news(c) {
    hi(c);
    c.s.lastTopic = "news";
    if (c.s.told.news) { if (c.s.lucy2 && once(c, "told")) c.say("that_is_my_news"); return; }
    tell(c, "news");
    c.hold(); // let the learner react to "I got married!"
  },
  react_news(c) {
    hi(c);
    if (!c.s.lucy1) { if (once(c, "react")) c.say("aw_thanks"); return; }
    if (!c.s.lucy2) { c.s.lucy2 = true; c.say("lucy_news2"); c.hold(); return; }
    if (!once(c, "react") || c.s.newsReacted) return;
    c.s.newsReacted = true;
    c.say("so_happy");
  },
  family_ans(c, _slots, seg) {
    answered(c, "family", seg);
    if (!once(c, "fam")) return;
    c.say("say_hi_to_them");
    if (askedBack(seg)) tell(c, "family");
  },
  ask_family(c) { hi(c); c.s.lastTopic = "family"; tell(c, "family"); },
  and_you(c) {
    hi(c);
    const tp = c.s.lastTopic as "been" | "news" | "family" | undefined;
    if (tp && !c.s.told[tp]) { tell(c, tp); return; }
    if (c.s.toldTurn === turnId(c)) return;
    if (!c.s.told.news) { tell(c, "news"); return; }
    if (once(c, "andyou")) c.say("same_old");
  },
  // Mike
  mike_yes(c) {
    hi(c);
    c.s.mike = "yes";
    if (once(c, "mike")) mikeNews(c);
  },
  mike_no(c) {
    hi(c);
    if (c.s.mikeHint) { c.s.mike = "no"; if (once(c, "mike")) mikeNews(c); return; }
    c.s.mikeHint = true;
    if (once(c, "mike")) c.say("mike_hint");
  },
  ask_mike(c) { hi(c); c.s.mike = "asked"; if (once(c, "mike")) mikeNews(c); },
  good_idea(c) {
    hi(c);
    if (c.s.mikeDinnerAsked && !c.s.mikeDinner) { c.s.mikeDinner = "yes"; if (once(c, "idea")) c.say("ill_ask_him"); return; }
    if (c.s.mikeSaid && !c.s.ideaOk) { c.s.ideaOk = true; if (once(c, "idea")) c.say("ill_ask_him"); return; }
    stepYes(c);
  },
  // coffee
  coffee_invite(c) {
    hi(c);
    if (c.s.coffee) { if (once(c, "coffee")) c.say(c.s.coffee === "yes" ? "we_are" : "next_time"); return; }
    if (c.s.rushing || c.s.cantCoffee) { c.s.coffee = "no"; c.twist("rain_check"); if (once(c, "coffee")) c.say("rain_check"); return; }
    c.s.coffee = "yes";
    if (once(c, "coffee")) c.say("lets_sit");
  },
  decline(c, slots, seg) {
    hi(c);
    if (c.step === "coffee" && !c.s.coffee) { c.s.coffee = "no"; if (once(c, "decl")) c.say("next_time"); return; }
    // (the dinner at Mike's is a pending question, not a step)
    if (c.s.mikeDinnerAsked && !c.s.mikeDinner) { c.s.mikeDinner = "no"; if (once(c, "decl")) c.say("next_time"); return; }
    // "Sorry, I have to go." with no invitation open: leaving, as with the shared leaving phrases
    if (/\b(have to|need to) go\b/i.test(c.heard || "")) { H.g_bye(c, slots, seg); return; }
    stepNo(c);
  },
  // numbers
  keep_in_touch(c) {
    hi(c);
    c.s.touch = true;
    if (c.s.contact) { if (once(c, "touch")) c.say("definitely"); return; }
    if (once(c, "touch")) c.say("definitely_number");
    c.s.numberAsked = true;
  },
  number_ctx(c) {
    hi(c);
    c.s.contact = true; c.s.touch = true;
    if (once(c, "num")) c.say("got_it_text");
  },
  give_phone(c) {
    hi(c);
    c.s.contact = true; c.s.touch = true;
    if (once(c, "num")) c.say("typing_number");
  },
  ask_number(c) {
    hi(c);
    c.s.touch = true; c.s.contact = true;
    if (once(c, "num")) c.say("give_me_your_phone");
  },
  // the end
  nice_to_see(c) {
    hi(c);
    if (c.s.byeSaid || c.s.__finished) { closeBye(c); return; }
    if (once(c, "nice")) c.say("you_too_lucy");
  },
  say_hi_to(c) { hi(c); if (once(c, "sayhi")) c.say("i_will"); },
  you_too(c) {
    hi(c);
    if (c.s.__finished) { closeBye(c); return; }
    if (c.s.changedSaid && !c.s.complBack) { c.s.complBack = true; if (once(c, "compl")) c.say("i_wish"); }
  },
  // "Thanks!" for a compliment or good wishes needs no "You're welcome": Lucy just goes on.
  g_thanks(c) { hi(c); if (c.s.changedSaid) c.s.complBack = true; },
  g_ok(c) { hi(c); stepYes(c); },
  agree(c) { hi(c); stepYes(c); },
  no_sorry(c) { hi(c); stepNo(c); },
  g_bye(c) {
    hi(c);
    if (!c.s.contact && !c.s.byeWarned) {
      c.s.byeWarned = true; c.s.numberAsked = true;
      c.say("wait_number");
      // Lucy waits for the number (no other question after it), then lets the learner go
      const thenBye = (h: Handler): Handler => (cc, sl, sg) => { h(cc, sl, sg); if (cc.s.contact) closeBye(cc); };
      c.expect({
        id: "number_bye", optional: true, expects: ["number_ctx", "give_phone", "ask_number", "keep_in_touch"], hints: ["touch"],
        suggest: [{ lt: "Pasakyti savo numerį", hint: "touch" }],
        on: { number_ctx: thenBye(H.number_ctx), give_phone: thenBye(H.give_phone), ask_number: thenBye(H.ask_number) },
      });
      return;
    }
    if (c.s.contact && c.s.newsTold) win(c);
    closeBye(c);
  },
};

function mikeNews(c: Ctx) {
  c.s.mikeSaid = true;
  c.say("mike_restaurant");
  if (c.s.mikeDinnerTwist && !c.s.mikeDinnerAsked) {
    c.s.mikeDinnerAsked = true; c.twist("mike_dinner");
    c.say("mike_dinner_q");
    c.expect(yn({
      id: "mike_dinner", expects: ["good_idea", "decline"], hints: ["plan_answer"],
      suggest: [{ lt: "Sutikti", hint: "plan_answer" }],
      yes: (cc) => { cc.s.mikeDinner = "yes"; cc.say("ill_ask_him"); },
      no: (cc) => { cc.s.mikeDinner = "no"; cc.say("next_time"); },
      on: { good_idea: (cc, sl, sg) => H.good_idea(cc, sl, sg), decline: (cc, sl, sg) => H.decline(cc, sl, sg) },
      ask: (cc) => cc.say("mike_dinner_q"),
    }));
    return;
  }
  c.say("we_should_go");
}

function closeBye(c: Ctx) {
  if (c.s.byeDone) return;
  c.s.byeDone = true;
  if (c.s.contact && c.s.newsTold) win(c);
  c.say("bye_lucy");
  c.end();
}

// ---------------------------------------------------------------------------

export const oldFriend: SituationDef = {
  id: "s86-old-friend",
  song: 86,
  songTitle: "Long Time No See",
  title: { en: "Long Time No See", lt: "Seniai nesimatėme" },
  topic: { en: "Catching up with an old friend", lt: "Susitikimas su senu draugu" },
  chapter: 5,
  order: 3,
  location: "town-square",
  npc: "lucy",
  goal: "Pasikalbėk su sena drauge: papasakok, kaip gyveni, ir susitarkite palaikyti ryšį.",
  intro: "Ūkininkų turguje tave pašaukia Lucy – amerikietė, kuri prieš daug metų mokėsi tavo mokykloje Lietuvoje pagal mainų programą. Nesimatėte daugybę metų!",

  grammar: {
    macros: {
      v: "[(lucy | lucie | lucia)]",
      ab: "(and you | what about you | how about you | and yourself | how about yourself | and how have you been | how are you) #askback",
      omg: "(oh my (gosh | god | goodness) | oh my | wow | oh wow | no way)",
      ago: "[(last (year | month | spring | summer | fall | winter | week) | (a | one | two | three | four | five | six) (months | years | weeks | month | year) ago | this (year | spring | summer) | recently | in (january | february | march | april | may | june | july | august | september | october | november | december) | in the (spring | summer | fall | winter))]",
      sorry: "[(sorry | i am sorry | i am so sorry | unfortunately | oh no)]",
    },
    slots: {},
  },

  intents: {
    voc: { patterns: ["(lucy | lucie | lucia)"] },
    greet: { patterns: [
      "@v long time no see [@v] #h:gr_long_time", "@v (what a | what a nice | what a great) surprise [@v] #h:gr_surprise", "@omg [@v] [it is you] [@v]",
      "[yes] it is (me | really me) [@v] #itsme #h:gr_its_me", "@v it is [so] (good | great | nice | wonderful) to see you [again] [@v] #h:gr_good_to_see",
      "@v it has been (so long | forever | ages | a long time | years | too long) [@v] #h:gr_forever", "@v i can not believe it [@v]", "@v is that you [@v]",
      "@v (hi | hello | hey) @v [long time no see]", "(yes | yeah) [it is] me [@v] #itsme", "(of course | yes) i remember you [@v] #itsme",
      "how (nice | good | great | lovely) to see you [again] [@v]", "[@omg] what are you doing here [@v]", "how long has it been", "@v from (school | our school | our class | lithuania) [right]",
      "i (did not | almost did not) recognize you [at first]", "[hey] i remember you [@v] [right]", "@v is (it | that) [really] you [@v]",
      "(good | great | nice | so good) to see you [again] [@v]", "[@omg] [it is a | what a] small world", "(ten | five | fifteen | twenty | {number} | so many) years [@omg]", "(yes | yeah) [yes | yeah] it is me [{name}] #itsme",
    ] },
    who_are_you: { patterns: ["[sorry] who are you", "[sorry] do i know you", "[sorry] have we met [before]", "[sorry] i do not (know | remember | recognize) you"] },
    compliment_back: { patterns: [
      "(neither | nor) have you #h:cm_neither", "you (have not | never) changed (either | at all | a bit) #h:cm_neither", "you look (great | the same | amazing | fantastic | good | wonderful) [too] #h:cm_look",
      "[ha] you are (too | so) kind", "you have not changed at all", "you look exactly the same",
      "[you too] you are [still] [so | very] (beautiful | pretty | gorgeous | handsome)", "you (have not | never) changed (either | at all | a bit) either",
      "[ha | aw | oh] (thank you | thanks) you look (great | the same | amazing | fantastic | good | wonderful) [too]", "you look (younger | so young | even better) [than before]",
    ] },
    you_too: { patterns: ["[thanks | thank you] you too [@v] #h:cm_you_too", "same to you", "[and] you too"] },
    been_ans: { patterns: [
      "[i have been] [really | pretty | very] (good | great | fine | well | okay) [thanks | thank you] [@ab] #h:bn_good", "[i have been] [really | pretty | very] (good | great | fine | well | okay) [thanks | thank you] for asking [@ab]",
      "not bad [at all] [thanks] [@ab] #h:bn_not_bad", "i am doing (great | good | well | fine | okay) [thanks | thank you] [@ab]", "(i | i can) not complain [@ab] #h:bn_cant_complain", "can not complain [@ab]", "same old same old [@ab]",
      "busy but good [@ab] #h:bn_busy", "(really | pretty) busy [actually] [@ab]", "(great | good) actually [@ab]",
      "(not so | not very | not too) good [actually] [@ab] #bad", "it has been a (hard | tough | difficult) year [honestly | actually] [@ab] #bad", "everything is (fine | good | great | okay) [@ab]", "life is (good | great | fine | busy) [@ab]",
      "(busy | very busy) [you know] [work [and] family] [@ab]", "[i am] (good | fine | okay) [but] [just | a bit | a little] tired [@ab]", "[i am] (good | fine | okay) [but] (a lot of work | lots of work | very busy) [@ab]",
      "(not so | not very | not too) good [actually] my (mother | father | mom | dad | wife | husband) (was | is | has been) (sick | ill | in the hospital) [@ab] #bad", "it has been a (hard | tough | difficult) year [@ab] #bad", "[i have been] (up and down | so so) [@ab] #bad",
    ] },
    ask_been: { patterns: ["[and] how have you been [@v] #h:bn_ask", "how are (you | things) [doing] [these days] [@v]", "how is everything [with you]", "how is life [@v]", "how are you [@v]"] },
    news: { patterns: [
      "i [have] (moved | just moved | recently moved) [(here | to maple harbor | to the us | to america | to the states | to this town)] [@ago] [@ab] #moved #h:nw_moved",
      "i came (here | to maple harbor | to the us | to america) [@ago] [@ab] #moved",
      "i (live | am living) (here | in maple harbor | in town) now [in (america | the us | the states)] [@ab] #moved", "i live here now [@ab] #moved",
      "i (have | got | started) a new job [at brightline | here | in town] [@ab] #job #h:nw_job", "i work (at | for) brightline [now] [@ab] #job", "i am working (here | at brightline | in town) [now] [@ab] #job",
      "i am (learning | studying) english [@ab] #english #h:nw_english", "i am taking english (classes | lessons) [@ab] #english", "i am [still] learning english [@ab] #english",
      "i (got married | am married now | am married) [@ago] [@ab] #married #h:nw_married", "i have (a son | a daughter | a baby | twins | a little boy | a little girl | kids | children | (one | two | three | four) (kids | children | sons | daughters | boys | girls)) [and (a son | a daughter | a baby | twins | (one | two) (sons | daughters | boys | girls))] [now] [@ab] #kids #h:nw_kids",
      "i am a (dad | mom | father | mother | grandmother | grandfather) now [@ab] #kids",
      "(not much | nothing much | same old | same old same old | the usual | nothing special) [really] [@ab] #usual #h:nw_usual", "(just | mostly) working [a lot] [@ab] #usual", "i am working a lot [@ab] #usual",
      "[well] a lot [of things] [@ab] #usual", "(nothing special | not much) [just] (work and (home | family) | home and work) [@ab] #usual",
      "i am working (as | like) a (nurse | driver | teacher | cook | engineer | programmer | builder | cleaner | waiter | manager | doctor | mechanic) [here | in town] [@ab] #job",
      "(we | my family and i) moved here [for work | because of work] [@ago] [@ab] #moved", "i [have] moved here for (a new job | work | my job) [@ago] [@ab] #moved #job",
      "i [have] moved here for (my husband | my wife | love | my family) [@ago] [@ab] #moved", "i came here (for work | to work) [@ago] [@ab] #moved #job",
      "i am (learning | studying) english (at a school | at school | here | at a school here) [@ab] #english",
      // "I moved here two years ago for work.", "I'm a nurse now.", "I work in a hospital now."
      "i [have] (moved | came) (here | to maple harbor | to the us | to america | to the states) @ago (for | because of) (a new job | work | my job) [@ab] #moved #job",
      "i [have] (moved | came) (here | to maple harbor | to the us | to america | to the states) @ago for (my husband | my wife | love | my family | my kids) [@ab] #moved",
      "i am (a | an) (nurse | driver | teacher | cook | engineer | programmer | builder | cleaner | waiter | waitress | manager | doctor | mechanic | accountant | designer | photographer | nanny | electrician | hairdresser | chef) [now] [here | in town] [@ab] #job",
      "i work (in | at) (a | the) (hospital | school | restaurant | hotel | bank | shop | store | factory | office | cafe | kindergarten | pharmacy) [now] [here | in town] [@ab] #job",
    ] },
    ask_news: { patterns: [
      "what is new with you #h:nw_ask", "what (have | about) you been up to", "what are you doing (now | these days)", "are you still in (boston | chicago | new york | london | the city)",
      "what is your news", "tell me about you", "what about your life", "and what about you",
    ] },
    react_news: { patterns: [
      "congratulations [@v] #h:rc_congrats", "no way [@v] [congratulations]", "(that is | it is) (great | amazing | wonderful | fantastic | so great | awesome) [news] #h:rc_great",
      "i am [so | really] happy for you #h:rc_happy", "(wow | oh wow) [twins] [congratulations]", "twins [wow]", "(wow | oh) [that is] (amazing | great | wonderful)", "good for you",
      "show me (the ring | a picture | a photo) [@v]", "[congratulations] who is (he | the lucky (guy | man))", "[twins] [@omg] that is a lot of work", "[really] congratulations [@v]", "how old are they",
      "(boys | girls) or (girls | boys)", "double congratulations",
    ] },
    family_ans: { patterns: [
      "(they are | everyone is | my family is | we are | everybody is) (great | fine | good | well | doing well | doing great | all good | okay) [thanks] [@ab] #h:fm_great",
      "my (parents | kids | children | wife | husband | family | mom | dad | mother | father) (are | is) (fine | good | great | well | doing well) [thanks] [@ab] #h:fm_parents",
      "(all | everybody | everyone) (good | fine | great) [thanks] [@ab]", "[they are] still in lithuania [@ab]",
      "my (kids | children | son | daughter | sons | daughters) (are | is) (big | grown up | in school | teenagers) [now] [@ab]", "my (parents | family | mom | dad | mother | father) (are | is) still in lithuania [@ab]",
      "my (son | daughter | kids) (is | are) (at | in) (university | college | school) [now] [@ab]", "(fine | good) (fine | good) [@ab]", "my (wife | husband) and (kids | children | son | daughter) are (fine | good | great | well) [thanks] [@ab]",
      "(good | fine | great | well) [thanks | thank you] (and | how is) your family #askback",
    ] },
    ask_family: { patterns: ["how is your (family | husband | brother | sister | mom | mother | dad | father | family doing)", "how are your (parents | kids | twins)"] },
    and_you: { patterns: ["(and you | how about you | and yourself | how about yourself) #h:ab_and_you", "what about you #h:ab_what_about", "you", "and yours #h:ab_yours", "what about yours"] },
    mike_yes: { patterns: [
      "(yes | yeah) [of course] [i remember him] [how is he] #h:mk_of_course", "(yes | yeah) i do [remember him] #h:mk_yes", "of course [i remember him] [how is he]", "mike [yes] [of course]", "how is he [doing]",
      "i remember him", "sure i remember [mike]", "of course i remember (him | mike)", "(the | that) (tall | funny | quiet | small | little) (guy | boy | one)", "[yes] he was (funny | nice | crazy | so funny | so nice | tall)",
    ] },
    mike_no: { patterns: ["[no] [sorry] i (do not | can not) remember [him] #h:mk_dont_remember", "[sorry] i forgot (him | who he is | mike)", "[maybe] remind me", "[no] i do not know [any] mike", "[mike] who is mike", "not really", "[sorry] i do not remember mike"] },
    ask_mike: { patterns: ["do you [still] see mike [from school]", "how is mike", "what about mike", "what is (mike | he) (doing | up to) [now]"] },
    good_idea: { patterns: ["(great | good) idea #h:mk_idea", "i would love that #h:pa_love", "(that | it) (would be | sounds) (great | fun | nice | amazing)", "let us do it", "count me in", "i am in",
      "{day} is (good | fine | great | perfect) [for me]", "sounds (great | fun | nice | amazing | good)"] },
    coffee_invite: { patterns: [
      "(do you have | have you got #tip:uk_have_got) time for a (coffee | cup of coffee) #h:cf_time", "(do you want | would you like) to (get | grab | have) a (coffee | cup of coffee) #h:cf_want",
      "(let us | we could) (get | grab | have) a coffee [together]", "(how about | what about) a coffee", "[do you want to] (grab | get) coffee",
    ] },
    decline: { patterns: [
      "@sorry i (can not | have to go | need to go | am in a hurry | do not have time | am busy) [right now | today | on {day}] #h:cf_cant", "@sorry not (today | right now | this time)",
      "maybe (next time | another time) #h:cf_next", "i wish i could [but i can not]", "i would love to but i (can not | have to go | am busy | do not have time)",
      "@sorry i (have to | need to) (go | get back) to work [now | right now | today]",
    ] },
    keep_in_touch: { patterns: [
      "(let us | we should) keep in touch [@v] #h:kt_keep", "(let us | we should) (swap | exchange) (numbers | phone numbers) #h:kt_swap", "(let us | we should) (meet up | get together) (more often | sometime | soon | again)",
      "(let us | we should) not (wait | leave it) so long (next time | again)", "(let us | we should) stay in touch", "call me [anytime | sometime]", "let us be friends on (facebook | instagram)",
    ] },
    number_ctx: { patterns: ["[sure] [it is | my number is | my phone number is | here is my number] {digits} #h:kt_number", "[sure] here is my number {digits}", "[here] take my number {digits}", "[sure] write it down {digits}"] },
    give_phone: { patterns: ["here is my number", "(here | take) my phone", "let me give you my number", "i will give you my number", "i will text you [my number]",
      "give me your phone [i will (type | put) (it | my number) [in]]", "(quick | okay | sure) (here | take) my phone", "add me on (facebook | instagram | whatsapp)"] },
    ask_number: { patterns: ["(can | could) i (have | get) your (number | phone number) #h:kt_ask", "what is your (number | phone number)", "give me your number",
      "(can | could) i (have | get) yours", "(do you have | are you on) (whatsapp | facebook | instagram | viber)"] },
    nice_to_see: { patterns: ["it was [so] (good | great | nice | lovely | wonderful) to see you [@v] #h:by_nice", "[so] (good | great | nice) seeing you", "it was great running into you"] },
    say_hi_to: { patterns: ["say hi to (mike | your husband | your family | the twins | everyone | your brother) [for me] #h:by_say_hi", "tell mike i said hi"] },
    agree: { patterns: [
      "(yes | yeah | yep | sure | okay) (sure | of course | definitely | absolutely | why not | sounds good | sounds great | i would love to | great | perfect)",
      "(sure | of course) i would love to #h:cf_sure", "i would love to", "that sounds (good | great | perfect | nice)",
      "i have (twenty | ten | thirty | a few | fifteen | {number}) minutes", "i would love a coffee", "[yes | sure | okay] let us go", "[sure] there is a (cafe | coffee shop) (over there | nearby | here | around the corner)",
      "[okay | sure] [just] a quick one",
    ] },
    no_sorry: { patterns: ["(no | nope) sorry", "sorry no", "sorry not (really | now)"] },
    g_bye: { patterns: [
      "(bye | goodbye | bye bye | see you | see you later | see you soon | take care | talk to you later) [@v] #h:by_bye",
      "have a (nice | good | great | lovely) (day | one | weekend | afternoon)", "(bye | see you) [@v] take care", "see you (at mike's grill | at the restaurant | on {day} | there)",
      // "Sorry, I have to go.", "I'll call you later.": the shared leaving phrases (global.ts)
      ...LEAVING_PATTERNS,
    ] },
  },

  lines: {
    spot: [
      t("Oh | my | gosh, | is | that | you?! | Long time no see!", "O | mano | dieve, | ar | tai | tu?! | Seniai nesimatėme!", "O Dieve, ar čia tu?! Seniai nesimatėme!",
        { flags: { 3: "“is” in a yes/no question = the particle ar; ar tai tu? needs no copula." } }),
      t("Wait... | I | know | you! | It's been | forever!", "Palauk... | aš | pažįstu | tave! | Praėjo | amžinybė!", "Palauk... aš tave pažįstu! Praėjo visa amžinybė!"),
      t("No way! | Is | that | really | you?", "Negali būti! | Ar | tai | tikrai | tu?", "Negali būti! Ar čia tikrai tu?", { flags: { 1: "“Is” in a yes/no question = the particle ar; ar tai tu? needs no copula." } }),
    ],
    who_again: [
      t("Hey, | it's | me!", "Ei, | tai | aš!", "Ei, čia aš!", { flags: { 1: "“it's” here: tai (it) with no copula, as in tai aš." } }),
    ],
    its_me_lucy: [
      t("It's | me, | Lucy! | From | school! | The | exchange | student!", "Tai | aš, | Lucy! | Iš | mokyklos! | — | Mainų | studentė!", "Čia aš, Lucy! Iš mokyklos! Mainų studentė!",
        { flags: { 0: "“It's” here: tai (it) with no copula, as in tai aš." } }),
    ],
    it_is_you: [
      t("It | really | is | you!", "Tai | tikrai | esi | tu!", "Tai tikrai tu!"),
    ],
    changed: [
      t("You | haven't changed | a bit!", "Tu | nepasikeitei | nė kiek!", "Tu visai nepasikeitei!"),
      t("Wow, | you | look | great!", "Oho, | tu | atrodai | puikiai!", "Oho, puikiai atrodai!"),
    ],
    i_wish: [
      t("Ha! | I | wish!", "Cha! | Aš | norėčiau!", "Cha! Kad taip būtų!"),
      t("Ha! | You're | too | kind.", "Cha! | Tu esi | per | {m:malonus|f:maloni}.", "Cha! Tu per {m:malonus|f:maloni}."),
    ],
    aw_thanks: [
      t("Aw, | thanks!", "Oi, | ačiū!", "Oi, ačiū!"),
    ],
    ask_been: [
      t("So, | how | have | you | been?", "Tai | kaip | — | tu | gyvenai?", "Tai kaip gyvenai?", { flags: { 2: "Perfect “have” has no separate word; gyvenai carries the tense (linked to “been”)." } }),
      t("So... | how | are | you?", "Tai... | kaip | sekasi | tau?", "Tai kaip tau sekasi?"),
    ],
    ask_back: [
      t("And | you?", "O | tu?", "O tu?"),
    ],
    glad: [
      t("Oh, | good! | Glad | to hear | it.", "O, | gerai! | Smagu | girdėti | tai.", "O, gerai! Smagu girdėti."),
      t("Aw, | that's | great!", "Oi, | tai | puiku!", "Oi, puiku!"),
    ],
    sorry_to_hear: [
      t("Oh | no, | I'm | sorry | to hear | that.", "O | ne, | man | gaila | girdėti | tai.", "O ne, gaila tai girdėti.", { flags: { 2: "“I'm sorry” = man gaila (dative experiencer)." } }),
    ],
    own_been: [
      t("I'm | great! | Really | good, | actually.", "Man | puikiai! | Tikrai | gerai, | tiesą sakant.", "Puikiai! Tiesą sakant, tikrai gerai."),
    ],
    ask_upto: [
      t("So, | what | have | you | been up to?", "Tai | ką | — | tu | veikei?", "Tai ką veikei visą tą laiką?", { flags: { 2: "Perfect “have” has no separate word; veikei carries the tense (linked to “been up to”)." } }),
      t("So, | what's new | with | you?", "Tai | kas naujo | pas | tave?", "Tai kas naujo pas tave?"),
    ],
    enough_about_me: [
      t("But | enough | about | me! | What about | you?", "Bet | gana | apie | mane! | O kaip | tu?", "Bet gana apie mane! O kaip tu?"),
    ],
    so_much_news: [
      t("Wow! | So | much | news!", "Oho! | Tiek | daug | naujienų!", "Oho! Kiek naujienų!"),
    ],
    react_married: [
      t("No way! | Congratulations!", "Negali būti! | Sveikinu!", "Negali būti! Sveikinu!"),
    ],
    react_kids: [
      t("Aw, | that's | wonderful!", "Oi, | tai | nuostabu!", "Oi, kaip nuostabu!"),
    ],
    react_moved: [
      t("No way! | You | live | here | now? | That's | amazing!", "Negali būti! | Tu | gyveni | čia | dabar? | Tai | nuostabu!", "Negali būti! Dabar gyveni čia? Nuostabu!"),
    ],
    react_job: [
      t("Congratulations! | That's | great | news!", "Sveikinu! | Tai | puiki | žinia!", "Sveikinu! Puiki žinia!"),
    ],
    react_english: [
      t("Wow! | Your | English | is | really | good!", "Oho! | Tavo | anglų kalba | yra | tikrai | gera!", "Oho! Tu tikrai gerai kalbi angliškai!"),
    ],
    react_usual: [
      t("Ha, | I | know | the | feeling.", "Cha, | aš | žinau | tą | jausmą.", "Cha, pažįstamas jausmas.", { flags: { 3: "“the feeling” (that familiar feeling): Lithuanian marks it with the demonstrative tą." } }),
    ],
    lucy_news1: [
      t("Well, | I | moved | back | home | last | spring. | And | guess | what? | I | got married!",
        "Na, | aš | persikėliau | atgal | namo | praėjusį | pavasarį. | Ir | spėk | ką? | Aš | {sm:vedžiau|sf:ištekėjau}!",
        "Na, praėjusį pavasarį grįžau namo. Ir įsivaizduok – {sm:vedžiau|sf:ištekėjau}!"),
    ],
    lucy_news2: [
      t("Thanks! | And... | we | have | twins!", "Ačiū! | Ir... | mes | turime | dvynukus!", "Ačiū! Ir... turime dvynukus!"),
    ],
    so_happy: [
      t("Thank | you! | I'm | so | happy.", "Ačiū | tau! | Aš esu | {sm:toks|sf:tokia} | {sm:laimingas|sf:laiminga}.", "Ačiū! Aš {sm:toks laimingas|sf:tokia laiminga}."),
    ],
    that_is_my_news: [
      t("Ha, | that's | my | big | news!", "Cha, | tai | mano | didžiosios | naujienos!", "Cha, štai mano didžiosios naujienos!"),
    ],
    same_old: [
      t("Oh, | you | know, | same | old!", "O, | tu | žinai, | viskas | po senovei!", "O, žinai – viskas po senovei!", { flags: { 3: "“same old” = viskas po senovei (everything as before)." } }),
    ],
    ask_family: [
      t("And | how's | your | family?", "O | kaip | tavo | šeima?", "O kaip tavo šeima?", { flags: { 1: "“how's”: the ’s (is) has no word; kaip tavo šeima? needs no verb." } }),
    ],
    say_hi_to_them: [
      t("Aw, | say | hi | to them | from | me!", "Oi, | perduok | linkėjimų | jiems | nuo | manęs!", "Oi, perduok jiems linkėjimų nuo manęs!"),
    ],
    own_family: [
      t("Everyone's | great. | My | brother | is | a | dad | now!", "Visiems | puikiai. | Mano | brolis | yra | — | tėtis | dabar!", "Visiems puikiai. Mano brolis dabar tėtis!",
        { flags: { 0: "“Everyone's (great)”: Lithuanian uses the dative visiems with no verb." } }),
    ],
    ask_mike: [
      t("Hey, | do | you | remember | Mike? | From | our | class?", "Ei, | ar | tu | prisimeni | Maiką? | Iš | mūsų | klasės?", "Ei, ar prisimeni Maiką iš mūsų klasės?",
        { flags: { 1: "Question “do” = the particle ar." } }),
    ],
    mike_hint: [
      t("Tall | guy, | always | telling | jokes?", "Aukštas | vaikinas, | visada | pasakojantis | anekdotus?", "Aukštas vaikinas, visada pasakodavo anekdotus?"),
    ],
    mike_restaurant: [
      t("He | has | a | restaurant | in town | now! | Mike's Grill.", "Jis | turi | — | restoraną | mieste | dabar! | „Mike's Grill“.", "Dabar jis turi restoraną mieste – „Mike's Grill“!"),
    ],
    we_should_go: [
      t("We | should | all | go | there | together!", "Mes | turėtume | visi | nueiti | ten | kartu!", "Turėtume visi kartu ten nueiti!"),
    ],
    mike_dinner_q: [
      t("Hey, | why don't | we | all | have | dinner | there | on Friday?", "Ei, | gal | mes | visi | valgome | vakarienę | ten | penktadienį?",
        "Ei, gal visi penktadienį ten pavakarieniaujame?"),
    ],
    ill_ask_him: [
      t("Great! | I'll ask | him.", "Puiku! | Paklausiu | jo.", "Puiku! Paklausiu jo."),
    ],
    ask_coffee: [
      t("Hey, | do | you | have | time | for a coffee?", "Ei, | ar | tu | turi | laiko | kavai?", "Ei, gal turi laiko kavai?", { flags: { 1: "Question “do” = the particle ar." } }),
    ],
    lets_sit: [
      t("Great! | Let's sit | over here.", "Puiku! | Sėskime | čia.", "Puiku! Sėskime čia."),
    ],
    rain_check: [
      t("I'd love to, | but | I'm meeting | my | husband | at one. | Rain check?", "Mielai, | bet | susitinku su | savo | vyru | pirmą. | Kitą kartą?",
        "Mielai, bet pirmą susitinku su vyru. Gal kitą kartą?"),
    ],
    next_time: [
      t("No | worries! | Next | time.", "Jokių | rūpesčių! | Kitą | kartą.", "Nieko tokio! Kitą kartą."),
    ],
    we_are: [
      t("Ha, | we | are!", "Cha, | mes | [geriame]!", "Cha, juk geriame!", { flags: { 2: "Elliptical “are”: Lithuanian repeats the verb (geriame)." } }),
    ],
    rush: [
      t("Oh | no, | I'm | late! | I'm meeting | my | husband | at one.", "O | ne, | aš | vėluoju! | Susitinku su | savo | vyru | pirmą.", "O ne, vėluoju! Pirmą susitinku su vyru.",
        { flags: { 2: "“’m” (am) has no separate word: vėluoju (be late) is a verb." } }),
    ],
    quick_numbers: [
      t("Quick, | let's swap | numbers!", "Greitai, | apsikeiskime | numeriais!", "Greitai, apsikeiskime numeriais!"),
    ],
    ask_number: [
      t("We | should | keep in touch! | Can | I | get | your | number?", "Mes | turėtume | palaikyti ryšį! | Ar galiu | aš | gauti | tavo | numerį?", "Turėtume palaikyti ryšį! Ar galiu gauti tavo numerį?"),
      t("Let's swap | numbers!", "Apsikeiskime | numeriais!", "Apsikeiskime numeriais!"),
    ],
    definitely: [
      t("Definitely!", "Būtinai!", "Būtinai!"),
    ],
    definitely_number: [
      t("Definitely! | What's | your | number?", "Būtinai! | Koks yra | tavo | numeris?", "Būtinai! Koks tavo numeris?"),
    ],
    got_it_text: [
      t("Got it! | I'll text | you | so | you | have | mine.", "Supratau! | Parašysiu | tau, | kad | tu | turėtum | manąjį.", "Užsirašiau! Parašysiu tau, kad turėtum mano numerį."),
    ],
    typing_number: [
      t("Great! | I'll text | you | right now.", "Puiku! | Parašysiu | tau | tuoj pat.", "Puiku! Tuoj pat parašysiu tau žinutę."),
    ],
    give_me_your_phone: [
      t("Of course! | Give | me | your | phone. | There! | Text | me | anytime.", "Žinoma! | Duok | man | savo | telefoną. | Štai! | Rašyk | man | bet kada.",
        "Žinoma! Duok savo telefoną. Štai! Rašyk bet kada."),
    ],
    wait_number: [
      t("Wait, | let's keep in touch! | What's | your | number?", "Palauk, | palaikykime ryšį! | Koks yra | tavo | numeris?", "Palauk, palaikykime ryšį! Koks tavo numeris?"),
    ],
    nice_to_see: [
      t("It was | so | good | to see | you!", "Buvo | taip | gera | matyti | tave!", "Buvo taip gera tave matyti!"),
      t("It was | so | great | running into | you!", "Buvo | taip | puiku | sutikti | tave!", "Buvo taip smagu tave sutikti!"),
    ],
    you_too_lucy: [
      t("You | too!", "Tave | irgi!", "Tave irgi!"),
    ],
    i_will: [
      t("I | will!", "Aš | [perduosiu]!", "Perduosiu!", { flags: { 1: "Elliptical “will”: Lithuanian repeats the verb (perduosiu)." } }),
    ],
    bye_lucy: [
      t("Say | hi | to | your | family! | Bye!", "Perduok | linkėjimų | — | savo | šeimai! | Iki!", "Perduok linkėjimų šeimai! Iki!",
        { flags: { 2: "“to”: the dative ending of šeimai carries it (your intervenes)." } }),
      t("Bye! | Text | me!", "Iki! | Parašyk | man!", "Iki! Parašyk!"),
      t("Take care! | See you | soon!", "Laikykis! | Iki | greito!", "Laikykis! Iki greito!"),
    ],
  },

  hints: {
    greet: {
      lt: "Pasisveikinti ir nustebti",
      items: [
        { id: "gr_long_time", s: t("Lucy! | Long time no see!", "Lucy! | Seniai nesimatėme!", "Lucy! Seniai nesimatėme!") },
        { id: "gr_surprise", s: t("What | a | surprise!", "Kokia | — | staigmena!", "Kokia staigmena!") },
        { id: "gr_good_to_see", s: t("It's | so | good | to see | you!", "Tai yra | taip | gera | matyti | tave!", "Taip gera tave matyti!") },
        { id: "gr_forever", s: t("It's been | forever!", "Praėjo | amžinybė!", "Praėjo visa amžinybė!") },
        { id: "gr_its_me", s: t("Yes, | it's | me!", "Taip, | tai | aš!", "Taip, čia aš!", { flags: { 1: "“it's” here: tai (it) with no copula, as in tai aš." } }) },
      ],
    },
    compliment: {
      lt: "Atsakyti į komplimentą",
      items: [
        { id: "cm_you_too", s: t("Thanks! | You | too!", "Ačiū! | Tu | irgi!", "Ačiū! Tu irgi!") },
        { id: "cm_look", s: t("You | look | great | too!", "Tu | atrodai | puikiai | irgi!", "Tu irgi puikiai atrodai!") },
        { id: "cm_neither", s: t("Neither | have | you!", "Irgi | [nepasikeitei] | tu!", "Tu irgi nepasikeitei!", { flags: { 1: "Elliptical “have”: Lithuanian repeats the verb, negated by “neither” (nepasikeitei)." } }) },
      ],
    },
    been: {
      lt: "Atsakyti, kaip gyveni (ir paklausti atgal)",
      items: [
        { id: "bn_good", s: t("Really | good, | thanks! | And | you?", "Tikrai | gerai, | ačiū! | O | tu?", "Tikrai gerai, ačiū! O tu?") },
        { id: "bn_not_bad", s: t("Not bad! | How about | you?", "Neblogai! | O kaip | tu?", "Neblogai! O tu?") },
        { id: "bn_cant_complain", s: t("I | can't complain.", "Aš | negaliu skųstis.", "Negaliu skųstis.") },
        { id: "bn_busy", s: t("Busy, | but | good!", "Užimta, | bet | gerai!", "Daug darbų, bet gerai!", { flags: { 0: "“Busy” as a reply: užimta (impersonal, “it is busy”)." } }) },
        { id: "bn_ask", s: t("How | have | you | been?", "Kaip | — | tu | gyvenai?", "Kaip gyvenai?", { flags: { 1: "Perfect “have” has no separate word; gyvenai carries the tense (linked to “been”)." } }) },
      ],
    },
    news: {
      lt: "Papasakoti naujienas",
      items: [
        { id: "nw_moved", s: t("I | moved | here | last | year!", "Aš | atsikrausčiau | čia | praėjusiais | metais!", "Pernai atsikrausčiau čia!") },
        { id: "nw_job", s: t("I | have | a | new | job.", "Aš | turiu | — | naują | darbą.", "Turiu naują darbą.") },
        { id: "nw_english", s: t("I'm learning | English.", "Mokausi | anglų kalbos.", "Mokausi anglų kalbos.") },
        { id: "nw_married", s: t("I | got married!", "Aš | {m:vedžiau|f:ištekėjau}!", "{m:Vedžiau|f:Ištekėjau}!") },
        { id: "nw_kids", s: t("I | have | two | kids | now.", "Aš | turiu | du | vaikus | dabar.", "Dabar turiu du vaikus.") },
        { id: "nw_usual", s: t("Not much, | the | usual.", "Nieko ypatingo, | — | kaip visada.", "Nieko ypatingo, kaip visada.") },
        { id: "nw_ask", s: t("What's new | with | you?", "Kas naujo | pas | tave?", "Kas naujo pas tave?") },
      ],
    },
    react: {
      lt: "Sureaguoti į jos naujienas",
      items: [
        { id: "rc_congrats", s: t("Congratulations!", "Sveikinu!", "Sveikinu!") },
        { id: "rc_great", s: t("That's | great | news!", "Tai | puiki | žinia!", "Puiki žinia!") },
        { id: "rc_happy", s: t("I'm | so | happy | for | you!", "Aš esu | taip | {m:laimingas|f:laiminga} | dėl | tavęs!", "Labai džiaugiuosi dėl tavęs!") },
      ],
    },
    family: {
      lt: "Papasakoti apie šeimą",
      items: [
        { id: "fm_great", s: t("They're | great, | thanks!", "Jiems | puikiai, | ačiū!", "Jiems puikiai, ačiū!", { flags: { 0: "“They're (great)”: Lithuanian uses the dative jiems with no verb." } }) },
        { id: "fm_parents", s: t("My | parents | are | fine.", "Mano | tėvai | yra | sveiki.", "Tėvams viskas gerai.") },
        { id: "ab_yours", s: t("And | yours?", "O | tavo?", "O tavo?") },
      ],
    },
    mike: {
      lt: "Atsakyti apie Maiką",
      items: [
        { id: "mk_of_course", s: t("Of course! | How | is | he?", "Žinoma! | Kaip | sekasi | jam?", "Žinoma! Kaip jam sekasi?") },
        { id: "mk_yes", s: t("Yes, | I | do!", "Taip, | aš | [prisimenu]!", "Taip, prisimenu!", { flags: { 2: "Elliptical “do”: Lithuanian repeats the verb (prisimenu)." } }) },
        { id: "mk_dont_remember", s: t("Sorry, | I | don't remember | him.", "Atsiprašau, | aš | neprisimenu | jo.", "Atsiprašau, neprisimenu jo.") },
      ],
    },
    coffee: {
      lt: "Pasiūlyti kavos arba atsakyti",
      items: [
        { id: "cf_time", s: t("Do | you | have | time | for a coffee?", "Ar | tu | turi | laiko | kavai?", "Gal turi laiko kavai?", { flags: { 0: "Question “Do” = the particle ar." } }) },
        { id: "cf_want", s: t("Do | you | want | to grab | a | coffee?", "Ar | tu | nori | užsukti | — | kavos?", "Gal užsukam kavos?", { flags: { 0: "Question “Do” = the particle ar." } }), register: "casual" },
        { id: "cf_cant", s: t("Sorry, | I | have | to go.", "Atsiprašau, | aš | turiu | eiti.", "Atsiprašau, turiu eiti.") },
        { id: "cf_next", s: t("Maybe | next | time!", "Gal | kitą | kartą!", "Gal kitą kartą!") },
      ],
    },
    coffee_answer: {
      lt: "Atsakyti dėl kavos",
      items: [
        { id: "cf_sure", s: t("Sure, | I'd love to!", "Žinoma, | mielai!", "Žinoma, mielai!") },
        { id: "cf_cant", s: t("Sorry, | I | have | to go.", "Atsiprašau, | aš | turiu | eiti.", "Atsiprašau, turiu eiti.") },
        { id: "cf_next", s: t("Maybe | next | time!", "Gal | kitą | kartą!", "Gal kitą kartą!") },
      ],
    },
    plan_answer: {
      lt: "Atsakyti į pasiūlymą",
      items: [
        { id: "mk_idea", s: t("Great | idea!", "Puiki | mintis!", "Puiki mintis!") },
        { id: "pa_love", s: t("I'd love | that!", "Labai norėčiau | to!", "Labai norėčiau!") },
        { id: "cf_next", s: t("Maybe | next | time!", "Gal | kitą | kartą!", "Gal kitą kartą!") },
      ],
    },
    touch: {
      lt: "Susitarti palaikyti ryšį",
      items: [
        { id: "kt_number", s: t("My | number | is | 555-0142.", "Mano | numeris | yra | 555-0142.", "Mano numeris – 555-0142.", { say: "My number is five five five, oh one four two." }) },
        { id: "kt_ask", s: t("Can | I | have | your | number?", "Ar galiu | aš | gauti | tavo | numerį?", "Ar galiu gauti tavo numerį?") },
        { id: "kt_keep", s: t("Let's keep in touch!", "Palaikykime ryšį!", "Palaikykime ryšį!") },
        { id: "kt_swap", s: t("Let's swap | numbers!", "Apsikeiskime | numeriais!", "Apsikeiskime numeriais!") },
      ],
    },
    goodbye: {
      lt: "Atsisveikinti",
      items: [
        { id: "by_you_too", s: t("You | too! | Bye!", "Tave | irgi! | Iki!", "Tave irgi! Iki!") },
        { id: "by_bye", s: t("See you | soon!", "Iki | greito!", "Iki greito!") },
        { id: "by_nice", s: t("It was | so | good | to see | you!", "Buvo | taip | gera | matyti | tave!", "Buvo taip gera tave matyti!") },
        { id: "by_say_hi", s: t("Say | hi | to Mike | for | me!", "Perduok | linkėjimų | Maikui | nuo | manęs!", "Perduok linkėjimų Maikui!") },
      ],
    },
    ask_back: {
      lt: "Paklausti to paties",
      items: [
        { id: "ab_and_you", s: t("And | you?", "O | tu?", "O tu?") },
        { id: "ab_what_about", s: t("What about | you?", "O kaip | tu?", "O tu?") },
      ],
    },
  },

  tips: {
    uk_have_got: { key: "uk_have_got", lt: "Suprasta! Amerikoje dažniau sakoma „Do you have time…?“", better: "Do you have time for a coffee?" },
  },

  merges: {
    "long time no see": { reason: "lexical_expression", split: "long → ilgas, time → laikas, no → ne, see → matyti is a pidgin set phrase; = seniai nesimatėme.", minimal: "The whole greeting." },
    "no way": { reason: "lexical_expression", split: "no → ne + way → kelias is false; surprise = negali būti.", minimal: "Two words." },
    "it's been": { reason: "grammatical_fusion", split: "it's → tai yra + been → buvęs: dummy “it” + perfect; the time that passed = praėjo.", minimal: "Two words." },
    "haven't changed": { reason: "grammatical_fusion", split: "haven't → neturi + changed → pasikeitęs: the negated perfect = nepasikeitei (C-NEG).", minimal: "Two words." },
    "a bit": { reason: "lexical_expression", split: "a → — + bit → gabalėlis is false; after a negation = nė kiek.", minimal: "Two words." },
    "been up to": { reason: "lexical_expression", split: "been → buvęs, up → aukštyn, to → į is false; “be up to” = veikti.", minimal: "“have” stays outside (flagged)." },
    "what's new": { reason: "lexical_expression", split: "What's → kas yra + new → nauja gives the ungrammatical “kas yra nauja”; the set question = kas naujo.", minimal: "Two words." },
    "got married": { reason: "lexical_expression", split: "got → gavau + married → vedęs is false; = ištekėjau / vedžiau.", minimal: "Two words." },
    "mike's grill": { reason: "lexical_expression", split: "A restaurant name; Mike's → Maiko + Grill → grilis would translate a name.", minimal: "The name." },
    "why don't": { reason: "lexical_expression", split: "why → kodėl + don't → ne- asks for a reason (“why not”); as a suggestion “why don't we …” = gal.", minimal: "Two words; the subject stays outside." },
    "how about": { reason: "lexical_expression", split: "how → kaip + about → apie gives “kaip apie”, a calque; asking back = o kaip.", minimal: "The person stays outside." },
    "let's keep in touch": { reason: "lexical_expression", split: "let → leisk, 's (us) → mums, keep → laikyti, in → į, touch → prisilietimas is false; the proposal = palaikykime ryšį.", minimal: "The whole proposal." },
    "let's sit": { reason: "lexical_expression", split: "let → leisk, 's (us) → mums, sit → sėdėti asks for permission; the proposal = sėskime.", minimal: "The place stays outside." },
    "over here": { reason: "lexical_expression", split: "over → per + here → čia is false; = čia.", minimal: "Two words." },
    "rain check": { reason: "lexical_expression", split: "rain → lietus + check → čekis is false; postponing = kitą kartą.", minimal: "Two words." },
    "let's swap": { reason: "lexical_expression", split: "let → leisk, 's (us) → mums, swap → keisti asks for permission; the proposal = apsikeiskime.", minimal: "The object stays outside." },
    "keep in touch": { reason: "lexical_expression", split: "keep → laikyti, in → į, touch → prisilietimas is false; = palaikyti ryšį.", minimal: "Three words, one expression." },
    "it was": { reason: "grammatical_fusion", split: "it → tai + was → buvo: dummy “it” has no referent; the impersonal buvo absorbs it (C-DUMMY).", minimal: "Two words." },
    "running into": { reason: "lexical_expression", split: "running → bėgantis + into → į is false; meeting by chance = sutikti.", minimal: "Two words." },
    "i'm learning": { reason: "grammatical_fusion", split: "I'm → aš esu + learning → besimokantis gives a false stative reading; = mokausi (C-PROG).", minimal: "Two words." },
    "i'd love": { reason: "grammatical_fusion", split: "I'd → aš drops “would”; the conditional labai norėčiau carries would + love.", minimal: "The object stays outside." },
    "i'd love to": { reason: "lexical_expression", split: "I'd → aš norėčiau, love → mylėti, to → į: the elliptical infinitive has no word for “to”; = mielai.", minimal: "The reply." },
    "not much": { reason: "lexical_expression", split: "not → ne + much → daug gives “ne daug” (a small quantity); as a reply = nieko ypatingo.", minimal: "Two words." },
    "what about": { reason: "lexical_expression", split: "what → kas + about → apie is false; asking back = o kaip.", minimal: "The person stays outside." },
    "can't complain": { reason: "grammatical_fusion", split: "can't → negaliu + complain → skųstis: Lithuanian negation is the prefix of negaliu (C-NEG).", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Pasisveikink", done: (c) => !!c.s.greeted || !!c.s.changedSaid },
    { lt: "Atsakyk, kaip sekasi", done: (c) => !!c.s.ans?.been || asked(c, "howbeen") >= 2 || !!c.s.newsTold },
    { lt: "Papasakok savo naujienas", done: (c) => !!c.s.newsTold },
    { lt: "Papasakok apie šeimą", optional: true, when: (c) => asked(c, "family") > 0 && !c.s.goalMet, done: (c) => asked(c, "family") > 0 && (!!c.s.ans?.family || asked(c, "family") >= 2) },
    { lt: "Atsakyk apie Maiką", optional: true, when: (c) => asked(c, "mike") > 0 && !c.s.goalMet, done: (c) => asked(c, "mike") > 0 && (!!c.s.mikeSaid || asked(c, "mike") >= 3) },
    { lt: "Atsakyk dėl kavos", optional: true, when: (c) => asked(c, "coffee") > 0 && !c.s.goalMet, done: (c) => asked(c, "coffee") > 0 && (!!c.s.coffee || asked(c, "coffee") >= 2) },
    { lt: "Apsikeisk numeriais", done: (c) => !!c.s.contact },
  ],
  steps: [
    { id: "recognize", done: (c) => !!c.s.greeted,
      ask: (c) => { if (c.s.skipAsk) { c.s.skipAsk = false; return; } c.say("who_again"); },
      expects: ["greet", "who_are_you"],
      suggest: [{ lt: "Pasisveikinti ir nustebti", hint: "greet" }] },
    { id: "changed", done: (c) => !!c.s.changedSaid,
      ask: (c) => { c.s.changedSaid = true; c.say("changed"); },
      expects: ["compliment_back", "you_too"],
      suggest: [{ lt: "Atsakyti į komplimentą", hint: "compliment" }, { lt: "Paklausti, kaip ji gyvena", hint: "been" }] },
    { id: "howbeen", when: (c) => !c.s.rushing, done: (c) => !!c.s.ans.been || asked(c, "howbeen") >= 2,
      ask: (c) => { bump(c, "howbeen"); c.s.lastTopic = "been"; if (c.s.askBackShort === "been") { c.s.askBackShort = undefined; c.say("ask_back"); } else c.say("ask_been"); },
      expects: ["been_ans", "ask_been", "and_you"],
      suggest: [{ lt: "Atsakyti, kaip gyveni (ir paklausti atgal)", hint: "been" }] },
    { id: "upto", when: (c) => !c.s.rushing, done: (c) => !!c.s.newsTold || asked(c, "upto") >= 3,
      ask: (c) => { bump(c, "upto"); c.s.lastTopic = "news"; c.say(c.s.lucy2 && !c.s.enoughSaid ? "enough_about_me" : "ask_upto"); if (c.s.lucy2) c.s.enoughSaid = true; },
      expects: ["news", "ask_news", "and_you"],
      suggest: [{ lt: "Papasakoti savo naujienas", hint: "news" }, { lt: "Paklausti jos naujienų", hint: "ask_back" }] },
    { id: "lucy1", when: (c) => !c.s.rushing, done: (c) => !!c.s.lucy1,
      ask: (c) => { c.s.lastTopic = "news"; tell(c, "news"); },
      expects: ["react_news"],
      suggest: [{ lt: "Sureaguoti į jos naujienas", hint: "react" }] },
    { id: "lucy2", when: (c) => !c.s.rushing && !!c.s.lucy1, done: (c) => !!c.s.lucy2,
      ask: (c) => { c.s.lucy2 = true; c.say("lucy_news2"); },
      expects: ["react_news"],
      suggest: [{ lt: "Pasveikinti", hint: "react" }] },
    { id: "family", when: (c) => !c.s.rushing && c.s.askFamily, done: (c) => !!c.s.ans.family || asked(c, "family") >= 2,
      ask: (c) => { bump(c, "family"); c.s.lastTopic = "family"; c.say("ask_family"); },
      expects: ["family_ans", "ask_family", "and_you"],
      suggest: [{ lt: "Papasakoti apie šeimą", hint: "family" }] },
    { id: "mike", when: (c) => !c.s.rushing && c.s.askMike && !c.s.mikeSaid, done: (c) => !!c.s.mikeSaid || asked(c, "mike") >= 3,
      ask: (c) => { bump(c, "mike"); if (c.s.mikeHint && asked(c, "mike") > 1) c.say("mike_hint"); else c.say("ask_mike"); },
      expects: ["mike_yes", "mike_no"],
      suggest: [{ lt: "Atsakyti, ar prisimeni Maiką", hint: "mike" }],
      yes: (c) => H.mike_yes(c, {}, { intent: "mike_yes", slots: {}, tags: [] }),
      no: (c) => H.mike_no(c, {}, { intent: "mike_no", slots: {}, tags: [] }) },
    { id: "rush", when: (c) => !!c.s.rushTwist, done: (c) => !!c.s.rushing,
      ask: (c) => { c.s.rushing = true; c.twist("in_a_hurry"); c.say("rush"); c.say("quick_numbers"); c.s.numberAsked = true; },
      expects: ["number_ctx", "give_phone", "ask_number", "keep_in_touch"],
      suggest: [{ lt: "Apsikeisti numeriais", hint: "touch" }] },
    { id: "coffee", when: (c) => !c.s.rushing && c.s.askCoffee, done: (c) => !!c.s.coffee || asked(c, "coffee") >= 2,
      ask: (c) => { bump(c, "coffee"); c.say("ask_coffee"); },
      expects: ["decline", "coffee_invite"],
      suggest: [{ lt: "Sutikti išgerti kavos", hint: "coffee_answer" }],
      yes: (c) => { c.s.coffee = "yes"; c.say("lets_sit"); }, no: (c) => { c.s.coffee = "no"; c.say("next_time"); } },
    { id: "numbers", done: (c) => !!c.s.contact,
      ask: (c) => { bump(c, "numbers"); if (c.s.numberAsked) c.say("definitely_number"); else { c.s.numberAsked = true; c.say("ask_number"); } },
      expects: ["number_ctx", "give_phone", "ask_number", "keep_in_touch"],
      suggest: [{ lt: "Pasakyti savo numerį arba pasiūlyti apsikeisti", hint: "touch" }],
      yes: (c) => { c.say("definitely_number"); } },
  ],

  init: (c) => {
    c.s.ans = {}; c.s.told = {};
    c.s.askFamily = c.chance(0.6);
    c.s.askMike = c.chance(0.65);
    c.s.askCoffee = c.chance(0.45);
    c.s.cantCoffee = c.visits >= 1 && c.chance(0.5);
    c.s.rushTwist = c.visits >= 1 && c.chance(0.3);
    c.s.mikeDinnerTwist = c.visits >= 2 && c.chance(0.5);
  },

  start: (c) => {
    c.say("spot");
    c.s.skipAsk = true;
  },

  handlers: H,

  finish: (c) => {
    if (c.s.contact && c.s.newsTold) win(c);
    c.say("nice_to_see");
    const bye = (cc: Ctx) => closeBye(cc);
    const on: Record<string, (cc: Ctx) => void> = {};
    for (const k of Object.keys(oldFriend.intents)) if (!k.endsWith("_ctx")) on[k] = bye;
    for (const k of ["g_bye", "g_thanks", "g_ok", "g_hello"]) on[k] = bye;
    on.say_hi_to = (cc) => { if (once(cc, "sayhi")) cc.say("i_will"); closeBye(cc); };
    c.expect({ id: "closing", expects: ["nice_to_see", "you_too", "say_hi_to"], hints: ["goodbye"], suggest: [{ lt: "Atsisveikinti", hint: "goodbye" }], on, yes: bye, no: bye });
  },

  tests: [
    { say: "Lucy! Long time no see!", intent: "greet", step: "recognize" },
    { say: "Oh my gosh, Lucy! What a surprise!", intent: "greet", step: "recognize" },
    { say: "Yes, it's me!", intent: "greet", step: "recognize" },
    { say: "It's so good to see you!", intent: "greet", step: "recognize" },
    { say: "Sorry, who are you?", intent: "who_are_you", step: "recognize" },
    { say: "Neither have you!", intent: "compliment_back", step: "changed" },
    { say: "Thanks, you too!", intent: "you_too", step: "changed", not: ["g_bye"] },
    { say: "Really good, thanks! And you?", intent: "been_ans", step: "howbeen" },
    { say: "Not bad, can't complain", intent: "been_ans", step: "howbeen" },
    { say: "Not so good, actually", intent: "been_ans", step: "howbeen" },
    { say: "How have you been?", intent: "ask_been" },
    { say: "I moved here last year", intent: "news", step: "upto" },
    { say: "I have a new job and I'm learning English", intent: "news", step: "upto" },
    { say: "I got married!", intent: "news", step: "upto" },
    { say: "I have two kids now. What about you?", intent: "news", step: "upto" },
    { say: "Not much, the usual", intent: "news", step: "upto" },
    { say: "What's new with you?", intent: "ask_news" },
    { say: "Congratulations!", intent: "react_news", step: "lucy1" },
    { say: "No way! Twins?", intent: "react_news", step: "lucy2" },
    { say: "They're great, thanks!", intent: "family_ans", step: "family" },
    { say: "Of course! How is he?", intent: "mike_yes", step: "mike" },
    { say: "Sorry, I don't remember him", intent: "mike_no", step: "mike", not: ["mike_yes"] },
    { say: "Do you have time for a coffee?", intent: "coffee_invite" },
    { say: "Have you got time for a coffee?", intent: "coffee_invite" },
    { say: "Sorry, I have to go", intent: "decline", step: "coffee" },
    // the shared leaving phrases work here too (BUG-REVIEW, still open: s84 and s86)
    { say: "I'll call you later.", intent: "g_bye", step: "howbeen" },
    { say: "I have to leave early.", intent: "g_bye", step: "upto" },
    { say: "Sorry, I have to go, I'm in a hurry.", intent: "g_bye", step: "howbeen" },
    { say: "Sorry, I have to go to work.", intent: "decline", step: "coffee" },
    { say: "I don't have to go.", intent: "none" },
    { say: "Maybe next time", intent: "decline", step: "coffee" },
    { say: "Let's keep in touch!", intent: "keep_in_touch" },
    { say: "My number is 555 0142", intent: "number_ctx", step: "numbers" },
    { say: "Five five five, oh one four two", intent: "number_ctx", step: "numbers" },
    { say: "Can I have your number?", intent: "ask_number" },
    { say: "It was so good to see you!", intent: "nice_to_see" },
    { say: "Say hi to Mike for me!", intent: "say_hi_to" },
    { say: "I don't want to keep in touch", intent: "none", not: ["keep_in_touch"] },
    { say: "555 0142", intent: "none" },
    { say: "the bicycle is dancing on the roof", intent: "none" },
    // wider phrasing (learner English and natural alternatives)
    { say: "Wow, what are you doing here?", intent: "greet", step: "recognize" },
    { say: "I didn't recognize you!", intent: "greet", step: "recognize" },
    { say: "Ten years! Wow!", intent: "greet", step: "recognize" },
    { say: "You are still so pretty", intent: "compliment_back", step: "changed" },
    { say: "Life is good", intent: "been_ans", step: "howbeen" },
    { say: "Not so good, my mother was sick", intent: "been_ans", step: "howbeen" },
    { say: "I'm working as a nurse here", intent: "news", step: "upto" },
    { say: "We moved here for work", intent: "news", step: "upto" },
    { say: "How old are they?", intent: "react_news", step: "lucy2" },
    { say: "My kids are big now", intent: "family_ans", step: "family" },
    { say: "The tall guy?", intent: "mike_yes", step: "mike" },
    { say: "Hmm, maybe. Remind me?", intent: "mike_no", step: "mike" },
    { say: "I have 20 minutes", intent: "agree", step: "coffee" },
    { say: "Do you have WhatsApp?", intent: "ask_number" },
    { say: "Here, take my number: 555 0142", intent: "number_ctx", step: "numbers" },
    // meaning must not flip
    { say: "Sorry, I forgot him", intent: "mike_no", step: "mike", not: ["mike_yes"] },
    { say: "No, I don't know any Mike", intent: "mike_no", step: "mike", not: ["mike_yes"] },
    { say: "Not now, I'm busy", intent: "decline", step: "coffee", not: ["agree", "good_idea"] },
    { say: "I can't today", intent: "decline", step: "coffee", not: ["agree"] },
    { say: "Sorry, I don't remember you", intent: "who_are_you", step: "recognize", not: ["greet"] },
    { say: "I live here now. I moved here two years ago for work.", intent: "news", step: "upto" },
    { say: "I'm a nurse now.", intent: "news", step: "upto" },
    { say: "I work in a hospital now.", intent: "news", step: "upto" },
    { say: "I'm not a nurse now.", intent: "none", step: "upto" },
  ],

  sims: [
    { name: "catching up", turns: [
      "Lucy! Oh my gosh! Long time no see!", "Neither have you!", "Really good, thanks! And you?", "I moved here last year and I have a new job. What about you?",
      "Congratulations!", "Wow, twins! Congratulations!", "Let's keep in touch!", "My number is 555 0142", "You too! Bye!",
    ], expect: { complete: true }, auto: AUTO },
    { name: "short answers", turns: [
      "Hi Lucy!", "Thanks!", "Good, thanks", "Not much, the usual", "Congratulations!", "Wow!", "Sure! It's 555 0142", "Bye!",
    ], expect: { complete: true }, auto: AUTO },
    // "Sorry, I have to go." before swapping numbers: "Wait, … What's your number?", then goodbye
    { name: "leaving in a hurry", turns: [
      "Hi Lucy!", "Thanks!", "Good, thanks", "Not much, I'm learning English.", "Sorry, I have to go.", "Sure, it's 555 0142.",
    ], expect: { complete: true }, auto: AUTO },
    { name: "learner asks first", turns: [
      "Yes, it's me! What a surprise!", "You look great too!", "How have you been?", "Pretty good, can't complain", "What's new with you?",
      "No way! Congratulations!", "I'm so happy for you!", "I'm learning English. And I got married!", "Can I have your number?", "It was so good to see you!",
    ], expect: { complete: true }, auto: AUTO },
  ],
};

export default oldFriend;
