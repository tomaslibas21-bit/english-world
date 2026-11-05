// How the town looks in this edition (docs/es/TOWN.md). This is Maple Harbor: every switch is off and every list
// empty, so its town is built exactly as layout.ts and town.ts describe it. The Spanish edition's file
// (src/editions/es/game/world/theme.ts) turns the square into a zócalo with a kiosco, papel picado and palms, paints
// the buildings in Mexican colours, puts the Spanish names on the signs and the market hall's stalls inside, and makes
// the rest of the town outdoors Mexican too (the fields after `market`; their shapes are in mexican.ts), down to the
// last details (the fields after `sounds`: the conversation's camera, people's spots in the rooms, props, the cenote).

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
    /** The clothes shop: a white linen guayabera on a mannequin by the door. */
    guayabera?: boolean;
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

  // The last details (docs/es/TOWN.md "Done: the last details"). Off in Maple Harbor.
  /** The conversation's camera (Game.startSession). Maple Harbor's (null) frames the player, the main speaker and the
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
  /** A cenote in the meadow beyond the town's west edge (its water's middle and its painted sign): seen from the ends
   *  of the streets, not reached on foot. */
  cenote: { x: number; z: number; sign: string } | null;
  /** Small ruins on a rocky point by the sea beyond the beach's west end (the temple's x and z). */
  ruins: { x: number; z: number } | null;
}

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
  talkCamera: null,
  roomSpots: {},
  marketFront: "carts",
  mailbox: "usps",
  backyardWall: null,
  treeColors: [],
  cenote: null,
  ruins: null,
};
