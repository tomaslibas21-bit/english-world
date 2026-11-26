import { afterEach, describe, expect, it, vi } from "vitest";
import { WORD_GATE_UI } from "../../src/content/road";
import { audioDir } from "../../src/content/voices";
import { EDITION } from "../../src/edition";
import { loadPhrasePool } from "../../src/game/road/phrasePool";
import { gateFeedback, gateOptions } from "../../src/game/road/phraseEntries";
import { gateSayItTarget, keepRunPhrases, practiceResult, RunScore } from "../../src/game/road/run";
import { makeGap, type Prompt } from "../../src/game/road/words";
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

  it("binds a gap's visible word in feedback and practice while reviewing and awarding the whole sentence", () => {
    const full = {
      en: "El agua guarda la memoria.", say: "El agua guarda la memoria.",
      nat: lt ? "Vanduo saugo atmintį." : "The water keeps the memory.",
      units: [
        { en: "El", lt: lt ? "—" : "The" }, { en: "agua", lt: lt ? "Vanduo" : "water" },
        { en: "guarda", lt: lt ? "saugo" : "keeps" }, { en: "la", lt: lt ? "—" : "the" },
        { en: "memoria.", lt: lt ? "atmintį." : "memory." },
      ],
    };
    const situation = "x04-yaxche";
    const clip = { say: full.say, voice: "es_coach_f", speed: 1, male: false };
    const word = { en: "agua", lt: full.units[1].lt, situation, clip };
    const prompt: Prompt = {
      word, gap: { word, full, sentence: makeGap(full, 1), clip }, right: 1,
      options: ["isla", "agua", "roca"],
      optionWords: new Map([
        ["isla", { en: "Isla", lt: lt ? "Sala" : "island", situation: "x01-surf" }],
        ["roca", { en: "roca", lt: lt ? "Uola" : "rock", situation }],
      ]),
    };
    const options = gateOptions(prompt, "Road");
    expect(options.map(({ sentence }) => [sentence.en, sentence.say])).toEqual(prompt.options.map((text) => [text, text]));
    expect(options[0]).toMatchObject({ sentence: { nat: lt ? "Sala" : "island" }, situationId: "x01-surf" });
    const unseen = new RunScore(150, "Road");
    unseen.show(prompt);
    expect(unseen.review.finish()).toEqual(options);

    const score = new RunScore(150, "Road");
    score.show(prompt);
    const correct = score.answer(prompt, 0);
    const feedback = gateFeedback(prompt, score.title, correct);
    const whole = { sentence: full, situationId: situation };
    const wordEntry = { sentence: { en: word.en, nat: word.lt, say: word.en, units: [] }, situationId: situation };
    expect(feedback).toMatchObject({ correct: false, entry: wordEntry, gapEntry: whole, options });
    expect(practiceResult(score, "words")).toMatchObject({ missed: [word], missedEntries: [wordEntry] });
    expect(score.review.finish()).toEqual([...options, whole]);
    expect(keepRunPhrases(score)).toBe(0);

    const recovered = new RunScore(150, "Road");
    recovered.answer({ ...prompt, practice: "firstRetry" }, prompt.right);
    expect(practiceResult(recovered, "words").practiceEntries).toEqual([wordEntry]);
    vi.stubGlobal("localStorage", { setItem: vi.fn() });
    useCards.setState({ cards: [], keys: new Set() });
    expect(keepRunPhrases(recovered)).toBe(1);
    expect(useCards.getState().cards).toMatchObject([{ en: full.en, lt: full.nat, situationId: situation }]);
    expect(keepRunPhrases(recovered)).toBe(0);
  });

  it("uses the learner layer's exact choice and comeback text", () => {
    expect([
      L(WORD_GATE_UI.heading), L(WORD_GATE_UI.words.title), L(WORD_GATE_UI.words.line),
      L(WORD_GATE_UI.phrases.title), L(WORD_GATE_UI.phrases.line), L(WORD_GATE_UI.recovered),
    ]).toEqual(lt ? [
      "Kaip žaisime?", "Žodžiai", "Išgirsk ispaniškai, pasirink reikšmę",
      "Frazės", "Išgirsk lietuviškai, pasirink ispaniškai", "Šįkart pataikei!",
    ] : [
      "How do you want to play?", "Words", "Hear Spanish, pick the meaning",
      "Phrases", "Hear English, pick the Spanish", "Got it this time!",
    ]);
  });
});
