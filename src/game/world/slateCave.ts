import { CAVE_COPY, CAVE_GOALS, CAVE_ROOMS } from "../../content/cave-copy";
import type { Look } from "../../content/npcs";
import type { Chamber, Gate, Stone } from "../cave/plan";

const S = (id: string, x: number, z: number, rot: number): Stone => ({ id, x, z, rot });

export const CHAMBERS: Chamber[] = [
  { id: "tide", n: 1, label: CAVE_ROOMS.tide, x: 0, z: -25, rx: 17, rz: 17.5, ceil: 15,
    stones: [S("tide-1", -8.2, -24.5, Math.PI / 2), S("tide-2", 7.2, -31.6, -0.5), S("tide-3", 1.6, -39.4, 0.25)] },
  { id: "root", n: 2, label: CAVE_ROOMS.root, x: -15, z: -64, rx: 13.5, rz: 13, ceil: 11,
    stones: [S("root-1", -24.2, -60.5, 1.2), S("root-2", -8.4, -70.6, -0.9), S("root-3", -19.5, -73.2, 0.6)] },
  { id: "river", n: 3, label: CAVE_ROOMS.river, x: -6, z: -101, rx: 15, rz: 14, ceil: 12,
    stones: [S("river-1", -15.6, -106.4, 1.1), S("river-2", 3.6, -108.2, -0.8), S("river-3", -6.8, -112.2, 0)] },
  { id: "star", n: 4, label: CAVE_ROOMS.star, x: 14, z: -137, rx: 13.5, rz: 12.5, ceil: 13,
    stones: [S("star-1", 5.4, -131.6, 1.0), S("star-2", 22.6, -135.4, -1.3), S("star-3", 13.2, -146.4, 0.1)] },
  { id: "oak", n: 5, label: CAVE_ROOMS.oak, x: 6, z: -177, rx: 17, rz: 16, ceil: 17,
    stones: [S("oak-1", -6.6, -172.4, 1.25), S("oak-2", 18.4, -173.6, -1.2), S("oak-3", 6.2, -191.2, 0)] },
];
const RIVER_ENTRY_STONES = 4;
export const GATES: Gate[] = [
  { id: "bram", label: CAVE_COPY.door.bram, x: 0, z: -7.6, rot: 0, w: 6.4, keeper: "bram" },
  { id: "g2", label: CAVE_COPY.door.tide, x: -9, z: -46.5, rot: 0.43, w: 5.2, tide: CAVE_GOALS.firstRoom, to: 1 },
  { id: "g3", label: CAVE_COPY.door.root, x: -11.5, z: -82, rot: -0.34, w: 5.2, stones: RIVER_ENTRY_STONES, to: 2 },
  { id: "fern", label: CAVE_COPY.door.fern, x: -6, z: -101.4, rot: 0, w: 3.0, bridge: true, keeper: "fern" },
  { id: "g4", label: CAVE_COPY.door.star, x: 4.5, z: -119.5, rot: -0.6, w: 5.2, stones: CAVE_GOALS.oak, pass: "fern", to: 3 },
  { id: "g5", label: CAVE_COPY.door.oak, x: 10.5, z: -155, rot: 0.34, w: 5.4, stones: CAVE_GOALS.oak, pass: "fern", to: 4 },
];

export const KEEPERS: { npc: string; gate: string; x: number; z: number; rot: number; ax: number; az: number; sit?: boolean; seat?: number }[] = [
  { npc: "cave_bram", gate: "bram", x: 1.9, z: -4.3, rot: -0.5, ax: 0.3, az: -2.5 },
  { npc: "cave_fern", gate: "fern", x: -4.62, z: -100.3, rot: -Math.PI / 2, ax: -6.3, az: -99.5, sit: true, seat: 0.74 },
];


export const SLATE_CAVE = {
  treeSituation: "x08-old-oak",
  treeNpc: "cave_oak",
  keeperLooks: {
    cave_bram: { top: "#4b4137", acc: ["flatCap", "vest"], accColor: "#586b4e" },
    cave_fern: { accColor: "#a75e42" },
  } satisfies Record<string, Partial<Look>>,
  goals: { ...CAVE_GOALS, riverEntry: RIVER_ENTRY_STONES },
  action: CAVE_COPY.action,
  fog: "#243944",
  density: 0.0185,
  hemi: ["#c8dedb", "#45564d", 1.55] as [string, string, number],
  sun: ["#f1deb8", 1.25] as [string, number],
  camera: { pitch: 0.3, dist: 9.5 },
  rock: ["#43525c", "#626d72", "#56636c", "#384952"],
  moss: ["#72845c", "#647554", "#80916a"],
  wood: ["#554839", "#493c31", "#70604d"],
  bark: "#665342",
  roots: "#594b3d",
  leaves: ["#677944", "#799053", "#576e46", "#a4774d"],
  awakeLeaves: ["#edcd83", "#e0c58b", "#e6d6a3", "#d1b777"],
  path: ["#a7aaa0", "#959b92"],
  pool: "#406f77",
  rune: ["#93bcb3", "#edcd83"],
};
