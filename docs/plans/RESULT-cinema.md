# Cinema review build

**Try it.** Enter the Maple Harbor Museum of Art from Main Street. Walk to the three red seats facing the film title on the west face of the exhibition partition. Press E or controller X, or tap the seat prompt. The English title **Lunch on the Fly** carries the Lithuanian subtitle *Nuskridę pietūs*. Pause or skip from the on-screen controls. Esc or controller B returns to the aisle. Taking a seat again starts a fresh screening.

## On screen

| Film time | Action |
| --- | --- |
| 0–5 s | Title over the harbor |
| 5–14 s | The lighthouse keeper holds up his sandwich under a watchful gull |
| 14–23 s | The gull dives and streaks away with the sandwich |
| 23–36 s | The keeper hurdles three fish crates |
| 36–47 s | The gull reverses course while the keeper skids past |
| 47–59 s | The sandwich flies loose and the keeper lunges for the catch |
| 59–67 s | The gull lands on his head, then hops to the dock |
| 67–72 s | They split the sandwich |

The projector uses Maple Harbor’s lower-detail character mesh, the lighthouse island’s gull and tower, and a vertex-colored dock set. An original plucked melody follows the action on the game’s effects bus. Playback holds the radio, freezes while the page is hidden, and releases its scene and music on exit. The game draws the film directly with the town renderer at up to 24 pictures per second. Reduced motion cuts between eight still compositions. Neither mode needs a video decoder, film download or recording.

## At the ticket window

The [situation draft](CINEMA.md) uses Ben in Maple Harbor and Iván in Puerto Colibrí, with four routes and seven hint groups per edition. It includes a Mexican Spanish source with English help and the keyed Lithuanian helper table. The [editorial ledger](WORDS-cinema.md) covers the film and the draft. Each edition has 33 missing voice takes and six reusable coach clips, checked by voice, speed and spoken text. The future MH end-card offer uses the same cinema mode as the seat.

## Files

| Work | Files |
| --- | --- |
| Program, composition, score, entry and teardown | `src/game/cinema/{program,film,mode,state}.ts` |
| Room, reusable animal and game loop | `src/game/world/{interiors,gull,lighthouseIsland}.ts`, `src/game/Game.ts` |
| Interaction and sound ownership | `src/game/kit/modes.ts`, `src/state/store.ts`, `src/game/audio.ts`, `src/radio/radio.ts` |
| Title and controls | `src/ui/{Hud,Cinema}.tsx`, `src/ui/cinema.css` |
| Regression coverage | `tests/cinema.test.ts` |
| Program decision, draft and copy review | `docs/plans/{TOWN-NEXT,CINEMA,WORDS-cinema,RESULT-cinema}.md` |

## Verification

| Check | Result |
| --- | --- |
| TypeScript and production build | `npx tsc --noEmit` and `npm run build` passed |
| Cinema, mode registry, controller and radio tests | 91 tests passed across four files |
| Full `npx vitest run` | 1,693 tests passed across all 123 files in 422.02 seconds |
| Draft routes, outside the live catalogs | Five checks per edition passed against its own conversation engine. All four routes reached the ticket handoff with the expected total. Both accepted a typed order with numerals. |
| Desktop Chromium with SwiftShader, low quality | Keyboard, touch-sized controls, simulated standard controller, pause/resume, skip, hidden-page pause and natural completion. The 72-second clock finished in the museum and released the radio. A Web Audio analyser detected the synthesized score on the effects bus. |
| Phone-size playback and cleanup | 844×390 and 390×664. The opening action used 8 draw calls and 7,299 triangles. During a reduced-motion shot the renderer frame count held steady. After each of ten complete entry/skip cycles, renderer memory returned to the warm museum count of 33 geometries and 19 textures. |
| Approach and accessibility | The normal walking path from the museum doorway reached the seat prompt. At 1.35× text, all controls stayed on screen and at least 44×44 CSS pixels at 390×844, 390×664, 844×390 and 1280×800. Tab and Enter reached Skip. |

## Left for review

The owner and language editors can review the dialogue, helper text and exact recording list before scheduling any voice work or registering either conversation. The ticket reward can be exercised end to end once the conversation is live. Physical-phone frame timing and a hardware-controller playthrough remain for device sign-off.
