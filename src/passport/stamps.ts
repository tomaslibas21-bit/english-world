import { KIND, keepsakeFor, type KeepsakeKind } from "../content/keepsakes";
import { LOCATIONS } from "../content/locations";
import { PHOTO_THINGS } from "../content/photo-walk-lines";
import { SITUATIONS } from "../content/situations/catalog";
import { readPlayStats } from "../state/playStats";
import { stars, type Progress } from "../state/progress";
import { EM_MISSIONS } from "./missions";
import { copy, games, keepsakeNames, words, withCount, type Words, type Section } from "./words";

export interface Stamp {
  id: string; section: Section; title: Words; earned: boolean; condition: Words; proof: Words[];
  situation?: string; keepsake?: KeepsakeKind; stars?: number; href?: string; book?: Words;
}
export const positive = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n > 0;
const count = (n: unknown) => typeof n === "number" && Number.isSafeInteger(n) && n > 0 ? n : 0;
const distinct = (v: unknown): string[] => Array.isArray(v) ? [...new Set(v.filter((id): id is string => typeof id === "string" && !!id.trim()))] : [];
export const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export function townStamps(progress: Progress, cardCount: number, course: boolean): Stamp[] {
  const rows: Stamp[] = [];
  const places = new Map<string, Stamp[]>(), items = new Map<KeepsakeKind, Stamp[]>();
  const valid = progress.version === 1;
  for (const sit of SITUATIONS) {
    const saved = valid && record(progress.sits) ? progress.sits[sit.id] : undefined;
    const completions = count(saved?.completions);
    const kind = keepsakeFor(sit.id);
    const row: Stamp = {
      section: "situations", id: "situations:" + sit.id, title: sit.title, earned: completions > 0,
      condition: copy.sit, proof: [withCount(copy.times, completions)], situation: sit.id,
      stars: stars({ visits: 0, completions, used: distinct(saved?.used), twists: distinct(saved?.twists), memory: {} }),
      href: course && EM_MISSIONS[sit.id] ? "/situacijos/" + EM_MISSIONS[sit.id] : undefined,
    };
    rows.push(row);
    const loc = LOCATIONS[sit.location];
    if (loc && loc.kind !== "phone" && sit.mode !== "phone" && sit.mode !== "video")
      places.set(loc.id, [...places.get(loc.id) ?? [], row]);
    items.set(kind, [...items.get(kind) ?? [], row]);
  }
  for (const [id, sources] of places) {
    const done = sources.filter(row => row.earned);
    rows.push({ section: "places", id: "places:" + id, title: words(LOCATIONS[id].name, LOCATIONS[id].lt),
      condition: copy.place, earned: !!done.length, situation: sources[0].situation,
      proof: [...(done.length ? [copy.here] : []), ...(done.length ? done : sources).map(row => row.title)] });
  }
  for (const [kind, sources] of items) {
    const done = sources.filter(row => row.earned);
    rows.push({ section: "keepsakes", id: "keepsakes:" + kind, title: words(keepsakeNames[kind], KIND[kind].nominative),
      condition: copy.keepsake, earned: !!done.length, keepsake: kind, proof: (done.length ? done : sources).map(row => row.title) });
  }
  const started = valid ? readPlayStats(progress).games : {};
  for (const [id, title] of Object.entries(games)) {
    const n = count(started[id]), proof = [withCount(copy.starts, n)];
    if (n && id === "surf") proof.push(withCount(copy.waves, count(progress.surf?.waves)));
    if (n && id === "photowalk") {
      const found = distinct(progress.photoWalk?.found);
      proof.push(withCount(copy.finds, PHOTO_THINGS.filter(thing => found.includes(thing.id)).length));
    }
    rows.push({ section: "games", id: "games:" + id, title, condition: copy.game, earned: n > 0, proof });
  }
  rows.push({ section: "cards", id: "cards:pocket", title: copy.pocket, condition: copy.card, earned: cardCount > 0,
    proof: [withCount(copy.inCards, cardCount)] });
  return rows;
}
