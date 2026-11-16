// The light catalogue of the conversations (src/content/situations/catalog.ts): what the game knows of each before its
// file is loaded must be what the file says (out of step: run tools/gen-meta.ts for this edition), and each loader must
// bring that conversation's own file.
import { describe, expect, it } from "vitest";
import { SITUATIONS as ALL } from "../../src/content/situations";
import { SITUATIONS, SITUATION_BY_ID, getSituation, loadSituation } from "../../src/content/situations/catalog";
import { SITUATION_META_FIELDS } from "../../src/content/types";

describe("the conversations' light catalogue", () => {
  it("lists every conversation with the fields its file has", () => {
    expect(SITUATIONS.map((s) => s.id).sort()).toEqual(ALL.map((s) => s.id).sort());
    for (const s of ALL) {
      const want: Record<string, unknown> = {};
      for (const k of SITUATION_META_FIELDS) if ((s as any)[k] !== undefined) want[k] = (s as any)[k];
      expect(SITUATION_BY_ID[s.id], s.id).toEqual(want);
    }
  });

  it("loads each conversation's own file", async () => {
    for (const s of ALL) {
      expect(await loadSituation(s.id)).toBe(s);
      expect(getSituation(s.id)).toBe(s);
    }
    expect(await loadSituation("no-such-conversation")).toBeNull();
  });
});

import { TABLES } from "../../src/editions/es-lt/tables/tables.gen";
import { LOADED, mergeValueText } from "../../src/editions/es-lt/tables/loaded";
import VALUE_TEXT from "../../src/editions/es-lt/tables/value-text.gen.json";

describe("the learner's tables, loaded with their conversations", () => {
  it("value-text.gen.json is every table's texts (else: EDITION=es LEARNER=lt … tools/gen-meta.ts)", () => {
    expect(VALUE_TEXT).toEqual(Object.fromEntries(mergeValueText(TABLES)));
  });
  it("a loaded conversation has its table", async () => {
    for (const s of ALL) { await loadSituation(s.id); if (TABLES[s.id]) expect(LOADED[s.id]).toBe(TABLES[s.id]); }
  });
});
