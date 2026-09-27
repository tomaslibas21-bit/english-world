// A character for the trial world styles: one skinned, vertex-coloured mesh (see builders.ts)
// on a small skeleton, animated like the original Character (walk / run / idle / talk / wave /
// sit, blinking) plus knees, elbows, a glance now and then and a swinging ponytail.
import * as THREE from "three";
import type { Look } from "../../content/npcs";
import type { Anim } from "./Character";
import { OUTLINE_LAYER, outlineMaterial, addOutlineNormals, vertexColorMaterial } from "../style";
import { buildCharacter, BONE, BONE_COUNT, type CharSpec } from "./builders";

export class StyledCharacter {
  root = new THREE.Group();
  anim: Anim = "idle";
  talking = 0;
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

  setAnim(a: Anim) { this.anim = a; }
  talk(seconds: number) { this.talking = Math.max(this.talking, seconds); }

  update(dt: number) {
    this.t += dt;
    this.pose(dt);
  }

  private pose(dt: number) {
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
      bob = Math.sin(t * 1.9) * 0.006;
      squash = Math.sin(t * 1.9) * M.squash * 0.15;
      sway = Math.sin(t * 0.7) * 0.018;
      // look around now and then
      this.glanceT -= dt;
      if (this.glanceT <= 0) {
        this.glanceTarget = this.glanceTarget ? 0 : (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random() * 0.35);
        this.glanceT = this.glanceTarget ? 1.2 + Math.random() : 3 + Math.random() * 5;
      }
      turn = Math.sin(t * 0.5) * 0.08;
    }
    if (walking || sitting) this.glanceTarget = 0;
    this.glance += (this.glanceTarget - this.glance) * Math.min(1, dt * 4);
    turn += this.glance;

    // arms at rest hang slightly away from the body
    uL.rotation.set(armA, 0, -M.armOut);
    uR.rotation.set(-armA, 0, M.armOut);
    fL.rotation.set(elbowL, 0, 0);
    fR.rotation.set(elbowR, 0, 0);

    // talking: nods, eyebrows, the mouth moves and one hand gestures
    const mouth = b[BONE.mouth], brows = b[BONE.brows];
    if (this.talking > 0) {
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
      mouth.scale.y = M.mouthIdle;
      brows.position.y = this.browY;
    }
    if (this.anim === "wave") {
      uR.rotation.set(-0.1, 0, 2.55);
      fR.rotation.set(0, 0, 0.35 + Math.sin(t * 10) * 0.42);
    }
    if (sitting) {
      tL.rotation.set(-1.5, 0, -0.04); tR.rotation.set(-1.5, 0, 0.04);
      sL.rotation.set(1.45, 0, 0); sR.rotation.set(1.45, 0, 0);
      body.position.y = -this.spec.sitDrop;
      if (this.talking <= 0 || this.gestureSide < 0) { uR.rotation.x = -0.4; fR.rotation.x = -0.85; }
      if (this.talking <= 0 || this.gestureSide > 0) { uL.rotation.x = -0.4; fL.rotation.x = -0.85; }
      body.rotation.set(0, 0, 0);
      body.scale.set(1, 1, 1);
    } else {
      tL.rotation.set(legA, 0, 0); tR.rotation.set(-legA, 0, 0);
      sL.rotation.set(kneeL, 0, 0); sR.rotation.set(kneeR, 0, 0);
      body.position.y = bob;
      body.rotation.set(lean, 0, sway);
      const sy = 1 + squash, sxz = 1 / Math.sqrt(sy);
      body.scale.set(sxz, sy, sxz);
    }
    head.rotation.set(nod, turn, tilt);
    // ponytail swings
    const tail = b[BONE.tail];
    tail.rotation.set(0.12 + lean * 1.5 + (walking ? Math.abs(Math.sin(t * f)) * 0.18 : Math.sin(t * 1.4) * 0.03), 0, walking ? Math.sin(t * f) * 0.16 : 0);
    // blinking (now and then twice)
    this.blinkT -= dt;
    b[BONE.eyes].scale.y = this.blinkT < 0.12 ? 0.1 : 1;
    if (this.blinkT < 0) this.blinkT = Math.random() < 0.18 ? 0.28 : 2.5 + Math.random() * 3.5;
  }
}
