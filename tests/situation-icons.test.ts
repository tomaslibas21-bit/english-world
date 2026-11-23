import { describe, expect, it } from "vitest";
import { SITUATION_ICONS } from "../src/content/situationIcons";
import { SITUATIONS } from "../src/content/situations/catalog";
import { SITUATION_ICON_NODES } from "../src/ui/situationIconNodes.gen";

describe("situation icons", () => {
  it("assigns an icon to every situation in this town", () => {
    for (const { id } of SITUATIONS) expect(SITUATION_ICONS[id], id).toBeTruthy();
  });

  it("has a drawing for every assigned icon", () => {
    for (const name of new Set(Object.values(SITUATION_ICONS))) {
      expect(SITUATION_ICON_NODES[name]?.length, name).toBeGreaterThan(0);
    }
  });

  it("gives each situation in this town a different icon", () => {
    const names = SITUATIONS.map(({ id }) => SITUATION_ICONS[id]);
    expect(new Set(names).size).toBe(names.length);
  });
});
