import type { MergeRecord } from "./merges";
import { TAXI_MERGES } from "./taxi-lines";
import { t } from "./dsl";
import type { SentSrc } from "./types";

const F_PRICE = "Prices are said as two numbers, dollars then cents: four seventy-five = $4.75.";

const fusion = (split: string, minimal: string): MergeRecord => ({ reason: "grammatical_fusion", split, minimal });
const amount = (value: string): MergeRecord => fusion(`The spoken amount corresponds to ${value}; splitting it loses the price reading.`, "One amount.");

export const BARISTA_MERGES: Record<string, MergeRecord> = {
  "want to try": fusion("English elides the subject of the question; Lithuanian encodes it in norite. The infinitive completes the question.", "The verb and its infinitive."),
  "my side": fusion("Both words form the possessed location; splitting would isolate the possessive from the noun it qualifies.", "Possessive and noun."),
  "make it": fusion("Lithuanian uses a single verb for preparing the order, with the object understood.", "Verb and object."),
  "that's not": fusion("The negated identification is carried as one unit in Lithuanian.", "Copula and negation."),
  "i ordered": fusion("The Lithuanian verb ending carries the subject I.", "Subject and verb."),
  "can i get": fusion("The Lithuanian request uses galiu with the infinitive; the verb ending carries I.", "Auxiliary, subject and verb."),
  "four seventy-five": amount("$4.75"),
  "five seventy-five": amount("$5.75"),
  "seven twenty-five": amount("$7.25"),
  "three fifty": amount("$3.50"),
  "ten dollars": amount("$10.00"),
  "five fifty": amount("$5.50"),
  "have a nice day": TAXI_MERGES["have a nice day"],
};

export const BARISTA_LINES: Record<string, SentSrc[]> = {
  bs_offer: [t("Want to try | my side | of the counter?", "Norite pabandyti | mano pusę | prekystalio?", "Norite pabandyti pabūti už prekystalio?")],
  bs_intro: [t("Great! | Customers | order, | and | you | make it. | Listen | carefully. | I'll help | at first.", "Puiku! | Klientai | užsisako, | o | Jūs | paruošiate. | Klausykite | atidžiai. | Padėsiu | iš pradžių.", "Puiku! Klientai užsisako, o Jūs paruošiate. Klausykite atidžiai – iš pradžių padėsiu.")],
  bs_done: [t("Great | shift! | Thanks | for your help!", "Puiki | pamaina! | Ačiū | už pagalbą!", "Puiki pamaina! Ačiū už pagalbą!")],
  bs_c_sorry: [t("Oh, | sorry, | that's not | what | I ordered.", "Oi, | atsiprašau, | tai ne | tai, ką | užsisakiau.", "Oi, atsiprašau, užsisakiau ne tai.")],
  bs_a_hi: [t("Hi! | What | can I get | you?", "Sveiki! | Ką | galiu paduoti | Jums?", "Sveiki! Ką Jums paduoti?")],
  bs_a_price_1: [t("That'll be | four seventy-five.", "Tai bus | keturi septyniasdešimt penki.", "Iš viso 4 doleriai 75 centai.", { flags: { 1: F_PRICE } })],
  bs_a_price_2: [t("That'll be | five seventy-five.", "Tai bus | penki septyniasdešimt penki.", "Iš viso 5 doleriai 75 centai.", { flags: { 1: F_PRICE } })],
  bs_a_price_3: [t("That'll be | seven twenty-five.", "Tai bus | septyni dvidešimt penki.", "Iš viso 7 doleriai 25 centai.", { flags: { 1: F_PRICE } })],
  bs_a_price_4: [t("That'll be | three fifty.", "Tai bus | trys penkiasdešimt.", "Iš viso 3 doleriai 50 centų.", { flags: { 1: F_PRICE } })],
  bs_a_price_5: [t("That'll be | ten dollars.", "Tai bus | dešimt dolerių.", "Iš viso 10 dolerių.")],
  bs_a_price_6: [t("That'll be | five fifty.", "Tai bus | penki penkiasdešimt.", "Iš viso 5 doleriai 50 centų.", { flags: { 1: F_PRICE } })],
  bs_a_welcome: [t("You're welcome! | Have a nice day!", "Prašom! | Geros dienos!", "Prašom! Geros dienos!")],
};

export const isBaristaCoachLine = (key: string) => key.startsWith("bs_a_") || key.startsWith("bs_c_");

function price(dollars: string, cents: string, amount: string) {
  const spoken = `${dollars} ${cents}`;
  return [`that'll be ${spoken}`, `that will be ${spoken}`, spoken, `${dollars} dollars ${cents}`, `${spoken} please`, `$${amount}`, amount];
}

export const BARISTA_ACCEPT: Record<string, string[]> = {
  bs_a_hi: ["hi what can i get you", "hello what can i get you", "what can i get you", "hi what can i get for you", "what can i get for you", "hi what would you like", "what would you like"],
  bs_a_price_1: price("four", "seventy five", "4.75"),
  bs_a_price_2: price("five", "seventy five", "5.75"),
  bs_a_price_3: price("seven", "twenty five", "7.25"),
  bs_a_price_4: price("three", "fifty", "3.50"),
  bs_a_price_5: ["that'll be ten dollars", "that will be ten dollars", "ten dollars", "ten", "that'll be ten", "ten dollars please", "$10", "10.00"],
  bs_a_price_6: price("five", "fifty", "5.50"),
  bs_a_welcome: ["you're welcome have a nice day", "you are welcome have a nice day", "you're welcome", "have a nice day", "no problem have a nice day", "my pleasure have a nice day", "enjoy have a nice day"],
};
