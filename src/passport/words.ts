import type { KeepsakeKind } from "../content/keepsakes";

export interface Words { en: string; lt: string }
export const words = (en: string, lt: string): Words => ({ en, lt });
export const sections = {
  situations: words("Situations", "Situacijos"), places: words("Places", "Vietos"),
  games: words("Games", "Žaidimai"), keepsakes: words("Keepsakes", "Suvenyrai"),
  cards: words("Cards", "Kortelės"), songs: words("Songs", "Dainos"), books: words("Books", "Knygos"),
};
export type Section = keyof typeof sections;
export const copy = {
  title: words("My town passport", "Mano miesto pasas"), index: words("Stamp index", "Antspaudų rodyklė"),
  earned: words("Earned", "Gauta"), available: words("Still to earn", "Dar negauta"),
  fresh: words("New stamps", "Nauji antspaudai"), next: words("Next stamp", "Peržiūrėti kitą antspaudą"),
  view: words("View stamp", "Peržiūrėti antspaudą"), back: words("Back", "Grįžti"), close: words("Close", "Uždaryti"),
  link: words("Open in the course", "Atverti kurse"), favorites: words("Favorite songs", "Mėgstamos dainos"),
  empty: words("Finish a conversation to earn your first situation stamp.", "Užbaik pokalbį ir gausi pirmąjį situacijos antspaudą."),
  sit: words("Finish this conversation.", "Užbaik šį pokalbį."),
  place: words("Finish a conversation here.", "Užbaik pokalbį šioje vietoje."),
  game: words("Start this game.", "Pradėk šį žaidimą."),
  keepsake: words("Finish one of these conversations.", "Užbaik vieną iš šių pokalbių."),
  card: words("Save a card in town.", "Išsisaugok kortelę mieste."),
  song: words("Listen to this song in the course.", "Išklausyk šią dainą kurse."),
  chapter: words("Read or listen to this chapter in the course.", "Perskaityk arba išklausyk šį skyrių kurse."),
  cover: words("Finish every chapter.", "Užbaik visus skyrius."),
  times: words("Conversations completed", "Užbaigtų pokalbių skaičius"),
  here: words("Conversation completed here", "Čia užbaigtas pokalbis"),
  starts: words("Games started", "Pradėtų žaidimų skaičius"), pocket: words("Card pocket", "Kortelių kišenėlė"),
  inCards: words("In your cards", "Tavo kortelėse"), heard: words("Heard in the course", "Išklausyta kurse"),
  read: words("Read in the course", "Perskaityta kurse"), chapters: words("Chapters completed", "Užbaigta skyrių"),
  complete: words("Book completed", "Knyga užbaigta"), prevPage: words("Previous page", "Ankstesnis puslapis"),
  nextPage: words("Next page", "Kitas puslapis"), loading: words("Opening the page…", "Atverčiamas puslapis…"),
  unavailable: words("This page is unavailable.", "Šis puslapis nepasiekiamas."),
  waves: words("Waves ridden", "Įveiktos bangos"), finds: words("Photo finds", "Fotografijų radiniai"),
};
export const withCount = (label: Words, count: number | string) => words(label.en + " · " + count, label.lt + " · " + count);
export const games = {
  road: words("Desert Road", "Kelias per dykumą"), sea: words("Open Sea", "Atvira jūra"),
  taxi: words("Taxi", "Taksi"), billiards: words("Billiards", "Biliardas"),
  barista: words("Barista", "Barista"), gofish: words("Go Fish", "Kortų žaidimas „Go Fish“"),
  surf: words("Surf lesson", "Banglenčių pamoka"), photowalk: words("Photo Walk", "Fotopasivaikščiojimas"),
  gym: words("Workout", "Treniruotė"),
};
export const keepsakeNames: Record<KeepsakeKind, string> = {
  cue_chalk: "Cue chalk", passport_stamp: "Passport stamp", boarding_pass: "Boarding pass", baggage_tag: "Baggage tag",
  ticket: "Ticket", room_key: "Room key", home_key: "Apartment key", car_key: "Car key", map: "Town map",
  coffee_cup: "Coffee cup", receipt: "Receipt", shopping_bag: "Shopping bag", business_card: "Business card",
  badge: "Employee badge", note: "Note", flower: "Flower", balloon: "Balloon", water_bottle: "Water bottle",
  prescription: "Prescription", wallet: "Wallet", slate_pebble: "Slate pebble", oak_leaf: "Oak leaf",
};
