import { Mesh, Texture } from "three";
import { expect, it, vi } from "vitest";
import { townCanvasDocument } from "../tools/town-canvas-stub";
import { getInterior } from "../src/game/world/interiors";
import { buildTown } from "../src/game/world/town";

it("reaches the hall through the gate and leaves the Cedar Lane driveway clear", () => {
  vi.stubGlobal("document", townCanvasDocument());
  try {
    const town = buildTown();
    expect(town.doors.find(d => d.loc === "town-hall")).toMatchObject({ bid: "house4", face: "n", x: 90, z: 49, outX: 90, outZ: 46.8 });
    for (let z = 43; z <= 48; z += 0.2) for (const x of [89.4, 90, 90.6])
      expect(town.walkableAt(x, z), x + ", " + z).toBe(true);
    expect(town.walkableAt(101.2, 47.7)).toBe(true);
  } finally { vi.unstubAllGlobals(); }
});
it("bakes the counter and floor into the shell, keeps both aisles walkable and allocates one print texture", () => {
  vi.stubGlobal("document", townCanvasDocument());
  try {
    const room = getInterior("town-hall")!;
    expect(room).toMatchObject({ w: 9, d: 7, npcs: [], exit: { x: 0, z: 3.3 } });
    expect(room.update).toBeUndefined();
    expect(room.colliders.blocked(0, 0.1, 0.35)).toBe(false);
    expect(room.colliders.blocked(0, -1.3, 0.35)).toBe(true);
    for (const x of [-2, 2]) for (let z = -2.6; z <= 2.6; z += 0.2) expect(room.colliders.blocked(x, z, 0.75)).toBe(false);
    const meshes = room.group.children.filter((obj): obj is Mesh => obj instanceof Mesh);
    expect(meshes).toHaveLength(3);
    expect(meshes.filter(m => m.name.startsWith("room-solid-"))).toHaveLength(1);
    expect(meshes.flatMap(m => Object.values(m.material).filter(v => v instanceof Texture).map(t => t.name))).toEqual(["Town Hall desk card"]);
    const triangles = meshes.reduce((n, m) => n + (m.geometry.index?.count ?? m.geometry.attributes.position.count) / 3, 0);
    // The standard 9 × 7 shell has 214 triangles, including its pavement.
    expect(triangles - 214).toBeLessThanOrEqual(900);
    const { x, z } = room.spawn;
    expect(Math.hypot(x, z - .1)).toBeLessThan(1.55);
    expect(Math.hypot(x - room.exit.x, z - room.exit.z)).toBeGreaterThan(1.8);
    for (let i = 0; i < 10; i++) expect(getInterior("town-hall")).toBe(room);
  } finally { vi.unstubAllGlobals(); }
});
