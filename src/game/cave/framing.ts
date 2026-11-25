import { Vector3 } from "three";
import type { GameCharacter } from "../characters";
import type { Interior } from "../world/interiors";
import type { Shot } from "../talkShot";
import { TREES } from "./plan";

type Space = NonNullable<Interior["wild"]>["space"];
type Actor = { ch: GameCharacter; sit?: boolean };

export function wildPersonY({ ch, sit }: Actor, fraction: number) {
  return ch.root.position.y + (sit ? (ch.seatY ?? 0.5) - ch.height * 0.66 / 1.75 : 0) + ch.height * fraction;
}

const ANGLES = [90, 70, 52, 36, 24, 110, 0].flatMap((d) => [d, -d]).map((d) => d * Math.PI / 180);
const FAR = [1, 1.14, 1.3, 1.48, 1.69, 1.93, 2.2, 0.85, 0.7, 0.58, 0.48, 0.4];
const NEAR = [0.4, 0.48, 0.58, 0.7, 0.85, 1, 1.2, 1.45];

export function fitTalkWild(space: Space, first: Shot, distance: number, who: Actor[],
  fits: (shot: Shot, loose: boolean) => boolean, uncovered: (shot: Shot) => boolean, upright: boolean): Shot {
  const learner = who[0].ch.root.position, actor = who[1].ch.root.position;
  const back = new Vector3(learner.x - actor.x, 0, learner.z - actor.z);
  if (back.lengthSq() < 0.01) back.set(0, 0, 1);
  back.normalize();
  const side = new Vector3(-back.z, 0, back.x);
  const faces = who.map((n) => n.ch.root.position.clone().setY(wildPersonY(n, 0.9)));
  const chests = who.map((n) => n.ch.root.position.clone().setY(wildPersonY(n, 0.62)));
  const raises = upright ? [0, 0.15, 0.3] : [0];
  const pos = new Vector3(), look = new Vector3();
  const shot: Shot = { pos, look };
  for (const loose of [false, true]) {
    const aim = loose ? faces[1] : first.look;
    for (const angle of ANGLES) {
      const x = back.x * Math.cos(angle) + side.x * Math.sin(angle);
      const z = back.z * Math.cos(angle) + side.z * Math.sin(angle);
      for (const scale of loose ? NEAR : FAR) {
        const d = distance * scale;
        if (d > 13) continue;
        for (const slope of [0.3, 0.2, 0.12]) {
          pos.set(aim.x + x * d, aim.y + Math.max(0.35, d * slope), aim.z + z * d);
          look.copy(aim);
          if (space.inside(pos) || !uncovered(shot)) continue;
          if (!faces.every((face, i) => (loose && i === 0) || (space.free(pos, face) >= 0.999 && space.free(pos, chests[i]) >= 0.999))) continue;
          for (const raise of raises) {
            look.copy(aim).setY(aim.y + raise - (loose ? 0.12 : 0));
            if (fits(shot, loose)) return shot;
          }
        }
      }
    }
  }
  look.copy(faces[1]).y -= 0.12;
  pos.copy(look).addScaledVector(back, 3).addScaledVector(side, 0.7);
  pos.y += 0.8;
  pos.lerpVectors(look, pos, Math.min(1, space.free(look, pos) * 0.9));
  return shot;
}

export function aimTree(space: Space, at: Vector3, camera: Vector3, upright: boolean) {
  const tree = TREES[1];
  const dir = new Vector3(tree.x - at.x, 0, tree.z - at.z);
  if (dir.lengthSq() < 0.01) dir.set(0, 0, -1);
  dir.normalize();
  const side = new Vector3(dir.z, 0, -dir.x);
  const look = new Vector3(tree.x, upright ? 6 : 3.6, tree.z);
  const head = new Vector3(at.x, at.y + 1.5, at.z);
  const pos = new Vector3();
  const now = Math.sign((camera.x - at.x) * side.x + (camera.z - at.z) * side.z) || 1;
  for (const back of upright ? [9.5, 8, 6.5, 5] : [7.5, 6.5, 5.5, 4.5]) {
    for (const sign of [now, -now]) {
      for (const off of upright ? [1.3, 0.8] : [2.6, 1.8, 1.1]) {
        pos.copy(at).addScaledVector(dir, -back).addScaledVector(side, sign * off).setY(at.y + 2.3 + back * 0.08);
        if (!space.inside(pos) && space.free(pos, head) >= 0.999 && space.free(pos, look) >= 0.6) return { pos, look };
      }
    }
  }
  pos.copy(head).addScaledVector(dir, -3.2).setY(at.y + 2.4);
  pos.lerpVectors(head, pos, Math.min(1, space.free(head, pos) * 0.85));
  return { pos, look };
}
