// Vite resolves these imports as it does for the running game, including the edition overlay.
import { POOL_CENTER, POOL_CIRCLE } from "../../src/game/world/pool";

export { ROAD_EDITION } from "../../src/content/road";
export { EDITION } from "../../src/edition";
export { caveWays, groundsBounds } from "../../src/game/cave/groundsPlan";
export { BONE } from "../../src/game/characters/builders";
export { CAR, controlsFrom, pointAndGo } from "../../src/game/rides/drive";
export { CONVERTIBLE_BUMPER } from "../../src/game/rides/shapes";
export { waterY, floorY, sandY, poolAt, poolBedY, SEA_LEVEL, SHORE, DECKS, FLOORS, POOLS } from "../../src/game/water";
export { WORLD, TRAFFIC_LANES } from "../../src/game/world/layout";
export { HOTEL_POOL, POOL_KIDS } from "../../src/game/world/pool";
export { THEME } from "../../src/game/world/theme";

export function predictPoolHeading(id, position, previous, ball, dt) {
  const from = POOL_CIRCLE[id];
  let target = "centre";
  let dx = POOL_CENTER.x - from.x, dz = POOL_CENTER.z - from.z;
  if (ball?.visible && Math.hypot(ball.x - position.x, ball.z - position.z) > 0.12) {
    target = "ball";
    dx = ball.x - position.x;
    dz = ball.z - position.z;
  }
  const facing = Math.atan2(dx, dz);
  const delta = facing - previous;
  const shortest = Math.atan2(Math.sin(delta), Math.cos(delta));
  return { target, previous, expected: previous + shortest * Math.min(1, 6 * dt) };
}
