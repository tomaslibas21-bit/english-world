// The photo walk (batch 5, item 5; words by Claude, 23 Nov 2026). Hana, a tourist with a big camera, stands on Main
// Street by the Visitor Center. She is making a photo book of Maple Harbor for her grandma, and her feet are tired:
// will the learner take the twelve photos for her? Optional, only for those who accept (x02-photo-walk). Each thing is
// found by walking near it, tapping the camera and saying (or picking) its name; the book fills; Hana thanks the
// learner at the end. Lines `pw_<id>`; the twelve things `pw_n_<thing>` (the name) and `pw_w_<thing>` (Hana's note on
// where to look). `pw_a_…` are the learner's own lines in the finale (the microphone, or a tap).

import type { SentSrc } from "./types";
import { t } from "./dsl";

export const PHOTO_WALK_SITUATION = "x02-photo-walk";
export const PHOTO_WALK_NPC = "hana";

export const PHOTO_WALK_META = {
  title: { en: "Photo Walk", lt: "Fotografavimo žygis" },
  topic: { en: "A tourist's photo book", lt: "Turistės nuotraukų knyga" },
  goal: "Pasišnekėk su Hana ir padėk jai: nufotografuok dvylika dalykų mieste ir pasakyk, kas tai.",
  intro: "Hana – turistė su dideliu fotoaparatu. Ji stovi prie Lankytojų centro ir dairosi aplink, lyg ko ieškotų.",
  mission: [{ step: "help", lt: "Pasakyk, ar padėsi Hanai" }],
  suggest: "Atsakyti Hanai",
} as const;

export const PHOTO_WALK_LINES: Record<string, SentSrc[]> = {
  // ---- the chat (x02-photo-walk)
  pw_greet: [t("Hi! | Could you | help | me | with something?", "Labas! | Ar galėtumėte | padėti | man | vienu reikalu?", "Labas! Gal galėtumėte man padėti?")],
  pw_again: [t("Hi again! | Do you | have | time | for | my | photo book | now?", "Sveiki dar kartą! | Ar Jūs | turite | laiko | — | mano | nuotraukų knygai | dabar?", "Sveiki dar kartą! Gal dabar turite laiko mano nuotraukų knygai?")],
  pw_book: [t("I'm | making | a | photo book | of | Maple Harbor | for | my | grandma.", "Aš | darau | — | nuotraukų knygą | apie | Maple Harbor | — | savo | močiutei.", "Darau nuotraukų knygą apie Maple Harbor savo močiutei.")],
  pw_list: [t("There are | twelve | things | on | my | list, | but | my | feet | are | so | tired!", "Yra | dvylika | dalykų | — | mano | sąraše, | bet | mano | kojos | — | taip | pavargo!", "Mano sąraše – dvylika dalykų, bet kojos jau taip pavargo!")],
  pw_ask: [t("Could you | take | the | photos | for me?", "Ar galėtumėte | padaryti | — | nuotraukas | už mane?", "Gal galėtumėte nufotografuoti už mane?")],
  pw_thanks: [t("Oh, | thank you! | Here's | my | list.", "O, | ačiū! | Štai | mano | sąrašas.", "O, ačiū! Štai mano sąrašas.")],
  pw_how: [t("Find | each | thing, | take a photo | and | tell | me | what | it is.", "Suraskite | kiekvieną | dalyką, | nufotografuokite | ir | pasakykite | man, | kas | tai yra.", "Suraskite kiekvieną dalyką, nufotografuokite ir pasakykite man, kas tai.")],
  pw_fun: [t("Have fun!", "Smagaus pasivaikščiojimo!", "Smagaus pasivaikščiojimo!")],
  pw_later: [t("No problem! | I'll be | right here.", "Nieko tokio! | Aš būsiu | čia pat.", "Nieko tokio! Aš būsiu čia pat.")],
  pw_bye: [t("See you!", "Iki!", "Iki!")],

  // ---- while the walk is on (a tap on Hana opens the book) and after it
  pw_going: [t("How's it going? | Take your time!", "Kaip sekasi? | Neskubėkite!", "Kaip sekasi? Neskubėkite!")],
  pw_thanks_again: [t("Thanks again | for | the | photos!", "Dar kartą ačiū | už | — | nuotraukas!", "Dar kartą ačiū už nuotraukas!")],

  // ---- the finale: all twelve found, back at Hana
  pw_fin_1: [t("You found | them | all? | Can I | see?", "Jūs radote | juos | visus? | Ar galiu | pažiūrėti?", "Jūs radote viską? Galiu pažiūrėti?")],
  pw_a_here: [t("Sure! | Here you go.", "Žinoma! | Prašom.", "Žinoma! Prašom.")],
  pw_fin_2: [t("Wow, | these | are | great! | My | grandma | is going to | love | them.", "Oho, | šios | yra | puikios! | Mano | močiutei | — | patiks | jos.", "Oho, kokios puikios! Močiutei labai patiks.")],
  pw_fin_3: [t("Thank you | so much | for | your | help!", "Ačiū | labai | už | Jūsų | pagalbą!", "Labai ačiū už pagalbą!")],
  pw_a_welcome: [t("You're welcome! | It was | fun.", "Prašom! | Buvo | smagu.", "Prašom! Buvo smagu.")],
  pw_fin_bye: [t("Take care!", "Laikykitės!", "Laikykitės!")],

  // ---- the twelve things: the name (said by Hana when the photo is in) ...
  pw_n_lighthouse: [t("the | lighthouse", "— | švyturys", "švyturys")],
  pw_n_mailbox: [t("a | mailbox", "— | pašto dėžutė", "pašto dėžutė")],
  pw_n_food_truck: [t("a | food | truck", "— | maisto | furgonėlis", "maisto furgonėlis")],
  pw_n_fountain: [t("the | fountain", "— | fontanas", "fontanas")],
  pw_n_hydrant: [t("a | fire | hydrant", "— | gaisrinis | hidrantas", "gaisrinis hidrantas")],
  pw_n_pumpkin: [t("a | pumpkin", "— | moliūgas", "moliūgas")],
  pw_n_boat: [t("a | fishing | boat", "— | žvejų | laivelis", "žvejų laivelis")],
  pw_n_bus_stop: [t("a | bus | stop", "— | autobusų | stotelė", "autobusų stotelė")],
  pw_n_gazebo: [t("a | gazebo", "— | pavėsinė", "pavėsinė")],
  pw_n_umbrella: [t("a | beach | umbrella", "— | paplūdimio | skėtis", "paplūdimio skėtis")],
  pw_n_maple: [t("a | maple | tree", "— | klevo | medis", "klevas")],
  pw_n_trash_can: [t("a | trash | can", "— | šiukšlių | dėžė", "šiukšliadėžė")],

  // ---- ... and Hana's note on where to look (shown when the learner taps the thing's page)
  pw_w_lighthouse: [t("It's | on | the | island, | across | the | bay.", "Jis yra | ant | — | salos, | už | — | įlankos.", "Jis ant salos, už įlankos.")],
  pw_w_mailbox: [t("Look | in front of | the | post office.", "Ieškokite | priešais | — | paštą.", "Ieškokite priešais paštą.")],
  pw_w_food_truck: [t("Look | in | the | square. | They | sell | lobster rolls!", "Ieškokite | — | — | aikštėje. | Jie | parduoda | sumuštinius su omarais!", "Ieškokite aikštėje – ten parduoda sumuštinius su omarais!")],
  pw_w_fountain: [t("Look | in | the | center | of | the | square.", "Ieškokite | — | — | centre | — | — | aikštės.", "Ieškokite aikštės centre.")],
  pw_w_hydrant: [t("Look | along | Main Street, | by | the | curb.", "Ieškokite | palei | Main Street gatvę, | prie | — | šaligatvio krašto.", "Ieškokite palei Main Street gatvę, prie šaligatvio krašto.")],
  pw_w_pumpkin: [t("Look | by | the | shop | doors.", "Ieškokite | prie | — | parduotuvių | durų.", "Ieškokite prie parduotuvių durų.")],
  pw_w_boat: [t("Look | by | the | pier.", "Ieškokite | prie | — | prieplaukos.", "Ieškokite prie prieplaukos.")],
  pw_w_bus_stop: [t("Look | on | Oak Avenue, | by | the | gym.", "Ieškokite | — | Oak Avenue alėjoje, | prie | — | sporto klubo.", "Ieškokite Oak Avenue alėjoje, prie sporto klubo.")],
  pw_w_gazebo: [t("Look | in | the | square.", "Ieškokite | — | — | aikštėje.", "Ieškokite aikštėje.")],
  pw_w_umbrella: [t("Look | on | the | beach.", "Ieškokite | — | — | paplūdimyje.", "Ieškokite paplūdimyje.")],
  pw_w_maple: [t("Look | for | red | leaves. | There are | lots!", "Ieškokite | — | raudonų | lapų. | Jų yra | daug!", "Ieškokite raudonų lapų – jų daug!")],
  pw_w_trash_can: [t("Look | next to | a | bench.", "Ieškokite | šalia | — | suoliuko.", "Ieškokite šalia suoliuko.")],
};

/** The learner's lines in the chat (the hints). */
export const PHOTO_WALK_HINTS = {
  help: { lt: "Atsakyti Hanai", items: [
    { id: "h_sure", s: t("Sure, | I'd love to!", "Žinoma, | mielai!", "Žinoma, mielai!") },
    { id: "h_what", s: t("Sure! | What | do I do?", "Žinoma! | Ką | man daryti?", "Žinoma! Ką man daryti?") },
    { id: "h_later", s: t("Maybe | later.", "Gal | vėliau.", "Gal vėliau.") },
  ] },
};

/** What the learner may say in the chat (patterns as in the other situations: lower case, contractions written out). */
export const PHOTO_WALK_INTENTS = {
  help_yes: { patterns: [
    "(sure | yes | yeah | ok | okay | of course) [i would love to | i'd love to | i can | no problem] #h:h_sure",
    "(sure | yes | ok | okay) what do i (do | have to do) #h:h_what",
    "i would love to", "i can help [you]", "happy to help", "no problem", "what do i (do | have to do)",
  ] },
  help_later: { patterns: [
    "(maybe | perhaps) later #h:h_later", "not (now | right now | today)", "no thanks", "no thank you", "sorry i am busy", "later",
  ] },
};

/** The finale's learner lines: what else they may say (lower case, no punctuation), for the speech match. */
export const PHOTO_WALK_ACCEPT: Record<string, string[]> = {
  pw_a_here: ["sure here you go", "here you go", "here you are", "here it is", "here they are", "sure", "of course", "yes"],
  pw_a_welcome: ["you're welcome it was fun", "you're welcome", "you are welcome", "it was fun", "no problem", "my pleasure", "anytime"],
};

/** The twelve things, in the book's order. `say`: the names the speech match takes (after "it's / that's / a / an /
 *  the", which it drops); `icon`: the page's picture until there is a photo. `near`: how close (m) the learner must be
 *  (a big thing can be photographed from further off). */
export const PHOTO_THINGS = [
  { id: "lighthouse", icon: "🗼", near: 70, say: ["lighthouse", "light house"] },
  { id: "mailbox", icon: "📮", near: 9, say: ["mailbox", "mail box", "post box", "postbox", "letter box"] },
  { id: "food_truck", icon: "🚚", near: 14, say: ["food truck", "lobster truck", "food cart", "truck"] },
  { id: "fountain", icon: "⛲", near: 16, say: ["fountain"] },
  { id: "hydrant", icon: "🧯", near: 8, say: ["fire hydrant", "hydrant", "fire plug"] },
  { id: "pumpkin", icon: "🎃", near: 8, say: ["pumpkin", "pumpkins"] },
  { id: "boat", icon: "⛵", near: 25, say: ["fishing boat", "boat", "lobster boat", "fishing boats", "boats"] },
  { id: "bus_stop", icon: "🚏", near: 12, say: ["bus stop", "bus shelter", "bus station"] },
  { id: "gazebo", icon: "🛖", near: 16, say: ["gazebo", "bandstand"] },
  { id: "umbrella", icon: "⛱️", near: 14, say: ["beach umbrella", "umbrella", "sun umbrella", "parasol"] },
  { id: "maple", icon: "🍁", near: 12, say: ["maple tree", "maple", "tree", "maple trees"] },
  { id: "trash_can", icon: "🗑️", near: 8, say: ["trash can", "garbage can", "trash bin", "garbage bin", "trashcan"] },
] as const;

/** The interface (Lithuanian). */
export const PHOTO_WALK_UI = {
  book: "Hanos nuotraukų knyga",
  open: "Atversti knygą",
  shoot: "Fotografuoti",
  whatIsIt: "Kas tai?",
  sayOrPick: "Pasakyk arba pasirink",
  wrong: "Ne visai – pabandyk dar kartą",
  got: "Puiku! Nuotrauka knygoje.",
  found: (n: number, of: number) => `Rasta: ${n} iš ${of}`,
  where: "Kur ieškoti?",
  pause: "Pristabdyti",
  paused: "Knyga palauks. Ją rasi telefone.",
  resume: "Tęsti fotografavimą",
  quit: "Baigti",
  quitAsk: "Baigti fotografavimą? Rastos nuotraukos liks knygoje.",
  quitYes: "Baigti",
  quitNo: "Ne, tęsti",
  close: "Užverti",
  allFound: "Visi 12! Nunešk knygą Hanai.",
  done: "Knyga baigta – ačiū!",
  phone: "Hanos knyga",
} as const;
