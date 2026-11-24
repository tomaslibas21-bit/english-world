import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GOFISH_WORDS } from "../src/content/gofish";
import type { SpeechOptions } from "../src/convo/speech";
import { parseCall, sayItCall } from "../src/game/billiards/calls";
import { sayItCard } from "../src/game/gofish/sayIt";
import { sayItWords } from "../src/game/kit/sayIt";
import { gateSayItTarget, RunScore } from "../src/game/road/run";
import type { Prompt } from "../src/game/road/words";
import { SayIt } from "../src/ui/kit/SayIt";

const attempts = vi.hoisted(() => [] as { options: SpeechOptions; dispose: ReturnType<typeof vi.fn> }[]);
vi.mock("../src/convo/speech", async (original) => ({
  ...await original<typeof import("../src/convo/speech")>(),
  speechSupported: () => true,
  createSpeechAttempt(options: SpeechOptions) {
    const dispose = vi.fn();
    attempts.push({ options, dispose });
    return { start: vi.fn(), dispose };
  },
}));

const word = { en: "café", lt: "kavinė", situation: "cafe", clip: { say: "café", voice: "guide", speed: 1, male: false } };
const sentence = { en: "", nat: "", say: "", units: [] };

afterEach(() => {
  vi.useRealTimers();
  attempts.length = 0;
});

describe("say it targets", () => {
  it("matches what the road and sea played, including accent folding and conversation soundalikes", () => {
    const prompt: Prompt = { word, options: ["kavinė", "stotis", "namai"], right: 0 };
    const listen = gateSayItTarget(prompt);
    expect(listen.evaluate("It's a cafe")).toBe("complete");
    expect(listen.evaluate("kavinė")).toBe("none");
    expect(sayItWords(["cappuccino"]).evaluate("cap a cheeno")).toBe("complete");
    expect(sayItWords(["at"]).evaluate("add")).toBe("none");
    expect(sayItWords(["not"]).evaluate("not")).toBe("complete");
  });

  it("matches the missing English word in a gap and rejects the other options", () => {
    const missing = { ...word, en: "go", gapEn: "go" };
    const target = gateSayItTarget({ word: missing, options: ["no", "… go", "so"], right: 1,
      gap: { word: missing, sentence, full: sentence, clip: word.clip } });
    expect(target.evaluate("go")).toBe("complete");
    expect(target.evaluate("no")).toBe("none");
    expect(target.evaluate("let's go")).toBe("none");
  });

  it("accepts a card name, with an article, a lead-in or its authored plural", () => {
    const apple = sayItCard(GOFISH_WORDS.apple);
    for (const answer of ["apple", "an apple", "It's an apple", "apples"]) expect(apple.evaluate(answer)).toBe("complete");
    for (const answer of ["banana", "not an apple", "banana or apple"]) expect(apple.evaluate(answer)).toBe("none");
  });

  it("matches the ball and pocket while keeping the learner's own precise calls", () => {
    const seven = sayItCall({ ball: 7, pocket: "fl" }, "Seven ball. Far left corner pocket.");
    for (const answer of ["seven ball corner pocket", "7 into the top left corner", "The seven ball to the left far corner pocket"]) {
      expect(seven.evaluate(answer)).toBe("complete");
    }
    for (const answer of ["seven ball side pocket", "seven ball near left corner", "eight ball far left corner"]) {
      expect(seven.evaluate(answer)).toBe("none");
    }
    expect(seven.evaluate("seven ball")).toBe("prefix");
    expect(parseCall("seven ball corner pocket")).toBeNull();
    expect(parseCall("7 into the top left corner")).toEqual({ ball: 7, pocket: "fl" });
  });
});

it.each([
  ["denied", "Leisk naudoti mikrofoną"],
  ["nothing", "Nieko negirdėjau"],
  ["error", "Klausymas nepavyko"],
] as const)("shows the existing microphone feedback for %s and allows another try", (status, message) => {
  vi.useFakeTimers();
  const score = new RunScore();
  const cue = score.sayIt.open(sayItWords(["apple"]));
  const render = () => renderToStaticMarkup(createElement(SayIt, { game: "road", cue }));

  cue.toggle();
  attempts[0].options.onUpdate({ status, heard: "" });
  expect(cue.getSnapshot()).toBe(status);
  expect(render()).toContain(message);
  expect(render()).not.toContain("Beveik! Galite bandyti dar");
  expect(score.points).toBe(0);
  expect(attempts[0].dispose).toHaveBeenCalledOnce();

  cue.toggle();
  attempts[1].options.onCommit("banana", []);
  expect(render()).toContain("Beveik! Galite bandyti dar");
  score.sayIt.close();
});

it("adds one point per cue, leaves misses free and discards attempts from a replaced cue", () => {
  vi.useFakeTimers();
  const score = new RunScore();
  const target = sayItWords(["apple"]);
  const cue = score.sayIt.open(target);
  cue.toggle();
  attempts[0].options.onCommit("banana", []);
  expect(cue.getSnapshot()).toBe("miss");
  expect(score.points).toBe(0);
  cue.toggle();
  attempts[1].options.onCommit("an apple", []);
  attempts[1].options.onCommit("apple", []);
  cue.toggle();
  expect(cue.getSnapshot()).toBe("hit");
  expect(score.sayIt.count).toBe(1);
  expect(score.points).toBe(1);
  expect(attempts).toHaveLength(2);
  vi.advanceTimersByTime(2000);
  expect(cue.getSnapshot()).toBe("credited");
  expect(cue.awarded).toBe(true);
  cue.toggle();
  expect(attempts).toHaveLength(2);

  const stale = score.sayIt.open(target);
  stale.toggle();
  const next = score.sayIt.open(target);
  expect(next.getSnapshot()).toBe("idle");
  expect(attempts[2].dispose).toHaveBeenCalledOnce();
  attempts[2].options.onCommit("apple", []);
  expect(score.points).toBe(1);
  next.toggle();
  attempts[3].options.onCommit("an apple", []);
  expect(score.points).toBe(2);
  expect(score.total).toBe(0);
  score.sayIt.close();
});
