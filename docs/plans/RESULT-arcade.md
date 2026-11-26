# The Corner Pocket arcade · Maple Harbor

The covered spare table now holds two machines. **Desert Road** opens the existing Words/Phrases briefing and runs with a session-owned sedan. **Pool** starts a round at the main table with Tina. Quitting or finishing a cabinet game returns the learner to that machine and focuses its Play button. The machines use stationary painted artwork at every motion setting.

## Town games and records

| Cabinet | Destinations | Records shown |
| --- | --- | --- |
| Desert Road | Taxi stand, boat at the beach, Maren at Harbor Surf, Hana at the Visitor Center | Road and Open Sea each read their own best points. Taxi shows games started, Surf shows waves ridden, and Photo Walk counts distinct valid finds in the album. |
| Pool | Dan and Nora’s home, Sunny Cup, gym mat | Pool, Go Fish and Gym show games started. Barista shows shifts started. |

Each directory card names the place before the learner selects Visit. An unfinished dinner or café conversation leads to Dan or Mia. Once the conversation is complete, Visit leads to the usual game offer. Boarding, crossing the buoys and resuming a photo walk use the town’s existing interactions. Browsing, reading a record and visiting a place leave the play counters alone.

## Changes in the repository

| Area | Files |
| --- | --- |
| Cabinet geometry, approaches, selection, return and records | `src/game/arcade/{props,cabinets,mode,records}.ts`, `src/game/world/interiors.ts` |
| Room and activity handoff | `src/game/Game.ts`, `src/game/kit/modes.ts`, `src/game/billiards/mode.ts`, `src/game/road/{entry,mode,store}.ts`, `src/game/taxi/mode.ts`, `src/radio/radio.ts` |
| Cabinet menu, native exit labels and controls | `src/ui/{Arcade,Billiards,Hud,Road}.tsx`, `src/ui/arcade.css`, `src/ui/gamepad.ts`, `src/state/store.ts` |
| Tests and copy | `tests/arcade.test.ts`, `tests/arcade-road.test.ts`, [English and Lithuanian copy](WORDS-arcade.md) |

## Verification

- TypeScript passed with `npx tsc --noEmit`. The Vite production build passed.
- Related Vitest run passed all 274 tests in 23 files, including nine new cabinet regressions. These exercise old and damaged saves, separate Road and Sea scores, preservation of a higher ghost, cabinet return ownership, directory reads, and cancellation before the Road chunk or phrase pool resolves.
- All 1,700 tests across 124 files passed across the runs. The full `npx vitest run` passed 1,693 tests, including the entire voice-list audit. Seven existing tests hit the runner’s five-second timeout. With `--testTimeout=60000`, all 61 tests in those six files passed. A broader rerun of all 123 files outside the completed voice audit also passed all 1,693 tests. The timeout override applied to the command only.
- From the hall doorway, the room navigation grid found clear paths to both cabinets, the main table and Tina. The cabinet started a native Pool round, accepted a called eight ball, displayed a win and returned to Pool. An early quit from the original table left the player at its own prompt.
- A profile with no previous Road play reached a phrase gate, scored 100, saw 100 on the native result, and returned to 100 on the wheel. Replay reopened the briefing. Losing window focus during a cabinet drive returned to the wheel. The outdoor crest and open-water crossing each started their native game and returned the learner to their car or boat.
- All seven Visit actions ended on walkable ground at the intended prompt. Both locked and unlocked dinner and café saves reached the appropriate conversation or game offer. Talking to Hana resumed a paused photo book and retained the fountain photo.
- Keyboard Tab/Enter/Esc, emulated touch and standard gamepad events exercised the menu. D-pad selection and B/Esc preserved the last directory row. After a simulated pad disconnect, Enter operated that same row. Visible cabinet buttons measured at least 44 × 44 CSS pixels at all four sizes with A++ text.

The browser fixtures placed the learner at each approach. They also set up the final pool shot, advanced the Road timer and positioned boarded vehicles near their crossings. The normal town prompts, mode starts, scoring, save writes and return actions ran in the game.

## Renderer and phone review

At a fixed doorway camera on low quality, toggling the two visible cabinet meshes added **2 draw calls and 404 triangles**. Both machines share one **512 × 256** atlas. They belong to the hall scene and have no street mesh, lights, animation loop, player or audio source of their own.

| Warm check | Before | After |
| --- | --- | --- |
| Ten directory round trips | 128 calls, 38,462 triangles, 107 geometries, 28 textures, 419 resource entries, 0 media elements | Identical counts. The voice player was idle. |
| Three blocks of ten alternating featured-game starts and returns | After the first block, 128 calls, 38,462 triangles, 108 geometries, 29 textures | The second and third blocks ended at the same counts. Parked cars kept their positions, rotations and use flags. |

The captures use the Maple Harbor English/Lithuanian learner profile, low quality, reduced motion and Chromium 156 on Linux with software WebGL. Sizes are CSS pixels. The phrase gate and native result use default text and touch emulation. The briefing and cabinet captures use A++. The four wheel captures show the same saved 100 points and restored Play focus after returning from a touch-driven round.

| Viewport | Review captures |
| --- | --- |
| 390 × 844 | [Wheel](review-arcade/wheel-390x844.jpg) · [Pool after one start](review-arcade/pool.jpg) · [Dinner prerequisite](review-arcade/dinner.jpg) · [Native result](review-arcade/road-result.jpg) · [Cabinet after scoring](review-arcade/record.jpg) |
| 390 × 664 | [Wheel](review-arcade/wheel-390x664.jpg) · [Words/Phrases briefing](review-arcade/briefing.jpg) · [Photo album record](review-arcade/photo.jpg) |
| 844 × 390 | [Wheel](review-arcade/wheel-844x390.jpg) · [Wheel approach](review-arcade/prompt-wheel.jpg) · [Pool approach](review-arcade/prompt-table.jpg) · [Phrase gate](review-arcade/gate.jpg) · [Open Sea directions](review-arcade/sea.jpg) |
| 1280 × 800 | [Wheel](review-arcade/wheel-1280x800.jpg) · [Both cabinets from the doorway](review-arcade/hall.jpg) · [Arrival at Hana](review-arcade/arrival.jpg) |

Human EN/LT copy review and hands-on checks with a physical controller and phone remain for sign-off. The phone check needs a warm, same-camera comparison against the plan’s p95 targets of 33 ms total and at most 2 ms added.
