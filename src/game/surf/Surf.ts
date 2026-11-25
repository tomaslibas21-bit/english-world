// The surf lesson in the town's sea: the learner on a board, the waves coming in, the instructor on hers, and where
// the camera stands for each part of it. The rules are logic.ts (what is said when, what must be done by when); this
// file shows them: it puts the player and the boards on the water (water.ts: the sea's level and its swell), lifts
// them over each wave, and keeps the camera where the learner sees what the command is about.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { SEA_LEVEL, SWELL_GLSL, floorY, swell } from "../water";
import { audio } from "../audio";
import type { CameraRig } from "../camera";
import { colourMerge } from "../world/util";

import { Character } from "../characters/Character";
import type { GameCharacter } from "../characters";
import type { Look } from "../../content/npcs";
import type { SurfSpot } from "../world/surf";
import { BOARDS, surfboardParts, type BoardKind, type Part } from "./shapes";
import type { SurfLogic, Pose, SurfInput, Wave } from "./logic";
import {
  AHEAD, BACK, FRONT, RIDE_FORWARD, WIDE, WAVE_GLSL, sstep,
  waveChop, waveChopSlope, waveEdge, waveEdgeSlope, waveFaceSlope, waveHeight, waveLip, waveProfile, waveReach, waveSweep, waveSweepSlope,
} from "./wave";

const DECK = 0.05, COACH_THICK = BOARDS.long.thick;
const DEMO_WIDTH = 11, DEMO_STAND = 1.5, DEMO_LAND = 5.6, DEMO_END = 6.4;
const TRIM_HEADING = 0.92, BOARD_FLOAT = 0.025;
type SceneWave = Pick<Wave, "d" | "h" | "white">;
type WaveUniforms = Record<"uTime" | "uH" | "uWhite" | "uFade" | "uWidth", { value: number }>
  & { uShoulder: { value: THREE.Vector2 } };
const turnTo = (from: number, to: number, max: number) => { let d = ((to - from + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; d = Math.max(-max, Math.min(max, d)); return from + d; };

type WaterSample = { y: number; slope: number; slopeX: number };
type Tilt = { pitch: number; roll: number };
function faceTilt(out: Tilt, { slope, slopeX }: WaterSample, heading: number) {
  const along = slope * Math.cos(heading) - slopeX * Math.sin(heading);
  const across = slope * Math.sin(heading) + slopeX * Math.cos(heading);
  out.pitch = Math.atan(along);
  out.roll = Math.atan2(across, Math.hypot(1, along));
}

/** Concentrate rows around the curl. The spray strip shares the surface's draw call. */
function waveGeometry() {
  const along = 48, back = 7, lip = 10, front = 9;
  const surface = new THREE.PlaneGeometry(WIDE, 1, along, back + lip + front).rotateX(-Math.PI / 2);
  const p = surface.attributes.position;
  const profile = new THREE.Float32BufferAttribute(new Float32Array(p.count * 3), 3);
  surface.setAttribute("aProfile", profile);
  for (let row = 0; row <= back + lip + front; row++) {
    // 0–1 parameterizes the roll. The back starts at 1, over the original crest.
    const s = row <= back ? 1 + BACK * (1 - row / back)
      : row <= back + lip ? 1 - (row - back) / lip
      : -FRONT * (row - back - lip) / front;
    const shape = row >= back && row <= back + lip ? waveLip(s)
      : { height: waveProfile(s > 1 ? s - 1 : s), forward: 0, drop: 0 };
    for (let x = 0; x <= along; x++) {
      const i = row * (along + 1) + x;
      p.setZ(i, -s);
      profile.setXYZ(i, shape.height, shape.forward, shape.drop);
    }
  }
  const spray = new THREE.PlaneGeometry(WIDE, 1, along, 2).rotateX(-Math.PI / 2).translate(0, 1, 0.5);
  spray.setAttribute("aProfile", new THREE.Float32BufferAttribute(new Float32Array(spray.attributes.position.count * 3), 3));
  const geometry = mergeGeometries([surface, spray])!;
  surface.dispose();
  spray.dispose();
  return geometry;
}

export interface SurfSceneHost {
  player: GameCharacter;
  /** Drops thrown up from the water (Game's Splashes). */
  splash(x: number, y: number, z: number, dx: number, dz: number, k: number): void;
  readonly aspect: number;
}

export class Surf {
  logic: SurfLogic | null = null;
  /** Where the camera should stand and what it should look at now (Game puts it there: camera.ts "stage"). */
  readonly cam: NonNullable<CameraRig["stage"]> = { pos: new THREE.Vector3(), look: new THREE.Vector3(), rate: 3 };
  /** The instructor in the water (built for the first lesson). */
  coach: GameCharacter | null = null;
  /** Which way the learner faces (Game's headings: 0 the beach, π the sea). */
  heading = Math.PI;
  private mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  private waveGeo?: THREE.BufferGeometry;
  private surface: WaterSample = { y: 0, slope: 0, slopeX: 0 };
  private coachSurface: WaterSample = { y: 0, slope: 0, slopeX: 0 };
  private tilt: Tilt = { pitch: 0, roll: 0 };
  private coachTilt: Tilt = { pitch: 0, roll: 0 };
  private watch = new THREE.Vector3();
  readonly beach: { x: number; z: number; coachX: number; coachZ: number };
  private boards = new Map<BoardKind, THREE.Mesh>();
  private display: THREE.Mesh | null = null;
  private riderBoard: THREE.Mesh | null = null;
  private coachBoard: THREE.Mesh | null = null;
  private waves: { mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>; u: WaveUniforms }[] = [];
  private stroke = 0;
  private strokeTo = 0;
  private lastPose: Pose = "walk";
  private poseK = 1;
  private sprayT = 0;
  private lost = new THREE.Vector3();
  private lostRot = 0;
  private flip = 0;
  private popT = 9;
  private waveSounds = new WeakMap<Wave, "rush" | "break">();
  private demoT = -1;
  private demoWave: SceneWave = { d: 0, h: 1.25, white: false };
  private demoWaves = [this.demoWave];

  constructor(private spot: SurfSpot, private host: SurfSceneHost, readonly group: THREE.Group) {
    const z = spot.z + 1.7;
    this.beach = { x: spot.x - 1.3, z, coachX: spot.x + 0.3, coachZ: z - 0.1 };
    this.group.visible = false;
  }

  get active() { return !!this.logic; }
  get demoState() {
    if (this.demoT < 0) return "ready";
    if (this.demoT < DEMO_STAND) return "paddle";
    if (this.demoT < DEMO_LAND) return "ride";
    return this.demoT < DEMO_END ? "shore" : "done";
  }
  get demonstrating() { return this.demoT >= 0 && this.demoT < DEMO_END; }

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
    this.coach = new Character(coachLook);
    this.coach.fidgets = false;
    this.group.add(this.coach.root);
    this.coach.root.rotation.order = "YXZ";
    this.coachBoard = new THREE.Mesh(colourMerge(surfboardParts(2.3, 0.52, "#ff6b6b", "#fff7e6", COACH_THICK)), this.mat);
    this.coachBoard.rotation.order = "YXZ";
    this.group.add(this.coachBoard);
    // the three boards to choose from, stood in the sand behind the two of them, their decks to the sea
    const rack: Part[] = [];
    (["long", "short", "sup"] as const).forEach((kind, i) => {
      const b = BOARDS[kind];
      const parts = surfboardParts(b.len, b.wid, b.deck, b.stripe, b.thick);
      const x = this.spot.x + [-0.5, -2.9, 1.9][i], z = this.spot.z + 3.2;
      const y = floorY(x, z) - 0.12;
      for (const [g] of parts) g.translate(0, 0, b.len / 2).rotateX(-Math.PI / 2).rotateX(-0.09).translate(x, y, z);
      rack.push(...parts);
    });
    this.display = new THREE.Mesh(colourMerge(rack), this.mat);
    this.display.castShadow = true;
    this.group.add(this.display);
    // the waves: one strip of water each, lifted into a wave's shape in its shader, the sea's own swell under it
    const geo = this.waveGeo = waveGeometry();
    this.boardMesh("long");
    this.boardMesh("short");
    for (let i = 0; i < 4; i++) {
      const u = {
        uTime: { value: 0 }, uH: { value: 0 }, uWhite: { value: 0 }, uFade: { value: 1 }, uWidth: { value: WIDE },
        uShoulder: { value: new THREE.Vector2() },
        uFace: { value: new THREE.Color(this.spot.face) }, uDeep: { value: new THREE.Color(this.spot.deep) }, uFoam: { value: new THREE.Color("#fbfdf9") },
      };
      const mat = new THREE.ShaderMaterial({
        uniforms: u, transparent: true, side: THREE.DoubleSide, forceSinglePass: true,
        vertexShader: `uniform float uTime; uniform float uH; uniform float uWhite; uniform float uWidth; uniform vec2 uShoulder;
          attribute vec3 aProfile;
          varying vec4 vWave; varying vec2 vLocal; varying float vSpray;
          ${WAVE_GLSL}
          void main() {
            vec4 w = modelMatrix * vec4(position.x, 0.0, 0.0, 1.0);
            float x = position.x / ${WIDE.toFixed(1)} * uWidth;
            w.z += waveSweep(x - uShoulder.x) * uShoulder.y;
            float edge = waveEdge(position.x);
            float h = uH * edge * waveChop(w.x, uTime);
            float white = 1.0 - smoothstep(-1.4, 0.5, x + mix(1.65, -0.05, uWhite) + sin(uTime * 0.9) * 0.42);
            float s = -position.z;
            float p;
            vSpray = position.y;
            if (vSpray > 0.5) {
              s = position.z;
              w.z += h * (0.27 + s * 0.37);
              p = 0.94 + 0.42 * s;
            } else {
              w.z += max(-s, 0.0) - max(s - 1.0, 0.0) + aProfile.y * h * mix(0.78, 1.04, white);
              p = aProfile.x - aProfile.z * white * smoothstep(0.5, 1.2, h);
            }
            w.y += ${SWELL_GLSL} + h * p;
            vWave = vec4(p, edge, white, h);
            vLocal = vec2(x, s);
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: `uniform float uTime; uniform float uFade; uniform vec3 uFace; uniform vec3 uDeep; uniform vec3 uFoam;
          varying vec4 vWave; varying vec2 vLocal; varying float vSpray;
          void main() {
            float p = vWave.x, edge = vWave.y, white = vWave.z, h = vWave.w;
            float x = vLocal.x, s = vLocal.y;
            float alpha = smoothstep(0.015, 0.19, p * edge) * smoothstep(0.01, 0.25, h) * uFade;
            if (vSpray > 0.5) {
              vec2 cells = vec2(x * 10.5 + s * 0.8 - uTime * 1.7, s * 4.6 - uTime * 3.5);
              float seed = fract(52.9829189 * fract(dot(floor(cells), vec2(0.06711056, 0.00583715))));
              float dotSize = mix(0.1, 0.3, seed) * (1.0 - s * 0.45);
              float drop = 1.0 - smoothstep(dotSize * 0.4, dotSize, length(fract(cells) - 0.5));
              alpha *= drop * step(mix(0.71, 0.27, white), seed) * (1.0 - s) * smoothstep(0.55, 1.1, h);
              if (alpha < 0.025) discard;
              gl_FragColor = vec4(uFoam, alpha);
              return;
            }
            if (alpha < 0.01) discard;
            float lace = sin(x * 5.4 + s * 6.1 + uTime * 1.1) * sin(x * 9.3 - s * 12.0 - uTime * 2.9);
            float front = 1.0 - smoothstep(-0.02, 0.03, s);
            vec3 base = mix(uDeep * 0.66, uDeep * 0.27, front);
            vec3 water = mix(base, uFace, smoothstep(0.12, 0.82, p) * mix(0.64, 1.0, front));
            water *= 1.0 + 0.085 * lace;
            // Light on the rounded top, with the underside of the falling lip in shade.
            vec3 foamTint = mix(uFoam * vec3(0.71, 0.85, 0.87), uFoam, smoothstep(0.11, 0.68, s));
            foamTint *= 0.97 + 0.03 * lace;
            float lip = smoothstep(-0.12, 0.13, s + lace * 0.055) * (1.0 - smoothstep(0.94, 1.35, s + lace * 0.08));
            // The broken side spills down the face in fingers, with green between them at the toe.
            float fingers = sin(x * 6.2 + sin(x * 2.7) + s * 2.4 + uTime * 1.5);
            float wash = smoothstep(-0.77, -0.16, s + fingers * 0.31 + lace * 0.13) * front;
            wash *= mix(0.67, 1.0, smoothstep(-0.6, 0.25, lace + wash * 0.35));
            float foam = max(lip, white * wash) * smoothstep(0.14, 0.53, h);
            gl_FragColor = vec4(mix(water, foamTint, foam), alpha * mix(0.91, 1.0, foam));
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
  begin(logic: SurfLogic, coachLook: Look, time: number) {
    this.build(coachLook);
    this.logic = logic;
    this.group.visible = true;
    this.heading = Math.PI / 2;
    this.stroke = this.strokeTo = this.sprayT = 0;
    this.lastPose = "walk"; this.poseK = 1; this.flip = 0; this.popT = 9;
    this.demoT = -1;
    this.waveSounds = new WeakMap();
    for (const m of this.boards.values()) m.visible = false;
    this.riderBoard = null;
    this.frame(0, time, true);
  }

  /** The lesson is over: the sea as it was, the player's pose their own again. */
  end() {
    this.logic = null;
    this.group.visible = false;
    const p = this.host.player;
    if (p.surf) {
      const pose = p.surf;
      pose.prone = pose.stance = pose.crouch = pose.pitch = pose.stroke = pose.wobble = pose.straddle = 0;
    }
    p.swim = 0; p.flip = 0; p.lift = 0; p.bank = 0;
    p.root.rotation.order = "XYZ";
    p.setAnim("idle");
  }

  /** Something the rules set off (SurfHost.fx): what it looks like. */
  fx(name: string, t: number) {
    const L = this.logic, p = this.host.player.root.position;
    if (!L) return;
    const y = SEA_LEVEL + swell(p.x, p.z, t);
    if (name === "stroke") {
      this.strokeTo += 1;
      const hand = this.strokeTo % 2 ? -1 : 1;
      const fwdX = Math.sin(this.heading), fwdZ = Math.cos(this.heading);
      this.host.splash(p.x + fwdX * 0.5 + fwdZ * hand * 0.36, y, p.z + fwdZ * 0.5 - fwdX * hand * 0.36, -fwdX, -fwdZ, 0.18);
      audio.surfStroke(hand);
    } else if (name === "duck" || name === "tumble") this.host.splash(p.x, y, p.z, 0, 0, name === "duck" ? 0.6 : 1);
    else if (name === "pop") {
      this.popT = 0;
      this.host.splash(p.x, y, p.z, 0, 0, 0.5);
      audio.surfStand();
    }
    else if (name === "flip") this.flip = 1;
    else if (name === "wipeout") {
      this.host.splash(p.x, y, p.z, 0, 0, 1);
      this.lost.copy(p); this.lostRot = this.heading;
      audio.surfWipeout();
    }
  }

  dispose() {
    this.group.removeFromParent();
    this.coach?.dispose?.();
    this.display?.geometry.dispose();
    this.coachBoard?.geometry.dispose();
    for (const board of this.boards.values()) board.geometry.dispose();
    for (const wave of this.waves) wave.mesh.material.dispose();
    this.waveGeo?.dispose();
    this.mat.dispose();
  }

  private waterAt(out: WaterSample, x: number, d: number, t: number, waves: readonly SceneWave[], shoulderX: number | null, lane = this.spot.x, width = WIDE) {
    const z = this.spot.z - d;
    out.y = SEA_LEVEL + swell(x, z, t);
    out.slope = 0.011 * Math.sin(z * 0.11 + t * 0.7);
    out.slopeX = 0.0096 * Math.cos(x * 0.08 + t * 0.9) + 0.00225 * Math.cos(x * 0.05 - t * 1.9);
    const edge = waveEdge(x - lane, width), chop = waveChop(x, t);
    const across = edge * chop;
    const acrossSlope = waveEdgeSlope(x - lane, width) * chop + edge * waveChopSlope(x, t);
    const sweep = shoulderX === null ? 0 : waveSweep(x - shoulderX);
    const sweepSlope = shoulderX === null ? 0 : waveSweepSlope(x - shoulderX);
    for (const w of waves) {
      const reach = waveReach(w.d);
      const s = d - w.d + AHEAD + sweep * reach;
      const crest = waveHeight(w.h) * reach, h = crest * across;
      const profile = waveProfile(s), face = h * waveFaceSlope(s);
      out.y += h * profile;
      out.slope += face;
      out.slopeX += face * sweepSlope * reach + crest * acrossSlope * profile;
    }
  }

  private soundWaves(L: SurfLogic) {
    if (L.pose === "walk" || L.phase === "over") return;
    for (const w of L.waves) {
      const heard = this.waveSounds.get(w), gap = w.d - L.d;
      if (heard !== "break" && (gap <= AHEAD || (L.phase === "ride" && w.yes && w.d < 6 && gap < 2))) {
        audio.surfWaveBreak();
        this.waveSounds.set(w, "break");
      } else if (!heard && gap <= 6) {
        audio.surfWaveRush();
        this.waveSounds.set(w, "rush");
      }
    }
  }

  /** A frame: the rules take a step (unless `paused`), and everything is put where they say. */
  update(dt: number, t: number, inp: SurfInput, paused = false) {
    const L = this.logic;
    if (!L) return;
    if (!paused) {
      // The first wait starts after the learner sits up and answers. Its next line and waves are still queued.
      if (L.phase === "wait" && this.demoT < 0) this.demoT = 0;
      if (this.demonstrating) this.demoT += dt;
      else { L.step(dt, inp); this.soundWaves(L); }
    }
    this.frame(dt, t, false);
  }

  private frame(dt: number, t: number, snap: boolean) {
    const L = this.logic!, S = this.spot, pl = this.host.player, pp = pl.root.position;
    const sf = pl.surf;
    const onBeach = L.phase === "intro" || L.phase === "board" || (L.phase === "over" && L.pose !== "walk");
    const pose = onBeach ? "walk" : L.pose;
    const B = this.beach;
    const demo = this.demonstrating;
    const coachLane = S.x + 4.6;
    // --- where the learner is, and which way they face
    const d = L.d - (pose === "stand" ? RIDE_FORWARD * sstep(0, 0.55, L.rideT) : 0);
    const x = onBeach ? B.x : S.x - L.x, z = onBeach ? B.z : S.z - d;
    const demoPaddle = sstep(0, DEMO_STAND, this.demoT);
    const demoRide = THREE.MathUtils.clamp((this.demoT - DEMO_STAND) / (DEMO_LAND - DEMO_STAND), 0, 1);
    const demoD = THREE.MathUtils.lerp(L.cfg.lineup + 1.6 - 1.55 * demoPaddle, 2.8, demoRide);
    const demoTrim = sstep(DEMO_STAND, DEMO_STAND + 0.55, this.demoT);
    const coachD = demoD - RIDE_FORWARD * demoTrim;
    const demoX = coachLane + Math.sin(demoRide * Math.PI * 2) * 0.72;
    const want = demo ? Math.atan2(demoX - x, S.z - coachD - z) : onBeach ? Math.PI / 2
      : L.facing === "out" ? Math.PI : pose === "stand" ? TRIM_HEADING : 0;
    this.heading = snap ? want : turnTo(this.heading, want, dt * 4.2);
    const sea = SEA_LEVEL + swell(x, z, t);
    const surface = this.surface, tilt = this.tilt;
    if (onBeach || demo) {
      surface.y = sea;
      surface.slope = surface.slopeX = 0;
    } else this.waterAt(surface, x, d, t, L.waves, x);
    const water = surface.y;
    faceTilt(tilt, surface, this.heading);
    if (pose !== this.lastPose) { this.lastPose = pose; this.poseK = 0; }
    this.poseK = Math.min(1, this.poseK + dt / 0.35);
    const k = snap ? 1 : this.poseK * this.poseK * (3 - 2 * this.poseK);
    const ease = snap ? 1 : Math.min(1, dt * 9);
    const lerp = THREE.MathUtils.lerp;
    this.stroke = lerp(this.stroke, this.strokeTo, ease);
    this.popT += dt;
    let y = water + DECK, pitch = 0, roll = 0;
    const board = L.board ? this.boardMesh(L.board) : null;
    if (board !== this.riderBoard) {
      if (this.riderBoard) this.riderBoard.visible = false;
      if (board) board.visible = true;
      this.riderBoard = board;
    }
    this.display!.visible = onBeach || L.phase === "over";
    if (sf) {
      sf.prone = lerp(sf.prone, pose === "prone" || pose === "duck" ? 1 : 0, ease);
      sf.stance = lerp(sf.stance, pose === "stand" ? 1 : 0, ease);
      sf.straddle = pose === "sit" ? 1 : 0;
      sf.crouch = L.crouch; sf.pitch = L.pitch; sf.wobble = L.wobble;
      sf.stroke = this.stroke;
    }
    pl.swim = lerp(pl.swim ?? 0, pose === "swim" && L.fallT > 0.7 ? 1 : 0, ease);
    pl.moveSpeed = pose === "swim" ? 0.2 : 0;
    pl.setAnim(pose === "sit" ? "sit" : "idle");
    pl.root.rotation.order = "YXZ";
    let bx = x, bz = z, by = water - 0.02, bPitch = 0, bRoll = 0, bYaw = this.heading;
    if (pose === "walk") {
      // on their feet: on the sand, or in the shallows where the wave set them down
      y = floorY(x, z);
      if (board) { bx = x + 0.75; bz = z + 0.2; by = Math.max(floorY(bx, bz) + 0.02, onBeach ? -9 : sea - 0.02); bPitch = 0; bYaw = this.heading + 0.4; }
    } else if (pose === "prone" || pose === "duck") {
      // lying on it, the chest a third of the way back from the nose; a duck takes both under, nose first
      const dip = pose === "duck" || L.duckT > 0 ? Math.sin(Math.PI * Math.max(0, Math.min(1, 1 - L.duckT))) : 0;
      y = water + DECK - dip * 0.75;
      pitch = tilt.pitch + dip * 0.5 * (L.duckT > 0.5 ? 1 : -0.4);
      bx = x - Math.sin(this.heading) * 0.35; bz = z - Math.cos(this.heading) * 0.35;
      by = y - DECK - 0.02 + Math.sin(pitch) * 0.35; bPitch = pitch;
    } else if (pose === "sit") {
      pl.seatY = 0.02;
      y = water + DECK + Math.sin(t * 1.3) * 0.02;
      pitch = bPitch = tilt.pitch;
      bx = x + Math.sin(this.heading) * 0.2; bz = z + Math.cos(this.heading) * 0.2;
      by = y - DECK - 0.03 - Math.sin(bPitch) * 0.2;
    } else if (pose === "stand") {
      // up: a little hop onto the feet, then the board's lean is the learner's
      const hop = this.popT < 0.4 ? Math.sin((this.popT / 0.4) * Math.PI) * 0.22 : 0;
      roll = tilt.roll + L.lean * 0.3 + L.wobble * Math.sin(t * 9) * 0.12;
      pitch = tilt.pitch * 0.85 + L.pitch * 0.1 - L.crouch * 0.02;
      y = water + DECK + (board ? BOARDS[L.board!].thick : 0) - 0.03 + hop;
      by = water + BOARD_FLOAT; bPitch = pitch; bRoll = roll;
      // spray off the tail
      this.sprayT -= dt;
      if (this.sprayT <= 0 && !snap) {
        this.sprayT = 0.11;
        const tail = (L.board ? BOARDS[L.board].len : 2.3) * 0.42;
        const dx = -Math.sin(this.heading), dz = -Math.cos(this.heading);
        this.host.splash(x + dx * tail * Math.cos(pitch), by + tail * Math.sin(pitch) - 0.08, z + dz * tail * Math.cos(pitch),
          dx * 0.6 + L.lean, dz * 0.6, 0.12 + Math.abs(L.lean) * 0.25);
      }
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
    // --- the instructor: on the sand, demonstrating, or sitting at the line-up
    const c = this.coach!, cb = this.coachBoard!;
    const cs = c.surf;
    if (cs) {
      cs.prone = lerp(cs.prone, demo && this.demoT < DEMO_STAND ? 1 : 0, ease);
      cs.stance = lerp(cs.stance, demo && this.demoT >= DEMO_STAND && this.demoT < DEMO_LAND ? 1 : 0, ease);
      cs.straddle = onBeach || demo ? 0 : 1;
      cs.crouch = demo ? 0.22 + 0.14 * Math.sin(demoRide * Math.PI) : 0;
    }
    if (onBeach) {
      c.setAnim("idle");
      c.root.position.set(B.coachX, floorY(B.coachX, B.coachZ), B.coachZ);
      c.root.rotation.set(0, -Math.PI / 2, 0);
      cb.visible = false;
    } else if (demo) {
      const wave = this.demoWave;
      const cz = S.z - coachD;
      wave.d = demoD + 1.2 + 5 * (1 - demoPaddle);
      wave.white = demoRide > 0.77;
      this.waterAt(this.coachSurface, demoX, coachD, t, this.demoWaves, null, coachLane, DEMO_WIDTH);
      const cy = this.coachSurface.y;
      const heading = TRIM_HEADING * demoTrim;
      const trim = this.coachTilt;
      faceTilt(trim, this.coachSurface, heading);
      const pop = Math.sin(Math.PI * THREE.MathUtils.clamp((this.demoT - DEMO_STAND) / 0.42, 0, 1)) * 0.17;
      if (cs) cs.stroke = demoPaddle * 4;
      c.setAnim("idle");
      const boardY = cy + THREE.MathUtils.lerp(-0.01, BOARD_FLOAT, demoTrim);
      c.root.position.set(demoX, boardY + COACH_THICK + pop, cz);
      c.root.rotation.set(trim.pitch * 0.9, heading, trim.roll + 0.12 * Math.sin(demoRide * Math.PI * 2));
      cb.visible = true;
      cb.position.set(demoX, boardY, cz);
      cb.rotation.copy(c.root.rotation);
    } else {
      const cx = coachLane, cd = L.cfg.lineup + 1.6, cz = S.z - cd;
      this.waterAt(this.coachSurface, cx, cd, t, L.waves, x);
      const cy = this.coachSurface.y;
      c.seatY = 0.02;
      c.setAnim("sit");
      const face = Math.atan2(x - cx, z - cz);
      c.root.position.set(cx, cy + DECK + Math.sin(t * 1.1 + 1) * 0.02, cz);
      c.root.rotation.set(0, face, 0);
      cb.visible = true;
      cb.position.set(cx + Math.sin(face) * 0.2, cy - 0.03, cz + Math.cos(face) * 0.2);
      cb.rotation.set(-0.1, face, 0);
    }
    if (c.watch !== undefined) {
      c.watch = demo ? null : this.watch.set(pp.x, pp.y + 1.2, pp.z);
      c.steady = !demo;
    }
    c.update(dt);
    // --- the waves
    for (let i = 0; i < this.waves.length; i++) {
      const wv = this.waves[i];
      const w = demo ? (i === 0 ? this.demoWave : undefined) : L.waves[i];
      wv.mesh.visible = !!w;
      if (!w) continue;
      const lane = demo ? coachLane : S.x;
      const width = demo ? DEMO_WIDTH : WIDE;
      const reach = waveReach(w.d);
      wv.mesh.position.set(lane, SEA_LEVEL, S.z - w.d + AHEAD);
      wv.mesh.scale.x = width / WIDE;
      wv.u.uWidth.value = width;
      wv.u.uShoulder.value.set(x - lane, demo ? 0 : reach);
      wv.u.uTime.value = t;
      wv.u.uH.value = waveHeight(w.h) * reach;
      wv.u.uWhite.value = w.white ? 1 : sstep(9, 3, w.d);
      wv.u.uFade.value = sstep(-2.5, 1.5, w.d);
    }
    // --- the camera
    const aspect = this.host.aspect, tall = aspect < 1 / 1.15, far = tall ? 1.35 : 1;
    const C = this.cam;
    // In portrait the board, including its tail on a steep wave, sits between the words and the arrows.
    const boardShift = tall ? 0.04 : aspect > 1.8 ? 0.1 : 0;
    C.shiftY = boardShift || undefined;
    if (onBeach) {
      // from the water's side: the two of them, the boards behind them, the town beyond
      C.pos.set(S.x + 0.2, 1.9, B.z - 5.6 * far); C.look.set(S.x + 0.25, 1.15, B.z + 1.5); C.rate = 3;
    } else if (L.phase === "catch") {
      // From the same side as the ride, with room behind the board for the incoming wave.
      C.pos.set(x + 7.2 * far, 2.3, z - (tall ? 1.15 : 1.85));
      C.look.set(x, 0.7, z - (tall ? 0.5 : 0.95));
      C.rate = 2.6;
    } else if (L.phase === "ride") {
      // Near the clean shoulder, looking shoreward so a left lean still moves screen-left.
      C.pos.set(x + (tall ? 6.5 : 5.6), 2.2, z - 0.65);
      C.look.set(x - (tall ? 0.65 : 1.3), water + (tall ? 1.2 : 1.3), z + (tall ? 0.45 : 0.75));
      C.rate = 6;
    } else if (L.phase === "fall" || L.phase === "ask" || L.phase === "again" || L.phase === "over") {
      // from the sea's side, close: the learner in the water, the beach behind them
      C.pos.set(x - 2.4, 2.0, z - 5.4 * far); C.look.set(x + 0.3, 0.75, z + 1.5); C.rate = 2.2;
    } else {
      // paddling out, waiting: from behind, towards the sea and what comes in from it (the instructor to the right)
      C.pos.set(x - 1.4, 3.3, z + 6.6 * far); C.look.set(x + 1.2, 0.4, z - 9); C.rate = 2.6;
    }
    if (demo) {
      // Show the face from the side, then turn back to the learner as the coach reaches the shallows.
      const k = 1 - sstep(DEMO_LAND, DEMO_END, this.demoT);
      const cp = c.root.position, blend = THREE.MathUtils.lerp;
      const distance = tall ? Math.max(6.1, 3.6 / Math.max(aspect, 0.35)) : 5.2;
      C.pos.set(blend(C.pos.x, cp.x + distance, k), blend(C.pos.y, tall ? 2.45 : 2.15, k), blend(C.pos.z, cp.z + 2, k));
      C.look.set(blend(C.look.x, cp.x - 0.35, k), blend(C.look.y, cp.y + (tall ? 0.53 : 0.75), k), blend(C.look.z, cp.z + (tall ? 0.18 : -0.24), k));
      // Ease back into the normal portrait shift as the learner comes back into view.
      if (tall) C.shiftY = boardShift * (1 - k);
      C.rate = tall ? 7.5 : 5;
    }
  }
}
