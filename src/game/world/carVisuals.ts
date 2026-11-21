import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Ambient } from "../ambient";
import { loadCarModel, type CarModel, type CarModelName } from "./carModels";
import type { ParkedCars } from "./town";

type TrafficCar = Ambient["traffic"][number] & { model: CarModelName };
type WheelBatch = { meshes: THREE.InstancedMesh[]; count: number };

function parts(instance: THREE.Group, omit: readonly string[] = []) {
  instance.updateMatrixWorld(true);
  const geometries: THREE.BufferGeometry[] = [];
  instance.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && !omit.includes(mesh.name)) geometries.push(mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));
  });
  return geometries;
}

function merge(parts: THREE.BufferGeometry[]) {
  const geometry = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  if (!geometry) throw new Error("Incompatible car geometry");
  return geometry;
}

function body(instance: THREE.Group) {
  return instance.getObjectByName("body") as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
}

class TrafficBatch {
  private bodies = new Map<CarModelName, { mesh: THREE.InstancedMesh; count: number }>();
  private wheelBatches = new Map<boolean, WheelBatch>();
  private entries: { car: TrafficCar; wheels: WheelBatch; wheelMatrices: THREE.Matrix4[]; angle: number; radius: number }[] = [];
  private matrix = new THREE.Matrix4();
  private rotation = new THREE.Matrix4();

  constructor(cars: readonly TrafficCar[], models: CarModel[]) {
    const poses = new Map<CarModelName, THREE.Matrix4[]>();
    cars.forEach((car, i) => {
      const model = models[i];
      let wheelMatrices = poses.get(car.model);
      if (!wheelMatrices) {
        const { wheelNodes } = model.entry;
        const instance = model.createInstance(car.paint);
        const geometry = merge(parts(instance, wheelNodes));
        const slots = cars.filter((other) => other.model === car.model).length;
        const mesh = this.instances(geometry, body(instance).material, slots, `traffic-${car.model}`);
        this.bodies.set(car.model, { mesh, count: 0 });
        wheelMatrices = wheelNodes.map((name) => instance.getObjectByName(name)!.matrixWorld.clone());
        poses.set(car.model, wheelMatrices);
      }
      const taxi = car.model === "taxi";
      let wheels = this.wheelBatches.get(taxi);
      if (!wheels) {
        // The everyday cars share wheels. The taxis have their own geometry and darker hubs.
        const first = model.createInstance();
        const slots = cars.filter((other) => (other.model === "taxi") === taxi).length * 2;
        const meshes = model.entry.wheelNodes.slice(0, 2).map((name) => {
          const wheel = first.getObjectByName(name) as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
          return this.instances(wheel.geometry, wheel.material, slots, taxi ? "traffic-taxi-wheels" : "traffic-wheels");
        });
        wheels = { meshes, count: 0 };
        this.wheelBatches.set(taxi, wheels);
      }
      this.entries.push({ car, wheels, wheelMatrices, angle: 0, radius: 0.3 * model.entry.scale[2] });
    });
  }

  private instances(geometry: THREE.BufferGeometry, material: THREE.Material, capacity: number, name: string) {
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = true;
    mesh.name = name;
    return mesh;
  }

  get meshes() {
    return [...Array.from(this.wheelBatches.values()).flatMap(({ meshes }) => meshes), ...Array.from(this.bodies.values(), ({ mesh }) => mesh)];
  }
  get count() { return this.entries.length; }

  update(dt: number) {
    for (const batch of this.bodies.values()) batch.count = 0;
    for (const batch of this.wheelBatches.values()) batch.count = 0;
    for (const entry of this.entries) {
      const { car, wheels, wheelMatrices, radius } = entry;
      if (!car.mesh.visible) continue;
      car.mesh.updateMatrix();
      const batch = this.bodies.get(car.model)!;
      batch.mesh.setMatrixAt(batch.count++, car.mesh.matrix);
      entry.angle = (entry.angle + car.speed * dt / radius) % (2 * Math.PI);
      this.rotation.makeRotationX(entry.angle);
      const slot = wheels.count++ * 2;
      wheelMatrices.forEach((wheel, i) => {
        this.matrix.multiplyMatrices(car.mesh.matrix, wheel).multiply(this.rotation);
        wheels.meshes[i % 2].setMatrixAt(slot + (i >> 1), this.matrix);
      });
    }
    for (const { mesh, count } of this.bodies.values()) this.finish(mesh, count);
    for (const { meshes, count } of this.wheelBatches.values()) for (const mesh of meshes) this.finish(mesh, count * 2);
  }

  private finish(mesh: THREE.InstancedMesh, count: number) {
    mesh.count = count;
    mesh.visible = count > 0;
    if (!count) return;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }

  dispose() {
    for (const { mesh } of this.bodies.values()) mesh.geometry.dispose();
    for (const mesh of this.meshes) {
      mesh.removeFromParent();
      mesh.dispose();
    }
  }
}

export class CarVisuals {
  private disposed = false;
  private traffic?: TrafficBatch;
  private parked: THREE.Mesh[] = [];
  private taxi = false;

  constructor(private parking: ParkedCars, private ambient: Ambient) {
    // Each fleet replaces its procedural fallback once all the geometry for its batches is ready.
    void this.loadTraffic().catch((error) => console.warn("Traffic models unavailable", error));
    void this.loadParking().catch((error) => console.warn("Parked car models unavailable", error));
  }

  private async loadTraffic() {
    const cars = this.ambient.traffic.filter((car): car is TrafficCar => car.model !== undefined);
    if (!cars.length) return;
    const models = await Promise.all(cars.map(({ model }) => loadCarModel(model)));
    if (this.disposed) return;
    const traffic = this.traffic = new TrafficBatch(cars, models);
    traffic.update(0);
    this.ambient.group.add(...traffic.meshes);
    for (const { mesh } of cars) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
    }
  }

  private async loadParking() {
    const { placements, group, fallback } = this.parking;
    const models = await Promise.all(placements.map(({ model }) => loadCarModel(model)));
    if (this.disposed) return;
    const halves: THREE.BufferGeometry[][] = [[], []];
    let material: THREE.Material | undefined;
    placements.forEach(({ x, z, rot, color, trim }, i) => {
      const instance = models[i].createInstance(trim ? { body: color, trim } : color);
      instance.position.set(x, 0, z);
      instance.rotation.y = rot;
      halves[Number(x >= 0)].push(...parts(instance));
      material ??= body(instance).material;
    });
    for (const geometries of halves) {
      if (!geometries.length) continue;
      const mesh = new THREE.Mesh(merge(geometries), material);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.name = "parked-car-models";
      this.parked.push(mesh);
      group.add(mesh);
    }
    fallback.removeFromParent();
    fallback.geometry.dispose();
    this.taxi = placements.some(({ model }) => model === "taxi");
  }

  update(dt: number) { this.traffic?.update(dt); }

  stats() {
    return {
      trafficModels: this.traffic?.count ?? 0,
      parkedModels: this.parked.length ? this.parking.placements.length : 0,
      taxi: this.taxi,
    };
  }

  dispose() {
    this.disposed = true;
    this.traffic?.dispose();
    for (const mesh of this.parked) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
    }
  }
}
