import { readFileSync, readdirSync } from "node:fs";
import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Ambient } from "../src/game/ambient";
import { Ledges } from "../src/game/ledges";
import type { NavGrid } from "../src/game/nav";
import { CAR_MODELS, carFootprint, carLedges, carModelEntry, isCarModelLoaded, loadCarModel, loadedCarModelCount, type CarModelName } from "../src/game/world/carModels";
import { CarVisuals } from "../src/game/world/carVisuals";
import { BUILDINGS, OUTDOOR_NPCS, PARKED_CARS, TAXI, TRAFFIC_CARS } from "../src/game/world/layout";

const assets = new URL("../public/models/cars/", import.meta.url);
const names = Object.keys(CAR_MODELS) as CarModelName[];

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("car models", () => {
  it("ships only used models, shares the palette, and matches the loaded meshes to the collision metadata", async () => {
    expect(new Set([...PARKED_CARS, ...TRAFFIC_CARS].map(({ model }) => model))).toEqual(new Set(names));
    expect(readdirSync(assets).filter((name) => name.endsWith(".glb")).sort()).toEqual(names.map((name) => carModelEntry(name).file).sort());
    expect(readdirSync(new URL("Textures/", assets))).toEqual(["colormap.png"]);

    const NativeRequest = Request;
    vi.stubGlobal("Request", class extends NativeRequest {
      constructor(url: string, init?: RequestInit) { super(new URL(url, "http://localhost"), init); }
    });
    vi.stubGlobal("self", globalThis);
    vi.stubGlobal("ProgressEvent", Event);
    const fetchFile = vi.fn(async ({ url }: Request) => {
      const file = new URL(url).pathname.split("/").at(-1)!;
      return new Response(readFileSync(new URL(file, assets)));
    });
    vi.stubGlobal("fetch", fetchFile);
    const palette = new THREE.Texture<HTMLImageElement>();
    const loadPalette = vi.spyOn(THREE.TextureLoader.prototype, "load").mockImplementation((url, onLoad) => {
      expect(url).toMatch(/\/models\/cars\/Textures\/colormap\.png$/);
      queueMicrotask(() => onLoad?.(palette));
      return palette;
    });

    expect(isCarModelLoaded("taxi")).toBe(false);
    const taxi = loadCarModel("taxi");
    expect(loadCarModel("taxi")).toBe(taxi);
    const models = await Promise.all(names.map(loadCarModel));
    expect(isCarModelLoaded("taxi")).toBe(true);
    expect(await loadCarModel("taxi")).toBe(await taxi);
    expect(loadedCarModelCount()).toBe(names.length);
    expect(fetchFile).toHaveBeenCalledTimes(names.length);
    expect(loadPalette).toHaveBeenCalledTimes(1);

    const material = (models[0].createInstance().getObjectByName("body") as THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>).material;
    expect(material.map).toBe(palette);
    models.forEach((model, i) => {
      const entry = carModelEntry(names[i]);
      const group = model.createInstance();
      const { min, max } = new THREE.Box3().setFromObject(group);
      const { width, length, height } = entry.collisionBox;
      expect(model.entry).toBe(entry);
      expect(width).toBeGreaterThan(1.75);
      expect(width).toBeLessThan(2.3);
      expect(length).toBeGreaterThan(3.8);
      expect(length).toBeLessThan(5.6);
      expect(height).toBeGreaterThan(1.4);
      expect(height).toBeLessThan(2.8);
      expect(min.x).toBeCloseTo(-width / 2, 5);
      expect(max.x).toBeCloseTo(width / 2, 5);
      expect(min.y).toBeCloseTo(0, 5);
      expect(max.y).toBeCloseTo(height, 5);
      expect(min.z).toBeCloseTo(-length / 2, 5);
      expect(max.z).toBeCloseTo(length / 2, 5);
      for (const name of entry.wheelNodes) expect(group.getObjectByName(name)).toBeInstanceOf(THREE.Mesh);
      group.traverse((obj) => { if (obj instanceof THREE.Mesh) expect(obj.material).toBe(material); });
      const pieces = carLedges(names[i], 0, 0, 0);
      expect(Math.max(...pieces.map((piece) => piece.top))).toBeCloseTo(max.y, 5);
      expect(pieces[0]).toMatchObject(carFootprint({ model: names[i], x: 0, z: 0, rot: 0 }));
    });
    const sedan = models[names.indexOf("sedan")];
    const original = sedan.createInstance().getObjectByName("body") as THREE.Mesh;
    const blue = sedan.createInstance("#4a7bb7").getObjectByName("body") as THREE.Mesh;
    expect(blue.material).toBe(original.material);
    expect(blue.geometry).not.toBe(original.geometry);
    const colors = Array.from(blue.geometry.getAttribute("color").array);
    expect(colors.some((value) => value < 1)).toBe(true);
    expect(colors.some((value) => value === 1)).toBe(true);

    const parking = new THREE.Group(), fallback = new THREE.Mesh();
    parking.add(fallback);
    const nav = { nearestFree: () => -1 } as unknown as NavGrid;
    const ambient = new Ambient(nav, [[0, 0]], "low");
    const visuals = new CarVisuals({ group: parking, fallback, placements: PARKED_CARS }, ambient);
    try {
      await vi.waitFor(() => expect(visuals.stats()).toEqual({ trafficModels: 4, parkedModels: PARKED_CARS.length, taxi: true }));
      expect(fallback.parent).toBeNull();
      expect(parking.children).toHaveLength(2);
      const batches = ambient.group.children.filter((mesh) => mesh.name.startsWith("traffic-")) as THREE.InstancedMesh[];
      expect(batches).toHaveLength(6);
      expect(batches.every((mesh) => mesh.isInstancedMesh && mesh.material === material)).toBe(true);
      expect(batches.every((mesh) => mesh.count > 0)).toBe(true);
      const wheels = batches.find((mesh) => mesh.name === "traffic-wheels")!;
      const initial = wheels.instanceMatrix.array.slice(0, 16);
      visuals.update(0.05);
      const rotated = wheels.instanceMatrix.array.slice(0, 16);
      expect(rotated.slice(0, 12)).not.toEqual(initial.slice(0, 12));
      expect(rotated.slice(12)).toEqual(initial.slice(12));
    } finally {
      visuals.dispose();
    }
  });

  it("uses the same footprint to stop a walker and lets a jump land at the rotated sedan's roof height", () => {
    const sedan = PARKED_CARS[0], box = carFootprint(sedan);
    const ledges = new Ledges();
    const pieces = carLedges(sedan.model, sedan.x, sedan.z, sedan.rot);
    for (const piece of pieces) ledges.add(piece);
    const feet = { x: box.maxX + 0.1, z: sedan.z };
    ledges.resolve(feet, 0.38, 0, false);
    expect(feet.x).toBeCloseTo(box.maxX + 0.38);
    expect(ledges.support(sedan.x + 1.6, sedan.z, 1.1, true)).toBeCloseTo(0.9);
    expect(ledges.support(sedan.x - 0.2, sedan.z, 1.8, true)).toBeCloseTo(1.56);
  });
});

describe("Maple Harbor parking", () => {
  it("keeps parked cars separated, with service vehicles by the places they serve", () => {
    const parked = PARKED_CARS.map(carFootprint);
    for (const [i, a] of parked.entries()) {
      for (const b of parked.slice(i + 1)) {
        expect(a.maxX <= b.minX || b.maxX <= a.minX || a.maxZ <= b.minZ || b.maxZ <= a.minZ).toBe(true);
      }
    }
    const carNear = (model: CarModelName, building: string, reach: number) => {
      const { x, z } = PARKED_CARS.find((car) => car.model === model)!;
      const b = BUILDINGS.find(({ id }) => id === building)!;
      expect(Math.hypot(x - b.x, z - b.z)).toBeLessThan(reach);
    };
    carNear("police", "police", 18);
    carNear("ambulance", "clinic", 14);
    carNear("delivery", "threads", 14);
    const driver = OUTDOOR_NPCS.find(({ npc }) => npc === "vinnie")!;
    expect(PARKED_CARS.filter(({ model }) => model === "taxi")).toEqual([TAXI]);
    expect(Math.hypot(TAXI.x - driver.x, TAXI.z - driver.z)).toBeLessThan(5);
    expect(parked.every(({ minX, maxX, minZ, maxZ }) =>
      OUTDOOR_NPCS.every(({ x, z, ax = x, az = z }) => [
        [x, z], [ax, az],
      ].every(([px, pz]) => px < minX - 0.38 || px > maxX + 0.38 || pz < minZ - 0.38 || pz > maxZ + 0.38)))).toBe(true);
  });
});
