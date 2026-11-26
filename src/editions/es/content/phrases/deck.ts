import { EDITION } from "../../../../edition";

/** The road and the zócalo share the current course's recordings and translations. */
export async function loadPcPhraseDeck() {
  const deck = EDITION.helper === "lt"
    ? await import("./phrase-game.pc-lt.json")
    : await import("./phrase-game.pc-en.json");
  return deck.default.items;
}
