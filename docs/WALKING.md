# Walking about the town: the shore, jumping and climbing, the jog, the first-time guide (13–14 Nov 2026)

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
- Floors built out over the shore are listed as the town builds them (`DECKS`: the pier's boardwalk and deck, a
  terrace on the sand): on them one stands on the boards (`floorY` = 0), not on the sand sloping away underneath.
- Piers, deck edges and rails keep their colliders. Boats lying within a metre of the wading limit get player-only
  walls from their own boxes (`Game.init`).
- In the water each step is a splash (`audio.splash`, drops from `Splashes.burst`), rings spread at the legs
  (`Splashes`: one quad and one set of points, in the picture only while wading), and walking in is met by a small
  wave's wash (`audio.wash`, at most every six seconds).

## Jumping and climbing (`src/game/ledges.ts`, `movement.ts` Hop; 14 Nov 2026)

- The colliders are a ground plan with no heights. Once the town is built, `Ledges.build` reads the heights from the
  town's own meshes, a few milliseconds at a time (5 ms slices; nothing can be climbed until it is done, a second or
  two after the town appears): for every small collider, the top of what stands in it and within half a metre of it,
  in 12.5 cm cells, each cell its own height (a hood slopes, a windshield more). What starts above 1.3 m counts only
  where it sits on the thing or close over it (a car's roof over its body); what is well over it is a roof (an awning
  over a stall's table, a shelter over its bench).
- **Knee-high things are as they were** (13 Nov): a collider that is mostly low (tops up to `LAND` = 0.62 m: a bench,
  a planter, a lounger) is replaced, for the player only, by pieces with a height: the low ones can be landed on
  (`support`) and walked off (a fall), the rest (a bench's back) stays a wall (`resolve`).
- **Higher things have their heights too.** A collider that is not mostly knee-high, but mostly no higher than `CLIMB`
  (1.75 m: a car's roof), is split into pieces with their own heights: a car (hood, windshield, roof, trunk), a low
  wall and the posts on it, a fence, a trash can, a hydrant, a mailbox, a table, a crate, a fountain's basin. What in
  it is higher than `CLIMB` is a wall, whatever one jumps from; so is a top with less than 2.3 m of room over it (a
  market stall's table under its awning) and the flank of something that goes on up (a fountain's column).
- **By someone one talks to nothing changes**: a collider within 1.6 m of a person of a conversation (or of the spot
  one talks to them from) keeps the old limit, so nobody stands on a counter in front of its clerk or on the car its
  owner is selling. Café tables and their chairs (`keep`), what the camera's field holds solid over 3.5 m (`tall`: a
  gazebo, a kiosco) and every person are left out as before; buildings (`"building"`), the invisible bounds and the
  sea are never candidates.
- **The jump** (`Hop`): about a metre up (`PEAK` 1.02 m, 0.58 s; the same on a slow phone's long frames), and it
  lands on what is under it when it comes down: a bench, a car's hood or trunk, a low wall, a fence a metre high. A
  top up to 5 cm above the feet is still landed on (`TOE`). **A second press in the air is a flip**: a somersault
  (`Character.flip`) and a little more lift (`FLIP_LIFT`, a third of a metre at the top of the jump), once a jump;
  with it one reaches about 1.4 m (a mailbox, a tall fence). **A car's roof (1.56 m) is reached only from its hood or
  its trunk**: the street's best jump comes up short of it (a test).
- Walking up without a jump: 0.12 m from the ground (`STEP`: a kerb), 0.07 m up on something (`SLOPE`: along a hood,
  not up a windshield). Walking down: steps of up to 0.13 m are followed (down a windshield), more is a fall.
- **Cars on the move** are walls, as they were (`Ambient.resolvePlayer`). A car that has stopped for the player is
  climbed like a parked one (`Ambient.carPieces`, read from its own mesh, `Ledges.dynamic`), and **its driver waits**
  while the player is on it or over it (and up to four seconds while they stand within a metre of it), and 0.8 s
  more; then it drives on. Nobody rides. A van or a bus too tall to climb stays a wall standing as moving.
- **Up on something higher than a bench** nobody is talked to and no door gone through (`Game.aloft`): one hops down
  first.
- A deck's edge the town tags `"ledge"` (the pier's beach side) is a wall for the passers-by and the way-finding and
  a ledge for the player: one jumps up onto the boards from the sand and hops along the mooring posts. A deck's
  boards have a height (`DECKS[].y`, water.ts): one stands on the pier's boards, not ankle-deep in them.
- Way-finding, the passers-by, the camera's field and the conversation camera use the original colliders. A walk
  planned from up on something ("Nuvesk mane", a tap) first steps straight down to the nearest open spot
  (`Game.walkTo`, `Ledges.clear`). Indoors the jump (and the flip) is as it was: drawn only.
- On a phone the jump button stays on screen: bottom right, and beside the talk / enter button when that shows. A
  second tap while in the air is the flip.
- **What must stay true** is checked for the whole town by `src/dev/climbAudit.ts` (dev only; in
  `tests/browser/climb.mjs`): flooding the town with every move taken generously, nobody stands higher than `CLIMB`,
  nobody gets beyond the bounds or the wading limit, and from every place reached only by jumping a plain jump leads
  back.

### What can be climbed in Maple Harbor (the survey of 14 Nov 2026: `things` of `Ledges`, one of each looked at)

- **Cars**: the ten parked along Main Street, Oak Avenue and the side streets, the taxi at the airport and the four
  rental cars (hood or trunk 0.9–1.0 m, roof 1.56–1.6 m), and any car of the traffic while it has stopped. Not Maggie's
  convertible (she stands by it).
- **The pier**: its boards from the sand along its beach side (0.3 m), and the eight mooring posts there (0.85 m).
- **The fountain**: its basin (0.8 m: one stands in the water); the column in the middle is a wall.
- **On the streets**: five hydrants and four trash cans (0.9 m), five mailboxes (1.35 m: a flip), the picket fences of
  Oak Avenue's front yards (0.75–0.9 m), the clinic's low sign, the rack by the gym (1.1 m), the crates at Sproutly
  (0.5–1.1 m), the bus stop's bench and bin.
- **The party's yard**: the table (0.9 m), the speaker (1.35 m), the fence round it (1.2 m).
- As before: every bench, the planters. **Not**: the market's stalls (their awnings), café tables and chairs, the
  gazebo, counters and anything by someone one talks to, lamp posts, signs on poles, trees, the gas pumps (1.7 m: in
  reach of nothing), buildings.

## The jog (`Game.updatePlayer`)

- Walk 4.4 m/s. Outdoors, after 1.5 s of steady walking one way (a turn of more than about 30°, a stop or deep water
  starts the count again) the pace eases up to a jog, 6.0 m/s, over 0.9 s. Shift, or the stick at its edge: a run,
  7.4 m/s. Indoors always a walk.

## The first-time guide and the tip (`src/game/coach.ts`, `src/ui/Guide.tsx`)

- Six hints, one at a time, in a small card: walk, run, jump, talk, the radio (only where there is one), and the switch
  between pictures and the 3D town for conversations („Iliustruotos scenos“, a switch in the card). Each ticks itself
  off when the learner does it (7 m walked, 1.2 s at a run, a jump, a conversation started, the radio switched on) or
  with „Toliau“; „Praleisti“ ends them all. The card is under the folded task card on a phone and low in the middle on
  a computer, above where the talk / enter prompt appears, so neither covers the other (nor the stick and the buttons:
  checked at 1459×812, 820×1180, 375×812, 320×568 and 844×390). It is painted with the game's own variables
  (`--panel-solid`, `--ink`, `--accent`, a course's `--g-*`), so it follows every theme of every course. It takes no
  keys, is hidden while a panel or a conversation is open, and is remembered with the progress (`progress.coach.done`).
- The tip about running: once, the first time someone walks on for six seconds without running, after the guide
  (`progress.coach.run`): „Laikyk Shift – bėgsi.“ on a computer, „Patrauk vairalazdę iki krašto – bėgsi.“ on a phone.
- The words are written in Lithuanian; the Spanish edition wraps them in `L()` and translates them
  (`src/editions/es/ui/strings.ts`).

## Tests

`tests/movement.test.ts` (the jump and the flip, what they can land on, a car in steps, the shore and wading),
`tests/coach.test.ts` (the guide and the tip), `tests/browser/climb.mjs` (in the real game: a parked car in steps, the
flip, the phone's button, and the town-wide audit).
