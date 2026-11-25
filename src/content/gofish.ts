// Go Fish at Dan & Nora's (batch 4, 23 Nov 2026). Learner words by Claude; the mode is in src/game/gofish/.
// Picture cards, not numbers: every ask teaches a word. A round is one deck of ten words, two cards each.
import type { Sentence } from "../convo/compose";

export const GOFISH_CONVERSATION = { situation: "s85-dinner", host: "dan", partner: "nora", location: "dans-house" } as const;

export type GoFishWord = {
  id: string;
  /** the card's label (one thing) */
  en: string;
  /** what the ask uses: "Do you have any apples?" */
  pl: string;
  /** the card's Lithuanian label, nominative singular */
  lt: string;
  /** the Lithuanian of the ask: "Ar turi obuolių?" (genitive plural) */
  ltGen: string;
  /** an emoji for the drawn placeholder card until the pictures arrive */
  icon: string;
};

export const goFishWordSentence = ({ en, lt }: GoFishWord): Sentence => ({ en, nat: lt, say: en, units: [{ en, lt }] });

const w = (id: string, en: string, pl: string, lt: string, ltGen: string, icon: string): GoFishWord => ({ id, en, pl, lt, ltGen, icon });

export const GOFISH_DECKS: { id: "food" | "animals" | "town"; lt: string; en: string; words: GoFishWord[] }[] = [
  { id: "food", lt: "Maistas", en: "Food", words: [
    w("apple", "apple", "apples", "obuolys", "obuolių", "🍎"),
    w("banana", "banana", "bananas", "bananas", "bananų", "🍌"),
    w("carrot", "carrot", "carrots", "morka", "morkų", "🥕"),
    w("tomato", "tomato", "tomatoes", "pomidoras", "pomidorų", "🍅"),
    w("strawberry", "strawberry", "strawberries", "braškė", "braškių", "🍓"),
    w("cookie", "cookie", "cookies", "sausainis", "sausainių", "🍪"),
    w("sandwich", "sandwich", "sandwiches", "sumuštinis", "sumuštinių", "🥪"),
    w("pancake", "pancake", "pancakes", "blynas", "blynų", "🥞"),
    w("hot_dog", "hot dog", "hot dogs", "dešrainis", "dešrainių", "🌭"),
    w("cupcake", "cupcake", "cupcakes", "keksiukas", "keksiukų", "🧁"),
  ] },
  { id: "animals", lt: "Gyvūnai", en: "Animals", words: [
    w("dog", "dog", "dogs", "šuo", "šunų", "🐶"),
    w("cat", "cat", "cats", "katė", "kačių", "🐱"),
    w("duck", "duck", "ducks", "antis", "ančių", "🦆"),
    w("horse", "horse", "horses", "arklys", "arklių", "🐴"),
    w("rabbit", "rabbit", "rabbits", "triušis", "triušių", "🐰"),
    w("squirrel", "squirrel", "squirrels", "voverė", "voverių", "🐿️"),
    w("seagull", "seagull", "seagulls", "kiras", "kirų", "🕊️"),
    w("crab", "crab", "crabs", "krabas", "krabų", "🦀"),
    w("turtle", "turtle", "turtles", "vėžlys", "vėžlių", "🐢"),
    w("owl", "owl", "owls", "pelėda", "pelėdų", "🦉"),
  ] },
  { id: "town", lt: "Miestas", en: "In town", words: [
    w("bus", "bus", "buses", "autobusas", "autobusų", "🚌"),
    w("taxi", "taxi", "taxis", "taksi", "taksi", "🚕"),
    w("bike", "bike", "bikes", "dviratis", "dviračių", "🚲"),
    w("boat", "boat", "boats", "valtis", "valčių", "⛵"),
    w("mailbox", "mailbox", "mailboxes", "pašto dėžutė", "pašto dėžučių", "📫"),
    w("bench", "bench", "benches", "suoliukas", "suoliukų", "🪑"),
    w("umbrella", "umbrella", "umbrellas", "skėtis", "skėčių", "☂️"),
    w("map", "map", "maps", "žemėlapis", "žemėlapių", "🗺️"),
    w("ticket", "ticket", "tickets", "bilietas", "bilietų", "🎟️"),
    w("key", "key", "keys", "raktas", "raktų", "🔑"),
  ] },
];

export const GOFISH_WORDS: Record<string, GoFishWord> = Object.fromEntries(
  GOFISH_DECKS.flatMap((deck) => deck.words).map((word) => [word.id, word]));

/** Lithuanian names in the cases the screen needs. */
export const GOFISH_NAMES = {
  dan: { nom: "Danas", gen: "Dano", dat: "Danui" },
  nora: { nom: "Nora", gen: "Noros", dat: "Norai" },
} as const;

// The screen's Lithuanian (the learner's language). Tu: these are friends at home.
export const GOFISH_UI = {
  start: "Pažaisti „Go Fish“",
  title: "Partija baigta",
  yourPairs: "Tavo poros",
  pairsOf: (gen: string) => `${gen} poros`,
  rightReplies: "Teisingi atsakymai",
  of: "iš",
  youWin: "Laimėjai!",
  winner: (nom: string) => `Laimėjo ${nom}`,
  tie: "Lygiosios!",
  hand: "Tavo kortos",
  pond: "Krūvelė",
  pondLeft: (n: number) => `Krūvelėje: ${n}`,
  pondEmpty: "Krūvelė tuščia",
  yourTurn: "Tavo eilė",
  turnOf: (gen: string) => `${gen} eilė`,
  askWhom: "Ko paklausti?",
  pickCard: "Pasirink savo kortą ir paklausk",
  reply: "Atsakyk",
  fish: "Trauk kortą iš krūvelės",
  outOfCards: "Kortų nebeliko – trauk iš krūvelės",
  nextDeck: (lt: string) => `Kita partija – ${lt.toLowerCase()}`,
  deck: "Kortos",
  again: "Dar kartą",
  done: "Baigti",
  exit: "Baigti žaidimą",
  cards: "Frazių kortelės",
  // coach tips, one at a time, fading as in the barista
  tipAsk: "Pasirink savo kortą ir paklausk: „Do you have any…?“",
  tipWhom: "Paklausti gali Daną arba Norą – bakstelėk vardą.",
  tipReply: "Jei tokią kortą turi – „Yes, here you go.“ Jei neturi – „Nope. Go fish!“",
  tipFish: "Niekas neturi? Trauk kortą iš krūvelės.",
  tipPair: "Dvi vienodos kortos – pora! Pasakyk: „I got a pair!“",
  tipListen: (nom: string, gen: string) => `Klausyk – ${nom} klausia ${gen}.`,
  tipAsked: (nom: string) => `${nom} klausia tavęs. Ar turi tokią kortą?`,
};
