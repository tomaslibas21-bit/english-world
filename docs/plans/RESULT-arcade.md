# The Corner Pocket arcade · Maple Harbor

The covered spare table now holds two machines. **Desert Road** opens the existing Words/Phrases briefing and runs with a session-owned sedan. **Pool** starts a round at the main table with Tina. Quitting or finishing a cabinet game returns the learner to that machine and focuses its Play button. The machines use stationary painted artwork at every motion setting.

## Second-round art review

- On a 390 × 844 phone, the old doorway shot placed the centers of the Road and Pool faces at x = 484 and 574. The portrait camera now pulls back, looks toward the cabinet wall, and keeps the player, Tina, the whole table and both cabinets in the frame. The framing blends back to the usual room view toward the rear of the hall. The walking camera and the game’s own table camera keep separate settings. [Doorway at 390 × 844](review-arcade/hall-390x844.jpg) · [Doorway at 390 × 664](review-arcade/hall-390x664.jpg)
- The marquees sit at 2.20 m, up from 1.83 m. The wheel has an amber sunset and a dashed road through the mesas. Pool has a mint-lit eight ball on felt. Brass inlays, lit rails, a shared runner and painted light on the floor and wainscoting carry the two colors into the room. The light stays steady at both motion settings.
- Each machine projects a tap target below its own screen. A brass pin keeps pointing to the machine when the label moves inward at a screen edge. Walking up plays the game’s existing two-note coin cue at 35% intensity through the effects bus. [Road prompt on phone](review-arcade/prompt-wheel-390.jpg) · [Pool prompt on phone](review-arcade/prompt-pool-390.jpg)
- Each card uses the same painted master as its cabinet. A saved best pairs a medal with gold type on dark green. A play count pairs a ticket with dark type on ivory. The value and its Lithuanian unit stay together, including **100 taškų**, **1 žaidimas** and **2 žaidimai**. [Road best](review-arcade/record.jpg) · [Pool count](review-arcade/pool.jpg)

## Town games and records

| Cabinet | Destinations | Records shown |
| --- | --- | --- |
| Desert Road | Taxi stand, boat at the beach, Maren at Harbor Surf, Hana at the Visitor Center | Road and Open Sea each read their own best points. Taxi shows games started, Surf shows waves ridden, and Photo Walk counts distinct valid finds in the album. |
| Pool | Dan and Nora’s home, Sunny Cup, gym mat | Pool, Go Fish and Gym show games started. Barista shows shifts started. |

Each directory card names the place before the learner selects Visit. An unfinished dinner or café conversation leads to Dan or Mia. Once the conversation is complete, Visit leads to the usual game offer. Boarding, crossing the buoys and resuming a photo walk use the town’s existing interactions. Browsing, reading a record and visiting a place leave the play counters alone.

## Changes in the repository

| Area | Files |
| --- | --- |
| Cabinet geometry, approaches, selection, return and records | `src/game/arcade/{art,props,cabinets,mode,records}.ts`, `src/game/world/interiors.ts`, `src/game/camera.ts` |
| Room and activity handoff | `src/game/Game.ts`, `src/game/kit/modes.ts`, `src/game/billiards/mode.ts`, `src/game/road/{entry,mode,store}.ts`, `src/game/taxi/mode.ts`, `src/radio/radio.ts` |
| Cabinet menu, native exit labels and controls | `src/ui/{Arcade,Billiards,Hud,Road}.tsx`, `src/ui/{arcade,styles}.css`, `src/ui/gamepad.ts`, `src/state/store.ts` |
| Tests and copy | `tests/arcade.test.ts`, `tests/arcade-road.test.ts`, [English and Lithuanian copy](WORDS-arcade.md) |

## Verification

- TypeScript passed with `npx tsc --noEmit`. The Vite production build passed.
- The full Vitest run passed **1,705 tests in 124 files** with three workers and a 60-second command-line test timeout.
- All 394 related tests passed in 29 files, covering the cabinets, camera, movement, audio, input, records and native games.
- Regression tests project all four table corners, Tina and the outer cabinet edges at each of the four review sizes. A formatting test covers zero, singular, plural, teens, 21 and 100, plus non-point metrics and empty records.
- From the hall doorway, the room navigation grid found clear paths to both cabinets, the main table and Tina. The cabinet started a native Pool round, accepted a called eight ball, displayed a win and returned to Pool. An early quit from the original table left the player at its own prompt.
- A profile with no previous Road play reached a phrase gate, scored 100, saw 100 on the native result, and returned to 100 on the wheel. Replay reopened the briefing. Losing window focus during a cabinet drive returned to the wheel. The outdoor crest and open-water crossing each started their native game and returned the learner to their car or boat.
- All seven Visit actions ended on walkable ground at the intended prompt. Both locked and unlocked dinner and café saves reached the appropriate conversation or game offer. Talking to Hana resumed a paused photo book and retained the fountain photo.
- Keyboard Tab/Enter/Esc, emulated touch and standard gamepad events exercised the menu. D-pad selection and B/Esc preserved the last directory row. After a simulated pad disconnect, Enter operated that same row. Visible cabinet buttons measured at least 44 × 44 CSS pixels at all four sizes with A++ text.

The browser fixtures placed the learner at each approach. They also set up the final pool shot, advanced the Road timer and positioned boarded vehicles near their crossings. The normal town prompts, mode starts, scoring, save writes and return actions ran in the game.

## Renderer and phone review

At a fixed doorway camera on low quality, toggling the two meshes added **2 draw calls and 652 triangles** for the cabinets, runner and reflected light. The props share one **512 × 256** atlas. The room lighting stays within the original budget because the visible light is baked into the atlas and rendered on the cabinet trim, floor and wall. There is no extra light or shadow pass and the props are only in the hall.

| Warm check at the same camera pose | Before | After |
| --- | --- | --- |
| Ten directory round trips | 128 calls, 38,710 triangles, 107 geometries, 28 textures, 424 resource entries, 0 media elements | Identical counts. The voice player was idle. |
| Thirty alternating featured-game starts and returns | After ten, 128 calls, 38,710 triangles, 108 geometries, 29 textures | After twenty and thirty, 128 calls, 38,710 triangles, 108 geometries, 33 textures and 0 media elements. The town fleet kept its poses and use flags. |

With normal motion enabled, a browser audio probe observed the native 988 Hz and 1,319 Hz notes once per cabinet approach. Twenty idle prompt checks and closing the card produced no repeat. Walking away and back produced one more cue. With reduced motion enabled, the two colored signs, cabinet trim and card artwork stayed stationary.

The captures use the Maple Harbor English/Lithuanian learner profile, low quality, reduced motion and Chromium 156 on Linux with software WebGL. Sizes are CSS pixels. The phrase gate, native result and immediate Road return use default text and touch emulation. The briefing, the four wheel views and the other cabinet captures use A++. The four wheel captures show the same native 100-point result after returning from a touch-driven round. The doorway captures use the ordinary town entrance. At 390 × 844, the outer edges of the two marquee faces span x = 259–370. Across the four sizes both prompt tops cleared the selected face by at least 11 CSS pixels, and the buttons stayed within the viewport.

| Viewport | Review captures |
| --- | --- |
| 390 × 844 | [Wheel](review-arcade/wheel-390x844.jpg) · [Pool after one start](review-arcade/pool.jpg) · [Dinner prerequisite](review-arcade/dinner.jpg) · [Native result](review-arcade/road-result.jpg) · [Cabinet after scoring](review-arcade/record.jpg) |
| 390 × 664 | [Wheel](review-arcade/wheel-390x664.jpg) · [Words/Phrases briefing](review-arcade/briefing.jpg) · [Photo album record](review-arcade/photo.jpg) |
| 844 × 390 | [Wheel](review-arcade/wheel-844x390.jpg) · [Wheel approach](review-arcade/prompt-wheel.jpg) · [Pool approach](review-arcade/prompt-table.jpg) · [Phrase gate](review-arcade/gate.jpg) · [Open Sea directions](review-arcade/sea.jpg) |
| 1280 × 800 | [Wheel](review-arcade/wheel-1280x800.jpg) · [Pool card](review-arcade/pool-card-1280x800.jpg) · [Both cabinets from the doorway](review-arcade/hall.jpg) · [Arrival at Hana](review-arcade/arrival.jpg) |

Human EN/LT copy review and hands-on checks with a physical controller and phone remain for sign-off. The phone check needs a warm, same-camera comparison against the plan’s p95 targets of 33 ms total and at most 2 ms added.
