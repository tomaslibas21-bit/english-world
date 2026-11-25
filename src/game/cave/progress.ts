import type { CaveQuestConfig } from "./config";
import type { Gate } from "./plan";

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

export const emptyCave = (): CaveSave => ({ lit: [], passed: [], heart: false });

export class CaveRules {
  readonly sites;
  readonly stones;
  readonly keeperByGate;
  readonly keeperByNpc;
  readonly fullMask;

  constructor(readonly config: CaveQuestConfig) {
    this.sites = config.chambers.flatMap((room, chamber) => room.stones.map((stone) => ({ stone, chamber })));
    this.stones = new Map(this.sites.map((site) => [site.stone.id, site]));
    this.keeperByGate = new Map(config.keepers.map((keeper) => [keeper.gate, keeper]));
    this.keeperByNpc = new Map(config.keepers.map((keeper) => [keeper.npc, keeper]));
    this.fullMask = (1 << config.gates.length) - 1;
  }

  normalize(save?: CaveSave): CaveSave {
    if (!save || typeof save !== "object") return emptyCave();
    const lit = Array.isArray(save.lit) ? [...new Set(save.lit.filter((id) => this.stones.has(id)))] : [];
    const passed = Array.isArray(save.passed) ? [...new Set(save.passed.filter((id) => this.keeperByGate.has(id)))] : [];
    const heard = Array.isArray(save.heard) ? [...new Set(save.heard.filter((id) => typeof id === "string"))] : undefined;
    const rounds = Number.isSafeInteger(save.rounds) && save.rounds! >= 0 ? save.rounds : 0;
    return { ...save, lit, passed, ...(save.heard !== undefined && { heard }), ...(save.rounds !== undefined && { rounds }),
      heart: lit.length >= this.config.wakeAt };
  }

  stonesLit(save: CaveSave, room: number) {
    let lit = 0;
    const stones = this.config.chambers[room].stones;
    for (let i = 0; i < stones.length; i++) if (save.lit.includes(stones[i].id)) lit++;
    return lit;
  }

  gateOpen(gate: Gate, save: CaveSave) {
    return (!gate.keeper || save.passed.includes(gate.keeper)) &&
      (!gate.pass || save.passed.includes(gate.pass)) &&
      (!gate.room || this.stonesLit(save, gate.room.index) >= gate.room.stones) &&
      (!gate.stones || save.lit.length >= gate.stones);
  }

  gateMask(save: CaveSave) {
    let mask = 0;
    const { gates } = this.config;
    for (let i = 0; i < gates.length; i++) if (this.gateOpen(gates[i], save)) mask |= 1 << i;
    return mask;
  }
}
