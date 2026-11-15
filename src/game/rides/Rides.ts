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
import { RIDE_OWNERS, RIDE_SHOUTS, type RideOwner, type RideLine } from "../../content/rides";
import { rideVoice, shoutVoice } from "../../content/voices";
import { BAY, DECKS, SEA_LEVEL, SHORE, bayHold, floorY, waterY } from "../water";
import { Drivable, Motion, CAR, BOAT, BAY_EDGE, aheadIn, aheadOnArc, bayTurn, pushOutOfBox, shoreSpeed, type Controls } from "./drive";
import { townAsphalt, townGround } from "./ground";
import { convertibleGeometry, motorboatGeometry, buoysGeometry, CAR_SEATS, BOAT_SEATS } from "./shapes";

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
  /** Someone says a line: a bubble with its meaning, their mouth moving, and their voice if it is recorded (`voice`:
   *  their own; null: a passer-by's, a woman's or a man's). */
  say(line: RideLine, voice: string | null, female: boolean, ch: GameCharacter): void;
  /** A wheel over a kerb or a speed bump (`k` 0–1: how hard). */
  thud(k: number): void;
  /** The car has pushed at something for a while and gets nowhere: a word about backing up. */
  stuck(): void;
  /** The boat lies with its bow on the shallows and is still being driven at the beach: a word about backing off. */
  aground(): void;
  /** It has stood a while behind someone who is not going anywhere: a word about going round them. */
  waiting(): void;
  /** It still gets nowhere: the picture fades for a moment while `put` sets it back on the street. */
  rescue(put: () => void): void;
  /** Drops thrown up from the water at (x, z). */
  splash(x: number, y: number, z: number, dx: number, dz: number, k: number): void;
  /** In the town and in sight (not in a room, not behind a conversation's picture). */
  outdoors(): boolean;
}

interface Owner {
  ch: GameCharacter; female: boolean;
  /** Who they are: their voice and their lines (content/rides.ts), and the line they said last. */
  who: RideOwner; said: number;
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
  /** A car's springs: how far the body is up and how its nose is tipped, and how fast both change; for each axle
   *  (front, back) whether it stands on asphalt and which side of each speed bump it is on. */
  sus: { y: number; vy: number; p: number; vp: number; road: boolean[]; side: number[][] };
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
/** The bay's three open edges for a boat (west, east, out at sea): the way out across each. */
const _edges = [{ left: 0, nx: -1, nz: 0 }, { left: 0, nx: 1, nz: 0 }, { left: 0, nx: 0, nz: -1 }];
const _lead = { gap: Infinity, speed: 0 };
const _frustum = new THREE.Frustum(), _pv = new THREE.Matrix4(), _ball = new THREE.Sphere();
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const ease = (k: number) => k * k * (3 - 2 * k);

export class Rides {
  group = new THREE.Group();
  readonly list: Ride[] = [];
  /** Where a car may be (anywhere in the town that is open and dry) and where the asphalt is (the streets, the lots). */
  readonly drivable: Drivable;
  readonly asphalt: Drivable;
  private bumps: [number, number, number, number][];
  private shoutT = 2;
  private stuckT = 0;
  private stuckTold = false;
  private yieldT = 0;
  private yieldTold = false;
  /** Getting nowhere: how long it has pushed (forwards or back) without leaving the spot `pushAt`. */
  private pushT = 0;
  private pushAt = { x: 0, z: 0 };
  private rescuing = false;
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
    this.drivable = townGround();
    this.asphalt = townAsphalt(plan.lots);
    this.bumps = plan.bumps;
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
    // the bay's edge, marked: a line of buoys out at sea and down both sides (one mesh, shown only from the water)
    const spots: [number, number][] = [];
    const nx = Math.round((BAY.x1 - BAY.x0) / 15), nz = Math.max(1, Math.round((SHORE.limit - 14 - BAY.z0) / 15));
    for (let i = 0; i <= nx; i++) spots.push([BAY.x0 + ((BAY.x1 - BAY.x0) * i) / nx, BAY.z0]);
    for (let i = 1; i <= nz; i++) for (const x of [BAY.x0, BAY.x1]) spots.push([x, BAY.z0 + ((SHORE.limit - 14 - BAY.z0) * i) / nz]);
    this.buoys = new THREE.Mesh(buoysGeometry(spots), mat);
    this.buoys.name = "bay-buoys";
    this.buoys.visible = false;
    this.buoys.matrixAutoUpdate = true;
    this.group.add(this.buoys);
    host.ambient.rideBoxes = this.boxes;
  }

  /** The buoys along the bay's edge. */
  private buoys: THREE.Mesh;

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
    const ride: Ride = { id: spot.id, kind: "car", home: { x: spot.x, z: spot.z, rot: spot.rot }, mesh, m, owners: [], chat: null, awayT: 0, thanked: true, phase: 0, sus: this.springs() };
    const cast = RIDE_OWNERS[spot.id] ?? [], n = Math.min(cast.length, this.host.quality === "low" ? 1 : spot.people), r = rand(9100 + i * 7);
    for (let k = 0; k < n; k++) {
      const who = cast[k], female = who.female, look = walkerLook(female, r);
      // sunglasses on everyone who lounges in a convertible; no hat that the wind would take
      const acc = [...(look.acc ?? []).filter((a) => a !== "glasses" && a !== "cap"), "sunglasses"] as typeof look.acc;
      const mine = { ...look, acc }, ch = createCharacter(mine);
      ch.root.traverse((o) => { o.castShadow = false; });
      ch.watch = this.learner;
      ch.noticeWithin = 5;
      this.group.add(ch.root);
      const o: Owner = { ch, female, who, said: -1, seat: k === 0 ? CAR_SEATS.driver : CAR_SEATS.passenger, arm: k === 0 ? "doorL" : "doorR", state: "in", t: 0, from: new THREE.Vector3(), to: new THREE.Vector3(), path: null, nod: 1 + r() * 4 };
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
    this.list.push({ id: spot.id, kind: "boat", home: { x: spot.x, z: spot.z, rot: spot.rot }, mesh, m, owners: [], chat: null, awayT: 0, thanked: true, phase: i * 2.1 + 0.7, sus: this.springs() });
  }

  // ---------------------------------------------------------------------------------------------- places

  private springs(): Ride["sus"] { return { y: 0, vy: 0, p: 0, vp: 0, road: [true, true], side: [[], []] }; }

  /** One of an owner's lines, in their own voice: not the one they said last. */
  private speak(o: Owner, lines: RideLine[]) {
    let i = Math.floor(Math.random() * lines.length);
    if (lines.length > 1 && i === o.said) i = (i + 1) % lines.length;
    o.said = i;
    this.host.say(lines[i], rideVoice(o.who.id, o.female), o.female, o.ch);
  }

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
    this.stuckT = 0; this.stuckTold = false; this.yieldT = 0; this.yieldTold = false; this.pushT = 0;
    this.from.copy(p);
    this.fromRot = this.host.player.root.rotation.y;
    r.awayT = 0;
    r.thanked = false;
    let said = false;
    r.chat?.hold(6);
    r.owners.forEach((o, i) => {
      if (o.state === "in") {
        this.hopOut(r, o, i);
        // (one of them has a word for it: whoever's turn it is, and never the line they said last)
        if (!said && (i === r.owners.length - 1 || Math.random() < 0.5)) { said = true; this.speak(o, o.who.take); }
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
    // what is out of the picture is left out of the scene's walk altogether (a person is some thirty parts to step
    // through each frame, seen or not): a ride and the people in it by one test against the camera's view (as it was a
    // frame ago: generously), but near the player, where its shadow may fall into the picture
    // (the buoys only for someone on the water: in the boat or swimming; from the town they are not drawn)
    this.buoys.visible = pp.z < SHORE.limit + 2 && pp.y < 0.1;
    if (this.buoys.visible) this.buoys.position.y = SEA_LEVEL + Math.sin(t * 1.1) * 0.035;
    const cam = host.cam;
    _frustum.setFromProjectionMatrix(_pv.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    for (let i = 0; i < this.list.length; i++) {
      const q = this.list[i];
      const seen = q === r || (q.m.x - pp.x) ** 2 + (q.m.z - pp.z) ** 2 < 40 * 40 || _frustum.intersectsSphere(_ball.set(_v.set(q.m.x, 1, q.m.z), 8));
      q.mesh.visible = seen;
      for (const o of q.owners) o.ch.root.visible = seen || o.state !== "in";
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
    // (on the way its wheel takes it: turning away from someone, it need not stop for them; whoever is straight ahead
    // all the same, it goes by at a careful pace)
    const curv = m.curve(dir);
    let gap = host.ambient.personAhead(m.x, m.z, fx, fz, 34, 1.5, curv), care = curv ? host.ambient.personAhead(m.x, m.z, fx, fz, 34, 1.5) : Infinity;
    for (const q of host.people()) { gap = Math.min(gap, aheadOnArc(m.x, m.z, fx, fz, curv, q.x, q.z, 34, 1.35)); care = Math.min(care, aheadIn(m.x, m.z, fx, fz, q.x, q.z, 34, 1.35)); }
    for (const o of this.list) for (const w of o.owners) if (w.state !== "in") {
      const q = w.ch.root.position;
      gap = Math.min(gap, aheadOnArc(m.x, m.z, fx, fz, curv, q.x, q.z, 34, 1.35)); care = Math.min(care, aheadIn(m.x, m.z, fx, fz, q.x, q.z, 34, 1.35));
    }
    // a car of the traffic on its way: it eases in behind it at its pace (no running into its back; steered round
    // it, the way is free), and brakes for one that comes the other way. One that stands (it waits for the
    // convertible as often as not) it noses up to and slides round: two cars never wait for each other
    const lead = host.ambient.carAhead(m.x, m.z, fx, fz, 30, CAR.wide + 0.2, curv, _lead);
    const behind = lead.gap - CAR.half - 1, moving = Math.abs(lead.speed) > 0.3;
    if (lead.gap !== Infinity) {
      const most = Math.max(moving ? 0 : 1.6, Math.max(0, lead.speed) + Math.sqrt(2 * 9 * Math.max(0, behind)));
      if (Math.abs(m.speed) > most) m.speed = Math.sign(m.speed) * Math.max(most, Math.abs(m.speed) - 20 * dt);
    }
    const queued = lead.gap !== Infinity && behind < 2.5 && lead.speed > 0.3;
    const was = m.speed;
    m.step(dt, c, gap, this.asphalt.has(m.x, m.z), care);
    m.settle((p, rad) => {
      // on the town's dry ground; out of its walls, trees, benches and parked cars; out of the other convertibles, the
      // traffic and anyone standing
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
    this.ride(r, dt);
    // going by close and fast: those on foot jump aside, and now and then one of them calls after it
    this.shoutT -= dt;
    if (Math.abs(m.speed) > 4.5) {
      const w = host.ambient.startle(m.x, m.z, m.fx * dir, m.fz * dir, Math.abs(m.speed), CAR.half, CAR.wide);
      if (w && this.shoutT <= 0) { this.shoutT = 5 + Math.random() * 4; host.say(RIDE_SHOUTS[Math.floor(Math.random() * RIDE_SHOUTS.length)], shoutVoice(w.female, w.tone ?? 0), w.female, w.ch); }
    }
    // pushing at something and getting nowhere: a word about backing up, once a ride
    // (behind a car of the traffic it is waiting, not stuck)
    const pushing = Math.abs(c.throttle) > 0.5 && Math.abs(m.speed) < 0.7 && Math.abs(was) < 0.7 && gap > CAR.half + CAR.clear + 1 && !queued;
    this.stuckT = pushing ? this.stuckT + dt : 0;
    if (this.stuckT > 1.8 && !this.stuckTold) { this.stuckTold = true; host.stuck(); }
    // held up by someone who stays where they are (on a bench, at a stall): a word about going round, once a ride
    // (or by a car of the traffic that stands in its way)
    const held = Math.abs(c.throttle) > 0.5 && !c.brake && Math.abs(m.speed) < 0.3 && (gap <= CAR.half + CAR.clear + 1 || (lead.gap !== Infinity && behind < 1.5 && !moving));
    this.yieldT = held ? this.yieldT + dt : 0;
    if (this.yieldT > 2.2 && !this.yieldTold) { this.yieldTold = true; host.waiting(); }
    // and if, backing and turning, it still has not left the spot after a good while of trying: back onto the street
    // by itself (nobody is ever left boxed in between a wall and a bench)
    if (Math.hypot(m.x - this.pushAt.x, m.z - this.pushAt.z) > 2.2) { this.pushAt.x = m.x; this.pushAt.z = m.z; this.pushT = 0; }
    else if (Math.abs(c.throttle) > 0.5 && !c.brake && gap > CAR.half + CAR.clear + 1 && !queued) this.pushT += dt;
    if (this.pushT > 7 && !this.rescuing) {
      const to = this.streetSpot(r);
      if (to) { this.rescuing = true; host.rescue(() => { r.m.set(to.x, to.z, to.rot); r.sus = this.springs(); this.pushT = 0; this.stuckT = 0; this.rescuing = false; this.place(r, 0, 0); }); }
      else this.pushT = 0;
    }
  }

  /** A free place on the asphalt near a car, along the street and on its right-hand side: where it is set down when it
   *  has got itself boxed in. */
  private streetSpot(r: Ride): { x: number; z: number; rot: number } | null {
    const col = this.host.colliders, m = r.m;
    let best: { x: number; z: number; rot: number } | null = null, bd = Infinity;
    for (const q of this.asphalt.rects) {
      const ew = q.x1 - q.x0 > q.z1 - q.z0, cx = (q.x0 + q.x1) / 2, cz = (q.z0 + q.z1) / 2;
      // (along its middle line's right-hand lane, tried every few metres either way from the nearest point)
      for (const side of [1, -1]) for (let k = 0; k < 9; k++) for (const sgn of k ? [1, -1] : [1]) {
        const lane = Math.min(2.2, (ew ? q.z1 - q.z0 : q.x1 - q.x0) / 4);
        const x = ew ? Math.max(q.x0 + 3, Math.min(m.x + sgn * k * 5, q.x1 - 3)) : cx + side * lane, z = ew ? cz + side * lane : Math.max(q.z0 + 3, Math.min(m.z + sgn * k * 5, q.z1 - 3));
        const rot = ew ? (side > 0 ? Math.PI / 2 : -Math.PI / 2) : side > 0 ? Math.PI : 0;
        const d = Math.hypot(x - m.x, z - m.z) + (side > 0 ? 0 : 0.01);
        if (d >= bd) continue;
        const fx = Math.sin(rot), fz = Math.cos(rot);
        let free = true;
        for (const o of [-1.3, 0, 1.3]) {
          const px = x + fx * o, pz = z + fz * o;
          if (col.blocked(px, pz, CAR.wide + 0.1) || this.list.some((c) => c !== r && c.kind === "car" && this.reach(c, px, pz) < CAR.wide + 0.3)) { free = false; break; }
          _p.x = px; _p.z = pz;
          const before = _p.x + _p.z;
          this.host.ambient.pushOutOfCars(_p, CAR.wide + 0.5);
          if (_p.x + _p.z !== before) { free = false; break; }
        }
        if (free) { bd = d; best = { x, z, rot }; }
      }
    }
    return best;
  }

  /** The car's springs: a wheel that comes onto the asphalt or off it (a kerb), or crosses a speed bump, kicks the
   *  body up and tips its nose (the front axle up, then the back one), with a thud; a speed bump taken fast also takes
   *  a good part of the speed, a kerb a little. */
  private ride(r: Ride, dt: number) {
    const m = r.m, s = r.sus, v = Math.abs(m.speed), fwd = m.speed >= 0 ? 1 : -1;
    for (let i = 0; i < 2; i++) {
      const off = i === 0 ? 1.34 : -1.34, x = m.x + m.fx * off, z = m.z + m.fz * off;
      let hit = 0;
      const road = this.asphalt.has(x, z);
      if (road !== s.road[i]) { s.road[i] = road; hit = 0.5; }
      for (let k = 0; k < this.bumps.length; k++) {
        const [x1, z1, x2, z2] = this.bumps[k], dx = x2 - x1, dz = z2 - z1, t = ((x - x1) * dx + (z - z1) * dz) / (dx * dx + dz * dz);
        const side = t > -0.08 && t < 1.08 ? Math.sign((x - x1) * dz - (z - z1) * dx) || 1 : 0;
        if (side && s.side[i][k] && side !== s.side[i][k]) hit = 1;
        s.side[i][k] = side;
      }
      if (!hit || v < 0.6) continue;
      // (a speed bump throws it well up and tips it; a kerb is a smaller knock)
      const k = Math.min(1, 0.3 + v / 8), lead = (i === 0) === (fwd > 0), bump = hit === 1;
      s.vy += (bump ? 3.1 : 1.5) * k;
      s.vp += (i === 0 ? -1 : 1) * (bump ? 3.6 : 1.7) * k;
      if (lead) {
        if (hit === 1 && v > 4) m.speed *= 0.7; else if (hit < 1 && v > 6) m.speed *= 0.92;
        m.hold = Math.min(m.hold, CAR.holdFrom);
      }
      this.host.thud(bump ? k : k * 0.55);
    }
    // (springs, well damped: one bounce and a half)
    s.vy += (-s.y * 190 - s.vy * 14) * dt; s.y = THREE.MathUtils.clamp(s.y + s.vy * dt, -0.07, 0.26);
    s.vp += (-s.p * 170 - s.vp * 12) * dt; s.p = THREE.MathUtils.clamp(s.p + s.vp * dt, -0.17, 0.17);
    if (Math.abs(s.y) < 1e-4 && Math.abs(s.vy) < 1e-3 && Math.abs(s.p) < 1e-4 && Math.abs(s.vp) < 1e-3) { s.y = s.vy = s.p = s.vp = 0; }
  }

  private driveBoat(r: Ride, dt: number, c: Controls) {
    const m = r.m, E = BAY_EDGE, lx0 = BAY.x0 + E.inset, lx1 = BAY.x1 - E.inset, lz0 = BAY.z0 + E.inset;
    // the bay's edge is soft for a boat as for a swimmer: making for the buoys, its bow comes round by itself to run
    // along them, and what is left of its way out fades over the last metres (no wall out at sea, no bump)
    _edges[0].left = m.x - lx0; _edges[1].left = lx1 - m.x; _edges[2].left = m.z - lz0;
    const turn = bayTurn(m, _edges);
    if (turn) m.heading += turn * dt;
    // running in to the beach it eases off as the water gets thin, and comes to rest on the shallows
    const lzs = SHORE.limit - 0.9 - (BOAT.half - BOAT.wide), land = m.fz * m.speed;
    if (land > 0) { const most = shoreSpeed(lzs - m.z - 0.4); if (land > most) m.speed *= Math.max(most / land, 1 - 9 * dt); }
    const wx = m.x, wz = m.z;
    m.step(dt, c);
    m.x = wx + bayHold(wx, bayHold(wx, m.x - wx, lx0, -1, E.fade), lx1, 1, E.fade);
    const gx = m.x - wx, gz = m.z - wz;
    m.x = wx + bayHold(wx, bayHold(wx, gx, lx0, -1, E.fade), lx1, 1, E.fade);
    m.z = wz + bayHold(wz, bayHold(wz, gz, lz0, -1, E.fade), lzs, 1, 1.2);
    // (the way it did not make comes off its speed: it noses up to the buoys, it does not churn against them)
    const went = Math.hypot(m.x - wx, m.z - wz), meant = Math.hypot(gx, gz);
    if (meant > 1e-6 && went < meant) m.speed *= 1 - (1 - went / meant) * Math.min(1, dt * 5);
    // its bow on the shallows and still driven at the beach: a word about backing off, once a ride
    const aground = c.throttle > 0.5 && Math.abs(m.speed) < 0.6 && lzs - m.z < 1.5 && m.fz > 0.2;
    this.stuckT = aground ? this.stuckT + dt : 0;
    if (this.stuckT > 2.5 && !this.stuckTold) { this.stuckTold = true; this.host.aground(); }
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
    if (r !== this.riding && dt > 0 && (r.kind === "car" ? m.x === mesh.position.x && m.z === mesh.position.z && m.bump === 0 && r.sus.y === 0 && r.sus.vy === 0 : d2 > 110 * 110)) return;
    if (r.kind === "car") {
      // (left standing, its springs settle)
      if (r !== this.riding && dt > 0) this.ride(r, dt);
      const lean = THREE.MathUtils.clamp(m.steer * m.speed * 0.006, -0.06, 0.06), nod = m.bump * 0.035;
      mesh.position.set(m.x, r.sus.y, m.z);
      mesh.rotation.set(nod + r.sus.p, m.heading, lean);
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
              if (Math.hypot(pp.x - p.x, pp.z - p.z) < 14 && host.outdoors()) this.speak(o, o.who.back);
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
