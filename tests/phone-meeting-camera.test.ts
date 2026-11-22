import { expect, it, vi } from "vitest";
import { PerspectiveCamera, Raycaster, Vector3 } from "three";
import { NPCS } from "../src/content/npcs";
import { invitationLocation } from "../src/content/phoneCalls";
import { createCharacter } from "../src/game/characters";
import { OcclusionField } from "../src/game/occlusion";
import { meetingShot, meetingSpot } from "../src/game/phone/meetingScene";
import { floorY } from "../src/game/water";
import { DROPOFF, WORLD } from "../src/game/world/layout";
import { buildTown } from "../src/game/world/town";

it("keeps Lizzie's face in a clear shoulder view at each meeting place", () => {
  const draw = () => {};
  const gradient = () => ({ addColorStop: draw });
  const canvas = new Proxy({
    measureText: (text: string) => ({ width: text.length * 9 }), createLinearGradient: gradient, createRadialGradient: gradient,
  }, { get: (target, key) => Reflect.get(target, key) ?? draw });
  vi.stubGlobal("document", { createElement: () => ({ getContext: () => canvas }) });
  try {
    const town = buildTown();
    const moves = (o: (typeof town.group.children)[number]) => o.userData.v !== undefined || !!o.userData.gull || !!o.userData.boat;
    const field = OcclusionField.fromObject(town.group, WORLD, {
      skip: (o) => moves(o) || o.userData.thin || o === town.parkedCars.taxi?.root,
    });
    field.fillFootprints(town.colliders.boxes, town.colliders.circles);
    const inside = (p: Vector3) => field.solidAt(p.x, p.y, p.z, 0.15);
    const scenery = town.group.children.filter((o) => !moves(o));
    const lizzie = createCharacter({ ...NPCS.lizzie.look, female: true });
    const ray = new Raycaster();
    for (const place of ["station", "cafe", "bus_stop", "entrance"]) {
      const loc = invitationLocation(place)!;
      const spot = meetingSpot(town, loc);
      expect(spot, loc).not.toBeNull();
      const { x, z, rot } = spot!;
      expect(town.colliders.blocked(x, z, 0.55), loc).toBe(false);
      const door = town.doors.find((d) => d.loc === loc);
      if (door) {
        const distance = Math.hypot(x - door.x, z - door.z);
        expect(distance, loc).toBeGreaterThanOrEqual(3);
        expect(distance, loc).toBeLessThanOrEqual(4);
        expect((x - door.x) * Math.sin(door.rot) + (z - door.z) * Math.cos(door.rot), loc).toBeGreaterThan(3);
      } else {
        expect(Math.cos(rot), loc).toBe(loc === "town-square" ? 1 : -1);
      }
      const actor = new Vector3(x, floorY(x, z), z);
      const head = actor.clone().setY(actor.y + lizzie.height * 0.9);
      const arriving = door ? { x: door.outX + 1.5 * Math.sin(rot), z: door.outZ + 1.5 * Math.cos(rot) } : DROPOFF[loc];
      const approaches = [arriving, spot!, ...[2.85, 0.55].flatMap((distance) => Array.from({ length: 8 }, (_, i) => {
        const angle = rot + i * Math.PI / 4;
        return { x: x + distance * Math.sin(angle), z: z + distance * Math.cos(angle) };
      }))];
      for (const p of approaches.filter((p) => town.walkableAt(p.x, p.z))) {
        const from = new Vector3(p.x, floorY(p.x, p.z), p.z);
        const label = `${loc}, learner at ${p.x.toFixed(2)}, ${p.z.toFixed(2)}`;
        const shot = meetingShot(from, actor, 1.8, lizzie.height, rot, town, scenery, inside);
        expect(shot, label).not.toBeNull();
        const spacing = from.distanceTo(actor);
        if (spacing > 1) expect(shot!.covered, label).toBeUndefined();
        if (spacing === 0) expect(shot!.covered, label).toBe(true);
        const sightline = head.clone().sub(shot!.pos);
        ray.far = sightline.length();
        ray.set(shot!.pos, sightline.normalize());
        expect(ray.intersectObjects(scenery, true), label).toHaveLength(0);
        for (const [w, h] of [[390, 844], [1280, 800]]) {
          const camera = new PerspectiveCamera(50, w / h, 0.1, 900);
          camera.position.copy(shot!.pos);
          camera.lookAt(shot!.look);
          camera.updateMatrixWorld();
          const face = head.clone().project(camera);
          expect(Math.abs(face.x), `${label} at ${w}×${h}`).toBeLessThan(0.8);
          expect(face.y, `${label} at ${w}×${h}`).toBeGreaterThan(0);
          expect(face.y, `${label} at ${w}×${h}`).toBeLessThan(0.8);
        }
      }
    }
    lizzie.dispose?.();
  } finally {
    vi.unstubAllGlobals();
  }
});
