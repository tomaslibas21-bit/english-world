export interface Point { x: number; z: number }
export interface Pose extends Point { rot: number }
export type Action = "left" | "right" | "straight" | "stop";

export interface Decision {
  key: string;
  action: Action;
  at: Point;
  via?: Point[];
}

export interface TaxiRoute {
  id: string;
  destination: string;
  fare: number;
  tips: Record<TipTier, number>;
  start: Pose;
  decisions: Decision[];
}

export type TipTier = "great" | "good" | "ok";

export function taxiScore(total: number, first: number, cleanStop: boolean, crashes: number) {
  const points = first + Number(cleanStop) + Number(crashes === 0);
  const max = total + 2;
  const tier: TipTier = points === max ? "great" : points >= Math.ceil(max * 0.7) ? "good" : "ok";
  return { points, max, tier, first, total, cleanStop, crashes };
}

export function approach(route: TaxiRoute, index: number): Point[] {
  const step = route.decisions[index];
  return [route.decisions[index - 1]?.at ?? route.start, ...step.via ?? [], step.at];
}

function axis(a: Point, b: Point) {
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  return { x: (b.x - a.x) / length, z: (b.z - a.z) / length, length };
}

function measure(p: Point, origin: Point, dir: Point) {
  const x = p.x - origin.x, z = p.z - origin.z;
  return { along: x * dir.x + z * dir.z, across: Math.abs(x * dir.z - z * dir.x) };
}

function insideStopBounds({ along, across }: ReturnType<typeof measure>) {
  return Math.abs(along) <= 4 && across <= 1.8;
}

export function inStopZone(route: TaxiRoute, p: Point) {
  const stop = route.decisions.at(-1);
  if (stop?.action !== "stop") return false;
  const from = stop.via?.at(-1) ?? route.decisions.at(-2)?.at ?? route.start;
  return insideStopBounds(measure(p, stop.at, axis(from, stop.at)));
}

export function approachDistance(path: Point[], p: Point) {
  let nearest = Infinity, remaining = Infinity, after = 0;
  for (let i = path.length - 1; i > 0; i--) {
    const a = path[i - 1], dir = axis(a, path[i]);
    const off = measure(p, a, dir);
    const at = Math.min(dir.length, Math.max(0, off.along));
    const distance = Math.hypot(off.across, off.along - at);
    if (distance < nearest) {
      nearest = distance;
      remaining = after + dir.length - at;
    }
    after += dir.length;
  }
  return { nearest, remaining };
}

export function resetPose(path: Point[]): Pose {
  const legs = path.slice(1).map((end, i) => ({ end, dir: axis(path[i], end) }));
  let back = Math.min(14, legs.reduce((length, { dir }) => length + dir.length, 0) * 0.75);
  let i = legs.length - 1;
  while (i > 0 && back > legs[i].dir.length) back -= legs[i--].dir.length;
  const { end, dir } = legs[i];
  return { x: end.x - dir.x * back, z: end.z - dir.z * back, rot: Math.atan2(dir.x, dir.z) };
}

type DrivePosition = Point & { heading: number; pace: number };
export type DecisionResult = "continue" | "followed" | "wrong" | "passed" | "stopped";

export function checkDecision(route: TaxiRoute, index: number, car: DrivePosition): DecisionResult {
  const step = route.decisions[index], path = approach(route, index);
  const incoming = axis(path[path.length - 2], step.at);
  const inLine = measure(car, step.at, incoming);
  if (step.action === "stop") {
    if (insideStopBounds(inLine) && car.pace < 0.5) return "stopped";
    if (inLine.along > 15) return "passed";
    return inLine.across > 12 && approachDistance(path, car).nearest > 14 ? "wrong" : "continue";
  }
  const next = route.decisions[index + 1];
  const outgoing = step.action === "straight" ? incoming : axis(step.at, next.via?.[0] ?? next.at);
  const outLine = measure(car, step.at, outgoing);
  const aligned = Math.sin(car.heading) * outgoing.x + Math.cos(car.heading) * outgoing.z > 0.5;
  const gate = step.action === "straight" ? 0 : 7;
  if (outLine.along >= gate && outLine.across <= 5 && aligned) return "followed";
  const distance = approachDistance(path, car).nearest;
  const onExit = outLine.along >= 0 && outLine.across <= 7;
  const farFromTurn = Math.hypot(car.x - step.at.x, car.z - step.at.z) >= 18;
  if (!onExit && distance > 8 && (farFromTurn || inLine.along > 15)) return "wrong";
  return "continue";
}
