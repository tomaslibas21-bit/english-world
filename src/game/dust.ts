// Little puffs of dust kicked up at the player's heels when running outdoors (and when stopping short). A small pool
// of soft sprites that grow, rise a little and fade in about half a second; drawn only with the „Graži“ quality.
import * as THREE from "three";

const LIFE = 0.55;

export class Dust {
  group = new THREE.Group();
  private puffs: { s: THREE.Sprite; m: THREE.SpriteMaterial; life: number; vx: number; vz: number }[] = [];

  constructor() {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d")!;
    const g = x.createRadialGradient(32, 32, 2, 32, 32, 31);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.55, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    for (let i = 0; i < 10; i++) {
      const m = new THREE.SpriteMaterial({ map: tex, color: "#c9b99c", transparent: true, depthWrite: false, opacity: 0 });
      const s = new THREE.Sprite(m);
      s.visible = false;
      this.group.add(s);
      this.puffs.push({ s, m, life: 0, vx: 0, vz: 0 });
    }
  }

  /** A puff behind a foot at (x, z), the player moving along (dx, dz). */
  puff(x: number, z: number, dx: number, dz: number, size = 1) {
    const p = this.puffs.find((q) => q.life <= 0);
    if (!p) return;
    p.life = LIFE;
    p.vx = -dx * 0.6 + (Math.random() - 0.5) * 0.5;
    p.vz = -dz * 0.6 + (Math.random() - 0.5) * 0.5;
    p.s.position.set(x - dx * 0.25 + (Math.random() - 0.5) * 0.25, 0.12, z - dz * 0.25 + (Math.random() - 0.5) * 0.25);
    p.s.scale.setScalar(0.25 * size);
    p.s.userData.size = size;
    p.s.visible = true;
  }

  update(dt: number) {
    for (const p of this.puffs) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.s.visible = false; continue; }
      const t = 1 - p.life / LIFE;
      p.s.position.x += p.vx * dt;
      p.s.position.z += p.vz * dt;
      p.s.position.y += dt * 0.35;
      p.s.scale.setScalar((0.25 + t * 0.75) * p.s.userData.size);
      p.m.opacity = 0.55 * (1 - t) * Math.min(1, t * 6);
    }
  }
}
