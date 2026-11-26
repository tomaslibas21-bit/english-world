import { spanishLibraryBookTests } from "../support/spanish-library-book";

spanishLibraryBookTests("en", new URL("./fixtures/books/", import.meta.url));
