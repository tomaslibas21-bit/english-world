import { BufferAttribute, BufferGeometry, Color, DynamicDrawUsage, Mesh, MeshBasicMaterial, type Group } from "three";
import { DECKS, poolAt, SEA_LEVEL, type CarDropBarrier, type Splashes } from "../water";
import type { AABB } from "../world/util";
import { CAR_WATER, type CarWaterProbe, type CarWaterSample, sampleCarWater } from "./carWater";
import type { Motion } from "./drive";
import type { Ride } from "./Rides";
import { CONVERTIBLE_BUMPER } from "./shapes";

const STATIONS = 8, STEP = 0.12, LIFE = 0.84;
const BOW_VERTICES = 9, BOW_INDICES = 24, TRACK_SEGMENTS = 2 * (STATIONS - 1);
const DRAIN_STEP = 0.08, DRAIN_TIME = 0.65;
const MIN_PACE = 0.45, SPLASH_STEP = 0.65, EPSILON = 1e-7;
const { sputter } = CAR_WATER;

export interface CarWaterEffectsHost {
  effectRoot?: Group;
  drops?: Pick<Splashes, "carFan" | "carDrop" | "clearCarDrops" | "inspectCarDrops">;
  splash?(strength: number): void;
  wash?(): void;
}

export function sputterMiss(age: number) {
  const phase = Math.max(0, age) % sputter.cycle;
  return phase < sputter.duration || phase >= sputter.second && phase < sputter.second + sputter.duration;
}

function coughBeat(age: number) {
  return age >= 0.12 && age < 0.22 ? 1 : age >= 0.36 && age < 0.46 ? 2 : 0;
}

function drainPitch(age: number) {
  if (age <= 0) return 0;
  if (age < 0.12) return -0.045 * Math.sin(Math.PI * age / 0.12);
  const beat = coughBeat(age);
  return beat ? (beat === 1 ? 0.018 : 0.013) * Math.sin(Math.PI * (age - (beat === 1 ? 0.12 : 0.36)) / 0.10) : 0;
}

const station = () => ({ x: 0, z: 0, sx: 0, sz: 0, born: -Infinity, strength: 0, run: 0 });
type Station = ReturnType<typeof station>;
const wet = (s: CarWaterSample, depth: number) => s.depth >= depth && s.liveDepth > 0 && s.liveSurface !== null;

class WheelTrack {
  private readonly history = Array.from({ length: STATIONS - 1 }, station);
  private readonly tip = station();
  private head = 0;
  private count = 0;
  private run = 0;
  private next = Infinity;

  stop() { this.next = Infinity; }

  clear() {
    this.stop();
    this.count = this.head = 0;
    this.tip.born = -Infinity;
  }

  sample(tire: CarWaterSample, sx: number, sz: number, strength: number, time: number) {
    const a = this.tip;
    if (this.next === Infinity) {
      this.next = time;
      this.run++;
    }
    if (time + EPSILON >= this.next) {
      const b = this.history[this.head];
      const k = a.run === this.run && time > a.born ? Math.max(0, Math.min(1, (this.next - a.born) / (time - a.born))) : 1;
      b.x = a.x + (tire.x - a.x) * k;
      b.z = a.z + (tire.z - a.z) * k;
      b.sx = a.sx + (sx - a.sx) * k;
      b.sz = a.sz + (sz - a.sz) * k;
      b.strength = a.strength + (strength - a.strength) * k;
      b.born = this.next; b.run = this.run;
      this.head = (this.head + 1) % this.history.length;
      this.count = Math.min(this.count + 1, this.history.length);
      this.next = Math.max(this.next + STEP, time);
    }
    a.x = tire.x; a.z = tire.z; a.sx = sx; a.sz = sz;
    a.strength = strength; a.born = time; a.run = this.run;
  }

  get size() { return this.count + Number(this.count > 0); }

  at(i: number) {
    return i === this.count ? this.tip : this.history[(this.head + this.history.length - this.count + i) % this.history.length];
  }

  inspect(time: number) {
    const stations = [];
    for (let i = 0; i < this.size; i++) {
      const s = this.at(i);
      if (s.born + LIFE > time) stations.push({ ...s });
    }
    return stations;
  }
}

class CarWaterFoam {
  private readonly position = new BufferAttribute(new Float32Array((BOW_VERTICES + TRACK_SEGMENTS * 6) * 3), 3).setUsage(DynamicDrawUsage);
  private readonly color = new BufferAttribute(new Float32Array(this.position.count * 4), 4).setUsage(DynamicDrawUsage);
  private readonly geometry = new BufferGeometry().setAttribute("position", this.position).setAttribute("color", this.color);
  private readonly material = new MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false });
  readonly mesh = new Mesh(this.geometry, this.material);
  readonly left = new WheelTrack();
  readonly right = new WheelTrack();
  private readonly sample: CarWaterSample = { x: 0, z: 0, floor: 0, stillSurface: null, liveSurface: null, depth: 0, liveDepth: 0 };
  private time = 0;
  private bowStrength = 0;
  segments = 0;
  bowVertices = 0;

  constructor(parent: Group, private readonly blocks: CarDropBarrier) {
    const index = new Uint16Array(BOW_INDICES + TRACK_SEGMENTS * 12);
    let i = 0;
    const strip = (a: number, b: number) => {
      index[i++] = a; index[i++] = b; index[i++] = a + 1;
      index[i++] = a + 1; index[i++] = b; index[i++] = b + 1;
      index[i++] = a + 1; index[i++] = b + 1; index[i++] = a + 2;
      index[i++] = a + 2; index[i++] = b + 1; index[i++] = b + 2;
    };
    strip(0, 3); strip(3, 6);
    for (let j = 0; j < TRACK_SEGMENTS; j++) strip(BOW_VERTICES + 6 * j, BOW_VERTICES + 6 * j + 3);
    this.geometry.setIndex(new BufferAttribute(index, 1));

    const centre = new Color("#f4fbff"), edge = new Color("#9ddbd6");
    for (let j = 0; j < this.position.count; j++) {
      const c = j % 3 === 1 ? centre : edge;
      this.color.setXYZW(j, c.r, c.g, c.b, 0);
    }
    this.mesh.name = "car-water-foam";
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
    this.clear();
    parent.add(this.mesh);
  }

  private water(x: number, z: number) {
    sampleCarWater(x, z, this.time, this.sample);
    return this.sample.liveDepth > 0 ? this.sample.liveSurface : null;
  }

  private vertex(i: number, x: number, z: number, lift: number, alpha: number) {
    const y = this.water(x, z);
    if (y === null) return false;
    this.position.setXYZ(i, x, y + lift, z);
    this.color.setW(i, alpha);
    return true;
  }

  private row(i: number, x: number, z: number, dx: number, dz: number, crest: number, alpha: number) {
    return this.vertex(i, x - dx, z - dz, 0.035, alpha * 0.42)
      && this.vertex(i + 1, x, z, crest, alpha)
      && this.vertex(i + 2, x + dx, z + dz, 0.035, alpha * 0.42);
  }

  private wetSpan(i: number, j: number) {
    const p = this.position;
    const sheet = poolAt(p.getX(i + 1), p.getZ(i + 1));
    for (let k = 0; k < 3; k++) {
      const x0 = p.getX(i + k), z0 = p.getZ(i + k), x1 = p.getX(j + k), z1 = p.getZ(j + k);
      if (poolAt(x0, z0) !== sheet || poolAt(x1, z1) !== sheet || this.blocks(x0, z0, x1, z1)
        || this.water((x0 + x1) * 0.5, (z0 + z1) * 0.5) === null) return false;
    }
    const x0 = Math.min(p.getX(i), p.getX(i + 2), p.getX(j), p.getX(j + 2));
    const z0 = Math.min(p.getZ(i), p.getZ(i + 2), p.getZ(j), p.getZ(j + 2));
    const x1 = Math.max(p.getX(i), p.getX(i + 2), p.getX(j), p.getX(j + 2));
    const z1 = Math.max(p.getZ(i), p.getZ(i + 2), p.getZ(j), p.getZ(j + 2));
    // A narrow board can lie entirely between two sample rows.
    for (let k = 0; k < DECKS.length; k++) {
      const d = DECKS[k];
      if ((d.y ?? 0) >= SEA_LEVEL && x0 < d.x1 && x1 > d.x0 && z0 < d.z1 && z1 > d.z0) return false;
    }
    return true;
  }

  private trailRow(i: number, s: Station) {
    const fade = Math.min(1, Math.max(0, (this.time - s.born) / LIFE));
    const halfWidth = 0.06 + 0.11 * fade;
    return this.row(i, s.x, s.z, s.sx * halfWidth, s.sz * halfWidth, 0.035, 0.65 * (1 - fade) * s.strength);
  }

  private trail(track: WheelTrack) {
    for (let j = 1; j < track.size; j++) {
      const a = track.at(j - 1), b = track.at(j);
      const span = Math.hypot(a.x - b.x, a.z - b.z);
      if (b.born + LIFE <= this.time || a.run !== b.run || span < 0.015 || span > 1.5) continue;
      const i = BOW_VERTICES + this.segments * 6;
      if (this.trailRow(i, a) && this.trailRow(i + 3, b) && this.wetSpan(i, i + 3)) this.segments++;
    }
  }

  private bow(r: Ride, fx: number, fz: number) {
    const { m } = r, { half, wide } = m.spec;
    const bumper = r.model ? half : Math.max(half, CONVERTIBLE_BUMPER.offset + CONVERTIBLE_BUMPER.depth / 2);
    const fore = bumper + 0.12, span = wide + 0.45;
    const x = m.x + fx * fore, z = m.z + fz * fore;
    const dx = fz * span, dz = -fx * span;
    const endX = x - fx * 0.85, endZ = z - fz * 0.85;
    const ox = -fx * 0.09, oz = -fz * 0.09, alpha = 0.86 * this.bowStrength;
    if (this.row(0, endX - dx, endZ - dz, ox, oz, 0.10, alpha * 0.80)
      && this.row(3, x, z, ox, oz, 0.10, alpha)
      && this.row(6, endX + dx, endZ + dz, ox, oz, 0.10, alpha * 0.80)
      && this.wetSpan(0, 3) && this.wetSpan(3, 6)) this.bowVertices = BOW_VERTICES;
  }

  drive(r: Ride, p: CarWaterProbe, time: number, dt: number, dir: number, moving: boolean) {
    this.time = time;
    const { m } = r, deep = p.band === "body-deep";
    const fx = m.fx * dir, fz = m.fz * dir, scale = Math.min(1, m.pace / (deep ? 1.4 : 2));
    const left = dir < 0 ? p.frontLeft : p.rearLeft, right = dir < 0 ? p.frontRight : p.rearRight;
    if (moving && wet(left, CAR_WATER.shallowLeave)) this.left.sample(left, fz, -fx, scale, time);
    else this.left.stop();
    if (moving && wet(right, CAR_WATER.shallowLeave)) this.right.sample(right, fz, -fx, scale, time);
    else this.right.stop();
    this.bowStrength = deep ? moving ? scale : Math.max(0, this.bowStrength - dt * 6) : 0;
    this.bowVertices = 0;
    if (this.bowStrength > 0) this.bow(r, fx, fz);
    this.draw();
  }

  rest(time: number) {
    this.time = time;
    this.left.stop(); this.right.stop();
    this.bowStrength = this.bowVertices = 0;
    if (this.mesh.visible) this.draw();
  }

  private draw() {
    this.segments = 0;
    this.trail(this.left); this.trail(this.right);
    const start = this.bowVertices > 0 ? 0 : BOW_INDICES, count = this.segments * 12 + BOW_INDICES - start;
    this.geometry.setDrawRange(count ? start : 0, count);
    this.mesh.visible = count > 0;
    if (count) { this.position.needsUpdate = true; this.color.needsUpdate = true; }
  }

  clear() {
    this.left.clear(); this.right.clear();
    this.bowStrength = this.bowVertices = this.segments = 0;
    this.mesh.visible = false;
    this.geometry.setDrawRange(0, 0);
  }

  dispose() { this.clear(); this.mesh.removeFromParent(); this.geometry.dispose(); this.material.dispose(); }
}

export class CarWaterEffects {
  private foam?: CarWaterFoam;
  private dir = 0;
  private x = 0;
  private z = 0;
  private heading = 0;
  private lastPace = 0;
  private at = -Infinity;
  private side = 0;
  private first = true;
  private washed = false;
  private nextFan = -Infinity;
  private lastFan = -Infinity;
  private fanStep = 0.14;
  private nextSplash = -Infinity;
  private drainCar: Ride | null = null;
  private drainStart = 0;
  private drainAt = -Infinity;
  private drainX = 0;
  private drainZ = 0;
  private nextDrain = 0;
  private splashEvents = 0;
  private splashStrength = 0;
  private washEvents = 0;
  private sprayEvents = 0;
  private drainEmissions = 0;
  private sputterEvents = 0;
  private coughEvents = 0;
  private signal = 0;
  private sprayX = 0;
  private sprayY = 0;
  private sprayZ = 0;
  private spraySide = 0;
  private sprayStrength = 0;
  private sprayDrops = 0;
  private sprayTire = 0;
  private sprayTime = 0;

  constructor(private readonly host: CarWaterEffectsHost, private readonly barriers: readonly AABB[]) {}

  private readonly blocks = (x0: number, z0: number, x1: number, z1: number) => {
    const dx = x1 - x0, dz = z1 - z0;
    for (let i = 0; i < this.barriers.length; i++) {
      const b = this.barriers[i];
      if (Math.max(x0, x1) < b.minX || Math.min(x0, x1) > b.maxX
        || Math.max(z0, z1) < b.minZ || Math.min(z0, z1) > b.maxZ) continue;
      const ax = dx ? (b.minX - x0) / dx : -Infinity, bx = dx ? (b.maxX - x0) / dx : Infinity;
      const az = dz ? (b.minZ - z0) / dz : -Infinity, bz = dz ? (b.maxZ - z0) / dz : Infinity;
      if (Math.max(0, Math.min(ax, bx), Math.min(az, bz)) <= Math.min(1, Math.max(ax, bx), Math.max(az, bz))) return true;
    }
    return false;
  };

  private spray(tire: CarWaterSample, p: CarWaterProbe, m: Motion, side: number, strength: number, time: number) {
    const y = tire.liveSurface!;
    const count = this.host.drops?.carFan(tire.x, y, tire.z, m.fz * side, -m.fx * side, strength, this.blocks) ?? 0;
    this.lastFan = time;
    this.side = -side;
    if (!import.meta.env.DEV || count === 0) return;
    this.sprayEvents++;
    this.sprayX = tire.x; this.sprayY = y; this.sprayZ = tire.z;
    this.spraySide = side; this.sprayStrength = strength; this.sprayDrops = count;
    this.sprayTire = tire === p.frontLeft ? 0 : tire === p.frontRight ? 1 : tire === p.rearLeft ? 2 : 3;
    this.sprayTime = time;
  }

  drive(r: Ride, p: CarWaterProbe, time: number, dt: number) {
    if (this.at === time) return;
    const { m } = r, pace = m.pace, dir = m.speed < -0.03 ? -1 : m.speed > 0.03 ? 1 : this.dir || 1;
    if (this.at > -Infinity) {
      if (time - this.at > 0.2 || Math.hypot(m.x - this.x, m.z - this.z) > 0.35 + Math.max(this.lastPace, pace) * dt
        || Math.cos(m.heading - this.heading) < 0.75) this.discontinuity();
      else if (this.dir !== dir) this.foam?.clear();
    }
    this.dir = dir; this.x = m.x; this.z = m.z; this.heading = m.heading; this.at = time; this.lastPace = pace;
    if (p.band === "dry") {
      this.rest(time);
      if (!this.first && !Math.max(p.centre.depth, p.maxTireDepth)) {
        this.beginDrain(r, time, false);
        this.endWet();
      }
      return;
    }

    const deep = p.band === "body-deep", moving = pace > MIN_PACE && (deep || p.band === "shallow");
    const step = deep ? 0.10 : 0.14;
    if (step !== this.fanStep) { this.nextFan = this.lastFan + step; this.fanStep = step; }
    const need = this.first ? CAR_WATER.shallowEnter : CAR_WATER.shallowLeave;
    const a = dir > 0 ? p.frontLeft : p.rearLeft, b = dir > 0 ? p.frontRight : p.rearRight;
    const c = dir > 0 ? p.rearLeft : p.frontLeft, d = dir > 0 ? p.rearRight : p.frontRight;
    const left = wet(a, need) ? a : wet(c, need) ? c : null;
    const right = wet(b, need) ? b : wet(d, need) ? d : null;
    if (this.first && (left || right)) {
      const startLeft = left && (!right || ((left === a) === (right === b) ? left.depth >= right.depth : left === a));
      if (this.drainCar) this.discontinuity();
      this.spray((startLeft ? left : right)!, p, m, startLeft ? 1 : -1, deep ? 0.55 : 0.20, time);
      this.first = false;
      this.nextFan = time + step;
      this.playSplash(time, 0.35);
    } else if (moving && (left || right)) {
      if (time + EPSILON >= this.nextFan) {
        const onLeft = !!left && (this.side > 0 || !right);
        this.spray((onLeft ? left : right)!, p, m, onLeft ? 1 : -1, deep ? 0.55 : 0.20, time);
        this.nextFan = Math.max(this.nextFan + step, time - dt + step);
      }
      if (time + EPSILON >= this.nextSplash) this.playSplash(time, deep ? 0.30 : 0.22);
    }
    if (deep && !this.washed) {
      this.washed = true;
      if (import.meta.env.DEV) this.washEvents++;
      this.host.wash?.();
    }
    if (moving && this.host.effectRoot) this.foam ??= new CarWaterFoam(this.host.effectRoot, this.blocks);
    this.foam?.drive(r, p, time, dt, dir, moving);
  }

  private playSplash(time: number, strength: number) {
    if (import.meta.env.DEV) { this.splashEvents++; this.splashStrength = strength; }
    this.nextSplash = time + SPLASH_STEP;
    this.host.splash?.(strength);
  }

  motorSignal(signal: number) {
    if (!import.meta.env.DEV || signal === this.signal) return;
    if (signal < 0) this.sputterEvents++;
    else if (signal > 0) this.coughEvents++;
    this.signal = signal;
  }

  rest(time: number) { this.foam?.rest(time); }

  beginDrain(r: Ride, time: number, covered: boolean) {
    if (covered) this.discontinuity();
    this.drainCar = r; this.drainStart = time;
    this.drainAt = -Infinity; this.nextDrain = 0;
    this.drainX = r.m.x; this.drainZ = r.m.z;
  }

  isDrainSource(r: Ride) { return this.drainCar === r; }
  pitch(r: Ride, time: number) { return this.isDrainSource(r) ? drainPitch(time - this.drainStart) : 0; }

  motor(r: Ride, time: number) {
    const beat = this.isDrainSource(r) ? coughBeat(time - this.drainStart) : 0;
    return beat === 1 ? 0.28 : beat === 2 ? 0.16 : 0;
  }

  posed(r: Ride, time: number) {
    if (!this.isDrainSource(r) || this.drainAt === time) return;
    const age = time - this.drainStart, { m } = r;
    if (time - this.drainAt > 0.12 && this.drainAt !== -Infinity
      || Math.hypot(m.x - this.drainX, m.z - this.drainZ) > 0.35 + m.pace * 0.06) {
      this.discontinuity();
      return;
    }
    this.drainAt = time; this.drainX = m.x; this.drainZ = m.z;
    this.motorSignal(coughBeat(age));
    if (this.nextDrain < DRAIN_TIME && age + EPSILON >= this.nextDrain) {
      this.nextDrain += DRAIN_STEP;
      const along = -0.25 * m.spec.half / CAR_WATER.referenceHalf, wide = m.spec.wide + 0.03;
      const s = m.fx, c = m.fz, x = m.x + along * s, z = m.z + along * c, y = r.mesh.position.y + 0.44;
      const drops = this.host.drops;
      if (drops) for (let side = -1; side <= 1; side += 2) {
        const sx = x + side * wide * c, sz = z - side * wide * s, vx = side * c * 0.2, vz = -side * s * 0.2;
        const pair = drops.carDrop(sx - 0.04 * s, y, sz - 0.04 * c, vx, vz, this.blocks)
          + drops.carDrop(sx + 0.04 * s, y, sz + 0.04 * c, vx, vz, this.blocks);
        if (import.meta.env.DEV) this.drainEmissions += pair;
      }
    }
    if (age + EPSILON >= DRAIN_TIME && this.nextDrain >= DRAIN_TIME) this.drainCar = null;
  }

  endWet() {
    this.first = true; this.washed = false;
    this.nextSplash = this.nextFan = this.lastFan = -Infinity;
    if (!this.drainCar) this.motorSignal(0);
  }

  discontinuity() {
    this.drainCar = null;
    this.foam?.clear();
    this.host.drops?.clearCarDrops();
    this.dir = this.side = 0; this.at = -Infinity;
    this.motorSignal(0);
  }

  cancel() { this.discontinuity(); this.endWet(); }
  dispose() { this.cancel(); this.foam?.dispose(); this.foam = undefined; }

  static inspect(effects: CarWaterEffects | undefined, time: number) {
    const foam = effects?.foam, mesh = foam?.mesh, range = mesh?.geometry.drawRange;
    const visible = !!mesh?.visible && !!mesh.parent?.visible && !!range?.count;
    return {
      wakeSegments: visible ? foam!.segments : 0, bowVertices: visible ? foam!.bowVertices : 0,
      foamId: mesh?.uuid ?? null, foamVisible: visible, foamDrawStart: range?.start ?? 0, foamDrawCount: range?.count ?? 0,
      leftTrack: foam?.left.inspect(time) ?? [], rightTrack: foam?.right.inspect(time) ?? [],
      sprayEvents: effects?.sprayEvents ?? 0, drainEmissions: effects?.drainEmissions ?? 0,
      drainId: effects?.drainCar?.id ?? null, drainObject: effects?.drainCar?.mesh.uuid ?? null,
      drainAge: effects?.drainCar ? time - effects.drainStart : null,
      splashEvents: effects?.splashEvents ?? 0, splashStrength: effects?.splashStrength ?? 0, washEvents: effects?.washEvents ?? 0,
      sputterEvents: effects?.sputterEvents ?? 0, coughEvents: effects?.coughEvents ?? 0,
      motorMiss: (effects?.signal ?? 0) < 0, coughBeat: Math.max(0, effects?.signal ?? 0),
      lastSpray: effects?.sprayEvents ? {
        x: effects.sprayX, y: effects.sprayY, z: effects.sprayZ, side: effects.spraySide,
        strength: effects.sprayStrength, kind: 1, drops: effects.sprayDrops, tire: effects.sprayTire, time: effects.sprayTime,
      } : null,
    };
  }
}
