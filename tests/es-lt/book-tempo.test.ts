import "../book-tempo.test";
import { spanishBookOutputTests } from "../support/spanish-book-output";

spanishBookOutputTests("lt", new URL("./fixtures/books/", import.meta.url));
