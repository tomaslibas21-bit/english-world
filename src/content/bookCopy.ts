// Maple Harbor's interface is Lithuanian. Keep the English copy beside it for review and ports.
export const bookCopy = {
  library: { en: "Maple Harbor Public Library", lt: "Meipl Harboro viešoji biblioteka" },
  station: { en: "Book FM", lt: "Book FM" },
  sceneStation: { en: "Conversation FM", lt: "Conversation FM" },
  sceneDescription: { en: "Conversations around town", lt: "Miestelio pokalbiai" },
  browseScenes: { en: "Browse scenes", lt: "Rinktis pokalbį" },
  playAny: { en: "Play any", lt: "Leisti atsitiktinį pokalbį" },
  turn: { en: "Turn {n}/{total}", lt: "Replika {n}/{total}" },
  learner: { en: "You", lt: "Tu" },
  previousTurn: { en: "Previous line", lt: "Ankstesnė eilutė" },
  nextTurn: { en: "Next line", lt: "Kita eilutė" },
  sceneRetry: { en: "Try again", lt: "Bandyti dar kartą" },
  closePicker: { en: "Close", lt: "Uždaryti" },
  sceneLoading: { en: "Loading the scene…", lt: "Įkeliamas pokalbis…" },
  description: { en: "Audiobooks and stories", lt: "Garsinės knygos ir istorijos" },
  music: { en: "Music", lt: "Muzika" },
  talk: { en: "Talk", lt: "Laidos" },
  mhz: { en: "MHz", lt: "MHz" },
  banks: { en: "Station banks", lt: "Stočių grupės" },
  stations: { en: "Stations", lt: "Stotys" },
  books: { en: "Books", lt: "Knygos" },
  stories: { en: "Stories", lt: "Istorijos" },
  collections: { en: "Collections", lt: "Leidiniai" },
  selected: { en: "Selected work", lt: "Pasirinktas leidinys" },
  browse: { en: "Browse books", lt: "Rinktis knygą" },
  chapters: { en: "Chapters", lt: "Skyriai" },
  chapter: { en: "Chapter {n}", lt: "{n} skyrius" },
  chapterCountOne: { en: "{n} chapter", lt: "{n} skyrius" },
  chapterCountFew: { en: "{n} chapters", lt: "{n} skyriai" },
  chapterCountOther: { en: "{n} chapters", lt: "{n} skyrių" },
  introduction: { en: "Introduction", lt: "Įžanga" },
  resume: { en: "Continue listening", lt: "Klausytis toliau" },
  start: { en: "Start listening", lt: "Pradėti klausytis" },
  replay: { en: "Listen again", lt: "Klausytis dar kartą" },
  finished: { en: "Finished", lt: "Išklausyta" },
  current: { en: "Listening now", lt: "Dabar klausaisi" },
  complete: { en: "{percent} complete", lt: "Išklausyta {percent}" },
  finishedCount: { en: "Chapters finished · {done}/{total}", lt: "Išklausyta skyrių · {done}/{total}" },
  play: { en: "Play", lt: "Leisti" },
  pause: { en: "Pause", lt: "Pristabdyti" },
  previous: { en: "Previous line", lt: "Ankstesnė eilutė" },
  next: { en: "Next line", lt: "Kita eilutė" },
  showText: { en: "Show text", lt: "Rodyti tekstą" },
  showTranslation: { en: "Show translation", lt: "Rodyti vertimą" },
  hideTranslation: { en: "Hide translation", lt: "Slėpti vertimą" },
  en: { en: "English", lt: "Angliškai" },
  lt: { en: "Lithuanian", lt: "Lietuviškai" },
  es: { en: "Spanish", lt: "Ispaniškai" },
  opening: { en: "Opening the shelf…", lt: "Atveriama lentyna…" },
  finding: { en: "Finding your place…", lt: "Ieškome, kur sustojai…" },
  empty: { en: "The shelf is empty.", lt: "Lentyna kol kas tuščia." },
  catalogError: { en: "The books couldn't load.", lt: "Nepavyko įkelti knygų." },
  audioError: { en: "The audio couldn't start.", lt: "Nepavyko paleisti įrašo." },
  retry: { en: "Try again", lt: "Pabandyk dar kartą" },
  course: { en: "Open in course", lt: "Atverti kurse" },
  back: { en: "Back", lt: "Atgal" },
} as const;

export type BookWord = keyof typeof bookCopy;
export const bookLocale = "lt" as "en" | "lt";
export function bookWord(key: BookWord, values: Record<string, string | number> = {}) {
  return bookCopy[key][bookLocale].replace(/\{(\w+)\}/g, (_, field: string) => String(values[field]));
}

export const bookPercent = (fraction: number) => new Intl.NumberFormat(bookLocale, { style: "percent" }).format(fraction);
export function chapterCount(n: number) {
  const form = new Intl.PluralRules(bookLocale).select(n);
  return bookWord(form === "one" ? "chapterCountOne" : form === "few" ? "chapterCountFew" : "chapterCountOther", { n });
}
