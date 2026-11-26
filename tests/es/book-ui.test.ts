import { spanishBookUiTests } from "../support/spanish-book-ui";

spanishBookUiTests("en", new URL("./fixtures/books/", import.meta.url), {
  library: "Biblioteca de Puerto Colibrí", start: "Start listening", resume: "Continue listening", replay: "Listen again",
  introduction: "Introduction", chapters: ["1 chapter", "8 chapters", "10 chapters", "11 chapters", "21 chapters"],
  titleHelper: "The Giant Turtle", firstGloss: "Once upon a time (lit. there was one time)", nextLine: "Go to line 1",
  paired: "English, then Spanish", targetSpeed: "Spanish speed", helperSpeed: "English speed", off: "Off",
  play: "Play", meanings: "Word meanings", settings: "Listening settings", retry: "Try again", translate: "Show translation",
  stoppedHere: "You stopped here", listeningOptions: "Show listening options", browse: "Browse books", reader: "Open reader",
  rates: ["0.75×", "0.9×", "1.75×"], minutes: "min", route: "/books", bilingualStation: true,
});
