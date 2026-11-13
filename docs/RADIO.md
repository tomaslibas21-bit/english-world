# The town's radio

The learner can listen to the course's songs while walking around the town: a radio button in the toolbar (key R), a
card with the stations and the buttons, and a lyric strip with the line being sung and each word's gloss under it.
The game has no songs of its own. It plays the ones the course it sits in already has.

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

`src/content/radio.ts` lists them. A station is a name, a line in the learner's language, a filter over the list
(Maple Harbor's two genre stations match words of the list's genre text) and whether it starts shuffled. The same file
says which course song each conversation is built on: walking into a place puts its song next, once per visit to the
page.

## Never into the microphone

Music must not reach speech recognition. `src/radio/radio.ts` keeps a set of holds, and nothing starts sound while one
stands:

| Hold | From | How |
| --- | --- | --- |
| conversation | `conv.active` in the store | fades out over 250 ms, then pauses |
| voice | the voice player is loading or speaking | the same |
| microphone | `watchMicrophone()` in `src/convo/audioFocus.ts`, called first thing in `captureAudio()` | pauses at once, before the audio route changes |

The music comes back 0.7 s after the last hold is gone, from where it stopped, if the radio is on. Pause is pause: no
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

`ew-radio-v1` in localStorage (a note of this device's, not part of the save the course backs up): on or off, the station, the shuffle choice and its seed, the song and the
place in it, whether the lyric strip shows. A visit that starts with the radio on goes on by itself where the browser
allows it, and at the first tap where it asks for one.

## Checks

- `tests/radio.test.ts`: the addresses, the lyric clocks, the order, storage, every hold, the fallback address, the
  iPhone output.
- `tests/browser/radio.mjs`: the real game in Chrome and WebKit, on a desktop and as an iPhone, with fixture songs. Its
  header says how to run it.
