import { TAXI } from "../game/world/layout";
import type { Action, Decision, TaxiRoute } from "../game/taxi/route";

export const TAXI_CONVERSATION = { situation: "s66-taxi", npc: "vinnie" };
export const TAXI_CAR = {
  ...TAXI, id: "taxi", model: "taxi", speedLimit: 3.15,
} as const;

type PointPair = [number, number];
type Leg = [Action, number, number, ...PointPair[]];

function route(n: number, destination: string, fare: number, tips: TaxiRoute["tips"], legs: Leg[]): TaxiRoute {
  const id = `r${n}`;
  const decisions = legs.map(([action, x, z, ...via], i): Decision => ({
    action, key: `tx_${id}_c${i + 1}`, at: { x, z }, via: via.map(([x, z]) => ({ x, z })),
  }));
  return { id, destination, fare, tips, start: TAXI, decisions };
}

// Points are in the travel lanes. The final point is aligned with the destination door at the curb.
export const TAXI_ROUTES = [
  route(1, "hotel", 2450, { great: 550, good: 350, ok: 150 }, [
    ["left", 0, -9, [108, -9]], ["right", 0, 76],
    ["right", -69.3, 76], ["straight", -69.3, 38],
    ["left", -69.3, -9.6], ["stop", -87, -11.6, [-80, -11.6]],
  ]),
  route(2, "sunny-cup", 2100, { great: 500, good: 300, ok: 100 }, [
    ["left", 68, -9, [108, -9]], ["straight", 68, 38],
    ["right", 68, 76], ["right", -69.3, 76],
    ["right", -69.3, -6], ["stop", -58, -4.6, [-63, -4.6]],
  ]),
  route(3, "bank", 2050, { great: 450, good: 350, ok: 150 }, [
    ["right", 70, -9, [108, -9]], ["left", 70, -57],
    ["left", -70, -57], ["left", -70, -6.5],
    ["straight", -26, -6.5], ["stop", 13, -4.6, [3, -4.6]],
  ]),
];

export const TAXI_UI = {
  start: "Vairuoti taksi",
  actions: {
    left: { label: "Sukite kairėn", key: "←" },
    right: { label: "Sukite dešinėn", key: "→" },
    straight: { label: "Važiuokite tiesiai", key: "↑" },
    stop: { label: "Sustokite čia", key: "Tarpas" },
  },
  title: "Kelionė baigta",
  fare: "Kaina", tip: "Arbatpinigiai", turns: "Posūkiai iš pirmo karto", stop: "Sustojote",
  atDoor: "prie durų", tooFar: "per toli",
  cards: "Frazių kortelės",
  again: "Dar kartą", done: "Baigti", exit: "Išlipti",
  turn: "Tavo eilė", answer: "Pasirink atsakymą", listen: "Pasakyk garsiai – klausau",
  micOn: "Įjungti mikrofoną", micOff: "Išjungti mikrofoną", retry: "Pabandyk dar kartą",
  hear: "Klausyk", show: "Rodyti tekstą",
};
