import { callable, type Group } from "./rules";
import {
  distance, ghostBall, HALF_LENGTH, HALF_WIDTH, headingTo, POCKET_IDS, POCKETS, RADIUS,
  type Ball, type Point,
} from "./physics";

function clearance(from: Point, to: Point, blockers: Ball[]) {
  const dx = to.x - from.x, dz = to.z - from.z;
  const lengthSquared = dx * dx + dz * dz;
  return blockers.reduce((min, ball) => {
    const projection = lengthSquared > 1e-10 ? ((ball.x - from.x) * dx + (ball.z - from.z) * dz) / lengthSquared : 0;
    const t = Math.max(0, Math.min(1, projection));
    return Math.min(min, distance(ball, { x: from.x + dx * t, z: from.z + dz * t }));
  }, Infinity);
}

export function chooseShot(balls: Ball[], group: Group, random: () => number) {
  const cue = balls[0];
  const active = balls.filter((ball) => ball.id && !ball.pocket);
  const candidates = callable(balls, group).flatMap((ball) => POCKET_IDS.map((pocket) => {
    const object = POCKETS[pocket], ghost = ghostBall(ball, pocket);
    const aim = headingTo(cue, ghost);
    const cosine = Math.cos(aim - headingTo(ball, object));
    const travel = distance(cue, ghost), run = distance(ball, object);
    const blockers = active.filter((other) => other !== ball);
    const room = Math.min(clearance(cue, ghost, blockers), clearance(ball, object, blockers));
    const within = Math.abs(ghost.x) < HALF_WIDTH - RADIUS && Math.abs(ghost.z) < HALF_LENGTH - RADIUS;
    const clear = room >= 2 * RADIUS && cosine > Math.cos(65 * Math.PI / 180) && within;
    const risk = (1 - cosine) * 2.2 + travel * 0.42 + run * 0.8;
    const penalty = clear ? 0 : 7 + Math.max(0, 2 * RADIUS - room) * 20 + (within ? 0 : 3);
    return { ball, pocket, aim, cosine, travel, run, risk: risk + penalty };
  }));
  candidates.sort((a, b) => a.risk - b.risk);
  const best = candidates[0];
  if (!best) return null;
  // The same error at the cue becomes a larger miss on a longer or thinner cut.
  const tolerance = 0.046 * Math.max(0.35, best.cosine) / (best.run + 0.08) *
    (2 * RADIUS) / (best.travel + 2 * RADIUS);
  const error = (random() * 2 - 1) * Math.min(0.071, tolerance * 1.50);
  const aim = best.cosine <= 0 ? headingTo(cue, best.ball) : best.aim;
  const power = Math.min(0.92, 0.26 + best.travel * 0.18 + best.run * 0.24 / Math.max(0.45, best.cosine));
  return { call: { ball: best.ball.id, pocket: best.pocket }, angle: aim + error, power };
}
