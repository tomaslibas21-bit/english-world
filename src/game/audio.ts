// Voice playback (pre-generated clips; browser speech synthesis as a fallback for lines that
// have no clip yet) and small synthesized sound effects. No network TTS is ever called.
import { audioKey, withoutAddressedNames } from "../audio-key";
import { audioDir } from "../content/voices";

/** The clips' loudness is worked out this many times a second. */
const ENVELOPE_RATE = 30;

export class AudioSystem {
  manifest: Record<string, number> = {};
  /** New content hashes for clips re-recorded at the same keys (repair-versions.json in the clip folder): the version on
   *  the clip's address makes browsers that cached the old recording fetch the new one. */
  repairVersions: Record<string, string> = {};
  private ctx: AudioContext | null = null;
  private current: HTMLAudioElement | null = null;
  private cancelCurrent: (() => void) | null = null;
  volume = 0.9;
  /** Where the clips live: next to the game by default, or VITE_AUDIO_BASE (e.g. a CDN). */
  base = (import.meta.env.VITE_AUDIO_BASE as string | undefined) || `${import.meta.env.BASE_URL}${audioDir()}`;
  ready = false;
  private fallbackVoices: SpeechSynthesisVoice[] = [];
  /** The clip playing now, and its loudness once worked out (see loudness()), for the speaker's mouth. */
  private clip: { el: HTMLAudioElement; key: string; done: boolean } | null = null;
  /** Each clip's loudness: null while being worked out, empty when that failed. */
  private envelopes = new Map<string, Float32Array | null>();
  private decoder: BaseAudioContext | null = null;

  async init() {
    try {
      // the clip list always ships with the game (same site, no CORS), even when the clips are elsewhere
      const r = await fetch(`${import.meta.env.BASE_URL}${audioDir()}manifest.json`, { cache: "no-cache" });
      if (r.ok) this.manifest = await r.json();
      const repaired = await fetch(`${import.meta.env.BASE_URL}${audioDir()}repair-versions.json`, { cache: "no-cache" });
      if (repaired.ok) this.repairVersions = await repaired.json();
    } catch { /* no clips yet: fallback voices */ }
    this.ready = true;
    if (typeof speechSynthesis !== "undefined") {
      const load = () => { this.fallbackVoices = speechSynthesis.getVoices().filter((v) => /^en[-_]US/i.test(v.lang)); };
      load();
      speechSynthesis.onvoiceschanged = load;
    }
  }

  hasClip(voice: string, speed: number, text: string) { return !!this.manifest[audioKey(voice, speed, text)]; }
  clipDuration(voice: string, speed: number, text: string) { return this.manifest[audioKey(voice, speed, text)] ?? null; }

  /** Play one line. Resolves when finished (or stopped). */
  /** The player's names (lines that address the player by name are voiced without it). */
  names: string[] = [];

  play(voice: string, speed: number, text: string, opts: { slow?: boolean; male?: boolean } = {}): Promise<void> {
    this.stop();
    // nothing to say (a hint whose blank is still empty comes out as ".")
    if (!/[a-z0-9]/i.test(text)) return Promise.resolve();
    let key = audioKey(voice, speed, text);
    if (!this.manifest[key]) {
      const alt = withoutAddressedNames(text, this.names);
      if (alt && this.manifest[audioKey(voice, speed, alt)]) key = audioKey(voice, speed, alt);
    }
    if (this.manifest[key]) {
      return new Promise((resolve) => {
        const version = this.repairVersions[key];
        const a = new Audio(this.base + key + ".mp3" + (version ? `?v=${version.slice(0, 12)}` : ""));
        a.volume = this.volume;
        a.preservesPitch = true;
        a.playbackRate = opts.slow ? 0.82 : 1;
        this.current = a;
        const clip = { el: a, key, done: false };
        this.clip = clip;
        let done = false;
        const finish = () => { if (done) return; done = true; clip.done = true; if (this.current === a) this.current = null; resolve(); };
        this.cancelCurrent = () => { a.pause(); finish(); };
        a.onended = finish;
        a.onerror = () => { finish(); };
        a.play().catch(() => finish());
        // safety net
        setTimeout(finish, ((this.manifest[key] || 4) / (opts.slow ? 0.82 : 1)) * 1000 + 1500);
      });
    }
    return this.speakFallback(text, opts);
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
      const buf = await new Promise<AudioBuffer>((res, rej) => dec.decodeAudioData(bytes, res, rej));
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

  private speakFallback(text: string, opts: { slow?: boolean; male?: boolean }): Promise<void> {
    this.clip = null;
    if (typeof speechSynthesis === "undefined") return new Promise((r) => setTimeout(r, Math.min(6000, 600 + text.length * 55)));
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = opts.slow ? 0.78 : 0.95;
      u.volume = this.volume;
      const vs = this.fallbackVoices;
      const pick = vs.find((v) => (opts.male ? /(male|daniel|fred|alex|aaron|arthur|guy|david|mark)/i : /(female|samantha|victoria|allison|ava|susan|zira|aria|jenny)/i).test(v.name) && v.localService)
        ?? vs.find((v) => v.localService) ?? vs[0];
      if (pick) u.voice = pick;
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      u.onend = finish; u.onerror = finish;
      this.cancelCurrent = () => { speechSynthesis.cancel(); finish(); };
      speechSynthesis.speak(u);
      setTimeout(finish, 1500 + text.length * 120);
    });
  }

  stop() {
    const c = this.cancelCurrent;
    this.cancelCurrent = null;
    if (c) c();
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
  /** One footstep: a short burst of filtered noise, a little different each time (lower and softer indoors). */
  step(indoor: boolean, run: boolean) {
    const ctx = this.ac();
    if (!ctx || this.volume <= 0) return;
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.12), ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    }
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
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

  sfx(name: "success" | "pop" | "door" | "stamp" | "soft" | "listen" | "coin" | "car" | "error" | "ring" | "beep" | "knock") {
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
      case "stamp": tone(523, 0, 0.2); tone(659, 0.1, 0.2); tone(784, 0.2, 0.25); tone(1047, 0.32, 0.45); break;
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
    }
  }
}

export const audio = new AudioSystem();
