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
  speedFovDelta = 0;
  shakeAmplitude = 0;
  shakeY = 0;

  settle(camera: PerspectiveCamera, start: PerspectiveCamera, inherited: ProjectedCar, roof: Vector3,
    corners: readonly Vector3[], mix: number, width: number, height: number, startFov: number) {
    const live = projectedCar(camera, roof, corners);
    // Scale the inherited registration around its principal point when reducing its speed lens.
    const scale = startFov === start.fov ? 1 : Math.tan(degToRad(start.fov / 2)) / Math.tan(degToRad(startFov / 2));
    const startProjection = start.projectionMatrix.elements;
    const shiftX = startProjection[8], shiftY = startProjection[9];
    const targetX = lerp((inherited.roof.x + shiftX) * scale - shiftX, live.roof.x, mix);
    const targetY = lerp((inherited.roof.y + shiftY) * scale - shiftY, live.roof.y, mix);
    const targetWidth = lerp(inherited.width * scale, live.width, mix);
    const horizonY = lerp((inherited.horizonY + shiftY) * scale - shiftY, live.horizonY, mix);
    camera.quaternion.slerp(start.quaternion, 1 - mix);
    camera.fov = lerp(startFov, camera.fov, mix);
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
    const roofX = targetX + projection[8], roofY = targetY + projection[9];

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

  private fitCorners(corners: readonly Vector3[], back: number, eyeY: number, dx: number, dz: number,
    vertical: number, aspect: number, clampX: number, upper: number, lower: number) {
    const pitch = Math.atan(vertical * 0.20), sin = Math.sin(pitch), cos = Math.cos(pitch);
    const horizontal = vertical * aspect;
    for (const corner of corners) {
      const x = corner.x - this.focus.x, z = corner.z - this.focus.z;
      const side = Math.abs(-dz * x + dx * z), ahead = dx * x + dz * z;
      const y = corner.y - eyeY;
      back = Math.max(back,
        (side / (clampX * horizontal) + sin * y) / cos - ahead,
        y * (cos + upper * vertical * sin) / (upper * vertical * cos - sin) - ahead,
        y * (lower * vertical * sin - cos) / (sin + lower * vertical * cos) - ahead);
    }
    return back;
  }

  private fitShot(corners: readonly Vector3[], back: number, eyeY: number, dx: number, dz: number,
    vertical: number, aspect: number, upper: number, gateBlend: number, gate?: GateFrame) {
    const carFit = this.fitCorners(corners, back, eyeY, dx, dz, vertical, aspect, 0.92, 0.88, 0.89);
    // Ease out as the car reaches the arches. Their banners stay between the HUD and the driving controls.
    if (!gate || gateBlend <= 0) return carFit;
    const gateFit = this.fitCorners(gate.frame, carFit, eyeY, dx, dz, vertical, aspect, 0.93, upper, 0.44);
    return lerp(carFit, gateFit, gateBlend);
  }

  update(cam: PerspectiveCamera, car: Vector3, distance: number, lift: number, visualPace: number, time: number,
    dt: number, width: number, height: number, carCorners: readonly Vector3[], gate?: GateFrame, amplitude = 0) {
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

    const wideFov = (portrait ? 40 : 27) + this.widen * (portrait ? 19 : 12);
    // A longer lens brings the gate row forward while a matching dolly preserves the car's size.
    // Release it progressively on the last stretch so the player still feels the pass overhead.
    const approaching = gate ? smoothstep(remaining, 9, 53) * (1 - smoothstep(remaining, 85, 135)) : 0;
    const zoom = portrait ? clamp(3.25 * aspect, 1, 2.15) : short ? 2.4 : 1.25;
    const targetLens = 1 + zoom * approaching;
    this.lens = lerp(this.lens, targetLens, ease);
    const baseVertical = Math.tan(degToRad(wideFov / 2)) / this.lens;
    const baseFov = MathUtils.radToDeg(2 * Math.atan(baseVertical));
    const speedVertical = visualPace ? Math.tan(degToRad((wideFov + 3.5 * visualPace) / 2)) / this.lens : baseVertical;
    const speedFov = MathUtils.radToDeg(2 * Math.atan(speedVertical));
    this.speedFovDelta = Math.min(3.5, speedFov - baseFov);
    const fov = baseFov + this.speedFovDelta;
    const vertical = fov === speedFov ? speedVertical : Math.tan(degToRad(fov / 2));
    const pitch = Math.atan(vertical * 0.20);
    const sin = Math.sin(pitch), cos = Math.cos(pitch);
    const gateBlend = 1 - smoothstep(remaining, 85, 100);
    this.shakeAmplitude = amplitude * (1 - gateBlend);
    this.shakeY = this.shakeAmplitude * Math.sin(2 * Math.PI * 7 * time);
    const baseEyeY = car.y + (portrait ? 3.55 : 2.68) - lift * 0.32;
    const eyeY = baseEyeY + visualPace * 0.36;
    const baseBack = (portrait ? 12.0 : 8.7) * this.lens;
    const upper = portrait ? 0.43 : short ? 0.62 : 0.48;
    const baseFit = this.fitShot(carCorners, baseBack, baseEyeY, dx, dz, baseVertical, aspect, upper, gateBlend, gate);
    const fit = visualPace ? this.fitShot(carCorners, baseBack + visualPace * 1.10 * this.lens,
      eyeY, dx, dz, vertical, aspect, upper, gateBlend, gate) : baseFit;
    // Keep the gate's back easing independent of the speed contribution.
    this.back = Math.max(baseFit, lerp(this.back, baseFit, ease));
    const back = fit + (this.back - baseFit);
    cam.aspect = aspect;
    cam.fov = fov;
    cam.position.set(this.focus.x - dx * back, eyeY, this.focus.z - dz * back);
    cam.lookAt(this.target.set(cam.position.x + dx * cos, eyeY - sin, cam.position.z + dz * cos));
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }
}
