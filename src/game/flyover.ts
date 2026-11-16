// The first visit's look at the town from the air (Game.beginFlight): a few seconds' glide along a handful of points
// (theme.ts `flyover`: where the camera is and what it looks at), down to the airport where the learner has landed.
// Pure: the path only. Any key or a tap ends it at once (Game.endFlight).
import * as THREE from "three";

/** A point of the flight: the camera's place and what it looks at (x, y, z each). */
export interface FlyKey { pos: [number, number, number]; look: [number, number, number] }
/** How long the flight takes (s). */
export const FLIGHT_SECONDS = 6.5;

const P = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
/** A smooth curve through the keys' points (Catmull-Rom; the ends held), at `u` of the way along (0–1). */
function along(keys: FlyKey[], which: "pos" | "look", u: number, out: THREE.Vector3) {
  const n = keys.length - 1, x = Math.min(n, Math.max(0, u * n)), i = Math.min(n - 1, Math.floor(x)), t = x - i;
  for (let k = 0; k < 4; k++) P[k].fromArray(keys[Math.min(n, Math.max(0, i - 1 + k))][which]);
  const t2 = t * t, t3 = t2 * t;
  return out.set(0, 0, 0)
    .addScaledVector(P[0], -0.5 * t3 + t2 - 0.5 * t)
    .addScaledVector(P[1], 1.5 * t3 - 2.5 * t2 + 1)
    .addScaledVector(P[2], -1.5 * t3 + 2 * t2 + 0.5 * t)
    .addScaledVector(P[3], 0.5 * t3 - 0.5 * t2);
}

/** Where the camera is and what it looks at, `k` of the way through the flight (0–1): it sets off and arrives gently. */
export function flightAt(keys: FlyKey[], k: number, pos = new THREE.Vector3(), look = new THREE.Vector3()) {
  const c = Math.min(1, Math.max(0, k)), u = c * c * (3 - 2 * c) * 0.6 + c * 0.4;
  return { pos: along(keys, "pos", u, pos), look: along(keys, "look", u, look) };
}
