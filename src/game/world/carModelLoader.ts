import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { CarModel, CarModelEntry } from "./carModels";

type Palette = ReturnType<THREE.TextureLoader["load"]>;

class PaletteLoader extends THREE.TextureLoader {
  private texture!: Palette;
  private ready?: Promise<Palette>;

  override load(...[url, onLoad, onProgress, onError]: Parameters<THREE.TextureLoader["load"]>) {
    this.ready ??= new Promise<Palette>((resolve, reject) => {
      this.texture = super.load(url, resolve, onProgress, reject);
    }).catch((error) => {
      this.ready = undefined;
      throw error;
    });
    void this.ready.then(onLoad, onError);
    return this.texture;
  }
}

const manager = new THREE.LoadingManager();
manager.addHandler(/^Textures\/colormap\.png$/, new PaletteLoader(manager));
const loader = new GLTFLoader(manager);
let material: THREE.MeshLambertMaterial | undefined;

export async function load(entry: CarModelEntry): Promise<CarModel> {
  const { scene } = await loader.loadAsync(`${import.meta.env.BASE_URL}models/cars/${entry.file}`);
  const source = scene.getObjectByName("body") as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  const map = source.material.map;
  if (!map) throw new Error(`Missing car palette for ${entry.file}`);
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
