import { afterEach, describe, expect, it, vi } from "vitest";
import { bookSource } from "../../src/content/bookSource";
import { EDITION } from "../../src/edition";
import { captureAudio, watchMicrophone } from "../../src/convo/audioFocus";
import { BookBufferOutput, bookBufferSpan } from "../../src/radio/bookBufferOutput";
import { BookOutput, createBookOutput } from "../../src/radio/bookOutput";
import { SpeechTempo, type SpeechWindow } from "../../src/radio/speechTempo.worker";
import { TalkPlayer, type TalkOutput } from "../../src/radio/talkPlayer";
import { TalkProgress, type TalkMode } from "../../src/radio/talkProgress";
import { cbr, ContextDouble, decodeFrames, FRAME_SAMPLES, rangeFetcher, SAMPLE_RATE } from "../fixtures/book-audio";
import { spanishBookUiFixture } from "./spanish-book-ui-fixture";
import { SITE, SME_FILES, SM_FILES } from "./spanish-books";

type Request = Parameters<TalkOutput["start"]>[0];

class TempoWorker {
  private readonly tempo = new SpeechTempo();
  onmessage?: (event: { data: Float32Array[] }) => void;
  terminate = vi.fn();
  constructor(private readonly jobs: SpeechWindow[]) {}
  postMessage(input: SpeechWindow) {
    this.jobs.push(input);
    queueMicrotask(() => this.onmessage?.({ data: this.tempo.stretch(input) }));
  }
  get worker() { return this as unknown as Worker; }
}

export function spanishBookOutputTests(helper: "en" | "lt", fixtures: URL) {
  const profile = helper === "en" ? "sme-en" : "sm-lt";
  const { item } = spanishBookUiFixture(fixtures, helper);
  for (const [mode, track] of Object.entries(item.tracks)) {
    if (track) track.recording = () => `/${profile}/${mode}.mp3`;
  }
  const rates = { es: 0.75, [helper]: 1.5 };
  const cleanup: (() => void)[] = [];
  afterEach(() => {
    for (const dispose of cleanup.splice(0).reverse()) dispose();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe(`${profile} bounded book output`, () => {
    it("selects buffers on iPhone and iPad, and gates the desktop review switch", () => {
      const source = bookSource({ VITE_RADIO_FILES: helper === "en" ? SME_FILES : SM_FILES }, SITE)!;
      expect(source.profile).toBe(profile);
      expect(EDITION.helper).toBe(helper);
      const makeAudio = vi.fn();
      vi.stubGlobal("Audio", makeAudio);
      for (const device of [
        { userAgent: "Mozilla/5.0 (iPhone)", maxTouchPoints: 5 },
        { userAgent: "Mozilla/5.0 (Macintosh)", maxTouchPoints: 5 },
      ]) {
        vi.stubGlobal("navigator", device);
        expect(createBookOutput()).toBeInstanceOf(BookBufferOutput);
      }
      vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Macintosh)", maxTouchPoints: 0 });
      vi.stubGlobal("location", { search: "?bookOutput=buffer" });
      vi.stubEnv("DEV", false);
      vi.stubEnv("VITE_BOOK_REVIEW", "0");
      expect(createBookOutput()).toBeInstanceOf(BookOutput);
      vi.stubEnv("VITE_BOOK_REVIEW", "1");
      expect(createBookOutput()).toBeInstanceOf(BookBufferOutput);
      expect(makeAudio).not.toHaveBeenCalled();
    });

    it.each(["target", "helper", "paired"] as const)(
      "uses the recorded language's rate and source clock in %s mode", async (mode: TalkMode) => {
        const track = item.tracks[mode]!;
        const cue = track.cues[0];
        const context = new ContextDouble();
        const jobs: SpeechWindow[] = [];
        const recordings = new Map<string, ReturnType<typeof rangeFetcher>>();
        const fetcher: typeof fetch = vi.fn(async (url, init) => {
          const recording = Object.values(item.tracks).find((candidate) => candidate?.recording() === url)!;
          const key = String(url);
          if (!recordings.has(key)) {
            const frames = Math.ceil(recording.duration * SAMPLE_RATE / FRAME_SAMPLES);
            recordings.set(key, rangeFetcher(cbr(frames)));
          }
          return recordings.get(key)!(url, init);
        });
        const output = new BookBufferOutput(() => context.context, fetcher,
          async (bytes, rate) => decodeFrames(bytes, rate).buffer, () => new TempoWorker(jobs).worker);
        cleanup.push(() => output.stop());
        const request: Request = {
          item, track, rates, position: cue.start, signal: new AbortController().signal,
          onTime() {}, onEnded() {}, onError: vi.fn(),
        };
        const span = bookBufferSpan(request, cue.start, rates)!;
        expect(span.rate).toBe(mode === "target" ? rates.es : rates[helper]);
        expect(span.track.cues.some((line) => line.language === cue.language)).toBe(true);
        await output.start(request);
        await vi.waitFor(() => expect(context.active.size).toBe(2));
        const first = [...context.active][0];
        const chapterMidpoint = (span.chapterFrom + span.chapterTo) / 2;
        context.advanceTo(first.startsAt + first.buffer!.duration / 2);
        expect(output.position()).toBeCloseTo(chapterMidpoint, 4);
        expect(jobs[0].rate).toBe(span.rate);
        expect(first.buffer!.duration).toBeCloseTo((span.to - span.from) / span.rate, 4);
        if (mode === "paired") {
          expect(span.track).toBe(track);
          const fallback = { ...request, track: { ...track, rateSwitches: undefined } };
          expect(bookBufferSpan(fallback, cue.start, rates)?.track).toBe(item.tracks.helper);
          const target = track.cues.find((line) => line.language === "es")!;
          const targetSpan = bookBufferSpan(fallback, target.start, rates)!;
          expect(targetSpan).toMatchObject({ track: item.tracks.target, rate: 0.75, chapterFrom: target.start });
        }
        expect(context.peak).toBe(2);
        expect(request.onError).not.toHaveBeenCalled();
      },
    );

    it("cancels a decoding source for capture and a hidden page, then resumes the same Spanish sentence", async () => {
      vi.useFakeTimers();
      const context = new ContextDouble();
      const track = item.tracks.target!;
      const cue = track.cues[1];
      const frames = Math.ceil(track.duration * SAMPLE_RATE / FRAME_SAMPLES);
      const jobs: SpeechWindow[] = [];
      let finishDecode!: () => void;
      let first = true;
      const output = new BookBufferOutput(() => context.context, rangeFetcher(cbr(frames)), async (bytes, rate) => {
        if (first) {
          first = false;
          await new Promise<void>((resolve) => { finishDecode = resolve; });
        }
        return decodeFrames(bytes, rate).buffer;
      }, () => new TempoWorker(jobs).worker);
      const player = new TalkPlayer({
        load: async () => item, output, progress: new TalkProgress(profile),
        clock: { now: Date.now, setTimeout: (callback, delay) => {
          const timer = setTimeout(callback, delay);
          return () => clearTimeout(timer);
        } },
      });
      player.changeMode("target");
      player.setRate("es", 1);
      cleanup.push(() => player.dispose());
      const unwatch = watchMicrophone((held) => held ? player.hold("microphone") : player.release("microphone"));
      cleanup.push(unwatch);
      await player.select(item.selection, true);
      await vi.waitFor(() => expect(finishDecode).toBeTypeOf("function"));
      const capture = captureAudio();
      cleanup.push(capture.ended);
      player.hold("hidden", true);
      finishDecode();
      capture.ended();
      await vi.advanceTimersByTimeAsync(1000);
      expect(context.starts).toBe(0);
      expect(player.getSnapshot().status).toBe("held");
      player.seekSentence(cue.sentenceId);
      player.release("hidden");
      await vi.advanceTimersByTimeAsync(700);
      await vi.waitFor(() => expect(player.getSnapshot()).toMatchObject({ status: "playing", error: null }));
      expect(player.getSnapshot().cue).toMatchObject({ sentenceId: cue.sentenceId, language: "es" });
      expect(jobs.at(-1)?.rate).toBeCloseTo(1 / 0.75);
      const before = output.position();
      player.hold("microphone");
      expect(context.active.size).toBe(0);
      expect(context.gains.size).toBe(0);
      player.pause();
      player.release("microphone");
      await vi.advanceTimersByTimeAsync(700);
      expect(player.getSnapshot()).toMatchObject({ status: "paused", playIntent: false, position: before });
    });
  });
}
