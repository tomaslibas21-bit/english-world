# English World · Maple Harbor

A browser game for Lithuanian adults practising spoken **American English**. You arrive at a small, friendly American coastal town, walk around, go into places and talk with the people there. The 41 conversations cover 35 situation songs (31–35 and 62–91) and go well beyond their lyrics.

- **Say it your way.** People react to what you actually said. They fill in details you gave, don't ask again for them, accept short answers, keep negation ("I *don't* want a cappuccino") and ask when something is unclear.
- **Lithuanian suggestions say _what_ you could say; English hints show _how_.** Clicking a suggestion never answers for you.
- **Supports you can switch on and off at any time**: the Lithuanian interlinear translation (following the bilingual-book rules), IPA, hints and suggestions. There are no levels.
- **No live AI and no metered services.** Every conversation is prepared in advance. The voices are pre-recorded files.

## Running

```bash
npm install
npm run dev          # http://localhost:5188
npm run build        # static site in dist/ (upload anywhere)
```

Useful checks:

```bash
npm test                         # engine unit tests (vitest)
npm run check:content            # every situation: grammar, interlinear units, merges, NLU tests, simulated conversations
npx tsx tools/check-content.ts s72 --verbose   # one situation
npx tsx tools/sim.ts s72-cafe    # print a simulated conversation
npx tsx tools/coverage.ts --fails                      # practice sentences (tests/corpus): how many are understood
npx tsx tools/coverage.ts --dir=tests/heldout --half=even   # blind learner sentences (never tune on these)
npx tsx tools/contexts.ts s72 --out=tests/contexts     # every point where the learner answers (for writing test sentences)
```

Rebuilding generated assets (development only, never at runtime):

```bash
npm run ipa                      # src/generated/ipa-lexicon.json from the CMU dictionary + overrides
npx tsx tools/build-vocab.ts     # src/generated/known-words.json: real words never "auto-corrected" into others
npm run audio                    # public/audio/*.mp3 with Kokoro-82M, locally (needs ffmpeg); resumable
npm run audio -- s72 --dry       # count what would be generated for one situation
```

The first `npm run audio` downloads the Kokoro-82M ONNX model (about 320 MB) from Hugging Face into the local cache. After that, generation runs offline on the CPU at about 1.6 clips per second.

## Hosting

The build is a static site: about 5 MB of code, 22 MB of scene pictures (WebP) and about 190 MB of voice clips (about 21,500 files in `audio/`). No server is needed.

- **GitHub Pages (live).** The game is published at https://tomaslibas21-bit.github.io/english-world/ from the public repository `tomaslibas21-bit/english-world`. `.github/workflows/deploy.yml` builds the site with Node 22 on every push to `main` and publishes it in about a minute; the base path comes from the repository name. The steps, in Lithuanian, are in `docs/HOSTING.md`.
- **Inside English Master (the fluent-steps site, at `/zaidimas/`).** `npx tsx tools/export-fluent-steps.ts <fluent-steps checkout>` builds the game for `/zaidimas/` and copies it into the site's `public/zaidimas/` (the code, the pictures and the clip list: about 370 files).
  - The voice clips are served from Cloudflare R2: bucket `fluent-steps-audio`, folder `fluent-steps/game/audio/`, at https://audio.dvikalbesdainos.lt/fluent-steps/game/audio/. At about 21,500 files they exceed the 20,000-file limit of a site deploy. After `npm run audio` makes new clips, upload them there too.
  - Words saved in the game also go into the course's own flashcards (deck „Mano žodžiai“), and a home button („Kursas“) leads back to the course.
- **As a section of another site** (e.g. `https://your-site/game/`):

  ```bash
  GAME_BASE=/game/ npm run build        # then copy dist/ into the site's public/game/ folder
  ```

- **Voice clips somewhere else** (keeps the host site light): upload `public/audio/` to any static host or CDN and build with
  `VITE_AUDIO_BASE=https://…/audio/`.
- Other static hosts work too: Netlify, an ordinary web host, or Cloudflare (max 20,000 files per deployment, so only with the clips hosted elsewhere).
- Files from `public/` are always loaded through `import.meta.env.BASE_URL` (as in `src/game/audio.ts` and `src/ui/scenes.ts`), so the game also works under a sub-path.

Student instructions (Lithuanian): `docs/STUDENT-GUIDE-LT.md`.

## Controls

- Arrow keys or WASD to walk (camera-relative), Shift to run. Mouse: click the ground to walk there, click a person or door to go to it, drag to look around, wheel to zoom.
- **E** / Enter: talk or enter. **G**: walk to the current goal. **M** map, **J** journal, **P** phone, **Esc** settings.
- In a conversation: **Space** microphone on/off, **T** type, **H** hints, **L** Lithuanian, **I** IPA, **R** repeat, **Esc** leave.
- Touch: an on-screen joystick appears on touch devices; tapping works like clicking.

## How it works

| Folder | What is there |
|---|---|
| `src/convo/` | The conversation engine: normalizer (contractions, homophones, fillers, learner word forms), pattern grammar with full-coverage matching and learner tolerance (missing or extra small words, names used as address, safe fallback; see AUTHORING.md §5), NLU ranking with meaning-safety rules for negations, dialogue manager (steps, slot filling, pending questions, twists, memory), interlinear composer with Lithuanian agreement, IPA lookup, speech attempt |
| `src/content/` | One file per situation (`situations/sNN-*.ts`), shared intents and hints (`global.ts`), people (`npcs.ts`), places (`locations.ts`), the merge registry for interlinear units (`merges.ts`) |
| `src/game/` | Three.js world: procedural town and interiors, characters, camera, collisions, A* navigation, guidance trail, conversation sessions, audio |
| `src/ui/` | React overlay: conversation panel, HUD, map, journal, phone, settings, phrasebook |
| `tools/` | Content validator, simulator, IPA builder, audio builder, index generator |

**Adding or changing a situation:** read `AUTHORING.md` (the authoring guide) and `SITUATIONS-SPEC.md`. Create `src/content/situations/sNN-name.ts`, run `npx tsx tools/gen-index.ts`, then `npx tsx tools/check-content.ts sNN` until it passes, then `npm run ipa` and `npm run audio -- sNN`. Lines without a pre-generated clip still work: the game falls back to the browser's built-in speech synthesis for them.

## Looks

- **World styles (kept for later, not in the published game).** Besides the default block look, three trial looks for the 3D town are built in code: **Animacija** (bright cartoon with outlines and big round heads), **Iliustracija** (the teal, orange and cream palette of the illustrated scenes) and **Tikroviškas** (natural proportions, realistic materials and reflections). Published builds show only the block look (owner's decision, 28 Sep 2026). To try the others, run `npm run dev` (Settings → *Pasaulio stilius*, or `?style=toon`, `storybook`, `realistic`), or build with `VITE_WORLD_STYLES=1`. Code: `src/game/style.ts`, `worldStyles.ts`, `styleScene.ts`, `world/styled.ts`, `characters/`.
- **Illustrated scenes.** In all 41 conversations, calls included, the game shows one picture per phase instead of the 3D view (265 WebP pictures in `public/scenes/`, about 22 MB; full-quality originals are kept locally in `.art-originals/`, which isn't published). Settings → *Iliustruotos scenos* turns this off. See `docs/SCENE-ART.md`; `npx tsx tools/scene-walk.ts` checks every scene against the simulated conversations.
- **Icons.** Hand-drawn SVG icons (`src/ui/icons.tsx`), with no emoji anywhere in the interface.

## Learning features

- **Light mode** (`src/game/LightGame.ts`, `src/ui/LightHome.tsx`). The learner picks "Lengvas režimas" or "3D miestas" on the start screen or in Settings; phones default to light.
  - Light mode has no 3D town: the home screen is the situation list, and a tap starts the conversation with its pictures.
  - three.js is a separate download that only town mode fetches (`src/game/gameRef.ts` holds the shared game reference).
  - The phone's back button closes the open conversation or panel.
- **"Ar norėjai pasakyti…?"** (`src/convo/suggest.ts`). When an answer isn't understood, the 1–2 closest model answers the engine would accept are offered. A tap, or "yes" / „taip“, uses them, and the words that didn't match are highlighted.
- **„Pakartok“.** Next to each example answer: listen, repeat, and see which words were missed. It's practice only, and it shares the conversation's microphone safely.
- **Word cards** (`src/state/cards.ts`, `src/ui/Cards.tsx`).
  - Tap any English word or phrase to save it, or the whole sentence, with its Lithuanian, IPA and source sentence.
  - Review them in Frazių knygelė → „Mano kortelės“: Leitner boxes with 1/2/4/8/16-day intervals, and a due-count badge on the phrasebook button.
  - Cards are stored in the browser under `english-world-cards-v1`, and can be exported as JSON for English Master.

## Speech input, network use and costs

The game itself makes **no paid or metered calls**. There is no AI model, no cloud TTS and no speech-to-text account behind it. What remains:

| Part | Where it runs | Cost to you |
|---|---|---|
| The game (HTML, JS, 3D, content) | The learner's browser | Static hosting only |
| NPC voices | Pre-generated MP3 files served with the site | Hosting storage and bandwidth |
| Understanding what the learner said | The game's own grammar engine, in the browser | Nothing |
| Turning the learner's voice into text | The **browser's** Web Speech API (see below) | Nothing for you; it's the browser vendor's service |

**Web Speech API: what "free" means here.** The site calls the browser's standard `SpeechRecognition` interface. The site owner has no account, no key and no bill. But the recognition isn't necessarily local:

- **Chrome (desktop and Android):** by default the audio goes to Google's speech servers. Newer Chrome versions can recognize **on the device** after a one-time language-pack download. The game asks for on-device recognition when it's available and shows an "Install on-device recognition" button in Settings. If it isn't available, Chrome uses the server.
- **Microsoft Edge:** uses Microsoft's online speech service.
- **Safari (macOS, iOS, iPadOS):** uses Apple's speech recognition, which runs on the device or on Apple's servers depending on the device and settings.
- **Firefox:** doesn't offer speech recognition. The game switches to typing.
- **iOS apps that aren't Safari** (Chrome or Firefox on iPhone) use WebKit. Support depends on the iOS version.

So recognition needs an internet connection in most browsers. Audio sent to Google, Microsoft or Apple is handled under their privacy terms, not by this site. The Settings panel says this in Lithuanian. Typing always works as a fallback. A recognition problem is shown as the game not hearing you, never as a learner mistake.

## Assets and licences

- **Voices:** [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) (Apache-2.0), run locally through `kokoro-js` during development. The generated clips can be used commercially.
- **Pronunciation (IPA):** generated automatically from the CMU Pronouncing Dictionary (primary pronunciations), with the story course's `ipa.py` convention and overrides. It's AI/dictionary-generated and wasn't checked against the recordings.
- **Lithuanian translations and glosses:** written with AI assistance following TOMAS-INTERLINEAR-v2 and LIBRARY-MINIMUM-UNIT-v3. They still need a native-speaker review (see "Known limitations").
- **Fonts:** Nunito, EB Garamond and Gentium Book Plus (SIL Open Font License), bundled through @fontsource.
- **3D:** everything is procedural (Three.js geometry), so there are no third-party models.
- **Scene illustrations** (`public/scenes/`): generated for this game with Nano Banana Pro through Higgsfield (see `docs/SCENE-ART.md`), and with ChatGPT for the calls, a few extras and the five conversations of songs 31–35 (see `docs/PICTURES-WANTED.md`). Any text in them was specified word for word and checked.

## Testing status

- **Automated:** `npm test` (engine unit tests); `npm run check:content` over every conversation. The content check covers grammar validity, interlinear unit counts for both address forms and both genders, registered merges, per-situation NLU tests (3,600+), scripted simulations on 12 random seeds each, and 80 random-order conversations each, checking that no handler crashes. The simulations are played by `tools/sim-play.ts`, the same way in every tool: each scripted turn is said when its turn comes (a stock answer covers only a question the script answers later), and a turn that is never said is reported, because it wasn't tested.
- **Understanding learner answers** (`tools/coverage.ts`). `tests/corpus/` holds about 11,600 practice sentences (every answer point of every situation: fluent, learner-style and short answers, plus meaning-flip traps); nearly all are understood and no trap is accepted. `tests/heldout/` is a separate **blind** set of about 4,700 sentences written without looking at the grammar; its even half was never used for tuning. On that half the original engine understood 58% correctly and the current one about 79%, with fewer traps accepted than before. The five newest conversations (songs 31–35) got their own blind sentences after they were written: 77% understood correctly, and 0 of 61 traps accepted. Don't tune patterns against `tests/heldout/`, or it stops being a fair measure.
- **In the game (browser):** every conversation was played end to end through the real session code (typed input), in its real place with its NPC present, including phone and video calls and world events (taxi rides, bus rides, boarding, items handed over). The towns, all interiors, the mobile layout and touch controls were checked visually.

## Known limitations

- **Speech recognition with a real microphone was not tested here.** The development browser has no microphone. The speech code (Web Speech API, on-device preference, timing, recovery) is ported from the Dvikalbės Dainos app and type-checks. Test it in Chrome, Edge and Safari on real devices.
- **Lithuanian glosses and translations need a native review.** They follow the bilingual-book rules and pass the structural checks. The authors' open questions are collected in `REVIEW-NOTES.md`.
- **IPA** is generated from the CMU dictionary and was not checked against the audio.
- **Voices are synthetic** (Kokoro). Clips are pre-generated for every line the enumerator can produce, including dynamic lines found by fuzzing. A rare combination without a clip is read by the browser's own voice. The player's name can't be pre-recorded, so lines that address the player by name are voiced without it ("Thanks, Rūta!" plays "Thanks!"). Hint examples that contain the name ("My name is Rūta") use the browser voice.
- **Hosting size:** about 18,300 small MP3 files (about 200 MB). Cloudflare allows at most 20,000 files per deployment (Pages, and Workers on the free plan; current Lovable sites deploy to Cloudflare Workers), so there the clips should live elsewhere (`VITE_AUDIO_BASE`). Netlify, GitHub Pages or any ordinary web host are fine.
- **Progress is saved per browser** (localStorage). There are no accounts and no sync between devices.
- **Performance** was checked only in the development browser. On slow computers, use Settings → Grafika → „Paprasta“.
