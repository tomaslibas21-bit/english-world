import { spanishLibraryBookTests } from "../support/spanish-library-book";

spanishLibraryBookTests("lt", new URL("./fixtures/books/", import.meta.url));
