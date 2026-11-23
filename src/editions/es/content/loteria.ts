// Lotería night in the zócalo (batch 4, 23 Nov 2026). Learner words by Claude; the mode is in src/game/loteria/.
// 54 cards, numbered as the traditional deck. Two cards are our own: 26 El colibrí (for El negrito) and 38 El elote
// (for El apache). The art is ours too (generated later from the media list; never Don Clemente's).
// Each card's called name is the line `lt_c_<id>`; a card with a traditional verse (or our own, for 26 and 38) also has
// `lt_v_<id>`, which Don Beto says before the name.
export const LOTERIA_SITUATION = "x10-loteria";
export const LOTERIA_CALLER = "beto";
export const LOTERIA_NEIGHBOR = "tona";

export type LoteriaCard = { id: string; n: number; icon: string; verse: boolean };

const c = (n: number, id: string, icon: string, verse = false): LoteriaCard => ({ id, n, icon, verse });

export const LOTERIA_DECK: LoteriaCard[] = [
  c(1, "gallo", "🐓", true), c(2, "diablito", "😈", true), c(3, "dama", "👒"), c(4, "catrin", "🎩"),
  c(5, "paraguas", "☂️", true), c(6, "sirena", "🧜‍♀️", true), c(7, "escalera", "🪜", true), c(8, "botella", "🍾"),
  c(9, "barril", "🛢️"), c(10, "arbol", "🌳"), c(11, "melon", "🍈"), c(12, "valiente", "💪"),
  c(13, "gorrito", "🧢", true), c(14, "muerte", "☠️", true), c(15, "pera", "🍐", true), c(16, "bandera", "🇲🇽", true),
  c(17, "bandolon", "🪕", true), c(18, "violoncello", "🎻"), c(19, "garza", "🦢"), c(20, "pajaro", "🐦"),
  c(21, "mano", "✋"), c(22, "bota", "👢", true), c(23, "luna", "🌙", true), c(24, "cotorro", "🦜", true),
  c(25, "borracho", "🥴"), c(26, "colibri", "🌺", true), c(27, "corazon", "❤️", true), c(28, "sandia", "🍉"),
  c(29, "tambor", "🥁"), c(30, "camaron", "🦐", true), c(31, "jaras", "🏹"), c(32, "musico", "🎺"),
  c(33, "arana", "🕷️"), c(34, "soldado", "💂", true), c(35, "estrella", "⭐", true), c(36, "cazo", "🍲"),
  c(37, "mundo", "🌎"), c(38, "elote", "🌽", true), c(39, "nopal", "🌵"), c(40, "alacran", "🦂"),
  c(41, "rosa", "🌹", true), c(42, "calavera", "💀", true), c(43, "campana", "🔔"), c(44, "cantarito", "🏺"),
  c(45, "venado", "🦌", true), c(46, "sol", "☀️", true), c(47, "corona", "👑", true), c(48, "chalupa", "🛶", true),
  c(49, "pino", "🌲", true), c(50, "pescado", "🐟"), c(51, "palma", "🌴", true), c(52, "maceta", "🪴"),
  c(53, "arpa", "🎼"), c(54, "rana", "🐸", true),
];

export const LOTERIA_CARDS: Record<string, LoteriaCard> = Object.fromEntries(LOTERIA_DECK.map((card) => [card.id, card]));

/** The three kinds of round, in order; "Again" goes on to the next. */
export const LOTERIA_ROUNDS = ["linea", "esquinas", "llena"] as const;
export type LoteriaRound = (typeof LOTERIA_ROUNDS)[number];

// The screen's words, written in Lithuanian (the originals, as everywhere in src/ui); the English for the en layer is
// LOTERIA_UI_EN below, to go into src/editions/es/ui/strings.ts. Tu, as in the other kit games.
export const LOTERIA_UI = {
  start: "Sužaisti loteriją",
  title: "Loterija baigta",
  round: { linea: "Linija", esquinas: "Keturi kampai", llena: "Visa lentelė" },
  roundHelp: {
    linea: "Uždenk keturias kortas vienoje linijoje – eilutėje, stulpelyje ar įstrižai.",
    esquinas: "Uždenk visus keturis kampus.",
    llena: "Uždenk visą lentelę.",
  },
  board: "Tavo lentelė",
  called: "Jau ištrauktos",
  calledCount: "Ištraukta kortų: {n}",
  shout: "Šauk „¡Lotería!“",
  readOut: "Perskaityk savo kortas",
  marked: "Uždengta",
  won: "Laimėjai!",
  wonBy: "Laimėjo {nom}",
  calls: "Ištrauktos kortos",
  heard: "Atpažinta iš klausos",
  again: "Dar kartą",
  next: "Kitas žaidimas – {round}",
  done: "Baigti",
  exit: "Baigti žaidimą",
  cards: "Frazių kortelės",
  listenFirst: "Klausyk – korta tuoj apsivers",
  tipMark: "Išgirdai kortą, kurią turi? Bakstelėk ją – uždėsi pupelę.",
  tipLate: "Praleidai? Ištrauktas kortas galima uždengti ir vėliau.",
  tipShout: "Surinkai! Šauk „¡Lotería!“",
  tipRead: "Don Beto tikrina: perskaityk savo kortas.",
  tipNotYet: "Šios kortos dar nebuvo.",
};

/** The English of the strings above (for src/editions/es/ui/strings.ts; including placeholders). */
export const LOTERIA_UI_EN: Record<string, string> = {
  "Sužaisti loteriją": "Play lotería",
  "Loterija baigta": "Lotería's over",
  "Linija": "A line",
  "Keturi kampai": "Four corners",
  "Visa lentelė": "Full board",
  "Uždenk keturias kortas vienoje linijoje – eilutėje, stulpelyje ar įstrižai.": "Cover four cards in a line – a row, a column or a diagonal.",
  "Uždenk visus keturis kampus.": "Cover all four corners.",
  "Uždenk visą lentelę.": "Cover the whole board.",
  "Tavo lentelė": "Your board",
  "Jau ištrauktos": "Already called",
  "Ištraukta kortų: {n}": "Cards called: {n}",
  "Šauk „¡Lotería!“": "Shout “¡Lotería!”",
  "Perskaityk savo kortas": "Read out your cards",
  "Uždengta": "Covered",
  "Laimėjai!": "You won!",
  "Laimėjo {nom}": "{nom} won",
  "Ištrauktos kortos": "Cards called",
  "Atpažinta iš klausos": "Caught by ear",
  "Dar kartą": "Again",
  "Kitas žaidimas – {round}": "Next game – {round}",
  "Baigti": "Done",
  "Baigti žaidimą": "Leave the game",
  "Frazių kortelės": "Phrase cards",
  "Klausyk – korta tuoj apsivers": "Listen – the card turns over in a moment",
  "Išgirdai kortą, kurią turi? Bakstelėk ją – uždėsi pupelę.": "Heard a card you have? Tap it to put a bean on it.",
  "Praleidai? Ištrauktas kortas galima uždengti ir vėliau.": "Missed one? You can still cover a called card later.",
  "Surinkai! Šauk „¡Lotería!“": "You've got it! Shout “¡Lotería!”",
  "Don Beto tikrina: perskaityk savo kortas.": "Don Beto checks: read out your cards.",
  "Šios kortos dar nebuvo.": "That card hasn't been called yet.",
};

/** The neighbour's name in Lithuanian cases (house rule 4: Doña capitalized, the name declines). */
export const TONA_LT = { nom: "Doña Toña", gen: "Doña Toños", dat: "Doña Toñai" };
