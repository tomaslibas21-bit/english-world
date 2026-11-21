import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SPEECH_TIMING, type SpeechOptions, type SpeechRecognizer } from "../src/convo/speech";
import { compose } from "../src/convo/compose";
import { TAXI_ACCEPT, TAXI_LINES } from "../src/content/taxi-lines";
import { ModeDialogue } from "../src/game/kit/dialogue";

const mocks = vi.hoisted(() => ({
  duration: vi.fn<() => number | null>(),
  play: vi.fn<() => Promise<boolean>>(),
  stop: vi.fn(),
  recognition: null as SpeechRecognizer | null,
  speech: vi.fn<(options: SpeechOptions) => void>(),
}));
vi.mock("../src/game/audio", () => ({
  audio: { clipDuration: mocks.duration, play: mocks.play, stop: mocks.stop, getState: () => "playing" },
}));
vi.mock("../src/convo/speech", async (load) => {
  const speech = await load<typeof import("../src/convo/speech")>();
  return { ...speech, speechSupported: () => true, createSpeechAttempt: (options: SpeechOptions) => {
    mocks.speech(options);
    return speech.createSpeechAttempt({ ...options, createRecognition: () => {
      const rec = {
        start() { mocks.recognition = rec; },
        abort() { if (mocks.recognition === rec) mocks.recognition = null; setTimeout(() => rec.onend?.(), 0); },
      } as SpeechRecognizer;
      return rec;
    } });
  } };
});
vi.mock("../src/state/store", () => ({
  useStore: { getState: () => ({ progress: { profile: { gender: "f" } }, settings: {} }) },
}));

const [situation, npc] = ["s66-taxi", "vinnie"];
const text = (key: string) => compose(TAXI_LINES[key][0], {}, { look: () => undefined }).en;
function setup() {
  const ui = { say: vi.fn(), choices: vi.fn(), mic: vi.fn() };
  return { dialogue: new ModeDialogue(ui), ui };
}

function speak(...transcripts: string[]) {
  const recognition = mocks.recognition!;
  recognition.onstart?.();
  recognition.onspeechstart?.();
  recognition.onresult?.({ resultIndex: 0, results: [Object.assign(transcripts.map((transcript) => ({ transcript })), { isFinal: true })] });
  recognition.onspeechend?.();
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  mocks.duration.mockReturnValue(null);
  mocks.recognition = null;
  vi.stubGlobal("document", Object.assign(new EventTarget(), { hidden: false }));
});
afterEach(async () => {
  await vi.advanceTimersByTimeAsync(0);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("mini-game dialogue", () => {
  it("shows the conversation line and waits for the actual recording before opening speech", async () => {
    let finish!: (ok: boolean) => void;
    mocks.duration.mockReturnValue(1);
    mocks.play.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const { dialogue, ui } = setup();
    const cue = dialogue.say(situation, npc, "tx_hello", TAXI_LINES);
    expect(ui.say).toHaveBeenCalledWith(expect.objectContaining({ key: "tx_hello" }));
    expect(await dialogue.expect(situation, npc, ["tx_a_where"], TAXI_LINES)).toBeNull();
    expect(mocks.speech).not.toHaveBeenCalled();
    dialogue.update(10, false);
    expect(mocks.stop).not.toHaveBeenCalled();
    finish(true);
    expect((await cue)?.sentence.en).toBe(text("tx_hello"));

    const turn = dialogue.expect(situation, npc, ["tx_a_where"], TAXI_LINES, TAXI_ACCEPT);
    const completed = vi.fn();
    void turn.then(completed);
    const chip = text("tx_a_where");
    expect(mocks.speech.mock.calls[0][0].evaluate(chip)).toBe("complete");
    speak(chip);
    await vi.advanceTimersByTimeAsync(SPEECH_TIMING.finishedAnswer - 1);
    expect(completed).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(completed).toHaveBeenCalledWith(expect.objectContaining({ key: "tx_a_where" }));
    expect(mocks.play).toHaveBeenCalledOnce();
  });

  it("accepts every authored learner line and its variants, including recognized numeric fares", async () => {
    const { dialogue } = setup();
    for (const [key, variants] of Object.entries(TAXI_ACCEPT)) {
      for (const phrase of [text(key), ...variants]) {
        const turn = dialogue.expect(situation, npc, [key], TAXI_LINES, TAXI_ACCEPT);
        expect(mocks.speech.mock.lastCall?.[0].phrases).toContain(phrase);
        speak(phrase);
        await vi.advanceTimersByTimeAsync(SPEECH_TIMING.openAnswer);
        expect(await turn).toMatchObject({ key, sentence: { en: text(key) } });
      }
    }
  });

  it("ranks a matching speech alternative and rejects a different amount", async () => {
    const { dialogue, ui } = setup();
    const turn = dialogue.expect(situation, npc, ["tx_r1_a_fare", "tx_r2_a_fare"], TAXI_LINES, TAXI_ACCEPT);
    const evaluate = mocks.speech.mock.lastCall![0].evaluate;
    expect(evaluate("That's")).toBe("prefix");
    expect(evaluate("That's $25.50")).toBe("none");
    speak("That's $25.50");
    await vi.advanceTimersByTimeAsync(SPEECH_TIMING.unclear);
    expect(ui.mic).toHaveBeenLastCalledWith({ status: "unclear", heard: "That's $25.50" });
    dialogue.update(1.3, false);
    speak("That's $25.50", "$21");
    await vi.advanceTimersByTimeAsync(SPEECH_TIMING.openAnswer);
    expect(await turn).toMatchObject({ key: "tx_r2_a_fare" });
  });

  it("uses stepped time for silent lines, accepts keys and taps, and cancels a pending turn", async () => {
    const { dialogue } = setup();
    const cue = dialogue.say(situation, npc, "tx_hello", TAXI_LINES);
    dialogue.update(4, false);
    expect((await cue)?.key).toBe("tx_hello");
    expect(mocks.play).not.toHaveBeenCalled();

    const keyboard = dialogue.expect(situation, npc, ["tx_a_where"], TAXI_LINES);
    expect(dialogue.key("1")).toBe(true);
    dialogue.update(0.5, false);
    expect((await keyboard)?.key).toBe("tx_a_where");

    const tap = dialogue.expect(situation, npc, ["tx_a_where", "tx_a_here"], TAXI_LINES);
    dialogue.choose("tx_a_here");
    dialogue.choose("tx_a_where");
    dialogue.update(0.5, false);
    expect((await tap)?.key).toBe("tx_a_here");

    const pending = dialogue.expect(situation, npc, ["tx_a_bye"], TAXI_LINES);
    dialogue.cancel();
    expect(await pending).toBeNull();
  });
});
