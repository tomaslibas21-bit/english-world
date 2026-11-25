import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { cacheCarModel, carModelEntry, type CarModel, type CarModelName, type ExteriorCarModels } from "./carModels";
import { CAR_PALETTE_FILE, EXTERIOR_CAR_NAMES, FLEET_FILES } from "./carFleet";
import { decodeFleetPack } from "../fleetPack";
import { activeFleetTransfer, fetchCarBytes, type FleetTransfer } from "../fleetTransfer";
import { loadStartupModule, STARTUP_IO_TIMEOUT } from "../startupTask";

const base = `${import.meta.env.BASE_URL}models/cars/`;
type Palette = ReturnType<THREE.TextureLoader["load"]>;

async function readPalette(loader: THREE.TextureLoader, png?: ArrayBuffer) {
  const objectURL = png && URL.createObjectURL(new Blob([png], { type: "image/png" }));
  let texture: Palette | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  try {
    return await new Promise<Palette>((resolve, reject) => {
      deadline = setTimeout(() => reject(new Error("Car palette timed out")), STARTUP_IO_TIMEOUT);
      texture = loader.load(objectURL ?? base + CAR_PALETTE_FILE, resolve, undefined, reject);
    });
  } catch (error) {
    texture?.dispose();
    throw error;
  } finally {
    clearTimeout(deadline);
    if (objectURL) URL.revokeObjectURL(objectURL);
  }
}

function createLoader(png?: ArrayBuffer) {
  const manager = new THREE.LoadingManager();
  const textures = new THREE.TextureLoader(manager);
  const palette = png ? readPalette(textures, png).catch(() => readPalette(textures)) : readPalette(textures);
  // GLTFLoader reads the palette with its sampler and color space, through this same shared decode.
  manager.addHandler(/^Textures\/colormap\.png$/, {
    load: (_url: string, resolve: (texture: Palette) => void, _progress: unknown, reject: (error: unknown) => void) => {
      void palette.then(resolve, reject);
    },
  } as THREE.TextureLoader);
  const source = { loader: new GLTFLoader(manager), palette };
  void palette.catch(() => { if (attempt === source) attempt = undefined; });
  return source;
}

let attempt: ReturnType<typeof createLoader> | undefined;
let material: THREE.MeshLambertMaterial | undefined;
const packs = new WeakMap<FleetTransfer, Promise<Map<string, ArrayBuffer> | undefined>>();

function unpack(transfer: FleetTransfer) {
  let pack = packs.get(transfer);
  if (!pack) {
    pack = transfer.then((bytes) => bytes && decodeFleetPack(bytes, FLEET_FILES)).catch(() => undefined);
    packs.set(transfer, pack);
  }
  return pack;
}

export async function prepareCars(transfer?: FleetTransfer): Promise<ExteriorCarModels> {
  const results = await Promise.allSettled(EXTERIOR_CAR_NAMES.map(async (name) => [
    name, await cacheCarModel(name, () => load(name, transfer, true)),
  ] as const));
  return new Map(results.map((result) => {
    if (result.status === "rejected") throw result.reason;
    return result.value;
  }));
}

export async function load(name: CarModelName, transfer = activeFleetTransfer, retry = false): Promise<CarModel> {
  const entry = carModelEntry(name);
  const pack = transfer && await unpack(transfer);
  const packed = pack?.get(entry.file);
  const png = pack?.get(CAR_PALETTE_FILE);
  if (packed) {
    try {
      return await parse(entry, packed, attempt ??= createLoader(png));
    } catch {
      // The file is also available at its original URL.
    }
  }
  const original = () => {
    const source = attempt ??= createLoader(png);
    return fetchCarBytes(base + entry.file).then((bytes) => parse(entry, bytes, source));
  };
  return retry && !packed ? original().catch(original) : original();
}

async function parse(entry: CarModel["entry"], bytes: ArrayBuffer, { loader, palette }: ReturnType<typeof createLoader>): Promise<CarModel> {
  const [{ scene }, map] = await Promise.all([loadStartupModule(loader.parseAsync(bytes, base)), palette]);
  const source = scene.getObjectByName("body") as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> | undefined;
  if (!source?.material.map || entry.wheelNodes.some((name) => !(scene.getObjectByName(name) as THREE.Mesh)?.isMesh)) {
    throw new Error(`Incomplete car model ${entry.file}`);
  }
  material ??= new THREE.MeshLambertMaterial({ map, vertexColors: true, side: THREE.DoubleSide });
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.material = material!;
    mesh.castShadow = mesh.receiveShadow = true;
    if (!mesh.geometry.hasAttribute("color")) {
      const count = mesh.geometry.getAttribute("position").count;
      mesh.geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(count * 3).fill(1), 3));
    }
  });
  scene.position.z = -entry.sourceCenterZ;
  const template = new THREE.Group();
  const scaled = new THREE.Group();
  scaled.scale.set(...entry.scale);
  scaled.add(scene);
  template.add(scaled);
  const painted = new Map<string, THREE.BufferGeometry>();
  return {
    entry,
    createInstance(paint) {
      const instance = template.clone();
      if (paint === undefined || entry.paintColumn === undefined) return instance;
      const colors = typeof paint === "object" && "trim" in paint ? paint : { body: paint };
      const bodyColor = new THREE.Color(colors.body);
      const trim = "trim" in colors && entry.file === "taxi.glb" ? new THREE.Color(colors.trim) : undefined;
      const key = `${bodyColor.getHex()}:${trim?.getHex() ?? ""}`;
      let geometry = painted.get(key);
      if (!geometry) {
        geometry = source.geometry.clone();
        const uv = geometry.getAttribute("uv"), colors = geometry.getAttribute("color");
        for (let i = 0; i < uv.count; i++) {
          const y = uv.getY(i);
          if (Math.floor(uv.getX(i) * 16) !== entry.paintColumn || y < 0.25 || y >= 0.5) continue;
          // Replace only body paint with a white texel and the requested colour. Keep the kit's gradient.
          const shade = 1 - (y - 0.25) * 1.35;
          // Palette row 6 covers the taxi's hood and lower door panels.
          const color = trim && Math.floor(y * 16) === 6 ? trim : bodyColor;
          uv.setXY(i, 12.5 / 16, 8.5 / 16);
          colors.setXYZ(i, shade * color.r, shade * color.g, shade * color.b);
        }
        painted.set(key, geometry);
      }
      (instance.getObjectByName("body") as THREE.Mesh).geometry = geometry;
      return instance;
    },
  };
}
