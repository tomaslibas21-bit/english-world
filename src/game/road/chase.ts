import { MathUtils, PerspectiveCamera, Vector3 } from "three";
import { point } from "./track";

const { clamp, lerp, smoothstep, degToRad } = MathUtils;
const PITCH = 0.088;
const SIN = Math.sin(PITCH), COS = Math.cos(PITCH);

type GateFrame = { distance: number; frame: readonly Vector3[] };

export class RoadChase {
  private yaw = 0;
  private pan = 0;
  private back = 0;
  private widen = 0;
  private focus = new Vector3();
  private target = new Vector3();

  update(cam: PerspectiveCamera, car: Vector3, distance: number, lift: number, pace: number, time: number,
    dt: number, width: number, height: number, carCorners: readonly Vector3[], gate?: GateFrame) {
    const portrait = height > width * 1.15;
    const aspect = width / Math.max(1, height);
    const remaining = gate ? Math.max(0, gate.distance - distance) : Infinity;
    const nearGate = 1 - smoothstep(remaining, 3, 27);
    const aim = gate && remaining < 120 ? point(gate.distance) : point(distance + 27);
    const ease = dt ? 1 - Math.exp(-dt * 9) : 1;
    const more = 1 - smoothstep(remaining, 2, portrait ? 24 : 15);
    this.pan = lerp(this.pan, nearGate * 0.76, ease);
    this.widen = lerp(this.widen, more, ease);
    this.focus.copy(car);
    this.focus.x = lerp(car.x, point(distance).x, this.pan);
    const angle = clamp(Math.atan2(aim.x - this.focus.x, Math.max(23, -aim.z - distance)), -0.35, 0.35);
    this.yaw = lerp(this.yaw, angle, ease);
    const dx = Math.sin(this.yaw), dz = -Math.cos(this.yaw);

    const baseFov = (portrait ? 40 : 27) + pace * (portrait ? 4.5 : 4);
    const fov = baseFov + this.widen * (portrait ? 19 : 12);
    const vertical = Math.tan(degToRad(fov / 2));
    const horizontal = vertical * aspect;
    const shake = Math.max(0, pace - 0.86) * 0.13;
    const eyeY = car.y + (portrait ? 3.55 : 2.38) - lift * 0.32 + pace * 0.36 + Math.cos(time * 33) * shake;
    const baseBack = (portrait ? 12.0 : 8.7) + pace * 1.10;
    let fitBack = baseBack;
    const fit = (corners: readonly Vector3[], clampX: number, upper: number, lower: number) => {
      for (const corner of corners) {
        const x = corner.x - this.focus.x, z = corner.z - this.focus.z;
        const side = Math.abs(-dz * x + dx * z) + shake;
        const ahead = dx * x + dz * z;
        const y = corner.y - eyeY;
        fitBack = Math.max(fitBack,
          (side / (clampX * horizontal) + SIN * y) / COS - ahead,
          y * (COS + upper * vertical * SIN) / (upper * vertical * COS - SIN) - ahead,
          y * (lower * vertical * SIN - COS) / (SIN + lower * vertical * COS) - ahead);
      }
    };
    fit(carCorners, 0.92, 0.88, 0.89);
    // Ease out as the car reaches the arches. Their banners stay between the HUD and the driving controls.
    if (gate && remaining < 85) fit(gate.frame, 0.93, portrait ? 0.43 : 0.48, 0.44);
    this.back = Math.max(fitBack, lerp(this.back, fitBack, ease));
    cam.aspect = aspect;
    cam.fov = fov;
    cam.position.set(this.focus.x - dx * this.back + Math.sin(time * 39) * shake, eyeY, this.focus.z - dz * this.back);
    cam.lookAt(this.target.set(cam.position.x + dx * COS, eyeY - SIN, cam.position.z + dz * COS));
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }
}
