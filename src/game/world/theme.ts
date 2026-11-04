// How the town looks in this edition (docs/es/TOWN.md). This is Maple Harbor: every switch is off and every list
// empty, so its town is built exactly as layout.ts and town.ts describe it. The Spanish edition's file
// (src/editions/es/game/world/theme.ts) turns the square into a zócalo with a kiosco, papel picado and palms, paints
// the buildings in Mexican colours, puts the Spanish names on the signs and the market hall's stalls inside.

export interface BuildingLook { color?: string; trim?: string; awning?: string; roofColor?: string }

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
  /** Cars parked for a conversation (added to layout.ts PARKED_CARS): x, z and heading. */
  parkedCars: [number, number, number][];
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
}

export const THEME: TownTheme = {
  signs: {},
  boards: {},
  restaurant: "trattoria",
  roomExtras: {},
  outdoorNpcs: [],
  parkedCars: [],
  centrepiece: "fountain",
  gazebo: true,
  buildings: {},
  locationSigns: false,
  stallSigns: {},
  papelPicado: [],
  palms: [],
  market: "supermarket",
};
