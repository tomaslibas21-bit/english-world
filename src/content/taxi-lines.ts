// The ride-along taxi's spoken lines (G1, 22 Nov 2026). Vinnie, the town's taxi driver, sits in the back of his own
// cab today and tells the learner the way; the learner drives. One key `tx_<id>` per line (the engine in
// src/game/taxi/ looks them up by id); `tx_a_…` and `tx_rN_a_…` are the learner's own lines, said by them (the
// microphone) or for them (a tap). Routes and their landmarks: src/game/taxi/routes.ts. The situation s66-taxi spreads
// TAXI_LINES into its lines and TAXI_MERGES into its merges (s66 already registers “where to”, “here we are” and
// “in front of”).

import type { MergeRecord } from "./merges";
import type { SentSrc } from "./types";
import { t } from "./dsl";

const LEX = (split: string, minimal = "Two words."): MergeRecord => ({ reason: "lexical_expression", split, minimal });
const NAME = (split: string, minimal = "One name."): MergeRecord => ({ reason: "lexical_expression", split, minimal });

const F_DO = "“do”: no separate word; a Lithuanian question needs no helper verb.";
const F_LETS = "“Let's”: no separate word; the ending -kime of pabandykime carries it.";
const F_ORD = "“the second right” = the second street on the right; English leaves out “street”.";
const F_FARE = "Prices are said as two numbers, dollars then cents: twenty-four fifty = $24.50.";
const F_ITS = "“It's”: in Lithuanian the verb is often left out (Jis – šalia pašto).";

export const TAXI_MERGES: Record<string, MergeRecord> = {
  "hey there": LEX("hey → ei + there → ten would add a false place; one greeting = sveiki.", "Two words, one greeting."),
  "next to": LEX("next → kitas + to → į is false; = šalia."),
  "across from": LEX("across → skersai + from → nuo is false; = kitoje gatvės pusėje nuo (priešais)."),
  "on the right": { reason: "grammatical_fusion", split: "The locative dešinėje carries “on the”.", minimal: "No adjective inside." },
  "back up": LEX("back → atgal + up → aukštyn is false; to drive backwards = pavažiuoti atgal.", "Verb + particle."),
  "a little": LEX("a → — + little → mažas gives “small”; the degree adverb = truputį."),
  "keep going": LEX("keep → laikyti + going → einant is false; keep + -ing = go on: važiuokite toliau."),
  "have a nice day": LEX("have → turėti + a nice day → gražią dieną is a word-for-word wish; the farewell = geros dienos.", "The whole wish."),
  "see you around": LEX("see → matyti, you → tave, around → aplink is a literal reading of a farewell (= iki pasimatymo).", "Three words."),
  "keep the change": LEX("keep → pasilikti + the change → grąžą; the whole phrase = grąžos nereikia.", "The whole phrase."),
  "we made it": LEX("we → mes + made → padarėme + it → tai is false; on arriving = pavyko, atvažiavome.", "The whole phrase."),
  "nice job": LEX("nice → gražus + job → darbas; the praise = šaunu, puikiai."),
  "main street": NAME("A street name; main → pagrindinė + street → gatvė would translate the name.", "Two-word name."),
  "center street": NAME("A street name; center → centras + street → gatvė would translate the name.", "Two-word name."),
  "west street": NAME("A street name; west → vakarai + street → gatvė would translate the name.", "Two-word name."),
  "east street": NAME("A street name; east → rytai + street → gatvė would translate the name.", "Two-word name."),
  "harbor road": NAME("A street name; harbor → uostas + road → kelias would translate the name.", "Two-word name."),
  "station road": NAME("A street name; station → stotis + road → kelias would translate the name.", "Two-word name."),
  "maple street apartments": NAME("The building's name: Maple Street Apartments, a block of flats on Maple Street.", "Three-word name."),
  "on your right": { reason: "grammatical_fusion", split: "The locative dešinėje carries “on your”.", minimal: "No adjective inside." },
  "union station": NAME("The station's name: Union Station.", "Two-word name."),
  "harbor market": NAME("The shop's name: Harbor Market, a supermarket.", "Two-word name."),
  "harbor car rental": NAME("The company's name: Harbor Car Rental, a car rental.", "Three-word name."),
  "harbor bank": NAME("The bank's name: Harbor Bank.", "Two-word name."),
  "sunny cup": NAME("The café's name: Sunny Cup.", "Two-word name."),
  "sunny cup café": NAME("The café's name: Sunny Cup Café.", "Three-word name."),
  "lucia's trattoria": NAME("The restaurant's name: Lucia's Trattoria, a small Italian restaurant.", "Two-word name."),
  "police station": LEX("police → policija + station → stotis; = policijos nuovada.", "Two words, one place."),
  "post office": LEX("post → paštas + office → biuras; = paštas.", "Two words, one place."),
  "twenty-four fifty": LEX("A price said as two numbers: $24.50.", "One price."),
  "twenty fifty": LEX("A price said as two numbers: $20.50.", "One price."),
  "twenty-one dollars": LEX("twenty-one → dvidešimt vienas + dollars → doleris: one price, $21.00.", "One price."),
};

export const TAXI_LINES: Record<string, SentSrc[]> = {
  // ---- shared
  tx_hello: [t("Hey there! | Today | you | drive, | and | I'm | the | passenger.", "Sveiki! | Šiandien | Jūs | vairuojate, | o | aš | — | keleivis.", "Sveiki! Šiandien vairuojate Jūs, o aš – keleivis.")],
  tx_a_where: [t("Where to?", "Kur važiuojame?", "Kur važiuojame?")],
  tx_wrong: [t("Oops, | wrong | way! | Let's | try | that | again.", "Oi, | ne | ten! | — | Pabandykime | tai | dar kartą.", "Oi, ne ten! Pabandykime dar kartą.", { flags: { 3: F_LETS } })],
  tx_passed: [t("Whoa, | we | passed | it! | Back up | a little.", "Oho, | — | pravažiavome | jį! | Pavažiuokite atgal | truputį.", "Oho, pravažiavome! Truputį pavažiuokite atgal.")],
  tx_a_here: [t("Here we are.", "Štai ir atvažiavome.", "Štai ir atvažiavome.")],
  tx_owe: [t("Thanks! | What | do | I | owe | you?", "Ačiū! | Kiek | — | aš | skolingas | Jums?", "Ačiū! Kiek Jums skolingas?", { flags: { 2: F_DO } })],
  tx_a_bye: [t("Thanks! | Have a nice day!", "Ačiū! | Geros dienos!", "Ačiū! Geros dienos!")],
  tx_bye: [t("That | was | fun! | See you around!", "Buvo | — | smagu! | Iki pasimatymo!", "Buvo smagu! Iki pasimatymo!")],

  // ---- route 1: Harborview Hotel, $24.50
  tx_r1_dest: [t("The | Harborview | Hotel, | please. | I'll | tell | you | the | way.", "Į | „Harborview“ | viešbutį, | prašau. | Aš | pasakysiu | Jums | — | kelią.", "Į „Harborview“ viešbutį, prašau. Aš Jums pasakysiu kelią.")],
  tx_r1_c1: [t("Turn | left | at | Harbor Bank, | onto | Center Street.", "Sukite | kairėn | prie | banko, | į | Center Street gatvę.", "Sukite kairėn prie banko, į Center Street gatvę.")],
  tx_r1_c2: [t("Take | the | second | street | on the right. | That's | Station Road.", "Sukite | į | antrą | gatvę | dešinėje. | Tai | Station Road gatvė.", "Sukite į antrą gatvę dešinėje. Tai Station Road gatvė.")],
  tx_r1_c3: [t("Now | turn | right | onto | West Street.", "Dabar | sukite | dešinėn | į | West Street gatvę.", "Dabar sukite dešinėn į West Street gatvę.")],
  tx_r1_c4: [t("Go | straight, | past | Maple Street Apartments.", "Važiuokite | tiesiai, | pro | Maple Street daugiabutį.", "Važiuokite tiesiai, pro daugiabutį Maple Street gatvėje.")],
  tx_r1_c5: [t("Turn | left | at | the | hotel, | onto | Main Street.", "Sukite | kairėn | prie | — | viešbučio, | į | Main Street gatvę.", "Sukite kairėn prie viešbučio, į Main Street gatvę.")],
  tx_r1_c6: [t("Stop | here, | in front of | the | hotel. | It's | across from | the | pharmacy.", "Sustokite | čia, | priešais | — | viešbutį. | Jis | kitoje gatvės pusėje nuo | — | vaistinės.", "Sustokite čia, priešais viešbutį. Jis kitoje gatvės pusėje nuo vaistinės.", { flags: { 5: F_ITS } })],
  tx_r1_a_fare: [t("That's | twenty-four fifty.", "Tai | dvidešimt keturi penkiasdešimt.", "Iš viso 24 doleriai 50 centų.", { flags: { 1: F_FARE } })],
  tx_r1_tip_great: [t("Perfect | driving! | Here's | thirty. | Keep the change!", "Puikus | vairavimas! | Štai | trisdešimt. | Grąžos nereikia!", "Puikiai vairavote! Štai trisdešimt. Grąžos nereikia!")],
  tx_r1_tip_good: [t("Nice job! | Here's | twenty-eight. | Keep the change.", "Šaunu! | Štai | dvidešimt aštuoni. | Grąžos nereikia.", "Šaunu! Štai dvidešimt aštuoni. Grąžos nereikia.")],
  tx_r1_tip_ok: [t("We made it! | Here's | twenty-six. | Keep the change.", "Pavyko! | Štai | dvidešimt šeši. | Grąžos nereikia.", "Pavyko! Štai dvidešimt šeši. Grąžos nereikia.")],

  // ---- route 2: Sunny Cup Café, $21.00
  tx_r2_dest: [t("Sunny Cup Café, | please. | I'll | tell | you | the | way.", "Į kavinę „Sunny Cup“, | prašau. | Aš | pasakysiu | Jums | — | kelią.", "Į kavinę „Sunny Cup“, prašau. Aš Jums pasakysiu kelią.")],
  tx_r2_c1: [t("Turn | left | just | past | Harbor Car Rental, | onto | East Street.", "Sukite | kairėn | iškart | už | automobilių nuomos, | į | East Street gatvę.", "Sukite kairėn iškart už automobilių nuomos, į East Street gatvę.")],
  tx_r2_c2: [t("Keep going | straight. | Union Station | is | on your right.", "Važiuokite toliau | tiesiai. | „Union“ stotis | yra | dešinėje.", "Važiuokite toliau tiesiai. „Union“ stotis – dešinėje.")],
  tx_r2_c3: [t("Turn | right | onto | Station Road.", "Sukite | dešinėn | į | Station Road gatvę.", "Sukite dešinėn į Station Road gatvę.")],
  tx_r2_c4: [t("Turn | right | again, | onto | West Street.", "Sukite | dešinėn | vėl, | į | West Street gatvę.", "Vėl sukite dešinėn, į West Street gatvę.")],
  tx_r2_c5: [t("Take | the | second | right. | That's | Main Street.", "Sukite | į | antrą | dešinėn. | Tai | Main Street gatvė.", "Sukite į antrą gatvę dešinėn. Tai Main Street gatvė.", { flags: { 3: F_ORD } })],
  tx_r2_c6: [t("Stop | here, | in front of | the | café, | next to | Lucia's Trattoria.", "Sustokite | čia, | priešais | — | kavinę, | šalia | restorano „Lucia's“.", "Sustokite čia, priešais kavinę, šalia restorano „Lucia's“.")],
  tx_r2_a_fare: [t("That's | twenty-one dollars.", "Tai | dvidešimt vienas doleris.", "Iš viso 21 doleris.")],
  tx_r2_tip_great: [t("Perfect | driving! | Here's | twenty-six. | Keep the change!", "Puikus | vairavimas! | Štai | dvidešimt šeši. | Grąžos nereikia!", "Puikiai vairavote! Štai dvidešimt šeši. Grąžos nereikia!")],
  tx_r2_tip_good: [t("Nice job! | Here's | twenty-four. | Keep the change.", "Šaunu! | Štai | dvidešimt keturi. | Grąžos nereikia.", "Šaunu! Štai dvidešimt keturi. Grąžos nereikia.")],
  tx_r2_tip_ok: [t("We made it! | Here's | twenty-two. | Keep the change.", "Pavyko! | Štai | dvidešimt du. | Grąžos nereikia.", "Pavyko! Štai dvidešimt du. Grąžos nereikia.")],

  // ---- route 3: Harbor Bank, $20.50
  tx_r3_dest: [t("Harbor Bank, | please. | I'll | tell | you | the | way.", "Į banką „Harbor Bank“, | prašau. | Aš | pasakysiu | Jums | — | kelią.", "Į banką „Harbor Bank“, prašau. Aš Jums pasakysiu kelią.")],
  tx_r3_c1: [t("Turn | right | at | the | police station, | onto | East Street.", "Sukite | dešinėn | prie | — | policijos nuovados, | į | East Street gatvę.", "Sukite dešinėn prie policijos nuovados, į East Street gatvę.")],
  tx_r3_c2: [t("Go | past | the | park | and | turn | left | onto | Harbor Road.", "Važiuokite | pro | — | parką | ir | sukite | kairėn | į | Harbor Road kelią.", "Važiuokite pro parką ir sukite kairėn į Harbor Road kelią.")],
  tx_r3_c3: [t("Turn | left | at | Harbor Market, | onto | West Street.", "Sukite | kairėn | prie | prekybos centro, | į | West Street gatvę.", "Sukite kairėn prie prekybos centro „Harbor Market“, į West Street gatvę.")],
  tx_r3_c4: [t("Turn | left | at | Sunny Cup, | onto | Main Street.", "Sukite | kairėn | prie | kavinės „Sunny Cup“, | į | Main Street gatvę.", "Sukite kairėn prie kavinės „Sunny Cup“, į Main Street gatvę.")],
  tx_r3_c5: [t("Keep going | straight, | past | the | museum.", "Važiuokite toliau | tiesiai, | pro | — | muziejų.", "Važiuokite toliau tiesiai, pro muziejų.")],
  tx_r3_c6: [t("Stop | here, | in front of | the | bank. | It's | next to | the | post office.", "Sustokite | čia, | priešais | — | banką. | Jis | šalia | — | pašto.", "Sustokite čia, priešais banką. Jis šalia pašto.", { flags: { 5: F_ITS } })],
  tx_r3_a_fare: [t("That's | twenty fifty.", "Tai | dvidešimt penkiasdešimt.", "Iš viso 20 dolerių 50 centų.", { flags: { 1: "Prices are said as two numbers, dollars then cents: twenty fifty = $20.50." } })],
  tx_r3_tip_great: [t("Perfect | driving! | Here's | twenty-five. | Keep the change!", "Puikus | vairavimas! | Štai | dvidešimt penki. | Grąžos nereikia!", "Puikiai vairavote! Štai dvidešimt penki. Grąžos nereikia!")],
  tx_r3_tip_good: [t("Nice job! | Here's | twenty-four. | Keep the change.", "Šaunu! | Štai | dvidešimt keturi. | Grąžos nereikia.", "Šaunu! Štai dvidešimt keturi. Grąžos nereikia.")],
  tx_r3_tip_ok: [t("We made it! | Here's | twenty-two. | Keep the change.", "Pavyko! | Štai | dvidešimt du. | Grąžos nereikia.", "Pavyko! Štai dvidešimt du. Grąžos nereikia.")],
};

/** What else the learner may say for each of their own lines (lower case, no punctuation), for the speech match. */
export const TAXI_ACCEPT: Record<string, string[]> = {
  tx_a_where: ["where to", "where are we going", "where are you going", "where are you headed", "where would you like to go", "where do you want to go"],
  tx_a_here: ["here we are", "we are here", "we're here", "here you are", "this is it"],
  tx_a_bye: ["thanks have a nice day", "thank you have a nice day", "have a nice day", "thanks", "thank you", "have a good day", "thanks have a good day", "bye"],
  tx_r1_a_fare: ["that's twenty four fifty", "that is twenty four fifty", "twenty four fifty", "twenty four dollars fifty", "twenty four dollars and fifty cents", "24.50", "$24.50", "that's $24.50"],
  tx_r2_a_fare: ["that's twenty one dollars", "that is twenty one dollars", "twenty one dollars", "twenty one", "that's twenty one", "21", "$21", "that's $21"],
  tx_r3_a_fare: ["that's twenty fifty", "that is twenty fifty", "twenty fifty", "twenty dollars fifty", "twenty dollars and fifty cents", "20.50", "$20.50", "that's $20.50"],
};
