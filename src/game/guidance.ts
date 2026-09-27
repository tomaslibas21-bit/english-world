// Guidance: a glowing footpath to the current objective and a beacon over the destination.
import * as THREE from "three";

export class Guidance {
  group = new THREE.Group();
  private dots: THREE.InstancedMesh;
  private beacon: THREE.Group;
  private beam: THREE.Mesh;
  private gem: THREE.Mesh;
  private pts: [number, number][] = [];
  private t = 0;
  visible = true;

  constructor() {
    const dotGeo = new THREE.CircleGeometry(0.22, 12).rotateX(-Math.PI / 2);
    const dotMat = new THREE.MeshBasicMaterial({ color: "#ffd166", transparent: true, opacity: 0.9, depthWrite: false });
    this.dots = new THREE.InstancedMesh(dotGeo, dotMat, 260);
    this.dots.count = 0;
    this.dots.frustumCulled = false;
    this.group.add(this.dots);
    this.beacon = new THREE.Group();
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.9, 14, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: "#ffd166", transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    this.beam.position.y = 7;
    this.gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), new THREE.MeshBasicMaterial({ color: "#ffb703" }));
    this.gem.position.y = 3.4;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.05, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#ffd166", transparent: true, opacity: 0.8, depthWrite: false }));
    ring.position.y = 0.04;
    this.beacon.add(this.beam, this.gem, ring);
    this.beacon.visible = false;
    this.group.add(this.beacon);
  }

  setPath(pts: [number, number][] | null) { this.pts = pts ?? []; }
  setBeacon(x: number | null, z?: number, height = 3.4) {
    if (x === null || z === undefined) { this.beacon.visible = false; return; }
    this.beacon.visible = true;
    this.beacon.position.set(x, 0, z);
    this.gem.position.y = height;
  }

  update(dt: number) {
    this.t += dt;
    this.gem.rotation.y += dt * 1.5;
    this.gem.position.y += Math.sin(this.t * 2.2) * 0.004;
    (this.beam.material as THREE.MeshBasicMaterial).opacity = 0.16 + Math.sin(this.t * 2) * 0.05;
    if (!this.visible || this.pts.length < 2) { this.dots.count = 0; return; }
    // place dots every 1.3 m along the path, animated forward
    const m = new THREE.Matrix4();
    const spacing = 1.3;
    let n = 0;
    let carry = (this.t * 1.6) % spacing;
    for (let i = 0; i < this.pts.length - 1 && n < 260; i++) {
      const [ax, az] = this.pts[i], [bx, bz] = this.pts[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      let d = carry;
      while (d < len && n < 260) {
        const tt = d / len;
        const x = ax + (bx - ax) * tt, z = az + (bz - az) * tt;
        const distFromStart = n * spacing;
        if (distFromStart > 1.2) {
          const s = 0.8 + 0.25 * Math.sin(this.t * 4 - n * 0.5);
          m.makeScale(s, 1, s).setPosition(x, 0.06, z);
          this.dots.setMatrixAt(n, m);
        } else {
          m.makeScale(0.001, 1, 0.001).setPosition(x, -1, z);
          this.dots.setMatrixAt(n, m);
        }
        n++;
        d += spacing;
      }
      carry = d - len;
    }
    this.dots.count = n;
    this.dots.instanceMatrix.needsUpdate = true;
  }
}
