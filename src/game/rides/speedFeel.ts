import type { PerspectiveCamera } from "three";
import { audio } from "../audio";
import "./speedFeel.css";

const VISUAL_RESUME = 0.35;

interface SpeedFeelReadout {
  readonly fov: number;
  readonly baseFov: number;
  readonly fovDelta: number;
  readonly streakCount: number;
  readonly windGain: number;
  readonly enginePitch: number;
  readonly shakeAmplitude: number;
  readonly reducedMotion: boolean;
  readonly active: boolean;
  readonly speed: number;
}

declare global {
  interface Window { __speedFeel?: SpeedFeelReadout }
}

/** The player's car cues, owned by the game that presents the canvas. */
export class SpeedFeel {
  private readonly strips = document.createElement("div");
  private readonly readout: SpeedFeelReadout;
  private active = false;
  private speed = 0;
  private envelope = 0;
  private tier = 0;
  private resume = VISUAL_RESUME;
  private lensDelta = 0;
  private presentedFov = 0;
  private amplitude = 0;
  private offsetY = 0;
  private presentedY = 0;

  constructor(stage: HTMLElement, private readonly cam: PerspectiveCamera, private readonly townMax: number, private readonly motion?: MediaQueryList) {
    this.strips.className = "speed-feel";
    this.strips.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 4; i++) this.strips.appendChild(document.createElement("span"));
    stage.appendChild(this.strips);
    if (this.reducedMotion) this.resume = 0;
    motion?.addEventListener("change", this.onMotionChange);

    const feel = this;
    this.readout = Object.freeze({
      get fov() { return cam.fov; },
      get baseFov() { return feel.baseFov; },
      get fovDelta() { return feel.fovDelta; },
      get streakCount() { return feel.reducedMotion ? 0 : feel.tier * 2; },
      get windGain() { return feel.active ? audio.windGainTarget : 0; },
      get enginePitch() { return feel.active ? audio.carPitchTarget : 0; },
      get shakeAmplitude() { return feel.amplitude; },
      get reducedMotion() { return feel.reducedMotion; },
      get active() { return feel.active; },
      get speed() { return feel.active ? feel.speed : 0; },
    });
    window.__speedFeel = this.readout;
  }

  private get reducedMotion() { return this.motion?.matches ?? false; }
  // An authored shot may have written the lens between frames.
  private get fovDelta() { return this.cam.fov === this.presentedFov ? this.lensDelta : 0; }
  get baseFov() { return this.cam.fov - this.fovDelta; }

  stepTown(dt: number, pace: number) {
    this.speed = pace;
    const target = Math.max(0, Math.min(1, pace / this.townMax));
    const tau = target > this.envelope ? 0.22 : 0.32;
    this.envelope += (target - this.envelope) * (1 - Math.exp(-Math.max(0, Math.min(0.05, dt)) / tau));
    if (target === 0 && this.envelope < 0.002) this.envelope = 0;
  }

  sound() {
    this.active = true;
    const e = this.envelope;
    audio.motor("car", e);
    audio.rush("wind", 0.72 * e * e, e);
  }

  private setTier(tier: number) {
    if (this.tier === tier) return;
    this.tier = tier;
    this.strips.dataset.tier = String(tier);
  }

  private readonly onMotionChange = () => {
    const reduced = this.reducedMotion;
    this.resume = reduced || this.active ? 0 : VISUAL_RESUME;
    this.strips.classList.toggle("resuming", !reduced && this.active);
    if (reduced) {
      this.clearPose();
      this.setTier(0);
    }
  };

  /** Called once after the rig places the camera, with the eased base lens for this shot. */
  present(base: number, dt: number, time: number, follow: boolean) {
    if (!this.active) return base;
    const reduced = this.reducedMotion, show = follow && !reduced;
    if (reduced) this.resume = 0;
    else if (show && this.resume < VISUAL_RESUME) {
      this.resume = Math.min(VISUAL_RESUME, this.resume + dt);
      if (this.resume === VISUAL_RESUME) this.strips.classList.remove("resuming");
    }
    const k = this.resume / VISUAL_RESUME;
    const strength = show ? k * k * (3 - 2 * k) : 0;
    const e = this.envelope;
    if (!show) this.setTier(0);
    else if (e >= (this.tier === 2 ? 0.79 : 0.83)) this.setTier(2);
    else this.setTier(e >= (this.tier > 0 ? 0.55 : 0.59) ? 1 : 0);
    this.amplitude = 0.0025 * e * e * strength;
    this.offsetY = this.amplitude * Math.sin(2 * Math.PI * 7 * time);
    this.cam.position.y += this.offsetY;
    this.presentedY = this.cam.position.y;
    this.lensDelta = 3.5 * e * strength;
    return this.presentedFov = base + this.lensDelta;
  }

  clearPose() {
    const base = this.baseFov;
    if (base !== this.cam.fov) {
      this.cam.fov = base;
      this.cam.updateProjectionMatrix();
    }
    if (this.offsetY && this.cam.position.y === this.presentedY) this.cam.position.y -= this.offsetY;
    this.lensDelta = this.amplitude = this.offsetY = 0;
  }

  release() {
    if (this.speed || this.envelope) this.speed = this.envelope = 0;
    if (!this.active) return false;
    this.active = false;
    this.resume = this.reducedMotion ? 0 : VISUAL_RESUME;
    this.strips.classList.remove("resuming");
    this.setTier(0);
    this.clearPose();
    audio.motor(null);
    audio.rush("wind", 0);
    return true;
  }

  dispose() {
    this.release();
    this.motion?.removeEventListener("change", this.onMotionChange);
    this.strips.remove();
    if (window.__speedFeel === this.readout) delete window.__speedFeel;
  }
}
