// The conversation's nearer view (Game.fitTalk tries these before its own, older framings): over the learner's
// shoulder, so the person spoken with is seen from the front and large, and the learner's own figure (their backpack,
// their head) is never between the camera and that person's face. Pure geometry: what is in the picture, what the
// town or a room puts in the way, is Game.ts's to judge.
import * as THREE from "three";

export interface Shot { pos: THREE.Vector3; look: THREE.Vector3; /** where the camera leans in to while they speak */ near?: THREE.Vector3; /** the learner's figure is in front of a face from here */ covered?: boolean }
/** Someone standing: their feet (x, y, z), how high they reach, how wide they are (a backpack's reach included). */
export interface Body { x: number; y: number; z: number; top: number; r: number }

/** Is `body` between the camera at `pos` and `face` (the line from one to the other passes through their figure)? */
export function covers(pos: THREE.Vector3, face: THREE.Vector3, body: Body): boolean {
  const dx = face.x - pos.x, dz = face.z - pos.z, len2 = dx * dx + dz * dz;
  if (len2 < 1e-6) return false;
  // (the nearest the line comes to them, seen from above; not past the face itself)
  const t = THREE.MathUtils.clamp(((body.x - pos.x) * dx + (body.z - pos.z) * dz) / len2, 0, 1);
  if (t > 0.97) return false;
  if (Math.hypot(pos.x + dx * t - body.x, pos.z + dz * t - body.z) >= body.r) return false;
  const y = pos.y + (face.y - pos.y) * t;
  return y > body.y - 0.05 && y < body.top;
}

/** How far from the people the nearer view starts (m): a figure about half the picture's height on a computer. */
export const NEAR_TALK = 3.3;
/** Round from behind the learner (0°) towards side-on (90°): the angles tried, the best-looking first. */
const ANGLES = [46, 58, 36, 70, 82];

/** The over-the-shoulder views, the nearest first: the camera `d` metres from `focus`, turned `ANGLES` away from the
 *  line behind the learner (who stands at `p` and speaks with someone at `a`), on the side `first` (1 or -1) and then
 *  on the other, looking a little down. From `d0` out to `max`, a step at a time. */
export function* shoulderShots(p: THREE.Vector3, a: THREE.Vector3, focus: THREE.Vector3, d0: number, max: number, first: 1 | -1, angles = ANGLES): Generator<Shot> {
  const back = new THREE.Vector3(p.x - a.x, 0, p.z - a.z);
  if (back.lengthSq() < 0.01) back.set(0, 0, 1);
  back.normalize();
  const side = new THREE.Vector3(-back.z, 0, back.x);
  for (let d = d0; d <= max * 1.001; d = Math.min(d * 1.09, d < max ? max : d * 2)) {
    for (const deg of angles) for (const s of [first, -first]) {
      const ang = THREE.MathUtils.degToRad(deg);
      const pos = focus.clone().addScaledVector(back, Math.cos(ang) * d).addScaledVector(side, Math.sin(ang) * s * d);
      // (17° down from near; further off, as the older framings: more of the ground, less of the town behind them)
      pos.y = focus.y + Math.max(0.9, d * (d <= 7 ? 0.3 : 0.5));
      yield { pos, look: focus };
    }
  }
}
