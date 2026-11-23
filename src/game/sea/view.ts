// The sea scene, its borrowed town assets, chase camera and water effects. The rules and score live in mode.ts.
import * as THREE from "three";
import { BAY, SEA_LEVEL, Splashes } from "../water";
import { SEA_Z } from "../world/layout";
import { SeaBackdrop, seaSwell as swell } from "./backdrop";
import type { Ride } from "../rides/Rides";
import { BOAT_SEATS } from "../rides/shapes";
import type { SeaBoat } from "./boat";
import type { SeaGate } from "./buoys";
import type { SeaEnvironment } from "./entry";
import { LANE_WIDTH, WIDE_GATE_VIEW } from "./course";
import { seaScenery } from "./scenery";
import { SeaWake } from "./wake";

function borrow(object: THREE.Object3D, scene: THREE.Scene) {
  const { parent } = object;
  const position = object.position.clone(), rotation = object.quaternion.clone();
  scene.attach(object);
  return () => {
    object.removeFromParent();
    parent?.add(object);
    object.position.copy(position);
    object.quaternion.copy(rotation);
  };
}

export class SeaView {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private readonly sky: THREE.Mesh;
  private readonly townSea: SeaEnvironment["sea"];
  private readonly backdrop: SeaBackdrop;
  /** The run's timer as the time of day: 0 as it starts, 1 as it ends. */
  day = 0;
  private readonly buoys: THREE.Mesh;
  private readonly shoreSea: SeaEnvironment["sea"];
  private readonly spray = new Splashes();
  private readonly wake = new SeaWake();
  private readonly sparks = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.095),
    new THREE.MeshBasicMaterial({ color: "#ffd269", transparent: true, depthWrite: false, toneMapped: false }), 16);
  private readonly particle = new THREE.Object3D();
  private burst?: { x: number; y: number; z: number; time: number };
  private readonly scenery = seaScenery();
  private readonly giveBoatBack: () => void;
  private readonly givePlayerBack: () => void;
  private readonly chase = new THREE.PerspectiveCamera();
  private readonly seat = new THREE.Vector3();
  private readonly seatRotation = new THREE.Quaternion();
  private readonly aim = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly cameraOffset = new THREE.Vector3();
  private readonly cameraRotation = new THREE.Quaternion();
  private readonly hullStart = new THREE.Euler(0, 0, 0, "YXZ");
  private hullY = 0;
  private fov = 0;
  private cameraMix = 0;
  private approach = 0;
  private followX = 0;
  private followHeading = Math.PI;
  private portrait = false;
  private shift = 0;
  private startHeading = 0;
  private age = 0;
  private nextSpray = 0;

  constructor(private ride: Pick<Ride, "mesh" | "m" | "townBoat">, private rider: THREE.Object3D, camera: THREE.PerspectiveCamera, env: SeaEnvironment, buoys: THREE.Mesh) {
    this.camera = camera.clone();
    this.camera.updateMatrixWorld(true);
    this.sky = env.sky.clone();
    this.shoreSea = env.sea.clone();
    this.townSea = env.sea;
    this.buoys = buoys.clone();
    const sun = env.sun.clone();
    sun.castShadow = false;
    this.scene.fog = env.fog?.clone() ?? null;
    const hemi = env.hemi.clone();
    this.scene.add(this.sky, this.shoreSea, this.buoys, hemi, sun, sun.target, this.scenery, this.wake.mesh, this.spray.group, this.sparks);
    this.backdrop = new SeaBackdrop(this.scene, { sky: this.sky, bay: this.shoreSea, fog: this.scene.fog as THREE.Fog | null, hemi, sun }, SEA_LEVEL);
    this.sparks.count = 0;
    this.sparks.frustumCulled = false;
    this.giveBoatBack = borrow(ride.mesh, this.scene);
    this.givePlayerBack = borrow(rider, this.scene);
    ride.mesh.updateMatrixWorld(true);
    this.seat.copy(ride.mesh.worldToLocal(rider.position.clone()));
    this.seatRotation.copy(ride.mesh.quaternion).invert().multiply(rider.quaternion);
  }

  begin(boat: SeaBoat) {
    const mesh = this.ride.mesh;
    this.cameraOffset.copy(this.camera.position).sub(mesh.position);
    this.cameraRotation.copy(this.camera.quaternion);
    this.hullStart.copy(mesh.rotation);
    this.hullY = mesh.position.y;
    this.startHeading = boat.heading;
    this.fov = this.camera.fov;
    this.cameraMix = 0;
    this.followX = boat.worldX;
    this.followHeading = Math.PI;
    this.backdrop.begin(boat.startX, boat.startZ, { x0: BAY.x0, x1: BAY.x1, z: SEA_Z });
    this.shift = this.camera.view?.enabled ? this.camera.view.offsetY / this.camera.view.fullHeight : 0;
  }

  pose(boat: SeaBoat, time: number, dt: number, portrait: boolean, gateAhead?: number) {
    this.age += dt;
    // The open water reaches much farther than the town does (the first frame keeps the town's own lens).
    this.camera.far = 2600;
    const { mesh, m } = this.ride;
    const mix = THREE.MathUtils.smoothstep(boat.age, 0, 1.6);
    const wave = swell(boat.worldX, boat.worldZ, time);
    const keel = SEA_LEVEL - (this.ride.townBoat ? SEA_LEVEL : BOAT_SEATS.water) + 0.07;
    const afloat = keel + wave * 0.85 + Math.sin(time * 1.6) * 0.045;
    const flatten = 1 - mix;
    mesh.position.set(boat.worldX, THREE.MathUtils.lerp(this.hullY, afloat, mix), boat.worldZ);
    const rock = Math.sin(boat.wobble * 19) * boat.wobble * 0.24;
    mesh.rotation.set(this.hullStart.x * flatten + (Math.sin(time * 1.43) * 0.056 - 0.08) * mix,
      this.hullStart.y + (boat.heading - this.startHeading),
      this.hullStart.z * flatten + (Math.sin(time * 1.02) * 0.052 - boat.lateral * 0.013 + rock) * mix, "YXZ");
    mesh.updateMatrixWorld(true);
    this.rider.position.copy(this.seat).applyMatrix4(mesh.matrixWorld);
    this.rider.quaternion.copy(mesh.quaternion).multiply(this.seatRotation);
    // The rider follows the hull on the swell, with the original seated pose at the seam.
    if (mix > 0) {
      const upright = this.chase.quaternion.setFromAxisAngle(this.up, mesh.rotation.y);
      this.rider.quaternion.slerp(upright, mix * 0.58);
    }

    const sin = Math.sin(boat.heading), cos = Math.cos(boat.heading);
    const ease = 1 - Math.exp(-dt * 14);
    this.followX = THREE.MathUtils.lerp(this.followX, boat.worldX, ease);
    // Orbit about the hull so the approach can look towards the middle gate while keeping the boat in frame.
    const ahead = gateAhead ?? 0;
    const lookAcross = THREE.MathUtils.smoothstep(ahead, 9, 22) * (1 - THREE.MathUtils.smoothstep(ahead, 38, 64));
    this.approach = lookAcross;
    const across = Math.atan2(boat.x, Math.max(22, ahead)) * lookAcross;
    const wanted = boat.turning ? boat.heading : Math.PI + across;
    const delta = wanted - this.followHeading;
    this.followHeading += Math.atan2(Math.sin(delta), Math.cos(delta)) * ease;
    const dx = Math.sin(this.followHeading), dz = Math.cos(this.followHeading);
    const turn = Math.sin(Math.PI * boat.turnProgress);
    const hullRoom = Math.max(0, m.spec.half - 3.2) * 1.35;
    const back = (portrait ? 11.4 : 10.5) + turn * 0.75 + hullRoom, height = portrait ? 5.05 : 4.65;
    // The camera rides the swell with the hull, so the boat keeps its place in the picture and the horizon moves.
    const ride = wave * 0.85;
    this.chase.position.set(this.followX - dx * back, height + ride, boat.worldZ - dz * back);
    this.aim.set(this.followX + dx * 14, (portrait ? 1.1 : 0.35) - turn * 0.8 + ride, boat.worldZ + dz * 14);
    this.chase.lookAt(this.aim);
    this.camera.position.copy(mesh.position).add(this.cameraOffset).lerp(this.chase.position, mix);
    this.camera.quaternion.slerpQuaternions(this.cameraRotation, this.chase.quaternion, mix);
    this.cameraMix = mix;
    this.portrait = portrait;
    this.shift *= Math.exp(-dt * 3.5);

    this.townSea.material.uniforms.uTime.value = time;
    this.buoys.visible = this.age < 2 && this.buoys.visible;
    this.backdrop.update(dt, time, this.day, { x: boat.worldX, z: boat.worldZ, heading: boat.heading, out: boat.distance, speed: boat.speed / 14 }, this.camera);
    const sternX = boat.worldX - sin * m.spec.half * 0.8, sternZ = boat.worldZ - cos * m.spec.half * 0.8;
    this.wake.update(time, sternX, sternZ, cos, -sin, m.spec.wide, boat.speed);
    if ((this.nextSpray -= dt) <= 0 && boat.speed >= 7) {
      this.nextSpray = 0.13;
      for (const side of [-1, 1]) {
        const x = boat.worldX + cos * m.spec.wide * side + sin * m.spec.half * 0.7;
        const z = boat.worldZ - sin * m.spec.wide * side + cos * m.spec.half * 0.7;
        this.spray.burst(x, SEA_LEVEL + swell(x, z, time) + 0.05, z, cos * side * 0.65 - sin * 0.5,
          -sin * side * 0.65 - cos * 0.5, Math.min(0.85, boat.speed / 16));
      }
    }
    this.spray.update(dt, time, { x: sternX, y: SEA_LEVEL + swell(sternX, sternZ, time), z: sternZ },
      Math.min(1, boat.speed / 12), m.spec.wide * 2.7);
    this.poseSparks(time);
  }

  celebrate(boat: SeaBoat, time: number) {
    const sin = Math.sin(boat.heading), cos = Math.cos(boat.heading);
    const x = boat.worldX + sin * this.ride.m.spec.half * 0.68;
    const z = boat.worldZ + cos * this.ride.m.spec.half * 0.68;
    const water = SEA_LEVEL + swell(x, z, time);
    for (const side of [-1, 1]) this.spray.fan(x, water, z, cos * side, -sin * side, 1);
    this.burst = { x, y: water + 0.18, z, time };
    this.backdrop.celebrate();
    this.poseSparks(time);
  }

  private poseSparks(time: number) {
    const burst = this.burst;
    this.sparks.count = burst && time - burst.time < 0.65 ? 16 : 0;
    if (!burst || !this.sparks.count) return;
    const age = (time - burst.time) / 0.65;
    this.sparks.material.opacity = 1 - age;
    for (let i = 0; i < this.sparks.count; i++) {
      const angle = i * 2.39996, radius = 0.6 + age * (1.8 + (i % 5) * 0.42);
      this.particle.position.set(burst.x + Math.cos(angle) * radius,
        burst.y + (i % 4) * 0.12 + Math.sin(Math.PI * age) * (0.55 + (i % 3) * 0.22),
        burst.z + Math.sin(angle) * radius + age * 2.4);
      this.particle.rotation.set(angle, age * 5 + angle, 0.35);
      this.particle.scale.setScalar(1.3 - age);
      this.particle.updateMatrix();
      this.sparks.setMatrixAt(i, this.particle.matrix);
    }
    this.sparks.instanceMatrix.needsUpdate = true;
  }

  render(renderer: Pick<THREE.WebGLRenderer, "render">, w: number, h: number, gate?: SeaGate) {
    this.camera.aspect = w / h;
    // Keep the portrait lens the same across the width. A taller handset should show more sky and water.
    const portraitFov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(61) / 2) * (h / w) / (664 / 390)));
    const desktopFov = 52 - (w >= WIDE_GATE_VIEW ? 2.5 * this.approach : 0);
    this.camera.fov = THREE.MathUtils.lerp(this.fov, this.portrait ? portraitFov : desktopFov, this.cameraMix);
    if (this.age > 0) {
      if (Math.abs(this.shift) > 0.0001) this.camera.setViewOffset(w, h, 0, this.shift * h, w, h);
      else this.camera.clearViewOffset();
    }
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
    this.sky.position.copy(this.camera.position);
    this.backdrop.gate(gate?.mesh.visible ? gate.mesh.position : undefined, LANE_WIDTH, gate?.shown ?? 0);
    renderer.render(this.scene, this.camera);
    return gate?.labels(this.camera, w, h) ?? [];
  }

  hullFrame() {
    const hull = this.ride.mesh;
    const p = new THREE.Vector3();
    const frame = { x: (hull.getWorldPosition(p).project(this.camera).x + 1) / 2,
      left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
    hull.traverse((object) => {
      const geometry = (object as THREE.Mesh).geometry;
      const positions = geometry?.getAttribute("position");
      if (!positions) return;
      for (let i = 0; i < positions.count; i++) {
        p.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld).project(this.camera);
        if (p.z < -1 || p.z > 1) { frame.left = -Infinity; continue; }
        frame.left = Math.min(frame.left, (p.x + 1) / 2);
        frame.right = Math.max(frame.right, (p.x + 1) / 2);
        frame.top = Math.min(frame.top, (1 - p.y) / 2);
        frame.bottom = Math.max(frame.bottom, (1 - p.y) / 2);
      }
    });
    return frame;
  }

  dispose() {
    this.givePlayerBack();
    this.giveBoatBack();
    this.backdrop.dispose();
    this.wake.dispose();
    this.sparks.geometry.dispose();
    this.sparks.material.dispose();
    this.sparks.dispose();
    for (const mesh of this.spray.group.children as (THREE.Mesh | THREE.Points)[]) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.scene.clear();
  }
}
