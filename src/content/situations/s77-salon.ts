// Song 77 "Just a Trim" · Snip & Style salon · hairdresser Jessie (chatty, loves her cat Mochi).
// American salon routine: "Do you have an appointment?" / walk-ins, "What are we doing today?",
// "How much should I take off?" in inches (1 inch ≈ 2.5 cm; centimeters are accepted and converted),
// bangs (British "fringe" accepted with a tip), layers, a wash with "How's the water temperature?",
// small talk, blow-dry straight or with waves, "Take a look. What do you think?", "How much do I owe
// you?", tipping 15–20% (the card screen asks, or "Keep the change"), booking the next appointment.
// Twist (visits ≥ 1): Jessie took off more than agreed; the learner reacts politely.
// Guide: small-talk questions have their own answer groups per topic; the twist suggests a polite
// reaction first; leaving ("I'll come back later") is offered as the alternative, not a model answer.

import type { Ctx, Pending, SituationDef } from "../types";
import { t } from "../dsl";
import { expectHowAreYou } from "../global";

// ---------------------------------------------------------------------------
// Prices (cents)

const CUT = 3500, WASH = 500, DRY = 500, BANGS = 1500, SORRY_OFF = 1000;

function total(c: Ctx): number {
  let p = c.s.service === "bangs" ? BANGS : CUT;
  if (c.s.wash) p += WASH;
  if (c.s.blowdry) p += DRY;
  if (c.s.discount) p -= SORRY_OFF;
  return p;
}

const inchesFromTags = (tags: string[]): number | undefined => {
  if (tags.includes("in05")) return 0.5;
  if (tags.includes("in1")) return 1;
  if (tags.includes("in15")) return 1.5;
  if (tags.includes("in2")) return 2;
  if (tags.includes("in3")) return 3;
  return undefined;
};

const FLAG_DO = "Question “Do” = the particle ar.";
const FLAG_WOULD = "“Would” in a yes/no question = the particle ar; the conditional sits on the verb.";
const FLAG_OFF = "“off” has no separate word: the prefix nu- of the verb carries it.";

const AUTO: Record<string, string> = {
  appt: "Yes, I have an appointment at three.", name: "It's Tomas.", wait_q: "Sure, I can wait.", drink: "No, thanks.",
  service: "Just a trim, please.", length: "Just an inch, please.", cm_q: "Yes, that's right.", layers: "Yes, please.", bangs_q: "No, thanks.",
  wash: "Yes, please.", water: "It's perfect.", chat: "That's so funny!", blowdry: "Yes, please.", style: "Straight, please.",
  chat_weekend: "Not really, just relaxing.", chat_from: "I'm from Lithuania.", chat_vacation: "I'm going to Florida this summer.", chat_pets: "I have a dog.",
  reveal: "I love it!", more_q: "Perfect, thank you!", pay: "Card, please.", tip_q: "I'll add twenty percent.", book: "No, thanks.", book_when: "In six weeks, please.",
};

// ---------------------------------------------------------------------------

export const salon: SituationDef = {
  id: "s77-salon",
  song: 77,
  songTitle: "Just a Trim",
  title: { en: "Just a Trim", lt: "Tik truputį patrumpinkite" },
  topic: { en: "At the hair salon", lt: "Kirpykloje" },
  chapter: 3,
  order: 7,
  location: "salon",
  npc: "jessie",
  goal: "Pasakyk kirpėjai, ką nori, ir susimokėk.",
  intro: "„Snip & Style“ – kirpykla pagrindinėje gatvėje. Jūsų vizitas – trečią valandą. Kirpėja Jessie mėgsta pasikalbėti – ypač apie savo katę Mochi.",

  merges: {
    "a bit": { reason: "lexical_expression", split: "a → — + bit → gabalėlis gives a false “piece”; the degree adverb = truputį.", minimal: "Two words (C-LEX)." },
    "a little": { reason: "lexical_expression", split: "a → — + little → mažas gives a false “small”; the degree adverb = truputį.", minimal: "Two words (C-LEX)." },
    "take a look": { reason: "lexical_expression", split: "take → imkite + a → — + look → žvilgsnį is a calque; = pažiūrėkite.", minimal: "All three words." },
    "let's start": { reason: "grammatical_fusion", split: "Let's → leiskime + start → pradėti is a calque; the first person plural imperative = pradėkime.", minimal: "Two words (C-LEX)." },
    "you're in luck": { reason: "lexical_expression", split: "You're → jūs esate + in → — + luck → sėkmė is a literal picture; = jums pasisekė.", minimal: "All three words." },
    "come on back": { reason: "lexical_expression", split: "come → ateikite + on → ant + back → atgal is false; inviting a client in = prašom čia.", minimal: "All three words." },
    "i've got": { reason: "grammatical_fusion", split: "I've → aš turiu + got → gavau would double the verb; “have got” = turiu.", minimal: "Two words." },
    "you're all set": { reason: "lexical_expression", split: "You're → jūs esate + all → visi + set → nustatyti is false; = viskas sutvarkyta.", minimal: "All three words." },
    "coming in": { reason: "lexical_expression", split: "coming → ateinant + in → į; visiting a shop = užsukti.", minimal: "Two words (C-PHR)." },
    "took off": { reason: "lexical_expression", split: "took → paėmiau + off → nuo is false; cutting hair off = nukirpau.", minimal: "Two words (C-PHR)." },
    "take off": { reason: "lexical_expression", split: "take → imti + off → nuo is false; cutting hair off = nukirpti.", minimal: "Two words (C-PHR)." },
    "let me take": { reason: "lexical_expression", split: "let → leiskite + me → man + take → imti is a calque; offering a discount = nuimsiu.", minimal: "All three words; the object stays outside." },
    "will ask": { reason: "grammatical_fusion", split: "“will” has no separate word: the future ending of paklaus carries it.", minimal: "Two words (C-FUT)." },
    "all done": { reason: "lexical_expression", split: "all → visi + done → padaryti is false; finishing a job = viskas baigta.", minimal: "Two words." },
    "i'll be right with you": { reason: "lexical_expression", split: "I'll be → būsiu + right → tiesiai + with you → su jumis is a literal reading; the service formula = tuoj ateisiu.", minimal: "The whole formula." },
    "let's do": { reason: "grammatical_fusion", split: "Let's → leiskime + do → daryti is a calque; the first person plural imperative = padarykime.", minimal: "Two words (C-LEX)." },
    "checked in": { reason: "lexical_expression", split: "checked → patikrintas + in → į is false; at a reception, “checked in” = užsiregistravęs / užregistruotas.", minimal: "Two words (C-PHR)." },
    "you got it": { reason: "lexical_expression", split: "you → jūs + got → gavote + it → tai is a literal reading of a service formula (= bus padaryta).", minimal: "All three words." },
    "snip & style": { reason: "lexical_expression", split: "The salon's name; snip → kirpt + & → ir + style → stilius would translate a brand word by word.", minimal: "Proper name." },
    "sure thing": { reason: "lexical_expression", split: "sure → tikras + thing → daiktas is false; the cheerful yes = žinoma.", minimal: "Two words." },
    "hanging out": { reason: "lexical_expression", split: "hanging → kabantis + out → lauk is false; “hang out” = leisti laiką.", minimal: "Two words (C-PHR)." },
    "right here": { reason: "lexical_expression", split: "right → dešinėje/teisingai + here → čia is false; the intensifier = čia pat.", minimal: "Two words." },
  },

  grammar: {
    macros: {
      deg: "(a little | a bit | a little bit | kind of | way | really | just a little | just a bit | much | slightly)",
      howmuch: "(an inch #in1 | one inch #in1 | half an inch #in05 | a half inch #in05 | half inch #in05 | an inch and a half #in15 | one and a half inches #in15 | two inches #in2 | a couple of inches #in2 | a couple inches #in2 | three inches #in3 | a few inches #in3 | {n:number} inches #inN)",
      cm: "{c:number} (centimeters | centimetres | centimeter | centimetre | cm | centimeters off) #cm #tip:uk_cm",
      it_hair: "(it | my hair | the hair | this)",
    },
  },

  intents: {
    // --- check-in ------------------------------------------------------------------------------
    appt_have: { patterns: [
      "[yes] i have an appointment [at {time}] #h:appt_at", "[yes] i have a {time} [appointment]", "[yes] i am (here for | booked for) (my | an | a) [{time}] appointment [at {time}]",
      "[yes] (my | the) appointment is at {time}", "[yes] i booked (an appointment | a haircut) [for {time} | at {time}]", "[yes] i am your {time} [appointment]",
      "[yes] i have an appointment with (you | jessie)", "[yes] i am here for a haircut at {time}",
      "[yes] i am here for my {time} [appointment]", "[yes] i am (booked | scheduled) (for | at) {time}", "[yes] i am (on the list | booked) [for today]",
      "[yes] (at | for) {time}", "[yes] i booked [an appointment | a haircut] (for | at) {time}", "i (made | booked) (an | the | my) appointment (online | by phone | on the phone | yesterday | last week | on the website)",
      "[yes] i have a (reservation | booking) [at {time} | for {time}]", "[yes] (for | i am here for) a (haircut | trim | cut) at {time}", "[yes] (with you | with jessie) at {time}",
      "[yes] i called (yesterday | last week | before) [to book]",
    ] },
    appt_none: { patterns: [
      "[no] i do not have an appointment #h:no_appt", "[no] no appointment", "[no] i did not book [an appointment]", "[no] i am a walk in", "[no] i just walked in",
      "[no] i do not have (one | a reservation | a booking)", "[no] i did not (make | have) (one | an appointment)",
    ] },
    walkin: { patterns: [
      "(do you | can you) take walk ins #h:walkin", "do you accept walk ins", "(can | could) i (get | have) a haircut (now | today | right now) [without an appointment]",
      "do you have (time | an opening | any openings) [now | today | right now]", "(can | could) you fit me in [today | now]", "are you free (now | right now)",
      "do you have (time | an opening | a spot | room) for (a haircut | a trim | a cut | me) [now | today | right now]", "(can | could) i (get | have) a (trim | cut) (now | today | right now) [without an appointment]",
      "are you free for a (haircut | trim | cut) [now | today | right now]",
      "(can | could) you (take | fit) me [in] (now | today | right now)", "is it possible [to come] without (an)? appointment", "(can | could) i come without (an)? appointment",
    ] },
    name_ctx: { patterns: ["[it is | my name is | the name is | i am | under] {name} #h:name_its", "(my name is | it is) {name} #h:name_mine", "[it is] under {name}",
      "(the | my) appointment (is | should be) under {name}", "it (should be | is | might be) under [the name] {name}", "[yes] i do [have (one | an appointment)] (it is | the name is | my name is) [under] {name}"] },
    wait_ok: { patterns: ["[sure | yes | okay] i (can | will) wait #h:wait_ok", "[yes] (that is | fifteen minutes is) (fine | okay | no problem) #h:wait_fine", "no problem i will wait",
      "[yes | no] i do not mind (waiting | at all)", "[sure] i will wait (here | over there | a bit)"] },
    wait_no: { patterns: ["[no] i (can not | do not have time to) wait", "[no] i will come back (later | another time | tomorrow) #h:wait_later", "[no] that is too long"] },

    // --- drink offer -------------------------------------------------------------------------
    drink_ans: { patterns: [
      "[yes] (some water #h:drink_water | water #h:drink_water | a glass of water #h:drink_water | a coffee #h:drink_coffee | coffee #h:drink_coffee | some coffee #h:drink_coffee | tea | a tea | some tea) [would be (great | nice | lovely)] [please]",
      "[yes] (can | could) i (have | get) (some water | a glass of water | a coffee | some coffee | some tea | a tea)", "[yes] i would love (a coffee | some water | some tea | a glass of water)",
      "do you have (any | some) (water | coffee | tea)",
    ] },

    // --- what we're doing today ----------------------------------------------------------------
    trim: { patterns: [
      "[just] a trim #h:just_trim", "i (would like | want | need) [just] a trim", "(can | could) i (get | have) [just] a trim", "[just] a little trim",
      "just (the ends | a little off the ends) #h:just_ends #ends", "[just] (trim | cut) the ends", "i (would like | want) to (keep | maintain) the length", "[just] a (quick | small | little | light) trim",
      "i (just | only) want (it | my hair) trimmed", "just clean it up [a little | a bit]", "(can | could) you [just] (trim | cut) the ends #ends",
      "(just | only) the ends #ends", "[the] same as (last time | before | always | usual)", "the usual [please]", "i want the same (style | haircut | cut) [but | just] [a little | a bit] shorter",
      "[just] keep (the | my) (style | shape) [and] [make it | cut it] [a little | a bit] shorter", "[a] trim [but] keep the length", "[but] keep the length",
    ] },
    haircut: { patterns: [
      "i (would like | want | need) a haircut #h:haircut", "(can | could) i (get | have) a haircut", "[i am here for] a haircut", "i (would like | want) to (get | have) my hair cut",
      "(a | just a) (cut | haircut) [please]", "i need a cut", "i (would like | want | need) to cut my hair", "i want my hair cut",
      "(can | could) you do something with my hair", "[i need | i would like] (a | an)? (mens | womens | kids) (haircut | cut)",
    ] },
    go_short: { patterns: [
      "i (would like | want) to (go | cut it) (shorter | short | much shorter)", "(can | could) you cut it (short | shorter | really short)", "something (shorter | short)",
      "i (would like | want) (a short haircut | short hair | a new look | something new | a big change)", "i am ready for a change",
      "i (want | would like) it (shorter | short | a lot shorter | much shorter)", "(make | cut) it (shorter | short) [please]",
      "something (shorter | short) for the summer", "i (would like | want) a new (haircut | style | look) [something (modern | different | new)]", "something (modern | different | new)",
      "i (want | would like) to change my (hairstyle | hair | look | style)", "[i would like | i want] (a | an)? (bob | buzz cut | crew cut | pixie cut | pixie | undercut)",
    ] },
    bangs_only: { patterns: [
      "[just] (my | the) bangs [please] #bangs", "(can | could) you (trim | cut) my bangs #h:bangs_trim #bangs", "i (would like | need) (my bangs trimmed | a bangs trim) #bangs",
      "[just] (my | the) fringe [please] #bangs #tip:uk_fringe", "(can | could) you (trim | cut) my fringe #bangs #tip:uk_fringe", "just a bangs trim #bangs",
      "[yes | sure] (trim | cut) (them | the bangs | my bangs) [too | as well | a little] #bangs",
    ] },
    photo: { patterns: [
      "(can | could) you (cut | do) (it | my hair) like (this | this photo | this picture | in this photo | in this picture) #h:photo", "i (would like | want) (it | my hair) like (this | this photo | this picture)",
      "(something | this) like this [photo | picture]", "i have a (photo | picture)", "can you do this (style | look)",
      "(can | could) you make (it | my hair) look like (this | this photo | this picture | the photo | the picture)", "(like | same as) (this | the) (photo | picture | one)",
    ] },
    not_short: { patterns: [
      "[but | please] not too short [though | please] #h:not_short", "(please | but) (do not | don't) (make it | cut it) too short", "i do not want it (too | very)? short", "not (much | too much) [please]",
      "i (like | want to keep) (the | my) length", "(do not | don't) take (off | too much off)",
    ] },

    // --- how much off --------------------------------------------------------------------------
    length: { patterns: [
      "[just | only | about | maybe | around] @howmuch [off] [please] #h:inch", "(take | cut) [off] [just | about] @howmuch [off]", "(can | could) you (take | cut) [off] [just | about] @howmuch [off]",
      "[just | only | about | maybe] @cm [off] [please]", "(take | cut) [off] [just | about] @cm [off]",
      "[just] (a little | a bit | a tiny bit | not much | not too much) #small #h:a_little", "[just] take (a little | a bit) off [the ends]", "[just] (take | cut) a little off (the sides | the back) #sides #h:sides",
      "(take | cut) [just] a little off the (sides | top | back) #sides", "a little off the (sides | top | back) #sides",
      "(short | shorter) on the sides [[and] (longer | long) on top] #sides", "(an inch | one inch) or two [inches] #in15", "one or two inches #in15",
      "[about | maybe | around | approximately] {c:number} or {c2:number} (centimeters | centimetres | cm) #cm #tip:uk_cm", "(around | approximately) @cm [off]", "(around | approximately) @howmuch [off]",
      "(only | just) (a little | a bit | a tiny bit | a little bit) #small", "(only | just) (a little | a bit) shorter #small", "[just] (a little | a bit) shorter #small",
      "(short | shorter) (at | on) the (back and sides | sides and back) #sides", "(not more than | no more than | maximum | max) (@cm | @howmuch)", "[just | only] (a | one) (centimeter | centimetre) #cm #c1 #tip:uk_cm",
    ] },

    confirm_yes: { patterns: ["[yes] that is (right | correct | perfect | great | good | fine | okay) [thanks]", "[yes] about an inch is (fine | good | perfect)", "[yes] exactly"] },
    wash_request: { patterns: [
      "(can | could) i (get | have) a wash [too | first | as well]", "i would like a wash [too | first | as well]", "[a] wash and (a trim | a cut | cut | a haircut) [please] #trim",
      "i would like a wash and (a trim | a cut | cut | a haircut) #trim", "(a trim | a haircut) and a wash [please] #trim", "(can | could) you wash (it | my hair) [first]",
      "[yes] a wash would be (nice | great | good | lovely)",
    ] },

    // --- extras --------------------------------------------------------------------------------
    keep_layers: { patterns: ["[yes] keep the layers", "[yes] i (like | want to keep) my layers", "[yes] layers (please | would be nice)", "[yes] i would like (some | a few) layers",
      "[yes] keep (them | my layers)", "[yes] (i want | i would like) to keep (them | the layers)"] },
    no_layers: { patterns: ["[no] no layers [please | thanks]", "[no] i do not (want | like | need) layers", "[no] (keep it | just) one length"] },

    // --- wash and water ------------------------------------------------------------------------
    water_temp: { patterns: [
      "(it is | the water is | that is) [@deg] (too hot #hot | too cold #cold | hot #hot | cold #cold | warm #hot | freezing #cold | chilly #cold) #h:too_hot",
      "[@deg] too (hot #hot | cold #cold)", "[@deg] (hotter | warmer) [please] #cold", "[@deg] (cooler | colder) [please] #hot", "(can | could) you make it [@deg] (cooler | colder #hot | warmer | hotter #cold)",
      "(can | could) it be [@deg] (warmer #cold | hotter #cold | cooler #hot | colder #hot)",
    ] },
    water_ok: { patterns: [
      "(it is | that is | the water is) (perfect | great | fine | good | nice | just right | okay) #h:water_ok", "[that is] (much | a lot) better", "[yes] that is better", "[it is] just right",
      "[it is] (nice | good | lovely) and warm", "(the)? (water | temperature) is (perfect | fine | good | nice)",
    ] },
    // "No, I washed it this morning." to "Would you like a wash first?"
    no_wash: { patterns: ["[no] i (washed | have washed) (it | my hair) (this morning | today | at home | already)", "[no] my hair is [already] clean", "[no] no wash [thanks | today]"] },

    // --- blow-dry and style ------------------------------------------------------------------
    style: { patterns: [
      "[just] straight [please] #straight #h:straight", "[with] [some | a little | a bit of] (waves #waves #h:waves | curls #waves | volume #volume #h:volume) [please]", "[just] (natural | natural please) #natural",
      "(straight | wavy | curly) (please | is good | is great)",
      "(can | could) you (dry | blow dry | do) it straight #straight", "i would like it (straight #straight | wavy #waves | curly #waves | with some volume #volume | with volume #volume | natural #natural)",
      "i will let it air dry #nodry #h:no_blowdry", "[no] no blow dry [thanks] #nodry", "just (towel dry | air dry) [please] #nodry", "(straight | wavy) is fine",
      "i (prefer | like) (it)? (straight #straight | wavy #waves | natural #natural | curly #waves)", "(a little | a bit | slightly) (wavy | curly) #waves",
    ] },

    // --- the result ----------------------------------------------------------------------------
    love_it: { patterns: [
      "i (really | absolutely) love it", "i love it #h:love_it", "(it | this | my hair) looks (great | amazing | fantastic | really good | perfect | beautiful | so good) #h:looks_great",
      "it is (perfect | great | amazing | exactly what i wanted | so nice)", "i (really) like it", "wow", "(it | this) is (really | so) nice", "perfect [thank you]",
      "[yes] very nice", "i look (younger | great | amazing | so different | fantastic | beautiful)", "(beautiful | gorgeous | amazing | fantastic | wonderful | lovely | excellent)",
      "i like it (very much | a lot | so much)", "(that is | it is)? (much | a lot | way) better [now]", "(it is | that is) (very | really)? good",
      "it is (nice | lovely | great) [thank you]", "(good | great | nice | amazing) (job | work)", "i am (very | so | really)? happy [with it]",
    ] },
    more_off: { patterns: [
      "(can | could) you (take | cut) [off] (a little | a bit | a little bit) more [off] [on the sides | at the back | on top] #h:more_off",
      "(a little | a bit) more [off] [please]", "(can | could) you make it (a little | a bit) shorter", "[a little] shorter [please]", "can you cut (a little | a bit) more",
      "[a little | a bit] shorter on (top | the sides | the back)", "(can | could) you (fix | even out | clean up) the (back | sides | top) [a little | a bit]",
    ] },
    shorter_than: { patterns: [
      "(it is | that is) [@deg] shorter than i (expected | wanted | thought) #h:shorter", "(it is | that is) [@deg] (too short | shorter) #h:shorter",
      "(oh) it is (so | very | really) short", "(it is | that is) not what i (expected | wanted)", "(it is | that is) different", "hmm it is different", "that is more than an inch",
    ] },
    polite_ok: { patterns: [
      "(it is | that is) (okay | fine | all right) [it will grow back] #h:grow_back", "it will grow back #h:grow_back", "(do not | don't) worry [about it]", "no (problem | worries)",
      "i (still | actually) like it #h:still_like", "it (still | actually) looks (good | nice | great)", "(it is | that is) (okay | fine) i like it",
    ] },
    dont_like: { patterns: ["i do not like it #blunt", "i hate it #blunt", "(it is | that is) (terrible | awful | horrible) #blunt",
      "(it | this) (does not | do not) look (good | nice | right) #blunt", "i do not like (it | this | the haircut) (very much | so much)"] },

    // --- small talk ----------------------------------------------------------------------------
    react_funny: { patterns: [
      "(that is | that is so | how | so) (funny #h:funny | cute #h:cute | sweet | hilarious | adorable | crazy | smart)", "(oh no | oh my god | oh my gosh | no way | haha | ha ha | lol | wow | seriously)",
      "[haha | wow] (really | no way)", "cats are [so | really] (funny | smart | crazy | cute)", "[wow] (such a | so | very)? smart (cat | kitty)", "(that is | how) (amazing | awesome | great | cool)",
      "[oh no] poor (you | thing | kitty)", "(your cat | she | mochi) (is | sounds | seems) [so | very | really] (cute | funny | smart | crazy | sweet | clever)",
      "(she | your cat) sounds (funny | cute | smart | crazy)", "what a (cat | funny cat | smart cat)",
    ] },
    ask_cat: { patterns: ["what is your cats name #h:cat_name", "what is (her | his | its | the cats) name", "what is the cat called", "what is your cat called", "(is it | is she) a (boy | girl)",
      "(is it | is your cat) a boy or a girl", "how old is (she | your cat | the cat)"] },
    pets_ans: { patterns: [
      "[yes] i have a (dog #dog #h:pet | cat #cat #h:pet_cat | cats #cat | dogs #dog | fish #other | parrot #other | rabbit #other | hamster #other) [too]", "[yes] (a dog #dog | a cat #cat | two cats #cat | two dogs #dog)",
      "[no] i do not have (any pets | a pet | pets) #nopet #h:no_pets", "[no] no pets #nopet",
      "[yes] i have a (dog #dog | cat #cat) and a (dog | cat)", "[yes] [a | one] (small | little | big | old) (dog #dog | cat #cat)", "(my kids have | my children have | we have) a (hamster #other | dog #dog | cat #cat | fish #other | rabbit #other)",
      "[no] not anymore #nopet", "my cat does (that | the same | this) too #cat", "[yes] (a dog #dog | a cat #cat) (named | called) {name}",
    ] },
    weekend_ctx: { patterns: [
      "[yes] i am going to (a party #party | the beach | a wedding #party | a concert | the mountains | a birthday party #party | a friend's party #party) [this weekend | on saturday | tonight | later] #h:party",
      "[yes] i have (a party #party | a date | a wedding #party | plans) [this weekend | tonight | later | on saturday]", "[yes] i am meeting (friends | my friends | some friends) #h:friends",
      "not (really | much) [just relaxing | just resting] #relax #h:relax", "[no] (nothing special | nothing much) #relax", "[just] (relaxing | resting | staying home) #relax",
      "i am (working | staying home | relaxing) [this weekend] #relax", "[yes] i am going (hiking | to the beach | shopping | out) [this weekend | on saturday | on sunday | tomorrow]",
      "i have to work [this weekend | on saturday] #relax", "(we are | i am) going (camping | fishing | hiking | swimming | shopping | dancing) [this weekend]",
      "my (daughter | son | friend | sister | brother | mom | dad) has a (birthday | party | birthday party | wedding) #party", "i am going to (visit | see) (my friends | friends | my family | my parents)",
      "(we have | i have) a (family dinner | dinner | barbecue | bbq | family party) #party", "[just] [some] shopping", "[yes] a (wedding | party | birthday party) (on saturday | this weekend | on sunday | tonight) #party",
    ] },
    weekend_unknown: { patterns: ["[yes] i am going to {w:any}", "[yes] i am (visiting | seeing) {w:any}", "[yes] i will {w:any}", "i (want | would like | hope) to (go | travel) to {w:any}"] },
    from_ans: { patterns: [
      "i am from (lithuania | vilnius | kaunas | klaipeda) #lt #h:from_lt", "[i am from] (lithuania | vilnius | kaunas | klaipeda) #lt", "i come from (lithuania | vilnius | kaunas) #lt",
      "i am from (europe | poland | latvia | germany) #eu", "i am not from here", "i (just | recently) moved here [from lithuania #lt] #h:from_moved", "i live here [now]",
      "[i am] from (vilnius | kaunas | klaipeda) in lithuania #lt", "i am lithuanian #lt", "[i am] originally from (lithuania | vilnius | kaunas | klaipeda) #lt",
      "i came [here] from lithuania [{n:number} years ago] #lt", "(but)? i am from lithuania #lt", "[i am from] lithuania [it is] in (europe | northern europe) #lt",
    ] },
    vacation_ctx: { patterns: [
      "[yes] i am going to (florida | new york | california | lithuania | europe | mexico | the beach | the mountains) [this summer | in the summer | next month] #h:vacation",
      "[yes] i am visiting (my family | my parents | lithuania | friends) [in lithuania] [this summer] #h:vac_family", "not yet #relax #h:vac_not_yet", "[no] (not really | no plans) [yet] #relax",
      "(we are | i am) going [home] to lithuania [this summer]", "[no] not this year #relax", "(florida | new york | california | lithuania | europe | mexico | italy | spain | hawaii | canada | paris | london | greece) [maybe | i think]",
      "i (want | would like | hope) to (go | travel) to (florida | new york | california | lithuania | europe | mexico | italy | spain | hawaii | canada | greece)",
    ] },
    ask_jessie: { patterns: ["and you", "what about you", "how about you", "(are you | do you have) (doing anything | any plans) [this weekend]", "and yourself"] },

    // --- paying, tip, next time ----------------------------------------------------------------
    ask_owe: { patterns: [
      "how much do i owe you #h:owe", "what do i owe you", "how much (is it | is that | was that | do i pay)", "what is the (total | price)", "how much",
      "how much is (a | the) (trim | haircut | cut)", "how much for (a | the) (trim | haircut | wash)", "how much (with | including) the tip",
    ] },
    pay_card: { patterns: [
      "[can | could] i pay (by | with) (card | credit card | debit card | my card | credit) #h:pay_card", "(by | with) card", "card #h:pay_card_short",
      "(i will | i would like to | i am going to) pay (by | with) card", "do you (take | accept) (cards | credit cards | card | visa | mastercard)", "can i (use | tap) my card", "[a] (credit | debit) card",
      "(visa | mastercard | amex | american express)",
    ] },
    pay_cash: { patterns: ["[can | could] i pay (in | with) cash", "(in | with) cash", "cash", "(i will | i would like to | i am going to) pay (in | with) cash #h:pay_cash", "i will pay cash"] },
    pay_phone: { patterns: ["(can | could) i pay (with | by) (my phone | apple pay | google pay | phone)", "do you (take | accept) (apple pay | google pay)", "apple pay", "google pay",
      "(i will | i would like to | i am going to | i want to) pay (with | by) (my phone | phone | apple pay | google pay)"] },
    here_you_go: { patterns: ["here you (go | are) #h:here_you_go", "there you go", "here it is", "here is my card", "here is {price}", "here is (the | my) money", "here is (fifty | forty | sixty) [dollars]"] },
    keep_change: { patterns: ["keep the change #h:keep_change", "you can keep the change", "keep it", "(this | that) is for you #h:for_you", "here is a tip [for you]", "the rest is for you"] },
    add_tip: { patterns: [
      "(can | could) i add a tip #h:add_tip", "i (would like to | will | want to) (add | leave) a tip", "(i will | let me) (add | leave) {p:number} percent #h:tip_percent",
      "{p:number} percent [tip] #h:tip_20", "{p:number} percent is fine #h:tip_15", "i will tip {p:number} percent", "(i will | let me) add {price} [for the tip | tip]", "[yes] i will add a tip",
      "[and] (add | leave) a tip", "{price} (tip | for the tip | for you)", "(a | the) {price} tip", "[the] {p:number} percent (option | button)",
    ] },
    // "No tip, sorry." on the card screen
    no_tip: { patterns: ["[no] no tip [this time | today]", "[no] i do not want to (add | leave) a tip", "[no] (skip | without) the tip", "[no] not this time"] },
    book_when: { patterns: [
      "[yes] in (six | six to eight | {n:number}) weeks [please] #h:six_weeks", "[yes] (same time | same day) (next month | in six weeks | in a month) [please]", "[yes] in a month [please]",
      "[yes] (can | could) i (book | make) (my next | another | a new) appointment #h:book_next", "[yes] i would like to book (my next | another) appointment",
      "[yes] in [about] ({n:number} | two | a couple of) months", "(next month | in a month) [same (day | time)]", "[yes] (same | the same) (day | time) next month",
      "[yes] in (six | six to eight | {n:number}) weeks (is | would be) (good | fine | great | perfect)",
    ] },
    book_later: { patterns: ["[no] not right now [thanks] #h:book_later", "[no] i will call (you | later) [later] [to book]", "[no] maybe (later | next time)", "[no] i will book (online | later)",
      "[no] i do not know my schedule [yet]", "[no] i (will | need to) check my (schedule | calendar) [first]", "(can | could) i book online"] },
    // "See you next time!" at the end
    see_you: { patterns: ["[thanks | thank you] see you (next time | soon | again | in six weeks | then | next month)"] },
    no_bangs: { patterns: ["[no] i do not want (bangs | a fringe | my bangs cut)", "[no] no bangs [thanks]", "[no] leave (my | the) bangs [as they are]", "[no] do not touch (my | the) bangs",
      "[no] leave them [as they are | alone | long]", "[no] i am growing (them | my bangs | my fringe) out", "[no] (do not | please do not) (cut | trim) (my | the) (bangs | fringe) [please]"] },
  },

  lines: {
    // --- check-in ------------------------------------------------------------------------------
    greet: [
      t("Welcome | to | Snip & Style!", "Sveiki atvykę | į | „Snip & Style“!", "Sveiki atvykę į „Snip & Style“!"),
      t("Hi there, | welcome | in!", "Sveiki, | prašom | užeiti!", "Sveiki, prašom užeiti!", { flags: { 2: "“in” (welcome in): carried by the prefix už- of užeiti." } }),
    ],
    greet_back: [t("Hey, | welcome | back!", "Labas, | sveiki | sugrįžę!", "Sveiki sugrįžę!")],
    greet_howareyou_line: [t("Hi there! | How | are | you | today?", "Sveiki! | Kaip | sekasi | jums | šiandien?", "Sveiki! Kaip jums šiandien sekasi?")],
    ask_appt: [
      t("Do | you | have | an | appointment?", "Ar | jūs | turite | — | vizitą?", "Ar esate {m:užsiregistravęs|f:užsiregistravusi}?", { flags: { 0: FLAG_DO } }),
      t("Are | you | my | three | o'clock?", "Ar esate | jūs | mano | trečios | valandos {m:klientas|f:klientė}?", "Ar jūs mano trečios valandos {m:klientas|f:klientė}?",
        { flags: { 0: "“Are” in a yes/no question = the particle ar + esate.", 4: "“o'clock” stands for the booked client; Lithuanian names the noun." } }),
    ],
    ask_name: [
      t("Great! | Can | I | get | your | name?", "Puiku! | Ar galiu | aš | gauti | jūsų | vardą?", "Puiku! Koks jūsų vardas?"),
      t("Perfect. | And | what's | the | name?", "Puiku. | O | koks yra | — | vardas?", "Puiku. O kokiu vardu užsiregistravote?"),
    ],
    name_again: [t("Sorry, | what | was | the | name?", "Atsiprašau, | koks | buvo | — | vardas?", "Atsiprašau, koks vardas?")],
    appt_found: [
      t("Perfect, | I've got | you | right here.", "Puiku, | turiu | jus | čia pat.", "Puiku, radau jus sąraše."),
      t("Got it! | You're | all | checked in.", "Supratau! | Jūs esate | — | {m:užregistruotas|f:užregistruota}.", "Supratau! Jūs {m:užregistruotas|f:užregistruota}.",
        { flags: { 2: "“all” (all checked in) is an intensifier with no separate word here." } }),
    ],
    appt_other_time: [t("Oh, | I | thought | it | was | at three, | but | no | problem!", "O, | aš | maniau, | kad tai | buvo | trečią, | bet | jokių | problemų!",
      "O, maniau, kad trečią, bet jokių problemų!", { flags: { 3: "“it” = the appointment; Lithuanian adds the conjunction kad (that)." } })],
    no_appt_ok: [t("No | problem!", "Jokių | problemų!", "Jokių problemų!")],
    walkin_ok: [t("You're in luck! | I | have | an | opening | right now.", "Jums pasisekė! | Aš | turiu | — | laisvą laiką | šiuo metu.", "Jums pasisekė – kaip tik dabar turiu laisvo laiko.")],
    walkin_wait: [t("It'll be | about | fifteen | minutes. | Is | that | okay?", "Tai bus | maždaug | penkiolika | minučių. | Ar | tai | tinka?", "Teks palaukti maždaug penkiolika minučių. Ar tinka?",
      { flags: { 4: "“Is” in a question = the particle ar; the verb tinka takes over the copula." } })],
    wait_ok_line: [t("Great! | Have a seat, | and | I'll be right with you.", "Puiku! | Prisėskite, | ir | tuoj ateisiu.", "Puiku! Prisėskite, tuoj ateisiu.")],
    come_back_now: [t("Okay, | come on back!", "Gerai, | prašom čia!", "Gerai, prašom čia!")],
    wait_no_line: [t("No | problem. | Maybe | next | time!", "Jokių | problemų. | Gal | kitą | kartą!", "Jokių problemų. Gal kitą kartą!")],
    have_seat: [
      t("Have a seat | right here.", "Prisėskite | čia pat.", "Prisėskite čia.", { flags: {} }),
    ],

    // --- drink offer -------------------------------------------------------------------------
    offer_drink: [
      t("Can | I | get | you | some | water | or | coffee?", "Ar galiu | aš | pasiūlyti | jums | — | vandens | ar | kavos?", "Gal pasiūlyti vandens ar kavos?",
        { flags: { 4: "Partitive: the genitive vandens / kavos carries “some”." } }),
    ],
    drink_ok: [t("Coming right up!", "Tuoj bus!", "Tuoj atnešiu!"), t("Sure thing!", "Žinoma!", "Žinoma!")],

    // --- service -------------------------------------------------------------------------------
    ask_service: [
      t("So, | what | are | we | doing | today?", "Tai, | ką | — | mes | darysime | šiandien?", "Tai ką šiandien darysime?",
        { flags: { 2: "Progressive “are” has no Lithuanian word; the future darysime carries the plan (linked to “doing”)." } }),
      t("What | can | I | do | for you | today?", "Ką | galiu | aš | padaryti | jums | šiandien?", "Ką šiandien galėčiau jums padaryti?"),
    ],
    what_in_mind: [t("Sure! | What | did | you | have | in mind?", "Žinoma! | Ką | — | jūs | turėjote | omenyje?", "Žinoma! Ką turėjote omenyje?",
      { flags: { 2: "Question “did” has no Lithuanian word; the past tense sits on turėjote." } })],
    trim_ok: [t("Sure, | just | a | trim.", "Žinoma, | tik | — | patrumpinti.", "Žinoma, tik patrumpinti."), t("Easy!", "Lengva!", "Lengva!")],
    wash_trim_ok: [t("Sure! | A | wash | and | a | trim.", "Žinoma! | — | Plovimas | ir | — | patrumpinimas.", "Žinoma! Plovimas ir patrumpinimas.")],
    short_ok: [t("Ooh, | a | new | look! | I | love | it.", "Oho, | — | nauja | šukuosena! | Aš | dievinu | tai.", "Oho, nauja šukuosena! Man patinka.")],
    photo_ok: [t("Oh, | that's | cute! | I | can | do | that.", "O, | tai yra | miela! | Aš | galiu | padaryti | tai.", "O, kaip miela! Galiu taip padaryti.")],
    bangs_ok: [t("Sure! | Just | the | bangs.", "Žinoma! | Tik | — | kirpčiukus.", "Žinoma! Tik kirpčiukus.")],
    not_short_ok: [t("Don't worry, | I | won't go | too | short.", "Nesijaudinkite, | aš | nekirpsiu | per | trumpai.", "Nesijaudinkite, per trumpai nekirpsiu.",
      { flags: { 2: "“go (short)” here means “cut (short)”: nekirpsiu = won't cut." } })],

    // --- how much off ------------------------------------------------------------------------
    ask_length: [
      t("How much | should | I | take | off?", "Kiek | turėčiau | aš | nukirpti | —?", "Kiek nukirpti?", { flags: { 4: FLAG_OFF } }),
      t("And | how much | are | we | taking | off?", "O | kiek | — | mes | nukirpsime | —?", "O kiek nukirpsime?",
        { flags: { 2: "Progressive “are” has no Lithuanian word (linked to “taking”).", 5: FLAG_OFF } }),
    ],
    len_inch: [t("Okay, | just | an | inch.", "Gerai, | tik | — | colį.", "Gerai, tik colį.")],
    len_half: [t("Okay, | just | half | an | inch.", "Gerai, | tik | pusę | — | colio.", "Gerai, tik pusę colio.")],
    len_n: [t("Okay, | {$num} | inches.", "Gerai, | {$num} | colius.", "Gerai, {$num} colius.", { say: "Okay, {$num} inches." })],
    len_1half: [t("Okay, | an | inch | and | a | half.", "Gerai, | — | colį | ir | — | pusę.", "Gerai, pusantro colio.")],
    len_ends: [t("Got it, | just | the | ends.", "Supratau, | tik | — | galiukus.", "Supratau, tik galiukus.")],
    len_sides: [t("Sure, | a little | off | the | sides.", "Žinoma, | truputį | nuo | — | šonų.", "Žinoma, truputį nuo šonų.")],
    cm_conv_1: [t("{$cm} | centimeters? | That's | about | an | inch.", "{$cm} | centimetrai? | Tai yra | maždaug | — | colis.", "{$cm} centimetrai? Tai maždaug colis.", { say: "{$cm} centimeters? That's about an inch." })],
    cm_conv_n: [t("{$cm} | centimeters? | That's | about | {$num} | inches.", "{$cm} | centimetrai? | Tai yra | maždaug | {$num} | coliai.", "{$cm} centimetrai? Tai maždaug {$num} coliai.",
      { say: "{$cm} centimeters? That's about {$num} inches." })],
    cm_conv_n10: [t("{$cm} | centimeters? | That's | about | {$num} | inches.", "{$cm} | centimetrų? | Tai yra | maždaug | {$num} | coliai.", "{$cm} centimetrų? Tai maždaug {$num} coliai.",
      { say: "{$cm} centimeters? That's about {$num} inches.", flags: { 1: "Lithuanian numbers from ten to twenty take the genitive plural: centimetrų." } })],
    cm_small: [t("Just | a | centimeter? | So, | a | tiny | trim.", "Tik | — | centimetrą? | Vadinasi, | — | mažytis | patrumpinimas.", "Tik centimetrą? Vadinasi, visai truputį.")],
    cm_inches_note: [t("Here | we | use | inches.", "Čia | mes | naudojame | colius.", "Čia matuojame coliais.")],
    cm_confirm: [t("Is | that | okay?", "Ar | tai | tinka?", "Ar tinka?", { flags: { 0: "“Is” in a question = the particle ar; the verb tinka takes over the copula." } })],
    ask_layers: [t("Do | you | want | to keep | your | layers?", "Ar | jūs | norite | palikti | savo | pakopas?", "Ar palikti pakopas?", { flags: { 0: FLAG_DO } })],
    ask_bangs: [t("Should | I | trim | your | bangs | too?", "Ar | man | patrumpinti | jūsų | kirpčiukus | irgi?", "Ar patrumpinti ir kirpčiukus?",
      { flags: { 0: "“Should” in a question = the particle ar; Lithuanian asks with the dative man + infinitive (linked to “I”)." } })],
    ack: [t("Okay!", "Gerai!", "Gerai!"), t("Got it.", "Supratau.", "Supratau."), t("Sounds | good.", "Skamba | gerai.", "Puiku.")],

    // --- wash -------------------------------------------------------------------------------------
    ask_wash: [
      t("Would | you | like | a | wash | first?", "Ar | jūs | norėtumėte | — | plovimo | pirmiausia?", "Gal pirmiausia išplauti galvą?", { flags: { 0: FLAG_WOULD } }),
    ],
    wash_start: [t("Let's start | with | a | wash.", "Pradėkime | nuo | — | plovimo.", "Pradėkime nuo plovimo."), t("Great, | let's start | at | the | sink.", "Puiku, | pradėkime | prie | — | kriauklės.", "Puiku, pradėkime prie kriauklės.")],
    ask_water: [t("How's | the | water | temperature?", "Kaip | — | vandens | temperatūra?", "Kaip vandens temperatūra?"),
      t("Is | the | water | okay?", "Ar | — | vanduo | tinka?", "Ar vanduo tinka?", { flags: { 0: "“Is” in a question = the particle ar; the verb tinka takes over the copula." } })],
    water_fix_hot: [t("Oops, | sorry! | Is | that | better?", "Oi, | atsiprašau! | Ar | tai | geriau?", "Oi, atsiprašau! Ar dabar geriau?", { flags: { 2: "“Is” in a question = the particle ar." } })],
    water_fix_cold: [t("Oh, | sorry! | I'll make | it | warmer.", "O, | atsiprašau! | Padarysiu | jį | šiltesnį.", "O, atsiprašau! Tuoj bus šilčiau.", { flags: { 3: "“it” = the water (vanduo), hence jį." } })],
    water_good: [t("Great!", "Puiku!", "Puiku!"), t("Perfect.", "Puiku.", "Puiku.")],
    no_wash_ok: [t("No | problem, | I'll just | spray | it | with | water.", "Jokių | problemų, | tiesiog | apipurkšiu | juos | — | vandeniu.", "Jokių problemų, tiesiog apipurkšiu plaukus vandeniu.",
      { flags: { 2: "“I'll just” = tiesiog + the future ending of apipurkšiu.", 4: "“it” = your hair (plaukai), hence juos.", 5: "“with” has no separate word: the instrumental vandeniu carries it." } })],

    // --- small talk ----------------------------------------------------------------------------
    cat_story: [
      t("My | cat | knocked | my | coffee | off | the | table | this | morning!", "Mano | katė | numetė | mano | kavą | nuo | — | stalo | šį | rytą!", "Mano katė šįryt numetė mano kavą nuo stalo!"),
      t("My | cat | learned | how | to open | the | fridge!", "Mano | katė | išmoko | — | atidaryti | — | šaldytuvą!", "Mano katė išmoko atidaryti šaldytuvą!",
        { flags: { 3: "“how” (learned how to): no separate word; išmoko + infinitive." } }),
      t("My | cat | sleeps | on | my | head | every | night!", "Mano | katė | miega | ant | mano | galvos | kiekvieną | naktį!", "Mano katė kiekvieną naktį miega ant mano galvos!"),
    ],
    cat_anyway: [t("Anyway!", "Na, žodžiu!", "Na, žodžiu!")],
    cat_name: [t("Mochi! | She's | a | little | troublemaker.", "Mochi! | Ji yra | — | maža | išdykėlė.", "Mochi! Ji tikra išdykėlė.")],
    cat_laugh: [t("I | know, | right?", "Aš | žinau, | ar ne?", "Žinau, ar ne?")],
    ask_pets: [t("Do | you | have | any | pets?", "Ar | jūs | turite | — | augintinių?", "Ar turite augintinių?", { flags: { 0: FLAG_DO, 3: "Partitive: the genitive augintinių carries “any”." } })],
    react_dog: [t("Aw, | I | love | dogs!", "Oi, | aš | dievinu | šunis!", "Oi, aš dievinu šunis!")],
    react_cat: [t("A | cat | person! | I | knew | it!", "— | Kačių | {m:mylėtojas|f:mylėtoja}! | Aš | žinojau | tai!", "Kačių {m:mylėtojas|f:mylėtoja}! Taip ir žinojau!",
      { flags: { 1: "“cat” used as a modifier = the genitive plural kačių." } })],
    react_nopet: [t("You | should | get | a | cat!", "Jums | reikėtų | įsigyti | — | katę!", "Jums reikėtų įsigyti katę!", { flags: { 0: "“You” → dative Jums with reikėtų (should)." } })],
    ask_weekend: [
      t("So, | are | you | doing | anything | fun | this | weekend?", "Tai, | ar | jūs | darysite | ką nors | smagaus | šį | savaitgalį?", "Tai ar šį savaitgalį darysite ką nors smagaus?",
        { flags: { 1: "“are” in a yes/no question = the particle ar; the future darysite carries the plan (linked to “doing”)." } }),
    ],
    ask_from: [t("So, | where | are | you | from?", "Tai, | iš kur | esate | jūs | —?", "Tai iš kur jūs?", { flags: { 4: "Stranded “from”: iš (in iš kur) already carries it." } })],
    ask_vacation: [t("Any | vacation | plans | this | year?", "Kokių nors | atostogų | planų | šiais | metais?", "Ar planuojate atostogas šiais metais?")],
    react_fun: [t("Oh, | fun!", "O, | smagu!", "O, smagu!"), t("That | sounds | nice!", "Tai | skamba | puikiai!", "Skamba puikiai!"), t("Oh, | cool!", "O, | šaunu!", "O, šaunu!")],
    react_party: [t("Ooh, | fun! | Your | hair | will | look | great.", "Oho, | smagu! | Jūsų | plaukai | — | atrodys | puikiai.", "Oho, smagu! Jūsų plaukai atrodys puikiai.",
      { flags: { 4: "“will” has no separate word: the future ending of atrodys carries it." } })],
    react_relax: [t("Just | relaxing? | That | sounds | nice | too.", "Tiesiog | poilsis? | Tai | skamba | puikiai | irgi.", "Tiesiog pailsėsite? Irgi puiku.")],
    react_lt: [t("Oh, | cool! | I've | never | been | there.", "O, | šaunu! | Aš | niekada | nebuvau | ten.", "O, šaunu! Niekada ten nebuvau.",
      { flags: { 2: "Perfect “have” has no separate word: the past nebuvau carries it.", 4: "Negative concord: niekada + nebuvau (ne- comes from “never”)." } })],
    jessie_weekend: [t("Me? | I'm | just | hanging out | with | my | cat.", "Aš? | Aš | tiesiog | leisiu laiką | su | savo | kate.", "Aš? Tiesiog leisiu laiką su savo kate.",
      { flags: { 1: "Progressive “am” has no separate word (linked to “hanging out”)." } })],

    // --- blow-dry and style ------------------------------------------------------------------
    ask_blowdry: [
      t("Do | you | want | me | to blow-dry | it?", "Ar | jūs | norite, | kad | išdžiovinčiau | juos?", "Ar išdžiovinti plaukus fenu?",
        { flags: { 0: FLAG_DO, 3: "“me” is the subject of the wish: Lithuanian says kad + the first person subjunctive išdžiovinčiau.", 5: "“it” = your hair (plaukai), hence juos." } }),
      t("Should | I | blow-dry | it?", "Ar | man | išdžiovinti | juos?", "Ar išdžiovinti plaukus fenu?",
        { flags: { 0: "“Should” in a question = the particle ar; Lithuanian asks with the dative man + infinitive.", 3: "“it” = your hair (plaukai), hence juos." } }),
    ],
    ask_style: [t("Straight, | or | with | some | waves?", "Tiesius, | ar | su | — | bangomis?", "Ištiesinti ar su bangelėmis?", { flags: { 3: "“some” has no separate word here." } })],
    style_ok: [t("You got it!", "Bus padaryta!", "Bus padaryta!"), t("Perfect.", "Puiku.", "Puiku.")],
    no_dry_ok: [t("No | problem.", "Jokių | problemų.", "Jokių problemų.")],

    // --- the result ----------------------------------------------------------------------------
    reveal: [
      t("All done! | Take a look. | What | do | you | think?", "Viskas baigta! | Pažiūrėkite. | Ką | — | jūs | manote?", "Viskas! Pažiūrėkite. Ką manote?", { flags: { 3: "Question “do” has no Lithuanian word (linked to “think”)." } }),
      t("Okay, | take a look! | Do | you | like | it?", "Gerai, | pažiūrėkite! | Ar | jums | patinka | jis?", "Gerai, pažiūrėkite! Ar patinka?", { flags: { 2: FLAG_DO, 5: "“it” = the haircut (kirpimas), hence jis." } }),
    ],
    reveal_short: [
      t("Oh… | I | think | I | took off | a bit | more | than | we | said.", "O… | aš | manau, | aš | nukirpau | truputį | daugiau, | nei | mes | sutarėme.", "O… Atrodo, nukirpau truputį daugiau, nei sutarėme."),
    ],
    love_reply: [t("Yay! | I'm | so | glad!", "Valio! | Aš esu | taip | {sm:patenkintas|sf:patenkinta}!", "Valio! Labai džiaugiuosi!"),
      t("It | really | suits | you!", "Jis | tikrai | tinka | jums!", "Jums tikrai tinka!", { flags: { 0: "“It” = the haircut (kirpimas), hence jis." } })],
    more_ok: [t("Sure! | Just | a | little | more.", "Žinoma! | Tik | — | truputį | daugiau.", "Žinoma! Tik truputį daugiau.")],
    more_done: [t("How's | that?", "Kaip | dabar?", "Kaip dabar?")],
    sorry_short: [t("Oh | no, | I'm | so | sorry!", "O | ne, | aš | labai | atsiprašau!", "O ne, labai atsiprašau!", { flags: { 2: "“am” (I'm sorry) has no separate word: the verb atsiprašau carries it." } })],
    grows_fast: [t("It'll grow | back | fast, | I | promise.", "Ataugs | — | greitai, | aš | pažadu.", "Greitai ataugs, pažadu.", { flags: { 1: "“back” is carried by the prefix at- of ataugs." } })],
    discount: [t("Let me take | ten | dollars | off.", "Nuimsiu | dešimt | dolerių | —.", "Nuimsiu dešimt dolerių.", { flags: { 3: FLAG_OFF } })],
    polite_reply: [t("Aw, | you're | so | sweet!", "Oi, | jūs esate | {m:toks|f:tokia} | {m:mielas|f:miela}!", "Oi, jūs {m:toks mielas|f:tokia miela}!"),
      t("Thank | you | for | being | so | nice | about | it.", "Ačiū | jums, | kad | esate | {m:toks|f:tokia} | {m:malonus|f:maloni} | dėl | to.", "Ačiū, kad taip maloniai reaguojate.")],
    dont_like_reply: [t("Oh | no! | What | would | you | like | me | to change?", "O | ne! | Ką | — | jūs | norėtumėte, | kad | pakeisčiau?", "O ne! Ką norėtumėte, kad pakeisčiau?",
      { flags: { 3: "“would”: the conditional ending of norėtumėte carries it.", 6: "“me” is carried by kad + the first person subjunctive pakeisčiau." } })],

    // --- paying ------------------------------------------------------------------------------------
    price_cut: [t("A | cut | is | {$price}.", "— | Kirpimas | kainuoja | {$price}.", "Kirpimas kainuoja {$price}.")],
    price_bangs: [t("A | bangs | trim | is | {$price}.", "— | Kirpčiukų | patrumpinimas | kainuoja | {$price}.", "Kirpčiukų patrumpinimas kainuoja {$price}.")],
    price_extras: [t("A | wash | or | a | blow-dry | is | five | dollars | extra.", "— | Plovimas | ar | — | džiovinimas | kainuoja | penkis | dolerius | papildomai.",
      "Plovimas ar džiovinimas – po penkis dolerius papildomai.")],
    tip_later: [t("Sure, | you | can | add | it | when | you | pay.", "Žinoma, | jūs | galite | pridėti | juos, | kai | jūs | mokėsite.", "Žinoma, galėsite pridėti mokėdami.",
      { flags: { 4: "“it” = the tip (arbatpinigiai, plural), hence juos." } })],
    book_first: [t("Sure, | let's do | that | at the end.", "Žinoma, | padarykime | tai | pabaigoje.", "Žinoma, tai padarysime pabaigoje.")],
    total_full: [t("That'll be | {$price}, | with | the | wash | and | blow-dry.", "Tai bus | {$price}, | su | — | plovimu | ir | džiovinimu.", "Su plovimu ir džiovinimu – {$price}.")],
    total_plain: [t("That'll be | {$price}.", "Tai bus | {$price}.", "Iš viso {$price}."), t("Your | total | is | {$price}.", "Jūsų | suma | yra | {$price}.", "Iš viso {$price}.")],
    card_tip: [t("Just | tap | here. | The | screen | will ask | about | a | tip.", "Tiesiog | pridėkite | čia. | — | Ekranas | paklaus | apie | — | arbatpinigius.",
      "Tiesiog pridėkite čia – ekrane galėsite pasirinkti arbatpinigius.")],
    card_later: [t("Sure, | card | is fine.", "Žinoma, | kortele | galima.", "Žinoma, galima ir kortele.")],
    cash_ok: [t("Sure, | cash | is fine.", "Žinoma, | grynaisiais | galima.", "Žinoma, galima ir grynaisiais.")],
    phone_later: [t("Sure, | Apple Pay | is fine.", "Žinoma, | „Apple Pay“ | tinka.", "Žinoma, galima ir „Apple Pay“.")],
    change_back: [t("And | here's | your | change.", "Ir | štai | jūsų | grąža.", "Štai jūsų grąža.")],
    thanks_tip: [t("Aw, | thank | you | so much!", "Oi, | dėkoju | jums | labai!", "Oi, labai ačiū!"), t("Oh, | that's | so | nice | of you! | Thank | you!", "O, | tai | taip | malonu | iš jūsų! | Dėkoju | jums!", "O, kaip malonu! Ačiū!")],
    paid: [t("Thank | you!", "Dėkoju | jums!", "Ačiū!"), t("Perfect, | thanks!", "Puiku, | ačiū!", "Puiku, ačiū!")],
    no_problem: [t("No | problem.", "Jokių | problemų.", "Jokių problemų.")],

    // --- next appointment and goodbye -----------------------------------------------------------
    ask_book: [t("Would | you | like | to book | your | next | appointment?", "Ar | jūs | norėtumėte | užregistruoti | jūsų | kitą | vizitą?", "Ar norėtumėte užsirašyti kitam vizitui?",
      { flags: { 0: FLAG_WOULD } })],
    book_offer: [t("Great! | Same | time | in | six | weeks?", "Puiku! | Tuo pačiu | laiku | po | šešių | savaičių?", "Puiku! Tuo pačiu laiku po šešių savaičių?")],
    book_done: [t("You're all set!", "Viskas sutvarkyta!", "Viskas sutvarkyta!")],
    book_later_ok: [t("No | problem. | Just | call | us.", "Jokių | problemų. | Tiesiog | paskambinkite | mums.", "Jokių problemų. Tiesiog paskambinkite.")],
    closing: [
      t("Thanks | for | coming in!", "Ačiū, | kad | užsukote!", "Ačiū, kad užsukote!"),
      t("Enjoy | your | new | look!", "Džiaukitės | savo | nauja | šukuosena!", "Džiaukitės nauja šukuosena!"),
    ],
    bye_after: [t("Have | a | great | weekend!", "Linkiu | — | puikaus | savaitgalio!", "Puikaus savaitgalio!"), t("See | you | next | time!", "Iki | — | kito | karto!", "Iki kito karto!",
      { flags: { 1: "“you” has no separate word in the farewell iki kito karto." } })],
  },

  domains: {
    price: () => {
      const out = new Set<number>();
      for (const base of [CUT, BANGS]) for (const w of [0, WASH]) for (const d of [0, DRY]) for (const off of [0, SORRY_OFF]) out.add(base + w + d - off);
      return [...out].filter((x) => x > 0);
    },
    num: () => [2, 3, 4, 5, 6, 7, 8],
    cm: () => Array.from({ length: 20 }, (_, i) => i + 1),
  },

  hints: {
    checkin: {
      lt: "Pasakyti, ar turi vizitą",
      items: [
        { id: "appt_at", s: t("I | have | an | appointment | at three.", "Aš | turiu | — | vizitą | trečią.", "Esu {m:užsiregistravęs|f:užsiregistravusi} trečiai valandai.") },
        { id: "no_appt", s: t("No, | I | don't have | an | appointment.", "Ne, | aš | neturiu | — | vizito.", "Ne, nesu {m:užsiregistravęs|f:užsiregistravusi}.") },
        { id: "walkin", s: t("Do | you | take | walk-ins?", "Ar | jūs | priimate | klientus be registracijos?", "Ar priimate be registracijos?", { flags: { 0: FLAG_DO } }) },
      ],
    },
    name: {
      lt: "Pasakyti savo vardą",
      items: [
        { id: "name_its", s: t("It's | {$name}.", "Tai | {$name}.", "{$name}.") },
        { id: "name_mine", s: t("My | name | is | {$name}.", "Mano | vardas | yra | {$name}.", "Mano vardas – {$name}.") },
      ],
    },
    drink: {
      lt: "Atsakyti, ar nori vandens ar kavos",
      items: [
        { id: "drink_water", s: t("Some | water, | please.", "— | Vandens, | prašau.", "Vandens, prašau.", { flags: { 0: "Partitive: the genitive vandens carries “some”." } }) },
        { id: "drink_coffee", s: t("A | coffee, | please.", "— | Kavos, | prašau.", "Kavos, prašau.") },
        { id: "drink_no", s: t("No, | thanks.", "Ne, | ačiū.", "Ne, ačiū.") },
      ],
    },
    service: {
      lt: "Pasakyti, kaip nori kirptis",
      items: [
        { id: "just_trim", s: t("Just | a | trim, | please.", "Tik | — | patrumpinti, | prašau.", "Tik truputį patrumpinti, prašau.") },
        { id: "just_ends", s: t("Just | the | ends, | please.", "Tik | — | galiukus, | prašau.", "Tik galiukus, prašau.") },
        { id: "haircut", s: t("I'd like | a | haircut.", "Norėčiau | — | kirpimo.", "Norėčiau nusikirpti.") },
        { id: "bangs_trim", s: t("Could | you | trim | my | bangs?", "Ar galėtumėte | jūs | patrumpinti | mano | kirpčiukus?", "Ar galėtumėte patrumpinti kirpčiukus?"),
          note: "„Bangs“ – kirpčiukai (britai sako „fringe“)." },
        { id: "photo", s: t("Could | you | cut | it | like | this | photo?", "Ar galėtumėte | jūs | nukirpti | juos | kaip | šioje | nuotraukoje?", "Ar galėtumėte nukirpti kaip šioje nuotraukoje?",
          { flags: { 3: "“it” = my hair (plaukai), hence juos.", 6: "“photo”: Lithuanian says “as in this photo” (locative nuotraukoje)." } }) },
        { id: "not_short", s: t("Not | too | short, | please.", "Ne | per | trumpai, | prašau.", "Tik ne per trumpai, prašau.") },
      ],
    },
    // "A haircut." → "What did you have in mind?"
    service_what: {
      lt: "Pasakyti, kaip kirpti",
      items: [
        { id: "just_trim", s: t("Just | a | trim, | please.", "Tik | — | patrumpinti, | prašau.", "Tik truputį patrumpinti, prašau.") },
        { id: "not_short", s: t("Not | too | short, | please.", "Ne | per | trumpai, | prašau.", "Tik ne per trumpai, prašau.") },
        { id: "photo", s: t("Could | you | cut | it | like | this | photo?", "Ar galėtumėte | jūs | nukirpti | juos | kaip | šioje | nuotraukoje?", "Ar galėtumėte nukirpti kaip šioje nuotraukoje?",
          { flags: { 3: "“it” = my hair (plaukai), hence juos.", 6: "“photo”: Lithuanian says “as in this photo” (locative nuotraukoje)." } }) },
        { id: "just_ends", s: t("Just | the | ends, | please.", "Tik | — | galiukus, | prašau.", "Tik galiukus, prašau.") },
      ],
    },
    length: {
      lt: "Pasakyti, kiek nukirpti",
      items: [
        { id: "inch", s: t("Just | an | inch, | please.", "Tik | — | colį, | prašau.", "Tik colį, prašau."), note: "1 colis (inch) ≈ 2,5 cm. JAV ilgis matuojamas coliais." },
        { id: "inch", s: t("About | two | inches.", "Maždaug | du | colius.", "Maždaug du colius.") },
        { id: "a_little", s: t("Just | a little.", "Tik | truputį.", "Tik truputį.") },
        { id: "sides", s: t("Take | a little | off | the | sides.", "Nukirpkite | truputį | nuo | — | šonų.", "Truputį nukirpkite šonus.") },
      ],
    },
    // "Two centimeters? That's about an inch. Is that okay?"
    confirm: {
      lt: "Atsakyti, ar tinka",
      items: [
        { id: "conf_fine", s: t("Yes, | that's | fine.", "Taip, | tai | tinka.", "Taip, tinka.") },
        { id: "conf_perfect", s: t("That's | perfect, | thanks.", "Tai | puiku, | ačiū.", "Puiku, ačiū.") },
      ],
    },
    water: {
      lt: "Pasakyti, koks vanduo",
      items: [
        { id: "water_ok", s: t("It's | perfect, | thanks.", "Jis yra | puikus, | ačiū.", "Puikus, ačiū.", { flags: { 0: "“It” = the water (vanduo), hence jis." } }) },
        { id: "too_hot", s: t("It's | a little | too | hot.", "Jis yra | truputį | per | karštas.", "Truputį per karštas.", { flags: { 0: "“It” = the water (vanduo), hence jis." } }) },
        { id: "too_hot", s: t("It's | a little | cold.", "Jis yra | truputį | šaltas.", "Truputį šaltas.", { flags: { 0: "“It” = the water (vanduo), hence jis." } }) },
      ],
    },
    style: {
      lt: "Pasakyti, kaip išdžiovinti",
      items: [
        { id: "straight", s: t("Straight, | please.", "Tiesius, | prašau.", "Ištiesinkite, prašau.", { flags: { 0: "“Straight” agrees with the implied plaukai (hair)." } }) },
        { id: "waves", s: t("With | some | waves, | please.", "Su | — | bangomis, | prašau.", "Su bangelėmis, prašau.", { flags: { 1: "“some” has no separate word here." } }) },
        { id: "volume", s: t("With | some | volume, | please.", "Su | — | apimtimi, | prašau.", "Su apimtimi, prašau.", { flags: { 1: "“some” has no separate word here." } }) },
        { id: "no_blowdry", s: t("I'll let | it | air-dry.", "Leisiu | jiems | išdžiūti.", "Leisiu plaukams išdžiūti patiems.",
          { flags: { 1: "“it” = my hair (plaukai), dative jiems." } }) },
      ],
    },
    // Reactions to the cat story
    chat: {
      lt: "Sureaguoti arba paklausti apie katę",
      items: [
        { id: "funny", s: t("That's | so | funny!", "Tai | taip | juokinga!", "Kaip juokinga!") },
        { id: "cute", s: t("That's | so | cute!", "Tai | taip | miela!", "Kaip miela!") },
        { id: "cat_name", s: t("What's | your | cat's | name?", "Koks yra | jūsų | katės | vardas?", "Kuo vardu jūsų katė?") },
      ],
    },
    // Answers to Jessie's small-talk question (one topic per visit)
    talk_weekend: {
      lt: "Papasakoti apie savaitgalio planus",
      items: [
        { id: "party", s: t("I'm going | to | a | party | this | weekend.", "Einu | į | — | vakarėlį | šį | savaitgalį.", "Šį savaitgalį einu į vakarėlį.") },
        { id: "relax", s: t("Not | really. | Just | relaxing.", "Ne | visai. | Tiesiog | ilsėsiuosi.", "Nieko ypatingo. Tiesiog ilsėsiuosi.") },
        { id: "friends", s: t("I'm meeting | some | friends.", "Susitinku | — | su draugais.", "Susitinku su draugais.", { flags: { 1: "“some” has no separate word here; Lithuanian meets su (with) friends." } }) },
      ],
    },
    talk_from: {
      lt: "Pasakyti, iš kur esi",
      items: [
        { id: "from_lt", s: t("I'm | from | Lithuania.", "Aš esu | iš | Lietuvos.", "Esu iš Lietuvos.") },
        { id: "from_moved", s: t("I | just | moved | here | from | Lithuania.", "Aš | ką tik | persikėliau | čia | iš | Lietuvos.", "Ką tik persikėliau čia iš Lietuvos.") },
      ],
    },
    talk_vacation: {
      lt: "Papasakoti apie atostogų planus",
      items: [
        { id: "vacation", s: t("I'm going | to | Florida | this | summer.", "Važiuoju | į | Floridą | šią | vasarą.", "Šią vasarą važiuoju į Floridą.") },
        { id: "vac_family", s: t("I'm visiting | my | family | in | Lithuania.", "Lankysiu | savo | šeimą | — | Lietuvoje.", "Lankysiu šeimą Lietuvoje.", { flags: { 3: "“in” has no separate word: the locative Lietuvoje carries it." } }) },
        { id: "vac_not_yet", s: t("Not | yet.", "Dar | ne.", "Dar ne.") },
      ],
    },
    talk_pets: {
      lt: "Pasakyti, ar turi augintinių",
      items: [
        { id: "pet", s: t("I | have | a | dog.", "Aš | turiu | — | šunį.", "Turiu šunį.") },
        { id: "pet_cat", s: t("I | have | a | cat.", "Aš | turiu | — | katę.", "Turiu katę.") },
        { id: "no_pets", s: t("No, | I | don't have | any | pets.", "Ne, | aš | neturiu | jokių | augintinių.", "Ne, augintinių neturiu.") },
      ],
    },
    result: {
      lt: "Pasakyti, kaip patinka",
      items: [
        { id: "love_it", s: t("I | love | it!", "Man | labai patinka | jis!", "Man labai patinka!", { flags: { 0: "“I” → dative Man: Lithuanian says “to me it is liked”.", 2: "“it” = the haircut (kirpimas), hence jis." } }) },
        { id: "looks_great", s: t("It | looks | great, | thank | you!", "Jis | atrodo | puikiai, | dėkoju | jums!", "Atrodo puikiai, ačiū!", { flags: { 0: "“It” = the haircut (kirpimas), hence jis." } }) },
        { id: "more_off", s: t("Could | you | take | a little | more | off?", "Ar galėtumėte | jūs | nukirpti | truputį | daugiau | —?", "Ar galėtumėte nukirpti dar truputį?", { flags: { 5: FLAG_OFF } }) },
        { id: "shorter", s: t("It's | a little | shorter | than | I | expected.", "Jis yra | truputį | trumpesnis, | nei | aš | tikėjausi.", "Truputį trumpesnis, nei tikėjausi.",
          { flags: { 0: "“It” = the haircut (kirpimas), hence jis." } }), register: "polite", note: "Mandagus būdas pasakyti, kad nukirpta per trumpai." },
        { id: "grow_back", s: t("It's | okay. | It'll grow | back.", "Tai | gerai. | Ataugs | —.", "Nieko tokio, ataugs.", { flags: { 3: "“back” is carried by the prefix at- of ataugs." } }), register: "polite" },
      ],
    },
    // The twist: "Oh… I think I took off a bit more than we said."
    short: {
      lt: "Sureaguoti mandagiai",
      items: [
        { id: "grow_back", s: t("It's | okay. | It'll grow | back.", "Tai | gerai. | Ataugs | —.", "Nieko tokio, ataugs.", { flags: { 3: "“back” is carried by the prefix at- of ataugs." } }), register: "polite" },
        { id: "shorter", s: t("It's | a little | shorter | than | I | expected.", "Jis yra | truputį | trumpesnis, | nei | aš | tikėjausi.", "Truputį trumpesnis, nei tikėjausi.",
          { flags: { 0: "“It” = the haircut (kirpimas), hence jis." } }), register: "polite", note: "Mandagus būdas pasakyti, kad nukirpta per trumpai." },
        { id: "still_like", s: t("I | still | like | it, | thanks.", "Man | vis tiek | patinka | jis, | ačiū.", "Man vis tiek patinka, ačiū.",
          { flags: { 0: "“I” → dative Man: Lithuanian says “to me it is liked”.", 3: "“it” = the haircut (kirpimas), hence jis." } }) },
      ],
    },
    // "What would you like me to change?"
    fix: {
      lt: "Pasakyti, ką pakeisti",
      items: [
        { id: "more_off", s: t("Could | you | take | a little | more | off?", "Ar galėtumėte | jūs | nukirpti | truputį | daugiau | —?", "Ar galėtumėte nukirpti dar truputį?", { flags: { 5: FLAG_OFF } }) },
        { id: "grow_back", s: t("It's | okay. | It'll grow | back.", "Tai | gerai. | Ataugs | —.", "Nieko tokio, ataugs.", { flags: { 3: "“back” is carried by the prefix at- of ataugs." } }), register: "polite" },
      ],
    },
    pay: {
      lt: "Susimokėti ir palikti arbatpinigių",
      items: [
        { id: "pay_card_short", s: t("Card, | please.", "Kortele, | prašau.", "Kortele, prašau.") },
        { id: "pay_card", s: t("Can | I | pay | by card?", "Ar galiu | aš | sumokėti | kortele?", "Ar galiu sumokėti kortele?") },
        { id: "here_you_go", s: t("Here you go.", "Prašom.", "Prašom.") },
        { id: "owe", s: t("How much | do | I | owe | you?", "Kiek | — | aš | {m:esu skolingas|f:esu skolinga} | jums?", "Kiek esu {m:skolingas|f:skolinga}?", { flags: { 1: "Question “do” has no Lithuanian word (linked to “owe”)." } }) },
        { id: "add_tip", s: t("Can | I | add | a | tip?", "Ar galiu | aš | pridėti | — | arbatpinigių?", "Ar galiu pridėti arbatpinigių?", { flags: { 3: "Partitive: the genitive arbatpinigių carries the article's “a”." } }),
          note: "JAV kirpėjams įprasta palikti 15–20 % arbatpinigių." },
        { id: "tip_percent", s: t("I'll add | twenty | percent.", "Pridėsiu | dvidešimt | procentų.", "Pridėsiu dvidešimt procentų.") },
        { id: "keep_change", s: t("Keep | the | change!", "Pasilikite | — | grąžą!", "Grąžos nereikia!") },
        { id: "for_you", s: t("This | is | for you.", "Tai | yra | jums.", "Tai jums.") },
      ],
    },
    // The card screen asks about a tip
    tip: {
      lt: "Pasirinkti arbatpinigius",
      items: [
        { id: "tip_20", s: t("Twenty | percent, | please.", "Dvidešimt | procentų, | prašau.", "Dvidešimt procentų, prašau."), note: "JAV kirpėjams įprasta palikti 15–20 % arbatpinigių." },
        { id: "tip_percent", s: t("I'll add | twenty | percent.", "Pridėsiu | dvidešimt | procentų.", "Pridėsiu dvidešimt procentų.") },
        { id: "tip_15", s: t("Fifteen | percent | is fine.", "Penkiolika | procentų | tinka.", "Penkiolikos procentų užteks.") },
      ],
    },
    book: {
      lt: "Užsirašyti kitam kartui",
      items: [
        { id: "six_weeks", s: t("Yes, | in | six | weeks, | please.", "Taip, | po | šešių | savaičių, | prašau.", "Taip, po šešių savaičių, prašau.") },
        { id: "book_later", s: t("Not | right now, | thanks.", "Ne | šiuo metu, | ačiū.", "Kol kas ne, ačiū.") },
        { id: "book_next", s: t("Can | I | book | my | next | appointment?", "Ar galiu | aš | užregistruoti | savo | kitą | vizitą?", "Ar galiu užsirašyti kitam vizitui?") },
      ],
    },
    // A walk-in: "It'll be about fifteen minutes. Is that okay?"
    wait: {
      lt: "Pasakyti, kad palauksi",
      items: [
        { id: "wait_ok", s: t("Sure, | I | can | wait.", "Žinoma, | aš | galiu | palaukti.", "Žinoma, galiu palaukti.") },
        { id: "wait_fine", s: t("That's | fine.", "Tai | tinka.", "Tinka.") },
      ],
    },
    // Leaving instead (in the phrase list, not among the guide's model answers)
    wait_later: {
      lt: "Pasakyti, kad grįši vėliau",
      items: [
        { id: "wait_later", s: t("No, | I'll come | back | later.", "Ne, | ateisiu | atgal | vėliau.", "Ne, grįšiu vėliau.") },
      ],
    },
  },

  tips: {
    uk_fringe: { key: "uk_fringe", lt: "Suprasta! Amerikoje kirpčiukai vadinami „bangs“.", better: "Could you trim my bangs?" },
    uk_cm: { key: "uk_cm", lt: "Suprasta! Amerikoje ilgis matuojamas coliais: 1 inch ≈ 2,5 cm.", better: "Just an inch, please." },
    uk_washcut: { key: "uk_washcut", lt: "Suprasta! Amerikoje dažniau sakoma „a trim“ arba „a haircut“; plovimas paprastai įskaičiuotas.", better: "Just a trim, please." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Pasakyk, ar turi vizitą", done: (c) => c.s.appt !== undefined || !!c.s.checkedIn },
    { lt: "Pasakyk savo vardą", optional: true, when: (c) => !c.s.walkin, done: (c) => !!c.s.checkedIn && !c.s.walkin },
    // what to do and how much to take off
    { lt: "Pasakyk, kaip nori kirptis", done: (c) => !!c.s.service && c.s.service !== "vague" && (!!c.s.lengthSet || c.s.service === "bangs") },
    // layers, bangs, wash and water, small talk, blow-dry: ticked when the haircut is done
    { lt: "Atsakyk į kirpėjos klausimus", done: (c) => !!c.s.cutDone },
    { lt: "Pasakyk, ar patinka kirpimas", done: (c) => !!c.s.revealed },
    { lt: "Susimokėk", done: (c) => !!c.s.paid },
  ],

  steps: [
    { id: "appt", done: (c) => !!c.s.checkedIn || c.s.appt !== undefined,
      ask: (c) => c.say("ask_appt"), expects: ["appt_have", "appt_none", "walkin", "name_ctx"],
      suggest: [{ lt: "Pasakyti, ar turi vizitą", hint: "checkin" }, { lt: "Pasakyti savo vardą", hint: "name" }, { lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
      yes: (c) => { c.s.appt = true; },
      no: (c) => { salon.handlers.appt_none(c, {}, { intent: "appt_none", slots: {}, tags: [] }); } },
    { id: "name", when: (c) => !!c.s.appt && !c.s.walkin, done: (c) => !!c.s.checkedIn,
      ask: (c) => c.say(c.s.nameAsked ? "name_again" : "ask_name"), expects: ["name_ctx"],
      suggest: [{ lt: "Pasakyti savo vardą", hint: "name" }] },
    { id: "drink", when: (c) => !!c.s.checkedIn && c.s.askDrink, done: (c) => c.s.drink !== undefined,
      ask: (c) => { c.say("have_seat"); c.say("offer_drink"); }, expects: ["drink_ans"],
      suggest: [{ lt: "Atsakyti, ar nori vandens ar kavos", hint: "drink" }],
      yes: (c) => { c.s.drink = "water"; c.say("drink_ok"); },
      no: (c) => { c.s.drink = "none"; c.say("no_problem"); } },
    { id: "service", when: (c) => !!c.s.checkedIn, done: (c) => !!c.s.service,
      ask: (c) => c.say("ask_service"), expects: ["trim", "haircut", "go_short", "bangs_only", "photo", "length", "not_short", "wash_request"],
      suggest: [{ lt: "Pasakyti, kaip nori kirptis", hint: "service" }],
      help: (c) => { c.say("what_in_mind"); } },
    { id: "length", when: (c) => !!c.s.service && c.s.service !== "bangs" && c.s.service !== "vague" && !c.s.lengthSet, done: (c) => !!c.s.lengthSet,
      ask: (c) => c.say("ask_length"), expects: ["length", "not_short", "trim"],
      suggest: [{ lt: "Pasakyti, kiek nukirpti", hint: "length" }],
      help: (c) => { c.s.lengthSet = true; c.s.inches = 1; c.say("len_inch"); } },
    { id: "layers", when: (c) => !!c.s.lengthSet && c.s.askLayers && c.s.service !== "bangs", done: (c) => c.s.layers !== undefined,
      ask: (c) => c.say("ask_layers"), expects: ["keep_layers", "no_layers"],
      suggest: [{ lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
      yes: (c) => { c.s.layers = true; c.say("ack"); },
      no: (c) => { c.s.layers = false; c.say("ack"); } },
    { id: "bangs_q", when: (c) => !!c.s.lengthSet && c.s.askBangs && c.s.service !== "bangs", done: (c) => c.s.bangs !== undefined,
      ask: (c) => c.say("ask_bangs"), expects: ["bangs_only", "no_bangs"],
      suggest: [{ lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
      yes: (c) => { c.s.bangs = true; c.say("ack"); },
      no: (c) => { c.s.bangs = false; c.say("ack"); } },
    { id: "wash", when: (c) => !!c.s.service && (!!c.s.lengthSet || c.s.service === "bangs") && c.s.askWash, done: (c) => c.s.wash !== undefined,
      ask: (c) => { if (c.s.wantWash) { startWash(c); return; } c.say("ask_wash"); }, expects: ["wash_request", "no_wash"],
      suggest: [{ lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
      yes: (c) => { startWash(c); },
      no: (c) => { c.s.wash = false; c.say("no_wash_ok"); } },
    { id: "chat", when: (c) => !!c.s.service && (!!c.s.lengthSet || c.s.service === "bangs") && (c.s.wash !== undefined || !c.s.askWash),
      done: (c) => !!c.s.chatDone,
      ask: (c) => {
        c.s.chatDone = true;
        if (c.s.catFirst) { c.say("cat_story"); c.expect(catPending(c)); return; }
        askSmallTalk(c);
      },
      expects: ["react_funny", "ask_cat", "weekend_ctx", "vacation_ctx", "from_ans", "pets_ans"] },
    { id: "blowdry", when: (c) => !!c.s.chatDone && c.s.askDry, done: (c) => c.s.blowdry !== undefined,
      ask: (c) => c.say("ask_blowdry"), expects: ["style", "ask_cat"],
      suggest: [{ lt: "Atsakyti: taip arba ne", hint: "g_yesno" }, { lt: "Pasakyti, kaip išdžiovinti", hint: "style" }],
      yes: (c) => { c.s.blowdry = true; c.say("ask_style"); c.expect(stylePending(c)); },
      no: (c) => { c.s.blowdry = false; c.say("no_dry_ok"); } },
    { id: "reveal", when: (c) => !!c.s.chatDone && (c.s.blowdry !== undefined || !c.s.askDry), done: (c) => !!c.s.revealed,
      ask: (c) => {
        c.s.cutDone = true;
        if (c.s.tooShort && !c.s.shortSaid) {
          c.s.shortSaid = true; c.twist("too_short"); c.say("reveal"); c.say("reveal_short");
          // the guide suggests a polite reaction first (yes/no and all intents work as for the step)
          const st = salon.steps.find((x) => x.id === "reveal")!;
          c.expect({ id: "reveal", optional: true, on: {}, expects: st.expects, yes: st.yes, no: st.no,
            suggest: [{ lt: "Sureaguoti mandagiai", hint: "short" }, { lt: "Pasakyti, kaip patinka", hint: "result" }], hints: ["short", "result"] });
          return;
        }
        c.say("reveal");
      },
      expects: ["love_it", "more_off", "shorter_than", "polite_ok", "dont_like", "ask_cat"],
      suggest: [{ lt: "Pasakyti, kaip patinka", hint: "result" }],
      yes: (c) => { c.s.revealed = true; c.say("love_reply"); },
      no: (c) => { salon.handlers.dont_like(c, {}, { intent: "dont_like", slots: {}, tags: [] }); } },
    { id: "pay", when: (c) => !!c.s.revealed, done: (c) => !!c.s.paid,
      ask: (c) => {
        const p = total(c);
        if (c.s.wash && c.s.blowdry && !c.s.discount) c.say("total_full", { price: p }); else c.say("total_plain", { price: p });
        c.s.totalSaid = true;
      },
      expects: ["pay_card", "pay_cash", "pay_phone", "here_you_go", "keep_change", "add_tip", "ask_owe"],
      suggest: [{ lt: "Susimokėti (ir palikti arbatpinigių)", hint: "pay" }] },
    { id: "book", when: (c) => !!c.s.paid && (c.s.askBook || c.s.wantBook), done: (c) => c.s.booked !== undefined,
      ask: (c) => c.say("ask_book"), expects: ["book_when", "book_later"],
      suggest: [{ lt: "Užsirašyti kitam kartui (ar ne)", hint: "book" }, { lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
      yes: (c) => {
        c.say("book_offer");
        c.expect({ id: "book_when", optional: true, expects: ["book_when", "book_later"], hints: ["book", "g_yesno"],
          suggest: [{ lt: "Sutikti arba pasiūlyti kitą laiką", hint: "book" }],
          on: { book_when: (cc) => { cc.s.booked = true; cc.say("book_done"); }, book_later: (cc) => { cc.s.booked = false; cc.say("book_later_ok"); } },
          yes: (cc) => { cc.s.booked = true; cc.say("book_done"); },
          no: (cc) => { cc.s.booked = false; cc.say("book_later_ok"); },
          ask: (cc) => cc.say("book_offer") });
      },
      no: (c) => { c.s.booked = false; c.say("book_later_ok"); } },
  ],

  init: (c) => {
    c.s.askDrink = c.chance(0.4);
    c.s.askLayers = c.chance(0.3);
    c.s.askBangs = c.chance(0.35);
    c.s.askWash = c.chance(0.75);
    c.s.askDry = c.chance(0.8);
    c.s.askBook = c.chance(0.6);
    c.s.catFirst = c.chance(0.6);
    c.s.talkTopic = c.pick(["weekend", "from", "vacation", "pets"]);
    c.s.tooShort = c.visits >= 1 && c.chance(0.4);
    c.s.walkinWait = c.visits >= 1 && c.chance(0.4);
  },

  start: (c) => {
    if (c.chance(0.25)) {
      c.say("greet_howareyou_line");
      expectHowAreYou(c);
      return;
    }
    c.say(c.visits >= 1 && c.chance(0.4) ? "greet_back" : "greet");
    c.ask("appt");
  },

  handlers: {
    appt_have(c, slots) {
      c.s.appt = true;
      const tm = slots.time;
      if (tm && tm.h !== 3 && tm.h !== 15) { c.s.otherTime = true; }
      if (c.s.name) { checkIn(c); return; }
    },
    appt_none(c) {
      c.s.appt = false;
      c.s.walkin = true;
      c.say("no_appt_ok");
      walkIn(c);
    },
    walkin(c) {
      c.s.appt = false;
      c.s.walkin = true;
      walkIn(c);
    },
    name_ctx(c, slots) {
      if (!slots.name) { c.s.nameAsked = true; c.say("name_again"); c.hold(); return; }
      c.s.name = slots.name;
      if (c.s.appt === undefined) c.s.appt = true;
      checkIn(c);
    },
    wait_ok(c) { if (c.s.waiting) finishWait(c); else c.say("ack"); },
    wait_no(c) { if (c.s.waiting) { c.s.waiting = false; c.s.gaveUp = true; c.say("wait_no_line"); c.end(); } else c.say("ack"); },
    drink_ans(c) { c.s.drink = "yes"; c.say("drink_ok"); },
    trim(c, _slots, seg) {
      if (!c.s.checkedIn) autoCheckIn(c);
      c.s.service = "trim";
      if (seg.tags.includes("ends")) { c.s.lengthSet = true; c.s.inches = 0.5; c.say("len_ends"); return; }
      c.say("trim_ok");
    },
    haircut(c) {
      if (!c.s.checkedIn) autoCheckIn(c);
      c.s.service = "vague";
      c.say("what_in_mind");
      c.expect({ id: "service_q", expects: ["trim", "go_short", "bangs_only", "photo", "length", "not_short"], hints: ["service_what", "length", "service"],
        suggest: [{ lt: "Pasakyti, kaip nori kirptis", hint: "service_what" }, { lt: "Pasakyti, kiek nukirpti", hint: "length" }],
        on: {
          trim: (cc, sl, sg) => { salon.handlers.trim(cc, sl, sg); },
          go_short: (cc, sl, sg) => { salon.handlers.go_short(cc, sl, sg); },
          bangs_only: (cc, sl, sg) => { salon.handlers.bangs_only(cc, sl, sg); },
          photo: (cc, sl, sg) => { salon.handlers.photo(cc, sl, sg); },
          length: (cc, sl, sg) => { cc.s.service = "trim"; salon.handlers.length(cc, sl, sg); },
          not_short: (cc, sl, sg) => { cc.s.service = "trim"; salon.handlers.not_short(cc, sl, sg); },
        },
        ask: (cc) => cc.say("what_in_mind") });
    },
    go_short(c) {
      if (!c.s.checkedIn) autoCheckIn(c);
      c.s.service = "short";
      c.say("short_ok");
    },
    bangs_only(c) {
      if (!c.s.checkedIn) autoCheckIn(c);
      if (c.s.service && c.s.service !== "bangs" && c.s.service !== "vague") { c.s.bangs = true; c.say("ack"); return; }
      c.s.service = "bangs";
      c.say("bangs_ok");
    },
    photo(c) {
      if (!c.s.checkedIn) autoCheckIn(c);
      c.s.service = "short";
      c.s.lengthSet = true;
      c.say("photo_ok");
    },
    not_short(c) {
      if (!c.s.service || c.s.service === "vague") c.s.service = "trim";
      c.say("not_short_ok");
      // "Not too short, please." as the answer to "How much should I take off?": an inch, unless a length follows.
      const saysLength = /inch|centimet|\bcm\b|\bends\b|little|\bbit\b|half/i.test(c.heard);
      if (!c.s.lengthSet && c.step === "length" && !saysLength) { c.s.lengthSet = true; c.s.inches = 1; c.say("len_inch"); }
    },
    length(c, slots, seg) {
      if (!c.s.checkedIn) autoCheckIn(c);
      if (!c.s.service || c.s.service === "vague" || c.s.service === "bangs") c.s.service = c.s.service === "bangs" ? "bangs" : "trim";
      const tags = seg.tags;
      if (tags.includes("cm")) {
        const cm = tags.includes("c1") ? 1 : Math.min(20, Math.max(1, Number(slots.c) || 2));
        const inches = Math.min(8, Math.max(1, Math.round(cm / 2.54)));
        c.s.inches = cm <= 1 ? 0.5 : inches;
        c.s.lengthSet = true;
        if (cm <= 1) c.say("cm_small");
        else if (inches <= 1) c.say("cm_conv_1", { cm });
        else c.say(cm >= 10 ? "cm_conv_n10" : "cm_conv_n", { cm, num: inches });
        c.say("cm_inches_note");
        c.say("cm_confirm");
        c.expect({ id: "cm_q", optional: true, hints: ["confirm", "length", "g_yesno"], expects: ["confirm_yes", "length"], suggest: [{ lt: "Atsakyti, ar tinka", hint: "confirm" }, { lt: "Pasakyti, kiek nukirpti", hint: "length" }],
          on: { confirm_yes: (cc) => { cc.say("ack"); } },
          yes: (cc) => { cc.say("ack"); }, no: (cc) => { cc.s.lengthSet = false; cc.ask("length"); }, ask: (cc) => cc.say("cm_confirm") });
        return;
      }
      c.s.lengthSet = true;
      if (tags.includes("sides")) { c.s.inches = 1; c.say("len_sides"); return; }
      if (tags.includes("small")) { c.s.inches = 0.5; c.say("len_ends"); return; }
      let inches = inchesFromTags(tags);
      if (inches === undefined && typeof slots.n === "number") inches = slots.n;
      c.s.inches = inches ?? 1;
      if (c.s.inches === 0.5) c.say("len_half");
      else if (c.s.inches === 1) c.say("len_inch");
      else if (c.s.inches === 1.5) c.say("len_1half");
      else c.say("len_n", { num: Math.min(8, Math.round(c.s.inches)) });
    },
    confirm_yes(c) { c.say("ack"); },
    wash_request(c, _slots, seg) {
      if (!c.s.checkedIn) autoCheckIn(c);
      c.s.wantWash = true; c.s.askWash = true;
      if (seg.tags.includes("trim") && (!c.s.service || c.s.service === "vague")) { c.s.service = "trim"; c.say("wash_trim_ok"); return; }
      c.say("ack");
    },
    keep_layers(c) { c.s.layers = true; c.say("ack"); },
    no_wash(c) { if (c.s.wash !== undefined) { c.say("ack"); return; } c.s.wash = false; c.say("no_wash_ok"); },
    no_tip(c) { c.say(c.s.paid ? "paid" : "ack"); },
    see_you(c) { c.say("g_bye"); c.end(); },
    no_bangs(c) { c.s.bangs = false; c.say("ack"); },
    no_layers(c) { c.s.layers = false; c.say("ack"); },
    water_temp(c, _slots, seg) {
      if (!c.s.wash) { c.say("ack"); return; }
      if (seg.tags.includes("cold")) c.say("water_fix_cold"); else c.say("water_fix_hot");
      c.expect(waterPending(c));
    },
    water_ok(c) { c.say("water_good"); },
    style(c, _slots, seg) {
      if (c.s.revealed) { c.say("ack"); return; } // the haircut is finished: no blow-dry to add
      if (seg.tags.includes("nodry")) { c.s.blowdry = false; c.say("no_dry_ok"); return; }
      c.s.blowdry = true;
      c.s.style = seg.tags.includes("waves") ? "waves" : seg.tags.includes("volume") ? "volume" : seg.tags.includes("natural") ? "natural" : "straight";
      c.say("style_ok");
    },
    love_it(c) {
      if (!firstThisTurn(c, "love")) return;
      if (!c.s.cutDone) { c.say("ack"); return; }
      if (!c.s.revealed && c.s.chatDone) { c.s.revealed = true; c.say("love_reply"); return; }
      if (c.s.shortSaid && !c.s.revealed) { c.s.revealed = true; c.say("polite_reply"); return; }
      c.say("love_reply");
    },
    more_off(c) {
      if (!c.s.cutDone) { c.say("ack"); return; }
      c.say("more_ok");
      c.say("more_done");
      c.expect({ id: "more_q", expects: ["love_it", "more_off", "polite_ok"], hints: ["result"], suggest: [{ lt: "Pasakyti, kaip patinka", hint: "result" }],
        on: {
          love_it: (cc) => { cc.s.revealed = true; cc.say("love_reply"); },
          polite_ok: (cc) => { cc.s.revealed = true; cc.say("love_reply"); },
          g_ok: (cc) => { cc.s.revealed = true; cc.say("love_reply"); },
          more_off: (cc) => { cc.say("more_ok"); cc.say("more_done"); cc.hold(); return false; },
        },
        yes: (cc) => { cc.s.revealed = true; cc.say("love_reply"); },
        no: (cc) => { cc.say("more_ok"); cc.say("more_done"); cc.hold(); },
        ask: (cc) => cc.say("more_done") });
    },
    shorter_than(c) {
      if (!c.s.cutDone) { c.say("not_short_ok"); return; }
      c.say("sorry_short");
      c.say("grows_fast");
      if (!c.s.discount) { c.s.discount = true; c.say("discount"); }
      c.s.revealed = true;
    },
    polite_ok(c) {
      if (!firstThisTurn(c, "polite")) return;
      if (!c.s.cutDone) { c.say("ack"); return; }
      if (c.s.shortSaid && !c.s.discount) { c.s.discount = true; c.say("polite_reply"); c.say("discount"); c.s.revealed = true; return; }
      c.say("polite_reply");
      c.s.revealed = true;
    },
    dont_like(c) {
      if (!c.s.cutDone) { c.say("ack"); return; }
      c.say("dont_like_reply");
      c.expect({ id: "fix_q", expects: ["more_off", "shorter_than", "love_it"], hints: ["fix", "result"], suggest: [{ lt: "Pasakyti, ką pakeisti", hint: "fix" }],
        on: {
          more_off: (cc, sl, sg) => { salon.handlers.more_off(cc, sl, sg); },
          shorter_than: (cc, sl, sg) => { salon.handlers.shorter_than(cc, sl, sg); },
          love_it: (cc) => { cc.s.revealed = true; cc.say("love_reply"); },
          polite_ok: (cc, sl, sg) => { salon.handlers.polite_ok(cc, sl, sg); },
          g_ok: (cc) => { cc.s.revealed = true; cc.say("polite_reply"); },
        },
        yes: (cc) => { cc.say("more_ok"); cc.say("more_done"); cc.hold(); },
        no: (cc) => { cc.s.revealed = true; cc.say("polite_reply"); },
        ask: (cc) => cc.say("dont_like_reply") });
    },
    react_funny(c) { if (firstThisTurn(c, "react")) c.say("cat_laugh"); },
    ask_cat(c) { c.say("cat_name"); },
    pets_ans(c, _slots, seg) {
      if (!firstThisTurn(c, "react")) return;
      if (seg.tags.includes("dog")) c.say("react_dog");
      else if (seg.tags.includes("cat")) c.say("react_cat");
      else if (seg.tags.includes("nopet")) c.say("react_nopet");
      else c.say("react_fun");
    },
    weekend_ctx(c, _slots, seg) {
      if (!firstThisTurn(c, "react")) return;
      if (seg.tags.includes("party")) c.say("react_party");
      else if (seg.tags.includes("relax")) c.say("react_relax");
      else c.say("react_fun");
    },
    weekend_unknown(c) { if (firstThisTurn(c, "react")) c.say("react_fun"); },
    from_ans(c, _slots, seg) { if (!firstThisTurn(c, "react")) return; if (seg.tags.includes("lt")) c.say("react_lt"); else c.say("react_fun"); },
    vacation_ctx(c, _slots, seg) { if (!firstThisTurn(c, "react")) return; if (seg.tags.includes("relax")) c.say("react_relax"); else c.say("react_fun"); },
    ask_jessie(c) { c.say("jessie_weekend"); },
    ask_owe(c) {
      if (!c.s.cutDone) {
        c.say(c.s.service === "bangs" ? "price_bangs" : "price_cut", { price: c.s.service === "bangs" ? BANGS : CUT });
        c.say("price_extras");
        return;
      }
      const p = total(c);
      if (c.s.wash && c.s.blowdry && !c.s.discount) c.say("total_full", { price: p }); else c.say("total_plain", { price: p });
      c.s.totalSaid = true;
      if (c.step === "pay") c.hold();
    },
    pay_card(c) {
      if (!c.s.revealed) { c.say("card_later"); c.s.payMethod = "card"; return; }
      c.s.totalSaid = true;
      c.say("card_tip");
      c.s.paid = true; c.s.payMethod = "card"; c.event("pay", { method: "card" });
      c.expect({ id: "tip_q", optional: true, expects: ["add_tip", "no_tip"], hints: ["tip", "pay"], suggest: [{ lt: "Pasirinkti arbatpinigius", hint: "tip" }],
        on: { add_tip: (cc, sl, sg) => { salon.handlers.add_tip(cc, sl, sg); }, no_tip: (cc) => { cc.say("paid"); } },
        yes: (cc) => { cc.s.tip = true; cc.say("thanks_tip"); },
        no: (cc) => { cc.say("paid"); } });
    },
    pay_phone(c) {
      if (!c.s.revealed) { c.say("phone_later"); c.s.payMethod = "phone"; return; }
      salon.handlers.pay_card(c, {}, { intent: "pay_card", slots: {}, tags: [] });
    },
    pay_cash(c) {
      c.say("cash_ok"); c.s.payMethod = "cash";
      if (c.s.revealed) { c.s.totalSaid = true; }
    },
    here_you_go(c) {
      if (!c.s.revealed) { c.say("no_problem"); return; }
      c.s.paid = true; c.event("pay", { method: c.s.payMethod || "cash" });
      if (/\bkeep\b|\bfor you\b|\btip\b/i.test(c.heard)) return; // "Here's fifty, keep the change": no change to give back
      if (c.s.payMethod === "card") c.say("paid"); else c.say("change_back");
    },
    keep_change(c) {
      if (!c.s.revealed) { c.say("no_problem"); return; }
      c.s.paid = true; c.s.tip = true; c.event("pay", { method: "cash" });
      c.say("thanks_tip");
    },
    add_tip(c) {
      if (!c.s.cutDone) { c.say("tip_later"); return; }
      c.s.tip = true;
      c.say("thanks_tip");
      if (c.s.revealed && !c.s.paid) { c.s.tipLater = true; }
    },
    book_when(c) { if (!c.s.paid) { c.s.wantBook = true; c.say("book_first"); return; } c.s.booked = true; c.say("book_done"); },
    book_later(c) { if (!c.s.paid) { c.say("ack"); return; } c.s.booked = false; c.say("book_later_ok"); },
  },

  finish: (c) => {
    if (c.s.gaveUp) return;
    if (c.s.paid) {
      c.complete();
      c.event("serve", { haircut: true });
      c.say("closing");
    }
    c.say("bye_after");
    c.expect({ id: "closing", optional: true, hints: ["g_social"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
        see_you: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // hint patterns
    { say: "I have an appointment at three.", intent: "appt_have" },
    { say: "No, I don't have an appointment.", intent: "appt_none", not: ["appt_have"] },
    { say: "Do you take walk-ins?", intent: "walkin" },
    { say: "My name is Tomas.", intent: "name_ctx", step: "name" },
    { say: "Just a trim, please.", intent: "trim" },
    { say: "Just the ends, please.", intent: "trim" },
    { say: "I'd like a haircut.", intent: "haircut" },
    { say: "Could you trim my bangs?", intent: "bangs_only" },
    { say: "Could you cut it like this photo?", intent: "photo" },
    { say: "Not too short, please.", intent: "not_short" },
    { say: "Just an inch, please.", intent: "length" },
    { say: "About two inches.", intent: "length" },
    { say: "Take a little off the sides.", intent: "length" },
    { say: "It's a little too hot.", intent: "water_temp" },
    { say: "It's perfect, thanks.", intent: "water_ok" },
    { say: "Straight, please.", intent: "style" },
    { say: "I love it!", intent: "love_it" },
    { say: "Could you take a little more off?", intent: "more_off" },
    { say: "It's a little shorter than I expected.", intent: "shorter_than" },
    { say: "It's okay. It'll grow back.", intent: "polite_ok" },
    { say: "How much do I owe you?", intent: "ask_owe" },
    { say: "Can I add a tip?", intent: "add_tip" },
    { say: "I'll add twenty percent.", intent: "add_tip" },
    { say: "Keep the change!", intent: "keep_change" },
    { say: "Yes, in six weeks, please.", intent: "book_when" },
    { say: "What's your cat's name?", intent: "ask_cat" },
    { say: "That's so funny!", intent: "react_funny" },
    { say: "I'm going to a party this weekend.", intent: "weekend_ctx", step: "chat" },
    { say: "I'm from Lithuania.", intent: "from_ans" },
    // natural alternatives and short answers
    { say: "Tomas", intent: "name_ctx", step: "name" },
    { say: "Half an inch.", intent: "length", step: "length" },
    { say: "Two centimeters.", intent: "length", step: "length" },
    { say: "Card", intent: "pay_card", step: "pay" },
    { say: "With some volume, please.", intent: "style" },
    { say: "With some waves, please.", intent: "style" },
    { say: "Can you make it a bit cooler?", intent: "water_temp" },
    { say: "Just a little.", intent: "length", step: "length" },
    { say: "Not really, just relaxing.", intent: "weekend_ctx", step: "chat" },
    // British variants
    { say: "Can you trim my fringe?", intent: "bangs_only" },
    { say: "I'd like a wash and cut.", intent: "wash_request" },
    { say: "Yes, that's right.", intent: "yn:yes" },
    { say: "Hi, I'm here for my three o'clock.", intent: "appt_have" },
    { say: "I'll call you later.", intent: "book_later", not: ["drink_ans"] },
    { say: "I don't want bangs.", intent: "no_bangs", not: ["bangs_only"] },
    // negation and meaning preservation
    { say: "I don't want it too short.", intent: "not_short", not: ["go_short"] },
    { say: "I don't like it.", intent: "dont_like", not: ["love_it"] },
    { say: "I don't want layers.", intent: "no_layers", not: ["keep_layers"] },
    { say: "I can't wait.", intent: "wait_no", not: ["wait_ok"] },
    { say: "I don't have any pets.", intent: "pets_ans", not: ["react_funny"] },
    // model answers of the guide
    { say: "Some water, please.", intent: "drink_ans", step: "drink" },
    { say: "It's Tomas.", intent: "name_ctx", step: "name" },
    { say: "That's so cute!", intent: "react_funny", step: "chat" },
    { say: "I'm meeting some friends.", intent: "weekend_ctx", step: "chat" },
    { say: "I'm visiting my family in Lithuania.", intent: "vacation_ctx", step: "chat" },
    { say: "No, I don't have any pets.", intent: "pets_ans", step: "chat", not: ["react_funny"] },
    { say: "Twenty percent, please.", intent: "add_tip", step: "pay" },
    { say: "Sure, I can wait.", intent: "wait_ok" },
    { say: "I still like it, thanks.", intent: "polite_ok", step: "reveal", not: ["dont_like"] },
    { say: "That's perfect, thanks.", intent: "confirm_yes" },
    // unrelated
    { say: "scissors banana moonlight", intent: "none" },
    { say: "the car is purple", intent: "none" },
    // more constructions and vocabulary (dev corpus tests/corpus/s77-salon.json)
    { say: "Yes, at three o'clock", intent: "appt_have", step: "appt" },
    { say: "I made an appointment online", intent: "appt_have", step: "appt" },
    { say: "Is it possible without an appointment?", intent: "walkin" },
    { say: "The appointment is under Tomas", intent: "name_ctx", step: "name" },
    { say: "Same as last time", intent: "trim", step: "service" },
    { say: "I want to change my hairstyle", intent: "go_short", step: "service" },
    { say: "Short on the sides, longer on top", intent: "length", step: "service" },
    { say: "An inch or two", intent: "length", step: "length" },
    { say: "Around 2 cm", intent: "length", step: "length", slots: { c: 2 } },
    { say: "No, I'm growing them out", intent: "no_bangs", step: "bangs_q" },
    { say: "No, I washed it this morning", intent: "no_wash", step: "wash" },
    { say: "Could it be a bit warmer?", intent: "water_temp" },
    { say: "Your cat is so cute", intent: "react_funny", step: "chat" },
    { say: "I'm Lithuanian", intent: "from_ans" },
    { say: "Wow, I look younger!", intent: "love_it", step: "reveal" },
    { say: "Can you fix the back a little?", intent: "more_off", step: "reveal" },
    { say: "I'll pay by phone", intent: "pay_phone", step: "pay" },
    { say: "Fifteen percent is fine", intent: "add_tip", step: "pay", slots: { p: 15 } },
    { say: "Yes, in about two months", intent: "book_when", step: "book" },
    { say: "Thanks, see you next time", intent: "see_you" },
    // safety
    { say: "No tip, sorry", intent: "no_tip", not: ["add_tip"] },
    { say: "I don't want it short", intent: "not_short", not: ["go_short"] },
    { say: "Don't cut my bangs", intent: "no_bangs", step: "bangs_q", not: ["bangs_only"] },
    { say: "It doesn't look good", intent: "dont_like", step: "reveal", not: ["love_it"] },
    // bug review 25 Sep: walk-in at "Are you my three o'clock?"
    { say: "Hi! Do you have time for a haircut now?", intent: "walkin", step: "appt" },
    { say: "No, but do you have time for a trim today?", intent: "walkin", step: "appt" },
    { say: "Can I get a trim now?", intent: "walkin", step: "appt" },
    { say: "I don't have time for a haircut now", intent: "none", not: ["walkin"] },
  ],

  sims: [
    { name: "appointment, trim, wash, card with tip", turns: ["Hi! I have an appointment at three.", "It's Tomas.", "Just a trim, please.", "Just an inch.", "Yes, please.", "It's perfect.",
      "That's so funny!", "Yes, please.", "Straight, please.", "I love it!", "Card, please.", "I'll add twenty percent.", "Thank you, bye!"], expect: { complete: true }, auto: AUTO },
    { name: "walk-in, wash, centimeters, water, cash tip", turns: ["Hi, do you take walk-ins?", "A wash and a trim, please.", "Two centimeters, please.", "Yes, that's right.",
      "It's a little too hot.", "That's better, thanks.", "What's your cat's name?", "It looks great, thank you!", "How much do I owe you?", "Here's fifty. Keep the change!", "Bye!"],
      expect: { complete: true }, auto: { ...AUTO, wait_q: "Sure, I can wait." } },
    { name: "bangs only, fringe, cash", turns: ["Hi! I don't have an appointment.", "Can you trim my fringe?", "I love it!", "Cash.", "Here you go.", "Not right now, thanks.", "Bye!"],
      expect: { complete: true }, auto: { ...AUTO, wait_q: "Sure, I can wait.", blowdry: "No, thanks, I'll let it air-dry." } },
    { name: "shorter than expected: polite reaction", turns: ["I have an appointment at three.", "Tomas.", "I'd like a haircut.", "Not too short, please.", "About two inches.", "It's a little shorter than I expected.",
      "It's okay. It'll grow back.", "Can I pay by card?", "Thank you!"], expect: { complete: true }, auto: AUTO },
    { name: "photo and small talk", turns: ["Hi! Yes, I have an appointment. The name is Tomas.", "Could you cut it like this photo?", "I'm going to a party this weekend.", "With some waves, please.",
      "Could you take a little more off?", "Perfect, thank you!", "Card.", "In six weeks, please.", "Thanks!"], expect: { complete: true },
      auto: { ...AUTO, blowdry: "Yes, please.", style: "With some waves, please." } },
  ],
};

// ---------------------------------------------------------------------------
// Flow helpers

/** True the first time `key` comes up in this learner turn (a sentence can be split into two segments): the engine gives every turn its own
 *  context object, so the same words said again in a later turn count again. */
const TURN = new WeakMap<object, Set<string>>();
function firstThisTurn(c: Ctx, key: string): boolean {
  let seen = TURN.get(c);
  if (!seen) TURN.set(c, (seen = new Set()));
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}

function checkIn(c: Ctx) {
  c.s.checkedIn = true;
  if (c.s.otherTime) c.say("appt_other_time");
  else c.say("appt_found");
}

function autoCheckIn(c: Ctx) {
  // The learner went straight to the haircut: treat them as checked in.
  c.s.checkedIn = true;
  if (c.s.appt === undefined) c.s.appt = true;
}

function walkIn(c: Ctx) {
  if (c.s.walkinWait) {
    c.twist("walkin_wait");
    c.s.waiting = true;
    c.say("walkin_wait");
    c.expect({ id: "wait_q", expects: ["wait_ok", "wait_no"], hints: ["wait", "wait_later", "g_yesno"], suggest: [{ lt: "Pasakyti, kad palauksi", hint: "wait" }, { lt: "Pasakyti, kad grįši vėliau", hint: "wait_later" }],
      on: { wait_ok: (cc) => { finishWait(cc); }, wait_no: (cc) => { cc.s.waiting = false; cc.s.gaveUp = true; cc.say("wait_no_line"); cc.end(); } },
      yes: (cc) => { finishWait(cc); },
      no: (cc) => { cc.s.waiting = false; cc.s.gaveUp = true; cc.say("wait_no_line"); cc.end(); },
      ask: (cc) => cc.say("walkin_wait") });
    return;
  }
  c.say("walkin_ok");
  c.s.checkedIn = true;
}

function finishWait(c: Ctx) {
  c.s.waiting = false;
  c.say("wait_ok_line");
  c.say("come_back_now");
  c.s.checkedIn = true;
}

function startWash(c: Ctx) {
  c.s.wash = true;
  c.say("wash_start");
  c.say("ask_water");
  c.expect(waterPending(c));
}

function waterPending(c: Ctx): Pending {
  return { id: "water", expects: ["water_temp", "water_ok"], hints: ["water"], suggest: [{ lt: "Pasakyti, koks vanduo", hint: "water" }],
    on: {
      water_temp: (cc, sl, sg) => { salon.handlers.water_temp(cc, sl, sg); },
      water_ok: (cc) => { cc.say("water_good"); },
      g_ok: (cc) => { cc.say("water_good"); },
      confirm_yes: (cc) => { cc.say("water_good"); },
    },
    yes: (cc) => { cc.say("water_good"); },
    no: (cc) => { cc.say("water_fix_hot"); cc.expect(waterPending(cc)); },
    ask: (cc) => cc.say("ask_water") };
}

function stylePending(_c: Ctx): Pending {
  return { id: "style", expects: ["style"], hints: ["style"], suggest: [{ lt: "Pasakyti, kaip išdžiovinti", hint: "style" }],
    on: { style: (cc, sl, sg) => { salon.handlers.style(cc, sl, sg); } },
    yes: (cc) => { cc.s.style = "straight"; cc.say("style_ok"); },
    no: (cc) => { cc.s.blowdry = false; cc.say("no_dry_ok"); },
    ask: (cc) => cc.say("ask_style") };
}

function catPending(_c: Ctx): Pending {
  return { id: "chat", optional: true, expects: ["react_funny", "ask_cat", "pets_ans", "weekend_ctx", "vacation_ctx", "from_ans"], hints: ["chat"], suggest: [{ lt: "Sureaguoti arba paklausti apie katę", hint: "chat" }],
    on: {
      react_funny: (cc) => { if (firstThisTurn(cc, "react")) { cc.say("cat_laugh"); endChat(cc); } },
      ask_cat: (cc) => { cc.say("cat_name"); endChat(cc); },
      g_ok: (cc) => { if (firstThisTurn(cc, "react")) { cc.say("cat_laugh"); endChat(cc); } },
      pets_ans: (cc, sl, sg) => { salon.handlers.pets_ans(cc, sl, sg); endChat(cc); },
      weekend_ctx: (cc, sl, sg) => { salon.handlers.weekend_ctx(cc, sl, sg); },
      vacation_ctx: (cc, sl, sg) => { salon.handlers.vacation_ctx(cc, sl, sg); },
      from_ans: (cc, sl, sg) => { salon.handlers.from_ans(cc, sl, sg); },
    },
    yes: (cc) => { cc.say("cat_laugh"); endChat(cc); },
    no: (cc) => { cc.say("cat_anyway"); endChat(cc); } };
}

function endChat(c: Ctx) {
  // After the cat story, Jessie sometimes asks one small-talk question.
  if (!c.s.askedTalk && c.chance(0.5)) askSmallTalk(c);
}

function askSmallTalk(c: Ctx) {
  c.s.askedTalk = true;
  const topic = c.s.talkTopic as string;
  const line = topic === "weekend" ? "ask_weekend" : topic === "from" ? "ask_from" : topic === "vacation" ? "ask_vacation" : "ask_pets";
  c.say(line);
  const done = (_cc: Ctx) => { /* the question is answered */ };
  c.expect({ id: "chat_" + topic, optional: true, expects: ["weekend_ctx", "from_ans", "vacation_ctx", "pets_ans", "weekend_unknown", "ask_cat"], hints: ["talk_" + topic, "chat"],
    suggest: [{ lt: "Atsakyti kirpėjai", hint: "talk_" + topic }],
    on: {
      weekend_ctx: (cc, sl, sg) => { salon.handlers.weekend_ctx(cc, sl, sg); done(cc); },
      weekend_unknown: (cc) => { if (firstThisTurn(cc, "react")) cc.say("react_fun"); done(cc); },
      from_ans: (cc, sl, sg) => { salon.handlers.from_ans(cc, sl, sg); done(cc); },
      vacation_ctx: (cc, sl, sg) => { salon.handlers.vacation_ctx(cc, sl, sg); done(cc); },
      pets_ans: (cc, sl, sg) => { salon.handlers.pets_ans(cc, sl, sg); done(cc); },
      ask_jessie: (cc) => { cc.say("jessie_weekend"); done(cc); },
      ask_cat: (cc) => { cc.say("cat_name"); done(cc); },
    },
    yes: (cc) => { cc.say("react_fun"); done(cc); },
    no: (cc) => { cc.say(topic === "pets" ? "react_nopet" : "react_relax"); done(cc); },
    ask: (cc) => cc.say(line) });
}

export default salon;
