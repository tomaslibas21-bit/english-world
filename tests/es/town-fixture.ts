import { vi } from "vitest";
import { DECKS, FLOORS, POOLS } from "@/game/water";
import { buildTown } from "@/game/world/town";

export function buildTownFixture(options?: Parameters<typeof buildTown>[0]) {
  const pools = POOLS.slice(), floors = FLOORS.slice(), decks = DECKS.slice();
  const noop = () => {};
  const context = new Proxy({
    measureText: (s: string) => ({ width: s.length * 10 }),
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
  }, { get: (target, key) => Reflect.get(target, key) ?? noop });
  vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => context }) });
  const restore = () => {
    POOLS.splice(0, POOLS.length, ...pools);
    FLOORS.splice(0, FLOORS.length, ...floors);
    DECKS.splice(0, DECKS.length, ...decks);
    vi.unstubAllGlobals();
  };
  try {
    return { town: buildTown(options), restore };
  } catch (error) {
    restore();
    throw error;
  }
}
