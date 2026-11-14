# The town's radio

The learner can listen to the course's songs while walking around the town: a power button in the toolbar (key R), a
small radio set with the stations, the song's heart and the keys, and a lyric strip with the line being sung and each
word's gloss under it. Maple Harbor's player is Maple Harbor Radio, Puerto Colibrí's Radio Puerto Colibrí. The game has
no songs of its own. It plays the ones the course it sits in already has, all of them: the radio is the course's
songs, kind by kind, as its Songs page has them.

## Look and feel

The owner's brief (13 Nov 2026): a nice feel, easy to turn on and off, calm while walking, each town's own look.

- **One tap on, one tap off.** The toolbar's radio button is the power switch; R does the same. On shows at a glance:
  the button's lamp glows, and a plate beside it names the station, with three moving bars. A new song's title shows on
  the plate for five seconds.
- **Off looks off.** Switched off with the toolbar button (or R), an open set folds away too. The set's own knob
  turns the radio off without closing the set the learner is using.
- **The radio's name always shows in full.** `RADIO_NAME` has the header's line to itself: no frequency is written
  there (the owner's call, 13 Nov; the dial and its needle say where the station is). The set's width follows the text
  size (A, A+, A++), and a name too long for the line takes two.
- **The radio set** opens from the plate (its small chevron says so) and folds away at a tap anywhere else. The very
  first time the radio is turned on it opens by itself, once (`introduced` in the saved state). From the top: the
  name; an FM dial with a dot for each station, whose needle glides to the one that plays (`freq` in
  `src/content/radio.ts`); the display; five keys around the on-off knob; the stations.
- **The display** (the owner's "old school" touch, 14 Nov: a hi-fi's dark glass with glowing letters) shows a small
  spectrum that moves while a song sounds, the station, the song's place in it ("03/43"), the time, the song with its
  translation and genre, the heart, and a thin line that fills as the song goes.
- **The stations** are rows under the keys: the course's kinds of song by number, then the mix and the favorites, each
  with what plays there in the learner's language and how many songs it has. The one that plays is the lit cream row.
  A tap tunes to it (and turns the radio on if it was off). A kind the course doesn't have isn't listed. The favorites
  are listed also while empty, with how to fill them.
- **Small screens.** The set is never taller than the screen: the stations scroll when it would be, and the one that
  plays is brought into view. A phone held sideways has the display and keys on the left and the stations beside
  them, without the dial window; a short phone held upright has no dial window either.
- **Skins.** The set is an object with colours of its own, so it reads the same in every course theme. `RADIO_SKIN` in
  `src/content/radio.ts` picks one: `maple` (navy, brass, a cream dial, a maple-red needle, the name in serif italic)
  or `colibri` (teal, coral and sun yellow under a string of papel picado, the name as a hand-painted sign). Their
  variables are at the top of `src/ui/radio.css`.
- **Names.** Station names stay as they are in every learner language; the line under each is translated.
- **Fades, never a cut.** On: 1 s in. Off: 0.9 s out, and turning it on again meanwhile just lifts the music. A skipped
  song dips 0.2 s out and 0.5 s in; a song that ends goes straight into the next. Changing station plays a soft tuning
  sweep (half a second of quiet filtered static, `tune()` in `src/radio/index.ts`), which never delays the song and is
  silent at volume 0. "Less motion" stills the needle and the bars.
- **One hard cut stays:** a microphone that starts listening while music still sounds (below).

## Where the songs come from

`src/radio/songs.ts` reads three kinds of file, all in the formats of the courses' song player (fluent-steps
`src/lib/songs/types.ts`):

| File | Address | Who may fetch it |
| --- | --- | --- |
| the list | `VITE_RADIO_INDEX`, e.g. `/songs/index.json` | everyone |
| a song's words and timing | `<VITE_RADIO_FILES>/songs/data/<id>.json?t=<token>` | learners with the course |
| a song's recording | the list's `a`, through `VITE_RADIO_FILES` with the token | learners with the course |

- The token is the course's files token the game already uses for its voice clips (`filesToken()` in
  `src/game/audio.ts`). The files Worker's rules for songs were there before the radio; nothing was added.
- A course's free examples are not in the files folder. Their copies stay on the course's site, so a file the folder
  doesn't have is asked for once more at the same path on the site, without the token.
- `VITE_RADIO_RECORDINGS` names a second folder the list's recordings may be written in (Spanish Master English's list
  names the Lithuanian edition's folder; its files Worker serves them under its own).
- The token is never sent to an address outside `VITE_RADIO_FILES`.
- A build without `VITE_RADIO_INDEX` has no radio button. `tools/export-fluent-steps.ts` sets the two addresses for
  English Master.

## Stations

`src/content/radio.ts` lists them (`src/editions/es/content/radio.ts` for Puerto Colibrí). A station is a name, its
place on the dial, a line in the learner's language and a filter over the list. There are three sorts
(`src/radio/playlist.ts`):

- **The course's kinds of song**, one station each, in the course's order. Together they hold every song exactly once.
  The first is the grammar songs, so a new listener starts with the first grammar song (the owner's call, 14 Nov: not
  with the mix, and not with the song of the place the learner stands in; that one comes right after).
- **The mix** (`kind: "mix"`): every song of the course, always shuffled. This is the shuffle across all the stations.
- **The favorites** (`kind: "favorites"`): the songs with the learner's heart, in the course's order.

| | Maple Harbor Radio (English Master) | Radio Puerto Colibrí (the Spanish courses) |
| --- | --- | --- |
| 1 | Grammar FM: G01–G31, then P01–P12 | Gramática FM: SG01–SG30 |
| 2 | Vocab FM: the 64 vocabulary songs | Vocabulario FM: SV01–SV65 |
| 3 | Situations FM: S62–S100, then P25–P30 | Situaciones FM: SS01–SS35 |
| 4 | Idioms FM: P13–P24 | Bilingüe FM: SB01–SB56 (Spanish Master English only) |
| mix | Random FM | Al Azar FM |
| favorites | Favorites FM | Favoritas FM |

English Master's second half (collection p, "Pažengusiems") is one tab on its Songs page but three parts in the course
itself: its atlas has P01–P12 as "Gramatika · Antra dalis" and P13–P24 as "Idiomos" (phrasal verbs, idioms, spoken
English), and P25–P30 are the harder conversations the game's own advanced places are built on. Each part is on the
station of its kind, after the first half's songs. The Spanish courses have no other songs than these: the English
`G`/`V`/`S`/`P` files in their `public/songs/data` are left from the remix and are in no list.

**Moving on.** When a station has played to its end, the radio moves on to the next of the course's kinds that has
songs, and after the last to the first (`nextStation`); a step back from a station's first song goes to the last song
of the one before. The mix never ends (a new shuffle each round), and the favorites start over. With the last heart
gone, the favorites give way to the first station.

**A station keeps its place.** Leaving a station remembers the song it was at (`places` in the saved state), and
coming back goes on from that song's beginning, also when the radio moves on to it by itself. A station played to its
end starts anew.

**The shuffle key** shuffles within the station that plays: every song of it once, then on to the next station,
shuffled too. It is one setting for all the stations but the mix, which is shuffled whatever the key says (there the
key is lit and fixed).

**A shuffle is a fair mix** (`stationOrder` in `src/radio/playlist.ts`). Each of the course's kinds of song (the list's
collections: grammar, vocabulary, situations, bilingual…) is shuffled by itself and then spread evenly through the
whole order. A plain shuffle put two or more of 8 bilingual songs among the first five of 70 in about one visit in
ten; now any ten songs in a row hold the kinds in about the station's own proportions.

## The heart

The heart in the display puts the song that plays among the course's favorite songs, and takes it out again
(`src/radio/favorites.ts`). They are the course's own favorites, not the game's: the note
`fluentsteps.songs.favorites.v1` in this browser's storage, which the course's Songs page reads ("Mėgstamos",
"Favorites") and writes with its own heart. The game's page is a page of the course's site, so both see the same note.

- The note is written exactly as the course writes it (fluent-steps `src/lib/songs/favorites.ts`, the same file in the
  Spanish courses): `{ "<id>": { liked, at } }`, a heart taken back kept as `liked: false` with a later time. The
  course's account sync goes by those times (`mergeSongFavorites` in its `src/lib/sync/merge.ts`).
- **The account.** The note is one of the keys the course keeps in the learner's account (`SYNCED_KEYS`), so a heart
  given in the game reaches the learner's other devices. The sync runs in the course's pages, not in the game's: the
  heart goes up when a page of the course is next open in this browser (at once, if one is open in another tab; else
  when the learner goes back to the course), the same way the game's own progress does. No course change was needed.
- A heart given on the course's page in another tab shows in the game at once (the `storage` event).
- Favorites FM / Favoritas FM plays the songs with a heart.

## Bilingual songs

The Spanish courses' bilingual songs (collection b) sing every line twice: first in the learner's language, then in
Spanish. A line's data carries the first singing as `en` (start, end, a time for each word of `lt`). That singing is
part of the song, not a gloss, so the lyric strip gives it a row of its own before the line, its words lit at their
own times and nothing under them (`withSungTranslations` in `src/radio/lyrics.ts`), as the course's song player does
(player-engine.ts, `englishPages`). Without a time for every word the row shows for the singing's length with no word
lit. Checked against the course's player itself, run from a scratch copy with a stand-in recording: at the middle of
every sung part of SB20, SB01 and SB13 (172 moments) both show the same part, the same words, in the same order. The same file
says which course song each conversation is built on: walking into a place puts its song next, once per visit to the
page.

## Never into the microphone

Music must not reach speech recognition. `src/radio/radio.ts` keeps a set of holds, and nothing starts sound while one
stands:

| Hold | From | How |
| --- | --- | --- |
| conversation | `conv.active` in the store | fades out over 0.9 s, then pauses |
| voice | the voice player is loading or speaking | fades out over 0.5 s, then pauses |
| microphone | `watchMicrophone()` in `src/convo/audioFocus.ts`, called first thing in `captureAudio()` | pauses at once, before the audio route changes |

The music comes back 0.7 s after the last hold is gone, fading in over a second from where it stopped, if the radio is on. Pause is pause: no
hold's end turns a paused radio on. The system's media keys go through the radio (`navigator.mediaSession`), and the
media element refuses any start the radio didn't ask for.

## Two outputs

`src/radio/output.ts`:

- Everywhere but iPhone and iPad: one `<audio>` element. The next song starts inside `ended`.
- iPhone and iPad: the game's own Web Audio context, as for the voices (docs/MOBILE-AUDIO.md). No media element is made
  there at all. A song is fetched and decoded whole at 32 kHz, about 15 MB a minute, one at a time; the next song's
  bytes are fetched ahead, so the gap between songs is the decode.

Not checked on a physical iPhone. The browser checks run the iPhone branch in Chromium and WebKit on a desktop.

## Remembered

`ew-radio-v2` in localStorage (a note of this device's, not part of the save the course backs up): on or off, the
station, the shuffle key and its seed, the song and the place in it, where each other station was left, whether the
lyric strip shows, and whether the set has opened by itself yet. A visit that starts with the radio on goes on by
itself where the browser allows it, and at the first tap where it asks for one.

The radio of 13 Nov kept `ew-radio-v1` (other stations, a shuffle that started on). Its on/off and lyric-strip choice
are read once; everything else starts anew, so every learner starts at the first grammar song and the set opens once
more to show the stations.

## Checks

- `tests/radio.test.ts`: the addresses, the lyric clocks, bilingual lines, the order and its fair mix, the stations
  (every song on exactly one, the course's order, moving on, places, the shuffle key, the mix, the favorites), the
  heart's note, storage, the power switch, the fades and dips, every hold, the fallback address, the iPhone output.
- `tests/browser/radio.mjs`: the real game in Chrome and WebKit, on a desktop and as an iPhone, with fixture songs. Its
  header says how to run it.
