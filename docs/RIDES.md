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
  car, backing up too, whatever the camera setting. About 35 km/h in town, 55 once it has held a course; 15 km/h
  backwards.
- **Where a car goes** (since 15 Nov, below): anywhere open and dry: the streets, the sidewalks, the squares, the
  grass (`ground.ts` `townGround`); it stays out of buildings, solid things and the water, slides along a wall or a
  parked car instead of stopping dead (`Motion.settle`), and cannot leave the town.
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
- **The boat**: a small open motorboat (two per town since round 3, lying in the shallows a few steps off the dry
  sand: walked up to and taken; from the water beside it too). The same keys; slower than the car, it glides on when let go and throws up spray. It stays in the bay
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

## Round 2 (15 Nov 2026): the owner's drive

The owner drove it and wrote: the owners should say their lines aloud, each their own; people should jump aside and
call out when one goes by fast; "I got stuck here. I can't even go over the sidewalk"; faster after holding a course,
"just like walking"; and the speed bumps should be felt. Then: check the car and the boat for anything else.

- **Over kerbs, sidewalks and squares.** The car is no longer held to the asphalt. The asphalt (`townAsphalt`: the
  streets and the plan's `lots`) still matters for two things: its edge is a **kerb** the springs feel, and only on
  it does the speed build up. Off it the car rolls at 24 km/h (`CAR.rough`).
- **Speed that builds.** 35 km/h (`CAR.town`) at once; held on a course for a second (`Motion.hold`: throttle on,
  the wheel near straight, on the asphalt) it climbs to 55 (`CAR.max`). A sharp turn, the brake, a bump or leaving
  the asphalt take it back to town pace. The boat does the same (`BOAT.town` → `BOAT.max`).
- **Springs** (`Rides.ride`, `Ride.sus`): each axle feels a kerb (where `asphalt.has` flips) and a **speed bump**
  (`plan.bumps`, a segment across the street: Puerto Colibrí's topes from `THEME.topes`; Maple Harbor's streets have
  none). The body lifts and pitches, the front first and then the back; a thud (`host.thud`); over a bump at speed
  the car loses about a third of its pace, over a kerb a little.
- **People jump aside and call out.** Going by faster than 16 km/h, whoever is beside its way or just ahead starts
  (`Ambient.startle`): a walker hops a good step aside and turns to look, someone standing hops, someone sitting looks
  up. Now and then (every 5 to 9 s at most) one of them calls after the car (`RIDE_SHOUTS`: "Hey, watch out!",
  "¡Oye, cuidado!"…), in one of two women's or two men's voices (`shoutVoice`; each passer-by keeps theirs). Nobody is
  touched: the car still stops by itself for anyone on its way.
- **On its way means along the wheel's arc** (`aheadOnArc`, `Motion.curve`): the car stops for whoever is on the way
  its turned wheel takes it, not for someone straight ahead it is steering away from; past those it goes at a
  careful pace (`CAR.careful`, 15 km/h). So a stopped car can be steered round someone who stays put.
- **Behind the traffic** (`Ambient.carAhead`): it eases in behind a car going its way at that car's pace instead of
  running into its back, passes when steered round it, and brakes for one coming the other way. One that stands
  it noses up to and slides round (two cars never wait for each other).
- **Never left boxed in.** Pushing at something and getting nowhere: a word about backing up (`host.stuck`); held up
  by someone or by a standing car: a word about going round (`host.waiting`); and after 7 s of trying in one spot
  the picture fades and the car is back on the nearest free piece of street (`streetSpot`, `host.rescue`). A random
  driver (full throttle, random wheel, six minutes, twice per town) touched nobody and was never left standing.
- **Each owner speaks**, in a voice of their own: four lines when their car is taken, two when it is brought back,
  never the same twice running (`RIDE_OWNERS`, `rideVoice`; `Game.saysAloud` plays the clip when the voice has the
  line, else a bubble only). Maple Harbor: Jess, Walt, Carol and Pete; Puerto Colibrí: Valeria, Don Rafa, Marisol
  and Beto, in the three Spanishes.
- **Dust, skid, wake.** Dust behind the rear wheels off the asphalt or going fast, a skid's sound on a hard stop;
  the boat's wake is a ring round its hull as well as spray at the stern.
- **The bay's edge** is a line of **buoys** (`buoysGeometry`, one mesh, drawn only for someone in the boat or
  swimming). Making for them the boat's bow comes round by itself and runs along them (`bayTurn`, `BAY_EDGE`): no
  wall out at sea. Running in to the beach it eases off (`shoreSpeed`) and rests on the shallows; under power it
  turns even at a standstill; driven on at the beach for a while, a word about backing off (`host.aground`).

## Round 3 (15 Nov 2026, the same day): take a boat on foot, slides, tight places

The owner again: "I want to be able to just grab a boat, walk up to a boat and grab it, and that's that"; "make the
car and boat drift or something… now it's like very old school and boring, not GTA-like at all"; and he gets boxed in:
turning round is so awkward that "you don't really want to drive at all".

- **Boats are walked up to.** Two per town, lying in the shallows with their sterns about 2 m off the dry sand
  (`SHALLOWS`: how far in a boat floats). Taken from 3.2 m off the hull (`BOAT.reach`): the sand, the shallows, the
  water. A yellow gem turns over each free boat (`Rides.marks`, one mesh), and the round map shows the boats and the
  convertibles (`ui/mapMarks.ts`, `Game.rideMarks`). Run in to the beach, a boat rests on the shallows and one steps
  out on the beach's side onto one's feet (`boatExit`). Neither town has boards to take a boat from: the pier is
  filled by its restaurant and its railed walk.
- **The slide** (`CAR_DRIFT`, `BOAT_DRIFT`, `Motion.drift`): the brake (Space; the phone's STOP, which reads DRIFT
  once it is fast enough) held while turning at speed is the handbrake. The wheel then turns the car directly, its
  course comes round after its nose only slowly, and the two are held no further than 49° apart: a slide, not a spin.
  Its pace is kept (the course is turned, not braked). Let go, the wheels catch; a slide held 0.7 s ends in a
  **kick**: 13 km/h more for up to 1.7 s. With the wheel straight the brake is the brake as before.
- **What a slide looks and sounds like**: the car side on to its way (the camera follows the course, not the nose:
  `Game.rideCourse`), skid marks from the back wheels (`rides/skids.ts`: one mesh, a ring of 520 quads, fading after
  14 s), smoke off the back wheels, the body leaning out and squatting under power (`Motion.yaw`, `Motion.surge`),
  the tires' squeal and the air's rush (`audio.rush`), a rush of air at the kick. At its open-road pace the camera
  drops back about a tenth and the lens widens by 9°.
- **The boat slides too**: its stern steps out, a fan of spray is thrown up along its side (`Splashes.fan`), it heels
  hard over. At speed it slaps over a wave every few metres and over its own wake where it crosses the way it came:
  thrown up to 40 cm, spray to both sides as it lands.
- **Tight places.** Full lock up to 16 km/h (`CAR.lockHold`; a 2.6 m turning circle), and nearly stopped under power
  it comes round on the spot (`CAR.pivot`); it backs up at 22 km/h; against a wall it loses only what went into the
  wall and its nose comes round to run along it. Wedged for 2.4 s it is **set free gently**: it glides half a second
  to the nearest clear place with two car lengths of room ahead (`clearSpot`, `host.freed`); only if there is none
  does the picture fade and the street take it back. Measured by a simple driver at 80 places per town and in each
  town's narrow places (the squares, the forecourts, the street ends, the malecón's walk): right round in about 2 s,
  nowhere more than 5.
- **Nobody is touched, however it moves**: a move that would bring the body within 0.4 m of someone sitting or
  standing where they are, and nearer than it was, is not made (`peopleGap`); those who walk step out of its way, and
  if it stands across their way they turn back after a second instead of gathering round it (`Walker.boxT`).

### Voices

The lines are in the list both tools read. Maple Harbor: `tools/casting.ts` RIDERS (Gemini's prebuilt voices: Jess
Aoede, Walt Umbriel, Carol Pulcherrima, Pete Puck; calling Laomedeia, Gacrux, Achird, Algenib), `tools/enumerate.ts`
(48 clips, voice ids `g_ride_<id>`, `g_shout_f0…m1`). Puerto Colibrí: `tools/es-voices/casting-es.ts` RIDERS with
MEXICO and SPAIN picks and the settings `SCENES["rides"]` / `["rides:shout"]`, `lines-es.ts` (`--only=rides`: 144
clips, `es_` / `esn_` / `esp_` + `ride_<id>`, `shout_f0…m1`).

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
| `src/game/rides/skids.ts` | the marks a slide leaves |
| `src/ui/mapMarks.ts` | the boats and the convertibles on the round map |
| `src/game/world/rides.ts`, `src/content/rides.ts` | this town's plan; its people's lines and the things' names |
| `src/game/water.ts` | `seaBedY`, SWIM, BAY, `bayHold`, POOLS, FLOORS, `waterY` |
| `src/game/Game.ts` | `updateRide`, the swimming in `updatePlayer`, the prompts, `boardRide` / `leftRide` |
| `src/game/ambient.ts` | `rideBoxes`, `personAhead`, `carAhead`, `startle`, `pushOutOfCars` |
| `src/game/characters/Character.ts` | `busy` "wheel", "tiller", "doorL", "doorR"; `steer`; `swim`, `dive` |

## Tests

`tests/rides.test.ts` (the arithmetic, the plan, the water), `tests/browser/rides.mjs` (the real game, a computer and
a phone: a convertible taken, its owner's voice, driven, braked, over a kerb, left; the boat, the buoys, the swim,
the dive, back into the boat). The random driver and helmsman used for the round-2 audit are in the shared notes
(`rides/tools/audit2.js`, `audit-boat.js`).

## Left for later

- A car left in a traffic lane holds the traffic behind it until its owners have it back at its curb.
- The trial world styles (`StyledCharacter`) have no swimming pose: the character floats upright there.
