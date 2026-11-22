// What one can drive in the town: convertibles parked at the curb with their owners lounging in them, and a small
// boat at the pier (world/rides.ts says which and where). Walk up and take one: the owners hop out with a laugh and a
// word and stand by; drive off; get out anywhere and the car stays there; after a while its owners stroll back to it,
// and once nobody is looking it is back at its curb with them in it. Nobody is ever pulled out, pushed or run over:
// people step out of a car's way, and it stops by itself short of anyone ahead (drive.ts).
import { clearIslandCoast, islandGroundY, jettyStop, type IslandPlan } from "../world/island";
import * as THREE from "three";
import { createCharacter, addFarVersion, type GameCharacter } from "../characters";
import { STYLED, vertexColorMaterial } from "../style";
import { Chatter, walkerLook, type Ambient } from "../ambient";
import { Colliders, colourMerge, rand } from "../world/util";
import { WORLD } from "../world/layout";
import { carLedges, carModelEntry, type CarModelName, type CarPlacement } from "../world/carModels";
import { TOE, type Piece } from "../ledges";
import type { NavGrid } from "../nav";
import type { RidesPlan, CarSpot, BoatSpot } from "../world/rides";
import { countPlay } from "../../state/playStats";
import { RIDE_OWNERS, RIDE_SHOUTS, type RideOwner, type RideLine } from "../../content/rides";
import { rideVoice, shoutVoice } from "../../content/voices";
import { BAY, DECKS, SEA_LEVEL, SHORE, bayHold, floorY, waterY } from "../water";
import { Drivable, Motion, CAR, BOAT, BAY_EDGE, CAR_REACH, aheadIn, aheadOnArc, bayTurn, pushOutOfBox, shoreSpeed, type Controls } from "./drive";
import { townAsphalt, townGround } from "./ground";
import { convertibleGeometry, motorboatGeometry, buoysGeometry, CAR_SEATS, BOAT_SEATS } from "./shapes";
import { Skids } from "./skids";

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
  /** Whether the current mode can show driving hints. */
  allowsHints?(): boolean;
  /** The car has pushed at something for a while and gets nowhere: a word about backing up. */
  stuck(): void;
  /** The boat lies with its bow on the shallows and is still being driven at the beach: a word about backing off. */
  aground(): void;
  /** It has stood a while behind someone who is not going anywhere: a word about going round them. */
  waiting(): void;
  /** Wedged, it has been set free: it glides to a clear place beside it (a word about it, once). */
  freed(): void;
  /** It still gets nowhere: the picture fades for a moment while `put` sets it back on the street. */
  rescue(put: () => void): void;
  /** Drops thrown up from the water at (x, z). */
  splash(x: number, y: number, z: number, dx: number, dz: number, k: number): void;
  /** A sheet of spray thrown out sideways along (dx, dz). */
  fan(x: number, y: number, z: number, dx: number, dz: number, k: number): void;
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
  model?: CarModelName;
  parked?: () => void;
  home: { x: number; z: number; rot: number };
  mesh: THREE.Object3D;
  m: Motion;
  owners: Owner[];
  chat: Chatter | null;
  /** How long it has stood away from its place with nobody at the wheel (s). */
  awayT: number;
  thanked: boolean;
  /** The boat's rocking. */
  phase: number;
  /** Its colour on the map (the body's paint, the hull's stripe). */
  tint: string;
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
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _p = { x: 0, z: 0 };
/** The bay's three open edges for a boat (west, east, out at sea): the way out across each. */
const _edges = [{ left: 0, nx: -1, nz: 0 }, { left: 0, nx: 1, nz: 0 }, { left: 0, nx: 0, nz: -1 }];
/** How far in to the beach a boat floats (z of its hull's round ends): the shallows a few steps off the dry sand,
 *  where one wades up to it and climbs in, and where it is run in to land. */
export const SHALLOWS = SHORE.edge + 1.2;
const _mark = new THREE.Matrix4();
const _lead = { gap: Infinity, speed: 0 };
const _frustum = new THREE.Frustum(), _pv = new THREE.Matrix4(), _ball = new THREE.Sphere();
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const ease = (k: number) => k * k * (3 - 2 * k);

const carModels = new Map([["convertible", convertibleGeometry]]);
type CarBox = Ambient["rideBoxes"][number];

function parkedKeyGeometry() {
  const gold = "#ffda72";
  return colourMerge([
    [new THREE.CircleGeometry(0.39, 24), "#24515a"],
    [new THREE.TorusGeometry(0.366, 0.017, 5, 24).translate(0, 0, 0.016), "#fff1c8"],
    [new THREE.TorusGeometry(0.091, 0.033, 6, 14).translate(-0.126, -0.088, 0.032), gold],
    [new THREE.BoxGeometry(0.32, 0.055, 0.03).rotateZ(0.59).translate(0.074, 0.040, 0.032), gold],
    [new THREE.BoxGeometry(0.061, 0.115, 0.03).rotateZ(0.59).translate(0.184, 0.046, 0.032), gold],
    [new THREE.BoxGeometry(0.052, 0.09, 0.03).rotateZ(0.59).translate(0.088, -0.004, 0.032), gold],
  ]);
}

export class Rides {
  group = new THREE.Group();
  readonly list: Ride[] = [];
  private readonly modeCars = new Map<Ride, CarBox & { surfaces: Piece[] }>();
  private readonly parkingKeys: THREE.InstancedMesh;
  private readonly vehicleMaterial = STYLED ? vertexColorMaterial("prop") : new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  /** Where a car may be (anywhere in the town that is open and dry) and where the asphalt is (the streets, the lots). */
  readonly drivable: Drivable;
  readonly asphalt: Drivable;
  private bumps: [number, number, number, number][];
  private shoutT = 2;
  private onStreet = (x: number, z: number) => this.asphalt.has(x, z);
  private stuckT = 0;
  private stuckTold = false;
  private yieldT = 0;
  private yieldTold = false;
  /** Getting nowhere: how long it has pushed (forwards or back) without leaving the spot `pushAt`. */
  private pushT = 0;
  private pushAt = { x: 0, z: 0, h: 0 };
  /** Set free by itself: gliding from where it was wedged to a clear place a few steps off (`t` 0–1). */
  private glide: { x0: number; z0: number; h0: number; x1: number; z1: number; h1: number; t: number } | null = null;
  /** The marks its back wheels leave in a slide. */
  readonly skids = new Skids();
  /** A boat: the way it has come (for crossing its own wake), the metres to the next wave it slaps over, the fan of
   *  spray at its side in a slide. */
  private trail: { x: number; z: number; t: number; used: boolean }[] = [];
  private wakeD = 0;
  private waveD = 6;
  private fanT = 0;
  private now = 0;
  /** The body's lean into a bend and its squat under power, eased. */
  private roll = 0;
  private squat = 0;
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

  constructor(readonly host: RideHost, private readonly plan: RidesPlan & { island?: IslandPlan }, boats: THREE.Object3D[]) {
    this.group.name = "rides";
    this.drivable = townGround();
    this.asphalt = townAsphalt(plan.lots);
    this.bumps = plan.bumps;
    const mat = this.vehicleMaterial;
    plan.cars.forEach((spot, i) => this.addCar(spot, i));
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
    // a mark over each boat one can take, seen from the beach and the boards: a small gem that turns and bobs (one
    // mesh for all of them; shown to someone on foot or swimming within sight of a boat)
    const boatsN = this.list.filter((r) => r.kind === "boat").length;
    this.marks = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.3).scale(1, 1.5, 1), new THREE.MeshBasicMaterial({ color: "#ffd23f" }), Math.max(1, boatsN));
    this.marks.name = "boat-marks";
    this.marks.count = 0;
    this.marks.frustumCulled = false;
    this.group.add(this.marks);
    this.parkingKeys = new THREE.InstancedMesh(parkedKeyGeometry(), new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), 24);
    this.parkingKeys.name = "parked-car-keys";
    this.parkingKeys.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.parkingKeys.visible = false;
    this.parkingKeys.count = 0;
    this.parkingKeys.frustumCulled = false;
    this.parkingKeys.renderOrder = 4;
    this.group.add(this.parkingKeys);
    this.group.add(this.skids.mesh);
    host.ambient.rideBoxes = [...this.boxes];
  }

  /** For the round map: what one can take and where it is (the one being driven is the player's own arrow). */
  marksForMap() {
    return this.list.map((r) => ({ kind: r.kind, x: r.m.x, z: r.m.z, heading: r.m.heading, tint: r.tint, taken: r === this.riding }));
  }

  /** The marks over the boats. */
  private marks: THREE.InstancedMesh;
  /** The buoys along the bay's edge. */
  private buoys: THREE.Mesh;

  /** The cars' ground plans as they stand now (the passers-by step round them, the traffic stops behind them). */
  readonly boxes: CarBox[] = [];

  /** Mode cars use the same physics and remain world obstacles, outside the public list of town rides. */
  createModeCar(spot: CarPlacement & { id: string; speedLimit?: number }, root: THREE.Group, parked?: () => void): Ride {
    const { width, length } = carModelEntry(spot.model).collisionBox;
    const car = this.makeCar({ ...spot, paint: spot.color }, parked ? "parked-car-" : "mode-car-", root, { half: length / 2, wide: width / 2 }, !parked);
    car.model = spot.model;
    car.parked = parked;
    const box = { ...this.carBox(car), modeCar: true, surfaces: carLedges(spot.model, spot.x, spot.z, spot.rot) };
    this.modeCars.set(car, box);
    this.host.ambient.rideBoxes.push(box);
    this.place(car, 0, 0);
    return car;
  }

  removeModeCar(car: Ride) {
    const box = this.modeCars.get(car);
    if (!box) return;
    this.modeCars.delete(car);
    const traffic = this.host.ambient.rideBoxes;
    const index = traffic.indexOf(box);
    if (index >= 0) traffic.splice(index, 1);
    car.mesh.removeFromParent();
  }

  modeCarPieces(x: number, z: number): Piece[] {
    const pieces: Piece[] = [];
    for (const [car, box] of this.modeCars) {
      if (car !== this.riding && Math.abs(car.m.x - x) < 5 && Math.abs(car.m.z - z) < 5) pieces.push(...box.surfaces);
    }
    return pieces;
  }

  freeParkingAt(car: Ride, x: number, z: number) {
    return !this.host.colliders.blocked(x, z, car.m.spec.wide + 0.25) && !this.otherCarNear(car, x, z, car.m.spec.half + 0.3);
  }

  private carBox({ m }: Ride): CarBox {
    return { x: m.x, z: m.z, heading: m.heading, hl: m.spec.half, hw: m.spec.wide };
  }

  private makeCar(spot: Omit<CarSpot, "people">, prefix: string, root?: THREE.Group, size = { half: CAR.half, wide: CAR.wide }, blockNav = true): Ride {
    const geometry = carModels.get(spot.model ?? "convertible") ?? convertibleGeometry;
    const mesh = root ?? new THREE.Mesh(geometry(spot.paint, spot.inside), this.vehicleMaterial);
    mesh.castShadow = true;
    mesh.rotation.order = "YXZ";
    mesh.name = prefix + spot.id;
    this.group.add(mesh);
    const spec = spot.speedLimit ? { ...CAR, ...size, max: spot.speedLimit, town: spot.speedLimit, back: spot.speedLimit } : { ...CAR, ...size };
    const m = new Motion(spec, "car");
    m.set(spot.x, spot.z, spot.rot);
    // Passers-by plan their walks around the parked car.
    const nav = this.host.nav;
    if (blockNav) for (let u = -spec.half; u <= spec.half + 1e-6; u += nav.cell * 0.5) for (let w = -spec.wide; w <= spec.wide + 1e-6; w += nav.cell * 0.5) {
      const c = nav.idx(spot.x + u * Math.sin(spot.rot) + w * Math.cos(spot.rot), spot.z + u * Math.cos(spot.rot) - w * Math.sin(spot.rot));
      if (c >= 0) nav.blocked[c] = 1;
    }
    return { id: spot.id, kind: "car", home: { x: spot.x, z: spot.z, rot: spot.rot }, mesh, m, owners: [], chat: null, awayT: 0, thanked: true, phase: 0, sus: this.springs(), tint: spot.paint };
  }

  private addCar(spot: CarSpot, i: number) {
    const ride = this.makeCar(spot, "ride-car-");
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
    this.boxes.push(this.carBox(ride));
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
    this.list.push({ id: spot.id, kind: "boat", home: { x: spot.x, z: spot.z, rot: spot.rot }, mesh, m, owners: [], chat: null, awayT: 0, thanked: true, phase: i * 2.1 + 0.7, sus: this.springs(), tint: spot.stripe });
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

  private *solidVehicles() {
    yield* this.list;
    yield* this.modeCars.keys();
  }

  private otherCarNear(ride: Ride, x: number, z: number, distance: number) {
    for (const car of this.solidVehicles()) {
      if (car !== ride && car.kind === "car" && this.reach(car, x, z) < distance) return true;
    }
    return false;
  }

  find(id: string): Ride | undefined {
    return this.list.find((ride) => ride.id === id)
      ?? [...this.modeCars.keys()].find((ride) => !!ride.parked && ride.id === id);
  }

  /** The ride near enough to get into from (x, z), if any: a car from the street, a boat from the pier's boards or
   *  the water beside it. */
  near(x: number, z: number): Ride | null {
    if (this.riding) return null;
    let best: Ride | null = null, bd = Infinity;
    for (const r of this.solidVehicles()) {
      if (this.modeCars.has(r) && !r.parked) continue;
      // (not while its people are on their way out of it or back into it)
      if (r.owners.some((o) => o.state === "hop-out" || o.state === "hop-in")) continue;
      const d = this.reach(r, x, z);
      if (d < (r.kind === "car" ? CAR_REACH : BOAT.reach) && d < bd) { bd = d; best = r; }
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
    r.parked?.();
    if (!this.modeCars.has(r) || r.parked) countPlay("rides", r.kind);
    this.phase = "in";
    this.phaseT = 0;
    this.wantOut = false;
    this.stuckT = 0; this.stuckTold = false; this.yieldT = 0; this.yieldTold = false; this.pushT = 0;
    this.from.copy(p);
    this.fromRot = this.host.player.root.rotation.y;
    r.awayT = 0;
    this.islandMoorings.delete(r.id);
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
    const dock = r.kind === "boat" ? this.atIslandJetty(r) : null;
    const spot = dock ? _v.set(dock.x, dock.y, dock.z) : r.kind === "car" ? this.carExit(r) : this.boatExit(r);
    if (dock) this.islandMoorings.add(r.id);
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
  carExit(r: Ride): THREE.Vector3 | null {
    const col = this.host.colliders;
    for (const [x, z] of [[1.8, -0.3], [-1.8, -0.3], [1.8, 0.9], [-1.8, 0.9], [1.8, -1.4], [-1.8, -1.4], [0, -3.1], [0, 3.1]]) {
      this.at(r, x, z, _v);
      if (_v.x < WORLD.minX + 1 || _v.x > WORLD.maxX - 1 || _v.z > WORLD.maxZ - 1 || _v.z < SHORE.limit) continue;
      if (col.blocked(_v.x, _v.z, 0.42)) continue;
      if (this.otherCarNear(r, _v.x, _v.z, 0.45)) continue;
      if (this.list.some((o) => o.owners.some((q) => q.state !== "in" && Math.hypot(q.ch.root.position.x - _v.x, q.ch.root.position.z - _v.z) < 0.8))) continue;
      return _v.setY(floorY(_v.x, _v.z));
    }
    return null;
  }

  /** Something solid at (x, z) for someone `r` across standing in the shallows (the town's ground plan without the
   *  sea itself, which stops the passers-by and not a wader). */
  private solid(x: number, z: number, r: number) {
    const col = this.host.colliders;
    for (const b of col.boxes) if (b.tag !== "sea" && x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r) return true;
    for (const c of col.circles) { const dx = x - c.x, dz = z - c.z; if (dx * dx + dz * dz < (r + c.r) ** 2) return true; }
    return false;
  }

  /** Out of the boat: onto a pier's boards if they are within a step, into the shallows by the beach, else over the
   *  side for a swim. */
  private boatExit(r: Ride): THREE.Vector3 {
    const m = r.m, col = this.host.colliders;
    let best: THREE.Vector3 | null = null, bd = 3.3;
    for (const d of DECKS) {
      if (d === this.plan.island?.jetty || d.y === undefined || d.z0 > SHORE.limit) continue;
      const x = Math.max(d.x0 + 0.7, Math.min(m.x, d.x1 - 0.7)), z = Math.max(d.z0 + 0.7, Math.min(m.z, d.z1 - 0.7));
      const dist = this.reach(r, x, z);
      if (dist < bd && !col.blocked(x, z, 0.4)) { bd = dist; best = _v.set(x, d.y, z); }
    }
    if (best) return best;
    // in the shallows: over the side nearest the beach, onto one's feet in the water (or onto the sand, run right in)
    let land: THREE.Vector3 | null = null, lz = -Infinity;
    for (const [x, z] of [[1.75, -0.4], [-1.75, -0.4], [1.75, 0.9], [-1.75, 0.9], [0, -3.2], [0, 3.2]]) {
      this.at(r, x, z, _w);
      if (_w.z < SHORE.limit + 0.3 || _w.z <= lz || this.solid(_w.x, _w.z, 0.4) || this.list.some((o) => o !== r && this.reach(o, _w.x, _w.z) < 0.5)) continue;
      lz = _w.z; land = _v.set(_w.x, floorY(_w.x, _w.z), _w.z);
    }
    if (land) return land;
    if (m.z > SHORE.limit - 3.6) {
      const x = m.x, z = SHORE.limit + 0.4;
      if (!this.solid(x, z, 0.4)) return _v.set(x, floorY(x, z), z);
    }
    this.at(r, 1.75, -0.4, _v);
    const island = this.plan.island;
    if (island) clearIslandCoast(island, _v, 0.45);
    return _v.setY(floorY(_v.x, _v.z));
  }

  private islandMoorings = new Set<string>();

  private atIslandJetty(r: Ride) {
    const d = this.plan.island?.jetty;
    if (!d) return null;
    const stop = jettyStop(d, r.m.x, r.m.z, (x, z) => this.reach(r, x, z));
    return stop && !this.host.colliders.blocked(stop.x, stop.z, 0.4, true) ? stop : null;
  }

  islandBoat() {
    const boat = this.list.find((r) => this.islandMoorings.has(r.id));
    return boat && { id: boat.id, x: boat.m.x, z: boat.m.z, rot: boat.m.heading };
  }

  restoreIslandBoat(saved?: NonNullable<ReturnType<Rides["islandBoat"]>>) {
    const island = this.plan.island;
    if (!island) return;
    const boat = this.list.find((r) => r.kind === "boat" && r.id === saved?.id)
      ?? this.list.find((r) => r.kind === "boat");
    if (!boat) return;
    this.resetPosition(boat, saved ?? island.berth);
    if (!this.atIslandJetty(boat)) this.resetPosition(boat, island.berth);
    this.islandMoorings.add(boat.id);
  }

  /** A dry boarding point for the nearest boat that can be reached on foot. */
  boatApproach(x: number, z: number) {
    const nav = this.host.nav;
    let best: { x: number; z: number; id: string } | null = null, d = Infinity;
    for (const r of this.list) {
      if (r.kind !== "boat" || this.islandMoorings.has(r.id)) continue;
      const boatDist = Math.hypot(r.m.x - x, r.m.z - z);
      if (boatDist >= d) continue;
      let step: { x: number; z: number; id: string } | null = null, near = Infinity;
      for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) {
        const i = nav.idx(r.m.x + dx, r.m.z + dz);
        if (!nav.free(i)) continue;
        const [cx, cz] = nav.center(i);
        const island = this.plan.island;
        if (island && islandGroundY(island, cx, cz) !== undefined) continue;
        if (this.reach(r, cx, cz) >= BOAT.reach) continue;
        const dist = Math.hypot(cx - x, cz - z);
        if (dist < near) { step = { x: cx, z: cz, id: r.id }; near = dist; }
      }
      if (step) { best = step; d = boatDist; }
    }
    return best;
  }

  /** A door, a ride across town, a conversation started from the list: the player is on foot at once, wherever they
   *  are put next, and what they drove goes back to its place. */
  abandon(keep = false) {
    const r = this.riding;
    if (!r) return;
    this.glide = null;
    this.riding = null;
    this.phase = "on";
    this.wantOut = false;
    const ch = this.host.player;
    ch.busy = null; ch.recline = 0; ch.steer = 0; ch.lift = 0; ch.tuck = 0;
    ch.setAnim("idle");
    if (keep || r.parked) this.resetPosition(r, { x: r.m.x, z: r.m.z, rot: r.m.heading });
    else this.sendHome(r);
  }

  resetPosition(r: Ride, { x, z, rot }: Ride["home"]) {
    if (r === this.riding) {
      this.glide = null;
      this.pushAt = { x, z, h: rot };
      this.pushT = this.stuckT = this.yieldT = 0;
    }
    r.m.set(x, z, rot);
    r.sus = this.springs();
    this.place(r, 0, 0);
    const mode = this.modeCars.get(r);
    const box = this.boxes[this.list.indexOf(r)];
    if (mode) this.syncModeBox(mode, r);
    else if (box && r.kind === "car") this.syncBox(box, r);
  }

  private syncBox(box: CarBox, { m }: Ride) {
    box.x = m.x;
    box.z = m.z;
    box.heading = m.heading;
  }

  private syncModeBox(box: CarBox & { surfaces: Piece[] }, r: Ride) {
    if (r.model && (r.m.x !== box.x || r.m.z !== box.z || r.m.heading !== box.heading)) {
      box.surfaces = carLedges(r.model, r.m.x, r.m.z, r.m.heading);
    }
    this.syncBox(box, r);
  }

  private sendHome(r: Ride) {
    this.islandMoorings.delete(r.id);
    r.m.set(r.home.x, r.home.z, r.home.rot);
    r.awayT = 0;
    r.thanked = true;
    for (const o of r.owners) { this.wake(o); o.state = "in"; o.path = null; this.seatOwner(r, o); }
    this.place(r, 0, 0);
    const box = this.modeCars.get(r);
    if (box) this.syncModeBox(box, r);
  }

  // ------------------------------------------------------------------------------------------------ update

  get waitingForTraffic() { return this.riding !== null && !this.glide && this.yieldT > 2.2; }

  /** `c`: the hands (null: nobody may drive now: a panel is open, a call has started). `t`: the town's clock. */
  update(dt: number, t: number, c: Controls | null) {
    const host = this.host, pl = host.player, pp = pl.root.position;
    this.learner.set(pp.x, pp.y + 1.5, pp.z);
    const r = this.riding;
    this.now = t;
    this.skids.update(dt);
    if (r && this.phase === "on") {
      const hands: Controls = !c || this.wantOut ? { throttle: 0, steer: 0, brake: true } : c;
      if (r.kind === "car") this.driveCar(r, dt, hands); else this.driveBoat(r, dt, hands);
      if (this.wantOut && r.m.pace < 0.6) { if (!this.leave()) this.wantOut = false; }
    }
    // what is out of the picture is left out of the scene's walk altogether (a person is some thirty parts to step
    // through each frame, seen or not): a ride and the people in it by one test against the camera's view (as it was a
    // frame ago: generously), but near the player, where its shadow may fall into the picture
    // the boats' marks: for someone not at a wheel, within 60 m of a boat that lies free
    {
      let n = 0;
      if (!r && host.outdoors()) for (const q of this.list) {
        if (q.kind !== "boat" || (q.m.x - pp.x) ** 2 + (q.m.z - pp.z) ** 2 > 60 * 60) continue;
        _mark.makeRotationY(t * 1.6 + q.phase).setPosition(q.m.x, 2.55 + Math.sin(t * 2.2 + q.phase) * 0.13, q.m.z);
        this.marks.setMatrixAt(n++, _mark);
      }
      if (n || this.marks.count) { this.marks.count = n; this.marks.instanceMatrix.needsUpdate = true; }
      this.marks.visible = n > 0;
    }
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
      if (q.kind === "car") this.syncBox(this.boxes[i], q);
    }
    for (const [car, box] of this.modeCars) {
      this.place(car, dt, t);
      this.syncModeBox(box, car);
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

  updateParkingKeys(time: number, visible: boolean) {
    const mesh = this.parkingKeys;
    const { cam, player } = this.host;
    const { x, z } = player.root.position;
    let count = 0;
    if (visible && !this.riding) {
      for (const car of this.modeCars.keys()) {
        const m = car.m;
        if (!car.parked || !car.model || (m.x - x) ** 2 + (m.z - z) ** 2 > 15 ** 2) continue;
        const y = car.mesh.position.y + carModelEntry(car.model).collisionBox.height + 0.52 + Math.sin(time * 3) * 0.07;
        const scale = THREE.MathUtils.clamp(cam.position.distanceTo(_v.set(m.x, y, m.z)) / 12, 0.58, 1.35);
        _mark.makeRotationFromQuaternion(cam.quaternion).scale(_w.setScalar(scale)).setPosition(m.x, y, m.z);
        mesh.setMatrixAt(count++, _mark);
      }
    }
    mesh.visible = count > 0;
    mesh.count = count;
    if (count) mesh.instanceMatrix.needsUpdate = true;
  }

  disposeParkingKeys() {
    this.parkingKeys.geometry.dispose();
    (this.parkingKeys.material as THREE.Material).dispose();
    this.parkingKeys.dispose();
  }

  private driveCar(r: Ride, dt: number, c: Controls) {
    const m = r.m, host = this.host;
    // (being set free: it glides to the clear place found for it, the hands off)
    if (this.glide) {
      const g = this.glide, k = (g.t = Math.min(1, g.t + dt / 0.5)), e = k * k * (3 - 2 * k);
      m.x = g.x0 + (g.x1 - g.x0) * e; m.z = g.z0 + (g.z1 - g.z0) * e;
      m.heading = g.h0 + Math.atan2(Math.sin(g.h1 - g.h0), Math.cos(g.h1 - g.h0)) * e;
      m.speed = 0; m.slip = 0; m.steer = 0;
      if (k >= 1) { this.glide = null; this.pushT = 0; this.stuckT = 0; this.pushAt.x = m.x; this.pushAt.z = m.z; this.pushAt.h = m.heading; }
      this.ride(r, dt);
      return;
    }
    // who is in the way, the way it is going: the passers-by and their dogs, the people one talks to, its own people
    const dir = m.speed < -0.15 || (m.speed < 0.15 && c.throttle < 0) ? -1 : 1, pace = m.pace, slide = pace > 1.5 && Math.abs(m.slip) > 1.2;
    // (in a slide the way it is going is not the way it points: the strip is laid along its course, and as wide as
    // the car lies across it)
    const fx = slide ? m.vx / pace : m.fx * dir, fz = slide ? m.vz / pace : m.fz * dir;
    const wide = slide ? Math.min(1.25, (Math.abs(m.slip) / pace) * 1.4) : 0;
    // (on the way its wheel takes it: turning away from someone, it need not stop for them; whoever is straight ahead
    // all the same, it goes by at a careful pace)
    const curv = slide ? 0 : m.curve(dir);
    let gap = host.ambient.personAhead(m.x, m.z, fx, fz, 34, 1.5 + wide, curv), care = curv ? host.ambient.personAhead(m.x, m.z, fx, fz, 34, 1.5) : Infinity;
    for (const q of host.people()) { gap = Math.min(gap, aheadOnArc(m.x, m.z, fx, fz, curv, q.x, q.z, 34, 1.35 + wide)); care = Math.min(care, aheadIn(m.x, m.z, fx, fz, q.x, q.z, 34, 1.35)); }
    for (const o of this.list) for (const w of o.owners) if (w.state !== "in") {
      const q = w.ch.root.position;
      gap = Math.min(gap, aheadOnArc(m.x, m.z, fx, fz, curv, q.x, q.z, 34, 1.35 + wide)); care = Math.min(care, aheadIn(m.x, m.z, fx, fz, q.x, q.z, 34, 1.35));
    }
    // a car of the traffic on its way: it eases in behind it at its pace (no running into its back; steered round
    // it, the way is free), brakes for one that comes the other way, and waits behind one that stands. With the wheel
    // turned it noses up to a standing one and slides round it (that car waits for the convertible as often as not:
    // two cars never wait for each other)
    const lead = host.ambient.carAhead(m.x, m.z, fx, fz, 30, m.spec.wide + 0.2 + wide, curv, _lead);
    const behind = lead.gap - m.spec.half - 1, moving = Math.abs(lead.speed) > 0.3, round = !moving && Math.abs(m.steer) > 0.3;
    if (lead.gap !== Infinity) {
      const most = Math.max(round ? 1.6 : 0, Math.max(0, lead.speed) + Math.sqrt(2 * 9 * Math.max(0, behind)));
      m.limit(most, 20, dt);
    }
    // (following one that moves, or waiting behind one that stands: not stuck)
    const queued = lead.gap !== Infinity && ((behind < 2.5 && lead.speed > 0.3) || (behind < 1.5 && !moving && !round));
    const was = m.speed, x0 = m.x, z0 = m.z, h0 = m.heading, near0 = this.peopleGap(m.spec, m.x, m.z, m.heading);
    m.step(dt, c, gap, this.asphalt.has(m.x, m.z), care);
    m.settle((p, rad) => {
      // on the town's dry ground; out of its walls, trees, benches and parked cars; out of the other convertibles, the
      // traffic and anyone standing
      this.drivable.nearest(p.x, p.z, p);
      host.colliders.resolve(_v.set(p.x, 0, p.z), rad);
      p.x = _v.x; p.z = _v.z;
      for (const o of this.solidVehicles()) if (o !== r && o.kind === "car") pushOutOfBox(p, rad, o.m.x, o.m.z, o.m.heading, o.m.spec.half, o.m.spec.wide);
      host.ambient.pushOutOfCars(p, rad);
      for (const o of this.list) for (const w of o.owners) if (w.state !== "in") {
        const q = w.ch.root.position, dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz), min = rad + 0.35;
        if (d < min && d > 1e-4) { p.x = q.x + (dx / d) * min; p.z = q.z + (dz / d) * min; }
      }
    });
    // nobody is ever touched, however it moves (coming round on the spot, sliding broadside, backing up): a move that
    // would bring its body within a hand's breadth of someone, and nearer than it was, is not made
    if (near0 < 3) {
      const near = this.peopleGap(m.spec, m.x, m.z, m.heading);
      if (near < 0.4 && near < near0 - 1e-4) { m.x = x0; m.z = z0; m.heading = h0; m.speed = 0; m.slip = 0; m.drift = false; }
    }
    this.ride(r, dt);
    // going by close and fast: those on foot jump aside, and now and then one of them calls after it
    this.shoutT -= dt;
    if (!this.modeCars.has(r) && m.pace > 4.5) {
      const w = host.ambient.startle(m.x, m.z, fx, fz, m.pace, m.spec.half, m.spec.wide + wide, this.onStreet);
      // (one voice at a time and not often: a quarter of a minute at least between two calls, and whoever has called
      // does not again for minutes)
      if (w && this.shoutT <= 0) { this.shoutT = 14 + Math.random() * 8; host.ambient.called(w); host.say(RIDE_SHOUTS[Math.floor(Math.random() * RIDE_SHOUTS.length)], shoutVoice(w.female, w.tone ?? 0), w.female, w.ch); }
    }
    // pushing at something and getting nowhere: a word about backing up, once a ride
    // (behind a car of the traffic it is waiting, not stuck)
    // (nor while it is coming round on the spot: that is the way out of a tight place)
    const turning = Math.abs(Math.atan2(Math.sin(m.heading - this.pushAt.h), Math.cos(m.heading - this.pushAt.h))) > 0.5;
    const pushing = Math.abs(c.throttle) > 0.5 && m.pace < 0.7 && Math.abs(was) < 0.7 && Math.abs(m.yaw) < 0.25 && gap > m.spec.half + CAR.clear + 1 && !queued;
    const hints = host.allowsHints?.() ?? true;
    this.stuckT = hints && pushing ? this.stuckT + dt : 0;
    if (this.stuckT > 1.8 && !this.stuckTold) { this.stuckTold = true; host.stuck(); }
    // held up by someone who stays where they are (on a bench, at a stall): a word about going round, once a ride
    // (or by a car of the traffic that stands in its way)
    const held = Math.abs(c.throttle) > 0.5 && !c.brake && Math.abs(m.speed) < 0.3 && (gap <= m.spec.half + CAR.clear + 1 || (lead.gap !== Infinity && behind < 1.5 && !moving));
    this.yieldT = hints && held ? this.yieldT + dt : 0;
    if (this.waitingForTraffic && !this.yieldTold) { this.yieldTold = true; host.waiting(); }
    // and if, backing and turning, it still has not left the spot after a good while of trying: back onto the street
    // by itself (nobody is ever left boxed in between a wall and a bench)
    if (Math.hypot(m.x - this.pushAt.x, m.z - this.pushAt.z) > 2.2 || turning) { this.pushAt.x = m.x; this.pushAt.z = m.z; this.pushAt.h = m.heading; this.pushT = 0; }
    else if (Math.abs(c.throttle) > 0.5 && !c.brake && gap > m.spec.half + CAR.clear + 1 && !queued) this.pushT += dt;
    // truly wedged: after a moment it is set free gently, gliding to the nearest clear place with room to drive off
    // (nothing fades, nothing jumps); and if there is none in reach, onto the street as before
    if (this.pushT > 2.4 && !this.rescuing) {
      const to = this.clearSpot(r);
      if (to) { this.glide = { x0: m.x, z0: m.z, h0: m.heading, x1: to.x, z1: to.z, h1: to.rot, t: 0 }; this.pushT = 0; m.speed = 0; m.slip = 0; host.freed(); }
      else if (this.pushT > 4.5) {
        const st = this.streetSpot(r);
        if (st) { this.rescuing = true; host.rescue(() => { r.m.set(st.x, st.z, st.rot); r.sus = this.springs(); this.pushT = 0; this.stuckT = 0; this.rescuing = false; this.place(r, 0, 0); }); }
        else this.pushT = 0;
      }
    }
    // the marks its back wheels leave: sliding, or braked hard, on the asphalt
    {
      const k = m.pace > 3 && m.sliding ? Math.min(1, 0.35 + Math.abs(m.slip) / 6) : c.brake && !m.drift && m.pace > 7 ? 0.7 : 0;
      for (let i = 0; i < 2; i++) {
        this.at(r, i ? 0.8 : -0.8, -1.34, _w);
        this.skids.mark(i, _w.x, _w.z, 0, k && this.asphalt.has(_w.x, _w.z) ? k : 0);
      }
    }
  }

  /** How near anyone on foot is to a car's body at (x, z) facing `rot` (m): the passers-by and their dogs, the people
   *  one talks to, the owners standing about. */
  private peopleGap({ half, wide }: Motion["spec"], x: number, z: number, rot: number) {
    let gap = this.host.ambient.gapToBox(x, z, rot, half, wide);
    const s = Math.sin(rot), c = Math.cos(rot);
    const at = (px: number, pz: number) => {
      const dx = px - x, dz = pz - z, u = Math.abs(dx * s + dz * c) - half, w = Math.abs(dx * c - dz * s) - wide;
      gap = Math.min(gap, Math.hypot(Math.max(0, u), Math.max(0, w)));
    };
    for (const q of this.host.people()) at(q.x, q.z);
    for (const o of this.list) for (const w of o.owners) if (w.state !== "in") at(w.ch.root.position.x, w.ch.root.position.z);
    return gap;
  }

  /** A whole car at (x, z) facing `rot` stands clear of walls, things, other cars and the traffic, with `more` m to spare. */
  private fits(r: Ride, x: number, z: number, rot: number, more: number) {
    const m = r.m, col = this.host.colliders, fx = Math.sin(rot), fz = Math.cos(rot);
    if (this.peopleGap(m.spec, x, z, rot) < 0.9 + more) return false;
    const end = 1.3 * m.spec.half / CAR.half;
    for (const offset of [-end, 0, end]) {
      const px = x + fx * offset, pz = z + fz * offset;
      if (!this.drivable.has(px, pz) || col.blocked(px, pz, m.spec.wide + more) || this.otherCarNear(r, px, pz, m.spec.wide + more + 0.2)) return false;
      _p.x = px; _p.z = pz;
      const before = _p.x + _p.z;
      this.host.ambient.pushOutOfCars(_p, m.spec.wide + more + 0.3);
      if (_p.x + _p.z !== before) return false;
    }
    return true;
  }

  /** A clear place within a few steps of a wedged car, with room ahead of it to drive off: the nearest, and turned as
   *  little as may be (as it stands, backed out, or round to the open side). */
  private clearSpot(r: Ride): { x: number; z: number; rot: number } | null {
    const m = r.m;
    let best: { x: number; z: number; rot: number } | null = null, bs = Infinity;
    for (const d of [1.4, 2.4, 3.4, 4.4]) for (let a = 0; a < 12; a++) {
      const x = m.x + Math.sin((a * Math.PI) / 6) * d, z = m.z + Math.cos((a * Math.PI) / 6) * d;
      for (let h = 0; h < 8; h++) {
        const rot = m.heading + (h * Math.PI) / 4, turn = Math.min(h, 8 - h) * (Math.PI / 4), score = d + turn * 1.1;
        if (score >= bs || !this.fits(r, x, z, rot, 0.25)) continue;
        // (room to drive off: two car lengths ahead are clear too)
        const fx = Math.sin(rot), fz = Math.cos(rot);
        if (!this.fits(r, x + fx * 3, z + fz * 3, rot, 0.15) || !this.fits(r, x + fx * 6, z + fz * 6, rot, 0.1)) continue;
        // (and nobody stands in the way there: the glide itself passes no closer to anyone than half a metre)
        let clear = true;
        const dh = Math.atan2(Math.sin(rot - m.heading), Math.cos(rot - m.heading));
        for (let k = 1; k < 6 && clear; k++) { const e = k / 6; if (this.peopleGap(m.spec, m.x + (x - m.x) * e, m.z + (z - m.z) * e, m.heading + dh * e) < 0.5) clear = false; }
        if (!clear) continue;
        bs = score; best = { x, z, rot };
      }
    }
    return best;
  }

  /** A free place on the asphalt near a car, along the street and on its right-hand side: where it is set down when it
   *  has got itself boxed in. */
  private streetSpot(r: Ride): { x: number; z: number; rot: number } | null {
    const col = this.host.colliders, m = r.m;
    const end = 1.3 * m.spec.half / CAR.half;
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
        for (const offset of [-end, 0, end]) {
          const px = x + fx * offset, pz = z + fz * offset;
          if (col.blocked(px, pz, m.spec.wide + 0.1) || this.otherCarNear(r, px, pz, m.spec.wide + 0.3)) { free = false; break; }
          _p.x = px; _p.z = pz;
          const before = _p.x + _p.z;
          this.host.ambient.pushOutOfCars(_p, m.spec.wide + 0.5);
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
    const m = r.m, s = r.sus, v = m.pace, fwd = m.speed >= 0 ? 1 : -1;
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
        if (hit === 1 && v > 4) { m.speed *= 0.7; m.slip *= 0.7; } else if (hit < 1 && v > 6) { m.speed *= 0.92; m.slip *= 0.92; }
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
    const lzs = SHALLOWS - (BOAT.half - BOAT.wide), land = m.vz;
    if (land > 0) { const most = shoreSpeed(lzs - m.z - 0.4); if (land > most) { const k = Math.max(most / land, 1 - 9 * dt); m.speed *= k; m.slip *= k; } }
    const wx = m.x, wz = m.z;
    m.step(dt, c);
    m.x = wx + bayHold(wx, bayHold(wx, m.x - wx, lx0, -1, E.fade), lx1, 1, E.fade);
    const gx = m.x - wx, gz = m.z - wz;
    m.x = wx + bayHold(wx, bayHold(wx, gx, lx0, -1, E.fade), lx1, 1, E.fade);
    m.z = wz + bayHold(wz, bayHold(wz, gz, lz0, -1, E.fade), lzs, 1, 1.2);
    // (the way it did not make comes off its speed: it noses up to the buoys, it does not churn against them)
    const went = Math.hypot(m.x - wx, m.z - wz), meant = Math.hypot(gx, gz);
    if (meant > 1e-6 && went < meant) { const k = 1 - (1 - went / meant) * Math.min(1, dt * 5); m.speed *= k; m.slip *= k; }
    // its bow on the shallows and still driven at the beach: a word about backing off, once a ride
    const aground = c.throttle > 0.5 && Math.abs(m.speed) < 0.6 && lzs - m.z < 1.5 && m.fz > 0.2;
    this.stuckT = aground ? this.stuckT + dt : 0;
    if (this.stuckT > 2.5 && !this.stuckTold) { this.stuckTold = true; this.host.aground(); }
    m.settle((p, rad) => {
      // in the bay, off the shallows; clear of the pier, the boats at anchor and the rocks
      p.x = Math.max(BAY.x0 + 1, Math.min(p.x, BAY.x1 - 1));
      p.z = Math.max(BAY.z0 + 1, Math.min(p.z, SHALLOWS));
      this.sea.resolve(_v.set(p.x, 0, p.z), rad);
      p.x = _v.x; p.z = _v.z;
      if (this.plan.island) clearIslandCoast(this.plan.island, p, rad);
      for (const o of this.list) if (o !== r && o.kind === "boat") pushOutOfBox(p, rad, o.m.x, o.m.z, o.m.heading, BOAT.half, BOAT.wide);
    });
    // spray at the stern while it moves
    const v = m.pace, sea = (x: number, z: number) => waterY(x, z, 0) ?? -0.25;
    this.sprayT -= dt * (0.4 + v / 3);
    if (v > 1.5 && this.sprayT <= 0) {
      this.sprayT = 0.16;
      this.at(r, 0, -2.3 * Math.sign(m.speed || 1), _v);
      this.host.splash(_v.x, sea(_v.x, _v.z), _v.z, -m.fx * 0.6, -m.fz * 0.6, Math.min(1, v / BOAT.max));
    }
    // in a slide: a fan of spray thrown up along the side it slides towards
    this.fanT -= dt;
    if (Math.abs(m.slip) > 1.6 && this.fanT <= 0) {
      this.fanT = 0.045;
      const side = Math.sign(m.slip), k = Math.min(1, Math.abs(m.slip) / 5);
      // (to its left is (fz, −fx); the car's own +X is that way too)
      this.at(r, side * 0.95, -1.6 + Math.random() * 3.2, _v);
      this.host.fan(_v.x, sea(_v.x, _v.z), _v.z, m.fz * side, -m.fx * side, 0.4 + 0.6 * k);
    }
    // waves: at speed it slaps over one every few metres; and over its own wake where it crosses the way it came
    const s = r.sus, k = Math.min(1, v / BOAT.max);
    let toss = 0;
    if (v > 5.5) { this.waveD -= v * dt; if (this.waveD <= 0) { this.waveD = 4.5 + Math.random() * 5; toss = 0.5 + 0.5 * Math.random(); } }
    this.wakeD -= v * dt;
    if (v > 3.5 && this.wakeD <= 0) { this.wakeD = 3; this.trail.push({ x: m.x, z: m.z, t: this.now, used: false }); if (this.trail.length > 48) this.trail.shift(); }
    if (v > 4.5) {
      const bx = m.x + m.fx * 1.6, bz = m.z + m.fz * 1.6;
      for (const w of this.trail) {
        const age = this.now - w.t;
        if (w.used || age < 1.3 || age > 13 || (w.x - bx) ** 2 + (w.z - bz) ** 2 > 4) continue;
        w.used = true; toss = Math.max(toss, 1.25);
      }
    }
    if (toss) {
      s.vy = Math.min(3.5, s.vy + 3 * toss * (0.4 + 0.6 * k)); s.vp -= 1.6 * toss * (0.4 + 0.6 * k);
      this.at(r, 0, 2.2, _v);
      this.host.splash(_v.x, sea(_v.x, _v.z), _v.z, m.fx * 0.4, m.fz * 0.4, Math.min(1, 0.5 * toss + 0.3));
      if (toss > 1) this.host.thud(0.35);
    }
    // (thrown up, it falls back and slaps down: no spring under a hull, the water catches it)
    const wasUp = s.y > 0.02;
    s.vy -= 9.5 * dt; s.y += s.vy * dt;
    if (s.y <= 0) {
      // (it slaps down: spray out to both sides of the bow)
      if (wasUp && s.vy < -1.1) { for (const side of [-1, 1]) { this.at(r, side * 0.7, 1.3, _v); this.host.fan(_v.x, sea(_v.x, _v.z), _v.z, m.fz * side, -m.fx * side, Math.min(1, -s.vy / 3.2)); } this.host.thud(Math.min(0.5, -s.vy / 6)); }
      s.y = 0; s.vy = Math.max(0, s.vy);
    }
    s.vp += (-s.p * 46 - s.vp * 7.5) * dt; s.p = THREE.MathUtils.clamp(s.p + s.vp * dt, -0.24, 0.16);
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
      // the body leans out of a bend (more in a slide) and squats under power, dips its nose when braked
      const driven = r === this.riding, e = Math.min(1, dt * 9);
      const lean = driven ? THREE.MathUtils.clamp(m.yaw * m.pace * 0.0085, -0.13, 0.13) : 0, sq = driven ? THREE.MathUtils.clamp(-m.surge * 0.0038, -0.05, 0.06) : 0;
      if (driven) { this.roll += (lean - this.roll) * e; this.squat += (sq - this.squat) * e; }
      mesh.position.set(m.x, r.sus.y, m.z);
      mesh.rotation.set(m.bump * 0.035 + r.sus.p + (driven ? this.squat : 0), m.heading, driven ? this.roll : 0);
    } else {
      const sur = waterY(m.x, m.z, t) ?? -0.25, k = Math.min(1, m.pace / BOAT.max), driven = r === this.riding;
      // (it heels into a turn, hard over in a slide; over a wave or its own wake it is thrown up and slaps down)
      const heel = driven ? THREE.MathUtils.clamp(m.steer * k * 0.12 + m.yaw * m.pace * 0.012, -0.34, 0.34) : 0;
      if (driven) this.roll += (heel - this.roll) * Math.min(1, dt * 7);
      mesh.position.set(m.x, sur - BOAT_SEATS.water + Math.sin(t * 1.3 + r.phase) * 0.04 + k * 0.08 + r.sus.y, m.z);
      mesh.rotation.set(Math.sin(t * 0.9 + r.phase) * 0.03 - k * 0.09 + r.sus.p, m.heading, Math.sin(t * 1.2 + r.phase * 1.3) * 0.045 - (driven ? this.roll : 0));
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
    const island = this.plan.island;
    const p = this.host.player.root.position;
    if (island && this.islandMoorings.has(r.id) && this.host.outdoors() && islandGroundY(island, p.x, p.z) !== undefined) return;
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
  resolvePlayer(p: THREE.Vector3, rad: number, inWater: boolean, feet = p.y) {
    for (const r of this.solidVehicles()) {
      if (r === this.riding) continue;
      const surfaces = this.modeCars.get(r)?.surfaces;
      if (surfaces && feet + TOE >= surfaces[0].top) continue; // Ledges handles the higher tiers.
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
    const island = this.plan.island;
    if (island && feet < island.y - 0.3) {
      const d = island.jetty;
      clearIslandCoast(island, p, rad);
      pushOutOfBox(p, rad, (d.x0 + d.x1) / 2, (d.z0 + d.z1) / 2, 0, (d.z1 - d.z0) / 2, (d.x1 - d.x0) / 2);
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
      if (dist > 0.3 && dist < 2.1 && !this.host.colliders.blocked(cx, cz, 0.4, d === this.plan.island?.jetty)) return _v.set(cx, d.y, cz);
    }
    return null;
  }

  /** How loud its motor is for the sound (0–1): the revs of what the player drives. */
  get revs() {
    const r = this.riding;
    return r && this.phase === "on" ? Math.min(1.25, (r.m.pace + (r.m.drift ? 3 : 0)) / r.m.spec.max) : 0;
  }
}
