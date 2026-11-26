export const KARAOKE_COPY = {
  en: {
    sign: "Karaoke", enter: "Sing karaoke", choose: "Choose a song", collection: "Song collection",
    all: "All songs", favorites: "Favorites", emptyFavorites: "Your favorite songs will appear here.",
    empty: "There are no songs here yet.", loading: "Loading songs…", preparing: "Getting your song ready…",
    catalogError: "The song list couldn’t load.", audioError: "This song couldn’t play.",
    timingError: "Timed lyrics are unavailable for this song.", retry: "Try again", back: "Go back",
    mode: "Practice mode", along: "Sing along", echo: "Echo each line", echoSoon: "Echo is coming soon.",
    start: "Start song", pause: "Pause", resume: "Resume", leave: "Leave stage", another: "Choose another song",
    finished: "The song has finished.", held: "Playback is waiting.",
  },
  lt: {
    sign: "Karaokė", enter: "Dainuoti karaokę", choose: "Pasirinkti dainą", collection: "Dainų rinkinys",
    all: "Visos dainos", favorites: "Mėgstamos dainos", emptyFavorites: "Čia rasi savo mėgstamas dainas.",
    empty: "Čia dar nėra dainų.", loading: "Įkeliamas dainų sąrašas…", preparing: "Ruošiama tavo daina…",
    catalogError: "Nepavyko įkelti dainų sąrašo.", audioError: "Nepavyko paleisti šios dainos.",
    timingError: "Šios dainos teksto su laiko žymomis nėra.", retry: "Bandyti dar kartą", back: "Grįžti",
    mode: "Praktikos būdas", along: "Dainuoti kartu", echo: "Kartoti po eilutę", echoSoon: "Netrukus galėsi kartoti po eilutę.",
    start: "Pradėti dainą", pause: "Pristabdyti", resume: "Tęsti", leave: "Nulipti nuo scenos", another: "Pasirinkti kitą dainą",
    finished: "Daina baigėsi.", held: "Laukiama, kol bus galima tęsti.",
  },
} as const;

export const KARAOKE_UI = KARAOKE_COPY.lt;
