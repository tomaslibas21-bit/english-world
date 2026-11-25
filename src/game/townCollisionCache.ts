import { EDITION } from "../edition";
import { PropFader } from "./fade";
import { ledgeGrid, Ledges, type Piece, type Thing } from "./ledges";
import { OCCLUSION_CELL, OcclusionField } from "./occlusion";
import { buildTownField, buildTownLedges, sceneryBoatPieces, townCameraSkip, TOWN_FIELD_BOUNDS } from "./townCollision";
import { hasTownCollisionHeader, LITTLE_ENDIAN, TOWN_COLLISION_HEADER } from "./townCollisionTransport";
import { THEME } from "./world/theme";
import type { Town } from "./world/town";
import type { Colliders } from "./world/util";

const bounds = TOWN_FIELD_BOUNDS;
export const TOWN_COLLISION_FORMAT = {
  version: 1, edition: EDITION.id, style: "blocks", byteOrder: "little",
  ...bounds, cell: OCCLUSION_CELL,
  nx: Math.ceil((bounds.maxX - bounds.minX) / OCCLUSION_CELL),
  nz: Math.ceil((bounds.maxZ - bounds.minZ) / OCCLUSION_CELL),
};
const cells = TOWN_COLLISION_FORMAT.nx * TOWN_COLLISION_FORMAT.nz;
const floatBytes = cells * Float32Array.BYTES_PER_ELEMENT;
export const TOWN_COLLISION_METADATA_OFFSET = TOWN_COLLISION_HEADER + 2 * floatBytes + cells;

export function encodeTownCollisionNumber(_: string, value: unknown) {
  if (value === Infinity) return "+Infinity";
  if (value === -Infinity) return "-Infinity";
  return Object.is(value, -0) ? "-0" : value;
}

/** Ordered inputs to the static split pass, including the initial split flags. */
export function townColliderLayout({ boxes, circles, roofs }: Colliders) {
  return JSON.stringify([
    boxes.map(({ minX, maxX, minZ, maxZ, tag, split, vault }) => [minX, maxX, minZ, maxZ, tag, split, vault]),
    circles.map(({ x, z, r, split, npc, tag, vault }) => [x, z, r, split, npc, tag, vault]),
    roofs.map(({ minX, maxX, minZ, maxZ }) => [minX, maxX, minZ, maxZ]),
  ], encodeTownCollisionNumber);
}

interface Metadata {
  format: typeof TOWN_COLLISION_FORMAT;
  layout: string;
  pieces: Piece[];
  things: Thing[];
  splits: (boolean | null)[];
}

const optionalFlag = (value: unknown) => value === undefined || typeof value === "boolean";
const isCount = (value: number) => Number.isSafeInteger(value) && value >= 0;
const isThing = (t: Thing) => t && [t.x, t.z, t.w, t.d, t.cap, t.high].every(Number.isFinite)
  && (Number.isFinite(t.low) || t.low === Infinity) && [t.walls, t.cells, t.decks].every(isCount)
  && typeof t.split === "boolean" && (t.tag === undefined || typeof t.tag === "string")
  && (t.vault === undefined || Number.isFinite(t.vault));

function validPieces(pieces: Piece[], colliders: Colliders) {
  const grid = ledgeGrid(colliders);
  if (!grid) return pieces.length === 0;
  const { x0, z0, nx, nz, cell } = grid;
  const x1 = x0 + nx * cell, z1 = z0 + nz * cell;
  return pieces.every((p) => p && [p.minX, p.maxX, p.minZ, p.maxZ].every(Number.isFinite)
    && p.minX >= x0 && p.maxX <= x1 && p.minX < p.maxX
    && p.minZ >= z0 && p.maxZ <= z1 && p.minZ < p.maxZ
    && typeof p.top === "number" && p.top > 0 && optionalFlag(p.wall) && optionalFlag(p.deck));
}

/** Receives bytes verified by the worker. Live colliders are updated after both indexes are constructed. */
export function restoreTownCollision(town: Town, bytes: ArrayBuffer) {
  if (!LITTLE_ENDIAN || !hasTownCollisionHeader(bytes, TOWN_COLLISION_METADATA_OFFSET)) return;

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
    .every((key) => Object.is(data.format[key], TOWN_COLLISION_FORMAT[key]))
    || data.layout !== townColliderLayout(town.colliders)
    || !Array.isArray(data.pieces) || !validPieces(data.pieces, town.colliders)
    || !Array.isArray(data.things) || !data.things.every(isThing)
    || !Array.isArray(data.splits) || data.splits.length !== boxes.length + circles.length
    || !data.splits.every((flag) => flag === null || typeof flag === "boolean")) return;

  const field = new OcclusionField(bounds, { cell: TOWN_COLLISION_FORMAT.cell }, {
    lo: new Float32Array(bytes, TOWN_COLLISION_HEADER, cells),
    hi: new Float32Array(bytes, TOWN_COLLISION_HEADER + floatBytes, cells),
    base: new Uint8Array(bytes, TOWN_COLLISION_HEADER + 2 * floatBytes, cells),
  });
  const ledges = Ledges.restore([...sceneryBoatPieces(town), ...data.pieces], data.things.map((thing) => ({ ...thing, tag: thing.tag })));
  [...boxes, ...circles].forEach((collider, i) => {
    const split = data.splits[i];
    if (split === null) delete collider.split;
    else collider.split = split;
  });
  return { field, ledges };
}

export function initTownCollision(town: Town, bytes: ArrayBuffer | undefined, slice: (next: () => void) => void) {
  const restored = bytes ? restoreTownCollision(town, bytes) : undefined;
  performance.mark(restored ? "town-collision:restored" : "town-collision:fallback");
  const field = restored?.field ?? buildTownField(town);
  const fader = new PropFader(town.group, townCameraSkip(town), 1.3, THEME.fade);
  if (restored) return { field, ledges: restored.ledges, fader };
  const ledges = buildTownLedges(town, field, slice);
  for (const boat of sceneryBoatPieces(town)) ledges.add(boat);
  return { field, ledges, fader };
}
