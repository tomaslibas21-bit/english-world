import { audio, usesBufferRecordings } from "../game/audio";
import { holdPlaybackRoute, playbackRoute } from "../convo/audioFocus";
import { BookBufferOutput } from "./bookBufferOutput";
import { bookCueIndex } from "./bookTiming";
import { streamingAudio } from "./output";
import type { TalkCue, TalkFailure, TalkOutput, TalkStopReason, TalkTrack } from "./talkPlayer";

type Request = Parameters<TalkOutput["start"]>[0];
type Rates = Request["rates"];
type Excerpt = { index: number; cue: TalkCue; mono: TalkCue; track: TalkTrack };
type Part = {
  media: HTMLAudioElement;
  abort: AbortController;
  url: string;
  track: TalkTrack;
  offset: number;
  startTime: number;
  lastPosition: number;
  excerpt?: Excerpt;
  playing: boolean;
  recovery?: AbortController;
  releaseRoute?: () => void;
};
type Session = {
  generation: number;
  abort: AbortController;
  request: Request;
  rates: Rates;
  position: number;
  zone: number;
  excerpts: boolean;
  part?: Part;
  next?: Part;
  timer?: ReturnType<typeof setTimeout>;
  opening?: Promise<void>;
};

class PlaybackFailure extends Error {
  constructor(readonly kind: TalkFailure) { super(kind); }
}

const rateOf = (rates: Rates, cue: Pick<TalkCue, "language">) => rates[cue.language] ?? 1;
const abortError = () => new DOMException("Playback canceled", "AbortError");
const isBlocked = (error: unknown) => (error as { name?: string })?.name === "NotAllowedError";

export class BookOutput implements TalkOutput {
  private generation = 0;
  private volume = 1;
  private current?: Session;
  private fading?: Part;
  private finishFade?: () => void;

  constructor(private readonly makeAudio = streamingAudio, private readonly fetchStatus: typeof fetch = fetch) {}

  async start(request: Request): Promise<void> {
    this.stop();
    if (request.signal.aborted) return;
    const session: Session = {
      generation: this.generation, abort: new AbortController(), request, rates: request.rates,
      position: request.position, zone: 0, excerpts: false,
    };
    this.current = session;
    request.signal.addEventListener("abort", () => this.stop(), { once: true, signal: session.abort.signal });
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => this.setRates(session.rates), { signal: session.abort.signal });
    }
    session.excerpts = this.needsExcerpts(session);
    this.replace(session, this.open(session, request.position));
    while (this.live(session)) {
      const opening = session.opening;
      try {
        await opening;
        if (opening === session.opening) return;
      } catch (error) {
        if (opening !== session.opening) continue;
        if (!this.live(session)) return;
        this.stop();
        throw error;
      }
    }
  }

  stop(reason?: TalkStopReason): void {
    this.finishFade?.();
    this.generation++;
    const session = this.current;
    this.current = undefined;
    if (!session) return;
    session.abort.abort();
    clearTimeout(session.timer);
    this.close(session.next);
    if (reason === "sleep" && session.part?.playing && !globalThis.document?.hidden) this.fadeSleep(session.part);
    else this.close(session.part);
  }

  position(): number | null {
    const session = this.current;
    if (!session) return null;
    const part = session.part;
    if (!part?.playing) return session.position;
    if (part.media.error) return part.lastPosition;
    const { currentTime } = part.media;
    if (!part.excerpt) return currentTime;
    return Math.min(part.excerpt.cue.end, Math.max(part.excerpt.cue.start, currentTime + part.offset));
  }

  setVolume(volume: number): void {
    this.volume = volume;
    if (this.current?.part) this.current.part.media.volume = volume;
    if (this.current?.next) this.current.next.media.volume = volume;
    if (this.fading && volume === 0) this.fading.media.volume = 0;
  }

  setRates(rates: Rates): void {
    const session = this.current;
    if (!session) return;
    const changed = rates !== session.rates;
    session.rates = rates;
    const excerpts = this.needsExcerpts(session);
    if (excerpts !== session.excerpts) {
      const at = this.position()!;
      session.excerpts = excerpts;
      this.replace(session, this.open(session, at));
      return;
    }
    const part = session.part;
    if (part) {
      const at = this.position()!;
      if (changed || !part.playing) this.landRate(session, part, at);
      this.pulse(session, part);
    }
  }

  private fadeSleep(part: Part): void {
    this.fading = part;
    const startedAt = Date.now(), volume = part.media.volume;
    const interval = setInterval(() => {
      part.media.volume = Math.min(volume, this.volume) * Math.max(0, 1 - (Date.now() - startedAt) / 180);
    }, 12);
    const finish = () => {
      clearInterval(interval);
      clearTimeout(deadline);
      globalThis.document?.removeEventListener("visibilitychange", finish);
      this.fading = undefined;
      this.finishFade = undefined;
      this.close(part);
    };
    const deadline = setTimeout(finish, 180);
    this.finishFade = finish;
    globalThis.document?.addEventListener("visibilitychange", finish);
  }

  private live(session: Session): boolean {
    return this.current === session && this.generation === session.generation && !session.abort.signal.aborted;
  }

  private active(session: Session, part: Part): boolean {
    return this.live(session) && session.part === part && !part.abort.signal.aborted;
  }

  private needsExcerpts(session: Session): boolean {
    const { track } = session.request;
    if (track.mode !== "paired") return false;
    const mixed = track.cues.some((cue) => rateOf(session.rates, cue) !== rateOf(session.rates, track.cues[0]));
    return mixed && (!track.rateSwitches?.length || (typeof document !== "undefined" && document.hidden));
  }

  private excerpt(session: Session, index: number): Excerpt {
    const { request } = session;
    const cue = request.track.cues[index];
    for (const track of [request.item.tracks.helper, request.item.tracks.target]) {
      const mono = track?.cues.find((row) => row.sentenceId === cue.sentenceId &&
        row.language === cue.language && row.textHash === cue.textHash);
      if (track && mono) return { index, cue, mono, track };
    }
    throw new PlaybackFailure("unavailable");
  }

  private makePart(session: Session, position: number, excerpt?: Excerpt): Part {
    const track = excerpt?.track ?? session.request.track;
    const offset = excerpt ? excerpt.cue.start - excerpt.mono.start : 0;
    const mediaAt = excerpt ? Math.max(excerpt.mono.start, Math.min(excerpt.mono.end, position - offset)) : position;
    const url = track.recording();
    const media = this.makeAudio();
    const part: Part = {
      media, abort: new AbortController(), url, track, offset, startTime: mediaAt,
      lastPosition: position, excerpt, playing: false,
    };
    media.volume = this.volume;
    media.preservesPitch = true;
    // The native fragment end stops speech even while page timers are throttled.
    media.muted = true;
    media.src = excerpt ? `${url}#t=${mediaAt.toFixed(6)},${excerpt.mono.end.toFixed(6)}` : url;
    // Before metadata, the setter supplies the default playback start position.
    try { media.currentTime = mediaAt; } catch { /* Metadata will make the precise seek available. */ }
    return part;
  }

  private close(part?: Part): void {
    if (!part) return;
    part.recovery?.abort();
    this.unload(part);
  }

  private unload(part: Part): void {
    if (part.abort.signal.aborted) return;
    part.abort.abort();
    part.media.muted = true;
    part.media.pause();
    part.media.removeAttribute("src");
    part.media.load();
    part.releaseRoute?.();
  }

  private async open(session: Session, position: number, index?: number, retried = false): Promise<void> {
    if (!this.live(session)) return;
    clearTimeout(session.timer);
    this.close(session.part);
    session.part = undefined;
    session.position = position;
    const cues = session.request.track.cues;
    if (session.excerpts && index === undefined) {
      index = bookCueIndex(cues, position);
      if (position >= cues[index].end) {
        if (index === cues.length - 1) {
          this.ended(session);
          return;
        }
        position = cues[++index].start;
        session.position = position;
      }
    }
    const excerpt = index !== undefined ? this.excerpt(session, index) : undefined;
    const prepared = session.next;
    session.next = undefined;
    const usePrepared = !retried && prepared?.excerpt && excerpt && prepared.excerpt.index === excerpt.index &&
      position === excerpt.cue.start && !prepared.media.error;
    if (!usePrepared) this.close(prepared);
    const part = session.part = usePrepared ? prepared : this.makePart(session, position, excerpt);
    const { media } = part;
    const listeners = { signal: part.abort.signal };
    this.landRate(session, part, position);

    let rejectStart!: (error: unknown) => void;
    const interrupted = new Promise<never>((_, reject) => { rejectStart = reject; });
    void interrupted.catch(() => {}); // The setup below can fail before play() is called.
    const failed = () => {
      if (!this.active(session, part)) return;
      if (!part.playing) rejectStart(new Error("Media request failed"));
      else this.replace(session, this.recover(session, part, retried));
    };
    part.abort.signal.addEventListener("abort", () => rejectStart(abortError()), { once: true });
    const validDuration = () => Number.isFinite(media.duration) && Math.abs(media.duration - part.track.duration) <= 0.25;
    media.addEventListener("loadedmetadata", () => {
      if (!this.active(session, part)) return;
      try {
        if (!validDuration()) throw new PlaybackFailure("invalid");
        media.currentTime = part.startTime;
      } catch (error) {
        media.muted = true;
        media.pause();
        rejectStart(error);
      }
    }, listeners);
    media.addEventListener("error", failed, listeners);
    const pulse = () => this.pulse(session, part);
    for (const event of ["timeupdate", "playing", "waiting", "seeked"]) media.addEventListener(event, pulse, listeners);
    media.addEventListener("pause", () => {
      if (!this.active(session, part) || !part.playing || media.ended || !media.paused || media.error) return;
      if (part.excerpt && media.currentTime >= part.excerpt.mono.end - 0.001) this.advance(session, part);
      else if (!media.seeking) this.report(session, "blocked");
    }, listeners);
    media.addEventListener("ended", () => {
      if (!this.active(session, part) || !part.playing || !media.ended) return;
      if (part.excerpt) this.advance(session, part);
      else this.ended(session);
    }, listeners);

    try {
      if (media.readyState > 0) {
        if (!validDuration()) throw new PlaybackFailure("invalid");
        media.currentTime = part.startTime;
      }
      if (!playbackRoute(true)) throw new DOMException("Audio route held", "NotAllowedError");
      part.releaseRoute = holdPlaybackRoute();
      media.muted = false;
      // Invoke play in the gesture. The browser waits for metadata and the precise seek.
      await Promise.race([interrupted, media.play()]);
    } catch (error) {
      if (!this.active(session, part)) return;
      if (error instanceof PlaybackFailure || isBlocked(error)) throw error;
      await this.recover(session, part, retried);
      return;
    }
    if (!this.active(session, part)) return;
    if (!validDuration()) throw new PlaybackFailure("invalid");
    part.playing = true;
    if (media.ended) {
      if (part.excerpt) this.advance(session, part);
      else this.ended(session);
      return;
    }
    this.precue(session, part);
    this.pulse(session, part);
  }

  private async recover(session: Session, part: Part, retried: boolean): Promise<void> {
    const position = this.position()!;
    const { excerpt } = part;
    this.unload(part);
    part.playing = false;
    session.position = position;
    const recovery = part.recovery = new AbortController();
    const status = await this.status(part.url, recovery.signal);
    if (!this.live(session) || session.part !== part || recovery.signal.aborted) return;
    if (status === 401 && !retried) {
      await this.open(session, position, excerpt?.index, true);
      return;
    }
    throw new PlaybackFailure(status === 401 || status === 403 ? "access" : status === 404 ? "missing" : "unavailable");
  }

  private async status(url: string, signal: AbortSignal): Promise<number> {
    try {
      // The HTML element surfaces MediaError, without the HTTP status. Inspect just one
      // byte for diagnosis, and close the body even if the host sent a full response.
      const result = await this.fetchStatus(url, {
        headers: { Range: "bytes=0-0" }, signal, redirect: "error", referrerPolicy: "no-referrer",
      });
      void result.body?.cancel().catch(() => {});
      return result.status;
    } catch {
      return 0;
    }
  }

  private landRate(session: Session, part: Part, position: number): void {
    session.zone = Math.max(0, session.request.track.rateSwitches?.findLastIndex((zone) => zone.from <= position) ?? 0);
    this.applyRate(session, part);
  }

  private applyRate(session: Session, part: Part): void {
    const track = part.track;
    const leg = part.excerpt?.mono ?? track.rateSwitches?.[session.zone] ?? track.cues[0];
    const rate = rateOf(session.rates, leg);
    if (part.media.playbackRate !== rate) part.media.playbackRate = rate;
  }

  private pulse(session: Session, part: Part): void {
    if (!this.active(session, part) || !part.playing) return;
    clearTimeout(session.timer);
    const { media, excerpt } = part;
    const at = media.currentTime;
    part.lastPosition = this.position()!;
    let boundary = excerpt?.mono.end;
    if (excerpt && at >= excerpt.mono.end - 0.001) {
      this.advance(session, part);
      return;
    }
    const switches = excerpt ? undefined : part.track.rateSwitches;
    if (switches) {
      const next = switches[session.zone + 1];
      if (next && at >= next.from) {
        const landing = switches.findLastIndex((zone) => zone.from <= at);
        const zone = switches[landing];
        if (rateOf(session.rates, zone) !== media.playbackRate && (landing !== session.zone + 1 || at > zone.until)) {
          session.excerpts = true;
          this.replace(session, this.open(session, at));
          return;
        }
        session.zone = landing;
        this.applyRate(session, part);
      }
      boundary = switches[session.zone + 1]?.from;
    }
    session.request.onTime();
    if (this.active(session, part) && boundary !== undefined && !media.paused) {
      const delay = Math.max(12, (boundary - at) * 1000 / media.playbackRate);
      session.timer = setTimeout(() => this.pulse(session, part), delay);
    }
  }

  private precue(session: Session, part: Part): void {
    const index = part.excerpt && part.excerpt.index + 1;
    if (index === undefined || index >= session.request.track.cues.length) return;
    try {
      const excerpt = this.excerpt(session, index);
      session.next = this.makePart(session, excerpt.cue.start, excerpt);
    } catch { /* The next leg reports its failure if it cannot open. */ }
  }

  private advance(session: Session, part: Part): void {
    const index = part.excerpt!.index + 1;
    const next = session.request.track.cues[index];
    if (next) this.replace(session, this.open(session, next.start, index));
    else this.ended(session);
  }

  private ended(session: Session): void {
    this.stop();
    session.request.onEnded();
  }

  private report(session: Session, kind: TalkFailure): void {
    if (!this.live(session)) return;
    session.request.onError(kind);
    if (this.live(session)) this.stop();
  }

  private replace(session: Session, operation: Promise<void>): void {
    const starting = !session.opening;
    session.opening = operation;
    void operation.catch((error: unknown) => {
      if (starting || session.opening !== operation) return;
      this.report(session, isBlocked(error) ? "blocked" : error instanceof PlaybackFailure ? error.kind : "unavailable");
    });
  }
}

export function createBookOutput(bufferRecordings = usesBufferRecordings()): TalkOutput {
  const forceBuffer = (import.meta.env.DEV || import.meta.env.VITE_BOOK_REVIEW === "1") &&
    new URLSearchParams(globalThis.location?.search).get("bookOutput") === "buffer";
  return bufferRecordings || forceBuffer ? new BookBufferOutput(() => audio.context()) : new BookOutput();
}
