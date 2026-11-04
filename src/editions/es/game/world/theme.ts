// Puerto Colibrí's look (replaces src/game/world/theme.ts in the Spanish edition; docs/es/TOWN.md). The first area
// restyled: the zócalo (a kiosco instead of the fountain, papel picado, palms, the stalls' signs in Spanish), the
// buildings around it and the Mercado Municipal, in the colours of a Mexican Caribbean town. Then the rest of the town
// outdoors (4 Nov 2026): the malecón and the beach, the main street, the church, the street furniture, the houses, the
// vehicles and the town's sounds. What is still to do is in docs/es/TOWN.md.
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
    // the rest of the main street, the harbour and the residential streets (tasks 1, 2, 5); the trims and awnings
    // reuse the colours above where they can, since each new one is a draw call more everywhere in town
    rental: { color: "#f4a259", trim: "#1f4e5f", awning: "#1f4e5f" },
    gas: { color: "#f7f3e8", trim: "#2e5e3e", awning: "#2e5e3e" },
    clinic: { color: "#a8dadc", trim: "#1f4e5f", awning: "#1f4e5f" },
    gym: { color: "#ffd166", trim: "#7a1f4b", awning: "#e76f51" },
    apartments: { color: "#e76f51", trim: "#fff3e0" },
    station: { color: "#f1c27d", trim: "#7a2e2e", roofColor: "#b5523b" },
    pier: { color: "#f4efe6", trim: "#1f4e5f", awning: "#1f6f8b", roof: "palapa" },
    sophie: { color: "#5fbfb0", trim: "#fff3e0", roofColor: "#fff3e0", roof: "flat" },
    dan: { color: "#f6bd60", trim: "#fff3e0", roofColor: "#fff3e0", roof: "flat" },
    house3: { color: "#e5989b", trim: "#fff3e0", roofColor: "#fff3e0", roof: "flat" },
    house4: { color: "#90be6d", trim: "#fff3e0", roofColor: "#fff3e0", roof: "flat" },
    house5: { color: "#8ecae6", trim: "#fff3e0", roofColor: "#fff3e0", roof: "flat" },
  },
  locationSigns: true,
  stallSigns: { flowers: "Flores", fruit: "Frutas", veg: "Verduras", bread: "Pan dulce" },
  // from the kiosco's roof to the square's edges: the lamp posts and the corners
  papelPicado: [[12, -18, 4.6], [48, -18, 4.6], [10, -44, 4.6], [50, -44, 4.6], [30, -16, 4.8], [52, -30, 4.6], [8, -30, 4.6], [30, -47, 4.6]],
  palms: [[8.6, -17.4], [47.6, -17.6], [8.4, -47.2], [49, -47.4], [20.5, -16.6], [39.5, -16.6], [6.8, -32], [51.4, -26]],
  market: "mercado",

  // Beyond the square (docs/es/TOWN.md tasks 1–5): the malecón and the beach, the buildings' Mexican details, the
  // church, the street furniture, the houses, the vehicles and the town's sounds.
  townSigns: {
    "The Colors of the Night": "Colores de la noche", // the museum's banners (s70: the new exhibition)
    "2 for $5 · Weekly Deals": "Frutas · Verduras · Antojitos", // the mercado's posters
    "Harbor Rewards · Save more": "Abierto todos los días",
    "Family Clinic": "Clínica Familiar",
    "Walk-ins welcome": "Consulta sin cita",
    "Open 5 AM – 11 PM": "Lun–Sáb 6:00–22:00", // s35: "de lunes a sábado, de seis de la mañana a diez de la noche"
    "First session FREE!": "¡Primera sesión GRATIS!",
    "FOR SALE $9,000": "SE VENDE",
    "Party → backyard": "Fiesta → al patio",
  },
  malecon: { kiosk: [-44, -64.6], kioskSign: "Tours a los cenotes", plaque: "Malecón" },
  palapas: [[-90, -69], [-80, -69.2], [-64, -68.9], [-55, -69.1], [-6, -69], [3, -69.2], [31, -69], [42, -69.2], [52, -68.9], [76, -69], [90, -69.2], [100, -69]],
  lanchas: {
    afloat: [[-46, -77, 0.3, "#e4007c"], [-14, -80, -0.4, "#f6a800"], [14, -87, 0.8, "#1f6fd1"], [40, -82, 2.6, "#7ac143"]],
    beached: [[16, -70, 1.9, "#1f6fd1"], [23.5, -70.4, 1.2, "#e4007c"], [64, -70.2, 2.0, "#00a6a6"]],
  },
  mexican: { roof: "#b5533c" },
  bougainvillea: ["sophie", "dan", "house3", "house4", "house5", "cafe", "trattoria", "visitor", "salon"],
  // s81, s82: "Hay una tiendita en la esquina": in the ground floor of Departamentos Las Palmas, at the corner
  tiendita: { building: "apartments", u: 7.8, w: 4.4, sign: "Abarrotes Las Palmas", side: "Refrescos · Botanas · Recargas" },
  parkedCars: [
    { kind: "vocho", color: "#3d9be9" }, { kind: "sedan", color: "#f4f4f4" }, { kind: "vocho", color: "#e4572e" }, { kind: "sedan", color: "#c0392b" },
    { kind: "sedan", color: "#e9c46a" }, { kind: "vocho", color: "#7ac143" }, { kind: "sedan", color: "#5e548e" }, { kind: "vocho", color: "#f2f2f2" },
    { kind: "sedan", color: "#2a9d8f" }, { kind: "vocho", color: "#f6a800" },
  ],
  taxi: { body: "#f4f6f8", trim: "#1f8a4c", sign: "SITIO DE TAXIS" },
  busSign: "PARADA",
  // at the square's east end beside the Policía Municipal, facing the kiosco (TOWN.md task 3: the north side has no
  // room without moving the stalls; the owner may still choose that)
  church: { x: 52, z: -41, face: "w" },
  // the streets' names in the conversations: avenida Juárez (Main Street, s62), calle Ceiba (Center Street, along the
  // zócalo, s62), avenida del Puerto (Harbor Road, by the malecón), calle Itzamná (East Street, down to the sea, s62),
  // calle Flamboyán (West Street, by Departamentos Las Palmas, s65a, s65b) and calle Hidalgo (Oak Avenue: "Flamboyán,
  // entre Hidalgo y Juárez", s65b)
  streetSigns: [
    [6.2, -14.4, "Av. Juárez", "Calle Ceiba"], [6.2, -48.6, "Av. del Puerto", "Calle Ceiba"],
    [64, -14.6, "Av. Juárez", "Calle Itzamná"], [64, -48.6, "Av. del Puerto", "Calle Itzamná"],
    [-64, -14.6, "Av. Juárez", "Calle Flamboyán"], [-64, -48.6, "Av. del Puerto", "Calle Flamboyán"],
    [-64, 44.2, "Calle Hidalgo", "Calle Flamboyán"], [-6.2, 31.9, "Calle Hidalgo", "Calle Ceiba"],
  ],
  stopWord: "ALTO",
  topes: { at: [[12, -12.6, 12, -3.4, 16.5, -14.4, Math.PI / 2], [46, -12.6, 46, -3.4, 41.5, -14.4, -Math.PI / 2], [28, -59.1, 28, -50.9, 24, -48.4, -Math.PI / 2]], word: "TOPE" },
  foodCart: { x: 33.5, z: -17.3, rot: Math.PI / 2, sign: "Elotes · Esquites" },
  // route 7's bus (s67b), a colectivo and two white-and-green taxis among the cars
  traffic: ["bus", "taxi", "colectivo", "car", "car", "taxi", "car", "car"],
  sounds: { bell: [52, -41], vendors: [30, -24], homesZ: 30 },
};
