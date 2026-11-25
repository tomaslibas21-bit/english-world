import type { PerspectiveCamera } from "three";
import { audio } from "../audio";
import { CAR } from "./drive";
import "./speedFeel.css";

const RESUME_SECONDS = 0.35;
const OPACITY_STEPS = 256;
const OPACITY = Array.from({ length: OPACITY_STEPS + 1 }, (_, index) => String(index / OPACITY_STEPS));
const TIERS = ["0", "1", "2"];

interface SpeedFeelReadout {
  readonly fov: number;
  readonly baseFov: number;
  readonly fovDelta: number;
  readonly speed: number;
  readonly shakeAmplitude: number;
  readonly streakCount: number;
  readonly enginePitch: number;
  readonly windGain: number;
  readonly reducedMotion: boolean;
  readonly active: boolean;
}

declare global {
  interface Window { __speedFeel?: SpeedFeelReadout }
}

/** Feedback and the last presented camera for the player at the town wheel. */
export class SpeedFeel {
  private readonly strips = document.createElement("div");
  private readonly readout: SpeedFeelReadout;
  private active = false;
  private speed = 0;
  private envelope = 0;
  private tier = 0;
  private appliedReduced: boolean;
  private resume = RESUME_SECONDS;
  private opacityIndex = OPACITY_STEPS;
  private lensDelta = 0;
  private cleanFov = 0;
  private presentedFov = 0;
  private amplitude = 0;
  private offsetY = 0;
  private cleanY = 0;
  private presentedY = 0;
  private holdingTown = false;
  private readonly lastTown;

  constructor(stage: HTMLElement, private readonly cam: PerspectiveCamera, private readonly motion?: MediaQueryList) {
    this.lastTown = {
      w: 0, h: 0, position: cam.position.clone(), quaternion: cam.quaternion.clone(),
      near: cam.near, far: cam.far, zoom: cam.zoom, aspect: cam.aspect,
      fov: cam.fov, delta: 0, baseFov: cam.fov, baseY: 0, offsetY: 0,
      hasView: false, view: { enabled: false, fullWidth: 0, fullHeight: 0, offsetX: 0, offsetY: 0, width: 0, height: 0 },
    };
    this.strips.className = "speed-feel";
    this.strips.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 4; i++) this.strips.appendChild(document.createElement("span"));
    stage.appendChild(this.strips);
    this.appliedReduced = this.reducedMotion;
    motion?.addEventListener("change", this.syncMotion);

    const feel = this;
    this.readout = Object.freeze({
      get fov() { return cam.fov; },
      get baseFov() { return feel.baseFov; },
      get fovDelta() { return feel.fovDelta; },
      get speed() { return feel.speed; },
      get shakeAmplitude() { return feel.amplitude; },
      get streakCount() { return feel.tier * 2; },
      get enginePitch() { return feel.active ? audio.carPitchTarget : 0; },
      get windGain() { return feel.active ? audio.windGainTarget : 0; },
      get reducedMotion() { return feel.reducedMotion; },
      get active() { return feel.active; },
    });
    window.__speedFeel = this.readout;
  }

  get reducedMotion() { return this.motion?.matches ?? false; }
  private get fovDelta() { return this.cam.fov === this.presentedFov ? this.lensDelta : 0; }
  get baseFov() { return this.fovDelta ? this.cleanFov : this.cam.fov; }
  private get townOffsetY() { return this.cam.position.y === this.presentedY ? this.offsetY : 0; }

  stepTown(dt: number, pace: number) {
    this.syncMotion();
    this.active = true;
    this.speed = pace;
    const target = Math.max(0, Math.min(1, pace / CAR.max));
    const tau = target > this.envelope ? 0.22 : 0.32;
    const seconds = Math.max(0, Math.min(0.05, dt));
    if (seconds > 0) this.envelope = target + (this.envelope - target) * Math.exp(-seconds / tau);
    if (target === 0 && this.envelope < 0.002) this.envelope = 0;
  }

  sound() {
    if (!this.active) return;
    const e = this.envelope;
    audio.motor("car", e);
    audio.rush("wind", 0.72 * e * e, e);
  }

  private setTier(tier: number) {
    if (this.tier === tier) return;
    this.tier = tier;
    this.strips.dataset.tier = TIERS[tier];
  }

  private setStripStrength(strength: number) {
    const index = Math.round(strength * OPACITY_STEPS);
    if (index === this.opacityIndex) return;
    this.opacityIndex = index;
    this.strips.style.setProperty("--speed-feel-strength", OPACITY[index]);
  }

  private readonly syncMotion = () => {
    const reduced = this.reducedMotion;
    if (reduced === this.appliedReduced) return;
    this.appliedReduced = reduced;
    this.resume = reduced || this.active ? 0 : RESUME_SECONDS;
    if (reduced) {
      this.clearPose();
      this.setTier(0);
    }
    this.setStripStrength(this.resume === 0 ? 0 : 1);
  };

  /** Apply speed offsets once the rig and the view offset are in place. */
  presentTown(base: number, dt: number, time: number, follow: boolean) {
    this.syncMotion();
    const show = this.active && follow && !this.appliedReduced;
    let strength = 0;
    if (show) {
      if (dt > 0 && this.resume < RESUME_SECONDS) this.resume = Math.min(RESUME_SECONDS, this.resume + dt);
      const k = this.resume / RESUME_SECONDS;
      strength = k * k * (3 - 2 * k);
      this.setStripStrength(strength);
    }
    const e = this.envelope;
    if (!show) this.setTier(0);
    else if (e >= (this.tier === 2 ? 0.79 : 0.83)) this.setTier(2);
    else this.setTier(e >= (this.tier > 0 ? 0.55 : 0.59) ? 1 : 0);

    this.amplitude = 0.0025 * e * e * strength;
    this.offsetY = this.amplitude * Math.sin(2 * Math.PI * 7 * time);
    this.cleanY = this.cam.position.y;
    this.presentedY = this.cam.position.y += this.offsetY;
    this.cleanFov = base;
    this.lensDelta = 3.5 * e * strength;
    return this.presentedFov = base + this.lensDelta;
  }

  rememberTownPose(w: number, h: number) {
    if (!this.active) return;
    const frame = this.lastTown, { cam } = this;
    frame.w = w;
    frame.h = h;
    frame.position.copy(cam.position);
    frame.quaternion.copy(cam.quaternion);
    frame.near = cam.near;
    frame.far = cam.far;
    frame.zoom = cam.zoom;
    frame.aspect = cam.aspect;
    frame.fov = cam.fov;
    frame.delta = this.fovDelta;
    frame.baseFov = this.baseFov;
    frame.offsetY = this.townOffsetY;
    frame.baseY = frame.offsetY ? this.cleanY : cam.position.y;
    frame.hasView = cam.view !== null;
    if (cam.view) Object.assign(frame.view, cam.view);
  }

  /** The road and its town terrain reference start from the actual last draw. */
  holdTownPose(w: number, h: number) {
    this.syncMotion();
    const frame = this.lastTown, { cam } = this;
    if (frame.w === w && frame.h === h) {
      cam.position.copy(frame.position);
      cam.quaternion.copy(frame.quaternion);
      cam.near = frame.near;
      cam.far = frame.far;
      cam.zoom = frame.zoom;
      cam.aspect = frame.aspect;
      cam.view = frame.hasView ? { ...frame.view } : null;
      this.cleanFov = frame.baseFov;
      this.cleanY = frame.baseY;
      this.lensDelta = this.appliedReduced ? 0 : frame.delta;
      this.offsetY = this.appliedReduced ? 0 : frame.offsetY;
      cam.fov = this.presentedFov = this.appliedReduced ? frame.baseFov : frame.fov;
      if (this.appliedReduced) cam.position.y = frame.baseY;
      this.presentedY = cam.position.y;
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld(true);
    }
    this.holdingTown = true;
  }

  clearPose() {
    const base = this.baseFov;
    if (base !== this.cam.fov) {
      this.cam.fov = base;
      this.cam.updateProjectionMatrix();
    }
    if (this.townOffsetY) {
      this.cam.position.y = this.cleanY;
      this.cam.updateMatrixWorld(true);
    }
    this.lensDelta = this.amplitude = this.offsetY = 0;
    this.holdingTown = false;
  }

  restoreTownPose() { if (this.holdingTown) this.clearPose(); }

  release() {
    if (!this.active) return false;
    this.active = false;
    this.speed = this.envelope = this.amplitude = 0;
    this.lastTown.w = 0;
    this.resume = this.appliedReduced ? 0 : RESUME_SECONDS;
    this.setTier(0);
    if (!this.holdingTown) this.clearPose();
    audio.motor(null);
    audio.rush("wind", 0);
    return true;
  }

  dispose() {
    this.release();
    this.restoreTownPose();
    this.motion?.removeEventListener("change", this.syncMotion);
    this.strips.remove();
    if (window.__speedFeel === this.readout) delete window.__speedFeel;
  }
}
