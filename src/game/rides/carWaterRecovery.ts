import { Vector3, type Group } from "three";
import type { Ambient } from "../ambient";
import { BAY, floorY, POOLS, poolAt, sandY, SEA_LEVEL, SHORE, waterY } from "../water";
import { TRAFFIC_LANES } from "../world/layout";
import type { CarWaterPlan } from "../world/rides";
import type { Colliders } from "../world/util";
import { CAR_WATER, createCarWaterProbe, probeCarWater, wetDriveSettings } from "./carWater";
import { CAR_REACH, type Controls, type WetDriveSettings } from "./drive";
import { CarWaterEffects, coughBeat, drainMotor, drainPitch, sputterMiss, type CarWaterEffectsHost } from "./carWaterEffects";
import { townCarWaterGround, type townGround } from "./ground";
import type { Ride } from "./Rides";

type Point = { x: number; z: number };
type Pose = Point & { heading: number };
type Shape = Pose & { half: number; wide: number };
type Side = -1 | 1;
type Door = -2 | Side | 2; // side doors, then the two ends
type Foot = Point & { y: number; rot: number; swim: number };
type Pair = { pose: Pose; foot: Foot; door: Side; valid: boolean };
type WalkerBox = Ambient["rideBoxes"][number];
type Reason = "depth" | "exit" | "wet-limit" | "invalid" | "driver-lost" | "suspended";
type Phase = "idle" | "acquiring" | "driving" | "float" | "tow" | "fade" | "settle";

const { footRadius, footOffset, sputter } = CAR_WATER;
const WET_LIMIT = 3500, RETURN_LIMIT = 3500, REARM = 250;
const FLOAT = 0.50, TOW_END = 2.35, DRAIN = 0.65, FADE = 0.18, TOW_SPEED = 8;
const STEP = 0.12, PADDING = 0.07;
const DOORS: readonly Door[] = [1, -1, 2, -2];
const RESTART_STEPS = [0, 0.55, -0.55, 1.15, -1.15, 1.75, -1.75];
const emptyPose = (): Pose => ({ x: 0, z: 0, heading: 0 });
const emptyFoot = (): Foot => ({ x: 0, z: 0, y: 0, rot: 0, swim: 0 });
const emptyPair = (): Pair => ({ pose: emptyPose(), foot: emptyFoot(), door: 1, valid: false });
const copyPose = (out: Pose, { x, z, heading }: Pose) => { out.x = x; out.z = z; out.heading = heading; };
const angle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const finite = (p: Pose) => Number.isFinite(p.x) && Number.isFinite(p.z) && Number.isFinite(p.heading);
const mixPose = (out: Pose, a: Pose, b: Pose, k: number) => {
  out.x = a.x + (b.x - a.x) * k;
  out.z = a.z + (b.z - a.z) * k;
  out.heading = a.heading + angle(b.heading - a.heading) * k;
};
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);

function reach(p: Pose, half: number, wide: number, x: number, z: number) {
  const s = Math.sin(p.heading), c = Math.cos(p.heading), dx = x - p.x, dz = z - p.z;
  return Math.hypot(Math.max(0, Math.abs(dx * s + dz * c) - half), Math.max(0, Math.abs(dx * c - dz * s) - wide));
}

function overlaps(a: Shape, x: number, z: number, half: number, wide: number, heading: number) {
  const dx = x - a.x, dz = z - a.z;
  if (Math.abs(dx) > a.half + a.wide + half + wide || Math.abs(dz) > a.half + a.wide + half + wide) return false;
  const s = Math.sin(a.heading), c = Math.cos(a.heading), t = Math.sin(heading), u = Math.cos(heading);
  const along = Math.abs(s * t + c * u), across = Math.abs(s * u - c * t);
  return Math.abs(dx * s + dz * c) < a.half + half * along + wide * across
    && Math.abs(dx * c - dz * s) < a.wide + half * across + wide * along
    && Math.abs(dx * t + dz * u) < half + a.half * along + a.wide * across
    && Math.abs(dx * u - dz * t) < wide + a.half * across + a.wide * along;
}

type PeopleClear = (clear: (x: number, z: number, radius: number) => boolean, reserved: boolean) => boolean;
export interface CarWaterScene {
  colliders: Colliders;
  dry: ReturnType<typeof townGround>;
  ambient: Pick<Ambient, "carWaterTrafficClear" | "carWaterPeopleClear">;
  rides: readonly Ride[];
  parked: Iterable<Ride>;
  fixedHulls: readonly { x: number; z: number; r: number }[];
  peopleClear: PeopleClear;
}

export class CarWaterClearance {
  private readonly shape: Shape = { ...emptyPose(), half: 0, wide: 0 };
  private readonly home = emptyPose();
  private circle = false;
  private readonly personClear = (x: number, z: number, radius: number) => !this.hitsCircle(x, z, radius);
  private readonly trafficClear = (x: number, z: number, half: number, wide: number) => !this.hitsBox(x, z, half + 0.12, wide + 0.12, Math.PI / 2);
  constructor(private readonly scene: CarWaterScene) {}

  private hitsBox(x: number, z: number, half: number, wide: number, heading: number) {
    const a = this.shape;
    if (!this.circle) return overlaps(a, x, z, half, wide, heading);
    const s = Math.sin(heading), c = Math.cos(heading), dx = a.x - x, dz = a.z - z;
    return Math.hypot(Math.max(0, Math.abs(dx * s + dz * c) - half), Math.max(0, Math.abs(dx * c - dz * s) - wide)) < a.wide;
  }

  private hitsCircle(x: number, z: number, r: number) {
    const a = this.shape;
    return this.circle ? Math.hypot(x - a.x, z - a.z) < r + a.wide : reach(a, a.half, a.wide, x, z) < r;
  }

  private clear(r: Ride, reserve: boolean, dry: boolean, restarting = false) {
    const { colliders, ambient, rides, parked, fixedHulls, peopleClear } = this.scene;
    for (const b of colliders.boxes) {
      if ((dry || b.tag !== "sea") && this.hitsBox((b.minX + b.maxX) * 0.5, (b.minZ + b.maxZ) * 0.5,
        (b.maxZ - b.minZ) * 0.5, (b.maxX - b.minX) * 0.5, 0)) return false;
    }
    for (const c of colliders.circles) if (this.hitsCircle(c.x, c.z, c.r)) return false;
    for (const c of fixedHulls) if (this.hitsCircle(c.x, c.z, c.r)) return false;
    if (!this.ridesClear(r, rides, reserve, restarting) || !this.ridesClear(r, parked, reserve, restarting)) return false;
    if (!restarting && !ambient.carWaterTrafficClear(this.trafficClear)) return false;
    if (reserve) for (const lane of TRAFFIC_LANES) {
      if (this.hitsBox((lane.from + lane.to) / 2, lane.z, Math.abs(lane.to - lane.from) / 2 + 3, 1.7, Math.PI / 2)) return false;
    }
    return ambient.carWaterPeopleClear(this.personClear, reserve) && peopleClear(this.personClear, reserve);
  }

  private ridesClear(r: Ride, rides: Iterable<Ride>, reserve: boolean, restarting: boolean) {
    for (const q of rides) {
      const { m, home } = q;
      if (q !== r) {
        if (restarting) {
          if (this.hitsBox(home.x, home.z, m.spec.half + 0.06, m.spec.wide + 0.06, home.rot)) return false;
        } else if (this.hitsBox(m.x, m.z, m.spec.half + 0.06, m.spec.wide + 0.06, m.heading)) return false;
      }
      if (reserve && q.kind === "car" && (this.hitsBox(home.x, home.z, m.spec.half + 0.85, m.spec.wide + 1.4, home.rot)
        || (q !== r && q.owners.length > 0 && this.hitsBox(m.x, m.z, m.spec.half + 0.85, m.spec.wide + 1.4, m.heading)))) return false;
      if (!restarting && q !== r) for (const o of q.owners) {
        if (o.state !== "in" && this.hitsCircle(o.ch.root.position.x, o.ch.root.position.z, 0.45)) return false;
        if (reserve && o.state === "hop-out" && this.hitsCircle(o.to.x, o.to.z, 0.75)) return false;
      }
    }
    if (!restarting && rides === this.scene.rides) for (const o of r.owners) {
      if (o.state !== "in" && this.hitsCircle(o.ch.root.position.x, o.ch.root.position.z, 0.45)) return false;
      if (reserve && o.state === "hop-out" && this.hitsCircle(o.to.x, o.to.z, 0.75)) return false;
    }
    return true;
  }

  hulls(r: Ride, p: Pose) {
    copyPose(this.shape, p);
    this.shape.half = r.m.spec.half; this.shape.wide = r.m.spec.wide; this.circle = false;
    for (const q of this.scene.rides) {
      const m = q.m;
      if (q.kind === "boat" && this.hitsBox(m.x, m.z, m.spec.half, m.spec.wide, m.heading)) return false;
    }
    for (const c of this.scene.fixedHulls) if (this.hitsCircle(c.x, c.z, c.r)) return false;
    return true;
  }

  car(r: Ride, p: Pose, margin = 0, dry = false) {
    const a = this.shape;
    copyPose(a, p);
    a.half = r.m.spec.half + margin; a.wide = r.m.spec.wide + margin;
    this.circle = false;
    return this.clear(r, false, dry);
  }

  foot(r: Ride, x: number, z: number, margin = 0, dry = false) {
    const a = this.shape;
    a.x = x; a.z = z; a.wide = footRadius + margin;
    this.circle = true;
    return this.clear(r, false, dry);
  }

  private dryPoint(x: number, z: number) {
    if (z < SHORE.limit || !this.scene.dry.has(x, Math.max(z, SHORE.top + 1.45))) return false;
    if (waterY(x, z, 0) === null) return true;
    const pool = poolAt(x, z);
    const crest = pool?.y ?? SEA_LEVEL + 0.265;
    // Boards over the bay still support driving. Their underlying sand must also be dry for a mainland landing.
    return floorY(x, z) > crest && (pool !== null || sandY(x, z) > crest);
  }

  private dryPerson(p: Point) {
    if (!this.dryPoint(p.x, p.z)) return false;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      if (!this.dryPoint(p.x + Math.cos(a) * footRadius, p.z + Math.sin(a) * footRadius)) return false;
    }
    return true;
  }

  pair(r: Ride, p: Pose, side: Side, out: Pair, reserve = false) {
    const { half, wide } = r.m.spec, s = Math.sin(p.heading), c = Math.cos(p.heading);
    if (!this.scene.dry.has(p.x, p.z) || !this.car(r, p, PADDING, true)) return false;
    // Sample the whole outline and interior, including centre, axle ends, and corners.
    const across = Math.ceil(wide / 0.35), along = Math.ceil(half / 0.35);
    for (let i = -across; i <= across; i++) for (let j = -along; j <= along; j++) {
      const u = i * wide / across, v = j * half / along;
      if (!this.dryPoint(p.x + u * c + v * s, p.z - u * s + v * c)) return false;
    }
    const f = out.foot;
    for (let i = 0; i <= 5; i++) {
      const d = side * (wide + footOffset * i / 5);
      const x = p.x + c * d, z = p.z - s * d;
      if (!this.foot(r, x, z, PADDING, true)) return false;
      f.x = x; f.z = z;
      if (!this.dryPerson(f)) return false;
    }
    const d = reach(p, half, wide, f.x, f.z);
    if (d < 0.35 || d > Math.min(1.45, CAR_REACH)) return false;
    if (reserve) {
      const a = this.shape;
      a.x = p.x + side * c * 0.68; a.z = p.z - side * s * 0.68; a.heading = p.heading;
      a.half = half + 0.15; a.wide = wide + 0.95; this.circle = false;
      if (!this.clear(r, true, true)) return false;
    }
    copyPose(out.pose, p);
    f.y = floorY(f.x, f.z); f.rot = p.heading + side * Math.PI / 2; f.swim = 0;
    out.door = side;
    out.valid = true;
    return true;
  }
  /** The town rebuilds its normal fleet on reload. Find a clear step to its actual restart car. */
  restartFoot(r: Ride, out: Foot) {
    const p = this.home, { half, wide } = r.m.spec;
    p.x = r.home.x; p.z = r.home.z; p.heading = r.home.rot;
    if (!this.scene.dry.has(p.x, p.z) || !this.dryPoint(p.x, p.z)) return false;
    const s = Math.sin(p.heading), c = Math.cos(p.heading), span = footOffset;
    for (const door of DOORS) {
      const side = Math.abs(door) === 1, sign = Math.sign(door), length = side ? half : wide;
      for (const along of RESTART_STEPS) {
        if (Math.abs(along) > length - 0.1) continue;
        let clear = true;
        for (let i = 0; i <= 5; i++) {
          const edge = sign * ((side ? wide : half) + span * i / 5);
          const u = side ? edge : along, v = side ? along : edge;
          out.x = p.x + u * c + v * s; out.z = p.z - u * s + v * c;
          this.shape.x = out.x; this.shape.z = out.z; this.shape.wide = footRadius + PADDING; this.circle = true;
          if (!this.dryPerson(out) || !this.clear(r, false, true, true)) { clear = false; break; }
        }
        if (!clear || !this.nearestHome(r, out, this.scene.rides) || !this.nearestHome(r, out, this.scene.parked)) continue;
        out.y = floorY(out.x, out.z); out.rot = angle(p.heading + (side ? sign * Math.PI / 2 : sign < 0 ? Math.PI : 0)); out.swim = 0;
        if (Math.abs(out.y - floorY(p.x, p.z)) <= 0.32) return true;
      }
    }
    return false;
  }

  private nearestHome(r: Ride, f: Point, rides: Iterable<Ride>) {
    for (const q of rides) {
      if (q === r) continue;
      const { home, m } = q, dx = f.x - home.x, dz = f.z - home.z;
      if (Math.abs(dx) > m.spec.half + footOffset || Math.abs(dz) > m.spec.half + footOffset) continue;
      const s = Math.sin(home.rot), c = Math.cos(home.rot);
      const d = Math.hypot(Math.max(0, Math.abs(dx * s + dz * c) - m.spec.half), Math.max(0, Math.abs(dx * c - dz * s) - m.spec.wide));
      if (d < footOffset + 0.06) return false;
    }
    return true;
  }

}

export interface CarWaterHost extends CarWaterEffectsHost {
  eligible(r: Ride): boolean;
  driver(r: Ride): boolean;
  clearance: CarWaterClearance;
  effectRoot?: Group;
  reserve(boxes: readonly WalkerBox[]): void;
  arrest(r: Ride): void;
  place(r: Ride, handback: boolean, snap: boolean, time: number): void;
  detach(r: Ride, foot: Readonly<Foot>): void;
  foot(foot: Readonly<Foot>, snap: boolean): void;
  fade(covered: boolean): void;
  clearFade?(): void;
  save?(): void;
}

type Trail = Pose & { pair: Pair };
const spareBox = (): WalkerBox => ({ x: 0, z: 0, heading: 0, hl: 0, hw: 0 });
const NO_BOXES: readonly WalkerBox[] = [];

export class CarWaterRecovery {
  readonly ground;
  readonly probe = createCarWaterProbe();
  private readonly contact = new Vector3();
  private readonly history: Trail[] = Array.from({ length: 32 }, () => ({ ...emptyPose(), pair: emptyPair() }));
  private readonly route = Array.from({ length: 33 }, emptyPose);
  private readonly lengths = new Float64Array(this.route.length);
  private readonly spares = [emptyPair(), emptyPair()];
  private readonly boxes = [spareBox(), spareBox()];
  private readonly candidate = emptyPair();
  private readonly landing = emptyPair();
  private readonly restart = emptyPair();
  private readonly lastDry = emptyPair();
  private readonly search = emptyPose();
  private readonly trial = emptyPose();
  private readonly sweepPose = emptyPose();
  private readonly foot = emptyFoot();
  private readonly testFoot = emptyFoot();
  private readonly exitFrom = emptyFoot();
  private readonly turnFrom = emptyPose();
  private readonly placedFoot = emptyFoot();
  private readonly driveSettings: WetDriveSettings = { forward: 0, reverse: 0, steerGain: 0, decel: CAR_WATER.decel };
  private readonly effects: CarWaterEffects;
  private car: Ride | null = null;
  private suspendedCar: Ride | null = null;
  private episode = 0;
  private firstWet = Infinity;
  private drySince = Infinity;
  private started = Infinity;
  private deadline = Infinity;
  private recheckAt = 0;
  private scan = 0;
  private head = 0;
  private count = 0;
  private routeCount = 0;
  private routeAt = 0;
  private routeDistance = 0;
  private progressed = 0;
  private age = 0;
  private fadeAt = Infinity;
  private landedAt = Infinity;
  private exitAt = Infinity;
  private startY = 0;
  private startPitch = 0;
  private footDoor: Door = 1;
  private exitWanted = false;
  private assisted = false;
  private usedFallback = false;
  private blockedRoute = false;
  private covering = false;
  private enabled = false;
  private disposed = false;
  private time = 0;
  private lastFrame = -Infinity;
  private frameDt = 0;
  private reason: Reason | null = null;
  private lastLanding: "trail" | "spare" | null = null;
  private bodyAt = 0;
  private inlandTurn = 0;
  private readonly clock: () => number;

  constructor(private readonly plan: CarWaterPlan, private readonly host: CarWaterHost, clock = () => performance.now()) {
    this.clock = clock;
    this.ground = townCarWaterGround(plan);
    this.effects = new CarWaterEffects(host, host.effectRoot);
  }

  begin(r: Ride) {
    if (this.disposed || this.car === r || !this.host.eligible(r) || !this.host.driver(r)) return;
    this.transfer();
    this.car = r;
    this.episode++;
    this.count = this.head = this.scan = 0;
    this.lastFrame = this.clock();
    this.lastDry.valid = this.restart.valid = false;
    this.usedFallback = false; this.lastLanding = null; this.reason = null;
    this.probe.band = "dry";
    this.acquire(r, 12);
    this.homePair(r);
  }

  owns(r: Ride | null) { return r !== null && this.car === r && (this.wet || this.returning); }
  private get admitted() { return this.enabled && (this.spares[0].valid || this.spares[1].valid); }
  open(r: Ride | null) { return r !== null && this.admitted && this.car === r && this.host.eligible(r) && this.host.driver(r); }
  hullsClear(r: Ride, pose: Pose) { return this.host.clearance.hulls(r, pose); }
  usesChassis(r: Ride) {
    return this.owns(r) || this.open(r) && (this.probe.centre.floor !== 0 || this.probe.pitch !== 0);
  }
  get wet() { return this.firstWet < Infinity; }
  get returning() { return this.started < Infinity; }
  get assistedOnFoot() { return this.assisted; }
  get suppressInput() { return this.returning; }

  private homePair(r: Ride) {
    this.restart.valid = this.host.clearance.restartFoot(r, this.restart.foot);
  }

  safeSave() {
    const r = this.car;
    if (!r || (!this.wet && !this.returning)) return undefined;
    if (!this.restart.valid) this.homePair(r);
    return this.restart.valid ? this.restart.foot : this.available(r)?.foot;
  }

  private setSpare(r: Ride, index: number) {
    const { pose: p, door } = this.candidate, dst = this.spares[index];
    copyPose(dst.pose, p);
    Object.assign(dst.foot, this.candidate.foot);
    dst.door = door; dst.valid = true;
    const b = this.boxes[index], c = Math.cos(p.heading), s = Math.sin(p.heading);
    b.x = p.x + door * c * 0.68; b.z = p.z - door * s * 0.68; b.heading = p.heading;
    b.hl = r.m.spec.half + 0.2; b.hw = r.m.spec.wide + 0.98;
    if (this.spares[0].valid && this.spares[1].valid) {
      this.host.reserve(this.boxes);
      this.enabled = true;
    } else this.host.reserve([b]);
  }

  private acquire(r: Ride, budget: number) {
    const { landings, mainland } = this.plan;
    const x0 = mainland.x0 + 5, z0 = SHORE.top + 6, cols = Math.floor((mainland.x1 - 5 - x0) / 4) + 1;
    const rows = Math.floor((mainland.z1 - 5 - z0) / 4) + 1;
    const limit = landings.length + 2 * cols * rows;
    for (let i = 0; i < budget && this.scan < limit; i++) {
      const slot = !this.spares[0].valid ? 0 : !this.spares[1].valid ? 1 : -1;
      if (slot < 0) return;
      const k = this.scan++, p = this.search;
      if (k < landings.length) {
        const at = landings[k];
        p.x = at.x; p.z = at.z; p.heading = at.rot;
      } else {
        const cell = Math.floor((k - landings.length) / 2);
        p.x = x0 + cell % cols * 4;
        p.z = z0 + Math.floor(cell / cols) * 4;
        p.heading = (k - landings.length) % 2 * Math.PI / 2;
      }
      const other = this.spares[1 - slot];
      if (other.valid && distance(p, other.pose) < 9) continue;
      if (this.host.clearance.pair(r, p, 1, this.candidate, true) || this.host.clearance.pair(r, p, -1, this.candidate, true)) this.setSpare(r, slot);
    }
  }

  private stillClear(r: Ride, p: Pair, reserve = false) {
    return p.valid && this.host.clearance.pair(r, p.pose, p.door, this.candidate, reserve);
  }

  private available(r: Ride) {
    for (const p of this.spares) if (this.stillClear(r, p, true)) return p;
    return undefined;
  }

  private maintainSpare(r: Ride, now: number) {
    if (now < this.recheckAt) return;
    this.recheckAt = now + 160;
    // Keep the other lease installed while searching for its replacement.
    for (let i = 0; i < this.spares.length; i++) {
      const p = this.spares[i];
      if (p.valid && !this.stillClear(r, p, true)) {
        p.valid = false;
        this.scan = 0;
      }
    }
  }

  private release() {
    this.host.reserve(NO_BOXES);
    for (const p of this.spares) p.valid = false;
    this.enabled = false; this.scan = this.recheckAt = 0;
  }

  private clearIncident() {
    this.firstWet = this.drySince = this.started = this.deadline = Infinity;
    this.fadeAt = this.landedAt = this.exitAt = Infinity;
    this.age = 0; this.exitWanted = this.assisted = false;
    this.probe.band = "dry";
    this.blockedRoute = false;
    if (this.covering) { this.host.fade(false); this.covering = false; }
    this.host.clearFade?.();
    this.effects.endWet();
    this.release();
  }

  transfer() {
    this.suspendedCar = null;
    if (this.car && (this.wet || this.returning)) this.finalize(this.car, true);
    this.clearIncident();
    this.effects.cancel();
    this.car = null;
  }

  cancelEffects(r?: Ride) {
    if (!r || this.car === r || this.effects.isDrainSource(r)) this.effects.cancel();
  }

  dispose() { this.transfer(); this.effects.dispose(); this.disposed = true; }

  /** Called once by the player loop, before input, panels, modes and the unoccupied ride update. */
  tick(dt: number, time: number, fromBackground = false): boolean {
    if (this.suspendedCar) {
      if (!this.host.driver(this.suspendedCar)) this.suspendedCar = null;
      else if (this.host.eligible(this.suspendedCar)) this.begin(this.suspendedCar);
    }
    const r = this.car;
    this.time = time;
    if (!r) { this.effects.updateDrain(time); return false; }
    const now = this.clock(), resumed = fromBackground || now - this.lastFrame >= 500;
    this.lastFrame = now;
    this.frameDt = dt;
    if (!this.host.eligible(r)) {
      const resume = !this.wet && !this.returning && this.host.driver(r);
      this.transfer();
      if (resume) this.suspendedCar = r;
      return false;
    }
    if (resumed && this.wet && !this.returning) this.start(r, "suspended", Math.min(now, this.firstWet + WET_LIMIT));
    if (this.returning && (resumed || now >= this.deadline || !finite(r.m))) {
      this.finalize(r, false);
      this.effects.rest(time);
      return true;
    }
    if (!this.host.driver(r) && !this.returning) {
      if (!this.wet) { this.transfer(); return false; }
      this.start(r, "driver-lost", now);
    }
    this.maintainSpare(r, now);
    this.acquire(r, 12);
    if (!this.returning && this.wet && now >= this.firstWet + WET_LIMIT) this.start(r, "wet-limit", this.firstWet + WET_LIMIT);
    if (!this.returning) { this.effects.updateDrain(time); return false; }
    if (now >= this.deadline) { this.finalize(r, false); this.effects.rest(time); return true; }
    this.age += dt;
    this.advance(r);
    this.effects.rest(time);
    this.effects.updateDrain(time);
    this.effects.motorSignal(coughBeat(this.age - this.landedAt));
    return true;
  }

  /** Both ends of a solver step sample the accepted pose, never a predicted point through a collider. */
  accepted(r: Ride, time: number, throttle = 0, settled = true) {
    if (!this.open(r) || this.returning) return this.returning;
    this.time = time;
    const now = this.clock(), m = r.m;
    if (!finite(m)) { this.start(r, "invalid", now); this.finalize(r, false); return true; }
    const previousBand = this.probe.band;
    probeCarWater(m, time, previousBand, this.probe);
    if (this.probe.band === "body-deep" && previousBand !== "body-deep") this.bodyAt = now;
    const contact = Math.max(this.probe.centre.depth, this.probe.maxTireDepth);
    if (contact > 0) {
      this.drySince = Infinity;
      if (!this.wet) this.firstWet = now;
    } else if (this.wet && this.probe.band === "dry") {
      this.drySince = Math.min(this.drySince, now);
      if (now - this.drySince >= REARM && this.pairAt(r, m, this.candidate)) this.clearIncident();
    }
    this.record(r);
    const floating = this.probe.band === "float", timedOut = now >= this.firstWet + WET_LIMIT;
    if (settled || floating || timedOut) this.effects.drive(m, this.probe, time, this.frameDt);
    if (floating) this.start(r, "depth", now);
    else if (timedOut) this.start(r, "wet-limit", this.firstWet + WET_LIMIT);
    const returning = this.returning;
    if (returning && now >= this.deadline) this.finalize(r, false);
    this.readThrottle(throttle);
    if (settled && !returning) this.effects.motorSignal(this.probe.band === "body-deep" && this.loaded && this.miss ? -1 : 0);
    return returning;
  }

  private loaded = false;
  private miss = false;
  private readThrottle(throttle: number) {
    this.loaded = Math.abs(throttle) > 0.1;
    this.miss = sputterMiss(this.wet ? (this.clock() - this.bodyAt) / 1000 : 0);
  }

  settings(c: Controls) {
    const base = wetDriveSettings(this.probe.band);
    if (!base) return undefined;
    if (this.probe.band !== "body-deep") return base;
    this.readThrottle(c.brake ? 0 : c.throttle);
    Object.assign(this.driveSettings, base);
    this.driveSettings.power = this.loaded && this.miss ? sputter.missPower : 1;
    return this.driveSettings;
  }

  revs(stock: number) {
    if (this.returning) return drainMotor(this.age - this.landedAt);
    return this.probe.band === "body-deep" && this.loaded ? this.miss ? sputter.missRevs : sputter.loadRevs : stock;
  }

  private pairAt(r: Ride, p: Pose, out: Pair) {
    return this.host.clearance.pair(r, p, 1, out) || this.host.clearance.pair(r, p, -1, out);
  }

  private record(r: Ride) {
    const m = r.m;
    if (!this.wet && !POOLS.length && m.z > SHORE.top + 17) return;
    const last = this.count ? this.history[(this.head + 31) % 32] : null;
    if (last && distance(m, last) < 0.75 && Math.abs(angle(m.heading - last.heading)) < 0.24) return;
    const node = this.history[this.head];
    copyPose(node, m);
    node.pair.valid = false;
    if (this.probe.band === "dry" && (!this.lastDry.valid || distance(this.lastDry.pose, m) >= 1.5)) {
      if (this.pairAt(r, m, node.pair)) {
        copyPose(this.lastDry.pose, m);
        Object.assign(this.lastDry.foot, node.pair.foot);
        this.lastDry.door = node.pair.door; this.lastDry.valid = true;
      }
    }
    this.head = (this.head + 1) % 32;
    this.count = Math.min(32, this.count + 1);
  }

  requestExit(r: Ride, spot: Point | null, time: number) {
    if (this.car !== r || (!this.open(r) && !this.returning)) return false;
    this.time = time;
    if (!this.returning) {
      probeCarWater(r.m, time, this.probe.band, this.probe);
      const footWet = spot ? this.wetFoot(spot.x, spot.z) : this.hasWetDoor(r);
      if (!this.wet && this.probe.band === "dry" && !footWet && this.probe.centre.depth <= 0 && this.probe.maxTireDepth <= 0) return false;
      if (this.probe.band !== "dry" && finite(r.m)) this.effects.drive(r.m, this.probe, time, this.frameDt);
      this.exitWanted = true;
      this.start(r, "exit", this.clock());
    }
    this.exitWanted = true;
    if (this.landedAt < Infinity && this.stillClear(r, this.landing)) this.putFoot(r, this.landing, false, false);
    else if (!this.assisted && this.landedAt === Infinity) this.stepOut(r);
    if (this.clock() >= this.deadline) this.finalize(r, false);
    return true;
  }

  private wetFoot(x: number, z: number) {
    for (let i = -1; i < 8; i++) {
      const r = i < 0 ? 0 : footRadius, px = x + Math.cos(i * Math.PI / 4) * r, pz = z + Math.sin(i * Math.PI / 4) * r;
      const sur = waterY(px, pz, this.time);
      if (sur !== null && floorY(px, pz) < sur) return true;
    }
    return false;
  }

  private hasWetDoor(r: Ride) {
    for (const door of DOORS) {
      this.beside(r, r.m, door, footOffset, this.testFoot);
      if (this.wetFoot(this.testFoot.x, this.testFoot.z)) return true;
    }
    return false;
  }

  private start(r: Ride, reason: Reason, now: number) {
    if (this.returning) return;
    this.effects.rest(this.time);
    this.effects.motorSignal(0);
    this.reason = reason; this.started = now;
    this.deadline = Math.min(now + RETURN_LIMIT, this.firstWet + WET_LIMIT + RETURN_LIMIT);
    this.age = 0; this.progressed = 0; this.routeAt = 1;
    this.startY = r.mesh.position.y;
    this.startPitch = Math.max(-0.09, r.mesh.rotation.x);
    if (!this.host.driver(r)) this.exitWanted = true;
    this.host.arrest(r);
    if (finite(r.m)) {
      if (this.exitWanted) this.stepOut(r);
      this.buildRoute(r);
      this.host.place(r, false, false, this.time);
    }
  }

  private beside(r: Ride, p: Pose, door: Door, offset: number, out: Foot) {
    const s = Math.sin(p.heading), c = Math.cos(p.heading), side = Math.abs(door) === 1;
    const across = side ? Math.sign(door) * (r.m.spec.wide + offset) : 0;
    const along = side ? 0 : Math.sign(door) * (r.m.spec.half + offset);
    out.x = p.x + across * c + along * s; out.z = p.z - across * s + along * c;
    out.rot = p.heading + (side ? door * Math.PI / 2 : door < 0 ? Math.PI : 0);
    this.footHeight(out);
  }

  private footHeight(out: Foot) {
    const floor = floorY(out.x, out.z), live = waterY(out.x, out.z, this.time);
    const depth = live === null ? 0 : live - floor;
    out.swim = depth > 0.58 ? 1 : 0;
    out.y = out.swim && live !== null ? Math.max(floor, live - 0.78) : floor;
  }

  private stepOut(r: Ride) {
    if (!finite(r.m)) return;
    // Prefer the landward side when both sides are clear at a railing or the face of a dock.
    let best = -Infinity;
    for (const door of DOORS) {
      this.beside(r, r.m, door, footRadius + 0.06, this.testFoot);
      const a = this.testFoot;
      if (!this.host.clearance.foot(r, a.x, a.z, PADDING)) continue;
      this.beside(r, r.m, door, footOffset, this.foot);
      if (!this.footSweep(r, a, this.foot)) continue;
      const rank = floorY(this.foot.x, this.foot.z) - (Math.abs(door) === 2 ? 0.25 : 0);
      if (rank > best) { best = rank; this.footDoor = door; Object.assign(this.exitFrom, a); }
    }
    if (best === -Infinity) { this.blockedRoute = true; return; }
    this.assisted = true; this.exitAt = this.age;
    this.host.detach(r, this.exitFrom);
    Object.assign(this.placedFoot, this.exitFrom);
    this.host.foot(this.placedFoot, false);
  }

  private footSweep(r: Ride, from: Point, to: Point) {
    const n = Math.max(1, Math.ceil(distance(from, to) / STEP));
    for (let i = 1; i <= n; i++) {
      const k = i / n;
      if (!this.host.clearance.foot(r, from.x + (to.x - from.x) * k, from.z + (to.z - from.z) * k, PADDING)) return false;
    }
    return true;
  }

  private swept(r: Ride, a: Pose, b: Pose, door: Door | 0) {
    const turn = Math.abs(angle(b.heading - a.heading));
    const n = Math.max(1, Math.ceil((distance(a, b) + turn * (r.m.spec.half + footOffset)) / STEP));
    if (n > 128 || Math.abs(floorY(a.x, a.z) - floorY(b.x, b.z)) > 1.0) return false;
    if (door) this.beside(r, a, door, footOffset, this.testFoot);
    for (let i = 0; i <= n; i++) {
      const p = this.sweepPose;
      mixPose(p, a, b, i / n);
      if (!this.host.clearance.car(r, p, PADDING)) return false;
      if (door) {
        this.beside(r, p, door, footOffset, this.foot);
        if (!this.footSweep(r, this.testFoot, this.foot)
          || reach(p, r.m.spec.half, r.m.spec.wide, (this.testFoot.x + this.foot.x) / 2, (this.testFoot.z + this.foot.z) / 2) < footRadius) return false;
        Object.assign(this.testFoot, this.foot);
      }
    }
    return true;
  }

  private buildRoute(r: Ride) {
    this.routeCount = 0;
    if (this.blockedRoute) return;
    const door = this.assisted ? this.footDoor : 0;
    const m = r.m;
    copyPose(this.route[0], m); this.lengths[0] = 0;
    for (let i = 1; i <= this.count; i++) {
      const node = this.history[(this.head + 32 - i) % 32], previous = this.route[i - 1];
      const span = Math.max(distance(previous, node), Math.abs(angle(node.heading - previous.heading)) * (m.spec.half + footOffset));
      if (span > 1.8 || this.lengths[i - 1] + span > TOW_SPEED * (TOW_END - FLOAT - 0.16) || !this.swept(r, previous, node, door)) break;
      copyPose(this.route[i], node);
      this.lengths[i] = this.lengths[i - 1] + span;
      if (node.pair.valid && (door === 0 || door === 1 || door === -1)
        && (door ? this.host.clearance.pair(r, node, door, this.landing) : this.pairAt(r, node, this.landing))) {
        this.routeCount = i + 1;
        this.routeDistance = this.lengths[i];
        break;
      }
    }
  }

  private advance(r: Ride) {
    if (this.landedAt < Infinity) {
      if (this.exitWanted && !this.assisted && this.stillClear(r, this.landing)) this.putFoot(r, this.landing, false, false);
      const age = this.age - this.landedAt;
      if (age >= DRAIN) { this.finalize(r, false); return; }
      if (this.inlandTurn) this.turnInland(r, age);
      this.host.place(r, false, false, this.time);
      return;
    }
    if (!this.host.driver(r) && !this.assisted) {
      this.exitWanted = true;
      this.stepOut(r);
    }
    if (this.age >= FLOAT) {
      if (!this.blockedRoute && this.routeCount && this.fadeAt === Infinity) this.tow(r);
      if (this.landedAt < Infinity) return;
      const tooLate = this.age >= TOW_END || this.age >= TOW_END - FADE && this.progressed + (TOW_END - this.age) * TOW_SPEED < this.routeDistance;
      if (this.fadeAt < Infinity || this.age >= TOW_END - FADE && (this.blockedRoute || !this.routeCount || tooLate)) {
        if (this.fadeAt === Infinity) {
          this.fadeAt = this.age;
          this.host.fade(true); this.covering = true;
        }
        if (this.age >= this.fadeAt + FADE) {
          const spare = this.available(r);
          if (spare) { this.arrive(r, spare, true); return; }
        }
      }
    }
    this.host.place(r, false, false, this.time);
    if (!this.assisted) return;
    this.beside(r, r.m, this.footDoor, footOffset, this.foot);
    const k = clamp((this.age - this.exitAt) / 0.22, 0, 1);
    if (k < 1) this.beside(r, r.m, this.footDoor, footRadius + 0.06 + (footOffset - footRadius - 0.06) * k, this.foot);
    if (this.footSweep(r, this.placedFoot, this.foot)
      && reach(r.m, r.m.spec.half, r.m.spec.wide, this.foot.x, this.foot.z) >= footRadius) Object.assign(this.placedFoot, this.foot);
    else {
      this.blockedRoute = true;
      this.footHeight(this.placedFoot);
    }
    this.host.foot(this.placedFoot, false);
  }

  private tow(r: Ride) {
    if (this.exitWanted && (!this.assisted || this.age - this.exitAt < 0.22)) return;
    const t = clamp(this.age - FLOAT, 0, TOW_END - FLOAT), ramp = 0.16, run = TOW_END - FLOAT;
    // Integral of a smoothstep speed ramp at each endpoint, with a constant cruise between them.
    const u = Math.min(t, run - t) / ramp;
    const easeDistance = u < 1 ? ramp * (u ** 3 - 0.5 * u ** 4) : Math.min(t, run - t) - ramp * 0.5;
    const desired = (t <= run / 2 ? easeDistance : run - ramp - easeDistance) * this.routeDistance / (run - ramp);
    const end = Math.min(this.routeDistance, desired, this.progressed + TOW_SPEED * this.frameDt);
    while (this.progressed < end && this.routeAt < this.routeCount) {
      const i = this.routeAt, before = this.lengths[i - 1], after = this.lengths[i];
      const next = Math.min(end, after), k = after > before ? (next - before) / (after - before) : 1;
      mixPose(this.trial, this.route[i - 1], this.route[i], k);
      if (!this.swept(r, r.m, this.trial, this.assisted ? this.footDoor : 0)) { this.blockedRoute = true; return; }
      if (this.assisted) {
        this.beside(r, this.trial, this.footDoor, footOffset, this.foot);
        if (!this.footSweep(r, this.placedFoot, this.foot)) { this.blockedRoute = true; return; }
        Object.assign(this.placedFoot, this.foot);
      }
      copyPose(r.m, this.trial);
      this.progressed = next;
      if (next === after) this.routeAt++;
    }
    if (this.age < TOW_END || this.progressed < this.routeDistance - 1e-5) return;
    if (!this.stillClear(r, this.landing) || (this.assisted && this.footDoor !== this.landing.door)) {
      this.blockedRoute = true; return;
    }
    this.arrive(r, this.landing, false);
  }

  private copyLanding(p: Pair) {
    if (p === this.landing) return;
    copyPose(this.landing.pose, p.pose);
    Object.assign(this.landing.foot, p.foot);
    this.landing.valid = true; this.landing.door = p.door;
  }

  private putFoot(r: Ride, pair: Pair, snap: boolean, transfer: boolean) {
    if (transfer) return;
    if (!this.assisted) this.host.detach(r, pair.foot);
    this.assisted = true;
    this.host.foot(pair.foot, snap);
  }

  private arrive(r: Ride, p: Pair, fallback: boolean, transfer = false) {
    const wet = this.wet || this.probe.maxTireDepth > 0 || this.probe.centre.depth > 0;
    this.copyLanding(p);
    this.usedFallback ||= fallback; this.lastLanding = fallback ? "spare" : "trail";
    const { x, z, heading } = this.landing.pose;
    r.m.set(x, z, heading);
    probeCarWater(r.m, this.time, "dry", this.probe);
    this.landedAt = this.age;
    this.inlandTurn = 0;
    if (!fallback) {
      const inland = angle(this.plan.approach.rot + Math.PI), turn = angle(inland - heading);
      if (Math.abs(turn) > Math.PI / 2) {
        copyPose(this.trial, r.m); this.trial.heading = inland;
        if (this.host.clearance.pair(r, this.trial, this.landing.door, this.candidate)
          && this.swept(r, r.m, this.trial, this.landing.door)) {
          copyPose(this.turnFrom, r.m); this.inlandTurn = turn;
        }
      }
    }
    if (this.exitWanted || this.assisted || !this.host.driver(r)) this.putFoot(r, this.landing, fallback, transfer);
    this.host.place(r, false, fallback && !transfer, this.time);
    if (wet && !transfer) this.effects.beginDrain(r, this.time, fallback);
    if (this.covering) { this.host.fade(false); this.covering = false; }
  }

  private turnInland(r: Ride, age: number) {
    const u = clamp(age / (DRAIN - 0.04), 0, 1);
    copyPose(this.trial, this.turnFrom);
    this.trial.heading += this.inlandTurn * u * u * (3 - 2 * u);
    if (!this.swept(r, r.m, this.trial, this.landing.door)
      || !this.host.clearance.pair(r, this.trial, this.landing.door, this.candidate)) {
      this.inlandTurn = 0;
      return;
    }
    copyPose(r.m, this.trial);
    this.copyLanding(this.candidate);
    if (this.assisted) this.host.foot(this.landing.foot, false);
  }

  private finalize(r: Ride, transfer: boolean) {
    const landed = this.landedAt < Infinity && this.stillClear(r, this.landing);
    let spare = landed ? this.landing : this.available(r);
    if (!spare && this.stillClear(r, this.lastDry)) spare = this.lastDry;
    // Normally both off-lane leases remain clear. Check a bounded batch if external movement invalidated them together.
    if (!spare) { this.maintainSpare(r, Infinity); this.acquire(r, 48); spare = this.available(r); }
    if (spare) {
      if (!landed) this.arrive(r, spare, true, transfer);
      else if (this.exitWanted || this.assisted || !this.host.driver(r)) this.putFoot(r, spare, false, transfer);
      this.host.place(r, true, !landed && !transfer, this.time);
      if (!transfer) this.host.save?.();
    }
    this.clearIncident();
    this.count = this.head = 0;
    if (transfer || !this.host.driver(r)) this.car = null;
  }

  private supportedHeight(r: Ride, time: number, y: number, grounding: number, limitImmersion: boolean) {
    const { m, mesh } = r, { half, wide } = m.spec;
    const tireSide = CAR_WATER.tireSide * wide / CAR_WATER.referenceWide;
    const tireAlong = CAR_WATER.tireAlong * half / CAR_WATER.referenceHalf;
    const { floor, liveSurface } = this.probe.centre;
    let bed = floor, waterline = limitImmersion && liveSurface !== null ? liveSurface - CAR_WATER.maxImmersion : -Infinity;
    // The tires and chassis footprint are measured at the mesh's local ground plane.
    for (let tire = 0; tire < 2; tire++) {
      const across = tire ? tireSide : wide, along = tire ? tireAlong : half;
      for (let end = -1; end <= 1; end += 2) for (let side = -1; side <= 1; side += 2) {
        const p = this.contact.set(side * across, 0, end * along).applyQuaternion(mesh.quaternion);
        const x = m.x + p.x, z = m.z + p.z;
        bed = Math.max(bed, floorY(x, z) - p.y);
        const surface = limitImmersion ? waterY(x, z, time) : null;
        if (surface !== null) waterline = Math.max(waterline, surface - CAR_WATER.maxImmersion - p.y);
      }
    }
    return Math.max(bed, waterline, y + (bed - y) * grounding);
  }

  /** Chassis height and pitch are used by the whole mesh, including its damage pieces and driver anchor. */
  pose(r: Ride, time: number, y: number, pitch: number, roll: number, roadGrade: boolean) {
    const m = r.m, mesh = r.mesh;
    const p = this.probe, afloat = this.landedAt === Infinity;
    let grounding = 0;
    if (this.returning) {
      if (afloat) {
        probeCarWater(m, time, p.band, p);
        const blend = clamp(this.age / FLOAT, 0, 1);
        const front = (p.frontLeft.depth + p.frontRight.depth) * 0.5;
        const rear = (p.rearLeft.depth + p.rearRight.depth) * 0.5;
        // The shallower axle starts taking weight first. Still depth keeps the grade steady through each swell.
        const u = clamp((0.38 - Math.min(front, rear)) / 0.34, 0, 1);
        grounding = blend * u * u * (3 - 2 * u);
        pitch = this.startPitch * (1 - blend) - 0.09 * blend + (Math.max(-0.09, p.pitch) + 0.09) * grounding;
        const floating = (p.centre.liveSurface ?? p.centre.floor) - 0.28 + 0.07 * Math.sin(this.age * 2 * Math.PI / 0.70);
        y = this.startY + (floating - this.startY) * blend;
      } else {
        pitch = drainPitch(this.age - this.landedAt);
        y = floorY(m.x, m.z);
      }
      roll = 0;
    } else if (!roadGrade) {
      y += p.centre.floor;
      pitch += p.pitch;
      if (p.band === "body-deep") pitch += this.miss && this.loaded ? 0.018 : 0;
    }
    const wet = this.wet || this.returning;
    if (wet || p.pitch !== 0) pitch = clamp(pitch, -CAR_WATER.maxPitch, CAR_WATER.maxPitch);
    mesh.rotation.set(pitch, m.heading, roll);
    if (wet || !roadGrade && (p.pitch !== 0 || p.centre.floor !== 0 || p.centre.liveSurface !== null)) {
      y = this.supportedHeight(r, time, y, grounding, wet && afloat);
    }
    mesh.position.set(m.x, y, m.z);
  }

  cameraFloor(p: { x: number; y: number; z: number }, time: number) {
    if (!this.wet && !this.returning) return false;
    const live = waterY(p.x, p.z, time);
    if (live === null || p.y >= live + CAR_WATER.cameraClear) return false;
    p.y = live + CAR_WATER.cameraClear;
    return true;
  }

  inspect() {
    const phase: Phase = !this.car ? "idle" : !this.returning ? this.admitted ? "driving" : "acquiring"
      : this.landedAt < Infinity ? "settle" : this.fadeAt < Infinity ? "fade" : this.age < FLOAT || this.blockedRoute || !this.routeCount ? "float" : "tow";
    const p = this.probe, limits = wetDriveSettings(p.band);
    return {
      active: this.wet || this.returning, enabled: this.admitted, id: this.car?.id ?? null, episode: this.episode,
      phase, reason: this.reason, age: this.age, wetAge: this.wet ? (this.clock() - this.firstWet) / 1000 : 0,
      secondsLeft: this.returning ? Math.max(0, (this.deadline - this.clock()) / 1000) : null,
      band: p.band, centreDepth: p.centre.depth, maxTireDepth: p.maxTireDepth,
      wheelDepths: [p.frontLeft.depth, p.frontRight.depth, p.rearLeft.depth, p.rearRight.depth],
      steerGain: limits?.steerGain ?? 1, forwardCap: limits?.forward ?? null, reverseCap: limits?.reverse ?? null,
      assistedOnFoot: this.assisted, fallback: this.usedFallback, landing: this.lastLanding,
      landingPair: this.landing.valid && (this.lastLanding || this.returning && this.routeCount > 0)
        ? { pose: { ...this.landing.pose }, foot: { ...this.landing.foot } } : null,
      fallbackReason: this.usedFallback ? (this.routeCount ? "corridor-unfinished" : "no-corridor") : null,
      spares: this.spares.filter((q) => q.valid).map((q) => ({ ...q.pose, foot: { ...q.foot } })),
      ...this.effects.inspect(), motorSignalRevs: this.revs(0),
    };
  }
}

export function carWaterSurface(x: number, z: number, time = 0) {
  return { surface: waterY(x, z, time), floor: floorY(x, z) };
}
