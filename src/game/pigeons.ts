// Pigeons on the town square: they peck, hop and turn around the fountain, and when the player runs at them (or walks
// right up) they burst into the air, circle a little and land somewhere else on the square. Two instanced meshes
// (bodies, wings), so the whole flock is two draw calls.
import * as THREE from "three";
import { colourMerge } from "./world/util";

type Bird = { x: number; z: number; y: number; h: number; mode: "ground" | "fly"; t: number; act: number; peck: number; tx: number; tz: number; flap: number };

export class Pigeons {
  group = new THREE.Group();
  private birds: Bird[] = [];
  private bodies: THREE.InstancedMesh;
  private wings: THREE.InstancedMesh;
  private m4 = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private one = new THREE.Vector3(1, 1, 1);
  private p = new THREE.Vector3();
  /** Called when some take off (for the sound of their wings). */
  onTakeOff?: (n: number) => void;

  constructor(private cx: number, private cz: number, private r0: number, private r1: number, n = 8) {
    const body = colourMerge([
      [new THREE.SphereGeometry(0.11, 8, 6).scale(1, 0.85, 1.45).translate(0, 0.16, 0), "#8a919c"],
      [new THREE.SphereGeometry(0.065, 8, 6).translate(0, 0.26, 0.13), "#6f7a8a"], // head
      [new THREE.SphereGeometry(0.045, 6, 4).scale(1.1, 0.8, 1).translate(0, 0.22, 0.09), "#5f8f7a"], // the green neck
      [new THREE.ConeGeometry(0.018, 0.05, 5).rotateX(Math.PI / 2).translate(0, 0.25, 0.2), "#3a3330"], // beak
      [new THREE.BoxGeometry(0.11, 0.025, 0.12).translate(0, 0.15, -0.19), "#5b616b"], // tail
      [new THREE.CylinderGeometry(0.008, 0.008, 0.1, 4).translate(0.03, 0.05, 0.02), "#c9644d"], // legs
      [new THREE.CylinderGeometry(0.008, 0.008, 0.1, 4).translate(-0.03, 0.05, 0.02), "#c9644d"],
    ]);
    // the wings: a shallow V (tips up); scaling its height up and down beats them, flattening it folds them
    const wingL = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0.08, 0.26, 0.12, 0, 0, 0, -0.1], 3));
    const wingR = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0.08, 0, 0, -0.1, -0.26, 0.12, 0], 3));
    const wings = colourMerge([[wingL, "#7c8592"], [wingR, "#7c8592"]]);
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
    this.bodies = new THREE.InstancedMesh(body, mat, n);
    this.wings = new THREE.InstancedMesh(wings, mat, n);
    this.bodies.castShadow = true;
    for (const m of [this.bodies, this.wings]) { m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); }
    this.group.add(this.bodies, this.wings);
    for (let i = 0; i < n; i++) {
      const [x, z] = this.spot();
      this.birds.push({ x, z, y: 0, h: Math.random() * Math.PI * 2, mode: "ground", t: 0, act: Math.random() * 2, peck: 0, tx: x, tz: z, flap: 0 });
    }
  }

  /** A place on the square: a ring around the fountain. */
  private spot(): [number, number] {
    const a = Math.random() * Math.PI * 2, r = this.r0 + Math.random() * (this.r1 - this.r0);
    return [this.cx + Math.cos(a) * r, this.cz + Math.sin(a) * r];
  }

  update(dt: number, player: THREE.Vector3, playerSpeed: number) {
    let scared = 0;
    for (const b of this.birds) {
      const d = Math.hypot(player.x - b.x, player.z - b.z);
      if (b.mode === "ground") {
        // running at them within 3.5 m, or walking right up to them
        if ((d < 3.5 && playerSpeed > 5) || d < 1.3) {
          b.mode = "fly"; b.t = 0;
          const away = Math.atan2(b.x - player.x, b.z - player.z) + (Math.random() - 0.5) * 0.9;
          b.tx = b.x + Math.sin(away) * 9; b.tz = b.z + Math.cos(away) * 9;
          scared++;
          continue;
        }
        b.act -= dt;
        if (b.act <= 0) {
          // peck, hop forward, or turn
          const k = Math.random();
          if (k < 0.45) b.peck = 0.35;
          else if (k < 0.75) { b.x += Math.sin(b.h) * 0.25; b.z += Math.cos(b.h) * 0.25; b.y = 0.06; }
          else b.h += (Math.random() - 0.5) * 2.2;
          b.act = 0.5 + Math.random() * 1.6;
        }
        b.peck = Math.max(0, b.peck - dt);
        b.y = Math.max(0, b.y - dt * 0.6);
      } else {
        // up, away, round in an arc, then down on a new spot of the square
        b.t += dt;
        b.flap += dt * 22;
        if (b.t < 2.2) {
          b.y = Math.min(4.5, b.y + dt * 3.2);
          b.x += (b.tx - b.x) * Math.min(1, dt * 0.9);
          b.z += (b.tz - b.z) * Math.min(1, dt * 0.9);
          b.h = Math.atan2(b.tx - b.x, b.tz - b.z);
        } else {
          if (b.t < 2.2 + dt * 1.5) { const [x, z] = this.spot(); b.tx = x; b.tz = z; }
          const dx = b.tx - b.x, dz = b.tz - b.z, dist = Math.hypot(dx, dz);
          b.h = Math.atan2(dx, dz);
          const sp = Math.min(dist, dt * 5);
          if (dist > 0.01) { b.x += (dx / dist) * sp; b.z += (dz / dist) * sp; }
          b.y = Math.max(0, Math.min(b.y, dist * 0.6));
          if (dist < 0.05 && b.y <= 0.001) { b.mode = "ground"; b.act = 1 + Math.random() * 2; }
        }
      }
    }
    if (scared && this.onTakeOff) this.onTakeOff(scared);
    this.birds.forEach((b, i) => {
      const pitch = b.mode === "ground" ? (b.peck > 0 ? Math.sin((b.peck / 0.35) * Math.PI) * 0.7 : 0) : -0.15;
      this.e.set(pitch, b.h, 0, "YXZ");
      this.q.setFromEuler(this.e);
      this.m4.compose(this.p.set(b.x, b.y, b.z), this.q, this.one);
      this.bodies.setMatrixAt(i, this.m4);
      // wings: folded along the back on the ground, beating in the air
      const fly = b.mode === "fly";
      this.m4.compose(this.p.set(b.x, b.y + (fly ? 0.18 : 0.19), b.z), this.q, this.p2.set(fly ? 1 : 0.35, fly ? 1.4 * Math.sin(b.flap) : 0.3, fly ? 1 : 0.9));
      this.wings.setMatrixAt(i, this.m4);
    });
    this.bodies.instanceMatrix.needsUpdate = true;
    this.wings.instanceMatrix.needsUpdate = true;
  }
  private p2 = new THREE.Vector3();
}
