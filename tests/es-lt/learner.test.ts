// Puerto Colibrí for Lithuanians (docs/es/LEARNER-LT.md): the vitest project "es-lt" runs the Spanish edition with the
// Lithuanian learner layer. Every piece of learner text has its Lithuanian, and every conversation's sims compose in
// both learner genders and all three Spanishes without an error (a gloss whose units don't line up throws).
import { describe, expect, it } from "vitest";
import { SITUATIONS } from "@/content/situations";
import * as Situations from "@/content/situations";
import { EDITION } from "@/edition";
import { setVariety } from "@/convo/compose";
import { ROAD_LINES, ROAD_MERGES } from "@/content/road-lines";
import { STREET_CHATTER, STREET_MOMENTS } from "@/content/street";
import { resolveStreetLine, streetText } from "@/game/street/lines";
import { STRINGS } from "@/ui/strings";
import { STREET_CHATTER as ES_CHATTER, STREET_MOMENTS as ES_MOMENTS } from "../../src/editions/es/content/street";
import { streetLearnerContent } from "../../src/editions/es/learner/street";
import streetTable from "../../src/editions/es-lt/tables/street.json";
import { applyLearner, learnerItems } from "../../src/editions/es/learner/walk";
import { sharedContent } from "../../src/editions/es/learner/shared";
import { playSim } from "../../tools/sim-play";
import { chipLabel } from "@/ui/chip-label";

const MISSING = (Situations as unknown as { LEARNER_MISSING: Record<string, string[]> }).LEARNER_MISSING;
const ENGLISH = /\b(the|and|you|your|please|thanks|thank you|would|could|I'm|it's|don't)\b/i;

describe("Puerto Colibrí for Lithuanians", () => {
  it("is the Spanish edition with a Lithuanian learner", () => {
    expect(EDITION.id).toBe("es");
    expect(EDITION.helper).toBe("lt");
    // the interface: Lithuanian originals, except those about English or Maple Harbor
    expect(STRINGS["Parašyk angliškai…"]).toBe("Parašyk ispaniškai…");
  });

  it("has Lithuanian for every piece of every conversation's learner text", () => {
    // The separate learner-layer build supplies the new road dialogue rows.
    const roadRows = new Set(learnerItems({ lines: ROAD_LINES, merges: ROAD_MERGES })
      .map((item) => item.kind === "sent" ? `sent ${item.es}` : `text ${item.en}`));
    const missing = Object.entries(MISSING).flatMap(([sit, rows]) => rows
      .filter((row) => sit !== "s66-taxi" || !roadRows.has(row))
      .map((row) => `${sit}: ${row}`));
    expect(missing.slice(0, 20)).toEqual([]);
  });

  it("has Lithuanian for the town-wide text (cast, places, global lines)", () => {
    const shared = sharedContent();
    // SOL_TASK.md leaves Renata and Doña Queta’s roles in _shared.json to the coordinator.
    const { renata, queta, ...npcs } = shared.npcs;
    const left = learnerItems({ ...shared, npcs }).filter((i) => (i.kind === "text" ? ENGLISH.test(i.en ?? "") : i.kind === "sent" && ENGLISH.test(i.nat ?? "")));
    expect(left.slice(0, 10).map((i) => i.en ?? i.nat)).toEqual([]);
  });

  it("applies the street table and reports entries still awaiting Lithuanian", () => {
    const source = streetLearnerContent(ES_MOMENTS, ES_CHATTER);
    const rows = learnerItems(source);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every(({ kind }) => kind === "text")).toBe(true);
    const translations: Record<string, string> = streetTable.text;
    const missing = rows.filter(({ en }) => !translations[en!]?.trim() || translations[en!] === en);
    if (missing.length) console.warn(`Street life: ${missing.length} entries awaiting Lithuanian\n` +
      missing.map(({ where, en }) => `  ${where}: ${en}`).join("\n"));
    const expected = structuredClone(source);
    applyLearner(expected, streetTable);
    expect(streetLearnerContent(STREET_MOMENTS, STREET_CHATTER)).toEqual(expected);
    expect(STREET_MOMENTS).not.toBe(ES_MOMENTS);
    expect(STREET_CHATTER).not.toBe(ES_CHATTER);
  });

  it("applies both kinds of gender switch to street lines, cast roles and by-cast scenes", () => {
    const text = "{nm:Praeivis|nf:Praeivė} · {m:pasirengęs|f:pasirengusi}";
    const content = {
      cast: [{ role: "role" }],
      scene: { byCast: { a: "scene" } },
      choices: [{ say: { byCast: { a: { en: "Hola", lt: "line" } } } }],
    };
    expect(learnerItems(content)).toContainEqual({
      kind: "text", where: "choices[0].say.byCast.a.lt", en: "line", es: "Hola",
    });
    applyLearner(content, { sent: {}, entity: {}, text: { role: text, scene: text, line: text } });
    expect(streetText(content.cast[0].role, "m", "f")).toBe("Praeivė · pasirengęs");
    expect(streetText(content.scene.byCast.a, "f", "m")).toBe("Praeivis · pasirengusi");
    expect(resolveStreetLine(content.choices[0].say.byCast.a, "f", "f").nat).toBe("Praeivė · pasirengusi");
  });

  it("answer chips say the natural Lithuanian name in the nominative, never the gloss in Spanish order", () => {
    const bad: string[] = [];
    for (const sit of SITUATIONS) for (const [type, list] of Object.entries(sit.entities ?? {})) for (const e of list) {
      if (e.chip || e.lt.split(" | ").length < 2) continue;
      const nat = typeof e.attrs?.nat === "string" ? e.attrs.nat.split("/") : [];
      if (nat.length !== 6 || chipLabel(e) !== nat[0].trim()) bad.push(`${sit.id} ${type}/${e.id}: "${chipLabel(e)}"`);
    }
    expect(bad.slice(0, 20)).toEqual([]);
  });

  for (const sit of SITUATIONS) {
    it(`${sit.id}: the sims compose in Lithuanian`, { timeout: 300_000 }, () => {
      for (const variety of ["default", "neutral", "spain"] as const) {
        setVariety(variety);
        for (const sim of sit.sims ?? []) for (const gender of ["m", "f"] as const) playSim(sit, sim, 1, { gender });
      }
      setVariety("default");
    });
  }
});
