import type { Quaternion } from "three";
import { DECKS, floorY, poolAt, SEA_LEVEL, waterY } from "../water";
import type { AABB } from "../world/util";
import type { WetDriveSettings } from "./drive";

export type CarWaterBand = "dry" | "shallow" | "body-deep" | "float";

export const CAR_WATER = {
  shallowEnter: 0.05, shallowLeave: 0.025,
  bodyEnter: 0.34, bodyLeave: 0.28, floatEnter: 0.85,
  tireSide: 0.88, tireAlong: 1.36, referenceWide: 0.95, referenceHalf: 2.15,
  decel: 18, maxPitch: 0.14, maxNod: 0.025, maxImmersion: 0.42,
  cameraClear: 0.35, faceClear: 0.15,
  footRadius: 0.42, footOffset: 0.8,
  maxWetSeconds: 3.5, dryRearmSeconds: 0.25,
  sputter: { cycle: 0.9, second: 0.24, duration: 0.10, loadRevs: 0.36, missRevs: 0.06, missPower: 0.85 },
} as const;

const WET_DRIVE: Record<Exclude<CarWaterBand, "dry">, Readonly<WetDriveSettings>> = {
  shallow: { forward: 4.2, reverse: 2.6, steerGain: 0.85, decel: CAR_WATER.decel },
  "body-deep": { forward: 2.1, reverse: 1.4, steerGain: 0.45, decel: CAR_WATER.decel },
  float: { forward: 0, reverse: 0, steerGain: 0, decel: CAR_WATER.decel },
};

export function wetDriveSettings(band: CarWaterBand): Readonly<WetDriveSettings> | undefined {
  return band === "dry" ? undefined : WET_DRIVE[band];
}

export interface CarWaterSample {
  x: number; z: number;
  floor: number;
  stillSurface: number | null;
  liveSurface: number | null;
  depth: number;
  liveDepth: number;
}

export interface CarWaterProbe {
  centre: CarWaterSample;
  frontLeft: CarWaterSample; frontRight: CarWaterSample;
  rearLeft: CarWaterSample; rearRight: CarWaterSample;
  maxTireDepth: number;
  /** The shallower of the two tires on each axle. */
  frontAxleDepth: number; rearAxleDepth: number;
  /** Local X rotation supported by the axles. A raised nose is negative. */
  pitch: number;
  band: CarWaterBand;
}

function createSample(): CarWaterSample {
  return { x: 0, z: 0, floor: 0, stillSurface: null, liveSurface: null, depth: 0, liveDepth: 0 };
}

export function createCarWaterProbe(): CarWaterProbe {
  return {
    centre: createSample(),
    frontLeft: createSample(), frontRight: createSample(),
    rearLeft: createSample(), rearRight: createSample(),
    maxTireDepth: 0, frontAxleDepth: 0, rearAxleDepth: 0, pitch: 0, band: "dry",
  };
}

/** Read the local floor and both surfaces. The surface below supporting boards remains available for safety checks. */
export function sampleCarWater(x: number, z: number, time: number, out: CarWaterSample) {
  out.x = x; out.z = z;
  out.floor = floorY(x, z);
  out.liveSurface = waterY(x, z, time);
  out.stillSurface = out.liveSurface === null ? null : poolAt(x, z)?.y ?? SEA_LEVEL;
  out.depth = out.stillSurface === null ? 0 : Math.max(0, out.stillSurface - out.floor);
  out.liveDepth = out.liveSurface === null ? 0 : Math.max(0, out.liveSurface - out.floor);
  if (out.depth === 0 && out.liveDepth > 0) {
    for (const d of DECKS) {
      if (x > d.x0 && x < d.x1 && z > d.z0 && z < d.z1) { out.liveDepth = 0; break; }
    }
  }
}

interface CarWaterPosition {
  x: number; z: number;
  spec: { wide: number; half: number };
}

/** Sample into caller-owned storage. Use the prior band for hysteresis and resample the accepted pose after settling. */
export function probeCarWater({ x, z, heading, spec }: CarWaterPosition & { heading: number }, time: number, previous: CarWaterBand, out: CarWaterProbe) {
  const W = CAR_WATER;
  const fx = Math.sin(heading), fz = Math.cos(heading);
  const side = W.tireSide * spec.wide / W.referenceWide, along = W.tireAlong * spec.half / W.referenceHalf;
  const sx = fz * side, sz = -fx * side, ax = fx * along, az = fz * along;
  const { centre, frontLeft, frontRight, rearLeft, rearRight } = out;
  sampleCarWater(x, z, time, centre);
  sampleCarWater(x + ax + sx, z + az + sz, time, frontLeft);
  sampleCarWater(x + ax - sx, z + az - sz, time, frontRight);
  sampleCarWater(x - ax + sx, z - az + sz, time, rearLeft);
  sampleCarWater(x - ax - sx, z - az - sz, time, rearRight);

  const frontFloor = (frontLeft.floor + frontRight.floor) * 0.5;
  const rearFloor = (rearLeft.floor + rearRight.floor) * 0.5;
  const grade = Math.atan2(rearFloor - frontFloor, 2 * along);
  out.pitch = Math.max(-W.maxPitch, Math.min(W.maxPitch, grade));
  out.maxTireDepth = Math.max(frontLeft.depth, frontRight.depth, rearLeft.depth, rearRight.depth);
  out.frontAxleDepth = Math.min(frontLeft.depth, frontRight.depth);
  out.rearAxleDepth = Math.min(rearLeft.depth, rearRight.depth);

  if (previous === "float" || Math.max(centre.depth, out.frontAxleDepth, out.rearAxleDepth) >= W.floatEnter) out.band = "float";
  else if (centre.depth >= (previous === "body-deep" ? W.bodyLeave : W.bodyEnter)) out.band = "body-deep";
  else if (Math.max(centre.depth, out.maxTireDepth) >= (previous === "dry" ? W.shallowEnter : W.shallowLeave)) out.band = "shallow";
  else out.band = "dry";
}

/** The least usable height for a world-space face or presented camera. */
export function carWaterClearanceY({ x, y, z }: { x: number; y: number; z: number }, time: number, clearance: number) {
  const surface = waterY(x, z, time);
  return surface === null ? y : Math.max(y, surface + clearance);
}

/** Raise a proposed chassis pose to support its lower corners and tires. Use the presentation quaternion so the
 *  contacts see the floor and live surface at their pitched and rolled positions. `face` is at the proposed height. */
export function supportedCarWaterHeight(
  { x, z, spec }: CarWaterPosition, rotation: Quaternion, time: number, y: number, limitImmersion: boolean,
  face?: { x: number; y: number; z: number },
) {
  const W = CAR_WATER;
  const { x: qx, y: qy, z: qz, w: qw } = rotation;
  // The local X and Z axes in world space. All eight contacts are in the mesh's local ground plane.
  const xx = 1 - 2 * (qy * qy + qz * qz), xy = 2 * (qx * qy + qw * qz), xz = 2 * (qx * qz - qw * qy);
  const zx = 2 * (qx * qz + qw * qy), zy = 2 * (qy * qz - qw * qx), zz = 1 - 2 * (qx * qx + qy * qy);
  let height = Math.max(y, floorY(x, z));
  if (limitImmersion) {
    const surface = waterY(x, z, time);
    if (surface !== null) height = Math.max(height, surface - W.maxImmersion);
  }
  for (let tire = 0; tire < 2; tire++) {
    const wide = tire ? W.tireSide * spec.wide / W.referenceWide : spec.wide;
    const half = tire ? W.tireAlong * spec.half / W.referenceHalf : spec.half;
    for (let end = -1; end <= 1; end += 2) {
      for (let side = -1; side <= 1; side += 2) {
        const px = x + side * wide * xx + end * half * zx, pz = z + side * wide * xz + end * half * zz;
        const py = side * wide * xy + end * half * zy;
        height = Math.max(height, floorY(px, pz) - py);
        if (limitImmersion) {
          const surface = waterY(px, pz, time);
          if (surface !== null) height = Math.max(height, surface - W.maxImmersion - py);
        }
      }
    }
  }
  if (face) height = Math.max(height, y + carWaterClearanceY(face, time, W.faceClear) - face.y);
  return height;
}

interface CarFootprintPose { x: number; z: number; heading: number }

/** Separating axes for the full body and a town box, including corners outside the three motion circles. */
export function carFootprintOverlapsBox(x: number, z: number, heading: number, half: number, wide: number, box: AABB) {
  const dx = x - (box.minX + box.maxX) * 0.5, dz = z - (box.minZ + box.maxZ) * 0.5;
  const bx = (box.maxX - box.minX) * 0.5, bz = (box.maxZ - box.minZ) * 0.5;
  const s = Math.sin(heading), c = Math.cos(heading), ns = Math.abs(s), nc = Math.abs(c);
  return Math.abs(dx) < bx + ns * half + nc * wide && Math.abs(dz) < bz + nc * half + ns * wide
    && Math.abs(dx * s + dz * c) < half + bx * ns + bz * nc
    && Math.abs(dx * c - dz * s) < wide + bx * nc + bz * ns;
}

/** First sampled overlap along a translation and shortest turn. Tests the start and end as well as the sweep. */
export function sweepCarFootprintBox(from: CarFootprintPose, to: CarFootprintPose, half: number, wide: number, box: AABB) {
  const dx = to.x - from.x, dz = to.z - from.z, angle = to.heading - from.heading;
  const turn = Math.atan2(Math.sin(angle), Math.cos(angle));
  const radius = Math.hypot(half, wide);
  if (Math.max(from.x, to.x) + radius <= box.minX || Math.min(from.x, to.x) - radius >= box.maxX
    || Math.max(from.z, to.z) + radius <= box.minZ || Math.min(from.z, to.z) - radius >= box.maxZ) return null;
  const steps = Math.max(1, Math.ceil((Math.hypot(dx, dz) + Math.abs(turn) * radius) / 0.05));
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    if (carFootprintOverlapsBox(from.x + k * dx, from.z + k * dz, from.heading + k * turn, half, wide, box)) return k;
  }
  return null;
}
