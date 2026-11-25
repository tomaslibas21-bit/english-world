// The conversations as the game loads them (phone loading, 16 Nov 2026). The main script carries only what the town,
// its lists, the map, the radio and the title screen need of each conversation (SITUATIONS here: meta.gen.ts); a
// conversation's own file (its lines, grammar, hints and handlers, 60–260 kB each) is a chunk of its own, fetched when
// the conversation opens (loadSituation) or before, when the player comes near its place, takes it as a task or opens
// the phone (prefetchSituations: src/game/prefetch.ts). A conversation that is open is always loaded: getSituation.
// Tools and tests import ./index (every conversation, at once), as before.
import type { SituationDef, SituationMeta } from "../types";
import { GYM_ENTRY } from "../gym-entry";
import { META, LOAD } from "./meta.gen";

export const KEEPER_SIT = "x05-lighthouse-keeper";
export const SITUATIONS: readonly SituationMeta[] = META;
export const SITUATION_BY_ID: Record<string, SituationMeta> = Object.fromEntries(META.map((s) => [s.id, s]));

const loaded = new Map<string, SituationDef>();
const pending = new Map<string, Promise<SituationDef | null>>();

/** The conversation's whole definition, if its file is loaded (always, for one that is open). */
export function getSituation(id: string): SituationDef | undefined {
  return loaded.get(id);
}

/** Loads a conversation's file (once; null for an unknown id). Rejects when the file can't be fetched (offline): the
 *  next call tries again. */
export function loadSituation(id: string): Promise<SituationDef | null> {
  const have = loaded.get(id);
  if (have) return Promise.resolve(have);
  let p = pending.get(id);
  if (!p) {
    const load = LOAD[id];
    if (!load) return Promise.resolve(null);
    p = load().then(
      (def) => { loaded.set(id, def); pending.delete(id); return def; },
      (err) => { pending.delete(id); throw err; },
    );
    pending.set(id, p);
  }
  return p;
}

/** Starts loading these conversations' files in the background (the ones not loaded or loading yet). */
export function prefetchSituations(ids: Iterable<string>) {
  // The gym lines share the conversation chunk. Fetch it on explicit conversation or workout entry.
  for (const id of ids) if (id !== GYM_ENTRY.situation && !loaded.has(id) && !pending.has(id) && LOAD[id]) {
    loadSituation(id).catch(() => { /* again when it opens */ });
  }
}
