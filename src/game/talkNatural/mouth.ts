import type { AudioSystem, VisualPlaybackState } from "../audio";
import type { VoiceVisualOwner } from "./contract";

type VoiceSource = Pick<AudioSystem, "visualState" | "level" | "vowel">;

/** Runs during lazy loading as well as after the pose attaches, so the lips keep their current envelope. */
export class VoiceMouth {
  mouth = 0;
  roundness = 0.3;
  level: number | null = null;
  sample: VisualPlaybackState | "text-only" | "unknown" | "quiet" | "voiced" = "text-only";
  silence = 1;
  private openness = 0;
  private age = 0;
  private owner?: VoiceVisualOwner;

  read(dt: number, audio?: VoiceSource, owner?: VoiceVisualOwner, paused = false) {
    if (owner && this.owner !== owner) this.reset();
    this.owner = owner;
    let state: VisualPlaybackState | "text-only" = owner && audio ? audio.visualState(owner) : "text-only";
    let level: number | null = state === "ended" ? -1 : null;
    let target = 0, round = 0.3;
    if (paused) { state = "blocked"; this.reset(); }
    else if (state === "playing" && audio) {
      level = audio.level(false);
      if (level === null) {
        this.age += dt;
        target = 0.23 + 0.13 * Math.sin(this.age * 12);
      } else if (level > 0.05) {
        target = Math.min(1, level);
        round = audio.vowel() ?? round;
      }
    }
    this.level = level;
    this.sample = state !== "playing" ? state : level === null ? "unknown" : level < 0 ? "ended" : target ? "voiced" : "quiet";
    this.silence = target === 0 ? this.silence + dt : 0;
    this.openness += (target - this.openness) * (1 - Math.exp(-dt / (target > this.openness ? 0.045 : 0.080)));
    if (this.silence >= 0.24 - dt * 0.5) this.openness = 0;
    this.mouth = this.openness >= (this.mouth > 0 ? 0.04 : 0.08) ? this.openness : 0;
    this.roundness += (round - this.roundness) * (1 - Math.exp(-dt / 0.045));
  }

  reset() {
    this.openness = this.mouth = this.age = 0;
    this.silence = 1;
  }
}
