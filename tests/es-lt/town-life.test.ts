import { expect, it } from "vitest";
import TOWN_LIFE from "../../src/editions/es-lt/tables/town-life.json";
import SHARED from "../../src/editions/es-lt/tables/_shared.json";

it("keeps every Spanish town life line and twin and supplies its Lithuanian meaning", async () => {
  // The learner overlay translates the underlying Spanish module in place.
  const original = structuredClone({
    reactions: (await import("../../src/editions/es/content/reacts")).REACT_LINES,
    threads: (await import("../../src/editions/es/content/texts")).TEXT_THREADS,
    spots: (await import("../../src/editions/es/content/radioSpots")).RADIO_SPOTS,
  });
  const actual = {
    reactions: (await import("../../src/content/reacts")).REACT_LINES,
    threads: (await import("../../src/content/texts")).TEXT_THREADS,
    spots: (await import("../../src/content/radioSpots")).RADIO_SPOTS,
  };
  const lines = [
    ...Object.values(original.reactions).flat(),
    ...original.threads.flatMap(({ lines, replies }) => [...lines, ...replies, ...replies.flatMap(({ answer }) => answer)]),
    ...original.spots.flatMap(({ lines }) => lines),
  ];
  const meanings: Record<string, string> = TOWN_LIFE.text;
  for (const line of lines) {
    const translated = meanings[line.lt];
    expect(translated, line.en).toBeTruthy();
    expect(translated, line.en).not.toBe(line.lt);
    line.lt = translated;
  }
  expect(actual).toEqual(original);
});

it("resolves the town's message senders and their conversation triggers", async () => {
  const { TEXT_THREADS } = await import("../../src/content/texts");
  const { SITUATION_BY_ID } = await import("../../src/content/situations/catalog");
  const contacts = structuredClone((await import("../../src/editions/es/content/npcs")).NPCS);
  const { NPCS } = await import("../../src/content/npcs");
  const meanings: Record<string, string> = SHARED.text;
  expect(Object.fromEntries(TEXT_THREADS.map(({ from, after }) => [from, after]))).toEqual({
    dan: "s85-dinner", rita: "s82-neighbor", memo: "x11-billar", lucy: "s86-old-friend", tona: "x10-loteria",
  });
  for (const { from, after } of TEXT_THREADS) {
    expect(SITUATION_BY_ID[after], after).toBeDefined();
    expect(NPCS[from]).toMatchObject({ id: from, name: contacts[from].name, look: contacts[from].look });
    expect(NPCS[from].role.lt).toBe(meanings[contacts[from].role.lt]);
  }
});
