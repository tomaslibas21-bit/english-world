import { describe, expect, it } from "vitest";
import {
  AHEAD, BACK, FRONT, RIDE_FORWARD, WIDE,
  waveChop, waveEdge, waveFaceSlope, waveHeight, waveLip, waveProfile, waveReach, waveSweep, waveSweepSlope,
} from "../src/game/surf/wave";

const rideH = waveHeight(0.8);
const rider = AHEAD - 1.2 - RIDE_FORWARD;

describe("the surf wave", () => {
  it("keeps the crest fixed and drops faster on the shoreward face", () => {
    expect(waveProfile(0)).toBe(1);
    expect(waveProfile(-FRONT)).toBe(0);
    expect(waveProfile(BACK)).toBe(0);
    expect(waveProfile(-1)).toBeLessThan(waveProfile(1));
    expect(waveReach(0.5)).toBe(0);
    expect(waveReach(7)).toBe(1);
  });

  it("gives both ridden waves full height and tapers towards their shoulders", () => {
    expect(rideH * waveChop(0, 0)).toBeGreaterThan(1.2);
    expect(waveHeight(1.4)).toBeLessThanOrEqual(1.6);
    expect(waveHeight(0.48)).toBeLessThan(rideH);
    expect(waveEdge(9, WIDE)).toBe(1);
    expect(waveEdge(WIDE * 0.4, WIDE)).toBeLessThan(0.5);
    expect(waveEdge(WIDE / 2, WIDE)).toBe(0);
    expect(waveSweep(0)).toBeCloseTo(0);
    expect(waveSweep(6)).toBeLessThan(-1.3);
    expect(waveSweepSlope(6)).toBeCloseTo((waveSweep(6.0001) - waveSweep(5.9999)) / 0.0002, 6);
  });

  it("rolls a thick lip out over the face and reconnects it to the crest", () => {
    expect(waveLip(0).forward).toBe(0);
    expect(waveLip(0).height).toBeCloseTo(waveProfile(-0.0001), 4);
    expect(waveLip(1).forward).toBe(0);
    expect(waveLip(1).height).toBe(waveProfile(0));
    const lip = waveLip(0.55);
    const overhang = lip.forward * rideH;
    expect(overhang).toBeGreaterThan(0.6);
    expect(lip.height - lip.drop - waveProfile(-overhang)).toBeGreaterThan(0.2);
    expect(-rider).toBeGreaterThan(overhang);
    expect(waveProfile(rider)).toBeGreaterThan(0.4);
    expect(waveProfile(rider)).toBeLessThan(0.6);
  });

  it("uses the steep face's local slope for the board's pitch", () => {
    expect(rideH * waveFaceSlope(rider)).toBeGreaterThan(0.85);
    expect(waveFaceSlope(1)).toBeLessThan(0);
    for (const s of [-FRONT - 1, -1.4, rider, 1, 2, BACK + 1]) {
      const ds = 0.0001;
      expect(waveFaceSlope(s)).toBeCloseTo((waveProfile(s + ds) - waveProfile(s - ds)) / (2 * ds), 6);
    }
  });
});
