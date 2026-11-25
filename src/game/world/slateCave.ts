import { CAVE_COPY, CAVE_GOALS, CAVE_ROOMS } from "../../content/cave-copy";
import type { Look } from "../../content/npcs";
import { NPCS } from "../../content/npcs";
import { LOCATIONS } from "../../content/locations";
import { ROOMS, type Chamber, type Gate } from "../cave/plan";
import type { CaveArt, CaveKeeper, CaveQuestConfig } from "../cave/config";
import { slateRune } from "./slateRunes";

const roomIds = ["tide", "root", "river", "star", "oak"] as const;
export const CHAMBERS: Chamber[] = ROOMS.map(({ sites, ...room }, chamber) => {
  const id = roomIds[chamber];
  return { ...room, id, n: chamber + 1, label: CAVE_ROOMS[id],
    stones: sites.map(([x, z, rot], i) => ({ id: id + "-" + (i + 1), x, z, rot })) };
});

const notice = CAVE_COPY.toast;
const BRAM_GATE = "bram", FERN_GATE = "fern";
export const GATES: Gate[] = [
  { id: BRAM_GATE, label: CAVE_COPY.door.bram, x: 0, z: -7.6, rot: 0, w: 6.4, keeper: BRAM_GATE, locked: notice.bramLocked },
  { id: "g2", label: CAVE_COPY.door.tide, x: -9, z: -46.5, rot: 0.43, w: 5.2, room: { index: 0, stones: CAVE_GOALS.firstRoom }, locked: notice.tideLocked, opened: notice.tideOpen, to: 1 },
  { id: "g3", label: CAVE_COPY.door.root, x: -11.5, z: -82, rot: -0.34, w: 5.2, stones: 4, locked: notice.rootLocked, opened: notice.rootOpen, to: 2 },
  { id: FERN_GATE, label: CAVE_COPY.door.fern, x: -6, z: -101.4, rot: 0, w: 3.0, bridge: true, keeper: FERN_GATE, locked: notice.fernLocked },
  { id: "g4", label: CAVE_COPY.door.star, x: 4.5, z: -119.5, rot: -0.6, w: 5.2, stones: CAVE_GOALS.oak, pass: FERN_GATE, locked: notice.oakLocked, to: 3 },
  { id: "g5", label: CAVE_COPY.door.oak, x: 10.5, z: -155, rot: 0.34, w: 5.4, stones: CAVE_GOALS.oak, pass: FERN_GATE, locked: notice.oakLocked, to: 4 },
];

export const KEEPERS: CaveKeeper[] = [
  { npc: "cave_bram", gate: BRAM_GATE, sitId: "x06-bram", requires: 0, passed: notice.bramPassed, guide: CAVE_COPY.guide.bram,
    x: 1.9, z: -4.3, rot: -0.5, ax: 0.3, az: -2.5 },
  { npc: "cave_fern", gate: FERN_GATE, sitId: "x07-fern", requires: 0b000111, passed: notice.fernPassed, guide: CAVE_COPY.guide.fern,
    x: -4.62, z: -100.3, rot: -Math.PI / 2, ax: -6.3, az: -99.5, sit: true, seat: 0.74 },
];

export const SLATE_CAVE = {
  chambers: CHAMBERS,
  gates: GATES,
  keepers: KEEPERS,
  treeSituation: "x08-old-oak",
  treeNpc: "cave_oak",
  keeperEvent: "cave-pass",
  treeEvent: "tree-heard",
  visitStat: "slate-cove-cave",
  stoneMasks: [0b000001, 0b000011, 0b001111, 0b011111, 0b111111],
  wakeAt: CAVE_GOALS.oak,
  label: LOCATIONS.gruta.name,
  actorLabel: (id: string) => NPCS[id]?.name,
  copy: {
    guide: { tree: CAVE_COPY.guide.oak, stone: CAVE_COPY.guide.stone },
    toast: { ...notice, treeAwoke: notice.oakAwoke },
    card: { replayCount: CAVE_COPY.card.replayCount, round: CAVE_COPY.card.round, wakeCount: CAVE_COPY.card.oakCount },
  },
  keeperLooks: {
    cave_bram: { top: "#4b4137", acc: ["flatCap", "vest"], accColor: "#586b4e" },
    cave_fern: { accColor: "#a75e42" },
  } as Record<string, Partial<Look> | undefined>,
  runes: slateRune,
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
} satisfies CaveQuestConfig & CaveArt & { visitStat: string; keeperLooks: Record<string, Partial<Look> | undefined>;
  hemi: [string, string, number]; sun: [string, number]; camera: { pitch: number; dist: number } };
