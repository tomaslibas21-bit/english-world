import { spanishBookUiTests } from "../support/spanish-book-ui";

spanishBookUiTests("lt", new URL("./fixtures/books/", import.meta.url), {
  library: "Kolibrių uosto biblioteka", start: "Pradėti klausytis", resume: "Klausytis toliau", replay: "Klausytis dar kartą",
  introduction: "Įžanga", chapters: ["1 skyrius", "8 skyriai", "10 skyrių", "11 skyrių", "21 skyrius"],
  titleHelper: "Milžiniškas vėžlys", firstGloss: "Kartą gyveno (pažod. buvo vieną kartą)", nextLine: "Pereiti į 1 eilutę",
  paired: "Lietuviškai, tada ispaniškai", targetSpeed: "Ispanų kalbos greitis", helperSpeed: "Lietuvių kalbos greitis", off: "Išjungta",
  play: "Leisti", meanings: "Žodžių reikšmės", settings: "Klausymo nustatymai", retry: "Bandyti dar kartą", translate: "Rodyti vertimą",
  rates: ["0,75×", "0,9×", "1,75×"], minutes: "min.", route: "/knygos", bilingualStation: false,
});
