import { afterEach, describe, expect, it, vi } from "vitest";
import { WORD_GATE_UI } from "../../src/content/road";
import { audioDir } from "../../src/content/voices";
import { EDITION } from "../../src/edition";
import { loadPhrasePool } from "../../src/game/road/phrasePool";
import { gateOptions } from "../../src/game/road/phraseEntries";
import { gateSayItTarget, keepRunPhrases, practiceResult, RunScore } from "../../src/game/road/run";
import { addCards, cardKey, useCards } from "../../src/state/cards";
import { L } from "../../src/ui/i18n";

const lt = EDITION.helper === "lt";
const originalCards = useCards.getState();
afterEach(() => {
  useCards.setState(originalCards);
  vi.unstubAllGlobals();
});

describe("Puerto Colibrí phrase mode", () => {
  it("loads the current learner's prompts and gives each Spanish phrase three distinct options", async () => {
    const { listen } = await loadPhrasePool(() => 0.42);
    const phrases = new Map(listen.map(({ phrase }) => [phrase!.f, phrase!]));
    const bus = phrases.get("¿Hay autobús?");
    expect(EDITION.id).toBe("es");
    expect(audioDir()).toBe("audio-es/");
    expect(phrases.size).toBe(200);
    expect(bus?.id).toBe(`pc-${EDITION.helper}-001`);
    expect(bus?.p).toBe(lt ? "Ar čia važinėja autobusas?" : "Is there a bus?");
    for (const prompt of listen) {
      const { phrase, options, right } = prompt;
      expect(options[right]).toBe(phrase!.f);
      expect(new Set(options.map((text) => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""))).size).toBe(3);
      expect(options.every((text) => Math.abs(phrase!.words.length - phrases.get(text)!.words.length) <= 2)).toBe(true);
      expect(options.filter((_, lane) => lane !== right).every((text) => phrases.get(text)!.topic !== phrase!.topic)).toBe(true);
      expect(gateOptions(prompt, "Road").map(({ sentence }) => [sentence.en, sentence.nat]))
        .toEqual(options.map((target) => [target, phrases.get(target)!.p]));
    }
  });

  it("freezes the displayed choices in first-seen order and leaves a missed gate unawarded", async () => {
    const { listen } = await loadPhrasePool(() => 0.42);
    const first = listen[0], second = listen[1];
    const score = new RunScore(150, "Road");
    score.show(first);
    score.answer(first, (first.right + 1) % 3);
    const review = score.review.finish();
    expect(review.map(({ sentence }) => sentence.en)).toEqual(first.options);
    expect(review.every(({ sourceLabel }) => sourceLabel === "Road")).toBe(true);
    expect(keepRunPhrases(score)).toBe(0);
    score.show(second);
    expect(score.review.finish()).toBe(review);
    const retry = new RunScore(150, "Road");
    retry.show(second);
    expect(retry.review.finish().map(({ sentence }) => sentence.en)).toEqual(second.options);
  });

  it("accepts the Spanish phrase aloud and keeps the learner's meaning without updating an existing card", async () => {
    const { listen } = await loadPhrasePool(() => 0.42);
    const prompt = listen.find(({ phrase }) => phrase?.f === "¿Hay autobús?")!;
    expect(gateSayItTarget(prompt).evaluate("hay autobus")).toBe("complete");
    expect(gateSayItTarget(prompt).evaluate("hay")).toBe("prefix");

    const existing = Object.freeze(addCards([], [{
      en: "Hola", lt: lt ? "Labas" : "Hi", sentence: { en: "Hola", lt: lt ? "Labas" : "Hi" }, situationId: "test",
    }], 50).cards[0]);
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", { setItem });
    useCards.setState({ cards: [existing], keys: new Set([cardKey(existing.en)]) });
    const score = new RunScore();
    score.answer(prompt, prompt.right);
    expect(keepRunPhrases(score)).toBe(1);
    expect(useCards.getState().cards[0]).toBe(existing);
    expect(useCards.getState().cards[1]).toMatchObject({ en: prompt.phrase!.f, lt: prompt.phrase!.p });
    expect(practiceResult(score, "phrases").phrases).toEqual([prompt.word]);
    expect(keepRunPhrases(score)).toBe(0);
    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it("uses the learner layer's exact choice and comeback text", () => {
    expect([
      L(WORD_GATE_UI.heading), L(WORD_GATE_UI.words.title), L(WORD_GATE_UI.words.line),
      L(WORD_GATE_UI.phrases.title), L(WORD_GATE_UI.phrases.line), L(WORD_GATE_UI.recovered),
    ]).toEqual(lt ? [
      "Kaip žaisime?", "Žodžiai", "Išgirskite ispaniškai, pasirinkite reikšmę",
      "Frazės", "Išgirskite lietuviškai, pasirinkite ispaniškai", "Šįkart pataikėte!",
    ] : [
      "How do you want to play?", "Words", "Hear Spanish, pick the meaning",
      "Phrases", "Hear English, pick the Spanish", "Got it this time!",
    ]);
  });
});
