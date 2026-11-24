import { deepStrictEqual } from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { once } from "node:events";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Worker as NodeWorker } from "node:worker_threads";
import * as THREE from "three";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { EDITION } from "../../src/edition";
import { Ambient } from "../../src/game/ambient";
import { createCharacter } from "../../src/game/characters";
import { NavGrid } from "../../src/game/nav";
import { Rides } from "../../src/game/rides/Rides";
import { TOWN_WEST, townLedgeDynamics } from "../../src/game/townCollision";
import {
  encodeTownCollisionNumber, initTownCollision, restoreTownCollision, TOWN_COLLISION_FORMAT, TOWN_COLLISION_METADATA_OFFSET as metadataOffset,
} from "../../src/game/townCollisionCache";
import { prepareTownCollision } from "../../src/game/townCollisionPreparation";
import { decodeTownCollision, readTownCollision, TOWN_COLLISION_HASH_OFFSET, TOWN_COLLISION_HEADER, TOWN_COLLISION_TIMEOUT_MS, townCollisionMaxBytes } from "../../src/game/townCollisionTransport";
import { OUTDOOR_NPCS, WORLD } from "../../src/game/world/layout";
import { RIDES } from "../../src/game/world/rides";
import { THEME } from "../../src/game/world/theme";
import { buildTown, type Town } from "../../src/game/world/town";
import { townCanvasDocument } from "../../tools/town-canvas-stub";
import { bakeTownCollision } from "../../tools/town-collision-data";

const fieldSHA = "7d59eb37d5a601dab65ed4a3ff25c7491aa5bf41756dfa579e41969c52c99175";
const ledgesSHA = "9bafe5a837d63471b3c11d07611a126935b1aad5d47db4fd4ec368bcc0be072a";
const verifyBuild = process.env.VERIFY_TOWN_COLLISION_ARTIFACTS === "1";
const newTown = () => buildTown({ movableParking: true });
const flags = ({ boxes, circles }: Town["colliders"]) => [...boxes, ...circles].map(({ split }) => split);
const clearMarks = () => {
  performance.clearMarks("town-collision:restored");
  performance.clearMarks("town-collision:fallback");
};

function builtArtifact() {
  const dist = process.env.REPORT_DIST ?? (EDITION.helper === "lt" ? ".load/r1/dist-lt" : "dist");
  const dir = join(dist, "assets");
  const gameFile = readdirSync(dir).find((f) => /^Game-[\w-]+\.js$/.test(f))!;
  const game = readFileSync(join(dir, gameFile), "utf8");
  const [, url, file, digest] = game.match(/url:[`"']([^`"']*assets\/(pc-town-collision-[\w-]+\.bin))[`"'],digest:[`"']([a-f0-9]{64})[`"']/)!;
  const [, workerURL, workerFile] = game.match(/workerURL:[`"']([^`"']*assets\/(town-collision\.worker-[\w-]+\.js))[`"']/)!;
  const workerCode = readFileSync(join(dir, workerFile), "utf8");
  const compressed = Uint8Array.from(readFileSync(join(dir, file)));
  expect(url).toBe(`${process.env.GAME_BASE ?? "/"}assets/${file}`);
  expect(workerURL).toBe(`${process.env.GAME_BASE ?? "/"}assets/${workerFile}`);
  expect(workerCode).not.toMatch(/\bimport\b|WebGLRenderer|OcclusionField|Puerto Colibrí/);
  return { url, digest, workerCode, compressed };
}

async function transportInWorker(artifact: ReturnType<typeof builtArtifact>) {
  const { workerCode, compressed, url, digest } = artifact;
  const worker = new NodeWorker(`
    const { parentPort, workerData } = require('node:worker_threads');
    globalThis.self = {
      addEventListener: (_, listener) => parentPort.once('message', data => listener({ data })),
      postMessage: (bytes, transfer) => {
        parentPort.postMessage(bytes, transfer);
        parentPort.postMessage({ transferCount: transfer.length, senderBytes: bytes?.byteLength });
      },
      close: () => parentPort.close(),
    };
    globalThis.fetch = async (url) => new Response(workerData.compressed, { status: url === workerData.url ? 200 : 404 });
    ${workerCode}
  `, { eval: true, execArgv: [], workerData: { compressed, url } });
  try {
    const messages: unknown[] = [];
    worker.on("message", (m) => messages.push(m));
    const exited = once(worker, "exit");
    worker.postMessage({ url, digest, metadataOffset });
    expect(await exited).toEqual([0]);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toBeInstanceOf(ArrayBuffer);
    expect(messages[1]).toEqual({ transferCount: 1, senderBytes: 0 });
    return messages[0] as ArrayBuffer;
  } finally { await worker.terminate(); }
}

type TestMetadata = {
  format: { edition: string; version: number; nx: number };
  layout: string;
  splits: (boolean | string | null)[];
  things: { x: number | string }[];
};

function rewriteMetadata(bytes: ArrayBuffer, change: (metadata: TestMetadata) => void) {
  const metadata: TestMetadata = JSON.parse(Buffer.from(bytes, metadataOffset).toString("utf8"));
  change(metadata);
  const json = Buffer.from(JSON.stringify(metadata));
  const changed = Buffer.concat([Buffer.from(bytes, 0, metadataOffset), json]);
  changed.writeUInt32LE(json.byteLength, 4);
  createHash("sha256").update(changed.subarray(TOWN_COLLISION_HEADER)).digest().copy(changed, TOWN_COLLISION_HASH_OFFSET);
  return Uint8Array.from(changed).buffer;
}

function addSceneryHull(town: Town) {
  // PC's built lanchas are all rides. Add fixed scenery to exercise the live hull path as well.
  const boat = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 2));
  boat.position.set(24, 0, -80);
  boat.userData.boat = true;
  town.group.add(boat);
  const { min, max } = new THREE.Box3().setFromObject(boat);
  return { minX: min.x, maxX: max.x, minZ: min.z, maxZ: max.z, top: Infinity };
}

function attachActors(town: Town, { ledges }: ReturnType<typeof initTownCollision>) {
  const { colliders } = town;
  const nav = new NavGrid(WORLD.minX - TOWN_WEST, WORLD.minZ, WORLD.maxX, WORLD.maxZ, 1, colliders);
  const ambient = new Ambient(nav, town.doors.map(({ outX, outZ }) => [outX, outZ]), "low", town.seats, colliders);
  const player = createCharacter({ skin: "#d8a989", hair: { style: "short", color: "#492a19" }, top: "#283d69", bottom: "#444444" });
  const people = OUTDOOR_NPCS.map(({ x, z, npc }) => ({ x, z, r: 0.45, npc }));
  const quiet = () => {};
  const boats = town.group.children.filter((o) => o.userData.boat);
  const rides = new Rides({ cam: new THREE.PerspectiveCamera(), colliders, nav, ambient, player, quality: "low", people: () => people,
    outdoors: () => true, say: quiet, thud: quiet, stuck: quiet, aground: quiet, waiting: quiet, freed: quiet, rescue: quiet, splash: quiet, fan: quiet,
  }, RIDES, boats);
  ledges.dynamic = townLedgeDynamics(ambient, rides);
  const parked = town.parkedCars.fleet.cars.map((entry, i) => rides.createModeCar({ ...entry.spot, id: `parked-${i}` }, entry.root, () => town.parkedCars.fleet.take(entry)));
  colliders.circles.push(...people);
  const dispose = () => { rides.disposeParkingKeys(); rides.disposeCrashes(); town.parkedCars.fleet.dispose(); player.dispose?.(); };
  return { ambient, rides, parked, dispose };
}

function query({ field, ledges }: ReturnType<typeof initTownCollision>, x: number, z: number) {
  const origin = new THREE.Vector3(x, 1.35, z), eye = new THREE.Vector3(x + 1.4, 4.7, z + 6);
  const point = { x, z };
  ledges.resolve(point, 0.38, 0, false);
  return [field.free(origin, eye), field.solidAt(x, 4.6, z), field.overSolid(x, z), field.under(origin),
    ledges.support(x, z, 2.2, true), ledges.clear(x, z, eye.x, eye.z, 0.4), point];
}

let bytes: ArrayBuffer, compressed: Uint8Array<ArrayBuffer>, digest: string;
beforeAll(async () => {
  vi.stubGlobal("document", townCanvasDocument());
  try {
    if (verifyBuild) {
      const artifact = builtArtifact();
      ({ compressed, digest } = artifact);
      bytes = await transportInWorker(artifact);
      console.log(`${EDITION.id}/${EDITION.helper} ${artifact.url} · ${compressed.byteLength} bytes on disk · ${bytes.byteLength} bytes inflated · ${Buffer.byteLength(artifact.workerCode)} worker bytes`);
    } else {
      const baked = bakeTownCollision(newTown());
      compressed = Uint8Array.from(baked.compressed);
      digest = baked.digest;
      bytes = await decodeTownCollision(compressed.buffer, metadataOffset, digest);
    }
  } finally { vi.unstubAllGlobals(); }
}, 20_000);

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); clearMarks(); });

it("restores the complete PC artifact and matches the live sliced builder", () => {
  vi.stubGlobal("document", townCanvasDocument());
  const hitTown = newTown(), directTown = newTown();
  const hull = addSceneryHull(hitTown);
  addSceneryHull(directTown);
  const start = performance.now();
  const hit = initTownCollision(hitTown, bytes, () => { throw new Error("Cache hit scheduled a triangle scan"); });
  const restoreMs = performance.now() - start;
  const staticFlags = flags(hitTown.colliders);
  const slices: (() => void)[] = [];
  const directStart = performance.now();
  const direct = initTownCollision(directTown, undefined, (next) => slices.push(next));
  const setupMs = performance.now() - directStart;
  expect(direct.ledges.ready).toBe(false);
  expect(direct.ledges.pieces).toEqual([hull]);
  const live = attachActors(hitTown, hit), directLive = attachActors(directTown, direct);
  const ledgeStart = performance.now();
  while (slices.length) slices.shift()!();
  const scanMs = performance.now() - ledgeStart;
  if (verifyBuild) console.log(`${EDITION.id}/${EDITION.helper} Node restore ${restoreMs.toFixed(1)} ms · direct setup ${setupMs.toFixed(1)} ms + ledge slices ${scanMs.toFixed(1)} ms`);
  try {
    expect(performance.getEntriesByName("town-collision:restored")).toHaveLength(1);
    expect(performance.getEntriesByName("town-collision:fallback")).toHaveLength(1);
    expect(TOWN_COLLISION_FORMAT).toMatchObject({ edition: "es", style: "blocks", byteOrder: "little", nx: 734, nz: 496, minX: WORLD.minX - 49 });
    expect(metadataOffset - TOWN_COLLISION_HEADER).toBe(3_276_576);
    expect(hit.ledges.ready && direct.ledges.ready).toBe(true);
    for (const key of ["lo", "hi", "base"] as const) {
      expect(hit.field[key].buffer).toBe(bytes);
      deepStrictEqual(hit.field[key], direct.field[key]);
    }
    expect(createHash("sha256").update(new Uint8Array(bytes, TOWN_COLLISION_HEADER, metadataOffset - TOWN_COLLISION_HEADER)).digest("hex")).toBe(fieldSHA);
    deepStrictEqual(hit.ledges.pieces, direct.ledges.pieces);
    deepStrictEqual(hit.ledges.things, direct.ledges.things);
    deepStrictEqual(hitTown.colliders, directTown.colliders);
    expect(hit.ledges.pieces[0]).toEqual(hull);
    expect(hit.ledges.pieces).toHaveLength(3879);
    expect(hit.ledges.things.some(({ x }) => x < WORLD.minX)).toBe(true);
    expect(hit.field.solidAt(120.75, 4.6, 4)).toBe(true);
    expect(createHash("sha256").update(JSON.stringify([hit.ledges.pieces.slice(1), hit.ledges.things, staticFlags], encodeTownCollisionNumber)).digest("hex")).toBe(ledgesSHA);
    const rideBoats = live.rides.list.filter(({ townBoat }) => townBoat);
    expect(rideBoats.length).toBeGreaterThan(0);
    for (const { mesh } of rideBoats) expect(hit.ledges.pieces.some((p) => p.top === Infinity && p.minX < mesh.position.x && p.maxX > mesh.position.x && p.minZ < mesh.position.z && p.maxZ > mesh.position.z)).toBe(false);

    const locations = [THEME.cenote!, THEME.ruins!, { x: -151, z: -7 }, { x: 120.75, z: 4 }, { x: 24, z: -80 }, ...OUTDOOR_NPCS];
    for (const { x, z } of locations) deepStrictEqual(query(hit, x, z), query(direct, x, z));
    expect(hit.ledges.clear(22, -80, 26, -80, 0)).toBe(false);
    const parked = live.parked[0].m;
    const c = live.ambient.traffic.find(({ model }) => model === "sedan")!;
    const other = directLive.ambient.traffic.find(({ model }) => model === "sedan")!;
    const away = new THREE.Vector3(0, 0, -200);
    for (let frame = 0; frame < 40; frame++) {
      live.ambient.update(0.05, away);
      directLive.ambient.update(0.05, away);
    }
    expect(live.rides.townCarPieces(parked.x, parked.z).length).toBeGreaterThan(0);
    expect(live.ambient.carPieces(c.x, c.lane).length).toBeGreaterThan(0);
    for (const [x, z] of [[parked.x, parked.z], [c.x, c.lane]]) {
      deepStrictEqual(query(hit, x, z), query(direct, x, z));
      deepStrictEqual(hit.ledges.dynamic!(x, z), direct.ledges.dynamic!(x, z));
    }
    const previous = hit.ledges.dynamic!(c.x, c.lane);
    c.x += 2;
    other.x += 2;
    expect(hit.ledges.dynamic!(c.x, c.lane)).not.toEqual(previous);
    deepStrictEqual(query(hit, c.x, c.lane), query(direct, c.x, c.lane));
  } finally { live.dispose(); directLive.dispose(); }
}, 20_000);

it("rejects incompatible or truncated files without changing a single collider before sliced fallback", () => {
  vi.stubGlobal("document", townCanvasDocument());
  const town = newTown();
  const before = structuredClone(town.colliders);
  const invalid = [
    bytes.slice(0, -1),
    rewriteMetadata(bytes, (data) => { data.format.edition = "en"; }),
    rewriteMetadata(bytes, (data) => { data.format.version++; }),
    rewriteMetadata(bytes, (data) => { data.format.nx--; }),
    rewriteMetadata(bytes, (data) => { data.layout = "[]"; }),
    rewriteMetadata(bytes, (data) => { data.splits[data.splits.length - 1] = "invalid"; }),
  ];
  for (const bad of invalid) {
    expect(restoreTownCollision(town, bad)).toBeUndefined();
    deepStrictEqual(structuredClone(town.colliders), before);
  }
  const queue: (() => void)[] = [];
  const fallback = initTownCollision(town, invalid.at(-1), (next) => queue.push(next));
  expect(fallback.ledges.ready).toBe(false);
  expect(queue).toHaveLength(1);
  deepStrictEqual(structuredClone(town.colliders), before);
  expect(performance.getEntriesByName("town-collision:fallback")).toHaveLength(1);
  expect(performance.getEntriesByName("town-collision:restored")).toHaveLength(0);
});

it("preserves signed zero, infinity and both false and undefined split flags", async () => {
  vi.stubGlobal("document", townCanvasDocument());
  const town = newTown();
  const special = rewriteMetadata(bytes, (data) => { data.things[0].x = "-0"; data.splits[0] = false; });
  const verified = await decodeTownCollision(special, metadataOffset);
  const restored = restoreTownCollision(town, verified)!;
  expect(Object.is(restored.ledges.things[0].x, -0)).toBe(true);
  expect(restored.ledges.pieces.some(({ top }) => top === Infinity)).toBe(true);
  expect(flags(town.colliders)[0]).toBe(false);
  expect(flags(town.colliders)).toContain(undefined);
});

it("checks gzip, pre-inflated and stale or corrupt responses", async () => {
  expect(await decodeTownCollision(bytes, metadataOffset, digest)).toBe(bytes);
  await expect(decodeTownCollision(compressed.buffer.slice(0, -4), metadataOffset, digest)).rejects.toThrow();
  await expect(decodeTownCollision(bytes, metadataOffset, "0".repeat(64))).rejects.toThrow("another build");
  const corrupt = bytes.slice(0);
  new Uint8Array(corrupt)[TOWN_COLLISION_HEADER] ^= 1;
  await expect(decodeTownCollision(corrupt, metadataOffset, digest)).rejects.toThrow("Corrupt");
  await expect(decodeTownCollision(new ArrayBuffer(townCollisionMaxBytes(metadataOffset) + 1), metadataOffset, digest)).rejects.toThrow("too large");
  const request = { url: "https://game.test/assets/town.bin", digest, metadataOffset };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(null, { status: 404 })).mockResolvedValueOnce(new Response(corrupt)));
  expect(await readTownCollision(request)).toBeUndefined();
  expect(await readTownCollision(request)).toBeUndefined();
  vi.stubGlobal("crypto", undefined);
  expect(await readTownCollision(request)).toBeUndefined();
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("DecompressionStream", undefined);
  expect(await readTownCollision(request)).toBeUndefined();
});

class TestWorker extends EventTarget {
  postMessage = vi.fn();
  terminate = vi.fn();
}
const asset = { url: "/assets/pc-town-collision-test.bin", digest: "", workerURL: "/assets/town-collision.worker-test.js" };

function stubWorker() {
  const worker = new TestWorker();
  vi.stubGlobal("Worker", function () { return worker; });
  return worker;
}

describe("collision join", () => {
  it("lets an already queued completion run after a long synchronous town build", async () => {
    vi.useFakeTimers();
    const worker = stubWorker();
    const collision = prepareTownCollision(asset, metadataOffset)!;
    expect(worker.postMessage).toHaveBeenCalledWith({ url: asset.url, digest: asset.digest, metadataOffset });
    await vi.advanceTimersByTimeAsync(TOWN_COLLISION_TIMEOUT_MS * 2);
    expect(worker.terminate).not.toHaveBeenCalled();
    setTimeout(() => worker.dispatchEvent(new MessageEvent("message", { data: bytes })), 0);
    const waiting = collision.join();
    await vi.advanceTimersByTimeAsync(0);
    expect(await waiting).toBe(bytes);
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["error", "messageerror", "timeout", "cancel"])("cleans up on %s and ignores a late reply", async (failure) => {
    vi.useFakeTimers();
    const worker = stubWorker(), collision = prepareTownCollision(asset, metadataOffset)!;
    const waiting = collision.join();
    if (failure === "timeout") await vi.advanceTimersByTimeAsync(TOWN_COLLISION_TIMEOUT_MS);
    else if (failure === "cancel") collision.cancel();
    else worker.dispatchEvent(new Event(failure, { cancelable: true }));
    worker.dispatchEvent(new MessageEvent("message", { data: bytes }));
    expect(await waiting).toBeUndefined();
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("handles an unsupported worker or a policy that blocks its construction", () => {
    vi.stubGlobal("Worker", undefined);
    expect(prepareTownCollision(asset, metadataOffset)).toBeUndefined();
    vi.stubGlobal("Worker", function () { throw new DOMException("Blocked", "SecurityError"); });
    expect(prepareTownCollision(asset, metadataOffset)).toBeUndefined();
  });

  it("terminates the worker when sending the request fails", async () => {
    const worker = stubWorker();
    worker.postMessage.mockImplementation(() => { throw new DOMException("Message rejected", "DataCloneError"); });
    const collision = prepareTownCollision(asset, metadataOffset)!;
    expect(await collision.join()).toBeUndefined();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
