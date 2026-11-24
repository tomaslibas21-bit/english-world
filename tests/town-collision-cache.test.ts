import { createHash } from "node:crypto";
import { once } from "node:events";
import { Worker as NodeWorker } from "node:worker_threads";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";
import { Vector3 } from "three";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { PropFader } from "../src/game/fade";
import type { OcclusionField } from "../src/game/occlusion";
import { buildTownField, buildTownLedges, sceneryBoatPieces, townCameraSkip } from "../src/game/townCollision";
import { initTownCollision, restoreTownCollision } from "../src/game/townCollisionCache";
import { prepareTownCollision } from "../src/game/townCollisionPreparation";
import {
  decodeTownCollision, readTownCollision, TOWN_COLLISION_METADATA_OFFSET, TOWN_COLLISION_TIMEOUT_MS,
} from "../src/game/townCollisionTransport";
import { LIGHTHOUSE_ISLAND } from "../src/game/world/island";
import { BUS_STOP } from "../src/game/world/layout";
import { buildLighthouseIsland } from "../src/game/world/lighthouseIsland";
import { buildTown, type Town } from "../src/game/world/town";
import { townCanvasDocument } from "../tools/town-canvas-stub";
import { bakeTownCollision } from "../tools/town-collision-data";

function fieldBytes(field: OcclusionField) {
  return Buffer.concat([field.lo, field.hi, field.base].map((a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength)));
}

function splitFlags(town: Town) {
  return [town.colliders.boxes.map((b) => b.split), town.colliders.circles.map((c) => c.split)];
}

function realTown() {
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value: townCanvasDocument() });
  try { return buildTown(); } finally {
    if (original) Object.defineProperty(globalThis, "document", original);
    else Reflect.deleteProperty(globalThis, "document");
  }
}

function finish(work: (() => void)[]) {
  for (let i = 0; i < work.length; i++) work[i]();
}

class ControlledWorker extends EventTarget {
  readonly postMessage = vi.fn();
  readonly terminate = vi.fn();

  deliver(data: unknown) {
    this.dispatchEvent(new MessageEvent("message", { data }));
  }
}

const assetURL = "/assets/mh-town-collision-test.bin";

describe("Maple Harbor collision asset", () => {
  let baked: ReturnType<typeof bakeTownCollision>;
  let raw: ArrayBuffer;

  beforeAll(async () => {
    baked = bakeTownCollision(realTown());
    raw = await decodeTownCollision(new Uint8Array(baked.compressed).buffer);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    performance.clearMarks();
  });

  it("restores the exact production field, ledge buckets, debug records and split flags before play", async () => {
    const referenceTown = realTown();
    const town = realTown();
    // All current boats are rideable. Make one a scenery hull to exercise the live insertion.
    for (const t of [referenceTown, town]) {
      const boat = t.group.children.find((o) => o.userData.boat && o.userData.rideBoat)!;
      delete boat.userData.rideBoat;
    }
    const field = buildTownField(referenceTown);
    new PropFader(referenceTown.group, townCameraSkip(referenceTown));
    const work: (() => void)[] = [];
    const ledges = buildTownLedges(referenceTown, field, (next) => work.push(next));
    const boats = sceneryBoatPieces(referenceTown);
    expect(boats.length).toBeGreaterThan(0);
    boats.forEach((boat) => ledges.add(boat));
    expect(ledges.pieces).toStrictEqual(boats);
    finish(work);

    const decodeStart = performance.now();
    const decoded = await decodeTownCollision(new Uint8Array(baked.compressed).buffer);
    const decodeMs = performance.now() - decodeStart;
    const hydrateStart = performance.now();
    const restored = restoreTownCollision(town, decoded)!;
    const hydrateMs = performance.now() - hydrateStart;
    expect(restored.ledges.ready).toBe(true);
    expect([restored.field.nx, restored.field.nz]).toEqual([684, 496]);
    const bytes = fieldBytes(restored.field);
    expect(bytes.equals(fieldBytes(field))).toBe(true);
    // The west ridge is outside the driving boundary and occupies camera cells behind it.
    expect(createHash("sha256").update(bytes).digest("hex")).toBe("64efe5089eeed807b69a9e815f0e89ad842e0c4e1b79575a92202eae0392d2fc");
    expect(restored.field.solidAt(120.75, 4.6, 4)).toBe(false);
    expect(ledges.pieces.slice(boats.length)).toStrictEqual(baked.ledges.pieces);
    expect(restored.ledges.pieces).toStrictEqual(ledges.pieces);
    expect(restored.ledges.things).toStrictEqual(ledges.things);
    expect(splitFlags(town)).toStrictEqual(splitFlags(referenceTown));

    const { x, z } = BUS_STOP;
    const roof = ledges.supportPiece(x, z, 2.75, true);
    expect(roof?.deck).toBe(true);
    expect(restored.ledges.supportPiece(x, z, 2.75, true)).toStrictEqual(roof);
    const seat = ledges.supportPiece(x, z + 0.4, 0.55, true);
    expect(seat?.top).toBeCloseTo(0.55);
    expect(restored.ledges.supportPiece(x, z + 0.4, 0.55, true)).toStrictEqual(seat);
    const from = new Vector3(x, 1.6, z - 3), to = new Vector3(x, 3.6, z + 1);
    expect(field.free(from, to)).toBeLessThan(1);
    expect(restored.field.free(from, to)).toBe(field.free(from, to));
    expect(restored.field.overSolid(x, z + 0.75)).toBe(field.overSolid(x, z + 0.75));

    const wall = ledges.pieces.find((p) => p.wall && p.top === Infinity)!;
    for (const piece of [wall, boats[0]]) {
      const original = new Vector3((piece.minX + piece.maxX) / 2, 0, (piece.minZ + piece.maxZ) / 2);
      const a = original.clone(), b = original.clone();
      expect(ledges.clear(a.x, a.z, a.x + 1, a.z, 0)).toBe(false);
      expect(restored.ledges.clear(a.x, a.z, a.x + 1, a.z, 0)).toBe(false);
      referenceTown.colliders.resolve(a, 0.38, true);
      town.colliders.resolve(b, 0.38, true);
      ledges.resolve(a, 0.38, 0, false);
      restored.ledges.resolve(b, 0.38, 0, false);
      expect(a).not.toEqual(original);
      expect(b).toEqual(a);
    }

    const island = LIGHTHOUSE_ISLAND!, scene = buildLighthouseIsland(island);
    const { x: ix, z: iz } = island.center, towerY = island.y + 8;
    expect(restored.field.solidAt(ix, towerY, iz)).toBe(false);
    try {
      town.group.add(scene.group);
      scene.ground.updateWorldMatrix(true, false);
      for (const f of [field, restored.field]) f.addGeometry(scene.ground.geometry, scene.ground.matrixWorld);
      expect(restored.field.solidAt(ix, towerY, iz)).toBe(true);
      expect(fieldBytes(restored.field).equals(fieldBytes(field))).toBe(true);
    } finally {
      scene.dispose();
    }
    console.info("Town collision", {
      gzipBytes: baked.compressed.byteLength,
      fieldMs: +baked.fieldMs.toFixed(1), ledgesMs: +baked.ledgesMs.toFixed(1),
      decodeMs: +decodeMs.toFixed(1), hydrateMs: +hydrateMs.toFixed(1),
    });
  });

  it("rejects bad lengths, versions, dimensions and collider order before replaying flags", () => {
    const town = realTown();
    const initial = splitFlags(town);
    const replace = (from: string, to: string) => {
      const bytes = Buffer.from(raw.slice(0));
      const offset = bytes.indexOf(from, TOWN_COLLISION_METADATA_OFFSET);
      expect(offset).toBeGreaterThanOrEqual(TOWN_COLLISION_METADATA_OFFSET);
      expect(from.length).toBe(to.length);
      bytes.write(to, offset);
      return bytes.buffer;
    };
    const invalid = [raw.slice(0, -1), replace('"version":2', '"version":1'), replace('"nx":684', '"nx":683'),
      replace('"style":"blocks"', '"style":"styled"'), replace('"edition":"mh"', '"edition":"pc"')];
    for (const bytes of invalid) {
      expect(restoreTownCollision(town, bytes)).toBeUndefined();
      expect(splitFlags(town)).toStrictEqual(initial);
    }
    [town.colliders.boxes[0], town.colliders.boxes[1]] = [town.colliders.boxes[1], town.colliders.boxes[0]];
    expect(restoreTownCollision(town, raw)).toBeUndefined();
    expect(splitFlags(town)).toStrictEqual(initial);
  });

  it("rejects invalid transport and accepts gzip or HTTP-inflated bytes", async () => {
    const corrupt = new Uint8Array(baked.compressed);
    corrupt[corrupt.length - 8] ^= 1; // gzip CRC
    const corruptRaw = new Uint8Array(raw.slice(0));
    corruptRaw[TOWN_COLLISION_METADATA_OFFSET - 1] ^= 1;
    const oversize = new Uint8Array(TOWN_COLLISION_METADATA_OFFSET + 1024 * 1024 + 1);
    const response = vi.fn().mockResolvedValueOnce(new Response(corrupt))
      .mockResolvedValueOnce(new Response(corruptRaw))
      .mockResolvedValueOnce(new Response(new Uint8Array(gzipSync(corruptRaw))))
      .mockResolvedValueOnce(new Response(new Uint8Array(gzipSync(oversize))))
      .mockResolvedValueOnce(new Response(oversize))
      .mockResolvedValueOnce(new Response("<html>offline fallback</html>"))
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(new Response(new Uint8Array(baked.compressed), { headers: { "Content-Type": "application/octet-stream" } }))
      .mockResolvedValueOnce(new Response(raw));
    vi.stubGlobal("fetch", response);
    for (let i = 0; i < 8; i++) expect(await readTownCollision(assetURL)).toBeUndefined();
    for (let i = 0; i < 2; i++) {
      const received = await readTownCollision(assetURL);
      expect(Buffer.from(received!).equals(Buffer.from(raw))).toBe(true);
    }
  });

  it("uses the sliced reference builder when the cache is absent or invalid for the town", () => {
    const wrongStyle = Buffer.from(raw.slice(0));
    wrongStyle.write('"style":"styled"', wrongStyle.indexOf('"style":"blocks"', TOWN_COLLISION_METADATA_OFFSET));
    for (const bytes of [undefined, raw.slice(0, -1), wrongStyle.buffer]) {
      const town = realTown(), work: (() => void)[] = [];
      const { field, ledges } = initTownCollision(town, bytes, (next) => work.push(next));
      const boats = sceneryBoatPieces(town);
      expect(ledges.ready).toBe(false);
      expect(ledges.pieces).toStrictEqual(boats);
      finish(work);
      expect(ledges.ready).toBe(true);
      expect(fieldBytes(field).equals(fieldBytes(baked.field))).toBe(true);
      expect(ledges.pieces).toStrictEqual([...boats, ...baked.ledges.pieces]);
      expect(ledges.things).toStrictEqual(baked.ledges.things);
    }
    expect(performance.getEntriesByName("town-collision:fallback")).toHaveLength(3);
  });

  it.each(["queued", "delivered"])("restores with zero slices after the old deadline (%s reply)", async (reply) => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const worker = new ControlledWorker();
    const removeListener = vi.spyOn(worker, "removeEventListener");
    const create = vi.fn(function () { return worker; });
    vi.stubGlobal("Worker", create);
    const preparation = prepareTownCollision(assetURL)!;
    expect(create).toHaveBeenCalledExactlyOnceWith(expect.any(URL), { type: "module" });
    expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith(assetURL);

    const bytes = raw.slice(0);
    vi.advanceTimersByTime(100); // Worker completes while the town owns the main thread.
    if (reply === "delivered") worker.deliver(bytes);
    const town = realTown();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(2 * TOWN_COLLISION_TIMEOUT_MS);
    const joined = preparation.join();
    if (reply === "queued") worker.deliver(bytes);

    const slice = vi.fn();
    const { field, ledges } = initTownCollision(town, await joined, slice);
    expect(performance.getEntriesByName("town-collision:restored")).toHaveLength(1);
    expect(ledges.ready).toBe(true);
    expect(field.lo.buffer).toBe(bytes);
    expect(slice).not.toHaveBeenCalled();
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(removeListener.mock.calls.map(([event]) => event)).toEqual(["message", "error", "messageerror"]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("handles unsupported workers, unsupported decoders and synchronous startup failure", async () => {
    vi.stubGlobal("Worker", undefined);
    expect(prepareTownCollision(assetURL)).toBeUndefined();
    vi.stubGlobal("Worker", function () { throw new Error("Worker blocked by CSP"); });
    expect(prepareTownCollision(assetURL)).toBeUndefined();

    const worker = new ControlledWorker();
    worker.postMessage.mockImplementation(() => { throw new Error("Could not post"); });
    vi.stubGlobal("Worker", function () { return worker; });
    expect(await prepareTownCollision(assetURL)!.join()).toBeUndefined();
    expect(worker.terminate).toHaveBeenCalledOnce();

    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("DecompressionStream", undefined);
    expect(await readTownCollision(assetURL)).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["error", "messageerror"])("settles the join on worker %s", async (type) => {
    const worker = new ControlledWorker();
    vi.stubGlobal("Worker", function () { return worker; });
    const joined = prepareTownCollision(assetURL)!.join();
    worker.dispatchEvent(new Event(type));
    expect(await joined).toBeUndefined();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("bounds the join when a worker never replies", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const worker = new ControlledWorker();
    vi.stubGlobal("Worker", function () { return worker; });
    const preparation = prepareTownCollision(assetURL)!;
    vi.advanceTimersByTime(2 * TOWN_COLLISION_TIMEOUT_MS);
    expect(worker.terminate).not.toHaveBeenCalled();
    const joined = preparation.join();
    vi.advanceTimersByTime(TOWN_COLLISION_TIMEOUT_MS - 1);
    expect(worker.terminate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(await joined).toBeUndefined();
    expect(worker.terminate).toHaveBeenCalledOnce();
    worker.deliver(raw);
    expect(await preparation.join()).toBeUndefined();
  });

  it("aborts a stalled response body with the worker's IO deadline", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(Uint8Array.of(0x1f, 0x8b)); },
      cancel,
    });
    const fetch = vi.fn(async (_url: string, _options: RequestInit) => new Response(body));
    vi.stubGlobal("fetch", fetch);
    const read = readTownCollision(assetURL);
    const signal = fetch.mock.calls[0][1].signal!;
    await vi.advanceTimersByTimeAsync(TOWN_COLLISION_TIMEOUT_MS - 1);
    expect(body.locked).toBe(true);
    expect(signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await read).toBeUndefined();
    expect(signal.aborted).toBe(true);
    expect(cancel).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("discards late delivery after disposal and starts a fresh preparation on retry", async () => {
    const old = new ControlledWorker(), fresh = new ControlledWorker();
    const workers = [old, fresh];
    vi.stubGlobal("Worker", function () { return workers.shift(); });
    const preparation = prepareTownCollision(assetURL)!;
    const abandoned = preparation.join();
    preparation.cancel();
    old.deliver(raw);
    expect(await abandoned).toBeUndefined();
    expect(await preparation.join()).toBeUndefined();
    expect(old.terminate).toHaveBeenCalledOnce();

    const next = prepareTownCollision(assetURL)!;
    const bytes = raw.slice(0);
    fresh.deliver(bytes);
    expect(await next.join()).toBe(bytes);
    expect(fresh.terminate).toHaveBeenCalledOnce();
    next.cancel();
    expect(await next.join()).toBeUndefined();
    expect(fresh.terminate).toHaveBeenCalledOnce();
  });

  it("validates real baked bytes and transfers ownership from the worker entry point", async () => {
    const { outputFiles } = await build({
      entryPoints: ["src/game/town-collision.worker.ts"], bundle: true, platform: "node", format: "cjs", write: false,
      banner: { js: `
        const { parentPort, workerData } = require("node:worker_threads");
        const self = {
          addEventListener(type, listener, { once }) {
            parentPort[once ? "once" : "on"](type, data => listener({ data }));
          },
          postMessage(bytes, transfer) {
            parentPort.postMessage(bytes, transfer);
            parentPort.postMessage({ transferCount: transfer.length, senderBytes: bytes?.byteLength });
          },
          close() { parentPort.close(); },
        };
        globalThis.fetch = async (url) => {
          if (url !== workerData.url) throw new Error("Unexpected collision asset URL");
          return new Response(workerData.compressed);
        };
      ` },
    });
    const worker = new NodeWorker(outputFiles[0].text, {
      eval: true, execArgv: [], workerData: { url: assetURL, compressed: new Uint8Array(baked.compressed) },
    });
    try {
      const messages: unknown[] = [];
      worker.on("message", (message) => messages.push(message));
      const exit = once(worker, "exit");
      worker.postMessage(assetURL);
      expect(await exit).toEqual([0]);
      expect(messages).toHaveLength(2);
      const [received, transfer] = messages;
      expect(received).toBeInstanceOf(ArrayBuffer);
      expect(Buffer.from(received as ArrayBuffer).equals(Buffer.from(raw))).toBe(true);
      expect(transfer).toEqual({ transferCount: 1, senderBytes: 0 });
    } finally {
      await worker.terminate();
    }
  });
});
