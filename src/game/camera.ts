// Camera rig: follow camera outdoors (lazy auto-follow, drag to look around, wheel to zoom),
// fixed "dollhouse" angle indoors, and a conversation framing shot.
import * as THREE from "three";

export type CamMode = "follow" | "interior" | "talk";

export class CameraRig {
  cam: THREE.PerspectiveCamera;
  mode: CamMode = "follow";
  yaw = Math.PI;            // camera behind the player looking north by default
  pitch = 0.42;
  dist = 10;
  target = new THREE.Vector3();
  private curPos = new THREE.Vector3();
  private curLook = new THREE.Vector3();
  private manualT = 0;
  interiorBounds = { w: 16, d: 12 };
  talk: { pos: THREE.Vector3; look: THREE.Vector3 } | null = null;
  /** Returns the free fraction (0..1) of the segment from the look point to the camera. */
  occluder: ((from: THREE.Vector3, to: THREE.Vector3) => number) | null = null;
  private occl = 1;
  viewShift = { x: 0, y: 0 };

  constructor(aspect: number) {
    this.cam = new THREE.PerspectiveCamera(50, aspect, 0.1, 900);
  }

  drag(dx: number, dy: number) {
    this.yaw -= dx * 0.005;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.003, 0.12, 1.2);
    this.manualT = 3;
  }
  zoom(delta: number) {
    this.dist = THREE.MathUtils.clamp(this.dist * (1 + delta * 0.001), 5, 22);
  }
  snap() { this.curPos.copy(this.desiredPos()); this.curLook.copy(this.mode === "interior" ? this.interiorLook() : this.desiredLook()); }

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

  update(dt: number, playerHeading: number, moving: boolean, forwardish: boolean, follow: boolean) {
    this.manualT -= dt;
    if (this.mode === "follow" && moving && follow && this.manualT <= 0 && forwardish) {
      // lazily swing behind the player
      let d = playerHeading - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * 1.6);
    }
    const k = this.mode === "talk" ? 3.5 : 7;
    const pos = this.desiredPos(), look = this.desiredLook();
    if (this.mode === "follow" && this.occluder) {
      const free = this.occluder(look, pos);
      this.occl += (free - this.occl) * Math.min(1, dt * (free < this.occl ? 14 : 3));
      pos.lerpVectors(look, pos, Math.max(0.18, this.occl));
    }
    if (this.mode === "interior") this.curLook.lerp(this.interiorLook(), Math.min(1, dt * k));
    else this.curLook.lerp(look, Math.min(1, dt * k));
    this.curPos.lerp(pos, Math.min(1, dt * k));
    this.cam.position.copy(this.curPos);
    this.cam.lookAt(this.curLook);
  }

  /** Shift the rendered image so the subject sits left of the conversation panel (or above it on phones). */
  applyViewShift(w: number, h: number, shiftX: number, shiftY: number) {
    if (Math.abs(shiftX) < 1 && Math.abs(shiftY) < 1) { this.cam.clearViewOffset(); return; }
    this.cam.setViewOffset(w, h, shiftX, shiftY, w, h);
  }
}
