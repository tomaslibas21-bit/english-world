import { beforeAll, describe, expect, it, vi } from "vitest";
import { LOCATIONS } from "../../src/content/locations";
import { ROUTE } from "../../src/content/route";
import { SITUATIONS, SITUATION_BY_ID } from "../../src/content/situations/catalog";
import { isTownQuest } from "../../src/content/townQuests";
import { Game } from "../../src/game/Game";
import { CAVE_ZONE, preferredCaveEntry } from "../../src/game/cave/groundsPlan";
import { AIRPORT_EXIT, OUTDOOR_NPCS } from "../../src/game/world/layout";
import { buildTown, type Door } from "../../src/game/world/town";
import { pinFace, resolveMapObjective, resolveMapPlaces, type MapContent } from "../../src/ui/MapPlaces";
import { mapPinForPlace, packMapPlaces, type MapPlacePoint } from "../../src/ui/mapPacking";
import { isPhone } from "../../src/ui/objective";
import { mapPoint, townBounds } from "../../src/ui/worldMap";

const data: MapContent = {
  locations: LOCATIONS, route: ROUTE, catalog: SITUATIONS, outdoor: OUTDOOR_NPCS, airport: AIRPORT_EXIT,
  caveZone: CAVE_ZONE, caveEntry: preferredCaveEntry, isTownQuest, isPhone, mapPoint, townBounds,
};
const aspect = (townBounds.maxX - townBounds.minX) / (townBounds.maxZ - townBounds.minZ);
let doors: Door[];

beforeAll(() => {
  const noop = () => {};
  const gradient = () => ({ addColorStop: noop });
  const context = new Proxy({
    measureText: (text: string) => ({ width: text.length * 9 }),
    createLinearGradient: gradient,
    createRadialGradient: gradient,
  }, { get: (target, key) => Reflect.get(target, key) ?? noop });
  vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => context }) });
  try {
    ({ doors } = buildTown());
  } finally {
    vi.unstubAllGlobals();
  }
});

function checkPacking<T extends MapPlacePoint>(points: readonly T[], width: number, height: number, size: number) {
  const pins = packMapPlaces(points, width, height, size);
  const order = points.map(({ id }) => id);
  expect(pins.flatMap(({ members }) => members.map(({ id }) => id)).sort()).toEqual([...order].sort());
  expect(packMapPlaces(points, width, height, size)).toEqual(pins);
  for (const [i, pin] of pins.entries()) {
    expect(pin.x - size / 2).toBeGreaterThanOrEqual(0);
    expect(pin.y - size / 2).toBeGreaterThanOrEqual(0);
    expect(pin.x + size / 2).toBeLessThanOrEqual(width);
    expect(pin.y + size / 2).toBeLessThanOrEqual(height);
    for (const other of pins.slice(i + 1)) {
      expect(Math.max(Math.abs(pin.x - other.x), Math.abs(pin.y - other.y)) - size).toBeGreaterThanOrEqual(4);
    }
    const ids = pin.members.map(({ id }) => id);
    expect(ids).toEqual(order.filter((id) => ids.includes(id)));
    for (const member of pin.members) {
      expect(mapPinForPlace(pins, member.id)).toBe(pin);
      expect(member).toBe(points[order.indexOf(member.id)]);
      if (member.reserved) expect(ids).toEqual([member.id]);
    }
  }
  expect(mapPinForPlace(pins, "missing")).toBeUndefined();
  return pins;
}

describe.each([30, 44])("%i px map targets", (size) => {
  it.each([[390, 844], [390, 664], [375, 667], [844, 390], [1280, 800]])(
    "packs the actual projected PC layout at %i×%i", (w, h) => {
      const places = resolveMapPlaces(doors, false, data);
      for (const gutter of [0, 15]) {
        // Account for the sheet inset, body padding, the scroll gutter and the map grid column.
        const inner = Math.min(1060, w - 32) - (w <= 480 ? 28 : 36) - gutter;
        const width = w <= 700 ? inner : h <= 520 ? Math.min(inner * 0.54, (h - 150) * aspect) : (inner - 16) * 1.35 / 2.35;
        const height = width / aspect;
        const points = places.map((place) => ({ ...place, x: place.x * width, y: place.y * height }));
        const pins = checkPacking(points, width, height, size);
        for (const id of ["airport", "gruta", "pool-hall"]) {
          expect(mapPinForPlace(pins, id)?.members.map((place) => place.id)).toEqual([id]);
        }
        const shape = (boxes: typeof pins) => boxes.map(({ x, y, members }) => ({ x, y, ids: members.map(({ id }) => id) }));
        expect(shape(packMapPlaces(points.map((p) => ({ ...p, lt: p.lt.repeat(12) })), width, height, size))).toEqual(shape(pins));
        if (size === 44 && w <= 390) {
          expect(mapPinForPlace(pins, "bank")).toBe(mapPinForPlace(pins, "post-office"));
        }
      }
    },
  );

  it("reserves edge-clamped airport and cave before combining coincident centers", () => {
    const points = [
      { id: "bank", x: 144, y: 72 },
      { id: "post-office", x: 144, y: 72 },
      ...Array.from({ length: 14 }, (_, i) => ({ id: `center-${i}`, x: 145 + i / 4, y: 72 })),
      { id: "airport", x: -5, y: -8, reserved: true },
      { id: "gruta", x: 2, y: 2, reserved: true },
      { id: "airport-neighbor", x: -5, y: -8 },
      { id: "isolated", x: 286, y: 122 },
    ];
    const pins = checkPacking(points, 310, 146, size);
    expect(mapPinForPlace(pins, "airport")).toMatchObject({ x: size / 2, y: size / 2 });
    expect(mapPinForPlace(pins, "bank")).toBe(mapPinForPlace(pins, "post-office"));
    expect(mapPinForPlace(pins, "isolated")).toMatchObject({ x: 286, y: 122 });
  });
});

it("keeps the PC situations and geographic points for the reserved places", () => {
  const places = resolveMapPlaces(doors, false, data);
  const airport = places.find(({ id }) => id === "airport")!;
  const cave = places.find(({ id }) => id === "gruta")!;
  expect(airport.name).toBe("Aeropuerto de Puerto Colibrí");
  expect(cave.name).toBe("Gruta de los Aluxes");
  expect([airport.x, airport.y]).toEqual(mapPoint(townBounds, AIRPORT_EXIT.x + 12, AIRPORT_EXIT.z));
  const way = preferredCaveEntry()!;
  expect(way.id).toBe("grieta");
  expect([cave.x, cave.y]).toEqual(mapPoint(townBounds, way.x, way.z));
  expect(airport.sits).toEqual(ROUTE.filter(({ location }) => location === "airport"));
  expect(cave.sits.map(({ id }) => id)).toEqual(["x02-alux-kin", "x03-alux-nikte"]);
  expect(places.find(({ id }) => id === "pool-hall")!.sits).toHaveLength(1);
  expect(places.some(({ id }) => id === "phone" || id === "lighthouse")).toBe(false);
  expect(places.flatMap(({ sits }) => sits).some(isPhone)).toBe(false);
  expect(resolveMapPlaces(doors, true, data).flatMap(({ sits }) => sits).some(({ id }) => isTownQuest(id))).toBe(false);
});

it("projects the saved task's exterior target, without using the directions or cave route", () => {
  let task = SITUATION_BY_ID["s78-bank"];
  const town: Game = Object.assign(Object.create(Game.prototype), {
    currentObjective: () => task,
    phoneTask: () => null,
    zone: { id: "office", interior: { exit: { x: -1000, z: -1000 } } },
    player: { root: { position: { x: 0, z: 0 } } },
    town: { doors },
  });
  const bank = doors.find(({ loc }) => loc === "bank")!;
  const projected = (x: number, z: number) => {
    const [u, v] = mapPoint(townBounds, x, z);
    return { x: u, y: v };
  };
  expect(town.objectiveTarget()).toMatchObject({ kind: "exit", x: -1000 });
  expect(resolveMapObjective(town, "office", undefined, doors, data)).toEqual(projected(bank.x, bank.z));
  // Neither a detour nor a cave leg is used as a source for town-map coordinates.
  Object.assign(town, { zone: { id: "town" }, autoTarget: { directions: "post-office", x: 30, z: 2 } });
  expect(resolveMapObjective(town, "town", undefined, doors, data)).toEqual(projected(bank.outX, bank.outZ));
  Object.assign(town, { zone: { id: CAVE_ZONE }, cave: {} });
  expect(resolveMapObjective(town, CAVE_ZONE, undefined, doors, data)).toEqual(projected(bank.x, bank.z));

  task = SITUATION_BY_ID["s76-dentist-call"];
  expect(resolveMapObjective(town, CAVE_ZONE, undefined, doors, data)).toBeNull();
  Object.assign(town, { phoneTask: () => ({ loc: "office" }) });
  const office = doors.find(({ loc }) => loc === "office")!;
  expect(resolveMapObjective(town, CAVE_ZONE, "office", doors, data)).toEqual(projected(office.x, office.z));
  Object.assign(town, { phoneTask: () => null });
  task = SITUATION_BY_ID["s78-bank"];
  expect(resolveMapObjective(town, CAVE_ZONE, undefined, [], data)).toBeNull();
});

it("leaves room in the pin face for coincident player, task and selection markers", () => {
  const bounds = { width: 320, height: 160, size: 44 };
  const overlap = { x: 0.5, y: 0.5 };
  const face = pinFace({ x: 160, y: 80 }, bounds, [overlap, overlap, overlap])!;
  expect(face["--pin-mask"].match(/circle at 22px 22px/g)).toHaveLength(3);
  for (const radius of [12, 9, 16]) expect(face["--pin-mask"]).toContain(`transparent ${radius}px`);
  expect(pinFace({ x: 32, y: 80 }, bounds, [overlap, overlap, overlap])).toBeUndefined();
});
