// What one can drive in the town: convertibles parked at the curb with their owners lounging in them, and a small
// boat at the pier (world/rides.ts says which and where). Walk up and take one: the owners hop out with a laugh and a
// word and stand by; drive off; get out anywhere and the car stays there; after a while its owners stroll back to it,
// and once nobody is looking it is back at its curb with them in it. Nobody is ever pulled out, pushed or run over:
// people step out of a car's way, and it stops by itself short of anyone ahead (drive.ts).
import * as THREE from "three";
import { createCharacter, addFarVersion, type GameCharacter } from "../characters";
import { STYLED, vertexColorMaterial } from "../style";
import { Chatter, walkerLook, type Ambient } from "../ambient";
import { Colliders, rand } from "../world/util";
import { WORLD } from "../world/layout";
import type { NavGrid } from "../nav";
import type { RidesPlan, CarSpot, BoatSpot } from "../world/rides";
import { RIDE_LINES, RIDE_BACK_LINES } from "../../content/rides";
import { BAY, DECKS, SHORE, floorY, waterY } from "../water";
import { Drivable, Motion, CAR, BOAT, aheadIn, pushOutOfBox, type Controls } from "./drive";
import { townDrivable } from "./ground";
import { convertibleGeometry, motorboatGeometry, CAR_SEATS, BOAT_SEATS } from "./shapes";

export interface RideHost {
  cam: THREE.PerspectiveCamera;
  /** The town's ground plan and its way-finding. */
  colliders: Colliders;
  nav: NavGrid;
  ambient: Ambient;
  player: GameCharacter;
  quality: "high" | "low";
  /** Where the people one talks to stand (a car stops short of them like of anyone). */
  people(): { x: number; z: number }[];
  /** Someone says a line: a bubble with its meaning, their mouth moving, their voice if it is recorded. */
  say(line: { en: string; lt: string }, female: boolean, ch: GameCharacter): void;
  /** Drops thrown up from the water at (x, z). */
  splash(x: number, y: number, z: number, dx: number, dz: number, k: number): void;
  /** In the town and in sight (not in a room, not behind a conversation's picture). */
  outdoors(): boolean;
}

interface Owner {
  ch: GameCharacter; female: boolean;
  /** Their seat in the car (its own coordinates), and which arm lies on the door. */
  seat: [number, number]; arm: "doorL" | "doorR";
  /** In the car, hopping out or in, standing by, or walking back to it. */
  state: "in" | "hop-out" | "out" | "walk" | "hop-in";
  t: number;
  from: THREE.Vector3; to: THREE.Vector3;
  path: [number, number][] | null;
  nod: number;
  /** In their seat far from the player, holding their pose (their parts' matrices and their skeleton left alone:
   *  a breath that far away costs a frame's time and shows nothing); `posed` once they have been drawn in the seat. */
  still?: boolean;
  posed?: boolean;
}

export interface Ride {
  id: string; kind: "car" | "boat";
  home: { x: number; z: number; rot: number };
  mesh: THREE.Mesh;
  m: Motion;
  owners: Owner[];
  chat: Chatter | null;
  /** How long it has stood away from its place with nobody at the wheel (s). */
  awayT: number;
  thanked: boolean;
  /** The boat's rocking. */
  phase: number;
}

const HOP = 0.55;
/** Beyond this (m) from the player, the people sitting in a parked convertible hold their pose. */
const STILL = 26;
/** Beyond this (m) from the camera they are drawn in their far version (fewer triangles, the same bones). */
const FAR = 20;
const NOOP = () => {};

/** Someone keeping their pose, or moving again: their matrices and their skeleton worked out once more, then left
 *  alone (three.js would otherwise redo every bone's matrix and the skin's bone texture each frame for a pose that
 *  does not change). */
function holdPose(root: THREE.Object3D, hold: boolean) {
  if (hold) {
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      o.matrixAutoUpdate = false;
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) { const sk = (o as THREE.SkinnedMesh).skeleton; sk.update(); sk.update = NOOP; }
    });
    root.updateMatrixWorld = NOOP;
  } else {
    Reflect.deleteProperty(root, "updateMatrixWorld");
    root.traverse((o) => {
      o.matrixAutoUpdate = true;
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) Reflect.deleteProperty((o as THREE.SkinnedMesh).skeleton, "update");
    });
  }
}
const _v = new THREE.Vector3(), _p = { x: 0, z: 0 };
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const ease = (k: number) => k * k * (3 - 2 * k);

export class Rides {
  group = new THREE.Group();
  readonly list: Ride[] = [];
  readonly drivable: Drivable;
  /** What a boat keeps clear of: the pier's decks, the boats at anchor, the rocks. */
  readonly sea = new Colliders();
  /** The one the player is in, and how far along getting in or out they are. */
  riding: Ride | null = null;
  phase: "in" | "on" | "out" = "on";
  private phaseT = 0;
  private from = new THREE.Vector3();
  private to = new THREE.Vector3();
  private fromRot = 0;
  /** Asked to get out while still rolling: it brakes first. */
  private wantOut = false;
  private sprayT = 0;
  private learner = new THREE.Vector3(0, -99, 0);
  private r = rand(9090);
  /** Called when the player is on their feet (or in the water) again, where and facing which way. */
  onLeft: ((x: number, y: number, z: number, rot: number) => void) | null = null;
  /** Called when there is nowhere to get out. */
  onStuck: (() => void) | null = null;

  constructor(readonly host: RideHost, plan: RidesPlan, boats: THREE.Object3D[]) {
    this.group.name = "rides";
    this.drivable = townDrivable(plan.lots);
    const mat = STYLED ? vertexColorMaterial("prop") : new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    plan.cars.forEach((spot, i) => this.addCar(spot, i, mat));
    plan.boats.forEach((spot, i) => this.addBoat(spot, i, mat));
    // the sea's own ground plan, for a boat: the pier's decks, the boats lying at anchor, the rocks
    for (const d of DECKS) if (d.z0 < SHORE.limit) this.sea.boxes.push({ minX: d.x0, maxX: d.x1, minZ: d.z0, maxZ: d.z1 });
    const hull = new THREE.Box3();
    for (const o of boats) {
      hull.setFromObject(o);
      const cx = (hull.min.x + hull.max.x) / 2, cz = (hull.min.z + hull.max.z) / 2, rot = o.rotation.y;
      for (const k of [-1.6, 0, 1.6]) this.sea.addCircle(cx + Math.sin(rot) * k, cz + Math.cos(rot) * k, 1.25);
    }
    for (const [x, z, r] of plan.rocks) this.sea.addCircle(x, z, r);
    host.ambient.rideBoxes = this.boxes;
  }

  /** The cars' ground plans as they stand now (the passers-by step round them, the traffic stops behind them). */
  readonly boxes: { x: number; z: number; heading: number; hl: number; hw: number }[] = [];

  private addCar(spot: CarSpot, i: number, mat: THREE.Material) {
    const mesh = new THREE.Mesh(convertibleGeometry(spot.paint, spot.inside), mat);
    mesh.castShadow = true;
    mesh.rotation.order = "YXZ";
    mesh.name = "ride-car-" + spot.id;
    this.group.add(mesh);
    const m = new Motion(CAR, "car");
    m.set(spot.x, spot.z, spot.rot);
    const ride: Ride = { id: spot.id, kind: "car", home: { x: spot.x, z: spot.z, rot: spot.rot }, mesh, m, owners: [], chat: null, awayT: 0, thanked: true, phase: 0 };
    const n = this.host.quality === "low" ? 1 : spot.people, r = rand(9100 + i * 7);
    for (let k = 0; k < n; k++) {
      const female = (i + k) % 2 === 0, look = walkerLook(female, r);
      // sunglasses on everyone who lounges in a convertible; no hat that the wind would take
      const acc = [...(look.acc ?? []).filter((a) => a !== "glasses" && a !== "cap"), "sunglasses"] as typeof look.acc;
      const mine = { ...look, acc }, ch = createCharacter(mine);
      ch.root.traverse((o) => { o.castShadow = false; });
      ch.watch = this.learner;
      ch.noticeWithin = 5;
      this.group.add(ch.root);
      const o: Owner = { ch, female, seat: k === 0 ? CAR_SEATS.driver : CAR_SEATS.passenger, arm: k === 0 ? "doorL" : "doorR", state: "in", t: 0, from: new THREE.Vector3(), to: new THREE.Vector3(), path: null, nod: 1 + r() * 4 };
      ride.owners.push(o);
      this.seatOwner(ride, o);
      // (far from the camera, the same person in fewer triangles)
      addFarVersion(ch, mine);
    }
    if (ride.owners.length === 2) ride.chat = new Chatter(ride.owners[0].ch, ride.owners[1].ch, r);
    this.list.push(ride);
    this.boxes.push({ x: spot.x, z: spot.z, heading: spot.rot, hl: CAR.half, hw: CAR.wide });
    // the passers-by plan their walks round where it is parked
    const nav = this.host.nav;
    for (let u = -CAR.half; u <= CAR.half + 1e-6; u += nav.cell * 0.5) for (let w = -CAR.wide; w <= CAR.wide + 1e-6; w += nav.cell * 0.5) {
      const c = nav.idx(spot.x + u * Math.sin(spot.rot) + w * Math.cos(spot.rot), spot.z + u * Math.cos(spot.rot) - w * Math.sin(spot.rot));
      if (c >= 0) nav.blocked[c] = 1;
    }
    this.place(ride, 0, 0);
  }

  private addBoat(spot: BoatSpot, i: number, mat: THREE.Material) {
    const mesh = new THREE.Mesh(motorboatGeometry(spot.stripe, spot.hull), mat);
    mesh.castShadow = true;
    mesh.rotation.order = "YXZ";
    mesh.name = "ride-boat-" + spot.id;
    this.group.add(mesh);
    const m = new Motion(BOAT, "boat");
    m.set(spot.x, spot.z, spot.rot);
    this.list.push({ id: spot.id, kind: "boat", home: { x: spot.x, z: spot.z, rot: spot.rot }, mesh, m, owners: [], chat: null, awayT: 0, thanked: true, phase: i * 2.1 + 0.7 });
  }

  // ---------------------------------------------------------------------------------------------- places

  /** A point of a ride's own (x to its left, z forward) on the ground plan. */
  private at(r: Ride, x: number, z: number, out: THREE.Vector3, y = 0) {
    const s = Math.sin(r.m.heading), c = Math.cos(r.m.heading);
    return out.set(r.m.x + x * c + z * s, y, r.m.z - x * s + z * c);
  }

  /** How far (x, z) is from a ride's side (0: at it or in it). */
  private reach(r: Ride, x: number, z: number) {
    const s = Math.sin(r.m.heading), c = Math.cos(r.m.heading), dx = x - r.m.x, dz = z - r.m.z;
    const u = Math.abs(dx * s + dz * c) - r.m.spec.half, w = Math.abs(dx * c - dz * s) - r.m.spec.wide;
    return Math.hypot(Math.max(0, u), Math.max(0, w));
  }

  /** The ride near enough to get into from (x, z), if any: a car from the street, a boat from the pier's boards or
   *  the water beside it. */
  near(x: number, z: number): Ride | null {
    if (this.riding) return null;
    let best: Ride | null = null, bd = Infinity;
    for (const r of this.list) {
      // (not while its people are on their way out of it or back into it)
      if (r.owners.some((o) => o.state === "hop-out" || o.state === "hop-in")) continue;
      const d = this.reach(r, x, z);
      if (d < (r.kind === "car" ? 1.7 : 2.3) && d < bd) { bd = d; best = r; }
    }
    return best;
  }

  /** The seat's height over the ground or the keel, where the player's and the owners' feet are put. */
  private seatY(r: Ride) { return r.mesh.position.y + (r.kind === "car" ? CAR_SEATS.floor : BOAT_SEATS.floor); }

  private seatOwner(r: Ride, o: Owner) {
    const ch = o.ch;
    this.at(r, o.seat[0], o.seat[1], ch.root.position, this.seatY(r));
    ch.root.rotation.set(0, r.m.heading, 0);
    ch.seatY = CAR_SEATS.seat;
    ch.recline = CAR_SEATS.recline;
    ch.busy = o.arm;
    if (ch.anim !== "sit") ch.setAnim("sit");
    ch.lift = 0; ch.tuck = 0;
  }

  // ------------------------------------------------------------------------------------- getting in and out

  /** The player takes `r`: its people hop out on the curb's side with a word, and the player hops in. */
  board(r: Ride) {
    if (this.riding) return false;
    const p = this.host.player.root.position;
    this.riding = r;
    this.phase = "in";
    this.phaseT = 0;
    this.wantOut = false;
    this.from.copy(p);
    this.fromRot = this.host.player.root.rotation.y;
    r.awayT = 0;
    r.thanked = false;
    let said = false;
    r.chat?.hold(6);
    r.owners.forEach((o, i) => {
      if (o.state === "in") {
        this.hopOut(r, o, i);
        if (!said) { said = true; this.host.say(RIDE_LINES[Math.floor(Math.random() * RIDE_LINES.length)], o.female, o.ch); }
      } else if (o.state === "walk") { o.state = "out"; o.path = null; o.ch.setAnim("wave"); const ch = o.ch; setTimeout(() => { if (ch.anim === "wave") ch.setAnim("idle"); }, 1200); }
    });
    return true;
  }

  /** Someone leaves their seat for a spot beside the car: the curb's side (the car's right) if it is free. */
  private hopOut(r: Ride, o: Owner, i: number) {
    const col = this.host.colliders, k = i === 0 ? 0.75 : -0.75;
    let found = false;
    for (const [x, z] of [[-1.85, k], [-1.85, -k], [-2.5, k * 2], [1.85, k], [1.85, -k], [-1.85, k * 3], [0.6 + k, -3.1]]) {
      this.at(r, x, z, o.to);
      const taken = r.owners.some((q) => q !== o && q.state !== "in" && Math.hypot(q.to.x - o.to.x, q.to.z - o.to.z) < 0.9);
      if (!taken && !col.blocked(o.to.x, o.to.z, 0.3) && Math.hypot(o.to.x - this.from.x, o.to.z - this.from.z) > 0.9) { found = true; break; }
    }
    if (!found) this.at(r, -1.85, k, o.to);
    this.wake(o);
    o.from.copy(o.ch.root.position);
    o.state = "hop-out";
    o.t = -i * 0.14;
    o.ch.busy = null;
    o.ch.recline = 0;
  }

  /** The player gets out (braking first if it still rolls). False if there is nowhere to stand. */
  leave(): boolean {
    const r = this.riding;
    if (!r || this.phase !== "on") return false;
    if (Math.abs(r.m.speed) > 1.2) { this.wantOut = true; return true; }
    const spot = r.kind === "car" ? this.carExit(r) : this.boatExit(r);
    if (!spot) { this.onStuck?.(); return false; }
    this.wantOut = false;
    r.m.speed = 0; r.m.bump = 0; r.m.steer = 0;
    this.phase = "out";
    this.phaseT = 0;
    this.from.copy(this.host.player.root.position);
    this.to.copy(spot);
    const ch = this.host.player;
    ch.busy = null; ch.recline = 0; ch.steer = 0;
    ch.setAnim("idle");
    return true;
  }

  /** Where the driver steps out to: their own side first, then the other, then the ends. */
  private carExit(r: Ride): THREE.Vector3 | null {
    const col = this.host.colliders;
    for (const [x, z] of [[1.8, -0.3], [-1.8, -0.3], [1.8, 0.9], [-1.8, 0.9], [1.8, -1.4], [-1.8, -1.4], [0, -3.1], [0, 3.1]]) {
      this.at(r, x, z, _v);
      if (_v.x < WORLD.minX + 1 || _v.x > WORLD.maxX - 1 || _v.z > WORLD.maxZ - 1 || _v.z < SHORE.limit) continue;
      if (col.blocked(_v.x, _v.z, 0.42)) continue;
      if (this.list.some((o) => o !== r && o.kind === "car" && this.reach(o, _v.x, _v.z) < 0.45)) continue;
      if (this.list.some((o) => o.owners.some((q) => q.state !== "in" && Math.hypot(q.ch.root.position.x - _v.x, q.ch.root.position.z - _v.z) < 0.8))) continue;
      return _v.setY(floorY(_v.x, _v.z));
    }
    return null;
  }

  /** Out of the boat: onto a pier's boards if they are within a step, into the shallows by the beach, else over the
   *  side for a swim. */
  private boatExit(r: Ride): THREE.Vector3 {
    const m = r.m, col = this.host.colliders;
    let best: THREE.Vector3 | null = null, bd = 3.3;
    for (const d of DECKS) {
      if (d.y === undefined || d.z0 > SHORE.limit) continue;
      const x = Math.max(d.x0 + 0.7, Math.min(m.x, d.x1 - 0.7)), z = Math.max(d.z0 + 0.7, Math.min(m.z, d.z1 - 0.7));
      const dist = this.reach(r, x, z);
      if (dist < bd && !col.blocked(x, z, 0.4)) { bd = dist; best = _v.set(x, d.y, z); }
    }
    if (best) return best;
    if (m.z > SHORE.limit - 3.6) {
      const x = m.x, z = SHORE.limit + 0.4;
      if (!col.blocked(x, z, 0.4)) return _v.set(x, floorY(x, z), z);
    }
    this.at(r, 1.75, -0.4, _v);
    return _v.setY(floorY(_v.x, _v.z));
  }

  /** A door, a ride across town, a conversation started from the list: the player is on foot at once, wherever they
   *  are put next, and what they drove goes back to its place. */
  abandon() {
    const r = this.riding;
    if (!r) return;
    this.riding = null;
    this.phase = "on";
    this.wantOut = false;
    const ch = this.host.player;
    ch.busy = null; ch.recline = 0; ch.steer = 0; ch.lift = 0; ch.tuck = 0;
    ch.setAnim("idle");
    this.sendHome(r);
  }

  private sendHome(r: Ride) {
    r.m.set(r.home.x, r.home.z, r.home.rot);
    r.awayT = 0;
    r.thanked = true;
    for (const o of r.owners) { this.wake(o); o.state = "in"; o.path = null; this.seatOwner(r, o); }
    this.place(r, 0, 0);
  }

  // ------------------------------------------------------------------------------------------------ update

  /** `c`: the hands (null: nobody may drive now: a panel is open, a call has started). `t`: the town's clock. */
  update(dt: number, t: number, c: Controls | null) {
    const host = this.host, pl = host.player, pp = pl.root.position;
    this.learner.set(pp.x, pp.y + 1.5, pp.z);
    const r = this.riding;
    if (r && this.phase === "on") {
      const hands: Controls = !c || this.wantOut ? { throttle: 0, steer: 0, brake: true } : c;
      if (r.kind === "car") this.driveCar(r, dt, hands); else this.driveBoat(r, dt, hands);
      if (this.wantOut && Math.abs(r.m.speed) < 0.6) { if (!this.leave()) this.wantOut = false; }
    }
    for (let i = 0; i < this.list.length; i++) {
      const q = this.list[i];
      this.place(q, dt, t);
      this.updateOwners(q, dt);
      if (q !== r) this.rest(q, dt);
      if (q.kind === "car") { const b = this.boxes[i]; b.x = q.m.x; b.z = q.m.z; b.heading = q.m.heading; }
    }
    if (!r) return;
    this.phaseT += dt;
    if (this.phase === "in") {
      // (the people in it leave first; then the player's hop into the seat)
      const wait = r.owners.some((o) => o.state === "hop-out") ? 0.4 : 0, k = Math.min(1, Math.max(0, this.phaseT - wait) / HOP);
      const seat = r.kind === "car" ? CAR_SEATS.driver : BOAT_SEATS.helm;
      this.at(r, seat[0], seat[1], this.to, this.seatY(r));
      this.arc(pl, this.from, this.to, k, 0.75);
      pl.root.rotation.y = this.fromRot + wrap(r.m.heading - this.fromRot) * ease(k);
      if (k >= 1) {
        this.phase = "on";
        pl.lift = 0; pl.tuck = 0;
        pl.seatY = r.kind === "car" ? CAR_SEATS.seat : BOAT_SEATS.seat;
        pl.recline = r.kind === "car" ? 0.12 : 0;
        pl.busy = r.kind === "car" ? "wheel" : "tiller";
        pl.setAnim("sit");
      }
    } else if (this.phase === "on") {
      const seat = r.kind === "car" ? CAR_SEATS.driver : BOAT_SEATS.helm;
      this.at(r, seat[0], seat[1], pp, this.seatY(r));
      pl.root.rotation.set(0, r.m.heading, 0);
      pl.steer = r.m.steer;
    } else {
      const k = Math.min(1, this.phaseT / HOP);
      this.arc(pl, this.from, this.to, k, 0.7);
      if (k >= 1) {
        pl.lift = 0; pl.tuck = 0;
        this.riding = null;
        this.phase = "on";
        r.awayT = 0;
        this.onLeft?.(this.to.x, this.to.y, this.to.z, Math.atan2(this.to.x - this.from.x, this.to.z - this.from.z));
      }
    }
  }

  /** Someone on their way through the air from `a` to `b` (`k` 0–1), `up` m high at the top, the knees tucked. */
  private arc(ch: GameCharacter, a: THREE.Vector3, b: THREE.Vector3, k: number, up: number) {
    const e = ease(k);
    ch.root.position.set(a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e + Math.sin(Math.PI * k) * up, a.z + (b.z - a.z) * e);
    ch.tuck = Math.sin(Math.PI * k) * 0.8;
  }

  private driveCar(r: Ride, dt: number, c: Controls) {
    const m = r.m, host = this.host;
    // who is in the way, the way it is going: the passers-by and their dogs, the people one talks to, its own people
    const dir = m.speed < -0.15 || (m.speed < 0.15 && c.throttle < 0) ? -1 : 1, fx = m.fx * dir, fz = m.fz * dir;
    let gap = host.ambient.personAhead(m.x, m.z, fx, fz, 26, 1.5);
    for (const q of host.people()) gap = Math.min(gap, aheadIn(m.x, m.z, fx, fz, q.x, q.z, 26, 1.35));
    for (const o of this.list) for (const w of o.owners) if (w.state !== "in") gap = Math.min(gap, aheadIn(m.x, m.z, fx, fz, w.ch.root.position.x, w.ch.root.position.z, 26, 1.35));
    m.step(dt, c, gap);
    m.settle((p, rad) => {
      // on the streets; out of the town's walls, trees and parked cars; out of the other convertibles, the traffic and
      // anyone standing
      this.drivable.nearest(p.x, p.z, p);
      host.colliders.resolve(_v.set(p.x, 0, p.z), rad);
      p.x = _v.x; p.z = _v.z;
      for (const o of this.list) if (o !== r && o.kind === "car") pushOutOfBox(p, rad, o.m.x, o.m.z, o.m.heading, CAR.half, CAR.wide);
      host.ambient.pushOutOfCars(p, rad);
      for (const o of this.list) for (const w of o.owners) if (w.state !== "in") {
        const q = w.ch.root.position, dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz), min = rad + 0.35;
        if (d < min && d > 1e-4) { p.x = q.x + (dx / d) * min; p.z = q.z + (dz / d) * min; }
      }
    });
  }

  private driveBoat(r: Ride, dt: number, c: Controls) {
    const m = r.m;
    m.step(dt, c);
    m.settle((p, rad) => {
      // in the bay, off the shallows; clear of the pier, the boats at anchor and the rocks
      p.x = Math.max(BAY.x0 + 1, Math.min(p.x, BAY.x1 - 1));
      p.z = Math.max(BAY.z0 + 1, Math.min(p.z, SHORE.limit - 0.9));
      this.sea.resolve(_v.set(p.x, 0, p.z), rad);
      p.x = _v.x; p.z = _v.z;
      for (const o of this.list) if (o !== r && o.kind === "boat") pushOutOfBox(p, rad, o.m.x, o.m.z, o.m.heading, BOAT.half, BOAT.wide);
    });
    // spray at the stern while it moves
    const v = Math.abs(m.speed);
    this.sprayT -= dt * (0.4 + v / 3);
    if (v > 1.5 && this.sprayT <= 0) {
      this.sprayT = 0.16;
      this.at(r, 0, -2.3 * Math.sign(m.speed), _v);
      this.host.splash(_v.x, waterY(_v.x, _v.z, 0) ?? -0.25, _v.z, -m.fx * 0.6, -m.fz * 0.6, Math.min(1, v / BOAT.max));
    }
  }

  /** A ride as it is drawn: a car on its wheels, leaning a little into a turn and nodding when it brakes or bumps; a
   *  boat on the swell, its bow up at speed. */
  private place(r: Ride, dt: number, t: number) {
    const m = r.m, mesh = r.mesh;
    // (its shadow only where the player is near enough to see it: a car down the street is not drawn again for the sun)
    const d2 = (m.x - this.learner.x) ** 2 + (m.z - this.learner.z) ** 2;
    mesh.castShadow = d2 < 36 * 36;
    // (a parked car stays where it was put; a boat nobody is near enough to see rock is left as it lies)
    if (r !== this.riding && dt > 0 && (r.kind === "car" ? m.x === mesh.position.x && m.z === mesh.position.z && m.bump === 0 : d2 > 110 * 110)) return;
    if (r.kind === "car") {
      const lean = THREE.MathUtils.clamp(m.steer * m.speed * 0.006, -0.05, 0.05), nod = m.bump * 0.035;
      mesh.position.set(m.x, 0, m.z);
      mesh.rotation.set(nod, m.heading, lean);
    } else {
      const sur = waterY(m.x, m.z, t) ?? -0.25, k = Math.min(1, Math.abs(m.speed) / BOAT.max);
      mesh.position.set(m.x, sur - BOAT_SEATS.water + Math.sin(t * 1.3 + r.phase) * 0.04 + k * 0.08, m.z);
      mesh.rotation.set(Math.sin(t * 0.9 + r.phase) * 0.03 - k * 0.09, m.heading, Math.sin(t * 1.2 + r.phase * 1.3) * 0.045 - m.steer * k * 0.12);
    }
    void dt;
  }

  /** Someone who held their pose moves again. */
  private wake(o: Owner) {
    if (o.still) { o.still = false; holdPose(o.ch.root, false); }
    o.posed = false;
  }

  private updateOwners(r: Ride, dt: number) {
    const host = this.host, pp = host.player.root.position;
    // (in their seats far from the player they hold their pose: nothing of them is worked out)
    let awake = false;
    const cam = host.cam.position;
    for (const o of r.owners) {
      const p = o.ch.root.position;
      o.ch.setFar?.(o.state === "in" && (cam.x - p.x) ** 2 + (cam.z - p.z) ** 2 > FAR * FAR);
      const far = o.state === "in" && !!o.posed && r !== this.riding && (pp.x - p.x) ** 2 + (pp.z - p.z) ** 2 > STILL * STILL;
      if (far !== !!o.still) { if (far) { o.still = true; holdPose(o.ch.root, true); } else this.wake(o); }
      if (!o.still) awake = true;
    }
    if (!awake) return;
    r.chat?.update(dt);
    for (const o of r.owners) {
      const ch = o.ch, p = ch.root.position;
      if (o.still) continue;
      if (o.state === "in") {
        this.seatOwner(r, o);
        // (the music is theirs: a nod to it now and then)
        if ((o.nod -= dt) <= 0) { o.nod = 2.5 + Math.random() * 4; ch.react?.("nod"); }
      } else if (o.state === "hop-out" || o.state === "hop-in") {
        o.t += dt;
        const k = Math.min(1, Math.max(0, o.t) / HOP);
        if (o.state === "hop-in") this.at(r, o.seat[0], o.seat[1], o.to, this.seatY(r));
        if (o.t > 0 && ch.anim === "sit") ch.setAnim("idle");
        if (o.t > 0) this.arc(ch, o.from, o.to, k, 0.85);
        if (k >= 1) {
          ch.lift = 0; ch.tuck = 0;
          if (o.state === "hop-in") {
            o.state = "in";
            this.seatOwner(r, o);
            if (r.owners.every((q) => q.state === "in") && !r.thanked) {
              r.thanked = true;
              if (Math.hypot(pp.x - p.x, pp.z - p.z) < 14 && host.outdoors()) host.say(RIDE_BACK_LINES[Math.floor(Math.random() * RIDE_BACK_LINES.length)], o.female, ch);
            }
          } else {
            // out: a wave after the car, then they stand by and watch it go
            o.state = "out";
            p.y = 0;
            ch.setAnim("wave");
            setTimeout(() => { if (ch.anim === "wave") ch.setAnim("idle"); }, 1500);
          }
        }
      } else if (o.state === "out") {
        // standing by, turned to the car (or to whoever drives it off)
        const want = Math.atan2(r.m.x - p.x, r.m.z - p.z);
        ch.root.rotation.y += wrap(want - ch.root.rotation.y) * Math.min(1, dt * 4);
      } else if (o.state === "walk") this.walk(r, o, dt);
      ch.update(dt);
      if (o.state === "in") o.posed = true;
    }
  }

  /** Back to the car on foot: along the way planned, then to the door on their seat's side, and in. */
  private walk(r: Ride, o: Owner, dt: number) {
    const ch = o.ch, p = ch.root.position;
    const side = Math.sign(o.seat[0]) || 1;
    this.at(r, side * 1.75, o.seat[1], _v);
    if (this.host.colliders.blocked(_v.x, _v.z, 0.25)) this.at(r, -side * 1.75, o.seat[1], _v);
    const door = _p; door.x = _v.x; door.z = _v.z;
    let tx = door.x, tz = door.z;
    if (o.path && o.path.length) {
      [tx, tz] = o.path[0];
      if (Math.hypot(tx - p.x, tz - p.z) < 0.5 || Math.hypot(door.x - p.x, door.z - p.z) < 3) { o.path.shift(); return; }
    }
    const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
    // at the door, or at the car's side anywhere (the player may be standing at the door): in
    if ((d < 0.35 && !(o.path && o.path.length)) || this.reach(r, p.x, p.z) < 0.7) {
      o.state = "hop-in"; o.t = 0; o.from.copy(p); o.path = null;
      return;
    }
    const step = Math.min(d, 2.3 * dt);
    p.x += (dx / d) * step; p.z += (dz / d) * step;
    // (round a lamp post or a bench on the way; never through the player)
    this.host.colliders.resolve(p, 0.28);
    const pp = this.host.player.root.position, qx = p.x - pp.x, qz = p.z - pp.z, qd = Math.hypot(qx, qz);
    if (qd < 0.7 && qd > 1e-4 && !this.riding) { p.x = pp.x + (qx / qd) * 0.7; p.z = pp.z + (qz / qd) * 0.7; }
    ch.root.rotation.y += wrap(Math.atan2(dx, dz) - ch.root.rotation.y) * Math.min(1, dt * 8);
    ch.moveSpeed = 2.3;
    if (ch.anim !== "walk") ch.setAnim("walk");
  }

  /** A ride nobody is at the wheel of: its people come back to it after a moment, and once it has stood away from
   *  its place a while and nobody is looking, it is back there with them in it. */
  private rest(r: Ride, dt: number) {
    const away = Math.hypot(r.m.x - r.home.x, r.m.z - r.home.z) > 1 || Math.abs(wrap(r.m.heading - r.home.rot)) > 0.35;
    const out = r.owners.filter((o) => o.state !== "in");
    if (!away && !out.length) { r.awayT = 0; return; }
    r.awayT += dt;
    if (r.awayT > 3.5) for (const o of out) if (o.state === "out") {
      // they stroll back if the way is short enough to be worth it
      const p = o.ch.root.position, d = Math.hypot(r.m.x - p.x, r.m.z - p.z);
      if (d < 7) { o.path = null; o.state = "walk"; }
      else if (d < 110 && this.pathBudget <= 0) {
        this.pathBudget = 0.6;
        const path = this.host.nav.path(p.x, p.z, r.m.x, r.m.z) ?? this.pathNear(p.x, p.z, r);
        if (path && path.length < 260) { o.path = path.slice(1); o.state = "walk"; }
      }
    }
    this.pathBudget -= dt;
    const seen = (x: number, z: number) => this.host.outdoors() && this.inView(x, z);
    if (r.awayT > (this.host.outdoors() ? 24 : 3) && !seen(r.m.x, r.m.z) && (!away || !seen(r.home.x, r.home.z)) && !out.some((o) => seen(o.ch.root.position.x, o.ch.root.position.z))) this.sendHome(r);
  }
  private pathBudget = 0;

  /** A way from (x, z) to the nearest spot beside `r` that the way-finding knows (a car left in the middle of a
   *  street stands on cells it holds open; one at its own curb, on cells it holds closed). */
  private pathNear(x: number, z: number, r: Ride) {
    const nav = this.host.nav;
    for (const [u, w] of [[0, 2.4], [0, -2.4], [3.4, 0], [-3.4, 0]]) {
      this.at(r, w, u, _v);
      const c = nav.nearestFree(_v.x, _v.z);
      if (c < 0) continue;
      const [cx, cz] = nav.center(c), path = nav.path(x, z, cx, cz);
      if (path) return path;
    }
    return null;
  }

  /** Is (x, z) in the picture, or near enough that it soon may be? */
  private inView(x: number, z: number) {
    const cam = this.host.cam, d = Math.hypot(x - cam.position.x, z - cam.position.z);
    if (d < 16) return true;
    if (d > 85) return false;
    _v.set(x, 0.8, z).project(cam);
    return _v.z < 1 && Math.abs(_v.x) < 1.2 && Math.abs(_v.y) < 1.35;
  }

  // ------------------------------------------------------------------------------------------- the player on foot

  /** Keeps the player on foot out of the rides and of their people standing about (`inWater`: and, swimming, out of
   *  the rocks and the boats at anchor). */
  resolvePlayer(p: THREE.Vector3, rad: number, inWater: boolean) {
    for (const r of this.list) {
      if (r === this.riding) continue;
      if (Math.abs(r.m.x - p.x) < 5 && Math.abs(r.m.z - p.z) < 5) {
        _p.x = p.x; _p.z = p.z;
        if (pushOutOfBox(_p, rad, r.m.x, r.m.z, r.m.heading, r.m.spec.half, r.m.spec.wide)) { p.x = _p.x; p.z = _p.z; }
      }
      for (const o of r.owners) {
        if (o.state === "in") continue;
        const q = o.ch.root.position, dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz), min = rad + 0.3;
        if (d < min && d > 1e-4) { p.x = q.x + (dx / d) * min; p.z = q.z + (dz / d) * min; }
      }
    }
    if (inWater) for (const c of this.sea.circles) {
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), min = rad + c.r;
      if (d < min && d > 1e-4) { p.x = c.x + (dx / d) * min; p.z = c.z + (dz / d) * min; }
    }
  }

  /** The pier's boards within a step of a swimmer at (x, z): where they would climb out to, or null. */
  climbOut(x: number, z: number): THREE.Vector3 | null {
    for (const d of DECKS) {
      if (d.y === undefined || d.z0 > SHORE.limit) continue;
      const cx = Math.max(d.x0 + 0.75, Math.min(x, d.x1 - 0.75)), cz = Math.max(d.z0 + 0.75, Math.min(z, d.z1 - 0.75));
      const dist = Math.hypot(cx - x, cz - z);
      if (dist > 0.3 && dist < 2.1 && !this.host.colliders.blocked(cx, cz, 0.4)) return _v.set(cx, d.y, cz);
    }
    return null;
  }

  /** How loud its motor is for the sound (0–1): the revs of what the player drives. */
  get revs() {
    const r = this.riding;
    return r && this.phase === "on" ? Math.min(1, Math.abs(r.m.speed) / r.m.spec.max) : 0;
  }
}
