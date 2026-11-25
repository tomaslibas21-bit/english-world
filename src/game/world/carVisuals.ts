import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Ambient } from "../ambient";
import type { CarModel, CarModelName, CarPlacement, ExteriorCarModels } from "./carModels";
import { TAXI } from "./layout";
import type { ParkedCars } from "./town";

type TrafficCar = Ambient["traffic"][number] & { model: CarModelName };
type WheelBatch = { meshes: THREE.InstancedMesh[]; count: number };

function mergeCar(instance: THREE.Group, omit: readonly string[] = []) {
  instance.updateMatrixWorld(true);
  const housings: THREE.BufferGeometry[] = [], wheels: THREE.BufferGeometry[] = [];
  instance.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || omit.includes(mesh.name)) return;
    const part = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    (mesh.name.startsWith("wheel-") ? wheels : housings).push(part);
  });
  const start = housings.reduce((n, part) => n + part.getAttribute("position").count, 0);
  const parts = [...housings, ...wheels];
  const geometry = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  if (!geometry) throw new Error("Incompatible car geometry");
  geometry.userData.crashWheels = [start, geometry.getAttribute("position").count];
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
        const geometry = mergeCar(instance, wheelNodes);
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

  attach(group: THREE.Group, beforeReplace?: (mesh: THREE.Mesh) => void) {
    for (const { car } of this.entries) {
      beforeReplace?.(car.mesh);
      car.mesh.removeFromParent();
      car.mesh.geometry.dispose();
      car.batchBody = this.bodies.get(car.model)!.mesh;
    }
    group.add(...this.meshes);
  }

  update(dt: number) {
    for (const batch of this.bodies.values()) batch.count = 0;
    for (const batch of this.wheelBatches.values()) batch.count = 0;
    for (const entry of this.entries) {
      const { car, wheels, wheelMatrices, radius } = entry;
      if (!car.mesh.visible) continue;
      car.mesh.updateMatrix();
      const batch = this.bodies.get(car.model)!;
      if (!car.damagedBody) batch.mesh.setMatrixAt(batch.count++, car.mesh.matrix);
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
    for (const { car } of this.entries) car.batchBody = undefined;
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
  private initialization?: Promise<void>;

  constructor(private parking: ParkedCars, private ambient: Ambient, private beforeReplace?: (mesh: THREE.Mesh) => void) {}

  get ready() { return this.traffic !== undefined; }

  initialize(models: Promise<ExteriorCarModels>) {
    return this.initialization ??= models.then((loaded) => {
      if (!this.disposed) this.install(loaded);
    }).catch((error) => {
      this.initialization = undefined;
      throw error;
    });
  }

  private install(models: ExteriorCarModels) {
    const { fleet, taxi } = this.parking;
    const parkedInstance = ({ model, color, trim }: CarPlacement) =>
      models.get(model)!.createInstance(trim ? { body: color, trim } : color);
    const parked = fleet.cars.map((car) => {
      const instance = parkedInstance(car.spot);
      const mesh = new THREE.Mesh(mergeCar(instance), body(instance).material);
      mesh.castShadow = mesh.receiveShadow = true;
      return { car, mesh };
    });
    const cab = taxi && parkedInstance(TAXI);
    const cars = this.ambient.traffic.filter((car): car is TrafficCar => car.model !== undefined);
    const traffic = new TrafficBatch(cars, cars.map(({ model }) => models.get(model)!));
    traffic.update(0);

    // Build the whole fleet before changing any scene handles.
    for (const { car, mesh } of parked) {
      if (car.visual) this.beforeReplace?.(car.visual);
      fleet.install(car, mesh);
    }
    fleet.refresh();
    if (taxi && cab) {
      if (taxi.fallback) {
        this.beforeReplace?.(taxi.fallback);
        taxi.fallback.removeFromParent();
        taxi.fallback.geometry.dispose();
        taxi.fallback = undefined;
      }
      taxi.instance = cab;
      taxi.root.add(cab);
    }
    traffic.attach(this.ambient.group, this.beforeReplace);
    this.traffic = traffic;
  }

  update(dt: number) { this.traffic?.update(dt); }

  stats() {
    return {
      trafficModels: this.traffic?.count ?? 0,
      parkedModels: this.ready ? this.parking.placements.length : 0,
      taxi: this.ready && (this.parking.taxi ? !!this.parking.taxi.instance : this.parking.placements.includes(TAXI)),
    };
  }

  dispose() {
    this.disposed = true;
    this.traffic?.dispose();
    this.traffic = undefined;
    this.parking.taxi?.instance?.removeFromParent();
  }
}
