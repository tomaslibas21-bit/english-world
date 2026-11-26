import { EDITION } from "../edition";
import { L } from "./i18n";

const bookCopy = {
  library: (vars) => L("Meipl Harboro viešoji biblioteka", vars),
  description: (vars) => L("Garsinės knygos ir istorijos", vars),
  music: (vars) => L("Muzika", vars),
  talk: (vars) => L("Laidos", vars),
  mhz: (vars) => L("MHz", vars),
  banks: (vars) => L("Stočių grupės", vars),
  stations: (vars) => L("Stotys", vars),
  books: (vars) => L("Knygos", vars),
  stories: (vars) => L("Istorijos", vars),
  collections: (vars) => L("Leidiniai", vars),
  selected: (vars) => L("Pasirinktas leidinys", vars),
  browse: (vars) => L("Rinktis knygą", vars),
  chapters: (vars) => L("Skyriai", vars),
  chapter: (vars) => L("{n} skyrius", vars),
  introduction: (vars) => L("Įžanga", vars),
  resume: (vars) => L("Klausytis toliau", vars),
  start: (vars) => L("Pradėti klausytis", vars),
  replay: (vars) => L("Klausytis dar kartą", vars),
  finished: (vars) => L("Išklausyta", vars),
  stoppedHere: (vars) => L("Čia sustojai", vars),
  current: (vars) => L("Dabar klausaisi", vars),
  complete: (vars) => L("Išklausyta {percent}", vars),
  finishedCount: (vars) => L("Išklausyta skyrių · {done}/{total}", vars),
  play: (vars) => L("Leisti", vars),
  pause: (vars) => L("Pristabdyti", vars),
  previous: (vars) => L("Ankstesnė eilutė", vars),
  next: (vars) => L("Kita eilutė", vars),
  showText: (vars) => L("Rodyti tekstą", vars),
  showTranslation: (vars) => L("Rodyti vertimą", vars),
  hideTranslation: (vars) => L("Slėpti vertimą", vars),
  en: (vars) => L("Angliškai", vars),
  lt: (vars) => L("Lietuviškai", vars),
  es: (vars) => L("Ispaniškai", vars),
  opening: (vars) => L("Atveriama lentyna…", vars),
  finding: (vars) => L("Ieškome, kur sustojai…", vars),
  empty: (vars) => L("Lentyna kol kas tuščia.", vars),
  catalogError: (vars) => L("Nepavyko įkelti knygų.", vars),
  audioError: (vars) => L("Nepavyko paleisti įrašo.", vars),
  retry: (vars) => L("Bandyti dar kartą", vars),
  course: (vars) => L("Atverti kurse", vars),
  reader: (vars) => L("Atverti skaityklę", vars),
  meanings: (vars) => L("Žodžių reikšmės", vars),
  rejoin: (vars) => L("Grįžti prie skaitomos eilutės", vars),
  seek: (vars) => L("Pereiti į {n} eilutę", vars),
  listeningOptions: (vars) => L("Rodyti klausymo parinktis", vars),
  settings: (vars) => L("Klausymo nustatymai", vars),
  mode: (vars) => L("Įrašo kalba", vars),
  only_en: (vars) => L("Tik angliškai", vars),
  only_lt: (vars) => L("Tik lietuviškai", vars),
  only_es: (vars) => L("Tik ispaniškai", vars),
  paired_em: (vars) => L("Lietuviškai, tada angliškai", vars),
  paired_sm: (vars) => L("Lietuviškai, tada ispaniškai", vars),
  paired_sme: (vars) => L("Angliškai, tada ispaniškai", vars),
  speed_en: (vars) => L("Anglų kalbos greitis", vars),
  speed_lt: (vars) => L("Lietuvių kalbos greitis", vars),
  speed_es: (vars) => L("Ispanų kalbos greitis", vars),
  rate: (vars) => L("{rate}×", vars),
  autoplay: (vars) => L("Leisti kitą skyrių", vars),
  sleep: (vars) => L("Išjungimo laikmatis", vars),
  off: (vars) => L("Išjungta", vars),
  minutes: (vars) => L("{n} min.", vars),
  endChapter: (vars) => L("Skyriaus pabaigoje", vars),
  endStory: (vars) => L("Istorijos pabaigoje", vars),
  endScene: (vars) => L("Pokalbio pabaigoje", vars),
  readText: (vars) => L("Skaityti tekstą", vars),
  back: (vars) => L("Atgal", vars),
} satisfies Record<string, (vars?: Record<string, string | number>) => string>;

export type BookWord = keyof typeof bookCopy;
export const bookLocale = EDITION.helper;

export function bookWord(key: BookWord, values?: Record<string, string | number>) {
  return bookCopy[key](values);
}

export const bookPercent = (fraction: number) => new Intl.NumberFormat(bookLocale, { style: "percent" }).format(fraction);
export function chapterCount(n: number) {
  const form = new Intl.PluralRules(bookLocale).select(n);
  return form === "one" ? L("{count} skyrius", { count: n })
    : form === "few" ? L("{n} skyriai", { n }) : L("{n} skyrių", { n });
}

export const chapterLabel = (number: number) => number === 0 ? bookWord("introduction") : bookWord("chapter", { n: number });
