import { create } from "zustand";
import type { KitLine } from "../kit/dialogue";
import type { Progress } from "../../state/progress";
import type { PhraseReviewEntry } from "../../ui/kit/phraseLine";

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
  help: "long" | "first-pass" | "short" | null;
  notice: "timing" | "wrong" | null;
  canHit: boolean;
  streak: number;
  result: { best: number; learnerHits: number; drops: number; cards: number; review?: readonly PhraseReviewEntry[] } | null;
}

const empty: PoolUi = { cue: null, aside: null, help: null, notice: null, canHit: false, streak: 0, result: null };
export const usePool = create<PoolUi>(() => empty);
export const resetPoolUi = () => usePool.setState(empty);
