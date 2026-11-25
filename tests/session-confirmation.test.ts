import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Session } from "../src/game/session";
import { loadSituation } from "../src/content/situations/catalog";
import { audio } from "../src/game/audio";
import { DEFAULT_SETTINGS, useStore } from "../src/state/store";
import { emptyProgress } from "../src/state/progress";
import * as speech from "../src/convo/speech";

vi.mock("../src/game/audio", () => ({
  audio: { names: [], play: vi.fn().mockResolvedValue(true), prefetch: vi.fn().mockResolvedValue(undefined), stop: vi.fn(), sfx: vi.fn(), clipDuration: vi.fn() },
}));
vi.mock("../src/convo/speech", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/convo/speech")>(),
  speechSupported: () => true,
}));

let session: Session;
// (a conversation's file is loaded before its session starts: src/content/situations/catalog.ts)
beforeAll(async () => { for (const id of ["s35-gym", "s72-cafe"]) await loadSituation(id); });
beforeEach(async () => {
  vi.useFakeTimers();
  vi.stubGlobal("document", Object.assign(new EventTarget(), { visibilityState: "visible" }));
  vi.mocked(audio.play).mockResolvedValue(true);
  vi.spyOn(speech, "createSpeechAttempt").mockImplementation(options => ({
    start: () => options.onUpdate({ status: "listening", heard: "" }),
    stop() {}, finish() {}, dispose() {}, running: true,
  }));
  useStore.setState({ settings: { ...DEFAULT_SETTINGS }, progress: emptyProgress() });
  session = new Session("s35-gym", { npcTalk() {}, onEvent() {}, onEnd() {} });
  const begin = session.begin();
  useStore.getState().setConv({ introOpen: false });
  await vi.runAllTimersAsync();
  await begin;
  session.stopListening();
});
afterEach(() => {
  session.close();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const choices = ["I can tomorrow", "I can't tomorrow"];
const answers = () => useStore.getState().conv.transcript.filter(l => l.who === "you");
async function offerChoices() { await session.submit(choices[0], [choices[1]], "voice"); }
async function finishSubmit(promise: Promise<void>) { await vi.runAllTimersAsync(); await promise; }

describe("speech confirmations belong to the learner's current turn", () => {
  it("ignores callbacks from a replaced recognizer and consumes a voice attempt only once", async () => {
    const attempts: speech.SpeechOptions[] = [];
    vi.spyOn(speech, "createSpeechAttempt").mockImplementation(options => {
      attempts.push(options);
      return {
        start: () => options.onUpdate({ status: "listening", heard: "" }),
        stop() {}, finish() {}, dispose() {}, running: true,
      };
    });
    session.listen();
    session.listen();
    attempts[0].onUpdate({ status: "nothing", heard: "" });
    attempts[0].onCommit("Friday, please.", []);
    expect(useStore.getState().conv.mic.status).toBe("listening");
    expect(answers()).toHaveLength(0);
    attempts[1].onCommit("Friday, please.", []);
    await vi.runAllTimersAsync();
    expect(answers()).toHaveLength(1);
    expect(useStore.getState().conv.phase).toBe("you");
    expect(attempts).toHaveLength(3); // the next learner turn starts its own microphone
    const currentMic = useStore.getState().conv.mic;
    expect(currentMic.status).toBe("listening");
    attempts[1].onCommit("Friday, please.", []);
    attempts[1].onUpdate({ status: "nothing", heard: "" });
    expect(answers()).toHaveLength(1);
    expect(useStore.getState().conv.mic).toEqual(currentMic);
  });

  it("keeps an affirmative answer affirmative when the learner chooses it", async () => {
    await offerChoices();
    await finishSubmit(session.submit(choices[0], [], "voice", true));
    expect(answers()).toHaveLength(1);
    expect(answers()[0]).toMatchObject({ text: choices[0], heard: choices[0], via: "voice" });
  });

  it("uses the selected negative reading exactly once and keeps what the recognizer heard", async () => {
    await offerChoices();
    expect(answers()).toHaveLength(0);
    await finishSubmit(session.submit(choices[1], [], "voice", true));
    expect(answers()).toHaveLength(1);
    expect(answers()[0]).toMatchObject({ text: choices[1], heard: choices[0], via: "voice" });
    expect(useStore.getState().conv.speechChoices).toBeUndefined();
    await session.submit(choices[1], [], "voice", true);
    expect(answers()).toHaveLength(1);
  });

  it("rejects an invalid confirmation without consuming the pending choices", async () => {
    await offerChoices();
    await session.submit("Friday, please.", [], "voice", true);
    await session.submit(choices[0], [], "typed", true);
    expect(answers()).toHaveLength(0);
    expect(useStore.getState().conv.speechChoices).toEqual(choices);
  });

  it("allows a typed correction, then rejects the now-stale voice confirmation", async () => {
    await offerChoices();
    await finishSubmit(session.submit("Friday, please."));
    expect(answers()[0]).toMatchObject({ text: "Friday, please.", via: "typed" });
    await session.submit(choices[0], [], "voice", true);
    expect(answers()).toHaveLength(1);
    expect(useStore.getState().conv.speechChoices).toBeUndefined();
  });

  it("rejects typed and confirmed answers during replay and preserves choices for afterward", async () => {
    await offerChoices();
    let finishAudio!: () => void;
    vi.mocked(audio.play).mockImplementationOnce(() => new Promise<boolean>(resolve => { finishAudio = () => resolve(true); }));
    session.repeatLast(false);
    expect(useStore.getState().conv.phase).toBe("npc");
    await session.submit(choices[1], [], "voice", true);
    await session.submit("Friday, please.");
    expect(answers()).toHaveLength(0);
    expect(useStore.getState().conv.speechChoices).toEqual(choices);
    finishAudio();
    await vi.runAllTimersAsync();
    expect(useStore.getState().conv.phase).toBe("you");
    await finishSubmit(session.submit(choices[1], [], "voice", true));
    expect(answers()).toHaveLength(1);
  });

  it("keeps a confirmation across replay instead of auto-listening over it", async () => {
    await offerChoices();
    const listen = vi.spyOn(session, "listen").mockImplementation(() => {});
    session.repeatLast(false);
    await vi.runAllTimersAsync();
    expect(useStore.getState().conv.phase).toBe("you");
    expect(useStore.getState().conv.speechChoices).toEqual(choices);
    expect(listen).not.toHaveBeenCalled();
    listen.mockRestore();
  });
});

it("records the display outcome of each resolved answer through a café sound check", async () => {
  session.close();
  session = new Session("s72-cafe", { npcTalk() {}, onEvent() {}, onEnd() {} });
  const begin = session.begin();
  useStore.getState().setConv({ introOpen: false, typing: true });
  await finishSubmit(begin);

  await finishSubmit(session.submit("zxqvpl zrqv"));
  expect(answers().at(-1)).toMatchObject({ understood: false, answerDisplay: "retry" });

  await finishSubmit(session.submit("Lata please", [], "voice"));
  expect(answers().at(-1)).toMatchObject({ understood: true, answerDisplay: "clarify" });
  expect(useStore.getState().conv.transcript.at(-1)?.sentence?.en).toMatch(/latte\?/i);

  await finishSubmit(session.submit("No."));
  expect(answers().at(-1)).toMatchObject({ understood: true, answerDisplay: "retry" });

  const match = session.submit("A latte, please.", [], "picked");
  expect(useStore.getState().conv.transcript.at(-1)?.who).toBe("npc");
  expect(answers().at(-1)).toMatchObject({ understood: true, answerDisplay: "matched", via: "picked" });
  await finishSubmit(match);
});

it("ticks Tina's name checklist immediately and opens the group turn after interrupted voice", async () => {
  session.close();
  await loadSituation("x01-pool-hall");
  session = new Session("x01-pool-hall", { npcTalk() {}, onEvent() {}, onEnd() {} });
  const begin = session.begin();
  useStore.getState().setConv({ introOpen: false, typing: true });
  await begin;
  await session.submit("A little.");

  let interrupt!: (played: boolean) => void;
  vi.mocked(audio.play).mockImplementationOnce(() => new Promise((resolve) => { interrupt = resolve; }));
  const name = session.submit("I'm Ana.");
  expect(useStore.getState().conv.phase).toBe("npc");
  expect(useStore.getState().conv.checklist.find((item) => item.id === "name")?.done).toBe(true);
  interrupt(false);
  await name;

  expect(useStore.getState().conv).toMatchObject({ phase: "you", stepId: "group", speaking: null });
  expect(useStore.getState().conv.transcript.at(-1)?.sentence?.en).toBe("Solids or stripes?");
});
