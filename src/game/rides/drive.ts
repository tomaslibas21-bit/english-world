// Driving, kept apart from the scene so it can be tested: a simple, forgiving car and a small boat. Headings are the
// game's own (0 = towards +Z, π/2 = towards +X); "forward" is (sin h, cos h).
//
// The car: the stick or the keys give a throttle (up: go, down: brake, then back up) and a steer (left, right). It
// goes wherever the town's ground is open and dry (`Drivable`: since 15 Nov the whole town, over kerbs, sidewalks and
// squares, not only the asphalt), is pushed out of whatever stands on it, and never reaches anyone on foot: its speed
// is held to what stops short of the nearest person ahead (`gap`). On the asphalt, holding a course for a moment lets
// it pick up from its town pace to its open-road one, as a walk becomes a jog; off the asphalt it goes gently.
// The boat: the same hands, on water: slower to pick up and to turn, it glides on when let go.

import { angleDiff, smoothstep } from "../movement";

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

/** Steer toward a world heading, easing the throttle through a turn. */
export function pointAndGo(heading: number, want: number, mag: number, speed: number, reverse = true): Controls {
  const off = angleDiff(want, heading);
  const push = Math.max(0, Math.min(1, mag));
  if (push < 0.12) return controlsFrom(0, 0);
  // Back away when pointed astern at low speed, and keep backing while held.
  const back = reverse && speed < 1.5 && Math.abs(off) > 2.3;
  const turn = back ? angleDiff(want, heading + Math.PI) : angleDiff(heading, want);
  const steer = Math.max(-1, Math.min(1, turn * 0.8));
  const throttle = back ? -push : push * (1 - 0.68 * smoothstep(0.2, 2, Math.abs(off)));
  return { throttle, steer, brake: false };
}

export const CAR = {
  /** Speeds (m/s). `town`: what it gets up to at once (about 35 km/h); `max`: after holding a course on the asphalt
   *  for a moment (about 56 km/h, quick in a town 240 m long); `rough`: off the asphalt (sidewalks, squares, grass,
   *  sand); `back`: backwards. */
  max: 15.5, town: 9.8, rough: 6.6, back: 6.2,
  /** How long a course is held before it picks up, and until it is at `max` (s). */
  holdFrom: 1.1, holdTo: 3.4,
  accel: 6.5, brake: 15, coast: 1.6,
  /** The axles' distance (m), the wheel's full lock slow and at speed (rad), how quickly the wheel follows the hand. */
  base: 2.6, lockSlow: 0.78, lockFast: 0.17, lockHold: 4.5, wheel: 5.5,
  /** Nearly stopped and under power it comes round on the spot (rad/s at a standstill, fading out by `pivotBelow`
   *  m/s): a tight place is turned out of in one go, not shunted out of in ten. */
  pivot: 2.2, pivotBelow: 3.4,
  /** Half the body (m): along it and across. */
  half: 2.15, wide: 0.95,
  /** How hard it brakes by itself for someone ahead (m/s²), and how far short of them it stops (m, bumper to person). */
  yield: 10, clear: 1.6,
  /** The pace it keeps to going past someone who is straight ahead while its wheel takes it round them (m/s). */
  careful: 4.2,
};

export const BOAT = {
  /** `town`: what it gets up to at once; `max`: once it has held a course for a moment, as the car does. */
  max: 11.5, town: 8, back: 2.4, accel: 3.2, brake: 5, coast: 0.55,
  /** How fast it turns at speed (rad/s), and a little even when barely moving (so it can be pointed away from a dock). */
  turn: 1.05, turnIdle: 0.35, wheel: 3,
  half: 2.2, wide: 0.85,
  /** From how far off its hull it is taken (m): a step or two from the sand, the shallows, a pier's boards or the
   *  water, so one walks up to it and takes it (a car: `CAR_REACH`). */
  reach: 3.2,
};
export const CAR_REACH = 1.7;

/** How it holds the road (16 Nov 2026: the owner did not enjoy the handbrake slides of the day before, "maybe it
 *  should be more like it was without the drifting… if you're going really fast, sometimes it drifts a little bit").
 *  It goes where it is pointed, and the brake is the brake, in a turn too (`from`: Infinity, no slide is started by
 *  hand; `chargeMin`: Infinity, no kick). Its course follows its nose at once (`grip`, 1/s). Only really fast
 *  (`looseFrom` m/s) with the wheel hard over (`looseSteer`) do the back wheels let go a little (`slide`): the angle
 *  between nose and course settles at the turn divided by `slide`, never more than `angle` (rad), and it catches
 *  again at `recover` as soon as the wheel is eased or the pace drops. Beyond `catch` (rad) it counts as sliding (the
 *  tires are heard, marks are left). The other fields are the handbrake slide's, kept for the arithmetic. */
export const CAR_DRIFT = { from: Infinity, looseFrom: 12.5, looseSteer: 0.7, yaw0: 1.1, yaw1: 0.9, yawK: 1, slide: 4.4, recover: 9, grip: 22, angle: 0.3, scrub: 0.3, catch: 0.12, chargeMin: Infinity, chargeMax: 2.2, boost0: 0.5, boostK: 0.55, kick: 3.6 };
export const BOAT_DRIFT = { from: Infinity, looseFrom: 9.5, looseSteer: 0.7, yaw0: 0, yaw1: 0, yawK: 1.7, slide: 2.2, recover: 3, grip: 4, angle: 0.5, scrub: 0.3, catch: 0.3, chargeMin: Infinity, chargeMax: 2, boost0: 0.4, boostK: 0.4, kick: 2 };

/** A vehicle on the ground plan: where its middle is, where it points, how fast it goes along that (negative: back)
 *  and across it (a slide). */
export class Motion {
  x = 0; z = 0; heading = 0; speed = 0;
  /** Its speed sideways, to its left (m/s): next to nothing with the wheels gripping, most of its pace in a slide. */
  slip = 0;
  /** The wheel as it is (eased after the hand), −1…1. */
  steer = 0;
  /** How much of the last step was taken away by something in the way (0–1), for a bump's sound and the body's nod. */
  bump = 0;
  /** A car: how long it has held its course on the asphalt (s), and its top speed just now. */
  hold = 0;
  top = 0;
  /** A boat coming round at the bay's edge: which way (it keeps to it until it is clear; 0: not turning). */
  veer = 0;
  /** In a slide (the brake held while turning at speed); how long this one has lasted (s); the kick it left (s to go). */
  drift = false;
  charge = 0;
  boost = 0;
  /** How fast it is turning (rad/s, to the right positive), and its pick-up or braking along its length (m/s²): for
   *  the body's lean and squat. */
  yaw = 0;
  surge = 0;
  constructor(readonly spec: typeof CAR | typeof BOAT, readonly kind: "car" | "boat") {}

  set(x: number, z: number, heading: number) {
    this.x = x; this.z = z; this.heading = heading;
    this.speed = 0; this.slip = 0; this.steer = 0; this.bump = 0; this.hold = 0; this.veer = 0;
    this.drift = false; this.charge = 0; this.boost = 0; this.yaw = 0; this.surge = 0;
  }

  /** A car's way with its wheel as it is: the curvature of its path (1/m; positive to the right of the way it goes,
   *  `dir` −1 backing up). */
  curve(dir = 1) {
    return (Math.tan(this.steer * lockAt(this.speed)) / CAR.base) * dir;
  }

  get fx() { return Math.sin(this.heading); }
  get fz() { return Math.cos(this.heading); }
  /** How fast it goes over the ground, whichever way (m/s), and that way (world x, z). */
  get pace() { return Math.hypot(this.speed, this.slip); }
  get vx() { return this.fx * this.speed + this.fz * this.slip; }
  get vz() { return this.fz * this.speed - this.fx * this.slip; }
  /** No faster than `most` over the ground, whichever way it is going (braked at `hard` m/s²). */
  limit(most: number, hard: number, dt: number) {
    const p = this.pace;
    if (p > most) { const k = Math.max(most, p - hard * dt) / p; this.speed *= k; this.slip *= k; }
  }
  /** The angle between where it points and the way it goes (rad; to the left positive, 0 standing). */
  get drifted() { return Math.abs(this.slip) < 1e-6 ? 0 : Math.atan2(this.slip, Math.abs(this.speed)); }
  /** Sliding: its course well off its nose, and moving. */
  get sliding() { return this.pace > 1.5 && Math.abs(this.drifted) > (this.kind === "car" ? CAR_DRIFT : BOAT_DRIFT).catch; }

  /** One step. `gap`: how far ahead, the way it is going, the nearest person on foot is (from its middle; Infinity:
   *  nobody): the speed is held to what stops `clear` short of them. `care`: the same for someone straight ahead whom
   *  its turned wheel takes it round: it does not stop for them, but goes by no faster than `careful`. It moves the way
   *  it is going (along its heading, and sideways in a slide); what is in the way is settled afterwards by `settle`.
   *  The brake is the brake, in a turn too. Really fast with the wheel hard over, the back wheels let go a little
   *  (CAR_DRIFT): a small slide that catches by itself. */
  step(dt: number, c: Controls, gap = Infinity, road = true, care = Infinity) {
    const S = this.spec, car = this.kind === "car", D = car ? CAR_DRIFT : BOAT_DRIFT;
    this.steer += (c.steer - this.steer) * Math.min(1, dt * S.wheel);
    let v = this.speed, sl = this.slip;
    const was = v, pace0 = Math.hypot(v, sl);
    this.drift = c.brake && v > 0 && pace0 > (this.drift ? D.from * 0.45 : D.from) && (this.drift || Math.abs(c.steer) > 0.25);
    const braking = c.brake && !this.drift;
    const t = braking ? 0 : c.throttle;
    // a car's top speed: its town pace; more once it has held a course on the asphalt for a moment (a sharp turn, the
    // brake or leaving the asphalt take that away again); gently off the asphalt; and the kick out of a slide
    let top = S.max;
    {
      const steady = road && !c.brake && t > 0.6 && Math.abs(this.steer) < 0.42 && v > S.town * 0.55 && this.bump < 0.2;
      this.hold = steady ? Math.min(CAR.holdTo, this.hold + dt) : Math.max(0, this.hold - dt * (Math.abs(this.steer) > 0.75 || braking || !road ? 6 : 2.5));
      const k = Math.min(1, Math.max(0, (this.hold - CAR.holdFrom) / (CAR.holdTo - CAR.holdFrom)));
      top = road || !car ? S.town + (S.max - S.town) * k * k * (3 - 2 * k) : CAR.rough;
      if (this.boost > 0) top += D.kick * Math.min(1, this.boost / 0.4);
      this.top = top;
    }
    const push = S.accel * (this.boost > 0 ? 1.7 : 1);
    if (braking) v = toward(v, 0, S.brake * dt);
    else if (this.drift) v = t > 0 ? Math.min(Math.max(v, top), v + push * 0.55 * t * dt) : toward(v, 0, 1.5 * dt);
    else if (t > 0) v = v < -0.2 ? toward(v, 0, S.brake * dt) : v > top * Math.max(0.35, t) ? Math.max(top * Math.max(0.35, t), v - (car ? 7 : 3) * dt) : Math.min(top * Math.max(0.35, t), v + push * t * dt * (1 - 0.5 * Math.max(0, v) / S.max));
    else if (t < 0) v = v > 0.3 ? toward(v, 0, S.brake * -t * dt) : Math.max(-S.back, v + S.accel * t * dt);
    else v = toward(v * Math.exp(-(car ? 0.35 : 0.5) * dt), 0, S.coast * dt);
    // never into someone on foot: no faster than what stops short of them (forwards, backing up or sliding)
    if (car && (gap !== Infinity || care !== Infinity)) {
      let most = Infinity, hard = 16;
      if (gap !== Infinity) { const room = gap - CAR.half - CAR.clear; most = room > 0 ? Math.sqrt(2 * CAR.yield * room) : 0; if (room <= 0) hard = 40; }
      // someone straight ahead but off the way its wheel takes it (`care`: how far): past them, but at a careful pace
      if (care !== Infinity) { const room = care - CAR.half - CAR.clear; most = Math.min(most, Math.max(CAR.careful, room > 0 ? Math.sqrt(2 * CAR.yield * room) : 0)); }
      const pace = Math.hypot(v, sl);
      if (pace > most) { const k = Math.max(most, pace - hard * dt) / pace; v *= k; sl *= k; }
    }
    // the turn
    let w: number;
    if (car) {
      // the front wheels' lock is less the faster it goes; the turn is the bicycle's
      w = (v / CAR.base) * Math.tan(this.steer * lockAt(v));
      // nearly stopped and under power it comes round on the spot (backing up, the other way, as a car's tail does)
      const slow = Math.max(0, 1 - Math.abs(v) / CAR.pivotBelow);
      if (slow > 0 && t !== 0) w += this.steer * CAR.pivot * slow * Math.sign(t) * Math.min(1, Math.abs(t) * 2.5);
      // in a slide the wheel turns it directly: into the bend, or back out of it
      if (this.drift) w = this.steer * (D.yaw0 + D.yaw1 * Math.min(1, pace0 / 12));
    } else {
      // (an outboard turns the boat by its thrust: under power it comes round even while it is barely moving, as when
      // its bow lies on the shallows)
      const k = Math.min(1, Math.max(Math.abs(v) / 3, Math.abs(t) * 0.5));
      w = this.steer * (BOAT.turnIdle + (BOAT.turn - BOAT.turnIdle) * k) * (v < -0.1 ? -1 : 1) * (this.drift ? D.yawK : 1);
    }
    this.yaw = w;
    // it goes on the way it was going while its nose comes round: what is left across its new heading is the slide,
    // which the wheels (the keel) take away quickly when they grip and slowly when they do not
    // (to the right is a smaller heading: the game's headings turn towards +X, which is on one's left facing +Z)
    const f0x = this.fx, f0z = this.fz, Vx = f0x * v + f0z * sl, Vz = f0z * v - f0x * sl;
    this.heading = wrap(this.heading - w * dt);
    const fx = this.fx, fz = this.fz;
    v = Vx * fx + Vz * fz; sl = Vx * fz - Vz * fx;
    {
      // (its pace is kept: the course is turned towards the nose, not braked towards it)
      const P = Math.hypot(v, sl), back = v < 0 ? -1 : 1;
      let beta = P > 1e-6 ? Math.atan2(sl, Math.abs(v)) : 0;
      // (really fast with the wheel hard over, the back lets go a little; else the course follows the nose at once)
      const loose = this.drift || (v > 0 && pace0 > D.looseFrom && Math.abs(this.steer) > D.looseSteer);
      beta *= Math.exp(-(loose ? D.slide : Math.abs(beta) > D.catch ? D.recover : D.grip) * dt);
      // (the nose comes no further round than `angle` off its course: a small slide, never a spin)
      if (loose && Math.abs(beta) > D.angle) { const over = beta - Math.sign(beta) * D.angle; this.heading = wrap(this.heading + over); beta -= over; }
      const rub = Math.exp(-D.scrub * Math.sin(beta) ** 2 * dt);
      v = back * P * Math.cos(beta) * rub; sl = P * Math.sin(beta) * rub;
      // a slide held for a moment ends in a kick
      if (this.drift && Math.abs(beta) > D.catch) this.charge = Math.min(D.chargeMax, this.charge + dt);
    }
    if (this.drift) { /* (counted above) */ }
    else if (!this.drift && this.charge > 0) {
      if (this.charge >= D.chargeMin && v > D.from * 0.5) this.boost = D.boost0 + this.charge * D.boostK;
      this.charge = 0;
    }
    this.boost = Math.max(0, this.boost - dt);
    this.surge += ((v - was) / Math.max(dt, 1e-4) - this.surge) * Math.min(1, dt * 8);
    this.speed = v; this.slip = sl;
    this.x += this.vx * dt;
    this.z += this.vz * dt;
    this.bump = Math.max(0, this.bump - dt * 3);
  }

  /** The body as circles along its length (front, middle, back), each pushed by `fix` out of what it may not be in
   *  (`fix` moves the point it is given); the body follows its front and back circles, turning with them, and loses
   *  the speed that went into the obstacle and no more: it slides along a kerb, a wall or a parked car. */
  settle(fix: (p: { x: number; z: number }, r: number) => void) {
    const S = this.spec, off = S.half - S.wide, fx = this.fx, fz = this.fz;
    const a = { x: this.x + fx * off, z: this.z + fz * off }, b = { x: this.x - fx * off, z: this.z - fz * off }, m = { x: this.x, z: this.z };
    const a0x = a.x, a0z = a.z, b0x = b.x, b0z = b.z, m0x = m.x, m0z = m.z;
    fix(a, S.wide); fix(b, S.wide); fix(m, S.wide);
    const mx = m.x - m0x, mz = m.z - m0z;
    a.x += mx * 0.5; a.z += mz * 0.5; b.x += mx * 0.5; b.z += mz * 0.5;
    const moved = Math.hypot(a.x - a0x, a.z - a0z) + Math.hypot(b.x - b0x, b.z - b0z);
    if (moved < 1e-5) return 0;
    // the way it was pushed is the way out of the obstacle: what it was doing into it is lost, the rest it keeps
    let Vx = this.vx, Vz = this.vz;
    const nx0 = (a.x + b.x) / 2 - this.x, nz0 = (a.z + b.z) / 2 - this.z, nl = Math.hypot(nx0, nz0);
    this.x = (a.x + b.x) / 2; this.z = (a.z + b.z) / 2;
    const h = Math.atan2(a.x - b.x, a.z - b.z);
    this.heading = wrap(this.heading + wrap(h - this.heading) * 0.85);
    if (nl > 1e-6) {
      const nx = nx0 / nl, nz = nz0 / nl, into = -(Vx * nx + Vz * nz);
      if (into > 0) {
        this.bump = Math.max(this.bump, Math.min(1, into / 5));
        Vx += nx * into; Vz += nz * into;
        // (a hard knock ends a slide and the pace built up on a course)
        if (into > 3) { this.drift = false; this.charge = 0; this.boost = 0; }
      }
    }
    // (running along what it met, its nose comes round to the way it is now going: it does not grind on at an angle)
    if (this.kind === "car" && !this.drift && Vx * this.fx + Vz * this.fz > 2) {
      const course = Math.atan2(Vx, Vz);
      this.heading = wrap(this.heading + wrap(course - this.heading) * 0.3);
    }
    // (and a little to the scrape itself)
    const rub = 1 - Math.min(0.12, moved * 0.35);
    const gx = this.fx, gz = this.fz;
    this.speed = (Vx * gx + Vz * gz) * rub; this.slip = (Vx * gz - Vz * gx) * rub;
    return moved;
  }
}

/** A car's full lock at `v` m/s (rad): all of it up to a brisk walk's pace (a tight circle to turn round in), less
 *  the faster it goes. */
export function lockAt(v: number) {
  const k = Math.min(1, Math.max(0, (Math.abs(v) - CAR.lockHold) / (CAR.max - CAR.lockHold)));
  return CAR.lockSlow + (CAR.lockFast - CAR.lockSlow) * k * (2 - k);
}

/** Whether someone on foot starts at a car going by (they jump aside; one of them may call after it). `along`, `lat`:
 *  where they are from the car's middle, along its way and across it (m); `speed` m/s; `hl`, `hw`: half its length
 *  and width; `onStreet`: they stand on the asphalt; `carOnStreet`: so does the car. Only when it is really close and
 *  coming at them: someone on the sidewalk while the car keeps to the street is left in peace, unless it is heading
 *  straight at them over the kerb; nobody beside it or behind it starts. */
export function startles(along: number, lat: number, speed: number, hl: number, hw: number, onStreet: boolean, carOnStreet: boolean) {
  const side = Math.abs(lat);
  if (along <= 0) return false;
  if (carOnStreet && !onStreet) return side < hw + 0.15 && along < hl + 3.2;
  return side < hw + 0.75 && along < hl + 1 + speed * 0.45;
}

function toward(v: number, to: number, by: number) { return v > to ? Math.max(to, v - by) : Math.min(to, v + by); }
function wrap(a: number) { return Math.atan2(Math.sin(a), Math.cos(a)); }

/** A boat and the bay's edge (the line of buoys): how far before it the bow starts to come round (m), how far inside
 *  the edge the boat's middle stays (its bow reaches further), and how far before the shallows it eases off. */
export const BAY_EDGE = { band: 18, inset: 2.8, fade: 6, shore: 14 };

/** A boat making for the bay's edge comes round by itself to run along it: how fast its heading turns for that
 *  (rad/s; 0 away from the edges, or when it is not heading out). `left`: metres from its middle to each edge it could
 *  cross, with the way out across it. The nearer way round is taken; dead on, the helm's, else to starboard. */
export function bayTurn(m: Motion, edges: { left: number; nx: number; nz: number }[]): number {
  const dir = Math.sign(m.speed) || 1;
  let turn = 0, most = 0, way = 0;
  for (const e of edges) {
    const out = (m.fx * e.nx + m.fz * e.nz) * dir;
    if (e.left >= BAY_EDGE.band || out <= 0.04) continue;
    const k = 1 - Math.max(0, e.left) / BAY_EDGE.band, cross = (m.fx * e.nz - m.fz * e.nx) * dir;
    // (to the right is a smaller heading; the turn takes the course away from the way out)
    const side = Math.abs(cross) > 0.06 ? Math.sign(cross) : m.steer ? -Math.sign(m.steer) * dir : -1;
    const w = k * k * (0.35 + out) * 2.4;
    turn += w;
    // (in a corner of the bay both edges turn it the same way round, the nearer one's: against each other they
    // would hold it there)
    if (w > most) { most = w; way = side; }
  }
  // (the way round it has begun, it keeps: at a corner the two edges would else take turns and hold it there)
  m.veer = turn ? m.veer || way : 0;
  return m.veer * turn * Math.min(1, 0.3 + Math.abs(m.speed) / 3);
}

/** A boat running in to the beach eases off as the water gets thin: the most it makes towards the shore with `left`
 *  m of water still ahead of its bow (m/s). It comes to rest on the shallows without a bump. */
export const shoreSpeed = (left: number) => 0.5 + Math.max(0, left) * (BOAT.max / BAY_EDGE.shore);

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

/** As aheadIn, along the way a car really takes with its wheel turned: an arc of curvature `curv` (1/m, to the right
 *  of its way when positive; near 0, the straight strip). The gap is the way along the arc; who is more than `half`
 *  off it (a little more on a tight turn: the body's corners swing wide), behind, or beyond `reach` is not in it. */
export function aheadOnArc(x: number, z: number, fx: number, fz: number, curv: number, px: number, pz: number, reach: number, half: number) {
  if (Math.abs(curv) < 0.015) return aheadIn(x, z, fx, fz, px, pz, reach, half);
  // (lat: to the left of its way; the turn's middle lies 1/curv to the right)
  const dx = px - x, dz = pz - z, along = dx * fx + dz * fz, lat = dx * fz - dz * fx;
  const c = -1 / curv, R = Math.abs(c), u = (c - lat) * Math.sign(c);
  if (Math.abs(Math.hypot(u, along) - R) > half + Math.min(0.5, 2 / R)) return Infinity;
  const th = Math.atan2(along, u);
  if (th <= 0) return Infinity;
  const gap = th * R;
  return gap <= reach ? gap : Infinity;
}
