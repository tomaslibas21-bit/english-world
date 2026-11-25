import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { carModelEntry, cacheCarModel, type CarModel, type CarModelName, type ExteriorCarModels } from "./carModels";
import { CAR_PALETTE_FILE, EXTERIOR_CAR_NAMES, FLEET_FILES } from "./carFleet";
import { decodeFleetPack } from "../fleetPack";
import { activeFleetTransfer, fetchCarBytes, type FleetTransfer } from "../fleetTransfer";
import { STARTUP_IO_TIMEOUT } from "../startupTask";

const base = `${import.meta.env.BASE_URL}models/cars/`;
type Palette = ReturnType<THREE.TextureLoader["load"]>;

class PaletteLoader extends THREE.TextureLoader {
  private texture!: Palette;
  readonly ready: Promise<Palette>;

  constructor(manager: THREE.LoadingManager, png?: ArrayBuffer) {
    super(manager);
    const objectURL = png && URL.createObjectURL(new Blob([png], { type: "image/png" }));
    this.ready = new Promise<Palette>((resolve, reject) => {
      const deadline = setTimeout(() => reject(new Error("Car palette timed out")), STARTUP_IO_TIMEOUT);
      const finished = () => {
        clearTimeout(deadline);
        if (objectURL) URL.revokeObjectURL(objectURL);
      };
      try {
        this.texture = super.load(objectURL ?? base + CAR_PALETTE_FILE, (texture) => {
          finished();
          resolve(texture);
        }, undefined, (error) => {
          finished();
          reject(error);
        });
      } catch (error) {
        finished();
        reject(error);
      }
    });
  }

  override load(...[, onLoad, , onError]: Parameters<THREE.TextureLoader["load"]>) {
    void this.ready.then(onLoad, onError);
    return this.texture;
  }
}

function createLoader(png?: ArrayBuffer) {
  const manager = new THREE.LoadingManager();
  const palette = new PaletteLoader(manager, png);
  manager.addHandler(/^Textures\/colormap\.png$/, palette);
  const current = { loader: new GLTFLoader(manager), palette };
  void palette.ready.catch(() => {
    if (attempt === current) attempt = undefined;
  });
  return current;
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

export async function prepareCars(transfer: FleetTransfer | undefined): Promise<ExteriorCarModels> {
  const loadModel = (name: CarModelName) => load(name, transfer);
  const results = await Promise.allSettled(EXTERIOR_CAR_NAMES.map(async (name) => [
    name, await cacheCarModel(name, loadModel),
  ] as const));
  return new Map(results.map((result) => {
    if (result.status === "rejected") throw result.reason;
    return result.value;
  }));
}

export async function load(name: CarModelName, transfer = activeFleetTransfer): Promise<CarModel> {
  const entry = carModelEntry(name);
  const pack = transfer && await unpack(transfer);
  const packed = pack?.get(entry.file);
  if (pack && packed) {
    try {
      const source = attempt ??= createLoader(pack.get(CAR_PALETTE_FILE));
      return await parse(entry, packed, source);
    } catch {
      // Recover from a GLB or image error through the original asset URLs.
    }
  }
  const source = attempt ??= createLoader();
  return parse(entry, await fetchCarBytes(base + entry.file), source);
}

async function parse(entry: CarModel["entry"], bytes: ArrayBuffer, { loader, palette }: ReturnType<typeof createLoader>): Promise<CarModel> {
  // The parser uses this same palette attempt even if its image request failed and a retry has started.
  const [{ scene }, map] = await Promise.all([loader.parseAsync(bytes, base), palette.ready]);
  const source = scene.getObjectByName("body") as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> | undefined;
  if (!source?.isMesh || source.material.map !== map) throw new Error(`Missing car body or shared palette for ${entry.file}`);
  for (const wheel of entry.wheelNodes) {
    if (!(scene.getObjectByName(wheel) as THREE.Mesh | undefined)?.isMesh) throw new Error(`Missing ${wheel} in ${entry.file}`);
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
  const painted = new Map<number, THREE.BufferGeometry>();
  return {
    entry,
    createInstance(paint) {
      const instance = template.clone();
      if (paint === undefined || entry.paintColumn === undefined) return instance;
      const color = new THREE.Color(paint);
      const key = color.getHex();
      let geometry = painted.get(key);
      if (!geometry) {
        geometry = source.geometry.clone();
        const uv = geometry.getAttribute("uv"), colors = geometry.getAttribute("color");
        for (let i = 0; i < uv.count; i++) {
          const y = uv.getY(i);
          if (Math.floor(uv.getX(i) * 16) !== entry.paintColumn || y < 0.25 || y >= 0.5) continue;
          // Replace only body paint with a white texel and the requested colour. Keep the kit's gradient.
          const shade = 1 - (y - 0.25) * 1.35;
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
