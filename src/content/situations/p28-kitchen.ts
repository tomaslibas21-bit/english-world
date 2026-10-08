// Advanced song P28 "Taste It Again" (B2–C1): giving and receiving feedback in the kitchen of The Pier.
// 4:30 p.m., an hour before the doors open. The learner (a cook at The Pier) wants their cold beet soup
// (šaltibarščiai) on tonight's specials board. Chef Whitaker tastes it in silence, asks "Can I give you some
// feedback?" and gives it the song's way: what worked, then one thing to try (a little more acid). The
// learner receives it ("Thanks, that's really helpful. I'll work on that."), asks for an example, has him
// taste it again, and answers his second idea (croutons): agrees, or politely keeps their own way (hot
// potatoes on the side). Then he asks a favor: give feedback to Mia Russo, the new junior cook, about her
// clam chowder, "the way I just did with you". The learner offers feedback, says what worked, suggests
// one thing to try (Mia may ask "Like, how much?") and encourages her ("You'll get there").
// Twist (25 % on the first visit, 60 % later): Mia turns the song around and gives the learner feedback.
//
// Address (spec + owner): the chef says tu to the player, the player says jūs to the chef; tu between the
// player and Mia. NPCS.whitaker is not `informal` (so the learner's hints and the global hint groups use jūs
// while he is the one speaking) and NPCS.russo is. So the chef's lines are written with tu explicitly, the
// hints to him with jūs explicitly (lower case), Mia's lines and the hints to her with tu. The global NPC lines
// that switch {j:…|t:…} are copied into `lines` below with tu, so the chef never says jūs to the player.
// "Both of you" (closing) is the plural jūs.
//
// Course report: done (c.complete) when items 2, 5, 6 and 7 of the mission are ticked; items 1, 3 and 4
// drop out of the list once their moment has passed without them (or when the task is complete).
//
// ART: no pictures yet (docs/SCENE-ART.md; the people as in npcs.ts: Whitaker, early 60s and tall, brown skin,
// short gray hair, a gray beard, white chef's jacket and apron; Mia, 19, olive skin, black hair tied back in a
// ponytail, white top, an oversized deep-blue apron). Set-up 1 is
// the back kitchen of The Pier: stainless steel, a rail of order tickets, copper pans, a porthole window to
// the harbor; across the pass a bowl of bright-pink cold beet soup with dill and half a boiled egg.
//   1. "serve"  (steps serve; start): Whitaker behind the pass, arms relaxed, looking at the pink soup.
//   2. "taste"  (consent, receive): the same, he tastes from a spoon, eyes half closed, in thoughtful silence.
//   3. "lemon"  (example, again, second, handoff): the same, he holds up half a lemon, a gentle smile.
//   4. "mia"    (mia_open, mia_worked, mia_try, mia_howmuch, mia_encourage): set-up 2, the range in the same
//      kitchen: Mia over a pot of creamy clam chowder, holding out a wooden spoon, a nervous half-smile;
//      Whitaker in the background, arms folded, smiling.
//   5. "done"   (mia_back, closing; done): the same as 4, Mia relieved and smiling, the chef laughing.
//
// NEEDS: (1) the game ignores the events "taste" ({by, dish}: the chef tastes in silence, ~1.5 s pause and
// a spoon sound in the spec) and "enter" ({npc: "russo"}: Mia walks over); a pause/sfx for them would help.
// (2) An NPC flag for "addresses the player with tu" separate from "the player addresses them with jūs"
// would let the copied global lines (g_not_understood … g_yes_what) go.

import type { Ctx, EntityDef, Segment, SituationDef, Tip } from "../types";
import { ent, t } from "../dsl";

// ---------------------------------------------------------------------------
// Flags used more than once

const F_WH_DO = "Question “do” has no Lithuanian word; the tense sits on the verb.";
const F_DO_Q = "Question “Do” = the particle ar.";
const F_COULD_Q = "Question “Could” = ar + the conditional of galėti.";
const F_ID = "“'d” (would): the conditional ending of the verb carries it.";
const F_KAD = "Zero “that”: Lithuanian needs kad.";
const F_CLEFT = "“was” in this cleft sentence = tai.";
const F_IS_TAI = "“is” here introduces what follows: tai.";
const F_KURI = "Zero relative: English leaves out “that”; Lithuanian needs kurį.";
const F_FOOD = "“good” (food) = skani.";
const F_NO_OBJ = "“it”: pabandyti needs no object here.";
const F_FEEDBACK = "“some feedback” = kelios pastabos: Lithuanian counts what English does not.";
const F_GIVE_FB = "“give (feedback)” = pasakyti (pastabų).";

// ---------------------------------------------------------------------------
// Entities: what worked in Mia's chowder (good_part) and one thing to try (ingredient).
// attrs: enPl / ltPl = plural in English / Lithuanian (agreement in the hints); odd = unusual in a chowder
// (Mia is surprised); count = countable plural ("a few green onions").

const BACON = ent("bacon", "bacon", "šoninė/šoninės/šoninei/šoninę/šonine/šoninėje", "f", { art: "", chip: "šoninė", forms: ["smoked bacon", "bacon bits"] });
const THYME = ent("thyme", "thyme", "čiobreliai/čiobrelių/čiobreliams/čiobrelius/čiobreliais/čiobreliuose", "m",
  { art: "", chip: "čiobreliai", forms: ["fresh thyme"], attrs: { ltPl: true } });
const CREAM = ent("cream", "cream", "grietinėlė/grietinėlės/grietinėlei/grietinėlę/grietinėle/grietinėlėje", "f",
  { art: "", chip: "grietinėlė", forms: ["heavy cream", "fresh cream", "whipping cream"] });

const GOOD_PARTS: EntityDef[] = [
  BACON,
  ent("potatoes", "potatoes", "bulvės/bulvių/bulvėms/bulves/bulvėmis/bulvėse", "f", { chip: "bulvės", forms: ["potato", "potato pieces"], attrs: { enPl: true, ltPl: true } }),
  ent("clams", "clams", "moliuskai/moliuskų/moliuskams/moliuskus/moliuskais/moliuskuose", "m", { chip: "moliuskai", forms: ["clam", "seafood"], attrs: { enPl: true, ltPl: true } }),
  ent("texture", "texture", "konsistencija/konsistencijos/konsistencijai/konsistenciją/konsistencija/konsistencijoje", "f", { chip: "konsistencija", forms: ["consistency", "thickness"] }),
  ent("seasoning", "seasoning", "prieskoniai/prieskonių/prieskoniams/prieskonius/prieskoniais/prieskoniuose", "m", { chip: "prieskoniai", forms: ["spices", "spice"], attrs: { ltPl: true } }),
  ent("smell", "smell", "kvapas/kvapo/kvapui/kvapą/kvapu/kvape", "m", { chip: "kvapas", forms: ["aroma", "scent"] }),
  ent("color", "color", "spalva/spalvos/spalvai/spalvą/spalva/spalvoje", "f", { chip: "spalva", forms: ["colour"] }),
  ent("onions", "onions", "svogūnai/svogūnų/svogūnams/svogūnus/svogūnais/svogūnuose", "m", { chip: "svogūnai", forms: ["onion"], attrs: { enPl: true, ltPl: true } }),
  ent("flavor", "flavor", "skonis/skonio/skoniui/skonį/skoniu/skonyje", "m", { chip: "skonis", forms: ["flavour", "taste", "flavors"] }),
  ent("broth", "broth", "sultinys/sultinio/sultiniui/sultinį/sultiniu/sultinyje", "m", { chip: "sultinys", forms: ["base", "stock", "soup base"] }),
  THYME,
  CREAM,
];

const INGREDIENTS: EntityDef[] = [
  ent("lemon", "lemon", "citrina/citrinos/citrinai/citriną/citrina/citrinoje", "f", { art: "", chip: "citrina", forms: ["lemon juice", "fresh lemon"], attrs: { odd: true } }),
  ent("salt", "salt", "druska/druskos/druskai/druską/druska/druskoje", "f", { art: "", chip: "druska", forms: ["sea salt"] }),
  ent("pepper", "black | pepper", "juodieji/juodųjų/juodiesiems/juoduosius/juodaisiais/juoduosiuose | pipirai/pipirų/pipirams/pipirus/pipirais/pipiruose", "m",
    { art: "", chip: "juodieji pipirai", forms: ["pepper", "ground pepper", "cracked pepper", "fresh pepper"] }),
  THYME,
  ent("garlic", "garlic", "česnakas/česnako/česnakui/česnaką/česnaku/česnake", "m", { art: "", chip: "česnakas", forms: ["roasted garlic", "garlic cloves"] }),
  CREAM,
  ent("butter", "butter", "sviestas/sviesto/sviestui/sviestą/sviestu/svieste", "m", { art: "", chip: "sviestas", forms: ["brown butter"] }),
  ent("parsley", "parsley", "petražolės/petražolių/petražolėms/petražoles/petražolėmis/petražolėse", "f", { art: "", chip: "petražolės", forms: ["fresh parsley"] }),
  ent("chives", "chives", "laiškiniai česnakai/laiškinių česnakų/laiškiniams česnakams/laiškinius česnakus/laiškiniais česnakais/laiškiniuose česnakuose", "m",
    { art: "", chip: "laiškiniai česnakai", forms: ["chive", "fresh chives"] }),
  ent("dill", "dill", "krapai/krapų/krapams/krapus/krapais/krapuose", "m", { art: "", chip: "krapai", forms: ["fresh dill"], attrs: { odd: true } }),
  ent("white_wine", "white | wine", "baltasis/baltojo/baltajam/baltąjį/baltuoju/baltajame | vynas/vyno/vynui/vyną/vynu/vyne", "m",
    { art: "", chip: "baltasis vynas", forms: ["wine", "dry white wine"] }),
  ent("hot_sauce", "hot | sauce", "aštrus/aštraus/aštriam/aštrų/aštriu/aštriame | padažas/padažo/padažui/padažą/padažu/padaže", "m",
    { art: "", chip: "aštrus padažas", forms: ["tabasco", "chili sauce", "sriracha"], attrs: { odd: true } }),
  ent("paprika", "smoked | paprika", "rūkyta/rūkytos/rūkytai/rūkytą/rūkyta/rūkytoje | paprika/paprikos/paprikai/papriką/paprika/paprikoje", "f",
    { art: "", chip: "rūkyta paprika", forms: ["paprika", "sweet paprika"], attrs: { odd: true } }),
  BACON,
  ent("celery", "celery", "salieras/saliero/salierui/salierą/salieru/saliere", "m", { art: "", chip: "salieras", forms: ["celery sticks"] }),
  ent("scallions", "green | onions", "laiškiniai/laiškinių/laiškiniams/laiškinius/laiškiniais/laiškiniuose | svogūnai/svogūnų/svogūnams/svogūnus/svogūnais/svogūnuose", "m",
    { art: "", chip: "laiškiniai svogūnai", forms: ["scallions", "scallion", "green onion"], attrs: { count: true } }),
];
const ingredient = (id?: string) => INGREDIENTS.find((e) => e.id === id);

// ---------------------------------------------------------------------------
// Speakers and per-turn helpers

/** The chef (tu to the player) and Mia (tu). */
const C = (c: Ctx, line: string, vars?: Record<string, any>) => { c.speaker("whitaker"); c.say(line, vars); };
const M = (c: Ctx, line: string, vars?: Record<string, any>) => { c.speaker("russo"); c.say(line, vars); };

// One reaction per learner turn: "Thanks, that's really helpful. I'll work on that." is two pieces but one
// answer. The dialogue creates a fresh context object for every learner turn.
const SAID = new WeakMap<Ctx, Set<string>>();
function once(c: Ctx, key: string): boolean {
  let set = SAID.get(c);
  if (!set) { set = new Set(); SAID.set(c, set); }
  if (set.has(key)) return false;
  set.add(key);
  return true;
}

// Answers that wait for the end of the turn (the step's question settles them), so a later piece wins:
// a "no, but …" to the favor ("I'm busy, but okay, I'll do it") and an "I'm not sure" before an answer
// ("I'm not sure. Maybe thyme?").
const NO_LATER = new WeakSet<Ctx>();
const DONT_KNOW = new WeakMap<Ctx, string>();
/** How many times a step was asked (every question gives up after a few tries). */
const asks = (c: Ctx, id: string): number => c.s.asks?.[id] ?? 0;
function bump(c: Ctx, id: string): number { c.s.asks ||= {}; c.s.asks[id] = asks(c, id) + 1; return c.s.asks[id]; }

const MIA_STEPS = new Set(["mia_open", "mia_worked", "mia_try", "mia_howmuch", "mia_encourage", "mia_back"]);
const inMia = (c: Ctx) => !!c.step && MIA_STEPS.has(c.step);
const receiveDone = (c: Ctx) => !!c.s.received || (c.s.defCount ?? 0) >= 2 || !!c.s.recvSkip;
const praiseDone = (c: Ctx) => !!c.s.praised || !!c.s.praiseSkip;
const tryDone = (c: Ctx) => !!c.s.tried || !!c.s.trySkip;
const encDone = (c: Ctx) => !!c.s.encouraged || !!c.s.encSkip;
/** Items 2, 5, 6 and 7: what the course report needs. */
const coreDone = (c: Ctx) => !!c.s.received && !!c.s.praised && !!c.s.tried && !!c.s.encouraged;

/** Sims: the learner plays the core scene (no "how much?" question unless pinned, no twist). */
const PLAIN = (s: Record<string, any>) => { s.howMuch = false; s.backTwist = false; };
const AUTO: Record<string, string> = {
  mia_howmuch: "Just a little.", mia_back: "Thanks, Mia. That's really helpful.", closing: "Thanks for today, Chef!",
};

// ---------------------------------------------------------------------------

export const kitchen: SituationDef = {
  id: "p28-kitchen",
  song: "P28",
  songTitle: "Taste It Again",
  title: { en: "Taste It Again", lt: "Paragaukite dar kartą" },
  topic: { en: "Giving and receiving feedback", lt: "Pastabos: priimti ir duoti" },
  chapter: 8,
  order: 4,
  location: "the-pier",
  npc: "whitaker",
  npcs: ["russo"],
  goal: "Gražiai priimk šefo pastabas, o paskui konstruktyviai įvertink naujokės patiekalą.",
  intro: "„The Pier“ restorano virtuvė, 16.30 – valanda iki vakaro aptarnavimo. Šįvakar nori įtraukti savo šaltibarščius į dienos pasiūlymus, bet pirmiausia jų turi paragauti šefas Vitakeris. Jis kalba tyliai, bet nieko nepraleidžia pro akis – o po to, ko gero, paprašys tavęs padėti naujai virėjai Mijai.",
  entities: { good_part: GOOD_PARTS, ingredient: INGREDIENTS },

  grammar: {
    macros: {
      // a name in the middle of a sentence (at the start or the end it is a vocative anyway)
      chef: "(chef | chef whitaker | whitaker)",
      vm: "(mia | mia russo)",
      taste: "(taste | try | have a taste of | take a taste of | sample)",
      soup: [
        "[cold] [lithuanian] (beet | beets) soup", "[cold] beetroot soup #tip:uk_beet", "(cold | pink) [lithuanian] soup",
        "(saltibarsciai | shaltibarshchiai | cold borscht | borscht)", "(soup | dish | special | plate | recipe | cold one)",
      ],
      fb: [
        "feedback", "(some | any)? feedbacks #tip:feedbacks", "a feedback #tip:feedbacks",
        "(comments | notes | thoughts | opinion | honest opinion | advice | input)", "remarks #tip:remarks",
      ],
      chowder: "(chowder | clam chowder | soup | the chowder | the soup)",
      // "a little", "a pinch of" (#amt: an amount is already given)
      little: [
        "(a little | a bit of | a bit | some | a little bit of | a little bit | just a little | just a bit | a little more | some more | more | extra | a touch of | a few)",
        "(a pinch of | a squeeze of | a splash of | a dash of | a drop of | half a | a teaspoon of | a spoon of | a spoonful of | a tablespoon of) #amt",
      ],
      acid: "(lemon | lemon juice | vinegar | apple cider vinegar | pickle juice | pickle brine | cucumber brine | brine | kefir | buttermilk | lime | lime juice | something sour | acid | sour cream)",
      crouton: "(croutons | crouton | some croutons | the croutons | crunch | some crunch | toasted bread | crispy bread)",
      good_adj: "(great | good | really good | very good | so good | perfect | amazing | delicious | wonderful | lovely | excellent | fantastic | spot on | nice | just right | awesome | incredible | tasty | beautiful | outstanding | brilliant #tip:uk_brilliant)",
      first: "(at first | in the beginning | at the beginning | in my first week | when i started | at the start | in the first week | on my first day)",
      fixnp: "({fix:ingredient} | {fix:fixuk})",
    },
    slots: {
      // British names for two ingredients: understood, with a tip
      fixuk: { lexicon: [
        { id: "cream", forms: ["double cream", "single cream"], tags: ["tip:uk_cream"] },
        { id: "scallions", forms: ["spring onions", "spring onion"], tags: ["tip:uk_scallions"] },
      ] },
    },
  },

  intents: {
    // --- the chef: serving the soup -------------------------------------------------
    offer_taste: { patterns: [
      "(could | can | would) you [please] @taste (it | this | my @soup | the @soup | some) [for me] [@chef] #h:could_taste",
      "(could | can | would) you (have | take) a taste [of (it | this)]",
      "would you mind (tasting | trying) (it | this | my @soup) [@chef] #h:would_mind",
      "(do you want | would you like | do you have time) to @taste (it | this | my @soup)",
      "(can | could | may) i ask you to @taste (it | this | my @soup)",
      "(here is | here it is | this is | meet) [my] @soup [for you] [@chef] #h:heres_soup",
      "here (you go | you are | it is) [@chef]",
      "(it is | my soup is | the soup is | everything is) ready [to taste | for you | for tasting] [@chef] #h:its_ready",
      "i am ready [for you | for the tasting]",
      "i (made | cooked | prepared) [a | my | the | some | this] @soup [for (the specials | tonight | the menu | you | the board)]",
      "i (made | cooked | prepared) (something | a soup | a dish | something new) [new] [for (you | the specials | tonight | the menu)]",
      "i (want | would like | hope) to (put | add | have) (it | this | my @soup) on the (specials | specials board | board | menu) [tonight]",
      "(it is | this is) [a | my | the] @soup",
      "(it is | this is) [a | my] (traditional | classic | typical | family) [lithuanian] (soup | dish | recipe)",
      "(it is | this is) for the (specials | special | specials board | menu | board) [tonight]",
      "(is it | is this) good enough [for (the specials | tonight | the menu | the board)] #fb",
      "i would love (your | some | to hear your) @fb [on (it | this | my @soup)] [@chef] #h:love_feedback #fb",
      "(could | can | may) i (get | have | ask for) (some | your) @fb [on (it | this | my @soup)] #fb",
      "(can | could) you (tell me | let me know) what you think [about (it | this) | of (it | this)] #fb",
      "(could | can) you @taste (it | this) and (give me | tell me) [some | your] (@fb | opinion) #fb",
      "what do you think [(about | of) (it | this | my @soup)] [@chef] #h:what_think #fb",
      "(i would like | i want | i need) (some | your) @fb [on (it | this | my @soup)] #fb",
      "i would (like | love) you to @taste (it | this | my @soup)",
      "(let me know | tell me) what you think #fb",
      "(can | could | would) you give me (some | your | your honest) @fb [on (it | this | my @soup)] #fb",
      "give me (your | some | your honest) @fb [on (it | this | my @soup)] #fb",
      "here [you go] (taste | try) (it | this)",
      "do you have (a minute | a second | a moment)",
      "i have something (for you to taste | to show you)",
      "i hope you (like | will like) it",
      "(taste | try) (it | this | my @soup) [@chef] #tip:bossy", "(taste | try) #tip:bossy",
      "you can (taste | try) [it | this | my @soup]", "i have [a | my | some] (@soup | something) for you",
      "i want you to (taste | try) (it | this | my @soup) #tip:bossy",
      "you (have to | must | need to) (taste | try) (it | this | my @soup) #tip:bossy",
    ] },
    nervous: { patterns: [
      "i am [a little | a bit | so | really | very | kind of | a little bit] (nervous | scared | worried | anxious | stressed) [about (it | this)] #h:nervous",
      "do not (laugh | be too hard on me | be too harsh | judge me) #h:dont_laugh",
      "(be gentle | go easy on me | be easy on me) [with me]",
      "i am not sure (it is | if it is) (good | any good | good enough)",
      "i hope it is (good | okay | all right | not too bad)",
      "i do not want you to (taste | try) (it | this) [yet]", "do not (taste | try) (it | this) yet", "(it is | my soup is) not ready [yet]",
    ] },
    want_feedback: { patterns: [
      "(sure | yes | yeah | of course | absolutely | definitely | okay) [@chef] go ahead #h:sure_go_ahead",
      "go ahead [@chef] #h:sure_go_ahead",
      "(tell me | fire away | shoot | hit me | go for it)", "do", "(tell | say | tell it | say it)",
      "[of course | sure | yes] be honest [with me] [@chef] #h:be_honest",
      "[yes | sure] i would love (some | your | to hear your | to hear some) @fb #h:love_some",
      "(i would love | i want | i would like) to (hear (it | your @fb | some @fb | what you think) | know what you think)",
      "i would (like | appreciate | welcome) (that | it | some @fb | your @fb | your honest opinion)",
      "i am (all ears | listening | ready | open to (it | any @fb | @fb))",
      "tell me (everything | the truth | what you think | honestly)",
      "give me (your | some | all the | your honest) @fb",
      "i can take it #h:can_take",
      "(that is why | that is what) i am here [for]",
      "(i want | i need) [some | your | honest] @fb",
      "(of course | sure | yes) you can",
      "what is it",
      "i would be grateful",
      "be (brutal | straight with me)",
    ] },
    no_feedback: { patterns: [
      "i do not (need | want) [any] @fb [right now | today] #tip:defensive",
      "(my soup | my recipe | it) is [already] (perfect | fine | good) [i do not need [any] @fb] #tip:defensive",
      "(maybe | perhaps) (later | after service | another time | tomorrow)",
      "(can it | can we do it | could it | can this | can that) wait [until later]",
      "(can we do (it | this) | let us do it | can you do it) (later | after service | tomorrow)",
      "i am [a bit | too | really] busy [right now]",
      "i (know | think) it is (good | perfect | fine) [already] #tip:defensive",
      "it does not need (anything | any changes | feedback) #tip:defensive",
    ] },

    // --- receiving the feedback ----------------------------------------------------------
    thanks_helpful: { patterns: [
      "(thanks | thank you) [so much | a lot | very much] [@chef | @vm] (that is | that was | it is | this is) [really | very | super | so | extremely] (helpful | useful) #h:thanks_helpful",
      "(that is | that was | it is | this is) [really | very | super | so] (helpful | useful)",
      "(that is | that was) (good | great | useful | helpful) (advice | feedback | to know)", "(good | great | useful) (advice | tip | feedback)",
      "(thanks | thank you) [so much | a lot | very much] for (the | your | this) (@fb | advice | tip | tips | help | honesty | input) [@chef] #h:thanks_for_fb",
      "(thanks | thank you) for (telling me | being honest | being so honest | the honest feedback | your honest feedback)",
      "(that | it) makes [a lot of | total | perfect] sense #h:makes_sense",
      "i see what you mean #h:see_what_mean",
      "i (understand | get | see) (your point | what you mean | it now)",
      "you are [absolutely | totally | completely | so | quite] right [@chef] [it is [a (bit | little) | kind of] flat] #h:youre_right",
      "it (is | does taste | tastes) [a (bit | little) | kind of | slightly | really] flat",
      "it (needs | could use) [a (little | bit)] more (acid | lemon | sourness | something sour)",
      "makes sense", "fair enough",
      "(good | great | fair) (point | to know | catch | call | tip)",
      "[i] [totally | completely | fully] agree [with you]",
      "i appreciate (it | that | the @fb | your @fb | your honesty | the advice | the tip) #h:appreciate",
      "(noted | got it | understood | i get it | i understand | i see) #ack", "heard [@chef] #h:heard #ack",
      "i (thought | felt) (so | that) (too | as well)",
      "(thanks | thank you) @vm [that is [really] helpful] #h:thanks_mia",
      "that is a (good | great | fair) point",
      "you have a point",
      "(that is | it is) (true | so true)",
    ] },
    will_work: { patterns: [
      "i will work on (that | it | this | the acid | the flavor | the taste) [@chef] #h:work_on_that",
      "i will (fix | change | improve | adjust | correct) (that | it | this | the flavor | the taste | the seasoning)",
      "i will [definitely | certainly] (try | do) (that | this) [next time | right now | tonight | now | today]",
      "i will add [@little] @acid [now | right now | next time | then] #acid",
      "i am going to (try | do | fix | work on | change) (that | it | this)",
      "i am going to add [@little] @acid #acid",
      "i will (keep (that | it) in mind | remember (that | it) | make a note of it)",
      "let me (fix | work on | change) (that | it | this) [right now | now]",
      "i (can | will) (do | try) that",
      "i will make it (better | brighter | more sour | less flat | more interesting)",
      "next time i will (add | use) [@little] @acid #acid",
      "i will (add | use) [@little] @fixnp [now | next time]",
      "i will give (it | that) a (try | go | shot)",
      "i try (it | that) [now]", "i will [definitely] try it [now | tonight]", "i will (try | do it)",
      "i will (make | add | put) more (acid | lemon | sourness)", "i (add | put) [@little] @acid [now] #acid",
      "i will try to (fix | improve | change | correct) (it | that | the flavor)", "i will (do | make) it better [next time | tonight]",
      "i will try it (with | without) [@little] @acid #acid",
    ] },
    defensive: { patterns: [
      "[but] i always (make | cook | do) it (like this | this way | like that) #tip:defensive",
      "[but] (it is | this is) (my | a | our) (grandmothers | grandmas | mothers | moms | family | familys | traditional | old) recipe #tip:defensive #family",
      "[but] my (grandmother | grandma | mother | mom | family) (makes | made | always makes | always made) it (like this | this way | like that) #tip:defensive #family",
      "[but] (this | that) is how (my | our) (grandmother | grandma | mother | mom | family) (makes | made | cooks | cooked) it #tip:defensive #family",
      "(no | but) it is (perfect | fine | good | delicious | not flat) [like this | like that | the way it is] #tip:defensive",
      "it is (perfect | fine | good) (like this | the way it is | as it is) #tip:defensive",
      "i do not (agree | think it is flat) #tip:defensive",
      "(you are wrong | that is wrong | that is not true | that is not right | you are not right) #tip:defensive",
      "it is (supposed | meant) to (be | taste) (like this | like that | this way | sour | flat) #tip:defensive",
      "(that is | this is) how it is (supposed | meant) to be #tip:defensive",
      "in lithuania (we | people | everybody | everyone | my family) (make | eat | cook | like | serve | love) it (like this | this way | like that) #lt #tip:defensive",
      "(everyone | everybody | my family | my friends) (likes | loves) it [like this | this way] #tip:defensive",
      "(everyone | everybody | people) in lithuania (likes | like | loves | love | eats | eat | makes | make) it [like this | this way | like that] #lt #tip:defensive",
      "(nobody | no one) [has | had] ever complained [about it] #tip:defensive",
      "you do not understand (this soup | lithuanian food | lithuanian soup | it) #tip:defensive",
      "it is not flat #tip:defensive",
      "i like (it | my soup | my version | my recipe) (like this | this way | the way it is | as it is) #tip:defensive",
      "(it | my soup) does not need (anything | any changes | more acid | acid | lemon) #tip:defensive",
      "i do not (need | want) (your @fb | any changes | lemon | more acid) #tip:defensive",
      "(it | that) does not make (any)? sense #tip:defensive", "(that is | it is) not (a good point | useful | helpful) [at all] #tip:defensive",
      "i (am not going to | will not | will never) (change | fix | work on) (it | that | this | anything) #tip:defensive", "i will never add (lemon | acid | vinegar) #tip:defensive",
      "i do not think (that is | it is) a good (point | idea) #tip:defensive",
    ] },
    ask_example: { patterns: [
      "(could | can | would) you give me (an | one | some) (example | examples) [@chef] #h:give_example",
      "(could | can | would) you give me (an idea | a hint | a tip)", "give me [an | one | some] (example | examples)",
      "(for example | like what | such as what | such as) #h:like_what",
      "what (would | do | should) (you | i) (add | use | put in | try) [to it] [@chef] #h:what_add",
      "what do you mean [by (acid | flat | that | more acid | a little more acid | it)] [@chef] #h:what_mean",
      "what (kind | sort | type) of acid [do you mean | would you use | should i use | should i add]",
      "(what | which) acid [do you mean | would you use | should i use]",
      "how much [acid] [should i (add | use | put in)]",
      "(could | can) you show me [how]",
      "what (do you suggest | would you suggest | do you recommend | would you recommend | would you do)",
      "(any | do you have any) (examples | ideas | suggestions | tips)",
      "(could | can) you be more specific",
      "how (do | can | should) i (add | get) more acid",
      "what does (acid | flat) mean [here]",
      "how (do | can | should) i (fix (it | that) | make it (better | less flat | brighter))",
      "what (can | could | should) i (add | do | use) [to fix it | to make it better]",
      "(what | which) (ingredient | thing) [would you add | should i add]",
      "i do not (see | understand | get) what you mean",
    ] },
    // "No questions." / "It's all clear." (to "Makes sense?" / "Any questions?")
    no_questions: { patterns: [
      "[no] (no | not any | zero) [more] questions [@chef]", "i (do not | did not) have any [more] questions", "(it is | everything is | it is all) clear [@chef]",
      "i (understand | got it) [everything | now]", "nothing [else] [@chef]", "i have no [more] questions",
    ] },
    guess_lemon: { patterns: [
      "[maybe | perhaps] [@little] @acid [maybe] [@chef] #h:maybe_lemon",
      "(should | can | could | do) i (add | use | put in | try) [@little] @acid",
      "(like | for example) [@little] @acid",
      "(do you mean | you mean | is it | so) [@little] @acid",
      "(what | how) about [@little] @acid",
      "(would | could | will) [@little] @acid (help | work | fix it)",
      "i could (add | use | try) [@little] @acid",
      "(add | use | try) [@little] @acid",
    ] },
    ask_again: { patterns: [
      "(could | can | would) you [please] @taste (it | this) (again | now | one more time | once more) [@chef] #h:taste_again",
      "(could | can | would) you [please] @taste (again | one more time | once more)",
      "(could | can | would) you (have | take) another (taste | try | look)",
      "(could | can) you give it another (taste | try)",
      "(taste | try) [it | this] (again | one more time | once more)", "(taste | try) (it | this) now", "better now",
      "(how about | what about) now",
      "(is it | is that | is this) better [now] [@chef] #h:better_now",
      "how (is it | does it taste | about it) now",
      "what do you think now",
      "(done | finished | all done) [taste it again | try it again | try it now | try it | taste it]",
      "i (added | put in) [@little] (@acid | {fix:ingredient}) [taste it | try it now | try it again] #h:i_added",
      "here [you go] (try it again | taste it again | try it now | taste it now)",
      "one more (taste | try)",
      "would you like to (taste | try) it (again | now)",
      "(is it | is this) (good | okay | all right) now",
    ] },

    // "And now?" / "Better?" (only while the chef waits for the second taste)
    again_ctx: { patterns: ["[and] now", "better"] },

    // --- the second idea (croutons) ----------------------------------------------------
    accept_idea: { patterns: [
      "i (had not | have not | never) thought (of | about) it (that way | like that) #h:hadnt_thought",
      "i had not thought of that [@vm] #h:hadnt_that",
      "i (had not | did not | never | have not) (thought | think) (of | about) (that | it | @crouton | pepper | black pepper) [before]",
      "(good | great | nice | interesting | lovely) (idea | suggestion | thought) [@chef | @vm] [i will try (it | that)] #h:good_idea",
      "(good | great | fair) point [@vm] [i will try (it | that)] #h:good_point",
      "(that is | it is | what) a (good | great | nice | interesting | clever | brilliant #tip:uk_brilliant) idea",
      "i will try (it | that | them | @crouton | [it] with @crouton) [@chef] [tonight]",
      "i will try [it | them] both ways #h:try_both",
      "let us try [it | that | them]", "why not [let us try [it] | try it | give it a try]",
      "(that | it) (sounds | could be | would be | might be) (good | great | interesting | nice | delicious | tasty | fun)",
      "@crouton (would be | sound | sounds | could be) (good | great | nice | interesting)",
      "(you are | that is) right [it needs [some] crunch]",
      "i (like | love) (that | that idea | the idea | croutons)",
      "let me try (it | that) [both ways | with @crouton]",
      "(maybe | perhaps) (you are right | that would work | that is a good idea)",
      "i will add (some | a few) @crouton",
      "(sure | okay) i will (try | add) (them | it | that | croutons)",
    ] },
    keep_own: { patterns: [
      "i see your point but i would (like | prefer) to keep it (traditional | as it is | like this | the way it is | simple | classic) #h:see_point",
      "(i see | i understand | i get) (your point | what you mean) but [in lithuania] (we | i) (serve | eat) it with [hot | boiled] potatoes [on the side]",
      "(fair point | good point | i see your point | i understand) but i (would rather | prefer to | want to | would like to) keep [it] (traditional | as it is | like this | simple | the potatoes | the hot potatoes)",
      "in lithuania (we | people) (serve | eat) it with [hot | boiled | warm] potatoes [on the side] #h:lt_potatoes",
      "(we | i) [usually | always] (serve | eat) it with (hot | boiled | warm) potatoes [on the side]",
      "i (think i will | would rather | prefer to | want to | would like to) keep it (traditional | simple | as it is | the way it is | like this | classic) #h:rather_simple",
      "i would rather (not | keep it simple)",
      "(i prefer | i like | i want | i would like) [the] [hot | boiled | warm] potatoes [better | more | on the side]",
      "[maybe] [hot] potatoes (are | would be) better [than @crouton]",
      "(i prefer | i like) it (without | with no) @crouton",
      "(can | could | may) i keep it (traditional | like this | as it is | simple)",
      "no @crouton [for me]",
      "i (do not | would not) (want | need) @crouton",
      "i will think about it",
      "i will not (add | use | try) [the] (pepper | black pepper | it)",
      "(i see | i understand | i get) (your point | what you mean) but (i prefer | i like | i would like) it (without | with no) @crouton",
      "(i see | i understand | i get) (your point | what you mean) but (no | i do not want | i do not need) @crouton",
      "(fair enough | fair point | good point | i see your point | i see | i understand) [but] i (like | prefer) (it | my soup | mine | my version) (like this | this way | the way it is | as it is)",
      "i do not think (it | the soup) needs @crouton", "i do not think @crouton (are | would be) a good idea",
      "maybe (another time | next time)",
      "@crouton are not (traditional | lithuanian)",
      "it is (better | nicer) without @crouton",
    ] },
    // "Croutons, then." / "Potatoes." (only while the chef asks about the croutons)
    second_ctx: { patterns: ["[okay | yes] @crouton [then] #acc", "[okay] [hot | boiled] potatoes [then] #keep"] },
    reject_rude: { patterns: [
      "[@crouton] (no way | never | absolutely not | not a chance) [@crouton] #tip:polite_disagree",
      "(that is | it is | what) a (bad | terrible | stupid | silly | horrible | crazy) idea #tip:polite_disagree",
      "@crouton (are | is) (stupid | terrible | bad | for salad | disgusting | a bad idea) #tip:polite_disagree",
      "i (do not like | hate | can not stand) @crouton #tip:polite_disagree",
      "(you are | that is) wrong #tip:polite_disagree",
      "(that is | this is) (ridiculous | crazy | nonsense | stupid) #tip:polite_disagree",
      "(forget it | forget about it) #tip:polite_disagree",
      "(that is | it is) not a (good | great) idea #tip:polite_disagree", "@crouton (would not | will not) be (good | nice | great) #tip:polite_disagree",
      "i do not like (that | the | this) idea #tip:polite_disagree", "(it | that) does not sound (good | great | nice) #tip:polite_disagree",
      "i (will not | do not want to) try (it | them | @crouton) #tip:polite_disagree",
    ] },

    // --- the favor ------------------------------------------------------------------------
    help_yes: { patterns: [
      "(sure | of course | absolutely | yes | yeah | definitely) [@chef] i would be (happy | glad) to [help] #h:happy_to",
      "i would be (happy | glad) to [help] [@chef] #h:happy_to",
      "(happy | glad) to help", "i help [her | you]",
      "(with pleasure | my pleasure)",
      "[sure] i (can | will) (do that | do it | taste it | help | help her | talk to her | give her some @fb | give her @fb) [@chef]",
      "[sure] (where is she | where is mia) [@chef] #h:where_she",
      "(no problem | of course | sure | okay | yes) [@chef] (where is (she | mia) | i will help [her] | i can help [her])",
      "(send her over | bring her over | call her)",
      "[of course] i would love to help [her]",
    ] },
    // "Of course, Chef." (only while the chef asks for the favor)
    help_yes_ctx: { patterns: ["(of course | sure | yes | absolutely | definitely | okay | all right) [@chef] #h:of_course_chef"] },
    // hesitating – "I don't know what to say." / "Sure, but I'm not a chef.": a yes (the chef reassures and calls her)
    help_unsure_ctx: { patterns: [
      "[(sure | okay | ok | yes | of course | all right | fine)] [but] i am not (a chef | a cook | a professional | an expert | good at (this | that | it | giving @fb))",
      "[(sure | okay | ok | yes | of course | all right | fine)] [but] i do not know (what to say | what to tell her | how to (do (it | that) | say it | give @fb | tell her))",
      "[(okay | ok | sure)] [but] what (do | should | can) i (say | tell her) [to her]",
      "[(okay | ok | sure)] [but] how (do | should | can) i (do (it | that) | say it | tell her | give (her | @fb) [@fb])",
      "i am not sure (i can [do (it | that)] | what to say | how to (do (it | that) | say it) | i am the right person)",
      "[(okay | ok | sure | all right)] i (will | can) try [my best]", "[(okay | ok | sure | all right)] i will do my best",
      "[(okay | ok | sure | all right)] i will try to help [her]",
    ] },
    // "Why me?" / "Can't you do it?": the chef explains, then asks again
    help_why_ctx: { patterns: [
      "why (me | not you | do i have to [do it])",
      "[why] (can not | could not | do not) you (do it | tell her) [yourself]",
      "do i have to [do it]", "why should i [do it | help her]",
    ] },
    help_no: { patterns: [
      "i would (like | love) to [help [her | you] | do it] but (i am [really | a bit | very | so] [too] busy [right now | today] | i can not | i do not have [the] time [right now | today] | i have no time)",
      "i am [really | a bit | very] (busy | too busy) [right now | today | now] [@chef]",
      "(i can not | i do not want to | i would rather not) [do (it | that) | help | taste it | help her]",
      "(that is | it is) not my job",
      "(can | could | can not | could not) someone else do it",
      "i do not have time [right now | today]", "[i have] no time [now | today | right now]",
      "(ask | can you ask) someone else",
      "i (can not | will not | would not) (help | do it | do that | help her | be happy to)",
    ] },

    // --- Mia ----------------------------------------------------------------------------------
    offer_feedback: { patterns: [
      "(can | could | may) i give you (some | a little | a bit of | some honest | my) @fb [@vm] #h:can_i_give",
      "(can | could | may) i give you @fb",
      "(do you want | would you like) [some | a little | my] @fb",
      "(can | could | may) i (say | tell you) something",
      "(can | could | may) i (taste | try | have a taste of | take a taste of) (it | your @chowder | this | some) #h:let_me_taste",
      "let me (taste | try | have a taste of) (it | this | your @chowder) #h:let_me_taste",
      "(let us | let me) (taste it | have a taste | try it | try some)",
      "[the] chef asked me to (taste (it | your @chowder) | give you some @fb | help [you]) #h:chef_asked",
      "i (will | can | am going to) (taste | try) (it | your @chowder)",
      "do you mind if i (taste | try) (it | some)",
      "(show me | let me see) [your] (chowder | soup | clam chowder)",
      "(i am here | i came) to (taste | try) (it | your @chowder)",
      "this is your (chowder | clam chowder | soup)",
      "i would love to (taste | try) (it | your @chowder)", "give me a taste [of it]", "(let me | can i) (have | get) a taste [of it]",
    ] },
    reassure: { patterns: [
      "do not (worry | be nervous | be scared | panic | stress | be afraid | apologize) [@vm] #h:dont_worry",
      "do not worry [@vm] i am sure it is (good | great | fine | delicious | not terrible | tasty) #h:dont_worry",
      "i am sure it is (good | great | fine | delicious | not terrible | tasty) #h:dont_worry",
      "(relax | take it easy | breathe | take a breath | take a deep breath | take your time | no stress) [@vm] #h:no_stress",
      "relax it is (just | only) soup #h:no_stress",
      "it is [probably] not terrible",
      "i am sure it is not (terrible | bad)",
      "(everything is | it will be) (okay | ok | fine | all right)",
      "it is (okay | ok | fine | all right)",
      "do not be [so] hard on yourself",
      "(it smells | it looks | that smells | that looks | this smells | this looks) [really | so] (great | good | amazing | delicious | wonderful | nice) [@vm] #h:smells_great",
      "no need to (worry | apologize | be sorry | be nervous)",
      "it is [only | just] soup #h:no_stress",
      "(nobody | no one) is going to (yell | shout) at you",
      "(you will be | you are) (fine | okay | all right)",
      "do not be sorry",
    ] },
    calm_down: { patterns: ["[just] (calm down | chill | chill out | cool down) [@vm] #tip:calm_down"] },
    intro_mia_ctx: { patterns: ["(i am | my name is) {name}"] },
    nice_meet: { patterns: ["nice to meet you [too] [@vm]", "(it is) nice to meet you"] },
    praise_part: { patterns: [
      "what (worked | works) [really | very | so | super] well (was | is) [the] {good:good_part} #h:worked_well",
      "i [really] (like | love | liked | loved | enjoy | enjoyed) [the | your] {good:good_part} #h:really_like",
      "(the | your) {good:good_part} (is | are | was | were | tastes | taste | smells) [really | very | so | super | absolutely] @good_adj #h:x_great",
      "{good:good_part} [is | are] (really | very | so | super) @good_adj",
      "(great | nice | lovely | perfect | good | amazing | wonderful | delicious | beautiful) {good:good_part}",
      "the best (part | thing) (is | was) the {good:good_part}",
      "the {good:good_part} (is | was | are | were) the best (part | thing)",
      "you (got | did | cooked | made) the {good:good_part} (right | perfectly | really well | just right | so well)",
      "you nailed the {good:good_part} #h:nailed",
      "i am [really | so] impressed (by | with) the {good:good_part}",
      "(it has | it has got | there is) [a | such a] (great | nice | good | lovely | beautiful | wonderful | rich) {good:good_part}",
      "(and | also) the {good:good_part} [(is | are) @good_adj]",
      "(it is | it is so | it is really | it is very | it is nice and) (creamy | smooth | rich | velvety) #pt:texture",
      "(i love | i like) how (creamy | smooth | rich | thick) it is #pt:texture",
      "i love what you did with the {good:good_part}",
    ] },
    // "The bacon." (while Mia asks what worked)
    good_ctx: { patterns: ["[the | your] {good:good_part}", "[the] {good:good_part} for sure"] },
    praise_general: { patterns: [
      "it is [really | very | so | super | actually | honestly | just] (good | great | delicious | tasty | nice | lovely | excellent | amazing | wonderful | fantastic | perfect | yummy) [@vm] #h:really_good",
      "it is [really | so] brilliant [@vm] #tip:uk_brilliant",
      "(it tastes | that tastes | this tastes) [really | very | so | super] (good | great | delicious | amazing | wonderful | fantastic)",
      "(good | great | nice | excellent | amazing | fantastic) (job | work) [@vm] #h:great_job",
      "(well done | good job | nice job | great job | nice work | good work | great work) [@vm]",
      "i [really] (like | love) it [@vm] #h:love_it",
      "(it is | that is) not bad [at all] #notbad #tip:not_bad",
      "not bad [at all] #notbad #tip:not_bad",
      "it is (okay | ok | fine | all right | decent) #notbad #tip:not_bad",
      "(this | it) is (better than | as good as) mine",
      "you (are | have) (a natural | real talent | talent | a gift)",
      "this is [really | very | so] (good | great | delicious | amazing) (chowder | soup)",
      "(best | the best) chowder [i have ever had | in town | ever]",
      "you (can | really can) cook",
      "you are a (good | great | talented) cook",
      "i would order (this | it)",
      "(it is | this is) (amazing | incredible | outstanding)",
      "i love your (chowder | soup)", "[very | really | so] (good | great | delicious | tasty) (soup | chowder)",
      "(this | the | your) (chowder | soup) (is | tastes) [really | so | very | super] @good_adj",
      "you did a (great | good | nice) job",
    ] },
    // "Mmm! Great!" (just after tasting)
    praise_short_ctx: { patterns: [
      "(great | perfect | nice | lovely | wonderful | excellent | amazing | fantastic | awesome | delicious | yummy | wow | good | very good | really good | so good | tasty | mmm | yum)",
      "(very | really | so | super) (tasty | delicious | yummy)", "brilliant #tip:uk_brilliant",
    ] },
    blunt_bad: { patterns: [
      "it is [really | very | so | just | kind of] (bad | terrible | awful | horrible | disgusting | gross | inedible | rubbish) #tip:blunt_bad",
      "it is (not good | not tasty | not nice | not very good) #tip:blunt_bad",
      "(not | not really | not very | not that | not so) (good | great | tasty | nice | delicious) #tip:blunt_bad",
      "(this | that) is (bad | terrible | awful | horrible | disgusting) #tip:blunt_bad",
      "it tastes (bad | terrible | awful | weird | strange | horrible | wrong) #tip:blunt_bad",
      "i do not like it [at all] #tip:blunt_bad",
      "(i hate it | yuck | ew | eww | gross) #tip:blunt_bad",
      "(throw it away | start again | start over | make it again | do it again) #tip:blunt_bad",
      "(you should | you could | you have to | maybe) (throw it away | start again | start over | make it again | make a new one) #tip:blunt_bad",
      "(nobody | no one) (will | would) (eat | order | like) (it | this) #tip:blunt_bad",
      "(it is | this is) (a disaster | a mess) #tip:blunt_bad",
      "it does not (taste | smell | look) (good | great | nice) #tip:blunt_bad", "(no good | not okay | it is not okay) #tip:blunt_bad",
      "i do not love it #tip:blunt_bad", "nothing (worked | works | was good) [well] #tip:blunt_bad",
    ] },
    problem_state: { patterns: [
      "it is [a little | a bit | slightly | kind of | maybe | too | very | really | a little too | a bit too | way too] (salty | bland | thin | thick | watery | heavy | cold | lukewarm | greasy | oily | sweet | dry | runny | plain | spicy | boring)",
      "it (needs | could use | is missing) (something | a little something | more flavor | more seasoning | a little more flavor | more taste)",
      "(it is | the soup is | the chowder is) missing something",
      "(something is | there is something) missing",
      "it is [a little | a bit] [too] (heavy | rich) for me",
      "the {good:good_part} (is | are) [a little | a bit | too | slightly | kind of | very] (salty | dry | hard | soft | overcooked | undercooked | raw | chewy | burnt | bland | mushy | tough | thin | weak)",
      "i (do not | did not) like the {good:good_part}",
      "the {good:good_part} (is | are | was | were) not [really | very | that | so] @good_adj",
      "you did not (nail | get) the {good:good_part} [right]",
      "it (tastes | is) [a (bit | little)] (boring | plain)",
      "it is not (salty | hot | warm | thick | creamy) enough",
      "there is too much (salt | cream | flour | butter | pepper | water)",
    ] },
    suggest_fix: { patterns: [
      "one thing you could try is [adding | using] [@little] @fixnp #h:one_thing",
      "[maybe | perhaps] you could (try | add | use | put in) [@little] @fixnp [next time] #h:could_add",
      "[maybe | perhaps] (try | add | use | put in) [@little] @fixnp [next time] #h:maybe_try",
      "have you (thought about | tried | considered) [adding | using | trying] [@little] @fixnp #h:thought_about",
      "i would (suggest | recommend) [adding | using | trying] [@little] @fixnp #h:id_suggest",
      "(what about | how about) [adding | using | trying] [@little] @fixnp #h:what_about",
      "it (needs | could use | could do with | might need) [just] [@little] @fixnp", "needs [@little] @fixnp",
      "you might want to (add | try | use) [@little] @fixnp",
      "(why not | why do not you) (add | try | use) [@little] @fixnp",
      "(i think | i feel) it (needs | wants | could use) [@little] @fixnp",
      "you should (add | try | use | put in) [@little] @fixnp",
      "you (must | have to | need to) (add | try | use | put in) [@little] @fixnp #tip:you_must #must",
      "if i were you i would (add | use | try) [@little] @fixnp",
      "try [adding] [@little] @fixnp and (taste it | see | taste it again)",
      "[maybe | perhaps] [@little] @fixnp [on top] [maybe | perhaps]",
      "[@little] @fixnp [on top] (would | could | might) (help | be good | be nice | be great | work | make it better)",
      "(do you have | did you try) [@little] @fixnp",
      "i would add [@little] @fixnp",
      "(it is missing | i miss) [@little] [the] @fixnp",
      "my (suggestion | advice | tip | idea) (is | would be) [to (add | use | try)] [@little] @fixnp",
      "it is [a little | a bit | slightly] (bland | flat | plain) [so] [maybe | you could] (add | try | use) [@little] @fixnp",
    ] },
    // "Don't add any lemon." / "You don't need salt." (no suggestion: never "add lemon")
    suggest_not: { patterns: [
      "(do not | never) (add | use | put in) [any] @fixnp",
      "you do not need [any] @fixnp",
      "i would not (add | use) [any] @fixnp",
      "it does not need [any] @fixnp", "(no | without | maybe not) @fixnp",
      "i would not (suggest | recommend) [adding | using] [any] @fixnp", "you should not (add | use | put in) [any] @fixnp",
    ] },
    suggest_other: { patterns: [
      "[maybe] (cook | simmer | boil) it [a little | a bit] longer [next time] #h:cook_longer", "[maybe] (cook | simmer | boil) [a little | a bit] longer",
      "it is [a little | a bit | slightly] (thin | watery) [so | and] [maybe] (cook | simmer) it [a little | a bit] longer #h:cook_longer",
      "[maybe | you could | you should | try to] (use | add | put in) less (flour | salt | cream | butter | water | pepper | @fixnp) [next time]",
      "you (must | have to | need to) (use | add | put in) less (flour | salt | cream | butter | water | pepper | @fixnp) #tip:you_must #must",
      "(make it | it could be | try to make it) [a little | a bit] (thicker | thinner | hotter | warmer | creamier | smoother | saltier | spicier)",
      "(serve it | it should be) (hotter | warmer)",
      "(do not | never) (add | use | put in) (so much | too much | any more) @fixnp",
      "no more @fixnp",
      "(less | not so much) @fixnp [maybe | next time]",
      "(cut | chop) the (potatoes | onions | bacon | clams | celery) (smaller | finer | bigger)",
      "(fry | crisp | cook) the bacon [a little | a bit] (more | longer)",
      "taste it as you go",
      "(take | let) it (rest | sit) [for] [a few minutes | a while]",
      "(maybe | you could) (blend | thicken) it [a little | a bit]",
      "(add | put in) the (clams | cream) (later | at the end)",
    ] },
    // "One thing you could try is nutmeg": a suggestion with words the game doesn't know
    suggest_unknown: { patterns: ["(one thing you could try is | maybe try | you could try | i would suggest | have you thought about | you could add | maybe add | try adding | you could use | maybe use) {w:any}"] },
    no_fix: { patterns: [
      "(nothing | nothing at all | nothing really | honestly nothing | there is nothing | no bad news | there is no bad news) [it is (perfect | great | fine)] [@vm]",
      "i would not change (anything | a thing)",
      "(do not | you do not need to) change (anything | a thing)",
      "it is perfect (as it is | the way it is)",
      "i (can not | could not) find anything",
      "everything is (perfect | great)",
    ] },
    howmuch_ans: { patterns: [
      "[just] a little [bit] [of (it | @fixnp)] #h:just_little",
      "[just] a (pinch | squeeze | splash | touch | dash | drop) [of (it | @fixnp)] #h:just_pinch",
      "(one | a) (teaspoon | tablespoon | spoonful | handful | spoon) [of (it | @fixnp)]",
      "(half | a quarter of) a lemon",
      "(half | a quarter | one) (teaspoon | tablespoon | spoon | cup) [of (it | @fixnp)]",
      "{number} (teaspoons | tablespoons | spoons | pinches | squeezes | drops | spoonfuls | cups) [of (it | @fixnp)]",
      "start with a little [and] [then] taste [it] [again] #h:start_little #gradual",
      "[just] a little at a time #h:little_at_time #gradual",
      "(little by little | bit by bit | slowly | step by step) #gradual",
      "taste [it] as you go #gradual",
      "not too much",
      "(add | put in) a little (then | and) taste [it] [again] #gradual",
      "until it tastes (good | right | bright | better) #gradual",
      "(not much | very little | only a little)",
      "(about | around) (a | one | two | half a) (teaspoon | tablespoon | spoon | spoonful)",
    ] },
    encourage: { patterns: [
      "you will get there [@vm] #h:get_there",
      "[do not worry] (it is | this is) [only | just] your first week #h:first_week",
      "i was (slow | nervous | scared | terrible | the same | like you) (too | as well) [@first] #h:slow_too",
      "i was [also] (slow | nervous | scared | terrible) @first [too] #h:slow_too",
      "(everyone | everybody | we all) (is | was | were) slow @first",
      "you are doing (great | fine | well | a great job | really well | good | okay) [@vm] #h:doing_great",
      "(speed | it | being fast) (comes | will come) with (time | practice) #h:comes_time",
      "(speed | it) will come [later | with time]",
      "it takes time",
      "(you are | you are getting) (almost there | close | better every day | faster every day)",
      "(not yet | you are not there yet) but you will get there",
      "keep (going | it up | practicing | at it | trying)",
      "practice makes perfect",
      "you are learning [so] (fast | quickly)", "you learn [so] (fast | quickly)", "you (learn | are learning)",
      "(nobody | no one) is fast @first",
      "you will be (fast | faster | fine | great | a great chef | a great cook) [soon | in no time | one day]",
      "do not (worry | be sorry) about (it | that | speed | being slow | the speed)",
      "(slow | being slow) is (fine | okay | normal) [@first]",
      "first (get it right | be good) then (fast | get fast | speed)",
      "(i believe in you | you can do it | you have got this | you got this)",
      "do not give up",
      "(good | great) chefs (are not | were not) fast @first",
      "you are not (slow | that slow | too slow)",
      "(it is | that is) (normal | okay) to be slow [@first]", "(it is | that is) normal [@first]",
      "(quality | good food | taste) (is | matters) more [important] than speed",
      "you are (good | talented | a good cook | a natural)",
      "do not compare yourself [to (them | others | everyone | the others)]",
      "(everyone | everybody) starts somewhere",
    ] },
    rush: { patterns: [
      "hurry up [@vm] #tip:rush",
      "you (need to | must | have to | should) be (faster | quicker) #tip:rush",
      "you are [too | very | so | really | a bit | kind of] slow #tip:rush",
      "(be | work | cook) (faster | quicker) #tip:rush",
      "(faster | quicker) #tip:rush",
    ] },

    // --- the goodbye --------------------------------------------------------------------------
    yes_chef_ctx: { patterns: [
      "(yes | yeah | okay | sure | all right) @chef #h:yes_chef",
      "heard [@chef] #h:heard",
      "(will do | on it | you got it) [@chef]",
      "see you at service [@chef]",
    ] },
    thanks_today: { patterns: [
      "(thanks | thank you) [so much | a lot] for today [@chef] #h:thanks_today",
      "(thanks | thank you) for (your help today | the lesson | the advice today | everything today | the tips)",
    ] },
  },

  lines: {
    // --- the chef: the soup ---------------------------------------------------------------
    greet: [
      t("There you are. | So, | what's | on the plate?", "Štai ir tu. | Na, | kas yra | lėkštėje?", "A, štai ir tu. Na, kas lėkštėje?"),
      t("Okay, | let's see | what | you've got.", "Gerai, | pažiūrėkime, | ką | tu turi.", "Gerai, pažiūrėkim, ką turi."),
    ],
    greet_back: [
      t("Back | for | more | feedback? | So, | what's | on the plate?", "Grįžai | — | daugiau | pastabų? | Na, | kas yra | lėkštėje?", "Grįžai dar pastabų? Na, kas lėkštėje?",
        { flags: { 1: "“for”: the genitive of purpose (pastabų) carries it." } }),
    ],
    serve_again: [
      t("So? | Are | you | going to | let | me | taste | it, | or | just | admire | it?", "Na? | Ar | tu | ketini | leisti | man | paragauti | jos, | ar | tik | grožėtis | ja?",
        "Na? Leisi man paragauti ar tik grožėsiesi?", { flags: { 1: "Question “Are” = the particle ar; ketini (under “going to”) carries the verb." } }),
    ],
    serve_take: [t("Oh, | just | give | it | here.", "O, | tiesiog | duok | ją | čia.", "Na, duok čia.")],
    dish_react: [
      t("Cold | beet | soup? | Bold. | Let | me | grab | a | spoon.", "Šalta | burokėlių | sriuba? | Drąsu. | Leisk | man | pasiimti | — | šaukštą.", "Šaltibarščiai? Drąsu. Tuoj pasiimsiu šaukštą."),
      t("Pink | soup. | I've been waiting | for | this | all | week.", "Rožinė | sriuba. | Aš laukiau | — | šito | visą | savaitę.", "Rožinė sriuba! Visą savaitę šito laukiau.",
        { flags: { 3: "“for”: laukti takes the genitive (šito), so “for” has no word." } }),
    ],
    ask_consent: [
      t("Okay. | Can | I | give | you | some | feedback?", "Gerai. | Ar galiu | aš | pasakyti | tau | kelias | pastabas?", "Gerai. Ar galiu tau pasakyti kelias pastabas?",
        { flags: { 3: F_GIVE_FB, 5: F_FEEDBACK } }),
      t("Hmm. | Can | I | give | you | some | honest | feedback?", "Hm. | Ar galiu | aš | pasakyti | tau | kelias | atviras | pastabas?", "Hm. Ar galiu tau pasakyti kelias atviras pastabas?",
        { flags: { 3: F_GIVE_FB, 5: F_FEEDBACK } }),
    ],
    consent_no: [
      t("Fair enough. | But | tonight | table | nine | will give | you | feedback | too, | and | they're | less | polite.",
        "Na, gerai. | Bet | šįvakar | staliukas | devintas | pasakys | tau | pastabas | irgi, | ir | jie yra | mažiau | mandagūs.",
        "Na, gerai. Bet šįvakar savo pastabas tau pasakys ir devintas staliukas – o jie ne tokie mandagūs.",
        { flags: { 3: "“table nine”: Lithuanian puts the ordinal first (devintas staliukas); the gloss keeps the English order." } }),
    ],
    consent_again: [
      t("Thirty | seconds. | I | promise | it | doesn't hurt.", "Trisdešimt | sekundžių. | Aš | pažadu, | — | neskaudės.", "Trisdešimt sekundžių. Pažadu, neskaudės.",
        { flags: { 4: "Dummy “it”: the impersonal neskaudės needs no subject.", 5: "A promise about what comes next: Lithuanian uses the future neskaudės." } }),
    ],
    consent_no2: [
      t("Okay, | I'll keep | it | short.", "Gerai, | pasakysiu | tai | trumpai.", "Gerai, pasakysiu trumpai.", { flags: { 1: "“keep it short” = say it briefly: pasakysiu … trumpai." } }),
    ],
    nervous_react: [t("Relax. | It's | soup, | not | surgery.", "Atsipalaiduok. | Tai yra | sriuba, | ne | operacija.", "Atsipalaiduok. Tai sriuba, ne operacija.")],

    // --- the feedback -------------------------------------------------------------------------
    feedback1a: [
      t("What | worked | really | well | was | the | dill. | And | that | color! | You | could | paint | a | wall | with | it.",
        "Kas | pavyko | labai | gerai, | tai | — | krapai. | O | ta | spalva! | Tu | galėtum | nudažyti | — | sieną | — | ja.",
        "Labai gerai pavyko krapai. O ta spalva! Galėtum ja sieną nudažyti.",
        { flags: { 4: F_CLEFT, 15: "“with”: the instrumental ja carries it." } }),
      t("What | worked | really | well | was | the | dill, | and | the | color | is | gorgeous.", "Kas | pavyko | labai | gerai, | tai | — | krapai, | o | — | spalva | yra | nuostabi.",
        "Labai gerai pavyko krapai, o spalva – nuostabi.", { flags: { 4: F_CLEFT } }),
    ],
    feedback1b: [
      t("One | thing | you | could | try | is | a little | more | acid. | Right now | it | tastes | a bit | flat.",
        "Vienas | dalykas, kurį | tu | galėtum | pabandyti, | tai | truputį | daugiau | rūgštumo. | Kol kas | jos | skonis | šiek tiek | blankus.",
        "Vienas dalykas, kurį galėtum pabandyti, – truputį daugiau rūgštumo. Kol kas jos skonis kiek blankus.",
        { flags: { 1: F_KURI, 5: F_IS_TAI, 10: "“it tastes + adjective”: Lithuanian says “its taste is …” (jos skonis).", 11: "“tastes” = skonis (yra) here." } }),
    ],
    receive_react_thanks: [
      t("Good. | That's | exactly | the | right | reaction.", "Gerai. | Tai yra | būtent | — | teisinga | reakcija.", "Gerai. Būtent taip ir reikia reaguoti."),
      t("Glad | it | helps.", "Džiaugiuosi, | kad tai | padeda.", "Džiaugiuosi, kad padeda.", { flags: { 1: F_KAD } }),
    ],
    receive_react_work: [
      t("I | know | you | will.", "Aš | žinau, | kad tu | [padirbėsi].", "Žinau, kad padirbėsi.", { flags: { 2: F_KAD, 3: "Elliptical “will”: Lithuanian repeats the verb (padirbėsi)." } }),
    ],
    receive_ok: [t("Good.", "Gerai.", "Gerai."), t("Okay. | Good.", "Gerai. | Puiku.", "Gerai. Puiku.")],
    receive_help: [
      t("You | don't have | to agree. | Just | tell | me | what | you | think.", "Tau | nebūtina | sutikti. | Tiesiog | pasakyk | man, | ką | tu | manai.",
        "Tau nebūtina sutikti. Tiesiog pasakyk, ką manai.", { flags: { 0: "“You” = tau: nebūtina takes the dative." } }),
    ],
    defensive_family: [
      t("I'm | sure | your | grandmother's | version | is | perfect. | Tonight, | though, | it's going | to | strangers.",
        "Aš esu | tikras, kad | tavo | močiutės | variantas | yra | tobulas. | Šįvakar, | tačiau, | ji keliaus | pas | nepažįstamus žmones.",
        "Neabejoju, kad tavo močiutės receptas tobulas. Bet šįvakar ši sriuba keliaus pas nepažįstamus žmones.",
        { flags: { 1: F_KAD, 9: "Present progressive for a plan: Lithuanian uses the future keliaus." } }),
    ],
    defensive_react: [
      t("I | believe | you. | I'm | just | telling | you | what | my | spoon | is telling | me.", "Aš | tikiu | tau. | Aš | tik | sakau | tau, | ką | mano | šaukštas | sako | man.",
        "Tikiu. Aš tik sakau, ką man sako mano šaukštas.", { flags: { 3: "“'m” (progressive): the present sakau carries it." } }),
    ],
    defensive_lt: [
      t("In Lithuania, | people | know | what | to expect. | Table | nine | is | from | Ohio.", "Lietuvoje | žmonės | žino, | ko | tikėtis. | Staliukas | devintas | yra | iš | Ohajo.",
        "Lietuvoje žmonės žino, ko tikėtis. O devintas staliukas – iš Ohajo."),
    ],
    def_move_on: [t("Okay. | Just | think | about | it.", "Gerai. | Tiesiog | pagalvok | apie | tai.", "Gerai. Tiesiog pagalvok apie tai.")],
    receive_again: [t("So? | What | do | you | think?", "Na? | Ką | — | tu | manai?", "Na? Ką manai?", { flags: { 2: F_WH_DO } })],
    receive_skip: [t("Okay. | Moving | on.", "Gerai. | Judame | toliau.", "Gerai. Judam toliau.")],

    // --- the example and the second taste -------------------------------------------------------
    // "Makes sense?" – "Yes." = no questions; "Any questions?" – "Yes." = one is coming
    example_sense: [t("Makes sense?", "Suprantama?", "Suprantama?")],
    example_questions: [t("Any | questions?", "Kokių nors | klausimų?", "Klausimų yra?")],
    go_ahead: [t("Sure, | go ahead.", "Žinoma, | klausk.", "Žinoma, klausk.")],
    example_give: [
      t("For example, | a | squeeze | of lemon, | or | a | splash | of | pickle | juice. | Just | a little.",
        "Pavyzdžiui, | — | šlakelis | citrinos, | arba | — | šlakelis | — | agurkų | rasalo. | Tik | truputį.",
        "Pavyzdžiui, šlakelis citrinos arba agurkų rasalo. Tik truputį.", { flags: { 7: "“of”: the genitive agurkų rasalo carries it (pickle stands between)." } }),
    ],
    example_confirm: [t("Exactly. | Just | a little. | Then | taste | it | again.", "Būtent. | Tik | truputį. | Tada | paragauk | jos | dar kartą.", "Būtent. Tik truputį. Tada vėl paragauk.")],
    example_offer: [
      t("Here's | an | example: | a | squeeze | of lemon. | Just | a little.", "Štai | — | pavyzdys: | — | šlakelis | citrinos. | Tik | truputį.", "Štai pavyzdys: šlakelis citrinos. Tik truputį."),
    ],
    again_prompt: [t("Go ahead, | add | some. | I'll wait.", "Pirmyn, | įdėk | truputį. | Palauksiu.", "Pirmyn, įdėk truputį. Palauksiu.")],
    again_auto: [t("Here, | let | me | taste | it | again.", "Duok, | leisk | man | paragauti | jos | dar kartą.", "Duok, paragausiu dar kartą.")],
    again_react: [
      t("Now we're talking. | That | really | wakes | it | up.", "Štai čia jau kita kalba. | Tai | tikrai | pažadina | ją | —.", "Štai čia jau kita kalba. Tai ją tikrai pažadina.",
        { flags: { 5: "“up” (wake … up): the prefix pa- of pažadina carries it." } }),
      t("Much | better. | That's | a | real | soup | now.", "Daug | geriau. | Tai yra | — | tikra | sriuba | dabar.", "Daug geriau. Dabar tai tikra sriuba."),
    ],

    // --- the croutons ---------------------------------------------------------------------------
    second_ask: [
      t("One more | thing. | Have | you | thought | about | some | crunch? | I'd | suggest | a | few | croutons | on | top.",
        "Dar vienas | dalykas. | Ar | tu | pagalvojai | apie | — | traškumą? | Aš | siūlyčiau | — | kelis | skrebučius | ant | viršaus.",
        "Dar vienas dalykas. Ar pagalvojai apie traškumą? Siūlyčiau ant viršaus kelis skrebučius.",
        { flags: { 2: "Perfect question “Have” = ar; the past tense of pagalvojai carries it.", 6: "“some”: no Lithuanian word here.", 8: F_ID } }),
    ],
    second_accept_react: [
      t("Good. | Try | it | both | ways | and | taste | them | side by side.", "Gerai. | Pabandyk | — | abiem | būdais | ir | paragauk | jų | greta.",
        "Gerai. Pabandyk abiem būdais ir paragauk jų greta.", { flags: { 2: F_NO_OBJ } }),
      t("Good. | Toast | them | in | a little | butter.", "Gerai. | Paskrudink | juos | su | trupučiu | sviesto.", "Gerai. Paskrudink juos su trupučiu sviesto.",
        { flags: { 3: "“in (butter)” = su (with) in Lithuanian cooking." } }),
    ],
    both_ways: [
      t("Then | try | it | both | ways | and | taste | them | side by side.", "Tada | pabandyk | — | abiem | būdais | ir | paragauk | jų | greta.",
        "Tada pabandyk abiem būdais ir paragauk jų greta.", { flags: { 2: F_NO_OBJ } }),
    ],
    second_keep_react: [
      t("Fair enough. | Your | plate.", "Na, gerai. | Tavo | lėkštė.", "Na, gerai. Tavo lėkštė."),
      t("Fair enough. | Your | soup, | your | rules.", "Na, gerai. | Tavo | sriuba, | tavo | taisyklės.", "Na, gerai. Tavo sriuba – tavo taisyklės."),
    ],
    second_rude_react: [
      t("Ha! | Tell | me | how | you | really | feel. | Fair enough, | your | plate.", "Cha! | Pasakyk | man, | ką | tu | iš tikrųjų | jauti. | Na, gerai, | tavo | lėkštė.",
        "Cha! Sakyk, ką iš tikrųjų galvoji. Na, gerai – tavo lėkštė.", { flags: { 3: "“how you feel” = ką jauti (what you feel)." } }),
    ],
    second_reask: [t("So, | croutons | or | no | croutons?", "Tai | skrebučiai | ar | jokių | skrebučių?", "Tai su skrebučiais ar be?")],
    second_skip: [t("Think | about | it.", "Pagalvok | apie | tai.", "Pagalvok.")],

    // --- the favor ---------------------------------------------------------------------------------
    handoff1: [
      t("Now, | a | favor. | Mia | started | on Monday, | and | she | made | the | clam | chowder.", "Dabar, | — | prašymas. | Mija | pradėjo dirbti | pirmadienį, | ir | ji | išvirė | — | moliuskų | sriubą.",
        "O dabar – prašymas. Mija pradėjo dirbti pirmadienį ir išvirė moliuskų sriubą."),
    ],
    handoff2: [
      t("She's | too | scared | to ask | me | about | it. | Would | you | taste | it | and | give | her | some | feedback?",
        "Ji | per daug | bijo | paklausti | manęs | apie | ją. | Ar | tu | paragautum | jos | ir | pasakytum | jai | kelias | pastabas?",
        "Ji per daug bijo manęs paklausti. Gal paragautum ir pasakytum jai kelias pastabas?",
        { flags: { 0: "“'s” (is): the verb bijo carries it.", 2: "“scared” = the verb bijoti.", 7: "“Would” in a yes/no question = ar; the conditional sits on paragautum." } }),
    ],
    handoff3: [t("The way | I | just | did | with | you. | Gently.", "Taip, kaip | aš | ką tik | padariau | su | tavimi. | Švelniai.", "Taip, kaip ką tik padariau su tavimi. Švelniai.")],
    handoff_again: [t("So? | Will | you | help | her?", "Na? | Ar | tu | padėsi | jai?", "Na? Padėsi jai?", { flags: { 1: "Question “Will” = ar; the future padėsi carries it." } })],
    handoff_yes: [t("Thanks. | Mia! | Come | here | a | sec.", "Ačiū. | Mija! | Ateik | čia | — | sekundėlei.", "Ačiū. Mija! Ateik sekundėlei.")],
    handoff_anyway: [t("Too | late. | Mia! | Come | here | a | sec.", "Per | vėlu. | Mija! | Ateik | čia | — | sekundėlei.", "Per vėlu. Mija! Ateik sekundėlei.")],
    handoff_no: [
      t("I'm | not asking | you | to be | her | chef, | just | a | friendly | colleague. | Five | minutes.",
        "Aš | neprašau | tavęs | būti | jos | {m:šefu|f:šefe}, | tik | — | {m:draugišku|f:draugiška} | {m:kolega|f:kolege}. | Penkios | minutės.",
        "Aš neprašau tavęs būti jos {m:šefu|f:šefe} – tik {m:draugišku kolega|f:draugiška kolege}. Penkios minutės.", { flags: { 0: "“'m” (progressive): the present neprašau (under “not asking”) carries it." } }),
    ],
    // "I don't know what to say." / "Sure, but I'm not a chef." (then he calls her)
    handoff_unsure: [
      t("You | don't need | to be | a | chef. | Just | tell | her | what | worked, | and | one | thing | to try.",
        "Tau | nereikia | būti | — | {m:šefu|f:šefe}. | Tiesiog | pasakyk | jai, | kas | pavyko, | ir | vieną | dalyką | pabandyti.",
        "Nebūtina būti {m:šefu|f:šefe}. Tiesiog pasakyk jai, kas pavyko, ir vieną dalyką, kurį verta pabandyti."),
    ],
    // "Why me?" / "Can't you do it?"
    handoff_why: [
      t("Because | she's | scared | of me. | She'll listen | to you.", "Nes | ji | bijo | manęs. | Ji klausys | tavęs.",
        "Nes ji manęs bijo. O tavęs ji paklausys.", { flags: { 1: "“'s” (is): the verb bijo carries it.", 2: "“scared” = the verb bijoti." } }),
    ],

    // --- the chef at the end ------------------------------------------------------------------------
    chef_end_good: [
      t("That's | how | it's done. | She'll remember | that | for years.", "Štai | kaip | tai daroma. | Ji prisimins | tai | daugelį metų.",
        "Štai kaip tai daroma. Ji tai prisimins dar daug metų.", { flags: { 0: "“That's” here = štai." } }),
    ],
    chef_twist_laugh: [t("Ha! | Now | she's got | it.", "Cha! | Dabar | ji perprato | tai.", "Cha! Dabar ji jau perprato.")],
    closing_chef: [
      t("Good | work, | both | of | you. | Doors | open | at | 5:30. | Taste | everything | again | before | that.",
        "Geras | darbas, | {m:abu|f:abi} | — | jūs. | Durys | atsidaro | — | 17.30. | Paragaukite | visko | dar kartą | prieš | tai.",
        "Puikiai padirbėjote, {m:abu|f:abi}. Restoranas atsidaro 17.30, tad prieš tai dar kartą visko paragaukite.",
        { say: "Good work, both of you. Doors open at five thirty. Taste everything again before that.",
          flags: { 2: "“both” = abu (a man and a woman) or abi (two women).", 3: "“of”: no Lithuanian word (abu jūs).", 7: "Clock “at”: Lithuanian uses the time alone.", 8: "5:30 p.m. = 17.30 in Lithuanian notation." } }),
    ],
    closing_partial: [
      t("Not bad | for | one | afternoon. | Tomorrow | we | taste | it | all | again.", "Neblogai | — | vienai | popietei. | Rytoj | mes | paragausime | — | visko | dar kartą.",
        "Neblogai vienai popietei. Rytoj visko paragausime dar kartą.",
        { flags: { 1: "“for”: the dative vienai popietei carries it.", 6: "Present for a plan: Lithuanian uses the future paragausime.", 7: "“it all” = viskas: visko (under “all”) carries it." } }),
    ],
    closing_reply: [t("Go on. | And | put | that | soup | on | the | board.", "Eik. | Ir | įrašyk | tą | sriubą | į | — | lentą.", "Eik. Ir įrašyk tą sriubą į dienos pasiūlymų lentą.")],
    bye_early: [t("Leaving | already? | The | soup | won't fix | itself.", "Išeini | jau? | — | Sriuba | nepasitaisys | pati.", "Jau išeini? Sriuba pati nepasitaisys.")],

    // --- Mia ----------------------------------------------------------------------------------------
    mia_hi: [
      t("Hi. | Um. | Chef | said | you'd | taste | my | chowder. | Sorry. | It's | probably | terrible.",
        "Labas. | Ee. | Šefas | sakė, | kad tu | paragausi | mano | sriubos. | Atsiprašau. | Ji yra | turbūt | siaubinga.",
        "Labas. Ee… Šefas sakė, kad paragausi mano sriubos. Atsiprašau. Ji turbūt siaubinga.",
        { flags: { 4: "Zero “that”: kad; “'d” (would in reported speech) = the future paragausi (under “taste”)." } }),
      t("Hey. | So, | um, | this | is | my | chowder. | Please | be | nice.", "Labas. | Taigi, | ee, | tai | yra | mano | sriuba. | Prašau, | būk | {m:geras|f:gera}.",
        "Labas. Taigi, ee… čia mano sriuba. Prašau, būk {m:geras|f:gera}."),
    ],
    mia_wait: [t("Do | you... | want | to taste | it?", "Ar | tu... | nori | paragauti | jos?", "Ar tu… nori paragauti?", { flags: { 0: F_DO_Q } })],
    mia_here: [t("Here. | Just | taste | it.", "Štai. | Tiesiog | paragauk | jos.", "Štai. Tiesiog paragauk.")],
    mia_ready: [
      t("Okay. | Yes. | Please | be | honest. | But, | like, | gently.", "Gerai. | Taip. | Prašau, | būk | {m:atviras|f:atvira}. | Bet, | na, | švelniai.",
        "Gerai. Taip. Prašau, būk {m:atviras|f:atvira}. Bet, na, švelniai."),
    ],
    mia_reassured: [
      t("Thanks. | I've been stirring | it | for an hour. | I | think | it's staring | at | me.", "Ačiū. | Aš maišau | ją | jau valandą. | Aš | manau, | kad ji spokso | į | mane.",
        "Ačiū. Maišau ją jau valandą. Man atrodo, kad ji į mane spokso.",
        { flags: { 1: "Present perfect continuous: Lithuanian uses the present maišau.", 3: "“for” (duration): the accusative valandą carries it; jau marks “already”.", 6: F_KAD } }),
    ],
    mia_calm_react: [t("I | am | calm! | I'm | totally | calm.", "Aš | esu | rami! | Aš esu | visiškai | rami.", "Aš rami! Visiškai rami.")],
    mia_nice: [t("Nice | to meet | you.", "Malonu | susipažinti | su tavimi.", "Malonu susipažinti.")],
    mia_nice_too: [t("Nice | to meet | you | too.", "Malonu | susipažinti | su tavimi | irgi.", "Man irgi malonu susipažinti.")],
    mia_ask_good: [
      t("So... | is | anything | good?", "Tai... | ar yra | kas nors | gero?", "Tai… ar yra bent kas nors gero?"),
      t("Okay... | but | is | there | anything | you | liked?", "Gerai... | bet | ar yra | — | kas nors, kas | tau | patiko?", "Gerai… bet ar yra kas nors, kas tau patiko?",
        { flags: { 2: "Question “is” = ar yra.", 3: "Existential “there” has no Lithuanian word; yra carries it.", 4: "Zero relative: Lithuanian adds kas.", 5: "“you” = tau: patikti takes the dative." } }),
    ],
    mia_what: [t("Really? | What?", "Tikrai? | Kas?", "Tikrai? Kas?")],
    mia_flinch: [t("Oh. | Okay. | Sorry. | I | knew | it.", "Oi. | Gerai. | Atsiprašau. | Aš | žinojau | tai.", "Oi. Gerai. Atsiprašau. Taip ir žinojau.")],
    mia_relief: [
      t("Really? | The | {X}? | Oh, | thank goodness.", "Tikrai? | — | {X:nom}? | Oi, | ačiū Dievui.", "Tikrai? Tau patiko {X:nom}? Oi, ačiū Dievui."),
      t("Wait, | really? | I | almost | threw | the | whole | pot | out.", "Palauk, | tikrai? | Aš | vos | neišmečiau | — | viso | puodo | —.", "Palauk, tikrai? Aš vos neišmečiau viso puodo.",
        { flags: { 4: "“almost” + past = vos ne-: Lithuanian adds the prefix ne- (and the genitive viso puodo).", 8: "“out” (throw … out): the prefix iš- of išmečiau carries it." } }),
    ],
    mia_relief_general: [
      t("Really? | You're | not | just | saying | that?", "Tikrai? | Tu | ne | šiaip | sakai | taip?", "Tikrai? Ne šiaip sau taip sakai?",
        { flags: { 1: "“'re” (progressive): the present sakai carries it." } }),
    ],
    mia_bad_news: [t("Okay. | So | what's | the | bad | news?", "Gerai. | Tai | kokios yra | — | blogos | naujienos?", "Gerai. O kokios blogos naujienos?")],
    mia_something: [t("There's | something, | right? | I | can take it.", "Yra | kažkas, | tiesa? | Aš | atlaikysiu.", "Kažkas yra, tiesa? Atlaikysiu.")],
    mia_problem_react: [t("Oh | no. | So | what | should | I | do?", "Oi | ne. | Tai | ką | turėčiau | aš | daryti?", "Oi ne. Tai ką man daryti?")],
    mia_problem_back: [t("Okay. | So | what | should | I | do | about | it?", "Gerai. | Tai | ką | turėčiau | aš | daryti | dėl | to?", "Gerai. Tai ką man dėl to daryti?")],
    mia_what_do: [t("So... | what | should | I | do?", "Tai... | ką | turėčiau | aš | daryti?", "Tai… ką man daryti?")],
    mia_fix_it: [t("Okay. | I'll fix | that.", "Gerai. | Pataisysiu | tai.", "Gerai. Pataisysiu.")],
    mia_try_odd: [t("In | chowder? | Huh. | Okay, | I'll try | that.", "Į | sriubą? | Hm. | Gerai, | pabandysiu | tai.", "Į sriubą? Hm. Gerai, pabandysiu.")],
    mia_try_ok: [t("Okay. | I | can | do | that.", "Gerai. | Aš | galiu | padaryti | tai.", "Gerai. Tai galiu padaryti.")],
    mia_try_x: [t("A little | {X}. | Got it.", "Truputį | {X:gen}. | Supratau.", "Truputį {X:gen}. Supratau.")],
    mia_must_react: [t("Okay... | I'll try.", "Gerai... | pabandysiu.", "Gerai… pabandysiu.")],
    mia_no_x: [t("No | {X}? | Okay.", "Be | {X:gen}? | Gerai.", "Be {X:gen}? Gerai.")],
    mia_try_giveup: [t("Okay. | I'll taste | it | again | later.", "Gerai. | Paragausiu | jos | dar kartą | vėliau.", "Gerai. Vėliau dar kartą paragausiu.")],
    mia_howmuch: [
      t("Could | you | give | me | an | example? | Like, | how much?", "Ar galėtum | tu | duoti | man | — | pavyzdį? | Na, | kiek?", "Gal galėtum duoti pavyzdį? Na, kiek dėti?",
        { flags: { 0: F_COULD_Q } }),
    ],
    mia_howmuch_react: [t("A little at a time. | Got it.", "Po truputį. | Supratau.", "Po truputį. Supratau.")],
    mia_howmuch_ok: [t("Okay. | Got it. | Thanks.", "Gerai. | Supratau. | Ačiū.", "Gerai. Supratau. Ačiū.")],
    mia_howmuch_unsure: [
      t("Okay. | I'll add | a little, | then | taste | it | again.", "Gerai. | Įdėsiu | truputį, | tada | paragausiu | jos | dar kartą.", "Gerai. Įdėsiu truputį, tada vėl paragausiu."),
    ],
    mia_slow: [
      t("Sorry | I'm | so | slow. | Everyone | here | is | faster | than | me.", "Atsiprašau, | kad aš esu | tokia | lėta. | Visi | čia | yra | greitesni | už | mane.",
        "Atsiprašau, kad esu tokia lėta. Visi čia greitesni už mane.", { flags: { 1: F_KAD } }),
    ],
    mia_slow_again: [
      t("I | just... | I | don't want | to let | Chef | down.", "Aš | tiesiog... | aš | nenoriu | nuvilti | šefo | —.", "Aš tiesiog… nenoriu nuvilti šefo.",
        { flags: { 6: "“down” (let … down): nuvilti (under “to let”) carries it." } }),
    ],
    mia_rush_react: [t("I | know. | I'm trying.", "Aš | žinau. | Stengiuosi.", "Žinau. Stengiuosi.")],
    mia_encouraged: [
      t("Okay. | Thanks. | I | needed | that.", "Gerai. | Ačiū. | Man | reikėjo | to.", "Gerai. Ačiū. Man to reikėjo.", { flags: { 2: "“I” = man: reikėti takes the dative." } }),
      t("Thanks. | That | actually | helps | a lot.", "Ačiū. | Tai | iš tikrųjų | padeda | labai.", "Ačiū. Tai tikrai labai padeda."),
    ],
    mia_try_harder: [t("Okay. | I'll try | harder.", "Gerai. | Stengsiuosi | labiau.", "Gerai. Stengsiuosi labiau.")],
    mia_twist: [
      t("Um... | can | I | give | you | some | feedback | too?", "Ee... | ar galiu | aš | pasakyti | tau | kelias | pastabas | irgi?", "Ee… ar galiu ir aš tau pasakyti kelias pastabas?",
        { flags: { 3: F_GIVE_FB, 5: F_FEEDBACK } }),
    ],
    mia_twist2: [
      t("I | tasted | your | soup. | One | thing | you | could | try | is | a little | black | pepper.",
        "Aš | paragavau | tavo | sriubos. | Vienas | dalykas, kurį | tu | galėtum | pabandyti, | tai | truputį | juodųjų | pipirų.",
        "Paragavau tavo sriubos. Vienas dalykas, kurį galėtum pabandyti, – truputis juodųjų pipirų.", { flags: { 5: F_KURI, 9: F_IS_TAI } }),
    ],
    mia_twist_thanks: [
      t("Really? | You're | not mad?", "Tikrai? | Tu | nepyksti?", "Tikrai? Nepyksti?", { flags: { 1: "“'re” (are): Lithuanian says this with the verb pykti, so no copula." } }),
    ],
    mia_twist_fair: [t("Fair enough. | Your | plate. | That's | what | Chef | says.", "Na, gerai. | Tavo | lėkštė. | Tai yra | tai, ką | šefas | sako.", "Na, gerai. Tavo lėkštė. Taip sako šefas.")],
    mia_twist_defensive: [
      t("Oh. | Sorry. | Forget | I | said | anything.", "Oi. | Atsiprašau. | Pamiršk, | kad aš | sakiau | ką nors.", "Oi. Atsiprašau. Pamiršk, ką sakiau.", { flags: { 3: F_KAD } }),
    ],
    mia_bye: [t("Thank | you. | Really.", "Ačiū | tau. | Tikrai.", "Ačiū tau. Tikrai.")],

    // --- global lines, with tu: both cooks say tu to the player (the global copies switch by the NPC's flag)
    g_not_understood: [
      t("Sorry, | I | didn't catch | that.", "Atsiprašau, | aš | nenugirdau | to.", "Atsiprašau, nenugirdau."),
      t("Sorry, | could | you | say | that | again?", "Atsiprašau, | ar galėtum | tu | pasakyti | tai | dar kartą?", "Atsiprašau, ar galėtum pakartoti?"),
      t("I'm sorry, | I | didn't understand.", "Atsiprašau, | aš | nesupratau.", "Atsiprašau, nesupratau."),
    ],
    g_take_time: [
      t("Sure, | take your time.", "Žinoma, | neskubėk.", "Žinoma, neskubėk."),
      t("No | rush.", "Jokio | skubėjimo.", "Neskubėk."),
      t("Take your time.", "Neskubėk.", "Neskubėk."),
    ],
    g_no_worries: [
      t("No | worries!", "Jokių | rūpesčių!", "Nieko tokio!"),
      t("That's | okay!", "Tai | gerai!", "Nieko tokio!"),
      t("Don't worry | about | it!", "Nesijaudink | dėl | to!", "Nesijaudink!"),
    ],
    g_learning: [
      t("No | problem! | Your | English | is | really | good.", "Jokių | problemų! | Tavo | anglų kalba | yra | tikrai | gera.", "Jokių problemų! Tu tikrai gerai kalbi angliškai."),
      t("That's | okay! | You're doing | great.", "Tai | gerai! | Tau sekasi | puikiai.", "Nieko tokio! Tau puikiai sekasi."),
    ],
    g_hello: [t("Hello!", "Labas!", "Labas!"), t("Hi!", "Labas!", "Labas!")],
    g_howareyou_reply: [
      t("I'm | good, | thanks! | And | you?", "Man | gerai, | ačiū! | O | tau?", "Gerai, ačiū! O tau?"),
      t("Pretty | good, | thanks! | And | you?", "Visai | gerai, | ačiū! | O | tau?", "Visai gerai, ačiū! O tau?"),
      t("Not bad, | thanks! | How | are | you?", "Neblogai, | ačiū! | Kaip | sekasi | tau?", "Neblogai, ačiū! Kaip tau sekasi?"),
    ],
    g_asked_back: [
      t("I'm | great, | thanks | for | asking!", "Man | puikiai, | ačiū, | kad | klausi!", "Puikiai, ačiū, kad klausi!"),
      t("Good, | thank | you!", "Gerai, | dėkoju | tau!", "Gerai, ačiū!"),
      t("Pretty | good, | thanks!", "Visai | gerai, | ačiū!", "Visai gerai, ačiū!"),
    ],
    g_meaning: [
      t("Good | question! | Let | me | show | you.", "Geras | klausimas! | Leisk | man | parodyti | tau.", "Geras klausimas! Tuoj parodysiu."),
      t("Here, | let | me | explain.", "Štai, | leisk | man | paaiškinti.", "Tuoj paaiškinsiu."),
    ],
    g_yes_what: [t("Sure! | What | can | I | do | for you?", "Žinoma! | Ką | galiu | aš | padaryti | tau?", "Žinoma! Kuo galiu padėti?")],
  },

  hints: {
    // to the chef: jūs
    serve: {
      lt: "Paprašyti šefo paragauti sriubos",
      items: [
        { id: "could_taste", s: t("Chef, | could | you | taste | this?", "Šefe, | ar galėtumėte | jūs | paragauti | šito?", "Šefe, gal galėtumėte paragauti?", { flags: { 1: F_COULD_Q } }), register: "polite" },
        { id: "would_mind", s: t("Would | you | mind | tasting | it?", "Ar | jūs | neprieštarautumėte | paragauti | jos?", "Gal neprieštarautumėte paragauti?",
          { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on neprieštarautumėte.", 2: "“mind” (would you mind) = neprieštarauti: Lithuanian asks whether you would not object." } }), register: "polite" },
        { id: "love_feedback", s: t("I'd | love | your | feedback.", "Aš | labai norėčiau | jūsų | pastabų.", "Labai norėčiau išgirsti jūsų pastabas.",
          { flags: { 0: F_ID, 1: "“love” after I'd = labai norėti." } }) },
        { id: "heres_soup", s: t("Here's | my | cold | beet | soup.", "Štai | mano | šalta | burokėlių | sriuba.", "Štai mano šaltibarščiai.") },
        { id: "its_ready", s: t("It's | ready, | Chef.", "Ji yra | paruošta, | šefe.", "Paruošta, šefe.") },
        { id: "what_think", s: t("What | do | you | think?", "Ką | — | jūs | manote?", "Ką manote?", { flags: { 1: F_WH_DO } }) },
      ],
    },
    nerves: {
      lt: "Pasakyti, kad jaudiniesi",
      items: [
        { id: "nervous", s: t("I'm | a little | nervous.", "Aš esu | truputį | {m:susijaudinęs|f:susijaudinusi}.", "Truputį jaudinuosi.") },
        { id: "dont_laugh", s: t("Please, | don't laugh.", "Prašau, | nesijuokite.", "Tik nesijuokite.") },
      ],
    },
    consent: {
      lt: "Sutikti išklausyti pastabas",
      items: [
        { id: "sure_go_ahead", s: t("Sure, | go ahead.", "Žinoma, | sakykite.", "Žinoma, sakykite.") },
        { id: "be_honest", s: t("Of course. | Please | be | honest.", "Žinoma. | Prašau, | būkite | atviras.", "Žinoma. Būkite atviras.") },
        { id: "love_some", s: t("Yes, | I'd | love | some | feedback.", "Taip, | aš | labai norėčiau | kelių | pastabų.", "Taip, labai norėčiau išgirsti pastabų.",
          { flags: { 1: F_ID, 2: "“love” after I'd = labai norėti." } }) },
        { id: "can_take", s: t("I | can take it.", "Aš | atlaikysiu.", "Atlaikysiu."), note: "Iš dainos: „Atlaikysiu.“ Taip sakoma, kai nori pasakyti, kad kritikos nebijai." },
      ],
    },
    receive: {
      lt: "Priimti pastabas",
      items: [
        { id: "thanks_helpful", s: t("Thanks, | that's | really | helpful.", "Ačiū, | tai yra | tikrai | naudinga.", "Ačiū, tai tikrai naudinga.") },
        { id: "work_on_that", s: t("I'll work | on | that.", "Padirbėsiu | prie | to.", "Prie to padirbėsiu.") },
        { id: "makes_sense", s: t("That | makes sense.", "Tai | suprantama.", "Suprantu.") },
        { id: "thanks_for_fb", s: t("Thanks | for | the | feedback.", "Ačiū | už | — | pastabas.", "Ačiū už pastabas.") },
        { id: "youre_right", s: t("You're | right, | it's | a bit | flat.", "Jūs esate | teisus, | ji yra | šiek tiek | blanki.", "Jūs teisus, ji kiek blankoka.") },
        { id: "appreciate", s: t("I | appreciate | your | honesty.", "Aš | vertinu | jūsų | atvirumą.", "Vertinu jūsų atvirumą.") },
        { id: "see_what_mean", s: t("I | see | what | you | mean.", "Aš | suprantu, | ką | jūs | turite omenyje.", "Suprantu, ką turite omenyje.", { flags: { 1: "“see” here = suprasti." } }) },
      ],
    },
    example: {
      lt: "Paprašyti pavyzdžio",
      items: [
        { id: "give_example", s: t("Could | you | give | me | an | example?", "Ar galėtumėte | jūs | duoti | man | — | pavyzdį?", "Gal galėtumėte duoti pavyzdį?", { flags: { 0: F_COULD_Q } }) },
        { id: "what_add", s: t("What | would | you | add?", "Ką | — | jūs | įdėtumėte?", "Ką jūs įdėtumėte?", { flags: { 1: "“would”: the conditional įdėtumėte carries it." } }) },
        { id: "what_mean", s: t("What | do | you | mean | by | acid?", "Ką | — | jūs | turite omenyje | sakydamas | „rūgštumas“?", "Ką turite omenyje sakydamas „rūgštumas“?",
          { flags: { 1: F_WH_DO, 4: "“by (a word)” = sakydamas (when saying)." } }) },
        { id: "like_what", s: t("Like | what?", "Pavyzdžiui | ką?", "Pavyzdžiui?"), register: "casual" },
        { id: "maybe_lemon", s: t("Maybe | a little | lemon?", "Gal | truputį | citrinos?", "Gal truputį citrinos?") },
      ],
    },
    again: {
      lt: "Paprašyti paragauti dar kartą",
      items: [
        { id: "taste_again", s: t("Could | you | taste | it | again?", "Ar galėtumėte | jūs | paragauti | jos | dar kartą?", "Gal galėtumėte paragauti dar kartą?", { flags: { 0: F_COULD_Q } }),
          note: "Dainos pavadinimas: „Taste It Again“." },
        { id: "better_now", s: t("Is | it | better | now?", "Ar | ji | geresnė | dabar?", "Ar dabar geriau?", { flags: { 0: "Question “Is” = the particle ar; no copula needed." } }) },
        { id: "i_added", s: t("I | added | some | lemon.", "Aš | įdėjau | — | citrinos.", "Įdėjau citrinos.", { flags: { 2: "Partitive “some”: the genitive citrinos carries it." } }) },
      ],
    },
    second: {
      lt: "Sutikti arba mandagiai pasilikti prie savo",
      items: [
        { id: "hadnt_thought", s: t("I | hadn't thought | of | it | that way.", "Aš | {m:nebuvau pagalvojęs|f:nebuvau pagalvojusi} | apie | tai | taip.", "Taip apie tai nebuvau {m:pagalvojęs|f:pagalvojusi}.") },
        { id: "good_idea", s: t("Good | idea. | I'll try | that.", "Gera | mintis. | Pabandysiu | tai.", "Gera mintis. Pabandysiu.") },
        { id: "try_both", s: t("I'll try | it | both | ways.", "Pabandysiu | — | abiem | būdais.", "Pabandysiu abiem būdais.", { flags: { 1: F_NO_OBJ } }) },
        { id: "see_point", s: t("I | see | your | point, | but | I'd like | to keep | it | traditional.", "Aš | suprantu | jūsų | mintį, | bet | norėčiau | palikti | ją | tradicinę.",
          "Suprantu, ką norite pasakyti, bet norėčiau palikti ją tradicinę."), note: "Mandagiai nesutikti: pirma pripažink kito mintį, tada pasakyk savo." },
        { id: "lt_potatoes", s: t("In Lithuania, | we | serve | it | with | hot | potatoes | on the side.", "Lietuvoje | mes | patiekiame | ją | su | karštomis | bulvėmis | atskirai.",
          "Lietuvoje ją patiekiame su karštomis bulvėmis atskirai.") },
        { id: "rather_simple", s: t("Thanks, | but | I'd | rather | keep | it | simple.", "Ačiū, | bet | aš | verčiau | palikčiau | ją | paprastą.", "Ačiū, bet verčiau palikčiau ją paprastą.",
          { flags: { 2: "“'d” (would): the conditional palikčiau carries it." } }) },
      ],
    },
    handoff: {
      lt: "Sutikti padėti Mijai",
      items: [
        { id: "happy_to", s: t("Sure, | I'd be happy to.", "Žinoma, | mielai.", "Žinoma, mielai.") },
        { id: "of_course_chef", s: t("Of course, | Chef.", "Žinoma, | šefe.", "Žinoma, šefe.") },
        { id: "where_she", s: t("Sure. | Where | is | she?", "Žinoma. | Kur | yra | ji?", "Žinoma. Kur ji?") },
      ],
    },
    // to Mia: tu
    mia_open: {
      lt: "Paklausti, ar gali paragauti ir pasakyti pastabų",
      items: [
        { id: "can_i_give", s: t("Can | I | give | you | some | feedback?", "Ar galiu | aš | pasakyti | tau | kelias | pastabas?", "Ar galiu tau pasakyti kelias pastabas?",
          { flags: { 3: F_GIVE_FB, 5: F_FEEDBACK } }), note: "Dainos frazė: taip prieš pastabas paklausė šefas." },
        { id: "let_me_taste", s: t("Let | me | taste | it.", "Leisk | man | paragauti | jos.", "Duok paragauti.") },
        { id: "chef_asked", s: t("Chef | asked | me | to taste | it.", "Šefas | paprašė | manęs | paragauti | jos.", "Šefas paprašė manęs paragauti.") },
      ],
    },
    mia_calm: {
      lt: "Nuraminti Miją",
      items: [
        { id: "dont_worry", s: t("Don't worry, | I'm | sure | it's | good.", "Nesijaudink, | aš esu | {m:tikras|f:tikra}, | kad ji yra | skani.", "Nesijaudink, esu {m:tikras|f:tikra}, kad ji skani.",
          { flags: { 3: F_KAD, 4: F_FOOD } }) },
        { id: "smells_great", s: t("It | smells | great.", "Ji | kvepia | puikiai.", "Puikiai kvepia.") },
        { id: "no_stress", s: t("Relax. | It's | just | soup.", "Atsipalaiduok. | Tai yra | tik | sriuba.", "Atsipalaiduok, tai tik sriuba.") },
      ],
    },
    mia_worked: {
      lt: "Pasakyti Mijai, kas pavyko", slot: "good_part", examples: ["bacon", "potatoes", "texture", "smell"],
      items: [
        { id: "worked_well", s: t("What | worked | really | well | was | the | {X}.", "Kas | pavyko | labai | gerai, | tai | — | {X:nom}.", "Labai gerai pavyko {X:nom}.", { flags: { 4: F_CLEFT } }),
          note: "Dainos frazė: pirmiausia pasakyk, kas pavyko." },
        { id: "really_like", s: t("I | really | like | the | {X}.", "Man | labai | patinka | — | {X:nom}.", "Man labai patinka {X:nom}.", { flags: { 0: "“I” = man: patikti takes the dative." } }) },
        { id: "nailed", s: t("You | nailed | the | {X}.", "Tau | puikiai pavyko | — | {X:nom}.", "Tau puikiai pavyko {X:nom}.",
          { flags: { 0: "“You” = tau: pavykti takes the dative.", 1: "“nailed” (got it just right) = puikiai pavyko." } }), register: "casual" },
        { id: "x_great", s: t("Your | {X} | is | great.", "Tavo | {X:nom} | yra | {puikus@X:nom}.", "Tavo {X:nom} – {puikus@X:nom}."), only: (e) => !e.attrs?.enPl && !e.attrs?.ltPl },
        { id: "x_great", s: t("Your | {X} | is | great.", "Tavo | {X:nom} | yra | {puikus@X:nom:pl}.", "Tavo {X:nom} – {puikus@X:nom:pl}."), only: (e) => !e.attrs?.enPl && !!e.attrs?.ltPl },
        { id: "x_great", s: t("Your | {X} | are | great.", "Tavo | {X:nom} | yra | {puikus@X:nom:pl}.", "Tavo {X:nom} – {puikus@X:nom:pl}."), only: (e) => !!e.attrs?.enPl },
        { id: "really_good", s: t("It's | really | good, | Mia.", "Ji yra | tikrai | skani, | Mija.", "Ji tikrai skani, Mija.", { flags: { 2: F_FOOD } }) },
        { id: "great_job", s: t("Great | job, | Mia.", "Puikus | darbas, | Mija.", "Puikiai padirbėjai, Mija.") },
        { id: "love_it", s: t("I | love | it!", "Man | labai patinka | ji!", "Man ji labai patinka!", { flags: { 0: "“I” = man: patikti takes the dative.", 1: "“love” (food) = labai patikti." } }) },
      ],
    },
    mia_try: {
      lt: "Pasiūlyti vieną dalyką pabandyti", slot: "ingredient", examples: ["lemon", "pepper", "thyme", "garlic"],
      items: [
        { id: "one_thing", s: t("One | thing | you | could | try | is | a little | {X}.", "Vienas | dalykas, kurį | tu | galėtum | pabandyti, | tai | truputį | {X:gen}.",
          "Vienas dalykas, kurį galėtum pabandyti, – truputis {X:gen}.", { flags: { 1: F_KURI, 5: F_IS_TAI } }), only: (e) => !e.attrs?.count, note: "Dainos frazė: po pagyrimo – vienas dalykas pabandyti." },
        { id: "one_thing", s: t("One | thing | you | could | try | is | a | few | {X}.", "Vienas | dalykas, kurį | tu | galėtum | pabandyti, | tai | — | keli | {X:nom}.",
          "Vienas dalykas, kurį galėtum pabandyti, – keli {X:nom}.", { flags: { 1: F_KURI, 5: F_IS_TAI } }), only: (e) => !!e.attrs?.count },
        { id: "thought_about", s: t("Have | you | thought | about | {X}?", "Ar | tu | pagalvojai | apie | {X:acc}?", "Ar pagalvojai apie {X:acc}?",
          { flags: { 0: "Perfect question “Have” = ar; the past tense of pagalvojai carries it." } }) },
        { id: "id_suggest", s: t("I'd | suggest | a little | more | {X}.", "Aš | siūlyčiau | truputį | daugiau | {X:gen}.", "Siūlyčiau truputį daugiau {X:gen}.", { flags: { 0: F_ID } }), only: (e) => !e.attrs?.count },
        { id: "maybe_try", s: t("Maybe | try | a little | {X}?", "Gal | pabandyk | truputį | {X:gen}?", "Gal pabandyk truputį {X:gen}?"), only: (e) => !e.attrs?.count },
        { id: "could_add", s: t("You | could | add | a little | {X}.", "Tu | galėtum | įdėti | truputį | {X:gen}.", "Galėtum įdėti truputį {X:gen}."), only: (e) => !e.attrs?.count },
        { id: "could_add", s: t("You | could | add | a | few | {X}.", "Tu | galėtum | įdėti | — | kelis | {X:acc}.", "Galėtum įdėti kelis {X:acc}."), only: (e) => !!e.attrs?.count },
        { id: "what_about", s: t("What about | a little | {X}?", "O gal | truputį | {X:gen}?", "O gal truputį {X:gen}?"), only: (e) => !e.attrs?.count },
        { id: "cook_longer", s: t("It's | a bit | thin. | Maybe | cook | it | a little | longer?", "Ji yra | šiek tiek | skysta. | Gal | pavirk | ją | truputį | ilgiau?", "Ji kiek skystoka. Gal pavirk ją truputį ilgiau?") },
      ],
    },
    mia_howmuch: {
      lt: "Pasakyti, kiek dėti",
      items: [
        { id: "just_little", s: t("Just | a little.", "Tik | truputį.", "Tik truputį.") },
        { id: "just_pinch", s: t("Just | a | pinch.", "Tik | — | žiupsnelį.", "Tik žiupsnelį.") },
        { id: "start_little", s: t("Start | with | a little, | then | taste | it | again.", "Pradėk | nuo | truputėlio, | tada | paragauk | jos | dar kartą.", "Pradėk nuo truputėlio, paskui vėl paragauk.") },
        { id: "little_at_time", s: t("A little at a time.", "Po truputį.", "Po truputį.") },
      ],
    },
    mia_encourage: {
      lt: "Padrąsinti Miją",
      items: [
        { id: "get_there", s: t("You'll | get there.", "Tau | pavyks.", "Tau pavyks.", { flags: { 0: "“You'll” = tau: Lithuanian says “it will work out for you”; the future sits on pavyks." } }),
          note: "Dainos frazė: „Tau pavyks.“" },
        { id: "first_week", s: t("Don't worry, | it's | your | first | week.", "Nesijaudink, | tai yra | tavo | pirma | savaitė.", "Nesijaudink, tai tik tavo pirma savaitė.") },
        { id: "slow_too", s: t("I | was | slow | at first | too.", "Aš | buvau | {m:lėtas|f:lėta} | iš pradžių | irgi.", "Aš iš pradžių irgi buvau {m:lėtas|f:lėta}.") },
        { id: "doing_great", s: t("You're doing | great.", "Tau sekasi | puikiai.", "Tau puikiai sekasi.") },
        { id: "comes_time", s: t("Speed | comes | with | time.", "Greitis | ateina | su | laiku.", "Greitis ateina su laiku.") },
      ],
    },
    mia_back: {
      lt: "Priimti Mijos pastabą",
      items: [
        { id: "thanks_mia", s: t("Thanks, | Mia. | That's | really | helpful.", "Ačiū, | Mija. | Tai yra | tikrai | naudinga.", "Ačiū, Mija. Tai tikrai naudinga.") },
        { id: "good_point", s: t("Good | point. | I'll try | it.", "Gera | pastaba. | Pabandysiu | tai.", "Gera pastaba. Pabandysiu.") },
        { id: "hadnt_that", s: t("I | hadn't thought | of | that.", "Aš | {m:nebuvau pagalvojęs|f:nebuvau pagalvojusi} | apie | tai.", "Apie tai nebuvau {m:pagalvojęs|f:pagalvojusi}.") },
      ],
    },
    closing: {
      lt: "Atsisveikinti su šefu",
      items: [
        { id: "yes_chef", s: t("Yes, | Chef!", "Taip, | šefe!", "Taip, šefe!"), note: "Virtuvėje šefui atsakoma „Yes, Chef!“" },
        { id: "heard", s: t("Heard, | Chef!", "Supratau, | šefe!", "Supratau, šefe!", { flags: { 0: "“Heard”: kitchen word for “understood”." } }) },
        { id: "thanks_today", s: t("Thanks | for | today, | Chef.", "Ačiū | už | šiandieną, | šefe.", "Ačiū už šiandieną, šefe.") },
      ],
    },
  },

  tips: {
    feedbacks: { key: "feedbacks", lt: "Suprasta! „Feedback“ angliškai neskaičiuojamas: sakoma „some feedback“ arba „a piece of feedback“, bet ne „feedbacks“ ar „a feedback“.", better: "Can I give you some feedback?" },
    remarks: { key: "remarks", lt: "Suprasta! „Remarks“ skamba oficialiai, beveik kaip pastabos protokole. Apie darbą ir maistą sakoma „feedback“.", better: "Thanks for the feedback." },
    bossy: { key: "bossy", lt: "Suprasta! Šefui liepiamoji nuosaka skamba kaip įsakymas. Geriau paprašyti klausimu – ir pridėti „Chef“.", better: "Chef, could you taste this?" },
    defensive: { key: "defensive", lt: "Suprasta! Į pastabas geriau iš karto nesiginti – taip skamba, lyg neklausytum. Pirmiausia padėkok, o savo nuomonę gali pasakyti vėliau, ramiai.", better: "Thanks, that's really helpful. I'll work on that." },
    polite_disagree: { key: "polite_disagree", lt: "Suprasta! Nesutikti galima, bet mandagiai: pirmiausia pripažink kito mintį („I see your point, but…“), tada pasakyk, ką norėtum palikti.", better: "I see your point, but I'd like to keep it traditional." },
    blunt_bad: { key: "blunt_bad", lt: "Suprasta! Naujokei taip pasakius, ji tik išsigąs ir nieko neišmoks. Pradėk nuo to, kas pavyko, ir tada pasiūlyk vieną konkretų dalyką.", better: "What worked really well was the bacon. One thing you could try is a little lemon." },
    you_must: { key: "you_must", lt: "Suprasta! „You must“ ir „you have to“ skamba kaip įsakymas. Patarimą švelniau pateikti su „could“ arba „I'd suggest“.", better: "One thing you could try is a little thyme." },
    not_bad: { key: "not_bad", lt: "Suprasta! Lietuviškas „neblogai“ dažnai yra pagyrimas, bet angliškai „not bad“ ar „it's okay“ nervingam naujokui skamba vėsiai, lyg tau nepatiktų. Pagirk aiškiau.", better: "It's really good, Mia." },
    calm_down: { key: "calm_down", lt: "Suprasta! Amerikiečiams „calm down“ dažnai skamba kaip priekaištas – lyg žmogus perdėtų. Švelniau: „Don't worry.“ arba „Take your time.“", better: "Don't worry, take your time." },
    rush: { key: "rush", lt: "Suprasta! Gal ir tiesa, bet dabar Mijai labiau reikia padrąsinimo nei skubinimo. Greitis ateis su laiku.", better: "Don't worry. You'll get there." },
    uk_beet: { key: "uk_beet", lt: "Suprasta! Amerikoje burokėliai – „beets“, o šaltibarščiai – „cold beet soup“.", better: "Here's my cold beet soup." },
    uk_brilliant: { key: "uk_brilliant", lt: "Suprasta! „Brilliant“ skamba britiškai – amerikietis dažniau sakytų „great“ arba „amazing“.", better: "It's really good, Mia." },
    uk_cream: { key: "uk_cream", lt: "Suprasta! Amerikoje riebi grietinėlė – „heavy cream“.", better: "One thing you could try is a little heavy cream." },
    uk_scallions: { key: "uk_scallions", lt: "Suprasta! Amerikoje laiškiniai svogūnai – „green onions“ arba „scallions“.", better: "You could add a few green onions." },
  },

  merges: {
    "there you are": { reason: "lexical_expression", split: "there → ten, you → tu, are → esi gives “ten tu esi”; the greeting on finding someone = štai ir tu.", minimal: "The three words form the greeting." },
    "let's see": { reason: "lexical_expression", split: "let's → leiskime + see → matyti is false; the formula = pažiūrėkime.", minimal: "Two words." },
    "you've got": { reason: "grammatical_fusion", split: "you've → tu turi + got → gavai gives a false “got”; have got = turėti.", minimal: "Pronoun with the fused auxiliary and the participle." },
    "going to": { reason: "grammatical_fusion", split: "going → einantis + to → į is false; the intention construction = ketinti.", minimal: "Two words." },
    "i've been waiting": { reason: "grammatical_fusion", split: "I've → aš turiu, been → buvęs, waiting → laukiantis is false; the present perfect continuous = laukiau.", minimal: "Subject, auxiliaries and verb; the object stays outside." },
    "fair enough": { reason: "lexical_expression", split: "fair → teisinga + enough → pakankamai is false; the concession = na, gerai.", minimal: "Two words." },
    "will give": { reason: "grammatical_fusion", split: "will → valia + give → duoti is false; the future = pasakys (one verb form).", minimal: "Auxiliary and verb." },
    "a little": { reason: "lexical_expression", split: "a → — + little → mažas gives “mažas”; the degree adverb = truputį.", minimal: "Two words." },
    "a bit": { reason: "lexical_expression", split: "a → — + bit → gabalėlis is false; the degree adverb = šiek tiek.", minimal: "Two words." },
    "makes sense": { reason: "lexical_expression", split: "makes → daro + sense → prasmę is a calque; = suprantama.", minimal: "Two words." },
    "for example": { reason: "lexical_expression", split: "for → už + example → pavyzdys is false; = pavyzdžiui.", minimal: "Two words." },
    "go ahead": { reason: "lexical_expression", split: "go → eik + ahead → pirmyn is a literal movement; the invitation = pirmyn / sakykite.", minimal: "Two words." },
    "now we're talking": { reason: "lexical_expression", split: "now → dabar, we're → mes, talking → kalbame is false; the approval idiom = štai čia jau kita kalba.", minimal: "The whole idiom." },
    "one more": { reason: "lexical_expression", split: "one → vienas + more → daugiau gives “vienas daugiau”; = dar vienas.", minimal: "Two words." },
    "side by side": { reason: "lexical_expression", split: "side → šonas, by → prie, side → šonas is nonsense; = greta.", minimal: "The three words form the phrase." },
    "the way": { reason: "lexical_expression", split: "the → — + way → kelias is false; “the way (I did)” = taip, kaip.", minimal: "Two words." },
    "not asking": { reason: "grammatical_fusion", split: "not → ne + asking → prašantis is false; the negated present = neprašau (negation is the prefix ne-).", minimal: "Negation and verb." },
    "it's done": { reason: "grammatical_fusion", split: "it's → tai yra + done → padarytas is false; the impersonal passive = tai daroma.", minimal: "Pronoun, auxiliary and participle." },
    "she's got": { reason: "grammatical_fusion", split: "she's → ji yra + got → gavo is false; “she's got it” (understands) = ji perprato.", minimal: "Pronoun with the fused auxiliary and the participle; “it” stays outside." },
    "go on": { reason: "lexical_expression", split: "go → eik + on → ant is false; the dismissal = eik.", minimal: "Two words." },
    "i've been stirring": { reason: "grammatical_fusion", split: "I've → aš turiu, been → buvęs, stirring → maišantis is false; the present perfect continuous = maišau.", minimal: "Subject, auxiliaries and verb; the object stays outside." },
    "for an hour": { reason: "grammatical_fusion", split: "for → už/— + an → — + hour → valanda: the accusative valandą carries “for” (duration), jau the “already” sense.", minimal: "No glossable word inside." },
    "thank goodness": { reason: "lexical_expression", split: "thank → dėkoti + goodness → gerumas is false; the exclamation = ačiū Dievui.", minimal: "Two words." },
    "can take it": { reason: "lexical_expression", split: "can → gali + take → imti + it → tai is false; “I can take it” (criticism) = atlaikysiu.", minimal: "The three words form the idiom." },
    "a little at a time": { reason: "lexical_expression", split: "a little → truputį, at → prie, a → —, time → laikas is nonsense; = po truputį.", minimal: "The whole phrase." },
    "a lot": { reason: "lexical_expression", split: "a → — + lot → partija/sklypas is false; the degree adverb = labai.", minimal: "Two words." },
    "not mad": { reason: "grammatical_fusion", split: "not → ne + mad → piktas: Lithuanian says this with the verb pykti and the negation is its prefix (nepyksti).", minimal: "Two words." },
    "that way": { reason: "lexical_expression", split: "that → tas + way → kelias is false; “think of it that way” = taip.", minimal: "Two words." },
    "on the side": { reason: "lexical_expression", split: "on → ant, the → —, side → šono is a literal place; serving “on the side” = atskirai.", minimal: "The three words form the phrase." },
    "i'd be happy to": { reason: "lexical_expression", split: "I'd → aš, be → būti, happy → laimingas, to → į is a calque; the polite acceptance = mielai.", minimal: "The whole formula." },
    "get there": { reason: "lexical_expression", split: "get → gauti + there → ten is a false place; “you'll get there” = tau pavyks.", minimal: "Two words." },
    "at first": { reason: "lexical_expression", split: "at → prie + first → pirmas is false; = iš pradžių.", minimal: "Two words." },
    "what about": { reason: "lexical_expression", split: "what → kas + about → apie gives “kas apie”; a suggestion = o gal.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    // items 1, 3 and 4: not needed for the course report; they leave the list once their moment has passed
    { lt: "Paprašyk šefo paragauti tavo sriubos", optional: true, done: (c) => !!c.s.offered, when: (c) => !c.s.goalMet && !c.s.served },
    { lt: "Priimk pastabas: padėkok ir pasakyk, kad prie to padirbėsi", done: (c) => !!c.s.received },
    { lt: "Paprašyk pavyzdžio", optional: true, done: (c) => !!c.s.exAsked, when: (c) => !c.s.goalMet && !c.s.exampleDone },
    { lt: "Atsakyk į šefo pasiūlymą (sutik arba mandagiai pasilik prie savo)", optional: true, done: (c) => !!c.s.secondAns, when: (c) => !c.s.goalMet && !c.s.secondDone },
    { lt: "Pasakyk Mijai, kas jai pavyko", done: (c) => !!c.s.praised },
    { lt: "Pasiūlyk vieną dalyką, kurį ji galėtų pabandyti", done: (c) => !!c.s.tried },
    { lt: "Padrąsink Miją", done: (c) => !!c.s.encouraged },
  ],

  steps: [
    { id: "serve", done: (c) => !!c.s.served,
      ask: (c) => {
        const n = bump(c, "serve");
        if (n === 1) { C(c, c.s.greetBack ? "greet_back" : "greet"); return; }
        if (n === 2) { C(c, "serve_again"); return; }
        // the third time the chef takes the bowl himself (item 1 not ticked)
        C(c, "serve_take"); serveDish(c, false, []); askNext(c);
      },
      expects: ["offer_taste", "nervous"],
      suggest: [{ lt: "Paprašyti šefo paragauti sriubos", hint: "serve" }, { lt: "Pasakyti, kad jaudiniesi", hint: "nerves" }],
      // "So? Are you going to let me taste it?" – "Yes." / "No."
      yes: (c) => { if (asks(c, "serve") >= 2) serveDish(c, true, []); },
      no: (c) => { if (asks(c, "serve") >= 2) { C(c, "serve_take"); serveDish(c, false, []); } },
      help: (c) => { C(c, "serve_take"); serveDish(c, false, []); askNext(c); } },
    { id: "consent", when: (c) => !!c.s.served && !c.s.fbAsked, done: (c) => !!c.s.consented,
      ask: (c) => { bump(c, "consent"); C(c, "ask_consent"); },
      expects: ["want_feedback", "no_feedback", "nervous"],
      suggest: [{ lt: "Sutikti išklausyti pastabas", hint: "consent" }],
      yes: (c) => { c.s.consented = true; },
      no: (c) => { refuse(c); },
      help: (c) => { C(c, "consent_no2"); c.s.consented = true; askNext(c); } },
    { id: "receive", when: (c) => !!c.s.served && (!!c.s.consented || !!c.s.fbAsked), done: receiveDone,
      ask: (c) => {
        const n = bump(c, "receive");
        if (!c.s.fbGiven) { c.s.fbGiven = true; C(c, "feedback1a"); C(c, "feedback1b"); return; }
        if (n >= 4) { c.s.recvSkip = true; C(c, "receive_skip"); askNext(c); return; }
        C(c, "receive_again");
      },
      expects: ["thanks_helpful", "will_work", "defensive", "ask_example"],
      suggest: [{ lt: "Padėkoti ir pasakyti, kad prie to padirbėsi", hint: "receive" }, { lt: "Paprašyti pavyzdžio", hint: "example" }],
      yes: (c) => { receiveWell(c, "ok"); },
      no: (c) => { defend(c, []); },
      help: (c) => { C(c, "receive_help"); } },
    { id: "example", when: receiveDone, done: (c) => !!c.s.exampleDone,
      ask: (c) => {
        const n = bump(c, "example");
        c.s.exQ = n === 1 ? c.pick(["sense", "questions"]) : c.s.exQ === "sense" ? "questions" : "sense";
        C(c, c.s.exQ === "sense" ? "example_sense" : "example_questions");
      },
      expects: ["ask_example", "guess_lemon", "no_questions"],
      suggest: [{ lt: "Paprašyti pavyzdžio", hint: "example" }],
      // "Any questions?" – "Yes." invites the question; "Makes sense?" – "No." gets the example at once
      yes: (c) => { if (c.s.exQ === "questions") { C(c, "go_ahead"); c.hold(); } else exampleNo(c); },
      no: (c) => { exampleNo(c, c.s.exQ === "sense"); },
      help: (c) => { exampleNo(c, true); } },
    { id: "again", when: (c) => receiveDone(c) && !!c.s.exampleDone, done: (c) => !!c.s.againDone,
      ask: (c) => {
        const n = bump(c, "again");
        if (n === 1) { C(c, "again_prompt"); return; }
        tasteAgain(c, true); askNext(c);
      },
      expects: ["ask_again", "again_ctx"],
      suggest: [{ lt: "Paprašyti paragauti dar kartą", hint: "again" }],
      yes: (c) => { tasteAgain(c, true); }, no: (c) => { tasteAgain(c, true); },
      help: (c) => { tasteAgain(c, true); askNext(c); } },
    { id: "second", when: (c) => !!c.s.againDone, done: (c) => !!c.s.secondDone,
      ask: (c) => {
        const n = bump(c, "second");
        if (n === 1) { C(c, "second_ask"); return; }
        if (n <= 3) { C(c, "second_reask"); return; }
        C(c, "second_skip"); c.s.secondDone = true; askNext(c);
      },
      expects: ["accept_idea", "keep_own", "reject_rude", "second_ctx", "thanks_helpful", "will_work"],
      suggest: [{ lt: "Sutikti arba mandagiai pasilikti prie savo", hint: "second" }],
      yes: (c) => { secondAnswer(c, "accept"); },
      // "No, thanks." keeps the soup as it is; a bare "No." is blunt
      no: (c) => { secondAnswer(c, /\bthank/i.test(c.heard) ? "keep" : "rude"); },
      help: (c) => { C(c, "both_ways"); c.s.secondDone = true; askNext(c); } },
    { id: "handoff", when: (c) => !!c.s.secondDone, done: (c) => !!c.s.handoffDone,
      ask: (c) => {
        // a "no, but …" that no yes took back
        if (NO_LATER.has(c)) { NO_LATER.delete(c); helpNoSay(c); if (c.s.handoffDone) { askNext(c); return; } }
        const n = bump(c, "handoff");
        if (n === 1) { C(c, "handoff1"); C(c, "handoff2"); C(c, "handoff3"); return; }
        if (n <= 2) { C(c, "handoff_again"); return; }
        callMia(c, "anyway"); askNext(c);
      },
      expects: ["help_yes", "help_yes_ctx", "help_no", "help_unsure_ctx", "help_why_ctx"],
      suggest: [{ lt: "Sutikti padėti Mijai", hint: "handoff" }],
      yes: (c) => { callMia(c, "yes"); }, no: (c) => { helpNo(c, true); },
      // "I don't know" (or a "no, but …" still waiting): one no this turn
      help: (c) => {
        if (NO_LATER.has(c)) NO_LATER.delete(c); else if (!once(c, "helpNo")) return;
        helpNoSay(c); if (c.s.handoffDone) askNext(c);
      } },
    { id: "mia_open", when: (c) => !!c.s.handoffDone, done: (c) => !!c.s.miaOpen,
      ask: (c) => {
        const n = bump(c, "mia_open");
        if (n === 1) { M(c, "mia_hi"); return; }
        if (n <= 3) { M(c, "mia_wait"); return; }
        M(c, "mia_here"); c.s.miaOpen = true; askNext(c);
      },
      expects: ["offer_feedback", "reassure", "calm_down", "intro_mia_ctx", "nice_meet"],
      suggest: [{ lt: "Paklausti, ar gali paragauti ir pasakyti pastabų", hint: "mia_open" }, { lt: "Nuraminti Miją", hint: "mia_calm" }],
      yes: (c) => { miaReady(c); },
      // "No" to "It's probably terrible": it isn't
      no: (c) => { reassure(c); },
      help: (c) => { M(c, "mia_wait"); } },
    { id: "mia_worked", when: (c) => !!c.s.miaOpen, done: praiseDone,
      ask: (c) => {
        const n = bump(c, "mia_worked");
        // the learner tastes the chowder; Mia waits (her face says the rest) unless she already flinched
        tasteChowder(c);
        if (n === 1 && !c.s.miaQ) return;
        if (n >= 5) { c.s.praiseSkip = true; askNext(c); return; }
        c.s.miaQ = "ask_good"; M(c, "mia_ask_good");
      },
      expects: ["praise_part", "praise_general", "praise_short_ctx", "good_ctx", "blunt_bad", "problem_state"],
      suggest: [{ lt: "Pasakyti Mijai, kas jai pavyko", hint: "mia_worked", options: "good_part" }],
      // "Is anything good?" – "Yes." → "Really? What?"
      yes: (c) => { if (c.s.miaQ === "ask_good") { M(c, "mia_what"); c.hold(); } },
      no: (c) => { if (c.s.miaQ === "ask_good") blunt(c); },
      help: (c) => { c.s.miaQ = "ask_good"; M(c, "mia_ask_good"); } },
    { id: "mia_try", when: praiseDone, done: tryDone,
      ask: (c) => {
        const n = bump(c, "mia_try");
        // what the learner just said decides how she asks (a fix in the same breath skips this question)
        if (c.s.probNow) { c.s.probNow = false; M(c, "mia_problem_react"); return; }
        if (c.s.flinch) { c.s.flinch = false; M(c, "mia_what_do"); return; }
        if (c.s.noFixNow) { c.s.noFixNow = false; M(c, "mia_something"); return; }
        if (n === 1 && c.s.problemOpen) { M(c, "mia_problem_back"); return; }
        if (n >= 4) { tryGiveUp(c); askNext(c); return; }
        M(c, n === 2 ? "mia_something" : "mia_bad_news");
      },
      expects: ["suggest_fix", "suggest_other", "suggest_unknown", "suggest_not", "problem_state", "blunt_bad", "no_fix"],
      suggest: [{ lt: "Pasiūlyti vieną dalyką pabandyti", hint: "mia_try", options: "ingredient" }],
      no: (c) => { noFix(c); },
      help: (c) => { M(c, "mia_something"); } },
    { id: "mia_howmuch", when: (c) => !!c.s.tried && !!c.s.howMuch && !!c.s.fix && !c.s.amountGiven, done: (c) => !!c.s.howMuchDone,
      ask: (c) => {
        const n = bump(c, "mia_howmuch");
        if (n === 1) { M(c, "mia_howmuch"); return; }
        howMuchUnsure(c); askNext(c);
      },
      expects: ["howmuch_ans"],
      suggest: [{ lt: "Pasakyti, kiek dėti", hint: "mia_howmuch" }],
      yes: (c) => { howMuchUnsure(c); }, no: (c) => { howMuchUnsure(c); },
      help: (c) => { howMuchUnsure(c); askNext(c); } },
    { id: "mia_encourage", when: tryDone, done: encDone,
      ask: (c) => {
        const n = bump(c, "mia_encourage");
        if (n === 1) { M(c, "mia_slow"); return; }
        if (n <= 3) { M(c, "mia_slow_again"); return; }
        c.s.encSkip = true; M(c, "mia_try_harder"); askNext(c);
      },
      expects: ["encourage", "reassure", "calm_down", "rush"],
      suggest: [{ lt: "Padrąsinti Miją", hint: "mia_encourage" }],
      // "Sorry I'm so slow." – "Yes." agrees she is slow; "No." means she isn't
      yes: (c) => { rush(c, true); }, no: (c) => { encourage(c); },
      help: (c) => { M(c, "mia_slow_again"); } },
    // Twist: Mia gives the learner feedback (no mission item).
    { id: "mia_back", when: (c) => encDone(c) && !!c.s.backTwist, done: (c) => !!c.s.backDone,
      ask: (c) => {
        const n = bump(c, "mia_back");
        if (n === 1) { c.twist("mia_feedback"); M(c, "mia_twist"); M(c, "mia_twist2"); return; }
        // anything else: Mia takes it as a yes
        twistThanks(c, true); askNext(c);
      },
      expects: ["thanks_helpful", "will_work", "accept_idea", "keep_own", "defensive", "reject_rude"],
      suggest: [{ lt: "Priimti Mijos pastabą", hint: "mia_back" }],
      yes: (c) => { twistThanks(c, true); }, no: (c) => { twistDefensive(c); },
      help: (c) => { twistFair(c); } },
  ],

  init: (c) => {
    c.s.asks = {};
    c.s.backTwist = c.visits >= 1 ? c.chance(0.6) : c.chance(0.25);
    c.s.howMuch = c.chance(0.6);
    c.s.greetBack = !!c.memory.pierChef && c.chance(0.5);
  },

  start: () => { /* the serve step greets */ },

  handlers: {
    // --- the soup ---
    offer_taste(c, _slots, seg) {
      const fb = seg.tags.includes("fb");
      if (!c.s.served) { if (once(c, "offer")) serveDish(c, true, seg.tags); return; }
      // "Could you taste this? I'd love your feedback." (the second piece asks for the feedback)
      if (fb && !c.s.consented && !c.s.fbGiven) { if (c.step === "consent") c.s.consented = true; else c.s.fbAsked = true; return; }
      if (c.step === "again" || (c.s.exampleDone && !c.s.againDone && receiveDone(c))) { tasteAgain(c, false); return; }
    },
    nervous(c) { if (once(c, "nervous")) C(c, "nervous_react"); },
    want_feedback(c, _slots, seg) {
      if (!c.s.served) { if (once(c, "offer")) serveDish(c, true, [...seg.tags, "fb"]); return; }
      if (!c.s.consented && !c.s.fbAsked) { c.s.consented = true; return; }
      if (c.step === "mia_back") { twistThanks(c); return; }
    },
    no_feedback(c) {
      if (c.step === "consent" || (c.s.served && !c.s.consented && !c.s.fbAsked)) { refuse(c); return; }
      if (c.step === "mia_back") { twistDefensive(c); return; }
    },

    // --- receiving ---
    thanks_helpful(c, _slots, seg) {
      const ackOnly = seg.tags.includes("ack");
      switch (c.step) {
        case "receive": receiveWell(c, "thanks"); return;
        case "example": exampleNo(c); return;
        case "again": tasteAgain(c, true); return;
        case "second": secondAnswer(c, "accept"); return;
        case "mia_back": twistThanks(c); return;
        case "mia_encourage": if (/\btrue\b/i.test(c.heard)) { rush(c, true); return; } break;
      }
      if (c.s.fbGiven && !receiveDone(c)) { receiveWell(c, "thanks"); return; }
      // "Got it." / "I see." elsewhere: an okay
      if (ackOnly) { stepYes(c); return; }
    },
    will_work(c, _slots, seg) {
      switch (c.step) {
        case "receive": receiveWell(c, "work"); return;
        case "example": if (seg.tags.includes("acid")) guessed(c); else exampleNo(c); return;
        case "again": tasteAgain(c, true); return;
        case "second": secondAnswer(c, "accept"); return;
        case "mia_back": twistThanks(c); return;
      }
      if (c.s.fbGiven && !receiveDone(c)) { receiveWell(c, "work"); return; }
    },
    defensive(c, _slots, seg) {
      if (c.step === "mia_back") { twistDefensive(c); return; }
      if (c.step === "second") { secondAnswer(c, "keep"); return; }
      if (c.s.fbGiven && !receiveDone(c)) { defend(c, seg.tags); return; }
      if (c.step === "consent") { refuse(c); return; }
    },
    ask_example(c) {
      // "Like what?" is about the soup only until the chef has tasted it again ("What should I say?" to Mia is not)
      if (!c.s.fbGiven || c.s.againDone) return;
      if (!once(c, "example")) return;
      c.s.exampleDone = true; c.s.exAsked = true;
      C(c, "example_give");
    },
    no_questions(c) {
      if (c.step === "example") { exampleNo(c); return; }
      if (c.step === "receive" || (c.s.fbGiven && !receiveDone(c))) { receiveWell(c, "ok"); return; }
      if (c.step === "mia_try") { noFix(c); return; }
    },
    guess_lemon(c) {
      if (c.step === "again" || (c.s.exampleDone && receiveDone(c) && !c.s.againDone)) { tasteAgain(c, true); return; }
      if (c.s.fbGiven && !c.s.exampleDone) { guessed(c); return; }
    },
    again_ctx(c) { if (c.s.exampleDone && !c.s.againDone) tasteAgain(c, false); },
    second_ctx(c, _slots, seg) { secondAnswer(c, seg.tags.includes("keep") ? "keep" : "accept"); },
    ask_again(c) {
      if (!c.s.served) { if (once(c, "offer")) serveDish(c, true, []); return; }
      if (c.s.exampleDone && !c.s.againDone) { tasteAgain(c, false); return; }
      // asked before the example: the chef gives it first
      if (c.s.fbGiven && !c.s.exampleDone) { exampleNo(c, true); return; }
    },

    // --- the croutons ---
    accept_idea(c) {
      switch (c.step) {
        case "second": secondAnswer(c, "accept"); return;
        case "mia_back": twistThanks(c); return;
        case "receive": receiveWell(c, "thanks"); return;
        case "example": exampleNo(c); return;
      }
      if (c.s.againDone && !c.s.secondDone) { secondAnswer(c, "accept"); return; }
    },
    keep_own(c) {
      switch (c.step) {
        case "second": secondAnswer(c, "keep"); return;
        case "mia_back": twistFair(c); return;
        case "receive": defend(c, []); return;
      }
      if (c.s.againDone && !c.s.secondDone) { secondAnswer(c, "keep"); return; }
    },
    reject_rude(c) {
      switch (c.step) {
        case "second": secondAnswer(c, "rude"); return;
        case "mia_back": twistDefensive(c); return;
        case "receive": defend(c, []); return;
      }
      if (c.s.againDone && !c.s.secondDone) { secondAnswer(c, "rude"); return; }
    },

    // --- the favor ---
    help_yes(c) { if (c.step === "handoff") callMia(c, "yes"); else stepYes(c); },
    help_yes_ctx(c) { if (c.step === "handoff") callMia(c, "yes"); else stepYes(c); },
    help_unsure_ctx(c) {
      if (c.step !== "handoff" || c.s.handoffDone) return;
      if (once(c, "unsure")) C(c, "handoff_unsure");
      callMia(c, "yes");
    },
    help_why_ctx(c) { if (c.step === "handoff" && !c.s.handoffDone && once(c, "why")) C(c, "handoff_why"); },
    help_no(c) {
      if (c.step === "handoff") { helpNo(c); return; }
      if (c.step === "consent") { refuse(c); return; }
    },

    // --- Mia ---
    offer_feedback(c) {
      if (c.step === "handoff") { callMia(c, "yes"); return; }
      if (!c.s.handoffDone) return;
      if (!c.s.miaOpen) miaReady(c);
    },
    reassure(c) { reassure(c); },
    calm_down(c) {
      if (!inMia(c)) return;
      if (once(c, "calm")) M(c, "mia_calm_react");
      if (c.step === "mia_encourage") return; // "I am calm!": she still waits for a kind word
      reassure(c, true);
    },
    intro_mia_ctx(c) { if (once(c, "nice")) M(c, "mia_nice"); },
    nice_meet(c) { if (inMia(c) && once(c, "nice")) M(c, "mia_nice_too"); },
    praise_part(c, slots, seg) {
      const part = slots.good ?? (seg.tags.find((x) => x.startsWith("pt:"))?.slice(3));
      praise(c, part);
    },
    good_ctx(c, slots) { praise(c, slots.good); },
    praise_general(c) { praise(c, undefined); },
    praise_short_ctx(c) { praise(c, undefined); },
    blunt_bad(c) {
      if (!c.s.handoffDone) return;
      blunt(c);
    },
    problem_state(c) {
      if (!c.s.handoffDone) return;
      // before saying what worked: Mia flinches and asks if anything is good (the problem is remembered)
      if (!praiseDone(c)) {
        c.s.problemOpen = true;
        c.tip(TIPS.blunt_bad);
        if (!once(c, "problem")) return;
        c.s.miaOpen = true; c.s.miaQ = "ask_good";
        M(c, "mia_flinch");
        return;
      }
      if (tryDone(c)) { if (once(c, "problem")) M(c, "mia_fix_it"); return; }
      if (!once(c, "problem")) return;
      c.s.probCount = (c.s.probCount ?? 0) + 1;
      // a second problem without a fix: Mia works it out herself (counts, as in the spec)
      if (c.s.probCount >= 2 || c.s.problemOpen) { c.s.tried = true; c.s.fix = undefined; M(c, "mia_fix_it"); return; }
      c.s.probNow = true;
    },
    suggest_fix(c, slots, seg) { suggestion(c, slots.fix, seg.tags); },
    suggest_other(c, _slots, seg) { suggestion(c, undefined, seg.tags); },
    suggest_unknown(c, _slots, seg) { suggestion(c, undefined, seg.tags); },
    suggest_not(c, slots) {
      if (!inMia(c)) return;
      if (once(c, "suggest")) M(c, "mia_no_x", { X: slots.fix });
    },
    no_fix(c) {
      if (c.step === "example") { exampleNo(c); return; }
      if (c.step === "mia_try" || (praiseDone(c) && !tryDone(c))) { noFix(c); return; }
      if (c.step === "mia_worked") { praise(c, undefined); return; }
    },
    howmuch_ans(c, slots, seg) {
      if (c.step === "mia_howmuch" || (c.s.tried && c.s.howMuch && c.s.fix && !c.s.howMuchDone && !c.s.amountGiven)) {
        if (!once(c, "howmuch")) return;
        c.s.howMuchDone = true;
        M(c, seg.tags.includes("gradual") ? "mia_howmuch_react" : "mia_howmuch_ok");
        return;
      }
      // "A pinch of salt." while Mia waits for an idea: that's the idea
      if (slots.fix && praiseDone(c) && !tryDone(c)) { suggestion(c, slots.fix, [...seg.tags, "amt"]); return; }
    },
    encourage(c) {
      if (c.step === "mia_encourage" || (tryDone(c) && !encDone(c))) { encourage(c); return; }
      if (c.step === "mia_open" || (c.step === "mia_worked" && !c.s.miaOpen)) { reassure(c); return; }
      if (c.step === "mia_back") { twistThanks(c); return; }
    },
    rush(c) { if (c.step === "mia_encourage" || (tryDone(c) && !encDone(c))) rush(c, false); },

    // --- the goodbye (outside the closing question) ---
    yes_chef_ctx(c) { if (c.s.__finished) closeReply(c); else stepYes(c); },
    thanks_today(c) { if (c.s.__finished) closeReply(c); else kitchen.handlers.g_thanks(c, {}, { intent: "g_thanks", slots: {}, tags: [] }); },

    // --- global intents: the step decides what they mean here ---
    g_thanks(c) {
      switch (c.step) {
        case "receive": receiveWell(c, "thanks"); return;
        case "example": exampleNo(c); return;
        case "second": secondAnswer(c, "accept"); return;
        case "mia_back": twistThanks(c); return;
      }
      if (once(c, "welcome")) (inMia(c) ? M : C)(c, "g_welcome");
    },
    g_ok(c) {
      if (["consent", "receive", "example", "again", "second", "handoff", "mia_back"].includes(c.step ?? "")) stepYes(c);
    },
    g_hello(c) {
      if (inMia(c)) { if (!c.s.miaHi) { c.s.miaHi = true; M(c, "g_hello"); } return; }
      if (c.s.chefHi) return;
      c.s.chefHi = true; C(c, "g_hello");
      // "Hi!" at the start: the question "what's on the plate?" still stands
      if (c.step === "serve") c.hold();
    },
    // "I don't know" / "I'm not sure": the step's help, where its question would come (see the end of the file),
    // so an answer in the same breath wins ("I'm not sure. Maybe thyme?")
    g_dontknow(c) {
      const st = kitchen.steps.find((x) => x.id === c.step);
      if (st?.help && !st.done(c)) { DONT_KNOW.set(c, st.id); return; }
      c.say("g_take_time"); c.hold();
    },
    // walking away before the end
    g_bye(c) {
      if (c.s.__finished) { closeReply(c); return; }
      // everything the course needs is done (e.g. a goodbye during Mia's own feedback): the chef closes the afternoon
      if (coreDone(c)) { c.s.__finished = true; closing(c); closeReply(c); return; }
      C(c, "bye_early"); c.end(); c.hold();
    },
  },

  finish: (c) => { closing(c); },

  tests: [
    // the soup
    { say: "Chef, could you taste this?", intent: "offer_taste", step: "serve" },
    { say: "Here's my cold beet soup.", intent: "offer_taste", step: "serve" },
    { say: "It's ready, Chef.", intent: "offer_taste", step: "serve" },
    { say: "I'd love your feedback.", intent: "offer_taste", step: "serve" },
    { say: "Would you mind tasting it?", intent: "offer_taste", step: "serve" },
    { say: "What do you think, Chef?", intent: "offer_taste", step: "serve" },
    { say: "I made cold beet soup for the specials.", intent: "offer_taste", step: "serve" },
    { say: "It's a traditional Lithuanian soup.", intent: "offer_taste", step: "serve" },
    { say: "Here is my beetroot soup.", intent: "offer_taste", step: "serve" },
    { say: "Taste it.", intent: "offer_taste", step: "serve" },
    { say: "I'm a little nervous.", intent: "nervous", step: "serve" },
    // consent
    { say: "Sure, go ahead.", intent: "want_feedback", step: "consent" },
    { say: "Of course. Please be honest.", intent: "want_feedback", step: "consent" },
    { say: "Yes, I'd love some feedback.", intent: "want_feedback", step: "consent" },
    { say: "I can take it.", intent: "want_feedback", step: "consent" },
    { say: "Yes, give me some feedbacks.", intent: "want_feedback", step: "consent" },
    { say: "I don't need any feedback.", intent: "no_feedback", step: "consent", not: ["want_feedback"] },
    { say: "Maybe later.", intent: "no_feedback", step: "consent", not: ["want_feedback"] },
    // receiving
    { say: "Thanks, that's really helpful.", intent: "thanks_helpful", step: "receive" },
    { say: "I'll work on that.", intent: "will_work", step: "receive" },
    { say: "That makes sense.", intent: "thanks_helpful", step: "receive" },
    { say: "Thanks for the feedback.", intent: "thanks_helpful", step: "receive" },
    { say: "You're right, it's a bit flat.", intent: "thanks_helpful", step: "receive" },
    { say: "I appreciate your honesty.", intent: "thanks_helpful", step: "receive" },
    { say: "I see what you mean.", intent: "thanks_helpful", step: "receive" },
    { say: "Thank you for your remarks.", intent: "thanks_helpful", step: "receive" },
    { say: "Okay, I will add a little lemon.", intent: "will_work", step: "receive" },
    { say: "I'm going to fix it.", intent: "will_work", step: "receive" },
    { say: "That's not helpful.", intent: "defensive", step: "receive", not: ["thanks_helpful"] },
    { say: "I won't work on that.", intent: "defensive", step: "receive", not: ["will_work"] },
    { say: "But I always make it like this.", intent: "defensive", step: "receive", not: ["thanks_helpful"] },
    { say: "It's my grandmother's recipe.", intent: "defensive", step: "receive" },
    { say: "In Lithuania we make it like this.", intent: "defensive", step: "receive" },
    { say: "No, it's perfect like this.", intent: "defensive", step: "receive", not: ["thanks_helpful"] },
    { say: "It's not flat.", intent: "defensive", step: "receive", not: ["thanks_helpful"] },
    // the example
    { say: "Could you give me an example?", intent: "ask_example", step: "example" },
    { say: "What would you add?", intent: "ask_example", step: "example" },
    { say: "What do you mean by acid?", intent: "ask_example", step: "example", not: ["g_meaning"] },
    { say: "Like what?", intent: "ask_example", step: "example" },
    { say: "Maybe a little lemon?", intent: "guess_lemon", step: "example" },
    { say: "Should I add some vinegar?", intent: "guess_lemon", step: "example" },
    { say: "Could you give me an example?", intent: "ask_example", step: "receive" },
    // tasting again
    { say: "Could you taste it again?", intent: "ask_again", step: "again" },
    { say: "Is it better now?", intent: "ask_again", step: "again" },
    { say: "I added some lemon.", intent: "ask_again", step: "again" },
    { say: "Taste it again, Chef!", intent: "ask_again", step: "again" },
    // croutons
    { say: "I hadn't thought of it that way.", intent: "accept_idea", step: "second" },
    { say: "Good idea. I'll try that.", intent: "accept_idea", step: "second" },
    { say: "I'll try it both ways.", intent: "accept_idea", step: "second" },
    { say: "I see your point, but I'd like to keep it traditional.", intent: "keep_own", step: "second", not: ["accept_idea"] },
    { say: "In Lithuania we serve it with hot potatoes on the side.", intent: "keep_own", step: "second" },
    { say: "Thanks, but I'd rather keep it simple.", intent: "keep_own", step: "second", not: ["accept_idea"] },
    { say: "No croutons for me.", intent: "keep_own", step: "second", not: ["accept_idea"] },
    { say: "I don't want croutons.", intent: "keep_own", step: "second", not: ["accept_idea"] },
    { say: "Croutons are stupid.", intent: "reject_rude", step: "second" },
    { say: "That's a terrible idea.", intent: "reject_rude", step: "second", not: ["accept_idea"] },
    { say: "I don't like croutons.", intent: "reject_rude", step: "second", not: ["accept_idea"] },
    { say: "That's a brilliant idea!", intent: "accept_idea", step: "second" },
    // the favor
    { say: "Sure, I'd be happy to.", intent: "help_yes", step: "handoff" },
    { say: "Of course, Chef.", intent: "help_yes_ctx", step: "handoff" },
    { say: "Sure. Where is she?", intent: "help_yes", step: "handoff" },
    { say: "I'm too busy right now.", intent: "help_no", step: "handoff", not: ["help_yes"] },
    { say: "I don't want to.", intent: "help_no", step: "handoff", not: ["help_yes"] },
    { say: "I'd like to help, but I'm busy.", intent: "help_no", step: "handoff", not: ["help_yes"] },
    { say: "I don't know what to say.", intent: "help_unsure_ctx", step: "handoff" },
    { say: "Sure, but I'm not a chef.", intent: "help_unsure_ctx", step: "handoff" },
    { say: "I'll do my best.", intent: "help_unsure_ctx", step: "handoff" },
    { say: "Why me?", intent: "help_why_ctx", step: "handoff" },
    { say: "Can't you do it yourself?", intent: "help_why_ctx", step: "handoff", not: ["help_yes"] },
    // Mia
    { say: "Can I give you some feedback?", intent: "offer_feedback", step: "mia_open" },
    { say: "Can I give you a feedback?", intent: "offer_feedback", step: "mia_open" },
    { say: "Let me taste it.", intent: "offer_feedback", step: "mia_open" },
    { say: "Don't worry, I'm sure it's good.", intent: "reassure", step: "mia_open" },
    { say: "It smells great.", intent: "reassure", step: "mia_open" },
    { say: "Calm down.", intent: "calm_down", step: "mia_open" },
    { say: "What worked really well was the bacon.", intent: "praise_part", step: "mia_worked", slots: { good: "bacon" } },
    { say: "I really like the potatoes.", intent: "praise_part", step: "mia_worked", slots: { good: "potatoes" } },
    { say: "You nailed the texture.", intent: "praise_part", step: "mia_worked", slots: { good: "texture" } },
    { say: "The colour is lovely.", intent: "praise_part", step: "mia_worked", slots: { good: "color" } },
    { say: "The clams.", intent: "good_ctx", step: "mia_worked", slots: { good: "clams" } },
    { say: "It's really good, Mia.", intent: "praise_general", step: "mia_worked" },
    { say: "Great job, Mia.", intent: "praise_general", step: "mia_worked" },
    { say: "Not bad.", intent: "praise_general", step: "mia_worked", not: ["blunt_bad"] },
    { say: "Delicious!", intent: "praise_short_ctx", step: "mia_worked" },
    { say: "I don't like the bacon.", intent: "problem_state", step: "mia_worked", not: ["praise_part"] },
    { say: "It's terrible.", intent: "blunt_bad", step: "mia_worked", not: ["praise_general"] },
    { say: "It's not good.", intent: "blunt_bad", step: "mia_worked", not: ["praise_general"] },
    { say: "It's a bit too salty.", intent: "problem_state", step: "mia_worked" },
    { say: "One thing you could try is a little lemon.", intent: "suggest_fix", step: "mia_try", slots: { fix: "lemon" } },
    { say: "Have you thought about thyme?", intent: "suggest_fix", step: "mia_try", slots: { fix: "thyme" } },
    { say: "I'd suggest a little more black pepper.", intent: "suggest_fix", step: "mia_try", slots: { fix: "pepper" } },
    { say: "Maybe add some garlic.", intent: "suggest_fix", step: "mia_try", slots: { fix: "garlic" } },
    { say: "You must add salt.", intent: "suggest_fix", step: "mia_try", slots: { fix: "salt" } },
    { say: "Maybe some spring onions?", intent: "suggest_fix", step: "mia_try", slots: { fix: "scallions" } },
    { say: "It's a bit thin. Maybe cook it a little longer?", intent: "suggest_other", step: "mia_try" },
    { say: "Use less flour.", intent: "suggest_other", step: "mia_try" },
    { say: "One thing you could try is nutmeg.", intent: "suggest_unknown", step: "mia_try" },
    { say: "Don't add any lemon.", intent: "suggest_not", step: "mia_try", not: ["suggest_fix"] },
    { say: "You don't need salt.", intent: "suggest_not", step: "mia_try", not: ["suggest_fix"] },
    { say: "Nothing, it's perfect.", intent: "no_fix", step: "mia_try" },
    { say: "Nothing really.", intent: "no_fix", step: "mia_try" },
    { say: "Maybe you should throw it away.", intent: "blunt_bad", step: "mia_try", not: ["suggest_unknown"] },
    { say: "Just a pinch.", intent: "howmuch_ans", step: "mia_howmuch" },
    { say: "Start with a little, then taste it again.", intent: "howmuch_ans", step: "mia_howmuch" },
    { say: "A little at a time.", intent: "howmuch_ans", step: "mia_howmuch" },
    { say: "Two teaspoons.", intent: "howmuch_ans", step: "mia_howmuch" },
    { say: "You'll get there.", intent: "encourage", step: "mia_encourage" },
    { say: "Don't worry, it's your first week.", intent: "encourage", step: "mia_encourage" },
    { say: "I was slow at first too.", intent: "encourage", step: "mia_encourage" },
    { say: "You're doing great.", intent: "encourage", step: "mia_encourage" },
    { say: "You're not slow.", intent: "encourage", step: "mia_encourage", not: ["rush"] },
    { say: "Hurry up.", intent: "rush", step: "mia_encourage", not: ["encourage"] },
    { say: "Yes, you're too slow.", intent: "rush", step: "mia_encourage", not: ["encourage"] },
    // Mia's feedback (twist)
    { say: "Thanks, Mia. That's really helpful.", intent: "thanks_helpful", step: "mia_back" },
    { say: "Good point. I'll try it.", intent: "accept_idea", step: "mia_back" },
    { say: "I hadn't thought of that.", intent: "accept_idea", step: "mia_back" },
    // the goodbye
    { say: "Thanks for today, Chef.", intent: "thanks_today" },
    // more ways to say it (dev corpus: tests/corpus/p28-kitchen.json)
    { say: "Can you give me your feedback?", intent: "offer_taste", step: "serve" },
    { say: "I don't want you to taste it yet.", intent: "nervous", step: "serve", not: ["offer_taste"] },
    { say: "Of course, I want to hear it.", intent: "want_feedback", step: "consent" },
    { say: "Can we do it later?", intent: "no_feedback", step: "consent", not: ["want_feedback"] },
    { say: "You're right, it needs more acid.", intent: "thanks_helpful", step: "receive" },
    { say: "Okay, I try it now.", intent: "will_work", step: "receive" },
    { say: "Everybody in Lithuania loves it like this.", intent: "defensive", step: "receive" },
    { say: "I don't see what you mean.", intent: "ask_example", step: "receive", not: ["thanks_helpful"] },
    { say: "No, no questions.", intent: "no_questions", step: "example" },
    { say: "Better now?", intent: "ask_again", step: "again" },
    { say: "Can you taste one more time?", intent: "ask_again", step: "again", not: ["g_repeat"] },
    { say: "Why not, let's try.", intent: "accept_idea", step: "second" },
    { say: "I see your point, but I prefer it without croutons.", intent: "keep_own", step: "second", not: ["accept_idea", "thanks_helpful"] },
    { say: "Good point, but I like my soup like this.", intent: "keep_own", step: "second", not: ["thanks_helpful"] },
    { say: "That's not a good idea.", intent: "reject_rude", step: "second", not: ["accept_idea"] },
    { say: "No, I won't try it.", intent: "reject_rude", step: "second", not: ["accept_idea"] },
    { say: "I can't help.", intent: "help_no", step: "handoff", not: ["help_yes"] },
    { say: "No problem, Chef. Where is Mia?", intent: "help_yes", step: "handoff" },
    { say: "Hi Mia. I'm Tomas.", intent: "intro_mia_ctx", step: "mia_open" },
    { say: "Honestly, the bacon was the best part.", intent: "praise_part", step: "mia_worked", slots: { good: "bacon" } },
    { say: "This chowder is amazing.", intent: "praise_general", step: "mia_worked" },
    { say: "The potatoes aren't great.", intent: "problem_state", step: "mia_worked", not: ["praise_part"] },
    { say: "Not really good.", intent: "blunt_bad", step: "mia_worked", not: ["praise_short_ctx"] },
    { say: "It doesn't taste good.", intent: "blunt_bad", step: "mia_worked", not: ["praise_general"] },
    { say: "Some spring onions on top would be nice.", intent: "suggest_fix", step: "mia_try", slots: { fix: "scallions" } },
    { say: "Maybe double cream?", intent: "suggest_fix", step: "mia_try", slots: { fix: "cream" } },
    { say: "It doesn't need salt.", intent: "suggest_not", step: "mia_try", not: ["suggest_fix"] },
    { say: "No more pepper, please.", intent: "suggest_other", step: "mia_try", not: ["suggest_fix"] },
    { say: "You must add less salt.", intent: "suggest_other", step: "mia_try" },
    { say: "My suggestion is a little lemon.", intent: "suggest_fix", step: "mia_try", slots: { fix: "lemon" } },
    { say: "Everybody is slow at the beginning.", intent: "encourage", step: "mia_encourage" },
    { say: "You will not get there.", intent: "none", step: "mia_encourage" },
    { say: "I won't add pepper.", intent: "keep_own", step: "mia_back", not: ["will_work"] },
    { say: "Thank you for the lesson, Chef.", intent: "thanks_today" },
    // not understood
    { say: "purple bicycle elephant", intent: "none" },
    { say: "My car is blue and very fast", intent: "none" },
  ],

  sims: [
    // the song's way, start to finish (no "how much?" question, no twist)
    { name: "happy path: the song's phrases", turns: ["Hi, Chef! Here's my cold beet soup.", "Of course. Please be honest.", "Thanks, that's really helpful. I'll work on that.",
      "Could you give me an example?", "Could you taste it again?", "I hadn't thought of it that way. I'll try it both ways.", "Sure, I'd be happy to.",
      "Can I give you some feedback?", "What worked really well was the bacon.", "One thing you could try is a little thyme.",
      "Don't worry, it's your first week. You'll get there.", "Yes, Chef!"], expect: { complete: true, state: { offered: true, exAsked: true, secondAns: true } }, auto: AUTO, setup: PLAIN },
    // asking for the feedback right away (no consent question), questions, keeping the soup traditional, saying no to
    // the favor first, then a change of mind; Mia asks "how much?" (pinned on)
    { name: "questions and changes of mind", turns: ["Chef, could you taste this? I'd love your feedback.", "What do you mean by acid?", "Thanks, that makes sense.",
      "I added some lemon. Is it better now?", "I see your point, but I'd like to keep it traditional.", "I'm too busy right now.", "Okay, okay. Where is she?",
      "Don't worry, I'm sure it's good.", "Let me taste it.", "I really like the potatoes.", "Maybe add some garlic.", "Start with a little, then taste it again.",
      "You're doing great.", "Thanks for today, Chef."],
      expect: { complete: true, state: { fbAsked: true, secondHow: "keep", howMuchDone: true } }, auto: AUTO, setup: (s) => { s.howMuch = true; s.backTwist = false; } },
    // the twist on every seed: Mia gives the learner feedback, and the learner takes it well
    { name: "twist: Mia's feedback", turns: ["Here you go, Chef.", "Sure, go ahead.", "I'll work on that.", "Like what?", "Could you taste it again?", "Good idea. I'll try that.",
      "Of course, Chef.", "Can I give you some feedback?", "You nailed the clams.", "Have you thought about lemon?", "I was slow at first too.",
      "Thanks, Mia. That's really helpful.", "Heard, Chef!"], expect: { complete: true, state: { backDone: true } }, auto: AUTO,
      setup: (s) => { s.howMuch = false; s.backTwist = true; } },
    // too blunt with Mia and with the chef: tips, Mia flinches, then the learner finds the right words
    { name: "blunt first, then better", turns: ["Taste it.", "Yes.", "Thanks for the feedback.", "No questions.", "No.", "Okay.", "No.",
      "Yes, Chef.", "Hi Mia. I'm Tomas.", "Let me taste it.", "It's a bit too salty.", "The smell is amazing.", "You must add less salt.",
      "Hurry up.", "Don't worry. You'll get there.", "Thank you, bye!"], expect: { complete: true, state: { secondHow: "rude", problemOpen: true } }, auto: AUTO, setup: PLAIN },
    // defensive twice: the chef moves on, item 2 isn't ticked, the closing is the partial one (not done)
    { name: "defensive: not done", turns: ["It's ready, Chef.", "Sure.", "But I always make it like this.", "It's my grandmother's recipe.", "Could you give me an example?",
      "Is it better now?", "Croutons are stupid.", "Sure, I'd be happy to.", "Can I give you some feedback?", "It's really good, Mia.", "Maybe some thyme.",
      "You'll get there.", "Yes, Chef!"], expect: { complete: false, state: { defCount: 2, received: undefined } }, auto: AUTO, setup: PLAIN },
    // nervous, then "I don't know": the chef takes the bowl himself (item 1 not ticked); the rest done well
    { name: "the chef takes the bowl", turns: ["Hello, Chef.", "I'm a little nervous.", "I don't know.", "Okay, go ahead.", "That makes sense, thank you.",
      "What would you add?", "Is it better now?", "Good idea.", "Yes, Chef.", "Do you want some feedback?", "I love the onions.", "You could add a little parsley.",
      "You're doing great.", "Thanks!"], expect: { complete: true, state: { offered: undefined, served: true } }, auto: AUTO, setup: PLAIN },
    // hesitating: "Why me?", then a no taken back in the same breath (not counted); "I'm not sure" before an answer
    { name: "hesitating", turns: ["Here's my soup.", "Sure.", "Thanks, that's helpful.", "Like what?", "Is it better now?", "No, thanks.", "Why me?",
      "I'm busy, but okay, I'll do it.", "Can I taste it?", "I'm not sure. The bacon is nice.", "I'm not sure. Maybe thyme?", "You'll get there.", "Yes, Chef!"],
      expect: { complete: true, state: { helpNo: undefined, praised: true, tried: true } }, auto: AUTO, setup: PLAIN },
    // walking away in the middle: not done
    { name: "walking away", turns: ["Here's my soup.", "Sorry, I have to go."], expect: { complete: false }, auto: AUTO, setup: PLAIN },
    // "Not now" first (table nine), then yes; Mia asks "how much?" and gets "I don't know"; her own feedback is taken badly
    // (twist and question pinned on)
    { name: "not now, then yes; Mia's feedback taken badly", turns: ["Here's my cold beet soup.", "Not now, Chef.", "Okay. Go ahead.",
      "You're right, it's a bit flat. I'll work on that.", "No, no questions.", "No.", "Could you taste it again?", "Why not, let's try.", "Of course, Chef.",
      "Hi Mia. Can I taste it?", "Mmm, the clams are perfect.", "You might want to add a little white wine.", "I don't know.",
      "Keep going, you're learning fast.", "No, I don't need your feedback.", "Yes, Chef."],
      expect: { complete: true, state: { consentNo: 1, backHow: "defensive", howMuchDone: true } }, auto: AUTO, setup: (s) => { s.howMuch = true; s.backTwist = true; } },
    // everything the course needs is done when the learner says goodbye during Mia's own feedback: the chef closes the afternoon
    { name: "goodbye during the twist", turns: ["Here you go.", "Sure, go ahead.", "Thanks, that's really helpful.", "Like what?", "Taste it again, Chef!", "Good idea.",
      "Sure, I'd be happy to.", "Can I give you some feedback?", "I really like the seasoning.", "Maybe some garlic?", "You'll get there.", "Sorry, I have to go. Bye!"],
      expect: { complete: true, state: { backDone: undefined } }, auto: AUTO, setup: (s) => { s.howMuch = false; s.backTwist = true; } },
  ],
};

// ---------------------------------------------------------------------------
// Handler helpers (hoisted function declarations)

const TIPS = kitchen.tips as Record<string, Tip>;

/** The next step's question right away (a step that settled itself while asking). */
function askNext(c: Ctx) {
  const st = kitchen.steps.find((x) => (!x.when || x.when(c)) && !x.done(c));
  if (st) { c.ask(st.id); return; }
  if (!c.s.__finished) { c.s.__finished = true; closing(c); }
}

/** "Good point, but …": an acknowledgement before a contrast is no answer of its own. */
const contrast = (c: Ctx) => /\bbut\b/i.test(c.heard);

/** A bare "yes" (or "Okay", "Got it") for the step being asked. */
function stepYes(c: Ctx) {
  const st = kitchen.steps.find((x) => x.id === c.step);
  if (st?.yes && !st.done(c)) st.yes(c);
}

/** The chef takes the soup and tastes it. `offered`: the learner asked (item 1). */
function serveDish(c: Ctx, offered: boolean, tags: string[]) {
  if (c.s.served) return;
  c.s.served = true;
  if (offered) c.s.offered = true;
  if (tags.includes("fb")) c.s.fbAsked = true;
  C(c, "dish_react");
  c.event("taste", { by: "whitaker", dish: "beet_soup" });
}

/** "Not now": the first time the chef insists (table nine), the second time he keeps it short. */
function refuse(c: Ctx) {
  if (!once(c, "refuse")) return;
  c.s.consentNo = (c.s.consentNo ?? 0) + 1;
  if (c.s.consentNo === 1) { C(c, "consent_no"); C(c, "consent_again"); c.hold(); return; }
  C(c, "consent_no2"); c.s.consented = true;
}

/** The learner takes the feedback well (item 2). */
function receiveWell(c: Ctx, kind: "thanks" | "work" | "ok") {
  if (!once(c, "receive")) return;
  if (receiveDone(c)) return;
  c.s.received = true;
  C(c, kind === "work" ? "receive_react_work" : kind === "ok" ? "receive_ok" : "receive_react_thanks");
}

/** Defending the soup: the chef answers once (and the learner can try again); a second time he moves on. */
function defend(c: Ctx, tags: string[]) {
  if (!once(c, "defend")) return;
  if (receiveDone(c)) return;
  c.tip(TIPS.defensive);
  c.s.defCount = (c.s.defCount ?? 0) + 1;
  if (c.s.defCount === 1) {
    if (tags.includes("family")) c.s.familySaid = true;
    // (then "So? What do you think?" again; a "but I'll work on it" in the same breath still counts)
    C(c, tags.includes("lt") ? "defensive_lt" : tags.includes("family") ? "defensive_family" : "defensive_react");
    return;
  }
  C(c, tags.includes("family") && !c.s.familySaid ? "defensive_family" : "def_move_on");
}

/** "Makes sense?" – "Yes." / "No questions.": asked once more, then the chef gives the example himself (item 3 not ticked). */
function exampleNo(c: Ctx, now = false) {
  if (!once(c, "example") || c.s.exampleDone) return;
  c.s.exTries = (c.s.exTries ?? 0) + 1;
  if (c.s.exTries >= 2 || now) { c.s.exampleDone = true; C(c, "example_offer"); }
}

/** The learner guessed the example (lemon, vinegar …): item 3. */
function guessed(c: Ctx) {
  if (!once(c, "example") || c.s.exampleDone) return;
  c.s.exampleDone = true; c.s.exAsked = true;
  C(c, "example_confirm");
}

/** The chef tastes again. `auto`: he takes the spoon himself ("Here, let me taste it again"). */
function tasteAgain(c: Ctx, auto: boolean) {
  if (!once(c, "again")) return;
  if (c.s.againDone) return;
  c.s.againDone = true;
  if (auto) C(c, "again_auto");
  c.event("taste", { by: "whitaker", dish: "beet_soup" });
  C(c, "again_react");
}

/** The answer to the croutons (item 4; a rude one is ticked too, with a tip). */
function secondAnswer(c: Ctx, kind: "accept" | "keep" | "rude") {
  // "I see your point, but …": what comes after "but" is the answer
  if (kind === "accept" && contrast(c)) return;
  if (!once(c, "second")) return;
  if (c.s.secondDone) return;
  c.s.secondDone = true; c.s.secondAns = true; c.s.secondHow = kind;
  if (kind === "rude") c.tip(TIPS.polite_disagree);
  C(c, kind === "accept" ? "second_accept_react" : kind === "keep" ? "second_keep_react" : "second_rude_react");
}

/** The chef calls Mia over. */
function callMia(c: Ctx, how: "yes" | "anyway") {
  if (!once(c, "callMia") || c.s.handoffDone) return;
  c.s.handoffDone = true;
  NO_LATER.delete(c);
  C(c, how === "anyway" ? "handoff_anyway" : "handoff_yes");
  c.event("enter", { npc: "russo" });
}

/** "No" to the favor: the chef asks once more, then calls Mia anyway. A no with a "but" ("I'm busy, but okay,
 *  I'll do it") waits for the step's question at the end of the turn, so a yes after it wins. */
function helpNo(c: Ctx, now = false) {
  if (!once(c, "helpNo") || c.s.handoffDone) return;
  if (!now && contrast(c)) { NO_LATER.add(c); return; }
  helpNoSay(c);
}
function helpNoSay(c: Ctx) {
  c.s.helpNo = (c.s.helpNo ?? 0) + 1;
  if (c.s.helpNo === 1) { C(c, "handoff_no"); return; }
  callMia(c, "anyway");
}

/** Mia is ready to hear it. */
function miaReady(c: Ctx) {
  if (!once(c, "ready") || c.s.miaOpen) return;
  c.s.miaOpen = true;
  M(c, "mia_ready");
}

/** The learner tastes Mia's chowder (once). */
function tasteChowder(c: Ctx) {
  if (c.s.tasted) return;
  c.s.tasted = true;
  c.event("taste", { by: "player", dish: "clam_chowder" });
}

/** Calming Mia down: before the tasting it opens the moment (the second time); later it is encouragement. */
function reassure(c: Ctx, quiet = false) {
  if (c.step === "mia_encourage" || (tryDone(c) && !encDone(c))) { encourage(c); return; }
  if (c.step === "mia_back") { twistThanks(c); return; }
  if (c.step === "mia_worked" && !praiseDone(c)) { praise(c, undefined); return; }
  if (!c.s.handoffDone || c.s.miaOpen) return;
  if (!once(c, "reassure")) return;
  c.s.reassured = (c.s.reassured ?? 0) + 1;
  if (c.s.reassured === 1) { if (!quiet) M(c, "mia_reassured"); return; }
  c.s.miaOpen = true;
  M(c, "mia_ready");
}

/** What worked (item 5). `part`: the good_part praised, if any. */
function praise(c: Ctx, part: string | undefined) {
  if (!c.s.handoffDone) return;
  if (c.step === "mia_encourage" || (tryDone(c) && !encDone(c))) { encourage(c); return; }
  if (c.step === "mia_back") { twistThanks(c); return; }
  if (!once(c, "praise")) return;
  if (!c.s.miaOpen) { c.s.miaOpen = true; tasteChowder(c); }
  if (c.s.praised) return;
  c.s.praised = true;
  if (part) { c.s.good = part; M(c, "mia_relief", { X: part }); } else M(c, "mia_relief_general");
}

/** Too blunt: Mia flinches (and, before any praise, asks if anything is good). */
function blunt(c: Ctx) {
  c.tip(TIPS.blunt_bad);
  if (!once(c, "blunt")) return;
  M(c, "mia_flinch");
  if (!praiseDone(c)) { c.s.miaOpen = true; c.s.miaQ = "ask_good"; return; }
  c.s.flinch = true;
}

/** One thing to try (item 6). `fix`: the ingredient, if any. */
function suggestion(c: Ctx, fix: string | undefined, tags: string[]) {
  if (!c.s.handoffDone) return;
  if (c.step === "mia_howmuch" && !c.s.howMuchDone) { if (!once(c, "howmuch")) return; c.s.howMuchDone = true; M(c, "mia_howmuch_ok"); return; }
  if (!once(c, "suggest")) return;
  if (tryDone(c)) return;
  c.s.tried = true;
  c.s.fix = fix;
  if (tags.includes("amt")) c.s.amountGiven = true;
  if (!c.s.miaOpen) { c.s.miaOpen = true; tasteChowder(c); }
  const e = ingredient(fix);
  if (tags.includes("must")) M(c, "mia_must_react");
  else if (e?.attrs?.odd) M(c, "mia_try_odd");
  else if (e && !e.attrs?.count && !(c.s.howMuch && !c.s.amountGiven) && c.chance(0.5)) M(c, "mia_try_x", { X: e.id });
  else M(c, "mia_try_ok");
  // the suggestion came before any praise: Mia still wants to know what was good (the step asks it)
  if (!praiseDone(c)) c.s.miaQ = "ask_good";
}

/** "Nothing, it's perfect": Mia doesn't believe it; the second time she gives up asking (item 6 not ticked). */
function noFix(c: Ctx) {
  if (!once(c, "nofix")) return;
  c.s.noFix = (c.s.noFix ?? 0) + 1;
  if (c.s.noFix >= 2) { tryGiveUp(c); return; }
  c.s.noFixNow = true;
}
function tryGiveUp(c: Ctx) { c.s.trySkip = true; M(c, "mia_try_giveup"); }

function howMuchUnsure(c: Ctx) {
  if (!once(c, "howmuch") || c.s.howMuchDone) return;
  c.s.howMuchDone = true;
  M(c, "mia_howmuch_unsure");
}

/** Encouraging Mia (item 7): she thanks the learner, the chef approves. */
function encourage(c: Ctx) {
  if (!once(c, "encourage")) return;
  if (encDone(c)) return;
  c.s.encouraged = true;
  M(c, "mia_encouraged");
  C(c, "chef_end_good");
}

/** "Hurry up." / "Yes, you're slow.": not what she needs (a tip). `bare`: a plain "yes" or "that's true". */
function rush(c: Ctx, bare: boolean) {
  if (bare) c.tip(TIPS.rush);
  if (!once(c, "rush") || encDone(c)) return;
  M(c, "mia_rush_react");
}

/** The twist: Mia's feedback received well, kept politely, or rejected. */
function twistThanks(c: Ctx, force = false) {
  if (!force && contrast(c)) return;
  if (!once(c, "twist") || c.s.backDone) return;
  c.s.backDone = true; c.s.backHow = "thanks";
  M(c, "mia_twist_thanks");
  C(c, "chef_twist_laugh");
}
function twistFair(c: Ctx) {
  if (!once(c, "twist") || c.s.backDone) return;
  c.s.backDone = true; c.s.backHow = "keep";
  M(c, "mia_twist_fair");
}
function twistDefensive(c: Ctx) {
  c.tip(TIPS.defensive);
  if (!once(c, "twist") || c.s.backDone) return;
  c.s.backDone = true; c.s.backHow = "defensive";
  M(c, "mia_twist_defensive");
}

/** The chef closes (success: the course report is done) and waits for the learner's goodbye. */
function closing(c: Ctx) {
  if (coreDone(c)) {
    C(c, "closing_chef");
    c.s.goalMet = true;
    c.complete();
    c.remember({ pierChef: true });
  } else C(c, "closing_partial");
  const close = (cc: Ctx) => { closeReply(cc); };
  const on: Record<string, (cc: Ctx, slots: any, seg: Segment) => boolean | void> = {};
  for (const k of [...Object.keys(kitchen.intents).filter((x) => !x.endsWith("_ctx")), "yes_chef_ctx", "g_thanks", "g_bye", "g_ok", "g_hello", "g_sorry"]) on[k] = close;
  c.expect({ id: "closing", expects: ["yes_chef_ctx", "thanks_today"], hints: ["closing"],
    suggest: [{ lt: "Atsisveikinti su šefu", hint: "closing" }], on, yes: close, no: close });
}

/** The chef's last word (and Mia's thanks after a good afternoon); the conversation ends. */
function closeReply(c: Ctx) {
  if (!once(c, "close")) return;
  C(c, "closing_reply");
  if (c.s.goalMet) M(c, "mia_bye");
  c.end();
}

// A step's question after an "I don't know" that nothing else answered: its help instead.
for (const st of kitchen.steps) {
  const ask = st.ask;
  st.ask = (c) => {
    if (st.help && DONT_KNOW.get(c) === st.id) { DONT_KNOW.delete(c); st.help(c); return; }
    ask(c);
  };
}

export default kitchen;
