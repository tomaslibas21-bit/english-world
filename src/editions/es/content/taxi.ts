import { TAXI as stand } from "@/game/world/layout";
import type { Action, Decision, TaxiRoute } from "@/game/taxi/route";

export { TAXI_CAR, TAXI_CONVERSATION } from "../../../content/taxi";

type PointPair = [number, number];
type Leg = [Action, number, number, ...PointPair[]];

function route(n: number, destination: string, fare: number, legs: Leg[], ordinal: number): TaxiRoute {
  const id = `r${n}`;
  const decisions = legs.map(([action, x, z, ...via], i): Decision => ({
    action, lead: i === ordinal - 1 ? 105 : undefined, key: `tx_${id}_c${i + 1}`, at: { x, z }, via: via.map(([x, z]) => ({ x, z })),
  }));
  // Pull out from the stand into the westbound lane before handing over the wheel.
  return { id, destination, fare, start: { ...stand, z: -9.5 }, tips: { great: 2000, good: 1000, ok: 500 }, decisions };
}

// The intersections and curb stops in ROUTES-ES.md.
export const TAXI_ROUTES = [
  route(1, "hotel", 12000, [
    ["left", 0, -9.5], ["right", 0, 76], ["right", -70.5, 76],
    ["straight", -70.5, 38], ["left", -70.5, -9.25], ["stop", -87, -9.25],
  ], 1),
  route(2, "market", 10000, [
    ["left", 68.5, -9.5], ["right", 68.5, 37.2], ["right", -70.5, 37.2],
    ["straight", -70.5, -8], ["right", -70.5, -52.7], ["stop", -52, -52.1, [-62, -52.7]],
  ], 3),
  route(3, "bank", 10000, [
    ["right", 70.2, -9.5], ["left", 70.2, -57], ["left", -70.5, -57], ["left", -70.5, -6.5],
    ["straight", -26, -6.5], ["stop", 13, -4.7, [3, -6.5], [7, -4.7]],
  ], 3),
];
