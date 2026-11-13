// Puerto Colibrí for Lithuanians (docs/es/LEARNER-LT.md): the Spanish edition's places with their Lithuanian names
// and meanings (src/editions/es-lt/tables/_shared.json), and the place lines written the Lithuanian way.
import { LOCATIONS, NAME_MEANING, TOWN_LT as TOWN_ES } from "@/content/locations";
import { applyLearner } from "../../es/learner/walk";
import { TABLES } from "../tables/tables.gen";

const T = TABLES._shared;
if (T) {
  applyLearner({ locations: LOCATIONS }, T);
  for (const [id, m] of Object.entries(NAME_MEANING)) NAME_MEANING[id] = T.text[m] ?? m;
}
export * from "@/content/locations";
export const TOWN_LT = T?.text[TOWN_ES] ?? TOWN_ES;

/** A place in Lithuanian, with what its Spanish name means: „Kavinė „La Ceiba“ – pažodžiui „…“". */
export const placeLt = (id: string) => {
  const l = LOCATIONS[id];
  if (!l) return "";
  const m = NAME_MEANING[id];
  return m ? `${l.lt} – pažodžiui „${m}“` : l.lt;
};

/** The same with the Spanish name put in where the Lithuanian one leaves it out, for the conversation's header. */
export const placeLtNamed = (id: string) => {
  const l = LOCATIONS[id];
  const m = NAME_MEANING[id];
  if (!l || !m || l.lt.includes("„")) return placeLt(id);
  const name = m.includes(" · ") ? l.name : l.name.split(" · ")[0];
  return `${l.lt} „${name}“ – pažodžiui „${m}“`;
};
