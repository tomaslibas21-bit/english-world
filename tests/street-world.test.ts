import { beforeAll, describe, expect, it, vi } from "vitest";
import { Material, Mesh, Vector3 } from "three";
import { STREET_MOMENTS } from "../src/content/street";
import { Ambient } from "../src/game/ambient";
import { CameraRig } from "../src/game/camera";
import { createCharacter } from "../src/game/characters";
import { NavGrid } from "../src/game/nav";
import { OcclusionField } from "../src/game/occlusion";
import { selectScript } from "../src/game/street/schedule";
import { STREET_PHONE_CARD_BOTTOM } from "../src/game/street/StreetLife";
import { TownStreet } from "../src/game/street/world";
import { OUTDOOR_NPCS, WORLD } from "../src/game/world/layout";
import { buildTown } from "../src/game/world/town";
import { townCanvasDocument } from "../tools/town-canvas-stub";

const sizes = [[390, 844], [390, 664], [844, 390], [1280, 800]];
const look = { skin: "#f2d3bd", hair: { style: "short" as const, color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653", female: true };
let town: ReturnType<typeof buildTown>, field: OcclusionField, nav: NavGrid, ambient: Ambient;

beforeAll(() => {
  vi.stubGlobal("document", townCanvasDocument());
  try {
    town = buildTown();
    field = OcclusionField.fromObject(town.group, WORLD, {
      skip: (o) => o.userData.v !== undefined || o.userData.gull || o.userData.boat || o.userData.thin || o === town.parkedCars.group,
    });
    field.fillFootprints(town.colliders.boxes, town.colliders.circles);
    nav = new NavGrid(WORLD.minX, WORLD.minZ, WORLD.maxX, WORLD.maxZ, 1, town.colliders);
    const doors: [number, number][] = town.doors.filter((d) => d.loc !== "airport").map((d) => [d.outX, d.outZ]);
    doors.push([22, -20], [40, -46], [16, -36], [-12, -62], [30, -63], [-30, -61], [96, -30], [-6, 46], [62, 44], [-42, 44], [118, 2]);
    ambient = new Ambient(nav, doors, "low", town.seats, town.colliders);
    ambient.obstacles = OUTDOOR_NPCS.map(({ x, z }) => [x, z]);
  } finally {
    vi.unstubAllGlobals();
  }
}, 20_000);

it("keeps the street surfaces within their mesh and canvas budgets", () => {
  for (const [name, limit] of [["ground", 2352], ["markings", 2030], ["brick-walk", 16]] as const) {
    const objects = town.group.getObjectsByProperty("name", name);
    expect(objects, name).toHaveLength(1);
    const mesh = objects[0] as Mesh;
    expect(mesh, name).toBeInstanceOf(Mesh);
    expect(mesh.material, name).toBeInstanceOf(Material);
    const { geometry } = mesh;
    const triangles = (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;
    expect(triangles, name).toBeGreaterThan(0);
    expect(triangles, name).toBeLessThanOrEqual(limit);
  }
  expect([town.groundCanvas.width, town.groundCanvas.height]).toEqual([1764, 1020]);
  expect(town.group.children.filter(({ name }) => name.startsWith("town-solid-")).length).toBeLessThanOrEqual(26);
});

function frame(width: number, height: number, x: number, z: number, yaw: number) {
  const portrait = width <= 600 && height > width;
  const sideways = height <= 520 && width > height;
  const rig = new CameraRig(width / height);
  rig.space = { free: (a, b) => field.free(a, b), inside: (p) => field.solidAt(p.x, p.y, p.z), overSolid: (x, z) => field.overSolid(x, z) };
  rig.resize(width, height, sideways);
  rig.yaw = yaw;
  rig.target.set(x, 0, z);
  rig.snap();
  rig.update(0.05, yaw, false, true, true);
  rig.cam.fov = rig.fovFor(width, height, false);
  rig.cam.updateProjectionMatrix();
  rig.applyViewShift(width, height, 0, (portrait ? -0.12 : sideways ? -0.1 : 0) * height);

  const player = createCharacter(look);
  player.root.position.copy(rig.target);
  player.root.rotation.y = yaw;
  const phone = portrait || sideways;
  const street = new TownStreet(town.group, nav, town.colliders, ambient, rig.cam, () => player, () => look.top, field, () => phone);
  return { rig, player, street, phone };
}

describe("street framing", () => {
  it.each(sizes)("keeps the dropped wallet and passerby visible during the entrance and wait at %i×%i", (width, height) => {
    const { player, street, phone } = frame(width, height, 28, -20, Math.PI);
    const dropped = STREET_MOMENTS.find((moment) => moment.id === "i_dropped")!;
    const spawn = street.prepare(selectScript(dropped, undefined, undefined, "a")!);
    expect(spawn).toBeDefined();
    const actor = spawn!();
    try {
      for (let frame = 0; frame < 65; frame++) {
        actor.tick(0.05, frame >= 45);
        const { person, prop } = actor.projection();
        for (const point of [person, prop]) {
          expect(point?.onScreen).toBe(true);
          expect(point?.y).toBeGreaterThan(phone ? STREET_PHONE_CARD_BOTTOM : 1 / 3);
        }
      }
      const position = (actor.person as ReturnType<typeof createCharacter>).root.position;
      expect(position.distanceTo(player.root.position)).toBeGreaterThanOrEqual(4);
      expect(position.distanceTo(player.root.position)).toBeLessThanOrEqual(8);
      expect(position.z).toBeLessThan(player.root.position.z);
    } finally {
      actor.dispose();
      street.dispose();
      player.dispose?.();
    }
  });

  it("walks a regular and an incident actor away immediately and removes them when the camera turns away", () => {
    const { rig, player, street } = frame(390, 844, 28, -20, Math.PI);
    try {
      const musician = STREET_MOMENTS.find((moment) => moment.id === "r_musician")!;
      const dropped = STREET_MOMENTS.find((moment) => moment.id === "i_dropped")!;
      const actors = [musician, dropped].map((moment) => {
        const actor = street.prepare(selectScript(moment, undefined, undefined, "a")!)!();
        actor.tick(2, true);
        actor.leave();
        return actor.person as ReturnType<typeof createCharacter>;
      });
      for (const person of actors) expect(person.anim).toBe("walk");
      const distance = () => actors.map((person) => person.root.position.distanceTo(player.root.position));
      const before = distance();
      street.tick(0.1);
      distance().forEach((value, i) => expect(value).toBeGreaterThan(before[i]));
      for (const person of actors) expect(person.root.parent).not.toBeNull();
      rig.cam.rotateY(Math.PI);
      street.tick(0.05);
      for (const person of actors) expect(person.root.parent).toBeNull();
    } finally {
      street.dispose();
      player.dispose?.();
    }
  });

  it("removes a departing person at the time limit", () => {
    const { player, street } = frame(390, 844, 28, -20, Math.PI);
    try {
      const musician = STREET_MOMENTS.find((moment) => moment.id === "r_musician")!;
      const actor = street.prepare(selectScript(musician)!)!();
      const person = actor.person as ReturnType<typeof createCharacter>;
      actor.leave();
      // Keep the same view and force the route to stay blocked so only the timer can remove the actor.
      const route = vi.spyOn(street, "departureHeading").mockReturnValue(undefined);
      try {
        street.tick(29.9);
        expect(person.root.parent).not.toBeNull();
        street.tick(0.11);
        expect(person.root.parent).toBeNull();
      } finally { route.mockRestore(); }
    } finally {
      street.dispose();
      player.dispose?.();
    }
  });

  it("sees the square pair past its own walking colliders and excludes it when out of view", () => {
    const walker = ambient.walkerRoots.map((root) => ambient.walkerFor(root)).find((w) => w?.kind === "stand" && w.chat)!;
    const { x, z } = walker.ch.root.position;
    const yaw = Math.atan2(-3.3, -1.8);
    const { rig, player, street } = frame(390, 844, x + 3.3, z + 1.8, yaw);
    try {
      expect(street.pairs(5).some(({ members }) => members.some(({ person }) => person === walker.ch))).toBe(true);
      expect(street.pairs(2, true)).toHaveLength(0);
      const center = walker.ch.root.position;
      rig.cam.lookAt(new Vector3(center.x + 9, 1.5, center.z));
      expect(street.pairs(5)).toHaveLength(0);
      expect(street.pairs(25, true).some(({ members }) => members.some(({ person }) => person === walker.ch))).toBe(true);
    } finally {
      street.dispose();
      player.dispose?.();
    }
  });
});
