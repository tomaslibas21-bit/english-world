// Maple Harbor: a small American coastal town. X = east, Z = south (north is -Z), 1 unit = 1 m.

export type Face = "n" | "s" | "e" | "w";
export interface Road { x1: number; z1: number; x2: number; z2: number; w: number; name?: string }
export interface BuildingDef {
  id: string;
  /** Location id (enterable interior) */
  loc?: string;
  sign?: string;
  x: number; z: number; w: number; d: number; h: number;
  face: Face;
  color: string;
  trim?: string;
  roof?: "flat" | "gable";
  roofColor?: string;
  style: "shop" | "house" | "civic" | "office" | "terminal" | "station" | "hotel" | "apartments" | "museum" | "restaurant";
  awning?: string;
  /** door offset along the facade from its centre */
  doorOffset?: number;
  /** door width (default: 3.4 for big public buildings, else 1.8) */
  doorWidth?: number;
  /** Buildings added later draw their decoration from their own random seed, so the rest of the town
   *  (roof boxes, trees, market goods, rocks, clouds) keeps exactly the look it had. */
  seed?: number;
}

export const WORLD = { minX: -112, maxX: 182, minZ: -104, maxZ: 96 };

export const ROADS: Road[] = [
  { x1: -104, z1: -55, x2: 126, z2: -55, w: 9, name: "Harbor Road" },
  { x1: -104, z1: -8, x2: 132, z2: -8, w: 10, name: "Main Street" },
  { x1: -104, z1: 38, x2: 126, z2: 38, w: 9, name: "Oak Avenue" },
  { x1: -104, z1: 76, x2: 126, z2: 76, w: 8, name: "Station Road" },
  { x1: -70, z1: -55, x2: -70, z2: 76, w: 8, name: "West Street" },
  { x1: 0, z1: -55, x2: 0, z2: 76, w: 9, name: "Center Street" },
  { x1: 70, z1: -55, x2: 70, z2: 76, w: 8, name: "East Street" },
];

/** Sidewalk width on both sides of roads. */
export const SIDEWALK = 3.2;

export const BUILDINGS: BuildingDef[] = [
  // North of Main Street
  { id: "hotel", loc: "hotel", sign: "Harborview Hotel", x: -87, z: -30, w: 22, d: 24, h: 17, face: "s", color: "#e9d8c4", trim: "#7d5a44", roof: "flat", style: "hotel", awning: "#8a2f3b" },
  { id: "visitor", loc: "visitor-center", sign: "Visitor Center", x: -56, z: -22, w: 13, d: 12, h: 6, face: "s", color: "#cfe5d4", trim: "#2f6b4f", roof: "gable", roofColor: "#3f7d5c", style: "civic", awning: "#2f6b4f" },
  { id: "museum", loc: "museum", sign: "Museum of Art", x: -26, z: -31, w: 30, d: 24, h: 11, face: "s", color: "#f1ece2", trim: "#9c8f7a", roof: "flat", style: "museum" },
  { id: "police", loc: "police", sign: "Police", x: 58, z: -27, w: 16, d: 16, h: 8, face: "s", color: "#d5dde8", trim: "#2a3f66", roof: "flat", style: "civic", awning: "#2a3f66" },
  // South of Main Street (shops face north)
  { id: "pharmacy", loc: "pharmacy", sign: "Harbor Pharmacy", x: -88, z: 7.5, w: 16, d: 14, h: 7, face: "n", color: "#e8f1f4", trim: "#2e8b57", roof: "flat", style: "shop", awning: "#2e8b57" },
  { id: "cafe", loc: "sunny-cup", sign: "Sunny Cup Café", x: -58, z: 7.5, w: 14, d: 14, h: 7, face: "n", color: "#ffd9a8", trim: "#b5651d", roof: "flat", style: "shop", awning: "#e8743b" },
  { id: "trattoria", loc: "trattoria", sign: "Lucia's Trattoria", x: -41, z: 7.5, w: 16, d: 14, h: 7.5, face: "n", color: "#f4e1c8", trim: "#8a1f2a", roof: "flat", style: "restaurant", awning: "#2e6b3a" },
  { id: "threads", loc: "threads", sign: "Threads", x: -24, z: 7.5, w: 14, d: 14, h: 7, face: "n", color: "#e7dff0", trim: "#6b4a8a", roof: "flat", style: "shop", awning: "#6b4a8a" },
  { id: "salon", loc: "salon", sign: "Snip & Style", x: -10, z: 7.5, w: 10, d: 14, h: 6.5, face: "n", color: "#f7d6e0", trim: "#c94f7c", roof: "flat", style: "shop", awning: "#c94f7c" },
  { id: "bank", loc: "bank", sign: "Harbor Bank", x: 13, z: 7.5, w: 15, d: 14, h: 9, face: "n", color: "#e6e2d6", trim: "#1f4f8a", roof: "flat", style: "civic" },
  { id: "post", loc: "post-office", sign: "U.S. Post Office", x: 30, z: 7.5, w: 15, d: 14, h: 7.5, face: "n", color: "#dfe7f3", trim: "#2c4f8f", roof: "flat", style: "civic", awning: "#2c4f8f" },
  { id: "office", loc: "office", sign: "Brightline", x: 52, z: 10, w: 20, d: 18, h: 22, face: "n", color: "#b9d1e3", trim: "#34495e", roof: "flat", style: "office" },
  { id: "rental", loc: "car-rental", sign: "Harbor Car Rental", x: 84, z: 6.5, w: 16, d: 12, h: 6.5, face: "n", color: "#e3f2ec", trim: "#1f8a70", roof: "flat", style: "shop", awning: "#1f8a70" },
  { id: "gas", loc: "gas-station", sign: "Gas & Go", x: 112, z: 17, w: 14, d: 10, h: 5.5, face: "n", color: "#fbe7d8", trim: "#d94b3d", roof: "flat", style: "shop", awning: "#d94b3d" },
  // South of Oak Avenue (face north)
  { id: "apartments", loc: "apartments", sign: "Maple Street Apartments", x: -86, z: 55, w: 22, d: 18, h: 16, face: "n", color: "#c9785b", trim: "#f3e9dc", roof: "flat", style: "apartments" },
  { id: "sophie", sign: "", x: -54, z: 53, w: 13, d: 11, h: 7, face: "n", color: "#b8d8d8", trim: "#ffffff", roof: "gable", roofColor: "#5c6b7a", style: "house" },
  { id: "dan", loc: "dans-house", sign: "", x: -30, z: 53, w: 13, d: 11, h: 7, face: "n", color: "#f2d492", trim: "#ffffff", roof: "gable", roofColor: "#8a4b3a", style: "house" },
  { id: "house3", sign: "", x: 22, z: 54, w: 12, d: 10, h: 7, face: "n", color: "#d7c0e0", trim: "#ffffff", roof: "gable", roofColor: "#4b5563", style: "house" },
  { id: "station", loc: "station", sign: "Union Station", x: 45, z: 57, w: 34, d: 16, h: 10, face: "n", color: "#d8b48a", trim: "#7a2e2e", roof: "gable", roofColor: "#7a2e2e", style: "station" },
  { id: "house4", sign: "", x: 90, z: 54, w: 12, d: 10, h: 7, face: "n", color: "#cfe3c3", trim: "#ffffff", roof: "gable", roofColor: "#6b4f3a", style: "house" },
  { id: "house5", sign: "", x: 108, z: 54, w: 11, d: 10, h: 7, face: "n", color: "#f0c4b4", trim: "#ffffff", roof: "gable", roofColor: "#5c6b7a", style: "house" },
  // Harbor and airport
  { id: "pier", loc: "the-pier", sign: "The Pier", x: -30, z: -80, w: 18, d: 12, h: 6, face: "s", color: "#e9f2f7", trim: "#1d4e6b", roof: "gable", roofColor: "#1d4e6b", style: "restaurant", awning: "#1d4e6b" },
  { id: "terminal", loc: "airport", sign: "Maple Harbor Airport", x: 152, z: -8, w: 36, d: 44, h: 13, face: "w", color: "#dde6ee", trim: "#2b5d8a", roof: "flat", style: "terminal" },
  // Songs 31–35: the supermarket on Harbor Road (between West Street and the museum), the family clinic on
  // Oak Avenue (between the car rental lot and the gas station), the gym on Oak Avenue next to the bus stop.
  // The gym's door is off-centre, west of the street tree behind the bus shelter.
  { id: "market", loc: "market", sign: "Harbor Market", x: -52, z: -38.5, w: 19, d: 14, h: 6.8, face: "n", color: "#f6efe1", trim: "#23704a", roof: "flat", style: "shop", awning: "#d9452b", doorWidth: 3.4, seed: 32 },
  { id: "clinic", loc: "clinic", sign: "Harbor Family Clinic", x: 98, z: 21.5, w: 11, d: 13, h: 6.5, face: "s", color: "#eef4f6", trim: "#3a86b0", roof: "flat", style: "civic", awning: "#3a86b0", seed: 31 },
  { id: "gym", loc: "gym", sign: "Harbor Fitness", x: -15.5, z: 56, w: 13, d: 14, h: 7, face: "n", color: "#e3ebee", trim: "#1f7f8c", roof: "flat", style: "shop", awning: "#f0883e", doorOffset: -3, seed: 35 },
];

/** Where each outdoor NPC stands (and which way they face, radians; 0 = facing +Z/south).
 *  `ax/az` = where the player stops to talk (e.g. the customer side of a market stall). */
export const OUTDOOR_NPCS: { npc: string; x: number; z: number; rot: number; sit?: boolean; ax?: number; az?: number }[] = [
  // Rosa sits on the bench south-west of the fountain, her back to it (as in her pictures), facing you
  { npc: "rosa", x: 18, z: -23.2, rot: 0, sit: true, ax: 18, az: -21 },
  { npc: "lucy", x: 34, z: -38, rot: -0.6 },
  { npc: "mrs_lee", x: 14, z: -43.35, rot: 0, ax: 14, az: -40.3 },
  { npc: "vinnie", x: 124.5, z: -1.4, rot: -Math.PI / 2 },
  // Sophie's backyard party (enter through the garden gate on the east side of the house)
  { npc: "sophie", x: -47.3, z: 61.3, rot: Math.PI / 2 },
  { npc: "mark", x: -50.6, z: 62.9, rot: Math.PI / 2 + 0.35 },
  // Frank waits for the bus at the east end of the Oak Avenue shelter, looking out for it; you stand
  // with him under the shelter roof
  { npc: "frank", x: -7.5, z: 43.9, rot: Math.PI, ax: -9.5, az: 43.9 },
];

/** Where a taxi (or the map's "go there") drops the player for outdoor places. */
export const DROPOFF: Record<string, { x: number; z: number; rot: number }> = {
  "town-square": { x: 28, z: -14.6, rot: Math.PI },
  "taxi-stand": { x: 124, z: 1.2, rot: Math.PI },
  "sophies-house": { x: -42.5, z: 44.4, rot: 0 },
  "bus-stop": { x: -6, z: 46, rot: Math.PI },
};

/** Market stalls in the town square. */
export const STALLS = [
  { x: 14, z: -42, color: "#e6aa68", goods: "flowers" },
  { x: 26, z: -43, color: "#d95d39", goods: "fruit" },
  { x: 38, z: -42, color: "#7fb069", goods: "veg" },
  { x: 46, z: -36, color: "#f4d35e", goods: "bread" },
];

/** A car's footprint (the parked ones, the taxi and the passing cars are the same size). */
export const CAR = { length: 4.2, width: 1.9 };

/** The passing cars (src/game/ambient.ts), right-hand traffic: eastbound on the south half of each east–west street,
 *  westbound on the north half. On Main Street and Oak Avenue the lanes keep to the middle of the road, so the cars
 *  parked at the curb (PARKED_CARS) are never in their way. */
export const TRAFFIC_LANES: { z: number; dir: 1 | -1; from: number; to: number }[] = [
  { z: -6.5, dir: 1, from: -102, to: 116 }, { z: -9.5, dir: -1, from: -102, to: 116 }, // Main Street, z -13 … -3
  { z: 39.2, dir: 1, from: -102, to: 124 }, { z: 36.8, dir: -1, from: -102, to: 124 }, // Oak Avenue, z 33.5 … 42.5
  { z: -52.8, dir: 1, from: -102, to: 124 }, { z: -57.2, dir: -1, from: -102, to: 124 }, // Harbor Road, z -59.5 … -50.5
];

/** Cars parked at the curb: x, z and heading (π/2: facing east, −π/2: west, 0: south, π: north). */
export const PARKED_CARS: [number, number, number][] = [
  [-80, -4.2, Math.PI / 2], [-30, -4.2, Math.PI / 2], [34, -4.2, Math.PI / 2], [88, -11.8, -Math.PI / 2], [-40, -11.8, -Math.PI / 2],
  [-60, 41.45, Math.PI / 2], [30, 34.55, -Math.PI / 2], [-66.4, 20, 0], [3.8, 60, Math.PI], [96, 41.45, Math.PI / 2],
];

export const TAXI = { x: 121, z: -4.8, rot: -Math.PI / 2 };
export const BUS_STOP = { x: -10, z: 44, rot: Math.PI };
export const FOUNTAIN = { x: 30, z: -30 };
export const LIGHTHOUSE = { x: 104, z: -88 };
export const PARK = { x1: 76, z1: -50, x2: 124, z2: -14 };
export const SQUARE = { x1: 6, z1: -49, x2: 50, z2: -15 };
export const BEACH_Z = -64;
export const SEA_Z = -72;

/** Spawn point when leaving the airport (outside the terminal). */
export const AIRPORT_EXIT = { x: 130, z: -8, rot: -Math.PI / 2 };
