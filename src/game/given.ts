// Things people hand you during conversations (the "give" event), for the "Gavai: …" toast.
// Shared by the 3D town (Game) and the light mode (LightGame).
import type { SituationDef } from "../content/types";
import { parseForms } from "../convo/lt-morph";
import { L } from "../ui/i18n";

/** Known props: icon and Lithuanian name (accusative). */
export const GIVEN: Record<string, [string, string]> = {
  "audio-guide": ["🎧", L("audiogidą")], "baggage report": ["📄", L("pranešimo apie bagažą kopiją")], "boarding-pass": ["🎫", L("įlaipinimo taloną")],
  "bus-pass": ["🎫", L("autobuso bilietą")], "bus-schedule": ["🗓️", L("autobusų tvarkaraštį")], "car-keys": ["🔑", L("automobilio raktelius")],
  cash: ["💵", L("grynuosius")], "day-pass": ["🎫", L("dienos bilietą")], "floor-plan": ["🗺️", L("muziejaus planą")], keys: ["🔑", L("raktus")],
  map: ["🗺️", L("miesto žemėlapį")], "museum-ticket": ["🎟️", L("muziejaus bilietą")], "overnight kit": ["🧴", L("nakvynės rinkinį")],
  package: ["📦", L("siuntinį")], passport: ["🛂", L("pasą")], prescription: ["💊", L("vaistus")], receipt: ["🧾", L("kvitą")],
  "store-credit": ["💳", L("parduotuvės kreditą")], "train-ticket": ["🎫", L("traukinio bilietą")], water: ["💧", L("vandens")],
  "key card": ["🔑", L("kambario kortelę")], "key-card": ["🔑", L("kambario kortelę")], laptop: ["💻", L("nešiojamąjį kompiuterį")],
  badge: ["🪪", L("darbuotojo kortelę")], "password card": ["🔐", L("kortelę su slaptažodžiu")], "business card": ["📇", L("vizitinę kortelę")],
  "phone number": ["📱", L("telefono numerį")], ticket: ["🎫", L("bilietą")], coffee: ["☕", L("kavos")], form: ["📝", L("anketą")],
};

/** Icon and Lithuanian name of a handed-over item: a known prop, else the situation's own item
 *  (a jacket, a medicine…) in the accusative. */
export function givenItem(sit: SituationDef | undefined, item: string): [string, string] {
  const ent = Object.values(sit?.entities ?? {}).flat().find((e) => e.id === item);
  return GIVEN[item] ?? (ent ? ["🛍️", ent.lt.split(" | ").map((u) => parseForms(u)[3]).join(" ")] : ["🎁", String(item)]);
}
