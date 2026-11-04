// Puerto Colibrí's look (replaces src/game/world/theme.ts in the Spanish edition; docs/es/TOWN.md). The first area
// restyled: the zócalo (a kiosco instead of the fountain, papel picado, palms, the stalls' signs in Spanish), the
// buildings around it and the Mercado Municipal, in the colours of a Mexican Caribbean town. The other areas are
// the restyling tasks in docs/es/TOWN.md.
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
  parkedCars: [[113, 4.6, Math.PI]],
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
  },
  locationSigns: true,
  stallSigns: { flowers: "Flores", fruit: "Frutas", veg: "Verduras", bread: "Pan dulce" },
  // from the kiosco's roof to the square's edges: the lamp posts and the corners
  papelPicado: [[12, -18, 4.6], [48, -18, 4.6], [10, -44, 4.6], [50, -44, 4.6], [30, -16, 4.8], [52, -30, 4.6], [8, -30, 4.6], [30, -47, 4.6]],
  palms: [[8.6, -17.4], [47.6, -17.6], [8.4, -47.2], [49, -47.4], [20.5, -16.6], [39.5, -16.6], [6.8, -32], [51.4, -26]],
  market: "mercado",
};
