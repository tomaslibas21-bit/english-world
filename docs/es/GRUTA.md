# The grotto under Cenote Ka'an (15 Nov 2026)

A hidden Maya world one swims into through the cave's mouth at the cenote's far side: light through the cenote's eye
onto a great ceiba, turquoise water that glows, hanging roots, fireflies, glow-worms, old glyph stones along a sacbé,
small falls, and at the end the Yaxché, the tree that holds up the world, which flowers when its heart is found. It is
a reward and a place to wonder at, and it teaches Spanish three ways, together:

1. **Aluxes** (small spirits of the Maya forest, friendly and full of mischief) keep its ways, and one talks with them
   to get through, in the game's own conversations: **Kin** at the way in (x01: who are you, where from, why did you
   come; one asks him the way to the stones and he gives true directions), **Nikté** on the bridge of roots in the
   third chamber (x02: two riddles to cross).
2. **A listening quest.** Every chamber has three glyph stones. Each says, in the learner's own coach voice, a phrase
   the learner already knows: their phrasebook's (the newest first), and before they have any, the greetings every
   conversation shares. The stones call one at a time from where they stand: louder as one gets near, to the left or
   the right as they lie. At a stone (E, or the phone's button) its card opens: the stone says its phrase; the learner
   picks what it means out of three, or says it back into the microphone; the glyph turns from pale blue to gold.
   It uses the clips that exist: no new voices.
3. **A reward for the town's conversations.** The first chamber is open to everyone. A chamber's gate opens once its
   three stones are lit **and** the learner has finished enough of the town's conversations: 10 for the second
   chamber, 20, 30, 40 for the fifth. The card at the top left says which chamber one is in, how many stones are lit,
   how many chambers are open, and what comes next ("“El Jardín de Raíces” opens after 10 conversations in town (so
   far: 4)"); a shut gate one walks up to says why.

To look round all of it at once (the owner, a tester): add `gruta=all` to the page's address (`?gruta=all`, or
`&gruta=all` after a `?t=…`, or `#gruta=all`): every gate is open, whatever is done.

## The chambers

| | Chamber | Opens after | What is there |
|---|---|---|---|
| 1 | La Sala del Agua | 0 | the way in from the water; Kin and his little hut; the ceiba under the cenote's eye and its shaft of light; the lagoon on the right; the falls at the far end |
| 2 | El Jardín de Raíces | 10 | pillars of roots, mushrooms that glow, the most fireflies, a small pool and falls |
| 3 | El Río Escondido | 20 | a river wall to wall; Nikté on its bridge of roots; the stones are on the far bank |
| 4 | La Sala de las Estrellas | 30 | crystals, a wall of old glyphs, glow-worms and their beaded threads hanging from the roof |
| 5 | El Corazón de Ka'an | 40 | a round lake one wades through, an island, the Yaxché with strands of flowers hanging over the water; lit, its three stones make it flower |

Kin's directions (x01) are tested against the plan: the first stone is to the left of the tree, the second on the
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

`src/editions/es/content/situations/x01-alux-kin.ts`, `x02-alux-nikte.ts`: conversations like the other fifty (three
Spanishes, the English and the Lithuanian layers, glosses, notes, phrase cards, sims, corpora), but **off the route**:
`SituationDef.bonus`. `src/content/route.ts` `ROUTE` is what the interface lists and counts and what the tasks go
through (fifty); `SITUATIONS` is every conversation (the tools, the checks, the voices). Files `xNN-….ts`
(`tools/gen-index.ts`). When an alux lets the learner pass, the conversation fires `alux-pass` with its gate
(`{ gate: "kin" }`), which `Game.onSessionEvent` hands to the quest. Finishing one never moves the town's task.

Their people: `alux_kin`, `alux_nikte` (`src/editions/es/content/npcs.ts`: half a person's height, barefoot; Kin's
straw hat is not to be touched), the place `gruta`. Voices: `tools/es-voices/casting-es.ts` (gentle, bright, a
little magical; three sets).

## Tests

- `tests/es/cave.test.ts`: the plan (everything stands where one can walk; one can walk from the way in to the heart;
  the river is crossed only by the bridge; Kin's directions are true), the rules (which chambers open when; a gate's
  state; what the card says), the stones' phrases, the three meanings, saying it back, how a stone is heard; the
  aluxes' conversations are off the route and the route is fifty.
- `tests/browser/cave.mjs`: the real game, a computer and a phone: swimming into the cave's mouth; Kin's gate holds
  until his conversation is talked through (really talked: five typed answers); a stone's card, a wrong meaning, the
  right one; the second chamber's gate shut with three stones lit and nothing finished in town, open with ten; out by
  the water; a reload down there.

## Left for later

- The stones' card has no pictures; a phrase's card picture (the course's phrase cards) could show once it is lit.
- Nothing to do at the heart after it flowers but look; a later round could hide a sixth thing for all fifty.
- The aluxes stand where they are; they could walk a few steps, or hide and peek.
- Real phones' graphics cards were not measured (the halos are additive sprites: kept few and capped in size).
