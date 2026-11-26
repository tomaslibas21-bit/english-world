import { spanishBookProfile, spanishBookSource } from "../../es/content/bookSource";
import covers from "./book-covers/books.json";

export const SM_BOOK_PROFILE = spanishBookProfile("sm-lt", {
  covers,
  storyCovers: () => import("./book-covers/stories.json").then((data) => data.default),
});

export function bookSource(env: Record<string, unknown> = import.meta.env ?? {}, site = globalThis.location?.origin) {
  return spanishBookSource(SM_BOOK_PROFILE, env, site);
}
