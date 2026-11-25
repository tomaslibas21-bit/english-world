import type { Chamber, Gate } from "./plan";

type Label = Readonly<{ en: string; lt: string }>;
export type CaveNotice = { title: Label; body?: Label };

export interface CaveKeeper {
  npc: string;
  gate: string;
  sitId: string;
  requires: number;
  passed: CaveNotice;
  guide: Label;
  x: number; z: number; rot: number;
  ax: number; az: number;
  sit?: boolean;
  seat?: number;
}

export interface CaveQuestConfig {
  chambers: readonly Chamber[];
  gates: readonly Gate[];
  keepers: readonly CaveKeeper[];
  stoneMasks: readonly number[];
  wakeAt: number;
  treeSituation: string;
  treeNpc: string;
  keeperEvent: string;
  treeEvent: string;
  label: string;
  actorLabel(id: string): string | undefined;
  copy: {
    guide: { tree: Label; stone: Label };
    toast: {
      first: CaveNotice; returning: CaveNotice; replayStart: CaveNotice; replayDone: CaveNotice;
      replayLit: CaveNotice; treeAwoke: CaveNotice;
      stoneLit: { title: Label; body(left: number): Label };
    };
    card: { replayCount(heard: number): Label; round(round: number): Label; wakeCount(lit: number): Label };
  };
}

export interface CaveArt {
  runes(cell: number): readonly (readonly [number, number, number, number])[];
  fog: string;
  density: number;
  rock: readonly string[];
  moss: readonly string[];
  wood: readonly string[];
  bark: string;
  roots: string;
  leaves: readonly string[];
  awakeLeaves: readonly string[];
  path: readonly string[];
  pool: string;
  rune: readonly string[];
  /** Optional town colours for the glowing things (the donor's tropical pinks and violets when left out). */
  glows?: readonly string[];
  crystals?: readonly string[];
  flowers?: readonly string[];
  /** The keeper's little hut by the first gate: roof, wall. */
  hut?: readonly [string, string];
  /** The fins at the foot of the two great trees (m out, m up): the donor's tall ceiba buttresses when left out. */
  buttress?: { out: number; up: number; colour: string };
}
