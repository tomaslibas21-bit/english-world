// Song 82 "Sorry About the Noise": meeting the neighbor, Rita (informal: tu).
// First visit: the learner has just moved in next door and knocks on Rita's door:
// introductions, a little small talk (where are you from, how do you like it so far),
// questions about the building (trash and recycling, laundry, mailboxes, parking), and
// a favor (water my plants / take in a package / borrow a ladder) or an apology for the
// noise. Rita may invite the learner for coffee on Sunday.
// Returning players already know Rita: "Hey, neighbor!" Twists: Rita complains about the
// music first; the delivery guy left a package for the learner with Rita.
//
// The learner's own gender: {m:…|f:…}; Rita's own gender: {sm:…|sf:…} (she is female).

import type { Ctx, EntityDef, SituationDef } from "../types";
import { ent, t } from "../dsl";
import { expectHowAreYou } from "../global";

// ---------------------------------------------------------------------------
// Flags used more than once

const F_DO_Q = "Question “Do” = the particle ar.";
const F_WOULD_Q = "“Would” in a yes/no question = the particle ar; the conditional sits on the verb (linked to “like”).";
const F_WH_DO = "Question “do” has no Lithuanian word; the tense sits on the verb.";
const F_THERE = "Existential “there” has no Lithuanian word; yra (under “Is”) carries it.";
const F_PROG = "Progressive “are” has no separate Lithuanian word; the present tense of the verb carries it.";
const F_DOWN = "“down” (turn … down): the prefix pa- of patildyti carries it.";
const F_OUT = "“out” (put … out): the prefix iš- of the verb carries it.";

// ---------------------------------------------------------------------------
// Entities

/** Things the learner may want to borrow. has: Rita has it; mass: "some sugar". */
const THINGS: EntityDef[] = [
  ent("ladder", "ladder", "kopėčios/kopėčių/kopėčioms/kopėčias/kopėčiomis/kopėčiose", "f", { forms: ["step ladder", "stepladder"], chip: "kopėčios", attrs: { has: true } }),
  ent("drill", "drill", "gręžtuvas/gręžtuvo/gręžtuvui/gręžtuvą/gręžtuvu/gręžtuve", "m", { forms: ["power drill", "electric drill"], chip: "gręžtuvas", attrs: { has: false } }),
  ent("hammer", "hammer", "plaktukas/plaktuko/plaktukui/plaktuką/plaktuku/plaktuke", "m", { chip: "plaktukas", attrs: { has: true } }),
  ent("screwdriver", "screwdriver", "atsuktuvas/atsuktuvo/atsuktuvui/atsuktuvą/atsuktuvu/atsuktuve", "m", { forms: ["screw driver"], chip: "atsuktuvas", attrs: { has: true } }),
  ent("vacuum", "vacuum", "dulkių siurblys/dulkių siurblio/dulkių siurbliui/dulkių siurblį/dulkių siurbliu/dulkių siurblyje", "m",
    { forms: ["vacuum cleaner", "hoover"], chip: "dulkių siurblys", attrs: { has: true } }),
  ent("corkscrew", "corkscrew", "kamščiatraukis/kamščiatraukio/kamščiatraukiui/kamščiatraukį/kamščiatraukiu/kamščiatraukyje", "m",
    { forms: ["bottle opener", "wine opener"], chip: "kamščiatraukis", attrs: { has: true } }),
  ent("umbrella", "umbrella", "skėtis/skėčio/skėčiui/skėtį/skėčiu/skėtyje", "m", { chip: "skėtis", attrs: { has: true } }),
  ent("flashlight", "flashlight", "žibintuvėlis/žibintuvėlio/žibintuvėliui/žibintuvėlį/žibintuvėliu/žibintuvėlyje", "m", { forms: ["torch", "flash light"], chip: "žibintuvėlis", attrs: { has: true } }),
  ent("sugar", "sugar", "cukrus/cukraus/cukrui/cukrų/cukrumi/cukruje", "m", { art: "some", forms: ["a cup of sugar", "some sugar"], chip: "cukrus", attrs: { has: true, mass: true } }),
  ent("milk", "milk", "pienas/pieno/pienui/pieną/pienu/piene", "m", { art: "some", forms: ["some milk"], chip: "pienas", attrs: { has: true, mass: true } }),
];

const COUNTRIES: EntityDef[] = [
  ent("lithuania", "Lithuania", "Lietuva/Lietuvos/Lietuvai/Lietuvą/Lietuva/Lietuvoje", "f", { forms: ["lithuanian", "vilnius", "kaunas", "klaipeda"], attrs: { lt: true } }),
  ent("latvia", "Latvia", "Latvija/Latvijos/Latvijai/Latviją/Latvija/Latvijoje", "f"),
  ent("poland", "Poland", "Lenkija/Lenkijos/Lenkijai/Lenkiją/Lenkija/Lenkijoje", "f"),
  ent("ukraine", "Ukraine", "Ukraina/Ukrainos/Ukrainai/Ukrainą/Ukraina/Ukrainoje", "f", { forms: ["the ukraine"] }),
  ent("germany", "Germany", "Vokietija/Vokietijos/Vokietijai/Vokietiją/Vokietija/Vokietijoje", "f"),
  ent("ireland", "Ireland", "Airija/Airijos/Airijai/Airiją/Airija/Airijoje", "f"),
  ent("england", "England", "Anglija/Anglijos/Anglijai/Angliją/Anglija/Anglijoje", "f", { forms: ["the uk", "britain", "great britain", "the united kingdom", "london", "scotland"] }),
  ent("norway", "Norway", "Norvegija/Norvegijos/Norvegijai/Norvegiją/Norvegija/Norvegijoje", "f"),
  ent("spain", "Spain", "Ispanija/Ispanijos/Ispanijai/Ispaniją/Ispanija/Ispanijoje", "f"),
  ent("canada", "Canada", "Kanada/Kanados/Kanadai/Kanadą/Kanada/Kanadoje", "f"),
];

// ---------------------------------------------------------------------------
// State helpers

const known = (c: Ctx) => !!c.s.known;
/** A later visit without a twist: Rita just says hello. */
const knownPlain = (c: Ctx) => known(c) && !c.s.complaint && !c.s.pkgTwist;

// One reaction per learner turn: "It wasn't me! I wasn't home." gives two segments but one reply.
// The dialogue creates a fresh context object for every learner turn.
const SAID = new WeakMap<Ctx, Set<string>>();
function once(c: Ctx, key: string): boolean {
  let set = SAID.get(c);
  if (!set) { set = new Set(); SAID.set(c, set); }
  if (set.has(key)) return false;
  set.add(key);
  return true;
}
/** Say a reaction line at most once per learner turn. */
const react = (c: Ctx, line: string, vars?: Record<string, any>) => { if (once(c, line)) c.say(line, vars); };
/** "I'm busy on Sunday. How about Saturday?": the refusal comes with another day, so it's no refusal. */
const PROPOSES_DAY = /\b(how about|what about|maybe|can we do|could we do)\b.*\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next week|weekend)\b/i;
const thingById = (id: string) => THINGS.find((e) => e.id === id)!;

/** The learner asked a favor, apologized for the noise or asked Rita to be quieter.
 *  Together with the introduction (or on a later visit) this reaches the goal. */
function goal(c: Ctx, kind: string) {
  if (!c.s.goal) c.s.goal = kind;
  c.s.chatted = true;
  maybeComplete(c);
}
function maybeComplete(c: Ctx) {
  // Rita complained about the music: that needs an answer first (a favor alone doesn't settle it)
  if (c.s.complaint && !c.s.complaintDone && c.s.goal !== "apology") return;
  if (c.s.goal && (known(c) || (c.s.introduced && c.s.trashTold))) c.complete();
}

const AUTO: Record<string, string> = {
  intro: "Hi, I'm Tomas. I just moved in next door.", from_q: "I'm from Lithuania.", like_q: "I love it!",
  trash_q: "Where does the trash go?", needs: "Could you water my plants next week?", away_when: "Next Friday.", coffee: "I'd love to!", coffee_time: "Yes, two is perfect.",
  complaint: "Oh, I'm so sorry! It won't happen again.", howareyou: "Good, thanks. And you?",
};
/** Sims of the first meeting: Rita doesn't know the learner yet (no later-visit twist). */
const FIRST_VISIT = (s: Record<string, any>) => { s.known = false; s.complaint = false; s.pkgTwist = false; };

// ---------------------------------------------------------------------------

export const neighbor: SituationDef = {
  id: "s82-neighbor",
  song: 82,
  songTitle: "Sorry About the Noise",
  title: { en: "Sorry About the Noise", lt: "Atsiprašau dėl triukšmo" },
  topic: { en: "Meeting the neighbors", lt: "Nauji kaimynai" },
  chapter: 3,
  order: 2,
  location: "apartments",
  npc: "rita",
  goal: "Susipažink su kaimyne ir paprašyk jos paslaugos (arba atsiprašyk dėl triukšmo).",
  intro: "Maple gatvės daugiabutis, antras aukštas. Ką tik atsikraustei – už gretimų durų gyvena Rita.",
  entities: { thing: THINGS, country: COUNTRIES },

  grammar: {
    macros: {
      apt: "(apartment | place | flat #tip:uk_flat)",
      away: [
        "while i am (away | gone | on vacation | in lithuania | out of town)", "when i am (away | gone | on vacation)",
        "next (week | weekend | month)", "this weekend", "[on | next] {day}", "tomorrow", "from {day} (to | until) {day}",
        "for (a | one | two | three) (week | weeks)", "for (a few | a couple of | ten | {number}) days", "for the weekend", "on {date}", "(on | over) the weekend", "next (week | month) [from {day}]",
      ],
      pkg: "(package | packages | parcel #tip:uk_parcel | parcels #tip:uk_parcel | delivery)",
      trash: "(trash | garbage | rubbish #tip:uk_rubbish)",
      music: "(the music | your music | the tv | your tv | it)",
      // "It's a small country in Europe."
      country_desc: "[it is | that is] [a] [small | little | nice | beautiful] (country [in (europe | the baltics | northern europe)] | in (europe | the baltics | northern europe) | near (poland | latvia) | by the baltic sea)",
      like_core: "(i [really] (love | like) it [here] [very much | a lot | so much] [so far] | it is (great | nice | lovely | good | fine | wonderful | really nice | very nice | okay | ok | all right) [here] [so far] | (really | very) (nice | good | great) | not bad [so far | at all] | it is a (nice | great | lovely | beautiful | quiet) (building | place | apartment | neighborhood))",
      when_past: "(yesterday | today | last week | this week | last month | on {day} | a few days ago | two days ago)",
      like_desc: "((the | my) (apartment | building | place | neighborhood | view | kitchen | street) is | the neighbors (are | seem)) [very | really | so | quite] (bright | nice | quiet | beautiful | cozy | big | great | clean | lovely | comfortable | friendly | kind)",
      boxes_np: "(lots of | a lot of | so many | too many) boxes [to unpack | everywhere]",
      thanks_inv: "(thank you | thanks) [so much | a lot] [for (the | your) (invitation | invite | offer)]",
      away_pre: "(i am (going away | leaving | traveling | going on vacation | going to {country} | away) | i (go | will go) (away | to {country} | on vacation)) [@away] [@away]",
      // Rita's coffee invitation declined
      deny_more: "(i | we) (was | were) (not (home | there | at home) | (at work | out | away | asleep | sleeping)) [last night]",
      coffee_no_core: "(i am busy [on sunday | this sunday | that day] | i (can not | can not make it) [on sunday] | i have plans [on sunday] | i (work | am working) (on sunday | on sundays | this sunday) | i am going (to {country} | away) [this weekend | on sunday] | i will be away [this weekend | on sunday])",
    },
    slots: {},
  },

  intents: {
    // --- introductions -------------------------------------------------------------
    moved_in: { patterns: [
      "i [just | recently] moved in [next door | across the hall | upstairs | downstairs] #h:moved_in",
      "i am (your | the) new neighbor #h:new_neighbor", "i am new [here | in the building]", "i live next door [now]",
      "(i | we) [just] moved here [from {country}] [@when_past]", "(i | we) moved in (last week | yesterday | on {day} | this week)",
      "we [just] moved in [next door] [@when_past]", "i am in the @apt next door", "i am your [new] neighbor from next door",
      "[yes] i am the new (neighbor | guy | girl | tenant)", "[yes] i am your [new] neighbor now", "(we are | we are your) [the] new neighbors",
      "[yes] i [now] live (next door | next to you | in the @apt next (door | to you | to yours) | here now)", "i [just] arrived [here] [yesterday | today | this week] [i live next to you]",
      "i am living (here | next door | next to you) [now] [(from | since) ({day} | yesterday | last week)]", "[yes] i came [here] (yesterday | today | last week | this week | on {day})",
      "i am [your] [new] neighbor from (apartment | flat #tip:uk_flat) [number] {number}", "i am the new one", "[yes] it is my first (week | day | month) [here | in the building]", "i [just] moved (into | to | in) the @apt next door",
    ] },
    my_name: { patterns: ["my name is {name} #h:my_name", "[yes] that is (me | right) my name is {name}"] },
    im_name_ctx: { patterns: ["i am {name} #h:im_name", "it is {name}", "i am {name} [from next door | from the @apt next door | (your | the) new neighbor]", "[yes] that is (me | right) i am {name}", "[you can] call me {name}"] },
    bare_name_ctx: { patterns: ["{name}"] },
    vocative: { patterns: ["rita"] },

    // --- small talk --------------------------------------------------------------------
    from_ans: { patterns: ["i am [originally] from {country} #h:from_country", "i come from {country}", "i am {country} #h:lithuanian",
      "(i am | we are) [originally] from {country} [@country_desc | [(it is | that is)] in {c2:country}] [do you know (it | where it is)]", "i (come | am) from a [small | little | big] (town | city | village) (in | near) {country}",
      "(i was | we were) born in {country}", "we (are | come) from {country}"] },
    from_ans_ctx: { patterns: ["[originally] from {country} [@country_desc]", "{country} [@country_desc]"] },
    from_other_ctx: { patterns: ["[i am] [originally] from {w:any}", "i come from {w:any}"] },
    like_ans_ctx: { patterns: [
      "i [really] (love | like) it [here] [so far] #h:love_it", "@like_core [@like_desc]", "@like_desc", "everything is (new | different | strange) [for me] [but i (like | love) it]", "i am [very | really | so] (happy | glad) [here | to be here]", "everything is (fine | good | great | okay | perfect)", "it is (great | nice | lovely | good | fine | wonderful | really nice | very nice) [so far]",
      "so far so good #h:so_far", "(great | good | nice | fine) [so far]", "i (love | like) the (building | neighborhood | apartment)",
    ] },
    boxes: { patterns: [
      "[it is] (great | nice | good | fine) but i [still] have (lots of | a lot of | so many) boxes [to unpack] #h:boxes",
      "i [still] have (lots of | a lot of | so many) boxes [to unpack]", "[there are] (lots of | a lot of | so many) boxes",
      "i have not unpacked [everything | my boxes] [yet]", "[@like_core] [but] i am still unpacking", "[(it is | it is | everything is) (great | good | nice | fine)] [but] i am [so | very | really | a bit] tired", "(great | good | nice | fine) but i am [so | very | really | a bit] tired", "[it is] [a bit | a little | very] (chaotic | messy | crazy | busy) [@boxes_np]",
    ] },

    // --- questions about the building ---------------------------------------------------
    ask_trash: { patterns: [
      "where (does | do) the @trash go #h:q_trash", "where do i put (the | my) @trash", "where (are | is) the (trash cans | garbage cans | trash can | dumpster)",
      "where do the bins go #tip:uk_bins", "where are the bins #tip:uk_bins", "where do i throw (out | away) (the | my) @trash",
      "what do i do with (the | my) @trash", "where (do | can | should) (i | we | you) (throw | put | take | leave) [out | away] [the | my | your | our] @trash",
      "where is the @trash [room | area | can | bin]", "where i (can | should) (throw | put) [out | away] [the | my] @trash",
      "what (do i do | to do | should i do) with [the | my] @trash", "do you know where the @trash (goes | go)",
    ] },
    ask_recycling: { patterns: [
      "where (does | do) the recycling go #h:q_recycling", "where do i put [the] (bottles | paper | cans | plastic | glass) [and [the] (bottles | paper | cans | plastic | glass)]", "how do (you | i | we | people) sort (the | your)? (@trash | recycling) [here]", "is there a (place | bin | container) for (recycling | bottles | paper | plastic | glass)", "(what about | and) [the] recycling", "what goes in the (blue | recycling) (bin | bins)",
      "how does recycling work [here]", "do you recycle [here]", "where do i put (the | my) recycling", "is there recycling",
    ] },
    ask_trash_day: { patterns: [
      "when is (trash | garbage | recycling) (day | pickup | collection) #h:q_trash_day", "what day is (trash | garbage) (day | pickup)",
      "when do they (pick up | take | collect) the (@trash | recycling)", "(what | which) day do they (take | pick up | collect) the (@trash | recycling)",
      "(what | which) day is (trash | garbage | recycling) [day | pickup]", "when do they take out the (@trash | recycling)", "when is the @trash (picked up | collected)", "when do they take the bins #tip:uk_bins",
    ] },
    ask_boxes: { patterns: [
      "(what do i do with | where do i put | where can i put) [the | my | all the] (boxes | cardboard | moving boxes | empty boxes)",
    ] },
    ask_laundry: { patterns: [
      "where is the laundry room #h:q_laundry", "where is the laundry", "is there a laundry room", "is there a (washing machine | washer | laundry room | laundromat) [in the building | here | nearby | near here | close by]", "where (do | can) (you | i | we | people) do [the | my] laundry", "where can i (do | wash) [my] laundry",
      "where are the (washers | washing machines) [and dryers]", "where can i wash my clothes",
    ] },
    ask_mail: { patterns: [
      "where (is | are) the (mailbox | mailboxes) #h:q_mail", "where do i get my mail", "where do i get my post #tip:uk_post", "where (do | can) i (pick up | find | check | get) my mail", "where is the mail", "when does the mail come",
      "where do (they | the delivery guys) leave [the] @pkg", "where do @pkg go", "where is my mailbox",
    ] },
    ask_parking: { patterns: ["where can i park [my car]", "is there parking [here]", "where do you park [your car]", "where do (people | we) park [here]", "is there a parking (lot | garage | space)"] },
    ask_internet: { patterns: [
      "what internet (do you use | do you have)", "who is your internet provider", "is the internet (good | fast) [here]",
      "which internet (company | provider) is good", "what wi fi do you use", "(what | which) internet (provider | company) do you (use | have)", "is the (internet | wi fi | wifi) (good | fast | okay) [here]", "do you know a good internet (company | provider)",
    ] },
    ask_quiet: { patterns: [
      "is it a quiet building", "is it (quiet | noisy | loud) [here] [at night]", "are the neighbors (nice | quiet | noisy | friendly | okay | ok | good)", "how are the neighbors",
      "are the walls thin",
    ] },
    ask_landlord: { patterns: ["what is (the landlord | mister patel) like", "is (mister patel | the landlord) nice", "do you know mister patel", "is (mister patel | the landlord) a (good | nice) (landlord | guy | man | person)"] },
    ask_store: { patterns: [
      "is there a (grocery store | supermarket | store | shop) (nearby | near here | close by | around here) #h:q_store",
      "where is the [nearest] (grocery store | supermarket | shop | store)", "where can i buy (groceries | food)",
    ] },
    ask_unknown: { patterns: ["(is there | do you know | where is | where are) [a | an | the] {w:any}"] },
    no_more: { patterns: [
      "(that is | i think that is) (all | it | everything) [for now]", "[no] nothing [else] [for now]", "[no] i am (good | fine | okay) [for now]",
      "i think i am (good | fine | okay)", "[no] i do not need anything [right now]", "[no] i do not have any [more] questions",
      "[no] i just wanted to (say hello | say hi | introduce myself) [and introduce myself]",
    ] },

    // --- favors ----------------------------------------------------------------------------
    ask_favor: { patterns: [
      "(can | could | may) i ask you a favor #h:ask_favor", "(could | can | would) you do me a favor", "i have a [small | big] favor to ask [you]",
      "(can | could) you help me [with something]", "i need a [small] favor", "i need your help", "(can | could | may) i ask you something", "i have a [small | quick] question",
    ] },
    water_plants: { patterns: [
      "(could | can | would) you water my plants [@away] [@away] #h:water_plants", "(could | can | would) you water my flowers [@away] [@away]",
      "(could | can) you (take care of | look after | feed) my (plants | flowers | cat | dog | fish) [@away] [@away]", "@away_pre (could | can | would) you water my (plants | flowers) [@away]",
      "(could | can) you (watch | keep an eye on) my @apt [@away] [@away]", "would you mind watering my plants [@away] [@away]",
      "(could | can) you (take care of | look after) my plants [@away] [@away]", "(could | can | would) you feed my (cat | fish | dog) [@away] [@away]",
      "(could | can) you (get | collect | pick up | check) my mail [@away] [@away]", "(could | can) you keep an eye on my @apt [@away] [@away]",
    ] },
    take_package: { patterns: [
      "(could | can | would) you take in a @pkg [for me] [@away | on {day} | tomorrow] #h:package",
      "would you mind taking in a @pkg [for me] [@away | on {day} | tomorrow]",
      "(could | can) you (get | take | pick up | sign for | take in) my @pkg [@away | on {day} | tomorrow]",
      "i am (expecting | waiting for) a @pkg [@away | on {day} | tomorrow] [(can | could) you (take | get | keep) it [for me]]", "(could | can) you (receive | accept) (a | my) @pkg [for me] [@away | on {day} | tomorrow]", "if (a | my) @pkg (comes | arrives) [@away | on {day} | tomorrow] [(can | could) you (take | get | keep) it [for me]]", "(could | can) you (keep | hold) (it | my @pkg) for me",
    ] },
    borrow: { patterns: [
      "(could | can | may) i borrow [your | a | an | some] {thing} #h:borrow", "(could | can) you lend me [your | a | an | some] {thing}",
      "do you have [a | an | any | some] {thing} [i could borrow] #h:have_one", "i need [a | an | some] {thing} #blunt",
      "(could | can) i use your {thing}", "would you have [a | an | some] {thing} [i could borrow]",
      "i need [a | an | some] {thing} [do you have one | (can | could) i borrow (it | yours | one)] #blunt", "(can | could | may) i have [a | an | some] {thing}",
      "i need to borrow [a | an | your | some] {thing}", "do you have [a | an | some] {thing} for me",
      "(could | can | may) i borrow [your | a | an | some] {thing} (for (an hour | one hour | a minute | a day | a few minutes | the weekend | a few days) | until (tomorrow | tonight | {day}))",
    ] },
    borrow_unknown: { patterns: ["(could | can | may) i borrow [your | a | an | some] {w:any}", "do you have [a | an] {w:any} i could borrow"] },
    away_when_ctx: { patterns: [
      "on {day} #h:on_saturday", "this weekend #h:this_weekend", "@away", "(i am | i will be) (leaving | away | gone) [@away]",
      "(i leave | i am leaving) [on] ({day} | next week | tomorrow | this weekend) #h:away_when", "in (two | three | a few | {number}) days", "in (one | a) week", "i am going to {country} [@away]",
      "(for | about) (a | one | two | three) (week | weeks) [from {day}]",
      "next {day}", "(for | about) (a | one | two) (week | weeks)",
    ] },

    // --- noise -----------------------------------------------------------------------------
    noise_sorry: { patterns: [
      "[i am] [so | really | very] sorry about the noise [last night | yesterday] #h:sorry_noise", "sorry (for | about) (the noise | last night) [last night | yesterday] #h:sorry_noise",
      "sorry if (we were | it was | i was) (too loud | a bit loud | loud | noisy) [last night]", "i hope we were not too (loud | noisy) [last night]",
      "sorry we were so (loud | noisy) [last night]", "i am sorry about (the noise | last night | the music)",
      "[i am] sorry (we | i) (were | was) [very | so | too | really | a bit] (loud | noisy) [last night | yesterday]", "[sorry] was (the | my | our) music too loud [last night]",
      "(my apologies | i apologize) [for (the noise | last night | the music)]", "sorry (for | about) (yesterday | the party) [the (party | music) was (loud | too loud)]",
      "was it (too | very | really | so) loud [last night]", "i hope (we | the music | it) (were | was) not too (loud | noisy) [last night]",
    ] },
    noise_reason: { patterns: [
      "i had (some | a few) friends over [last night] #h:friends_over", "(i | we) had [a | some] (guests | visitors | people over | friends over | birthday party | party) [last night]", "we were celebrating [my birthday | something]",
      "it was (my | a) (birthday | birthday party | party) [for my birthday]", "it was (the | my) (tv | television | movie | radio)", "we had a [little | small] party [last night] #h:little_party",
      "it was my birthday [yesterday]", "we were moving (furniture | boxes | things) [last night]", "i was moving furniture [last night]",
    ] },
    noise_promise: { patterns: [
      "it will not happen again #h:wont_happen", "i will keep it down [from now on]", "we will be quieter [next time | from now on] #h:quieter",
      "i will turn it down [right now | now]", "i will be more careful [next time]", "i will be (quieter | more quiet) [next time | from now on]",
      "i will (use | wear) headphones [from now on]", "i will turn (the music | the tv | my music) down [right now | now]", "i will be (quiet | quieter) (at night | after ten)",
      "i will not (play music | be loud | make noise | play loud music) [at night | again | after ten]",
    ] },
    didnt_know: { patterns: ["[the music] [sorry] i did not (know | realize | think) [it was (so | that) loud | the walls were so thin | you could hear it]"] },
    noise_ask: { patterns: [
      "(could | can | would) you turn @music down [a little | a bit] #h:turn_down", "would you mind turning @music down [a little | a bit]",
      "(could | can) you (keep it down | be a little quieter | be quieter | be quiet | be more quiet) [at night]", "(could | can | would) you turn down [the | your] (music | tv)",
      "be (quiet | quieter) (after {time} | at night)", "(the | your) music is (too loud | a bit loud | really loud | very loud) [at night | last night]",
    ] },
    noise_deny: { patterns: [
      "[really | what | oh really] (it | that) was not (me | us) [@deny_more]", "(really | what | oh really) (i | we) (was | were) not (home | there | at home) [last night]", "i was not (home | there) [last night]", "we were not (home | there | loud | noisy) [last night]",
      "i did not (have a party | play music | make any noise)", "i was (asleep | sleeping) [last night]", "[it was not me] i was (at work | out | away | not home | not at home) [last night]",
      "it was not (that | so | very)? (loud | noisy)",
    ] },

    // --- coffee ---------------------------------------------------------------------------
    coffee_yes: { patterns: [
      "i would love to #h:love_to", "[yes] (that sounds | that would be | sounds) (great | lovely | nice | good | wonderful) #h:sounds_great",
      "[sure | yes] what time #h:what_time", "i would like that", "i am not busy [on sunday]", "i am free [on sunday]",
      "{day} (works | is (fine | good | great | perfect)) [for me] #h:sunday_ok", "with pleasure", "[yes] (can | should) i bring (something | anything)", "(thank you | thanks) [so much | a lot] for (the | your) (invitation | invite | offer)", "i would like that [very much | a lot]", "[sure] i love (coffee | tea)", "[{day}] [yes] i am free [on {day}]",
      "{day} [afternoon | morning] (works | is (fine | good | great | perfect)) [for me]",
    ] },
    coffee_no: { patterns: [
      "i am busy (on sunday | this sunday | that day) #h:busy_sunday", "i (can not | can not make it) [on sunday]", "i have plans [on sunday]",
      "maybe another time #h:another_time", "not this sunday", "i am (working | away) (on sunday | this weekend)", "@coffee_no_core [sorry] [but] maybe (another | next | some other) time",
      "[@thanks_inv | i would love to | i would like to] [but] @coffee_no_core", "[sorry] {day} (is not | does not) (good | okay | ok | work | possible) [for me]", "[unfortunately] i (can not | can not make it) [on sunday]", "maybe next time",
    ] },
    coffee_day: { patterns: ["(how about | what about | maybe) {day} [instead] #h:how_saturday", "(can | could) we do {day} [instead]", "{day} would be better",
      // "I'm busy, sorry. Maybe next week?" (one answer: another day, not a refusal)
      "[@thanks_inv] [but] [sorry | unfortunately] (@coffee_no_core | {no_day:day} (is not | does not) (good | okay | ok | work | possible) [for me]) [sorry] [but] (how about | what about | maybe | can we do | could we do) {day} [instead]",
    ] },
    coffee_time_ctx: { patterns: [
      "{time} [is (fine | good | perfect)] #h:two_fine", "{time} (works | is (great | okay | ok)) [for me]", "{time} (would be | is) better [for me]", "[yes] see you at {time}", "(a bit | a little) (later | earlier) [maybe | like | say | around] {time}", "(how about | what about | can we make it | could we make it) {time} #h:how_three",
      "(a bit | a little) (later | earlier) [would be better] #h:later", "(later | earlier) (is | would be) better [for me]", "(can | could) we (meet | do it | make it) [at] {time}",
    ] },
    invite_coffee: { patterns: [
      "would you like to (come over | come by) for (coffee | tea | a coffee) [sometime | on {day} | this weekend] #h:invite_coffee",
      "do you want to (come over | have coffee | grab a coffee) [sometime | on {day}]", "come over for coffee [sometime]", "come to my (place | apartment) [for (coffee | tea | dinner)] [sometime]",
      "would you like to have (coffee | tea) [with me] [sometime]", "let us have [a] (coffee | tea) [together] [sometime]",
    ] },

    // --- thanks and goodbye ----------------------------------------------------------------
    nice_meet: { patterns: ["[it was] nice (to meet | meeting) you [too] #h:nice_meet", "[it was] (great | good | lovely) to meet you [too]"] },
    thanks_kind: { patterns: [
      "(that is | you are) [so | really | very] kind [of you] #h:so_kind", "that is (so | really | very) nice of you",
      "you are a star #h:star", "you are (a lifesaver | the best | so sweet)", "you are [so | really | very] (nice | kind | sweet)",
      "i was (waiting for | expecting) (it | that | this | this package | this one)",
    ] },
    see_around: { patterns: ["see you around #h:see_you", "see you (on {day} | then | on sunday)"] },
    // "Two isn't good for me." (to "Is two o'clock okay?")
    coffee_time_no: { patterns: ["({time} | that | that time) (is not | does not) (good | okay | ok | fine | work | possible) [for me]", "i can not (at | do) {time}", "not (at)? {time}"] },
    // "I'm going away next week." (before asking for the favor)
    going_away: { patterns: ["@away_pre"] },
  },

  lines: {
    // --- introductions -------------------------------------------------------------
    greet_new: [
      t("Oh, | hi! | You | must | be | the | new | neighbor!", "O, | labas! | Tu | turbūt | esi | — | {m:naujasis|f:naujoji} | {m:kaimynas|f:kaimynė}!",
        "O, labas! Tu turbūt {m:naujasis kaimynas|f:naujoji kaimynė}!"),
      t("Hi there! | Did | you | just | move in?", "Labas! | Ar | tu | ką tik | įsikraustei?", "Labas! Ar tu ką tik įsikraustei?"),
    ],
    intro_again: [
      t("Sorry, | are | you | new | in the building?", "Atsiprašau, | ar | tu | {m:naujas|f:nauja} | šiame name?", "Atsiprašau, ar tu {m:naujas|f:nauja} šiame name?",
        { flags: { 1: "“are” in a yes/no question = the particle ar; Lithuanian needs no copula here." } }),
    ],
    not_neighbor: [t("Oh, | sorry! | My | mistake.", "O, | atsiprašau! | Mano | klaida.", "O, atsiprašau! Suklydau.")],
    rita_nice: [
      t("Nice | to meet | you! | I'm | Rita.", "Malonu | susipažinti | su tavimi! | Aš esu | Rita.", "Malonu susipažinti! Aš – Rita."),
      t("Hi! | I'm | Rita. | Nice | to meet | you!", "Labas! | Aš esu | Rita. | Malonu | susipažinti | su tavimi!", "Labas! Aš – Rita. Malonu susipažinti!"),
    ],
    rita_welcome: [
      t("Welcome | to | the | building!", "{m:Sveikas atvykęs|f:Sveika atvykusi} | į | — | namą!", "{m:Sveikas atvykęs|f:Sveika atvykusi} į mūsų namą!"),
    ],
    rita_whats_name: [
      t("I'm | Rita, | by the way. | What's | your | name?", "Aš esu | Rita, | beje. | Koks yra | tavo | vardas?", "Beje, aš – Rita. Kuo tu vardu?"),
    ],
    nice_meet_short: [t("Nice | to meet | you!", "Malonu | susipažinti | su tavimi!", "Malonu susipažinti!")],
    known_already: [
      t("Ha, | I | know! | We | met | last | time, | remember?", "Cha, | aš | žinau! | Mes | susipažinome | praėjusį | kartą, | pameni?", "Cha, žinau! Susipažinome praeitą kartą, pameni?"),
    ],

    // --- small talk ------------------------------------------------------------------
    ask_from: [
      t("So, | where | are | you | from?", "Tai | iš kur | esi | tu | [iš kur]?", "Tai iš kur tu?", { flags: { 4: "Stranded “from”: iš kur (under “where”) carries it." } }),
    ],
    from_lt: [
      t("Oh, | cool! | I've | never | met | anyone | from | Lithuania!", "O, | šaunu! | Aš | niekada | nesu {sm:sutikęs|sf:sutikusi} | nieko | iš | Lietuvos!",
        "O, šaunu! Dar niekada nesu {sm:sutikęs|sf:sutikusi} nė vieno žmogaus iš Lietuvos!",
        { flags: { 2: "“'ve” (have): the compound past nesu sutikusi (under “met”) carries it (C-PERF-SPLIT).", 4: "Negative concord: nesu sutikusi takes the ne- from “never”; anyone → nieko (C-CONCORD)." } }),
    ],
    from_other: [
      t("Oh, | nice! | Welcome | to | town!", "O, | puiku! | {m:Sveikas atvykęs|f:Sveika atvykusi} | į | miestą!", "O, puiku! {m:Sveikas atvykęs|f:Sveika atvykusi} į mūsų miestą!"),
    ],
    ask_like: [
      t("So, | how | do | you | like | it | so far?", "Tai | kaip | — | tau | patinka | čia | kol kas?", "Tai kaip tau čia kol kas patinka?",
        { flags: { 2: F_WH_DO, 5: "“it” = the new place; Lithuanian says čia (here)." } }),
      t("How | do | you | like | the | building?", "Kaip | — | tau | patinka | — | namas?", "Kaip tau patinka mūsų namas?", { flags: { 1: F_WH_DO } }),
    ],
    like_react: [
      t("That's | great!", "Tai | puiku!", "Puiku!"),
      t("I'm | so | glad!", "Man | taip | smagu!", "Labai smagu!"),
    ],
    boxes_react: [t("Ha! | Moving | is | the | worst.", "Cha! | Kraustymasis | yra | — | baisiausias.", "Cha! Kraustytis – baisiausia.")],

    // --- what can I do for you ---------------------------------------------------------
    needs_first_new: [
      t("So, | what | can | I | do | for you?", "Tai | ką | galiu | aš | padaryti | tau?", "Tai kuo galiu padėti?"),
      t("So, | do | you | need | anything?", "Tai | ar | tau | reikia | ko nors?", "Tai gal tau ko nors reikia?", { flags: { 1: F_DO_Q } }),
    ],
    needs_first_known: [
      t("So, | what's up?", "Tai | kas naujo?", "Tai kas naujo?"),
      t("What's up?", "Kas naujo?", "Kas naujo?"),
    ],
    needs_more: [
      t("Anything | else?", "Ką nors | daugiau?", "Dar ko nors?"),
      t("What | else?", "Kas | dar?", "Kas dar?"),
      t("Anything | else | you | want | to know?", "Ką nors | dar | tu | nori | žinoti?", "Dar ką nors nori sužinoti?"),
    ],
    needs_nudge: [
      t("Well, | if | you | ever | need | a | favor, | just | ask!", "Na, | jei | tau | kada nors | reikės | — | paslaugos, | tiesiog | paprašyk!",
        "Na, jei kada prireiks pagalbos – tiesiog paprašyk!"),
    ],
    needs_nudge2: [
      t("I | can | water | your | plants | or | take in | your | packages.", "Aš | galiu | palaistyti | tavo | augalus | arba | priimti | tavo | siuntinius.",
        "Galiu palaistyti tavo augalus ar priimti siuntinius."),
    ],
    favor_what: [t("Sure! | What | is | it?", "Žinoma! | Kas | tai | yra?", "Žinoma! Kokia paslauga?")],

    // --- the building ----------------------------------------------------------------------
    trash: [
      t("Trash | and | recycling | go | in | the | bins | behind | the | building.", "Šiukšlės | ir | antrinės žaliavos | dedamos | į | — | konteinerius | už | — | namo.",
        "Šiukšles ir rūšiuojamas atliekas mesk į konteinerius už namo."),
    ],
    recycling: [
      t("The | blue | bins | are | for recycling: | cans, | bottles, | paper | and | cardboard.",
        "— | Mėlyni | konteineriai | yra | antrinėms žaliavoms: | skardinės, | buteliai, | popierius | ir | kartonas.",
        "Mėlyni konteineriai – rūšiavimui: skardinės, buteliai, popierius ir kartonas."),
    ],
    trash_day: [
      t("Trash | day | is | Monday.", "Šiukšlių išvežimo | diena | yra | pirmadienis.", "Šiukšles išveža pirmadieniais."),
      t("They | pick up | the | trash | on Mondays.", "Jie | išveža | — | šiukšles | pirmadieniais.", "Šiukšles išveža pirmadieniais."),
    ],
    boxes: [t("And | please | break down | your | boxes!", "Ir | prašau, | suplok | savo | dėžes!", "Ir, prašau, suplok savo dėžes!")],
    fyi_trash: [t("Oh, | and | trash | day | is | Monday!", "O, | ir | šiukšlių išvežimo | diena | yra | pirmadienis!", "O, ir šiukšles išveža pirmadieniais!")],
    laundry: [t("The | laundry room | is | in the basement.", "— | Skalbykla | yra | rūsyje.", "Skalbykla – rūsyje.")],
    laundry2: [t("The | machines | take | quarters.", "— | Mašinos | priima | 25 centų monetas.", "Mašinos veikia su 25 centų monetomis.")],
    mail: [t("The | mailboxes | are | in the lobby.", "— | Pašto dėžutės | yra | vestibiulyje.", "Pašto dėžutės – vestibiulyje.")],
    packages_door: [
      t("Packages | usually | get left | by | the | front | door.", "Siuntiniai | paprastai | paliekami | prie | — | lauko | durų.", "Siuntinius paprastai palieka prie lauko durų."),
    ],
    parking: [t("You | can | park | in the lot | behind | the | building.", "Tu | gali | statyti | aikštelėje | už | — | namo.", "Automobilį gali statyti aikštelėje už namo.")],
    internet: [t("I | use | NetWave. | It's | pretty | good.", "Aš | naudoju | „NetWave“. | Jis yra | gana | geras.", "Aš naudojuosi „NetWave“ – visai neblogas.")],
    quiet: [
      t("It's | pretty | quiet. | The | walls | are | a little | thin, | though!", "Čia | gana | ramu. | — | Sienos | yra | truputį | plonos, | tiesa!",
        "Čia gana ramu. Tiesa, sienos kiek plonos!", { flags: { 0: "Dummy “It's”: Lithuanian says čia (here) with the impersonal ramu." } }),
    ],
    landlord: [
      t("Mr. | Patel? | He's | great. | He | fixes | everything | really | fast.", "Ponas | Patelis? | Jis yra | puikus. | Jis | sutaiso | viską | labai | greitai.",
        "Ponas Patelis? Jis puikus – viską sutaiso labai greitai."),
    ],
    store: [t("There's | a | grocery | store | two | blocks | away.", "Yra | — | maisto | parduotuvė | dviejų | kvartalų | atstumu.", "Už dviejų kvartalų yra maisto parduotuvė.")],
    unknown_q: [
      t("Hmm, | I'm | not | sure. | Maybe | ask | Mr. | Patel!", "Hmm, | aš | nesu | {sm:tikras|sf:tikra}. | Gal | paklausk | pono | Patelio!",
        "Hmm, nesu {sm:tikras|sf:tikra}. Gal paklausk pono Patelio!", { flags: { 1: "“'m” (am): the negated copula nesu (under “not”) carries it." } }),
    ],
    knock: [
      t("If | you | need | anything, | just | knock! | I'm | right | next door.", "Jei | tau | reikės | ko nors, | tiesiog | pasibelsk! | Aš esu | visai | kaimynystėje.",
        "Jei ko prireiks – tiesiog pasibelsk! Gyvenu visai šalia."),
    ],

    // --- favors ------------------------------------------------------------------------
    plants_when: [t("Of course! | When | are | you | leaving?", "Žinoma! | Kada | — | tu | išvyksti?", "Žinoma! Kada išvyksti?", { flags: { 2: F_PROG } })],
    plants_key: [
      t("No | problem! | Just | leave | me | a | key.", "Jokių | problemų! | Tiesiog | palik | man | — | raktą.", "Jokių problemų! Tiesiog palik man raktą."),
      t("Sure! | Just | leave | me | your | key.", "Žinoma! | Tiesiog | palik | man | savo | raktą.", "Žinoma! Tiesiog palik man savo raktą."),
    ],
    trip: [t("Have | a | great | trip!", "Linkiu | — | puikios | kelionės!", "Geros kelionės!")],
    package_ok: [
      t("Of course! | I | work | from | home, | so | I'll be | here.", "Žinoma! | Aš | dirbu | iš | namų, | tad | būsiu | čia.", "Žinoma! Dirbu iš namų, tad būsiu čia."),
      t("Sure, | no | problem. | I'll keep | it | for you.", "Žinoma, | jokių | problemų. | Pasiliksiu | jį | tau.", "Žinoma, jokių problemų. Pasaugosiu jį tau."),
    ],
    borrow_yes: [
      t("Sure! | Hold on | a | second.", "Žinoma! | Palauk | — | sekundėlę.", "Žinoma! Palauk sekundėlę."),
      t("Sure, | no | problem!", "Žinoma, | jokių | problemų!", "Žinoma, jokių problemų!"),
    ],
    here_you_go: [t("Here you go!", "Prašom!", "Prašom!")],
    borrow_no: [
      t("Sorry, | I | don't have | {X.np}. | Maybe | ask | Mr. | Patel?", "Atsiprašau, | aš | neturiu | {X.np:gen}. | Gal | paklausk | pono | Patelio?",
        "Atsiprašau, {X:gen} neturiu. Gal paklausk pono Patelio?"),
    ],
    borrow_unknown: [
      t("Hmm, | I | don't think | I | have | one, | sorry.", "Hmm, | aš | nemanau, | kad | turiu | tokį daiktą, | atsiprašau.", "Hmm, nemanau, kad tokį turiu, atsiprašau.",
        { flags: { 3: "“I”: after kad the subject is carried by the ending of turiu." } }),
    ],

    // --- noise -------------------------------------------------------------------------
    noise_ok: [
      t("Oh, | don't worry | about | it! | I | didn't | even | hear | it.", "O, | nesijaudink | dėl | to! | Aš | — | net | negirdėjau | jo.", "O, nesijaudink! Aš net negirdėjau.",
        { flags: { 5: "“didn't … hear”: the ne- of negirdėjau (under “hear”) carries it (C-NEG-SPLIT)." } }),
      t("No | worries! | It was | fine.", "Jokių | rūpesčių! | Buvo | gerai.", "Nieko tokio! Viskas buvo gerai."),
      t("That's | okay! | It happens.", "Tai | gerai! | Pasitaiko.", "Nieko tokio! Pasitaiko."),
    ],
    noise_reason_react: [t("Sounds | like | fun!", "Skamba | — | smagiai!", "Skamba smagiai!", { flags: { 1: "“like” has no Lithuanian word here; the adverb smagiai follows skamba directly." } })],
    noise_thanks: [
      t("Thanks, | I | really | appreciate | it!", "Ačiū, | aš | labai | vertinu | tai!", "Ačiū, esu labai {sm:dėkingas|sf:dėkinga}!"),
      t("Thank | you! | That | means | a | lot.", "Dėkoju | tau! | Tai | reiškia | — | daug.", "Ačiū! Man tai labai svarbu."),
    ],
    noise_sorry_rita: [t("Oh | no, | sorry | about | that!", "O | ne, | atsiprašau | dėl | to!", "O ne, atsiprašau!")],
    noise_didnt_realize: [
      t("I | didn't realize | it | was | that | loud.", "Aš | nesupratau, kad | — | buvo | taip | garsu.", "Net nepagalvojau, kad taip garsu.",
        { flags: { 2: "Dummy “it”: the impersonal buvo … garsu has no subject." } }),
    ],
    noise_turn_down: [t("I'll turn | it | down | right now.", "Patildysiu | ją | — | tuoj pat.", "Tuoj pat patildysiu.", { flags: { 2: F_DOWN } })],
    complain1: [t("Hey, | sorry | to bother | you.", "Ei, | atsiprašau, kad | trukdau | tau.", "Ei, atsiprašau, kad trukdau.")],
    complain2: [t("The | music | was | pretty | loud | last | night.", "— | Muzika | buvo | gana | garsi | praėjusią | naktį.", "Vakar vakare muzika buvo gana garsi.")],
    complain3: [
      t("Could | you | turn | it | down | a little | at night?", "Ar galėtum | tu | patildyti | ją | — | truputį | naktimis?", "Ar galėtum naktimis ją kiek patildyti?",
        { flags: { 4: F_DOWN } }),
    ],
    complain4: [t("The | walls | are | really | thin.", "— | Sienos | yra | labai | plonos.", "Sienos labai plonos.")],
    deny_react: [
      t("Oh, | really? | Sorry! | Maybe | it | was | the | people | upstairs.", "O, | tikrai? | Atsiprašau! | Gal | tai | buvo | — | žmonės | viršuje.",
        "O, tikrai? Atsiprašau! Gal tai kaimynai iš viršaus."),
    ],
    oh_okay: [t("Oh… | okay | then.", "O… | gerai | tada.", "O… na, gerai.")],

    // --- returning players -------------------------------------------------------------
    greet_known: [
      t("Hey, | neighbor! | How's it going?", "Labas, | kaimyne! | Kaip sekasi?", "Labas, kaimyne! Kaip sekasi?"),
      t("Oh, | hi! | How | are | you?", "O, | labas! | Kaip | sekasi | tau?", "O, labas! Kaip sekasi?"),
    ],
    hi_known: [t("Hey, | neighbor!", "Labas, | kaimyne!", "Labas, kaimyne!")],
    package_twist: [
      t("Oh, | by the way, | I | have | a | package | for you! | The | delivery guy | left | it | with | me.",
        "O, | beje, | aš | turiu | — | siuntinį | tau! | — | Kurjeris | paliko | jį | pas | mane.", "O, beje, turiu tau siuntinį! Kurjeris paliko jį pas mane."),
    ],

    // --- coffee ------------------------------------------------------------------------
    coffee_invite: [
      t("Hey, | would | you | like | to come over | for coffee | on Sunday?", "Ei, | ar | tu | norėtum | užsukti | kavos | sekmadienį?", "Ei, gal norėtum sekmadienį užsukti kavos?",
        { flags: { 1: F_WOULD_Q } }),
      t("Do | you | want | to come over | for coffee | on Sunday?", "Ar | tu | nori | užsukti | kavos | sekmadienį?", "Gal nori sekmadienį užsukti kavos?", { flags: { 0: F_DO_Q } }),
    ],
    coffee_time: [
      t("Great! | Is | two | o'clock | okay?", "Puiku! | Ar | antra | valanda | tinka?", "Puiku! Ar tinka antrą valandą?",
        { flags: { 1: "“Is” in a question = the particle ar; tinka (under “okay”) takes over the copula." } }),
    ],
    coffee_confirm: [
      t("Perfect! | See you | on Sunday!", "Puiku! | Iki | sekmadienio!", "Puiku! Iki sekmadienio!"),
      t("Awesome! | I'll bake | something.", "Šaunu! | Iškepsiu | ką nors.", "Šaunu! Ką nors iškepsiu."),
    ],
    coffee_reask: [t("So, | coffee | on Sunday?", "Tai | kava | sekmadienį?", "Tai kaip – kava sekmadienį?")],
    coffee_other_day: [t("Sure, | that | works | too!", "Žinoma, | tai | tinka | irgi!", "Žinoma, irgi tinka!")],
    coffee_decline_ok: [
      t("No | worries! | Maybe | another | time.", "Jokių | rūpesčių! | Gal | kitą | kartą.", "Nieko tokio! Gal kitą kartą."),
    ],
    coffee_whenever: [t("No | problem. | Just | knock | when | you're | free!", "Jokių | problemų. | Tiesiog | pasibelsk, | kai | būsi | {m:laisvas|f:laisva}!", "Jokių problemų. Tiesiog pasibelsk, kai būsi {m:laisvas|f:laisva}!",
      { flags: { 5: "“you're” = būsi: after kai the future is used for a future time." } })],
    coffee_learner_react: [t("I'd love to! | How about | Sunday | afternoon?", "Mielai! | O gal | sekmadienį | po pietų?", "Mielai! Gal sekmadienį po pietų?")],

    // --- thanks and goodbye -------------------------------------------------------------
    kind_react: [
      t("Of course! | That's | what | neighbors | are | for.", "Žinoma! | Tai | tam | kaimynai | ir yra | [tam].", "Žinoma! Tam ir yra kaimynai.",
        { flags: { 5: "Stranded “for”: tam (under “what”) carries it." } }),
    ],
    star_react: [t("Aw, | anytime!", "Oi, | visada prašom!", "Oi, visada prašom!")],
    bye_new: [t("It was | so | nice | to meet | you!", "Buvo | taip | malonu | susipažinti | su tavimi!", "Buvo labai malonu susipažinti!")],
    you_too: [t("You | too!", "Tau | irgi!", "Man irgi!")],
    see_around: [t("See you around!", "Iki pasimatymo!", "Iki pasimatymo!")],
    ack: [t("Okay.", "Gerai.", "Gerai."), t("Sure.", "Žinoma.", "Žinoma.")],
  },

  hints: {
    intro: {
      lt: "Prisistatyti kaimynei",
      items: [
        { id: "im_name", s: t("Hi! | I'm | {$name}.", "Labas! | Aš esu | {$name}.", "Labas! Aš – {$name}.") },
        { id: "moved_in", s: t("I | just | moved in | next door.", "Aš | ką tik | įsikrausčiau | į gretimą butą.", "Ką tik įsikrausčiau į gretimą butą.") },
        { id: "new_neighbor", s: t("I'm | your | new | neighbor.", "Aš esu | tavo | {m:naujas|f:nauja} | {m:kaimynas|f:kaimynė}.", "Aš – {m:tavo naujas kaimynas|f:tavo nauja kaimynė}.") },
        { id: "my_name", s: t("My | name | is | {$name}.", "Mano | vardas | yra | {$name}.", "Mano vardas – {$name}.") },
        { id: "nice_meet", s: t("Nice | to meet | you!", "Malonu | susipažinti | su tavimi!", "Malonu susipažinti!") },
      ],
    },
    name: {
      lt: "Pasakyti savo vardą",
      items: [
        { id: "my_name", s: t("My | name | is | {$name}.", "Mano | vardas | yra | {$name}.", "Mano vardas – {$name}.") },
        { id: "im_name", s: t("I'm | {$name}.", "Aš esu | {$name}.", "Aš – {$name}.") },
      ],
    },
    from: {
      lt: "Pasakyti, iš kur esi", slot: "country", examples: ["lithuania"],
      items: [
        { id: "from_country", s: t("I'm | from | {X}.", "Aš esu | iš | {X:gen}.", "Aš iš {X:gen}.") },
        { id: "lithuanian", s: t("I'm | Lithuanian.", "Aš esu | {m:lietuvis|f:lietuvė}.", "Aš – {m:lietuvis|f:lietuvė}.") },
      ],
    },
    like: {
      lt: "Pasakyti, kaip patinka naujoje vietoje",
      items: [
        { id: "love_it", s: t("I | love | it | here!", "Man | labai patinka | — | čia!", "Man čia labai patinka!",
          { flags: { 2: "“it” (the place) needs no word: patinka takes no object here; čia (under “here”) names the place." } }) },
        { id: "so_far", s: t("So far, so good!", "Kol kas viskas gerai!", "Kol kas viskas gerai!") },
        { id: "boxes", s: t("It's | great, | but | I | still | have | lots of | boxes!", "Tai yra | puiku, | bet | aš | dar | turiu | daugybę | dėžių!", "Puiku, bet dar turiu daugybę dėžių!") },
      ],
    },
    building: {
      lt: "Paklausti apie namą",
      items: [
        { id: "q_trash", s: t("Where | does | the | trash | go?", "Kur | — | — | šiukšlės | dedamos?", "Kur išmesti šiukšles?", { flags: { 1: F_WH_DO } }) },
        { id: "q_recycling", s: t("Where | does | the | recycling | go?", "Kur | — | — | antrinės žaliavos | dedamos?", "Kur mesti rūšiuojamas atliekas?", { flags: { 1: F_WH_DO } }) },
        { id: "q_trash_day", s: t("When | is | trash | day?", "Kada | yra | šiukšlių išvežimo | diena?", "Kurią dieną išveža šiukšles?") },
        { id: "q_laundry", s: t("Where's | the | laundry room?", "Kur yra | — | skalbykla?", "Kur yra skalbykla?") },
        { id: "q_mail", s: t("Where | are | the | mailboxes?", "Kur | yra | — | pašto dėžutės?", "Kur pašto dėžutės?") },
        { id: "q_store", s: t("Is | there | a | grocery | store | nearby?", "Ar yra | — | — | maisto | parduotuvė | netoliese?", "Ar netoliese yra maisto parduotuvė?", { flags: { 1: F_THERE } }) },
      ],
    },
    favor: {
      lt: "Paprašyti paslaugos",
      items: [
        { id: "water_plants", s: t("Could | you | water | my | plants | while | I'm | away?", "Ar galėtum | tu | palaistyti | mano | augalus | kol | aš būsiu | {m:išvykęs|f:išvykusi}?",
          "Ar galėtum palaistyti mano augalus, kol būsiu {m:išvykęs|f:išvykusi}?", { flags: { 6: "“I'm” = aš būsiu: after kol the future is used for a future period." } }) },
        { id: "package", s: t("Could | you | take in | a | package | for | me | on Monday?", "Ar galėtum | tu | priimti | — | siuntinį | už | mane | pirmadienį?",
          "Ar galėtum pirmadienį už mane priimti siuntinį?") },
        { id: "ask_favor", s: t("Can | I | ask | you | a | favor?", "Ar galiu | aš | paprašyti | tavęs | — | paslaugos?", "Ar galiu paprašyti paslaugos?") },
      ],
    },
    away: {
      lt: "Pasakyti, kada išvyksti",
      items: [
        { id: "away_when", s: t("I'm leaving | next | Friday.", "Išvykstu | kitą | penktadienį.", "Išvykstu kitą penktadienį.") },
        { id: "on_saturday", s: t("On Saturday.", "Šeštadienį.", "Šeštadienį.") },
        { id: "this_weekend", s: t("This | weekend.", "Šį | savaitgalį.", "Šį savaitgalį.") },
      ],
    },
    borrow: {
      lt: "Ko nors pasiskolinti", slot: "thing", examples: ["ladder", "drill", "vacuum", "sugar"],
      items: [
        { id: "borrow", s: t("Could | I | borrow | your | {X}?", "Ar galėčiau | aš | pasiskolinti | tavo | {X:acc}?", "Ar galėčiau pasiskolinti tavo {X:acc}?"),
          only: (e) => !e.attrs?.mass },
        { id: "borrow", s: t("Could | I | borrow | {X.np}?", "Ar galėčiau | aš | pasiskolinti | {X.np:acc}?", "Ar galėčiau pasiskolinti {X.np:gen}?"),
          only: (e) => !!e.attrs?.mass },
        { id: "have_one", s: t("Do | you | have | {X.np}?", "Ar | tu | turi | {X.np:acc}?", "Ar turi {X.np:acc}?", { flags: { 0: F_DO_Q } }) },
      ],
    },
    noise: {
      lt: "Atsiprašyti dėl triukšmo arba paprašyti tylos",
      items: [
        { id: "sorry_noise", s: t("Sorry | about | the | noise | last | night.", "Atsiprašau | dėl | — | triukšmo | praėjusią | naktį.", "Atsiprašau dėl vakarykščio triukšmo.") },
        { id: "wont_happen", s: t("It | won't happen | again.", "Tai | nepasikartos | daugiau.", "Daugiau taip nebus.") },
        { id: "quieter", s: t("We'll be | quieter.", "Būsime | tylesni.", "Stengsimės būti tylesni.") },
        { id: "little_party", s: t("We | had | a | little | party.", "Mes | surengėme | — | nedidelį | vakarėlį.", "Surengėme nedidelį vakarėlį.") },
        { id: "friends_over", s: t("I | had | some | friends | over.", "Pas mane | buvo | — | draugų | —.", "Pas mane buvo svečių.",
          { flags: { 2: "Partitive: the genitive draugų carries “some”.", 4: "“had … over” = pas mane buvo; “over” has no separate word." } }) },
        { id: "turn_down", s: t("Could | you | turn | the | music | down | a little?", "Ar galėtum | tu | patildyti | — | muziką | — | truputį?", "Ar galėtum truputį patildyti muziką?",
          { flags: { 5: F_DOWN } }) },
      ],
    },
    coffee: {
      lt: "Atsakyti į kvietimą arba pakviesti kavos",
      items: [
        { id: "love_to", s: t("I'd love to!", "Mielai!", "Mielai!") },
        { id: "busy_sunday", s: t("Sorry, | I'm | busy | on Sunday.", "Atsiprašau, | aš esu | {m:užsiėmęs|f:užsiėmusi} | sekmadienį.", "Atsiprašau, sekmadienį esu {m:užsiėmęs|f:užsiėmusi}.") },
        { id: "what_time", s: t("Sure! | What | time?", "Žinoma! | Kelintą | valandą?", "Žinoma! Kelintą valandą?") },
        { id: "sounds_great", s: t("That | sounds | great!", "Tai | skamba | puikiai!", "Puikiai skamba!") },
        { id: "another_time", s: t("Maybe | another | time?", "Gal | kitą | kartą?", "Gal kitą kartą?") },
        { id: "invite_coffee", s: t("Would | you | like | to come over | for coffee | sometime?", "Ar | tu | norėtum | užsukti | kavos | kada nors?", "Gal norėtum kada nors užsukti kavos?",
          { flags: { 0: F_WOULD_Q } }) },
      ],
    },
    coffee_time: {
      lt: "Sutarti laiką",
      items: [
        { id: "two_fine", s: t("Yes, | two | is fine.", "Taip, | antra | tinka.", "Taip, antrą valandą tinka.") },
        { id: "how_three", s: t("How about | three?", "O gal | trečią?", "O gal trečią?") },
        { id: "later", s: t("A little | later, | please.", "Truputį | vėliau, | prašau.", "Truputį vėliau, prašau.") },
      ],
    },
    sunday: {
      lt: "Sutarti dieną",
      items: [
        { id: "sunday_ok", s: t("Sunday | works | for me!", "Sekmadienis | tinka | man!", "Sekmadienį man tinka!") },
        { id: "how_saturday", s: t("How about | Saturday?", "O gal | šeštadienį?", "O gal šeštadienį?") },
      ],
    },
    thanks: {
      lt: "Padėkoti kaimynei",
      items: [
        { id: "s_thanks", s: t("Oh, | thank | you | so much!", "O, | dėkoju | tau | labai!", "O, labai ačiū!") },
        { id: "so_kind", s: t("Thanks, | that's | really | kind | of | you!", "Ačiū, | tai | labai | malonu | iš | tavo pusės!", "Ačiū, labai malonu iš tavo pusės!") },
        { id: "star", s: t("You're | a | star!", "Tu esi | tikra | žvaigždė!", "Tu tikra žvaigždė!", { flags: { 1: "“a” = tikra (a real …): the praise needs an intensifier in Lithuanian." } }) },
      ],
    },
    bye: {
      lt: "Padėkoti ir atsisveikinti",
      items: [
        { id: "nice_meet", s: t("It was | nice | to meet | you!", "Buvo | malonu | susipažinti | su tavimi!", "Buvo malonu susipažinti!") },
        { id: "see_you", s: t("See you around!", "Iki pasimatymo!", "Iki pasimatymo!") },
        { id: "so_kind", s: t("Thanks, | that's | really | kind | of | you!", "Ačiū, | tai | labai | malonu | iš | tavo pusės!", "Ačiū, labai malonu iš tavo pusės!") },
      ],
    },
  },

  tips: {
    uk_rubbish: { key: "uk_rubbish", lt: "Suprasta! Amerikoje šiukšlės – „trash“ arba „garbage“.", better: "Where does the trash go?" },
    uk_bins: { key: "uk_bins", lt: "Suprasta! Amerikoje dažniau sakoma „trash cans“.", better: "Where are the trash cans?" },
    uk_parcel: { key: "uk_parcel", lt: "Suprasta! Amerikoje siuntinys – „package“.", better: "Could you take in a package for me?" },
    uk_flat: { key: "uk_flat", lt: "Suprasta! Amerikoje sakoma „apartment“ (butas).", better: "I just moved into the apartment next door." },
    uk_post: { key: "uk_post", lt: "Suprasta! Amerikoje paštas (laiškai) – „mail“.", better: "Where do I get my mail?" },
  },

  merges: {
    "move in": { reason: "lexical_expression", split: "move → kraustytis + in → į leaves a stray preposition; the prefix į- of įsikraustyti carries “in” (C-PHR).", minimal: "Verb and particle." },
    "moved in": { reason: "lexical_expression", split: "moved → kraustėsi + in → į leaves a stray preposition; = įsikraustė (C-PHR).", minimal: "Verb and particle." },
    "next door": { reason: "lexical_expression", split: "next → kitas + door → durys gives “kitos durys”; = kaimynystėje / gretimame bute (C-LEX).", minimal: "Two words." },
    "by the way": { reason: "lexical_expression", split: "by → prie, the → —, way → kelias is false; the discourse marker = beje.", minimal: "All three words." },
    "so far": { reason: "lexical_expression", split: "so → taip + far → toli gives “taip toli”; = kol kas.", minimal: "Two words." },
    "so far, so good": { reason: "lexical_expression", split: "a set phrase; word by word (taip toli, taip gerai) is nonsense; = kol kas viskas gerai.", minimal: "The whole saying." },
    "what's up": { reason: "lexical_expression", split: "What's → kas yra + up → aukštyn is false; the greeting question = kas naujo.", minimal: "Two words." },
    "how's it going": { reason: "lexical_expression", split: "How's → kaip yra, it → tai, going → einantis is a literal reading of a set greeting (= kaip sekasi).", minimal: "The whole greeting." },
    "hold on": { reason: "lexical_expression", split: "hold → laikyk + on → ant is false; = palauk (C-PHR).", minimal: "Verb and particle." },
    "take in": { reason: "lexical_expression", split: "take → imti + in → į is false; taking in a package = priimti (C-PHR).", minimal: "Verb and particle." },
    "break down": { reason: "lexical_expression", split: "break → laužyti + down → žemyn is false; flattening boxes = suploti (C-PHR).", minimal: "Verb and particle." },
    "pick up": { reason: "lexical_expression", split: "pick → rinkti + up → aukštyn is false; collecting trash = išvežti (C-PHR).", minimal: "Verb and particle." },
    "get left": { reason: "grammatical_fusion", split: "get → gauti + left → paliktas is false; the “get” passive = paliekami.", minimal: "Auxiliary and participle." },
    "it was": { reason: "grammatical_fusion", split: "Dummy “it” → tai would add a false subject; the impersonal buvo absorbs it (C-DUMMY).", minimal: "Two words." },
    "it happens": { reason: "grammatical_fusion", split: "Dummy “it” → tai + happens → atsitinka; the impersonal pasitaiko absorbs it (C-DUMMY).", minimal: "Two words." },
    "to come over": { reason: "grammatical_fusion", split: "to → į is false (infinitive -ti); come → ateiti + over → per is false; = užsukti (C-INF + C-PHR).", minimal: "Infinitive marker, verb and particle." },
    "i'd love to": { reason: "lexical_expression", split: "I'd → aš, love → mylėčiau, to → — is a false literal; accepting an invitation = mielai.", minimal: "The whole reply." },
    "how about": { reason: "lexical_expression", split: "how → kaip + about → apie gives “kaip apie”; a suggestion = o gal.", minimal: "Two words." },
    "see you around": { reason: "lexical_expression", split: "see → matysiu, you → tave, around → aplink is a literal reading of a farewell (= iki pasimatymo).", minimal: "The whole farewell." },
    "delivery guy": { reason: "lexical_expression", split: "delivery → pristatymas + guy → vaikinas gives “pristatymo vaikinas”; = kurjeris.", minimal: "Two words, one person." },
    "laundry room": { reason: "lexical_expression", split: "laundry → skalbiniai + room → kambarys gives “skalbinių kambarys”; the compound names one place = skalbykla.", minimal: "Two words, one place name." },
    "lots of": { reason: "lexical_expression", split: "lots → daug + of → — leaves a stray preposition; = daugybė (C-LEX).", minimal: "Two words." },
    "a little": { reason: "lexical_expression", split: "a → — + little → mažas gives “mažas”; the degree adverb “a little” = truputį (C-LEX).", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Prisistatyk kaimynei", optional: true, when: (c) => !known(c), done: (c) => !!c.s.introduced },
    { lt: "Paklausk, kur mesti šiukšles", optional: true, when: (c) => !known(c), done: (c) => !!c.s.trashTold },
    { lt: "Atsakyk, kaip sekasi", optional: true, when: (c) => knownPlain(c), done: (c) => knownPlain(c) && !!c.s.chatted },
    { lt: "Padėkok už siuntinį", optional: true, when: (c) => !!c.s.pkgTwist, done: (c) => !!c.s.pkgTwist && (!!c.s.pkgThanked || !!c.s.chatted) },
    { lt: "Atsakyk į Ritos skundą", optional: true, when: (c) => !!c.s.complaint, done: (c) => !!c.s.complaintDone || c.s.goal === "apology" },
    { lt: "Paprašyk paslaugos ar atsiprašyk", done: (c) => !!c.s.goal },
  ],

  steps: [
    { id: "intro", when: (c) => !known(c), done: (c) => !!c.s.introduced,
      ask: (c) => { if (!c.s.greeted0) { c.s.greeted0 = true; c.say("greet_new"); } else c.say("intro_again"); },
      expects: ["moved_in", "im_name_ctx", "my_name"],
      suggest: [{ lt: "Prisistatyti: vardas ir kad ką tik atsikraustei", hint: "intro" }],
      yes: (c) => introduce(c, false),
      no: (c) => { c.say("not_neighbor"); c.hold(); } },
    { id: "from_q", when: (c) => !known(c) && !!c.s.introduced && c.s.askFrom, done: (c) => !!c.s.fromAsked,
      ask: (c) => {
        c.s.fromAsked = true;
        c.say("ask_from");
        c.expect({ id: "from_q", optional: true, expects: ["from_ans", "from_ans_ctx", "from_other_ctx"], hints: ["from"],
          suggest: [{ lt: "Pasakyti, iš kur esi", hint: "from", options: "country" }],
          on: {
            from_ans: (cc, sl, sg) => { neighbor.handlers.from_ans(cc, sl, sg); },
            from_ans_ctx: (cc, sl, sg) => { neighbor.handlers.from_ans_ctx(cc, sl, sg); },
            from_other_ctx: (cc, sl, sg) => { neighbor.handlers.from_other_ctx(cc, sl, sg); },
          } });
      },
      expects: ["from_ans", "from_ans_ctx", "from_other_ctx"] },
    { id: "like_q", when: (c) => !known(c) && !!c.s.introduced && c.s.askLike, done: (c) => !!c.s.likeAsked,
      ask: (c) => {
        c.s.likeAsked = true;
        c.say("ask_like");
        c.expect({ id: "like_q", optional: true, expects: ["like_ans_ctx", "boxes"], hints: ["like"],
          suggest: [{ lt: "Pasakyti, kaip patinka naujoje vietoje", hint: "like" }],
          on: { like_ans_ctx: (cc) => { if (!/boxes/i.test(cc.heard)) cc.say("like_react"); }, boxes: (cc) => { cc.say("boxes_react"); } },
          yes: (cc) => { cc.say("like_react"); } });
      },
      expects: ["like_ans_ctx", "boxes"] },
    { id: "trash_q", when: (c) => !known(c) && !!c.s.introduced, done: (c) => !!c.s.trashTold || !!c.s.goal,
      ask: (c) => { c.s.chatted = true; c.say(c.s.trashAsked ? "needs_more" : "needs_first_new"); c.s.trashAsked = true; },
      expects: ["ask_trash", "ask_recycling", "ask_trash_day", "ask_boxes", "ask_laundry", "ask_mail", "ask_parking", "ask_internet", "ask_quiet",
        "ask_landlord", "ask_store", "no_more", "ask_favor", "water_plants", "take_package", "borrow", "noise_sorry", "noise_ask", "noise_reason", "from_ans"],
      suggest: [
        { lt: "Paklausti, kur mesti šiukšles", hint: "building" },
        { lt: "Paprašyti paslaugos", hint: "favor" },
      ],
      yes: (c) => { c.say("favor_what"); c.hold(); },
      no: (c) => { c.say("fyi_trash"); c.s.trashTold = true; c.s.needsNo = 1; } },
    { id: "needs", done: (c) => !!c.s.goal || (c.s.needsNo ?? 0) >= 2,
      ask: (c) => {
        c.s.chatted = true;
        c.s.howOpen = false;
        if (c.s.needsNo === 1 && !c.s.nudged) { c.s.nudged = true; c.say("needs_nudge"); c.say("needs_nudge2"); return; }
        if (known(c) && !c.s.needsAsked) { c.s.needsAsked = true; c.say("needs_first_known"); return; }
        c.s.needsAsked = true;
        c.say("needs_more");
      },
      expects: ["ask_favor", "water_plants", "take_package", "borrow", "noise_sorry", "noise_ask", "noise_reason", "ask_trash", "ask_recycling",
        "ask_trash_day", "ask_boxes", "ask_laundry", "ask_mail", "ask_parking", "ask_internet", "ask_quiet", "ask_landlord", "ask_store", "no_more", "invite_coffee",
        "from_ans"],
      suggest: [
        { lt: "Paprašyti paslaugos: palaistyti augalus, priimti siuntinį", hint: "favor" },
        { lt: "Ko nors pasiskolinti", hint: "borrow", options: "thing" },
        { lt: "Paklausti apie šiukšles, skalbyklą, paštą", hint: "building" },
        { lt: "Atsiprašyti dėl triukšmo arba paprašyti tylos", hint: "noise" },
      ],
      yes: (c) => { c.say("favor_what"); c.hold(); },
      no: (c) => { c.s.needsNo = (c.s.needsNo ?? 0) + 1; } },
    { id: "coffee", when: (c) => !!c.s.coffeeInvite && (!!c.s.goal || (c.s.needsNo ?? 0) >= 2), done: (c) => !!c.s.coffeeDone,
      ask: (c) => {
        c.s.coffeeDone = true;
        c.say("coffee_invite");
        c.expect({ id: "coffee", expects: ["coffee_yes", "coffee_no", "coffee_day"], hints: ["coffee"],
          suggest: [{ lt: "Priimti arba mandagiai atsisakyti kvietimo", hint: "coffee" }],
          on: {
            coffee_yes: (cc) => { askCoffeeTime(cc); },
            coffee_no: (cc) => { react(cc, PROPOSES_DAY.test(cc.heard) ? "coffee_other_day" : "coffee_decline_ok"); },
            // (no "See you on Sunday!" after another day)
            coffee_day: (cc) => { react(cc, "coffee_other_day"); },
            // "Thanks, bye!": thank first, then say goodbye (a plain "Thanks!" is left to the normal handler).
            g_thanks: (cc) => { if (!/\b(bye|goodbye|see you|take care)\b/i.test(cc.heard)) return false; cc.say("g_welcome"); return true; },
            g_bye: (cc) => {
              if (!known(cc) && !cc.s.trashTold) { cc.say("fyi_trash"); cc.s.trashTold = true; }
              maybeComplete(cc); cc.say("see_around"); cc.end();
            },
          },
          yes: (cc) => { askCoffeeTime(cc); }, no: (cc) => { cc.say("coffee_decline_ok"); },
          ask: (cc) => cc.say("coffee_reask") });
      },
      expects: ["coffee_yes", "coffee_no", "coffee_day"] },
  ],

  init: (c) => {
    c.s.known = c.visits >= 1;
    c.s.askFrom = c.chance(0.45);
    c.s.askLike = c.chance(0.35);
    c.s.coffeeInvite = c.chance(c.s.known ? 0.3 : 0.6);
    c.s.complaint = c.s.known && c.chance(0.45);
    c.s.pkgTwist = c.s.known && !c.s.complaint && c.chance(0.4);
    c.s.qCount = 0;
  },

  start: (c) => {
    if (!known(c)) return; // the "intro" step greets
    if (c.s.complaint) {
      c.twist("complaint");
      c.say("complain1"); c.say("complain2"); c.say("complain3");
      if (c.chance(0.5)) c.say("complain4");
      expectComplaint(c, false);
      return;
    }
    if (c.s.pkgTwist) {
      c.twist("package");
      c.say("hi_known"); c.say("package_twist");
      c.event("give", { item: "package" });
      c.expect({ id: "pkg", optional: true, expects: ["g_thanks", "thanks_kind"], hints: ["thanks"],
        suggest: [{ lt: "Padėkoti kaimynei", hint: "thanks" }],
        on: {
          g_thanks: (cc) => { cc.s.pkgThanked = true; if (once(cc, "pkg_thanks")) cc.say("star_react"); },
          thanks_kind: (cc) => { cc.s.pkgThanked = true; if (once(cc, "pkg_thanks")) cc.say(/star|lifesaver|best|sweet/i.test(cc.heard) ? "star_react" : "kind_react"); },
        } });
      return;
    }
    c.say("greet_known");
    c.s.howOpen = true; // "I'm good, thanks" now answers "How's it going?", not "Anything else?"
    expectHowAreYou(c);
  },

  handlers: {
    // --- introductions ---
    moved_in(c) { introduce(c, false); },
    my_name(c) { introduce(c, true); },
    im_name_ctx(c) { introduce(c, true); },
    bare_name_ctx(c) { introduce(c, true); },
    vocative(c) {
      if (/^\s*(hi|hello|hey|good (morning|afternoon|evening))\b/i.test(c.heard) && !c.s.__greetedBack) { c.s.__greetedBack = true; c.say("g_hello"); }
    },

    // --- small talk ---
    from_ans(c, slots) { fromReact(c, slots.country); },
    from_ans_ctx(c, slots) { fromReact(c, slots.country); },
    from_other_ctx(c) { c.say("from_other"); },
    like_ans_ctx(c) { if (!/boxes/i.test(c.heard)) react(c, "like_react"); },
    boxes(c) { react(c, "boxes_react"); },

    // --- the building ---
    ask_trash(c) { building(c); c.say("trash"); c.say("trash_day"); trashTold(c); },
    ask_recycling(c) { building(c); c.say("recycling"); if (!c.s.trashTold) c.say("trash_day"); trashTold(c); },
    ask_trash_day(c) { building(c); c.say("trash_day"); trashTold(c); },
    ask_boxes(c) { building(c); c.say("recycling"); c.say("boxes"); trashTold(c); },
    ask_laundry(c) { building(c); c.say("laundry"); if (c.chance(0.6)) c.say("laundry2"); },
    ask_mail(c) { building(c); c.say(/package|parcel|deliver/.test(c.heard.toLowerCase()) ? "packages_door" : "mail"); },
    ask_parking(c) { building(c); c.say("parking"); },
    ask_internet(c) { building(c); c.say("internet"); },
    ask_quiet(c) { building(c); c.say("quiet"); },
    ask_landlord(c) { building(c); c.say("landlord"); },
    ask_store(c) { building(c); c.say("store"); },
    ask_unknown(c) { c.say("unknown_q"); },
    no_more(c) {
      if (c.s.howOpen) {
        c.s.howOpen = false;
        c.say(/\b(and you|how about you|what about you|yourself|how are you)\b/i.test(c.heard) ? "g_asked_back" : "g_glad");
        return;
      }
      if (!known(c) && !c.s.trashTold) { c.say("fyi_trash"); c.s.trashTold = true; c.s.needsNo = 1; return; }
      c.s.needsNo = (c.s.needsNo ?? 0) + 1;
    },

    // --- favors ---
    ask_favor(c) { c.say("favor_what"); c.hold(); },
    water_plants(c) {
      goal(c, "plants");
      // "next week", "on Friday", "for two weeks" say when; "while I'm away" does not.
      if (/\b(next|tomorrow|weekend|week|weeks|days|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(c.heard)) {
        c.say("plants_key"); if (c.chance(0.5)) react(c, "trip");
        return;
      }
      c.say("plants_when");
      c.expect({ id: "away_when", optional: true, expects: ["away_when_ctx"], hints: ["away"],
        suggest: [{ lt: "Pasakyti, kada išvyksti", hint: "away" }],
        on: { away_when_ctx: (cc) => { cc.say("plants_key"); if (cc.chance(0.5)) cc.say("trip"); } } });
    },
    take_package(c) { goal(c, "package"); c.say("package_ok"); },
    borrow(c, slots) {
      goal(c, "borrow");
      const e = thingById(slots.thing);
      if (e.attrs?.has) { c.say("borrow_yes"); c.say("here_you_go"); c.event("give", { item: e.id }); }
      else c.say("borrow_no", { X: e.id });
    },
    borrow_unknown(c) { goal(c, "borrow"); c.say("borrow_unknown"); },
    away_when_ctx(c) {
      if (c.s.goal === "plants" && !c.s.keySaid) { c.s.keySaid = true; c.say("plants_key"); return; }
      c.say("ack");
    },

    // --- noise ---
    noise_sorry(c) { goal(c, "apology"); react(c, "noise_ok"); },
    noise_reason(c) { react(c, "noise_reason_react"); },
    noise_promise(c) { goal(c, "apology"); if (!SAID.get(c)?.has("noise_ok")) react(c, "noise_thanks"); },
    didnt_know(c) { react(c, "ack"); },
    noise_ask(c) { goal(c, "complain"); c.say("noise_sorry_rita"); if (c.chance(0.5)) c.say("noise_didnt_realize"); c.say("noise_turn_down"); },
    noise_deny(c) { react(c, "ack"); },

    // --- coffee ---
    coffee_yes(c) { if (c.s.coffeePending) askCoffeeTime(c); else c.say("like_react"); },
    coffee_no(c) { if (c.s.coffeeDone && PROPOSES_DAY.test(c.heard)) { react(c, "coffee_other_day"); return; } react(c, c.s.coffeeDone ? "coffee_decline_ok" : "ack"); },
    coffee_day(c) { react(c, "coffee_other_day"); },
    coffee_time_ctx(c, slots) { if (!isTwo(slots.time)) c.say("coffee_other_day"); else c.say("coffee_confirm"); },
    coffee_time_no(c) { c.say(c.s.coffeeTimeAsked ? "coffee_whenever" : "ack"); },
    going_away(c) { react(c, "trip"); },
    invite_coffee(c) {
      c.s.coffeeDone = true;
      c.say("coffee_learner_react");
      c.expect({ id: "coffee_sunday", optional: true, expects: ["coffee_day", "coffee_no", "coffee_yes"], hints: ["sunday"],
        suggest: [{ lt: "Sutarti, kurią dieną susitiksite", hint: "sunday" }],
        on: {
          coffee_day: (cc) => { react(cc, "coffee_other_day"); }, coffee_no: (cc) => { react(cc, PROPOSES_DAY.test(cc.heard) ? "coffee_other_day" : "coffee_whenever"); },
          coffee_yes: (cc) => { cc.say("coffee_confirm"); },
        },
        yes: (cc) => { cc.say("coffee_confirm"); }, no: (cc) => { cc.say("coffee_whenever"); } });
    },

    // --- thanks and goodbye ---
    nice_meet(c) { c.say("you_too"); },
    // "Thanks, that's really kind of you!": one reply (thanks_kind answers it).
    g_thanks(c) { if (!/\bkind\b|nice of you|\bstar\b|lifesaver|the best|so sweet/i.test(c.heard)) c.say("g_welcome"); },
    thanks_kind(c) { react(c, /star|lifesaver|best|sweet/.test(c.heard.toLowerCase()) ? "star_react" : "kind_react"); },
    see_around(c) { c.say("see_around"); c.end(); },
  },

  finish: (c) => {
    if (!known(c) && !c.s.trashTold) { c.say("fyi_trash"); c.s.trashTold = true; }
    maybeComplete(c);
    if (!known(c)) {
      c.say("knock");
      c.say("bye_new");
    } else c.say("g_bye");
    c.expect({ id: "closing", hints: ["bye"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "bye" }],
      on: {
        nice_meet: (cc) => { cc.say("you_too"); cc.end(); },
        see_around: (cc) => { cc.say("see_around"); cc.end(); },
        thanks_kind: (cc, sl, sg) => { neighbor.handlers.thanks_kind(cc, sl, sg); cc.end(); },
        g_thanks: (cc, sl, sg) => { neighbor.handlers.g_thanks(cc, sl, sg); cc.end(); },
        g_bye: (cc) => { cc.say("see_around"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    { say: "Hi! I'm Tomas. I just moved in next door.", intent: "im_name_ctx", step: "intro" },
    { say: "I just moved in next door.", intent: "moved_in" },
    { say: "I'm your new neighbor.", intent: "moved_in" },
    { say: "My name is Tomas.", intent: "my_name" },
    { say: "Tomas", intent: "none" },
    { say: "I'm from Lithuania.", intent: "from_ans", slots: { country: "lithuania" } },
    { say: "Lithuania", intent: "from_ans_ctx", step: "from_q", slots: { country: "lithuania" } },
    { say: "Lithuania", intent: "none" },
    { say: "So far so good!", intent: "like_ans_ctx", step: "like_q" },
    { say: "Where does the trash go?", intent: "ask_trash" },
    { say: "Where do the bins go?", intent: "ask_trash" },
    { say: "Where do I put the rubbish?", intent: "ask_trash" },
    { say: "When is trash day?", intent: "ask_trash_day" },
    { say: "What about recycling?", intent: "ask_recycling" },
    { say: "Where's the laundry room?", intent: "ask_laundry" },
    { say: "Where are the mailboxes?", intent: "ask_mail" },
    { say: "Is there a grocery store nearby?", intent: "ask_store" },
    { say: "Can I ask you a favor?", intent: "ask_favor" },
    { say: "Could you water my plants while I'm away?", intent: "water_plants" },
    { say: "Would you mind watering my plants next week?", intent: "water_plants" },
    { say: "Could you take in a parcel for me on Monday?", intent: "take_package" },
    { say: "Could I borrow your ladder?", intent: "borrow", slots: { thing: "ladder" } },
    { say: "Do you have a drill I could borrow?", intent: "borrow", slots: { thing: "drill" } },
    { say: "Could I borrow some sugar?", intent: "borrow", slots: { thing: "sugar" } },
    { say: "Next Friday", intent: "none" },
    { say: "Sorry about the noise last night.", intent: "noise_sorry" },
    { say: "We had a little party.", intent: "noise_reason" },
    { say: "It won't happen again.", intent: "noise_promise" },
    { say: "Could you turn the music down a little?", intent: "noise_ask" },
    { say: "It wasn't me.", intent: "noise_deny", not: ["noise_sorry"] },
    { say: "I didn't have a party.", intent: "noise_deny", not: ["noise_reason"] },
    { say: "I'd love to!", intent: "coffee_yes", step: "coffee" },
    { say: "Sorry, I'm busy on Sunday.", intent: "coffee_no", not: ["coffee_yes"] },
    { say: "I can't make it on Sunday.", intent: "coffee_no", not: ["coffee_yes"] },
    { say: "I'm not busy on Sunday.", intent: "coffee_yes", not: ["coffee_no"] },
    // a refusal that proposes another day is one answer: another day (never "No worries!" + "See you on Sunday!")
    { say: "I'm busy, sorry. Maybe next week?", intent: "coffee_day", step: "coffee", not: ["coffee_no"] },
    { say: "I'm busy on Sunday. How about Saturday?", intent: "coffee_day", step: "coffee", slots: { day: "saturday" }, not: ["coffee_no"] },
    { say: "Sunday doesn't work for me, how about Saturday?", intent: "coffee_day", step: "coffee", slots: { day: "saturday" } },
    { say: "I can't, maybe another time", intent: "coffee_no", step: "coffee", not: ["coffee_yes", "coffee_day"] },
    { say: "How about Saturday?", intent: "coffee_day", step: "coffee" },
    { say: "Would you like to come over for coffee sometime?", intent: "invite_coffee" },
    { say: "Thanks, that's really kind of you!", intent: "g_thanks" },
    { say: "It was nice to meet you!", intent: "nice_meet" },
    { say: "No, that's all.", intent: "no_more", step: "needs" },
    { say: "purple elephant keyboard", intent: "none" },
    { say: "My car is blue and fast", intent: "none" },
    // wider phrasing (learner English and natural alternatives)
    { say: "Hi, I'm Tomas from next door", intent: "im_name_ctx", step: "intro" },
    { say: "Yes, I live in the apartment next to you", intent: "moved_in" },
    { say: "Call me Tomas", intent: "im_name_ctx", step: "intro" },
    { say: "I'm from Kaunas, it's in Lithuania", intent: "from_ans", slots: { country: "lithuania" } },
    { say: "I was born in Lithuania", intent: "from_ans", slots: { country: "lithuania" } },
    { say: "Lithuania, near Poland", intent: "from_ans_ctx", step: "from_q", slots: { country: "lithuania" } },
    { say: "Good, but I'm tired", intent: "boxes", step: "like_q" },
    { say: "Where can I throw out my trash?", intent: "ask_trash" },
    { say: "What day do they take the garbage?", intent: "ask_trash_day" },
    { say: "Where do I get my post?", intent: "ask_mail" },
    { say: "I'm going away next week. Could you water my plants?", intent: "water_plants" },
    { say: "I'm waiting for a package on Monday. Can you take it?", intent: "take_package" },
    { say: "I need a drill. Do you have one?", intent: "borrow", slots: { thing: "drill" } },
    { say: "Sorry, was the music too loud?", intent: "noise_sorry" },
    { say: "Can you turn down the music?", intent: "noise_ask" },
    { say: "I will use headphones", intent: "noise_promise" },
    { say: "Thank you for the invitation", intent: "coffee_yes", step: "coffee" },
    // meaning must not flip
    { say: "Thanks, but I work on Sunday", intent: "coffee_no", step: "coffee", not: ["coffee_yes"] },
    { say: "I'd love to, but I'm busy on Sunday", intent: "coffee_no", step: "coffee", not: ["coffee_yes"] },
    { say: "Sunday is not good for me", intent: "coffee_no", step: "coffee", not: ["coffee_yes"] },
    { say: "Two is not good for me", intent: "coffee_time_no", not: ["coffee_time_ctx"] },
    { say: "Really? I was not at home", intent: "noise_deny", not: ["noise_sorry"] },
    { say: "It wasn't loud", intent: "noise_deny", not: ["noise_sorry"] },
    { say: "I'm not expecting a package", intent: "none" },
  ],

  // A first meeting (Rita doesn't know the learner yet) unless the sim says otherwise. Rita's coffee
  // invitation is pinned on where the script answers it, off where it doesn't. Rita closes right after
  // granting a favor, so the learner's thanks and goodbye are one closing turn.
  sims: [
    { name: "first meeting, plants", turns: ["Hi! I'm Tomas. I just moved in next door.", "Where does the trash go?", "Could you water my plants next week?",
      "I'd love to!", "Yes, two is perfect.", "It was nice to meet you!"], expect: { complete: true }, auto: AUTO,
      setup: (s) => { FIRST_VISIT(s); s.coffeeInvite = true; } },
    { name: "apology for the noise", turns: ["Hi, I'm your new neighbor.", "Sorry about the noise last night. We had a little party.",
      "Thanks, that's really kind of you!", "Sorry, I'm busy on Sunday.", "Bye!"], expect: { complete: true }, auto: AUTO,
      setup: (s) => { FIRST_VISIT(s); s.coffeeInvite = true; } },
    { name: "questions, then borrow a ladder", turns: ["Hello! I just moved in.", "Tomas.", "Where's the laundry room?", "When is trash day?",
      "Could I borrow your ladder?", "Thank you so much! See you around!"], expect: { complete: true }, auto: AUTO,
      setup: (s) => { FIRST_VISIT(s); s.coffeeInvite = false; } },
    // A later visit: Rita knows the learner, no complaint or package twist, no coffee invitation.
    { name: "asking Rita to be quieter", turns: ["Hi, Rita!", "Could you turn the music down a little?", "Thanks, bye!"], expect: { complete: true }, auto: AUTO,
      setup: (s) => { s.known = true; s.complaint = false; s.pkgTwist = false; s.coffeeInvite = false; } },
    { name: "plants while away, then when", turns: ["Hi, I'm your new neighbor.", "Could you water my plants while I'm on vacation?", "On Saturday.",
      "Thanks, that's really kind of you! See you around!"], expect: { complete: true }, auto: AUTO,
      setup: (s) => { FIRST_VISIT(s); s.coffeeInvite = false; } },
    // The twist on every seed: Rita complains about the music. A favor first doesn't finish the task; Rita asks
    // again, and the apology settles it (bug fix 27 Sep: the favor completed it with the complaint unanswered).
    { name: "complaint (twist): a favor first, then sorry", turns: ["Could I borrow your ladder?", "Oh, I'm so sorry! It won't happen again.", "Thanks, bye!"],
      expect: { complete: true }, auto: AUTO, setup: (s) => { s.known = true; s.complaint = true; s.pkgTwist = false; s.coffeeInvite = false; } },
  ],
};

// ---------------------------------------------------------------------------
// Handler helpers (hoisted function declarations)

function introduce(c: Ctx, named: boolean) {
  if (known(c)) { if (!c.s.knownSaid) { c.s.knownSaid = true; c.say("known_already"); } return; }
  if (c.s.introduced) {
    if (named && !c.s.named) { c.s.named = true; c.say("nice_meet_short"); }
    return;
  }
  c.s.introduced = true;
  maybeComplete(c);
  if (named) { c.s.named = true; c.say("rita_nice"); c.say("rita_welcome"); return; }
  c.say("rita_welcome"); c.say("rita_whats_name");
  c.expect({ id: "name", optional: true, expects: ["im_name_ctx", "my_name", "bare_name_ctx"], hints: ["name"],
    suggest: [{ lt: "Pasakyti savo vardą", hint: "name" }],
    on: {
      im_name_ctx: (cc) => { cc.s.named = true; cc.say("nice_meet_short"); },
      my_name: (cc) => { cc.s.named = true; cc.say("nice_meet_short"); },
      bare_name_ctx: (cc) => { cc.s.named = true; cc.say("nice_meet_short"); },
    } });
}

function fromReact(c: Ctx, country?: string) {
  c.s.fromAsked = true;
  if (c.s.fromSaid) return;
  c.s.fromSaid = true;
  c.say(COUNTRIES.find((e) => e.id === country)?.attrs?.lt ? "from_lt" : "from_other");
}

function trashTold(c: Ctx) { c.s.trashTold = true; maybeComplete(c); }

function building(c: Ctx) {
  c.s.qCount = (c.s.qCount ?? 0) + 1;
}

/** Rita's complaint about the music: asked again once if the learner talks about something else, then dropped. */
function expectComplaint(c: Ctx, optional: boolean) {
  c.expect({ id: "complaint", optional, expects: ["noise_sorry", "noise_promise", "didnt_know", "noise_deny", "noise_reason", "g_sorry"], hints: ["noise"],
    suggest: [{ lt: "Atsiprašyti ir pažadėti būti tyliau", hint: "noise" }],
    on: {
      noise_sorry: (cc) => { acceptApology(cc); }, noise_promise: (cc) => { acceptApology(cc); }, didnt_know: (cc) => { acceptApology(cc); },
      g_sorry: (cc) => { acceptApology(cc); }, noise_reason: (cc) => { acceptApology(cc); },
      noise_deny: (cc) => { cc.s.complaintDone = true; react(cc, "deny_react"); maybeComplete(cc); },
    },
    yes: (cc) => { acceptApology(cc); }, no: (cc) => { cc.say("oh_okay"); },
    ask: optional ? undefined : (cc) => { cc.say("complain3"); expectComplaint(cc, true); } });
}

function acceptApology(c: Ctx) {
  c.s.complaintDone = true;
  if (c.s.goal === "apology") return;
  goal(c, "apology");
  react(c, "noise_thanks");
}

function askCoffeeTime(c: Ctx) {
  if (c.s.coffeeTimeAsked) return;
  c.s.coffeeTimeAsked = true;
  c.say("coffee_time");
  c.expect({ id: "coffee_time", optional: true, expects: ["coffee_time_ctx", "coffee_day"], hints: ["coffee_time"],
    suggest: [{ lt: "Sutikti dėl laiko arba pasiūlyti kitą", hint: "coffee_time" }],
    on: {
      coffee_time_ctx: (cc, sl) => { if (!isTwo(sl.time)) cc.say("coffee_other_day"); cc.say("coffee_confirm"); },
      coffee_day: (cc) => { cc.say("coffee_other_day"); cc.say("coffee_confirm"); },
      coffee_time_no: (cc) => { cc.say("coffee_whenever"); },
    },
    yes: (cc) => { cc.say("coffee_confirm"); }, no: (cc) => { cc.say("coffee_whenever"); } });
}

/** Rita suggested two o'clock: "Two is perfect" agrees, another time is a new suggestion. */
function isTwo(time: any) {
  return !!time && time.m === 0 && (time.h === 2 || time.h === 14);
}

export default neighbor;
