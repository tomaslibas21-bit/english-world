import { Euler, SkinnedMesh, Vector3, type Object3D } from "three";
import type { GyMoveId } from "../../content/gym";
import type { CharacterJoint, GameCharacter } from "../characters";
import { Character } from "../characters/Character";
import { IS_STORY, IS_TOON } from "../style";
import { GYM_STAGE } from "../world/gym";
import { GYM_MOVES } from "./round";

const DEG = Math.PI / 180;
const JOINTS = ["body", "head", "armL", "armR", "foreL", "foreR", "legL", "legR", "shinL", "shinR"] as const;
const FRAME_SAMPLES = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
const LUNGE_FRONT = -70 * DEG, LUNGE_KNEE = 75 * DEG, LUNGE_BACK = 33 * DEG;

function ease(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function plantedHeight(idle: number, weight: number) {
  const planted = Math.max(-0.014, Math.min(0.0135, idle));
  return idle + (planted - idle) * weight;
}

class Joint {
  private position = new Vector3();
  private rotation = new Euler();
  private scale = new Vector3();

  constructor(readonly node: Object3D) { this.capture(); }

  capture() {
    this.position.copy(this.node.position);
    this.rotation.copy(this.node.rotation);
    this.scale.copy(this.node.scale);
  }

  reset() {
    this.node.position.copy(this.position);
    this.node.rotation.copy(this.rotation);
    this.node.scale.copy(this.scale);
  }

  aim(x: number, y: number, z: number, weight: number) {
    const r = this.rotation;
    this.node.rotation.set(r.x + (x - r.x) * weight, r.y + (y - r.y) * weight, r.z + (z - r.z) * weight, r.order);
  }

  move(y: number, z: number, weight: number) {
    this.node.position.y = this.position.y + y * weight;
    this.node.position.z = this.position.z + z * weight;
  }

  reach(lift: number, inset: number, extension: number, weight: number) {
    this.node.position.x = this.position.x * (1 - inset * weight);
    this.node.position.y = this.position.y + lift * weight;
    this.node.scale.y = this.scale.y * (1 + extension * weight);
  }
}

export type GymFramePoint = { at: Vector3; radius: number };

/** Keep the styled shin's support vertices for the pitches and rolls used on the mat. */
function shoeProfile(mesh: SkinnedMesh, shin: Object3D) {
  const bone = mesh.skeleton.bones.findIndex((node) => node === shin);
  const inverse = mesh.skeleton.boneInverses[bone];
  const { position, skinIndex } = mesh.geometry.attributes;
  const vertices: Vector3[] = [];
  for (let i = 0; i < position.count; i++) {
    if (skinIndex.getX(i) === bone) {
      vertices.push(new Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.bindMatrix).applyMatrix4(inverse));
    }
  }
  const profile = new Set<Vector3>();
  for (let step = -4; step <= 8; step++) {
    const pitch = step * Math.PI / 16;
    const upY = Math.cos(pitch), upZ = -Math.sin(pitch);
    for (const upX of [-0.25, 0, 0.25]) {
      let lowest = Infinity, support = vertices[0];
      for (const vertex of vertices) {
        const y = upX * vertex.x + upY * vertex.y + upZ * vertex.z;
        if (y < lowest) { lowest = y; support = vertex; }
      }
      profile.add(support);
    }
  }
  return [...profile];
}

/** The soles are rigid with the shins. Blocks use the corners of their box sole. */
class Shoe {
  private readonly bottom: number;
  private readonly halfWidth: number;
  private readonly profile?: Vector3[];

  constructor(private readonly shin: Object3D, leg: Object3D, mesh?: SkinnedMesh) {
    this.bottom = shin.position.y - 0.05;
    this.halfWidth = 0.085 * Math.abs(leg.position.x) / 0.12;
    this.profile = mesh && shoeProfile(mesh, shin);
  }

  minY() {
    this.shin.updateWorldMatrix(true, false);
    const m = this.shin.matrixWorld.elements;
    return m[13] + this.supportOffset(m[1], m[5], m[9]);
  }

  supportOffset(upX: number, upY: number, upZ: number) {
    const profile = this.profile;
    if (!profile) {
      return this.bottom * upY + 0.05 * upZ - this.halfWidth * Math.abs(upX) - 0.14 * Math.abs(upZ);
    }
    let lowest = Infinity;
    for (let i = 0; i < profile.length; i++) {
      const { x, y, z } = profile[i];
      lowest = Math.min(lowest, x * upX + y * upY + z * upZ);
    }
    return lowest;
  }
}

function saveTransform(node: Object3D) {
  const position = node.position.clone(), rotation = node.rotation.clone(), scale = node.scale.clone(), visible = node.visible;
  return () => {
    node.position.copy(position);
    node.rotation.copy(rotation);
    node.scale.copy(scale);
    node.visible = visible;
  };
}

/** Blend exercises over the rig's current ordinary animation. */
export class GymPoseRig {
  private readonly joints: Record<CharacterJoint, Joint>;
  private readonly all: Joint[];
  private readonly home: (() => void)[] = [];
  private yaw = 0;
  private scale = 1;
  private readonly hip: number;
  private readonly thigh: number;
  private readonly lower: number;
  private readonly upper: number;
  private readonly hand: number;
  private readonly shoes: [Shoe, Shoe];
  private readonly lungeRearKnee: number;
  private readonly toeBend: number;
  private readonly palmClearance: number;
  private readonly reachLift: number;
  private readonly reachInset: number;
  private readonly reachExtension: number;

  constructor(private actor: GameCharacter) {
    this.all = JOINTS.map((name) => new Joint(actor.joint(name)));
    this.joints = Object.fromEntries(JOINTS.map((name, index) => [name, this.all[index]])) as Record<CharacterJoint, Joint>;
    actor.root.traverse((node) => {
      if (node !== actor.root) this.home.push(saveTransform(node));
    });
    const { legL, legR, shinL, shinR, foreR } = this.joints;
    this.hip = legL.node.position.y;
    this.thigh = -shinL.node.position.y;
    this.lower = this.hip - this.thigh;
    this.upper = -foreR.node.position.y;
    this.hand = -actor.rightHand.position.y;
    const blocks = actor instanceof Character;
    const mesh = blocks ? undefined : actor.root.children.find((node): node is SkinnedMesh => node instanceof SkinnedMesh);
    this.shoes = [new Shoe(shinL.node, legL.node, mesh), new Shoe(shinR.node, legR.node, mesh)];
    this.palmClearance = blocks ? 0.072 * legR.node.position.x / 0.12 : IS_TOON ? 0.088 : IS_STORY ? 0.066 : 0;
    this.lungeRearKnee = this.lungeKnee();
    // Longer-legged figures need a deeper knee bend for their hands to reach their toes.
    const reach = this.hip / (this.upper + this.hand);
    this.toeBend = Math.min(1, Math.max(0, (reach - 1.31) * 3.75));
    // Slightly lift the shoulders and keep the short-armed rigs' hands clear of the crown.
    this.reachLift = this.upper * (IS_TOON ? 0.44 : blocks ? 0.34 : 0.08);
    this.reachInset = blocks || IS_TOON ? 0.36 : 0.10;
    this.reachExtension = blocks ? 0.05 : IS_TOON ? 0.10 : 0;
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

  restore() {
    for (const restore of this.home) restore();
    this.actor.root.updateWorldMatrix(true, true);
  }

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
    const s = this.scale, turn = GYM_STAGE.turn;
    const weight = ease(t / 0.35) * ease((1 - t) / 0.4);
    const grounded = move !== "jacks" && move !== "circles";
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
        // Counter the hinge at the hips and knees to keep the shoes under the reach.
        body.move(0, -this.hip * Math.sin(hinge * weight)
          + this.thigh * Math.sin(thigh * weight) + this.lower * Math.sin(shin * weight), 1);
        legL.aim(thigh - hinge, 0, -0.18, weight); legR.aim(thigh - hinge, 0, 0.18, weight);
        shinL.aim(shin - thigh, 0, 0, weight); shinR.aim(shin - thigh, 0, 0, weight);
        const shoulderPitch = -(61 + 8 * bend) * DEG;
        const shoulderRoll = 0.12 - 0.42 * bend, elbowRoll = 0.62 * bend;
        armL.aim(shoulderPitch, 0, shoulderRoll, weight); armR.aim(shoulderPitch, 0, -shoulderRoll, weight);
        foreL.aim(-0.1, 0, elbowRoll, weight); foreR.aim(-0.1, 0, -elbowRoll, weight);
        head.aim(-0.14, 0, 0, weight);
        this.actor.root.rotation.y += turn.toes * weight;
        break;
      }
      case "squats": {
        const thigh = -72 * DEG, knee = 82 * DEG, shin = thigh + knee;
        body.move(0, this.thigh * Math.sin(thigh * weight) + this.lower * Math.sin(shin * weight), 1);
        legL.aim(thigh, 0, -0.06, weight); legR.aim(thigh, 0, 0.06, weight);
        shinL.aim(knee, 0, 0, weight); shinR.aim(knee, 0, 0, weight);
        armL.aim(-Math.PI / 2, 0, -0.05, weight); armR.aim(-Math.PI / 2, 0, 0.05, weight);
        foreL.aim(-0.06, 0, 0, weight); foreR.aim(-0.06, 0, 0, weight);
        this.actor.root.rotation.y += turn.squats * weight;
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
        armL.reach(this.reachLift, this.reachInset, this.reachExtension, weight);
        armR.reach(this.reachLift, this.reachInset, this.reachExtension, weight);
        armL.aim(-177 * DEG, 0, -0.18, weight); armR.aim(-177 * DEG, 0, 0.18, weight);
        foreL.aim(-0.04, 0, 0, weight); foreR.aim(-0.04, 0, 0, weight);
        break;
      case "lunges":
        body.aim(0, 0, 0, weight);
        body.move(0, -0.015 * s, weight);
        legL.aim(LUNGE_FRONT, 0, 0, weight); shinL.aim(LUNGE_KNEE, 0, 0, weight);
        legR.aim(LUNGE_BACK, 0, 0, weight); shinR.aim(this.lungeRearKnee, 0, 0, weight);
        armL.aim(-0.24, 0, -0.15, weight); armR.aim(-0.48, 0, 0.15, weight);
        foreL.aim(-0.8, 0, 0, weight); foreR.aim(-0.95, 0, 0, weight);
        this.actor.root.rotation.y += turn.lunges * weight;
        break;
      case "pushups":
        this.pushup(t, floor);
        return;
    }
    if (grounded) body.node.position.y += plantedHeight(floor, weight) - this.supportY();
  }

  private pushup(t: number, floor: number) {
    const { body, head, armL, armR, foreL, foreR, legL, legR, shinL, shinR } = this.joints;
    const weight = ease(t / 0.2) * ease((1 - t) / 0.3);
    const press = Math.sin(Math.PI * Math.max(0, Math.min(1, (t - 0.2) / 0.5))) ** 2;
    const s = this.scale, pitch = 80 * DEG;
    const toe = 0.185 * s, palm = Math.max(0.061 * s, this.palmClearance);
    const shoulder = armL.node.position.y - this.hip;
    const hipHigh = palm + (this.upper + this.hand) * 0.94 - shoulder * Math.cos(pitch);
    const hipY = hipHigh - 0.12 * Math.max(1, s) * press;
    const tip = Math.atan2(toe, this.hip), reach = Math.hypot(this.hip, toe);
    const straight = Math.acos(Math.min(1, hipHigh / reach)) + tip;
    const legPitch = Math.acos(Math.min(1, hipY / reach)) + tip;
    const hipZ = 0.045 * s + reach * (Math.sin(legPitch - tip) - Math.sin(straight - tip));
    body.aim(pitch, 0, 0, weight);
    body.move(0, hipZ * weight - this.hip * Math.sin(pitch * weight), 1);
    head.aim(-0.22, 0, 0, weight);
    legL.aim(legPitch - pitch, 0, 0, weight); legR.aim(legPitch - pitch, 0, 0, weight);
    shinL.aim(0, 0, 0, weight); shinR.aim(0, 0, 0, weight);
    // Keep the loaded toes near the world floor, then return to the idle sole height.
    const lift = plantedHeight(floor, weight) - this.supportY();
    const matrix = body.node.matrixWorld.elements;
    body.node.position.y += lift;
    const down = matrix[13] + lift + matrix[5] * armL.node.position.y - palm;
    const forward = 0.078 * s + 0.045 * s - hipZ;
    const dx = Math.hypot(down, forward), a = this.upper, b = this.hand;
    const elbow = Math.acos(Math.max(-1, Math.min(1, (dx * dx - a * a - b * b) / (2 * a * b))));
    const upper = -Math.atan2(forward, down) + Math.atan2(b * Math.sin(elbow), a + b * Math.cos(elbow));
    armL.aim(upper - pitch, 0, 0, weight); armR.aim(upper - pitch, 0, 0, weight);
    foreL.aim(-elbow, 0, 0, weight); foreR.aim(-elbow, 0, 0, weight);
    this.actor.root.rotation.y += GYM_STAGE.turn.pushups * weight;
  }

  /** Sample extremities on entry. The stage reuses these bounds when the dock changes. */
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
