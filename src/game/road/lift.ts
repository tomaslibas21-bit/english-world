import * as THREE from "three";
import { ROAD_EDITION } from "../../content/road";
import { NPCS } from "../../content/npcs";
import { audio } from "../audio";
import { createCharacter } from "../characters";
import { CAR_SEATS } from "../rides/shapes";
import { carGeometry } from "../world/car";
import { carHasRoof, loadCarModel } from "../world/carModels";
import { TAXI } from "../world/layout";
import type { RoadHost, WalkEdge } from "./entry";
import { turnoutHeight, turnoutPoint, turnoutYaw } from "./turnout";

export function liftDriver() {
  const driver = createCharacter(NPCS[ROAD_EDITION.driver.npc].look);
  driver.root.traverse((part) => { part.castShadow = false; });
  driver.fidgets = false;
  driver.seatY = CAR_SEATS.seat;
  driver.recline = 0.12;
  driver.setAnim("sit");
  return driver;
}

// In turnout coordinates, the cab eases off the westbound lane. Both curves
// share a tangent at the stop so it can pull away from the same wheel heading.
const stop = new THREE.Vector2(-3.4, -6);
const approach = new THREE.QuadraticBezierCurve(new THREE.Vector2(2.8, -2.9), new THREE.Vector2(0.5, -2.9), stop);
const departure = new THREE.CubicBezierCurve(stop, new THREE.Vector2(-8, -9.65),
  new THREE.Vector2(-10, 8.5), new THREE.Vector2(-30, 6));
const waitAt = turnoutPoint(0.55, turnoutHeight(0.55), -7.94);

export class Lift {
  readonly car = new THREE.Group();
  readonly driver = liftDriver();
  private fallback = new THREE.Mesh(carGeometry(TAXI.color, { taxi: true }),
    new THREE.MeshLambertMaterial({ vertexColors: true }));
  private disposed = false;
  private parked = false;
  private t = 0;
  private framed = false;
  private restoreSign?: () => void;
  private frameAspect = 0;

  constructor(private host: Pick<RoadHost, "add" | "place" | "player" | "rig" | "roadSign">, readonly edge: WalkEdge) {
    this.car.add(this.fallback, this.driver.root);
    this.seatDriver();
    this.host.add(this.car);
    const sign = host.roadSign();
    if (sign) {
      const position = sign.position.clone(), rotation = sign.quaternion.clone(), scale = sign.scale.clone();
      const x = -18.5;
      sign.position.copy(turnoutPoint(x, turnoutHeight(x) - 0.23, 0.55));
      sign.rotation.y = turnoutYaw(Math.PI / 2);
      sign.scale.set(3.1 / 4.1, 0.89 / 1.07, 1);
      this.restoreSign = () => {
        sign.position.copy(position);
        sign.quaternion.copy(rotation);
        sign.scale.copy(scale);
        this.restoreSign = undefined;
      };
    }
    const parkedAt = turnoutPoint(stop.x, 0, stop.y);
    const heading = Math.atan2(parkedAt.x - waitAt.x, parkedAt.z - waitAt.z);
    this.host.place(waitAt.x, waitAt.z, heading);
    const learner = this.host.player();
    learner.moveSpeed = 0;
    learner.setAnim("idle");
    this.position(approach, 0);
    this.frameOffer();
    void loadCarModel(TAXI.model).then((model) => {
      if (this.disposed) return;
      const instance = model.createInstance(TAXI.color);
      this.car.remove(this.fallback);
      this.car.add(instance);
    }).catch(() => { /* The same taxi has a procedural fallback in town. */ });
  }

  private seatDriver() {
    this.driver.root.position.set(CAR_SEATS.driver[0], CAR_SEATS.floor, CAR_SEATS.driver[1]);
    this.driver.root.rotation.y = 0;
    // (at the wheel under the taxi's roof: out of sight until he steps out beside it)
    this.driver.root.visible = !carHasRoof(TAXI.model);
    this.driver.busy = "wheel";
    this.driver.recline = 0.12;
    this.driver.setAnim("sit");
  }

  private position(path: THREE.Curve<THREE.Vector2>, progress: number) {
    const p = path.getPoint(progress), direction = path.getTangent(progress);
    this.car.position.copy(turnoutPoint(p.x, turnoutHeight(p.x) + 0.01, p.y));
    this.car.rotation.y = turnoutYaw(Math.atan2(direction.x, direction.y));
  }

  arrive(dt: number) {
    const k = Math.min(1, (this.t += dt) / 1.35);
    this.position(approach, 1 - (1 - k) ** 2);
    this.updateActors(dt);
    if (k === 1) {
      this.car.updateMatrixWorld(true);
      const beside = this.car.worldToLocal(waitAt.clone());
      const door = Math.sign(beside.x) * 1.36;
      this.driver.root.position.set(door, 0, -0.26);
      this.driver.root.rotation.y = Math.atan2(beside.x - door, beside.z + 0.26);
      this.driver.root.visible = true;
      this.driver.busy = null;
      this.driver.recline = 0;
      this.driver.setAnim("idle");
      const speaker = this.driver.root.getWorldPosition(new THREE.Vector3());
      this.host.player().root.rotation.y = Math.atan2(speaker.x - waitAt.x, speaker.z - waitAt.z);
    }
    return k === 1;
  }

  private frameOffer() {
    const { rig } = this.host;
    const aspect = rig.cam.aspect;
    this.frameAspect = aspect;
    const portrait = aspect < 0.87;
    const fov = portrait ? 62 : 55;
    // Keep the horizon above the roof. On a narrow display, dolly back along
    // the same sightline until the cab fits between the sign and the near shoulder.
    const distance = Math.max(6.25, 2.52 / (aspect * Math.tan(THREE.MathUtils.degToRad(fov / 2))));
    const look = turnoutPoint(-3, turnoutHeight(-3) + 1, -5.92);
    const pos = turnoutPoint(-3 + 0.97 * distance, turnoutHeight(-3) + 2.12, -5.92 - 0.24 * distance);
    const shiftY = portrait ? THREE.MathUtils.clamp(0.4 * aspect - 0.08, 0.1, 0.16) : 0.17;
    rig.stage = { pos, look, rate: 12, shiftY };
    rig.mode = "stage";
    rig.cam.fov = fov;
    rig.cam.updateProjectionMatrix();
    rig.stageSnap();
    this.framed = true;
  }

  updateActors(dt: number) {
    if (this.host.rig.cam.aspect !== this.frameAspect) this.frameOffer();
    this.host.player().update(dt);
    this.driver.update(dt);
  }

  framing() {
    if (!this.framed) return undefined;
    const cam = this.host.rig.cam;
    const screen = (point: THREE.Vector3) => {
      const p = point.project(cam);
      return { x: (p.x + 1) * 0.5, y: (1 - p.y) * 0.5 };
    };
    return {
      face: screen(this.driver.root.getWorldPosition(new THREE.Vector3()).setY(this.driver.height - 0.19)),
      taxi: screen(this.car.position.clone().setY(0.87)),
    };
  }

  clearFrame() {
    if (!this.framed) return;
    this.framed = false;
    this.host.rig.stage = null;
    this.host.rig.mode = "follow";
  }

  leave(dt: number) {
    const k = Math.min(1, (this.t += dt) / 1.25);
    this.position(departure, k ** 2);
    this.updateActors(dt);
    return k === 1;
  }

  decline() {
    this.t = 0;
    this.seatDriver();
  }

  returnToEdge() {
    this.clearFrame();
    const { x, z, inward } = this.edge;
    this.host.place(x + Math.sin(inward) * 1.2, z + Math.cos(inward) * 1.2, inward);
  }

  talk(seconds: number) { this.driver.talk(seconds, () => audio.level(), () => audio.vowel()); }

  take() {
    this.clearFrame();
    this.restoreSign?.();
    this.driver.root.removeFromParent();
    return this.car;
  }

  park() {
    this.parked = true;
    return this.take();
  }

  dispose() {
    this.clearFrame();
    this.restoreSign?.();
    this.driver.root.removeFromParent();
    this.driver.dispose?.();
    if (this.parked) return;
    this.disposeCar();
  }

  disposeCar() {
    this.disposed = true;
    this.car.removeFromParent();
    this.fallback.geometry.dispose();
    this.fallback.material.dispose();
  }
}
