# Maple Harbor town hall

House 4 on Oak Avenue is now the Town Hall. Its north door at (90, 49) leads to a 9 × 7 m room. The gate, level porch and side aisles lead to an oak counter with an open book, green blotter, ink pad, rubber stamp and printed EN/LT instructions. The map offers a pin and walking directions. A browser walk from the exit reached Maggie Holt beside the car on Cedar Lane.

At the counter, tap **Open passport**, press **E**, or press **X** on a controller. Select a seal to read its evidence. **Back**, **Esc** and controller **B** return to the selected seal, then to the counter. Indexed course links open in a new tab.

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
| Related Vitest suites | 95 tests passed in 11 files |
| Full `npx vitest run` | 1,706 tests passed in 124 files |
| Production builds | English Master configuration and standalone both built |
| Browser interaction | Touch and E/X entry, Tab/Enter controls, D-pad/A selection, B/Esc through detail and index, and focus back on the counter |
| Return visits | Fresh save, old save, café reveal, multiple awards, a full browser reload, two tabs, remote updates while focused and denied-storage fixtures |
| Course links | Checked mission, song and chapter route definitions in English Master. Opened and returned from all three example paths with same-origin browser fixtures. |
| Standalone | Existing café completion showed 3/121 on first open, dry. Five sections and zero passport or course catalog requests at boot. |

The repeatable touch and controller check is `node tests/browser/townhall.mjs`. It accepts the existing browser suite’s `WORLD_TEST_URL` and `WORLD_PLAYWRIGHT_MODULE` settings, plus an optional `WORLD_CHROMIUM` executable and `WORLD_SHOTS` directory.

## Phone budget

Chromium 156 on Debian Linux, SwiftShader software rendering, low preset, 390 × 844, device pixel ratio 1. Both builds used the same fixed street camera at (83, 5.4, 31), looking at (90, 3.7, 51). The baseline was `c7e844b2`. Three consecutive samples each covered 65 animation-frame intervals.

| Metric | Baseline | Town hall |
|---|---:|---:|
| Street draw calls in the three samples | 38 / 36 / 38 | 39 / 37 / 39 |
| Triangles in the town group | 266,764 | 266,790 |
| Added interior decor over the room shell | — | 2 meshes, 198 triangles |
| Sign artwork | — | One shared 512 × 256 atlas |
| p95 frame time, ms | 149.9 / 116.6 / 100.0 | 150.0 / 133.2 / 100.0 |

The median of the three p95 readings rose from 116.6 to 133.2 ms. The software renderer missed both the 33 ms absolute target and the 2 ms incremental target. Timing on a physical phone remains unverified. Ten consecutive opens and closes held the renderer at 56 geometries and 13 textures. All passport event listeners detached, focus returned to the prompt and the media play count increased by zero.

## Review captures

[Oak Avenue](townhall-review/oak-avenue.webp) · [View from the door](townhall-review/doorway.webp) · [Fresh save](townhall-review/fresh-save.webp)

[Café before completion](townhall-review/cafe-outline.webp) · [Café after completion, reduced motion](townhall-review/cafe-earned.webp) · [Journal on the same café fixture](townhall-review/journal.webp)

[Desktop spread](townhall-review/spread.webp) · [A++ detail](townhall-review/large-detail.webp) · [Landscape index](townhall-review/landscape.webp) · [Chapter evidence](townhall-review/course.webp) · [Four screen sizes](townhall-review/four-sizes.webp)

## Files and review handoff

- The building, door, room and print atlas live in `src/content/locations.ts` and `src/game/world/{layout,town,interiors,townHallPrint}.ts`. The desk prompt uses `src/game/Game.ts`, `src/state/store.ts` and `src/ui/Hud.tsx`.
- `src/passport/{stamps,course,missions,presentation,usePassport,words}.ts` derives the evidence, loads the relevant catalogs and manages reveal history. `src/state/cards.ts` checks the saved deck version.
- `src/ui/{Passport.tsx,passport.css,Panels.tsx,MapPlaces.tsx,worldMap.tsx,gamepad.ts}` handles presentation, the map and input.
- Regression coverage lives in `tests/{passport,townhall}.test.ts` and `tests/browser/townhall.mjs`.
- The owner’s art review, Lithuanian copy sign-off, physical phone timing and signed-in course smoke check remain open. [English and Lithuanian copy ledger](WORDS-townhall.md)
- Puerto Colibrí is deferred. The library adapter awaits its completion ledger. Song-specific radio history and karaoke performance stamps are outside this launch.
