# Radio + Library, premium

**Art direction and build brief · 26 November 2026 · MH first, then PC in both learner languages**

Let someone pick up *The Canterville Ghost* in a reading chair, hear a Lithuanian sentence followed by its English, then walk to Union Station with that very sentence still on the radio. In Puerto Colibrí, let someone do the same with *Cuentos de la selva*, in the language of their Spanish course. A cover, a voice and a remembered place should do most of the work.

Budget **$0**. Use the existing recordings, art, text, fonts and synthesized effects. Development and owner review are local. Course trees and both review trees are inputs only. No new recordings, downloads, external generation, course exports, uploads, pushes or publication. The paths and counts below describe the specified checkouts on this Mac. Production URLs are derived from source. The LAN samples were checked against actual files.

## 1. What exists

**The set.** `docs/RADIO.md`, `src/ui/Radio.tsx`, `src/ui/radio.css` and `src/content/radio.ts` describe a tabletop radio with an 88–108 dial, five keys, a scrolling station list and a separate lyric strip over the world. R is power. On desktop the dial plate opens the set. On a phone the radio button opens it. Its knob can pause with the set open. Closing it lets sound continue. A build without `VITE_RADIO_INDEX` currently has no radio button. Grammar starts first when songs are configured. PC supplies `src/editions/es/content/radio.ts`. The Spanish song collections differ across SME and SM.

**The engine.** `src/radio/index.ts` binds one `Radio` to Zustand, volume, town ambience, Media Session, gestures and holds. `radio.ts` owns switching, fades, resume and the save. `songs.ts` resolves public lists, private data and recording URLs. `playlist.ts` orders the songs, `lyrics.ts` clocks the sung words, `extras.ts` loads notes and pictures on demand, `spots.ts` places recorded interludes between songs, and `favorites.ts` shares hearts with the course. `ew-radio-v2` is the device's station/song state. `output.ts` streams through HTML audio on most platforms and decodes one song into the game's AudioContext on iOS. Conversation, loading/speaking voice, minigame music and microphone each hold the radio. The mic stops it synchronously. The documented iPhone volume problem makes this distinction important for chapters.

### The three shelves

All asset paths in this section start at the course site's origin, including when the game is mounted below it. A disk path is that course repo plus `public` plus the asset path. Each course has `/knygos/index.json` with `totals` and ordered `books[].chapters[]`, and `/stories/index.json` with top-level `modules[]` and ordered `stories[]` joined by module number. Use these published lists. There are unlisted inherited assets in the Spanish repos. Each listed chapter and story has its audio flag set in these checkouts. A story is a single listening item and gets the same reader and resume treatment as a one-chapter book.

| Course and local source | Inventory and a real selection | Actual recording address (append the course token when needed) | Reader and listening routes on the **enclosing course origin** |
|---|---|---|---|
| EM · `~/fluent-steps` · EN/LT | 20 books, 345 chapters, 158 stories. `BOOK-CANT` *The Canterville Ghost* → `BOOK-CANT-01` *A house with a warning*. Story `TOM-001` *The Soup He Chose*. | `https://audio.dvikalbesdainos.lt/fluent-steps/knygos/audio/v2/BOOK-CANT-01.mp3` (LT then EN). Replace `v2` with `en/v2` for EN, `lt/v1` for LT. | `/knygos/book/BOOK-CANT`, `/knygos/BOOK-CANT-01`, `/knygos/audio/BOOK-CANT-01` |
| SM · `~/spanish-master` · ES/LT | 10 books, 96 chapters including introductions, 125 stories. `BK01` *Cuentos de la selva* → `BK01-01` *La tortuga gigante* / *Milžiniškas vėžlys*. Story `HIS-SG01` *Una palabra cada mañana*. | `https://audio.dvikalbesdainos.lt/spanish-master/audio/v1/LT-ES/BK01-01.mp3`. Sibling folders `ES` and `LT` hold the single voices. Books and stories share these folders. | `/knygos/book/BK01`, `/knygos/BK01-01`, `/knygos/audio/BK01-01` |
| SME · `~/spanish-master-english` · ES/EN | 10 books, 96 chapters, 125 stories in this tree. Same `BK01` and `BK01-01`, English title *The Giant Turtle*. `HIS-SG01` is *One Word Every Morning*. | Request `https://audio.dvikalbesdainos.lt/spanish-master-en/audio/v1/EN-ES/BK01-01.mp3`. Siblings `ES` and `EN`. Its config names the storage folder `spanish-master`. Its **own** Worker serves those bytes. | `/books/book/BK01`, `/books/BK01-01`, `/books/audio/BK01-01`. Assets still live under `/knygos`. |

All three have `/stories/<id>` and `/stories/audio/<id>`. See the matching `src/routes/{knygos,books,stories}.*.tsx` and `src/components/reader/{InterlinearReader,AudioReader,CompactPlayer}.tsx`. The audio routes accept `?mode=bilingual|english|lithuanian` (legacy roles in all three). For the course link map paired → `bilingual`, target → `english`, helper → `lithuanian`, even on PC. Course progress and book preferences remain the course's own.

**Text and clocks.** `/{knygos,stories}/data/<fileId>.json` contains paragraphs, optional breaks and ordered sentences. Preserve punctuation, paragraph structure, authored gloss units and the natural sentence translation. EM sentences have `n,en,lt,units` with tuples `[target,gloss,ipa]`. In the Spanish display paragraphs the target is `es` (also aliased as `en`), `lt` is the helper, and `sentence_id` identifies the line. The raw source may also repeat sentences at the top level. Read the display paragraphs once. SME's **English** titles, full translations and glosses occupy fields named `title_lt`, `lt` and the second tuple slot. `BK01-00` is an introduction. Play it in index order and label it “Introduction.”

| Files within each section's `audio/` | How to use them |
|---|---|
| `config.json` | Public. Read `baseUrl`, `englishBaseUrl`, `lithuanianBaseUrl` as **paired**, **target**, **helper**. In EM the stories use `stories/audio/{v2,en/v2,lt/v1}`. EM offers phrase-cut versions too (stories v3, books v4, easy books v5). Use its whole-sentence recording for this feature. |
| EM editions | Follow `src/lib/knygos/edition.ts` and `data.ts` read-only. For the ten eligible advanced books, honor `fluentsteps.books.edition.v1` (default easy). Use `level_easy` and easy chapter metadata. E.g. `data/BOOK-GATSBY-01.easy.json` and the corresponding `.easy.json` timings both contain the canonical chapter ID. Easy MP3s keep the **unsuffixed** filename under `v3`, `en/v3` or `lt/v2`. A bookmark belongs to its text edition. |
| `timing/<fileId>.json` | Bilingual recording clock in seconds. Each `timeline[]` row carries `sentence_id,language,text,start,end`, with `duration_seconds` for the item and hashes where supplied. Pair by ID. EM example `BOOK-CANT-01-S001` plays LT at 0.000–4.669, EN at 4.969–9.970. Match EM sentence number and normalized text. On PC keep the voiced `-title` and `-intro-01` cues and map the legacy `language:"lt"` to the helper. Use the correct title row during its narration. |
| Single-voice clocks | `lithuanian-timing/<fileId>.json` is the helper track in each course. Spanish courses have `english-timing/<id>.json` for Spanish-only. EM's checkout has no such folder. Derive EN-only from bilingual EN cue durations with the course's `englishStoryTiming` (round durations to 24 kHz samples, insert 13,200 silent samples between lines). Never seek a mono MP3 with a bilingual timestamp. |
| `word-timing/<fileId>.json` | Target-language word highlighting. `lines[].w` holds sentence-relative [start,end] seconds or null for punctuation. Match ID, token count and the active recording. Add the current cue's start to the word offsets. For the helper or incomplete word alignment, highlight the whole sentence. Reader references are `src/lib/stories/{audio,word-times,rate-policy}.ts` and, on PC, `timing.ts`. |
| Speeds | These are recorded versions by **language/mode**. The speed choices are playback adjustments. The course's `EnglishSpeedControl.tsx` offers the target at 0.75, 0.8, 0.9, 1× natural speed, and helper at 0.75, 1, 1.25, 1.5, 1.75, 2×. Target takes are already at 0.75×, helpers at 1×. Default to those two values. Use target media rate = requested / 0.75, helper media rate = requested. Read verified `rate_switches` where present. |

**Covers.** Use the course's `src/lib/course/artwork.ts` / `artwork.generated.ts` mapping of book ID to hash and width. Include just a small game-side lookup of book thumbnail paths per edition, derived read-only from that map. Book grid uses `/art/s/books/<id>.<hash>.160.webp`, selected book may use 320. Each indexed book has both. Story art uses the equivalent `stories` mapping and asset folder. Lazy-load its map when Stories opens. Titles and authors remain selectable HTML. Show the full cover with `object-fit:contain`.

| Example file stem | 160×241 WebP | 320×482 WebP | 640×964 WebP | Archive original at `/art/higgsfield/books/<id>.webp` |
|---|---:|---:|---:|---|
| EM `BOOK-CANT.9fa4a49e` | 6,496 B | 22,408 B | 71,596 B | 1200×1807, 352,194 B |
| SM and SME `BK01.65adb81f` | 9,728 B | 35,200 B | 111,652 B | 1060×1597, 325,792 B |

### What the files token can fetch

`filesToken()` in `src/game/audio.ts` reads the renewed, unexpired `fs-files-token` (more than 60 seconds left), else the launch token. `tools/export-fluent-steps.ts` and PC's `tools/export-sme.ts` describe the respective roots. Treat these as configuration evidence, never run the exporters for review. The song list is public on the course site. `VITE_RADIO_FILES` is the only token destination. SME's `VITE_RADIO_RECORDINGS` identifies a source prefix to **rewrite**.

| Course | Worker contract and source choice for the game |
|---|---|
| EM | Under `/fluent-steps`, existing `src/lib/files/rules.ts` covers `/{stories,knygos}/data/*.json`, `audio/{timing,lithuanian-timing,word-timing}/*.json`, and `/{stories,knygos}/audio/[(en or lt)/]v<number>/<id>.mp3`. Existing patterns include easy and phrase variants. Free text/timings include TOM-001, TOM-005 and chapter 01 of each listed book. Free MP3 rule covers TOM-001 and `BOOK-[A-Z]+-01` (including corresponding version folders). Read free JSON from the site, paid JSON and recordings from their configured Worker paths. |
| SM | Under `/spanish-master`, same data section paths, four timing folders including `english-timing`, and `/audio/v1/{LT-ES,ES,LT}/<id>.mp3` plus adjacent pipeline JSON match existing rules. Use the section timing JSON the reader uses. Free JSON includes HIS-SG01, HIS-SG02 and BK01-01…BK10-01. Free recordings are HIS-SG01 and `BKdd-01`. The paid token covers the other listed chapters, including chapter 00. |
| SME | The `spanish-master-en` rules recognize `LT-ES|EN-ES|ES|LT|EN` under `/audio/v1/`. Recording requests go to `/spanish-master-en` with **SME's** token. `workers/files/src/handle.ts::keysOf` with `SHARED_PREFIX=/spanish-master` reads the shared recording key for `/audio/v1/`. JSON paths are classified much like SM, but `src/lib/files/stage.ts` sets `CONTENT_FILES_ON_WORKER=false`. Fetch all SME chapter/story text and display timings from the **SME app origin, unsigned**, including paid items, as its own reader does. The authorization rules alone do not establish that the correct English data lives on R2. Free IDs follow SM. |

In each repo see `workers/files/src/{handle,access}.ts`, `src/lib/files/{rules,urls,stage}.ts`, and `workers/files/wrangler{,.spanish,.spanish-en}.jsonc` for the appropriate edition. The checked configs enforce tokens on `course` paths. Each handler supports GET/HEAD and byte Range/206 and exposes Content-Range to browser JavaScript. Append `?t=<encoded filesToken()>` (or `&t=` after a version) only on the configured Worker prefix. Keep tokens out of bookmarks, media metadata, logs and course links. Keep EM’s repaired timing revisions from `src/lib/files/narration-version.ts::narrationContentPath` and the recording version from its mode-specific hash together in asset requests. Classification is separate from object presence. Lists, audio configs and public cover thumbnails belong on the app origin. All three checked rule lists classify unmatched paths as public. This includes the game's `/game/audio-v2/` or `/game/audio-es/` clips. The game already appends a token to those URLs. This is a source-tree finding. Verify the deployed rules separately if changing protection is ever proposed. The game's song data, song MP3s and notes continue to use the existing radio resolver.

**This design requires zero Worker rule changes.** A new private directory for sliced chapters or private EM `english-timing` sidecars would require a protection/strip/upload rule and corresponding objects. We use the existing paths instead. A missing object is a media issue. Never treat a 401/403 as permission to try another course or an unprotected mirror. If the owner later wants a new protected asset family, prepare the change in the affected course on a separate local branch and hand it back unpushed.

## 2. Listening contract

### Book FM and Conversation FM on the dial

Keep the current station numbers, frequencies, hearts and shuffle order. Add a **Music / Talk** switch just above the station rows. It changes which rows are visible and has no effect on the sound. Opening the set selects the bank of the tuned station. Each dial dot still has a single station. Preserve the hidden dial on short screens. Show the dots for the visible bank on the full-height set. If another bank is playing, its name and frequency stay in the glass display until the listener tunes a row. New talk frequencies are **91.3** Book FM and **98.5** Conversation FM, between existing marks. In PC the painted station names are **Libros FM** and **Conversaciones FM** on both learner layers. The existing Situations/Situaciones FM still plays songs.

Give each station a source type (songs, books or scenes) beside its existing metadata. Keep `stationSongs` typed to music sources only. Availability follows each source. Book FM needs a configured course shelf, Conversation FM needs a playable scene, music needs its song source. A plain build with none configured keeps today's toolbar behavior. A local books-only review must work with the song host absent. No book cover, full situation script or timing file at town boot. New listeners still start on Grammar when songs are available. Automatic music rotation, favorites, location suggestions and spots operate within music, including when a talk station has been visited.

| On a talk station | Behavior |
|---|---|
| Tuning and display | First tune to Book FM opens the shelf, silent until a chapter is chosen. On later tunes, continue the last unfinished item at its bookmark if powered on. Scene radio does the equivalent with its scene list. In the existing glass display use station, title, current chapter/scene and progress. Replace the song heart with the cover/list entry point. Clear old song notes, pictures, spot and “up next” display immediately. |
| Five keys, left to right | **Browse** books/scenes · **Previous line** · **Play/Pause** · **Next line** · **Show text** toggle. No long-press commands. Back restarts this sentence after two seconds into it, otherwise goes to the previous sentence. Forward goes to the next sentence. In paired mode “line” navigates a sentence pair and lands on the helper. At boundaries stay at the first/last sentence. Select another chapter explicitly in Browse. Media next/previous perform the same line actions. |
| Walking strip | Show the current spoken line and a thin language-colored rule, with a language name for screen readers. Use the actual spoken text for each leg. In target-only or scene playback, a small **Show translation** button reveals the natural translation for this sentence. A second tap hides it. Reset on sentence change. Only the button consumes town taps. On a phone the strip clears the joystick, prompts and jump target. The display has the same translation action when the strip is folded. |
| Book settings | A single **Listening settings** action opens a second sheet. Three named modes (target, helper, helper then target), two language-named speed selectors, autoplay and sleep. Offer the same controls in the reader. Mode changes land on the same sentence, in the first applicable language, with prior play/pause intent. Adjusting speed keeps the audible place. One preference per actual language per course applies in both paired and single modes. |
| End and sleep | **Play next chapter** defaults on. Only advance within the selected book, in index order, on natural completion. Stop after the last chapter, a standalone story or a scene. A manually skipped ending never completes a chapter. Sleep defaults off, with 15 min, 30 min or end of chapter (end of scene on scene radio). A timed sleep uses a wall-clock deadline, including screen lock. Expiry takes precedence over autoplay and hold release. Save, fade out, clear play intent and reset the timer. Reaching the natural end under an end-of-chapter timer still marks that chapter finished. |
| Interrupted playback | R, tap outside and the center knob retain their current set semantics. Opening a picker or inspecting a different book does not start it or disturb the current item. Leaving talk stops its audio before music starts and vice versa. User pause while held wins over automatic resume. On failed or expired access, keep the bookmark and any loaded text visible. Offer **Try again** and **Open in course**. Retry rereads the current token. If autoplay is blocked, show Play. One gesture starts the recording once. |

### The book and chapter picker

The returning learner sees one **Continue listening** card at the top with the full cover, target title, chapter name, and a ribbon aligned with the saved fraction. Tapping the card resumes directly. Below it, **Books / Stories** switches between two ordered collections. A new learner sees the first shelf immediately. Each book card carries cover, target/localized title and author, with a small progress mark only after starting. Text remains readable with images disabled. Story rows use their existing art and title. Loads follow the viewport.

Selecting a cover opens a detail view with that cover, title, author, course level, and an ordered chapter list. Each row shows number or Introduction, title and state (current position, completed, or fresh). Current chapter is visible and focused on return. The primary action is **Start listening**, **Continue listening** or **Listen again** according to progress. Tapping a chapter row plays that chapter, using its own bookmark if present. Reading a finished chapter again starts at its beginning. Reader and picker share a back stack. The back action returns to the same cover and scroll position.

### Conversation FM

Build a small program from three existing situation routes per town covering a café order (`s72-cafe`), checking into the hotel (`s68-hotel`) and buying a ticket (`s67a-tickets`). One complete exchange each, roughly 4–8 turns with an opener and an ending. Each turn explicitly references an authored NPC line or a voiced example reply, variant and fixed slots. Compose through that edition's existing code and use its `say` override when present. Take human-readable scene titles, speaker names, display units and natural translations from the situation and cast. PC uses Mariana, Mexican lines with usted to a stranger, and the learner's course layer for the meaning. No live dialogue run, recorder, stars or course completion.

The café scripts in `src/content/situations/s72-cafe.ts` and its PC overlay resolve to existing recordings via `src/audio-key.ts`. Mia's “Hi! What can I get you?” is `audioKey("g_mia",1,…)` → `e782a8ec2e1a`, 1.45 s in `public/audio-v2/manifest.json` (43,024 keys). Mariana's “¡Buenos días! ¿Qué le sirvo?” is `es_mia` → `5475a050b12a`, 1.69 s in PC's `public/audio-es/manifest.json` (155,269 keys). The spoken string, voice and authored speed determine the key. Resolve NPC/coach through the edition's `voices.ts`. Program Mexican Spanish explicitly for these broadcasts and label the scene list accordingly. Resolve the Mexican variant and its `es_` cast together, independently of the game's conversation setting (course exports default to neutral). Resolve at authoring time or with a pure variant parameter. Do not mutate the global variety when tuning. The helper translation is text.

Use `situations/catalog.ts::loadSituation` only for the selected scene. Validate chosen keys, including both sides of the conversation, against the manifest during the build job. If a line lacks a clip, select an already-voiced equivalent and check the exchange still makes sense. Omit an incomplete scene from the offered program. Play through the talk transport using `clipUrl`, repair versions and the files token. Calling the foreground voice player's normal speak method here would put the radio on its own voice hold. The strip changes at clip boundaries, shows speaker + target line, and reveals the learner's text on tap. A scene ends in silence. **Every scene uses existing voices.**

### One player, one bookmark

`src/radio/talkPlayer.ts` owns the selected source, media clock, holds and play intent for spoken programming, under the existing radio singleton. The library, radio face, strip and reader subscribe to it. They issue commands such as `select`, `play`, `pause`, `seekSentence` and `changeMode`. Opening or closing a view never constructs a player. A single output can sound at a time. The song transport hands over ownership before a talk start. Transfer it back on a music tune. Expose talk state to the existing ambient ducking and Media Session binding.

`src/radio/talkProgress.ts` owns **one** versioned local store per course and learner layer, separate from song favorites, course reader saves and scores. Key `ew-talk-v1:<em-lt|sm-lt|sme-en>`. Example below, with illustrative positions. Use JSON-safe ISO language codes, stable IDs and source seconds.

```json
{
  "v": 1,
  "lastBook": "book/BOOK-CANT/author",
  "lastScene": null,
  "items": {
    "book/BOOK-CANT/author": {
      "lastChapter": "BOOK-CANT-01",
      "chapters": {
        "BOOK-CANT-01": {
          "sentence": "BOOK-CANT-01-S003", "leg": "en", "offsetSec": 0.8, "textHash": "line-hash",
          "fraction": 0.07, "complete": false, "audioVersion": "sha-prefix", "updatedAt": 1795680000000
        }
      }
    }
  },
  "prefs": {
    "mode": "paired", "rates": {"en": 0.75, "lt": 1},
    "autoplay": true, "interlinear": true
  }
}
```

Story and scene keys follow `story/<id>/standard` and `scene/<id>/<variety>`, with their own ID in the chapter slot. Course separation is essential because both Spanish books have the same IDs. Use `author` or `easy` for EM books, `standard` for PC books and standalone stories, and the spoken variety for scenes. Point **Continue listening** at the most recently played unfinished book or story. Retain separate scene position. Mark each completed chapter once and keep its completion when replayed. New selection, pause, mode switch, natural end, hold, standing up, pagehide and a throttled five-second tick flush the current place. Browsing never writes progress. Save in one serialized update. Merge per-chapter by update time on storage events, without seeking a currently playing tab. Handle denied storage in memory.

Resume the same leg and offset when the audio version still matches. On a mode, text or audio revision, match the sentence ID and its saved text hash when available, restart that sentence in the requested language and clamp to bounds. If the ID changed, try the text hash, preferring the match nearest the saved fraction. Fall back to the sentence nearest that fraction or to the beginning. Validate IDs, timings, rates, booleans and finite numbers. Ignore corrupt notes. Sleep and current holds are session state. A fresh visit may resume only under the radio's existing on/gesture policy. `ew-radio-v2` can remember which station is tuned, but talk elapsed time and book IDs have exactly one writer.

**Transport decisions for Sol**

1. Normalize chapter text/timings before playback to paragraphs, ordered sentence IDs, target/helper legs and optional real word spans. A timeline belongs to a *specific recording*. Include titles and introductions with a display cue when voiced. A `break:true` paragraph takes no time. Verify cue ID, text, language, monotonic times, duration, and any supplied audio hash/version. On a word mismatch keep sentence highlight. On a chapter timing mismatch keep the text and disable synchronized playback for that file. Retry may recover it.
2. Prefer the course's continuous recording for the selected mode. Bilingual plays in course order (helper → target). Its clock is media time. Native streaming uses the existing HTML output machinery with precise seeks, pitch preservation and the course's measured silent rate-switch windows. Restore the landing rate on seek. Never use a React interval to fence off unwanted speech. For missing or unsafe mixed-rate switch windows, alternate exact cue excerpts of the matching mono tracks at their independent fixed rates. Precue the next without sounding it. Keep at most one active source. Cancellation uses a generation number and abort signals across load, seek, mode, station, hold and `ended`.
3. **iPhone/iPad must not decode a chapter whole or introduce a standing media element.** An EM author chapter, `BOOK-HEIGHTS-09`, runs 2,955.631 s. Reuse the game AudioContext and gain/hold path. Read MP3 frame-aligned byte ranges into short decode windows. The checked review masters are 24 kHz mono, 96 kb/s. Probe the header/ID3 and CBR frame parameters before computing byte ranges, allow reservoir preroll, calibrate encoder delay to the chapter clock once, trim to exact samples, and join on that clock. Retain current and next windows only (≤8 s of source each). Split long sentences across windows. For non-unity rates time-stretch the short speech windows with pitch-preserving overlap-add in a local worker, carrying overlap across adjoining windows. Schedule the result at unity on the game context. Interpolate **source** position from scheduled input/output spans. The LAN HTTP path must work without AudioWorklet, SharedArrayBuffer or cross-origin isolation. Real voiced A/B, seams, rate, 206, interruption and heap are acceptance gates for this output.
4. On an unsupported MP3 layout, invalid slice or a server ignoring Range, abort the body within the cap. Offer the text and the course's existing streaming reader while that recording is unavailable in-game. Never silently substitute a different voice or an incorrect speed. For Conversation FM, full, short manifest clips use the current brief-clip output. When a hold lands, invalidate all queued starts, zero sound immediately for capture and release only after the last hold plus the existing resume delay.

## 3. A library you can walk into

**Maple Harbor Public Library.** Convert the unsigned, non-enterable `house3` on the south side of Oak Avenue, immediately west of Union Station. **Biblioteca de Puerto Colibrí** uses the corresponding cottage on Calle Hidalgo, west of the Terminal de Autobuses. Keep the building ID for decoration lookup, give it `loc:"library"`, its town's sign and a small civic frontage. Both checked `src/game/world/layout.ts` files place it at **(22,54)**, 12 m wide × 10 m deep, facing north. The footprint is x=16…28, z=49…59. The station starts at x=28. No expansion toward its wall. The north doorstep is (22,49). `town.ts::buildBuilding` puts its approach at (22,46.8). Oak/Hidalgo's road edge is z=42.5 and its 3.2 m sidewalk reaches 45.7. Carry a level path 3.3 m from sidewalk to door. Keep the existing east/west sidewalk continuous.

Choose the civic sign branch. Replace the residential front fence/rails and their collision boxes for this one site. Leave a clear 2.2 m approach. Keep the gable and porch light in MH. Use PC's cream-capped, flat-roofed stucco with a teal door, and retain the bougainvillea to the side. Retire the domestic number 31 at this facade (`es/game/world/theme.ts::houseFronts`). The PC bus bays are at x=31 and 57.5. Keep their turning/boarding area clear. Maggie's driveway is by houses 4 and 5 at x=96…102.5 in MH. The chosen cottage has no situation or outdoor drop-off. At review time, check the generated colliders, street lamps, signs and pedestrian paths again in both builds.

Register `library` as a residential district interior in `src/content/locations.ts` and its overlays. Use `📖` in the location metadata so `MapPlaceIcon` can render the existing `bookOpen` icon with the place name and ordinary walk/taxi destination. No invented NPC or compulsory objective. Approach and press the usual interaction key, tap the doorway, or use the controller's interact action. Reuse `Game.enterDoor → enterZone`, `getInterior("library")` and `exitInterior`, including transition fade, safe outside return and collision generation. On a local build without a shelf source, retain today's cottage and no dead door.

**Inside.** A 12 × 10 m single room uses the ordinary open-front cutaway. Spawn at (0,3.4) facing the back wall, exit at (0,4.8). From the door see the books to your left and the warm reading lamp to your right. A 1.6 m clear center aisle runs to a waist-high display on the back wall. Two low shelves and up to four face-out covers sit at x≈−4 and z≈−4. The rest are painted spines in one mesh. Two reading chairs at (2.7,−1.6) and (4.1,1.1) face into the room. Place a small side table and inset lamp beyond each chair's approach. Keep a clear 1.2 m walk-up in front of either chair. Use a two-sided book outline on the map and door plate, restrained enough to be read across the sidewalk.

- Approaching the face-out books offers **Browse books**. Tapping a face-out cover opens that book's detail. Interaction from the aisle opens the whole shelf. Show up to four distinct featured covers from the active course, in index order on first visit. Swap in the unfinished book on later entry. Spine rows share a single hit box. Face-out jackets each have one selectable plane. A two-book review shelf shows two jackets and fills the remaining space with ordinary spines. Selecting the reader while standing is allowed.
- Approaching a chair offers **Sit and read**. Walk to its free approach, then place the visible avatar with `seatY` and `setAnim("sit")` as in `src/game/gofish/mode.ts`. Outdoor `town.seats` belongs to ambient NPCs. Give library chairs their own two transforms and stand points. A small merged band and two earcups attach to the seated avatar's head. Imply private listening through the existing audio output. No hardware pairing. Keep headphones through reading and paused browsing, remove them on standing, zone change, reset or disposal.
- Sitting opens the reader at the current book or the shelf on a first visit. It never unpauses a paused source. Selecting Listen switches to Book FM once. If already listening, sitting or opening the reader preserves the sample position. Back returns to the chair. **Stand up** or movement with the overlay closed restores ordinary walking and leaves Book FM playing if it was on. Pause is available before standing. No forced stop on a walk to the door. On reload restore a safe standing point and the bookmark, never a dangling seat lock.
- The reader leads with chapter title, book name and a paper column of about 55–65 characters. A slim margin rule and warm wash track the sentence. Word underline follows only verified timings. Paired mode places the helper directly under its target and emphasizes the audible leg. In helper-only mode the helper is the primary row. **Word meanings** expands authored target units with small helper glosses. Use the `.il` / `.u` wrapping of `src/ui/Interlinear.tsx`. Its interactive component assumes EN/LT and a game phrase source. Extract its read-only unit layout or reuse its styles with explicit target/helper language tags. Use course tuples including multiword units, never split a gloss to fit audio.
- Tap a sentence to seek. If paused, reposition and stay paused. Manual scroll releases auto-follow and offers **Back to current line**. Avoid live-announcing a chapter word by word. **Open in course** checkpoints and pauses, then navigates only on user activation to the route in §1. Pass the validated course mode, canonical ID, no token, learner identifier or made-up timestamp. Use a same-tab course link with `referrerPolicy="no-referrer"` so Back returns to the game and its launch query stays private. Distinguish game/book progress from the course's independent reader position.

## 4. MH only · VOA Learning English (design only)

Reserve **101.7** on the talk dial behind `VITE_VOA_STATION=false` by default. This brief authorizes a design, no integration. Off means no dot, row, placeholder, network request, feed subscription or imported episode data. PC has no registration. If Tomas chooses to proceed later, the same picker can show an owner-curated episode list with program title, episode title, publication date and runtime. The selected episode shows its transcript if supplied, play/pause, previous/next line if timed, and the visible credit **learningenglish.voanews.com**. A simple editorial row can stand without artwork. Only explicitly reviewed VOA-origin narration, text and art qualify. Exclude AP, Reuters and other agency/syndicated or unattributed components, including photos, clips or passages inside an otherwise eligible story. Tomas chooses each episode and media source before activation. No episode titles, downloads, fetches or simulated broadcasts in this round.

## 5. Private LAN review Claude can set up later

The existing `~/claude-work/lan/serve.py` serves a built dist and handles ranges. Its special route covers voice MP3s in the named clip folder in this order — local dist → `map-<town>.json` → cache → `get.sh` on a miss. It has no course book routes, authorization session or song library. Logs identify 8340 MH, 8341 PC/EN, 8342 PC/LT and 8343 a separate listening review. **Never run/import that server, call its miss handler, proxy those ports, or write into `~/claude-work/lan/dist-*`.**

**Resident review recordings.** Each file below matches `audio_sha256.bilingual` in the named course checkout's `public/knygos/audio/timing/<chapter>.json`. They contain both complete spoken languages for each sentence. Use exactly these local bytes for the paired mode. Multiple books and two successive chapters allow real picker, seek, resume and autoplay reviews.

| Course | Read-only disk directory | Chapter files and exact sizes |
|---|---|---|
| EM | `~/phrases-audio/long/` | `BOOK-CANT-01.mp3` 4,821,741 B · `BOOK-CANT-02.mp3` 4,628,493 B · `BOOK-OZ-01.mp3` 10,937,133 B |
| SM | `~/claude-work/batch5/logs/phrases/dl/spanish-master/audio/v1/LT-ES/` | `BK01-01.mp3` 9,223,821 B · `BK01-02.mp3` 7,501,293 B · `BK04-01.mp3` 8,667,117 B |
| SME | `~/claude-work/batch5/logs/phrases/dl/spanish-master/audio/v1/EN-ES/` | `BK01-01.mp3` 9,145,773 B · `BK01-02.mp3` 7,486,893 B · `BK04-01.mp3` 8,733,069 B |

The same directories also hold a complete story for each review shelf. EM has `TOM-001.mp3` (2,237,229 B). The SM and SME folders contain `HIS-SG01.mp3` (4,750,605 B and 4,766,157 B, respectively). Each matched its own `public/stories/audio/timing/<id>.json` bilingual hash. Include these items in the Stories tab.

The following paired source documents are measured in bytes.

| Under `public/knygos/` | EM · BOOK-CANT-01 | SM · BK01-01 | SME · BK01-01 |
|---|---:|---:|---:|
| `index.json` | 73,352 | 104,385 | 113,428 |
| `data/<id>.json` | 20,945 | 92,059 | 97,609 |
| `audio/timing/<id>.json` | 21,278 | 55,645 | 41,283 |
| `audio/word-timing/<id>.json` | 11,284 | 12,099 | 12,099 |

1. Build from Sol's future game worktrees into three **new**, scratch-only output directories under a review folder, one listener per game+course origin on **8700 MH, 8701 SME, 8702 SM**. LAN links will be `http://<Mac-LAN-IP>:8700/`, `:8701/`, `:8702/`. Specify strict ports, or choose three available ports through 8729 and record the actual links. Never kill a listener to free a port. Compile PC with `VITE_EDITION=es`. Set `VITE_LEARNER=lt` only for 8702. For this private profile, have the future review tool inject `VITE_BOOK_REVIEW=1`, the edition (`em-lt`, `sme-en`, or `sm-lt`), site root `/` and files root `/__files/<edition>`. Ordinary builds derive the course profile from the known `VITE_RADIO_FILES` root. This needs no change to a course exporter. No auth tokens or Internet origin in this profile.
2. A small standalone GET/HEAD server for each origin serves its own game build, a private in-memory **allowlist** mapping virtual routes to verified source files, and a trimmed catalog containing the listed review chapters and story. Preserve order, cover paths and IDs. It can expose further catalog metadata for a visual shelf test, with unsupplied chapters read-only. The owner's primary review list contains playable items only. Build the cover lookup from real 160/320 thumbnails. For game clips use existing game manifests and exact local paths from the LAN map/cache, read-only. E.g. `~/voice-repeats/dl/mh/e782a8ec2e1a.mp3` is 7,797 B and `~/puerto-colibri-voicing/audio-es/5475a050b12a.mp3` is 8,997 B. A missing clip returns 404. Map individual assets, never mount a home directory or course repo.
3. For single-language review, two resident Lithuanian-only files also match their courses’ helper timing hashes (EM `~/lt-only/en-knygos/mp3/BOOK-CANT-01.mp3` 1,517,613 B, and SM `~/lt-only/es-knygos/mp3/BK01-01.mp3` 4,425,165 B). For any missing mono master, derive a **review-only** recording with installed ffmpeg from the verified paired MP3. Decode once offline, select the matching language's cue sample intervals in source order, include the voiced PC title/intros, concatenate at source rate with the course's mono gaps, encode 24 kHz mono MP3 once. Emit the matching normalized cue clock with the new local version/hash, account for encoder delay and validate first/middle/last words by ear. For EM EN mirror the 0.55 s assembly. For PC match its mono timing sequence, using a fresh measured local timeline if trim or pauses differ. Never attach production hashes or timestamps to a different cut. Derived MP3/timing pairs live only in the private scratch review folder. Use the matching helper timing JSON for the two original LT files. Derive the SME helper from the EN-ES master. This lets Claude hear all three modes on the same transport using the two recorded languages.
4. Serve `audio/mpeg`, `image/webp` and JSON MIME types, actual `Accept-Ranges: bytes`, `206 Content-Range`, suffix ranges, `416` out of bounds, an empty HEAD body, bounded streaming and no directory listing. Keep all runtime reads on that origin. Reject traversal and arbitrary upstream URLs. Nothing calls R2, hydrates cloud-only placeholders, writes a course cache, or runs a course exporter. Production gets no review path aliases or media. For the handoff link, assert the exact course-relative href/mode in LAN QA using browser request interception. If a matching local course UI is already available, point the review link at that origin. No login or navigation to a learner site is needed for this check.
5. Claude verifies the links on a second device with Internet blocked. Check two covers per shelf, first and middle sentences in all three modes, two independent speeds, next chapter, seat → street continuity, and denied/unlisted paths. Compare SM and SME helper audio and text at the same line of BK01-01. Record local address, course layer, chapter IDs and checks in the owner handoff. Nothing in this plan starts a server.

## 6. Art direction, layout and language

| | Maple | Colibrí |
|---|---|---|
| Street and room | A converted neighborhood reading house. Navy fascia, small brass book plate and warm porch lamp. Inside, honey maple shelves, deep blue wool chairs, ivory walls and a red cloth bookmark on the display table. | A reading room on Hidalgo. Hand-painted cream lettering on a teal fascia, a coral door surround, warm plaster and a narrow tile border at the threshold. Inside, dark wood, woven teal chairs and a yellow reading lamp. Put the existing papel picado motif above the shelf, outside the text column. |
| Set and picker | Reuse maple's `--rs-body` navy, brass trim and cream dial. An inset cream card holds the cover. Its slim red ribbon marks the saved chapter. Cover casts one soft contact shadow. | Reuse colibri's deep teal glass, sun-yellow trim and coral needle. Covers sit against light sand with a single painted edge. Use a coral ribbon and a deep teal ink for text on paper. |
| Type and movement | Existing EB Garamond for title and story, Nunito for controls, author and helper text. Chapter numbers are tabular. The chosen cover rises 2 px in 140 ms and settles. Selected row and ribbon stay fixed through loading. | The radio name keeps its existing painted style. Use the same locally packaged text families and rhythm. Italic is reserved for titles. The cover gets the same restrained lift. Spanish accents and Lithuanian diacritics must clear line boxes. |
| Sound and touch | In either skin a deliberate book selection gets the existing synthesized `audio.sfx("soft", …)` at low intensity. Tuning uses the existing synthesized sweep. No sound on scrolling, focus, line highlighting or automatic page follow. Honor mute, master volume and capture holds for all UI sounds, including the tuning sweep. | Use the same sound vocabulary. Give touch selection immediate ink/ribbon feedback before waiting for cover or audio. Leave hit boxes still. |

The screen is a reading surface. Use one paper plane, one scroll region per pane and one primary action. Keep the real jacket uncropped. Reserve its aspect box before bytes arrive. A missing image gets a cloth-colored spine and the existing title in HTML. No generated pictures or downloaded fonts. Selected state uses a rule, weight and icon as well as color. Aim for 4.5:1 text contrast, 3:1 focus/selection boundaries and **44×44 CSS px** minimum targets. A/A+/A++ use the existing `settings.textSize` / `--scale` values **1 / 1.15 / 1.3**. Body 20/23/26 px, gloss and ordinary controls at least 14/16.1/18.2 px, line height 1.45–1.6. Let long translated labels wrap. At A++ switch crowded grids to rows before reducing type.

| Viewport | Set, selector, reader and town |
|---|---|
| **390×844** | Set stays in its existing phone position. Picker is a nearly full-height sheet with 12 px side insets, a compact Continue row, then two covers per row. Details replace the grid. Reader fills the sheet. Sticky top back/title and bottom transport frame a single scrollable paper column. Chairs and lamp remain visible in the room before opening. |
| **390×664** | Short set folds dial. Sheet uses available `100dvh` with safe-area padding. Continue becomes one row with a 56 px-wide cover. Use compact book rows (one per row at all sizes), collapse the detail jacket to 64 px wide. Keep the primary action and transport on screen. Settings scroll under a fixed Back. At A++ show one complete active sentence via scrolling, never clip its bottom. |
| **844×390** | The existing two-column set puts stations beside keys. Picker uses 34% left for selected cover/title, 66% for a scrollable list. Reader uses a 150 px side rail for back, title and transport, with the rest for paper. Side controls scroll at A++. The walking strip stays between joystick and jump and reserves a small translation button. |
| **1280×800** | Set remains beside the toolbar. Picker up to 880 px wide, covers in three columns with a 260 px detail pane (at A++ two columns). A selected chapter enters a centered reader up to 760 px wide. A quiet margin leaves a view of the chair and lamp. Escape returns to the same book on its shelf. |

**Less motion and focus.** Existing radio and camera use `prefers-reduced-motion: reduce`. Listen to changes. Remove lifts, sliding sheets, needle travel, EQ motion and camera easing. Keep a static current-line rule, immediate state swaps and instant scroll only to keep the active line visible. User scroll suspends following even in this setting. Respect pointer, keyboard, touch and reduced-motion preferences independently.

Extend `src/ui/gamepad.ts` surface registration (the existing radio priority is 50). Give talk detail/settings higher priority than their parent and keep tooltip, phone and conversation precedence. Only the top sheet is active. Use `data-pad-scope`, `data-pad-default`, `data-pad-back`, `data-pad-adjust` on native selects and native buttons for the same Tab order. Set underlying controls inert and include the overview's popovers in its inside-click boundary. D-pad/stick moves spatially, A chooses, B/Escape unwinds exactly one level, scrolling the actual pane as needed. Restore focus by stable item ID when a list rerenders. Reader scrolling never steals focus. Label icon buttons and expose toggle states. Keep time, glyph motion and automatic line changes out of live regions.

| Surface | Default and navigation order |
|---|---|
| Set | Focus tuned station on reopen. Logical order is Close → display action → five keys → Listening settings / Open reader / translation when applicable → Music/Talk → station rows. Choosing a bank focuses its selected or first available row. Music keeps its existing controls. |
| Shelf → detail | Continue when available, otherwise first book. Reach Back, Books/Stories, visible covers in reading order, then details. Detail focuses saved or first chapter. Back → selected book → chapters in order → primary action. On compact screens only the current pane takes focus. |
| Reader / settings | Initial focus Play/Pause, without playing. Back → current line/seekable text as one roving group → back to current line when shown → previous/play/next → word meanings → settings → open in course. Settings order is mode, relevant target/helper speed, autoplay, sleep, Back. Scene settings expose sleep only. At a chair the return target is Stand up. Standing returns focus to the world. |

**Phone budget.** Compare the same camera, quality, avatar, backing resolution and crowd seed before/after. Sample `renderer.info.render.calls`, triangles, textures and geometries at the same poses, warmed and on repeat visits. Historical `docs/RIDES.md` recorded MH Main Street 220, square 174, PC zócalo 102 and avenida Juárez west 115. Use the current branch at each pose as the baseline. Target **+0** calls on those four views, at most **+1** at the converted facade. Batch its sign into the existing sign/opaque geometry budget and spend a removed facade detail if necessary.

Build the room lazily through `getInterior`. Additional library furniture/featured covers/headphones together ≤**5 draw calls, 4 materials, 6,000 triangles** above an empty standard room. Budget the full visible room + seated avatar at **≤50 draw calls on low**. Use vertex-colored merged shelves, chair upholstery and opaque lamp bodies, one cover quad batch and one 512×512 RGBA atlas (1 MiB without mipmaps, ≤1.34 MiB with). No individual spine meshes, dynamic lamps, reflection capture, real-time lamp shadows or new per-frame prop animation. Allocate covers on entry. Dispose library-specific atlas/bitmaps on exit, rebuild on re-entry from small source images even though the base room is cached. Keep new room assets ≤4 MiB GPU including geometry and textures. Attach/remove only one headphone mesh. Fixed exterior sign is the only new texture cost allowed before entry, ≤128 KiB GPU or included in existing atlas.

No new chapter, cover, audio or scene data requests on town boot. First mobile shelf paint ≤6 small 160 px covers (largest indexed thumbnail here 11,602 B), ≤72 KiB of cover transfer, one selected 320 px cover on demand. Keep ≤10 decoded UI covers mounted, ≤4 MiB decoded UI images. Evict detail art if needed. One chapter's text, timings and optional word map in memory. Next chapter gets metadata only until the handoff. Strip subscribes on line/word change, no whole-HUD update per audio tick. Bound app-held talk PCM and processing buffers to **8 MiB**, with compressed range bodies to **512 KiB** in flight combined, including canceled work. Hidden reader stops animation frames. After ten entries/exits and ten seeks, require settled library allocation within one atlas of its starting level and no accumulating AudioContexts, DOM players, timers or detached textures. Aim for a 95th-percentile frame time ≤33 ms at 30 fps low quality and ≤2 ms added relative to the matched baseline.

### Copy ledger

Sol drafts from this single inventory. Claude checks in context, including accessible names, truncation and both PC layers. EN is American English, LT addresses the learner as **tu**, ES is Mexican and uses **usted** where addressing a stranger. PC signage and station names stay Spanish in both interfaces. On MH the physical names stay English. The UI uses the learner's language. The Spanish column also records the Spanish equivalent where no separate Spanish UI is shipped. For the two town-specific name rows the three columns are localized glosses. The painted name is the town's own. Use existing course titles, authors, language tags, dates, levels, actual line text, localized numbers, speaker names and existing Back/Close/power/map strings. Keep variable content out of translation keys. Other screens introduce no free-form marketing or instructional copy.

| Use | EN | LT | ES |
|---|---|---|---|
| MH library name / map meaning | Maple Harbor Public Library | Meipl Harboro viešoji biblioteka | Biblioteca Pública de Maple Harbor |
| PC library name / map meaning | Puerto Colibrí Library | Puerto Kolibrio biblioteka | Biblioteca de Puerto Colibrí |
| Station name · books | Book FM | Book FM (MH) / Libros FM (PC) | Libros FM |
| Station name · scenes | Conversation FM | Conversation FM (MH) / Conversaciones FM (PC) | Conversaciones FM |
| Station description · books | Audiobooks and stories | Garsinės knygos ir istorijos | Audiolibros y relatos |
| Station description · scenes | Conversations around town | Miestelio pokalbiai | Conversaciones del pueblo |
| Station banks | Music / Talk | Muzika / Laidos | Música / Programas hablados |
| Collection tabs | Books / Stories | Knygos / Istorijos | Libros / Relatos |
| Shelf open / world interaction | Browse books | Rinkis knygą | Explorar libros |
| Scene picker | Choose a scene | Pasirink pokalbį | Elegir una conversación |
| Section title | Chapters | Skyriai | Capítulos |
| Chapter label | Chapter {n} | {n} skyrius | Capítulo {n} |
| Chapter 0 | Introduction | Įžanga | Introducción |
| Continue / resume card | Continue listening | Klausykis toliau | Seguir escuchando |
| Fresh start | Start listening | Pradėk klausytis | Empezar a escuchar |
| Replay completed item | Listen again | Klausykis dar kartą | Volver a escuchar |
| Completed chapter | Finished | Išklausyta | Terminado |
| Current item state | Listening now | Dabar klausaisi | En reproducción |
| Bookmark accessible value | {percent} complete | Išklausyta {percent} | {percent} completado |
| Book chapter completion count | Chapters finished · {done}/{total} | Išklausyta skyrių · {done}/{total} | Capítulos terminados · {done}/{total} |
| Open reader | Open reader | Atverk skaityklę | Abrir el lector |
| Chair interaction | Sit and read | Prisėsk paskaityti | Sentarse a leer |
| Leave chair | Stand up | Atsistok | Levantarse |
| Play / Pause | Play / Pause | Klausytis / Pristabdyti | Reproducir / Pausar |
| Back / forward transport | Previous line / Next line | Ankstesnė eilutė / Kita eilutė | Línea anterior / Línea siguiente |
| Strip toggle | Show text | Rodyti tekstą | Mostrar el texto |
| Translation action | Show translation / Hide translation | Rodyti vertimą / Slėpti vertimą | Mostrar la traducción / Ocultar la traducción |
| Reader gloss switch | Word meanings | Žodžių reikšmės | Significado de las palabras |
| Reader following | Back to current line | Grįžk prie skaitomos eilutės | Volver a la línea actual |
| Reader line accessible action | Go to line {n} | Pereik į {n} eilutę | Ir a la línea {n} |
| Listening sheet | Listening settings | Klausymo nustatymai | Ajustes de audio |
| Mode group | Listen in | Įrašo kalba | Idioma del audio |
| Languages and strip tags | English / Lithuanian / Spanish | Anglų / Lietuvių / Ispanų | Inglés / Lituano / Español |
| Single-language choices | English only / Lithuanian only / Spanish only | Tik angliškai / Tik lietuviškai / Tik ispaniškai | Solo inglés / Solo lituano / Solo español |
| Paired · EM | Lithuanian, then English | Lietuviškai, tada angliškai | Lituano y luego inglés |
| Paired · SM | Lithuanian, then Spanish | Lietuviškai, tada ispaniškai | Lituano y luego español |
| Paired · SME | English, then Spanish | Angliškai, tada ispaniškai | Inglés y luego español |
| Rate labels | English speed / Lithuanian speed / Spanish speed | Anglų kalbos greitis / Lietuvių kalbos greitis / Ispanų kalbos greitis | Velocidad del inglés / Velocidad del lituano / Velocidad del español |
| Rate value | {rate}× | {rate}× | {rate}× |
| Next chapter toggle | Play next chapter | Leisti kitą skyrių | Reproducir el siguiente capítulo |
| Timer | Sleep timer | Išjungimo laikmatis | Temporizador de apagado |
| Sleep choices | Off / 15 min / 30 min | Išjungta / 15 min. / 30 min. | Desactivado / 15 min / 30 min |
| Sleep boundary | End of chapter / End of story / End of scene | Skyriaus pabaigoje / Istorijos pabaigoje / Pokalbio pabaigoje | Al final del capítulo / Al final del relato / Al final de la conversación |
| Reader handoff | Open in course | Atverk kurse | Abrir en el curso |
| Shelf load | Opening the shelf… | Atveriama lentyna… | Abriendo la estantería… |
| Item load | Finding your place… | Ieškome, kur sustojai… | Buscando el punto de lectura… |
| Empty shelf | The shelf is empty. | Lentyna kol kas tuščia. | La estantería está vacía. |
| Empty scenes | There are no scenes to play. | Šiuo metu nėra pokalbių. | No hay conversaciones disponibles. |
| Source unavailable / retry | The audio couldn't start. / Try again | Nepavyko paleisti įrašo. / Bandyk dar kartą | No se pudo reproducir el audio. / Volver a intentar |
| Text-only action | Read the text | Skaityk tekstą | Leer el texto |
| Catalog failure | The books couldn't load. | Nepavyko įkelti knygų. | No se pudieron cargar los libros. |
| PC scene list language | Mexican Spanish | Meksikos ispanų kalba | Español de México |
| Future MH station name / description | VOA Learning English / English programs | VOA Learning English / Laidos anglų kalba | VOA Learning English / Programas en inglés |
| Future episode list / action | Episodes / Choose an episode | Laidos / Pasirink laidą | Episodios / Elegir un episodio |
| Future episode source credit, verbatim | learningenglish.voanews.com | learningenglish.voanews.com | learningenglish.voanews.com |

The UI may compose a button's accessible name from its localized action and the item title. Use locale number formatting for speed and percent (e.g. LT 0,75×). Each slash-separated entry above names distinct localized labels. Resolve them by role, never by slicing a displayed translation.

## 7. Build jobs for Sol and review shots for Claude

Work in local game feature worktrees. Keep each numbered job a reviewable change, normally 100–300 implementation lines plus focused tests and copy data. New filenames below are proposed. Add code behind a local talk-source configuration until its public entry point passes. Each job ends with a usable game. Do not run either course exporter, push branches, publish previews or edit the review trees. The plan itself does not implement these jobs.

**Gate on every job.** From the applicable game worktree run `npm run typecheck` (tsc --noEmit), the named new Vitest cases via `npm test -- <test-file>`, and the existing `tests/radio.test.ts` and `tests/radio-spots.test.ts` on MH. On PC run the applicable existing and new cases in the Vite Vitest projects `en`, `es`, `es-lt`. Put layer-specific tests under the matching include directories. At each town's completion run full `npm test`, a local Vite build and the relevant radio/gamepad browser scripts. Tests use local bytes or deterministic fixtures. Network requests to public hosts fail the review. Claude checks keyboard + touch in Chromium, WebKit for audio/focus, and a real iPhone for capture/volume when one is available. Capture screenshots locally in the owner's review area, outside the game and courses. Label by job, layer, state, viewport and text size. For the early jobs, capture the specified diagnostic screenshots in a test-only local harness or browser tools.

### Maple Harbor

#### M1 · Course adapter and cover lookup

**Files** · new `src/radio/books.ts`, `src/content/bookSource.ts`, `tools/read-book-covers.ts`, `tests/book-source.test.ts`. Read the two EM indexes, derive metadata, edition, stable IDs and cover URLs. Fetch one selected chapter/story on demand. Normalize breaks, sentence/word tuples and true target/helper tags. Build course-relative reader links and signed Worker URLs under the configured origin **and prefix** only. Honor free JSON selection. Expose `catalog → item → cues` as pure/testable steps. The existing radio has no new stations yet.

- **Vitest** · BOOK-CANT-01, an easy Gatsby chapter with unsuffixed internal ID/audio filename, TOM-001, missing art/words, malicious or lookalike URL, wrong types, 401 versus 404. Check all listed book IDs have 160/320 lookup entries. Store only public cover identifiers in game source.
- **Browser check** · visit town with and without adapter configuration and verify zero new book requests. Use a local test harness to open the same chapter twice with just one in-flight request.
- **Screenshot** · clean town and filtered Network panel, 1280×800.

#### M2 · Shared player and progress

**Files** · new `src/radio/talkPlayer.ts`, `src/radio/talkProgress.ts`, `tests/talk-player.test.ts`, `tests/talk-progress.test.ts`. Implement §2's state transitions and storage against an injected clock/output. Include per-leg rates, exact seek/restore, pending requests, held/paused distinction, sleep priority, edition/book boundaries and schema validation. Scene and story items may use a single chapter slot. No UI-owned players.

- **Vitest** · pause/reopen mid-helper, mode switch while paused, sleep racing with `ended`, nested holds, stale load resolving after station change, last chapter, replay completion, denied/corrupt storage, two books, merge two tabs. A chapter jump cannot write the old offset into the new chapter.
- **Browser check** · in the test harness attach two views, pause in one, reopen the other and reload.
- **Screenshot** · both subscribers on the same sentence with identical paused time, 390×844.

#### M3 · Real chapter streaming on the HTML path

**Files** · `src/radio/output.ts`, new `src/radio/bookOutput.ts`, `src/radio/bookTiming.ts`, `tests/book-output.test.ts`. Implement native Range-capable streaming, dedicated mono recordings, media clock and pitch-preserving rates. Derive EM EN timing and validate measured switch windows. Keep the song transport's skip tolerance and fades intact. Manage authorization retries and canceled `loadedmetadata/play/ended` events. Support cue excerpts of mono recordings when a bilingual rate switch cannot be placed safely.

- **Vitest** · first/mid/last cue at both rates, seek within 1 second, cue-boundary switch, stale token reread, missing word map, two rapid mode changes, late background timer and autoplay refusal.
- **Browser check** · stream the hash-matched EM sample in local harness, hear EN-only, LT-only and both, change only the second language's rate, seek across a chapter and listen through a sentence boundary.
- **Screenshot** · first pair, independent rates and media clock, 844×390.

#### M4 · Bounded iOS decoding

**Files** · new `src/radio/mp3Windows.ts`, `src/radio/bookBufferOutput.ts`, `tests/book-windows.test.ts`. Honor the existing iOS output selection. Parse MP3 header/ID3, frame bounds and gapless delay, request short windows with pre/postroll, trim and schedule them on one game context. Read Xing/VBRI seek information for variable bitrate where present and validate local frame alignment. Cancel orphaned windows on seeks and holds. Never feed a full chapter to `BufferOutput`. Keep the new source hidden on the device until M5 passes. The harness for M3–M5 can serve the listed local MP3s by exact path with Range support.

- **Vitest** · frame/preroll math, last partial window, 206/suffix/416, 200 response to a range, malformed header, long cue split, disposal and 30 rapid seeks under the memory cap.
- **Browser check** · WebKit's device branch, first/middle/end of a long local recording, hearing no duplicated prefix or missing final syllable. Compare decoded window boundaries to a continuous reference on desktop. Target ≤40 ms clock error.
- **Screenshot** · byte ranges and peak live buffer sizes halfway through a chapter, 1280×800.

#### M5 · iOS speech rate and audio focus

**Files** · new `src/radio/speechTempo.worker.ts`, `src/radio/bookBufferOutput.ts`, `src/radio/index.ts`, `tests/book-tempo.test.ts`. Carry overlap and clock mapping across windows for pitch-preserved speech. Yield between preparations and stop sound immediately on mic capture. Wire both book output variants and existing short-clip output into radio/bed/voice/capture holds, hidden-page behavior, volume/ducking and Media Session. Session ownership covers tuning sweeps too.

- **Vitest** · unity passthrough, duration and stable pitch on tone/voiced fixtures across rates, carry overlap without repeats, compensation at rate boundary, two holds released in reverse order, mic during decode, volume zero, no late play after manual pause.
- **Browser check** · listen to beginning and end of words at 0.75× target and 2× helper, then Book → NPC → mic → NPC → Book on WebKit and device. Check voice volume, repeated prefixes, both speeds and the 8 MiB limit. Record audible/device findings.
- **Screenshot** · held transport and preserved sentence, 390×664.

#### M6 · Offline review source

**Files** · new `tools/review-books.py`, `tools/review-book-audio.py`, `tests/book-review-source.test.ts`. Implement §5's explicit allowlist, range serving, curated index and optional scratch-only mono derivation. Run the owner review on 8700 first. Keep local metadata and local versions together. Exclude the review resolver from learner builds. A Playwright route fixture may simulate a 401 or 404. All three listening modes must use real narration. For this job the owner link opens the test harness. Point it at the ordinary game entry as soon as the picker is available in M8.

- **Vitest** · index membership, normalized source URLs, Range/HEAD lengths, miss/traversal, missing local data and scratch paths. Validate checked paired hashes plus duration and cue consistency of each derived file. Audio time at last sentence within 100 ms.
- **Browser check** · phone opens the owner link on Wi-Fi with external network blocked. Compare modes and play CANT-01 → 02.
- **Screenshot** · real title, cue and local range response, 390×844.

#### M7 · Talk bank in the existing set

**Files** · `src/content/radio.ts`, `src/radio/{index,radio}.ts`, `src/ui/Radio.tsx`, `src/ui/radio.css`, `tests/radio-talk.test.ts`. Add the discriminator, availability and dispatch, bank switch, five-key mapping, title/position display and current-line strip. Set is the owner of launch/dismissal. Keep the book entry configuration-gated until M8's picker is present. Exercise it with an injected test selection. Conversation FM appears only after M10 supplies verified scenes. VOA is absent even when music fails.

- **Vitest** · song-only legacy save/initial station, local talk with no song list, empty favorites, song/spot end never enters a book, source handoff invalidates late song/spot, text on/off and only translation button intercepts taps. Existing song hearts and `places` survive.
- **Browser check** · compare original music layout, tune a fixture book, press R, use lock-screen keys, dismiss/tap outside, open a conversation and return.
- **Screenshot** · MH music bank 1280×800 and a talk line over movement controls 844×390.

#### M8 · Cover and chapter picker

**Files** · new `src/ui/BookPicker.tsx`, `src/ui/books.css`, `src/content/bookCopy.ts`, relevant entry in `src/ui/Radio.tsx`, `src/ui/gamepad.ts`, `tests/book-picker.test.ts`. Implement the §2 stack with shipped covers, two collections, one primary action and stable return focus. Show loading, empty, offline and finished states from the ledger. Enable Book FM for configured local builds. No art fetched just by switching the bank.

- **Vitest** · Continue ordering, fresh/started/completed chapters, introduction and standalone story, image fallback, catalog failure/retry, focus-return ID after a list reorder, radio dismissal with an open child. Check accessible names and states.
- **Browser check** · first run, begin a chapter, browse another book without changing playback, return to Continue, expand a long title at A++, navigate only with D-pad/B.
- **Screenshot** · returning shelf 390×844, chapter list 390×664 A++, cover-and-detail at 1280×800.

#### M9 · Reader, settings and sleep

**Files** · new `src/ui/BookReader.tsx`, `src/ui/TalkSettings.tsx`, shared styles in `src/ui/books.css`, the read-only unit layout beside `src/ui/Interlinear.tsx`, `tests/book-reader.test.ts`. Launch from the radio before the building exists. Implement sentence focus, verified word highlighting, full translation and word meanings, independent rate controls, timed/end-of-item sleep, follow/rejoin, local preference persistence and course navigation. Use §6 focus order and copy. Avoid creating a second audio element on view changes.

- **Vitest** · multiword gloss at a token boundary, blank gloss and missing timing, preserved paragraph break, manual scroll and rejoin, helper-only display, paused tap-to-seek, end-of-item sleep versus autoplay, exact course href with legacy mode and clean referrer. Add A/A+/A++ render cases.
- **Browser check** · listen with one speed changed, switch views midword, page back after intercepted course handoff, rotate the screen while paused.
- **Screenshot** · paired interlinear page 390×844, settings at 390×664 A++, paper/rail 844×390, reduced-motion reader 1280×800.

#### M10 · Conversation FM

**Files** · new `src/content/radioScenes.ts`, `src/radio/scenes.ts`, `src/ui/ScenePicker.tsx`, `src/ui/Radio.tsx`, `tests/radio-scenes.test.ts`. Author routes for the three named MH situations. Resolve one scene lazily, including the recorded coach part, from existing game data. Enable only validated programs. Keep a scene bookmark independent of books. Share transport, translation button, source switching and sleep.

- **Vitest** · opening clip key/duration in §2, every included turn resolves to a manifest key, coherent speaker order, alternate `say` string, missing clip and missing translation handling, stale cue after skip, translation resets on advance, no microphone/session/score interaction.
- **Browser check** · hear a complete café order and reply, reveal one translation, join an actual NPC conversation and return. Replay it from its list.
- **Screenshot** · scene selector 390×664 and café line with translation over town 844×390.

#### M11 · MH library shell and furniture

**Files** · `src/content/locations.ts`, `src/game/world/{layout,town,interiors}.ts`, new `src/game/world/libraryRoom.ts`, `src/ui/Panels.tsx` (map detail), `tests/library-layout.test.ts`. Convert only the §3 parcel. Keep exterior draw/collision budgets. Use `room()`, merger/vertex colors, map location lookup and standard enter/exit. Build the right-hand chair nook and back-left display, including the lazy atlas and capped clearances. Gate the new destination with the same capability as the shelf. Expose the existing picker at the display so the room immediately works.

- **Vitest** · unique location/door, footprint/approach and town nav reachable from the sidewalk, exit spawn walkable, shelf/chairs have valid approaches, current collision asset agrees with generated geometry (`tests/town-collision-cache.test.ts`), material/triangle bounds and disposal.
- **Browser check** · walk there from Union Station, tap/press through door, browse a real cover, return outside, repeat ten times. Measure at §6's matched cameras.
- **Screenshot** · street sign with station at 1280×800, interior from doorstep 390×844, visible featured covers 844×390.

#### M12 · Chair and headphone handoff

**Files** · new `src/game/library/readingSeat.ts`, hooks in `src/game/Game.ts`, `src/game/kit/modes.ts` and the typed HUD prompt in `src/state/store.ts`, `src/ui/Hud.tsx`, `src/ui/BookReader.tsx`, `tests/reading-seat.test.ts`. Bind both chairs to approach/sit/stand and library reader. Preserve avatar pose, head accessory, camera and input ownership through dismiss, zone change or interruption. Keep the avatar visible in the chair. Restoring a game starts on clear ground. Finish MH review before carrying the feature across.

- **Vitest** · both chair transforms, safe stand with blocked first approach, double-tap during seating, pause before sitting, stand during load, restoring/canceling camera and accessory on reset, and one talk clock before/during/after reading.
- **Browser check** · walk → shelf → chair → book → walk with Book FM, then music and an ordinary NPC. Check head fit on both avatar sizes, controller return and reduced motion.
- **Screenshot** · seated side view with headphones 1280×800, same chapter in chair reader 390×844 and walking strip 390×844. Compare sentence/elapsed across all three.

### Puerto Colibrí port · shared engine, two independent courses

Carry the reviewed MH changes onto a **local PC feature branch/worktree**. Resolve against PC's actual edition overlay and town builder. The specified PC review checkout remains read-only. Port the engine once. Both language layers must pass each PC job before moving on. Finish with 3D.

#### P1 · Data, shared player and two offline origins

**Files** · `src/editions/es/content/bookSource.ts`, `src/editions/es-lt/content/bookSource.ts`, the small adapter extension in `src/radio/books.ts`, `tools/review-books.py`, `tests/es/book-source.test.ts`, `tests/es-lt/book-source.test.ts`. Configure SME 8701 first and SM 8702 alongside it. Apply §1's field/Worker rules and §5's matched masters. Use target `es`, helper `en` for SME, and target `es`, helper `lt` for SM. Keep the recording folder names uppercase. Keep the same shared player. Separate bookmark namespaces. Gate radio UI until P2.

- **Vitest in each project** · BK01-00 and 01, voiced title/intro/body with real IDs, mono clocks, two meanings of `lt`, EN-ES versus LT-ES, same ES recording content, SME requests through its own Worker only, unsigned app JSON, clean `/books` versus `/knygos` links. Run storage isolation test even if both profiles are forced onto the same test origin.
- **Browser check** · start BK01-01 in each, switch through all modes, check opening title and first paragraph by ear, trust the on-device clock at end of BK01-02.
- **Screenshot** · matched sentence in SME and SM test harness at 390×844, with mode/rates visible.

#### P2 · Colibrí set, shelf and reader

**Files** · `src/editions/es/content/radio.ts`, `src/editions/es/ui/strings.ts`, `src/editions/es-lt/ui/strings.ts` as required, shared `src/ui/{Radio,BookPicker,BookReader}.tsx` and CSS only for real cross-edition needs, `tests/{es,es-lt}/book-ui.test.ts`. Use PC's `L()/Lx()` conventions for LT-authored shared UI, with `EDITION.target/helper` for markup. Preserve current skin and Bilingüe FM availability in SME only. Use Mexican proper names in both layers. Enable configured Book FM via its English/Spanish and Lithuanian/Spanish paths. Nothing changes the course content.

- **Vitest** · no missing visible/ARIA strings, no literal helper/target reversal, EN versus LT glosses on the same Spanish unit, header accents, chapter-0 label, course URLs and SME-only music station. Run `tools/i18n-check.ts` using the repo's installed runner.
- **Browser check** · compare empty/new and returning shelf, per-language rates, reader and controller on both origins.
- **Screenshot** · SME returning shelf 390×844, paired settings 844×390, SM chapter list 390×664 A++, paired reader 1280×800. Repeat reader at 390×844 for a same-frame language comparison.

#### P3 · Puerto Colibrí conversation program

**Files** · new `src/editions/es/content/radioScenes.ts`, localized scene references in `src/editions/es-lt/content/radioScenes.ts` only if needed, `tests/{es,es-lt}/radio-scenes.test.ts`. Compose the three PC scenes from its situations/learner tables, MX voices, authored forms of address and existing coach replies. Reuse the verified Spanish recording for the same target utterance across both helper layers. Enable Conversaciones FM. Resolve and listen to the complete Mexican exchange on both learner layers.

- **Vitest** · check Mariana's manifest key, every NPC/coach key, translated café reply in each layer, no new TTS or fallback to an MH line, missing clips leave the chooser usable. All source navigation and bed/mic holds still pass.
- **Browser check** · play the café and ticket scenes in both layers, tap translation, listen through the last reply and switch back to the book.
- **Screenshot** · SME scene with English translation 390×664, same SM scene with Lithuanian translation 390×664, controller-focused picker 844×390.

#### P4 · Biblioteca de Puerto Colibrí, performance and sign-off

**Files** · `src/editions/es/game/world/theme.ts`, `src/editions/es/content/locations.ts`, the corresponding es-lt location layer, shared library geometry/seat wiring in `src/game/world/{layout,town,libraryRoom}.ts` at PC integration points, `tests/{es,es-lt}/library-layout.test.ts`. Activate the approved Calle Hidalgo frontage and reading room. Use up to four distinct small covers from the active course. Keep the bus terminal, curb, taxi/walk destinations, overhead cables, visitors and map legible. No duplicate room builders.

- **Vitest** · projected door/approach, both bus bays, clean chair exit, walking navigation and map names, both course atlases, zero library allocations before first visit, stable counts on ten returns, same session after standing. Run both full locally built PC profiles plus baseline MH tests.
- **Browser check** · walk from the terminal, browse, sit, change speed while paired, follow the chapter into the street. Compare every §6 viewport at A and A++, with a separate A+ pass and reduced motion in both layers.
- **Screenshots** · exterior beside the Terminal de Autobuses 1280×800, room with lamp and jackets 844×390, seated SME reader 390×844, seated SM reader 390×664 A++, same-time walking strip in each. Include profiler readings and actual iPhone/desktop distinction with the owner handoff.

## 8. Decisions for Tomas and remaining proof

- **Site choice.** This design converts the cottage west of each station. Tomas can judge the frontage from a normal approach and the sightline to the lamp from the doorway. No town expansion or conversation relocation is needed.
- **Listening rhythm.** Start with helper then target, target 0.75×, helper 1×, autoplay within a book, and sleep off. These defaults use the course reader's recorded order and base speeds. Tomas can assess the transition from chair to street with a real chapter before the PC port.
- **Needs the owner.** **0 new voices, 0 new pictures.** VOA stays a design until Tomas chooses whether to proceed and approves a wholly eligible episode. No Worker change is needed for the planned library or either talk station.
- **Proof still due during implementation.** Listen on a physical iPhone after repeated microphone handoffs, with mixed rates and a long chapter. Measure the actual room and verify local review seeks against the sampled MP3s. The source checks establish formats and access rules. Production reachability, measured draw calls and device audio quality are separate build-review results.
