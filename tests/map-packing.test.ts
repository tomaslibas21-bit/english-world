import { describe, expect, it } from "vitest";
import { packMapPlaces, type MapPlacePoint } from "../src/ui/mapPacking";

function checkPacking(places: MapPlacePoint[], width: number, height: number, size: number) {
  const pins = packMapPlaces(places, width, height, size);
  expect(pins).toEqual(packMapPlaces(places, width, height, size));
  expect(pins.flatMap((pin) => pin.members.map((p) => p.id)).sort()).toEqual(places.map((p) => p.id).sort());
  const half = size / 2;
  for (const [i, pin] of pins.entries()) {
    expect(pin.x - half).toBeGreaterThanOrEqual(0);
    expect(pin.x + half).toBeLessThanOrEqual(width);
    expect(pin.y - half).toBeGreaterThanOrEqual(0);
    expect(pin.y + half).toBeLessThanOrEqual(height);
    for (const other of pins.slice(i + 1)) {
      expect(Math.max(Math.abs(pin.x - other.x), Math.abs(pin.y - other.y)) - size).toBeGreaterThanOrEqual(4);
    }
  }
  for (const place of places.filter((p) => p.reserved)) {
    expect(pins.find((pin) => pin.members.includes(place))?.members).toEqual([place]);
  }
  return pins;
}

describe("full map hit boxes", () => {
  it.each([320, 350])("packs close, coincident, and edge locations on a %i px touch map", (width) => {
    const height = 225;
    // The bank and post office straddle the seam in the center of this grid.
    const bank = { id: "bank", x: width / 2 - 1, y: 105 };
    const post = { id: "post-office", x: width / 2 + 1, y: 105 };
    const airport = { id: "airport", x: width, y: 0, reserved: true };
    const lighthouse = { id: "lighthouse", x: width - 25, y: 4, reserved: true };
    const places = [
      bank, post, { ...post, id: "pool-hall" }, { ...airport, id: "taxi-stand", reserved: false },
      { id: "corner-a", x: 0, y: 0 }, { id: "corner-b", x: 0, y: height }, { id: "corner-c", x: width, y: height }, airport,
    ];
    for (const input of [places, [...places, lighthouse]]) {
      const pins = checkPacking(input, width, height, 44);
      expect(pins.find((pin) => pin.members.includes(bank))?.members.map((p) => p.id)).toEqual(["bank", "post-office", "pool-hall"]);
      expect(pins.find((pin) => pin.members.includes(airport))).toMatchObject({ x: width - 22, y: 22 });
    }
  });

  it("keeps a single isolated control at its exact position", () => {
    const place = { id: "station", x: 111.5, y: 129.25 };
    expect(checkPacking([place], 320, 225, 44)).toEqual([{ x: place.x, y: place.y, members: [place] }]);
  });

  it("keeps separated or slightly offset desktop places directly selectable", () => {
    const places = [
      { id: "airport", x: 501, y: 190, reserved: true },
      { id: "lighthouse", x: 425, y: 33, reserved: true },
      { id: "bank", x: 246, y: 204 },
      { id: "post-office", x: 279, y: 204 },
      { id: "pool-hall", x: 182, y: 258 },
    ];
    const pins = checkPacking(places, 579, 394, 30);
    expect(pins).toHaveLength(places.length);
    expect(pins.find((pin) => pin.members.includes(places[2]))).toMatchObject({ x: 246, y: 204 });
    expect(pins.find((pin) => pin.members.includes(places[4]))).toMatchObject({ x: 182, y: 258 });
  });
});
