import { MathUtils, PerspectiveCamera, Quaternion, Vector3 } from "three";
import { center, point } from "./track";

const { clamp, lerp, smoothstep, degToRad, radToDeg } = MathUtils;

type GateFrame = { distance: number; frame: readonly Vector3[] };
type ProjectedCar = { roof: Vector3; width: number; horizonY: number };
export const ROAD_CAMERA_SECONDS = 1.6;
const OPENING_WIDTH = 0.285;

export function projectedCar(camera: PerspectiveCamera, roof: Vector3, corners: readonly Vector3[],
  result: ProjectedCar = { roof: new Vector3(), width: 0, horizonY: 0 }) {
  const p = result.roof;
  let left = Infinity, right = -Infinity;
  for (const corner of corners) {
    p.copy(corner).project(camera);
    left = Math.min(left, p.x);
    right = Math.max(right, p.x);
  }
  const horizon = camera.getWorldDirection(p).setY(0).transformDirection(camera.matrixWorldInverse);
  const projection = camera.projectionMatrix.elements;
  result.horizonY = -projection[5] * horizon.y / horizon.z - projection[9];
  result.width = right - left;
  result.roof.copy(roof).project(camera);
  return result;
}

export class RoadChase {
  private yaw = 0;
  private pan = 0;
  private back = 0;
  private widen = 0;
  private lens = 1;
  private readonly focus = new Vector3();
  private readonly target = new Vector3();
  private readonly inverse = new Quaternion();
  private readonly localCorners = Array.from({ length: 8 }, () => new Vector3());
  private readonly live: ProjectedCar = { roof: new Vector3(), width: 0, horizonY: 0 };
  tallBody = false;
  speedFovDelta = 0;
  shakeAmplitude = 0;
  shakeY = 0;

  settle(camera: PerspectiveCamera, start: PerspectiveCamera, inherited: ProjectedCar, roof: Vector3,
    corners: readonly Vector3[], mix: number, age: number, width: number, height: number, startFov: number) {
    const live = projectedCar(camera, roof, corners, this.live);
    const targetX = lerp(inherited.roof.x, live.roof.x, mix);
    const targetY = lerp(inherited.roof.y, live.roof.y, mix);
    // A tall body needs room on either side as the verges come into view.
    // Elsewhere carry the crest width a little longer while the car turns into its lane.
    const openingWidth = this.tallBody && height > width * 1.15
      ? lerp(inherited.width, Math.min(inherited.width, 2 * OPENING_WIDTH), smoothstep(age, 0, 0.30))
      : inherited.width;
    const targetWidth = lerp(openingWidth, live.width, mix * smoothstep(age, 0.9, ROAD_CAMERA_SECONDS));
    const horizonY = lerp(inherited.horizonY, live.horizonY, mix);
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
    const horizontal = this.target.set(0, 0, -1).applyQuaternion(camera.quaternion)
      .setY(0).applyQuaternion(this.inverse.copy(camera.quaternion).invert());
    camera.rotateX(Math.atan2(horizontal.y, -horizontal.z) - Math.atan((horizonY + projection[9]) / screenUp));
    const inverse = this.inverse.copy(camera.quaternion).invert();
    const roofX = targetX + projection[8], roofY = targetY + projection[9];

    // The roof fixes the projected subject position. Solve depth for the width of all eight corners.
    let near = 0;
    for (let i = 0; i < corners.length; i++) {
      const local = this.localCorners[i].copy(corners[i]).sub(roof).applyQuaternion(inverse);
      near = Math.max(near, local.z);
      local.x = local.x * screenRight + roofX * local.z;
    }
    const depth = this.fitDepth(corners.length, near + camera.near, camera.far * 0.5, targetWidth);
    this.target.set(roofX * depth / screenRight, roofY * depth / screenUp, -depth).applyQuaternion(camera.quaternion);
    camera.position.copy(roof).sub(this.target);
    camera.updateMatrixWorld(true);
  }

  private fitDepth(count: number, near: number, far: number, width: number) {
    for (let step = 0; step < 22; step++) {
      const depth = (near + far) / 2;
      let left = Infinity, right = -Infinity;
      for (let i = 0; i < count; i++) {
        const corner = this.localCorners[i];
        const x = corner.x / (depth - corner.z);
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
      if (right - left > width) near = depth;
      else far = depth;
    }
    return (near + far) / 2;
  }

  private fitCorners(corners: readonly Vector3[], back: number, eyeY: number, dx: number, dz: number,
    sin: number, cos: number, vertical: number, aspect: number, clampX: number, upper: number, lower: number) {
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

  private fitOpeningWidth(corners: readonly Vector3[], back: number, eyeY: number, dx: number, dz: number,
    sin: number, cos: number, horizontal: number) {
    const span = OPENING_WIDTH * 2 * horizontal;
    let left = Infinity, right = -Infinity, minDepth = Infinity;
    for (let i = 0; i < corners.length; i++) {
      const corner = corners[i];
      const x = corner.x - this.focus.x, z = corner.z - this.focus.z;
      const side = -dz * x + dx * z;
      const depth = cos * (dx * x + dz * z) - sin * (corner.y - eyeY);
      this.localCorners[i].set(side, 0, -depth);
      left = Math.min(left, side);
      right = Math.max(right, side);
      minDepth = Math.min(minDepth, depth);
    }
    const near = back * cos, far = (right - left) / span - minDepth;
    return far > near ? this.fitDepth(corners.length, near, far, span) / cos : back;
  }

  update(cam: PerspectiveCamera, car: Vector3, distance: number, lift: number, visualPace: number, time: number,
    dt: number, width: number, height: number, carCorners: readonly Vector3[], gate?: GateFrame, amplitude = 0) {
    const portrait = height > width * 1.15;
    // A phone on its side has little height, so the lens reaches further to keep the word boards readable.
    const short = !portrait && height < 520;
    const aspect = width / Math.max(1, height);
    const remaining = gate ? Math.max(0, gate.distance - distance) : Infinity;
    const nearGate = 1 - smoothstep(remaining, 3, 27);
    const aim = gate && remaining < 120 ? point(gate.distance, 0, 0, this.target) : point(distance + 27, 0, 0, this.target);
    // Let the passing arch move overhead before settling back into the driving shot.
    const ease = this.back > 0 ? 1 - Math.exp(-dt * (gate ? 9 : 3)) : 1;
    const more = 1 - smoothstep(remaining, 2, portrait ? 24 : 15);
    this.pan = lerp(this.pan, nearGate * 0.76, ease);
    this.widen = lerp(this.widen, more, ease);
    this.focus.copy(car);
    this.focus.x = lerp(car.x, center(distance), this.pan);
    const angle = clamp(Math.atan2(aim.x - this.focus.x, Math.max(23, -aim.z - distance)), -0.35, 0.35);
    this.yaw = lerp(this.yaw, angle, ease);
    const dx = Math.sin(this.yaw), dz = -Math.cos(this.yaw);

    const wideFov = (portrait ? 40 : 27) + this.widen * (portrait ? 19 : 12);
    // A longer lens brings the gate row forward while a matching dolly preserves the car's size.
    // Release it progressively on the last stretch so the player still feels the pass overhead.
    const approaching = gate ? smoothstep(remaining, 9, 53) * (1 - smoothstep(remaining, 85, 135)) : 0;
    const zoom = portrait ? clamp(3.25 * aspect, 1, 2.15) : short ? 2.4 : 1.25;
    this.lens = lerp(this.lens, 1 + zoom * approaching, ease);
    const baseVertical = Math.tan(degToRad(wideFov / 2)) / this.lens;
    const baseFov = radToDeg(2 * Math.atan(baseVertical));
    const speedVertical = Math.tan(degToRad((wideFov + 3.5 * visualPace) / 2)) / this.lens;
    this.speedFovDelta = clamp(radToDeg(2 * Math.atan(speedVertical)) - baseFov, 0, 3.5);
    const pitch = Math.atan(baseVertical * 0.20);
    const sin = Math.sin(pitch), cos = Math.cos(pitch);
    const gateBlend = 1 - smoothstep(remaining, 85, 100);
    this.shakeAmplitude = amplitude * (1 - gateBlend);
    this.shakeY = this.shakeAmplitude * Math.sin(2 * Math.PI * 7 * time);
    const eyeY = car.y + (portrait ? 3.55 : 2.68) - lift * 0.32;
    const baseBack = (portrait ? 12.0 : 8.7) * this.lens;
    const carFit = this.fitCorners(carCorners, baseBack, eyeY, dx, dz, sin, cos, baseVertical, aspect, 0.92, 0.88, 0.89);
    // Ease out as the car reaches the arches. Their banners stay between the HUD and the driving controls.
    const gateFit = gate && gateBlend > 0
      ? this.fitCorners(gate.frame, carFit, eyeY, dx, dz, sin, cos, baseVertical, aspect, 0.93, portrait ? 0.43 : short ? 0.62 : 0.48, 0.44)
      : carFit;
    const fitBack = lerp(carFit, gateFit, gateBlend);
    this.back = Math.max(fitBack, lerp(this.back, fitBack, ease));
    cam.aspect = aspect;
    cam.fov = baseFov + this.speedFovDelta;
    let back = this.back;
    // In portrait, keep the asphalt beside the van visible through the shared opening.
    if (portrait && this.tallBody && distance < 43) {
      const opening = this.fitOpeningWidth(carCorners, back, eyeY, dx, dz, sin, cos, Math.tan(degToRad(cam.fov / 2)) * aspect);
      back = lerp(opening, back, smoothstep(distance, 28, 43));
    }
    cam.position.set(this.focus.x - dx * back, eyeY, this.focus.z - dz * back);
    cam.lookAt(this.target.set(cam.position.x + dx * cos, eyeY - sin, cam.position.z + dz * cos));
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
  }
}
