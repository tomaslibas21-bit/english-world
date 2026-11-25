// Recorded voices and small synthesized sound effects. Browser speech is used for unrecorded lines,
// or when the learner explicitly chooses it after a failed download. No network TTS is ever called.
import type { Object3D } from "three";
import { audioKey, withoutAddressedNames } from "../audio-key";
import { audioDir } from "../content/voices";
import { EDITION } from "../edition";

/** The browser voices that can stand in for a missing clip in the Spanish edition: Spanish as it speaks it (es-MX). */
const VOICE_LANG = new RegExp(`^${EDITION.target.replace("-", "[-_]")}`, "i");
import { holdPlaybackRoute, microphoneHandoffState, playbackRoute, waitForMicrophone, watchMicrophone } from "../convo/audioFocus";
import { audioDiagnostic, audioDiagnosticsEnabled, audioSessionSnapshot, diagnosticError } from "../convo/audioDiagnostics";
import { stretchSpeech } from "./timeStretch";
import { BED_DUCK, BIRDSONG, LOOPS, SAMPLES, STEPS, isSample, type Bed, type BedLoop, type LoopName, type SampleDef, type SampleName, type Surface, type SynthName } from "./soundscape";
import { TOWN_SOUNDS } from "./townSounds";
import type { VoiceVisualOwner } from "./talkNatural/contract";

export type DiagnosticPipeline = "html" | "buffer";
export interface DiagnosticPlaybackState {
  status: "empty" | "preparing" | "ready" | "playing" | "blocked" | "unavailable";
  clipId: string | null;
  volume: number;
  pipeline: DiagnosticPipeline | null;
  error?: string;
}

export type PlaybackState = "idle" | "loading" | "playing" | "blocked" | "unavailable";
export type VisualPlaybackState = PlaybackState | "ended" | "interrupt" | "muted";
interface PlaybackRequest {
  done: boolean;
  optional?: boolean;
  visual?: VoiceVisualOwner;
  visualStartedAt?: number;
  visualVolume?: number;
  fail(state: "blocked" | "unavailable"): void;
  cleanup: () => void;
  finish(completed: boolean, playedToEnd?: true): void;
  retry?: () => void;
  fallback?: () => void;
}

export type FilePlayback = {
  readonly status: "loading" | "playing" | "ended" | "unavailable";
  readonly currentTime: number;
  stop(): void;
};

// A short, silent WAV: prime the SAME media element during a real tap, before any fetch/await.
// A muted element does not unlock later audible playback. No network or continuously running audio.
const SILENCE = "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQIAAAAAAA==";

/** The clips' loudness is worked out this many times a second. */
const ENVELOPE_RATE = 30;
/** How long the clip list's download may stand still (no answer yet, or no more bytes) before it is given up (ms). */
const MANIFEST_STALL_MS = 8000;

/** iOS media-element playback and native speech recognition share a problematic native
 *  session. Use the game's Web Audio output for recordings on iPhone/iPad, including
 *  iPad's desktop user agent. Other platforms retain their existing media player. */
export function usesBufferRecordings(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent ?? "") ||
    (/Macintosh|MacIntel/.test((navigator.userAgent ?? "") + (navigator.platform ?? "")) && navigator.maxTouchPoints > 1);
}

/** The token the course opened the game's page with (?t=), if any. */
const PAGE_TOKEN = (() => {
  try { return new URL(location.href).searchParams.get("t"); } catch { return null; }
})();

/** The course's files token (fluent-steps docs/FILE-PROTECTION.md, docs/GAME.md): in the course, the clips on its
 *  files host are only for learners who have the course. The course opens the game's page with one (?t=) and keeps a
 *  newer one in localStorage ("fs-files-token") as it renews it; the newer one wins. None outside the course. */
export function filesToken(): string | null {
  try {
    const k = JSON.parse(localStorage.getItem("fs-files-token") ?? "null") as { token?: unknown; exp?: unknown } | null;
    if (k && typeof k.token === "string" && typeof k.exp === "number" && k.exp > Date.now() / 1000 + 60) return k.token;
  } catch { /* no storage */ }
  return PAGE_TOKEN;
}

/** A clip's address: its folder and key, the version of a re-recorded clip, and the files token when there is one. */
export function clipUrl(base: string, key: string, version?: string, token?: string | null): string {
  const query = [version ? `v=${version.slice(0, 12)}` : "", token ? `t=${encodeURIComponent(token)}` : ""].filter(Boolean).join("&");
  return base + key + ".mp3" + (query ? `?${query}` : "");
}

export class AudioSystem {
  manifest: Record<string, number> = {};
  /** New content hashes for clips re-recorded at the same keys (repair-versions.json in the clip folder): the version on
   *  the clip's address makes browsers that cached the old recording fetch the new one. */
  repairVersions: Record<string, string> = {};
  private ctx: AudioContext | null = null;
  private player: HTMLAudioElement | null = null;
  private request: PlaybackRequest | null = null;
  declare private visualEnds?: WeakSet<VoiceVisualOwner>;
  private unlocked = false;
  private state: PlaybackState = "idle";
  private listeners = new Set<() => void>();
  getState = () => this.state;
  get visualOwner() { return this.request?.visual; }
  visualState(owner: VoiceVisualOwner): VisualPlaybackState {
    const request = this.request;
    if (request?.visual !== owner) return this.visualEnds?.has(owner) ? "ended" : "interrupt";
    if (this.state !== "playing") return this.state;
    const root = owner.actor.root;
    if (globalThis.document?.hidden || !root.parent) return "blocked";
    for (let node: Object3D | null = root; node; node = node.parent) if (!node.visible) return "blocked";
    if (request.visualStartedAt === undefined) return "loading";
    const clip = this.clip;
    if (clip?.done || clip?.el?.ended) return "ended";
    if (clip?.el) {
      if (clip.el.paused) return "blocked";
      if (clip.el.readyState < 3) return "loading";
    } else if (clip ? this.ctx?.state !== "running" : speechSynthesis.paused) return "blocked";
    return this.volume <= 0 || clip?.el?.muted || clip?.el?.volume === 0 || request.visualVolume === 0 ? "muted" : "playing";
  }
  /** Real playback seconds for this request, retaining the backend's offset on retry. */
  visualElapsed(owner: VoiceVisualOwner): number {
    const start = this.request?.visualStartedAt;
    if (this.visualOwner !== owner || start === undefined) return 0;
    const clip = this.clip;
    return clip?.position?.() ?? (clip?.el ? clip.el.currentTime / clip.el.playbackRate : (performance.now() - start) / 1000);
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private setState(state: PlaybackState) {
    if (state === this.state) return;
    this.state = state;
    // the world's sounds make way for a voice (hush, below)
    this.hush("voice", state === "loading" || state === "playing");
    for (const listener of this.listeners) listener();
  }
  volume = 0.9;
  /** The "Sounds" setting: how loud everything that is not a voice is, beside the voices (0–1; 0.8 is the level the
   *  sounds were tuned at, 0 none at all). */
  private soundsLevel = 0.8;
  get sounds() { return this.soundsLevel; }
  set sounds(v: number) { this.soundsLevel = Math.max(0, Math.min(1, v)); this.levelBuses(0.05); }
  constructor() {
    // never a sound of the world while the microphone listens
    watchMicrophone((listening) => this.hush("microphone", listening, true));
  }
  /** Where the clips live: next to the game by default, or VITE_AUDIO_BASE (e.g. a CDN). */
  base = (import.meta.env.VITE_AUDIO_BASE as string | undefined) || `${import.meta.env.BASE_URL}${audioDir()}`;
  ready = false;
  private initializing: Promise<void> | null = null;
  private retryInitAt = 0;
  /** Bounded session cache: a rotating course token must not download the same recording again. */
  private recordings = new Map<string, string>();
  private downloads = new Map<string, Promise<void>>();
  private fallbackVoices: SpeechSynthesisVoice[] = [];
  /** The clip playing now, and its loudness once worked out (see loudness()), for the speaker's mouth. */
  private clip: { el?: HTMLAudioElement; key: string; done: boolean; position?: () => number; envelopeKey?: string } | null = null;
  /** Each clip's loudness: null while being worked out, empty when that failed. */
  private envelopes = new Map<string, Float32Array | null>();
  /** Each clip's sound, as often: how round it is (0: a bright, wide "ee" or an "s"; 1: a dark, round "oo"), for the
   *  mouth's shape (worked out with the loudness, see envelope()). */
  private vowels = new Map<string, Float32Array>();
  private decoder: BaseAudioContext | null = null;
  /** Decoded normal/slow recordings share a 24 MiB budget; the active source retains
   *  its own buffer if the next few clips evict it. No whole-course PCM downloads. */
  private buffers = new Map<string, AudioBuffer>();
  private bufferBytes = 0;
  private decodings = new Map<string, Promise<AudioBuffer>>();
  private lastRecordingKey: string | null = null;
  private diagnosticSelection: { key: string; source: string; buffer: AudioBuffer; volume: number } | null = null;
  private diagnosticRun = 0;
  private diagnosticCleanup: (() => void) | null = null;
  private diagnosticListeners = new Set<() => void>();
  private diagnosticState: DiagnosticPlaybackState = { status: "empty", clipId: null, volume: 0.9, pipeline: null };
  getDiagnosticState = () => this.diagnosticState;
  subscribeDiagnostics = (listener: () => void) => { this.diagnosticListeners.add(listener); return () => { this.diagnosticListeners.delete(listener); }; };
  private setDiagnosticState(patch: Partial<DiagnosticPlaybackState>) {
    this.diagnosticState = { ...this.diagnosticState, ...patch };
    for (const listener of this.diagnosticListeners) listener();
  }

  init(): Promise<void> {
    if (this.initializing) return this.initializing;
    if (this.ready || Date.now() < this.retryInitAt) return Promise.resolve();
    if (typeof speechSynthesis !== "undefined") {
      const load = () => {
        const voices = speechSynthesis.getVoices();
        const language = EDITION.target.split("-")[0].toLowerCase();
        this.fallbackVoices = voices.filter((v) => v.lang.toLowerCase().split(/[-_]/)[0] === language);
      };
      load();
      speechSynthesis.onvoiceschanged = load;
    }
    this.initializing = (async () => {
      // One failed request must not disable recorded voices for the rest of this visit. The second
      // attempt bypasses a stale HTTP/service-worker response. Each request is bounded by how long it may stand
      // still (STALL: no answer, or no more of it, for that long), not by how long it takes: on a slow phone
      // connection a big clip list arrives steadily for longer than any fixed limit worth waiting for a dead one.
      const read = async (file: string) => {
        for (const cache of ["no-cache", "reload"] as const) {
          const controller = new AbortController();
          let timer: ReturnType<typeof setTimeout> | undefined;
          const alive = () => { clearTimeout(timer); timer = setTimeout(() => controller.abort(), MANIFEST_STALL_MS); };
          alive();
          try {
            const r = await fetch(`${import.meta.env.BASE_URL}${audioDir()}${file}`, { cache, signal: controller.signal });
            if (!r.ok) continue;
            const reader = r.body?.getReader?.();
            if (!reader) return await r.json();
            const parts: Uint8Array[] = [];
            let size = 0;
            for (;;) {
              alive();
              const { done, value } = await reader.read();
              if (done) break;
              parts.push(value); size += value.length;
            }
            const all = new Uint8Array(size);
            let at = 0;
            for (const part of parts) { all.set(part, at); at += part.length; }
            return JSON.parse(new TextDecoder().decode(all));
          } catch { /* retry once, then leave offline fallback available */ }
          finally { clearTimeout(timer); }
        }
        return null;
      };
      const [manifest, versions] = await Promise.all([read("manifest.json"), read("repair-versions.json")]);
      if (manifest && typeof manifest === "object" && !Array.isArray(manifest)) {
        this.manifest = manifest;
        this.ready = true;
      } else this.retryInitAt = Date.now() + 15000;
      if (versions && typeof versions === "object" && !Array.isArray(versions)) this.repairVersions = versions;
    })().finally(() => { this.initializing = null; });
    return this.initializing;
  }

  hasClip(voice: string, speed: number, text: string) { return !!this.manifest[audioKey(voice, speed, text)]; }
  clipDuration(voice: string, speed: number, text: string) { return this.manifest[audioKey(voice, speed, text)] ?? null; }

  /** The player's names (lines that address the player by name are voiced without it). */
  names: string[] = [];

  private media() {
    if (!this.player) {
      this.player = new Audio();
      this.player.preload = "auto";
      this.player.setAttribute("playsinline", "");
      if (audioDiagnosticsEnabled()) {
        for (const name of ["loadstart", "loadedmetadata", "canplay", "play", "playing", "pause", "ended", "waiting", "stalled", "error", "volumechange", "ratechange"]) {
          this.player.addEventListener?.(name, () => this.recordMediaDiagnostic(`media.${name}`));
        }
      }
    }
    return this.player;
  }

  /** Install for both game modes, including their start screen and linked situations. */
  bindGestures() {
    // A diagnostic marker must not accidentally retry media or repair its route before it is sampled.
    const activate = (event: Event) => {
      if ((event.target as Element | null)?.closest?.("[data-audio-diagnostics]")) return;
      this.unlock();
    };
    const hide = () => { if (document.hidden) { this.stopAmbience(); this.stopDiagnostic("hidden"); } };
    const leave = () => { this.stopAmbience(); this.stopDiagnostic("pagehide"); };
    document.addEventListener("click", activate, true);
    document.addEventListener("keydown", activate, true);
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", leave);
    return () => {
      document.removeEventListener("click", activate, true);
      document.removeEventListener("keydown", activate, true);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", leave);
      this.stopAmbience();
      this.stopDiagnostic("unmount");
    };
  }

  unlock() {
    if (usesBufferRecordings()) {
      if (this.state === "blocked") { this.retry(); return; }
      if (!playbackRoute()) return;
      // Create/resume in the real gesture, before asynchronous MP3 fetch/decode. Do
      // not prime an HTMLAudio element: even its silent play/pause uses that pipeline.
      try {
        const ctx = this.ac(false);
        if (ctx && ctx.state !== "running") void ctx.resume().catch(() => {});
      } catch (error) { audioDiagnostic("context.unlock-error", { error: diagnosticError(error) }); }
      return;
    }
    if (this.ctx && this.ctx.state !== "running") void this.ctx.resume().catch(() => {});
    if (this.state === "blocked") { this.retry(); return; }
    this.primeFile();
  }

  /** Direct recordings use the media clock. Prime that element during the start tap, including on buffer-audio devices. */
  primeFile() {
    if (this.unlocked || (this.clip && !this.clip.done)) return;
    if (!playbackRoute()) return;
    const a = this.media();
    a.src = SILENCE;
    a.volume = this.volume;
    void a.play().then(() => {
      this.unlocked = true;
      // A line may already have replaced the silent clip while play() was settling.
      if (a.src === SILENCE) a.pause();
    }).catch(() => { /* a linked page may still need its first tap; show recovery on the real line */ });
  }

  /** Play a named MP3 alongside the manifest-backed voices. Its clock belongs to this request. */
  playFile(file: string): FilePlayback {
    this.stopDiagnostic("normal-playback");
    this.stop();
    const a = this.media();
    let finished = false, ended = false, endTime = 0;
    const status = () => finished ? (ended ? "ended" : "unavailable")
      : this.state === "playing" ? "playing" : "loading";
    const request: PlaybackRequest = {
      done: false, optional: true, cleanup: () => {},
      fail: () => request.finish(false),
      finish: (completed) => {
        if (request.done) return;
        request.done = finished = true;
        ended = completed;
        endTime = a.currentTime;
        request.cleanup();
        if (this.request === request) { this.request = null; this.setState("idle"); }
      },
    };
    this.request = request;
    this.setState("loading");
    this.playRecording(request, file, "", {}, file);
    return {
      get status() { return status(); },
      get currentTime() { return finished ? endTime : a.currentTime; },
      stop: () => request.finish(false),
    };
  }

  /** Called directly by a tap, with no awaited work before play(). */
  retry = () => { playbackRoute(); this.request?.retry?.(); };
  useBrowserVoice = () => { playbackRoute(); this.request?.fallback?.(); };
  canUseBrowserVoice = () => !!this.request?.fallback;
  continueReading = () => this.request?.finish(true);

  /** True after playback finishes or the learner explicitly continues reading. Cancellation is false;
   *  denial keeps the same line pending. Optional playback resolves false on failure or timeout. */
  play(voice: string, speed: number, text: string, opts: { slow?: boolean; male?: boolean; localVoiceOnly?: boolean; fallbackLang?: string; optional?: boolean; recordingOnly?: boolean; signal?: AbortSignal; visual?: VoiceVisualOwner } = {}): Promise<boolean> {
    if (opts.signal?.aborted) return Promise.resolve(false);
    this.stopDiagnostic("normal-playback");
    this.stop();
    // nothing to say (a hint whose blank is still empty comes out as ".")
    if (!/[a-z0-9]/i.test(text)) return Promise.resolve(true);
    return new Promise((resolve) => {
      let deadline: ReturnType<typeof setTimeout> | undefined;
      const abort = () => request.finish(false);
      const request: PlaybackRequest = {
        done: false,
        optional: opts.optional,
        visual: opts.visual,
        fail: (state) => {
          if (request.done) return;
          if (!opts.optional) this.setState(state);
          else if (!opts.recordingOnly && request.fallback) request.fallback();
          else request.finish(false);
        }, cleanup: () => {},
        finish: (completed, playedToEnd) => {
          if (request.done) return;
          request.done = true;
          if (playedToEnd && request.visual) (this.visualEnds ??= new WeakSet()).add(request.visual);
          clearTimeout(deadline);
          opts.signal?.removeEventListener("abort", abort);
          request.cleanup();
          if (this.request === request) { this.request = null; this.setState("idle"); }
          resolve(completed);
        },
      };
      opts.signal?.addEventListener("abort", abort, { once: true });
      if (opts.optional) {
        const duration = this.clipDuration(voice, speed, text);
        deadline = setTimeout(() => request.finish(false),
          Math.max(7000, 2200 + text.length * (opts.slow ? 155 : 125), (duration ?? 0) * 1250 + 5000));
      }
      this.request = request;
      this.setState("loading");
      const begin = async () => {
        if (request.done) return;
        this.setState("loading");
        await Promise.all([this.init(), waitForMicrophone()]);
        if (request.done) return;
        // A missing manifest does not prove that this NPC has no recording.
        if (!this.ready) {
          audioDiagnostic("recording.manifest-unavailable", { manifestReady: false });
          request.fail("unavailable");
          return;
        }
        const key = this.recordingKey(voice, speed, text);
        audioDiagnostic("recording.lookup", { clipId: key, recordingPresent: !!this.manifest[key], manifestReady: this.ready });
        if (this.manifest[key]) {
          if (usesBufferRecordings()) this.playBufferRecording(request, key, text, opts);
          else this.playRecording(request, key, text, opts);
        }
        else if (opts.recordingOnly) request.finish(false);
        else this.speakFallback(request, text, opts, "manifest-miss");
      };
      const start = () => { void begin().catch(() => request.fail("unavailable")); };
      request.retry = () => { this.retryInitAt = 0; start(); };
      request.fallback = () => this.speakFallback(request, text, opts);
      start();
    });
  }

  private recordingKey(voice: string, speed: number, text: string): string {
    let key = audioKey(voice, speed, text);
    if (!this.manifest[key]) {
      const alt = withoutAddressedNames(text, this.names);
      if (alt && this.manifest[audioKey(voice, speed, alt)]) key = audioKey(voice, speed, alt);
    }
    return key;
  }

  private cacheKey(key: string) { return clipUrl(this.base, key, this.repairVersions[key]); }

  /** Warm only the next few lines of the current turn, never a whole voice library. */
  async prefetch(lines: { voice: string; speed: number; text: string }[]) {
    await this.init();
    await Promise.all(lines.slice(0, 3).map(({ voice, speed, text }) => {
      const key = this.recordingKey(voice, speed, text);
      return this.manifest[key] ? this.cacheRecording(key) : undefined;
    }));
  }

  private cacheRecording(key: string): Promise<void> {
    const id = this.cacheKey(key);
    if (this.recordings.has(id)) return Promise.resolve();
    const existing = this.downloads.get(id);
    if (existing) return existing;
    const work = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      try {
        const r = await fetch(clipUrl(this.base, key, this.repairVersions[key], filesToken()), { signal: controller.signal });
        if (!r.ok || !/^(audio\/|application\/octet-stream)/i.test(r.headers.get("content-type") ?? "")) return;
        const blob = await r.blob();
        if (!blob.size || blob.size > 2 * 1024 * 1024) return;
        // WebKit routes blob: media through its network process, which can refuse it when
        // actually offline. A bounded in-memory data URL plays without that network dependency.
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = "";
        for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
        this.recordings.set(id, `data:${blob.type.startsWith("audio/") ? blob.type : "audio/mpeg"};base64,${btoa(binary)}`);
        if (this.recordings.size > 64) this.recordings.delete(this.recordings.keys().next().value!);
      } catch { /* warming a clip never interrupts the conversation */ }
      finally { clearTimeout(timer); }
    })().finally(() => { this.downloads.delete(id); });
    this.downloads.set(id, work);
    return work;
  }

  private async recordingBuffer(key: string, slow: boolean): Promise<AudioBuffer> {
    const id = `${this.cacheKey(key)}${slow ? "#slow" : ""}`;
    const cached = this.buffers.get(id);
    if (cached) return cached;
    const pending = this.decodings.get(id);
    if (pending) return pending;
    const work = (async () => {
      const OAC = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
      if (!OAC) throw { name: "OfflineDecoderUnavailable" };
      this.decoder ??= new OAC(1, 1, 44100);
      let buffer: AudioBuffer;
      if (slow) {
        const original = await this.recordingBuffer(key, false);
        const channels = stretchSpeech(Array.from({ length: original.numberOfChannels }, (_, i) => original.getChannelData(i)), original.sampleRate, 0.82);
        buffer = this.decoder.createBuffer(channels.length, channels[0].length, original.sampleRate);
        channels.forEach((channel, i) => buffer.getChannelData(i).set(channel));
      } else {
        await this.cacheRecording(key);
        const source = this.recordings.get(this.cacheKey(key));
        if (!source) throw { name: "RecordingUnavailable" };
        const response = await fetch(source);
        buffer = await this.decoder.decodeAudioData(await response.arrayBuffer());
      }
      if (!Number.isFinite(buffer.duration) || buffer.duration <= 0 || buffer.duration > 180) throw { name: "InvalidRecordingDuration" };
      const bytes = buffer.length * buffer.numberOfChannels * Float32Array.BYTES_PER_ELEMENT;
      const limit = 24 * 1024 * 1024;
      while (this.buffers.size && this.bufferBytes + bytes > limit) {
        const [oldId, old] = this.buffers.entries().next().value!;
        this.buffers.delete(oldId); this.bufferBytes -= old.length * old.numberOfChannels * Float32Array.BYTES_PER_ELEMENT;
      }
      if (bytes <= limit) { this.buffers.set(id, buffer); this.bufferBytes += bytes; }
      return buffer;
    })().finally(() => { this.decodings.delete(id); });
    this.decodings.set(id, work);
    return work;
  }

  /** The same authenticated MP3, decoded once and sent through the existing Web Audio
   *  context. No HTML media play/pause and no automatic pipeline/voice fallback on iOS. */
  private playBufferRecording(request: PlaybackRequest, key: string, text: string, opts: { slow?: boolean; male?: boolean }) {
    this.lastRecordingKey = key;
    let disposed = false, run = 0, playing = false;
    let buffer: AudioBuffer | null = null, ctx: AudioContext | null = null;
    let source: AudioBufferSourceNode | null = null, gain: GainNode | null = null;
    let offset = 0, startedAt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let releaseRoute: (() => void) | undefined;
    const current = () => !disposed && !request.done;
    const position = () => Math.min(buffer?.duration ?? 0, offset + (playing && ctx ? Math.max(0, ctx.currentTime - startedAt) : 0));
    const envelopeKey = `${key}${opts.slow ? "#slow" : ""}`;
    const clip = { key, done: false, position, envelopeKey };
    this.clip = clip;
    const diagnostic = (event: string, error?: unknown) => audioDiagnostic(event, {
      clipId: key, pipeline: "buffer", currentTime: position(), duration: buffer?.duration,
      volume: this.volume, playbackRate: 1, contextState: ctx?.state, contextTime: ctx?.currentTime,
      ...(error ? { error: diagnosticError(error) } : {}), ...microphoneHandoffState(), ...audioSessionSnapshot(),
    });
    const stopOutput = () => {
      offset = position(); playing = false;
      if (source) { source.onended = null; try { source.stop(); } catch { /* not started/already ended */ } source.disconnect(); source = null; }
      gain?.disconnect(); gain = null;
      releaseRoute?.(); releaseRoute = undefined;
    };
    const waiting = (state: "blocked" | "unavailable", error?: unknown) => {
      if (!current()) return;
      run++; clearTimeout(timer); stopOutput();
      request.fail(state); diagnostic(`buffer.${state}`, error);
    };
    const interrupted = () => {
      if (current() && playing && ctx?.state !== "running") waiting(ctx?.state === "closed" ? "unavailable" : "blocked", "ContextInterrupted");
    };
    const hidden = () => { if (document.hidden && current()) waiting("blocked", "PageHidden"); };
    const pagehide = () => { if (current()) waiting("blocked", "PageHidden"); };
    const cleanup = () => {
      if (disposed) return;
      disposed = true; run++; clip.done = true;
      clearTimeout(timer); stopOutput();
      ctx?.removeEventListener("statechange", interrupted);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", pagehide);
    };
    request.cleanup = cleanup;
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", pagehide);
    const start = () => {
      if (!current() || !buffer || playing) return;
      const attempt = ++run;
      clearTimeout(timer);
      if (document.hidden) { waiting("blocked", "PageHidden"); return; }
      if (!playbackRoute(true)) {
        void waitForMicrophone().then(() => { if (current() && attempt === run) start(); });
        return;
      }
      ctx?.removeEventListener("statechange", interrupted);
      try { ctx = this.ac(false); }
      catch (error) { waiting("unavailable", error); return; }
      if (!ctx) { waiting("unavailable", "AudioContextUnavailable"); return; }
      ctx.addEventListener("statechange", interrupted);
      this.setState("loading");
      const launch = () => {
        if (!current() || attempt !== run || !ctx || !buffer) return;
        if (document.hidden || ctx.state !== "running") { waiting("blocked", "ContextNotRunning"); return; }
        // A microphone can start while resume() is pending. Recheck at the actual
        // source start, and let cancellation invalidate this awaited handoff.
        if (microphoneHandoffState().captures) {
          void waitForMicrophone().then(() => { if (current() && attempt === run) start(); });
          return;
        }
        clearTimeout(timer);
        try {
          source = ctx.createBufferSource(); gain = ctx.createGain();
          const active = source;
          source.buffer = buffer; source.playbackRate.value = 1;
          gain.gain.value = this.volume;
          source.connect(gain); gain.connect(ctx.destination);
          source.onended = () => {
            if (!current() || source !== active || attempt !== run) return;
            // stop()/interruption can also produce ended. Only the context's
            // rendered clock reaching this source's end completes the NPC line.
            if (position() + 128 / ctx!.sampleRate < buffer!.duration) { waiting("blocked", "EarlyBufferEnd"); return; }
            diagnostic("buffer.ended"); request.finish(true, true);
          };
          releaseRoute = holdPlaybackRoute();
          startedAt = ctx.currentTime; playing = true;
          source.start(0, offset);
          if (request.visual) {
            request.visualStartedAt = 0;
            request.visualVolume = gain.gain.value;
          }
          this.setState("playing"); diagnostic("buffer.playing");
          timer = setTimeout(() => waiting("blocked", "PlaybackTimeout"), (buffer.duration - offset) * 1000 + 5000);
        } catch (error) { waiting("unavailable", error); }
      };
      diagnostic("buffer.play-request");
      // Call resume synchronously from Retry's tap. A hanging promise cannot start
      // after Stop, another line, a new attempt, or the visible recovery timeout.
      timer = setTimeout(() => waiting("blocked", "ContextResumeTimeout"), 5000);
      if (ctx.state === "running") launch();
      else { try { void ctx.resume().then(launch, (error) => { if (current() && attempt === run) waiting("blocked", error); }); } catch (error) { waiting("blocked", error); } }
    };
    const load = () => {
      if (!current()) return;
      const attempt = ++run;
      clearTimeout(timer); this.setState("loading");
      diagnostic("buffer.load");
      timer = setTimeout(() => { if (current() && attempt === run) waiting("unavailable", "RecordingLoadTimeout"); }, 15000);
      void this.recordingBuffer(key, !!opts.slow).then((decoded) => {
        if (!current() || attempt !== run) return;
        clearTimeout(timer); buffer = decoded;
        this.envelope(envelopeKey, decoded);
        start();
      }, (error) => { if (current() && attempt === run) waiting("unavailable", error); });
    };
    request.retry = () => { if (buffer) start(); else load(); };
    request.fallback = () => { cleanup(); this.speakFallback(request, text, opts); };
    load();
  }

  private playRecording(request: PlaybackRequest, key: string, text: string, opts: { slow?: boolean; male?: boolean }, file?: string) {
    if (!file) this.lastRecordingKey = key;
    const a = this.media();
    const attempt = (retry: boolean) => {
      if (request.done) return;
      const cached = file ? undefined : this.recordings.get(this.cacheKey(key));
      // Keep the gesture-unlocked element across every sentence, retry, and offline recording.
      a.src = file ? this.base + file : cached ?? clipUrl(this.base, key, this.repairVersions[key], filesToken());
      a.volume = this.volume;
      a.preservesPitch = true;
      a.playbackRate = opts.slow ? 0.82 : 1;
      const clip = { el: a, key, done: false };
      this.clip = clip;
      request.visualStartedAt = undefined;
      request.visualVolume = undefined;
      let disposed = false;
      let started = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let playAttempt = 0;
      let releaseRoute: (() => void) | undefined;
      const releasePlayback = () => { releaseRoute?.(); releaseRoute = undefined; };
      const current = () => !disposed && !request.done;
      const cleanup = (clearSource = false) => {
        if (disposed) return;
        disposed = true; clip.done = true;
        clearTimeout(timer);
        a.onended = a.onerror = a.onplaying = a.onpause = null;
        a.pause();
        if (clearSource) { a.removeAttribute("src"); a.load(); }
        releasePlayback();
      };
      request.cleanup = () => cleanup(true);
      const waiting = (state: "blocked" | "unavailable") => {
        if (!current()) return;
        clearTimeout(timer);
        if (a.paused || a.ended) releasePlayback();
        request.fail(state);
      };
      const failed = () => {
        if (!current()) return;
        if (file) { waiting("unavailable"); return; }
        if (cached) this.recordings.delete(this.cacheKey(key));
        if (!retry && !started) { cleanup(true); attempt(true); return; }
        // A network error is visible. Keep the NPC's recorded voice unless the learner chooses otherwise.
        request.retry = () => { cleanup(true); attempt(false); };
        waiting("unavailable");
      };
      const start = () => {
        if (!current()) return;
        const run = ++playAttempt;
        clearTimeout(timer);
        this.setState("loading");
        if (a.paused || a.ended) releasePlayback();
        // Initialization/downloads and the phone's capture service are asynchronous. Claim
        // playback at the actual play call as well, without making a tap retry asynchronous.
        if (!playbackRoute(true)) {
          void waitForMicrophone().then(() => { if (current() && run === playAttempt) start(); });
          return;
        }
        releaseRoute ??= holdPlaybackRoute();
        timer = setTimeout(failed, 10000);
        // This call stays synchronous for a retry from a user gesture.
        this.recordMediaDiagnostic("media.play-request");
        void a.play().catch((error) => {
          if (!current() || run !== playAttempt) return;
          if (error?.name === "NotAllowedError" || error?.name === "AbortError") waiting("blocked");
          else failed();
        });
      };
      request.retry = start;
      if (!file) request.fallback = () => {
        if (!current()) return;
        cleanup(true);
        this.speakFallback(request, text, opts);
      };
      a.onended = () => {
        // A queued event from an earlier source can reach this reused element.
        // Only its current playback state can confirm that this line has ended.
        if (!current() || !a.ended) return;
        if (!file) cleanup();
        request.finish(true, true);
      };
      a.onerror = failed;
      a.onpause = () => { if (current() && started && a.paused && !a.ended) waiting("blocked"); };
      a.onplaying = () => {
        if (!current()) return;
        // This event arrives after output starts. A category reset here can reconfigure
        // native audio mid-sentence; recovery is confined to start(), before play().
        releaseRoute ??= holdPlaybackRoute();
        started = true;
        if (request.visual) request.visualStartedAt = 0;
        this.unlocked = true;
        this.setState("playing");
        clearTimeout(timer);
        // A stalled/backgrounded line must never be counted as successfully spoken.
        const remaining = Math.max(0, ((file ? a.duration : this.manifest[key]) || 4) - a.currentTime);
        timer = setTimeout(() => waiting("blocked"), remaining / a.playbackRate * 1000 + 5000);
        if (!file) {
          const cached = this.cacheRecording(key);
          if (request.visual) void cached.then(() => {
            const data = this.recordings.get(this.cacheKey(key));
            if (current() && data) void this.loudness(key, data);
          });
        }
      };
      start();
    };
    attempt(false);
  }

  /** How loud the line playing now is at this moment (0–1), for the speaker's mouth; -1 once it has ended; null when
   *  that isn't known (the browser's own voice, or the clip's loudness could not be worked out). */
  level(prepare = true): number | null {
    const c = this.clip;
    if (!c) return null;
    if (c.done || c.el?.ended) return -1;
    const time = c.position?.() ?? c.el?.currentTime ?? 0;
    const key = c.envelopeKey ?? c.key;
    // worked out only for lines someone's mouth follows (not the example answers)
    if (prepare && !this.envelopes.has(key) && c.el) this.loudness(key, c.el.src);
    const env = this.envelopes.get(key);
    // still being worked out: the mouth stays shut until the voice starts, then keeps a rhythm
    if (env === null) return time < 0.05 ? 0 : null;
    if (!env?.length) return null;
    return env[Math.min(env.length - 1, Math.floor(time * ENVELOPE_RATE))] ?? 0;
  }

  /** How round the sound of the line playing now is at this moment (0: wide, as in "ee"; 1: round, as in "oo"), for
   *  the shape of the speaker's mouth; null when that isn't known (see level()). */
  vowel(): number | null {
    const c = this.clip;
    if (!c || c.done || c.el?.ended) return null;
    const v = this.vowels.get(c.envelopeKey ?? c.key);
    if (!v?.length) return null;
    const time = c.position?.() ?? c.el?.currentTime ?? 0;
    return v[Math.min(v.length - 1, Math.floor(time * ENVELOPE_RATE))] ?? null;
  }

  /** Works out a clip's loudness, 30 times a second, from a second copy of the file (decoded, never played: the voice
   *  itself keeps playing through the <audio> element as before). It costs one more small download; when it fails
   *  (no fetch, no decoder) the mouth keeps its rhythm. */
  private async loudness(key: string, url: string) {
    if (this.envelopes.has(key)) return;
    this.envelopes.set(key, null);
    const failed = () => this.envelopes.set(key, new Float32Array(0));
    try {
      const OAC = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
      if (!OAC) return failed();
      let bytes: ArrayBuffer;
      if (url.startsWith("data:")) {
        const data = atob(url.slice(url.indexOf(",") + 1));
        const decoded = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) decoded[i] = data.charCodeAt(i);
        bytes = decoded.buffer;
      } else {
        const r = await fetch(url);
        if (!r.ok) return failed();
        bytes = await r.arrayBuffer();
      }
      this.decoder ??= new OAC(1, 1, 44100);
      const dec = this.decoder;
      // (the browser also rejects the promise it returns: the error callback has it already, so that one is let go)
      const buf = await new Promise<AudioBuffer>((res, rej) => { void (dec.decodeAudioData(bytes, res, rej) as Promise<AudioBuffer> | undefined)?.catch(() => {}); });
      this.envelope(key, buf);
    } catch { failed(); /* the mouth keeps its rhythm */ }
  }

  private envelope(key: string, buf: AudioBuffer) {
    if (this.envelopes.get(key)?.length) return;
    const data = buf.getChannelData(0), step = buf.sampleRate / ENVELOPE_RATE;
    const env = new Float32Array(Math.ceil(data.length / step)), bright = new Float32Array(env.length);
    // (a sample apart, so the measure is the same at any sample rate: about 0.18 ms)
    const lag = Math.max(1, Math.round(buf.sampleRate / 5500));
    for (let i = 0; i < env.length; i++) {
      let sum = 0, diff = 0;
      const a = Math.floor(i * step), b = Math.min(data.length, Math.floor((i + 1) * step));
      for (let j = a; j < b; j++) {
        sum += data[j] * data[j];
        // how fast the wave changes against how big it is: small for a dark sound ("oo", "oh", "m"), big for a
        // bright one ("ee", "s")
        const d = data[j] - (j >= lag ? data[j - lag] : 0);
        diff += d * d;
      }
      env[i] = Math.sqrt(sum / Math.max(1, b - a));
      bright[i] = sum > 0 ? Math.sqrt(diff / sum) : 0;
    }
    // as loud as the line gets (its 90th percentile, so one peak doesn't decide it) is a wide-open mouth; quiet
    // breaths and room noise keep it shut
    const peak = Float32Array.from(env).sort()[Math.floor(env.length * 0.9)] || 1;
    for (let i = 0; i < env.length; i++) { const v = env[i] / peak; env[i] = v < 0.12 ? 0 : Math.min(1, (v - 0.12) / 0.75); }
    // the sound's roundness, against this voice's own range (its darkest and brightest voiced moments), smoothed a
    // little: each voice has its own pitch and colour
    const voiced = Array.from(bright).filter((_, i) => env[i] > 0.15).sort((x, y) => x - y);
    if (voiced.length >= 4) {
      const lo = voiced[Math.floor(voiced.length * 0.12)], hi = voiced[Math.floor(voiced.length * 0.88)];
      const round = new Float32Array(env.length);
      for (let i = 0; i < env.length; i++) round[i] = hi > lo ? 1 - Math.min(1, Math.max(0, (bright[i] - lo) / (hi - lo))) : 0.4;
      const smooth = new Float32Array(env.length);
      for (let i = 0; i < env.length; i++) smooth[i] = (round[Math.max(0, i - 1)] + 2 * round[i] + round[Math.min(env.length - 1, i + 1)]) / 4;
      if (this.vowels.size > 300) this.vowels.delete(this.vowels.keys().next().value!);
      this.vowels.set(key, smooth);
    }
    if (this.envelopes.size > 300) this.envelopes.delete(this.envelopes.keys().next().value!);
    this.envelopes.set(key, env);
  }

  private speakFallback(request: PlaybackRequest, text: string, opts: { slow?: boolean; male?: boolean; localVoiceOnly?: boolean; fallbackLang?: string }, reason: "manifest-miss" | "explicit-choice" = "explicit-choice") {
    this.clip = null;
    request.visualStartedAt = undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let playAttempt = 0;
    request.cleanup = () => { playAttempt++; clearTimeout(timer); };
    request.fallback = undefined;
    const start = () => {
      if (request.done) return;
      audioDiagnostic("voice.browser-request", { reason });
      const run = ++playAttempt;
      if (!playbackRoute(true)) {
        void waitForMicrophone().then(() => { if (!request.done && run === playAttempt) start(); });
        return;
      }
      const localOnly = opts.localVoiceOnly || typeof navigator === "undefined" || !navigator.onLine;
      const eligible = localOnly ? this.fallbackVoices.filter((v) => v.localService) : this.fallbackVoices;
      const language = opts.fallbackLang?.toLowerCase();
      const preferred = eligible.filter((v) => v.lang.toLowerCase().replace("_", "-") === language);
      const regional = EDITION.id === "es" ? eligible.filter((v) => VOICE_LANG.test(v.lang)) : [];
      const vs = preferred.length ? preferred : regional.length ? regional : eligible;
      if (typeof speechSynthesis === "undefined" || (localOnly && !vs.length)) {
        request.fail("unavailable");
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = opts.fallbackLang ?? EDITION.target;
      u.rate = opts.slow ? 0.78 : 0.95;
      u.volume = this.volume;
      const pick = vs.find((v) => (opts.male ? /(male|daniel|fred|alex|aaron|arthur|guy|david|mark)/i : /(female|samantha|victoria|allison|ava|susan|zira|aria|jenny)/i).test(v.name) && v.localService)
        ?? vs.find((v) => v.localService) ?? vs[0];
      if (pick) { u.voice = pick; u.lang = pick.lang; }
      let ended = false;
      const waiting = () => { clearTimeout(timer); request.fail("blocked"); };
      u.onend = () => { ended = true; request.finish(true, true); };
      if (request.visual) u.onstart = () => {
        if (!request.done && run === playAttempt) {
          request.visualStartedAt = performance.now();
          request.visualVolume = u.volume;
        }
      };
      u.onerror = waiting;
      const releaseRoute = holdPlaybackRoute();
      request.cleanup = () => {
        playAttempt++; clearTimeout(timer); u.onend = u.onerror = null;
        if (request.visual) { u.onstart = null; request.visualStartedAt = undefined; }
        if (!ended || !request.optional) speechSynthesis.cancel();
        releaseRoute();
      };
      this.setState("playing");
      audioDiagnostic("voice.browser-start", { reason });
      timer = setTimeout(waiting, 1500 + text.length * 120);
      try { speechSynthesis.speak(u); } catch (error) {
        if (!request.optional) throw error;
        waiting();
      }
    };
    request.retry = () => { request.cleanup(); start(); };
    start();
  }

  stop() {
    this.request?.finish(false);
  }

  private recordMediaDiagnostic(event: string) {
    if (!audioDiagnosticsEnabled() || !this.player) return;
    const a = this.player;
    audioDiagnostic(event, {
      clipId: this.diagnosticState.status === "playing" ? this.diagnosticState.clipId : this.clip?.key,
      currentTime: a.currentTime, duration: a.duration, volume: a.volume, muted: a.muted,
      readyState: a.readyState, playbackRate: a.playbackRate, paused: a.paused, ended: a.ended,
      mediaError: a.error?.code ?? null, ...microphoneHandoffState(), ...audioSessionSnapshot(),
    });
  }

  /** Freeze one already requested, protected recording for both methods. Decode offline: preparing
   *  must not create a live output context or change the phone's audio route. */
  async prepareDiagnosticComparison() {
    if (!audioDiagnosticsEnabled()) return;
    this.stopDiagnostic("prepare");
    const run = ++this.diagnosticRun, key = this.lastRecordingKey;
    this.diagnosticSelection = null;
    this.setDiagnosticState({ status: "preparing", clipId: key, volume: this.volume, pipeline: null, error: undefined });
    if (!key) { this.setDiagnosticState({ status: "empty", error: "no-recording" }); return; }
    const volume = this.volume;
    audioDiagnostic("comparison.prepare", { clipId: key, volume });
    try {
      await this.cacheRecording(key);
      if (run !== this.diagnosticRun) return;
      const source = this.recordings.get(this.cacheKey(key));
      if (!source) throw { name: "RecordingUnavailable" };
      // Only the bounded, in-memory data URL is read here. No new provider or public clip URL.
      const response = await fetch(source);
      const bytes = await response.arrayBuffer();
      const byteLength = bytes.byteLength;
      if (run !== this.diagnosticRun) return;
      const OAC = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
      if (!OAC) throw { name: "OfflineDecoderUnavailable" };
      this.decoder ??= new OAC(1, 1, 44100);
      const buffer = await this.decoder!.decodeAudioData(bytes);
      if (run !== this.diagnosticRun) return;
      if (!buffer.duration || buffer.duration > 30) throw { name: "RecordingTooLong" };
      this.diagnosticSelection = { key, source, buffer, volume };
      this.setDiagnosticState({ status: "ready", clipId: key, volume, pipeline: null, error: undefined });
      audioDiagnostic("comparison.ready", { clipId: key, volume, duration: buffer.duration, bytes: byteLength });
    } catch (error) {
      if (run !== this.diagnosticRun) return;
      this.setDiagnosticState({ status: "unavailable", error: diagnosticError(error) });
      audioDiagnostic("comparison.prepare-error", { clipId: key, error: diagnosticError(error) });
    }
  }

  /** Direct tap only. Both paths use the same frozen bytes, requested volume and speed 1.
   *  This intentionally does not set audioSession.type: a category reset would contaminate the comparison.
   *  Matching requested gain does not establish matching physical loudness on iOS. */
  playDiagnostic(pipeline: DiagnosticPipeline) {
    if (!audioDiagnosticsEnabled() || !this.diagnosticSelection) return false;
    if (this.request || microphoneHandoffState().captures) {
      audioDiagnostic("comparison.busy", { pipeline, ...microphoneHandoffState() });
      return false;
    }
    this.stopDiagnostic("replace");
    const selected = this.diagnosticSelection, run = ++this.diagnosticRun;
    // Do not let a late recognition end reconfigure either comparison while it is audible.
    // This hold itself does not claim a category or change the A/B output route.
    const releaseRoute = holdPlaybackRoute();
    let disposed = false, timer: ReturnType<typeof setTimeout> | undefined;
    let cleanup = () => {};
    const current = () => !disposed && run === this.diagnosticRun;
    const finish = (status: "ready" | "blocked" | "unavailable", error?: unknown) => {
      if (!current()) return;
      disposed = true;
      clearTimeout(timer);
      cleanup();
      releaseRoute();
      this.diagnosticCleanup = null;
      this.setDiagnosticState({ status, error: error ? diagnosticError(error) : undefined });
      audioDiagnostic(status === "ready" ? "comparison.ended" : "comparison.error", {
        pipeline, clipId: selected.key, volume: selected.volume, ...(error ? { error: diagnosticError(error) } : {}),
      });
    };
    this.diagnosticCleanup = () => { disposed = true; clearTimeout(timer); cleanup(); releaseRoute(); };
    this.setDiagnosticState({ status: "playing", pipeline, error: undefined });
    audioDiagnostic("comparison.play-request", { pipeline, clipId: selected.key, volume: selected.volume, playbackRate: 1, ...microphoneHandoffState(), ...audioSessionSnapshot() });
    timer = setTimeout(() => finish("blocked", "PlaybackTimeout"), Math.max(8000, selected.buffer.duration * 1000 + 5000));
    if (pipeline === "html") {
      const a = this.media();
      const ended = () => finish("ready");
      const error = () => finish("unavailable", "MediaError");
      a.addEventListener("ended", ended);
      a.addEventListener("error", error);
      cleanup = () => { a.removeEventListener("ended", ended); a.removeEventListener("error", error); a.pause(); a.removeAttribute("src"); a.load(); };
      a.src = selected.source;
      a.volume = selected.volume;
      a.playbackRate = 1;
      a.preservesPitch = true;
      // Synchronous in the tap, using the game's existing gesture-authorized element.
      try { void a.play().catch((error) => finish("blocked", error)); } catch (error) { finish("blocked", error); }
    } else {
      let ctx: AudioContext | null;
      try {
        ctx = this.ac(false);
        if (!ctx) { finish("unavailable", "AudioContextUnavailable"); return false; }
        const source = ctx.createBufferSource(), gain = ctx.createGain();
        cleanup = () => { source.onended = null; try { source.stop(); } catch { /* not started/already ended */ } source.disconnect(); gain.disconnect(); };
        source.buffer = selected.buffer;
        source.playbackRate.value = 1;
        gain.gain.value = selected.volume;
        source.connect(gain); gain.connect(ctx.destination);
        source.onended = () => finish("ready");
        const start = () => {
          if (!current()) return;
          try { source.start(); audioDiagnostic("comparison.buffer-start", { clipId: selected.key, volume: selected.volume, state: ctx!.state, sampleRate: ctx!.sampleRate }); }
          catch (error) { finish("unavailable", error); }
        };
        // resume() is invoked during the tap; a canceled pending resume must never start later.
        if (ctx.state === "running") start();
        else void ctx.resume().then(start, (error) => finish("blocked", error));
      } catch (error) { finish("unavailable", error); return false; }
    }
    return true;
  }

  stopDiagnostic(reason = "stop") {
    const active = !!this.diagnosticCleanup || this.diagnosticState.status === "preparing";
    this.diagnosticRun++;
    this.diagnosticCleanup?.();
    this.diagnosticCleanup = null;
    if (active) {
      audioDiagnostic("comparison.cancel", { reason, pipeline: this.diagnosticState.pipeline, clipId: this.diagnosticState.clipId });
      this.setDiagnosticState({ status: this.diagnosticSelection ? "ready" : "empty", error: undefined });
    }
  }

  /** The game's one Web Audio context, for another output that must share it (the radio on iPhone, src/radio/
   *  output.ts). Not resumed here: a tap does that (unlock()). */
  context(): AudioContext | null {
    try { return this.ac(false); } catch { return null; }
  }

  private ac(resume = true) {
    if (!this.ctx || this.ctx.state === "closed") {
      // no window (a game rule run in a unit test): no sound, as on a browser without Web Audio
      const AC = typeof window === "undefined" ? undefined : window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      if (audioDiagnosticsEnabled()) {
        this.ctx.addEventListener("statechange", () => audioDiagnostic("context.state", { state: this.ctx?.state, sampleRate: this.ctx?.sampleRate, contextTime: this.ctx?.currentTime }));
        audioDiagnostic("context.create", { state: this.ctx.state, sampleRate: this.ctx.sampleRate });
      }
    }
    if (resume && this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  // ---- The world's sounds (steps, water, the places' ambience) and the effects (a task done, a door, a coin).
  // Both go through a bus of their own, scaled by the "Sounds" setting; the world's bus also falls silent whenever
  // something must be heard or listened to: a conversation or an open panel, a voice, the microphone, a hidden page.
  private worldBus: GainNode | null = null;
  private fxBus: GainNode | null = null;
  private busCtx: AudioContext | null = null;
  private hushed = new Set<string>();
  /** Under the radio's music the places' loops play lower, and the town's own bit of music not at all. */
  private underMusic = 1;
  private buses(ctx: AudioContext) {
    if (this.busCtx !== ctx || !this.worldBus || !this.fxBus) {
      this.busCtx = ctx;
      this.worldBus = ctx.createGain(); this.worldBus.gain.value = this.hushed.size ? 0 : this.soundsLevel / 0.8; this.worldBus.connect(ctx.destination);
      this.fxBus = ctx.createGain(); this.fxBus.gain.value = this.soundsLevel / 0.8; this.fxBus.connect(ctx.destination);
      // a new context: the recordings stay, what played them in the old one does not
      for (const l of this.loops.values()) { l.src = undefined; l.gain = undefined; l.quietSince = undefined; }
    }
  }
  /** Where a sound of the world goes. */
  private out(ctx: AudioContext): AudioNode { this.buses(ctx); return this.worldBus!; }
  /** Where an effect goes. */
  private fx(ctx: AudioContext): AudioNode { this.buses(ctx); return this.fxBus!; }
  private levelBuses(seconds: number) {
    const ctx = this.busCtx;
    if (!ctx || ctx.state === "closed") return;
    const set = (bus: GainNode | null, v: number) => {
      if (!bus) return;
      bus.gain.cancelScheduledValues(ctx.currentTime);
      bus.gain.setTargetAtTime(v, ctx.currentTime, Math.max(0.005, seconds / 3));
    };
    set(this.worldBus, this.hushed.size ? 0 : this.soundsLevel / 0.8);
    set(this.fxBus, this.soundsLevel / 0.8);
  }
  /** The world falls silent for `reason` ("voice", "microphone", "away": a conversation, a panel, a hidden page) and
   *  comes back when no reason is left: softly, or at once (`now`, for the microphone). */
  hush(reason: string, on: boolean, now = false) {
    const was = this.hushed.size > 0;
    if (on) this.hushed.add(reason); else this.hushed.delete(reason);
    if (was !== this.hushed.size > 0) this.levelBuses(on ? (now ? 0.03 : 0.25) : 0.5);
    // a mini-game's bed only steps back for a voice or the microphone (bed, below)
    const duck = this.hushed.has("voice") || this.hushed.has("microphone");
    if (duck !== this.bedDucked) { this.bedDucked = duck; this.levelBed(duck ? 0.2 : 0.9); }
  }

  // ---- A mini-game's bed (soundscape.ts Bed, TOWN_SOUNDS.beds by mode id): its room and its music, looped while the
  // game runs, on the effects side, ducked (not cut) under a voice; the radio waits while its music plays.
  private bedNow: { id: string; parts: { src: AudioBufferSourceNode; gain: GainNode; level: number }[]; music: boolean } | null = null;
  private bedDucked = false;
  private bedFiles = new Map<string, Promise<AudioBuffer>>();
  private bedListeners = new Set<(music: boolean) => void>();
  /** The bed playing now (its mode id), for tests and the radio. */
  get playingBed(): string | null { return this.bedNow?.id ?? null; }
  /** Called with true while a bed's music plays, false when it stops (src/radio holds the radio meanwhile). */
  subscribeBed(listener: (music: boolean) => void) { this.bedListeners.add(listener); return () => { this.bedListeners.delete(listener); }; }
  /** Start the bed of mode `id` (none if the edition has none for it), or stop it (null). */
  bed(id: string | null) {
    if ((this.bedNow?.id ?? null) === id) return;
    this.stopBed();
    const def: Bed | undefined = id ? (TOWN_SOUNDS as { beds?: Partial<Record<string, Bed>> }).beds?.[id] : undefined;
    const ctx = id && def ? this.ac() : null;
    if (!id || !def || !ctx) return;
    const now = { id, parts: [] as { src: AudioBufferSourceNode; gain: GainNode; level: number }[], music: false };
    this.bedNow = now;
    const start = (loop: BedLoop, url: string, music: boolean) => {
      let file = this.bedFiles.get(url);
      if (!file) {
        file = fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
          .then((bytes) => new Promise<AudioBuffer>((done, fail) => { void (ctx.decodeAudioData(bytes, done, fail) as Promise<AudioBuffer> | undefined)?.catch?.(() => {}); }));
        file.catch(() => this.bedFiles.delete(url));
        this.bedFiles.set(url, file);
      }
      file.then((buf) => {
        if (this.bedNow !== now || ctx.state === "closed") return;
        const src = ctx.createBufferSource(), gain = ctx.createGain();
        src.buffer = buf; src.loop = true;
        src.loopStart = loop.start; src.loopEnd = Math.min(loop.end, buf.duration);
        gain.gain.value = 0;
        src.connect(gain); gain.connect(this.fx(ctx));
        src.start(ctx.currentTime, loop.start);
        now.parts.push({ src, gain, level: loop.gain });
        this.levelBed(1.5);
        if (music && !now.music) { now.music = true; for (const listener of this.bedListeners) listener(true); }
      }, () => { /* no file (offline, or not uploaded yet): the game goes on without it */ });
    };
    if (def.room) start(def.room, `${import.meta.env.BASE_URL}sfx/${def.room.file}`, false);
    if (def.music) start(def.music, clipUrl(this.base, def.music.file, undefined, filesToken()), true);
  }
  private levelBed(seconds: number) {
    const ctx = this.busCtx, bed = this.bedNow;
    if (!ctx || !bed || ctx.state === "closed") return;
    for (const p of bed.parts) {
      p.gain.gain.cancelScheduledValues(ctx.currentTime);
      p.gain.gain.setTargetAtTime(this.volume * p.level * (this.bedDucked ? BED_DUCK : 1), ctx.currentTime, Math.max(0.01, seconds / 3));
    }
  }
  private stopBed() {
    const bed = this.bedNow, ctx = this.busCtx;
    this.bedNow = null;
    if (!bed) return;
    for (const p of bed.parts) {
      try {
        if (ctx && ctx.state !== "closed") { p.gain.gain.cancelScheduledValues(ctx.currentTime); p.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.2); p.src.stop(ctx.currentTime + 0.8); }
        else p.src.stop();
      } catch { /* already stopped */ }
      p.src.onended = () => { p.src.disconnect(); p.gain.disconnect(); };
    }
    if (bed.music) for (const listener of this.bedListeners) listener(false);
  }
  /** The radio is playing music (src/radio/index.ts): the places' loops go lower under it. */
  underRadio(playing: boolean) { this.underMusic = playing ? 0.4 : 1; }

  // ---- The places' quiet loops (soundscape.ts LOOPS: the sea, a market's murmur): fetched the first time one is
  // wanted, started when it can be heard, faded with the distance, stopped a few seconds after it has faded out.
  private loops = new Map<LoopName, { buf?: AudioBuffer; loading?: boolean; failed?: boolean; src?: AudioBufferSourceNode; gain?: GainNode; quietSince?: number }>();
  private fetchClip(ctx: AudioContext, file: string): Promise<AudioBuffer> {
    return fetch(`${import.meta.env.BASE_URL}sfx/${file}`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      // the callbacks answer; the promise some browsers also return must not reject unhandled (an empty or broken file)
      .then((bytes) => new Promise<AudioBuffer>((done, fail) => { void (ctx.decodeAudioData(bytes, done, fail) as Promise<AudioBuffer> | undefined)?.catch?.(() => {}); }));
  }
  private loop(name: LoopName, level: number) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return;
    let l = this.loops.get(name);
    if (!l) this.loops.set(name, (l = {}));
    const def = LOOPS[name], state = l;
    if (level > 0.02 && !l.buf && !l.loading && !l.failed) {
      l.loading = true;
      this.fetchClip(ctx, def.file).then((buf) => { state.buf = buf; }, () => { state.failed = true; }).finally(() => { state.loading = false; });
    }
    if (!l.buf) return;
    const now = ctx.currentTime, target = Math.max(0, level) * this.volume * def.gain * this.underMusic;
    if (target > 0.0008 && !l.src) {
      const src = ctx.createBufferSource(), gain = ctx.createGain();
      src.buffer = l.buf; src.loop = true; src.loopStart = def.start; src.loopEnd = def.end;
      gain.gain.value = 0;
      src.connect(gain); gain.connect(this.out(ctx));
      // from anywhere in the loop, so two visits to the shore do not begin with the same wave
      src.start(now, def.start + Math.random() * (def.end - def.start));
      l.src = src; l.gain = gain;
    }
    if (!l.src || !l.gain) return;
    l.gain.gain.setTargetAtTime(target, now, 0.7);
    if (target > 0.0008) l.quietSince = undefined;
    else if (l.quietSince === undefined) l.quietSince = now;
    else if (now - l.quietSince > 4) this.endLoop(l, 0);
  }
  private endLoop(l: { src?: AudioBufferSourceNode; gain?: GainNode; quietSince?: number }, fade: number) {
    const ctx = this.ctx, src = l.src, gain = l.gain;
    l.src = undefined; l.gain = undefined; l.quietSince = undefined;
    if (!src || !gain) return;
    try {
      if (ctx && fade > 0) { gain.gain.cancelScheduledValues(ctx.currentTime); gain.gain.setTargetAtTime(0, ctx.currentTime, fade / 3); src.stop(ctx.currentTime + fade); }
      else src.stop();
    } catch { /* already stopped */ }
    src.onended = () => { src.disconnect(); gain.disconnect(); };
  }

  // ---- Tropical birds (soundscape.ts BIRDSONG): a few seconds of the recording now and then, from a different
  // place in it each time.
  private birdsongClip: { buf?: AudioBuffer; loading?: boolean; failed?: boolean } | null = null;
  private birdsong(at: number, vol: number) {
    const ctx = this.ctx!;
    const clip = (this.birdsongClip ??= {});
    if (!clip.buf) {
      if (!clip.loading && !clip.failed) {
        clip.loading = true;
        this.fetchClip(ctx, BIRDSONG.file).then((buf) => { clip.buf = buf; }, () => { clip.failed = true; }).finally(() => { clip.loading = false; });
      }
      return false;
    }
    const len = 2.2 + Math.random() * 1.6, from = 0.3 + Math.random() * Math.max(0.1, Math.min(clip.buf.duration, BIRDSONG.length) - len - 0.6);
    const src = ctx.createBufferSource(); src.buffer = clip.buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol * BIRDSONG.gain, at + 0.35);
    g.gain.setValueAtTime(vol * BIRDSONG.gain, at + len - 0.6);
    g.gain.linearRampToValueAtTime(0, at + len);
    src.connect(g); g.connect(this.out(ctx));
    this.trackAmbient([src], [src, g]);
    src.start(at, from, len + 0.05);
    return true;
  }

  private noise: AudioBuffer | null = null;
  private surfTarget = 0;
  private windTarget = 0;

  seaSoundTargets() { return { surf: this.surfTarget, wind: this.windTarget }; }
  private amb: { nextGull: number; nextBird: number; nextClink: number; nextBell: number; nextHorn: number; nextTune: number } | null = null;
  private ambientSounds = new Set<() => void>();

  /** Environmental sounds belong to the visible town, never the conversation or a background tab. */
  stopAmbience() {
    this.surfTarget = 0;
    for (const stop of this.ambientSounds) stop();
    for (const l of this.loops.values()) this.endLoop(l, 0.35);
    this.amb = null;
  }

  private trackAmbient(sources: AudioScheduledSourceNode[], nodes: AudioNode[]) {
    const stop = () => {
      for (const source of sources) {
        source.onended = null;
        try { source.stop(); } catch { /* already ended */ }
      }
      for (const node of nodes) node.disconnect();
      this.ambientSounds.delete(stop);
    };
    this.ambientSounds.add(stop);
    sources[0].onended = stop;
  }

  /** The town's sounds where the player stands, asked for about eight times a second (Game.ts). Brief, recognizable
   *  sounds at random moments (gulls, birds, a cup, the harbour's bell), and two quiet recorded loops that rise and
   *  fall with the distance (the surf, a market's murmur). A continuous bed of filtered noise was tried once and
   *  sounded like hiss; the loops are recordings.
   *  `sea` 0–1: how near the sea is, for the gulls; `surf` 0–1: the surf's loudness; `market`, `harbor`, `plaza` 0–1:
   *  how near those are; `tropical`: Puerto Colibrí's birds and its bit of far-off music instead of Maple Harbor's. */
  ambience(on: boolean, { sea = 0, surf = 0, gulls = false, birds = 0, cafe = false, market = 0, harbor = 0, plaza = 0, tropical = false }:
    { sea?: number; surf?: number; gulls?: boolean; birds?: number; cafe?: boolean; market?: number; harbor?: number; plaza?: number; tropical?: boolean } = {}) {
    const ctx = this.ctx;
    this.surfTarget = on ? surf : 0;
    const live = on && !globalThis.document?.hidden && this.volume > 0 && this.soundsLevel > 0 && !!ctx && ctx.state === "running";
    this.hush("away", !live);
    if (!live) {
      this.stopAmbience();
      return;
    }
    const now = ctx.currentTime, v = this.volume;
    this.amb ??= { nextGull: now + 4, nextBird: now + 2, nextClink: now + 3, nextBell: now + 5, nextHorn: now + 40 + Math.random() * 40, nextTune: now + 12 + Math.random() * 15 };
    this.loop("sea", surf);
    this.loop("market", market);
    if (gulls && now > this.amb.nextGull) {
      this.amb.nextGull = now + 6 + Math.random() * 9;
      const calls = 1 + Math.floor(Math.random() * 3);
      for (let k = 0; k < calls; k++) this.gull(now + k * 0.42, v * 0.035 * Math.max(0.4, sea));
    }
    // birdsong among the trees: a few quick chirps now and then; in the tropical town, a few seconds of its birds
    if (birds > 0.05 && now > this.amb.nextBird) {
      if (tropical && Math.random() < 0.6 && this.birdsong(now + 0.05, v * Math.min(1, 0.45 + birds * 0.55))) {
        this.amb.nextBird = now + (9 + Math.random() * 14) / Math.max(0.4, birds);
      } else {
        this.amb.nextBird = now + (2.5 + Math.random() * 6) / Math.max(0.3, birds);
        const n = 2 + Math.floor(Math.random() * 4), top = 3200 + Math.random() * 1800;
        for (let k = 0; k < n; k++) this.chirp(now + k * (0.09 + Math.random() * 0.05), top * (0.92 + Math.random() * 0.16), v * 0.022 * birds);
      }
    }
    if (cafe && now > this.amb.nextClink) {
      this.amb.nextClink = now + 3 + Math.random() * 6;
      this.clink(now + Math.random() * 0.2, v * 0.03);
    }
    // by the pier: a buoy's bell rocking on the swell, and once in a long while a boat's horn far out
    if (harbor > 0.25 && now > this.amb.nextBell) {
      this.amb.nextBell = now + 9 + Math.random() * 16;
      this.bell(now + Math.random() * 0.3, v * 0.022 * harbor);
      if (Math.random() < 0.5) this.bell(now + 0.9 + Math.random() * 0.5, v * 0.014 * harbor);
    }
    if (harbor > 0.4 && now > this.amb.nextHorn) {
      this.amb.nextHorn = now + 70 + Math.random() * 90;
      this.horn(now + 0.2, v * 0.02);
    }
    // on the square: a few notes of music from somewhere down a street (not under the radio's own music)
    if (plaza > 0.3 && this.underMusic === 1 && now > this.amb.nextTune) {
      this.amb.nextTune = now + 28 + Math.random() * 30;
      this.tune(now + 0.2, v * 0.017 * plaza, tropical);
    }
  }

  /** A buoy's bell: one soft, clear note that rings on. */
  private bell(at: number, vol: number) {
    const ctx = this.ctx!;
    const f = 660 * (0.98 + Math.random() * 0.04);
    for (const [mult, level, ring] of [[1, 1, 1.9], [2.76, 0.35, 1.1], [5.4, 0.12, 0.6]] as const) {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f * mult;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(vol * level, at + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, at + ring);
      o.connect(g); g.connect(this.out(ctx));
      this.trackAmbient([o], [o, g]);
      o.start(at); o.stop(at + ring + 0.05);
    }
  }

  /** A boat's horn far out: one low, soft, long note. */
  private horn(at: number, vol: number) {
    const ctx = this.ctx!;
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 420; f.Q.value = 0.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.25);
    g.gain.setValueAtTime(vol, at + 1.1);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 1.9);
    const tones = [116, 146].map((hz) => { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = hz; o.connect(f); return o; });
    f.connect(g); g.connect(this.out(ctx));
    this.trackAmbient(tones, [...tones, f, g]);
    for (const o of tones) { o.start(at); o.stop(at + 2); }
  }

  /** A few notes of music from down a street, muffled by the distance: plucked, on a five-note scale (a marimba's in
   *  the tropical town, a music box's in the other). Never a tune anyone knows: the notes are picked afresh. */
  private tune(at: number, vol: number, tropical: boolean) {
    const ctx = this.ctx!;
    const scale = tropical ? [392, 440, 523.25, 587.33, 659.25, 784] : [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
    const beat = tropical ? 0.19 : 0.26, n = 5 + Math.floor(Math.random() * 4);
    const far = ctx.createBiquadFilter(); far.type = "lowpass"; far.frequency.value = tropical ? 1500 : 2200; far.Q.value = 0.3;
    const g = ctx.createGain(); g.gain.value = 1;
    far.connect(g); g.connect(this.out(ctx));
    const notes: OscillatorNode[] = [], nodes: AudioNode[] = [far, g];
    let i = Math.floor(Math.random() * scale.length), t = at;
    for (let k = 0; k < n; k++) {
      i = Math.max(0, Math.min(scale.length - 1, i + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
      for (const [mult, level, ring] of (tropical ? [[1, 1, 0.42], [4, 0.18, 0.12]] : [[1, 1, 0.7], [3, 0.1, 0.3]]) as [number, number, number][]) {
        const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = scale[i] * mult;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0, t);
        ng.gain.linearRampToValueAtTime(vol * level, t + 0.006);
        ng.gain.exponentialRampToValueAtTime(0.0001, t + ring);
        o.connect(ng); ng.connect(far);
        o.start(t); o.stop(t + ring + 0.05);
        notes.push(o); nodes.push(o, ng);
      }
      t += beat * (Math.random() < 0.25 ? 2 : 1);
    }
    // the last note to end frees them all
    const last = notes[notes.length - 2];
    this.trackAmbient([last, ...notes.filter((o) => o !== last)], nodes);
  }

  /** When the town's own sounds (townSounds) come next. */
  private town: { bell: number; vendor: number; truck: number } | null = null;

  /** A town's own sounds, on top of the sea, the cars and the birds (theme.ts `sounds`; Maple Harbor has none), made
   *  on the spot like the gulls: its church bell ringing a few strokes now and then, the street vendors round the
   *  square (the knife grinder's pan pipe, the ice-cream cart's little bells, the camote cart's steam whistle), and in
   *  the streets of houses the gas truck's tune or the garbage truck's hand bell going by. The levels (0–1) say how
   *  near each one is; `on` false (indoors, in a conversation) starts nothing new. */
  townSounds(on: boolean, lv: { bell: number; vendors: number; homes: number }) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return;
    const now = ctx.currentTime;
    this.town ??= { bell: now + 6, vendor: now + 4, truck: now + 10 };
    const t = this.town;
    if (!on || this.volume <= 0) { t.bell = Math.max(t.bell, now + 2); t.vendor = Math.max(t.vendor, now + 2); t.truck = Math.max(t.truck, now + 4); return; }
    if (now > t.bell) {
      t.bell = now + 80 + Math.random() * 70;
      if (lv.bell > 0.03) { const n = 3 + Math.floor(Math.random() * 4); for (let k = 0; k < n; k++) this.bellStroke(now + k * 1.6, 520, this.volume * 0.05 * lv.bell); }
    }
    if (now > t.vendor) {
      t.vendor = now + 14 + Math.random() * 20;
      if (lv.vendors > 0.08) {
        const v = this.volume * 0.03 * lv.vendors, pick = Math.random();
        if (pick < 0.4) this.panPipe(now, v); else if (pick < 0.7) this.cartBells(now, v); else this.steamWhistle(now, v);
      }
    }
    if (now > t.truck) {
      t.truck = now + 40 + Math.random() * 45;
      if (lv.homes > 0.1) { if (Math.random() < 0.55) this.gasTune(now, this.volume * 0.035 * lv.homes); else this.handBell(now, this.volume * 0.04 * lv.homes); }
    }
  }

  /** A note through a gain envelope (attack, then an exponential fall over `dur`) into `out`. */
  private note(f: number, at: number, dur: number, type: OscillatorType, vol: number, out: AudioNode, attack = 0.01) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, at);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(out);
    o.start(at); o.stop(at + dur + 0.05);
    return o;
  }

  /** One stroke of a church bell: the hum, the strike and the bell's other partials, each dying away at its pace. */
  private bellStroke(at: number, f: number, vol: number) {
    const out = this.ctx!.destination;
    for (const [k, a, d] of [[0.5, 0.6, 4.5], [1, 1, 3.6], [1.19, 0.55, 3], [1.5, 0.35, 2.4], [2, 0.4, 2], [2.61, 0.22, 1.4], [3.04, 0.15, 1.1]] as [number, number, number][]) {
      this.note(f * k * (0.997 + Math.random() * 0.006), at, d, "sine", vol * a, out, 0.004);
    }
  }

  /** The knife grinder's pan pipe: a quick breathy run up the scale and back down. */
  private panPipe(at: number, vol: number) {
    const ctx = this.ctx!, f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = 4200; f.connect(ctx.destination);
    const scale = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];
    const run = [...scale, ...scale.slice(0, -1).reverse()];
    run.forEach((st, i) => this.note(1180 * 2 ** (st / 12), at + i * 0.075, 0.13, "triangle", vol * 0.8, f, 0.012));
  }

  /** The ice-cream cart's little bells: two quick shakes. */
  private cartBells(at: number, vol: number) {
    const out = this.ctx!.destination;
    for (const s of [0, 0.55]) for (let i = 0; i < 4; i++) {
      const t0 = at + s + i * 0.07 + Math.random() * 0.02;
      for (const f of [2950, 4400]) this.note(f * (0.98 + Math.random() * 0.04), t0, 0.35, "sine", vol * 0.5, out, 0.002);
    }
  }

  /** The camote cart's steam whistle: one long wavering whistle that fades. */
  private steamWhistle(at: number, vol: number) {
    const ctx = this.ctx!;
    const o = this.note(1750, at, 2.6, "sine", vol * 0.7, ctx.destination, 0.25);
    const wob = ctx.createOscillator(); wob.frequency.value = 6.5;
    const wg = ctx.createGain(); wg.gain.value = 22;
    wob.connect(wg); wg.connect(o.frequency);
    wob.start(at); wob.stop(at + 2.7);
  }

  /** The gas truck going by with its loudspeaker tune (a little jingle of the town's own), louder as it passes. */
  private gasTune(at: number, vol: number) {
    const ctx = this.ctx!;
    const pass = ctx.createGain();
    pass.gain.setValueAtTime(0.0001, at);
    pass.gain.exponentialRampToValueAtTime(1, at + 2.2);
    pass.gain.exponentialRampToValueAtTime(0.0001, at + 6.5);
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1400; bp.Q.value = 0.8;
    pass.connect(bp); bp.connect(ctx.destination);
    // C E G E · F A G — twice, the second time ending on the C
    const tune: [number, number][] = [[0, 0.22], [4, 0.22], [7, 0.22], [4, 0.22], [5, 0.22], [9, 0.22], [7, 0.44]];
    let t0 = at;
    for (const rep of [0, 1]) {
      for (const [st, d] of tune) { this.note(523 * 2 ** (st / 12), t0, d * 0.95, "square", vol, pass, 0.01); t0 += d; }
      if (rep === 0) t0 += 0.22; else this.note(523, t0, 0.5, "square", vol, pass, 0.01);
    }
  }

  /** The garbage truck's hand bell, rung as the truck comes down the street: clangs at an uneven pace. */
  private handBell(at: number, vol: number) {
    const out = this.ctx!.destination;
    let t0 = at;
    for (let i = 0; i < 9; i++) {
      const swell = Math.sin((i / 8) * Math.PI) * 0.8 + 0.2;
      for (const [k, a] of [[1, 1], [2.32, 0.5], [3.9, 0.3]] as [number, number][]) this.note(1020 * k, t0, 0.5, "sine", vol * a * swell, out, 0.003);
      t0 += 0.32 + Math.random() * 0.16;
    }
  }

  /** One bird's chirp: a quick rising and falling whistle. */
  private chirp(at: number, f: number, vol: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(f * 0.8, at);
    o.frequency.exponentialRampToValueAtTime(f * 1.15, at + 0.035);
    o.frequency.exponentialRampToValueAtTime(f * 0.9, at + 0.07);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.08);
    o.connect(g); g.connect(this.out(ctx));
    this.trackAmbient([o], [o, g]);
    o.start(at); o.stop(at + 0.1);
  }

  /** A cup set down on a saucer: two quick bright pings. */
  private clink(at: number, vol: number) {
    const ctx = this.ctx!;
    for (const [f, dt] of [[2600 + Math.random() * 600, 0], [3700 + Math.random() * 500, 0.012]] as [number, number][]) {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at + dt);
      g.gain.linearRampToValueAtTime(vol, at + dt + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dt + 0.25);
      o.connect(g); g.connect(this.out(ctx));
      this.trackAmbient([o], [o, g]);
      o.start(at + dt); o.stop(at + dt + 0.3);
    }
  }

  /** Birds taking off: a short flurry of wingbeats. */
  flutter(vol = 1) {
    const ctx = this.ac();
    if (!ctx || this.volume <= 0) return;
    const now = ctx.currentTime, burst = this.noiseBurst(ctx);
    for (let k = 0; k < 7; k++) {
      const at = now + k * 0.055 + Math.random() * 0.02;
      const src = ctx.createBufferSource(); src.buffer = burst; src.playbackRate.value = 1.6 + Math.random() * 0.5;
      const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 900 + Math.random() * 500; f.Q.value = 0.8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(this.volume * 0.06 * vol * (1 - k / 9), at + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
      src.connect(f); f.connect(g); g.connect(this.out(ctx));
      this.trackAmbient([src], [src, f, g]);
      src.start(at); src.stop(at + 0.07);
    }
  }

  /** One gull's "kee-ow": a falling, wavering cry. */
  private gull(at: number, vol: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(); o.type = "triangle";
    const top = 1350 + Math.random() * 350;
    o.frequency.setValueAtTime(top * 0.85, at);
    o.frequency.linearRampToValueAtTime(top, at + 0.06);
    o.frequency.exponentialRampToValueAtTime(top * 0.7, at + 0.34);
    const wob = ctx.createOscillator(); wob.frequency.value = 26;
    const wg = ctx.createGain(); wg.gain.value = 45;
    wob.connect(wg); wg.connect(o.frequency);
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = top; f.Q.value = 1.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.38);
    o.connect(f); f.connect(g); g.connect(this.out(ctx));
    this.trackAmbient([o, wob], [o, wob, wg, f, g]);
    o.start(at); wob.start(at); o.stop(at + 0.42); wob.stop(at + 0.42);
  }
  /** A short burst of noise that fades out (footsteps, wingbeats). */
  private noiseBurst(ctx: AudioContext) {
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.12), ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    }
    return this.noise;
  }

  /** A short burst of noise through a band, for steps and landings. */
  private burst(ctx: AudioContext, at: number, f: number, q: number, attack: number, len: number, vol: number, rate: number) {
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBurst(ctx);
    src.playbackRate.value = rate;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass"; band.frequency.value = f; band.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    src.connect(band); band.connect(g); g.connect(this.out(ctx));
    src.start(at); src.stop(at + len + 0.03);
  }
  /** A short low note that drops: a foot on boards. */
  private thump(ctx: AudioContext, at: number, f: number, len: number, vol: number) {
    const o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(f, at);
    o.frequency.exponentialRampToValueAtTime(f * 0.65, at + len);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    o.connect(g); g.connect(this.out(ctx));
    o.start(at); o.stop(at + len + 0.03);
  }

  /** One footstep on what is underfoot (soundscape.ts STEPS): stone as the street always sounded, sand and grass
   *  softer and duller with a faint rustle, boards with a low knock, tiles with a tiny tap; a little different each
   *  time, a little louder at a run. */
  step(surface: Surface, run: boolean) {
    const ctx = this.ac();
    if (!ctx || this.volume <= 0) return;
    const s = STEPS[surface], now = ctx.currentTime, k = this.volume * (run ? 1.3 : 1);
    const vary = () => 0.85 + Math.random() * 0.3;
    this.burst(ctx, now, s.f * vary(), s.q, s.attack, s.len, k * s.vol, s.rate * vary());
    if (s.grain) this.burst(ctx, now + 0.012, s.grain.f * vary(), 0.7, 0.02, s.len * 0.9, k * s.grain.vol, 1.5);
    if (s.knock) this.thump(ctx, now, s.knock.f * vary(), 0.07, k * s.knock.vol);
    if (s.click) this.burst(ctx, now, s.click.f * vary(), 2.5, 0.002, 0.03, k * s.click.vol, 1.6);
  }

  /** A hop's landing: both feet at once, a soft low thud (`strength` 0–1), of the surface landed on. */
  land(surface: Surface, strength = 1) {
    const ctx = this.ac();
    if (!ctx || this.volume <= 0) return;
    const s = STEPS[surface], now = ctx.currentTime, indoor = surface === "tile";
    const soft = surface === "sand" || surface === "grass";
    for (const [at, lift] of [[0, 1], [0.035, 0.7]] as const) {
      const v = this.volume * (indoor ? 0.12 : soft ? 0.085 : 0.1) * (0.6 + 0.4 * strength) * lift;
      this.burst(ctx, now + at, s.f * 0.62 * (0.9 + Math.random() * 0.2), 0.9, soft ? 0.014 : 0.008, soft ? 0.17 : 0.13, v, 0.7 + Math.random() * 0.15);
    }
    if (s.knock) this.thump(ctx, now, 110, 0.11, this.volume * 0.028 * (0.6 + 0.4 * strength));
    if (s.grain) this.burst(ctx, now + 0.02, s.grain.f, 0.7, 0.03, 0.16, this.volume * s.grain.vol * 1.4, 1.5);
  }

  /** The second jump's rush of air: a breath that sweeps up and away as they spin. Made here from filtered noise. */
  whoosh() {
    const ctx = this.ac();
    if (!ctx || this.volume <= 0) return;
    const now = ctx.currentTime + 0.05, v = this.volume * 0.05;
    const air = ctx.createBufferSource(); air.buffer = this.hiss(ctx); air.playbackRate.value = 0.8;
    const band = ctx.createBiquadFilter(); band.type = "bandpass"; band.Q.value = 1.1;
    band.frequency.setValueAtTime(380, now);
    band.frequency.exponentialRampToValueAtTime(2400, now + 0.26);
    band.frequency.exponentialRampToValueAtTime(900, now + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(v, now + 0.1);
    g.gain.exponentialRampToValueAtTime(v * 0.5, now + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    air.connect(band); band.connect(g); g.connect(this.out(ctx));
    air.onended = () => g.disconnect();
    air.start(now, Math.random()); air.stop(now + 0.6);
  }

  /** Taking off: a short, springy note that rises, as a hop sounded in an old video game, played softly, with a
   *  breath of air under it. Made here from two plain waves, after no game's or show's sound. `pitch`: higher for the
   *  second jump in the air. */
  jump(pitch = 1) {
    const ctx = this.ac();
    if (!ctx || this.volume <= 0) return;
    const now = ctx.currentTime, v = this.volume * 0.042, base = 300 * pitch * (0.97 + Math.random() * 0.06);
    const soft = ctx.createBiquadFilter(); soft.type = "lowpass"; soft.frequency.value = 2600; soft.Q.value = 0.3;
    soft.connect(this.out(ctx));
    for (const [mult, type, level] of [[1, "triangle", 1], [2, "sine", 0.2]] as const) {
      const o = ctx.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(base * mult, now);
      o.frequency.exponentialRampToValueAtTime(base * mult * 1.95, now + 0.12);
      o.frequency.exponentialRampToValueAtTime(base * mult * 1.78, now + 0.25);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(v * level, now + 0.008);
      g.gain.exponentialRampToValueAtTime(v * level * 0.45, now + 0.13);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.27);
      o.connect(g); g.connect(soft);
      o.start(now); o.stop(now + 0.3);
      if (mult === 2) o.onended = () => soft.disconnect();
    }
    const air = ctx.createBufferSource(); air.buffer = this.hiss(ctx); air.playbackRate.value = 0.9;
    const band = ctx.createBiquadFilter(); band.type = "bandpass"; band.Q.value = 0.8;
    band.frequency.setValueAtTime(650, now);
    band.frequency.exponentialRampToValueAtTime(1900, now + 0.16);
    const ag = ctx.createGain();
    ag.gain.setValueAtTime(0, now);
    ag.gain.linearRampToValueAtTime(v * 0.38, now + 0.03);
    ag.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    air.connect(band); band.connect(ag); ag.connect(this.out(ctx));
    air.start(now, Math.random()); air.stop(now + 0.2);
  }

  // ---- What one drives (src/game/rides): a car's light hum, a boat's putter. One small set of nodes on the world's
  // bus (so it is silent in a conversation, under a voice, with a panel open), made when one gets in, its pitch and
  // level following the speed, gone a moment after one gets out. Lower under the radio's music.
  private motorSet: { kind: "car" | "boat"; ctx: AudioContext; o1: OscillatorNode; o2: OscillatorNode; lfo: OscillatorNode; lp: BiquadFilterNode; gain: GainNode } | null = null;
  /** `kind`: what is driven now (null: nothing, the motor stops); `revs` 0–1: how fast it goes. */
  motor(kind: "car" | "boat" | null, revs = 0) {
    let m = this.motorSet;
    if (m && (m.kind !== kind || m.ctx !== this.ctx || m.ctx.state === "closed")) {
      const old = m, at = old.ctx.currentTime;
      this.motorSet = m = null;
      try {
        old.gain.gain.cancelScheduledValues(at); old.gain.gain.setTargetAtTime(0, at, 0.08);
        for (const o of [old.o1, old.o2, old.lfo]) o.stop(at + 0.4);
        old.o1.onended = () => { for (const n of [old.o1, old.o2, old.lfo, old.lp, old.gain]) n.disconnect(); };
      } catch { /* the context is gone */ }
    }
    if (!kind || this.volume <= 0) return;
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return;
    if (!m) {
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), lfo = ctx.createOscillator(), lp = ctx.createBiquadFilter(), gain = ctx.createGain(), am = ctx.createGain(), depth = ctx.createGain();
      o1.type = "sawtooth"; o2.type = "triangle"; lfo.type = "sine";
      lp.type = "lowpass"; lp.Q.value = 0.6;
      gain.gain.value = 0;
      // (the putter: the level wobbles with the slow wave, deeper for a boat's two-stroke than for a car)
      am.gain.value = 1; depth.gain.value = kind === "boat" ? 0.55 : 0.12;
      lfo.connect(depth); depth.connect(am.gain);
      const half = ctx.createGain(); half.gain.value = 0.35;
      o1.connect(lp); o2.connect(half); half.connect(lp); lp.connect(am); am.connect(gain); gain.connect(this.out(ctx));
      o1.start(); o2.start(); lfo.start();
      this.motorSet = m = { kind, ctx, o1, o2, lfo, lp, gain };
    }
    const at = ctx.currentTime, k = Math.max(0, Math.min(1, revs)), car = kind === "car";
    const f = car ? 52 + 62 * k : 34 + 26 * k;
    m.o1.frequency.setTargetAtTime(f, at, 0.08);
    m.o2.frequency.setTargetAtTime(f * 2.01, at, 0.08);
    m.lfo.frequency.setTargetAtTime(car ? f / 2 : 7 + 13 * k, at, 0.1);
    m.lp.frequency.setTargetAtTime(car ? 260 + 620 * k : 220 + 420 * k, at, 0.1);
    m.gain.gain.setTargetAtTime(this.volume * (car ? 0.016 + 0.02 * k : 0.02 + 0.022 * k) * (0.55 + 0.45 * this.underMusic), at, 0.1);
  }

  /** A soft bump: a car's tire against a kerb, a boat's side against the pier (`strength` 0–1). */
  bump(strength = 0.6) {
    const ctx = this.ac();
    if (!ctx || this.volume <= 0) return;
    this.thump(ctx, ctx.currentTime, 95, 0.12, this.volume * 0.05 * (0.4 + 0.6 * strength));
    this.burst(ctx, ctx.currentTime, 420, 0.8, 0.006, 0.09, this.volume * 0.03 * (0.4 + 0.6 * strength), 0.8);
  }

  carCrash(sound: import("./rides/crash").CrashSound, k: number) {
    if (this.volume <= 0) return;
    if (sound !== "crunch" && sound !== "steam") {
      this.sfx(sound === "tick" ? "hazardTick" : sound === "honk" ? "doubleHonk" : sound);
      return;
    }
    // the recordings first: a bump or a crunch by how hard, the chips of paint with a hard one, the radiator's hiss
    if (sound === "steam" ? this.sample("steamHiss") : this.sample(k < 0.4 ? "carBump" : "carCrunch", 0.55 + 0.45 * k)) {
      if (sound === "crunch" && k >= 0.4) this.sample("paintChips", k);
      return;
    }
    const ctx = this.ac();
    if (!ctx) return;
    const at = ctx.currentTime, vol = this.volume;
    if (sound === "steam") this.burst(ctx, at + 0.1, 3200, 0.5, 0.08, 0.73, vol * 0.038, 0.14);
    else {
      const len = 0.2 + 0.6 * k;
      this.thump(ctx, at, 88 - 33 * k, len * 0.7, vol * (0.033 + 0.072 * k));
      this.burst(ctx, at, 680 + 480 * k, 0.62, 0.008, len, vol * (0.038 + 0.095 * k), 0.12 / len);
    }
  }

  /** Tires on a hard stop: a short hiss that falls, quiet (`strength` 0–1). */
  skid(strength = 0.6) {
    const ctx = this.ac();
    if (!ctx || this.volume <= 0) return;
    const now = ctx.currentTime, len = 0.22 + 0.25 * strength;
    const src = ctx.createBufferSource(); src.buffer = this.hiss(ctx); src.playbackRate.value = 1.1;
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 2.2;
    f.frequency.setValueAtTime(1500, now); f.frequency.exponentialRampToValueAtTime(820, now + len);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(this.volume * 0.035 * (0.5 + 0.5 * strength), now + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, now + len);
    src.connect(f); f.connect(g); g.connect(this.out(ctx));
    src.start(now, Math.random()); src.stop(now + len + 0.03);
  }

  /** A held sound made of noise, for as long as it is given a level: a sliding car's tires ("squeal": a high, narrow
   *  screech), the air at speed ("wind": low and wide). `level` 0–1 (0: it fades out and stops), `tone` 0–1: higher. */
  private held = new Map<string, { ctx: AudioContext; src: AudioBufferSourceNode; f: BiquadFilterNode; gain: GainNode }>();
  rush(name: "squeal" | "wind", level: number, tone = 0.5) {
    if (name === "wind") this.windTarget = level;
    let h = this.held.get(name);
    const ctx = this.ctx;
    if (h && (h.ctx !== ctx || h.ctx.state === "closed" || level <= 0.01 || this.volume <= 0)) {
      const old = h, at = old.ctx.currentTime;
      this.held.delete(name); h = undefined;
      try {
        old.gain.gain.cancelScheduledValues(at); old.gain.gain.setTargetAtTime(0, at, 0.06);
        old.src.stop(at + 0.35);
        old.src.onended = () => { for (const n of [old.src, old.f, old.gain]) n.disconnect(); };
      } catch { /* the context is gone */ }
    }
    if (level <= 0.01 || this.volume <= 0 || !ctx || ctx.state !== "running") return;
    const squeal = name === "squeal";
    if (!h) {
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), gain = ctx.createGain();
      src.buffer = this.hiss(ctx); src.loop = true;
      f.type = squeal ? "bandpass" : "lowpass"; f.Q.value = squeal ? 7 : 0.5;
      gain.gain.value = 0;
      src.connect(f); f.connect(gain); gain.connect(this.out(ctx));
      src.start(0, Math.random());
      this.held.set(name, (h = { ctx, src, f, gain }));
    }
    const at = ctx.currentTime, k = Math.max(0, Math.min(1, level)), tn = Math.max(0, Math.min(1, tone));
    h.f.frequency.setTargetAtTime(squeal ? 1250 + 900 * tn : 260 + 900 * tn, at, 0.07);
    h.src.playbackRate.setTargetAtTime(squeal ? 0.9 + 0.3 * tn : 1, at, 0.1);
    h.gain.gain.setTargetAtTime(this.volume * (squeal ? 0.05 : 0.035) * k * (0.55 + 0.45 * this.underMusic), at, 0.06);
  }

  /** A short rush of air: the kick out of a slide. */
  kickRush() {
    const ctx = this.ac();
    if (!ctx || this.volume <= 0) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.hiss(ctx);
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 1.1;
    f.frequency.setValueAtTime(420, now); f.frequency.exponentialRampToValueAtTime(1900, now + 0.38);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(this.volume * 0.06, now + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    src.connect(f); f.connect(g); g.connect(this.out(ctx));
    src.start(now, Math.random()); src.stop(now + 0.6);
  }

  /** A second and a half of even noise (water). */
  private hissBuffer: AudioBuffer | null = null;
  private hiss(ctx: AudioContext) {
    if (!this.hissBuffer) {
      this.hissBuffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * 1.5), ctx.sampleRate);
      const d = this.hissBuffer.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.hissBuffer;
  }

  /** A step in the shallows: a splash, a spray of water thrown up and falling back (`strength` 0–1). */
  splash(strength = 0.6) {
    const ctx = this.ac();
    if (!ctx || this.volume <= 0) return;
    const now = ctx.currentTime;
    for (const [at, freq, q, len, vol] of [[0, 900, 0.7, 0.2, 1], [0.03, 2600, 0.9, 0.28, 0.55], [0.1, 4200, 1.2, 0.22, 0.25]] as const) {
      const src = ctx.createBufferSource();
      src.buffer = this.hiss(ctx);
      src.loop = true;
      src.playbackRate.value = 0.8 + Math.random() * 0.5;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.setValueAtTime(freq * (0.85 + Math.random() * 0.3), now + at);
      f.frequency.exponentialRampToValueAtTime(freq * 0.55, now + at + len);
      f.Q.value = q;
      const g = ctx.createGain();
      const v = this.volume * 0.085 * (0.45 + 0.55 * strength) * vol;
      g.gain.setValueAtTime(0, now + at);
      g.gain.linearRampToValueAtTime(v, now + at + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, now + at + len);
      src.connect(f); f.connect(g); g.connect(this.out(ctx));
      src.start(now + at); src.stop(now + at + len + 0.03);
    }
  }

  /** A small wave running up the sand and drawing back, as one walks into the sea: a hiss that swells and fades. */
  wash() {
    const ctx = this.ac();
    if (!ctx || this.volume <= 0) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.hiss(ctx);
    src.loop = true;
    src.playbackRate.value = 0.6;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(700, now);
    f.frequency.linearRampToValueAtTime(2400, now + 0.55);
    f.frequency.linearRampToValueAtTime(900, now + 1.7);
    f.Q.value = 0.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(this.volume * 0.075, now + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
    src.connect(f); f.connect(g); g.connect(this.out(ctx));
    src.start(now); src.stop(now + 1.85);
  }

  /** One quiet layer of filtered water or air, with the same world bus as splashes. */
  private surfNoise(sweep: [number, number, number], envelope: [number, number, number], pan = 0, delay = 0) {
    if (this.volume <= 0 || this.soundsLevel <= 0 || this.hushed.size) return;
    const ctx = this.ac();
    if (!ctx) return;
    const [startHz, peakHz, endHz] = sweep;
    const [attack, duration, peak] = envelope;
    const start = ctx.currentTime + delay, turn = start + attack, end = start + duration;
    const src = ctx.createBufferSource();
    src.buffer = this.hiss(ctx);
    src.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 0.65;
    band.frequency.setValueAtTime(startHz, start);
    band.frequency.exponentialRampToValueAtTime(peakHz, turn);
    band.frequency.exponentialRampToValueAtTime(endHz, end);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(this.volume * peak, turn);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    src.connect(band);
    band.connect(gain);
    const stereo = pan !== 0 && typeof ctx.createStereoPanner === "function" ? ctx.createStereoPanner() : null;
    if (stereo) { stereo.pan.value = pan; gain.connect(stereo); }
    (stereo ?? gain).connect(this.out(ctx));
    src.onended = () => { src.disconnect(); band.disconnect(); gain.disconnect(); stereo?.disconnect(); };
    src.start(start, Math.random());
    src.stop(end);
  }

  /** A hand pulling water beside the board. */
  surfStroke(hand: -1 | 1) {
    this.surfNoise([820, hand < 0 ? 1700 : 1950, 520], [0.038, 0.25, 0.048], hand * 0.24);
  }

  surfWaveRush() { this.surfNoise([360, 1550, 920], [0.65, 1.03, 0.077]); }
  surfWaveBreak() { this.surfNoise([630, 2100, 420], [0.085, 0.88, 0.082]); }
  surfStand() { this.surfNoise([520, 2280, 780], [0.038, 0.18, 0.057]); }

  surfWipeout() {
    this.surfNoise([900, 2600, 620], [0.026, 0.34, 0.082]);
    this.surfNoise([540, 1050, 330], [0.12, 0.72, 0.064], 0, 0.11);
  }

  // ---- A recorded line heard from somewhere in the world (a glyph stone in the grotto calling, src/game/cave): on
  // the world's bus (silent in a conversation, under an open panel), as loud and as far to one side as `at()` says for
  // as long as it plays, with a little of a cave's echo behind it. One at a time.
  private calling: (() => void) | null = null;
  /** Resolves when the line has been said (false: no recording of it, or it could not be played now). */
  async callFrom(voice: string, speed: number, text: string, at: () => { gain: number; pan: number }): Promise<boolean> {
    this.stopCall();
    await this.init();
    if (!this.ready) return false;
    const key = this.recordingKey(voice, speed, text);
    if (!this.manifest[key]) return false;
    let buffer: AudioBuffer;
    try { buffer = await this.recordingBuffer(key, false); } catch { return false; }
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running" || document.hidden || this.volume <= 0) return false;
    this.stopCall();
    return new Promise((done) => {
      const src = ctx.createBufferSource(), gain = ctx.createGain(), out = this.out(ctx);
      const pan = typeof ctx.createStereoPanner === "function" ? ctx.createStereoPanner() : null;
      const delay = ctx.createDelay(0.5), back = ctx.createGain(), wet = ctx.createGain(), soft = ctx.createBiquadFilter();
      src.buffer = buffer;
      delay.delayTime.value = 0.21; back.gain.value = 0.34; wet.gain.value = 0.3; soft.type = "lowpass"; soft.frequency.value = 2200;
      src.connect(gain);
      const dry: AudioNode = pan ? (gain.connect(pan), pan) : gain;
      dry.connect(out);
      dry.connect(delay); delay.connect(soft); soft.connect(back); back.connect(delay); soft.connect(wet); wet.connect(out);
      const set = (first: boolean) => {
        const a = at(), now = ctx.currentTime;
        if (first) { gain.gain.setValueAtTime(a.gain * this.volume, now); pan?.pan.setValueAtTime(a.pan, now); }
        else { gain.gain.setTargetAtTime(a.gain * this.volume, now, 0.1); pan?.pan.setTargetAtTime(a.pan, now, 0.1); }
      };
      set(true);
      const timer = setInterval(() => set(false), 90);
      let over = false;
      const end = (said: boolean) => {
        if (over) return;
        over = true;
        clearInterval(timer);
        src.onended = null;
        try { src.stop(); } catch { /* not started or already over */ }
        // (the echo's tail rings out, then everything lets go)
        setTimeout(() => { for (const n of [src, gain, pan, delay, back, wet, soft]) n?.disconnect(); }, said ? 1600 : 0);
        if (this.calling === stop) this.calling = null;
        done(said);
      };
      const stop = () => end(false);
      this.calling = stop;
      src.onended = () => end(true);
      src.start();
    });
  }
  stopCall() { this.calling?.(); }

  // ---- The grotto's own quiet (src/game/cave), made on the spot: water dripping somewhere with its echo, a low
  // breath of air, a falls' hush when one is near, and now and then two soft notes as of stones chiming. Asked for
  // about eight times a second, like `ambience`.
  private grotto: { next: number; chime: number; hush?: { src: AudioBufferSourceNode; gain: GainNode }; air?: { o: OscillatorNode[]; gain: GainNode }; echo?: { in: GainNode; nodes: AudioNode[] } } | null = null;
  cave(on: boolean, lv: { falls?: number; deep?: number; level?: number } = {}) {
    const ctx = this.ctx;
    const live = on && !document.hidden && this.volume > 0 && this.soundsLevel > 0 && !!ctx && ctx.state === "running";
    if (!live) { this.stopCave(); return; }
    const now = ctx.currentTime, v = this.volume;
    if (!this.grotto) {
      this.grotto = { next: now + 0.6, chime: now + 5 + Math.random() * 6 };
      // an echo everything of the place goes through
      const inp = ctx.createGain(), delay = ctx.createDelay(0.6), back = ctx.createGain(), soft = ctx.createBiquadFilter(), wet = ctx.createGain();
      delay.delayTime.value = 0.27; back.gain.value = 0.42; soft.type = "lowpass"; soft.frequency.value = 2600; wet.gain.value = 0.5;
      inp.connect(this.out(ctx)); inp.connect(delay); delay.connect(soft); soft.connect(back); back.connect(delay); soft.connect(wet); wet.connect(this.out(ctx));
      this.grotto.echo = { in: inp, nodes: [inp, delay, back, soft, wet] };
      // the air: two low notes a fifth apart, breathing slowly
      const gain = ctx.createGain(); gain.gain.value = 0;
      gain.gain.setTargetAtTime(v * 0.016, now, 1.5);
      const o = [98, 146.8, 196.2].map((f, i) => { const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = f; const g = ctx.createGain(); g.gain.value = i === 2 ? 0.35 : 1; osc.connect(g); g.connect(gain); osc.start(); return osc; });
      const lfo = ctx.createOscillator(), depth = ctx.createGain(); lfo.frequency.value = 0.09; depth.gain.value = v * 0.006; lfo.connect(depth); depth.connect(gain.gain); lfo.start();
      gain.connect(inp);
      this.grotto.air = { o: [...o, lfo], gain };
    }
    const G = this.grotto, out = G.echo!.in;
    // (`level`: all of it softer, as heard from outside at one of the grotto's ways in)
    out.gain.setTargetAtTime(Math.max(0, Math.min(1, lv.level ?? 1)), now, 0.4);
    // drips: a quick falling ping, a softer one after it now and then
    if (now > G.next) {
      G.next = now + 0.5 + Math.random() * 2.4;
      const f = 900 + Math.random() * 1500, at = now + 0.03;
      const o = this.note(f, at, 0.16, "sine", v * (0.02 + Math.random() * 0.02), out, 0.004);
      o.frequency.exponentialRampToValueAtTime(f * 0.55, at + 0.12);
      if (Math.random() < 0.35) this.note(f * 1.5, at + 0.13, 0.1, "sine", v * 0.012, out, 0.004);
    }
    // two soft notes, a fifth or a fourth apart, from an old five-note scale
    if (now > G.chime) {
      G.chime = now + 9 + Math.random() * 14;
      const scale = [523.3, 587.3, 659.3, 784, 880], i = Math.floor(Math.random() * scale.length), a = scale[i], b = scale[(i + 2 + Math.floor(Math.random() * 2)) % scale.length] * (Math.random() < 0.5 ? 1 : 0.5);
      for (const [f, t] of [[a, 0.05], [b, 0.55]]) { this.note(f, now + t, 2.2, "sine", v * 0.02 * (1 + (lv.deep ?? 0)), out, 0.03); this.note(f * 2.01, now + t, 1.2, "sine", v * 0.006, out, 0.02); }
    }
    // a falls' hush: noise through a band, as loud as the falls are near
    const falls = Math.max(0, Math.min(1, lv.falls ?? 0));
    if (falls > 0.02 && !G.hush) {
      const len = Math.round(ctx.sampleRate * 2.2), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { last = last * 0.82 + (Math.random() * 2 - 1) * 0.18; d[i] = last * 2.4; }
      // (the ends meet: no click where it comes round)
      for (let i = 0; i < 2000; i++) { const k = i / 2000; d[i] = d[i] * k + d[len - 2000 + i] * (1 - k); }
      const src = ctx.createBufferSource(), band = ctx.createBiquadFilter(), gain = ctx.createGain();
      src.buffer = buf; src.loop = true; src.loopEnd = (len - 2000) / ctx.sampleRate;
      band.type = "bandpass"; band.frequency.value = 1100; band.Q.value = 0.5; gain.gain.value = 0;
      src.connect(band); band.connect(gain); gain.connect(this.out(ctx));
      src.start();
      G.hush = { src, gain };
    }
    G.hush?.gain.gain.setTargetAtTime(v * 0.05 * falls * falls, now, 0.3);
  }
  stopCave() {
    const G = this.grotto;
    if (!G) return;
    this.grotto = null;
    const ctx = this.ctx, now = ctx?.currentTime ?? 0;
    try {
      G.air?.gain.gain.setTargetAtTime(0, now, 0.2);
      G.hush?.gain.gain.setTargetAtTime(0, now, 0.2);
    } catch { /* the context is gone */ }
    setTimeout(() => {
      for (const o of G.air?.o ?? []) { try { o.stop(); } catch { /* already stopped */ } o.disconnect(); }
      G.air?.gain.disconnect();
      if (G.hush) { try { G.hush.src.stop(); } catch { /* already stopped */ } G.hush.src.disconnect(); G.hush.gain.disconnect(); }
      for (const n of G.echo?.nodes ?? []) n.disconnect();
    }, 900);
  }
  /** A stone lit, a gate opened: a few bright notes going up, ringing on (an effect: heard over everything). */
  chime(kind: "stone" | "gate" | "heart" = "stone") {
    const ctx = this.ac();
    if (!ctx) return;
    const now = ctx.currentTime, out = this.fx(ctx), v = this.volume * 0.16;
    const notes = kind === "stone" ? [659.3, 880, 1318.5] : kind === "gate" ? [392, 523.3, 659.3, 784, 1046.5] : [392, 523.3, 659.3, 784, 1046.5, 1318.5, 1568, 2093];
    notes.forEach((f, i) => {
      const at = now + i * (kind === "stone" ? 0.09 : 0.12);
      this.note(f, at, kind === "stone" ? 1.4 : 2.4, "sine", v, out, 0.01);
      this.note(f * 2, at, 0.7, "triangle", v * 0.25, out, 0.01);
    });
  }

  /** A handset alert with its own output so dismissing the card cuts every scheduled pulse. */
  phoneAlert(incoming: boolean) {
    if (this.volume <= 0 || this.soundsLevel <= 0) return;
    const ctx = this.context();
    if (!ctx || ctx.state !== "running") return;
    const output = ctx.createGain();
    output.connect(this.fx(ctx));
    const nodes: OscillatorNode[] = [];
    for (const offset of incoming ? [0, 0.5] : [0, 0.25]) {
      for (const hz of incoming ? [440, 480] : [350]) {
        const start = ctx.currentTime + offset;
        const duration = incoming ? 0.35 : 0.13;
        const tone = ctx.createOscillator(), envelope = ctx.createGain();
        tone.frequency.value = hz;
        tone.type = incoming ? "sine" : "triangle";
        envelope.gain.setValueAtTime(0, start);
        envelope.gain.linearRampToValueAtTime(this.volume * (incoming ? 0.075 : 0.04), start + 0.015);
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        tone.connect(envelope);
        envelope.connect(output);
        tone.onended = () => { tone.disconnect(); envelope.disconnect(); };
        tone.start(start);
        tone.stop(start + duration);
        nodes.push(tone);
      }
    }
    nodes.at(-1)!.addEventListener("ended", () => output.disconnect(), { once: true });
    return () => {
      output.disconnect();
      for (const tone of nodes) { try { tone.stop(); } catch { /* already ended */ } }
    };
  }

  /** An effect: its recording once loaded (soundscape.ts SAMPLES), else the synthesized sound that stands in for it. */
  sfx(name: SynthName | SampleName, intensity = 1) {
    if (!isSample(name)) { this.synth(name, intensity); return; }
    if (this.sample(name, intensity)) return;
    const stand = (SAMPLES[name] as SampleDef).synth;
    if (stand !== null) this.synth(stand ?? (name as SynthName), intensity);
  }

  // ---- Recorded effects (SAMPLES): each name's takes, fetched the first time it is wanted (or by preload).
  private takes = new Map<SampleName, { bufs: AudioBuffer[]; asked: boolean }>();
  private takesOf(ctx: AudioContext, name: SampleName) {
    let t = this.takes.get(name);
    if (!t) this.takes.set(name, (t = { bufs: [], asked: false }));
    if (!t.asked) {
      t.asked = true;
      const into = t;
      for (const file of SAMPLES[name].files) this.fetchClip(ctx, file).then((buf) => { into.bufs.push(buf); }, () => { /* the synthesized sound stays */ });
    }
    return t;
  }
  /** Load a mini-game's takes before its first move (soundscape.ts MODE_SAMPLES). */
  preload(names: readonly SampleName[]) {
    const ctx = this.context();
    if (ctx) for (const name of names) this.takesOf(ctx, name);
  }
  /** Play one of a recorded effect's takes on the effects bus; false (and nothing played) while none is loaded. */
  sample(name: SampleName, intensity = 1): boolean {
    if (this.volume <= 0) return false;
    const ctx = this.ac();
    if (!ctx) return false;
    const { bufs } = this.takesOf(ctx, name);
    if (!bufs.length) return false;
    audioDiagnostic("context.effect", { reason: name, recorded: true });
    const src = ctx.createBufferSource(), gain = ctx.createGain();
    src.buffer = bufs[Math.floor(Math.random() * bufs.length)];
    src.playbackRate.value = 0.96 + Math.random() * 0.08;
    gain.gain.value = this.volume * SAMPLES[name].gain * Math.min(1, Math.max(0, intensity));
    src.connect(gain); gain.connect(this.fx(ctx));
    src.onended = () => { src.disconnect(); gain.disconnect(); };
    src.start();
    return true;
  }

  private synth(name: SynthName, intensity = 1) {
    audioDiagnostic("context.effect", { reason: name });
    const ctx = this.ac();
    if (!ctx) return;
    const now = ctx.currentTime;
    const g = ctx.createGain();
    g.connect(this.fx(ctx));
    const vol = this.volume * 0.18 * Math.min(1, Math.max(0, intensity));
    const tone = (f: number, t0: number, dur: number, type: OscillatorType = "sine", v = vol) => {
      const o = ctx.createOscillator();
      const gg = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, now + t0);
      gg.gain.setValueAtTime(0, now + t0);
      gg.gain.linearRampToValueAtTime(v, now + t0 + 0.015);
      gg.gain.exponentialRampToValueAtTime(0.0001, now + t0 + dur);
      o.connect(gg); gg.connect(g);
      o.start(now + t0); o.stop(now + t0 + dur + 0.05);
    };
    switch (name) {
      case "seaBell":
        tone(988, 0, 0.53);
        tone(1976, 0, 0.36, "sine", vol * 0.42);
        tone(2592, 0, 0.21, "sine", vol * 0.19);
        break;
      case "shutter": tone(1650, 0, 0.032, "square", vol * 0.28); tone(440, 0.032, 0.063, "triangle", vol * 0.45); break;
      case "cueStrike": tone(1140, 0, 0.05, "triangle", vol * 0.8); tone(276, 0, 0.07, "sine", vol * 0.27); break;
      case "poolClick": tone(1740, 0, 0.043, "triangle", vol * 0.64); tone(840, 0, 0.047, "sine", vol * 0.3); break;
      case "poolCushion": tone(142, 0, 0.077, "triangle", vol * 0.58); break;
      case "poolDrop": tone(305, 0, 0.09, "triangle", vol * 0.48); tone(103, 0.055, 0.13, "triangle", vol * 0.41); break;
      case "success": tone(784, 0, 0.18); tone(1175, 0.09, 0.3); break;
      // a task done: a bright run up, a shimmering chord, a few twinkles on top
      case "cheer":
        tone(523, 0, 0.16); tone(659, 0.08, 0.16); tone(784, 0.16, 0.18); tone(1047, 0.25, 0.5);
        for (const f of [1047, 1319, 1568]) tone(f, 0.42, 0.9, "sine", vol * 0.45);
        for (const [f, at] of [[2093, 0.5], [2637, 0.6], [3136, 0.7], [2637, 0.82]]) tone(f, at, 0.14, "triangle", vol * 0.25);
        break;
      case "pop": tone(660, 0, 0.08, "triangle", vol * 0.7); break;
      case "soft": tone(440, 0, 0.12, "sine", vol * 0.5); break;
      case "listen": tone(880, 0, 0.09, "sine", vol * 0.6); tone(1320, 0.07, 0.12, "sine", vol * 0.5); break;
      case "message": tone(660, 0, 0.14, "sine", vol * 0.27); tone(880, 0.11, 0.23, "sine", vol * 0.23); break;
      case "coin": tone(988, 0, 0.1, "square", vol * 0.35); tone(1319, 0.08, 0.25, "square", vol * 0.35); break;
      case "door": tone(180, 0, 0.18, "triangle", vol * 0.8); tone(140, 0.12, 0.2, "triangle", vol * 0.6); break;
      case "car": tone(90, 0, 0.9, "sawtooth", vol * 0.25); break;
      case "error": tone(300, 0, 0.15, "triangle", vol * 0.5); tone(240, 0.1, 0.2, "triangle", vol * 0.5); break;
      case "ring": for (const at of [0, 0.5]) { tone(440, at, 0.35, "sine", vol * 0.45); tone(480, at, 0.35, "sine", vol * 0.45); } break;
      case "horn": tone(382, 0, 0.26, "triangle", vol * 0.55); tone(480, 0, 0.23, "triangle", vol * 0.4); break;
      case "hornReply": tone(329, 0, 0.17, "triangle", vol * 0.28); tone(415, 0, 0.16, "triangle", vol * 0.2); break;
      case "beep": tone(1000, 0, 0.4, "sine", vol * 0.5); break;
      case "knock": for (const at of [0, 0.16, 0.32]) tone(140, at, 0.07, "square", vol * 0.5); break;
      case "loteriaFlip": this.burst(ctx, now, 1550, 1.2, 0.003, 0.055, vol * 0.45, 1.1); tone(183, 0.014, 0.065, "triangle", vol * 0.38); break;
      case "loteriaBean": tone(530, 0, 0.04, "triangle", vol * 0.5); tone(285, 0.007, 0.052, "triangle", vol * 0.36); break;
      case "tick": tone(1180, 0, 0.05, "triangle", vol * 0.32); tone(1580, 0.03, 0.06, "triangle", vol * 0.22); break;
      case "doubleHonk":
        for (const at of [0.17, 0.36]) { tone(350, at, 0.13, "triangle", vol * 0.42); tone(446, at, 0.12, "triangle", vol * 0.28); }
        break;
      case "chirp": tone(920, 0.12, 0.08, "triangle", vol * 0.18); tone(735, 0.24, 0.13, "triangle", vol * 0.14); break;
      case "glass": tone(2410, 0.025, 0.17, "sine", vol * 0.18); tone(3130, 0.075, 0.11, "sine", vol * 0.13); break;
      case "hazardTick": tone(960, 0, 0.036, "triangle", vol * 0.10); break;
      case "ding": tone(1047, 0, 0.38, "sine", vol * 0.42); tone(2094, 0, 0.19, "sine", vol * 0.14); break;
    }
  }
}

export const audio = new AudioSystem();
