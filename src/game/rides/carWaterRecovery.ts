import { Vector3 } from "three";
import type { GameCharacter } from "../characters";
import type { Ambient } from "../ambient";
import { ways } from "../cave/groundsPlan";
import { Ledges, type Piece } from "../ledges";
import { DECKS, FLOORS, floorY, POOLS, poolAt, sandY, SEA_LEVEL, SHORE, waterY } from "../water";
import { writeCarLedges } from "../world/carModels";
import { TRAFFIC_LANES, WORLD } from "../world/layout";
import type { CarWaterArea, CarWaterPlan } from "../world/rides";
import type { Colliders } from "../world/util";
import {
  CAR_WATER, carFootprintOverlapsBox, createCarWaterProbe, nearWater, probeCarWater,
  supportedCarWaterHeight, sweepCarFootprintBox, wetDriveSettings,
} from "./carWater";
import { CAR_REACH, type Controls, type MotionImpact, type WetDriveSettings } from "./drive";
import { isTownCarDryMainland, townCarWaterGround } from "./ground";
import type { Ride } from "./Rides";
import { CAR_SEATS, CONVERTIBLE_BUMPER } from "./shapes";
import { CarWaterEffects, sputterMiss, type CarWaterEffectsHost } from "./carWaterEffects";

type Point = { x: number; z: number };
type Pose = Point & { heading: number };
type Door = -2 | -1 | 1 | 2;
type Side = -1 | 1;
export type CarWaterFoot = Point & { y: number; rot: number; swim: number };
type Pair = { pose: Pose; foot: CarWaterFoot; door: Side; offset: number; valid: boolean };
type Box = Ambient["rideBoxes"][number];
type Reason = "depth" | "exit" | "wet-limit" | "invalid" | "driver-lost" | "suspended";
type ClearPerson = (x: number, z: number, radius: number) => boolean;

const W = CAR_WATER;
const WET_LIMIT = W.maxWetSeconds * 1000, RETURN_LIMIT = 3500;
const FLOAT = 0.5, TOW_END = 2.35, DRAIN = 0.65, FADE = 0.18, TOW_SPEED = 8;
const FOOT_STEP = 0.22, EXIT_START = W.footRadius + 0.06;
const PADDING = 0.04, STEP = 0.12, SEPARATION = 9;
const COAST_SPARE_INSET = 1;
const DOOR_STEP = 0.1, DOOR_EXTRA_STEPS = 6, WALK_RADIUS = 0.38;
const FOOT_RISE = 0.32;
const DISC_ANGLES = Array.from({ length: 16 }, (_, i) => ({
  x: Math.cos(i * Math.PI / 8), z: Math.sin(i * Math.PI / 8),
}));
// Try the outward step first, then turn and move along the sill if it has less room.
const EXIT_STEPS = [
  { start: EXIT_START, end: W.footOffset, sill: 0, turn: 0 },
  { start: EXIT_START, end: EXIT_START, sill: 0.35, turn: -Math.PI / 2 },
  { start: EXIT_START, end: EXIT_START, sill: -0.35, turn: Math.PI / 2 },
  { start: EXIT_START, end: W.footOffset, sill: 0.6, turn: -Math.PI / 2 },
  { start: EXIT_START, end: W.footOffset, sill: -0.6, turn: Math.PI / 2 },
  { start: W.footOffset, end: W.footOffset, sill: 0, turn: 0 },
];
type ExitStep = typeof EXIT_STEPS[number];
const DOORS: readonly Door[] = [1, -1, 2, -2];
const HOME_OFFSETS = [0, 0.55, -0.55, 1.15, -1.15, 1.75, -1.75];
const WEST_DOOR_OFFSETS = [0, -0.55, 0.5];
const NO_BOXES: readonly Box[] = [];
const emptyPose = (): Pose => ({ x: 0, z: 0, heading: 0 });
const emptyFoot = (): CarWaterFoot => ({ x: 0, z: 0, y: 0, rot: 0, swim: 0 });
const emptyPair = (): Pair => ({ pose: emptyPose(), foot: emptyFoot(), door: 1, offset: W.footOffset, valid: false });
const emptyBox = (): Box => ({ ...emptyPose(), hl: 0, hw: 0 });
const clamp = (v: number, low: number, high: number) => Math.max(low, Math.min(high, v));
const angle = (v: number) => Math.atan2(Math.sin(v), Math.cos(v));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
const finite = (p: Pose) => Number.isFinite(p.x) && Number.isFinite(p.z) && Number.isFinite(p.heading);
const copyPose = (out: Pose, p: Pose) => { out.x = p.x; out.z = p.z; out.heading = p.heading; };
const mixPose = (out: Pose, a: Pose, b: Pose, k: number) => {
  out.x = a.x + (b.x - a.x) * k;
  out.z = a.z + (b.z - a.z) * k;
  out.heading = a.heading + angle(b.heading - a.heading) * k;
};
const copyPair = (out: Pair, pair: Pair) => {
  copyPose(out.pose, pair.pose);
  Object.assign(out.foot, pair.foot);
  out.door = pair.door; out.offset = pair.offset; out.valid = true;
};

function reach(p: Pose, half: number, wide: number, x: number, z: number) {
  const s = Math.sin(p.heading), c = Math.cos(p.heading), dx = x - p.x, dz = z - p.z;
  return Math.hypot(Math.max(0, Math.abs(dx * s + dz * c) - half), Math.max(0, Math.abs(dx * c - dz * s) - wide));
}

export interface CarWaterScene {
  colliders: Colliders;
  ledges?: Ledges | null;
  ambient: Pick<Ambient, "carWaterPeopleClear" | "carWaterTrafficClear">;
  rides: readonly Ride[];
  parked: readonly Ride[];
  fixedHulls: readonly { x: number; z: number; r: number }[];
  peopleClear(clear: ClearPerson, reserved: boolean): boolean;
}

export class CarWaterClearance {
  readonly ground;
  private readonly drop;
  private readonly shape = emptyBox();
  private readonly home = emptyPose();
  private readonly walkPieces: Piece[] = [];
  private readonly poolBox = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  readonly rails;
  private readonly hit: MotionImpact = { into: 0, nx: 0, nz: 0, x: 0, z: 0, circle: 1 };
  private circle = false;
  private readonly personClear: ClearPerson = (x, z, radius) => !this.hitsCircle(x, z, radius);
  private readonly trafficClear = (x: number, z: number, half: number, wide: number) =>
    !this.hitsBox(x, z, half + 0.12, wide + 0.12, Math.PI / 2);

  constructor(private readonly plan: CarWaterPlan, private readonly scene: CarWaterScene) {
    this.ground = townCarWaterGround(plan);
    this.rails = scene.colliders.boxes.filter(b => b.deckRail || b.carRim);
    if (plan.westGrounds && plan.cenote) this.drop = ways(plan.cenote.x, plan.cenote.z).find(w => w.drop);
  }

  private body(p: Pose, r: Ride, margin = 0) {
    copyPose(this.shape, p);
    const bumper = CONVERTIBLE_BUMPER, { half, wide } = r.m.spec;
    this.shape.hl = (r.model ? half : Math.max(half, bumper.offset + bumper.depth / 2)) + margin;
    this.shape.hw = (r.model ? wide : Math.max(wide, bumper.width / 2)) + margin;
    this.circle = false;
  }

  private person(x: number, z: number, margin = 0) {
    this.shape.x = x; this.shape.z = z; this.shape.hw = W.footRadius + margin;
    this.circle = true;
  }

  private hitsCircle(x: number, z: number, radius: number) {
    const a = this.shape;
    return this.circle ? Math.hypot(x - a.x, z - a.z) < radius + a.hw : reach(a, a.hl, a.hw, x, z) < radius;
  }

  private hitsBox(x: number, z: number, half: number, wide: number, heading: number) {
    const a = this.shape;
    if (this.circle) return reachBox(x, z, heading, half, wide, a.x, a.z) < a.hw;
    const dx = x - a.x, dz = z - a.z;
    if (Math.abs(dx) > a.hl + a.hw + half + wide || Math.abs(dz) > a.hl + a.hw + half + wide) return false;
    const s = Math.sin(a.heading), c = Math.cos(a.heading), t = Math.sin(heading), u = Math.cos(heading);
    const along = Math.abs(s * t + c * u), across = Math.abs(s * u - c * t);
    return Math.abs(dx * s + dz * c) < a.hl + half * along + wide * across
      && Math.abs(dx * c - dz * s) < a.hw + half * across + wide * along
      && Math.abs(dx * t + dz * u) < half + a.hl * along + a.hw * across
      && Math.abs(dx * u - dz * t) < wide + a.hl * across + a.hw * along;
  }

  private vehiclesClear(r: Ride, fleet: readonly Ride[], reserve: boolean, restart: boolean) {
    for (const q of fleet) {
      const { m, home } = q, { half, wide } = m.spec;
      if (q !== r && (restart ? this.hitsBox(home.x, home.z, half, wide, home.rot)
        : this.hitsBox(m.x, m.z, half, wide, m.heading))) return false;
      if (reserve && q.kind === "car" && this.hitsBox(home.x, home.z, half + 0.85, wide + 1.35, home.rot)) return false;
      for (const o of q.owners) {
        const p = o.ch.root.position;
        if (o.state !== "in" && this.hitsCircle(p.x, p.z, 0.45)) return false;
        if (reserve && o.state !== "in") {
          if ((o.state === "hop-out" || o.state === "hop-in") && this.hitsCircle(o.to.x, o.to.z, 0.55)) return false;
          if (o.path) for (const [x, z] of o.path) if (this.hitsCircle(x, z, 0.55)) return false;
        }
      }
    }
    return true;
  }

  private clear(r: Ride, dry: boolean, reserve = false, restart = false) {
    const { colliders, fixedHulls, ambient, rides, parked } = this.scene;
    for (const b of colliders.boxes) {
      if ((dry || b.tag !== "sea") && this.hitsBox((b.minX + b.maxX) / 2, (b.minZ + b.maxZ) / 2,
        (b.maxZ - b.minZ) / 2, (b.maxX - b.minX) / 2, 0)) return false;
    }
    for (const c of colliders.circles) if (this.hitsCircle(c.x, c.z, c.r)) return false;
    for (const c of fixedHulls) if (this.hitsCircle(c.x, c.z, c.r)) return false;
    if (reserve && !this.landingSiteClear()) return false;
    return this.vehiclesClear(r, rides, reserve, restart) && this.vehiclesClear(r, parked, reserve, restart)
      && ambient.carWaterTrafficClear(this.trafficClear)
      && ambient.carWaterPeopleClear(this.personClear, reserve || restart)
      && this.scene.peopleClear(this.personClear, reserve || restart);
  }

  private landingSiteClear() {
    for (const lane of TRAFFIC_LANES) {
      if (this.hitsBox((lane.from + lane.to) / 2, lane.z, Math.abs(lane.to - lane.from) / 2 + 3, 1.7, Math.PI / 2)) return false;
    }
    const exclusions = this.plan.landingExclusions;
    if (exclusions) for (const p of exclusions) if (this.hitsCircle(p.x, p.z, p.r)) return false;
    return true;
  }

  car(r: Ride, p: Pose) {
    this.body(p, r, PADDING);
    return this.clear(r, false);
  }

  foot(r: Ride, x: number, z: number, margin = PADDING, dry = false) {
    this.person(x, z, margin);
    return this.clear(r, dry);
  }

  private floorFits(x: number, z: number, low: number, high: number) {
    const y = floorY(x, z);
    return y >= low && y <= high;
  }

  private floorDisc(x: number, z: number, radius: number, low: number, high: number) {
    if (!this.floorFits(x, z, low, high)) return false;
    for (const v of DISC_ANGLES) {
      if (!this.floorFits(x + radius * v.x, z + radius * v.z, low, high)) return false;
    }
    // Probe intersected overrides even when their corner or sharp edge falls between spokes.
    return this.floorEdges(FLOORS, x, z, radius, low, high) && this.floorEdges(DECKS, x, z, radius, low, high);
  }

  private floorEdges(floors: readonly { x0: number; x1: number; z0: number; z1: number }[],
    x: number, z: number, radius: number, low: number, high: number) {
    for (const f of floors) {
      const px = clamp(x, f.x0 + 1e-6, f.x1 - 1e-6), pz = clamp(z, f.z0 + 1e-6, f.z1 - 1e-6);
      if (Math.hypot(x - px, z - pz) < radius && !this.floorFits(px, pz, low, high)) return false;
    }
    return true;
  }

  private clearOfDrop(x: number, z: number, radius: number) {
    return !this.drop || Math.hypot(x - this.drop.x, z - this.drop.z) >= this.drop.reach + radius;
  }

  /** Clearance for a detached idle learner or the 0.6 surface stroke. The neck and face move forward
   *  together in the latter. Cover both the head and its forward projection, including idle sway. */
  exterior(r: Ride, car: Pose, f: CarWaterFoot, time: number, halfStep: number) {
    const { x, z, y, rot, swim } = f;
    const { half, wide } = r.m.spec, bumper = CONVERTIBLE_BUMPER;
    const hl = r.model ? half : Math.max(half, bumper.offset + bumper.depth / 2);
    const hw = r.model ? wide : Math.max(wide, bumper.width / 2);
    const footRadius = Math.hypot(W.footRadius, halfStep);
    if (reach(car, hl, hw, x, z) < footRadius || !this.clearOfDrop(x, z, footRadius)
      || !this.floorDisc(x, z, footRadius, swim ? -Infinity : y - FOOT_RISE, y + FOOT_RISE)
      || !this.foot(r, x, z)) return false;

    const s = Math.sin(rot), c = Math.cos(rot), radius = Math.hypot(0.28, halfStep);
    // A low bound on the visible head after the first idle update, including stroke bob.
    const faceY = y + (swim ? 1.02 : 1.24);
    const front = swim ? 0.47 : 0.23;
    for (let i = 0; i <= 2; i++) {
      const d = front * i / 2;
      const px = x + d * s, pz = z + d * c;
      if (reach(car, hl, hw, px, pz) < radius || !this.clearOfDrop(px, pz, radius)
        || !this.floorDisc(px, pz, radius, -Infinity, faceY)) return false;
      if (faceY < (waterY(px, pz, time) ?? -Infinity) + W.faceClear) return false;
      for (const v of DISC_ANGLES) {
        const live = waterY(px + radius * v.x, pz + radius * v.z, time);
        if (live !== null && faceY < live + W.faceClear) return false;
      }
      if (d + radius > W.footRadius) {
        this.person(px, pz, radius + PADDING - W.footRadius);
        if (!this.clear(r, false)) return false;
      }
    }
    return true;
  }

  private hulls(r: Ride, p: Pose) {
    this.body(p, r);
    for (const q of this.scene.rides) {
      const { m } = q;
      if (q.kind === "boat" && this.hitsBox(m.x, m.z, m.spec.half, m.spec.wide, m.heading)) return false;
    }
    for (const c of this.scene.fixedHulls) if (this.hitsCircle(c.x, c.z, c.r)) return false;
    return true;
  }

  hullsSweep(r: Ride, from: Pose, trial: Pose) {
    // At a staged overlap allow retreat, while guarding the normal clear-to-clear sweep.
    if (!this.hulls(r, from)) return this.hulls(r, r.m);
    const to = r.m;
    const n = Math.ceil((distance(from, to) + Math.abs(angle(to.heading - from.heading)) * to.spec.half) / STEP);
    for (let i = 1; i <= n; i++) {
      mixPose(trial, from, to, i / n);
      if (!this.hulls(r, trial)) return false;
    }
    return true;
  }

  railContact(from: Pose, r: Ride) {
    this.body(from, r);
    const { hl, hw } = this.shape, to = r.m;
    let earliest = Infinity;
    for (const rail of this.rails) {
      const k = sweepCarFootprintBox(from, to, hl, hw, rail);
      if (k === null || k === 0 || k >= earliest) continue;
      earliest = k;
      mixPose(this.shape, from, to, k);
      const a = this.shape, s = Math.sin(a.heading), c = Math.cos(a.heading);
      const dx = a.x - (rail.minX + rail.maxX) / 2, dz = a.z - (rail.minZ + rail.maxZ) / 2;
      const gx = Math.abs(dx) - (rail.maxX - rail.minX) / 2 - Math.abs(s) * hl - Math.abs(c) * hw;
      const gz = Math.abs(dz) - (rail.maxZ - rail.minZ) / 2 - Math.abs(c) * hl - Math.abs(s) * hw;
      const hit = this.hit;
      hit.nx = gx >= gz ? Math.sign(dx) : 0;
      hit.nz = gx < gz ? Math.sign(dz) : 0;
      const along = -Math.sign(hit.nx * s + hit.nz * c) * hl, across = -Math.sign(hit.nx * c - hit.nz * s) * hw;
      hit.x = clamp(a.x + s * along + c * across, rail.minX, rail.maxX);
      hit.z = clamp(a.z + c * along - s * across, rail.minZ, rail.maxZ);
    }
    return earliest < Infinity ? this.hit : undefined;
  }

  private dryPoint(x: number, z: number, westTime?: number) {
    if (westTime !== undefined) {
      const bounds = x < WORLD.minX ? this.plan.westGrounds : WORLD;
      if (!bounds || x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ || poolAt(x, z)) return false;
      for (const d of DECKS) if (x > d.x0 && x < d.x1 && z > d.z0 && z < d.z1) return false;
      const height = floorY(x, z), live = waterY(x, z, westTime);
      return Number.isFinite(height) && (live === null || Math.min(height, sandY(x, z)) >= live);
    }
    if (!isTownCarDryMainland(this.ground, x, z, 0)) return false;
    return z >= SHORE.top + 1.5 || Math.min(floorY(x, z), sandY(x, z)) >= SEA_LEVEL + 0.265;
  }

  private dryPerson(x: number, z: number, height: number, westTime?: number) {
    if (!this.dryPoint(x, z, westTime) || Math.abs(floorY(x, z) - height) > 0.32) return false;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, px = x + Math.cos(a) * W.footRadius, pz = z + Math.sin(a) * W.footRadius;
      if (!this.dryPoint(px, pz, westTime) || Math.abs(floorY(px, pz) - height) > 0.32) return false;
    }
    return true;
  }

  private dryBody(p: Pose, half: number, wide: number, height: number, westTime?: number) {
    // Analytic overlap rejects even a small basin lying between the outline samples.
    for (const pool of POOLS) {
      if ("bounds" in pool) {
        const b = this.poolBox;
        b.minX = pool.bounds.x0; b.maxX = pool.bounds.x1; b.minZ = pool.bounds.z0; b.maxZ = pool.bounds.z1;
        if (carFootprintOverlapsBox(p.x, p.z, p.heading, half, wide, b)) return false;
      } else if (reach(p, half, wide, pool.x, pool.z) < pool.r) return false;
    }
    const s = Math.sin(p.heading), c = Math.cos(p.heading);
    const nx = Math.ceil(wide / 0.35), nz = Math.ceil(half / 0.35);
    for (let i = -nx; i <= nx; i++) for (let j = -nz; j <= nz; j++) {
      const u = i * wide / nx, v = j * half / nz, x = p.x + c * u + s * v, z = p.z - s * u + c * v;
      if (!this.dryPoint(x, z, westTime) || Math.abs(floorY(x, z) - height) > 0.29) return false;
    }
    return true;
  }

  /** Check the occupied car and a dry walk from its door across the western grounds. */
  westExit(r: Ride, time: number, out: Vector3) {
    const p = r.m, west = this.plan.westGrounds;
    if (!west || !finite(p) || p.x >= west.maxX || !this.ground.has(p.x, p.z)) return false;
    const height = floorY(p.x, p.z), s = Math.sin(p.heading), c = Math.cos(p.heading);
    this.body(p, r, PADDING);
    const { hl, hw } = this.shape;
    if (!this.clear(r, true) || !this.dryBody(p, hl, hw, height, time)) return false;
    for (const door of DOORS) {
      const side = Math.abs(door) === 1, sign = Math.sign(door), edge = side ? p.spec.wide : p.spec.half;
      const count = side ? WEST_DOOR_OFFSETS.length : 1;
      for (let j = 0; j < count; j++) {
        const offset = WEST_DOOR_OFFSETS[j];
        let clear = true;
        for (let i = 0; i <= 5; i++) {
          const step = sign * (edge + W.footOffset * i / 5);
          const u = side ? step : offset, v = side ? offset : step;
          const x = p.x + c * u + s * v, z = p.z - s * u + c * v;
          if (!this.dryPerson(x, z, height, time) || !this.foot(r, x, z, 0, true)) { clear = false; break; }
          if (i === 5) out.set(x, floorY(x, z), z);
        }
        if (clear) return true;
      }
    }
    return false;
  }

  reservation(r: Ride, b: Box) {
    copyPose(this.shape, b);
    this.shape.hl = b.hl; this.shape.hw = b.hw; this.circle = false;
    return this.clear(r, true, true);
  }

  private carKeepsFloor(r: Ride, pose: Pose, f: CarWaterFoot) {
    const n = writeCarLedges(r.model, pose.x, pose.z, pose.heading, this.walkPieces);
    for (let i = 0; i < n; i++) if (!Ledges.keepsFloor(this.walkPieces[i], f.x, f.z, WALK_RADIUS, f.y)) return false;
    return true;
  }

  private ridesKeepFloor(r: Ride, fleet: readonly Ride[], f: CarWaterFoot, doorReach: number) {
    for (const q of fleet) {
      if (q === r || Math.abs(q.m.x - f.x) >= 5 || Math.abs(q.m.z - f.z) >= 5) continue;
      if (reach(q.m, q.m.spec.half, q.m.spec.wide, f.x, f.z) < doorReach) return false;
      if (q.kind === "car" && !this.carKeepsFloor(q, q.m, f)) return false;
    }
    return true;
  }

  private walkableDoor(r: Ride, p: Pose, f: CarWaterFoot, offset: number) {
    const { ledges, rides, parked } = this.scene;
    return (!ledges || ledges.fixedKeepsFloor(f.x, f.z, WALK_RADIUS, f.y)) && this.carKeepsFloor(r, p, f)
      && this.ridesKeepFloor(r, rides, f, offset) && this.ridesKeepFloor(r, parked, f, offset);
  }

  pair(r: Ride, p: Pose, side: Side, out: Pair, reserve?: Box) {
    const { half, wide } = r.m.spec, s = Math.sin(p.heading), c = Math.cos(p.heading), height = floorY(p.x, p.z);
    this.body(p, r, PADDING);
    if (!this.clear(r, true) || !this.landingSiteClear() || !this.dryBody(p, this.shape.hl, this.shape.hw, height)) return false;
    for (let i = 0; i <= 5; i++) {
      const d = side * (wide + W.footOffset * i / 5), x = p.x + c * d, z = p.z - s * d;
      if (!this.dryPerson(x, z, height) || !this.foot(r, x, z, PADDING, true) || !this.landingSiteClear()) return false;
    }
    const f = out.foot, west = this.plan.westGrounds;
    const inWest = !!west && p.x >= west.minX && p.x < west.maxX && p.z >= west.minZ && p.z <= west.maxZ;
    f.rot = p.heading + side * Math.PI / 2; f.swim = 0;
    // The parked car's ledges are world-aligned. At a slant they can extend past the usual door step.
    const extraSteps = inWest ? DOOR_EXTRA_STEPS : 0;
    for (let i = 0; i <= extraSteps; i++) {
      const extra = i * DOOR_STEP, offset = W.footOffset + extra, d = side * (wide + offset);
      f.x = p.x + c * d; f.z = p.z - s * d; f.y = floorY(f.x, f.z);
      if (i && (!this.dryPerson(f.x, f.z, height) || !this.foot(r, f.x, f.z, PADDING, true) || !this.landingSiteClear())) return false;
      if (inWest && !this.walkableDoor(r, p, f, offset)) continue;
      if (!this.exterior(r, p, f, 0, 0)) continue;
      if (reserve) {
        const centre = side * (0.68 + extra / 2);
        reserve.x = p.x + c * centre; reserve.z = p.z - s * centre;
        reserve.heading = p.heading; reserve.hl = half + 0.2; reserve.hw = wide + 0.98 + extra / 2;
        if (!this.reservation(r, reserve)) return false;
      }
      copyPose(out.pose, p);
      out.door = side; out.offset = offset; out.valid = true;
      return true;
    }
    return false;
  }

  /** Match the first town frame, on which the stock car is back at its logical home. */
  restartFoot(r: Ride, out: CarWaterFoot) {
    const p = this.home;
    p.x = r.home.x; p.z = r.home.z; p.heading = r.home.rot;
    const { half, wide } = r.m.spec, height = floorY(p.x, p.z);
    this.body(p, r);
    if (!this.dryBody(p, this.shape.hl, this.shape.hw, height)) return false;
    const s = Math.sin(p.heading), c = Math.cos(p.heading);
    for (const door of DOORS) {
      const side = Math.abs(door) === 1, sign = Math.sign(door), length = side ? half : wide;
      for (const along of HOME_OFFSETS) {
        if (Math.abs(along) > length - 0.1) continue;
        let clear = true;
        for (let i = 0; i <= 5; i++) {
          const edge = sign * ((side ? wide : half) + W.footOffset * i / 5);
          const u = side ? edge : along, v = side ? along : edge;
          const x = p.x + u * c + v * s, z = p.z - u * s + v * c;
          out.x = Math.round(x * 100) / 100; out.z = Math.round(z * 100) / 100;
          this.person(out.x, out.z, PADDING);
          if (!this.dryPerson(out.x, out.z, height) || !this.clear(r, true, false, true)) { clear = false; break; }
        }
        if (!clear || !this.nearestHome(r, out, this.scene.rides) || !this.nearestHome(r, out, this.scene.parked)) continue;
        const d = reach(p, half, wide, out.x, out.z);
        if (d < 0.35 || d > CAR_REACH) continue;
        out.y = floorY(out.x, out.z);
        out.rot = angle(p.heading + (side ? sign * Math.PI / 2 : sign < 0 ? Math.PI : 0));
        out.swim = 0;
        return true;
      }
    }
    return false;
  }

  private nearestHome(r: Ride, f: Point, fleet: readonly Ride[]) {
    for (const q of fleet) {
      if (q === r) continue;
      const { home, m } = q;
      if (Math.abs(f.x - home.x) > m.spec.half + W.footOffset || Math.abs(f.z - home.z) > m.spec.half + W.footOffset) continue;
      if (reachBox(home.x, home.z, home.rot, m.spec.half, m.spec.wide, f.x, f.z) < W.footOffset + 0.06) return false;
    }
    return true;
  }
}

function reachBox(cx: number, cz: number, heading: number, half: number, wide: number, x: number, z: number) {
  const s = Math.sin(heading), c = Math.cos(heading), dx = x - cx, dz = z - cz;
  return Math.hypot(Math.max(0, Math.abs(dx * s + dz * c) - half), Math.max(0, Math.abs(dx * c - dz * s) - wide));
}

type WaterEvent = "contact" | "float" | "exit" | "drain" | "handback";
export interface CarWaterAdapter extends CarWaterEffectsHost {
  eligible(): boolean;
  peopleClear(clear: ClearPerson, reserved: boolean): boolean;
  arrest(): void;
  foot(foot: Readonly<CarWaterFoot>): void;
  snap(): void;
  fade(phase: "cover" | "opaque" | "reveal" | "clear"): void;
  save(): void;
  event?(event: WaterEvent, ride: Ride): void;
  drive?(ride: Ride, sample: Readonly<ReturnType<typeof createCarWaterProbe>>, time: number): void;
  pose?(ride: Ride, time: number): void;
  settle?(ride: Ride, time: number, drain: number): void;
}

export interface CarWaterHost extends Omit<CarWaterAdapter, "eligible" | "peopleClear" | "snap" | "arrest"> {
  eligible(ride: Ride): boolean;
  driver(ride: Ride): boolean;
  arrest(ride: Ride): void;
  reserve(boxes: readonly Box[]): void;
  place(ride: Ride, handback: boolean, snap: boolean, time: number, transfer?: boolean): void;
  detach(ride: Ride, foot: Readonly<CarWaterFoot>): void;
}

type Trail = Pose & { pair: Pair };

export class CarWaterRecovery {
  readonly ground;
  readonly probe = createCarWaterProbe();
  private readonly history: Trail[] = Array.from({ length: 32 }, () => ({ ...emptyPose(), pair: emptyPair() }));
  private readonly route = Array.from({ length: 33 }, emptyPose);
  private readonly lengths = new Float64Array(33);
  private readonly spares = [emptyPair(), emptyPair()];
  private readonly leases = [emptyBox(), emptyBox()];
  private readonly reservations: Box[] = [];
  private readonly proposedLease = emptyBox();
  private readonly candidate = emptyPair();
  private readonly landing = emptyPair();
  private readonly lastDry = emptyPair();
  private readonly restart = emptyFoot();
  private readonly search = emptyPose();
  private readonly trial = emptyPose();
  private readonly sweepPose = emptyPose();
  private readonly turnFrom = emptyPose();
  private readonly sideFoot = emptyFoot();
  private readonly testFoot = emptyFoot();
  private readonly sweepFoot = emptyFoot();
  private readonly outside = emptyFoot();
  private readonly face = new Vector3();
  private readonly driveFrom = emptyPose();
  private readonly lastRegionCheck = emptyPose();
  private readonly settingsBuffer: WetDriveSettings = { forward: 0, reverse: 0, steerGain: 0, decel: W.decel };
  private readonly searchX: number;
  private readonly searchZ = SHORE.top + 6;
  private readonly searchCols: number;
  private readonly searchLimit: number;
  private readonly areas: readonly CarWaterArea[];
  private car: Ride | null = null;
  private area: CarWaterArea | undefined;
  private restartValid = false;
  private episode = 0;
  private firstWet = Infinity;
  private drySince = Infinity;
  private started = Infinity;
  private deadline = Infinity;
  private lastFrame = -Infinity;
  private lastCheck = -Infinity;
  private scan = 0;
  private head = 0;
  private count = 0;
  private routeCount = 0;
  private routeAt = 1;
  private routeDistance = 0;
  private progressed = 0;
  private age = 0;
  private time = 0;
  private frameDt = 0;
  private fadeAt = Infinity;
  private landedAt = Infinity;
  private exitAt = Infinity;
  private startY = 0;
  private startPitch = 0;
  private inlandTurn = 0;
  private footDoor: Door = 1;
  private footStep: ExitStep = EXIT_STEPS[0];
  private exitWanted = false;
  private assisted = false;
  private blockedRoute = false;
  private usedFallback = false;
  private revealFrames = 0;
  private revealEnd = Infinity;
  private disposed = false;
  private reason: Reason | null = null;
  private lastLanding: "trail" | "spare" | null = null;
  private bodyAt = 0;
  private sampled = false;
  private loaded = false;
  private miss = false;
  private effects?: CarWaterEffects;

  constructor(private readonly plan: CarWaterPlan, private readonly clearance: CarWaterClearance,
    private readonly host: CarWaterHost, private readonly clock = () => performance.now()) {
    this.ground = clearance.ground;
    this.areas = plan.areas;
    const { x0, x1, z1 } = plan.mainland;
    this.searchX = x0 + 5;
    this.searchCols = Math.floor((x1 - 5 - this.searchX) / 4) + 1;
    this.searchLimit = 2 * this.searchCols * (Math.floor((z1 - 5 - this.searchZ) / 4) + 1);
  }

  begin(r: Ride) {
    if (this.disposed || this.car === r || !this.host.eligible(r) || !this.host.driver(r)) return;
    // The learner can reboard the same dry car while its sills are still draining.
    if (this.car || !this.draining(r)) this.transfer();
    this.car = r;
    this.episode++;
    this.reason = this.lastLanding = null;
    this.landing.valid = false;
    this.usedFallback = false;
    this.lastFrame = this.clock();
    this.maintain(r, true);
  }

  private get spareCount() { return Number(this.spares[0].valid) + Number(this.spares[1].valid); }
  private get admitted() { return this.restartValid && this.spareCount >= 2; }
  get wet() { return this.firstWet < Infinity; }
  get returning() { return this.started < Infinity; }
  get assistedOnFoot() { return this.assisted; }
  owns(r: Ride | null) { return r !== null && r === this.car && (this.wet || this.returning); }
  open(r: Ride) {
    return r === this.car && (this.admitted || this.wet) && this.host.eligible(r) && this.host.driver(r);
  }
  usesChassis(r: Ride) {
    const p = this.probe;
    return this.owns(r) || this.open(r) && this.sampled && (p.centre.floor !== 0 || p.pitch !== 0
      || p.frontLeft.floor !== 0 || p.frontRight.floor !== 0 || p.rearLeft.floor !== 0 || p.rearRight.floor !== 0);
  }
  draining(r: Ride) { return this.effects?.isDrainSource(r) ?? false; }

  safeSave() { return this.restartValid && (this.wet || this.returning) ? this.restart : undefined; }

  private region(r: Ride) {
    let area: CarWaterArea | undefined, best = Infinity;
    for (const candidate of this.areas) {
      // The coast extends beyond its three approaches. Use the actual shore, and the inland approach distances.
      let d = candidate.id === "coast" ? Math.abs(r.m.z - SHORE.top) + 3 : Infinity;
      for (const p of candidate.approaches) d = Math.min(d, distance(r.m, p));
      if (d < best) { best = d; area = candidate; }
    }
    return area;
  }

  private publish() {
    let n = 0;
    for (let i = 0; i < 2; i++) if (this.spares[i].valid) this.reservations[n++] = this.leases[i];
    this.reservations.length = n;
    this.host.reserve(n ? this.reservations : NO_BOXES);
  }

  private trySpare(r: Ride, slot: number, p: Pose) {
    const other = this.spares[1 - slot];
    if (other.valid && distance(other.pose, p) < SEPARATION) return false;
    if (!this.pairAt(r, p, this.candidate, this.proposedLease)) return false;
    copyPair(this.spares[slot], this.candidate);
    Object.assign(this.leases[slot], this.proposedLease);
    return true;
  }

  private localSpare(r: Ride, slot: number, area: CarWaterArea, localOnly: boolean) {
    const p = this.search;
    let nearest = Infinity, selected = -1;
    for (let i = 0; i < area.landings.length; i++) {
      const at = area.landings[i];
      p.x = at.x; p.z = at.z; p.heading = at.rot;
      const d = distance(r.m, p);
      if (d >= nearest || localOnly && d > 65) continue;
      const other = this.spares[1 - slot];
      if (other.valid && distance(other.pose, p) < SEPARATION) continue;
      if (this.pairAt(r, p, this.candidate, this.proposedLease)) { nearest = d; selected = i; }
    }
    if (selected < 0) {
      if (area.id !== "coast") return false;
      // The western coast has no named landing. Check both rows of the inland strip around the approach.
      const column = Math.round((r.m.x - this.searchX) / 4);
      for (let offset = 0; offset <= 10; offset++) {
        const i = column + (offset % 2 ? -1 : 1) * Math.ceil(offset / 2);
        if (i < 0 || i >= this.searchCols) continue;
        p.x = this.searchX + i * 4; p.heading = 0;
        for (let row = 0; row < 2; row++) {
          p.z = this.searchZ + row * COAST_SPARE_INSET;
          if (this.trySpare(r, slot, p)) return true;
        }
      }
      return false;
    }
    const at = area.landings[selected];
    p.x = at.x; p.z = at.z; p.heading = at.rot;
    return this.trySpare(r, slot, p);
  }

  private acquire(r: Ride, budget: number) {
    for (let slot = 0; slot < 2; slot++) {
      if (this.spares[slot].valid) continue;
      if (this.area && this.localSpare(r, slot, this.area, true)) continue;
      const end = Math.min(this.searchLimit, this.scan + budget), p = this.search;
      while (this.scan < end) {
        const k = this.scan++, cell = Math.floor(k / 2);
        const row = Math.floor(cell / this.searchCols), alternate = k % 2;
        const coast = row === 0 || this.area?.id === "coast";
        p.x = this.searchX + cell % this.searchCols * 4;
        // The first row is coastal even before region selection. Try farther inland if the tail would hit the seafront.
        p.z = this.searchZ + row * 4 + (coast ? alternate * COAST_SPARE_INSET : 0);
        p.heading = coast ? 0 : alternate * Math.PI / 2;
        if (this.trySpare(r, slot, p)) break;
      }
    }
    this.publish();
  }

  private maintain(r: Ride, force = false) {
    const now = this.clock(), near = nearWater(r.m.x, r.m.z, 17);
    if (!force && !this.wet && !this.returning && now - this.lastCheck < (near ? 65 : 180)) return;
    this.lastCheck = now;
    if (!this.restartValid) this.restartValid = this.clearance.restartFoot(r, this.restart);
    if (!this.restartValid) return;
    let changed = false;
    for (let i = 0; i < 2; i++) if (this.spares[i].valid && !this.clearance.reservation(r, this.leases[i])) {
      this.spares[i].valid = false;
      changed = true;
    }
    const area = this.region(r);
    if (!this.wet && !this.returning && area && near && (area !== this.area || distance(r.m, this.lastRegionCheck) > 28)) {
      this.area = area;
      copyPose(this.lastRegionCheck, r.m);
      // Refresh one at a time. Keep the still-live mainland lease until a new pair has passed every check.
      for (let i = 0; i < 2; i++) this.localSpare(r, i, area, true);
      changed = true;
    }
    if (changed || force || this.scan >= this.searchLimit) this.scan = 0;
    if (this.spareCount < 2) this.acquire(r, this.wet || this.returning ? this.searchLimit : 12);
    else if (changed) this.publish();
    if (this.wet && !this.returning && this.spareCount === 0) this.start(r, "invalid", now);
  }

  fleetChanged() { if (this.car) this.maintain(this.car, true); }

  resetPose(r: Ride) {
    if (this.car !== r) { this.fleetChanged(); return; }
    this.count = this.head = 0;
    this.sampled = false;
    this.lastDry.valid = false;
    this.maintain(r, true);
  }

  private stillClear(r: Ride, pair: Pair, lease?: Box) {
    return pair.valid && (this.clearance.pair(r, pair.pose, pair.door, this.candidate, lease)
      || this.clearance.pair(r, pair.pose, pair.door === 1 ? -1 : 1, this.candidate, lease));
  }

  private available(r: Ride) {
    const [a, b] = this.spares;
    const nearest = b.valid && (!a.valid || distance(r.m, b.pose) < distance(r.m, a.pose)) ? 1 : 0;
    return this.stillClear(r, this.spares[nearest], this.proposedLease)
      || this.stillClear(r, this.spares[1 - nearest], this.proposedLease) ? this.candidate : undefined;
  }

  private fallback(r: Ride) {
    const alternate = this.available(r);
    if (alternate) return alternate;
    if (this.stillClear(r, this.lastDry, this.proposedLease)) return this.candidate;
    for (const pair of this.spares) pair.valid = false;
    this.scan = 0;
    this.area = this.region(r) ?? this.area;
    this.acquire(r, this.searchLimit);
    return this.spares.find(pair => pair.valid);
  }

  private clearIncident() {
    this.firstWet = this.drySince = this.started = this.deadline = Infinity;
    this.fadeAt = this.landedAt = this.exitAt = Infinity;
    this.age = 0;
    this.assisted = this.exitWanted = this.blockedRoute = this.loaded = this.miss = false;
    this.probe.band = "dry";
    this.sampled = false;
    this.scan = 0; this.lastCheck = -Infinity;
    this.area = undefined;
    this.effects?.endWet();
    for (const pair of this.spares) pair.valid = false;
    this.publish();
  }

  transfer() {
    const r = this.car;
    const moved = r !== null && this.owns(r) && this.finish(r, true);
    if (!moved) this.clearIncident();
    this.effects?.cancel();
    this.car = null;
    this.restartValid = this.lastDry.valid = false;
    this.count = this.head = 0;
    this.revealFrames = 0; this.revealEnd = Infinity;
    this.host.fade("clear");
    return moved;
  }

  dispose() {
    this.transfer();
    this.effects?.dispose();
    this.disposed = true;
  }

  cancelEffects(r?: Ride) {
    if (!r || this.car === r || this.draining(r)) this.effects?.cancel();
  }

  private waterEffects() { return this.effects ??= new CarWaterEffects(this.host, this.clearance.rails); }

  /** First in the player update, including while on foot, blocked or in a transition. */
  tick(dt: number, time: number, resumed = false) {
    const r = this.car;
    this.time = time;
    if (!r) {
      if (resumed) this.effects?.discontinuity();
      this.effects?.rest(time);
      return false;
    }
    const now = this.clock(), discontinuity = resumed || now - this.lastFrame >= 500;
    if (resumed || now - this.lastFrame > 200) this.effects?.discontinuity();
    this.lastFrame = now;
    this.frameDt = dt;
    if (!this.host.eligible(r)) { this.transfer(); return false; }
    if (!this.host.driver(r) && !this.returning) {
      if (!this.wet) { this.transfer(); return false; }
      this.start(r, "driver-lost", now);
    }
    if (this.wet && !this.returning && now >= this.firstWet + WET_LIMIT) this.start(r, "wet-limit", this.firstWet + WET_LIMIT);
    if (this.returning && (now >= this.deadline || !finite(r.m))) {
      this.finish(r);
      return true;
    }
    if (!this.returning) this.maintain(r);
    if (!this.returning) {
      if (!this.wet) this.effects?.rest(time);
      return false;
    }
    this.effects?.rest(time);
    if (discontinuity) {
      this.finish(r);
      return true;
    }
    this.age = Math.max(0, (now - this.started) / 1000);
    this.advance(r);
    return true;
  }

  accepted(r: Ride, time: number, throttle = 0, settled = true) {
    if (!this.open(r) || this.returning) return this.returning;
    this.time = time;
    const m = r.m, now = this.clock();
    if (!finite(m)) {
      this.start(r, "invalid", now);
      this.finish(r);
      return true;
    }
    if (!this.wet && !nearWater(m.x, m.z, 17)) {
      this.probe.band = "dry";
      this.sampled = false;
      if (settled) this.effects?.rest(time);
      return false;
    }
    const previous = this.probe.band;
    this.sampled = true;
    probeCarWater(m, time, previous, this.probe);
    if (this.probe.band === "body-deep" && previous !== "body-deep") this.bodyAt = now;
    if (Math.max(this.probe.centre.depth, this.probe.maxTireDepth) > 0) {
      this.drySince = Infinity;
      if (!this.wet) {
        this.firstWet = now;
        this.host.event?.("contact", r);
      }
    } else if (this.wet && this.probe.band === "dry") {
      this.drySince = Math.min(this.drySince, now);
      if (now - this.drySince >= W.dryRearmSeconds * 1000 && this.pairAt(r, m, this.candidate)) {
        this.clearIncident();
        this.count = this.head = 0;
      }
    }
    this.record(r);
    const floating = this.probe.band === "float";
    if ((settled || floating) && this.wet) {
      if (this.probe.band !== "dry") this.waterEffects();
      this.effects?.drive(r, this.probe, time, this.frameDt);
    }
    if (floating) this.start(r, "depth", now);
    if (!this.returning && now >= this.firstWet + WET_LIMIT) this.start(r, "wet-limit", this.firstWet + WET_LIMIT);
    if (this.returning && now >= this.deadline) { this.finish(r); return true; }
    this.readThrottle(throttle);
    if (settled && this.wet && !this.returning) {
      if (!this.draining(r)) this.effects?.motorSignal(this.probe.band === "body-deep" && this.loaded && this.miss ? -1 : 0);
      this.host.drive?.(r, this.probe, time);
    }
    return this.returning;
  }

  private readThrottle(throttle: number) {
    this.loaded = Math.abs(throttle) > 0.1;
    this.miss = sputterMiss((this.clock() - this.bodyAt) / 1000);
  }

  settings(c: Controls) {
    const base = wetDriveSettings(this.probe.band);
    if (!base || this.probe.band !== "body-deep") return base;
    this.readThrottle(c.brake ? 0 : c.throttle);
    Object.assign(this.settingsBuffer, base);
    this.settingsBuffer.power = this.loaded && this.miss ? W.sputter.missPower : 1;
    return this.settingsBuffer;
  }

  revs(r: Ride, stock: number) {
    if (this.draining(r)) return this.effects!.motor(r, this.time);
    if (!this.owns(r)) return stock;
    if (this.returning) return 0;
    return this.probe.band === "body-deep" && this.loaded ? this.miss ? W.sputter.missRevs : W.sputter.loadRevs : stock;
  }

  private pairAt(r: Ride, p: Pose, out: Pair, lease?: Box) {
    return this.clearance.pair(r, p, 1, out, lease) || this.clearance.pair(r, p, -1, out, lease);
  }

  private record(r: Ride) {
    const m = r.m, last = this.count ? this.history[(this.head + 31) % 32] : undefined;
    if (last && distance(m, last) < 0.75 && Math.abs(angle(m.heading - last.heading)) < 0.24) return;
    const node = this.history[this.head];
    copyPose(node, m);
    node.pair.valid = false;
    if (this.probe.band === "dry" && (!this.lastDry.valid || distance(this.lastDry.pose, m) >= 1.5)
      && this.pairAt(r, m, node.pair)) copyPair(this.lastDry, node.pair);
    this.head = (this.head + 1) % 32;
    this.count = Math.min(32, this.count + 1);
  }

  private wetFoot(x: number, z: number) {
    for (let i = -1; i < 8; i++) {
      const r = i < 0 ? 0 : W.footRadius, px = x + Math.cos(i * Math.PI / 4) * r, pz = z + Math.sin(i * Math.PI / 4) * r;
      const live = waterY(px, pz, this.time);
      if (live !== null && floorY(px, pz) < live) return true;
    }
    return false;
  }

  westExit(r: Ride, time: number, out: Vector3) {
    return r === this.car && !this.wet && !this.returning && this.host.eligible(r) && this.host.driver(r)
      && this.clearance.westExit(r, time, out);
  }

  requestExit(r: Ride, spot: Point | null, time: number) {
    if (r !== this.car || !this.returning && !this.open(r)) return false;
    this.time = time;
    if (!this.returning) {
      if (!this.wet && !nearWater(r.m.x, r.m.z, 7)) return false;
      probeCarWater(r.m, time, this.probe.band, this.probe);
      let wetDoor = spot !== null && this.wetFoot(spot.x, spot.z);
      if (!spot) for (const door of DOORS) {
        this.beside(r, r.m, door, W.footOffset, this.testFoot);
        wetDoor ||= this.wetFoot(this.testFoot.x, this.testFoot.z);
      }
      if (!this.wet && !wetDoor && this.probe.centre.depth <= 0 && this.probe.maxTireDepth <= 0) return false;
      if (this.probe.band !== "dry" && finite(r.m)) this.waterEffects().drive(r, this.probe, time, this.frameDt);
      this.exitWanted = true;
      this.start(r, "exit", this.clock());
      return true;
    }
    if (this.exitWanted) return true;
    this.exitWanted = true;
    if (this.clock() >= this.deadline) return true;
    if (!this.assisted) {
      if (this.landedAt === Infinity) this.stepOut(r);
      else if (this.stillClear(r, this.landing)) {
        copyPair(this.landing, this.candidate);
        this.footDoor = this.landing.door;
        this.putFoot(r, this.landing.foot);
      }
    }
    return true;
  }

  private start(r: Ride, reason: Reason, now: number) {
    if (this.returning) return;
    this.effects?.rest(this.time);
    this.effects?.motorSignal(0);
    this.reason = reason; this.started = now;
    this.deadline = Math.min(now + RETURN_LIMIT, this.firstWet + WET_LIMIT + RETURN_LIMIT);
    this.age = this.progressed = 0;
    this.routeAt = 1;
    this.landing.valid = this.usedFallback = false;
    this.lastLanding = null;
    this.startY = r.mesh.position.y;
    this.startPitch = clamp(r.mesh.rotation.x, -0.09, 0.09);
    this.exitWanted ||= !this.host.driver(r);
    this.host.arrest(r);
    this.host.event?.("float", r);
    if (!finite(r.m)) return;
    if (this.exitWanted) this.stepOut(r);
    this.buildRoute(r);
    this.host.place(r, false, false, this.time);
  }

  private beside(r: Ride, p: Pose, door: Door, offset: number, out: CarWaterFoot, sill = 0, turn = 0) {
    const s = Math.sin(p.heading), c = Math.cos(p.heading), side = Math.abs(door) === 1;
    const { half, wide } = r.m.spec, bumper = CONVERTIBLE_BUMPER;
    const end = r.model ? half : Math.max(half, bumper.offset + bumper.depth / 2);
    const across = side ? door * (wide + offset) : sill;
    const along = side ? sill : Math.sign(door) * (end + offset);
    out.x = p.x + across * c + along * s; out.z = p.z - across * s + along * c;
    out.rot = p.heading + (side ? door * Math.PI / 2 : door < 0 ? Math.PI : 0) + turn;
    this.footHeight(out);
  }

  private exitFoot(r: Ride, p: Pose, door: Door, step: ExitStep, k: number, out: CarWaterFoot) {
    const turn = Math.abs(door) === 1 ? Math.sign(door) : -Math.sign(door);
    this.beside(r, p, door, step.start + (step.end - step.start) * k, out, step.sill * k, turn * step.turn);
  }

  private footHeight(out: CarWaterFoot) {
    const floor = floorY(out.x, out.z), live = waterY(out.x, out.z, this.time);
    out.swim = live !== null && live - floor > 0.58 ? 1 : 0;
    out.y = out.swim && live !== null ? Math.max(floor, live - 0.68) : floor;
  }

  private stepOut(r: Ride) {
    if (!finite(r.m) || this.assisted || !this.clearance.car(r, r.m)) return;
    const { x, z } = r.m;
    const sill = Math.max(floorY(x, z), (waterY(x, z, this.time) ?? -Infinity) - 0.68);
    let best = -Infinity;
    for (const door of DOORS) {
      if (door === 2 && best > -Infinity) break;
      for (const step of EXIT_STEPS) {
        this.exitFoot(r, r.m, door, step, 0, this.testFoot);
        // The first detached position must be within stepping or lowering distance of the car's support.
        if (this.testFoot.y > sill + 0.55 || this.testFoot.y < sill - 1.45) continue;
        this.exitFoot(r, r.m, door, step, 1, this.sideFoot);
        if (!this.footSweep(r, r.m, this.testFoot, this.sideFoot)) continue;
        const h = floorY(this.sideFoot.x, this.sideFoot.z);
        if (h > best) {
          best = h; this.footDoor = door; this.footStep = step;
          Object.assign(this.outside, this.testFoot);
        }
        break;
      }
    }
    if (best === -Infinity) { this.blockedRoute = true; return; }
    this.exitAt = this.age;
    this.putFoot(r, this.outside);
  }

  private putFoot(r: Ride, foot: CarWaterFoot) {
    if (!this.assisted) {
      this.assisted = true;
      this.host.detach(r, foot);
      this.host.event?.("exit", r);
    }
    this.host.foot(foot);
  }

  private footSweep(r: Ride, car: Pose, from: CarWaterFoot, to: CarWaterFoot) {
    const turn = angle(to.rot - from.rot), f = this.sweepFoot;
    const length = distance(from, to) + Math.abs(turn) * 0.75;
    const n = Math.max(1, Math.ceil(length / STEP)), halfStep = length / (2 * n);
    let y = from.y;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      f.x = from.x + (to.x - from.x) * k; f.z = from.z + (to.z - from.z) * k;
      f.rot = from.rot + turn * k;
      this.footHeight(f);
      if (Math.abs(f.y - y) > FOOT_RISE || !this.clearance.exterior(r, car, f, this.time, halfStep)) return false;
      y = f.y;
    }
    return true;
  }

  private swept(r: Ride, a: Pose, b: Pose, door: Door | 0, step?: ExitStep, startY?: number,
    fromOffset: number = W.footOffset, toOffset = fromOffset) {
    const turn = Math.abs(angle(b.heading - a.heading));
    const length = distance(a, b) + Math.abs(toOffset - fromOffset)
      + turn * (r.m.spec.half + Math.max(fromOffset, toOffset) + (door ? 0.75 : 0));
    const n = Math.max(1, Math.ceil(length / STEP)), halfStep = length / (2 * n);
    if (n > 128 || Math.abs(floorY(a.x, a.z) - floorY(b.x, b.z)) > 1) return false;
    let y = startY;
    for (let i = 0; i <= n; i++) {
      const p = this.sweepPose;
      const k = i / n;
      mixPose(p, a, b, k);
      if (!this.clearance.car(r, p)) return false;
      if (door) {
        if (step) this.exitFoot(r, p, door, step, 1, this.sideFoot);
        else this.beside(r, p, door, fromOffset + (toOffset - fromOffset) * k, this.sideFoot);
        if ((y !== undefined && Math.abs(this.sideFoot.y - y) > FOOT_RISE)
          || !this.clearance.exterior(r, p, this.sideFoot, this.time, halfStep)) return false;
        y = this.sideFoot.y;
      }
    }
    return true;
  }

  private buildRoute(r: Ride) {
    this.routeCount = 0;
    if (this.blockedRoute) return;
    const door = this.assisted ? this.footDoor : 0;
    copyPose(this.route[0], r.m);
    this.lengths[0] = 0;
    for (let i = 1; i <= this.count; i++) {
      const node = this.history[(this.head + 32 - i) % 32], previous = this.route[i - 1];
      const span = Math.max(distance(previous, node), Math.abs(angle(node.heading - previous.heading)) * (r.m.spec.half + W.footOffset));
      if (span > 1.8 || this.lengths[i - 1] + span > TOW_SPEED * (TOW_END - FLOAT - 0.16)
        || !this.swept(r, previous, node, door, door ? this.footStep : undefined)) break;
      copyPose(this.route[i], node);
      this.lengths[i] = this.lengths[i - 1] + span;
      if (node.pair.valid && (door === 0 || Math.abs(door) === 1)
        && (door ? this.clearance.pair(r, node, door as Side, this.landing) : this.pairAt(r, node, this.landing))) {
        this.routeCount = i + 1;
        this.routeDistance = this.lengths[i];
        break;
      }
    }
  }

  private advance(r: Ride) {
    // A blocked step out waits for the same update that will present the covered pair.
    if (this.exitWanted && !this.assisted) { this.coveredLanding(r); return; }
    if (this.landedAt < Infinity) {
      const drain = this.age - this.landedAt;
      if (drain >= DRAIN) { this.finish(r); return; }
      if (!this.stillClear(r, this.landing) || this.assisted && this.candidate.door !== this.landing.door) {
        this.coveredLanding(r);
        return;
      }
      this.maintain(r);
      if (this.inlandTurn) this.turnInland(r, drain);
      this.host.place(r, false, false, this.time);
      this.effects?.posed(r, this.time);
      this.host.settle?.(r, this.time, Math.max(0, 1 - drain / DRAIN));
      return;
    }
    if (this.assisted) {
      const k = clamp((this.age - this.exitAt) / FOOT_STEP, 0, 1);
      if (this.fadeAt === Infinity) this.exitFoot(r, r.m, this.footDoor, this.footStep, k, this.sideFoot);
      else {
        Object.assign(this.sideFoot, this.outside);
        this.footHeight(this.sideFoot);
      }
      if (!this.footSweep(r, r.m, this.outside, this.sideFoot)) { this.coveredLanding(r); return; }
      Object.assign(this.outside, this.sideFoot);
    }
    if (this.age >= FLOAT) {
      if (!this.blockedRoute && this.routeCount && this.fadeAt === Infinity) this.tow(r);
      if (this.landedAt < Infinity) return;
      const tooFar = this.progressed + Math.max(0, TOW_END - this.age) * TOW_SPEED < this.routeDistance;
      if (this.fadeAt === Infinity && (this.age >= TOW_END ||
        this.age >= TOW_END - FADE && (this.blockedRoute || !this.routeCount || tooFar))) {
        this.fadeAt = this.age;
        this.effects?.discontinuity();
        this.host.fade("cover");
      }
      if (this.age >= this.fadeAt + FADE) { this.coveredLanding(r); return; }
    }
    this.maintain(r);
    this.host.place(r, false, false, this.time);
    if (this.assisted) this.host.foot(this.outside);
  }

  private tow(r: Ride) {
    if (this.exitWanted && (!this.assisted || this.age - this.exitAt < FOOT_STEP)) return;
    const run = TOW_END - FLOAT, ramp = 0.16;
    const t = clamp(this.age - FLOAT, 0, run), endTime = Math.min(t, run - t), u = endTime / ramp;
    const ease = u < 1 ? ramp * (u ** 3 - 0.5 * u ** 4) : endTime - ramp * 0.5;
    const distance = (t <= run / 2 ? ease : run - ramp - ease) * this.routeDistance / (run - ramp);
    const end = Math.min(this.routeDistance, distance, this.progressed + TOW_SPEED * this.frameDt);
    while (this.progressed < end && this.routeAt < this.routeCount) {
      const i = this.routeAt, before = this.lengths[i - 1], after = this.lengths[i];
      const next = Math.min(end, after);
      mixPose(this.trial, this.route[i - 1], this.route[i], after > before ? (next - before) / (after - before) : 1);
      if (!this.swept(r, r.m, this.trial, this.assisted ? this.footDoor : 0,
        this.assisted ? this.footStep : undefined, this.assisted ? this.outside.y : undefined)) {
        this.blockedRoute = true; return;
      }
      if (this.assisted) Object.assign(this.outside, this.sideFoot);
      copyPose(r.m, this.trial);
      this.progressed = next;
      if (next === after) this.routeAt++;
    }
    if (this.age + 1e-6 < TOW_END || this.progressed < this.routeDistance - 1e-5) return;
    if (!this.stillClear(r, this.landing) || this.assisted && (this.footDoor !== this.candidate.door
      || !this.footSweep(r, r.m, this.outside, this.candidate.foot))) {
      this.blockedRoute = true;
      return;
    }
    this.land(r, this.candidate);
  }

  private setLanding(r: Ride, pair: Pair, landing: "trail" | "spare") {
    copyPair(this.landing, pair);
    this.usedFallback = landing === "spare";
    this.lastLanding = landing;
    const { x, z, heading } = this.landing.pose;
    r.m.set(x, z, heading);
    probeCarWater(r.m, this.time, "dry", this.probe);
    this.landedAt = this.age;
    this.inlandTurn = 0;
  }

  private land(r: Ride, pair: Pair) {
    const wet = this.wet || this.probe.maxTireDepth > 0 || this.probe.centre.depth > 0;
    this.setLanding(r, pair, "trail");
    const { x, z, heading } = this.landing.pose;
    const pool = this.plan.cenote;
    const inland = this.area?.id === "cenote" && pool ? Math.atan2(x - pool.x, z - pool.z) : 0;
    const turn = angle(inland - heading);
    if (Math.abs(turn) > 0.1) {
      copyPose(this.trial, r.m);
      this.trial.heading = inland;
      if (this.turnClear(r)) {
        copyPose(this.turnFrom, r.m);
        this.inlandTurn = turn;
      }
    }
    this.placeLanding(r, false, false);
    if (wet) {
      const effects = this.waterEffects();
      effects.beginDrain(r, this.time, false);
      effects.posed(r, this.time);
    }
    this.host.event?.("drain", r);
  }

  private placeLanding(r: Ride, handback: boolean, snap: boolean, transfer = false) {
    if (!transfer && (this.exitWanted || this.assisted || !this.host.driver(r))) {
      this.footDoor = this.landing.door;
      this.putFoot(r, this.landing.foot);
    }
    this.host.place(r, handback, snap, this.time, transfer);
  }

  private coveredLanding(r: Ride, transfer = false) {
    const pair = this.fallback(r);
    if (!pair) return false;
    const wet = this.wet || this.probe.maxTireDepth > 0 || this.probe.centre.depth > 0;
    const wasLanded = this.landedAt < Infinity;
    if (!transfer) this.host.fade("opaque");
    this.setLanding(r, pair, "spare");
    this.placeLanding(r, true, !transfer, transfer);
    if (!transfer) {
      if (wet) {
        const effects = this.waterEffects();
        effects.beginDrain(r, this.time, true);
        effects.posed(r, this.time);
      }
      if (!wasLanded) this.host.event?.("drain", r);
      this.revealFrames = 2;
      this.revealEnd = Infinity;
    }
    this.release(r, transfer);
    return true;
  }

  private turnInland(r: Ride, age: number) {
    const u = clamp(age / (DRAIN - 0.04), 0, 1);
    copyPose(this.trial, this.turnFrom);
    this.trial.heading += this.inlandTurn * u * u * (3 - 2 * u);
    if (!this.turnClear(r)) {
      this.inlandTurn = 0;
      return;
    }
    copyPose(r.m, this.trial);
    copyPair(this.landing, this.candidate);
    if (this.assisted) this.host.foot(this.landing.foot);
  }

  private turnClear(r: Ride) {
    const { door, foot, offset } = this.landing;
    return this.clearance.pair(r, this.trial, door, this.candidate)
      && this.swept(r, r.m, this.trial, door, undefined, foot.y, offset, this.candidate.offset);
  }

  private finish(r: Ride, transfer = false) {
    if (this.landedAt === Infinity || !this.stillClear(r, this.landing) || this.assisted && this.candidate.door !== this.landing.door) {
      return this.coveredLanding(r, transfer);
    }
    copyPair(this.landing, this.candidate);
    this.placeLanding(r, true, false, transfer);
    if (!transfer) this.effects?.posed(r, this.time);
    this.release(r, transfer);
    return true;
  }

  private release(r: Ride, transfer: boolean) {
    // Saving still reads the checked restart foot beside the car's logical home.
    if (!transfer) this.host.save();
    this.clearIncident();
    this.count = this.head = 0;
    this.lastDry.valid = false;
    if (transfer || !this.host.driver(r)) this.car = null;
    if (!transfer) this.host.event?.("handback", r);
  }

  /** Reveal only after the relocated pair and the snapped rig have been presented under cover. */
  presented() {
    const now = this.clock();
    if (this.revealFrames > 0 && --this.revealFrames === 0) {
      this.host.fade("reveal");
      this.revealEnd = now + FADE * 1000;
    } else if (now >= this.revealEnd) {
      this.revealEnd = Infinity;
      this.host.fade("clear");
    }
  }

  private support(r: Ride, time: number, height: number, immersion: boolean) {
    const { m, mesh } = r;
    if (!immersion) return supportedCarWaterHeight(m, mesh.quaternion, time, height, false);
    const face = this.face.set(CAR_SEATS.driver[0], CAR_SEATS.floor + CAR_SEATS.seat + 0.52, CAR_SEATS.driver[1])
      .applyQuaternion(mesh.quaternion);
    face.x += m.x; face.z += m.z; face.y += height;
    return supportedCarWaterHeight(m, mesh.quaternion, time, height, true, face);
  }

  /** Support the stock dry orientation even if the water probe was flat or skipped. */
  supportDryPose(r: Ride, time: number) {
    if (r === this.car && this.host.eligible(r)) r.mesh.position.y = this.support(r, time, r.mesh.position.y, false);
  }

  pose(r: Ride, time: number, y: number, pitch: number, roll: number, roadGrade: boolean) {
    const m = r.m, mesh = r.mesh, p = this.probe, afloat = this.landedAt === Infinity;
    let grounding = 0;
    if (this.returning) {
      if (afloat) {
        probeCarWater(m, time, p.band, p);
        const blend = clamp(this.age / FLOAT, 0, 1);
        const front = (p.frontLeft.depth + p.frontRight.depth) / 2, rear = (p.rearLeft.depth + p.rearRight.depth) / 2;
        const u = clamp((0.38 - Math.min(front, rear)) / 0.34, 0, 1);
        grounding = blend * u * u * (3 - 2 * u);
        pitch = this.startPitch * (1 - blend) - 0.09 * blend + (Math.max(-0.09, p.pitch) + 0.09) * grounding;
        const floating = (p.centre.liveSurface ?? p.centre.floor) - 0.28 + 0.07 * Math.sin(this.age * 2 * Math.PI / 0.70);
        y = this.startY + (floating - this.startY) * blend;
      } else {
        y = floorY(m.x, m.z);
        pitch = 0;
      }
      roll = 0;
    } else if (!roadGrade) {
      y += p.centre.floor;
      pitch += p.pitch + (p.band === "body-deep" && this.miss && this.loaded ? 0.018 : 0);
    }
    const wet = this.wet || this.returning;
    pitch = clamp(pitch + (this.effects?.pitch(r, time) ?? 0), -W.maxPitch, W.maxPitch);
    mesh.rotation.set(pitch, m.heading, roll);
    if (grounding) {
      const bed = this.support(r, time, -Infinity, false);
      y += (bed - y) * grounding;
    }
    mesh.position.set(m.x, this.support(r, time, y, wet && afloat), m.z);
    if (!this.returning) this.effects?.posed(r, time);
    this.host.pose?.(r, time);
  }

  learnerFace(ch: GameCharacter, time: number) {
    const r = this.car;
    if (!r || this.assisted || !this.owns(r) || !ch.headPosition) return;
    const head = ch.headPosition(this.face);
    const live = waterY(head.x, head.z, time);
    // Allow for the small offset from the head joint to the visible face.
    const raise = Math.max(floorY(head.x, head.z), (live ?? -Infinity) + W.faceClear + 0.07) - head.y;
    if (raise <= 0) return;
    ch.root.position.y += raise;
    if (this.host.driver(r)) r.mesh.position.y += raise;
  }

  cameraFloor(p: { x: number; y: number; z: number }, time: number) {
    if (!this.wet && !this.returning && !this.revealFrames) return;
    const live = waterY(p.x, p.z, time);
    p.y = Math.max(p.y, floorY(p.x, p.z), (live ?? -Infinity) + W.cameraClear);
  }

  beforeDrive(x: number, z: number, heading: number) {
    this.driveFrom.x = x; this.driveFrom.z = z; this.driveFrom.heading = heading;
  }
  railContact(r: Ride) { return this.clearance.railContact(this.driveFrom, r); }
  hullsClear(r: Ride) { return this.clearance.hullsSweep(r, this.driveFrom, this.trial); }

  inspect() {
    const p = !this.car || this.sampled || this.returning ? this.probe : createCarWaterProbe();
    if (p !== this.probe && this.car && finite(this.car.m)) probeCarWater(this.car.m, this.time, this.probe.band, p);
    const limits = wetDriveSettings(this.probe.band), now = this.clock();
    const phase = !this.car ? "idle" : !this.returning ? this.admitted ? "driving" : "acquiring"
      : this.landedAt < Infinity ? "settle" : this.fadeAt < Infinity ? "fade"
        : this.age < FLOAT || this.blockedRoute || !this.routeCount ? "float" : "tow";
    return {
      active: this.wet || this.returning, enabled: this.admitted, id: this.car?.id ?? null, episode: this.episode,
      region: this.area?.id ?? null, phase, reason: this.reason, age: this.age,
      wetAge: this.wet ? (now - this.firstWet) / 1000 : 0,
      secondsLeft: this.returning ? Math.max(0, (this.deadline - now) / 1000) : null,
      wetDeadline: this.wet ? this.firstWet + WET_LIMIT + RETURN_LIMIT : null,
      returnDeadline: this.returning ? this.deadline : null,
      band: this.probe.band, centreDepth: p.centre.depth, maxTireDepth: p.maxTireDepth,
      wheelDepths: [p.frontLeft.depth, p.frontRight.depth, p.rearLeft.depth, p.rearRight.depth],
      samples: [{ ...p.centre }, { ...p.frontLeft }, { ...p.frontRight }, { ...p.rearLeft }, { ...p.rearRight }],
      steerGain: limits?.steerGain ?? 1, forwardCap: limits?.forward ?? null, reverseCap: limits?.reverse ?? null,
      assistedOnFoot: this.assisted, exitDoor: this.assisted ? this.footDoor : null,
      fallback: this.usedFallback, landing: this.lastLanding,
      landingPair: this.landing.valid && (this.lastLanding || this.returning && this.routeCount > 0)
        ? { pose: { ...this.landing.pose }, foot: { ...this.landing.foot } } : null,
      fallbackReason: this.usedFallback ? (this.routeCount ? "corridor-unfinished" : "no-corridor") : null,
      landed: this.landing.valid ? { ...this.landing.pose, foot: { ...this.landing.foot } } : null,
      alternate: this.spares[1].valid ? { ...this.spares[1].pose, foot: { ...this.spares[1].foot } } : null,
      spares: this.spares.filter(q => q.valid).map(q => ({ ...q.pose, foot: { ...q.foot } })),
      availability: this.spareCount,
      ...this.host.drops?.inspectCarDrops(),
      ...CarWaterEffects.inspect(this.effects, this.time),
      motorSignalRevs: this.car ? this.revs(this.car, 0) : 0,
    };
  }
}
