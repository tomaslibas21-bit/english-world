import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { carModelEntry, cacheCarModel, type CarModel, type CarModelName, type ExteriorCarModels } from "./carModels";
import { PARKED_CARS, TRAFFIC_CARS } from "./layout";
import { STARTUP_IO_TIMEOUT } from "../startupTask";

const base = `${import.meta.env.BASE_URL}models/cars/`;
const paletteURL = base + "Textures/colormap.png";
type Palette = ReturnType<THREE.TextureLoader["load"]>;

class PaletteLoader extends THREE.TextureLoader {
  private texture!: Palette;
  readonly ready = new Promise<Palette>((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error("Car palette timed out")), STARTUP_IO_TIMEOUT);
    this.texture = super.load(paletteURL, (texture) => {
      clearTimeout(deadline);
      resolve(texture);
    }, undefined, (error) => {
      clearTimeout(deadline);
      reject(error);
    });
  });

  override load(...[, onLoad, , onError]: Parameters<THREE.TextureLoader["load"]>) {
    void this.ready.then(onLoad, onError);
    return this.texture;
  }
}

function createLoader() {
  const manager = new THREE.LoadingManager();
  const palette = new PaletteLoader(manager);
  manager.addHandler(/^Textures\/colormap\.png$/, palette);
  void palette.ready.catch(() => { attempt = undefined; });
  return { loader: new GLTFLoader(manager), palette };
}

let attempt: ReturnType<typeof createLoader> | undefined;
let material: THREE.MeshLambertMaterial | undefined;

async function download(file: string) {
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), STARTUP_IO_TIMEOUT);
  try {
    const response = await fetch(base + file, { signal: controller.signal });
    if (!response.ok) throw new Error(`Car model ${file}: HTTP ${response.status}`);
    return await response.arrayBuffer();
  } finally {
    clearTimeout(deadline);
  }
}

const names = [...new Set([...TRAFFIC_CARS, ...PARKED_CARS].map(({ model }) => model))];

export async function prepareCars(): Promise<ExteriorCarModels> {
  const results = await Promise.allSettled(names.map(async (name) => [name, await cacheCarModel(name, load)] as const));
  return new Map(results.map((result) => {
    if (result.status === "rejected") throw result.reason;
    return result.value;
  }));
}

export async function load(name: CarModelName): Promise<CarModel> {
  const entry = carModelEntry(name);
  const { loader, palette } = attempt ??= createLoader();
  const bytes = await download(entry.file);
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
