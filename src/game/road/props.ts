import * as THREE from "three";
import { ROAD_CONES } from "../../content/road";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { colourMerge } from "../world/util";
import { point, type RoadOpening, type Track } from "./track";

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

function coneFallback(flat: boolean): Part[] {
  const scale = flat ? 0.18 : 1;
  return [
    [new THREE.BoxGeometry(0.72, 0.09, 0.72).translate(0, 0.045, 0), "#6c5142"],
    [new THREE.CylinderGeometry(0.065, 0.31, 0.84, 7).scale(1, scale, 1).translate(0, 0.42 * scale, 0), "#f88946"],
    [new THREE.CylinderGeometry(0.125, 0.18, 0.19, 7, 1, true).scale(1, scale, 1).translate(0, 0.49 * scale, 0), "#fff1db"],
  ];
}

export function previewCones(track: RoadOpening) {
  return colourMerge(track.flatMap(({ features }) => features.flatMap(({ kind, s, x, phase }) => {
    if (kind !== "cone") return [];
    const p = point(s, x);
    return coneFallback(false).map(([geometry, color]): Part =>
      [geometry.rotateY(phase).translate(p.x, p.y, p.z), color]);
  })));
}

type Prop = "cone" | "flat";
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
      cone: this.batch(coneFallback(false), 16), flat: this.batch(coneFallback(true), 16),
    };
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

  private put(mesh: THREE.InstancedMesh, p: THREE.Vector3, x: number, y: number, z: number, spin: number) {
    this.object.position.copy(p);
    this.object.scale.set(x, y, z);
    this.object.rotation.set(0, spin, 0);
    this.object.updateMatrix();
    mesh.setMatrixAt(mesh.count++, this.object.matrix);
  }

  private flush(...meshes: THREE.InstancedMesh[]) {
    for (const mesh of meshes) { mesh.visible = mesh.count > 0; if (mesh.visible) mesh.instanceMatrix.needsUpdate = true; }
  }

  update(track: Track, piecesChanged: boolean, propsChanged: boolean) {
    const b = this.batches;
    if (piecesChanged || propsChanged || this.loaded) {
      this.loaded = false;
      b.cone.count = b.flat.count = 0;
      for (const { features } of track.pieces.values()) for (const f of features) if (f.kind === "cone") {
        this.put(f.hit ? b.flat : b.cone, point(f.s, f.x), 1, 1, 1, f.phase);
      }
      this.flush(b.cone, b.flat);
    }
  }

  get drawnBatches() {
    return Object.entries(this.batches).filter(([, mesh]) => mesh.visible && mesh.count).map(([name]) => name);
  }

  dispose() {
    this.disposed = true;
    for (const mesh of Object.values(this.batches)) { mesh.geometry.dispose(); mesh.dispose(); }
    this.material.dispose();
    for (const mat of this.modelMaterials) { mat.map?.dispose(); mat.dispose(); }
    this.group.removeFromParent();
  }
}
