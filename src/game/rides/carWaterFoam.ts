import { BufferAttribute, BufferGeometry, DoubleSide, DynamicDrawUsage, Mesh, MeshBasicMaterial, type Group } from "three";
import type { Ride } from "./Rides";
import { type CarWaterProbe, type CarWaterSample, sampleCarWater } from "./carWater";

const foamSample = () => ({ x: 0, z: 0, floor: 0, stillSurface: null, liveSurface: null, depth: 0, liveDepth: 0 });

/** Short surface marks read the swell at each vertex. Both tire ribbons and the bow curl share a draw. */
export class CarWaterFoam {
  private readonly positions = new Float32Array(10 * 18);
  private readonly position = new BufferAttribute(this.positions, 3).setUsage(DynamicDrawUsage);
  private readonly geometry = new BufferGeometry().setAttribute("position", this.position);
  private readonly material = new MeshBasicMaterial({
    color: 0xeaf7f3, transparent: true, opacity: 0.63, depthWrite: false, side: DoubleSide, forceSinglePass: true,
  });
  private readonly mesh = new Mesh(this.geometry, this.material);
  private readonly sample: CarWaterSample = foamSample();
  private next = 0;
  private time = 0;

  constructor(parent: Group) {
    this.mesh.name = "car-water-foam";
    this.mesh.visible = false;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
    parent.add(this.mesh);
  }

  private vertex(x: number, z: number, at: number) {
    sampleCarWater(x, z, this.time, this.sample);
    const { liveDepth, liveSurface } = this.sample;
    if (liveDepth <= 0 || liveSurface === null) return false;
    this.positions[at] = x; this.positions[at + 1] = liveSurface + 0.035; this.positions[at + 2] = z;
    return true;
  }

  private strip(x: number, z: number, toX: number, toZ: number, startWidth: number, endWidth: number) {
    const dx = toX - x, dz = toZ - z, d = Math.hypot(dx, dz);
    if (d < 0.02) return;
    const sx = -dz / d, sz = dx / d, off = this.next;
    if (!this.vertex(x + sx * startWidth, z + sz * startWidth, off)
      || !this.vertex(x - sx * startWidth, z - sz * startWidth, off + 3)
      || !this.vertex(toX + sx * endWidth, toZ + sz * endWidth, off + 6)
      || !this.vertex(toX - sx * endWidth, toZ - sz * endWidth, off + 15)) return;
    for (let i = 0; i < 3; i++) {
      this.positions[off + 9 + i] = this.positions[off + 6 + i];
      this.positions[off + 12 + i] = this.positions[off + 3 + i];
    }
    this.next += 18;
  }

  show(r: Ride, p: CarWaterProbe, time: number) {
    const { m } = r, deep = p.band === "body-deep", dir = m.speed < 0 ? -1 : 1;
    this.time = time;
    this.next = 0;
    const front = dir < 0, fx = m.fx * dir, fz = m.fz * dir;
    const length = Math.min(deep ? 1.7 : 0.92, m.pace * (deep ? 0.82 : 0.27));
    for (let side = -1; side <= 1; side += 2) {
      const near = side > 0 ? front ? p.frontLeft : p.rearLeft : front ? p.frontRight : p.rearRight;
      const other = side > 0 ? front ? p.rearLeft : p.frontLeft : front ? p.rearRight : p.frontRight;
      const tire = near.liveDepth > 0 ? near : other;
      const spread = side * (deep ? 0.22 : 0.11);
      const dx = -fx * length + m.fz * spread, dz = -fz * length - m.fx * spread;
      for (let i = 0; i < 3; i++) {
        const a = i / 3, b = (i + 1) / 3, width = deep ? 0.16 : 0.09;
        this.strip(tire.x + dx * a, tire.z + dz * a, tire.x + dx * b, tire.z + dz * b, width * (1 - a * 0.9), width * (1 - b * 0.9));
      }
      if (deep) {
        const x = m.x + fx * (m.spec.half + 0.23), z = m.z + fz * (m.spec.half + 0.23);
        const across = side * (m.spec.wide + 0.18);
        const midX = x - fx * 0.21 + m.fz * across * 0.7, midZ = z - fz * 0.21 - m.fx * across * 0.7;
        this.strip(x, z, midX, midZ, 0.11, 0.15);
        this.strip(midX, midZ, x - fx * 0.92 + m.fz * across, z - fz * 0.92 - m.fx * across, 0.15, 0.025);
      }
    }
    this.mesh.visible = this.next > 0;
    this.geometry.setDrawRange(0, this.next / 3);
    if (this.mesh.visible) this.position.needsUpdate = true;
  }

  hide() { this.mesh.visible = false; }
  dispose() { this.mesh.removeFromParent(); this.geometry.dispose(); this.material.dispose(); }
}
