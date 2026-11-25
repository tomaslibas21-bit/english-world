import type { AudioSystem, VisualPlaybackState } from "../audio";
import type { VoiceVisualOwner } from "./contract";

export type VoiceSource = Pick<AudioSystem, "visualState" | "level" | "vowel">;

export class VoiceMouth {
  mouth = 0;
  roundness = 0.3;
  level: number | null = 0;
  sample: VisualPlaybackState | "text-only" | "unknown" | "quiet" | "voiced" = "text-only";
  silence = 1;
  private openness = 0;
  private age = 0;
  private owner?: VoiceVisualOwner;

  read(dt: number, audio?: VoiceSource, owner?: VoiceVisualOwner, paused = false) {
    if (this.owner !== owner) this.reset();
    this.owner = owner;
    const state = paused ? "blocked" : owner && audio ? audio.visualState(owner) : "text-only";
    if (state !== "playing" || !audio) {
      this.reset();
      this.sample = state;
      this.level = state === "ended" ? -1 : 0;
      return;
    }

    const level = this.level = audio.level(false);
    let target = 0, round = 0.3;
    if (level === null) {
      this.age += dt;
      target = 0.23 + 0.13 * Math.sin(this.age * 12);
    } else if (level > 0.05) {
      target = Math.min(1, level);
      round = audio.vowel() ?? round;
    }
    this.sample = level === null ? "unknown" : level < 0 ? "ended" : target ? "voiced" : "quiet";
    this.silence = target === 0 ? this.silence + dt : 0;
    this.openness += (target - this.openness) * (1 - Math.exp(-dt / (target > this.openness ? 0.045 : 0.080)));
    if (level === -1 || this.silence >= 0.24 - dt * 0.5) this.openness = 0;
    this.mouth = this.openness >= (this.mouth > 0 ? 0.04 : 0.08) ? this.openness : 0;
    this.roundness += (round - this.roundness) * (1 - Math.exp(-dt / 0.045));
  }

  reset() {
    this.openness = this.mouth = this.age = 0;
    this.silence = 1;
    this.roundness = 0.3;
  }
}
