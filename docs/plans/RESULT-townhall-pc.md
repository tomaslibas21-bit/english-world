# Puerto Colibrí town hall passport

Ported from the final Maple Harbor implementation at `8369ceb9`. [Maple Harbor PR #50](https://github.com/tomaslibas21-bit/english-world/pull/50)

House 4 at (90, 54) on Calle Hidalgo is now the Palacio Municipal. The north door at (90, 49) opens from the level approach at (90, 46.8). The flat stucco façade has painted blue-green signage, the existing number 47 tile, a grille, planters and bougainvillea. Its map pin offers walking directions. The car seller’s driveway stays clear.

The 9 × 7 m hall uses terracotta tile and indigo cloth. Its doorway camera frames the open book, ink pad, stamp and bilingual instruction card on the 2.4 m counter. Tap **Abrir el pasaporte**, press **E**, or press controller **X** at the desk. **Back**, **Esc** and controller **B** return from the proof to its stamp, then to the counter. The book paginates at eight stamp cells and respects reduced motion.

The same Spanish target text uses English helpers in SME and Lithuanian helpers in SM. The book reads the active town save for situations, in-person places, game starts, keepsakes and cards. Games include Lotería and the swimming pool, whose detail also reports finished rounds. Keepsake titles and source credits come from the active edition. First opens show existing stamps in dry ink. Later visits can reveal newly earned stamps, with acknowledgments scoped to the build profile and save.

Course exports read the enclosing origin’s existing progress and load its public indexes as needed. Both courses use `/songs/index.json` and `/knygos/index.json`. I checked 50 mapped situations against `scripts/game/game-links.json` and `src/lib/course/missions.ts` in both courses, plus the public indexes and route definitions. The café opens `/situations/SS11` in SME and `/situacijos/SS11` in SM. SG01 opens `/songs/SG01` in either. The example chapter opens `/books/BK01-01` in SME and `/knygos/BK01-01` in SM. Standalone builds show the five town sections. Course links and progress reads use the existing course access and storage.

## Checks

- TypeScript passed with `VITE_EDITION=es` and with `VITE_EDITION=es VITE_LEARNER=lt`. Production builds passed for both course profiles and both standalone layers.
- The related Vitest run passed 75 tests in 10 files, including 35 tests in SME, 31 in SM and 9 shared guidance tests.
- The final full `npx vitest run --maxWorkers=2` gave these counts.

| Vitest project | Files | Tests passed | Tests failed | Tests skipped |
|---|---:|---:|---:|---:|
| `en` | 102 | 1,472 | 0 | 4 |
| `es` | 81 | 880 | 2 | 0 |
| `es-lt` | 21 | 206 | 0 | 0 |

The two `tests/es/town-atlas.test.ts` paint-hash mismatches were the only failures. Both reproduced on `plans8/pc` at `e9e0c02f` with the same expected and received hashes. The town geometry and collision fixtures were updated for the deliberate facade changes.

## Chromium and rendering

Chromium 156 on Debian Linux used SwiftShader, low quality and renderer DPR 1. Both layers passed the doorway, passport and course-link checks at 390 × 844 and 1280 × 800. Touch and controller checks ran on the portrait viewport, and keyboard checks ran at both. The browser used same-origin course fixtures for the three links, including the new-tab return. Opening a save with earned café, Lotería and course evidence showed dry ink. A museum completion subsequently revealed separate situation, place and keepsake stamps. Across ten further opens and closes, both layers held at 73 geometries and 17 textures in portrait, and 99 geometries and 26 textures on desktop. Separate standalone probes found five town sections, zero course catalog requests, zero passport window listeners while closed and zero media starts from browsing.

The street comparison uses the same Calle Hidalgo camera against `e9e0c02f`. Calls and triangles below are for complete frames. Hall p95 uses 30 animation-frame intervals.

| Profile | Viewport | Street calls, base → port | Street rendered triangles, base → port | Hall calls | Hall rendered triangles | Hall p95 (ms) |
|---|---|---:|---:|---:|---:|---:|
| SME | 390 × 844 | 41 → 41 | 118,239 → 118,291 | 5 | 6,874 | 116.7 |
| SME | 1280 × 800 | 56 → 57 | 130,207 → 130,935 | 5 | 6,874 | 300 |
| SM | 390 × 844 | 41 → 41 | 118,239 → 118,291 | 5 | 6,874 | 83.4 |
| SM | 1280 × 800 | 56 → 57 | 130,207 → 130,935 | 5 | 6,874 | 250 |

The street scene kept its 271 town meshes and 44 town material textures. The façade added 52 static triangles and used the existing batches. Traffic and actors can change the full-frame counts between samples. The hall used three room meshes and one locally drawn 256 × 96 print texture. The desk card contributes one draw beside the pavement and the opaque batch for the shell, floor and furnishings. The room’s 1,108 triangles are 882 over the 226-triangle empty shell. The entry camera sits 3.60 m high on the phone and 3.01 m on desktop. The passport and its course catalogs made zero requests at town boot in the browser fixtures. SwiftShader frame times exceeded the 33 ms goal and varied with machine load during validation.

Repeat with `node tests/browser/townhall-pc.mjs`, using `WORLD_TEST_URL`, `WORLD_PLAYWRIGHT_MODULE` and `WORLD_CHROMIUM` for the local server and browser. Set `WORLD_LEARNER=lt` for SM, `WORLD_BASELINE=1` for the base street sample and `WORLD_SOFTWARE_GL=1` for SwiftShader.

## Files

- `src/game/world/{layout,town,mexican,interiors,townHallPrint}.ts`, `src/game/{Game,camera,gameRef}.ts` and the Spanish world theme handle the building, room, print, prompts and camera.
- `src/passport/` derives proof, reads indexed course evidence and manages reveal history. The Spanish content overlay holds the game allowlist, keepsake titles and mission crosswalk.
- `src/ui/{Passport.tsx,passport.css,Panels.tsx,Hud.tsx,MapPlaces.tsx,gamepad.ts}` handles browsing, the map pin and controls. Location and UI overlays supply both helper layers.
- `tests/es/{passport,townhall,town-collision-cache}.test.ts` covers both Spanish projects. The collision fixture checks the updated geometry against the live builder. `tests/browser/townhall-pc.mjs` exercises the two viewports and measures the rendered frames. [Copy ledger](WORDS-townhall-pc.md)

## Open checks

Physical-phone frame timing, a signed-in check inside each course, and owner copy and art review remain open. The passport follows the launch scope of PR #50. Library completion and song-specific radio history await their separate ledgers.
