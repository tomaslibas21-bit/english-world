// Advanced song P30 "Can We Start Over?" (B2–C1): making up with a friend. Dan's front porch, Saturday morning
// (both Dan and Nora say tu; the learner says tu to them).
//
// The story, fitted to the Dan of s85 (owner's decision): Dan and Nora are the learner's friends, the couple
// who had the learner over for lasagna (s85). Two months ago, at Dan's backyard barbecue, in front of everybody,
// the learner said: "You never finish anything — not even that stupid boat." (Dan has been restoring an old
// wooden boat in his garage for years.) Since then: silence, and pretending not to see each other at the
// farmers' market. Today the learner knocks. Dan is normally the warm, chatty host of s85; today he is hurt,
// short and dry, and warm underneath.
//
// Flow: door (ask for a moment, or apologize at once) → apology (sincere, no "but"; a vague "I'm sorry" gets
// "Sorry for what, exactly?") → responsibility (own it, and answer "Why didn't you just call?") → Dan's turn:
// open ("That's the first time I've heard you say 'I was wrong.' I was wrong too…") or needs time (twist: the
// learner accepts and says "Say so, I'll go", and Dan calls them back: "Hey. Wait. I thought about it. Took me
// about ten seconds.") → [twist: Nora from the hall, "Dan! Don't keep your friend on the porch! The coffee's
// on."] → making it up ("Dinner. That'll do." / help with the boat / stay for lunch) → "Can we start over?" →
// "We just did. You and me." → "Come on in. The coffee's on."
// Bad moves ("I'm sorry, but…", excuses, blame, "it was just a joke", pushing) get an in-world reply and a tip,
// never a failure. Endings: reconciled (done: c.complete, memory danReconciled); left after apologizing
// (not done, memory danApologized); left before apologizing (not done).
//
// Gender: {m:…|f:…} = the player; Dan is male, Nora female ({sm:…|sf:…} where it matters).
//
// ART: no pictures yet (docs/SCENE-ART.md). People as in npcs.ts and src/ui/scene-data/s85-dinner.json: Dan
// brown skin, short black hair, glasses, light-blue shirt; Nora light skin, blonde bun, orange top, skirt.
// Set-up: the front porch of Dan and Nora's house (pale-yellow clapboard, white trim, red-brown gable roof),
// Saturday morning; the front door half open on a sliver of the hall and a lit kitchen at the end; to one side
// the garage door is open on a half-finished wooden boat on sawhorses, tools and a tarp around it.
//   1. "porch"  (start, door, apology): Dan in the half-open door, arms crossed, an unreadable face.
//   2. "hurt"   (responsibility): the same, Dan leaning on the door frame, looking down, hurt.
//   3. "turn"   (turn): the same, arms uncrossed, rubbing the back of his neck, a crooked half-smile
//               ("I was wrong too" / "Hey. Wait.").
//   4. "nora"   (nora): the door wide open; Nora leans out of the hall with a coffee pot, smiling; Dan rolls
//               his eyes and smiles.
//   5. "deal"   (make_up, start_over): Dan smiling, holding out his hand for a handshake ("Deal.").
//   6. "home"   (closing; done): the door wide open, Dan's hand on the learner's shoulder, pulling them in;
//               Mittens the cat in the hall, the kitchen light on.
//
// NEEDS (optional, the game ignores them now): "enter" { npc: "nora" } when Nora calls from the hall (s85 has
// her inside; a door/footsteps sound would help); "outro" { outcome, lt } carries the Lithuanian end-card line
// of each ending (as in p26). The spec's narration ("you turn to go") and Dan's door are left to the lines.
// NEEDS: memory is per situation, so the spec's "later dans-house scenes greet the player warmly"
// (danReconciled) can't be read by s85; a shared memory would make that possible.

import type { Ctx, Segment, SituationDef, Suggestion, Tip } from "../types";
import { t } from "../dsl";
import { GLOBAL_HANDLERS } from "../global";

// ---------------------------------------------------------------------------
// Flags used more than once

const F_DO_Q = "Question “Do” = the particle ar.";
const F_THATS = "“'s” (is): Lithuanian needs no copula here.";
const F_KAD = "Zero “that”: Lithuanian needs kad.";
const F_SORRY_AM = "“I'm … sorry” = aš … atsiprašau: the verb atsiprašau (under “sorry”) carries “am”.";
const F_SOME = "Partitive “some”: the genitive laiko carries it.";
const F_MAN = "“I (need)” = man: reikia takes the dative.";
const F_NEVER = (verb: string) => `Negative concord: after niekada the verb takes ne- (${verb}).`;
const F_NEG_GEN = "Genitive after the negated verb.";

// ---------------------------------------------------------------------------
// State helpers

type H = (c: Ctx, slots: any, seg: Segment) => void;
const NOSEG: Segment = { intent: "", slots: {}, tags: [] };

/** One learner turn can split into several pieces ("I was wrong. You didn't deserve that."): react once per
 *  turn. The dialogue creates a fresh context object for every learner turn. */
const TURN = new WeakMap<Ctx, Set<string>>();
function once(c: Ctx, key: string): boolean {
  let set = TURN.get(c);
  if (!set) { set = new Set(); TURN.set(c, set); }
  if (set.has(key)) return false;
  set.add(key);
  return true;
}
const mark = (c: Ctx, key: string) => { once(c, key); };
const now = (c: Ctx, key: string) => !!TURN.get(c)?.has(key);

const dan = (c: Ctx, line: string) => { c.speaker("dan"); c.say(line); };
const nora = (c: Ctx, line: string) => { c.speaker("nora"); c.say(line); };
/** Say a reaction at most once per learner turn. */
const react = (c: Ctx, line: string) => { if (once(c, "say:" + line)) dan(c, line); };

/** Dan asked for time and the learner hasn't accepted it yet. */
const timeOpen = (c: Ctx) => c.s.mood === "needs_time" && !!c.s.needSaid && !c.s.timeOk;
/** Responsibility: owned it, and answered (or let go of) "Why didn't you just call?". */
const respDone = (c: Ctx) => !!c.s.ownDone && (!!c.s.whyAnswered || !!c.s.whySkipped);
const stepIs = (c: Ctx, id: string) => c.step === id;
/** "I'm sorry, but…" (the lead "sorry but" leaves only what follows "but" as the answer). */
const SORRY_BUT = /\b(sorry|apologi[sz]e)\b[^.!?;]*\bbut\b/i;

/** Lithuanian end-card lines (sent with the "outro" event; see NEEDS). */
const OUTRO = {
  reconciled: "Susitaikėte. Danas kviečia vidun – kava jau verda.",
  partial: "Atsiprašei, bet iš naujo dar nepradėjote. Danas lauks tavo skambučio.",
  early: { m: "Išėjai taip ir neatsiprašęs.", f: "Išėjai taip ir neatsiprašiusi." },
};

// ---------------------------------------------------------------------------
// Tips

const TIPS: Record<string, Tip> = {
  sorry_but: { key: "sorry_but", lt: "Suprasta! Bet angliškai „I'm sorry, but…“ panaikina atsiprašymą: viskas, kas prieš „but“, nebesiskaito. O „I'm sorry if you were offended“ skamba kaip atsiprašymas už kito jausmus, ne už savo žodžius. Atsiprašoma be jokio „bet“.", better: "I'm truly sorry. There's no excuse for what I said." },
  excuse: { key: "excuse", lt: "Suprasta! Tai paaiškinimas, o ne atsiprašymas. Nuoširdus atsiprašymas pasiteisinimų neieško.", better: "There's no excuse for what I said." },
  blame: { key: "blame", lt: "Suprasta! Bet atsiprašant kaltinti kitą – blogas ženklas: pokalbis virsta ginču. Kalbėk apie save.", better: "I was wrong. It came from me." },
  just_joke: { key: "just_joke", lt: "Suprasta! Bet taip sumenkinami kito jausmai. Geriau pripažinti, kad įskaudinai.", better: "That was out of line. You didn't deserve that." },
  forgive_me: { key: "forgive_me", lt: "Suprasta! Angliškai „Forgive me“ draugui skamba gana iškilmingai, beveik kaip filme. Paprasčiau ir šilčiau – paprašyti atleidimo švelniai.", better: "I'm really sorry. I hope you can forgive me." },
  push: { key: "push", lt: "Suprasta! Bet atleisti neįmanoma įsakyti. Jei draugui reikia laiko, parodyk, kad tai gerbi.", better: "I understand if you need time." },
  calque_redeem: { key: "calque_redeem", lt: "Suprasta! „Atpirkti kaltę“ angliškai – „make it up to you“. „Redeem my guilt“ taip nesakoma.", better: "How can I make it up to you?" },
  calque_new: { key: "calque_new", lt: "Suprasta! „Pradėti iš naujo“ angliškai – „start over“ (amerikiečiai taip sako dažniausiai) arba „start again“. „From new“ ar „from zero“ taip nesakoma.", better: "Can we start over?" },
  make_peace: { key: "make_peace", lt: "Suprasta! „Make peace“ skamba kaip po karo, o „reconcile“ – labai oficialiai. Su draugu susitaikoma paprasčiau.", better: "Can we put this behind us?" },
  too_light: { key: "too_light", lt: "Suprasta! „My bad“ ar „Oops“ – labai lengvi žodžiai, tinka nebent užkliudžius kam nors alkūne. Rimtam atsiprašymui reikia daugiau.", better: "I'm truly sorry." },
  uk_ring: { key: "uk_ring", lt: "Suprasta! „Ring“ (paskambinti) – britiškas žodis. Amerikoje sakoma „call“.", better: "I should have called." },
  uk_mate: { key: "uk_mate", lt: "Suprasta! „Mate“ – britiškas kreipinys. Amerikoje draugui sakoma „buddy“ arba tiesiog jo vardas.", better: "I'm sorry, Dan." },
  uk_out_of_order: { key: "uk_out_of_order", lt: "Suprasta! „Out of order“ (peržengti ribas) – britiškas posakis. Amerikoje sakoma „out of line“.", better: "I was out of line." },
  uk_have_got: { key: "uk_have_got", lt: "Suprasta! Amerikoje dažniau sakoma „Do you have a minute?“", better: "Do you have a minute?" },
  uk_pop_in: { key: "uk_pop_in", lt: "Suprasta! „Pop in“ – labiau britiškas posakis. Amerikoje sakoma „Can I come in?“", better: "Can I come in?" },
  uk_fancy: { key: "uk_fancy", lt: "Suprasta! „Fancy a…?“ – britiškas klausimas. Amerikoje sakoma „Let me buy you…“ arba „Do you want to grab…?“", better: "Let me buy you a beer." },
};

// Automatic answers for the moments the sims don't script (see tools/sim-play.ts).
const AUTO: Record<string, string> = {
  door: "Can we talk?", apology: "I'm truly sorry for what I said at your barbecue.",
  responsibility: "You were right, and I was too proud to call.", turn: "I understand if you need time.",
  nora: "Hi, Nora!", make_up: "Let me buy you dinner.", start_over: "Can we start over?",
};

// ---------------------------------------------------------------------------

export const startOver: SituationDef = {
  id: "p30-start-over",
  song: "P30",
  songTitle: "Can We Start Over?",
  title: { en: "Can We Start Over?", lt: "Gal galime pradėti iš naujo?" },
  topic: { en: "Making up with a friend", lt: "Susitaikymas su draugu" },
  chapter: 8,
  order: 6,
  location: "dans-house",
  npc: "dan",
  npcs: ["nora"],
  goal: "Nuoširdžiai atsiprašyk Dano ir pradėkite draugystę iš naujo.",
  intro: "Šeštadienio rytas, Dano ir Noros namų prieangis. Prieš du mėnesius, Dano grilio vakarėlyje, prie visų jam išrėžei: „Tu niekada nieko nebaigi – net to kvailo laivo!“ – ir nuo tada nė karto nepaskambinai. Šiandien pagaliau pasibeldei: atėjai nuoširdžiai atsiprašyti.",

  grammar: {
    macros: {
      truly: "(truly | really | so | very | deeply | terribly | genuinely | sincerely | awfully | incredibly | so so | really really | very very)",
      sorry: "[i am] [@truly] sorry",
      bbq: "(barbecue | barbeque | bbq | cookout | party | grill party)",
      said: "(what i said | the things i said | everything i said | my words | those words | what i told you | the way i talked to you | how i talked to you | how i treated you | what i did | the things i did | that comment | my comment | that joke | my joke | that stupid joke | the way i acted | how i acted | those things)",
      where: "(at (the | your | that) @bbq | in front of (everybody | everyone | everyone else | your friends | your family | your guests | all your friends | all those people | people) | that (night | day | evening) | two months ago | back then | (about | of) (you | the boat | your boat | that boat))",
      boat: "(the | your | that | that stupid | your stupid) boat",
      silence: "(not calling [you] | never calling [you] | the silence | disappearing | staying away | being gone [for] so long | ignoring you | avoiding you | not being there | not picking up the phone | not reaching out | the last two months | these two months | two months of silence | not talking to you | not coming sooner | not coming earlier)",
      proud: "[too | so | very] (proud | stubborn)",
      time_obj: "(time | some time | space | some space | a few days | a while | a little time | more time | a little while)",
      treat: "(dinner | lunch | a beer | a drink | a coffee | coffee | breakfast | a steak | pizza | a pint | some beers | a nice dinner)",
    },
    slots: {},
  },

  intents: {
    // --- at the door -------------------------------------------------------------------------
    // a bare name ("Dan." / "Nora!"): a catch-all, so "Hi Dan, do you have a minute?" keeps the name as an address
    voc_unknown: { patterns: ["(dan | danny | nora)"] },
    its_me: { patterns: ["it is me", "it is just me", "hey it is me", "it is me again", "yes it is me"] },
    long_time: { patterns: [
      "[yeah | yes] i know it has been (too | so | way too | very) long #h:yeah_know",
      "[yeah | yes] i know it has been a (long time | while)",
      "it has been (too long | so long | way too long | a long time | a while | ages | forever | two months)",
      "long time no see",
      "i know i should have come (sooner | earlier | a long time ago)",
      "i know you did not expect me",
      "i know you are surprised [to see me]",
      "i know i am the last person you (expected | wanted) to see",
      "[i know] two months [i know]",
    ] },
    i_know: { patterns: ["[yeah | yes] i know", "i know i know"] },
    ask_how: { patterns: [
      "how are you [doing] [these days]", "how have you been [doing]", "how is it going", "how are things [with you]", "how is everything",
      "how is (nora | your wife | the family) #nora", "how are (you and nora | you guys | you two) #nora",
      "how is (the boat | your boat | the boat going) #boat", "how is (mittens | the cat | your cat) #cat",
    ] },
    can_talk: { patterns: [
      "do you have a (minute | moment | second | sec) #h:have_minute",
      "(have | got) a (minute | moment | second)", "have you got a (minute | moment | second | sec) #tip:uk_have_got",
      "give me (a chance | a minute | five minutes | a moment)",
      "(can | could | may) we talk [for a (minute | moment | second)] #h:can_talk",
      "(can | could | may) i talk to you [for a (minute | moment | second)]",
      "(can | could | may) i (have | get) a [quick] (minute | moment | word | chat) [with you]",
      "i (need | would like | want) to talk to you [about (something | the barbecue | what happened | us | what i said)]",
      "(i | we) need to talk", "we should talk",
      "is this a bad time", "is (this | now) a good time",
      "i came to (talk | see you | talk to you)", "i came (here | over | by) to talk [to you]",
      "(can | could) you give me (a minute | five minutes | a chance | a moment | two minutes)",
      "(hear me out | let me talk | let me explain | give me a minute | just listen)",
      "(can | could) i say something", "(will | would | can | could) you (hear me out | listen to me)",
      "(can | could) we have a (chat | talk)",
    ] },
    come_in: { patterns: ["(can | could | may) i come in", "(can | could | may) i pop in [for a (minute | moment)] #tip:uk_pop_in", "(can | could | may) i come inside", "[do you | would you] mind if i come in", "(can | could) i come in for a (minute | moment | second)"] },

    // --- the apology ----------------------------------------------------------------------------
    apologize: { patterns: [
      // announcing it ("Okay. Go on.")
      "i owe you an apology #announce #h:owe_apology", "i owe you a (big | huge) apology #announce",
      "i (want | need | wanted | have) to apologize [to you] #announce #h:apologize",
      "i (would like | have come | came) to apologize [to you] #announce #h:came_apologize",
      "i am here to apologize [to you] #announce", "i came (here | over | by) to apologize #announce",
      "i (came | want | wanted | need) to say (sorry | i am sorry) #announce",
      // naming what for ("specific")
      "@sorry for @said [@where] #specific #h:truly_sorry",
      "@sorry about @said [@where] #specific #h:sorry_barbecue",
      "@sorry (about | for) (the | that | your) @bbq [thing] #specific #h:sorry_barbecue",
      "@sorry (about | for) (that night | that day | what happened [at the @bbq]) #specific",
      "@sorry (about | for) (the boat thing | the thing about the boat | the boat comment | the boat joke) #specific",
      "@sorry (for | about) (saying | telling you) [that] you (never | do not) finish anything [@where] #specific",
      "@sorry (for | about) (what i said about | calling | laughing at) @boat #specific",
      "@sorry (for | about) @silence #specific #silence",
      "@sorry i (said | told you) (that | those things | what i said | it) [@where] #specific",
      "@sorry i (hurt | embarrassed | humiliated | insulted) you [@where] #specific",
      "@sorry i (did not | never) call [you] [sooner | earlier] #specific #silence",
      "@sorry for (hurting | embarrassing | humiliating | insulting) you [@where] #specific",
      "@sorry for (being | how i was) (rude | cruel | mean | unfair | a jerk | an idiot | so rude | so mean) [@where] #specific",
      "@sorry for everything i said [@where] #specific",
      "i apologize for (@said | @silence) [@where] #specific",
      "i (want | wanted | need) to apologize for (@said | @silence) [@where] #specific",
      "i owe you an apology for (@said | @silence) [@where] #specific",
      "i [really] (feel | felt) (terrible | awful | bad | so bad) about @said [@where] #specific",
      "i have been feeling (terrible | awful | bad) about @said [@where] #specific",
      "i (regret | have regretted) @said [@where] [every day | for two months] #specific",
      "i regret (saying that | it | that) [every day] #specific",
      "i am ashamed of @said [@where] #specific",
      // plain (vague): "Sorry for what, exactly?"
      "@sorry", "@sorry [about] (all this | all of this | everything | that | it)", "@sorry for everything",
      "i apologize", "my apologies", "accept my apology",
      "@sorry mate #tip:uk_mate",
      "(will | can | could | would) you [ever] forgive me", "i hope you can forgive me [someday | one day] #h:hope_forgive",
      "forgive me #forgive #tip:forgive_me", "i beg (you | your forgiveness) [to forgive me] #forgive #tip:forgive_me",
      "i ask [for] your forgiveness #forgive #tip:forgive_me",
    ] },
    // the answer to "Sorry for what, exactly?" (also on its own)
    apology_detail: { patterns: [
      "for @said [@where] #h:for_said", "about @said [@where]",
      "for (saying | telling you) [that] you (never | do not) finish anything [@where] #h:for_boat",
      "for (what i said about | calling | laughing at) @boat",
      "(about | for) (the | that) @bbq [thing]", "(about | for) (that night | what happened [at the @bbq])",
      "(for | and for) @silence #silence #h:for_silence", "and for two months of silence #silence #h:for_silence",
      "for (hurting | embarrassing | humiliating | insulting) you [@where]",
      "for (being | how i was) (rude | cruel | mean | unfair | a jerk | an idiot) [@where]",
      "for everything i said [@where] [and for not calling]",
      "(for | about) (the boat thing | the thing about the boat | the boat comment | the boat)",
    ] },
    own_it: { patterns: [
      "i was wrong [to (say that | walk away | stay away | disappear | let it grow | let it go this far | say those things | do that)] #h:was_wrong",
      "i was wrong and it came from me #h:was_wrong", "i was (so | completely | totally | really) wrong",
      "(it | that | this) (came | was coming) from me",
      "(the silence | it | that | this) was (my fault | on me | all me | all my fault)",
      "it (was | is) [all] my fault #h:my_fault", "[it is] (my | all my) fault", "my mistake", "i was not right", "(it is | that is) [all] on me", "(that | it) was my mistake",
      "i take [full] responsibility [for (it | that | what i said | everything | my words)]",
      "there is no excuse for @said #h:no_excuse", "there is no excuse [for (it | that | what i did)]", "i have no excuse",
      "you were right [and i was wrong] #h:you_right",
      "you were right and i was @proud to call #h:you_right #why #pride",
      "(that | it) was (out of line | unfair | cruel | wrong | mean | a terrible thing to say | a stupid thing to say | uncalled for) [of me] #h:out_of_line",
      "i was (out of line | unfair | cruel | mean | rude | a jerk | a fool | an idiot | stupid) [@where]",
      "i was out of order #tip:uk_out_of_order",
      "you did not deserve (that | it | any of that | those words) #h:out_of_line",
      "i should not have said (that | it | those things | any of that | what i said) [@where]",
      "i should never have said (that | it | those things) [@where]",
      "i should have called [you] [sooner | earlier | a long time ago]", "i should call [you] (sooner | earlier | back then)", "i should called [you]",
      "i should have (come | been there | apologized) [sooner | earlier | a long time ago]",
      "i should have rung you [sooner] #tip:uk_ring",
      "i let my pride (win | get in the way)",
      "i (know | understand) [that] i hurt you", "i know what i did [and i am not proud of it]",
      "i (messed | screwed) up [big time]", "i made a (big | huge | terrible) mistake",
      "i hurt you [@where]", "i am (the one | the only one) to blame", "i acted like (a jerk | an idiot | a fool)",
    ] },
    why_silent: { patterns: [
      "pride is a heavy coat [and i wore it too long] #h:heavy_coat #pride",
      "i wore (it | my pride) too long #pride",
      "i was @proud [to call [you] | to pick up the phone | to say sorry | to apologize] #h:proud_call #pride",
      "(pride | my pride | stupid pride | my stupid pride) #pride",
      "i was (ashamed | embarrassed | afraid | scared | too scared | too ashamed | too embarrassed | so ashamed | nervous) [to call | to face you | to come]",
      "i did not know (what to say | how to say it | how to start | how | what to do | how to apologize) #h:didnt_know",
      "i did not knew (what to say | how to say it | how to start | what to do)",
      "i was afraid (you would | you will | that you would) (be angry | be mad | not forgive me | hate me | not want to see me | slam the door)",
      "i (kept | was) waiting for the (perfect | right) (day | moment | time) #h:kept_waiting",
      "i kept putting it off",
      "every (day | week) i (wanted | meant) to call [and every (day | week) i did not]",
      "i (wanted | meant) to call [you] (every day | so many times | many times | a hundred times)",
      "i thought you (were | would be) (angry | mad | still angry | still mad) [at me | with me]",
      "i thought you (did not | would not) want to (see | hear from | talk to) me",
      "i did not think you (wanted | would want) to (see | hear from | talk to) me",
      "the longer i waited the harder it got",
      "i (picked up | had) the phone (a hundred times | many times | so many times)",
      "i was (a coward | too much of a coward)",
    ] },

    // --- bad moves ------------------------------------------------------------------------------------
    sorry_but: { patterns: [
      "@sorry if (you | anyone) (were | was | felt | got) (hurt | offended | upset | angry | sad)",
      "@sorry if (i | that | it | my words | what i said) (hurt | offended | upset) you",
      "@sorry [that] you (feel | felt) (that way | like that | hurt | offended | bad)",
      "@sorry [that | if] you (took it the wrong way | misunderstood [me] | took it so personally | took it personally)", "@sorry (that | if) you took it [badly]",
      "@sorry you are (upset | angry | hurt | mad)",
      "@sorry but it was (just | only) a joke",
      "mistakes were made",
    ] },
    excuse: { patterns: [
      "i was (tired | stressed | drunk | angry | upset | in a bad mood | having a bad day | under a lot of stress | not myself | a little drunk | a bit drunk | very stressed | so stressed | so tired | really stressed) [that (day | night)]",
      "i had (a bad day | a lot going on | too much to drink | a few drinks | problems [at work] | a hard time | a rough week) [that (day | night)]",
      "it was (the beer | the alcohol | the heat | a bad day | the wine | the drinks)",
      "i had (a reason | my reasons)", "(work | life) was (crazy | hard | busy)",
      "i was (busy | so busy | too busy | really busy) [to call] [at work]",
      "i (did not have | had no) time [to call]", "i forgot [to call]",
    ] },
    didnt_mean: { patterns: [
      "i did not mean it [like that]", "i did not mean (that | what i said | to hurt you | to say that | it that way | to offend you)",
      "i never meant (it | that | to hurt you | to say that)", "it came out wrong", "that is not what i meant",
    ] },
    blame: { patterns: [
      "you started it", "it was (your fault | your fault too | partly your fault | also your fault)",
      "you (were | are) [also] (wrong | rude | mean | unfair | stubborn) [too]",
      "you (could | should) have called me [too]", "why (did you not | did not you) (call | call me | pick up the phone | come)", "you never called [me] (either | too)",
      "you (said | did) (things | stuff | bad things) too", "we were both (wrong | to blame)", "it takes two",
      "you are not perfect either", "you (also | too) (never | did not) call [me]",
    ] },
    rude: { patterns: [
      "it was (just | only) a joke", "i was (just | only) joking",
      "you are (too sensitive | so sensitive | overreacting | being dramatic | being childish | too dramatic)",
      "(get over it | relax | calm down | chill [out] | lighten up)",
      "it is not a big deal", "it was not (that bad | a big deal | so bad)",
      "(come on | whatever) it was two months ago",
      "but it is true", "you never finish anything [and you know it]", "(that | it) is (true | the truth) [though]", "you know it is true",
    ] },

    // --- Dan's turn ------------------------------------------------------------------------------------
    accept_time: { patterns: [
      "i understand [if you need (@time_obj | time)] #h:understand_time",
      "i (understand | get it) [completely | totally]",
      "(that is | it is) (fair | okay | fine | completely fair | totally fair | more than fair)",
      "[just] say (so | the word) [and i will (go | leave)] #h:say_so",
      "if you want me to go i will go #leave", "i will go [now] #leave", "i will (leave | go home) [now] [then] #leave",
      "i will leave you alone [for now] #leave", "i (will give | give) you (@time_obj | all the time you need | space)", "[okay] i go [now] #leave",
      "take (all the time you need | as much time as you need | your time) #h:take_time",
      "no (pressure | rush | hurry) [take your time] #h:take_time",
      "(call | text) me when you are ready #h:call_ready", "(ring | phone) me when you are ready #tip:uk_ring",
      "i will be (here | around) [when you are ready]", "whenever you are ready",
      "i (can | will) wait [as long as you need]", "i am not going anywhere", "you know where to find me",
      "i respect that", "you need time [i understand]", "i get it you need time",
    ] },
    push: { patterns: [
      "just forgive me [already]", "forgive me already", "you (have to | must | need to | should) forgive me",
      "(can | could) we (just)? forget (it | about it | the whole thing | everything | about everything)",
      "(can not | could not) we [just] forget (it | about it | the whole thing | everything | about everything)",
      "let us [just] forget (it | about it | everything | the whole thing)",
      "come on [it has been two months]", "it has been two months [already] [come on]",
      "(do not be | stop being) [so] (stubborn | childish | dramatic | sensitive)", "you are being (stubborn | childish | ridiculous)",
      "we are too old for this", "let us (make peace | make up) [now | right now | already] #tip:make_peace",
      "why are you [still] [so] (angry | mad | upset)",
    ] },
    time_q: { patterns: [
      "how much time do you need", "how long do you need", "how long (will it | is it going to | would it) take",
      "when will you be ready", "how long should i wait", "when can i call you", "when (can | should) i come back",
    ] },

    // --- making it up ----------------------------------------------------------------------------------
    make_up_q: { patterns: [
      "how can i make it up to you #h:make_it_up",
      "how (could | do | will | should) i make it up to you",
      "what can i do to make it up to you",
      "(is there | there is) anything i can do [to make it up to you | to fix this | to make this right | to make it right]",
      "what can i do [to (fix | make up for | repair) (this | it | that | what i did | things)] #h:what_do",
      "how can i (fix | make up for | repair) (this | it | that | what i did | things)",
      "how can i make (this | it | things) right [again]",
      "tell me (what i (can | should | need to) do | what to do | how to make it up to you)",
      "what do i (need | have) to do [to fix this | to make it up to you]",
      "let me make it up to you", "i (want | would like) to make it up to you", "i will make it up to you [i promise]",
      "what do you want me to do", "how can i earn your forgiveness",
      "how can i (redeem | repair | correct | fix) my (guilt | fault | mistake | sin) #tip:calque_redeem",
      "how can i (redeem | atone for) (myself | it | this) #tip:calque_redeem",
      "how (can | could) i (pay | buy) (back | off) my guilt #tip:calque_redeem",
    ] },
    offer: { patterns: [
      "let me (buy | get) you @treat #h:buy_dinner",
      "let me take you (out | out to dinner | to dinner | to lunch | out for (dinner | lunch | a beer | a drink | coffee))",
      "(dinner | lunch | the beer | the beers | the next round | coffee | drinks) (is | are) on me", "(it is | it will be) on me",
      "i will (buy | cook | make) [you] (dinner | lunch | breakfast) [for (you | you and nora | you guys | you two | both of you)]", "i will cook [for you | for you and nora | dinner | for you guys]",
      "i will (buy | get) you @treat",
      "i will help you (with | finish) @boat #h:help_boat",
      "(let me | i can | i could | i want to | i would like to) help [you] (with | finish) @boat",
      "(we | i) could finish @boat together",
      "i will (bring | buy) (the steaks | dessert | the beer | the wine | a cake | pizza)",
      "i will (come | be there) (for | to) your (next) (barbecue | birthday | party)",
      "(can | could) i take you (out | fishing | to dinner) [sometime]",
      "[do you] fancy a (pint | beer | drink | coffee) [on me] #tip:uk_fancy",
      "how about (dinner | lunch | a beer) on me", "i (invite | am inviting | want to invite | would like to invite) you (to | for) (dinner | lunch | a beer | coffee | a drink)",
      "dinner at my place [this (saturday | friday | weekend)]",
    ] },
    // accepting Dan's price ("Dinner. That'll do."): only while it is asked
    deal_ctx: { patterns: [
      "deal #h:deal_ok", "(it is | that is) a deal", "you got it #h:you_got_it",
      "(sounds | that sounds) (fair | good | great | perfect | like a plan)", "name the (day | time | place) #h:name_day",
      "(this | next) (friday | saturday | sunday | weekend) [then] [at my place]", "i will be there",
      "count me in", "with pleasure", "(that is | it is) fair", "fair enough", "i accept", "agreed",
      "anything you want", "whatever you want",
    ] },
    cant_cook: { patterns: [
      "[but] i can not cook #h:cant_cook", "i am a (terrible | bad | horrible | awful) cook", "(nora | everybody) knows i can not cook",
      "my cooking is (terrible | bad | awful | horrible)", "i do not (know how to cook | cook)", "i burn (everything | water)",
    ] },
    promise: { patterns: [
      "it will not happen again [i promise] #h:wont_happen", "it will never happen again [i promise]",
      "words are cheap [so watch me] #h:words_cheap", "watch me",
      "i (will | am going to) (call | visit | see) [you] more often [i promise] #h:call_more",
      "i will ring you more often #tip:uk_ring",
      "i (will | am going to) be there [for (christmas | birthdays | every birthday | the barbecues | you | your birthday)] [from now on]",
      "i will never (do that | say that | disappear | stay away | do it) again",
      "i will (do better | be a better friend | prove it | show you)",
      "i promise [you]", "you have my word", "i will call you [every week | more]",
      "from now on i will (call | be there) [more]",
    ] },

    // --- starting over ---------------------------------------------------------------------------------
    start_over: { patterns: [
      "can we start over #h:start_over",
      "can we start over (you and me | me and you) #h:start_over_me_you",
      "(could | can) we (start | begin) (over | again | from scratch) [you and me | me and you]", "we (can | could) (start | begin) (over | again)",
      "(could | can) we (try | give it) [it] (again | another try | another shot | one more try)",
      "(can | could) we be friends again #h:friends_again #friends",
      "(are we | we are) [still] friends #friends", "(can | could) we still be friends #friends", "friends [again] #friends",
      "are we (good | okay | cool | all right) [now]",
      "(can | could) we put (this | it | that | all this | all of this) behind us #h:put_behind",
      "(can | could) we (forget the past | turn the page | move on | move past this) [and start over]",
      "i (want | would like | would love) [us] to start over",
      "i (want | would like) (my friend back | us to be friends again | our friendship back)",
      "let us (start over | be friends again | put this behind us)", "start over [you and me]",
      "(can | could) we (begin | start) (from new | from zero | anew | from the beginning) #tip:calque_new",
      "(can | could | shall) we make peace #tip:make_peace", "(can | could) we reconcile #tip:make_peace",
    ] },
    missed_you: { patterns: [
      "i (missed | have missed) you [so much | a lot | like crazy] #h:missed_you",
      "i (missed | have missed) (you guys | you two | you both) #h:nora_missed",
      "i missed (this | us | you and nora | our talks | hanging out | our friendship)",
      "i (missed | have missed) my (best friend | friend | buddy)",
    ] },
    // "Cheers, mate!" (British): a plain thanks
    thanks_mate: { patterns: ["(cheers | thanks | thank you) [so much] mate #tip:uk_mate"] },
    thanks_hearing: { patterns: [
      "thank you for hearing me out #h:heard_out", "thanks for hearing me out #h:heard_out",
      "(thank you | thanks) for (listening | your time | talking to me | giving me a chance | opening the door | letting me talk | letting me explain | listening to me | the chance | understanding | forgiving me | hearing me)",
      "(thank you | thanks) for not (slamming | closing | shutting) the door [in my face] #h:thanks_door",
      "(thank you | thanks) for (letting me in | not sending me away | not throwing me out)",
      "i appreciate you (listening | hearing me out)",
    ] },
    hi_nora: { patterns: [
      "(hi | hello | hey | good morning) nora [it is so good to see you] #h:hi_nora",
      "(it is | it is so) (good | nice | great) to see you [too | again] [nora]",
      "(good | nice | great) to see you [too | again] [nora]",
    ] },
  },

  lines: {
    // --- the door ---------------------------------------------------------------------------------
    door_open: [
      t("Well, | well. | Look | who's | here.", "Na, | na. | Žiūrėk, | kas | čia.", "Na, na. Žiūrėk, kas atėjo.", { flags: { 3: F_THATS } }),
      t("Two | months, | and | now | you're | here?", "Du | mėnesiai, | ir | dabar | tu esi | čia?", "Du mėnesiai – ir dabar tu čia?"),
      t("Oh. | It's | you. | It's been | a while.", "O. | Tai | tu. | Praėjo | nemažai laiko.", "O. Tai tu. Praėjo nemažai laiko.", { flags: { 1: F_THATS } }),
    ],
    door_cold: [t("Hi.", "Labas.", "Labas."), t("Hey.", "Labas.", "Labas.")],
    door_what: [
      t("So | what | can | I | do | for you?", "Tai | ką | galiu | aš | padaryti | tau?", "Tai ko tau reikia?"),
      t("What | brings | you | here?", "Kas | atveda | tave | čia?", "Kas tave čia atvedė?"),
    ],
    long_time_react: [
      t("Two | months. | In a town | this | size.", "Du | mėnesiai. | Miestelyje | tokio | dydžio.", "Du mėnesiai. Tokiame mažame miestelyje."),
    ],
    market_joke: [
      t("Do | you | know | how | hard | it is | to avoid | someone | at | the | farmers' | market?",
        "Ar | tu | žinai, | kaip | sunku | būna | išvengti | ko nors | — | — | ūkininkų | turguje?",
        "Ar žinai, kaip sunku ko nors išvengti ūkininkų turguje?",
        { flags: { 0: F_DO_Q, 5: "Dummy “it”: the impersonal būna (under “is”) needs no subject.", 8: "“at”: the locative ending of turguje carries it (farmers' intervenes)." } }),
    ],
    how_been: [
      t("Fine. | Busy. | You | know | me | and | that | boat.", "Gerai. | Užsiėmęs. | Tu | pažįsti | mane | ir | tą | laivą.", "Gerai. Daug darbo. Juk žinai – aš ir tas laivas."),
    ],
    how_nora: [
      t("She's | fine. | She | asks | about | you | a lot.", "Jai | gerai. | Ji | klausia | apie | tave | dažnai.", "Jai viskas gerai. Ji dažnai apie tave klausia.",
        { flags: { 0: "“She's (fine)”: Lithuanian uses the dative jai with no verb.", 6: "“a lot” here = often: dažnai." } }),
    ],
    how_cat: [t("Mittens? | Fat | and | happy.", "Mitens? | Stora | ir | laiminga.", "Mitens? Stora ir laiminga.")],
    porch: [t("Let's start | with | the | porch.", "Pradėkime | nuo | — | prieangio.", "Pradėkime nuo prieangio.")],
    listening: [
      t("Okay. | I'm listening.", "Gerai. | Klausau.", "Gerai. Klausau."),
      t("Go ahead. | I'm listening.", "Kalbėk. | Klausau.", "Kalbėk. Klausau."),
      t("Fine. | Say | what | you | came | to say.", "Gerai. | Sakyk, | ką | tu | atėjai | pasakyti.", "Gerai. Sakyk, ką atėjai pasakyti."),
    ],

    // --- the apology --------------------------------------------------------------------------------
    door_apology: [
      t("Okay. | Go on.", "Gerai. | Tęsk.", "Gerai. Tęsk."),
      t("Well. | That's | a | start.", "Na. | Tai | — | pradžia.", "Na. Tai jau šis tas.", { flags: { 1: F_THATS } }),
    ],
    sorry_for_what: [
      t("Sorry | for | what, | exactly?", "Atsiprašai | už | ką, | tiksliai?", "Už ką tiksliai atsiprašai?"),
      t("You'll | have to | be | a little | more | specific.", "Tau | teks | būti | truputį | — | {m:konkretesniam|f:konkretesnei}.",
        "Teks būti truputį {m:konkretesniam|f:konkretesnei}.",
        { flags: { 0: "“You'll” = tau: the future teks (under “have to”) carries “will” and takes the dative.", 4: "“more”: the comparative suffix -esn- of the next word carries it." } }),
    ],
    sorry_accept_vague: [t("Okay. | Okay. | I | hear | you.", "Gerai. | Gerai. | Aš | girdžiu | tave.", "Gerai, gerai. Girdžiu.")],
    sorry_but_react: [
      t("And | there it is: | the | “but.”", "Ir | štai ir jis: | — | „bet“.", "Ir štai jis – tas „bet“."),
      t("Everything | before | the | “but” | doesn't count.", "Viskas | prieš | — | „bet“ | nesiskaito.", "Viskas, kas pasakyta prieš „bet“, nesiskaito."),
    ],
    excuse_react: [
      t("That's | an | explanation, | not | an | apology.", "Tai | — | paaiškinimas, | ne | — | atsiprašymas.", "Tai paaiškinimas, o ne atsiprašymas.", { flags: { 0: F_THATS } }),
    ],
    didnt_mean_react: [t("Maybe | not. | But | you | said | it.", "Gal | ir ne. | Bet | tu | pasakei | tai.", "Gal ir ne. Bet tu tai pasakei.")],
    blame_react: [
      t("Did | you | come | here | to apologize | or | to argue?", "Ar | tu | atėjai | čia | atsiprašyti | ar | ginčytis?", "Atėjai atsiprašyti ar ginčytis?",
        { flags: { 0: "Question “Did” = the particle ar; the past tense sits on atėjai." } }),
    ],
    blame_late: [t("Hey. | Don't start | that | again.", "Ei. | Nepradėk | to | vėl.", "Ei, tik vėl nepradėk.", { flags: { 2: F_NEG_GEN } })],
    rude_react: [
      t("Wow. | Okay. | Want | to try | that | again?", "Oho. | Gerai. | Nori | pabandyti | tai | dar kartą?", "Oho. Gerai. Nori pabandyti dar kartą?",
        { flags: { 2: "Casual “(Do you) want”: a spoken question; Lithuanian needs no ar here either." } }),
    ],
    nudge_apology: [
      t("You | didn't come | here | to talk | about | the | weather.", "Tu | neatėjai | čia | kalbėti | apie | — | orus.", "Juk neatėjai čia kalbėti apie orus."),
    ],

    // --- responsibility -------------------------------------------------------------------------------
    dan_hurt: [
      t("You | said | I | never | finish | anything. | In front of | everybody. | At | my | own | barbecue.",
        "Tu | pasakei, | kad aš | niekada | nebaigiu | nieko. | Prie | visų. | — | Mano | paties | grilio vakarėlyje.",
        "Tu pasakei, kad aš niekada nieko nebaigiu. Prie visų. Mano paties grilio vakarėlyje.",
        { flags: { 2: F_KAD, 4: F_NEVER("nebaigiu"), 8: "“At”: the locative ending of vakarėlyje carries it (my own intervenes)." } }),
    ],
    dan_quote: [
      t("Your | words: | “Not even | that | stupid | boat.”", "Tavo | žodžiai: | „Net | to | kvailo | laivo.“", "Tavo žodžiai: „Net to kvailo laivo.“",
        { flags: { 3: "Genitive to … laivo: the negated verb (nebaigi) is understood from before." } }),
    ],
    that_hurt: [t("That | really | hurt.", "Tai | tikrai | įskaudino.", "Tai mane tikrai įskaudino.")],
    ask_why_silent: [
      t("And | then | two | months | of | nothing. | Why | didn't | you | just | call?",
        "O | paskui | du | mėnesiai | — | nieko. | Kodėl | — | tu | tiesiog | nepaskambinai?",
        "O paskui – du mėnesiai tylos. Kodėl tiesiog nepaskambinai?",
        { flags: { 4: "“of”: no Lithuanian word; nieko follows mėnesiai directly.", 7: "“didn't”: the ne- of nepaskambinai (under “call”) carries it (C-NEG-SPLIT)." } }),
      t("Two | months. | Why | the | silence?", "Du | mėnesiai. | Kodėl | — | tyla?", "Du mėnesiai. Kodėl tylėjai?"),
    ],
    why_again: [
      t("Okay. | But | why | didn't | you | call?", "Gerai. | Bet | kodėl | — | tu | nepaskambinai?", "Gerai. Bet kodėl nepaskambinai?",
        { flags: { 3: "“didn't”: the ne- of nepaskambinai (under “call”) carries it (C-NEG-SPLIT)." } }),
      t("Mm. | And | the | silence?", "Mhm. | O | — | tyla?", "Mhm. O kodėl tylėjai?"),
    ],
    own_nudge: [
      t("And | what | you | said | at | the | barbecue?", "O | tai, ką | tu | pasakei | per | — | grilio vakarėlį?", "O tai, ką pasakei per grilio vakarėlį?"),
    ],
    heard_you: [t("I | heard | you.", "Aš | girdėjau | tave.", "Girdėjau."), t("Yeah. | You | said | that.", "Taip. | Tu | pasakei | tai.", "Taip, jau sakei.")],
    pride_coat: [t("Pride | is | a | heavy | coat, | huh?", "Išdidumas | yra | — | sunkus | paltas, | ar ne?", "Išdidumas – sunkus paltas, ar ne?")],
    know_that: [t("Yeah. | I | know | something | about | that.", "Taip. | Aš | žinau | šį tą | apie | tai.", "Taip. Šį tą apie tai žinau.")],

    // --- Dan's turn ---------------------------------------------------------------------------------
    dan_first_time: [
      t("You know, | that's | the | first | time | I've | heard | you | say | “I | was wrong.”",
        "Žinai, | tai | — | pirmas | kartas, | kai aš | girdžiu | tave | sakant | „aš | klydau“.",
        "Žinai, pirmą kartą girdžiu tave sakant „aš klydau“.",
        { flags: { 1: F_THATS, 5: "“I've”: Lithuanian adds kai (when); the perfect has no word, the present girdžiu carries it." } }),
    ],
    dan_thats_new: [
      t("Huh. | An | apology. | That's | new.", "Hm. | — | Atsiprašymas. | Tai | nauja.", "Hm. Atsiprašymas. Tai kažkas naujo.", { flags: { 3: F_THATS } }),
      t("Huh. | You | really | mean | it.", "Hm. | Tu | tikrai | rimtai sakai | —.", "Hm. Tu kalbi rimtai.",
        { flags: { 4: "“it” needs no word: rimtai sakai (under “mean”) already says “mean it”." } }),
    ],
    dan_wrong_too: [
      t("I | was wrong | too, | you know. | Too | proud | to pick up | the | phone.", "Aš | klydau | irgi, | žinai. | Per daug | išdidus | pakelti | — | ragelį.",
        "Žinai, aš irgi klydau. Buvau per daug išdidus pakelti ragelį."),
      t("I | wasn't | perfect | either. | I | never | called | you.", "Aš | nebuvau | tobulas | irgi. | Aš | niekada | nepaskambinau | tau.",
        "Aš irgi nebuvau tobulas. Niekada tau nepaskambinau.", { flags: { 3: "“either” after a negation = irgi.", 6: F_NEVER("nepaskambinau") } }),
    ],
    need_time: [
      t("I | hear | you. | But | I | need | some | time | to think.", "Aš | girdžiu | tave. | Bet | man | reikia | — | laiko | pagalvoti.",
        "Girdžiu tave. Bet man reikia laiko pagalvoti.", { flags: { 4: F_MAN, 6: F_SOME } }),
      t("This | is | a lot. | I | need | some | time.", "Tai | yra | daug. | Man | reikia | — | laiko.", "Tai daug. Man reikia laiko.", { flags: { 3: F_MAN, 5: F_SOME } }),
    ],
    push_react: [t("Don't push | me, | okay? | Not | today.", "Nespausk | manęs, | gerai? | Ne | šiandien.", "Nespausk manęs, gerai? Ne šiandien.", { flags: { 1: F_NEG_GEN } })],
    push_close: [t("Let's talk | another | time, | okay?", "Pasikalbėkime | kitą | kartą, | gerai?", "Pasikalbėkime kitą kartą, gerai?")],
    just_time: [t("Just | give | me | some | time.", "Tiesiog | duok | man | — | laiko.", "Tiesiog duok man laiko.", { flags: { 3: F_SOME } })],
    time_q_react: [t("I'll let | you | know.", "Pranešiu | tau | —.", "Pranešiu tau.", { flags: { 2: "“know” is part of “let … know”; pranešti (under “let”) carries it." } })],
    time_ok: [t("Thanks. | I | appreciate | that.", "Ačiū. | Aš | vertinu | tai.", "Ačiū. Labai tai vertinu.")],
    wait_twist: [t("Hey. | Wait.", "Ei. | Palauk.", "Ei. Palauk.")],
    wait_twist2: [
      t("I | thought | about | it. | Took | me | about | ten | seconds.", "Aš | pagalvojau | apie | tai. | Užtruko | man | maždaug | dešimt | sekundžių.",
        "Pagalvojau. Užtrukau kokias dešimt sekundžių."),
    ],

    // --- Nora (twist) ---------------------------------------------------------------------------------
    nora_hall: [t("Oh! | Look | who | finally | showed up!", "O! | Žiūrėk, | kas | pagaliau | atėjo!", "O! Žiūrėk, kas pagaliau atėjo!")],
    nora_coffee: [
      t("Dan! | Don't keep | your | friend | on the porch! | The | coffee's on.", "Danai! | Nelaikyk | savo | {m:draugo|f:draugės} | prieangyje! | — | Kava verda.",
        "Danai! Nelaikyk {m:draugo|f:draugės} prieangyje! Kava jau verda.", { flags: { 3: F_NEG_GEN } }),
    ],
    nora_hi: [
      t("Oh, | it's | so | good | to see | you, | honey!", "O, | tai yra | taip | gera | matyti | tave, | {m:mielasis|f:mieloji}!", "O, kaip gera tave matyti, {m:mielasis|f:mieloji}!"),
      t("Hi, | honey! | We | missed | you.", "Labas, | {m:mielasis|f:mieloji}! | Mes | pasiilgome | tavęs.", "Labas, {m:mielasis|f:mieloji}! Pasiilgome tavęs."),
    ],
    dan_nora_aside: [t("She | waited | two | months | to say | that.", "Ji | laukė | du | mėnesius | pasakyti | tai.", "Ji du mėnesius laukė progos tai pasakyti.")],

    // --- making it up ---------------------------------------------------------------------------------
    so_what_now: [
      t("So. | What | now?", "Tai. | Kas | dabar?", "Na, ir kas dabar?"),
      t("Okay. | So | what | happens | now?", "Gerai. | Tai | kas | bus | dabar?", "Gerai. Tai kas dabar bus?"),
    ],
    i_do: [t("Well, | I | do.", "Na, | aš | [žinau].", "Na, o aš žinau.", { flags: { 2: "Elliptical “do” (= know): Lithuanian repeats the verb, žinau." } })],
    make_up_dinner: [t("Dinner. | That'll do.", "Vakarienė. | To užteks.", "Vakarienė. To užteks.")],
    make_up_more: [t("And | you're cooking.", "Ir | tu gaminsi.", "Ir gaminsi tu.", { flags: { 1: "Present progressive for a plan: Lithuanian uses the future gaminsi." } })],
    make_up_boat: [
      t("Help | me | finish | the | boat. | Since | I | never | finish | anything.", "Padėk | man | pabaigti | — | laivą. | Kadangi | aš | niekada | nebaigiu | nieko.",
        "Padėk man pabaigti laivą. Juk aš niekada nieko nebaigiu.", { flags: { 8: F_NEVER("nebaigiu") } }),
    ],
    make_up_stay: [
      t("You | could | start | by | staying | for lunch.", "Tu | galėtum | pradėti | nuo to, kad | pasiliktum | pietų.", "Galėtum pradėti nuo to, kad pasiliktum pietų.",
        { flags: { 3: "“by” + -ing = nuo to, kad + the conditional (pasiliktum)." } }),
    ],
    deal: [t("Deal.", "Sutarta.", "Sutarta."), t("Good. | It's a deal.", "Gerai. | Sutarta.", "Gerai. Sutarta.")],
    deal_q: [t("So? | Deal?", "Tai? | Sutarta?", "Tai kaip? Sutarta?")],
    wrong_answer: [t("Wrong | answer. | Try | again.", "Neteisingas | atsakymas. | Bandyk | dar kartą.", "Neteisingas atsakymas. Bandyk dar kartą.")],
    cant_cook_react: [t("I | know. | That's | the | punishment.", "Aš | žinau. | Tai yra | — | bausmė.", "Žinau. Tai ir yra bausmė.")],
    offer_react: [
      t("Now you're talking.", "Va, čia jau kitas reikalas.", "Va, čia jau kitas reikalas."),
      t("Deal. | But | I'm holding | you | to | it.", "Sutarta. | Bet | laikysiu | tave | prie | žodžio.", "Sutarta. Bet laikysiu tave prie žodžio.",
        { flags: { 2: "Present progressive for a promise: Lithuanian uses the future laikysiu.", 5: "“it” (your promise) = žodžio, from the idiom laikyti prie žodžio." } }),
    ],
    promise_react: [t("Words | are | cheap. | But | okay, | I'll watch.", "Žodžiai | yra | pigūs. | Bet | gerai, | stebėsiu.", "Žodžiai pigūs. Bet gerai – stebėsiu.")],
    start_over_early: [
      t("Maybe. | But | first | you | owe | me | a | dinner.", "Galbūt. | Bet | pirma | tu | {m:esi skolingas|f:esi skolinga} | man | — | vakarienę.",
        "Galbūt. Bet pirma esi man {m:skolingas|f:skolinga} vakarienę."),
    ],
    too_soon: [t("Whoa. | One thing at a time.", "Oho. | Ne viskas iš karto.", "Oho. Ne viskas iš karto.")],
    missed_early: [t("Funny | way | of showing | it.", "Keistas | būdas | parodyti | tai.", "Na, keistai tai parodei.")],
    not_yet_heard: [t("I | haven't heard | anything | yet.", "Aš | negirdėjau | nieko | dar.", "Dar nieko negirdėjau.", { flags: { 2: "Negative concord: anything → nieko after the negated verb." } })],

    // --- starting over ---------------------------------------------------------------------------------
    anything_else: [t("Anything | else | you | want | to say?", "Ką nors | dar | tu | nori | pasakyti?", "Dar ką nors nori pasakyti?")],
    start_over_yes: [
      t("We | just | did. | You | and | me.", "Mes | ką tik | [pradėjome]. | Tu | ir | aš.", "Jau pradėjome. Tu ir aš.",
        { flags: { 2: "Elliptical “did” (= started over): Lithuanian repeats the verb, pradėjome." } }),
      t("We | already | did, | a | minute | ago.", "Mes | jau | [pradėjome], | — | minutę | prieš.", "Jau pradėjome – prieš minutę.",
        { flags: { 2: "Elliptical “did” (= started over): Lithuanian repeats the verb, pradėjome.", 5: "“ago” = prieš, which Lithuanian puts before minutę." } }),
    ],
    friends_react: [
      t("We | never | stopped. | We | just | stopped | talking.", "Mes | niekada | nenustojome. | Mes | tik | nustojome | kalbėtis.",
        "Mes niekada ir nenustojome būti draugais. Tik nustojome kalbėtis.", { flags: { 2: F_NEVER("nenustojome") } }),
    ],
    dan_offers_start: [
      t("So. | Are | we | starting over | or | what?", "Tai. | Ar | mes | pradedame iš naujo | ar | ką?", "Tai kaip – pradedam iš naujo ar ką?",
        { flags: { 1: "“Are” in a yes/no question = the particle ar; the progressive sits on pradedame." } }),
    ],
    me_too: [
      t("Yeah. | Me | too.", "Taip. | Aš | irgi.", "Taip. Aš irgi."),
      t("I | missed | you | too, | you | idiot.", "Aš | pasiilgau | tavęs | irgi, | tu | {m:kvaily|f:kvaile}.", "Aš irgi tavęs pasiilgau, {m:kvaily|f:kvaile}."),
    ],
    anytime_wait: [
      t("Anytime. | Just | don't make | me | wait | two | months | next | time.", "Visada prašom. | Tik | neversk | manęs | laukti | du | mėnesius | kitą | kartą.",
        "Visada prašom. Tik kitą kartą neversk manęs laukti du mėnesius.", { flags: { 3: F_NEG_GEN } }),
    ],
    hush: [t("Oh, | hush. | Come | inside.", "Oi, | liaukis. | Užeik | vidun.", "Oi, liaukis. Užeik vidun.")],

    // --- the endings ---------------------------------------------------------------------------------
    come_home: [
      t("Come on in. | The | coffee's on.", "Užeik. | — | Kava verda.", "Užeik. Kava jau verda."),
      t("Come on in. | Mittens | missed | you | too.", "Užeik. | Mitens | pasiilgo | tavęs | irgi.", "Užeik. Mitens irgi tavęs pasiilgo."),
    ],
    talk_too_much: [
      t("You | always | did | talk | too | much.", "Tu | visada | — | kalbėdavai | per | daug.", "Tu visada per daug kalbėdavai.",
        { flags: { 2: "Emphatic “did” has no word: the habitual past kalbėdavai (under “talk”) carries it." } }),
    ],
    boat_final: [
      t("Oh, | and | the | boat? | Still | not finished. | Not | one | word.", "O, | ir | — | laivas? | Vis dar | nebaigtas. | Nė | vieno | žodžio.",
        "O, ir laivas? Vis dar nebaigtas. Nė žodžio."),
    ],
    leave_partial: [t("Okay. | Thanks | for | coming by.", "Gerai. | Ačiū, | kad | užsukai.", "Gerai. Ačiū, kad užsukai.")],
    call_me: [
      t("Call | me | sometime. | I | mean | it.", "Paskambink | man | kada nors. | Aš | rimtai sakau | —.", "Paskambink man kada nors. Rimtai sakau.",
        { flags: { 5: "“it” needs no word: rimtai sakau (under “mean”) already says “I mean it”." } }),
    ],
    leave_early: [t("Okay. | See you around, | I guess.", "Gerai. | Iki pasimatymo, | turbūt.", "Gerai. Iki pasimatymo, turbūt.")],
    ack: [t("Mm.", "Mhm.", "Mhm."), t("Okay.", "Gerai.", "Gerai.")],
  },

  hints: {
    talk: {
      lt: "Paprašyti pasikalbėti",
      items: [
        { id: "yeah_know", s: t("Yeah, | I | know. | It's been | too | long.", "Taip, | aš | žinau. | Praėjo | per | daug laiko.", "Taip, žinau. Praėjo per daug laiko."), note: "Dainos frazė: taip atsakoma į „Du mėnesiai – ir dabar tu čia?“" },
        { id: "have_minute", s: t("Do | you | have | a | minute?", "Ar | tu | turi | — | minutėlę?", "Ar turi minutėlę?", { flags: { 0: F_DO_Q } }) },
        { id: "can_talk", s: t("Can | we | talk?", "Ar galime | mes | pasikalbėti?", "Ar galime pasikalbėti?") },
        { id: "came_apologize", s: t("I | came | to apologize.", "Aš | atėjau | atsiprašyti.", "Atėjau atsiprašyti.") },
      ],
    },
    apology: {
      lt: "Nuoširdžiai atsiprašyti – be jokio „bet“",
      items: [
        { id: "owe_apology", s: t("Dan, | I | owe | you | an | apology.", "Danai, | aš | {m:esu skolingas|f:esu skolinga} | tau | — | atsiprašymą.", "Danai, turiu tavęs atsiprašyti.") },
        { id: "truly_sorry", s: t("I'm | truly | sorry | for | what | I | said.", "Aš | nuoširdžiai | atsiprašau | už | tai, ką | aš | pasakiau.", "Nuoširdžiai atsiprašau už tai, ką pasakiau.", { flags: { 0: F_SORRY_AM } }) },
        { id: "sorry_barbecue", s: t("I'm | so | sorry | about | what | I | said | at | your | barbecue.", "Aš | labai | atsiprašau | dėl | to, ką | aš | pasakiau | — | tavo | grilio vakarėlyje.",
          "Labai atsiprašau dėl to, ką pasakiau tavo grilio vakarėlyje.", { flags: { 0: F_SORRY_AM, 7: "“at”: the locative ending of vakarėlyje carries it (your intervenes)." } }) },
        { id: "apologize", s: t("I | want | to apologize.", "Aš | noriu | atsiprašyti.", "Noriu atsiprašyti.") },
        { id: "hope_forgive", s: t("I | hope | you | can | forgive | me.", "Aš | tikiuosi, | kad tu | galėsi | atleisti | man.", "Tikiuosi, kad galėsi man atleisti.",
          { flags: { 2: F_KAD, 3: "“can” about the future = galėsi." } }) },
      ],
    },
    detail: {
      lt: "Pasakyti, už ką tiksliai atsiprašai",
      items: [
        { id: "for_said", s: t("For | what | I | said | about | you.", "Už | tai, ką | aš | pasakiau | apie | tave.", "Už tai, ką apie tave pasakiau.") },
        { id: "for_boat", s: t("For | saying | you | never | finish | anything.", "Už | tai, kad pasakiau, | kad tu | niekada | nebaigi | nieko.", "Už tai, kad pasakiau, jog tu niekada nieko nebaigi.",
          { flags: { 2: F_KAD, 4: F_NEVER("nebaigi") } }) },
        { id: "for_silence", s: t("And | for | two | months | of | silence.", "Ir | už | du | mėnesius | — | tylos.", "Ir už du mėnesius tylos.", { flags: { 4: "“of”: the genitive tylos carries it." } }) },
      ],
    },
    responsibility: {
      lt: "Prisiimti atsakomybę",
      items: [
        { id: "was_wrong", s: t("I | was wrong, | and | it | came | from | me.", "Aš | klydau, | ir | tai | kilo | iš | manęs.", "Klydau, ir {m:kaltas|f:kalta} tik aš.") },
        { id: "no_excuse", s: t("There's | no | excuse | for | what | I | said.", "Nėra | jokio | pateisinimo | — | tam, ką | aš | pasakiau.", "Tam, ką pasakiau, nėra jokio pateisinimo.",
          { flags: { 0: "Existential “There's” with “no”: Lithuanian negates the verb, nėra.", 3: "“for”: the dative tam (under “what”) carries it." } }) },
        { id: "you_right", s: t("You | were | right, | and | I | was | too | proud | to call.", "Tu | buvai | {sm:teisus|sf:teisi}, | o | aš | buvau | per daug | {m:išdidus|f:išdidi} | paskambinti.",
          "Tu buvai {sm:teisus|sf:teisi}, o aš buvau per daug {m:išdidus|f:išdidi} paskambinti.") },
        { id: "my_fault", s: t("It | was | my | fault.", "Tai | buvo | mano | kaltė.", "Tai buvo mano kaltė.") },
        { id: "out_of_line", s: t("That | was | out of line. | You | didn't deserve | that.", "Tai | buvo | nederama. | Tu | nenusipelnei | to.", "Peržengiau ribą. Tu to nenusipelnei.") },
      ],
    },
    why: {
      lt: "Paaiškinti, kodėl nepaskambinai",
      items: [
        { id: "heavy_coat", s: t("Pride's | a | heavy | coat, | and | I | wore | it | too | long.", "Išdidumas yra | — | sunkus | paltas, | ir | aš | nešiojau | jį | per | ilgai.",
          "Išdidumas – sunkus paltas, ir aš jį nešiojau per ilgai."), note: "Dainos frazė." },
        { id: "proud_call", s: t("I | was | too | proud | to call.", "Aš | buvau | per daug | {m:išdidus|f:išdidi} | paskambinti.", "Buvau per daug {m:išdidus|f:išdidi} paskambinti.") },
        { id: "didnt_know", s: t("I | didn't know | what | to say.", "Aš | nežinojau, | ką | pasakyti.", "Nežinojau, ką pasakyti.") },
        { id: "kept_waiting", s: t("I | kept | waiting | for | the | perfect | day.", "Aš | vis | laukiau | — | — | tobulos | dienos.", "Vis laukiau tinkamos dienos.",
          { flags: { 1: "“kept” + -ing = vis (again and again), linked to laukiau.", 3: "“for”: laukti takes the genitive, so “for” has no word." } }) },
      ],
    },
    time: {
      lt: "Priimti, kad Danui reikia laiko",
      items: [
        { id: "understand_time", s: t("I | understand | if | you | need | time.", "Aš | suprantu, | jei | tau | reikia | laiko.", "Suprantu, jei tau reikia laiko.", { flags: { 3: "“you (need)” = tau: reikia takes the dative." } }) },
        { id: "say_so", s: t("Say so, | and | I'll go.", "Tik pasakyk, | ir | išeisiu.", "Tik pasakyk – ir išeisiu."), note: "Dainos frazė: „Tik pasakyk – ir išeisiu.“" },
        { id: "take_time", s: t("No | pressure. | Take your time.", "Jokio | spaudimo. | Neskubėk.", "Jokio spaudimo. Neskubėk.") },
        { id: "call_ready", s: t("Call | me | when | you're | ready.", "Paskambink | man, | kai | tu būsi | {sm:pasiruošęs|sf:pasiruošusi}.", "Paskambink, kai būsi {sm:pasiruošęs|sf:pasiruošusi}.",
          { flags: { 3: "“you're” = tu būsi: after kai the future is used for a future time." } }) },
      ],
    },
    make_up: {
      lt: "Paklausti, kaip galėtum atpirkti kaltę",
      items: [
        { id: "make_it_up", s: t("How | can | I | make it up | to you?", "Kaip | galiu | aš | atsilyginti | tau?", "Kaip galėčiau savo kaltę atpirkti?") },
        { id: "what_do", s: t("What | can | I | do | to fix | this?", "Ką | galiu | aš | padaryti, | kad ištaisyčiau | tai?", "Ką galiu padaryti, kad tai ištaisyčiau?") },
        { id: "buy_dinner", s: t("Let | me | buy | you | dinner.", "Leisk | man | nupirkti | tau | vakarienę.", "Leisk pavaišinti tave vakariene.") },
        { id: "help_boat", s: t("I'll help | you | finish | the | boat.", "Padėsiu | tau | pabaigti | — | laivą.", "Padėsiu tau pabaigti laivą.") },
      ],
    },
    promise: {
      lt: "Pažadėti, kad tai nepasikartos",
      items: [
        { id: "wont_happen", s: t("It | won't happen | again.", "Tai | nepasikartos | daugiau.", "Daugiau taip nebus.") },
        { id: "words_cheap", s: t("Words | are | cheap, | so | watch | me.", "Žodžiai | yra | pigūs, | tad | stebėk | mane.", "Žodžiai pigūs, tad žiūrėk."), note: "Dainos frazė." },
        { id: "call_more", s: t("I'll call | more | often. | I | promise.", "Skambinsiu | — | dažniau. | Aš | pažadu.", "Skambinsiu dažniau. Pažadu.", { flags: { 1: "“more”: the comparative suffix of dažniau carries it." } }) },
      ],
    },
    deal: {
      lt: "Sutikti su Dano sąlygomis",
      items: [
        { id: "deal_ok", s: t("Deal.", "Sutarta.", "Sutarta.") },
        { id: "you_got_it", s: t("You got it.", "Bus padaryta.", "Bus padaryta."), register: "casual" },
        { id: "name_day", s: t("Name | the | day.", "Paskirk | — | dieną.", "Tik pasakyk kada.") },
        { id: "cant_cook", s: t("But | I | can't cook!", "Bet | aš | nemoku gaminti!", "Bet aš nemoku gaminti!"), note: "Pajuokauti irgi galima." },
      ],
    },
    start_over: {
      lt: "Paklausti, ar galite pradėti iš naujo",
      items: [
        { id: "start_over", s: t("Can | we | start over?", "Ar galime | mes | pradėti iš naujo?", "Gal galime pradėti iš naujo?"), note: "Dainos frazė." },
        { id: "start_over_me_you", s: t("Can | we | start over, | you | and | me?", "Ar galime | mes | pradėti iš naujo, | tu | ir | aš?", "Gal galime pradėti iš naujo – tu ir aš?") },
        { id: "friends_again", s: t("Can | we | be | friends | again?", "Ar galime | mes | būti | draugais | vėl?", "Ar galime vėl būti draugais?") },
        { id: "put_behind", s: t("Can | we | put | this | behind us?", "Ar galime | mes | palikti | tai | praeityje?", "Gal galime visa tai palikti praeityje?") },
      ],
    },
    thanks: {
      lt: "Padėkoti, kad išklausė",
      items: [
        { id: "heard_out", s: t("Thank | you | for | hearing | me | out.", "Ačiū | tau, | kad | išklausei | mane | —.", "Ačiū, kad mane išklausei.",
          { flags: { 5: "“out”: the prefix iš- of išklausei (under “hearing”) carries it." } }), note: "Dainos frazė." },
        { id: "thanks_door", s: t("Thanks | for | not slamming | the | door.", "Ačiū, | kad | neužtrenkei | — | durų.", "Ačiū, kad neužtrenkei durų.", { flags: { 4: F_NEG_GEN } }) },
        { id: "missed_you", s: t("I | missed | you, | Dan.", "Aš | pasiilgau | tavęs, | Danai.", "Pasiilgau tavęs, Danai.") },
      ],
    },
    nora: {
      lt: "Pasisveikinti su Nora",
      items: [
        { id: "hi_nora", s: t("Hi, | Nora! | It's | so | good | to see | you.", "Labas, | Nora! | Tai yra | taip | gera | matyti | tave.", "Labas, Nora! Kaip gera tave matyti.") },
        { id: "nora_missed", s: t("I | missed | you guys.", "Aš | pasiilgau | jūsų.", "Pasiilgau jūsų.") },
      ],
    },
  },

  tips: TIPS,

  merges: {
    "it's been": { reason: "grammatical_fusion", split: "It's → tai yra + been → buvęs: dummy “it” + perfect; the time that passed = praėjo (C-DUMMY).", minimal: "Two words." },
    "a while": { reason: "lexical_expression", split: "a → — + while → kol (the conjunction) is false; the stretch of time = nemažai laiko.", minimal: "Two words." },
    "it is": { reason: "grammatical_fusion", split: "Dummy “it” → tai would add a false subject; the impersonal būna absorbs it (C-DUMMY).", minimal: "Two words." },
    "let's start": { reason: "grammatical_fusion", split: "Let's → leisk mums + start → pradėti asks for permission; the first-person plural imperative pradėkime carries both.", minimal: "The rest stays outside." },
    "let's talk": { reason: "grammatical_fusion", split: "Let's → leisk mums + talk → kalbėti asks for permission; the imperative pasikalbėkime carries both.", minimal: "The rest stays outside." },
    "go ahead": { reason: "lexical_expression", split: "go → eik + ahead → pirmyn is a literal movement; inviting someone to speak = kalbėk.", minimal: "Two words." },
    "go on": { reason: "lexical_expression", split: "go → eik + on → ant is false; “go on” (continue) = tęsk (C-PHR).", minimal: "Verb and particle." },
    "have to": { reason: "grammatical_fusion", split: "have → turėti + to → — reads as owning something; the modal “have to” = tekti (teks).", minimal: "Two words." },
    "a little": { reason: "lexical_expression", split: "a → — + little → mažas gives “small”; the degree adverb “a little” = truputį (C-LEX).", minimal: "Two words." },
    "there it is": { reason: "lexical_expression", split: "there → ten, it → tai, is → yra gives “ten tai yra”; the remark = štai ir jis.", minimal: "The three words form the remark." },
    "in front of": { reason: "lexical_expression", split: "in → į, front → priekis, of → — is false; the compound preposition = prie (priešais) (C-LEX).", minimal: "Three words, one preposition." },
    "not even": { reason: "lexical_expression", split: "Not → ne + even → net gives the order “ne net”; with the verb left out, net and the genitive carry “not even”.", minimal: "Two words." },
    "was wrong": { reason: "lexical_expression", split: "was → buvau + wrong → neteisingas is a calque; being wrong = klysti (klydau).", minimal: "Copula and adjective." },
    "you know": { reason: "lexical_expression", split: "You → tu + know → žinai reads as a statement; the discourse marker = žinai (no object).", minimal: "Two words." },
    "a lot": { reason: "lexical_expression", split: "a → — + lot → sklypas is false; the amount or frequency = daug / dažnai.", minimal: "Two words." },
    "that'll do": { reason: "lexical_expression", split: "That'll → tai bus + do → darys is false; the verdict = to užteks.", minimal: "The words form the formula." },
    "now you're talking": { reason: "lexical_expression", split: "Now → dabar, you're → tu, talking → kalbi is a literal reading; the approval = va, čia jau kitas reikalas.", minimal: "The whole formula." },
    "start over": { reason: "lexical_expression", split: "start → pradėti + over → per/virš is false; = pradėti iš naujo (C-PHR).", minimal: "Verb and particle." },
    "starting over": { reason: "lexical_expression", split: "starting → pradedame + over → per is false; = pradedame iš naujo (C-PHR).", minimal: "Verb and particle." },
    "come on in": { reason: "lexical_expression", split: "come → ateik, on → ant, in → į is false; the welcome = užeik.", minimal: "Three words, one invitation." },
    "not finished": { reason: "grammatical_fusion", split: "not → ne + finished → baigtas would split the one word nebaigtas; Lithuanian negation is the prefix ne- (as “not afraid”).", minimal: "Two words." },
    "coming by": { reason: "lexical_expression", split: "coming → ateini + by → pro is false; “come by” (a short visit) = užsukti (C-PHR).", minimal: "Verb and particle." },
    "see you around": { reason: "lexical_expression", split: "see → matysiu, you → tave, around → aplink is a literal reading of a farewell; = iki pasimatymo.", minimal: "The whole farewell." },
    "i guess": { reason: "lexical_expression", split: "I → aš + guess → spėju is too literal for the hedge; = turbūt.", minimal: "Two words." },
    "say so": { reason: "lexical_expression", split: "Say → sakyk + so → taip gives “sakyk taip” (say yes); “just say so” = tik pasakyk.", minimal: "Verb and particle." },
    "make it up": { reason: "lexical_expression", split: "make → daryti, it → tai, up → aukštyn is false; “make it up (to someone)” = atsilyginti; “to you” stays outside.", minimal: "Verb, dummy object and particle." },
    "to pick up": { reason: "grammatical_fusion", split: "to → —, pick → rinkti, up → aukštyn is false; infinitive + phrasal verb (pick up the phone) = pakelti; the object stays outside (C-INF + C-PHR).", minimal: "Marker, verb and particle." },
    "coffee's on": { reason: "lexical_expression", split: "coffee's → kava yra + on → ant is false; “the coffee's on” = it is brewing (kava verda).", minimal: "Noun, copula and particle." },
    "showed up": { reason: "lexical_expression", split: "showed → parodė + up → aukštyn is false; arriving = atėjo (C-PHR).", minimal: "Verb and particle." },
    "one thing at a time": { reason: "lexical_expression", split: "one → vienas, thing → dalykas, at → prie, a → —, time → laikas is a calque; the set phrase = ne viskas iš karto.", minimal: "The whole saying." },
    "it's a deal": { reason: "lexical_expression", split: "It's → tai yra + a → — + deal → sandoris is a business reading; agreeing = sutarta.", minimal: "The whole formula." },
    "you got it": { reason: "lexical_expression", split: "You → tu + got → gavai + it → tai is false; the promise = bus padaryta.", minimal: "The whole formula." },
    "behind us": { reason: "lexical_expression", split: "behind → už + us → mūsų is a place; “put … behind us” = palikti praeityje.", minimal: "Preposition and pronoun." },
    "out of line": { reason: "lexical_expression", split: "out → lauk, of → iš, line → linija is false; the judgement = nederama.", minimal: "The three words form the idiom." },
    "not slamming": { reason: "grammatical_fusion", split: "not → ne + slamming → trenkiant would split neužtrenkei; Lithuanian negation is the prefix ne- (C-NEG).", minimal: "Two words." },
    "you guys": { reason: "lexical_expression", split: "you → jūs + guys → vaikinai adds a false “boys”; the plural you = jūs (here jūsų).", minimal: "Two words." },
    "of showing": { reason: "grammatical_fusion", split: "of → — + showing → rodant: after “way of”, the gerund = the infinitive parodyti.", minimal: "Preposition and gerund." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Paprašyk Dano pasikalbėti", done: (c) => !!c.s.talkOpen },
    { lt: "Nuoširdžiai atsiprašyk – be jokio „bet“", done: (c) => !!c.s.apologyDone },
    { lt: "Prisiimk atsakomybę", done: (c) => respDone(c) },
    { lt: "Jei Danui reikia laiko – priimk tai", optional: true, when: (c) => c.s.mood === "needs_time" && !!c.s.needSaid, done: (c) => !!c.s.timeOk },
    { lt: "Paklausk, kaip galėtum atpirkti kaltę", done: (c) => !!c.s.makeUpDone },
    { lt: "Paklausk, ar galite pradėti iš naujo", done: (c) => !!c.s.startOverDone },
    { lt: "Padėkok, kad išklausė", optional: true, when: (c) => !c.s.goalMet || !!c.s.thanked, done: (c) => !!c.s.thanked },
  ],

  steps: [
    { id: "door", done: (c) => !!c.s.talkOpen,
      ask: (c) => dan(c, "door_what"),
      expects: ["g_hello", "voc_unknown", "its_me", "long_time", "i_know", "ask_how", "g_howareyou", "can_talk", "come_in", "apologize", "apology_detail",
        "own_it", "why_silent", "sorry_but", "excuse", "didnt_mean", "blame", "rude", "g_sorry"],
      suggest: [{ lt: "Paprašyti Dano pasikalbėti", hint: "talk" }, { lt: "Iškart nuoširdžiai atsiprašyti", hint: "apology" }],
      yes: (c) => { openYesNo(c, true); }, no: (c) => { openYesNo(c, false); },
      help: (c) => dan(c, "nudge_apology") },
    { id: "apology", when: (c) => !!c.s.talkOpen, done: (c) => !!c.s.apologyDone,
      ask: (c) => {
        const w = c.s.want ?? c.s.asked;
        c.s.want = undefined;
        if (w === "goon" || w === "forwhat") { c.s.asked = w; dan(c, w === "goon" ? "door_apology" : "sorry_for_what"); return; }
        if (!c.s.listenSaid) { c.s.listenSaid = true; dan(c, "listening"); return; }
        dan(c, "nudge_apology");
      },
      expects: ["apologize", "apology_detail", "own_it", "why_silent", "sorry_but", "excuse", "didnt_mean", "blame", "rude", "g_sorry", "ask_how", "g_howareyou"],
      suggest: (c) => c.s.asked === "goon" || c.s.asked === "forwhat"
        ? [{ lt: "Pasakyti, už ką tiksliai atsiprašai", hint: "detail" }, { lt: "Prisiimti atsakomybę", hint: "responsibility" }]
        : [{ lt: "Nuoširdžiai atsiprašyti – be jokio „bet“", hint: "apology" }, { lt: "Pasakyti, už ką atsiprašai", hint: "detail" }],
      yes: (c) => { openYesNo(c, true); }, no: (c) => { openYesNo(c, false); },
      help: (c) => dan(c, "nudge_apology") },
    { id: "responsibility", when: (c) => !!c.s.apologyDone, done: respDone,
      ask: (c) => {
        if (!c.s.hurtSaid) {
          c.s.hurtSaid = true;
          if (!c.s.ownDone) { dan(c, "dan_hurt"); dan(c, c.s.quote ? "dan_quote" : "that_hurt"); }
          if (!c.s.whyAnswered) dan(c, "ask_why_silent");
          return;
        }
        dan(c, c.s.ownDone ? "why_again" : "own_nudge");
      },
      expects: ["own_it", "why_silent", "apologize", "apology_detail", "sorry_but", "excuse", "didnt_mean", "blame", "rude", "promise"],
      suggest: (c) => c.s.ownDone
        ? [{ lt: "Paaiškinti, kodėl nepaskambinai", hint: "why" }, { lt: "Prisiimti atsakomybę", hint: "responsibility" }]
        : [{ lt: "Prisiimti atsakomybę", hint: "responsibility" }, { lt: "Paaiškinti, kodėl nepaskambinai", hint: "why" }],
      yes: (c) => { openYesNo(c, true); }, no: (c) => { openYesNo(c, false); },
      // "I don't know" (why I didn't call): Dan lets the why go
      help: (c) => {
        if (!c.s.whyAnswered) c.s.whySkipped = true;
        if (!c.s.ownDone) { dan(c, "own_nudge"); return; }
        dan(c, "ack");
        c.ask("turn");
      } },
    { id: "turn", when: respDone, done: (c) => !!c.s.turnDone,
      ask: (c) => {
        if (c.s.mood === "needs_time") {
          if (!c.s.needSaid) { c.s.needSaid = true; dan(c, "need_time"); return; }
          dan(c, "just_time");
          return;
        }
        dan(c, c.s.saidWrong ? "dan_first_time" : "dan_thats_new");
        dan(c, "dan_wrong_too");
        c.s.turnDone = true;
      },
      expects: ["accept_time", "push", "time_q", "missed_you", "thanks_hearing", "g_thanks", "make_up_q", "offer", "start_over", "promise", "apologize", "hi_nora"],
      suggest: (c) => timeOpen(c)
        ? [{ lt: "Priimti, kad Danui reikia laiko", hint: "time" }]
        : [{ lt: "Padėkoti, kad išklausė", hint: "thanks" }, { lt: "Paklausti, kaip galėtum atpirkti kaltę", hint: "make_up" }],
      yes: (c) => { openYesNo(c, true); },
      no: (c) => { openYesNo(c, false); },
      help: (c) => { if (timeOpen(c)) dan(c, "just_time"); } },
    // Twist: Nora from the hall
    { id: "nora", when: (c) => !!c.s.noraTwist && !!c.s.turnDone, done: (c) => !!c.s.noraDone,
      ask: (c) => {
        c.s.noraDone = true;
        c.twist("nora");
        c.event("enter", { npc: "nora" });
        if (c.s.mood === "open") nora(c, "nora_hall");
        nora(c, "nora_coffee");
        dan(c, "dan_nora_aside");
      },
      expects: ["hi_nora", "voc_unknown", "g_hello", "missed_you", "thanks_hearing", "g_thanks", "make_up_q", "offer", "start_over"],
      suggest: [{ lt: "Pasisveikinti su Nora", hint: "nora" }, { lt: "Paklausti, kaip galėtum atpirkti kaltę", hint: "make_up" }],
      yes: (c) => { openYesNo(c, true); }, no: (c) => { openYesNo(c, false); } },
    { id: "make_up", when: (c) => !!c.s.turnDone, done: (c) => !!c.s.makeUpDone,
      ask: (c) => {
        if (c.s.dealOffered) { dan(c, "deal_q"); return; }
        const n = c.s.whatNow ?? 0;
        if (n < 2) { c.s.whatNow = n + 1; dan(c, "so_what_now"); return; }
        offerPrice(c, false);
      },
      expects: ["make_up_q", "offer", "deal_ctx", "cant_cook", "promise", "start_over", "missed_you", "thanks_hearing", "g_thanks"],
      suggest: (c) => c.s.dealOffered
        ? [{ lt: "Sutikti su Dano sąlygomis", hint: "deal" }]
        : [{ lt: "Paklausti, kaip galėtum atpirkti kaltę", hint: "make_up" }, { lt: "Pažadėti, kad tai nepasikartos", hint: "promise" }],
      yes: (c) => { openYesNo(c, true); },
      no: (c) => { openYesNo(c, false); },
      // "I don't know" (what now): Dan knows
      help: (c) => { if (c.s.dealOffered) dan(c, "deal_q"); else offerPrice(c, true); } },
    { id: "start_over", when: (c) => !!c.s.makeUpDone, done: (c) => !!c.s.startOverDone,
      ask: (c) => {
        if (!c.s.elseSaid) { c.s.elseSaid = true; dan(c, "anything_else"); return; }
        offerStart(c);
      },
      expects: ["start_over", "missed_you", "thanks_hearing", "g_thanks", "promise"],
      suggest: [{ lt: "Paklausti, ar galite pradėti iš naujo", hint: "start_over" }, { lt: "Padėkoti, kad išklausė", hint: "thanks" }],
      yes: (c) => { if (!openYesNo(c, true)) { dan(c, "listening"); c.hold(); } },
      no: (c) => { if (!openYesNo(c, false)) offerStart(c); },
      help: (c) => offerStart(c) },
  ],

  init: (c) => {
    c.s.mood = c.chance(0.4) ? "needs_time" : "open";
    c.s.noraTwist = c.chance(0.5);
    c.s.variant = c.pick(["dinner", "boat", "stay"] as const);
    c.s.quote = c.chance(0.5);
  },

  start: (c) => {
    dan(c, "door_open");
    c.hold(); // the door step is the open question ("So what can I do for you?" only if asked again)
  },

  handlers: {} as Record<string, H>,

  finish: (c) => {
    c.s.goalMet = true;
    c.complete();
    c.remember({ danReconciled: true });
    c.event("outro", { outcome: "reconciled", lt: OUTRO.reconciled });
    const said = (((c as any).conv?.history ?? []) as { who: string; text: string }[]).filter((h) => h.who === "you").map((h) => h.text).join(" ");
    if (said.split(/\s+/).filter(Boolean).length > 60 || c.chance(0.5)) dan(c, "talk_too_much");
    dan(c, "come_home");
    dan(c, "boat_final");
    const on: Record<string, (cc: Ctx) => void> = {};
    for (const k of [...Object.keys(startOver.intents).filter((x) => !x.endsWith("_ctx")), "g_bye", "g_thanks", "g_ok", "g_hello", "g_sorry", "g_howareyou"]) on[k] = closeOut;
    c.expect({ id: "closing", expects: ["thanks_hearing", "missed_you"], hints: ["thanks"], suggest: [{ lt: "Padėkoti, kad išklausė", hint: "thanks" }],
      on, yes: closeOut, no: closeOut });
  },

  tests: [
    // at the door
    { say: "Hi Dan. Do you have a minute?", intent: "can_talk", step: "door" },
    { say: "Can we talk?", intent: "can_talk", step: "door" },
    { say: "Can I have a word with you?", intent: "can_talk", step: "door" },
    { say: "Is this a bad time?", intent: "can_talk", step: "door" },
    { say: "Can I come in?", intent: "come_in", step: "door" },
    { say: "Yeah, I know. It's been too long.", intent: "long_time", step: "door" },
    { say: "Long time no see.", intent: "long_time", step: "door" },
    { say: "How are you?", intent: "ask_how", step: "door" },
    { say: "How's Nora?", intent: "ask_how", step: "door" },
    { say: "Hi Dan.", intent: "g_hello", step: "door" },
    { say: "It's me.", intent: "its_me", step: "door" },
    { say: "I came to apologize.", intent: "apologize", step: "door" },
    // the apology
    { say: "I owe you an apology.", intent: "apologize", step: "apology" },
    { say: "Dan, I owe you an apology.", intent: "apologize", step: "apology" },
    { say: "I'm truly sorry for what I said at your barbecue.", intent: "apologize", step: "apology" },
    { say: "I'm so sorry about what I said in front of everybody.", intent: "apologize", step: "apology" },
    { say: "I'm so sorry.", intent: "apologize", step: "apology" },
    { say: "Sorry.", intent: "apologize", step: "apology" },
    { say: "I want to apologize.", intent: "apologize", step: "apology" },
    { say: "I'm sorry I didn't call.", intent: "apologize", step: "apology" },
    { say: "I hope you can forgive me.", intent: "apologize", step: "apology" },
    { say: "Forgive me.", intent: "apologize", step: "apology" },
    { say: "Sorry, mate.", intent: "apologize", step: "apology" },
    { say: "For what I said about the boat.", intent: "apology_detail", step: "apology" },
    { say: "For saying you never finish anything.", intent: "apology_detail", step: "apology" },
    { say: "And for two months of silence.", intent: "apology_detail", step: "apology" },
    { say: "For not calling.", intent: "apology_detail", step: "apology" },
    { say: "I'm sorry, but you were rude too.", intent: "blame", step: "apology", not: ["apologize"] },
    { say: "I'm sorry, but it was just a joke.", intent: "sorry_but", step: "apology", not: ["apologize"] },
    { say: "I'm sorry if you were offended.", intent: "sorry_but", step: "apology", not: ["apologize"] },
    { say: "I'm sorry you feel that way.", intent: "sorry_but", step: "apology", not: ["apologize"] },
    { say: "I was drunk.", intent: "excuse", step: "apology" },
    { say: "I was really stressed that night.", intent: "excuse", step: "apology" },
    { say: "You started it.", intent: "blame", step: "apology" },
    { say: "It was just a joke.", intent: "rude", step: "apology" },
    { say: "You're too sensitive.", intent: "rude", step: "apology" },
    { say: "I didn't mean it.", intent: "didnt_mean", step: "apology" },
    { say: "My bad.", intent: "g_sorry", step: "apology" },
    { say: "I'm not sorry.", intent: "none", step: "apology", not: ["apologize"] },
    { say: "I'm not here to apologize.", intent: "none", step: "apology", not: ["apologize"] },
    // responsibility
    { say: "I was wrong, and it came from me.", intent: "own_it", step: "responsibility" },
    { say: "There's no excuse for what I said.", intent: "own_it", step: "responsibility" },
    { say: "You were right, and I was too proud to call.", intent: "own_it", step: "responsibility" },
    { say: "It was my fault.", intent: "own_it", step: "responsibility" },
    { say: "That was out of line. You didn't deserve that.", intent: "own_it", step: "responsibility" },
    { say: "I should have rung you.", intent: "own_it", step: "responsibility" },
    { say: "I was out of order.", intent: "own_it", step: "responsibility" },
    { say: "I messed up.", intent: "own_it", step: "responsibility" },
    { say: "I shouldn't have said that.", intent: "own_it", step: "responsibility" },
    { say: "I wasn't wrong.", intent: "none", step: "responsibility", not: ["own_it"] },
    { say: "There is an excuse for what I said.", intent: "none", step: "responsibility", not: ["own_it"] },
    { say: "Pride's a heavy coat.", intent: "why_silent", step: "responsibility" },
    { say: "I was too proud to call.", intent: "why_silent", step: "responsibility" },
    { say: "I didn't know what to say.", intent: "why_silent", step: "responsibility", not: ["g_dontknow"] },
    { say: "I kept waiting for the perfect day.", intent: "why_silent", step: "responsibility" },
    { say: "I thought you were still angry at me.", intent: "why_silent", step: "responsibility" },
    { say: "I was busy.", intent: "excuse", step: "responsibility" },
    { say: "Why didn't you call me?", intent: "blame", step: "responsibility" },
    { say: "I don't know.", intent: "g_dontknow", step: "responsibility" },
    // Dan's turn (needs time)
    { say: "I understand if you need time.", intent: "accept_time", step: "turn" },
    { say: "Say so, and I'll go.", intent: "accept_time", step: "turn" },
    { say: "Take your time.", intent: "accept_time", step: "turn" },
    { say: "No pressure.", intent: "accept_time", step: "turn" },
    { say: "Call me when you're ready.", intent: "accept_time", step: "turn" },
    { say: "Okay, I'll go.", intent: "accept_time", step: "turn" },
    { say: "Just forgive me already.", intent: "push", step: "turn" },
    { say: "Come on, it's been two months.", intent: "push", step: "turn" },
    { say: "Can't we just forget about it?", intent: "push", step: "turn" },
    { say: "How much time do you need?", intent: "time_q", step: "turn" },
    { say: "I can't wait.", intent: "none", step: "turn", not: ["accept_time"] },
    { say: "I missed you.", intent: "missed_you", step: "turn" },
    { say: "Thank you for hearing me out.", intent: "thanks_hearing", step: "turn" },
    { say: "Hi, Nora! It's so good to see you.", intent: "hi_nora", step: "nora" },
    { say: "I missed you guys.", intent: "missed_you", step: "nora" },
    // making it up
    { say: "How can I make it up to you?", intent: "make_up_q", step: "make_up" },
    { say: "What can I do to fix this?", intent: "make_up_q", step: "make_up" },
    { say: "How can I redeem my guilt?", intent: "make_up_q", step: "make_up" },
    { say: "Let me buy you dinner.", intent: "offer", step: "make_up" },
    { say: "I'll help you finish the boat.", intent: "offer", step: "make_up" },
    { say: "Dinner's on me.", intent: "offer", step: "make_up" },
    { say: "Fancy a pint?", intent: "offer", step: "make_up" },
    { say: "It won't happen again.", intent: "promise", step: "make_up" },
    { say: "Words are cheap, so watch me.", intent: "promise", step: "make_up" },
    { say: "I'll call more often. I promise.", intent: "promise", step: "make_up" },
    { say: "Deal.", intent: "deal_ctx", step: "make_up" },
    { say: "You got it.", intent: "deal_ctx", step: "make_up" },
    { say: "I can't cook.", intent: "cant_cook", step: "make_up" },
    { say: "It will happen again.", intent: "none", step: "make_up", not: ["promise"] },
    { say: "I won't make it up to you.", intent: "none", step: "make_up", not: ["make_up_q"] },
    // starting over
    { say: "Can we start over?", intent: "start_over", step: "start_over" },
    { say: "Can we start over, you and me?", intent: "start_over", step: "start_over" },
    { say: "Can we be friends again?", intent: "start_over", step: "start_over" },
    { say: "Can we put this behind us?", intent: "start_over", step: "start_over" },
    { say: "Can we begin from new?", intent: "start_over", step: "start_over" },
    { say: "Can we make peace?", intent: "start_over", step: "start_over" },
    { say: "I don't want to start over.", intent: "none", step: "start_over", not: ["start_over"] },
    { say: "Thanks for not slamming the door.", intent: "thanks_hearing" },
    // the remaining hint sentences
    { say: "I'm truly sorry for what I said.", intent: "apologize", step: "apology" },
    { say: "For what I said about you.", intent: "apology_detail", step: "apology" },
    { say: "Pride's a heavy coat, and I wore it too long.", intent: "why_silent", step: "responsibility" },
    { say: "No pressure. Take your time.", intent: "accept_time", step: "turn" },
    { say: "Name the day.", intent: "deal_ctx", step: "make_up" },
    { say: "But I can't cook!", intent: "cant_cook", step: "make_up" },
    { say: "I missed you, Dan.", intent: "missed_you", step: "start_over" },
    { say: "I didn't miss you.", intent: "none", not: ["missed_you"] },
    // unrelated
    { say: "purple boat banana", intent: "none" },
    { say: "The weather is nice today", intent: "none" },
  ],

  sims: [
    // the open branch, no Nora: the classic way through
    { name: "open: the classic apology", turns: [
      "Hi Dan. Do you have a minute?", "I owe you an apology.", "For what I said at your barbecue. There's no excuse for it.", "I was too proud to call.",
      "Thank you for hearing me out.", "How can I make it up to you?", "Deal.", "Can we start over?", "Thank you!",
    ], expect: { complete: true, state: { thanked: true, makeUpDone: true } }, auto: AUTO,
      setup: (s) => { s.mood = "open"; s.noraTwist = false; s.variant = "dinner"; } },
    // the twist on every seed: Dan needs time, the learner accepts, Dan calls them back; then Nora
    { name: "needs time (twist): Dan calls you back, then Nora", turns: [
      "Hi. Can we talk?", "I'm truly sorry for what I said about the boat.", "I was wrong. You didn't deserve that.", "I didn't know what to say.",
      "I understand if you need time.", "Thank you.", "Hi, Nora!", "How can I make it up to you?", "Sure.", "Can we start over, you and me?", "Thanks for listening.",
    ], expect: { complete: true, state: { timeOk: true, noraDone: true } }, auto: AUTO,
      setup: (s) => { s.mood = "needs_time"; s.noraTwist = true; s.variant = "boat"; } },
    // bad moves get an in-world reply and a tip, never a failure (the spec's third run)
    { name: "bad moves, then a real apology", turns: [
      "Hey.", "Can I come in?", "I'm sorry, but you were rude too.", "I'm sorry. I was drunk.", "Sorry.", "For everything I said.", "It was my fault.", "Pride.",
      "Just forgive me.", "Okay, I'll go.", "Let me buy you dinner.", "I missed you.", "Yes.",
    ], expect: { complete: true, state: { badMoves: 2, pushes: 1 } }, auto: AUTO,
      setup: (s) => { s.mood = "needs_time"; s.noraTwist = false; s.variant = "dinner"; } },
    // pushing twice and asking how long, then accepting
    { name: "needs time: pushing, then accepting", turns: [
      "I'm really sorry about what I said in front of everybody.", "I should have called. I was ashamed.", "Come on, it's been two months.", "We're too old for this.",
      "How long do you need?", "I'll give you some time.", "Thank you for hearing me out.", "Let me buy you a beer.", "Can we put this behind us?",
    ], expect: { complete: true, state: { pushes: 2, timeOk: true } }, auto: AUTO,
      setup: (s) => { s.mood = "needs_time"; s.noraTwist = false; } },
    // questions first, too soon, a vague apology, Nora (open branch), "start over" before the price
    { name: "questions, too soon, and Nora", turns: [
      "How's Nora?", "Can we start over?", "Okay. I came to apologize.", "I'm sorry.", "For not calling. And for what I said about the boat.",
      "You were right, and I was too proud to call.", "I missed you.", "Hi, Nora!", "Can we start over?", "I can't cook!", "Thank you for hearing me out.",
    ], expect: { complete: true, state: { startPending: true, noraDone: true } }, auto: AUTO,
      setup: (s) => { s.mood = "open"; s.noraTwist = true; s.variant = "stay"; } },
    // "I don't know" twice: Dan lets the why go, then names the price himself
    { name: "Dan names the price", turns: [
      "Dan, I owe you an apology.", "For saying you never finish anything.", "I was wrong.", "I don't know.", "I know.", "I don't know.", "Yes!",
      "It won't happen again.", "Can we be friends again?",
    ], expect: { complete: true, state: { whySkipped: true, saidWrong: true } }, auto: AUTO,
      setup: (s) => { s.mood = "open"; s.noraTwist = false; s.variant = "boat"; } },
    // the partial ending: apologized, then left
    { name: "partial ending: leaving after the apology", turns: ["Hi Dan.", "Can we talk?", "I'm sorry for not calling.", "Bye."],
      expect: { complete: false, state: { left: "partial", apologyDone: true } }, auto: AUTO,
      setup: (s) => { s.mood = "open"; } },
    // walked away before any apology
    { name: "walked away early", turns: ["How are you?", "Sorry, I have to go."],
      expect: { complete: false, state: { left: "early" } }, auto: AUTO },
  ],
};

// ---------------------------------------------------------------------------
// Handler helpers (hoisted function declarations)

/** "Hi." at the door: a cold "Hi." and "So what can I do for you?"; to Nora once she's there, her hello. */
function greet(c: Ctx) {
  if (c.s.goalMet) return;
  if (stepIs(c, "nora") || (c.s.noraDone && /\bnora\b/i.test(c.heard))) {
    if (!c.s.noraHi && once(c, "nora_hi")) { c.s.noraHi = true; nora(c, "nora_hi"); }
    return;
  }
  if (c.s.talkOpen) return; // later on, a hello adds nothing: the open question comes again
  if (once(c, "greet")) {
    if (!c.s.coldSaid) { c.s.coldSaid = true; dan(c, "door_cold"); }
    dan(c, "door_what");
  }
  c.hold();
}

/** An apology: specific ("for what I said…"), announced ("I owe you an apology") or plain ("I'm so sorry"). */
function apologyMove(c: Ctx, tags: string[]) {
  if (c.s.goalMet) return;
  c.s.talkOpen = true;
  if (c.s.turnDone) { react(c, "heard_you"); return; }
  if (timeOpen(c)) { react(c, "heard_you"); c.hold(); return; }
  if (c.s.apologyDone) {
    if (!now(c, "ap_now")) react(c, "heard_you"); // the open question (own it / why) comes again
    return;
  }
  if (tags.includes("silence")) c.s.silenceNamed = true;
  if (tags.includes("specific")) { c.s.apologyDone = true; mark(c, "ap_now"); return; }
  if (!once(c, "apology")) return;
  if (tags.includes("announce")) { c.s.want = "goon"; return; }
  c.s.vague = (c.s.vague ?? 0) + 1;
  if (c.s.vague >= 2) { c.s.apologyDone = true; mark(c, "ap_now"); dan(c, "sorry_accept_vague"); return; }
  c.s.want = "forwhat";
}

function answerWhy(c: Ctx, pride: boolean) {
  if (c.s.whyAnswered) return;
  c.s.whyAnswered = true;
  react(c, pride ? "pride_coat" : "know_that");
}

/** "I'm sorry, but…", excuses, blame, "it was just a joke", pushing: an in-world reply and a tip. */
function badMove(c: Ctx, kind: "sorry_but" | "excuse" | "blame" | "rude" | "didnt_mean" | "push") {
  if (c.s.goalMet) return;
  if (c.s.turnDone) { if (kind === "blame" || kind === "rude") react(c, "blame_late"); return; }
  c.s.talkOpen = true;
  if (timeOpen(c)) {
    if (kind === "push" || kind === "blame" || kind === "rude") pushMove(c);
    else { react(c, "heard_you"); c.hold(); }
    return;
  }
  if (!once(c, "bad")) { c.hold(); return; }
  const k = kind !== "push" && SORRY_BUT.test(c.heard) ? "sorry_but" : kind;
  c.s.badMoves = (c.s.badMoves ?? 0) + 1;
  if (k === "sorry_but") { dan(c, "sorry_but_react"); c.tip(TIPS.sorry_but); }
  else if (k === "excuse") { dan(c, "excuse_react"); c.tip(TIPS.excuse); }
  else if (k === "blame") { dan(c, "blame_react"); c.tip(TIPS.blame); }
  else if (k === "rude") { dan(c, "rude_react"); c.tip(TIPS.just_joke); }
  else if (k === "push") { dan(c, "rude_react"); c.tip(TIPS.push); }
  else dan(c, "didnt_mean_react");
  c.hold();
}

/** Pushing while Dan needs time: "Don't push me, okay?", then "Let's talk another time, okay?" (still open). */
function pushMove(c: Ctx) {
  if (once(c, "push")) {
    c.s.pushes = (c.s.pushes ?? 0) + 1;
    c.tip(TIPS.push);
    dan(c, c.s.pushes >= 2 ? "push_close" : "push_react");
  }
  c.hold();
}

/** The learner accepts that Dan needs time (twist): "Hey. Wait. … Took me about ten seconds." */
function acceptTime(c: Ctx) {
  if (c.s.timeOk) return;
  c.s.timeOk = true;
  c.twist("ten_seconds");
  dan(c, "time_ok"); dan(c, "wait_twist"); dan(c, "wait_twist2"); dan(c, "dan_wrong_too");
  c.s.turnDone = true;
  c.hold();
}

/** Dan names his price: dinner (and you're cooking), help with the boat, or staying for lunch. */
function sayPrice(c: Ctx) {
  if (c.s.variant === "boat") dan(c, "make_up_boat");
  else if (c.s.variant === "stay") dan(c, "make_up_stay");
  else { dan(c, "make_up_dinner"); dan(c, "make_up_more"); }
}
function offerPrice(c: Ctx, iDo: boolean) {
  if (iDo) dan(c, "i_do");
  sayPrice(c);
  c.s.dealOffered = true;
  c.hold();
}
/** Made up: the price is agreed (and "Can we start over?", asked before it, is answered now). */
function settle(c: Ctx) {
  c.s.makeUpDone = true;
  c.s.dealOffered = false;
  if (c.s.startPending && !c.s.startOverDone) { c.s.startOverDone = true; dan(c, "start_over_yes"); }
}
function acceptDeal(c: Ctx) {
  if (!c.s.dealOffered || !once(c, "deal")) return;
  dan(c, "deal");
  settle(c);
}
function doStartOver(c: Ctx, friends: boolean) {
  if (c.s.startOverDone) return;
  c.s.startOverDone = true;
  dan(c, friends ? "friends_react" : "start_over_yes");
}
function offerStart(c: Ctx) {
  c.s.offerStart = true;
  dan(c, "dan_offers_start");
  c.hold();
}

/** "Thank you for hearing me out" (explicit) or a plain "Thanks". */
function thanks(c: Ctx, explicit: boolean) {
  if (c.s.goalMet) return;
  if (!c.s.apologyDone) { if (explicit) { react(c, "not_yet_heard"); c.hold(); } return; }
  if (timeOpen(c)) { if (explicit) { c.s.thanked = true; acceptTime(c); } return; }
  if (!c.s.turnDone) { if (explicit) { c.s.thanked = true; react(c, "ack"); } return; }
  c.s.thanked = true;
  if (!once(c, "thanks")) return;
  if (stepIs(c, "nora") || /\bnora\b/i.test(c.heard)) { if (!c.s.noraHi) { c.s.noraHi = true; nora(c, "nora_hi"); } return; }
  if (stepIs(c, "start_over")) { dan(c, "hush"); if (!c.s.offerStart) offerStart(c); return; }
  dan(c, "anytime_wait");
}

/** The last word after "Come on in": "Oh, hush. Come inside." (or "Yeah. Me too."). */
function closeOut(c: Ctx) {
  if (!c.s.closed) {
    c.s.closed = true;
    if (/\bthank/i.test(c.heard)) c.s.thanked = true;
    dan(c, /\bmiss/i.test(c.heard) && !c.s.missedSaid ? "me_too" : "hush");
  }
  c.end();
  c.hold();
}

/** A bare yes/no answers Dan's open question, whichever step is current: the price ("So? Deal?"), "Are we starting
 *  over or what?" or "I need some time". Returns false if no such question is open. */
function openYesNo(c: Ctx, yes: boolean): boolean {
  if (c.s.dealOffered) { if (yes) acceptDeal(c); else { react(c, "wrong_answer"); c.hold(); } return true; }
  if (c.s.offerStart && !c.s.startOverDone) { if (yes) doStartOver(c, false); else { react(c, "wrong_answer"); c.hold(); } return true; }
  if (timeOpen(c)) { if (yes) acceptTime(c); else pushMove(c); return true; }
  return false;
}

function stepYes(c: Ctx) {
  const st = startOver.steps.find((x) => x.id === c.step);
  if (st?.yes && !st.done(c)) st.yes(c);
}

// ---------------------------------------------------------------------------
// Handlers

const HANDLERS: Record<string, H> = {
  voc_unknown(c) { greet(c); },
  its_me(c) { greet(c); },
  g_hello(c) { greet(c); },
  hi_nora(c) { greet(c); },
  long_time(c) {
    if (c.s.goalMet || c.s.talkOpen || c.s.longSaid) return;
    c.s.longSaid = true;
    dan(c, "long_time_react"); dan(c, "market_joke");
    c.hold();
  },
  i_know(c, sl, sg) { HANDLERS.long_time(c, sl, sg); },
  ask_how(c, _sl, seg) {
    if (c.s.goalMet) return;
    if (once(c, "how")) dan(c, seg.tags.includes("nora") ? "how_nora" : seg.tags.includes("cat") ? "how_cat" : "how_been");
    if (!c.s.talkOpen) c.hold(); // Dan waits for the real reason; later, "You didn't come here to talk about the weather."
  },
  g_howareyou(c) { HANDLERS.ask_how(c, {}, NOSEG); },
  can_talk(c) { if (!c.s.goalMet) c.s.talkOpen = true; },
  come_in(c) {
    if (c.s.goalMet || c.s.turnDone) return;
    c.s.talkOpen = true;
    react(c, "porch");
  },
  apologize(c, _sl, seg) {
    // "Sorry?" asks to repeat
    if (/^\W*(sorry|pardon)\W*\?\W*$/i.test(c.heard)) { GLOBAL_HANDLERS.g_repeat(c as any, {}); return; }
    apologyMove(c, seg.tags);
  },
  g_sorry(c) {
    if (/\b(my bad|oops)\b/i.test(c.heard)) c.tip(TIPS.too_light);
    apologyMove(c, []);
  },
  apology_detail(c, _sl, seg) {
    if (c.s.goalMet) return;
    c.s.talkOpen = true;
    if (seg.tags.includes("silence")) c.s.silenceNamed = true;
    if (timeOpen(c)) { react(c, "heard_you"); c.hold(); return; }
    if (!c.s.apologyDone) { c.s.apologyDone = true; mark(c, "ap_now"); return; }
    if (!now(c, "ap_now") && !c.s.turnDone) react(c, "heard_you");
  },
  own_it(c, _sl, seg) {
    if (c.s.goalMet) return;
    c.s.talkOpen = true;
    if (/\bi was wrong\b/i.test(c.heard)) c.s.saidWrong = true;
    if (timeOpen(c)) { react(c, "heard_you"); c.hold(); return; }
    if (c.s.turnDone) { react(c, "heard_you"); return; }
    if (!c.s.apologyDone) { c.s.apologyDone = true; mark(c, "ap_now"); }
    if (seg.tags.includes("why")) answerWhy(c, seg.tags.includes("pride"));
    if (c.s.ownDone) { if (!now(c, "own_now")) react(c, "heard_you"); return; }
    c.s.ownDone = true;
    mark(c, "own_now");
  },
  why_silent(c, _sl, seg) {
    if (c.s.goalMet) return;
    c.s.talkOpen = true;
    if (timeOpen(c)) { react(c, "heard_you"); c.hold(); return; }
    if (c.s.turnDone) { react(c, "ack"); return; }
    answerWhy(c, seg.tags.includes("pride"));
  },
  sorry_but(c) { badMove(c, "sorry_but"); },
  excuse(c) { badMove(c, "excuse"); },
  blame(c) { badMove(c, "blame"); },
  rude(c) { badMove(c, "rude"); },
  didnt_mean(c) { badMove(c, "didnt_mean"); },
  push(c) { if (timeOpen(c)) pushMove(c); else badMove(c, "push"); },
  accept_time(c, _sl, seg) {
    if (c.s.goalMet) return;
    if (timeOpen(c)) { acceptTime(c); return; }
    // "Okay, I'll go." with no time asked for: leaving
    if (seg.tags.includes("leave")) HANDLERS.g_bye(c, {}, NOSEG);
  },
  time_q(c) { if (timeOpen(c)) { react(c, "time_q_react"); c.hold(); } },
  make_up_q(c) {
    if (c.s.goalMet) return;
    if (timeOpen(c)) { react(c, "just_time"); c.hold(); return; }
    if (!c.s.turnDone) { react(c, "too_soon"); c.hold(); return; }
    if (!once(c, "price")) return;
    if (c.s.dealOffered || c.s.makeUpDone) { sayPrice(c); c.hold(); return; }
    offerPrice(c, false);
  },
  offer(c) {
    if (c.s.goalMet) return;
    if (timeOpen(c)) { react(c, "just_time"); c.hold(); return; }
    if (!c.s.turnDone) { react(c, "too_soon"); c.hold(); return; }
    if (!once(c, "offer")) return;
    dan(c, "offer_react");
    if (!c.s.makeUpDone) settle(c);
  },
  deal_ctx(c) { if (!c.s.goalMet && c.s.dealOffered) acceptDeal(c); },
  cant_cook(c) {
    if (c.s.goalMet) return;
    if (c.s.dealOffered && c.s.variant === "dinner") { if (once(c, "deal")) { dan(c, "cant_cook_react"); settle(c); } return; }
    if (c.s.dealOffered) { react(c, "wrong_answer"); c.hold(); return; }
    react(c, "ack");
  },
  promise(c) {
    if (c.s.goalMet) return;
    if (timeOpen(c)) { react(c, "heard_you"); c.hold(); return; }
    if (c.s.dealOffered && /\b(promise|my word)\b/i.test(c.heard)) { acceptDeal(c); return; }
    if (!c.s.apologyDone) { react(c, "too_soon"); c.hold(); return; }
    if (!once(c, "promise")) return;
    dan(c, "promise_react");
    if (stepIs(c, "start_over") && !c.s.offerStart) { offerStart(c); return; }
    if (!c.s.turnDone) c.hold();
  },
  start_over(c, _sl, seg) {
    if (c.s.goalMet) return;
    if (timeOpen(c)) { pushMove(c); return; }
    if (!c.s.turnDone) { react(c, "too_soon"); c.hold(); return; }
    if (!once(c, "start")) return;
    if (!c.s.makeUpDone) {
      // "Maybe. But first you owe me a dinner." (the price first; a yes answers both)
      c.s.startPending = true;
      if (c.s.dealOffered) { dan(c, "deal_q"); c.hold(); return; }
      c.s.variant = "dinner";
      c.s.dealOffered = true;
      dan(c, "start_over_early");
      c.hold();
      return;
    }
    doStartOver(c, seg.tags.includes("friends"));
  },
  missed_you(c) {
    if (c.s.goalMet) return;
    if (!c.s.turnDone) { react(c, "missed_early"); c.hold(); return; }
    if (!once(c, "missed")) return;
    if (!c.s.noraHi && (stepIs(c, "nora") || (c.s.noraDone && /\b(guys|you two|you both|nora)\b/i.test(c.heard)))) { c.s.noraHi = true; nora(c, "nora_hi"); return; }
    if (!c.s.missedSaid) { c.s.missedSaid = true; dan(c, "me_too"); } else react(c, "ack");
    if (stepIs(c, "start_over") && !c.s.offerStart) offerStart(c);
  },
  thanks_hearing(c) { thanks(c, true); },
  g_thanks(c) { thanks(c, false); },
  thanks_mate(c) { thanks(c, false); },
  g_ok(c) { if (!openYesNo(c, true)) stepYes(c); },
  g_bye(c) {
    if (c.s.goalMet) { closeOut(c); return; }
    // "Say so, and I'll go." while Dan needs time is the graceful exit: the twist
    if (timeOpen(c)) { acceptTime(c); return; }
    if (once(c, "bye")) {
      if (!c.s.apologyDone) {
        c.s.left = "early";
        dan(c, "leave_early");
        c.event("outro", { outcome: "early", lt: c.player.gender === "f" ? OUTRO.early.f : OUTRO.early.m });
      } else {
        c.s.left = "partial";
        dan(c, "leave_partial"); dan(c, "call_me");
        c.remember({ danApologized: true });
        c.event("outro", { outcome: "partial", lt: OUTRO.partial });
      }
    }
    c.end();
    c.hold();
  },
};
startOver.handlers = HANDLERS;

export default startOver;
