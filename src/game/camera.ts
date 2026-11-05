// Camera rig: the follow camera outdoors, a fixed "dollhouse" angle indoors, and a conversation framing shot.
//
// Outdoors the camera stands back and above the player on an arm from their chest, looking a little ahead of where they
// are going; after a moment on the move it swings in behind them (eased, the way they turned), so walking back towards
// the camera turns the view round instead of showing the player's face all the way. Nothing solid comes between it and
// the player (`space`: the town's own geometry, occlusion.ts): where a wall or a roof would, the arm leans up (a
// wall behind them: the view looks down over their head into the street) or stays low (under a roof), whichever line is
// longest clear, and shortens to what is clear; with nothing clear behind them for a few metres (just out of a door,
// under an awning's edge) it goes up over their head. Leaning and shortening are eased (in quickly, out slowly), and the
// arm is never longer than what is clear along it, so the camera never passes through anything even for a frame. Drag
// to look round (it eases back behind the player once they walk on), the wheel to zoom. Through a door the camera
// starts close and settles out, so stepping out shows the street ahead.
import * as THREE from "three";
import { angleDiff, smoothstep, springStep } from "./movement";

export type CamMode = "follow" | "interior" | "talk";

/** The follow camera's lean (radians above level, from the player's chest) and distance (m) by default (before 5 Nov
 *  2026: 0.42 from a point 1.3 m up, 10 m). */
export const FOLLOW = { pitch: 0.47, dist: 11.5 };

const ease = (from: number, to: number, rate: number, dt: number) => from + (to - from) * (1 - Math.exp(-rate * dt));
/** The arms tried when the usual one is blocked: as it is, leaning further up, and lower (under an awning) (radians). */
const RAISES = [0, 0.08, 0.16, 0.24, 0.32, 0.4, 0.48, 0.56, -0.12, -0.24];
/** Up over the player's head when nothing behind them is clear for this far (m): the arm's lean and its length. */
const CRANE = { below: 3, pitch: 1.22, len: 6 };

export class CameraRig {
  cam: THREE.PerspectiveCamera;
  mode: CamMode = "follow";
  yaw = Math.PI;            // camera behind the player looking north by default
  pitch = FOLLOW.pitch;
  dist = FOLLOW.dist;
  target = new THREE.Vector3();
  private curPos = new THREE.Vector3();
  private curLook = new THREE.Vector3();
  private manualT = 0;
  interiorBounds = { w: 16, d: 12 };
  talk: { pos: THREE.Vector3; look: THREE.Vector3 } | null = null;
  /** What the follow camera keeps clear of (Game: the town's OcclusionField; nothing indoors): how far along a line
   *  one gets before something solid (0–1), whether a spot is inside something, whether it is over something one can't
   *  walk into (a building, a gazebo, a stall, a car: the camera stands over open ground). */
  space: { free(a: THREE.Vector3, b: THREE.Vector3): number; inside(p: THREE.Vector3): boolean; overSolid(x: number, z: number): boolean } | null = null;
  viewShift = { x: 0, y: 0 };
  /** Where the player is heading (radians, Game's headings), how fast (m/s) and where they will be in a moment (out of
   *  walls); Game sets it every frame. */
  motion = { dir: 0, speed: 0, next: new THREE.Vector3() };
  /** How far the player's own drags have turned the camera since Game last took it (its steering turns with them). */
  manualTurn = 0;
  /** A finger or the mouse is dragging the view. */
  dragging = false;
  private yawVel = 0;
  private movingT = 0;
  private lastDir = 0;
  private gapSign = 1;
  private ahead = new THREE.Vector3();
  /** The arm as it is (eased like springs, no kinks): its lean and its length, and how fast they change. */
  private armP = FOLLOW.pitch;
  private armL = FOLLOW.dist;
  private armPv = 0;
  private armLv = 0;
  private wantP = FOLLOW.pitch;
  private wantL = FOLLOW.dist;
  /** The yaw the arms are tried at (the camera's own, or where its swing is taking it). */
  private evalYaw = Math.PI;
  /** How far into something solid the camera's spot went last frame (m; 0: not). */
  private intrude = 0;
  private lastKey = "";
  private lastBest: { p: number; l: number } | null = null;
  /** After a change of mode (the end of a conversation) or a door: how long the camera still glides to its place (s). */
  private blendT = 0;
  private lastMode: CamMode = "follow";
  private chest = new THREE.Vector3();
  private feet = new THREE.Vector3();
  private look = new THREE.Vector3();
  private v1 = new THREE.Vector3();
  private v2 = new THREE.Vector3();

  constructor(aspect: number) {
    this.cam = new THREE.PerspectiveCamera(50, aspect, 0.1, 900);
  }

  drag(dx: number, dy: number) {
    this.yaw -= dx * 0.005;
    this.manualTurn -= dx * 0.005;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.003, 0.12, 1.2);
    this.manualT = 1.4;
    this.yawVel = 0;
  }
  zoom(delta: number) {
    this.dist = THREE.MathUtils.clamp(this.dist * (1 + delta * 0.001), 5, 22);
  }
  snap() {
    if (this.mode === "follow") {
      this.ahead.set(0, 0, 0);
      this.curPos.copy(this.placeFollow(0, true));
      this.curLook.copy(this.look);
    } else {
      this.curPos.copy(this.desiredPos());
      this.curLook.copy(this.mode === "interior" ? this.interiorLook() : this.desiredLook());
    }
    this.blendT = 0;
    this.lastMode = this.mode;
  }

  /** Coming through a door, after snap(): outdoors the camera starts up over the player's head (as far as is clear),
   *  looking out where they face, and settles down and back behind them as they walk out; indoors it starts a little
   *  nearer the room and settles out. */
  arrive() {
    if (this.mode === "follow") {
      this.armP = this.wantP = CRANE.pitch;
      this.armL = this.wantL = Math.max(1.2, this.armLen(CRANE.pitch, 4.5));
      this.armPv = this.armLv = 0;
      this.curPos.copy(this.dirAt(this.armP, this.v1).multiplyScalar(this.armL).add(this.chest));
      this.ahead.set(Math.sin(this.yaw) * 1.5, 0, Math.cos(this.yaw) * 1.5);
      this.look.set(this.target.x + this.ahead.x, this.target.y + 1.45, this.target.z + this.ahead.z);
      this.curLook.copy(this.look);
      this.blendT = 0;
    } else if (this.mode === "interior") {
      this.curPos.lerp(this.curLook, 0.22);
      this.blendT = 0.9;
    }
  }

  /** Indoors the view stays centred inside the room (never on the dark area beyond the open front). */
  private interiorLook() {
    const halfW = this.interiorBounds.w / 2 - 3, halfD = this.interiorBounds.d / 2;
    const tx = THREE.MathUtils.clamp(this.target.x, -Math.max(0, halfW), Math.max(0, halfW));
    const lo = -halfD + 3, hi = Math.max(lo, halfD - 3.5);
    const tz = THREE.MathUtils.clamp(this.target.z - 0.5, lo, hi);
    return new THREE.Vector3(tx, 1.2, tz);
  }

  private desiredLook() {
    if (this.mode === "talk" && this.talk) return this.talk.look;
    return new THREE.Vector3(this.target.x, this.target.y + 1.3, this.target.z);
  }
  private desiredPos() {
    if (this.mode === "talk" && this.talk) return this.talk.pos;
    if (this.mode === "interior") {
      const d = Math.max(9, Math.min(15, this.interiorBounds.w * 0.55 + 4));
      const pitch = 0.78;
      const L = this.interiorLook();
      return new THREE.Vector3(L.x, L.y + Math.sin(pitch) * d, L.z + Math.cos(pitch) * d);
    }
    const h = Math.sin(this.pitch) * this.dist, r = Math.cos(this.pitch) * this.dist;
    return new THREE.Vector3(this.target.x - Math.sin(this.yaw) * r, this.target.y + 1.3 + h, this.target.z - Math.cos(this.yaw) * r);
  }

  /** The arm's direction from the chest, leaning `p` up, behind the player (opposite where the camera faces, or would
   *  face at `yaw`). */
  private dirAt(p: number, out: THREE.Vector3, yaw = this.evalYaw) {
    const c = Math.cos(p);
    return out.set(-Math.sin(yaw) * c, Math.sin(p), -Math.cos(yaw) * c);
  }
  /** How much of an arm of length `len` leaning `p` is clear from the chest out (m). */
  private freeLen(p: number, len: number) {
    if (!this.space) return len;
    return this.space.free(this.chest, this.dirAt(p, this.v1).multiplyScalar(len).add(this.chest)) * len;
  }
  /** How long the arm leaning `p` can be: clear from the chest out, the camera over open ground (not over a roof, a
   *  gazebo, a stall) and the player's feet in sight from it too (so nothing below the camera, a roof's edge, hides
   *  them); shortened in steps until all three hold (m, at least 0.9). */
  private armLen(p: number, len: number) {
    const fl = this.freeLen(p, len);
    if (!this.space) return fl;
    const t = this.target, d = this.dirAt(p, this.v2);
    this.feet.set(t.x, t.y + 0.25, t.z);
    for (const k of [1, 0.9, 0.8, 0.7, 0.6, 0.51, 0.43, 0.36, 0.3, 0.25]) {
      const L = fl * k;
      if (L < 0.9) break;
      const cam = this.v1.copy(d).multiplyScalar(L).add(this.chest);
      if (this.space.overSolid(cam.x, cam.z)) continue;
      if (this.space.free(this.feet, cam) >= 0.999) return L;
    }
    return Math.min(fl, 0.9);
  }

  /** The best arm with the camera facing `yaw`: the one that goes furthest clear, up to about 7 m (further adds
   *  little), in favour of the lower ones (a lower view a little nearer beats a bird's-eye one over a roof); up over the
   *  head only if no arm is clear for 3 m. */
  private bestArm(yaw: number) {
    this.evalYaw = yaw;
    let bestP = Math.min(1.3, this.pitch), bestL = this.dist, score = -1;
    for (const r of RAISES) {
      const p = THREE.MathUtils.clamp(this.pitch + r, 0.12, 1.3), fl = this.armLen(p, this.dist), sc = Math.min(fl, 7) * (1 - (r > 0 ? 0.9 : 1.4) * Math.abs(r));
      if (sc > score + 1e-6) { score = sc; bestP = p; bestL = fl; }
      if (fl >= this.dist * 0.999) break;
    }
    if (bestL < CRANE.below) {
      const fl = this.armLen(CRANE.pitch, CRANE.len);
      if (fl > bestL + 1) { bestP = CRANE.pitch; bestL = fl; }
    }
    return { p: bestP, l: bestL };
  }

  /** Where the follow camera stands now (see the top of the file); `snap`: no easing (a new place). Sets `look`. */
  private placeFollow(dt: number, snap: boolean) {
    const t = this.target, a = this.ahead;
    this.chest.set(t.x, t.y + 1.35, t.z);
    this.look.set(t.x + a.x, t.y + 1.45, t.z + a.z);
    // (the same question as last frame, standing still with the camera settled: the same answer)
    const m = this.motion, moving = Math.abs(this.yawVel) > 0.15 || m.speed > 0.8;
    const key = moving || snap ? "" : [t.x, t.z, this.yaw, this.pitch, this.dist].map((v) => v.toFixed(3)).join();
    let best: { p: number; l: number };
    if (key && key === this.lastKey && this.lastBest) best = { ...this.lastBest };
    else {
      best = this.bestArm(this.yaw);
      // no longer than will be clear a moment on, the swing and the walk carried on: the arm starts coming in before
      // something comes between, not after
      if (moving) {
        const tx = t.x, tz = t.z;
        t.set(m.next.x, t.y, m.next.z);
        this.chest.set(t.x, t.y + 1.35, t.z);
        best.l = Math.min(best.l, this.bestArm(this.yaw + this.yawVel * 0.3).l);
        t.set(tx, t.y, tz);
        this.chest.set(t.x, t.y + 1.35, t.z);
      }
      this.lastKey = key;
      this.lastBest = { ...best };
    }
    this.evalYaw = this.yaw;
    const bestP = best.p, bestL = best.l;
    if (snap) { this.armP = this.wantP = bestP; this.armL = this.wantL = bestL; this.armPv = 0; this.armLv = 0; }
    else {
      // (what the arm wants, smoothed a little first, so even a sudden change starts gently; at once if the arm as it
      // is now would be in the way)
      const urgent = (bestL < this.armL - 0.5 && this.freeLen(this.armP, this.armL) < this.armL - 0.3) || this.intrude > 0;
      this.wantP = ease(this.wantP, bestP, this.dragging ? 30 : 12, dt);
      this.wantL = ease(this.wantL, bestL, bestL < this.wantL ? (urgent ? 40 : 18) : 8, dt);
      [this.armP, this.armPv] = springStep(this.armP, this.armPv, this.wantP, this.dragging ? 16 : this.wantP > this.armP ? 7 : 3.5, dt);
      [this.armL, this.armLv] = springStep(this.armL, this.armLv, this.wantL, this.wantL < this.armL ? (urgent ? 17 : 12) : 3.2, dt);
    }
    // never inside anything for long: if the camera's own spot is in something solid (a column it grazed), the arm
    // comes in to what is clear along it within a few frames (in under a hand's breadth it can't be seen: the near
    // plane); at once if it is deeper in
    const pos = this.dirAt(this.armP, new THREE.Vector3()).multiplyScalar(this.armL).add(this.chest);
    this.intrude = 0;
    if (this.space?.inside(pos)) {
      const clear = this.freeLen(this.armP, this.armL);
      this.intrude = this.armL - clear;
      this.wantL = Math.min(this.wantL, clear);
      if (this.intrude > 0.45) {
        this.armL = clear + 0.45;
        this.armLv = Math.min(0, this.armLv);
        pos.copy(this.dirAt(this.armP, this.v1)).multiplyScalar(this.armL).add(this.chest);
      }
    }
    if (this.armL < 0.9) { this.armL = 0.9; this.armLv = Math.max(0, this.armLv); pos.copy(this.dirAt(this.armP, this.v1)).multiplyScalar(0.9).add(this.chest); }
    return pos;
  }

  /** The lens for this mode and screen: the conversation's 50°, as always. Walking on a wide screen a wider view
   *  (55°, 58° at a run; 50° and 54° before). On a phone held upright the walking lens stays as it was (50°, 54° at a
   *  run): wider, its draw calls in the busiest streets would grow, so the room there comes from the camera standing
   *  further back and higher, and looking ahead. Indoors 50°; on an upright phone about 30° across (24.5° before), to
   *  show the room. */
  fovFor(w: number, h: number, running: boolean) {
    if (this.mode === "talk") return 50;
    const aspect = w / Math.max(1, h);
    if (this.mode === "interior") return aspect < 0.87 ? THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(15)) / aspect)), 50, 66) : 50;
    if (aspect < 0.87) return running ? 54 : 50;
    return running ? 58 : 55;
  }

  update(dt: number, playerHeading: number, moving: boolean, forwardish: boolean, follow: boolean) {
    void playerHeading; void moving; void forwardish;
    this.manualT -= dt;
    if (this.mode !== this.lastMode) { this.blendT = this.mode === "follow" ? 0.8 : 0; this.lastMode = this.mode; }
    this.blendT = Math.max(0, this.blendT - dt);
    const m = this.motion;
    if (this.mode === "follow") {
      // (on the move: the time since they set off, or since they last turned sharply: the swing waits a moment)
      const on = m.speed > 0.8;
      const turning = dt > 0 && Math.abs(angleDiff(m.dir, this.lastDir)) / dt > 3.5;
      this.lastDir = m.dir;
      this.movingT = on && !turning ? this.movingT + dt : 0;
      // (straight back is either way round: the swing keeps the side the player turned)
      let gap = angleDiff(m.dir, this.yaw);
      if (m.speed > 0.05 && Math.abs(gap) < 2.9) this.gapSign = gap >= 0 ? 1 : -1;
      if (follow && on && this.manualT <= 0 && !this.dragging) {
        // after a moment on the move, swing in behind where they are heading, eased
        if (Math.abs(gap) >= 2.9) gap = this.gapSign * Math.abs(gap);
        const w = smoothstep(0.15, 0.85, this.movingT);
        const [step, v] = springStep(0, this.yawVel, gap * w, 3.3, dt);
        this.yawVel = THREE.MathUtils.clamp(v, -2.3, 2.3);
        this.yaw = angleDiff(this.yaw + step, 0);
        // and back to the usual lean, if a drag changed it
        this.pitch = ease(this.pitch, FOLLOW.pitch, 1.1, dt);
      } else {
        this.yawVel *= Math.exp(-8 * dt);
        this.yaw = angleDiff(this.yaw + this.yawVel * dt, 0);
      }
      // a look a little ahead of where they are going (more at a run), eased
      const k = smoothstep(0.6, 7.4, m.speed) * 2.4;
      this.ahead.x = ease(this.ahead.x, Math.sin(m.dir) * k, 1.6, dt);
      this.ahead.z = ease(this.ahead.z, Math.cos(m.dir) * k, 1.6, dt);
    } else {
      this.yawVel = 0;
      this.ahead.set(0, 0, 0);
    }
    if (this.mode === "follow") {
      const pos = this.placeFollow(dt, false);
      if (this.blendT > 0) {
        // gliding over from a conversation's shot: eased, never through anything
        const k = 1 - Math.exp(-6 * dt);
        this.curPos.lerp(pos, k);
        this.curLook.lerp(this.look, k);
        if (this.space?.inside(this.curPos)) {
          const f = this.space.free(this.chest, this.curPos);
          this.curPos.sub(this.chest).multiplyScalar(Math.max(f, 0.3)).add(this.chest);
        }
      } else {
        this.curPos.copy(pos);
        this.curLook.copy(this.look);
      }
    } else {
      const k = this.mode === "talk" ? 3.5 : this.blendT > 0 ? 4 : 7;
      const pos = this.desiredPos(), look = this.desiredLook();
      if (this.mode === "interior") this.curLook.lerp(this.interiorLook(), Math.min(1, dt * k));
      else this.curLook.lerp(look, Math.min(1, dt * k));
      this.curPos.lerp(pos, Math.min(1, dt * k));
    }
    // the near plane: walking, things right in front of the lens (a lamp's globe, a sign) are left out (less when the
    // camera has come in close); the conversation's and the rooms' as always
    const near = this.mode === "follow" ? THREE.MathUtils.clamp((this.curPos.distanceTo(this.chest) - 0.6) * 0.5, 0.1, 0.5) : 0.1;
    if (near === 0.1 ? this.cam.near !== 0.1 : Math.abs(this.cam.near - near) > 0.02) { this.cam.near = near; this.cam.updateProjectionMatrix(); }
    this.cam.position.copy(this.curPos);
    this.cam.lookAt(this.curLook);
  }

  /** Shift the rendered image so the subject sits left of the conversation panel (or above it on phones). */
  applyViewShift(w: number, h: number, shiftX: number, shiftY: number) {
    if (Math.abs(shiftX) < 1 && Math.abs(shiftY) < 1) { this.cam.clearViewOffset(); return; }
    this.cam.setViewOffset(w, h, shiftX, shiftY, w, h);
  }
}
