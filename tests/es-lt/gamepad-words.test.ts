import { expect, it } from "vitest";
import { PAD_LINES } from "@/content/gamepad";
import { EDITION } from "@/edition";
import { PAD_LINES as ES_PAD_LINES } from "../../src/editions/es/content/gamepad";
import { sentKey } from "../../src/editions/es/learner/walk";
import table from "../../src/editions/es-lt/tables/ui-gamepad.json";

const expected = [
  ["connected", "Valdiklis | prijungtas", "Valdiklis prijungtas"],
  ["disconnected", "Valdiklis | atjungtas", "Valdiklis atsijungė"],
  ["move", "Judėti", "Judėti"],
  ["look", "Apsidairyti", "Apsidairyti"],
  ["jump", "Šokti", "Pašokti"],
  ["interact", "Naudoti", "Naudoti"],
  ["choose", "Pasirinkti", "Pasirinkti"],
  ["back", "Grįžti", "Grįžti"],
] as const;

it("exposes the eight controller IDs through the Puerto Colibrí Lithuanian overlay", () => {
  expect(EDITION.id).toBe("es");
  expect(EDITION.helper).toBe("lt");
  expect(Object.keys(PAD_LINES).sort()).toEqual(expected.map(([id]) => id).sort());
  expect(PAD_LINES).not.toBe(ES_PAD_LINES);
});

it.each(expected)("%s keeps the Spanish units in a fresh row with aligned Lithuanian", (id, gloss, nat) => {
  const source = ES_PAD_LINES[id];
  const line = PAD_LINES[id];
  expect(line).not.toBe(source);
  expect(line).toEqual({ en: source.en, lt: gloss, nat });
  const units = source.en.split(" | ").length;
  expect(source.lt.split(" | ")).toHaveLength(units);
  expect(line.lt.split(" | ")).toHaveLength(units);
});

it("matches every source ID to exactly one sentence key and Lithuanian value", () => {
  const entries = expected.map(([id, gloss, nat]) => {
    const source = ES_PAD_LINES[id];
    return [sentKey(source.en, source.lt, source.nat), { gloss, nat }] as const;
  });
  expect(new Set(entries.map(([key]) => key)).size).toBe(8);
  expect(table).toEqual({ sent: Object.fromEntries(entries), entity: {}, text: {} });
});
