# Puerto Colibrí's look: how the town is restyled

Maple Harbor's 3D town (src/game/world/) becomes Puerto Colibrí's in the Spanish edition, area by area. The rule is
the one for the whole edition: **one engine, never a copy**. The town builder stays shared; the Spanish edition
switches looks on through its theme, `src/editions/es/game/world/theme.ts` (the base `src/game/world/theme.ts` has
every switch off, so Maple Harbor is built exactly as before).

## Done: the zócalo and the mercado (the model area)

- **The kiosco** replaces the fountain in the middle of the square (`addKiosco` in town.ts): an octagonal stone
  platform with steps on the south side, green iron columns and railing, a red tiled cupola with a lantern. The
  pigeons peck round it; Rosa's bench, the chatting pair and Lucy keep their places.
- **Papel picado** from the kiosco's eaves to eight points round the square (`makePapelPicado`): cut-paper flags
  with holes, in one mesh, swaying a little.
- **Palms** at the square's corners and edges (`makePalms`): one instanced mesh with swaying crowns; a palm whose
  spot is taken by another solid thing is left out.
- **The stalls' signs** in Spanish (Flores, Frutas, Verduras, Pan dulce); the small white gazebo is gone.
- **Colours**: the buildings round the square and along the main street painted as in a Mexican Caribbean town
  (theme `buildings`); every sign carries the Spanish place name (theme `locationSigns`).
- **The Mercado Municipal inside** (`mercado()` in interiors.ts): Doña Lupe's fruit and vegetable stall where the
  supermarket's checkout is (her spot and the learner's are the same), produce, a scale, bananas on a beam, a chili
  and spice stall, a juice stand, groceries at the back, papel picado under the roof; the shoppers stand at the
  stalls (roomPeople.ts).
- **Draw calls** (phone size, the camera on the square; `game.renderer.info.render.calls`): see docs/es/REPORT.md.

## Town facts from the conversations

The conversations name places and say where they are; the 3D town must agree (and so must new conversations).

- **Calle Ceiba** runs along the zócalo. From the visitor center: right, two blocks to the bank (corner of Juárez and
  Ceiba), left into calle Ceiba (s62). On it, facing the zócalo: **Café La Ceiba** ("aquí en la plaza", s69) on the
  right, **Correos** opposite it, then the **mercado** after Correos; the bus **terminal** at the end of the street
  (s62). A cocina económica on calle Ceiba serves comida corrida (s69, s88).
- **The zócalo**: the kiosco (where a boy finds the wallet, s91a), Doña Mari's flower stall and the Saturday
  tianguis (s91a), the church (STYLE.md). The **Policía Municipal** is across the square, next to the **museum**
  (s62, s91a, s91b); the museum is open 10 to 5, closed on Mondays (s62, s69, s70).
- **Farmacia del Puerto** sits between the estética (s62) and the doctor's consultorio next door (s75).
- **The gas station**: the conversation happens outside at the pump, not in the shop (s71b; `locations.ts` still says
  interior).
- **La Cocina de Lucía** (s73), a Yucatecan restaurant: left out of the visitor center, one block, red awning, across
  from Boutique Hilos (s62). It is the Maple Harbor trattoria's building (location id `trattoria`); there is no
  Italian restaurant in town.
- **The arrivals hall**: Itzel's baggage desk, then customs with Agente Medina (`aduana`, a Spanish-only character on
  Officer Diaz's base) and the sniffer dog (s65b).
- **The airport**: flight 223 to Mexico City, check-in → security → sala 4 (boarding 7:30, departure 8:10) (s64a–c).
- **City bus route 7**: centro (zócalo), mercado, clínica, malecón / muelle, Hotel Mar Azul, the beach; $12 (s67b).

## How a restyling task is done

1. Read `src/game/world/layout.ts` (where everything is), `town.ts` (how the outdoors is built) or `interiors.ts`
   (the rooms), and the zócalo work above (search for `THEME` in those files).
2. Decide what is **data** (a colour, a sign, a list of positions: add a field to `TownTheme` in
   `src/game/world/theme.ts` with Maple Harbor's value as the default, and set Puerto Colibrí's in the Spanish theme)
   and what is **a new shape** (a new builder function in town.ts or interiors.ts, called only when the theme asks).
3. **Maple Harbor must not change**: the default theme switches your work off; new random draws come from a
   `rand(<new seed>)` of their own, never from `r()` (that would move every tree and stall after it).
4. Colliders: everything solid gets one (`col.addBox` / `col.addCircle`), and never on an NPC's spot, a talk spot
   (ax/az in layout.ts and interiors.ts), a door or a path between them.
5. Draw calls: put small things in one mesh (vertex colours: `colourMerge`, interiors' `smalls()`), reuse
   materials (`mat()` caches by colour; `Merger` merges by name). The town on a phone was 153–281 draw calls in
   Maple Harbor (docs/maple-harbor-master-plan "Phone performance"); a restyled area may add **at most 10%** at
   any camera spot in it. Texture-heavy things (signs) cost one draw call each: few.
6. Check it (docs/es/PLAN.md "Acceptance": the town checks), at desktop size and at phone size (375×812), with
   screenshots for the review.

## The tasks (in order)

Each task is one area; each ends with before/after screenshots at phone size and the draw-call numbers.

1. **The malecón and the beach** (south of Harbor Road, x -60…60, z -60…-72): the promenade becomes a malecón
   (a wide paved walk with a low white wall, benches, lamp posts with two lanterns), palapas (thatched umbrellas on a
   pole) and wooden loungers on the sand, lanchas (small open fishing boats, white with a coloured stripe) pulled up
   on the beach and at the pier instead of the yachts, a "Tours a los cenotes" kiosk (a small hut with a sign).
   El Muelle (the-pier): a palapa roof (thatch-coloured cone) over the restaurant.
2. **The main street's shops** (Main Street, z -8): the remaining facades in Mexican colours (rental, gas, clinic,
   gym, apartments), flat roofs with a parapet and "tinacos" (black water tanks) instead of the American roof kit,
   window bars ("protecciones") on the ground floor, hand-painted shop signs. The parked cars: a VW Beetle-like
   "vochito" and small sedans in Mexican colours (car.ts proportions).
3. **The church** on the zócalo: a parroquia with a bell gable (espadaña) or two towers, facing the kiosco from the
   north side of the square (between Harbor Road and the stalls: re-check the stalls and Lucy's spot) — or, if there
   is no room, at the square's east end beside the Policía Municipal. Ask the owner which before building it.
4. **Street furniture**: Spanish street signs ("Calle Ceiba", "Avenida del Puerto"), a "Sitio de Taxis" sign and a
   white-and-green taxi (Cancún's colours, made up), the bus stop as a "parada", topes (speed bumps) at the square,
   a tricycle food cart (a "triciclo" selling elotes or marquesitas) near the zócalo.
5. **The residential streets**: houses painted in bright colours, flat roofs, bougainvillea on the walls (one mesh),
   a corner shop ("tiendita") with a painted Coca-Cola-free sign.
6. **The airport inside**: the signs in Spanish and English ("Migración / Immigration", "Reclamo de equipaje /
   Baggage claim"), "Aduana" (customs) with the red-green traffic light, Mexican flags.
7. **Every room's signs and posters** (interiors.ts `sign(…)` and `textTexture(…)` calls): the English texts become
   Spanish through a theme map of `{ english text: spanish text }` (one field, `signs`), so each room keeps its code.
   The café's menu board, the bank's "Turnos", the pharmacy's "Consultorio médico", the post office's "Paquetería".
8. **Cenote and ruins** (optional, later): a cenote entrance at the west meadow (a hole with turquoise water and a
   wooden stair) for the visitor-center and local-tips conversations' destinations.

Not part of the restyle: the people's looks (they follow the owner's pictures when they come, as in Maple Harbor),
the town's layout (positions stay, so every conversation's walk, door and talk spot keeps working).
