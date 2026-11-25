import { expect, it } from "vitest";
import { PAD_LINES } from "@/content/gamepad";
import { EDITION } from "@/edition";

const expected = [
  ["connected", "Control | conectado", "Controller | connected", "Controller connected"],
  ["disconnected", "Control | desconectado", "Controller | disconnected", "Controller disconnected"],
  ["move", "Moverse", "Move", "Move"],
  ["look", "Mirar alrededor", "Look around", "Look around"],
  ["jump", "Saltar", "Jump", "Jump"],
  ["interact", "Usar", "Use", "Use"],
  ["choose", "Elegir", "Choose", "Choose"],
  ["back", "Volver", "Go back", "Go back"],
] as const;

it("exposes the eight controller IDs through the Puerto Colibrí English overlay", () => {
  expect(EDITION.id).toBe("es");
  expect(EDITION.helper).toBe("en");
  expect(Object.keys(PAD_LINES).sort()).toEqual(expected.map(([id]) => id).sort());
});

it.each(expected)("%s has exact Spanish units, aligned English gloss and natural label", (id, es, gloss, nat) => {
  const line = PAD_LINES[id];
  expect(line).toEqual({ en: es, lt: gloss, nat });
  expect(line.lt.split(" | ")).toHaveLength(line.en.split(" | ").length);
});
