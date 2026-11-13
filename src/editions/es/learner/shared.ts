// The town-wide learner text (docs/es/LEARNER-LT.md): the cast's roles, the places and what their names mean, the
// global lines, hints and tips, the passers-by, the merge notes. One object for the walk (learnerItems,
// applyLearner) and its table, src/editions/es-lt/tables/_shared.json.
import { NPCS } from "@/content/npcs";
import { LOCATIONS, NAME_MEANING, TOWN_LT } from "@/content/locations";
import { GLOBAL_HINTS, GLOBAL_LINES, GLOBAL_TIPS } from "@/content/global";
import { AMBIENT_LINES } from "@/content/ambient";
import { MERGES } from "@/content/merges";

/** The shared content as the walk sees it. NAME_MEANING and TOWN_LT are plain strings, so they come wrapped. */
export function sharedContent(): any {
  return {
    npcs: NPCS, locations: LOCATIONS, lines: GLOBAL_LINES, hints: GLOBAL_HINTS, tips: GLOBAL_TIPS, ambient: AMBIENT_LINES,
    merges: MERGES,
    meaning: Object.entries(NAME_MEANING).map(([id, lt]) => ({ id, lt })),
    town: [{ lt: TOWN_LT }],
  };
}
