import * as THREE from "three";
import { expect, it } from "vitest";
import { OpenSky } from "../../src/game/kit/openSky";
import { SEA_VIEW, seaHorizon } from "../../src/game/sea/look";
import { BAY } from "../../src/game/water";
import { LIGHTHOUSE, SEA_Z } from "../../src/game/world/layout";

it("keeps the seeded Puerto Colibrí shoreline in one horizon mesh with an inlet between the palapas and the original landmarks", () => {
  const sky = new OpenSky(2300, SEA_VIEW.sky, SEA_VIEW.sunAzimuth, 0);
  const shore = { x0: BAY.x0, x1: BAY.x1, z: SEA_Z, lighthouse: LIGHTHOUSE };
  const offshore = seaHorizon(sky), first = seaHorizon(sky, shore), repeat = seaHorizon(sky, shore);
  try {
    expect(first).toBeInstanceOf(THREE.Mesh);
    expect(first.name).toBe("sea-horizon");
    expect(first.children).toHaveLength(0);
    expect(first.geometry.groups).toHaveLength(0);
    expect(Array.isArray(first.material)).toBe(false);
    for (const name of ["position", "normal", "color"]) {
      const a = first.geometry.getAttribute(name).array, b = repeat.geometry.getAttribute(name).array;
      expect(a.length).toBe(b.length);
      expect(a.every((n, i) => n === b[i])).toBe(true);
    }
    const { position, color } = first.geometry.attributes;
    const start = offshore.geometry.attributes.position.count;
    expect((position.count - start) / 3).toBeLessThanOrEqual(956 + 480); // B2 coast alone
    const ink = new THREE.Color(), p = new THREE.Vector3();
    const tower = (shore.x0 + shore.x1) / 2 + (shore.x1 - shore.x0) * 0.12;
    const cap = new THREE.Box3(), spire = new THREE.Box3();
    const roofs = [new THREE.Box3(), new THREE.Box3()], palms = new THREE.Box3();
    for (let i = start; i < position.count; i++) {
      p.fromBufferAttribute(position, i);
      const hex = ink.fromBufferAttribute(color, i).getHex();
      if (hex === 0x3d4a57) cap.expandByPoint(p);
      if (Math.abs(p.x - tower) < 5 && Math.abs(p.z - SEA_Z - 44) < 5 && p.y >= 20 && hex === 0xaa684e) spire.expandByPoint(p);
      if (hex === 0x987246) roofs[Number(p.x > -30)].expandByPoint(p);
      if (hex === 0x8f7354 && p.x > -40 && p.x < -14) palms.expandByPoint(p);
    }
    expect(cap.getCenter(p).x).toBeCloseTo(LIGHTHOUSE.x);
    expect(cap.getCenter(p).z).toBeCloseTo(LIGHTHOUSE.z);
    expect(cap.max.y).toBeCloseTo(21.7);
    expect(spire.getCenter(p).x).toBeCloseTo(tower);
    expect(spire.getCenter(p).z).toBeCloseTo(SEA_Z + 44);
    expect(spire.max.y).toBe(27);
    for (const roof of roofs) {
      expect(roof.getSize(p).x).toBeGreaterThan(14);
      expect(roof.getSize(p).y).toBeGreaterThan(3);
    }
    expect(palms.isEmpty()).toBe(false);
    expect(roofs[0].max.x).toBeLessThan(palms.min.x);
    expect(roofs[1].min.x).toBeGreaterThan(palms.max.x);

    // From offshore at mean water level the central inlet extends behind both palapa fronts.
    const waterline = (x: number) => {
      const ray = new THREE.Raycaster(new THREE.Vector3(x, 0, SEA_Z - 20), new THREE.Vector3(0, 0, 1));
      const [hit] = ray.intersectObject(first);
      expect(ink.fromBufferAttribute(color, hit.face!.a).getHex()).toBe(0xd6bb87);
      return hit.point.z;
    };
    const left = waterline(-73), cove = waterline(-53), point = waterline(-38), inlet = waterline(-1), right = waterline(20);
    expect(cove - Math.max(left, point)).toBeGreaterThan(12);
    expect(inlet - Math.max(point, right)).toBeGreaterThan(9);
    const oppositeBank = waterline(-9);
    for (const x of [-32, -30, -28, -26]) {
      expect(x).toBeGreaterThan(roofs[0].max.x);
      expect(x).toBeLessThan(roofs[1].min.x);
      const head = waterline(x);
      expect(head - SEA_Z).toBeGreaterThan(35);
      expect(head - Math.max(point, oppositeBank)).toBeGreaterThan(29);
    }
  } finally {
    for (const mesh of [offshore, first, repeat]) { mesh.geometry.dispose(); mesh.material.dispose(); }
    sky.dispose();
  }
});
