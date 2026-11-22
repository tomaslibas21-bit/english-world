import { Raycaster, Vector3, type Mesh, type Object3D } from "three";
import { covers, NEAR_TALK, shoulderShots, type Body, type Shot } from "../talkShot";
import { DROPOFF } from "../world/layout";
import type { Town } from "../world/town";

export function meetingSpot(town: Pick<Town, "doors" | "colliders" | "walkableAt">, location: string) {
  const door = town.doors.find((d) => d.loc === location);
  const anchor = door ?? DROPOFF[location];
  if (!anchor) return null;
  // The town-square drop-off faces into the plaza. Lizzie faces Main Street, to its south.
  const rot = location === "town-square" ? 0 : anchor.rot;
  const out = door ? 3.2 : 0.8;
  // The outdoor drop-offs already sit by the sidewalk. Keep some room between Lizzie and the arrival point.
  for (const side of [1.2, -1.2, 0, 1.8, -1.8]) {
    const x = anchor.x + out * Math.sin(rot) + side * Math.cos(rot);
    const z = anchor.z + out * Math.cos(rot) - side * Math.sin(rot);
    if (town.walkableAt(x, z) && !town.colliders.blocked(x, z, 0.55)) return { x, z, rot };
  }
  return null;
}

export function meetingShot(
  learner: Vector3, lizzie: Vector3, learnerHeight: number, lizzieHeight: number,
  streetHeading: number, town: Pick<Town, "colliders">, scenery: Object3D[], inside: (pos: Vector3) => boolean,
) {
  const focus = learner.clone().lerp(lizzie, 0.82).setY(lizzie.y + lizzieHeight * 0.7);
  // At the same position (e.g. after a teleport), use the street side as the learner's shoulder axis.
  const spacing = Math.hypot(learner.x - lizzie.x, learner.z - lizzie.z);
  const shoulder = spacing >= 0.1 ? learner :
    lizzie.clone().add(new Vector3(Math.sin(streetHeading), 0, Math.cos(streetHeading)));
  const body: Body = { x: learner.x, y: learner.y, z: learner.z, top: learner.y + learnerHeight * 1.08, r: 0.36 };
  const ray = new Raycaster();
  const direction = new Vector3(), right = new Vector3(), face = new Vector3();
  let fallback: Shot | null = null;
  for (const shot of shoulderShots(shoulder, lizzie, focus, NEAR_TALK, 5, 1)) {
    const { pos } = shot;
    if (inside(pos) || town.colliders.blocked(pos.x, pos.z, 0.25)) continue;
    right.set(lizzie.z - pos.z, 0, pos.x - lizzie.x).normalize();
    const covered = spacing < body.r || [-0.2, 0, 0.2].some((offset) => [0.82, 0.94, 1].some((height) => {
      face.copy(lizzie).addScaledVector(right, offset).setY(lizzie.y + lizzieHeight * height);
      return covers(pos, face, body);
    }));
    if (covered && fallback) continue;
    if (![-0.16, 0, 0.16].every((offset) => {
      face.copy(lizzie).addScaledVector(right, offset).setY(lizzie.y + lizzieHeight * 0.9);
      direction.subVectors(face, pos);
      ray.far = direction.length();
      ray.set(pos, direction.normalize());
      return !ray.intersectObjects(scenery, true).some(({ object }) => {
        const mesh = object as Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        return mesh.isMesh && mesh.visible && materials.some((m) => m?.visible && (!m.transparent || m.opacity >= 0.75));
      });
    })) continue;
    if (!covered) return shot;
    // Use A2's visibility fallback if the learner would cover the face in every clear shot.
    fallback = { ...shot, covered: true };
    if (spacing < body.r) break;
  }
  return fallback;
}
