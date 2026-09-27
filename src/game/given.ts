// Things people hand you during conversations (the "give" event), for the "Gavai: …" toast.
// Shared by the 3D town (Game) and the light mode (LightGame).
import type { SituationDef } from "../content/types";
import { parseForms } from "../convo/lt-morph";

/** Known props: icon and Lithuanian name (accusative). */
export const GIVEN: Record<string, [string, string]> = {
  "audio-guide": ["🎧", "audiogidą"], "baggage report": ["📄", "pranešimo apie bagažą kopiją"], "boarding-pass": ["🎫", "įlaipinimo taloną"],
  "bus-pass": ["🎫", "autobuso bilietą"], "bus-schedule": ["🗓️", "autobusų tvarkaraštį"], "car-keys": ["🔑", "automobilio raktelius"],
  cash: ["💵", "grynuosius"], "day-pass": ["🎫", "dienos bilietą"], "floor-plan": ["🗺️", "muziejaus planą"], keys: ["🔑", "raktus"],
  map: ["🗺️", "miesto žemėlapį"], "museum-ticket": ["🎟️", "muziejaus bilietą"], "overnight kit": ["🧴", "nakvynės rinkinį"],
  package: ["📦", "siuntinį"], passport: ["🛂", "pasą"], prescription: ["💊", "vaistus"], receipt: ["🧾", "kvitą"],
  "store-credit": ["💳", "parduotuvės kreditą"], "train-ticket": ["🎫", "traukinio bilietą"], water: ["💧", "vandens"],
  "key card": ["🔑", "kambario kortelę"], "key-card": ["🔑", "kambario kortelę"], laptop: ["💻", "nešiojamąjį kompiuterį"],
  badge: ["🪪", "darbuotojo kortelę"], "password card": ["🔐", "kortelę su slaptažodžiu"], "business card": ["📇", "vizitinę kortelę"],
  "phone number": ["📱", "telefono numerį"], ticket: ["🎫", "bilietą"], coffee: ["☕", "kavos"], form: ["📝", "anketą"],
};

/** Icon and Lithuanian name of a handed-over item: a known prop, else the situation's own item
 *  (a jacket, a medicine…) in the accusative. */
export function givenItem(sit: SituationDef | undefined, item: string): [string, string] {
  const ent = Object.values(sit?.entities ?? {}).flat().find((e) => e.id === item);
  return GIVEN[item] ?? (ent ? ["🛍️", ent.lt.split(" | ").map((u) => parseForms(u)[3]).join(" ")] : ["🎁", String(item)]);
}
