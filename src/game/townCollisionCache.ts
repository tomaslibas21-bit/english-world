import { PropFader } from "./fade";
import { Ledges, type Piece, type Thing } from "./ledges";
import { OCCLUSION_CELL, OcclusionField } from "./occlusion";
import { buildTownField, buildTownLedges, sceneryBoatPieces, townCameraSkip, TOWN_FIELD_BOUNDS } from "./townCollision";
import type { Town } from "./world/town";
import type { Colliders } from "./world/util";

// Little-endian magic and metadata length, SHA-256 of the body, then lo (f32), hi (f32), base (u8) and UTF-8 metadata.
export const TOWN_COLLISION_MAGIC = 0x4c43484d; // MHCL
export const TOWN_COLLISION_HASH_OFFSET = 8;
export const TOWN_COLLISION_HEADER = TOWN_COLLISION_HASH_OFFSET + 32;
const bounds = TOWN_FIELD_BOUNDS;
export const TOWN_COLLISION_FORMAT = {
  version: 2, edition: "mh", style: "blocks",
  minX: bounds.minX, maxX: bounds.maxX, minZ: bounds.minZ, maxZ: bounds.maxZ, cell: OCCLUSION_CELL,
  nx: Math.ceil((bounds.maxX - bounds.minX) / OCCLUSION_CELL),
  nz: Math.ceil((bounds.maxZ - bounds.minZ) / OCCLUSION_CELL),
};
const cells = TOWN_COLLISION_FORMAT.nx * TOWN_COLLISION_FORMAT.nz;
export const TOWN_COLLISION_METADATA_OFFSET = TOWN_COLLISION_HEADER + cells * 9;
const MAX_BYTES = TOWN_COLLISION_METADATA_OFFSET + 1024 * 1024;
export const LITTLE_ENDIAN = new Uint8Array(Uint16Array.of(1).buffer)[0] === 1;

/** The inputs to positional split replay, in their original order, captured before the ledge pass. */
export function townColliderLayout({ boxes, circles, roofs }: Colliders) {
  return JSON.stringify([
    boxes.map(({ minX, maxX, minZ, maxZ, tag, split }) => [minX, maxX, minZ, maxZ, tag, split]),
    circles.map(({ x, z, r, split }) => [x, z, r, split]),
    roofs.map(({ minX, maxX, minZ, maxZ }) => [minX, maxX, minZ, maxZ]),
  ]);
}

type Split = boolean | undefined;
interface Metadata {
  format: typeof TOWN_COLLISION_FORMAT;
  layout: string;
  pieces: Piece[];
  things: Thing[];
  splits: (boolean | null)[];
}

const optionalFlag = (v: unknown): v is Split => v === undefined || typeof v === "boolean";
const isCount = (v: number) => Number.isSafeInteger(v) && v >= 0;
const isPiece = (p: Piece) => p && [p.minX, p.maxX, p.minZ, p.maxZ].every(Number.isFinite)
  && p.minX >= bounds.minX && p.maxX <= bounds.maxX && p.minX < p.maxX
  && p.minZ >= bounds.minZ && p.maxZ <= bounds.maxZ && p.minZ < p.maxZ
  && typeof p.top === "number" && p.top > 0 && optionalFlag(p.wall) && optionalFlag(p.deck);
const isThing = (t: Thing) => t && [t.x, t.z, t.w, t.d, t.cap, t.high].every(Number.isFinite)
  && (Number.isFinite(t.low) || t.low === Infinity) && [t.walls, t.cells, t.decks].every(isCount)
  && typeof t.split === "boolean" && (t.tag === undefined || typeof t.tag === "string");

export function restoreTownCollision(town: Town, bytes: ArrayBuffer) {
  if (!LITTLE_ENDIAN || bytes.byteLength <= TOWN_COLLISION_METADATA_OFFSET || bytes.byteLength > MAX_BYTES) return;
  const header = new DataView(bytes);
  if (header.getUint32(0, true) !== TOWN_COLLISION_MAGIC
    || header.getUint32(4, true) !== bytes.byteLength - TOWN_COLLISION_METADATA_OFFSET) return;

  const { boxes, circles } = town.colliders;
  let data: Metadata;
  try {
    const json = new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes, TOWN_COLLISION_METADATA_OFFSET));
    data = JSON.parse(json, (key, value) => {
      if (key === "tag") return value;
      if (value === "+Infinity") return Infinity;
      if (value === "-Infinity") return -Infinity;
      return value === "-0" ? -0 : value;
    });
  } catch {
    return;
  }
  if (!data?.format || !(Object.keys(TOWN_COLLISION_FORMAT) as (keyof typeof TOWN_COLLISION_FORMAT)[])
    .every((key) => data.format[key] === TOWN_COLLISION_FORMAT[key])
    || data.layout !== townColliderLayout(town.colliders)
    || !Array.isArray(data.pieces) || !data.pieces.every(isPiece)
    || !Array.isArray(data.things) || !data.things.every(isThing)
    || !Array.isArray(data.splits) || data.splits.length !== boxes.length + circles.length
    || !data.splits.every((flag) => flag === null || typeof flag === "boolean")) return;

  const field = new OcclusionField(bounds, { cell: TOWN_COLLISION_FORMAT.cell }, {
    lo: new Float32Array(bytes, TOWN_COLLISION_HEADER, cells),
    hi: new Float32Array(bytes, TOWN_COLLISION_HEADER + cells * 4, cells),
    base: new Uint8Array(bytes, TOWN_COLLISION_HEADER + cells * 8, cells),
  });
  const ledges = Ledges.restore([...sceneryBoatPieces(town), ...data.pieces], data.things.map((thing) => ({ tag: undefined, ...thing })));
  // Commit flags only after both indexes are usable. A rejected cache leaves fresh colliders for the builder.
  [...boxes, ...circles].forEach((collider, i) => {
    const split = data.splits[i];
    if (split === null) delete collider.split;
    else collider.split = split;
  });
  return { field, ledges };
}

export function initTownCollision(town: Town, bytes: ArrayBuffer | undefined, slice: (next: () => void) => void) {
  const restored = bytes ? restoreTownCollision(town, bytes) : undefined;
  const field = restored?.field ?? buildTownField(town);
  const fader = new PropFader(town.group, townCameraSkip(town));
  if (restored) return { field, ledges: restored.ledges, fader };
  const ledges = buildTownLedges(town, field, slice);
  for (const boat of sceneryBoatPieces(town)) ledges.add(boat);
  return { field, ledges, fader };
}

/** Decode the body itself, regardless of MIME or HTTP compression applied by a host or service worker. */
export async function decodeTownCollision(bytes: ArrayBuffer) {
  if (bytes.byteLength > MAX_BYTES) throw new Error("Town collision payload is too large");
  const signature = new Uint8Array(bytes, 0, Math.min(2, bytes.byteLength));
  if (signature[0] !== 0x1f || signature[1] !== 0x8b) {
    // A host can send the gzip object with Content-Encoding, so fetch may already have inflated it.
    if (bytes.byteLength <= TOWN_COLLISION_METADATA_OFFSET || new DataView(bytes).getUint32(0, true) !== TOWN_COLLISION_MAGIC) {
      throw new Error("Unknown town collision payload");
    }
    const expected = new Uint8Array(bytes, TOWN_COLLISION_HASH_OFFSET, 32);
    const actual = new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(bytes, TOWN_COLLISION_HEADER)));
    if (!expected.every((byte, i) => byte === actual[i])) throw new Error("Corrupt town collision payload");
    return bytes;
  }
  const inflated = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  let size = 0;
  return new Response(inflated.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      size += chunk.byteLength;
      if (size > MAX_BYTES) controller.error(new Error("Town collision payload is too large"));
      else controller.enqueue(chunk);
    },
  }))).arrayBuffer();
}

export async function readTownCollision(url: string, controller: AbortController) {
  // A cache miss on a stalled connection must leave time for the reference path.
  const deadline = setTimeout(() => controller.abort(), 1500);
  try {
    if (!LITTLE_ENDIAN || typeof DecompressionStream === "undefined") return;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok || controller.signal.aborted) return;
    const bytes = await decodeTownCollision(await response.arrayBuffer());
    if (!controller.signal.aborted) return bytes;
  } catch {
    // Missing assets, offline cache misses and unsupported gzip all use the live builder.
  } finally {
    clearTimeout(deadline);
  }
}
