// Places in Maple Harbor. The world builder (src/game/world) lays these out; situations refer to them by id.
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
  L("airport", "Maple Harbor Airport", "Oro uostas", "airport", "interior", "✈️"),
  L("taxi-stand", "Taxi Stand", "Taksi stotelė", "transport", "outdoor", "🚕"),
  L("station", "Union Station", "Traukinių ir autobusų stotis", "transport", "interior", "🚆"),
  L("bus-stop", "Bus Stop · Oak Avenue", "Autobuso stotelė", "transport", "outdoor", "🚌"),
  L("car-rental", "Harbor Car Rental", "Automobilių nuoma", "transport", "interior", "🚗"),
  L("gas-station", "Gas & Go", "Degalinė", "transport", "interior", "⛽"),
  L("hotel", "Harborview Hotel", "Viešbutis", "downtown", "interior", "🏨"),
  L("visitor-center", "Visitor Center", "Lankytojų centras", "downtown", "interior", "ℹ️"),
  L("museum", "Maple Harbor Museum of Art", "Meno muziejus", "downtown", "interior", "🖼️"),
  L("sunny-cup", "Sunny Cup Café", "Kavinė „Sunny Cup“", "downtown", "interior", "☕"),
  L("trattoria", "Lucia's Trattoria", "Restoranas „Lucia's“", "downtown", "interior", "🍝"),
  L("threads", "Threads", "Drabužių parduotuvė „Threads“", "downtown", "interior", "👕"),
  L("pharmacy", "Harbor Pharmacy", "Vaistinė", "downtown", "interior", "💊"),
  L("salon", "Snip & Style", "Kirpykla „Snip & Style“", "downtown", "interior", "✂️"),
  L("bank", "Harbor Bank", "Bankas", "downtown", "interior", "🏦"),
  L("post-office", "U.S. Post Office", "Paštas", "downtown", "interior", "📮"),
  L("town-square", "Town Square & Farmers' Market", "Miesto aikštė ir ūkininkų turgus", "square", "outdoor", "🌻"),
  L("police", "Police Station", "Policijos nuovada", "square", "interior", "🚓"),
  L("apartments", "Maple Street Apartments", "Daugiabutis Maple gatvėje", "residential", "interior", "🏢"),
  L("sophies-house", "Sophie's House", "Sofijos namai", "residential", "outdoor", "🎉"),
  L("dans-house", "Dan & Nora's House", "Dano ir Noros namai", "residential", "interior", "🏡"),
  L("office", "Brightline Office", "„Brightline“ biuras", "work", "interior", "💼"),
  L("the-pier", "The Pier Restaurant", "Restoranas „The Pier“", "harbor", "interior", "🌅"),
  L("clinic", "Harbor Family Clinic", "Šeimos klinika", "downtown", "interior", "🩺"),
  L("market", "Harbor Market", "Prekybos centras „Harbor Market“", "downtown", "interior", "🛒"),
  L("gym", "Harbor Fitness", "Sporto klubas „Harbor Fitness“", "residential", "interior", "🏋️"),
  // Advanced songs P25–P30: Maggie's driveway, where her old convertible is for sale (P25)
  L("cedar-lane", "Cedar Lane", "Cedar gatvė", "residential", "outdoor", "🚗"),
  // Batch H: Sproutly, a plant-care app startup in an old harbor warehouse (P18 "Up to My Ears")
  L("sproutly", "Sproutly", "Startuolis „Sproutly“", "harbor", "interior", "🌱"),
  L("phone", "Phone call", "Skambutis telefonu", "phone", "phone", "📱"),
].map((l) => [l.id, l]));

/** The town's name for beginners: how it sounds in Lithuanian and what it means. */
export const TOWN_LT = "Meipl Harboras – miestelio pavadinimas (pažod. „Klevų uostas“)";

/** What the English names mean, word for word, where the Lithuanian name doesn't already say it. Shown where the
 *  learner meets the name (walking up to a door, the map); the signs in the town stay English. */
export const NAME_MEANING: Record<string, string> = {
  airport: "Meipl Harboro oro uostas",
  station: "Sąjungos stotis",
  "bus-stop": "Ąžuolų alėja",
  "car-rental": "Uosto automobilių nuoma",
  "gas-station": "Įsipilk ir važiuok",
  hotel: "Vaizdas į uostą",
  museum: "Meipl Harboro meno muziejus",
  "sunny-cup": "Saulėtas puodelis",
  trattoria: "Lucijos tratorija (itališkas restoranėlis)",
  threads: "Siūlai (šnek. drabužiai)",
  pharmacy: "Uosto vaistinė",
  salon: "Kirpimas ir stilius",
  bank: "Uosto bankas",
  "post-office": "JAV paštas",
  apartments: "Klevų gatvės butai",
  office: "Šviesi linija",
  "the-pier": "Prieplauka",
  clinic: "Uosto šeimos klinika",
  market: "Uosto prekyvietė",
  gym: "Uosto sporto klubas",
  "cedar-lane": "Kedrų gatvelė",
  sproutly: "Daigelis (nuo sprout – daigas)",
};

/** A place in Lithuanian, with what its English name means: "Kavinė „Sunny Cup“ – pažod. „Saulėtas puodelis“". */
export const placeLt = (id: string) => {
  const l = LOCATIONS[id];
  if (!l) return "";
  const m = NAME_MEANING[id];
  return m ? `${l.lt} – pažod. „${m}“` : l.lt;
};

/** The same with the English name put in where the Lithuanian one leaves it out ("Degalinė „Gas & Go“ – pažod.
 *  „Įsipilk ir važiuok“"), for the conversation's header: there no door label or map shows the English name. */
export const placeLtNamed = (id: string) => {
  const l = LOCATIONS[id];
  if (!l || !NAME_MEANING[id] || l.lt.includes("„") || l.lt.includes(l.name.split(" ")[0])) return placeLt(id);
  const en = l.name.split(" · ").pop()!; // "Bus Stop · Oak Avenue": the meaning is Oak Avenue's
  return `${l.lt} „${en}“ – pažod. „${NAME_MEANING[id]}“`;
};
