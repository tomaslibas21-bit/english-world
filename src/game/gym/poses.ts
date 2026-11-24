import { Euler, Vector3, type Object3D } from "three";
import type { GyMoveId } from "../../content/gym";
import type { CharacterJoint, GameCharacter } from "../characters";
import { Character } from "../characters/Character";
import { IS_REAL, IS_STORY, IS_TOON } from "../style";
import { GYM_MOVES } from "./round";

const DEG = Math.PI / 180;
const JOINTS = ["body", "head", "armL", "armR", "foreL", "foreR", "legL", "legR", "shinL", "shinR"] as const;
const FRAME_SAMPLES = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
const LUNGE_FRONT = -70 * DEG, LUNGE_KNEE = 75 * DEG, LUNGE_BACK = 33 * DEG;

function ease(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

class Joint {
  private homePosition: Vector3;
  private homeRotation: Euler;
  private homeScale: Vector3;
  private neutralPosition = new Vector3();
  private neutralRotation = new Euler();
  private neutralScale = new Vector3();

  constructor(readonly node: Object3D) {
    this.homePosition = node.position.clone();
    this.homeRotation = node.rotation.clone();
    this.homeScale = node.scale.clone();
    this.capture();
  }

  capture() {
    this.neutralPosition.copy(this.node.position);
    this.neutralRotation.copy(this.node.rotation);
    this.neutralScale.copy(this.node.scale);
  }

  reset() {
    this.node.position.copy(this.neutralPosition);
    this.node.rotation.copy(this.neutralRotation);
    this.node.scale.copy(this.neutralScale);
  }

  restore() {
    this.node.position.copy(this.homePosition);
    this.node.rotation.copy(this.homeRotation);
    this.node.scale.copy(this.homeScale);
  }

  aim(x: number, y: number, z: number, weight: number) {
    const r = this.neutralRotation;
    this.node.rotation.set(r.x + (x - r.x) * weight, r.y + (y - r.y) * weight, r.z + (z - r.z) * weight, r.order);
  }

  move(y: number, z: number, weight: number) {
    this.node.position.y = this.neutralPosition.y + y * weight;
    this.node.position.z = this.neutralPosition.z + z * weight;
  }
}

export type GymFramePoint = { at: Vector3; radius: number };

/** The shoes move rigidly with the shins. Use the sole box or the styled shoe's ellipsoid and sole. */
class Shoe {
  private readonly lower: number;
  private readonly center: Vector3;
  private readonly radii: Vector3;
  private readonly flatSole: boolean;

  constructor(private readonly shin: Object3D, leg: Object3D, blocks: boolean) {
    this.lower = blocks ? 0.05 - shin.position.y : leg.position.y + shin.position.y;
    this.flatSole = IS_REAL;
    if (blocks) {
      this.center = new Vector3(0, -this.lower, 0.05);
      this.radii = new Vector3(0.085 * Math.abs(leg.position.x) / 0.12, 0, 0.14);
    } else {
      const radius = IS_TOON ? 0.112 : IS_STORY ? 0.078 : 0.062;
      const shoeHeight = IS_TOON || IS_STORY ? 0.09 : 0.08;
      this.center = new Vector3(0, -this.lower + shoeHeight * 0.65, radius * (IS_TOON ? 0.45 : 0.55));
      this.radii = new Vector3(radius * (IS_TOON ? 0.95 : 0.85), radius * (IS_TOON ? 0.62 : 0.56), radius * (IS_TOON ? 1.45 : 1.75));
    }
  }

  minY() {
    this.shin.updateWorldMatrix(true, false);
    const m = this.shin.matrixWorld.elements;
    return m[13] + this.supportOffset(m[1], m[5], m[9]);
  }

  // Project the sole onto the vertical axis expressed in the shin's coordinates.
  supportOffset(upX: number, upY: number, upZ: number) {
    const centerY = this.center.y * upY + this.center.z * upZ;
    const x = this.radii.x * upX, z = this.radii.z * upZ;
    if (this.radii.y === 0) return centerY - Math.abs(x) - Math.abs(z);
    const shoe = centerY - Math.hypot(x, this.radii.y * upY, z);
    if (!this.flatSole) return shoe;
    const sole = -this.lower * upY + this.center.z * upZ + Math.min(0, 0.016 * upY)
      - Math.hypot(0.0494 * upX, 0.0988 * upZ);
    return Math.min(shoe, sole);
  }
}

/** The ordinary rig drives the neutral frame. Each exercise blends toward joint angles in the rig's own axes. */
export class GymPoseRig {
  private joints: Record<CharacterJoint, Joint>;
  private all: Joint[];
  private yaw = 0;
  private scale = 1;
  private hip: number;
  private thigh: number;
  private lower: number;
  private upper: number;
  private hand: number;
  private shoes: [Shoe, Shoe];
  private lungeRearKnee: number;
  private toeBend: number;
  private palmClearance: number;

  constructor(private actor: GameCharacter) {
    this.all = JOINTS.map((name) => new Joint(actor.joint(name)));
    this.joints = Object.fromEntries(JOINTS.map((name, index) => [name, this.all[index]])) as Record<CharacterJoint, Joint>;
    const { legL, legR, shinL, shinR, foreR } = this.joints;
    this.hip = legL.node.position.y;
    this.thigh = -shinL.node.position.y;
    this.lower = this.hip - this.thigh;
    this.upper = -foreR.node.position.y;
    this.hand = -actor.rightHand.position.y;
    const blocks = actor instanceof Character;
    this.shoes = [new Shoe(shinL.node, legL.node, blocks), new Shoe(shinR.node, legR.node, blocks)];
    // Allow for the visible mitten below the hand anchor, including the larger trial styles.
    this.palmClearance = blocks ? 0.072 * legR.node.position.x / 0.12 : IS_TOON ? 0.088 : IS_STORY ? 0.066 : 0;
    this.lungeRearKnee = this.lungeKnee();
    // Longer-legged rigs need a deeper knee bend to bring the fingertips down.
    const reach = this.hip / (this.upper + this.hand);
    this.toeBend = Math.min(1, Math.max(0, (reach - 1.31) * 3.75));
  }

  stand(heading: number) {
    this.yaw = heading;
    this.scale = this.actor.height / 1.75;
    this.actor.root.rotation.set(0, heading, 0);
    this.actor.setFar?.(false);
    this.tick(0, null, 0);
  }

  tick(dt: number, move: GyMoveId | null, progress: number) {
    this.reset();
    this.actor.update(dt);
    for (const joint of this.all) joint.capture();
    if (move && progress > 0 && progress < 1) this.apply(move, progress);
  }

  restore() { for (const joint of this.all) joint.restore(); }

  private reset() {
    for (const joint of this.all) joint.reset();
    this.actor.root.rotation.y = this.yaw;
  }

  private supportY() {
    return Math.min(this.shoes[0].minY(), this.shoes[1].minY());
  }

  private lungeKnee() {
    // Match the rear toe to the front sole at full depth, on the raised-heel branch.
    const frontShin = LUNGE_FRONT + LUNGE_KNEE;
    const frontY = this.shoes[0].supportOffset(0, Math.cos(frontShin), -Math.sin(frontShin)) - this.thigh * Math.cos(LUNGE_FRONT);
    const rearThighY = -this.thigh * Math.cos(LUNGE_BACK);
    let low = Math.PI / 4, high = Math.PI / 2;
    for (let i = 0; i < 12; i++) {
      const pitch = (low + high) / 2;
      const rearY = rearThighY + this.shoes[1].supportOffset(0, Math.cos(pitch), -Math.sin(pitch));
      if (rearY < frontY) low = pitch;
      else high = pitch;
    }
    return (low + high) / 2 - LUNGE_BACK;
  }

  private apply(move: GyMoveId, t: number) {
    const { body, head, armL, armR, foreL, foreR, legL, legR, shinL, shinR } = this.joints;
    const s = this.scale;
    const weight = ease(t / 0.35) * ease((1 - t) / 0.4);
    const grounded = move !== "jacks" && move !== "circles";
    // Use this frame's idle sole level so breathing and the return to standing stay continuous.
    const floor = grounded ? this.supportY() : 0;
    switch (move) {
      case "jacks":
        body.move(0.12 * s * Math.sin(Math.PI * t) ** 2, 0, 1);
        legL.aim(0, 0, -24 * DEG, weight); legR.aim(0, 0, 24 * DEG, weight);
        shinL.aim(0, 0, 0, weight); shinR.aim(0, 0, 0, weight);
        armL.aim(0, 0, -150 * DEG, weight); armR.aim(0, 0, 150 * DEG, weight);
        foreL.aim(0, 0, 0, weight); foreR.aim(0, 0, 0, weight);
        break;
      case "toes": {
        const bend = this.toeBend, shin = 12 * DEG;
        const thigh = -(50 + 15 * bend) * DEG;
        const hinge = (84 + 3 * bend) * DEG;
        body.aim(hinge, 0, 0, weight);
        // Counter the hinge at the hips and the bend at the knees to keep the shoes under the reach.
        body.move(0, -this.hip * Math.sin(hinge * weight)
          + this.thigh * Math.sin(thigh * weight) + this.lower * Math.sin(shin * weight), 1);
        legL.aim(thigh - hinge, 0, -0.18, weight); legR.aim(thigh - hinge, 0, 0.18, weight);
        shinL.aim(shin - thigh, 0, 0, weight); shinR.aim(shin - thigh, 0, 0, weight);
        // Keep the elbows outside the knees as the hands turn inward toward the shoes.
        const shoulderPitch = -(61 + 8 * bend) * DEG;
        const shoulderRoll = 0.12 - 0.42 * bend, elbowRoll = 0.62 * bend;
        armL.aim(shoulderPitch, 0, shoulderRoll, weight); armR.aim(shoulderPitch, 0, -shoulderRoll, weight);
        foreL.aim(-0.1, 0, elbowRoll, weight); foreR.aim(-0.1, 0, -elbowRoll, weight);
        head.aim(-0.14, 0, 0, weight);
        this.actor.root.rotation.y += 0.45 * weight;
        break;
      }
      case "squats": {
        const thigh = -72 * DEG, knee = 82 * DEG, shin = thigh + knee;
        body.move(0, this.thigh * Math.sin(thigh * weight) + this.lower * Math.sin(shin * weight), 1);
        legL.aim(thigh, 0, -0.06, weight); legR.aim(thigh, 0, 0.06, weight);
        shinL.aim(knee, 0, 0, weight); shinR.aim(knee, 0, 0, weight);
        armL.aim(-Math.PI / 2, 0, -0.05, weight); armR.aim(-Math.PI / 2, 0, 0.05, weight);
        foreL.aim(-0.06, 0, 0, weight); foreR.aim(-0.06, 0, 0, weight);
        break;
      }
      case "circles": {
        const cycle = t * 4 * Math.PI, envelope = ease(t / 0.22) * ease((1 - t) / 0.22);
        const sin = 16 * DEG * Math.sin(cycle), cos = 16 * DEG * Math.cos(cycle);
        armL.aim(0, cos, -85 * DEG - sin, envelope);
        armR.aim(0, sin, 85 * DEG + cos, envelope);
        foreL.aim(-0.12, 0, 0, envelope); foreR.aim(-0.12, 0, 0, envelope);
        break;
      }
      case "run": {
        const cycle = t * 4 * Math.PI, envelope = ease(t / 0.22) * ease((1 - t) / 0.22);
        const stride = Math.sin(cycle);
        legL.aim(-38 * DEG * stride, 0, 0, envelope); legR.aim(38 * DEG * stride, 0, 0, envelope);
        shinL.aim(0.15 + Math.max(0, -stride) * 0.82, 0, 0, envelope);
        shinR.aim(0.15 + Math.max(0, stride) * 0.82, 0, 0, envelope);
        armL.aim(0.55 * stride, 0, -0.13, envelope); armR.aim(-0.55 * stride, 0, 0.13, envelope);
        foreL.aim(-1.3, 0, 0, envelope); foreR.aim(-1.3, 0, 0, envelope);
        break;
      }
      case "reach":
        body.move(0, this.lower * Math.sin(25 * DEG * weight), 1);
        legL.aim(0, 0, 0, weight); legR.aim(0, 0, 0, weight);
        shinL.aim(25 * DEG, 0, 0, weight); shinR.aim(25 * DEG, 0, 0, weight);
        armL.aim(-165 * DEG, 0, -0.04, weight); armR.aim(-165 * DEG, 0, 0.04, weight);
        foreL.aim(-0.12, 0, 0, weight); foreR.aim(-0.12, 0, 0, weight);
        break;
      case "lunges":
        body.move(0, -0.015 * s, weight);
        legL.aim(LUNGE_FRONT, 0, 0, weight); shinL.aim(LUNGE_KNEE, 0, 0, weight);
        legR.aim(LUNGE_BACK, 0, 0, weight); shinR.aim(this.lungeRearKnee, 0, 0, weight);
        armL.aim(-0.24, 0, -0.15, weight); armR.aim(-0.48, 0, 0.15, weight);
        foreL.aim(-0.8, 0, 0, weight); foreR.aim(-0.95, 0, 0, weight);
        this.actor.root.rotation.y += 0.45 * weight;
        break;
      case "pushups":
        this.pushup(t, floor);
        return;
    }
    if (grounded) body.node.position.y += floor - this.supportY();
  }

  private pushup(t: number, floor: number) {
    const { body, head, armL, armR, foreL, foreR, legL, legR, shinL, shinR } = this.joints;
    const weight = ease(t / 0.2) * ease((1 - t) / 0.3);
    const press = Math.sin(Math.PI * Math.max(0, Math.min(1, (t - 0.2) / 0.5))) ** 2;
    const s = this.scale, pitch = 80 * DEG;
    const toe = 0.185 * s, palm = Math.max(0.061 * s, this.palmClearance);
    const shoulder = armL.node.position.y - this.hip;
    // Hold the toe and palm marks in place while the shoulder lowers and the elbows fold.
    const hipHigh = palm + (this.upper + this.hand) * 0.94 - shoulder * Math.cos(pitch);
    const hipY = hipHigh - 0.12 * s * press;
    const tip = Math.atan2(toe, this.hip), reach = Math.hypot(this.hip, toe);
    const straight = Math.acos(Math.min(1, hipHigh / reach)) + tip;
    const legPitch = Math.acos(Math.min(1, hipY / reach)) + tip;
    const hipZ = 0.045 * s + reach * (Math.sin(legPitch - tip) - Math.sin(straight - tip));
    const bend = pitch * weight;
    body.aim(pitch, 0, 0, weight);
    body.move(0, hipZ * weight - this.hip * Math.sin(bend), 1);
    head.aim(-0.22, 0, 0, weight);
    legL.aim(legPitch - pitch, 0, 0, weight); legR.aim(legPitch - pitch, 0, 0, weight);
    shinL.aim(0, 0, 0, weight); shinR.aim(0, 0, 0, weight);
    body.node.position.y += floor - this.supportY();
    const down = body.node.position.y + armL.node.position.y * Math.cos(bend) - palm;
    const forward = 0.078 * s + 0.045 * s - hipZ;
    const dx = Math.hypot(down, forward), a = this.upper, b = this.hand;
    const elbow = Math.acos(Math.max(-1, Math.min(1, (dx * dx - a * a - b * b) / (2 * a * b))));
    const upper = -Math.atan2(forward, down) + Math.atan2(b * Math.sin(elbow), a + b * Math.cos(elbow));
    armL.aim(upper - pitch, 0, 0, weight); armR.aim(upper - pitch, 0, 0, weight);
    foreL.aim(-elbow, 0, 0, weight); foreR.aim(-elbow, 0, 0, weight);
    this.actor.root.rotation.y += 0.45 * weight;
  }

  /** Sample the same exercise trajectories once, including the hands, feet, head and torso. */
  framePoints(): GymFramePoint[] {
    const { head, body, legL, legR, foreL, foreR, shinL, shinR } = this.joints;
    const points: GymFramePoint[] = [], s = this.scale;
    const headHeight = this.actor.height - head.node.position.y;
    const point = (joint: Joint, y: number, z: number, radius: number) => {
      points.push({ at: new Vector3(0, y, z).applyMatrix4(joint.node.matrixWorld), radius });
    };
    const capture = () => {
      this.actor.root.updateWorldMatrix(true, true);
      point(head, headHeight * 0.42, 0.05 * s, Math.max(0.18 * s, headHeight * 0.64));
      point(body, this.hip + (this.joints.armL.node.position.y - this.hip) * 0.6, -0.09 * s, 0.26 * s);
      point(legL, 0, 0, 0.13 * s); point(legR, 0, 0, 0.13 * s);
      point(foreL, -this.hand, 0, 0.09 * s); point(foreR, -this.hand, 0, 0.09 * s);
      point(shinL, -this.lower + 0.065 * s, 0.065 * s, 0.15 * s);
      point(shinR, -this.lower + 0.065 * s, 0.065 * s, 0.15 * s);
    };
    this.reset();
    capture();
    for (const move of GYM_MOVES) for (const progress of FRAME_SAMPLES) {
      this.reset();
      this.apply(move, progress);
      capture();
    }
    this.reset();
    this.actor.root.updateWorldMatrix(true, true);
    return points;
  }
}
