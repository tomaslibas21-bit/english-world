// Puerto Colibrí's look (replaces src/game/world/theme.ts in the Spanish edition; docs/es/TOWN.md). The first area
// restyled: the zócalo (a kiosco instead of the fountain, papel picado, palms, the stalls' signs in Spanish), the
// buildings around it and the Mercado Municipal, in the colours of a Mexican Caribbean town. Then the rest of the town
// outdoors (4 Nov 2026): the malecón and the beach, the main street, the church, the street furniture, the houses, the
// vehicles and the town's sounds. What is still to do is in docs/es/TOWN.md.
import type { TownTheme } from "../../../../game/world/theme";
export type { BuildingLook, OutdoorSpot, TownTheme } from "../../../../game/world/theme";

export const THEME: TownTheme = {
  // --- the rooms and the conversations' spots (docs/es/TOWN.md tasks 6 and 7, "Every conversation's spot") ---
  // Every room's English words in Spanish, as a Mexican place writes them; the facts are the conversations' (prices,
  // numbers, names). The airport's signs are Spanish over English ("\n": two lines), as Mexican airports have them.
  signs: {
    // Café La Ceiba (s72): the Wi-Fi as Mariana gives it
    "Wi-Fi: SunnyCup · password: sunnycup22": "Wi-Fi: CafeLaCeiba · contraseña: ceiba2026",
    // Boutique Hilos (s74: 20 or 30% off on the sale table)
    "Fitting Rooms": "Probadores",
    "SALE 20% OFF": "¡OFERTAS! HASTA 30%",
    // Farmacia del Puerto (s75: prescriptions filled, pay at the till)
    "PHARMACY · Prescriptions": "FARMACIA · Surtimos recetas",
    "Blood Pressure": "Toma de presión",
    "Drop off": "Recetas",
    "Pick up": "Caja",
    // Estética Tijeras (s77), Banco del Puerto (s78), the post office (s79: timbres)
    "Snip & Style": "Estética Tijeras",
    "Harbor Bank · Since 1912": "Banco del Puerto · Desde 1912",
    Teller: "Ventanilla",
    "UNITED STATES POSTAL SERVICE": "CORREOS · PUERTO COLIBRÍ\nPaquetería · Timbres",
    STAMPS: "TIMBRES",
    "sold here": "de venta aquí",
    USA: "MÉXICO",
    Forever: "Correo nacional",
    "Send a": "¡Manda una",
    "postcard!": "postal!",
    // Hotel Mar Azul (s68), the tourist information (s62: live music on the zócalo, Friday at eight, free)
    "Harborview Hotel · Reception": "Hotel Mar Azul · Recepción",
    Elevators: "Elevadores",
    "Welcome to Maple Harbor!": "¡Bienvenidos a Puerto Colibrí!",
    "Jazz Night · Friday 8 PM": "Música en vivo en el zócalo\nviernes, 8 p. m. · ¡gratis!",
    Souvenirs: "Recuerdos",
    Information: "Información",
    // the Museo de la Costa Maya (s70: the new exhibition is upstairs; interiors.ts museumStairs)
    "Tickets · Audio Guides": "Taquilla · Audioguías",
    "The Colors of the Night": "Colección permanente · Costa Maya",
    "Gift Shop": "Tienda",
    // the bus terminal (s67a: taquilla, andenes; s67b: city bus route 7)
    TICKETS: "TAQUILLA",
    "BUS 12 · DOWNTOWN": "RUTA 7 · CENTRO · PLAYA",
    // the airport (s64a–c, s65a, s65b): flight 223 to Mexico City from gate (sala) 4; the arrival was PC 482
    "Passport Control · U.S. Citizens | All Passports": "Migración · Mexicanos | Extranjeros\nImmigration · Mexicans | Foreigners",
    "Baggage Claim · Flight 223": "Reclamo de equipaje · Vuelo PC 482\nBaggage claim · Flight PC 482",
    "Baggage Services": "Servicio de equipaje\nBaggage services",
    "Check-in · Harbor Air": "Documentación\nCheck-in",
    Security: "Filtro de seguridad\nSecurity",
    "Gate 8 · Flight 223 to Boston": "Sala 4 · Vuelo 223 a Ciudad de México\nGate 4 · Flight 223 to Mexico City",
    "← Arrivals · Departures →": "← Llegadas · Salidas →\n← Arrivals · Departures →",
    // Renta de Autos Colibrí (s71a), the gas station's shop (s71b: you pay the attendant at the pump)
    "Harbor Car Rental · Keys": "Renta de Autos Colibrí",
    "Maple Harbor": "Puerto Colibrí",
    "Gas & Go · Pay here": "Tienda El Faro",
    "Fresh Coffee": "Café recién hecho",
    // the Policía Municipal (s91b)
    "Maple Harbor Police · Front Desk": "Policía Municipal · Atención ciudadana",
    "EMERGENCY? CALL 911": "¿EMERGENCIA? LLAME AL 911",
    MISSING: "PERDIDO",
    "Call 555-0134": "984 555 0134",
    "BIKE SAFETY": "USA CASCO",
    WANTED: "SE BUSCA",
    "$500 REWARD": "RECOMPENSA",
    "NEIGHBORHOOD WATCH": "VECINO VIGILANTE",
    "Lost & Found": "Objetos perdidos",
    "Open 24/7": "Abierto 24 h",
    // Departamentos Las Palmas (s81: the apartment is on the primer piso, one flight up; s82: Doña Lupita next door)
    "2C": "1C",
    "Hallway · 2nd floor": "Pasillo · primer piso",
    "FOR RENT · 2B": "SE RENTA · DEPTO. 1B",
    // Línea Clara (s34, s87, s88; p27, p28b: Elena's office), El Muelle's kitchen (p28)
    Brightline: "Línea Clara",
    "Team Room": "Sala de juntas",
    Kitchen: "Cocina",
    Emily: "Elena",
    "Q4 Goals": "Metas del trimestre",
    // the Clínica Familiar (s31), Gimnasio Colibrí (s35: los vestidores, water by them), Brotecito (p18)
    "Harbor Family Clinic": "Clínica Familiar",
    "Check-in": "Recepción",
    "Exam Room 2": "Consultorio 2",
    "Take a deep": "¡Respire",
    "breath!": "hondo!",
    "Locker Rooms": "Vestidores",
    Water: "Agua",
    "ONE MORE REP!": "¡UNA MÁS!",
    "Harbor Fitness": "Gimnasio Colibrí",
    Sproutly: "Brotecito",
    "Coffee · Kombucha · Good vibes": "Café · Kombucha · Buena vibra",
  },
  boards: {
    // Café La Ceiba (s72): its drinks and pan dulce, prices in pesos; iced, an extra shot and plant milks cost more
    "SUNNY CUP · DRINKS": ["CAFÉ LA CEIBA · BEBIDAS", "|chico · mediano · grande", "Americano|$35 · 40 · 45", "Café de olla|$35 · 40 · 45",
      "Capuchino|$45 · 50 · 55", "Latte|$45 · 50 · 55", "Moka|$50 · 55 · 60", "Chocolate|$40 · 45 · 50", "Horchata · Agua de jamaica|$35 · 40 · 45",
      "Expreso · Shot extra|$35 · +$15", "Té (negro, verde, manzanilla, hierbabuena)|$30", "Leche de avena, almendra o soya|+$10", "Bebidas frías|+$10"],
    FOOD: ["PAN DULCE Y ALGO MÁS", "Concha|$25", "Cuernito|$30", "Dona|$25", "Mantecada|$25", "Galleta|$20", "Torta de jamón|$65"],
    // the bus terminal (s67a): each route's morning bus, its andén, and the afternoon bus at 5:15
    DEPARTURES: ["SALIDAS", "10:15|TULUM|ANDÉN 2|A TIEMPO", "10:40|PLAYA DEL CARMEN|ANDÉN 3|A TIEMPO", "11:05|CANCÚN|ANDÉN 1|A TIEMPO",
      "11:30|MÉRIDA|ANDÉN 4|A TIEMPO", "17:15|CANCÚN|ANDÉN 1|A TIEMPO"],
  },
  restaurant: "yucateco",
  roomExtras: { customs: true, mexicanFlag: true, bankTurns: true, pharmacyDoctor: true, museumStairs: true, yucatanDinner: true, guayabera: true },
  // s71b: in Mexico an attendant fills the tank, so Doña Chela stands at the pump by the learner's car (beside pump 2,
  // the car facing the street), not in the shop; the learner talks to her from behind the car
  outdoorNpcs: [{ npc: "dot", x: 111.35, z: 6.1, rot: 0.11, ax: 111.6, az: 8.3 }],
  spotCars: [[113, 4.6, Math.PI]],
  // --- the town outdoors ---
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
    // the learner's rented car at the pump (s71b; `spotCars`)
    { kind: "sedan", color: "#c0c7cf" },
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
