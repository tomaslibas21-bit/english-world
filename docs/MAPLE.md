# Maple Harbor in the fall (graphics round, 16 Nov 2026)

Item M1 of the 16 Nov plan: bring Maple Harbor's graphics up to Puerto Colibrí's, in the same toy style, with fewer
draw calls than before. `main` only; Puerto Colibrí is untouched.

## What was added

| Where | What | File |
|---|---|---|
| Whole town | Maples in fall colours (7 of 8 turned), a broader crown; fallen leaves under every tree and along Main Street's gutters; leaves coming down from the trees near the camera; raked piles | `town.ts` `addTrees`, `maple.ts` |
| Main Street | Bunting across the street on 16 slim poles (zigzag, it flutters), each pole with the town's banner (a gold or orange maple leaf on harbor blue or pine green) and a half-barrel of mums; brick sidewalks between the crossings; pumpkins by the shop doors | `maple.ts` |
| Every lamp post | Two hanging baskets of mums | `maple.ts` |
| Square | The lobster-roll truck on the west side (awning, a lobster on the roof, two standing tables, a menu board), planters round the fountain, hay bales, pumpkins and corn stalks at the market | `maple.ts` `addSquare` |
| Lighthouse | A stone foot, a door and windows towards the town, the gallery with its rail, the lantern's glazing bars, a finial | `maple.ts` `addLighthouse` |
| Harbor | Two lobster boats (one at the pier's west side, one out by the lighthouse), stacked traps on the sand both sides of the walkway, a rack of buoys, fish crates, rope, an upturned dinghy, oars; 40 lobster buoys out in the bay | `maple.ts` `addHarborGear` |
| Beach | Four pairs of painted chairs facing the sea, driftwood, beach grass along the promenade | `maple.ts` `addBeach` |
| Light | A warmer sun, a neutral fill from above, a warm bounce from the ground, a cream horizon, a warm haze | `theme.ts` `light`, read by `Game.setupLights` |
| Airport | Carpets where people queue and wait, a paved concourse with the town's leaf inlaid, queue barriers, four rows of seats, luggage carts, a coffee stand with two tables, planters at the door, the flag, a welcome mural; five more people (two on the arrivals seats, two at the gate, the barista) | `interiors.ts`, `roomPeople.ts` |
| Museum | Benches in front of the paintings, carpets, two sculptures in the new exhibition, a schooner model, a postcard spinner, plants, two more paintings | `interiors.ts` |
| Apartments | The hallway (runner, mailboxes, a bench, door mats); the kitchen Mr. Patel describes (stove, dishwasher, sink); a painter's ladder. The apartment stays unfurnished: he says so in s81 | `interiors.ts` |
| Dan and Nora's | A rug under the dinner table, books, a TV, an armchair and lamp, the fridge and cupboards, a sideboard, an evening window | `interiors.ts` |

## How it stays cheap

`Merger.build(parent, { name, cell, keep })` (`util.ts`) now bakes every plain-coloured shape (opaque one-sided Lambert,
no texture) into a few meshes that carry colour and glow in their vertices, one per 100 m of ground and shadow setting
(rooms: one or two for the whole room). Before, each colour was a mesh as wide as the town, drawn in every frame, twice
(picture and shadow map). The picture is the same. The road markings are one mesh instead of four.

New things with a draw call of their own: the fallen leaves, the leaves in the air, the bunting, the brick, the bay's
buoys, two boats, the truck's sign; indoors the airport's mural, the coffee stand's name and five people.

What the baking leaves alone: the pier's meshes (under water the town is put away but for them, `Game.ts`), the gas
station's canopy (`userData.thin`), glass, textured and see-through things, instanced props, the trial styles.

## Rules to keep

- A red maple leaf on white or cream is Canada's flag. The town's leaf is gold or orange, on blue or green.
- Things the camera should look through and nobody stands on get `userData.thin = true` (bunting, leaves).
- After adding decor near a sign: `tests/browser/signs.mjs` (docs/SIGNS.md). It runs with `WORLD_BROWSER_CHANNEL=chromium`.
- The lighthouse has no beam: two turning cones of light were tried and read as a pale tube in the daylight sky.
- Mr. Patel's apartment is unfurnished (s81). Don't furnish it.
- `theme.ts` `light` holds the daylight; the Spanish edition's file needs the same field when `main` is merged into it
  (the old values are in the comment there).
