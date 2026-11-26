import { describe, expect, it, vi } from "vitest";
import { TalkPlayer, talkFingerprint, type TalkClock, type TalkItem, type TalkOutput, type TalkTrack } from "../src/radio/talkPlayer";
import { TalkProgress, type TalkMode, type TalkSelection } from "../src/radio/talkProgress";

const first = { itemKey: "book/BOOK-CANT/author", chapterId: "BOOK-CANT-01", nextChapterId: "BOOK-CANT-02" } as const;
const second = { itemKey: first.itemKey, chapterId: "BOOK-CANT-02" } as const;
const story = { itemKey: "story/TOM-001/standard", chapterId: "TOM-001" } as const;
const line = (selection: TalkSelection, n: number) => `${selection.chapterId}-S00${n}`;
type Start = Parameters<TalkOutput["start"]>[0];

function item(selection: TalkSelection): TalkItem {
  const timings = { paired: [0, 3, 8, 11, 16, 19], target: [0, 5, 10], helper: [0, 3, 6] };
  const track = (mode: TalkMode): TalkTrack => ({
    mode, duration: timings[mode].at(-1)! + 4, audioVersion: talkFingerprint(mode),
    recording: () => "/fixture.mp3",
    cues: timings[mode].map((start, i) => {
      const sentenceId = line(selection, Math.floor(i / (mode === "paired" ? 2 : 1)) + 1);
      const language = mode === "helper" || (mode === "paired" && i % 2 === 0) ? "lt" : "en";
      return { sentenceId, language, start, end: start + 2.5, text: sentenceId, textHash: talkFingerprint(sentenceId) };
    }),
  });
  return { selection: selection.chapterId === first.chapterId ? first : selection,
    tracks: { paired: track("paired"), target: track("target"), helper: track("helper") } };
}

function mockClock() {
  let now = 1000;
  const timers = new Map<() => void, number>();
  const clock: TalkClock = {
    now: () => now,
    setTimeout: (callback, delay) => {
      timers.set(callback, now + delay);
      return () => { timers.delete(callback); };
    },
  };
  const advance = (ms: number, runTimers = true) => {
    now += ms;
    if (!runTimers) return;
    for (const [callback, time] of [...timers].sort((a, b) => a[1] - b[1])) {
      if (now >= time && timers.delete(callback)) callback();
    }
  };
  return { clock, advance };
}

function setup() {
  const { clock, advance } = mockClock();
  const saved = new Map<string, string>();
  const storage = { getItem: (key: string) => saved.get(key) ?? null, setItem: vi.fn((key: string, value: string) => { saved.set(key, value); }) };
  const events = new EventTarget();
  let position: number | null = null;
  const output = {
    start: vi.fn(async (request: Start) => { position = request.position; }),
    position: () => position,
    setRates: vi.fn(),
    stop: vi.fn<TalkOutput["stop"]>(() => { position = null; }),
  };
  const at = (time: number) => {
    position = time;
    output.start.mock.lastCall?.[0].onTime();
  };
  const request = () => output.start.mock.lastCall![0];
  const progress = new TalkProgress("em-lt", { storage, events, now: clock.now });
  const load = vi.fn(async (selection: TalkSelection, _signal: AbortSignal) => item(selection));
  const player = new TalkPlayer({ clock, output, progress, load });
  return { at, advance, player, output, request, clock, load, progress, storage, events };
}

describe("shared talk player", () => {
  it("keeps two views at the same paused helper offset and restores it after reopening", async () => {
    const { player, at, request, output, load, storage, clock } = setup();
    const viewA = vi.fn(player.getSnapshot);
    const viewB = vi.fn(player.getSnapshot);
    const closeA = player.subscribe(viewA);
    player.subscribe(viewB);
    await player.select(first, true);
    at(8.8);
    player.pause();
    expect(viewA.mock.results.at(-1)?.value).toBe(viewB.mock.results.at(-1)?.value);
    closeA();
    expect(player.getSnapshot()).toMatchObject({ status: "paused", position: 8.8, cue: { language: "lt" } });
    const reopened = new TalkPlayer({ clock, output, load, progress: new TalkProgress("em-lt", { storage }) });
    await reopened.select(first);
    expect(reopened.getSnapshot()).toMatchObject({ position: 8.8, playIntent: false, status: "paused" });
    reopened.play();
    expect(request().position).toBe(8.8);
  });

  it("switches mode on the same sentence while paused and stores mode and place together", async () => {
    const { player, at, output, progress, storage, request } = setup();
    await player.select(first, true);
    at(11.3);
    player.pause();
    storage.setItem.mockClear();
    player.changeMode("target");
    expect(output.start).toHaveBeenCalledTimes(1);
    expect(player.getSnapshot()).toMatchObject({ status: "paused", position: 5, cue: { language: "en", sentenceId: line(first, 2) } });
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(progress.getSnapshot().prefs.mode).toBe("target");
    expect(progress.get(first)).toMatchObject({ sentence: line(first, 2), offsetSec: 0, leg: "en" });
    player.play();
    expect(request()).toMatchObject({ position: 5, track: { mode: "target" } });
    player.changeMode("paired");
    expect(request()).toMatchObject({ position: 8, track: { mode: "paired" } });
  });

  it("restores the first leg on revised audio and matches a renamed sentence by its text hash", async () => {
    const { player, load, progress } = setup();
    progress.checkpoint(first, {
      sentence: "renamed-id", textHash: talkFingerprint(line(first, 2)), leg: "en", offsetSec: 1,
      fraction: 0.43, complete: false, audioVersion: "b123",
    });
    await player.select(first);
    expect(player.getSnapshot()).toMatchObject({ position: 8, cue: { language: "lt", sentenceId: line(first, 2) } });
    player.clear();
    load.mockResolvedValueOnce(item(first));
    progress.checkpoint(first, {
      sentence: "old-id", textHash: "aa", leg: "en", offsetSec: 99,
      fraction: 0.8, complete: false, audioVersion: "b123",
    });
    await player.select(first);
    expect(player.getSnapshot().position).toBe(16);
  });

  it("sets independent rates without opening another source or changing audible position", async () => {
    const { player, at, request, output } = setup();
    await player.select(first, true);
    expect(request().rates).toEqual({ en: 1, lt: 1 });
    at(3.6);
    player.setRate("en", 0.9);
    player.setRate("lt", 1.75);
    expect(output.setRates).toHaveBeenLastCalledWith({ en: 1.2, lt: 1.75 });
    expect(output.start).toHaveBeenCalledTimes(1);
    expect(player.getSnapshot().position).toBe(3.6);
    player.changeMode("helper");
    expect(request().rates.lt).toBe(1.75);
  });

  it("keeps nested holds separate, cancels pending sound, then resumes only with play intent", async () => {
    const { player, output, at, advance, request } = setup();
    await player.select(first, true);
    at(1.25);
    const before = request();
    player.hold("conversation");
    player.hold("microphone");
    expect(output.stop).toHaveBeenLastCalledWith("capture");
    expect(player.getSnapshot()).toMatchObject({ held: true, playIntent: true, status: "held", position: 1.25 });
    expect(before.signal.aborted).toBe(true);
    player.release("microphone");
    advance(1000);
    expect(output.start).toHaveBeenCalledTimes(1);
    player.release("conversation");
    advance(699);
    expect(output.start).toHaveBeenCalledTimes(1);
    advance(1);
    expect(request().position).toBe(1.25);
    player.hold("microphone");
    expect(output.stop).toHaveBeenLastCalledWith("capture");
    player.pause();
    expect(player.getSnapshot()).toMatchObject({ held: true, status: "paused", playIntent: false });
    player.release("microphone");
    advance(700);
    expect(output.start).toHaveBeenCalledTimes(2);
  });

  it("invalidates stale text loads and output callbacks after a station change", async () => {
    const { player, load, output, request } = setup();
    let resolve!: (value: TalkItem) => void;
    load.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const pending = player.select(first, true);
    const loadSignal = load.mock.calls[0][1];
    player.clear();
    await player.select(story, true);
    resolve(item(first));
    await pending;
    expect(loadSignal.aborted).toBe(true);
    expect(player.getSnapshot().selection).toEqual(story);
    const old = request();
    player.clear();
    old.onEnded();
    old.onError("missing");
    expect(output.start).toHaveBeenCalledTimes(1);
    expect(player.getSnapshot().status).toBe("idle");
  });

  it("does not let a deferred start play or advance after seek or pause", async () => {
    const { player, output, request, progress } = setup();
    let finish!: () => void;
    output.start.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    await player.select(first, true);
    const stale = request();
    player.seekSentence(line(first, 2));
    expect(stale.signal.aborted).toBe(true);
    player.pause();
    finish();
    stale.onEnded();
    await Promise.resolve();
    expect(player.getSnapshot()).toMatchObject({ position: 8, status: "paused" });
    expect(progress.get(first)?.complete).toBe(false);
  });

  it("gives timed sleep priority over ended and autoplay even before the browser timer fires", async () => {
    const { player, output, load, progress, request, advance } = setup();
    await player.select(first, true);
    player.setSleep(15);
    advance(15 * 60_000, false);
    request().onEnded();
    expect(player.getSnapshot()).toMatchObject({ sleep: null, playIntent: false, status: "paused" });
    expect(output.stop).toHaveBeenLastCalledWith("sleep");
    expect(load).toHaveBeenCalledTimes(1);
    expect(progress.get(first)?.complete).toBe(false);
  });

  it("expires a 30-minute wall-clock sleep during a hold and prevents the delayed release from restarting", async () => {
    const { player, advance, output } = setup();
    await player.select(first, true);
    player.setSleep(30);
    player.hold("voice");
    advance(30 * 60_000 - 1);
    player.release("voice");
    advance(1);
    expect(player.getSnapshot()).toMatchObject({ sleep: null, playIntent: false, held: true, status: "paused" });
    advance(699);
    expect(output.start).toHaveBeenCalledTimes(1);
  });

  it("marks natural completion under end-of-item sleep and keeps completion through replay", async () => {
    const { player, request, progress, load, at } = setup();
    await player.select(first, true);
    player.setSleep("end");
    request().onEnded();
    expect(progress.get(first)).toMatchObject({ complete: true, fraction: 1 });
    expect(load).toHaveBeenCalledTimes(1);
    expect(player.getSnapshot()).toMatchObject({ sleep: null, status: "ended", playIntent: false });
    player.play();
    expect(request().position).toBe(0);
    at(1.5);
    player.pause();
    expect(progress.get(first)).toMatchObject({ complete: true, offsetSec: 1.5 });
  });

  it("autoplays only inside the same book and never writes the previous position to the new chapter", async () => {
    const { player, request, at, progress, load } = setup();
    await player.select(first, true);
    at(16.5);
    request().onEnded();
    await Promise.resolve();
    await Promise.resolve();
    expect(player.getSnapshot().selection).toEqual(second);
    expect(progress.get(first)).toMatchObject({ complete: true, sentence: line(first, 3) });
    expect(progress.get(second)).toMatchObject({ complete: false, offsetSec: 0, sentence: line(second, 1) });
    request().onEnded();
    expect(load).toHaveBeenCalledTimes(2);
    expect(player.getSnapshot().status).toBe("ended");
    await player.select(story, true);
    request().onEnded();
    expect(load).toHaveBeenCalledTimes(3);
    expect(player.getSnapshot().status).toBe("ended");
  });

  it("bounds line navigation, restarts after two seconds and never completes a manually skipped ending", async () => {
    const { player, at, progress } = setup();
    await player.select(first, true);
    at(8.2);
    player.stepSentence(-1);
    expect(player.getSnapshot().position).toBe(0);
    player.stepSentence(-1);
    expect(player.getSnapshot().position).toBe(0);
    at(11.1);
    player.stepSentence(-1);
    expect(player.getSnapshot().position).toBe(8);
    player.stepSentence(1);
    player.stepSentence(1);
    player.pause();
    expect(player.getSnapshot()).toMatchObject({ position: 16, cue: { language: "lt" } });
    expect(progress.get(first)?.complete).toBe(false);
  });

  it("throttles progress during playback and never seeks when another tab writes", async () => {
    const { player, at, advance, storage, progress, events } = setup();
    await player.select(first, true);
    storage.setItem.mockClear();
    advance(4999);
    at(1);
    expect(storage.setItem).not.toHaveBeenCalled();
    advance(1);
    at(1.5);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    const other = new TalkProgress("em-lt", { storage, now: () => 9000 });
    other.checkpoint(first, { ...other.get(first)!, offsetSec: 2 });
    events.dispatchEvent(Object.assign(new Event("storage"), { key: progress.key, newValue: storage.getItem(progress.key) }));
    expect(progress.get(first)?.offsetSec).toBe(2);
    expect(player.getSnapshot().position).toBe(1.5);
  });

  it("keeps text after a media error and permits Play after autoplay is blocked", async () => {
    const { player, load, output, request } = setup();
    output.start.mockRejectedValueOnce(new DOMException("gesture", "NotAllowedError"));
    await player.select(first, true);
    expect(player.getSnapshot()).toMatchObject({ item: { selection: first }, error: "blocked", playIntent: false });
    player.play();
    expect(output.start).toHaveBeenCalledTimes(2);
    request().onError("access");
    expect(player.getSnapshot()).toMatchObject({ item: { selection: first }, error: "access" });
    await player.retry(true);
    expect(load).toHaveBeenCalledTimes(2);
    expect(player.getSnapshot().status).toBe("playing");
  });
});
