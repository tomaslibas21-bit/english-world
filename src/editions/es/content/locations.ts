// Places in Puerto Colibrí (replaces src/content/locations.ts in the Spanish edition). The ids are Maple Harbor's,
// so the world builder lays them out the same way; `name` is the Spanish sign, `lt` what it is in English (the
// learner's language), and NAME_MEANING what a name means word for word.
export interface LocationDef {
  id: string;
  name: string;
  lt: string;
  district: "airport" | "downtown" | "square" | "residential" | "work" | "transport" | "harbor" | "phone";
  /** "interior" = you walk in through a door; "outdoor" = the NPC is outside; "phone" = a call from your phone. */
  kind: "interior" | "outdoor" | "phone";
  icon: string;
}

const L = (id: string, name: string, lt: string, district: LocationDef["district"], kind: LocationDef["kind"], icon: string): LocationDef =>
  ({ id, name, lt, district, kind, icon });

export const LOCATIONS: Record<string, LocationDef> = Object.fromEntries([
  L("airport", "Aeropuerto de Puerto Colibrí", "The airport", "airport", "interior", "✈️"),
  L("taxi-stand", "Sitio de Taxis", "Taxi stand", "transport", "outdoor", "🚕"),
  L("station", "Terminal de Autobuses", "Bus station", "transport", "interior", "🚌"),
  L("bus-stop", "Parada · Calle Ceiba", "Bus stop", "transport", "outdoor", "🚌"),
  L("car-rental", "Renta de Autos Colibrí", "Car rental", "transport", "interior", "🚗"),
  // outdoor: the conversation (s71b) happens at the pump, where an attendant fills the tank; the shop stays open
  L("gas-station", "Gasolinera El Faro", "Gas station", "transport", "outdoor", "⛽"),
  L("hotel", "Hotel Mar Azul", "The hotel", "downtown", "interior", "🏨"),
  L("visitor-center", "Información Turística", "Tourist information", "downtown", "interior", "ℹ️"),
  L("museum", "Museo de la Costa Maya", "The museum", "downtown", "interior", "🖼️"),
  L("sunny-cup", "Café La Ceiba", "Café “La Ceiba”", "downtown", "interior", "☕"),
  L("trattoria", "La Cocina de Lucía", "Lucía's Yucatecan restaurant", "downtown", "interior", "🌮"),
  L("threads", "Boutique Hilos", "Clothing store “Hilos”", "downtown", "interior", "👕"),
  L("pharmacy", "Farmacia del Puerto", "The pharmacy", "downtown", "interior", "💊"),
  L("salon", "Estética Tijeras", "Hair salon “Tijeras”", "downtown", "interior", "✂️"),
  L("bank", "Banco del Puerto", "The bank", "downtown", "interior", "🏦"),
  L("post-office", "Oficina de Correos", "The post office", "downtown", "interior", "📮"),
  L("town-square", "Zócalo · Tianguis", "The main square and its market stalls", "square", "outdoor", "🌺"),
  L("police", "Policía Municipal", "The police station", "square", "interior", "🚓"),
  L("apartments", "Departamentos Las Palmas", "Apartment building “Las Palmas”", "residential", "interior", "🏢"),
  L("sophies-house", "Casa de Ximena", "Ximena's house", "residential", "outdoor", "🎉"),
  L("dans-house", "Casa de Diego y Natalia", "Diego and Natalia's house", "residential", "interior", "🏡"),
  L("office", "Línea Clara", "The office of “Línea Clara”", "work", "interior", "💼"),
  L("the-pier", "Restaurante El Muelle", "Restaurant “El Muelle”", "harbor", "interior", "🌅"),
  L("clinic", "Clínica Familiar", "The family clinic", "downtown", "interior", "🩺"),
  L("market", "Mercado Municipal", "The market hall", "downtown", "interior", "🍉"),
  L("gym", "Gimnasio Colibrí", "The gym", "residential", "interior", "🏋️"),
  L("cedar-lane", "Calle de los Cedros", "Cedar Street", "residential", "outdoor", "🚗"),
  L("sproutly", "Brotecito", "The startup “Brotecito”", "harbor", "interior", "🌱"),
  L("phone", "Llamada", "Phone call", "phone", "phone", "📱"),
].map((l) => [l.id, l]));

/** The town's name for beginners: how it sounds and what it means. */
export const TOWN_LT = "Puerto Colibrí – the town's name (literally “Hummingbird Harbor”)";

/** What the Spanish names mean, word for word, where the English description doesn't already say it. */
export const NAME_MEANING: Record<string, string> = {
  airport: "Hummingbird Harbor Airport",
  "taxi-stand": "taxi stand (‘sitio’ is Mexican for it)",
  "bus-stop": "stop · Ceiba Street",
  "car-rental": "Hummingbird car rental",
  "gas-station": "the lighthouse gas station",
  hotel: "Blue Sea Hotel",
  "visitor-center": "tourist information",
  museum: "Museum of the Maya Coast",
  "sunny-cup": "the ceiba (the Maya's sacred tree)",
  threads: "threads",
  pharmacy: "the harbor pharmacy",
  salon: "scissors (‘estética’ is a hair salon)",
  bank: "the harbor bank",
  "post-office": "post office",
  "town-square": "main square · street market",
  police: "town police",
  apartments: "the palms apartments",
  office: "clear line",
  "the-pier": "the pier",
  clinic: "family clinic",
  market: "town market",
  gym: "Hummingbird gym",
  "cedar-lane": "street of the cedars",
  sproutly: "little sprout",
};

/** A place in English, with what its Spanish name means: "Café “La Ceiba” – literally “the ceiba (…)”". */
export const placeLt = (id: string) => {
  const l = LOCATIONS[id];
  if (!l) return "";
  const m = NAME_MEANING[id];
  return m ? `${l.lt} – literally “${m}”` : l.lt;
};

/** The same with the Spanish name put in where the English one leaves it out, for the conversation's header. A
 *  meaning with " · " covers both halves of a "Zócalo · Tianguis" name, so the header shows both halves. */
export const placeLtNamed = (id: string) => {
  const l = LOCATIONS[id];
  const m = NAME_MEANING[id];
  if (!l || !m || l.lt.includes("“")) return placeLt(id);
  const name = m.includes(" · ") ? l.name : l.name.split(" · ")[0];
  return `${l.lt} “${name}” – literally “${m}”`;
};
