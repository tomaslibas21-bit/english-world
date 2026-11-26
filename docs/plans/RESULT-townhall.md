# Maple Harbor town hall

House 4 on Oak Avenue is now the Town Hall. Its north door at (90, 49) leads to a 9 × 7 m room. The gate, level porch and side aisles lead to an oak counter with an open book, green blotter, ink pad, rubber stamp and printed EN/LT instructions. The map offers a pin and walking directions. A browser walk from the exit reached Maggie Holt beside the car on Cedar Lane.

At the counter, tap **Open passport**, press **E**, or press **X** on a controller. Select a seal to read its evidence. **Back**, **Esc** and controller **B** return to the selected seal, then to the counter. Indexed course links open in a new tab.

## Second-round art review

- **At the doorway.** From the same 390 × 844 viewport, the camera now sits 3.60 m above the floor, down from 7.53 m. It looks across the oak worktop from one side. The pale leaves, dark ink pad and turned stamp have separate silhouettes. The bilingual desk card and the open-passport prompt are visible on entry. The exit uses its own prompt and walking route, clear of the worktop. [Phone doorway](townhall-review/doorway.webp) · [Desktop doorway](townhall-review/desktop-doorway.webp)
- **Browsing.** The section picker leads straight into the stamp grid. Two full choices fit at 390 × 844 and at 390 × 664 with A++. Selecting a stamp opens its proof. Back returns focus to that stamp. [Phone index](townhall-review/fresh-save.webp) · [A++ index](townhall-review/large-index.webp)
- **At the reward.** The leaf is opaque from its first frame. The café cup, journal stars and completion count sit together. A connected controller gets a reserved strip on the cover. The browser check measures the position of the live notice and the three pieces of evidence. [Controller reward](townhall-review/cafe-earned.webp) · [Reduced motion](townhall-review/cafe-earned-reduced.webp)

The first-round images are available for direct comparison. [Original doorway](https://github.com/tomaslibas21-bit/english-world/blob/cacbd67783a53f8c3d98cbafb5b25d6c18b73fc2/docs/plans/townhall-review/doorway.webp) · [Original phone index](https://github.com/tomaslibas21-bit/english-world/blob/cacbd67783a53f8c3d98cbafb5b25d6c18b73fc2/docs/plans/townhall-review/fresh-save.webp) · [Original café reward](https://github.com/tomaslibas21-bit/english-world/blob/cacbd67783a53f8c3d98cbafb5b25d6c18b73fc2/docs/plans/townhall-review/cafe-earned.webp)

## Evidence

| Page | What earns the impression |
|---|---|
| Situations | A completed catalog conversation. The detail uses the journal’s star function and shows the completion count. |
| Places | A completed in-person conversation at the named location, including a picture-mode completion. |
| Games | A recorded start of Desert Road, Open Sea, Taxi, Billiards, Barista, Go Fish, Surf, Photo Walk or a workout. Surf and Photo Walk can show waves and distinct indexed finds. |
| Keepsakes | Completed conversations grouped by the existing keepsake kind. The detail names the sources. |
| Cards | At least one valid card in the current game deck. Removing the last card empties the pocket. |
| Songs | A positive English Master `heard` timestamp and an indexed song. Current indexed favorites form a separate list of links. |
| Books | A positive `read` or `heard` timestamp for an indexed chapter. The detail shows both when present. A cover requires every listed chapter. |

The standalone build has 121 eligible town stamps. The English Master export also reads the enclosing course’s public indexes and local progress. The header gives the total earned and adds a denominator once all available catalogs are known. A reviewed crosswalk covers 50 English Master mission IDs. Course data and access gates stay under the course’s control.

A first visit prints existing evidence silently. On later visits the book opens to one new impression. Multiple awards can be reviewed one at a time. Acknowledgments are scoped to the save and course, merge across tabs, and fall back to memory when storage is denied. Reduced motion shows the printed seal immediately. The book mounts up to eight index cells per leaf.

## Checks

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Passed |
| Related Vitest suites | 102 tests passed in 12 files |
| Full `npx vitest run` | 1,706 tests passed in 124 files |
| Production builds | English Master configuration and standalone both built |
| Browser interaction | Touch and E/X entry, Tab/Enter controls, D-pad/A selection, B/Esc through detail and index, and focus back on the counter |
| Return visits | Fresh save, old save, café reveal, multiple awards, a full browser reload, two tabs, remote updates while focused and denied-storage fixtures |
| Course links | Checked mission, song and chapter route definitions in English Master. Opened and returned from all three example paths with same-origin browser fixtures. |
| Standalone | Existing café completion showed 3/121 on first open, dry. Five sections and zero passport or course catalog requests at boot. |

The repeatable touch and controller check is `node tests/browser/townhall.mjs`. It accepts the existing browser suite’s `WORLD_TEST_URL` and `WORLD_PLAYWRIGHT_MODULE` settings, plus an optional `WORLD_CHROMIUM` executable and `WORLD_SHOTS` directory.

## Phone budget

Chromium 156 on Debian Linux, SwiftShader, low preset, 390 × 844, DPR 1. Each production build ran on its own. At each pose we allowed 3.2 seconds to settle, then recorded three windows of 65 animation-frame intervals. The comparison interior is the Maple Harbor post office, another walk-in public counter. Room figures use each room’s normal entry camera, avatar and HUD. Calls include the complete rendered frame. Meshes, triangles and distinct material textures refer to the room itself.

| Entry measurement | First-round hall | Revised hall | Post office on revised build |
|---|---:|---:|---:|
| Draw calls per frame | 12 | **5** | 18 |
| Room meshes | 6 | **3** | 9 |
| Room textures | 3 | **1** | 5 |
| Room triangles | 412 | 1,032 | 2,256 |
| Triangles drawn in the full frame | 6,314 | 6,798 | 23,564 |
| p95 frame times, ms | 33.4 / 33.4 / 33.4 | 33.4 / 33.4 / 33.4 | 50.1 / 50.0 / 33.4 |
| Median of the three p95 values, ms | 33.4 | **33.4** | 50.0 |

The room geometry now consists of the pavement, one batch containing the floor, walls and furnishings, and the printed instruction card. The card uses a single 256 × 96 texture loaded on entry. The modeled handle, paper edges, windows and paneling bring the room to 1,032 triangles. That is 818 over the standard 214-triangle shell, within the plan’s 900-triangle decor budget.

| Matched Oak Avenue measurement | Before town hall | First-round hall | Revised hall |
|---|---:|---:|---:|
| Street draw calls in the three samples | 38 / 36 / 38 | 37 / 37 / 39 | 36 / 36 / 38 |
| Town meshes | 198 | 199 | 198 |
| Town material textures | 51 | 52 | 51 |
| Town triangles | 266,764 | 266,790 | 266,076 |
| p95 frame times, ms | 100.0 / 100.1 / 100.0 | 83.4 / 83.4 / 83.4 | 83.4 / 83.4 / 100.0 |
| Median of the three p95 values, ms | 100.0 | **83.4** | **83.4** |

All street samples used the same camera at (83, 5.4, 31), looking at (90, 3.7, 51). Baking the painted letters into the façade and simplifying the window boxes removed one mesh, one texture and 714 triangles versus round one. In the original development-server measurement, the street median p95 went from 116.6 ms before the hall to 133.2 ms with the first hall. In this production comparison, the street median p95 was unchanged between the two hall builds. The 33 ms absolute target remains open on this software renderer. The revised hall recorded 33.4 ms, lower than the post office’s 50.0 ms. Physical phone timing remains open.

In the final production run, ten book visits held the renderer at 55 geometries and 12 textures. All passport-specific listeners detached on close, focus returned to the counter and browsing started zero media plays.

To repeat the comparison, serve the production outputs from `c7e844b2`, `cacbd677` and this revision in turn. Point `WORLD_TEST_URL` at each server and run `node tests/browser/townhall-perf.mjs` with the same Chromium installation. Use the harness from this revision for all three builds. Set `WORLD_SOFTWARE_GL=1` to reproduce the SwiftShader run.

## Review captures

[Oak Avenue](townhall-review/oak-avenue.webp) · [View from the door](townhall-review/doorway.webp) · [Fresh save](townhall-review/fresh-save.webp)

[Café before completion](townhall-review/cafe-outline.webp) · [Café after completion, reduced motion](townhall-review/cafe-earned-reduced.webp) · [Journal on the same café fixture](townhall-review/journal.webp)

[Desktop spread](townhall-review/spread.webp) · [A++ detail](townhall-review/large-detail.webp) · [Landscape index](townhall-review/landscape.webp) · [Chapter evidence](townhall-review/course.webp) · [Four screen sizes](townhall-review/four-sizes.webp)

## Files and review handoff

- The building, door, room and signage live in `src/content/locations.ts` and `src/game/world/{layout,town,interiors,townHallPrint}.ts`. The camera framing is in `src/game/camera.ts`. The desk prompt uses `src/game/Game.ts`, `src/state/store.ts` and `src/ui/Hud.tsx`.
- `src/passport/{stamps,course,missions,presentation,usePassport,words}.ts` derives the evidence, loads the relevant catalogs and manages reveal history. `src/state/cards.ts` checks the saved deck version.
- `src/ui/{Passport.tsx,passport.css,Panels.tsx,MapPlaces.tsx,worldMap.tsx,gamepad.ts}` handles presentation, the map and input.
- Regression coverage lives in `tests/{passport,townhall}.test.ts` and `tests/browser/{townhall,townhall-perf}.mjs`.
- The owner’s art review, Lithuanian copy sign-off, physical phone timing and signed-in course smoke check remain open. [English and Lithuanian copy ledger](WORDS-townhall.md)
- Puerto Colibrí is deferred. The library adapter awaits its completion ledger. Song-specific radio history and karaoke performance stamps are outside this launch.
