// What goes with a line of a song besides its words: the course's notes on it ("Paaiškinimai" / "Notes") and its
// picture ("Paveikslėliai" / "Pictures"). Both are the course's own files, the ones its song player shows
// (fluent-steps src/lib/songs/data.ts fetchSongNotes, src/lib/course/text-art.ts songLinePictures); the radio shows
// them in the lyric strip when the learner switches them on, and fetches nothing until then.
//
//   the notes       <files>/songs/notes/<id>.json           a course file, like the song's words (songs.ts)
//                     { title?, lines: [{ i, es, lt, more? }] }   i: the line's index in the song's L (0-based)
//   the pictures    one of two lists, whichever the course's site has:
//     <site>/art/flashcards/v1/manifests/songs/<id>.json    English Master, Spanish Master: the flashcards' approved
//                     { version: 1, cards: { sha256("songs:<id>#<line's key>"): { target_sha256, path, approved } } }
//     <site>/songs/art/<id>.json                            a plain list by the line's key (a course whose pictures
//                     { version: 1, base?, lines: { "<line's key>": "<address or path>" } }    aren't kept per song)
//   a picture       <files>/<path> (768 px, about 120 KB), open to everyone on the files host: no token
import type { RadioConfig, SongLine } from "./songs";

/** A note on words of a line: `es` is the part of the line it is about, `lt` what to know, in the learner's
 *  language (the course's file has a longer `more` too, which the strip has no room for). */
export interface LineNote { es: string; lt: string }

/** The notes of a song's file by line index; lines without notes aren't in it. */
export function readSongNotes(data: unknown): Map<number, LineNote[]> {
  const out = new Map<number, LineNote[]>();
  const lines = (data as { lines?: unknown } | null)?.lines;
  if (!Array.isArray(lines)) return out;
  for (const n of lines as { i?: unknown; es?: unknown; lt?: unknown }[]) {
    if (!n || !Number.isInteger(n.i) || typeof n.lt !== "string" || !n.lt.trim()) continue;
    const list = out.get(n.i as number) ?? [];
    list.push({ es: typeof n.es === "string" ? n.es.trim() : "", lt: n.lt.trim() });
    out.set(n.i as number, list);
  }
  return out;
}

/** The line whose notes show while the line at `row` of `lines` is on show at `t` seconds, by its index in the
 *  song's file (-1: none): the line itself if it has notes; else the last one before it that had, while that one
 *  began less than `linger` seconds ago (a note takes longer to read than its line to sing). `row`: an index into
 *  `lines`, the timeline's rows; each knows its line's own index, `i`. */
export function notedLineAt(notes: Map<number, LineNote[]>, lines: SongLine[], row: number, t: number, linger = 14): number {
  for (let k = row; k >= 0; k--) {
    const line = lines[k];
    if (!line) return -1;
    if (line.i !== undefined && notes.get(line.i)?.length) return k === row || t < line.s + linger ? line.i : -1;
    if (t >= line.s + linger) return -1;
  }
  return -1;
}

/** The key the courses know a line by (fluent-steps src/lib/songs/slug.ts slugKey): lower case, letters, digits and
 *  apostrophes, words joined by "-", anything in brackets left out. */
export function lineKey(text: string): string {
  return String(text || "").toLowerCase().replace(/[‘’`]/g, "'").replace(/\([^)]*\)/g, " ").replace(/[^\p{L}\p{N}']+/gu, " ").trim().replace(/\s+/g, "-");
}

async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The list's site (songs.ts). */
const site = (cfg: RadioConfig) => cfg.index.replace(/\/songs\/[^/]*$/, "");

/** Where a song's pictures are listed: the addresses to try, in order (the two lists of this file's header). */
export function songArtUrls(cfg: RadioConfig, id: string): string[] {
  const name = `${encodeURIComponent(id)}.json`;
  return [`${site(cfg)}/art/flashcards/v1/manifests/songs/${name}`, `${site(cfg)}/songs/art/${name}`];
}

/** A picture's address from its place in a list: a whole address as it is, a path under the course's files folder
 *  (or `base`, or the site in a local trial). Only a picture file's address, never anything else. */
function pictureUrl(cfg: RadioConfig, path: string, base?: string): string | null {
  if (!/^[\w./:-]+\.(webp|jpe?g|png|avif)$/i.test(path) || path.includes("..")) return null;
  if (/^https:\/\//.test(path)) return path;
  if (path.includes(":") || path.startsWith("//")) return null;
  const root = (typeof base === "string" && /^https:\/\//.test(base) ? base : cfg.files ?? site(cfg)).replace(/\/+$/, "");
  return `${root}/${path.replace(/^\/+/, "")}`;
}

/** Each line's own picture (null where it has none), by the line's index in `lines`, from either kind of list. */
export async function readLinePictures(data: unknown, cfg: RadioConfig, id: string, lines: Pick<SongLine, "src">[]): Promise<(string | null)[]> {
  const d = data as { version?: unknown; base?: unknown; cards?: unknown; lines?: unknown } | null;
  if (!d || d.version !== 1) return lines.map(() => null);
  const plain = d.lines && typeof d.lines === "object" && !Array.isArray(d.lines) ? d.lines as Record<string, unknown> : null;
  const cards = d.cards && typeof d.cards === "object" && !Array.isArray(d.cards) ? d.cards as Record<string, { target_sha256?: unknown; path?: unknown; approved?: unknown } | null> : null;
  return Promise.all(lines.map(async (line) => {
    const src = String(line.src ?? "").trim(), key = lineKey(src);
    if (!key) return null;
    if (plain) { const path = plain[key]; return typeof path === "string" ? pictureUrl(cfg, path, d.base as string | undefined) : null; }
    if (!cards) return null;
    // only a picture approved for exactly this line: the card's identity and its text, both by their hashes
    const [card, target] = await Promise.all([sha256(`songs:${id}#${key}`), sha256(src)]);
    const entry = cards[card];
    return entry && entry.approved === true && entry.target_sha256 === target && typeof entry.path === "string" ? pictureUrl(cfg, entry.path) : null;
  }));
}

/** The picture on show for each line: its own, else the one of the line before (the course's player keeps a picture
 *  until the next line that has one); null before the first. */
export function carried(pictures: (string | null)[]): (string | null)[] {
  let last: string | null = null;
  return pictures.map((p) => (last = p ?? last));
}
