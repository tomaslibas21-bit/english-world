// How the town looks in this edition (docs/es/TOWN.md). This is Maple Harbor: every switch is off and every list
// empty, so its town is built exactly as layout.ts and town.ts describe it. The Spanish edition's file
// (src/editions/es/game/world/theme.ts) turns the square into a zócalo with a kiosco, papel picado and palms, paints
// the buildings in Mexican colours, puts the Spanish names on the signs and the market hall's stalls inside.

export interface BuildingLook { color?: string; trim?: string; awning?: string; roofColor?: string }

export interface TownTheme {
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
  centrepiece: "fountain",
  gazebo: true,
  buildings: {},
  locationSigns: false,
  stallSigns: {},
  papelPicado: [],
  palms: [],
  market: "supermarket",
};
