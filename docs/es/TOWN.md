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

## Done: the outdoor town (4 Nov 2026, tasks 1–5, the vehicles and the sounds)

All of it is switched on by theme fields (src/game/world/theme.ts documents each one; Maple Harbor's values switch
everything off) and built by `src/game/world/mexican.ts` (new shapes) and a few theme checks in town.ts, car.ts,
ambient.ts, audio.ts and Game.ts. The solid pieces are merged into two vertex-coloured meshes (`town-mx`, which casts
shadows, and `town-mx-small`, which doesn't) and every new sign is a cell of one texture (`SignAtlas`, one mesh): the
whole restyle adds three meshes (four draw calls, with `town-mx`'s shadow) and takes away more than that (the roof
kits, a yacht, the chimneys, the mailboxes, the beach umbrellas' towels, the stop signs' octagons, the flags).

- **Task 1, the malecón and the beach** (`malecon`, `palapas`, `lanchas`): paving with its joints from Harbor Road's
  sidewalk to a low white wall with a stone cap and pillars, open where steps would go down to the sand (about every 24
  m) and where the pier's boardwalk crosses; benches facing the sea; the lamp posts along the beach carry two lanterns
  on an arm; palms instead of the street trees along the beach (the trees keep their random numbers, unseen); a "Tours a
  los cenotes" kiosk (a teal hut with a thatched roof and its painted sign) by the pier; a "Malecón" tile plaque; twelve
  palapas with two wooden loungers each instead of the four umbrellas; lanchas (white, a coloured stripe, an outboard)
  afloat by the pier and three pulled up on the sand instead of the yachts; Restaurante El Muelle under a palapa roof
  (BuildingLook `roof: "palapa"`).
- **Task 2, the main street's shops** (`buildings`, `mexican`, `parkedCars`): the car rental, the gas station, the
  clinic, the gym, the apartments, the bus terminal and El Muelle in Mexican colours (the trims and awnings reuse
  colours the square already has: each new one is a draw call everywhere in town); every flat roof painted red with a
  parapet and one to three tinacos (black water tanks; sometimes a white gas tank) instead of the vents, hatch, air
  conditioner and water tank on legs (the airport and the office tower keep theirs); iron bars on the ground floor's
  front windows (all round on the houses); the shops' and restaurants' signs painted by hand (a coloured board, outlined
  italic letters, little painted flowers); pale-trimmed buildings' printed signs in a dark ink (Correos was cream on
  cream); the hotel's and the post office's flags Mexican; the parked cars five vochitos and five small sedans in
  Mexican colours.
- **Task 3, the church** (`church`): a parroquia at the square's east end beside the Policía Municipal, facing the
  kiosco across the square: an ochre nave under a white barrel vault with buttresses and small arched windows, a facade
  with pilasters, an arched wooden door at the top of three steps and a round window, and an espadaña with three bells
  in two tiers and a cross. The bench that stood there is gone. Built there because the north side has no room
  without moving the stalls and Lucy (PLAN.md open question 2): if the owner prefers the north side, it is the
  theme's `church` (where its door is, which way it faces) plus moving the stalls.
- **Task 4, the street furniture** (`streetSigns`, `stopWord`, `taxi`, `busSign`, `topes`, `foodCart`, `townSigns`):
  blue street name blades at eight corners (see the town facts); ALTO on the stop signs; a "SITIO DE TAXIS" sign and a
  white-and-green taxi at the stand; "PARADA" at the bus stop; three topes (yellow and black) with their TOPE warning
  signs, two across Juárez at the square's ends and one across del Puerto; an elote cart (a tricycle with a steaming
  pot, a striped parasol and its painted sign, "Elotes · Esquites") on the square by Juárez; the outdoor posters and
  notices in Spanish (the museum's banners "Colores de la noche", the mercado's, the clinic's, the gym's hours from
  s35, "SE VENDE" on the convertible, "Fiesta → al patio").
- **Task 5, the residential streets** (`buildings`, `mexican`, `bougainvillea`, `tiendita`): the five houses in bright
  colours with flat roofs, parapets and tinacos, a low wall (barda) with an iron gate standing open instead of the
  picket fence, a potted plant where the mailbox stood (the same colliders), no chimneys; bougainvillea climbing beside
  the door and spilling along the top of the wall on the houses and on four buildings of the square and the main
  street (Café La Ceiba, La Cocina de Lucía, Información Turística, Estética Tijeras); "Abarrotes Las Palmas", a
  tiendita in the ground floor of Departamentos Las Palmas at its corner (s81, s82: "hay una tiendita en la esquina"):
  shelves of goods, a counter, the shutter rolled up, crates of bottles, its painted sign, and a painted sign on the
  side wall ("Refrescos · Botanas · Recargas"); no brand anywhere.
- **The vehicles** (`traffic`, car.ts): among the passing cars, the city bus of route 7 (s67b: white over turquoise, the
  7 lit in amber over the windshield; 9.6 m long, so the traffic's gaps and the player's collision follow each
  vehicle's length), a colectivo (a white van with a stripe and its route board) and two white-and-green taxis.
- **The sounds** (`sounds`, audio.ts `townSounds`): made on the spot like the gulls, no recordings: the church bell
  (three to six strokes every one and a half to two and a half minutes, louder near the church), the street vendors
  round the square (the knife grinder's pan pipe, the ice-cream cart's bells, the camote cart's steam whistle) and in
  the streets of houses the gas truck going by with its tune (a jingle of our own) or the garbage truck's hand bell
  (s82).
- **Cost** (`renderer.info.render`, the same 14 views at the same moments in both editions, quality "high"): the draw
  calls are 2–9% fewer than Maple Harbor's at every view but one (the church seen across the square on a phone, +3%);
  the triangles are 11–26% more (24 to 45 thousand: mostly `town-mx` drawn again in the shadow pass, the bougainvillea
  and the palms; the window bars are flat strips, the roof parapets and tinacos cast no shadow). Draw calls per view,
  Maple Harbor → Puerto Colibrí:

  | View | Desktop (1280×800) | Phone (375×812) |
  |---|---|---|
  | the zócalo from avenida Juárez | 200 → 187 | 168 → 159 |
  | the church across the square | 227 → 220 | 156 → 161 |
  | Juárez and Ceiba, east | 310 → 298 | 240 → 227 |
  | avenida Juárez, west | 227 → 209 | 212 → 195 |
  | Juárez and Itzamná, east | 215 → 202 | 179 → 168 |
  | the malecón and the beach | 131 → 126 | 131 → 128 |
  | along the malecón, west | 167 → 154 | 139 → 132 |
  | El Muelle | 145 → 137 | 144 → 136 |
  | the palapas | 117 → 108 | 101 → 94 |
  | the taxi stand | 169 → 163 | 154 → 151 |
  | the tiendita, calle Hidalgo | 214 → 207 | 155 → 144 |
  | Casa de Diego y Natalia | 182 → 168 | 165 → 150 |
  | calle Hidalgo, east | 235 → 218 | 179 → 166 |
  | Calle de los Cedros | 145 → 133 | 139 → 128 |

- **Maple Harbor unchanged**: the same 28 views of the English edition rendered before the change (from a copy of the
  base commit) and after it: pixel-identical (time and Math.random driven by hand, GPU rendering; a run now and then
  differs from any other by ±1 in one colour channel at a few scattered pixels, the same with unchanged code, so a
  check is repeated); a hash of the whole built town (all 1,085 objects' geometry, materials, transforms and canvas
  pixels, the colliders, seats and doors): identical; the English fingerprint (tools/fingerprint.ts): identical.
  Every switch is off in Maple Harbor and no new random number is drawn from the town's stream (the roof boxes'
  draws now happen only on roofs that are flat in layout.ts, which is where they always happened).
- **Pictures**: Maple Harbor above, Puerto Colibrí below, at phone size (the malecón, the church, avenida Juárez with
  route 7's bus, Calle de los Cedros):

  ![Before and after](img/outdoor-1-phone-before-after.jpg)

  | | |
  |---|---|
  | ![The church](img/outdoor-2-church.jpg) | ![The malecón](img/outdoor-3-malecon.jpg) |
  | The parroquia across the zócalo, a TOPE on avenida del Puerto | The malecón, a palapa, lanchas on the sand |
  | ![Roofs and signs](img/outdoor-4-roofs-signs.jpg) | ![The tiendita](img/outdoor-5-tiendita.jpg) |
  | Red roofs, tinacos, painted signs, a Mexican flag | Abarrotes Las Palmas, a vochito, a street sign |
  | ![The houses](img/outdoor-6-houses.jpg) | |
  | Calle de los Cedros: bardas, iron gates, bougainvillea | |

### What's left outdoors

- **The church's place** is the owner's to confirm (PLAN.md open question 2); moving it is the theme's `church` and,
  for the north side, the stalls.
- **The sounds** are made on the spot, like Maple Harbor's gulls and birds: recordings (a real church bell, a gas
  truck's jingle, vendors calling "¡Elotes!") would sound better, and would need the owner's files.
- Small things still as in Maple Harbor: the supermarket's shopping carts in front of the Mercado Municipal, the
  US-style blue mailbox at Correos, Ximena's white picket fence and string lights in the backyard (s63), the park's
  autumn-coloured trees (they can pass for flamboyanes and guayacanes), Station Road without a name.
- **Task 8, the cenote and the ruins**, is not started.

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
- **The streets' names** (on the signs since 4 Nov): **avenida Juárez** is Main Street (s62: the visitor center is on
  it), **calle Ceiba** Center Street (along the zócalo's west side; the bank is on its corner with Juárez; the bus stop
  on calle Hidalgo near it is "Parada · Calle Ceiba"), **avenida del Puerto** Harbor Road (the malecón runs along it),
  **calle Itzamná** East Street (from the zócalo's east end down to the sea, s62), **calle Flamboyán** West Street (by
  Departamentos Las Palmas: "un departamento en la calle Flamboyán", s65a) and **calle Hidalgo** Oak Avenue
  ("calle Flamboyán 23, entre Hidalgo y Juárez", s65b). Station Road has no name yet; calle Morelos (s76's dentist,
  "a una cuadra del zócalo") is not on the map.
- **The tiendita** is in the ground floor of Departamentos Las Palmas, on its corner with calle Flamboyán.

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

1. **Done (4 Nov).** **The malecón and the beach** (south of Harbor Road, x -60…60, z -60…-72): the promenade becomes a
   malecón (a wide paved walk with a low white wall, benches, lamp posts with two lanterns), palapas (thatched umbrellas
   on a pole) and wooden loungers on the sand, lanchas (small open fishing boats, white with a coloured stripe) pulled
   up on the beach and at the pier instead of the yachts, a "Tours a los cenotes" kiosk (a small hut with a sign). El
   Muelle (the-pier): a palapa roof (thatch-coloured cone) over the restaurant.
2. **Done (4 Nov).** **The main street's shops** (Main Street, z -8): the remaining facades in Mexican colours (rental,
   gas, clinic, gym, apartments), flat roofs with a parapet and "tinacos" (black water tanks) instead of the American
   roof kit, window bars ("protecciones") on the ground floor, hand-painted shop signs. The parked cars: a VW
   Beetle-like "vochito" and small sedans in Mexican colours (car.ts proportions).
3. **Done (4 Nov), at the east end.** **The church** on the zócalo: a parroquia with a bell gable (espadaña) or two
   towers, facing the kiosco from the north side of the square (between Harbor Road and the stalls: re-check the stalls
   and Lucy's spot) — or, if there is no room, at the square's east end beside the Policía Municipal. Ask the owner
   which before building it.
4. **Done (4 Nov).** **Street furniture**: Spanish street signs ("Calle Ceiba", "Avenida del Puerto"), a "Sitio de
   Taxis" sign and a white-and-green taxi (Cancún's colours, made up), the bus stop as a "parada", topes (speed bumps)
   at the square, a tricycle food cart (a "triciclo" selling elotes or marquesitas) near the zócalo.
5. **Done (4 Nov).** **The residential streets**: houses painted in bright colours, flat roofs, bougainvillea on the
   walls (one mesh), a corner shop ("tiendita") with a painted Coca-Cola-free sign.
6. **The airport inside**: the signs in Spanish and English ("Migración / Immigration", "Reclamo de equipaje /
   Baggage claim"), "Aduana" (customs) with the red-green traffic light, Mexican flags.
7. **Every room's signs and posters** (interiors.ts `sign(…)` and `textTexture(…)` calls): the English texts become
   Spanish through a theme map of `{ english text: spanish text }` (one field, `signs`), so each room keeps its code.
   The café's menu board, the bank's "Turnos", the pharmacy's "Consultorio médico", the post office's "Paquetería".
8. **Cenote and ruins** (optional, later): a cenote entrance at the west meadow (a hole with turquoise water and a
   wooden stair) for the visitor-center and local-tips conversations' destinations.

Not part of the restyle: the people's looks (they follow the owner's pictures when they come, as in Maple Harbor),
the town's layout (positions stay, so every conversation's walk, door and talk spot keeps working).
