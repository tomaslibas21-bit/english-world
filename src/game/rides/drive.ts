// Driving, kept apart from the scene so it can be tested: a simple, forgiving car and a small boat. Headings are the
// game's own (0 = towards +Z, π/2 = towards +X); "forward" is (sin h, cos h).
//
// The car: the stick or the keys give a throttle (up: go, down: brake, then back up) and a steer (left, right). It
// goes wherever the town's ground is open and dry (`Drivable`: since 15 Nov the whole town, over kerbs, sidewalks and
// squares, not only the asphalt), is pushed out of whatever stands on it, and never reaches anyone on foot: its speed
// is held to what stops short of the nearest person ahead (`gap`). On the asphalt, holding a course for a moment lets
// it pick up from its town pace to its open-road one, as a walk becomes a jog; off the asphalt it goes gently.
// The boat: the same hands, on water: slower to pick up and to turn, it glides on when let go.

export interface Rect { x0: number; x1: number; z0: number; z1: number }

/** Where a car may be: the union of rectangles (streets, lots), each drawn in by `inset` m (the car's half width, so
 *  its wheels stay on the asphalt). */
export class Drivable {
  readonly rects: Rect[];
  constructor(rects: Rect[], inset = 0) {
    this.rects = rects.map((r) => ({ x0: r.x0 + inset, x1: r.x1 - inset, z0: r.z0 + inset, z1: r.z1 - inset })).filter((r) => r.x1 > r.x0 && r.z1 > r.z0);
  }
  has(x: number, z: number) {
    for (const r of this.rects) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return true;
    return false;
  }
  /** The nearest drivable point to (x, z): itself when it is on the ground. */
  nearest(x: number, z: number, out: { x: number; z: number } = { x: 0, z: 0 }) {
    let best = Infinity;
    out.x = x; out.z = z;
    for (const r of this.rects) {
      const cx = Math.max(r.x0, Math.min(x, r.x1)), cz = Math.max(r.z0, Math.min(z, r.z1));
      const d = (cx - x) ** 2 + (cz - z) ** 2;
      if (d < best) { best = d; out.x = cx; out.z = cz; if (d === 0) break; }
    }
    return out;
  }
}

/** The hands on the wheel: `throttle` −1…1 (down: brake, then reverse), `steer` −1…1 (left negative), `brake`. */
export interface Controls { throttle: number; steer: number; brake: boolean }

/** The stick or the keys as a throttle and a steer: up the screen is go, down is brake and reverse, the sides steer;
 *  pushed mostly sideways, the car still rolls on (so a phone's stick held to the left turns left instead of
 *  stopping). `x` right, `y` up the screen (−1…1). */
export function controlsFrom(x: number, y: number, brake = false): Controls {
  const m = Math.hypot(x, y);
  if (m < 0.12) return { throttle: 0, steer: 0, brake };
  const steer = Math.max(-1, Math.min(1, x * 1.25));
  const throttle = y < -0.35 ? Math.max(-1, y * 1.2) : Math.min(1, Math.max(y * 1.15, Math.abs(x) * 0.55, 0));
  return { throttle, steer, brake };
}

export const CAR = {
  /** Speeds (m/s). `town`: what it gets up to at once (about 35 km/h); `max`: after holding a course on the asphalt
   *  for a moment (about 56 km/h, quick in a town 240 m long); `rough`: off the asphalt (sidewalks, squares, grass,
   *  sand); `back`: backwards. */
  max: 15.5, town: 9.8, rough: 6.6, back: 4.4,
  /** How long a course is held before it picks up, and until it is at `max` (s). */
  holdFrom: 1.1, holdTo: 3.4,
  accel: 6.5, brake: 15, coast: 1.6,
  /** The axles' distance (m), the wheel's full lock slow and at speed (rad), how quickly the wheel follows the hand. */
  base: 2.6, lockSlow: 0.6, lockFast: 0.17, wheel: 5.5,
  /** Half the body (m): along it and across. */
  half: 2.15, wide: 0.95,
  /** How hard it brakes by itself for someone ahead (m/s²), and how far short of them it stops (m, bumper to person). */
  yield: 10, clear: 1.6,
};

export const BOAT = {
  max: 8.5, back: 2.4, accel: 3.2, brake: 5, coast: 0.55,
  /** How fast it turns at speed (rad/s), and a little even when barely moving (so it can be pointed away from a dock). */
  turn: 1.05, turnIdle: 0.35, wheel: 3,
  half: 2.2, wide: 0.85,
};

/** A vehicle on the ground plan: where its middle is, where it points, how fast it goes along that (negative: back). */
export class Motion {
  x = 0; z = 0; heading = 0; speed = 0;
  /** The wheel as it is (eased after the hand), −1…1. */
  steer = 0;
  /** How much of the last step was taken away by something in the way (0–1), for a bump's sound and the body's nod. */
  bump = 0;
  /** A car: how long it has held its course on the asphalt (s), and its top speed just now. */
  hold = 0;
  top = 0;
  constructor(readonly spec: typeof CAR | typeof BOAT, readonly kind: "car" | "boat") {}

  set(x: number, z: number, heading: number) { this.x = x; this.z = z; this.heading = heading; this.speed = 0; this.steer = 0; this.bump = 0; this.hold = 0; }

  get fx() { return Math.sin(this.heading); }
  get fz() { return Math.cos(this.heading); }

  /** One step. `gap`: how far ahead, the way it is going, the nearest person on foot is (from its middle; Infinity:
   *  nobody): the speed is held to what stops `clear` short of them. Moves along its heading; what is in the way is
   *  settled afterwards by `settle`. */
  step(dt: number, c: Controls, gap = Infinity, road = true) {
    const S = this.spec, car = this.kind === "car";
    this.steer += (c.steer - this.steer) * Math.min(1, dt * S.wheel);
    let v = this.speed;
    const t = c.brake ? 0 : c.throttle;
    // a car's top speed: its town pace; more once it has held a course on the asphalt for a moment (a sharp turn, the
    // brake or leaving the asphalt take that away again); gently off the asphalt
    let top = S.max;
    if (car) {
      const steady = road && !c.brake && t > 0.6 && Math.abs(this.steer) < 0.42 && v > CAR.town * 0.55 && this.bump < 0.2;
      this.hold = steady ? Math.min(CAR.holdTo, this.hold + dt) : Math.max(0, this.hold - dt * (Math.abs(this.steer) > 0.75 || c.brake || !road ? 6 : 2.5));
      const k = Math.min(1, Math.max(0, (this.hold - CAR.holdFrom) / (CAR.holdTo - CAR.holdFrom)));
      top = road ? CAR.town + (CAR.max - CAR.town) * k * k * (3 - 2 * k) : CAR.rough;
      this.top = top;
    }
    if (c.brake) v = toward(v, 0, S.brake * dt);
    else if (t > 0) v = v < -0.2 ? toward(v, 0, S.brake * dt) : v > top * Math.max(0.35, t) ? Math.max(top * Math.max(0.35, t), v - (car ? 7 : 3) * dt) : Math.min(top * Math.max(0.35, t), v + S.accel * t * dt * (1 - 0.5 * Math.max(0, v) / S.max));
    else if (t < 0) v = v > 0.3 ? toward(v, 0, S.brake * -t * dt) : Math.max(-S.back, v + S.accel * 0.7 * t * dt);
    else v = toward(v * Math.exp(-(car ? 0.35 : 0.5) * dt), 0, S.coast * dt);
    // never into someone on foot: no faster than what stops short of them (forwards or backing up)
    if (gap !== Infinity && car) {
      const room = gap - CAR.half - CAR.clear, top = room > 0 ? Math.sqrt(2 * CAR.yield * room) : 0;
      if (Math.abs(v) > top) v = Math.sign(v) * Math.max(top, Math.abs(v) - (room > 0 ? 16 : 40) * dt);
    }
    this.speed = v;
    if (car) {
      // the front wheels' lock is less the faster it goes; the turn is the bicycle's
      const k = Math.min(1, Math.abs(v) / S.max), lock = CAR.lockSlow + (CAR.lockFast - CAR.lockSlow) * k * (2 - k);
      // (to the right is a smaller heading: the game's headings turn towards +X, which is on one's left facing +Z)
      this.heading -= (v / CAR.base) * Math.tan(this.steer * lock) * dt;
    } else {
      const k = Math.min(1, Math.abs(v) / 3);
      this.heading -= this.steer * (BOAT.turnIdle + (BOAT.turn - BOAT.turnIdle) * k) * (v < -0.1 ? -1 : 1) * dt;
    }
    this.heading = wrap(this.heading);
    this.x += this.fx * v * dt;
    this.z += this.fz * v * dt;
    this.bump = Math.max(0, this.bump - dt * 3);
  }

  /** The body as circles along its length (front, middle, back), each pushed by `fix` out of what it may not be in
   *  (`fix` moves the point it is given); the body follows its front and back circles, turning with them (it slides
   *  along a kerb or a wall instead of stopping dead), and loses the speed that went into the obstacle. */
  settle(fix: (p: { x: number; z: number }, r: number) => void) {
    const S = this.spec, off = S.half - S.wide, fx = this.fx, fz = this.fz;
    const a = { x: this.x + fx * off, z: this.z + fz * off }, b = { x: this.x - fx * off, z: this.z - fz * off }, m = { x: this.x, z: this.z };
    const a0x = a.x, a0z = a.z, b0x = b.x, b0z = b.z, m0x = m.x, m0z = m.z;
    fix(a, S.wide); fix(b, S.wide); fix(m, S.wide);
    const mx = m.x - m0x, mz = m.z - m0z;
    a.x += mx * 0.5; a.z += mz * 0.5; b.x += mx * 0.5; b.z += mz * 0.5;
    const moved = Math.hypot(a.x - a0x, a.z - a0z) + Math.hypot(b.x - b0x, b.z - b0z);
    if (moved < 1e-5) return 0;
    // how much of the push was against the way it goes: that much speed is lost
    const dir = Math.sign(this.speed) || 1;
    const against = -((a.x - a0x + b.x - b0x) * fx + (a.z - a0z + b.z - b0z) * fz) * dir;
    this.x = (a.x + b.x) / 2; this.z = (a.z + b.z) / 2;
    const h = Math.atan2(a.x - b.x, a.z - b.z);
    this.heading = wrap(this.heading + wrap(h - this.heading) * 0.85);
    if (against > 0) {
      const lost = Math.min(1, against * 6);
      this.bump = Math.max(this.bump, lost * Math.min(1, Math.abs(this.speed) / 5));
      this.speed *= 1 - lost;
    } else this.speed *= 1 - Math.min(0.2, moved * 0.6);
    return moved;
  }
}

function toward(v: number, to: number, by: number) { return v > to ? Math.max(to, v - by) : Math.min(to, v + by); }
function wrap(a: number) { return Math.atan2(Math.sin(a), Math.cos(a)); }

/** A point pushed out of a box lying along `heading` at (cx, cz), `hl` long and `hw` wide (halves), keeping `r` clear
 *  of it. Returns true if it was moved. */
export function pushOutOfBox(p: { x: number; z: number }, r: number, cx: number, cz: number, heading: number, hl: number, hw: number) {
  const s = Math.sin(heading), c = Math.cos(heading), dx = p.x - cx, dz = p.z - cz;
  // the box's own axes: `u` along it, `w` across
  let u = dx * s + dz * c, w = dx * c - dz * s;
  const qu = Math.max(-hl, Math.min(u, hl)), qw = Math.max(-hw, Math.min(w, hw));
  const ex = u - qu, ew = w - qw, d2 = ex * ex + ew * ew;
  if (d2 >= r * r) return false;
  if (d2 > 1e-9) { const d = Math.sqrt(d2); u = qu + (ex / d) * r; w = qw + (ew / d) * r; }
  else if (hl - Math.abs(u) < hw - Math.abs(w)) u = (u < 0 ? -1 : 1) * (hl + r);
  else w = (w < 0 ? -1 : 1) * (hw + r);
  p.x = cx + u * s + w * c; p.z = cz + u * c - w * s;
  return true;
}

/** How far ahead of a vehicle at (x, z) going along (fx, fz) the point (px, pz) is, if it lies in the strip `half` m
 *  to each side of its line and within `reach`; else Infinity. */
export function aheadIn(x: number, z: number, fx: number, fz: number, px: number, pz: number, reach: number, half: number) {
  const dx = px - x, dz = pz - z, along = dx * fx + dz * fz;
  if (along <= 0 || along > reach) return Infinity;
  return Math.abs(dx * fz - dz * fx) <= half ? along : Infinity;
}
