# Convertibles, a boat, swimming (14 Nov 2026)

The owner asked for "a couple cabrios with people chilling in them" that one can take, "GTA style", and drive round
the town, and a boat at the shore to go out in and swim from. Shared by every edition of the game: the engine is in
`src/game/rides/`, each town says what stands where (`src/game/world/rides.ts`; Puerto Colibrí's is
`src/editions/es/game/world/rides.ts`) and what its people say (`src/content/rides.ts`).

## What there is

- **Convertibles**: two or three per town, parked at a curb with their owners lounging in them (sunglasses, an arm
  along the door, a nod to their music now and then; two of them chat). Walk up: the prompt is "Vairuoti: Convertible"
  (E, Enter, Space, or the phone's round button). The owners **hop out** on the curb's side with a wave and a line
  ("Hey, bring it back!"; a bubble with its meaning, spoken too if the passers-by's voices ever have it recorded) and
  stand by; the player hops in behind the wheel. Nobody is pulled, pushed or hit.
- **Driving**: the arrows or W A S D (up: go, down: brake and then reverse, the sides steer), Space the brake, E out.
  On a phone the stick drives (held to one side it still rolls on), the jump button is the brake ("STOP", for as long
  as it is held) and the round button gets out; pressed while rolling, it brakes first. The camera stays behind the
  car, backing up too, whatever the camera setting. About 45 km/h at most, 15 km/h backwards.
- **Where a car goes**: on the streets and two forecourts (`Drivable`: `layout.ts` ROADS and the plan's `lots`, drawn
  in by half a car's width, so the wheels stay on the asphalt). It slides along a kerb, a wall, a parked car or the
  traffic instead of stopping dead (`Motion.settle`), and cannot leave the town.
- **People are never run over.** The car's speed is held to what stops 1.6 m short of the nearest person ahead, the
  way it is going: the passers-by and their dogs (also where they will be in a moment, walking on), the people one
  talks to, its own owners (`Motion.step`'s `gap`; `Ambient.personAhead`). Seen in time it brakes softly (10 m/s²).
  And someone on foot is never where a car is: the passers-by step out of its way (`Ambient.rideBoxes`). The
  traffic's cars stop behind a convertible in their lane, driven or left there.
- **Getting out** parks it where it stands. After a few seconds **its owners stroll back** to it (planned along the
  sidewalks if it is far, up to about 110 m) and hop in, with a word of thanks if the player is near. Once it has stood
  away from its curb for a while and neither it, its curb nor its people are in the picture, it is **back at its curb**
  with them in it (`Rides.rest`); at once behind a door. A door, a taxi or a conversation picked from the list puts the
  player on foot and the car home (`Rides.abandon`).
- **The boat**: a small open motorboat (Maple Harbor: moored along the pier's east side; Puerto Colibrí: a lancha
  afloat off the beach by El Muelle, a step past where one wades to). In from the pier's boards or from the water
  beside it; the same keys; slower than the car, it glides on when let go and throws up spray. It stays in the bay
  (`water.ts` BAY), off the shallows, clear of the pier, the boats at anchor and the lighthouse's rocks. **Out**:
  onto a pier's boards if they are within a step, into the shallows by the beach, else over the side for a swim.
- **Swimming** (`water.ts` SWIM, `Game.updatePlayer`): the wading is as it was as far as the wading limit; past it the
  seabed falls away (`seaBedY`: what the player's feet follow; the sea's own picture, the foam and the shallows, still
  come from `sandY`), and with more than 0.95 m of water over the bed one floats and swims: a calm breaststroke
  (`Character.swim`), 2.5 m/s, 3.6 with Shift or the stick at its edge. The bay's edge takes a step away softly
  (`bayHold`), as the wading limit used to. Back at the beach one finds one's feet; beside the pier the prompt is
  "Užlipti ant prieplaukos"; beside the boat, into it again.
- **A dive** (Space, or the phone's jump button, which shows an arrow down): where the water is deep enough, about
  two metres under for ten seconds or until the button is pressed again. The camera goes under with the diver
  (level behind them; further back on a phone held upright) and the picture changes (`rides/undersea.ts`): the sandy
  bed with the light of the waves playing on it, rocks, coral, sea grass, starfish and shells, small schools of fish
  that turn up wherever one dives, the surface seen from below, bubbles. All of it is in the picture only while the
  camera is under water (the sea's surface is opaque from above), and is built the first time someone swims.
- **Pools** (`water.ts` POOLS, FLOORS): water away from the sea that the same code swims and dives in, with steps as
  its own sloping floor. Maple Harbor has none; Puerto Colibrí's Cenote Ka'an is one (docs/es/TOWN.md).
- **Sounds** (`audio.motor`, `audio.bump`): a light hum for the car and a putter for the boat, made on the spot, their
  pitch following the speed, on the world's bus (silent in a conversation, under a voice, with a panel open) and
  lower under the radio, which plays on in the car as anywhere; a soft bump against a kerb; splashes for the strokes.

## What stays as it was

- At a wheel or a helm **nobody is talked to and no door gone through**: the only prompt is the way out. "Nuvesk
  mane" answers "Pirmiausia išlipk"; the arrows on the ground still lead the way, so one can drive to a task.
- Walking, the jump and the flip, climbing, wading and the foam, the guide, the minimap (grass beyond the town's own
  picture now, where it showed sea), the radio: unchanged. The climbing audit (`src/dev/climbAudit.ts`) still holds
  for anyone on foot: nobody walks past the wading limit; one swims past it.
- **One draw call per person** as before (the swim's pose and the hands on the wheel are the same bones). A
  convertible or the boat is one mesh; the three convertibles and their four owners (one in the main street's car,
  one in the east one, a pair in the quiet west one; three in the simple quality) are what the round adds to the
  town's views.
- **What it costs a phone** (measured 14 Nov, the game's own work per frame, the build before against this one in
  turn): about 2 % more where no convertible is near, 4 to 7 % on the street where one stands with its owner in the
  picture; the draw calls at the busiest spots are what they were (Main Street 220, the square 174; Puerto Colibrí's
  zócalo 101 → 102, avenida Juárez west 115). Kept low by: owners farther than 26 m from the player hold their pose
  (their bones are not worked out; `holdPose`), are drawn in their far version beyond 20 m from the camera, a ride
  out of the camera's view is left out of the scene's walk, a car's shadow is drawn only within 36 m of the player,
  and under water the town above is left out of the picture (a dive draws about 15 things, the street 150 to 300).

## The files

| | |
| --- | --- |
| `src/game/rides/drive.ts` | the car's and the boat's arithmetic, the streets a car stays on; no three.js, tested alone |
| `src/game/rides/Rides.ts` | the rides in the scene: the owners, getting in and out, their way back, the way home |
| `src/game/rides/shapes.ts` | the convertible and the motorboat, one vertex-coloured geometry each |
| `src/game/rides/undersea.ts` | what a dive shows |
| `src/game/rides/ground.ts` | the town's drivable ground |
| `src/game/world/rides.ts`, `src/content/rides.ts` | this town's plan; its people's lines and the things' names |
| `src/game/water.ts` | `seaBedY`, SWIM, BAY, `bayHold`, POOLS, FLOORS, `waterY` |
| `src/game/Game.ts` | `updateRide`, the swimming in `updatePlayer`, the prompts, `boardRide` / `leftRide` |
| `src/game/ambient.ts` | `rideBoxes`, `personAhead`, `pushOutOfCars` |
| `src/game/characters/Character.ts` | `busy` "wheel", "tiller", "doorL", "doorR"; `steer`; `swim`, `dive` |

## Tests

`tests/rides.test.ts` (the arithmetic, the plan, the water), `tests/browser/rides.mjs` (the real game, a computer and
a phone: a convertible taken, driven, braked and left; the boat, the swim, the dive, back into the boat).

## Left for later

- The owners' lines are bubbles: no clips are recorded for them (`audio.hasClip` decides; the passers-by's voices).
- A car left in a traffic lane holds the traffic behind it until its owners have it back at its curb.
- The trial world styles (`StyledCharacter`) have no swimming pose: the character floats upright there.
