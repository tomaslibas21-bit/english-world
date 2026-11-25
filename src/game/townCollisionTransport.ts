// Little-endian magic and metadata length, SHA-256 of the body, then the field (lo f32, hi f32, base u8)
// and UTF-8 metadata. The main thread supplies the offset from the active town layout.
export const TOWN_COLLISION_MAGIC = 0x4c434350; // PCCL
export const TOWN_COLLISION_HASH_OFFSET = 8;
export const TOWN_COLLISION_HEADER = TOWN_COLLISION_HASH_OFFSET + 32;
export const TOWN_COLLISION_TIMEOUT_MS = 1500;
export const LITTLE_ENDIAN = new Uint8Array(Uint16Array.of(1).buffer)[0] === 1;

export interface TownCollisionRequest { url: string; digest: string; metadataOffset: number }

export function townCollisionMaxBytes(metadataOffset: number) {
  return metadataOffset + 1024 * 1024;
}

export function hasTownCollisionHeader(bytes: ArrayBuffer, metadataOffset: number) {
  if (bytes.byteLength <= metadataOffset || bytes.byteLength > townCollisionMaxBytes(metadataOffset)) return false;
  const header = new DataView(bytes);
  return header.getUint32(0, true) === TOWN_COLLISION_MAGIC
    && header.getUint32(4, true) === bytes.byteLength - metadataOffset;
}

function readBounded(stream: ReadableStream<Uint8Array>, limit: number, signal?: AbortSignal) {
  let size = 0;
  return new Response(stream.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      size += chunk.byteLength;
      if (size > limit) controller.error(new Error("Town collision payload is too large"));
      else controller.enqueue(chunk);
    },
  }), { signal })).arrayBuffer();
}

/** Fetch may already have inflated the payload when a host serves the file with Content-Encoding. */
export async function decodeTownCollision(bytes: ArrayBuffer, metadataOffset: number, digest?: string, signal?: AbortSignal) {
  const limit = townCollisionMaxBytes(metadataOffset);
  if (bytes.byteLength > limit) throw new Error("Town collision payload is too large");
  const signature = new Uint8Array(bytes, 0, Math.min(2, bytes.byteLength));
  if (signature[0] === 0x1f && signature[1] === 0x8b) {
    const inflated = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"), { signal });
    bytes = await readBounded(inflated, limit, signal);
  }
  if (!hasTownCollisionHeader(bytes, metadataOffset)) throw new Error("Unknown town collision payload");
  const expected = new Uint8Array(bytes, TOWN_COLLISION_HASH_OFFSET, 32);
  const actual = new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(bytes, TOWN_COLLISION_HEADER)));
  if (!expected.every((byte, i) => byte === actual[i])) throw new Error("Corrupt town collision payload");
  if (digest !== undefined && digest !== Array.from(actual, (byte) => byte.toString(16).padStart(2, "0")).join("")) {
    throw new Error("Town collision payload belongs to another build");
  }
  return bytes;
}

/** The worker can finish fetching and validating while the main thread constructs the town. */
export async function readTownCollision({ url, digest, metadataOffset }: TownCollisionRequest) {
  if (!LITTLE_ENDIAN || typeof DecompressionStream !== "function" || !globalThis.crypto?.subtle) return;
  const controller = new AbortController();
  const { signal } = controller;
  const deadline = setTimeout(() => controller.abort(), TOWN_COLLISION_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal });
    if (!response.ok || !response.body || signal.aborted) return;
    const bytes = await decodeTownCollision(await readBounded(response.body, townCollisionMaxBytes(metadataOffset), signal), metadataOffset, digest, signal);
    if (!signal.aborted) return bytes;
  } catch {
    // An unavailable asset takes the local builder path.
  } finally {
    clearTimeout(deadline);
    controller.abort();
  }
}
