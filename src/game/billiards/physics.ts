export const HALF_WIDTH = 0.495;
export const HALF_LENGTH = 0.99;
export const RADIUS = 0.0286;
export const HEAD = HALF_LENGTH / 2;
export const FOOT = -HEAD;
export const MAX_SPEED = 4.8;
export const POCKET_RADIUS = 0.064;
export const STEP = 1 / 360;

export interface Point { x: number; z: number }
export const POCKETS = {
  fl: { x: -HALF_WIDTH, z: -HALF_LENGTH },
  fr: { x: HALF_WIDTH, z: -HALF_LENGTH },
  ls: { x: -HALF_WIDTH, z: 0 },
  rs: { x: HALF_WIDTH, z: 0 },
  nl: { x: -HALF_WIDTH, z: HALF_LENGTH },
  nr: { x: HALF_WIDTH, z: HALF_LENGTH },
} satisfies Record<string, Point>;
export type Pocket = keyof typeof POCKETS;
export const POCKET_IDS = Object.keys(POCKETS) as Pocket[];
export interface Ball extends Point {
  id: number;
  vx: number;
  vz: number;
  pocket: Pocket | null;
}
export type Impact = "click" | "cushion" | "drop";
export const ballAt = (id: number, x: number, z: number): Ball => ({ id, x, z, vx: 0, vz: 0, pocket: null });
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);

export function shoot(ball: Ball, angle: number, power: number) {
  const speed = Math.min(1, Math.max(0, power)) * MAX_SPEED;
  ball.vx = Math.sin(angle) * speed;
  ball.vz = Math.cos(angle) * speed;
}

function capture(ball: Ball, sound?: (kind: Impact, speed: number) => void) {
  const pocket = POCKET_IDS.find((id) => distance(ball, POCKETS[id]) < POCKET_RADIUS);
  if (!pocket) return false;
  sound?.("drop", Math.hypot(ball.vx, ball.vz));
  ball.pocket = pocket;
  ball.vx = ball.vz = 0;
  return true;
}

function bounce(ball: Ball, axis: "x" | "z", bound: number, sound?: (kind: Impact, speed: number) => void) {
  const v = axis === "x" ? "vx" : "vz";
  if (Math.abs(ball[axis]) <= bound) return;
  const side = Math.sign(ball[axis]);
  ball[axis] = side * bound;
  if (ball[v] * side <= 0) return;
  sound?.("cushion", Math.abs(ball[v]));
  ball[v] *= -0.75;
}

export function stepBalls(balls: Ball[], sound?: (kind: Impact, speed: number) => void) {
  for (const ball of balls) {
    if (ball.pocket) continue;
    ball.x += ball.vx * STEP;
    ball.z += ball.vz * STEP;
    const speed = Math.hypot(ball.vx, ball.vz);
    const remaining = Math.max(0, speed - (0.37 + 0.39 * speed) * STEP);
    if (speed > 0) {
      ball.vx *= remaining / speed;
      ball.vz *= remaining / speed;
    }
  }
  // Repeat contact correction for tight packs. Apply impulses only on approaching contacts.
  for (let pass = 0; pass < 8; pass++) {
    let touching = false;
    for (let i = 0; i < balls.length; i++) {
      const a = balls[i];
      if (a.pocket) continue;
      for (let j = i + 1; j < balls.length; j++) {
        const b = balls[j];
        if (b.pocket || Math.abs(b.x - a.x) >= 2 * RADIUS || Math.abs(b.z - a.z) >= 2 * RADIUS) continue;
        const d = distance(a, b);
        if (d >= 2 * RADIUS) continue;
        touching = true;
        const nx = d > 1e-9 ? (b.x - a.x) / d : 1;
        const nz = d > 1e-9 ? (b.z - a.z) / d : 0;
        const correction = (2 * RADIUS - d + 1e-8) / 2;
        a.x -= nx * correction; a.z -= nz * correction;
        b.x += nx * correction; b.z += nz * correction;
        const approach = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
        if (approach <= 0) continue;
        const impulse = approach * (1 + 0.95) / 2;
        a.vx -= nx * impulse; a.vz -= nz * impulse;
        b.vx += nx * impulse; b.vz += nz * impulse;
        if (approach > 0.055) sound?.("click", approach);
      }
    }
    for (const ball of balls) {
      if (ball.pocket || capture(ball, sound)) continue;
      bounce(ball, "x", HALF_WIDTH - RADIUS, sound);
      bounce(ball, "z", HALF_LENGTH - RADIUS, sound);
    }
    if (!touching) break;
  }
}

export const moving = (balls: Ball[]) => balls.some(({ vx, vz }) => vx !== 0 || vz !== 0);

export function ghostBall(ball: Point, pocket: Pocket): Point {
  const hole = POCKETS[pocket], d = distance(ball, hole);
  return { x: ball.x - (hole.x - ball.x) * 2 * RADIUS / d, z: ball.z - (hole.z - ball.z) * 2 * RADIUS / d };
}

export const headingTo = (from: Point, to: Point) => Math.atan2(to.x - from.x, to.z - from.z);

export function aimGuide(cue: Point, angle: number, balls: Ball[]) {
  const dx = Math.sin(angle), dz = Math.cos(angle);
  const reach = (origin: number, direction: number, half: number) => Math.abs(direction) < 1e-8
    ? Infinity : ((half - RADIUS) * Math.sign(direction) - origin) / direction;
  let length = Math.max(0, Math.min(reach(cue.x, dx, HALF_WIDTH), reach(cue.z, dz, HALF_LENGTH)));
  let hit: Ball | undefined;
  for (const ball of balls) {
    if (!ball.id || ball.pocket) continue;
    const x = ball.x - cue.x, z = ball.z - cue.z;
    const cross = x * dz - z * dx;
    if (Math.abs(cross) > 2 * RADIUS) continue;
    const t = x * dx + z * dz - Math.sqrt(4 * RADIUS ** 2 - cross ** 2);
    if (t >= -1e-6 && t < length) { length = Math.max(t, 0); hit = ball; }
  }
  return { length, end: { x: cue.x + dx * length, z: cue.z + dz * length }, hit };
}
