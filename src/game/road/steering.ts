import { MathUtils } from "three";
import type { ModeFrame } from "../kit/modes";
import type { Pose } from "./ghost";
import { center, RAMP_LENGTH, RAMP_RISE, ROAD_HALF, type Feature, type Track } from "./track";
import { DRIVE_SECONDS } from "./run";

const { clamp, lerp } = MathUtils;
const ease = (dt: number, strength: number) => 1 - Math.exp(-dt * strength);
const GRAVITY = 17;
const TAKEOFF_SPEED = 4.55;

export class RoadCar {
  s = 0;
  x = 0;
  speed = 15;
  slide = 0;
  yaw = 0;
  drift = 0;
  boost = 0;
  wobble = 0;
  height = 0;
  private vertical = 0;
  private landed = false;
  private ramp?: Feature;

  get pose(): Pose { return [this.s, this.x, this.height, this.yaw]; }

  stumble() {
    if (this.wobble > 0.52) return;
    this.wobble = 0.8;
    this.speed *= 0.64;
  }

  drive({ dt, x, y, brake }: ModeFrame, time: number, track: Track, target?: number) {
    const s0 = this.s, x0 = this.x;
    if (target !== undefined) x = clamp((target - this.x) * 0.85 - this.slide * 0.13, -1, 1);
    const steer = clamp(x * 1.2, -1, 1);
    const drifting = brake && Math.abs(steer) > 0.13 && this.speed > 10;
    if (drifting) this.drift += dt;
    else if (!brake) {
      if (this.drift > 0.62) this.boost = Math.max(this.boost, 1.15);
      this.drift = 0;
    }
    this.boost = Math.max(0, this.boost - dt);
    this.wobble = Math.max(0, this.wobble - dt);
    const cruise = 16.2 + 9.6 * time / DRIVE_SECONDS;
    const want = cruise * (1 + y * 0.075 - (brake ? 0.11 : 0) - this.wobble * 0.42) + (this.boost > 0 ? 6.5 : 0);
    this.speed = lerp(this.speed, want, ease(dt, 2.25));
    this.s += this.speed * dt;
    const sideSpeed = steer * (drifting ? 7.7 : 6.7) * clamp(this.speed / 16, 0.58, 1.16);
    this.slide = lerp(this.slide, sideSpeed, ease(dt, drifting ? 3.4 : 9.5));
    this.yaw = lerp(this.yaw, -steer * (drifting ? 0.62 : 0.2) - this.slide * 0.015, ease(dt, 7.5));
    const planned = this.x + this.slide * dt;
    const limit = ROAD_HALF - 0.55;
    this.x = clamp(planned, -limit, limit);
    if (Math.abs(planned) > limit && Math.abs(this.slide) > 3.8) { this.stumble(); this.slide *= 0.5; }

    if (!this.ramp && (this.height > 0 || this.vertical !== 0)) {
      this.height += this.vertical * dt;
      this.vertical -= GRAVITY * dt;
      if (this.height <= 0) {
        this.height = 0;
        if (this.landed) this.vertical = 0;
        else { this.vertical = 1.55; this.landed = true; }
      }
    }
    let changed = false;
    for (const { features } of track.pieces.values()) for (const feature of features) {
      const contact = feature.kind === "ramp" ? feature.s - RAMP_LENGTH / 2 : feature.s;
      if (feature.hit || contact < s0 || contact >= this.s) continue;
      const crossing = Math.abs(this.x - feature.x);
      if (crossing > (feature.kind === "boost" || feature.kind === "ramp" ? 1.52 : 1.25) || this.height > 0.72) continue;
      feature.hit = changed = true;
      if (feature.kind === "boost") this.boost = Math.max(this.boost, 1.5);
      else if (feature.kind === "ramp") this.ramp = feature;
      else this.stumble();
    }
    if (this.ramp) {
      const lip = this.ramp.s + RAMP_LENGTH / 2;
      this.height = RAMP_RISE * clamp(1 + (this.s - lip) / RAMP_LENGTH, 0, 1);
      if (this.s >= lip) {
        const airTime = (this.s - lip) / this.speed;
        this.height += (TAKEOFF_SPEED - GRAVITY * airTime / 2) * airTime;
        this.vertical = TAKEOFF_SPEED - GRAVITY * airTime;
        this.landed = false;
        this.ramp = undefined;
      }
    }
    const groundDistance = Math.hypot(this.s - s0, center(this.s) + this.x - center(s0) - x0);
    return { changed, drifting, pace: this.speed / (cruise + 3), groundDistance };
  }
}
