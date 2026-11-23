import { MathUtils, PerspectiveCamera, Vector3 } from "three";
import { point } from "./track";

const { clamp, lerp, smoothstep, degToRad } = MathUtils;

type GateFrame = { distance: number; frame: readonly Vector3[] };

export class RoadChase {
  private yaw = 0;
  private pan = 0;
  private back = 0;
  private widen = 0;
  private lens = 1;
  private focus = new Vector3();
  private target = new Vector3();

  update(cam: PerspectiveCamera, car: Vector3, distance: number, lift: number, pace: number, time: number,
    dt: number, width: number, height: number, carCorners: readonly Vector3[], gate?: GateFrame) {
    const portrait = height > width * 1.15;
    // A phone on its side has little height, so the lens reaches further to keep the word boards readable.
    const short = !portrait && height < 520;
    const aspect = width / Math.max(1, height);
    const remaining = gate ? Math.max(0, gate.distance - distance) : Infinity;
    const nearGate = 1 - smoothstep(remaining, 3, 27);
    const aim = gate && remaining < 120 ? point(gate.distance) : point(distance + 27);
    // Let the passing arch move overhead before settling back into the driving shot.
    const ease = dt && this.back > 0 ? 1 - Math.exp(-dt * (gate ? 9 : 3)) : 1;
    const more = 1 - smoothstep(remaining, 2, portrait ? 24 : 15);
    this.pan = lerp(this.pan, nearGate * 0.76, ease);
    this.widen = lerp(this.widen, more, ease);
    this.focus.copy(car);
    this.focus.x = lerp(car.x, point(distance).x, this.pan);
    const angle = clamp(Math.atan2(aim.x - this.focus.x, Math.max(23, -aim.z - distance)), -0.35, 0.35);
    this.yaw = lerp(this.yaw, angle, ease);
    const dx = Math.sin(this.yaw), dz = -Math.cos(this.yaw);

    const baseFov = (portrait ? 40 : 27) + pace * (portrait ? 4.5 : 4);
    // A longer lens brings the gate row forward while a matching dolly preserves the car's size.
    // Release it progressively on the last stretch so the player still feels the pass overhead.
    const approaching = gate ? smoothstep(remaining, 9, 53) * (1 - smoothstep(remaining, 85, 135)) : 0;
    const zoom = portrait ? clamp(3.25 * aspect, 1, 2.15) : short ? 2.4 : 0.78;
    const targetLens = 1 + zoom * approaching;
    this.lens = lerp(this.lens, targetLens, ease);
    const vertical = Math.tan(degToRad((baseFov + this.widen * (portrait ? 19 : 12)) / 2)) / this.lens;
    const fov = MathUtils.radToDeg(2 * Math.atan(vertical));
    const pitch = Math.atan(vertical * 0.20);
    const sin = Math.sin(pitch), cos = Math.cos(pitch);
    const horizontal = vertical * aspect;
    const shake = Math.max(0, pace - 0.86) * 0.13;
    const eyeY = car.y + (portrait ? 3.55 : 2.68) - lift * 0.32 + pace * 0.36 + Math.cos(time * 33) * shake;
    const baseBack = ((portrait ? 12.0 : 8.7) + pace * 1.10) * this.lens;
    let fitBack = baseBack;
    const fit = (corners: readonly Vector3[], clampX: number, upper: number, lower: number) => {
      for (const corner of corners) {
        const x = corner.x - this.focus.x, z = corner.z - this.focus.z;
        const side = Math.abs(-dz * x + dx * z) + shake;
        const ahead = dx * x + dz * z;
        const y = corner.y - eyeY;
        fitBack = Math.max(fitBack,
          (side / (clampX * horizontal) + sin * y) / cos - ahead,
          y * (cos + upper * vertical * sin) / (upper * vertical * cos - sin) - ahead,
          y * (lower * vertical * sin - cos) / (sin + lower * vertical * cos) - ahead);
      }
    };
    fit(carCorners, 0.92, 0.88, 0.89);
    // Ease out as the car reaches the arches. Their banners stay between the HUD and the driving controls.
    if (gate && remaining < 85) fit(gate.frame, 0.93, portrait ? 0.43 : short ? 0.62 : 0.48, 0.44);
    this.back = Math.max(fitBack, lerp(this.back, fitBack, ease));
    cam.aspect = aspect;
    cam.fov = fov;
    cam.position.set(this.focus.x - dx * this.back + Math.sin(time * 39) * shake, eyeY, this.focus.z - dz * this.back);
    cam.lookAt(this.target.set(cam.position.x + dx * cos, eyeY - sin, cam.position.z + dz * cos));
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }
}
