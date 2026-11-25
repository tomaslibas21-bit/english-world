import { Vector3 } from "three";
import { floorY, SEA_LEVEL, waterY } from "../water";
import type { CenoteRoute } from "../world/cenoteTour";

const PI2 = 2 * Math.PI;
export const CUT_TO_BAY = 18.1;
export const CUT_TO_HUT = 72;
export const CUT_SWAP = 0.3;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function swimAt(route: CenoteRoute, elapsed: number, worldTime: number, eye: Vector3) {
  let x: number, z: number, relativeY = -0.68;
  if (elapsed < 22) {
    const walk = ease((elapsed - 18.9) / 3.1);
    x = lerp(route.shore[0], route.swimStart[0], walk);
    z = lerp(route.shore[1], route.swimStart[1], walk);
    relativeY = lerp(1.78, -0.68, ease((elapsed - 20.4) / 1.6));
  } else if (elapsed < 42) {
    const swim = ease((elapsed - 22) / 10);
    x = lerp(route.swimStart[0], route.fishStop[0], swim);
    z = lerp(route.swimStart[1], route.fishStop[1], swim);
  } else if (elapsed < 62) {
    const swim = ease((elapsed - 42) / 10);
    x = curve(route.fishStop[0], route.fishBend[0], route.turtleStop[0], swim);
    z = curve(route.fishStop[1], route.fishBend[1], route.turtleStop[1], swim);
  } else {
    const swim = ease((elapsed - 62) / 10);
    x = curve(route.turtleStop[0], route.returnBend[0], route.returnEnd[0], swim);
    z = curve(route.turtleStop[1], route.returnBend[1], route.returnEnd[1], swim);
    relativeY = lerp(-0.68, 1.45, ease((elapsed - 68) / 3.5));
  }
  const surface = waterY(x, z, worldTime) ?? SEA_LEVEL;
  eye.set(x, Math.max(surface + relativeY, floorY(x, z) + 0.45), z);
  return surface;
}

// Quadratic through the approach and return waypoints, with the center control point solved at t=0.5.
function curve(a: number, through: number, b: number, t: number) {
  const control = 2 * through - (a + b) * 0.5;
  return (1 - t) * ((1 - t) * a + 2 * t * control) + t * t * b;
}

export function fishSchoolAt(route: CenoteRoute, time: number, out: Vector3) {
  const { center, radii: [rx, rz], period } = route.fish;
  const a = time * PI2 / period, c = Math.cos(a), s = Math.sin(a);
  out.set(center[0] + rx * c, 0, center[1] + rz * s);
  return Math.atan2(-rx * s, rz * c);
}

export function turtleAt(route: CenoteRoute, time: number, worldTime: number, i: number, out: Vector3) {
  const { center, paths } = route.turtles;
  const { radii: [rx, rz], offset, period, depth } = paths[i];
  const a = time * PI2 / period + 0.43 + i * 0.57;
  const x = center[0] + offset[0] + rx * Math.cos(a);
  const z = center[1] + offset[1] + rz * Math.sin(a);
  out.set(x, waterY(x, z, worldTime)! - depth, z);
  return Math.atan2(-rx * Math.sin(a), rz * Math.cos(a));
}

export function aimSwim(route: CenoteRoute, elapsed: number, time: number, worldTime: number, eye: Vector3, look: Vector3, target: Vector3) {
  fishSchoolAt(route, time, target);
  const fishX = elapsed <= 42 ? eye.x : route.fishStop[0];
  const fishZ = elapsed <= 42 ? eye.z : route.fishStop[1];
  const fish = Math.atan2(target.x - fishX, target.z - fishZ);
  turtleAt(route, time, worldTime, 0, target);
  const first = Math.atan2(target.x - eye.x, target.z - eye.z);
  const firstHalf = Math.asin(Math.min(1, route.turtles.paths[0].length * 0.68 / Math.hypot(target.x - eye.x, target.z - eye.z)));
  turtleAt(route, time, worldTime, 1, target);
  const second = angle(Math.atan2(target.x - eye.x, target.z - eye.z) - first);
  const secondHalf = Math.asin(Math.min(1, route.turtles.paths[1].length * 0.68 / Math.hypot(target.x - eye.x, target.z - eye.z)));
  const turtle = first + (Math.min(-firstHalf, second - secondHalf) + Math.max(firstHalf, second + secondHalf)) * 0.5;
  const approach = elapsed < 42 ? elapsed : 42;
  const ahead = blendHeading(1.78, fish, ease((approach - 19.1) / 3.0));
  const next = blendHeading(ahead, turtle, ease((elapsed - 42) / 10));
  const shore = Math.atan2(route.shore[0] - eye.x, route.shore[1] - eye.z);
  const heading = blendHeading(next, shore, ease((elapsed - 62) / 7));
  const diveAngle = lerp(-0.32, -0.52, ease((elapsed - 43) / 9));
  const up = elapsed < 22 ? lerp(-0.57, diveAngle, ease((elapsed - 19) / 3))
    : lerp(diveAngle, 0.58, ease((elapsed - 66) / 5.5));
  look.set(eye.x + Math.sin(heading) * 4.2, eye.y + up, eye.z + Math.cos(heading) * 4.2);
  return heading;
}

function angle(radians: number) { return Math.atan2(Math.sin(radians), Math.cos(radians)); }
function blendHeading(a: number, b: number, t: number) { return a + angle(b - a) * t; }
