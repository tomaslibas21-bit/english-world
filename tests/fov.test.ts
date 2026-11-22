import { expect, it } from "vitest";
import { CameraRig } from "../src/game/camera";

it.each([
  { w: 390, h: 844, follow: 50, run: 54, stage: 62, interior: 60.21627870526026 },
  { w: 844, h: 390, follow: 42.38617142258535, run: 45.38617142258535, stage: 42.38617142258535, interior: 37.116340422564704 },
  { w: 664, h: 390, follow: 55, run: 58, stage: 55, interior: 50 },
  { w: 1280, h: 800, follow: 55, run: 58, stage: 55, interior: 50 },
  { w: 1024, h: 768, follow: 55, run: 58, stage: 55, interior: 50 },
  { w: 760, h: 400, follow: 55, run: 58, stage: 55, interior: 50 },
  { w: 1000, h: 350, follow: 38, run: 41, stage: 38, interior: 36 },
])("frames each camera mode at $w × $h", ({ w, h, follow, run, stage, interior }) => {
  const rig = new CameraRig(w / h);
  expect(rig.fovFor(w, h, false)).toBeCloseTo(follow, 10);
  expect(rig.fovFor(w, h, true)).toBeCloseTo(run, 10);
  rig.mode = "stage";
  expect(rig.fovFor(w, h, false)).toBeCloseTo(stage, 10);
  rig.mode = "interior";
  expect(rig.fovFor(w, h, false)).toBeCloseTo(interior, 10);
  rig.mode = "talk";
  expect(rig.fovFor(w, h, false)).toBe(50);
});
