// Go Fish lines (batch 4, 23 Nov 2026). Learner words by Claude. Spread into s85-dinner's lines, as the barista's
// lines are spread into s72-cafe. Every line can be said by Dan, by Nora, or be the learner's example answer.
import type { MergeRecord } from "./merges";
import { t } from "./dsl";
import { GOFISH_DECKS, type GoFishWord } from "./gofish";
import type { SentSrc } from "./types";

const F_DO = "Question “Do” = the particle ar.";
export const F_GOFISH_PLURAL = "After “any”, the noun is plural: apple → apples.";
const F_NOPE = "“Nope”: a casual no.";
const F_GO_FISH = "“Go fish!”: the game's phrase – draw a card from the pond.";
const F_WANT = "Casual English drops “Do you”: (Do you) want…?";
const F_GAME = "Go Fish: a card game – you ask the others for the cards you need and collect pairs.";
const F_LETS_FIND = "“Let's”: no separate word; the ending -kime of ieškokime carries it.";
const F_GO_TURN = "“go”: here, take your turn.";
const F_WIN_YOU = "“You win”: English uses the present; Lithuanian says laimėjai (past).";
const F_WIN_ME = "“I win”: English uses the present; Lithuanian says laimėjau (past).";
const F_GOT = "“got”: the past of get; I got a pair = gavau porą.";

/** The Lithuanian of the notes above, for src/content/notes-lt.ts (NOTES_LT). */
export const GOFISH_NOTES_LT: Record<string, string> = {
  [F_GOFISH_PLURAL]: "Po „any“ daiktavardis eina daugiskaita: apple → apples.",
  [F_NOPE]: "„Nope“ – šnekamasis „ne“.",
  [F_GO_FISH]: "„Go fish!“ – žaidimo frazė: trauk kortą iš krūvelės.",
  [F_WANT]: "Šnekamojoje kalboje „Do you“ praleidžiama: (Do you) want…?",
  [F_GAME]: "„Go Fish“ – kortų žaidimas: klausi kitų, ar jie turi tau reikiamą kortą, ir renki poras.",
  [F_LETS_FIND]: "„Let's“: atskiro žodžio nėra; tai pasako veiksmažodžio ieškokime galūnė -kime.",
  [F_GO_TURN]: "„go“ čia reiškia: žaisti savo eilę.",
  [F_WIN_YOU]: "„You win“: angliškai sakoma esamuoju laiku, lietuviškai – laimėjai.",
  [F_WIN_ME]: "„I win“: angliškai sakoma esamuoju laiku, lietuviškai – laimėjau.",
  [F_GOT]: "„got“ – veiksmažodžio get būtasis laikas: I got a pair = gavau porą.",
};

const LEX = (split: string, minimal = "All words form the expression."): MergeRecord => ({ reason: "lexical_expression", split, minimal, code: "C-LEX" });

export const GOFISH_MERGES: Record<string, MergeRecord> = {
  "hot dogs": LEX("hot → karšti + dogs → šunys is false; a hot dog = dešrainis.", "Two words, one food."),
  "go fish": LEX("The game's name; go → eik + fish → žuvis would translate a name.", "The name of the card game."),
};

const askLine = (word: GoFishWord): SentSrc =>
  t(`Do | you | have | any | ${word.pl}?`, `Ar | tu | turi | kokių nors | ${word.ltGen}?`, `Ar turi ${word.ltGen}?`,
    { flags: { 0: F_DO, 4: F_GOFISH_PLURAL } });

const ALL_WORDS = GOFISH_DECKS.flatMap((deck) => deck.words);

/** gf_ask_<word id>: the ask, said by anyone. */
export const GOFISH_ASK_LINES: Record<string, SentSrc[]> = Object.fromEntries(
  ALL_WORDS.map((word) => [`gf_ask_${word.id}`, [askLine(word)]]));

export const GOFISH_LINES: Record<string, SentSrc[]> = {
  ...GOFISH_ASK_LINES,
  // the offer at the table (Dan) and the start (Nora)
  gf_offer: [t("Hey, | want | to play | Go Fish?", "Ei, | nori | pažaisti | „Go Fish“?", "Ei, nori pažaisti „Go Fish“?", { flags: { 1: F_WANT, 3: F_GAME } })],
  gf_intro: [t("Great! | Let's | find | pairs!", "Puiku! | — | Ieškokime | porų!", "Puiku! Ieškokime porų!", { flags: { 1: F_LETS_FIND } })],
  gf_shuffle: [t("I'll shuffle!", "Sumaišysiu!", "Sumaišysiu kortas!")],
  gf_first: [t("You | go | first!", "Tu | eini | {m:pirmas|f:pirma}!", "Tu pradedi!", { flags: { 1: F_GO_TURN } })],
  // the game's four phrases
  gf_yes: [t("Yes, | here you go.", "Taip, | še.", "Taip, še.")],
  gf_nope: [t("Nope. | Go | fish!", "Ne. | Eik | žvejoti!", "Ne. Trauk kortą!", { flags: { 0: F_NOPE, 2: F_GO_FISH } })],
  gf_pair: [t("I | got | a | pair!", "Aš | gavau | — | porą!", "Turiu porą!", { flags: { 1: F_GOT } })],
  gf_thanks: [t("Thanks!", "Ačiū!", "Ačiū!")],
  // turns and small talk (Dan and Nora)
  gf_your_turn: [t("Your | turn!", "Tavo | eilė!", "Tavo eilė!")],
  gf_my_turn: [t("My | turn!", "Mano | eilė!", "Mano eilė!")],
  gf_again: [t("You | go | again!", "Tu | eini | vėl!", "Vėl tavo eilė!", { flags: { 1: F_GO_TURN } })],
  gf_lucky: [t("Lucky | me!", "Pasisekė | man!", "Man pasisekė!")],
  gf_hmm: [t("Hmm… | let | me | see.", "Hmm… | leisk | man | pažiūrėti.", "Hmm… Tuoj pažiūrėsiu.")],
  gf_sure: [t("Are | you | sure? | Look | again!", "Ar | tu | {m:tikras|f:tikra}? | Pažiūrėk | dar kartą!", "Tikrai? Pažiūrėk dar kartą!")],
  // the end
  gf_win_you: [t("You | win! | Good | game!", "Tu | laimėjai! | Geras | žaidimas!", "Laimėjai! Geras žaidimas!", { flags: { 1: F_WIN_YOU } })],
  gf_win_me: [t("I | win! | Good | game!", "Aš | laimėjau! | Geras | žaidimas!", "Laimėjau! Geras žaidimas!", { flags: { 1: F_WIN_ME } })],
  gf_tie: [t("It's | a | tie! | Good | game!", "Tai | — | lygiosios! | Geras | žaidimas!", "Lygiosios! Geras žaidimas!")],
  gf_bye: [t("Thanks | for playing!", "Ačiū, | kad pažaidei!", "Ačiū, kad pažaidei!")],
};

const plain = (s: string) => s.toLowerCase();

function askAccept(word: GoFishWord) {
  const pl = plain(word.pl);
  const one = plain(word.en);
  const a = /^[aeiou]/.test(one) ? "an" : "a";
  return [
    `do you have any ${pl}`, `have you got any ${pl}`, `got any ${pl}`, `any ${pl}`, `do you have ${pl}`,
    `do you have ${a} ${one}`, `have you got ${a} ${one}`, `do you have any ${pl} please`, `${pl} please`,
  ];
}

/** What the learner may say. A name in front ("Nora, do you have any apples?") picks whom to ask. */
export const GOFISH_ACCEPT: Record<string, string[]> = {
  ...Object.fromEntries(ALL_WORDS.map((word) => [`gf_ask_${word.id}`, askAccept(word)])),
  gf_yes: ["yes here you go", "here you go", "yes i do here you go", "yes i do", "yep here you go", "yeah here you go",
    "sure here you go", "here you are", "yes here you are", "yes", "yep", "yeah"],
  gf_nope: ["nope go fish", "no go fish", "go fish", "nope", "no i don't go fish", "no i don't", "sorry go fish",
    "no sorry go fish", "no"],
  gf_pair: ["i got a pair", "i have a pair", "i've got a pair", "got a pair", "a pair", "pair"],
};

export const GOFISH_SPEAKER_NAMES = ["dan", "nora"] as const;
