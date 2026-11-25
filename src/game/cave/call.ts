import { audio } from "../audio";
import type { Stone } from "./plan";

export type Listener = { x: number; z: number; yaw: number };

export function stoneGain(distance: number) {
  return distance > 34 ? 0 : 0.06 + 0.94 * Math.max(0, 1 - distance / 30) ** 3;
}

/** One emitter, owned by its visit. The main audio engine owns the recording cache and world bus. */
export class StoneCall {
  private source?: AudioBufferSourceNode;
  private gain?: GainNode;
  private pan?: StereoPannerNode;
  private serial = 0;
  private done?: (said: boolean) => void;

  async start(voice: string, text: string, stone: Stone, ear: Listener, failed: () => void) {
    this.stop();
    const ticket = this.serial;
    try {
      const sound = await audio.positionalRecording(voice, text);
      if (ticket !== this.serial || !sound || sound.ctx.state !== "running" || audio.getState() !== "idle") return false;
      const { ctx, buffer, output } = sound;
      this.source = ctx.createBufferSource();
      this.source.buffer = buffer;
      this.gain = ctx.createGain();
      this.pan = ctx.createStereoPanner?.();
      this.source.connect(this.gain);
      if (this.pan) this.gain.connect(this.pan).connect(output);
      else this.gain.connect(output);
      this.move(stone, ear, true);
      const result = new Promise<boolean>((resolve) => { this.done = resolve; });
      this.source.onended = () => this.stop(true);
      this.source.start();
      return await result;
    } catch {
      if (ticket === this.serial) { this.stop(); failed(); }
      return false;
    }
  }

  move(stone: Stone, ear: Listener, first = false) {
    if (!this.gain) return;
    const dx = stone.x - ear.x, dz = stone.z - ear.z, d = Math.hypot(dx, dz);
    const gain = audio.volume * stoneGain(d);
    const right = dx * Math.cos(ear.yaw) - dz * Math.sin(ear.yaw);
    const pan = d < 0.6 ? 0 : -right / Math.max(3, d);
    const now = this.gain.context.currentTime;
    if (first || !gain) this.gain.gain.setValueAtTime(gain, now);
    else this.gain.gain.setTargetAtTime(gain, now, 0.1);
    this.pan?.pan.setTargetAtTime(pan, now, 0.1);
  }

  stop(said = false) {
    this.serial++;
    if (this.source) {
      this.source.onended = null;
      try { this.source.stop(); } catch { /* the buffer may not have started */ }
      this.source.disconnect();
      this.gain?.disconnect();
      this.pan?.disconnect();
      this.source = this.gain = this.pan = undefined;
    }
    this.done?.(said);
    this.done = undefined;
  }
}
