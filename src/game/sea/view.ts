import { boardFaces } from "../kit/boardFaces";
// The sea scene, its borrowed town assets, chase camera and water effects. The rules and score live in mode.ts.
import * as THREE from "three";
import { BAY, SEA_LEVEL, Splashes } from "../water";
import { SEA_Z } from "../world/layout";
import { LIGHTHOUSE_ISLAND } from "../world/island";
import { SeaBackdrop, departureCover, seaSwell as swell } from "./backdrop";
import type { Ride, Rides } from "../rides/Rides";
import { BOAT_SEATS } from "../rides/shapes";
import type { SeaBoat } from "./boat";
import { SEA_BOARD_FRAME, type SeaGate } from "./buoys";
import { cameraPose, crossingPose, RETURN_SPEED, type SeaEnvironment } from "./entry";
import { LANE_WIDTH, WIDE_GATE_VIEW } from "./course";
import { smoothstep } from "../movement";
import { crest, DEPARTURE_SECONDS, RETURN_SEAM } from "./crossing";
import { seaScenery } from "./scenery";
import { SeaWake } from "./wake";

const GATE_HALF = LANE_WIDTH * 1.5;
const SHORE_FOV = 48;

type ReturnView = {
  age: number;
  rides: Rides;
  offset: THREE.Vector3;
  from: THREE.PerspectiveCamera;
  eye: THREE.Spherical;
  show: number;
  bayRegistered: boolean;
  departure: number;
  gaze: THREE.Quaternion;
  hull: THREE.Quaternion;
  hullY: number;
  seat: THREE.Vector3;
  rider: THREE.Quaternion;
  fitted?: { aspect: number; radius: number; pitch: number };
};

function borrow(object: THREE.Object3D, scene: THREE.Scene) {
  const { parent } = object;
  const position = object.position.clone(), rotation = object.quaternion.clone(), order = object.rotation.order;
  scene.attach(object);
  return () => {
    object.removeFromParent();
    parent?.add(object);
    object.position.copy(position);
    object.rotation.order = order;
    object.quaternion.copy(rotation);
  };
}

export class SeaView {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private readonly sky: THREE.Mesh;
  private readonly backdrop: SeaBackdrop;
  /** The run's timer as the time of day: 0 as it starts, 1 as it ends. */
  day = 0;
  private readonly buoys: THREE.Mesh;
  private readonly shoreSea: SeaEnvironment["sea"];
  private readonly bayPosition: THREE.Vector3;
  private readonly buoyPosition: THREE.Vector3;
  private readonly bayBuoys: boolean;
  private readonly originalFar: number;
  private readonly from = new THREE.PerspectiveCamera();
  private readonly retreat = new THREE.Vector3();
  private readonly axisX = new THREE.Vector3(1, 0, 0);
  private readonly fitPoint = new THREE.Vector3();
  private readonly targetHull = new THREE.Object3D();
  private readonly targetRider = new THREE.Object3D();
  private home?: ReturnView;
  private readonly reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  private departure = true;
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
  private readonly seatTilt = new THREE.Quaternion();
  private readonly seatRotation = new THREE.Quaternion();
  private readonly aim = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly cameraOffset = new THREE.Vector3();
  private readonly cameraRotation = new THREE.Quaternion();
  private readonly hullStart = new THREE.Euler(0, 0, 0, "YXZ");
  private hullY = 0;
  private cameraMix = 0;
  private crestCameraLift = 0;
  private approach = 0;
  private followX = 0;
  private followHeading = Math.PI;
  private portrait = false;
  /** A phone on its side. */
  private short = false;
  /** The lens reaches for the gate row while the camera backs off to match: the boat keeps its size and the three
   *  boards can be read seconds earlier (most of all on a phone). */
  private lens = 1;
  /** Half the picture's width per metre of distance at the unzoomed lens. */
  private spread = 0.35;
  private gateAhead?: number;
  private startHeading = 0;
  private age = 0;
  private nextSpray = 0;

  constructor(private ride: Pick<Ride, "mesh" | "m" | "townBoat" | "phase">, private rider: THREE.Object3D, camera: THREE.PerspectiveCamera, env: SeaEnvironment, buoys: THREE.Mesh) {
    this.camera = camera.clone();
    this.camera.updateMatrixWorld(true);
    this.originalFar = camera.far;
    this.sky = env.sky.clone();
    this.shoreSea = env.sea.clone();
    this.shoreSea.material = env.sea.material.clone();
    this.bayPosition = this.shoreSea.position.clone();
    this.buoyPosition = buoys.position.clone();
    this.bayBuoys = buoys.visible;
    if (env.rings) this.spray.copyRing(env.rings);
    this.buoys = buoys.clone();
    const sun = env.sun.clone();
    sun.castShadow = false;
    sun.target = env.sun.target.clone();
    this.scene.fog = env.fog?.clone() ?? null;
    const hemi = env.hemi.clone();
    this.scene.add(this.sky, this.shoreSea, this.buoys, hemi, sun, sun.target, this.scenery, this.wake.mesh, this.spray.group, this.sparks);
    this.backdrop = new SeaBackdrop(this.scene, { sky: this.sky, bay: this.shoreSea, fog: this.scene.fog as THREE.Fog | null, hemi, sun }, SEA_LEVEL);
    this.sparks.count = 0;
    this.sparks.frustumCulled = false;
    this.giveBoatBack = borrow(ride.mesh, this.scene);
    this.givePlayerBack = borrow(rider, this.scene);
  }

  begin(boat: SeaBoat, departure = true) {
    const mesh = this.ride.mesh;
    this.departure = departure;
    this.age = 0;
    this.from.copy(this.camera);
    this.cameraOffset.copy(this.camera.position).sub(mesh.position);
    this.retreat.copy(this.cameraOffset).setY(0).normalize();
    this.seat.copy(mesh.worldToLocal(this.rider.position.clone()));
    this.seatRotation.copy(mesh.quaternion).invert().multiply(this.rider.quaternion);
    if (!departure) {
      this.wake.reset();
      this.burst = undefined;
      this.sparks.count = 0;
    }
    this.cameraRotation.copy(this.camera.quaternion);
    this.hullStart.copy(mesh.rotation);
    this.hullY = mesh.position.y;
    this.startHeading = boat.heading;
    this.cameraMix = this.crestCameraLift = 0;
    this.followX = boat.worldX;
    this.followHeading = Math.PI;
    this.backdrop.begin(boat.startX, boat.startZ, { x0: BAY.x0, x1: BAY.x1, z: SEA_Z, lighthouse: LIGHTHOUSE_ISLAND?.center });
    this.gateAhead = undefined;
  }

  pose(boat: SeaBoat, time: number, dt: number, portrait: boolean, gateAhead?: number) {
    this.age += dt;
    const home = this.home;
    if (home) home.age = Math.min(RETURN_SEAM, home.age + dt);
    const returning = home?.age ?? 0;
    const returnMix = smoothstep(0.65, RETURN_SEAM, returning);
    const wakeStrength = 1 - smoothstep(0.34, 1.14, returning);
    const age = home ? home.departure + returning : this.age;
    const peak = this.departure ? crest(age) * (home ? 1 - smoothstep(0, 0.30, returning) : 1) : 0;
    const motionPeak = peak * (this.reduced ? 0.25 : 1);
    const register = home && !home.bayRegistered && returning >= 0.30 - 1e-8;
    let show = this.departure ? departureCover(age) : 1;
    if (home) {
      if (register) this.registerBay(home);
      show = returning < 0.30 ? THREE.MathUtils.lerp(home.show, 1, smoothstep(0, 0.30, returning)) : wakeStrength;
      if (register) show = 1;
    }
    this.backdrop.roller(boat.distance, wakeStrength);
    const { mesh, m } = this.ride;
    const mix = smoothstep(0, DEPARTURE_SECONDS, age);
    const wave = swell(boat.worldX, boat.worldZ, time);
    const keel = SEA_LEVEL - (this.ride.townBoat ? SEA_LEVEL : BOAT_SEATS.water) + 0.07;
    const afloat = keel + wave * 0.85 + Math.sin(time * 1.6) * 0.045;
    const flatten = 1 - mix;
    mesh.position.set(boat.worldX, THREE.MathUtils.lerp(this.hullY, afloat, mix) + 0.16 * motionPeak, boat.worldZ);
    const rock = Math.sin(boat.wobble * 19) * boat.wobble * 0.24;
    mesh.rotation.set(this.hullStart.x * flatten + (Math.sin(time * 1.43) * 0.056 - 0.08) * mix - 0.030 * motionPeak,
      this.hullStart.y + (boat.heading - this.startHeading),
      this.hullStart.z * flatten + (Math.sin(time * 1.02) * 0.052 - boat.lateral * 0.013 + rock) * mix, "YXZ");
    if (home) {
      const normal = this.seatTilt.copy(mesh.quaternion);
      const wakeUp = smoothstep(0, 0.32, returning);
      mesh.quaternion.slerpQuaternions(home.hull, normal, wakeUp);
      mesh.position.y = THREE.MathUtils.lerp(home.hullY, mesh.position.y, wakeUp);
      const bay = { x: boat.worldX + home.offset.x, z: boat.worldZ + home.offset.z, rot: boat.heading };
      home.rides.sampleBoatReturn(this.ride, bay, boat.speed, time, this.targetHull, this.targetRider);
      mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, this.targetHull.position.y, returnMix);
      mesh.quaternion.slerp(this.targetHull.quaternion, returnMix);
    }
    mesh.updateMatrixWorld(true);
    this.rider.position.copy(this.seat).applyMatrix4(mesh.matrixWorld);
    this.rider.quaternion.copy(mesh.quaternion).multiply(this.seatRotation);
    // The rider follows the hull on the swell, with the original seated pose at the seam.
    if (mix > 0) {
      const upright = this.chase.quaternion.setFromAxisAngle(this.up, mesh.rotation.y);
      this.rider.quaternion.slerp(upright, mix * 0.58);
    }

    if (home) {
      this.rider.position.lerp(this.fitPoint.copy(home.seat).applyMatrix4(mesh.matrixWorld), 1 - smoothstep(0, 0.32, returning));
      this.rider.quaternion.slerp(home.rider, 1 - smoothstep(0, 0.32, returning));
      this.rider.position.lerp(this.fitPoint.copy(this.targetRider.position).sub(home.offset), returnMix);
      this.rider.quaternion.slerp(this.targetRider.quaternion, returnMix);
    }

    this.gateAhead = gateAhead;
    const sin = Math.sin(boat.heading), cos = Math.cos(boat.heading);
    const ease = 1 - Math.exp(-dt * 14);
    this.followX = THREE.MathUtils.lerp(this.followX, boat.worldX, ease);
    // Orbit about the hull so the approach can look towards the middle gate while keeping the boat in frame.
    const ahead = gateAhead ?? 0;
    const gateMix = this.departure ? smoothstep(DEPARTURE_SECONDS, 2, age) : 1;
    const lookAcross = gateMix * smoothstep(portrait ? 8 : 9, portrait ? 16 : 22, ahead)
      * (1 - smoothstep(78, 100, ahead));
    this.approach = lookAcross;
    const across = Math.atan2(boat.x, Math.max(portrait ? 16 : 22, ahead)) * lookAcross;
    const wanted = boat.turning ? boat.heading : Math.PI + across;
    const delta = wanted - this.followHeading;
    this.followHeading += Math.atan2(Math.sin(delta), Math.cos(delta)) * ease;
    const dx = Math.sin(this.followHeading), dz = Math.cos(this.followHeading);
    const turn = Math.sin(Math.PI * boat.turnProgress);
    const hullRoom = Math.max(0, m.spec.half - 3.2) * 1.35;
    const baseBack = (portrait ? 11.4 : 10.5) + turn * 0.75 + hullRoom;
    // Fill 84% of a phone's width with the row of boards (a wide screen: 45%, with a gentler lens), then let go over
    // the last metres so the pass is still felt.
    const phone = portrait || this.short;
    const fill = this.spread * (phone ? 0.84 : 0.45);
    const reaching = gateAhead !== undefined && !boat.turning && (this.departure ? age > DEPARTURE_SECONDS : age > 0.5);
    const wantedLens = reaching ? 1 + (THREE.MathUtils.clamp(fill * ahead / Math.max(1, GATE_HALF - fill * baseBack), 1, phone ? 2.3 : 1.6) - 1)
      * THREE.MathUtils.smoothstep(ahead, 6, 22) : 1;
    // (slow to reach out, quick to let go: the row must never outgrow the picture on the way in)
    this.lens += (wantedLens - this.lens) * (1 - Math.exp(-dt * (wantedLens < this.lens ? 12 : 1.8)));
    const back = baseBack * this.lens, height = portrait ? 5.05 : 4.65;
    // The camera rides the swell with the hull, so the boat keeps its place in the picture and the horizon moves.
    const ride = wave * 0.85;
    this.chase.position.set(this.followX - dx * back, height + ride, boat.worldZ - dz * back);
    this.aim.set(this.followX + dx * 14, (portrait ? 1.1 : 0.35) - turn * 0.8 + ride, boat.worldZ + dz * 14);
    this.chase.lookAt(this.aim);
    const rise = this.departure && !this.reduced ? smoothstep(0, 0.65, age) : 0;
    this.cameraMix = this.departure && !this.reduced ? smoothstep(0.65, DEPARTURE_SECONDS, age) : mix;
    this.crestCameraLift = rise * (portrait ? 0.55 : 0.70);
    this.camera.position.copy(mesh.position).add(this.cameraOffset);
    if (this.reduced) this.camera.position.y -= 0.16 * motionPeak;
    else if (this.departure) {
      this.camera.position.y = this.hullY + this.cameraOffset.y + this.crestCameraLift;
      this.camera.position.addScaledVector(this.retreat, rise * (portrait ? 1.00 : 1.35));
    }
    this.camera.quaternion.copy(this.cameraRotation)
      .multiply(this.seatTilt.setFromAxisAngle(this.axisX, THREE.MathUtils.degToRad(1.25) * rise))
      .slerp(this.chase.quaternion, this.cameraMix);
    this.camera.position.lerp(this.chase.position, this.cameraMix);
    this.portrait = portrait;

    this.shoreSea.material.uniforms.uTime.value = time;
    this.buoys.visible = this.bayBuoys && show < 1;
    this.backdrop.update(dt, time, this.day, { x: boat.worldX, z: boat.worldZ, heading: boat.heading, speed: boat.speed / 14 },
      this.camera, show, peak, wakeStrength);
    const sternX = boat.worldX - sin * m.spec.half * 0.8, sternZ = boat.worldZ - cos * m.spec.half * 0.8;
    this.wake.update(time, sternX, sternZ, cos, -sin, m.spec.wide, boat.speed, wakeStrength);
    if ((this.nextSpray -= dt) <= 0 && boat.speed >= 7 && (!home || returning < 0.45)) {
      this.nextSpray = 0.13 - 0.04 * motionPeak;
      for (const side of [-1, 1]) {
        const x = boat.worldX + cos * m.spec.wide * side + sin * m.spec.half * 0.7;
        const z = boat.worldZ - sin * m.spec.wide * side + cos * m.spec.half * 0.7;
        this.spray.burst(x, SEA_LEVEL + swell(x, z, time) + 0.05, z, cos * side * 0.65 - sin * 0.5,
          -sin * side * 0.65 - cos * 0.5, Math.min(0.95, Math.min(0.85, boat.speed / 16) + 0.10 * motionPeak));
      }
    }
    if (home) {
      const ring = smoothstep(0.70, 1.14, returning);
      this.spray.boatRing(dt, time, { x: boat.worldX, z: boat.worldZ, heading: boat.heading, pace: boat.speed, slip: 0 },
        { opacity: ring, offset: home.offset, match: returning >= 1.14 });
    } else if (this.departure && age <= 0.32) {
      this.spray.boatRing(dt, time, { x: boat.worldX, z: boat.worldZ, heading: boat.heading, pace: boat.speed, slip: 0 },
        { opacity: 1 - smoothstep(0, 0.32, age) });
    } else {
      // The ribbon carries the wake while the two skies and water surfaces overlap.
      this.spray.update(dt, time, show < 1 ? null : { x: sternX, y: SEA_LEVEL + swell(sternX, sternZ, time), z: sternZ },
        Math.min(1, boat.speed / 12), m.spec.wide * 2.7);
    }
    this.poseSparks(time);
  }

  startReturn(destination: Ride["home"], end: { x: number; z: number }, rides: Rides) {
    const { mesh } = this.ride;
    const offset = new THREE.Vector3(destination.x - end.x, 0, destination.z - end.z);
    const from = this.camera.clone();
    this.chase.position.copy(from.position);
    this.chase.lookAt(mesh.position);
    const gaze = this.chase.quaternion.clone().invert().multiply(from.quaternion);
    this.home = { age: 0, rides, offset, from, gaze,
      eye: new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(mesh.position)),
      show: this.backdrop.shown, bayRegistered: false, departure: this.age,
      hull: mesh.quaternion.clone(), hullY: mesh.position.y,
      seat: mesh.worldToLocal(this.rider.position.clone()), rider: this.rider.quaternion.clone() };
    if (this.home.show === 1) this.registerBay(this.home);
  }

  private registerBay(home: ReturnView) {
    home.bayRegistered = true;
    const { offset } = home;
    this.shoreSea.position.copy(this.bayPosition).sub(offset);
    this.shoreSea.material.uniforms.uBayOffset?.value.copy(offset);
    this.buoys.position.copy(this.buoyPosition).sub(offset);
  }

  private returnCamera(w: number, h: number, home: ReturnView) {
    if (!home.age) { this.camera.copy(home.from); return; }
    const aspect = w / h;
    if (home.fitted?.aspect !== aspect) home.fitted = this.fitReturn(aspect);
    const { radius, pitch } = home.fitted;
    const mix = smoothstep(0, RETURN_SEAM, home.age);
    const { position } = this.ride.mesh;
    const theta = home.eye.theta + Math.atan2(Math.sin(Math.PI - home.eye.theta), Math.cos(Math.PI - home.eye.theta)) * mix;
    this.camera.position.setFromSphericalCoords(THREE.MathUtils.lerp(home.eye.radius, radius, mix),
      THREE.MathUtils.lerp(home.eye.phi, Math.PI / 2 - pitch, mix), theta).add(position);
    this.camera.lookAt(position);
    this.camera.quaternion.multiply(this.seatTilt.identity().slerp(home.gaze, 1 - mix));
    this.camera.fov = THREE.MathUtils.lerp(home.from.fov, SHORE_FOV, mix);
    this.camera.far = THREE.MathUtils.lerp(home.from.far, this.originalFar, mix);
    this.applyShift(w, h, home.from, 1 - mix);
  }

  private fitReturn(aspect: number) {
    const { mesh } = this.ride;
    const bounds = new THREE.Box3();
    const inv = mesh.matrixWorld.clone().invert();
    const local = new THREE.Matrix4();
    const p = new THREE.Vector3();
    for (const root of [mesh, this.rider]) {
      root.updateMatrixWorld(true);
      root.traverse(object => {
        const geometry = (object as THREE.Mesh).geometry;
        if (!geometry || !object.visible) return;
        if (!geometry.boundingBox) geometry.computeBoundingBox();
        if (geometry.boundingBox) bounds.union(geometry.boundingBox.clone().applyMatrix4(local.multiplyMatrices(inv, object.matrixWorld)));
      });
    }
    const corners: THREE.Vector3[] = [];
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) corners.push(new THREE.Vector3(x, y, z));
    }
    const fit = new THREE.PerspectiveCamera(SHORE_FOV, aspect, this.camera.near, this.originalFar);
    let radius = 11;
    for (let degrees = 52; degrees <= 89; degrees++) {
      const pitch = THREE.MathUtils.degToRad(degrees);
      while (radius < 80) {
        fit.position.set(0, Math.sin(pitch) * radius, -Math.cos(pitch) * radius);
        fit.lookAt(0, 0, 0);
        fit.updateMatrixWorld(true);
        if (corners.every(corner => {
          p.copy(corner).project(fit);
          return Math.abs(p.x) <= 0.84 && Math.abs(p.y) <= 0.84 && Math.abs(p.z) < 1;
        })) break;
        radius += 0.25;
      }
      p.set(1, 1, 0.5).unproject(fit).sub(fit.position);
      const distance = p.y < 0 ? (-1 - fit.position.y) / p.y : Infinity;
      if (distance < Infinity && Math.hypot(p.x * distance, fit.position.z + p.z * distance) <= 25) return { aspect, radius, pitch };
    }
    return { aspect, radius, pitch: THREE.MathUtils.degToRad(89) };
  }

  handoff(time: number) {
    const camera = this.camera.clone();
    camera.position.add(this.home!.offset);
    camera.updateMatrixWorld(true);
    return { camera, time };
  }

  private applyShift(w: number, h: number, from: THREE.PerspectiveCamera, weight: number) {
    const view = from.view;
    if (view?.enabled && weight > 0) this.camera.setViewOffset(w, h,
      weight * w * view.offsetX / view.fullWidth, weight * h * view.offsetY / view.fullHeight, w, h);
    else this.camera.clearViewOffset();
  }

  private fitGate(w: number, h: number, faces: ReturnType<SeaGate["faces"]>) {
    const ahead = this.gateAhead ?? 0;
    const fit = smoothstep(8, 16, ahead) * (1 - smoothstep(32, 44, ahead));
    if (!this.portrait || !fit || faces.length !== 3) return;
    const [width, height, depth] = SEA_BOARD_FRAME;
    let left = Infinity, right = -Infinity;
    for (const face of faces) for (const x of [-width / 2, width / 2]) {
      for (const y of [-height / 2, height / 2]) {
        this.fitPoint.set(x, y, depth).applyMatrix4(face.world).project(this.camera);
        left = Math.min(left, this.fitPoint.x);
        right = Math.max(right, this.fitPoint.x);
      }
    }
    // Fit the wooden trim, leaving 8 CSS px at each edge. The label uses the same world transform.
    const scale = (right - left) / (2 * (1 - 16 / w));
    const k = THREE.MathUtils.lerp(1, scale, fit);
    this.camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2) * k));
    this.camera.setViewOffset(w, h, (left + right) / 2 / k * w / 2 * fit, 0, w, h);
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
    const faces = gate?.faces() ?? [];
    if (this.home) {
      this.returnCamera(w, h, this.home);
    } else if (this.age > 0) {
      // Keep the same horizontal portrait framing across handset heights.
      const portraitTan = Math.tan(THREE.MathUtils.degToRad(61) / 2) / (664 / 390);
      const portraitFov = THREE.MathUtils.radToDeg(2 * Math.atan(portraitTan * (h / w) / this.lens));
      this.short = !this.portrait && h < 520;
      this.spread = this.portrait ? portraitTan : Math.tan(THREE.MathUtils.degToRad(26)) * w / h;
      const desktopFov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(26)) / this.lens))
        - (!this.short && w >= WIDE_GATE_VIEW ? 2.5 * this.approach : 0);
      this.camera.fov = THREE.MathUtils.lerp(this.from.fov, this.portrait ? portraitFov : desktopFov, this.cameraMix);
      this.camera.far = 2600;
      this.applyShift(w, h, this.from, 1 - this.cameraMix);
      this.camera.updateProjectionMatrix();
      this.camera.updateMatrixWorld(true);
      // There is no gate correction until the crossing has reached the ordinary chase.
      if (this.cameraMix === 1) this.fitGate(w, h, faces);
    }
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
    this.sky.position.copy(this.camera.position);
    this.backdrop.gate(gate?.mesh.visible ? gate.mesh.position : undefined, LANE_WIDTH, gate?.shown ?? 0);
    this.backdrop.sky.mesh.position.copy(this.camera.position);
    this.backdrop.sky.mesh.scale.setScalar(Math.min(1, this.camera.far / 2350));
    renderer.render(this.scene, this.camera);
    boardFaces.sea.draw(this.camera, w, h, gate?.id, faces);
  }

  debug(time: number) {
    const { home, camera, chase } = this;
    return { ...crossingPose(camera, this.ride.mesh, this.rider, time), crossingAge: this.age,
      departure: this.departure, returnAge: home?.age, translation: home?.offset.toArray(), chase: cameraPose(chase),
      retreat: this.retreat.toArray(), crestCameraLift: this.crestCameraLift, reducedMotion: this.reduced };
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
    this.shoreSea.material.dispose();
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
