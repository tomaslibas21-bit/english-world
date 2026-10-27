// Advanced song P18 "Up to My Ears" (B2–C1): a week at a startup, and a boss who talks in business idioms.
// Sproutly, a plant-care app in an old harbor warehouse (a red slide, beanbags, a wall of sticky notes, Wi-Fi the
// dog asleep by the printer). Wednesday of the learner's first week. Tyler, the founder (hoodie, flip-flops, kind and
// chaotic), wants to "touch base" and asks how it's going ("Steep learning curve, huh?"). The learner answers
// plainly or with the song's idioms ("I'm learning the ropes"). Then he piles on three new tasks (the investor slides
// by Friday, the launch party, a photo for the newsletter: "Let's get the ball rolling! Think outside the box!") on
// top of the learner's bug reports and customer emails. The learner says it's too much ("I'm up to my ears in bug
// reports", "I already have a lot on my plate") and settles the priorities: asks ("What should I focus on first?")
// or proposes ("I can do the slides first and the rest next week", "Could someone else do the launch party?"). A
// party-first plan gets one gentle push back. Then "Anything else you need from me?": who owns what (from ADV-018:
// the budget and payroll are Rachel's, the party and the newsletter Kevin's, the code Ben's, the slides are due
// Friday at noon). The first such question gets "Let's take that offline"; asking again gets the real answer.
// At the end: "Touch base again at eight tomorrow?" The learner agrees, moves it ("Could we make it noon?", as in
// the song) or calls it a day.
// Every idiom Tyler uses can be asked about at any moment ("What does 'touch base' mean?", "Is that an idiom?",
// "What do you mean?", "What base?"): he explains it in plain English (two versions each, 15 idioms) and goes on.
// The global "What does … mean?" never answers them generically: the situation's own idiom_q intent outranks the
// global g_meaning (tests below), and the g_meaning / g_dont_understand handlers here explain the idiom Tyler just
// used. When the learner uses an idiom themselves, Tyler notices once ("Look at you, talking like a founder!").
// Twists (one per visit: 35 % on the first visit, 85 % later, an unseen one first):
//   crash    (the song): after the priorities, the launch crashes: someone cut corners on the code, a million
//            cactuses texted "Water me!", "Back to square one… the ball is in your court!" The learner proposes a
//            plan (fix the bug first, tell the customers, ask Ben, launch next week, roll it back) or asks what he
//            wants; "Who cut corners?" gets an honest "Me."
//   midnight (ADV-018): before the goodbye, "I need everyone here until midnight. Nobody calls it a day at
//            Sproutly!" The learner negotiates ("I can stay until seven, but then I'll call it a day", "Will the
//            overtime be paid?") or says no ("I can't stay late tonight"). Tyler agrees to paid overtime with a
//            finish time. "I can't stay late" never agrees to stay.
//
// Address: Tyler and the learner say tu to each other (NPCS.tyler is informal), so the NPC lines and the hints are
// written with tu. Tyler is male; the learner's own gender is {m:…|f:…}.
//
// Course report: done (c.complete) when items 2, 3 and 4 of the mission are ticked. Items 1 and 5 are optional: they
// leave the list when the goal is met (item 5 also once the "anything else?" moment has passed).
//
// ART (scene set-up: the Sproutly warehouse office: beanbags, a red slide, a wall of sticky notes, hanging plants, a big
// screen with a plant-app mock-up (shapes only, no text), Wi-Fi the scruffy gray terrier asleep by the printer.
// Tyler as in npcs.ts: about 30, a moss-green hoodie, khaki shorts, flip-flops, a short beard, messy blond hair):
//   1. "hello"  (hello: greet, hello_q, hello_*): Tyler waving with a coffee mug, leaning on a beanbag; the dog asleep.
//   2. "idioms" (every mean_* explanation, idiom_back, meta, dog, slide, who_*): Tyler with both hands up, explaining,
//               grinning; the sticky-note wall behind him.
//   3. "pile"   (pile: pile_intro, pile_list, pile_box, pile_weight, pile_q, too_much_*, flat_no_react, rude_react,
//               over_react, rockstar): Tyler holding out three sticky notes (no text) toward the viewer.
//   4. "plan"   (priorities, pushback, deal, owner, closing: prio_*, deal_*, push_*, wa_*, owner_*, close_q, meet_*,
//               when_*): Tyler nodding at a whiteboard with three boxes and arrows (no words).
//   5. "twist"  (crash_* and mid_*): the big screen red, phones buzzing on the desk, a row of cactus pots; the wall
//               clock at 6 p.m.; Tyler with his hands on his head.
//   6. "done"   (close_good, close_partial, call_day_react, bye_*): Tyler giving a thumbs up, Wi-Fi awake and wagging.
//
// NEEDS: none.

import type { Ctx, EntityDef, Pending, Segment, SituationDef, Tip } from "../types";
import { ent, t } from "../dsl";
import { GLOBAL_HANDLERS } from "../global";

// ---------------------------------------------------------------------------
// Flags used more than once

const F_WH_DO = "Question “do” has no Lithuanian word; the tense sits on the verb.";
const F_DOES = "Question “does” has no Lithuanian word; the tense sits on reiškia.";
const F_IS_Q = "Question “Is” = the particle ar; no copula needed.";
const F_COULD_Q = "Question “Could” = ar + the conditional.";
const F_CAN_Q = "Question “Can” = ar + galėti.";
const F_KAD = "Zero “that”: Lithuanian needs kad.";
const F_TAU = "“You're” = tau: sektis takes the dative.";
const F_MAN = "“I” = man: reikėti takes the dative.";
const F_EARS = "“I'm” = man: Lithuanian says “to me (there is) work up to the ears”.";
const F_PROG = "Progressive “'m / 're”: the Lithuanian present carries it.";
const F_AT = "Clock “at”: Lithuanian gives the time without a preposition.";
const F_THATS = "“'s” (is): no copula before a pronoun here (Tai tu / Tai Wi-Fi).";
const F_ONES = "Prop-word “one(s)”: Lithuanian leaves it out.";
const F_FUT = "“'ll”: the future ending of the verb carries it.";

// ---------------------------------------------------------------------------
// Entities: the tasks, the areas somebody owns, and clock hours (for the meeting and the overtime)

const SLIDES = ent("slides", "investor | slides", "investuotojų | skaidrės/skaidrių/skaidrėms/skaidres/skaidrėmis/skaidrėse", "f",
  { chip: "investuotojų skaidrės", forms: ["slides", "the slides", "investor deck", "pitch deck", "deck", "the deck", "slide deck", "presentation", "investor presentation", "the presentation"], attrs: { fresh: true } });
const PARTY = ent("party", "launch | party", "paleidimo | vakarėlis/vakarėlio/vakarėliui/vakarėlį/vakarėliu/vakarėlyje", "m",
  { chip: "paleidimo vakarėlis", forms: ["party", "the party", "launch event", "the launch event", "party for the launch"], attrs: { fresh: true, other: true } });
const PHOTO = ent("photo", "newsletter | photo", "naujienlaiškio | nuotrauka/nuotraukos/nuotraukai/nuotrauką/nuotrauka/nuotraukoje", "f",
  { chip: "naujienlaiškio nuotrauka", forms: ["photo", "the photo", "picture", "the picture", "newsletter", "the newsletter", "newsletter picture", "photo for the newsletter", "picture for the newsletter"], attrs: { fresh: true, other: true } });
const BUGS = ent("bugs", "bug | reports", "klaidų | ataskaitos/ataskaitų/ataskaitoms/ataskaitas/ataskaitomis/ataskaitose", "f",
  { chip: "klaidų ataskaitos", forms: ["bugs", "the bugs", "bug report", "bug fixes", "the bug list", "bug list", "tickets", "the tickets"], attrs: { mine: true } });
const EMAILS = ent("emails", "customer | emails", "klientų | laiškai/laiškų/laiškams/laiškus/laiškais/laiškuose", "m",
  { chip: "klientų laiškai", forms: ["emails", "the emails", "customer email", "support emails", "customer e mails", "e mails", "customer messages", "customer support", "support"], attrs: { mine: true } });
const TASKS: EntityDef[] = [SLIDES, PARTY, PHOTO, BUGS, EMAILS];

const AREAS: EntityDef[] = [
  ent("budget", "budget", "biudžetas/biudžeto/biudžetui/biudžetą/biudžetu/biudžete", "m", { chip: "biudžetas", forms: ["the budget", "money", "the money", "spending", "the spending"] }),
  ent("payroll", "payroll", "atlyginimai/atlyginimų/atlyginimams/atlyginimus/atlyginimais/atlyginimuose", "m",
    { art: "", chip: "atlyginimai", forms: ["salaries", "salary", "pay", "paychecks", "paycheck", "wages", "the payroll", "the salaries"], attrs: { bare: true } }),
  PARTY, PHOTO, SLIDES,
  ent("code", "code", "kodas/kodo/kodui/kodą/kodu/kode", "m", { chip: "kodas", forms: ["the code", "servers", "the servers", "the app", "tech", "the tech", "the website"] }),
  BUGS, EMAILS,
];

const H = (id: string, en: string, lt: string, g: "m" | "f", chip: string, attrs: Record<string, any>) => ent(id, en, lt, g, { art: "", chip, attrs });
const ORD = (stem: string) => `${stem}a/${stem}os/${stem}ai/${stem}ą/${stem}a/${stem}oje`;
const HOURS: EntityDef[] = [
  H("h1", "one", ORD("pirm"), "f", "pirmą", { meet: true }),
  H("h2", "two", ORD("antr"), "f", "antrą", { meet: true }),
  H("h3", "three", "trečia/trečios/trečiai/trečią/trečia/trečioje", "f", "trečią", { meet: true }),
  H("h4", "four", ORD("ketvirt"), "f", "ketvirtą", { meet: true }),
  H("h5", "five", ORD("penkt"), "f", "penktą", { meet: true, eve: true }),
  H("h6", "six", ORD("šešt"), "f", "šeštą", { eve: true }),
  H("h7", "seven", ORD("septint"), "f", "septintą", { meet: true, eve: true }),
  H("h8", "eight", ORD("aštunt"), "f", "aštuntą", { meet: true, eve: true }),
  H("h9", "nine", ORD("devint"), "f", "devintą", { meet: true, eve: true }),
  H("h10", "ten", ORD("dešimt"), "f", "dešimtą", { meet: true, eve: true }),
  H("h11", "eleven", ORD("vienuolikt"), "f", "vienuoliktą", { meet: true, eve: true }),
  H("noon", "noon", "vidurdienis/vidurdienio/vidurdieniui/vidurdienį/vidurdieniu/vidurdienyje", "m", "vidurdienį", { meet: true }),
  H("midnight", "midnight", "vidurnaktis/vidurnakčio/vidurnakčiui/vidurnaktį/vidurnakčiu/vidurnaktyje", "m", "vidurnaktį", {}),
];
const MEET_OK = new Set(HOURS.filter((e) => e.attrs?.meet).map((e) => e.id));

/** A clock time from the {time} slot → an hour entity (whole hours only). */
function hourId(tm?: { h: number; m: number; ampm?: string }): string | undefined {
  if (!tm || typeof tm.h !== "number" || tm.m !== 0) return undefined;
  if (tm.h === 0 || (tm.h === 12 && tm.ampm === "am")) return "midnight";
  if (tm.h === 12) return "noon";
  return "h" + (tm.h > 12 ? tm.h - 12 : tm.h);
}

// ---------------------------------------------------------------------------
// Idioms: the explanation lines (mean_<id>) and which of Tyler's lines use which idiom

const IDIOMS = ["touch_base", "learning_curve", "ropes", "ball_rolling", "outside_box", "ears", "same_page", "weight", "corners",
  "square_one", "court", "call_day", "offline", "plate", "crushing"] as const;

const LINE_IDIOMS: Record<string, string[]> = {
  greet: ["touch_base"], hello_q: ["learning_curve"], hello_learn: ["crushing"], hello_skip: ["ropes"],
  pile_intro: ["ball_rolling"], pile_box: ["outside_box"], pile_weight: ["weight"], pile_know: ["ears"], rockstar: ["crushing"],
  over_react: ["ears"], deal_yes: ["same_page"], deal_no: ["touch_base"], prio_ok: ["same_page"], prio_ok_generic: ["same_page"],
  deleg_brad: ["weight"], push_no: ["corners"], prio_already: ["same_page"], same_page_yes: ["same_page"], who_brad: ["weight"],
  crash_2: ["corners"], crash_3: ["square_one", "court"], crash_end: ["corners"], ball_back_react: ["court"], owner_evasive: ["offline"],
  mid_2: ["call_day"], mid_limit: ["call_day"], mid_limit_generic: ["call_day"], close_q: ["touch_base"], call_day_react: ["call_day"],
  close_good: ["call_day"], close_partial: ["touch_base"], bye_early: ["touch_base"], dog: ["corners"],
  ...Object.fromEntries(IDIOMS.map((id) => [`mean_${id}`, [id]])),
};

/** "What does base mean?": a word of the idiom → the idiom. */
const IDIOM_WORDS: [RegExp, string][] = [
  [/\bbase\b/, "touch_base"], [/\bcurve\b|\bsteep\b/, "learning_curve"], [/\bropes?\b/, "ropes"], [/\brolling\b/, "ball_rolling"],
  [/\bbox\b/, "outside_box"], [/\bears?\b/, "ears"], [/\bpage\b/, "same_page"], [/\bweight\b/, "weight"], [/\bcorners?\b/, "corners"],
  [/\bsquare\b/, "square_one"], [/\bcourt\b/, "court"], [/\bcall it a day\b|\bcalling it a day\b/, "call_day"], [/\boffline\b/, "offline"],
  [/\bplate\b/, "plate"], [/\bcrush(ing)?\b/, "crushing"],
];
function idiomFromWords(w: unknown): string | undefined {
  const s = String(w ?? "").toLowerCase();
  for (const [re, id] of IDIOM_WORDS) if (re.test(s)) return id;
  return undefined;
}

// ---------------------------------------------------------------------------
// Per-turn helpers

const SAID = new WeakMap<Ctx, Set<string>>();
function once(c: Ctx, key: string): boolean {
  let set = SAID.get(c);
  if (!set) { set = new Set(); SAID.set(c, set); }
  if (set.has(key)) return false;
  set.add(key);
  return true;
}
/** Tyler's lines this turn: the first one starts a new list of the idioms he just used. */
const SPOKE = new WeakSet<Ctx>();
function T(c: Ctx, line: string, vars?: Record<string, any>) {
  if (!SPOKE.has(c)) { SPOKE.add(c); c.s.recent = []; }
  c.say(line, vars);
  for (const id of LINE_IDIOMS[line] ?? []) c.s.recent = [...(c.s.recent as string[]).filter((x) => x !== id), id];
}
/** The step whose question comes back short after an explanation ("Anyway! …"), this turn only. */
const AFTER = new WeakMap<Ctx, string>();
/** "I don't know" waits for the end of the turn (the step's question then gives its help), so an answer in the
 *  same breath wins ("I don't know. Maybe the slides first?"). */
const DONT_KNOW = new WeakMap<Ctx, string>();
const asks = (c: Ctx, id: string): number => c.s.asks?.[id] ?? 0;
/** How many times a step was asked. A question asked again after Tyler already answered something this turn
 *  (a side question: the dog, who owns what) doesn't count toward giving up on it. */
function bump(c: Ctx, id: string): number {
  c.s.asks ||= {};
  const prev = asks(c, id);
  if (prev >= 1 && SPOKE.has(c)) return Math.max(prev, 2);
  c.s.asks[id] = prev + 1;
  return c.s.asks[id];
}
function resumed(c: Ctx, id: string): boolean {
  const r = AFTER.get(c) === id && asks(c, id) > 0;
  AFTER.delete(c);
  return r;
}
const first = (v: unknown): string | undefined => (Array.isArray(v) ? v[0] : (v as string | undefined)) ?? undefined;
const list = (v: unknown): string[] => (Array.isArray(v) ? v : v ? [v as string] : []);

const prioResolved = (c: Ctx) => !!c.s.prioDone || !!c.s.prioSkip;
const crashResolved = (c: Ctx) => !!c.s.crashDone || !!c.s.crashSkip;
const crashLive = (c: Ctx) => c.s.twist === "crash" && !!c.s.crashSaid && !crashResolved(c);
const midLive = (c: Ctx) => c.s.twist === "midnight" && !!c.s.midSaid && !c.s.midDone;
const closingLive = (c: Ctx) => !!c.s.ownerDone && (c.s.twist !== "midnight" || !!c.s.midDone) && !c.s.closeDone;
/** Items 2, 3 and 4: what the course report needs. */
const coreDone = (c: Ctx) => !!c.s.overloaded && !!c.s.prioDone && !!c.s.closeDone && c.s.closeHow !== "tyler";
const pendingOpen = (c: Ctx) => !!(c as any).conv?.pending;

/** Sims: no twist unless the sim pins one. */
const PLAIN = (s: Record<string, any>) => { s.twist = null; s.weightLine = false; };
const AUTO: Record<string, string> = {
  too_much: "Yes, it's too much.", pushback: "Okay, the slides first.", deal: "Deal.", crash_ok: "Yes, let's do that.",
  mid_deal: "Deal.", when: "How about ten?", offer: "Sure.", closing: "See you tomorrow!",
};

// ---------------------------------------------------------------------------

export const startup: SituationDef = {
  id: "p18-startup",
  song: "P18",
  songTitle: "Up to My Ears",
  title: { en: "Up to My Ears", lt: "Iki ausų" },
  topic: { en: "A week at a startup", lt: "Savaitė startuolyje" },
  chapter: 9,
  order: 1,
  location: "sproutly",
  npc: "tyler",
  goal: "Susikalbėk su startuolio vadovu, kuris kalba idiomomis: išsiaiškink, ką jos reiškia, pasakyk, kad darbų per daug, ir susitark dėl prioritetų.",
  intro: "Trečiadienis, tavo pirmoji savaitė „Sproutly“ – augalų priežiūros programėlės startuolyje, įsikūrusiame senajame uosto sandėlyje: čiuožykla, sėdmaišiai, lipnių lapelių siena ir šuo, vardu Wi-Fi. Jau turi darbo su klaidų ataskaitomis ir klientų laiškais. O štai ateina įkūrėjas Taileris – geraširdis, chaotiškas ir kalbantis beveik vien verslo idiomomis.",
  entities: { task: TASKS, area: AREAS, hour: HOURS },

  grammar: {
    macros: {
      // the people at Sproutly
      ppl: "(brad | kevin | ben | rachel | someone else | somebody else | another person | the intern | an intern | someone | somebody)",
      dov: "(do | take | handle | organize | take care of | work on | finish | plan | make | prepare | deal with | own | run)",
      later: "(next week | later | after that | on monday | tomorrow | later this week | next monday | after friday | the week after)",
      wait: "(wait | can wait | could wait | wait a week | wait until next week | wait till next week | wait until monday)",
      tail_b: "[and] [then] [i (can | will | could)] [do] {b:task} (next week | later | after that | on monday | tomorrow | next | after)",
      newthree: "(them | those | these | all of them | all three | all of that | all of this | all that | all this | everything | it all | that | this | it | them all | the new tasks | the three things | all these things)",
      fixit: "(fix | repair | debug | solve | find) (the | this | that) (bug | bugs | code | problem | issue | servers | server | app | crash)",
      tellc: "(tell | email | text | write to | message | call | warn | inform | contact | update) (the | our | all the | all our) (customers | users | clients | people | cactus owners | plant owners)",
      sorryc: "(say sorry | apologize) to (the | our | all the) (customers | users | clients | people)",
      askben: "((ask | call | get | wake up | talk to) ben [for help] | ask (the developer | the developers | the tech team) for help | get ben to help)",
      launchlater: "((launch | release | relaunch | try again | do the launch | push the launch) (next week | later | on monday | tomorrow | another day) | (delay | postpone | push back | move) the launch [to next week])",
      rollback: "(roll (it | the update | everything | the feature) back | roll back [the update] | turn (it | the feature | the texts) off | stop the (texts | messages) | pause the (app | texts | feature) | take the feature down | go back to the old version)",
      pl_lead: "[first] [let us | we should | we need to | we have to | i think we should | maybe we should | why do not we | we must | let me | i would | i can | i will | i could | i suggest we | how about we]",
      pl_body: "(@fixit #fix | @tellc #tell | @sorryc #tell | @askben #ben | @launchlater #later | @rollback #rollback)",
      stay_v: "(stay | work | be here | stay here | stay late | work late)",
    },
    slots: {
      // every idiom Tyler uses ("What does … mean?"), with the forms people say when they repeat it
      idiom: { lexicon: [
        { id: "touch_base", forms: ["touch base", "touching base", "touch base again", "base", "the base"] },
        { id: "learning_curve", forms: ["steep learning curve", "a steep learning curve", "learning curve", "the learning curve", "steep curve", "curve", "steep"] },
        { id: "ropes", forms: ["learn the ropes", "learning the ropes", "the ropes", "ropes", "learned the ropes"] },
        { id: "ball_rolling", forms: ["get the ball rolling", "getting the ball rolling", "the ball rolling", "ball rolling", "let us get the ball rolling"] },
        { id: "outside_box", forms: ["think outside the box", "thinking outside the box", "outside the box", "the box", "box"] },
        { id: "ears", forms: ["up to my ears", "up to your ears", "up to our ears", "up to his ears", "up to the ears", "ears"] },
        { id: "same_page", forms: ["on the same page", "the same page", "same page", "not on the same page"] },
        { id: "weight", forms: ["pull your weight", "pull his weight", "pull their weight", "pull my weight", "pulling your weight", "pull weight", "weight"] },
        { id: "corners", forms: ["cut corners", "cutting corners", "cut corners on the code", "corners"] },
        { id: "square_one", forms: ["back to square one", "square one"] },
        { id: "court", forms: ["the ball is in your court", "ball is in your court", "in your court", "the ball is in my court", "in my court", "court"] },
        { id: "call_day", forms: ["call it a day", "calling it a day", "calls it a day"] },
        { id: "offline", forms: ["take that offline", "take it offline", "take this offline", "offline"] },
        { id: "plate", forms: ["on my plate", "on your plate", "a lot on my plate", "plate"] },
        { id: "crushing", forms: ["crushing it", "you are crushing it", "crush it"] },
      ] },
      // a bare echo ("Touch base?"): only the idioms a learner wouldn't say as an answer of their own
      echo: { lexicon: [
        { id: "touch_base", forms: ["touch base", "touching base"] },
        { id: "ball_rolling", forms: ["get the ball rolling", "the ball rolling"] },
        { id: "outside_box", forms: ["think outside the box", "outside the box"] },
        { id: "weight", forms: ["pull your weight", "pull his weight"] },
        { id: "corners", forms: ["cut corners", "cutting corners"] },
        { id: "square_one", forms: ["back to square one", "square one"] },
        { id: "court", forms: ["the ball is in my court", "in my court"] },
        { id: "offline", forms: ["take that offline", "take it offline", "offline"] },
        { id: "crushing", forms: ["crushing it"] },
      ] },
      person: { lexicon: [
        { id: "rachel", forms: ["rachel"] }, { id: "kevin", forms: ["kevin"] }, { id: "brad", forms: ["brad"] }, { id: "ben", forms: ["ben"] },
      ] },
    },
  },

  intents: {
    // --- how is the first week going -----------------------------------------------------
    finding: { patterns: [
      "i am [slowly | still | just | already] learning the ropes [here | slowly | fast | quickly | little by little] #learn #idiom #h:ropes",
      "i am getting the hang of it #learn",
      "(it is | this is) [really | definitely | such | quite] [a] [really | very] steep learning curve [for me] [but i (like | love | enjoy) it] #learn #idiom #h:curve",
      "[a] steep learning curve [for sure | definitely | yes] #learn #idiom",
      "[yes | yeah] [it is] [very | really | super | a bit | quite | so] steep #learn",
      "there is [so | really] (a lot | so much | much) to learn [here] [but i (like | love | enjoy) it] #learn #h:lot_learn",
      "(it is | it is great | it is good) but there is (a lot | so much) to learn #learn #h:lot_learn",
      "(i am | i have been) learning [a lot | so much | fast | every day | new things every day] #learn",
      "everything is [so | very | still] new [for me | to me] #learn",
      "(i am | i feel) [a (little | bit) | kind of | so | totally | still] (lost | confused | overwhelmed) [honestly] #hard #h:lost",
      "[honestly] it is [a (little | bit) | kind of | really | very | pretty] (hard | difficult | tough | crazy | intense | chaotic | stressful | overwhelming) #hard",
      "(it is | everything is | it is all) [really | so | very | pretty | super] (great | good | fun | amazing | awesome | interesting | exciting | cool | fine | okay) [so far] #good #h:great",
      "(it is | everything is) [really | so] (great | good | fun | amazing | exciting) [so far] but (it is a lot | busy | crazy | intense | a little crazy) #good #h:great",
      "i (love | like | enjoy) it [here | so far | a lot] #good #h:love",
      "i am [really] (enjoying | loving) it [so far | here] #good",
      "so far so good #good",
      "(not bad | pretty good | good | great | fine | okay | amazing | awesome) [so far] #good",
      "it is going (well | great | fine | okay | good | really well) [so far] #good",
      "i am (having fun | happy here | having a great time) #good",
      "i (like | love) the (slide | dog | office | team | people | beanbags | warehouse | plants) #good",
      "(i am | i feel) [a (little | bit) | so | really] (tired | exhausted) #hard",
    ] },

    // --- too much ------------------------------------------------------------------------------
    overloaded: { patterns: [
      "i am [already | totally | completely | really | so | pretty much] up to my ears [in (work | {t:task} [and {t2:task}] | stuff | everything | it | tasks)] [already | right now] #idiom #h:ears",
      "i am [already | totally | really] up to my eyes [in (work | {t:task} [and {t2:task}] | stuff | everything)] #tip:uk_eyes",
      "i am [already | totally | really] up to my neck [in (work | {t:task} [and {t2:task}] | stuff | everything)]",
      "i [already | really] have (a lot | too much | so much | plenty | way too much | a ton | tons | enough) on my plate [already | right now | this week] #idiom #h:plate",
      "my plate is [already | really | totally | very] full #idiom",
      "i [already | still] have (a lot of | so much | too much | lots of | tons of | a ton of | enough) (work | things to do | stuff | tasks | stuff to do) [already | right now | this week]",
      "i have (a lot of | so much | too much) (work | things) on my head #tip:head",
      "(that is | it is | this is) [way | really | just | a bit | a little | definitely | kind of] (too much | a lot | a lot of work | too many things | too many tasks | too much work) [for (me | one person | one week | this week)] #h:too_much",
      "[i am sorry but] i (can not | can not really) do (all | all of) (that | this | it | them | those | these | three) [this week | by friday] [too | as well] #h:cant_all",
      "i can not do (it | them) all [this week | by friday]",
      "i can not do everything [this week | by friday]",
      "i can not handle (it | that | this | all of (it | that | this) | everything | it all) [this week | by friday]",
      "i can not (take | take on | do) (anything [else] | any more | more) [work | tasks] [right now | this week]",
      "i (already | still) have {t:task} [and {t2:task}] [to do] [too]",
      "[to be honest | to be fair] i am [already | still] (working on | busy with | stuck with | buried in | drowning in) {t:task} [and {t2:task}]",
      "[to be honest | to be fair] i am [so | really | totally | completely | very | a bit | pretty | already] (swamped | overloaded | overwhelmed | busy | buried | slammed | drowning) [right now | already | this week] [with ({t:task} [and {t2:task}] | work)] #h:swamped",
      "i do not have (time | enough time) for (all | all of) (that | this | them | it)",
      "i do not have (time | enough time) for everything",
      "there (is | are) not enough (time | hours) [in the day | in the week]",
      "i do not want to cut corners [on {t:task}] #idiom #h:corners",
      "i am only one person",
      "i only have two hands",
    ] },
    can_do_all: { patterns: [
      "i (can | will) do (it | that | everything | all three | them all | it all | all of (it | that | them)) [no problem | by friday]",
      "i (can | could) handle (it | that | everything | all of it | it all)",
      "i can do it all",
      "(no problem | piece of cake | consider it done | sure thing | on it | you got it | i am on it | challenge accepted | easy)",
      "(it | that) (is | sounds) (easy | doable)",
      "i will (manage | figure it out | find a way)",
    ] },
    refuse_all: { patterns: [
      "(no way | absolutely not | not a chance | forget it) #tip:blunt_no",
      "i (will not | do not want to | refuse to) (do (it | that | them | this | any of (it | that | them)) | do that | do it) #tip:blunt_no",
      "i do not want to #tip:blunt_no",
      "i can not do any of (it | that | them | this) #tip:blunt_no",
      "(do it yourself | that is not my job | that is your job | not my problem | not my job) #tip:rude",
    ] },

    // --- priorities ----------------------------------------------------------------------------
    ask_priority: { patterns: [
      "what should i (focus on | do | start with | work on | prioritize) first #h:focus",
      "what (should | do you want me to) (focus on | do | start with | prioritize)",
      "(which one | which | what | which task | which thing) is [the] (priority | most important | most urgent | top priority | more important | first priority) [now | right now | for you | this week] #h:priority",
      "what is [the] (priority | most important | most urgent | top priority | first priority) [for you | right now | this week] #h:most_important",
      "what is more important",
      "(which one | what | which | which task) can wait #h:can_wait",
      "where (should | do) i start #h:start_where",
      "(can | could) you help me (prioritize | set priorities | choose)",
      "what comes first",
      "(is | are) {t:task} more important [than {t2:task}]",
      "(should i | do i) (start with | do) {t:task} first",
      "what (do you want | would you like) first",
      "in what order [should i do (them | it | this | these)]",
      "what (is | are) the (priorities | priority)",
      "what are your priorities",
    ] },
    what_about: { patterns: [
      "(what about | and what about | how about | and) {t:task} [then]",
      "what do i do with {t:task}",
      "and {t:task} [then]",
    ] },
    propose: { patterns: [
      "i (can | will | could) (do | start with | focus on | take | finish | work on) {a:task} first [@tail_b] #first #h:first_rest",
      "i (can | will | could) (do | start with | focus on | take | finish | work on) {a:task} first and the rest (next week | later) #first #h:first_rest",
      "i (can | could) (do | take | handle | finish) {a:task} [this week | by friday] [but not {b:task}] #first",
      "i (can | could) do {a:task} but {b:task} (has to | needs to | must | will have to) wait #first",
      "i will focus on {a:task} [first | this week] #first #h:focus_on",
      "i will start with {a:task} [@tail_b] #first",
      "i would rather (do | start with | focus on) {a:task} first [@tail_b] #first",
      "(let us | let me) (start with | do | focus on) {a:task} [first] [@tail_b] #first #h:start_with",
      "[how about | what if] i (do | start with | focus on) {a:task} first [@tail_b] #first",
      "[i think] [the] {a:task} (come first | comes first | should come first | are more important | is more important | is the priority | are the priority | matter more | matters more | are more urgent | is more urgent) #first",
      "{a:task} first [and] [then] {b:task} [later | next week]",
      "first {a:task} [and] then {b:task} #first",
      "{a:task} by friday [@tail_b] #first",
      "i (should | need to) (finish | do) {a:task} first #first",
      "{b:task} (can | could) @wait #later",
      "(can | could) {b:task} @wait #later #h:wait_week",
      "(can | could) {b:task} wait (until | till) (next week | monday) #later #h:wait_week",
      "(can | could) we (push | move) {b:task} to next week #later",
      "let us (push | move) {b:task} to next week #later",
      "i (do not | will not) have time for {b:task} [this week] #later",
      "i will do {b:task} (next week | later | on monday) #later",
      "(can | could) @ppl (do | take | handle | organize | take care of | work on) {d:task} #deleg #h:someone_else",
      "(maybe | perhaps) @ppl (can | could | should) (do | take | handle | organize | take care of) {d:task} #deleg #h:brad",
      "(brad | kevin | someone else) (could | should | can) pull his weight [on {d:task}] #deleg #idiom",
      "(you should | we should | let us | maybe we should | can we | could we) hire (someone | somebody | a new person | an intern | more people | another person) #hire",
      "let us get the ball rolling (with | on) {a:task} #first #idiom",
    ] },
    // "Yeah, a bit." (to "Steep learning curve, huh?")
    finding_ctx: { patterns: ["[yeah | yes] (a (little | bit) | kind of | totally | very | super | really | for sure | definitely | quite)"] },
    // "That makes sense." / "Fair enough." (to Tyler's own suggestion)
    agree_ctx: { patterns: ["[yes] (that | it) makes [total | perfect] sense", "makes sense", "(fair | good) point", "you are [totally] right", "fair enough", "(that | it) sounds (fair | reasonable | smart)"] },
    // "Just the slides." / "The slides, then the party." (while Tyler asks what first)
    propose_ctx: { patterns: ["[only | just] [the] {a:task} [first | then | this week]", "[the] {a:task} [and then | then] [the] {b:task} [next week | later]"] },
    same_page_q: { patterns: [
      "[so] (are we | we are) on the same page [now] #idiom #h:same_page",
      "(same page | on the same page) [right | now]",
      "does that (work | sound good) [for you]",
      "is that okay [with you | for you]",
    ] },

    // --- idioms --------------------------------------------------------------------------------
    idiom_q: { patterns: [
      "[sorry] what does [the (phrase | expression | idiom | word)] {id:idiom} mean [exactly | here] #h:what_mean",
      "[sorry] what do you mean [by] [the (phrase | expression | idiom)] {id:idiom} #h:mean_by",
      "[sorry] what is {id:idiom} [exactly]",
      "[sorry] what is the meaning of {id:idiom}",
      "[sorry] what (does | do) you mean [by] [that] {id:idiom}",
      "(could | can) you explain {id:idiom}",
      "[sorry] i do not (know | understand | get) [the (phrase | expression | idiom)] {id:idiom}",
      "{id:idiom} (means what | what does it mean | what is that | what does that mean | what is it)",
      "what {id:idiom} [is that | are they | is it] #h:what_base",
      "is {id:idiom} an idiom",
      "what does it mean {id:idiom}",
    ] },
    idiom_echo: { patterns: ["[sorry] {id:echo} [sorry]"] },
    idiom_plain: { patterns: [
      "is that an (idiom | expression | saying) #h:idiom",
      "(is that | that is) an idiom right",
      "[in] plain english",
      "(could | can) you say (that | it) in plain english #h:plain",
      "(could | can) you (explain | say) (that | it) (in plain english | more simply | in simple words | in normal english)",
      "what does that (expression | phrase | idiom) mean",
      "i do not know that (expression | phrase | idiom | saying)",
      "i have never heard that [one | expression | phrase | idiom] [before]",
      "what is that supposed to mean",
    ] },
    idiom_meta: { patterns: [
      "why do you (use | say) so many (idioms | expressions)",
      "you (use | say) (a lot of | so many) (idioms | expressions)",
      "(you speak | you talk) in idioms",
      "do you always (talk | speak) like (this | that)",
    ] },

    // --- who owns what -------------------------------------------------------------------------
    ask_owner: { patterns: [
      "who (should | can | do) i (ask | talk to | speak to | go to) [about {a:area}] #h:who_ask",
      "who is in charge [of {a:area}] #h:in_charge",
      "who is responsible for {a:area}",
      "who (owns | handles | runs | manages | does | decides on | takes care of | is doing | pays | approves | is organizing) {a:area}",
      "who is the (owner | boss | person) (of | for) {a:area}",
      "(do you know | can you tell me) who [is] (in charge of | responsible for | handles | owns) {a:area}",
      "who decides [about {a:area}]",
      "(what | when) is the deadline [for {a:area}] #deadline #h:deadline",
      "when (is | are) {a:area} due #deadline",
      "(when | by when) do you need {a:area} [by] #deadline",
      "when do you need (it | them | that) [by] #deadline",
      "is there a deadline [for {a:area}] #deadline",
      "how much (money | budget) do (i | we) have [for {a:area}] #money",
    ] },
    insist: { patterns: [
      "i (need | have | would like | want) to know [it] [now | today | this week | before friday] #h:insist",
      "(can | could) you [just] tell me [now]",
      "[please] just tell me",
      "it is (important | urgent)",
      "i need [an] answer [now | today]",
      "(can | could) we (talk about it | discuss it) now",
      "i do not want to (take it offline | wait)",
      "(who | when) [is it] then",
    ] },
    no_more: { patterns: [
      "(no more questions | no questions | i have no questions | nothing else | that is all | that is it) [for now]",
      "i do not have any [more] questions",
      "i (have | got) everything [i need]",
      "i am good [for now]",
    ] },
    who_person: { patterns: ["who is {p:person}", "[and] who is {p:person} [again]"] },

    // --- the crash -----------------------------------------------------------------------------
    plan: { patterns: [
      "@pl_lead @pl_body [first | right now | now | today] [and [then] [we should | let us | we need to | we can | i will] (@fixit | @tellc | @sorryc | @askben | @launchlater | @rollback) [after that | then | later | next]] #h:fix_first",
      "(let us | we should | we need to) not cut corners [again | this time] #fix #idiom",
      "first fix [it | the bug] then (tell | email) [the] (customers | users)",
    ] },
    crash_what: { patterns: [
      "what [exactly] do you want me to do [exactly | first | now] #h:what_exactly",
      "what (should | can) i do [now | first | exactly]",
      "what is my job [here | now]",
      "how can i help",
      "(what | which) (part | task) is mine",
    ] },
    crash_who: { patterns: [
      "who cut corners [on the code] #h:who_cut",
      "whose fault (is it | was it | is this | was this)",
      "who (did | broke | pushed) (it | this | that | the code | the update)",
      "who is responsible for (this | that | it)",
    ] },
    ball_back: { patterns: ["(the ball is in your court | it is in your court | your court) #idiom", "(no | nope) [the ball is] in your court #idiom"] },

    // --- midnight ------------------------------------------------------------------------------
    stay_limit: { patterns: [
      "i (can | could) @stay_v [late] (until | till) {time} [tonight] [but (then | after that) i (will | have to | need to | am going to) (call it a day #idiom | go home | leave)] #h:until_time",
      "i (can | could) @stay_v (until | till) {time} if (it is | the overtime is) paid",
      "(until | till) {time} [maybe] [but not (later | longer | after that | until midnight)]",
      "(how about | what about | maybe) (until | till) {time}",
      "i will (leave | go home | call it a day) at {time} #limit",
      "i (can | could) stay (a little | a bit | an hour | two hours | a couple of hours | for an hour | for two hours) [longer | late] [but not until midnight] #nohour",
      "i (can | could) (stay | work) (a little | a bit) late [but not until midnight] #nohour",
      "i (can | could) stay but not until midnight #nohour",
    ] },
    stay_yes: { patterns: [
      "i (can | will) (stay | be here) [late] [until midnight] [tonight] [no problem]",
      "(sure | okay | yes | of course | no problem | fine) i (can | will) (stay | be here) [until midnight | late | tonight]",
      "(count me in | i am in)",
    ] },
    cant_stay: { patterns: [
      "i (can not | can not really | will not) (stay | work | be here) (late | until midnight | tonight | that late | so late | after six) [tonight] #h:cant_stay",
      "i (can not | can not really | will not) (stay | work | be here) [late] (until | till | after) {time} [tonight]",
      "i (can not | will not) stay [tonight]",
      "i (have | already have) (plans | a plan | an appointment | a date | something) (tonight | this evening) #h:plans",
      "i (have to | need to | must) (go home | pick up my (kids | son | daughter | children) | be home) [at {time} | early | by {time} | tonight]",
      "i am going home at {time}",
      "i do not (work | stay) (late | until midnight)",
      "(midnight | until midnight) is (too late | not possible | crazy)",
      "(not | no) (tonight | until midnight)",
      "i (can not | do not want to) work (until midnight | that late | so late | late tonight)",
    ] },
    paid_q: { patterns: [
      "(will | is) (the overtime | it | that | this) [be] paid [overtime] #h:paid",
      "(will | do) (we | i) (get paid | be paid) [for (it | that | the overtime | the extra hours | the hours)]",
      "(what about | and) (the pay | overtime pay | the money | payment | the overtime)",
      "(is | will) there [be] overtime pay",
      "do you pay [for] overtime",
      "paid overtime [right]",
    ] },
    mid_finish_q: { patterns: ["what time do we (finish | stop | go home) [tonight] #h:finish_time", "when do we (finish | stop | go home) [tonight]", "what is the finish time"] },
    mid_why: { patterns: ["why [until midnight | so late | tonight]", "what (is it | is that) for", "what do we need to do [tonight | until midnight]"] },

    // --- tomorrow's meeting ----------------------------------------------------------------------
    meet_time: { patterns: [
      "(could | can) we make it {time} [instead] [or {time2:time}] #h:make_it",
      "make it {time} [instead] [or {time2:time}]",
      "(how about | what about) {time} [instead | tomorrow] #h:how_about",
      "(can | could) we (do | meet | say | do it) [at] {time} [instead | tomorrow]",
      "(let us | can we) (say | do | meet | touch base) [at] {time} [instead | tomorrow] #idiom",
      "{time} (is | would be) better [for me]",
      "(i prefer | i would prefer) {time}",
      "(maybe | perhaps) {time} [instead]",
      "[sure] see you (at | around) {time} [tomorrow] #h:see_eight",
      "(i will | i can) be (here | there | ready) (at | by) {time} [tomorrow]",
      "[let us] touch base (at | around) {time} [tomorrow] #idiom",
      "[yes] {time} (works | is fine | is good | is perfect | sounds good) [for me]",
    ] },
    // "Ten." / "At noon." (while Tyler waits for a time)
    meet_time_ctx: { patterns: ["[at | around] {time} [then | instead | maybe]"] },
    meet_ok: { patterns: [
      "(see you | i will see you) (then | tomorrow) [then]",
      "(that | it) works [for me]",
      "(i will | i will be) (there | here) [tomorrow]",
      "(sure | okay | yes | perfect | sounds good | great | fine) see you (then | tomorrow)",
    ] },
    cant_time: { patterns: [
      "(eight | eight oclock) is [a (bit | little)] (too early | early | not good) [for me] #h:early",
      "i can not [do | make it | come | be here] (at eight | that early | so early | tomorrow morning)",
      "i can not [do | make it | come | be here] at {time} [tomorrow]",
      "(not | no) at eight",
      "i (have | already have) (something | a meeting | an appointment | plans) (at eight | tomorrow morning | then)",
      "i am not (a morning person | free at eight)",
    ] },
    call_day: { patterns: [
      "(let us | we should | maybe we should | can we | i think we should | i am going to | i will | i want to | it is time to) call it a day [now | today | for today] #idiom #h:call_day",
      "i am calling it a day [now | today] #idiom",
      "time to call it a day #idiom",
    ] },

    // --- small talk ------------------------------------------------------------------------------
    dog_q: { patterns: [
      "(is that | is this | who is) (your dog | the dog | wi fi | wifi)",
      "what is (your | the) (dogs | dog) name",
      "why is (the dog | your dog | he) called (wi fi | wifi)",
      "(the dog | your dog | he) is (so | very | really) (cute | sweet | adorable | lazy | sleepy)",
      "(can | may) i pet (the dog | him | wi fi | wifi)",
      "(i love | nice | cute) (dog | the dog | your dog)",
    ] },
    slide_q: { patterns: [
      "why (is there | do you have) a slide [here | in the office]",
      "(can | may) i (use | try | go down) the slide",
      "(i love | nice | cool | great) (the | your) slide",
      "is that a [real] slide",
    ] },
  },

  lines: {
    // --- hello ---------------------------------------------------------------------------------
    greet: [
      t("Hey! | Let's touch base!", "Labas! | Trumpai pasitarkime!", "Labas! Trumpai pasitarkime!"),
      t("Hey, | you! | Got | a | sec? | Let's touch base.", "Ei, | tu! | Turi | — | sekundėlę? | Trumpai pasitarkime.", "Ei, tu! Turi sekundėlę? Trumpai pasitarkime.",
        { flags: { 2: "Casual “Got” = (have you) got: turi." } }),
    ],
    hello_q: [
      t("So, | how | do | you | like | it | so far? | Steep learning curve, | huh?", "Na, | kaip | — | tau | patinka | — | kol kas? | Daug mokslo per trumpą laiką, | ar ne?",
        "Na, kaip tau kol kas patinka? Tenka daug ko greitai išmokti, ar ne?",
        { flags: { 2: F_WH_DO, 3: "“you” = tau: patikti takes the dative.", 5: "“it”: patinka needs no object pronoun." } }),
      t("So, | week | one! | How's it going? | Steep learning curve, | right?", "Na, | savaitė | pirma! | Kaip sekasi? | Daug mokslo per trumpą laiką, | tiesa?",
        "Na, pirmoji savaitė! Kaip sekasi? Tenka daug ko greitai išmokti, tiesa?",
        { flags: { 1: "“week one”: Lithuanian puts the ordinal first (pirmoji savaitė); the gloss keeps the English order." } }),
    ],
    hello_reask: [
      t("So? | How's | week | one?", "Na? | Kaip | savaitė | pirma?", "Na? Kaip pirmoji savaitė?",
        { flags: { 1: "“'s” (is): Lithuanian needs no copula after kaip.", 2: "“week one”: the gloss keeps the English order (pirmoji savaitė)." } }),
      t("So, | how's it going | so far?", "Tai | kaip sekasi | kol kas?", "Tai kaip kol kas sekasi?"),
    ],
    hello_hi: [t("Hey! | So, | how's | week | one?", "Labas! | Tai | kaip | savaitė | pirma?", "Labas! Tai kaip pirmoji savaitė?",
      { flags: { 3: "“'s” (is): Lithuanian needs no copula after kaip.", 4: "“week one”: the gloss keeps the English order (pirmoji savaitė)." } })],
    yep_idiom: [t("Yep! | Sorry.", "Taip! | Atsiprašau.", "Taip! Atsiprašau."), t("Guilty!", "Prisipažįstu!", "Prisipažįstu!")],
    hello_learn: [
      t("Love it! | You're | crushing it.", "Puiku! | Tau | puikiai sekasi.", "Puiku! Tau puikiai sekasi.", { flags: { 1: F_TAU } }),
      t("Ha! | Honestly? | You're | crushing it.", "Cha! | Atvirai? | Tau | puikiai sekasi.", "Cha! Atvirai? Tau puikiai sekasi.", { flags: { 2: F_TAU } }),
    ],
    hello_good: [
      t("Awesome! | Love | that | energy.", "Puiku! | Dievinu | tą | energiją.", "Puiku! Dievinu tokią energiją."),
      t("Yes! | That's | what | I | like | to hear.", "Taip! | Tai yra | tai, ką | aš | mėgstu | girdėti.", "Taip! Būtent tai ir mėgstu girdėti."),
    ],
    hello_hard: [
      t("Totally | normal. | Week | one | is | always | wild.", "Visiškai | normalu. | Savaitė | pirma | yra | visada | beprotiška.", "Visiškai normalu. Pirmoji savaitė visada beprotiška.",
        { flags: { 2: "“Week one”: the gloss keeps the English order (pirmoji savaitė)." } }),
      t("Hang in there. | You'll get | it.", "Laikykis. | Perprasi | tai.", "Laikykis. Perprasi."),
    ],
    hello_no: [t("No? | Natural | talent! | Love it.", "Ne? | Įgimtas | talentas! | Puiku.", "Ne? Įgimtas talentas! Puiku.")],
    hello_over: [
      t("Oof. | Okay, | so... | funny | story.", "Oi. | Gerai, | taigi... | juokinga | istorija.", "Oi. Na, taigi… juokinga istorija."),
      t("Oh | no. | Okay, | don't hate | me | for | this...", "O | ne. | Gerai, | nekęsk | manęs | dėl | šito...", "O ne. Gerai, tik nekęsk manęs dėl šito…"),
    ],
    hello_skip: [
      t("Don't worry. | You'll | learn the ropes.", "Nesijaudink. | Tu | perprasi darbą.", "Nesijaudink. Perprasi, kas čia kaip.", { flags: { 1: F_FUT } }),
    ],

    // --- the pile --------------------------------------------------------------------------------
    pile_intro: [
      t("Okay! | Let's get the ball rolling.", "Gerai! | Išjudinkime reikalus.", "Gerai! Išjudinkime reikalus."),
      t("So! | Big | week. | Let's get the ball rolling.", "Taigi! | Didelė | savaitė. | Išjudinkime reikalus.", "Taigi! Didelė savaitė. Išjudinkime reikalus."),
    ],
    pile_list: [
      t("I | need | three | things | from | you: | the | investor | slides | by | Friday, | the | launch | party | and | a | photo | for the newsletter.",
        "Man | reikia | trijų | dalykų | iš | tavęs: | — | investuotojų | skaidrių | iki | penktadienio, | — | paleidimo | vakarėlio | ir | — | nuotraukos | naujienlaiškiui.",
        "Man iš tavęs reikia trijų dalykų: skaidrių investuotojams iki penktadienio, paleidimo vakarėlio ir nuotraukos naujienlaiškiui.",
        { flags: { 0: F_MAN } }),
    ],
    pile_box: [
      t("And | think outside the box!", "Ir | mąstyk kūrybiškai!", "Ir mąstyk kūrybiškai!"),
      t("Be | bold. | Think outside the box!", "Būk | {m:drąsus|f:drąsi}. | Mąstyk kūrybiškai!", "Būk {m:drąsus|f:drąsi}. Mąstyk kūrybiškai!"),
    ],
    pile_weight: [
      t("Everybody | has to | pull their weight | this | week.", "Visi | turi | atlikti savo dalį | šią | savaitę.", "Šią savaitę visi turi atlikti savo dalį."),
    ],
    pile_q: [t("Easy, | right?", "Lengva, | tiesa?", "Lengva, tiesa?"), t("Sound | good?", "Skamba | gerai?", "Skamba gerai?")],
    pile_reask: [
      t("So? | Slides, | party, | photo. | Can | you | take | them | on?", "Na? | Skaidrės, | vakarėlis, | nuotrauka. | Ar gali | tu | imtis | jų | —?",
        "Na? Skaidrės, vakarėlis, nuotrauka. Imsiesi?", { flags: { 4: F_CAN_Q, 8: "“on” (take … on): imtis carries it." } }),
      t("So, | can | you | handle | all | three?", "Tai | ar gali | tu | susitvarkyti su | visais | trimis?", "Tai susitvarkysi su visais trimis?", { flags: { 1: F_CAN_Q } }),
    ],
    pile_know: [
      t("I | know, | I | know. | You're | up to your ears.", "Aš | žinau, | aš | žinau. | Tau | darbų iki ausų.", "Žinau, žinau. Tau darbų iki ausų.",
        { flags: { 4: "“You're” = tau: Lithuanian says “to you (there is) work up to the ears”." } }),
    ],
    pile_yes: [t("Awesome!", "Puiku!", "Puiku!"), t("Love it!", "Puiku!", "Puiku!")],
    too_much_q: [
      t("Wait, | you | still | have | the | bug | reports | and | the | customer | emails, | right? | Is | that | too | much?",
        "Palauk, | tu | dar | turi | — | klaidų | ataskaitas | ir | — | klientų | laiškus, | tiesa? | Ar | tai | per | daug?",
        "Palauk, juk dar turi klaidų ataskaitas ir klientų laiškus, tiesa? Ar ne per daug?", { flags: { 12: F_IS_Q } }),
    ],
    too_much_honest: [
      t("But | be | honest: | with | the | bugs | and | the | emails, | is | it | too | much?",
        "Bet | būk | {m:atviras|f:atvira}: | su | — | klaidomis | ir | — | laiškais, | ar | tai | per | daug?",
        "Bet būk {m:atviras|f:atvira}: su klaidomis ir laiškais – ar ne per daug?", { flags: { 9: F_IS_Q } }),
    ],
    too_much_reask: [t("So, | is | it | too | much?", "Tai | ar | tai | per | daug?", "Tai ar ne per daug?", { flags: { 1: F_IS_Q } })],
    rockstar: [
      t("Rock | star! | You're | crushing it.", "Roko | žvaigždė! | Tau | puikiai sekasi.", "Tikra žvaigždė! Tau puikiai sekasi.", { flags: { 2: F_TAU } }),
      t("Look | at | you! | Crushing it.", "Pažiūrėk | į | save! | Puikiai sekasi.", "Tik pažiūrėk! Tau puikiai sekasi."),
    ],
    over_react: [
      t("Oh, | man. | I hear you. | I'm | up to my ears | too.", "Oi, | žmogau. | Suprantu. | Man | darbų iki ausų | irgi.", "Oi, žmogau. Suprantu. Ir man pačiam darbų iki ausų.",
        { flags: { 3: F_EARS } }),
      t("Okay, | okay. | Too | much. | Honestly? | I'm | up to my ears | too.", "Gerai, | gerai. | Per | daug. | Atvirai? | Man | darbų iki ausų | irgi.",
        "Gerai, gerai. Per daug. Atvirai? Ir man darbų iki ausų.", { flags: { 5: F_EARS } }),
    ],
    flat_no_react: [t("Okay... | what | can | you | do?", "Gerai... | ką | gali | tu | padaryti?", "Gerai… o ką tu gali padaryti?")],
    rude_react: [
      t("Whoa. | Okay. | Deep | breath. | What | can | you | do?", "Oho. | Gerai. | Giliai | įkvėpkime. | Ką | gali | tu | padaryti?", "Oho. Gerai. Giliai įkvėpkim. Ką tu gali padaryti?",
        { flags: { 3: "“Deep breath” (a suggestion) = giliai įkvėpkime." } }),
    ],

    // --- priorities ------------------------------------------------------------------------------
    prio_q: [
      t("So | what | do | we | do?", "Tai | ką | — | mes | darome?", "Tai ką darom?", { flags: { 2: F_WH_DO } }),
      t("Okay. | You | tell | me: | what | first?", "Gerai. | Tu | pasakyk | man: | ką | pirmiausia?", "Gerai. Tu pasakyk: ką darom pirmiausia?"),
    ],
    prio_q_cool: [t("Cool. | So, | what | first?", "Šaunu. | Tai | ką | pirmiausia?", "Šaunu. Tai nuo ko pradedi?")],
    prio_reask: [
      t("Slides? | Party? | Photo? | Your | call.", "Skaidrės? | Vakarėlis? | Nuotrauka? | Tavo | sprendimas.", "Skaidrės? Vakarėlis? Nuotrauka? Tu sprendi."),
      t("So? | What | goes | first?", "Na? | Kas | eina | pirmas?", "Na? Kas pirmiausia?"),
    ],
    prio_deal: [
      t("Okay, | how about | this: | slides | first, | everything | else | next | week. | Deal?", "Gerai, | o gal | taip: | skaidrės | pirmiausia, | visa | kita | kitą | savaitę. | Sutarta?",
        "Gerai, o gal taip: pirmiausia skaidrės, o visa kita – kitą savaitę. Sutarta?"),
    ],
    deal_reask: [t("So? | Slides | first? | Deal?", "Na? | Skaidrės | pirmiausia? | Sutarta?", "Na? Pirmiausia skaidrės? Sutarta?")],
    deal_yes: [t("Deal! | We're | on the same page.", "Sutarta! | Mes esame | vienoje bangoje.", "Sutarta! Mes vienoje bangoje.")],
    deal_no: [
      t("Okay... | let's touch base | about | it | tomorrow.", "Gerai... | trumpai pasitarkime | apie | tai | rytoj.", "Gerai… rytoj apie tai trumpai pasitarkime."),
    ],
    prio_answer: [
      t("Easy: | the | slides. | Friday | is | a | hard | deadline. | The | party | and | the | photo | can | wait.",
        "Paprasta: | — | skaidrės. | Penktadienis | yra | — | griežtas | terminas. | — | Vakarėlis | ir | — | nuotrauka | gali | palaukti.",
        "Paprasta: skaidrės. Penktadienis – griežtas terminas. Vakarėlis ir nuotrauka gali palaukti."),
      t("The | investor | slides, | for sure. | Everything | else | can | wait | till | next | week.",
        "— | Investuotojų | skaidrės, | be abejo. | Visa | kita | gali | palaukti | iki | kitos | savaitės.",
        "Skaidrės investuotojams, be abejo. Visa kita gali palaukti iki kitos savaitės."),
    ],
    prio_ok: [
      t("Love it. | {X.the} | first, | the | rest | next | week. | We're | on the same page.",
        "Puiku. | {X.the:nom} | pirmiausia, | — | visa kita | kitą | savaitę. | Mes esame | vienoje bangoje.",
        "Puiku. Pirmiausia {X:nom}, o visa kita – kitą savaitę. Mes vienoje bangoje."),
      t("Perfect. | {X.the} | first. | Now | we're | on the same page!", "Puiku. | {X.the:nom} | pirmiausia. | Dabar | mes esame | vienoje bangoje!",
        "Puiku. Pirmiausia {X:nom}. Dabar mes vienoje bangoje!"),
    ],
    prio_ok_generic: [
      t("Perfect. | That | works | for me. | We're | on the same page.", "Puiku. | Tai | tinka | man. | Mes esame | vienoje bangoje.", "Puiku. Man tinka. Mes vienoje bangoje."),
      t("Smart. | I | like | it. | We're | on the same page.", "Protinga. | Man | patinka | —. | Mes esame | vienoje bangoje.", "Protinga. Man patinka. Mes vienoje bangoje.",
        { flags: { 1: "“I” = man: patikti takes the dative.", 3: "“it”: patinka needs no object pronoun." } }),
    ],
    prio_wait: [t("Sure, | {X.the} | can | wait.", "Žinoma, | {X.the:nom} | gali | palaukti.", "Žinoma, {X:nom} gali palaukti.")],
    deleg_brad: [
      t("Brad? | Ha! | Sure. | Brad | could | pull his weight | for once.", "Bredas? | Cha! | Žinoma. | Bredas | galėtų | atlikti savo dalį | bent kartą.",
        "Bredas? Cha! Žinoma. Bredas galėtų bent kartą atlikti savo dalį."),
    ],
    deleg_other: [t("Good | call. | I'll ask around.", "Geras | sprendimas. | Paklausinėsiu kitų.", "Geras sprendimas. Paklausinėsiu kitų.")],
    hire_react: [
      t("Hire | someone? | Ha! | My | favorite | words. | I'll post | a | job | ad.", "Pasamdyti | ką nors? | Cha! | Mano | mėgstamiausi | žodžiai. | Įdėsiu | — | darbo | skelbimą.",
        "Ką nors pasamdyti? Cha! Mano mėgstamiausi žodžiai. Įdėsiu darbo skelbimą."),
    ],
    pushback: [
      t("Hmm. | The | investors | come | Friday, | though. | Could | we | do | the | slides | first?",
        "Hm. | — | Investuotojai | atvyksta | penktadienį, | vis dėlto. | Ar galėtume | mes | padaryti | — | skaidres | pirmiausia?",
        "Hm. Bet investuotojai atvyksta penktadienį. Gal galėtume pirmiausia padaryti skaidres?", { flags: { 6: F_COULD_Q } }),
    ],
    push_reask: [t("So, | slides | first?", "Tai | skaidrės | pirmiausia?", "Tai pirmiausia skaidrės?")],
    push_no: [
      t("Okay, | your | call. | Just | don't cut corners | on | the | slides.", "Gerai, | tavo | sprendimas. | Tik | nedirbk atmestinai | su | — | skaidrėmis.",
        "Gerai, tu sprendi. Tik su skaidrėmis nedirbk atmestinai."),
    ],
    prio_already: [t("We're | already | on the same page!", "Mes esame | jau | vienoje bangoje!", "Mes jau vienoje bangoje!")],
    same_page_yes: [t("Totally. | Same | page, | same | book.", "Visiškai. | Tas pats | puslapis, | ta pati | knyga.", "Visiškai. Tas pats puslapis, ta pati knyga.")],
    same_page_not_yet: [t("Almost! | What | do | we | do | first?", "Beveik! | Ką | — | mes | darome | pirmiausia?", "Beveik! Ką darom pirmiausia?", { flags: { 2: F_WH_DO } })],
    wa_slides: [t("The | slides? | Friday, | no matter what.", "— | Skaidrės? | Penktadienį, | bet kokiu atveju.", "Skaidrės? Penktadienį, bet kokiu atveju.")],
    wa_party: [t("The | party? | Next | week. | Or | never. | Kidding!", "— | Vakarėlis? | Kitą | savaitę. | Arba | niekada. | Juokauju!", "Vakarėlis? Kitą savaitę. Arba niekada. Juokauju!")],
    wa_photo: [t("The | photo? | Next | week | is fine.", "— | Nuotrauka? | Kita | savaitė | tinka.", "Nuotrauka? Kita savaitė tinka.")],
    wa_bugs: [t("Bugs | first | thing | every | morning. | Then | the | slides.", "Klaidos | pirmas | dalykas | kiekvieną | rytą. | Tada | — | skaidrės.", "Klaidos – pirmas dalykas kiekvieną rytą. Tada skaidrės.")],
    wa_emails: [
      t("Answer | the | angry | ones | today. | The | rest | can | wait.", "Atsakyk | — | piktiesiems | — | šiandien. | — | Kiti | gali | palaukti.",
        "Piktiesiems atsakyk šiandien. Kiti gali palaukti.", { flags: { 3: F_ONES } }),
    ],

    // --- the crash (twist) -------------------------------------------------------------------------
    crash_1: [t("Whoa, | whoa. | My | phone | is going crazy.", "Oho, | oho. | Mano | telefonas | pasiuto.", "Oho, oho. Mano telefonas pasiuto.")],
    crash_2: [
      t("Someone | cut corners | on | the | code, | and | a | million | cactuses | just | texted | their | owners: | “Water | me!”",
        "Kažkas | dirbo atmestinai | su | — | kodu, | ir | — | milijonas | kaktusų | ką tik | parašė | savo | šeimininkams: | Palaistyk | mane!",
        "Kažkas atmestinai parašė kodą, ir milijonas kaktusų ką tik parašė savo šeimininkams: „Palaistyk mane!“"),
      t("Somebody | cut corners | on | the | update. | Now | a | million | cactuses | are texting | “Water | me!”",
        "Kažkas | dirbo atmestinai | su | — | atnaujinimu. | Dabar | — | milijonas | kaktusų | rašo | Palaistyk | mane!",
        "Kažkas atmestinai padarė atnaujinimą. Dabar milijonas kaktusų rašo: „Palaistyk mane!“"),
    ],
    crash_3: [
      t("The | servers | crashed. | We're | back to square one. | The ball is in your court!", "— | Serveriai | nulūžo. | Mes esame | grįžę į pradžią. | Dabar tavo ėjimas!",
        "Serveriai nulūžo. Grįžome į pradžią. Dabar tavo ėjimas!"),
    ],
    crash_reask: [
      t("So? | What | do | we | do | first?", "Na? | Ką | — | mes | darome | pirmiausia?", "Na? Ką darom pirmiausia?", { flags: { 2: F_WH_DO } }),
      t("Come on, | what's | the | plan?", "Nagi, | koks yra | — | planas?", "Nagi, koks planas?"),
    ],
    crash_what: [
      t("Honestly? | I | don't know. | You | tell | me: | what | do | we | do | first?", "Atvirai? | Aš | nežinau. | Tu | pasakyk | man: | ką | — | mes | darome | pirmiausia?",
        "Atvirai? Nežinau. Tu pasakyk: ką darom pirmiausia?", { flags: { 7: F_WH_DO } }),
    ],
    crash_help: [
      t("Okay, | deep | breath. | Fix | the | bug | first, | then | tell | the | customers?", "Gerai, | giliai | įkvėpkime. | Ištaisom | — | klaidą | pirmiausia, | tada | pranešam | — | klientams?",
        "Gerai, giliai įkvėpkim. Pirmiausia ištaisom klaidą, tada pranešam klientams?",
        { flags: { 2: "“Deep breath” (a suggestion) = giliai įkvėpkime.", 3: "A suggestion in the imperative: Lithuanian uses the we-form (ištaisom)." } }),
    ],
    crash_ok_reask: [t("So? | Fix | it, | then | tell | them?", "Na? | Ištaisom, | — | tada | pranešam | jiems?", "Na? Ištaisom, tada pranešam jiems?",
      { flags: { 2: "“it”: ištaisom needs no object pronoun here." } })],
    crash_fix: [
      t("Fix | it | first. | Yes! | I'm calling | Ben | right now.", "Ištaisyti | ją | pirmiausia. | Taip! | Skambinu | Benui | dabar pat.", "Pirmiausia ištaisyti. Taip! Tuoj pat skambinu Benui."),
    ],
    crash_tell: [t("Tell | the | customers. | Honest | and | fast. | Love it.", "Pranešti | — | klientams. | Atvirai | ir | greitai. | Puiku.", "Pranešti klientams. Atvirai ir greitai. Puiku.")],
    crash_ben: [
      t("Ben! | Of course. | Ben | can | fix | anything | with | enough | coffee.", "Benas! | Žinoma. | Benas | gali | sutvarkyti | bet ką | su | pakankamai | kavos.",
        "Benas! Žinoma. Su pakankamai kavos Benas gali sutvarkyti bet ką."),
    ],
    crash_later: [t("Launch | next | week. | Painful, | but | smart.", "Paleisti | kitą | savaitę. | Skausminga, | bet | protinga.", "Paleisti kitą savaitę. Skausminga, bet protinga.")],
    crash_rollback: [
      t("Roll | it | back. | Yes. | Safety | first.", "Atšaukti | jį | —. | Taip. | Saugumas | pirmiausia.", "Atšaukti atnaujinimą. Taip. Saugumas pirmiausia.",
        { flags: { 2: "“back” (roll … back): atšaukti (under “Roll”) carries it." } }),
    ],
    crash_end: [
      t("Okay. | No more | cutting corners. | Lesson | learned.", "Gerai. | Jokio | darbo atmestinai. | Pamoka | išmokta.", "Gerai. Daugiau jokio darbo atmestinai. Pamoka išmokta."),
      t("Thank you. | And | nobody | cuts corners | ever | again.", "Ačiū. | Ir | niekas | nedirba atmestinai | niekada | daugiau.", "Ačiū. Ir daugiau niekas niekada nedirba atmestinai.",
        { flags: { 3: "After niekas, Lithuanian negates the verb too: nedirba." } }),
    ],
    crash_who: [
      t("Honestly? | Me. | I | pushed | the | update | at two | a.m.", "Atvirai? | Aš. | Aš | įkėliau | — | atnaujinimą | antrą | nakties.", "Atvirai? Aš. Įkėliau atnaujinimą antrą nakties."),
    ],
    ball_back_react: [t("Ha! | Nope. | The ball is in your court.", "Cha! | Ne. | Dabar tavo ėjimas.", "Cha! Ne-ne. Dabar tavo ėjimas.")],
    crash_skip: [t("Okay. | I'll call | Ben. | Fix | first, | talk | later.", "Gerai. | Paskambinsiu | Benui. | Taisom | pirma, | kalbam | vėliau.", "Gerai. Paskambinsiu Benui. Pirma taisom, paskui kalbam.")],

    // --- who owns what -----------------------------------------------------------------------------
    owner_ask: [
      t("Cool. | Anything | else | you | need | from | me?", "Šaunu. | Ko nors | dar | tau | reikia | iš | manęs?", "Šaunu. Dar ko nors iš manęs reikia?",
        { flags: { 3: "“you” = tau: reikėti takes the dative." } }),
      t("Okay! | Any | questions | for me?", "Gerai! | Kokių nors | klausimų | man?", "Gerai! Turi man klausimų?"),
    ],
    owner_reask: [t("Anything | else?", "Kas nors | dar?", "Dar kas nors?"), t("What | else?", "Kas | dar?", "Kas dar?")],
    shoot: [t("Shoot.", "Klausk.", "Klausk.")],
    owner_evasive: [
      t("Ooh, | great | question. | Let's take that offline.", "O, | puikus | klausimas. | Aptarkime tai atskirai.", "O, puikus klausimas. Aptarkime tai atskirai, vėliau."),
      t("Hmm. | Let's take that offline, | okay?", "Hm. | Aptarkime tai atskirai, | gerai?", "Hm. Aptarkime tai atskirai, gerai?"),
    ],
    owner_budget: [
      t("Rachel | in sales. | She | owns | the | budget. | I | just | spend | it.", "Reičel | iš pardavimų skyriaus. | Ji | valdo | — | biudžetą. | Aš | tik | išleidžiu | jį.",
        "Reičel iš pardavimų skyriaus. Ji valdo biudžetą. Aš jį tik išleidžiu."),
    ],
    owner_payroll: [
      t("Rachel. | Sales, | payroll, | snacks... | Rachel | does | everything.", "Reičel. | Pardavimai, | atlyginimai, | užkandžiai... | Reičel | daro | viską.",
        "Reičel. Pardavimai, atlyginimai, užkandžiai… Reičel daro viską."),
    ],
    owner_party: [
      t("Kevin | in marketing. | He's | already | ordering | a | cactus | cake.", "Kevinas | iš rinkodaros skyriaus. | Jis | jau | užsakinėja | — | kaktuso | tortą.",
        "Kevinas iš rinkodaros. Jis jau užsakinėja kaktuso formos tortą.", { flags: { 2: "“'s” (progressive): the present užsakinėja carries it." } }),
    ],
    owner_newsletter: [t("Kevin. | Just | send | him | the | photo.", "Kevinas. | Tiesiog | nusiųsk | jam | — | nuotrauką.", "Kevinas. Tiesiog nusiųsk jam nuotrauką.")],
    owner_slides: [
      t("Friday | at noon. | The | investors | come | at two.", "Penktadienį | vidurdienį. | — | Investuotojai | atvyksta | antrą.", "Penktadienį vidurdienį. Investuotojai atvyksta antrą."),
    ],
    owner_slides_you: [t("You! | And | me. | Mostly | you.", "Tu! | Ir | aš. | Daugiausia | tu.", "Tu! Ir aš. Daugiausia tu.")],
    owner_code: [
      t("Ben, | our | developer. | He's | the | guy | with | three | monitors.", "Benas, | mūsų | programuotojas. | Jis yra | tas | vaikinas | su | trimis | monitoriais.",
        "Benas, mūsų programuotojas. Tas vaikinas su trimis monitoriais.", { flags: { 4: "“the” points here (the one with …): tas." } }),
    ],
    owner_emails: [
      t("That's | you, | actually. | Welcome | to | the | team!", "Tai | tu, | tiesą sakant. | {m:Sveikas prisijungęs|f:Sveika prisijungusi} | prie | — | komandos!",
        "Tai tu, tiesą sakant. {m:Sveikas prisijungęs|f:Sveika prisijungusi} prie komandos!", { flags: { 0: F_THATS } }),
    ],
    owner_general: [t("Honestly? | Ask | Rachel. | Rachel | knows | everything.", "Atvirai? | Paklausk | Reičel. | Reičel | žino | viską.", "Atvirai? Paklausk Reičel. Reičel žino viską.")],
    who_rachel: [t("Rachel | runs | sales. | And | basically | everything | else.", "Reičel | vadovauja | pardavimams. | Ir | iš esmės | visam | kitam.", "Reičel vadovauja pardavimams. Ir iš esmės viskam kitam.")],
    who_kevin: [t("Kevin | does | marketing. | He | thinks | the | app | is | for | dogs.", "Kevinas | daro | rinkodarą. | Jis | mano, kad | — | programėlė | yra | — | šunims.",
      "Kevinas atsakingas už rinkodarą. Jis mano, kad programėlė skirta šunims.", { flags: { 4: F_KAD, 8: "“for”: the dative šunims carries it." } })],
    who_brad: [t("Brad | is | in sales. | He | doesn't pull his weight. | He | plays | ping-pong.", "Bredas | yra | pardavimų skyriuje. | Jis | neatlieka savo dalies. | Jis | žaidžia | stalo tenisą.",
      "Bredas dirba pardavimų skyriuje. Jis neatlieka savo dalies – žaidžia stalo tenisą.")],
    who_ben: [t("Ben | is | our | developer. | He | never | sleeps.", "Benas | yra | mūsų | programuotojas. | Jis | niekada | nemiega.", "Benas – mūsų programuotojas. Jis niekada nemiega.",
      { flags: { 5: "After niekada, Lithuanian negates the verb too: nemiega." } })],

    // --- midnight (twist) --------------------------------------------------------------------------
    mid_1: [
      t("Oh, | and | one more | thing! | Big | week, | so | I | need | everyone | here | until | midnight | tonight.",
        "O, | ir | dar vienas | dalykas! | Didelė | savaitė, | tad | man | reikia | visų | čia | iki | vidurnakčio | šįvakar.",
        "O, ir dar vienas dalykas! Didelė savaitė, tad šįvakar man reikia visų čia iki vidurnakčio.", { flags: { 7: F_MAN } }),
    ],
    mid_2: [
      t("Nobody | calls it a day | at Sproutly!", "Niekas | nebaigia darbo anksti | „Sproutly“ įmonėje!", "„Sproutly“ niekas nebaigia darbo anksti!",
        { flags: { 1: "After niekas, Lithuanian negates the verb too: nebaigia." } }),
    ],
    mid_reask: [t("So? | Can | you | stay?", "Na? | Ar gali | tu | likti?", "Na? Gali likti?", { flags: { 1: F_CAN_Q } })],
    mid_why: [
      t("The | investors, | the | slides, | the | party... | it's | a | big | week!", "— | Investuotojai, | — | skaidrės, | — | vakarėlis... | tai yra | — | didelė | savaitė!",
        "Investuotojai, skaidrės, vakarėlis… didelė savaitė!"),
    ],
    mid_limit: [
      t("Until | {X}? | Fair. | Paid | overtime, | and | at | {X} | you | call it a day.", "Iki | {X:gen}? | Sąžininga. | Apmokami | viršvalandžiai, | o | — | {X:acc} | tu | baigi darbą.",
        "Iki {X:gen}? Sąžininga. Viršvalandžiai apmokami, o {X:acc} baigi darbą.", { flags: { 6: F_AT } }),
    ],
    mid_limit_generic: [
      t("Okay, | a | couple of | hours. | Paid, | obviously. | Then | you | call it a day.", "Gerai, | — | porą | valandų. | Apmokamų, | aišku. | Tada | tu | baigi darbą.",
        "Gerai, porą valandų. Apmokamų, aišku. Tada baigi darbą."),
    ],
    mid_yes: [
      t("Rock | star! | And | yes, | it's | paid. | Rachel | would | kill | me.", "Roko | žvaigždė! | Ir | taip, | tai yra | apmokama. | Reičel | — | nužudytų | mane.",
        "Tikra žvaigždė! Ir taip, tai apmokama. Kitaip Reičel mane nužudytų.", { flags: { 7: "“would”: the conditional nužudytų carries it." } }),
    ],
    mid_cant: [
      t("Okay, | okay. | Fair. | Go | home | at six.", "Gerai, | gerai. | Sąžininga. | Eik | namo | šeštą.", "Gerai, gerai. Sąžininga. Šeštą eik namo."),
      t("Fair enough. | Go | home. | We'll start | fresh | tomorrow.", "Na, gerai. | Eik | namo. | Pradėsime | iš naujo | rytoj.", "Na, gerai. Eik namo. Rytoj pradėsime iš naujo."),
    ],
    mid_paid: [
      t("Paid? | Um... | yes. | Of course. | Paid | overtime, | and | we | stop | at nine. | Deal?", "Apmokami? | Ee... | taip. | Žinoma. | Apmokami | viršvalandžiai, | ir | mes | baigiame | devintą. | Sutarta?",
        "Apmokami? Ee… taip. Žinoma. Viršvalandžiai apmokami, o baigiame devintą. Sutarta?"),
    ],
    mid_finish: [
      t("Good | question. | Nine? | Paid | overtime, | obviously. | Deal?", "Geras | klausimas. | Devintą? | Apmokami | viršvalandžiai, | aišku. | Sutarta?",
        "Geras klausimas. Devintą? Viršvalandžiai apmokami, aišku. Sutarta?"),
    ],
    mid_deal_reask: [t("So? | Nine, | paid. | Deal?", "Na? | Devintą, | apmokamai. | Sutarta?", "Na? Iki devintos, apmokamai. Sutarta?")],
    mid_deal_yes: [t("Deal. | Thanks | for stepping up.", "Sutarta. | Ačiū, | kad prisidedi.", "Sutarta. Ačiū, kad prisidedi.")],
    mid_when: [t("Okay. | What | works | for you?", "Gerai. | Kas | tinka | tau?", "Gerai. O kas tau tinka?")],
    mid_giveup: [t("Okay, | fine. | Everybody | goes | home | at eight.", "Gerai, | tebūnie. | Visi | eina | namo | aštuntą.", "Gerai, tebūnie. Visi eina namo aštuntą.")],

    // --- tomorrow --------------------------------------------------------------------------------
    close_q: [
      t("Awesome. | Touch base | again | at eight | tomorrow?", "Puiku. | Trumpai pasitariam | vėl | aštuntą | rytoj?", "Puiku. Rytoj aštuntą vėl trumpai pasitariam?"),
      t("Okay! | Let's touch base | again | tomorrow | at eight?", "Gerai! | Trumpai pasitarkime | vėl | rytoj | aštuntą?", "Gerai! Rytoj aštuntą vėl trumpai pasitarkim?"),
    ],
    close_reask: [t("So, | eight | tomorrow?", "Tai | aštuntą | rytoj?", "Tai rytoj aštuntą?")],
    meet_ok: [
      t("Perfect. | See you | at eight!", "Puiku. | Iki | aštuntos!", "Puiku. Iki aštuntos!"),
      t("Great. | Eight | tomorrow.", "Puiku. | Aštuntą | rytoj.", "Puiku. Rytoj aštuntą."),
    ],
    meet_move: [
      t("{X}? | Works | for me. | See you | then!", "{X:acc}? | Tinka | man. | Iki | tada!", "{X:acc}? Man tinka. Iki tada!"),
      t("Sure, | {X}. | I'll bring | coffee.", "Žinoma, | {X:acc}. | Atnešiu | kavos.", "Žinoma, {X:acc}. Atnešiu kavos."),
    ],
    offer_ok: [t("Great. | {X} | it is!", "Puiku. | {X:acc}, | sutarta!", "Puiku, {X:acc} – sutarta!")],
    meet_move_generic: [t("Works | for me. | See you | then!", "Tinka | man. | Iki | tada!", "Man tinka. Iki tada!")],
    meet_silly: [
      t("Ha! | Let's keep | it | human. | How about | ten?", "Cha! | Palikime | tai | žmogiška. | O gal | dešimtą?", "Cha! Būkime žmonės. O gal dešimtą?"),
    ],
    when_q: [t("No | problem. | When | works | for you?", "Jokių | problemų. | Kada | tinka | tau?", "Jokių problemų. Kada tau tinka?")],
    when_reask: [t("So, | when?", "Tai | kada?", "Tai kada?")],
    when_noon: [
      t("How about | noon? | Noon | works | for | everybody.", "O gal | vidurdienį? | Vidurdienis | tinka | — | visiems.", "O gal vidurdienį? Vidurdienis tinka visiems.",
        { flags: { 4: "“for”: the dative visiems carries it." } }),
    ],
    offer_reask: [t("So? | {X}?", "Na? | {X:acc}?", "Na? {X:acc}?")],
    call_day_react: [
      t("Ha! | Yes! | Let's call it a day. | Eight | tomorrow, | then.", "Cha! | Taip! | Baikime šiandien darbą. | Aštuntą | rytoj, | vadinasi.", "Cha! Taip! Baikime šiandien darbą. Vadinasi, rytoj aštuntą."),
    ],
    close_skip: [t("Okay, | eight | tomorrow. | See you | then.", "Gerai, | aštuntą | rytoj. | Iki | tada.", "Gerai, rytoj aštuntą. Iki tada.")],
    not_yet: [t("Ha! | Not yet. | Nice | try, | though.", "Cha! | Dar ne. | Gražus | bandymas, | vis dėlto.", "Cha! Dar ne. Bet bandymas geras.")],

    // --- the end -----------------------------------------------------------------------------------
    close_good: [
      t("Okay! | Great | work | today. | Let's call it a day!", "Gerai! | Puikus | darbas | šiandien. | Baikime šiandien darbą!", "Gerai! Šiandien puikiai padirbėjai. Baikime šiandien darbą!"),
      t("You | know | what? | Good | day. | Let's call it a day!", "Tu | žinai | ką? | Gera | diena. | Baikime šiandien darbą!", "Žinai ką? Gera diena. Baikime šiandien darbą!"),
    ],
    close_partial: [
      t("Okay... | let's touch base | tomorrow | and | figure it out.", "Gerai... | trumpai pasitarkime | rytoj | ir | išsiaiškinkime.", "Gerai… rytoj trumpai pasitarkime ir viską išsiaiškinkime."),
    ],
    bye_tyler: [
      t("See you | tomorrow! | Wi-Fi, | say | bye!", "Iki | rytojaus! | Wi-Fi, | pasakyk | ate!", "Iki rytojaus! Wi-Fi, pasakyk ate!"),
      t("Go | home! | That's | an | order. | Kidding. | Kind of.", "Eik | namo! | Tai yra | — | įsakymas. | Juokauju. | Beveik.", "Eik namo! Tai įsakymas. Juokauju. Beveik."),
    ],
    bye_early: [
      t("Whoa, | leaving | already? | Okay... | let's touch base | tomorrow!", "Oho, | išeini | jau? | Gerai... | trumpai pasitarkime | rytoj!", "Oho, jau išeini? Gerai… rytoj trumpai pasitarkime!"),
    ],

    // --- small talk and asides ---------------------------------------------------------------------
    anyway: [
      t("Anyway!", "Žodžiu!", "Žodžiu!"),
      t("Okay! | Where | was | I?", "Gerai! | Kur | buvau | aš?", "Gerai! Tai kur aš buvau?"),
    ],
    idiom_back: [
      t("Ha! | Look | at | you, | talking | like | a | founder!", "Cha! | Pažiūrėk | į | save, | kalbi | kaip | {m:tikras|f:tikra} | {m:įkūrėjas|f:įkūrėja}!",
        "Cha! Tik pažiūrėk – kalbi kaip {m:tikras įkūrėjas|f:tikra įkūrėja}!", { flags: { 6: "The article has no word; tikras / tikra (a real) is added for the sense." } }),
      t("Whoa, | you're learning | my | language!", "Oho, | tu mokaisi | mano | kalbos!", "Oho, jau mokaisi mano kalbos!"),
    ],
    meta: [
      t("Ha! | Sorry. | Startup | brain. | I'll try | plain | English.", "Cha! | Atsiprašau. | Startuolio | smegenys. | Pabandysiu | paprasta | anglų kalba.",
        "Cha! Atsiprašau. Startuolio smegenys. Pabandysiu kalbėti paprastai."),
    ],
    dog: [t("That's | Wi-Fi! | Best | employee. | Never | cuts corners.", "Tai | Wi-Fi! | Geriausias | darbuotojas. | Niekada | nedirba atmestinai.",
      "Tai Wi-Fi! Geriausias darbuotojas. Niekada nedirba atmestinai.", { flags: { 0: F_THATS, 5: "After niekada, Lithuanian negates the verb too: nedirba." } })],
    slide: [
      t("The | slide? | It's | for morale. | And | for | fire | drills.", "— | Čiuožykla? | Ji yra | komandos dvasiai. | Ir | — | gaisro | pratyboms.",
        "Čiuožykla? Ji – komandos dvasiai. Ir gaisro pratyboms.", { flags: { 5: "“for”: the dative pratyboms carries it (fire stands between)." } }),
    ],

    // --- what the idioms mean (two versions each) ------------------------------------------------
    mean_touch_base: [
      t("Oh! | “Touch base” | just | means | a | quick | check-in. | Five | minutes: | how's it going?",
        "O! | „Touch base“ | tiesiog | reiškia | — | trumpą | pasitarimą. | Penkios | minutės: | kaip sekasi?",
        "A! „Touch base“ tiesiog reiškia trumpą pasitarimą. Penkios minutės: kaip sekasi?"),
      t("It's | from | baseball! | In business, | it | just | means | a | short | chat.", "Tai yra | iš | beisbolo! | Versle | tai | tiesiog | reiškia | — | trumpą | pokalbį.",
        "Tai iš beisbolo! Versle tai tiesiog reiškia trumpą pokalbį."),
    ],
    mean_learning_curve: [
      t("Ha! | It | means | there's | a lot | to learn, | really | fast.", "Cha! | Tai | reiškia, | kad yra | daug ko | išmokti, | labai | greitai.",
        "Cha! Tai reiškia, kad reikia labai greitai daug ko išmokti.", { flags: { 3: F_KAD } }),
      t("Picture | a | steep | hill. | That's | you, | learning | a lot | really | fast.", "Įsivaizduok | — | stačią | kalvą. | Tai esi | tu, | besimokantis | daug | labai | greitai.",
        "Įsivaizduok stačią kalvą. Tai tu – labai greitai mokaisi daugybės dalykų."),
    ],
    mean_ropes: [
      t("It | means | learning | how | things | work | here. | Sailors | had | to learn | all | the | ropes | on a ship.",
        "Tai | reiškia | mokytis, | kaip | viskas | veikia | čia. | Jūreiviai | turėjo | išmokti | visas | — | virves | laive.",
        "Tai reiškia išmokti, kaip čia viskas veikia. Jūreiviai laive turėjo išmokti visas virves."),
      t("Just | means | you're | figuring out | how | everything | works. | Totally | normal | in | week | one.",
        "Tiesiog | reiškia, | kad tu | aiškiniesi, | kaip | viskas | veikia. | Visiškai | normalu | per | savaitę | pirmą.",
        "Tiesiog reiškia, kad aiškiniesi, kaip viskas veikia. Pirmą savaitę tai visiškai normalu.",
        { flags: { 2: "Zero “that” (kad) and the progressive “'re”: the present aiškiniesi carries it.", 10: "“week one”: the gloss keeps the English order (pirmą savaitę)." } }),
    ],
    mean_ball_rolling: [
      t("Oh, | it | just | means | “let's start.” | Get | things | moving!", "O, | tai | tiesiog | reiškia | „pradėkime“. | Išjudink | reikalus | —!",
        "O, tai tiesiog reiškia „pradėkime“. Išjudinkime reikalus!", { flags: { 7: "“moving” (get … moving): the prefix iš- of išjudink carries it." } }),
      t("It | means | we | start | now. | You | push | the | ball, | and | it | rolls!", "Tai | reiškia, | kad mes | pradedame | dabar. | Tu | stumteli | — | kamuolį, | ir | jis | rieda!",
        "Tai reiškia, kad pradedame dabar. Stumteli kamuolį – ir jis rieda!", { flags: { 2: F_KAD } }),
    ],
    mean_outside_box: [
      t("It | means | be | creative! | Try | a | new | idea, | not | the | usual | one.", "Tai | reiškia: | būk | {m:kūrybingas|f:kūrybinga}! | Pabandyk | — | naują | idėją, | ne | — | įprastą | —.",
        "Tai reiškia: būk {m:kūrybingas|f:kūrybinga}! Pabandyk naują idėją, ne įprastą.", { flags: { 11: F_ONES } }),
      t("Ha! | There's | no | actual | box. | It | just | means: | think | in a new way.", "Cha! | Nėra | jokios | tikros | dėžės. | Tai | tiesiog | reiškia: | mąstyk | kitaip.",
        "Cha! Jokios dėžės iš tikrųjų nėra. Tai tiesiog reiškia: mąstyk kitaip.", { flags: { 1: "Lithuanian negates the verb: nėra (there isn't); “no” = jokios." } }),
    ],
    mean_ears: [
      t("It | means | you're | super | busy. | Way | too | much | work!", "Tai | reiškia, | kad tu esi | labai | {m:užsiėmęs|f:užsiėmusi}. | Gerokai | per | daug | darbo!",
        "Tai reiškia, kad esi labai {m:užsiėmęs|f:užsiėmusi}. Gerokai per daug darbo!", { flags: { 2: F_KAD } }),
      t("Imagine | the | work | is | water. | It's | up | to | your | ears. | You're drowning!",
        "Įsivaizduok, kad | — | darbas | yra | vanduo. | Jo yra | — | iki | — | ausų. | Tu skęsti!",
        "Įsivaizduok, kad darbas – vanduo. Jo iki pat ausų. Skęsti!",
        { flags: { 0: F_KAD, 6: "“up” has no word: iki carries “up to”.", 8: "“your”: Lithuanian leaves out the possessive with body parts." } }),
    ],
    mean_same_page: [
      t("It | means | we | agree. | We | see | the | plan | the same way.", "Tai | reiškia, | kad mes | sutariame. | Mes | matome | — | planą | vienodai.",
        "Tai reiškia, kad sutariame. Planą matome vienodai.", { flags: { 2: F_KAD } }),
      t("Like | we're reading | the | same | page | of | the | same | book.", "Lyg | mes skaitytume | — | tą patį | puslapį | — | — | tos pačios | knygos.",
        "Lyg skaitytume tą patį tos pačios knygos puslapį.",
        { flags: { 1: "Progressive “'re” after lyg (as if): the conditional skaitytume carries it.", 5: "“of”: the genitive knygos carries it." } }),
    ],
    mean_weight: [
      t("It | means | doing | your | fair | share | of | the | work.", "Tai | reiškia | atlikti | savo | deramą | dalį | — | — | darbo.", "Tai reiškia atlikti savo dalį darbo.",
        { flags: { 6: "“of”: the genitive darbo carries it." } }),
      t("Like, | Brad | plays | ping-pong | all | day | while | we | work. | Brad | doesn't pull his weight.",
        "Na, | Bredas | žaidžia | stalo tenisą | visą | dieną, | kol | mes | dirbame. | Bredas | neatlieka savo dalies.",
        "Na, Bredas visą dieną žaidžia stalo tenisą, kol mes dirbame. Bredas neatlieka savo dalies."),
    ],
    mean_corners: [
      t("It | means | doing | it | fast | and | cheap, | and | skipping | steps.", "Tai | reiškia | daryti | tai | greitai | ir | pigiai, | ir | praleisti | žingsnius.",
        "Tai reiškia daryti greitai ir pigiai, praleidžiant žingsnius. Lietuviškai – dirbti atmestinai."),
      t("Like | driving | across | the | grass | instead of | around | the | corner. | Faster, | but | messy.",
        "Kaip | važiuoti | per | — | veją | užuot | aplink | — | kampą. | Greičiau, | bet | netvarkingai.",
        "Kaip pervažiuoti per veją, užuot apsukus kampą. Greičiau, bet netvarkingai."),
    ],
    mean_square_one: [
      t("It | means | we | start | again | from | the | very | beginning.", "Tai | reiškia, | kad mes | pradedame | vėl | nuo | — | pačios | pradžios.",
        "Tai reiškia, kad vėl pradedame nuo pačios pradžios.", { flags: { 2: F_KAD } }),
      t("Like | a | board | game. | You | go | back | to | the | first | square.", "Kaip | — | stalo | žaidimas. | Tu | grįžti | atgal | į | — | pirmą | langelį.",
        "Kaip stalo žaidime: grįžti į pirmą langelį."),
    ],
    mean_court: [
      t("It | means | it's | your | turn. | You | decide | what | happens | next.", "Tai | reiškia, | kad tai yra | tavo | eilė. | Tu | nusprendi, | kas | bus | toliau.",
        "Tai reiškia, kad dabar tavo eilė. Tu nusprendi, kas bus toliau.", { flags: { 2: F_KAD, 8: "“happens next”: Lithuanian uses the future bus." } }),
      t("It's | from | tennis. | I | hit | the | ball | to you. | Now | you | play!", "Tai yra | iš | teniso. | Aš | atmušiau | — | kamuolį | tau. | Dabar | tu | žaidi!",
        "Tai iš teniso. Aš atmušiau kamuolį tau. Dabar žaidi tu!"),
    ],
    mean_call_day: [
      t("It | means | stop | working | for today. | Go | home!", "Tai | reiškia | baigti | dirbti | šiandienai. | Eik | namo!", "Tai reiškia baigti šiandien dirbti. Eik namo!"),
      t("We | finish | work | for the day. | Laptops | closed!", "Mes | baigiame | darbą | šiai dienai. | Kompiuteriai | uždaryti!", "Baigiame šios dienos darbus. Kompiuterius uždarom!"),
    ],
    mean_offline: [
      t("Sorry! | It | means | “let's talk | about | it | later, | just | us.”", "Atsiprašau! | Tai | reiškia | „pakalbėkime | apie | tai | vėliau, | tik | mudu“.",
        "Atsiprašau! Tai reiškia: „pakalbėkime apie tai vėliau, tik mudu“."),
      t("Busted. | It's | a | fancy | way | to say | “not | now.”", "Pagavai. | Tai yra | — | įmantrus | būdas | pasakyti | „ne | dabar“.", "Pagavai. Tai įmantrus būdas pasakyti „ne dabar“."),
    ],
    mean_plate: [
      t("“On my plate” | is | everything | you | have | to do.", "„On my plate“ | yra | viskas, ką | tu | turi | padaryti.", "„On my plate“ – tai viskas, ką turi padaryti."),
      t("It | means | how much | work | you | have. | A | full | plate | is | a | busy | week.", "Tai | reiškia, | kiek | darbo | tu | turi. | — | Pilna | lėkštė | yra | — | užimta | savaitė.",
        "Tai reiškia, kiek turi darbo. Pilna lėkštė – užimta savaitė."),
    ],
    mean_crushing: [
      t("It | means | you're | doing | really, | really | well!", "Tai | reiškia, | kad tau | sekasi | labai, | labai | gerai!", "Tai reiškia, kad tau sekasi labai labai gerai!",
        { flags: { 2: "Zero “that” (kad); “you're” = tau: sektis takes the dative.", 3: "Progressive “doing” = the present sekasi." } }),
      t("It's | a | compliment! | You're | doing | great.", "Tai yra | — | komplimentas! | Tau | sekasi | puikiai.", "Tai komplimentas! Tau puikiai sekasi.",
        { flags: { 3: F_TAU } }),
    ],
  },

  hints: {
    finding: {
      lt: "Atsakyti, kaip sekasi naujame darbe",
      items: [
        { id: "ropes", s: t("I'm | learning the ropes.", "Aš | perprantu darbą.", "Pamažu perprantu, kas čia kaip.", { flags: { 0: F_PROG } }),
          note: "Iš dainos: „learn the ropes“ – perprasti darbą (pažodžiui: išmokti virves, kaip jūreiviai laive)." },
        { id: "curve", s: t("It's | a | steep learning curve.", "Tai yra | — | daug mokslo per trumpą laiką.", "Tenka daug ko greitai išmokti."),
          note: "Iš dainos: „a steep learning curve“ – kai reikia labai daug ir greitai išmokti." },
        { id: "lot_learn", s: t("There's | a lot | to learn.", "Yra | daug ko | išmokti.", "Reikia daug ko išmokti.") },
        { id: "great", s: t("It's | great, | but | it's | a lot.", "Tai yra | puiku, | bet | tai yra | daug.", "Puiku, bet darbo daug.") },
        { id: "love", s: t("I | love | it | here!", "Man | labai patinka | — | čia!", "Man čia labai patinka!",
          { flags: { 0: "“I” = man: patikti takes the dative.", 2: "“it”: patinka needs no object pronoun." } }) },
        { id: "lost", s: t("Honestly, | I'm | a little | lost.", "Atvirai, | aš esu | truputį | {m:pasimetęs|f:pasimetusi}.", "Atvirai sakant, truputį {m:pasimetęs|f:pasimetusi}.") },
      ],
    },
    overload: {
      lt: "Pasakyti, kad darbų jau per daug", slot: "task", examples: ["bugs", "emails"],
      items: [
        { id: "ears", s: t("I'm | up to my ears | in | {X}.", "Man | iki ausų | — | {X:gen}.", "{X:gen} turiu iki ausų.",
          { flags: { 0: F_EARS, 2: "“in”: the genitive carries it (Lithuanian: work up to the ears)." } }), only: (e) => !!e.attrs?.mine,
          note: "Dainos pavadinimas! Lietuviškai irgi sakome „darbų iki ausų“." },
        { id: "plate", s: t("I | already | have | a lot on my plate.", "Aš | jau | turiu | daug darbų.", "Jau ir taip turiu daug darbų."),
          note: "„On my plate“ – „mano lėkštėje“, t. y. mano darbų sąraše." },
        { id: "too_much", s: t("That's | too | much | for | one | week.", "Tai yra | per | daug | — | vienai | savaitei.", "Vienai savaitei tai per daug.",
          { flags: { 3: "“for”: the dative vienai savaitei carries it." } }) },
        { id: "cant_all", s: t("I | can't do | all | of | that.", "Aš | negaliu padaryti | viso | — | to.", "Viso to padaryti negaliu.",
          { flags: { 3: "“of”: the genitive (after a negation) carries it." } }) },
        { id: "swamped", s: t("I'm | swamped | right now.", "Aš esu | {m:užverstas darbais|f:užversta darbais} | šiuo metu.", "Šiuo metu esu {m:užverstas|f:užversta} darbais."),
          register: "casual", note: "„Swamped“ – užverstas darbais (amerikiečiai sako labai dažnai)." },
        { id: "corners", s: t("I | don't want | to cut corners.", "Aš | nenoriu | dirbti atmestinai.", "Nenoriu dirbti atmestinai."),
          note: "„Cut corners“ – daryti paskubomis, praleidžiant žingsnius." },
      ],
    },
    priority: {
      lt: "Paklausti, kas svarbiausia",
      items: [
        { id: "focus", s: t("What | should | I | focus | on | first?", "Į ką | turėčiau | aš | susitelkti | [į] | pirmiausia?", "Į ką pirmiausia turėčiau susitelkti?") },
        { id: "priority", s: t("Which one | is | the | priority?", "Kuris | yra | — | prioritetas?", "Kas svarbiausia?") },
        { id: "most_important", s: t("What's | most | important?", "Kas yra | labiausiai | svarbu?", "Kas svarbiausia?") },
        { id: "can_wait", s: t("Which one | can | wait?", "Kuris | gali | palaukti?", "Kuris gali palaukti?") },
        { id: "start_where", s: t("Where | should | I | start?", "Nuo ko | turėčiau | aš | pradėti?", "Nuo ko turėčiau pradėti?") },
        { id: "same_page", s: t("So, | are | we | on the same page?", "Tai | ar esame | mes | vienoje bangoje?", "Tai ar mes vienoje bangoje?",
          { flags: { 1: "Question “are” = ar + esame." } }), note: "„On the same page“ – sutariame, mąstome vienodai." },
      ],
    },
    propose: {
      lt: "Pasiūlyti, ką daryti pirmiausia, o kas gali palaukti", slot: "task", examples: ["slides", "bugs", "party", "photo"],
      items: [
        { id: "first_rest", s: t("I | can | do | {X.the} | first, | and | the | rest | next | week.", "Aš | galiu | padaryti | {X.the:acc} | pirmiausia, | o | — | visa kita | kitą | savaitę.",
          "Pirmiausia galiu padaryti {X:acc}, o visa kita – kitą savaitę.") },
        { id: "focus_on", s: t("I'll focus | on | {X.the} | first.", "Susitelksiu | į | {X.the:acc} | pirmiausia.", "Pirmiausia susitelksiu į {X:acc}.") },
        { id: "start_with", s: t("Let's start | with | {X.the}.", "Pradėkime | nuo | {X.the:gen}.", "Pradėkime nuo {X:gen}.") },
        { id: "wait_week", s: t("Can | {X.the} | wait | until | next | week?", "Ar gali | {X.the:nom} | palaukti | iki | kitos | savaitės?", "Ar {X:nom} gali palaukti iki kitos savaitės?",
          { flags: { 0: F_CAN_Q } }), only: (e) => !!e.attrs?.fresh },
        { id: "someone_else", s: t("Could | someone | else | do | {X.the}?", "Ar galėtų | kas nors | kitas | padaryti | {X.the:acc}?", "Gal {X:acc} galėtų padaryti kas nors kitas?",
          { flags: { 0: F_COULD_Q } }), only: (e) => !!e.attrs?.other },
        { id: "brad", s: t("Maybe | Brad | could | do | {X.the}?", "Gal | Bredas | galėtų | padaryti | {X.the:acc}?", "Gal {X:acc} galėtų padaryti Bredas?"), only: (e) => !!e.attrs?.other,
          note: "Iš dainos: Bredas iš pardavimų skyriaus „won't pull his weight“ – neatlieka savo dalies." },
      ],
    },
    idioms: {
      lt: "Paklausti, ką reiškia idioma",
      items: [
        { id: "what_mean", s: t("Sorry, | what | does | “touch base” | mean?", "Atsiprašau, | ką | — | „touch base“ | reiškia?", "Atsiprašau, ką reiškia „touch base“?",
          { flags: { 2: F_DOES } }), note: "Taip gali paklausti apie bet kurią Tailerio idiomą." },
        { id: "mean_by", s: t("What | do | you | mean | by | “pull your weight”?", "Ką | — | tu | turi omenyje | sakydamas | „pull your weight“?", "Ką turi omenyje sakydamas „pull your weight“?",
          { flags: { 1: F_WH_DO, 4: "“by (a phrase)” = sakydamas (when saying)." } }) },
        { id: "idiom", s: t("Is | that | an | idiom?", "Ar | tai | — | idioma?", "Ar tai idioma?", { flags: { 0: F_IS_Q } }) },
        { id: "plain", s: t("Could | you | say | that | in | plain | English?", "Ar galėtum | tu | pasakyti | tai | — | paprasta | anglų kalba?", "Gal gali pasakyti paprasčiau?",
          { flags: { 0: F_COULD_Q, 4: "“in”: the instrumental (paprasta anglų kalba) carries it." } }) },
        { id: "what_base", s: t("What | base?", "Kokia | bazė?", "Kokia dar bazė?"), register: "casual",
          note: "Iš dainos: „still don't know what the base is“ – juokas apie „touch base“." },
      ],
    },
    owner: {
      lt: "Paklausti, kas už ką atsakingas", slot: "area", examples: ["budget", "party", "payroll"],
      items: [
        { id: "who_ask", s: t("Who | should | I | ask | about | {X.the}?", "Ko | turėčiau | aš | klausti | apie | {X.the:acc}?", "Ko turėčiau klausti apie {X:acc}?"), only: (e) => !e.attrs?.bare },
        { id: "who_ask", s: t("Who | should | I | ask | about | {X}?", "Ko | turėčiau | aš | klausti | apie | {X:acc}?", "Ko turėčiau klausti apie {X:acc}?"), only: (e) => !!e.attrs?.bare,
          note: "Iš istorijos „The Last Friday“: „Who should I ask about payroll?“" },
        { id: "in_charge", s: t("Who's | in charge of | {X.the}?", "Kas yra | atsakingas už | {X.the:acc}?", "Kas atsakingas už {X:acc}?"), only: (e) => !e.attrs?.bare },
        { id: "in_charge", s: t("Who's | in charge of | {X}?", "Kas yra | atsakingas už | {X:acc}?", "Kas atsakingas už {X:acc}?"), only: (e) => !!e.attrs?.bare },
        { id: "deadline", s: t("What's | the | deadline?", "Koks yra | — | terminas?", "Koks terminas?") },
        { id: "insist", s: t("Sorry, | but | I | need | to know | now.", "Atsiprašau, | bet | man | reikia | žinoti | dabar.", "Atsiprašau, bet man reikia žinoti dabar.",
          { flags: { 2: F_MAN } }), note: "Jei Taileris išsisuka („Let's take that offline“), mandagiai paklausk dar kartą." },
      ],
    },
    crash: {
      lt: "Pasiūlyti, ką daryti po avarijos",
      items: [
        { id: "fix_first", s: t("Let's fix | the | bug | first.", "Ištaisykime | — | klaidą | pirmiausia.", "Pirmiausia ištaisykime klaidą.") },
        { id: "fix_first", s: t("We | should | tell | the | customers.", "Mes | turėtume | pranešti | — | klientams.", "Turėtume pranešti klientams.") },
        { id: "fix_first", s: t("Let's ask | Ben | for | help.", "Paprašykime | Beno | — | pagalbos.", "Paprašykime Beno pagalbos.", { flags: { 2: "“for”: the genitive pagalbos carries it." } }) },
        { id: "fix_first", s: t("Let's launch | next | week.", "Paleiskime | kitą | savaitę.", "Paleiskime kitą savaitę.") },
        { id: "what_exactly", s: t("What | exactly | do | you | want | me | to do?", "Ką | tiksliai | — | tu | nori, kad | aš | padaryčiau?", "Ką tiksliai nori, kad padaryčiau?",
          { flags: { 2: F_WH_DO, 6: "“to do” after “want me”: kad + the conditional padaryčiau." } }) },
        { id: "who_cut", s: t("Who | cut corners?", "Kas | dirbo atmestinai?", "Kas dirbo atmestinai?"), register: "casual" },
      ],
    },
    midnight: {
      lt: "Derėtis dėl darbo iki vidurnakčio", slot: "hour", examples: ["h7", "h6", "h8"],
      items: [
        { id: "until_time", s: t("I | can | stay | until | {X}, | but | then | I'll call it a day.", "Aš | galiu | likti | iki | {X:gen}, | bet | tada | baigsiu darbą.",
          "Galiu likti iki {X:gen}, bet tada baigsiu darbą."), only: (e) => !!e.attrs?.eve, note: "Iš dainos: „call it a day“ – baigti dienos darbą." },
        { id: "paid", s: t("Will | the | overtime | be | paid?", "Ar | — | viršvalandžiai | bus | apmokami?", "Ar viršvalandžiai bus apmokami?",
          { flags: { 0: "Question “Will” = ar; the future bus (under “be”) carries it." } }), note: "Iš istorijos „The Last Friday“: viršvalandžiai turi būti apmokami." },
        { id: "cant_stay", s: t("Sorry, | I | can't stay | late | tonight.", "Atsiprašau, | aš | negaliu likti | ilgai | šįvakar.", "Atsiprašau, šįvakar negaliu likti ilgai.") },
        { id: "plans", s: t("I | have | plans | tonight.", "Aš | turiu | planų | šįvakar.", "Šįvakar turiu planų.") },
        { id: "finish_time", s: t("What time | do | we | finish?", "Kelintą valandą | — | mes | baigiame?", "Kelintą baigiame?", { flags: { 1: F_WH_DO } }) },
      ],
    },
    closing: {
      lt: "Susitarti dėl rytdienos susitikimo", slot: "hour", examples: ["noon", "h10", "h1"],
      items: [
        { id: "see_eight", s: t("Sure, | see you | at eight.", "Žinoma, | iki | aštuntos.", "Žinoma, iki aštuntos.") },
        { id: "make_it", s: t("Could | we | make it | {X}?", "Ar galėtume | mes | susitikti | {X:acc}?", "Gal galėtume susitikti {X:acc}?", { flags: { 0: F_COULD_Q } }),
          only: (e) => !!e.attrs?.meet, note: "Iš dainos: „Make it noon… or one.“" },
        { id: "how_about", s: t("How about | {X}?", "O gal | {X:acc}?", "O gal {X:acc}?"), only: (e) => !!e.attrs?.meet },
        { id: "early", s: t("Eight | is | a bit | early | for me.", "Aštunta | yra | šiek tiek | anksti | man.", "Aštunta man kiek per anksti.") },
        { id: "call_day", s: t("Let's call it a day!", "Baikime šiandien darbą!", "Baikime šiandien darbą!"), note: "Iš dainos: „call it a day“ – baigti dienos darbą." },
      ],
    },
  },

  tips: {
    blunt_no: { key: "blunt_no", lt: "Suprasta! Vienas griežtas „No“ vadovui skamba šiurkščiai. Geriau paaiškink, kodėl: kiek darbų jau turi.", better: "I'm up to my ears in bug reports." },
    rude: { key: "rude", lt: "Suprasta! Taip vadovui sakyti nemandagu – net startuolyje. Geriau ramiai paaiškink, kiek darbų jau turi, ir pasiūlyk, kas gali palaukti.",
      better: "I already have a lot on my plate. Can the party wait?" },
    uk_eyes: { key: "uk_eyes", lt: "Suprasta! „Up to my eyes“ – britiškas variantas. Amerikiečiai dažniau sako „up to my ears“ arba „swamped“.", better: "I'm up to my ears in bug reports." },
    head: { key: "head", lt: "Suprasta! „Darbų ant galvos“ – lietuviškas posakis; angliškai sakoma „on my plate“ (mano lėkštėje).", better: "I have a lot on my plate." },
  },

  merges: {
    "let's touch base": { reason: "lexical_expression", split: "Let's → leiskime, touch → paliesti, base → bazę is false; the business idiom = trumpai pasitarkime.", minimal: "The whole idiom with “Let's”." },
    "touch base": { reason: "lexical_expression", split: "touch → paliesti + base → bazę is false (from baseball); = trumpai pasitarti.", minimal: "Two words." },
    "steep learning curve": { reason: "lexical_expression", split: "steep → stati + learning curve → mokymosi kreivė is a calque most readers wouldn't understand; = daug mokslo per trumpą laiką.", minimal: "The three words form the idiom." },
    "so far": { reason: "lexical_expression", split: "so → taip + far → toli is false; = kol kas.", minimal: "Two words." },
    "how's it going": { reason: "lexical_expression", split: "How's → kaip yra, it → tai, going → einantis is a literal reading of a set greeting (= kaip sekasi).", minimal: "The greeting." },
    "crushing it": { reason: "lexical_expression", split: "crushing → traiškantis + it → tai is false; the slang compliment = puikiai sekasi.", minimal: "Two words." },
    "love it": { reason: "lexical_expression", split: "love → myliu + it → tai is false; the enthusiastic approval = puiku.", minimal: "Two words." },
    "hang in there": { reason: "lexical_expression", split: "hang → kabėk, in → į, there → ten is false; the encouragement = laikykis.", minimal: "Three words." },
    "you'll get": { reason: "grammatical_fusion", split: "“'ll” has no word: the future perprasi carries it; get (understand) = perprasti.", minimal: "Pronoun, auxiliary and verb." },
    "don't hate": { reason: "grammatical_fusion", split: "don't → ne + hate → nekęsti: Lithuanian negation is the prefix ne- on the verb.", minimal: "Two words." },
    "learn the ropes": { reason: "lexical_expression", split: "learn → išmokti, the → —, ropes → virvės is false here (sailors' ropes); = perprasti darbą.", minimal: "The idiom." },
    "learning the ropes": { reason: "lexical_expression", split: "learning → mokantis, the → —, ropes → virvės is false here; = perprasti darbą.", minimal: "The idiom." },
    "let's get the ball rolling": { reason: "lexical_expression", split: "Let's → leiskime, get → gauti, the → —, ball → kamuolys, rolling → riedantis is false; = išjudinkime reikalus.", minimal: "The whole idiom." },
    "think outside the box": { reason: "lexical_expression", split: "think → mąstyk, outside → už, the → —, box → dėžės is a calque; = mąstyk kūrybiškai.", minimal: "The whole idiom." },
    "has to": { reason: "grammatical_fusion", split: "has → turi + to → į is false; the obligation = turi (+ infinitive).", minimal: "Two words." },
    "pull their weight": { reason: "lexical_expression", split: "pull → traukti, their → savo, weight → svorį is false; = atlikti savo dalį.", minimal: "The idiom." },
    "pull his weight": { reason: "lexical_expression", split: "pull → traukti, his → savo, weight → svorį is false; = atlikti savo dalį.", minimal: "The idiom." },
    "doesn't pull his weight": { reason: "lexical_expression", split: "doesn't → ne-, pull → traukti, his → savo, weight → svorio is false; = neatlieka savo dalies.", minimal: "The negated idiom." },
    "pull your weight": { reason: "lexical_expression", split: "pull → traukti, your → savo, weight → svorį is false; = atlikti savo dalį (kept in English as the phrase asked about).", minimal: "The idiom." },
    "up to your ears": { reason: "lexical_expression", split: "up → aukštyn, to → iki, your → tavo, ears → ausys is false; Lithuanian has the same image: darbų iki ausų.", minimal: "The idiom." },
    "up to my ears": { reason: "lexical_expression", split: "up → aukštyn, to → iki, my → mano, ears → ausys is false; Lithuanian has the same image: (darbų) iki ausų.", minimal: "The idiom." },
    "i hear you": { reason: "lexical_expression", split: "I → aš, hear → girdžiu, you → tave is a calque; the sympathy formula = suprantu.", minimal: "Three words." },
    "on the same page": { reason: "lexical_expression", split: "on → ant, the → —, same → to paties, page → puslapio is a calque; = (būti) vienoje bangoje.", minimal: "The idiom." },
    "how about": { reason: "lexical_expression", split: "how → kaip + about → apie gives “kaip apie”; a suggestion = o gal.", minimal: "Two words." },
    "for sure": { reason: "lexical_expression", split: "for → už + sure → tikras is false; = be abejo.", minimal: "Two words." },
    "for once": { reason: "lexical_expression", split: "for → už + once → kartą is false; = bent kartą.", minimal: "Two words." },
    "i'll ask around": { reason: "lexical_expression", split: "I'll → aš, ask → klausiu, around → aplink is false; = paklausinėsiu (kitų).", minimal: "Pronoun, auxiliary, verb and particle." },
    "don't cut corners": { reason: "lexical_expression", split: "don't → ne-, cut → pjauti, corners → kampus is false; = nedirbk atmestinai.", minimal: "The negated idiom." },
    "no matter what": { reason: "lexical_expression", split: "no → jokio, matter → dalykas, what → kas is false; = bet kokiu atveju.", minimal: "Three words." },
    "is going crazy": { reason: "lexical_expression", split: "is → yra, going → einantis, crazy → pamišęs is false; a phone that won't stop = pasiuto.", minimal: "Auxiliary, verb and adjective." },
    "cut corners": { reason: "lexical_expression", split: "cut → pjauti + corners → kampus is false; = dirbti atmestinai.", minimal: "Two words." },
    "cutting corners": { reason: "lexical_expression", split: "cutting → pjaunant + corners → kampus is false; = darbas atmestinai.", minimal: "Two words." },
    "cuts corners": { reason: "lexical_expression", split: "cuts → pjauna + corners → kampus is false; = dirba atmestinai.", minimal: "Two words." },
    "back to square one": { reason: "lexical_expression", split: "back → atgal, to → į, square → langelis, one → vienas: the board-game image; = grįžę į pradžią.", minimal: "The idiom." },
    "the ball is in your court": { reason: "lexical_expression", split: "the → —, ball → kamuolys, is → yra, in → tavo, court → aikštelėje: the tennis image; = dabar tavo ėjimas.", minimal: "The idiom." },
    "no more": { reason: "lexical_expression", split: "no → jokio + more → daugiau; Lithuanian puts it as jokio (daugiau).", minimal: "Two words." },
    "let's take that offline": { reason: "lexical_expression", split: "Let's → leiskime, take → imkime, that → tai, offline → neprisijungus is false; the meeting phrase = aptarkime tai atskirai.", minimal: "The whole phrase." },
    "one more": { reason: "lexical_expression", split: "one → vienas + more → daugiau gives “vienas daugiau”; = dar vienas.", minimal: "Two words." },
    "calls it a day": { reason: "lexical_expression", split: "calls → vadina, it → tai, a → —, day → diena is false; = baigia dienos darbą.", minimal: "The idiom." },
    "call it a day": { reason: "lexical_expression", split: "call → vadinti, it → tai, a → —, day → diena is false; = baigti dienos darbą.", minimal: "The idiom." },
    "i'll call it a day": { reason: "lexical_expression", split: "I'll → aš, call → vadinsiu, it → tai, a → —, day → diena is false; = baigsiu darbą.", minimal: "The idiom with its subject and future." },
    "let's call it a day": { reason: "lexical_expression", split: "Let's → leiskime, call → vadinti, it → tai, a → —, day → diena is false; = baikime šiandien darbą.", minimal: "The whole idiom." },
    "couple of": { reason: "lexical_expression", split: "couple → pora + of → — : = porą.", minimal: "Two words." },
    "fair enough": { reason: "lexical_expression", split: "fair → teisinga + enough → pakankamai is false; the concession = na, gerai.", minimal: "Two words." },
    "for stepping up": { reason: "lexical_expression", split: "for → už, stepping → žengiant, up → aukštyn is false; “thanks for stepping up” = ačiū, kad prisidedi.", minimal: "Three words." },
    "see you": { reason: "lexical_expression", split: "see → matysiu + you → tave is a literal reading of a farewell (= iki).", minimal: "Two words." },
    "let's keep": { reason: "grammatical_fusion", split: "Let's → leiskime + keep → laikyti is a calque; the first person plural imperative = palikime.", minimal: "Two words." },
    "not yet": { reason: "lexical_expression", split: "not → ne + yet → dar: Lithuanian says it the other way round (dar ne).", minimal: "Two words." },
    "figure it out": { reason: "lexical_expression", split: "figure → figūra, it → tai, out → lauk is false; = išsiaiškinti.", minimal: "Three words." },
    "kind of": { reason: "lexical_expression", split: "kind → rūšis + of → — is false; the hedge = beveik.", minimal: "Two words." },
    "you're learning": { reason: "grammatical_fusion", split: "you're → tu esi + learning → besimokantis is false; Lithuanian has one finite verb (mokaisi).", minimal: "Two words." },
    "i'll try": { reason: "grammatical_fusion", split: "“'ll”: the future pabandysiu carries it.", minimal: "Two words." },
    "check-in": { reason: "lexical_expression", split: "check → patikrinti + in → į is false; a short meeting = pasitarimas.", minimal: "The hyphenated noun." },
    "in business": { reason: "grammatical_fusion", split: "in → — : the locative versle carries it.", minimal: "Two words." },
    "a lot": { reason: "lexical_expression", split: "a → — + lot → partija is false; the quantity = daug.", minimal: "Two words." },
    "on a ship": { reason: "grammatical_fusion", split: "on → ant, a → —, ship → laivas: the locative laive carries “on”.", minimal: "No glossable word inside." },
    "figuring out": { reason: "lexical_expression", split: "figuring → figūruojantis + out → lauk is false; = aiškintis.", minimal: "Two words." },
    "let's start": { reason: "grammatical_fusion", split: "Let's → leiskime + start → pradėti is a calque; the first person plural imperative = pradėkime.", minimal: "Two words." },
    "come on": { reason: "lexical_expression", split: "come → ateik + on → ant is false; the urging = nagi.", minimal: "Two words." },
    "thank you": { reason: "lexical_expression", split: "thank → dėkoti + you → tau: the thanks formula = ačiū.", minimal: "Two words." },
    "in charge of": { reason: "lexical_expression", split: "in → į, charge → mokestis, of → — is false; = atsakingas už.", minimal: "Three words." },
    "in a new way": { reason: "lexical_expression", split: "in → į, a → —, new → naujas, way → kelias is false; = kitaip.", minimal: "The phrase." },
    "you're drowning": { reason: "grammatical_fusion", split: "you're → tu esi + drowning → skęstantis is false; Lithuanian has one finite verb (skęsti).", minimal: "Two words." },
    "the same way": { reason: "lexical_expression", split: "the → —, same → tas pats, way → kelias is false; = vienodai.", minimal: "Three words." },
    "we're reading": { reason: "grammatical_fusion", split: "we're → mes esame + reading → skaitantys is false; Lithuanian has one finite verb (after lyg: skaitytume).", minimal: "Two words." },
    "instead of": { reason: "lexical_expression", split: "instead → vietoj + of → — : = užuot.", minimal: "Two words." },
    "for today": { reason: "grammatical_fusion", split: "for → už + today → šiandien: the dative šiandienai carries it.", minimal: "Two words." },
    "for the day": { reason: "grammatical_fusion", split: "for → už, the → —, day → diena: the dative šiai dienai carries it.", minimal: "Three words." },
    "let's talk": { reason: "grammatical_fusion", split: "Let's → leiskime + talk → kalbėti is false; the first person plural imperative = pakalbėkime.", minimal: "Two words." },
    "to say": { reason: "grammatical_fusion", split: "Infinitive “to” → į would be false; the infinitive pasakyti carries it.", minimal: "Two words." },
    "on my plate": { reason: "lexical_expression", split: "on → ant, my → mano, plate → lėkštės is false; = mano darbų sąraše (kept in English as the phrase explained).", minimal: "The idiom." },
    "a lot on my plate": { reason: "lexical_expression", split: "a lot → daug, on → ant, my → mano, plate → lėkštės is false; = daug darbų.", minimal: "The idiom." },
    "to cut corners": { reason: "lexical_expression", split: "to → —, cut → pjauti, corners → kampus is false; = dirbti atmestinai.", minimal: "The idiom with its infinitive “to”." },
    "can't do": { reason: "grammatical_fusion", split: "can't → negaliu + do → padaryti: the negation is the prefix ne- of negaliu.", minimal: "Two words." },
    "which one": { reason: "grammatical_fusion", split: "one → vienas would add a false numeral; prop-word “one” is absorbed by kuris.", minimal: "Two words." },
    "i'll focus": { reason: "grammatical_fusion", split: "“'ll”: the future susitelksiu carries it.", minimal: "Two words." },
    "let's fix": { reason: "grammatical_fusion", split: "Let's → leiskime + fix → taisyti is a calque; the first person plural imperative = ištaisykime.", minimal: "Two words." },
    "let's ask": { reason: "grammatical_fusion", split: "Let's → leiskime + ask → prašyti is a calque; the first person plural imperative = paprašykime.", minimal: "Two words." },
    "let's launch": { reason: "grammatical_fusion", split: "Let's → leiskime + launch → paleisti is a calque; the first person plural imperative = paleiskime.", minimal: "Two words." },
    "what time": { reason: "lexical_expression", split: "what → kas + time → laikas is false; asking the hour = kelintą valandą.", minimal: "Two words." },
    "can't stay": { reason: "grammatical_fusion", split: "can't → negaliu + stay → likti: the negation is the prefix ne- of negaliu.", minimal: "Two words." },
    "make it": { reason: "lexical_expression", split: "make → padaryti + it → tai is false; “make it (a time)” = meet at that time (susitikti).", minimal: "Two words." },
    "a bit": { reason: "lexical_expression", split: "a → — + bit → gabalėlis is false; the degree adverb = šiek tiek.", minimal: "Two words." },
    "it is": { reason: "lexical_expression", split: "it → tai + is → yra is false in “Noon it is!”; the agreement = sutarta.", minimal: "Two words." },
    "a little": { reason: "lexical_expression", split: "a → — + little → mažas is false; the degree adverb = truputį.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    // items 1 and 5: not needed for the course report; they leave the list once their moment has passed
    { lt: "Paklausk, ką reiškia bent viena idioma", optional: true, done: (c) => !!c.s.asked, when: (c) => !c.s.goalMet },
    { lt: "Pasakyk, kad darbų jau per daug", done: (c) => !!c.s.overloaded },
    { lt: "Susitark, kas svarbiausia (prioritetai ar terminai)", done: (c) => !!c.s.prioDone },
    { lt: "Susitark dėl kito susitikimo arba užbaik dieną", done: (c) => !!c.s.closeDone && c.s.closeHow !== "tyler" },
    { lt: "Paklausk, kas už ką atsakingas", optional: true, done: (c) => !!c.s.ownerAsked, when: (c) => !c.s.goalMet && !c.s.ownerDone },
  ],

  steps: [
    { id: "hello", done: (c) => !!c.s.helloDone,
      ask: (c) => {
        if (resumed(c, "hello")) { T(c, "anyway"); T(c, "hello_reask"); return; }
        const n = bump(c, "hello");
        if (n === 1) { T(c, "greet"); T(c, "hello_q"); return; }
        if (n <= 3) { T(c, "hello_reask"); return; }
        c.s.helloDone = true; c.s.hello = "skip"; T(c, "hello_skip"); askNext(c);
      },
      expects: ["finding", "finding_ctx", "overloaded"],
      suggest: [{ lt: "Atsakyti, kaip sekasi naujame darbe", hint: "finding" }, { lt: "Paklausti, ką reiškia idioma", hint: "idioms" }],
      // "Steep learning curve, huh?" – "Yeah." / "No."
      yes: (c) => { helloAnswer(c, "learn"); },
      no: (c) => { helloAnswer(c, "no"); },
      help: (c) => { if (!once(c, "hello")) return; c.s.helloDone = true; c.s.hello = "skip"; T(c, "hello_skip"); } },
    { id: "pile", when: (c) => !!c.s.helloDone, done: (c) => !!c.s.pileSaid && (!!c.s.overloaded || !!c.s.pileSkip),
      ask: (c) => {
        if (resumed(c, "pile")) { T(c, "anyway"); T(c, "pile_reask"); return; }
        const n = bump(c, "pile");
        if (n === 1) {
          c.s.pileSaid = true;
          T(c, "pile_intro"); T(c, "pile_list"); T(c, c.s.weightLine ? "pile_weight" : "pile_box");
          if (c.s.overloaded) { T(c, "pile_know"); askNext(c); return; }
          T(c, "pile_q");
          return;
        }
        if (n <= 3) { T(c, "pile_reask"); return; }
        c.s.pileSkip = true; askNext(c);
      },
      expects: ["overloaded", "can_do_all", "refuse_all", "ask_priority", "propose", "what_about"],
      suggest: [{ lt: "Pasakyti, kad darbų jau per daug", hint: "overload", options: ["bugs", "emails"] }, { lt: "Paklausti, kas svarbiausia", hint: "priority" },
        { lt: "Paklausti, ką reiškia idioma", hint: "idioms" }],
      // "Easy, right?" – "Sure!" (all of it) / "No." (flat)
      yes: (c) => { canDoAll(c); },
      no: (c) => { c.tip(TIPS.blunt_no); refuse(c, false); },
      help: (c) => { if (once(c, "cando")) askTooMuch(c, "q"); } },
    { id: "priorities", when: (c) => !!c.s.pileSaid && (!!c.s.overloaded || !!c.s.pileSkip), done: prioResolved,
      ask: (c) => {
        if (resumed(c, "priorities")) { T(c, "anyway"); T(c, "prio_reask"); return; }
        const n = bump(c, "priorities");
        if (n === 1) {
          // "Okay… what can you do?" was the question already
          if (c.s.prioPre) { c.s.prioPre = false; return; }
          T(c, c.s.overloaded ? "prio_q" : "prio_q_cool");
          return;
        }
        if (n === 2) { T(c, "prio_reask"); return; }
        if (n === 3) { T(c, "prio_deal"); c.expect(dealPending()); return; }
        c.s.prioSkip = true; T(c, "deal_no"); askNext(c);
      },
      expects: ["propose", "propose_ctx", "ask_priority", "what_about", "refuse_all", "same_page_q"],
      suggest: [{ lt: "Pasiūlyti, ką daryti pirmiausia, o kas gali palaukti", hint: "propose", options: "task" }, { lt: "Paklausti, kas svarbiausia", hint: "priority" }],
      no: (c) => { c.tip(TIPS.blunt_no); refuse(c, false); },
      help: (c) => { if (!once(c, "deal")) return; T(c, "prio_deal"); c.expect(dealPending()); } },
    // Twist: the launch crashes (no mission item).
    { id: "crash", when: (c) => c.s.twist === "crash" && prioResolved(c), done: crashResolved,
      ask: (c) => {
        if (resumed(c, "crash")) { T(c, "anyway"); T(c, "crash_reask"); return; }
        const n = bump(c, "crash");
        if (n === 1) { c.s.crashSaid = true; c.twist("crash"); T(c, "crash_1"); T(c, "crash_2"); T(c, "crash_3"); return; }
        if (n === 2) { T(c, "crash_reask"); return; }
        if (n === 3) { T(c, "crash_help"); c.expect(crashOkPending()); return; }
        c.s.crashSkip = true; T(c, "crash_skip"); askNext(c);
      },
      expects: ["plan", "crash_what", "crash_who", "ball_back"],
      suggest: [{ lt: "Pasiūlyti, ką daryti po avarijos", hint: "crash" }, { lt: "Paklausti, ką reiškia idioma", hint: "idioms" }],
      help: (c) => { if (!once(c, "crashHelp")) return; T(c, "crash_help"); c.expect(crashOkPending()); } },
    { id: "owner", when: (c) => prioResolved(c) && (c.s.twist !== "crash" || crashResolved(c)), done: (c) => !!c.s.ownerDone,
      ask: (c) => {
        if (resumed(c, "owner")) { T(c, "anyway"); T(c, "owner_reask"); return; }
        const n = bump(c, "owner");
        if (n === 1) { T(c, "owner_ask"); return; }
        if (n <= 4) { T(c, "owner_reask"); return; }
        c.s.ownerDone = true; askNext(c);
      },
      expects: ["ask_owner", "insist", "no_more"],
      suggest: [{ lt: "Paklausti, kas už ką atsakingas", hint: "owner", options: "area" }, { lt: "Atsakyti, kad klausimų nebėra", hint: "g_yesno" }],
      // "Anything else?" – "Yes, actually." / "No, I'm good."
      // ("Okay, thanks." after an answer is a no)
      yes: (c) => {
        if (/\bthank/i.test(c.heard) || !/\b(yes|yeah|yep|actually|sure|one more)\b/i.test(c.heard)) { ownerEnd(c); return; }
        if (once(c, "shoot")) { T(c, "shoot"); c.hold(); }
      },
      no: (c) => { ownerEnd(c); },
      help: (c) => { ownerEnd(c); } },
    // Twist: until midnight (no mission item).
    { id: "midnight", when: (c) => c.s.twist === "midnight" && !!c.s.ownerDone, done: (c) => !!c.s.midDone,
      ask: (c) => {
        if (resumed(c, "midnight")) { T(c, "anyway"); T(c, "mid_reask"); return; }
        const n = bump(c, "midnight");
        if (n === 1) { c.s.midSaid = true; c.twist("midnight"); T(c, "mid_1"); T(c, "mid_2"); return; }
        if (n <= 3) { T(c, "mid_reask"); return; }
        c.s.midDone = true; c.s.midHow = "tyler"; T(c, "mid_giveup"); askNext(c);
      },
      expects: ["stay_limit", "stay_yes", "cant_stay", "paid_q", "mid_finish_q", "mid_why", "call_day"],
      suggest: [{ lt: "Derėtis dėl darbo iki vidurnakčio", hint: "midnight", options: ["h6", "h7", "h8"] }, { lt: "Paklausti, ką reiškia idioma", hint: "idioms" }],
      // "Can you stay?" – "Yes." / "No."
      yes: (c) => { midResolve(c, "yes"); },
      no: (c) => { midResolve(c, "cant"); },
      help: (c) => { if (once(c, "paidq")) { T(c, "mid_paid"); c.expect(midDealPending()); } } },
    { id: "tomorrow", when: (c) => !!c.s.ownerDone && (c.s.twist !== "midnight" || !!c.s.midDone), done: (c) => !!c.s.closeDone,
      ask: (c) => {
        if (resumed(c, "tomorrow")) { T(c, "anyway"); T(c, "close_reask"); return; }
        const n = bump(c, "tomorrow");
        if (n === 1) { T(c, "close_q"); return; }
        if (n === 2) { T(c, "close_reask"); return; }
        // Tyler fixes the time himself (item 4 not ticked)
        c.s.closeDone = true; c.s.closeHow = "tyler"; c.s.meet = "h8"; T(c, "close_skip"); askNext(c);
      },
      expects: ["meet_time", "meet_time_ctx", "meet_ok", "cant_time", "call_day"],
      suggest: [{ lt: "Susitarti dėl rytdienos susitikimo", hint: "closing", options: ["h9", "h10", "noon", "h1"] }],
      // "Touch base again at eight tomorrow?" – "Sure." / "No."
      yes: (c) => { meetOk(c); },
      no: (c) => { if (!closingLive(c) || !once(c, "meet")) return; T(c, "when_q"); c.expect(whenPending()); },
      help: (c) => { if (!closingLive(c) || !once(c, "meet")) return; offer(c, "noon", "when_noon"); } },
  ],

  init: (c) => {
    c.s.asks = {};
    c.s.explained = {};
    c.s.recent = [];
    const seen: string[] = Array.isArray(c.memory.sproutlyTwists) ? c.memory.sproutlyTwists : [];
    if (c.visits >= 1 ? c.chance(0.85) : c.chance(0.35)) {
      const fresh = ["crash", "midnight"].filter((x) => !seen.includes(x));
      c.s.twist = c.pick(fresh.length ? fresh : ["crash", "midnight"]);
    } else c.s.twist = null;
    c.s.weightLine = c.chance(0.35);
  },

  start: () => { /* the hello step greets */ },

  handlers: {
    // --- the first week ---
    finding(c, _slots, seg) {
      if (c.s.helloDone) {
        // "Honestly, I'm a little lost" after the pile: that's too much work
        if (seg.tags.includes("hard") && c.s.pileSaid && !c.s.overloaded) overload(c, "said");
        return;
      }
      praiseIdiom(c, seg);
      helloAnswer(c, seg.tags.includes("hard") ? "hard" : seg.tags.includes("learn") ? "learn" : "good");
    },

    finding_ctx(c) { helloAnswer(c, "learn"); },
    agree_ctx() { /* answered by the open question (pushback, deal, crash_ok, mid_deal, offer) */ },

    // --- the pile ---
    overloaded(c, _slots, seg) { praiseIdiom(c, seg); overload(c, "said"); },
    can_do_all(c) { canDoAll(c); },
    refuse_all(c, _slots, seg) { refuse(c, seg.tags.includes("tip:rude")); },

    // --- priorities ---
    ask_priority(c) { askPriority(c); },
    what_about(c, slots) {
      const tk = first(slots.t);
      if (!tk || !c.s.pileSaid || !once(c, "wa")) return;
      T(c, `wa_${tk}`);
      if (!c.s.prioDone && (c.step === "pile" || c.step === "priorities")) { setPrio(c, tk === "bugs" ? "bugs" : "slides", "asked"); afterPrio(c); }
    },
    propose(c, slots, seg) { proposal(c, slots, seg.tags); },
    propose_ctx(c, slots, seg) {
      // "And the customer emails?": a question about that task
      const tk = first(slots.a);
      if (tk && (/\?\s*$/.test(c.heard) || /^\W*and\b/i.test(c.heard))) { startup.handlers.what_about(c, { t: tk }, seg); return; }
      proposal(c, slots, [...seg.tags, "first"]);
    },
    same_page_q(c, _slots, seg) {
      if (!c.s.pileSaid || !once(c, "samePage")) return;
      praiseIdiom(c, seg);
      if (c.s.prioDone) { T(c, "same_page_yes"); return; }
      T(c, "same_page_not_yet"); c.hold();
    },

    // --- idioms ---
    idiom_q(c, slots) { const id = first(slots.id); if (id) explain(c, id); },
    idiom_echo(c, slots) { const id = first(slots.id); if (id) explain(c, id); },
    idiom_plain(c) {
      const id = recentIdiom(c);
      if (!id) { GLOBAL_HANDLERS.g_meaning(c as any, {}); return; }
      // "Is that an idiom?" – "Yep! Sorry." first
      if (/\b(idiom|expression|saying)\b/i.test(c.heard) && /^\W*(is|that)\b/i.test(c.heard) && once(c, "yep")) T(c, "yep_idiom");
      explain(c, id);
    },
    idiom_meta(c) { if (once(c, "meta")) T(c, "meta"); },
    // the global "What does that mean?" / "What do you mean?": the idiom Tyler just used, or the word asked about
    g_meaning(c, slots) {
      const id = slots?.w ? idiomFromWords(slots.w) : recentIdiom(c);
      if (id) explain(c, id); else GLOBAL_HANDLERS.g_meaning(c as any, slots);
    },
    g_dont_understand(c, slots) {
      const id = recentIdiom(c);
      if (id && !c.s.explained?.[id]) explain(c, id); else GLOBAL_HANDLERS.g_dont_understand(c as any, slots);
    },

    // --- who owns what ---
    ask_owner(c, slots, seg) { askOwner(c, first(slots.a), seg.tags.includes("deadline") ? "deadline" : seg.tags.includes("money") ? "budget" : undefined); },
    insist(c) {
      if (!c.s.evaded || c.s.answered || !once(c, "owner")) return;
      ownerAnswer(c, c.s.lastArea ?? "general");
    },
    no_more(c) { if (c.step === "owner" && !c.s.ownerDone) ownerEnd(c); },
    who_person(c, slots) { const p = first(slots.p); if (p && once(c, "who")) T(c, `who_${p}`); },

    // --- the crash ---
    plan(c, _slots, seg) {
      if (!crashLive(c)) {
        // outside the crash: "Let's fix the bugs first" = the bug reports first
        if (c.s.pileSaid && !prioResolved(c) && seg.tags.includes("fix")) proposal(c, { a: "bugs" }, ["first"]);
        return;
      }
      praiseIdiom(c, seg);
      if (!once(c, "plan")) return;
      const how = PLAN_TAGS.find((x) => seg.tags.includes(x)) ?? "fix";
      crashFixed(c, how);
    },
    crash_what(c) { if (crashLive(c) && once(c, "crashWhat")) { T(c, "crash_what"); c.hold(); } },
    crash_who(c) { if (crashLive(c) && once(c, "crashWho")) T(c, "crash_who"); },
    ball_back(c, _slots, seg) {
      praiseIdiom(c, seg);
      if ((crashLive(c) || (c.s.pileSaid && !prioResolved(c))) && once(c, "ballBack")) { T(c, "ball_back_react"); c.hold(); }
    },

    // --- midnight ---
    stay_limit(c, slots, seg) {
      if (!midLive(c)) return;
      praiseIdiom(c, seg);
      const h = hourId(slots.time);
      if (h === "midnight") { midResolve(c, "yes"); return; }
      midResolve(c, "limit", h);
    },
    stay_yes(c) { if (midLive(c)) midResolve(c, "yes"); },
    cant_stay(c) { if (midLive(c)) midResolve(c, "cant"); },
    paid_q(c) { if (!midLive(c) || !once(c, "paidq")) return; T(c, "mid_paid"); c.expect(midDealPending()); },
    mid_finish_q(c) { if (!midLive(c) || !once(c, "paidq")) return; T(c, "mid_finish"); c.expect(midDealPending()); },
    mid_why(c) { if (midLive(c) && once(c, "midWhy")) T(c, "mid_why"); },

    // --- tomorrow ---
    meet_time(c, slots, seg) { praiseIdiom(c, seg); meetTime(c, slots.time); },
    meet_time_ctx(c, slots) { meetTime(c, slots.time); },
    meet_ok(c) { meetOk(c); },
    cant_time(c) { if (!closingLive(c) || !once(c, "meet")) return; T(c, "when_q"); c.expect(whenPending()); },
    call_day(c, _slots, seg) { praiseIdiom(c, seg); callDay(c); },

    // --- small talk ---
    dog_q(c) { if (once(c, "dog")) T(c, "dog"); },
    slide_q(c) { if (once(c, "slide")) T(c, "slide"); },

    // --- global intents: the step decides what they mean here ---
    g_ok(c) {
      if (pendingOpen(c)) return;
      switch (c.step) {
        case "hello": helloAnswer(c, "good"); return;
        case "pile": canDoAll(c); return;
        case "owner": ownerEnd(c); return;
        case "tomorrow": meetOk(c); return;
      }
    },
    g_thanks(c) {
      if (c.step === "owner" && !c.s.ownerDone && !pendingOpen(c)) { ownerEnd(c); return; }
      if (once(c, "welcome")) c.say("g_welcome");
    },
    g_hello(c) {
      if (c.step === "hello" && !c.s.helloDone) { if (once(c, "hi")) { T(c, "hello_hi"); c.hold(); } return; }
      if (!c.s.hiBack) { c.s.hiBack = true; c.say("g_hello"); }
    },
    g_howareyou_answer(c, slots) {
      if (c.step === "hello" && !c.s.helloDone) {
        if (/\b(you|yourself)\b/i.test(c.heard.replace(/\bthank(s)?\s+you\b/gi, " "))) c.say("g_asked_back");
        helloAnswer(c, "good");
        return;
      }
      GLOBAL_HANDLERS.g_howareyou_answer(c as any, slots);
    },
    g_howareyou_bad(c, slots) {
      if (c.step === "hello" && !c.s.helloDone) { helloAnswer(c, "hard"); return; }
      GLOBAL_HANDLERS.g_howareyou_bad(c as any, slots);
    },
    // "I don't know" / "I'm not sure": the step's help, where its question would come (see the end of the file)
    g_dontknow(c) {
      const st = startup.steps.find((x) => x.id === c.step);
      if (st?.help && !st.done(c)) { DONT_KNOW.set(c, st.id); return; }
      c.say("g_take_time"); c.hold();
    },
    // walking away before the end
    g_bye(c) {
      if (c.s.__finished) { closeReply(c); return; }
      // the work is settled: leaving now ends the day (item 4)
      if (c.s.overloaded && c.s.prioDone) {
        c.s.ownerDone = true; c.s.midDone = true; if (!crashResolved(c)) c.s.crashSkip = true;
        c.s.closeDone = true; c.s.closeHow = "bye"; c.s.__finished = true;
        closing(c); closeReply(c);
        return;
      }
      T(c, "bye_early"); c.end(); c.hold();
    },
  },

  finish: (c) => { closing(c); },

  tests: [
    // the first week
    { say: "I'm learning the ropes.", intent: "finding", step: "hello" },
    { say: "It's a steep learning curve.", intent: "finding", step: "hello" },
    { say: "There's a lot to learn.", intent: "finding", step: "hello" },
    { say: "It's great, but it's a lot.", intent: "finding", step: "hello" },
    { say: "I love it here!", intent: "finding", step: "hello" },
    { say: "Honestly, I'm a little lost.", intent: "finding", step: "hello" },
    { say: "Good, thanks.", intent: "finding", step: "hello" },
    { say: "It's a lot.", intent: "overloaded", step: "hello" },
    // too much
    { say: "I'm up to my ears in bug reports.", intent: "overloaded", step: "pile", slots: { t: "bugs" } },
    { say: "I'm up to my ears in customer emails.", intent: "overloaded", step: "pile", slots: { t: "emails" } },
    { say: "I already have a lot on my plate.", intent: "overloaded", step: "pile" },
    { say: "That's too much for one week.", intent: "overloaded", step: "pile" },
    { say: "I can't do all of that.", intent: "overloaded", step: "pile", not: ["can_do_all"] },
    { say: "I'm swamped right now.", intent: "overloaded", step: "pile" },
    { say: "I don't want to cut corners.", intent: "overloaded", step: "pile" },
    { say: "I'm up to my eyes in work.", intent: "overloaded", step: "pile" },
    { say: "I have a lot of work on my head.", intent: "overloaded", step: "pile" },
    { say: "I'm still working on the bug reports and the customer emails.", intent: "overloaded", step: "pile" },
    { say: "I can do all of that.", intent: "can_do_all", step: "pile", not: ["overloaded"] },
    { say: "No problem.", intent: "can_do_all", step: "pile" },
    { say: "No way.", intent: "refuse_all", step: "pile" },
    { say: "That's not my job.", intent: "refuse_all", step: "pile", not: ["can_do_all"] },
    // priorities
    { say: "What should I focus on first?", intent: "ask_priority", step: "priorities" },
    { say: "Which one is the priority?", intent: "ask_priority", step: "priorities" },
    { say: "What's most important?", intent: "ask_priority", step: "priorities" },
    { say: "Which one can wait?", intent: "ask_priority", step: "priorities" },
    { say: "Where should I start?", intent: "ask_priority", step: "priorities" },
    { say: "I can do the investor slides first, and the rest next week.", intent: "propose", step: "priorities", slots: { a: "slides" } },
    { say: "I can do the slides first and the newsletter next week.", intent: "propose", step: "priorities", slots: { a: "slides", b: "photo" } },
    { say: "I'll focus on the bug reports first.", intent: "propose", step: "priorities", slots: { a: "bugs" } },
    { say: "Let's start with the slides.", intent: "propose", step: "priorities", slots: { a: "slides" } },
    { say: "Can the launch party wait until next week?", intent: "propose", step: "priorities", slots: { b: "party" } },
    { say: "Could someone else do the launch party?", intent: "propose", step: "priorities", slots: { d: "party" } },
    { say: "Maybe Brad could do the newsletter photo?", intent: "propose", step: "priorities", slots: { d: "photo" } },
    { say: "Just the slides.", intent: "propose_ctx", step: "priorities", slots: { a: "slides" } },
    { say: "So, are we on the same page?", intent: "same_page_q", step: "priorities" },
    { say: "What about the customer emails?", intent: "what_about", step: "priorities", slots: { t: "emails" } },
    { say: "I can't do any of it.", intent: "refuse_all", step: "priorities", not: ["propose"] },
    // idioms: the situation's own explanations win over the global "What does … mean?"
    { say: "Sorry, what does touch base mean?", intent: "idiom_q", step: "hello", slots: { id: "touch_base" }, not: ["g_meaning"] },
    { say: "What does touch base mean?", intent: "idiom_q", slots: { id: "touch_base" }, not: ["g_meaning"] },
    { say: "What do you mean by pull your weight?", intent: "idiom_q", slots: { id: "weight" }, not: ["g_meaning"] },
    { say: "What do you mean by think outside the box?", intent: "idiom_q", step: "pile", slots: { id: "outside_box" }, not: ["g_meaning"] },
    { say: "What does a steep learning curve mean?", intent: "idiom_q", step: "hello", slots: { id: "learning_curve" }, not: ["g_meaning"] },
    { say: "What does back to square one mean?", intent: "idiom_q", step: "crash", slots: { id: "square_one" }, not: ["g_meaning"] },
    { say: "What does the ball is in your court mean?", intent: "idiom_q", step: "crash", slots: { id: "court" }, not: ["g_meaning"] },
    { say: "Sorry, what does take that offline mean?", intent: "idiom_q", step: "owner", slots: { id: "offline" }, not: ["g_meaning"] },
    { say: "What does call it a day mean?", intent: "idiom_q", step: "midnight", slots: { id: "call_day" }, not: ["g_meaning"] },
    { say: "What's on the same page?", intent: "idiom_q", step: "priorities", slots: { id: "same_page" } },
    { say: "What base?", intent: "idiom_q", step: "hello", slots: { id: "touch_base" }, not: ["g_repeat"] },
    { say: "Get the ball rolling? What does that mean?", intent: "idiom_q", step: "pile", slots: { id: "ball_rolling" } },
    { say: "Cut corners?", intent: "idiom_echo", step: "crash", slots: { id: "corners" } },
    { say: "Is that an idiom?", intent: "idiom_plain", step: "pile" },
    { say: "Could you say that in plain English?", intent: "idiom_plain", step: "crash" },
    { say: "What does that mean?", intent: "g_meaning", step: "hello" },
    { say: "Why do you use so many idioms?", intent: "idiom_meta" },
    // who owns what
    { say: "Who should I ask about the budget?", intent: "ask_owner", step: "owner", slots: { a: "budget" } },
    { say: "Who should I ask about payroll?", intent: "ask_owner", step: "owner", slots: { a: "payroll" } },
    { say: "Who's in charge of the launch party?", intent: "ask_owner", step: "owner", slots: { a: "party" } },
    { say: "What's the deadline?", intent: "ask_owner", step: "owner" },
    { say: "Sorry, but I need to know now.", intent: "insist", step: "owner" },
    { say: "No, that's all.", intent: "no_more", step: "owner" },
    { say: "Who is Brad?", intent: "who_person", slots: { p: "brad" } },
    // the crash
    { say: "Let's fix the bug first.", intent: "plan", step: "crash" },
    { say: "We should tell the customers.", intent: "plan", step: "crash" },
    { say: "Let's ask Ben for help.", intent: "plan", step: "crash" },
    { say: "Let's launch next week.", intent: "plan", step: "crash" },
    { say: "What exactly do you want me to do?", intent: "crash_what", step: "crash" },
    { say: "Who cut corners?", intent: "crash_who", step: "crash", not: ["idiom_q"] },
    { say: "The ball is in your court.", intent: "ball_back", step: "crash" },
    // midnight
    { say: "I can stay until seven, but then I'll call it a day.", intent: "stay_limit", step: "midnight", slots: { time: { h: 7 } } },
    { say: "Will the overtime be paid?", intent: "paid_q", step: "midnight" },
    { say: "Sorry, I can't stay late tonight.", intent: "cant_stay", step: "midnight", not: ["stay_yes", "stay_limit"] },
    { say: "I can't stay until midnight.", intent: "cant_stay", step: "midnight", not: ["stay_yes"] },
    { say: "I have plans tonight.", intent: "cant_stay", step: "midnight" },
    { say: "What time do we finish?", intent: "mid_finish_q", step: "midnight" },
    { say: "I can stay late tonight.", intent: "stay_yes", step: "midnight" },
    { say: "I can stay a little, but not until midnight.", intent: "stay_limit", step: "midnight", not: ["stay_yes"] },
    // tomorrow
    { say: "Sure, see you at eight.", intent: "meet_time", step: "tomorrow" },
    { say: "Could we make it noon?", intent: "meet_time", step: "tomorrow", slots: { time: { h: 12 } } },
    { say: "How about ten?", intent: "meet_time", step: "tomorrow", slots: { time: { h: 10 } } },
    { say: "Make it noon... or one.", intent: "meet_time", step: "tomorrow" },
    { say: "Eight is a bit early for me.", intent: "cant_time", step: "tomorrow", not: ["meet_time"] },
    { say: "Let's call it a day!", intent: "call_day", step: "tomorrow" },
    { say: "Ten.", intent: "meet_time_ctx", step: "tomorrow" },
    // small talk
    { say: "Is that your dog?", intent: "dog_q" },
    { say: "Why is there a slide?", intent: "slide_q" },
    // more ways to say it (dev corpus: tests/corpus/p18-startup.json)
    { say: "To be honest, I'm drowning in customer emails.", intent: "overloaded", step: "pile" },
    { say: "I'm already busy with the bug reports.", intent: "overloaded", step: "pile" },
    { say: "The bug reports are more important.", intent: "propose", step: "priorities", slots: { a: "bugs" } },
    { say: "I don't have time for the party this week.", intent: "propose", step: "priorities", slots: { b: "party" } },
    { say: "We should hire someone.", intent: "propose", step: "priorities" },
    { say: "Who do I talk to about the code?", intent: "ask_owner", step: "owner", slots: { a: "code" } },
    { say: "I'm going home at six.", intent: "cant_stay", step: "midnight", not: ["stay_yes"] },
    { say: "I can't make it at eight.", intent: "cant_time", step: "tomorrow", not: ["meet_time"] },
    // not understood
    { say: "purple bicycle elephant", intent: "none" },
    { say: "My car is blue and very fast", intent: "none" },
  ],

  sims: [
    // the song's way, start to finish (no twist)
    { name: "happy path: the song's idioms", turns: ["Hi Tyler! I'm learning the ropes.", "I'm up to my ears in bug reports.", "I can do the slides first and the rest next week.",
      "No, I'm good, thanks.", "Could we make it noon?", "See you tomorrow!"],
      expect: { complete: true, state: { overloaded: true, prioDone: true, closeDone: true, meet: "noon", idiomPraised: true } }, auto: AUTO, setup: PLAIN },
    // idiom questions, "Sure!" first and then a change of mind, asking for the priority, the evasion and asking again, moving the time
    { name: "idioms and changes of mind", turns: ["Hey! What does touch base mean?", "Oh, okay. It's a steep learning curve.", "Sorry, what does think outside the box mean?",
      "Sure, no problem.", "Actually, yes. I already have a lot on my plate.", "What should I focus on first?", "Who's in charge of the launch party?",
      "Sorry, but I need to know now.", "No, that's all.", "Eight is a bit early for me.", "How about ten?", "Bye!"],
      expect: { complete: true, state: { asked: true, ownerAsked: true, evaded: true, answered: true, meet: "h10", prioBy: "asked" } }, auto: AUTO, setup: PLAIN },
    // the crash on every seed: a plan, an idiom asked about in the middle
    { name: "twist: the launch crash", turns: ["Hi! It's great, but there's a lot to learn.", "I'm swamped with customer emails.", "Can the newsletter photo wait until next week?",
      "What does back to square one mean?", "Let's fix the bug first and then tell the customers.", "No, I'm good.", "Sure, see you at eight.", "Thanks, Tyler!"],
      expect: { complete: true, state: { crashDone: true, crashHow: "fix", meet: "h8" } }, auto: AUTO, setup: (s) => { s.twist = "crash"; s.weightLine = false; } },
    // the midnight request on every seed: a flat "No." first (tip), the evasion taken, then paid overtime and a finish time
    { name: "twist: until midnight", turns: ["Hello! I'm a little lost, honestly.", "No.", "I can do the slides, but not the party.", "Who should I ask about the budget?",
      "Okay, thanks.", "Will the overtime be paid?", "Hmm, I can stay until seven, but then I'll call it a day.", "Sure, see you at eight."],
      expect: { complete: true, state: { midDone: true, midHow: "limit", stayUntil: "h7", flatNo: true, evaded: true } }, auto: AUTO, setup: (s) => { s.twist = "midnight"; s.weightLine = false; } },
    // rude first, then better; "Is that an idiom?"; can't stay late (never agrees to stay)
    { name: "blunt, then better; can't stay late", turns: ["Hi.", "Good, thanks.", "That's not my job.", "Okay, sorry. Could someone else do the launch party?",
      "Is that an idiom?", "No.", "Sorry, I can't stay late tonight.", "Could we make it ten?", "Bye!"],
      expect: { complete: true, state: { midHow: "cant", meet: "h10", asked: true } }, auto: AUTO, setup: (s) => { s.twist = "midnight"; s.weightLine = false; } },
    // the party first: Tyler pushes back once and gives in; "Who cut corners?"; "I don't know" during the crash; the evasion twice
    { name: "pushback, the crash, I don't know", turns: ["Hi! Good, thanks.", "I'm up to my ears in bug reports and customer emails.", "I think the launch party is more important.",
      "No, the party first.", "Who cut corners?", "I don't know.", "Yes.", "Who is responsible for the code?", "Who is responsible for the code?",
      "Thanks, that's all.", "Make it noon... or one.", "Bye!"],
      expect: { complete: true, state: { first: "party", crashHow: "tyler", answered: true, meet: "noon" } }, auto: AUTO, setup: (s) => { s.twist = "crash"; s.weightLine = false; } },
    // calling it a day as soon as the work is settled: the goal is met
    { name: "calling it a day early", turns: ["I'm learning the ropes.", "Honestly, I'm up to my ears.", "Which one is the priority?", "Let's call it a day!"],
      expect: { complete: true, state: { closeHow: "day" } }, auto: AUTO, setup: PLAIN },
    // "I don't know" twice: Tyler proposes the plan ("Deal?") and the time ("How about noon?")
    { name: "Tyler decides: deal and noon", turns: ["Hi! It's a lot.", "I don't know.", "Deal.", "Nothing else, thanks.", "Sorry, I can't at eight.",
      "I don't know.", "Sure, noon works.", "Thanks, bye!"],
      expect: { complete: true, state: { prioBy: "deal", meet: "noon", hello: "over" } }, auto: AUTO, setup: PLAIN },
    // no overload ("Rock star!"), then walking away: not done
    { name: "can do it all, then leaving: not done", turns: ["Hi Tyler!", "It's going well.", "Sure, no problem.", "No, I can do it all.", "Sorry, I have to go."],
      expect: { complete: false, state: { pileSkip: true, overloaded: undefined } }, auto: AUTO, setup: PLAIN },
  ],
};

// ---------------------------------------------------------------------------
// Handler helpers (hoisted function declarations)

const TIPS = startup.tips as Record<string, Tip>;
const PLAN_TAGS = ["fix", "tell", "ben", "later", "rollback"];

/** The next step's question right away (a step that settled itself while asking). */
function askNext(c: Ctx) {
  const st = startup.steps.find((x) => (!x.when || x.when(c)) && !x.done(c));
  if (st) { c.ask(st.id); return; }
  if (!c.s.__finished) { c.s.__finished = true; closing(c); }
}

/** The learner used one of the idioms: Tyler notices (once a conversation). */
function praiseIdiom(c: Ctx, seg: { tags: string[] }) {
  if (!seg.tags.includes("idiom") || c.s.idiomPraised) return;
  c.s.idiomPraised = true;
  T(c, "idiom_back");
}

/** The idiom to explain for "What does that mean?": the last one Tyler used and hasn't explained yet. */
function recentIdiom(c: Ctx): string | undefined {
  const r: string[] = c.s.recent ?? [];
  for (let i = r.length - 1; i >= 0; i--) if (!c.s.explained?.[r[i]]) return r[i];
  return r[r.length - 1];
}

/** Tyler explains an idiom in plain English (item 1); the question he was asking comes back short. */
function explain(c: Ctx, id: string) {
  c.s.asked = true;
  if (!once(c, "explain:" + id)) return;
  c.s.explained ||= {};
  c.s.explained[id] = (c.s.explained[id] ?? 0) + 1;
  T(c, `mean_${id}`);
  if (c.step) AFTER.set(c, c.step);
}

/** The answer to "How do you like it so far?". */
function helloAnswer(c: Ctx, kind: "learn" | "good" | "hard" | "no") {
  if (c.s.helloDone || !once(c, "hello")) return;
  c.s.helloDone = true; c.s.hello = kind;
  T(c, `hello_${kind}`);
}

/** "I'm up to my ears" (item 2). At the hello it comes before the pile ("Oof. Funny story…"). */
function overload(c: Ctx, how: string) {
  if (c.s.overloaded || !once(c, "over")) return;
  c.s.overloaded = true; c.s.overHow = how;
  if (!c.s.helloDone) { c.s.helloDone = true; c.s.hello = "over"; T(c, "hello_over"); return; }
  T(c, "over_react");
}

/** "Sure, no problem!" to the pile: Tyler double-checks ("Is that too much?"). */
function canDoAll(c: Ctx) {
  if (!c.s.pileSaid || c.s.overloaded || c.s.pileSkip || !once(c, "cando")) return;
  T(c, "pile_yes");
  askTooMuch(c, "q");
}
function askTooMuch(c: Ctx, kind: "q" | "honest") {
  T(c, kind === "q" ? "too_much_q" : "too_much_honest");
  c.expect({
    id: "too_much", expects: ["overloaded", "can_do_all"], hints: ["overload"],
    suggest: [{ lt: "Pasakyti, kad darbų jau per daug", hint: "overload", options: ["bugs", "emails"] }],
    yes: (cc) => { overload(cc, "yes"); },
    no: (cc) => { notTooMuch(cc); },
    on: {
      overloaded: (cc, _s, seg) => { praiseIdiom(cc, seg); overload(cc, "said"); },
      can_do_all: (cc) => { notTooMuch(cc); },
      refuse_all: (cc, _s, seg) => { refuse(cc, seg.tags.includes("tip:rude")); },
    },
    ask: (cc) => { T(cc, "too_much_reask"); },
  });
}
function notTooMuch(c: Ctx) {
  if (c.s.overloaded || !once(c, "notTooMuch")) return;
  c.s.pileSkip = true;
  T(c, "rockstar");
}

/** A flat "No." or "That's not my job": counts as saying it's too much (with a tip), and Tyler asks what the learner
 *  can do. The second refusal gets his own proposal ("Slides first … Deal?"). */
function refuse(c: Ctx, rude: boolean) {
  if (!c.s.pileSaid || prioResolved(c) || !once(c, "refuse")) return;
  c.s.refused = (c.s.refused ?? 0) + 1;
  if (c.s.refused >= 2 || c.step === "priorities") { if (once(c, "deal")) { T(c, "prio_deal"); c.expect(dealPending()); } return; }
  c.s.flatNo = true;
  if (!c.s.overloaded) { c.s.overloaded = true; c.s.overHow = rude ? "rude" : "no"; }
  c.s.prioPre = true;
  T(c, rude ? "rude_react" : "flat_no_react");
}

function setPrio(c: Ctx, firstTask: string, by: string) { c.s.prioDone = true; c.s.first = firstTask; c.s.prioBy = by; }
/** Priorities settled before the learner said it's too much: Tyler asks honestly. */
function afterPrio(c: Ctx) { if (!c.s.overloaded && !c.s.pileSkip) askTooMuch(c, "honest"); }

/** "What should I focus on first?": Tyler answers (item 3). */
function askPriority(c: Ctx) {
  if (!c.s.pileSaid) return;
  if (c.s.prioDone) { if (once(c, "prioAgain")) T(c, "prio_already"); return; }
  if (!once(c, "prio")) return;
  T(c, "prio_answer");
  setPrio(c, "slides", "asked");
  afterPrio(c);
}

/** The learner's own plan (item 3): what first (a), what later (b), whom to give a task (d). */
function proposal(c: Ctx, slots: Record<string, any>, tags: string[]) {
  if (!c.s.pileSaid) return;
  praiseIdiom(c, { tags });
  if (tags.includes("hire")) { if (once(c, "hire")) T(c, "hire_react"); return; }
  if (c.s.prioDone) { if (once(c, "prioAgain")) T(c, "prio_already"); return; }
  if (!once(c, "propose")) return;
  const a = first(slots.a), b = list(slots.b), d = first(slots.d);
  // the party or the photo before the investor slides: one gentle push back
  if (a === "party" || a === "photo") {
    if (!c.s.pushed) { c.s.pushed = a; T(c, "pushback"); c.expect(pushPending()); return; }
    T(c, "push_no"); setPrio(c, a, "learner"); afterPrio(c); return;
  }
  if (d) T(c, /\bbrad\b/i.test(c.heard) ? "deleg_brad" : "deleg_other");
  if (a) T(c, "prio_ok", { X: a });
  else if (b.length && !d) { T(c, "prio_wait", { X: b[0] }); T(c, "prio_ok_generic"); }
  else T(c, "prio_ok_generic");
  setPrio(c, a ?? "slides", "learner");
  afterPrio(c);
}

function pushPending(): Pending {
  const slidesFirst = (c: Ctx) => { if (!once(c, "push")) return; T(c, "prio_ok", { X: "slides" }); setPrio(c, "slides", "learner"); afterPrio(c); };
  return {
    id: "pushback", expects: ["propose", "propose_ctx", "ask_priority", "agree_ctx"], hints: ["propose"],
    suggest: [{ lt: "Sutikti arba palikti savo planą", hint: "propose", options: "task" }],
    yes: slidesFirst,
    no: (c) => { if (!once(c, "push")) return; T(c, "push_no"); setPrio(c, c.s.pushed, "learner"); afterPrio(c); },
    on: {
      propose: (c, s, seg) => { proposal(c, s, seg.tags); },
      propose_ctx: (c, s, seg) => { proposal(c, s, [...seg.tags, "first"]); },
      g_ok: slidesFirst, agree_ctx: slidesFirst,
    },
    ask: (c) => { T(c, "push_reask"); },
  };
}

/** Tyler's own plan ("Slides first, everything else next week. Deal?"). */
function dealPending(): Pending {
  const yes = (c: Ctx) => { if (!once(c, "dealAns")) return; T(c, "deal_yes"); setPrio(c, "slides", "deal"); afterPrio(c); };
  return {
    id: "deal", expects: ["propose", "propose_ctx", "ask_priority", "agree_ctx"], hints: ["propose"],
    suggest: [{ lt: "Sutikti su planu arba pasiūlyti savo", hint: "propose", options: "task" }],
    yes,
    no: (c) => { if (!once(c, "dealAns")) return; c.s.prioSkip = true; T(c, "deal_no"); },
    on: {
      propose: (c, s, seg) => { proposal(c, s, seg.tags); },
      propose_ctx: (c, s, seg) => { proposal(c, s, [...seg.tags, "first"]); },
      ask_priority: (c) => { askPriority(c); },
      g_ok: yes, agree_ctx: yes,
    },
    ask: (c) => { T(c, "deal_reask"); },
  };
}

/** The crash is handled: a plan (the learner's, or Tyler's after "I don't know"). */
function crashFixed(c: Ctx, how: string) {
  if (crashResolved(c)) return;
  c.s.crashDone = true; c.s.crashHow = how;
  T(c, `crash_${how === "tyler" ? "fix" : how}`);
  T(c, "crash_end");
}
function crashOkPending(): Pending {
  const yes = (c: Ctx) => { if (once(c, "crashOk")) crashFixed(c, "tyler"); };
  return {
    id: "crash_ok", expects: ["plan", "agree_ctx"], hints: ["crash"],
    suggest: [{ lt: "Sutikti arba pasiūlyti savo planą", hint: "crash" }],
    yes,
    no: (c) => { if (once(c, "crashOk")) { T(c, "crash_what"); c.hold(); } },
    on: {
      plan: (c, _s, seg) => { if (!once(c, "plan")) return; praiseIdiom(c, seg); crashFixed(c, PLAN_TAGS.find((x) => seg.tags.includes(x)) ?? "fix"); },
      g_ok: yes, agree_ctx: yes,
    },
    ask: (c) => { T(c, "crash_ok_reask"); },
  };
}

/** "Who should I ask about the budget?" (item 5): the first question gets "Let's take that offline". */
function askOwner(c: Ctx, area: string | undefined, kind: string | undefined) {
  c.s.ownerAsked = true;
  if (!once(c, "owner")) return;
  const key = kind ?? area ?? "general";
  if (!c.s.evaded) { c.s.evaded = true; c.s.lastArea = key; T(c, "owner_evasive"); return; }
  ownerAnswer(c, key);
}
const OWNER_LINE: Record<string, string> = {
  deadline: "owner_slides", slides: "owner_slides_you", budget: "owner_budget", payroll: "owner_payroll", party: "owner_party",
  photo: "owner_newsletter", code: "owner_code", bugs: "owner_code", emails: "owner_emails", general: "owner_general",
};
function ownerAnswer(c: Ctx, key: string) { c.s.answered = true; T(c, OWNER_LINE[key] ?? "owner_general"); }
function ownerEnd(c: Ctx) { if (c.s.ownerDone || !once(c, "ownerEnd")) return; c.s.ownerDone = true; }

/** The midnight request settled. `h`: the hour the learner stays until. */
function midResolve(c: Ctx, how: "limit" | "yes" | "cant" | "paid", h?: string) {
  if (c.s.midDone || !once(c, "mid")) return;
  c.s.midDone = true; c.s.midHow = how;
  if (how === "limit") { if (h) { c.s.stayUntil = h; T(c, "mid_limit", { X: h }); } else T(c, "mid_limit_generic"); return; }
  T(c, how === "yes" ? "mid_yes" : how === "cant" ? "mid_cant" : "mid_deal_yes");
}
function midDealPending(): Pending {
  return {
    id: "mid_deal", expects: ["stay_limit", "cant_stay", "stay_yes", "agree_ctx"], hints: ["midnight"],
    suggest: [{ lt: "Sutikti arba pasiūlyti savo laiką", hint: "midnight", options: ["h6", "h7", "h8"] }],
    yes: (c) => { midResolve(c, "paid"); },
    no: (c) => { if (once(c, "midNo")) { T(c, "mid_when"); c.hold(); } },
    on: {
      stay_limit: (c, s) => { const h = hourId(s.time); if (h === "midnight") midResolve(c, "paid"); else midResolve(c, "limit", h); },
      cant_stay: (c) => { midResolve(c, "cant"); },
      stay_yes: (c) => { midResolve(c, "paid"); },
      call_day: (c) => { midResolve(c, "cant"); },
      g_ok: (c) => { midResolve(c, "paid"); },
      agree_ctx: (c) => { midResolve(c, "paid"); },
    },
    ask: (c) => { T(c, "mid_deal_reask"); },
  };
}

/** Tomorrow's meeting (item 4). */
function meetOk(c: Ctx) {
  if (!closingLive(c) || !once(c, "meet")) return;
  c.s.closeDone = true; c.s.closeHow = "ok"; c.s.meet = "h8";
  T(c, "meet_ok");
}
function meetTime(c: Ctx, tm: any) {
  if (!tm) return;
  if (midLive(c)) { const h = hourId(tm); if (h === "midnight") midResolve(c, "yes"); else midResolve(c, "limit", h); return; }
  if (!closingLive(c) || !once(c, "meet")) return;
  const h = hourId(tm);
  if (h === "h8") { c.s.closeDone = true; c.s.closeHow = "ok"; c.s.meet = "h8"; T(c, "meet_ok"); return; }
  // six in the morning, midnight: "Let's keep it human. How about ten?"
  if (h && !MEET_OK.has(h)) { offer(c, "h10", "meet_silly"); return; }
  c.s.closeDone = true; c.s.closeHow = "moved"; c.s.meet = h ?? "other";
  if (h) T(c, "meet_move", { X: h }); else T(c, "meet_move_generic");
}
/** Tyler suggests a time ("How about noon?"). */
function offer(c: Ctx, h: string, line: string) {
  c.s.offer = h;
  T(c, line);
  const accept = (cc: Ctx) => { if (cc.s.closeDone || !once(cc, "offerAns")) return; cc.s.closeDone = true; cc.s.closeHow = "moved"; cc.s.meet = cc.s.offer; T(cc, "offer_ok", { X: cc.s.offer }); };
  // "Sure, noon works." (the hour he offered) is a yes
  const time = (cc: Ctx, tm: any) => { if (hourId(tm) === cc.s.offer) accept(cc); else meetAgain(cc, tm); };
  c.expect({
    id: "offer", expects: ["meet_time", "meet_time_ctx", "agree_ctx"], hints: ["closing"],
    suggest: [{ lt: "Sutikti arba pasiūlyti kitą laiką", hint: "closing", options: ["h9", "h10", "noon", "h1"] }],
    yes: accept,
    no: (cc) => { if (!once(cc, "offerAns")) return; T(cc, "when_q"); cc.expect(whenPending()); },
    on: { meet_time: (cc, s) => { time(cc, s.time); }, meet_time_ctx: (cc, s) => { time(cc, s.time); }, g_ok: accept, agree_ctx: accept },
    ask: (cc) => { T(cc, "offer_reask", { X: cc.s.offer }); },
  });
}
function whenPending(): Pending {
  return {
    id: "when", expects: ["meet_time", "meet_time_ctx"], hints: ["closing"],
    suggest: [{ lt: "Pasiūlyti laiką", hint: "closing", options: ["h9", "h10", "noon", "h1"] }],
    on: {
      meet_time: (c, s) => { meetAgain(c, s.time); },
      meet_time_ctx: (c, s) => { meetAgain(c, s.time); },
      g_dontknow: (c) => { if (once(c, "whenHelp")) offer(c, "noon", "when_noon"); },
      call_day: (c) => { callDay(c); },
    },
    ask: (c) => { T(c, "when_reask"); },
  };
}
/** A time given to "When works for you?" (the step's own "meet" turn-guard is already used). */
function meetAgain(c: Ctx, tm: any) {
  SAID.get(c)?.delete("meet");
  meetTime(c, tm);
}

/** "Let's call it a day!": at the midnight request a no, at the closing an end of the day; once the work is
 *  settled it ends the day early (item 4); before that, "Not yet. Nice try, though." */
function callDay(c: Ctx) {
  if (midLive(c)) { midResolve(c, "cant"); return; }
  if (closingLive(c)) { if (!once(c, "meet")) return; c.s.closeDone = true; c.s.closeHow = "day"; c.s.meet = "h8"; T(c, "call_day_react"); return; }
  if (c.s.overloaded && c.s.prioDone && !c.s.closeDone) {
    if (!once(c, "meet")) return;
    c.s.ownerDone = true; c.s.midDone = true; if (!crashResolved(c)) c.s.crashSkip = true;
    c.s.closeDone = true; c.s.closeHow = "day"; c.s.meet = "h8";
    T(c, "call_day_react");
    return;
  }
  if (!c.s.closeDone && once(c, "notYet")) T(c, "not_yet");
}

/** Tyler closes the day (success: the course report is done) and waits for the learner's goodbye. */
function closing(c: Ctx) {
  if (coreDone(c)) {
    if (c.s.closeHow !== "day") T(c, "close_good");
    c.s.goalMet = true;
    c.complete();
    const seen: string[] = Array.isArray(c.memory.sproutlyTwists) ? c.memory.sproutlyTwists : [];
    c.remember({ sproutlyTwists: c.s.twist && !seen.includes(c.s.twist) ? [...seen, c.s.twist] : seen });
  } else T(c, "close_partial");
  const close = (cc: Ctx) => { closeReply(cc); };
  const on: Record<string, (cc: Ctx, slots: any, seg: Segment) => boolean | void> = {};
  for (const k of [...Object.keys(startup.intents).filter((x) => !x.endsWith("_ctx") && !x.startsWith("idiom")), "g_thanks", "g_bye", "g_ok", "g_hello", "g_sorry"]) on[k] = close;
  c.expect({ id: "closing", expects: ["meet_ok", "call_day"], hints: ["g_social"], suggest: [{ lt: "Atsisveikinti", hint: "g_social" }], on, yes: close, no: close });
}

/** Tyler's last word; the conversation ends. */
function closeReply(c: Ctx) {
  if (!once(c, "close")) return;
  T(c, "bye_tyler");
  c.end();
}

// A step's question after an "I don't know" that nothing else answered: its help instead.
for (const st of startup.steps) {
  const ask = st.ask;
  st.ask = (c) => {
    if (st.help && DONT_KNOW.get(c) === st.id) { DONT_KNOW.delete(c); st.help(c); return; }
    ask(c);
  };
}

export default startup;
