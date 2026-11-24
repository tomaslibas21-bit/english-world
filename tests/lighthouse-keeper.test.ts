import { describe, expect, it, vi } from "vitest";
import keeper from "../src/content/situations/x05-lighthouse-keeper";
import { loadSituation } from "../src/content/situations/catalog";
import { modelAnswers } from "../src/convo/suggest";
import { Session } from "../src/game/session";
import { sentenceInput, newCard } from "../src/state/cards";
import { emptyProgress } from "../src/state/progress";
import { useStore } from "../src/state/store";
import { playSim } from "../tools/sim-play";

vi.mock("../src/game/audio", () => ({
  audio: { names: [], play: async () => false, prefetch: async () => {}, stop() {}, sfx() {}, clipDuration() {} },
}));

describe("the lighthouse keeper's conversation", () => {
  it.each([
    [0, ["k_home", "k_turn", "k_morning", "k_stay", "k_keep"]],
    [1, ["k_company", "k_boats", "k_night", "k_light_on", "k_draw"]],
  ] as const)("credits each of the model answers on path %i", (index, answers) => {
    const { start, turns, conv } = playSim(keeper, keeper.sims![index], 1, { visits: 0 });
    expect(start.lines.map((l) => l.lineId)).toEqual(["k_welcome", "k_life_ask"]);
    expect(turns.map((turn) => turn.out.hintsUsed)).toEqual(answers.map((id) => [id]));
    expect(turns.map((turn) => turn.waiting)).toEqual(["life", "light", "routine", "storm", "gift"]);
    expect(turns.at(-1)?.out.lines.at(-1)?.lineId).toBe("k_bye");
    expect(conv.completed).toBe(true);
    expect(conv.ended).toBe(true);
    expect(conv.input("Goodbye.").lines).toEqual([]);
  });

  it("recognizes a return and keeps the question open through shared clarification", () => {
    const { start, turns, conv } = playSim(keeper, keeper.sims![2], 1, { visits: 1 });
    expect(start.lines.map((l) => l.lineId)).toEqual(["k_again", "k_life_ask"]);
    expect(turns[1].out.lines.at(-1)?.lineId).toBe("k_light_ask");
    expect(turns[4].out.lines.map((l) => l.lineId)).toContain("g_dont_understand");
    expect(turns[4].out.lines.at(-1)?.lineId).toBe("k_storm_ask");
    expect(turns.flatMap((turn) => turn.out.hintsUsed).filter((id) => id.startsWith("k_")))
      .toEqual(["k_company", "k_turn", "k_night", "k_stay", "k_keep"]);
    expect(conv.completed).toBe(true);
  });

  it("leaves at the gift offer without awarding the note", () => {
    const { turns, conv } = playSim(keeper, keeper.sims![4], 1, { visits: 0 });
    expect(turns.at(-1)?.out.lines.map((l) => l.lineId)).toEqual(["k_later"]);
    expect(conv.completed).toBe(false);
    expect(conv.ended).toBe(true);
    expect(conv.input("I'll keep it, thanks.").lines).toEqual([]);
    expect(conv.completed).toBe(false);
    expect(playSim(keeper, keeper.sims![0], 1, { visits: 0 }).start.lines[0].lineId).toBe("k_welcome");
  });

  it("keeps later answers out of the current step and advances once for a compound answer", () => {
    const { conv } = playSim(keeper, { name: "opening", turns: [], expect: {} }, 1, { visits: 0 });
    expect(conv.input("Does the light turn?").hintsUsed).toEqual([]);
    expect(conv.step).toBe("life");
    const out = conv.input("Do you live on the island? Is it quiet here?");
    expect(out.lines.map((l) => l.lineId)).toEqual(["k_home_reply", "k_light_ask"]);
    expect(conv.step).toBe("light");
  });

  it("records the composed picker answers as phrases from the five turns without recordings", async () => {
    const id = keeper.id;
    await loadSituation(id);
    vi.useFakeTimers();
    vi.stubGlobal("document", new EventTarget());
    useStore.setState({ progress: emptyProgress() });
    const store = useStore.getState;
    const onEnd = vi.fn();
    const session = new Session(id, { npcTalk() {}, onEvent() {}, onEnd });
    try {
      const started = session.begin();
      store().setConv({ introOpen: false });
      await started;
      const picked = [
        ["life", "k_home"], ["light", "k_turn"], ["routine", "k_morning"], ["storm", "k_stay"], ["gift", "k_keep"],
      ] as const;
      for (const [step, phraseId] of picked) {
        expect(store().conv).toMatchObject({ phase: "you", stepId: step });
        const answers = modelAnswers(keeper, keeper.hints[step], undefined, { formal: true, gender: "m", npcGender: "m", vars: {} }, 3);
        expect(answers).toHaveLength(2);
        const sentence = answers[0];
        await session.submit(sentence.en, [], "picked");
        const phrase = store().progress.phrases[id + ":" + phraseId];
        expect(phrase).toMatchObject({ en: sentence.en, lt: sentence.nat, sitId: id, count: 1 });
        const card = newCard(sentenceInput(sentence, phrase.sitId), Date.now());
        expect(card).toMatchObject({ situationId: id, sentence: { en: phrase.en, lt: phrase.lt } });
        expect(store().conv.transcript.findLast((l) => l.who === "you")).toMatchObject({ via: "picked", understood: true });
      }
      expect(Object.keys(store().progress.phrases)).toHaveLength(5);
      expect(store().progress.sits[id].completions).toBe(1);
      expect(store().conv).toMatchObject({ phase: "ended", completed: true });
      session.close();
      session.close();
      expect(store().progress.sits[id].completions).toBe(1);
      expect(onEnd).toHaveBeenCalledExactlyOnceWith(keeper, true);
    } finally {
      session.close();
      vi.clearAllTimers();
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });
});
