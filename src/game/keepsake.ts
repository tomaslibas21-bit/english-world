import * as THREE from "three";
import { KIND, type KeepsakeKind, type KeepsakePart } from "../content/keepsakes";

const HOLD_MS = 20_000;
const SHRINK_MS = 400;
const CENTIMETER = 0.01;

function geometry(part: KeepsakePart) {
  switch (part.type) {
    case "box": return new THREE.BoxGeometry(part.width, part.height, part.depth);
    case "cylinder": return new THREE.CylinderGeometry(part.top, part.bottom, part.height, 10);
    case "loop": return new THREE.TorusGeometry(part.radius, part.tube, 5, 10);
    case "sphere": return new THREE.SphereGeometry(part.radius, 16, 10).scale(part.width, part.height, part.depth);
    case "spiral": {
      const points = Array.from({ length: 36 }, (_, i) => {
        const t = i / 35;
        const angle = t * Math.PI * 3.6;
        const r = 0.2 + (part.radius - 0.2) * t;
        return new THREE.Vector3(r * Math.cos(angle), r * Math.sin(angle), 0.3 - 1.15 * t * t);
      });
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 40, 0.23, 6);
    }
  }
}

export class KeepsakeInHand {
  private current: { kind: KeepsakeKind; group: THREE.Group; shrinkAt: number } | null = null;
  private materials = new Map<number, THREE.MeshStandardMaterial>();

  get kind() { return this.current?.kind ?? null; }

  show(hand: THREE.Group, kind: KeepsakeKind) {
    this.clear();
    const group = new THREE.Group();
    group.name = "keepsake";
    group.scale.setScalar(CENTIMETER);
    for (const part of KIND[kind].shape) {
      let material = this.materials.get(part.color);
      if (!material) {
        material = new THREE.MeshStandardMaterial({ color: part.color, roughness: 0.82 });
        this.materials.set(part.color, material);
      }
      const mesh = new THREE.Mesh(geometry(part), material);
      mesh.position.set(part.x, part.y, part.z);
      mesh.rotation.z = part.tilt;
      group.add(mesh);
    }
    hand.add(group);
    this.current = { kind, group, shrinkAt: performance.now() + HOLD_MS };
  }

  tick() {
    if (!this.current) return;
    const elapsed = performance.now() - this.current.shrinkAt;
    if (elapsed >= SHRINK_MS) this.clear();
    else if (elapsed > 0) this.current.group.scale.setScalar(CENTIMETER * (1 - elapsed / SHRINK_MS));
  }

  clear() {
    if (!this.current) return;
    const { group } = this.current;
    group.removeFromParent();
    for (const child of group.children) (child as THREE.Mesh).geometry.dispose();
    this.current = null;
  }

  dispose() {
    this.clear();
    for (const material of this.materials.values()) material.dispose();
    this.materials.clear();
  }
}
