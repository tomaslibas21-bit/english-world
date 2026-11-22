import { expect, it } from "vitest";
import { loadSituation } from "../../src/content/situations/catalog";
import { TAXI_LINES } from "../../src/content/taxi-lines";
import { setVariety } from "../../src/convo/compose";
import { conversationLine } from "../../src/game/kit/lines";
import { sentKey } from "../../src/editions/es/learner/walk";
import { LOADED } from "../../src/editions/es-lt/tables/loaded";

const snapshot = (line: { en: string; lt: string; nat: string }) => ({
  en: line.en, nat: line.nat, tableKey: sentKey(line.en, line.lt, line.nat),
});

it("composes every taxi line after s66 loads the Lithuanian learner table", async () => {
  const lines = Object.entries(TAXI_LINES).map(([key, [line]]) => ({
    key,
    learner: /^tx_(?:r[123]_)?a_/.test(key),
    authored: {
      default: snapshot(line),
      neutral: snapshot(line.neutral ?? line),
      spain: snapshot(line.spain ?? line.neutral ?? line),
    },
  }));
  expect(await loadSituation("s66-taxi")).toBeTruthy();
  const table = LOADED["s66-taxi"];
  expect(table).toBeDefined();
  try {
    for (const variety of ["default", "neutral", "spain"] as const) {
      setVariety(variety);
      for (const { key, learner, authored } of lines) {
        const source = authored[variety];
        const rendered = conversationLine("s66-taxi", "vinnie", key, undefined, learner);
        expect(rendered?.en, key).toBe(source.en.replace(/\s*\|\s*/g, " "));
        expect(rendered?.nat, key).toBe(table.sent[source.tableKey]?.nat ?? source.nat);
      }
    }
  } finally {
    setVariety("default");
  }
});
