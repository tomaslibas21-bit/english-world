import { readCarBytes } from "./fleetTransfer";

// Four little-endian u32s, followed by a UTF-8 directory and the concatenated source files.
// Directory offsets are relative to the beginning of the concatenated files.
export const FLEET_MAGIC = 0x4c46484d; // MHFL
export const FLEET_VERSION = 1;
export const FLEET_HEADER_BYTES = 16;
export type FleetMember = [filename: string, offset: number, length: number];

export async function decodeFleetPack(bytes: ArrayBuffer, files: readonly string[]) {
  const signature = new Uint8Array(bytes, 0, Math.min(2, bytes.byteLength));
  if (signature[0] === 0x1f && signature[1] === 0x8b) {
    // Fetch may already have stripped a host's Content-Encoding, leaving the raw container.
    bytes = await readCarBytes(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")));
  }
  const header = new DataView(bytes);
  if (bytes.byteLength < FLEET_HEADER_BYTES || header.getUint32(0, true) !== FLEET_MAGIC
    || header.getUint32(4, true) !== FLEET_VERSION) throw new Error("Unknown fleet pack format");
  const directoryLength = header.getUint32(8, true);
  const bodyLength = header.getUint32(12, true);
  const bodyStart = FLEET_HEADER_BYTES + directoryLength;
  if (!directoryLength || bodyStart + bodyLength !== bytes.byteLength) throw new Error("Invalid fleet pack length");

  const text = new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes, FLEET_HEADER_BYTES, directoryLength));
  const directory: unknown = JSON.parse(text);
  if (!Array.isArray(directory) || directory.length !== files.length) throw new Error("Incomplete fleet pack");
  const remaining = new Set(files);
  let end = 0;
  for (const member of directory) {
    if (!Array.isArray(member) || member.length !== 3) throw new Error("Invalid fleet pack member");
    const [file, offset, length] = member;
    if (!remaining.delete(file) || offset !== end || !Number.isSafeInteger(length) || length <= 0
      || length > bodyLength - end) throw new Error("Invalid fleet pack member");
    end += length;
  }
  if (remaining.size || end !== bodyLength) throw new Error("Incomplete fleet pack body");
  return new Map((directory as FleetMember[]).map(([file, offset, length]) => [
    file, bytes.slice(bodyStart + offset, bodyStart + offset + length),
  ]));
}
