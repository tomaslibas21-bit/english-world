// Puerto Colibrí's look (replaces src/game/world/theme.ts in the Spanish edition; docs/es/TOWN.md). The first area
// restyled: the zócalo (a kiosco instead of the fountain, papel picado, palms, the stalls' signs in Spanish), the
// buildings around it and the Mercado Municipal, in the colours of a Mexican Caribbean town. The other areas are
// the restyling tasks in docs/es/TOWN.md.
import type { TownTheme } from "../../../../game/world/theme";
export type { BuildingLook, TownTheme } from "../../../../game/world/theme";

export const THEME: TownTheme = {
  centrepiece: "kiosco",
  gazebo: false,
  buildings: {
    // around the zócalo
    bank: { color: "#f2c14e", trim: "#7a3e1d" },
    post: { color: "#ee8a5b", trim: "#fff3e0", awning: "#1f6f8b" },
    office: { color: "#e8d6b3", trim: "#2a6f6b" },
    police: { color: "#f4ead5", trim: "#8a1c2b", awning: "#8a1c2b" },
    museum: { color: "#f3dfc1", trim: "#a0522d" },
    // the market hall and the main street
    market: { color: "#f6bd60", trim: "#2a9d8f", awning: "#e76f51" },
    cafe: { color: "#ffb4a2", trim: "#6d2e46", awning: "#2a9d8f" },
    trattoria: { color: "#f7d08a", trim: "#8a1f2a", awning: "#2e6b3a" },
    threads: { color: "#9ad1d4", trim: "#1f4e5f", awning: "#1f4e5f" },
    salon: { color: "#e993b8", trim: "#7a1f4b", awning: "#7a1f4b" },
    pharmacy: { color: "#b5d96b", trim: "#2e5e3e", awning: "#2e5e3e" },
    visitor: { color: "#7fc8a9", trim: "#2f6b4f", roofColor: "#b5523b" },
    hotel: { color: "#f2e2c4", trim: "#b5651d", awning: "#1f6f8b" },
  },
  locationSigns: true,
  stallSigns: { flowers: "Flores", fruit: "Frutas", veg: "Verduras", bread: "Pan dulce" },
  // from the kiosco's roof to the square's edges: the lamp posts and the corners
  papelPicado: [[12, -18, 4.6], [48, -18, 4.6], [10, -44, 4.6], [50, -44, 4.6], [30, -16, 4.8], [52, -30, 4.6], [8, -30, 4.6], [30, -47, 4.6]],
  palms: [[8.6, -17.4], [47.6, -17.6], [8.4, -47.2], [49, -47.4], [20.5, -16.6], [39.5, -16.6], [6.8, -32], [51.4, -26]],
  market: "mercado",
};
