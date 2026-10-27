// Advanced song P28 "Taste It Again" (B2–C1), second part: a performance review at Brightline.
// Emily's small glass office. Six weeks ago Emily was the design team's most experienced designer and the
// learner's teammate; now she is their manager, warm and a little nervous in her first round of reviews (the
// story ADV-028 "The Box Marked Potential"). A plant falls off the windowsill as she starts. Small talk ("How
// are you feeling about today?"), the format (your self-assessment, then hers, then goals), then:
//   - your year: "What are you most proud of this year?" (chips: the scheduling tool guide, the client project
//     rescued on time, helping the new intern, the app launch, the customer survey), sometimes "What made it
//     work?", and her praise the song's way ("What worked really well was…"), which the learner accepts;
//   - her feedback: "Can I give you some feedback?" → "One thing you could try is speaking up earlier in client
//     meetings." The learner accepts ("Thanks, that's really helpful. I'll work on that."), asks for an example,
//     or explains politely that she presented their sections because the client was late ("Fair enough. That's
//     on me.") and then proposes how to protect their speaking time (sections on the agenda). A rude push-back
//     ("That's not true") still works, with a tip;
//   - goals for next year (chips: client presentations, a small project, a UX writing / data / leadership
//     course, mentoring); asking for support counts ("Is there a training budget?" → "$1,500 per person");
//   - "Is there anything you want to ask me?": the raise or promotion question ("Salary decisions happen next
//     month"), what counts (the "exceeds expectations" question), and her honest "I don't know yet. Let me find
//     out. I'll get back to you by Friday.";
//   - the summary, "Anything else?", and "Let's check in again in a month."
// Twists (one per visit at most, an unseen one preferred on replays): Emily asks the learner for feedback on her
// as a manager (what works, then one thing she could try: "I hadn't thought of it that way."), or her screen shows
// Ben's ratings by mistake (point it out tactfully; reading them aloud gets a tip about discretion).
//
// Address: Emily is `informal` (tu both ways), so her lines, the hints and the global lines all use tu. Emily's
// own forms are feminine and written out ("susijaudinusi", "skolinga"); {m:…|f:…} is the player.
//
// Course report: done (c.complete) when items 2, 3, 4 and 5 of the mission are ticked; items 1 and 6 are
// optional and leave the list once their moment has passed (or when the task is complete).
//
// ART: no pictures yet (docs/SCENE-ART.md). One set-up: Emily's small glass office at Brightline, the harbor
// through the window, a laptop with a spreadsheet (lines only, no text), a printed agenda and a pen, a potted
// plant. Emily as in npcs.ts (tan skin, brown hair in a bun, mustard-yellow top, lanyard, earrings).
//   1. "greet"    (start; feeling): Emily half out of her chair, catching a falling plant pot; soil spilled across
//                 the table; an embarrassed laugh.
//   2. "praise"   (proud, made, praise): Emily seated, smiling warmly, a hand on the printed review form.
//   3. "feedback" (consent, feedback, protect): Emily leaning in, kind but serious, hands folded, pen on the agenda.
//   4. "goals"    (goals, support, ask_me, criteria): Emily writing on the printed agenda, the laptop open.
//   5. "twist"    (tab; rev_open, rev_worked, rev_try): the laptop turned toward the player, a spreadsheet tab
//                 highlighted (lines only); Emily open-handed and a little unsure (for the role reversal she
//                 asks; for the wrong tab she hasn't noticed yet).
//   6. "done"     (anything_else, checkin; closing): Emily standing, smiling, holding the agenda; the plant
//                 back in its pot on a shelf behind her.
//
// NEEDS: (1) the game ignores the events "plant" ({ fall: true }: the pot falls at the start; a thud/sfx would
// help) and "screen" ({ tab: "ben" | "mine" }: what the laptop shows in the wrong-tab twist).

import type { Ctx, EntityDef, Segment, SituationDef, Tip } from "../types";
import { ent, t } from "../dsl";

// ---------------------------------------------------------------------------
// Flags used more than once

const F_WH_DO = "Question “do” has no Lithuanian word; the tense sits on the verb.";
const F_COULD_Q = "Question “Could” = ar + the conditional of galėti.";
const F_KAD = "Zero “that”: Lithuanian needs kad.";
const F_CLEFT = "“was” in this cleft sentence = tai.";
const F_IS_TAI = "“is” here introduces what follows: tai.";
const F_KURI = "Zero relative: English leaves out “that”; Lithuanian needs kurį.";
const F_FEEDBACK = "“some feedback” = kelios pastabos: Lithuanian counts what English does not.";
const F_GIVE_FB = "“give (feedback)” = pasakyti (pastabų).";
const F_SIDE = "“on”: the locative šioje pusėje carries it.";
const F_LETS = "“Let's”: the first-person plural imperative of the next verb carries it.";
const F_PROUD = "“'m” + proud = the verb didžiuotis (under “proud”): no copula.";
const F_OF_INS = "“of”: the instrumental case carries it.";
const F_DAT_MAN = "“I” = man: patikti takes the dative.";
const F_FOR_KAD = "“for + -ing” = kad + a finite verb.";
const F_PER = "“per”: the dative žmogui carries it.";
const F_PER_YEAR = "“per year” = per metus (under “year”).";
const F_WOULD = "“would”: the conditional of the verb carries it.";
const F_IM_NOT = "The copula of “I'm” takes the negation in Lithuanian: nesu stands under “not”.";

// ---------------------------------------------------------------------------
// Entities
// win: what the learner is proud of (attrs.act: the -ing verb the hints need: "helping the new intern").

const WINS: EntityDef[] = [
  ent("guide", "scheduling | tool | guide", "planavimo | įrankio | instrukcija/instrukcijos/instrukcijai/instrukciją/instrukcija/instrukcijoje", "f", {
    chip: "planavimo įrankio instrukcija",
    forms: ["guide", "the guide", "scheduling guide", "tool guide", "user guide", "the scheduling tool", "scheduling tool documentation", "the documentation", "documentation",
      "documenting the scheduling tool", "how to guide", "the how to guide", "the manual", "scheduling tool manual", "guide for the scheduling tool", "the guide for the scheduling tool", "guide for scheduling tool"],
  }),
  ent("rescue", "client | project", "kliento | projektas/projekto/projektui/projektą/projektu/projekte", "m", {
    chip: "išgelbėtas kliento projektas", attrs: { act: "rescue" },
    forms: ["the client project", "delayed project", "the delayed project", "the late project", "delayed client project", "the delayed client project", "rescue", "the rescue",
      "the project rescue", "the pinewood project", "pinewood project", "client project on time"],
  }),
  ent("intern", "new | intern", "naujas/naujo/naujam/naują/nauju/naujame | praktikantas/praktikanto/praktikantui/praktikantą/praktikantu/praktikante", "m", {
    chip: "pagalba naujam praktikantui", attrs: { act: "help" },
    forms: ["intern", "the intern", "our intern", "our new intern", "the new guy", "noah", "the new designer", "new interns", "the new interns"],
  }),
  ent("launch", "app | launch", "programėlės | paleidimas/paleidimo/paleidimui/paleidimą/paleidimu/paleidime", "m", {
    chip: "programėlės paleidimas",
    forms: ["launch", "the launch", "app launch", "the app launch", "launching the app", "the new app", "the app", "app release", "the app release", "the release"],
  }),
  ent("survey", "customer | survey", "klientų | apklausa/apklausos/apklausai/apklausą/apklausa/apklausoje", "f", {
    chip: "klientų apklausa",
    forms: ["survey", "the survey", "the customer survey", "customer research", "user survey", "the user survey", "the questionnaire", "user research"],
  }),
];

// goal: what to work on next year (attrs.kind: skill / lead / course / mentor).
const GOALS: EntityDef[] = [
  ent("presenting", "client | presentations", "klientų | pristatymai/pristatymų/pristatymams/pristatymus/pristatymais/pristatymuose", "m", {
    art: "", chip: "pristatymai klientams", attrs: { kind: "skill", ltPl: true },
    forms: ["presenting", "presenting to clients", "presentations", "presentation skills", "my presentation skills", "public speaking", "speaking up", "speaking up in meetings",
      "speaking in meetings", "speaking in client meetings", "presenting in client meetings", "client presentation", "presenting to the client"],
  }),
  ent("leading", "small | project", "mažas/mažo/mažam/mažą/mažu/mažame | projektas/projekto/projektui/projektą/projektu/projekte", "m", {
    chip: "vadovauti mažam projektui", attrs: { kind: "lead" },
    forms: ["leading a small project", "a small project", "leading a project", "my own project", "my own small project", "project lead", "leading projects", "running a project",
      "running a small project", "project management"],
  }),
  ent("ux_writing", "UX | writing", "UX | rašymas/rašymo/rašymui/rašymą/rašymu/rašyme", "m", {
    art: "", chip: "UX rašymas", attrs: { kind: "course" },
    forms: ["ux writing", "u x writing", "ux copywriting", "copywriting", "ux copy", "microcopy", "writing for ux"],
  }),
  ent("data", "data | analysis", "duomenų | analizė/analizės/analizei/analizę/analize/analizėje", "f", {
    art: "", chip: "duomenų analizė", attrs: { kind: "course" },
    forms: ["data", "data analytics", "analytics", "data skills", "working with data", "statistics", "data science"],
  }),
  ent("leadership", "leadership", "lyderystė/lyderystės/lyderystei/lyderystę/lyderyste/lyderystėje", "f", {
    art: "", chip: "lyderystė", attrs: { kind: "course" },
    forms: ["leadership skills", "leadership training", "management", "management skills", "people management", "managing people", "leading people", "leading a team"],
  }),
  ent("mentoring", "mentoring", "mentorystė/mentorystės/mentorystei/mentorystę/mentoryste/mentorystėje", "f", {
    art: "", chip: "mentorystė", attrs: { kind: "mentor" },
    forms: ["mentorship", "mentoring the interns", "mentoring the new interns", "mentoring new people", "mentoring juniors", "mentoring junior designers", "being a mentor",
      "coaching", "helping new people", "helping the interns"],
  }),
];

// Role reversal: what works in Emily's managing (mgood) and one thing she could try (mtip).
const MGOOD: EntityDef[] = [
  ent("open_door", "open | door", "atviros/atvirų/atviroms/atviras/atviromis/atvirose | durys/durų/durims/duris/durimis/duryse", "f", {
    chip: "atviros durys", attrs: { ltPl: true },
    forms: ["open door policy", "open door", "being available", "availability", "always being available"],
  }),
  ent("honesty", "honesty", "atvirumas/atvirumo/atvirumui/atvirumą/atvirumu/atvirume", "m", {
    art: "", chip: "atvirumas", forms: ["being honest", "honest feedback", "directness", "being direct", "transparency", "openness"],
  }),
  ent("calm", "calm", "ramybė/ramybės/ramybei/ramybę/ramybe/ramybėje", "f", {
    art: "", chip: "ramybė", forms: ["calmness", "staying calm", "being calm", "patience"],
  }),
  ent("support", "support", "palaikymas/palaikymo/palaikymui/palaikymą/palaikymu/palaikyme", "m", {
    art: "", chip: "palaikymas", forms: ["supporting the team", "supporting us", "backing us up", "protecting the team", "having our backs"],
  }),
  ent("listening", "listening | skills", "klausymosi | įgūdžiai/įgūdžių/įgūdžiams/įgūdžius/įgūdžiais/įgūdžiuose", "m", {
    chip: "mokėjimas išklausyti", attrs: { ltPl: true, enPl: true },
    forms: ["listening", "how you listen", "the way you listen", "listening to us", "listening to people"],
  }),
];

const MTIPS: EntityDef[] = [
  ent("priorities", "clearer | priorities", "aiškesni/aiškesnių/aiškesniems/aiškesnius/aiškesniais/aiškesniuose | prioritetai/prioritetų/prioritetams/prioritetus/prioritetais/prioritetuose", "m", {
    art: "", chip: "aiškesni prioritetai", attrs: { ltPl: true, enPl: true },
    forms: ["clear priorities", "priorities", "setting priorities", "clearer goals", "clear goals", "clearer direction", "clear direction"],
  }),
  ent("one_on_ones", "regular | one-on-ones", "reguliarūs/reguliarių/reguliariems/reguliarius/reguliariais/reguliariuose | pokalbiai akis į akį/pokalbių akis į akį/pokalbiams akis į akį/pokalbius akis į akį/pokalbiais akis į akį/pokalbiuose akis į akį", "m", {
    art: "", chip: "reguliarūs pokalbiai akis į akį", attrs: { ltPl: true, enPl: true },
    forms: ["one on ones", "one on one meetings", "regular one on one meetings", "weekly one on ones", "regular check ins", "check ins", "weekly check ins",
      "one on one", "regular one on one"],
  }),
  ent("late_email", "fewer | late-night | emails", "mažiau | vėlyvų | laiškų", "m", {
    art: "", chip: "mažiau vėlyvų laiškų", attrs: { enPl: true, fixed: true },
    forms: ["less late night email", "less late night emails", "fewer emails at night", "no late night emails", "no emails at night", "less email at night",
      "fewer late emails", "no emails after work", "fewer late night messages", "less emails at night"],
  }),
  ent("shorter_meetings", "shorter | meetings", "trumpesni/trumpesnių/trumpesniems/trumpesnius/trumpesniais/trumpesniuose | susitikimai/susitikimų/susitikimams/susitikimus/susitikimais/susitikimuose", "m", {
    art: "", chip: "trumpesni susitikimai", attrs: { ltPl: true, enPl: true },
    forms: ["fewer meetings", "less meetings", "short meetings", "shorter meetings"],
  }),
  ent("more_feedback", "more | feedback", "daugiau | grįžtamojo ryšio", "m", {
    art: "", chip: "daugiau grįžtamojo ryšio", attrs: { fixed: true },
    forms: ["regular feedback", "more regular feedback", "feedback more often", "more feedback"],
  }),
];

const look = (list: EntityDef[], id?: string) => list.find((e) => e.id === id);

// ---------------------------------------------------------------------------
// Per-turn helpers

// One reaction per learner turn ("Thanks, that's really helpful. I'll work on that." is two pieces but one
// answer). The dialogue creates a fresh context object for every learner turn.
const SAID = new WeakMap<Ctx, Set<string>>();
function once(c: Ctx, key: string): boolean {
  let set = SAID.get(c);
  if (!set) { set = new Set(); SAID.set(c, set); }
  if (set.has(key)) return false;
  set.add(key);
  return true;
}
// Answers settled at the end of the turn (the step's question): a blunt "That's not true" waits, so the reason
// said after it in the same breath ("…you presented my sections") wins; an "I don't know" waits for an answer
// in the same breath ("I'm not sure. Maybe a data course?").
const RUDE = new WeakSet<Ctx>();
const HOWSO = new WeakSet<Ctx>();
const DONT_KNOW = new WeakMap<Ctx, string>();

const asks = (c: Ctx, id: string): number => c.s.asks?.[id] ?? 0;
function bump(c: Ctx, id: string): number { c.s.asks ||= {}; c.s.asks[id] = asks(c, id) + 1; return c.s.asks[id]; }

/** "Good point, but …": an acknowledgement before a contrast is no answer of its own. */
const contrast = (c: Ctx) => /\bbut\b/i.test(c.heard);
/** "…and you?" / "How about you?" — but not the "you" in "thank you". */
const askedBack = (c: Ctx) => /\b(you|yourself)\b/i.test((c.heard || "").replace(/\bthank(s)?\s+you\b(\s+(very|so)\s+much)?/gi, " "));

const praiseOpen = (c: Ctx) => asks(c, "praise") >= 1 && !c.s.praiseDone;
const fbOpen = (c: Ctx) => !!c.s.fbGiven && !c.s.fbDone;
const protectOk = (c: Ctx) => !c.s.pushed || !!c.s.protectDone;
const tabOk = (c: Ctx) => c.s.twist !== "tab" || !!c.s.tabDone;
const supportOk = (c: Ctx) => !c.s.supportQ || !c.s.goal || !!c.s.supportDone;
const revOk = (c: Ctx) => c.s.twist !== "reverse" || !!c.s.revDone;
/** Items 2, 3 and 4: what the course report needs before the closing (item 5). */
const coreDone = (c: Ctx) => !!c.s.praiseOk && !!c.s.fbOk && !!c.s.goal;

/** Sims: the plain review (no twist, no "What made it work?", no "What would help you?"). */
const PLAIN = (s: Record<string, any>) => { s.twist = null; s.follow = false; s.supportQ = false; s.back = false; };
const AUTO: Record<string, string> = {
  made: "We planned everything early.", support: "Some regular feedback would help.", protect: "Could we put my sections on the agenda?",
  anything_else: "No, that's all. Thanks, that's really helpful.", checkin: "Sounds good.",
  rev_open: "Sure, I'd be happy to.", rev_worked: "What worked really well was your open door.", rev_try: "One thing you could try is clearer priorities.",
  tab: "I think that's someone else's review on the screen.", criteria: "What would I need to do to get a promotion?",
};

// ---------------------------------------------------------------------------

export const review: SituationDef = {
  id: "p28b-review",
  song: "P28",
  songTitle: "Taste It Again",
  title: { en: "What Worked Really Well", lt: "Kas tikrai pavyko" },
  topic: { en: "A performance review", lt: "Metinis veiklos pokalbis" },
  chapter: 8,
  order: 5,
  location: "office",
  npc: "emily",
  goal: "Aptark su nauja vadove savo metus: priimk pagyrimą ir pastabas, paprašyk pavyzdžio, susitark dėl tikslų ir paklausk apie atlyginimą.",
  intro: "„Brightline“ biuras, mažas stiklinis Emilės kabinetas. Dar prieš šešias savaites Emilė dirbo dizainere šalia tavęs, o dabar ji – tavo vadovė ir veda pirmuosius metinius pokalbius. Ji šilta, bet akivaizdžiai jaudinasi. Ant stalo – nešiojamasis kompiuteris, išspausdinta darbotvarkė ir vazonas su augalu, kuris stovi kiek per arti krašto.",
  entities: { win: WINS, goal: GOALS, mgood: MGOOD, mtip: MTIPS },

  grammar: {
    macros: {
      fb: [
        "feedback", "(some | any)? feedbacks #tip:feedbacks", "a feedback #tip:feedbacks",
        "(comments | notes | thoughts | opinion | honest opinion | advice | input)",
      ],
      sections: "(sections | section | part | parts | slides | slide | bit | topics | topic | piece | presentation)",
      late_why: "because (the client was (late | running late | in a hurry) | we were (late | short on time | running late) | there was no time | we ran out of time | the meeting was short)",
      agenda: "(the agenda | agenda | the meeting agenda | the plan)",
      pay: "(salary | my salary | pay | my pay | compensation | my compensation | money | wages)",
      raise: "(a raise | a pay raise | raise | a salary increase | an increase | a pay increase | a bonus | a pay rise #tip:uk_payrise | pay rise #tip:uk_payrise)",
      promo: "(a promotion | promotion | promoted | a senior role | a senior position | the next level)",
      rev: "(review | performance review | evaluation | assessment | appraisal #tip:uk_appraisal | rating | ratings)",
      late_night: "(at night | late at night | after (work | hours | six | seven | eight | nine | ten | midnight) | on (the)? weekends | at midnight)",
    },
  },

  intents: {
    // --- the plant --------------------------------------------------------------------------------
    plant_help: { patterns: [
      "(are you | you) (okay | ok | all right | alright) #h:are_you_ok",
      "is (everything | the plant) (okay | all right | alive)",
      "@can_i help [you] [with (that | it | the plant | the dirt)] #h:can_i_help",
      "let me help [you] [with (that | it | the plant)]",
      "(do you need | do you want | need) (help | a hand | some help) [with (that | it)]",
      "(do you want | should i | shall i | can i | let me) (get | grab | bring) (a vacuum | a broom | some paper towels | a paper towel | a cloth | some napkins | a napkin)",
      "i can (get | grab) (a vacuum | a broom | some paper towels | a cloth)",
      "(poor | the poor) plant",
      "do not worry about (it | that | the plant | the dirt | the soil) #h:dont_worry_plant",
      "(no need to | do not) (apologize | be sorry)",
      "it is (just | only) (dirt | soil | a plant | a little dirt)",
      "(that | it | this) happens [to everyone]",
      "(nice | good) catch",
      "(oh my god | oh my gosh | oh no | oops | whoa | wow) [(is everything | are you) (okay | all right)]",
      "[oh | oh no] (the | your) plant",
      "(let me | i can | can i | should i) clean (it | that | this) [up]",
    ] },

    // --- how are you feeling --------------------------------------------------------------------------
    feel_nervous: { patterns: [
      "[honestly | to be honest] [i am | i feel] [a little | a bit | kind of | so | really | very | a little bit | quite | pretty | super] (nervous | anxious | worried | stressed | scared | tense) [about (it | this | today | the review | this meeting)] [to be honest | honestly] [but (it is | i am) (okay | fine)] #h:bit_nervous",
      "i have (butterflies | some butterflies) [in my stomach]",
      "i did not sleep (well | much | very well) [last night]",
      "[i am] [a little | a bit] (nervous | worried) but [also] (curious | excited | fine | okay | ready) #mix",
      "(not great | not so great) [i am] [a bit | a little] nervous",
    ] },
    feel_fine: { patterns: [
      "[i am] [feeling] [pretty | really | quite | very] (fine | good | okay | ok | great | all right | calm | relaxed | ready | positive | confident | optimistic) [thanks | thank you] [i think] #h:fine",
      "i am (looking forward to (it | this | today) | ready for (this | it) | excited [about (it | this)]) #h:looking_forward",
      "i feel (good | fine | ready | okay | positive | confident | calm | relaxed) [about (it | this | today)]",
      "i am not (nervous | worried | stressed | scared) [at all]",
      "(pretty good | all good | not too bad) [thanks]",
    ] },
    feel_curious: { patterns: [
      "[i am] [a little | a bit | very | really | quite | pretty | kind of | just] (curious | interested) [actually | to be honest | honestly] #h:curious",
      "[i am] [a little | a bit | very | really | quite] (curious | interested) to (hear | see | know) [what you think | what you will say | your feedback | how it goes | your opinion]",
      "[i am] curious about (it | your feedback | what you think | the review)",
      "[i am] [a little | a bit] (curious | interested) but [also] [a little | a bit] nervous #mix",
    ] },

    // --- your year --------------------------------------------------------------------------------------
    proud_win: { patterns: [
      "i am [most | really | very | so | quite | particularly | especially | pretty] proud of [the | my | our] {win} [and [also] [the | my | our] {win2:win}] #h:most_proud",
      "i am [most | really | very | so | quite | particularly | especially | pretty] proud of (helping | mentoring | training | rescuing | saving | writing | making | creating | running | leading | finishing | doing | launching) [the | my | our] {win} [and [also] [the | my | our] {win2:win}] #h:most_proud",
      "(probably | definitely | maybe | i would say | for sure) [the | my | our] {win} [and [also] [the | my | our] {win2:win}] #h:probably",
      "(probably | definitely | maybe | i would say) (helping | rescuing | mentoring | saving | writing) [the | my | our] {win} #h:probably",
      "what i am [most] proud of is [the | my | our] {win}",
      "i am [most | really | very | so] proud (about | that) (i | we) (rescued | saved | delivered | finished | launched | wrote | made | did | helped | trained) [the | my | our] {win} [on time]",
      "i am [most | really | very | so] proud about [the | my | our] {win}",
      "[i think] the most important (thing)? (was | is) [the | my | our] {win}",
      "[for me] [the | my | our] {win} (was | is) the best [thing | part] [for me]",
      "what i am [most] proud of is (helping | rescuing | mentoring | saving | writing) [the | my | our] {win}",
      "(the | my | our) {win} (went | was | worked) [really | very | quite | so | super] (well | great | good) #h:went_well",
      "i think (i | we) did a (good | great | really good) job (on | with) [the] {win}",
      "[the | my | our] {win} (was | is) (my | the) (biggest | best | proudest) (thing | success | achievement | win | moment) [this year]",
      "my (biggest | best | proudest) (achievement | win | success | moment | thing) [this year] (was | is) [the | my | our] {win} [and [also] [the | my | our] {win2:win}]",
      "(i | we) (rescued | saved | delivered | launched | wrote | made | created | ran | helped | trained | mentored | finished) [the | our | my] {win} [on time]",
      "(the | my) {win} and [the | my] {win2:win}",
    ] },
    // "The app launch." (only while she asks what you are proud of)
    win_ctx: { patterns: ["[the | my | our] {win} [i think | probably | for sure | definitely | maybe]", "(helping | rescuing | mentoring | saving) [the | our] {win}"] },
    proud_none: { patterns: [
      "(nothing | not much | nothing special | nothing really | nothing big) [i think | this year | really]",
      "i (did not | do not think i) (do | did) anything special [this year]",
      "i am not [really | very | that] proud of anything",
      "i do not know what (i am proud of | to say)",
    ] },
    made_why: { patterns: [
      "(i | we) (planned | prepared) [everything | it | the work] [really | very] (carefully | well | early | in advance | ahead) #h:planned_early",
      "(i | we) (planned | prepared) everything [early | carefully | in advance]",
      "(good | careful | clear | early | lots of | a lot of) (planning | communication | preparation | testing | organization | questions) [with (the client | the team | everyone | support | the users)]",
      "(i | we) (listened | talked) to (the users | the customers | the client | people | the support team | the team | him | everyone | support) [a lot | first | early | every (day | week)] #h:listened_users",
      "i asked (a lot of | lots of | many | the right) questions [early] #h:asked_questions",
      "(i | we) tested (it | everything) [a lot | early | carefully | with real users]",
      "(i | we) kept (everyone | the client | the team) (informed | calm | in the loop | updated)",
      "i (stayed | was) (calm | organized | focused | patient) [with him]",
      "(i | we) (communicated | talked) (a lot | well | clearly | every day | openly)",
      "i wrote (it | everything) (down | step by step | in simple words)",
      "(i | we) (made | kept) (it | everything) simple",
      "(i | we) (worked | tried) [really | very] hard",
      "(hard work | patience | a lot of coffee | lots of coffee | good people)",
      "i (explained | showed him) everything step by step",
      "i (helped | showed | taught) him (a lot | everything | step by step)",
    ] },
    // "Planning." (only while she asks what made it work)
    made_ctx: { patterns: ["[good | careful | clear] (planning | communication | preparation | testing | organization | teamwork | listening | patience | focus)"] },
    made_any_ctx: { patterns: [
      "(because | mostly | basically | i guess) {w:any}",
      "[because | mostly | basically] (i | we) [just] (worked | planned | talked | listened | stayed | kept | asked | tested | spent | focused | wrote | built | spoke | used | made) {w:any}",
    ] },
    team_effort: { patterns: [
      "[thanks | thank you] [but] (it was | that was) (a team effort | teamwork | all teamwork | a team thing) #h:team_effort",
      "[thanks | thank you] [but] (it was | that was) [really] the [whole] team",
      "[but] (the | my | our) [whole] team (did | helped | made it work | did it | did most of it | did a lot)",
      "[but] i had (a lot of | lots of | great | so much) help",
      "[but] i (could not | could never) have done it without (the team | my team | everyone | them | support | the support team)",
      "we (worked | did it) [well] (together | as a team) [as a team]",
      "(teamwork | team work | the whole team)",
      "(it was | that was) (all of us | everyone)",
    ] },
    thanks_praise: { patterns: [
      "(thank you | thanks) [so much | a lot | very much] [that | it] (means a lot | means so much | really means a lot) [to me] #h:means_lot",
      "(that | it) [really] means (a lot | so much) [to me]",
      "(thanks | thank you) [so much] i [really] appreciate (that | it) #h:appreciate_that",
      "i [really | truly] appreciate (that | it | you saying that | the kind words)",
      "[thanks | thank you] i am (glad | happy | so glad | really glad) (it helped | it worked | you noticed | you think so | to hear that | you liked it | it was useful) #h:glad_helped",
      "(that is | it is) [so | really | very] (nice | good | great | kind) (to hear | of you [to say that])",
      "(thanks | thank you) for (saying that | noticing | the kind words | the compliment | the praise)",
      "[thanks] i am [really] proud of (it | that) [too]",
      "[thanks | thank you] i (worked | put) [really] hard on (it | that)",
      "[thanks | thank you] i put a lot of (work | time | effort) into (it | that)",
      "[thanks | thank you] i [really] enjoyed (it | that | that project | working on it)",
      "(that | it) was (fun | a lot of fun)",
      "you are too kind",
    ] },
    deflect: { patterns: [
      "(it was | that was) nothing [really | special]",
      "it was not (that | so) (big | special | good | hard | difficult)",
      "it was not (a big deal | anything special | much)",
      "(it was | that was) not a big deal",
      "(not really | no not really)",
      "i was [just | only] lucky",
      "(anyone | anybody | everyone) could (do | have done) (it | that)",
      "(it is | that is | it was) [just | only] my job",
      "i [just | only] did my job",
      "it was (just | only) (luck | a small thing | easy)",
      "i do not (think so | deserve it | think it was that good)",
      "(stop | stop it | come on)",
      "(it | that) was (easy | nothing special | no big deal)",
    ] },

    // --- the feedback ---------------------------------------------------------------------------------------
    want_feedback: { patterns: [
      "(sure | yes | yeah | of course | absolutely | definitely | okay) go ahead #h:sure_go_ahead",
      "go ahead",
      "(tell me | fire away | shoot | go for it | bring it on)",
      "[of course | sure | yes] i am (listening | all ears | ready) #h:listening",
      "[of course | sure | yes] be honest [with me] #h:be_honest",
      "i can take it #h:can_take",
      "[yes | sure] i would (love | appreciate | like) (some | your | that | it | some @fb | your @fb)",
      "(of course | sure | yes) you can",
      "(that is | it is) what (we are | i am) here for",
      "i (want | would like | would love) to hear it",
      "what is it",
    ] },
    no_feedback: { patterns: [
      "(not | maybe not) (now | today | right now)",
      "(maybe | perhaps) (later | another time | next time)",
      "do i have to",
      "(can | could) we skip (it | that | this) [part]",
      "i do not (want | need) [any] @fb [right now | today]",
      "i would rather not",
      "(let us | can we) (do | talk about) (it | that) later",
    ] },
    fb_thanks: { patterns: [
      "(thanks | thank you) [so much | a lot | very much] (that is | that was | it is | this is) [really | very | super | so | extremely] (helpful | useful) #h:thanks_helpful",
      "(that is | that was | it is | this is) [really | very | super | so] (helpful | useful)",
      "(thanks | thank you) for (the | your | this) (@fb | advice | tip | honesty | input) #h:thanks_for_fb",
      "(that is | it is) fair [enough] #h:thats_fair",
      "fair enough #h:fair_enough",
      "(fair | good | valid) point",
      "(that | it) makes [a lot of | total | perfect] sense",
      "i see what you mean #h:see_what_mean",
      "i (understand | get) (it | that | your point | what you mean)",
      "you are [absolutely | totally | completely] right #h:youre_right",
      "[i] [totally | completely] agree [with you]",
      "i appreciate (it | that | the @fb | your @fb | your honesty)",
      "(noted | understood) #ack",
      "(that is | it is) true",
      "you have a point",
      "i (know | noticed) [that] [too]",
      "i (am | was) [too | very | a bit | a little] quiet [in (those | the | client) meetings]",
      "i (do not | did not) (speak | talk | say) (much | enough | a lot) [in (meetings | those meetings | client meetings)] [you are right]",
    ] },
    fb_work: { patterns: [
      "i will work on (that | it | this) #h:work_on_that",
      "i will [try to] (speak up | speak | talk | say something) (earlier | more | first | more often) [next time | in (the next meeting | client meetings | meetings)] #h:speak_up_more",
      "(next time | from now on) i will [try to] (speak up | speak | talk | say something) [earlier | more | first]",
      "i am going to (work on | try | do) (that | it | this)",
      "i will (keep (that | it) in mind | remember (that | it))",
      "i will (do | try) my best",
      "i will give (it | that) a (try | go | shot)",
      "i (can | will) (do | try) (that | it)",
      "i will try",
    ] },
    ask_example_fb: { patterns: [
      "@could_you give me (an | one | some) (example | examples) #h:give_example",
      "give me [an | one | some] (example | examples)",
      "(for example | like when | such as)",
      "(which | what) (meetings | meeting | calls | call) [do you mean | are you talking about | was that | were they] #h:which_meetings",
      "when was (that | this)",
      "(what | which) (client | clients) [was that | do you mean]",
      "(can | could) you be more specific",
      "what do you mean [exactly | by that | by speaking up | by earlier]",
      "i (do not | did not) (see | understand | get) what you mean",
      "do you have (an | one | some) (example | examples)",
      "what (exactly)? (did i | should i) (do | say) [differently]",
      "how (do | can | could | should) i (do that | speak up | do it)",
    ] },
    pushback: { patterns: [
      "i see it (a bit | a little | slightly | somewhat)? differently [actually] #h:see_differently",
      "i (see | remember) it [a bit | a little] differently [actually]",
      "(that is | it is) not (quite | entirely | completely | exactly | really) (true | right | fair | accurate | how it was)",
      "(that is | it is) not the whole story",
      "can i (explain | add something | give some context | give you some context)",
      // doubt is no agreement: "I'm not sure I agree" → "How so?" (never "Thanks for taking it so well")
      "[i am] not (sure | so sure | convinced) [that] (i agree [with (that | you | this)] | (that is | it is | this is) (fair | true | right | accurate | correct) | you are right | i (can | will) (do | change | work on | try) (that | it | this) | it is that simple)",
      "i am not sure about (that | this)",
      "i do not agree [with (that | you | this)] (completely | entirely | one hundred percent)",
      "i (kind of | partly | partially | respectfully) disagree [with (that | you | this)]",
      "i do not (fully | completely | totally | quite) agree [with (that | you | this)]",
      "i do not (really)? (think | feel) (that is | it is) (fair | true | right | accurate)",
      "[but] (in those meetings | in both meetings | in the last two | both times | that time | in those calls | in both calls | actually | well | to be fair | remember) you presented my @sections [@late_why] #ctx #h:you_presented",
      "you (presented | did | took | covered | ran | gave) my @sections [in (those | both | the last two | the) (meetings | calls)] [@late_why] #ctx",
      "[that is because | it was because | because] the client was (late | running late | in a hurry | short on time) [remember] #ctx #h:client_late",
      "[that is because | because] (we | the meeting) (ran out of | did not have [any | enough]) time #ctx",
      "i (wanted to | was ready to | planned to | was going to) (speak | present | talk) but (you presented (my @sections | them) | there was no time | the client was late | we ran out of time) #ctx",
      "[to be fair] i (did not | never) (get | have) (the | a) chance [to (speak | present | talk)] #ctx #h:no_chance",
      "there was no time for (me | my @sections) #ctx",
      "my @sections (was | were | got) (cut | skipped | dropped | moved | cancelled) #ctx",
      "(you | we) (cut | skipped | dropped) my @sections #ctx",
      "i had my (slides | sections | part) ready [but you presented them] #ctx",
      "you presented (them | it) [@late_why] #ctx",
      "i (do not | did not) (speak | talk) (much | a lot) @late_why #ctx",
    ] },
    rude_push: { patterns: [
      "(that is | it is) not true",
      "(that is | it is) (wrong | not right | not fair | unfair | ridiculous | nonsense | a lie | not correct | false | crazy)",
      "you are (wrong | not right | mistaken)",
      "(not true | no way | nonsense | wrong)",
      "(it was | that was | it is) [all] your fault",
      "(it was not | that was not | it is not) my fault",
      "you do not know what you are talking about",
      "i do not agree [with (that | you)] [at all]",
      "i (disagree | totally disagree | completely disagree | strongly disagree) [with (that | you | this)]",
    ] },
    defensive_fb: { patterns: [
      "i (always | do) (speak | talk) [up] in (meetings | client meetings)",
      "i (do not | did not) need to (speak | talk) [in (meetings | those meetings)]",
      "(that is | it is) not my job [to (present | talk to clients)]",
      "i am a designer not a (salesperson | sales person | presenter)",
      "(the | my) (work | designs) (speak | speaks) for (itself | themselves)",
      "i (do not | did not) like (presenting | talking to clients | speaking in meetings)",
      "i (prefer | like) to (listen | stay quiet)",
      "why (do | should) i (speak | talk) [more]",
      "(clients | the client) (do not | did not) care about (designers | design | me | what i say)",
    ] },
    protect_idea: { patterns: [
      "(could | can) we (put | add | write | list) my (@sections | name) (in | on | into) @agenda #agenda #h:put_agenda",
      "(put | add | write) my (@sections | name) (in | on | into) @agenda #agenda",
      "(maybe | perhaps) (put | add) my (@sections | name) (in | on | into) @agenda #agenda",
      "[maybe | perhaps] we (can | could | should) (put | add | write) my (@sections | name) (in | on | into) @agenda #agenda",
      "(what if | how about) we (put | add | write) my (@sections | name) (in | on | into) @agenda #agenda",
      "(assign | plan | agree on) [the] @sections (in | before) (the agenda | the meeting | time) #agenda",
      "(we could | let us | could we) (agree | decide) [on] [before the meeting] who presents what [(before | in) (the meeting | the agenda | advance)] #agenda",
      "(could | can | may) i present my [own] @sections [myself] #h:present_own",
      "(could | can | may) i (go | present | speak) first [in the meeting | next time]",
      "(give me | could i have | can i have | could i get) the first (five | ten | fifteen) minutes",
      "(let us | could we | can we) keep my (time | slot | @sections) [even if the (schedule | meeting | agenda | plan) changes | even if the client is late] #h:keep_slot",
      "(maybe | perhaps) [a] (quick | short) (prep call | prep meeting | call | chat) before [the] (meeting | call | client meeting) #h:prep_call",
      "(could | can) we (meet | talk | have a quick call | prepare) before [the] (meeting | call | client meeting)",
      "(could | can) you (tell | warn | ask) me (before | first) [you change it | you present my @sections]",
      "[just] (ask | tell) me (first | before) [next time]",
      "(tell | warn | ask) me before you (change | move) (the plan | the agenda | it | my @sections)",
      "(can | could) we (practice | rehearse) [it] [together] [before (the meeting | client meetings | the next meeting)]",
      "(we | i) (should | could) (plan | prepare | practice) [it] (together | before | in advance)",
      "(maybe | perhaps) (practice | rehearse) [it] (together | before the meeting)",
    ] },

    // --- the wrong tab -----------------------------------------------------------------------------------------
    tab_point: { patterns: [
      "i think (that is | this is) (someone else's | somebody else's | ben's) @rev [on the screen] #h:someone_else",
      "(that is | this is) (someone else's | somebody else's | ben's | not my) @rev [on the screen]",
      "(that is | this is | it is | that one is | this one is) (someone else's | somebody else's) [@rev] [on the screen]",
      "(that is | this is | it is) not my @rev [on the screen]",
      "(that is | this is | it is) (someone else's | somebody else's | ben's) [one]",
      "i do not think (that is | this is | that one is | this one is) (mine | my @rev) #h:not_mine",
      "(that is | this is | that one is | this one is) not (mine | me)",
      "(i think)? you (have | opened | have got) the wrong (tab | file | @rev | one | person) [open] #h:wrong_tab",
      "wrong (tab | file | @rev | person | one)",
      "is (that | this) (ben's @rev | ben's | ben)",
      "i do not think i should (see | be seeing) (this | that)",
      "i should not (see | be seeing) (this | that)",
      "(that | this | it) (looks like | is) ben's [@rev]",
      "i think (it is | that is | this is) ben's [@rev]",
      "(wait | sorry) (that is | this is) (ben | not me | ben's)",
    ] },
    // "Is that my review?" (a tactful question) / "That's my review." (the learner takes it as theirs)
    tab_check: { patterns: ["is (that | this) (my @rev | mine | me)", "(that | this) is [really] (my @rev | mine | me)"] },
    tab_read: { patterns: [
      "[wow | oh | ha] ben (got | has | gets) [a | an] (low | lower | bad | poor | below average) (rating | ratings | score | scores | potential | review)",
      "[wow | oh | ha] ben's (rating | ratings | score | scores | potential) (is | are | looks | look) (low | lower | bad | not great | not good | worse than mine)",
      "(i see | i can see) (that)? ben (got | has) [a | an] (low | lower | bad) (rating | potential | score)",
      "ben's potential is (low | lower | not great)",
      "ben (got | has) (a)? lower (rating | potential | score) than (me | mine)",
      "(it says | the screen says) ben (got | has) [a | an] (low | lower | bad) (rating | potential | score)",
    ] },

    // --- goals ------------------------------------------------------------------------------------------------
    goal_name: { patterns: [
      "i would (like | love) to (work on | improve | focus on | get better at | develop | grow in | learn [more about] | study) [my] {goal} [next year] #h:work_on",
      "i (want | hope | plan) to (work on | improve | focus on | get better at | learn [more about] | study) [my] {goal} [next year]",
      "i would (like | love) to (take | do | sign up for | attend | go to) (a | an | some) (course | class | training | workshop) (in | on | about) {goal} #h:take_course",
      "i (would like | would love | want | hope) to (take | do | sign up for) (a | an | some) {goal} (course | class | training | workshop)",
      "i (would like | would love | want) to (be | become) a mentor [for (the interns | new people | the new interns)] #g:mentoring",
      "i (want | would like | would love) to (do | try) [more | some] {goal}",
      "[maybe] (a | an | some) {goal} (course | class | training | workshop) [maybe | i think | would be great] #h:course_q",
      "(maybe | probably | i think | definitely) [some] {goal} [next year]",
      "i would (like | love) to (lead | run | manage | own) [a | my own | one] (small | little) project [next year] #h:lead_project #g:leading",
      "i (want | hope) to (lead | run) [a | my own | one] (small | little) project [next year] #g:leading",
      "i would (like | love) to (do | try) [more | some] {goal} [next year] #h:more_mentoring",
      "i would (like | love) to (mentor | help | train) (the | our) [new] (interns | intern | juniors | junior designers | new people | newcomers) #g:mentoring",
      "i would (like | love) to (present | speak) (more | more often | to clients | in client meetings) [next year] #g:presenting #h:present_more",
      "i (want | would like) to (be | become) (a better presenter | better at presenting | more confident (in meetings | with clients)) #g:presenting",
      "i (want | would like) to (grow | become) [into] a (team lead | lead | leader) #g:leadership",
      "{goal} (and | or) {goal2:goal}",
    ] },
    // "I'd like to stop presenting." / "Less mentoring.": never the goal itself (answered like a vague goal)
    goal_not: { patterns: [
      "i (would like | would love | want | hope | plan | need) to (stop | quit | avoid | give up) [doing] [the] {goal} [next year]",
      "i (would like | would love | want | hope) to (do | have) (less | fewer | no more) {goal} [next year]",
      "i (would like | want) to (present | speak | mentor) less [next year]",
      "i (would like | want) to stop (presenting | speaking | mentoring | leading) [next year]",
      "(less | fewer | no more | not) {goal} [next year] [i think]",
      "anything but {goal}",
      "i do not want to (do | work on | focus on | take | lead | improve) [any] [more] {goal} [next year]",
      "i would rather not (do | work on | focus on) [any] [more] {goal} [next year]",
      "i do not want (any | more) {goal} [next year]",
    ] },
    // "A course." (from her own list of ideas): she asks which one
    goal_course: { patterns: [
      "i would (like | love) to (take | do | sign up for | attend | go to) (a | an | some) (course | class | training | workshop) [next year]",
      "i (want | hope | plan) to (take | do) (a | an | some) (course | class | training | workshop) [next year]",
      "(a | some) (course | class | training | workshop) would be (nice | great | good | interesting)",
    ] },
    goal_course_ctx: { patterns: ["[maybe | probably | i think] (a | some) (course | class | training | workshop) [maybe | i think | probably | next year]"] },
    // "UX writing." (only while she asks about goals)
    goal_ctx: { patterns: ["[the | a | some | maybe] {goal} [i think | maybe | probably | course | training | next year]"] },
    goal_vague: { patterns: [
      "(i want | i would like) to (grow | learn | develop | improve) [more | as a designer | professionally]",
      "something (new | different | bigger | more challenging)",
      "(more | bigger) (responsibility | responsibilities | projects | challenges)",
      "i (want | would like) (more | new) (challenges | responsibility)",
    ] },
    ask_budget: { patterns: [
      "is there (a | any) (training | learning | education) budget #h:training_budget",
      "is there (a | any) budget for (training | courses | learning | that | it | a course | conferences)",
      "(do we | does the company | do you) have (a | any) (training | learning) budget",
      "(can | could | will | would) (the company | brightline | you | we) pay for (it | the course | that | training | a course)",
      "how much (can i | can we) spend [on (training | courses | it)]",
      "how (much | big) is the [training] budget",
      "who pays for (it | the course | that)",
      "(is | would) (it | the course) [be] (covered | paid for)",
    ] },
    ask_support: { patterns: [
      "(could | can) we (practice | rehearse | do a practice run) (before | ahead of) (client meetings | the next meeting | meetings | the next client meeting) #h:practice_before",
      "(some | regular | more) (@fb | check ins) would (help | be great | be nice) #h:regular_feedback",
      "(could | can) i (get | have) [some] (time | hours) for (it | the course | learning | studying | that) #h:time_course",
      "(could | can) you (help | support | coach) me [with (it | that)]",
      "(could | can) i (have | get) a (mentor | coach)",
      "(could | can) i shadow you [in (meetings | client meetings)]",
      "(could | can) you give me @fb after [the] (meetings | presentations | each meeting | every meeting)",
    ] },
    // "Time." / "Some practice." (only while she asks what would help)
    support_ctx: { patterns: ["[some | more | regular] (time | practice | feedback | support | help) [would help]", "a (mentor | coach) [would help]"] },

    // --- the role reversal -------------------------------------------------------------------------------------
    // "Sure, I'd be happy to." (only while she asks for feedback)
    rev_ok_ctx: { patterns: [
      "i would be (happy | glad) to [help | give you some] #h:happy_to", "(happy | glad) to", "(of course | sure) i (can | will) (try | do that)",
      "(wow | oh) [okay] (sure | of course)", "(can | may) i be honest #honest #h:honest_ok",
    ] },
    rev_decline: { patterns: [
      "i (do not | would rather not) [want to] (give you @fb | do that | say anything)",
      "(that is | it is) (not my place | a bit awkward | awkward | weird)",
      "(maybe | perhaps) (later | another time | next time)",
    ] },
    rev_worked: { patterns: [
      "what (worked | works | is working) [really | very | so] well (was | is) [your | the] {mg:mgood} #h:rev_worked",
      "i [really] (like | appreciate | love | value) [your | the] {mg:mgood} #h:rev_appreciate",
      "your {mg:mgood} (is | was | are | has been | have been) [really | very | so] (great | good | amazing | helpful | appreciated)",
      "you (always | really) listen [to (us | me | the team | everyone)] #mg:listening",
      "you listen [to (us | me | the team | everyone)] #mg:listening",
      "you are a (good | great | really good) listener #mg:listening #h:great_listener",
      "your door is (always)? open #mg:open_door #h:door_open",
      "(you are | you have been) [always] (available | approachable | easy to talk to) #mg:open_door",
      "you are [very | really | always] (honest | direct | clear | fair | transparent) #mg:honesty",
      "you (stay | stayed | are | always stay) (calm | relaxed) [under pressure] #mg:calm",
      "you (support | supported | protect | protected | defend | defended | back | backed) (us | the team | me) #mg:support",
      "you are [very | really | so] (supportive | kind | positive) #mg:support",
      "you are a [really | very] (good | great | wonderful | fantastic | fair | kind) (manager | boss | leader) [already] #mg:general",
      "you (are doing | have been doing | do) [a] (great | good | really good) (job | work) #mg:general",
      "(everything | a lot) (is working | works | worked)",
    ] },
    mg_ctx: { patterns: ["[your | the] {mg:mgood}"] },
    rev_try: { patterns: [
      "one thing you could try is {mt:mtip} #h:rev_one_thing",
      "[well] since you ask [one thing you could try is] {mt:mtip} #h:since_ask",
      "(maybe | perhaps) [try] {mt:mtip} #h:maybe_x",
      "have you thought about {mt:mtip} #h:thought_about",
      "i would suggest {mt:mtip} #h:id_suggest",
      "(what about | how about) {mt:mtip}",
      "{mt:mtip} would (help | be great | be nice | be good | make a difference)",
      "(we | i) (need | could use | would like) {mt:mtip}",
      "(you could | maybe you could | maybe) (have | do | try | set up) {mt:mtip} [with (us | each of us | the team | everyone)] [every (week | month) | regularly]",
      "(maybe | perhaps | please) (try not to | stop) (send | sending | write | writing) (emails | messages | email) @late_night #mt:late_email",
      "(maybe | perhaps | please) do not (send | write) (emails | messages | email) @late_night #mt:late_email",
      "(fewer | less | no) (emails | messages | email) @late_night #mt:late_email",
      "(you could | maybe) (meet | talk to) (us | each of us | everyone) (one on one | individually | every week | regularly) #mt:one_on_ones",
      "(we | i) (need | would like) (clearer | clear) (priorities | goals | direction) #mt:priorities",
      "(tell us | make it clear) what is [most] (important | urgent) #mt:priorities",
      "(maybe | perhaps) (delegate | share) more [work | tasks] #mt:other",
      "(the | your | our | some) meetings (are | can be | get | feel) [often | sometimes | a bit | a little | kind of | usually] (too | quite | really | very) long #mt:shorter_meetings",
      "(the | your | our) meetings (could | should | can) be shorter #mt:shorter_meetings",
      "(maybe | perhaps) (relax | worry less | trust us more) #mt:other",
    ] },
    mt_ctx: { patterns: ["{mt:mtip}"] },
    rev_nothing: { patterns: [
      "(nothing | nothing really | nothing at all) [you are (doing)? (great | perfect | fine)]",
      "i (can not | could not) (think of | find) anything",
      "you are (perfect | doing everything right)",
      "(do not | you do not need to) change (anything | a thing)",
      "i would not change (anything | a thing)",
      "everything is (great | perfect | fine)",
    ] },
    rev_rude: { patterns: [
      "you are a (bad | terrible | awful | horrible) (manager | boss) #tip:kind",
      "you are [too] (nervous | weak | slow | disorganized | messy | annoying | chaotic) #tip:kind",
      "(rachel | someone else | ben | i) should (be | have been) the (manager | boss) #tip:kind",
      "you (do not | can not) (manage | lead) #tip:kind",
      "you are not (ready | a good manager | good at this) #tip:kind",
      "(your | the) (emails | meetings) are (terrible | annoying | stupid | useless | a waste of time) #tip:kind",
    ] },

    // --- money and the closing -----------------------------------------------------------------------------------
    ask_raise: { patterns: [
      "(can | could) we (talk | speak) about [my] (@pay | @raise | @promo) [first | now | today | too | as well] #h:ask_salary",
      "(what about | and) [my] (@pay | @raise | @promo)",
      "(will | could | can) i (get | have) (@raise | @promo) [this year | next year]",
      "is (there | a raise) (a raise | possible | a chance of a raise | a chance of a promotion) [this year]",
      "i would like to (ask | talk) about (@pay | @raise | @promo)",
      "i would like to discuss (@pay | @raise | @promo)",
      "(is there a chance of | is there any chance of | any chance of) (@raise | @promo)",
      "(am i | are we) getting (@raise | @promo)",
      "when (do | will) (we | i) (hear | know | find out) about (@pay | raises | salaries | promotions)",
      "(will | does) (this | the) @rev (affect | change | influence) (@pay | my @promo | the @raise) #h:affect_pay",
      "how does (this | the) @rev (affect | change) (@pay | my chances)",
      "(i think)? i deserve (@raise | @promo) #tip:money_blunt",
      "i would (like | love) (to (get | have | ask for))? (@raise | @promo | more money) [this year | next year]",
      "i was hoping (for | to get) (@raise | @promo) [this year | next year]",
      "i (would like | want) to ask (for | about) (@raise | @promo)",
      "(i want | give me | i need) (more money | @raise | @promo) #tip:money_blunt",
      "what about (money | the money)",
      "[yes] about [my] (@pay | @raise | @promo)",
      "is (a raise | a promotion | @raise | @promo) possible [this year | next year]",
    ] },
    ask_criteria: { patterns: [
      "what would i need to do to (get | earn) (@promo | @raise) #h:promotion_need",
      "what (do | should) i (need to | have to) do (for | to get) (@promo | @raise)",
      "@could_you give me an example of what exceeds expectations means [here] #h:exceeds",
      "what does exceeds expectations (mean | look like) [here]",
      "what (counts | matters) [for (@promo | @raise | the decision)]",
      "how (are | is) (salary | salaries | raises | promotions | pay | salary decisions) (decided | made)",
      "how are salary decisions made #h:how_decided",
      "what are the (criteria | rules)",
      "how do the ratings (connect | relate) to (@pay | money)",
      "how (can | could) i get (@promo | @raise)",
      "what (do | would) you need to see [from me]",
    ] },
    no_more: { patterns: [
      "[no] i think (that is | it is) (all | it | everything) #h:no_thats_all",
      "(that is | it is) (all | it | everything) [for now | from me]",
      "(no | not) [any] [more | other] questions [from me]",
      "i (do not | did not) have any [more | other] questions",
      "i have no [more | other] questions",
      "nothing [else] [from me | for now]",
      "(i am | i think i am) good",
    ] },
    propose_checkin: { patterns: [
      "(can | could | should) we (check in | meet | talk) again (in a month #month | next month #month | soon #soon | in a few weeks #weeks) #h:check_again",
      "let us (check in | meet | talk) again [in a month #month | next month #month | soon #soon]",
      "(same time | the same time) next month #month",
      "see you (in a month | next month) #month",
      "when (is | will be) (our | the) next (check in | meeting | one on one | review) #when",
      "when (do | will | should | can) we (meet | talk | check in) again #when",
    ] },
    // "Good idea." / "Let's do that." (to her own suggestion)
    agree_idea: { patterns: [
      "(good | great | nice | perfect) idea #h:good_idea", "(that | it) (sounds | would be) (good | great | perfect | fine)", "let us do (that | it)",
      "i (like | love) (that | it | the idea | that idea)", "(that | it) works [for me]", "(yes | yeah | sure) (please | why not | let us do it)",
    ] },
    thanks_today: { patterns: [
      "(thanks | thank you) [so much | very much | a lot] for (today | your time | the meeting | the review | this | the conversation | the feedback | the talk | everything today) #h:thanks_today",
    ] },
    // "Sounds good." / "Same time works." (only while she proposes the check-in)
    checkin_yes_ctx: { patterns: [
      "(same time | same time works | same time is (fine | good | perfect) | works for me | that works [for me] | let us do (that | it) | it is a date | deal | see you then | looking forward to it) #h:works_for_me",
      "sounds (good | great | perfect) #h:sounds_good",
      "(next month | in a month | a month from now | one month) (is | sounds | would be) (fine | good | great | perfect) [for me]",
      "(next month | in a month | a month) (works | is okay) [for me]",
      "[yes] (next month | in a month) [then | is fine]",
    ] },
    checkin_no_ctx: { patterns: [
      "(maybe | how about | what about | could we do) (in)? (two months | two weeks | three weeks | six weeks | a few weeks) [instead]",
      "(can | could) we (make it | do it | do | meet | check in | talk) (in)? (two months | two weeks | three weeks | six weeks | a few weeks) [instead]",
      "(two weeks | three weeks | two months | six weeks) (would be | is) better [for me]",
      "(can | could) we (make it | do it | meet | check in | talk) (sooner | earlier | later)",
      "(maybe)? a different time",
    ] },
  },

  lines: {
    // --- the start ------------------------------------------------------------------------------------
    hello: [
      t("Hi! | Come in, | have a seat. | Oh | no! | Sorry, | sorry.", "Labas! | Užeik, | prisėsk. | O | ne! | Atsiprašau, | atsiprašau.", "Labas! Užeik, prisėsk. O ne! Atsiprašau, atsiprašau."),
      t("Hey! | Come in, | sit | down. | Oh | no, | no, | no! | Sorry!", "Labas! | Užeik, | sėskis | —. | O | ne, | ne, | ne! | Atsiprašau!", "Labas! Užeik, sėskis. O ne, ne, ne! Atsiprašau!",
        { flags: { 3: "“down” (sit down): sėskis carries it." } }),
    ],
    plant_okay: [
      t("Okay. | Well, | that | was | a | great | start. | Thanks | for | making | time.", "Gerai. | Na, | tai | buvo | — | puiki | pradžia. | Ačiū, | kad | radai | laiko.",
        "Gerai. Na, puiki pradžia. Ačiū, kad radai laiko.", { flags: { 8: F_FOR_KAD } }),
      t("Okay. | The | plant | is | fine. | Mostly. | Thanks | for | making | time.", "Gerai. | — | Augalas | yra | sveikas. | Beveik. | Ačiū, | kad | radai | laiko.",
        "Gerai. Augalas sveikas. Beveik. Ačiū, kad radai laiko.", { flags: { 7: F_FOR_KAD } }),
    ],
    hello_back: [
      t("Hi! | Come in. | Don't worry, | the | plant | lives | on | the | shelf | now.", "Labas! | Užeik. | Nesijaudink, | — | augalas | gyvena | ant | — | lentynos | dabar.",
        "Labas! Užeik. Nesijaudink, augalas dabar gyvena lentynoje."),
    ],
    hello_back2: [t("Thanks | for | making | time | again.", "Ačiū, | kad | radai | laiko | vėl.", "Ačiū, kad vėl radai laiko.", { flags: { 1: F_FOR_KAD } })],
    plant_help: [
      t("No, | no, | stay | where | you | are. | Wow. | That | sounded | very | managerial.", "Ne, | ne, | lik | ten, kur | tu | esi. | Oho. | Tai | nuskambėjo | labai | vadoviškai.",
        "Ne, ne, lik, kur esi. Oho. Nuskambėjo labai vadoviškai."),
      t("It's | fine, | it's | just | dirt. | I'll deal | with | it | later.", "Viskas | gerai, | tai yra | tik | žemė. | Susitvarkysiu | su | tuo | vėliau.",
        "Viskas gerai, čia tik žemė. Susitvarkysiu vėliau.", { flags: { 0: "“It's” here = viskas (yra)." } }),
    ],
    plant_ok_q: [
      t("I'm | fine. | The | plant, | not | so much.", "Man | gerai. | — | Augalui, | ne | itin.", "Man viskas gerai. O augalui – ne itin.",
        { flags: { 0: "“I'm fine” = man gerai: Lithuanian uses the dative." } }),
    ],
    fine_thanks: [t("I'm | fine, | thanks!", "Man | gerai, | ačiū!", "Man viskas gerai, ačiū!", { flags: { 0: "“I'm fine” = man gerai: Lithuanian uses the dative." } })],

    // --- how are you feeling -------------------------------------------------------------------------------
    feeling_ask: [
      t("So. | How | are | you | feeling | about | today?", "Taigi. | Kaip | — | tu | jautiesi | dėl | šiandienos?", "Taigi, kaip jautiesi prieš šiandienos pokalbį?",
        { flags: { 2: "Progressive “are”: the present jautiesi carries it." } }),
      t("So, | before | we | start: | how | are | you | feeling | about | all | this?", "Taigi, | prieš | mums | pradedant: | kaip | — | tu | jautiesi | dėl | viso | šito?",
        "Taigi, prieš pradedant: kaip jautiesi dėl viso šito?",
        { flags: { 2: "“we” = mums: the dative goes with the participle pradedant.", 5: "Progressive “are”: the present jautiesi carries it." } }),
    ],
    feeling_again: [
      t("Anyway! | How | are | you | feeling | about | today?", "Šiaip ar taip! | Kaip | — | tu | jautiesi | dėl | šiandienos?", "Šiaip ar taip! Kaip jautiesi prieš šiandienos pokalbį?",
        { flags: { 2: "Progressive “are”: the present jautiesi carries it." } }),
    ],
    feel_nervous: [
      t("Honestly? | Me | too. | It's | my | first | time | on | this | side | of the table.", "Atvirai? | Aš | irgi. | Tai yra | mano | pirmas | kartas | — | šioje | pusėje | stalo.",
        "Atvirai? Aš irgi. Pirmą kartą sėdžiu šioje stalo pusėje.", { flags: { 7: F_SIDE } }),
      t("That's | totally | normal. | I'm | nervous | too, | and | I'm | the | manager.", "Tai yra | visiškai | normalu. | Aš esu | susijaudinusi | irgi, | o | aš esu | — | vadovė.",
        "Tai visiškai normalu. Aš irgi jaudinuosi, o juk esu vadovė."),
    ],
    // a return visit: no longer her first round
    feel_nervous_back: [
      t("Honestly? | Me | too. | It | doesn't get | easier | that | fast.", "Atvirai? | Aš | irgi. | Tai | nepasidaro | lengviau | taip | greitai.", "Atvirai? Aš irgi. Taip greitai lengviau nepasidaro."),
      t("That's | totally | normal. | I'm | nervous | too, | and | I'm | the | manager.", "Tai yra | visiškai | normalu. | Aš esu | susijaudinusi | irgi, | o | aš esu | — | vadovė.",
        "Tai visiškai normalu. Aš irgi jaudinuosi, o juk esu vadovė."),
    ],
    feel_asked_back_back: [
      t("Glad | to hear | it. | Me? | Still | a little | nervous, | honestly.", "Smagu | girdėti | tai. | Aš? | Vis dar | truputį | susijaudinusi, | atvirai.",
        "Smagu girdėti. O aš? Atvirai, vis dar truputį jaudinuosi."),
    ],
    emily_howareyou_back: [
      t("Honestly? | Still | a little | nervous. | And | you?", "Atvirai? | Vis dar | truputį | susijaudinusi. | O | tu?", "Atvirai? Vis dar truputį jaudinuosi. O tu?"),
    ],
    feel_fine: [
      t("Good. | That makes one of us.", "Gerai. | {m:Bent vienas iš mūsų ramus|f:Bent viena iš mūsų rami}.", "Gerai. Bent jau {m:vienas iš mūsų ramus|f:viena iš mūsų rami}."),
      t("Good! | Calm | is | good. | I | should | try | that.", "Gerai! | Ramybė | yra | gerai. | Aš | turėčiau | pabandyti | tai.", "Gerai! Ramybė – tai gerai. Ir man reikėtų pabandyti."),
    ],
    feel_curious: [
      t("Curious | is | good. | I'll take | curious.", "Smalsumas | yra | gerai. | Priimsiu | smalsumą.", "Smalsumas – tai gerai. Man jis tinka.",
        { flags: { 0: "“Curious” (the feeling) = smalsumas." } }),
    ],
    feel_bad: [
      t("Oh | no. | Then | I'll keep | it | short.", "O | ne. | Tada | padarysiu | jį | trumpą.", "O ne. Tada pasistengsiu neužtęsti.",
        { flags: { 3: "“keep it short” = make it short: padarysiu (pokalbį) trumpą." } }),
    ],
    feel_unsure: [t("Fair. | Honestly, | me | neither.", "Suprantama. | Atvirai, | aš | irgi ne.", "Suprantu. Atvirai, aš irgi nežinau.")],
    feel_asked_back: [
      t("Glad | to hear | it. | Me? | Honestly, | a little | nervous. | First | time | on | this | side | of the table.",
        "Smagu | girdėti | tai. | Aš? | Atvirai, | truputį | susijaudinusi. | Pirmas | kartas | — | šioje | pusėje | stalo.",
        "Smagu girdėti. O aš? Atvirai, truputį jaudinuosi. Pirmą kartą sėdžiu šioje stalo pusėje.", { flags: { 9: F_SIDE } }),
    ],
    emily_howareyou: [
      t("Honestly? | A little | nervous. | First | time | on | this | side | of the table. | And | you?",
        "Atvirai? | Truputį | susijaudinusi. | Pirmas | kartas | — | šioje | pusėje | stalo. | O | tu?",
        "Atvirai? Truputį jaudinuosi. Pirmą kartą sėdžiu šioje stalo pusėje. O tu?", { flags: { 5: F_SIDE } }),
    ],

    // --- your year ----------------------------------------------------------------------------------------------
    format: [
      t("Here's | how | it | works: | first | your | self-assessment, | then | mine, | then | goals | for | next | year.",
        "Štai | kaip | tai | vyksta: | pirma | tavo | įsivertinimas, | tada | mano, | tada | tikslai | — | kitiems | metams.",
        "Štai kaip tai vyksta: pirma tavo įsivertinimas, tada mano vertinimas, o tada – tikslai kitiems metams.",
        { flags: { 11: "“for”: the dative kitiems metams carries it." } }),
      t("The | format | is | simple: | you | start | with | your | self-assessment, | I | share | mine, | and | we | finish | with | goals.",
        "— | Formatas | yra | paprastas: | tu | pradedi | — | savo | įsivertinimu, | aš | pasidalinu | savuoju, | ir | mes | baigiame | — | tikslais.",
        "Formatas paprastas: tu pradedi savo įsivertinimu, aš pasidalinu savuoju, o baigiame tikslais.",
        { flags: { 6: "“with”: the instrumental savo įsivertinimu carries it.", 15: "“with”: the instrumental tikslais carries it." } }),
    ],
    proud_ask: [
      t("Let's | start. | What | are | you | most | proud | of | this | year?", "— | Pradėkime. | Kuo | — | tu | labiausiai | didžiuojiesi | — | šiais | metais?",
        "Pradėkime. Kuo šiais metais labiausiai didžiuojiesi?", { flags: { 0: F_LETS, 3: "“are” + proud = the verb didžiuotis (under “proud”): no copula.", 7: "“of”: the instrumental kuo (under “What”) carries it." } }),
      t("You | first. | What | are | you | most | proud | of | this | year?", "Tu | pirma. | Kuo | — | tu | labiausiai | didžiuojiesi | — | šiais | metais?",
        "Tu pirma. Kuo šiais metais labiausiai didžiuojiesi?", { flags: { 3: "“are” + proud = the verb didžiuotis (under “proud”): no copula.", 7: "“of”: the instrumental kuo (under “What”) carries it." } }),
    ],
    proud_again: [t("Anything | at all. | Big | or | small.", "Bet kas | apskritai. | Didelis | ar | mažas.", "Bet kas – didelis ar mažas dalykas.")],
    proud_help: [
      t("Really? | What about | the | scheduling | tool | guide? | Support | loves | it.", "Tikrai? | O gal | — | planavimo | įrankio | instrukcija? | Pagalbos skyrius | dievina | ją.",
        "Tikrai? O planavimo įrankio instrukcija? Pagalbos skyrius ją tiesiog dievina."),
    ],
    proud_react: [
      t("Oh, | good | one.", "O, | geras | pasirinkimas.", "O, geras pasirinkimas.", { flags: { 2: "“one” = pasirinkimas (the choice) here." } }),
      t("Yes! | That | was | a | big | one.", "Taip! | Tai | buvo | — | didelis | dalykas.", "Taip! Tai buvo didelis dalykas."),
    ],
    made_ask: [
      t("Nice. | What | made | it | work?", "Puiku. | Kas | lėmė, | kad tai | pavyko?", "Puiku. Kas lėmė, kad pavyko?", { flags: { 3: F_KAD } }),
      t("I | love | that. | What | do | you | think | made | it | work?", "Man | labai patinka | tai. | Kas, | — | tu | manai, | lėmė, | kad tai | pavyko?",
        "Man tai labai patinka. Kaip manai, kas lėmė, kad pavyko?", { flags: { 0: F_DAT_MAN, 4: F_WH_DO, 8: F_KAD } }),
    ],
    made_react: [
      t("That | makes sense. | And | it | shows.", "Tai | suprantama. | Ir | tai | matosi.", "Suprantu. Ir tai matyti."),
      t("Smart. | That's | exactly | what | I | saw | too.", "Protinga. | Tai yra | būtent | tai, ką | aš | mačiau | irgi.", "Protinga. Būtent tai mačiau ir aš."),
    ],
    made_help: [t("Modest! | Okay, | I'll tell | you.", "{m:Kuklus|f:Kukli}! | Gerai, | pasakysiu | tau.", "{m:Kuklus|f:Kukli}! Gerai, tada pasakysiu aš.")],
    team_react: [
      t("Team | effort, | sure. | But | you | held | it | together.", "Komandinis | darbas, | žinoma. | Bet | tu | išlaikei | viską | kartu.",
        "Komandinis darbas – žinoma. Bet būtent tu neleidai viskam subyrėti.", { flags: { 6: "“it” = viskas here (the whole thing)." } }),
    ],
    praise_guide: [
      t("What | worked | really | well | was | how | you | documented | the | scheduling | tool. | Support | stopped | interrupting | you | every | ten | minutes.",
        "Kas | pavyko | labai | gerai, | tai | kaip | tu | aprašei | — | planavimo | įrankį. | Pagalbos skyrius | nustojo | trukdyti | tau | kas | dešimt | minučių.",
        "Labai gerai pavyko tai, kaip aprašei planavimo įrankį. Pagalbos skyrius nustojo tau trukdyti kas dešimt minučių.", { flags: { 4: F_CLEFT } }),
      t("What | worked | really | well | was | your | scheduling | tool | guide. | Support | answers | questions | without | you | now.",
        "Kas | pavyko | labai | gerai, | tai | tavo | planavimo | įrankio | instrukcija. | Pagalbos skyrius | atsako | į klausimus | be | tavęs | dabar.",
        "Labai gerai pavyko tavo planavimo įrankio instrukcija. Dabar pagalbos skyrius atsako į klausimus be tavęs.", { flags: { 4: F_CLEFT } }),
    ],
    praise_rescue: [
      t("What | worked | really | well | was | how | you | rescued | the | client | project. | Everyone | stayed | calm, | and | we | still | delivered | on time.",
        "Kas | pavyko | labai | gerai, | tai | kaip | tu | išgelbėjai | — | kliento | projektą. | Visi | išliko | ramūs, | ir | mes | vis tiek | pristatėme | laiku.",
        "Labai gerai pavyko tai, kaip išgelbėjai kliento projektą. Visi išliko ramūs, ir vis tiek viską pristatėme laiku.", { flags: { 4: F_CLEFT } }),
    ],
    praise_intern: [
      t("What | worked | really | well | was | how | you | helped | the | new | intern. | He | says | you | taught | him | the | whole | design | system | in | a | week.",
        "Kas | pavyko | labai | gerai, | tai | kaip | tu | padėjai | — | naujam | praktikantui. | Jis | sako, | kad tu | išmokei | jį | — | visos | dizaino | sistemos | per | — | savaitę.",
        "Labai gerai pavyko tai, kaip padėjai naujam praktikantui. Jis sako, kad per savaitę išmokei jį visos dizaino sistemos.", { flags: { 4: F_CLEFT, 13: F_KAD } }),
    ],
    praise_launch: [
      t("What | worked | really | well | was | the | app | launch. | Not | one | angry | email | from | the | client. | That's | a | first.",
        "Kas | pavyko | labai | gerai, | tai | — | programėlės | paleidimas. | Nė | vieno | pikto | laiško | iš | — | kliento. | Tai yra | — | pirmas kartas.",
        "Labai gerai pavyko programėlės paleidimas. Nė vieno pikto kliento laiško. Taip dar nėra buvę.", { flags: { 4: F_CLEFT } }),
    ],
    praise_survey: [
      t("What | worked | really | well | was | the | customer | survey. | We | actually | changed | the | checkout | because of | it.",
        "Kas | pavyko | labai | gerai, | tai | — | klientų | apklausa. | Mes | iš tikrųjų | pakeitėme | — | atsiskaitymo puslapį | dėl | jos.",
        "Labai gerai pavyko klientų apklausa. Dėl jos net pakeitėme atsiskaitymo puslapį.", { flags: { 4: F_CLEFT } }),
    ],
    praise_also: [
      t("And | the | {X}, | too. | Honestly, | a | great | year.", "Ir | — | {X:nom}, | irgi. | Atvirai, | — | puikūs | metai.", "Ir {X:nom} irgi. Atvirai – puikūs metai."),
    ],
    praise_again: [t("Seriously. | That | was | great | work.", "Rimtai. | Tai | buvo | puikus | darbas.", "Rimtai. Tai buvo puikus darbas.")],
    praise_thanks_react: [
      t("You | earned | it.", "Tu | nusipelnei | to.", "Tu to nusipelnei."),
      t("I | mean | it.", "Aš | sakau | rimtai.", "Sakau rimtai.", { flags: { 2: "“mean it” = say it seriously: rimtai stands under “it”." } }),
    ],
    deflect_react: [
      t("Hey. | Just | take | the | compliment.", "Ei. | Tiesiog | priimk | — | komplimentą.", "Ei. Tiesiog priimk komplimentą."),
      t("Uh-uh. | Take | the | compliment. | Try | again.", "Ne ne. | Priimk | — | komplimentą. | Bandyk | dar kartą.", "Ne ne. Priimk komplimentą. Bandyk dar kartą."),
    ],
    deflect_giveup: [
      t("Okay, | okay. | I'm writing | it | down | anyway.", "Gerai, | gerai. | Užsirašau | tai | — | vis tiek.", "Gerai, gerai. Vis tiek užsirašau.",
        { flags: { 4: "“down” (write down): the prefix už- of užsirašau carries it." } }),
    ],
    praise_help: [t("You | could | just | say | thanks.", "Tu | galėtum | tiesiog | pasakyti | ačiū.", "Galėtum tiesiog padėkoti.")],

    // --- the feedback ------------------------------------------------------------------------------------------
    consent_ask: [
      t("Can | I | give | you | some | feedback | too?", "Ar galiu | aš | pasakyti | tau | kelias | pastabas | irgi?", "Ar galiu tau pasakyti ir kelias pastabas?",
        { flags: { 2: F_GIVE_FB, 4: F_FEEDBACK } }),
      t("Now, | the | harder | part. | Can | I | give | you | some | feedback?", "Dabar, | — | sunkesnė | dalis. | Ar galiu | aš | pasakyti | tau | kelias | pastabas?",
        "O dabar – sunkesnė dalis. Ar galiu tau pasakyti kelias pastabas?", { flags: { 6: F_GIVE_FB, 8: F_FEEDBACK } }),
    ],
    consent_no: [
      t("Ha. | It's | kind of | the | point | of today. | It's | a | small | one, | I | promise.", "Cha. | Tai yra | lyg ir | — | esmė | šiandienos. | Tai yra | — | maža | pastaba, | aš | pažadu.",
        "Cha. Tai lyg ir šiandienos esmė. Pastaba nedidelė, pažadu.", { flags: { 9: "“one” = pastaba (a remark)." } }),
    ],
    consent_just: [t("I'll | just | say | it.", "— | Tiesiog | pasakysiu | tai.", "Tiesiog pasakysiu.", { flags: { 0: "“I'll”: the future pasakysiu carries it." } })],
    fb_give: [
      t("One | thing | you | could | try | is | speaking up | earlier | in | client | meetings.", "Vienas | dalykas, kurį | tu | galėtum | pabandyti, | tai | prabilti | anksčiau | per | klientų | susitikimus.",
        "Vienas dalykas, kurį galėtum pabandyti, – anksčiau prabilti per susitikimus su klientais.", { flags: { 1: F_KURI, 5: F_IS_TAI } }),
    ],
    fb_detail: [
      t("In | the | last | two, | you | barely | said | a | word.", "Per | — | paskutinius | du, | tu | vos | ištarei | — | žodį.", "Per paskutinius du beveik nieko nepasakei."),
      t("You | have | great | ideas, | and | the | client | never | hears | them.", "Tu | turi | puikių | idėjų, | o | — | klientas | niekada | negirdi | jų.",
        "Tu turi puikių idėjų, o klientas jų niekada neišgirsta.", { flags: { 8: "After niekada Lithuanian negates the verb too: negirdi." } }),
    ],
    fb_again: [
      t("So? | What | do | you | think?", "Na? | Ką | — | tu | manai?", "Na? Ką manai?", { flags: { 2: F_WH_DO } }),
      t("How | does | that | sound | to | you?", "Kaip | — | tai | skamba | — | tau?", "Kaip tau tai skamba?", { flags: { 1: F_WH_DO, 4: "“to”: the dative tau carries it." } }),
    ],
    fb_help: [
      t("Do | you | agree? | It's | okay | if | you | don't.", "Ar | tu | sutinki? | Tai yra | gerai, | jei | tu | nesutinki.", "Ar sutinki? Nieko tokio, jei ne.",
        { flags: { 7: "Elliptical “don't”: Lithuanian repeats the verb (nesutinki)." } }),
    ],
    fb_example: [
      t("Sure. | The | Pinewood | call | last | Tuesday, | and | the | one | before | that.", "Žinoma. | — | „Pinewood“ | skambutis | praėjusį | antradienį, | ir | — | tas | prieš | jį.",
        "Žinoma. Skambutis su „Pinewood“ praėjusį antradienį ir ankstesnis."),
    ],
    fb_example_more: [t("That's | all | I | have, | honestly.", "Tai yra | viskas, ką | aš | turiu, | atvirai.", "Atvirai, daugiau nieko neturiu.", { flags: { 1: "Zero relative: Lithuanian needs ką." } })],
    fb_accept_react: [
      t("Thanks | for | taking | it | so | well.", "Ačiū, | kad | priėmei | tai | taip | gerai.", "Ačiū, kad taip gerai priėmei.", { flags: { 1: F_FOR_KAD } }),
      t("Thank | you. | That | wasn't | easy | to say.", "Ačiū | tau. | Tai | nebuvo | lengva | pasakyti.", "Ačiū. Nebuvo lengva tai pasakyti."),
    ],
    fb_practice: [
      t("And | if | you | want, | we | can | practice | before | the | next | client | meeting.", "Ir | jei | tu | nori, | mes | galime | pasipraktikuoti | prieš | — | kitą | klientų | susitikimą.",
        "Jei nori, prieš kitą susitikimą su klientu galime pasipraktikuoti."),
    ],
    fb_get_there: [
      t("And | honestly? | You'll get | there.", "Ir | atvirai? | Tau pavyks | —.", "Ir atvirai? Tau pavyks.",
        { flags: { 3: "“there” (get there): pavyks (under “You'll get”) carries it; “You” = tau (the dative)." } }),
    ],
    fb_howso: [
      t("Oh? | How so?", "O? | Kodėl taip?", "O? Kodėl?"),
      t("Okay... | tell | me | more?", "Gerai... | papasakok | man | daugiau?", "Gerai… papasakok plačiau?"),
    ],
    fb_rude_react: [
      t("Oh. | Okay. | Can | you | tell | me | more?", "O. | Gerai. | Ar gali | tu | papasakoti | man | daugiau?", "O. Gerai. Gali papasakoti plačiau?"),
    ],
    fb_fair: [
      t("Oh. | You're | right. | I | presented | your | sections | because | the | client | was | late.", "O. | Tu esi | {m:teisus|f:teisi}. | Aš | pristačiau | tavo | dalis, | nes | — | klientas | buvo | pavėlavęs.",
        "O. Tu {m:teisus|f:teisi}. Tavo dalis pristačiau aš, nes klientas buvo pavėlavęs."),
      t("Wait. | That's | true. | I | took | your | sections | when | the | client | was | late.", "Palauk. | Tai yra | tiesa. | Aš | perėmiau | tavo | dalis, | kai | — | klientas | buvo | pavėlavęs.",
        "Palauk. Tiesa. Kai klientas pavėlavo, tavo dalis perėmiau aš."),
    ],
    fb_fair2: [
      t("Fair enough. | That's | on me.", "Na, gerai. | Tai | mano kaltė.", "Na, gerai. Čia mano kaltė."),
      t("Fair enough. | I | should | have noticed | that.", "Na, gerai. | Aš | turėjau | pastebėti | tai.", "Na, gerai. Turėjau tai pastebėti.",
        { flags: { 3: "“have noticed” after should: the past of turėti (under “should”) carries the perfect; pastebėti stays an infinitive." } }),
    ],
    fb_defensive_react: [
      t("I | hear | you. | I | just | think | the | client | should | hear | you | too.", "Aš | girdžiu | tave. | Aš | tiesiog | manau, | kad | klientas | turėtų | girdėti | tave | irgi.",
        "Suprantu. Tiesiog manau, kad tave turėtų išgirsti ir klientas.", { flags: { 6: "Zero “that”: kad stands under the article, which has no word." } }),
    ],
    fb_move_on: [
      t("Let's | leave | it | there | for now.", "— | Palikime | tai | čia | kol kas.", "Kol kas palikime tai.", { flags: { 0: F_LETS } }),
    ],
    protect_ask: [
      t("So | how | could | we | protect | your | speaking | time | next | time?", "Tai | kaip | galėtume | mes | apsaugoti | tavo | kalbėjimo | laiką | kitą | kartą?",
        "Tai kaip kitą kartą galėtume užtikrinti, kad tau liktų laiko kalbėti?"),
      t("What | would | help? | How | do | we | protect | your | time | with | the | client?", "Kas | — | padėtų? | Kaip | — | mes | apsaugome | tavo | laiką | su | — | klientu?",
        "Kas padėtų? Kaip užtikrinti, kad susitikime su klientu tau liktų laiko?", { flags: { 1: F_WOULD, 4: F_WH_DO } }),
    ],
    protect_again: [t("Any | ideas? | Even | a | small | one.", "Kokių nors | idėjų? | Net | — | mažą | idėją.", "Kokių nors minčių? Kad ir mažą.")],
    protect_help: [
      t("What if | we | put | your | sections | on | the | agenda, | with | your | name?", "O jei | mes | įrašytume | tavo | dalis | į | — | darbotvarkę, | su | tavo | vardu?",
        "O jei įrašytume tavo dalis į darbotvarkę su tavo vardu?"),
    ],
    protect_decide: [
      t("Let's | put | your | sections | on | the | agenda, | with | your | name.", "— | Įrašykime | tavo | dalis | į | — | darbotvarkę, | su | tavo | vardu.",
        "Įrašykime tavo dalis į darbotvarkę su tavo vardu.", { flags: { 0: F_LETS } }),
    ],
    protect_yes: [t("Great. | Done.", "Puiku. | Sutarta.", "Puiku. Sutarta.")],
    protect_no: [
      t("Okay. | Think | about | it, | and | tell | me | before | the | next | meeting.", "Gerai. | Pagalvok | apie | tai, | ir | pasakyk | man | prieš | — | kitą | susitikimą.",
        "Gerai. Pagalvok ir pasakyk man prieš kitą susitikimą."),
    ],
    protect_agenda: [
      t("Good | idea. | Your | sections | go | on | the | agenda, | with | your | name.", "Gera | mintis. | Tavo | dalys | įrašomos | į | — | darbotvarkę, | su | tavo | vardu.",
        "Gera mintis. Tavo dalys bus įrašytos į darbotvarkę su tavo vardu."),
    ],
    protect_keep: [
      t("And | we | keep | them | even | if | the | schedule | changes.", "Ir | mes | paliekame | jas | net | jei | — | grafikas | keičiasi.", "Ir paliekame jas, net jei grafikas pasikeičia."),
    ],
    protect_ok: [
      t("That | works | for | me.", "Tai | tinka | — | man.", "Man tai tinka.", { flags: { 2: "“for”: the dative man carries it." } }),
      t("I | like | that. | Let's | try | it.", "Man | patinka | tai. | — | Pabandykime | tai.", "Man tai patinka. Pabandykime.", { flags: { 0: F_DAT_MAN, 3: F_LETS } }),
    ],
    protect_agenda_too: [
      t("And | let's | put | your | sections | on | the | agenda, | too.", "Ir | — | įrašykime | tavo | dalis | į | — | darbotvarkę, | irgi.", "Ir dar įrašykime tavo dalis į darbotvarkę.",
        { flags: { 1: F_LETS } }),
    ],

    // --- the wrong tab ------------------------------------------------------------------------------------------
    tab_show: [t("Okay, | let | me | show | you | your | ratings. | Here.", "Gerai, | leisk | man | parodyti | tau | tavo | įvertinimus. | Štai.", "Gerai, parodysiu tau tavo įvertinimus. Štai.")],
    tab_look: [t("Take a look | and | tell | me | what | you | think.", "Pažvelk | ir | pasakyk | man, | ką | tu | manai.", "Pažvelk ir pasakyk, ką manai.")],
    tab_close: [
      t("Oh | no. | You're | right. | Closing | it. | Thank | you, | seriously.", "O | ne. | Tu esi | {m:teisus|f:teisi}. | Uždarau | jį. | Ačiū | tau, | rimtai.",
        "O ne. Tu {m:teisus|f:teisi}. Jau uždarau. Ačiū, rimtai."),
      t("Oh! | That's | Ben's. | Closing | it | right now. | Thank | you.", "O! | Tai | Beno. | Uždarau | jį | tuoj pat. | Ačiū | tau.", "O! Čia Beno. Tuoj pat uždarau. Ačiū."),
    ],
    tab_close_read: [
      t("Oh | no. | Please | forget | you | saw | that. | Closing | it.", "O | ne. | Prašau, | pamiršk, | kad tu | matei | tai. | Uždarau | jį.", "O ne. Prašau, pamiršk, ką matei. Uždarau.",
        { flags: { 4: F_KAD } }),
    ],
    tab_notice: [t("Wait. | That's | not | you. | That's | Ben's. | Oh | no, | sorry!", "Palauk. | Tai | ne | tu. | Tai | Beno. | O | ne, | atsiprašau!", "Palauk. Čia ne tu. Čia Beno. O ne, atsiprašau!")],
    tab_close_self: [t("Closing | it. | My | mistake.", "Uždarau | jį. | Mano | klaida.", "Uždarau. Mano klaida.")],
    tab_ben: [
      t("I'll tell | Ben | myself.", "Pasakysiu | Benui | pati.", "Pati pasakysiu Benui."),
      t("I'll let | Ben | know | about | this.", "Pranešiu | Benui | — | apie | tai.", "Pranešiu apie tai Benui.", { flags: { 2: "“know” (let … know): pranešiu (under “I'll let”) carries it." } }),
    ],
    tab_mine: [
      t("Okay. | This | one | is | yours.", "Gerai. | Šis | — | yra | tavo.", "Gerai. Štai šitas – tavo.", { flags: { 2: "“one” has no word: šis stands alone." } }),
    ],
    tab_mine2: [t("Good | news: | no | surprises.", "Geros | naujienos: | jokių | staigmenų.", "Gera žinia: jokių staigmenų.")],

    // --- goals ------------------------------------------------------------------------------------------------
    goals_ask: [
      t("Okay, | looking | ahead. | What | would | you | like | to work | on | next | year?", "Gerai, | žvelgiant | į priekį. | Ką | — | tu | norėtum | tobulinti | — | kitais | metais?",
        "Gerai, pažvelkime į ateitį. Ką kitais metais norėtum tobulinti?", { flags: { 4: "“would”: the conditional norėtum carries it.", 8: "“on” (work on): tobulinti takes a direct object (ką)." } }),
      t("Now, | next | year. | Where | do | you | want | to grow?", "Dabar, | kiti | metai. | Kur | — | tu | nori | augti?", "O dabar – kiti metai. Kur norėtum augti?", { flags: { 4: F_WH_DO } }),
    ],
    goals_options: [
      t("Some | ideas: | presenting | to | clients, | leading | a | small | project, | a | course, | or | mentoring.",
        "Keletas | idėjų: | pristatymai | — | klientams, | vadovavimas | — | mažam | projektui, | — | kursas, | arba | mentorystė.",
        "Keletas idėjų: pristatymai klientams, vadovavimas mažam projektui, kokie nors kursai arba mentorystė.", { flags: { 3: "“to”: the dative klientams carries it." } }),
    ],
    goals_suggest: [
      t("How about | client | presentations? | It | fits | with | the | feedback.", "O gal | klientų | pristatymai? | Tai | dera | su | — | pastaba.", "O gal pristatymai klientams? Tai dera su pastaba."),
      t("I'd | suggest | client | presentations. | It | fits | with | the | feedback.", "Aš | siūlyčiau | klientų | pristatymus. | Tai | dera | su | — | pastaba.",
        "Siūlyčiau pristatymus klientams. Tai dera su pastaba.", { flags: { 0: "“'d” (would): the conditional siūlyčiau carries it." } }),
    ],
    goal_present: [
      t("Perfect. | That | fits | with | the | feedback, | too.", "Puiku. | Tai | dera | su | — | pastaba, | irgi.", "Puiku. Tai dera ir su pastaba."),
      t("Yes! | You | could | present | a | full | section | at | the | next | client | meeting.", "Taip! | Tu | galėtum | pristatyti | — | visą | dalį | per | — | kitą | klientų | susitikimą.",
        "Taip! Per kitą susitikimą su klientu galėtum pristatyti visą dalį."),
    ],
    goal_lead: [
      t("Great. | There's | a | small | website | project | starting | in January. | It | could | be | yours.", "Puiku. | Yra | — | mažas | svetainės | projektas | prasidedantis | sausį. | Jis | galėtų | būti | tavo.",
        "Puiku. Sausį prasideda nedidelis svetainės projektas. Jis galėtų būti tavo."),
    ],
    goal_learn: [
      t("Good | choice. | There's | a | great | {X} | course | in the spring.", "Geras | pasirinkimas. | Yra | — | puikus | {X:gen} | kursas | pavasarį.",
        "Geras pasirinkimas. Pavasarį vyksta puikus {X:gen} kursas."),
    ],
    goal_course: [t("Oh, | a | {X} | course? | Great | idea.", "O, | — | {X:gen} | kursas? | Puiki | mintis.", "O, {X:gen} kursas? Puiki mintis.")],
    goal_which_course: [
      t("Sure! | Which one? | There's | UX | writing, | data | analysis, | or | leadership.", "Žinoma! | Kurį? | Yra | UX | rašymo, | duomenų | analizės, | arba | lyderystės.",
        "Žinoma! Kurį? Yra UX rašymo, duomenų analizės arba lyderystės kursai.", { flags: { 2: "“There's” = yra; the courses (kursai) are understood, so the subjects stand in the genitive." } }),
    ],
    goal_later: [
      t("Okay. | Think | about | it, | and | we'll choose | one | next | time.", "Gerai. | Pagalvok | apie | tai, | ir | išsirinksime | vieną | kitą | kartą.",
        "Gerai. Pagalvok, o kitą kartą išsirinksime vieną."),
    ],
    goal_not: [
      t("Okay, | that's | fair. | Then | let's | find | something | else.", "Gerai, | tai yra | suprantama. | Tada | — | raskime | ką nors | kita.", "Gerai, suprantama. Tada raskime ką nors kita.",
        { flags: { 4: F_LETS } }),
    ],
    goal_mentor: [
      t("You'd | be | great | at | that. | We | have | two | new | interns | starting | in March.", "Tu | būtum | {m:puikus|f:puiki} | — | tame. | Mes | turime | du | naujus | praktikantus | pradedančius | kovą.",
        "Tau tai puikiai sektųsi. Kovą pas mus ateina du nauji praktikantai.",
        { flags: { 0: "“'d” (would): the conditional būtum (under “be”) carries it.", 3: "“at”: the locative tame carries it." } }),
    ],
    goal_set: [
      t("I'll write | that | down | as | your | goal.", "Užrašysiu | tai | — | kaip | tavo | tikslą.", "Užrašysiu tai kaip tavo tikslą.",
        { flags: { 2: "“down” (write down): the prefix už- of užrašysiu carries it." } }),
      t("Let's | make | that | your | goal | for | next | year.", "— | Paverskime | tai | tavo | tikslu | — | kitiems | metams.", "Tebūnie tai tavo tikslas kitiems metams.",
        { flags: { 0: F_LETS, 5: "“for”: the dative kitiems metams carries it." } }),
    ],
    budget_amount: [
      t("And | good news: | there's | a | training | budget. | $1,500 | per | person, | per | year.", "Ir | gera žinia: | yra | — | mokymų | biudžetas. | 1 500 dolerių | — | žmogui, | — | per metus.",
        "Ir gera žinia: yra mokymų biudžetas – po 1 500 dolerių kiekvienam per metus.",
        { say: "And good news: there's a training budget. Fifteen hundred dollars per person, per year.", flags: { 7: F_PER, 9: F_PER_YEAR } }),
    ],
    budget_yes: [
      t("Yes! | $1,500 | per | person, | per | year.", "Taip! | 1 500 dolerių | — | žmogui, | — | per metus.", "Taip! Po 1 500 dolerių kiekvienam per metus.",
        { say: "Yes! Fifteen hundred dollars per person, per year.", flags: { 2: F_PER, 4: F_PER_YEAR } }),
    ],
    budget_again: [
      t("Yep: | $1,500 | a | year. | Use | it.", "Taip: | 1 500 dolerių | — | per metus. | Panaudok | juos.", "Taip: 1 500 dolerių per metus. Panaudok juos.",
        { say: "Yep: fifteen hundred dollars a year. Use it.", flags: { 2: "“a (year)” = per metus (under “year”).", 5: "“it” = the money: juos (doleriai)." } }),
    ],
    budget_what: [
      t("What | would | you | use | it | for?", "Kam | — | tu | panaudotum | jį | —?", "Kam jį panaudotum?",
        { flags: { 1: "“would”: the conditional panaudotum carries it.", 5: "“for”: the dative kam (under “What”) carries it." } }),
    ],
    support_first: [t("Sure. | But | first: | what's | the | goal?", "Žinoma. | Bet | pirma: | koks yra | — | tikslas?", "Žinoma. Bet pirma – koks tikslas?")],
    support_ask: [
      t("What | would | help | you | get | there?", "Kas | — | padėtų | tau | pasiekti | to?", "Kas tau padėtų to pasiekti?",
        { flags: { 1: F_WOULD, 5: "“there” = to (that goal): pasiekti takes the genitive." } }),
      t("And | what | do | you | need | from | me?", "O | ko | — | tau | reikia | iš | manęs?", "O ko tau reikia iš manęs?",
        { flags: { 2: F_WH_DO, 3: "“you” = tau: reikėti takes the dative." } }),
    ],
    support_yes: [
      t("Absolutely. | I | can | do | that.", "Žinoma. | Aš | galiu | padaryti | tai.", "Žinoma. Tai galiu padaryti."),
      t("Deal. | Let's | put | it | in | the | plan.", "Sutarta. | — | Įrašykime | tai | į | — | planą.", "Sutarta. Įrašykime tai į planą.", { flags: { 1: F_LETS } }),
    ],
    support_offer: [
      t("Well, | I | can | give | you | feedback | after | every | client | meeting.", "Na, | aš | galiu | pasakyti | tau | pastabų | po | kiekvieno | klientų | susitikimo.",
        "Na, po kiekvieno susitikimo su klientu galiu tau pasakyti pastabų.", { flags: { 3: F_GIVE_FB } }),
    ],
    support_none: [
      t("Okay. | If | you | need | anything, | just | ask.", "Gerai. | Jei | tau | reikės | ko nors, | tiesiog | paklausk.", "Gerai. Jei ko nors prireiks – tiesiog paklausk.",
        { flags: { 2: "“you” = tau: reikėti takes the dative.", 3: "A condition about the future: Lithuanian uses the future reikės." } }),
    ],

    // --- the role reversal ----------------------------------------------------------------------------------------
    rev_ask: [
      t("Before | we | wrap up... | can | I | ask | you | for | some | feedback? | On | me, | as | a | manager.",
        "Prieš | mums | baigiant... | ar galiu | aš | paprašyti | tavęs | — | kelių | pastabų? | Apie | mane, | kaip | — | vadovę.",
        "Prieš baigiant… ar galiu paprašyti tavęs kelių pastabų? Apie mane kaip vadovę.",
        { flags: { 1: "“we” = mums: the dative goes with the participle baigiant.", 7: "“for”: the genitive kelių pastabų carries it." } }),
    ],
    rev_ask2: [t("Be | honest. | I | can take it.", "Būk | {m:atviras|f:atvira}. | Aš | atlaikysiu.", "Būk {m:atviras|f:atvira}. Atlaikysiu.")],
    rev_start: [
      t("Start | with | what's | working, | if | anything.", "Pradėk | nuo | to, kas | veikia, | jei | kas nors.", "Pradėk nuo to, kas veikia… jei apskritai kas nors veikia.",
        { flags: { 2: "“what's … working”: to, kas + the present veikia (the progressive has no word)." } }),
      t("Okay. | What's | working?", "Gerai. | Kas | veikia?", "Gerai. Kas veikia gerai?", { flags: { 1: "“'s” (progressive): the present veikia carries it." } }),
    ],
    rev_worked_again: [t("Anything | at all? | Please | say | yes.", "Bet kas | apskritai? | Prašau, | pasakyk | taip.", "Bent kas nors? Prašau, pasakyk, kad taip.")],
    rev_worked_react: [
      t("Oh. | That's | really | nice | to hear.", "O. | Tai yra | tikrai | malonu | girdėti.", "O. Tikrai malonu girdėti."),
      t("Thank | you. | I | didn't know | that | helped.", "Ačiū | tau. | Aš | nežinojau, | kad tai | padėjo.", "Ačiū. Nežinojau, kad tai padėjo.",
        { flags: { 4: "“that” = kad tai: the conjunction kad plus the subject tai." } }),
    ],
    rev_one: [t("And | one | thing | I | could | try?", "O | vienas | dalykas, kurį | aš | galėčiau | pabandyti?", "O vienas dalykas, kurį galėčiau pabandyti?", { flags: { 2: F_KURI } })],
    rev_something: [
      t("There | must | be | something.", "— | Turi | būti | kas nors.", "Turi būti kažkas.", { flags: { 0: "Existential “there” has no Lithuanian word." } }),
    ],
    rev_giveup: [
      t("Okay. | If | you | think | of | something, | my | door's | open.", "Gerai. | Jei | tu | sugalvosi | — | ką nors, | mano | durys | atviros.",
        "Gerai. Jei ką nors sugalvosi – mano durys atviros.",
        { flags: { 3: "A condition about the future: Lithuanian uses the future sugalvosi.", 4: "“of” (think of): sugalvoti takes a direct object.", 7: "“'s” (is): no copula." } }),
    ],
    rev_hadnt: [
      t("I | hadn't thought | of | it | that way. | Thank | you.", "Aš | nebuvau pagalvojusi | apie | tai | taip. | Ačiū | tau.", "Taip apie tai nebuvau pagalvojusi. Ačiū tau."),
      t("Huh. | I | hadn't thought | of | it | that way. | Thanks, | that's | really | helpful.", "Hm. | Aš | nebuvau pagalvojusi | apie | tai | taip. | Ačiū, | tai yra | tikrai | naudinga.",
        "Hm. Taip apie tai nebuvau pagalvojusi. Ačiū, tai tikrai naudinga."),
    ],
    rev_tip_late_email: [t("The | late-night | emails. | Yeah. | That's | fair.", "— | Vėlyvi | laiškai. | Taip. | Tai | teisinga.", "Vėlyvi laiškai. Taip. Pagrįsta pastaba.")],
    rev_tip_priorities: [
      t("Clearer | priorities. | You're | right, | everything | feels | urgent | right now.", "Aiškesni | prioritetai. | Tu esi | {m:teisus|f:teisi}, | viskas | atrodo | skubu | dabar.",
        "Aiškesni prioritetai. Tu {m:teisus|f:teisi} – dabar viskas atrodo skubu."),
    ],
    rev_tip_one_on_ones: [
      t("Regular | one-on-ones. | Okay. | Every | other | week, | then.", "Reguliarūs | pokalbiai akis į akį. | Gerai. | Kas | antrą | savaitę, | tada.", "Reguliarūs pokalbiai akis į akį. Gerai. Tada kas antrą savaitę."),
    ],
    rev_tip_shorter_meetings: [t("Shorter | meetings. | Noted. | I'll start | today.", "Trumpesni | susitikimai. | Pasižymėjau. | Pradėsiu | šiandien.", "Trumpesni susitikimai. Pasižymėjau. Pradėsiu nuo šiandien.")],
    rev_tip_more_feedback: [t("More | feedback. | From | me? | That's | brave.", "Daugiau | grįžtamojo ryšio. | Iš | manęs? | Tai | drąsu.", "Daugiau grįžtamojo ryšio? Iš manęs? Drąsu.")],
    rev_tip_other: [t("Okay. | That's | fair.", "Gerai. | Tai | teisinga.", "Gerai. Pagrįsta pastaba.")],
    rev_will: [t("I'll work | on | that.", "Padirbėsiu | prie | to.", "Prie to padirbėsiu.")],
    rev_ouch: [
      t("Ouch. | Okay... | what's | one | thing | I | could | do | differently?", "Oi. | Gerai... | koks yra | vienas | dalykas, kurį | aš | galėčiau | daryti | kitaip?",
        "Oi. Gerai… o koks vienas dalykas, kurį galėčiau daryti kitaip?", { flags: { 4: F_KURI } }),
    ],
    rev_decline_react: [t("That's | okay. | Maybe | next | time.", "Tai yra | gerai. | Gal | kitą | kartą.", "Nieko tokio. Gal kitą kartą.")],

    // --- questions, money -------------------------------------------------------------------------------------------
    askme_ask: [
      t("Okay, | that's | everything | on | my | list. | Is | there | anything | you | want | to ask | me?",
        "Gerai, | tai yra | viskas | — | mano | sąraše. | Ar yra | — | ko nors, | ko tu | nori | paklausti | manęs?",
        "Gerai, tai viskas, kas buvo mano sąraše. Ar nori manęs ko nors paklausti?",
        { flags: { 3: "“on”: the locative sąraše carries it (mano stands between).", 7: "Existential “there” has no Lithuanian word; yra (under “Is”) carries it.", 9: "Zero relative: English leaves out “that”; Lithuanian needs ko." } }),
      t("That's | it | from | me. | Your | turn: | any | questions | for | me?", "Tai | viskas | iš | manęs. | Tavo | eilė: | kokių nors | klausimų | — | man?",
        "Tiek iš manęs. Tavo eilė: turi man klausimų?", { flags: { 1: "“it” = viskas here.", 8: "“for”: the dative man carries it." } }),
    ],
    askme_else: [t("Anything | else?", "Kas nors | dar?", "Dar kas nors?")],
    askme_go: [t("Sure, | go ahead.", "Žinoma, | klausk.", "Žinoma, klausk.")],
    money_q: [
      t("Fair | question.", "Pagrįstas | klausimas.", "Pagrįstas klausimas."),
      t("Good | question.", "Geras | klausimas.", "Geras klausimas."),
    ],
    money_later: [
      t("Let's | come | back | to | it | at the end.", "— | Grįžkime | — | prie | to | pabaigoje.", "Grįžkime prie to pabaigoje.",
        { flags: { 0: F_LETS, 2: "“back”: grįžkime (under “come”) carries it." } }),
    ],
    money_back: [t("Now, | your | salary | question.", "Dabar, | tavo | atlyginimo | klausimas.", "O dabar – tavo klausimas apie atlyginimą.")],
    money_noted: [t("Okay. | Noted.", "Gerai. | Pasižymėjau.", "Gerai. Pasižymėjau.")],
    money_when: [
      t("Salary | decisions | happen | next | month, | after | the | reviews.", "Atlyginimų | sprendimai | priimami | kitą | mėnesį, | po | — | pokalbių.",
        "Sprendimai dėl atlyginimų priimami kitą mėnesį, po vertinimo pokalbių."),
      t("Salary | decisions | happen | next | month, | once | all | the | reviews | are | done.",
        "Atlyginimų | sprendimai | priimami | kitą | mėnesį, | kai tik | visi | — | pokalbiai | bus | baigti.",
        "Sprendimai dėl atlyginimų priimami kitą mėnesį, kai tik baigsis visi vertinimo pokalbiai.",
        { flags: { 9: "A condition about the future: Lithuanian uses the future bus." } }),
    ],
    criteria_honest: [t("Honestly? | I | don't know | yet.", "Atvirai? | Aš | nežinau | dar.", "Atvirai? Dar nežinau.")],
    criteria_volunteer: [
      t("And | if | you're wondering | what | counts: | honestly, | I'm | not | sure | yet.", "Ir | jei | tau įdomu, | kas | svarbu: | atvirai, | aš | nesu | tikra | dar.",
        "O jei tau įdomu, kas lemia sprendimą – atvirai, dar nesu tikra.", { flags: { 7: F_IM_NOT } }),
    ],
    criteria_why: [
      t("The | form | has | ratings, | but | nobody's | told | me | how | they | connect | to | pay.", "— | Forma | turi | įvertinimus, | bet | niekas | nepasakė | man, | kaip | jie | susiję | su | atlyginimu.",
        "Formoje yra įvertinimai, bet niekas man nepasakė, kaip jie susiję su atlyginimu.",
        { flags: { 5: "“'s” (has): the past tense nepasakė carries it.", 6: "After niekas Lithuanian negates the verb too: nepasakė.", 10: "“connect” = susiję (are connected)." } }),
    ],
    criteria_promise: [
      t("Let | me | find out. | I'll get | back | to | you | by | Friday.", "Leisk | man | išsiaiškinti. | Atsakysiu | — | — | tau | iki | penktadienio.",
        "Leisk man išsiaiškinti. Atsakysiu tau iki penktadienio.",
        { flags: { 4: "“back” (get back to someone): atsakysiu (under “I'll get”) carries it.", 5: "“to”: the dative tau carries it." } }),
    ],

    // --- the closing --------------------------------------------------------------------------------------------------
    sum_intro: [
      t("Okay. | Let | me | sum up.", "Gerai. | Leisk | man | apibendrinti.", "Gerai. Apibendrinsiu."),
      t("Okay, | so, | to sum up.", "Gerai, | taigi, | apibendrinant.", "Gerai, taigi apibendrinant."),
    ],
    sum_agenda: [t("Your | sections | go | on | the | agenda, | with | your | name.", "Tavo | dalys | įrašomos | į | — | darbotvarkę, | su | tavo | vardu.", "Tavo dalys įrašomos į darbotvarkę su tavo vardu.")],
    sum_speak: [t("You'll speak | up | earlier | in | client | meetings.", "Prabilsi | — | anksčiau | per | klientų | susitikimus.", "Per susitikimus su klientais prabilsi anksčiau.",
      { flags: { 1: "“up” (speak up): prabilsi carries it." } })],
    sum_goal: [t("Your | goal: | {X}.", "Tavo | tikslas: | {X:nom}.", "Tavo tikslas – {X:nom}.")],
    sum_lead: [t("Your | goal: | leading | a | small | project.", "Tavo | tikslas: | vadovauti | — | mažam | projektui.", "Tavo tikslas – vadovauti mažam projektui.")],
    sum_budget: [
      t("You'll use | the | training | budget | for | the | course.", "Panaudosi | — | mokymų | biudžetą | — | — | kursui.", "Mokymų biudžetą panaudosi kursui.",
        { flags: { 4: "“for”: the dative kursui carries it." } }),
    ],
    sum_friday: [t("And | I | owe | you | an | answer | by | Friday.", "Ir | aš | esu skolinga | tau | — | atsakymą | iki | penktadienio.", "O aš tau skolinga atsakymą iki penktadienio.")],
    sum_anything: [
      t("Anything | else?", "Kas nors | dar?", "Dar kas nors?"),
      t("Did | I | miss | anything?", "Ar | aš | praleidau | ką nors?", "Ar ką nors praleidau?"),
    ],
    anything_thanks: [t("I'm | glad | it | helped.", "Aš | džiaugiuosi, | kad tai | padėjo.", "Džiaugiuosi, kad padėjo.", { flags: { 0: "“'m” + glad = the verb džiaugtis (under “glad”): no copula.", 2: F_KAD } })],
    checkin_ask: [
      t("Then | let's | check in | again | in a month. | Same | time?", "Tada | — | pasikalbėkime | vėl | po mėnesio. | Tuo pačiu | laiku?", "Tada vėl pasikalbėkime po mėnesio. Tuo pačiu laiku?",
        { flags: { 1: F_LETS } }),
      t("Let's | check in | again | in a month, | okay?", "— | Pasikalbėkime | vėl | po mėnesio, | gerai?", "Vėl pasikalbėkime po mėnesio, gerai?", { flags: { 0: F_LETS } }),
    ],
    checkin_early: [t("Definitely. | Let's | do | that.", "Žinoma. | — | Padarykime | taip.", "Žinoma. Taip ir padarykime.", { flags: { 1: F_LETS } })],
    checkin_like_said: [t("And | we | check in | again | in a month, | like | you | said.", "Ir | mes | pasikalbame | vėl | po mėnesio, | kaip | tu | sakei.", "Ir, kaip sakei, vėl pasikalbame po mėnesio.")],
    checkin_like_said_weeks: [
      t("And | we | check in | again | in a few weeks, | like | you | said.", "Ir | mes | pasikalbame | vėl | po kelių savaičių, | kaip | tu | sakei.", "Ir, kaip sakei, vėl pasikalbame po kelių savaičių."),
    ],
    checkin_like_said_other: [
      t("And | we | check in | again | soon, | like | you | said. | I'll send | you | an | invite.", "Ir | mes | pasikalbame | vėl | netrukus, | kaip | tu | sakei. | Atsiųsiu | tau | — | kvietimą.",
        "Ir, kaip sakei, netrukus vėl pasikalbame. Atsiųsiu tau kvietimą."),
    ],
    checkin_when: [
      t("Good | question. | Let's | set | that | at the end.", "Geras | klausimas. | — | Nustatykime | tai | pabaigoje.", "Geras klausimas. Tai nustatykime pabaigoje.", { flags: { 2: F_LETS } }),
    ],
    checkin_other: [
      t("Okay. | I'll send | you | an | invite, | and | you | pick | the | time.", "Gerai. | Atsiųsiu | tau | — | kvietimą, | o | tu | pasirinksi | — | laiką.",
        "Gerai. Atsiųsiu tau kvietimą, o laiką pasirinksi tu.", { flags: { 7: "Present for the future: Lithuanian uses the future pasirinksi." } }),
    ],
    bye_good: [
      t("Perfect. | Thanks | for | today. | Really.", "Puiku. | Ačiū | už | šiandieną. | Tikrai.", "Puiku. Ačiū už šiandieną. Tikrai."),
      t("Great. | This | was | a | good | one. | Thank | you.", "Puiku. | Tai | buvo | — | geras | pokalbis. | Ačiū | tau.", "Puiku. Geras buvo pokalbis. Ačiū tau.",
        { flags: { 5: "“one” = pokalbis (the conversation)." } }),
    ],
    bye_plant: [t("And | sorry | again | about | the | plant.", "Ir | atsiprašau | dar kartą | dėl | — | augalo.", "Ir dar kartą atsiprašau dėl augalo.")],
    bye_partial: [t("Okay. | Thanks | for | today.", "Gerai. | Ačiū | už | šiandieną.", "Gerai. Ačiū už šiandieną.")],
    bye_early: [
      t("Oh! | Okay. | Let's | finish | another | time, | then.", "O! | Gerai. | — | Baikime | kitą | kartą, | tada.", "O! Gerai. Tada baikime kitą kartą.", { flags: { 2: F_LETS } }),
    ],
  },

  hints: {
    plant: {
      lt: "Paklausti, ar viskas gerai, ar pasiūlyti pagalbą",
      items: [
        { id: "are_you_ok", s: t("Are | you | okay?", "Ar | tau | viskas gerai?", "Ar tau viskas gerai?", { flags: { 1: "“you” = tau: Lithuanian asks whether everything is fine for you." } }) },
        { id: "can_i_help", s: t("Can | I | help?", "Ar galiu | aš | padėti?", "Gal padėti?") },
        { id: "dont_worry_plant", s: t("Don't worry | about | it.", "Nesijaudink | dėl | to.", "Nesijaudink dėl to.") },
      ],
    },
    feeling: {
      lt: "Pasakyti, kaip jautiesi prieš pokalbį",
      items: [
        { id: "bit_nervous", s: t("Honestly? | A little | nervous.", "Atvirai? | Truputį | {m:susijaudinęs|f:susijaudinusi}.", "Atvirai? Truputį jaudinuosi.") },
        { id: "fine", s: t("I'm | fine, | thanks.", "Man | gerai, | ačiū.", "Gerai, ačiū.", { flags: { 0: "“I'm fine” = man gerai: Lithuanian uses the dative." } }) },
        { id: "curious", s: t("A | bit | curious, | actually.", "— | Šiek tiek | smalsu, | tiesą sakant.", "Tiesą sakant, šiek tiek smalsu.", { flags: { 0: "“A bit”: šiek tiek (under “bit”) carries it." } }) },
        { id: "looking_forward", s: t("I'm looking | forward | to | it.", "Laukiu | — | — | jo.", "Laukiu šio pokalbio.",
          { flags: { 1: "“forward” (look forward to): laukiu carries it.", 2: "“to”: the genitive jo carries it." } }) },
      ],
    },
    proud: {
      lt: "Papasakoti, kuo šiais metais didžiuojiesi", slot: "win", examples: ["guide", "launch", "survey", "rescue"],
      items: [
        { id: "most_proud", s: t("I'm | most | proud | of | the | {X}.", "Aš | labiausiai | didžiuojuosi | — | — | {X:ins}.", "Labiausiai didžiuojuosi {X:ins}.", { flags: { 0: F_PROUD, 3: F_OF_INS } }),
          only: (e) => !e.attrs?.act },
        { id: "most_proud", s: t("I'm | most | proud | of | helping | the | {X}.", "Aš | labiausiai | didžiuojuosi | — | tuo, kad padėjau | — | {X:dat}.", "Labiausiai didžiuojuosi tuo, kad padėjau {X:dat}.",
          { flags: { 0: F_PROUD, 3: "“of + -ing” = tuo, kad + a finite verb (under “helping”)." } }), only: (e) => e.attrs?.act === "help" },
        { id: "most_proud", s: t("I'm | most | proud | of | rescuing | the | {X}.", "Aš | labiausiai | didžiuojuosi | — | tuo, kad išgelbėjau | — | {X:acc}.", "Labiausiai didžiuojuosi tuo, kad išgelbėjau {X:acc}.",
          { flags: { 0: F_PROUD, 3: "“of + -ing” = tuo, kad + a finite verb (under “rescuing”)." } }), only: (e) => e.attrs?.act === "rescue" },
        { id: "probably", s: t("Probably | the | {X}.", "Turbūt | — | {X:nom}.", "Turbūt {X:nom}."), only: (e) => !e.attrs?.act },
        { id: "probably", s: t("Probably | helping | the | {X}.", "Turbūt | tai, kad padėjau | — | {X:dat}.", "Turbūt tai, kad padėjau {X:dat}."), only: (e) => e.attrs?.act === "help" },
        { id: "went_well", s: t("I | think | the | {X} | went | really | well.", "Aš | manau, | kad | {X:nom} | pavyko | labai | gerai.", "Manau, kad {X:nom} labai gerai pavyko.",
          { flags: { 2: "Zero “that”: kad stands under the article, which has no word." } }), only: (e) => !e.attrs?.act },
      ],
    },
    made: {
      lt: "Paaiškinti, kas lėmė sėkmę",
      items: [
        { id: "team_effort", s: t("It | was | a | team | effort.", "Tai | buvo | — | komandinis | darbas.", "Tai buvo komandinis darbas.") },
        { id: "planned_early", s: t("We | planned | everything | early.", "Mes | suplanavome | viską | anksti.", "Viską suplanavome iš anksto.") },
        { id: "listened_users", s: t("I | listened | to | the | users.", "Aš | klausiausi | — | — | naudotojų.", "Klausiausi naudotojų.", { flags: { 2: "“to”: the genitive naudotojų carries it." } }) },
        { id: "asked_questions", s: t("I | asked | a lot | of | questions.", "Aš | uždaviau | daug | — | klausimų.", "Uždaviau daug klausimų.", { flags: { 3: "“of”: the genitive klausimų carries it." } }) },
      ],
    },
    praise: {
      lt: "Priimti pagyrimą",
      items: [
        { id: "means_lot", s: t("Thank | you, | that | means | a lot.", "Ačiū | tau, | tai | reiškia | daug.", "Ačiū, man tai daug reiškia."),
          note: "Amerikiečiai pagyrimą tiesiog priima – be „ai, nieko ypatingo“." },
        { id: "appreciate_that", s: t("Thanks, | I | really | appreciate | that.", "Ačiū, | aš | labai | vertinu | tai.", "Ačiū, labai tai vertinu.") },
        { id: "team_effort", s: t("Thanks! | It | was | a | team | effort.", "Ačiū! | Tai | buvo | — | komandinis | darbas.", "Ačiū! Tai buvo komandinis darbas.") },
        { id: "glad_helped", s: t("I'm | glad | it | helped.", "Aš | džiaugiuosi, | kad tai | padėjo.", "Džiaugiuosi, kad tai padėjo.",
          { flags: { 0: "“'m” + glad = the verb džiaugtis (under “glad”): no copula.", 2: F_KAD } }) },
      ],
    },
    consent: {
      lt: "Sutikti išklausyti pastabą",
      items: [
        { id: "sure_go_ahead", s: t("Sure, | go ahead.", "Žinoma, | sakyk.", "Žinoma, sakyk.") },
        { id: "listening", s: t("Of course. | I'm listening.", "Žinoma. | Klausau.", "Žinoma. Klausau.") },
        { id: "be_honest", s: t("Yes, | please. | Be | honest.", "Taip, | prašau. | Būk | atvira.", "Taip, prašau. Būk atvira.") },
        { id: "can_take", s: t("I | can take it.", "Aš | atlaikysiu.", "Atlaikysiu."), note: "Iš dainos: „I can take it now.“ Taip sakoma, kai kritikos nebijai." },
      ],
    },
    receive: {
      lt: "Priimti pastabą",
      items: [
        { id: "thanks_helpful", s: t("Thanks, | that's | really | helpful.", "Ačiū, | tai yra | tikrai | naudinga.", "Ačiū, tai tikrai naudinga."), note: "Dainos frazė." },
        { id: "work_on_that", s: t("I'll work | on | that.", "Padirbėsiu | prie | to.", "Prie to padirbėsiu."), note: "Dainos frazė." },
        { id: "thats_fair", s: t("That's | fair.", "Tai yra | teisinga.", "Tai teisinga pastaba.") },
        { id: "thanks_for_fb", s: t("Thanks | for | the | feedback.", "Ačiū | už | — | pastabas.", "Ačiū už pastabas.") },
        { id: "fair_enough", s: t("Fair enough.", "Sutinku.", "Sutinku.") },
        { id: "see_what_mean", s: t("I | see | what | you | mean.", "Aš | suprantu, | ką | tu | turi omenyje.", "Suprantu, ką turi omenyje.", { flags: { 1: "“see” here = suprasti." } }) },
        { id: "speak_up_more", s: t("I'll speak | up | earlier | next | time.", "Prabilsiu | — | anksčiau | kitą | kartą.", "Kitą kartą prabilsiu anksčiau.",
          { flags: { 1: "“up” (speak up): prabilsiu carries it." } }) },
        { id: "youre_right", s: t("You're | right.", "Tu esi | teisi.", "Tu teisi.") },
      ],
    },
    example: {
      lt: "Paprašyti pavyzdžio",
      items: [
        { id: "give_example", s: t("Could | you | give | me | an | example?", "Ar galėtum | tu | duoti | man | — | pavyzdį?", "Gal galėtum duoti pavyzdį?", { flags: { 0: F_COULD_Q } }),
          note: "Dainos frazė." },
        { id: "which_meetings", s: t("Which | meetings | do | you | mean?", "Kuriuos | susitikimus | — | tu | turi omenyje?", "Kuriuos susitikimus turi omenyje?", { flags: { 2: F_WH_DO } }) },
      ],
    },
    pushback: {
      lt: "Mandagiai paaiškinti savo pusę",
      items: [
        { id: "see_differently", s: t("I | see | it | a bit | differently.", "Aš | matau | tai | šiek tiek | kitaip.", "Aš į tai žiūriu kiek kitaip."), register: "polite",
          note: "Mandagiai nesutikti: pirma švelni frazė, tada faktai – be kaltinimų." },
        { id: "you_presented", s: t("In | those | meetings, | you | presented | my | sections.", "— | Tuose | susitikimuose, | tu | pristatei | mano | dalis.", "Per tuos susitikimus mano dalis pristatei tu.",
          { flags: { 0: "“in”: the locative tuose susitikimuose carries it." } }) },
        { id: "client_late", s: t("The | client | was | late, | remember?", "— | Klientas | buvo | pavėlavęs, | prisimeni?", "Klientas buvo pavėlavęs, prisimeni?") },
        { id: "no_chance", s: t("To be fair, | I | didn't get | the | chance.", "Tiesą sakant, | aš | negavau | — | progos.", "Tiesą sakant, neturėjau progos.") },
      ],
    },
    protect: {
      lt: "Pasiūlyti, kaip apsaugoti savo kalbėjimo laiką",
      items: [
        { id: "put_agenda", s: t("Could | we | put | my | sections | on | the | agenda?", "Ar galėtume | mes | įrašyti | mano | dalis | į | — | darbotvarkę?", "Gal galėtume mano dalis įrašyti į darbotvarkę?",
          { flags: { 0: F_COULD_Q } }) },
        { id: "present_own", s: t("Could | I | present | my | own | slides?", "Ar galėčiau | aš | pristatyti | savo | — | skaidres?", "Ar galėčiau {m:pats|f:pati} pristatyti savo skaidres?",
          { flags: { 0: F_COULD_Q, 4: "“own”: savo already says it." } }) },
        { id: "keep_slot", s: t("Can | we | keep | my | slot, | even | if | the | client | is | late?", "Ar galime | mes | palikti | mano | laiką, | net | jei | — | klientas | — | vėluoja?",
          "Ar galime palikti man skirtą laiką, net jei klientas vėluoja?", { flags: { 9: "“is late” = the verb vėluoti: no copula." } }) },
        { id: "prep_call", s: t("Maybe | a | quick | prep | call | before | the | meeting?", "Gal | — | trumpas | pasiruošimo | skambutis | prieš | — | susitikimą?", "Gal trumpas pasiruošimo skambutis prieš susitikimą?") },
      ],
    },
    tab: {
      lt: "Taktiškai pasakyti, kad ekrane – kito žmogaus vertinimas",
      items: [
        { id: "someone_else", s: t("I | think | that's | someone | else's | review | on | the | screen.", "Aš | manau, | kad tai yra | kažkieno | kito | vertinimas | — | — | ekrane.",
          "Man atrodo, ekrane – kažkieno kito vertinimas.", { flags: { 2: F_KAD, 6: "“on”: the locative ekrane carries it." } }), register: "polite",
          note: "Kolegos duomenų garsiai neskaityk – užtenka pasakyti, kad tai ne tavo." },
        { id: "not_mine", s: t("Sorry, | I | don't think | that | one's | mine.", "Atsiprašau, | aš | nemanau, | kad šitas | — | mano.", "Atsiprašau, man atrodo, šitas – ne mano.",
          { flags: { 3: F_KAD, 4: "“one's” (one is): no word; šitas stands alone, with no copula." } }) },
        { id: "wrong_tab", s: t("I | think | you | have | the | wrong | tab | open.", "Aš | manau, | kad tu | turi | — | ne tą | skirtuką | atidarytą.", "Man atrodo, atidarei ne tą skirtuką.", { flags: { 2: F_KAD } }) },
      ],
    },
    goals: {
      lt: "Pasakyti, ką norėtum tobulinti kitais metais", slot: "goal", examples: ["presenting", "ux_writing", "leading", "mentoring"],
      items: [
        { id: "work_on", s: t("I'd like | to work | on | {X}.", "Norėčiau | patobulinti | — | {X:acc}.", "Norėčiau patobulinti {X:acc}.", { flags: { 2: "“on” (work on): patobulinti takes a direct object." } }),
          only: (e) => e.attrs?.kind === "skill" || e.attrs?.kind === "course" },
        { id: "take_course", s: t("I'd like | to take | a | course | in | {X}.", "Norėčiau | išklausyti | — | kursą | — | {X:gen}.", "Norėčiau išklausyti {X:gen} kursą.",
          { flags: { 4: "“in”: the genitive (… kursą) carries it." } }), only: (e) => e.attrs?.kind === "course" },
        { id: "course_q", s: t("Maybe | a | {X} | course?", "Gal | — | {X:gen} | kursą?", "Gal {X:gen} kursą?"), only: (e) => e.attrs?.kind === "course" },
        { id: "present_more", s: t("I'd like | to present | more | to | clients.", "Norėčiau | pristatinėti | daugiau | — | klientams.", "Norėčiau daugiau pristatinėti klientams.",
          { flags: { 3: "“to”: the dative klientams carries it." } }), only: (e) => e.attrs?.kind === "skill" },
        { id: "lead_project", s: t("I'd like | to lead | a | {X}.", "Norėčiau | vadovauti | — | {X:dat}.", "Norėčiau vadovauti {X:dat}."), only: (e) => e.attrs?.kind === "lead" },
        { id: "more_mentoring", s: t("I'd like | to do | more | {X}.", "Norėčiau | užsiimti | daugiau | {X:ins}.", "Norėčiau daugiau užsiimti {X:ins}."), only: (e) => e.attrs?.kind === "mentor" },
      ],
    },
    support: {
      lt: "Paprašyti paramos tikslui",
      items: [
        { id: "training_budget", s: t("Is | there | a | training | budget?", "Ar yra | — | — | mokymų | biudžetas?", "Ar yra mokymų biudžetas?",
          { flags: { 1: "Existential “there” has no Lithuanian word; yra (under “Is”) carries it." } }) },
        { id: "practice_before", s: t("Could | we | practice | before | client | meetings?", "Ar galėtume | mes | pasipraktikuoti | prieš | klientų | susitikimus?",
          "Gal galėtume pasipraktikuoti prieš susitikimus su klientais?", { flags: { 0: F_COULD_Q } }) },
        { id: "regular_feedback", s: t("Some | regular | feedback | would | help.", "Kelios | reguliarios | pastabos | — | padėtų.", "Padėtų reguliarios pastabos.", { flags: { 3: F_WOULD } }) },
        { id: "time_course", s: t("Could | I | get | some | time | for | the | course?", "Ar galėčiau | aš | gauti | — | laiko | — | — | kursui?", "Ar galėčiau gauti laiko kursui?",
          { flags: { 0: F_COULD_Q, 3: "“some”: the genitive laiko carries it.", 5: "“for”: the dative kursui carries it." } }) },
      ],
    },
    rev_open: {
      lt: "Sutikti duoti Emilei pastabų",
      items: [
        { id: "happy_to", s: t("Sure, | I'd be happy to.", "Žinoma, | mielai.", "Žinoma, mielai.") },
        { id: "honest_ok", s: t("Of course. | Can | I | be | honest?", "Žinoma. | Ar galiu | aš | būti | {m:atviras|f:atvira}?", "Žinoma. Ar galiu būti {m:atviras|f:atvira}?") },
      ],
    },
    rev_worked: {
      lt: "Pasakyti, kas Emilei gerai sekasi", slot: "mgood", examples: ["open_door", "calm", "honesty", "support"],
      items: [
        { id: "rev_worked", s: t("What | worked | really | well | was | your | {X}.", "Kas | pasiteisino | labai | gerai, | tai | tavo | {X:nom}.", "Kas tikrai pasiteisino – tai tavo {X:nom}.",
          { flags: { 4: F_CLEFT } }), only: (e) => !e.attrs?.enPl, note: "Dainos frazė: pirmiausia – kas pavyko." },
        { id: "rev_worked", s: t("What | worked | really | well | were | your | {X}.", "Kas | pasiteisino | labai | gerai, | tai | tavo | {X:nom}.", "Kas tikrai pasiteisino – tai tavo {X:nom}.",
          { flags: { 4: "“were” in this cleft sentence = tai." } }), only: (e) => !!e.attrs?.enPl },
        { id: "rev_appreciate", s: t("I | really | appreciate | your | {X}.", "Aš | labai | vertinu | tavo | {X:acc}.", "Labai vertinu tavo {X:acc}.") },
        { id: "great_listener", s: t("You're | a | great | listener.", "Tu esi | — | puiki | klausytoja.", "Tu puikiai moki išklausyti.") },
        { id: "door_open", s: t("Your | door | is | always | open.", "Tavo | durys | yra | visada | atviros.", "Tavo durys visada atviros.") },
      ],
    },
    rev_try: {
      lt: "Pasiūlyti vieną dalyką, kurį ji galėtų pabandyti", slot: "mtip", examples: ["priorities", "one_on_ones", "late_email", "shorter_meetings"],
      items: [
        { id: "rev_one_thing", s: t("One | thing | you | could | try | is | {X}.", "Vienas | dalykas, kurį | tu | galėtum | pabandyti, | tai | {X:nom}.", "Vienas dalykas, kurį galėtum pabandyti, – {X:nom}.",
          { flags: { 1: F_KURI, 5: F_IS_TAI } }), note: "Dainos frazė: po to, kas pavyko – vienas dalykas pabandyti." },
        { id: "since_ask", s: t("Well, | since | you | ask, | one | thing | you | could | try | is | {X}.", "Na, | kadangi | tu | klausi, | vienas | dalykas, kurį | tu | galėtum | pabandyti, | tai | {X:nom}.",
          "Na, jei jau klausi, vienas dalykas, kurį galėtum pabandyti, – {X:nom}.", { flags: { 5: F_KURI, 9: F_IS_TAI } }), note: "Iš dainos: „Well, since you ask…“" },
        { id: "maybe_x", s: t("Maybe | {X}?", "Gal | {X:nom}?", "Gal {X:nom}?") },
        { id: "id_suggest", s: t("I'd | suggest | {X}.", "Aš | siūlyčiau | {X:acc}.", "Siūlyčiau {X:acc}.", { flags: { 0: "“'d” (would): the conditional siūlyčiau carries it." } }),
          only: (e) => !e.attrs?.fixed, note: "Iš istorijos: „I'd suggest…“ – švelnus patarimas." },
        { id: "thought_about", s: t("Have | you | thought | about | {X}?", "Ar | tu | pagalvojai | apie | {X:acc}?", "Ar pagalvojai apie {X:acc}?",
          { flags: { 0: "Perfect question “Have” = ar; the past tense of pagalvojai carries it." } }), only: (e) => !e.attrs?.fixed },
      ],
    },
    askme: {
      lt: "Paklausti apie atlyginimą ar paaukštinimą",
      items: [
        { id: "ask_salary", s: t("Can | we | talk | about | my | salary?", "Ar galime | mes | pakalbėti | apie | mano | atlyginimą?", "Ar galime pakalbėti apie mano atlyginimą?") },
        { id: "affect_pay", s: t("Will | this | review | affect | my | pay?", "Ar | šis | pokalbis | paveiks | mano | atlyginimą?", "Ar šis pokalbis turės įtakos mano atlyginimui?",
          { flags: { 0: "Question “Will” = ar; the future paveiks carries it." } }) },
        { id: "promotion_need", s: t("What | would | I | need | to do | to get | a | promotion?", "Ką | — | man | reikėtų | padaryti, | kad gaučiau | — | paaukštinimą?",
          "Ką turėčiau padaryti, kad gaučiau paaukštinimą?",
          { flags: { 1: "“would”: the conditional reikėtų carries it.", 2: "“I” = man: reikėti takes the dative.", 5: "“to get” (purpose) = kad + the conditional gaučiau." } }) },
        { id: "no_thats_all", s: t("No, | I | think | that's | all.", "Ne, | aš | manau, | kad tai yra | viskas.", "Ne, manau, kad tai viskas.", { flags: { 3: F_KAD } }) },
      ],
    },
    criteria: {
      lt: "Paklausti, kas lemia sprendimą",
      items: [
        { id: "promotion_need", s: t("What | would | I | need | to do | to get | a | promotion?", "Ką | — | man | reikėtų | padaryti, | kad gaučiau | — | paaukštinimą?",
          "Ką turėčiau padaryti, kad gaučiau paaukštinimą?",
          { flags: { 1: "“would”: the conditional reikėtų carries it.", 2: "“I” = man: reikėti takes the dative.", 5: "“to get” (purpose) = kad + the conditional gaučiau." } }) },
        { id: "exceeds", s: t("Could | you | give | me | an | example | of | what | “exceeds | expectations” | means | here?",
          "Ar galėtum | tu | duoti | man | — | pavyzdį, | — | ką | „viršija | lūkesčius“ | reiškia | čia?", "Gal galėtum duoti pavyzdį, ką čia reiškia „viršija lūkesčius“?",
          { flags: { 0: F_COULD_Q, 6: "“of”: no word; pavyzdį, ką … (an example of what)." } }), note: "Iš istorijos „The Box Marked Potential“." },
        { id: "how_decided", s: t("How | are | salary | decisions | made?", "Kaip | — | atlyginimų | sprendimai | priimami?", "Kaip priimami sprendimai dėl atlyginimų?",
          { flags: { 1: "Passive “are”: priimami carries it." } }) },
      ],
    },
    closing: {
      lt: "Padėkoti ir užbaigti pokalbį",
      items: [
        { id: "no_thats_all", s: t("No, | I | think | that's | all.", "Ne, | aš | manau, | kad tai yra | viskas.", "Ne, manau, kad tai viskas.", { flags: { 3: F_KAD } }) },
        { id: "thanks_helpful", s: t("Thanks, | that's | really | helpful.", "Ačiū, | tai yra | tikrai | naudinga.", "Ačiū, tai tikrai naudinga.") },
        { id: "check_again", s: t("Can | we | check in | again | next | month?", "Ar galime | mes | pasikalbėti | vėl | kitą | mėnesį?", "Gal galime vėl pasikalbėti kitą mėnesį?") },
        { id: "thanks_today", s: t("Thanks | for | today.", "Ačiū | už | šiandieną.", "Ačiū už šiandieną.") },
      ],
    },
    checkin: {
      lt: "Sutikti dėl kito susitikimo",
      items: [
        { id: "sounds_good", s: t("Sounds | good.", "Skamba | gerai.", "Puiku.") },
        { id: "works_for_me", s: t("Works | for | me.", "Tinka | — | man.", "Man tinka.", { flags: { 1: "“for”: the dative man carries it." } }) },
        { id: "good_idea", s: t("Good | idea.", "Gera | mintis.", "Gera mintis.") },
      ],
    },
  },

  tips: {
    feedbacks: { key: "feedbacks", lt: "Suprasta! „Feedback“ angliškai neskaičiuojamas: sakoma „some feedback“, bet ne „feedbacks“ ar „a feedback“.", better: "Can I give you some feedback?" },
    deflect: { key: "deflect", lt: "Suprasta! Amerikiečiai pagyrimą paprastai tiesiog priima. „It was nothing“ gali nuskambėti, lyg nesutiktum su vadove. Užtenka padėkoti.", better: "Thank you, that means a lot." },
    soften: { key: "soften", lt: "Suprasta! Vadovei „That's not true“ skamba kaip kaltinimas. Švelniau: „I see it a bit differently…“ – ir paaiškink, kas nutiko.", better: "I see it a bit differently. In those meetings, you presented my sections." },
    defensive_fb: { key: "defensive_fb", lt: "Suprasta! Į pastabą geriau iš karto nesiginti. Gali padėkoti, paprašyti pavyzdžio arba ramiai paaiškinti, kas nutiko.", better: "Could you give me an example?" },
    discreet: { key: "discreet", lt: "Suprasta! Bet kolegos vertinimo geriau garsiai neskaityti – tai konfidenciali informacija. Užtenka pasakyti, kad ekrane ne tavo vertinimas.", better: "I think that's someone else's review on the screen." },
    kind: { key: "kind", lt: "Suprasta! Emilė paprašė pastabų, bet tokia kritika jai nepadės. Pirmiausia pasakyk, kas veikia, tada – vieną konkretų dalyką, kurį ji galėtų pabandyti.", better: "What worked really well was your open door. One thing you could try is clearer priorities." },
    money_blunt: { key: "money_blunt", lt: "Suprasta! Apie atlyginimą klausti galima ir reikia, bet reikalavimas skamba griežtai. Mandagiau – klausimu.", better: "Can we talk about my salary?" },
    uk_payrise: { key: "uk_payrise", lt: "Suprasta! Amerikoje atlyginimo padidinimas – „a raise“ („pay rise“ – britiškas žodis).", better: "Can we talk about a raise?" },
    uk_appraisal: { key: "uk_appraisal", lt: "Suprasta! Amerikoje toks pokalbis dažniau vadinamas „performance review“ („appraisal“ – britiškesnis žodis).", better: "Will this review affect my pay?" },
  },

  merges: {
    "come in": { reason: "lexical_expression", split: "come → ateik + in → į is a literal movement; the invitation = užeik.", minimal: "Two words." },
    "a little": { reason: "lexical_expression", split: "a → — + little → mažas gives “mažas”; the degree adverb = truputį.", minimal: "Two words." },
    "a bit": { reason: "lexical_expression", split: "a → — + bit → gabalėlis is false; the degree adverb = šiek tiek.", minimal: "Two words." },
    "a lot": { reason: "lexical_expression", split: "a → — + lot → partija/sklypas is false; the quantity adverb = daug.", minimal: "Two words." },
    "fair enough": { reason: "lexical_expression", split: "fair → teisinga + enough → pakankamai is false; the concession = na, gerai / sutinku.", minimal: "Two words." },
    "makes sense": { reason: "lexical_expression", split: "makes → daro + sense → prasmę is a calque; = suprantama.", minimal: "Two words." },
    "go ahead": { reason: "lexical_expression", split: "go → eik + ahead → pirmyn is a literal movement; the invitation = sakyk / klausk.", minimal: "Two words." },
    "can take it": { reason: "lexical_expression", split: "can → gali + take → imti + it → tai is false; “I can take it” (criticism) = atlaikysiu.", minimal: "The three words form the idiom." },
    "that way": { reason: "lexical_expression", split: "that → tas + way → kelias is false; “think of it that way” = taip.", minimal: "Two words." },
    "what about": { reason: "lexical_expression", split: "what → kas + about → apie gives “kas apie”; a suggestion = o gal.", minimal: "Two words." },
    "how about": { reason: "lexical_expression", split: "how → kaip + about → apie gives “kaip apie”; a suggestion = o gal.", minimal: "Two words." },
    "what if": { reason: "lexical_expression", split: "what → kas + if → jei gives “kas jei”; a suggestion = o jei.", minimal: "Two words." },
    "kind of": { reason: "lexical_expression", split: "kind → rūšis + of → — is false; the hedge = lyg ir.", minimal: "Two words." },
    "speaking up": { reason: "lexical_expression", split: "speaking → kalbėti + up → aukštyn is false; “speak up” (say what you think) = prabilti.", minimal: "Verb and particle." },
    "speak up": { reason: "lexical_expression", split: "speak → kalbėti + up → aukštyn is false; “speak up” (say what you think) = prabilti.", minimal: "Verb and particle." },
    "sum up": { reason: "lexical_expression", split: "sum → suma + up → aukštyn is false; = apibendrinti.", minimal: "Verb and particle." },
    "to sum up": { reason: "lexical_expression", split: "to → — + sum up → apibendrinti; the discourse marker = apibendrinant.", minimal: "The three words form the marker." },
    "check in": { reason: "lexical_expression", split: "check → patikrinti + in → į is false; “check in (with someone)” = pasikalbėti.", minimal: "Verb and particle." },
    "find out": { reason: "lexical_expression", split: "find → rasti + out → lauk is false; = išsiaiškinti.", minimal: "Verb and particle." },
    "wrap up": { reason: "lexical_expression", split: "wrap → vynioti + up → aukštyn is false; “wrap up” (a meeting) = baigti.", minimal: "Verb and particle." },
    "for now": { reason: "lexical_expression", split: "for → už + now → dabar is false; = kol kas.", minimal: "Two words." },
    "how so": { reason: "lexical_expression", split: "how → kaip + so → taip gives “kaip taip”; the request for a reason = kodėl taip?", minimal: "Two words." },
    "because of": { reason: "grammatical_fusion", split: "because → nes + of → — is false; the preposition = dėl.", minimal: "Two words." },
    "take a look": { reason: "lexical_expression", split: "take → imk, a → —, look → žvilgsnis is a calque; = pažvelk.", minimal: "The three words form the phrase." },
    "to be fair": { reason: "lexical_expression", split: "to be → būti + fair → teisingas is a calque; the hedge = tiesą sakant.", minimal: "The three words form the phrase." },
    "i'd be happy to": { reason: "lexical_expression", split: "I'd → aš, be → būti, happy → laimingas, to → į is a calque; the polite acceptance = mielai.", minimal: "The whole formula." },
    "that makes one of us": { reason: "lexical_expression", split: "that → tai, makes → daro, one → vieną, of → iš, us → mūsų is a calque; the joke = bent vienas iš mūsų ramus.", minimal: "The whole idiom." },
    "good news": { reason: "lexical_expression", split: "good → geros + news → naujienos is possible but the fixed phrase = gera žinia.", minimal: "Two words." },
    "have noticed": { reason: "grammatical_fusion", split: "have → turėti + noticed → pastebėjęs is false; the perfect infinitive after should = pastebėti.", minimal: "Auxiliary and participle." },
    "in a few weeks": { reason: "grammatical_fusion", split: "in → į + a few → kelios + weeks → savaitės gives “į kelias savaites” (into); time from now = po kelių savaičių.", minimal: "The time phrase, like “in a month”." },
    "uh-uh": { reason: "lexical_expression", split: "One interjection written with a hyphen: ne ne.", minimal: "One word." },
  },

  // -------------------------------------------------------------------------

  mission: [
    // items 1 and 6: not needed for the course report; they leave the list once their moment has passed
    { lt: "Papasakok, kuo šiais metais didžiuojiesi", optional: true, done: (c) => !!c.s.named, when: (c) => !c.s.goalMet && !c.s.proudDone },
    { lt: "Priimk pagyrimą", done: (c) => !!c.s.praiseOk },
    { lt: "Priimk pastabą: padėkok arba mandagiai paaiškink savo pusę", done: (c) => !!c.s.fbOk },
    { lt: "Susitark dėl vieno tikslo kitiems metams", done: (c) => !!c.s.goal },
    { lt: "Užbaik pokalbį ir susitark dėl kito susitikimo", done: (c) => !!c.s.checkin },
    { lt: "Paklausk apie atlyginimą ar paaukštinimą", optional: true, done: (c) => !!c.s.moneyAsked, when: (c) => !c.s.goalMet && !c.s.askDone },
  ],

  steps: [
    { id: "feeling", done: (c) => !!c.s.feelDone,
      ask: (c) => {
        const n = bump(c, "feeling");
        if (n === 1) { c.say("feeling_ask"); return; }
        if (n === 2) { c.say("feeling_again"); return; }
        c.s.feelDone = true; askNext(c);
      },
      expects: ["feel_nervous", "feel_fine", "feel_curious", "g_howareyou_answer", "g_howareyou_bad", "plant_help"],
      suggest: (c) => [{ lt: "Pasakyti, kaip jautiesi prieš pokalbį", hint: "feeling" }, ...(c.s.back ? [] : [{ lt: "Paklausti, ar viskas gerai, ar pasiūlyti pagalbą", hint: "plant" }])],
      yes: (c) => { feel(c, "fine"); }, no: (c) => { feel(c, "nervous"); },
      help: (c) => { feel(c, "unsure"); } },
    { id: "proud", when: (c) => !!c.s.feelDone, done: (c) => !!c.s.proudDone,
      ask: (c) => {
        const n = bump(c, "proud");
        if (n === 1) { c.say("format"); c.say("proud_ask"); return; }
        if (n === 2) { c.say("proud_again"); return; }
        proudHelp(c); askNext(c);
      },
      expects: ["proud_win", "win_ctx", "proud_none"],
      suggest: [{ lt: "Papasakoti, kuo šiais metais didžiuojiesi", hint: "proud", options: "win" }],
      help: (c) => { proudHelp(c); askNext(c); } },
    { id: "made", when: (c) => !!c.s.proudDone && !!c.s.named && !!c.s.follow, done: (c) => !!c.s.madeDone,
      ask: (c) => {
        const n = bump(c, "made");
        if (n === 1) { c.say("made_ask"); return; }
        c.s.madeDone = true; askNext(c);
      },
      expects: ["made_why", "made_ctx", "made_any_ctx", "team_effort"],
      suggest: [{ lt: "Paaiškinti, kas lėmė sėkmę", hint: "made" }],
      help: (c) => { c.say("made_help"); c.s.madeDone = true; askNext(c); } },
    { id: "praise", when: (c) => !!c.s.proudDone && (!!c.s.madeDone || !c.s.named || !c.s.follow), done: (c) => !!c.s.praiseDone,
      ask: (c) => {
        const n = bump(c, "praise");
        if (n === 1) {
          if (c.s.named && !c.s.follow) c.say("proud_react");
          const win = look(WINS, c.s.win) ? c.s.win : "guide";
          c.say("praise_" + win);
          if (c.s.win2 && c.s.win2 !== win && look(WINS, c.s.win2)) c.say("praise_also", { X: c.s.win2 });
          return;
        }
        if (n === 2) { c.say("praise_again"); return; }
        c.s.praiseDone = true; c.say("deflect_giveup"); askNext(c);
      },
      expects: ["thanks_praise", "team_effort", "deflect"],
      suggest: [{ lt: "Priimti pagyrimą", hint: "praise" }],
      yes: (c) => { acceptPraise(c, "thanks"); }, no: (c) => { deflect(c); },
      help: (c) => { c.say("praise_help"); } },
    { id: "consent", when: (c) => !!c.s.praiseDone, done: (c) => !!c.s.consented,
      ask: (c) => {
        const n = bump(c, "consent");
        if (n === 1) { c.say("consent_ask"); return; }
        c.s.consented = true; c.say("consent_just"); askNext(c);
      },
      expects: ["want_feedback", "no_feedback"],
      suggest: [{ lt: "Sutikti išklausyti pastabą", hint: "consent" }],
      yes: (c) => { c.s.consented = true; }, no: (c) => { consentNo(c); },
      help: (c) => { if (c.s.consented) return; c.s.consented = true; c.say("consent_just"); } },
    { id: "feedback", when: (c) => !!c.s.consented, done: (c) => !!c.s.fbDone,
      ask: (c) => {
        if (RUDE.has(c)) { RUDE.delete(c); HOWSO.delete(c); c.s.howSo = true; c.say("fb_rude_react"); return; }
        if (HOWSO.has(c)) { HOWSO.delete(c); c.s.howSo = true; c.say("fb_howso"); return; }
        if (!c.s.fbGiven) { c.s.fbGiven = true; c.say("fb_give"); c.say("fb_detail"); return; }
        const n = bump(c, "feedback");
        if (n >= 3) { c.s.fbDone = true; c.say("fb_move_on"); askNext(c); return; }
        c.say("fb_again");
      },
      expects: ["fb_thanks", "fb_work", "ask_example_fb", "pushback", "rude_push", "defensive_fb", "protect_idea"],
      suggest: [{ lt: "Padėkoti ir pasakyti, kad prie to padirbėsi", hint: "receive" }, { lt: "Paprašyti pavyzdžio", hint: "example" }, { lt: "Mandagiai paaiškinti savo pusę", hint: "pushback" }],
      yes: (c) => { fbAccept(c); }, no: (c) => { rude(c); },
      help: (c) => { c.say("fb_help"); } },
    { id: "protect", when: (c) => !!c.s.pushed, done: (c) => !!c.s.protectDone,
      ask: (c) => {
        const n = bump(c, "protect");
        if (n === 1) { c.say("protect_ask"); return; }
        if (n === 2) { c.say("protect_again"); return; }
        c.s.protectDone = true; c.s.protectHow = "emily"; c.say("protect_decide"); askNext(c);
      },
      expects: ["protect_idea"],
      suggest: [{ lt: "Pasiūlyti, kaip apsaugoti savo kalbėjimo laiką", hint: "protect" }],
      help: (c) => { protectOffer(c); } },
    { id: "tab", when: (c) => c.s.twist === "tab" && !!c.s.fbDone && protectOk(c), done: (c) => !!c.s.tabDone,
      ask: (c) => {
        const n = bump(c, "tab");
        if (n === 1) { c.twist("wrong_tab"); c.event("screen", { tab: "ben" }); c.say("tab_show"); c.say("tab_look"); return; }
        tabSelf(c); askNext(c);
      },
      expects: ["tab_point", "tab_check", "tab_read"],
      suggest: [{ lt: "Ekrane – kolegos Beno vertinimas: taktiškai pasakyk tai Emilei", hint: "tab" }],
      yes: (c) => { tabSelf(c); }, no: (c) => { tabSelf(c); },
      help: (c) => { tabSelf(c); } },
    { id: "goals", when: (c) => !!c.s.fbDone && protectOk(c) && tabOk(c), done: (c) => !!c.s.goalDone,
      ask: (c) => {
        const n = bump(c, "goals");
        if (n === 1) { c.say("goals_ask"); return; }
        if (n === 2) { c.say("goals_options"); return; }
        goalsLast(c);
      },
      expects: ["goal_name", "goal_ctx", "goal_vague", "goal_not", "goal_course", "goal_course_ctx", "ask_budget", "ask_support"],
      suggest: [{ lt: "Pasakyti, ką norėtum tobulinti kitais metais", hint: "goals", options: "goal" }, { lt: "Paklausti apie mokymų biudžetą", hint: "support" }],
      // her list of ideas; once she has given it, her own suggestion
      help: (c) => { if (!once(c, "goalsHelp")) return; if (asks(c, "goals") >= 2) { goalsLast(c); return; } bump(c, "goals"); c.say("goals_options"); } },
    { id: "support", when: (c) => !!c.s.goal && !!c.s.supportQ, done: (c) => !!c.s.supportDone,
      ask: (c) => {
        const n = bump(c, "support");
        if (n === 1) { c.say("support_ask"); return; }
        c.s.supportDone = true; askNext(c);
      },
      expects: ["ask_budget", "ask_support", "support_ctx"],
      suggest: [{ lt: "Paprašyti paramos tikslui", hint: "support" }],
      yes: (c) => { supportHelp(c); }, no: (c) => { if (!c.s.supportDone) { c.s.supportDone = true; c.say("support_none"); } },
      help: (c) => { supportHelp(c); } },
    { id: "rev_open", when: (c) => c.s.twist === "reverse" && !!c.s.goalDone && supportOk(c), done: (c) => !!c.s.revOpen || !!c.s.revDone,
      ask: (c) => {
        const n = bump(c, "rev_open");
        if (n === 1) { c.twist("role_reversal"); c.say("rev_ask"); c.say("rev_ask2"); return; }
        c.s.revOpen = true; askNext(c);
      },
      expects: ["rev_ok_ctx", "want_feedback", "rev_decline", "rev_worked", "mg_ctx", "rev_try", "rev_nothing", "rev_rude"],
      suggest: [{ lt: "Sutikti duoti Emilei pastabų", hint: "rev_open" }],
      yes: (c) => { c.s.revOpen = true; }, no: (c) => { revDecline(c); },
      help: (c) => { c.s.revOpen = true; } },
    { id: "rev_worked", when: (c) => !!c.s.revOpen && !c.s.revDone, done: (c) => !!c.s.revWorked || !!c.s.revDone,
      ask: (c) => {
        const n = bump(c, "rev_worked");
        if (n === 1) { c.say("rev_start"); return; }
        if (n === 2) { c.say("rev_worked_again"); return; }
        c.s.revWorked = true; askNext(c);
      },
      expects: ["rev_worked", "mg_ctx", "rev_nothing", "rev_rude", "rev_try", "mt_ctx"],
      suggest: [{ lt: "Pasakyti, kas Emilei gerai sekasi", hint: "rev_worked", options: "mgood" }],
      yes: (c) => { revWorked(c, "general"); },
      help: (c) => { if (once(c, "revHelp")) { bump(c, "rev_worked"); c.say("rev_worked_again"); } } },
    { id: "rev_try", when: (c) => !!c.s.revWorked && !c.s.revDone, done: (c) => !!c.s.revDone,
      ask: (c) => {
        const n = bump(c, "rev_try");
        if (n === 1) { c.say("rev_one"); return; }
        if (n === 2) { c.say("rev_something"); return; }
        c.s.revDone = true; c.s.revHow = "nothing"; c.say("rev_giveup"); askNext(c);
      },
      expects: ["rev_try", "mt_ctx", "rev_nothing", "rev_rude"],
      suggest: [{ lt: "Pasiūlyti vieną dalyką, kurį ji galėtų pabandyti", hint: "rev_try", options: "mtip" }],
      no: (c) => { revNothing(c); },
      help: (c) => { revNothing(c); } },
    { id: "ask_me", when: (c) => !!c.s.goalDone && supportOk(c) && revOk(c), done: (c) => !!c.s.askDone || !!c.s.moneyAsked,
      ask: (c) => {
        const n = bump(c, "ask_me");
        if (n === 1) { c.say("askme_ask"); return; }
        if (n === 2) { c.say("askme_else"); return; }
        c.s.askDone = true; askNext(c);
      },
      expects: ["ask_raise", "ask_criteria", "ask_budget", "no_more", "propose_checkin"],
      suggest: [{ lt: "Paklausti apie atlyginimą ar paaukštinimą", hint: "askme" }],
      yes: (c) => { if (c.s.moneyAsked || c.s.askDone) return; c.say("askme_go"); c.hold(); },
      no: (c) => { if (!c.s.moneyAsked) c.s.askDone = true; },
      help: (c) => { c.s.askDone = true; } },
    { id: "criteria", when: (c) => !!c.s.moneyAsked && !c.s.criteriaDone, done: (c) => !!c.s.criteriaDone,
      ask: (c) => {
        if (c.s.moneyEarly) c.say("money_back");
        if (c.s.criteriaAsked) criteriaAnswer(c, true);
        else { c.say("criteria_volunteer"); criteriaAnswer(c, false); }
        askNext(c);
      },
      expects: ["ask_criteria"],
      suggest: [{ lt: "Paklausti, kas lemia sprendimą", hint: "criteria" }] },
  ],

  init: (c) => {
    c.s.asks = {};
    // one twist at most; a replay prefers the one not seen yet
    const seen: string[] = c.memory.twists ?? [];
    let tw: string | null = c.chance(c.visits >= 1 ? 0.85 : 0.5) ? (c.chance(0.5) ? "reverse" : "tab") : null;
    if (c.visits >= 1 && tw && seen.includes(tw)) tw = ["reverse", "tab"].find((x) => !seen.includes(x)) ?? tw;
    c.s.twist = tw;
    c.s.follow = c.chance(0.6);
    c.s.supportQ = c.chance(0.5);
    c.s.back = c.visits >= 1 && c.chance(0.5);
  },

  start: (c) => {
    if (c.s.back) { c.say("hello_back"); c.say("hello_back2"); return; }
    c.say("hello");
    c.event("plant", { fall: true });
    c.say("plant_okay");
  },

  handlers: {
    plant_help(c) { plantHelp(c); },
    feel_nervous(c) { feel(c, "nervous"); },
    feel_fine(c) { feel(c, "fine"); },
    feel_curious(c, _slots, seg) { feel(c, seg.tags.includes("mix") ? "nervous" : "curious"); },

    proud_win(c, slots) { proud(c, slots.win, slots.win2); },
    win_ctx(c, slots) { proud(c, slots.win); },
    proud_none(c) { if (c.step === "proud" && !c.s.proudDone && once(c, "proud")) proudHelp(c); },
    made_why(c) { made(c, false); },
    made_ctx(c) { made(c, false); },
    made_any_ctx(c) { made(c, false); },
    team_effort(c) {
      if (c.step === "made" && !c.s.madeDone) { made(c, true); return; }
      if (praiseOpen(c)) acceptPraise(c, "team");
    },
    thanks_praise(c) {
      if (praiseOpen(c)) { acceptPraise(c, "thanks"); return; }
      if (fbOpen(c)) { fbAccept(c); return; }
      if (c.step === "made" && !c.s.madeDone) made(c, false);
    },
    deflect(c) {
      if (praiseOpen(c)) { deflect(c); return; }
      if (fbOpen(c)) { pushback(c, []); return; }
      if (c.step === "rev_try") { revNothing(c); return; }
    },

    want_feedback(c) {
      if (c.step === "rev_open" && !c.s.revOpen) { c.s.revOpen = true; return; }
      if (c.s.praiseDone && !c.s.consented) c.s.consented = true;
    },
    no_feedback(c) {
      if (c.step === "rev_open" && !c.s.revOpen) { revDecline(c); return; }
      if (c.s.praiseDone && !c.s.consented) consentNo(c);
    },
    fb_thanks(c) {
      if (praiseOpen(c)) { acceptPraise(c, "thanks"); return; }
      if (fbOpen(c)) { if (!contrast(c)) fbAccept(c); return; }
    },
    fb_work(c) { if (fbOpen(c)) fbAccept(c); },
    ask_example_fb(c) { if (fbOpen(c)) example(c); },
    pushback(c, _slots, seg) { pushback(c, seg.tags); },
    rude_push(c) {
      if (praiseOpen(c)) { deflect(c); return; }
      if (fbOpen(c)) rude(c);
    },
    defensive_fb(c) { if (fbOpen(c)) defensiveFb(c); },
    protect_idea(c, _slots, seg) { protectIdea(c, seg.tags); },

    tab_point(c) { tabPoint(c, false); },
    tab_check(c) {
      // a question points it out; a statement takes Ben's review as the learner's own (she notices herself)
      if (/\?\s*$/.test(c.heard) || /^\W*(?:(?:um|so|sorry|wait|emily)\W+)*is\b/i.test(c.heard)) tabPoint(c, false);
      else if (c.step === "tab") tabSelf(c);
    },
    tab_read(c) { tabPoint(c, true); },

    goal_name(c, slots, seg) {
      const tagged = seg.tags.find((x) => x.startsWith("g:"))?.slice(2);
      goalFrom(c, slots.goal ?? tagged);
    },
    goal_ctx(c, slots) { goalFrom(c, slots.goal); },
    goal_not(c) { goalVague(c, "goal_not"); },
    goal_course(c) { goalCourse(c); },
    goal_course_ctx(c) { goalCourse(c); },
    goal_vague(c) { goalVague(c); },
    ask_budget(c) { budget(c); },
    ask_support(c) { support(c); },
    support_ctx(c) { support(c); },

    rev_ok_ctx(c) { if (c.step === "rev_open" && !c.s.revOpen) c.s.revOpen = true; },
    rev_decline(c) { if (c.step === "rev_open" && !c.s.revOpen) revDecline(c); },
    rev_worked(c, slots, seg) { revWorked(c, slots.mg ?? seg.tags.find((x) => x.startsWith("mg:"))?.slice(3)); },
    mg_ctx(c, slots) { revWorked(c, slots.mg); },
    rev_try(c, slots, seg) { revTry(c, slots.mt ?? seg.tags.find((x) => x.startsWith("mt:"))?.slice(3)); },
    mt_ctx(c, slots) { revTry(c, slots.mt); },
    rev_nothing(c) {
      // "Nothing, you're doing great" to "What's working?" is praise; to "one thing I could try?" it is nothing
      if (c.step === "rev_worked" && !c.s.revWorked) { if (/great|perfect|fine|right/i.test(c.heard)) revWorked(c, "general"); else revRude(c); return; }
      revNothing(c);
    },
    rev_rude(c) { revRude(c); },

    ask_raise(c) { money(c, false); },
    ask_criteria(c) { money(c, true); },
    no_more(c) { if (c.step === "ask_me" && !c.s.askDone && !c.s.moneyAsked) c.s.askDone = true; },
    propose_checkin(c, _slots, seg) {
      if (c.s.checkinProposed) return;
      // "When is our next check-in?" is a question, not a proposal: she sets it at the end
      if (seg.tags.includes("when")) { if (once(c, "checkinEarly")) c.say("checkin_when"); return; }
      checkinProposal(c, seg.tags);
      if (once(c, "checkinEarly")) c.say("checkin_early");
    },
    checkin_yes_ctx() { /* only while she proposes the check-in (the pending question handles it) */ },
    agree_idea(c) { stepYes(c); },
    thanks_today(c) { review.handlers.g_thanks(c, {}, { intent: "g_thanks", slots: {}, tags: [] }); },
    checkin_no_ctx() { /* only while she proposes the check-in (the pending question handles it) */ },

    // --- global intents: the step decides what they mean here ---
    g_thanks(c) {
      if (praiseOpen(c)) { acceptPraise(c, "thanks"); return; }
      // "Thanks, but I see it differently": an acknowledgement before a contrast is no acceptance
      if (fbOpen(c)) { if (!contrast(c)) fbAccept(c); return; }
      if (c.step === "rev_open" && !c.s.revOpen) { c.s.revOpen = true; return; }
      if (once(c, "welcome")) c.say("g_welcome");
    },
    g_ok(c) {
      if (praiseOpen(c)) { acceptPraise(c, "thanks"); return; }
      // "I understand, but that's not true." / "Got it, but I see it differently.": the part after "but" decides
      if (fbOpen(c)) { if (!contrast(c)) fbAccept(c); return; }
      if (c.step === "consent" && !c.s.consented) { c.s.consented = true; return; }
      if (c.step === "rev_open" && !c.s.revOpen) { c.s.revOpen = true; return; }
      if (c.step === "tab" && !c.s.tabDone) { tabSelf(c); return; }
    },
    g_hello(c) {
      if (c.s.hi) return;
      c.s.hi = true; c.say("g_hello");
      // "Hi!" at the start: her question still stands
      if (c.step === "feeling" && !c.s.feelDone) c.hold();
    },
    g_howareyou(c) {
      if (c.step === "feeling" && !c.s.feelDone) { if (once(c, "hay")) c.say(c.s.back ? "emily_howareyou_back" : "emily_howareyou"); c.hold(); return; }
      if (once(c, "hay")) c.say("g_howareyou_reply");
    },
    g_howareyou_answer(c) {
      if (c.step === "feeling" && !c.s.feelDone) { feel(c, "fine"); return; }
      if (askedBack(c) && once(c, "hay")) c.say("g_asked_back");
    },
    g_howareyou_bad(c) {
      if (c.step === "feeling" && !c.s.feelDone) { feel(c, "bad"); return; }
      if (once(c, "hay")) c.say("g_sorry_to_hear");
    },
    // "I don't know" / "I'm not sure": the step's help, where its question would come (see the end of the file),
    // so an answer in the same breath wins ("I'm not sure. Maybe a data course?")
    g_dontknow(c) {
      const st = review.steps.find((x) => x.id === c.step);
      if (st?.help && !st.done(c)) { DONT_KNOW.set(c, st.id); return; }
      c.say("g_take_time"); c.hold();
    },
    // walking away before the end
    g_bye(c) {
      if (c.s.__finished) { agree(c, false); return; }
      c.say("bye_early"); rememberVisit(c); c.end(); c.hold();
    },
  },

  finish: (c) => { closing(c); },

  tests: [
    // the plant and how you feel
    { say: "Are you okay?", intent: "plant_help", step: "feeling" },
    { say: "Can I help?", intent: "plant_help", step: "feeling" },
    { say: "Don't worry about it.", intent: "plant_help", step: "feeling" },
    { say: "Should I get some paper towels?", intent: "plant_help", step: "feeling" },
    { say: "Honestly? A little nervous.", intent: "feel_nervous", step: "feeling" },
    { say: "I'm a bit anxious, to be honest.", intent: "feel_nervous", step: "feeling" },
    { say: "I'm fine, thanks.", intent: "feel_fine", step: "feeling" },
    { say: "I'm not nervous at all.", intent: "feel_fine", step: "feeling", not: ["feel_nervous"] },
    { say: "A bit curious, actually.", intent: "feel_curious", step: "feeling" },
    { say: "I'm looking forward to it.", intent: "feel_fine", step: "feeling" },
    // your year
    { say: "I'm most proud of the scheduling tool guide.", intent: "proud_win", step: "proud", slots: { win: "guide" } },
    { say: "I'm most proud of helping the new intern.", intent: "proud_win", step: "proud", slots: { win: "intern" } },
    { say: "I'm most proud of rescuing the client project.", intent: "proud_win", step: "proud", slots: { win: "rescue" } },
    { say: "Probably the app launch.", intent: "proud_win", step: "proud", slots: { win: "launch" } },
    { say: "I think the customer survey went really well.", intent: "proud_win", step: "proud", slots: { win: "survey" } },
    { say: "The survey.", intent: "win_ctx", step: "proud", slots: { win: "survey" } },
    { say: "The app launch and the customer survey.", intent: "proud_win", step: "proud", slots: { win: "launch", win2: "survey" } },
    { say: "Nothing special.", intent: "proud_none", step: "proud", not: ["proud_win"] },
    { say: "It was a team effort.", intent: "team_effort", step: "made" },
    { say: "We planned everything early.", intent: "made_why", step: "made" },
    { say: "I listened to the users.", intent: "made_why", step: "made" },
    { say: "I asked a lot of questions.", intent: "made_why", step: "made" },
    { say: "Good planning.", intent: "made_ctx", step: "made" },
    { say: "Thank you, that means a lot.", intent: "thanks_praise", step: "praise" },
    { say: "Thanks, I really appreciate that.", intent: "thanks_praise", step: "praise" },
    { say: "Thanks! It was a team effort.", intent: "team_effort", step: "praise" },
    { say: "I'm glad it helped.", intent: "thanks_praise", step: "praise" },
    { say: "It was nothing.", intent: "deflect", step: "praise", not: ["thanks_praise"] },
    { say: "It wasn't a big deal.", intent: "deflect", step: "praise", not: ["thanks_praise"] },
    { say: "Anyone could do it.", intent: "deflect", step: "praise" },
    // the feedback
    { say: "Sure, go ahead.", intent: "want_feedback", step: "consent" },
    { say: "Of course. I'm listening.", intent: "want_feedback", step: "consent" },
    { say: "I can take it.", intent: "want_feedback", step: "consent" },
    { say: "Not now.", intent: "no_feedback", step: "consent", not: ["want_feedback"] },
    { say: "Thanks, that's really helpful.", intent: "fb_thanks", step: "feedback" },
    { say: "I'll work on that.", intent: "fb_work", step: "feedback" },
    { say: "That's fair.", intent: "fb_thanks", step: "feedback" },
    { say: "Fair enough.", intent: "fb_thanks", step: "feedback" },
    { say: "I see what you mean.", intent: "fb_thanks", step: "feedback" },
    { say: "I'll speak up earlier next time.", intent: "fb_work", step: "feedback" },
    { say: "Could you give me an example?", intent: "ask_example_fb", step: "feedback" },
    { say: "Which meetings do you mean?", intent: "ask_example_fb", step: "feedback" },
    { say: "I see it a bit differently.", intent: "pushback", step: "feedback", not: ["fb_thanks"] },
    { say: "In those meetings, you presented my sections.", intent: "pushback", step: "feedback" },
    { say: "The client was late, remember?", intent: "pushback", step: "feedback" },
    { say: "To be fair, I didn't get the chance.", intent: "pushback", step: "feedback", not: ["fb_thanks"] },
    { say: "That's not true.", intent: "rude_push", step: "feedback", not: ["fb_thanks"] },
    { say: "You're wrong.", intent: "rude_push", step: "feedback", not: ["fb_thanks"] },
    { say: "That's not quite true.", intent: "pushback", step: "feedback", not: ["fb_thanks"] },
    { say: "I don't agree.", intent: "rude_push", step: "feedback", not: ["fb_thanks"] },
    { say: "That's not my job.", intent: "defensive_fb", step: "feedback", not: ["fb_work"] },
    { say: "Could we put my sections on the agenda?", intent: "protect_idea", step: "protect" },
    { say: "Could I present my own slides?", intent: "protect_idea", step: "protect" },
    { say: "Can we keep my slot, even if the client is late?", intent: "protect_idea", step: "protect" },
    { say: "Maybe a quick prep call before the meeting?", intent: "protect_idea", step: "protect" },
    // the wrong tab
    { say: "I think that's someone else's review on the screen.", intent: "tab_point", step: "tab" },
    { say: "Sorry, I don't think that one's mine.", intent: "tab_point", step: "tab" },
    { say: "I think you have the wrong tab open.", intent: "tab_point", step: "tab" },
    { say: "Is that Ben's review?", intent: "tab_point", step: "tab" },
    { say: "Is that my review?", intent: "tab_check", step: "tab" },
    { say: "Wow, Ben got a low rating.", intent: "tab_read", step: "tab", not: ["tab_point"] },
    // goals
    { say: "I'd like to work on client presentations.", intent: "goal_name", step: "goals", slots: { goal: "presenting" } },
    { say: "I'd like to take a course in UX writing.", intent: "goal_name", step: "goals", slots: { goal: "ux_writing" } },
    { say: "Maybe a data analysis course?", intent: "goal_name", step: "goals", slots: { goal: "data" } },
    { say: "I'd like to lead a small project.", intent: "goal_name", step: "goals" },
    { say: "I'd like to do more mentoring.", intent: "goal_name", step: "goals", slots: { goal: "mentoring" } },
    { say: "Leadership.", intent: "goal_ctx", step: "goals", slots: { goal: "leadership" } },
    { say: "I want to grow.", intent: "goal_vague", step: "goals" },
    { say: "Is there a training budget?", intent: "ask_budget", step: "goals" },
    { say: "Could we practice before client meetings?", intent: "ask_support", step: "support" },
    { say: "Some regular feedback would help.", intent: "ask_support", step: "support" },
    // the role reversal
    { say: "Sure, I'd be happy to.", intent: "rev_ok_ctx", step: "rev_open" },
    { say: "What worked really well was your open door.", intent: "rev_worked", step: "rev_worked", slots: { mg: "open_door" } },
    { say: "I really appreciate your honesty.", intent: "rev_worked", step: "rev_worked", slots: { mg: "honesty" } },
    { say: "You're a great listener.", intent: "rev_worked", step: "rev_worked" },
    { say: "One thing you could try is clearer priorities.", intent: "rev_try", step: "rev_try", slots: { mt: "priorities" } },
    { say: "Well, since you ask, one thing you could try is fewer late-night emails.", intent: "rev_try", step: "rev_try", slots: { mt: "late_email" } },
    { say: "Maybe regular one-on-ones?", intent: "rev_try", step: "rev_try", slots: { mt: "one_on_ones" } },
    { say: "Please don't send emails at night.", intent: "rev_try", step: "rev_try" },
    { say: "Nothing, you're doing great.", intent: "rev_nothing", step: "rev_try", not: ["rev_try"] },
    { say: "You're a terrible manager.", intent: "rev_rude", step: "rev_try", not: ["rev_try"] },
    // money and the closing
    { say: "Can we talk about my salary?", intent: "ask_raise", step: "ask_me" },
    { say: "Will this review affect my pay?", intent: "ask_raise", step: "ask_me" },
    { say: "What about a pay rise?", intent: "ask_raise", step: "ask_me" },
    { say: "What would I need to do to get a promotion?", intent: "ask_criteria", step: "ask_me" },
    { say: "Could you give me an example of what exceeds expectations means here?", intent: "ask_criteria", step: "ask_me", not: ["g_meaning"] },
    { say: "How are salary decisions made?", intent: "ask_criteria", step: "criteria" },
    { say: "No, I think that's all.", intent: "no_more", step: "ask_me" },
    { say: "Can we check in again next month?", intent: "propose_checkin", step: "ask_me" },
    { say: "Thanks for today.", intent: "thanks_today" },
    { say: "Good idea.", intent: "agree_idea" },
    // review fixes: doubt is no agreement, a negative goal is no goal, natural short answers
    { say: "I'm not sure I agree.", intent: "pushback", step: "feedback", not: ["fb_thanks", "g_dontknow"] },
    { say: "I'm not sure that's fair.", intent: "pushback", step: "feedback", not: ["fb_thanks", "g_dontknow"] },
    { say: "I'm not sure you're right.", intent: "pushback", step: "feedback", not: ["fb_thanks", "g_dontknow"] },
    { say: "I'm not sure I can do that.", intent: "pushback", step: "feedback", not: ["fb_work", "g_dontknow"] },
    { say: "I disagree.", intent: "rude_push", step: "feedback", not: ["fb_thanks"] },
    { say: "I'd like to stop presenting.", intent: "goal_not", step: "goals", not: ["goal_name", "goal_ctx"] },
    { say: "I'd like to present less.", intent: "goal_not", step: "goals", not: ["goal_name", "goal_ctx"] },
    { say: "I'd like to stop mentoring.", intent: "goal_not", step: "goals", not: ["goal_name", "goal_ctx"] },
    { say: "Less mentoring.", intent: "goal_not", step: "goals", not: ["goal_name", "goal_ctx"] },
    { say: "I don't want to do presentations.", intent: "goal_not", step: "goals", not: ["goal_name", "goal_ctx"] },
    { say: "A course.", intent: "goal_course_ctx", step: "goals" },
    { say: "I'd like to take a course.", intent: "goal_course", step: "goals", not: ["goal_name"] },
    { say: "I'd like a raise.", intent: "ask_raise", step: "ask_me" },
    { say: "It's not my review.", intent: "tab_point", step: "tab", not: ["tab_check"] },
    { say: "That's someone else's.", intent: "tab_point", step: "tab" },
    { say: "You're a good manager.", intent: "rev_worked", step: "rev_worked" },
    { say: "The meetings are too long.", intent: "rev_try", step: "rev_try", not: ["rev_rude"] },
    { say: "When is our next check-in?", intent: "propose_checkin", step: "ask_me" },
    // not understood
    { say: "purple bicycle elephant", intent: "none" },
    { say: "My car is blue and very fast", intent: "none" },
  ],

  sims: [
    // the song's way, start to finish (no twist, no follow-up questions)
    { name: "happy path: the song's phrases", turns: ["Honestly? A little nervous.", "I'm most proud of the scheduling tool guide.", "Thank you, that means a lot.",
      "Sure, go ahead.", "Thanks, that's really helpful. I'll work on that.", "I'd like to take a course in UX writing.", "Can we talk about my salary?",
      "What would I need to do to get a promotion?", "No, that's all. Thanks, that's really helpful.", "Sounds good."],
      expect: { complete: true, state: { named: true, fbHow: "accept", goal: "ux_writing", moneyAsked: true, friday: true } }, auto: AUTO, setup: PLAIN },
    // the plant, an example, polite push-back with the story's reason, a vague goal, the budget, the exceeds-expectations
    // question, and the learner proposes the check-in (follow-up and support pinned on)
    { name: "questions and push-back", turns: ["Are you okay? Can I help?", "I'm fine, thanks. A bit curious, actually.", "Probably the app launch.", "It was a team effort.",
      "Thanks, I really appreciate that.", "Of course. I'm listening.", "Could you give me an example?", "I see it a bit differently. In those meetings, you presented my sections.",
      "Could we put my sections on the agenda?", "I want to grow.", "Is there a training budget?", "A leadership course.", "Could we practice before client meetings?",
      "Can we check in again next month?", "Could you give me an example of what “exceeds expectations” means here?", "No, that's all. Thanks, that's really helpful."],
      expect: { complete: true, state: { pushed: true, protectDone: true, exAsked: true, goal: "leadership", moneyAsked: true, checkin: true } }, auto: AUTO,
      setup: (s) => { s.twist = null; s.follow = true; s.supportQ = true; s.back = false; } },
    // twist: Emily asks the learner for feedback on her as a manager
    { name: "twist: feedback for Emily", turns: ["I'm fine, thanks.", "I'm most proud of helping the new intern.", "Thanks! It was a team effort.", "Sure.",
      "I'll work on that.", "I'd like to do more mentoring.", "Sure, I'd be happy to.", "What worked really well was your open door.",
      "Well, since you ask, one thing you could try is fewer late-night emails.", "No, I think that's all.", "Works for me."],
      expect: { complete: true, state: { revDone: true, revHow: "tip", revTry: "late_email", goal: "mentoring" } }, auto: AUTO,
      setup: (s) => { s.twist = "reverse"; s.follow = false; s.supportQ = false; s.back = false; } },
    // twist: Ben's review on the screen, pointed out tactfully
    { name: "twist: the wrong tab", turns: ["A little nervous, to be honest.", "I'm most proud of rescuing the client project.", "Thanks, I'm glad it helped.", "Go ahead.",
      "That's fair. I'll work on that.", "I think that's someone else's review on the screen.", "I'd like to lead a small project.", "No questions.", "No, that's all.",
      "Sounds good, thanks."],
      expect: { complete: true, state: { tabDone: true, tabHow: "tactful", goal: "leading" } }, auto: AUTO,
      setup: (s) => { s.twist = "tab"; s.follow = false; s.supportQ = false; s.back = false; } },
    // the wrong tab read aloud (a tip), a deflected compliment, a rude push-back with the reason after it
    { name: "blunt moves, then better", turns: ["I'm okay.", "The customer survey.", "It was nothing.", "Thank you, that means a lot.", "Okay.", "That's not true.",
      "The client was late, remember? You presented my sections.", "Maybe a quick prep call before the meeting?", "Wow, Ben got a low rating.", "Client presentations.",
      "I think I deserve a raise.", "Okay, thanks.", "No, that's it.", "Sure."],
      expect: { complete: true, state: { tabHow: "read", deflects: 1, rude: 1, pushed: true, moneyAsked: true } }, auto: AUTO,
      setup: (s) => { s.twist = "tab"; s.follow = false; s.supportQ = false; s.back = false; } },
    // defensive twice, deflecting twice: the review ends, but the course report is not done
    { name: "defensive: not done", turns: ["Fine.", "Nothing special.", "It was nothing.", "Not really.", "Okay.", "That's not my job.", "I'm a designer, not a salesperson.",
      "I'd like to work on data analysis.", "No.", "No, that's all.", "Sure."],
      expect: { complete: false, state: { praiseOk: undefined, fbOk: undefined, checkin: true } }, auto: AUTO, setup: PLAIN },
    // a return visit (the plant on the shelf); the role reversal: "nothing to change" twice, then she gives up; the
    // learner never asks about money (item 6 passes)
    { name: "twist: nothing to change", turns: ["Pretty good, thanks. And you?", "I think the app launch went really well.", "Thanks!", "Yes, please. Be honest.",
      "You're right. I'll speak up earlier next time.", "Maybe a data analysis course?", "Of course.", "You're a great listener.", "Nothing, you're doing great.",
      "Honestly, nothing.", "No, I think that's all.", "No, that's it.", "Same time works."],
      expect: { complete: true, state: { revHow: "nothing", moneyAsked: undefined, askDone: true } }, auto: AUTO,
      setup: (s) => { s.twist = "reverse"; s.follow = false; s.supportQ = false; s.back = true; } },
    // the salary question first (she comes back to it at the end), "How so?" before the reason, her own idea for the
    // agenda, and a goodbye instead of an answer to the check-in
    { name: "salary first, Emily's idea", turns: ["Good, thanks.", "The app launch.", "Thank you!", "Can we talk about my salary first?", "Okay, go ahead.",
      "I see it differently.", "You presented my sections, the client was late.", "I don't know.", "Yes, good idea.", "I'd like to lead a small project.",
      "Thanks for today. Bye!"],
      expect: { complete: true, state: { moneyEarly: true, protectHow: "emily", goal: "leading", criteriaDone: true, checkin: true } }, auto: AUTO, setup: PLAIN },
    // doubt and "…, but …" are no agreement ("How so?"), a negative goal, a course from her list, "I'd like a raise",
    // and the check-in month accepted in other words
    { name: "doubt, then the reason", turns: ["I'm fine.", "The app launch.", "Thanks!", "Sure.", "Got it, but I see it differently.",
      "You presented my sections, the client was late.", "Could we put my sections on the agenda?", "I'd like to stop presenting.", "A course.", "UX writing.",
      "I'd like a raise.", "No, that's all.", "Next month is fine."],
      expect: { complete: true, state: { howSo: true, pushed: true, fbHow: "push", goal: "ux_writing", courseQ: true, moneyAsked: true, checkin: true } }, auto: AUTO,
      setup: PLAIN },
    // "I don't know" at every question: her help once, then each question's own way out (no loops); not done
    { name: "I don't know, again and again", turns: ["I'm fine.", "The app launch.", "I don't know.", "I don't know.", "I don't know.", "I'm not sure I agree.",
      "I don't know.", "I don't know.", "I don't know.", "I don't know.", "I don't know.", "I don't know.", "I don't know.", "Can we make it two weeks?"],
      expect: { complete: false, state: { praiseOk: undefined, howSo: true, fbOk: undefined, fbDone: true, goalDone: true, goal: undefined, askDone: true, checkin: true } },
      auto: AUTO, setup: PLAIN },
    // the wrong tab in plain words, a course chosen from her list, and "When is our next check-in?" (she sets it at the end)
    { name: "twist: the wrong tab, plain words", turns: ["I'm fine.", "The app launch.", "Thanks!", "Sure.", "Fair enough.", "That's someone else's.",
      "I'd like to take a course.", "Data analysis.", "When is our next check-in?", "No, that's all.", "No, that's all.", "Next month is fine."],
      expect: { complete: true, state: { tabHow: "tactful", goal: "data", checkin: true, checkinProposed: undefined } }, auto: AUTO,
      setup: (s) => { s.twist = "tab"; s.follow = false; s.supportQ = false; s.back = false; } },
    // the role reversal in plain words; the learner proposes "soon" and she repeats it ("…soon, like you said")
    { name: "twist: a good manager", turns: ["I'm fine.", "The app launch.", "Thanks!", "Sure.", "I'll work on that.", "I'd like to do more mentoring.",
      "Sure, I'd be happy to.", "You're a good manager.", "The meetings are too long.", "Can we check in again soon?", "No, that's all.", "No, that's all."],
      expect: { complete: true, state: { revHow: "tip", revTry: "shorter_meetings", checkinWhen: "other", checkin: true } }, auto: AUTO,
      setup: (s) => { s.twist = "reverse"; s.follow = false; s.supportQ = false; s.back = false; } },
    // walking away in the middle: not done
    { name: "walking away", turns: ["Fine, thanks.", "The guide.", "Sorry, I have to go."], expect: { complete: false }, auto: AUTO, setup: PLAIN },
  ],
};

// ---------------------------------------------------------------------------
// Handler helpers (hoisted function declarations)

const TIPS = review.tips as Record<string, Tip>;

/** The next step's question right away (a step that settled itself while asking). */
function askNext(c: Ctx) {
  const st = review.steps.find((x) => (!x.when || x.when(c)) && !x.done(c));
  if (st) { c.ask(st.id); return; }
  if (!c.s.__finished) { c.s.__finished = true; closing(c); }
}

/** "Good idea." / "Okay." for the step being asked. */
function stepYes(c: Ctx) {
  const st = review.steps.find((x) => x.id === c.step);
  if (st?.yes && !st.done(c)) st.yes(c);
}

/** A plant fell (or not): she waves the help away. */
function plantHelp(c: Ctx) {
  if (c.s.plantSaid || !once(c, "plant")) return;
  c.s.plantSaid = true;
  if (c.s.back) { c.say("fine_thanks"); return; }
  if (/\b(are you|you) (ok|okay|all right|alright)\b/i.test(c.heard) && !/\bhelp\b/i.test(c.heard)) { c.say("plant_ok_q"); return; }
  c.say("plant_help");
}

/** The answer to "How are you feeling about today?". */
function feel(c: Ctx, kind: "nervous" | "fine" | "curious" | "bad" | "unsure") {
  if (c.s.feelDone || !once(c, "feel")) return;
  c.s.feelDone = true; c.s.feeling = kind;
  if (kind === "nervous") { c.say(c.s.back ? "feel_nervous_back" : "feel_nervous"); return; }
  if (kind === "bad") { c.say("feel_bad"); return; }
  if (kind === "unsure") { c.say("feel_unsure"); return; }
  if (askedBack(c)) { c.say(c.s.back ? "feel_asked_back_back" : "feel_asked_back"); return; }
  c.say(kind === "curious" ? "feel_curious" : "feel_fine");
}

/** The learner names what they are proud of (item 1). */
function proud(c: Ctx, win?: string, win2?: string) {
  if (c.s.proudDone || !win || !look(WINS, win) || !c.s.feelDone) return;
  if (!once(c, "proud")) return;
  c.s.proudDone = true; c.s.named = true; c.s.win = win;
  if (win2 && win2 !== win) c.s.win2 = win2;
}

/** "I don't know" / "Nothing special": she suggests the guide herself (item 1 not ticked). */
function proudHelp(c: Ctx) {
  if (c.s.proudDone) return;
  c.s.proudDone = true; c.s.win = "guide";
  c.say("proud_help");
}

/** "What made it work?" answered. */
function made(c: Ctx, team: boolean) {
  if (c.step !== "made" || c.s.madeDone || !once(c, "made")) return;
  c.s.madeDone = true;
  if (team) c.s.team = true;
  c.say(team ? "team_react" : "made_react");
}

/** The learner accepts the praise (item 2). */
function acceptPraise(c: Ctx, kind: "thanks" | "team") {
  if (!praiseOpen(c) || !once(c, "praise")) return;
  c.s.praiseOk = true; c.s.praiseDone = true;
  c.say(kind === "team" && !c.s.team ? "team_react" : "praise_thanks_react");
}

/** "It was nothing": a tip; she insists once, then writes it down anyway (item 2 not ticked). */
function deflect(c: Ctx) {
  if (!praiseOpen(c)) return;
  c.tip(TIPS.deflect);
  if (!once(c, "praise")) return;
  c.s.deflects = (c.s.deflects ?? 0) + 1;
  if (c.s.deflects === 1) { c.say("deflect_react"); c.hold(); return; }
  c.s.praiseDone = true;
  c.say("deflect_giveup");
}

/** "Not now": it is the point of today, she says it anyway. */
function consentNo(c: Ctx) {
  if (c.s.consented || !once(c, "consent")) return;
  c.s.consented = true; c.s.consentNo = true;
  c.say("consent_no");
}

/** The learner takes the feedback well (item 3). */
function fbAccept(c: Ctx) {
  if (!fbOpen(c) || !once(c, "fb")) return;
  c.s.fbOk = true; c.s.fbDone = true; c.s.fbHow = "accept";
  c.say("fb_accept_react");
  c.say(c.chance(0.5) ? "fb_practice" : "fb_get_there");
}

/** "Could you give me an example?" */
function example(c: Ctx) {
  if (!once(c, "example")) return;
  if (c.s.exAsked) { c.say("fb_example_more"); c.hold(); return; }
  c.s.exAsked = true;
  c.say("fb_example"); c.hold();
}

/** Polite push-back: without the reason she asks "How so?"; with it, "Fair enough. That's on me." (item 3). A
 *  change of mind after accepting it ("Actually, you presented my sections") still opens the agenda question. */
function pushback(c: Ctx, tags: string[]) {
  if (!c.s.fbGiven) return;
  const late = c.s.fbDone && c.s.fbHow === "accept" && !c.s.pushed;
  if (c.s.fbDone && !late) return;
  RUDE.delete(c);
  if (!tags.includes("ctx")) {
    // "I see it a bit differently": "How so?" at the end of the turn, unless the reason follows in the same breath
    if (late || c.s.howSo || !once(c, "howso")) return;
    HOWSO.add(c);
    return;
  }
  HOWSO.delete(c);
  if (!once(c, "push")) return;
  c.s.pushed = true; c.s.fbOk = true; c.s.fbDone = true; c.s.fbHow = "push";
  c.say("fb_fair"); c.say("fb_fair2");
}

/** "That's not true": a tip, and she asks for more at the end of the turn (unless the reason came in the same breath). */
function rude(c: Ctx) {
  if (!fbOpen(c)) return;
  c.tip(TIPS.soften);
  if (!once(c, "rude")) return;
  c.s.rude = (c.s.rude ?? 0) + 1;
  if (c.s.rude >= 2 || c.s.howSo) { c.s.fbDone = true; c.say("fb_move_on"); return; }
  RUDE.add(c);
}

/** Defending without a reason: a tip; she answers once, the second time she moves on (item 3 not ticked). */
function defensiveFb(c: Ctx) {
  c.tip(TIPS.defensive_fb);
  if (!once(c, "def")) return;
  c.s.defCount = (c.s.defCount ?? 0) + 1;
  if (c.s.defCount === 1) { c.say("fb_defensive_react"); c.hold(); return; }
  c.s.fbDone = true;
  c.say("fb_move_on");
}

/** An idea for protecting the learner's speaking time (after the push-back), or a constructive answer to the
 *  feedback itself ("Could I present my own slides next time?"). */
function protectIdea(c: Ctx, tags: string[]) {
  const agenda = tags.includes("agenda");
  if (fbOpen(c)) {
    if (!once(c, "fb")) return;
    c.s.fbOk = true; c.s.fbDone = true; c.s.fbHow = "accept"; c.s.ideaEarly = true;
    c.say(agenda ? "protect_agenda" : "protect_ok");
    return;
  }
  if (!c.s.pushed || c.s.protectDone || !once(c, "protect")) return;
  c.s.protectDone = true; c.s.protectHow = agenda ? "agenda" : "own";
  if (agenda) { c.say("protect_agenda"); c.say("protect_keep"); return; }
  c.say("protect_ok"); c.say("protect_agenda_too");
}

/** "I don't know": she proposes the agenda herself. */
function protectOffer(c: Ctx) {
  if (c.s.protectDone || !once(c, "protectOffer")) return;
  c.say("protect_help");
  const yes = (cc: Ctx) => { if (cc.s.protectDone) return; cc.s.protectDone = true; cc.s.protectHow = "emily"; cc.say("protect_yes"); };
  c.expect({ id: "protect_offer", optional: true, expects: ["protect_idea", "agree_idea"], hints: ["protect", "checkin"],
    suggest: [{ lt: "Atsakyti į Emilės pasiūlymą", hint: "checkin" }],
    on: { protect_idea: (cc, _s, seg) => { protectIdea(cc, seg.tags); }, agree_idea: (cc) => { yes(cc); }, g_ok: (cc) => { yes(cc); }, g_thanks: (cc) => { yes(cc); }, fb_thanks: (cc) => { yes(cc); } },
    yes, no: (cc) => { if (cc.s.protectDone) return; cc.s.protectDone = true; cc.s.protectHow = "later"; cc.say("protect_no"); },
    ask: (cc) => { cc.say("protect_help"); } });
}

/** The wrong tab: pointed out tactfully, or read aloud (a tip). */
function tabPoint(c: Ctx, read: boolean) {
  if (c.s.twist !== "tab" || asks(c, "tab") < 1 || c.s.tabDone || !once(c, "tab")) return;
  c.s.tabDone = true; c.s.tabHow = read ? "read" : "tactful";
  if (read) { c.tip(TIPS.discreet); c.say("tab_close_read"); } else c.say("tab_close");
  tabAfter(c);
}
/** She notices it herself. */
function tabSelf(c: Ctx) {
  if (c.s.tabDone || !once(c, "tab")) return;
  c.s.tabDone = true; c.s.tabHow = "self";
  c.say("tab_notice"); c.say("tab_close_self");
  tabAfter(c);
}
function tabAfter(c: Ctx) {
  c.event("screen", { tab: "mine" });
  c.say("tab_ben"); c.say("tab_mine"); c.say("tab_mine2");
}

/** A goal for next year (item 4). */
function goalFrom(c: Ctx, id?: string, force = false) {
  const e = look(GOALS, id);
  if (!e || c.s.goalDone) return;
  // goals before the goals question (e.g. while she asks something else) wait for it
  if (!force && c.step !== "goals" && !(c.s.fbDone && protectOk(c) && tabOk(c))) return;
  if (!once(c, "goal")) return;
  c.s.goal = e.id; c.s.goalDone = true;
  const kind = e.attrs?.kind;
  if (kind === "skill") c.say("goal_present");
  else if (kind === "lead") c.say("goal_lead");
  else if (kind === "mentor") c.say("goal_mentor");
  else {
    c.say(/\b(course|class|training|workshop)\b/i.test(c.heard) ? "goal_course" : "goal_learn", { X: e.id });
    if (!c.s.budgetSaid) { c.s.budgetSaid = true; c.say("budget_amount"); }
  }
  c.say("goal_set");
}

/** "I want to grow." / "I'd like to stop presenting.": her list of ideas (a negative goal is never the goal). */
function goalVague(c: Ctx, first?: string) {
  if (c.s.goalDone || c.step !== "goals") return;
  // the list was given already: a vague answer goes on to her own suggestion (the step's question)
  if (asks(c, "goals") >= 2 && !first) return;
  if (!once(c, "vague")) return;
  if (first) c.say(first);
  if (asks(c, "goals") < 2) { bump(c, "goals"); c.say("goals_options"); }
  c.hold();
}

/** The goals question after her list: her own suggestion once; after that, the goal waits for next time (item 4
 *  not ticked). */
function goalsLast(c: Ctx) {
  if (!c.s.goalOffered) { c.s.goalOffered = true; goalOffer(c); return; }
  c.s.goalDone = true; c.say("goal_later"); askNext(c);
}

/** "A course." (one of her ideas): which one? */
function goalCourse(c: Ctx) {
  if (c.s.goalDone || c.step !== "goals" || c.s.courseQ || !once(c, "vague")) return;
  c.s.courseQ = true;
  c.say("goal_which_course"); c.hold();
}

/** After two tries she suggests a goal herself: yes counts (agreeing on a goal). */
function goalOffer(c: Ctx) {
  c.say("goals_suggest");
  const set = (cc: Ctx) => { goalFromOffer(cc, "presenting"); };
  c.expect({ id: "goal_offer", optional: true, expects: ["goal_name", "goal_ctx", "agree_idea"], hints: ["goals", "checkin"],
    suggest: [{ lt: "Atsakyti į Emilės pasiūlymą", hint: "checkin" }, { lt: "Pasakyti, ką norėtum tobulinti kitais metais", hint: "goals", options: "goal" }],
    on: {
      goal_name: (cc, slots, seg) => { goalFromOffer(cc, slots.goal ?? seg.tags.find((x) => x.startsWith("g:"))?.slice(2)); },
      goal_ctx: (cc, slots) => { goalFromOffer(cc, slots.goal); },
      agree_idea: (cc) => { set(cc); }, g_ok: (cc) => { set(cc); }, g_thanks: (cc) => { set(cc); },
      goal_not: (cc) => { if (cc.s.goalDone) return; cc.s.goalDone = true; cc.say("support_none"); },
    },
    yes: set,
    no: (cc) => { if (cc.s.goalDone) return; cc.s.goalDone = true; cc.say("support_none"); } });
}
function goalFromOffer(c: Ctx, id?: string) {
  if (c.s.goalDone) return;
  goalFrom(c, id ?? "presenting", true);
}

/** "Is there a training budget?" */
function budget(c: Ctx) {
  if (!once(c, "budget")) return;
  if (c.s.budgetSaid) c.say("budget_again");
  else { c.s.budgetSaid = true; c.say(c.step === "goals" && !c.s.goalDone ? "budget_yes" : "budget_amount"); }
  c.s.budgetAsked = true;
  if (c.step === "goals" && !c.s.goalDone) { c.say("budget_what"); c.hold(); return; }
  if (c.step === "support") c.s.supportDone = true;
}

/** Asking for support with the goal. */
function support(c: Ctx) {
  if (!once(c, "support")) return;
  if (c.step === "goals" && !c.s.goalDone) { c.say("support_first"); c.hold(); return; }
  if (!c.s.goal) return;
  c.s.supportAsked = true; c.s.supportDone = true;
  c.say("support_yes");
}
function supportHelp(c: Ctx) {
  if (c.s.supportDone || !once(c, "support")) return;
  c.s.supportDone = true;
  c.say("support_offer");
}

/** The role reversal. */
function revDecline(c: Ctx) {
  if (c.s.revDone || !once(c, "rev")) return;
  c.s.revDone = true; c.s.revHow = "declined";
  c.say("rev_decline_react");
}
function revWorked(c: Ctx, mg?: string) {
  if (c.s.twist !== "reverse" || c.s.revDone || c.s.revWorked || asks(c, "rev_open") < 1 || !once(c, "revWorked")) return;
  c.s.revOpen = true; c.s.revWorked = true; c.s.revGood = mg ?? "general";
  c.say("rev_worked_react");
}
function revTry(c: Ctx, mt?: string) {
  if (c.s.twist !== "reverse" || c.s.revDone || asks(c, "rev_open") < 1 || !once(c, "revTry")) return;
  c.s.revOpen = true; c.s.revWorked = true; c.s.revDone = true; c.s.revHow = "tip"; c.s.revTry = mt ?? "other";
  const line = "rev_tip_" + (mt && look(MTIPS, mt) ? mt : "other");
  c.say(line);
  c.say("rev_hadnt");
  if (c.chance(0.5)) c.say("rev_will");
}
function revNothing(c: Ctx) {
  if (c.s.twist !== "reverse" || c.s.revDone || !c.s.revWorked || !once(c, "revNothing")) return;
  c.s.revNothing = (c.s.revNothing ?? 0) + 1;
  if (c.s.revNothing === 1 && asks(c, "rev_try") < 2) { bump(c, "rev_try"); c.say("rev_something"); c.hold(); return; }
  c.s.revDone = true; c.s.revHow = "nothing";
  c.say("rev_giveup");
}
function revRude(c: Ctx) {
  if (c.s.twist !== "reverse" || c.s.revDone || asks(c, "rev_open") < 1 || !once(c, "revRude")) return;
  c.tip(TIPS.kind);
  c.s.revOpen = true; c.s.revRude = (c.s.revRude ?? 0) + 1;
  if (c.s.revRude >= 2) { c.s.revDone = true; c.s.revHow = "rude"; c.say("rev_giveup"); return; }
  c.s.revWorked = true;
  c.say("rev_ouch"); c.hold();
}

/** A question about a raise or a promotion (item 6), and about what counts. */
function money(c: Ctx, criteria: boolean) {
  if (!c.s.feelDone || !once(c, "money")) return;
  // before the end of the review: she promises to get to it (the question counts)
  if (!c.s.goalDone && !c.s.moneyEarly) {
    c.s.moneyEarly = true; c.s.moneyAsked = true; c.s.moneyWhen = true;
    if (criteria) { c.s.criteriaAsked = true; }
    moneyIntro(c); c.say("money_when"); c.say("money_later");
    c.hold();
    return;
  }
  c.s.moneyAsked = true;
  if (!c.s.moneyWhen) { c.s.moneyWhen = true; moneyIntro(c); c.say("money_when"); }
  if (criteria || c.s.criteriaAsked) { criteriaAnswer(c, true); return; }
  // "Can we talk about my salary?": she waits for the follow-up (the criteria step volunteers it otherwise)
  if (c.s.__finished) { criteriaAnswer(c, false); return; }
  c.hold();
}
/** "Good question." to a question; "Okay. Noted." to "I think I deserve a raise". */
function moneyIntro(c: Ctx) {
  const q = /\?\s*$/.test(c.heard) || /^\W*(?:(?:and|so|okay|ok|um|well|actually|also|emily)\W+)*(can|could|will|would|is|are|am|what|how|when|do|does|may|should)\b/i.test(c.heard);
  c.say(q ? "money_q" : "money_noted");
}
function criteriaAnswer(c: Ctx, asked: boolean) {
  if (c.s.criteriaDone) return;
  c.s.criteriaDone = true; c.s.friday = true;
  if (asked) c.s.criteriaAsked = true;
  if (asked) c.say("criteria_honest");
  c.say("criteria_why");
  c.say("criteria_promise");
}

/** Item 5 is ticked when the next meeting is agreed; the course report is done if 2–4 are too. */
function agree(c: Ctx, other: boolean) {
  if (!once(c, "agree") || c.s.checkin) return;
  c.s.checkin = true;
  if (other) c.say("checkin_other");
  if (coreDone(c)) {
    c.s.goalMet = true;
    c.complete();
    c.say("bye_good");
  } else c.say("bye_partial");
  if (!c.s.back) c.say("bye_plant");
  rememberVisit(c);
  c.end();
}

function rememberVisit(c: Ctx) {
  const seen: string[] = c.memory.twists ?? [];
  const now = [...(c.s.revOpen || c.s.revDone ? ["reverse"] : []), ...(c.s.tabDone ? ["tab"] : [])];
  c.remember({ twists: [...new Set([...seen, ...now])], reviewDone: !!c.s.goalMet });
}

/** The summary, "Anything else?" and the check-in. */
function closing(c: Ctx) {
  c.say("sum_intro");
  if (c.s.pushed && c.s.protectDone && c.s.protectHow !== "later") c.say("sum_agenda");
  else if (c.s.fbOk) c.say("sum_speak");
  const g = look(GOALS, c.s.goal);
  if (g) {
    if (g.attrs?.kind === "lead") c.say("sum_lead"); else c.say("sum_goal", { X: g.id });
    if (g.attrs?.kind === "course") c.say("sum_budget");
  }
  if (c.s.friday) c.say("sum_friday");
  c.say("sum_anything");
  expectAnything(c);
}

function expectAnything(c: Ctx) {
  const done = (cc: Ctx) => { if (once(cc, "closeAns")) checkinAsk(cc, /\b(thank|thanks|helpful|appreciate)/i.test(cc.heard)); };
  const thanks = done;
  const askMore = (cc: Ctx) => { cc.say("askme_go"); expectAnything(cc); };
  c.expect({
    id: "anything_else",
    expects: ["no_more", "fb_thanks", "thanks_today", "ask_raise", "ask_criteria", "ask_budget", "propose_checkin"],
    hints: ["closing", "askme"],
    suggest: [{ lt: "Padėkoti ir užbaigti pokalbį", hint: "closing" }, { lt: "Paklausti apie atlyginimą ar paaukštinimą", hint: "askme" }],
    on: {
      no_more: done, g_ok: done, g_dontknow: done, fb_thanks: thanks, thanks_praise: thanks, g_thanks: thanks, thanks_today: thanks,
      ask_raise: (cc) => { lateMoney(cc, false); }, ask_criteria: (cc) => { lateMoney(cc, true); },
      ask_budget: (cc) => { budget(cc); cc.say("askme_else"); expectAnything(cc); },
      propose_checkin: (cc, _s, seg) => {
        if (seg.tags.includes("when")) { if (once(cc, "closeAns")) checkinAsk(cc, false); return; }
        checkinProposal(cc, seg.tags); agree(cc, false);
      },
      g_bye: (cc) => { if (!cc.s.checkinAsked) cc.say("checkin_ask"); agree(cc, false); },
    },
    yes: askMore, no: done,
    ask: (cc) => { cc.say("askme_else"); },
  });
}

/** A money question at the very end: the whole answer at once, then "Anything else?" again. */
function lateMoney(c: Ctx, criteria: boolean) {
  if (!once(c, "money")) return;
  c.s.moneyAsked = true;
  if (!c.s.moneyWhen) { c.s.moneyWhen = true; moneyIntro(c); c.say("money_when"); }
  criteriaAnswer(c, criteria);
  c.say("askme_else");
  expectAnything(c);
}

/** The learner proposes the next check-in; "like you said" later repeats what they said (a month, a few weeks, soon). */
function checkinProposal(c: Ctx, tags: string[]) {
  c.s.checkinProposed = true;
  c.s.checkinWhen = tags.includes("month") ? "month" : tags.includes("weeks") ? "weeks" : "other";
}

function checkinAsk(c: Ctx, thanks: boolean) {
  if (!once(c, "checkinAsk")) return;
  if (thanks && once(c, "glad")) c.say("anything_thanks");
  c.s.checkinAsked = true;
  if (c.s.checkinProposed) { c.say("checkin_like_said" + (c.s.checkinWhen === "month" ? "" : c.s.checkinWhen === "weeks" ? "_weeks" : "_other")); agree(c, false); return; }
  c.say("checkin_ask");
  const yes = (cc: Ctx) => { agree(cc, false); };
  c.expect({
    id: "checkin",
    expects: ["checkin_yes_ctx", "checkin_no_ctx", "propose_checkin", "agree_idea"],
    hints: ["checkin"],
    suggest: [{ lt: "Sutikti dėl kito susitikimo", hint: "checkin" }],
    on: {
      checkin_yes_ctx: yes, propose_checkin: yes, agree_idea: yes, g_ok: yes, g_thanks: yes, g_bye: yes, fb_thanks: yes, thanks_praise: yes, thanks_today: yes,
      checkin_no_ctx: (cc) => { agree(cc, true); }, g_dontknow: (cc) => { agree(cc, true); },
    },
    yes, no: (cc) => { agree(cc, true); },
    ask: (cc) => { cc.say("checkin_ask"); },
  });
}

// A step's question after an "I don't know" that nothing else answered: its help instead, once per step. A second
// "I don't know" takes the question's own way out (its last branch: she moves on, suggests, or decides herself), so
// it never loops ("Do you agree? It's okay if you don't." again and again).
const GIVE_UP = 99;
for (const st of review.steps) {
  const ask = st.ask;
  st.ask = (c) => {
    if (st.help && DONT_KNOW.get(c) === st.id) {
      DONT_KNOW.delete(c);
      if (bump(c, "help_" + st.id) === 1) {
        st.help(c);
        // a help that settled its step ("Fair. Honestly, me neither.") goes on to the next question itself
        if (c.step === st.id && st.done(c)) askNext(c);
        return;
      }
      c.s.asks[st.id] = Math.max(asks(c, st.id), GIVE_UP);
    }
    ask(c);
  };
}

export default review;
