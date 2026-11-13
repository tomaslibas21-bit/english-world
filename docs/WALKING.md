# Walking about the town: the shore, jumping, the jog, the first-time guide (13 Nov 2026)

Shared by every edition of the game (the code is in `src/game/`; each town keeps its own colours and things).

## The shore and wading (`src/game/water.ts`, `world/town.ts`)

- **One description of the beach's slope** (`sandY(x, z)`, the same function in GLSL as `SAND_GLSL`): flat up the beach,
  down under the sea over about three metres from `SHORE.top` (give or take the shoreline's wobble along x), then a
  nearly level seabed out to the wading limit. The ground's mesh follows it (`groundGeometry`: a strip of small quads
  at the sea, one big quad for the rest), so the sea meets real sand and its own swell washes up and down it.
- **The foam** is drawn by each sea's fragment shader from the water's depth over the sand (`SHORE_GLSL`): the sand shows
  through where the water is a hand deep, a white line follows the waterline as it moves, thin lacy foam trails behind
  it. Maple Harbor's shader, Puerto Colibrí's `seaColors` and the three trial styles (`styled.ts`) all use it; no new
  mesh, no new draw call. The sand going down to the water is drawn wet (the ground's shader, `vWet`).
- **Wading** is the player's only. The sea's two colliders are tagged `"sea"`: way-finding, the passers-by and the camera
  stop at them as before; `Colliders.resolve(p, r, true)` (the player outdoors) passes them. The player's feet follow
  the sand down (`Hop.ground` = `sandY`), so the opaque sea hides the legs. The water slows them (`Wading.pace`, about
  half at the limit), and the seaward part of each step fades to nothing over the last 1.5 m before `SHORE.limit`
  (`Wading.hold`): about 0.4 m deep at rest, knee to waist with the swell. No swimming. A jog stops in the water.
- Piers, deck edges and rails keep their colliders. Boats lying within a metre of the wading limit get player-only
  walls from their own boxes (`Game.init`).
- In the water each step is a splash (`audio.splash`, drops from `Splashes.burst`), rings spread at the legs
  (`Splashes`: one quad and one set of points, in the picture only while wading), and walking in is met by a small
  wave's wash (`audio.wash`, at most every six seconds).

## Jumping onto and over low things (`src/game/ledges.ts`, `movement.ts` Hop)

- The colliders are a ground plan with no heights. Once the town is built, `Ledges.build` reads the heights from the
  town's own meshes, a few milliseconds at a time (5 ms slices; nothing can be climbed until it is done, a second or two after the town appears): for every
  small collider, the top of what stands in it and within half a metre of it, in 12.5 cm cells (triangles that start
  above 1.3 m are over the thing, not part of it; undersides don't count).
- A collider that is mostly low (tops up to `LAND` = 0.62 m) is marked `split` and replaced, **for the player only**, by
  pieces with a height: the low ones can be landed on (`support`) and walked off (a fall), the rest (a bench's back)
  stays a wall (`resolve`). Left exactly as they were: buildings and anything tall, counters, tables, cars (tagged
  `"car"`, and mostly high anyway), a pier's deck under its invisible edge (a low top that runs on a metre past the
  collider is a floor, not a thing), café tables and their chairs (`keep`: the seats with a table), what the camera's
  field holds solid over 3.5 m (`tall`: a gazebo, a kiosco), and every person (their colliders have nothing built in
  them; the people sitting on a bench keep the player off themselves, `Ambient.resolvePeople(p, r, true)`).
- `Hop` is now a real jump: `y` the feet's height, `ground` what is under them. A jump goes about 0.78 m up; it lands on
  what is under it when it comes down. Stepping up without a jump: only 0.12 m (`STEP`).
- Way-finding, the passers-by, the camera's field and the conversation camera use the original colliders. A walk
  planned from a bench ("Nuvesk mane", a tap) first steps straight down to the nearest open spot the bench's back is
  not in the way of (`Game.walkTo`, `Ledges.clear`). Indoors the jump is as it was (drawn only).
- On a phone the jump button stays on screen: bottom right, and beside the talk / enter button when that shows.

## The jog (`Game.updatePlayer`)

- Walk 4.4 m/s. Outdoors, after 1.5 s of steady walking one way (a turn of more than about 30°, a stop or deep water
  starts the count again) the pace eases up to a jog, 6.0 m/s, over 0.9 s. Shift, or the stick at its edge: a run,
  7.4 m/s. Indoors always a walk.

## The first-time guide and the tip (`src/game/coach.ts`, `src/ui/Guide.tsx`)

- Six hints, one at a time, in a small card: walk, run, jump, talk, the radio (only where there is one), and the switch
  between pictures and the 3D town for conversations („Iliustruotos scenos“, a switch in the card). Each ticks itself
  off when the learner does it (7 m walked, 1.2 s at a run, a jump, a conversation started, the radio switched on) or
  with „Toliau“; „Praleisti“ ends them all. The card is under the folded task card on a phone and low in the middle on
  a computer; it takes no keys, is hidden while a panel or a conversation is open, and is remembered with the progress
  (`progress.coach.done`).
- The tip about running: once, the first time someone walks on for six seconds without running, after the guide
  (`progress.coach.run`): „Laikyk Shift – bėgsi.“ on a computer, „Patrauk vairalazdę iki krašto – bėgsi.“ on a phone.
- The words are written in Lithuanian; the Spanish edition wraps them in `L()` and translates them
  (`src/editions/es/ui/strings.ts`).

## Tests

`tests/movement.test.ts` (the jump, what it can land on, the shore and wading), `tests/coach.test.ts` (the guide and
the tip).
