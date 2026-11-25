// The marks a sliding car's back wheels leave on the ground: dark ribbons, one mesh for all of them (a ring of
// quads: the oldest are written over), fading out after a while. Drawn only while there are any.
import * as THREE from "three";

const MAX = 520, LIFE = 14, FADE = 4;

export class Skids {
  readonly mesh: THREE.Mesh;
  private pos: Float32Array;
  private col: Float32Array;
  private born = new Float32Array(MAX).fill(-1e9);
  private strength = new Float32Array(MAX);
  private next = 0;
  private t = 0;
  private fadeT = 0;
  /** Where each wheel's ribbon ended (x, z), or null when that wheel is not marking. */
  private last: ([number, number] | null)[] = [null, null];

  constructor() {
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(MAX * 18);
    this.col = new Float32Array(MAX * 24);
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("color", new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    const m = new THREE.MeshBasicMaterial({ color: "#ffffff", vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.mesh = new THREE.Mesh(g, m);
    this.mesh.name = "skid-marks";
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    this.mesh.visible = false;
  }

  /** A wheel (`i` 0 or 1) at (x, z) on ground `y` high, marking with `k` 0–1 (0: it lifts off, the ribbon ends). */
  mark(i: number, x: number, z: number, y: number, k: number) {
    const l = this.last[i];
    if (k <= 0.02) { this.last[i] = null; return; }
    if (!l) { this.last[i] = [x, z]; return; }
    const dx = x - l[0], dz = z - l[1], d = Math.hypot(dx, dz);
    if (d < 0.3) return;
    // (a jump in place: a new ribbon)
    if (d > 3) { this.last[i] = [x, z]; return; }
    const nx = (-dz / d) * 0.11, nz = (dx / d) * 0.11, q = this.next, o = q * 18, yy = y + 0.03;
    const P = this.pos;
    const put = (j: number, px: number, pz: number) => { P[o + j * 3] = px; P[o + j * 3 + 1] = yy; P[o + j * 3 + 2] = pz; };
    put(0, l[0] - nx, l[1] - nz); put(1, l[0] + nx, l[1] + nz); put(2, x + nx, z + nz);
    put(3, l[0] - nx, l[1] - nz); put(4, x + nx, z + nz); put(5, x - nx, z - nz);
    this.born[q] = this.t; this.strength[q] = Math.min(1, k);
    this.paint(q, Math.min(1, k) * 0.5);
    this.next = (q + 1) % MAX;
    this.last[i] = [x, z];
    (this.mesh.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.mesh.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    this.mesh.visible = true;
  }

  breakTracks() { this.last[0] = this.last[1] = null; }

  private paint(q: number, a: number) {
    const C = this.col, o = q * 24;
    for (let j = 0; j < 6; j++) { C[o + j * 4] = 0.07; C[o + j * 4 + 1] = 0.07; C[o + j * 4 + 2] = 0.075; C[o + j * 4 + 3] = a; }
  }

  /** The marks age: the old ones fade and are gone. */
  update(dt: number) {
    this.t += dt;
    if (!this.mesh.visible) return;
    this.fadeT -= dt;
    if (this.fadeT > 0) return;
    this.fadeT = 0.3;
    let alive = false, changed = false;
    for (let q = 0; q < MAX; q++) {
      const age = this.t - this.born[q];
      if (age > LIFE + FADE) { if (this.col[q * 24 + 3] !== 0) { this.paint(q, 0); changed = true; } continue; }
      alive = true;
      if (age > LIFE) { this.paint(q, this.strength[q] * 0.5 * (1 - (age - LIFE) / FADE)); changed = true; }
    }
    if (changed) (this.mesh.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    if (!alive) this.mesh.visible = false;
  }
}
