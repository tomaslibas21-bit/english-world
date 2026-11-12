// Puerto Colibrí's look (replaces src/game/world/theme.ts in the Spanish edition; docs/es/TOWN.md). The first area
// restyled: the zócalo (a kiosco instead of the fountain, papel picado, palms, the stalls' signs in Spanish), the
// buildings around it and the Mercado Municipal, in the colours of a Mexican Caribbean town. Then the rest of the town
// outdoors (4 Nov 2026): the malecón and the beach, the main street, the church, the street furniture, the houses, the
// vehicles and the town's sounds; and the last details (5 Nov 2026): every speaker in the conversation's picture, the
// last props from Maple Harbor, calle Uxmal, the cenote and the ruins. What is still to do is in docs/es/TOWN.md.
import type { TownTheme } from "../../../../game/world/theme";
export type { BuildingLook, FloorKind, OutdoorSpot, RoomLook, TianguisGoods, TownTheme } from "../../../../game/world/theme";

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
  roomExtras: {
    customs: true, mexicanFlag: true, bankTurns: true, pharmacyDoctor: true, museumStairs: true, yucatanDinner: true, guayabera: true,
    // graphics round 2: Las Palmas, the hotel, the police, the museum, the airport, the clinic, the shops, the café, El Muelle
    lasPalmas: true, hotelMx: true, policeMx: true, museumMaya: true, airportMx: true, clinicMx: true, shopsMx: true, cafeMx: true, muelleMx: true,
    // graphics round 3: every place a line sends the learner to (the restrooms, the cafés, the ATM, the paquetería, the
    // elevator), the bus terminal's hall, and the rest of the rooms
    services: true, terminalMx: true, roomsMx: true,
    // graphics round 4: the shops and the clinic as Mexican ones from the door, the bank's floor, the halls and homes
    shopsMx4: true, clinicMx4: true, bankMx: true, hallsMx: true,
    // graphics round 5: the upper walls dressed (high windows, a greca), the shops' last Maple Harbor furniture replaced
    upperMx: true, shopsMx5: true,
  },
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
    // La Cocina de Lucía: "la del toldo rojo" (s62), red as the police's (a colour the town has: no new draw call)
    trattoria: { color: "#f7d08a", trim: "#8a1f2a", awning: "#8a1c2b" },
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
    // (graphics round 4) the airport's terminal in cream stucco and terracotta under its palapa, not a blue glass box
    terminal: { color: "#f4ead5", trim: "#b5523b" },
    // (graphics round 4) El Muelle in warm sand and teal under its palapa, where it was white and navy
    pier: { color: "#f6dcaa", trim: "#2a6f6b", awning: "#2a9d8f", roof: "palapa" },
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
  palms: [[8.6, -17.4], [47.6, -17.6], [8.4, -47.2], [49, -47.4], [20.5, -16.6], [39.5, -16.6], [6.8, -32], [51.4, -26],
    // (graphics round 2) along avenida Juárez up to the airport, and in the terminal's forecourt either side of its canopy
    [104, -15], [110, -15], [116, -15], [104, -1.3], [110, -1.3], [116, -1.3], [130.5, -22.5], [130.5, -27], [130.5, 6.5], [130.5, 11]],
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
  // (the tours kiosk between the bench at x -40 and the pier's boardwalk, clear of the lamp post at x -44 that stood
  // across its window)
  malecon: { kiosk: [-37, -64.6], kioskSign: "Tours a los cenotes", plaque: "Malecón" },
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
  // calle Flamboyán (West Street, by Departamentos Las Palmas, s65a, s65b), calle Hidalgo (Oak Avenue: "Flamboyán,
  // entre Hidalgo y Juárez", s65b) and calle Uxmal (Station Road)
  streetSigns: [
    [6.2, -14.4, "Av. Juárez", "Calle Ceiba"], [6.2, -48.6, "Av. del Puerto", "Calle Ceiba"],
    [64, -14.6, "Av. Juárez", "Calle Itzamná"], [64, -48.6, "Av. del Puerto", "Calle Itzamná"],
    [-64, -14.6, "Av. Juárez", "Calle Flamboyán"], [-64, -48.6, "Av. del Puerto", "Calle Flamboyán"],
    [-64, 44.2, "Calle Hidalgo", "Calle Flamboyán"], [-6.2, 31.9, "Calle Hidalgo", "Calle Ceiba"],
    // calle Uxmal (Station Road, past the bus terminal): a Mayan city's name, as Itzamná is a Mayan god's
    [-64, 70.4, "Calle Uxmal", "Calle Flamboyán"], [6.2, 70.4, "Calle Uxmal", "Calle Ceiba"], [64, 70.4, "Calle Uxmal", "Calle Itzamná"],
    // (graphics round 3) the clinic's corner, Hidalgo and Itzamná (TOWN.md "Getting around": the clinic is on Hidalgo a
    // little east of Itzamná): on the clinic's side of both streets
    [76, 31.9, "Calle Hidalgo", "Calle Itzamná"],
  ],
  stopWord: "ALTO",
  topes: { at: [[12, -12.6, 12, -3.4, 16.5, -14.4, Math.PI / 2], [46, -12.6, 46, -3.4, 41.5, -14.4, -Math.PI / 2], [28, -59.1, 28, -50.9, 24, -48.4, -Math.PI / 2]], word: "TOPE" },
  foodCart: { x: 33.5, z: -17.3, rot: Math.PI / 2, sign: "Elotes · Esquites" },
  // route 7's bus (s67b), a colectivo and two white-and-green taxis among the cars
  traffic: ["bus", "taxi", "colectivo", "car", "car", "taxi", "car", "car"],
  sounds: { bell: [52, -41], vendors: [30, -24], homesZ: 30 },

  // The last details (docs/es/TOWN.md "Done: the last details"): every speaker in the conversation's picture, the
  // mercado's crates, the buzón, Ximena's barda, the trees in bloom, calle Uxmal (above), the cenote and the ruins.
  // Everyone taking part within 12 m of the main speaker is framed, the camera backing off until all of them are in the
  // picture, a phone's narrow one too (Agente Medina in s65b, Marcos in s63, Gerardo in p27)
  talkCamera: { reach: 12, max: 30 },
  // and the ones who stood too far away come nearer: Don Arturo watches over the statue by the entrance hall (s70: his
  // "No se puede tocar"), Luis waits between the first tables to seat the guests (s73), Natalia comes to the door with
  // Diego to welcome the guest (s85, p30); at Las Palmas, Don Ernesto meets the learner just inside the apartment's door
  // (s81) and Doña Lupita is in the hallway by it (s82: the new neighbour's door), so that she can butt in on p29
  roomSpots: {
    museum: { harold: { x: -4.5, z: 0.3, rot: -0.53 } },
    trattoria: { marco: { x: -2.0, z: 1.2, rot: -0.54 } },
    "dans-house": { nora: { x: 1.3, z: 2.3, rot: -0.69 } },
    apartments: { patel: { x: -1.2, z: 2.4, rot: 0.25 }, rita: { x: -4.4, z: 0.9, rot: 0.1, ax: -4.2, az: 3.1 } },
  },
  marketFront: "mercado",
  mailbox: "correos",
  // Ximena's backyard (s63): a barda painted like her house, a cream cap, and a green metal gate standing open
  backyardWall: { wall: "#5fbfb0", base: "#3f8f84", cap: "#fff3e0", gate: "#2e5e3e" },
  // the leafy trees green, and in bloom here and there: a flamboyán red-orange, a guayacán yellow (one in eight each;
  // in Maple Harbor's order, so the reds and yellows that were autumn's stay where the blooms are)
  treeColors: ["#4f9a3e", "#3f8a3a", "#f2c230", "#e8432b", "#5aa83c", "#2f7d3c", "#6db544", "#7cbf4a"],
  // beyond the town's edge (TOWN.md task 8): a cenote across the meadow at the west end of avenida Juárez (s69: not on
  // foot, twenty minutes by colectivo: the town's edge is as far as the learner walks), and small Mayan ruins on the
  // rocky point past the beach's west end (s69: half an hour on foot)
  cenote: { x: -136, z: -6, sign: "Cenote Ka'an" },
  ruins: { x: -124, z: -74 },

  // Graphics, round 1 (docs/es/TOWN.md "Graphics, round 1"): the Caribbean's colors, the Saturday tianguis, rooms
  // that look Mexican. The sea from the shore out: the sand showing through, turquoise, aqua, then deep blue
  sea: { shore: "#9be6d8", shallow: "#3fd0c6", mid: "#1aa8c2", deep: "#1663a3", shallowTo: 26, midTo: 62 },
  // s91a: the tianguis on the zócalo on Saturday mornings, Doña Mari's flowers among its stalls. The square's four
  // stalls (layout.ts STALLS: flowers, fruit, veg, bread) and five more along the north and west sides, under lonas in
  // the market's colors (one per stall, in that order), clear of everyone's spot, the talk spots, the pigeons' ring
  // round the kiosco, the chatting pair, the benches and the elote cart
  tianguis: {
    lonas: ["#e4007c", "#f77f00", "#1f6fd1", "#2a9d5c", "#1f6fd1", "#f6c000", "#e4007c", "#f6c000", "#f77f00"],
    signs: {
      flowers: ["Flores", "Doña Mari"], fruit: ["Frutas", "mango · papaya · piña"], veg: ["Verduras", "frescas del día"],
      bread: ["Pan dulce", "conchas · cuernos"], pinatas: ["Piñatas", "para toda fiesta"], pottery: ["Barro", "ollas · cazuelas · jarritos"],
      hats: ["Sombreros", "de palma"], hammocks: ["Hamacas", "de Yucatán"], textiles: ["Rebozos", "y sarapes"],
    },
    stalls: [
      { x: 20, z: -43, rot: 0, goods: "pinatas" }, { x: 32, z: -43, rot: 0, goods: "pottery" }, { x: 44, z: -43.5, rot: 0, goods: "hats" },
      { x: 10, z: -38, rot: Math.PI / 2, goods: "hammocks" }, { x: 10, z: -28, rot: Math.PI / 2, goods: "textiles" },
    ],
  },
  roomLooks: {
    // Correos de México's rosa mexicano (the counter, the rugs and the sign are interiors.ts's, `mailbox`)
    "post-office": { accent: "#c2006a" },
    // Diego and Natalia's house: a warm ceramic tile floor, warm light walls, terracotta baseboards (and `homeMx`)
    "dans-house": { floor: "#e3c9a4", floorKind: "tile", wall: "#ffe6cc", accent: "#b5523b", dado: "#d9844f" },
    // (graphics round 2) Departamentos Las Palmas: pale mint walls, a teal baseboard, and (round 3) the Yucatán's
    // mosaicos de pasta on its floors (cement tiles with an eight-pointed star); the hotel's lobby:
    // pale stone tiles, cream walls, the sea's blue
    apartments: { floor: "#e9dcc0", floorKind: "pasta", wall: "#eef3e6", accent: "#2f7f78", dado: "#8fc9bd" },
    hotel: { floor: "#e8d6b6", floorKind: "tile", wall: "#fbf3e4", accent: "#1f6f8b" },
    // (graphics round 4) the shops and the clinic painted as Mexican ones: a strong lower band (the dado) under a light
    // wall, Mexican floors. Boutique Hilos: terracotta tiles, añil blue under warm cal; the estética: mosaicos in rosa
    // mexicano and turquoise, a turquoise dado under pink; Tienda El Faro: large ceramic tiles, the station's red under
    // cream; the car rental: granito, the green under pale sand; the clinic: granito, verde agua under white (as a
    // Mexican clinic's walls)
    threads: { floor: "#c0673f", floorKind: "barro", wall: "#f7e8cf", dado: "#2f5f9a", accent: "#7a1f4b" },
    salon: { floor: "#f3e6dc", floorKind: "pasta", pasta: ["#1aa39a", "#e4007c", "#f6a800"], wall: "#fde3ec", dado: "#22a39b", accent: "#c2185b" },
    "gas-station": { floor: "#e9e2d4", floorKind: "ceramic", wall: "#fbf1de", dado: "#c8352a", accent: "#7a1f1a" },
    "car-rental": { floor: "#e6dccb", floorKind: "granito", wall: "#f6ecd6", dado: "#1f8a70", accent: "#0f5a48" },
    clinic: { floor: "#e3e3dc", floorKind: "granito", wall: "#fbfaf4", dado: "#8fd1c4", dadoH: 1.4, accent: "#2a7f8a" },
    // the bank: granito under wood paneling (its compass rose: roomExtras.bankMx); the museum: terracotta under a Maya
    // red band; the airport: warm granito; El Muelle: mango walls over the sea's blue instead of pale blue
    bank: { floor: "#ddd5c4", floorKind: "granito", wall: "#f3ead8", dado: "#7a5232", dadoH: 1.25, accent: "#1f4f8a" },
    museum: { floor: "#cf9a72", floorKind: "barro", wall: "#f7f0e2", dado: "#8e2b1f", dadoH: 0.9, accent: "#3a2f22" },
    airport: { floor: "#e6dfd0", floorKind: "granito" },
    "the-pier": { wall: "#f6dfae", dado: "#1f8fb0", accent: "#14607a" },
  },
  homeMx: true,

  // Graphics, round 2 (docs/es/TOWN.md "Graphics, round 2"): the rooms' plain colors in two meshes each (far fewer draw
  // calls: room for the rooms' new things); the selva round the town instead of temperate hills; lamps that dissolve
  // beside the camera; the windows' panes as single faces (triangles for the new things)
  roomMerge: true,
  selva: { hills: "#3f7d3a", canopy: ["#2f6b34", "#3b7d3a", "#2a5f30", "#467f3c", "#356f37", "#2c6a3f"] },
  nearFade: true,
  lean: true,
  // the bus terminal (s67a): its andenes under canopies either side of the door, the coaches at the curb in front of them
  // (the departures board: Cancún from andén 1, Tulum from andén 2)
  busTerminal: {
    andenes: ["Andén 1", "Andén 2"], buses: [{ x: 31, dest: "CANCÚN" }, { x: 57.5, dest: "TULUM" }],
    // (graphics round 4) white pilasters between its windows and at its corners, a terracotta band along its foot, and
    // the suitcase of the traveller sitting on andén 2's bench (theme `sitters`)
    front: { pilasters: [-16.8, -12.9, -9.7, -6.5, -3.3, 3.1, 6.3, 9.5, 12.7, 16.8], cases: [[36.5, 47.5]] },
  },
  // the airport outside: the drop-off canopy thatched, agaves, and the town's welcome
  airportOut: { welcome: ["¡Bienvenidos a Puerto Colibrí!", "Welcome · Caribe Mexicano"], terminal: { hall: 16 } },
  // the zócalo dressed: four laureles in its quarters, iron bancas (the kiosco's three and four more: two on the south
  // side facing the kiosco, one each side), colonial lamp posts on its diagonals; all clear of everyone's spot, the
  // talk spots, the chatting pair, the stalls and the pigeons' ring round the kiosco (tests/es/town.test.ts)
  zocalo: {
    laureles: [[13.5, -25.5], [44.5, -21.5], [15.5, -31.5], [45.5, -28.5]],
    bancas: [[24.5, -17.4, Math.PI], [37, -17.4, Math.PI], [17, -27.5, Math.PI / 2], [43.5, -25, -Math.PI / 2]],
    lamps: [[22.2, -22.2], [37.8, -22.2], [22.2, -37.8], [37.8, -37.8]],
  },
  // the townspeople of a Caribbean town (none dressed as the player can be: ui/Title.tsx LOOKS): mostly dark hair and
  // warm skins, light summer clothes, a straw hat now and then, shorts and sandals on some (the tourists among them)
  walkers: {
    skins: ["#e8c09a", "#d9a47e", "#c68e63", "#b07a52", "#a0694a", "#8a5a3c", "#6e4630", "#f2d3bd", "#c68e63"],
    hairs: ["#1f1a17", "#1f1a17", "#2b1d16", "#3b2618", "#1f1a17", "#5a3a25", "#2b1d16", "#b8b3ac"],
    tops: ["#f4f1ea", "#fbe9c8", "#f7c6c7", "#b8e0d2", "#ffd166", "#9ad1d4", "#ece3cf", "#c9e4f2", "#e4007c", "#f6a800", "#7ac143", "#ff8fab"],
    bottoms: ["#d8c3a0", "#4a6fa5", "#2b2d42", "#f4f1ea", "#5c4b3a", "#8fa7c4", "#3d405b"],
    straw: 0.14, shorts: 0.3, sandals: 0.28,
  },
  // more people on the malecón and the beach (a pair chatting by the bench at x 46, another on the sand by the
  // palapas), sitting on the zócalo's south bancas and the malecón's benches, and four of the tianguis' vendors behind
  // their stalls (pottery, fruit, hats, vegetables), facing the square
  chatSpots: [[43.5, -63.75, 44.7, -63.45], [-2.6, -68.2, -1.5, -67.9],
    // (graphics round 5) a pair on the sand between the palapas at the west end
    [-72.6, -67.5, -71.5, -67.2]],
  sitters: [[24.05, -17.4], [37.45, -17.4], [0.45, -65.05], [21.55, -65.05], [-39.55, -65.05],
    // (graphics round 4) two under the palapas by the letters, on their loungers (`beachLife`), and a traveller on
    // andén 2's bench (a person is ~4,000 triangles, in every view that sees them: no more, for the phones' budget)
    [-5.05, -70.1], [2.05, -70.3], [35.65, 47.65],
    // (graphics round 5, with the far version of each person, `farPeople`) five more on the palapas' loungers, two more
    // travellers on the andenes' benches, two on the zócalo's side bancas
    [-63.05, -70.0], [-55.95, -70.2], [31.95, -70.1], [42.95, -70.3], [75.05, -70.1],
    [38.25, 47.65], [52.65, 47.65], [17, -27.95], [43.5, -24.55]],
  vendors: [[32, -44.25, 0], [26, -44.25, 0], [44, -44.75, 0], [38, -43.25, 0]],
  // (and those who sit or stand farther than 22 m from the player keep their pose: at that distance a breath shows
  // nothing, and the town's people cost the frame no more than before the round)
  stillBeyond: 22,
  // (graphics round 5) the townspeople farther than 24 m from the camera in their far version (a third of the triangles)
  farPeople: 24,
  // the town's name on the malecón where calle Ceiba meets it, the sea behind it (clear of the bench at x 0, the
  // sidewalk's palms and lamps, and the chatting pair)
  // the light outdoors: a warmer sun, a touch more exposure, a bluer zenith over a warm horizon, bigger cumulus
  light: { sun: "#ffe9c4", exposure: 1.06, sky: ["#3f9be6", "#a3d6f5", "#fde9cc"], fog: "#d6ecf2", hemi: ["#e6f4ff", "#9cc27a"], clouds: 1.5 },
  // the houses' fronts: a rodapié, a grille over the door with its number on a talavera tile, plants by it
  houseFronts: { sophie: "12", dan: "24", house3: "31", house4: "47", house5: "53" },
  // the streets as a Mexican town paints them: no white edge lines, the curbs yellow by the corners
  streetPaint: { corner: 5, color: "#f2c230" },
  // (graphics round 3) the walking camera stands as high as the zócalo's laureles' crowns: a crown it is in or near is
  // left out whole, one in the way of her or close in front of the lens fades to a light dither (fade.ts deepFade)
  fade: { most: 0.94, near: 1.5 },
  // (graphics round 3) the outdoor pieces in a mesh for each part of town: only what is in view is drawn
  regions: true,
  // and the tianguis' goods (fruit, flowers, pots, hats: thousands of triangles) left out beyond 45 m of the camera
  farHide: 45,
  // the town's plain coloured shapes in a mesh for each 50 m square of it (two: with and without shadows): a view draws
  // the squares it sees, in a few calls (room for this round's things in calls and triangles)
  townMerge: 50,
  // and a room's signs and posters in one mesh on one texture (one draw call for all of them: room for this round's)
  panelAtlas: true,
  // the overhead lines along calle Hidalgo (poles on its north sidewalk, clear of the lamps, the signs and the corners),
  // and the service drops across the street to Ximena's, Diego's and the houses east of the terminal
  cables: {
    poles: [[-100, 33], [-80, 33], [-58, 33], [-36, 33], [-14, 33], [10, 33], [34, 33], [58, 33], [80, 33], [104, 33]],
    drops: [[2, -57.5, 5.6, 47.4], [3, -33.5, 5.6, 47.4], [5, 18, 5.6, 48.9], [8, 87, 5.6, 48.9], [9, 106, 5.6, 48.9]],
  },
  // the sidewalks: clay pots by the doors of Hilos, the estética, Correos, the car rental and the pharmacy; a fruit cart
  // in front of the museum; the water man's tricycle on Hidalgo by Ximena's
  sidewalks: {
    macetas: [[-24, -0.35, 1.9], [-10, -0.35, 1.7], [30, -0.35, 1.9], [84, -0.35, 2.0], [-88, -0.35, 2.0]],
    fruitCart: [-34, -14.9, 0, "Frutas · Cocos"],
    trike: [-48.5, 44.0, Math.PI / 2],
  },
  // El Muelle's terrace: a deck either side of its pier on the sand, tables under palapas
  terrace: [[-40.6, -32.7, -71.6, -68.6], [-27.3, -19.4, -71.6, -68.6]],
  // towels on the sand between the palapas, and the coconut seller on the malecón
  beach: {
    towels: [[-85, -70.6, 0.1, "#ff5a36"], [-58.4, -70.5, 0.3, "#e4007c"], [-1.0, -70.8, -0.2, "#00a6a6"], [36.5, -70.7, 0.15, "#f6a800"], [82.5, -70.6, -0.25, "#1f6fd1"]],
    cocos: [-14, -63.6, 0, "Cocos fríos"],
  },
  // the atrial cross before the church's door, by the palm at the square's corner
  atrialCross: [50.0, -44.6], // (graphics round 4: inside the atrium's wall)
  // the mirador where avenida Juárez ends at the meadow, looking out west to Cenote Ka'an
  mirador: { x: -107, z: -7.5, rot: -Math.PI / 2, sign: "Mirador · Cenote Ka'an →" },
  // a second taxi waiting at the sitio, behind the first, at the curb (clear of the cars' lane)
  taxis: [[115.8, -4.25, -Math.PI / 2]],
  // graphics round 4: the rooms' walls taller than the phone's room view (its top is wall, not the dark above it)
  roomWallH: 8.6,
  // Graphics, round 4 (town, docs/es/TOWN.md "Graphics, round 4"): the street trees as flamboyanes and almendros
  tropicalTrees: true,
  // (and palms in the bus terminal's forecourt, where a flat crown would cut through the andenes' canopies and the coaches)
  treePalms: [[26, 64, 43, 49.5]],
  // and the houses: a concrete portal with the terrace upstairs, chairs, rebar and the wash on the roof
  casas: true,
  // the church's atrium: a whitewashed wall with merlons 3.4 m out from its facade, the gate 3.2 m wide before the door,
  // the atrial cross inside it on the beach side, the bread stall's table outside it on the other; the facade's
  // columns, entablature and niches
  atrio: { depth: 3.4, left: 5.4, right: 4.4, gate: 1.6 },
  // the beach: the palapas thatched in layers with a ragged fringe, people on their loungers (theme `sitters`)
  beachLife: true,
  // calle Hidalgo's poles dissolve within 6–8 m of the camera, so they never sweep past as grey bars
  poleFade: [6, 8],
  // the meadow out to the cenote as the Yucatán's scrub (clear of the cenote and its palapa, the mirador and the end of
  // avenida Juárez), two ceibas standing over the selva behind it
  meadow: { x0: -152, x1: -113, z0: -36, z1: 26, clear: [[-136, -6, 13], [-127.6, -1.6, 4], [-107, -7.5, 5], [-112, -8, 6]], ceibas: [[-150, -16], [-147, 9]] },
  // Graphics, round 5 (docs/es/TOWN.md "Graphics, round 5"): adoquín on avenida Juárez through the centro (calle
  // Flamboyán to calle Itzamná) and on the streets round the zócalo (Ceiba, Itzamná, avenida del Puerto along the
  // square), curb to curb; green bins on the sidewalks, iron bolardos at the square's corners on Juárez, a bolero's
  // stand on the square's north edge
  adoquin: {
    streets: [[-74, -13, 74, -3], [-4.5, -50.5, 4.5, -13], [66, -50.5, 74, -13], [-4.5, -59.5, 74, -50.5]],
    bins: [[19.5, -13.7, Math.PI], [-36, -2.4, 0], [-17, -2.4, 0], [20, -2.4, 0], [56, -2.4, 0], [-4.8, -30, Math.PI / 2]],
    bolardos: [[8.2, -13.5, 12.4, -13.5], [46.2, -13.5, 49.8, -13.5]],
    bolero: [44.6, -17.3, Math.PI],
  },
  letras: { text: "PUERTO COLIBRÍ", x: 2.8, z: -63.55, h: 1.45, colors: ["#e4007c", "#f77f00", "#00a6a6", "#f6c000", "#7ac143", "#6d2e9e", "#1f6fd1", "#ff5a36"] },
};
