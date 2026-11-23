// The photo walk in Puerto Colibrí (batch 5, item 5; words by Claude, 23 Nov 2026). Renata, a young tourist from
// Mexico City with a big camera, stands on avenida Juárez by Información Turística. She is making a photo album of
// Puerto Colibrí for her grandma, and her feet hurt: will the learner take the twelve photos for her? She says tú (a
// tourist of the learner's age, informal; the Spain variety too). Optional, only for those who accept (x12-album).
// Lines `pw_<id>`; the twelve things `pw_n_<thing>` (the name) and `pw_w_<thing>` (Renata's note on where to look).
// `pw_a_…` are the learner's own lines in the finale.

import type { SentSrc } from "@/content/types";
import { t } from "@/content/dsl";

export const PHOTO_WALK_SITUATION = "x12-album";
export const PHOTO_WALK_NPC = "renata";

const F_ZOCALO = "zócalo: a Mexican town's main square.";
const F_TIANGUIS = "tianguis: an open-air street market (Mexico).";

export const PHOTO_WALK_META = {
  title: { en: "Un álbum de fotos", lt: "A photo album" },
  topic: { en: "Con una turista", lt: "With a tourist" },
  goal: "Chat with Renata and help her: take photos of twelve things around town and say what each one is.",
  intro: "Renata, a tourist from Mexico City with a big camera, is standing by Información Turística and looking around as if she has lost something.",
  mission: [{ step: "help", lt: "Say if you'll help Renata" }],
  suggest: "Answer Renata",
} as const;

export const PHOTO_WALK_LINES: Record<string, SentSrc[]> = {
  // ---- the chat (x12-album)
  pw_greet: [t("¡Hola! | ¿Me | ayudas | con | algo?", "Hi! | Me | you-help | with | something?", "Hi! Can you help me with something?")],
  pw_again: [t("¡Hola | otra vez! | ¿Ya | tienes | tiempo | para | mi | álbum?", "Hi | again! | Now | you-have | time | for | my | album?", "Hi again! Do you have time for my album now?")],
  pw_book: [t("Estoy | haciendo | un | álbum | de | fotos | de | Puerto Colibrí | para | mi | abuela.", "I-am | making | an | album | of | photos | of | Puerto Colibrí | for | my | grandma.", "I'm making a photo album of Puerto Colibrí for my grandma.")],
  pw_list: [t("Tengo | una | lista | de | doce | cosas, | ¡pero | ya | me | duelen | los | pies!", "I-have | a | list | of | twelve | things, | but | already | to-me | they-hurt | the | feet!", "I have a list of twelve things, but my feet already hurt!",
    { flags: { 9: "doler works like gustar: los pies me duelen, my feet hurt (to me)." } })],
  pw_ask: [t("¿Me | ayudas | a | tomar | las | fotos?", "Me | you-help | to | take | the | photos?", "Can you help me take the photos?",
    { spain: t("¿Me | ayudas | a | hacer | las | fotos?", "Me | you-help | to | make | the | photos?", "Can you help me take the photos?", { flags: { 3: "hacer fotos: to take photos (Spain; tomar fotos in Mexico)." } }) })],
  pw_thanks: [t("¡Ay, | gracias! | Aquí | está | mi | lista.", "Oh, | thanks! | Here | is | my | list.", "Oh, thank you! Here's my list.")],
  pw_how: [t("Busca | cada | cosa, | tómale | una | foto | y | dime | qué | es.", "Look-for | each | thing, | take-of-it | a | photo | and | tell-me | what | it-is.", "Find each thing, take a photo of it and tell me what it is.",
    { flags: { 3: "tómale = toma + le: take (a photo) of it." },
      spain: t("Busca | cada | cosa, | hazle | una | foto | y | dime | qué | es.", "Look-for | each | thing, | make-of-it | a | photo | and | tell-me | what | it-is.", "Find each thing, take a photo of it and tell me what it is.", { flags: { 3: "hazle = haz + le: take (a photo) of it; Spain says hacer una foto." } }) })],
  pw_fun: [t("¡Que | te | diviertas!", "That | yourself | you-enjoy!", "Have fun!", { flags: { 2: "diviertas: subjunctive of divertirse; que + subjunctive makes a wish." } })],
  pw_later: [t("¡No | hay | problema! | Aquí | te | espero.", "No | there-is | problem! | Here | you | I-wait-for.", "No problem! I'll wait for you here.")],
  pw_bye: [t("¡Nos vemos!", "We-see-each-other!", "See you!")],

  // ---- while the walk is on (a tap on Renata opens the album) and after it
  pw_going: [t("¿Cómo | vas? | ¡Sin | prisa!", "How | you-go? | Without | hurry!", "How's it going? Take your time!", { flags: { 1: "¿Cómo vas?: how's it going (for you)?" } })],
  pw_thanks_again: [t("¡Gracias | otra vez | por | las | fotos!", "Thanks | again | for | the | photos!", "Thanks again for the photos!")],

  // ---- the finale: all twelve found, back at Renata
  pw_fin_1: [t("¿Ya | las | encontraste | todas? | ¿A ver?", "Already | them | you-found | all? | Let's see?", "Did you find them all? Let me see!",
    { spain: t("¿Ya | las | has encontrado | todas? | ¿A ver?", "Already | them | you-have-found | all? | Let's see?", "Did you find them all? Let me see!") })],
  pw_a_here: [t("¡Claro! | Aquí | tienes.", "Sure! | Here | you-have.", "Sure! Here you go.")],
  pw_fin_2: [t("¡Qué | bonitas! | A | mi | abuela | le | van a | encantar.", "How | pretty! | To | my | grandma | to-her | they're-going-to | delight.", "They're so pretty! My grandma is going to love them.",
    { flags: { 5: "le repeats a mi abuela: to her.", 7: "encantar works like gustar: they will delight her." } })],
  pw_fin_3: [t("¡Mil | gracias | por | tu | ayuda!", "Thousand | thanks | for | your | help!", "Thanks a million for your help!")],
  pw_a_welcome: [t("¡De nada! | Fue | muy | divertido.", "Of nothing! | It-was | very | fun.", "You're welcome! It was a lot of fun.")],
  pw_fin_bye: [t("¡Cuídate!", "Take-care-of-yourself!", "Take care!")],

  // ---- the twelve things: the name (said by Renata when the photo is in) ...
  pw_n_lighthouse: [t("el | faro", "the | lighthouse", "the lighthouse")],
  pw_n_mailbox: [t("el | buzón", "the | mailbox", "the mailbox")],
  pw_n_pinata: [t("una | piñata", "a | piñata", "a piñata")],
  pw_n_kiosco: [t("el | kiosco", "the | bandstand", "the bandstand", { flags: { 1: "kiosco: the bandstand in the middle of a Mexican main square." } })],
  pw_n_colectivo: [t("un | colectivo", "a | shared-minibus", "a colectivo (a shared minibus)", { flags: { 1: "colectivo: a minibus on a fixed route that picks people up anywhere along it." } })],
  pw_n_hammock: [t("una | hamaca", "a | hammock", "a hammock")],
  pw_n_palapa: [t("una | palapa", "a | palm-roof-shelter", "a palapa (a shelter with a palm-leaf roof)")],
  pw_n_elotes: [t("un | carrito | de | elotes", "a | cart | of | corn-cobs", "an elote cart (corn on the cob)", { flags: { 3: "elote: corn on the cob (Mexico)." } })],
  pw_n_lancha: [t("una | lancha", "a | motorboat", "a motorboat")],
  pw_n_palm: [t("una | palmera", "a | palm tree", "a palm tree")],
  pw_n_papel: [t("el | papel picado", "the | cut-paper-banners", "papel picado (cut-paper banners)")],
  pw_n_temple: [t("el | templo", "the | temple", "the temple")],

  // ---- ... and Renata's note on where to look (shown when the learner taps the thing's page)
  pw_w_lighthouse: [t("Está | en | las | rocas, | al final | del | malecón.", "It-is | on | the | rocks, | at-the-end | of-the | seafront.", "It's on the rocks at the end of the malecón.", { flags: { 6: "malecón: the seafront promenade." } })],
  pw_w_mailbox: [t("Búscalo | frente al | correo.", "Look-for-it | in-front-of-the | post-office.", "Look in front of the post office.",
    { spain: t("Búscalo | frente a | Correos.", "Look-for-it | in-front-of | Post-Office.", "Look in front of the post office.") })],
  pw_w_pinata: [t("Búscala | en | el | tianguis | del | zócalo.", "Look-for-it | at | the | street-market | of-the | main-square.", "Look at the tianguis in the zócalo.", { flags: { 3: F_TIANGUIS, 5: F_ZOCALO } })],
  pw_w_kiosco: [t("Está | en | medio | del | zócalo.", "It-is | in | middle | of-the | main-square.", "It's in the middle of the zócalo.", { flags: { 4: F_ZOCALO } })],
  pw_w_colectivo: [t("Búscalo | en | la | avenida Juárez.", "Look-for-it | on | the | avenue Juárez.", "Look on Avenida Juárez.")],
  pw_w_hammock: [t("Búscala | en | la | playa, | entre | dos | palmeras.", "Look-for-it | on | the | beach, | between | two | palm-trees.", "Look on the beach, between two palm trees.")],
  pw_w_palapa: [t("Hay | muchas | en | la | playa.", "There-are | many | on | the | beach.", "There are lots on the beach.")],
  pw_w_elotes: [t("Búscalo | en | el | zócalo.", "Look-for-it | in | the | main-square.", "Look in the zócalo.", { flags: { 3: F_ZOCALO } })],
  pw_w_lancha: [t("Búscala | junto al | muelle.", "Look-for-it | next-to-the | pier.", "Look next to the pier.")],
  pw_w_palm: [t("¡Hay | palmeras | por todos lados!", "There-are | palm-trees | everywhere!", "There are palm trees everywhere!",
    { spain: t("¡Hay | palmeras | por todas partes!", "There-are | palm-trees | everywhere!", "There are palm trees everywhere!") })],
  pw_w_papel: [t("Mira | arriba, | en | el | zócalo.", "Look | up, | in | the | main-square.", "Look up, in the zócalo.", { flags: { 4: F_ZOCALO } })],
  pw_w_temple: [t("Está | en | las | ruinas, | después de | la | playa.", "It-is | at | the | ruins, | past | the | beach.", "It's at the ruins, past the beach.")],
};

/** The learner's lines in the chat (the hints). The learner says tú to Renata. */
export const PHOTO_WALK_HINTS = {
  help: { lt: "Answer Renata", items: [
    { id: "h_sure", s: t("¡Claro, | con gusto!", "Sure, | with pleasure!", "Sure, I'd be glad to!") },
    { id: "h_what", s: t("¡Claro! | ¿Qué | tengo que | hacer?", "Sure! | What | I-have-to | do?", "Sure! What do I have to do?") },
    { id: "h_later", s: t("Tal vez | luego.", "Maybe | later.", "Maybe later.") },
  ] },
};

export const PHOTO_WALK_INTENTS = {
  help_yes: { patterns: [
    "(claro | si | sale | va | ok | por supuesto) [con gusto | te ayudo] #h:h_sure",
    "(claro | si | ok) que tengo que hacer #h:h_what",
    "con gusto", "te ayudo", "si te ayudo", "que tengo que hacer", "que hago",
  ] },
  help_later: { patterns: [
    "(tal vez | quizas | quiza | a lo mejor) (luego | despues | mas tarde) #h:h_later", "(ahorita | ahora) no [puedo]",
    "no gracias", "luego", "mas tarde", "despues",
  ] },
};

/** The finale's learner lines: what else they may say (lower case, no punctuation, accents as written). */
export const PHOTO_WALK_ACCEPT: Record<string, string[]> = {
  pw_a_here: ["claro aquí tienes", "aquí tienes", "claro", "sí claro", "aquí están", "toma", "ten", "mira"],
  pw_a_welcome: ["de nada fue muy divertido", "de nada", "fue muy divertido", "fue divertido", "con gusto", "no hay de qué", "un placer"],
};

/** The twelve things, in the album's order (`say`: the names the speech match takes, after "es / eso es / mira / un /
 *  una / el / la", which it drops). */
export const PHOTO_THINGS = [
  { id: "lighthouse", icon: "🗼", near: 70, say: ["faro"] },
  { id: "mailbox", icon: "📮", near: 9, say: ["buzón", "buzon", "buzón de correos"] },
  { id: "pinata", icon: "🪅", near: 10, say: ["piñata", "pinata", "piñatas"] },
  { id: "kiosco", icon: "🎪", near: 18, say: ["kiosco", "quiosco", "kiosko"] },
  { id: "colectivo", icon: "🚐", near: 15, say: ["colectivo", "combi", "microbús", "microbus"] },
  { id: "hammock", icon: "🏝️", near: 10, say: ["hamaca"] },
  { id: "palapa", icon: "🛖", near: 14, say: ["palapa", "palapas"] },
  { id: "elotes", icon: "🌽", near: 10, say: ["carrito de elotes", "elotes", "elote", "carrito", "carrito de esquites"] },
  { id: "lancha", icon: "🚤", near: 25, say: ["lancha", "bote", "barca", "barco"] },
  { id: "palm", icon: "🌴", near: 12, say: ["palmera", "palma", "palmeras"] },
  { id: "papel", icon: "🎏", near: 18, say: ["papel picado", "banderitas", "papel"] },
  { id: "temple", icon: "🛕", near: 40, say: ["templo", "pirámide", "piramide", "templo maya"] },
] as const;

export const PHOTO_WALK_UI = {
  book: "Renatos nuotraukų albumas",
  open: "Atversti albumą",
  shoot: "Fotografuoti",
  whatIsIt: "Kas tai?",
  sayOrPick: "Pasakykite arba pasirinkite",
  wrong: "Ne visai – pabandykite dar kartą",
  got: "Puiku! Nuotrauka albume.",
  found: "Rasta: {n} iš {of}",
  where: "Kur ieškoti?",
  pause: "Pristabdyti",
  paused: "Albumas palauks. Jį rasite telefone.",
  resume: "Tęsti fotografavimą",
  quit: "Baigti",
  quitAsk: "Baigti fotografavimą? Nuotraukos liks albume.",
  quitYes: "Baigti",
  quitNo: "Ne, tęsti",
  close: "Užverti",
  allFound: "Visi 12! Nuneškite albumą Renatai.",
  done: "Albumas baigtas – ačiū!",
  phone: "Renatos albumas",
} as const;
