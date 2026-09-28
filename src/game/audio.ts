// Voice playback (pre-generated clips; browser speech synthesis as a fallback for lines that
// have no clip yet) and small synthesized sound effects. No network TTS is ever called.
import { audioKey, withoutAddressedNames } from "../audio-key";

export class AudioSystem {
  manifest: Record<string, number> = {};
  private ctx: AudioContext | null = null;
  private current: HTMLAudioElement | null = null;
  private cancelCurrent: (() => void) | null = null;
  volume = 0.9;
  /** Where the clips live: next to the game by default, or VITE_AUDIO_BASE (e.g. a CDN). */
  base = (import.meta.env.VITE_AUDIO_BASE as string | undefined) || `${import.meta.env.BASE_URL}audio/`;
  ready = false;
  private fallbackVoices: SpeechSynthesisVoice[] = [];

  async init() {
    try {
      // the clip list always ships with the game (same site, no CORS), even when the clips are elsewhere
      const r = await fetch(`${import.meta.env.BASE_URL}audio/manifest.json`, { cache: "no-cache" });
      if (r.ok) this.manifest = await r.json();
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
    let key = audioKey(voice, speed, text);
    if (!this.manifest[key]) {
      const alt = withoutAddressedNames(text, this.names);
      if (alt && this.manifest[audioKey(voice, speed, alt)]) key = audioKey(voice, speed, alt);
    }
    if (this.manifest[key]) {
      return new Promise((resolve) => {
        const a = new Audio(this.base + key + ".mp3");
        a.volume = this.volume;
        a.preservesPitch = true;
        a.playbackRate = opts.slow ? 0.82 : 1;
        this.current = a;
        let done = false;
        const finish = () => { if (done) return; done = true; if (this.current === a) this.current = null; resolve(); };
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

  private speakFallback(text: string, opts: { slow?: boolean; male?: boolean }): Promise<void> {
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

  sfx(name: "success" | "pop" | "door" | "stamp" | "soft" | "listen" | "coin" | "car" | "error") {
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
    }
  }
}

export const audio = new AudioSystem();
