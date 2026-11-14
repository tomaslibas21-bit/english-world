// The surf lesson in the town's sea: the learner on a board, the waves coming in, the instructor on hers, and where
// the camera stands for each part of it. The rules are logic.ts (what is said when, what must be done by when); this
// file shows them: it puts the player and the boards on the water (water.ts: the sea's level and its swell), lifts
// them over each wave, and keeps the camera where the learner sees what the command is about.
import * as THREE from "three";
import { SEA_LEVEL, SWELL_GLSL, floorY, swell } from "../water";
import { colourMerge } from "../world/util";
import { STYLED, vertexColorMaterial } from "../style";
import { createCharacter, type GameCharacter } from "../characters";
import type { Look } from "../../content/npcs";
import type { SurfSpot } from "../world/surf";
import { BOARDS, surfboardParts, type BoardKind } from "./shapes";
import { SurfLogic, type Level, type Pose, type SurfInput, type Wave } from "./logic";

/** A wave's shape across its travel (m): its front face (towards the beach) and its back. */
const FRONT = 2.4, BACK = 5;
/** How wide a wave's mesh is along the beach (m), and the height of the board's deck over the water. */
const WIDE = 96, DECK = 0.05;
/** The crest as drawn is this far (m) towards the beach of where the rules have it: the rider (1.2 m ahead of it
 *  there) stands high on its face, in sight over the crest from the camera behind. */
const AHEAD = 0.5;
const sstep = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
/** A wave's height at `s` m from its crest (s < 0: in front of it, towards the beach), 0–1. */
export const waveProfile = (s: number) => (s < 0 ? 1 - sstep(0, FRONT, -s) : 1 - sstep(0, BACK, s));
/** How much of its height a wave still has `d` m from the waterline: it dies on the sand. */
export const waveReach = (d: number) => sstep(0.5, 7, d);
const turnTo = (from: number, to: number, max: number) => { let d = ((to - from + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; d = Math.max(-max, Math.min(max, d)); return from + d; };

export interface SurfSceneHost {
  player: GameCharacter;
  /** Drops thrown up from the water (Game's Splashes). */
  splash(x: number, y: number, z: number, dx: number, dz: number, k: number): void;
  /** A phone held upright: the camera stands further back. */
  portrait(): boolean;
}

export class Surf {
  group = new THREE.Group();
  logic: SurfLogic | null = null;
  /** Where the camera should stand and what it should look at now (Game puts it there: camera.ts "stage"). */
  cam = { pos: new THREE.Vector3(), look: new THREE.Vector3(), rate: 3 };
  /** The instructor in the water (built for the first lesson). */
  coach: GameCharacter | null = null;
  /** Which way the learner faces (Game's headings: 0 the beach, π the sea). */
  heading = Math.PI;
  private mat: THREE.Material;
  private boards = new Map<BoardKind, THREE.Mesh>();
  private display: THREE.Mesh[] = [];
  private coachBoard: THREE.Mesh | null = null;
  private waves: { mesh: THREE.Mesh; u: Record<string, { value: any }> }[] = [];
  private stroke = 0;
  private strokeTo = 0;
  private lastPose: Pose = "walk";
  private poseK = 1;
  private sprayT = 0;
  private lost = new THREE.Vector3();
  private lostRot = 0;
  private flip = 0;
  private popT = 9;

  constructor(private spot: SurfSpot, private host: SurfSceneHost) {
    this.mat = STYLED ? vertexColorMaterial("prop") : new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    this.group.visible = false;
  }

  get active() { return !!this.logic; }
  /** The learner's place on the sand as the lesson begins (and the instructor's, facing them). */
  get beach() { const z = this.spot.z + 1.7; return { x: this.spot.x - 1.3, z, coachX: this.spot.x + 0.3, coachZ: z - 0.1 }; }

  private boardMesh(kind: BoardKind) {
    let m = this.boards.get(kind);
    if (!m) {
      const b = BOARDS[kind];
      m = new THREE.Mesh(colourMerge(surfboardParts(b.len, b.wid, b.deck, b.stripe, b.thick)), this.mat);
      m.castShadow = true;
      m.rotation.order = "YXZ";
      this.boards.set(kind, m);
      this.group.add(m);
    }
    return m;
  }

  private build(coachLook: Look) {
    if (this.coach) return;
    this.coach = createCharacter(coachLook);
    this.coach.fidgets = false;
    this.group.add(this.coach.root);
    const cb = BOARDS.long;
    this.coachBoard = new THREE.Mesh(colourMerge(surfboardParts(2.3, 0.52, "#ff6b6b", "#fff7e6", cb.thick)), this.mat);
    this.coachBoard.rotation.order = "YXZ";
    this.group.add(this.coachBoard);
    // the three boards to choose from, stood in the sand behind the two of them, their decks to the sea
    (["long", "short", "sup"] as BoardKind[]).forEach((kind, i) => {
      const b = BOARDS[kind];
      const parts = surfboardParts(b.len, b.wid, b.deck, b.stripe, b.thick);
      for (const [g] of parts) g.translate(0, 0, b.len / 2).rotateX(-Math.PI / 2).rotateX(-0.09);
      const m = new THREE.Mesh(colourMerge(parts), this.mat);
      m.castShadow = true;
      // (the long one between the two of them, the others either side)
      const x = this.spot.x + [-0.5, -2.9, 1.9][i], z = this.spot.z + 3.2;
      m.position.set(x, floorY(x, z) - 0.12, z);
      this.display.push(m);
      this.group.add(m);
    });
    // the waves: one strip of water each, lifted into a wave's shape in its shader, the sea's own swell under it
    const geo = new THREE.PlaneGeometry(WIDE, FRONT + BACK + 0.6, 56, 26).rotateX(-Math.PI / 2).translate(0, 0, (FRONT - BACK) / 2);
    for (let i = 0; i < 4; i++) {
      const u = {
        uTime: { value: 0 }, uH: { value: 0 }, uWhite: { value: 0 }, uFade: { value: 1 },
        uFace: { value: new THREE.Color(this.spot.face) }, uDeep: { value: new THREE.Color(this.spot.deep) }, uFoam: { value: new THREE.Color("#fbfdf9") },
      };
      const mat = new THREE.ShaderMaterial({
        uniforms: u, transparent: true,
        vertexShader: `uniform float uTime; uniform float uH; varying float vP; varying float vE; varying float vZ; varying vec3 vW;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            float z = position.z;
            float p = z > 0.0 ? 1.0 - smoothstep(0.0, ${FRONT.toFixed(2)}, z) : 1.0 - smoothstep(0.0, ${BACK.toFixed(2)}, -z);
            float e = 1.0 - smoothstep(${(WIDE * 0.3).toFixed(1)}, ${(WIDE * 0.5).toFixed(1)}, abs(position.x));
            // (its crest a little uneven along the beach)
            float n = 0.95 + 0.05 * sin(w.x * 0.33 + uTime * 0.7);
            w.y += ${SWELL_GLSL} + uH * p * e * n;
            vP = p; vE = e; vZ = z; vW = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: `uniform float uTime; uniform float uWhite; uniform float uFade; uniform vec3 uFace; uniform vec3 uDeep; uniform vec3 uFoam;
          varying float vP; varying float vE; varying float vZ; varying vec3 vW;
          void main() {
            vec3 c = mix(uDeep, uFace, smoothstep(0.08, 0.95, vP));
            // the light through its lip, streaks running up its face
            c += vec3(0.09, 0.13, 0.09) * smoothstep(0.72, 1.0, vP);
            c += vec3(0.05) * (0.5 + 0.5 * sin(vW.x * 3.1 + sin(vP * 9.0 + uTime * 2.0) * 1.2)) * vP;
            float lace = sin(vW.x * 2.3 + sin(vW.z * 3.1 + uTime * 1.6) * 1.4) * sin(vW.z * 2.9 - uTime * 2.3 + sin(vW.x * 1.7) * 1.2);
            float front = step(0.0, vZ);
            // foam: along the lip; a broken wave is foam down its whole front, and trails it behind
            float lip = smoothstep(0.84, 0.96, vP + lace * 0.06);
            float churn = smoothstep(-0.35, 0.5, lace + (vP - 0.35) * 1.6) * smoothstep(0.03, 0.22, vP);
            float trail = smoothstep(0.35, 0.9, vP) * (0.55 + 0.45 * lace);
            float foam = max(lip * (0.55 + 0.45 * uWhite), uWhite * mix(trail, churn, front));
            c = mix(c, uFoam, clamp(foam, 0.0, 0.97));
            gl_FragColor = vec4(c, smoothstep(0.01, 0.16, vP) * vE * uFade);
          }`,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      mesh.renderOrder = 2;
      mesh.visible = false;
      this.waves.push({ mesh, u });
      this.group.add(mesh);
    }
  }

  /** A lesson begins: `logic` runs it; the instructor (her look) is in the water for it. */
  begin(logic: SurfLogic, coachLook: Look) {
    this.build(coachLook);
    this.logic = logic;
    this.group.visible = true;
    this.heading = Math.PI / 2;
    this.stroke = this.strokeTo = 0;
    this.lastPose = "walk"; this.poseK = 1; this.flip = 0; this.popT = 9;
    for (const m of this.display) m.visible = true;
    for (const m of this.boards.values()) m.visible = false;
    this.frame(0, 0, true);
  }

  /** The lesson is over: the sea as it was, the player's pose their own again. */
  end() {
    this.logic = null;
    this.group.visible = false;
    const p = this.host.player;
    if (p.surf) Object.assign(p.surf, { prone: 0, stance: 0, crouch: 0, pitch: 0, wobble: 0, straddle: 0 });
    p.swim = 0; p.flip = 0; p.lift = 0; p.bank = 0;
    p.root.rotation.order = "XYZ";
    p.setAnim("idle");
  }

  /** Something the rules set off (SurfHost.fx): what it looks like. */
  fx(name: string, t: number) {
    const L = this.logic, p = this.host.player.root.position;
    if (!L) return;
    const y = SEA_LEVEL + swell(p.x, p.z, t);
    if (name === "stroke") { this.strokeTo += 1; this.host.splash(p.x + Math.sin(this.heading) * 0.5, y, p.z + Math.cos(this.heading) * 0.5, -Math.sin(this.heading), -Math.cos(this.heading), 0.18); }
    else if (name === "duck" || name === "tumble") this.host.splash(p.x, y, p.z, 0, 0, name === "duck" ? 0.6 : 1);
    else if (name === "pop") { this.popT = 0; this.host.splash(p.x, y, p.z, 0, 0, 0.5); }
    else if (name === "flip") this.flip = 1;
    else if (name === "wipeout") {
      this.host.splash(p.x, y, p.z, 0, 0, 1);
      this.lost.copy(p); this.lostRot = this.heading;
    }
  }

  /** How high the waves lift the water `d` m out. */
  private lift(d: number, waves: Wave[]) {
    let h = 0;
    for (const w of waves) h += w.h * waveReach(w.d) * waveProfile(d - w.d + AHEAD);
    return h;
  }

  /** A frame: the rules take a step (unless `paused`), and everything is put where they say. */
  update(dt: number, t: number, inp: SurfInput, paused = false) {
    const L = this.logic;
    if (!L) return;
    if (!paused) L.step(dt, inp);
    this.frame(dt, t, false);
  }

  private frame(dt: number, t: number, snap: boolean) {
    const L = this.logic!, S = this.spot, pl = this.host.player, pp = pl.root.position;
    const sf = pl.surf;
    const onBeach = L.phase === "intro" || L.phase === "board";
    const B = this.beach;
    // --- where the learner is, and which way they face
    const x = onBeach ? B.x : S.x - L.x, z = onBeach ? B.z : S.z - L.d;
    const want = onBeach ? Math.PI / 2 : L.facing === "out" ? Math.PI : 0;
    this.heading = snap ? want : turnTo(this.heading, want, dt * 4.2);
    const sea = SEA_LEVEL + swell(x, z, t), up = onBeach ? 0 : this.lift(L.d, L.waves);
    const water = sea + up;
    // the wave's slope under the board (its nose down the face)
    const slope = onBeach ? 0 : (this.lift(L.d - 0.5, L.waves) - this.lift(L.d + 0.5, L.waves));
    const fwd = Math.cos(this.heading); // +1 facing the beach, −1 the sea
    const pose = L.pose;
    if (pose !== this.lastPose) { this.lastPose = pose; this.poseK = 0; }
    this.poseK = Math.min(1, this.poseK + dt / 0.35);
    const k = snap ? 1 : this.poseK * this.poseK * (3 - 2 * this.poseK);
    const ease = (cur: number, to: number) => (snap ? to : cur + (to - cur) * Math.min(1, dt * 9));
    this.stroke = ease(this.stroke, this.strokeTo);
    this.popT += dt;
    let y = water + DECK, pitch = 0, roll = 0;
    const board = L.board ? this.boardMesh(L.board) : null;
    for (const [kind, m] of this.boards) m.visible = !!board && kind === L.board;
    for (const m of this.display) m.visible = onBeach || L.phase === "over";
    if (sf) {
      sf.prone = ease(sf.prone, pose === "prone" || pose === "duck" ? 1 : 0);
      sf.stance = ease(sf.stance, pose === "stand" ? 1 : 0);
      sf.straddle = pose === "sit" ? 1 : 0;
      sf.crouch = L.crouch; sf.pitch = L.pitch; sf.wobble = L.wobble;
      sf.stroke = this.stroke;
    }
    pl.swim = ease(pl.swim ?? 0, pose === "swim" && L.fallT > 0.7 ? 1 : 0);
    pl.moveSpeed = pose === "swim" ? 0.2 : 0;
    pl.setAnim(pose === "sit" ? "sit" : "idle");
    pl.root.rotation.order = "YXZ";
    let bx = x, bz = z, by = water - 0.02, bPitch = -Math.atan(slope) * fwd * -1, bRoll = 0, bYaw = this.heading;
    if (pose === "walk") {
      // on their feet: on the sand, or in the shallows where the wave set them down
      y = Math.max(floorY(x, z), onBeach ? -9 : floorY(x, z));
      if (board) { bx = x + 0.75; bz = z + 0.2; by = Math.max(floorY(bx, bz) + 0.02, onBeach ? -9 : sea - 0.02); bPitch = 0; bYaw = this.heading + 0.4; }
    } else if (pose === "prone" || pose === "duck") {
      // lying on it, the chest a third of the way back from the nose; a duck takes both under, nose first
      const dip = pose === "duck" || L.duckT > 0 ? Math.sin(Math.PI * Math.max(0, Math.min(1, 1 - L.duckT))) : 0;
      y = water + DECK - dip * 0.75;
      pitch = -Math.atan(slope) * fwd + dip * 0.5 * (L.duckT > 0.5 ? 1 : -0.4);
      bx = x - Math.sin(this.heading) * 0.35; bz = z - Math.cos(this.heading) * 0.35; by = y - DECK - 0.02; bPitch = pitch;
    } else if (pose === "sit") {
      pl.seatY = 0.02;
      y = water + DECK + Math.sin(t * 1.3) * 0.02;
      bx = x + Math.sin(this.heading) * 0.2; bz = z + Math.cos(this.heading) * 0.2; by = y - DECK - 0.03; bPitch = -0.1;
    } else if (pose === "stand") {
      // up: a little hop onto the feet, then the board's lean is the learner's
      const hop = this.popT < 0.4 ? Math.sin((this.popT / 0.4) * Math.PI) * 0.22 : 0;
      roll = L.lean * 0.3 + L.wobble * Math.sin(t * 9) * 0.12;
      pitch = -Math.atan(slope) * fwd * 0.55 + L.pitch * 0.1 - L.crouch * 0.02;
      y = water + DECK + (board ? BOARDS[L.board!].thick : 0) - 0.03 + hop;
      by = water - 0.01; bPitch = pitch; bRoll = roll;
      // spray off the tail
      this.sprayT -= dt;
      if (this.sprayT <= 0 && !snap) { this.sprayT = 0.11; this.host.splash(x - Math.sin(this.heading) * 1.1, water, z - Math.cos(this.heading) * 1.1, -Math.sin(this.heading) * 0.6 + L.lean, -Math.cos(this.heading) * 0.6, 0.12 + Math.abs(L.lean) * 0.25); }
    } else if (pose === "swim") {
      // off it: thrown clear in a tumble, then afloat beside the board, which drifts in on its own
      const ft = Math.max(0, L.fallT), air = Math.min(1, ft / 0.7);
      const tall = pl.height / 1.75;
      const floatY = sea - 1.2 * tall + 0.04;
      y = ft < 0.7 ? water + DECK + Math.sin(air * Math.PI) * 0.7 * (1 - air) + (floatY - water - DECK) * air * air : floatY;
      pl.flip = ft < 0.7 ? air * Math.PI * 2 : 0;
      this.lost.z += dt * 1.1; this.lostRot += dt * 0.7;
      bx = this.lost.x + 1.2; bz = Math.min(S.z - 1, this.lost.z + 0.8); by = SEA_LEVEL + swell(bx, bz, t) - 0.02; bYaw = this.lostRot; bPitch = 0;
    }
    if (pose !== "swim") pl.flip = this.flip > 0 ? (1 - this.flip) * Math.PI * 2 : 0;
    if (this.flip > 0) { this.flip = Math.max(0, this.flip - dt / 0.75); y += Math.sin((1 - this.flip) * Math.PI) * 0.55; }
    // (a change of pose glides: lying down, sitting up, getting to the feet)
    pp.set(x, snap ? y : pp.y + (y - pp.y) * (k < 1 ? Math.min(1, dt * 12) : 1), z);
    pl.root.rotation.set(pitch, this.heading, roll);
    pl.bank = 0;
    if (board) {
      board.position.set(bx, by, bz);
      board.rotation.set(bPitch, bYaw, bRoll);
    }
    // --- the instructor: beside the learner on the sand; then on her board at the line-up, turned to them
    const c = this.coach!, cb = this.coachBoard!;
    if (onBeach) {
      c.setAnim("idle");
      c.root.position.set(B.coachX, floorY(B.coachX, B.coachZ), B.coachZ);
      c.root.rotation.set(0, -Math.PI / 2, 0);
      cb.visible = false;
    } else {
      const cx = S.x + 4.6, cd = L.cfg.lineup + 1.6, cz = S.z - cd;
      const cy = SEA_LEVEL + swell(cx, cz, t) + this.lift(cd, L.waves);
      c.seatY = 0.02;
      if (c.surf) c.surf.straddle = 1;
      c.setAnim("sit");
      const face = Math.atan2(x - cx, z - cz);
      c.root.position.set(cx, cy + DECK + Math.sin(t * 1.1 + 1) * 0.02, cz);
      c.root.rotation.set(0, face, 0);
      cb.visible = true;
      cb.position.set(cx + Math.sin(face) * 0.2, cy - 0.03, cz + Math.cos(face) * 0.2);
      cb.rotation.set(-0.1, face, 0);
    }
    if (c.watch !== undefined) { c.watch = (c.watch ?? new THREE.Vector3()).set(pp.x, pp.y + 1.2, pp.z); c.steady = true; }
    c.update(dt);
    // --- the waves
    this.waves.forEach((wv, i) => {
      const w = L.waves[i];
      wv.mesh.visible = !!w;
      if (!w) return;
      wv.mesh.position.set(S.x, SEA_LEVEL, S.z - w.d + AHEAD);
      wv.u.uTime.value = t;
      wv.u.uH.value = w.h * waveReach(w.d);
      wv.u.uWhite.value = w.white ? 1 : sstep(9, 3, w.d);
      wv.u.uFade.value = sstep(-2.5, 1.5, w.d);
    });
    // --- the camera
    const tall = this.host.portrait(), far = tall ? 1.35 : 1;
    const C = this.cam;
    if (onBeach) {
      // from the water's side: the two of them, the boards behind them, the town beyond
      C.pos.set(S.x + 0.2, 1.9, B.z - 5.6 * far); C.look.set(S.x + 0.25, 1.15, B.z + 1.5); C.rate = 3;
    } else if (L.phase === "catch") {
      // from the side: the wave coming up behind them
      C.pos.set(x - 7.2 * far, 2.3, z + 1.4); C.look.set(x, 0.7, z - (tall ? 0.9 : 2.6)); C.rate = 2.6;
    } else if (L.phase === "ride") {
      // behind and above, over the wave's crest: left is left, the beach ahead
      C.pos.set(x * 0.8 + S.x * 0.2, 3.5, z - 6.3 * far); C.look.set(x, 0.9, z + 7); C.rate = 3.2;
    } else if (L.phase === "fall" || L.phase === "ask" || L.phase === "again" || L.phase === "over") {
      // from the sea's side, close: the learner in the water, the beach behind them
      C.pos.set(x - 2.4, 2.0, z - 5.4 * far); C.look.set(x + 0.3, 0.75, z + 1.5); C.rate = 2.2;
    } else {
      // paddling out, waiting: from behind, towards the sea and what comes in from it (the instructor to the right)
      C.pos.set(x - 1.4, 3.3, z + 6.6 * far); C.look.set(x + 1.2, 0.4, z - 9); C.rate = 2.6;
    }
  }
}
