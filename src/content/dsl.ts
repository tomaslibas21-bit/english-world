// Small helpers for writing situations.
import type { EntityDef, SentSrc } from "./types";

/** Sentence: EN units | LT units | natural LT (units separated by " | "). */
export const t = (en: string, lt: string, nat: string, extra: Partial<SentSrc> = {}): SentSrc => ({ en, lt, nat, ...extra });

/** Entity. `lt` holds six case forms per unit ("latė/latės/latei/latę/late/latėje"); one form = indeclinable. */
export const ent = (id: string, en: string, lt: string, g: "m" | "f", extra: Partial<EntityDef> = {}): EntityDef => ({ id, en, lt, g, ...extra });

/** Pick entities by id from a list. */
export const only = (list: EntityDef[], ids: string[]) => list.filter((e) => ids.includes(e.id));
