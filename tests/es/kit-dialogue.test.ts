import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SPEECH_TIMING, type SpeechOptions, type SpeechRecognizer } from "../../src/convo/speech";
import { compose, setVariety, type Variety } from "../../src/convo/compose";
import { foldAccents } from "../../src/convo/normalize";
import { TAXI_ACCEPT, TAXI_LINES } from "../../src/content/taxi-lines";
import { ModeDialogue } from "../../src/game/kit/dialogue";
import { learnerTurn } from "../../src/game/kit/lines";

const mocks = vi.hoisted(() => ({
  duration: vi.fn<() => number | null>(),
  play: vi.fn<() => Promise<boolean>>(),
  stop: vi.fn(),
  settings: { volume: 1 },
  recognition: null as SpeechRecognizer | null,
  speech: vi.fn<(options: SpeechOptions) => void>(),
}));
vi.mock("../../src/game/audio", () => ({
  audio: { clipDuration: mocks.duration, play: mocks.play, stop: mocks.stop, getState: () => "playing" },
}));
vi.mock("../../src/convo/speech", async (load) => {
  const speech = await load<typeof import("../../src/convo/speech")>();
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
vi.mock("../../src/state/store", () => ({
  useStore: { getState: () => ({ progress: { profile: { gender: "f" } }, settings: mocks.settings }) },
}));

const [situation, npc] = ["s66-taxi", "vinnie"];
const text = (key: string) => compose(TAXI_LINES[key][0], {}, { look: () => undefined }).en;
function setup() {
  const ui = { say: vi.fn(), choices: vi.fn(), mic: vi.fn() };
  return { dialogue: new ModeDialogue(ui), ui };
}

async function speak(...transcripts: string[]) {
  await vi.advanceTimersByTimeAsync(1); // Let a previous recogniser deliver its asynchronous end.
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
  mocks.play.mockReset().mockResolvedValue(true);
  mocks.settings.volume = 1;
  mocks.recognition = null;
  vi.stubGlobal("document", Object.assign(new EventTarget(), { hidden: false }));
});
afterEach(async () => {
  setVariety("default");
  await vi.advanceTimersByTimeAsync(1);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("mini-game dialogue", () => {
  it("opens the learner's turn on stepped time when an authored greeting is muted", async () => {
    mocks.settings.volume = 0;
    // The browser voice can remain playing until a real-time event, even at zero volume.
    mocks.play.mockImplementation(() => new Promise(() => {}));
    const { dialogue, ui } = setup();
    const opening = dialogue.say(situation, npc, "tx_hello", TAXI_LINES)
      .then(() => dialogue.expect(situation, npc, ["tx_a_where"], TAXI_LINES, TAXI_ACCEPT));
    dialogue.update(4, false);
    await vi.advanceTimersByTimeAsync(0);
    expect(ui.choices).toHaveBeenCalledWith([expect.objectContaining({ key: "tx_a_where" })]);
    expect(mocks.play).not.toHaveBeenCalled();
    dialogue.cancel();
    expect(await opening).toBeNull();
  });

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
    await speak(chip);
    await vi.advanceTimersByTimeAsync(SPEECH_TIMING.finishedAnswer - 1);
    expect(completed).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(completed).toHaveBeenCalledWith(expect.objectContaining({ key: "tx_a_where" }));
    expect(mocks.play).toHaveBeenCalledOnce();
  });

  it.each<Variety>(["default", "neutral", "spain"])("accepts each learner line and all alternatives in %s Spanish", async (variety) => {
    setVariety(variety);
    const { dialogue } = setup();
    for (const [key, variants] of Object.entries(TAXI_ACCEPT)) {
      const row = TAXI_LINES[key][0];
      const source = variety === "spain" ? row.spain ?? row.neutral ?? row : variety === "neutral" ? row.neutral ?? row : row;
      const expected = source.en.replace(/\s*\|\s*/g, " ");
      const plain = (phrase: string) => foldAccents(phrase).toLowerCase().replace(/[¿¡?!.,]/g, "");
      const transcripts = new Set([expected, plain(expected), ...variants]);
      for (const phrase of transcripts) {
        const turn = dialogue.expect(situation, npc, [key], TAXI_LINES, TAXI_ACCEPT);
        expect(mocks.speech.mock.lastCall?.[0].phrases).toEqual([...new Set([expected, ...variants])]);
        await speak(phrase);
        await vi.advanceTimersByTimeAsync(SPEECH_TIMING.openAnswer);
        expect(await turn).toMatchObject({ key, sentence: { en: expected } });
      }
    }
  });

  it("folds accent differences in mini-game matches, including accents the grammar normally preserves", () => {
    const option = { key: "arrival", sentence: { en: "¡Llegó!" } };
    const turn = learnerTurn([option], {});
    expect(turn.read("llego")).toEqual({ answer: option, verdict: "complete" });
    expect(turn.read("llegas").verdict).toBe("none");
  });

  it("ranks a matching speech alternative and rejects a different amount", async () => {
    const { dialogue, ui } = setup();
    const turn = dialogue.expect(situation, npc, ["tx_r1_a_fare", "tx_r2_a_fare"], TAXI_LINES,
      { tx_r1_a_fare: ["ciento veinte pesos", "$120"], tx_r2_a_fare: ["cien pesos", "$100"] });
    const evaluate = mocks.speech.mock.lastCall![0].evaluate;
    expect(evaluate("ciento")).toBe("prefix");
    expect(evaluate("$135")).toBe("none");
    await speak("$135");
    await vi.advanceTimersByTimeAsync(SPEECH_TIMING.unclear);
    expect(ui.mic).toHaveBeenLastCalledWith({ status: "unclear", heard: "$135" });
    dialogue.update(1.3, false);
    await speak("$135", "$100");
    await vi.advanceTimersByTimeAsync(SPEECH_TIMING.openAnswer);
    expect(await turn).toMatchObject({ key: "tx_r2_a_fare" });
  });

  it("keeps an active mic and waits for its end when toggled off and on", async () => {
    const { dialogue } = setup();
    const turn = dialogue.expect(situation, npc, ["tx_a_where"], TAXI_LINES, TAXI_ACCEPT);
    const first = mocks.recognition;
    expect(first).toBeTruthy();
    dialogue.setMic(true);
    expect(mocks.recognition).toBe(first);

    dialogue.setMic(false);
    dialogue.setMic(true);
    expect(mocks.recognition).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    const second = mocks.recognition!;
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);

    const abort = vi.spyOn(second, "abort");
    second.onend?.();
    dialogue.cancel();
    expect(abort).not.toHaveBeenCalled();
    expect(await turn).toBeNull();
  });

  it("uses stepped time for muted lines, accepts keys and taps, and cancels a pending turn", async () => {
    mocks.settings.volume = 0;
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
