import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { buildTownField, buildTownLedges } from "../src/game/townCollision";
import { encodeTownCollisionNumber, TOWN_COLLISION_FORMAT, TOWN_COLLISION_METADATA_OFFSET, townColliderLayout } from "../src/game/townCollisionCache";
import { LITTLE_ENDIAN, TOWN_COLLISION_HASH_OFFSET, TOWN_COLLISION_HEADER, TOWN_COLLISION_MAGIC, townCollisionMaxBytes } from "../src/game/townCollisionTransport";
import type { Town } from "../src/game/world/town";

export function bakeTownCollision(town: Town) {
  if (!LITTLE_ENDIAN) throw new Error("Town collision generation requires a little-endian build host");
  const layout = townColliderLayout(town.colliders);
  const field = buildTownField(town);
  const ledges = buildTownLedges(town, field);
  const { nx, nz, cell } = TOWN_COLLISION_FORMAT;
  if (!ledges.ready || field.nx !== nx || field.nz !== nz || field.cell !== cell) {
    throw new Error("Town collision geometry does not match the cache format");
  }
  const metadata = Buffer.from(JSON.stringify({
    format: TOWN_COLLISION_FORMAT, layout, pieces: ledges.pieces, things: ledges.things,
    splits: [...town.colliders.boxes, ...town.colliders.circles].map(({ split }) => split ?? null),
  }, encodeTownCollisionNumber));
  const header = Buffer.alloc(TOWN_COLLISION_HEADER);
  header.writeUInt32LE(TOWN_COLLISION_MAGIC, 0);
  header.writeUInt32LE(metadata.byteLength, 4);
  const body = [...[field.lo, field.hi, field.base].map((array) => Buffer.from(array.buffer, array.byteOffset, array.byteLength)), metadata];
  const hash = createHash("sha256");
  for (const bytes of body) hash.update(bytes);
  const digest = hash.digest();
  digest.copy(header, TOWN_COLLISION_HASH_OFFSET);
  const raw = Buffer.concat([header, ...body]);
  if (raw.byteLength !== TOWN_COLLISION_METADATA_OFFSET + metadata.byteLength || raw.byteLength > townCollisionMaxBytes(TOWN_COLLISION_METADATA_OFFSET)) {
    throw new Error("Unexpected town collision payload length");
  }
  return { compressed: gzipSync(raw, { level: 9 }), digest: digest.toString("hex") };
}
