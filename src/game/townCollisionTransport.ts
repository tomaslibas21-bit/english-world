// Version 2 wire layout: little-endian magic and metadata length, SHA-256 of the body,
// then lo (f32), hi (f32), base (u8) for the baked grid, followed by UTF-8 metadata.
export const TOWN_COLLISION_MAGIC = 0x4c43484d; // MHCL
export const TOWN_COLLISION_HASH_OFFSET = 8;
export const TOWN_COLLISION_HEADER = TOWN_COLLISION_HASH_OFFSET + 32;
export const TOWN_COLLISION_METADATA_OFFSET = TOWN_COLLISION_HEADER + 684 * 496 * 9;
export const TOWN_COLLISION_TIMEOUT_MS = 1500;
const MAX_BYTES = TOWN_COLLISION_METADATA_OFFSET + 1024 * 1024;
export const LITTLE_ENDIAN = new Uint8Array(Uint16Array.of(1).buffer)[0] === 1;

export function hasTownCollisionHeader(bytes: ArrayBuffer) {
  if (bytes.byteLength <= TOWN_COLLISION_METADATA_OFFSET || bytes.byteLength > MAX_BYTES) return false;
  const header = new DataView(bytes);
  return header.getUint32(0, true) === TOWN_COLLISION_MAGIC
    && header.getUint32(4, true) === bytes.byteLength - TOWN_COLLISION_METADATA_OFFSET;
}

function readBounded(stream: ReadableStream<Uint8Array>, signal?: AbortSignal) {
  let size = 0;
  return new Response(stream.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      size += chunk.byteLength;
      if (size > MAX_BYTES) controller.error(new Error("Town collision payload is too large"));
      else controller.enqueue(chunk);
    },
  }), { signal })).arrayBuffer();
}

/** Decode the body itself, regardless of MIME or HTTP compression applied by a host or service worker. */
export async function decodeTownCollision(bytes: ArrayBuffer, signal?: AbortSignal) {
  if (bytes.byteLength > MAX_BYTES) throw new Error("Town collision payload is too large");
  const signature = new Uint8Array(bytes, 0, Math.min(2, bytes.byteLength));
  if (signature[0] === 0x1f && signature[1] === 0x8b) {
    const inflated = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"), { signal });
    bytes = await readBounded(inflated, signal);
  }
  if (!hasTownCollisionHeader(bytes)) throw new Error("Unknown town collision payload");
  const expected = new Uint8Array(bytes, TOWN_COLLISION_HASH_OFFSET, 32);
  const actual = new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(bytes, TOWN_COLLISION_HEADER)));
  if (!expected.every((byte, i) => byte === actual[i])) throw new Error("Corrupt town collision payload");
  return bytes;
}

/** Runs in the worker so town construction cannot delay either body consumption or cancellation. */
export async function readTownCollision(url: string) {
  if (!LITTLE_ENDIAN || typeof DecompressionStream !== "function" || !globalThis.crypto?.subtle) return;
  const controller = new AbortController();
  const { signal } = controller;
  const deadline = setTimeout(() => controller.abort(), TOWN_COLLISION_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal });
    if (!response.ok || !response.body || signal.aborted) return;
    const bytes = await decodeTownCollision(await readBounded(response.body, signal), signal);
    if (!signal.aborted) return bytes;
  } catch {
    // The game will build collision locally when the asset is unavailable or invalid.
  } finally {
    clearTimeout(deadline);
    controller.abort();
  }
}
