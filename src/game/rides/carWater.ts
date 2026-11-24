import { DECKS, floorY, poolAt, SEA_LEVEL, waterY } from "../water";
import type { WetDriveSettings } from "./drive";

export type CarWaterBand = "dry" | "shallow" | "body-deep" | "float";

export const CAR_WATER = {
  shallowEnter: 0.05, shallowLeave: 0.025,
  bodyEnter: 0.34, bodyLeave: 0.28, floatEnter: 0.85,
  tireSide: 0.88, tireAlong: 1.36, referenceWide: 0.95, referenceHalf: 2.15,
  decel: 18, maxPitch: 0.14, maxNod: 0.025, maxImmersion: 0.42,
  cameraClear: 0.35, faceClear: 0.15,
  footRadius: 0.42, footOffset: 0.8,
  sputter: { cycle: 0.9, second: 0.24, duration: 0.10, loadRevs: 0.36, missRevs: 0.06, missPower: 0.85 },
} as const;

const WET_DRIVE: Record<Exclude<CarWaterBand, "dry">, Readonly<WetDriveSettings>> = {
  shallow: { forward: 4.2, reverse: 2.6, steerGain: 0.85, decel: CAR_WATER.decel },
  "body-deep": { forward: 2.1, reverse: 1.4, steerGain: 0.45, decel: CAR_WATER.decel },
  float: { forward: 0, reverse: 0, steerGain: 0, decel: CAR_WATER.decel },
};

/** A float latch calls for recovery. Its zero target is available to the caller during the handoff. */
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
    maxTireDepth: 0, pitch: 0, band: "dry",
  };
}

/** Water in contact with the sampled floor. Surface heights remain available over supporting boards. */
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

interface CarWaterPose {
  x: number; z: number; heading: number;
  spec: { wide: number; half: number };
}

/** Sample a pose into caller-owned storage. Pass the last band to retain hysteresis and the float latch.
 *  Sample again at the settled pose before presenting it. */
export function probeCarWater({ x, z, heading, spec }: CarWaterPose, time: number, previous: CarWaterBand, out: CarWaterProbe) {
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

  const frontDepth = Math.min(frontLeft.depth, frontRight.depth);
  const rearDepth = Math.min(rearLeft.depth, rearRight.depth);
  if (previous === "float" || Math.max(centre.depth, frontDepth, rearDepth) >= W.floatEnter) out.band = "float";
  else if (centre.depth >= (previous === "body-deep" ? W.bodyLeave : W.bodyEnter)) out.band = "body-deep";
  else if (Math.max(centre.depth, out.maxTireDepth) >= (previous === "dry" ? W.shallowEnter : W.shallowLeave)) out.band = "shallow";
  else out.band = "dry";
}
