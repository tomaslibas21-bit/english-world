import { create } from "zustand";
import type { KitLine } from "../kit/dialogue";
import type { Progress } from "../../state/progress";

export interface PoolSave {
  best: number;
  rounds: number;
  rulesHeard: boolean;
}

export function poolSave({ pool }: Progress): PoolSave {
  return { best: pool?.best ?? 0, rounds: pool?.rounds ?? 0, rulesHeard: pool?.rulesHeard ?? false };
}

interface PoolUi {
  cue: KitLine | null;
  aside: KitLine | null;
  help: "long" | "short" | "timing" | "wrong" | null;
  streak: number;
  result: { best: number; learnerHits: number; cards: number } | null;
}

const empty: PoolUi = { cue: null, aside: null, help: null, streak: 0, result: null };
export const usePool = create<PoolUi>(() => empty);
export const resetPoolUi = () => usePool.setState(empty);
