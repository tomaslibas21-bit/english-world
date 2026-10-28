// Townspeople inside the rooms, like the passers-by outside (ambient.ts): guests at Sunny Cup's tables and diners at
// Lucia's, customers in the queues and the aisles, office workers at their desks, a client in the salon chair, a
// runner on the gym's treadmill… No name tags and no conversations of their own: they sit or stand where they are and
// do the little things people do while waiting (characters/Character.ts). Two with the same `chat` talk in turns.
// Game.spawnNpcs places them; their looks come from the passers-by's (walkerLook), drawn per room.
import type { Look } from "../../content/npcs";

export interface RoomPerson {
  x: number; z: number;
  /** Which way they face (radians; 0 = +z, towards the room's front). */
  rot: number;
  /** Sitting: the seat's height. */
  sit?: number;
  carry?: Look["carry"];
  phone?: boolean;
  /** Hands busy with a keyboard (an office desk). */
  busy?: "type";
  /** Running on a treadmill: its belt's height. */
  run?: number;
  chat?: number;
}

const P = Math.PI;

export const ROOM_PEOPLE: Record<string, RoomPerson[]> = {
  // the round tables' chairs are half a metre high, north and south of each table
  "sunny-cup": [
    { x: 3, z: 1.45, rot: P, sit: 0.5, carry: "cup", chat: 1 }, { x: 3, z: -0.45, rot: 0, sit: 0.5, carry: "cup", chat: 1 },
    { x: 5.8, z: -0.85, rot: P, sit: 0.5, carry: "paper" },
    { x: -5.6, z: 2.45, rot: P, sit: 0.5, carry: "cup" },
    { x: 1.6, z: -2.0, rot: P, phone: true },
  ],
  trattoria: [
    { x: -4, z: -2.05, rot: P, sit: 0.5, carry: "cup", chat: 1 }, { x: -4, z: -3.95, rot: 0, sit: 0.5, carry: "cup", chat: 1 },
    { x: 4, z: 1.95, rot: P, sit: 0.5, carry: "cup", chat: 2 }, { x: 4, z: 0.05, rot: 0, sit: 0.5, carry: "cup", chat: 2 },
    { x: 0, z: -2.05, rot: P, sit: 0.5, carry: "cup" },
  ],
  bank: [{ x: 1.7, z: -1.9, rot: P, phone: true }, { x: -6, z: 3.3, rot: P, busy: "type" }],
  "post-office": [{ x: -1.8, z: -1.6, rot: P, carry: "bag" }, { x: -6.3, z: -1.5, rot: -P / 2 }],
  threads: [{ x: -4, z: 0.75, rot: P, carry: "bag" }, { x: 6.9, z: -3.2, rot: P / 2 }],
  pharmacy: [{ x: 6.3, z: 4.1, rot: -P / 2, sit: 0.48 }, { x: -4.5, z: 0.6, rot: P }],
  "gas-station": [{ x: -6, z: -3.55, rot: P, carry: "coffee" }, { x: 2, z: 1.4, rot: P, phone: true }],
  // a client in the chair Jessie works at, one under the dryer with a magazine, one waiting on the sofa
  salon: [
    { x: -3, z: -2.6, rot: P, sit: 0.8 },
    { x: -5.1, z: -0.6, rot: P / 2, sit: 0.63, carry: "paper" },
    { x: 4.3, z: 3.15, rot: P, sit: 0.58 },
  ],
  // three at their desks (the office chairs are 0.55 m high), one at the water cooler, one on the lounge sofa
  office: [
    { x: 1, z: -3.85, rot: P, sit: 0.55, busy: "type" }, { x: 4, z: -0.35, rot: P, sit: 0.55, busy: "type" },
    { x: 7, z: -0.35, rot: P, sit: 0.55, busy: "type" },
    { x: 5.95, z: 4.6, rot: P, carry: "coffee" },
    { x: -2.1, z: 5.62, rot: P, sit: 0.58, carry: "paper" },
  ],
  hotel: [{ x: -4.4, z: 4.75, rot: P, sit: 0.58, carry: "paper" }, { x: 2.8, z: -2.6, rot: P, carry: "bag" }],
  market: [{ x: 2, z: -3.2, rot: P, carry: "bag" }, { x: -4, z: -0.6, rot: P, carry: "bag" }, { x: -7.9, z: 0.2, rot: -P / 2 }],
  gym: [{ x: -5.5, z: -4.85, rot: P, run: 0.25 }],
  // a couple at a table and one diner (the middle table is the date's), away from the kitchen
  "the-pier": [
    { x: -5, z: 1.95, rot: P, sit: 0.5, carry: "cup", chat: 1 }, { x: -5, z: 0.05, rot: 0, sit: 0.5, carry: "cup", chat: 1 },
    { x: 5, z: -2.55, rot: P, sit: 0.5, carry: "cup" },
  ],
  // travellers on the benches (their backs to the north) and one reading the departures board
  station: [
    { x: -5.6, z: 1.05, rot: 0, sit: 0.55, carry: "paper" }, { x: -4.3, z: 1.05, rot: 0, sit: 0.55 },
    { x: 3.5, z: 4.05, rot: 0, sit: 0.55 }, { x: 4, z: -2, rot: P, carry: "bag" },
  ],
  // visitors in front of the paintings
  museum: [{ x: -4.8, z: -7.3, rot: P }, { x: -0.6, z: -7.3, rot: P + 0.2 }, { x: -11.3, z: -1, rot: -P / 2 }],
  // passengers queuing at check-in, one waiting at the baggage desk
  airport: [{ x: 6, z: -6.8, rot: P, carry: "bag" }, { x: 6.2, z: -5.6, rot: P, carry: "bag" }, { x: -4, z: -7, rot: P }],
};
