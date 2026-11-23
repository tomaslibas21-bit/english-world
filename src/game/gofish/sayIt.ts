import { GOFISH_WORDS, type GoFishWord } from "../../content/gofish";
import { sayItWords } from "../kit/sayIt";

export function sayItCard(word: GoFishWord) {
  const others = Object.values(GOFISH_WORDS).filter(({ id }) => id !== word.id).flatMap(({ en, pl }) => [en, pl]);
  return sayItWords([word.en, word.pl], others);
}
