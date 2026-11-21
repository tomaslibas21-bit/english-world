import { describe, expect, it } from "vitest";
import { KEEPSAKES, keepsakeFor } from "../../src/content/keepsakes";
import { SITUATIONS } from "../../src/content/situations/catalog";
import { L } from "../../src/ui/i18n";

describe("Puerto Colibrí conversation keepsakes", () => {
  it("covers every situation, including chats outside the route", () => {
    expect(Object.keys(KEEPSAKES).sort()).toEqual(SITUATIONS.map((sit) => sit.id).sort());
    expect(keepsakeFor("s32-mercado")).toBe("shopping_bag");
    expect(keepsakeFor("s67b-bus")).toBe("note");
    expect(keepsakeFor("x01-surf")).toBe("seashell");
    expect(keepsakeFor("x02-alux-kin")).toBe("pebble");
    expect(keepsakeFor("x03-alux-nikte")).toBe("pebble");
    expect(keepsakeFor("x04-yaxche")).toBe("leaf");
    expect(keepsakeFor("x05-tienda")).toBe("shopping_bag");
    for (const id of ["x06-custodio", "x07-pintora", "x08-rosario"]) expect(keepsakeFor(id)).toBe("pebble");
  });

  it("composes the English keepsake reward from the translated item", () => {
    expect(L("Gavai {item}", { item: L("kavos puodelį") })).toBe("You got a cup of coffee");
  });
});
