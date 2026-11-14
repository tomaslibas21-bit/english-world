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

/** A jump: up about a metre and down again in a little over half a second, a squash on landing. `y` is how high the
 *  feet are; `ground` what they stand on or are over (0: the street; a bench's seat, a car's hood: ledges.ts; below 0
 *  in the shallows). A jump lands on whatever is under it when it comes down, and walking off an edge is a fall. A
 *  second press in the air is a flip: a somersault, with a little more lift (once a jump). So what can be reached is
 *  the jump's own arithmetic: anything up to about a metre with a plain jump (a bench, a car's hood or trunk, a low
 *  fence), up to about 1.4 m with a flip (a mailbox, a tall fence), and a car's roof only from its hood or its trunk.
 *  Walls, people and everything above ledges.ts's CLIMB stay on the ground plan: no jump gets over those, onto a roof
 *  or out of the town. */
export class Hop {
  static readonly V0 = 7;
  /** The least a flip leaves them rising at. */
  static readonly V_FLIP = 4;
  static readonly G = 24;
  /** The highest a jump goes above where it started (m), and what a flip at the top of one adds. */
  static readonly PEAK = (Hop.V0 * Hop.V0) / (2 * Hop.G);
  static readonly FLIP_LIFT = (Hop.V_FLIP * Hop.V_FLIP) / (2 * Hop.G);
  /** How long the somersault takes (s). */
  static readonly FLIP_TIME = 0.46;
  y = 0;
  ground = 0;
  vy = 0;
  air = false;
  /** The landing's squash (0–1) and how it springs back. */
  squash = 0;
  private squashVel = 0;
  private wait = 0;
  /** The somersault: how far round it is (0–1; 0 when there is none), and whether this jump has had its flip. */
  flipT = 0;
  private flipped = false;

  /** Starts a jump (false while in the air or just landed). */
  start(): boolean {
    if (this.air || this.wait > 0) return false;
    this.air = true;
    this.vy = Hop.V0;
    this.squash = -0.35; // a stretch on take-off
    this.squashVel = 0;
    this.flipped = false;
    return true;
  }

  /** A flip, in the air only and once a jump (false otherwise): a somersault and a little more lift. Falling off an
   *  edge counts as being in the air. */
  flip(): boolean {
    if (!this.air || this.flipped || this.flipT > 0) return false;
    this.flipped = true;
    this.flipT = 1e-4;
    this.vy = Math.max(this.vy, Hop.V_FLIP);
    this.squash = -0.2;
    this.squashVel = 0;
    return true;
  }

  /** Standing at once on what is under them (a conversation starts, a door, a ride). */
  land(ground = 0) { this.y = this.ground = ground; this.vy = 0; this.air = false; this.squash = 0; this.squashVel = 0; this.wait = 0; this.flipT = 0; this.flipped = false; }

  /** `ground`: how high what is under them stands now. Returns how hard they just landed (0: they didn't). */
  update(dt: number, ground = 0): number {
    let landed = 0;
    const was = this.ground;
    this.ground = ground;
    this.wait = Math.max(0, this.wait - dt);
    if (!this.air) {
      // a step down is a fall; the sand sloping away and a slope's small steps (a windshield, a hood) are followed
      // down, and a small step up (onto a terrace's boards from the sand) is taken in a moment, not in one frame
      if (ground < Math.min(this.y, was) - 0.13) { this.air = true; this.vy = 0; this.flipped = false; }
      else if (ground < this.y) this.y = Math.max(ground, this.y - Math.max(4 * dt, (this.y - ground) * Math.min(1, dt * 30)));
      else this.y = ground > this.y ? Math.min(ground, this.y + Math.max(0.6 * dt, (ground - this.y) * Math.min(1, dt * 18))) : ground;
    }
    if (this.air) {
      // (the fall's own arithmetic, so a jump goes as high on a slow phone's long frames as on a fast one's short ones)
      this.y += this.vy * dt - 0.5 * Hop.G * dt * dt;
      this.vy -= Hop.G * dt;
      if (this.y <= ground && this.vy <= 0) {
        landed = Math.min(1, -this.vy / Hop.V0);
        this.y = ground; this.vy = 0; this.air = false; this.wait = 0.12;
        this.squash = 0.55 * landed;
        this.squashVel = 0;
      }
    }
    // the somersault turns on at its own pace, and is over a moment after a landing that came early
    if (this.flipT > 0) {
      this.flipT += (dt / Hop.FLIP_TIME) * (this.air ? 1 : 2.5);
      if (this.flipT >= 1) this.flipT = 0;
    }
    [this.squash, this.squashVel] = springStep(this.squash, this.squashVel, 0, this.air ? 9 : 16, dt);
    if (Math.abs(this.squash) < 1e-3 && Math.abs(this.squashVel) < 1e-2) { this.squash = 0; this.squashVel = 0; }
    return landed;
  }

  /** How high the feet are above what is under them. */
  get lift() { return Math.max(0, this.y - this.ground); }

  /** How far the legs tuck (0–1): up in the middle of the jump, and tight through a somersault. */
  get tuck() {
    const hop = this.air ? Math.min(1, this.lift / (Hop.PEAK * 0.6)) : 0;
    return this.flipT > 0 ? Math.max(hop, Math.sin(Math.PI * Math.min(1, this.flipT))) : hop;
  }

  /** How far round the somersault is (radians, 0…2π, eased at both ends; 0: none). */
  get spin() {
    const t = Math.min(1, this.flipT);
    return this.flipT > 0 ? Math.PI * 2 * (t * t * (3 - 2 * t)) : 0;
  }
}
