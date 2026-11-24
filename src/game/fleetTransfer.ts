import { STARTUP_IO_TIMEOUT } from "./startupTask";

const MAX_CAR_ASSET_BYTES = 2 * 1024 * 1024;
const FLEET_TRANSFER_TIMEOUT = 3000;

export function readCarBytes(body: ReadableStream<Uint8Array>, signal?: AbortSignal) {
  let size = 0;
  const limited = body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      size += chunk.byteLength;
      if (size > MAX_CAR_ASSET_BYTES) throw new Error("Car asset is too large");
      controller.enqueue(chunk);
    },
  }), { signal });
  return new Response(limited).arrayBuffer();
}

export async function fetchCarBytes(url: string, timeout = STARTUP_IO_TIMEOUT) {
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok || !response.body) throw new Error(`Car asset ${url}: HTTP ${response.status}`);
    return await readCarBytes(response.body, controller.signal);
  } finally {
    clearTimeout(deadline);
  }
}

export type FleetTransfer = Promise<ArrayBuffer | undefined>;
export let activeFleetTransfer: FleetTransfer | undefined;

export function startFleetTransfer(url: string) {
  // Attach the failure handler before waiting for the parser to evaluate.
  return activeFleetTransfer = fetchCarBytes(url, FLEET_TRANSFER_TIMEOUT).catch(() => undefined);
}

export function finishFleetTransfer(transfer: FleetTransfer | undefined) {
  if (activeFleetTransfer === transfer) activeFleetTransfer = undefined;
}
