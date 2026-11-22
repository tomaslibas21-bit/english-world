import { expect, it } from "vitest";
import { SITUATION_BY_ID } from "@/content/situations/catalog";
import { POOL_LINES } from "@/content/pool-lines";
import { createPoolMode } from "@/game/pool/mode";
import type { ModeHost } from "@/game/kit/host";
import { OUTDOOR_NPCS } from "@/game/world/layout";
import { THEME } from "@/game/world/theme";
import { POOL_KIDS, POOL_SITUATION } from "@/game/world/pool";

it("keeps the pool out of Maple Harbor", () => {
  expect(THEME.hotelPool).toBe(false);
  expect(OUTDOOR_NPCS.some(({ npc }) => POOL_KIDS.some((kid) => kid === npc))).toBe(false);
  expect(SITUATION_BY_ID[POOL_SITUATION]).toBeUndefined();
  expect(POOL_LINES).toEqual({});
  expect(createPoolMode({} as ModeHost)).toBeNull();
});
