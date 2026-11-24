import { describe, expect, it } from "vitest";
import { GYM_ENTRY } from "@/content/gym-entry";
import { GYM_LINES } from "@/content/gym-lines";
import { GYM_MOVE_LABELS, GYM_UI, learnerLang, targetLang } from "@/content/gym";
import { loadSituation } from "@/content/situations/catalog";
import { compose } from "@/convo/compose";
import { EDITION } from "@/edition";
import { GYM_ENTRY as EN_ENTRY } from "../../src/editions/es/content/gym-entry";
import { GYM_LINES as EN_LINES } from "../../src/editions/es/content/gym-lines";
import { GYM_MOVE_LABELS as EN_LABELS, GYM_UI as EN_UI } from "../../src/editions/es/content/gym";
import { sentKey } from "../../src/editions/es/learner/walk";
import { LOADED } from "../../src/editions/es-lt/tables/loaded";
import table from "../../src/editions/es-lt/tables/s35-gym.json";

describe("Mónica's Lithuanian workout content", () => {
  it("resolves the compact UI before the s35 table loads", () => {
    expect(LOADED[EN_ENTRY.situation]).toBeUndefined();
    expect([targetLang, learnerLang]).toEqual([EDITION.target, EDITION.helper]);
    expect(GYM_ENTRY).toMatchObject({ location: "gym", situation: "s35-gym", npc: "jordan" });

    const { startLabel, mapLabel, listAction } = EN_ENTRY;
    const { progress: englishProgress, ...englishUi } = EN_UI;
    const { progress: lithuanianProgress, ...lithuanianUi } = GYM_UI;
    const text: Record<string, string> = table.text;
    const translations = (words: Record<string, string>) =>
      Object.fromEntries(Object.entries(words).map(([key, english]) => [key, text[english]]));
    expect(GYM_ENTRY).toMatchObject(translations({ startLabel, mapLabel, listAction }));
    expect(lithuanianUi).toEqual(translations(englishUi));
    expect(GYM_MOVE_LABELS).toEqual(translations(EN_LABELS));
    for (const current of [1, 10]) {
      expect(englishProgress(current, 10)).toBe(`Move ${current} of 10`);
      expect(lithuanianProgress(current, 10)).toBe(
        table.text["Move {current} of {total}"].replace("{current}", String(current)).replace("{total}", "10"),
      );
    }
  });

  it("loads all 13 translations with their aligned units and keeps the English source intact", async () => {
    expect(GYM_LINES).toBe(EN_LINES);
    const english = structuredClone(EN_LINES);
    const ids = Object.keys(english);
    expect(ids).toHaveLength(13);

    const sit = (await loadSituation(GYM_ENTRY.situation))!;
    expect(Object.keys(sit.lines).slice(-ids.length)).toEqual(ids);
    const sentences = table.sent as Record<string, { gloss: string; nat: string }>;
    const look = () => undefined;
    for (const [id, [source]] of Object.entries(english)) {
      const [loaded] = sit.lines[id];
      const translation = sentences[sentKey(source.en, source.lt, source.nat)];
      expect(loaded, id).toEqual({ ...source, lt: translation.gloss, nat: translation.nat });
      const en = compose(source, {}, { look });
      const lt = compose(loaded, {}, { look });
      expect(lt.say, id).toBe(en.say);
      expect(lt.units, id).toHaveLength(en.units.length);
    }
    expect(EN_LINES).toEqual(english);
  });
});
