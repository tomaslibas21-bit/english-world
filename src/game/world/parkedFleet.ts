import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { CarPlacement } from "./carModels";

export type ParkedCar = { spot: CarPlacement; root: THREE.Group; visual: THREE.Mesh; taken: boolean; driven: boolean };

/** Cars which have never moved still share a town draw. The first boarding removes that car from the batch. */
export class ParkedFleet {
  private batches: THREE.Mesh[] = [];
  readonly cars: ParkedCar[] = [];

  constructor(private group: THREE.Group) {}

  add(spot: CarPlacement, visual: THREE.Mesh) {
    const root = new THREE.Group();
    root.position.set(spot.x, 0, spot.z);
    root.rotation.y = spot.rot;
    root.add(visual);
    this.cars.push({ spot, root, visual, taken: false, driven: false });
    visual.visible = false;
  }

  take(car: ParkedCar, driven = true) {
    car.driven ||= driven;
    if (car.taken) return;
    car.taken = true;
    car.visual.visible = true;
    this.refresh();
  }

  untake(car: ParkedCar) {
    if (!car.taken || car.driven) return;
    car.taken = false;
    car.visual.visible = false;
    this.refresh();
  }

  replace(car: ParkedCar, visual: THREE.Mesh) {
    car.visual.removeFromParent();
    car.visual.geometry.dispose();
    car.visual = visual;
    visual.visible = car.taken;
    car.root.add(visual);
  }

  refresh() {
    this.disposeBatches();
    for (const east of [false, true]) {
      const cars = this.cars.filter(({ spot, taken }) => !taken && (spot.x >= 0) === east);
      if (!cars.length) continue;
      const copies = cars.map(({ spot, visual }) => visual.geometry.clone().rotateY(spot.rot).translate(spot.x, 0, spot.z));
      const geometry = mergeGeometries(copies)!;
      for (const copy of copies) copy.dispose();
      const batch = new THREE.Mesh(geometry, cars[0].visual.material);
      batch.name = "parked-car-models";
      batch.castShadow = batch.receiveShadow = true;
      this.group.add(batch);
      this.batches.push(batch);
    }
  }

  private disposeBatches() {
    for (const batch of this.batches) {
      batch.removeFromParent();
      batch.geometry.dispose();
    }
    this.batches = [];
  }

  dispose() {
    this.disposeBatches();
    for (const { visual } of this.cars) visual.geometry.dispose();
  }
}
