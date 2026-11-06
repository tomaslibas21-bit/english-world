import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Session } from "../src/game/session";
import { audio } from "../src/game/audio";
import { DEFAULT_SETTINGS, useStore } from "../src/state/store";
import { emptyProgress } from "../src/state/progress";

vi.mock("../src/game/audio", () => ({
  audio: { names: [], play: vi.fn().mockResolvedValue(undefined), prefetch: vi.fn().mockResolvedValue(undefined), stop: vi.fn(), sfx: vi.fn(), clipDuration: vi.fn() },
}));
vi.mock("../src/convo/speech", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/convo/speech")>(),
  speechSupported: () => true,
}));

let session: Session;
beforeEach(async () => {
  vi.useFakeTimers();
  vi.stubGlobal("document", { visibilityState: "visible" });
  vi.mocked(audio.play).mockResolvedValue(undefined);
  useStore.setState({ settings: { ...DEFAULT_SETTINGS, autoListen: false }, progress: emptyProgress() });
  session = new Session("s35-gym", { npcTalk() {}, onEvent() {}, onEnd() {} });
  const begin = session.begin();
  await vi.runAllTimersAsync();
  await begin;
});
afterEach(() => {
  session.close();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const choices = ["I can tomorrow", "I can't tomorrow"];
const answers = () => useStore.getState().conv.transcript.filter(l => l.who === "you");
async function offerChoices() { await session.submit(choices[0], [choices[1]], "voice"); }
async function finishSubmit(promise: Promise<void>) { await vi.runAllTimersAsync(); await promise; }

describe("speech confirmations belong to the learner's current turn", () => {
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
    vi.mocked(audio.play).mockImplementationOnce(() => new Promise<void>(resolve => { finishAudio = resolve; }));
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
    useStore.setState(s => ({ settings: { ...s.settings, autoListen: true } }));
    const listen = vi.spyOn(session, "listen").mockImplementation(() => {});
    session.repeatLast(false);
    await vi.runAllTimersAsync();
    expect(useStore.getState().conv.phase).toBe("you");
    expect(useStore.getState().conv.speechChoices).toEqual(choices);
    expect(listen).not.toHaveBeenCalled();
    listen.mockRestore();
  });
});
