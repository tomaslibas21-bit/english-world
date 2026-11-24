import { BufferAttribute, BufferGeometry, Color, DynamicDrawUsage, Mesh, MeshBasicMaterial, type Group } from "three";
import { DECKS, SEA_LEVEL, type Splashes } from "../water";
import { CAR_WATER, type CarWaterProbe, type CarWaterSample, sampleCarWater } from "./carWater";
import type { Motion } from "./drive";
import type { Ride } from "./Rides";

const STATIONS = 8, STEP = 0.12, LIFE = 0.84;
const TRACK_SEGMENTS = 2 * (STATIONS - 1);
const BOW_VERTICES = 9, BOW_INDICES = 24;
const DRAIN_STEP = 0.08, DRAIN_TIME = 0.65;
const MIN_PACE = 0.45, SPLASH_STEP = 0.65, EPSILON = 1e-7;
const { sputter } = CAR_WATER;

export interface CarWaterEffectsHost {
  drops?: Pick<Splashes, "carFan" | "carDrop" | "clearCarDrops" | "inspectCarDrops">;
  splash?(strength: number): void;
  wash?(): void;
}

export function sputterMiss(age: number) {
  const phase = Math.max(0, age) % sputter.cycle;
  return phase < sputter.duration || phase >= sputter.second && phase < sputter.second + sputter.duration;
}

export function coughBeat(age: number) {
  return age >= 0.12 && age < 0.22 ? 1 : age >= 0.36 && age < 0.46 ? 2 : 0;
}

export function drainMotor(age: number) {
  const beat = coughBeat(age);
  return beat === 1 ? 0.28 : beat === 2 ? 0.16 : 0;
}

export function drainPitch(age: number) {
  if (age <= 0) return 0;
  if (age < 0.12) return -0.045 * Math.sin(Math.PI * age / 0.12);
  const beat = coughBeat(age);
  return beat ? (beat === 1 ? 0.018 : 0.013) * Math.sin(Math.PI * (age - (beat === 1 ? 0.12 : 0.36)) / 0.10) : 0;
}

const station = () => ({ x: 0, z: 0, sx: 0, sz: 0, born: -Infinity, strength: 0, run: 0 });
type Station = ReturnType<typeof station>;
const wet = (s: CarWaterSample, depth: number) => s.depth >= depth && s.liveDepth > 0 && s.liveSurface !== null;

class WheelTrack {
  readonly history = Array.from({ length: STATIONS - 1 }, station);
  readonly tip = station();
  head = 0;
  count = 0;
  private run = 0;
  private next = Infinity;

  stop() { this.next = Infinity; }

  clear() {
    this.stop();
    this.count = this.head = 0;
    this.tip.born = -Infinity;
  }

  sample(tire: CarWaterSample, sx: number, sz: number, strength: number, time: number) {
    const a = this.tip, history = this.history;
    if (this.next === Infinity) {
      this.next = time;
      this.run++;
    }
    if (time + EPSILON >= this.next) {
      const b = history[this.head];
      const k = a.run === this.run && time > a.born ? Math.max(0, Math.min(1, (this.next - a.born) / (time - a.born))) : 1;
      b.x = a.x + (tire.x - a.x) * k;
      b.z = a.z + (tire.z - a.z) * k;
      b.sx = a.sx + (sx - a.sx) * k;
      b.sz = a.sz + (sz - a.sz) * k;
      b.strength = a.strength + (strength - a.strength) * k;
      b.born = this.next; b.run = this.run;
      this.head = (this.head + 1) % history.length;
      this.count = Math.min(this.count + 1, history.length);
      this.next += STEP;
    }
    a.x = tire.x; a.z = tire.z; a.sx = sx; a.sz = sz;
    a.strength = strength; a.born = time; a.run = this.run;
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

  constructor(parent: Group) {
    const indices: number[] = [];
    const strip = (a: number, b: number) => indices.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
    strip(0, 3);
    strip(3, 6);
    for (let i = 0; i < TRACK_SEGMENTS; i++) strip(BOW_VERTICES + 6 * i, BOW_VERTICES + 6 * i + 3);
    this.geometry.setIndex(indices);

    const foam = new Color("#f4fbff"), edge = new Color("#9ddbd6");
    for (let i = 0; i < this.position.count; i++) {
      const c = i % 3 === 1 ? foam : edge;
      this.color.setXYZW(i, c.r, c.g, c.b, 0);
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
    const ax = p.getX(i + 1), az = p.getZ(i + 1), bx = p.getX(j + 1), bz = p.getZ(j + 1);
    if (this.water((ax + bx) * 0.5, (az + bz) * 0.5) === null) return false;
    const x0 = Math.min(p.getX(i), p.getX(i + 2), p.getX(j), p.getX(j + 2));
    const z0 = Math.min(p.getZ(i), p.getZ(i + 2), p.getZ(j), p.getZ(j + 2));
    const x1 = Math.max(p.getX(i), p.getX(i + 2), p.getX(j), p.getX(j + 2));
    const z1 = Math.max(p.getZ(i), p.getZ(i + 2), p.getZ(j), p.getZ(j + 2));
    // Check the whole strip against boards, including narrow ones between sampling stations.
    for (const d of DECKS) if ((d.y ?? 0) >= SEA_LEVEL && x0 < d.x1 && x1 > d.x0 && z0 < d.z1 && z1 > d.z0) return false;
    return true;
  }

  private trailRow(i: number, s: Station) {
    const fade = Math.min(1, Math.max(0, (this.time - s.born) / LIFE));
    const halfWidth = 0.06 + 0.11 * fade;
    return this.row(i, s.x, s.z, s.sx * halfWidth, s.sz * halfWidth, 0.035, 0.65 * (1 - fade) * s.strength);
  }

  private segment(a: Station, b: Station) {
    const span = Math.hypot(a.x - b.x, a.z - b.z);
    if (b.born + LIFE <= this.time || a.run !== b.run || span < 0.015 || span > 1.5) return;
    const i = BOW_VERTICES + this.segments * 6;
    if (this.trailRow(i, a) && this.trailRow(i + 3, b) && this.wetSpan(i, i + 3)) this.segments++;
  }

  private trail(track: WheelTrack) {
    const { history, head, count, tip } = track;
    if (!count || tip.born + LIFE <= this.time) return;
    let a = history[(head + history.length - count) % history.length];
    for (let i = 1; i < count; i++) {
      const b = history[(head + history.length - count + i) % history.length];
      this.segment(a, b);
      a = b;
    }
    this.segment(a, tip);
  }

  private bow(m: Motion, dir: number, fx: number, fz: number) {
    const fore = m.spec.half + 0.12, span = m.spec.wide + 0.45;
    const x = m.x + fx * fore, z = m.z + fz * fore;
    const dx = fz * span, dz = -fx * span;
    const endX = x - fx * 0.85, endZ = z - fz * 0.85;
    const ox = -fx * 0.09, oz = -fz * 0.09;
    const armX = -fx * 0.12, armZ = -fz * 0.12;
    const alpha = 0.86 * this.bowStrength, crest = 0.035 + 0.065 * this.bowStrength;
    if (this.row(0, endX - dx, endZ - dz, armX, armZ, crest, alpha * 0.80)
      && this.row(3, x, z, ox, oz, crest, alpha)
      && this.row(6, endX + dx, endZ + dz, armX, armZ, crest, alpha * 0.80)
      && this.wetSpan(0, 3) && this.wetSpan(3, 6)) this.bowVertices = BOW_VERTICES;
  }

  drive(m: Motion, p: CarWaterProbe, time: number, dt: number, dir: number, moving: boolean) {
    this.time = time;
    const deep = p.band === "body-deep", front = dir < 0;
    const fx = m.fx * dir, fz = m.fz * dir, scale = Math.min(1, m.pace / (deep ? 1.4 : 2));
    const left = front ? p.frontLeft : p.rearLeft, right = front ? p.frontRight : p.rearRight;
    if (moving && wet(left, CAR_WATER.shallowLeave)) this.left.sample(left, fz, -fx, scale, time);
    else this.left.stop();
    if (moving && wet(right, CAR_WATER.shallowLeave)) this.right.sample(right, fz, -fx, scale, time);
    else this.right.stop();
    this.bowStrength = deep ? moving ? scale : Math.max(0, this.bowStrength - dt * 6) : 0;
    this.bowVertices = 0;
    if (this.bowStrength > 0) this.bow(m, dir, fx, fz);
    this.draw();
  }

  rest(time: number) {
    this.left.stop(); this.right.stop();
    this.bowStrength = this.bowVertices = 0;
    if (!this.mesh.visible) return;
    this.time = time;
    this.draw();
  }

  private draw() {
    this.segments = 0;
    this.trail(this.left); this.trail(this.right);
    const start = this.bowVertices > 0 ? 0 : BOW_INDICES;
    const count = this.segments * 12 + BOW_INDICES - start;
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
  private fanStep = 0.14;
  private nextSplash = -Infinity;
  private drainCar: Ride | null = null;
  private drainStart = 0;
  private drainX = 0;
  private drainZ = 0;
  private nextDrain = 0;
  private splashEvents = 0;
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

  constructor(private readonly host: CarWaterEffectsHost, private readonly root?: Group) {}

  private spray(tire: CarWaterSample, m: Motion, side: number, strength: number) {
    const y = tire.liveSurface!;
    this.host.drops?.carFan(tire.x, y, tire.z, m.fz * side, -m.fx * side, strength);
    this.sprayEvents++;
    this.sprayX = tire.x; this.sprayY = y; this.sprayZ = tire.z;
    this.spraySide = side; this.sprayStrength = strength;
    this.side = -side;
  }

  drive(m: Motion, p: CarWaterProbe, time: number, dt: number) {
    if (p.band === "dry" && this.at === -Infinity) { this.rest(time); return; }
    const pace = m.pace, dir = m.speed < -0.03 ? -1 : m.speed > 0.03 ? 1 : this.dir || 1;
    if (this.at > -Infinity) {
      const turn = m.heading - this.heading;
      if (time - this.at > 0.2 || Math.hypot(m.x - this.x, m.z - this.z) > 0.35 + Math.max(this.lastPace, pace) * dt
        || Math.cos(turn) < 0.75) this.clearWake();
      else if (this.dir !== dir) this.foam?.clear();
    }
    this.dir = dir; this.x = m.x; this.z = m.z; this.heading = m.heading; this.at = time; this.lastPace = pace;
    if (p.band === "dry") { this.rest(time); return; }

    const deep = p.band === "body-deep", moving = pace > MIN_PACE && (deep || p.band === "shallow");
    const step = deep ? 0.10 : 0.14;
    this.nextFan += step - this.fanStep;
    this.fanStep = step;
    const need = this.first ? CAR_WATER.shallowEnter : CAR_WATER.shallowLeave;
    const a = dir > 0 ? p.frontLeft : p.rearLeft, b = dir > 0 ? p.frontRight : p.rearRight;
    const c = dir > 0 ? p.rearLeft : p.frontLeft, d = dir > 0 ? p.rearRight : p.frontRight;
    const left = wet(a, need) ? a : wet(c, need) ? c : null;
    const right = wet(b, need) ? b : wet(d, need) ? d : null;
    if (this.first && (left || right)) {
      // Choose the leading axle if both sides touch on this frame, then the deeper contact on a tie.
      const startLeft = left && (!right || ((left === a) === (right === b) ? left.depth >= right.depth : left === a));
      this.spray(startLeft ? left! : right!, m, startLeft ? 1 : -1, 0.2);
      this.first = false;
      this.nextFan = time + step;
      this.playSplash(time, 0.35);
    } else if (moving && (left || right)) {
      if (time + EPSILON >= this.nextFan) {
        const onLeft = !!left && (this.side > 0 || !right);
        this.spray(onLeft ? left : right!, m, onLeft ? 1 : -1, deep ? 0.55 : 0.2);
        this.nextFan = Math.max(this.nextFan + step, time - dt + step);
      }
      if (time + EPSILON >= this.nextSplash) this.playSplash(time, deep ? 0.30 : 0.22);
    }
    if (deep && !this.washed) {
      this.washed = true;
      this.washEvents++;
      this.host.wash?.();
    }
    if (moving && this.root) this.foam ??= new CarWaterFoam(this.root);
    this.foam?.drive(m, p, time, dt, dir, moving);
  }

  private playSplash(time: number, strength: number) {
    this.splashEvents++;
    this.nextSplash = time + SPLASH_STEP;
    this.host.splash?.(strength);
  }

  motorSignal(signal: number) {
    if (signal === this.signal) return;
    if (signal < 0) this.sputterEvents++;
    else if (signal > 0) this.coughEvents++;
    this.signal = signal;
  }

  rest(time: number) { this.foam?.rest(time); }

  beginDrain(r: Ride, time: number, fallback: boolean) {
    if (fallback) this.clearWake();
    this.at = -Infinity;
    this.drainCar = r; this.drainStart = time; this.nextDrain = 0;
    this.drainX = r.m.x; this.drainZ = r.m.z;
    this.updateDrain(time);
  }

  updateDrain(time: number) {
    const r = this.drainCar;
    if (!r) return;
    const age = time - this.drainStart;
    const { m } = r;
    if (age >= DRAIN_TIME + 2 / 3) { this.drainCar = null; return; }
    if (Math.hypot(m.x - this.drainX, m.z - this.drainZ) > 0.35 + m.pace * 0.05) {
      this.clearWake();
      return;
    }
    this.drainX = m.x; this.drainZ = m.z;
    while (this.nextDrain < DRAIN_TIME && age + EPSILON >= this.nextDrain) {
      this.nextDrain += DRAIN_STEP;
      const along = -0.25 * m.spec.half / CAR_WATER.referenceHalf, wide = m.spec.wide + 0.03;
      const s = m.fx, c = m.fz, x = m.x + along * s, z = m.z + along * c, y = r.mesh.position.y + 0.44;
      const drops = this.host.drops;
      if (drops) for (let side = -1; side <= 1; side += 2) {
        this.drainEmissions += drops.carDrop(x + side * wide * c - 0.04 * s, y, z - side * wide * s - 0.04 * c, side * c * 0.2, -side * s * 0.2);
        this.drainEmissions += drops.carDrop(x + side * wide * c + 0.04 * s, y, z - side * wide * s + 0.04 * c, side * c * 0.2, -side * s * 0.2);
      }
    }
  }

  isDrainSource(r: Ride) { return this.drainCar === r; }

  endWet() {
    this.first = true; this.washed = false;
    this.nextFan = this.nextSplash = -Infinity;
    this.motorSignal(0);
  }

  private clearWake() {
    this.drainCar = null;
    this.foam?.clear();
    this.host.drops?.clearCarDrops();
  }

  cancel() {
    this.clearWake();
    this.dir = this.side = 0; this.at = -Infinity;
    this.endWet();
  }

  dispose() { this.foam?.dispose(); }

  inspect() {
    const mesh = this.foam?.mesh, range = mesh?.geometry.drawRange;
    const visible = !!mesh?.visible && !!mesh.parent?.visible && !!range?.count;
    return {
      ...(this.host.drops?.inspectCarDrops() ?? { carDrops: 0, drainLive: 0, pointsVisible: false, pointDrawStart: 0, pointDrawCount: 0, ringVisible: false }),
      wakeSegments: visible ? this.foam!.segments : 0, bowVertices: visible ? this.foam!.bowVertices : 0,
      foamVisible: visible, foamDrawStart: range?.start ?? 0, foamDrawCount: range?.count ?? 0,
      sprayEvents: this.sprayEvents, drainEmissions: this.drainEmissions,
      splashEvents: this.splashEvents, washEvents: this.washEvents, sputterEvents: this.sputterEvents, coughEvents: this.coughEvents,
      motorMiss: this.signal < 0, coughBeat: Math.max(0, this.signal),
      lastSpray: this.sprayEvents ? { x: this.sprayX, y: this.sprayY, z: this.sprayZ, side: this.spraySide, strength: this.sprayStrength } : null,
    };
  }
}
