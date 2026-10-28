// A dog on a lead, walked by a passer-by (ambient.ts): it trots beside its owner, wags its tail, sniffs the ground
// now and then and sits when the owner stops. A body (with the head, ears and snout), four legs and a tail, each one
// vertex-coloured mesh, and the lead as one line from the owner's hand to the collar.
import * as THREE from "three";
import { colourMerge } from "./world/util";

let mat: THREE.MeshLambertMaterial | null = null;
const dogMat = () => (mat ??= new THREE.MeshLambertMaterial({ vertexColors: true }));

/** Coats: [main, patches/ears, nose]. */
const COATS: [string, string, string][] = [
  ["#c8873e", "#7a4b22", "#2b2120"], ["#2f2a28", "#5a4a40", "#151212"], ["#f2ede4", "#b07a4a", "#2b2120"], ["#e2b864", "#c08a3c", "#3a2a22"],
];

export class Dog {
  root = new THREE.Group();
  private legs: THREE.Mesh[] = [];
  private tail: THREE.Mesh;
  private head = new THREE.Group();
  private body = new THREE.Group();
  private phase = Math.random() * 10;
  private sniff = 0;
  private sniffT = 3 + Math.random() * 6;
  private sitting = 0;
  heading = 0;
  lead: THREE.Line;
  private leadPts = new Float32Array(6);

  /** `k` picks the coat; `s` is the size (1 ≈ a beagle). */
  constructor(k: number, s = 1) {
    const [main, patch, nose] = COATS[k % COATS.length];
    const box = (w: number, h: number, d: number, x: number, y: number, z: number) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
    // the body (its middle at the shoulder height's centre) and the head on the front
    const B = colourMerge([[box(0.26, 0.24, 0.6, 0, 0, 0), main], [box(0.24, 0.06, 0.2, 0, 0.12, -0.12), patch], [box(0.27, 0.06, 0.04, 0, 0.1, 0.27), "#c0392b"]]);
    const body = new THREE.Mesh(B, dogMat());
    this.body.add(body);
    this.body.position.y = 0.36 * s;
    const H = colourMerge([
      [box(0.22, 0.2, 0.22, 0, 0.06, 0.06), main], [box(0.13, 0.1, 0.14, 0, 0.0, 0.22), main], [box(0.06, 0.05, 0.04, 0, 0.03, 0.3), nose],
      [box(0.06, 0.12, 0.08, -0.1, 0.13, 0.02).rotateZ(0.35), patch], [box(0.06, 0.12, 0.08, 0.1, 0.13, 0.02).rotateZ(-0.35), patch],
      [box(0.035, 0.035, 0.02, -0.06, 0.1, 0.17), "#1a1414"], [box(0.035, 0.035, 0.02, 0.06, 0.1, 0.17), "#1a1414"],
    ]);
    this.head.add(new THREE.Mesh(H, dogMat()));
    this.head.position.set(0, 0.14, 0.32);
    this.body.add(this.head);
    for (const [x, z] of [[-0.09, 0.22], [0.09, 0.22], [-0.09, -0.22], [0.09, -0.22]]) {
      const leg = new THREE.Mesh(colourMerge([[box(0.07, 0.26, 0.07, 0, -0.13, 0), main], [box(0.08, 0.04, 0.1, 0, -0.26, 0.015), patch]]), dogMat());
      leg.position.set(x, -0.08, z);
      this.body.add(leg);
      this.legs.push(leg);
    }
    this.tail = new THREE.Mesh(colourMerge([[box(0.04, 0.04, 0.22, 0, 0, -0.11), main]]), dogMat());
    this.tail.position.set(0, 0.08, -0.3);
    this.tail.rotation.x = -0.7;
    this.body.add(this.tail);
    this.root.add(this.body);
    this.root.scale.setScalar(s);
    for (const m of [body, ...this.legs]) m.castShadow = false;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.leadPts, 3));
    this.lead = new THREE.Line(g, new THREE.LineBasicMaterial({ color: "#c0392b" }));
    this.lead.frustumCulled = false;
  }

  /** Follows its owner: `hand` is where the lead is held, `ox/oz` the owner's place and `oh` their heading,
   *  `moving` whether they walk. */
  update(dt: number, hand: THREE.Vector3, ox: number, oz: number, oh: number, moving: boolean) {
    // its place: half a metre out on the lead's side and a little ahead of the owner
    const tx = ox - Math.cos(oh) * 0.55 + Math.sin(oh) * 0.35, tz = oz + Math.sin(oh) * 0.55 + Math.cos(oh) * 0.35;
    const p = this.root.position, dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
    const speed = Math.min(d * 4, 3.2);
    if (d > 0.02) { p.x += (dx / d) * speed * dt; p.z += (dz / d) * speed * dt; }
    const trot = moving || d > 0.25;
    const want = trot && d > 0.05 ? Math.atan2(dx, dz) : oh;
    let dh = want - this.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    this.heading += dh * Math.min(1, dt * 6);
    this.root.rotation.y = this.heading;
    // trotting legs (diagonal pairs together), a wagging tail, now and then the nose to the ground; sitting when still
    this.phase += dt * (trot ? 13 : 2);
    this.sitting += ((trot ? 0 : 1) - this.sitting) * Math.min(1, dt * 3);
    const swing = trot ? Math.sin(this.phase) * 0.6 : 0;
    // diagonal pairs swing together; sitting, the back legs fold forward under the body
    this.legs.forEach((l, i) => { l.rotation.x = (i === 0 || i === 3 ? swing : -swing) * (1 - this.sitting) - (i >= 2 ? this.sitting * 1.2 : 0); });
    this.body.rotation.x = -this.sitting * 0.45;
    this.body.position.y = 0.36 - this.sitting * 0.1 + (trot ? Math.abs(Math.sin(this.phase)) * 0.02 : 0);
    this.tail.rotation.y = Math.sin(this.phase * (trot ? 1 : 4)) * 0.5;
    this.sniffT -= dt;
    if (this.sniffT < 0) { this.sniff = 1.6; this.sniffT = 5 + Math.random() * 8; }
    this.sniff = Math.max(0, this.sniff - dt);
    this.head.rotation.x = (this.sniff > 0 ? 0.6 : 0) + this.sitting * 0.35;
    // the lead: from the hand to the collar
    const collar = this.body.localToWorld(new THREE.Vector3(0, 0.1, 0.27));
    this.leadPts.set([hand.x, hand.y, hand.z, collar.x, collar.y, collar.z]);
    this.lead.geometry.attributes.position.needsUpdate = true;
  }
}
