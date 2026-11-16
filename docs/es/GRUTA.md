# The grotto under Cenote Ka'an (15 Nov 2026)

A hidden Maya world one swims into through the cave's mouth at the cenote's far side: light through the cenote's eye
onto a great ceiba, turquoise water that glows, hanging roots, fireflies, glow-worms, old glyph stones along a sacbé,
small falls, and at the end the Yaxché, the tree that holds up the world, which flowers when its heart is found. It is
a reward and a place to wonder at, and it teaches Spanish three ways, together:

1. **Aluxes** (small spirits of the Maya forest, friendly and full of mischief) keep its ways, and one talks with them
   to get through, in the game's own conversations: **Kin** at the way in (x02: who are you, where from, why did you
   come; one asks him the way to the stones and he gives true directions), **Nikté** on the bridge of roots in the
   third chamber (x03: two riddles to cross).
2. **A listening quest.** Every chamber has three glyph stones. Each says, in the learner's own coach voice, a line
   of its own about the place (`src/game/cave/stones.ts`, since 17 Nov 2026; the owner: "more vibe of the magical
   cenote, not about a latte"): "El agua guarda la memoria.", "Sigue la luz de las luciérnagas.", "El río conoce el
   camino.", "Los mayas leían el cielo.", "El árbol sagrado sostiene el mundo."… Short (A1–A2), the same words in the
   three Spanishes, each with its meaning and a word-by-word gloss in English and Lithuanian. The stones call one at
   a time from where they stand: louder as one gets near, to the left or the right as they lie. At a stone (E, or the
   phone's button) its card opens: the stone says its line; the learner picks what it means out of three (the other
   stones' meanings) or says it back into the microphone; the glyph turns from pale blue to gold, and the line shows
   with its gloss under each word. A stone whose clip is not there yet (before the upload) says one of the learner's
   own phrases instead, as the stones did until then: no stone stands silent.
3. **Each room's puzzle opens the next.** The first chamber is open to everyone. A chamber's gate opens the moment
   its three stones are lit (with a chime, a burst of light and "The way is open"). Nothing from the town is asked
   for. (Until 16 Nov 2026 the gates also waited for 10/20/30/40 of the town's conversations; the owner lit all three
   stones of the first hall and found the way shut: "I can't pass after talking to all 3". The count is gone, and so
   are its toasts in the town and down here.) The card at the top left says which chamber one is in, how many stones
   are lit, how many chambers are open, and what comes next ("Find the stones by their voices: 1 to go", "The way is
   open: “El Jardín de Raíces”"); a shut gate one walks up to says why.

To look round all of it at once (the owner, a tester): add `gruta=all` to the page's address (`?gruta=all`, or
`&gruta=all` after a `?t=…`, or `#gruta=all`): every gate is open, whatever is done.

## The chambers

| | Chamber | Opens when | What is there |
|---|---|---|---|
| 1 | La Sala del Agua | always (Kin's gate: his conversation) | the way in from the water; Kin and his little hut; the ceiba under the cenote's eye and its shaft of light; the lagoon on the right; the falls at the far end |
| 2 | El Jardín de Raíces | the first hall's three stones are lit | pillars of roots, mushrooms that glow, the most fireflies, a small pool and falls |
| 3 | El Río Escondido | the garden's three stones (Nikté's bridge: her riddles) | a river wall to wall; Nikté on its bridge of roots; the stones are on the far bank |
| 4 | La Sala de las Estrellas | the river's three stones | crystals, a wall of old glyphs, glow-worms and their beaded threads hanging from the roof |
| 5 | El Corazón de Ka'an | the hall of stars' three stones | a round lake one wades through, an island, the Yaxché with strands of flowers hanging over the water; lit, its three stones make it flower |

Kin's directions (x02) are tested against the plan: the first stone is to the left of the tree, the second on the
right near the water, the third at the far end beside the falls (`tests/es/cave.test.ts`).

## How it is built (`src/game/cave/`)

| File | |
|---|---|
| `plan.ts` | the plan and the rules, no three.js: chambers, passages, gates, pools, stones; `inside`, `roofY`, `floorY`, `walkable`; `gateState`, `nextStep`, `chambersOpen`; the stones' phrases (`pickPhrases`), the three meanings (`meaningChoices`), saying it back (`saidBack`), how a stone is heard (`heard`) |
| `Cave.ts` | how it looks, and its colliders (`CaveColliders`: the rock's walls, the pools' rims and the trees come from the plan) |
| `quest.ts` | `CaveQuest`, while someone is down there: which stone calls, the stone's card, lighting stones, opening gates, the card at the top left; saved in `progress.cave` (`CaveSave`: `lit`, `passed`, `heart`) |
| `index.ts` | the zone `gruta` (`getCave`), the cave's mouth in the town (`caveDoor`), the glow that shows from the cenote (`caveLure`) |
| `src/ui/Cave.tsx` | the two cards (`CaveCard`, `GlyphCard`); their styles at the end of `styles.css` |

It is switched on by the theme: `cenote.grotto` (`src/editions/es/game/world/theme.ts`). Maple Harbor has none.

**A zone that is no room.** `Interior.wild` (interiors.ts) is new: a place walked and run through with the follow
camera, in its own fog and light, on a ground plan and a floor of its own (`walkable`, `floor`: fords one wades
through ankle-deep, the island), with its own camera space (the camera stays inside the rock and under the roof) and
its own lean (lower than the town's, so the hall shows). `Game.ts` asks `this.room` (a room) or `this.wild` where it
used to ask `zone.interior`. One goes in at the cave's mouth (the prompt, or by swimming on into it) and out by
wading back into the water one came up through; a reload down there comes back down there.

**Cheap on a phone, by design.** Measured on the emulated cheap phone (412×915, dpr 2.625, CPU ×4, quality high):

| | draw calls | triangles | the game's work a frame |
|---|---|---|---|
| the town: the zócalo | 100 | 260,000 | 5.5 ms |
| the town: avenida Juárez, west | 114 | 262,000 | 5.1 ms |
| the grotto: the way in | 13 | 58,000 | 1.5 ms |
| the grotto: the hall of water | 12 | 53,000 | 1.6 ms |
| the grotto: the garden of roots | 12 | 50,000 | 1.4 ms |
| the grotto: the hall of stars | 11 | 39,000 | 1.3 ms |
| the grotto: the heart | 9 | 24,000 | 1.2 ms |

- Everything that stands still (rock, trees, roots, mushrooms, crystals, stelae) is **one mesh per chamber** (five;
  only the chamber one is in and its neighbours are in the picture). Its light is worked out once, as it is built,
  into the vertices' colours (the warm shaft against the water's turquoise; lamps at the water, the falls, what
  glows); the material is unlit.
- All the water is one mesh with a small shader; all the light shafts one; all the glyphs one (their colours are a
  vertex attribute: lighting a stone changes six numbers); the falls one; a gate's veil one each, gone once open.
- Fireflies, motes in the light, glow-worms, the falls' mist, the soft halos round what glows and the sparks of a
  burst are **one set of points moved in the vertex shader**: nothing per frame on the processor but the clock.
- Fog closes the view after a few dozen metres. No lights are added; the people are lit by the game's own two, in the
  place's colours, and their shadows fall on a sheet that only takes shadows (the fine quality; the simple one has
  its blobs).
- From the town, the grotto costs nothing: it is built the first time someone goes in, and the glow in the cave's
  mouth (two small meshes) is left out of the picture beyond 70 m.

**Sound** (`audio.ts`): `callFrom` (a recorded line from a place in the world: its loudness and side follow `at()`
while it plays, with a little echo; on the world's bus, so silent in a conversation or under a panel), `cave`
(the place's own quiet, made on the spot: drips with their echo, a low breath of air, a falls' hush by the falls,
two soft notes now and then), `chime` (a stone lit, a gate opened, the heart).

## The aluxes' conversations

`src/editions/es/content/situations/x02-alux-kin.ts`, `x03-alux-nikte.ts`: conversations like the town's own (three
Spanishes, the English and the Lithuanian layers, glosses, notes, phrase cards, sims, corpora), but **off the route**:
`SituationDef.bonus`. `src/content/route.ts` `ROUTE` is what the interface lists and counts and what the tasks go
through (the town's own: fifty-one with the surf school's x01); `SITUATIONS` is every conversation (the tools, the
checks, the voices). Files `xNN-….ts`
(`tools/gen-index.ts`). When an alux lets the learner pass, the conversation fires `alux-pass` with its gate
(`{ gate: "kin" }`), which `Game.onSessionEvent` hands to the quest. Finishing one never moves the town's task.

Their people: `alux_kin`, `alux_nikte` (`src/editions/es/content/npcs.ts`: half a person's height, barefoot; Kin's
straw hat is not to be touched), the place `gruta`. Voices: `tools/es-voices/casting-es.ts` (gentle, bright, a
little magical; three sets).

**Their pictures** (15 Nov 2026; docs/es/PICTURES.md section 10): Kin's 35 and Nikté's 36, drawn from the 3D grotto (his
post on the white path, La Sala del Agua with the stones where the plan has them, her bridge of roots), most of them
shown by line: each of his directions and answers, each riddle, clue and answer. So the picture / 3D chip and the
pictures-only mode work down here too.

## The cenote from whichever side (15 Nov 2026, afternoon)

The owner: "when you're trying to enter near the cenote, maybe we could make it easier to enter through whichever
direction … it's just like explore something." The grounds are `src/game/cave/grounds.ts` (theme `cenote.open`; the
older single way is still `mexican.ts` `cenoteWalk` for a town without it).

**Into the cenote.** The meadow's whole west edge is open (not only where the sacbé leaves the town), and the jungle
closes the grounds at the north, the south and the west: what looks open is open, what stops one is a crown of jungle
or a rock. Down to the water:

| Way | Where | How |
|---|---|---|
| the deck | town side (east) | as before: the sacbé, the deck, its steps into the water |
| **La Playita** | north-east | a fan of sand through a gap in the rim's stones; one wades in |
| **Los Escalones** | south-east | four flat rocks down through the other gap |
| **El Salto** | the cliff's top, west | a stair of ten stones up the cliff's back from the jungle side, a ledge 4.6 m over the water with two posts and a rope; one walks or jumps off and lands swimming |

A trail of pale stepping stones leaves the sacbé by the taquilla and goes round the jungle side past all of them.

**Into the grotto**, three ways (`grounds.ts` `ways()`; `Game.enterCave`):

| Way | Found by | Going in | Coming out |
|---|---|---|---|
| **the cave's mouth** | swimming | swim into the dark under the cliff (as before) | by the water: up in the cenote at the mouth |
| **La Grieta** (the cleft) | walking: on the trail, south-west of the water | a slit in the cliff's back; E / the phone's button; one comes out where its passage meets the way in, facing Kin | back out through the cleft ("Out through the cleft"), onto the trail |
| **El Ojo** (the eye) | walking: on the trail, north-west, among roots | a sinkhole; walk into it or "Jump down"; one falls 6 m into the first hall's water through a skylight | by the water (at the mouth), or the cleft |

Leaving by the water after coming in through the cleft or the eye brings one up at the mouth: the water goes there,
and the cleft is the dry way back. The grotto has two exits now (`plan.ts` `EXITS`, the zone's `exits`) and three
places to arrive (`SPAWNS`); a reload down there comes back where one stood, as before.

**How the ways are shown** (`groundsGlow`, the group "gruta-lure": three small meshes, drawn within 80 m): a glow in
each way in, fireflies round it (at El Ojo a column of them rising out of the hole), and a small standing stone
with a glowing glyph beside each, the same glyphs as the stones below. The first time one comes near each, a tip says
what it is (the mouth's as before; "Something glows in a cleft in the rock…"; "Light rises from a hole among the
roots…"): only until the grotto has been seen once. Within 14 m of a way in one hears the grotto's own quiet (drips,
the low breath of air), louder the nearer. The first-time card down there is the same whichever way one came.

**Engine pieces.** FLOORS for the gaps, the stair and ledge and the pit (the ground mesh is flat and opaque: what
goes below it is not seen, so the sand and steps are drawn at the ground's level and the floor drops to the pool's
bed under the water); the way-finding's grid and the camera's field reach 50 m west of the town's edge when the
grounds are open, so a tap on the ground walks there (around El Ojo the grid costs more: the tap-walk goes round it
unless one taps into it); `Interior.wild` has `exits[]` and `spawns{}`; `Game.dropIn` (arriving from above);
`audio.cave(…, { level })`; the climbing check (`climbAudit(…, open)`, `tests/browser/climb.mjs`) is given the grounds'
rectangle (`groundsBounds`): "nobody gets out of the town" counts the grounds as in and covers them; their three
edge boxes are tagged `"edge"` (never jumped onto, however low the jungle on them).

## The conversation's camera down there (15 Nov 2026, evening)

The owner, on his iPhone: Kin's conversation showed "some weird color instead of … the 3d person": a dark teal
surface. It was rock seen from inside. On an upright phone the 3D picture is only a strip above the conversation
(`talkPictureHeight`), and its field of view sideways is about 24°: from the side, two people need the camera five or
six metres off. Kin stands in the way in, a passage five metres wide, where the rock lets the camera two metres to the
side. The town's search (`fitTalk`) then backs off and rises until everyone fits; the cave's clamp kept "at least 35%
of the asked distance", so at 30 m asked the camera stood ten metres through the wall and above the roof. A computer's
picture is wide enough that the first framing fitted, so it only showed on phones; Nikté's hall is wide, so only Kin.

`Game.fitTalkWild` (any `Interior.wild` place): the camera is only put where the place's own `space` says it is in the
open (`inside`: walls, roof, pillars), the way to each face is clear (`free`), and the player does not stand in front
of whom they speak with. It tries, in this order: from the side (as in the town), then round towards the player's
shoulder (70°, 52°, 36°, 24° from straight behind them, either side: in a passage that is back along it), last a
little past side-on; at each angle the usual distance, then further (to 13 m), then nearer; three heights (lower under
a low roof). The first place where everyone's head and chest fall in the picture wins. If none shows both, the same
search for the person spoken with alone, looked at themselves; if the rock leaves nowhere, as near the usual place as
it lets the camera go.

No picture/3D chip shows in these conversations: the chip is only where a conversation has illustrated scenes
(x01–x03 have none yet).

**Light mode** has no 3D picture. Behind a conversation with no illustrated scene (La Ola's x01-surf; the aluxes are
not reached in light mode: off the route, met only down there) its call screen showed an initial in a circle; it now
shows the person's head and shoulders, drawn once from their 3D figure (`src/game/portrait.ts`: one 360 px frame on a
renderer of its own, then let go; loaded with the figures' code only when such a conversation starts; the initial
stays until it is there and where it cannot be drawn).

## Round 4 (16 Nov 2026): the owner's play-through

- **Kin's "¿De dónde vienes?"**: a Lithuanian learner (es-lt) sees Lithuania first, among the country chips and in the
  example answers ("Soy de Lituania."), as in the town's s69; English speakers (SME) keep their own first (the USA,
  Canada, the UK).
- **Answers that fit the question.** At Kin's "¿Tienes otra pregunta?" / "¿Algo más?" the first suggestions are now
  "No, gracias." / "Está bien, gracias." / "No, eso es todo." / "Sí: ¿qué hago con las piedras?" (each understood:
  the no's let the learner through, the yes asks), then what to do with the stones and other questions. Nikté's
  "¿Jugamos?" offers "¡Sí, vamos!" first. Her "¿Quieres una pista?" already offered yes and no.
- **The gates**: the stones only (above).

## Tests

- `tests/es/cave.test.ts`: the plan (everything stands where one can walk; one can walk from the way in to the heart;
  the river is crossed only by the bridge; Kin's directions are true), the rules (which chambers open when; a gate's
  state; what the card says), the stones' phrases, the three meanings, saying it back, how a stone is heard; the
  aluxes' conversations are off the route.
- `tests/browser/cave.mjs`: the real game, a computer and a phone: swimming into the cave's mouth; Kin's gate holds
  until his conversation is talked through (really talked: five typed answers); a stone's card, a wrong meaning, the
  right one; the second chamber's gate shut with two stones lit, and open the moment the third is answered on its
  card, with nothing of the town's route finished; through it; out by the water; a reload down there.
- `tests/browser/cave-talk.mjs`: the real game at 375×812, 375×667 and 1280×800: Kin spoken to from the water, from
  the cleft's side, across the passage and from past his gate, Nikté from the bridge's end and from beside her: the
  camera in the open, the way to their face clear, their head and chest inside the part of the screen the
  conversation leaves free. And light mode on a phone: La Ola's conversation shows Nayeli's drawn face.
- `tests/es/cave.test.ts` "the cenote's grounds": from the town's edge one reaches the water by the deck and both
  gaps, the ledge by its stair, the cleft and the eye on foot; the edge is open all along; the trail's stones stand on
  open ground; the grotto's exits and arriving places are inside its plan.
- `tests/browser/cenote-ways.mjs`: the real game, a computer and a phone, **walked from the end of avenida Juárez with
  taps on the ground, no teleport**: across the meadow north of the sacbé, down La Playita, swum to the mouth, in, out
  by the water; across the meadow at the south, along the trail to La Grieta, in, out through the cleft; round the
  north to the stair, up to El Salto, off the ledge into the water, out by Los Escalones, to El Ojo, dropped in.
  `--shots=<dir>` keeps a picture of each step.

## Left for later

- The stones' card has no pictures; a phrase's card picture (the course's phrase cards) could show once it is lit.
- Nothing to do at the heart after it flowers but look; a later round could hide a sixth thing for every conversation finished.
- The aluxes stand where they are; they could walk a few steps, or hide and peek.
- Real phones' graphics cards were not measured (the halos are additive sprites: kept few and capped in size).
