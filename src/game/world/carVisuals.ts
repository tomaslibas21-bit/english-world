import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Ambient } from "../ambient";
import type { CarModel, CarModelName, ExteriorCarModels } from "./carModels";
import { TAXI } from "./layout";
import type { ParkedCars } from "./town";

type TrafficCar = Ambient["traffic"][number];

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
  private wheels: THREE.InstancedMesh[];
  private entries: { car: TrafficCar; wheelMatrices: THREE.Matrix4[]; angle: number; radius: number }[] = [];
  private matrix = new THREE.Matrix4();
  private rotation = new THREE.Matrix4();

  constructor(cars: Ambient["traffic"], models: CarModel[]) {
    // The four everyday models have the same left and right wheel geometry. Pack all their wheels into two draws.
    const first = models[0].createInstance();
    this.wheels = models[0].entry.wheelNodes.slice(0, 2).map((name) => {
      const wheel = first.getObjectByName(name) as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
      return this.instances(wheel.geometry, wheel.material, cars.length * 2, "traffic-wheels");
    });
    const poses = new Map<CarModelName, THREE.Matrix4[]>();
    cars.forEach((car, i) => {
      const model = models[i];
      let wheelMatrices = poses.get(car.model);
      if (!wheelMatrices) {
        const { wheelNodes } = model.entry;
        const instance = model.createInstance(car.color);
        const geometry = mergeCar(instance, wheelNodes);
        const slots = cars.filter((other) => other.model === car.model).length;
        const mesh = this.instances(geometry, body(instance).material, slots, `traffic-${car.model}`);
        this.bodies.set(car.model, { mesh, count: 0 });
        wheelMatrices = wheelNodes.map((name) => instance.getObjectByName(name)!.matrixWorld.clone());
        poses.set(car.model, wheelMatrices);
      }
      car.batchBody = this.bodies.get(car.model)!.mesh;
      this.entries.push({ car, wheelMatrices, angle: 0, radius: 0.3 * model.entry.scale[2] });
    });
  }

  private instances(geometry: THREE.BufferGeometry, material: THREE.Material, capacity: number, name: string) {
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = true;
    mesh.name = name;
    return mesh;
  }

  get meshes() { return [...this.wheels, ...Array.from(this.bodies.values(), ({ mesh }) => mesh)]; }

  update(dt: number) {
    let wheels = 0;
    for (const batch of this.bodies.values()) batch.count = 0;
    for (const entry of this.entries) {
      const { car, wheelMatrices, radius } = entry;
      if (!car.mesh.visible) continue;
      car.mesh.updateMatrix();
      const batch = this.bodies.get(car.model)!;
      if (!car.damagedBody) batch.mesh.setMatrixAt(batch.count++, car.mesh.matrix);
      entry.angle = (entry.angle + car.speed * dt / radius) % (2 * Math.PI);
      this.rotation.makeRotationX(entry.angle);
      for (let i = 0; i < wheelMatrices.length; i++) {
        this.matrix.multiplyMatrices(car.mesh.matrix, wheelMatrices[i]).multiply(this.rotation);
        this.wheels[i % 2].setMatrixAt(wheels * 2 + (i >> 1), this.matrix);
      }
      wheels++;
    }
    for (const { mesh, count } of this.bodies.values()) this.finish(mesh, count);
    for (const mesh of this.wheels) this.finish(mesh, wheels * 2);
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
  private initialization?: Promise<void>;

  constructor(private parking: ParkedCars, private ambient: Ambient) {}

  get ready() { return !!this.traffic; }

  initialize(models: Promise<ExteriorCarModels>) {
    this.initialization ??= models.then((loaded) => {
      if (!this.disposed) this.install(loaded);
    }).catch((error) => {
      this.initialization = undefined;
      throw error;
    });
    return this.initialization;
  }

  private install(models: ExteriorCarModels) {
    const { fleet, taxi } = this.parking;
    const parked = fleet.cars.map((car) => {
      const instance = models.get(car.spot.model)!.createInstance(car.spot.color);
      const mesh = new THREE.Mesh(mergeCar(instance), body(instance).material);
      mesh.castShadow = mesh.receiveShadow = true;
      return { car, mesh };
    });
    const cab = taxi && models.get(TAXI.model)!.createInstance(TAXI.color);
    const cars = this.ambient.traffic;
    const traffic = new TrafficBatch(cars, cars.map(({ model }) => models.get(model)!));
    traffic.update(0);

    // Attach only the completed fleets, while the town is still covered.
    for (const { car, mesh } of parked) fleet.install(car, mesh);
    fleet.refresh();
    if (taxi && cab) {
      taxi.instance = cab;
      taxi.root.add(cab);
    }
    this.ambient.group.add(...traffic.meshes);
    this.traffic = traffic;
  }

  update(dt: number) { this.traffic?.update(dt); }

  stats() {
    return {
      trafficModels: this.ready ? this.ambient.traffic.length : 0,
      parkedModels: this.ready ? this.parking.placements.length : 0,
      taxi: !!this.parking.taxi?.instance,
    };
  }

  dispose() {
    this.disposed = true;
    this.traffic?.dispose();
    this.parking.taxi?.instance?.removeFromParent();
  }
}
