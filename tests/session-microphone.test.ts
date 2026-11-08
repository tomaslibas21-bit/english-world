import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Session } from "../src/game/session";
import { audio } from "../src/game/audio";
import { DEFAULT_SETTINGS, EMPTY_CONV, migrateSettings, useStore } from "../src/state/store";
import { emptyProgress } from "../src/state/progress";
import * as speech from "../src/convo/speech";
import { audioDiagnosticsPaused } from "../src/convo/audioDiagnostics";

vi.mock("../src/game/audio", () => ({
  audio: { names: [], play: vi.fn().mockResolvedValue(true), prefetch: vi.fn().mockResolvedValue(undefined), stop: vi.fn(), sfx: vi.fn(), clipDuration: vi.fn() },
}));
vi.mock("../src/convo/speech", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/convo/speech")>(),
  speechSupported: vi.fn(() => true),
  createSpeechAttempt: vi.fn(),
}));
vi.mock("../src/convo/audioDiagnostics", () => ({ audioDiagnosticsPaused: vi.fn(() => false) }));

let session: Session;
let doc: EventTarget & { visibilityState: string };
const attempts: { options: speech.SpeechOptions; start: ReturnType<typeof vi.fn>; finish: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> }[] = [];
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  attempts.length = 0;
  doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
  vi.stubGlobal("document", doc);
  vi.mocked(speech.speechSupported).mockReturnValue(true);
  vi.mocked(audioDiagnosticsPaused).mockReturnValue(false);
  vi.mocked(audio.play).mockResolvedValue(true);
  vi.mocked(speech.createSpeechAttempt).mockImplementation(options => {
    let running = false;
    const attempt = {
      options,
      start: vi.fn(() => { running = true; options.onUpdate({ status: "listening", heard: "" }); }),
      finish: vi.fn(() => { running = false; }),
      stop: vi.fn(() => { running = false; }),
      dispose: vi.fn(() => { running = false; }),
      get running() { return running; },
    };
    attempts.push(attempt);
    return attempt;
  });
  useStore.setState({ settings: { ...DEFAULT_SETTINGS }, progress: emptyProgress(), conv: { ...EMPTY_CONV }, hud: { ...useStore.getState().hud, panel: null } });
  session = new Session("s35-gym", { npcTalk() {}, onEvent() {}, onEnd() {} });
});
afterEach(() => {
  session.close();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
async function opening() {
  const begin = session.begin();
  // The NPC line awaits audio plus a 160 ms sentence gap; stop before the 250 ms microphone timer.
  while (useStore.getState().conv.phase === "npc") await vi.advanceTimersByTimeAsync(160);
  await begin;
  expect(useStore.getState().conv.phase).toBe("you");
  expect(attempts).toHaveLength(0);
}
function hidden(value: boolean) {
  doc.visibilityState = value ? "hidden" : "visible";
  doc.dispatchEvent(new Event("visibilitychange"));
}

describe("automatic-only learner microphone", () => {
  it("starts only after NPC playback and the normal delay, including saved manual-only learners", async () => {
    useStore.setState({ settings: migrateSettings({ v: 4, autoListen: false }) });
    let complete!: (ok: boolean) => void;
    vi.mocked(audio.play).mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    const begin = session.begin();
    await vi.advanceTimersByTimeAsync(1000);
    expect(useStore.getState().conv.phase).toBe("npc");
    expect(attempts).toHaveLength(0);
    complete(true);
    while (useStore.getState().conv.phase === "npc") await vi.advanceTimersByTimeAsync(160);
    await begin;
    await vi.advanceTimersByTimeAsync(249);
    expect(attempts).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(attempts).toHaveLength(1);
    expect(attempts[0].start).toHaveBeenCalledOnce();
    expect(useStore.getState().conv.mic.status).toBe("listening");
    expect(audio.sfx).not.toHaveBeenCalledWith("listen");
  });

  it.each(["typing", "panel", "hidden", "hidden-before-event", "choices", "npc", "close", "diagnostic"])("does not start a queued mic after %s", async mode => {
    await opening();
    if (mode === "typing") useStore.getState().setConv({ typing: true });
    if (mode === "panel") useStore.getState().setHud({ panel: "settings" });
    if (mode === "hidden") hidden(true);
    if (mode === "hidden-before-event") doc.visibilityState = "hidden";
    if (mode === "choices") useStore.getState().setConv({ speechChoices: ["I can", "I can't"] });
    if (mode === "npc") useStore.getState().setConv({ phase: "npc" });
    if (mode === "close") session.close();
    if (mode === "diagnostic") vi.mocked(audioDiagnosticsPaused).mockReturnValue(true);
    await vi.advanceTimersByTimeAsync(1500);
    expect(attempts).toHaveLength(0);
    if (mode === "choices") expect(useStore.getState().conv.speechChoices).toEqual(["I can", "I can't"]);
  });

  it("rejects explicit retries behind a panel or in a hidden page", async () => {
    await opening();
    useStore.getState().setHud({ panel: "settings" });
    session.listen();
    useStore.getState().setHud({ panel: null });
    doc.visibilityState = "hidden";
    session.listen();
    expect(attempts).toHaveLength(0);
  });

  it.each(["typing", "panel", "hidden"])("releases active capture on %s and waits for a retry after return", async mode => {
    await opening();
    await vi.advanceTimersByTimeAsync(250);
    const first = attempts[0];
    if (mode === "typing") useStore.getState().setConv({ typing: true });
    if (mode === "panel") useStore.getState().setHud({ panel: "help" });
    if (mode === "hidden") hidden(true);
    expect(first.dispose).toHaveBeenCalledOnce();
    expect(useStore.getState().conv.mic.status).toBe("off");
    if (mode === "typing") useStore.getState().setConv({ typing: false });
    if (mode === "panel") useStore.getState().setHud({ panel: null });
    if (mode === "hidden") hidden(false);
    await vi.advanceTimersByTimeAsync(2000);
    expect(attempts).toHaveLength(1);
    session.listen();
    expect(attempts).toHaveLength(2);
    expect(useStore.getState().conv.mic.status).toBe("listening");
  });

  it("keeps the retry and finish buttons usable after permission denial, including a return from typing", async () => {
    await opening();
    await vi.advanceTimersByTimeAsync(250);
    attempts[0].options.onUpdate({ status: "denied", heard: "", error: "not-allowed" });
    await vi.advanceTimersByTimeAsync(5000);
    expect(attempts).toHaveLength(1); // no permission-prompt loop
    expect(useStore.getState().conv.mic.status).toBe("denied");
    useStore.getState().setConv({ typing: true, speechChoices: ["old choice"] });
    session.listen();
    expect(attempts).toHaveLength(2);
    expect(useStore.getState().conv.typing).toBe(false);
    expect(useStore.getState().conv.speechChoices).toBeUndefined();
    session.finishListening();
    expect(attempts[1].finish).toHaveBeenCalledOnce();
  });

  it("cancels active capture and ignores late callbacks after close", async () => {
    await opening();
    await vi.advanceTimersByTimeAsync(250);
    const first = attempts[0];
    session.close();
    expect(first.dispose).toHaveBeenCalledOnce();
    first.options.onCommit("Friday, please.", []);
    first.options.onUpdate({ status: "listening", heard: "late" });
    session.listen();
    hidden(true); hidden(false);
    await vi.advanceTimersByTimeAsync(2000);
    expect(attempts).toHaveLength(1);
    expect(useStore.getState().conv.phase).toBe("ended");
    expect(useStore.getState().conv.transcript.filter(l => l.who === "you")).toHaveLength(0);
  });

  it("keeps unsupported browsers in typing without opening capture", async () => {
    vi.mocked(speech.speechSupported).mockReturnValue(false);
    await opening();
    await vi.advanceTimersByTimeAsync(2000);
    session.listen();
    expect(attempts).toHaveLength(0);
    expect(useStore.getState().conv.typing).toBe(true);
    expect(useStore.getState().conv.mic.status).toBe("unsupported");
  });

  it("automatically retries a first unrecognized spoken answer after its existing delay", async () => {
    await opening();
    await vi.advanceTimersByTimeAsync(250);
    const answer = session.submit("zxqvpl zrqv", [], "voice");
    await vi.advanceTimersByTimeAsync(0);
    await answer;
    expect(useStore.getState().conv.phase).toBe("you");
    expect(useStore.getState().conv.misses).toBe(1);
    await vi.advanceTimersByTimeAsync(1399);
    expect(attempts).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(attempts).toHaveLength(2);
  });
});
