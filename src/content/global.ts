// Conversation skills available in every situation: asking to repeat, to slow down,
// to spell or write something down, saying you are still learning, greetings,
// "How are you?", thanks and goodbyes. Song 62 "Could You Say That Again?".
//
// Lithuanian address: {j:…|t:…} = jūs (strangers, staff) / tu (friends).

import type { GlobalContent, ConvCtx } from "../convo/dialogue";
import type { HintGroup, SentSrc } from "./types";

const t = (en: string, lt: string, nat: string, extra: Partial<SentSrc> = {}): SentSrc => ({ en, lt, nat, ...extra });

export const GLOBAL_LINES: Record<string, SentSrc[]> = {
  g_not_understood: [
    t("Sorry, | I | didn't catch | that.", "Atsiprašau, | aš | nenugirdau | to.", "Atsiprašau, nenugirdau."),
    t("Sorry, | could | you | say | that | again?", "Atsiprašau, | ar {j:galėtumėte|t:galėtum} | {j:jūs|t:tu} | pasakyti | tai | dar kartą?", "Atsiprašau, ar {j:galėtumėte|t:galėtum} pakartoti?"),
    t("I'm sorry, | I | didn't understand.", "Atsiprašau, | aš | nesupratau.", "Atsiprašau, nesupratau."),
  ],
  g_yes_what: [
    t("Sure! | What | can | I | do | for you?", "Žinoma! | Ką | galiu | aš | padaryti | {j:jums|t:tau}?", "Žinoma! Kuo galiu padėti?"),
  ],
  g_no_ok: [
    t("Okay, | no | problem.", "Gerai, | jokių | problemų.", "Gerai, jokių problemų."),
  ],
  /** A neutral reply when an understood answer would otherwise get none (dialogue.ts). */
  g_ack: [
    t("I see.", "Suprantu.", "Suprantu."),
    t("Got it.", "Supratau.", "Supratau."),
    t("Okay.", "Gerai.", "Gerai."),
  ],
  g_repeat_intro: [
    t("Sure!", "Žinoma!", "Žinoma!"),
    t("Of course.", "Žinoma.", "Žinoma."),
    t("No | problem.", "Jokių | problemų.", "Jokių problemų."),
  ],
  g_slow_intro: [
    t("Sure, | I'll speak | more slowly.", "Žinoma, | kalbėsiu | lėčiau.", "Žinoma, kalbėsiu lėčiau."),
    t("Of course. | I'll say | it | slowly.", "Žinoma. | Pasakysiu | tai | lėtai.", "Žinoma. Pasakysiu lėtai."),
  ],
  g_dont_understand: [
    t("No | problem. | I'll say | it | again, | more slowly.", "Jokių | problemų. | Pasakysiu | tai | dar kartą, | lėčiau.", "Jokių problemų. Pakartosiu lėčiau."),
  ],
  g_learning: [
    t("No | problem! | Your | English | is | really | good.", "Jokių | problemų! | {j:Jūsų|t:Tavo} | anglų kalba | yra | tikrai | gera.", "Jokių problemų! {j:Jūs|t:Tu} tikrai gerai {j:kalbate|t:kalbi} angliškai."),
    t("That's | okay! | You're doing | great.", "Tai | gerai! | {j:Jums|t:Tau} sekasi | puikiai.", "Nieko tokio! {j:Jums|t:Tau} puikiai sekasi."),
  ],
  g_speak_slowly: [
    t("I'll speak | slowly.", "Kalbėsiu | lėtai.", "Kalbėsiu lėtai."),
    t("I'll speak | more slowly.", "Kalbėsiu | lėčiau.", "Kalbėsiu lėčiau."),
  ],
  g_welcome: [
    t("You're welcome!", "Prašom!", "Prašom!"),
    t("No | problem!", "Jokių | problemų!", "Nėra už ką!"),
    t("Anytime!", "Visada prašom!", "Visada prašom!"),
    t("My | pleasure!", "Mano | malonumas!", "Mielai!"),
  ],
  g_bye: [
    t("Bye! | Have | a | great | day!", "Iki! | Linkiu | — | puikios | dienos!", "Iki! Puikios dienos!"),
    t("Take care!", "{j:Laikykitės|t:Laikykis}!", "{j:Laikykitės|t:Laikykis}!"),
    t("See you!", "Iki!", "Iki!"),
    t("Goodbye! | Have | a | nice | day!", "Viso gero! | Linkiu | — | geros | dienos!", "Viso gero! Geros dienos!"),
  ],
  g_take_time: [
    t("Sure, | take your time.", "Žinoma, | {j:neskubėkite|t:neskubėk}.", "Žinoma, {j:neskubėkite|t:neskubėk}."),
    t("No | rush.", "Jokio | skubėjimo.", "{j:Neskubėkite|t:Neskubėk}."),
    t("Take your time.", "{j:Neskubėkite|t:Neskubėk}.", "{j:Neskubėkite|t:Neskubėk}."),
  ],
  g_no_worries: [
    t("No | worries!", "Jokių | rūpesčių!", "Nieko tokio!"),
    t("That's | okay!", "Tai | gerai!", "Nieko tokio!"),
    t("Don't worry | about | it!", "{j:Nesijaudinkite|t:Nesijaudink} | dėl | to!", "{j:Nesijaudinkite|t:Nesijaudink}!"),
  ],
  g_howareyou_reply: [
    t("I'm | good, | thanks! | And | you?", "Man | gerai, | ačiū! | O | {j:jums|t:tau}?", "Gerai, ačiū! O {j:jums|t:tau}?"),
    t("Pretty | good, | thanks! | And | you?", "Visai | gerai, | ačiū! | O | {j:jums|t:tau}?", "Visai gerai, ačiū! O {j:jums|t:tau}?"),
    t("Not bad, | thanks! | How | are | you?", "Neblogai, | ačiū! | Kaip | sekasi | {j:jums|t:tau}?", "Neblogai, ačiū! Kaip {j:jums|t:tau} sekasi?"),
  ],
  g_glad: [
    t("Glad | to hear | it!", "Smagu | girdėti | tai!", "Smagu girdėti!"),
    t("Good | to hear!", "Gera | girdėti!", "Gera girdėti!"),
    t("Nice!", "Puiku!", "Puiku!"),
  ],
  g_asked_back: [
    t("I'm | great, | thanks | for | asking!", "Man | puikiai, | ačiū, | kad | {j:klausiate|t:klausi}!", "Puikiai, ačiū, kad {j:klausiate|t:klausi}!"),
    t("Good, | thank | you!", "Gerai, | dėkoju | {j:jums|t:tau}!", "Gerai, ačiū!"),
    t("Pretty | good, | thanks!", "Visai | gerai, | ačiū!", "Visai gerai, ačiū!"),
  ],
  g_sorry_to_hear: [
    t("Oh | no, | I'm | sorry | to hear | that.", "O | ne, | man | gaila | girdėti | tai.", "O ne, gaila tai girdėti."),
  ],
  g_hello: [
    t("Hello!", "{j:Sveiki|t:Labas}!", "{j:Sveiki|t:Labas}!"),
    t("Hi!", "{j:Sveiki|t:Labas}!", "{j:Sveiki|t:Labas}!"),
  ],
  g_meaning: [
    t("Good | question! | Let | me | show | you.", "Geras | klausimas! | {j:Leiskite|t:Leisk} | man | parodyti | {j:jums|t:tau}.", "Geras klausimas! Tuoj parodysiu."),
    t("Here, | let | me | explain.", "Štai, | {j:leiskite|t:leisk} | man | paaiškinti.", "Tuoj paaiškinsiu."),
  ],
  g_write: [
    t("Sure, | here you go.", "Žinoma, | prašom.", "Žinoma, prašom."),
    t("No | problem, | here you go.", "Jokių | problemų, | prašom.", "Jokių problemų, prašom."),
  ],
  g_spell: [
    t("It's | spelled | {$letters}.", "Tai | rašoma | {$letters}.", "Rašoma taip: {$letters}.", { say: "It's spelled {$letters}." }),
    t("Sure: | {$letters}.", "Žinoma: | {$letters}.", "Žinoma: {$letters}.", { say: "Sure. {$letters}." }),
  ],
  g_which_word: [
    t("Which | word?", "Kurį | žodį?", "Kurį žodį?"),
  ],
  g_nothing_to_write: [
    t("Oh, | there's | nothing | to write | down.", "O, | nėra | nieko | užrašyti | —.", "O, nėra ką užrašyti.", { flags: { 4: "down: the prefix už- of užrašyti carries it (linked to “to write”)." } }),
  ],
};

// ---------------------------------------------------------------------------

export const GLOBAL_MACROS: Record<string, string | string[]> = {
  could_you: "(could | can | would) you",
  can_i: "(can | could | may) i",
  det: "(a | an | one | the | some | another | this | that | my)",
  greet: "(hi | hello | hey | good morning | good afternoon | good evening | hi there | hello there | hey there | morning)",
  // a short reason after "Sorry, I have to go" in the same breath (#driving: "Drive safe!" fits). No reason
  // with a preposition ("I'm at work", "in the car"): "I have to go to work" would pass for one.
  leaving_why: "[sorry] [because | since] (i am driving [now | right now] #driving | i am (busy | in a hurry | late | running late) | i have (another | a) (call | meeting | appointment) [now | right now | soon | at {time}] | (my | the) (bus | train | taxi | ride) is (here | coming) | my (battery | phone) is (dying | low | almost dead) | someone is at the door)",
};

/** Leaving early ("Sorry, I have to go.", "I'll call you back later."), shared by every situation. #leaving = only a
 *  goodbye when nothing but thanks or another goodbye follows ("I need to go to the airport" is not one; see nlu.ts).
 *  A situation with its own g_bye intent adds these to it, so leaving works the same everywhere. */
export const LEAVING_PATTERNS = [
  "#leaving [sorry] [i am afraid] i (have to | need to | must | got to | have got to | should) (go | leave | run | get going | hang up) [now | right now | early | a bit early | a little early | soon] [today] [@leaving_why]",
  "#leaving [sorry] i had better (go | leave | get going) [now] [@leaving_why]",
  "#leaving [sorry] (i will | i can | let me | can i) call [you] back [later | tomorrow | another time]",
  "#leaving [sorry] i will call you later",
];

export const GLOBAL_INTENTS: Record<string, { patterns: string[] }> = {
  g_repeat: { patterns: [
    "(sorry | pardon | pardon me | come again | what | i beg your pardon | excuse me)",
    "[sorry | pardon] @could_you (say | repeat) (that | it) [again | one more time | once more] #h:c_say_again",
    "[sorry | pardon] @could_you repeat [that | it | the question] [again | one more time | once more] #h:c_repeat",
    "[sorry] (say | repeat) (that | it) again",
    "[sorry] what did you say",
    "[sorry] what was that",
    "[sorry] i did not (catch | get | hear) (that | it | you) #h:c_catch",
    "[sorry] i did not catch what you said #h:c_catch",
    "(one more time | once more | again | say again | repeat [that])",
  ] },
  g_slower: { patterns: [
    "[sorry] @could_you (speak | talk | say (it | that) | go) [a (little | bit)] (more slowly | slower | slowly) #h:c_slower",
    "[a (little | bit)] (more slowly | slower | slowly)",
    "@could_you slow down [a (little | bit)]",
    "slow down", "not so fast",
    "you (speak | talk | are talking | are speaking) (too fast | very fast | so fast | fast | too quickly)",
  ] },
  g_dont_understand: { patterns: [
    "[sorry] i (do not | can not) understand [you | that | what you said] #h:c_dont_understand",
    "[sorry] i did not understand [you | that | what you said | the question]",
    "[sorry] i do not get it",
  ] },
  g_spell: { patterns: [
    "how do you spell (that | it | this | the name | the word) #h:c_spell",
    "@could_you spell (that | it | this) [for me]",
    "spell (that | it)",
    "how is (that | it) spelled",
  ] },
  g_write: { patterns: [
    "@could_you write (that | it | this) down [for me] #h:c_write",
    "@could_you write (that | it) for me",
    "write (it | that) down",
  ] },
  g_meaning: { patterns: [
    "what does (that | it | this) mean #h:c_meaning",
    "what does {w:any} mean",
    "what do you mean [by {w:any}]",
    "i do not know (that | this | the) word",
    "what does the word {w:any} mean",
  ] },
  g_learning: { patterns: [
    "[sorry] i am [still | just] learning english #h:c_learning",
    "[sorry] my english is not [very | so | that] good",
    "[sorry] i do not speak english [very | that | so] well",
    "[sorry] my english is (bad | not good | not great)",
    "i am [still] learning",
    "english is not my (first | native) language",
  ] },
  g_thanks: { patterns: [
    "thank you [very much | so much] #h:s_thanks",
    "thanks [a lot | so much | very much]",
    "many thanks", "cheers",
    "(thank you | thanks) for (your help | the help | everything | helping me | your time) #h:s_thanks_help",
    "(thanks | thank you) again", "(great | perfect | wonderful | awesome | excellent | lovely | amazing) (thank you | thanks) [very much | so much | a lot]",
    "you (have been | were) (very | so | really | super) helpful", "that was (very | really | so) helpful", "you helped me a lot", "i (really | very much) appreciate (it | your help)", "i appreciate your help",
  ] },
  g_bye: { patterns: [
    "(bye | goodbye | bye bye | see you | see you later | see you soon | take care | good night | talk to you later) #h:s_bye2",
    "see you (next time | again | then | next week | tomorrow | around)", "until next time", "have a good (one | rest of your day)", "bye for now",
    "have a (nice | good | great | lovely) (day | one | evening | night | weekend) #h:s_bye",
    "you too",
    ...LEAVING_PATTERNS,
  ] },
  g_hello: { patterns: ["@greet #h:s_hello"] },
  g_howareyou: { patterns: [
    "how are you [doing] [today]", "how is it going", "how are things", "how is your day [going]",
    "how have you been", "what is up", "how is everything", "@greet how are you [doing] [today]",
  ] },
  g_howareyou_answer: { patterns: [
    "[i am] [doing] (good #h:h_good | fine #h:h_fine | great #h:h_great | well | okay | very well | pretty good #h:h_pretty | not bad #h:h_notbad | really good | all good | wonderful | excellent | not too bad | all right) [thanks | thank you | thank you very much] [(and | how about | what about) you | how are you | and how are you | and yourself | how about yourself]",
    "[i am] (good | fine | great | not bad | pretty good) thanks for asking",
    "[i am] [doing] (good | fine | great | very good | really good | pretty good | not bad | okay) [thanks | thank you] and [i am] [very | really | so | a (little | bit)] hungry",
    "[i am] [doing] (very | really | so | super) (good | well | great | fine) [thanks | thank you | thank you very much] [(and | how about | what about) you | how are you | and how are you | and yourself | how about yourself]",
  ] },
  g_howareyou_bad: { patterns: [
    "[i am] (not [so | too | very] good | not great | a bit tired | tired | so so | not so well | not very well | a little tired | not feeling well)",
  ] },
  g_wait: { patterns: [
    "just a (second | moment | minute | sec) #h:c_moment", "one (second | moment | minute | sec)",
    "give me a (second | moment | minute)", "let me (think | see | check)", "hold on [a second]",
    "wait a (second | moment | minute)", "wait",
  ] },
  g_sorry: { patterns: ["i am [so | very | really] sorry", "sorry about that", "my bad", "oops", "sorry for (that | the trouble)"] },
  g_dontknow: { patterns: ["i do not know", "i am not sure", "no idea", "i have no idea", "i can not decide", "i do not know yet"] },
  g_ok: { patterns: ["(got it | i see | i understand | understood | sounds good | fine | awesome | great | perfect | cool | nice | good | okay then | all right then)"] },
};

// ---------------------------------------------------------------------------

function lastWith(c: ConvCtx, key: "spell" | "write") {
  const lines = c.conv.lastLines;
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i];
    const src = (c.conv.sit.lines[l.lineId] ?? GLOBAL_LINES[l.lineId])?.[l.variant];
    if (src?.[key]) return src[key]!;
  }
  return null;
}

export const GLOBAL_HANDLERS: Record<string, (c: ConvCtx, slots: any) => void> = {
  g_repeat(c) {
    if (c.chance(0.4)) c.say("g_repeat_intro");
    c.conv.replayLast(false);
    c.hold();
  },
  g_slower(c) {
    c.say("g_slow_intro");
    c.conv.markSlow();
    c.conv.replayLast(true);
    c.hold();
  },
  g_dont_understand(c) {
    c.say("g_dont_understand");
    c.conv.markSlow();
    c.conv.replayLast(true);
    c.conv.showMeaning();
    c.hold();
  },
  g_spell(c) {
    const w = lastWith(c, "spell");
    if (w) c.say("g_spell", { letters: w });
    else c.say("g_which_word");
    c.hold();
  },
  g_write(c) {
    const w = lastWith(c, "write") ?? lastWith(c, "spell");
    if (w) { c.say("g_write"); c.conv.addNote({ en: w }); }
    else c.say("g_nothing_to_write");
    c.hold();
  },
  g_meaning(c) {
    c.say("g_meaning");
    c.conv.showMeaning();
    c.hold();
  },
  g_learning(c) {
    c.say("g_learning");
    c.say("g_speak_slowly");
    c.conv.markSlow();
  },
  g_thanks(c) {
    c.say("g_welcome");
    if (c.conv.completed) c.hold();
  },
  g_bye(c) {
    c.say("g_bye");
    c.end();
    c.hold(); // no open question is asked again after "Bye!"
  },
  g_hello(c) {
    if (!c.s.__greetedBack) { c.say("g_hello"); c.s.__greetedBack = true; }
  },
  g_howareyou(c) {
    c.say("g_howareyou_reply");
    expectHowAreYou(c);
    // the NPC's own question comes back after the small talk
  },
  g_howareyou_answer(c) {
    // Unprompted "Fine, thanks, and you?": answer only the question part.
    if (askedBack(c)) c.say("g_asked_back");
  },
  g_howareyou_bad(c) { c.say("g_sorry_to_hear"); },
  g_wait(c) { c.say("g_take_time"); c.hold(); },
  g_sorry(c) { c.say("g_no_worries"); },
  g_dontknow(c) {
    const st = c.conv.currentStep();
    if (st?.help) { st.help(c); c.hold(); }
    else { c.say("g_take_time"); c.hold(); }
  },
  g_ok() { /* acknowledgement: just continue */ },
};

/** "…and you?" / "How about yourself?" — but not the "you" in "thank you". */
const askedBack = (c: { heard: string }) => /\b(you|yourself|u)\b/i.test((c.heard || "").replace(/\bthank(s)?\s+(you|u)\b(\s+(very|so)\s+much)?/gi, " "));

/** After an NPC line that asks "How are you?": handle the learner's answer (and "And you?"). */
export function expectHowAreYou(c: import("./types").Ctx, then?: (c: import("./types").Ctx) => void) {
  const reply = (cc: import("./types").Ctx, bad = false) => {
    if (bad) cc.say("g_sorry_to_hear");
    else if (askedBack(cc)) cc.say("g_asked_back");
    else cc.say("g_glad");
    then?.(cc);
  };
  c.expect({
    id: "howareyou",
    optional: true,
    expects: ["g_howareyou_answer", "g_howareyou_bad"],
    hints: ["g_howareyou"],
    suggest: [{ lt: "Atsakyti, kaip sekasi (ir paklausti atgal)", hint: "g_howareyou" }],
    on: {
      g_howareyou_answer: (cc) => { reply(cc); },
      g_howareyou_bad: (cc) => { reply(cc, true); },
      g_ok: (cc) => { reply(cc); },
    },
    yes: (cc) => reply(cc),
  });
}

// ---------------------------------------------------------------------------

export const GLOBAL_HINTS: Record<string, HintGroup> = {
  g_clarify: {
    lt: "Paprašyti pakartoti, kalbėti lėčiau ar paaiškinti",
    items: [
      { id: "c_say_again", s: t("Sorry, | could | you | say | that | again?", "Atsiprašau, | ar {j:galėtumėte|t:galėtum} | {j:jūs|t:tu} | pasakyti | tai | dar kartą?", "Atsiprašau, ar {j:galėtumėte|t:galėtum} pakartoti?") },
      { id: "c_repeat", s: t("Could | you | repeat | that, | please?", "Ar {j:galėtumėte|t:galėtum} | {j:jūs|t:tu} | pakartoti | tai, | prašau?", "Ar {j:galėtumėte|t:galėtum} pakartoti?") },
      { id: "c_slower", s: t("Could | you | speak | more slowly, | please?", "Ar {j:galėtumėte|t:galėtum} | {j:jūs|t:tu} | kalbėti | lėčiau, | prašau?", "Ar {j:galėtumėte|t:galėtum} kalbėti lėčiau?") },
      { id: "c_catch", s: t("Sorry, | I | didn't catch | that.", "Atsiprašau, | aš | nenugirdau | to.", "Atsiprašau, nenugirdau.") },
      { id: "c_dont_understand", s: t("Sorry, | I | don't understand.", "Atsiprašau, | aš | nesuprantu.", "Atsiprašau, nesuprantu.") },
      { id: "c_spell", s: t("How | do | you | spell | that?", "Kaip | — | {j:jūs|t:tu} | {j:rašote|t:rašai} | tai?", "Kaip tai rašoma?", { flags: { 1: "Question “do” has no Lithuanian word; the tense sits on the verb (linked to “spell”)." } }) },
      { id: "c_meaning", s: t("What | does | that | mean?", "Ką | — | tai | reiškia?", "Ką tai reiškia?", { flags: { 1: "Question “does” has no Lithuanian word; the tense sits on “reiškia” (linked to “mean”)." } }) },
      { id: "c_write", s: t("Could | you | write | it | down, | please?", "Ar {j:galėtumėte|t:galėtum} | {j:jūs|t:tu} | užrašyti | tai | —, | prašau?", "Ar {j:galėtumėte|t:galėtum} užrašyti?", { flags: { 4: "Discontinuous “write … down”: the prefix už- of užrašyti carries “down” (linked to “write”)." } }) },
      { id: "c_learning", s: t("I'm | still | learning | English.", "Aš | dar | mokausi | anglų kalbos.", "Aš dar mokausi anglų kalbos.", { flags: { 0: "Progressive “am” has no separate Lithuanian word; the present tense of mokausi carries it." } }) },
      { id: "c_moment", s: t("Just | a | moment, | please.", "Tik | — | akimirką, | prašau.", "Akimirką, prašau.") },
    ],
  },
  // closings (thanks first: the guide shows the first items as model answers)
  g_social: {
    lt: "Padėkoti ir atsisveikinti",
    items: [
      { id: "s_thanks", s: t("Thank | you | very much!", "Dėkoju | {j:jums|t:tau} | labai!", "Labai ačiū!") },
      { id: "s_thanks_help", s: t("Thanks | for | your | help!", "Ačiū | už | {j:jūsų|t:tavo} | pagalbą!", "Ačiū už pagalbą!") },
      { id: "s_bye", s: t("Have | a | nice | day!", "Linkiu | — | geros | dienos!", "Geros dienos!") },
      { id: "s_bye2", s: t("Goodbye!", "Viso gero!", "Viso gero!") },
      { id: "s_hello", s: t("Hi! | How | are | you?", "{j:Sveiki|t:Labas}! | Kaip | sekasi | {j:jums|t:tau}?", "{j:Sveiki|t:Labas}! Kaip sekasi?") },
    ],
  },
  g_greet: {
    lt: "Pasisveikinti",
    items: [
      { id: "s_hello", s: t("Hi! | How | are | you?", "{j:Sveiki|t:Labas}! | Kaip | sekasi | {j:jums|t:tau}?", "{j:Sveiki|t:Labas}! Kaip sekasi?") },
      { id: "s_good_morning", s: t("Good | morning!", "Labas | rytas!", "Labas rytas!") },
      { id: "s_hello_there", s: t("Hello!", "{j:Sveiki|t:Labas}!", "{j:Sveiki|t:Labas}!") },
    ],
  },
  g_yesno: {
    lt: "Atsakyti: taip arba ne",
    items: [
      { id: "yn_yes_please", s: t("Yes, | please.", "Taip, | prašau.", "Taip, prašau.") },
      { id: "yn_no_thanks", s: t("No, | thanks.", "Ne, | ačiū.", "Ne, ačiū.") },
      { id: "yn_sure", s: t("Sure, | thanks!", "Žinoma, | ačiū!", "Žinoma, ačiū!") },
      { id: "yn_im_good", s: t("No, | I'm | good, | thanks.", "Ne, | man | užtenka, | ačiū.", "Ne, man nereikia, ačiū."), note: "„I'm good“ – mandagus atsisakymas." },
      { id: "yn_great", s: t("That | would | be | great, | thanks.", "Tai | — | būtų | puiku, | ačiū.", "Būtų puiku, ačiū.", { flags: { 1: "“would” has no separate word: the conditional būtų carries it (linked to “be”)." } }) },
    ],
  },
  g_howareyou: {
    lt: "Atsakyti, kaip sekasi",
    items: [
      { id: "h_good", s: t("I'm | good, | thanks. | And | you?", "Man | gerai, | ačiū. | O | {j:jums|t:tau}?", "Gerai, ačiū. O {j:jums|t:tau}?") },
      { id: "h_fine", s: t("Fine, | thank | you. | And | you?", "Gerai, | dėkoju | {j:jums|t:tau}. | O | {j:jums|t:tau}?", "Gerai, ačiū. O {j:jums|t:tau}?") },
      { id: "h_pretty", s: t("Pretty | good, | thanks!", "Visai | gerai, | ačiū!", "Visai gerai, ačiū!") },
      { id: "h_notbad", s: t("Not bad, | thanks. | How | are | you?", "Neblogai, | ačiū. | Kaip | sekasi | {j:jums|t:tau}?", "Neblogai, ačiū. Kaip {j:jums|t:tau} sekasi?") },
      { id: "h_great", s: t("Great, | thanks | for | asking!", "Puikiai, | ačiū, | kad | {j:klausiate|t:klausi}!", "Puikiai, ačiū, kad {j:klausiate|t:klausi}!") },
    ],
  },
};

export const GLOBAL_TIPS = {
  blunt: { key: "blunt", lt: "Suprasta! Mandagiau skambėtų: „I'd like …, please“ arba „Could I have …?“", better: "I'd like …, please." },
};

export const GLOBAL: GlobalContent = {
  intents: GLOBAL_INTENTS,
  lines: GLOBAL_LINES,
  hints: GLOBAL_HINTS,
  tips: GLOBAL_TIPS,
  entities: [],
  handlers: GLOBAL_HANDLERS,
  macros: GLOBAL_MACROS,
};
