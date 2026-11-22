import { t } from "@/content/dsl";
import type { MergeRecord } from "@/content/merges";
import type { SentSrc } from "@/content/types";

export { isBaristaCoachLine } from "../../../content/barista-lines";

const F_PESOS = "Mexican prices are in pesos; the sign is $ too.";
const LEX = (split: string): MergeRecord => ({ reason: "lexical_expression", split, minimal: "All words form the expression.", code: "S-LEX" });

export const BARISTA_MERGES: Record<string, MergeRecord> = {
  "de la": LEX("de → of + la → the; the English gloss keeps them in the same unit."),
  "los clientes": LEX("los → the + clientes → customers; together they name the customers."),
  "con atención": LEX("con → with + atención → attention; English uses the adverb carefully."),
  "al principio": LEX("al → at the + principio → beginning; English uses at first."),
  "le ayudo": LEX("le → you + ayudo → I help; English puts the object after the verb."),
  "qué buen": LEX("qué → what + buen → good; English needs the article in what a good."),
  "por la ayuda": LEX("por → for + la → the + ayuda → help; the phrase names what Mariana is thanking you for."),
  "setenta y cinco": LEX("One number: 75."),
  "noventa y cinco": LEX("One number: 95."),
  "sesenta y cinco": LEX("One number: 65."),
  "que tenga": LEX("que → that + tenga → you-have; = may you have, a wish."),
};

export const BARISTA_LINES: Record<string, SentSrc[]> = {
  bs_offer: [t("¿Quiere | probar | de | este | lado | de la | barra?", "Want | to-try | from | this | side | of the | counter?", "Want to try my side of the counter?")],
  bs_intro: [t("¡Qué bien! | Los clientes | piden | y | usted | prepara. | Escuche | con atención; | al principio | le ayudo.", "Great! | The customers | order | and | you | make-it. | Listen | carefully; | at first | I-help-you.", "Great! Customers order, and you make it. Listen carefully; I'll help at first.")],
  bs_done: [t("¡Qué buen | turno! | Gracias | por la ayuda.", "What a good | shift! | Thanks | for the help.", "Great shift! Thanks for the help.")],
  bs_c_sorry: [t("Ay, | perdón, | eso | no es | lo que | pedí.", "Oh, | sorry, | that | isn't | what | I-ordered.", "Oh, sorry, that's not what I ordered.")],
  bs_a_hi: [t("¡Buenas! | ¿Qué | le | preparo?", "Hi! | What | for-you | I-make?", "Hi! What can I get you?",
    { spain: t("¡Buenas! | ¿Qué | le | pongo?", "Hi! | What | for-you | I-put?", "Hi! What can I get you?") })],
  bs_a_price_1: [t("Son | cincuenta | pesos.", "They-are | fifty | pesos.", "That's 50 pesos.", { flags: { 2: F_PESOS } })],
  bs_a_price_2: [t("Son | sesenta | pesos.", "They-are | sixty | pesos.", "That's 60 pesos.", { flags: { 2: F_PESOS } })],
  bs_a_price_3: [t("Son | setenta y cinco | pesos.", "They-are | seventy-five | pesos.", "That's 75 pesos.", { flags: { 2: F_PESOS } })],
  bs_a_price_4: [t("Son | cuarenta | pesos.", "They-are | forty | pesos.", "That's 40 pesos.", { flags: { 2: F_PESOS } })],
  bs_a_price_5: [t("Son | noventa y cinco | pesos.", "They-are | ninety-five | pesos.", "That's 95 pesos.", { flags: { 2: F_PESOS } })],
  bs_a_price_6: [t("Son | sesenta y cinco | pesos.", "They-are | sixty-five | pesos.", "That's 65 pesos.", { flags: { 2: F_PESOS } })],
  bs_a_welcome: [t("¡De nada! | Que tenga | buen día.", "You're welcome! | May-you-have | good day.", "You're welcome! Have a nice day.")],
};

const price = (words: string, digits: number) => [
  `son ${words} pesos`, `${words} pesos`, `son ${words}`, words, `${digits} pesos`, String(digits), `$${digits}`,
];

export const BARISTA_ACCEPT: Record<string, string[]> = {
  bs_a_hi: ["buenas que le preparo", "que le preparo", "hola que le preparo", "buenas que le pongo", "que le pongo", "que le sirvo", "buenas que le sirvo", "hola que va a querer", "que va a querer", "que le doy"],
  bs_a_price_1: price("cincuenta", 50),
  bs_a_price_2: price("sesenta", 60),
  bs_a_price_3: price("setenta y cinco", 75),
  bs_a_price_4: price("cuarenta", 40),
  bs_a_price_5: price("noventa y cinco", 95),
  bs_a_price_6: price("sesenta y cinco", 65),
  bs_a_welcome: ["de nada que tenga buen dia", "de nada", "que tenga buen dia", "de nada que tenga un buen dia", "con gusto que tenga buen dia", "con gusto", "a la orden"],
};
