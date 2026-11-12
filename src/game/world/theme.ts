// How the town looks in this edition (docs/es/TOWN.md). This is Maple Harbor: every switch is off and every list
// empty, so its town is built exactly as layout.ts and town.ts describe it, but for the two it took on 5 Nov 2026
// (main 3e6ac17c, 996a8672): the conversation's camera and the room spots that bring far speakers into its picture.
// The Spanish edition's file (src/editions/es/game/world/theme.ts) turns the square into a zócalo with a kiosco,
// papel picado and palms, paints the buildings in Mexican colours, puts the Spanish names on the signs and the market
// hall's stalls inside, and makes the rest of the town outdoors Mexican too (the fields after `market`; their shapes
// are in mexican.ts), down to the last details (the fields after `sounds`: the conversation's camera, people's spots
// in the rooms, props, the cenote).

export interface BuildingLook {
  color?: string; trim?: string; awning?: string; roofColor?: string;
  /** Another roof than layout.ts's: a flat one, or a palapa (a thatched hip roof). */
  roof?: "flat" | "gable" | "palapa";
}

/** What drives past (Ambient): Maple Harbor's cars, or a town's own vehicles. */
export type Vehicle = "car" | "taxi" | "colectivo" | "bus";

/** Someone standing outdoors (layout.ts OUTDOOR_NPCS): where, facing which way, and where the player stands to talk. */
export interface OutdoorSpot { npc: string; x: number; z: number; rot: number; ax?: number; az?: number }

export interface TownTheme {
  // --- the rooms (interiors.ts) and the conversations' spots (docs/es/TOWN.md tasks 6 and 7) ---
  /** The rooms' signs and posters: an English text (interiors.ts `sign()`, `textTexture()`, the words on its posters)
   *  → this edition's text. A "\n" makes a sign of two lines, the second one smaller (the airport's Spanish over
   *  English). Texts not listed stay as they are. */
  signs: Record<string, string>;
  /** The rooms' boards, by the English board's title: this edition's title and rows (a menu's "dish|price", the
   *  departures board's "time|destination|platform|status"). */
  boards: Record<string, string[]>;
  /** Lucia's room: Maple Harbor's Italian trattoria, or a Yucatecan restaurant (La Cocina de Lucía). */
  restaurant: "trattoria" | "yucateco";
  /** This edition's additions to the rooms, each built only when switched on. */
  roomExtras: {
    /** The airport's arrivals hall: customs after the baggage desk (the `aduana` officer, the lanes, a sniffer dog). */
    customs?: boolean;
    /** Mexico's flag in the rooms (the airport, the police front desk) instead of the United States'. */
    mexicanFlag?: boolean;
    /** The bank: the turn-ticket machine by the door ("Turnos"), the turn display and the dollar's rate. */
    bankTurns?: boolean;
    /** The pharmacy: the door to the doctor's office next door (a consultorio). */
    pharmacyDoctor?: boolean;
    /** The museum: the stairs up to the new exhibition (upstairs, on the right). */
    museumStairs?: boolean;
    /** Diego and Natalia's dinner: cochinita pibil, tortillas and agua de jamaica instead of the lasagna; Michi the cat. */
    yucatanDinner?: boolean;
    /** (graphics round 5) The tall rooms' upper walls (theme.ts roomWallH): high windows with iron bars and a painted
     *  greca under the vigas. */
    upperMx?: boolean;
    /** (graphics round 5) The last of Maple Harbor's furniture in the shops replaced: Hilos' wooden racks of huipiles
     *  and dress forms, El Faro's tiendita shelves of bags, jars and cans, the car rental's equipales. */
    shopsMx5?: boolean;
    /** The clothes shop: a white linen guayabera on a mannequin by the door. */
    guayabera?: boolean;
    // graphics round 2 (docs/es/TOWN.md "Graphics, round 2")
    /** Departamentos Las Palmas (s81, s82, p29): talavera number tiles, the minisplit on the wall instead of the
     *  radiator (p29: "el aire no enfría"), bars on the windows, a ceiling fan, the garrafón, plants in clay pots. */
    lasPalmas?: boolean;
    /** The hotel's lobby as a beach hotel's: talavera on the desk's front, rattan furniture, a zarape runner, potted
     *  palms, ceiling fans, windows on the sea, a hammock. */
    hotelMx?: boolean;
    /** The police: a shield with a hummingbird on the rug instead of the star, the "Denuncias" window. */
    policeMx?: boolean;
    /** The museum's permanent collection: Maya stelae, a chac mool, painted vases and a model of the ruins. */
    museumMaya?: boolean;
    /** The airport: a mural, a step-fret frieze, potted palms, the ground transport desk, a souvenir stand, bigger signs. */
    airportMx?: boolean;
    /** The clinic: the garrafón instead of the water cooler, ceiling fans, waiting chairs, plants in clay pots. */
    clinicMx?: boolean;
    /** The shops' Mexican touches: rebozos, embroidered blouses and straw hats (Hilos), a little altar and a fan
     *  (Estética Tijeras), garrafones (Tienda El Faro), a palm and a fan (Renta de Autos). */
    shopsMx?: boolean;
    /** Café La Ceiba: conchas and pan dulce in the case, talavera on the counter, jarritos on the wall, fans. */
    cafeMx?: boolean;
    /** El Muelle: thatch under the ceiling, a fishing net, chairs in bright colors, string lights, the catch of the day. */
    muelleMx?: boolean;
    // graphics round 3 (docs/es/TOWN.md "Graphics, round 3")
    /** The places the conversations send people to: the airport's café and restrooms between check-in and security
     *  (s64a), an ATM in the bus terminal's hall (s67b), the museum's paquetería by the entrance with the restrooms past
     *  it, its elevator on the left and its café by the shop at the exit (s70), the restroom door at the back on the left
     *  in Café La Ceiba (s72) and at the back on the right in La Cocina de Lucía (s73). */
    services?: boolean;
    /** The bus terminal's hall as a Mexican one: route 7's city bus at its bay (the town's own bus, white and teal, its
     *  number lit) instead of a blue box, a shoeshine stand, the drinks and the snacks of a terminal. */
    terminalMx?: boolean;
    /** The rest of the rooms made Mexican: a minisplit on the wall where it's hot, the garrafón instead of a water
     *  cooler, Mexico's flag in the post office, a báscula by the pharmacy's door, a luchador on the gym's wall, a hammock
     *  at Brotecito, the souvenirs of the Caribbean at the tourist information (no maple syrup), the mercado's flowers,
     *  piñatas and comal. */
    roomsMx?: boolean;
    // graphics round 4 (docs/es/TOWN.md "Graphics, round 4")
    /** The shops as Mexican shops from the door: each one's goods and its painted signs with prices in pesos where a
     *  phone looks (Hilos' wall of hats and huipiles, the estética's price list, El Faro's fuel prices and ice chest, the
     *  car rental's rates and the Riviera Maya's poster), talavera on the counters' fronts, rugs woven as zarapes. */
    shopsMx4?: boolean;
    /** The clinic as a Mexican consultorio: the reception counter and a waiting row near the door, "Lávate las manos",
     *  the hours and the doctor's plaque on the back wall, a garrafón with its cups by the reception. */
    clinicMx4?: boolean;
    /** The bank's floor: a compass rose inlaid in its granito instead of the round seal with a star. */
    bankMx?: boolean;
    /** The big halls (the airport, the museum, the hotel) and the homes: woven rugs and benches where the phone's view
     *  is pale floor, the hotel's hammock hung across a corner instead of flat on the wall, El Muelle's walls. */
    hallsMx?: boolean;
    /** (graphics round 6) the pharmacy, the clinic, the offices, the gym and the police dressed as a Mexican town has
     *  them (rooms6: a suero fridge and a vitrina, a planter of talavera, a boxing ring and costales, plastic chairs and
     *  a standing fan, piñatas and papel picado, a futbolito), ceiling fans; the airport's halls a planter with bancas
     *  each side of the way in and its high windows clear of the welcome frieze; the car rental's equipales where the
     *  door shows them. */
    rooms6?: boolean;
  };
  /** People who stand outdoors in this edition (added to layout.ts OUTDOOR_NPCS; a room that has them leaves them out). */
  outdoorNpcs: OutdoorSpot[];
  /** Cars parked for a conversation (added at the end of layout.ts PARKED_CARS, so `parkedCars` below can give them a
   *  look): x, z and heading. */
  spotCars: [number, number, number][];
  // --- the town outdoors (town.ts) ---
  /** The middle of the square: Maple Harbor's fountain, or a kiosco (a bandstand on a platform). */
  centrepiece: "fountain" | "kiosco";
  /** The small white gazebo on the square's east side. */
  gazebo: boolean;
  /** Colours by building id (layout.ts BUILDINGS). */
  buildings: Record<string, BuildingLook>;
  /** The signs carry the edition's place names (content/locations.ts) instead of layout.ts's. */
  locationSigns: boolean;
  /** The square's market stalls' signs, by their goods. */
  stallSigns: Record<string, string>;
  /** Strings of papel picado over the square, from the centrepiece to these points (x, z, height). */
  papelPicado: [number, number, number][];
  /** Palm trees (x, z). */
  palms: [number, number][];
  /** The market hall inside: Maple Harbor's supermarket, or a Mexican mercado's stalls. */
  market: "supermarket" | "mercado";

  // The outdoor town beyond the square (docs/es/TOWN.md tasks 1–5, the vehicles and the sounds). Off in Maple Harbor.
  /** The outdoor signs' and posters' texts (town.ts) in this edition, by Maple Harbor's text; one not listed keeps
   *  it. (The rooms' signs have their own map, task 7.) */
  townSigns: Record<string, string>;
  /** The promenade above the beach as a malecón: paving, a low white wall with openings down to the sand, benches
   *  facing the sea, lamp posts with two lanterns, and a kiosk on it (`kiosk`: its x and its sign). */
  malecon: { kiosk: [number, number]; kioskSign: string; plaque: string } | null;
  /** Palapas (thatched umbrellas on a pole) with two wooden loungers each, at these spots on the sand, instead of
   *  Maple Harbor's four beach umbrellas. */
  palapas: [number, number][];
  /** Lanchas (open fishing boats, white with a coloured stripe) instead of the yachts: x, z, heading, stripe colour;
   *  `beached` ones are pulled up on the sand. */
  lanchas: { afloat: [number, number, number, string][]; beached: [number, number, number, string][] } | null;
  /** The buildings' Mexican details: flat roofs painted this colour with a parapet and tinacos (black water tanks)
   *  instead of the roof kit, iron bars on the ground floor's front windows, hand-painted shop signs, and the
   *  houses' low walls and gates instead of picket fences, chimneys and mailboxes. */
  mexican: { roof: string } | null;
  /** Bougainvillea on these buildings' front walls (building ids). */
  bougainvillea: string[];
  /** A little corner shop in a building's ground floor: the building, where along its front (m from the middle),
   *  how wide, its painted sign and the one on its side wall. */
  tiendita: { building: string; u: number; w: number; sign: string; side: string } | null;
  /** The parked cars, in PARKED_CARS's order (none: Maple Harbor's sedans in its colours). */
  parkedCars: { kind: "sedan" | "vocho"; color: string }[];
  /** The taxi at the stand and the stand's sign (null: Maple Harbor's yellow cab and "TAXI"). */
  taxi: { body: string; trim: string; sign: string } | null;
  /** The bus stop's sign. */
  busSign: string;
  /** A church on the square: where its door is and which way it faces. */
  church: { x: number; z: number; face: "n" | "s" | "e" | "w" } | null;
  /** Street name signs: x, z, the name of the street running east–west and of the one running north–south. */
  streetSigns: [number, number, string, string][];
  /** The word on the stop signs ("" leaves Maple Harbor's plain red octagons). */
  stopWord: string;
  /** Speed bumps across a road (x1, z1, x2, z2), each with a warning sign at x, z facing this way; and its word. */
  topes: { at: [number, number, number, number, number, number, number][]; word: string } | null;
  /** A tricycle food cart: where, its heading, its sign. */
  foodCart: { x: number; z: number; rot: number; sign: string } | null;
  /** What drives past, one per car Ambient makes (none: Maple Harbor's cars). */
  traffic: Vehicle[];
  /** Sounds of the town made on the spot (audio.ts): the church bell (where it rings), the street vendors (round
   *  this spot) and the trucks of the residential streets (south of this z: the gas truck's tune, the garbage truck's
   *  bell). */
  sounds: { bell: [number, number]; vendors: [number, number]; homesZ: number } | null;

  // The last details (docs/es/TOWN.md "Done: the last details"). Off in Maple Harbor, but the conversation's camera
  // and the room spots (on since 5 Nov 2026).
  /** The conversation's camera (Game.startSession). Off (null), it frames the player, the main speaker and the
   *  conversation's other speakers within 7 m of them from a set distance (2.6 times how far apart they stand, at
   *  least 6 m), which a phone's narrow picture can cut. With this, the speakers within `reach` m of the main one are
   *  framed, and the camera backs off (to at most `max` m) until every one of them, head and chest, is in the part of
   *  the picture the conversation panel leaves free, at any screen shape, with nothing in front of them outdoors
   *  (Game.ts `fitTalk`). */
  talkCamera: { reach: number; max: number } | null;
  /** Where this edition has people stand in the rooms (interiors.ts), by room id and character, instead of where
   *  Maple Harbor has them: a conversation's other speaker near enough to share its picture. */
  roomSpots: Record<string, Record<string, { x: number; z: number; rot: number; ax?: number; az?: number }>>;
  /** In front of the market hall: Maple Harbor's shopping carts, or a mercado's huacales (crates of produce), a
   *  diablito (a hand truck) and a cargo tricycle. */
  marketFront: "carts" | "mercado";
  /** The post office's mailbox: Maple Harbor's blue one, or a Correos de México buzón. */
  mailbox: "usps" | "correos";
  /** The backyard party's walls (s63): Maple Harbor's white picket fence (null), or a painted block wall (a barda)
   *  with pillars and an open metal gate, in these colours (the same colliders). */
  backyardWall: { wall: string; base: string; cap: string; gate: string } | null;
  /** The colours of the town's leafy trees (each tree draws one; none: Maple Harbor's autumn ones). */
  treeColors: string[];
  /** (graphics round 4) The street, park and yard trees as the tropics grow them (mexican.ts): flamboyanes, a wide flat
   *  crown on a forked trunk (the town's bloom colours go to them alone), and almendros, flat tiers of leaves; the
   *  zócalo's laureles keep their dense round crowns (false: Maple Harbor's round trees). */
  tropicalTrees: boolean;
  /** (graphics round 4) Where a town tree stands in one of these rectangles (x0, x1, z0, z1) a coconut palm stands
   *  instead (a flamboyán's crown would cut through the canopies and coaches there). */
  treePalms: [number, number, number, number][];
  /** (graphics round 4) The houses' fronts as Mexican houses (mexican.ts `casa`): a concrete portal with the upstairs
   *  terrace on it behind an iron railing, plastic chairs under it, rebar at the roof's corners and the wash on a line
   *  up there (false: Maple Harbor's porch roof on two posts). */
  casas: boolean;
  /** (graphics round 4) The church's walled atrium before its door (how far out from the facade, how far either side of
   *  the door, the gate's half width) and its facade's columns, entablature and niches (mexican.ts `atrio`; null: none). */
  atrio: { depth: number; left: number; right: number; gate: number } | null;
  /** (graphics round 4) The beach's palapas thatched in layers with a ragged fringe, and their loungers places where
   *  the townspeople sit (theme `sitters` names which; false: smooth cones). */
  beachLife: boolean;
  /** (graphics round 4) The overhead lines' poles dissolve between these distances from the camera (metres) and the
   *  walking camera looks through them (null: in the town's mesh, solid). */
  poleFade: [number, number] | null;
  /** (graphics round 4) The meadow round the cenote as scrub: shrubs and tall grass over x0…x1, z0…z1 but in the `clear`
   *  circles (x, z, radius), and ceibas over the selva (x, z) (mexican.ts `meadow`; null: bare grass). */
  meadow: { x0: number; x1: number; z0: number; z1: number; clear: [number, number, number][]; ceibas: [number, number][] } | null;
  /** (graphics round 5) Adoquín (cobbled stone) on these stretches of street (x0, z0, x1, z1: the road between its
   *  curbs), painted into the ground's own material (town.ts withGrain: no draw call); and a few things on the
   *  sidewalks there (mexican.ts `sidewalkProps`: trash bins on posts, bollards, a shoeshine stand: x, z, heading)
   *  (null: asphalt). */
  /** (graphics round 5) The townspeople (ambient.ts) drawn in a version with a third of the triangles farther than this
   *  from the camera (metres; null: always whole). */
  farPeople: number | null;
  adoquin: { streets: [number, number, number, number][]; bins: [number, number, number][]; bolardos: [number, number, number, number][]; bolero: [number, number, number] | null } | null;
  /** A cenote in the meadow beyond the town's west edge (its water's middle and its painted sign): seen from the ends
   *  of the streets, not reached on foot. */
  cenote: { x: number; z: number; sign: string } | null;
  /** Small ruins on a rocky point by the sea beyond the beach's west end (the temple's x and z). */
  ruins: { x: number; z: number } | null;

  // Graphics round 1 (5 Nov 2026; docs/es/TOWN.md "Graphics, round 1"). Off in Maple Harbor.
  /** The sea's colors (town.ts's sea shader), from the shore out: `shore` over the sand, `shallow` until
   *  `shallowTo` m out, `mid` until `midTo` m, then `deep`; the foam line whiter and wider (null: Maple Harbor's sea,
   *  a 14 m pale band and then deep blue). */
  sea: { shore: string; shallow: string; mid: string; deep: string; shallowTo: number; midTo: number } | null;
  /** The square's market as a tianguis (s91a: the Saturday market on the zócalo): lonas (tarps, in `lonas`' colors,
   *  one per stall) on poles over the stalls instead of their roofs, the goods and painted signs (`signs`, by goods)
   *  in the town's own meshes, and these stalls more (x, z, heading: 0 faces +z). */
  tianguis: { lonas: string[]; signs: Record<string, [string, string]>; stalls: { x: number; z: number; rot: number; goods: TianguisGoods }[] } | null;
  /** The rooms' looks in this edition, by room id: floor and wall colors, the floor's kind, the accent (baseboards). */
  roomLooks: Record<string, RoomLook>;
  /** Diego and Natalia's house (s85, p30) as a Yucatecan home: a ceiling fan, a family altar, plants in clay pots, a
   *  hammock, a water jug on its stand (and since round 2 a petate and the television on its stand). */
  homeMx: boolean;

  // Graphics round 2 (5 Nov 2026; docs/es/TOWN.md "Graphics, round 2"). Off in Maple Harbor.
  /** The rooms' plain colored shapes (an opaque color without a texture or a glow) merged into two vertex-colored
   *  meshes a room, one that casts shadows and one that doesn't, instead of a mesh per color: the same look in far
   *  fewer draw calls, so the rooms can hold more (Maple Harbor: false, a mesh per color). */
  roomMerge: boolean;
  /** The selva (the Yucatán's low jungle) round the town instead of Maple Harbor's temperate hills: the hills flattened
   *  into low rises in `hills`' green, and a band of canopy clumps in the `canopy` greens beyond the town's edges and
   *  round the cenote (one instanced mesh). */
  selva: { hills: string; canopy: string[] } | null;
  /** Things beside the follow camera dissolve (a short dither within ~4.5 m of it, as the papel picado's flags do): the lamp
   *  posts and their lanterns, so one never fills the picture (the palms always do: Maple Harbor has none). */
  nearFade: boolean;
  /** The town's triangles trimmed where they don't show (room for the edition's own things under the phones' budget):
   *  the windows' panes as single faces instead of thin boxes (the same look from the street, a sixth of the
   *  triangles), the shop windows' goods in a mesh for each part of town (each drawn only where it is in view, not all
   *  of them wherever one is), the lamps' globes a little rounder than they need be no more; and the frame trimmed: each
   *  kind of shadow caster its own depth material (styleScene.ts `depthByKind`), so three.js stops looking the shadow
   *  program up again at every change of kind. */
  lean: boolean;
  /** The bus terminal outside: canopies over its two andenes either side of the door, their painted signs and benches,
   *  planters by the door, and intercity buses at the curb in front of them (x and the destination on each). */
  busTerminal: {
    andenes: string[]; buses: { x: number; dest: string }[];
    /** (graphics round 4) white pilasters up its front (x from its middle), a terracotta band along its foot, and
     *  travellers' suitcases (x, z) by the benches (mexican.ts `terminalFront`). */
    front?: { pilasters: number[]; cases: [number, number][] };
  } | null;
  /** The airport outside: its drop-off canopy thatched like a palapa (no higher than the camera's box over it, Game.ts),
   *  agave planters along the forecourt, and a painted welcome sign (two lines) at the forecourt's north end. */
  airportOut: {
    welcome: [string, string];
    /** (graphics round 4) the terminal itself: a thatched palapa roof over its front hall (`hall` m deep) and a Maya
     *  step-fret frieze along its front (mexican.ts `airportTerminal`). */
    terminal?: { hall: number };
  } | null;
  /** The square dressed as a zócalo: laureles de la India (big dark crowns, their trunks whitewashed) at these spots, iron
   *  bancas where the square's benches are and these more (x, z and which way the seat faces: 0 is +z), and colonial
   *  lamp posts with four-sided lanterns at these spots. In the tianguis' mesh: drawn only where the square is in view. */
  zocalo: { laureles: [number, number][]; bancas: [number, number, number][]; lamps: [number, number][] } | null;
  /** The passers-by's looks in this town (ambient.ts walkerLook): their skins, hair colors, tops and bottoms, and how
   *  often one wears a straw hat (besides the caps, which become straw hats), shorts or sandals (null: Maple Harbor's). */
  walkers: { skins: string[]; hairs: string[]; tops: string[]; bottoms: string[]; straw: number; shorts: number; sandals: number } | null;
  /** More pairs of townspeople chatting (added to layout.ts CHAT_SPOTS): [x, z] of one and [x, z] of the other. */
  chatSpots: [number, number, number, number][];
  /** Seats (town.ts Town.seats: the benches') where someone sits, besides Maple Harbor's reader and the one by the
   *  fountain: x and z of the seat. */
  sitters: [number, number][];
  /** Townspeople standing at these spots facing `rot` (0: +z): the tianguis' vendors behind their stalls. */
  vendors: [number, number, number][];
  /** Letras monumentales: the town's name in big colored block letters on the malecón (from x along x at z, `h` m
   *  high, each letter in the next of `colors`), read from the street and the square. */
  letras: { text: string; x: number; z: number; h: number; colors: string[] } | null;
  /** The streets painted as a Mexican town's are: no white lines along the roads' edges, and the curbs painted in
   *  `color` for `corner` m from each crossing (no parking there). */
  streetPaint: { corner: number; color: string } | null;
  /** The houses' fronts (by building id, with the number on its door's talavera tile): a painted band along the bottom
   *  of the wall, an iron grille over the door, potted plants either side of it. */
  houseFronts: Record<string, string>;
  /** The light outdoors graded for this town (styleScene.ts; the rooms keep the game's): the sun's color, the tone
   *  curve's exposure, the sky's zenith, middle and horizon, the fog's color (the sea fades into it too), the
   *  hemisphere's sky and ground colors, and how much bigger the clouds are (null: Maple Harbor's light). */
  light: {
    sun: string; exposure: number; sky: [string, string, string]; fog: string; hemi: [string, string]; clouds: number;
    /** (graphics round 6) a later sun: where it shines from (offset from the player, as Game.ts's (-40, 70, 30)), the
     *  sun's and the hemisphere's intensities outdoors, and the sky dome painted (styleScene.ts `skyDome`): the sun's
     *  warm halo in `glow` and a band of fair-weather cumulus over the horizon. Unset: round 1's noon. */
    late?: { at: [number, number, number]; sunI: number; hemiI: number; glow: string; clouds: [string, string] };
  } | null;
  /** Townspeople sitting or standing (not walking) farther than this from the player keep their pose (ambient.ts
   *  `holdPose`: their matrices and skeleton left as they are): the edition's added vendors, sitters and pairs cost a
   *  frame next to nothing where they are too far to see breathe (null: all of them are animated every frame, as in
   *  Maple Harbor). */
  stillBeyond: number | null;

  // Graphics round 3 (5 Nov 2026; docs/es/TOWN.md "Graphics, round 3"). Off in Maple Harbor.
  /** The trees in the walking camera's way (fade.ts) fade further than Maple Harbor's (to `most` of their surface, she
   *  is between dense dark crowns), and a crown the camera is in or within `near` m of is left out whole: the zócalo's
   *  laureles are as tall as the camera stands (null: Maple Harbor's fade, 82 %). */
  fade: { most: number; near: number } | null;
  /** What stands at the town's far ends (the cenote, the ruins, the mirador) in a mesh of its own and the overhead lines
   *  in two halves: each drawn only where it is in view, instead of with the rest wherever any of it is: the same
   *  pictures, fewer triangles (room for this round's things under the phones' budget). */
  regions: boolean;
  /** The goods on the tianguis' stalls are left out when the camera is farther than this (m) from them: from there they
   *  are a few pixels, and they are thousands of triangles (null: always drawn). */
  farHide: number | null;
  /** The town's plain coloured shapes merged into a vertex-coloured mesh for each square of the town this many metres a
   *  side (two: casting shadows and not), instead of a mesh per colour across the whole town (town.ts TownMerger): far
   *  fewer draw calls, and no triangles for the squares out of view (null: a mesh per colour, as in Maple Harbor). */
  townMerge: number | null;
  /** A room's flat signs and posters (interiors.ts wallPanel) drawn as one mesh on one texture, an atlas of their
   *  pictures (interiors.ts panelAtlas), instead of a mesh and a texture each: the same pictures in one draw call
   *  (false: a mesh each, as in Maple Harbor). */
  panelAtlas: boolean;
  /** Overhead lines on the streets south of Juárez (mexican.ts `cables`): the poles (x, z) in order, and service drops
   *  from a pole (its index) to a point on a house's front (x, y, z) (null: none). */
  cables: { poles: [number, number][]; drops: [number, number, number, number][] } | null;
  /** Life on the sidewalks: clay pots either side of shop doors (the door's x and z, half the gap), a fruit cart (x, z,
   *  heading, its sign) and the water man's tricycle (x, z, heading) (null: none). */
  sidewalks: { macetas: [number, number, number][]; fruitCart: [number, number, number, string] | null; trike: [number, number, number] | null } | null;
  /** El Muelle's terrace on the sand either side of its pier: the decks (x0, x1, z0, z1). */
  terrace: [number, number, number, number][];
  /** The beach: towels on the sand (x, z, heading, colour) and a coconut cart on the malecón (x, z, heading, its sign). */
  beach: { towels: [number, number, number, string][]; cocos: [number, number, number, string] | null } | null;
  /** The atrial cross before the church (x, z; null: none). */
  atrialCross: [number, number] | null;
  /** A mirador at the meadow's edge, looking out to the cenote (x, z, heading: its view to +z turned by it; the sign). */
  mirador: { x: number; z: number; rot: number; sign: string } | null;
  /** More taxis waiting at the stand (x, z, heading), in the stand's taxi's colours (theme `taxi`). */
  taxis: [number, number, number][];

  // Graphics round 4 (11 Nov 2026; docs/es/TOWN.md "Graphics, round 4"). Off in Maple Harbor.
  /** The rooms' back and side walls stand this high (m; null: 4.2, as in Maple Harbor). An upright phone's room camera
   *  looks over a 4.2 m back wall into the dark; with taller walls the top of its picture is the room's upper wall (a
   *  lighter tint above a cornice at 4.2 m, the ends of the ceiling's wooden beams under the top). */
  roomWallH: number | null;
}

/** A room's look in an edition (theme.ts `roomLooks`): its floor's and walls' colors, the floor's kind, the accent
 *  (baseboards and the low front wall's top), and (round 4) a painted lower band on the walls (`dado`, `dadoH` m high,
 *  a line of the accent on top) and the upper wall's tint above the cornice (`upper`; theme `roomWallH`). The floor
 *  kinds: Maple Harbor's wood, tile, carpet and stone; the Yucatán's mosaicos de pasta (`pasta`, in `pasta`'s colors:
 *  the corners, the petals, the heart); terracotta (`barro`); terrazzo (`granito`, with metal strips every metre);
 *  large ceramic tiles (`ceramic`). */
export interface RoomLook {
  floor?: string; wall?: string; floorKind?: FloorKind; accent?: string;
  dado?: string; dadoH?: number; upper?: string; pasta?: [string, string, string];
}
export type FloorKind = "wood" | "tile" | "carpet" | "stone" | "pasta" | "barro" | "granito" | "ceramic";

/** What a tianguis stall sells (theme.ts `tianguis`; mexican.ts `tianguisStall` builds each). */
export type TianguisGoods = "flowers" | "fruit" | "veg" | "bread" | "pinatas" | "pottery" | "hats" | "textiles" | "hammocks";

export const THEME: TownTheme = {
  signs: {},
  boards: {},
  restaurant: "trattoria",
  roomExtras: {},
  outdoorNpcs: [],
  spotCars: [],
  centrepiece: "fountain",
  gazebo: true,
  buildings: {},
  locationSigns: false,
  stallSigns: {},
  papelPicado: [],
  palms: [],
  market: "supermarket",
  townSigns: {},
  malecon: null,
  palapas: [],
  lanchas: null,
  mexican: null,
  bougainvillea: [],
  tiendita: null,
  parkedCars: [],
  taxi: null,
  busSign: "BUS",
  church: null,
  streetSigns: [],
  stopWord: "",
  topes: null,
  foodCart: null,
  traffic: [],
  sounds: null,
  // Every speaker in the picture, a phone's too (Mark at Sophie's party, Mrs. Lee at her flower stall, Greg and
  // Vanessa at the meeting…): the speakers within 12 m of the main one framed, the camera backing off to at most 30 m,
  // as in Puerto Colibrí
  talkCamera: { reach: 12, max: 30 },
  // and the two who stood too far away come nearer, where Puerto Colibrí's Don Arturo and Doña Lupita stand: Harold
  // watches over the statue by the gallery's entrance, near Ben's desk (s70: his "Please don't touch the paintings!"),
  // and Rita is in the hallway by the vacant apartment's door (s82: the new neighbor's door), with Mr. Patel just
  // inside it (s81), so that she can back the learner up from there on p29 (with him by the window, the door's leaf
  // hid her from a camera on his side)
  roomSpots: {
    museum: { harold: { x: -4.5, z: 0.3, rot: -0.53 } },
    apartments: { patel: { x: -1.2, z: 2.4, rot: 0.25 }, rita: { x: -4.4, z: 0.9, rot: 0.1, ax: -4.2, az: 3.1 } },
  },
  marketFront: "carts",
  mailbox: "usps",
  backyardWall: null,
  treeColors: [],
  tropicalTrees: false,
  treePalms: [],
  casas: false,
  atrio: null,
  beachLife: false,
  poleFade: null,
  meadow: null,
  adoquin: null,
  farPeople: null,
  cenote: null,
  ruins: null,
  sea: null,
  tianguis: null,
  roomLooks: {},
  homeMx: false,
  roomMerge: false,
  selva: null,
  nearFade: false,
  lean: false,
  busTerminal: null,
  airportOut: null,
  zocalo: null,
  walkers: null,
  chatSpots: [],
  sitters: [],
  vendors: [],
  letras: null,
  streetPaint: null,
  houseFronts: {},
  light: null,
  stillBeyond: null,
  fade: null,
  regions: false,
  farHide: null,
  townMerge: null,
  panelAtlas: false,
  cables: null,
  sidewalks: null,
  terrace: [],
  beach: null,
  atrialCross: null,
  mirador: null,
  taxis: [],
  roomWallH: null,
};
