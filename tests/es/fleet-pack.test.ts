import { resolveObjectURL } from "node:buffer";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";
import type { Mesh, MeshLambertMaterial } from "three";
import { build } from "vite";
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { decodeFleetPack, FLEET_HEADER_BYTES } from "../../src/game/fleetPack";
import { CAR_PALETTE_FILE, FLEET_FILES } from "../../src/game/world/carFleet";
import { fleetPackAsset } from "../../tools/fleet-pack-plugin";
import { carAssets, stubCarAssets } from "../fixtures/car-assets";

const courseBase = "/course/puerto-colibri/";
let url: string;
let packed: Uint8Array<ArrayBuffer>;

beforeAll(async () => {
  const entry = "virtual:fleet-test-entry";
  vi.stubEnv("NODE_ENV", "production");
  try {
    const result = await build({
      configFile: false,
      root: fileURLToPath(new URL("../../", import.meta.url)),
      base: courseBase,
      publicDir: false,
      logLevel: "silent",
      plugins: [fleetPackAsset("es", "lt"), {
        name: "fleet-test-entry",
        resolveId: (id) => id === entry ? "\0" + entry : undefined,
        load: (id) => id === "\0" + entry ? 'export { default as url } from "virtual:fleet-pack-url"' : undefined,
      }],
      build: { write: false, rolldownOptions: { input: entry, preserveEntrySignatures: "strict" } },
    });
    if (!("output" in result)) throw new Error("Expected one production bundle");
    const asset = result.output.find((file) => file.type === "asset" && /pc-fleet-.*\.bin$/.test(file.fileName));
    const js = result.output.find((file) => file.type === "chunk" && file.isEntry);
    if (asset?.type !== "asset" || js?.type !== "chunk" || typeof asset.source === "string") {
      throw new Error("Expected the emitted fleet asset and its URL entry");
    }
    packed = Uint8Array.from(asset.source);
    ({ url } = await import("data:text/javascript;base64," + Buffer.from(js.code).toString("base64")));
    expect(url).toBe(courseBase + asset.fileName);
    expect(url).toMatch(/\/assets\/pc-fleet-[\w-]{6,}\.bin$/);
  } finally {
    vi.unstubAllEnvs();
  }
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.doUnmock("virtual:fleet-pack-url");
  vi.doUnmock("../../src/game/world/carModelLoader");
  vi.resetModules();
});

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

function productionURL() {
  vi.doMock("virtual:fleet-pack-url", () => ({ default: url }));
}

it("emits the original exterior files and palette in one subpath asset", async () => {
  expect(packed.byteLength).toBeLessThan(158_000);
  const files = await decodeFleetPack(packed.buffer, FLEET_FILES);
  expect(files.size).toBe(10);
  expect([...files.keys()]).toEqual([
    "Textures/colormap.png", "ambulance.glb", "delivery.glb", "garbage-truck.glb",
    "police.glb", "sedan.glb", "suv.glb", "taxi.glb", "truck.glb", "van.glb",
  ]);
  for (const [name, bytes] of files) {
    expect(Buffer.from(bytes).equals(readFileSync(new URL(name, carAssets))), name).toBe(true);
  }
  expect([...files.values()].reduce((sum, bytes) => sum + bytes.byteLength, 0)).toBe(650_075);
});

it("rejects a truncated stream, wrong version, and invalid member coverage before use", async () => {
  await expect(decodeFleetPack(packed.slice(0, -8).buffer, FLEET_FILES)).rejects.toThrow();
  const raw = Uint8Array.from(gunzipSync(packed));
  await expect(decodeFleetPack(raw.slice(0, -1).buffer, FLEET_FILES)).rejects.toThrow("Invalid fleet pack length");
  const header = new DataView(raw.buffer);
  const version = header.getUint32(4, true);
  header.setUint32(4, version + 1, true);
  await expect(decodeFleetPack(raw.buffer, FLEET_FILES)).rejects.toThrow("Unknown fleet pack format");
  header.setUint32(4, version, true);
  const firstOffset = FLEET_HEADER_BYTES + new TextDecoder().decode(raw.subarray(FLEET_HEADER_BYTES)).indexOf(",0,") + 1;
  raw[firstOffset] = "1".charCodeAt(0);
  await expect(decodeFleetPack(raw.buffer, FLEET_FILES)).rejects.toThrow("Invalid fleet pack member");
});

it("starts transfer at 3D selection with the parser unresolved and shares the resulting models and palette", async () => {
  productionURL();
  const parser = deferred(), image = deferred();
  const parserStarted = vi.fn();
  vi.doMock("../../src/game/world/carModelLoader", async (actual) => {
    parserStarted();
    await parser.promise;
    return actual<typeof import("../../src/game/world/carModelLoader")>();
  });
  const { fetchFile, loadPalette, palette } = stubCarAssets({
    fleetResponse: () => new Response(packed), beforePalette: () => image.promise,
  });
  const createURL = vi.spyOn(URL, "createObjectURL"), revokeURL = vi.spyOn(URL, "revokeObjectURL");
  const decompress = vi.spyOn(globalThis, "DecompressionStream");
  const { prepareExteriorCars } = await import("../../src/game/exteriorAssets");
  const { loadCarModel } = await import("../../src/game/world/carModels");
  expect(fetchFile).not.toHaveBeenCalled();
  expect(parserStarted).not.toHaveBeenCalled();

  const prepared = prepareExteriorCars();
  expect(fetchFile.mock.calls.map(([request]) => request)).toEqual([url]);
  expect(prepareExteriorCars()).toBe(prepared);
  const taxi = loadCarModel("taxi");
  expect(loadCarModel("taxi")).toBe(taxi);
  await vi.waitFor(() => expect(parserStarted).toHaveBeenCalled());
  expect(loadPalette).not.toHaveBeenCalled();
  parser.resolve();
  await vi.waitFor(() => expect(loadPalette).toHaveBeenCalledTimes(1));

  const [paletteURL] = loadPalette.mock.calls[0];
  const png = resolveObjectURL(paletteURL)!;
  expect(png.type).toBe("image/png");
  expect(Buffer.from(await png.arrayBuffer()).equals(readFileSync(new URL(CAR_PALETTE_FILE, carAssets)))).toBe(true);
  expect(createURL).toHaveBeenCalledTimes(1);
  expect(revokeURL).not.toHaveBeenCalled();
  image.resolve();
  const models = await prepared;
  expect(models.size).toBe(9);
  expect(models.get("taxi")).toBe(await taxi);
  expect(models.get("sedan")).toBe(await loadCarModel("sedan"));
  const materials = new Set<MeshLambertMaterial>();
  for (const model of models.values()) {
    const instance = model.createInstance();
    for (const name of model.entry.wheelNodes) expect((instance.getObjectByName(name) as Mesh).isMesh).toBe(true);
    const { material } = instance.getObjectByName("body") as Mesh<never, MeshLambertMaterial>;
    materials.add(material);
    expect(material.map).toBe(palette);
  }
  expect(materials.size).toBe(1);
  expect(palette.colorSpace).toBe("srgb");
  expect(decompress).toHaveBeenCalledTimes(1);
  expect(revokeURL).toHaveBeenCalledExactlyOnceWith(paletteURL);
  expect(fetchFile).toHaveBeenCalledTimes(1);
  expect(loadPalette).toHaveBeenCalledTimes(1);
});

it("uses a host-decoded body even if browser gzip decoding is unavailable", async () => {
  productionURL();
  vi.stubGlobal("DecompressionStream", undefined);
  const { fetchFile, loadPalette } = stubCarAssets({
    fleetResponse: () => new Response(Uint8Array.from(gunzipSync(packed)), { headers: { "content-encoding": "gzip" } }),
  });
  const { prepareExteriorCars } = await import("../../src/game/exteriorAssets");
  expect((await prepareExteriorCars()).size).toBe(9);
  expect(fetchFile).toHaveBeenCalledTimes(1);
  expect(loadPalette).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/^blob:/), expect.any(Function), undefined, expect.any(Function));
});

it.each(["truncated", "unsupported gzip"])("recovers through the individual files with a %s pack", async (failure) => {
  productionURL();
  if (failure === "unsupported gzip") vi.stubGlobal("DecompressionStream", undefined);
  const { fetchFile, loadPalette } = stubCarAssets({
    fleetResponse: () => new Response(failure === "truncated" ? packed.slice(0, -10) : packed),
  });
  const { prepareExteriorCars } = await import("../../src/game/exteriorAssets");
  expect((await prepareExteriorCars()).size).toBe(9);
  expect(fetchFile).toHaveBeenCalledTimes(10);
  expect(loadPalette.mock.calls.map(([request]) => request)).toEqual([`/models/cars/${CAR_PALETTE_FILE}`]);
});

it("revokes a failed packed palette and recovers with one shared individual palette", async () => {
  productionURL();
  vi.spyOn(console, "error").mockImplementation(() => {});
  const revokeURL = vi.spyOn(URL, "revokeObjectURL");
  const { fetchFile, loadPalette } = stubCarAssets({
    fleetResponse: () => new Response(packed),
    beforePalette: async (url) => { if (url.startsWith("blob:")) throw new Error("Image load failed"); },
  });
  const { prepareExteriorCars } = await import("../../src/game/exteriorAssets");
  expect((await prepareExteriorCars()).size).toBe(9);
  const [blobURL, rawURL] = loadPalette.mock.calls.map(([request]) => request);
  expect(loadPalette).toHaveBeenCalledTimes(2);
  expect(rawURL).toBe(`/models/cars/${CAR_PALETTE_FILE}`);
  expect(revokeURL).toHaveBeenCalledExactlyOnceWith(blobURL);
  expect(fetchFile).toHaveBeenCalledTimes(1);
});

it("cancels a stalled pack body and can start a fresh transfer after failed fallback", async () => {
  vi.useFakeTimers();
  productionURL();
  const cancel = vi.fn();
  let offline = true;
  const { fetchFile } = stubCarAssets({
    fleetResponse: () => new Response(offline ? new ReadableStream({ cancel }) : packed),
    beforeModel: async () => { if (offline) throw new Error("Individual requests are offline"); },
  });
  const { prepareExteriorCars } = await import("../../src/game/exteriorAssets");
  const first = prepareExteriorCars();
  const failure = expect(first).rejects.toThrow("Individual requests are offline");
  await vi.advanceTimersByTimeAsync(3000);
  await failure;
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(fetchFile).toHaveBeenCalledTimes(19);

  offline = false;
  const retry = prepareExteriorCars();
  expect(retry).not.toBe(first);
  expect(prepareExteriorCars()).toBe(retry);
  expect((await retry).size).toBe(9);
  expect(fetchFile.mock.calls.slice(19).map(([request]) => request)).toEqual([url]);
});

it("recovers a corrupt GLB via its original member URL", async () => {
  productionURL();
  const raw = gunzipSync(packed);
  const body = FLEET_HEADER_BYTES + raw.readUInt32LE(8);
  const directory = JSON.parse(raw.subarray(FLEET_HEADER_BYTES, body).toString()) as [string, number, number, number][];
  const taxi = directory.find(([name]) => name === "taxi.glb")!;
  raw.fill(0, body + taxi[1], body + taxi[1] + taxi[2]);
  const { fetchFile, loadPalette } = stubCarAssets({ fleetResponse: () => new Response(Uint8Array.from(gzipSync(raw))) });
  const { prepareExteriorCars } = await import("../../src/game/exteriorAssets");
  const models = await prepareExteriorCars();
  expect(models.get("taxi")?.createInstance().getObjectByName("body")).toBeDefined();
  expect(fetchFile.mock.calls.map(([request]) => request)).toEqual([url, "/models/cars/taxi.glb"]);
  expect(loadPalette).toHaveBeenCalledTimes(1);
});

it("loads only the requested model and palette from a nested base without fleet preparation", async () => {
  productionURL();
  vi.stubEnv("BASE_URL", courseBase);
  const { fetchFile, loadPalette } = stubCarAssets();
  const { loadCarModel } = await import("../../src/game/world/carModels");
  const first = loadCarModel("taxi");
  expect(loadCarModel("taxi")).toBe(first);
  expect((await first).entry.file).toBe("taxi.glb");
  expect(fetchFile.mock.calls.map(([request]) => request)).toEqual([`${courseBase}models/cars/taxi.glb`]);
  expect(loadPalette.mock.calls.map(([request]) => request)).toEqual([`${courseBase}models/cars/${CAR_PALETTE_FILE}`]);
});

it.each(["model", "palette"])("bounds a stalled original %s and permits a later retry", async (asset) => {
  vi.useFakeTimers();
  let stalled = true;
  const { loadPalette } = stubCarAssets({
    beforeModel: async (file, signal) => {
      if (stalled && asset === "model" && file === "taxi.glb") await new Promise((_, reject) => {
        signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
    },
    beforePalette: () => stalled && asset === "palette" ? new Promise(() => {}) : Promise.resolve(),
  });
  const { prepareExteriorCars } = await import("../../src/game/exteriorAssets");
  const first = prepareExteriorCars();
  const failed = expect(first).rejects.toThrow(asset === "model" ? /abort/i : /timed out/i);
  await vi.waitFor(() => expect(loadPalette).toHaveBeenCalledTimes(1));
  await vi.advanceTimersByTimeAsync(21_000);
  await failed;
  stalled = false;
  expect((await prepareExteriorCars()).size).toBe(9);
});
