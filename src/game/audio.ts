// Recorded voices and small synthesized sound effects. Browser speech is used for unrecorded lines,
// or when the learner explicitly chooses it after a failed download. No network TTS is ever called.
import { audioKey, withoutAddressedNames } from "../audio-key";
import { audioDir } from "../content/voices";
import { playbackRoute, waitForMicrophone } from "../convo/audioFocus";

export type PlaybackState = "idle" | "loading" | "playing" | "blocked" | "unavailable";
interface PlaybackRequest {
  done: boolean;
  cleanup: () => void;
  finish(completed: boolean): void;
  retry?: () => void;
  fallback?: () => void;
}

// A short, silent WAV: prime the SAME media element during a real tap, before any fetch/await.
// A muted element does not unlock later audible playback. No network or continuously running audio.
const SILENCE = "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQIAAAAAAA==";

/** The clips' loudness is worked out this many times a second. */
const ENVELOPE_RATE = 30;

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
  private unlocked = false;
  private state: PlaybackState = "idle";
  private listeners = new Set<() => void>();
  getState = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private setState(state: PlaybackState) {
    if (state === this.state) return;
    this.state = state;
    for (const listener of this.listeners) listener();
  }
  volume = 0.9;
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
  private clip: { el: HTMLAudioElement; key: string; done: boolean } | null = null;
  /** Each clip's loudness: null while being worked out, empty when that failed. */
  private envelopes = new Map<string, Float32Array | null>();
  private decoder: BaseAudioContext | null = null;

  init(): Promise<void> {
    if (this.initializing) return this.initializing;
    if (this.ready || Date.now() < this.retryInitAt) return Promise.resolve();
    if (typeof speechSynthesis !== "undefined") {
      const load = () => { this.fallbackVoices = speechSynthesis.getVoices().filter((v) => /^en(?:[-_]|$)/i.test(v.lang)); };
      load();
      speechSynthesis.onvoiceschanged = load;
    }
    this.initializing = (async () => {
      // One failed request must not disable recorded voices for the rest of this visit. The second
      // attempt bypasses a stale HTTP/service-worker response; each request has a bounded loading time.
      const read = async (file: string) => {
        for (const cache of ["no-cache", "reload"] as const) {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 6000);
          try {
            const r = await fetch(`${import.meta.env.BASE_URL}${audioDir()}${file}`, { cache, signal: controller.signal });
            if (r.ok) return await r.json();
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
    }
    return this.player;
  }

  /** Install for both game modes, including their start screen and linked situations. */
  bindGestures() {
    const activate = () => this.unlock();
    const hide = () => { if (document.hidden) this.stopAmbience(); };
    const leave = () => this.stopAmbience();
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
    };
  }

  unlock() {
    if (this.ctx && this.ctx.state !== "running") void this.ctx.resume().catch(() => {});
    if (this.state === "blocked") { this.retry(); return; }
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

  /** Called directly by a tap, with no awaited work before play(). */
  retry = () => { playbackRoute(); this.request?.retry?.(); };
  useBrowserVoice = () => { playbackRoute(); this.request?.fallback?.(); };
  canUseBrowserVoice = () => !!this.request?.fallback;
  continueReading = () => this.request?.finish(true);

  /** True after playback finishes or the learner explicitly continues reading. Cancellation is false;
   *  denial keeps the same line pending. */
  play(voice: string, speed: number, text: string, opts: { slow?: boolean; male?: boolean } = {}): Promise<boolean> {
    this.stop();
    // nothing to say (a hint whose blank is still empty comes out as ".")
    if (!/[a-z0-9]/i.test(text)) return Promise.resolve(true);
    return new Promise((resolve) => {
      const request: PlaybackRequest = {
        done: false, cleanup: () => {},
        finish: (completed) => {
          if (request.done) return;
          request.done = true;
          request.cleanup();
          if (this.request === request) { this.request = null; this.setState("idle"); }
          resolve(completed);
        },
      };
      this.request = request;
      this.setState("loading");
      const begin = async () => {
        if (request.done) return;
        this.setState("loading");
        await Promise.all([this.init(), waitForMicrophone()]);
        if (request.done) return;
        // A missing manifest does not prove that this NPC has no recording.
        if (!this.ready) { this.setState("unavailable"); return; }
        const key = this.recordingKey(voice, speed, text);
        if (this.manifest[key]) this.playRecording(request, key, text, opts);
        else this.speakFallback(request, text, opts);
      };
      const start = () => { void begin().catch(() => { if (!request.done) this.setState("unavailable"); }); };
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

  private playRecording(request: PlaybackRequest, key: string, text: string, opts: { slow?: boolean; male?: boolean }) {
    const a = this.media();
    const attempt = (retry: boolean) => {
      if (request.done) return;
      const cached = this.recordings.get(this.cacheKey(key));
      // Keep the gesture-unlocked element across every sentence, retry, and offline recording.
      a.src = cached ?? clipUrl(this.base, key, this.repairVersions[key], filesToken());
      a.volume = this.volume;
      a.preservesPitch = true;
      a.playbackRate = opts.slow ? 0.82 : 1;
      const clip = { el: a, key, done: false };
      this.clip = clip;
      let disposed = false;
      let started = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let playAttempt = 0;
      const current = () => !disposed && !request.done;
      const cleanup = (clearSource = false) => {
        if (disposed) return;
        disposed = true; clip.done = true;
        clearTimeout(timer);
        a.onended = a.onerror = a.onplaying = a.onpause = null;
        a.pause();
        if (clearSource) { a.removeAttribute("src"); a.load(); }
      };
      request.cleanup = () => cleanup(true);
      const waiting = (state: "blocked" | "unavailable") => {
        if (!current()) return;
        clearTimeout(timer);
        this.setState(state);
      };
      const failed = () => {
        if (!current()) return;
        if (cached) this.recordings.delete(this.cacheKey(key));
        if (!retry && !started) { cleanup(true); attempt(true); return; }
        // A network error is visible. Keep the NPC's recorded voice unless the learner chooses otherwise.
        waiting("unavailable");
        request.retry = () => { cleanup(true); attempt(false); };
      };
      const start = () => {
        if (!current()) return;
        const run = ++playAttempt;
        clearTimeout(timer);
        this.setState("loading");
        // Initialization/downloads and the phone's capture service are asynchronous. Claim
        // playback at the actual play call as well, without making a tap retry asynchronous.
        if (!playbackRoute(true)) {
          void waitForMicrophone().then(() => { if (current() && run === playAttempt) start(); });
          return;
        }
        timer = setTimeout(failed, 10000);
        // This call stays synchronous for a retry from a user gesture.
        void a.play().catch((error) => {
          if (!current() || run !== playAttempt) return;
          if (error?.name === "NotAllowedError" || error?.name === "AbortError") waiting("blocked");
          else failed();
        });
      };
      request.retry = start;
      request.fallback = () => {
        if (!current()) return;
        cleanup(true);
        this.speakFallback(request, text, opts);
      };
      a.onended = () => {
        if (!current()) return;
        cleanup();
        request.finish(true);
      };
      a.onerror = failed;
      a.onpause = () => { if (started && !a.ended) waiting("blocked"); };
      a.onplaying = () => {
        if (!current()) return;
        // The media may only become audible after a delayed download or native route change.
        if (!started) playbackRoute(true);
        started = true;
        this.unlocked = true;
        this.setState("playing");
        clearTimeout(timer);
        // A stalled/backgrounded line must never be counted as successfully spoken.
        const remaining = Math.max(0, (this.manifest[key] || 4) - a.currentTime);
        timer = setTimeout(() => waiting("blocked"), remaining / a.playbackRate * 1000 + 5000);
        void this.cacheRecording(key);
      };
      start();
    };
    attempt(false);
  }

  /** How loud the line playing now is at this moment (0–1), for the speaker's mouth; -1 once it has ended; null when
   *  that isn't known (the browser's own voice, or the clip's loudness could not be worked out). */
  level(): number | null {
    const c = this.clip;
    if (!c) return null;
    if (c.done || c.el.ended) return -1;
    // worked out only for lines someone's mouth follows (not the example answers)
    if (!this.envelopes.has(c.key)) this.loudness(c.key, c.el.src);
    const env = this.envelopes.get(c.key);
    // still being worked out: the mouth stays shut until the voice starts, then keeps a rhythm
    if (env === null) return c.el.currentTime < 0.05 ? 0 : null;
    if (!env?.length) return null;
    return env[Math.min(env.length - 1, Math.floor(c.el.currentTime * ENVELOPE_RATE))] ?? 0;
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
      const r = await fetch(url);
      if (!r.ok) return failed();
      const bytes = await r.arrayBuffer();
      this.decoder ??= new OAC(1, 1, 44100);
      const dec = this.decoder;
      // (the browser also rejects the promise it returns: the error callback has it already, so that one is let go)
      const buf = await new Promise<AudioBuffer>((res, rej) => { void (dec.decodeAudioData(bytes, res, rej) as Promise<AudioBuffer> | undefined)?.catch(() => {}); });
      const data = buf.getChannelData(0), step = buf.sampleRate / ENVELOPE_RATE;
      const env = new Float32Array(Math.ceil(data.length / step));
      for (let i = 0; i < env.length; i++) {
        let sum = 0;
        const a = Math.floor(i * step), b = Math.min(data.length, Math.floor((i + 1) * step));
        for (let j = a; j < b; j++) sum += data[j] * data[j];
        env[i] = Math.sqrt(sum / Math.max(1, b - a));
      }
      // as loud as the line gets (its 90th percentile, so one peak doesn't decide it) is a wide-open mouth; quiet
      // breaths and room noise keep it shut
      const peak = Float32Array.from(env).sort()[Math.floor(env.length * 0.9)] || 1;
      for (let i = 0; i < env.length; i++) { const v = env[i] / peak; env[i] = v < 0.12 ? 0 : Math.min(1, (v - 0.12) / 0.75); }
      if (this.envelopes.size > 300) this.envelopes.delete(this.envelopes.keys().next().value!);
      this.envelopes.set(key, env);
    } catch { failed(); /* the mouth keeps its rhythm */ }
  }

  private speakFallback(request: PlaybackRequest, text: string, opts: { slow?: boolean; male?: boolean }) {
    this.clip = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let playAttempt = 0;
    request.cleanup = () => { playAttempt++; clearTimeout(timer); };
    request.fallback = undefined;
    const start = () => {
      if (request.done) return;
      const run = ++playAttempt;
      if (!playbackRoute(true)) {
        void waitForMicrophone().then(() => { if (!request.done && run === playAttempt) start(); });
        return;
      }
      const vs = typeof navigator !== "undefined" && navigator.onLine ? this.fallbackVoices : this.fallbackVoices.filter((v) => v.localService);
      if (typeof speechSynthesis === "undefined" || (!navigator.onLine && !vs.length)) {
        this.setState("unavailable");
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = opts.slow ? 0.78 : 0.95;
      u.volume = this.volume;
      const pick = vs.find((v) => (opts.male ? /(male|daniel|fred|alex|aaron|arthur|guy|david|mark)/i : /(female|samantha|victoria|allison|ava|susan|zira|aria|jenny)/i).test(v.name) && v.localService)
        ?? vs.find((v) => v.localService) ?? vs[0];
      if (pick) { u.voice = pick; u.lang = pick.lang; }
      const waiting = () => { clearTimeout(timer); if (!request.done) this.setState("blocked"); };
      u.onend = () => request.finish(true);
      u.onerror = waiting;
      request.cleanup = () => { playAttempt++; clearTimeout(timer); u.onend = u.onerror = null; speechSynthesis.cancel(); };
      this.setState("playing");
      speechSynthesis.speak(u);
      timer = setTimeout(waiting, 1500 + text.length * 120);
    };
    request.retry = () => { request.cleanup(); start(); };
    start();
  }

  stop() {
    this.request?.finish(false);
  }

  private ac() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  private noise: AudioBuffer | null = null;
  private amb: { nextGull: number; nextBird: number; nextClink: number } | null = null;
  private ambientSounds = new Set<() => void>();

  /** Environmental sounds belong to the visible town, never the conversation or a background tab. */
  stopAmbience() {
    for (const stop of this.ambientSounds) stop();
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

  /** Brief, recognizable town sounds only. Continuous filtered-noise beds sounded like unwanted hiss. */
  ambience(on: boolean, { sea = 0, gulls = false, birds = 0, cafe = false }: { sea?: number; gulls?: boolean; birds?: number; cafe?: boolean } = {}) {
    const ctx = this.ctx;
    if (!on || document.hidden || this.volume <= 0 || !ctx || ctx.state !== "running") {
      this.stopAmbience();
      return;
    }
    const now = ctx.currentTime, v = this.volume;
    this.amb ??= { nextGull: now + 4, nextBird: now + 2, nextClink: now + 3 };
    if (gulls && now > this.amb.nextGull) {
      this.amb.nextGull = now + 6 + Math.random() * 9;
      const calls = 1 + Math.floor(Math.random() * 3);
      for (let k = 0; k < calls; k++) this.gull(now + k * 0.42, v * 0.035 * Math.max(0.4, sea));
    }
    // birdsong among the trees: a few quick chirps now and then
    if (birds > 0.05 && now > this.amb.nextBird) {
      this.amb.nextBird = now + (2.5 + Math.random() * 6) / Math.max(0.3, birds);
      const n = 2 + Math.floor(Math.random() * 4), top = 3200 + Math.random() * 1800;
      for (let k = 0; k < n; k++) this.chirp(now + k * (0.09 + Math.random() * 0.05), top * (0.92 + Math.random() * 0.16), v * 0.022 * birds);
    }
    if (cafe && now > this.amb.nextClink) {
      this.amb.nextClink = now + 3 + Math.random() * 6;
      this.clink(now + Math.random() * 0.2, v * 0.03);
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
    o.connect(g); g.connect(ctx.destination);
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
      o.connect(g); g.connect(ctx.destination);
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
      src.connect(f); f.connect(g); g.connect(ctx.destination);
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
    o.connect(f); f.connect(g); g.connect(ctx.destination);
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

  /** One footstep: a short burst of filtered noise, a little different each time (lower and softer indoors). */
  step(indoor: boolean, run: boolean) {
    const ctx = this.ac();
    if (!ctx || this.volume <= 0) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBurst(ctx);
    src.playbackRate.value = 0.85 + Math.random() * 0.3;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = (indoor ? 650 : 1150) * (0.85 + Math.random() * 0.3);
    f.Q.value = 1.1;
    const g = ctx.createGain();
    const v = this.volume * (indoor ? 0.09 : 0.07) * (run ? 1.3 : 1);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(v, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    src.start(now); src.stop(now + 0.12);
  }

  /** A hop's landing: both feet at once, a soft low thud (`strength` 0–1). */
  land(indoor: boolean, strength = 1) {
    const ctx = this.ac();
    if (!ctx || this.volume <= 0) return;
    const now = ctx.currentTime;
    for (const [at, lift] of [[0, 1], [0.035, 0.7]] as const) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBurst(ctx);
      src.playbackRate.value = 0.7 + Math.random() * 0.15;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = (indoor ? 420 : 700) * (0.9 + Math.random() * 0.2);
      f.Q.value = 0.9;
      const g = ctx.createGain();
      const v = this.volume * (indoor ? 0.12 : 0.1) * (0.6 + 0.4 * strength) * lift;
      g.gain.setValueAtTime(0, now + at);
      g.gain.linearRampToValueAtTime(v, now + at + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.13);
      src.connect(f); f.connect(g); g.connect(ctx.destination);
      src.start(now + at); src.stop(now + at + 0.16);
    }
  }

  sfx(name: "success" | "pop" | "door" | "cheer" | "soft" | "listen" | "coin" | "car" | "error" | "ring" | "beep" | "knock" | "tick") {
    const ctx = this.ac();
    if (!ctx) return;
    const now = ctx.currentTime;
    const g = ctx.createGain();
    g.connect(ctx.destination);
    const vol = this.volume * 0.18;
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
      case "coin": tone(988, 0, 0.1, "square", vol * 0.35); tone(1319, 0.08, 0.25, "square", vol * 0.35); break;
      case "door": tone(180, 0, 0.18, "triangle", vol * 0.8); tone(140, 0.12, 0.2, "triangle", vol * 0.6); break;
      case "car": tone(90, 0, 0.9, "sawtooth", vol * 0.25); break;
      case "error": tone(300, 0, 0.15, "triangle", vol * 0.5); tone(240, 0.1, 0.2, "triangle", vol * 0.5); break;
      case "ring": for (const at of [0, 0.5]) { tone(440, at, 0.35, "sine", vol * 0.45); tone(480, at, 0.35, "sine", vol * 0.45); } break;
      case "beep": tone(1000, 0, 0.4, "sine", vol * 0.5); break;
      case "knock": for (const at of [0, 0.16, 0.32]) tone(140, at, 0.07, "square", vol * 0.5); break;
      case "tick": tone(1180, 0, 0.05, "triangle", vol * 0.32); tone(1580, 0.03, 0.06, "triangle", vol * 0.22); break;
    }
  }
}

export const audio = new AudioSystem();
