import { MathUtils, PerspectiveCamera, Vector3 } from "three";
import { point } from "./track";

const { clamp, lerp, smoothstep, degToRad } = MathUtils;

type GateFrame = { distance: number; frame: readonly Vector3[] };
type ProjectedCar = ReturnType<typeof projectedCar>;

export function projectedCar(camera: PerspectiveCamera, roof: Vector3, corners: readonly Vector3[]) {
  const p = new Vector3();
  let left = Infinity, right = -Infinity;
  for (const corner of corners) {
    p.copy(corner).project(camera);
    left = Math.min(left, p.x);
    right = Math.max(right, p.x);
  }
  const horizon = camera.getWorldDirection(p).setY(0).applyQuaternion(camera.quaternion.clone().invert());
  const projection = camera.projectionMatrix.elements;
  const horizonY = -projection[5] * horizon.y / horizon.z - projection[9];
  return { roof: roof.clone().project(camera), width: right - left, horizonY };
}

export class RoadChase {
  private yaw = 0;
  private pan = 0;
  private back = 0;
  private widen = 0;
  private lens = 1;
  private focus = new Vector3();
  private target = new Vector3();

  settle(camera: PerspectiveCamera, start: PerspectiveCamera, inherited: ProjectedCar, roof: Vector3,
    corners: readonly Vector3[], mix: number, width: number, height: number) {
    const live = projectedCar(camera, roof, corners);
    const target = inherited.roof.clone().lerp(live.roof, mix);
    const targetWidth = lerp(inherited.width, live.width, mix);
    const horizonY = lerp(inherited.horizonY, live.horizonY, mix);
    camera.quaternion.slerp(start.quaternion, 1 - mix);
    camera.fov = lerp(start.fov, camera.fov, mix);
    camera.near = lerp(start.near, camera.near, mix);
    camera.far = lerp(start.far, camera.far, mix);
    if (start.view?.enabled) {
      camera.setViewOffset(width, height, start.view.offsetX / start.view.fullWidth * width * (1 - mix),
        start.view.offsetY / start.view.fullHeight * height * (1 - mix), width, height);
    } else camera.updateProjectionMatrix();

    const projection = camera.projectionMatrix.elements;
    const screenRight = projection[0], screenUp = projection[5];
    const forward = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const horizontal = forward.setY(0).applyQuaternion(camera.quaternion.clone().invert());
    camera.rotateX(Math.atan2(horizontal.y, -horizontal.z) - Math.atan((horizonY + projection[9]) / screenUp));
    const inverse = camera.quaternion.clone().invert();
    const local = corners.map((corner) => corner.clone().sub(roof).applyQuaternion(inverse));
    const roofX = target.x + projection[8], roofY = target.y + projection[9];

    // At depth d, the roof's screen position fixes its x and y in camera space.
    // Only depth is left to solve, using all eight corners for the chassis width.
    let near = Math.max(...local.map((corner) => corner.z)) + camera.near;
    let far = camera.far * 0.5;
    for (let i = 0; i < 22; i++) {
      const depth = (near + far) / 2;
      let left = Infinity, right = -Infinity;
      for (const corner of local) {
        const x = (roofX * depth + corner.x * screenRight) / (depth - corner.z);
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
      if (right - left > targetWidth) near = depth;
      else far = depth;
    }
    const depth = (near + far) / 2;
    this.target.set(roofX * depth / screenRight, roofY * depth / screenUp, -depth).applyQuaternion(camera.quaternion);
    camera.position.copy(roof).sub(this.target);
    camera.updateMatrixWorld(true);
  }

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
    const zoom = portrait ? clamp(3.25 * aspect, 1, 2.15) : short ? 2.4 : 1.25;
    const targetLens = 1 + zoom * approaching;
    this.lens = lerp(this.lens, targetLens, ease);
    const vertical = Math.tan(degToRad((baseFov + this.widen * (portrait ? 19 : 12)) / 2)) / this.lens;
    const fov = MathUtils.radToDeg(2 * Math.atan(vertical));
    const pitch = Math.atan(vertical * 0.20);
    const sin = Math.sin(pitch), cos = Math.cos(pitch);
    const horizontal = vertical * aspect;
    const gateBlend = 1 - smoothstep(remaining, 85, 100);
    const shake = Math.max(0, pace - 0.86) * 0.13 * (1 - gateBlend);
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
    const carFit = fitBack;
    if (gate && gateBlend > 0) fit(gate.frame, 0.93, portrait ? 0.43 : short ? 0.62 : 0.48, 0.44);
    fitBack = lerp(carFit, fitBack, gateBlend);
    this.back = Math.max(fitBack, lerp(this.back, fitBack, ease));
    cam.aspect = aspect;
    cam.fov = fov;
    cam.position.set(this.focus.x - dx * this.back + Math.sin(time * 39) * shake, eyeY, this.focus.z - dz * this.back);
    cam.lookAt(this.target.set(cam.position.x + dx * cos, eyeY - sin, cam.position.z + dz * cos));
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }
}
