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
  L("phone", "Phone call", "Skambutis telefonu", "phone", "phone", "📱"),
].map((l) => [l.id, l]));
