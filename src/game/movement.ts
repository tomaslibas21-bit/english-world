// Walking that feels right, kept apart from the scene so it can be tested: the direction pressed, as the camera shows
// it, is where the character turns (quickly, eased) and walks; the camera's own swing in behind the player doesn't
// drag that direction along; starts and stops ease in and out; and a small hop.
//
// Angles are headings on the ground as Game uses them: 0 = towards +Z, π/2 = towards +X (atan2(x, z)). A screen
// direction is 0 = up the screen (away from the camera), +π/2 = to the right.

const TAU = Math.PI * 2;

/** The shortest turn from `b` to `a` (radians, −π…π). */
export function angleDiff(a: number, b: number) {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  else if (d <= -Math.PI) d += TAU;
  return d;
}

/** The heading of screen direction `s` for a camera facing `yaw` (the camera's forward is up the screen). */
export const worldFromScreen = (yaw: number, s: number) => yaw - s;

/** One step of a critically damped spring from `x` (moving at `v`) towards `to`: no overshoot, eased at both ends,
 *  exact for any step `dt` (the loop's steps reach 50 ms). `w`: how quickly (1/s; about 4.7/w s to get 95 % there). */
export function springStep(x: number, v: number, to: number, w: number, dt: number): [number, number] {
  const x0 = x - to, e = Math.exp(-w * dt), c = v + w * x0;
  return [to + (x0 + c * dt) * e, (v - w * c * dt) * e];
}

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export interface SteerResult {
  /** The heading to walk towards, or null when nothing is pressed. */
  dir: number | null;
  /** How far the stick is pushed (0–1; 1 for keys). */
  mag: number;
}

/** The keys or the phone's stick turned into a heading. A press means that direction as the camera shows it at that
 *  moment. While the same keys stay down the heading stays put in the world, so the camera can swing in behind the
 *  player without dragging it along (no running in circles); a turn of the camera by the player's own drag turns it
 *  with the camera (steering with the mouse or a second finger). Once the camera has come round behind a player walking
 *  back towards it, the back key (or the stick held down) means "on": the side keys then turn left and right as the
 *  screen shows them. On the stick, a gentle pull back towards the screen's own directions (`settle`), so that holding
 *  it a little to one side curves the walk that way, as players expect. */
export class Steer {
  private world: number | null = null;
  private code = -1;
  private fold = false;
  private off = 0;
  private lastYaw = 0;
  private lastY = 0;
  private carried = false;
  /** How quickly (1/s) a stick held off to one side comes back to meaning the screen's direction. */
  settle = 0.45;

  get held() { return this.world !== null; }

  reset() { this.world = null; this.code = -1; this.fold = false; this.off = 0; this.carried = false; }

  /** @param x right (−1…1) and `y` up the screen (−1…1): the keys, or the stick
   *  @param stick true for the phone's stick (analogue), false for keys
   *  @param camYaw where the camera faces now
   *  @param manualTurn how much the player's own drag turned the camera since the last call (the rest of the camera's
   *         turning is its own swing, which the heading ignores) */
  update(x: number, y: number, stick: boolean, camYaw: number, manualTurn: number, dt: number): SteerResult {
    const mag = Math.min(1, Math.hypot(x, y));
    const swing = angleDiff(camYaw, this.lastYaw) - manualTurn;
    this.lastYaw = camYaw;
    if (mag < (stick ? 0.12 : 0.5)) { this.lastY = 0; this.reset(); return { dir: null, mag: 0 }; }
    this.lastY = y;
    const s = Math.atan2(x, y);
    if (!stick) {
      const code = (Math.sign(x) + 1) * 3 + (Math.sign(y) + 1);
      if (this.world === null || code !== this.code) {
        if (y >= 0) this.fold = false;
        const sk = this.fold && y < 0 ? Math.atan2(x, -y) : s;
        this.world = worldFromScreen(camYaw, sk);
        this.code = code;
      } else this.world += manualTurn;
      this.carried = false;
      // the camera has come round behind a player walking back towards it: the back key now means "on"
      if (y < 0 && !this.fold && Math.abs(angleDiff(this.world, camYaw)) < Math.PI / 2) this.fold = true;
      this.code = code;
      return { dir: angleDiff(this.world, 0), mag: 1 };
    }
    // the stick: heading = the screen direction as the camera shows it, plus an offset that keeps the heading put
    // through the camera's own swing (and fades, `settle`)
    let sk = this.fold ? mirror(s) : s;
    if (this.world === null) { this.off = 0; this.fold = false; sk = s; }
    else if (this.carried) this.off = angleDiff(this.world - worldFromScreen(camYaw, sk), 0);
    else this.off -= swing;
    this.carried = false;
    if (!this.fold && Math.abs(s) > 1.75 && this.world !== null && Math.abs(angleDiff(this.world, camYaw)) < Math.PI / 2) {
      // the camera has come round behind a player walking back towards it: from now on the stick's lower half mirrors
      // its upper half (held down means "on"), the heading unchanged
      this.fold = true;
      const m = mirror(s);
      this.off = angleDiff(this.off + m - s, 0);
      sk = m;
    }
    this.off *= Math.exp(-this.settle * dt);
    this.world = worldFromScreen(camYaw, sk) + this.off;
    return { dir: angleDiff(this.world, 0), mag };
  }

  /** The player came through a door (a new place, a new camera) with the same keys or the stick still held: they keep
   *  going the way they now face (out into the street, into the room), and the back key held towards the camera indoors
   *  means "on" outside. */
  carry(heading: number, camYaw: number) {
    if (this.world === null) return;
    this.world = heading;
    this.lastYaw = camYaw;
    this.fold = this.lastY < 0 && Math.abs(angleDiff(heading, camYaw)) < Math.PI / 2;
    this.carried = true;
  }
}

/** The stick's lower half folded onto its upper half (down = up, the sides stay). */
function mirror(s: number) {
  return Math.abs(s) > Math.PI / 2 ? Math.sign(s) * (Math.PI - Math.abs(s)) : s;
}

/** The character's walk: which way they face (turning quickly, eased) and how fast they go along it (easing in and
 *  out). A big turn slows them first, as a person turns round, instead of sliding backwards. */
export class Gait {
  facing = 0;
  turnVel = 0;
  speed = 0;
  private speedVel = 0;
  /** How quickly they turn and change speed (see springStep). */
  turnRate = 15;
  startRate = 9;
  stopRate = 14;
  /** The fastest turn (rad/s). */
  maxTurn = 13;

  /** Takes over from another kind of walking (the old one, kept for walking to a clicked spot). */
  sync(facing: number, speed: number) {
    this.facing = facing; this.speed = speed; this.turnVel = 0; this.speedVel = 0;
  }

  /** Towards heading `dir` (null: slowing to a stop where they face) at `speed` m/s. */
  step(dt: number, dir: number | null, speed: number) {
    let target = 0;
    if (dir !== null) {
      const d = angleDiff(dir, this.facing);
      const [f, v] = springStep(0, this.turnVel, d, this.turnRate, dt);
      this.turnVel = Math.max(-this.maxTurn, Math.min(this.maxTurn, v));
      this.facing = angleDiff(this.facing + Math.max(-this.maxTurn * dt, Math.min(this.maxTurn * dt, f)), 0);
      // facing away from where they want to go: slow down, turn, then off again
      const rest = Math.abs(angleDiff(dir, this.facing));
      target = speed * smoothstep(Math.PI * 0.62, Math.PI * 0.12, rest);
    } else {
      const [, v] = springStep(0, this.turnVel, 0, this.turnRate, dt);
      this.turnVel = v;
    }
    const rate = target > this.speed ? this.startRate : this.stopRate;
    [this.speed, this.speedVel] = springStep(this.speed, this.speedVel, target, rate, dt);
    if (this.speed < 0.02 && target === 0) { this.speed = 0; this.speedVel = 0; }
    return { vx: Math.sin(this.facing) * this.speed, vz: Math.cos(this.facing) * this.speed };
  }
}

/** A small hop: up about half a metre and down again in half a second, a squash on landing. Only how high the body is
 *  drawn changes: the player stays on the ground for everything else (walls, fences, doors, the people), so a hop can
 *  never get over anything, onto a roof or out of the town. */
export class Hop {
  static readonly V0 = 4.6;
  static readonly G = 19;
  /** The highest a hop goes (m). */
  static readonly PEAK = (Hop.V0 * Hop.V0) / (2 * Hop.G);
  y = 0;
  vy = 0;
  air = false;
  /** The landing's squash (0–1) and how it springs back. */
  squash = 0;
  private squashVel = 0;
  private wait = 0;

  /** Starts a hop (false while in the air or just landed). */
  start(): boolean {
    if (this.air || this.wait > 0) return false;
    this.air = true;
    this.vy = Hop.V0;
    this.squash = -0.35; // a stretch on take-off
    this.squashVel = 0;
    return true;
  }

  /** Back on the ground at once (a conversation starts, a door, a ride). */
  land() { this.y = 0; this.vy = 0; this.air = false; this.squash = 0; this.squashVel = 0; this.wait = 0; }

  /** Returns how hard it just landed (0: it didn't). */
  update(dt: number): number {
    let landed = 0;
    this.wait = Math.max(0, this.wait - dt);
    if (this.air) {
      this.vy -= Hop.G * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        landed = Math.min(1, -this.vy / Hop.V0);
        this.y = 0; this.vy = 0; this.air = false; this.wait = 0.12;
        this.squash = 0.55 * landed;
        this.squashVel = 0;
      }
    }
    [this.squash, this.squashVel] = springStep(this.squash, this.squashVel, 0, this.air ? 9 : 16, dt);
    if (Math.abs(this.squash) < 1e-3 && Math.abs(this.squashVel) < 1e-2) { this.squash = 0; this.squashVel = 0; }
    return landed;
  }

  /** How far the legs tuck (0–1): up in the middle of the hop. */
  get tuck() { return this.air ? Math.min(1, this.y / (Hop.PEAK * 0.6)) : 0; }
}
