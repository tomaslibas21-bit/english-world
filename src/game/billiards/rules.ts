import { rand } from "../world/util";
import type { Call } from "./calls";
import { ballAt, distance, FOOT, HEAD, HALF_LENGTH, RADIUS, type Ball } from "./physics";

export type Group = "solids" | "stripes";
export type Side = "learner" | "tina";
export type Winner = Side | "tie";
export const otherGroup = (group: Group): Group => group === "solids" ? "stripes" : "solids";
export const ownerGroup = (id: number): Group | null => id > 0 && id < 8 ? "solids" : id > 8 ? "stripes" : null;
export const SHOT_LIMIT = 14;
export const isGroup = (group: unknown): group is Group => group === "solids" || group === "stripes";

function shuffle<T>(items: T[], random: () => number) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function rack(seed: number) {
  const random = rand(seed);
  const solids = shuffle([1, 2, 3, 4, 5, 6, 7], random).slice(0, 4);
  const stripes = shuffle([9, 10, 11, 12, 13, 14, 15], random).slice(0, 4);
  const numbers = shuffle([...solids, ...stripes], random);
  numbers.splice(4, 0, 8);
  const gap = 2 * RADIUS + 0.0008;
  const balls = [ballAt(0, 0, HEAD)];
  [1, 2, 3, 2, 1].forEach((count, row) => {
    for (let col = 0; col < count; col++) {
      balls.push(ballAt(numbers[balls.length - 1], (col - (count - 1) / 2) * gap, FOOT - row * gap * Math.sqrt(3) / 2));
    }
  });
  return balls;
}

export function remaining(balls: Ball[], group: Group) {
  return balls.filter((ball) => !ball.pocket && ownerGroup(ball.id) === group);
}

export function callable(balls: Ball[], group: Group) {
  const own = remaining(balls, group);
  return own.length ? own : balls.filter((ball) => ball.id === 8 && !ball.pocket);
}

export function respot(ball: Ball, balls: Ball[], z: number) {
  const direction = Math.sign(z);
  const start = z;
  const free = (at: number) => Math.abs(at) < HALF_LENGTH - 2 * RADIUS &&
    balls.every((other) => other === ball || other.pocket || distance({ x: 0, z: at }, other) >= 2 * RADIUS + 0.001);
  for (let step = 0; step < 200; step++) {
    const ahead = start + direction * step * 0.01, behind = start - direction * step * 0.01;
    const target = free(ahead) ? ahead : free(behind) ? behind : null;
    if (target === null) continue;
    Object.assign(ball, ballAt(ball.id, 0, target));
    return;
  }
}

export function judgeShot(balls: Ball[], shot: {
  side: Side; group: Group; call: Call | null; sunk: ReadonlySet<number>; number: number; eightAllowed: boolean;
}) {
  const { side, group, call, sunk, number, eightAllowed } = shot;
  const scratch = sunk.has(0);
  const called = call && balls.find((ball) => ball.id === call.ball && sunk.has(ball.id));
  const ownSunk = [...sunk].some((id) => ownerGroup(id) === group);
  const scored = !!called && !scratch && called.pocket === call?.pocket && (called.id !== 8 || eightAllowed);
  const eightBack = sunk.has(8) && !(call?.ball === 8 && scored);
  const time = side === "learner" && number >= SHOT_LIMIT && !(scored && call?.ball === 8);
  let winner: Winner | null = scored && call?.ball === 8 ? side : null;
  if (time) {
    const difference = remaining(balls, group).length - remaining(balls, otherGroup(group)).length;
    winner = difference === 0 ? "tie" : difference < 0 ? "learner" : "tina";
  }
  const keep = !scratch && (call ? scored : ownSunk);
  return {
    scratch, scored, eightBack, time, winner,
    next: keep ? side : side === "learner" ? "tina" as const : "learner" as const,
    wrongPocket: !!called && !scratch && called.pocket !== call?.pocket,
    wrongBall: !!call && !called && !scratch && ownSunk,
  };
}
