// Where the radio's sound comes out. Two ways, as for the voices (src/game/audio.ts, docs/MOBILE-AUDIO.md):
//   - an <audio> element everywhere but iPhone and iPad: it streams a song, and the next one starts on the same
//     element inside "ended";
//   - the game's own Web Audio context on iPhone and iPad. A media element there shares a native audio session with
//     speech recognition and has left the voices quiet after microphone use, so no media element exists on those
//     devices, the radio's included. A song is fetched and decoded whole, one at a time.
// Neither starts by itself: play() is the radio's only way to make a sound, and pause() always silences at once.

/** play() refused for want of a tap (the browser's autoplay rule): not the song's fault. */
export class NeedsTap extends Error { constructor() { super("the browser wants a tap first"); this.name = "NeedsTap"; } }

export interface RadioOutput {
  /** Start the recording at `url` from `at` seconds. Settles when it sounds; rejects with NeedsTap, or with another
   *  error when the recording can't be played. A later play() or pause() makes an unfinished one settle quietly. */
  play(url: string, at: number, exact?: boolean): Promise<boolean>;
  /** Silence now. The place in the song is kept for position(). */
  pause(): void;
  /** Seconds into the song. */
  position(): number;
  duration?(): number;
  playbackRate?(): number;
  setPlaybackRate?(rate: number): void;
  /** Release the borrowed recording and any prefetched bytes. */
  clear?(): void;
  /** 0–1, at once or over `ms`. */
  setVolume(volume: number, ms?: number): void;
  /** In a tap: whatever lets a later play() sound without one. */
  unlock(): void;
  /** Fetch a recording ahead of its turn (where that helps). */
  prepare?(url: string): void;
  /** The song played to its end. */
  onEnded: (() => void) | null;
  /** The sound stopped without the radio asking (a broken download, the system taking the audio away). */
  onStopped: ((reason: "error" | "interrupted") => void) | null;
}

const SILENCE = "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQIAAAAAAA==";

export class HtmlOutput implements RadioOutput {
  onEnded: (() => void) | null = null;
  onStopped: ((reason: "error" | "interrupted") => void) | null = null;
  private el: HTMLAudioElement | null = null;
  private url = "";
  /** The radio means the element to sound. Anything else that starts it (a headset key, the system's media
   *  controls) is stopped again: during a conversation the element must stay silent whatever asks. */
  private wanted = false;
  private run = 0;
  private unlocked = false;
  private level = 1;
  private fade: ReturnType<typeof setInterval> | undefined;
  private settleSeek?: () => void;

  private media(): HTMLAudioElement {
    if (this.el) return this.el;
    const el = this.el = new Audio();
    el.preload = "auto";
    el.addEventListener("ended", () => { if (this.wanted && el.ended && el.src !== SILENCE) this.onEnded?.(); });
    // el.error is cleared when another recording is set: a late event of the one before is not this one's failure
    el.addEventListener("error", () => { if (this.wanted && el.error && el.src !== SILENCE) { this.wanted = false; this.onStopped?.("error"); } });
    el.addEventListener("play", () => { if (!this.wanted && el.src !== SILENCE) el.pause(); });
    el.addEventListener("pause", () => {
      // paused by the system or a hardware key while the radio meant it to play. Not the pause at a song's end, and
      // not the late event of the radio's own pause before the next song (by then play() has run: paused is false).
      if (this.wanted && el.paused && !el.ended && el.src !== SILENCE && el.readyState > 0) { this.wanted = false; this.onStopped?.("interrupted"); }
    });
    return el;
  }

  unlock() {
    if (this.unlocked || this.wanted) return;
    const el = this.media();
    if (el.src && el.src !== SILENCE) { this.unlocked = true; return; } // it has played a song before
    el.src = SILENCE;
    void el.play().then(() => { this.unlocked = true; if (el.src === SILENCE) el.pause(); }).catch(() => { /* the next tap tries again */ });
  }

  async play(url: string, at: number, exact = false): Promise<boolean> {
    const el = this.media();
    const run = ++this.run;
    this.settleSeek?.();
    this.wanted = true;
    const changed = this.url !== url || el.src === SILENCE || !el.src;
    if (changed) {
      this.url = url;
      el.src = url;
    }
    if (exact || (changed ? at > 0 : Math.abs(el.currentTime - at) > 1)) {
      try { el.currentTime = at; }
      catch (error) {
        if (exact) { this.wanted = false; throw error; }
      }
    }
    this.apply();
    try {
      await el.play();
      if (run !== this.run) return false;
      if (exact) {
        // Loading a source can replace a pre-metadata currentTime assignment. Apply it to the loaded source too.
        if (Math.abs(el.currentTime - at) > 0.15) el.currentTime = at;
        // play() may settle while a same-source seek is still pending. A caller may pause as soon as we return.
        if (el.seeking) await new Promise<void>((resolve) => {
          const done = () => {
            el.removeEventListener("seeked", done);
            el.removeEventListener("error", done);
            if (this.settleSeek === done) this.settleSeek = undefined;
            resolve();
          };
          this.settleSeek = done;
          el.addEventListener("seeked", done);
          el.addEventListener("error", done);
          if (!el.seeking || run !== this.run) done();
        });
        if (run !== this.run) return false;
        if (el.error) throw el.error;
      }
      this.unlocked = true;
      return this.wanted && this.url === url;
    } catch (error) {
      if (run !== this.run) return false; // paused or replaced meanwhile
      const name = (error as { name?: string } | null)?.name;
      this.wanted = false;
      if (name === "AbortError") return false;
      if (name === "NotAllowedError") throw new NeedsTap();
      throw error;
    }
  }

  pause() {
    this.run++;
    this.settleSeek?.();
    this.wanted = false;
    clearInterval(this.fade);
    try { this.el?.pause(); } catch { /* nothing was playing */ }
  }

  position() { return this.el && this.el.src !== SILENCE ? this.el.currentTime || 0 : 0; }
  duration() { return this.el && Number.isFinite(this.el.duration) ? this.el.duration : 0; }
  playbackRate() { return this.el?.playbackRate ?? 1; }
  setPlaybackRate(rate: number) {
    const el = this.media();
    el.defaultPlaybackRate = rate;
    el.playbackRate = rate;
  }

  clear() {
    this.pause();
    this.url = "";
    if (this.el) {
      this.el.removeAttribute("src");
      this.el.load();
    }
  }

  private apply() { try { if (this.el) this.el.volume = Math.max(0, Math.min(1, this.level)); } catch { /* a fixed-volume device */ } }

  setVolume(volume: number, ms = 0) {
    clearInterval(this.fade);
    const from = this.level, started = Date.now();
    if (!ms || !this.el) { this.level = volume; this.apply(); return; }
    this.fade = setInterval(() => {
      const q = Math.min(1, (Date.now() - started) / ms);
      this.level = from + (volume - from) * q;
      this.apply();
      if (q >= 1) clearInterval(this.fade);
    }, 30);
  }
}

type Decoder = BaseAudioContext & { decodeAudioData(data: ArrayBuffer, ok?: (b: AudioBuffer) => void, bad?: (e: unknown) => void): Promise<AudioBuffer> | void };

/** A whole song decoded at this rate is about 15 MB a minute (stereo): room for one song, never two. */
const DECODE_RATE = 32000;

export class BufferOutput implements RadioOutput {
  onEnded: (() => void) | null = null;
  onStopped: ((reason: "error" | "interrupted") => void) | null = null;
  private buffer: AudioBuffer | null = null;
  private url = "";
  private ahead: { url: string; bytes: Promise<ArrayBuffer> } | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private ctx: AudioContext | null = null;
  private startedAt = 0;
  private offset = 0;
  private sounding = false;
  private run = 0;
  private level = 1;

  /** `context`: the game's one AudioContext (audio.context()); `fetchBytes`: a recording's bytes. */
  constructor(private context: () => AudioContext | null, private fetchBytes: (url: string) => Promise<ArrayBuffer> = defaultFetch) {}

  unlock() {
    const ctx = this.context();
    if (ctx && ctx.state !== "running") { try { void ctx.resume().catch(() => {}); } catch { /* the next tap tries again */ } }
  }

  prepare(url: string) {
    if (this.url === url || this.ahead?.url === url) return;
    const bytes = this.fetchBytes(url);
    bytes.catch(() => { if (this.ahead?.bytes === bytes) this.ahead = null; });
    this.ahead = { url, bytes };
  }

  private async decode(bytes: ArrayBuffer): Promise<AudioBuffer> {
    const OAC = (globalThis as any).OfflineAudioContext || (globalThis as any).webkitOfflineAudioContext;
    if (!OAC) throw new Error("no audio decoder");
    let decoder: Decoder;
    try { decoder = new OAC(2, 1, DECODE_RATE); } catch { decoder = new OAC(2, 1, 44100); }
    return new Promise<AudioBuffer>((resolve, reject) => {
      const p = decoder.decodeAudioData(bytes, resolve, reject);
      if (p && typeof p.then === "function") p.then(resolve, reject);
    });
  }

  async play(url: string, at: number, exact = false): Promise<boolean> {
    const run = ++this.run;
    this.stopSource();
    // the place asked for is the place from now on, also for a pause that comes while the song is still loading
    this.offset = Math.max(0, at);
    if (this.url !== url || !this.buffer) {
      // the last song's sound leaves memory before the next one is decoded
      this.buffer = null;
      this.url = url;
      const ahead = this.ahead?.url === url ? this.ahead.bytes : null;
      this.ahead = null;
      const bytes = await (ahead ?? this.fetchBytes(url));
      if (run !== this.run) return false;
      const buffer = await this.decode(bytes);
      if (run !== this.run) return false;
      this.buffer = buffer;
    }
    const ctx = this.context();
    if (!ctx) throw new Error("no audio output");
    if (ctx.state !== "running") {
      try { await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 3000))]); } catch { /* checked below */ }
      if (run !== this.run) return false;
      if ((ctx.state as AudioContextState) !== "running") throw new NeedsTap();
    }
    const buffer = this.buffer;
    if (!buffer) return false;
    this.watch(ctx);
    const source = ctx.createBufferSource(), gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = this.level;
    source.connect(gain); gain.connect(ctx.destination);
    this.offset = Math.max(0, Math.min(at, buffer.duration - (exact ? 0 : 0.05)));
    source.onended = () => {
      if (this.source !== source) return;
      // stop() and an interruption end a source too: only the clock reaching the song's end is its end
      const done = this.position() + 0.05 >= buffer.duration;
      this.settle();
      source.disconnect();
      gain.disconnect();
      this.gain = null;
      if (done) { this.offset = 0; this.onEnded?.(); } else this.onStopped?.("interrupted");
    };
    this.source = source; this.gain = gain;
    this.startedAt = ctx.currentTime;
    this.sounding = true;
    source.start(0, this.offset);
    return true;
  }

  /** The context was taken away (a call, the page hidden): the song waits where it was. */
  private watch(ctx: AudioContext) {
    if (this.ctx === ctx) return;
    this.ctx = ctx;
    ctx.addEventListener("statechange", () => {
      if (this.ctx !== ctx || !this.sounding || ctx.state === "running") return;
      this.stopSource();
      this.onStopped?.("interrupted");
    });
  }

  private settle() {
    if (this.sounding && this.ctx) this.offset += Math.max(0, this.ctx.currentTime - this.startedAt);
    this.sounding = false;
    this.source = null;
  }

  private stopSource() {
    const source = this.source;
    this.settle();
    if (!source) return;
    source.onended = null;
    try { source.stop(); } catch { /* it never started */ }
    try { source.disconnect(); this.gain?.disconnect(); } catch { /* already gone */ }
    this.gain = null;
  }

  pause() { this.run++; this.stopSource(); }

  clear() {
    this.pause();
    this.buffer = this.ahead = null;
    this.url = "";
    this.offset = 0;
  }

  position() {
    return this.sounding && this.ctx ? this.offset + Math.max(0, this.ctx.currentTime - this.startedAt) : this.offset;
  }

  duration() { return this.buffer?.duration ?? 0; }

  setVolume(volume: number, ms = 0) {
    this.level = Math.max(0, Math.min(1, volume));
    const g = this.gain?.gain, ctx = this.ctx;
    if (!g || !ctx) return;
    try {
      g.cancelScheduledValues(ctx.currentTime);
      if (!ms) { g.value = this.level; return; }
      g.setValueAtTime(g.value, ctx.currentTime);
      g.linearRampToValueAtTime(this.level, ctx.currentTime + ms / 1000);
    } catch { g.value = this.level; }
  }
}

async function defaultFetch(url: string): Promise<ArrayBuffer> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`recording: ${r.status}`);
  return r.arrayBuffer();
}
