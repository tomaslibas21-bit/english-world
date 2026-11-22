import * as THREE from "three";
import { ROAD_EDITION } from "../../content/road";
import { NPCS } from "../../content/npcs";
import { audio } from "../audio";
import { createCharacter } from "../characters";
import { covers, shoulderShots } from "../talkShot";
import { CAR_SEATS } from "../rides/shapes";
import { carGeometry, mxTaxiParts } from "../world/car";
import { loadCarModel } from "../world/carModels";
import { TAXI } from "../world/layout";
import { colourMerge } from "../world/util";
import type { RoadHost, WalkEdge } from "./entry";

export function liftDriver() {
  const driver = createCharacter(NPCS[ROAD_EDITION.driver.npc].look);
  driver.root.traverse((part) => { part.castShadow = false; });
  driver.fidgets = false;
  driver.seatY = CAR_SEATS.seat;
  driver.recline = 0.12;
  driver.setAnim("sit");
  return driver;
}

export class Lift {
  readonly car = new THREE.Group();
  readonly driver = liftDriver();
  private fallback = new THREE.Mesh(TAXI.trim ? colourMerge(mxTaxiParts(TAXI.color, TAXI.trim)) : carGeometry(TAXI.color, { taxi: true }),
    new THREE.MeshLambertMaterial({ vertexColors: true }));
  private disposed = false;
  private parked = false;
  private t = 0;
  private x: number;
  private z: number;
  private dx: number;
  private dz: number;
  private heading: number;
  private framed = false;

  constructor(private host: RoadHost, readonly edge: WalkEdge) {
    const nx = Math.sin(edge.inward), nz = Math.cos(edge.inward);
    let tangent = { x: nz, z: -nx };
    for (const side of [1, -1]) {
      const tx = nz * side, tz = -nx * side;
      const clear = [-8, -3, 2.4].every((d) => host.canPullUp(edge.x + nx * 2.65 + tx * d, edge.z + nz * 2.65 + tz * d));
      if (clear) { tangent = { x: tx, z: tz }; break; }
    }
    this.dx = tangent.x;
    this.dz = tangent.z;
    this.heading = Math.atan2(this.dx, this.dz);
    this.x = edge.x + nx * 2.65 + this.dx * 2.4;
    this.z = edge.z + nz * 2.65 + this.dz * 2.4;
    this.car.add(this.fallback, this.driver.root);
    this.seatDriver();
    this.host.add(this.car);
    this.position(-12);
    void loadCarModel(TAXI.model).then((model) => {
      if (this.disposed) return;
      const instance = model.createInstance(TAXI.trim ? { body: TAXI.color, trim: TAXI.trim } : TAXI.color);
      this.car.remove(this.fallback);
      this.car.add(instance);
    }).catch(() => { /* The same taxi has a procedural fallback in town. */ });
  }

  private seatDriver() {
    this.driver.root.position.set(CAR_SEATS.driver[0], CAR_SEATS.floor, CAR_SEATS.driver[1]);
    this.driver.root.rotation.y = 0;
    this.driver.busy = "wheel";
    this.driver.recline = 0.12;
    this.driver.setAnim("sit");
  }

  private position(offset: number) {
    this.car.position.set(this.x + this.dx * offset, 0.03, this.z + this.dz * offset);
    this.car.rotation.y = this.heading;
  }

  arrive(dt: number) {
    const k = Math.min(1, (this.t += dt) / 1.35);
    this.position(-12 * (1 - k) ** 2);
    this.driver.update(dt);
    if (k === 1) {
      const e = this.edge;
      this.host.place(e.x, e.z, Math.atan2(this.x - e.x, this.z - e.z));
      this.car.updateMatrixWorld(true);
      const beside = this.car.worldToLocal(new THREE.Vector3(e.x, 0, e.z));
      const door = Math.sign(beside.x) * 1.29;
      this.driver.root.position.set(door, 0, -0.26);
      this.driver.root.rotation.y = Math.atan2(beside.x - door, beside.z + 0.26);
      this.driver.busy = null;
      this.driver.recline = 0;
      this.driver.setAnim("idle");
      this.frameOffer();
    }
    return k === 1;
  }

  private frameOffer() {
    const { rig } = this.host;
    const learner = this.host.player();
    const player = learner.root.position;
    const driver = this.driver.root.getWorldPosition(new THREE.Vector3());
    const face = driver.clone().setY(this.driver.height - 0.19);
    const focus = driver.clone().lerp(this.car.position, 0.43).setY(1.10);
    const w = rig.cam.aspect;
    const portrait = this.host.portrait();
    const frame = new THREE.PerspectiveCamera(portrait ? 62 : 55, w, 0.1, 50);
    // The conversation cards occupy the lower part of the viewport. Frame the cab and its driver above them.
    const shiftY = portrait ? 0.235 : 0.17;
    const corners = [-1, 1].flatMap((x) => [-1, 1].flatMap((z) => [0.28, 1.56].map((y) =>
      this.car.localToWorld(new THREE.Vector3(x * 0.98, y, z * 2.12)))));
    const body = { x: player.x, y: player.y, z: player.z, top: player.y + learner.height, r: 0.48 };
    const fits = (at: THREE.Vector3) => {
      const dot = at.clone().project(frame);
      return Math.abs(dot.x) <= 0.91 && dot.y >= -0.47 && dot.y <= 0.54 && dot.z > 0;
    };
    let fallback;
    for (const shot of shoulderShots(player, driver, focus, portrait ? 4.2 : 3.4, 9.5, 1)) {
      if (rig.space && (rig.space.inside(shot.pos) || rig.space.free(face, shot.pos) < 0.97)) continue;
      if (covers(shot.pos, face, body)) continue;
      fallback ??= shot;
      frame.position.copy(shot.pos);
      frame.lookAt(shot.look);
      frame.updateMatrixWorld(true);
      if (!fits(face) || !corners.every(fits)) continue;
      fallback = shot;
      break;
    }
    if (!fallback) return;
    rig.stage = { ...fallback, rate: 12, shiftY };
    rig.mode = "stage";
    rig.cam.fov = frame.fov;
    rig.cam.updateProjectionMatrix();
    rig.stageSnap();
    this.framed = true;
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
    this.position(16 * k ** 2);
    this.driver.update(dt);
    return k === 1;
  }

  decline() {
    this.clearFrame();
    this.t = 0;
    this.seatDriver();
    const { x, z, inward } = this.edge;
    this.host.place(x + Math.sin(inward) * 1.2, z + Math.cos(inward) * 1.2, inward);
  }

  talk(seconds: number) { this.driver.talk(seconds, () => audio.level(), () => audio.vowel()); }

  take() {
    this.clearFrame();
    this.driver.root.removeFromParent();
    return this.car;
  }

  park() {
    this.parked = true;
    return this.take();
  }

  dispose() {
    this.clearFrame();
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
