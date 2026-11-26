import { holdPlaybackRoute, playbackRoute } from "../convo/audioFocus";
import { bookCueIndex } from "./bookTiming";
import { MP3_WINDOW_SECONDS, Mp3Failure, Mp3Recording } from "./mp3Windows";
import { TEMPO_GUARD_SECONDS, type SpeechWindow } from "./speechTempo.worker";
import type { TalkFailure, TalkOutput, TalkStopReason, TalkTrack } from "./talkPlayer";

type Request = Parameters<TalkOutput["start"]>[0];
type Rates = Request["rates"];
type Span = {
  track: TalkTrack;
  from: number;
  to: number;
  regionStart: number;
  regionEnd: number;
  chapterFrom: number;
  chapterTo: number;
  rate: number;
};

/** Keep each scheduled span within a single rate and, when needed, a single mono excerpt. */
export function bookBufferSpan({ track, item }: Pick<Request, "track" | "item">, at: number, rates: Rates): Span | null {
  if (at >= track.duration) return null;
  const rateOf = (language: TalkTrack["cues"][number]["language"]) => {
    const rate = rates[language] ?? 1;
    if (!Number.isFinite(rate) || rate < 0.75 || rate > 2) throw new Mp3Failure("Unsupported speech rate");
    return rate;
  };
  const rate = rateOf(track.cues[0].language);
  const mixed = track.mode === "paired" && track.cues.some((cue) => rateOf(cue.language) !== rate);
  if (mixed && !track.rateSwitches?.length) {
    const index = bookCueIndex(track.cues, at);
    const cue = at < track.cues[index].end ? track.cues[index] : track.cues[index + 1];
    if (!cue) return null;
    for (const monoTrack of [item.tracks.helper, item.tracks.target]) {
      const mono = monoTrack?.cues.find((row) => row.sentenceId === cue.sentenceId &&
        row.language === cue.language && row.textHash === cue.textHash);
      if (!monoTrack || !mono) continue;
      const scale = (cue.end - cue.start) / (mono.end - mono.start);
      const chapterFrom = Math.max(at, cue.start);
      const from = mono.start + (chapterFrom - cue.start) / scale;
      const to = Math.min(mono.end, from + MP3_WINDOW_SECONDS);
      const chapterTo = to === mono.end ? cue.end : cue.start + (to - mono.start) * scale;
      return { track: monoTrack, from, to, regionStart: mono.start, regionEnd: mono.end,
        chapterFrom, chapterTo, rate: rateOf(cue.language) };
    }
    throw new Mp3Failure("Missing matching mono recording", "unavailable");
  }
  const zones = mixed ? track.rateSwitches! : [];
  const index = zones.findLastIndex((zone) => zone.from <= at);
  const currentRate = index < 0 ? rate : rateOf(zones[index].language);
  let first = index;
  while (first > 0 && rateOf(zones[first - 1].language) === currentRate) first--;
  const regionStart = zones[first]?.from ?? 0;
  const regionEnd = zones.find((zone, i) => i > index && rateOf(zone.language) !== currentRate)?.from ?? track.duration;
  const to = Math.min(regionEnd, at + MP3_WINDOW_SECONDS);
  return { track, from: at, to, regionStart, regionEnd, chapterFrom: at, chapterTo: to, rate: currentRate };
}

type Scheduled = {
  source: AudioBufferSourceNode;
  from: number;
  to: number;
  startsAt: number;
  endsAt: number;
};
type Run = {
  abort: AbortController;
  cursor: number;
  position: number;
  complete: boolean;
  pending: boolean;
  gain: GainNode;
  releaseRoute?: () => void;
  timer?: ReturnType<typeof setInterval>;
  current?: Scheduled;
  next?: Scheduled;
  worker?: Worker;
  previous?: Span;
};
type Session = { request: Request; rates: Rates; ctx: AudioContext; run: Run; abort: AbortController; opening: Promise<void> };
type Decode = (data: ArrayBuffer, sampleRate: number) => Promise<AudioBuffer>;

function mp3Decoder(): Decode {
  let decoder: OfflineAudioContext | undefined;
  return async (data, sampleRate) => {
    if (decoder?.sampleRate !== sampleRate) {
      const Offline = globalThis.OfflineAudioContext ?? (globalThis as typeof globalThis & {
        webkitOfflineAudioContext?: typeof OfflineAudioContext;
      }).webkitOfflineAudioContext;
      if (!Offline) throw new Mp3Failure("No MP3 decoder", "unavailable");
      // Decode at the file's native rate for sample-exact trimming. Only the game context plays sound.
      decoder = new Offline(1, 1, sampleRate);
    }
    const context = decoder;
    return new Promise<AudioBuffer>((resolve, reject) => {
      context.decodeAudioData(data, resolve, reject)?.then(resolve, reject);
    });
  };
}

function makeTempoWorker(): Worker {
  return new Worker(new URL("./speechTempo.worker.ts", import.meta.url), { type: "module" });
}

function drop(span?: Scheduled): void {
  if (!span) return;
  span.source.onended = null;
  span.source.disconnect();
  try { span.source.stop(); } catch { /* The source was already stopped. */ }
}

function failure(error: unknown): TalkFailure {
  if (error instanceof Mp3Failure) return error.kind;
  return (error as { name?: string })?.name === "NotAllowedError" ? "blocked" : "unavailable";
}

export class BookBufferOutput implements TalkOutput {
  private session?: Session;
  private finishFade?: () => void;
  private volume = 1;
  private recordings = new Map<string, { url: string; mp3: Mp3Recording }>();
  // decodeAudioData cannot be aborted. Serialize preparation across generations as well as
  // within one run, so canceled decodes never accumulate PCM or compressed packets.
  private preparation: Promise<unknown> = Promise.resolve();

  constructor(private readonly context: () => AudioContext | null, private readonly fetcher: typeof fetch = fetch,
    private readonly decode: Decode = mp3Decoder(), private readonly worker: () => Worker = makeTempoWorker) {}

  unlock(): void {
    const ctx = this.context();
    if (ctx && ctx.state !== "running" && playbackRoute(true)) void ctx.resume().catch(() => {});
  }

  async start(request: Request): Promise<void> {
    this.stop();
    if (request.signal.aborted) return;
    const ctx = this.context();
    if (!ctx) throw new Mp3Failure("No game audio context", "unavailable");
    const run = this.makeRun(ctx, request.position);
    const session: Session = { request, rates: request.rates, ctx, run, abort: new AbortController(), opening: Promise.resolve() };
    this.session = session;
    request.signal.addEventListener("abort", () => {
      if (this.session === session) this.stop();
    }, { once: true, signal: session.abort.signal });
    session.opening = this.open(session, run);
    while (this.session === session) {
      const opening = session.opening;
      try { await opening; } catch (error) {
        if (opening !== session.opening) continue;
        if (this.session !== session) return;
        this.stop();
        throw error;
      }
      if (opening === session.opening) return;
    }
  }

  position(): number | null {
    const session = this.session;
    if (!session) return null;
    const { run, ctx } = session;
    const span = run.next && ctx.currentTime >= run.next.startsAt ? run.next : run.current;
    if (!span || ctx.currentTime < span.startsAt) return run.position;
    const fraction = Math.min(1, (ctx.currentTime - span.startsAt) / (span.endsAt - span.startsAt));
    return span.from + fraction * (span.to - span.from);
  }

  setRates(rates: Rates): void {
    const session = this.session;
    if (!session || !Object.keys({ ...session.rates, ...rates }).some((language) => {
      const key = language as keyof Rates;
      return (rates[key] ?? 1) !== (session.rates[key] ?? 1);
    })) return;
    const position = this.position()!;
    session.rates = rates;
    this.close(session.run);
    const run = session.run = this.makeRun(session.ctx, position);
    session.opening = this.open(session, run);
    void session.opening.catch((error: unknown) => this.report(session, run, failure(error)));
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.session) this.session.run.gain.gain.value = this.volume;
    if (!this.volume) this.finishFade?.();
  }

  stop(reason?: TalkStopReason): void {
    this.finishFade?.();
    const session = this.session;
    this.session = undefined;
    if (!session) return;
    session.abort.abort();
    if (reason === "sleep" && session.run.current && !globalThis.document?.hidden) this.fadeSleep(session);
    else this.close(session.run);
  }

  private makeRun(ctx: AudioContext, at: number): Run {
    const gain = ctx.createGain();
    gain.gain.value = this.volume;
    return { abort: new AbortController(), cursor: at, position: at, complete: false, pending: false, gain };
  }

  private live(session: Session, run: Run): boolean {
    return this.session === session && session.run === run && !run.abort.signal.aborted;
  }

  private close(run: Run, keepCurrent = false): void {
    run.abort.abort();
    clearInterval(run.timer);
    run.worker?.terminate();
    run.worker = undefined;
    drop(run.next);
    run.next = undefined;
    if (keepCurrent) return;
    run.gain.disconnect();
    drop(run.current);
    run.current = undefined;
    run.releaseRoute?.();
    run.releaseRoute = undefined;
  }

  private fadeSleep(session: Session): void {
    const { run, ctx } = session;
    this.close(run, true);
    const stop = () => {
      clearTimeout(timer);
      globalThis.document?.removeEventListener("visibilitychange", stop);
      this.finishFade = undefined;
      this.close(run);
    };
    const param = run.gain.gain;
    param.setValueAtTime(param.value, ctx.currentTime);
    param.linearRampToValueAtTime(0, ctx.currentTime + 0.18);
    const timer = setTimeout(stop, 180);
    this.finishFade = stop;
    globalThis.document?.addEventListener("visibilitychange", stop);
  }

  private async open(session: Session, run: Run): Promise<void> {
    const { ctx } = session;
    const signal = run.abort.signal;
    if (!playbackRoute(true)) throw new DOMException("Audio route held", "NotAllowedError");
    if (ctx.state !== "running") {
      let timer: ReturnType<typeof setTimeout> | undefined;
      let cancel!: () => void;
      const limit = new Promise<void>((resolve) => {
        cancel = resolve;
        timer = setTimeout(cancel, 3000);
        signal.addEventListener("abort", cancel, { once: true });
      });
      try { await Promise.race([ctx.resume(), limit]); } catch { /* Read the context state below. */ }
      finally { clearTimeout(timer); signal.removeEventListener("abort", cancel); }
      if (!this.live(session, run)) return;
      if ((ctx.state as AudioContextState) !== "running") throw new DOMException("Audio needs a gesture", "NotAllowedError");
    }
    ctx.addEventListener("statechange", () => {
      if (ctx.state !== "running" && !globalThis.document?.hidden) this.report(session, run, "blocked");
    }, { signal });
    await this.fill(session, run);
    if (!this.live(session, run) || run.complete) return;
    run.timer = setInterval(() => session.request.onTime(), 100);
    this.pump(session, run);
  }

  private pump(session: Session, run: Run): void {
    if (!this.live(session, run) || run.next || run.pending || run.complete) return;
    void this.fill(session, run).catch((error: unknown) => this.report(session, run, failure(error)));
  }

  private async fill(session: Session, run: Run): Promise<void> {
    const span = bookBufferSpan(session.request, run.cursor, session.rates);
    if (!span) {
      run.complete = true;
      this.endIfDrained(session, run);
      return;
    }
    run.pending = true;
    try {
      const task = this.preparation.then(() => {
        if (this.live(session, run)) return this.prepare(session, run, span);
      });
      this.preparation = task.then(() => {}, () => {});
      const prepared = await task;
      if (!prepared || !this.live(session, run)) return;
      const { ctx } = session;
      if (!run.releaseRoute) {
        if (!playbackRoute(true)) throw new DOMException("Audio route held", "NotAllowedError");
        run.releaseRoute = holdPlaybackRoute();
        run.gain.connect(ctx.destination);
      }
      const source = ctx.createBufferSource();
      source.buffer = prepared.buffer;
      source.connect(run.gain);
      const startsAt = run.current && run.current.endsAt > ctx.currentTime ? run.current.endsAt : ctx.currentTime + 0.012;
      const scheduled = { source, from: span.chapterFrom, to: prepared.chapterTo, startsAt, endsAt: startsAt + prepared.buffer.duration };
      source.onended = () => {
        if (!this.live(session, run) || run.current !== scheduled) return;
        drop(scheduled);
        run.position = scheduled.to;
        run.current = run.next;
        run.next = undefined;
        this.endIfDrained(session, run);
        this.pump(session, run);
      };
      if (run.current) run.next = scheduled;
      else run.current = scheduled;
      source.start(startsAt);
      run.cursor = prepared.chapterTo;
      run.previous = span;
    } finally {
      run.pending = false;
    }
  }

  private async prepare(session: Session, run: Run, span: Span) {
    const signal = run.abort.signal;
    const { track } = span;
    const key = `${track.mode}:${track.audioVersion}`;
    let url = track.recording();
    for (let attempt = 0; ; attempt++) {
      try {
        let cached = this.recordings.get(key);
        if (cached?.url !== url) {
          const mp3 = await Mp3Recording.open(this.fetcher, url, signal);
          signal.throwIfAborted();
          if (Math.abs(mp3.samples / mp3.sampleRate - track.duration) > 0.25) throw new Mp3Failure("MP3 duration differs from its timing");
          cached = { url, mp3 };
          if (this.recordings.size === 3 && !this.recordings.has(key)) this.recordings.delete(this.recordings.keys().next().value!);
          this.recordings.set(key, cached);
        }
        const mp3 = cached.mp3;
        const rate = span.rate;
        const sample = (time: number) => Math.min(mp3.samples, Math.round(time * mp3.sampleRate));
        const from = Math.min(mp3.samples - 1, sample(span.from));
        const to = Math.max(from + 1, sample(span.to));
        const guard = rate === 1 ? 0 : Math.round(TEMPO_GUARD_SECONDS * mp3.sampleRate);
        const left = Math.max(sample(span.regionStart), from - guard);
        const right = Math.min(sample(span.regionEnd), to + guard);
        const window = await mp3.window(Math.min(left, from), Math.max(right, to), signal);
        signal.throwIfAborted();
        const decoded = await this.decode(window.bytes, mp3.sampleRate);
        signal.throwIfAborted();
        const trim = mp3.trim(window, decoded);
        const origin = sample(span.regionStart);
        const outputLength = Math.max(1, Math.round((to - origin) / rate) - Math.round((from - origin) / rate));
        const buffer = session.ctx.createBuffer(mp3.channels, outputLength, mp3.sampleRate);
        if (rate === 1) {
          for (let ch = 0; ch < mp3.channels; ch++) buffer.copyToChannel(decoded.getChannelData(ch).subarray(trim, trim + window.length), ch);
        } else {
          const channels = Array.from({ length: mp3.channels }, (_, ch) => decoded.getChannelData(ch).slice(trim, trim + window.length));
          const join = run.previous?.track === track && run.previous.rate === rate && run.previous.regionStart === span.regionStart;
          const result = await this.stretch(run, { channels, sampleRate: mp3.sampleRate, start: Math.max(0, from - left),
            length: to - from, outputLength, rate, join });
          signal.throwIfAborted();
          result.forEach((channel, ch) => buffer.copyToChannel(channel, ch));
        }
        const chapterTo = to === mp3.samples && track === session.request.track
          ? track.duration : span.chapterTo;
        return { buffer, chapterTo };
      } catch (error) {
        if (attempt || !(error instanceof Mp3Failure) || error.status !== 401) throw error;
        signal.throwIfAborted();
        url = track.recording();
        this.recordings.delete(key);
      }
    }
  }

  private stretch(run: Run, input: SpeechWindow): Promise<Float32Array<ArrayBuffer>[]> {
    const worker = run.worker ??= this.worker();
    const signal = run.abort.signal;
    return new Promise((resolve, reject) => {
      const cancel = () => settle(() => reject(signal.reason));
      const settle = (finish: () => void) => {
        signal.removeEventListener("abort", cancel);
        worker.onmessage = worker.onerror = worker.onmessageerror = null;
        finish();
      };
      const failed = () => settle(() => reject(new Mp3Failure("Speech processing failed", "unavailable")));
      signal.addEventListener("abort", cancel, { once: true });
      worker.onmessage = (event: MessageEvent<Float32Array<ArrayBuffer>[]>) => settle(() => resolve(event.data));
      worker.onerror = worker.onmessageerror = failed;
      try { worker.postMessage(input, input.channels.map((channel) => channel.buffer)); } catch { failed(); }
    });
  }

  private endIfDrained(session: Session, run: Run): void {
    if (run.current || !run.complete || !this.live(session, run)) return;
    this.stop();
    session.request.onEnded();
  }

  private report(session: Session, run: Run, kind: TalkFailure): void {
    if (!this.live(session, run)) return;
    session.request.onError(kind);
    if (this.live(session, run)) this.stop();
  }
}
