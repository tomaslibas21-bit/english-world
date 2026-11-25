// A character for the trial world styles: one skinned, vertex-coloured mesh (see builders.ts)
// on a small skeleton, animated like the original Character (walk / run / idle / talk / wave /
// sit, blinking) plus knees, elbows, a glance now and then and a swinging ponytail.
import * as THREE from "three";
import type { Look } from "../../content/npcs";
import type { Anim } from "./Character";
import type { CharacterJoint } from "./index";
import type { NaturalPoseDriver, NaturalRig } from "../talkNatural/contract";
import { applyPoolPose, type PoolPose } from "./poolPose";
import { OUTLINE_LAYER, outlineMaterial, addOutlineNormals, vertexColorMaterial } from "../style";
import { buildCharacter, BONE, BONE_COUNT, type CharSpec } from "./builders";

const JOINT = {
  body: BONE.body, head: BONE.head, armL: BONE.uArmL, armR: BONE.uArmR, foreL: BONE.fArmL, foreR: BONE.fArmR,
  legL: BONE.thighL, legR: BONE.thighR, shinL: BONE.shinL, shinR: BONE.shinR,
} satisfies Record<CharacterJoint, number>;

export class StyledCharacter {
  root = new THREE.Group();
  readonly rightHand = new THREE.Group();
  anim: Anim = "idle";
  poolPose?: PoolPose;
  talking = 0;
  /** A hop: how high the body is drawn off the ground (m), as the original Character. */
  lift = 0;
  private spec: CharSpec;
  private bones: THREE.Bone[] = [];
  private t = Math.random() * 10;
  private blinkT = 2 + Math.random() * 3;
  private glance = 0;
  private glanceTarget = 0;
  private glanceT = 3 + Math.random() * 5;
  private gestureSide = 1;
  private gestureT = 0;
  private browY = 0;
  private watchYaw = 0;
  private watchPitch = 0;
  declare talkPose?: NaturalPoseDriver;

  constructor(public look: Look) {
    const spec = (this.spec = buildCharacter(look));
    const j = spec.joints;
    for (let i = 0; i < BONE_COUNT; i++) this.bones.push(new THREE.Bone());
    const b = this.bones;
    const link = (child: number, parent: number, x: number, y: number, z: number) => { b[parent].add(b[child]); b[child].position.set(x, y, z); };
    link(BONE.body, BONE.root, 0, 0, 0);
    link(BONE.head, BONE.body, 0, j.neckTop, 0);
    link(BONE.eyes, BONE.head, 0, j.eyes[0] - j.neckTop, j.eyes[1]);
    link(BONE.mouth, BONE.head, 0, j.mouth[0] - j.neckTop, j.mouth[1]);
    link(BONE.brows, BONE.head, 0, j.brows[0] - j.neckTop, j.brows[1]);
    const tail = j.tail ?? [0, j.neckTop, 0];
    link(BONE.tail, BONE.head, tail[0], tail[1] - j.neckTop, tail[2]);
    link(BONE.uArmL, BONE.body, -j.shoulderX, j.shoulderY, 0);
    link(BONE.fArmL, BONE.uArmL, 0, -j.upper, 0);
    link(BONE.uArmR, BONE.body, j.shoulderX, j.shoulderY, 0);
    link(BONE.fArmR, BONE.uArmR, 0, -j.upper, 0);
    this.rightHand.position.set(0.025, -j.hand, 0.07);
    this.rightHand.rotation.x = 1.05;
    b[BONE.fArmR].add(this.rightHand);
    link(BONE.thighL, BONE.body, -j.hipX, j.hipY, 0);
    link(BONE.shinL, BONE.thighL, 0, -j.thigh, 0);
    link(BONE.thighR, BONE.body, j.hipX, j.hipY, 0);
    link(BONE.shinR, BONE.thighR, 0, -j.thigh, 0);
    this.browY = b[BONE.brows].position.y;

    const mesh = new THREE.SkinnedMesh(spec.geometry, vertexColorMaterial("character"));
    mesh.add(b[BONE.root]);
    mesh.updateMatrixWorld(true);
    const skeleton = new THREE.Skeleton(b);
    mesh.bind(skeleton);
    mesh.castShadow = true;
    // poses stay close to the bind pose: a fixed, generous bounding sphere (no per-frame skinning maths)
    mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, spec.height * 0.5, 0), spec.height * 0.8);
    this.root.add(mesh);
    // NPCs are rebuilt on every zone change: free the skeleton's bone texture when one leaves the scene
    // (three recreates it if the character is ever added again). The geometry is shared and cached.
    this.root.addEventListener("removed", () => skeleton.dispose());
    if (spec.outline) {
      addOutlineNormals(spec.geometry);
      const o = new THREE.SkinnedMesh(spec.geometry, outlineMaterial(spec.outline.color, spec.outline.thickness));
      o.bind(skeleton, mesh.bindMatrix);
      o.boundingSphere = mesh.boundingSphere;
      o.castShadow = false;
      o.layers.set(OUTLINE_LAYER);
      mesh.add(o);
    }
    this.pose(0);
  }

  /** Where the name tag goes (Game adds 0.45 above standing heads, −0.1 for seated ones). */
  get height() { return this.anim === "sit" ? this.spec.height - this.spec.sitDrop + 0.55 : this.spec.height; }

  joint(name: CharacterJoint): THREE.Object3D { return this.bones[JOINT[name]]; }

  setAnim(a: Anim) { if (a !== "wave" || !this.talkPose) this.anim = a; }
  talk(seconds: number) { if (!this.talkPose) this.talking = Math.max(this.talking, seconds); }

  naturalRig(): NaturalRig {
    const b = this.bones;
    return {
      body: b[BONE.body], head: b[BONE.head], upperL: b[BONE.uArmL], upperR: b[BONE.uArmR],
      foreL: b[BONE.fArmL], foreR: b[BONE.fArmR], thighL: b[BONE.thighL], thighR: b[BONE.thighR],
      shinL: b[BONE.shinL], shinR: b[BONE.shinR], eye: b[BONE.eyes], browL: b[BONE.brows],
      mouth: b[BONE.mouth], hair: b[BONE.tail], handLength: this.spec.joints.hand, carry: this.look.carry,
    };
  }

  canNoticeTalk() { return this.talking <= 0; }

  beginNaturalPose() { this.talking = 0; }

  get headJoint() { return this.bones[BONE.head]; }

  headPosition(out: THREE.Vector3) {
    return this.bones[BONE.head].getWorldPosition(out);
  }

  update(dt: number) {
    this.t += dt;
    this.pose(dt);
  }

  private pose(dt: number) {
    const pose = this.talkPose;
    pose?.advance(dt);
    if (pose && this.talkPose !== pose) return;
    const idle = pose && !pose.baseGaze && (pose.reduced || !pose.releasing) ? 0 : 1;
    const t = this.t, b = this.bones, M = this.spec.motion;
    const body = b[BONE.body], head = b[BONE.head];
    const uL = b[BONE.uArmL], fL = b[BONE.fArmL], uR = b[BONE.uArmR], fR = b[BONE.fArmR];
    const tL = b[BONE.thighL], sL = b[BONE.shinL], tR = b[BONE.thighR], sR = b[BONE.shinR];
    const walking = this.anim === "walk" || this.anim === "run", run = this.anim === "run";
    const sitting = this.anim === "sit";
    let legA = 0, kneeL = 0.04, kneeR = 0.04, armA = 0, bob = 0, lean = 0, nod = 0, turn = 0, tilt = 0, sway = 0, squash = 0;
    let elbowL = -0.2, elbowR = -0.2;
    const f = run ? 11 : 7.5;
    if (walking) {
      const amp = (run ? 0.8 : 0.55) * M.stride;
      const s = Math.sin(t * f), co = Math.cos(t * f);
      legA = s * amp;
      kneeL = Math.max(0, -co) * (run ? 1.3 : 0.8) + 0.06;
      kneeR = Math.max(0, co) * (run ? 1.3 : 0.8) + 0.06;
      armA = -legA * 0.9;
      bob = Math.abs(co) * M.bob * (run ? 1.3 : 1);
      squash = (Math.abs(co) - 0.6) * M.squash;
      lean = run ? 0.15 : 0.05;
      elbowL = elbowR = run ? -1.25 : -0.38;
      sway = s * 0.025;
    } else if (!sitting) {
      bob = Math.sin(t * 1.9) * 0.006 * idle;
      squash = Math.sin(t * 1.9) * M.squash * 0.15 * idle;
      sway = Math.sin(t * 0.7) * 0.018 * idle;
      // look around now and then
      this.glanceT -= dt;
      if (this.glanceT <= 0 && idle) {
        this.glanceTarget = this.glanceTarget ? 0 : (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random() * 0.35);
        this.glanceT = this.glanceTarget ? 1.2 + Math.random() : 3 + Math.random() * 5;
      }
      turn = Math.sin(t * 0.5) * 0.08 * idle;
    }
    if (walking || sitting) this.glanceTarget = 0;
    this.glance += (this.glanceTarget - this.glance) * Math.min(1, dt * 4);
    turn += this.glance * idle;

    // arms at rest hang slightly away from the body
    uL.rotation.set(armA, 0, -M.armOut);
    uR.rotation.set(-armA, 0, M.armOut);
    fL.rotation.set(elbowL, 0, 0);
    fR.rotation.set(elbowR, 0, 0);

    // talking: nods, eyebrows, the mouth moves and one hand gestures
    const mouth = b[BONE.mouth], brows = b[BONE.brows];
    if (pose) {
      mouth.scale.set(pose.mouth > 0 ? 1.06 - 0.46 * pose.roundness : 1, M.mouthIdle + pose.mouth * M.mouthOpen, 1);
      brows.position.y = this.browY;
    } else if (this.talking > 0) {
      this.talking -= dt;
      this.gestureT -= dt;
      if (this.gestureT <= 0) { this.gestureT = 2 + Math.random() * 2.5; this.gestureSide = Math.random() < 0.7 ? 1 : -1; }
      nod = Math.sin(t * 9) * 0.045;
      tilt = Math.sin(t * 1.3) * 0.05;
      mouth.scale.y = M.mouthIdle + Math.abs(Math.sin(t * 14)) * M.mouthOpen;
      brows.position.y = this.browY + Math.max(0, Math.sin(t * 4.2)) * M.browLift;
      const [u, fa] = this.gestureSide > 0 ? [uR, fR] : [uL, fL];
      u.rotation.x = -0.35 - Math.sin(t * 3) * 0.22;
      fa.rotation.x = -0.95 - Math.max(0, Math.sin(t * 3)) * 0.45;
    } else {
      mouth.scale.set(1, M.mouthIdle, 1);
      brows.position.y = this.browY;
    }
    if (!pose && this.anim === "wave") {
      uR.rotation.set(-0.1, 0, 2.55);
      fR.rotation.set(0, 0, 0.35 + Math.sin(t * 10) * 0.42);
    }
    if (sitting) {
      tL.rotation.set(-1.5, 0, -0.04); tR.rotation.set(-1.5, 0, 0.04);
      sL.rotation.set(1.45, 0, 0); sR.rotation.set(1.45, 0, 0);
      body.position.y = -this.spec.sitDrop + this.lift;
      if (this.talking <= 0 || this.gestureSide < 0) { uR.rotation.x = -0.4; fR.rotation.x = -0.85; }
      if (this.talking <= 0 || this.gestureSide > 0) { uL.rotation.x = -0.4; fL.rotation.x = -0.85; }
      body.rotation.set(0, 0, 0);
      body.scale.set(1, 1, 1);
    } else {
      tL.rotation.set(legA, 0, 0); tR.rotation.set(-legA, 0, 0);
      sL.rotation.set(kneeL, 0, 0); sR.rotation.set(kneeR, 0, 0);
      body.position.y = bob + this.lift;
      body.rotation.set(lean, 0, sway);
      const sy = 1 + squash, sxz = 1 / Math.sqrt(sy);
      body.scale.set(sxz, sy, sxz);
    }
    if (this.rightHand.children.length) {
      uR.rotation.set(-0.26 + uR.rotation.x * 0.17, 0, 0.18);
      fR.rotation.set(-0.79, 0, 0);
    }
    const watch = pose?.reduced ? null : pose?.watch;
    let watching = false;
    if (watch) {
      this.root.updateWorldMatrix(true, false);
      const m = this.root.matrixWorld.elements, x = watch.x - m[12], z = watch.z - m[14];
      const facing = Math.atan2(m[8], m[10]);
      const delta = Math.atan2(x, z) - facing;
      const yaw = Math.atan2(Math.sin(delta), Math.cos(delta));
      const distance = Math.hypot(x, z);
      watching = distance > 0.35 && Math.abs(yaw) < 1.9;
      const pitch = Math.atan2(m[13] + head.position.y + body.position.y - watch.y, distance);
      const k = Math.min(1, dt * (pose?.watchSpeed ?? 5.5));
      this.watchYaw += ((watching ? THREE.MathUtils.clamp(yaw, -0.95, 0.95) * 0.85 : 0) - this.watchYaw) * k;
      this.watchPitch += ((watching ? THREE.MathUtils.clamp(pitch, -0.4, 0.3) * 0.75 : 0) - this.watchPitch) * k;
      turn += this.watchYaw;
      nod += this.watchPitch;
    } else this.watchYaw = this.watchPitch = 0;
    head.rotation.set(nod, turn, tilt);
    if (this.poolPose) applyPoolPose(this.poolPose, body, head, uL, fL, uR, fR);
    // ponytail swings
    const tail = b[BONE.tail];
    tail.rotation.set(0.12 + lean * 1.5 + (walking ? Math.abs(Math.sin(t * f)) * 0.18 : Math.sin(t * 1.4) * 0.03 * idle), 0, walking ? Math.sin(t * f) * 0.16 : 0);
    // blinking (now and then twice)
    this.blinkT -= dt;
    const blink = pose ? Math.max(0, 1 - Math.abs(this.blinkT - 0.1) / 0.1) : Number(this.blinkT < 0.12);
    b[BONE.eyes].scale.y = 1 - blink * 0.9;
    if (this.blinkT < 0) this.blinkT = pose ? 2.2 + Math.random() * 4 : Math.random() < 0.18 ? 0.28 : 2.5 + Math.random() * 3.5;
    pose?.apply(walking || this.lift > 0 || !!this.poolPose && !pose.poolHead, blink, watching);
  }
}
