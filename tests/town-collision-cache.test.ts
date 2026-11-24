import { createHash } from "node:crypto";
import { Vector3 } from "three";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { PropFader } from "../src/game/fade";
import type { OcclusionField } from "../src/game/occlusion";
import { buildTownField, buildTownLedges, sceneryBoatPieces, townCameraSkip } from "../src/game/townCollision";
import {
  decodeTownCollision, initTownCollision, readTownCollision, restoreTownCollision, TOWN_COLLISION_METADATA_OFFSET,
} from "../src/game/townCollisionCache";
import { LIGHTHOUSE_ISLAND } from "../src/game/world/island";
import { BUS_STOP } from "../src/game/world/layout";
import { buildLighthouseIsland } from "../src/game/world/lighthouseIsland";
import { buildTown, type Town } from "../src/game/world/town";
import { townCanvasDocument } from "../tools/town-canvas-stub";
import { bakeTownCollision } from "../tools/town-collision-data";

function fieldBytes(field: OcclusionField) {
  return Buffer.concat([field.lo, field.hi, field.base].map((a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength)));
}

function splitFlags(town: Town) {
  return [town.colliders.boxes.map((b) => b.split), town.colliders.circles.map((c) => c.split)];
}

function realTown() {
  vi.stubGlobal("document", townCanvasDocument());
  try { return buildTown(); } finally { vi.unstubAllGlobals(); }
}

function finish(work: (() => void)[]) {
  for (let i = 0; i < work.length; i++) work[i]();
}

describe("Maple Harbor collision asset", () => {
  let baked: ReturnType<typeof bakeTownCollision>;
  let raw: ArrayBuffer;

  beforeAll(async () => {
    baked = bakeTownCollision(realTown());
    raw = await decodeTownCollision(new Uint8Array(baked.compressed).buffer);
  });

  it("restores the exact production field, ledge buckets, debug records and split flags before play", async () => {
    const referenceTown = realTown();
    const town = realTown();
    // All current boats are rideable. Make one a scenery hull to exercise the live insertion.
    for (const t of [referenceTown, town]) {
      const boat = t.group.children.find((o) => o.userData.boat && o.userData.rideBoat)!;
      delete boat.userData.rideBoat;
    }
    const field = buildTownField(referenceTown);
    new PropFader(referenceTown.group, townCameraSkip(referenceTown));
    const work: (() => void)[] = [];
    const ledges = buildTownLedges(referenceTown, field, (next) => work.push(next));
    const boats = sceneryBoatPieces(referenceTown);
    expect(boats.length).toBeGreaterThan(0);
    boats.forEach((boat) => ledges.add(boat));
    expect(ledges.pieces).toStrictEqual(boats);
    finish(work);

    const decodeStart = performance.now();
    const decoded = await decodeTownCollision(new Uint8Array(baked.compressed).buffer);
    const decodeMs = performance.now() - decodeStart;
    const hydrateStart = performance.now();
    const restored = restoreTownCollision(town, decoded)!;
    const hydrateMs = performance.now() - hydrateStart;
    expect(restored.ledges.ready).toBe(true);
    expect([restored.field.nx, restored.field.nz]).toEqual([684, 496]);
    const bytes = fieldBytes(restored.field);
    expect(bytes.equals(fieldBytes(field))).toBe(true);
    // The west ridge is outside the driving boundary and occupies camera cells behind it.
    expect(createHash("sha256").update(bytes).digest("hex")).toBe("64efe5089eeed807b69a9e815f0e89ad842e0c4e1b79575a92202eae0392d2fc");
    expect(restored.field.solidAt(120.75, 4.6, 4)).toBe(false);
    expect(ledges.pieces.slice(boats.length)).toStrictEqual(baked.ledges.pieces);
    expect(restored.ledges.pieces).toStrictEqual(ledges.pieces);
    expect(restored.ledges.things).toStrictEqual(ledges.things);
    expect(splitFlags(town)).toStrictEqual(splitFlags(referenceTown));

    const { x, z } = BUS_STOP;
    const roof = ledges.supportPiece(x, z, 2.75, true);
    expect(roof?.deck).toBe(true);
    expect(restored.ledges.supportPiece(x, z, 2.75, true)).toStrictEqual(roof);
    const seat = ledges.supportPiece(x, z + 0.4, 0.55, true);
    expect(seat?.top).toBeCloseTo(0.55);
    expect(restored.ledges.supportPiece(x, z + 0.4, 0.55, true)).toStrictEqual(seat);
    const from = new Vector3(x, 1.6, z - 3), to = new Vector3(x, 3.6, z + 1);
    expect(field.free(from, to)).toBeLessThan(1);
    expect(restored.field.free(from, to)).toBe(field.free(from, to));
    expect(restored.field.overSolid(x, z + 0.75)).toBe(field.overSolid(x, z + 0.75));

    const wall = ledges.pieces.find((p) => p.wall && p.top === Infinity)!;
    for (const piece of [wall, boats[0]]) {
      const original = new Vector3((piece.minX + piece.maxX) / 2, 0, (piece.minZ + piece.maxZ) / 2);
      const a = original.clone(), b = original.clone();
      expect(ledges.clear(a.x, a.z, a.x + 1, a.z, 0)).toBe(false);
      expect(restored.ledges.clear(a.x, a.z, a.x + 1, a.z, 0)).toBe(false);
      referenceTown.colliders.resolve(a, 0.38, true);
      town.colliders.resolve(b, 0.38, true);
      ledges.resolve(a, 0.38, 0, false);
      restored.ledges.resolve(b, 0.38, 0, false);
      expect(a).not.toEqual(original);
      expect(b).toEqual(a);
    }

    const island = LIGHTHOUSE_ISLAND!, scene = buildLighthouseIsland(island);
    const { x: ix, z: iz } = island.center, towerY = island.y + 8;
    expect(restored.field.solidAt(ix, towerY, iz)).toBe(false);
    try {
      town.group.add(scene.group);
      scene.ground.updateWorldMatrix(true, false);
      for (const f of [field, restored.field]) f.addGeometry(scene.ground.geometry, scene.ground.matrixWorld);
      expect(restored.field.solidAt(ix, towerY, iz)).toBe(true);
      expect(fieldBytes(restored.field).equals(fieldBytes(field))).toBe(true);
    } finally {
      scene.dispose();
    }
    console.info("Town collision", {
      gzipBytes: baked.compressed.byteLength,
      fieldMs: +baked.fieldMs.toFixed(1), ledgesMs: +baked.ledgesMs.toFixed(1),
      decodeMs: +decodeMs.toFixed(1), hydrateMs: +hydrateMs.toFixed(1),
    });
  });

  it("rejects bad lengths, versions, dimensions and collider order before replaying flags", () => {
    const town = realTown();
    const initial = splitFlags(town);
    const replace = (from: string, to: string) => {
      const bytes = Buffer.from(raw.slice(0));
      const offset = bytes.indexOf(from, TOWN_COLLISION_METADATA_OFFSET);
      expect(offset).toBeGreaterThanOrEqual(TOWN_COLLISION_METADATA_OFFSET);
      expect(from.length).toBe(to.length);
      bytes.write(to, offset);
      return bytes.buffer;
    };
    const invalid = [raw.slice(0, -1), replace('"version":2', '"version":1'), replace('"nx":684', '"nx":683'),
      replace('"style":"blocks"', '"style":"styled"'), replace('"edition":"mh"', '"edition":"pc"')];
    for (const bytes of invalid) {
      expect(restoreTownCollision(town, bytes)).toBeUndefined();
      expect(splitFlags(town)).toStrictEqual(initial);
    }
    [town.colliders.boxes[0], town.colliders.boxes[1]] = [town.colliders.boxes[1], town.colliders.boxes[0]];
    expect(restoreTownCollision(town, raw)).toBeUndefined();
    expect(splitFlags(town)).toStrictEqual(initial);
  });

  it("uses the sliced reference builder when the cache is absent or corrupt", async () => {
    const corrupt = new Uint8Array(baked.compressed);
    corrupt[corrupt.length - 8] ^= 1; // gzip CRC
    const corruptRaw = new Uint8Array(raw.slice(0));
    corruptRaw[TOWN_COLLISION_METADATA_OFFSET - 1] ^= 1;
    const response = vi.fn().mockResolvedValueOnce(new Response(corrupt))
      .mockResolvedValueOnce(new Response(corruptRaw))
      .mockResolvedValueOnce(new Response("<html>offline fallback</html>"))
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(new Response(new Uint8Array(baked.compressed), { headers: { "Content-Type": "application/octet-stream" } }))
      .mockResolvedValueOnce(new Response(raw));
    vi.stubGlobal("fetch", response);
    try {
      for (let i = 0; i < 5; i++) expect(await readTownCollision("/assets/town.bin", new AbortController())).toBeUndefined();
      for (let i = 0; i < 2; i++) {
        const received = await readTownCollision("/assets/town.bin", new AbortController());
        expect(Buffer.from(received!).equals(Buffer.from(raw))).toBe(true);
      }
    } finally {
      vi.unstubAllGlobals();
    }

    for (const bytes of [undefined, raw.slice(0, -1)]) {
      const town = realTown(), work: (() => void)[] = [];
      const { field, ledges } = initTownCollision(town, bytes, (next) => work.push(next));
      const boats = sceneryBoatPieces(town);
      expect(ledges.ready).toBe(false);
      expect(ledges.pieces).toStrictEqual(boats);
      finish(work);
      expect(ledges.ready).toBe(true);
      expect(fieldBytes(field).equals(fieldBytes(baked.field))).toBe(true);
      expect(ledges.pieces).toStrictEqual([...boats, ...baked.ledges.pieces]);
      expect(ledges.things).toStrictEqual(baked.ledges.things);
    }
  });
});
