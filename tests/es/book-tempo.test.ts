import "../book-tempo.test";
import { spanishBookOutputTests } from "../support/spanish-book-output";

spanishBookOutputTests("en", new URL("./fixtures/books/", import.meta.url));
