import type { CaveStoryEvent } from "../../content/cave-dialogue";
import { CHAMBERS, GATES, KEEPERS, SLATE_CAVE } from "../world/slateCave";
import type { Gate } from "./plan";
import type { CaveView } from "./Cave";

export interface CaveSave {
  lit: string[];
  passed: string[];
  seen?: boolean;
  heart?: boolean;
  tree?: boolean;
  heard?: string[];
  rounds?: number;
  told?: number;
}

const stoneIds = new Set(CHAMBERS.flatMap((room) => room.stones.map((stone) => stone.id)));
const keeperIds = new Set(KEEPERS.map((keeper) => keeper.gate));
export const emptyCave = (): CaveSave => ({ lit: [], passed: [] });

export function normalizeCave(save?: CaveSave): CaveSave {
  if (!save || typeof save !== "object") return emptyCave();
  const lit = Array.isArray(save.lit) ? [...new Set(save.lit.filter((id) => stoneIds.has(id)))] : [];
  const passed = Array.isArray(save.passed) ? [...new Set(save.passed.filter((id) => keeperIds.has(id)))] : [];
  return { ...save, lit, passed, heart: lit.length >= SLATE_CAVE.goals.oak };
}

export function stonesLit(save: CaveSave, room: number) {
  let n = 0;
  for (const stone of CHAMBERS[room].stones) if (save.lit.includes(stone.id)) n++;
  return n;
}

export function gateOpen(gate: Gate, save: CaveSave, all = false) {
  return all || (
    (!gate.keeper || save.passed.includes(gate.keeper)) &&
    (!gate.pass || save.passed.includes(gate.pass)) &&
    (!gate.tide || stonesLit(save, 0) >= gate.tide) &&
    (!gate.stones || save.lit.length >= gate.stones)
  );
}

const OPEN = { open: true } as const;
const KEEPER = { open: false, why: "keeper" } as const;
const STONES = { open: false, why: "stones" } as const;
export function gateState(gate: Gate, save: CaveSave, all = false) {
  return gateOpen(gate, save, all) ? OPEN : gate.keeper || (gate.pass && !save.passed.includes(gate.pass)) ? KEEPER : STONES;
}

export function gateMask(save: CaveSave, all = false) {
  let mask = 0;
  for (let i = 0; i < GATES.length; i++) if (gateOpen(GATES[i], save, all)) mask |= 1 << i;
  return mask;
}

/** Owns the saved physical progress, visual changes and routing revision for this visit. */
export class CaveQuest {
  save: CaveSave;
  mask = 0;

  constructor(private view: CaveView, initial: CaveSave | undefined, private persist: (save: CaveSave) => void,
    private syncGates: (mask: number) => void) {
    this.save = normalizeCave(initial);
    this.sync(true);
  }

  private sync(initial = false) {
    const next = gateMask(this.save);
    for (let i = 0; i < GATES.length; i++) {
      const bit = 1 << i;
      if (initial || ((this.mask ^ next) & bit)) this.view.setGate(GATES[i].id, !!(next & bit), initial);
    }
    if (initial || next !== this.mask) this.syncGates(next);
    this.mask = next;
    this.view.setHeart(!!this.save.heart, initial);
  }

  /** Called only after the reader has accepted a first solve. */
  light(id: string) {
    if (!stoneIds.has(id) || this.save.lit.includes(id)) return false;
    this.replace({ ...this.save, lit: [...this.save.lit, id] });
    return true;
  }

  pass(gate: string) {
    if (!keeperIds.has(gate) || this.save.passed.includes(gate)) return false;
    this.replace({ ...this.save, passed: [...this.save.passed, gate] });
    return true;
  }

  treeHeard() {
    if (!this.save.heart || !this.save.passed.includes("fern") || this.save.tree) return false;
    this.replace({ ...this.save, tree: true });
    return true;
  }

  story(event: CaveStoryEvent) {
    return event.name === "cave-pass" ? this.pass(event.data.gate) : this.treeHeard();
  }

  replace(save: CaveSave) {
    const previous = this.save;
    this.save = normalizeCave(save);
    for (const id of previous.lit) if (!this.save.lit.includes(id)) this.view.setStone(id, false);
    for (const id of this.save.lit) if (!previous.lit.includes(id)) this.view.setStone(id, true);
    this.sync();
    this.persist(this.save);
  }
}
