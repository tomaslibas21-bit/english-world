import { afterEach, describe, expect, it, vi } from "vitest";
import { karaoke } from "../src/game/road/karaoke";
import { loadPhrasePool, phrasePrompt } from "../src/game/road/phrasePool";
import { pickPrompt, promptId, updateRecentMisses, type GateAnswer, type RecentMiss } from "../src/game/road/review";
import { gateSayItTarget, keepRunPhrases, practiceResult, rememberRun, runPicker, RunScore } from "../src/game/road/run";
import { playWay, recentMisses, setPlayWay } from "../src/game/road/save";
import { makeGap, shufflePrompt, type Phrase, type Prompt } from "../src/game/road/words";
import { audio, type FilePlayback } from "../src/game/audio";
import { addCards, cardKey, dueCards, STORAGE_KEY, useCards } from "../src/state/cards";
import { emptyProgress, loadProgress, saveProgress } from "../src/state/progress";
import { useStore } from "../src/state/store";

function seeded(seed: number) {
  return () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}

const word = (i: number): Prompt => ({
  word: { en: `Word ${i}`, lt: `Gloss ${i}`, situation: "test", clip: { say: `Word ${i}`, speed: 1, voice: "test", male: false } },
  options: [`Gloss ${i}`, "Other", "Another"], right: 0,
});
const pool = { listen: Array.from({ length: 60 }, (_, i) => word(i)), gaps: [] };
const phrase: Phrase = {
  id: "test-phrase", f: "Could you spell that?", p: "Gal galite padiktuoti paraidžiui?", topic: "work",
  words: ["Could", "you", "spell", "that?"], t: [[0.3, 0.65], [0.7, 0.8], [0.8, 1.25], [1.25, 1.4]],
  fClip: "ph-b3be19d220.mp3", pClip: "ph-830425f7fe.mp3", src: "",
};
const phraseGate: Prompt = {
  phrase, word: { en: phrase.f, lt: phrase.p, situation: "" },
  options: [phrase.f, "Can I try it?", "Can I pay by card?"], right: 0,
};

function storage() {
  const saved = new Map<string, string>();
  const store = { getItem: (key: string) => saved.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => { saved.set(key, value); }) };
  vi.stubGlobal("localStorage", store);
  return store;
}

const originalCards = useCards.getState();
const originalProgress = useStore.getState().progress;
afterEach(() => {
  useCards.setState(originalCards);
  useStore.setState({ progress: originalProgress });
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("word gate practice", () => {
  it.each([true, false])("gives a miss a comeback 2–4 gates later (first comeback correct: %s)", (recover) => {
    const score = new RunScore(), rng = seeded(83);
    const chosen: { index: number; prompt: Prompt }[] = [];
    for (let i = 0; i < 15; i++) {
      const prompt = pickPrompt(pool, [], [], score.history, 15 - i, rng)!;
      const same = i === 0 || promptId(prompt) === promptId(score.history[0].prompt);
      if (same) chosen.push({ index: i, prompt });
      const correct = !same || prompt.practice === "lastRetry" || (recover && prompt.practice === "firstRetry");
      score.answer(prompt, correct ? prompt.right : (prompt.right + 1) % 3);
    }
    expect(chosen).toHaveLength(recover ? 2 : 3);
    expect(chosen[1].index).toBeGreaterThanOrEqual(2);
    expect(chosen[1].index).toBeLessThanOrEqual(4);
    expect(chosen[1].prompt.practice).toBe("firstRetry");
    if (!recover) {
      expect(chosen[2].index).toBeGreaterThanOrEqual(11);
      expect(chosen[2].prompt.practice).toBe("lastRetry");
    }
    expect(practiceResult(score, "words")).toMatchObject({
      missed: [chosen[0].prompt.word], recovered: [chosen[0].prompt.word],
    });
  });

  it("leaves the next gate fresh even when several misses are waiting", () => {
    const history: GateAnswer[] = [];
    const rng = seeded(21);
    for (let i = 0; i < 18; i++) {
      const prompt = pickPrompt(pool, [], [], history, 18 - i, rng)!;
      const previous = history.findIndex((gate) => promptId(gate.prompt) === promptId(prompt));
      if (prompt.practice === "firstRetry") expect(i - previous).toBeGreaterThanOrEqual(2);
      if (prompt.practice === "firstRetry") expect(i - previous).toBeLessThanOrEqual(4);
      expect(promptId(prompt)).not.toBe(history.at(-1) && promptId(history.at(-1)!.prompt));
      history.push({ prompt, correct: false });
    }
  });

  it("mixes recent misses and due cards into at most a third of prompts over seeded runs without changing the cards", () => {
    const cards = addCards([], pool.listen.slice(0, 15).map(({ word }) => ({
      en: word.en, lt: word.lt, sentence: { en: word.en, lt: word.lt }, situationId: word.situation,
    })), 0).cards.map((card, i) => Object.freeze({ ...card, due: i < 10 ? 0 : 1000 }));
    Object.freeze(cards);
    const saved = storage(), before = structuredClone(cards);
    const due = dueCards(cards, 100);
    const recent = pool.listen.slice(15, 25).map((prompt) => ({ id: promptId(prompt), rights: 0 }));
    const played = new Set<string>();
    for (let seed = 0; seed < 64; seed++) {
      const history: GateAnswer[] = [], rng = seeded(seed);
      let misses = 0, reviews = 0;
      for (let gate = 0; gate < 18; gate++) {
        const prompt = pickPrompt(pool, recent, due, history, 18 - gate, rng)!;
        if (recent.some(({ id }) => id === promptId(prompt))) misses++;
        else if (due.some(({ en }) => cardKey(en) === promptId(prompt))) reviews++;
        expect(misses + reviews).toBeLessThanOrEqual(Math.floor((gate + 1) / 3));
        history.push({ prompt, correct: true });
        played.add(promptId(prompt));
      }
      expect(misses).toBe(3);
      expect(reviews).toBe(3);
      expect(new Set(history.map(({ prompt }) => promptId(prompt))).size).toBe(18);
    }
    expect(played.size).toBeGreaterThan(18);
    expect(cards).toEqual(before);
    expect(saved.setItem).not.toHaveBeenCalled();
  });

  it("keeps the latest 30 misses and clears one only after correct answers in two later runs", () => {
    const recent: RecentMiss[] = [];
    const missed = pool.listen.slice(0, 35).map((prompt) => ({ prompt, correct: false }));
    const list = updateRecentMisses(recent, missed);
    expect(list.map(({ id }) => id)).toEqual(pool.listen.slice(5, 35).map(promptId));
    expect(recent).toEqual([]);
    const prompt = pool.listen[10], id = promptId(prompt);
    const hit = { prompt, correct: true };
    const once = updateRecentMisses(list, [hit, hit]);
    expect(once.find((item) => item.id === id)).toEqual({ id, rights: 1 });
    expect(updateRecentMisses(once, [hit]).some((item) => item.id === id)).toBe(false);
    expect(updateRecentMisses(once, [{ prompt, correct: false }, hit]).at(-1)).toEqual({ id, rights: 0 });
  });

  it("remembers choices per game and shares misses only within the same town and way", () => {
    const saved = storage(), town = "maple-harbor", progress = emptyProgress();
    expect(playWay(progress, town, "road")).toBe("words");
    expect(playWay(progress, town, "sea")).toBe("words");
    setPlayWay(progress, town, "road", "phrases");
    saveProgress(progress);
    expect(playWay(loadProgress(), town, "road")).toBe("phrases");
    expect(playWay(loadProgress(), town, "sea")).toBe("words");
    setPlayWay(progress, town, "sea", "phrases");
    setPlayWay(progress, town, "road", "words");
    useStore.setState({ progress });
    rememberRun(town, "phrases", [{ prompt: phraseGate, correct: false }]);
    rememberRun(town, "words", [{ prompt: word(2), correct: false }]);
    const reloaded = loadProgress();
    expect(playWay(reloaded, town, "road")).toBe("words");
    expect(playWay(reloaded, town, "sea")).toBe("phrases");
    expect(playWay(reloaded, "another-town", "sea")).toBe("words");
    expect(recentMisses(reloaded, town, "phrases")).toEqual([{ id: phrase.id, rights: 0 }]);
    expect(recentMisses(reloaded, town, "words")).toEqual([{ id: promptId(word(2)), rights: 0 }]);
    expect(recentMisses(reloaded, "another-town", "phrases")).toEqual([]);
    runPicker(pool, town, "words")([], 15);
    expect(saved.setItem.mock.calls.some(([key]) => key === STORAGE_KEY)).toBe(false);
  });
});

describe("phrase gates", () => {
  it("gives every phrase three distinct options within two words, using other topics", async () => {
    const { listen } = await loadPhrasePool(seeded(923));
    const phrases = new Map(listen.map(({ phrase }) => [phrase!.f, phrase!]));
    expect(phrases.size).toBe(200);
    for (const { phrase, options, right } of listen) {
      expect(options[right]).toBe(phrase!.f);
      expect(new Set(options.map((text) => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""))).size).toBe(3);
      expect(options.every((text) => Math.abs(phrase!.words.length - phrases.get(text)!.words.length) <= 2)).toBe(true);
      expect(options.filter((_, lane) => lane !== right).every((text) => phrases.get(text)!.topic !== phrase!.topic)).toBe(true);
    }
  });

  it("filters punctuation and case variants, and falls back to the same topic if needed", () => {
    const other = (f: string, p: string, topic = "work"): Phrase => ({ ...phrase, words: f.split(" "), f, p, topic });
    const options = phrasePrompt(phrase, [
      other("COULD YOU SPELL THAT!", "variant", "other"),
      other("Can you spell it?", phrase.p, "other"),
      other("Can I try it?", "food", "food"),
      other("Can I pay by card?", "money"),
    ], seeded(88))?.options;
    expect(options).toEqual(expect.arrayContaining([phrase.f, "Can I try it?", "Can I pay by card?"]));
  });

  it("reviews displayed board alternatives in first-seen order, with their own helpers across lane shuffles", async () => {
    const { listen } = await loadPhrasePool(seeded(923));
    const source = new Map(listen.map(({ phrase }) => [phrase!.f, phrase!.p]));
    const prompt = listen[0];
    const replay = shufflePrompt(prompt, seeded(12));
    const score = new RunScore(150, "Road");
    score.show(prompt);
    score.show(replay);
    score.answer(replay, replay.right);
    const result = practiceResult(score, "phrases");
    expect(result.review.map(({ sentence, sourceLabel }) => [sentence.en, sentence.nat, sentence.say, sourceLabel]))
      .toEqual(prompt.options.map((target) => [target, source.get(target), target, "Road"]));
    expect(result.phrases).toEqual([prompt.word]);
    expect(result.missed).toEqual([]);
  });

  it("keeps the missed-word label and resolves its complete gap sentence only after the answer", () => {
    const answer = word(5);
    if (answer.phrase) throw new Error("Expected a word prompt");
    const full = { en: "Find word five.", nat: "Raskite penktą žodį.", say: "Find word five.",
      units: [{ en: "Find", lt: "Raskite" }, { en: "word five.", lt: "penktą žodį." }] };
    const prompt = { ...answer, gap: { word: answer.word, full, sentence: makeGap(full, 1), clip: answer.word.clip } };
    const score = new RunScore();
    score.show(prompt);
    expect(score.review.entries()).toEqual([]);
    score.answer(prompt, 1);
    const result = practiceResult(score, "words");
    expect(result.missed).toEqual([answer.word]);
    expect(result.missedReview[0]).toMatchObject({ sentence: full, situationId: "test" });
    expect(result.review).toEqual(result.missedReview);
  });

  it("accepts the whole phrase for Say it and saves a correct gate as an unchanged English–Lithuanian pair", () => {
    const target = gateSayItTarget(phraseGate);
    expect(target.evaluate("Could you spell that")).toBe("complete");
    expect(target.evaluate("Could you")).toBe("prefix");
    expect(target.evaluate("Can I try it")).toBe("none");
    const saved = storage();
    const existing = Object.freeze(addCards([], [{ en: "Hello", lt: "Labas", sentence: { en: "Hello", lt: "Labas" }, situationId: "a" }], 50).cards[0]);
    useCards.setState({ cards: [existing], keys: new Set([cardKey(existing.en)]) });
    const score = new RunScore();
    score.answer(phraseGate, phraseGate.right);
    expect(keepRunPhrases(score)).toBe(1);
    const { cards } = useCards.getState();
    expect(cards[0]).toBe(existing);
    expect(cards[1]).toMatchObject({ en: phrase.f, lt: phrase.p });
    expect(practiceResult(score, "phrases").phrases).toEqual([phraseGate.word]);
    const writes = saved.setItem.mock.calls.length;
    expect(keepRunPhrases(score)).toBe(0);
    expect(saved.setItem).toHaveBeenCalledTimes(writes);
  });

  it.each(["playing", "unavailable"] as const)("lights the words from the %s clip and clears after the fade", (status) => {
    let now = 100, next: FrameRequestCallback | undefined;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => { next = fn; return 1; });
    vi.stubGlobal("cancelAnimationFrame", () => { next = undefined; });
    const clip = { status: status as FilePlayback["status"], currentTime: 0, stop: vi.fn() };
    const play = vi.spyOn(audio, "playFile").mockReturnValueOnce(clip)
      .mockReturnValue({ status: "loading", currentTime: 0, stop: vi.fn() });
    const step = (ms: number, at: number) => {
      now += ms;
      if (status === "playing") clip.currentTime = at;
      const frame = next;
      next = undefined;
      frame?.(now);
    };
    try {
      karaoke.road.show(phrase);
      expect(play).toHaveBeenCalledWith(phrase.fClip);
      karaoke.road.prompt(phrase.pClip);
      step(10, 0);
      step(320, 0.32);
      expect(karaoke.road.debug()).toEqual({ text: phrase.f, current: 0, lit: ["Could"], visible: true });
      step(520, 0.84);
      expect(karaoke.road.debug()).toMatchObject({ current: 2, lit: ["Could", "you", "spell"] });
      expect(play).toHaveBeenCalledTimes(1);
      if (status === "playing") clip.status = "ended";
      step(565, 1.405);
      expect(karaoke.road.debug()).toMatchObject({ current: -1, lit: phrase.words, visible: true });
      expect(play).toHaveBeenLastCalledWith(phrase.pClip);
      step(599, 1.405);
      expect(karaoke.road.debug().visible).toBe(true);
      step(1, 1.405);
      expect(karaoke.road.debug().visible).toBe(false);
      expect(next).toBeUndefined();
    } finally {
      karaoke.road.stop();
    }
  });
});
