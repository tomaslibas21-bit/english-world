import * as THREE from "three";
import { ROAD_CONES } from "../../content/road";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { colourMerge, rand } from "../world/util";
import { featureX, height, point, type Track } from "./track";

type Part = [THREE.BufferGeometry, THREE.ColorRepresentation];
type Cone = { geometry: THREE.BufferGeometry; material: THREE.Material };

async function loadCone(file: string): Promise<Cone> {
  const { scene } = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/cars/${file}`);
  scene.updateMatrixWorld(true);
  let source: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> | undefined;
  scene.traverse((part) => { if ((part as THREE.Mesh).isMesh) source = part as typeof source; });
  if (!source) throw new Error(`Missing cone mesh: ${file}`);
  const { geometry, material, matrixWorld } = source;
  geometry.applyMatrix4(matrixWorld);
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const scale = 0.82 / Math.max(size.x, size.z);
  geometry.translate(-center.x, -box.min.y, -center.z).scale(scale, scale, scale);
  return { geometry, material };
}

export function cactus(): Part[] {
  const make = (r: number, h: number, x: number, y: number, angle = 0) =>
    new THREE.CylinderGeometry(r * 0.82, r, h, 6).rotateZ(angle).translate(x, y, 0);
  return [
    [make(0.24, 2.5, 0, 1.25), "#498663"],
    [make(0.15, 0.72, -0.32, 1.08, -Math.PI / 2.8), "#619869"],
    [make(0.145, 0.72, -0.63, 1.51), "#619869"],
    [make(0.13, 0.6, 0.34, 1.56, Math.PI / 2.9), "#427956"],
    [make(0.12, 0.58, 0.58, 1.97), "#427956"],
  ];
}

function pole(): Part[] {
  return [
    [new THREE.CylinderGeometry(0.075, 0.16, 6.4, 6).translate(0, 3.2, 0), "#8c5e48"],
    [new THREE.BoxGeometry(2.1, 0.13, 0.15).translate(0, 5.92, 0), "#785440"],
    ...[-0.82, 0.82].map((x): Part => [new THREE.CylinderGeometry(0.09, 0.11, 0.2, 6).translate(x, 6.06, 0), "#eee6d7"]),
  ];
}

function sign(): Part[] {
  return [
    [new THREE.CylinderGeometry(0.055, 0.07, 2.5, 6).translate(0, 1.25, 0), "#765e53"],
    [new THREE.BoxGeometry(0.95, 0.95, 0.12).rotateZ(Math.PI / 4).translate(0, 2.5, 0), "#f1bc58"],
    [new THREE.BoxGeometry(0.16, 0.62, 0.05).rotateZ(-0.35).translate(0, 2.5, 0.08), "#695549"],
  ];
}

function tumbleweed(): Part[] {
  const r = rand(515);
  return Array.from({ length: 12 }, () => {
    const g = new THREE.TorusGeometry(0.56 + r() * 0.17, 0.035, 3, 9);
    g.rotateX(r() * Math.PI).rotateY(r() * Math.PI);
    return [g, r() < 0.5 ? "#bb8552" : "#86613b"];
  });
}

function mesa(): Part[] {
  const body = new THREE.CylinderGeometry(0.67, 1, 0.8, 6).translate(0, 0.4, 0);
  const top = new THREE.CylinderGeometry(0.5, 0.68, 0.29, 6).translate(0, 0.935, 0);
  return [[body, "#b67b61"], [top, "#ca9074"]];
}

function coneFallback(flat: boolean): Part[] {
  const scale = flat ? 0.18 : 1;
  return [
    [new THREE.BoxGeometry(0.72, 0.09, 0.72).translate(0, 0.045, 0), "#6c5142"],
    [new THREE.CylinderGeometry(0.065, 0.31, 0.84, 7).scale(1, scale, 1).translate(0, 0.42 * scale, 0), "#f88946"],
    [new THREE.CylinderGeometry(0.125, 0.18, 0.19, 7, 1, true).scale(1, scale, 1).translate(0, 0.49 * scale, 0), "#fff1db"],
  ];
}

type Prop = "cactus" | "rock" | "pole" | "sign" | "weed" | "cone" | "flat" | "mesa";
export class Props {
  readonly group = new THREE.Group();
  private batches: Record<Prop, THREE.InstancedMesh>;
  private material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  private modelMaterials: THREE.MeshStandardMaterial[] = [];
  private object = new THREE.Object3D();
  private disposed = false;
  private loaded = false;

  constructor() {
    this.batches = {
      cactus: this.batch(cactus(), 32), rock: this.batch([[new THREE.DodecahedronGeometry(1), "#ad7960"]], 32),
      pole: this.batch(pole(), 8), sign: this.batch(sign(), 8), weed: this.batch(tumbleweed(), 8),
      cone: this.batch(coneFallback(false), 16), flat: this.batch(coneFallback(true), 16), mesa: this.batch(mesa(), 30),
    };
    const r = rand(712);
    const ring = this.batches.mesa;
    for (let i = 0; i < 28; i++) {
      const angle = i / 28 * Math.PI * 2;
      const s = Math.cos(angle) * (164 + r() * 50), x = Math.sin(angle) * (136 + r() * 35);
      const w = 12 + r() * 33, h = 7 + r() * 24;
      this.put(ring, new THREE.Vector3(x, 0, -s), w, h, w * 0.72, r() * Math.PI);
    }
    this.flush(ring);
  }

  async loadModels() {
    const models = await Promise.allSettled(ROAD_CONES.map(loadCone));
    models.forEach((result, index) => {
      if (result.status !== "fulfilled") return;
      const { geometry, material } = result.value;
      const mat = material as THREE.MeshStandardMaterial;
      if (this.disposed) { geometry.dispose(); mat.map?.dispose(); mat.dispose(); return; }
      const mesh = this.batches[index === 0 ? "cone" : "flat"];
      mesh.geometry.dispose();
      mesh.geometry = geometry;
      mesh.material = material;
      this.modelMaterials.push(mat);
      this.loaded = true;
    });
  }

  private batch(parts: Part[], capacity: number) {
    const mesh = new THREE.InstancedMesh(colourMerge(parts), this.material, capacity);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(mesh);
    return mesh;
  }

  private put(mesh: THREE.InstancedMesh, p: THREE.Vector3, x: number, y: number, z: number, spin: number, roll = 0) {
    this.object.position.copy(p);
    this.object.scale.set(x, y, z);
    this.object.rotation.set(0, spin, roll);
    this.object.updateMatrix();
    mesh.setMatrixAt(mesh.count++, this.object.matrix);
  }

  private flush(...meshes: THREE.InstancedMesh[]) {
    for (const mesh of meshes) { mesh.visible = mesh.count > 0; if (mesh.visible) mesh.instanceMatrix.needsUpdate = true; }
  }

  update(track: Track, distance: number, time: number, sceneryChanged: boolean, propsChanged: boolean) {
    const b = this.batches;
    if (sceneryChanged) {
      b.cactus.count = b.rock.count = b.pole.count = b.sign.count = 0;
      for (const { scenery } of track.pieces.values()) for (const { kind, s, x, seed } of scenery) {
        const k = kind === "rock" ? 0.36 + seed * 1.4 : 0.78 + seed * 0.66;
        this.put(b[kind], point(s, x, kind === "rock" ? 0.1 : -0.07), k, kind === "rock" ? k * 0.65 : k, k, seed * 5);
      }
      this.flush(b.cactus, b.rock, b.pole, b.sign);
    }
    if (sceneryChanged || propsChanged || this.loaded) {
      this.loaded = false;
      b.cone.count = b.flat.count = 0;
      for (const { features } of track.pieces.values()) for (const f of features) if (f.kind === "cone") {
        this.put(f.hit ? b.flat : b.cone, point(f.s, f.x), 1, 1, 1, f.phase);
      }
      this.flush(b.cone, b.flat);
    }
    b.weed.count = 0;
    for (const { features } of track.pieces.values()) for (const f of features) if (f.kind === "weed") {
      const x = featureX(f, time);
      this.put(b.weed, point(f.s, x, f.hit ? 0.24 : 0.79), 1.28, f.hit ? 0.5 : 1.28, 1.28, f.phase, time * 4 + f.phase);
    }
    this.flush(b.weed);
    // The distant silhouettes keep their shape around the moving horizon.
    b.mesa.position.set(0, height(distance) - 3, -distance);
  }

  dispose() {
    this.disposed = true;
    for (const mesh of Object.values(this.batches)) { mesh.geometry.dispose(); mesh.dispose(); }
    this.material.dispose();
    for (const mat of this.modelMaterials) { mat.map?.dispose(); mat.dispose(); }
    this.group.removeFromParent();
  }
}
