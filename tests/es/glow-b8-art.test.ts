import * as THREE from "three";
import { afterEach, expect, it, vi } from "vitest";
import { cactusParts, Track } from "../../src/game/road/track";
import { BOAT_SEATS, BOAT_SIZE, motorboatGeometry, motorboatWaterMask } from "../../src/game/rides/shapes";
import { palapas, type Part } from "../../src/game/world/mexican";
import { boxTopBands } from "../../src/game/world/shapes";
import { Colliders, colourMerge } from "../../src/game/world/util";
import { buildTownFixture } from "./town-fixture";

afterEach(() => { vi.unstubAllGlobals(); });
const triangles = (g: THREE.BufferGeometry) => (g.index?.count ?? g.attributes.position.count) / 3;
const colorAt = (hit: THREE.Intersection) => new THREE.Color()
  .fromBufferAttribute((hit.object as THREE.Mesh).geometry.attributes.color, hit.face!.a).getHex();
const surfaceArea = (g: THREE.BufferGeometry) => {
  const p = g.attributes.position, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let area = 0;
  for (let i = 0; i < (g.index?.count ?? p.count); i += 3) {
    const at = (j: number) => g.index ? g.index.getX(i + j) : i + j;
    a.fromBufferAttribute(p, at(0)); b.fromBufferAttribute(p, at(1)); c.fromBufferAttribute(p, at(2));
    area += b.sub(a).cross(c.sub(a)).length() / 2;
  }
  return area;
};

it("finishes beach loungers with three flush planks while retaining their support surface and footprint", () => {
  const parts: Part[] = [], roofs: Part[] = [], col = new Colliders();
  const seats = palapas(parts, col, [[0, 0]], false, roofs);
  const g = colourMerge(parts), material = new THREE.MeshBasicMaterial(), mesh = new THREE.Mesh(g, material);
  try {
    expect(seats).toEqual([[-0.95, -1.1], [0.95, -1.1]]);
    expect(col.circles).toEqual([{ x: 0, z: 0, r: 0.16 }]);
    expect(col.boxes).toHaveLength(2);
    col.boxes.forEach((box, i) => {
      expect((box.minX + box.maxX) / 2).toBeCloseTo(i ? 0.95 : -0.95);
      expect(box.maxX - box.minX).toBeCloseTo(0.7);
      expect(box.minZ).toBeCloseTo(-1.9);
      expect(box.maxZ).toBeCloseTo(0.1);
    });
    expect(triangles(g) - 120).toBeLessThanOrEqual(32); // two loungers, original main parts without roofs
    const normal = new THREE.Vector3(0, 1, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), -0.6);
    for (const [dx, color] of [[-0.215, 0xbc8d59], [-0.1075, 0x805a3e], [0, 0xc59b6b]]) {
      const [flat] = new THREE.Raycaster(new THREE.Vector3(0.95 + dx, 1, -1.1), new THREE.Vector3(0, -1, 0)).intersectObject(mesh);
      expect(colorAt(flat)).toBe(color);
      expect(flat.point.y).toBeCloseTo(0.36, 6);
      const point = new THREE.Vector3(dx, 0.035, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), -0.6).add(new THREE.Vector3(0.95, 0.55, -0.18));
      const [back] = new THREE.Raycaster(point.clone().addScaledVector(normal, 0.3), normal.clone().negate()).intersectObject(mesh);
      expect(colorAt(back)).toBe(color);
      expect(back.point.distanceTo(point)).toBeLessThan(1e-6);
      expect(back.face!.normal.dot(normal)).toBeGreaterThan(0.999);
    }
    // No cap under the finish: painted joints have the same support height and close the entire top.
    const bands = boxTopBands(0.62, 0.08, 1.4, "#b07a46", [[0.19, "#bc8d59"], [0.025, "#805a3e"],
      [0.19, "#c59b6b"], [0.025, "#805a3e"], [0.19, "#bc8d59"]]);
    try {
      expect(bands.slice(1).reduce((sum, [part]) => sum + surfaceArea(part), 0)).toBeCloseTo(0.62 * 1.4, 6);
      expect(triangles(bands[0][0])).toBe(10);
    } finally { for (const [part] of bands) part.dispose(); }
  } finally { g.dispose(); material.dispose(); for (const [part] of roofs) part.dispose(); }
});

it("adds working lancha fittings and flush seat bands within the original single hull geometry", () => {
  const g = motorboatGeometry("#f6a800"), mask = motorboatWaterMask(), material = new THREE.MeshBasicMaterial();
  const mesh = new THREE.Mesh(g, material);
  try {
    expect(g.groups).toHaveLength(0);
    expect(triangles(g)).toBeLessThan(1200);
    expect(BOAT_SEATS).toEqual({ floor: 0.2, seat: 0.3, helm: [0, -1.05], water: 0.34 });
    expect(BOAT_SIZE).toEqual({ length: 5.2, width: 1.74, rim: 0.78 });
    for (const z of [-1.05, 0.55]) for (const [dz, color] of [[0, 0xc99f70], [-0.08, 0xbe9464], [-0.15, 0xe5d4ae]]) {
      const [hit] = new THREE.Raycaster(new THREE.Vector3(0.4, 1, z + dz), new THREE.Vector3(0, -1, 0)).intersectObject(mesh);
      expect(colorAt(hit)).toBe(color);
      expect(hit.point.y).toBeCloseTo(0.53, 6);
    }
    const [vent] = new THREE.Raycaster(new THREE.Vector3(0, 1.04, -2), new THREE.Vector3(0, 0, -1)).intersectObject(mesh);
    expect(colorAt(vent)).toBe(0x83928f);
    expect(vent.point.z).toBeCloseTo(-2.208);
    g.computeBoundingBox();
    expect(g.boundingBox!.max.y).toBeCloseTo(1.44);
    expect(g.boundingBox!.min.x).toBeGreaterThan(-1);
    expect(g.boundingBox!.max.x).toBeLessThan(1);
    expect((mask.material as THREE.MeshBasicMaterial).colorWrite).toBe(false);
    expect(mask.renderOrder).toBe(1);
    const newColors = new Set([0xe5d4ae, 0x487c79, 0xbe9464, 0x806044, 0xc99f70, 0x83928f, 0x78634e]);
    const color = new THREE.Color(), colors = g.attributes.color;
    let added = 0;
    for (let i = 0; i < colors.count; i += 3) if (newColors.has(color.fromBufferAttribute(colors, i).getHex())) added++;
    expect(added - 4).toBeLessThanOrEqual(64); // replace the two original top caps
    expect(added).toBeGreaterThan(40);
  } finally { g.dispose(); material.dispose(); mask.geometry.dispose(); mask.material.dispose(); }
});

it("paints cactus ribs on the original closed obstacle surfaces and retains the road's piece batching", () => {
  const parts = cactusParts(), g = colourMerge(parts), material = new THREE.MeshBasicMaterial();
  // The five original cylinders are a collision reference, independent of the new face subdivision.
  const old: Part[] = ([
    [0.24, 2.5, 0, 1.25, 0], [0.15, 0.72, -0.32, 1.08, -Math.PI / 2.8], [0.145, 0.72, -0.63, 1.51, 0],
    [0.13, 0.6, 0.34, 1.56, Math.PI / 2.9], [0.12, 0.58, 0.58, 1.97, 0],
  ]).map(([r, h, x, y, angle]) => [new THREE.CylinderGeometry(r * 0.82, r, h, 6).rotateZ(angle).translate(x, y, 0), "#498663"]);
  const legacy = colourMerge(old), mesh = new THREE.Mesh(g, material), before = new THREE.Mesh(legacy, material);
  const opening = Track.opening();
  try {
    expect(triangles(g) - triangles(legacy)).toBeLessThanOrEqual(128);
    expect(surfaceArea(g)).toBeCloseTo(surfaceArea(legacy), 5);
    g.computeBoundingBox(); legacy.computeBoundingBox();
    expect(g.boundingBox!.min.distanceTo(legacy.boundingBox!.min)).toBeLessThan(1e-6);
    expect(g.boundingBox!.max.distanceTo(legacy.boundingBox!.max)).toBeLessThan(1e-6);
    for (const y of [0.1, 0.6, 1.1, 1.5, 1.9, 2.4]) for (let j = 0; j < 12; j++) {
      const angle = j * Math.PI / 6, origin = new THREE.Vector3(Math.sin(angle) * 3, y, Math.cos(angle) * 3);
      const ray = new THREE.Raycaster(origin, new THREE.Vector3(-Math.sin(angle), 0, -Math.cos(angle)));
      const [after] = ray.intersectObject(mesh), [reference] = ray.intersectObject(before);
      expect(!!after).toBe(!!reference);
      if (after && reference) expect(after.point.distanceTo(reference.point)).toBeLessThan(1e-6);
    }
    expect(opening).toHaveLength(3);
    for (const piece of opening) {
      expect(piece.geometry.groups).toHaveLength(0);
      expect(piece.features.every(f => Number.isFinite(f.x) && Number.isFinite(f.s))).toBe(true);
      for (const obstacle of piece.obstacles) expect(obstacle.end).toBeGreaterThan(obstacle.start);
    }
  } finally { g.dispose(); legacy.dispose(); material.dispose(); for (const piece of opening) piece.geometry.dispose(); }
});

it("opens feather gaps in street palm fronds inside one original instanced canopy and its crown envelope", () => {
  const { town, restore } = buildTownFixture();
  try {
    const palm = town.group.getObjectByName("palms") as THREE.InstancedMesh;
    expect(palm).toBeInstanceOf(THREE.InstancedMesh);
    expect(palm.count).toBeGreaterThan(10);
    expect(palm.geometry.groups).toHaveLength(0);
    expect(triangles(palm.geometry) - 296).toBeLessThanOrEqual(80);
    expect((palm.material as THREE.MeshLambertMaterial).side).toBe(THREE.DoubleSide);
    expect(palm.castShadow).toBe(true);
    expect((palm.material as THREE.MeshLambertMaterial).customProgramCacheKey()).toBe("palms-sway-nearfade");
    const matrix = new THREE.Matrix4(), p = new THREE.Vector3();
    for (let i = 0; i < palm.count; i++) {
      palm.getMatrixAt(i, matrix); p.setFromMatrixPosition(matrix);
      expect(town.colliders.circles.some(c => c.r === 0.4 && Math.hypot(c.x - p.x, c.z - p.z) < 1e-5)).toBe(true);
    }
    // Isolate the first real frond after the six open trunk cylinders (84 triangles).
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(Array.from(palm.geometry.attributes.position.array).slice(84 * 9, (84 + 24) * 9), 3));
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), frond = new THREE.Mesh(geometry, material);
    const at = (t: number) => {
      const y = Math.sin(0.75) * 3 * t - 0.55 * 3 * t * t, z = Math.cos(0.75) * 3 * t * (1 - 0.08 * t);
      const half = 0.45 * Math.min(1, Math.sin(Math.PI * Math.min(1, t * 1.05)) * 1.25) * (t < 0.12 ? t / 0.12 : 1);
      return { y, z, half };
    };
    try {
      geometry.computeBoundingBox();
      expect(geometry.boundingBox!.min.y).toBeGreaterThan(6.1);
      expect(geometry.boundingBox!.max.y).toBeLessThan(7.2);
      const sample = (t: number, fraction: number) => {
        const i = Math.min(3, Math.floor(t * 4)), f = t * 4 - i, a = at(i / 4), b = at((i + 1) / 4);
        const z = a.z + (b.z - a.z) * f, half = a.half + (b.half - a.half) * f;
        return new THREE.Raycaster(new THREE.Vector3(0.6 + half * fraction, 9, z), new THREE.Vector3(0, -1, 0)).intersectObject(frond);
      };
      expect(sample(1 / 3, 0.92)).toHaveLength(0);
      expect(sample(0.25, 0.65).length).toBeGreaterThan(0);
      expect(sample(0.25, 0.02).length).toBeGreaterThan(0);
    } finally { geometry.dispose(); material.dispose(); }
  } finally { restore(); }
});
