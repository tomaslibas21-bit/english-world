import { Euler, Vector3, type Object3D } from "three";
import type { GyMoveId } from "../../content/gym";
import type { CharacterJoint, GameCharacter } from "../characters";
import { GYM_MOVES } from "./round";

const DEG = Math.PI / 180;
const JOINTS = ["body", "head", "armL", "armR", "foreL", "foreR", "legL", "legR", "shinL", "shinR"] as const;
const FRAME_SAMPLES = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

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

  constructor(private actor: GameCharacter) {
    this.all = JOINTS.map((name) => new Joint(actor.joint(name)));
    this.joints = Object.fromEntries(JOINTS.map((name, index) => [name, this.all[index]])) as Record<CharacterJoint, Joint>;
    const { legL, shinL, foreR } = this.joints;
    this.hip = legL.node.position.y;
    this.thigh = -shinL.node.position.y;
    this.lower = this.hip - this.thigh;
    this.upper = -foreR.node.position.y;
    this.hand = -actor.rightHand.position.y;
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

  private apply(move: GyMoveId, t: number) {
    const { body, head, armL, armR, foreL, foreR, legL, legR, shinL, shinR } = this.joints;
    const s = this.scale, toe = 0.185 * s;
    const weight = ease(t / 0.35) * ease((1 - t) / 0.4);
    switch (move) {
      case "jacks":
        body.move(0.12 * s * Math.sin(Math.PI * t) ** 2, 0, 1);
        legL.aim(0, 0, -24 * DEG, weight); legR.aim(0, 0, 24 * DEG, weight);
        shinL.aim(0, 0, 0, weight); shinR.aim(0, 0, 0, weight);
        armL.aim(0, 0, -150 * DEG, weight); armR.aim(0, 0, 150 * DEG, weight);
        foreL.aim(0, 0, 0, weight); foreR.aim(0, 0, 0, weight);
        break;
      case "toes": {
        const bend = 70 * DEG * weight;
        const knee = 6 * DEG * weight;
        body.aim(70 * DEG, 0, 0, weight);
        // The body joint is at floor height. Rotate around the hips, then keep the legs under them.
        body.move(this.hip * (1 - Math.cos(bend)) + this.hip * (Math.cos(knee) - 1) + toe * Math.sin(knee),
          -this.hip * Math.sin(bend) + (this.lower - this.thigh) * Math.sin(knee), 1);
        legL.aim(-76 * DEG, 0, 0, weight); legR.aim(-76 * DEG, 0, 0, weight);
        shinL.aim(12 * DEG, 0, 0, weight); shinR.aim(12 * DEG, 0, 0, weight);
        armL.aim(-30 * DEG, 0, -0.06, weight); armR.aim(-30 * DEG, 0, 0.06, weight);
        foreL.aim(-0.06, 0, 0, weight); foreR.aim(-0.06, 0, 0, weight);
        head.aim(0.14, 0, 0, weight);
        this.actor.root.rotation.y += 0.45 * weight;
        break;
      }
      case "squats": {
        const thigh = -72 * DEG, knee = 82 * DEG, shin = thigh + knee;
        body.move(this.thigh * (Math.cos(thigh) - 1) + this.lower * (Math.cos(shin) - 1) + toe * Math.sin(shin),
          this.thigh * Math.sin(thigh) + this.lower * Math.sin(shin), weight);
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
        body.move(0.06 * s * Math.abs(Math.cos(cycle)), 0, envelope);
        legL.aim(-38 * DEG * stride, 0, 0, envelope); legR.aim(38 * DEG * stride, 0, 0, envelope);
        shinL.aim(0.15 + Math.max(0, stride) * 0.98, 0, 0, envelope);
        shinR.aim(0.15 + Math.max(0, -stride) * 0.98, 0, 0, envelope);
        armL.aim(0.55 * stride, 0, -0.13, envelope); armR.aim(-0.55 * stride, 0, 0.13, envelope);
        foreL.aim(-1.3, 0, 0, envelope); foreR.aim(-1.3, 0, 0, envelope);
        break;
      }
      case "reach":
        body.move(0.05 * s, this.lower * Math.sin(25 * DEG), weight);
        legL.aim(0, 0, 0, weight); legR.aim(0, 0, 0, weight);
        shinL.aim(25 * DEG, 0, 0, weight); shinR.aim(25 * DEG, 0, 0, weight);
        armL.aim(-165 * DEG, 0, -0.04, weight); armR.aim(-165 * DEG, 0, 0.04, weight);
        foreL.aim(-0.12, 0, 0, weight); foreR.aim(-0.12, 0, 0, weight);
        break;
      case "lunges": {
        const front = -70 * DEG, knee = 75 * DEG, back = 33 * DEG;
        const hipY = this.thigh * Math.cos(front) + this.lower * Math.cos(front + knee) + toe * Math.sin(front + knee);
        const rearShin = Math.acos((hipY - this.thigh * Math.cos(back)) / Math.hypot(this.lower, toe)) + Math.atan2(toe, this.lower);
        body.move(hipY - this.hip, -0.015 * s, weight);
        legL.aim(front, 0, 0, weight); shinL.aim(knee, 0, 0, weight);
        legR.aim(back, 0, 0, weight); shinR.aim(rearShin - back, 0, 0, weight);
        armL.aim(-0.24, 0, -0.15, weight); armR.aim(-0.48, 0, 0.15, weight);
        foreL.aim(-0.8, 0, 0, weight); foreR.aim(-0.95, 0, 0, weight);
        this.actor.root.rotation.y += 0.45 * weight;
        break;
      }
      case "pushups":
        this.pushup(t);
        break;
    }
  }

  private pushup(t: number) {
    const { body, head, armL, armR, foreL, foreR, legL, legR, shinL, shinR } = this.joints;
    const weight = ease(t / 0.2) * ease((1 - t) / 0.3);
    const press = Math.sin(Math.PI * Math.max(0, Math.min(1, (t - 0.2) / 0.5))) ** 2;
    const s = this.scale, pitch = 80 * DEG;
    const toe = 0.185 * s, palm = 0.055 * s;
    const shoulder = armL.node.position.y - this.hip;
    // Hold the toe and palm marks in place while the shoulder lowers and the elbows fold.
    const hipHigh = palm + (this.upper + this.hand) * 0.94 - shoulder * Math.cos(pitch);
    const hipY = hipHigh - 0.12 * s * press;
    const tip = Math.atan2(toe, this.hip), reach = Math.hypot(this.hip, toe);
    const straight = Math.acos(Math.min(1, hipHigh / reach)) + tip;
    const legPitch = Math.acos(Math.min(1, hipY / reach)) + tip;
    const hipZ = 0.045 * s + reach * (Math.sin(legPitch - tip) - Math.sin(straight - tip));
    const down = hipY + shoulder * Math.cos(pitch) - palm;
    const forward = 0.078 * s + 0.045 * s - hipZ;
    const dx = Math.hypot(down, forward), a = this.upper, b = this.hand;
    const elbow = Math.acos(Math.max(-1, Math.min(1, (dx * dx - a * a - b * b) / (2 * a * b))));
    const upper = -Math.atan2(forward, down) + Math.atan2(b * Math.sin(elbow), a + b * Math.cos(elbow));
    const bend = pitch * weight;
    body.aim(pitch, 0, 0, weight);
    body.move((hipY - this.hip) * weight + this.hip * (1 - Math.cos(bend)), hipZ * weight - this.hip * Math.sin(bend), 1);
    head.aim(-0.22, 0, 0, weight);
    legL.aim(legPitch - pitch, 0, 0, weight); legR.aim(legPitch - pitch, 0, 0, weight);
    shinL.aim(0, 0, 0, weight); shinR.aim(0, 0, 0, weight);
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
